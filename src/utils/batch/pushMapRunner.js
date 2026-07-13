/**
 * 共享推图逻辑模块
 * 提供统一的推图循环、火把系统、自动重连等功能
 * 供 TokenCard（单卡推图）和 BatchDailyTasks（批量推图）共用
 * 
 * v2.0 重构：
 * - 修复战斗时间计算：移除倒计时的火把加速倍率（battleTime已是服务器最终值）
 * - 增强连接保活：safeSend辅助函数 + 15秒心跳保活
 * - 拆分主循环为子函数：executeOneBattle / countdownWait / parseFightResult
 * - 优化重连逻辑：指数退避 + 最大次数限制 + 自动重初始化
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 战斗时间安全范围
const BATTLE_TIME_MIN = 10;      // 最小10秒
const BATTLE_TIME_MAX = 1800;    // 最大30分钟
const BATTLE_TIME_DEFAULT = 300; // 默认5分钟

// 心跳间隔（秒）- 推图期间必须保持连接，缩短间隔确保不断连
const HEARTBEAT_INTERVAL = 10;


/**
 * 创建推图执行器
 * @param {object} deps - 依赖项
 * @param {object} deps.tokenStore - Token管理store
 * @param {function} deps.getTokens - 获取tokens数组的函数
 * @param {function} deps.addLog - 日志回调 (logEntry) => void
 * @param {function|object} [deps.shouldStop] - 停止标志（ref或getter），批量推图用
 * @param {object} [deps.tokenStatus] - 账号状态映射（批量推图用）
 */
