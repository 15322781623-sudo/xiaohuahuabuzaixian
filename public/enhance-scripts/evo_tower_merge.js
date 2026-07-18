// ==UserScript==
// @name         怪异塔（进化塔 EvoTower）一键合成解锁
// @description  解锁并触发游戏自带的「一键合成」。复用原生 MERGE_BOARD 模块 + MPData.sendAutoMergeItems。
//               接口出处（game1.js）：
//                 · 模块：Configs.ModuleType.MERGE_BOARD（ModuleManager.GET_MODULE）
//                 · 数据：mod.getActData(Configs.ActMergeFestivalType.EvoTower) → MPData 实例
//                 · 解锁判断（仅客户端）：MPData.checkSatisfyUnlockAutoMerge()（按钮 onClick 内，game1.js:74079）
//                 · 合成请求：MPData.sendAutoMergeItems() → MergeBoxService.autoMergeItem({actType})（game1.js:164599）
//                 · 是否有可合成物：MPData.checkExistMergeItems()（game1.js:164160）
//               说明：解锁判断在客户端按钮处；本脚本直接调用 sendAutoMergeItems 绕过该判断。
//               若服务器对“一键合成”另有校验，直接调用可能返回失败（控制台会打印 code!=0），此为服务端限制，非脚本问题。
// ==/UserScript==
(function () {
    'use strict';
    var TAG = '[怪异塔一键合成]';
    var VERSION = '1.6.2';

    // 取游戏窗口（兼容 iframe 注入），与盐场脚本同源逻辑
    function getGameWindow() {
        if (typeof window.__require === 'function') return window;
        try {
            var frames = document.querySelectorAll('iframe');
            for (var i = 0; i < frames.length; i++) {
                var cw = frames[i].contentWindow;
                if (cw && typeof cw.__require === 'function') return cw;
            }
        } catch (e) {}
        return null;
    }
    function rq(name) {
        var gw = getGameWindow();
        if (!gw) return null;
        try { return gw.__require(name); } catch (e) { return null; }
    }
    // 安全读取 fairygui GRoot 实例（只读私有 _inst，避免触发 "Call GRoot.create first!" 报错）。盐场锁头同款。
    function getGRootSafe() {
        try { var fgui = (getGameWindow() || window).fgui; if (fgui && fgui.GRoot && fgui.GRoot._inst) return fgui.GRoot._inst; } catch (e) {}
        try { var fg2 = window.fgui; if (fg2 && fg2.GRoot && fg2.GRoot._inst) return fg2.GRoot._inst; } catch (e2) {}
        return null;
    }
    // UI 是否就绪：GRoot 已创建才允许触碰 UI（GET_PROXY/点亮按钮/弹窗抑制），否则加载期会报 GRoot.create first
    function isUiReady() { return !!getGRootSafe(); }
    function getMergeMod() {
        var C = rq('Configs');
        var MM = rq('ModuleManager');
        if (!C || !MM || !C.ModuleType || typeof MM.GET_MODULE !== 'function') return null;
        try { return MM.GET_MODULE(C.ModuleType.MERGE_BOARD); } catch (e) { return null; }
    }
    // 取 EvoTower 活动类型枚举值（Configs 优先，data-index 兜底）
    function getEvoTowerType() {
        try { var C = rq('Configs'); if (C && C.ActMergeFestivalType && C.ActMergeFestivalType.EvoTower != null) return C.ActMergeFestivalType.EvoTower; } catch (e) {}
        try { var di = rq('data-index'); if (di && di.ActMergeFestivalType && di.ActMergeFestivalType.EvoTower != null) return di.ActMergeFestivalType.EvoTower; } catch (e1) {}
        return null;
    }
    // 取怪异塔合成数据源（MPData 实例）：优先 getActData(EvoTower)，兜底扫 _actDataMap 找带 sendAutoMergeItems 的
    function getData() {
        var mod = getMergeMod();
        if (!mod) { console.warn(TAG, '未找到 MERGE_BOARD 模块（需在游戏内运行）'); return null; }
        var t = getEvoTowerType();
        if (t != null && typeof mod.getActData === 'function') {
            try { var d = mod.getActData(t); if (d && typeof d.sendAutoMergeItems === 'function') return d; } catch (e) {}
        }
        try {
            var m = mod._actDataMap;
            if (m && typeof m.forEach === 'function') {
                var found = null;
                m.forEach(function (v) { if (!found && v && typeof v.sendAutoMergeItems === 'function') found = v; });
                if (found) return found;
            }
        } catch (e2) {}
        console.warn(TAG, '未找到怪异塔合成数据，请先进入「怪异塔/进化塔」合成界面再运行');
        return null;
    }
    // 棋格发射状态枚举（出处 game1.js:164109，MPData.MPTileEmission；CAN_LAUNCH=开箱, CAN_USE_ITEM=用物）
    function emissionEnum() {
        try { var M = rq('MPData'); if (M && M.MPTileEmission && M.MPTileEmission.CAN_LAUNCH != null) return M.MPTileEmission; } catch (e) {}
        return { NONE: 0, CAN_LAUNCH: 1, CAN_UNLOCK: 2, CAN_USE_ITEM: 3, WAIT_LAUNCH_LOSE_REQ: 4, WAIT_UNLOCK_LOSE_REQ: 5, WAIT_UNLOCK_LOSE_DEP: 6 };
    }
    // 扫描棋盘，返回第一个处于指定发射状态的格子坐标 {gridX,gridY}；无则 null
    function findEmissionPos(d, state) {
        try {
            var tiles = d.tiles || [];
            for (var i = 0; i < tiles.length; i++) {
                var pos = d.arrayIndexToPosition(i);
                if (!d.isPositionInside(pos) || d.isPositionEmpty(pos)) continue;
                if (d.getEmissionState(pos) === state) return pos;
            }
        } catch (e) {}
        return null;
    }
    // 找一对“真正可合并”的同类物品：用游戏原生 d.canMergeItems(源,目标) 校验（要求同 gridItemId + 双方 canMove/canMerge + 非满级 nextLevelMergeItemId!==0）。
    // 返回 {source,target} 坐标；无则 null。比单纯 canMerge 更准，避免选到满级/不可动的对导致合并不生效。
    function findMergePair(d) {
        try {
            var tiles = d.tiles || [], byId = {};
            for (var i = 0; i < tiles.length; i++) {
                var o = tiles[i];
                if (!o || !o.canMerge || o.gridItemId == null) continue;
                (byId[o.gridItemId] = byId[o.gridItemId] || []).push(i);
            }
            var hasCheck = (typeof d.canMergeItems === 'function');
            for (var id in byId) {
                if (!Object.prototype.hasOwnProperty.call(byId, id)) continue;
                var arr = byId[id];
                for (var a = 0; a < arr.length; a++) {
                    for (var b = a + 1; b < arr.length; b++) {
                        var src = d.arrayIndexToPosition(arr[b]), tgt = d.arrayIndexToPosition(arr[a]);
                        if (!hasCheck || d.canMergeItems(src, tgt)) return { source: src, target: tgt };
                    }
                }
            }
        } catch (e) {}
        return null;
    }
    // 合并一对：走非门禁的原生 sendMergeItems（等同手动拖拽合并，不受“一键合成”服务端解锁限制）。返回是否合并
    function mergeOnePair(d) {
        var p = findMergePair(d);
        if (!p) return false;
        try { d.sendMergeItems(p.source, p.target); return true; }
        catch (e) { console.warn(TAG, '合并异常', e && e.message); return false; }
    }
    // 在 MPData 原型上放开「一键合成」解锁判断（仅用于点亮原生按钮外观；真正合并走 sendMergeItems）
    function patchUnlockProto() {
        try {
            var M = rq('MPData');
            var cls = M && M.MPData;
            if (cls && cls.prototype && typeof cls.prototype.checkSatisfyUnlockAutoMerge === 'function') {
                if (!cls.prototype.__salt_unlocked) {
                    cls.prototype.checkSatisfyUnlockAutoMerge = function () { return true; };
                    cls.prototype.__salt_unlocked = true;
                }
                return true;
            }
        } catch (e) {}
        return false;
    }
    // 取已打开的「怪异塔合成」对话框代理（含 ui.m_btnAutoMerge / _refreshAutoMerge）。GRoot 未就绪不碰，避免报错。
    function getMergeDialog() {
        if (!isUiReady()) return null;
        var iu = rq('index-ui');
        var mod = rq('EvoTowerMergePlayDialog');
        if (!iu || typeof iu.GET_PROXY !== 'function' || !mod || !mod.EvoTowerMergePlayDialog) return null;
        try { return iu.GET_PROXY(mod.EvoTowerMergePlayDialog) || null; } catch (e) { return null; }
    }
    // 点亮原生「一键合成」按钮并接管点击：原生点击是服务端门禁(12300080)，改为触发客户端逐对合并(自动抽合开/关切换)。
    function lightAutoMergeBtn() {
        if (!isUiReady()) return false;
        var dlg = getMergeDialog();
        if (!dlg) return false;
        try { if (typeof dlg._refreshAutoMerge === 'function') dlg._refreshAutoMerge(); } catch (e) {}
        try {
            var btn = dlg.ui && dlg.ui.m_btnAutoMerge;
            if (btn) {
                try { btn.grayed = false; } catch (e1) {}
                try { btn.touchable = true; } catch (e2) {}
                try { if (btn.m_isEnabled) btn.m_isEnabled.selectedPage = 'true'; } catch (e3) {}
                if (!btn.__salt_hooked) {
                    try { if (typeof btn.clearClick === 'function') btn.clearClick(); } catch (e4) {}
                    try {
                        if (typeof btn.onClick === 'function') {
                            btn.onClick(function () { api.自动抽合(!api._running); });  // 点击=开始/停止 自动抽合
                            btn.__salt_hooked = true;
                        }
                    } catch (e5) {}
                }
            }
        } catch (e) {}
        return true;
    }

    // ===== 自动领奖（移植 qvq_quick_merge：累积消耗进度奖励 + 合成进度任务奖励） =====
    function mapGet(map, key) {
        if (!map) return undefined;
        if (typeof map.get === 'function') {
            var v = map.get(key); if (v !== undefined) return v;
            return (typeof key === 'number') ? map.get(String(key)) : map.get(Number(key));
        }
        var v2 = map[key]; return (v2 !== undefined) ? v2 : map[String(key)];
    }
    // 收集可领的合成进度任务 taskId：与原生 canClaimProgressReward 同源——遍历 ActMergeProgressConf.list，taskMap>0 且 taskClaimMap<=0。
    function claimableMergeTasks(d) {
        var out = [];
        try {
            var C = rq('Configs'); var list = C && C.ActMergeProgressConf && C.ActMergeProgressConf.list;
            if (!list || !d.taskMap) return out;
            list.forEach(function (e) {
                var prog = Number(mapGet(d.taskMap, e.id)) || 0;
                var claimed = Number(mapGet(d.taskClaimMap, e.id)) || 0;
                if (prog > 0 && claimed <= 0) out.push(e.id);
            });
        } catch (ex) {}
        return out;
    }
    // 领取一项可领奖励：全部走游戏原生 canClaim* 判定 + 原生 sendClaim*。顺序：累积消耗(左) → 合成进度任务(右) → 免费钥匙(顶部)。返回 Promise<是否领了>
    function claimOneReward(d) {
        if (!d) return Promise.resolve(false);
        // ① 累积消耗进度奖励（左侧）：原生 canClaimConsumeReward + sendClaimCostProgressReward
        try {
            if (typeof d.canClaimConsumeReward === 'function' && d.canClaimConsumeReward() && typeof d.sendClaimCostProgressReward === 'function') {
                console.log(TAG, '领取累积消耗奖励');
                return Promise.resolve(d.sendClaimCostProgressReward()).then(function (ok) { return !!ok; }, function () { return false; });
            }
        } catch (e) {}
        // ② 合成进度任务奖励（右侧“合成出等级”）：原生 canClaimProgressReward + sendClaimMergeProgressReward(taskId)
        try {
            if (typeof d.sendClaimMergeProgressReward === 'function') {
                var canP = (typeof d.canClaimProgressReward !== 'function') || d.canClaimProgressReward();
                if (canP) {
                    var tasks = claimableMergeTasks(d);
                    if (tasks.length) {
                        console.log(TAG, '领取合成进度奖励 task=' + tasks[0]);
                        return Promise.resolve(d.sendClaimMergeProgressReward(tasks[0])).then(function (ok) { return !!ok; }, function () { return false; });
                    }
                }
            }
        } catch (e2) {}
        // ③ 免费钥匙/能量（顶部）：原生 canClaimFreeRewards(freeEnergy>0) + 模块 sendClaimFreeEnergy(EvoTower)
        try {
            if (typeof d.canClaimFreeRewards === 'function' && d.canClaimFreeRewards()) {
                var mod = getMergeMod(); var t = getEvoTowerType();
                if (mod && typeof mod.sendClaimFreeEnergy === 'function' && t != null) {
                    console.log(TAG, '领取免费钥匙/能量');
                    return Promise.resolve(mod.sendClaimFreeEnergy(t)).then(function (ok) { return !!ok; }, function () { return false; });
                }
            }
        } catch (e3) {}
        return Promise.resolve(false);
    }

    // 抑制开关：自动操作期间(及结束后 5s 拖尾)抑制奖励弹窗。覆盖 自动抽合/自动合成/领奖 及其收尾弹窗。
    function setSuppress(on) {
        try { clearTimeout(api._suppressTimer); } catch (e) {}
        if (on) { api._suppress = true; return; }
        api._suppressTimer = setTimeout(function () { api._suppress = false; }, 5000);
    }
    function isRewardDlgType(t) {
        var n = t && (t.name || t.__classname__ || t._name || (t.constructor && t.constructor.name) || '');
        n = String(n);
        return n.indexOf('ItemRewardsDialog') !== -1 || n.indexOf('RewardsDialog') !== -1 || n.indexOf('RewardDialog') !== -1;
    }
    function argsHaveRewards(args) {
        for (var i = 0; i < args.length; i++) { var v = args[i]; if (v && typeof v === 'object' && (Array.isArray(v.rewards) || Array.isArray(v.reward))) return true; }
        return false;
    }
    // ===== 奖励弹窗抑制（移植 qvq_quick_merge）：抑制期内拦下奖励弹窗(按 rewards 载荷/类名)，避免开箱/领奖弹窗堆积阻塞 =====
    // 仅在 GRoot 就绪后、且只 hook index-ui 模块（不碰 window/UIManager，避免加载期破坏游戏流程）。
    function installRewardSuppress() {
        if (!isUiReady()) return;                 // 未就绪不 hook，防止加载期报错
        function wrap(owner, m) {
            if (!owner || typeof owner[m] !== 'function' || owner[m].__guaiyita) return;
            var orig = owner[m];
            owner[m] = function () {
                if (api._suppress && (argsHaveRewards(arguments) || isRewardDlgType(arguments[0]))) {
                    return (m === 'SHOW_DIALOG_DEFERRED') ? Promise.resolve(null) : null;
                }
                return orig.apply(this, arguments);
            };
            owner[m].__guaiyita = true;
        }
        try { var mod = rq('index-ui'); if (mod) ['SHOW_DIALOG_DEFERRED', 'SHOW_PROXY', 'SHOW_PROXY_OVER', 'PUSH_DIALOG_QUEUE'].forEach(function (m) { wrap(mod, m); }); } catch (e) {}
    }
    // 兜底：抑制期内主动关闭已弹出的奖励弹窗（hook 漏掉/其它路径弹出的）
    function closeOpenRewardDialogs() {
        if (!api._suppress || !isUiReady()) return;
        var iu = rq('index-ui'); if (!iu || typeof iu.GET_PROXY !== 'function') return;
        try {
            var mod = rq('ItemRewardsDialog'); var cls = mod && mod.ItemRewardsDialog;
            if (cls) {
                var p = iu.GET_PROXY(cls);
                if (p && p.isShow !== false && p.visible !== false && typeof p.close === 'function') p.close();
            }
        } catch (e) {}
    }
    // 在 ItemRewardsDialog 类上挂 onShow/onFixShow 钩子：抑制期内一弹出立即自关（移植 qvq）。这是“直接不弹/秒关”的最稳做法。
    function hookRewardDialogClass() {
        try {
            var mod = rq('ItemRewardsDialog'); var cls = mod && mod.ItemRewardsDialog;
            if (!cls || !cls.prototype || cls.prototype.__guaiyita_hooked) return;
            ['onShow', 'onFixShow', 'onShown'].forEach(function (mn) {
                var orig = cls.prototype[mn];
                if (typeof orig !== 'function') return;
                cls.prototype[mn] = function () {
                    var r = orig.apply(this, arguments);
                    if (api._suppress) {
                        var self = this;
                        var kill = function () { if (api._suppress) { try { if (typeof self.close === 'function') self.close(); else if (typeof self.hide === 'function') self.hide(); } catch (e) {} } };
                        kill(); setTimeout(kill, 30); setTimeout(kill, 120);
                    }
                    return r;
                };
            });
            cls.prototype.__guaiyita_hooked = true;
        } catch (e) {}
    }

    // 快速串行循环：每个动作在上一个服务器回包后立即接着做（gap 默认 0，尽快执行）。
    // draw=false 只合并；draw=true 合并优先，无可合再开箱（不使用奖励物，避免“是否使用奖励”确认弹窗）。
    function startLoop(opt) {
        var gap = (opt.gap != null) ? +opt.gap : 0; if (gap < 0) gap = 0;
        var cap = (opt.cap != null) ? +opt.cap : 4000;
        var label = opt.label || '循环';
        var runId = ++api._runId;
        api._running = true;
        setSuppress(true);                                            // 开始抑制奖励弹窗
        var count = 0;
        console.log(TAG, label + ' 已开启（回包即续，尽快执行；' + (opt.draw ? '合并+开箱(不使用奖励物)' : '仅合并') + '；停止 _怪异塔.' + label + '(false)）');
        function stop(msg) { api._running = false; setSuppress(false); if (msg) console.log(TAG, msg); }
        function next() { setSuppress(true); if (gap > 0) setTimeout(step, gap); else Promise.resolve().then(step); }
        function after(pr) { Promise.resolve(pr).then(next, next); }
        function step() {
            if (!api._running || runId !== api._runId) return;
            if (count >= cap) { stop(label + ' 已达上限 ' + cap + '，停止（共 ' + count + ' 步）'); return; }
            var d = getData();
            if (!d) { setTimeout(step, 400); return; }
            var p = findMergePair(d);                                   // ① 合并优先
            if (p) { count++; try { after(d.sendMergeItems(p.source, p.target)); } catch (e) { next(); } return; }
            if (opt.draw) {                                            // ② 无可合 → 开箱(耗钥匙)，不使用奖励物
                var lp = findEmissionPos(d, emissionEnum().CAN_LAUNCH);
                if (lp) { count++; try { after(d.sendLaunchItem(lp)); } catch (e) { next(); } return; }
            }
            if (opt.claim) {                                          // ③ 无可合/开箱 → 领取进度/任务奖励
                claimOneReward(d).then(function (ok) {
                    if (ok) { count++; next(); }
                    else { stop(label + ' 完成：无可合/开箱/领奖（共 ' + count + ' 步）'); }
                }, function () { stop(); });
                return;
            }
            stop(label + ' 完成：无可合' + (opt.draw ? '/可开箱' : '') + '（共 ' + count + ' 步）'); // ④ 都没有 → 结束
        }
        step();
    }

    var api = {
        版本: VERSION,
        _running: false,
        _runId: 0,
        _suppress: false,
        // 解锁：原生「一键合成」是服务端门禁(未达到解锁条件 12300080)，无法真正解锁；改为点亮+接管按钮，点击触发客户端逐对合并。
        解锁: function () {
            patchUnlockProto();
            var lit = lightAutoMergeBtn();
            console.log(TAG, '原生「一键合成」是服务端门禁(12300080)，客户端无法真正解锁；已' + (lit ? '点亮并接管按钮：点击=开始/停止 自动抽合（客户端逐对合并）' : '挂自动接管，进界面后生效') + '。也可 _怪异塔.自动抽合(true)。');
            return true;
        },
        // 合并一对同类（客户端 sendMergeItems，不受服务端门禁限制）。整盘请用 自动合成/自动抽合。
        合成: function () {
            var d = getData();
            if (!d) return false;
            if (!mergeOnePair(d)) { console.log(TAG, '当前没有可合并的同类物品'); return false; }
            console.log(TAG, '已合并一对（整盘合并用 _怪异塔.自动合成(true)）');
            return true;
        },
        // 自动循环合并：回包即续、尽快逐对 sendMergeItems，直到无可合并自动停止（不消耗钥匙、不用奖励）。
        自动合成: function (on, 间隔) {
            if (on === false) { api._running = false; setSuppress(false); console.log(TAG, '自动合成已停止'); return; }
            startLoop({ draw: false, gap: (间隔 != null ? +间隔 : 0), cap: 5000, label: '自动合成' });
        },
        // 全自动「抽+合+领」：合并优先 → 无可合再开箱(消耗钥匙) → 再领进度/任务奖励；不使用奖励物（避免确认弹窗）。回包即续、尽快执行。
        自动抽合: function (on, 间隔, 上限) {
            if (on === false) { api._running = false; setSuppress(false); console.log(TAG, '自动抽合已停止'); return; }
            startLoop({ draw: true, claim: true, gap: (间隔 != null ? +间隔 : 0), cap: (上限 != null ? +上限 : 1500), label: '自动抽合' });
        },
        // 自动领奖：循环领取累积消耗进度奖励 + 合成进度任务奖励，直到无可领（期间抑制奖励弹窗）。
        领奖: function () {
            var d = getData(); if (!d) { return; }
            var n = 0;
            setSuppress(true);
            (function loop() {
                claimOneReward(d).then(function (ok) {
                    if (ok && n < 200) { n++; setSuppress(true); setTimeout(loop, 60); }
                    else { setSuppress(false); console.log(TAG, '领奖完成，共领 ' + n + ' 项'); }
                }, function () { setSuppress(false); console.log(TAG, '领奖结束，共领 ' + n + ' 项'); });
            })();
        },
        // 诊断：打印是否解锁 / 是否有可合成物 / actType
        状态: function () {
            var d = getData();
            if (!d) return;
            var unlocked = '?', hasItems = '?', launchable = 0, usable = 0;
            try { if (typeof d.checkSatisfyUnlockAutoMerge === 'function') unlocked = d.checkSatisfyUnlockAutoMerge(); } catch (e) {}
            try { if (typeof d.checkExistMergeItems === 'function') hasItems = d.checkExistMergeItems(); } catch (e1) {}
            try {
                var E = emissionEnum(), tiles = d.tiles || [];
                for (var i = 0; i < tiles.length; i++) {
                    var pos = d.arrayIndexToPosition(i);
                    if (!d.isPositionInside(pos) || d.isPositionEmpty(pos)) continue;
                    var st = d.getEmissionState(pos);
                    if (st === E.CAN_LAUNCH) launchable++;
                    else if (st === E.CAN_USE_ITEM) usable++;
                }
            } catch (e2) {}
            console.log(TAG, '怪异塔合成 | 已解锁=' + unlocked + ' 有可合成物=' + hasItems + ' 可开箱=' + launchable + ' 可用物=' + usable + ' actType=' + d.actType);
            return { unlocked: unlocked, hasItems: hasItems, launchable: launchable, usable: usable, actType: d.actType };
        },
        帮助: function () {
            console.log([
                TAG + ' v' + VERSION + ' 用法：',
                '【说明】原生「一键合成」是服务端门禁(需达成8级怪物)，客户端无法真正解锁；',
                '本脚本改用客户端逐对合并(sendMergeItems)实现同等效果，并接管原生按钮点击。',
                '【已自动接管】进入界面后，点击原生「一键合成」= 开始/停止 自动抽合。',
                '_怪异塔.合成()                      — 合并一对同类（客户端，不受门禁）',
                '_怪异塔.自动合成(true[, 间隔ms])      — 整盘逐对合并(回包即续)；(false) 停止',
                '_怪异塔.自动抽合(true[, 间隔ms, 上限]) — 合并+开箱(耗钥匙)+自动领奖循环；(false) 停止',
                '_怪异塔.领奖()                      — 仅领取累积消耗/合成进度任务奖励',
                '_怪异塔.状态()                      — 打印可合成/可开箱/可用物',
                '提示：默认间隔0(回包即续,最快)；自动抽合会消耗钥匙、不动板上奖励物，但会领取顶部进度奖励。自动运行时抑制奖励弹窗。'
            ].join('\n'));
        }
    };

    try { var gw = getGameWindow(); if (gw) gw._怪异塔 = api; } catch (e) {}
    try { window._怪异塔 = api; } catch (e) {}

    // 延迟注入保护（盐场锁头同款思路）：先清理上次注入残留的守护轮询，避免重复注入叠加多个定时器。
    try { if (window.__guaiyita_guardTimer) clearInterval(window.__guaiyita_guardTimer); } catch (e) {}
    // 守护轮询：GRoot/模块就绪后才碰 UI（延迟注入，避免加载期 GRoot.create first 报错）。
    window.__guaiyita_guardTimer = setInterval(function () {
        try {
            patchUnlockProto();                  // 安全：不碰 UI，类就绪后放开解锁判断
            if (!isUiReady()) return;            // GRoot 未就绪：本轮不碰 UI
            installRewardSuppress();             // 安装奖励弹窗抑制（幂等，仅 index-ui）
            hookRewardDialogClass();             // 给奖励弹窗类挂自关钩子（幂等，秒关/不弹）
            lightAutoMergeBtn();                 // 面板开着就点亮并接管按钮
            if (api._suppress) closeOpenRewardDialogs(); // 抑制期主动关掉漏网的奖励弹窗
        } catch (e) {}
    }, 2000);
    api._autoTimer2 = window.__guaiyita_guardTimer;

    console.log(TAG, 'v' + VERSION + ' 已就绪：客户端逐对合并(回包即续)+开箱+自动领奖；接管原生按钮(点击=开始/停止 自动抽合)；含奖励弹窗抑制与延迟注入守护。也可 _怪异塔.自动抽合(true)/领奖()。帮助 _怪异塔.帮助()');
})();
