import { isDungeonOpen, merchantConfig } from "@/utils/dreamConstants";

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

  // 模块延迟辅助函数
  const _getModuleDelay = getModuleDelay || ((moduleName) => {
    const md = batchSettings.moduleDelays;
    if (md) return md[moduleName] || md.default || batchSettings.taskDelay || 1000;
    return batchSettings.taskDelay || 1000;
  });

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
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
            await new Promise((r) => setTimeout(r, _getModuleDelay('treasure')));
          }
          for (let i = 0; i < 9; i++) {
            if (shouldStop.value)
              break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startbox",
              {},
            );
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
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
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
        const maxFights = 200; // 安全上限，防止无限循环

        while (fightCount < maxFights) {
          if (shouldStop.value) break;

          try {
            // 6a. 发起梦境战斗
            const fightResult = await tokenStore.sendMessageWithPromise(
              tokenId,
              "fight_startdungeon",
              { heroId },
              15000,
            );

            fightCount++;
            const isWin = fightResult?.isWin;
            const dungeonId = fightResult?.dungeonId || fightResult?.stageId || 0;
            const star = fightResult?.star || 0;

            if (isWin) {
              winCount++;
            } else {
              loseCount++;
            }

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 第${fightCount}场${isWin ? "胜利" : "失败"}${star ? `（${star}星）` : ""}`,
              type: isWin ? "success" : "warning",
            });

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

  return {
    batchbaoku13,
    batchbaoku45,
    batchmengjing,
    batchBuyDreamItems,
  };
}
