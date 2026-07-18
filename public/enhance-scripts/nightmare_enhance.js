// ==UserScript==
// @name         十殿增强
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  十殿倒计时+胜利自动解散队伍+自动领取周奖励+通关后自动罗盘领额外次数+自动抽奖+书籍里程奖励
// @author
// @match        *://*
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

// v3.5 改进点（v3.4 → v3.5）—— 按用户实测约束调整领取时机：
//   [P0] 用户明确："只有打完十殿才可以去罗盘那边领取次数"
//        → 移除 autoClickTurntable spin 期间的 maybeClaimGachaTimes / maybeClaimBookReward 调用
//        → 保留 broadcastTeamDismiss（通关结算）时的统一领取
//   [P0] maybeClaimGachaTimes 改为循环：bookScore 远超阈值时一次性把所有累计 N×NightmareEveryFiveGetOne
//        都领出来（最多 10 次 claim 避免服务端异常）
// v3.4 改进点（v3.3 → v3.4）—— 补"罗盘那边"另一个未自动领的奖励：bookReward
//   [P0] 新增 maybeClaimBookReward()：当 NIGHTMARE 模块 checkHasBookRed() 为 true 时调
//        `NightMareService.claimBook({})` 自动领取本周书籍里程碑奖励
//        （游戏逻辑见 game.js:184788 checkHasBookRed + 184840 send_ClaimNightmareBook）
//   [P0] 一次性循环领取：bookScore 可能跨多档，最多 8 次循环 claim 直到 checkHasBookRed=false
//   [P0] autoClickTurntable / broadcastTeamDismiss 均插入此调用
// v3.3 改进点（v3.2 → v3.3）—— 补"每抽 5 次可领一次额外抽奖"的领取动作：
//   [P0] 新增 maybeClaimGachaTimes()：当 `nightmareInfo.bookScore - turnRewardTime >= NightmareEveryFiveGetOne`
//        时调用 `NightMareService.claimTurnRewardTimes({})`，把待结算 bookScore 换成额外抽奖机会
//        （游戏逻辑见 game.js:184791 + 184705 + 183252 onClickClaimTimes）
//   [P0] autoClickTurntable 每次 spin 前先 maybeClaimGachaTimes，再以最新 turntableLeftCnt 继续抽
//   [P0] broadcastTeamDismiss 通关流程：claimWeekReward 之后立即 maybeClaimGachaTimes，
//        防止"通关 → 不抽奖 → 待领抽奖永远不领"
// v3.2 改进点（v3.1 → v3.2）—— 基于 game.js 真实代码定位 v3.0/v3.1 残留数据结构 bug：
//   [P0] fightData 真实结构是 { roleId, bossCfgId, battleData }（见 game.js:184548 + 180430）
//        isWin 实际在 fightData.battleData.result.isWin，原 fightData.result.isWin 永远 undefined → 永不命中通关条件
//        → 修正：先读 battleData.result.isWin，回退 fightData.result.isWin
//   [P0] roleId 兜底来源加 fightData.roleId 与 fightData.battleData.leftTeam.roleId（FightNotify 必有），
//        避免依赖 fight() 必先被调用
//   [P0] NightMareService.currentRoomId 在 game.js 中不存在，真实路径是 GET_MODULE(ModuleType.NIGHTMARE).roomData.roomId
//        → 优先读 module.roomData.roomId，回退 countdownState.currentRoomId（来自 fight 响应）
//   [P1] 首次 fightData dispatch 时打印结构以便真机日志校核
// v3.1 改进点（v3.0 → v3.1）—— 修复"有时候不生效"的三大根因：
//   [P0] 幂等守卫旗后置：__yunqiNightmareInstalled 改在 hookNightmareService 成功后才置位，
//        避免 waitForNightmareService 30s 超时后 flag 残留、下次再注入直接 return 导致永久失效。
//   [P0] waitForNightmareService 超时 30s → 120s + 三段退避（前 30s 50ms / 30-60s 200ms / 60-120s 500ms），
//        覆盖冷启动/慢网/CDN 慢加载场景。
//   [P0] 新增 self-healing watchdog：每 10s 检查 hook 是否仍在位，被游戏热重载替换了立即重新挂钩。
//   [P1] 关键节点加诊断日志：模块就绪/hook 成功/watchdog 触发，便于真机日志排查。
// v3.0 改进点（v2.8 → v3.0）：
//   [P0] waitForNightmareRoom → waitForNightmareService：一拿到模块就立即 hook setFighter，
//        不等 currentRoomId，根除"必须打一次倒计时才生效"的 race condition。
//   [P0] broadcastTeamDismiss 之前定义但从未调用，胜利通关后现在会真正触发解散+抽奖。
//   [P0] state.roleId 自动从 fight() 入参 / 返回值中提取，避免 getRoleInfo({roleId:null}) 必败。
//   [P0] fight / setFighter hook 都加 __patched 守卫，多次注入也不会嵌套包装。
//   [P1] LAST_STAGE_ID 常量替代 bossCfgId >= 8 魔数。
//   [P1] autoClickTurntable 增加 MAX_TURNTABLE_ITER 兜底，防止服务端异常导致无限递归。
//   [P1] 统一 LOG_PREFIX、错误处理风格。
(function () {
    'use strict';

    // ============ 顶层幂等保护（v3.1 仅当模块未就绪时跳过；已成功 hook 才置位） ============
    // 若已成功 hook（hookSuccess=true），跳过重复；
    // 若仅 entry 旗为 true 但 hookSuccess=false，则视为之前注入失败，本次重试。
    if (window.__yunqiNightmareInstalled && window.__yunqiNightmareHookSuccess) {
        console.log('[十殿增强] 已注入并 hook 成功，跳过重复初始化');
        return;
    }
    if (window.__yunqiNightmareInstalled && !window.__yunqiNightmareHookSuccess) {
        console.log('[十殿增强] 上次注入未完成 hook，本次重试');
    }
    window.__yunqiNightmareInstalled = true;
    // hookSuccess 在 hookNightmareService 末尾才置 true

    const unsafeWindow = window;

    // ============ 常量 ============
    const LOG_PREFIX = '[十殿增强]';
    const LAST_STAGE_ID = 8;          // 通关此关卡（含）以后视为通关全部，不再继续倒计时
    const COUNTDOWN_SECONDS = 15;     // 阎罗擦拭武器倒计时
    const BROADCAST_KEY = 'fqsd_nightmare_team_dismiss_broadcast';
    const BROADCAST_TYPE = 'FQSD_NIGHTMARE_TEAM_DISMISSED';
    const MAX_TURNTABLE_ITER = 30;    // 自动转盘最大递归次数（兜底，防止服务端异常导致无限循环）
    const EVERY_FIVE_DEFAULT = 5;     // v3.3：NightmareEveryFiveGetOne 兜底（取不到 Configs 时按 5）
    // v3.1 三段退避：前 30s 50ms × 600 + 30-60s 200ms × 150 + 60-120s 500ms × 120 = 120s 总超时
    const POLL_STAGES = [
        { intervalMs: 50,  endAttempt: 600 },   // 0-30s
        { intervalMs: 200, endAttempt: 750 },   // 30-60s
        { intervalMs: 500, endAttempt: 870 }    // 60-120s
    ];
    const MAX_INIT_ATTEMPTS = 870;             // 总超时 120s
    const WATCHDOG_INTERVAL_MS = 10000;        // self-healing watchdog 10s 周期

    // ============ 状态 ============
    const state = {
        roleId: null,                 // 自动从 fight() 入参或返回值提取
        rewards: []
    };
    const countdownState = {
        isMonitoring: false,
        currentBossCfgId: null,
        currentIsWin: false,
        countdownTimer: null,
        fightListener: null,
        hasSetFighterCalled: false,
        currentRoomId: null
    };
    const rewardMap = { '1020': '皮肤币', '1022': '白玉', '1023': '彩玉' };

    // ============ 工具函数 ============
    function logInfo(msg, ...rest) { console.log(LOG_PREFIX, msg, ...rest); }
    function logWarn(msg, ...rest) { console.warn(LOG_PREFIX, msg, ...rest); }
    function logError(msg, ...rest) { console.error(LOG_PREFIX, msg, ...rest); }

    function showTip(msg) {
        try {
            const TipsManager = unsafeWindow.__require('TipsManager');
            if (TipsManager?.SHOW_TIP) {
                TipsManager.SHOW_TIP(msg);
                return;
            }
        } catch (_) { /* 模块未就绪时降级到 console */ }
        logInfo(msg);
    }

    // ============ 倒计时 ============
    function clearCountdown() {
        if (countdownState.countdownTimer) {
            clearInterval(countdownState.countdownTimer);
            countdownState.countdownTimer = null;
        }
    }

    function startCountdown(seconds = COUNTDOWN_SECONDS) {
        clearCountdown();
        let remain = seconds;
        showTip(`阎罗正在擦拭武器 ${remain}s`);
        countdownState.countdownTimer = setInterval(() => {
            remain--;
            if (remain > 0) {
                showTip(`阎罗正在擦拭武器 ${remain}s`);
            } else {
                clearCountdown();
                showTip('可以开始下一关了！');
            }
        }, 1000);
    }

    // ============ 战斗事件监听 ============
    function removeCountdownListeners() {
        try {
            const GlobalSignal = unsafeWindow.__require('GlobalSignal')?.GlobalSignal;
            if (GlobalSignal && countdownState.fightListener) {
                GlobalSignal.EventNightmareBattleStart.off(countdownState.fightListener, countdownState);
                countdownState.fightListener = null;
            }
            clearCountdown();
            countdownState.isMonitoring = false;
            countdownState.currentBossCfgId = null;
            countdownState.currentIsWin = false;
            countdownState.hasSetFighterCalled = false;
            countdownState.currentRoomId = null;
        } catch (e) {
            logError('移除监听失败', e);
        }
    }

    function setupCountdownListeners(NightMareService) {
        try {
            const GlobalSignal = unsafeWindow.__require('GlobalSignal')?.GlobalSignal;
            if (!GlobalSignal || !NightMareService) {
                logWarn('GlobalSignal / NightMareService 不可用，跳过倒计时监听设置');
                return;
            }

            // 已经在监听则直接返回（幂等）
            if (countdownState.isMonitoring) return;

            countdownState.fightListener = async function (fightData) {
                try {
                    // v3.2：首次 dispatch 打印结构，便于真机校核字段路径
                    if (!countdownState.__loggedShape) {
                        countdownState.__loggedShape = true;
                        try {
                            logInfo('fightData 结构示例 keys=' + Object.keys(fightData || {}).join(',')
                                + ' battleData.keys=' + Object.keys((fightData && fightData.battleData) || {}).join(','));
                        } catch (_) {}
                    }

                    const bossCfgId = fightData?.bossCfgId;
                    // v3.2 修正：isWin 实际在 battleData.result.isWin（见 game.js:180616 i = u.battleData; l = i.result）
                    // 兜底支持 fightData.result.isWin（万一不同版本字段不同）
                    const isWin = fightData?.battleData?.result?.isWin === true
                        || fightData?.result?.isWin === true;
                    countdownState.currentBossCfgId = bossCfgId;
                    countdownState.currentIsWin = isWin;

                    // v3.2 兜底：从 FightNotify 提取 roleId（见 game.js:180430 r.roleId = i.leftTeam.roleId）
                    if (!state.roleId) {
                        state.roleId = fightData?.roleId
                            || fightData?.battleData?.leftTeam?.roleId
                            || null;
                    }
                    showTip(`当前关卡: ${bossCfgId}, 战斗结果: ${isWin ? '胜利' : '失败'}`);

                    // v3.2 修正 roomId 来源：真实路径是 GET_MODULE(NIGHTMARE).roomData.roomId
                    // （game.js:180236/180245/180257/180268 全部都是这条路径，NightMareService 上无 currentRoomId 字段）
                    let roomId = null;
                    try {
                        const DataIndex = unsafeWindow.__require('data-index');
                        const ModuleType = DataIndex?.ModuleType;
                        const moduleMgr = DataIndex?.GET_MODULE || unsafeWindow.GET_MODULE;
                        if (ModuleType && moduleMgr) {
                            const mod = moduleMgr(ModuleType.NIGHTMARE);
                            roomId = mod?.roomData?.roomId || null;
                        }
                    } catch (_) { /* 模块未就绪，回退缓存 */ }
                    roomId = roomId
                        || NightMareService.currentRoomId   // 兼容老版本（如果某天补上）
                        || countdownState.currentRoomId;
                    if (!roomId) {
                        logWarn('无 roomId，跳过 leaderComplete 调用');
                        return;
                    }

                    const complete = await NightMareService.leaderComplete({ roomId });
                    if (complete?.code !== 0) {
                        logWarn('leaderComplete 返回非 0:', complete);
                        return;
                    }

                    if (isWin && bossCfgId >= LAST_STAGE_ID) {
                        // 通关最后一殿：广播队伍解散 + 自动领取周奖励 + 自动抽奖
                        showTip(`通关第 ${bossCfgId} 殿，自动结算中…`);
                        await broadcastTeamDismiss();
                        removeCountdownListeners();
                    } else {
                        startCountdown();
                    }
                } catch (e) {
                    logError('战斗监听处理失败', e);
                }
            };

            GlobalSignal.EventNightmareBattleStart.on(countdownState.fightListener, countdownState);
            countdownState.isMonitoring = true;
            logInfo('倒计时监听已设置');
        } catch (e) {
            logError('设置倒计时监听失败', e);
        }
    }

    // ============ 队伍解散广播 + 自动领取奖励 + 自动抽奖 ============
    async function broadcastTeamDismiss() {
        try {
            // 跨窗口/标签页广播：localStorage storage 事件只在 *其他* 窗口触发
            const msg = {
                type: BROADCAST_TYPE,
                parentRoleId: state.roleId,
                timestamp: Date.now()
            };
            try {
                localStorage.removeItem(BROADCAST_KEY);
                localStorage.setItem(BROADCAST_KEY, JSON.stringify(msg));
            } catch (e) {
                logWarn('localStorage 广播失败', e);
            }

            // 1 秒后领取本周奖励 + 触发自动抽奖（等服务端解散完成）
            setTimeout(async () => {
                try {
                    const DataIndex = unsafeWindow.__require('data-index');
                    const NightMareService = DataIndex?.NightMareService;
                    if (!NightMareService) {
                        logWarn('NightMareService 未就绪，跳过自动领奖');
                        return;
                    }

                    await NightMareService.claimWeekReward({});

                    if (!state.roleId) {
                        logWarn('roleId 未知，无法查询 weekAward 信息');
                        return;
                    }
                    const info = await NightMareService.getRoleInfo({ roleId: state.roleId });
                    let left = info?._rawData?.weekAward?.turntableLeftCnt || 0;
                    // v3.3：通关后先把"每 5 次额外机会"领一遍（用通关后最新 nightMareInfo），
                    // 再以更新后的 turntableLeftCnt 开始 autoClickTurntable
                    const nightMareInfo = info?._rawData?.nightMare;
                    const claimRes = await maybeClaimGachaTimes(DataIndex, nightMareInfo);
                    if (claimRes && typeof claimRes.turntableLeftCnt === 'number') {
                        left = claimRes.turntableLeftCnt;
                    }
                    // v3.4：通关后顺手把书籍奖励 (bookReward) 也自动领
                    await maybeClaimBookReward(DataIndex);
                    if (left > 0) {
                        autoClickTurntable(DataIndex, left, 0);
                    }
                } catch (e) {
                    logError('自动抽奖失败', e);
                }
            }, 1000);
        } catch (e) {
            logError('广播失败', e);
        }
    }

    // v3.4：取 NIGHTMARE 模块单例，方便调用 checkHasBookRed / checkHasCanClaminGachaTimesRed
    function getNightmareModule() {
        try {
            const DataIndex = unsafeWindow.__require('data-index');
            const ModuleType = DataIndex?.ModuleType;
            const moduleMgr = DataIndex?.GET_MODULE || unsafeWindow.GET_MODULE;
            if (ModuleType && moduleMgr) return moduleMgr(ModuleType.NIGHTMARE);
        } catch (_) {}
        return null;
    }

    // v3.4 自动领取书籍奖励：bookScore 可能跨多档，循环领直到 checkHasBookRed=false 或达上限
    async function maybeClaimBookReward(DataIndex) {
        const NightMareService = DataIndex?.NightMareService;
        if (!NightMareService) return 0;
        const mod = getNightmareModule();
        if (!mod || typeof mod.checkHasBookRed !== 'function') return 0;
        let claimed = 0;
        for (let i = 0; i < 8; i++) {
            try {
                if (!mod.checkHasBookRed()) break;
                const resp = await NightMareService.claimBook({});
                if (resp?.code) {
                    logWarn(`claimBook 返回非 0: ${resp.code}`);
                    break;
                }
                claimed++;
            } catch (e) {
                logError('claimBook 失败', e);
                break;
            }
        }
        if (claimed > 0) showTip(`自动领取书籍奖励 ×${claimed}`);
        return claimed;
    }

    // v3.3 取 NightmareEveryFiveGetOne 配置（"每抽 N 次得 1 次额外抽奖"，默认 5）
    function getEveryFiveConfig() {
        try {
            const Configs = unsafeWindow.__require('Configs');
            const v = Configs?.ConstantConf?.config?.NightmareEveryFiveGetOne;
            if (typeof v === 'number' && v > 0) return v;
        } catch (_) {}
        return EVERY_FIVE_DEFAULT;
    }

    // v3.3 检测是否有待领"额外抽奖机会"，有则 claim，返回服务端新 weekAward.turntableLeftCnt 或 null
    // 触发条件：nightmareInfo.bookScore - nightmareInfo.turnRewardTime >= NightmareEveryFiveGetOne
    // （见 game.js:184791 checkHasCanClaminGachaTimesRed、184675 getOutRangeGachaedTimes）
    // v3.5 改为循环领取：服务端可能一次只发 1 份，需要多次 claim 才能把累计配额全消化
    async function maybeClaimGachaTimes(DataIndex, nightMareInfo) {
        const NightMareService = DataIndex?.NightMareService;
        if (!NightMareService || !nightMareInfo) return null;
        const threshold = getEveryFiveConfig();
        let lastNightMare = nightMareInfo;
        let lastWeekAward = null;
        let totalGranted = 0;
        for (let i = 0; i < 10; i++) {
            const bookScore = Number(lastNightMare.bookScore) || 0;
            const turnRewardTime = Number(lastNightMare.turnRewardTime) || 0;
            const pending = bookScore - turnRewardTime;
            if (pending < threshold) break;
            try {
                const resp = await NightMareService.claimTurnRewardTimes({});
                if (resp?.code) {
                    logWarn(`claimTurnRewardTimes 返回非 0: ${resp.code}`);
                    break;
                }
                lastWeekAward = resp?._rawData?.weekAward || resp?.rawData?.weekAward || lastWeekAward;
                lastNightMare = resp?._rawData?.nightMare || resp?.rawData?.nightMare || lastNightMare;
                totalGranted++;
                // 如果服务端没有改 turnRewardTime（避免死循环），跳出
                const newTurnRewardTime = Number(lastNightMare.turnRewardTime) || 0;
                if (newTurnRewardTime === turnRewardTime) {
                    logWarn('claimTurnRewardTimes 返回 turnRewardTime 未变，跳出避免死循环');
                    break;
                }
            } catch (e) {
                logError('claimTurnRewardTimes 失败', e);
                break;
            }
        }
        if (totalGranted > 0) {
            showTip(`领取额外抽奖机会 ×${totalGranted}（阈值=${threshold}）`);
            return {
                turntableLeftCnt: lastWeekAward?.turntableLeftCnt ?? null,
                weekAward: lastWeekAward,
                nightMare: lastNightMare
            };
        }
        return null;
    }

    // 自动转盘：递归调用直到次数耗尽（带最大递归保护）
    // v3.5：spin 期间不做 claim，让玩家通关后统一在罗盘领取额外次数和书籍奖励
    // （用户实测约束：只有打完十殿才能去罗盘那边领取次数）
    function autoClickTurntable(DataIndex, count, depth) {
        if (depth >= MAX_TURNTABLE_ITER) {
            logWarn(`自动转盘达到最大次数 ${MAX_TURNTABLE_ITER}，停止递归`);
            return;
        }
        const NightMareService = DataIndex?.NightMareService;
        if (!NightMareService) return;

        NightMareService.clickTurntable({}).then((result) => {
            try {
                const award = result?._rawData?.weekAward;
                if (!award) return;
                const left = award.turntableLeftCnt;
                if (award.turntableReward) {
                    const keys = Object.keys(award.turntableReward);
                    if (keys.length > 0) {
                        const rArr = award.turntableReward[keys[keys.length - 1]];
                        if (rArr?.length > 0) {
                            const r = rArr[0];
                            state.rewards.push({ itemId: String(r.itemId), value: r.value });
                            showTip(`获得奖励: ${rewardMap[r.itemId] || r.itemId}×${r.value}`);
                        }
                    }
                }
                if (left > 0) {
                    setTimeout(() => autoClickTurntable(DataIndex, left, depth + 1), 500);
                }
            } catch (e) {
                logError('解析转盘结果失败', e);
            }
        }).catch((e) => {
            logError('自动转盘请求失败', e);
        });
    }

    // ============ 等待 NightMareService 模块就绪（核心修复） ============
    // v2.8 等 NightMareService.currentRoomId 非空才 hook，紧接着游戏调 setFighter() 时
    // 50ms setInterval 来不及命中，必须等"打一次"才生效。
    // v3.0 改为只等模块就绪：cocos data-index 模块通过 __require 加载完，立即 hook。
    // v3.1 改为三段退避：前 30s 高频（50ms）、30-60s 中频（200ms）、60-120s 低频（500ms），
    //      覆盖冷启动 / 慢网 / CDN 慢加载，避免 30s 超时后下次 flag 残留永久失效。
    function tryGetNightmareService() {
        try {
            const NightMareService = unsafeWindow.__require('data-index')?.NightMareService;
            if (NightMareService
                && typeof NightMareService.fight === 'function'
                && typeof NightMareService.setFighter === 'function') {
                return NightMareService;
            }
        } catch (_) { /* 模块尚未注册 */ }
        return null;
    }

    function waitForNightmareService(callback) {
        let attempts = 0;
        let stageIdx = 0;
        let timer = null;

        function schedule() {
            const stage = POLL_STAGES[stageIdx];
            timer = setTimeout(function tick() {
                attempts++;
                const svc = tryGetNightmareService();
                if (svc) {
                    logInfo(`NightMareService 就绪（attempts=${attempts}，约 ${Math.round(attempts * stage.intervalMs / 1000)}s 内）`);
                    callback(svc);
                    return;
                }
                if (attempts >= stage.endAttempt && stageIdx < POLL_STAGES.length - 1) {
                    stageIdx++;
                    logInfo(`未就绪进入退避阶段 ${stageIdx + 1}/${POLL_STAGES.length}，下一次间隔 ${POLL_STAGES[stageIdx].intervalMs}ms`);
                }
                if (attempts >= MAX_INIT_ATTEMPTS) {
                    logWarn('NightMareService 模块加载超时（120s），脚本未生效；watchdog 仍会持续重试');
                    // 不静默失败：放给 watchdog 后续兜底
                    return;
                }
                schedule();
            }, stage.intervalMs);
        }

        schedule();
    }

    // ============ Self-healing Watchdog（v3.1）============
    // 游戏热重载 / 场景切换可能替换 NightMareService 实例，原 hook 被丢弃。
    // 每 WATCHDOG_INTERVAL_MS 检查一次：当前模块的 fight/setFighter 是否仍带 __yunqiPatched，
    // 若否则重新挂钩。也覆盖了"初次加载超时后期 NightMareService 才就绪"的兜底场景。
    function startHookWatchdog() {
        if (window.__yunqiNightmareWatchdog) return;
        window.__yunqiNightmareWatchdog = setInterval(() => {
            try {
                const svc = tryGetNightmareService();
                if (!svc) return;
                const fightOk = svc.fight && svc.fight.__yunqiPatched;
                const setFighterOk = svc.setFighter && svc.setFighter.__yunqiPatched;
                if (!fightOk || !setFighterOk) {
                    logWarn(`watchdog 检测到 hook 失效（fight=${!!fightOk} setFighter=${!!setFighterOk}），重新挂钩`);
                    hookNightmareService(svc);
                }
            } catch (e) {
                logError('watchdog 异常', e);
            }
        }, WATCHDOG_INTERVAL_MS);
    }

    // ============ Hook fight + setFighter ============
    function hookNightmareService(NightMareService) {
        // fight：拦截后保留原行为，记录 roomId 与 roleId
        if (!NightMareService.fight.__yunqiPatched) {
            const origFight = NightMareService.fight;
            NightMareService.fight = async function () {
                // 入参可能含 roleId（视游戏实现而定）
                const arg0 = arguments[0];
                if (arg0 && typeof arg0 === 'object' && arg0.roleId && !state.roleId) {
                    state.roleId = arg0.roleId;
                }
                const res = await origFight.apply(this, arguments);
                try {
                    if (res?._rawData?.roomId) countdownState.currentRoomId = res._rawData.roomId;
                    // 兜底：从返回值提取 roleId
                    if (res?._rawData?.roleId && !state.roleId) state.roleId = res._rawData.roleId;
                } catch (_) {}
                return res;
            };
            NightMareService.fight.__yunqiPatched = true;
        }

        // setFighter：第一次被调用时注册倒计时监听器
        if (!NightMareService.setFighter.__yunqiPatched) {
            const origSetFighter = NightMareService.setFighter;
            NightMareService.setFighter = function () {
                const res = origSetFighter.apply(this, arguments);
                if (!countdownState.hasSetFighterCalled) {
                    countdownState.hasSetFighterCalled = true;
                    setupCountdownListeners(NightMareService);
                }
                return res;
            };
            NightMareService.setFighter.__yunqiPatched = true;
        }

        // v3.1：成功 hook 完成后才置 hookSuccess，watchdog 启动兜底
        window.__yunqiNightmareHookSuccess = true;
        startHookWatchdog();
        logInfo('hook NightMareService.fight / setFighter 完成（v3.1，watchdog 已启）');
    }

    // ============ 跨窗口广播监听（多账号场景） ============
    // 注意：localStorage storage 事件仅在 *其他* 窗口/标签页 setItem 时触发，
    // 同一窗口内 setItem 不会触发自己的 storage 事件 —— 此监听仅服务多开/多账号场景。
    function setupWindowCommunication() {
        window.addEventListener('storage', (e) => {
            if (e.key !== BROADCAST_KEY) return;
            try {
                const msg = JSON.parse(e.newValue);
                if (msg?.type === BROADCAST_TYPE) {
                    showTip('队伍已解散，等待自动抽奖');
                }
            } catch (err) {
                logError('解析广播消息失败', err);
            }
        });
    }

    // ============ 初始化 ============
    function initScript() {
        setupWindowCommunication();
        waitForNightmareService((NightMareService) => {
            hookNightmareService(NightMareService);
        });
        // v3.1：即使 wait 超时也启动 watchdog，由它做后续兜底
        setTimeout(startHookWatchdog, 1000);
        logInfo('v3.1 已注入，等待游戏模块就绪…（120s 超时 + 10s watchdog 兜底）');
    }

    setTimeout(initScript, 50);
})();
