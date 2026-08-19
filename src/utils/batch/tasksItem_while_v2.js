// 宝箱周按积分开箱 - while 循环实时查询模式（外部脚本参考版）
// 核心逻辑：每轮实时查询进度 → 按需开箱 → 边开边领补货 → 达标停止

const processOpenBoxByPoints_V2 = async (tokenId) => {
  if (shouldStop.value) return;

  tokenStatus.value[tokenId] = "running";
  const token = tokens.value.find((t) => t.id === tokenId);

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始按积分开箱 [实时查询版]: ${token.name} ===`,
      type: "info",
    });

    await ensureConnection(tokenId);

    // 🎯 辅助函数：实时查询活动进度
    const fetchProgress = async () => {
      try {
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "activity_get",
          {},
          5000,
        );
        const activity = res?.activity || res?.body?.activity || res;
        const myTotalInfo = activity?.myTotalInfo || {};
        const boxWeekInfo = myTotalInfo["2"]; // 2=宝箱周
        
        if (!boxWeekInfo) return null;
        
        const points = Number(boxWeekInfo.num || boxWeekInfo.score || boxWeekInfo.value || 0);
        const rounds = Number(boxWeekInfo.rounds || 0);
        return { points, rounds };
      } catch (e) {
        console.warn(`${token.name} 获取进度失败:`, e.message);
        return null;
      }
    };

    // 🎯 辅助函数：获取背包物品
    const fetchItems = async () => {
      try {
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          10000,
        );
        const role = roleRes?.role || roleRes?.data?.role || {};
        return role.items || {};
      } catch (e) {
        console.warn(`${token.name} 获取背包失败:`, e.message);
        return {};
      }
    };

    // 🎯 辅助函数：获取宝箱名称
    const getBoxName = (id) => {
      const names = { 
        2001: "木质宝箱", 
        2002: "青铜宝箱", 
        2003: "黄金宝箱", 
        2004: "铂金宝箱",
        2005: "钻石宝箱" 
      };
      return names[id] || `宝箱${id}`;
    };

    // 📊 初始化：查询起始进度和目标
    const initialProg = await fetchProgress();
    if (!initialProg) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 未获取到宝箱周活动数据，可能还未开启宝箱周`,
        type: "error",
      });
      tokenStatus.value[tokenId] = "failed";
      return;
    }

    const startProgress = (initialProg.rounds - 1) * TARGET_SCORE_PER_ROUND + initialProg.points;
    const currentRoundEnd = (Math.floor(startProgress / TARGET_SCORE_PER_ROUND) + 1) * TARGET_SCORE_PER_ROUND;
    const targetProgress = Math.min(MAX_ROUNDS * TARGET_SCORE_PER_ROUND, currentRoundEnd + (targetRounds - 1) * TARGET_SCORE_PER_ROUND);
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${token.name} 🎯 起始积分=${startProgress} 目标积分=${targetProgress}`,
      type: "info",
    });

    // 📦 初始查询背包
    let bagItems = await fetchItems();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${token.name} 背包持有：木质=${bagItems[2001]?.quantity || 0}, 青铜=${bagItems[2002]?.quantity || 0}, 黄金=${bagItems[2003]?.quantity || 0}, 铂金=${bagItems[2004]?.quantity || 0}`,
      type: "info",
    });

    // 🔁 WHILE 循环主逻辑（外部脚本 runRounds 参考模式）
    const boxPriority = [2002, 2003, 2004]; // 青铜→黄金→铂金优先级
    const BOX_POINTS = { 2001: 1, 2002: 10, 2003: 20, 2004: 50 };
    let loopCount = 0;
    const maxLoops = 500; // 防止死循环
    let totalOpened = 0;  // 统计总共开了多少个箱子

    while (loopCount < maxLoops && !shouldStop.value) {
      loopCount++;

      // 1️⃣ 查询当前进度
      const curProg = await fetchProgress();
      if (!curProg) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} ❌ 获取进度失败`,
          type: "error",
        });
        break;
      }

      const currentProgress = (curProg.rounds - 1) * TARGET_SCORE_PER_ROUND + curProg.points;
      
      // 2️⃣ 检查是否已达到目标
      if (currentProgress >= targetProgress) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 🎉 已达到目标 ${targetProgress} 积分！成功`,
          type: "success",
        });
        break;
      }

      const remain = targetProgress - currentProgress;

      // 每 20 次循环显示一次进度
      if (loopCount % 20 === 1) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} ⏱️ 进度：${currentProgress}/${targetProgress} (还需${remain}分 | 已开${totalOpened}个箱)`,
          type: "info",
        });
      }

      // 3️⃣ 按优先级尝试开箱（青铜/黄金/铂金优先）
      let opened = false;
      let lastBoxId = null;

      for (const boxId of boxPriority) {
        if (shouldStop.value) break;

        const stock = bagItems[boxId]?.quantity || 0;
        const pts = BOX_POINTS[boxId];

        // 至少需要 10 个箱子才够凑够所需积分
        if (stock < 10) continue;

        const maxBoxesByScore = Math.floor(remain / pts);
        if (maxBoxesByScore < 10) continue;

        // 每批最多开 100 个，且必须为 10 的倍数
        const actual = Math.floor(Math.min(100, maxBoxesByScore, stock) / 10) * 10;
        if (actual < 10) continue;

        // 开箱
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 📦 开${getBoxName(boxId)} ${actual}个 (+${actual * pts}分)`,
          type: "info",
        });

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_openbox",
            { itemId: boxId, number: actual },
            5000,
          );

          opened = true;
          lastBoxId = boxId;
          totalOpened += actual;

          // 每开高级箱就更新背包数据
          bagItems[boxId].quantity -= actual;

          await new Promise((r) => setTimeout(r, _getModuleDelay('openbox')));
          break; // 每次只开一种箱子

        } catch (openErr) {
          const errMsg = openErr.message || "";
          
          if (errMsg.includes("服务器错误：400000") || 
              errMsg.includes("400000") || 
              errMsg.includes("已上限") ||
              errMsg.includes("服务器错误：400010") || 
              errMsg.includes("400010") || 
              errMsg.includes("物品数量不足")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ⚠️ ${getBoxName(boxId)} 不足或已满，跳过`,
              type: "warning",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ❌ 开${getBoxName(boxId)} 失败：${errMsg}`,
              type: "error",
            });
          }
        }
      }

      // 4️⃣ 每开 5 个高级箱就尝试领取一次奖励补货
      if (opened && lastBoxId !== 2001 && totalOpened % 50 === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 🎁 尝试领取积分奖励补货...`,
          type: "info",
        });
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_batchclaimboxpointreward",
            {},
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} ✅ 已领取积分奖励`,
            type: "success",
          });
        } catch (claimErr) {
          const errMsg = claimErr.message || "";
          if (!errMsg.includes("已领取") && !errMsg.includes("1100010")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ⚠️ 领取奖励失败：${errMsg}`,
              type: "warning",
            });
          }
          // 领取成功后重新查询背包
          bagItems = await fetchItems();
        }
      }

      // 5️⃣ 高级箱不够，用木质宝箱补齐
      if (!opened && remain > 0) {
        // 首先尝试领取积分奖励获取新箱子
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} ⚠️ 无高级箱可开，尝试领取奖励补货...`,
          type: "info",
        });
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_batchclaimboxpointreward",
            {},
            5000,
          );
          await new Promise((r) => setTimeout(r, 300));

          // 重新查询青铜/黄金数量
          bagItems = await fetchItems();
          const newBronze = Math.floor(bagItems[2002]?.quantity || 0 / 10) * 10;
          const newGold = Math.floor(bagItems[2003]?.quantity || 0 / 10) * 10;
          if (newBronze >= 10 || newGold >= 10) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ✅ 补货到高级箱，继续开箱`,
              type: "info",
            });
            continue; // 进入下一轮循环
          }

        } catch (claimErr) {
          // 领取失败不影响继续用木质
        }

        // 用木质补齐（精确补足，不必是 10 的倍数）
        const woodStock = bagItems[2001]?.quantity || 0;
        if (woodStock <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} ❌ 所有宝箱用完`,
            type: "error",
          });
          break;
        }

        const wTake = Math.min(remain, woodStock, 50); // 木质每批最多 50 个
        if (wTake > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 🪵 开木质宝箱 ${wTake}个 (+${wTake}分)`,
            type: "info",
          });

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "item_openbox",
              { itemId: 2001, number: wTake },
              5000,
            );
            opened = true;
            totalOpened += wTake;
            
            // 更新背包
            bagItems[2001].quantity -= wTake;

            await new Promise((r) => setTimeout(r, _getModuleDelay('openbox')));

          } catch (woodErr) {
            const woodMsg = woodErr.message || "";
            if (!(woodMsg.includes("服务器错误：400000") || 
                  woodMsg.includes("400000") || 
                  woodMsg.includes("已上限") ||
                  woodMsg.includes("服务器错误：400010") || 
                  woodMsg.includes("400010") || 
                  woodMsg.includes("物品数量不足"))) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ❌ 开木质宝箱失败：${woodMsg}`,
                type: "error",
              });
            }
          }
        }
      }

      // 6️⃣ 如果本轮没打开任何箱子，说明库存不足或剩余积分太少
      if (!opened) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} ⚠️ 无法继续开箱（库存不足或剩余积分不足开 10 个箱子）`,
          type: "warning",
        });
        break;
      }

      // 延迟避免服务器压力
      await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
    }

    // 7️⃣ while 循环结束后：领取达标奖励（珍珠）
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${token.name} 🏆 准备领取宝箱周达标奖励（珍珠）...`,
      type: "info",
    });

    const finalActivityRes = await tokenStore.sendMessageWithPromise(
      tokenId,
      "activity_get",
      {},
      5000,
    );
    const finalActivity = finalActivityRes?.activity || finalActivityRes?.body?.activity || finalActivityRes;
    const finalMyTotalInfo = finalActivity?.myTotalInfo || {};
    const finalBoxWeekInfo = finalMyTotalInfo["2"];

    let claimedRewards = 0;
    
    if (finalBoxWeekInfo) {
      // 验证是否达标
      const finalRoundScore = Number(finalBoxWeekInfo.num || finalBoxWeekInfo.score || finalBoxWeekInfo.value || 0);
      const finalCurrentRound = Number(finalBoxWeekInfo.rounds || 0);
      
      if (finalRoundScore >= TARGET_SCORE_PER_ROUND) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 已达标第 ${finalCurrentRound} 轮，开始领取 5 档奖励...`,
          type: "info",
        });

        const rewardRetryMax = batchSettings.defaultRetryCount || 2;
        const rewardRetryWait = batchSettings.retryDelay || 60000;

        // 第一轮尝试领取
        for (let i = 0; i < 5 && !shouldStop.value; i++) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "activity_buystoregoods",
              { activityId: 7, goodsIndex: i, buyNum: 1 },
              5000,
            );
            claimedRewards++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ✅ 宝箱周达标奖励 ${i + 1}/5 成功`,
              type: "success",
            });
          } catch (e) {
            const errMsg = e.message || "";
            if (errMsg.includes("已领取") || errMsg.includes("1100010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ℹ️ 宝箱周达标奖励 ${i + 1}/5 已领取过`,
                type: "info",
              });
              claimedRewards++;
            } else if (errMsg.includes("200020") || errMsg.includes("服务器错误")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ⚠️ 宝箱周达标奖励 ${i + 1}/5 失败 (${errMsg})，可能还未达标，将稍后重试...`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ❌ 领取宝箱周达标奖励 ${i + 1}/5 失败：${errMsg}`,
                type: "error",
              });
            }
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        // 重试机制
        if (claimedRewards < 5) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 有 ${5 - claimedRewards} 档达标奖励未领取，开始重试...`,
            type: "info",
          });

          for (let r = 0; r < rewardRetryMax && !shouldStop.value; r++) {
            for (let i = claimedRewards; i < 5; i++) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "activity_buystoregoods",
                  { activityId: 7, goodsIndex: i, buyNum: 1 },
                  5000,
                );
                claimedRewards++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ✅ 宝箱周达标奖励 ${i + 1}/5 重试成功`,
                  type: "success",
                });
              } catch (retryE) {
                const retryMsg = retryE.message || "";
                if (retryMsg.includes("已领取") || retryMsg.includes("1100010")) {
                  claimedRewards++;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ℹ️ 宝箱周达标奖励 ${i + 1}/5 已领取过`,
                    type: "info",
                  });
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ❌ 宝箱周达标奖励 ${i + 1}/5 重试失败 (${retryMsg})`,
                    type: "warning",
                  });
                }
              }
              await new Promise((r) => setTimeout(r, 300));
            }

            if (!shouldStop.value) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${r + 1}/${rewardRetryMax}轮重试结束，成功 ${claimedRewards}/5`,
                type: "info",
              });
            }

            if (r < rewardRetryMax - 1 && !shouldStop.value) {
              await new Promise((r2) => setTimeout(r2, rewardRetryWait));
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 🏆 宝箱周达标奖励最终结果：${claimedRewards}/5`,
          type: "success",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} ⚠️ 未达到目标轮数，不领取达标奖励`,
          type: "warning",
        });
      }
    }

    tokenStatus.value[tokenId] = "completed";
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${token.name} 按积分开箱完成 (共开${totalOpened}个箱) ===`,
      type: "success",
    });
  } catch (error) {
    console.error(error);
    tokenStatus.value[tokenId] = "failed";
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${token.name} 按积分开箱失败：${error.message}`,
      type: "error",
    });
  } finally {
    tokenStore.closeWebSocketConnection(tokenId);
    releaseConnectionSlot();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${token.name} 连接已关闭  (队列：${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });
  }
};
