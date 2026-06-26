/**
 * 竞技场、补齐类任务
 * 包含: batcharenafight, batchTopUpFish, batchTopUpArena
 */

import { ARENA_TARGET, FISH_TARGET } from "./constants.js";

/**
 * 格式化战力值为大数字格式 (例如: 11128873547 -> 111.29亿)
 * @param {number} power - 战力值
 * @returns {string} - 格式化后的字符串
 */
const formatPower = (power) => {
  if (!power || power === 0)
    return "0";

  const num = Number(power);

  if (num >= 100000000) { // 亿
    return `${(num / 100000000).toFixed(2)}亿`;
  } else if (num >= 10000) { // 万
    return `${(num / 10000).toFixed(2)}万`;
  }

  return num.toString();
};

/**
 * 创建竞技场、补齐类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksArena(deps) {
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
    pickArenaTargetId,
    getTodayStartSec,
    isTodayAvailable,
    calculateMonthProgress,
    delayConfig,
    getModuleDelay,
    loadSettings,
  } = deps;

  // 模块延迟辅助函数
  const _getModuleDelay = getModuleDelay || ((moduleName) => {
    return delayConfig?.action || 1500;
  });

  /**
   * 执行单次竞技场战斗
   */
  const executeArenaFight = async (tokenId, tokenName, playerInfo, delayConfig) => {
    // ✅ 使用用户配置
    const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
    const battleTimeout = batchSettings.battleCommandTimeout || 8000;

    // 开启竞技场
    await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, commandTimeout);

    // 获取目标
    const targets = await tokenStore.sendMessageWithPromise(
      tokenId,
      "arena_getareatarget",
      {},
      commandTimeout,
    );

    if (!targets) {
      return { success: false, error: "目标数据为空", errorCode: null };
    }

    // 智能选择目标
    const targetResult = pickArenaTargetId(targets, playerInfo);
    if (!targetResult || !targetResult.targetId) {
      return { success: false, error: "未找到可用目标", errorCode: null };
    }

    // 执行战斗
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startareaarena",
      { targetId: targetResult.targetId },
      battleTimeout,
    );

    await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));

    return { success: true, error: null, errorCode: null };
  };

  /**
   * 获取玩家竞技场信息
   */
  const getPlayerArenaInfo = async (tokenId) => {
    const roleInfo = tokenStore.gameData?.roleInfo?.role || {};
    let playerRank = 0;

    try {
      const arenaRankData = await tokenStore.sendMessageWithPromise(
        tokenId,
        "arena_getarearank",
        { rankType: 0, minRank: 1, maxRank: 100 },
        10000,
      );

      const myRoleId = roleInfo.roleId;
      const rankList = arenaRankData?.rankList || arenaRankData?.roleList || arenaRankData?.list || [];
      const myRankData = rankList.find((item) =>
        item.roleId === myRoleId
        || item.info?.roleId === myRoleId,
      );

      if (myRankData) {
        playerRank = myRankData.rank || myRankData.info?.rank || 0;
      }
    } catch (err) {
      console.warn("[竞技场] 获取排名失败:", err.message);
    }

    return {
      rank: playerRank,
      power: roleInfo.power || roleInfo.fightPower || 0,
    };
  };

  /**
   * 重试竞技场战斗（通用逻辑）
   */
  const retryArenaFight = async (retryInfo, retryCount, maxRetries, errorTypes, waitTime) => {
    const { tokenId, tokenName, fightIndex, totalFights, originalFormation, isSwitched, tokenSettings } = retryInfo;
    const token = tokens.value.find((t) => t.id === tokenId);

    // 将错误类型字符串转换为数组
    const errorTypeArray = errorTypes.split("|");

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 重试 ${tokenName} (第${retryCount + 1}轮) ===`,
        type: "info",
      });

      tokenStatus.value[tokenId] = "retrying";
      await ensureConnection(tokenId);

      // 检查门票
      let role = tokenStore.gameData?.roleInfo?.role;
      if (!role) {
        try {
          const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
          role = roleInfo?.role;
        } catch {}
      }
      const currentTickets = role?.items?.[1007]?.quantity || 0;

      if (currentTickets <= 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokenName} 咸神门票不足，跳过重试`,
          type: "warning",
        });
        return { success: false, reason: "门票不足" };
      }

      // 切换阵容（如果需要）
      if (isSwitched && originalFormation !== tokenSettings.arenaFormation) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_saveteam",
            { teamId: tokenSettings.arenaFormation },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 成功切换到阵容${tokenSettings.arenaFormation}`,
            type: "info",
          });
        } catch (err) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 切换阵容失败: ${err.message}`,
            type: "warning",
          });
        }
      }

      // 执行剩余战斗
      const remainingFights = totalFights - fightIndex + 1;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 从第 ${fightIndex} 次战斗继续，剩余 ${remainingFights} 次`,
        type: "info",
      });

      let hasError = false;
      const playerInfo = await getPlayerArenaInfo(tokenId);

      for (let i = fightIndex - 1; i < totalFights; i++) {
        if (shouldStop.value)
          break;

        try {
          const result = await executeArenaFight(tokenId, tokenName, playerInfo, delayConfig);

          if (result.success) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试竞技场战斗 ${i + 1}/${totalFights}`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试战斗${i + 1} - ${result.error}`,
              type: "warning",
            });
            hasError = true;
            break;
          }
        } catch (e) {
          const errorMsg = e.message || "未知错误";

          // 检查是否是任何目标错误类型
          const isTargetError = errorTypeArray.some((type) => errorMsg.includes(type));

          if (isTargetError) {
            hasError = true;
            const matchedType = errorTypeArray.find((type) => errorMsg.includes(type));
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试战斗${i + 1} - 再次出现${matchedType}错误`,
              type: "warning",
            });
            break;
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试战斗${i + 1} - 出现其他错误: ${errorMsg}`,
              type: "error",
            });
            hasError = true;
            break;
          }
        }
      }

      // 恢复原阵容
      if (isSwitched && originalFormation) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_saveteam",
            { teamId: originalFormation },
            3000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 已恢复原阵容${originalFormation}`,
            type: "success",
          });
        } catch (restoreErr) {
          const restoreErrorMsg = restoreErr.message || "";
          if (!restoreErrorMsg.includes("200020")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 恢复阵容失败: ${restoreErr.message}`,
              type: "warning",
            });
          }
        }
      }

      return { success: !hasError, reason: hasError ? errorType : "success" };
    } catch (error) {
      console.error("重试失败:", error);
      return { success: false, reason: error.message };
    } finally {
      try {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      } catch (closeErr) {
        // ignore
      }
    }
  };

  /**
   * 处理批量重试逻辑
   */
  const handleBatchRetry = async (retryTokens, maxRetries, errorType, waitTime, errorLabel) => {
    if (retryTokens.length === 0)
      return;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 发现 ${retryTokens.length} 个账号出现${errorLabel}错误，等待${waitTime / 1000}秒后开始重试 ===`,
      type: "info",
    });

    await new Promise((resolve) => setTimeout(resolve, waitTime));

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      if (shouldStop.value || retryTokens.length === 0)
        break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n--- 第 ${retryCount + 1} 轮重试 (${retryTokens.length} 个账号) ---`,
        type: "info",
      });

      const failedTokens = [];

      for (const retryInfo of retryTokens) {
        if (shouldStop.value)
          break;

        const result = await retryArenaFight(retryInfo, retryCount, maxRetries, errorType, waitTime);

        if (!result.success) {
          failedTokens.push(retryInfo);
          tokenStatus.value[retryInfo.tokenId] = result.reason === "门票不足" ? "completed" : "waiting_retry";
        } else {
          tokenStatus.value[retryInfo.tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${retryInfo.tokenName} 重试成功 ===`,
            type: "success",
          });
        }
      }

      retryTokens.length = 0;
      retryTokens.push(...failedTokens);

      if (failedTokens.length > 0 && retryCount < maxRetries - 1) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${failedTokens.length} 个账号重试失败，等待${waitTime / 1000}秒后进行下一轮重试`,
          type: "warning",
        });
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // 最终统计
    const successCount = selectedTokens.value.length - retryTokens.length;
    const failedCount = retryTokens.length;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== ${errorLabel}错误重试完成 ===`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `重试成功: ${successCount} 个`,
      type: "success",
    });
    if (failedCount > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `重试失败: ${failedCount} 个 (重试${maxRetries}次后仍出现${errorLabel}错误)`,
        type: "error",
      });
      const failedNames = retryTokens.map((t) => t.tokenName).join(", ");
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `失败账号: ${failedNames}`,
        type: "error",
      });
    }
  };

  /**
   * 一键竞技场战斗3次
   */
  const batcharenafight = async () => {
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      const retry400340Tokens = [];
      const retry200750Tokens = [];
      const retry11800010Tokens = []; // 11800010未知错误重试
      const retryTargetTokens = []; // 获取目标超时或未找到目标的账号
      const maxRetries = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2; // 使用设置的重试次数
      const retryWaitTime = batchSettings.retryDelay || 60000; // 使用设置的重试延迟

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      // 按并发数量分批执行
      const batchSize = batchSettings.maxActive || 10;
      const batches = [];

      for (let i = 0; i < selectedTokens.value.length; i += batchSize) {
        batches.push(selectedTokens.value.slice(i, i + batchSize));
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始批量竞技场战斗，共 ${selectedTokens.value.length} 个账号，分 ${batches.length} 批执行（每批${batchSize}个） ===`,
        type: "info",
      });

      // 逐批执行
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        if (batchIndex > 0) {
        // 使用配置的批次间隔等待时间
          const batchWaitTime = batchSettings.batchIntervalWait || 0;
          if (batchWaitTime > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `\n=== 等待${batchWaitTime}秒后执行第 ${batchIndex + 1}/${batches.length} 批 ===`,
              type: "info",
            });
            await new Promise((r) => setTimeout(r, batchWaitTime * 1000));
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `\n=== 执行第 ${batchIndex + 1}/${batches.length} 批 (${batch.length} 个账号) ===`,
            type: "info",
          });
        }

        const taskPromises = batch.map(async (tokenId) => {
          if (shouldStop.value)
            return;
          tokenStatus.value[tokenId] = "running";
          const token = tokens.value.find((t) => t.id === tokenId);
          // 加载该Token的独立配置，如果未找到则回退到currentSettings(虽然可能不准确，但作为最后的兜底)
          const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

          // 在try块外部声明变量，确保finally块可以访问
          let originalFormation = null; // 保存原始阵容
          let currentFormation = null; // 当前阵容
          let isSwitched = false; // 是否切换过阵容

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 开始一键竞技场战斗: ${token.name} ===`,
              type: "info",
            });
            await ensureConnection(tokenId);
            if (shouldStop.value)
              return;

            // 检查咸神门票 (ID: 1007)
            let role = tokenStore.gameData?.roleInfo?.role;
            if (!role) {
              try {
                const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
                role = roleInfo?.role;
              } catch {}
            }
            const ticketCount = role?.items?.[1007]?.quantity || 0;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前咸神门票: ${ticketCount}`,
              type: "info",
            });

            if (ticketCount <= 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 咸神门票不足，无法进行竞技场战斗`,
                type: "warning",
              });
              tokenStatus.value[tokenId] = "completed";
              return;
            }

            const teamInfo = await tokenStore.sendMessageWithPromise(
              tokenId,
              "presetteam_getinfo",
              {},
              8000,
            );
            if (!teamInfo || !teamInfo.presetTeamInfo) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `阵容信息异常: ${JSON.stringify(teamInfo)}`,
                type: "warning",
              });
            }

            originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
            currentFormation = originalFormation;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 原始阵容: ${originalFormation}`,
              type: "info",
            });

            if (originalFormation === tokenSettings.arenaFormation) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `当前已是阵容${tokenSettings.arenaFormation}，无需切换`,
                type: "info",
              });
            } else {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "presetteam_saveteam",
                { teamId: tokenSettings.arenaFormation },
                5000,
              );
              isSwitched = true;
              currentFormation = tokenSettings.arenaFormation;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `成功切换到阵容${tokenSettings.arenaFormation}`,
                type: "info",
              });
            }

            const fights = Math.min(3, ticketCount);
            if (fights < 3) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 咸神门票仅剩 ${ticketCount} 张，将执行 ${fights} 次战斗`,
                type: "warning",
              });
            }

            // 获取 battleVersion（战斗必需，否则服务器返回"版本过低"）
            if (!tokenStore.getBattleVersion()) {
              try {
                const levelResult = await tokenStore.sendMessageWithPromise(
                  tokenId, "fight_startlevel", {}, 5000
                );
                if (levelResult?.battleData?.version) {
                  tokenStore.setBattleVersion(levelResult.battleData.version);
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 获取 battleVersion: ${levelResult.battleData.version}`,
                    type: "info",
                  });
                }
              } catch (err) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 获取 battleVersion 失败: ${err.message}`,
                  type: "warning",
                });
              }
            }

            for (let i = 0; i < fights; i++) {
              if (shouldStop.value)
                break;

              // 开启竞技场,并获取返回数据
              let arenaStartResult;
              try {
                // ✅ 使用用户配置
                const battleTimeout = batchSettings.battleCommandTimeout || 8000;
                arenaStartResult = await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, battleTimeout);
                console.log("[竞技场] arena_startarea 返回:", JSON.stringify(arenaStartResult));
              } catch (err) {
                const errorMsg = err.message || "";
                // ✅ 200020错误表示关卡未达标
                if (errorMsg.includes("200020")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 当前账号关卡未达标，无法开启竞技场`,
                    type: "warning",
                  });
                  break;
                }

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 开启竞技场失败: ${err.message}`,
                  type: "error",
                });
                break;
              }
              let targets;
              let hasGetTargetError = false;
              let getTargetErrorMsg = "";
              try {
                targets = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "arena_getareatarget",
                  {},
                  5000,
                );
              } catch (err) {
                getTargetErrorMsg = err.message || "";
                hasGetTargetError = true;
                // 400340错误通常是网络超时，但竞技场可能已经成功开启
                if (getTargetErrorMsg.includes("400340")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 获取竞技场目标超时(400340)，但竞技场可能已开启，尝试继续战斗`,
                    type: "warning",
                  });
                  // 记录到重试列表，添加重连机制
                  retryTargetTokens.push({
                    tokenId,
                    tokenName: token.name,
                    fightIndex: i + 1,
                    totalFights: fights,
                    originalFormation,
                    isSwitched,
                    tokenSettings,
                    ticketCount,
                    errorType: "400340",
                  });
                  // 不中断流程，继续执行
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 获取竞技场目标失败: ${err.message}`,
                    type: "error",
                  });
                  break;
                }
              }

              // 检查服务器返回数据是否为空
              if (!targets) {
                if (hasGetTargetError && getTargetErrorMsg.includes("400340")) {
                  // 400340错误，但竞技场可能已开启，尝试使用默认目标
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 尝试继续执行战斗（目标数据获取超时）`,
                    type: "warning",
                  });
                  // 继续使用流程，让后续的目标选择函数处理
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场目标数据为空，可能竞技场还未开放或今日次数已刷新完`,
                    type: "warning",
                  });
                  break;
                }
              }

              // 检查目标列表是否为空
              const targetList = targets?.rankList || targets?.roleList || targets?.targets || targets?.targetList || targets?.list || [];
              if (targetList.length === 0 && !targets?.roleId && !targets?.id && !targets?.targetId && !(hasGetTargetError && getTargetErrorMsg.includes("400340"))) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 无可用的竞技场目标，可能竞技场还未开放或今日次数已刷新完`,
                  type: "warning",
                });
                break;
              }

              // 获取玩家自身信息
              const roleInfo = tokenStore.gameData?.roleInfo?.role || {};

              // 尝试获取竞技场排名
              let playerRank = 0;
              try {
                // 使用正确的参数调用 arena_getarearank
                const arenaRankData = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "arena_getarearank",
                  {
                    rankType: 0, // 排名类型
                    minRank: 1, // 最小排名
                    maxRank: 100, // 最大排名 (获取前100名）
                  },
                  10000,
                );

                console.log("[竞技场] arena_getarearank 返回:", JSON.stringify(arenaRankData));

                // 从返回数据中查找自己的 roleId
                const myRoleId = roleInfo.roleId;
                const rankList = arenaRankData?.rankList || arenaRankData?.roleList || arenaRankData?.list || [];

                // 在列表中查找自己的排名
                const myRankData = rankList.find((item) =>
                  item.roleId === myRoleId
                  || item.info?.roleId === myRoleId,
                );

                if (myRankData) {
                  playerRank = myRankData.rank || myRankData.info?.rank || 0;
                  if (playerRank > 0) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 当前竞技场排名: ${playerRank}`,
                      type: "info",
                    });
                  }
                }
              } catch (err) {
                // 获取排名失败不影响后续流程
                console.warn("[竞技场] 获取排名失败:", err.message);
              }

              const playerInfo = {
                rank: playerRank,
                power: roleInfo.power || roleInfo.fightPower || 0,
              };

              // 智能选择目标
              const targetResult = pickArenaTargetId(targets, playerInfo);
              if (!targetResult || !targetResult.targetId) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 未找到可用的竞技场目标`,
                  type: "error",
                });
                // 记录到重试列表
                retryTargetTokens.push({
                  tokenId,
                  tokenName: token.name,
                  fightIndex: i + 1,
                  totalFights: fights,
                  originalFormation,
                  isSwitched,
                  tokenSettings,
                  ticketCount,
                  errorType: "no_target",
                });
                break;
              }

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 选择目标: ${targetResult.targetName} (排名:${targetResult.targetRank}, 战力:${formatPower(targetResult.targetPower)})`,
                type: "info",
              });

              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "fight_startareaarena",
                  { targetId: targetResult.targetId },
                );
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 竞技场战斗 ${i + 1}/3`,
                  type: "info",
                });
                await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
              } catch (e) {
                const errorMsg = e.message || "未知错误";

                // 检查是否是400340错误
                if (errorMsg.includes("400340")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场对决失败: 服务器错误: 400340 - 未知错误 (已记录，等待批量重试)`,
                    type: "warning",
                  });
                  // 记录需要重试的账号
                  retry400340Tokens.push({
                    tokenId,
                    tokenName: token.name,
                    fightIndex: i + 1,
                    totalFights: fights,
                    originalFormation,
                    isSwitched,
                    tokenSettings,
                    ticketCount,
                  });
                  // 标记为等待重试
                  tokenStatus.value[tokenId] = "waiting_retry";
                  break; // 跳出战斗循环
                }
                // 检查是否是200750错误
                else if (errorMsg.includes("200750")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场对决失败: 服务器错误: 200750 - 未知错误 (已记录，等待批量重试)`,
                    type: "warning",
                  });
                  // 记录需要重试的账号
                  retry200750Tokens.push({
                    tokenId,
                    tokenName: token.name,
                    fightIndex: i + 1,
                    totalFights: fights,
                    originalFormation,
                    isSwitched,
                    tokenSettings,
                    ticketCount,
                  });
                  // 标记为等待重试
                  tokenStatus.value[tokenId] = "waiting_retry";
                  break; // 跳出战斗循环
                }
                // ✅ 检查是否是11800010错误
                else if (errorMsg.includes("11800010")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场对决失败: 未知错误: 11800010 (已记录，等待批量重试)`,
                    type: "warning",
                  });
                  retry11800010Tokens.push({
                    tokenId,
                    tokenName: token.name,
                    fightIndex: i + 1,
                    totalFights: fights,
                    originalFormation,
                    isSwitched,
                    tokenSettings,
                    ticketCount,
                  });
                  tokenStatus.value[tokenId] = "waiting_retry";
                  break; // 跳出战斗循环
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场对决失败: ${errorMsg}`,
                    type: "error",
                  });
                }
              }
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));

            // 只有非重试状态的账号才标记为完成
            if (tokenStatus.value[tokenId] !== "waiting_retry") {
              tokenStatus.value[tokenId] = "completed";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== ${token.name} 竞技场战斗已完成 ===`,
                type: "success",
              });
            }
          } catch (error) {
            console.error(error);
            const errorMsg = error.message || "";

            // ✅ 200020错误表示关卡未达标，不重试
            if (errorMsg.includes("200020")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 当前账号关卡未达标，无法开启竞技场`,
                type: "warning",
              });
              tokenStatus.value[tokenId] = "completed";
              return;
            }

            // 检查是否是arena_startarena超时错误
            if (errorMsg.includes("arena_startarena") && errorMsg.includes("请求超时")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 检测到arena_startarena超时，将在60秒后重新执行...`,
                type: "warning",
              });

              // 等待60秒
              await new Promise((r) => setTimeout(r, 60000));

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 开始重新执行竞技场战斗...`,
                type: "info",
              });

              try {
                // 重新连接
                tokenStore.closeWebSocketConnection(tokenId);
                releaseConnectionSlot();
                await ensureConnection(tokenId);

                // 重新执行竞技场战斗（简化版）
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 重新执行竞技场战斗...`,
                  type: "info",
                });

                // 检查咸神门票
                let role = tokenStore.gameData?.roleInfo?.role;
                if (!role) {
                  try {
                    const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
                    role = roleInfo?.role;
                  } catch {}
                }
                const ticketCount = role?.items?.[1007]?.quantity || 0;

                if (ticketCount <= 0) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 咸神门票不足，无法进行竞技场战斗`,
                    type: "warning",
                  });
                  tokenStatus.value[tokenId] = "completed";
                } else {
                  const fights = Math.min(3, ticketCount);

                  for (let i = 0; i < fights; i++) {
                    if (shouldStop.value)
                      break;

                    try {
                      // ✅ 使用用户配置
                      const commandTimeout = batchSettings.defaultCommandTimeout || 3000;
                      await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, commandTimeout);

                      const targets = await tokenStore.sendMessageWithPromise(
                        tokenId,
                        "arena_getareatarget",
                        {},
                        5000,
                      );

                      // 获取玩家自身信息
                      const roleInfo = tokenStore.gameData?.roleInfo?.role || {};

                      // 尝试获取竞技场排名
                      let playerRank = 0;
                      try {
                        const arenaRankData = await tokenStore.sendMessageWithPromise(
                          tokenId,
                          "arena_getarearank",
                          {},
                          10000,
                        );
                        playerRank = arenaRankData?.rank || arenaRankData?.myRank || arenaRankData?.myRankData?.rank || 0;
                      } catch (err) {
                        console.warn("[竞技场] 获取排名失败:", err.message);
                      }

                      const playerInfo = {
                        rank: playerRank,
                        power: roleInfo.power || roleInfo.fightPower || 0,
                      };

                      // 智能选择目标
                      const targetResult = pickArenaTargetId(targets, playerInfo);
                      if (!targetResult || !targetResult.targetId) {
                        addLog({
                          time: new Date().toLocaleTimeString(),
                          message: `${token.name} 未找到可用的竞技场目标`,
                          type: "error",
                        });
                        break;
                      }

                      await tokenStore.sendMessageWithPromise(
                        tokenId,
                        "fight_startareaarena",
                        { targetId: targetResult.targetId },
                        8000,
                      );

                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 重试竞技场战斗 ${i + 1}/${fights}`,
                        type: "info",
                      });

                      await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
                    } catch (e) {
                      const errorMsg = e.message || "";
                      // ✅ 200020错误表示关卡未达标
                      if (errorMsg.includes("200020")) {
                        addLog({
                          time: new Date().toLocaleTimeString(),
                          message: `${token.name} 当前账号关卡未达标，无法开启竞技场`,
                          type: "warning",
                        });
                        break;
                      }

                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 重试竞技场对决失败: ${e.message || "未知错误"}`,
                        type: "error",
                      });
                    }
                  }

                  tokenStatus.value[tokenId] = "completed";
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `=== ${token.name} 重试竞技场战斗完成 ===`,
                    type: "success",
                  });
                }
              } catch (retryError) {
                console.error("重试失败:", retryError);
                tokenStatus.value[tokenId] = "failed";
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 重试竞技场战斗失败: ${retryError.message || "未知错误"}`,
                  type: "error",
                });
              }
            } else {
              // 其他错误直接失败
              tokenStatus.value[tokenId] = "failed";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 一键竞技场战斗失败: ${errorMsg}`,
                type: "error",
              });
            }
          } finally {
            // 确保无论成功还是失败，都恢复原阵容
            if (isSwitched && originalFormation) {
              try {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 正在恢复原阵容...`,
                  type: "info",
                });

                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "presetteam_saveteam",
                  { teamId: originalFormation },
                  3000,
                );

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 已恢复原阵容${originalFormation}`,
                  type: "success",
                });
              } catch (restoreErr) {
                const errorMsg = restoreErr.message || "";
                // 200020错误表示阵容已是目标状态，视为成功
                if (errorMsg.includes("200020") || errorMsg.includes("服务器错误: 200020")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 原阵容${originalFormation}已是当前阵容，无需恢复`,
                    type: "info",
                  });
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 恢复阵容失败: ${restoreErr.message}`,
                    type: "warning",
                  });
                }
              }
            }

            // 确保关闭连接，即使失败也不影响主流程
            try {
              tokenStore.closeWebSocketConnection(tokenId);
              releaseConnectionSlot();
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
                type: "info",
              });
            } catch (closeErr) {
              // 忽略关闭连接失败
            }
          }
        });
      }

      // 合并所有需要重试的账号
      const allRetryTokens = [...retry400340Tokens, ...retry200750Tokens, ...retry11800010Tokens];

      if (allRetryTokens.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n=== 发现 ${allRetryTokens.length} 个账号出现错误，等待1分钟后开始重试 ===`,
          type: "info",
        });

        await handleBatchRetry(allRetryTokens, maxRetries, "400340|200750|11800010", retryWaitTime, "400340/200750/11800010");
      }

      // 处理获取目标超时或未找到目标的账号（需要重连）
      if (retryTargetTokens.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n=== 发现 ${retryTargetTokens.length} 个账号获取目标失败，需要重连重试，等待1分钟后开始 ===`,
          type: "info",
        });

        await new Promise((resolve) => setTimeout(resolve, retryWaitTime));

        for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
          if (shouldStop.value || retryTargetTokens.length === 0)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `\n--- 第 ${retryCount + 1} 轮目标重试 (${retryTargetTokens.length} 个账号) ---`,
            type: "info",
          });

          const failedTokens = [];

          for (const retryInfo of retryTargetTokens) {
            if (shouldStop.value)
              break;

            const { tokenId, tokenName, fightIndex, totalFights, originalFormation, isSwitched, tokenSettings, ticketCount, errorType } = retryInfo;
            const token = tokens.value.find((t) => t.id === tokenId);

            try {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `\n=== 重连重试 ${tokenName} (第${retryCount + 1}轮，原错误:${errorType === "400340" ? "获取目标超时" : "未找到目标"}) ===`,
                type: "info",
              });

              tokenStatus.value[tokenId] = "retrying";

              // 先关闭旧连接，然后重新连接
              tokenStore.closeWebSocketConnection(tokenId);
              releaseConnectionSlot();
              await new Promise((r) => setTimeout(r, 4000)); // 等待2秒确保连接关闭

              await ensureConnection(tokenId);

              // 检查门票
              let role = tokenStore.gameData?.roleInfo?.role;
              if (!role) {
                try {
                  const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
                  role = roleInfo?.role;
                } catch {}
              }
              const currentTickets = role?.items?.[1007]?.quantity || 0;

              if (currentTickets <= 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${tokenName} 咸神门票不足，跳过重试`,
                  type: "warning",
                });
                failedTokens.push(retryInfo);
                continue;
              }

              // 恢复阵容（如果需要）
              if (isSwitched && originalFormation !== tokenSettings.arenaFormation) {
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "presetteam_saveteam",
                    { teamId: tokenSettings.arenaFormation },
                    5000,
                  );
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${tokenName} 成功切换到阵容${tokenSettings.arenaFormation}`,
                    type: "info",
                  });
                } catch (err) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${tokenName} 切换阵容失败: ${err.message}`,
                    type: "warning",
                  });
                }
              }

              // 执行剩余战斗
              const remainingFights = totalFights - fightIndex + 1;
              const fightsToRetry = Math.min(remainingFights, currentTickets);

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 开始重试，剩余 ${fightsToRetry} 场战斗`,
                type: "info",
              });

              let successCount = 0;
              for (let i = 0; i < fightsToRetry; i++) {
                if (shouldStop.value)
                  break;

                try {
                // ✅ 使用用户配置
                  const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
                  // 开启竞技场
                  await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, commandTimeout);

                  // 获取目标
                  const targets = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "arena_getareatarget",
                    {},
                    8000,
                  );

                  if (!targets) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${tokenName} 重试战斗${i + 1} - 目标数据仍为空`,
                      type: "warning",
                    });
                    failedTokens.push(retryInfo);
                    break;
                  }

                  // 获取玩家信息
                  const roleInfo = tokenStore.gameData?.roleInfo?.role || {};
                  let playerRank = 0;
                  try {
                    const arenaRankData = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "arena_getarearank",
                      { rankType: 0, minRank: 1, maxRank: 100 },
                      10000,
                    );
                    const rankList = arenaRankData?.rankList || arenaRankData?.roleList || arenaRankData?.list || [];
                    const myRankData = rankList.find((item) => item.roleId === roleInfo.roleId || item.info?.roleId === roleInfo.roleId);
                    if (myRankData)
                      playerRank = myRankData.rank || myRankData.info?.rank || 0;
                  } catch (err) {
                    console.warn("[竞技场] 获取排名失败:", err.message);
                  }

                  const playerInfo = { rank: playerRank, power: roleInfo.power || roleInfo.fightPower || 0 };

                  // 智能选择目标
                  const targetResult = pickArenaTargetId(targets, playerInfo);
                  if (!targetResult || !targetResult.targetId) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${tokenName} 重试战斗${i + 1} - 仍未找到可用目标`,
                      type: "error",
                    });
                    failedTokens.push(retryInfo);
                    break;
                  }

                  // 执行战斗
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "fight_startareaarena",
                    { targetId: targetResult.targetId },
                    8000,
                  );

                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${tokenName} 重试竞技场战斗 ${i + 1}/${fightsToRetry}`,
                    type: "success",
                  });
                  successCount++;
                  await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
                } catch (e) {
                  const errorMsg = e.message || "未知错误";
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${tokenName} 重试战斗${i + 1} - 失败: ${errorMsg}`,
                    type: "error",
                  });
                  failedTokens.push(retryInfo);
                  break;
                }
              }

              if (successCount > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${tokenName} 重试成功，完成 ${successCount}/${fightsToRetry} 场战斗`,
                  type: "success",
                });
                tokenStatus.value[tokenId] = "completed";
              }

              // 恢复原阵容
              if (isSwitched && originalFormation) {
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "presetteam_saveteam",
                    { teamId: originalFormation },
                    3000,
                  );
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${tokenName} 已恢复原阵容${originalFormation}`,
                    type: "info",
                  });
                } catch (restoreErr) {
                  const restoreErrorMsg = restoreErr.message || "";
                  if (!restoreErrorMsg.includes("200020")) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${tokenName} 恢复阵容失败: ${restoreErr.message}`,
                      type: "warning",
                    });
                  }
                }
              }
            } catch (error) {
              console.error("重连重试失败:", error);
              failedTokens.push(retryInfo);
              tokenStatus.value[tokenId] = "failed";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 重连重试失败: ${error.message}`,
                type: "error",
              });
            } finally {
            // 关闭连接
              try {
                tokenStore.closeWebSocketConnection(tokenId);
                releaseConnectionSlot();
              } catch (closeErr) {
              // ignore
              }
            }
          }

          retryTargetTokens.length = 0;
          retryTargetTokens.push(...failedTokens);

          if (failedTokens.length > 0 && retryCount < maxRetries - 1) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${failedTokens.length} 个账号重试失败，等待1分钟后进行下一轮重试`,
              type: "warning",
            });
            await new Promise((resolve) => setTimeout(resolve, retryWaitTime));
          }
        }

        // 最终统计
        const targetSuccessCount = selectedTokens.value.length - retry400340Tokens.length - retry200750Tokens.length - retryTargetTokens.length;
        const targetFailedCount = retryTargetTokens.length;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n=== 目标获取失败重试完成 ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `目标重试成功: ${targetSuccessCount} 个`,
          type: "success",
        });
        if (targetFailedCount > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `目标重试失败: ${targetFailedCount} 个 (重连重试${maxRetries}次后仍失败)`,
            type: "error",
          });
          const failedNames = retryTargetTokens.map((t) => t.tokenName).join(", ");
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `失败账号: ${failedNames}`,
            type: "error",
          });
        }
      }

      // 最终统计
      const totalSuccess = selectedTokens.value.length - retry400340Tokens.length - retry200750Tokens.length - retryTargetTokens.length;
      const totalFailed = retry400340Tokens.length + retry200750Tokens.length + retryTargetTokens.length;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 批量竞技场战斗完成 ===`,
        type: "success",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `总计: ${selectedTokens.value.length} 个账号`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `成功: ${totalSuccess} 个`,
        type: "success",
      });
      if (totalFailed > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `失败: ${totalFailed} 个`,
          type: "error",
        });
      }

      message.success("批量竞技场战斗结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /**
   * 批量钓鱼补齐
   */
  const batchTopUpFish = async () => {
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value)
          return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始钓鱼补齐: ${token.name} ===`,
            type: "info",
          });
          await ensureConnection(tokenId);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取月度任务进度...`,
            type: "info",
          });
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_get",
            {},
            10000,
          );
          const act = result?.activity || result?.body?.activity || result;

          if (!act) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 获取月度任务进度失败`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }
          const myMonthInfo = act.myMonthInfo || {};
          const fishNum = Number(myMonthInfo?.["2"]?.num || 0);

          const monthProgress = calculateMonthProgress();
          const now = new Date();
          const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
          ).getDate();
          const dayOfMonth = now.getDate();
          const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
          const shouldBe
            = remainingDays === 0
              ? FISH_TARGET
              : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
          const need = Math.max(0, shouldBe - fishNum);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前进度: ${fishNum}/${FISH_TARGET}，需要补齐: ${need}次`,
            type: "info",
          });
          if (need <= 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `当前进度已达标，无需补齐`,
              type: "success",
            });
            tokenStatus.value[tokenId] = "completed";
            return;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始执行钓鱼补齐...`,
            type: "info",
          });

          let role = tokenStore.gameData?.roleInfo?.role;
          if (!role) {
            try {
              const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
              role = roleInfo?.role;
            } catch {}
          }
          let freeUsed = 0;
          const lastFreeTime = Number(
            role?.statisticsTime?.["artifact:normal:lottery:time"] || 0,
          );
          if (isTodayAvailable(lastFreeTime)) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 检测到今日免费钓鱼次数，开始消耗 3 次`,
              type: "info",
            });
            for (let i = 0; i < 3 && need > freeUsed && !shouldStop.value; i++) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "artifact_lottery",
                  { lotteryNumber: 1, newFree: true, type: 1 },
                  8000,
                );
                freeUsed++;
                await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
              } catch (e) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 免费钓鱼失败: ${e.message}`,
                  type: "error",
                });
                break;
              }
            }
          }

          const updatedResult = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_get",
            {},
            10000,
          );
          const updatedAct
            = updatedResult?.activity
              || updatedResult?.body?.activity
              || updatedResult;
          const updatedMyMonthInfo = updatedAct.myMonthInfo || {};
          const updatedFishNum = Number(updatedMyMonthInfo?.["2"]?.num || 0);
          let remaining = Math.max(0, shouldBe - updatedFishNum);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 免费次数后进度: ${updatedFishNum}/${FISH_TARGET}，还需补齐: ${remaining}次`,
            type: "info",
          });
          if (remaining <= 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `已通过免费次数完成目标`,
              type: "success",
            });
            tokenStatus.value[tokenId] = "completed";
            return;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始付费钓鱼补齐: 共需 ${remaining} 次（每次最多10）`,
            type: "info",
          });

          // 检查普通鱼竿 (ID: 1011)
          const rodCount = role?.items?.[1011]?.quantity || 0;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前普通鱼竿: ${rodCount}`,
            type: "info",
          });

          if (rodCount < remaining) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 普通鱼竿不足 (${rodCount} < ${remaining})，将仅使用现有鱼竿`,
              type: "warning",
            });
            remaining = rodCount;
          }

          while (remaining > 0 && !shouldStop.value) {
            const batch = Math.min(10, remaining);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "artifact_lottery",
                { lotteryNumber: batch, newFree: true, type: 1 },
                12000,
              );
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 完成 ${batch} 次付费钓鱼`,
                type: "info",
              });
              remaining -= batch;

              // 每钓鱼5轮（50次）后，重新获取角色信息，校验鱼竿数量
              if (remaining > 0 && batch >= 10 && remaining % 50 === 0) {
                try {
                  const roleRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "role_getroleinfo",
                    {},
                    10000,
                  );
                  const currentRole = roleRes?.role || roleRes?.data?.role;
                  if (currentRole) {
                    const currentRodCount = currentRole.items?.[1011]?.quantity || 0;
                    if (currentRodCount < remaining) {
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 同步后发现鱼竿不足 (${currentRodCount} < ${remaining})，调整目标`,
                        type: "warning",
                      });
                      remaining = currentRodCount;
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }

              await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 付费钓鱼失败: ${e.message}`,
                type: "error",
              });
              break;
            }
          }

          const finalResult = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_get",
            {},
            10000,
          );
          const finalAct
            = finalResult?.activity || finalResult?.body?.activity || finalResult;
          const finalMyMonthInfo = finalAct.myMonthInfo || {};
          const finalFishNum = Number(finalMyMonthInfo?.["2"]?.num || 0);
          if (finalFishNum >= shouldBe || finalFishNum >= FISH_TARGET) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 钓鱼补齐完成，最终进度: ${finalFishNum}/${FISH_TARGET}`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 钓鱼补齐已停止，未达到目标，最终进度: ${finalFishNum}/${FISH_TARGET}`,
              type: "warning",
            });
          }

          // 自动领取鱼竿累计奖励
          try {
            const roleRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              10000,
            );
            const currentRole = roleRes?.role || roleRes?.data?.role;
            if (currentRole) {
              const points = currentRole.statistics?.["artifact:point"] || 0;
              const exchangeCount = Math.floor(points / 20);

              if (exchangeCount > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 检测到鱼竿累计使用 ${points}，开始领取 ${exchangeCount} 次累计奖励`,
                  type: "info",
                });

                for (let k = 0; k < exchangeCount && !shouldStop.value; k++) {
                  try {
                    await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "artifact_exchange",
                      {},
                      3000,
                    );
                    await new Promise((r) => setTimeout(r, 500));
                  } catch (err) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 领取累计奖励失败 (第${k + 1}次): ${err.message}`,
                      type: "warning",
                    });
                    break;
                  }
                }
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 累计奖励领取结束`,
                  type: "success",
                });
              }
            }
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 检查累计奖励失败: ${e.message}`,
              type: "warning",
            });
          }

          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼补齐失败: ${error.message}`,
            type: "error",
          });
        } finally {
        // ✅ 任务结束前刷新月度任务进度
          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 正在刷新月度任务进度...`,
              type: "info",
            });
            await tokenStore.sendGetMonthlyActivity(tokenId);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 月度任务进度已刷新`,
              type: "success",
            });
          } catch (refreshErr) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 刷新月度任务失败: ${refreshErr.message}`,
              type: "warning",
            });
          }

          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      });

      message.success("批量钓鱼补齐结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /**
   * 批量竞技场补齐（串行执行）
   */
  const batchTopUpArena = async () => {
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始批量竞技场补齐，共 ${selectedTokens.value.length} 个账号（串行执行） ===`,
        type: "info",
      });

      // ✅ 串行执行：逐个账号处理
      for (let index = 0; index < selectedTokens.value.length; index++) {
        const tokenId = selectedTokens.value[index];

        if (shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `用户取消操作，已处理 ${index}/${selectedTokens.value.length} 个账号`,
            type: "warning",
          });
          break;
        }

        tokenStatus.value[tokenId] = "running";

        // 加载该Token的独立配置，如果未找到则回退到currentSettings
        const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;
        const token = tokens.value.find((t) => t.id === tokenId);

        // 在try块外部声明变量，确保finally块可以访问
        let originalFormation = null; // 保存原始阵容
        let currentFormation = null; // 当前阵容
        let isSwitched = false; // 是否切换过阵容
        let shouldWait = true; // ✅ 是否需要等待10秒（默认需要）

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始竞技场补齐: ${token.name} (${index + 1}/${selectedTokens.value.length}) ===`,
            type: "info",
          });
          await ensureConnection(tokenId);

          const teamInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_getinfo",
            {},
            5000,
          );
          if (!teamInfo || !teamInfo.presetTeamInfo) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `阵容信息异常: ${JSON.stringify(teamInfo)}`,
              type: "warning",
            });
          }

          originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
          currentFormation = originalFormation;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 原始阵容: ${originalFormation}`,
            type: "info",
          });

          if (originalFormation === tokenSettings.arenaFormation) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `当前已是阵容${tokenSettings.arenaFormation}，无需切换`,
              type: "info",
            });
          } else {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "presetteam_saveteam",
              { teamId: tokenSettings.arenaFormation },
              5000,
            );
            isSwitched = true;
            currentFormation = tokenSettings.arenaFormation;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `成功切换到阵容${tokenSettings.arenaFormation}`,
              type: "info",
            });
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取月度任务进度...`,
            type: "info",
          });
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_get",
            {},
            10000,
          );
          const act = result?.activity || result?.body?.activity || result;

          if (!act) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 获取月度任务进度失败`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }
          const myArenaInfo = act.myArenaInfo || {};
          const arenaNum = Number(myArenaInfo?.num || 0);

          const monthProgress = calculateMonthProgress();
          const now = new Date();
          const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
          ).getDate();
          const dayOfMonth = now.getDate();
          const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
          const shouldBe
            = remainingDays === 0
              ? ARENA_TARGET
              : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
          const need = Math.max(0, shouldBe - arenaNum);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前进度: ${arenaNum}/${ARENA_TARGET}，需要补齐: ${need}次`,
            type: "info",
          });
          if (need <= 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前进度已达标，无需补齐`,
              type: "success",
            });
            tokenStatus.value[tokenId] = "completed";
            shouldWait = false; // ✅ 进度达标，不需要等待
          // ✅ 不使用 return，让代码继续执行到 finally 块
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 开始执行竞技场补齐...`,
              type: "info",
            });

            // 检查咸神门票 (ID: 1007)
            let role = tokenStore.gameData?.roleInfo?.role;
            if (!role) {
              try {
                const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
                role = roleInfo?.role;
              } catch {}
            }
            const ticketCount = role?.items?.[1007]?.quantity || 0;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前咸神门票: ${ticketCount}`,
              type: "info",
            });

            if (ticketCount < need) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 咸神门票不足 (${ticketCount} < ${need})，将仅使用现有门票`,
                type: "warning",
              });
            }

            let ticketsLeft = ticketCount;
            let remaining = Math.min(need, ticketsLeft);

            if (remaining <= 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 没有可用的咸神门票`,
                type: "warning",
              });
              tokenStatus.value[tokenId] = "completed";
              return;
            }

            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "arena_startarea",
                {},
                3000,
              );
            } catch (error) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 开始竞技场失败: ${error.message}`,
                type: "warning",
              });
            }

            let safetyCounter = 0;
            const safetyMaxFights = 100;
            let round = 1;
            let consecutiveNoProgressRounds = 0; // 连续无进展轮次计数
            const MAX_NO_PROGRESS_ROUNDS = 3; // 连续3轮无进展则中断
            while (
              remaining > 0
              && ticketsLeft > 0
              && safetyCounter < safetyMaxFights
              && !shouldStop.value
            ) {
              const planFights = Math.min(Math.ceil(remaining / 2), ticketsLeft);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${round}轮：计划战斗 ${planFights} 场 (剩余门票: ${ticketsLeft})`,
                type: "info",
              });

              let actualFights = 0;
              for (
                let i = 0;
                i < planFights
                && safetyCounter < safetyMaxFights
                && !shouldStop.value;
                i++
              ) {
                // ✅ 每场战斗前都需要开启竞技场（与一键竞技场保持一致）
                try {
                  const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
                  const arenaStartResult = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "arena_startarea",
                    {},
                    commandTimeout,
                  );
                  console.log("[竞技场补齐] arena_startarea 返回:", JSON.stringify(arenaStartResult));
                } catch (err) {
                  const errorMsg = err.message || "";
                  // 200020错误表示关卡未达标
                  if (errorMsg.includes("200020")) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 当前账号关卡未达标，无法开启竞技场`,
                      type: "warning",
                    });
                    break;
                  }

                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 开启竞技场失败：${err.message}`,
                    type: "error",
                  });
                  break;
                }

                let targets;
                try {
                  targets = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "arena_getareatarget",
                    {},
                    8000,
                  );
                  console.log("[竞技场补齐] arena_getareatarget 返回:", JSON.stringify(targets));
                } catch (err) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 获取竞技场目标失败：${err.message}`,
                    type: "error",
                  });
                  break;
                }

                // 获取玩家自身信息（与一键竞技场保持一致）
                const roleInfo = tokenStore.gameData?.roleInfo?.role || {};

                // 尝试获取竞技场排名
                let playerRank = 0;
                try {
                  const arenaRankData = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "arena_getarearank",
                    {
                      rankType: 0,
                      minRank: 1,
                      maxRank: 100,
                    },
                    10000,
                  );

                  const myRoleId = roleInfo.roleId;
                  const rankList = arenaRankData?.rankList || arenaRankData?.roleList || arenaRankData?.list || [];
                  const myRankData = rankList.find((item) =>
                    item.roleId === myRoleId
                    || item.info?.roleId === myRoleId,
                  );

                  if (myRankData) {
                    playerRank = myRankData.rank || myRankData.info?.rank || 0;
                  }
                } catch (err) {
                  console.warn("[竞技场补齐] 获取排名失败:", err.message);
                }

                const playerInfo = {
                  rank: playerRank,
                  power: roleInfo.power || roleInfo.fightPower || 0,
                };

                // 智能选择目标（传入playerInfo）
                const targetResult = pickArenaTargetId(targets, playerInfo);
                if (!targetResult || !targetResult.targetId) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 未找到可用的竞技场目标`,
                    type: "warning",
                  });
                  break;
                }

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 选择目标: ${targetResult.targetName} (排名:${targetResult.targetRank}, 战力:${formatPower(targetResult.targetPower)})`,
                  type: "info",
                });

                // ✅ 200020重试计数：防止同一场战斗因200020错误无限continue
                let consecutive200020Retries = 0;
                const MAX_200020_RETRIES = 3;
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "fight_startareaarena",
                    { targetId: targetResult.targetId },
                    15000,
                  );
                  actualFights++;
                  ticketsLeft--;
                  consecutive200020Retries = 0; // 战斗成功，重置重试计数
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 竞技场战斗 ${i + 1}/${planFights} 完成`,
                    type: "info",
                  });
                } catch (e) {
                  const errorMsg = e.message || "未知错误";

                  // 检查是否是200020错误（竞技场状态异常）
                  if (errorMsg.includes("200020")) {
                    consecutive200020Retries++;
                    if (consecutive200020Retries >= MAX_200020_RETRIES) {
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 竞技场对决连续${consecutive200020Retries}次200020错误，跳过本场战斗`,
                        type: "warning",
                      });
                      // 不continue，让代码继续到safetyCounter++，退出当前迭代
                    } else {
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} 竞技场对决失败：服务器错误: 200020 - 竞技场状态异常 (第${consecutive200020Retries}次重试，最多${MAX_200020_RETRIES}次)`,
                        type: "warning",
                      });
                      // 等待3秒后重试
                      await new Promise((r) => setTimeout(r, 3000));
                      // 不减少门票，不增加safetyCounter，继续下一次循环重试
                      continue;
                    }
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 竞技场对决失败：${e.message}`,
                      type: "error",
                    });
                  }
                }

                safetyCounter++;
                await new Promise((r) => setTimeout(r, _getModuleDelay('arena')));
              }

              // 检测本轮是否有实际进展
              if (actualFights === 0) {
                consecutiveNoProgressRounds++;
                if (consecutiveNoProgressRounds >= MAX_NO_PROGRESS_ROUNDS) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 连续${consecutiveNoProgressRounds}轮未能完成战斗，中止竞技场补齐`,
                    type: "warning",
                  });
                  break;
                }
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 本轮无进展 (${consecutiveNoProgressRounds}/${MAX_NO_PROGRESS_ROUNDS})，等待3秒后重试`,
                  type: "warning",
                });
                await new Promise((r) => setTimeout(r, 3000));
              } else {
                consecutiveNoProgressRounds = 0; // 有进展则重置计数
              }

              const updatedResult = await tokenStore.sendMessageWithPromise(
                tokenId,
                "activity_get",
                {},
                10000,
              );
              const updatedAct
                = updatedResult?.activity
                  || updatedResult?.body?.activity
                  || updatedResult;
              const updatedMyArenaInfo = updatedAct.myArenaInfo || {};
              const updatedArenaNum = Number(updatedMyArenaInfo?.num || 0);

              // Re-calculate remaining needed for target, but don't exceed ticketsLeft
              const neededForTarget = Math.max(0, shouldBe - updatedArenaNum);

              // 每轮战斗后重新获取角色信息以更新门票数量
              try {
                const roleRes = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "role_getroleinfo",
                  {},
                  10000,
                );
                const currentRole = roleRes?.role || roleRes?.data?.role;
                if (currentRole) {
                  const newTickets = currentRole.items?.[1007]?.quantity || 0;
                  if (newTickets !== ticketsLeft) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 同步最新门票数量: ${newTickets} (原记录: ${ticketsLeft})`,
                      type: "info",
                    });
                    ticketsLeft = newTickets;
                  }
                }
              } catch (e) {
              // ignore error, use local calculation
              }

              remaining = Math.min(neededForTarget, ticketsLeft);

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${round}轮后进度: ${updatedArenaNum}/${ARENA_TARGET}，还需补齐: ${remaining}次`,
                type: "info",
              });

              round++;
            }

            const finalResult = await tokenStore.sendMessageWithPromise(
              tokenId,
              "activity_get",
              {},
              10000,
            );
            const finalAct
              = finalResult?.activity || finalResult?.body?.activity || finalResult;
            const finalMyArenaInfo = finalAct.myArenaInfo || {};
            const finalArenaNum = Number(finalMyArenaInfo?.num || 0);
            if (finalArenaNum >= shouldBe || finalArenaNum >= ARENA_TARGET) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 竞技场补齐完成，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
                type: "success",
              });
            } else if (safetyCounter >= safetyMaxFights) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `达到安全上限，竞技场补齐已停止，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 竞技场补齐已停止，未达到目标，最终进度: ${finalArenaNum}/${ARENA_TARGET}`,
                type: "warning",
              });
            }

            tokenStatus.value[tokenId] = "completed";
          } // ✅ 闭合 else 块
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 竞技场补齐失败: ${error.message}`,
            type: "error",
          });
        } finally {
        // 确保无论成功还是失败，都恢复原阵容
          if (isSwitched && originalFormation) {
            try {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 正在恢复原阵容...`,
                type: "info",
              });

              await tokenStore.sendMessageWithPromise(
                tokenId,
                "presetteam_saveteam",
                { teamId: originalFormation },
                3000,
              );

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 已恢复原阵容${originalFormation}`,
                type: "success",
              });
            } catch (restoreErr) {
              const errorMsg = restoreErr.message || "";
              // 200020错误表示阵容已是目标状态，视为成功
              if (errorMsg.includes("200020") || errorMsg.includes("服务器错误: 200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 原阵容${originalFormation}已是当前阵容，无需恢复`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 恢复阵容失败: ${restoreErr.message}`,
                  type: "warning",
                });
              }
            }
          }

          // 确保关闭连接，即使失败也不影响主流程
          try {
          // ✅ 任务结束前刷新月度任务进度
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 正在刷新月度任务进度...`,
              type: "info",
            });
            await tokenStore.sendGetMonthlyActivity(tokenId);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 月度任务进度已刷新`,
              type: "success",
            });
          } catch (refreshErr) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 刷新月度任务失败: ${refreshErr.message}`,
              type: "warning",
            });
          }

          try {
            tokenStore.closeWebSocketConnection(tokenId);
            releaseConnectionSlot();
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 连接已关闭`,
              type: "info",
            });
          } catch (closeErr) {
          // 忽略关闭连接失败
          }

          // ✅ 每完成一个账号，根据 shouldWait 标记决定是否等待10秒
          if (index < selectedTokens.value.length - 1 && shouldWait) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `等待 10 秒后执行下一个账号...`,
              type: "info",
            });
            await new Promise((r) => setTimeout(r, 10000));
          } else if (index < selectedTokens.value.length - 1 && !shouldWait) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `进度已达标，立即执行下一个账号...`,
              type: "info",
            });
          }
        }
      }

      message.success("批量竞技场补齐结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  return {
    batcharenafight,
    batchTopUpFish,
    batchTopUpArena,
  };
}
