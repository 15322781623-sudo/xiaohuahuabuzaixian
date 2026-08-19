/**
 * 商店类任务
 * 包含: legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, collection_claimfreereward
 */

import { getActivityStatus } from "./connectionManager.js";
import { getModuleDelayCompat } from "@/utils/batch/delayManager";
import { getFirstSaturdayOfMonth, getLastSaturday } from "@/utils/clubBattleUtils";

/**
 * 创建商店类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksStore(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    tokenFailReasons,
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
    safeDelay,
  } = deps;

  // 使用集中式延迟管理器（兼容新旧API）
  const _getModuleDelay = (moduleName) => {
    if (getModuleDelay) return getModuleDelay(moduleName);
    return getModuleDelayCompat(moduleName, batchSettings);
  };

  // 记录每个Token本月是否已领取助威币 { tokenId: { month: '2026-01', claimed: true } }
  // 从localStorage加载持久化数据
  const STORAGE_KEY = "guess_coin_claimed_records";
  const guessCoinClaimed = (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load guess coin claimed records:", error);
      return {};
    }
  })();

  // 保存领取记录到localStorage
  const saveGuessCoinClaimed = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guessCoinClaimed));
    } catch (error) {
      console.error("Failed to save guess coin claimed records:", error);
    }
  };

  // 助威商店购买配置 { tokenId: { selectedItems: [7, 8, 9], buyCounts: { 7: 1, 8: 1, 9: 1 } } }
  const legionStoreConfig = {};

  /**
   * 一键购买四圣碎片
   */
  const legion_storebuygoods = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始购买四圣碎片: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送购买请求...`,
          type: "info",
        });
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_storebuygoods",
          { id: 6 },
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        if (result.error) {
          if (result.error.includes("购买数量上限无法进行购买")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 本周已购买过四圣碎片，跳过`,
              type: "info",
            });
          } else if (result.error.includes("物品不存在")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 盐锭不足或未加入军团，购买失败`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 购买失败: ${result.error}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买成功，获得四圣碎片`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 一键购买俱乐部5皮肤币
   */
  const legionStoreBuySkinCoins = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始购买俱乐部5皮肤币: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送购买请求...`,
          type: "info",
        });

        let result = null;
        for (let i = 0; i < 5; i++) {
          if (shouldStop.value)
            break;
          result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_storebuygoods",
            { id: 1 },
            batchSettings.defaultCommandTimeout || 5000,
          );

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        }

        if (result && result.error) {
          if (result.error.includes("购买数量上限无法进行购买")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 本周已购买过皮肤币，跳过`,
              type: "info",
            });
          } else if (result.error.includes("物品不存在")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 盐锭不足或未加入军团，购买失败`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 购买失败: ${result.error}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买成功，获得皮肤币`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 一键购买红玉
   */
  const legion_buy_red_jade = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始购买红玉: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let result = null;
        for (let i = 0; i < 5; i++) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 发送第${i + 1}次购买请求...`,
            type: "info",
          });

          result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_storebuygoods",
            { id: 202 },
            batchSettings.defaultCommandTimeout || 5000,
          );

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

          if (result && result.error) {
            if (result.error.includes("购买数量上限无法进行购买")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 红玉购买已达上限，停止购买`,
                type: "info",
              });
              break;
            } else if (result.error.includes("物品不存在")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 盐锭不足或未加入军团，购买失败`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
              break;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 购买红玉失败: ${result.error}`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
              break;
            }
          }
        }

        if (result && !result.error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买红玉成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 一键购买斑点蛋
   */
  const legion_buy_spotted_egg = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始购买斑点蛋: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let result = null;
        for (let i = 0; i < 4; i++) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 发送第${i + 1}次购买请求...`,
            type: "info",
          });

          result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_storebuygoods",
            { id: 205 },
            batchSettings.defaultCommandTimeout || 5000,
          );

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

          if (result && result.error) {
            if (result.error.includes("购买数量上限无法进行购买")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 斑点蛋购买已达上限，停止购买`,
                type: "info",
              });
              break;
            } else if (result.error.includes("物品不存在")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 盐锭不足或未加入军团，购买失败`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
              break;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 购买斑点蛋失败: ${result.error}`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
              break;
            }
          }
        }

        if (result && !result.error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买斑点蛋成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 盐晶商店多选购买
   * 根据 saltCrystalShopConfig 配置购买商品
   * 配置格式: [{ id: 202, name: "红玉", count: 5 }, ...]
   */
  const saltCrystalShopConfig = ref([
    { id: 201, name: "四圣蓝玉", count: 0, limit: 60, cost: 10 },
    { id: 202, name: "四圣红玉", count: 5, limit: 50, cost: 10 },
    { id: 203, name: "成长脆饼", count: 0, limit: 60, cost: 10 },
    { id: 204, name: "幻彩灵果", count: 0, limit: 60, cost: 10 },
    { id: 205, name: "斑点蛋", count: 5, limit: 5, cost: 1 },
  ]);

  const salt_crystal_shop_buy = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 只购买 count > 0 的商品
    const buyList = saltCrystalShopConfig.value.filter((item) => item.count > 0);
    if (buyList.length === 0) {
      isRunning.value = false;
      return;
    }

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      if (!token) {
        tokenStatus.value[tokenId] = "failed";
        return;
      }

      try {
        await ensureConnection(tokenId);
        if (shouldStop.value) return;

        // 通过 role_getroleinfo 获取背包盐晶数量 (item ID 1038)
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          8000,
        );


        const items = roleRes?.role?.items || roleRes?.role?.itemList || null;
        const saltCrystal = items?.[1038]?.num ?? items?.[1038]?.quantity ?? (typeof items?.[1038] === "number" ? items[1038] : "未知");
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐晶数量: ${saltCrystal}`,
          type: "info",
        });

        // 预校验：根据盐晶余额调整各商品购买次数
        let remainingCrystal = typeof saltCrystal === "number" ? saltCrystal : Infinity;
        const adjustedBuyList = buyList.map(item => ({ ...item, originalCount: item.count }));
        for (const item of adjustedBuyList) {
          if (remainingCrystal <= 0 || remainingCrystal < item.cost) {
            item.count = 0;
            continue;
          }
          const maxAffordable = Math.floor(remainingCrystal / item.cost);
          if (maxAffordable < item.count) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 盐晶不足，${item.name} 购买次数从 ${item.count} 调整为 ${maxAffordable}`,
              type: "info",
            });
            item.count = maxAffordable;
          }
          remainingCrystal -= item.cost * item.count;
        }
        const finalBuyList = adjustedBuyList.filter(item => item.count > 0);
        if (finalBuyList.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 盐晶数量不足，无法购买任何商品，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 依次购买每种商品
        let totalSuccess = 0;
        for (const item of finalBuyList) {
          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始购买 ${item.name} (${item.count}次)`,
            type: "info",
          });

          for (let i = 0; i < item.count; i++) {
            if (shouldStop.value) break;

            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_storebuygoods",
              { id: item.id, num: 1 },
              8000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result?.error) {
              if (result.error.includes("购买数量上限") || result.error.includes("2300370")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${item.name} 已达购买上限，停止`,
                  type: "info",
                });
                break;
              } else if (result.error.includes("物品不存在") || result.error.includes("盐锭不足")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 盐晶不足或未加入军团，停止购买`,
                  type: "warning",
                });
                break;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 购买${item.name}失败: ${result.error}`,
                  type: "warning",
                });
                break;
              }
            }
            totalSuccess++;
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐晶商店购买完成，共成功 ${totalSuccess} 次`,
          type: totalSuccess > 0 ? "success" : "info",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        const errMsg = error.message?.includes("2300370") ? "商品已售出无法购买" : error.message;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐晶商店购买异常: ${errMsg}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 盐锭商店多选购买
   * 根据 saltIngotShopConfig 配置购买商品
   */
  const saltIngotShopConfig = ref([
    { id: 1, name: "皮肤币", count: 0, limit: 5, cost: 2 },
    { id: 2, name: "军团币", count: 0, limit: 1, cost: 100 },
    { id: 3, name: "进阶石", count: 0, limit: 1, cost: 100 },
    { id: 4, name: "精铁", count: 0, limit: 1, cost: 100 },
    { id: 5, name: "白玉", count: 0, limit: 1, cost: 100 },
    { id: 6, name: "四圣宝珠碎片", count: 1, limit: 1, cost: 40 },
  ]);

  const salt_ingot_shop_buy = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const buyList = saltIngotShopConfig.value.filter((item) => item.count > 0);
    if (buyList.length === 0) {
      isRunning.value = false;
      return;
    }

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      if (!token) {
        tokenStatus.value[tokenId] = "failed";
        return;
      }

      try {
        await ensureConnection(tokenId);
        if (shouldStop.value) return;

        // 通过 role_getroleinfo 获取背包盐锭数量 (item ID 1019)
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          8000,
        );

        const items = roleRes?.role?.items || roleRes?.role?.itemList || null;
        const saltIngot = items?.[1019]?.num ?? items?.[1019]?.quantity ?? (typeof items?.[1019] === "number" ? items[1019] : "未知");
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐锭数量: ${saltIngot}`,
          type: "info",
        });

        // 预校验：根据盐锭余额调整各商品购买次数
        let remainingIngot = typeof saltIngot === "number" ? saltIngot : Infinity;
        const adjustedBuyList = buyList.map(item => ({ ...item, originalCount: item.count }));
        for (const item of adjustedBuyList) {
          if (remainingIngot <= 0 || remainingIngot < item.cost) {
            item.count = 0;
            continue;
          }
          const maxAffordable = Math.floor(remainingIngot / item.cost);
          if (maxAffordable < item.count) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 盐锭不足，${item.name} 购买次数从 ${item.count} 调整为 ${maxAffordable}`,
              type: "info",
            });
            item.count = maxAffordable;
          }
          remainingIngot -= item.cost * item.count;
        }
        const finalBuyList = adjustedBuyList.filter(item => item.count > 0);
        if (finalBuyList.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 盐锭数量不足，无法购买任何商品，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        let totalSuccess = 0;
        for (const item of finalBuyList) {
          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始购买 ${item.name} (${item.count}次)`,
            type: "info",
          });

          for (let i = 0; i < item.count; i++) {
            if (shouldStop.value) break;

            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_storebuygoods",
              { id: item.id, num: 0 },
              8000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result?.error) {
              if (result.error.includes("购买数量上限") || result.error.includes("2300370")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${item.name} 已达购买上限，停止`,
                  type: "info",
                });
                break;
              } else if (result.error.includes("物品不存在") || result.error.includes("盐锭不足") || result.error.includes("盐晶不足")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 盐锭不足或未加入军团，停止购买`,
                  type: "warning",
                });
                break;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 购买${item.name}失败: ${result.error}`,
                  type: "warning",
                });
                break;
              }
            }
            totalSuccess++;
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐锭商店购买完成，共成功 ${totalSuccess} 次`,
          type: totalSuccess > 0 ? "success" : "info",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        const errMsg = error.message?.includes("2300370") ? "商品已售出无法购买" : error.message;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐锭商店购买异常: ${errMsg}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 免费领取珍宝阁每日奖励
   */
  const collection_claimfreereward = async () => {
    if (selectedTokens.value.length === 0)
      return;
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
          message: `=== 开始免费领取珍宝阁: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送珍宝阁免费领取请求...`,
          type: "info",
        });
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "collection_claimfreereward",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        if (result.error) {
          // 12000116错误：今日已领取免费奖励
          if (result.error.includes("12000116") || result.error.includes("已领取")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 珍宝阁免费礼包已领取`,
              type: "info",
            });
            tokenStatus.value[tokenId] = "completed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 珍宝阁领取失败: ${result.error}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 珍宝阁领取成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 珍宝阁领取过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 黑市一键采购
   */
  const store_purchase = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始黑市一键采购: ${token.name} ===`,
          type: "info",
        });

        // 检查今天是否已经执行过
        const today = new Date().toISOString().split("T")[0]; // 格式: YYYY-MM-DD
        const lastRunKey = `store_purchase_last_run_${tokenId}`;
        const lastRunDate = localStorage.getItem(lastRunKey);

        if (lastRunDate === today) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 今日已执行过黑市采购，跳过`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送黑市采购请求...`,
          type: "info",
        });
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "store_purchase",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        if (result.error) {
          // 错误码1300050表示需要修改采购次数，尝试购买青铜宝箱作为兜底
          if (result.error.includes("1300050")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 黑市采购次数异常，尝试购买青铜宝箱作为兜底...`,
              type: "warning",
            });

            try {
              // 调用购买青铜宝箱
              const bronzeResult = await tokenStore.sendMessageWithPromise(
                tokenId,
                "market_buy",
                { goodsId: 1, buyNum: 1 },
                batchSettings.defaultCommandTimeout || 5000,
              );

              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

              if (bronzeResult.error) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 青铜宝箱购买失败: ${bronzeResult.error}`,
                  type: "error",
                });
                tokenStatus.value[tokenId] = "failed";
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 青铜宝箱购买成功（兜底）`,
                  type: "success",
                });
                // 记录今天已执行
                localStorage.setItem(lastRunKey, today);
                tokenStatus.value[tokenId] = "completed";
              }
            } catch (bronzeError) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 青铜宝箱购买过程出错: ${bronzeError.message}`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 黑市采购失败: ${result.error}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          }
        } else {
          // 执行成功，记录今天的日期
          localStorage.setItem(lastRunKey, today);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 黑市采购成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 黑市采购过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 多选购买商品（轮次优先模式）
   * 每轮遍历所有商品各买一次，每轮开始前获取最新商品列表，已购买的跳过
   * 每轮结束后刷新商店（最后一轮除外），使下轮可重新购买
   * @param {Array<{goodsId: number, name: string, count: number}>} items - 商品列表
   */
  const store_buy_selectable = async (items) => {
    // ✅ 移除冗余 debug 日志（2026-07-13 清理）
    
    if (!items || items.length === 0) {
      return;
    }
    if (selectedTokens.value.length === 0) {
      return;
    }

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
          message: `=== 开始多选购买：${token.name} ===`,
          type: "info",
        });
        
        await ensureConnection(tokenId);

        // 获取角色信息
        await tokenStore.sendGetRoleInfo(tokenId);
        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // 初始化每种商品的购买进度
        const buyProgress = items.map(item => ({
          ...item,
          purchased: 0,
          count: item.count || 1,
          stopped: false,
        }));

        // 轮次优先模式：每轮遍历所有商品各买一次，买前刷新商店
        const maxRound = Math.max(...buyProgress.map(i => i.count));
        let totalSkip = 0;
        let totalFail = 0;

        for (let round = 0; round < maxRound; round++) {
          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} --- 第 ${round + 1}/${maxRound} 轮购买 ---`,
            type: "info",
          });

          // 第一轮不需要检查已购状态，后续轮次调用 store_goodslist 仅用于诊断日志
          if (round > 0) {
            try {
              const listResult = await tokenStore.sendMessageWithPromise(
                tokenId,
                "store_goodslist",
                { storeId: 1 },
                batchSettings.defaultCommandTimeout || 5000,
              );
              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
              // ✅ 商品列表诊断信息已移除（2026-07-13 清理）
            } catch (e) {
              // ✅ 获取商品列表异常已在 addLog 中处理
            }
          }

          let roundHasAction = false;

          for (const item of buyProgress) {
            if (shouldStop.value) break;

            // 本地计数判定：如果本地已购买次数 >= 设定次数，跳过
            if (item.purchased >= item.count) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 商品 ${item.name || item.goodsId} 已完成购买(${item.purchased}/${item.count})，跳过`,
                type: "info",
              });
              totalSkip++;
              continue;
            }
            if (item.stopped) continue;

            roundHasAction = true;

            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "store_buy",
                { goodsId: item.goodsId },
                batchSettings.defaultCommandTimeout || 5000,
              );
              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

              if (result.error) {
                totalFail++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 购买${item.name}失败: ${result.error}`,
                  type: "error",
                });
                // 购买失败不中断，继续尝试其他商品
              } else {
                item.purchased++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 购买${item.name}成功 (${item.purchased}/${item.count})`,
                  type: "success",
                });
              }
            } catch (e) {
              totalFail++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 购买${item.name}异常: ${e.message}`,
                type: "error",
              });
            }
          }

          // 每轮结束后刷新商店（最后一轮不需要）
          if (round < maxRound - 1 && roundHasAction) {
            try {
              const refreshResult = await tokenStore.sendMessageWithPromise(
                tokenId,
                "store_refresh",
                { storeId: 1 },
                batchSettings.defaultCommandTimeout || 5000,
              );
              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
              // ✅ 商品刷新结果已在 addLog 中记录
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 商店刷新失败(第${round + 1}轮): ${e.message}，继续下一轮`,
                type: "warning",
              });
            }
          }
        }

        const totalPurchased = buyProgress.reduce((sum, i) => sum + i.purchased, 0);
        const totalPlanned = buyProgress.reduce((sum, i) => sum + i.count, 0);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 多选购买完成: 成功${totalPurchased}/${totalPlanned}，跳过${totalSkip}，失败${totalFail}`,
          type: "info",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 多选购买出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 珍宝阁商店购买（图鉴积分兑换）
   * @param {Array<{goodsId: number, name: string, count: number}>} items - 商品列表
   */
  const batchCollectionExchange = async (items) => {
    if (!items || items.length === 0) {
      return;
    }
    if (selectedTokens.value.length === 0) {
      return;
    }

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
          message: `=== 开始珍宝阁商店购买: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);
        await tokenStore.sendGetRoleInfo(tokenId);
        await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

        let totalSuccess = 0;
        let totalFail = 0;

        for (const item of items) {
          if (shouldStop.value) break;

          for (let i = 0; i < item.count; i++) {
            if (shouldStop.value) break;

            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "collection_exchange",
                { goodsId: item.goodsId, goodsNum: 1 },
                10000,
              );

              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

              if (result.error) {
                totalFail++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 兑换${item.name}失败: ${result.error}`,
                  type: "error",
                });
                // 单个失败继续下一个商品
                break;
              } else {
                totalSuccess++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 兑换${item.name}成功 (${i + 1}/${item.count})`,
                  type: "success",
                });
              }
            } catch (e) {
              totalFail++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 兑换${item.name}异常: ${e.message}`,
                type: "error",
              });
              break;
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 珍宝阁商店购买完成: 成功${totalSuccess}，失败${totalFail}`,
          type: "info",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 珍宝阁商店购买出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 免费扭蛋
   */
  const gacha_drawreward = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    // 记录需要重试的账号（200020错误）
    const retryTokens = [];
    const maxRetries = 1; // 最多重试1次

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
          message: `=== 开始免费扭蛋: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送免费扭蛋请求...`,
          type: "info",
        });
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "gacha_drawreward",
          { isGroup: false, num: 1 },
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 免费扭蛋成功`,
          type: "success",
        });
      } catch (error) {
        const errorMsg = error.message || "";
        // 400000/物品不存在/已上限：扭蛋已达上限，继续尝试领取累抽奖励
        if (errorMsg.includes("400000") || errorMsg.includes("物品不存在") || errorMsg.includes("已上限")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 免费扭蛋已上限`,
            type: "info",
          });
        } else {
          // 其他错误（如200020），标记失败，但仍尝试累抽奖励
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 免费扭蛋失败: ${errorMsg}`,
            type: "warning",
          });
        }
      }

      // 无论扭蛋成功还是已上限，都尝试领取累抽奖励
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 尝试领取累抽奖励...`,
          type: "info",
        });

        for (let stageId = 1; stageId <= 10; stageId++) {
          if (shouldStop.value) break;
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "gacha_claimstagereward",
              { stageId },
              batchSettings.defaultCommandTimeout || 5000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 累抽奖励 第${stageId}层 领取成功`,
              type: "success",
            });
          } catch (stageError) {
            const stageErrorMsg = stageError.message || "";
            if (stageErrorMsg.includes("200370") || stageErrorMsg.includes("3500020")
              || stageErrorMsg.includes("400000") || stageErrorMsg.includes("物品不存在")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 累抽奖励 第${stageId}层 已领取，跳过`,
                type: "info",
              });
              continue; // 已领取，跳过检查下一层
            }
            // 未达标或其他错误，直接停止
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 累抽奖励 第${stageId}层 未达标，停止`,
              type: "info",
            });
            break;
          }
        }

        tokenStatus.value[tokenId] = "completed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    // 处理需要重试的账号（200020错误）
    if (retryTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 发现 ${retryTokens.length} 个账号出现200020错误，等待1分钟后开始重试 ===`,
        type: "info",
      });

      // 等待1分钟后开始重试
      if (!(await safeDelay(60000))) { isRunning.value = false; return; }

      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        if (shouldStop.value || retryTokens.length === 0)
          break;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n--- 第 ${retryCount + 1} 轮重试 (${retryTokens.length} 个账号) ---`,
          type: "info",
        });

        const failedTokens = [];

        await runStreaming(retryTokens.map(r => r.tokenId), async (tokenId) => {
          if (shouldStop.value) return;
          const retryToken = retryTokens.find(r => r.tokenId === tokenId);
          if (!retryToken) return;
          const { tokenName } = retryToken;
          tokenStatus.value[tokenId] = "running";

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试免费扭蛋...`,
              type: "info",
            });

            await ensureConnection(tokenId);

            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "gacha_drawreward",
              { isGroup: false, num: 1 },
              batchSettings.defaultCommandTimeout || 5000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result.error) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 重试免费扭蛋失败: ${result.error}`,
                type: "error",
              });
              failedTokens.push(retryToken);
              tokenStatus.value[tokenId] = "failed";
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${tokenName} 重试免费扭蛋成功`,
                type: "success",
              });
              tokenStatus.value[tokenId] = "completed";
            }
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 重试免费扭蛋过程出错: ${error.message}`,
              type: "error",
            });
            failedTokens.push(retryToken);
            tokenStatus.value[tokenId] = "failed";
          } finally {
            tokenStore.closeWebSocketConnection(tokenId);
            releaseConnectionSlot();
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
              type: "info",
            });
          }
        });

        // 更新重试列表
        retryTokens.length = 0;
        retryTokens.push(...failedTokens);

        // 如果还有失败账号，等待后继续下一轮重试
        if (failedTokens.length > 0 && retryCount < maxRetries - 1) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `等待1分钟后进行下一轮重试...`,
            type: "info",
          });
          if (!(await safeDelay(60000))) break;
        }
      }

      // 最终统计
      const successCount = selectedTokens.value.length - retryTokens.length;
      const failedCount = retryTokens.length;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 批量重试完成 ===`,
        type: "info",
      });

      if (failedCount > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `重试后仍失败的账号 (${failedCount} 个):`,
          type: "error",
        });
        retryTokens.forEach(({ tokenName }) => {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `  - ${tokenName}`,
            type: "error",
          });
        });
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n总计: 成功 ${successCount} 个 | 最终失败 ${failedCount} 个`,
        type: successCount > 0 ? "success" : "error",
      });
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 星级抽奖 - 按顺序执行：1级 → 2级 → 3级，抽到无法抽取为止
   * itemId: 36997(1级), 36998(2级), 36999(3级) 对应不同星级奖池
   */
  const star_drawturntable = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 奖池配置 - 设置最大抽取次数
    const pools = [
      { itemId: 36997, name: "一星级抽奖", maxDraws: 5 },
      { itemId: 36998, name: "二星级抽奖", maxDraws: 4 },
      { itemId: 36999, name: "三星级抽奖", maxDraws: 3 },
    ];

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始星级抽奖: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 先领取星级抽奖次数（即使失败也继续抽奖）
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取星级抽奖次数...`,
            type: "info",
          });

          const starRewardResult = await tokenStore.sendMessageWithPromise(
            tokenId,
            "nmext_claimstarreward",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );

          if (starRewardResult && starRewardResult.error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 星级奖励领取提示: ${starRewardResult.error}`,
              type: "info",
            });
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        } catch (starError) {
          if (starError.message.includes("200020")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已领取抽奖次数`,
              type: "info",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取星级奖励异常: ${starError.message}`,
              type: "info",
            });
          }
        }

        // 按顺序执行：1级 → 2级 → 3级，单个奖池失败不影响其他奖池
        for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
          if (shouldStop.value)
            break;

          const pool = pools[poolIndex];

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `------ [${poolIndex + 1}/${pools.length}] ${token.name} ${pool.name} (最多${pool.maxDraws}次) ------`,
            type: "info",
          });

          let totalDraws = 0;
          let poolFailed = false;

          try {
            // 循环抽取当前奖池，直到达到最大次数或无法抽取为止
            while (!poolFailed && totalDraws < pool.maxDraws && !shouldStop.value) {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "nmext_drawturntable",
                { itemId: pool.itemId },
                batchSettings.defaultCommandTimeout || 5000,
              );

              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

              if (result && result.error) {
                // 检查是否是400010错误码（物品数量不足）
                if (result.error.includes("400010")) {
                  const starLevel = poolIndex + 1;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${starLevel}星抽奖没次数无法抽奖`,
                    type: "info",
                  });
                } else if (result.error.includes("7100684")) {
                  // 7100684错误码：没有获取到抽奖次数
                  const starLevel = poolIndex + 1;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${starLevel}星抽奖没有获取到抽奖次数`,
                    type: "info",
                  });
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${pool.name}已达上限: ${result.error}`,
                    type: "info",
                  });
                }
                break; // 达到上限，退出当前奖池
              } else {
                totalDraws++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${pool.name}第${totalDraws}次成功`,
                  type: "success",
                });
              }
            }
          } catch (poolError) {
            // 检查是否是7100684错误码（没有获取到抽奖次数）
            if (poolError.message.includes("7100684")) {
              const starLevel = poolIndex + 1;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${starLevel}星抽奖没有获取到抽奖次数`,
                type: "info",
              });
              // 7100684不设置poolFailed，继续下一个奖池
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${pool.name}执行出错: ${poolError.message}`,
                type: "error",
              });
              poolFailed = true;
            }
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} ${pool.name}完成，共抽${totalDraws}次`,
            type: "success",
          });

          // 输出分隔线，明确显示进入下一级（即使当前奖池失败也继续下一级）
          if (poolIndex < pools.length - 1) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `------ ${token.name} ${pool.name}结束，准备进入${pools[poolIndex + 1].name} ------`,
              type: "info",
            });
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 星级抽奖全部完成 ===`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        if (error.message.includes("200020")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 星级抽奖次数已上限`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 星级抽奖过程出错: ${error.message}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
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
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

   /**
   * 十殿抽奖 - 抽到不动为止
   */
  const nightmare_draw_lottery = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;
    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // ✅ 可重试错误码：400340、200750、11800010
    const RETRYABLE_CODES = ["400340", "200750", "11800010"];
    const isRetryable = (msg) => RETRYABLE_CODES.some(code => msg.includes(code));
    const getErrorCode = (msg) => RETRYABLE_CODES.find(code => msg.includes(code)) || '';
    const retryableTokens = [];
    // ✅ 统一走「⚙️ 高级配置」面板里的重试设置（不再硬编码）
    const maxRetries = batchSettings.defaultRetryCount ?? 2;
    const retryWaitTime = batchSettings.retryDelay ?? 10000;
    const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
    // 账号间重试间隔（面板中的"账号间重试间隔"）
    const accountRetryInterval = batchSettings.accountRetryInterval ?? 5000;
    // 领取步骤的小重试次数与延迟：跟随面板 defaultRetryCount / retryDelay
    // 为保证至少执行 1 次调用，小重试次数保底 1
    const claimMaxAttempts = Math.max(1, maxRetries + 1);  // attempts = 首次调用 + maxRetries 次重试
    const claimRetryDelay = retryWaitTime;

    /**
     * 带小重试的领取步骤（周奖励/寻宝次数）
     * - 400340 / 200750 / 11800010 → 按面板「重试延迟」等待后重试，次数受「默认重试次数」控制
     * - 200020 / "已领取" / "次数" → 视为已领取，直接返回
     * - 其他错误 → 抛出，由外层进入账号级重试
     */
    const claimWithRetry = async (tokenId, tokenName, cmd, stepLabel) => {
      let lastErr = null;
      for (let attempt = 1; attempt <= claimMaxAttempts; attempt++) {
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} ${stepLabel}（第${attempt}/${claimMaxAttempts}次）...`,
            type: "info",
          });
          const res = await tokenStore.sendMessageWithPromise(tokenId, cmd, {}, commandTimeout);
          if (res?.error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} ${stepLabel}：服务端返回 ${res.error}`,
              type: "warning",
            });
            return { claimed: false, reason: String(res.error) };
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} ✅ ${stepLabel}成功`,
            type: "success",
          });
          return { claimed: true };
        } catch (e) {
          lastErr = e;
          const msg = e.message || '';
          // 业务性"已领取" → 直接返回，不再重试
          if (msg.includes("200020") || msg.includes("已领取") || msg.includes("次数")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} ${stepLabel}：已领取/无需领取`,
              type: "info",
            });
            return { claimed: false, reason: "already" };
          }
          // 可重试错误码 → 按面板重试延迟等待后再试
          if (isRetryable(msg) && attempt < claimMaxAttempts) {
            const code = getErrorCode(msg);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} ${stepLabel}：${code}，${claimRetryDelay/1000}s 后重试(${attempt}/${claimMaxAttempts})...`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, claimRetryDelay));
            continue;
          }
          // 其他错误 / 最后一次仍失败 → 抛出让外层走账号级重试
          throw e;
        }
      }
      throw lastErr || new Error(`${stepLabel}未知失败`);
    };

    // 单次账号抽奖逻辑（抽干次数为止）
    const doDrawLoop = async (tokenId, tokenName) => {
      let totalDraws = 0;
      let reachedLimit = false;

      // 循环：抽到不能抽为止（次数已在外部领取，这里只负责抽奖）
      while (!shouldStop.value && !reachedLimit) {
        try {
          // 执行抽奖
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "nightmare_clickturntable",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );
          await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));

          // 报错 = 次数用完
          if (result?.error) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 已达抽奖上限`, type: "info" });
            reachedLimit = true;
            break;
          }

          totalDraws++;
          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 第${totalDraws}次抽奖成功`, type: "success" });
        } catch (err) {
          if (err.message.includes("200020") || err.message.includes("次数")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 无抽奖次数`, type: "info" });
            reachedLimit = true;
          } else {
            throw err; // 其他错误抛出
          }
        }
      }

      return { totalDraws, reachedLimit };
    };

    // 单账号完整流程
    const processSingleToken = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始十殿抽奖: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 领取周奖励（带小重试，区分"已领取"与真实失败）
        try {
          await claimWithRetry(tokenId, token.name, "nightmare_claimweekreward", "领取周奖励次数");
        } catch (e) {
          // 小重试都失败 → 抛出让外层进入账号级重试
          throw e;
        }
        await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));

        // 2. 领取寻宝次数（带小重试，区分"已领取"与真实失败）
        try {
          await claimWithRetry(tokenId, token.name, "nightmare_claimturnrewardtimes", "领取寻宝次数");
        } catch (e) {
          // 小重试都失败 → 抛出让外层进入账号级重试
          throw e;
        }
        await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));

        // 3. 核心：循环抽奖抽到不动为止
        const { totalDraws } = await doDrawLoop(tokenId, token.name);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 抽奖完成，共抽 ${totalDraws} 次 ✅`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        const errMsg = error.message || '';
        if (isRetryable(errMsg)) {
          const code = getErrorCode(errMsg);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 服务器错误 ${code} → 等待重试`,
            type: "warning",
          });
          retryableTokens.push({ tokenId, tokenName: token.name });
          tokenStatus.value[tokenId] = "waiting_retry";
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 异常: ${error.message}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭`, type: "info" });
      }
    };

    // 分批并发执行：每批 maxActive 个账号，一批完成后再执行下一批
    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    let batchIndex = 0;

    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      batchIndex++;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({ time: new Date().toLocaleTimeString(), message: `\n=== 第 ${batchIndex}/${totalBatches} 批（${batch.length} 个账号）===`, type: "info" });

      // 本批所有账号并发执行，等待全部完成
      await Promise.all(batch.map(async (tokenId) => {
        try {
          await processSingleToken(tokenId);
        } catch (e) {
          const token = tokens.value.find((t) => t.id === tokenId);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token?.name || tokenId} 批次内异常: ${e.message}`, type: "error" });
          tokenStatus.value[tokenId] = "failed";
        }
      }));

      addLog({ time: new Date().toLocaleTimeString(), message: `第 ${batchIndex} 批执行完毕`, type: "info" });

      // 批次间等待（最后一批不等待）
      if (i + maxConcurrent < allTokenIds.length && !shouldStop.value) {
        const batchWait = _getModuleDelay('nightmare');
        addLog({ time: new Date().toLocaleTimeString(), message: `等待 ${batchWait/1000}秒 后执行下一批...`, type: "info" });
        await new Promise((r) => setTimeout(r, batchWait));
      }
    }

    // ==================== 400340/200750/11800010 重试逻辑 ====================
    // 重试次数 / 重试延迟 / 账号间重试间隔 全部走「⚙️ 高级配置」面板设置
    if (retryableTokens.length > 0 && maxRetries > 0) {
      for (let retry = 0; retry < maxRetries && retryableTokens.length && !shouldStop.value; retry++) {
        // ✅ 每轮重试开始前先等待「重试延迟」（与智能发车 / 收车重试对齐）
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n⏳ 等待 ${retryWaitTime/1000}s 后进行第 ${retry + 1}/${maxRetries} 轮重试（${retryableTokens.length} 个账号）...`,
          type: "info",
        });
        await new Promise((resolve) => setTimeout(resolve, retryWaitTime));
        if (shouldStop.value) break;

        addLog({ time: new Date().toLocaleTimeString(), message: `\n--- 第 ${retry + 1}/${maxRetries} 轮重试（${retryableTokens.length} 个账号）---`, type: "info" });
        const failedTokens = [];

        // 分批执行重试
        const retryIds = retryableTokens.map(info => info.tokenId);
        for (let i = 0; i < retryIds.length; i += maxConcurrent) {
          if (shouldStop.value) break;
          const batch = retryIds.slice(i, i + maxConcurrent);

          await Promise.all(batch.map(async (tokenId) => {
            const info = retryableTokens.find(x => x.tokenId === tokenId);
            if (!info) return;
            const { tokenName } = info;

            try {
              addLog({ time: new Date().toLocaleTimeString(), message: `重试：${tokenName}`, type: "info" });
              tokenStatus.value[tokenId] = "retrying";
              await ensureConnection(tokenId);

              // 重试时也要走「领取次数 → 抽奖」完整流程，否则仍会因没领次数而空转
              try {
                await claimWithRetry(tokenId, tokenName, "nightmare_claimweekreward", "重试-领取周奖励次数");
              } catch (_) { /* 已领取也无妨，继续 */ }
              await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));
              try {
                await claimWithRetry(tokenId, tokenName, "nightmare_claimturnrewardtimes", "重试-领取寻宝次数");
              } catch (_) { /* 已领取也无妨，继续 */ }
              await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));

              const { totalDraws } = await doDrawLoop(tokenId, tokenName);

              addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试成功，抽了 ${totalDraws} 次`, type: "success" });
              tokenStatus.value[tokenId] = "completed";
            } catch (e) {
              const eMsg = e.message || '';
              if (isRetryable(eMsg)) {
                const code = getErrorCode(eMsg);
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试仍${code}`, type: "warning" });
                failedTokens.push(info);
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试失败: ${e.message}`, type: "error" });
                tokenStatus.value[tokenId] = "failed";
              }
            } finally {
              tokenStore.closeWebSocketConnection(tokenId);
              releaseConnectionSlot();
            }
          }));

          // 重试批次间也走「账号间重试间隔」，避免一批刚完成立即启动下一批导致再次限流
          if (i + maxConcurrent < retryIds.length && !shouldStop.value && accountRetryInterval > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `重试批次间等待 ${accountRetryInterval/1000}s...`, type: "info" });
            await new Promise((r) => setTimeout(r, accountRetryInterval));
          }
        }

        retryableTokens.length = 0;
        retryableTokens.push(...failedTokens);
      }

      if (retryableTokens.length) {
        addLog({ time: new Date().toLocaleTimeString(), message: `\n最终失败 ${retryableTokens.length} 个账号`, type: "error" });
        retryableTokens.forEach((i) => {
          addLog({ time: new Date().toLocaleTimeString(), message: `- ${i.tokenName}`, type: "error" });
          tokenStatus.value[i.tokenId] = "failed"; // ✅ 标记为失败，确保执行记录进度统计正确
        });
      }
    } else if (retryableTokens.length > 0 && maxRetries === 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n默认重试次数=0，跳过重试；${retryableTokens.length} 个账号直接标记失败`, type: "warning" });
      retryableTokens.forEach((i) => {
        tokenStatus.value[i.tokenId] = "failed";
      });
      retryableTokens.length = 0;
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };
  /**
   * 十殿抽奖达标奖励
   */
  const nightmare_claim_book_reward = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始领取十殿抽奖达标奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送领取达标奖励请求...`,
          type: "info",
        });

        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "nightmare_claimbook",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('nightmare')));

        if (result && result.error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取达标奖励失败: ${result.error}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取达标奖励成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  const pkroom_appoint = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
      // 整体超时保护：每个账号最多90秒
      const TASK_TIMEOUT = 90000;

      const runTask = async () => {
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始预约直播: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId);

          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "pkroom_appoint",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

          if (result && result.error) {
            const errorMsg = result.error;
            // 错误码 7300236 表示已预约过直播
            const isAlreadyAppointed = errorMsg.includes("7300236") || errorMsg.includes("已预约");
            // 错误码 7300234 表示预约直播未开启
            const isNotEnabled = errorMsg.includes("7300234");

            if (isAlreadyAppointed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 已预约过直播，无需重新预约`,
                type: "info",
              });
              tokenStatus.value[tokenId] = "completed";
            } else if (isNotEnabled) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 预约直播未开启`,
                type: "info",
              });
              tokenStatus.value[tokenId] = "completed";
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 预约直播失败: ${errorMsg}`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 预约直播成功`,
              type: "success",
            });
            tokenStatus.value[tokenId] = "completed";
          }
        } catch (error) {
          const errorMsg = error.message || "";
          // 错误码 7300236 表示已预约过直播
          const isAlreadyAppointed = errorMsg.includes("7300236") || errorMsg.includes("已预约");
          // 错误码 7300234 表示预约直播未开启
          const isNotEnabled = errorMsg.includes("7300234");

          if (isAlreadyAppointed) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已预约过直播，无需重新预约`,
              type: "info",
            });
            tokenStatus.value[tokenId] = "completed";
          } else if (isNotEnabled) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 预约直播未开启`,
              type: "info",
            });
            tokenStatus.value[tokenId] = "completed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 预约直播过程出错: ${errorMsg}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
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

      // Promise.race 超时保护
      try {
        await Promise.race([
          runTask(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("任务执行超时（90秒）")), TASK_TIMEOUT)),
        ]);
      } catch (timeoutErr) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 预约直播超时: ${timeoutErr.message}`,
          type: "warning",
        });
        tokenStatus.value[tokenId] = "failed";
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 咸鱼神杯使用卡包（循环使用直到报错）
   * 使用咸鱼神杯的 starpack 功能，循环执行直到出现错误
   */
  const saltcup26_openstarpack_use = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
      const TASK_TIMEOUT = 900000; // 10分钟超时（循环使用需要更长时间）

      const runTask = async () => {
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始循环使用咸鱼神杯卡包: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId);

          let successCount = 0;
          let lastError = null;

          // 循环使用卡包直到报错
          while (!shouldStop.value) {
            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "saltcup26_openstarpack",
                { packId: 5501, starId: 0, cnt: 1 },
                batchSettings.defaultCommandTimeout || 5000,
              );

              if (result && result.error) {
                // 遇到错误，停止循环
                lastError = result.error;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第 ${successCount + 1} 次使用卡包失败: ${lastError}，停止循环`,
                  type: "warning",
                });
                break;
              } else {
                successCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第 ${successCount} 次使用卡包成功`,
                  type: "success",
                });

                // 间隔延迟，避免请求过快
                await new Promise((r) => setTimeout(r, 1000));
              }
            } catch (error) {
              // 捕获异常，停止循环
              lastError = error.message || "";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第 ${successCount + 1} 次使用卡包出错: ${lastError}，停止循环`,
                type: "warning",
              });
              break;
            }
          }

          // 最终结果
          if (successCount > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 循环使用卡包结束，成功 ${successCount} 次`,
              type: successCount > 0 ? "success" : "warning",
            });
            tokenStatus.value[tokenId] = "completed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前卡包数量为0无法使用`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          }
        } catch (error) {
          const errorMsg = error.message || "";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 使用卡包过程出错: ${errorMsg}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
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

      try {
        await Promise.race([
          runTask(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("任务执行超时（10分钟）")), TASK_TIMEOUT)),
        ]);
      } catch (timeoutErr) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 使用卡包超时: ${timeoutErr.message}`,
          type: "warning",
        });
        tokenStatus.value[tokenId] = "failed";
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 批量逐鹿盐山竞猜
   * @param {number} scheduleId - 赛程ID（新协议，如46）
   * @param {string[]} teamIds - 按选中顺序的队伍ID列表
   * @param {number} [maxConcurrent] - 并发数（定时任务级并发控制，0 或不传则使用全局 batchSettings.maxActive）
   * @param {number} [groupId] - 期次（0=第一期, 1=第二期, 2=第三期…，默认1）
   */
  const batchApexGuess = async (scheduleId, teamIds, maxConcurrent = 0, groupId = 1) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      message.warning("请先选择竞猜队伍");
      return;
    }

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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 逐鹿盐山竞猜: ${token.name} ===`, type: "info" });

        await ensureConnection(tokenId);

        let successCount = 0;
        let failCount = 0;
        for (const teamId of teamIds) {
          if (shouldStop.value) break;

          try {
            const result = await tokenStore.sendMessageWithPromise(tokenId, "apex_guess", { teamId, scheduleId, groupId }, 5000);
            if (result?.error) {
              const errMsg = String(result.error);
              if (errMsg.includes('12800040')) {
                successCount++;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 已参与竞猜(${teamId})，无需重复参与`, type: "warning" });
              } else {
                failCount++;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜失败(${teamId}): ${result.error}`, type: "error" });
              }
            } else {
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜成功: ${teamId}`, type: "success" });
            }
          } catch (e) {
            const errMsg = String(e.message || '');
            if (errMsg.includes('12800040')) {
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 已参与竞猜(${teamId})，无需重复参与`, type: "warning" });
            } else {
              failCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜异常(${teamId}): ${e.message}`, type: "error" });
            }
          }

          await new Promise(r => setTimeout(r, _getModuleDelay('saltcup')));
        }

        tokenStatus.value[tokenId] = successCount > 0 ? "completed" : "failed";
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜完成: 成功${successCount}场, 失败${failCount}场`, type: "info" });

        // ✅ 修复：账号级收尾延迟，与其他任务模块一致（避免账号快速完成后立即启动下一个账号导致级联启动）
        await new Promise(r => setTimeout(r, _getModuleDelay('saltcup')));
      } catch (error) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜异常: ${error.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
      }
    }, maxConcurrent || undefined);

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
    message.success("批量逐鹿盐山竞猜结束");
  };

  /**
   * 批量领取逐鹿盐山竞猜奖励
   * 从 apex_getroleinfo 的 guessClaimMap 中收集猜中且未领奖的队伍（名称不以下划线开头且值为 false），
   * 循环发送 apex_guessclaim {scheduleId, teamId} 领取
   */
  const batchApexGuessClaim = async () => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }

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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 逐鹿盐山竞猜领奖: ${token.name} ===`, type: "info" });

        await ensureConnection(tokenId);

        // 获取角色信息，解析 guessClaimMap
        const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "apex_getroleinfo", {}, 5000);
        await new Promise(r => setTimeout(r, _getModuleDelay('club')));
        const guessClaimMap = roleInfo?.apexRoleInfo?.guessClaimMap || roleInfo?.guessClaimMap || {};

        // 收集猜中且未领奖的队伍：名称不以下划线开头且值为 false
        // 解码规则: scheduleId=(期次-1)*26+局部编号，局部20-26=淘汰赛64强~决赛
        const stageLabels = { 20: '64强', 21: '32强', 22: '16强', 23: '8强', 24: '4强', 25: '季军赛', 26: '决赛' };
        const decodeSchedule = (id) => {
          const period = Math.floor((id - 1) / 26) + 1;
          const local = (id - 1) % 26 + 1;
          return `第${period}期${stageLabels[local] || `局部${local}`}`;
        };
        const claimList = [];
        for (const scheduleId of Object.keys(guessClaimMap)) {
          const teamMap = guessClaimMap[scheduleId];
          if (!teamMap || typeof teamMap !== 'object') continue;
          for (const teamId of Object.keys(teamMap)) {
            if (!teamId.startsWith('_') && teamMap[teamId] === false) {
              claimList.push({ scheduleId: Number(scheduleId), teamId });
            }
          }
        }

        if (claimList.length === 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 奖励已全部领取或未猜中任何对局。`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        let successCount = 0;
        let failCount = 0;
        for (const { scheduleId, teamId } of claimList) {
          if (shouldStop.value) break;

          try {
            const result = await tokenStore.sendMessageWithPromise(tokenId, "apex_guessclaim", { scheduleId, teamId }, 5000);
            if (result?.error) {
              failCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领奖失败(${decodeSchedule(scheduleId)}/${scheduleId}/${teamId}): ${result.error}`, type: "error" });
            } else {
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领奖成功: ${decodeSchedule(scheduleId)}(${scheduleId}) 队伍${teamId}`, type: "success" });
            }
          } catch (e) {
            failCount++;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领奖异常(${decodeSchedule(scheduleId)}/${scheduleId}/${teamId}): ${e.message}`, type: "error" });
          }

          await new Promise(r => setTimeout(r, _getModuleDelay('club')));
        }

        tokenStatus.value[tokenId] = successCount > 0 ? "completed" : "failed";
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领奖完成: 成功${successCount}个, 失败${failCount}个`, type: "info" });
      } catch (error) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领奖异常: ${error.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
    message.success("批量逐鹿盐山竞猜领奖结束");
  };

  /**
   * 批量比赛竞猜
   * @param {string|undefined} matchId - 比赛ID（不传则自动获取所有比赛并下注）
   * @param {number} pick - 竞猜选项 (1=主胜, 2=平局, 3=客胜)
   * @param {number} [maxConcurrent] - 并发数（定时任务级并发控制，0 或不传则使用全局 batchSettings.maxActive）
   */
  const batchSaltCupBet = async (matchId, pick, maxConcurrent = 0) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const pickLabels = { 1: '主胜', 2: '平局', 3: '客胜' };
    const pickVal = (pick !== undefined && pick !== null) ? pick : 1;
    const pickLabel = pickLabels[pickVal] || `选项${pickVal}`;

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 竞猜: ${token.name} ===`, type: "info" });

        await ensureConnection(tokenId);

        // 获取当前竞猜信息
        const betInfo = await tokenStore.sendMessageWithPromise(tokenId, "SaltCup26_GetBetInfo", {}, 5000);

        // 自动模式：获取所有比赛ID列表
        let targetMatchIds = [];
        if (matchId) {
          targetMatchIds = [matchId];
        } else {
          const matchList = betInfo?.matchList;
          if (Array.isArray(matchList)) {
            targetMatchIds = matchList.map(m => m.matchId).filter(Boolean);
          } else if (matchList && typeof matchList === 'object') {
            targetMatchIds = Object.values(matchList).map(m => m.matchId).filter(Boolean);
          }
        }

        if (targetMatchIds.length === 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无可用比赛，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 解析已下注记录
        const betRecord = betInfo?.roleData?.betRecord || {};
        const betRecordMap = {};
        for (const scheduleId of Object.keys(betRecord)) {
          const scheduleMap = betRecord[scheduleId];
          if (scheduleMap && typeof scheduleMap === 'object') {
            for (const mid of Object.keys(scheduleMap)) {
              if (scheduleMap[mid]?.betTime > 0) {
                betRecordMap[mid] = true;
              }
            }
          }
        }

        // 对每场比赛下注
        let successCount = 0;
        let skipCount = 0;
        for (const mid of targetMatchIds) {
          if (shouldStop.value) break;

          if (betRecordMap[mid]) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 已对 ${mid} 下注，跳过`, type: "warning" });
            skipCount++;
            continue;
          }

          try {
            const result = await tokenStore.sendMessageWithPromise(tokenId, "saltcup26_placebet", { matchId: mid, pick: pickVal }, 5000);
            if (result?.error) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜失败(${mid}): ${result.error}`, type: "error" });
            } else {
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜成功: ${mid} - ${pickLabel}`, type: "success" });
            }
          } catch (e) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜异常(${mid}): ${e.message}`, type: "error" });
          }

          // ✅ 修复：使用模块统一延迟（与其他功能按钮一致），替代硬编码 300ms
          await new Promise(r => setTimeout(r, _getModuleDelay('saltcup')));
        }

        if (successCount > 0 || skipCount === targetMatchIds.length) {
          tokenStatus.value[tokenId] = "completed";
        } else {
          tokenStatus.value[tokenId] = "failed";
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜完成: 成功${successCount}场, 跳过${skipCount}场`, type: "info" });

        // ✅ 修复：账号级收尾延迟，与其他任务模块一致（如 batchSaltRoadCheer、batchApexGuess）
        // 避免账号快速完成后立即启动下一个账号导致“级联启动”视觉上是串行
        await new Promise(r => setTimeout(r, _getModuleDelay('saltcup')));
      } catch (error) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 竞猜异常: ${error.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    }, maxConcurrent || undefined);

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
    message.success("批量竞猜结束");
  };

  /**
   * 获取比赛竞猜信息（用于UI显示）
   */
  const getSaltCupBetInfo = async (tokenId) => {
    return await tokenStore.sendMessageWithPromise(tokenId, "SaltCup26_GetBetInfo", {}, 1000);
  };

  /**
   * 领取助威币（每月只能领取一次）
   */
  const claim_guess_coin = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始领取助威币: ${token.name} ===`,
          type: "info",
        });

        // 检查本月是否已领取
        const currentMonth = new Date().toISOString().slice(0, 7); // 格式: '2026-01'
        const claimedData = guessCoinClaimed[tokenId];

        if (claimedData && claimedData.month === currentMonth && claimedData.claimed) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前账号已领取助威币`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        await ensureConnection(tokenId);

        // 1. 先获取助威信息
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取助威信息...`,
          type: "info",
        });

        const guessInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "warguess_getguessinfo",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // ✅ 移除冗余 debug 日志（2026-07-13 清理）

        // 尝试各种可能的路径
        if (guessInfo?._rawData) {
          console.log("_rawData.guessLegionList:", guessInfo._rawData.guessLegionList);
        }
        if (guessInfo?.body) {
          console.log("body.guessLegionList:", guessInfo.body.guessLegionList);
        }
        if (guessInfo?.data) {
          console.log("data.guessLegionList:", guessInfo.data.guessLegionList);
        }

        if (!guessInfo || guessInfo.error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取助威信息失败: ${guessInfo?.error || "未知错误"}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
          return;
        }

        // 2. 从guessLegionList中提取guessId和legionId（数据在根级别）
        const guessLegionList = guessInfo?.guessLegionList;
        const guessId = guessLegionList?.[0]?.guessId;
        const legionId = guessLegionList?.[0]?.id; // 从数组第一项的id字段获取

        if (!guessId || !legionId) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 该账号没有助威俱乐部，无法领取`,
            type: "error",
          });
          console.error("无法从返回数据中提取guessId或legionId:", guessInfo);
          tokenStatus.value[tokenId] = "failed";
          return;
        }

        // 后台打印调试信息，不显示在执行日志中
        console.log(`${token.name} 获取到guessId: ${guessId}, legionId: ${legionId}`);

        // 3. 调用warguess_guessclaim领取助威币
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开始领取助威币...`,
          type: "info",
        });

        const claimResult = await tokenStore.sendMessageWithPromise(
          tokenId,
          "warguess_guessclaim",
          { guessId, legionId },
          batchSettings.defaultCommandTimeout || 5000,
        );

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        if (claimResult && claimResult.error) {
          const errorMsg = claimResult.error;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取助威币失败: ${errorMsg}`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          // 领取成功，记录本月已领取
          const currentMonth = new Date().toISOString().slice(0, 7);
          guessCoinClaimed[tokenId] = { month: currentMonth, claimed: true };

          // 持久化到localStorage
          saveGuessCoinClaimed();

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取助威币成功`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (error) {
        const errorMsg = error.message || "";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取助威币过程出错: ${errorMsg}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 助威商店多选购买
   * @param {Array} itemIds - 要购买的商品ID列表 [7, 8, 9, 10, 11]
   * @param {object} buyCounts - 每个商品的购买次数 { 7: 1, 8: 1, 9: 1, 10: 20, 11: 20 }
   */
  const legion_buy_store_items = async (itemIds = [], buyCounts = {}) => {
    if (selectedTokens.value.length === 0)
      return;
    if (itemIds.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `未选择任何商品，取消执行`,
        type: "warning",
      });
      return;
    }

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
          message: `=== 开始助威商店购买: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let successCount = 0;
        let failCount = 0;

        // 遍历购买选中的商品
        for (const itemId of itemIds) {
          if (shouldStop.value)
            break;

          const buyCount = buyCounts[itemId] || 1;
          const itemName = getItemName(itemId);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买 ${itemName} x${buyCount}...`,
            type: "info",
          });

          try {
            // 检查连接状态
            const wsStatus = tokenStore.getWebSocketStatus(tokenId);
            if (wsStatus !== "connected") {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 连接已断开，重新连接...`,
                type: "warning",
              });
              await ensureConnection(tokenId);
            }

            // 直接购买商品，不需要每次都获取商品列表
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_storebuygoods",
              { id: itemId },
              15000, // 增加超时时间到8秒
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result && result.error) {
              const errorMsg = result.error;
              // 检查是否是购买数量超出上限的错误
              if (errorMsg.includes("2300370")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${itemName} 购买数量上限无法进行购买`,
                  type: "warning",
                });
              } else if (errorMsg.includes("2300070") && (itemId === 8 || itemId === 9)) {
                // 军团币(ID:8)和白玉(ID:9)的2300070错误（未加入俱乐部）
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 账号未加入俱乐部无法购买`,
                  type: "error",
                });
                failCount++;
              } else if (errorMsg.includes("400000") && (itemId === 8 || itemId === 9)) {
                // 军团币(ID:8)和白玉(ID:9)的400000错误
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 当前账号缺少${itemName}，无法购买成功`,
                  type: "error",
                });
                failCount++;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${itemName} 购买失败: ${errorMsg}`,
                  type: "error",
                });
                failCount++;
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${itemName} 购买成功`,
                type: "success",
              });
              successCount++;
            }
          } catch (error) {
            const errorMsg = error.message || "";
            // 检查是否是连接相关错误，尝试重新连接
            if (errorMsg.includes("超时") || errorMsg.includes("断开") || errorMsg.includes("connection")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 连接异常，尝试重新连接...`,
                type: "warning",
              });
              try {
                await ensureConnection(tokenId);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 重新连接成功，继续购买`,
                  type: "info",
                });
              } catch (reconnectError) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 重新连接失败: ${reconnectError.message}`,
                  type: "error",
                });
                failCount++;
                continue; // 跳过当前商品，继续下一个
              }
            }

            // 检查是否是购买数量超出上限的错误
            if (errorMsg.includes("2300370")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${itemName} 购买数量上限无法进行购买`,
                type: "warning",
              });
            } else if (errorMsg.includes("2300070") && (itemId === 8 || itemId === 9)) {
              // 军团币(ID:8)和白玉(ID:9)的2300070错误（未加入俱乐部）
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 账号未加入俱乐部无法购买`,
                type: "error",
              });
              failCount++;
            } else if (errorMsg.includes("400000") && (itemId === 8 || itemId === 9)) {
              // 军团币(ID:8)和白玉(ID:9)的400000错误
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 当前账号缺少${itemName}，无法购买成功`,
                type: "error",
              });
              failCount++;
            } else if (!errorMsg.includes("超时") && !errorMsg.includes("断开") && !errorMsg.includes("connection")) {
              // 非连接错误的其他错误才计数
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${itemName} 购买出错: ${errorMsg}`,
                type: "error",
              });
              failCount++;
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 助威商店购买完成: 成功${successCount}个，失败${failCount}个`,
          type: successCount > 0 ? "success" : "warning",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        const errorMsg = error.message || "";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 助威商店购买过程出错: ${errorMsg}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  // 商品名称映射
  const getItemName = (itemId) => {
    const nameMap = {
      7: "随机红将碎片",
      8: "白玉",
      9: "军团币",
      10: "进阶石",
      11: "精铁",
    };
    return nameMap[itemId] || `商品${itemId}`;
  };

  /**
   * 黑市周购买（支持多选，每种商品只能购买一次）
   * @param {object} options - 配置选项
   * @param {Array} options.selectedItems - 选中的商品索引列表
   */
  const weeklyMarketBuy = async (options = {}) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始黑市周购买，共 ${selectedTokens.value.length} 个账号 ===`,
      type: "info",
    });

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 黑市周购买: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 从 options 或 batchSettings 获取选中的商品列表
        const selectedItems = options.selectedItems || batchSettings.weeklyMarketItems || [];

        if (selectedItems.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未选择任何商品，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 准备购买 ${selectedItems.length} 个商品`,
          type: "info",
        });

        let successCount = 0;
        let failCount = 0;

        // 遍历选中的商品进行购买
        for (const goodsIndex of selectedItems) {
          if (shouldStop.value)
            break;

          const goodsNameMap = {
            0: "免费金砖",
            1: "黑市见面礼",
            2: "黑市惊喜礼",
            3: "初级黑市包",
            4: "中级黑市包",
            5: "高级黑市包",
            6: "顶级鱼竿包",
            7: "白玉黑市包",
            8: "特级灵贝包",
            9: "养成补给包",
          };

          const itemName = goodsNameMap[goodsIndex] || `商品${goodsIndex}`;

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 正在购买: ${itemName}`,
              type: "info",
            });

            await tokenStore.sendMessageWithPromise(
              tokenId,
              "activity_buystoregoods",
              {
                activityId: 9,
                goodsIndex: Number.parseInt(goodsIndex),
                buyNum: 1,
              },
              10000,
            );

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${itemName} 购买成功`,
              type: "success",
            });
            successCount++;

            // 每个商品之间等待2秒
            if (goodsIndex !== selectedItems[selectedItems.length - 1]) {
              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
            }
          } catch (error) {
            const errorMsg = error.message || "";

            // 已购买过的商品（2300370 或 1100010）
            if (errorMsg.includes("2300370") || errorMsg.includes("已经购买过") || errorMsg.includes("1100010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${itemName} 本周已购买，无需重复执行`,
                type: "info",
              });
            } else if (errorMsg.includes("-10006")) {
              // 服务器返回-10006表示当前不是黑市周，立即终止所有后续购买
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 还未到黑市周，无法购买，终止后续商品`,
                type: "warning",
              });
              break;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${itemName} 购买失败: ${errorMsg.substring(0, 100)}`,
                type: "error",
              });
              failCount++;
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 黑市周购买完成，成功: ${successCount}，失败: ${failCount}`,
          type: successCount > 0 ? "success" : "warning",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 黑市周购买失败: ${error.message}`,
          type: "error",
        });
      } finally {
        try {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
        } catch (closeErr) {
          // 忽略关闭连接失败
        }
      }
    });

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("黑市周购买结束");
  };

  /**
   * 积分好礼领取（智能领取，自动跳过已领取的奖励）
   */
  const charge_claimaddup_rewards = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始积分好礼领取: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;
        let firstSuccessDay = 0; // 记录第一个成功领取的天数

        // 从第1天领取到第15天
        for (let id = 1; id <= 15; id++) {
          if (shouldStop.value)
            break;

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "charge_claimaddup",
              { id },
              batchSettings.defaultCommandTimeout || 5000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result.error) {
              // 已领取过的奖励，静默跳过（不显示日志）
              if (result.error.includes("已领取")
                || result.error.includes("1100010")
                || result.error.includes("1100060")) {
                skipCount++;
                // 如果已经有成功记录，说明后面的都已领取，可以提前结束
                if (firstSuccessDay > 0) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 第${id}天及之后的奖励已领取完毕，提前结束`,
                    type: "info",
                  });
                  break;
                }
              } else if (result.error.includes("1100070")) {
                // 1100070: 领取天数未达标
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第${id}天领取天数未达标，无需领取`,
                  type: "info",
                });
                skipCount++;
                // 天数未达标，后面的天数也不会达标，直接结束
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 后续天数未达标，提前结束`,
                  type: "info",
                });
                break;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第${id}天奖励领取失败: ${result.error}`,
                  type: "warning",
                });
                failCount++;
              }
            } else {
              // 成功领取
              if (firstSuccessDay === 0) {
                firstSuccessDay = id;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 从第${id}天开始领取`,
                  type: "info",
                });
              }
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${id}天奖励领取成功`,
                type: "success",
              });
              successCount++;
            }
          } catch (error) {
            const errorMsg = error.message || "";
            // 已领取过的奖励，静默跳过
            if (errorMsg.includes("已领取")
              || errorMsg.includes("1100010")
              || errorMsg.includes("1100060")) {
              skipCount++;
              // 如果已经有成功记录，说明后面的都已领取，可以提前结束
              if (firstSuccessDay > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 第${id}天及之后的奖励已领取完毕，提前结束`,
                  type: "info",
                });
                break;
              }
            } else if (errorMsg.includes("1100070")) {
              // 1100070: 领取天数未达标
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${id}天领取天数未达标，无需领取`,
                type: "info",
              });
              skipCount++;
              // 天数未达标，后面的天数也不会达标，直接结束
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 后续天数未达标，提前结束`,
                type: "info",
              });
              break;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 第${id}天奖励领取异常: ${errorMsg}`,
                type: "warning",
              });
              failCount++;
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 积分好礼领取完成：成功${successCount}个，跳过${skipCount}个，失败${failCount}个 ===`,
          type: successCount > 0 ? "success" : "info",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 积分好礼领取过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 领取怪异塔宝箱、目标和特权
   */
  const claim_weird_tower_all = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimWeirdTowerAll = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取怪异塔奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);
        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // 1. 领取宝箱奖励 (taskId: 1, 2, 3)
        for (let taskId = 1; taskId <= 3; taskId++) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取宝箱 ${taskId}...`,
            type: "info",
          });

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "evotower_claimtask",
              { taskId },
              batchSettings.defaultCommandTimeout || 5000,
            );

            if (result.error) {
              const isAlreadyClaimed
                = result.error.includes("已领取")
                  || result.error.includes("1100010")
                  || result.error.includes("12200050");

              if (!isAlreadyClaimed) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 宝箱 ${taskId} 领取失败: ${result.error}`,
                  type: "warning",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 宝箱 ${taskId} 已完成领取宝箱`,
                  type: "success",
                });
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 宝箱 ${taskId} 领取成功`,
                type: "success",
              });
            }
          } catch (error) {
            const errorMsg = error.message || "";
            const isAlreadyClaimed
              = errorMsg.includes("已领取")
                || errorMsg.includes("1100010")
                || errorMsg.includes("12200050");

            if (!isAlreadyClaimed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 宝箱 ${taskId} 领取异常: ${errorMsg}`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 宝箱 ${taskId} 已完成领取宝箱`,
                type: "success",
              });
            }
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        }

        // 2. 领取俱乐部目标 (taskId: 4-9)
        for (let taskId = 4; taskId <= 9; taskId++) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取俱乐部目标 ${taskId}...`,
            type: "info",
          });

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "evotower_claimlegiontask",
              { taskId },
              batchSettings.defaultCommandTimeout || 5000,
            );

            if (result.error) {
              const isAlreadyClaimed
                = result.error.includes("已领取")
                  || result.error.includes("1100010")
                  || result.error.includes("12200050");
              const isNotReachTarget = result.error.includes("12200040");

              if (isNotReachTarget) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 俱乐部目标 ${taskId} 未达到目标`,
                  type: "info",
                });
              } else if (!isAlreadyClaimed) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 俱乐部目标 ${taskId} 领取失败: ${result.error}`,
                  type: "warning",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 俱乐部目标 ${taskId} 已领取成功`,
                  type: "success",
                });
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部目标 ${taskId} 领取成功`,
                type: "success",
              });
            }
          } catch (error) {
            const errorMsg = error.message || "";
            const isAlreadyClaimed
              = errorMsg.includes("已领取")
                || errorMsg.includes("1100010")
                || errorMsg.includes("12200050");
            const isNotReachTarget = errorMsg.includes("12200040");

            if (isNotReachTarget) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部目标 ${taskId} 未达到目标`,
                type: "info",
              });
            } else if (!isAlreadyClaimed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部目标 ${taskId} 领取异常: ${errorMsg}`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部目标 ${taskId} 已领取成功`,
                type: "success",
              });
            }
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        }

        // 3. 领取俱乐部特权 (4次)
        for (let i = 0; i < 4; i++) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取俱乐部特权 ${i + 1}/4...`,
            type: "info",
          });

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "evotower_claimlegionprivilege",
              {},
              batchSettings.defaultCommandTimeout || 5000,
            );

            if (result.error) {
              const isAlreadyClaimed
                = result.error.includes("已领取")
                  || result.error.includes("1100010")
                  || result.error.includes("12200060");

              if (!isAlreadyClaimed) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 俱乐部特权 ${i + 1} 领取失败: ${result.error}`,
                  type: "warning",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 俱乐部特权 ${i + 1} 已完成领取特权`,
                  type: "info",
                });
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部特权 ${i + 1} 领取成功`,
                type: "success",
              });
            }
          } catch (error) {
            const errorMsg = error.message || "";
            const isAlreadyClaimed
              = errorMsg.includes("已领取")
                || errorMsg.includes("1100010")
                || errorMsg.includes("12200060");

            if (!isAlreadyClaimed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部特权 ${i + 1} 领取异常: ${errorMsg}`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 俱乐部特权 ${i + 1} 已完成领取特权`,
                type: "info",
              });
            }
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        }

        // 4. 领取怪异塔通行证
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取怪异塔通行证...`,
          type: "info",
        });

        try {
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_battlepassrewardclaim",
            { battlePassId: 1003 },
            batchSettings.defaultCommandTimeout || 5000,
          );

          if (result.error) {
            const isAlreadyClaimed
              = result.error.includes("已领取")
                || result.error.includes("1100010")
                || result.error.includes("3500020");

            if (!isAlreadyClaimed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 怪异塔通行证领取失败: ${result.error}`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 怪异塔通行证已领取过或没有可领取的奖励`,
                type: "info",
              });
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 怪异塔通行证领取成功`,
              type: "success",
            });
          }
        } catch (error) {
          const errorMsg = error.message || "";
          const isAlreadyClaimed
            = errorMsg.includes("已领取")
              || errorMsg.includes("1100010")
              || errorMsg.includes("3500020");

          if (!isAlreadyClaimed) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 怪异塔通行证领取异常: ${errorMsg}`,
              type: "warning",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 怪异塔通行证已领取过或没有可领取的奖励`,
              type: "info",
            });
          }
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取怪异塔奖励异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
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

    await runStreaming(selectedTokens.value, processClaimWeirdTowerAll);

    // 批量重试失败账号
    const maxRetries = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < maxRetries && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${maxRetries}轮）`, type: "info" });
      if (!(await safeDelay(retryWaitMs))) break;
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processClaimWeirdTowerAll);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 领取怪异塔通行证（独立功能）
   */
  const claim_weird_tower_pass = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimWeirdTowerPass = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取怪异塔通行证: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);
        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // 领取怪异塔通行证 (battlePassId: 1003)
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 正在领取怪异塔通行证...`,
          type: "info",
        });

        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "activity_battlepassrewardclaim",
          { battlePassId: 1003 },
          10000,
        );

        if (result && !result.__error && !result.error) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 怪异塔通行证领取成功！`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        } else {
          const errorMsg = result?.error || result?.message || "未知错误";
          const isAlreadyClaimed
            = errorMsg.includes("已领取")
              || errorMsg.includes("1100010")
              || errorMsg.includes("3500020");

          if (!isAlreadyClaimed) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 怪异塔通行证领取失败: ${errorMsg}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 怪异塔通行证已领取过或没有可领取的奖励`,
              type: "info",
            });
            tokenStatus.value[tokenId] = "completed";
          }
        }
      } catch (error) {
        console.error(error);
        const errorMsg = error.message || "";
        const isAlreadyClaimed
          = errorMsg.includes("已领取")
            || errorMsg.includes("1100010")
            || errorMsg.includes("3500020");

        if (!isAlreadyClaimed) {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取怪异塔通行证失败: ${errorMsg}`,
            type: "error",
          });
        } else {
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 怪异塔通行证已领取过`,
            type: "info",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    };

    await runStreaming(selectedTokens.value, processClaimWeirdTowerPass);

    // 批量重试失败账号
    const maxRetries = batchSettings.defaultRetryCount || 2;
    const retryWaitMs = batchSettings.retryDelay || 60000;
    let failedTokenIds = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");

    for (let retryRound = 0; retryRound < maxRetries && failedTokenIds.length > 0; retryRound++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWaitMs/1000}秒后重试 ${failedTokenIds.length} 个失败账号（第${retryRound+1}/${maxRetries}轮）`, type: "info" });
      if (!(await safeDelay(retryWaitMs))) break;
      const currentRetry = [...failedTokenIds];
      failedTokenIds = [];
      await runStreaming(currentRetry, processClaimWeirdTowerPass);
      currentRetry.forEach(id => { if (tokenStatus.value[id] === "failed") failedTokenIds.push(id); });
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 使用斑点蛋
   */
  const use_spotted_egg = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始使用斑点蛋: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 蛋类型列表（斑点蛋/盐壳蛋/亮纹蛋）
        const EGG_TYPES = [
          { itemId: 37011, name: "斑点蛋" },
          { itemId: 37012, name: "盐壳蛋" },
          { itemId: 37013, name: "亮纹蛋" },
        ];

        // 先获取角色信息，查询各类蛋数量
        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        const eggInventory = EGG_TYPES.map((t) => ({
          ...t,
          count: roleInfo?.role?.items?.[t.itemId]?.quantity || 0,
        }));
        const totalEggs = eggInventory.reduce((s, t) => s + t.count, 0);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前蛋数量: ${eggInventory.map((t) => `${t.name}×${t.count}`).join(" / ")}`,
          type: "info",
        });

        if (totalEggs <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 蛋不足，无法使用`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 按顺序依次使用：斑点蛋用完→盐壳蛋，盐壳蛋用完→亮纹蛋
        let gridFull = false;
        for (const egg of eggInventory) {
          if (shouldStop.value || gridFull)
            break;
          if (egg.count <= 0)
            continue;

          const maxUseCount = egg.count;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始使用${egg.name}（共${maxUseCount}个，用完后切换下一种蛋）...`,
            type: "info",
          });

          for (let i = 0; i < maxUseCount; i++) {
            if (shouldStop.value)
              break;

            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "pet_openegg",
                { itemId: egg.itemId },
                batchSettings.defaultCommandTimeout || 5000,
              );

              if (result.error) {
                const isEggUsedUp = result.error.includes("12600020");

                if (isEggUsedUp) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${egg.name} ${i + 1}/${maxUseCount} 当前没有空格存放宠物，请先合成之后再使用`,
                    type: "info",
                  });
                  // 格子已满，后续蛋也无法使用，提前退出
                  gridFull = true;
                  break;
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${egg.name} ${i + 1}/${maxUseCount} 使用失败: ${result.error}`,
                    type: "warning",
                  });
                }
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${egg.name} ${i + 1}/${maxUseCount} 使用成功`,
                  type: "success",
                });
              }
            } catch (error) {
              const errorMsg = error.message || "";
              const isEggUsedUp = errorMsg.includes("12600020");

              if (isEggUsedUp) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${egg.name} ${i + 1}/${maxUseCount} 当前没有空格存放宠物，请先合成之后再使用`,
                  type: "info",
                });
                // 格子已满，后续蛋也无法使用，提前退出
                gridFull = true;
                break;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${egg.name} ${i + 1}/${maxUseCount} 使用异常: ${errorMsg}`,
                  type: "warning",
                });
              }
            }

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
          }
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 斑点蛋使用异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 领取图鉴奖励
   */
  const claim_pet_book = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
          message: `=== 开始领取图鉴奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 图鉴系列：海洋(101-701), 陆地(102-702), 天空(103-703), 幻想(104-704)
        const bookSeries = [
          { name: "海洋", petIds: [101, 201, 301, 401, 501, 601, 701] },
          { name: "陆地", petIds: [102, 202, 302, 402, 502, 602, 702] },
          { name: "天空", petIds: [103, 203, 303, 403, 503, 603, 703] },
          { name: "幻想", petIds: [104, 204, 304, 404, 504, 604, 704] },
        ];

        for (const series of bookSeries) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取${series.name}系列图鉴...`,
            type: "info",
          });

          for (const petId of series.petIds) {
            if (shouldStop.value)
              break;

            // 1. 激活图鉴
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "pet_activatebook",
                { petId },
                batchSettings.defaultCommandTimeout || 5000,
              );
              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
            } catch (error) {
              // 忽略激活错误，继续领取奖励
            }

            // 2. 领取图鉴奖励
            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "pet_claimbookreward",
                { petId },
                batchSettings.defaultCommandTimeout || 5000,
              );

              if (result.error) {
                const isAlreadyClaimed
                  = result.error.includes("已领取")
                    || result.error.includes("1100010")
                    || result.error.includes("12200050");
                const isAlreadyLitOrNotObtained
                  = result.error.includes("200120")
                    || result.error.includes("200140");

                if (isAlreadyLitOrNotObtained) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${series.name}图鉴${petId} 已点亮图鉴或者未获取到该宠物`,
                    type: "info",
                  });
                } else if (!isAlreadyClaimed) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${series.name}图鉴${petId} 领取失败: ${result.error}`,
                    type: "warning",
                  });
                }
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${series.name}图鉴${petId} 领取成功`,
                  type: "success",
                });
              }
            } catch (error) {
              const errorMsg = error.message || "";
              const isAlreadyClaimed
                = errorMsg.includes("已领取")
                  || errorMsg.includes("1100010")
                  || errorMsg.includes("12200050");
              const isAlreadyLitOrNotObtained
                = errorMsg.includes("200120")
                  || errorMsg.includes("200140");

              if (isAlreadyLitOrNotObtained) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${series.name}图鉴${petId} 已点亮图鉴或者未获取到该宠物`,
                  type: "info",
                });
              } else if (!isAlreadyClaimed) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${series.name}图鉴${petId} 领取异常: ${errorMsg}`,
                  type: "warning",
                });
              }
            }

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
          }
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取图鉴奖励异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 宠物合成
   * 核心逻辑：
   * 1. 调用 role_getroleinfo 获取 petdata 宠物列表
   * 2. 按等级分组（petId 首位数字=等级: 101-104=1级, 201-204=2级...）
   * 3. 同等级宠物可互相合成，材料宠消耗，目标宠保留升级
   * 4. 每次合成前重新拉取列表获取最新 UID（绝不缓存）
   * 5. 4级紫宠合成时 inheritSlot 指定材料宠的 slot
   */
  const batch_pet_merge = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
      const cmdTimeout = batchSettings.defaultCommandTimeout || 5000;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始宠物合成: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 图鉴宠物ID定义：首位=等级，尾号=系列(1海洋 2陆地 3天空 4幻想)
        // 已知图鉴ID集合
        const codexPetIds = new Set([
          101, 102, 103, 104,
          201, 202, 203, 204,
          301, 302, 303, 304,
          401, 402, 403, 404,
          501, 502, 503, 504,
          601, 602, 603, 604,
          701, 702, 703, 704,
        ]);

        // 根据 petId 计算等级
        const getPetLevel = (petId) => Math.floor(Number(petId) / 100);

        // 拉取宠物列表（每次合成前必须重新调用）
        const fetchPetList = async () => {
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            cmdTimeout,
          );

          // petData.pets 是对象 { slot: { uId, petId, ... } }
          const petsObj = roleRes?.role?.petData?.pets;
          if (!petsObj || typeof petsObj !== "object") return [];

          // 转为数组，slot 作为属性附加
          return Object.entries(petsObj).map(([slot, pet]) => ({
            ...pet,
            slot: Number(slot),
          }));
        };

        // 从宠物列表中筛选图鉴宠物并按等级分组
        const groupByLevel = (petList) => {
          const groups = {};
          for (const pet of petList) {
            const pid = pet.petId || pet.petid || pet.id;
            if (!pid || !codexPetIds.has(Number(pid))) continue;
            const level = getPetLevel(pid);
            if (!groups[level]) groups[level] = [];
            groups[level].push({
              ...pet,
              petId: Number(pid),
              slot: pet.slot,
              uId: pet.uId || pet.uid,
            });
          }
          return groups;
        };

        let totalMergeCount = 0;
        const maxRounds = 30; // 防无限循环

        for (let round = 0; round < maxRounds; round++) {
          if (shouldStop.value) break;

          // 每轮重新拉取最新宠物列表
          const petList = await fetchPetList();
          if (petList.length === 0) {
            if (round === 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 未获取到宠物数据，请检查 role_getroleinfo 响应`,
                type: "warning",
              });
            }
            break;
          }

          const groups = groupByLevel(petList);
          let foundMerge = false;

          // 从低等级到高等级依次合成
          const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);

          // 宠物合成等级限制：如果启用等级限制，则只合成到指定等级
          const maxLevelEnabled = batchSettings.petMergeMaxLevelEnabled || false;
          const maxLevel = batchSettings.petMergeMaxLevel || 4;

          for (const level of levels) {
            if (shouldStop.value) break;

            // 如果启用等级限制，跳过超过上限的等级
            if (maxLevelEnabled && level > maxLevel) {
              continue;
            }

            const pets = groups[level];
            if (pets.length < 2) continue; // 至少2只同等级才能合成

            // 优先找同种合成，找不到则任意同等级合成
            let fromPet = null;
            let toPet = null;
            for (let i = 0; i < pets.length; i++) {
              for (let j = i + 1; j < pets.length; j++) {
                if (pets[i].petId === pets[j].petId) {
                  fromPet = pets[i];
                  toPet = pets[j];
                  break;
                }
              }
              if (fromPet) break;
            }
            // 没有同种配对，取前两只
            if (!fromPet) {
              fromPet = pets[0];
              toPet = pets[1];
            }

            // 4级紫宠合成需要 inheritSlot
            const inheritSlot = level >= 4 ? fromPet.slot : 0;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${level}级合成: 宠物槽位${fromPet.slot}(材料) → 宠物槽位${toPet.slot}(目标)${inheritSlot ? ` inheritSlot=${inheritSlot}` : ""}`,
              type: "info",
            });

            try {
              const result = await tokenStore.sendMessageWithPromise(
                tokenId,
                "pet_merge",
                {
                  fromSlotUId: { slot: fromPet.slot, uId: fromPet.uId },
                  toSlotUId: { slot: toPet.slot, uId: toPet.uId },
                  inheritSlot,
                },
                cmdTimeout,
              );

              if (result?.error) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${level}级合成失败: ${result.error}`,
                  type: "warning",
                });
                // 合成失败不继续尝试同等级，跳到下一等级
                continue;
              }

              totalMergeCount++;
              foundMerge = true;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${level}级合成成功`,
                type: "success",
              });

              await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
              // 合成成功后立即跳出等级循环，重新拉取列表
              break;
            } catch (error) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${level}级合成异常: ${error.message}`,
                type: "warning",
              });
              continue;
            }
          }

          // 本轮没有找到可合成的宠物，退出
          if (!foundMerge) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 没有更多同等级宠物可合成`,
              type: "info",
            });
            break;
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宠物合成结束，共执行 ${totalMergeCount} 次合成`,
          type: totalMergeCount > 0 ? "success" : "info",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宠物合成异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 斑点蛋 + 宠物合成循环
   * 逻辑：使用2个蛋 → 合成1次 → 重复，直到蛋不足2个且无可合成宠物
   * 遇空格不足（12600020）时自动先合成再继续
   */
  const egg_merge_cycle = async () => {
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
      const cmdTimeout = batchSettings.defaultCommandTimeout || 5000;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始点蛋+合成循环: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 图鉴宠物ID集合
        const codexPetIds = new Set([
          101, 102, 103, 104, 201, 202, 203, 204,
          301, 302, 303, 304, 401, 402, 403, 404,
          501, 502, 503, 504, 601, 602, 603, 604,
          701, 702, 703, 704,
        ]);
        const getPetLevel = (petId) => Math.floor(Number(petId) / 100);

        // 获取角色信息（返回 roleInfo 对象）
        const fetchRoleInfo = async () => {
          return await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, cmdTimeout);
        };

        // 蛋类型列表（斑点蛋/盐壳蛋/亮纹蛋）
        const EGG_TYPES = [
          { itemId: 37011, name: "斑点蛋" },
          { itemId: 37012, name: "盐壳蛋" },
          { itemId: 37013, name: "亮纹蛋" },
        ];

        // 获取各类蛋库存
        const getEggInventory = (roleInfo) => EGG_TYPES.map((t) => ({
          ...t,
          count: roleInfo?.role?.items?.[t.itemId]?.quantity || 0,
        }));

        // 获取蛋总数
        const getEggCount = (roleInfo) => getEggInventory(roleInfo).reduce((s, t) => s + t.count, 0);

        // 获取宠物列表
        const getPetList = (roleInfo) => {
          const petsObj = roleInfo?.role?.petData?.pets;
          if (!petsObj || typeof petsObj !== "object") return [];
          return Object.entries(petsObj).map(([slot, pet]) => ({ ...pet, slot: Number(slot) }));
        };

        // 按等级分组（仅图鉴宠物）
        const groupByLevel = (petList) => {
          const groups = {};
          for (const pet of petList) {
            const pid = pet.petId || pet.petid || pet.id;
            if (!pid || !codexPetIds.has(Number(pid))) continue;
            const level = getPetLevel(pid);
            if (!groups[level]) groups[level] = [];
            groups[level].push({ ...pet, petId: Number(pid), uId: pet.uId || pet.uid });
          }
          return groups;
        };

        // 尝试一次合成，返回是否成功
        const tryOneMerge = async (petList) => {
          const groups = groupByLevel(petList);
          const maxLevelEnabled = batchSettings.petMergeMaxLevelEnabled || false;
          const maxLevel = batchSettings.petMergeMaxLevel || 4;
          const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);

          for (const level of levels) {
            if (shouldStop.value) return false;
            if (maxLevelEnabled && level > maxLevel) continue;

            const pets = groups[level];
            if (pets.length < 2) continue;

            // 优先同种配对
            let fromPet = null, toPet = null;
            for (let i = 0; i < pets.length; i++) {
              for (let j = i + 1; j < pets.length; j++) {
                if (pets[i].petId === pets[j].petId) { fromPet = pets[i]; toPet = pets[j]; break; }
              }
              if (fromPet) break;
            }
            if (!fromPet) { fromPet = pets[0]; toPet = pets[1]; }

            // 继承槽位计算：只有 4 级及以上才继承槽位（与原批次合成功能一致）
            const inheritSlot = level >= 4 ? fromPet.slot : 0;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${level}级合成: 槽位${fromPet.slot}(材料) → 槽位${toPet.slot}(目标)${inheritSlot ? ` inheritSlot=${inheritSlot}` : ""}`,
              type: "info",
            });

            try {
              const result = await tokenStore.sendMessageWithPromise(tokenId, "pet_merge", {
                fromSlotUId: { slot: fromPet.slot, uId: fromPet.uId },
                toSlotUId: { slot: toPet.slot, uId: toPet.uId },
                inheritSlot,
              }, cmdTimeout);

              if (result?.error) {
                // 200400 限流：等待后重试
                if (result.error.includes("200400")) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成: 操作太快(200400)，等待10秒后重试`, type: "warning" });
                  await new Promise(r => setTimeout(r, 10000));
                  const retryResult = await tokenStore.sendMessageWithPromise(tokenId, "pet_merge", {
                    fromSlotUId: { slot: fromPet.slot, uId: fromPet.uId },
                    toSlotUId: { slot: toPet.slot, uId: toPet.uId },
                    inheritSlot,
                  }, cmdTimeout);
                  if (retryResult?.error) {
                    addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成重试失败: ${retryResult.error}`, type: "warning" });
                    return false;
                  }
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成成功(重试)`, type: "success" });
                  await new Promise(r => setTimeout(r, _getModuleDelay('store')));
                  return true;
                }
                              
                // 🆕 5 级及以上（橙宠/金宠）合成失败的特殊处理
                if (level >= 5 && result.error.includes("200020")) {
                  addLog({ 
                    time: new Date().toLocaleTimeString(), 
                    message: `${token.name} 🟠 ${level}级橙宠合成需要手动操作！服务器返回：${result.error}`, 
                    type: "warning" 
                  });
                  addLog({ 
                    time: new Date().toLocaleTimeString(), 
                    message: `${token.name} 💡 建议：请进入游戏手动合成 5 级及以上宠物`, 
                    type: "info" 
                  });
                  return false;
                }
                              
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成失败：${result.error}`, type: "warning" });
                return false;
              }
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成成功`, type: "success" });
              await new Promise(r => setTimeout(r, _getModuleDelay('store')));
              return true;
            } catch (err) {
              // 200400 限流：等待后重试
              if (err.message?.includes("200400")) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成: 操作太快(200400)，等待10秒后重试`, type: "warning" });
                await new Promise(r => setTimeout(r,10000));
                try {
                  const retryResult = await tokenStore.sendMessageWithPromise(tokenId, "pet_merge", {
                    fromSlotUId: { slot: fromPet.slot, uId: fromPet.uId },
                    toSlotUId: { slot: toPet.slot, uId: toPet.uId },
                    inheritSlot,
                  }, cmdTimeout);
                  if (retryResult?.error) {
                    addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成重试失败: ${retryResult.error}`, type: "warning" });
                    return false;
                  }
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成成功(重试)`, type: "success" });
                  await new Promise(r => setTimeout(r, _getModuleDelay('store')));
                  return true;
                } catch (retryErr) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成重试异常: ${retryErr.message}`, type: "warning" });
                  return false;
                }
              }
                          
              // 🆕 5 级及以上（橙宠/金宠）合成失败的特殊处理
              if (level >= 5 && err.message?.includes("200020")) {
                addLog({ 
                  time: new Date().toLocaleTimeString(), 
                  message: `${token.name} 🟠 ${level}级橙宠合成需要手动操作！服务器返回：${err.message}`, 
                  type: "warning" 
                });
                addLog({ 
                  time: new Date().toLocaleTimeString(), 
                  message: `${token.name} 💡 建议：请进入游戏手动合成 5 级及以上宠物`, 
                  type: "info" 
                });
                return false;
              }
                          
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${level}级合成异常：${err.message}`, type: "warning" });
              return false;
            }
          }
          return false; // 无可合成
        };

        let totalEggsUsed = 0;
        let totalMergesDone = 0;
        const maxCycles = 100; // 防死循环

        for (let cycle = 0; cycle < maxCycles; cycle++) {
          if (shouldStop.value) break;

          try {
          // 1. 获取最新数据
          const roleInfo = await fetchRoleInfo();
          const eggCount = getEggCount(roleInfo);

          if (eggCount < 2) {
            // 蛋不足2个，检查是否还能合成
            const petList = getPetList(roleInfo);
            const merged = await tryOneMerge(petList);
            if (merged) {
              totalMergesDone++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 蛋不足但合成成功，继续循环...`, type: "info" });
              continue;
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 蛋不足（剩余${eggCount}）且无可合成宠物，停止`, type: "info" });
            break;
          }

          // 2. 使用2个蛋（按斑点蛋→盐壳蛋→亮纹蛋顺序优先使用）
          const eggInventory = getEggInventory(roleInfo);
          let eggsUsedThisCycle = 0;
          let gridFull = false;
          for (let e = 0; e < 2 && !gridFull; e++) {
            if (shouldStop.value) break;
            // 当前蛋类使用失败时（如库存数据滞后）本地清零，改试下一种蛋，直到用成或无蛋可用
            let usedThisSlot = false;
            let rateLimitRetries = 0; // 200400 限流重试次数
            while (!usedThisSlot && !gridFull) {
              if (shouldStop.value) break;
              const egg = eggInventory.find((t) => t.count > 0);
              if (!egg) break;
              try {
                const result = await tokenStore.sendMessageWithPromise(tokenId, "pet_openegg", { itemId: egg.itemId }, cmdTimeout);
                if (result?.error) {
                  if (result.error.includes("12600020") || result.error.includes("1260020")) {
                    addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 宠物格子已满，先合成`, type: "info" });
                    gridFull = true;
                    break;
                  }
                  // 200400 限流：等待后重试当前蛋，不清零库存，最多重试3次
                  if (result.error.includes("200400")) {
                    rateLimitRetries++;
                    if (rateLimitRetries >= 3) {
                      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 限流(200400)重试${rateLimitRetries}次仍失败，跳过当前蛋`, type: "warning" });
                      break;
                    }
                    addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 操作太快(200400)，等待4秒后重试(${rateLimitRetries}/3)`, type: "warning" });
                    await new Promise(r => setTimeout(r, 4000));
                    continue;
                  }
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name})使用失败: ${result.error}，尝试下一种蛋`, type: "warning" });
                  egg.count = 0;
                  continue;
                }
                egg.count--;
                eggsUsedThisCycle++;
                totalEggsUsed++;
                usedThisSlot = true;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name})使用成功`, type: "success" });
                await new Promise(r => setTimeout(r, _getModuleDelay('store')));
              } catch (err) {
                if (err.message?.includes("12600020") || err.message?.includes("1260020")) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 宠物格子已满，开始批量合成`, type: "info" });
                  gridFull = true;
                  // ✅ 新逻辑：不要立即退出，而是尝试连续合成所有能合成的
                  continue; // 🔁 重新进入 while 循环，继续尝试用蛋，同时会触发下面的"批量合成阶段"
                }
                // 200400 限流：等待后重试当前蛋，不清零库存，最多重试3次
                if (err.message?.includes("200400")) {
                  rateLimitRetries++;
                  if (rateLimitRetries >= 3) {
                    addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 限流(200400)重试${rateLimitRetries}次仍失败，跳过当前蛋`, type: "warning" });
                    break;
                  }
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name}): 操作太快(200400)，等待4秒后重试(${rateLimitRetries}/3)`, type: "warning" });
                  await new Promise(r => setTimeout(r, 4000));
                  continue;
                }
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${e + 1}个蛋(${egg.name})使用异常: ${err.message}，尝试下一种蛋`, type: "warning" });
                egg.count = 0;
                continue;
              }
            }
            // 所有蛋类都无法使用 → 退出
            if (!usedThisSlot && !gridFull) break;
          }

          // 格子满或已用蛋 → 尝试批量合成所有能合成的
          if (eggsUsedThisCycle > 0 || gridFull) {
            if (shouldStop.value) break;
            
            let mergeCount = 0;
            const maxMergesPerStage = 50; // 防止死循环
            
            // 🔄 批量合成阶段：连续合掉所有能合成的宠物
            while (mergeCount < maxMergesPerStage && !shouldStop.value) {
              const newRoleInfo = await fetchRoleInfo();
              const petList = getPetList(newRoleInfo);
              const merged = await tryOneMerge(petList);
              
              if (merged) {
                totalMergesDone++;
                mergeCount++;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 🎯 已完成${mergeCount}次批量合成`, type: "success" });
                await new Promise(r => setTimeout(r, _getModuleDelay('store')));
                // ✅ 继续循环，不要 break，让 while 循环继续尝试合成其他同等级的宠物
              } else {
                // 无法再合成 → 停止批量合成
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 💡 当前无更多可合成宠物`, type: "info" });
                
                // 检查格子空间是否已释放
                const latestRoleInfo = await fetchRoleInfo();
                const eggCount = getEggCount(latestRoleInfo);
                
                if (eggCount < 2) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 蛋不足 2 个（剩余${eggCount}），且无法继续合成，停止`, type: "warning" });
                  if (gridFull) {
                    return false; // 格子已满且无蛋可用，任务结束
                  }
                  break; // 跳出批量合成，让主循环判断是否退出
                }
                
                // 还有蛋可用，释放格空间，继续点蛋
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ✅ 格子空间释放（剩余${eggCount}个蛋），恢复点蛋...`, type: "info" });
                gridFull = false;
                // ✅ 不要重置 eggsUsedThisCycle，这个值表示本轮已成功用了几个蛋
                break; // 跳出批量合成循环，回到正常的点蛋流程
              }
            }
          }

          // 本轮一个蛋都没用成且合成也失败 → 退出
          if (eggsUsedThisCycle === 0 && !gridFull) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无法继续，停止`, type: "info" });
            break;
          }
          } catch (cycleErr) {
            // 主循环 200400 限流保护：等待后重试下一轮
            if (cycleErr.message?.includes("200400")) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 循环中操作太快(200400)，等待10秒后继续下一轮`, type: "warning" });
              await new Promise(r => setTimeout(r, 10000));
              continue;
            }
            throw cycleErr; // 非200400错误向上抛出
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 点蛋+合成循环结束，共使用 ${totalEggsUsed} 个蛋，合成 ${totalMergesDone} 次`,
          type: totalEggsUsed > 0 || totalMergesDone > 0 ? "success" : "info",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 点蛋+合成循环异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 宠物一键升级
   * 1. 调用 role_getroleinfo 获取角色数据
   * 2. 从 petData.pets["-1"] 获取上阵宠物的 slot 和 uId
   * 3. 调用 pet_useexpitem 进行一键升级
   */
  const batch_pet_upgrade = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const cmdTimeout = batchSettings.value?.commandTimeout || 8000;

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      if (!token) {
        tokenStatus.value[tokenId] = "failed";
        return;
      }

      try {
        await ensureConnection(tokenId);
        if (shouldStop.value) return;

        // 获取角色信息，提取上阵宠物 (slot="-1")
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          cmdTimeout,
        );

        const petsObj = roleRes?.role?.petData?.pets;
        if (!petsObj || typeof petsObj !== "object") {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到宠物数据`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // slot "-1" 是上阵宠物
        const equippedPet = petsObj["-1"];
        if (!equippedPet) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未找到上阵宠物 (slot=-1)`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const uId = equippedPet.uId || equippedPet.uid;
        const petId = equippedPet.petId || equippedPet.petid;
        const levelBefore = equippedPet.level ?? 0; // 升级前等级

        // 根据 petId 生成宠物名称 (首位=星级, 尾号=系列)
        const petSeriesMap = { 1: "海洋", 2: "陆地", 3: "天空", 4: "幻想" };
        const petStar = Math.floor(Number(petId) / 100);
        const petSeries = Number(petId) % 10;
        const petName = `${petStar}星${petSeriesMap[petSeries] || "未知"}宠`;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 上阵宠物: ${petName}, 当前等级: ${levelBefore}, 开始循环升级`,
          type: "info",
        });

        // 循环调用 pet_useexpitem 直到饼干不够
        let upgradeCount = 0;
        const maxUpgrades = 100; // 防无限循环
        for (let i = 0; i < maxUpgrades; i++) {
          if (shouldStop.value) break;

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "pet_useexpitem",
              {
                slotUId: { slot: -1, uId: uId },
                isOneClick: true,
              },
              cmdTimeout,
            );

            if (result?.error) {
              // 饼干不够或其他错误，停止循环
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 宠物升级停止: ${result.error}，共升级 ${upgradeCount} 次`,
                type: "info",
              });
              break;
            }

            upgradeCount++;
          } catch (err) {
            // 异常时也停止（可能是饼干不足导致的服务器错误）
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 宠物升级停止: ${err.message}，共升级 ${upgradeCount} 次`,
              type: upgradeCount > 0 ? "info" : "warning",
            });
            break;
          }
        }

        // 升级结束后重新获取等级
        let levelAfter = levelBefore;
        if (upgradeCount > 0) {
          try {
            const roleResAfter = await tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              cmdTimeout,
            );
            const petAfter = roleResAfter?.role?.petData?.pets?.["-1"];
            if (petAfter) {
              levelAfter = petAfter.level ?? levelBefore;
            }
          } catch (e) {
            // 获取失败则保持原等级
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宠物循环升级结束，共执行 ${upgradeCount} 次，等级: ${levelBefore} → ${levelAfter}`,
          type: upgradeCount > 0 ? "success" : "info",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宠物升级异常: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 招募福利领取 - 包含所有周免费礼
   * - 招募周免费礼 (activityId: 6)
   * - 黑市周免费礼 (activityId: 5)
   * - 宝箱周免费礼 (activityId: 7)
   * - 宝箱周锤子奖励 (activity_claimredquenchreward)
   * - 周一免费礼 (cmd: activity_claimrolluppack, id: 17)
   */
  const claim_recruit_welfare = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 定义所有周免费礼配置
    const weeklyGifts = [
      {
        name: "招募周免费礼",
        cmd: "activity_buystoregoods",
        params: { activityId: 6, goodsIndex: 0, buyNum: 1 },
      },
      {
        name: "黑市周免费礼",
        cmd: "activity_buystoregoods",
        params: { activityId: 5, goodsIndex: 0, buyNum: 1 },
      },
      {
        name: "宝箱周免费礼",
        cmd: "activity_buystoregoods",
        params: { activityId: 7, goodsIndex: 0, buyNum: 1 },
      },
      {
        name: "宝箱周锤子奖励",
        cmd: "activity_claimredquenchreward",
        params: {},
      },
      {
        name: "周一免费礼",
        cmd: "activity_claimrolluppack",
        params: { id: 17 },
      },
      {
        name: "砸金蛋",
        cmd: "item_openpack",
        params: { itemId: 6001, number: 10, index: 0 },
      },
    ];

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取周免费礼: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;

        // 获取当前活动周
        const activityStatus = getActivityStatus();
        const currentWeek = activityStatus.currentActivityWeek;

        // 依次领取每个礼包
        for (const gift of weeklyGifts) {
          if (shouldStop.value)
            break;

          // 根据活动周判断是否需要执行领取
          let shouldExecute = true;

          // 宝箱周专属礼包（宝箱周免费礼、宝箱周锤子奖励、砸金蛋）
          if (gift.name.includes("宝箱")) {
            shouldExecute = currentWeek === "宝箱周";
          }
          // 黑市周专属礼包
          else if (gift.name.includes("黑市")) {
            shouldExecute = currentWeek === "黑市周";
          }
          // 招募周专属礼包
          else if (gift.name.includes("招募")) {
            shouldExecute = currentWeek === "招募周";
          }
          // 宝箱周锤子奖励和砸金蛋也属于宝箱周
          else if (gift.name.includes("锤子") || gift.name.includes("砸金蛋")) {
            shouldExecute = currentWeek === "宝箱周";
          }
          // 周一免费礼：只在周一执行
          else if (gift.name.includes("周一")) {
            const now = new Date();
            shouldExecute = now.getDay() === 1; // 周一
          }

          // 如果不是当前活动周，跳过
          if (!shouldExecute) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} ${gift.name} (当前是${currentWeek || "未知"}，跳过)`,
              type: "info",
            });
            skipCount++;
            continue;
          }

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取${gift.name}...`,
              type: "info",
            });

            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              gift.cmd,
              gift.params,
              batchSettings.defaultCommandTimeout || 5000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result.error) {
              // 错误码1100010表示已领取或达到上限
              if (result.error.includes("1100010")
                || result.error.includes("已领取")
                || result.error.includes("超出上限")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${gift.name}已领取过或领取已上限`,
                  type: "info",
                });
                skipCount++;
              }
              // 错误码200020对于宝箱周锤子奖励表示已领取
              else if (result.error.includes("200020") && gift.name.includes("锤子")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 已领取过锤子`,
                  type: "info",
                });
                skipCount++;
              }
              // 错误码200020对于周一礼包表示已领取
              else if (result.error.includes("200020") && gift.name.includes("周一")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 周一礼包已领取`,
                  type: "info",
                });
                skipCount++;
              }
              // ✅ 错误码400010对于砸金蛋表示锤子数量不足
              else if (result.error.includes("400010") && gift.name.includes("砸金蛋")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 锤子数量不足，无法砸金蛋`,
                  type: "info",
                });
                skipCount++;
              }
              // 错误码-10006表示还未到活动时间
              else if (result.error.includes("-10006")) {
                // 根据礼包名称显示更具体的提示
                let timeMessage = "还未到活动时间，无法领取";
                if (gift.name.includes("黑市")) {
                  timeMessage = "还未到黑市周，无法领取";
                } else if (gift.name.includes("宝箱")) {
                  timeMessage = "还未到宝箱周，无法领取";
                } else if (gift.name.includes("招募")) {
                  timeMessage = "还未到招募周，无法领取";
                } else if (gift.name.includes("周一")) {
                  timeMessage = "还未到周一，无法领取";
                }

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${gift.name}${timeMessage}`,
                  type: "info",
                });
                skipCount++;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${gift.name}领取失败: ${result.error}`,
                  type: "error",
                });
                failCount++;
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}领取成功`,
                type: "success",
              });
              successCount++;
            }
          } catch (error) {
            const errorMsg = error.message || "";

            // 识别已领取的错误
            if (errorMsg.includes("1100010")
              || errorMsg.includes("已领取")
              || errorMsg.includes("超出上限")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}已领取过或领取已上限`,
                type: "info",
              });
              skipCount++;
            }
            // 错误码200020对于宝箱周锤子奖励表示已领取
            else if (errorMsg.includes("200020") && gift.name.includes("锤子")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 已领取过锤子`,
                type: "info",
              });
              skipCount++;
            }
            // 错误码200020对于周一礼包表示已领取
            else if (errorMsg.includes("200020") && gift.name.includes("周一")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 周一礼包已领取`,
                type: "info",
              });
              skipCount++;
            }
            // ✅ 错误码400010对于砸金蛋表示锤子数量不足
            else if (errorMsg.includes("400010") && gift.name.includes("砸金蛋")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 锤子数量不足，无法砸金蛋`,
                type: "info",
              });
              skipCount++;
            }
            // 错误码-10006表示还未到活动时间
            else if (errorMsg.includes("-10006")) {
              // 根据礼包名称显示更具体的提示
              let timeMessage = "还未到活动时间，无法领取";
              if (gift.name.includes("黑市")) {
                timeMessage = "还未到黑市周，无法领取";
              } else if (gift.name.includes("宝箱")) {
                timeMessage = "还未到宝箱周，无法领取";
              } else if (gift.name.includes("招募")) {
                timeMessage = "还未到招募周，无法领取";
              } else if (gift.name.includes("周一")) {
                timeMessage = "还未到周一，无法领取";
              }

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}${timeMessage}`,
                type: "info",
              });
              skipCount++;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}领取失败: ${errorMsg}`,
                type: "error",
              });
              failCount++;
            }
          }

          // 每个礼包之间稍作延迟
          await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
        }

        // 领取战排金砖奖励（每日可领，不受活动周限制）
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取俱乐部战排日期...`,
            type: "info",
          });

          // 通过 legion_getinfo 获取 warMap，匹配本月和上月的战排日期
          const legionInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_getinfo",
            {},
            8000,
          );

          // warMap 键格式为 YYMMDD（如 260524, 260628），匹配本月和上月
          const warDates = [];
          if (legionInfo?.info?.warMap) {
            const warMapKeys = Object.keys(legionInfo.info.warMap);
            const now = new Date();
            const curYY = String(now.getFullYear()).slice(-2);
            const curMM = String(now.getMonth() + 1).padStart(2, "0");
            const curPrefix = curYY + curMM;
            // 上个月
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastYY = String(lastMonth.getFullYear()).slice(-2);
            const lastMM = String(lastMonth.getMonth() + 1).padStart(2, "0");
            const lastPrefix = lastYY + lastMM;
            // 今日日期字符串，用于过滤未来日期
            const todayStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

            for (const key of warMapKeys) {
              if (key.startsWith(curPrefix) || key.startsWith(lastPrefix)) {
                const yy = key.substring(0, 2);
                const mm = key.substring(2, 4);
                const dd = key.substring(4, 6);
                const dateStr = `20${yy}/${mm}/${dd}`;
                // 只领取已到期（今天及之前）的战排奖励
                if (dateStr <= todayStr) {
                  warDates.push(dateStr);
                }
              }
            }
          }

          if (warDates.length > 0) {
            for (const warDate of warDates) {
              if (shouldStop.value) break;

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取战排金砖奖励 (日期: ${warDate})...`,
                type: "info",
              });

              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "legion_claimwarrankreward",
                  { date: warDate },
                  batchSettings.defaultCommandTimeout || 5000,
                );

                await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 战排金砖(${warDate})100金砖领取成功`,
                  type: "success",
                });
                successCount++;
              } catch (dateErr) {
                const errMsg = dateErr.message || "";
                if (errMsg.includes("1100010") || errMsg.includes("3000280") || errMsg.includes("已领取")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 战排金砖(${warDate})已领取过100金砖奖励`,
                    type: "info",
                  });
                  skipCount++;
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 战排金砖(${warDate})领取失败: ${errMsg}`,
                    type: "error",
                  });
                  failCount++;
                }
              }
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 未获取到战排日期，跳过金砖领取`,
              type: "info",
            });
            skipCount++;
          }
        } catch (warError) {
          const errMsg = warError.message || "";
          if (errMsg.includes("1100010") || errMsg.includes("3000280") || errMsg.includes("已领取")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 战排金砖已领取过100金砖奖励`,
              type: "info",
            });
            skipCount++;
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 战排金砖领取失败: ${errMsg}`,
              type: "error",
            });
            failCount++;
          }
        }

        // 汇总结果
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 周免费礼领取完成: 成功${successCount}个, 跳过${skipCount}个, 失败${failCount}个`,
          type: successCount > 0 ? "success" : "info",
        });

        tokenStatus.value[tokenId] = successCount > 0 || skipCount > 0 ? "completed" : "failed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 周免费礼领取失败: ${error.message || "未知错误"}`,
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
    });

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("周免费礼领取结束");
  };

  /**
   * 黑市周领取免费礼包 - 金砖礼包 + 获取金砖礼包
   */
  const weekly_market_free_gift = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 礼包配置：activityId, goodsIndex, buyNum, 礼包名称
    const giftConfigs = [
      { activityId: 5, goodsIndex: 0, buyNum: 1, name: "金砖礼包" },
      { activityId: 9, goodsIndex: 0, buyNum: 1, name: "获取金砖礼包" },
      { activityId: 9, goodsIndex: 4, buyNum: 1, name: "中级黑市包" },
    ];

    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取黑市周免费礼包: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        let anySuccess = false;
        let allFailed = true;

        // 依次领取每个礼包，互不影响
        for (const gift of giftConfigs) {
          if (shouldStop.value)
            break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取${gift.name}...`,
            type: "info",
          });

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "activity_buystoregoods",
              {
                activityId: gift.activityId,
                goodsIndex: gift.goodsIndex,
                buyNum: gift.buyNum,
              },
              batchSettings.defaultCommandTimeout || 5000,
            );

            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

            if (result.error) {
              if (result.error.includes("已领取") || result.error.includes("超出上限")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${gift.name}本周已领取过，跳过`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} ${gift.name}领取失败: ${result.error}`,
                  type: "warning",
                });
              }
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}领取成功`,
                type: "success",
              });
              anySuccess = true;
              allFailed = false;
            }
          } catch (giftError) {
            // 单个礼包失败不影响其他礼包
            const errorMsg = giftError.message || "";

            // 识别已领取或上限的错误
            const isAlreadyClaimed
              = errorMsg.includes("已领取")
                || errorMsg.includes("超出上限")
                || errorMsg.includes("1100010")
                || errorMsg.includes("未知错误");

            if (isAlreadyClaimed) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}已领取过或领取已上限，跳过`,
                type: "info",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${gift.name}领取异常: ${errorMsg}`,
                type: "warning",
              });
            }
          }
        }

        // 只要有一个礼包成功或全部是已领取状态，就算完成
        if (anySuccess || allFailed) {
          tokenStatus.value[tokenId] = "completed";
        } else {
          tokenStatus.value[tokenId] = "failed";
        }
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 黑市礼包领取过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 批量十殿星级挑战（一键挑战）
   * 逻辑：
   * - 从第1关顺序执行到第8关，所有关卡均可挑战（游戏已取消前置关卡限制）
   * - 某关次数已满（5次）或已有星级 → 跳过继续下一关
   * - 每关最多尝试3次，3次失败后停止
   * - 挑战成功且获得至少1星 → 继续下一关
   * - 挑战失败 / 0星 / 无阵容 / 异常 → 该账号终止
   */
  const batch_star_challenge = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const CMD_DELAY = 500;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const sendCmd = async (tokenId, cmd, params, timeout) => {
      // ✅ 使用用户配置
      const defaultTimeout = timeout || (batchSettings.defaultCommandTimeout || 5000);
      return tokenStore.sendMessageWithPromise(tokenId, cmd, params, defaultTimeout).catch((e) => {
        return { __error: e.message || "" };
      });
    };

    const sendCmdRepeat = async (tokenId, cmd, params, times, delayMs = 300, timeout) => {
      // ✅ 使用用户配置
      const defaultTimeout = timeout || (batchSettings.defaultCommandTimeout || 5000);
      const results = [];
      for (let i = 0; i < times; i++) {
        const res = await sendCmd(tokenId, cmd, params, defaultTimeout);
        results.push(res);
        if (i < times - 1)
          await sleep(delayMs);
      }
      return results;
    };

    const buildBattleTeam = (typeRes, typ) => {
      // 扁平方案 {pos: heroId}
      if (typeRes) {
        const bodyObj = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
        const typeData = bodyObj[String(typ)] || bodyObj[typ];
        const teamInfo = typeData?.teamInfo;
        if (teamInfo && Object.keys(teamInfo).length > 0) {
          const battleTeam = {};
          for (const [slot, hero] of Object.entries(teamInfo)) {
            if (hero?.heroId) {
              battleTeam[slot] = hero.heroId;
            }
          }
          if (Object.keys(battleTeam).length > 0) {
            return { battleTeam, hasNoTeam: false };
          }
        }
      }
      return { battleTeam: {}, hasNoTeam: true };
    };

    const processStarChallenge = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {

          // ✅ 从账号设置读取星级挑战每关最大挑战次数（默认 3 次，总 5 次）
          let maxAttemptsFromSettings = 3;
          try {
            const raw = localStorage.getItem(`daily-settings:${tokenId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.starChallengeAttempts != null) {
                maxAttemptsFromSettings = Math.min(5, Math.max(1, Number(parsed.starChallengeAttempts) || 3));
                addLog({ time: new Date().toLocaleTimeString(), message: `[${token.name}] ⚙️ 从设置读取挑战次数：${maxAttemptsFromSettings}次`, type: "info" });
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `[${token.name}] ⚠️ 未找到 starChallengeAttempts 设置，使用默认 3 次`, type: "info" });
              }
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `[${token.name}] ⚠️ 未找到账号设置或为空，使用默认 3 次`, type: "info" });
            }
          } catch (e) {
            console.error(`读取账号设置失败:`, e);
            addLog({ time: new Date().toLocaleTimeString(), message: `[${token.name}] ⚠️ 解析设置失败，使用默认 3 次`, type: "warning" });
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始 十殿星级挑战，一键挑战: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId);

          // === 进入界面（全局各1次）===
          const roleInfo = tokenStore.gameData.roleInfo;
          const roleId = roleInfo?.role?.roleId;
          // ✅ 使用用户配置
          const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
          const enterPromises = [
            tokenStore.sendMessageWithPromise(tokenId, "nmext_getinfo", {}, commandTimeout).catch(() => {}),
          ];
          if (roleId) {
            enterPromises.push(
              tokenStore.sendMessageWithPromise(tokenId, "nightmare_getroleinfo", { roleId }, commandTimeout).catch(() => {}),
              tokenStore.sendMessageWithPromise(tokenId, "matchteam_getroleteaminfo", { roleID: roleId }, commandTimeout).catch(() => {}),
            );
          }
          await Promise.all(enterPromises);
          await sleep(CMD_DELAY);

          // 解析 starFightCntMap：{ "1": 3, "2": 5, ... }
          const nmextInfo = await tokenStore.sendMessageWithPromise(tokenId, "nmext_getinfo", {}, commandTimeout).catch(() => null);
          const nmextData = nmextInfo?.roleNMExt || nmextInfo?.body?.roleNMExt || nmextInfo;
          const fightCntMap = nmextData?.starFightCntMap || {};

          // 解析 starBossCompleteMap：已有星数
          const completeMap = nmextData?.starBossCompleteMap || {};
          const starsMap = {};
          for (const [lv, stars] of Object.entries(completeMap)) {
            starsMap[lv] = Object.values(stars).filter(Boolean).length;
          }

          // 在for循环开始前，保存初始状态快照
          const initialStarsMap = { ...starsMap };
          const initialFightCntMap = { ...fightCntMap };

          for (let level = 1; level <= 8; level++) {
            if (shouldStop.value)
              break;

            // 次数已满，跳过继续下一关（使用初始快照）
            const usedCount = initialFightCntMap[String(level)] || initialFightCntMap[level] || 0;
            if (usedCount >= 5) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `[${token.name}] 关卡 ${level} 次数已满，跳过`,
                type: "info",
              });
              continue;
            }

            // 已是3星，跳过继续下一关（使用初始快照）
            const currentStars = initialStarsMap[level] || 0;
            if (currentStars >= 3) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `关卡 ${level} 已达3星，跳过`,
                type: "info",
              });
              continue;
            }

            // 已有1-3星，第二次执行时直接跳过（使用初始快照）
            if (currentStars >= 1) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `关卡 ${level} 已达${currentStars}星，已获星级，跳过`,
                type: "info",
              });
              continue;
            }

            // 游戏已取消前置关卡限制，所有关卡均可直接挑战

            const typ = 100 + level;
            let levelCompleted = false; // 标记当前关卡是否完成（获得1-3星）
            let challengeAttempts = 0; // 当前关卡已挑战次数
            // ✅ 使用账号设置的每关最大挑战次数（默认3次，最大5次）
            const MAX_ATTEMPTS = maxAttemptsFromSettings;

            // 单关挑战循环（最多3次尝试，直到获得1-3星）
            while (challengeAttempts < MAX_ATTEMPTS && !levelCompleted) {
              if (shouldStop.value)
                break;

              const attemptNum = challengeAttempts + 1;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `[${token.name}] == 关卡 ${level} 挑战开始（第${attemptNum}次尝试，预设阵容） ==`,
                type: "info",
              });

              // 步骤 1: typegetinfo ×2
              const typeResArr = await sendCmdRepeat(tokenId, "presetteam_typegetinfo", { types: [typ] }, 2, CMD_DELAY);
              const typeRes = typeResArr.find((r) => r && !r.__error) || null;
              await sleep(CMD_DELAY);

              // 构造 battleTeam
              const { battleTeam, hasNoTeam } = buildBattleTeam(typeRes, typ);
              if (hasNoTeam) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] 第${level}关挑战失败，请游戏内检查阵容后重试。`,
                  type: "error",
                });
                challengeAttempts++;
                if (challengeAttempts >= MAX_ATTEMPTS) {
                  addLog({ 
                    time: new Date().toLocaleTimeString(),
                    message: `关卡 ${level} 连续${MAX_ATTEMPTS}次挑战失败，跳过本关继续下一关`,
                    type: "error" 
                  });
                  break;
                }
                await sleep(CMD_DELAY);
                continue;
              }

              // 提取 lordWeaponId
              let lordWeaponId = 0;
              if (typeRes) {
                const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
                const typeData = body[String(typ)] || body[typ];
                if (typeData?.weapon?.weaponId !== undefined) {
                  lordWeaponId = typeData.weapon.weaponId;
                }
              }

              // 步骤 2: calcpower ×2
              await sendCmdRepeat(tokenId, "presetteam_typecalcpowerbyteam", { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
              await sleep(CMD_DELAY);

              // 步骤 3: typesetteam ×2
              const setTeamResArr = await sendCmdRepeat(tokenId, "presetteam_typesetteam", { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
              await sleep(CMD_DELAY);

              // 从 typesetteam 响应中重新获取数据
              let updatedBattleTeam = battleTeam;
              let updatedWeaponId = lordWeaponId;
              for (const setRes of setTeamResArr) {
                if (setRes && !setRes.__error) {
                  const setBody = setRes.presetTeamMap || setRes.body?.presetTeamMap || setRes;
                  const setTypeData = setBody[String(typ)] || setBody[typ];
                  if (setTypeData?.teamInfo) {
                    const newTeam = {};
                    for (const [slot, hero] of Object.entries(setTypeData.teamInfo)) {
                      if (hero?.heroId)
                        newTeam[slot] = hero.heroId;
                    }
                    if (Object.keys(newTeam).length > 0)
                      updatedBattleTeam = newTeam;
                  }
                  if (setTypeData?.weapon?.weaponId !== undefined) {
                    updatedWeaponId = setTypeData.weapon.weaponId;
                  }
                }
              }

              // 步骤 4: calcpower ×4
              await sendCmdRepeat(tokenId, "presetteam_typecalcpowerbyteam", { typ, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId }, 4, CMD_DELAY);
              await sleep(CMD_DELAY);

              // 步骤 5: startboss ×2
              const bossResults = await sendCmdRepeat(
                tokenId,
                "nmext_startboss",
                { bossId: level, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId, presetTeamType: typ },
                2,
                CMD_DELAY,
                8000,
              );

              const bossRes = bossResults.find((r) => r && !r.__error) || null;
              challengeAttempts++;

              if (!bossRes) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] == 关卡 ${level} 无法挑战，该账号没有挑战十殿，请先通过十殿 8 之后再运行 ==`,
                  type: "warning",
                });
                // 直接跳过该账号，不再重试
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `跳过账号 ${token.name} 的十殿星级挑战`,
                  type: "info",
                });
                return; // 直接返回，跳过该账号
              }

              // 解析结果
              const body = bossRes.body || bossRes || {};
              const result = body.result || body;
              const isWin = result.isWin ?? result.iswin ?? result.win;

              if (!isWin) {
              // 挑战失败
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] == 关卡 ${level} 挑战失败 ==`,
                  type: "error",
                });
                if (challengeAttempts >= MAX_ATTEMPTS) {
                  addLog({ 
                    time: new Date().toLocaleTimeString(),
                    message: `关卡 ${level} 连续${MAX_ATTEMPTS}次挑战失败，跳过本关继续下一关`,
                    type: "error" 
                  });
                  break;
                }
                await sleep(CMD_DELAY);
                continue;
              }

              // 解析星数：取 true 的最高 key + 1（响应只含本次新获得的星 index）
              const bossCompleteMap = result.starBossCompleteMap || body.starBossCompleteMap
                || bossRes.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
              let starCount = 0;
              if (bossCompleteMap) {
                const lvData = bossCompleteMap[String(level)] || bossCompleteMap[level];
                if (lvData) {
                  const trueKeys = Object.entries(lvData)
                    .filter(([, v]) => v === true)
                    .map(([k]) => Number.parseInt(k, 10))
                    .filter((k) => !isNaN(k));
                  starCount = trueKeys.length > 0 ? Math.max(...trueKeys) + 1 : 0;
                }
              }

              if (starCount >= 1 && starCount <= 3) {
              // 成功获得 1-3 星，关卡完成
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] == 关卡 ${level} 挑战成功，获得${starCount}星 ==`,
                  type: "success",
                });

                // 更新本地 starsMap 和 fightCntMap
                starsMap[level] = Math.max(starsMap[level] || 0, starCount);
                fightCntMap[level] = (fightCntMap[String(level)] || fightCntMap[level] || 0) + 1;

                levelCompleted = true; // 标记关卡完成
              } else {
              // 成功但 0 星，继续重试
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `[${token.name}] == 关卡 ${level} 挑战成功，获得 0 星，继续重试 ==`,
                  type: "warning",
                });
                if (challengeAttempts >= MAX_ATTEMPTS) {
                  addLog({ message: `关卡 ${level} 连续${MAX_ATTEMPTS}次未获得星级，跳过本关继续下一关`, type: "error" });
                  break;
                }
                await sleep(CMD_DELAY);
              }
            }

            // ✅ 如果当前关卡未完成（未获得1-3星），跳过本关继续下一关（不再终止整个流程）
            if (!levelCompleted) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `[${token.name}] 关卡 ${level} 未完成，跳过继续下一关`,
                type: "warning",
              });
              continue;
            }

            // 第 8 关完成
            if (level === 8) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `[${token.name}] 星级挑战，一键挑战完成。`,
                type: "success",
              });
            }

            await sleep(CMD_DELAY);
          }

          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 十殿星级挑战失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processStarChallenge);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      if (!(await safeDelay(retryWait))) break;
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processStarChallenge);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量十殿星级挑战结束");
  };

  // ========== 邮箱领取与清理 ==========
  const batch_mail_claim_and_cleanup = async () => {
    if (selectedTokens.value.length === 0)
      return;

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
      const cmdTimeout = batchSettings.defaultCommandTimeout || 5000;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始邮箱领取与清理: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 1. 领取分类0全部附件
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取邮箱附件...`,
          type: "info",
        });

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "mail_claimallattachment",
            { category: 0 },
            cmdTimeout,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取附件成功`,
            type: "success",
          });
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取附件异常: ${e.message}`,
            type: "warning",
          });
        }

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // 2. 拉取邮件列表（分页拉取所有0/4/5分类邮件，最多5页防死循环）
        const categoryList = [0, 4, 5];
        let allMails = [];
        let lastId = 0;
        const maxPages = 5;
        let pageCount = 0;

        while (pageCount < maxPages) {
          if (shouldStop.value) break;
          pageCount++;

          try {
            const listRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "mail_getlist",
              { lastId, size: 60, category: categoryList },
              cmdTimeout,
            );

            const mailList = listRes?.list || listRes?.data?.list || listRes?.mailList || [];
            if (mailList.length === 0) break;

            allMails = allMails.concat(mailList);

            const nextId = listRes?.nextLastId || listRes?.data?.nextLastId || listRes?.nextPage || 0;
            // 如果 nextId 没有变化说明已经到最后一页
            if (nextId === 0 || nextId === lastId) break;
            lastId = nextId;
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 拉取邮件列表异常: ${e.message}`,
              type: "warning",
            });
            break;
          }
        }

        if (allMails.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 邮箱为空，无需清理`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取到 ${allMails.length} 封邮件`,
          type: "info",
        });

        // 3. 批量标记已读（每10封邮件添加延迟防限流）
        let readCount = 0;
        for (let i = 0; i < allMails.length; i++) {
          if (shouldStop.value) break;
          const mail = allMails[i];
          const mailId = mail.mailId || mail.id;
          if (!mailId) continue;

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "mail_changestate",
              { mailId, state: 2 },
              cmdTimeout,
            );
            readCount++;
          } catch (e) {
            // 单封失败不中断，继续处理
          }

          // 每处理10封邮件添加一次延迟，避免触发限流
          if ((i + 1) % 10 === 0) {
            await new Promise((r) => setTimeout(r, _getModuleDelay('store')));
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 标记已读 ${readCount} 封`,
          type: "success",
        });

        await new Promise((r) => setTimeout(r, _getModuleDelay('store')));

        // 4. 删除已读邮件（分类0/4/5）
        let delCount = 0;
        for (const cat of categoryList) {
          if (shouldStop.value) break;
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "mail_deleteallunreceivedwithcategory",
              { category: cat },
              cmdTimeout,
            );
            delCount++;
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 删除分类${cat}邮件异常: ${e.message}`,
              type: "warning",
            });
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 邮箱清理完成，删除 ${delCount} 个分类已读邮件`,
          type: "success",
        });

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 邮箱领取与清理失败: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量邮箱领取与清理结束");
  };

  /**
   * 黑市多选购买（定时任务用，从 batchSettings.manualBuyItems 读取配置）
   */
  const manual_buy = async () => {
    const items = batchSettings.manualBuyItems;
    if (!items || items.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: '黑市多选购买：未配置商品，请在设置中配置 manualBuyItems',
        type: 'warning',
      });
      return;
    }
    await store_buy_selectable(items);
  };

  /**
   * 珍宝阁商店购买（定时任务用，从 batchSettings.collectionExchangeItems 读取配置）
   */
  const collection_exchange = async () => {
    const items = batchSettings.collectionExchangeItems;
    if (!items || items.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: '珍宝阁商店购买：未配置商品，请在设置中配置 collectionExchangeItems',
        type: 'warning',
      });
      return;
    }
    await batchCollectionExchange(items);
  };

  /**
   * 天宫助威（盐道淘汰赛助威）
   * 支持两种模式：
   *   1. 传 legionId：直接使用（定时任务配置时已选好队伍）
   *   2. 传 side(1/2)：自动获取 phase 和对阵列表，解析军团 ID
   * @param {number} sideOrLegionId - 助威方向(1=左军,2=右军) 或 直接军团ID
   * @param {number} voteCnt - 助威次数
   * @param {number} [directLegionId] - 直接指定的军团ID（优先使用）
   * @param {string} [directLegionName] - 直接指定的军团名称（日志显示用）
   */
  const batchSaltRoadCheer = async (sideOrLegionId, voteCnt, directLegionId, directLegionName) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const sideLabel = (sideOrLegionId === 1) ? '左军' : '右军';
    
    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value) return;
    
      currentRunningTokenId.value = tokenId;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
    
      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 天宫助威：${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);
    
        let legionId = null;
        let legionName = '';

        if (directLegionId) {
          // 模式1：定时任务已预选军团ID，直接使用
          legionId = directLegionId;
          legionName = directLegionName || `军团${directLegionId}`;
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 使用预选军团: ${legionName}(${directLegionId})`, type: "info" });
        } else {
          // 模式2：通过 side 自动获取 phase 和对阵列表
          const side = sideOrLegionId;

          // --- 自动获取 phase ---
          let phase = null;
          try {
            const firstSaturday = getFirstSaturdayOfMonth();
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取盐战信息 (date=${firstSaturday})...`, type: "info" });
            const warTypeResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getwartype", { date: firstSaturday }, 10000);
            await new Promise((r) => setTimeout(r, _getModuleDelay('club')));
            if (warTypeResp) {
              if (warTypeResp.phase) phase = String(warTypeResp.phase);
              else if (warTypeResp.date) phase = String(warTypeResp.date);
              else if (warTypeResp.currentPhase) phase = String(warTypeResp.currentPhase);
            }
          } catch (e) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取盐战信息失败: ${e.message}，继续尝试...`, type: "warning" });
          }

          // 兜底：使用上周六日期 YYMMDD
          if (!phase) {
            const lastSat = getLastSaturday();
            const parts = lastSat.split('/');
            if (parts.length === 3) {
              phase = parts[0].slice(2) + parts[1] + parts[2];
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 使用兜底 phase: ${phase}`, type: "info" });
          }

          // --- 获取对阵列表 ---
          const opponentResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getoutopponent", { phase }, 10000);
          await new Promise((r) => setTimeout(r, _getModuleDelay('club')));
          if (!opponentResp || !opponentResp.opponentList || opponentResp.opponentList.length === 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 获取对阵列表为空，无法助威`, type: "error" });
            // ✅ 修复："error" 非有效状态，任务完成统计无法识别，改用 failed 并记录原因
            tokenStatus.value[tokenId] = "failed";
            tokenFailReasons.value[tokenId] = '获取对阵列表为空';
            return;
          }

          const firstMatch = opponentResp.opponentList[0];
          legionId = side === 1 ? firstMatch.leftLegion?.id : firstMatch.rightLegion?.id;
          legionName = side === 1 ? (firstMatch.leftLegion?.name || '左军') : (firstMatch.rightLegion?.name || '右军');
        }

        if (!legionId) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 无法获取${sideLabel}军团 ID`, type: "error" });
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = `无法获取${sideLabel}军团ID`;
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 对 ${legionName}(${legionId}) 助威`, type: "info" });
    
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "saltroad_outcheer",
          { legionId },
          batchSettings.defaultCommandTimeout || 8000
        );
        await new Promise((r) => setTimeout(r, _getModuleDelay('club')));

        if (result?.error) {
          const errorMsg = String(result.error);
          if (errorMsg.includes('2300080') || errorMsg.includes('200020')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 天宫助威：已助威，无法重复助威`, type: "warning" });
            tokenStatus.value[tokenId] = "completed";
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 天宫助威失败：${result.error}`, type: "error" });
            tokenStatus.value[tokenId] = "failed";
            tokenFailReasons.value[tokenId] = String(result.error);
          }
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ✅ 天宫助威成功！对 ${legionName} 助威`, type: "success" });
          tokenStatus.value[tokenId] = "completed";
        }
      } catch (e) {
        const errorMsg = String(e.message || '');
        if (errorMsg.includes('2300080') || errorMsg.includes('200020')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 天宫助威：已助威，无法重复助威`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 天宫助威异常：${e.message}`, type: "error" });
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = e.message;
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot(tokenId);
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
      }
    });

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
    message.success("天宫助威批量执行完毕");
  };

  return {
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    store_purchase,
    manual_buy,
    collection_exchange,
    charge_claimaddup_rewards,
    collection_claimfreereward,
    weekly_market_free_gift,
    claim_recruit_welfare,
    claim_weird_tower_all,
    claim_weird_tower_pass,
    use_spotted_egg,
    claim_pet_book,
    batch_pet_merge,
    egg_merge_cycle,
    batch_pet_upgrade,
    store_buy_selectable,
    batchCollectionExchange,
    gacha_drawreward,
    legion_buy_red_jade,
    legion_buy_spotted_egg,
    salt_crystal_shop_buy,
    saltCrystalShopConfig,
    salt_ingot_shop_buy,
    saltIngotShopConfig,
    star_drawturntable,
    batch_star_challenge,
    nightmare_draw_lottery,
    nightmare_claim_book_reward,
    pkroom_appoint,
    claim_guess_coin,
    legion_buy_store_items,
    weeklyMarketBuy,
    batch_mail_claim_and_cleanup,
    saltcup26_openstarpack_use,
    batchSaltCupBet,
    getSaltCupBetInfo,
    batchApexGuess,
    batchApexGuessClaim,
    batchSaltRoadCheer,
  };
}
