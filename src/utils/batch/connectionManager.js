/**
 * WebSocket连接管理器
 */

// 全局连接队列控制 - 限制并发连接数
export const connectionQueue = { active: 0 };

/**
 * 创建连接管理器
 * @param {object} options - 配置选项
 * @param {object} options.tokenStore - Token存储
 * @param {object} options.batchSettings - 批量设置
 * @param {function} options.addLog - 日志添加函数
 * @returns {object} - 连接管理器对象
 */
export function createConnectionManager({ tokenStore, batchSettings, addLog }) {
  /**
   * 等待连接槽位（带超时和停止信号检测）
   * @param {number} timeout - 超时时间（ms），默认60秒
   */
  const waitForConnectionSlot = async (timeout = 60000) => {
    const start = Date.now();
    while (connectionQueue.active >= batchSettings.maxActive) {
      if (Date.now() - start > timeout) {
        throw new Error(`等待连接槽位超时（${timeout / 1000}秒），当前 ${connectionQueue.active}/${batchSettings.maxActive} 个槽位已占满`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    connectionQueue.active++;
  };

  /**
   * 释放连接槽位
   */
  const releaseConnectionSlot = () => {
    if (connectionQueue.active > 0) {
      connectionQueue.active--;
    }
  };

  /**
   * 等待连接建立
   * @param {string} tokenId - Token ID
   * @param {number} timeout - 超时时间
   */
  const waitForConnection = async (tokenId, timeout = batchSettings.connectionTimeout) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected")
        return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };

  /**
   * 确保连接建立
   * @param {string} tokenId - Token ID
   * @param {object} tokens - Tokens列表
   * @param {number} maxRetries - 最大重试次数
   */
  const ensureConnection = async (tokenId, tokens, maxRetries = 2) => {
    const latestToken = tokens.find((t) => t.id === tokenId);
    if (!latestToken) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    const status = tokenStore.getWebSocketStatus(tokenId);
    let connected = status === "connected";

    // 无论是否已连接，都需要获取连接槽位来限制并发数
    await waitForConnectionSlot();

    if (!connected) {
      // 如果当前正在连接中，等待一段时间看是否能连接成功
      if (status === "connecting") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 连接中，等待建立... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });

        const waitConnected = await waitForConnection(tokenId, 10000);
        if (waitConnected) {
          connected = true;
        }
      }

      // 如果等待后仍未连接，则创建新连接
      if (!connected) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });

        await tokenStore.createWebSocketConnection(
          tokenId,
          latestToken.token,
          latestToken.wsUrl,
        );
        connected = await waitForConnection(tokenId);
      }

      if (!connected && maxRetries > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 连接超时，尝试重连...`,
          type: "warning",
        });

        tokenStore.closeWebSocketConnection(tokenId);
        await new Promise((r) => setTimeout(r, batchSettings.reconnectDelay));

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 正在重连...`,
          type: "info",
        });

        const refreshedToken = tokens.find((t) => t.id === tokenId);
        await tokenStore.createWebSocketConnection(
          tokenId,
          refreshedToken.token,
          refreshedToken.wsUrl,
        );

        connected = await waitForConnection(tokenId);
      }

      if (!connected) {
        // 连接失败，释放槽位
        releaseConnectionSlot();

        // 检查是否是因为在其他地方登录导致的连接失败
        const isKickedError = e.message && (
          e.message.includes("90da564c")
          || e.message.includes("在其他地方登录")
          || e.message.includes("被踢")
          || e.message.includes("kick")
        );

        if (isKickedError) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${latestToken.name} 当前账号在其他地方有登录，无法连接成功`,
            type: "error",
          });
          throw new Error("当前账号在其他地方有登录，无法连接成功");
        }

        throw new Error("连接失败 (重试后仍超时)");
      }
    }

    // 连接成功，槽位保持占用，直到任务完成后手动释放

    // Initialize Game Data (Critical for Battle Version and Session)
    try {
      // Fetch Role Info first (Standard flow)
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
        5000,
      );

      // Fetch Battle Version
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startlevel",
        {},
        5000,
      );
      if (res?.battleData?.version) {
        tokenStore.setBattleVersion(res.battleData.version);
      }
    } catch (e) {
      // 检查是否是连接超时错误
      const isConnectionTimeout = e.message && (
        e.message.includes("WebSocket未连接")
        || e.message.includes("连接超时")
        || e.message.includes("connection timeout")
      );

      if (isConnectionTimeout) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 初始化数据失败: WebSocket未连接，跳过该账号`,
          type: "warning",
        });

        // 关闭当前连接并释放槽位
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();

        // 抛出错误让调用方跳过该账号
        throw new Error("WebSocket未连接，跳过该账号");
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${latestToken.name} 初始化数据失败: ${e.message}`,
          type: "warning",
        });
      }
    }

    return true;
  };

  /**
   * 关闭连接并释放槽位
   * @param {string} tokenId - Token ID
   * @param {string} tokenName - Token名称
   */
  const closeConnection = (tokenId, tokenName) => {
    tokenStore.closeWebSocketConnection(tokenId);
    releaseConnectionSlot();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${tokenName} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });
  };

  return {
    connectionQueue,
    waitForConnectionSlot,
    releaseConnectionSlot,
    waitForConnection,
    ensureConnection,
    closeConnection,
  };
}

/**
 * 活动状态辅助函数
 * @returns {object} - 活动状态
 */
export const getActivityStatus = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // 计算当前活动周
  const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
  const cycleDuration = 3 * weekDuration; // 三周期毫秒数

  const elapsed = now - start;
  let currentActivityWeek = null;

  if (elapsed >= 0) {
    const cyclePosition = elapsed % cycleDuration;
    if (cyclePosition < weekDuration) {
      currentActivityWeek = "黑市周";
    } else if (cyclePosition < 2 * weekDuration) {
      currentActivityWeek = "招募周";
    } else {
      currentActivityWeek = "宝箱周";
    }
  }

  return {
    // 车活动开放 (周一到周三)
    isCarActivityOpen: day >= 1 && day <= 3,
    // 梦境活动开放 (周日、周一、周三、周四)
    ismengjingActivityOpen: day === 0 || day === 1 || day === 3 || day === 4,
    // 宝库活动开放 (非周一、周二)
    isbaokuActivityOpen: day !== 1 && day !== 2,
    // 竞技场活动开放 (6点到22点)
    isarenaActivityOpen: hour >= 6 && hour < 22,
    // 当前活动周
    currentActivityWeek,
    // 怪异塔活动开放 (黑市周)
    isWeirdTowerActivityOpen: currentActivityWeek === "黑市周",
  };
};

/**
 * 日期辅助函数
 * @returns {number} - 今日开始时间戳（秒）
 */
export const getTodayStartSec = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};

/**
 * 检查今日是否可用
 * @param {number} lastTimeSec - 上次使用时间戳（秒）
 * @returns {boolean} - 今日是否可用
 */
export const isTodayAvailable = (lastTimeSec) => {
  if (!lastTimeSec || typeof lastTimeSec !== "number")
    return true;
  return lastTimeSec < getTodayStartSec();
};

/**
 * 计算月度任务进度
 * @returns {number} - 进度百分比（0-1）
 */
export const calculateMonthProgress = () => {
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();
  return Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
};

/**
 * 竞技场目标ID选择 (支持智能战力对比 + 排名过滤)
 * @param {object} targets - 目标列表
 * @param {object} playerInfo - 玩家信息 { rank, power }
 * @returns {object|null} - { targetId, targetName, targetRank, targetPower }
 */
export const pickArenaTargetId = (targets, playerInfo = {}) => {
  if (!targets)
    return null;

  // 获取所有候选目标列表
  let targetList;
  if (Array.isArray(targets)) {
    targetList = targets;
  } else {
    targetList
      = targets?.rankList
        || targets?.roleList
        || targets?.targets
        || targets?.targetList
        || targets?.list
        || [];
  }

  if (targetList.length === 0) {
    // 兜底: 如果是单个目标对象
    if (targets?.roleId || targets?.id || targets?.targetId) {
      return {
        targetId: targets.roleId || targets.id || targets.targetId,
        targetName: targets.name || targets.info?.name || "未知",
        targetRank: targets.rank || 0,
        targetPower: targets.power || targets.info?.power || 0,
      };
    }
    return null;
  }

  const myRank = playerInfo.rank || 0;
  const myPower = playerInfo.power || 0;

  // 过滤和排序策略:
  // 1. 排除排名比自己高的 (rank < myRank 表示排名更高,数字越小排名越高)
  // 2. 按战力升序排序 (优先打战力低的)
  const filteredTargets = targetList.filter((target) => {
    // 兼容不同的数据结构: 直接在对象上或在 info 嵌套对象中
    const targetRank = target.rank || target.info?.rank || 0;

    // 排除排名比自己高的对手
    if (myRank > 0 && targetRank < myRank) {
      return false; // 跳过排名更高的
    }

    return true;
  });

  if (filteredTargets.length === 0) {
    // 所有目标排名都比自己高,折中选择战力最低的进行挑战
    const sortedByPower = [...targetList].sort((a, b) => {
      const powerA = a.power || a.info?.power || 0;
      const powerB = b.power || b.info?.power || 0;
      return powerA - powerB; // 升序:战力低的在前
    });
    const fallback = sortedByPower[0];
    return {
      targetId: fallback.roleId || fallback.id || fallback.targetId || fallback.info?.roleId,
      targetName: fallback.name || fallback.info?.name || "未知",
      targetRank: fallback.rank || fallback.info?.rank || 0,
      targetPower: fallback.power || fallback.info?.power || 0,
    };
  }

  // 按战力升序排序 (优先选择战力低的对手)
  const sortedByPower = [...filteredTargets].sort((a, b) => {
    const powerA = a.power || a.info?.power || 0;
    const powerB = b.power || b.info?.power || 0;
    return powerA - powerB;
  });

  // 选择第一个目标 (战力最低的)
  const selected = sortedByPower[0];

  return {
    targetId: selected.roleId || selected.id || selected.targetId || selected.info?.roleId,
    targetName: selected.name || selected.info?.name || "未知",
    targetRank: selected.rank || selected.info?.rank || 0,
    targetPower: selected.power || selected.info?.power || 0,
  };
};
