import { isDungeonOpen, merchantConfig } from "@/utils/dreamConstants";
import { getModuleDelayCompat } from "@/utils/batch/delayManager";

/**
 * 宝库、梦境类任务
 * 包含: batchbaoku13, batchbaoku45, batchmengjing, batchBuyDreamItems
 */

/**
 * 创建宝库、梦境类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksDungeon(deps) {
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
   * 一键宝库前3层
   */
  const batchbaoku13 = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processBaoku13 = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 1 && towerId <= 3) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value)
              break;
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "bosstower_startboss",
                {},
              );
            } catch (bossErr) {
              if (bossErr.message?.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 宝库BOSS服务器处理中(200020)，等待1秒后重试...`,
                  type: "warning",
                });
                await new Promise(r => setTimeout(r, 1000));
                await tokenStore.sendMessageWithPromise(tokenId, "bosstower_startboss", {});
              } else {
                throw bossErr;
              }
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
          }
          for (let i = 0; i < 9; i++) {
            if (shouldStop.value)
              break;
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "bosstower_startbox",
                {},
              );
            } catch (boxErr) {
              if (boxErr.message?.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 宝库宝箱服务器处理中(200020)，等待1秒后重试...`,
                  type: "warning",
                });
                await new Promise(r => setTimeout(r, 1000));
                await tokenStore.sendMessageWithPromise(tokenId, "bosstower_startbox", {});
              } else {
                throw boxErr;
              }
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成，请上线手动领取奖励 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    };

    await runStreaming(selectedTokens.value, processBaoku13);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processBaoku13);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量宝库结束");
  };

  /**
   * 一键宝库4,5层
   */
  const batchbaoku45 = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processBaoku45 = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 4 && towerId <= 5) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value)
              break;
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "bosstower_startboss",
                {},
              );
            } catch (bossErr) {
              if (bossErr.message?.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 宝库BOSS服务器处理中(200020)，等待1秒后重试...`,
                  type: "warning",
                });
                await new Promise(r => setTimeout(r, 1000));
                await tokenStore.sendMessageWithPromise(tokenId, "bosstower_startboss", {});
              } else {
                throw bossErr;
              }
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    };

    await runStreaming(selectedTokens.value, processBaoku45);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processBaoku45);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量宝库结束");
  };

  /**
   * 一键梦境
   */
  const batchmengjing = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processMengjing = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始咸王梦境: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        if (shouldStop.value)
          return;

        // 1. 获取角色信息，检查关卡数和梦境状态
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取角色信息...`,
          type: "info",
        });
        const roleInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          10000,
        );

        const levelId = roleInfo?.role?.levelId || 0;
        const dungeonData = roleInfo?.role?.dungeon || {};
        const dungeonStatus = dungeonData.status;
        const dungeonLevel = dungeonData.maxId || 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 梦境关卡: ${dungeonLevel}`,
          type: "info",
        });

        // 2. 检查关卡数（梦境需要200关以上）
        if (levelId < 200) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 关卡数不足(${levelId} < 200)，无法进行梦境挑战，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          return;
        }

        // 3. 检查梦境是否已完成
        if (dungeonStatus === 2 || dungeonStatus === "completed") {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 梦境已完成，无需重复执行`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          return;
        }

        // 4. 检查开放时间
        const dayOfWeek = new Date().getDay();
        const isOpen = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4;

        if (!isOpen) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前未在开放时间（开放：周日/周一/周三/周四）`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          return;
        }

        // 5. 执行梦境挑战 - 选择阵容
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 选择梦境阵容...`,
          type: "info",
        });

        const heroId = 107;
        const mjbattleTeam = { 0: heroId };
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "dungeon_selecthero",
            { battleTeam: mjbattleTeam },
            10000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 阵容选择成功`,
            type: "info",
          });
        } catch (selectError) {
          // 2600040 表示阵容已选择过，不是真正完成，继续执行战斗
          const errMsg = selectError.message || "";
          if (errMsg.includes("2600040")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 阵容已设置，直接开始战斗`,
              type: "info",
            });
          } else {
            throw selectError; // 其他错误向上抛出
          }
        }

        // 添加延迟，等待服务器处理阵容选择
        await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));

        // 6. 循环发起梦境战斗，直到次数耗尽或出错
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开始梦境战斗...`,
          type: "info",
        });

        let winCount = 0;
        let loseCount = 0;
        let fightCount = 0;
        let consecutiveLosses = 0; // 连续失败计数
        const MAX_CONSECUTIVE_LOSSES = 15; // 连续失败上限
        const maxFights = 200; // 安全上限，防止无限循环

        while (fightCount < maxFights) {
          if (shouldStop.value) break;

          try {
            // 6a. 发起梦境战斗（支持200020重试）
            let fightResult;
            try {
              fightResult = await tokenStore.sendMessageWithPromise(
                tokenId,
                "fight_startdungeon",
                { heroId },
                15000,
              );
            } catch (fightErr) {
              // 200020：战斗未结算，等待1秒后重试一次
              if (fightErr.message?.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 梦境战斗服务器处理中(200020)，等待1秒后重试...`,
                  type: "warning",
                });
                await new Promise(r => setTimeout(r, 1000));
                fightResult = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "fight_startdungeon",
                  { heroId },
                  15000,
                );
              } else {
                throw fightErr;
              }
            }

            fightCount++;
            const isWin = fightResult?.isWin;
            const dungeonId = fightResult?.dungeonId || fightResult?.stageId || 0;
            const star = fightResult?.star || 0;

            if (isWin) {
              winCount++;
              consecutiveLosses = 0;
            } else {
              loseCount++;
              consecutiveLosses++;
            }

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 第${fightCount}场${isWin ? "胜利" : "失败"}${star ? `（${star}星）` : ""}${!isWin ? `（连续失败${consecutiveLosses}次）` : ""}`,
              type: isWin ? "success" : "warning",
            });

            // 连续失败达到上限，停止该账号
            if (consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 连续失败${consecutiveLosses}次，自动停止梦境战斗`,
                type: "warning",
              });
              break;
            }

            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));

            // 6b. 领取本关梦境奖励
            if (dungeonId) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "dungeon_reward",
                  { dungeonId },
                  10000,
                );
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 梦境奖励已领取（关卡${dungeonId}）`,
                  type: "info",
                });
              } catch (rewardErr) {
                // 奖励领取失败不阻断流程
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 梦境奖励领取失败: ${rewardErr.message || "未知"}`,
                  type: "warning",
                });
              }
            }

            // 战斗间隔，避免过快触发限流
            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
          } catch (fightError) {
            const fightErrorMsg = fightError.message || "";
            if (fightErrorMsg.includes("2600080") || fightErrorMsg.includes("2600050") || fightErrorMsg.includes("2600040")) {
              // 2600080: 无剩余次数, 2600050: 梦境未开放, 2600040: 已完成
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 梦境挑战结束（武将已阵亡）`,
                type: "info",
              });
              break; // 正常结束，跳出循环
            } else {
              // 其他错误，记录并退出
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${fightCount + 1}场战斗出错: ${fightErrorMsg}`,
                type: "error",
              });
              break;
            }
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 咸王梦境已完成（${winCount}胜${loseCount}负，共${fightCount}场） ===`,
          type: "success",
        });
      } catch (error) {
        const errorMsg = error.message || "";

        // 检查是否是2600040错误（已完成梦境挑战）
        if (errorMsg.includes("2600040") || errorMsg.includes("已完成梦境挑战")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 已完成梦境挑战无需执行，跳过`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
        } else if (errorMsg.includes("2600080") || errorMsg.includes("2600050")) {
          // 2600080: 已无剩余挑战次数, 2600050: 梦境未开放
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 梦境挑战已结束（无剩余次数或未开放）`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
        } else {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 咸王梦境失败: ${error.message || "未知错误"}`,
            type: "error",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    };

    await runStreaming(selectedTokens.value, processMengjing);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processMengjing);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量梦境结束");
  };

  /**
   * 一键购买梦境商品
   */
  const batchBuyDreamItems = async () => {
    if (selectedTokens.value.length === 0)
      return;

    if (!isDungeonOpen()) {
      message.warning("当前不是梦境开放时间（周三/周四/周日/周一）");
      return;
    }

    const purchaseList = batchSettings.dreamPurchaseList || [];
    if (purchaseList.length === 0) {
      message.warning("请先在设置中配置购买清单");
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processBuyDream = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始梦境购买: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);

        // 1. 获取角色信息以获得商店数据
        const roleInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          15000,
        );

        if (!roleInfo || !roleInfo.role || !roleInfo.role.dungeon || !roleInfo.role.dungeon.merchant) {
          throw new Error("无法获取梦境商店数据");
        }

        const merchantData = roleInfo.role.dungeon.merchant;
        const levelId = roleInfo.role.levelId || 0;
        let successCount = 0;
        let failCount = 0;

        const operations = [];

        for (const itemKey of purchaseList) {
          const [targetMerchantId, targetItemIndex] = itemKey.split("-").map(Number);

          const merchantItems = merchantData[targetMerchantId];
          if (merchantItems) {
            for (let pos = 0; pos < merchantItems.length; pos++) {
              if (merchantItems[pos] === targetItemIndex) {
                operations.push({
                  merchantId: targetMerchantId,
                  index: targetItemIndex,
                  pos,
                });
              }
            }
          }
        }
        operations.sort((a, b) => {
          if (a.merchantId !== b.merchantId)
            return a.merchantId - b.merchantId;
          return b.pos - a.pos;
        });

        for (const op of operations) {
          if (shouldStop.value)
            break;

          if (levelId < 4000) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 关卡数小于4000，无法购买`,
              type: "warning",
            });
            return;
          }

          try {
            const response = await tokenStore.sendMessageWithPromise(
              tokenId,
              "dungeon_buymerchant",
              {
                id: op.merchantId,
                index: op.index,
                pos: op.pos,
              },
              5000,
            );

            if (response && response.reward) {
              successCount++;
              const merchantName = merchantConfig[op.merchantId] ? merchantConfig[op.merchantId].name : `商人${op.merchantId}`;
              const itemName = merchantConfig[op.merchantId] && merchantConfig[op.merchantId].items[op.index] ? merchantConfig[op.merchantId].items[op.index] : `商品${op.index}`;

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 购买成功: ${merchantName} - ${itemName}`,
                type: "success",
              });
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 梦境购买完成: 成功${successCount}, 失败${failCount} ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 梦境购买失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    };

    await runStreaming(selectedTokens.value, processBuyDream);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processBuyDream);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量梦境购买结束");
  };

  // 灯神势力信息：魏1/蜀2/吴3/群4/深海5（深海最多10层，其余17层）
  const GENIE_NAMES = { 1: "魏国", 2: "蜀国", 3: "吴国", 4: "群雄", 5: "深海" };

  // 武将信息表（heroId -> { name, club }），用于灯神挑战自动匹配"该国纯阵营"预设阵容
  // 来源：咸鱼之王武将配置（101-314 段）
  const GENIE_HERO_INFO = {
    101: { name: "司马懿", club: "魏国" },
    102: { name: "郭嘉", club: "魏国" },
    103: { name: "关羽", club: "蜀国" },
    104: { name: "诸葛亮", club: "蜀国" },
    105: { name: "周瑜", club: "吴国" },
    106: { name: "太史慈", club: "吴国" },
    107: { name: "吕布", club: "群雄" },
    108: { name: "华佗", club: "群雄" },
    109: { name: "甄姬", club: "魏国" },
    110: { name: "黄月英", club: "蜀国" },
    111: { name: "孙策", club: "吴国" },
    112: { name: "贾诩", club: "群雄" },
    113: { name: "曹仁", club: "魏国" },
    114: { name: "姜维", club: "蜀国" },
    115: { name: "孙坚", club: "吴国" },
    116: { name: "公孙瓒", club: "群雄" },
    117: { name: "典韦", club: "魏国" },
    118: { name: "赵云", club: "蜀国" },
    119: { name: "大乔", club: "吴国" },
    120: { name: "张角", club: "群雄" },
    121: { name: "鲁肃", club: "吴国" },
    201: { name: "徐晃", club: "魏国" },
    202: { name: "荀彧", club: "魏国" },
    203: { name: "典韦", club: "魏国" },
    204: { name: "张飞", club: "蜀国" },
    205: { name: "赵云", club: "蜀国" },
    206: { name: "庞统", club: "蜀国" },
    207: { name: "鲁肃", club: "吴国" },
    208: { name: "陆逊", club: "吴国" },
    209: { name: "甘宁", club: "吴国" },
    210: { name: "貂蝉", club: "群雄" },
    211: { name: "董卓", club: "群雄" },
    212: { name: "张角", club: "群雄" },
    213: { name: "张辽", club: "魏国" },
    214: { name: "夏侯惇", club: "魏国" },
    215: { name: "许褚", club: "魏国" },
    216: { name: "夏侯渊", club: "魏国" },
    217: { name: "魏延", club: "蜀国" },
    218: { name: "黄忠", club: "蜀国" },
    219: { name: "马超", club: "蜀国" },
    220: { name: "马岱", club: "蜀国" },
    221: { name: "吕蒙", club: "吴国" },
    222: { name: "黄盖", club: "吴国" },
    223: { name: "蔡文姬", club: "魏国" },
    224: { name: "小乔", club: "吴国" },
    225: { name: "袁绍", club: "群雄" },
    226: { name: "华雄", club: "群雄" },
    227: { name: "颜良", club: "群雄" },
    228: { name: "文丑", club: "群雄" },
    301: { name: "周泰", club: "吴国" },
    302: { name: "许攸", club: "魏国" },
    303: { name: "于禁", club: "魏国" },
    304: { name: "张星彩", club: "蜀国" },
    305: { name: "关银屏", club: "蜀国" },
    306: { name: "关平", club: "蜀国" },
    307: { name: "程普", club: "吴国" },
    308: { name: "张昭", club: "吴国" },
    309: { name: "陆绩", club: "吴国" },
    310: { name: "吕玲绮", club: "群雄" },
    311: { name: "潘凤", club: "群雄" },
    312: { name: "邢道荣", club: "群雄" },
    313: { name: "祝融夫人", club: "蜀国" },
    314: { name: "孟获", club: "蜀国" },
  };

  /**
   * 灯神挑战
   * 按用户指定的势力（魏/蜀/吴/群/深海）逐层挑战灯神。魏蜀吴群玩法要求挑战某国时上阵 5 名该国武将，
   * 深海(5)不限阵营（任意阵容均可）；使用方式：统一使用手动指定的预设槽 targetFormation（1-6）挑战所有势力
   * （跨势力共用该队，若与该国阵营不符服务器会拒绝）；已取消"自动按势力匹配该国纯阵营队"。
   * 每次挑战由服务器按自身进度自动发起（role.genie 记录"已通关层"-1：12=已通关游戏内第13层、挑战第14层；日志显示通关层=值+1、挑战层=值+2），赢则继续下一层，
   * 失败/出错/次数用尽则停止该势力。次数周期：魏蜀吴群按"每日"（共享）、深海(5)按"每周一刷新"独立计数（键 pearl:genie:battle，固定 10 次）。
   * @param {number[]} [genieIds=[1,2,3,4]] - 要挑战的势力 id 列表（魏1/蜀2/吴3/群4/深海5）
   * @param {number} [formation=1] - 指定预设编号（1-6），所有势力共用该队；0/非法值回退为 1
   * @param {object|number} [options={}] - 附加配置；可传 { dailyLimit: 每日总次数上限(默认10) } 或直接传数字
   */
  const batchGenieChallenge = async (genieIds = [1, 2, 3, 4], formation = 0, options = {}) => {
    const genieOpts = options && typeof options === "object" ? options : { dailyLimit: Number(options) || undefined };
    const genieDailyLimit = Math.max(1, Math.floor(Number(genieOpts.dailyLimit) || 10));
    if (selectedTokens.value.length === 0)
      return;

    const targetGenieIds = Array.isArray(genieIds) && genieIds.length > 0
      ? genieIds.filter((g) => GENIE_NAMES[g] !== undefined)
      : [1, 2, 3, 4];
    if (targetGenieIds.length === 0) {
      message.warning("灯神挑战：请至少选择一个势力（魏/蜀/吴/群）");
      return;
    }
    // 阵容固定使用手动指定的预设槽（1-6），所有势力共用同一队；已取消"0=自动匹配该国纯阵营队"。
    // 兼容历史值 0 / 非法值：一律回退到阵容 1。
    let targetFormation = Math.floor(Number(formation));
    if (!(targetFormation >= 1 && targetFormation <= 6))
      targetFormation = 1;
    const targetGenieNames = targetGenieIds.map((g) => GENIE_NAMES[g]).join("、");

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processGenieChallenge = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始灯神挑战: ${token.name}（${targetGenieNames}）===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        if (shouldStop.value)
          return;

        // 1. 角色信息辅助：拉取 role（含灯神进度 role.genie 与今日统计）
        const fetchRole = async () => {
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );
          return res?.role || res?.data?.role || {};
        };

        // 灯神挑战次数上限：魏蜀吴群为"每日总次数"（四国共享，默认 10 次/天，dailyLimit 可配置）；
        // 深海(5)为"每周 10 次"（每周一 00:00 刷新，与深海灯神免费扫荡同步），固定上限 WEEKLY_GENIE_LIMIT
        const dailyLimit = genieDailyLimit;
        const WEEKLY_GENIE_KEY = "pearl:genie:battle"; // 深海挑战统计键：statistics=本周已用，statisticsTime=最近一次挑战时间
        const WEEKLY_GENIE_LIMIT = 10; // 深海挑战每周可挑战次数

        // 从 role 探测"已用灯神挑战次数"：
        // 魏蜀吴群按"今日"判定，服务器把次数记录在 role.statistics / role.statisticsTime（键随版本可能变化）；
        // 深海按"本周一 00:00 起"判定（statistics 值仅在最近一次挑战落在本周内时才计为本周已用，否则本周为 0）。
        const probeKeys = [
          "genie:challenge", "genie:battle", "genie:daily:challenge",
          "genie:daily:battle", "genie:fight", "genie:daily:fight",
        ];
        const today0 = new Date();
        today0.setHours(0, 0, 0, 0);
        const monday0 = new Date(today0);
        monday0.setDate(monday0.getDate() - ((monday0.getDay() + 6) % 7)); // 本周一 00:00
        const toMs = (v) => {
          if (v === undefined || v === null || v === "")
            return null;
          const n = Number(v);
          if (Number.isNaN(n))
            return null;
          return n < 1e12 ? n * 1000 : n; // 兼容秒/毫秒时间戳
        };
        const isToday = (v) => {
          const ms = toMs(v);
          return ms !== null && ms >= today0.getTime();
        };
        const isThisWeek = (v) => {
          const ms = toMs(v);
          return ms !== null && ms >= monday0.getTime();
        };
        const detectUsed = (role, genieId) => {
          const stats = (role && (role.statistics || role.stats)) || {};
          const timeMap = (role && (role.statisticsTime || role.statsTime)) || {};
          if (genieId === 5) {
            // 深海挑战：周计数。最近一次挑战在本周内 → statistics 即本周已用；不在本周/无记录 → 本周 0
            const rawUsed = Math.max(0, Math.floor(Number(stats[WEEKLY_GENIE_KEY]) || 0));
            return {
              key: WEEKLY_GENIE_KEY,
              used: isThisWeek(timeMap[WEEKLY_GENIE_KEY]) ? rawUsed : 0,
            };
          }
          for (const key of probeKeys) {
            if (isToday(timeMap[key])) {
              return { key, used: Math.max(0, Math.floor(Number(stats[key]) || 0)) };
            }
          }
          // 兜底：扫描所有含 genie 且今天有记录的键（排除免费扫荡/购买类与深海周计数键 pearl:genie:battle，取数值最大的作为挑战计数）
          const found = Object.keys(timeMap)
            .filter((k) => /genie|Genie/.test(k) && k !== WEEKLY_GENIE_KEY && isToday(timeMap[k]) && !/(free|sweep|buy|benefit)/i.test(k))
            .map((k) => ({ key: k, used: Math.max(0, Math.floor(Number(stats[k]) || 0)) }))
            .sort((a, b) => b.used - a.used);
          return found[0] || null;
        };

        const role = await fetchRole();
        if (shouldStop.value)
          return;
        const petUId = role?.pet?.petUId || role?.petUId || "";
        const detectedToday = detectUsed(role, targetGenieIds[0] || 1);
        let usedToday = detectedToday ? detectedToday.used : 0; // 已用次数（读不到时为本地计数）
        let usedTodayKnown = !!detectedToday;

        await new Promise((r) => setTimeout(r, _getModuleDelay('tower')));

        // 2. 获取预设队伍（阵容 + 主公武器）
        // 说明：每次 presetteam_getinfo 都是实时读取服务器，工具侧无缓存；
        // 但游戏端修改预设后到服务器之间可能存在同步窗口，因此在需要时可重复拉取（见下方 pickedNeedRefresh 逻辑）
        let presetInfo = {};
        let presetTeams = [];
        const loadPresetTeams = async () => {
          const presetTeamRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_getinfo",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );
          presetInfo =
            presetTeamRes?.presetTeamInfo?.presetTeamInfo
            || presetTeamRes?.presetTeamInfo
            || presetTeamRes?.presetTeamMap
            || {};
          // 解析全部预设阵容（编号 1..8），供"自动匹配该国纯阵营队"使用
          presetTeams = [];
          for (let pi = 1; pi <= 8; pi++) {
            const t = presetInfo[String(pi)] || presetInfo[pi] || {};
            if (t?.teamInfo && Object.keys(t.teamInfo).length > 0) {
              presetTeams.push({ no: pi, data: t });
            }
          }
        };
        // 提取队伍：上阵武将(槽位->heroId) + 主公武器
        const parseTeam = (td) => {
          const bt = {};
          for (const [slot, hero] of Object.entries(td?.teamInfo || {})) {
            if (hero?.heroId !== undefined && hero?.heroId !== null) {
              bt[slot] = hero.heroId;
            }
          }
          return { battleTeam: bt, lordWeaponId: Number(td?.weapon?.weaponId) || 0 };
        };
        // 阵营统计辅助
        const countClubs = (ids) => {
          const m = {};
          for (const h of ids) {
            const c = (GENIE_HERO_INFO[h] && GENIE_HERO_INFO[h].club) || "未知";
            m[c] = (m[c] || 0) + 1;
          }
          const parts = Object.entries(m).map(([c, n]) => `${c}${n}`);
          return parts.length ? parts.join("/") : "空";
        };
        // 摘要文本：全部预设槽的阵营统计 + 纯国队槽，用于核对服务器是否已同步游戏端修改
        const buildPresetSummary = () => {
          if (presetTeams.length === 0) return "";
          const slotsSummary = presetTeams
            .map((pt) => {
              const ids = Object.values(parseTeam(pt.data).battleTeam);
              return `#${pt.no}(${ids.length}人:${countClubs(ids)})`;
            })
            .join("  ");
          const pureSlots = presetTeams
            .filter((pt) => {
              const ids = Object.values(parseTeam(pt.data).battleTeam);
              const clubs = new Set(ids.map((h) => (GENIE_HERO_INFO[h] && GENIE_HERO_INFO[h].club) || ""));
              return ids.length >= 5 && clubs.size === 1;
            })
            .map((pt) => {
              const ids = Object.values(parseTeam(pt.data).battleTeam);
              return `#${pt.no}(纯${(GENIE_HERO_INFO[ids[0]] && GENIE_HERO_INFO[ids[0]].club) || ""})`;
            });
          return `${slotsSummary}${pureSlots.length ? `；纯国队槽：${pureSlots.join("、")}` : ""}`;
        };
        // 说明：presetteam_getinfo 每次都是实时读取服务器，工具侧无缓存；但游戏端刚保存预设时，
        // 服务器存在同步窗口（仅发 getinfo 会读到旧数据），需要"切换保存"动作触发服务器把账号最新预设
        // 同步到当前会话。这一点与"游戏功能→阵容卡片→刷新数据"按钮的内部逻辑一致：
        // getinfo → saveteam 切到 otherTeamId → saveteam 切回 useTeamId → 再 getinfo 即可拿到新预设。
        // 因此批量灯神挑战开始时先复用该同步机制，并在每个势力开始前重读一次（见下方循环内）。
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 正在同步服务器预设（复用"阵容→刷新数据"机制）...`,
          type: "info",
        });
        const syncPresetFromServer = async () => {
          const t = batchSettings.defaultCommandTimeout || 5000;
          const r1 = await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_getinfo",
            {},
            t,
          );
          const teams = r1?.presetTeamInfo?.presetTeamInfo || {};
          const ids = Object.keys(teams)
            .filter((k) => /^\d+$/.test(k))
            .map(Number)
            .sort((a, b) => a - b);
          const useId = r1?.presetTeamInfo?.useTeamId || 1;
          const otherId = ids.find((i) => i !== useId);
          if (otherId) {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "presetteam_saveteam",
              { teamId: otherId },
              t,
            );
            await new Promise((r) => setTimeout(r, 250));
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "presetteam_saveteam",
              { teamId: useId },
              t,
            );
            await new Promise((r) => setTimeout(r, 250));
          } else {
            // 只有一个预设槽时，仅做一次 saveteam 触发服务器同步
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "presetteam_saveteam",
              { teamId: useId },
              t,
            );
            await new Promise((r) => setTimeout(r, 250));
          }
        };
        try {
          await syncPresetFromServer();
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 预设同步失败，继续读取：${e?.message || e}`,
            type: "warning",
          });
        }
        if (shouldStop.value)
          return;
        await loadPresetTeams();
        const presetSummary = buildPresetSummary();
        let lastPresetSummary = presetSummary;
        if (presetSummary) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 服务器预设阵容：${presetSummary}`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 服务器未返回任何预设阵容数据`,
            type: "warning",
          });
        }
        // 灯神玩法：挑战某国灯神必须上阵 5 名该国武将。
        // 已取消"自动按势力匹配该国纯阵营队"：所有势力统一使用手动指定的预设槽 targetFormation（1-6）；
        // 该槽为空时跳过该势力；非该国纯队时仅警告，是否放行交由服务器校验。
        const pickTeamForGenie = () => {
          const t = presetInfo[String(targetFormation)] || presetInfo[targetFormation];
          if (t?.teamInfo && Object.keys(t.teamInfo).length > 0) {
            return { no: targetFormation, data: t, auto: false };
          }
          return null;
        };

        // 3. 逐个势力发起灯神挑战：role.genie 记录"已通关层"-1（如 12=已通关游戏内第13层），服务器按自身进度自动发起下一场战斗；
        //    日志显示：通关进度层 = 值+1，本场挑战层 = 值+2；赢则继续下一层，失败/出错/当日次数用尽则停止该势力（次数四国共享，用尽后不再挑战剩余势力）
        const MAX_ROUNDS = 25; // 安全上限（魏蜀吴群最高 17 层、深海 10 层，含冗余防御）
        for (const genieId of targetGenieIds) {
          if (shouldStop.value)
            break;

          // 每个势力开始挑战前重读一次服务器预设：批量运行期间在游戏端修改阵容也能被感知
          try {
            await loadPresetTeams();
          } catch (_) { /* 重读失败则沿用现有数据 */ }
          const curPresetSummary = buildPresetSummary();
          if (curPresetSummary && curPresetSummary !== lastPresetSummary) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已同步最新预设：${curPresetSummary}`,
              type: "info",
            });
            lastPresetSummary = curPresetSummary;
          }

          // 为该势力挑选阵容：所有势力统一使用手动指定的预设槽（1-6），跨势力共用该队
          const picked = pickTeamForGenie();
          if (!picked) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} ${GENIE_NAMES[genieId]}灯神：预设阵容${targetFormation}无效或为空，跳过该势力`,
              type: "warning",
            });
            continue;
          }
          const { battleTeam, lordWeaponId } = parseTeam(picked.data);
          if (Object.keys(battleTeam).length === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} ${GENIE_NAMES[genieId]}灯神：所选预设阵容${picked.no}没有有效上阵武将，跳过该势力`,
              type: "warning",
            });
            continue;
          }
          // 阵容武将明细与阵营分布（用于日志核对）
          const heroNames = [];
          const clubDist = {};
          for (const hid of Object.values(battleTeam)) {
            const info = GENIE_HERO_INFO[hid];
            heroNames.push(info?.name || hid);
            const c = info?.club || "未知";
            clubDist[c] = (clubDist[c] || 0) + 1;
          }
          const clubText = Object.entries(clubDist).map(([c, n]) => `${c}${n}`).join("、");

          let winCount = 0;
          let loseCount = 0;
          // 服务器 role.genie[genieId] 记录"已通关层"-1：值 12 = 已通关游戏内第 13 层，下次挑战游戏内第 14 层；
          // 通关后服务器自增 1（值 13 = 已通关第 14 层）。curIndex 直接保存服务器原值，
          // 日志显示：通关进度层 = curIndex+1，本场挑战层 = curIndex+2。
          let curIndex = Number(role.genie?.[genieId]);
          if (Number.isNaN(curIndex) || curIndex < 0)
            curIndex = 0;
          let exhaustToday = false; // 今日次数用尽标志（跨势力停止）

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 挑战${GENIE_NAMES[genieId]}灯神：当前进度通关在第${curIndex + 1}层，挑战第${curIndex + 2}层，使用${picked.auto ? "自动匹配" : "手动指定"}预设阵容${picked.no}（${heroNames.join("、")}）${usedTodayKnown ? `，${genieId === 5 ? "本周" : "今日"}已挑战 ${usedToday}/${dailyLimit} 次` : `（未能读取${genieId === 5 ? "本周" : "今日"}已用次数，本地按≤${dailyLimit}次控制，超限以服务器为准）`}`,
            type: "info",
          });
          // 深海(5)不限阵营，无需"该国纯阵营"校验；魏蜀吴群仍要求 5 名该国武将
          if (genieId !== 5 && !picked.auto && (clubDist[GENIE_NAMES[genieId]] || 0) < 5) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} ${GENIE_NAMES[genieId]}灯神：所选预设阵容${picked.no}并非纯${GENIE_NAMES[genieId]}队（${clubText}），服务器可能拒绝挑战，建议切换为"自动匹配"或使用该国纯阵营阵容`,
              type: "warning",
            });
          }
          if (genieId === 5) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `ℹ️ ${token.name} 深海灯神不限阵营（任意阵容均可挑战）`,
              type: "info",
            });
          }
          // 满层数：魏蜀吴群 17 层满，深海(5) 10 层满
          const maxLayerAll = genieId === 5 ? 10 : 17;

          for (let round = 0; round < MAX_ROUNDS; round++) {
            if (shouldStop.value || exhaustToday)
              break;

            // 已通关满层（role.genie 记录"已通关层"-1，满层时 curIndex+1 === maxLayerAll）
            if (curIndex + 1 >= maxLayerAll) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `✅ ${token.name} ${GENIE_NAMES[genieId]}灯神已全部通关（第${maxLayerAll}层满），无需挑战`,
                type: "success",
              });
              break;
            }

            // 次数用尽则停止（魏蜀吴群按日 / 深海按周，仅当能从 role 读到已用时生效）
            if (usedTodayKnown && usedToday >= dailyLimit) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `ℹ️ ${token.name} ${GENIE_NAMES[genieId]}灯神${genieId === 5 ? "本周" : "今日"}挑战次数已用尽（${usedToday}/${dailyLimit}），停止挑战`,
                type: "info",
              });
              exhaustToday = true;
              break;
            }

            const curLayer = curIndex + 2; // 本场实际挑战的游戏层号（服务器已通关层为 curIndex+1，下一层即 +2）
            let fightResp;
            let fightErrMsg = "";
            try {
              fightResp = await tokenStore.sendMessageWithPromise(
                tokenId,
                "fight_startgenie",
                { genieId, battleTeam, lordWeaponId, petUId },
                batchSettings.battleCommandTimeout || 12000,
              );
            } catch (fightErr) {
              // 200020：战斗未结算/服务器处理中，等待后重试一次
              if (fightErr.message?.includes("200020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${GENIE_NAMES[genieId]}灯神战斗服务器处理中(200020)，等待1秒后重试...`,
                  type: "warning",
                });
                await new Promise((r) => setTimeout(r, 1000));
                try {
                  fightResp = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "fight_startgenie",
                    { genieId, battleTeam, lordWeaponId, petUId },
                    batchSettings.battleCommandTimeout || 12000,
                  );
                } catch (e2) {
                  fightErrMsg = e2?.message || "";
                }
              } else {
                fightErrMsg = fightErr.message || "";
              }
            }

            if (!fightResp || fightErrMsg) {
              const errMsg = fightErrMsg || (fightResp && fightResp.code ? String(fightResp.code) : "");
              // 无剩余次数/未开放/已通关等情况视为正常结束
              if (errMsg.includes("2600040") || errMsg.includes("2600050") || errMsg.includes("2600080")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `ℹ️ ${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战结束（${errMsg}）`,
                  type: "info",
                });
                break;
              }
              // 3300040：服务器返回"当前势力层数已通关"，属正常结束（本地进度滞后于服务器时挑战到已通关层会触发）
              if (errMsg.includes("3300040")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `✅ ${token.name} ${GENIE_NAMES[genieId]}灯神：当前势力层数已通关（服务器拒绝第${curLayer}层挑战，3300040）`,
                  type: "success",
                });
                break;
              }
              // 3300020（33xxxx 为灯神模块错误码）：服务器拒绝本次挑战。
              // 实测确认该错误即"使用的阵容英雄不是对应的势力"（魏蜀吴群要求5名该国武将），
              // 重试无意义 → 直接提示调整阵容并停止本账号挑战。
              if (errMsg.includes("3300020")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: genieId === 5
                    ? `❌ ${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战被服务器拒绝(3300020)，无法挑战`
                    : `❌ ${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战被服务器拒绝(3300020)：使用的阵容英雄不是对应的势力，无法挑战。请切换为"自动匹配"或使用该国纯阵营阵容后重试`,
                  type: "error",
                });
                break;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战出错: ${errMsg || "未知错误"}`,
                  type: "error",
                });
                break;
              }
            }

            usedToday += 1; // 本地次数推进（若可读今日统计，随后按刷新结果校准）

            // 4. 判定胜负：
            //    - 战斗响应 battleData.result.sponsor=我方 / accept=守关（历史实现漏了 .result 层级导致误判失败）
            //    - 兜底：每场后刷新角色，若 role.genie 进度推进则视为胜利
            const bdResult = fightResp?.battleData?.result || {};
            const sponsorHp = Number(bdResult?.sponsor?.ext?.curHP);
            const acceptHp = Number(bdResult?.accept?.ext?.curHP);
            const hpOk = !Number.isNaN(sponsorHp) && !Number.isNaN(acceptHp);
            const winByHp = hpOk && sponsorHp > 0 && acceptHp === 0;

            // 刷新角色：校准进度层 + 更新今日已用次数
            let nextIndex = curIndex;
            let winByProgress = false;
            let refreshFailed = false;
            try {
              const freshRole = await fetchRole();
              const freshIdx = Number(freshRole?.genie?.[genieId]);
              if (!Number.isNaN(freshIdx)) {
                nextIndex = freshIdx;
                if (nextIndex > curIndex)
                  winByProgress = true;
              }
              const freshDetected = detectUsed(freshRole, genieId);
              if (freshDetected) {
                usedToday = freshDetected.used;
                usedTodayKnown = true;
              }
            } catch (e) {
              refreshFailed = true;
            }

            // 进度推进一定为胜；血量可读时以血量判定为准
            const isWin = winByProgress || (hpOk && winByHp);

            if (isWin) {
              winCount++;
              curIndex = Math.max(nextIndex, curIndex + 1);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战成功🎉${hpOk ? `（我方剩余${sponsorHp} / 敌方剩余${acceptHp}）` : ""}，当前进度第${curIndex + 1}层，下一层挑战第${curIndex + 2}层`,
                type: "success",
              });
            } else {
              loseCount++;
              if (!hpOk && refreshFailed) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层结果无法判定（血量字段缺失且角色刷新失败），继续重试该层`,
                  type: "warning",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${GENIE_NAMES[genieId]}灯神第${curLayer}层挑战失败（我方剩余${hpOk ? sponsorHp : "?"} / 敌方剩余${hpOk ? acceptHp : "?"}），失败不停止，稍后重试该层（直到打赢、今日次数用完或手动停止）`,
                  type: "warning",
                });
              }
              // 失败不停止该势力：等待后重试同一层，直到成功推进、今日次数用尽(上方检测)或手动停止
              await new Promise((r) => setTimeout(r, _getModuleDelay('tower')));
              continue;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('tower')));
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} ${GENIE_NAMES[genieId]}灯神挑战结束：${winCount}胜${loseCount}负${usedTodayKnown ? `（${genieId === 5 ? "本周" : "今日"}已挑战 ${usedToday}/${dailyLimit} 次）` : ""}${winCount > 0 ? `，已推进至第${curIndex + 1}层` : ""}`,
            type: "info",
          });

          if (exhaustToday)
            break; // 今日次数用尽，不再挑战剩余势力
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 灯神挑战完成（${targetGenieNames}） ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        const errText = error?.message || "";
        const friendlyErr = errText.includes("3300020")
          ? "使用的阵容英雄不是对应的势力，无法挑战"
          : errText.includes("3300040")
            ? "当前势力层数已通关"
            : errText || "未知错误";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 灯神挑战失败: ${friendlyErr}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    };

    await runStreaming(selectedTokens.value, processGenieChallenge);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processGenieChallenge);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量灯神挑战结束");
  };

  /**
   * 深海挑战（副本）
   * 深海即灯神第 5 个势力（genieId=5）：深海怪物 75xx 系列，不限阵营、最多 10 层（role.genie[5] 0-9 对应已通关 1-10 层）。
   * 使用方式：与灯神挑战一致，按账号设置中的"灯神预设阵容"（1-6）从服务器实时读取预设队进行挑战；
   * 战斗请求复用 fight_startgenie 且 genieId=5（见 xyzwWebSocket.js 命令注册）。
   * 次数规则：深海挑战与魏蜀吴群灯神相互独立，按"每周 10 次"计（每周一 00:00 刷新，抓包统计键 role.statistics["pearl:genie:battle"]）。
   * @param {number} [formation=1] - 指定预设编号（1-6）；0/非法值回退为 1
   * @param {object|number} [options={}] - 附加配置；可传 { weeklyLimit: 每周挑战次数上限(默认10) } 或直接传数字
   */
  const batchDeepSeaChallenge = async (formation = 0, options = {}) => {
    const weeklyLimit = options && typeof options === "object" ? Math.max(1, Math.floor(Number(options.weeklyLimit) || 10)) : Math.max(1, Math.floor(Number(options) || 10));
    if (selectedTokens.value.length === 0)
      return;
    // 深海挑战次数为"每周"周期，内部按 genieId=5 走周计数检测；dailyLimit 仅作为数值上限传入
    return batchGenieChallenge([5], formation, { dailyLimit: weeklyLimit });
  };

  return {
    batchbaoku13,
    batchbaoku45,
    batchmengjing,
    batchBuyDreamItems,
    batchGenieChallenge,
    batchDeepSeaChallenge,
  };
}
