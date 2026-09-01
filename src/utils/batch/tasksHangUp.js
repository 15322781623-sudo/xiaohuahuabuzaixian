/**
 * 挂机、答题、签到类任务
 * 包含: claimHangUpRewards, batchAddHangUpTime, batchStudy, batchclubsign, batchWarGuessCheer
 */

import { getModuleDelayCompat } from "@/utils/batch/delayManager";

/**
 * 创建挂机、答题、签到类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksHangUp(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    runStreaming,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
    getModuleDelay,
  } = deps;

  // 使用集中式延迟管理器（兼容新旧API）
  const _getModuleDelay = (moduleName) => {
    if (getModuleDelay) return getModuleDelay(moduleName);
    return getModuleDelayCompat(moduleName, batchSettings);
  };

  /**
   * 安全延迟函数，支持停止信号
   * @param {number} ms 等待毫秒数
   * @param {number} checkInterval 检查间隔
   * @returns {Promise<boolean>} true=正常结束，false=被停止
   */
  const safeDelay = async (ms, checkInterval = 100) => {
    const endTime = Date.now() + ms;
    while (Date.now() < endTime && !shouldStop.value) {
      await new Promise((r) => setTimeout(r, Math.min(checkInterval, endTime - Date.now())));
    }
    return !shouldStop.value;
  };

  /**
   * 获取挂机状态
   * @param {string} tokenId Token ID
   * @param {object} options 配置选项
   * @param {boolean} options.checkAddTime 是否检查是否需要加钟（默认false）
   * @param {number} options.thresholdSeconds 加钟阈值（秒），默认3600秒（1小时）
   * @param {number} options.maxHangUpTime 最大挂机时间（秒），默认43200秒（12小时）
   * @returns {object} 挂机状态信息
   */
  const getHangUpStatus = async (tokenId, options = {}) => {
    const { checkAddTime = false, thresholdSeconds = 3600, maxHangUpTime = 43200 } = options;

    try {
      // 获取角色信息
      const roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, {
        noRetryErrors: ["400000", "200020", "3100080", "3100030", "400340"], // 400340由外层重试机制处理
      });
      const hangUpData = roleInfo?.role?.hangUp;
      const hangUpInfo = roleInfo?.role?.hangUpInfo;

      if (!hangUpData) {
        return {
          hasData: false,
          message: "无挂机数据",
          needAddTime: false,
          addTimeMessage: "",
        };
      }

      const now = Date.now() / 1000;
      const lastTime = hangUpData.lastTime || 0;
      const hangUpTime = hangUpData.hangUpTime || 0;
      const totalTime = hangUpInfo?.totalTime || 0;
      const elapsed = now - lastTime;

      // 计算状态
      const isActive = elapsed <= hangUpTime;
      const remainingTime = isActive ? Math.floor(hangUpTime - elapsed) : 0;
      const elapsedTime = isActive ? Math.floor(elapsed) : Math.floor(hangUpTime);
      const progress = hangUpTime > 0 ? Math.min(100, Math.floor((elapsedTime / hangUpTime) * 100)) : 0;

      return {
        hasData: true,
        isActive,
        lastTime,
        hangUpTime,
        totalTime,
        elapsedTime,
        remainingTime,
        progress,
        needAddTime: false,
        addTimeMessage: "",
        message: isActive ? `挂机中：${formatTime(elapsedTime)}/${formatTime(hangUpTime)}（总${formatTime(totalTime)}）` : `挂机已完成（总${formatTime(totalTime)}）`,
      };
    } catch (error) {
      // ✅ 400340/200750/11800010 必须向上抛出，由外层 batchWithRetry 重试机制处理
      const errMsg = error.message || '';
      if (errMsg.includes('400340') || errMsg.includes('200750') || errMsg.includes('11800010')) {
        throw error;
      }
      return {
        hasData: false,
        message: `获取失败: ${error.message}`,
        needAddTime: false,
        addTimeMessage: "",
      };
    }
  };

  /**
   * 格式化时间（秒转为可读格式）
   */
  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0)
      return "0秒";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hours > 0)
      parts.push(`${hours}小时`);
    if (minutes > 0)
      parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0)
      parts.push(`${secs}秒`);
    return parts.join("");
  };

  /**
   * 带重试的 API 调用(支持指数退避和错误分类)
   * @param {string} tokenId
   * @param {string} command
   * @param {object} params
   * @param {object} options
   * @param {number} options.timeout 超时时间(毫秒),默认10000
   * @param {number} options.retries 重试次数,默认2
   * @param {number} options.retryDelay 初始重试延迟(毫秒),默认3000
   * @param {boolean} options.exponentialBackoff 是否使用指数退避,默认true
   * @param {string[]} options.noRetryErrors 不重试的错误码列表
   * @returns {Promise<any>}
   */
  const callWithRetry = async (tokenId, command, params, options = {}) => {
    // ✅ 智能识别命令类型获取超时配置
    const getTimeout = (cmd) => {
      const isBattleCommand = cmd.includes("fight")
        || cmd.includes("tower")
        || cmd.includes("evo")
        || cmd.includes("arena");

      return isBattleCommand
        ? (batchSettings.battleCommandTimeout || 15000)
        : (batchSettings.defaultCommandTimeout || 5000);
    };

    const {
      timeout = getTimeout(command), // ✅ 优先使用智能识别的配置
      retries = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2,
      retryDelay = batchSettings.retryDelay || 60000,
      exponentialBackoff = true,
      noRetryErrors = ["400000", "200020", "3100080", "3100030"], // 3100030=加钟次数上限
    } = options;

    // ✅ 可重试错误码：仅 400340、200750、11800010
    const RETRYABLE_CODES = ["400340", "200750", "11800010"];
    const isRetryableError = (msg) => RETRYABLE_CODES.some(code => msg.includes(code));

    let lastError;

    for (let i = 0; i <= retries; i++) {
      if (shouldStop.value)
        throw new Error("用户取消操作");

      try {
        const result = await tokenStore.sendMessageWithPromise(tokenId, command, params, timeout);
        return result;
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || "";

        // ✅ 400340/200750/11800010 由外层批量重试机制处理，直接抛出
        if (isRetryableError(errorMessage)) {
          addLog({ time: new Date().toLocaleTimeString(), message: `API ${command}: ${errorMessage.substring(0, 30)}，交由批量重试`, type: "warning" });
          throw err;
        }

        // ✅ 非可重试错误码，直接抛出
        throw err;
      }
    }

    throw lastError;
  };

  /**
   * 安全关闭连接
   */
  const safeCloseConnection = async (tokenId, tokenName) => {
    try {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
    } catch (err) {
      // 忽略关闭失败
    }
  };

  /**
   * 通用批量重试助手
   * @param {string[]} tokenIds - Token ID列表
   * @param {string} operationName - 操作名称（用于日志）
   * @param {Function} operation - async (tokenId, token) => void 操作函数
   */
  const batchWithRetry = async (tokenIds, operationName, operation) => {
    const MAX_RETRIES = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2;
    // ✅ 请求超时的账号同样加入重试队列（与收车模块一致），避免超时直接跳过
    const RETRYABLE_CODES = ["400340", "200750", "11800010", "200020", "2000150", "请求超时"];
    const isRetryableError = (msg) => RETRYABLE_CODES.some(code => msg?.includes(code));
    const getMatchedCode = (msg) => RETRYABLE_CODES.find(code => msg?.includes(code)) || '';

    const retryTokens = [];
    const maxConcurrent = batchSettings.maxActive || 5;

    // 按并发数分批执行：每批 maxActive 个账号并发，等本批全部完成后再执行下一批
    const executeBatch = async (batchTokenIds, batchLabel) => {
      if (batchTokenIds.length === 0 || shouldStop.value) return;
      addLog({ time: new Date().toLocaleTimeString(), message: `📦 ${batchLabel} 开始执行 ${batchTokenIds.length} 个账号...`, type: "info" });

      await Promise.all(batchTokenIds.map(async (tokenId) => {
        if (shouldStop.value) return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);
        let conn = false;
        try {
          await ensureConnection(tokenId);
          conn = true;
          await operation(tokenId, token);
          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          const errMsg = error.message || '';
          if (isRetryableError(errMsg)) {
            const code = getMatchedCode(errMsg);
            addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ ${token.name} 遇到${code}错误，加入重试队列`, type: "warning" });
            retryTokens.push({ tokenId, tokenName: token.name });
            tokenStatus.value[tokenId] = "retry";
          } else {
            tokenStatus.value[tokenId] = "failed";
            addLog({ time: new Date().toLocaleTimeString(), message: `❌ ${token.name} ${operationName}失败: ${errMsg}`, type: "error" });
          }
        } finally {
          if (conn) await safeCloseConnection(tokenId, token.name);
        }
      }));
    };

    // 分批执行首次任务
    const totalBatches = Math.ceil(tokenIds.length / maxConcurrent);
    for (let i = 0; i < tokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = tokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      await executeBatch(batch, `批次 ${batchNum}/${totalBatches}`);
    }

    // 重试循环
    let currentRetryTokens = retryTokens;
    for (let retryCount = 1; retryCount <= MAX_RETRIES && currentRetryTokens.length > 0 && !shouldStop.value; retryCount++) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏱️ 等待${(batchSettings.retryDelay || 60000) / 1000}秒后重试 ${currentRetryTokens.length} 个账号（第${retryCount}/${MAX_RETRIES}次）...`, type: "info" });
      await safeDelay(batchSettings.retryDelay || 60000);
      if (shouldStop.value) { addLog({ time: new Date().toLocaleTimeString(), message: `已停止，取消重试`, type: "warning" }); break; }

      const nextRetryTokens = [];
      // 分批并发重试
      const retryIds = currentRetryTokens.map(t => t.tokenId);
      const retryBatches = Math.ceil(retryIds.length / maxConcurrent);
      for (let i = 0; i < retryIds.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = retryIds.slice(i, i + maxConcurrent);
        const batchNum = Math.floor(i / maxConcurrent) + 1;
        addLog({ time: new Date().toLocaleTimeString(), message: `📦 重试批次 ${batchNum}/${retryBatches} (${batch.length}个账号)...`, type: "info" });

        await Promise.all(batch.map(async (tokenId) => {
          if (shouldStop.value) return;
          const tokenInfo = currentRetryTokens.find(t => t.tokenId === tokenId);
          if (!tokenInfo) return;
          const { tokenName } = tokenInfo;
          
          tokenStatus.value[tokenId] = "running";
          const token = tokens.value.find((t) => t.id === tokenId);
          let conn = false;
          try {
            await ensureConnection(tokenId);
            conn = true;
            await operation(tokenId, token, true);
            tokenStatus.value[tokenId] = "completed";
            addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 第${retryCount}次重试成功`, type: "success" });
          } catch (err) {
            const errMsg = err.message || "";
            if (isRetryableError(errMsg) && retryCount < MAX_RETRIES) {
              nextRetryTokens.push({ tokenId, tokenName: token.name });
              tokenStatus.value[tokenId] = "retry";
            } else {
              tokenStatus.value[tokenId] = "failed";
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${retryCount >= MAX_RETRIES ? `重试${MAX_RETRIES}次后仍然失败` : "重试失败"}: ${errMsg}`, type: "error" });
            }
          } finally {
            if (conn) await safeCloseConnection(tokenId, token.name);
          }
        }));
      }
      currentRetryTokens = nextRetryTokens;
    }

    // 标记最终失败
    currentRetryTokens.forEach(({ tokenId }) => {
      if (tokenStatus.value[tokenId] === "retry") tokenStatus.value[tokenId] = "failed";
    });
  };

  /**
   * 执行加钟（指定次数，带状态验证）
   * @param {string} tokenId Token ID
   * @param {string} tokenName Token 名称
   * @param {number} addCount 加钟次数
   * @returns {Promise<boolean>} 是否成功完成
   */
  const performAddTimeWithCount = async (tokenId, tokenName, addCount) => {
    if (addCount === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 无需加钟`,
        type: "info",
      });
      return true;
    }

    let successCount = 0;

    // 2. 执行加钟
    for (let i = 0; i < addCount; i++) {
      if (shouldStop.value) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 用户停止加钟 (成功 ${successCount}/${addCount})`,
          type: "warning",
        });
        return successCount > 0;
      }

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 加钟 ${i + 1}/${addCount}`,
          type: "info",
        });

        // 发送加钟命令（使用设置的重试配置）
        await callWithRetry(tokenId, "system_mysharecallback", { isSkipShareCard: true, type: 2 }, {
          retries: batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2,
          retryDelay: batchSettings.retryDelay || 60000,
          exponentialBackoff: false,
          noRetryErrors: ["400000", "200020", "3100030", "400340"], // 400340由外层重试机制处理
        });

        successCount++;

        // 间隔1秒，避免连续请求被服务端拒绝
        if (i < addCount - 1) {
          await safeDelay(1000);
        }
      } catch (error) {
        const errorMsg = error.message || "";

        // ✅ 检测200020错误（战斗未结算），等待1秒后重试一次
        if (errorMsg.includes("200020")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 加钟 ${i + 1}/${addCount} 服务器处理中(200020)，等待1秒后重试...`,
            type: "warning",
          });
          await safeDelay(1000);
          try {
            await callWithRetry(tokenId, "system_mysharecallback", { isSkipShareCard: true, type: 2 }, {
              retries: 0,
              noRetryErrors: ["400000", "200020", "3100030", "400340"],
            });
            successCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 加钟 ${i + 1}/${addCount} 重试成功`,
              type: "success",
            });
            // 间隔1秒，避免连续请求被服务端拒绝
            if (i < addCount - 1) {
              await safeDelay(1000);
            }
            continue;
          } catch (retryError) {
            const retryErrMsg = retryError.message || "";
            // 重试遇到3100030（次数上限），立即停止
            if (retryErrMsg.includes("3100030")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 加钟 ${i + 1}/${addCount} 失败: 已达每日加钟次数上限`,
                type: "warning",
              });
              break;
            }
            // 重试遇到400340/200750/11800010，抛出让外层重试
            if (retryErrMsg.includes("400340") || retryErrMsg.includes("200750") || retryErrMsg.includes("11800010")) {
              const code = retryErrMsg.includes("400340") ? "400340" : retryErrMsg.includes("200750") ? "200750" : "11800010";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 加钟 ${i + 1}/${addCount} 重试失败: ${code}错误，等待外层重试`,
                type: "warning",
              });
              throw retryError;
            }
            // 重试仍返回200020或其他错误，记录失败后继续下一次加钟
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 加钟 ${i + 1}/${addCount} 重试仍失败: ${retryErrMsg.substring(0, 50)}`,
              type: "error",
            });
            if (i === addCount - 1) {
              return successCount > 0;
            }
          }
        }

        // 检测加钟次数上限错误
        if (errorMsg.includes("3100030")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 加钟 ${i + 1}/${addCount} 失败: 已达每日加钟次数上限`,
            type: "warning",
          });
          break;
        }

        // ✅ 检测可重试错误码（400340/200750/11800010），重新抛出让外层重试机制处理
        if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010")) {
          const code = errorMsg.includes("400340") ? "400340" : errorMsg.includes("200750") ? "200750" : "11800010";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 加钟 ${i + 1}/${addCount} 失败: ${code}错误，等待外层重试`,
            type: "warning",
          });
          throw error; // 重新抛出，让外层catch捕获并加入重试队列
        }

        // 其他错误
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 加钟 ${i + 1}/${addCount} 失败: ${errorMsg.substring(0, 50)}`,
          type: "error",
        });

        if (i === addCount - 1) {
          return successCount > 0;
        }
      }
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${tokenName} 加钟完成: 成功 ${successCount}/${addCount} 次`,
      type: successCount === addCount ? "success" : "warning",
    });

    return successCount === addCount;
  };

  /**
   * 执行加钟（4次，带状态验证）- 兼容旧接口
   * @param {string} tokenId Token ID
   * @param {string} tokenName Token 名称
   * @returns {Promise<boolean>} 是否成功完成
   */
  const performAddTime = async (tokenId, tokenName) => {
    return performAddTimeWithCount(tokenId, tokenName, 4);
  };

  /**
   * 领取挂机奖励 + 加钟（支持400340/200750/11800010错误最多3次重试）
   * 逻辑：判断elapsedTime>=配置阈值 → 领取奖励 → 加钟4次
   */
  // 加钟判断阈值：8小时（28800秒），总挂机时间(hangUpTime)超过此值则无需加钟
  const ADD_TIME_THRESHOLD = 8 * 3600;

  const claimHangUpRewards = async () => {
    if (selectedTokens.value.length === 0) return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const claimAndAddTime = async (tokenId, token, isRetry = false) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始领取挂机: ${token.name} ===`, type: "info" });

        // 1. 领取挂机奖励（无条件执行，支持200020重试）
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 开始领取挂机奖励...`, type: "info" });

        // system_claimhangupreward 先领取挂机收益（body: {}）
        try {
          await callWithRetry(tokenId, "system_claimhangupreward", {});
        } catch (e) {
          if (e.message?.includes("200020")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取挂机奖励服务器处理中(200020)，等待1秒后重试...`, type: "warning" });
            await safeDelay(1000);
            await callWithRetry(tokenId, "system_claimhangupreward", {}, { retries: 0 });
          } else {
            throw e;
          }
        }
        await safeDelay(200);

        // system_mysharecallback 分享回调
        try {
          await callWithRetry(tokenId, "system_mysharecallback", {});
        } catch (e) {
          if (e.message?.includes("200020")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取挂机服务器处理中(200020)，等待1秒后重试...`, type: "warning" });
            await safeDelay(1000);
            await callWithRetry(tokenId, "system_mysharecallback", {}, { retries: 0 });
          } else {
            throw e;
          }
        }
        await safeDelay(200);

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取成功`, type: "success" });

        // 2. 重试时跳过挂机时长判断，直接加钟
        if (isRetry) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 重试账号，直接执行加钟...`, type: "info" });
          await performAddTime(tokenId, token.name);
        } else {
          // 领取后重新获取挂机状态，用更新后的 hangUpTime 判断是否加钟
          await safeDelay(500);
          const afterClaimStatus = await getHangUpStatus(tokenId);

          if (!afterClaimStatus.hasData) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取挂机状态失败，跳过加钟判断`, type: "warning" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取后当前挂机时长: ${formatTime(afterClaimStatus.hangUpTime)}`, type: "info" });

            if (afterClaimStatus.hangUpTime >= ADD_TIME_THRESHOLD) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前挂机时长已超过8小时，无需加钟，跳过`, type: "info" });
            } else {
              // 3. 当前挂机时长不足8小时，加钟4次
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前挂机时长不足8小时，开始加钟...`, type: "info" });
              await performAddTime(tokenId, token.name);
            }
          }
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 领取挂机完成`, type: "success" });
      };

      await batchWithRetry(selectedTokens.value, "领取挂机", claimAndAddTime);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量领取挂机结束");
    }
  };

  /**
   * 一键加钟（固定4次，支持400340/200750/11800010错误最多3次重试）
   */
  const batchAddHangUpTime = async () => {
    if (selectedTokens.value.length === 0) return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const addTimeOp = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 一键加钟: ${token.name} ===`, type: "info" });
        await performAddTimeWithCount(tokenId, token.name, 4);
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 加钟完成`, type: "success" });
      };

      await batchWithRetry(selectedTokens.value, "加钟", addTimeOp);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量加钟结束");
    }
  };

  /**
   * 一键答题（使用题库）
   */
  const batchStudy = async () => {
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      // 预加载题库
      const { preloadQuestions, getQuestionCount } = await import("@/utils/studyQuestionsFromJSON.js");
      addLog({ time: new Date().toLocaleTimeString(), message: `📚 加载题库...`, type: "info" });
      await preloadQuestions();
      const questionCount = await getQuestionCount();
      addLog({ time: new Date().toLocaleTimeString(), message: `✅ 题库加载完成，共 ${questionCount} 题`, type: "success" });

      // 记录需要批量重试的账号（200350错误）
      const retryTokens = [];

      // 单个账号答题函数（可重试）
      const studyForToken = async (tokenId, tokenName, isRetry = false) => {
        let conn = false;
        try {
          await ensureConnection(tokenId);
          conn = true;

          // 获取角色信息，检查本周是否已完成
          const roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, {
            noRetryErrors: ["400000", "200020", "3100080", "3100030", "400340"], // 400340由外层重试机制处理
          });
          const studyData = roleInfo?.body?.role?.study || roleInfo?.body?.study || roleInfo?.role?.study || roleInfo?.study;
          const maxCorrectNum = studyData?.maxCorrectNum ?? 0;
          const beginTime = studyData?.beginTime ?? 0;
          const { isInCurrentWeek } = await import("@/utils/base.ts");
          const isCompleted = maxCorrectNum >= 10 && isInCurrentWeek(beginTime * 1000);
          if (isCompleted) {
            addLog({ time: new Date().toLocaleTimeString(), message: `🟢 ${tokenName} 已跳过（本周答题已完成：${maxCorrectNum}/10）`, type: "info" });
            tokenStatus.value[tokenId] = "completed";
            return true;
          }

          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 当前正确数: ${maxCorrectNum}/10，开始答题...`, type: "info" });

          // 发送开始答题命令
          await callWithRetry(tokenId, "study_startgame", {}, { retryDelay: 3000 });
          await safeDelay(2000); // 等待服务器初始化

          // 轮询等待答题完成
          let maxWait = 120; // 120秒
          let completed = false;
          let lastAnswered = 0;

          while (maxWait > 0 && !shouldStop.value && !completed) {
            const gameData = tokenStore.getTokenGameData(tokenId);
            const status = gameData?.studyStatus;
            if (status) {
              const answered = status.answeredCount || 0;
              if (answered !== lastAnswered) {
                lastAnswered = answered;
                addLog({ time: new Date().toLocaleTimeString(), message: `📝 ${tokenName} 答题进度：${answered}/${status.questionCount || 10}`, type: "info" });
              }
              // ✅ 检查答题完成状态
              // 必须同时满足：status === "completed" 且 (answeredCount >= 10 或 maxCorrectNum >= 10)
              if (status.status === "completed") {
                const maxCorrectNum = status.maxCorrectNum || 0;
                if (answered >= 10 || maxCorrectNum >= 10) {
                  completed = true;
                  addLog({ time: new Date().toLocaleTimeString(), message: `🎉 ${tokenName} 答题完成，奖励已领取`, type: "success" });
                  break;
                } else {
                  // ⚠️ 答题未完成，继续轮询等待真正的完成状态
                  // 不要立即返回，因为 WebSocket 推送可能有延迟
                  addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ ${tokenName} 答题进度异常（${answered}/10，正确：${maxCorrectNum}/10），继续等待...`, type: "warning" });
                  // 继续轮询，不 break，让循环继续
                }
              }
              if (status.status === "failed_need_retry") {
                const maxCorrectNum = status.maxCorrectNum || 0;
                // 如果服务器记录的正确数已经 >= 10，认为完成
                if (maxCorrectNum >= 10) {
                  completed = true;
                  addLog({ time: new Date().toLocaleTimeString(), message: `🎉 ${tokenName} 答题完成（服务器验证：${maxCorrectNum}/10）`, type: "success" });
                  break;
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ ${tokenName} 答题未完成（正确：${maxCorrectNum}/10），需要重试`, type: "warning" });
                  return false;
                }
              }
            }
            await safeDelay(1000);
            maxWait--;
          }

          if (completed) {
            tokenStatus.value[tokenId] = "completed";
            return true;
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `❌ ${tokenName} 答题超时`, type: "error" });
            return false;
          }
        } catch (error) {
          const errMsg = error.message || "";
          if (errMsg.includes("3100080")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `🟢 ${tokenName} 已跳过（答题次数已用完或未开启）`, type: "info" });
            tokenStatus.value[tokenId] = "completed";
            return true;
          }
          if (errMsg.includes("200350")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 遇到200350错误，稍后批量重试`, type: "warning" });
            return false;
          }
          throw error;
        } finally {
          if (conn)
            await safeCloseConnection(tokenId, tokenName);
        }
      };

      // 首次执行所有账号
      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value)
          return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);
        try {
          const success = await studyForToken(tokenId, token.name, false);
          if (!success && !shouldStop.value) {
            retryTokens.push({ tokenId, name: token.name });
            tokenStatus.value[tokenId] = "waiting_retry";
          }
        } catch (err) {
          tokenStatus.value[tokenId] = "failed";
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 答题失败：${err.message}`, type: "error" });
        }
      });

      // 批量重试200350错误的账号（最多2轮）
      let currentRetry = 0;
      const MAX_RETRY_ROUNDS = batchSettings.defaultRetryCount || 2;
      while (retryTokens.length > 0 && currentRetry < MAX_RETRY_ROUNDS && !shouldStop.value) {
        currentRetry++;
        addLog({ time: new Date().toLocaleTimeString(), message: `\n=== 第 ${currentRetry} 轮重试 (${retryTokens.length} 个账号) ===`, type: "info" });
        await safeDelay(batchSettings.retryDelay || 60000); // 等待重试

        const failedThisRound = [];
        for (const { tokenId, name } of retryTokens) {
          if (shouldStop.value)
            break;
          tokenStatus.value[tokenId] = "running";
          try {
            const success = await studyForToken(tokenId, name, true);
            if (!success) {
              failedThisRound.push({ tokenId, name });
              tokenStatus.value[tokenId] = "waiting_retry";
            } else {
              tokenStatus.value[tokenId] = "completed";
            }
          } catch (err) {
            failedThisRound.push({ tokenId, name });
            tokenStatus.value[tokenId] = "failed";
            addLog({ time: new Date().toLocaleTimeString(), message: `${name} 重试答题失败: ${err.message}`, type: "error" });
          }
          // 账号间间隔
          await safeDelay(_getModuleDelay('hangup'));
        }
        retryTokens.length = 0;
        retryTokens.push(...failedThisRound);
      }

      // 最终统计
      const finalFailed = retryTokens.length;
      if (finalFailed > 0) {
        addLog({ time: new Date().toLocaleTimeString(), message: `\n仍有 ${finalFailed} 个账号答题失败`, type: "error" });
        retryTokens.forEach(({ name }) => addLog({ time: new Date().toLocaleTimeString(), message: `  - ${name}`, type: "error" }));
      }
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量答题结束");
    }
  };

  /**
   * 一键答题奖励领取（不做任何判断，直接领取1-10档全部奖励）
   */
  const batchStudyClaimReward = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const claimForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 答题奖励领取: ${token.name} ===`, type: "info" });
        let claimedCount = 0;
        for (let rewardId = 1; rewardId <= 10; rewardId++) {
          if (shouldStop.value)
            break;
          try {
            await callWithRetry(tokenId, "study_claimreward", { rewardId });
            claimedCount++;
          } catch (e) {
            const errMsg = e.message || '';
            // 400340/200750/11800010 交由外层批量重试机制处理
            if (errMsg.includes('400340') || errMsg.includes('200750') || errMsg.includes('11800010')) {
              throw e;
            }
            // 其余错误（已领取/未达标等）静默跳过，继续下一档
          }
          await safeDelay(200);
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 答题奖励领取完成（成功 ${claimedCount}/10 档）`, type: "success" });
      };

      await batchWithRetry(selectedTokens.value, "答题奖励领取", claimForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量答题奖励领取结束");
    }
  };

  /**
   * 一键挂机升级（循环发送 system_hangupupgrade 直到报错停止）
   */
  const batchHangUpUpgrade = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const upgradeForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始挂机升级: ${token.name} ===`, type: "info" });
        let upgradeCount = 0;
        while (!shouldStop.value) {
          try {
            await callWithRetry(tokenId, "system_hangupupgrade", { upgradeNum: 1 });
            upgradeCount++;
            if (upgradeCount % 10 === 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 已升级 ${upgradeCount} 次...`, type: "info" });
            }
            await safeDelay(_getModuleDelay('hangup'));
          } catch (e) {
            const errMsg = e.message || '';
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 挂机升级停止 (已升级 ${upgradeCount} 次): ${errMsg}`, type: "warning" });
            break;
          }
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 挂机升级完毕，共升级 ${upgradeCount} 次`, type: "success" });
      };

      await batchWithRetry(selectedTokens.value, "挂机升级", upgradeForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量挂机升级结束");
    }
  };

  /**
   * 一键俱乐部签到
   */
  const batchclubsign = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const clubSignForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 俱乐部签到: ${token.name} ===`, type: "info" });
        await callWithRetry(tokenId, "legion_signin", {});
        await safeDelay(_getModuleDelay('hangup'));
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 签到成功`, type: "success" });
      };

      await batchWithRetry(selectedTokens.value, "俱乐部签到", clubSignForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量俱乐部签到结束");
    }
  };

  /**
   * 盐场报名
   */
  const batchLegionSignup = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;
  
      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });
  
      const signupForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 盐场报名：${token.name} ===`, type: "info" });
        try {
          await callWithRetry(tokenId, "legion_signup", {});
          await safeDelay(_getModuleDelay('hangup'));
          addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 盐场报名成功`, type: "success" });
        } catch (e) {
          if (e.message && e.message.includes('2300280')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 已报名，无需重复报名`, type: "info" });
          } else if (e.message && e.message.includes('2300290')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 当前盐场报名已报名或不在报名时间内`, type: "info" });
          } else {
            throw e;
          }
        }
      };
  
      await batchWithRetry(selectedTokens.value, "盐场报名", signupForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量盐场报名结束");
    }
  };
  
  // ✅ 批量营地报名（club_signup）
  const batchClubSignup = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;
  
      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });
  
      const signupForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 营地报名：${token.name} ===`, type: "info" });
        try {
          await callWithRetry(tokenId, "club_signup", {});
          await safeDelay(_getModuleDelay('hangup'));
          addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 营地报名成功`, type: "success" });
        } catch (e) {
          if (e.message && e.message.includes('2300280')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 已报名，无需重复报名`, type: "info" });
          } else {
            throw e;
          }
        }
      };
  
      await batchWithRetry(selectedTokens.value, "营地报名", signupForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量营地报名结束");
    }
  };

  /**
   * 蟠桃报名（提交铃铛 + 报名）
   */
  const batchPayloadSignup = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const payloadSignupForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 蟠桃报名：${token.name} ===`, type: "info" });
          
        // ✅ 新增：任务级预连接，确保定时任务执行时连接可靠
        try {
          await ensureConnection(tokenId, 3, true); // 重试 3 次、跳过槽位检查
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 预连接失败：${e.message?.substring(0, 50) || e}，尝试继续执行`, type: "warning" });
        }
          
        // 1. 提交铃铛（即使失败也继续报名）
        try {
          await callWithRetry(tokenId, "legion_buypayloaditem", { num: 60 });
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 提交铃铛成功`, type: "success" });
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 提交铃铛失败：${e.message?.substring(0, 50) || e}，继续报名`, type: "warning" });
        }
          
        await safeDelay(_getModuleDelay('hangup'));
          
        // 2. 蟠桃报名（即使提交铃铛失败也执行）
        try {
          await callWithRetry(tokenId, "legion_payloadsignup", {});
          addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 蟠桃报名成功`, type: "success" });
        } catch (e) {
          if (e.message && e.message.includes('2300280')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `️ ${token.name} 已报名，无需重复报名`, type: "info" });
          } else {
            throw e;
          }
        }
      };

      await batchWithRetry(selectedTokens.value, "蟠桃报名", payloadSignupForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量蟠桃报名结束");
    }
  };

  /**
   * 月赛助威
   * @param {number} legionId - 俱乐部ID
   * @param {number} guessCoin - 竞猜币数量
   */
  const batchWarGuessCheer = async (legionId, guessCoin) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }
    if (!legionId) {
      message.warning("请选择要助威的俱乐部");
      return;
    }

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const cheerForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 助威: ${token.name} ===`, type: "info" });

        // 尝试领取拍手器（可选，失败不影响）
        try {
          await callWithRetry(tokenId, "warguess_getguesscoinreward", {}, { retries: 0 });
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取拍手器成功`, type: "success" });
        } catch (e) { /* 忽略 */ }

        // 获取当前助威次数
        const rankRes = await callWithRetry(tokenId, "warguess_getrank", { bfId: "" });
        let totalGuessNum = 0;
        if (rankRes?.list) {
          const list = Array.isArray(rankRes.list) ? rankRes.list : Object.values(rankRes.list);
          totalGuessNum = list.reduce((sum, item) => sum + (item.guessNum || 0), 0);
        }

        if (totalGuessNum >= 20) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 助威次数已满 (${totalGuessNum}/20)`, type: "warning" });
          return;
        }

        let coinToUse = Number(guessCoin);
        const remaining = 20 - totalGuessNum;
        if (coinToUse > remaining) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 剩余次数不足，调整为 ${remaining} 次`, type: "info" });
          coinToUse = remaining;
        }
        if (coinToUse <= 0) {
          return;
        }

        const result = await callWithRetry(tokenId, "warguess_startguess", { guessCoin: coinToUse, legionId });
        if (result?.guessLegion) {
          addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 助威成功 (当前次数: ${result.guessLegion.guessNum}/20)`, type: "success" });
        } else {
          throw new Error("助威返回结果异常");
        }
      };

      await batchWithRetry(selectedTokens.value, "助威", cheerForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量助威结束");
    }
  };

  /**
   * 批量营地空投挑战（club_attackmonster）
   * 使用当前角色上阵阵容攻击营地空投怪物，每个账号每天最多挑战 3 次
   * （总挑战次数上限 10 次，仅作为循环保护，防止服务器异常导致死循环）
   */
  const batchAirdropChallenge = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const AIRDROP_MAX_TIMES = 3; // 每账号每日空投挑战上限
      const TOTAL_MAX_TIMES = 10; // 挑战总次数上限（循环保护）

      const challengeForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 营地空投挑战：${token.name} ===`, type: "info" });
        try {
          // 1. 获取营地信息（读取当前期次已挑战次数）
          let alreadyAttacked = 0;
          try {
            const clubInfo = await callWithRetry(tokenId, "club_getinfo", {}, {
              noRetryErrors: ["400000", "200020", "3100080", "3100030", "400340"],
            });
            const siege = clubInfo?.siege || clubInfo?.body?.siege || {};
            const attackMap = siege?.attackMap || {};
            // 取最近的期次（键为 yymmdd 数字字符串），用其 attackCnt 作为已挑战次数
            const periods = Object.keys(attackMap).sort().reverse();
            alreadyAttacked = periods.length > 0 ? (attackMap[periods[0]]?.attackCnt || 0) : 0;
          } catch {
            // 获取营地信息失败不阻塞，仍尝试直接挑战
          }

          const remaining = Math.max(0, AIRDROP_MAX_TIMES - alreadyAttacked);
          if (remaining <= 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 今日空投挑战次数已用完（${alreadyAttacked}/${AIRDROP_MAX_TIMES}），跳过`, type: "info" });
            return;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `📊 ${token.name} 今日空投已挑战 ${alreadyAttacked}/${AIRDROP_MAX_TIMES} 次，继续挑战 ${remaining} 次`, type: "info" });

          await safeDelay(_getModuleDelay('hangup'));

          // 2. 获取角色信息（宠物 UId）
          const roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, {
            noRetryErrors: ["400000", "200020", "3100080", "3100030", "400340"],
          });
          const role = roleInfo?.role || roleInfo || {};
          const petUId = role?.pet?.petUId || role?.petUId || "";

          await safeDelay(_getModuleDelay('hangup'));

          // 3. 获取预设队伍（阵容 + 武器）
          const presetTeamRes = await callWithRetry(tokenId, "presetteam_getinfo", {});
          const presetInfo
            = presetTeamRes?.presetTeamInfo?.presetTeamInfo
              || presetTeamRes?.presetTeamInfo
              || presetTeamRes?.presetTeamMap
              || {};
          // 优先使用批量设置中的竞技阵容，未配置时回退到队伍1；若该队伍无阵容则取第一个有阵容的队伍
          const preferFormation = batchSettings.arenaFormation || 1;
          let teamData = presetInfo[String(preferFormation)] || presetInfo[preferFormation] || {};
          if (!teamData?.teamInfo || Object.keys(teamData.teamInfo).length === 0) {
            const firstValid = Object.entries(presetInfo).find(([, t]) => t?.teamInfo && Object.keys(t.teamInfo).length > 0);
            if (firstValid) teamData = firstValid[1];
          }

          const lordWeaponId = teamData?.weapon?.weaponId || 0;
          const battleTeam = {};
          for (const [slot, hero] of Object.entries(teamData?.teamInfo || {})) {
            if (hero?.heroId !== undefined && hero?.heroId !== null) {
              battleTeam[slot] = hero.heroId;
            }
          }

          if (Object.keys(battleTeam).length === 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ ${token.name} 未获取到有效上阵阵容，跳过挑战`, type: "warning" });
            return;
          }

          // 4. 循环发起营地空投挑战，直到空投次数用满或服务器返回次数已用完
          let successCnt = 0;
          for (let i = 0; i < TOTAL_MAX_TIMES; i++) {
            if (shouldStop.value) {
              addLog({ time: new Date().toLocaleTimeString(), message: `🛑 ${token.name} 已手动停止，剩余挑战中断`, type: "warning" });
              break;
            }
            if (successCnt + alreadyAttacked >= AIRDROP_MAX_TIMES) break;

            await safeDelay(_getModuleDelay('hangup'));
            let resp;
            try {
              resp = await callWithRetry(tokenId, "club_attackmonster", {
                useItem: false,
                teamSetParams: { lordWeaponId, petUId, battleTeam },
              }, { timeout: (batchSettings.battleCommandTimeout || 15000) });
            } catch (e) {
              const errMsg = e.message || "";
              // 2600040=挑战次数已用完
              if (errMsg.includes('2600040')) {
                addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 今日营地空投挑战次数已用完`, type: "info" });
                break;
              }
              // 2300280=活动未开放或未开启
              if (errMsg.includes('2300280')) {
                addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 营地空投挑战未开放或暂不可挑战`, type: "info" });
                break;
              }
              throw e;
            }

            const body = resp?.body || resp || {};
            const addScore = body?.addScore ?? resp?.addScore ?? 0;
            const isWin = body?.battleData?.result?.isWin ?? resp?.battleData?.result?.isWin;
            const winText = isWin === undefined ? "" : (isWin ? "胜利" : "失败");
            successCnt++;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ ${token.name} 第 ${successCnt + alreadyAttacked}/${AIRDROP_MAX_TIMES} 次空投挑战完成${winText}${addScore ? `（+${addScore}分）` : ""}`,
              type: "success",
            });
          }

          if (successCnt > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `🎉 ${token.name} 本轮共完成 ${successCnt} 次营地空投挑战`, type: "success" });
          }
        } catch (e) {
          const errMsg = e.message || "";
          if (errMsg.includes('2600040')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 今日营地空投挑战次数已用完`, type: "info" });
          } else if (errMsg.includes('2300280')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 营地空投挑战未开放或暂不可挑战`, type: "info" });
          } else {
            throw e;
          }
        }
      };

      await batchWithRetry(selectedTokens.value, "营地空投挑战", challengeForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量营地空投挑战结束");
    }
  };

  /**
   * 批量营地奖励领取（club_taskclaim）
   * 依次领取营地任务奖励：1=挑战3次奖励、2=区域1全通关奖励、3=区域2通关奖励、4=区域3通关奖励
   * 已领取或未达条件时记录提示并继续下一个
   */
  const batchAirdropClaim = async () => {
    if (selectedTokens.value.length === 0)
      return;
    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const CLAIM_CONF = [
        { id: 1, name: "挑战3次奖励" },
        { id: 2, name: "区域1全通关奖励" },
        { id: 3, name: "区域2通关奖励" },
        { id: 4, name: "区域3通关奖励" },
      ];

      const claimForToken = async (tokenId, token) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 营地奖励领取：${token.name} ===`, type: "info" });
        try {
          // 1. 获取营地信息（读取已领取的任务，taskClaimedMap 中存在的跳过）
          let claimedSet = new Set();
          try {
            const clubInfo = await callWithRetry(tokenId, "club_getinfo", {}, {
              noRetryErrors: ["400000", "200020", "3100080", "3100030", "400340"],
            });
            const siege = clubInfo?.siege || clubInfo?.body?.siege || {};
            const claimedMap = siege?.taskClaimedMap || {};
            claimedSet = new Set(Object.keys(claimedMap).map((k) => Number(k)));
          } catch {
            // 读取失败不阻塞，直接逐个尝试领取
          }

          // 2. 依次领取各档位奖励
          let claimCnt = 0;
          for (const conf of CLAIM_CONF) {
            if (shouldStop.value) {
              addLog({ time: new Date().toLocaleTimeString(), message: `🛑 ${token.name} 已手动停止，剩余奖励中断领取`, type: "warning" });
              break;
            }
            if (claimedSet.has(conf.id)) {
              addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} ${conf.name}已领取，跳过`, type: "info" });
              continue;
            }

            await safeDelay(_getModuleDelay('hangup'));
            try {
              await callWithRetry(tokenId, "club_taskclaim", { confId: conf.id }, {
                timeout: (batchSettings.defaultCommandTimeout || 10000),
              });
              claimCnt++;
              addLog({ time: new Date().toLocaleTimeString(), message: `✅ ${token.name} 领取营地奖励成功：${conf.name}`, type: "success" });
            } catch (e) {
              const errMsg = e.message || "";
              // 13000160=奖励未达标；其余为已领取/未开放等业务提示（不中断整体流程），未识别错误抛出
              if (errMsg.includes('13000160')) {
                addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} ${conf.name}：奖励未达标`, type: "info" });
              } else if (/2600040|2600080|2600060|2300280/.test(errMsg)) {
                addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} ${conf.name}：${errMsg}`, type: "info" });
              } else {
                throw e;
              }
            }
          }

          if (claimCnt > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `🎉 ${token.name} 本轮共领取 ${claimCnt} 项营地奖励`, type: "success" });
          }
        } catch (e) {
          const errMsg = e.message || "";
          if (errMsg.includes('2300280')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `ℹ️ ${token.name} 营地任务奖励未开放或暂不可领取`, type: "info" });
          } else {
            throw e;
          }
        }
      };

      await batchWithRetry(selectedTokens.value, "营地奖励领取", claimForToken);
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
      message.success("批量营地奖励领取结束");
    }
  };

  return {
    claimHangUpRewards,
    batchAddHangUpTime,
    batchStudy,
    batchStudyClaimReward,
    batchclubsign,
    batchLegionSignup,
    batchClubSignup,
    batchAirdropChallenge,
    batchAirdropClaim,
    batchPayloadSignup,
    batchWarGuessCheer,
    batchHangUpUpgrade,
  };
}
