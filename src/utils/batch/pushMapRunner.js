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

  // 判断是否应该停止
  const isShouldStop = () => {
    if (!shouldStop) return false;
    if (typeof shouldStop === 'function') return shouldStop();
    // ref
    return shouldStop.value === true;
  };

  // 等待定时任务执行完毕（定时任务优先，推图暂停等待）
  const waitForScheduledTask = async (pushState) => {
    if (!window._isScheduledTaskRunning) return;
    log(`[推图] 检测到定时任务执行中，推图暂停等待...`, "warning");
    let waited = 0;
    while (window._isScheduledTaskRunning && !pushState.stopFlag && !isShouldStop()) {
      await sleep(5000);
      waited += 5;
      if (waited % 30 === 0) {
        log(`[推图] 仍在等待定时任务完成（已等待${waited}秒）...`, "info");
      }
    }
    if (!pushState.stopFlag && !isShouldStop()) {
      log(`[推图] 定时任务已完成，推图恢复执行`, "success");
    }
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
    const nm = getTokenName(tokenId);
    const torchNm = ti === 1008 ? "木材" : ti === 1009 ? "青铜" : "战神";
    log(`[${nm}] 使用${torchNm}火把 x${count}...`);
    let ok = 0;
    for (let i = 0; i < count; i++) {
      try {
        await tokenStore.sendMessageWithPromise(tokenId, "item_consume", { itemId: ti, quantity: 1 }, 5000);
        ok++;
        await sleep(500);
      } catch (e) {
        log(`[${nm}] 火把第${i + 1}次失败: ${e.message}`, "error");
        break;
      }
    }
    if (window._pt[tokenId]) {
      window._pt[tokenId].torchAt = Date.now();
      window._pt[tokenId].torchDur = (ti === 1008 ? 600 : ti === 1009 ? 1200 : 1800) * ok;
    }
    const mins = Math.round((ti === 1008 ? 10 : ti === 1009 ? 20 : 30) * ok);
    log(`[${nm}] ${torchNm}火把已激活 ${ok}个(约${mins}分钟)`, "success");
  };

  // 自动重连（持续重试直到成功或手动停止）
  const reconnect = async (tokenId, pushState) => {
    const nm = getTokenName(tokenId);
    const tokens = getTokens();
    let attempt = 0;
    while (!pushState.stopFlag && !isShouldStop()) {
      attempt++;
      log(`[${nm}] 尝试重连 (第${attempt}次)...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          const result = await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl);
          if (!result) {
            log(`[${nm}] 重连: createWebSocketConnection返回null（可能锁冲突或跨标签页已有连接）`, "warning");
          }
          // 等待连接建立（最多10秒）
          for (let w = 0; w < 20; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        } else {
          log(`[${nm}] 未找到账号信息，无法重连`, "error");
        }
      } catch (e) {
        log(`[${nm}] 重连异常: ${e.message}`, "error");
      }
      if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
        log(`[${nm}] 重连成功 (第${attempt}次尝试)`, "success");
        await sleep(2000);
        return true;
      }
      // 重连间隔：前3次5秒，之后每5次增加5秒，最长30秒
      const waitSec = Math.min(30, attempt <= 3 ? 5 : (Math.floor(attempt / 5) + 1) * 5);
      const curStatus = tokenStore.getWebSocketStatus(tokenId);
      log(`[${nm}] 重连未成功(当前状态:${curStatus})，${waitSec}秒后重试...`, "warning");
      await sleep(waitSec * 1000);
    }
    log(`[${nm}] 重连已停止 (${attempt}次尝试)`, "error");
    return false;
  };

  // 推图主循环
  const pushLoop = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    window._pt[tokenId] = {
      running: true, stopFlag: false, level: 0, wins: 0, losses: 0,
      retries: 0, countdown: 0, totalTime: 0, battles: 0, torchAt: 0, torchDur: 0,
    };
    const st = window._pt[tokenId];
    const nm = getTokenName(tokenId);
    if (tokenStatus) tokenStatus.value[tokenId] = "running";
    log(`[${nm}] 开始推图`, "success");

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

    try {
      while (!st.stopFlag && !isShouldStop()) {
        // 定时任务互斥：定时任务执行期间推图暂停等待
        await waitForScheduledTask(st);
        if (st.stopFlag || isShouldStop()) break;

        // 检查连接状态，断线时自动重连
        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 连接断开，持续重连中...`, "warning");
          const reconnected = await reconnect(tokenId, st);
          if (!reconnected) {
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
        }

        // 获取关卡信息
        try {
          const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
          if (ri && ri.role) st.level = ri.role.levelId || 0;
        } catch (e) {
          // 获取关卡信息失败，检查连接是否还活着
          if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
            log(`[${nm}] 获取关卡信息失败且连接已断开，尝试重连...`, "warning");
            const reconnected = await reconnect(tokenId, st);
            if (!reconnected) { log(`[${nm}] 重连被中止，停止推图`, "error"); break; }
            try {
              const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
              if (initRes?.battleData?.version) tokenStore.setBattleVersion(initRes.battleData.version);
            } catch (e2) { }
            continue; // 重新进入循环，从头开始本轮
          }
        }
        const bossNm = getBoss(st.level);
        log(`[${nm}] 关卡: ${st.level}${bossNm ? " Boss: " + bossNm : ""}`);

        // 计算战斗时间
        let battleTime = 300;
        try {
          const cr = await tokenStore.sendMessageWithPromise(tokenId, "fight_calcleveltime", {}, 15000);
          if (cr && !cr.code) {
            const bt = cr.battleTime || (cr.body && cr.body.battleTime);
            if (bt != null) { battleTime = Number(bt); if (battleTime <= 0) battleTime = 300; }
          }
          log(`[${nm}] 战斗需 ${battleTime} 秒`, "success");
        } catch (e) {
          log(`[${nm}] 获取战斗时间失败`, "warning");
          // 计算战斗时间失败，也检查连接
          if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
            log(`[${nm}] 获取战斗时间失败且连接已断开，尝试重连...`, "warning");
            const reconnected = await reconnect(tokenId, st);
            if (!reconnected) { log(`[${nm}] 重连被中止，停止推图`, "error"); break; }
            try {
              const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
              if (initRes?.battleData?.version) tokenStore.setBattleVersion(initRes.battleData.version);
            } catch (e2) { }
            continue;
          }
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
          st.countdown = Math.max(0, Math.ceil(battleTime - (Date.now() - t0) / 1000));
          hb++;
          // 每10秒输出一次剩余时间
          const curLogSec = Math.floor(st.countdown / 10) * 10;
          if (curLogSec !== lastLogSec && st.countdown > 0) {
            lastLogSec = curLogSec;
            const mm = Math.floor(st.countdown / 60);
            const ss = String(Math.floor(st.countdown % 60)).padStart(2, '0');
            log(`[${nm}] ⏳ 战斗剩余 ${mm}:${ss}`, "info");
          }
          if (hb % 25 === 0) {
            try {
              tokenStore.sendMessage(tokenId, "heart_beat");
            } catch (e) {
              if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
                log(`[${nm}] 倒计时中心跳失败，尝试重连...`, "warning");
                await reconnect(tokenId, st);
              }
            }
          }
        }
        if (st.stopFlag || isShouldStop()) break;

        // 倒计时结束后，获取战斗结果前先检查连接状态
        // 倒计时期间（可能几分钟）连接可能已断开
        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 倒计时结束后检测到连接已断开，尝试重连...`, "warning");
          const reconnected = await reconnect(tokenId, st);
          if (!reconnected) {
            log(`[${nm}] 重连被中止，停止推图`, "error");
            break;
          }
          // 重连成功后重新初始化战斗版本
          try {
            const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
            if (initRes?.battleData?.version) tokenStore.setBattleVersion(initRes.battleData.version);
          } catch (e) { }
          continue; // 重新进入循环，确保战斗状态正确
        }

        // 获取战斗结果（带重试）
        log(`[${nm}] 获取战斗结果...`);
        let fightResultRetrieved = false;
        for (let fightRetry = 0; fightRetry < 2 && !fightResultRetrieved; fightRetry++) {
          try {
            const fr = await tokenStore.sendMessageWithPromise(tokenId, "fight_level", {}, 15000);
            // 多路径解析战斗结果
            const bd = (fr && fr.body) || fr || {};
            const win = bd.success === true || bd.isWin === true || bd.result === 1 || bd.win === true;
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
            const connStatus = tokenStore.getWebSocketStatus(tokenId);
            // 连接断开或连接相关错误，尝试重连
            if (connStatus !== "connected" || errMsg.includes('超时') || errMsg.includes('断开') || errMsg.includes('connection') || errMsg.includes('not connected')) {
              log(`[${nm}] 获取结果失败(连接状态:${connStatus}): ${errMsg}，尝试重连...`, "warning");
              await reconnect(tokenId, st);
              fightResultRetrieved = true;
            } else if (fightRetry < 1) {
              log(`[${nm}] 获取结果失败，重试中...`, "warning");
              await sleep(3000);
            } else {
              st.losses++; st.battles++; st.retries = (st.retries || 0) + 1;
              log(`[${nm}] 获取结果失败: ${errMsg}`, "error");
              await sleep(10000);
            }
          }
        }

        // 火把续期检查
        if (window._pushTorchType && st.torchAt && !st.stopFlag) {
          const elapsed = (Date.now() - st.torchAt) / 1000;
          if (elapsed >= st.torchDur) {
            log(`[${nm}] 火把已过期，续用...`, "warning");
            await useTorch(tokenId);
          }
        }

        // 下一轮战斗前再次检查定时任务互斥
        await waitForScheduledTask(st);

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

  // 启动单个Token推图（带自动连接）
  // 返回后连接阶段已完成，pushLoop在后台运行
  const startOne = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    // 自动连接未连接的Token
    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
      const nm = getTokenName(tokenId);
      const tokens = getTokens();
      log(`[${nm}] 未连接，正在自动连接...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          const result = await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl);
          if (!result) {
            log(`[${nm}] 连接被跳过（可能正在连接中），等待现有连接...`, "warning");
          }
          // 等待连接建立（最多15秒）
          for (let w = 0; w < 30; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        } else {
          log(`[${nm}] 未找到账号信息，无法连接`, "error");
        }
      } catch (e) {
        log(`[${nm}] 连接异常: ${e.message}`, "error");
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        log(`[${nm}] 连接失败，推图将尝试后台重连...`, "warning");
      } else {
        log(`[${nm}] 连接成功`, "success");
      }
    }
    // pushLoop在后台运行，不await
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
