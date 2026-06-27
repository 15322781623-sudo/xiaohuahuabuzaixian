/**
 * 爬塔类任务
 * 包含: climbTower, climbWeirdTower, batchClaimFreeEnergy
 */

/**
 * 创建爬塔类任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksTower(deps) {
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
    currentSettings,
    loadSettings,
    getModuleDelay,
  } = deps;

  // 模块延迟辅助函数
  const _getModuleDelay = getModuleDelay || ((moduleName) => {
    const md = batchSettings.moduleDelays;
    if (md) return md[moduleName] || md.default || batchSettings.taskDelay || 1000;
    return batchSettings.taskDelay || 1000;
  });

  // 默认配置
  const DEFAULT_CONFIG = {
    commandDelay: 1000,
    maxActive: 3,
    maxClimbCount: 100,
    maxRetries: 3,
    retryDelay: 2000,
    connectionTimeout: 30000,
  };

  /**
   * 安全延迟函数，支持停止信号
   */
  const safeDelay = async (ms, checkInterval = 100) => {
    const endTime = Date.now() + ms;
    while (Date.now() < endTime && !shouldStop.value) {
      await new Promise(r => setTimeout(r, Math.min(checkInterval, endTime - Date.now())));
    }
    return !shouldStop.value;
  };

  /**
   * 带重试的API调用
   * ✅ 优先使用用户配置,智能识别命令类型
   */
  const callWithRetry = async (tokenId, command, params, options = {}) => {
    // ✅ 智能识别命令类型获取超时配置
    const getTimeout = (cmd) => {
      const isBattleCommand = cmd.includes('fight') || 
                              cmd.includes('tower') || 
                              cmd.includes('evo') ||
                              cmd.includes('arena');
      
      return isBattleCommand
        ? (batchSettings.battleCommandTimeout || 15000)
        : (batchSettings.defaultCommandTimeout || 5000);
    };
    
    const { 
      timeout = getTimeout(command),  // ✅ 优先使用智能识别的配置
      retries = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2, 
      retryDelay = batchSettings.retryDelay || 1000 
    } = options;
    
    // ✅ 可重试的错误码：仅 400340、200750、11800010
    const RETRYABLE_ERRORS = ['400340', '200750', '11800010'];
    const isRetryable = (msg) => RETRYABLE_ERRORS.some(code => msg.includes(code));

    for (let i = 0; i <= retries; i++) {
      if (shouldStop.value) throw new Error('用户取消操作');
      
      try {
        const result = await tokenStore.sendMessageWithPromise(
          tokenId, command, params, timeout
        );
        return result;
      } catch (err) {
        const errorMsg = err.message || '';
        const isLastAttempt = i === retries;
        
        // ✅ 200020错误：换皮闯关未开启或状态异常，不重试
        if (errorMsg.includes('200020')) {
          if (command === 'towers_start') {
            throw new Error(`换皮闯关未开启或状态异常 (200020)`);
          }
          throw err;
        }
        
        // ✅ 7900021错误：换皮闯关不在活动时间内，不重试
        if (errorMsg.includes('7900021')) {
          throw new Error(`换皮闯关不在活动时间内 (7900021)`);
        }
        
        // ✅ 200330错误：无效的ID（通常是重复start导致），不重试
        if (errorMsg.includes('200330')) {
          if (command === 'towers_start') {
            throw new Error(`换皮闯关已开启，无需重复start (200330)`);
          }
          throw err;
        }
        
        // ✅ 400000错误：已上限，不重试
        if (errorMsg.includes('400000')) {
          throw new Error('已达次数上限 (400000)');
        }
        
        // 某些错误不需要重试
        if (err.message?.includes('1500010') || // 已通关
            err.message?.includes('1500020')) { // 能量不足
          throw err;
        }
        
        // ✅ tower_claimreward 的 -10006 错误不输出日志（当前未有宝箱触发）
        if (command === 'tower_claimreward' && err.message?.includes('-10006')) {
          throw err;
        }
        
        // ✅ 怪异塔 evotower_claimreward 的 12200030 错误：无可领取奖励，不重试
        if (command === 'evotower_claimreward' && errorMsg.includes('12200030')) {
          throw new Error('暂无可领取的宝箱奖励 (12200030)');
        }
        
        // ✅ 怪异塔 evotower_claimtask 的 12200040 错误：任务奖励已领取或不存在，不重试
        if (command === 'evotower_claimtask' && errorMsg.includes('12200040')) {
          throw new Error('任务奖励已领取或不存在 (12200040)');
        }
        
        // ✅ 怪异塔 evotower_readyfight 的错误不重试（由调用方处理）
        if (command === 'evotower_readyfight') {
          throw err;
        }
        
        // ✅ 仅对可重试错误码（400340、200750、11800010）直接抛出，交由批量重试处理
        if (isRetryable(errorMsg)) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `API ${command}: ${errorMsg.substring(0, 50)}，交由批量重试处理`,
            type: 'warning',
          });
          throw err;
        }
        
        // 非可重试错误也直接抛出
        throw err;
      }
    }
  };

  /**
   * 安全恢复阵容
   */
  const safeRestoreFormation = async (tokenId, tokenName, originalFormation) => {
    if (!originalFormation) return;
    
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 正在恢复原阵容...`,
        type: "info",
      });
      
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_saveteam",
        { teamId: originalFormation },
        5000,
      );
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 已恢复原阵容${originalFormation}`,
        type: "success",
      });
    } catch (restoreErr) {
      const errorMsg = restoreErr.message || '';
      if (errorMsg.includes('200020')) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 原阵容${originalFormation}已是当前阵容`,
          type: "info",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 恢复阵容失败: ${restoreErr.message}`,
          type: "warning",
        });
      }
    }
  };

  /**
   * 安全关闭连接
   */
  const safeCloseConnection = async (tokenId, tokenName) => {
    try {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
        type: "info",
      });
    } catch (closeErr) {
      // 忽略关闭失败
    }
  };

  /**
   * 爬塔
   */
  const climbTower = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClimbTower = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

      let originalFormation = null;
      let isSwitched = false;
      let roleInfo = null;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始爬塔: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 获取初始信息
        await callWithRetry(tokenId, "tower_getinfo", {}).catch(() => {});
        roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {});
        let energy = roleInfo?.role?.tower?.energy || 0;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 初始体力: ${energy}`,
          type: "info",
        });

        // ✅ 判断体力是否为0，无体力则跳过执行
        if (energy <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前无体力，无法爬塔，跳过执行`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 获取并保存原始阵容
        const teamInfo = await callWithRetry(tokenId, "presetteam_getinfo", {}, { retries: 2 });
        
        originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 原始阵容: ${originalFormation}`,
          type: "info",
        });

        // 切换阵容
        if (originalFormation !== tokenSettings.towerFormation) {
          await callWithRetry(tokenId, "presetteam_saveteam", { teamId: tokenSettings.towerFormation });
          isSwitched = true;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `成功切换到阵容${tokenSettings.towerFormation}`,
            type: "info",
          });
        }

        // ✅ 爬塔前尝试领取宝箱奖励
        try {
          await callWithRetry(tokenId, "tower_claimreward", {}, { retries: 1 });
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 成功领取宝箱奖励`,
            type: "success",
          });
        } catch (err) {
          // 忽略无可领取奖励的错误 (1500030)
          if (err.message?.includes("1500030")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 暂无可领取的宝箱奖励`,
              type: "info",
            });
          } 
          // 忽略-10006错误（当前未有宝箱触发）
          else if (err.message?.includes("-10006")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取宝箱奖励失败，当前无宝箱触发`,
              type: "info",
            });
          }
          // ✅ 忽略200120错误（奖励已领取/重复领奖）
          else if (err.message?.includes("200120")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 宝箱奖励已领取，无需重复领取`,
              type: "info",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取宝箱奖励失败: ${err.message?.substring(0, 50)}`,
              type: "warning",
            });
          }
        }

        let count = 0;
        let successCount = 0;
        let failCount = 0;
        let consecutiveFailures = 0;
        let serverErrorCount = 0; // ✅ 服务器错误计数
        let rateLimitCount = 0; // ✅ 200400 操作过快计数
        let rewardClaimAttempt = 0; // ✅ 1500040 领奖尝试计数
        let serverErrorBreak = false; // ✅ 400340/200750/11800010导致的中断标记
        const claimedFloors = new Set(); // ✅ 本地缓存已领奖楼层，避免重复发包
        const MAX_CLIMB = tokenSettings.maxClimbCount || DEFAULT_CONFIG.maxClimbCount;

        while (energy > 0 && count < MAX_CLIMB && !shouldStop.value) {
          try {
            const towerResult = await callWithRetry(tokenId, "fight_starttower", {}, { retries: 2 });
            
            const battleData = towerResult?.battleData;
            let isSuccess = false;
            let curHP = 0;
            
            if (battleData) {
              curHP = battleData.result?.sponsor?.ext?.curHP || 0;
              isSuccess = curHP > 0;
            }
            
            count++;
            
            if (isSuccess) {
              successCount++;
              consecutiveFailures = 0;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `✅ ${token.name} 爬塔第 ${count} 次 - 胜利`,
                type: "success",
              });
            } else {
              failCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `❌ ${token.name} 爬塔第 ${count} 次 - 失败`,
                type: "warning",
              });
            }

            await safeDelay(_getModuleDelay('tower'));

            // 每5次刷新体力
            if (count % 5 === 0) {
              try {
                roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                energy = roleInfo?.role?.tower?.energy || 0;
              } catch (e) {
                energy = Math.max(0, energy - 1);
              }
            } else {
              energy = Math.max(0, energy - 1);
            }
            
          } catch (err) {
            const errorMsg = err.message || '';
            
            // 已通关
            if (errorMsg.includes("1500010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 爬塔已全部通关`,
                type: "info",
              });
              break;
            }
            
            // Bin文件错误 - 不可恢复
            if (errorMsg.includes("200020")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} Bin文件错误，无法继续`,
                type: "error",
              });
              break;
            }
            
            // 操作过快 - 有重试上限
            if (errorMsg.includes("200400")) {
              rateLimitCount++;
              if (rateLimitCount >= 5) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 操作过快(200400)超过5次，停止爬塔`,
                  type: "error",
                });
                break;
              }
              await safeDelay(3000);
              continue;
            }
            
            // 奖励未领取
            if (errorMsg.includes("1500040")) {
              rewardClaimAttempt++;
              
              // ✅ 安全阀：领奖尝试超过3次仍失败，刷新状态后强制跳过
              if (rewardClaimAttempt > 3) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 奖励领取尝试超过3次仍被拦截，刷新状态后继续`,
                  type: "warning",
                });
                try {
                  roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                  energy = roleInfo?.role?.tower?.energy || energy;
                } catch (_) {}
                rewardClaimAttempt = 0; // 重置计数，允许后续新楼层再次尝试
                continue;
              }
              
              const towerId = roleInfo?.role?.tower?.id;
              const rewardFloor = towerId !== undefined ? Math.floor(towerId / 10) : 0;
              
              // ✅ 本地缓存检查：该楼层是否已领取过
              if (rewardFloor > 0 && claimedFloors.has(rewardFloor)) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第${rewardFloor}层奖励已领取过，跳过领奖直接继续`,
                  type: "info",
                });
                continue;
              }
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 检测到上座塔奖励未领取，尝试领取...`,
                type: "warning",
              });
              
              // ✅ 冷却延时3秒，防止高频请求被限流
              await safeDelay(3000);
              
              try {
                if (rewardFloor > 0) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取第${rewardFloor}层奖励...`,
                    type: "info",
                  });
                  
                  await tokenStore.sendGameMessage(tokenId, "tower_claimreward", { rewardId: rewardFloor }, { usePromise: true });
                  
                  // ✅ 领奖成功：立即标记已领取，并刷新 roleInfo 同步塔层状态
                  claimedFloors.add(rewardFloor);
                  rewardClaimAttempt = 0;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取奖励成功`,
                    type: "success",
                  });
                  
                  try {
                    roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                    energy = roleInfo?.role?.tower?.energy || energy;
                  } catch (_) {}
                  
                  await safeDelay(2000);
                  continue;
                } else {
                  // ✅ rewardFloor=0 无法获取塔层ID：刷新 roleInfo 同步状态，标记当前楼层避免重复
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 无法获取塔层ID，刷新状态后继续`,
                    type: "warning",
                  });
                  try {
                    roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                    energy = roleInfo?.role?.tower?.energy || energy;
                    const newTowerId = roleInfo?.role?.tower?.id;
                    if (newTowerId !== undefined) {
                      const newFloor = Math.floor(newTowerId / 10);
                      if (newFloor > 0) claimedFloors.add(newFloor);
                    }
                  } catch (_) {}
                  await safeDelay(2000);
                  continue;
                }
              } catch (claimError) {
                const claimMsg = claimError.message || "";
                
                // ✅ 200120 重复领奖：标记已领取，跳过不再重试
                if (claimMsg.includes("200120")) {
                  claimedFloors.add(rewardFloor);
                  rewardClaimAttempt = 0;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 第${rewardFloor}层奖励已被领取(200120)，跳过`,
                    type: "info",
                  });
                  try {
                    roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                    energy = roleInfo?.role?.tower?.energy || energy;
                  } catch (_) {}
                  continue;
                }
                
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 领取奖励失败: ${claimMsg.substring(0, 50)}`,
                  type: "warning",
                });
                // ✅ 其他领奖失败也刷新 roleInfo 同步状态
                try {
                  roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
                  energy = roleInfo?.role?.tower?.energy || energy;
                } catch (_) {}
              }
              
              await safeDelay(3000);
              continue;
            }
            
            // ✅ 400340/200750/11800010 服务器错误 - 停止当前账号，交由批量重试处理
            if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 服务器错误(${errorMsg.substring(0, 20)})，停止爬塔，等待批量重试`,
                type: "warning",
              });
              serverErrorBreak = true;
              break;
            }
            
            // 能量不足 - 结束
            if (errorMsg.includes("1500020")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 能量不足`,
                type: "info",
              });
              break;
            }
            
            failCount++;
            consecutiveFailures++;
            
            if (!errorMsg.includes("1500020")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `战斗出错: ${errorMsg.substring(0, 100)}`,
                type: "warning",
              });
            }
            
            // 连续失败3次，停止
            if (consecutiveFailures >= 3) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 连续失败3次，停止爬塔`,
                type: "error",
              });
              break;
            }
            
            await safeDelay(2000);
            
            // 刷新体力
            try {
              roleInfo = await callWithRetry(tokenId, "role_getroleinfo", {}, { retries: 1 });
              energy = roleInfo?.role?.tower?.energy || 0;
            } catch (e) {}
          }
        }
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `🗼 ${token.name} 爬塔完成：${count}次 (胜:${successCount}/败:${failCount})`,
          type: "info",
        });
        
        // ✅ 如果是服务器错误导致的中断，标记为failed以便批量重试
        if (serverErrorBreak) {
          tokenStatus.value[tokenId] = "failed";
        } else {
          tokenStatus.value[tokenId] = "completed";
        }
        
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 爬塔失败: ${error.message?.substring(0, 100) || "未知错误"}`,
          type: "error",
        });
      } finally {
        if (isSwitched && originalFormation) {
          await safeRestoreFormation(tokenId, token.name, originalFormation);
        }
        await safeCloseConnection(tokenId, token.name);
      }
    };

    await runStreaming(selectedTokens.value, processClimbTower);

    // 批量重试失败账号
    const retryCount_max = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < retryCount_max && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${retryCount_max}轮）`, type: "info" });
      await safeDelay(retryWaitMs);
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processClimbTower);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量爬塔结束");
  };

  /**
   * 爬怪异塔
   */
  const climbWeirdTower = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClimbWeirdTower = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

      let originalFormation = null;
      let isSwitched = false;

      const executeClimb = async () => {
        let currentEnergy = 0;
        
        try {
          await ensureConnection(tokenId);

          // 获取并保存原始阵容
          const teamInfo = await callWithRetry(tokenId, "presetteam_getinfo", {});
          originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 原始阵容: ${originalFormation}`,
            type: "info",
          });

          if (originalFormation !== tokenSettings.towerFormation) {
            await callWithRetry(tokenId, "presetteam_saveteam", { teamId: tokenSettings.towerFormation });
            isSwitched = true;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `成功切换到阵容${tokenSettings.towerFormation}`,
              type: "info",
            });
          }

          // 获取怪异塔信息
          const evotowerinfo = await callWithRetry(tokenId, "evotower_getinfo", {});
          currentEnergy = evotowerinfo?.evoTower?.energy || 0;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 初始能量: ${currentEnergy}`,
            type: "info",
          });

          // 领取宝箱奖励
          try {
            await callWithRetry(tokenId, "evotower_claimreward", {}, { retries: 1 });
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 成功领取宝箱奖励`,
              type: "success",
            });
          } catch (err) {
            const claimErrorMsg = err.message || '';
            
            // 12200030：无可领取奖励（正常情况）
            if (claimErrorMsg.includes('12200030')) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 暂无可领取的宝箱奖励`,
                type: "info",
              });
            }
            // 1500030：无可领取奖励（旧错误码）
            else if (claimErrorMsg.includes('1500030')) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 暂无可领取的宝箱奖励`,
                type: "info",
              });
            }
            // 其他错误
            else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取宝箱奖励失败: ${claimErrorMsg.substring(0, 80)}`,
                type: "warning",
              });
            }
          }

          let count = 0;
          let consecutiveFailures = 0;
          let serverErrorCount = 0; // ✅ 服务器错误计数
          let readyFailCount = 0; // ✅ 200020/7800008 准备战斗失败计数
          let rewardClaimFailCount = 0; // ✅ 1500030 领奖失败计数
          let serverErrorBreak = false; // ✅ 400340/200750/11800010导致的中断标记
          const MAX_CLIMB = tokenSettings.maxClimbCount || DEFAULT_CONFIG.maxClimbCount;

          while (currentEnergy > 0 && count < MAX_CLIMB && !shouldStop.value) {
            try {
              // 战斗前领取通关奖励（静默处理12200030错误）
              try {
                await callWithRetry(tokenId, "evotower_claimreward", {}, { retries: 1 });
              } catch (claimErr) {
                const claimErrorMsg = claimErr.message || '';
                // 12200030和1500030：无可领取奖励，静默处理
                if (!claimErrorMsg.includes('12200030') && !claimErrorMsg.includes('1500030')) {
                  // 其他错误忽略，不影响主流程
                }
              }
              
              // ✅ 准备战斗（添加错误处理）
              try {
                await callWithRetry(tokenId, "evotower_readyfight", {}, { 
                  timeout: 10000,  // ✅ 使用10秒超时（与组件保持一致）
                  retries: 1 
                });
              } catch (readyErr) {
                const readyErrorMsg = readyErr.message || '';
                
                // 1500010：已通关
                if (readyErrorMsg.includes('1500010')) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 怪异塔已全部通关`,
                    type: "info",
                  });
                  break;  // 跳出战斗循环
                }
                
                // 200020：状态异常
                if (readyErrorMsg.includes('200020')) {
                  readyFailCount++;
                  if (readyFailCount >= 3) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 怪异塔状态异常(200020)超过3次，停止爬塔`,
                      type: "error",
                    });
                    break;
                  }
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 怪异塔状态异常 (200020)，刷新后继续 (${readyFailCount}/3)`,
                    type: "warning",
                  });
                  try {
                    const refreshInfo = await callWithRetry(tokenId, "evotower_getinfo", {});
                    currentEnergy = refreshInfo?.evoTower?.energy || 0;
                  } catch (e) {}
                  await safeDelay(_getModuleDelay('tower'));
                  continue;
                }
                
                // ✅ 7800008：战斗准备失败
                if (readyErrorMsg.includes('7800008')) {
                  readyFailCount++;
                  if (readyFailCount >= 3) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 准备战斗失败(7800008)超过3次，停止爬塔`,
                      type: "error",
                    });
                    break;
                  }
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 准备战斗失败 (7800008)，刷新状态后重试 (${readyFailCount}/3)`,
                    type: "warning",
                  });
                  try {
                    const refreshInfo = await callWithRetry(tokenId, "evotower_getinfo", {});
                    currentEnergy = refreshInfo?.evoTower?.energy || 0;
                    await safeDelay(_getModuleDelay('tower'));
                  } catch (e) {}
                  continue;
                }
                
                // 其他错误：忽略，继续尝试战斗
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 准备战斗失败: ${readyErrorMsg.substring(0, 80)}`,
                  type: "warning",
                });
              }
              
              const fightResult = await callWithRetry(tokenId, "evotower_fight", { battleNum: 1, winNum: 1 });

              count++;
              consecutiveFailures = 0;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 爬怪异塔第 ${count} 次 ${fightResult?.winList?.[0] ? '✅胜利' : '❌失败'}`,
                type: fightResult?.winList?.[0] ? "success" : "warning",
              });

              await safeDelay(_getModuleDelay('tower'));

              // 获取最新信息
              const newInfo = await callWithRetry(tokenId, "evotower_getinfo", {});
              currentEnergy = newInfo?.evoTower?.energy || 0;
              
              // 检查并领取每日任务
              const taskClaimMap = newInfo?.evoTower?.taskClaimMap;
              if (taskClaimMap) {
                const now = new Date();
                const dateKey = `${now.getFullYear().toString().slice(2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
                const dailyTasks = taskClaimMap[dateKey] || {};
                
                for (const taskId of [1, 2, 3]) {
                  if (!dailyTasks[taskId]) {
                    try {
                      await callWithRetry(tokenId, "evotower_claimtask", { taskId }, { retries: 1 });
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 成功领取怪异塔每日宝箱 ${taskId} 奖励`,
                        type: "success",
                      });
                    } catch (taskErr) {
                      const taskErrorMsg = taskErr.message || '';
                      
                      // 12200040：任务奖励已领取或不存在（正常情况）
                      if (taskErrorMsg.includes('12200040')) {
                        // 静默处理，不输出日志
                      } else {
                        addLog({
                          time: new Date().toLocaleTimeString(),
                          message: `${token.name} 领取任务 ${taskId} 失败: ${taskErrorMsg.substring(0, 50)}`,
                          type: "warning",
                        });
                      }
                    }
                    await safeDelay(200);
                  }
                }
              }
              
            } catch (err) {
              const errorMsg = err.message || '';
              
              // ✅ 1500010：已通关
              if (errorMsg.includes("1500010")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 怪异塔已全部通关`,
                  type: "info",
                });
                break;
              }
              
              // ✅ 200020：Bin文件错误或状态异常
              if (errorMsg.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} Bin文件错误/状态异常 (200020)，无法继续`,
                  type: "error",
                });
                break;
              }
              
              // ✅ 200330：无效ID（可能是重复调用导致）
              if (errorMsg.includes("200330")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 无效ID错误 (200330)，刷新状态后继续`,
                  type: "warning",
                });
                // 刷新状态
                try {
                  const refreshInfo = await callWithRetry(tokenId, "evotower_getinfo", {});
                  currentEnergy = refreshInfo?.evoTower?.energy || 0;
                  consecutiveFailures = 0;  // 重置失败计数
                  continue;
                } catch (refreshErr) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新状态失败: ${refreshErr.message?.substring(0, 50)}`,
                    type: "error",
                  });
                  break;
                }
              }
              
              // ✅ 7800008：战斗失败（网络波动或服务器问题）
              if (errorMsg.includes("7800008")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 战斗错误 (7800008)，刷新状态后继续`,
                  type: "warning",
                });
                // 刷新状态
                try {
                  const refreshInfo = await callWithRetry(tokenId, "evotower_getinfo", {});
                  currentEnergy = refreshInfo?.evoTower?.energy || 0;
                  consecutiveFailures = 0;  // 重置失败计数
                  // 等待后继续
                  await safeDelay(_getModuleDelay('tower'));
                  continue;
                } catch (refreshErr) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新状态失败: ${refreshErr.message?.substring(0, 50)}`,
                    type: "error",
                  });
                  break;
                }
              }
              
              // ✅ 400340/200750/11800010 服务器错误 - 停止爬塔，交由批量重试处理
              if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 服务器错误(${errorMsg.substring(0, 20)})，停止爬塔，等待批量重试`,
                  type: "warning",
                });
                serverErrorBreak = true;
                break;
              }
              
              // ✅ 1500030：需要领取宝箱奖励
              if (errorMsg.includes("1500030")) {
                rewardClaimFailCount++;
                if (rewardClaimFailCount >= 3) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 宝箱奖励领取失败超过3次(1500030)，停止爬塔`,
                    type: "error",
                  });
                  break;
                }
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 尝试领取宝箱奖励... (${rewardClaimFailCount}/3)`,
                  type: "warning",
                });
                try {
                  await callWithRetry(tokenId, "evotower_claimreward", {}, { retries: 1 });
                  consecutiveFailures = 0;
                  rewardClaimFailCount = 0; // 领取成功，重置计数
                  await safeDelay(_getModuleDelay('tower'));
                  continue;
                } catch (claimErr) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取宝箱失败: ${claimErr.message?.substring(0, 50)}`,
                    type: "warning",
                  });
                }
              }
              
              // ✅ 1500020：能量不足（不显示错误日志）
              if (errorMsg.includes("1500020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 能量不足，停止爬塔`,
                  type: "info",
                });
                break;
              }
              
              // 其他错误
              consecutiveFailures++;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 战斗出错: ${errorMsg.substring(0, 100)}`,
                type: "warning",
              });
              
              if (consecutiveFailures >= 3) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 连续失败3次，停止爬塔`,
                  type: "error",
                });
                break;
              }
              
              await safeDelay(_getModuleDelay('tower'));
              
              try {
                const info = await callWithRetry(tokenId, "evotower_getinfo", {});
                currentEnergy = info?.evoTower?.energy || 0;
              } catch (e) {}
            }
          }
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 爬怪异塔结束，共 ${count} 次 ===`,
            type: "success",
          });
          
          // ✅ 如果是服务器错误导致的中断，标记为failed以便批量重试
          if (serverErrorBreak) {
            tokenStatus.value[tokenId] = "failed";
          } else {
            tokenStatus.value[tokenId] = "completed";
          }
          
        } catch (error) {
          throw error;
        } finally {
          if (isSwitched && originalFormation) {
            await safeRestoreFormation(tokenId, token.name, originalFormation);
          }
          await safeCloseConnection(tokenId, token.name);
        }
      };

      // 直接执行，失败由批量重试处理
      try {
        await executeClimb();
      } catch (error) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 爬怪异塔失败: ${error.message?.substring(0, 100) || "未知错误"}`,
          type: "error",
        });
      }
    };

    await runStreaming(selectedTokens.value, processClimbWeirdTower);

    // 批量重试失败账号
    const retryCount_max = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < retryCount_max && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${retryCount_max}轮）`, type: "info" });
      await safeDelay(retryWaitMs);
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processClimbWeirdTower);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量爬怪异塔结束");
  };

  /**
   * 领取怪异塔免费道具
   */
  const batchClaimFreeEnergy = async () => {
    if (selectedTokens.value.length === 0) return;
    
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimFreeEnergy = async (tokenId) => {
      if (shouldStop.value) return;
      
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 领取免费道具: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        const freeEnergyResult = await callWithRetry(tokenId, "mergebox_getinfo", { actType: 1 });
        
        await safeDelay(_getModuleDelay('tower'));
        
        const freeEnergy = freeEnergyResult?.mergeBox?.freeEnergy || 0;
        
        if (freeEnergy > 0) {
          await callWithRetry(tokenId, "mergebox_claimfreeenergy", { actType: 1 });
          await safeDelay(_getModuleDelay('tower'));
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ ${token.name} 成功领取免费道具 ${freeEnergy} 个`,
            type: "success",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 暂无免费道具可领取`,
            type: "info",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        
      } catch (error) {
        const errorMsg = error.message || '';
        
        if (errorMsg.includes('400000')) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 不在活动领取时间内`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取失败: ${errorMsg.substring(0, 100)}`,
            type: "error",
          });
        }
      } finally {
        await safeCloseConnection(tokenId, token.name);
      }
    };

    await runStreaming(selectedTokens.value, processClaimFreeEnergy);

    // 批量重试失败账号
    const retryCount_max = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < retryCount_max && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${retryCount_max}轮）`, type: "info" });
      await safeDelay(retryWaitMs);
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processClaimFreeEnergy);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取免费道具结束");
  };

  /**
  * 换皮闯关
   */
  const skinChallenge = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

      let originalFormation = null;
      let isSwitched = false;
      let actId = null;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 换皮闯关: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 获取并保存原始阵容
        const teamInfo = await callWithRetry(tokenId, "presetteam_getinfo", {});
        originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 原始阵容: ${originalFormation}`,
          type: "info",
        });

        // 切换到爬塔阵容
        if (originalFormation !== tokenSettings.towerFormation) {
          await callWithRetry(tokenId, "presetteam_saveteam", { teamId: tokenSettings.towerFormation });
          isSwitched = true;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 成功切换到阵容${tokenSettings.towerFormation}`,
            type: "info",
          });
        }

        // 先获取活动信息，从 actEGameInfo.actId 获取换皮闯关活动ID
        try {
          const activityRes = await callWithRetry(tokenId, "activity_get", {}, { retries: 1 });
          console.log(`[${token.name}] activity_get 响应:`, JSON.stringify(activityRes).substring(0, 800));
          
          // 从 actEGameInfo 获取换皮闯关活动ID
          // actEGameInfo.actId 为本周活动ID，减1即为 towers_getinfo 的 actId
          const actEGameInfo = activityRes?.activity?.actEGameInfo || activityRes?.actEGameInfo;
          if (actEGameInfo?.actId) {
            actId = Number(actEGameInfo.actId) - 1;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 换皮闯关活动已开启`,
              type: "info",
            });
            console.log(`[${token.name}] 从 actEGameInfo.actId=${actEGameInfo.actId} 推导 towers actId: ${actId}`);
          } else {
            console.log(`[${token.name}] activity_get 中未找到 actEGameInfo.actId，换皮闯关活动未开启`);
          }
        } catch (e) {
          console.log(`[${token.name}] activity_get 失败:`, e.message);
        }

        // 获取换皮闯关信息（传入 actId）
        let res;
        let activityNotOpenFlag = false;
        if (actId) {
          try {
            res = await callWithRetry(tokenId, "towers_getinfo", { actId: Number(actId) });
            console.log(`[${token.name}] towers_getinfo 响应:`, JSON.stringify(res).substring(0, 500));
          } catch (e) {
            const errMsg = e.message || '';
            // 7900021 或其他错误表示活动未开启
            if (errMsg.includes('7900021') || errMsg.includes('7900022')) {
              activityNotOpenFlag = true;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 换皮闯关活动未开启 (actId=${actId})`,
                type: "warning",
              });
            } else {
              throw e;
            }
          }
        } else {
          // actEGameInfo 不存在，活动未开启
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 换皮闯关活动未开启 (actEGameInfo 不存在)`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 如果活动未开启，标记并跳过
        if (activityNotOpenFlag || !res) {
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        let towerData = res.actId ? res : (res.towerData?.actId ? res.towerData : res);

        if (!towerData?.actId) {
          throw new Error("获取活动信息失败");
        }

        // 检查活动时间
        const resActId = String(towerData.actId);
        if (resActId.length >= 6) {
          const year = 2000 + parseInt(resActId.substring(0, 2));
          const month = parseInt(resActId.substring(2, 4)) - 1;
          const day = parseInt(resActId.substring(4, 6));
          const startDate = new Date(year, month, day);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          const now = new Date();
          
          if (now < startDate || now >= endDate) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 活动已结束`,
              type: "warning",
            });
            tokenStatus.value[tokenId] = "completed";
            return;
          }
        }

        // ✅ 使用 let 而不是 const，因为后续需要重新赋值
        let levelRewardMap = towerData.levelRewardMap || {};
        const todayWeekDay = new Date().getDay();
        
        const openTowerMap = {
          5: [1],  // Friday
          6: [2],  // Saturday
          0: [3],  // Sunday
          1: [4],  // Monday
          2: [5],  // Tuesday
          3: [6],  // Wednesday
          4: [1, 2, 3, 4, 5, 6]  // Thursday
        };
        
        const todayOpenTowers = openTowerMap[todayWeekDay] || [];

        const isTowerCleared = (type, map) => {
          const key = `${type}008`;
          return !!(map[key] || map[Number(key)]);
        };
        
        const getCurrentLevel = (type, map) => {
          for (let i = 8; i >= 1; i--) {
            const key = `${type}00${i}`;
            if (map[key] || map[Number(key)]) {
              return i === 8 ? 8 : i + 1;
            }
          }
          return 1;
        };

        const targetTowers = todayOpenTowers.filter(type => !isTowerCleared(type, levelRewardMap));

        if (targetTowers.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 今日BOSS已通关`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        for (const type of targetTowers) {
          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 挑战 BOSS ${type}`,
            type: "info",
          });

          let needStart = true;
          let loop = true;
          let failCount = 0;
          const MAX_FAIL = 5;

          while (loop && !shouldStop.value && failCount < MAX_FAIL) {
            try {
              if (needStart) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} BOSS ${type} 准备开启换皮闯关...`,
                  type: "info",
                });
                
                try {
                  await callWithRetry(tokenId, "towers_start", { towerType: type, actId: Number(actId) });
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} BOSS ${type} 开启成功`,
                    type: "success",
                  });
                } catch (startErr) {
                  const startErrorMsg = startErr.message || '';
                  
                  // 200020错误：活动未开启或不在开放时间
                  if (startErrorMsg.includes('200020')) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} BOSS ${type} 换皮闯关未开启或不在开放时间 (200020)`,
                      type: "warning",
                    });
                    loop = false;
                    break;
                  }
                  
                  // 7900021错误：不在活动时间内
                  if (startErrorMsg.includes('7900021')) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} BOSS ${type} 换皮闯关不在活动时间内 (7900021)，跳过`,
                      type: "warning",
                    });
                    loop = false;
                    break;
                  }
                  
                  // 200330错误：已经开启过了，视为成功，继续战斗
                  if (startErrorMsg.includes('200330')) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} BOSS ${type} 换皮闯关已开启，继续战斗 (200330)`,
                      type: "info",
                    });
                    // 不设置 needStart = false，因为这是第一次调用
                    // 继续执行后续的 towers_fight
                  } else {
                    // 其他错误
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} BOSS ${type} 开启失败: ${startErrorMsg.substring(0, 80)}`,
                      type: "error",
                    });
                    throw startErr;
                  }
                }
                
                await safeDelay(1500);  // ✅ 增加延迟到1.5秒，避免过快请求
              }

              const fightRes = await callWithRetry(tokenId, "towers_fight", { towerType: type, actId: Number(actId) });
              const battleData = fightRes?.battleData;
              const curHP = battleData?.result?.accept?.ext?.curHP;
              
              const currentLevel = getCurrentLevel(type, levelRewardMap);

              if (curHP === 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} BOSS ${type} 第 ${currentLevel} 层胜利`,
                  type: "success",
                });

                needStart = false;
                failCount = 0;

                // 刷新数据
                res = actId
                  ? await callWithRetry(tokenId, "towers_getinfo", { actId: Number(actId) })
                  : await callWithRetry(tokenId, "towers_getinfo", {});
                towerData = res.actId ? res : (res.towerData?.actId ? res.towerData : res);
                levelRewardMap = towerData.levelRewardMap || {};

                if (isTowerCleared(type, levelRewardMap)) {
                  loop = false;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} BOSS ${type} 全部通关`,
                    type: "success",
                  });
                } else {
                  await safeDelay(1000);
                }
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} BOSS ${type} 第 ${currentLevel} 层失败`,
                  type: "warning",
                });

                needStart = true;
                failCount++;

                if (failCount >= MAX_FAIL) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} BOSS ${type} 连续失败${MAX_FAIL}次，跳过`,
                    type: "error",
                  });
                  loop = false;
                } else {
                  await safeDelay(2000);
                }
              }
            } catch (err) {
              const errorMsg = err.message || '';
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} BOSS ${type} 战斗出错: ${errorMsg.substring(0, 80)}`,
                type: "warning",
              });
              
              needStart = true;
              failCount++;
              
              if (failCount >= MAX_FAIL) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} BOSS ${type} 连续失败${MAX_FAIL}次，跳过`,
                  type: "error",
                });
                loop = false;
              } else {
                await safeDelay(2000);
              }
            }
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 换皮闯关结束 ===`,
          type: "success",
        });

      } catch (error) {
        let errorMsg = error.message || '';
        
        // 7900021错误：不在活动时间内，标记为完成（不失败、不刷新Token）
        if (errorMsg.includes('7900021')) {
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 换皮闯关不在活动时间内，跳过`,
            type: "warning",
          });
        } else {
          tokenStatus.value[tokenId] = "failed";
          
          if (errorMsg.includes("200330")) {
            errorMsg = "存在未完成的挑战，请手动处理";
          }
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 换皮闯关失败: ${errorMsg.substring(0, 100)}`,
            type: "error",
          });
        }
      } finally {
        // ✅ 换皮闯关结束前刷新闯关状态并同步到账号卡片
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 正在刷新闯关状态...`,
            type: "info",
          });
          
          // 获取最新的闯关数据（传入 actId）
          const towerRes = actId 
            ? await callWithRetry(tokenId, "towers_getinfo", { actId: Number(actId) })
            : await callWithRetry(tokenId, "towers_getinfo", {});
          
          // 更新到 tokenStore 的 tokenGameDataMap，触发账号卡片自动刷新
          const towerData = towerRes.actId ? towerRes : (towerRes.towerData?.actId ? towerRes.towerData : towerRes);
          
          if (towerData?.actId) {
            tokenStore.updateTokenGameData(tokenId, {
              towerInfo: {
                actId: towerData.actId,
                levelRewardMap: towerData.levelRewardMap || {},
                dailyFightNum: towerData.todayUseTickCnt || 0,
                finishedCount: Object.keys(towerData.levelRewardMap || {}).filter(key => {
                  const numKey = Number(key);
                  return numKey % 1000 === 8; // 第8层标记通关
                }).length,
                isActivityValid: true,
                updatedAt: new Date().toISOString()
              }
            });
            
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 闯关状态已刷新并同步`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 闯关状态已刷新`,
              type: "success",
            });
          }
        } catch (refreshErr) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 刷新闯关状态失败: ${refreshErr.message}`,
            type: "warning",
          });
        }
        
        // 恢复原始阵容
        if (isSwitched && originalFormation !== null) {
          try {
            await callWithRetry(tokenId, "presetteam_saveteam", { teamId: originalFormation });
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已恢复原始阵容${originalFormation}`,
              type: "info",
            });
          } catch (restoreErr) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 恢复阵容失败: ${restoreErr.message}`,
              type: "warning",
            });
          }
        }
        
        await safeCloseConnection(tokenId, token.name);
      }
    });
    
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量换皮闯关结束");
  };

  /**
   * 换皮寻宝（寻宝发射 + 闯关免费礼包）
   */
  const skinTreasure = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 换皮寻宝: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 从 activity_get 动态获取寻宝活动ID和免费礼包ID
        // activity.actEGameInfo.actId = 寻宝活动ID（用于 activity_startactegame / activity_actegamestageclaim）
        // commonActivityInfo yymmdd3 = 免费礼包界面ID，拼接1 = goodsId（用于 activity_commonbuygoods）
        let treasureActId = null;
        let giftGoodsId = null;
        try {
          const activityRes = await callWithRetry(tokenId, "activity_get", {}, { retries: 1 });
          console.log(`[${token.name}] 换皮寻宝 activity_get:`, JSON.stringify(activityRes).substring(0, 800));
          
          // 从 actEGameInfo 获取寻宝活动ID
          const actEGameInfo = activityRes?.activity?.actEGameInfo || activityRes?.actEGameInfo;
          if (actEGameInfo?.actId) {
            treasureActId = Number(actEGameInfo.actId);
            console.log(`[${token.name}] 换皮寻宝 寻宝活动ID: ${treasureActId} (来自 actEGameInfo.actId)`);
          } else {
            console.log(`[${token.name}] 换皮寻宝 未找到 actEGameInfo.actId`);
          }
          
          // 从 commonActivityInfo 获取免费礼包 goodsId
          const commonActivityInfo = activityRes?.commonActivityInfo || activityRes?.activity?.commonActivityInfo || {};
          const now = new Date();
          const yy = String(now.getFullYear() % 100).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const giftKey = `${yy}${mm}${dd}3`;
          
          if (commonActivityInfo[giftKey] !== undefined) {
            giftGoodsId = Number(`${giftKey}1`);
            console.log(`[${token.name}] 换皮寻宝 免费礼包 goodsId: ${giftGoodsId} (key: ${giftKey})`);
          } else {
            console.log(`[${token.name}] 换皮寻宝 未找到今日免费礼包 key: ${giftKey}`);
          }
        } catch (e) {
          console.log(`[${token.name}] 换皮寻宝 activity_get 失败:`, e.message);
        }

        // 寻宝发射
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开始寻宝发射...`,
          type: "info",
        });

        // 先尝试领取发射次数
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 尝试领取发射次数...`,
            type: "info",
          });
          
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_actegamestageclaim",
            { actId: treasureActId },
            10000
          );
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 发射次数领取成功`,
            type: "success",
          });
          
          await safeDelay(500);
        } catch (claimErr) {
          const claimErrorMsg = claimErr.message || '';
          if (claimErrorMsg.includes('1100010')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数已领取过`, type: "info" });
          } else if (claimErrorMsg.includes('5000031')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数不足无法领取`, type: "info" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数领取失败: ${claimErrorMsg.substring(0, 80)}`, type: "warning" });
          }
        }

        let launchCount = 0;
        let hasMoreLaunches = true;
        const MAX_LAUNCHES = 50;
        
        while (hasMoreLaunches && !shouldStop.value && launchCount < MAX_LAUNCHES) {
          try {
            await callWithRetry(tokenId, "activity_startactegame", { actId: treasureActId });
            launchCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 寻宝发射成功 (第${launchCount}次)`,
              type: "success",
            });
            await safeDelay(500);
            
            // 每发射5次，尝试领取发射次数
            if (launchCount % 5 === 0) {
              try {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 尝试领取发射次数...`, type: "info" });
                await tokenStore.sendMessageWithPromise(tokenId, "activity_actegamestageclaim", { actId: treasureActId }, 10000);
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数领取成功，继续寻宝...`, type: "success" });
                await safeDelay(500);
              } catch (claimErr) {
                const claimErrorMsg = claimErr.message || '';
                if (claimErrorMsg.includes('1100010')) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数已领取过`, type: "info" });
                } else if (claimErrorMsg.includes('5000031')) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数不足无法领取`, type: "info" });
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数领取失败: ${claimErrorMsg.substring(0, 80)}`, type: "warning" });
                }
              }
            }
          } catch (actErr) {
            const actErrorMsg = actErr.message || '';
            if (actErrorMsg.includes('200020') || actErrorMsg.includes('200330') || actErrorMsg.includes('400000')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数不足，尝试领取...`, type: "info" });
              try {
                await tokenStore.sendMessageWithPromise(tokenId, "activity_actegamestageclaim", { actId: treasureActId }, 10000);
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数领取成功，继续寻宝...`, type: "success" });
                await safeDelay(500);
                continue;
              } catch (claimErr) {
                const claimErrorMsg = claimErr.message || '';
                if (claimErrorMsg.includes('1100010')) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数已领取过`, type: "info" });
                } else if (claimErrorMsg.includes('5000031')) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数不足无法领取`, type: "info" });
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 发射次数领取失败: ${claimErrorMsg.substring(0, 80)}`, type: "warning" });
                }
                hasMoreLaunches = false;
                if (launchCount === 0) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 寻宝发射次数已用完`, type: "info" });
                } else if (actErrorMsg.includes('400000')) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 寻宝发射完成，共发射${launchCount}次（已达次数上限）`, type: "success" });
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 寻宝发射完成，共发射${launchCount}次`, type: "success" });
                }
              }
            } else {
              hasMoreLaunches = false;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 寻宝发射失败: ${actErrorMsg.substring(0, 80)}`, type: "warning" });
            }
          }
        }

        await safeDelay(1000);

        // 领取闯关免费礼包
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开始领取闯关免费礼包...`,
          type: "info",
        });

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_commonbuygoods",
            { goodsId: giftGoodsId, num: 1 },
            10000
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 闯关免费礼包领取成功`, type: "success" });
        } catch (giftErr) {
          const giftErrorMsg = giftErr.message || '';
          if (giftErrorMsg.includes('1100010')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 闯关免费礼包已领取`, type: "info" });
          } else if (giftErrorMsg.includes('已领取') || giftErrorMsg.includes('超出上限')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 闯关免费礼包已领取过或已达上限`, type: "info" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 闯关免费礼包领取失败: ${giftErrorMsg.substring(0, 80)}`, type: "warning" });
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 换皮寻宝结束 ===`,
          type: "success",
        });

      } catch (error) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 换皮寻宝出错: ${error.message?.substring(0, 100)}`,
          type: "error",
        });
      } finally {
        await safeCloseConnection(tokenId, token.name);
      }
    });

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量换皮寻宝结束");
  };

  /**
   * 批量使用道具
   */
  const batchUseItems = async () => {
    if (selectedTokens.value.length === 0) return;
    
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processUseItems = async (tokenId) => {
      if (shouldStop.value) return;
      
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 使用道具: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        const infoRes = await callWithRetry(tokenId, "mergebox_getinfo", { actType: 1 });
        const towerInfoRes = await callWithRetry(tokenId, "evotower_getinfo", {});

        if (!infoRes?.mergeBox) {
          throw new Error("获取活动信息失败");
        }

        let costTotalCnt = infoRes.mergeBox.costTotalCnt || 0;
        let lotteryLeftCnt = towerInfoRes?.evoTower?.lotteryLeftCnt || 0;

        if (lotteryLeftCnt <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有剩余道具`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 剩余道具: ${lotteryLeftCnt}`,
          type: "info",
        });

        let processedCount = 0;
        const MAX_PROCESS = lotteryLeftCnt;

        while (processedCount < MAX_PROCESS && lotteryLeftCnt > 0 && !shouldStop.value) {
          let pos = { gridX: 4, gridY: 5 };
          if (costTotalCnt >= 2) pos = { gridX: 7, gridY: 3 };
          if (costTotalCnt >= 102) pos = { gridX: 6, gridY: 3 };

          await callWithRetry(tokenId, "mergebox_openbox", { actType: 1, pos });

          costTotalCnt++;
          lotteryLeftCnt--;
          processedCount++;

          await safeDelay(_getModuleDelay('tower'));
        }

        // 领取累计奖励
        try {
          await callWithRetry(tokenId, "mergebox_claimcostprogress", { actType: 1 });
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取累计奖励`,
            type: "info",
          });
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ ${token.name} 使用道具 ${processedCount} 次`,
          type: "success",
        });

      } catch (error) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 使用道具失败: ${error.message?.substring(0, 100)}`,
          type: "error",
        });
      } finally {
        await safeCloseConnection(tokenId, token.name);
      }
    };

    await runStreaming(selectedTokens.value, processUseItems);

    // 批量重试失败账号
    const retryCount_max = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < retryCount_max && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${retryCount_max}轮）`, type: "info" });
      await safeDelay(retryWaitMs);
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processUseItems);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }
    
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量使用道具结束");
  };

  /**
   * 批量合成
   */
  const batchMergeItems = async () => {
    if (selectedTokens.value.length === 0) return;
    
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processMergeItems = async (tokenId) => {
      if (shouldStop.value) return;
      
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 一键合成: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let loopCount = 0;
        const MAX_LOOPS = 20;

        const rewardMapping = {
          2: "短裙手套", 3: "拽拽菜篮", 4: "狂野菜板",
          5: "大胃锅", 6: "幽影茶壶", 7: "愤怒面包机",
          8: "惊讶榨汁机", 9: "动感电饭锅", 10: "迅捷烤炉",
          11: "至尊打蛋机", 12: "完美烤炉"
        };

        while (loopCount < MAX_LOOPS && !shouldStop.value) {
          loopCount++;

          const infoRes = await callWithRetry(tokenId, "mergebox_getinfo", { actType: 1 });

          if (!infoRes?.mergeBox) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 获取信息失败`,
              type: "warning",
            });
            break;
          }

          // 领取合成奖励
          const taskMap = infoRes.mergeBox.taskMap || {};
          const taskClaimMap = infoRes.mergeBox.taskClaimMap || {};

          for (const taskId in taskMap) {
            if (shouldStop.value) break;
            if (taskMap[taskId] !== 0 && !taskClaimMap[taskId]) {
              await callWithRetry(tokenId, "mergebox_claimmergeprogress", { actType: 1, taskId: parseInt(taskId) }, { retries: 1 }).catch(() => {});
              
              const lastTwo = parseInt(String(taskId).slice(-2));
              const taskName = rewardMapping[lastTwo] || `任务${taskId}`;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取合成奖励: ${taskName}`,
                type: "success",
              });
              await safeDelay(_getModuleDelay('tower'));
            }
          }

          // 收集可合成物品
          const gridMap = infoRes.mergeBox.gridMap || {};
          const items = [];

          for (const xStr in gridMap) {
            for (const yStr in gridMap[xStr]) {
              const item = gridMap[xStr][yStr];
              if (item.gridConfId === 0 && item.gridItemId > 0 && !item.isLock) {
                items.push({
                  x: parseInt(xStr),
                  y: parseInt(yStr),
                  id: item.gridItemId
                });
              }
            }
          }

          // 分组
          const groupedItems = {};
          items.forEach(item => {
            if (!groupedItems[item.id]) groupedItems[item.id] = [];
            groupedItems[item.id].push(item);
          });

          const hasMergeable = Object.values(groupedItems).some(group => group.length >= 2);
          
          if (!hasMergeable) {
            if (loopCount === 1) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 无可用合成物品`,
                type: "info",
              });
            }
            break;
          }

          // 检查是否达到8级
          const isLevel8OrAbove = infoRes.mergeBox.taskMap?.["251212208"] > 0;

          if (isLevel8OrAbove) {
            await callWithRetry(tokenId, "mergebox_automergeitem", { actType: 1 });
            await safeDelay(_getModuleDelay('tower'));
          } else {
            for (const id in groupedItems) {
              if (shouldStop.value) break;
              const group = groupedItems[id];
              
              while (group.length >= 2 && !shouldStop.value) {
                const source = group.shift();
                const target = group.shift();

                await callWithRetry(tokenId, "mergebox_mergeitem", {
                  actType: 1,
                  sourcePos: { gridX: source.x, gridY: source.y },
                  targetPos: { gridX: target.x, gridY: target.y }
                }, { retries: 1 }).catch(() => {});
                
                await safeDelay(300);
              }
            }
          }
          
          await safeDelay(_getModuleDelay('tower'));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ ${token.name} 一键合成完成`,
          type: "success",
        });

      } catch (error) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 合成失败: ${error.message?.substring(0, 100)}`,
          type: "error",
        });
      } finally {
        await safeCloseConnection(tokenId, token.name);
      }
    };

    await runStreaming(selectedTokens.value, processMergeItems);

    // 批量重试失败账号
    const retryCount_max = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < retryCount_max && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${retryCount_max}轮）`, type: "info" });
      await safeDelay(retryWaitMs);
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processMergeItems);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }
    
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量一键合成结束");
  };

  return {
    climbTower,
    climbWeirdTower,
    batchClaimFreeEnergy,
    skinChallenge,
    skinTreasure,
    batchUseItems,
    batchMergeItems,
  };
}