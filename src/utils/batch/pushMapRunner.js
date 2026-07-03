/**
 * 共享推图逻辑模块
 * 提供统一的推图循环、火把系统、自动重连等功能
 * 供 TokenCard（单卡推图）和 BatchDailyTasks（批量推图）共用
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  // 火把加速倍数映射
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
    const speed = torchSpeedMap[ti] || 1;
    if (ok > 0) {
      if (window._pt[tokenId]) {
        window._pt[tokenId].torchAt = Date.now();
        window._pt[tokenId].torchDur = (ti === 1008 ? 600 : ti === 1009 ? 1200 : 1800) * ok;
        window._pt[tokenId].torchSpeedFactor = speed;
      }
      log(`火把激活成功(约${mins}分钟)`, "success");
    } else {
      if (window._pt[tokenId]) {
        window._pt[tokenId].torchSpeedFactor = 1;
        window._pt[tokenId].torchDur = 0;  // 全部失败，不需要续期
      }
      log(`火把全部激活失败，回退1倍速`, "warning");
    }
  };

  // 自动重连（持续重试直到成功或手动停止）
  const reconnect = async (tokenId, pushState) => {
    // 如果 tokenStore 已经在处理重连，等待其完成
    if (tokenStore.isReconnecting && tokenStore.isReconnecting(tokenId)) {
      const nm = getTokenName(tokenId);
      log(`[${nm}] Store层正在触发重连，等待完成...`, "info");
      // 等待 Store 层重连完成（最多等10秒）
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (!tokenStore.isReconnecting(tokenId)) {
          // 重连完成，检查状态
          if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
            log(`[${nm}] Store层重连已完成`, "success");
            return { success: true };
          }
          break; // 重连标记清除了但没连上，继续自己的重连
        }
      }
    }
    // 清除主动断开标记，确保重连不被阻断
    if (tokenStore && tokenStore.clearIntentionalDisconnect) {
      tokenStore.clearIntentionalDisconnect(tokenId);
    }
    const nm = getTokenName(tokenId);
    let attempt = 0;
    while (!pushState.stopFlag && !isShouldStop()) {
      attempt++;
      const tokens = getTokens();  // 每次重连尝试重新获取，避免引用过期
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
      } catch (e) { }
      if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
        log(`[${nm}] 重连成功 (第${attempt}次尝试)`, "success");
        await sleep(2000);
        return { success: true };
      }
      // 重连间隔：前3次5秒，之后每5次增加5秒，最长30秒
      const waitSec = Math.min(30, attempt <= 3 ? 5 : (Math.floor(attempt / 5) + 1) * 5);
      log(`[${nm}] 重连未成功，${waitSec}秒后重试...`, "warning");
      await sleep(waitSec * 1000);
    }
    log(`[${nm}] 重连已停止 (${attempt}次尝试)`, "error");
    return { success: false };
  };

  // 推图主循环
  const pushLoop = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    window._pt[tokenId] = {
      running: true, stopFlag: false, level: 0, wins: 0, losses: 0,
      retries: 0, countdown: 0, totalTime: 0, battles: 0, torchAt: 0, torchDur: 0,
      torchSpeedFactor: 1,
      lastStatusRefresh: 0, // 上次刷新状态的时间戳
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
        return;  // 无法连接，退出推图循环
      }
    }

    // 使用火把（如果选择了）
    if (window._pushTorchType) {
      await useTorch(tokenId);
    }

    // 初始化战斗版本（推图必需）
    try {
      const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
      if (initRes?.battleData?.version) {
        tokenStore.setBattleVersion(initRes.battleData.version);
        log(`[${nm}] 战斗版本初始化完成`, "success");
      }
    } catch (e) {
      log(`[${nm}] 战斗版本初始化失败，继续尝试推图`, "warning");
    }

    // 记录初始刷新时间
    st.lastStatusRefresh = Date.now();

    try {
      while (!st.stopFlag && !isShouldStop()) {
        // 获取关卡信息
        try {
          const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
          if (ri && ri.role) st.level = ri.role.levelId || 0;
        } catch (e) { }
        const bossNm = getBoss(st.level);
        log(`[${nm}] 关卡: ${st.level}${bossNm ? " Boss: " + bossNm : ""}`);

        // 计算战斗时间
        let battleTime = 300;
        try {
          const cr = await tokenStore.sendMessageWithPromise(tokenId, "fight_calcleveltime", { levelId: st.level }, 15000);
          if (cr && !cr.code) {
            const bt = cr.battleTime || (cr.body && cr.body.battleTime);
            if (bt != null) { battleTime = Number(bt); if (battleTime <= 0) battleTime = 300; }
          } else if (cr && cr.code) {
            // 接口返回错误码，记录日志便于排查
            log(`[${nm}] 获取战斗时间失败，错误码: ${cr.code}，使用默认值300秒`, "warning");
          }
          log(`[${nm}] 战斗需 ${battleTime} 秒`, "success");
        } catch (e) {
          log(`[${nm}] 获取战斗时间失败: ${e.message}，使用默认值300秒`, "warning");
        }
        if (st.stopFlag || isShouldStop()) break;
        st.totalTime = battleTime;
        st.countdown = battleTime;

        // 倒计时等待
        const t0 = Date.now();
        let hb = 0;
        let lastLogSec = -1;
        while (st.countdown > 0 && !st.stopFlag && !isShouldStop()) {
          await sleep(1000);
          const elapsed = (Date.now() - t0) / 1000;
          st.countdown = Math.max(0, Math.ceil(battleTime - elapsed * (st.torchSpeedFactor || 1)));
          hb++;

          const curSec = Math.floor((Date.now() - t0) / 1000);
          if (curSec !== lastLogSec && curSec % 10 === 0) {
            lastLogSec = curSec;
            const remain = Math.max(0, Math.ceil(battleTime - curSec * (st.torchSpeedFactor || 1)));
            const rm = Math.floor(remain / 60);
            const rs = remain % 60;
            log(`[${nm}] ⏳ 战斗剩余 ${rm}:${String(rs).padStart(2, '0')}`);
          }

          if (hb % 25 === 0) {
            try {
              tokenStore.sendMessage(tokenId, "heart_beat");
            } catch (e) {
              if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
                log(`[${nm}] 倒计时中心跳失败，尝试重连...`, "warning");
                const reconnectResult = await reconnect(tokenId, st);
                if (!reconnectResult.success) {
                  log(`[${nm}] 倒计时中重连失败，停止推图`, "error");
                  st.stopFlag = true;
                  break;
                }
                // 重连后刷新倒计时状态
                const elapsedAfterReconnect = (Date.now() - t0) / 1000;
                st.countdown = Math.max(0, Math.ceil(battleTime - elapsedAfterReconnect * (st.torchSpeedFactor || 1)));
              }
            }
          }
          // 检查连接状态
          if (hb % 25 === 0 && tokenStore.getWebSocketStatus(tokenId) !== "connected") {
            log(`[${nm}] 倒计时中检测到连接断开，尝试重连...`, "warning");
            const reconnectResult = await reconnect(tokenId, st);
            if (!reconnectResult.success) {
              log(`[${nm}] 倒计时中重连失败，停止推图`, "error");
              st.stopFlag = true;
              break;
            }
          }
          // 每30秒检查一次火把状态，避免战斗中火把过期
          if (hb % 30 === 0 && window._pushTorchType && st.torchAt && st.torchDur > 0) {
            const torchElapsed = (Date.now() - st.torchAt) / 1000;
            if (torchElapsed >= st.torchDur) {
              log(`火把即将过期，提前续用...`, "warning");
              await useTorch(tokenId);
            }
          }
        }
        if (st.stopFlag || isShouldStop()) break;

        // 获取战斗结果（带重试）
        log(`[${nm}] 获取战斗结果...`);
        let fightResultRetrieved = false;
        for (let fightRetry = 0; fightRetry < 2 && !fightResultRetrieved; fightRetry++) {
          try {
            const fr = await tokenStore.sendMessageWithPromise(tokenId, "fight_level", {}, 15000);
            // 多路径解析战斗结果
            const bd = (fr && fr.body) || fr || {};
            const win = bd.success == true || bd.isWin == true || bd.result == 1 || bd.win == true;
            // 多路径获取新关卡
            const nl = bd.currLevel || bd.nextLevel || bd.level || bd.newLevel || st.level;
            st.battles++;
            if (win) {
              st.wins++; st.retries = 0; st.level = nl;
              log(`[${nm}] ✅ 胜利! 关卡 ${nl}`, "success");
            } else {
              st.losses++; st.retries = (st.retries || 0) + 1;
              const failReason = bd.errorCode || bd.reason || '';
              log(`[${nm}] ❌ 失败 (连续${st.retries}次)${failReason ? ': ' + failReason : ''}`, "error");
              if (st.retries >= 5) {
                log(`[${nm}] 连续失败${st.retries}次，暂停30秒`, "warning");
                await sleep(30000);
              } else {
                await sleep(10000);
              }
            }
            fightResultRetrieved = true;
            // 刷新角色数据
            try { await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 8000); } catch (e) { }
          } catch (e) {
            const errMsg = e.message || '';
            // 连接相关错误，尝试重连
            if (errMsg.includes('超时') || errMsg.includes('断开') || errMsg.includes('connection') || errMsg.includes('not connected')) {
              log(`[${nm}] 获取结果失败(连接问题): ${errMsg}，尝试重连...`, "warning");
              const reconnectResult = await reconnect(tokenId, st);
              if (!reconnectResult.success) {
                log(`[${nm}] 获取结果时重连失败，停止推图`, "error");
                st.stopFlag = true;
                break;
              }
              fightRetry = -1;  // 重置重试计数，让循环从头开始（下一轮 ++fightRetry 后变为 0）
              continue;  // 跳过本次循环的后续逻辑，重新开始获取战斗结果
            } else if (fightRetry < 1) {
              log(`[${nm}] 获取结果失败，重试中...`, "warning");
              await sleep(3000);
            } else {
              st.losses++; st.retries = (st.retries || 0) + 1;
              log(`[${nm}] 获取结果失败: ${errMsg}`, "error");
              await sleep(10000);
              fightResultRetrieved = true; // 最后一次重试失败，标记为已获取以退出循环
            }
          }
        }
        if (st.stopFlag) break;

        // 每小时自动刷新状态（在战斗完成后检查，避免影响战斗流程）
        const STATUS_REFRESH_INTERVAL = 60 * 60 * 1000; // 1小时
        const timeSinceLastRefresh = Date.now() - st.lastStatusRefresh;
        if (timeSinceLastRefresh >= STATUS_REFRESH_INTERVAL) {
          log(`[${nm}] 定时刷新状态（已运行${Math.floor(timeSinceLastRefresh / 60000)}分钟）`, "info");
          try {
            // 刷新角色信息
            const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
            if (ri && ri.role) {
              st.level = ri.role.levelId || 0;
              log(`[${nm}] 状态刷新完成，当前关卡: ${st.level}`, "success");
            }
            // 发送心跳保持连接
            tokenStore.sendMessage(tokenId, "heart_beat");
          } catch (e) {
            log(`[${nm}] 状态刷新失败: ${e.message}`, "warning");
          }
          st.lastStatusRefresh = Date.now();
        }

        // 检查连接状态，断线时自动重连
        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 连接断开，持续重连中...`, "warning");
          const reconnected = await reconnect(tokenId, st);
          if (!reconnected.success) {
            log(`[${nm}] 重连被中止，停止推图`, "error");
            break;
          }
          // 重连成功后重新初始化战斗版本
          try {
            const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
            if (initRes?.battleData?.version) {
              tokenStore.setBattleVersion(initRes.battleData.version);
              log(`[${nm}] 战斗版本重新初始化完成`, "success");
            }
          } catch (e) { }
          // 重连成功后刷新角色信息获取最新关卡
          try {
            const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
            if (ri && ri.role) {
              st.level = ri.role.levelId || 0;
              log(`[${nm}] 重连后刷新角色信息，当前关卡: ${st.level}`, "success");
            }
          } catch (e) {
            log(`[${nm}] 重连后刷新角色信息失败: ${e.message}`, "warning");
          }
          // 重连成功后重置刷新计时器
          st.lastStatusRefresh = Date.now();
        }

        // 火把续期检查
        if (window._pushTorchType && st.torchAt && st.torchDur > 0 && !st.stopFlag) {
          const torchElapsed = (Date.now() - st.torchAt) / 1000;
          if (torchElapsed >= st.torchDur) {
            log(`火把已过期，续用...`, "warning");
            await useTorch(tokenId);
          }
        }

        if (!st.stopFlag && !isShouldStop()) await sleep(2000);
      }
    } catch (e) {
      log(`[${nm}] 推图异常: ${e.message}`, "error");
    } finally {
      st.running = false; st.countdown = 0;
      if (tokenStatus) tokenStatus.value[tokenId] = "completed";
      log(`[${nm}] 推图已停止 (${st.wins}胜 ${st.losses}负)`, "warning");
    }
  };

  // 启动单个 Token 推图（带自动连接）
  // 优化：不等待完整的账号状态数据加载，只需 WebSocket 连接建立即可开始推图
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
          // ✅ 关键优化：不传 onConnect 回调，避免等待角色信息等完整状态数据加载
          // pushLoop 内部会通过 fight_startlevel 获取 battleVersion
          // pushLoop 内部会通过 role_getroleinfo 获取 levelId
          // 这样大大加快了批量推图的启动速度
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