export function createPushMapRunner(deps) {
  const { tokenStore, getTokens, addLog, shouldStop, tokenStatus } = deps;

  // 火把加速倍数映射（仅用于显示，不再影响倒计时计算）
  const torchSpeedMap = { 1008: 3, 1009: 5, 1010: 10 };

  // 判断是否应该停止
  const isShouldStop = () => {
    if (!shouldStop) return false;
    if (typeof shouldStop === 'function') return shouldStop();
    // ref
    return shouldStop.value === true;
  };

  // 日志回调
  const log = (msg, type) => {
    addLog({ time: new Date().toLocaleTimeString(), message: msg, type: type || "info" });
    if (typeof window._pushLog === "function") window._pushLog(msg, type || "info");
  };

  // 获取账号名称
  const getTokenName = (tid) => {
    const tokens = getTokens();
    const tk = tokens.find(x => x.id === tid);
    return tk ? tk.name || tid : tid;
  };

  // 获取Boss名称
  const getBoss = (lvl) => {
    if (!window._bossMap) return "";
    const b = window._bossMap[String(lvl)];
    return b ? b.chinese : "";
  };

  // 加载Boss数据
  const loadBossData = async () => {
    if (window._bossMap && Object.keys(window._bossMap).length > 0) return window._bossMap;
    try {
      const resp = await fetch("/boss_level_mapping_fixed.json");
      if (resp.ok) {
        window._bossMap = await resp.json();
        log(`[推图] Boss数据加载: ${Object.keys(window._bossMap).length}条`);
      }
    } catch (e) {
      log(`[推图] Boss数据加载失败`, "warning");
      if (!window._bossMap) window._bossMap = {};
    }
    return window._bossMap;
  };

  // ========== 连接管理 ==========

  /**
   * 安全发送消息（带自动重连重试）
   * 发送前检查连接状态，失败时自动重连后重试
   * @param {string} tokenId - 账号ID
   * @param {string} cmd - 命令名
   * @param {object} params - 命令参数
   * @param {number} timeout - 超时时间(ms)
   * @param {string} nm - 账号名称（日志用）
   * @param {object} st - 推图状态
   * @param {number} maxRetries - 最大重试次数
   */
  const safeSend = async (tokenId, cmd, params, timeout, nm, st, maxRetries = 2) => {
    for (let i = 0; i <= maxRetries; i++) {
      // 发送前检查连接状态
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        log(`[${nm}] 发送 ${cmd} 前检测到连接断开，尝试重连...`, "warning");
        const rc = await reconnect(tokenId, st);
        if (!rc.success) throw new Error("重连失败");
        // 重连后重新初始化战斗版本
        await initBattleVersion(tokenId, nm);
      }
      try {
        return await tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout);
      } catch (e) {
        const msg = e.message || '';
        const isConnectionError = msg.includes('超时') || msg.includes('断开') || 
                                   msg.includes('connection') || msg.includes('not connected');
        if (isConnectionError && i < maxRetries) {
          log(`[${nm}] 命令 ${cmd} 失败(连接问题): ${msg}，重连后重试(${i + 1}/${maxRetries})...`, "warning");
          const rc = await reconnect(tokenId, st);
          if (!rc.success) throw e;
          // 重连后重新初始化战斗版本
          await initBattleVersion(tokenId, nm);
          continue;
        }
        throw e;
      }
    }
  };

  /**
   * 发送心跳保活（推图期间必须保持连接，不可断开）
   */
  const sendHeartbeat = (tokenId, nm) => {
    try {
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected") {
        tokenStore.sendMessage(tokenId, "heart_beat");
      } else {
        log(`[${nm}] 心跳检测到连接异常(${status})，将在下次心跳尝试重连`, "warning");
      }
    } catch (e) {
      log(`[${nm}] 心跳发送异常: ${e.message}`, "warning");
    }
  };

  /**
   * 初始化战斗版本
   */
  const initBattleVersion = async (tokenId, nm) => {
    try {
      const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
      if (initRes?.battleData?.version) {
        tokenStore.setBattleVersion(initRes.battleData.version);
        log(`[${nm}] 战斗版本初始化完成`, "success");
      }
    } catch (e) {
      log(`[${nm}] 战斗版本初始化失败: ${e.message}`, "warning");
    }
  };

  // ========== 火把系统 ==========

  // 使用火把
  const useTorch = async (tokenId) => {
    const ti = window._pushTorchType || 0;
    if (!ti) return;
    const count = window._pushTorchCount || 10;
    log(`使用火把 x${count}...`);
    let ok = 0;
    for (let i = 0; i < count; i++) {
      try {
        const resp = await tokenStore.sendMessageWithPromise(tokenId, "item_consume", { itemId: ti, quantity: 1 }, 5000);
        if (!resp || resp.code) {
          log(`火把激活失败(code=${resp?.code})`, "error");
          break;
        }
        ok++;
        await sleep(500);
      } catch (e) {
        log(`火把激活失败: ${e.message}`, "error");
        break;
      }
    }
    const mins = Math.round((ti === 1008 ? 10 : ti === 1009 ? 20 : 30) * ok);
    if (ok > 0) {
      if (window._pt[tokenId]) {
        window._pt[tokenId].torchAt = Date.now();
        window._pt[tokenId].torchDur = (ti === 1008 ? 600 : ti === 1009 ? 1200 : 1800) * ok;
        // 注意：torchSpeedFactor 仅用于显示，不再影响倒计时计算
        window._pt[tokenId].torchSpeedFactor = torchSpeedMap[ti] || 1;
      }
      log(`火把激活成功(约${mins}分钟)`, "success");
    } else {
      if (window._pt[tokenId]) {
        window._pt[tokenId].torchSpeedFactor = 1;
        window._pt[tokenId].torchDur = 0;
      }
      log(`火把全部激活失败，回退1倍速`, "warning");
    }
  };

  /**
   * 检查火把是否需要续期
   */
  const checkTorchRenewal = async (tokenId, st, nm) => {
    if (window._pushTorchType && st.torchAt && st.torchDur > 0 && !st.stopFlag) {
      const torchElapsed = (Date.now() - st.torchAt) / 1000;
      if (torchElapsed >= st.torchDur) {
        log(`[${nm}] 火把已过期，续用...`, "warning");
        await useTorch(tokenId);
      } else if (torchElapsed >= st.torchDur * 0.9) {
        // 剩余不足10%时提前续期
        const remaining = Math.ceil(st.torchDur - torchElapsed);
        log(`[${nm}] 火把即将过期(剩余${remaining}秒)，提前续用...`, "info");
        await useTorch(tokenId);
      }
    }
  };

  // ========== 重连逻辑 ==========

  /**
   * 自动重连（持续重试直到成功或手动停止，不限次数）
   * 优化：指数退避 + 自动重初始化
   */
  const reconnect = async (tokenId, pushState) => {
    // 如果 tokenStore 已经在处理重连，等待其完成
    if (tokenStore.isReconnecting && tokenStore.isReconnecting(tokenId)) {
      const nm = getTokenName(tokenId);
      log(`[${nm}] Store层正在触发重连，等待完成...`, "info");
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (!tokenStore.isReconnecting(tokenId)) {
          if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
            log(`[${nm}] Store层重连已完成`, "success");
            return { success: true };
          }
          break;
        }
      }
    }
    // 清除主动断开标记
    if (tokenStore && tokenStore.clearIntentionalDisconnect) {
      tokenStore.clearIntentionalDisconnect(tokenId);
    }
    const nm = getTokenName(tokenId);
    let attempt = 0;
    while (!pushState.stopFlag && !isShouldStop()) {
      attempt++;
      const tokens = getTokens();
      log(`[${nm}] 尝试重连 (第${attempt}次)...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl);
          // 等待连接建立（最多10秒）
          for (let w = 0; w < 20; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        }
      } catch (e) { /* ignore */ }
      
      if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
        log(`[${nm}] 重连成功 (第${attempt}次尝试)`, "success");
        await sleep(2000); // 等待连接稳定
        return { success: true };
      }
      
      // 指数退避：前3次5秒，之后10s -> 20s -> 30s(上限)
      const waitSec = attempt <= 3 ? 5 : Math.min(30, 10 * Math.pow(2, attempt - 4));
      log(`[${nm}] 重连未成功，${waitSec}秒后重试...`, "warning");
      await sleep(waitSec * 1000);
    }
    
    log(`[${nm}] 重连已停止 (${attempt}次尝试)`, "error");
    return { success: false };
  };

  /**
   * 重连后恢复状态（重初始化战斗版本 + 刷新角色信息）
   */
  const restoreAfterReconnect = async (tokenId, st, nm) => {
    // 重新初始化战斗版本
    await initBattleVersion(tokenId, nm);
    
    // 刷新角色信息获取最新关卡
    try {
      const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
      if (ri && ri.role) {
        st.level = ri.role.levelId || 0;
        log(`[${nm}] 重连后刷新角色信息，当前关卡: ${st.level}`, "success");
      }
    } catch (e) {
      log(`[${nm}] 重连后刷新角色信息失败: ${e.message}`, "warning");
    }
    
    // 重置状态刷新计时器
    st.lastStatusRefresh = Date.now();
  };

  // ========== 战斗子函数 ==========

  /**
   * 倒计时等待（包含心跳保活、连接检查、火把续期）
   * 注意：battleTime 已是服务器最终战斗时间（已考虑火把加速），不再应用 torchSpeedFactor
   */
  const countdownWait = async (tokenId, st, nm, battleTime) => {
    st.totalTime = battleTime;
    st.countdown = battleTime;

    const t0 = Date.now();
    let lastHeartbeat = 0;
    let lastLogSec = -1;

    while (st.countdown > 0 && !st.stopFlag && !isShouldStop()) {
      await sleep(1000);
      const elapsed = (Date.now() - t0) / 1000;
      // 关键修复：不再乘以 torchSpeedFactor，battleTime 已是最终值
      st.countdown = Math.max(0, Math.ceil(battleTime - elapsed));

      // 心跳保活（每10秒）
      lastHeartbeat++;
      if (lastHeartbeat >= HEARTBEAT_INTERVAL) {
        lastHeartbeat = 0;
        sendHeartbeat(tokenId, nm);
        
        // 检查连接状态
        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 倒计时中检测到连接断开，尝试重连...`, "warning");
          const rc = await reconnect(tokenId, st);
          if (!rc.success) {
            log(`[${nm}] 倒计时中重连失败，停止推图`, "error");
            st.stopFlag = true;
            return;
          }
          // 重连后恢复状态
          await restoreAfterReconnect(tokenId, st, nm);
          // 重新计算倒计时（基于已过去的时间）
          const elapsedAfterReconnect = (Date.now() - t0) / 1000;
          st.countdown = Math.max(0, Math.ceil(battleTime - elapsedAfterReconnect));
        }
      }

      // 日志输出（每10秒）
      const curSec = Math.floor(elapsed);
      if (curSec !== lastLogSec && curSec % 10 === 0 && curSec > 0) {
        lastLogSec = curSec;
        const remain = st.countdown;
        const rm = Math.floor(remain / 60);
        const rs = remain % 60;
        log(`[${nm}] ⏳ 战斗剩余 ${rm}:${String(rs).padStart(2, '0')}`);
      }

      // 火把续期检查（每30秒，基于实际经过时间）
      if (Math.floor(elapsed) % 30 === 0 && Math.floor(elapsed) > 0 && Math.floor(elapsed) !== lastLogSec) {
        await checkTorchRenewal(tokenId, st, nm);
      }
    }
  };

  /**
   * 解析战斗结果
   * @returns {boolean} true=胜利, false=失败
   */
  const parseFightResult = (fr, st, nm) => {
    const bd = (fr && fr.body) || fr || {};
    const win = bd.success == true || bd.isWin == true || bd.result == 1 || bd.win == true;
    const nl = bd.currLevel || bd.nextLevel || bd.level || bd.newLevel || st.level;
    
    st.battles++;
    if (win) {
      st.wins++;
      st.level = nl;
      log(`[${nm}] ✅ 胜利! 关卡 ${nl}`, "success");
    } else {
      st.losses++;
      const failReason = bd.errorCode || bd.reason || '';
      log(`[${nm}] ❌ 失败${failReason ? ': ' + failReason : ''}`, "error");
    }
    return win;
  };

  /**
   * 执行一次完整战斗流程
   */
  const executeOneBattle = async (tokenId, st, nm) => {
    // 1. 获取关卡信息
    try {
      const ri = await safeSend(tokenId, "role_getroleinfo", {}, 10000, nm, st);
      if (ri && ri.role) st.level = ri.role.levelId || 0;
    } catch (e) {
      log(`[${nm}] 获取关卡信息失败: ${e.message}`, "warning");
    }
    
    const bossNm = getBoss(st.level);
    log(`[${nm}] 关卡: ${st.level}${bossNm ? " Boss: " + bossNm : ""}`);

    // 2. 计算战斗时间
    let battleTime = BATTLE_TIME_DEFAULT;
    try {
      const cr = await safeSend(tokenId, "fight_calcleveltime", { levelId: st.level }, 15000, nm, st);
      if (cr && !cr.code) {
        const bt = cr.battleTime 
          || (cr.body && cr.body.battleTime) 
          || (cr.battleData && cr.battleData.battleTime);
        if (bt != null) {
          battleTime = Number(bt);
          // 安全校验
          if (battleTime <= 0) {
            log(`[${nm}] 战斗时间无效(${battleTime}s)，使用默认值${BATTLE_TIME_DEFAULT}s`, "warning");
            battleTime = BATTLE_TIME_DEFAULT;
          } else if (battleTime > BATTLE_TIME_MAX) {
            log(`[${nm}] 战斗时间异常(${battleTime}s > ${BATTLE_TIME_MAX}s)，使用上限值`, "warning");
            battleTime = BATTLE_TIME_MAX;
          }
        }
      } else if (cr && cr.code) {
        log(`[${nm}] 获取战斗时间失败，错误码: ${cr.code}，使用默认值${BATTLE_TIME_DEFAULT}s`, "warning");
      }
      // 记录火把状态和战斗时间关系
      const torchInfo = st.torchDur > 0 
        ? `火把剩余${Math.ceil((st.torchDur - (Date.now() - st.torchAt) / 1000))}s`
        : "无火把";
      log(`[${nm}] 战斗需 ${battleTime} 秒 (${torchInfo})`, "success");
    } catch (e) {
      log(`[${nm}] 获取战斗时间失败: ${e.message}，使用默认值${BATTLE_TIME_DEFAULT}s`, "warning");
    }
    
    if (st.stopFlag || isShouldStop()) return;

    // 3. 倒计时等待
    const waitStart = Date.now();
    await countdownWait(tokenId, st, nm, battleTime);
    if (st.stopFlag || isShouldStop()) return;
    
    // 记录实际等待时间
    const actualWait = ((Date.now() - waitStart) / 1000).toFixed(1);
    log(`[${nm}] 倒计时结束 (实际等待${actualWait}s)`, "info");

    // 4. 获取战斗结果（带重试）
    log(`[${nm}] 获取战斗结果...`);
    let fightResultRetrieved = false;
    
    for (let fightRetry = 0; fightRetry < 5 && !fightResultRetrieved; fightRetry++) {
      try {
        const fr = await safeSend(tokenId, "fight_level", {}, 15000, nm, st);
        const win = parseFightResult(fr, st, nm);
        fightResultRetrieved = true;
        
        // 失败后等待
        if (!win) {
          await sleep(10000);
        }
        
        // 刷新角色数据
        try {
          await safeSend(tokenId, "role_getroleinfo", {}, 8000, nm, st, 1);
        } catch (e) { /* ignore */ }
        
      } catch (e) {
        const errMsg = e.message || '';
        const isServerError = errMsg.includes('200020');
        
        if (fightRetry < 4) {
          // 200020 服务器错误：战斗可能尚未结算，延长等待时间
          const waitTime = isServerError ? 8000 : 3000;
          log(`[${nm}] 获取结果失败(${errMsg})，${isServerError ? '服务器处理中，' : ''}重试中(${fightRetry + 1}/4)...`, "warning");
          await sleep(waitTime);
        } else {
          st.losses++;
          log(`[${nm}] 获取结果最终失败: ${errMsg}`, "error");
          await sleep(10000);
          fightResultRetrieved = true;
        }
      }
    }
  };

  // ========== 主循环 ==========

  /**
   * 推图主循环
   */
  const pushLoop = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    
    window._pt[tokenId] = {
      running: true, stopFlag: false, level: 0, wins: 0, losses: 0,
      retries: 0, countdown: 0, totalTime: 0, battles: 0, torchAt: 0, torchDur: 0,
      torchSpeedFactor: 1,
      lastStatusRefresh: 0,
    };
    const st = window._pt[tokenId];
    const nm = getTokenName(tokenId);
    if (tokenStatus) tokenStatus.value[tokenId] = "running";
    log(`[${nm}] 开始推图`, "success");

    // 启动时检查连接状态
    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
      const reconnectResult = await reconnect(tokenId, st);
      if (!reconnectResult.success) {
        log(`[${nm}] 启动时未连接，重连失败，退出推图`, "error");
        return;
      }
    }

    // 使用火把（如果选择了）
    if (window._pushTorchType) {
      await useTorch(tokenId);
    }

    // 初始化战斗版本（推图必需）
    await initBattleVersion(tokenId, nm);

    // 记录初始刷新时间
    st.lastStatusRefresh = Date.now();

    try {
      while (!st.stopFlag && !isShouldStop()) {
        // 执行一次战斗
        await executeOneBattle(tokenId, st, nm);
        if (st.stopFlag || isShouldStop()) break;

        // 每小时自动刷新状态
        const STATUS_REFRESH_INTERVAL = 60 * 60 * 1000;
        const timeSinceLastRefresh = Date.now() - st.lastStatusRefresh;
        if (timeSinceLastRefresh >= STATUS_REFRESH_INTERVAL) {
          log(`[${nm}] 定时刷新状态（已运行${Math.floor(timeSinceLastRefresh / 60000)}分钟）`, "info");
          try {
            const ri = await safeSend(tokenId, "role_getroleinfo", {}, 10000, nm, st, 1);
            if (ri && ri.role) {
              st.level = ri.role.levelId || 0;
              log(`[${nm}] 状态刷新完成，当前关卡: ${st.level}`, "success");
            }
            sendHeartbeat(tokenId, nm);
          } catch (e) {
            log(`[${nm}] 状态刷新失败: ${e.message}`, "warning");
          }
          st.lastStatusRefresh = Date.now();
        }

        // 战斗后连接检查
        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 战斗后连接断开，重连中...`, "warning");
          const reconnected = await reconnect(tokenId, st);
          if (!reconnected.success) {
            log(`[${nm}] 重连失败，停止推图`, "error");
            break;
          }
          await restoreAfterReconnect(tokenId, st, nm);
        }

        // 火把续期检查
        await checkTorchRenewal(tokenId, st, nm);

        // 战斗间隔
        if (!st.stopFlag && !isShouldStop()) await sleep(2000);
      }
    } catch (e) {
      log(`[${nm}] 推图异常: ${e.message}`, "error");
    } finally {
      st.running = false;
      st.countdown = 0;
      if (tokenStatus) tokenStatus.value[tokenId] = "completed";
      log(`[${nm}] 推图已停止 (${st.wins}胜 ${st.losses}负)`, "warning");
    }
  };

  // ========== 启动/停止 ==========

  /**
   * 启动单个 Token 推图（带自动连接）
   */
  const startOne = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
      
    // 自动连接未连接的 Token
    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
      const nm = getTokenName(tokenId);
      const tokens = getTokens();
      log(`[${nm}] 未连接，正在自动连接...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          // 不传 onConnect 回调，避免等待完整状态数据加载
          const result = await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl, null);
          if (!result) {
            log(`[${nm}] 连接被跳过（可能正在连接中），等待现有连接...`, "warning");
          }
          // 等待连接建立（最多 15 秒）
          for (let w = 0; w < 30; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        } else {
          log(`[${nm}] 未找到账号信息，无法连接`, "error");
        }
      } catch (e) {
        log(`[${nm}] 连接异常：${e.message}`, "error");
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        log(`[${nm}] 连接失败，推图将尝试后台重连...`, "warning");
      } else {
        log(`[${nm}] 连接成功`, "success");
      }
    }
    // pushLoop 在后台运行，不 await
    pushLoop(tokenId);
  };

  // 停止单个Token推图
  const stopOne = (tokenId) => {
    if (window._pt && window._pt[tokenId]) window._pt[tokenId].stopFlag = true;
  };

  return {
    pushLoop,
    startOne,
    stopOne,
    loadBossData,
    useTorch,
    reconnect,
    getBoss,
    sleep,
  };
}
