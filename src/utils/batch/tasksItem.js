import { HERO_DICT, FishMap } from "@/utils/HeroList";
import { PEACH_TASKS } from "@/utils/PeachTaskIds";
import ConsumeActivityManager from "@/utils/consumeActivityManager";
import { SKIN_DICT } from "@/utils/skinMap";
import { createPushMapRunner } from "@/utils/batch/pushMapRunner";
import { getModuleDelayCompat } from "@/utils/batch/delayManager";

/**
 * 开箱、钓鱼、招募类任务
 * 包含: batchOpenBox, batchClaimBoxPointReward, batchFish, batchRecruit
 */

/**
 * 创建物品类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksItem(deps) {
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
    helperSettings,
    getModuleDelay,
  } = deps;

  // 使用集中式延迟管理器（兼容新旧API）
  const _getModuleDelay = (moduleName) => {
    if (getModuleDelay) return getModuleDelay(moduleName);
    return getModuleDelayCompat(moduleName, batchSettings);
  };

  const boxNames = {
    2001: "木质宝箱",
    2002: "青铜宝箱",
    2003: "黄金宝箱",
    2004: "铂金宝箱",
    2005: "钻石宝箱",
  };

  const fishNames = { 1: "普通鱼竿", 2: "黄金鱼竿" };

  const heroIds = Object.keys(HERO_DICT).map(Number);
    const fishArtifactIds = Object.keys(FishMap).map(Number);

  /**
   * 批量英雄升星
   */
  const batchHeroUpgrade = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processHeroUpgrade = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始英雄升星: ${token.name}（共${heroIds.length}个英雄）===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 等待连接完全稳定
        await new Promise((r) => setTimeout(r, 3000));

        // 连接验证：发送一个轻量命令确认连接真正可用
        let connectionVerified = false;
        for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 5000,
            );
            connectionVerified = true;
            break;
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 连接验证失败(第${verifyAttempt}次)，等待2秒重试...`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, 10000));
          }
        }
        if (!connectionVerified) {
          throw new Error("连接验证失败，无法执行升星操作");
        }

        // === 智能筛选：获取英雄星级和背包数据 ===
        let roleRes;
        try {
          roleRes = await tokenStore.sendMessageWithPromise(
            tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 5000,
          );
        } catch (e) {
          throw new Error("获取角色信息失败，无法执行智能筛选");
        }

        const heroes = roleRes?.role?.heroes || {};
        const items = roleRes?.role?.items || {};
        // 升星消耗表（按星级索引，0-based）
        const STAR_COST = [8,8,8,8,8,40,40,40,40,40,80,80,80,80,80,200,200,200,200,200,400,400,400,400,400,400,400,400,400,400];

        // 筛选可升星英雄
        const eligibleHeroes = [];
        const skippedReasons = [];
        for (const heroId of heroIds) {
          const heroData = heroes[heroId];
          if (!heroData) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 未拥有`);
            continue;
          }
          const currentStar = Number(heroData.star || 0);
          if (currentStar >= 30) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 已满星(${currentStar})`);
            continue;
          }
          // 检查碎片是否足够
          const fragmentCost = STAR_COST[currentStar] || 999;
          const fragmentCount = Number(items[heroId]?.quantity || items[heroId]?.num || 0);
          if (fragmentCount < fragmentCost) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 碎片不足(${fragmentCount}/${fragmentCost})`);
            continue;
          }
          eligibleHeroes.push({ heroId, currentStar, fragmentCount, fragmentCost });
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 筛选结果: ${eligibleHeroes.length}个可升星，${skippedReasons.length}个跳过`,
          type: "info",
        });
        if (eligibleHeroes.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 可升星: ${eligibleHeroes.map(h => `${HERO_DICT[h.heroId]?.name || h.heroId}(${h.currentStar}星)`).join(", ")}`,
            type: "info",
          });
        }
        if (skippedReasons.length <= 10) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 跳过: ${skippedReasons.join(", ")}`,
            type: "info",
          });
        }

        if (eligibleHeroes.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 无满足条件的英雄可升星`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 第一轮：对筛选出的英雄逐个升星
        let heroUpgradeCount = 0;
        let heroTotalStars = 0;
        const firstPassFailed = [];

        for (const { heroId } of eligibleHeroes) {
          if (shouldStop.value)
            break;

          let heroStars = 0;
          // 最多尝试30次（游戏星级上限30星）
          for (let i = 1; i <= 30; i++) {
            if (shouldStop.value)
              break;

            try {
              // resolve 即为成功，reject 表示无法升星
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_heroupgradestar",
                { heroId },
                batchSettings.defaultCommandTimeout || 5000,
              );
              heroStars++;
              heroTotalStars++;
            } catch (err) {
              break;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (heroStars > 0) {
            heroUpgradeCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 英雄:${HERO_DICT[heroId]?.name || heroId} 升星成功 ×${heroStars}`,
              type: "success",
            });
          } else {
            firstPassFailed.push(heroId);
          }
        }

        // 第二轮：重试第一轮失败的英雄（等待更长时间确保连接稳定）
        if (firstPassFailed.length > 0 && !shouldStop.value) {
          await new Promise((r) => setTimeout(r, 2000));
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 第二轮重试 ${firstPassFailed.length} 个未成功英雄`,
            type: "info",
          });
          for (const heroId of firstPassFailed) {
            if (shouldStop.value) break;

            let heroStars = 0;
            for (let i = 1; i <= 30; i++) {
              if (shouldStop.value) break;

              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hero_heroupgradestar",
                  { heroId },
                  batchSettings.defaultCommandTimeout || 5000,
                );
                heroStars++;
                heroTotalStars++;
              } catch (err) {
                break;
              }
              await new Promise((r) => setTimeout(r, _getModuleDelay('hero')));
            }
            if (heroStars > 0) {
              heroUpgradeCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 英雄:${HERO_DICT[heroId]?.name || heroId} 重试升星成功 ×${heroStars}`,
                type: "success",
              });
            }
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 英雄升星完成（${heroUpgradeCount}个英雄升星，共${heroTotalStars}星，${eligibleHeroes.length - heroUpgradeCount}个未能升星）===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 英雄升星失败: ${error.message}`,
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
        currentRunningTokenId.value = null;
      }
    };

    // 分批执行：每批 maxActive 个，一批完成后再执行下一批
    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行第 ${batchNum}/${totalBatches} 批（${batch.length}个账号）`,
        type: "info",
      });
      await Promise.all(batch.map(tokenId => processHeroUpgrade(tokenId)));
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      // 重试也分批执行
      for (let i = 0; i < cur.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = cur.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(tokenId => processHeroUpgrade(tokenId)));
      }
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量英雄升星结束");
  };

  /**
   * 批量图鉴升星（英雄 book_upgrade + 鱼灵 book_upgradeartifact + 皮肤 collection_activate）
   * @param {string[]} types - 要执行的升星类型：'hero'(英雄)、'fish'(鱼灵)、'skin'(皮肤)
   * 与单账号版本 runBookUpgrade 逻辑对齐
   */
  const batchBookUpgrade = async (types = ['hero', 'fish', 'skin']) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processBookUpgrade = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        const typeLabels = { hero: '英雄', fish: '鱼灵', skin: '皮肤' };
        const selectedLabels = types.map(t => typeLabels[t] || t).join('+');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始图鉴升星(${selectedLabels}): ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 等待连接完全稳定（与 batchHeroUpgrade 对齐）
        await new Promise((r) => setTimeout(r, 3000));

        // 连接验证：发送一个轻量命令确认连接真正可用
        let connectionVerified = false;
        for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 5000,
            );
            connectionVerified = true;
            break;
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 连接验证失败(第${verifyAttempt}次)，等待2秒重试...`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        if (!connectionVerified) {
          throw new Error("连接验证失败，无法执行图鉴升星操作");
        }

        let heroTotalStars = 0;
        let fishTotalStars = 0;
        let skinSuccessCount = 0;

        // === 英雄图鉴升星 ===
        if (types.includes('hero')) {
          let heroSuccessCount = 0;
          let heroSkippedCount = 0;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始英雄图鉴升星，共${heroIds.length}个英雄`,
            type: "info",
          });

          for (const heroId of heroIds) {
            if (shouldStop.value) break;

            let heroStars = 0;
            for (let i = 1; i <= 10; i++) {
              if (shouldStop.value) break;

              try {
                // sendMessageWithPromise 已在 packet 层处理 code：
                // code===0 → resolve（成功），code!==0 → reject（失败）
                // 所以 resolve 即为升星成功，reject 进入 catch 表示该英雄无法继续升星
                await tokenStore.sendMessageWithPromise(
                  tokenId, "book_upgrade", { heroId }, batchSettings.defaultCommandTimeout || 8000,
                );
                heroStars++;
                heroTotalStars++;
              } catch (err) {
                // reject 表示服务器返回错误码（碎片不足/已满星等），停止该英雄
                break;
              }
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            }
            if (heroStars > 0) {
              heroSuccessCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 英雄:${HERO_DICT[heroId]?.name || heroId} 图鉴升星成功 ×${heroStars}`,
                type: "success",
              });
            } else {
              heroSkippedCount++;
            }
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 英雄图鉴升星完成：${heroSuccessCount}个英雄升星，共${heroTotalStars}星，${heroSkippedCount}个已满星跳过`,
            type: "success",
          });
        }

        // === 鱼灵图鉴升星 ===
        if (types.includes('fish')) {
          const maxFishStar = 5;
          let fishSuccessCount = 0;
          let fishSkippedCount = 0;

          let fishStarMap = {};
          try {
            const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 8000);
            const role = roleInfo?.role || roleInfo;
            const books = role?.artifactBooks || {};
            for (const [fishId, book] of Object.entries(books)) {
              fishStarMap[Number(fishId)] = book.claimedStar || 0;
            }
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 查询鱼灵星级数据失败，将尝试全部鱼灵: ${e.message}`,
              type: "warning",
            });
          }

          const fishToUpgrade = fishArtifactIds.filter(id => {
            const currentStar = fishStarMap[id];
            if (currentStar !== undefined && currentStar >= maxFishStar) {
              fishSkippedCount++;
              return false;
            }
            return true;
          });

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始鱼灵图鉴升星：${fishToUpgrade.length}个需升星，${fishSkippedCount}个已满星跳过`,
            type: "info",
          });

          for (const artifactId of fishToUpgrade) {
            if (shouldStop.value)
              break;

            const startStar = fishStarMap[artifactId] || 0;
            const isUnowned = fishStarMap[artifactId] === undefined;
            let fishStars = 0;

            for (let star = startStar + 1; star <= maxFishStar; star++) {
              if (shouldStop.value)
                break;

              try {
                // resolve 即为成功，reject 表示无法升星
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "book_upgradeartifact",
                  { artifactId },
                  batchSettings.defaultCommandTimeout || 8000,
                );
                fishStars++;
                fishTotalStars++;
              } catch (err) {
                // 服务器返回错误码，停止该鱼灵升星
                break;
              }
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            }
            if (fishStars > 0) {
              fishSuccessCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 鱼灵:${FishMap[artifactId]?.name || artifactId} ${startStar}→${startStar + fishStars}星`,
                type: "success",
              });
            }
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鱼灵图鉴升星完成：${fishSuccessCount}个升星，共${fishTotalStars}星，${fishSkippedCount}个跳过`,
            type: "success",
          });
        }

        // === 皮肤图鉴激活 ===
        if (types.includes('skin')) {
          const skinEntries = Object.entries(SKIN_DICT);
          let skinSkipCount = 0;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始皮肤图鉴激活，共${skinEntries.length}个皮肤`,
            type: "info",
          });

          for (const [skinId, info] of skinEntries) {
            if (shouldStop.value) break;
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId, "collection_activate",
                { poolType: 2, id: Number(skinId), isAll: false, seriesId: info.heroId },
                batchSettings.defaultCommandTimeout || 8000,
              );
              skinSuccessCount++;
            } catch (err) {
              skinSkipCount++;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }

          // 皮肤激活完成后循环领取图鉴积分
          let claimTotalCount = 0;
          while (!shouldStop.value) {
            try {
              await tokenStore.sendMessageWithPromise(tokenId, "collection_claimtotal", {}, batchSettings.defaultCommandTimeout || 8000);
              claimTotalCount++;
            } catch (err) {
              break;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (claimTotalCount > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 图鉴积分领取成功 ×${claimTotalCount}次`,
              type: "success",
            });
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 皮肤图鉴激活完成：${skinSuccessCount}个成功，${skinSkipCount}个跳过`,
            type: "success",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        const summaryParts = [];
        if (types.includes('hero')) summaryParts.push(`英雄${heroTotalStars}星`);
        if (types.includes('fish')) summaryParts.push(`鱼灵${fishTotalStars}星`);
        if (types.includes('skin')) summaryParts.push(`皮肤${skinSuccessCount}个`);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 图鉴升星全部完成（${summaryParts.join(' + ')}）===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 图鉴升星失败: ${error.message}`,
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
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processBookUpgrade);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processBookUpgrade);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量图鉴升星结束");
  };

  /**
   * 批量鱼灵升星（artifact_upgradestar）
   * itemId 规则：parseInt(fishId + '' + star)，如 1201→12011、1601→16013
   * 与油猴脚本逻辑对齐
   */
  const batchFishUpgrade = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processFishUpgrade = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始鱼灵升星: ${token.name}（共${fishArtifactIds.length}个鱼灵）===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 等待连接完全稳定
        await new Promise((r) => setTimeout(r, 3000));

        // 连接验证
        let connectionVerified = false;
        for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 5000,
            );
            connectionVerified = true;
            break;
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 连接验证失败(第${verifyAttempt}次)，等待2秒重试...`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        if (!connectionVerified) {
          throw new Error("连接验证失败，无法执行鱼灵升星");
        }

        // 与油猴脚本对齐：直接遍历全部鱼灵，不依赖 role_getroleinfo 预查询
        // itemId 规则：parseInt(fishId + '' + star)，如 1201 + '1' = 12011
        const maxFishStar = 5;
        let fishSuccessCount = 0;
        let fishTotalStars = 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开始鱼灵升星，共${fishArtifactIds.length}个鱼灵，目标${maxFishStar}星`,
          type: "info",
        });

        for (const fishId of fishArtifactIds) {
          if (shouldStop.value)
            break;

          let fishStars = 0;
          for (let star = 1; star <= maxFishStar; star++) {
            if (shouldStop.value)
              break;

            // 关键修复：itemId = fishId拼接star，如 1201→12011, 1601→16013
            const itemId = parseInt(fishId + '' + star);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "artifact_upgradestar",
                { heroId: -1, itemId },
                batchSettings.defaultCommandTimeout || 8000,
              );
              fishStars++;
              fishTotalStars++;
            } catch (err) {
              // 第一次失败且是第1星，说明未拥有该鱼灵，跳过
              if (star === 1) break;
              // 已拥有但中间失败，继续尝试下一星
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (fishStars > 0) {
            fishSuccessCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 鱼灵:${FishMap[fishId]?.name || fishId} 升星成功 ×${fishStars}`,
              type: "success",
            });
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 鱼灵升星完成（${fishSuccessCount}个升星，共${fishTotalStars}星）===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鱼灵升星失败: ${error.message}`,
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
        currentRunningTokenId.value = null;
      }
    };

    // 分批执行：每批 maxActive 个，一批完成后再执行下一批
    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行第 ${batchNum}/${totalBatches} 批（${batch.length}个账号）`,
        type: "info",
      });
      await Promise.all(batch.map(tokenId => processFishUpgrade(tokenId)));
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      for (let i = 0; i < cur.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = cur.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(tokenId => processFishUpgrade(tokenId)));
      }
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量鱼灵升星结束");
  };

  /**
   * 批量领取图鉴奖励
   */
  const batchClaimStarRewards = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimStar = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取图鉴奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 与油猴脚本领取图鉴奖励逻辑一致：最多10次，响应码检查
        for (let i = 1; i <= 10; i++) {
          if (shouldStop.value)
            break;
          try {
            // resolve 即为成功，reject 表示无可领取奖励
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "book_claimpointreward",
              {},
              batchSettings.defaultCommandTimeout || 5000,
            );
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取图鉴奖励成功`,
              type: "success",
            });
          } catch (err) {
            // 失败则停止尝试
            break;
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 领取图鉴奖励完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取图鉴奖励失败: ${error.message}`,
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
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processClaimStar);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimStar);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取图鉴奖励结束");
  };

  /**
   * 领取宝箱积分
   */
  const batchClaimBoxPointReward = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimBoxPoint = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取宝箱积分: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        await tokenStore.sendMessageWithPromise(
          tokenId,
          "item_batchclaimboxpointreward",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝箱积分领取成功`,
          type: "success",
        });

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 领取完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processClaimBoxPoint);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimBoxPoint);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取宝箱积分结束");
  };

  /**
   * 宝箱达标奖励自选大奖
   * @param {object} rewardConfig - 奖励配置 { rewardIndex: count }
   */
  const batchClaimBoxWeeklyRewards = async (rewardConfig = { 5: 1 }) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processClaimWeekly = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取宝箱达标奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 遍历奖励配置，领取每个奖励
        for (const [rewardIndex, count] of Object.entries(rewardConfig)) {
          if (shouldStop.value)
            break;

          const rewardIdx = Number(rewardIndex);
          const claimCount = Number(count);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始领取奖励 ${rewardIdx}，共 ${claimCount} 次`,
            type: "info",
          });

          // 循环领取指定次数
          for (let i = 0; i < claimCount; i++) {
            if (shouldStop.value)
              break;

            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "activity_claimweekactreward",
                { typ: 2, selectRewardsMap: { [String(rewardIdx)]: 1 } },
                5000,
              );
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 奖励 ${rewardIdx} 领取成功 (${i + 1}/${claimCount})`,
                type: "success",
              });
            } catch (error) {
              const errorMsg = error.message || "";
              if (errorMsg.includes("已领取") || errorMsg.includes("1100010")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 奖励 ${rewardIdx} 已领取`,
                  type: "info",
                });
              } else if (errorMsg.includes("3300080")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 奖励 ${rewardIdx} 未达标无法领取`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 奖励 ${rewardIdx} 领取失败: ${errorMsg}`,
                  type: "warning",
                });
              }
            }

            // 每次领取后延迟
            if (i < claimCount - 1 && !shouldStop.value) {
              await new Promise(resolve => setTimeout(resolve, _getModuleDelay('daily')));
            }
          }
        }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 领取完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processClaimWeekly);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimWeekly);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取宝箱达标奖励结束");
  };

  /**
   * 批量领取蟠桃园任务
   */
  const batchClaimPeachTasks = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processPeachTasks = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取蟠桃园任务奖励: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadtask",
          {},
          5000,
        );

        const payloadTask = res?.payloadTask || res?.data?.payloadTask;

        if (payloadTask && payloadTask.taskMap) {
          const taskMap = payloadTask.taskMap;
          const tasks = [];
          Object.values(taskMap).forEach((item) => {
            const availableTasks = PEACH_TASKS.filter(
              (t) =>
                t.type === item.typ
                && item.progress >= t.target
                && item.claimedProgress < t.target,
            );
            tasks.push(...availableTasks);
          });

          let claimedCount = 0;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取到 ${tasks.length} 个任务奖励`,
            type: "info",
          });

          for (const task of tasks) {
            if (shouldStop.value)
              break;
            // status not reliable or not present, try claim all
            try {
              const claimRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "legion_claimpayloadtask",
                { taskId: task.id },
                5000,
              );
              const ok = claimRes && claimRes.payloadTask;
              if (ok) {
                claimedCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 领取${task.desc}任务奖励成功`,
                  type: "success",
                });
              }
            } catch (err) {
              // ignore
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }

          // Check and claim point rewards (Moved out of loop to ensure execution)
          try {
            const progressMapres = await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_getpayloadtask",
              {},
              5000,
            );

            if (progressMapres && progressMapres.payloadTask) {
              const legionPoint = progressMapres.payloadTask.legionPoint || 0;
              const selfPoint = progressMapres.payloadTask.selfPoint || 0;
              // progressMap key might be string or number, handle both safely
              const progressMap = progressMapres.payloadTask.progressMap || {};
              const taskGroupprogressMap = progressMap[1] || progressMap["1"] || 0;
              const selfPointprogressMap = progressMap[2] || progressMap["2"] || 0;

              // Club Rewards - Claim all if progress is greater than claimed progress
              if (legionPoint > taskGroupprogressMap && taskGroupprogressMap < 25) {
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "legion_claimpayloadtaskprogress",
                    { taskGroup: 1 },
                    5000,
                  );
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取俱乐部任务奖励 (当前积分: ${legionPoint})`,
                    type: "success",
                  });
                  await new Promise((r) => setTimeout(r, _getModuleDelay('daily')));
                } catch (e) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取俱乐部任务奖励失败: ${e.message}`,
                    type: "error",
                  });
                }
              }

              // Personal Rewards - Claim all if progress is greater than claimed progress
              if (selfPoint > selfPointprogressMap && selfPointprogressMap < 25) {
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "legion_claimpayloadtaskprogress",
                    { taskGroup: 2 },
                    5000,
                  );
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取个人任务奖励 (当前积分: ${selfPoint})`,
                    type: "success",
                  });
                  await new Promise((r) => setTimeout(r, _getModuleDelay('daily')));
                } catch (e) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取个人任务奖励失败: ${e.message}`,
                    type: "error",
                  });
                }
              }
            }
          } catch (err) {
            console.error("领取蟠桃园积分奖励异常:", err);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 领取积分奖励异常: ${err.message}`,
              type: "error",
            });
          }

          if (claimedCount === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 没有可领取的任务奖励`,
              type: "info",
            });
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到任务奖励列表`,
            type: "warning",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 领取蟠桃园任务奖励完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 领取蟠桃园任务奖励失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processPeachTasks);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processPeachTasks);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取蟠桃园任务奖励结束");
  };

  /**
   * 一键灯神扫荡
   */
  const batchGenieSweep = async () => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processGenieSweep = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始灯神扫荡: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 获取最新角色信息
        const roleInfoRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        // 解析灯神进度和扫荡券
        const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
        const genieData = role.genie || {};
        // 扫荡券 ID 1021
        const sweepTicketCount = role.items?.[1021]?.quantity || 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前扫荡券数量: ${sweepTicketCount}`,
          type: "info",
        });

        if (sweepTicketCount <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 扫荡券不足，停止扫荡`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 计算最高层数
        // 1-4: 魏蜀吴群 (0-16 -> 1-17层)
        // 5: 深海 (0-9 -> 1-10层)
        let maxLayer = -1;
        let bestGenieId = -1;

        // 检查魏蜀吴群 (1-4)
        for (let i = 1; i <= 4; i++) {
          if (genieData[i] !== undefined) {
            // 数据值 0 代表 1 层? 用户说 0-16 代表 1-17 层
            // 假设 genieData[i] 是已通过的层数索引
            const currentLayer = genieData[i] + 1;
            if (currentLayer > maxLayer) {
              maxLayer = currentLayer;
              bestGenieId = i;
            }
          }
        }

        if (bestGenieId === -1) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未找到可扫荡的灯神关卡`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const genieNames = { 1: "魏国", 2: "蜀国", 3: "吴国", 4: "群雄", 5: "深海" };
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 扫荡: ${genieNames[bestGenieId]}灯神 (第${maxLayer}层)`,
          type: "info",
        });

        // 开始扫荡
        let remainingTickets = sweepTicketCount;

        while (remainingTickets > 0 && !shouldStop.value) {
          const sweepCnt = Math.min(remainingTickets, 20);

          try {
            const res = await tokenStore.sendMessageWithPromise(
              tokenId,
              "genie_sweep",
              {
                genieId: bestGenieId,
                sweepCnt,
              },
              batchSettings.defaultCommandTimeout || 5000,
            );

            const ok = res && (res.role || res.role.items);

            if (ok) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 扫荡成功 ${sweepCnt} 次`,
                type: "success",
              });
              remainingTickets = res.role.items?.[1021]?.quantity || 0;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 扫荡失败: ${res.hint || "未知错误"}`,
                type: "error",
              });
              break; // 失败则停止
            }
          } catch (err) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 扫荡请求异常: ${err.message}`,
              type: "error",
            });
            break;
          }

          if (remainingTickets > 0) {
            await new Promise((r) => setTimeout(r, _getModuleDelay('tower')));
          }
        }

        // 刷新信息
        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 灯神扫荡完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 灯神扫荡失败: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    };

    await runStreaming(selectedTokens.value, processGenieSweep);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processGenieSweep);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("一键灯神扫荡结束");
  };

  /**
   * 一键开碎片礼包
   * 开启所有类型的碎片礼包：红将、紫将、橙将、精铁、进阶石、白玉、扳手、赛车改装、金币、金砖、晶石、怪异
   * @param {Object} options - 选项
   * @param {boolean} options.isScheduledTask - 是否为定时任务
   * @param {number[]|null} options.selectedItems - 选中的 itemId 数组，null 或未传时全量执行
   */
  const batchOpenFragmentPacks = async (options = {}) => {
    // 兼容旧调用格式：如果传入布尔值，转换为对象
    if (typeof options === 'boolean') {
      options = { isScheduledTask: options, selectedItems: null };
    }
    const isScheduledTask = options.isScheduledTask || false;
    const selectedItems = options.selectedItems || null;
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      // 碎片礼包配置：itemId -> 名称
      const fragmentPacks = [
        { itemId: 3007, name: "随机红将碎片" },
        { itemId: 3005, name: "随机紫将碎片" }, // 修正：应该是 3005 而不是 2005
        { itemId: 3006, name: "随机橙将碎片" },
        { itemId: 3008, name: "精铁福袋" },
        { itemId: 3009, name: "进阶石福袋" },
        { itemId: 3011, name: "白玉福袋" },
        { itemId: 3012, name: "扳手福袋" },
        { itemId: 35011, name: "赛车改装礼盒" },
        { itemId: 3001, name: "金币礼包" },
        { itemId: 3002, name: "金砖礼包" },
        { itemId: 3010, name: "晶石福袋" },
        { itemId: 37005, name: "怪异礼包" },
      ];

      // 遍历所有类型的礼包（按 selectedItems 过滤，未传参时全量执行）
      const packsToOpen = selectedItems && selectedItems.length > 0
        ? fragmentPacks.filter(p => selectedItems.includes(p.itemId))
        : fragmentPacks;

      const processFragmentPacks = async (tokenId) => {
        if (shouldStop.value)
          return;

        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始开碎片礼包: ${token.name} ===`,
            type: "info",
          });

          // 确保连接
          await ensureConnection(tokenId);

          // 获取角色信息，查看拥有的礼包数量
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );

          const items = roleRes?.role?.items || {};
          let totalOpened = 0;

          // 遍历所有类型的礼包
          for (const pack of packsToOpen) {
            if (shouldStop.value)
              break;

            const quantity = Number(items[pack.itemId]?.quantity || 0);

            if (quantity > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 拥有 ${pack.name} x${quantity}，开始开启...`,
                type: "info",
              });

              // 每次最多开启999个，循环开启
              let remaining = quantity;
              let openedCount = 0;

              while (remaining > 0 && !shouldStop.value) {
                const openNumber = Math.min(remaining, 999);

                try {
                  // 开启礼包
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "item_openpack",
                    { itemId: pack.itemId, number: openNumber, index: 0 },
                    batchSettings.battleCommandTimeout || 15000,
                  );

                  openedCount += openNumber;
                  remaining -= openNumber;

                  if (remaining > 0) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 开启 ${pack.name} x${openNumber} 成功，剩余 ${remaining} 个`,
                      type: "success",
                    });
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 开启 ${pack.name} x${openedCount} 成功`,
                      type: "success",
                    });
                  }

                  // 添加延迟避免操作太快
                  await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                } catch (error) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 开启 ${pack.name} x${openNumber} 失败: ${error.message}`,
                    type: "error",
                  });
                  break; // 失败则停止该礼包的开启
                }
              }

              totalOpened += openedCount;
            }
          }

          if (totalOpened > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} === 碎片礼包开启完成，共开启 ${totalOpened} 个 ===`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 没有任何可开启的碎片礼包`,
              type: "warning",
            });
          }

          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开碎片礼包失败: ${error.message}`,
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

      await runStreaming(selectedTokens.value, processFragmentPacks);

      const retryMax = batchSettings.defaultRetryCount || 2;
      const retryWait = batchSettings.retryDelay || 60000;
      let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
      for (let r = 0; r < retryMax && failed.length > 0; r++) {
        if (shouldStop.value) break;
        addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
        await new Promise(r2 => setTimeout(r2, retryWait));
        const cur = [...failed]; failed = [];
        await runStreaming(cur, processFragmentPacks);
        cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
      }

      message.success("一键开碎片礼包结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  const batchOpenBox = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    const boxType = isScheduledTask
      ? batchSettings.defaultBoxType
      : helperSettings.boxType;
    const totalCount = isScheduledTask
      ? batchSettings.boxCount
      : helperSettings.count;
    const batches = Math.floor(totalCount / 10);
    const remainder = totalCount % 10;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processOpenBox = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始批量开箱: ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝箱类型: ${boxNames[boxType]}, 数量: ${totalCount}`,
          type: "info",
        });

        await ensureConnection(tokenId);

        for (let i = 0; i < batches && !shouldStop.value; i++) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_openbox",
            { itemId: boxType, number: 10 },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开箱进度: ${(i + 1) * 10}/${totalCount}`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        if (remainder > 0 && !shouldStop.value) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_openbox",
            { itemId: boxType, number: remainder },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开箱进度: ${totalCount}/${totalCount}`,
            type: "info",
          });
        }
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "item_batchclaimboxpointreward",
        );
        await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 开箱完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开箱失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processOpenBox);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenBox);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量开箱结束");
  };

  /**
   * 批量开钻石宝箱
   * 查询背包中钻石宝箱(itemId:2005)数量，全部开启
   */
  const batchOpenDiamondBox = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const DIAMOND_BOX_ID = 2005;

    const processOpenDiamondBox = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始开钻石宝箱: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 查询角色信息获取钻石宝箱数量
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        const items = roleRes?.role?.items || roleRes?.data?.role?.items || {};
        const boxCount = Number(items[DIAMOND_BOX_ID]?.quantity || 0);

        if (boxCount <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有钻石宝箱，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 拥有钻石宝箱 x${boxCount}，开始开启`,
          type: "info",
        });

        // 每次最多开启999个，循环开启
        let remaining = boxCount;
        let totalOpened = 0;

        while (remaining > 0 && !shouldStop.value) {
          const openNumber = Math.min(remaining, 999);

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "item_openbox",
              { itemId: DIAMOND_BOX_ID, number: openNumber, index: 0 },
              batchSettings.battleCommandTimeout || 15000,
            );

            totalOpened += openNumber;
            remaining -= openNumber;

            if (remaining > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 开启钻石宝箱 x${openNumber} 成功，剩余 ${remaining} 个`,
                type: "success",
              });
            }
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 开启钻石宝箱 x${openNumber} 失败: ${error.message}`,
              type: "error",
            });
            break;
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        // 领取宝箱积分奖励
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "item_batchclaimboxpointreward",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );
        } catch (e) { /* ignore */ }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");

        if (totalOpened > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} === 钻石宝箱开启完成，共开启 ${totalOpened} 个 ===`,
            type: "success",
          });
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 开钻石宝箱失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processOpenDiamondBox);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenDiamondBox);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("批量开钻石宝箱结束");
    }
  };

  /**
   * 批量钓鱼
   */
  const batchFish = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0)
      return;
  
    isRunning.value = true;
    shouldStop.value = false;
  
    const fishType = isScheduledTask
      ? batchSettings.defaultFishType
      : helperSettings.fishType;
    const totalCount = isScheduledTask
      ? batchSettings.fishCount
      : helperSettings.count;
      
    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });
  
    // 记录需要重试的 Token（400340/200750/11800010错误）
    const retryTokens = [];
    const MAX_RETRIES = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2;
  
    await runStreaming(selectedTokens.value, async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始批量钓鱼：${token.name} ===`,
          type: "info",
        });
        
        await ensureConnection(tokenId);
        
        // ✅ 新增：检查月度任务钓鱼进度
        let myMonthInfo = tokenStore.getTokenGameData(tokenId)?.myMonthInfo || {};
        const fishProgress = Number(myMonthInfo?.["2"]?.num || 0);
        const fishTarget = 320; // 月度任务目标次数
                
        if (fishProgress >= fishTarget) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 月度钓鱼任务已完成 (${fishProgress}/${fishTarget})，跳过本次批量操作`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // ✅ 优先从 tokenGameDataMap 获取指定 tokenId 的角色信息
        let role = tokenStore.getTokenGameData(tokenId)?.roleInfo?.role;
        if (!role) {
          try {
            const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
            role = roleInfo?.role || tokenStore.getTokenGameData(tokenId)?.roleInfo?.role;
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 获取角色信息失败：${error.message}`,
              type: "warning",
            });
          }
        }
        // 普通鱼竿: 1011, 黄金鱼竿: 1012
        const rodId = fishType === 1 ? 1011 : 1012;
        const rodCount = role?.items?.[rodId]?.quantity || 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鱼竿类型：${fishNames[fishType]}, 目标数量：${totalCount}, 当前库存：${rodCount}`,
          type: "info",
        });
                
        // ✅ 计算剩余可执行次数（取用户输入次数、鱼竿数量和剩余任务进度的最小值）
        const remainingCount = fishTarget - fishProgress;
        const availableCount = Math.min(totalCount, rodCount, remainingCount);
        
        if (availableCount <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有可用的鱼竿（鱼竿:${rodCount}, 剩余任务:${remainingCount}），停止任务`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const batches = Math.floor(availableCount / 10);
        const remainder = availableCount % 10;

        for (let i = 0; i < batches && !shouldStop.value; i++) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "artifact_lottery",
            { type: fishType, lotteryNumber: 10, newFree: true },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼进度：${(i + 1) * 10}/${availableCount}`,
            type: "info",
          });
        
          // ✅ 使用模块级别的延迟控制（支持单账号加速）
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

          // 每5轮（50次）后，重新校验鱼竿数量
          if ((i + 1) % 5 === 0 && i < batches - 1) {
            try {
              const roleRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "role_getroleinfo",
                {},
                10000,
              );
              const currentRole = roleRes?.role || roleRes?.data?.role;
              if (currentRole) {
                const currentRodCount = currentRole.items?.[rodId]?.quantity || 0;

                // 剩余需要的次数 (不包括当前这轮，因为i已经执行完了，所以剩余次数是 (batches - 1 - i) * 10 + remainder)
                // 但实际上我们只需要知道下一轮是否有足够的鱼竿
                // 如果当前库存少于10，说明下一轮可能不够，或者整个任务不够
                // 重新计算 availableCount 可能会比较复杂，因为循环是基于 batches

                if (currentRodCount < 10) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 同步后发现鱼竿不足 (${currentRodCount} < 10)，停止后续批量任务`,
                    type: "warning",
                  });
                  // 强制停止
                  break;
                }
              }
            } catch (e) {
              // ignore
            }
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        if (remainder > 0 && !shouldStop.value) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "artifact_lottery",
            { type: fishType, lotteryNumber: remainder, newFree: true },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼进度: ${availableCount}/${availableCount}`,
            type: "info",
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
                  // 稍微延迟，避免请求过快
                  await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                } catch (err) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 领取累计奖励失败 (第${k + 1}次): ${err.message}`,
                    type: "warning",
                  });
                  break; // 如果出错可能是不满足条件，停止领取
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
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 钓鱼完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        const errMsg = error.message || "";
              
        // ✅ 检测钓鱼相关错误
        if (errMsg.includes("400340") || errMsg.includes("200750") || errMsg.includes("11800010")) {
          const errorCode = errMsg.includes("400340") ? "400340 服务器限流" : errMsg.includes("200750") ? "200750 服务器错误" : "11800010 未知错误";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼失败：${errorCode}，加入重试队列`,
            type: "warning",
          });
          retryTokens.push({ tokenId, tokenName: token.name, error: errMsg });
          tokenStatus.value[tokenId] = "waiting_retry";
        } else if (errMsg.includes("200020")) {
          // ❌ 200020 错误：免费次数未使用无法批量（鱼竿库存充足但没消耗免费次数）
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼失败：当前钓鱼免费次数未使用，无法批量钓鱼`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 钓鱼失败：${error.message}`,
            type: "error",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    });

    // 处理需要重试的账号
    if (retryTokens.length > 0 && !shouldStop.value) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 发现 ${retryTokens.length} 个账号出现400340/200750/11800010错误，开始重试 ===`,
        type: "info",
      });

      const retryWaitTime = batchSettings.retryDelay || 60000;
      await new Promise((r) => setTimeout(r, retryWaitTime));

      for (let retryCount = 1; retryCount <= MAX_RETRIES && retryTokens.length > 0 && !shouldStop.value; retryCount++) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `--- 第 ${retryCount}/${MAX_RETRIES} 轮重试 (${retryTokens.length} 个账号) ---`,
          type: "info",
        });

        const stillFailed = [];

        for (const retryTask of retryTokens) {
          if (shouldStop.value)
            break;

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 重试钓鱼: ${retryTask.tokenName} ===`,
              type: "info",
            });

            await ensureConnection(retryTask.tokenId);

            const availableCount = totalCount;
            const batches = Math.floor(availableCount / 10);
            const remainder = availableCount % 10;

            for (let i = 0; i < batches && !shouldStop.value; i++) {
              await tokenStore.sendMessageWithPromise(
                retryTask.tokenId,
                "artifact_lottery",
                { type: fishType, lotteryNumber: 10, newFree: true },
                5000,
              );
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            }

            if (remainder > 0 && !shouldStop.value) {
              await tokenStore.sendMessageWithPromise(
                retryTask.tokenId,
                "artifact_lottery",
                { type: fishType, lotteryNumber: remainder, newFree: true },
                5000,
              );
              // ✅ 使用模块级别的延迟控制（支持单账号加速）
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            }

            tokenStatus.value[retryTask.tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${retryTask.tokenName} 重试成功`,
              type: "success",
            });
          } catch (error) {
            const errMsg = error.message || "";
            // ✅ 检测钓鱼相关错误（200020 免费次数未使用，不重试）
            if (errMsg.includes("400340") || errMsg.includes("200750") || errMsg.includes("11800010")) {
              stillFailed.push(retryTask);
              tokenStatus.value[retryTask.tokenId] = "waiting_retry";
            } else {
              tokenStatus.value[retryTask.tokenId] = "failed";
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${retryTask.tokenName} 重试失败：${errMsg.includes("200020") ? "当前钓鱼免费次数未使用，无法批量钓鱼" : errMsg}`,
              type: "error",
            });
          } finally {
            tokenStore.closeWebSocketConnection(retryTask.tokenId);
            releaseConnectionSlot();
          }
        }

        retryTokens.length = 0;
        retryTokens.push(...stillFailed);

        if (stillFailed.length > 0 && retryCount < MAX_RETRIES) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${stillFailed.length} 个账号重试失败，等待${retryWaitTime / 1000}秒后进行下一轮重试`,
            type: "warning",
          });
          await new Promise((r) => setTimeout(r, retryWaitTime));
        }
      }

      // 最终结果
      const successCount = selectedTokens.value.length - retryTokens.length;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 钓鱼重试完成 ===`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `重试成功: ${successCount} 个`,
        type: "success",
      });
      if (retryTokens.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `重试失败: ${retryTokens.length} 个`,
          type: "error",
        });
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量钓鱼结束");
  };

  /**
   * 批量招募
   */
  const batchRecruit = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    const totalCount = isScheduledTask
      ? batchSettings.recruitCount
      : helperSettings.count;
    const batches = Math.floor(totalCount / 10);
    const remainder = totalCount % 10;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processRecruit = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始批量招募: ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 招募数量: ${totalCount}`,
          type: "info",
        });

        await ensureConnection(tokenId);

        for (let i = 0; i < batches && !shouldStop.value; i++) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_recruit",
            { recruitType: 1, recruitNumber: 10 },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 招募进度: ${(i + 1) * 10}/${totalCount}`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        if (remainder > 0 && !shouldStop.value) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_recruit",
            { recruitType: 1, recruitNumber: remainder },
            5000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 招募进度: ${totalCount}/${totalCount}`,
            type: "info",
          });
        }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 招募完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 招募失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processRecruit);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processRecruit);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量招募结束");
  };

  const batchOpenBoxByPoints = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    const TARGET_SCORE_PER_ROUND = 8000; // 每轮目标积分
    const MAX_ROUNDS = 4; // 最多4轮

    const targetRounds = isScheduledTask
      ? (batchSettings.targetBoxRounds || 1)
      : (helperSettings.targetRounds || 1);

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processOpenBoxByPoints = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始按积分开箱 [实时查询版]: ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 目标轮数: ${targetRounds} 轮（每轮 ${TARGET_SCORE_PER_ROUND} 积分）`,
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

          // 3️⃣ 按固定优先级开箱（青铜→黄金→铂金）
          let opened = false;
          let lastBoxId = null;

          const priority = [2002, 2003, 2004]; // 青铜优先

          for (const boxId of priority) {
            if (shouldStop.value) break;

            const stock = bagItems[boxId]?.quantity || 0;
            const pts = BOX_POINTS[boxId];

            // 计算按当前剩余积分最多能开多少批箱子（每批 10 个）
            const maxBoxesByScore = Math.floor(remain / pts);
            const maxBatchCount = Math.floor(maxBoxesByScore / 10); // 最多能开多少批（每批 10 个）

            // 🎯 情况 A：剩余积分足够开 ≥10 个 → 标准批量模式（每批 10-100 个）
            if (maxBatchCount >= 1 && stock >= 10) {
              const actual = Math.floor(Math.min(10 * maxBatchCount, 100, stock) / 10) * 10;
              if (actual < 10) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ ${getBoxName(boxId)} 库存不足`, type: "warning" });
                continue;
              }

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
                bagItems[boxId].quantity -= actual;
                await new Promise((r) => setTimeout(r, _getModuleDelay('openbox')));
                break; // 每次只开一种箱子

              } catch (openErr) {
                const errMsg = openErr.message || "";
                if (errMsg.includes("服务器错误：400000") || errMsg.includes("已上限") || errMsg.includes("物品数量不足")) {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ ${getBoxName(boxId)} 不足或已满，跳过`, type: "warning" });
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 开${getBoxName(boxId)} 失败：${errMsg}`, type: "error" });
                }
              }
            }
          }

          // 4️⃣ 每开 50 个高级箱就尝试领取一次奖励补货
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
            // 首先尝试领取积分奖励获取新箱子（每轮最多领 1 次，避免空转）
            if (!lastBoxId) { // 仅当本轮还没开过箱时才尝试补货
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
                    message: `${token.name} ✅ 补货到高级箱 (${newBronze}青铜/${newGold}黄金)，本轮将继续开箱`,
                    type: "info",
                  });
                  // 不 continue，让下面的开箱逻辑继续执行，因为 bagItems 已更新
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ⚠️ 补货未获高级箱，将使用木质宝箱`,
                    type: "warning",
                  });
                }

              } catch (claimErr) {
                // 领取失败不影响继续用木质
              }
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

        // 7️⃣ while 循环结束后：完成
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 🎉 按积分开箱完成 (共开${totalOpened}个箱)`,
          type: "success",
        });

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
          message: `${token.name} 按积分开箱失败: ${error.message}`,
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

    await runStreaming(selectedTokens.value, processOpenBoxByPoints);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenBoxByPoints);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("按积分开箱结束");
  };

  /**
   * 英雄四圣升级
   * @param {Array} heroIds - 英雄ID数组
   */
  const heroFourSaintsUpgrade = async (heroIds = [], isScheduledTask = false) => {
    if (selectedTokens.value.length === 0 || heroIds.length === 0) {
      if (!isScheduledTask) {
        message.warning("请选择账号和英雄");
      }
      return;
    }

    // 限制：每次只能单个英雄升级
    if (heroIds.length > 1) {
      if (!isScheduledTask) {
        message.warning("四圣升级每次只能选择一个英雄，请重新选择");
      }
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;
    currentRunningTokenId.value = null;

    // 英雄ID与名称映射
    const heroNameMap = {
      101: "司马懿",
      103: "关羽",
      104: "诸葛亮",
      105: "周瑜",
      106: "太史慈",
      107: "吕布",
      109: "甄姬",
      111: "孙策",
      112: "贾诩",
      113: "曹仁",
      114: "姜维",
      116: "公孙瓒",
      117: "典韦",
      118: "赵云",
      120: "张角",
      121: "鲁肃",
    };

    const processFourSaints = async (tokenId) => {
      const token = tokens.value.find((t) => t.id === tokenId);
      if (!token)
        return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;

        try {
          await ensureConnection(tokenId);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始 ${token.name} 英雄四圣升级 ===`,
            type: "info",
          });

          // 遍历每个英雄
          for (const heroId of heroIds) {
            if (shouldStop.value)
              break;

            const heroName = heroNameMap[heroId] || `英雄${heroId}`;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 开始升级 ${heroName} 四圣`,
              type: "info",
            });

            try {
              // 四圣升级逻辑：红玉1次 → 蓝玉循环到上限 → 红玉1次 → (成功则继续蓝玉，失败则停止)
              let totalUpgradeCount = 0; // 红玉总次数
              let totalQuenchCount = 0; // 蓝玉总次数

              // 1. 第一次红玉升级（不管成功失败）
              let firstUpgradeSuccess = false;
              try {
                const upgradeResult = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hb_upgradeorder",
                  { heroId },
                  batchSettings.defaultCommandTimeout || 5000,
                );

                if (upgradeResult && upgradeResult.error) {
                  // 第一次红玉升级失败，判断为未开启四圣或缺少材料
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${heroName} 未开启四圣或缺少红玉/蓝玉，跳过该英雄`,
                    type: "warning",
                  });
                  firstUpgradeSuccess = false;
                } else {
                  totalUpgradeCount++;
                  firstUpgradeSuccess = true;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${heroName} 红玉升级第 ${totalUpgradeCount} 次成功`,
                    type: "success",
                  });
                }
              } catch (error) {
                // 第一次红玉升级就出错，判断为未开启四圣或缺少材料
                // 错误码400000表示物品不存在，400010表示物品数量不足（缺少红玉）
                const errorMsg = error.message?.includes("400000") || error.message?.includes("400010")
                  ? `${token.name} ${heroName} 红玉数量缺少，无法升级成功`
                  : `${token.name} ${heroName} 未开启四圣或缺少红玉，跳过该英雄`;

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: errorMsg,
                  type: "warning",
                });
                firstUpgradeSuccess = false;
              }

              // 2. 不管红玉是否成功，都要执行蓝玉升级循环
              if (!shouldStop.value) {
                // 延迟
                await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                let quenchCount = 0;
                let quenchStopped = false;
                const MAX_QUENCH = 200; // 安全上限，防止无限循环
                while (!quenchStopped && !shouldStop.value && quenchCount < MAX_QUENCH) {
                  try {
                    const quenchResult = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "hb_quench",
                      { heroId },
                      batchSettings.defaultCommandTimeout || 5000,
                    );

                    if (quenchResult && quenchResult.error) {
                      // 蓝玉升级到达上限
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 蓝玉升级已达上限或失败: ${quenchResult.error}`,
                        type: "info",
                      });
                      quenchStopped = true;
                    } else {
                      quenchCount++;
                      totalQuenchCount++;
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 蓝玉升级第 ${quenchCount} 次成功`,
                        type: "success",
                      });
                      // 延迟后继续
                      await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                    }
                  } catch (error) {
                    // 错误码200020表示已达上限，400000表示物品不存在（缺少蓝玉）
                    let errorMsg;
                    if (error.message?.includes("200020")) {
                      errorMsg = `${token.name} ${heroName} 蓝玉升级已达上限`;
                    } else if (error.message?.includes("400000")) {
                      errorMsg = `${token.name} ${heroName} 蓝玉升级已达上限`;
                    } else {
                      errorMsg = `${token.name} ${heroName} 蓝玉升级出错: ${error.message}`;
                    }

                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: errorMsg,
                      type: error.message?.includes("200020") || error.message?.includes("400000") ? "info" : "error",
                    });
                    quenchStopped = true;
                  }
                }

                if (quenchCount > 0) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${heroName} 蓝玉升级完成 - ${quenchCount}次`,
                    type: "info",
                  });
                }
              }

              // 3. 如果第一次红玉成功，进入循环：红玉1次 → 成功则蓝玉循环 → 失败则停止
              if (firstUpgradeSuccess && !shouldStop.value) {
                // 延迟后进入循环
                await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                let shouldContinue = true;
                let redJadeCount = 0;
                const MAX_RED_JADE = 50; // 安全上限，防止无限循环
                while (shouldContinue && !shouldStop.value && redJadeCount < MAX_RED_JADE) {
                  redJadeCount++;
                  // 执行红玉升级1次
                  let currentUpgradeSuccess = false;
                  try {
                    const upgradeResult = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "hb_upgradeorder",
                      { heroId },
                      batchSettings.defaultCommandTimeout || 5000,
                    );

                    if (upgradeResult && upgradeResult.error) {
                      // 红玉升级失败，停止整个流程
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 红玉升级已达上限或失败: ${upgradeResult.error}`,
                        type: "info",
                      });
                      shouldContinue = false;
                    } else {
                      totalUpgradeCount++;
                      currentUpgradeSuccess = true;
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 红玉升级第 ${totalUpgradeCount} 次成功`,
                        type: "success",
                      });
                    }
                  } catch (error) {
                    // 错误码200020表示已升级成功，400000/400010表示物品不存在或数量不足（缺少红玉）
                    let errorMsg;
                    if (error.message?.includes("200020")) {
                      errorMsg = `${token.name} ${heroName} 红玉已升级成功`;
                      // 200020表示成功，继续执行
                      totalUpgradeCount++;
                      currentUpgradeSuccess = true;
                    } else if (error.message?.includes("400000") || error.message?.includes("400010")) {
                      errorMsg = `${token.name} ${heroName} 红玉数量缺少，无法升级成功`;
                      shouldContinue = false;
                    } else {
                      errorMsg = `${token.name} ${heroName} 红玉升级出错: ${error.message}`;
                      shouldContinue = false;
                    }

                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: errorMsg,
                      type: error.message?.includes("200020") ? "success" : (error.message?.includes("400000") || error.message?.includes("400010") ? "info" : "error"),
                    });
                  }

                  // 如果红玉成功，执行蓝玉升级循环
                  if (currentUpgradeSuccess && !shouldStop.value) {
                    // 延迟
                    await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                    let quenchCount = 0;
                    let quenchStopped = false;
                    const MAX_QUENCH2 = 200; // 安全上限，防止无限循环
                    while (!quenchStopped && !shouldStop.value && quenchCount < MAX_QUENCH2) {
                      try {
                        const quenchResult = await tokenStore.sendMessageWithPromise(
                          tokenId,
                          "hb_quench",
                          { heroId },
                          batchSettings.defaultCommandTimeout || 5000,
                        );

                        if (quenchResult && quenchResult.error) {
                          // 蓝玉升级到达上限
                          addLog({
                            time: new Date().toLocaleTimeString(),
                            message: `${token.name} ${heroName} 蓝玉升级已达上限或失败: ${quenchResult.error}`,
                            type: "info",
                          });
                          quenchStopped = true;
                        } else {
                          quenchCount++;
                          totalQuenchCount++;
                          addLog({
                            time: new Date().toLocaleTimeString(),
                            message: `${token.name} ${heroName} 蓝玉升级第 ${quenchCount} 次成功`,
                            type: "success",
                          });
                          // 延迟后继续
                          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                        }
                      } catch (error) {
                        // 错误码200020表示已达上限，400000表示物品不存在（缺少蓝玉）
                        let errorMsg;
                        if (error.message?.includes("200020")) {
                          errorMsg = `${token.name} ${heroName} 蓝玉升级已达上限`;
                        } else if (error.message?.includes("400000")) {
                          errorMsg = `${token.name} ${heroName} 蓝玉升级已达上限`;
                        } else {
                          errorMsg = `${token.name} ${heroName} 蓝玉升级出错: ${error.message}`;
                        }

                        addLog({
                          time: new Date().toLocaleTimeString(),
                          message: errorMsg,
                          type: error.message?.includes("200020") || error.message?.includes("400000") ? "info" : "error",
                        });
                        quenchStopped = true;
                      }
                    }

                    if (quenchCount > 0) {
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 本轮蓝玉升级完成 - ${quenchCount}次`,
                        type: "info",
                      });
                    }

                    // 延迟后继续下一轮红玉升级
                    await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                  }
                }
              }

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${heroName} 四圣升级完成 - 红玉${totalUpgradeCount}次, 蓝玉${totalQuenchCount}次`,
                type: "success",
              });

              // 英雄间延迟
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            } catch (error) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${heroName} 升级失败: ${error.message}`,
                type: "error",
              });
            }
          }

          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 英雄四圣升级完成 ===`,
            type: "success",
          });
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 英雄四圣升级失败: ${error.message}`,
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
          currentRunningTokenId.value = null;
        }
    };

    await runStreaming(selectedTokens.value, processFourSaints);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processFourSaints);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("英雄四圣升级结束");
    }
  };

  // ====== 消耗活动共享辅助函数 ======
  const _consumeActivityBatchCmd = async (tokenId, cmd, getParams, totalQty, label) => {
    const DELAY = _getModuleDelay('default');
    const batchSize = 10;
    const batches = Math.floor(totalQty / batchSize);
    const remainder = totalQty % batchSize;
    let executed = 0;
    for (let i = 0; i < batches; i++) {
      if (shouldStop.value) throw new Error('用户停止');
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(batchSize), 15000);
      executed += batchSize;
      addLog({ time: new Date().toLocaleTimeString(), message: `${label}${batchSize}个 (${executed}/${totalQty})`, type: "info" });
      if (DELAY > 0) await new Promise(r => setTimeout(r, DELAY));
    }
    if (remainder > 0) {
      if (shouldStop.value) throw new Error('用户停止');
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(remainder), 15000);
      executed += remainder;
      addLog({ time: new Date().toLocaleTimeString(), message: `${label}${remainder}个 (${executed}/${totalQty})`, type: "info" });
    }
  };

  const _consumeActivityChestLoop = async (tokenId, role, progressList, manager, getMaxTarget, formatNum) => {
    const chestPriority = [
      { id: 2004, points: 50, name: '铂金宝箱' },
      { id: 2003, points: 20, name: '黄金宝箱' },
      { id: 2002, points: 10, name: '青铜宝箱' },
      { id: 2001, points: 1, name: '木质宝箱' },
    ];
    let round = 0, totalOpened = 0, totalPoints = 0;
    while (true) {
      if (shouldStop.value) break;
      round++;
      const chestProgress = progressList.find(p => p.id === 2);
      if (!chestProgress || chestProgress.isCompleted) break;
      const maxTarget = getMaxTarget(2);
      const pointGap = maxTarget - chestProgress.current;
      if (pointGap <= 0) break;
      const items = role?.items || role?.itemList || {};
      const plan = [];
      let rem = pointGap;
      for (const chest of chestPriority) {
        if (rem <= 0) break;
        const available = items[chest.id]?.quantity || 0;
        if (available <= 0) continue;
        const availableRound = Math.floor(available / 10) * 10;
        if (availableRound <= 0) continue;
        const needed = Math.ceil(rem / chest.points);
        let useCount;
        if (chest.id === 2001) { useCount = Math.min(Math.ceil(needed / 10) * 10, availableRound); }
        else { useCount = Math.min(Math.floor(needed / 10) * 10, availableRound); }
        if (useCount <= 0) continue;
        plan.push({ typeId: chest.id, name: chest.name, qty: useCount, points: chest.points });
        rem -= useCount * chest.points;
      }
      if (plan.length === 0) { addLog({ time: new Date().toLocaleTimeString(), message: `宝箱不足，还剩${formatNum(pointGap)}分`, type: "warning" }); break; }
      const planDesc = plan.map(c => `${c.name}x${c.qty}`).join(' + ');
      addLog({ time: new Date().toLocaleTimeString(), message: `第${round}轮: ${formatNum(chestProgress.current)}分, 差${formatNum(pointGap)}分 → ${planDesc}`, type: "info" });
      let roundOpened = 0, roundPoints = 0;
      for (const chest of plan) {
        if (shouldStop.value) break;
        try {
          await _consumeActivityBatchCmd(tokenId, 'item_openbox', (qty) => ({ itemId: chest.typeId, number: qty }), chest.qty, `开${chest.name}`);
          roundOpened += chest.qty; roundPoints += chest.qty * chest.points; totalOpened += chest.qty; totalPoints += chest.qty * chest.points;
          await new Promise(r => setTimeout(r, 300));
        } catch (e) { if (e.message === '用户停止') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `开${chest.name}失败: ${e.message}`, type: "warning" }); }
      }
      try { await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000); } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
      try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000); await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000); } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
      const newData = tokenStore.gameData?.commonActivityInfo;
      const activityData = newData?.activity?.commonActivityInfo || newData?.commonActivityInfo;
      const newProgressList = manager.calculateProgressList(activityData);
      const newChestProgress = newProgressList.find(p => p.id === 2);
      if (!newChestProgress || newChestProgress.isCompleted) { addLog({ time: new Date().toLocaleTimeString(), message: `宝箱任务已达满档`, type: "success" }); break; }
      const newGap = getMaxTarget(2) - newChestProgress.current;
      addLog({ time: new Date().toLocaleTimeString(), message: `宝箱积分: ${formatNum(newChestProgress.current)}/${formatNum(getMaxTarget(2))}，还差${formatNum(newGap)}分`, type: "info" });
      if (newGap <= 0) break;
      // 更新进度列表（关键：确保下一轮用最新进度计算）
      for (let i = 0; i < progressList.length; i++) {
        const fresh = newProgressList.find(p => p.id === progressList[i].id);
        if (fresh) progressList[i] = fresh;
      }
      role = tokenStore.gameData?.roleInfo?.role || role;
    }
    try { await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000); } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
    return { rounds: round, totalOpened, totalPoints };
  };

  /**
   * 批量消耗活动 - 自动完成招募、宝箱、钓鱼消耗任务
   */
  const batchConsumeActivity = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    const manager = new ConsumeActivityManager();
    const DELAY = _getModuleDelay('default');

    // 宝箱优先级
    const chestPriority = [
      { id: 2004, points: 50, name: '铂金宝箱' },
      { id: 2003, points: 20, name: '黄金宝箱' },
      { id: 2002, points: 10, name: '青铜宝箱' },
      { id: 2001, points: 1, name: '木质宝箱' },
    ];

    const getMaxTarget = (taskId) => {
      const configs = manager.missionTypes[taskId];
      if (!configs || configs.length === 0) return 0;
      return configs[configs.length - 1].num;
    };

    const formatNum = (n) => {
      if (n == null) return '0';
      return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
    };

    // 分批执行命令（含400340服务器限流重试）
    const executeBatchCmd = async (tokenId, cmd, getParams, totalQty, label) => {
      const batchSize = 10;
      const batches = Math.floor(totalQty / batchSize);
      const remainder = totalQty % batchSize;
      let executed = 0;
      const MAX_400340_RETRIES = 3;

      const sendWithRetry = async (qty) => {
        for (let attempt = 0; attempt <= MAX_400340_RETRIES; attempt++) {
          try {
            await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(qty), batchSettings.battleCommandTimeout || 15000);
            return;
          } catch (e) {
            if (e.message?.includes('400340') && attempt < MAX_400340_RETRIES) {
              addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ ${label}服务器限流(400340)，等待10秒后重试(${attempt+1}/${MAX_400340_RETRIES})...`, type: "warning" });
              await new Promise(r => setTimeout(r, 10000));
              try {
                await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
                await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
              } catch (_) {}
              continue;
            }
            throw e;
          }
        }
      };

      for (let i = 0; i < batches; i++) {
        if (shouldStop.value) throw new Error('用户停止');
        await sendWithRetry(batchSize);
        executed += batchSize;
        addLog({ time: new Date().toLocaleTimeString(), message: `${label}${batchSize}个 (${executed}/${totalQty})`, type: "info" });
        if (DELAY > 0) await new Promise(r => setTimeout(r, DELAY));
      }
      if (remainder > 0) {
        if (shouldStop.value) throw new Error('用户停止');
        await sendWithRetry(remainder);
        executed += remainder;
        addLog({ time: new Date().toLocaleTimeString(), message: `${label}${remainder}个 (${executed}/${totalQty})`, type: "info" });
      }
    };

    // 宝箱循环开箱
    const executeChestLoop = async (tokenId, role, progressList) => {
      let round = 0;
      let totalOpened = 0;
      let totalPoints = 0;
      const roundLogs = [];

      while (true) {
        if (shouldStop.value) break;
        round++;

        const chestProgress = progressList.find(p => p.id === 2);
        if (!chestProgress || chestProgress.isCompleted) break;

        const maxTarget = getMaxTarget(2);
        const pointGap = maxTarget - chestProgress.current;
        if (pointGap <= 0) break;

        // 计算本轮开箱计划
        const items = role?.items || role?.itemList || {};
        const remaining = pointGap;
        const plan = [];
        let rem = remaining;
        for (const chest of chestPriority) {
          if (rem <= 0) break;
          const available = items[chest.id]?.quantity || 0;
          if (available <= 0) continue;
          const availableRound = Math.floor(available / 10) * 10;
          if (availableRound <= 0) continue;
          const needed = Math.ceil(rem / chest.points);
          let useCount;
          if (chest.id === 2001) {
            useCount = Math.min(Math.ceil(needed / 10) * 10, availableRound);
          } else {
            useCount = Math.min(Math.floor(needed / 10) * 10, availableRound);
          }
          if (useCount <= 0) continue;
          plan.push({ typeId: chest.id, name: chest.name, qty: useCount, points: chest.points });
          rem -= useCount * chest.points;
        }

        if (plan.length === 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `宝箱不足，还剩${formatNum(pointGap)}分无法达成`, type: "warning" });
          break;
        }

        const planDesc = plan.map(c => `${c.name}x${c.qty}`).join(' + ');
        const planPoints = plan.reduce((s, c) => s + c.qty * c.points, 0);
        addLog({ time: new Date().toLocaleTimeString(), message: `第${round}轮: 当前${formatNum(chestProgress.current)}分, 目标${formatNum(maxTarget)}分, 差${formatNum(pointGap)}分 → 计划: ${planDesc} (${formatNum(planPoints)}分)`, type: "info" });

        let roundOpened = 0;
        let roundPoints = 0;
        for (const chest of plan) {
          if (shouldStop.value) break;
          try {
            await executeBatchCmd(tokenId, 'item_openbox', (qty) => ({ itemId: chest.typeId, number: qty }), chest.qty, `开${chest.name}`);
            roundOpened += chest.qty;
            roundPoints += chest.qty * chest.points;
            totalOpened += chest.qty;
            totalPoints += chest.qty * chest.points;
            await new Promise(r => setTimeout(r, _getModuleDelay('default')));
          } catch (e) {
            if (e.message === '用户停止') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `开${chest.name}失败: ${e.message}`, type: "warning" });
          }
        }

        // 领取积分奖励
        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `领取宝箱积分奖励...`, type: "info" });
          await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, batchSettings.battleCommandTimeout || 15000);
        } catch (e) {
          // 静默处理
        }
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        addLog({ time: new Date().toLocaleTimeString(), message: `第${round}轮执行完毕: 开${roundOpened}个, ${formatNum(roundPoints)}分`, type: "info" });

        // 刷新数据
        addLog({ time: new Date().toLocaleTimeString(), message: `刷新数据，重新计算积分...`, type: "info" });
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        // 重新读取进度
        const newData = tokenStore.gameData?.commonActivityInfo;
        const activityData = newData?.activity?.commonActivityInfo || newData?.commonActivityInfo;
        const newProgressList = manager.calculateProgressList(activityData);
        const newChestProgress = newProgressList.find(p => p.id === 2);
        if (!newChestProgress || newChestProgress.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `宝箱任务已达满档`, type: "success" });
          break;
        }
        const newGap = maxTarget - newChestProgress.current;
        addLog({ time: new Date().toLocaleTimeString(), message: `宝箱积分: ${formatNum(newChestProgress.current)}/${formatNum(maxTarget)}，还差${formatNum(newGap)}分`, type: "info" });
        if (newGap <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `宝箱积分已达标: ${formatNum(newChestProgress.current)}/${formatNum(maxTarget)}`, type: "success" });
          break;
        }

        // 更新进度和role数据（关键：确保下一轮用最新进度计算）
        for (let i = 0; i < progressList.length; i++) {
          const fresh = newProgressList.find(p => p.id === progressList[i].id);
          if (fresh) progressList[i] = fresh;
        }
        role = tokenStore.gameData?.roleInfo?.role || role;
      }

      // 最终领取一次积分（确保最后一轮的积分奖励被领取）
      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `最终领取宝箱积分奖励...`, type: "info" });
        await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, batchSettings.battleCommandTimeout || 15000);
      } catch (e) {
        // 静默处理：可能没有新的积分可领
      }
      await new Promise(r => setTimeout(r, _getModuleDelay('default')));

      return { rounds: round, totalOpened, totalPoints };
    };

    // 处理单个账号
    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始消耗活动: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 获取活动数据
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取活动数据失败: ${e.message}`, type: "warning" });
        }
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        const gameData = tokenStore.gameData;
        const roleInfo = gameData?.roleInfo;
        const role = roleInfo?.role;
        const commonActivityInfo = gameData?.commonActivityInfo;
        const activityData = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;

        if (!activityData) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无消耗活动数据，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const progressList = manager.calculateProgressList(activityData);
        const rcResult = manager.getResourceCounts(roleInfo);
        const rc = rcResult.data || { chests: {}, fishing: {}, recruit: {}, torch: {} };

        // 输出当前进度摘要
        const progressSummary = progressList.map(p => {
          const maxTarget = getMaxTarget(p.id);
          const status = p.isCompleted ? '✅已满' : `${formatNum(p.current)}/${formatNum(maxTarget)}`;
          return `${p.name}(${status})`;
        }).join(' | ');
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前进度: ${progressSummary}`, type: "info" });

        // 输出资源库存
        const chestSummary = Object.entries(rc.chests || {})
          .filter(([_, v]) => v > 0)
          .map(([k, v]) => {
            const names = { 2001: '木质', 2002: '青铜', 2003: '黄金', 2004: '铂金', 2005: '钻石' };
            return `${names[k] || k}x${formatNum(v)}`;
          }).join(', ');
        const otherSummary = [
          `招募令x${formatNum(rc.recruit?.[1001] || 0)}`,
          `鱼竿x${formatNum(rc.fishing?.[1011] || 0)}`,
          `火把x${formatNum(rc.torch?.[1008] || 0)}`,
          `大枣x${formatNum(rc.consumeItems?.[5280] || 0)}`
        ].join(', ');
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 资源库存: ${chestSummary || '无宝箱'} | ${otherSummary}`, type: "info" });

        // 2. 执行招募（循环分批 + 每批刷新重算差额，防止用超）
        const RECRUIT_BATCH = 1000; // 每轮最多招募数
        let recruitTotalUsed = 0;
        while (true) {
          if (shouldStop.value) break;
          // 每轮重新获取最新进度
          const freshActData = (() => {
            const d = tokenStore.gameData?.commonActivityInfo;
            return d?.activity?.commonActivityInfo || d?.commonActivityInfo;
          })();
          const freshProgressList = freshActData ? manager.calculateProgressList(freshActData) : [];
          const recruitProg = freshProgressList.find(p => p.id === 1);
          if (!recruitProg || recruitProg.isCompleted) {
            if (recruitTotalUsed > 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 已达满档，停止`, type: "success" });
            break;
          }
          const maxTarget = getMaxTarget(1);
          const gap = maxTarget - recruitProg.current;
          if (gap <= 0) break;
          const freshRole = tokenStore.gameData?.roleInfo?.role;
          const freshItems = freshRole?.items || {};
          const available = Number(freshItems[1001]?.quantity || 0);
          const thisRound = Math.min(gap, available, RECRUIT_BATCH);
          if (thisRound <= 0) {
            if (recruitTotalUsed === 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 招募令不足（需${gap}，有${available}），跳过`, type: "warning" });
            break;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 当前${formatNum(recruitProg.current)}，目标${formatNum(maxTarget)}，差${gap}，可用${available}，本轮执行${thisRound}`, type: "info" });
          try {
            await executeBatchCmd(tokenId, 'hero_recruit', (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }), thisRound, '招募令使用');
            recruitTotalUsed += thisRound;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 本轮完成 x${thisRound}（累计${recruitTotalUsed}）`, type: "success" });
          } catch (e) {
            if (e.message === '用户停止') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 失败: ${e.message}`, type: "warning" });
            break;
          }
          // 刷新数据，确保下一轮用最新进度
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          } catch (e) {}
          await new Promise(r => setTimeout(r, 500));
        }
        if (recruitTotalUsed > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 共完成 x${recruitTotalUsed}`, type: "success" });
        }

        // 3. 执行宝箱循环开箱
        const chestProgress = progressList.find(p => p.id === 2);
        if (chestProgress && !chestProgress.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 开始循环开箱 (当前${formatNum(chestProgress.current)}分, 目标${formatNum(getMaxTarget(2))}分)`, type: "info" });
          try {
            const result = await executeChestLoop(tokenId, role, progressList);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 完成: 共${result.rounds}轮，开${result.totalOpened}个，累计${formatNum(result.totalPoints)}分`, type: "success" });
          } catch (e) {
            if (e.message === '用户停止') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 开箱失败: ${e.message}`, type: "warning" });
          }
        } else if (chestProgress?.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 已达满档，跳过`, type: "info" });
        }

        // 4. 执行钓鱼（黄金鱼竿，目标1250）
        const fishProgress = progressList.find(p => p.id === 3);
        if (fishProgress && !fishProgress.isCompleted) {
          const fishTarget = 1250;
          const current = fishProgress.current;
          const gap = Math.max(0, fishTarget - current);
          if (gap > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 黄金鱼竿 当前${formatNum(current)}，目标${fishTarget}，还需${gap}`, type: "info" });
            // 先领取金鱼竿
            try {
              await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, batchSettings.defaultCommandTimeout || 5000);
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 金鱼竿领取成功`, type: "success" });
            } catch (e) {
              if (!e.message?.includes('400180')) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 金鱼竿领取失败: ${e.message}，继续钓鱼`, type: "warning" });
              }
            }
            await new Promise(r => setTimeout(r, _getModuleDelay('default')));

            // 检查黄金鱼竿库存
            const freshRole = tokenStore.gameData?.roleInfo?.role || role;
            const rodCount = freshRole?.items?.[1012]?.quantity || 0;
            const fishCount = Math.min(gap, rodCount);
            if (fishCount > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 黄金鱼竿库存${rodCount}，执行${fishCount}次`, type: "info" });
              try {
                addLog({ time: new Date().toLocaleTimeString(), message: `开始执行钓鱼 x${fishCount}...`, type: "info" });
                await executeBatchCmd(tokenId, 'artifact_lottery', (qty) => ({ type: 2, lotteryNumber: qty, newFree: true }), fishCount, '黄金鱼竿使用');
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 完成 x${fishCount}`, type: "success" });
              } catch (e) {
                if (e.message === '用户停止') throw e;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 失败: ${e.message}`, type: "warning" });
              }
              // 刷新数据
              addLog({ time: new Date().toLocaleTimeString(), message: `刷新数据...`, type: "info" });
              try {
                await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
                await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
              } catch (e) {}
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 黄金鱼竿不足（需${gap}，有${rodCount}），跳过`, type: "warning" });
            }
          }
        } else if (fishProgress?.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 已达满档，跳过`, type: "info" });
        }

        // 5. 盐罐和金砖进度提示（这两个无法自动执行，仅显示状态）
        const torchProgress = progressList.find(p => p.id === 4);
        const goldProgress = progressList.find(p => p.id === 5);
        const torchStatus = torchProgress?.isCompleted ? '✅已满' : `${formatNum(torchProgress?.current || 0)}/${formatNum(getMaxTarget(4))}`;
        const goldStatus = goldProgress?.isCompleted ? '✅已满' : `${formatNum(goldProgress?.current || 0)}/${formatNum(getMaxTarget(5))}`;
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [其他] 盐罐: ${torchStatus} | 金砖: ${goldStatus}（需手动完成）`, type: "info" });

        // 输出执行后进度
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        const endActivityData = tokenStore.gameData?.commonActivityInfo?.activity?.commonActivityInfo
          || tokenStore.gameData?.commonActivityInfo?.commonActivityInfo;
        if (endActivityData) {
          const endProgress = manager.calculateProgressList(endActivityData);
          const completedCount = endProgress.filter(p => p.isCompleted).length;
          const endSummary = endProgress.map(p => {
            const maxT = getMaxTarget(p.id);
            const st = p.isCompleted ? '✅' : `${formatNum(p.current)}/${formatNum(maxT)}`;
            return `${p.name}(${st})`;
          }).join(' | ');
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 执行后进度: ${endSummary} (${completedCount}/5项完成)`, type: "info" });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 消耗活动完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        if (e.message?.includes('400340')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动遇到服务器限流(400340)，等待10秒后刷新数据重试...`, type: "warning" });
          await new Promise(r => setTimeout(r, 10000));
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          } catch (_) {}
          tokenStatus.value[tokenId] = "waiting_retry";
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动失败: ${e.message}`, type: "error" });
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
        currentRunningTokenId.value = null;
      }
    };

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    await runStreaming(selectedTokens.value, processToken);

    // 优先重试400340限流账号（等10秒后立即重试）
    let throttledTokens = selectedTokens.value.filter(id => tokenStatus.value[id] === "waiting_retry");
    if (throttledTokens.length > 0 && !shouldStop.value) {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n=== 发现 ${throttledTokens.length} 个账号出现400340限流，10秒后重试 ===`, type: "info" });
      await new Promise(r => setTimeout(r, 10000));
      await runStreaming(throttledTokens, processToken);
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("消耗活动执行完毕");
    }
  };

  /**
   * 批量领取消耗活动道具
   * 1. 领取免费道具 (activity_commonbuygoods)
   * 2. 领取任务奖励 1-20档 (activity_claimtaskreward)
   */
  const batchClaimConsumeRewards = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    const DELAY = _getModuleDelay('default');

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 全局活动ID（仅首个token获取一次，后续复用）
    let globalFreeActivityId = null;   // 第4个位置 - 免费道具
    let globalFreeGoodsId = null;
    let globalConsumeActivityId = null; // 第1个位置 - 档位消耗奖励
    let activityFetched = false;

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始领取消耗活动道具: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 仅首次获取活动数据（免费道具需要，档位奖励不需要）
        if (!activityFetched) {
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
            await new Promise(r => setTimeout(r, _getModuleDelay('default')));

            const gameData = tokenStore.gameData;
            const commonActivityInfo = gameData?.commonActivityInfo;
            const activityInfo = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo || commonActivityInfo;

            if (activityInfo) {
              const entries = Object.entries(activityInfo);
              // 第1个位置 - 档位消耗奖励的activityId
              if (entries.length >= 1) {
                globalConsumeActivityId = Number(entries[0][0]);
              }
              // 第4个位置 - 免费道具的activityId和goodsId
              if (entries.length >= 4) {
                const [key, val] = entries[3];
                globalFreeActivityId = Number(key);
                const recordKeys = val?.record ? Object.keys(val.record) : [];
                if (recordKeys.length > 0) {
                  globalFreeGoodsId = Number(recordKeys[0]);
                }
              }
            }
          } catch (e) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取活动数据失败: ${e.message}`, type: "warning" });
          }
          activityFetched = true;
        }

        if (!globalFreeActivityId && !globalConsumeActivityId) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未找到消耗活动数据，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 免费活动ID: ${globalFreeActivityId}，消耗活动ID: ${globalConsumeActivityId}`, type: "info" });

        // 1. 领取免费道具（从第4个条目的record取goodsId）
        if (globalFreeActivityId) {
          const goodsId = globalFreeGoodsId || Number(String(globalFreeActivityId) + '1');
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取免费道具 (goodsId: ${goodsId})...`, type: "info" });
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_commonbuygoods', { goodsId, num: 1 }, batchSettings.defaultCommandTimeout || 5000);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 免费道具领取成功`, type: "success" });
          } catch (e) {
            if (e.message?.includes('700010') || e.message?.includes('1100010') || e.message?.includes('already')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 免费道具已领取过`, type: "info" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 免费道具领取失败: ${e.message}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, DELAY));
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无免费道具活动，跳过`, type: "info" });
        }

        // 2. 领取任务奖励 1-100档
        let claimedCount = 0;
        let skipCount = 0;
        for (let missionId = 1; missionId <= 100; missionId++) {
          if (shouldStop.value) break;
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimtaskreward', { activityId: globalConsumeActivityId, missionId }, batchSettings.defaultCommandTimeout || 5000);
            claimedCount++;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取第${missionId}档奖励成功`, type: "success" });
          } catch (e) {
            if (e.message?.includes('700010') || e.message?.includes('3200010') || e.message?.includes('3200020') || e.message?.includes('-10006')) {
              skipCount++;
              // 任务未达成/档位未达标/已领取消耗道具，继续下一个
            } else if (e.message?.includes('already') || e.message?.includes('700011')) {
              skipCount++;
              // 已领取过
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 第${missionId}档领取失败: ${e.message}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, DELAY));
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取完成: 成功${claimedCount}档，跳过${skipCount}档`, type: "success" });

        // 刷新数据
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 消耗活动道具领取完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取消耗活动道具失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("消耗活动道具领取完毕");
    }
  };

  /**
   * 批量挥鼓助威消耗
   * autumn_useitem 命令，itemNum 最大3000
   * 助威一次后需等待10分钟冷却
   * @param {Object|boolean} cheerQtyRef - 数量 ref 对象，value=0时使用全部数量，>0时使用指定数量
   * @param {boolean} isScheduledTask - 是否为定时任务
   */
  const batchAutumnUseItem = async (cheerQtyRef = null, isScheduledTask = false) => {
    // 兼容旧调用：如果第一个参数是 boolean，则为 isScheduledTask
    if (typeof cheerQtyRef === 'boolean') {
      isScheduledTask = cheerQtyRef;
      cheerQtyRef = null;
    }
    const inputQty = cheerQtyRef?.value || 0;
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始挥鼓助威消耗: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 获取背包中助威道具(ID:5278)的剩余数量
        const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
        const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
        const cheerItemCount = role.items?.[5278]?.quantity || 0;

        if (cheerItemCount <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 助威道具不足，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 2. 实际使用量：输入0=全部，输入>0=指定数量，上限3000
        const useNum = inputQty > 0
          ? Math.min(inputQty, cheerItemCount, 3000)
          : Math.min(cheerItemCount, 3000);
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 助威道具剩余 ${cheerItemCount}，本次使用 ${useNum}`, type: "info" });

        try {
          const result = await tokenStore.sendMessageWithPromise(tokenId, 'autumn_useitem', { itemNum: useNum }, 10000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 挥鼓助威消耗成功 (itemNum: ${useNum})`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('冷却') || errMsg.includes('cool') || errMsg.includes('wait')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 助威冷却中，需等待10分钟后重试`, type: "warning" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 挥鼓助威消耗失败: ${errMsg}`, type: "warning" });
          }
        }

        // 刷新数据
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 挥鼓助威消耗完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 挥鼓助威消耗失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 串行处理，避免多账号并发autumn_useitem导致服务器卡住
    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;
      await processToken(tokenId);
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      for (const tokenId of cur) {
        if (shouldStop.value) break;
        await processToken(tokenId);
        if (tokenStatus.value[tokenId] === "failed") failed.push(tokenId);
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("挥鼓助威消耗完毕（下次助威需等待10分钟冷却）");
    }
  };

  /**
   * 批量兑换码领取
   * system_claimcdkreward 命令
   * @param {string} cdkCode - 兑换码
   */
  const batchClaimCdkReward = async (isScheduledTask = false, cdkCode = '') => {
    // 定时任务模式：从batchSettings读取CDK
    if (isScheduledTask && !cdkCode) {
      cdkCode = batchSettings.cdkCode || '';
    }
    if (!cdkCode || !cdkCode.trim()) {
      if (!isScheduledTask) message.warning("请输入兑换码");
      return;
    }
    cdkCode = cdkCode.trim();

    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 兑换码领取: ${token.name} (CDK: ${cdkCode}) ===`, type: "info" });
        await ensureConnection(tokenId);

        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'system_claimcdkreward', { key: cdkCode, platformType: 'h5' }, batchSettings.defaultCommandTimeout || 5000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换码 ${cdkCode} 领取成功`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('已领取') || errMsg.includes('already') || errMsg.includes('12000')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换码已领取过`, type: "info" });
          } else if (errMsg.includes('无效') || errMsg.includes('invalid') || errMsg.includes('不存在')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换码无效: ${cdkCode}`, type: "warning" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换码领取失败: ${errMsg}`, type: "warning" });
          }
        }

        // 刷新数据
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 兑换码领取完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换码领取失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success(`兑换码 ${cdkCode} 领取完毕`);
    }
  };

  /**
   * 批量使用消耗活动道具
   * item_openpack 命令，itemId: 5279，数量: 全部
   */
  const batchUseActivityItem = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const ACTIVITY_ITEM_ID = 5279;

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 使用消耗活动道具: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 获取角色信息，查询道具数量
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        const role = tokenStore.gameData?.roleInfo?.role;
        const quantity = Number(role?.items?.[ACTIVITY_ITEM_ID]?.quantity || 0);

        if (quantity <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无消耗活动道具(ID:${ACTIVITY_ITEM_ID})，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 拥有消耗活动道具 x${quantity}，全部使用`, type: "info" });

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            'item_openpack',
            { itemId: ACTIVITY_ITEM_ID, number: quantity, index: 0 },
            batchSettings.battleCommandTimeout || 15000,
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动道具 x${quantity} 使用成功`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('3200020')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动道具已领取过`, type: "info" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 道具使用失败: ${errMsg}`, type: "warning" });
          }
        }

        // 刷新数据
        try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000); } catch (e) {}
        try { await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000); } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        // 检查是否达标
        const manager = new ConsumeActivityManager();
        const formatNum = (n) => n == null ? '0' : n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n);
        const getMaxTarget = (taskId) => {
          const configs = manager.missionTypes[taskId];
          return (!configs || configs.length === 0) ? 0 : configs[configs.length - 1].num;
        };

        const actInfo = tokenStore.gameData?.commonActivityInfo;
        const activityData = actInfo?.activity?.commonActivityInfo || actInfo?.commonActivityInfo;
        let isQualified = false;

        if (activityData) {
          const progList = manager.calculateProgressList(activityData);

          let scanTargets = { recruit: 4000, chestPts: 100000, fish: 1250 };
          try { const saved = localStorage.getItem('consume_scan_targets'); if (saved) scanTargets = JSON.parse(saved); } catch (e) {}

          const recruitProg = progList.find(p => p.id === 1);
          const recruit = recruitProg?.current || 0;
          const recruitOk = recruit >= scanTargets.recruit || recruitProg?.isCompleted === true;

          const chestProg = progList.find(p => p.id === 2);
          const chestPts = chestProg?.current || 0;
          const chestOk = chestPts >= scanTargets.chestPts || chestProg?.isCompleted === true;

          const fishProg = progList.find(p => p.id === 3);
          const fish = fishProg?.current || 0;
          const fishOk = fish >= scanTargets.fish || fishProg?.isCompleted === true;

          isQualified = recruitOk && chestOk && fishOk;
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 达标检查: 招募${formatNum(recruit)}(${recruitOk ? '✅' : '❌'}) 宝箱${formatNum(chestPts)}(${chestOk ? '✅' : '❌'}) 钓鱼${fish}(${fishOk ? '✅' : '❌'})`, type: isQualified ? "success" : "warning" });
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 无活动数据，跳过达标检查`, type: "warning" });
        }

        // 达标则执行消耗活动
        if (isQualified && activityData) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ✅ 达标！开始执行消耗活动...`, type: "success" });
          const progressList = manager.calculateProgressList(activityData);
          let roleData = tokenStore.gameData?.roleInfo?.role;

          // 招募（循环分批 + 每批刷新重算差额，防止用超）
          const RECRUIT_BATCH = 1000;
          let recruitTotalUsed = 0;
          while (true) {
            if (shouldStop.value) break;
            const freshActData = (() => {
              const d = tokenStore.gameData?.commonActivityInfo;
              return d?.activity?.commonActivityInfo || d?.commonActivityInfo;
            })();
            const freshProgList = freshActData ? manager.calculateProgressList(freshActData) : [];
            const recruitProg = freshProgList.find(p => p.id === 1);
            if (!recruitProg || recruitProg.isCompleted) {
              if (recruitTotalUsed > 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 已达满档，停止`, type: "success" });
              break;
            }
            const maxTarget = getMaxTarget(1);
            const gap = maxTarget - recruitProg.current;
            if (gap <= 0) break;
            const freshRole = tokenStore.gameData?.roleInfo?.role;
            const freshItems = freshRole?.items || {};
            const available = Number(freshItems[1001]?.quantity || 0);
            const thisRound = Math.min(gap, available, RECRUIT_BATCH);
            if (thisRound <= 0) {
              if (recruitTotalUsed === 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 招募令不足（需${gap}，有${available}），跳过`, type: "warning" });
              break;
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 差${gap}，可用${available}，本轮执行${thisRound}`, type: "info" });
            try {
              await _consumeActivityBatchCmd(tokenId, 'hero_recruit', (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }), thisRound, '招募令使用');
              recruitTotalUsed += thisRound;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 本轮完成 x${thisRound}（累计${recruitTotalUsed}）`, type: "success" });
            } catch (e) { if (e.message === '用户停止') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 失败: ${e.message}`, type: "warning" }); break; }
            try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000); await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000); } catch (e) {}
            await new Promise(r => setTimeout(r, 500));
          }
          if (recruitTotalUsed > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [招募] 共完成 x${recruitTotalUsed}`, type: "success" });
          }

          // 宝箱循环开箱
          const chestProgress = progressList.find(p => p.id === 2);
          if (chestProgress && !chestProgress.isCompleted) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 开始循环开箱`, type: "info" });
            try {
              const result = await _consumeActivityChestLoop(tokenId, roleData, progressList, manager, getMaxTarget, formatNum);
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 完成: ${result.rounds}轮，开${result.totalOpened}个，${formatNum(result.totalPoints)}分`, type: "success" });
            } catch (e) { if (e.message === '用户停止') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [宝箱] 失败: ${e.message}`, type: "warning" }); }
          }

          // 钓鱼
          const fishProgress = progressList.find(p => p.id === 3);
          if (fishProgress && !fishProgress.isCompleted) {
            const fishTarget = 1250;
            const gap = Math.max(0, fishTarget - fishProgress.current);
            if (gap > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 还需${gap}`, type: "info" });
              try { await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, 5000); } catch (e) {}
              await new Promise(r => setTimeout(r, 500));
              const freshRole = tokenStore.gameData?.roleInfo?.role || roleData;
              const rodCount = freshRole?.items?.[1012]?.quantity || 0;
              const fishCount = Math.min(gap, rodCount);
              if (fishCount > 0) {
                try {
                  await _consumeActivityBatchCmd(tokenId, 'artifact_lottery', (qty) => ({ type: 2, lotteryNumber: qty, newFree: true }), fishCount, '黄金鱼竿使用');
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 完成 x${fishCount}`, type: "success" });
                } catch (e) { if (e.message === '用户停止') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 失败: ${e.message}`, type: "warning" }); }
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [钓鱼] 黄金鱼竿不足（需${gap}，有${rodCount}），跳过`, type: "warning" });
              }
            }
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动执行完成`, type: "success" });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 消耗活动道具使用完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 消耗活动道具使用失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("消耗活动道具使用完毕");
    }
  };

  /**
   * 消耗活动兑换商店多选购买 + 领取里程碑进度奖励
   * activity_exchange 购买商品
   * activity_claimmilestone 领取进度奖励
   * @param {Array} selectedGoods - 选中的商品后缀ID列表 [1, 2, 3, ...]
   * @param {Object} buyCounts - 每个商品的购买次数 { 1: 1, 2: 1, 10: 30 }
   */
  const batchActivityExchange = async (selectedGoods = [], buyCounts = {}, isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;
    if (selectedGoods.length === 0) {
      message.warning("请至少选择一个商品");
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;

    const DELAY = _getModuleDelay('default');

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 商品定义（后缀 + 限购数量 + 名称）
    const GOODS_MAP = {
      1:  { name: '惊雷', maxCount: 1 },
      2:  { name: '月华', maxCount: 1 },
      3:  { name: '回响', maxCount: 1 },
      4:  { name: '琴心公', maxCount: 1 },
      5:  { name: '琴心母', maxCount: 1 },
      6:  { name: '璇玑', maxCount: 1 },
      7:  { name: '剑胆公', maxCount: 1 },
      8:  { name: '剑胆母', maxCount: 1 },
      9:  { name: '阵容编组', maxCount: 1 },
      10: { name: '珍珠', maxCount: 30 },
      11: { name: '万能红将碎片', maxCount: 200 },
      12: { name: '随机红将碎片', maxCount: 200 },
      13: { name: '白玉', maxCount: 999 },
      14: { name: '精铁', maxCount: 999 },
    };

    // 全局活动ID（仅首个token获取一次，后续复用）
    let globalExchangeActivityId = null; // 兑换商店 activityId (entries[2] 第三个位置)
    let globalMilestoneActivityId = null; // 里程碑进度奖励 activityId
    let activityFetched = false;

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始消耗活动兑换购买: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 获取活动数据（仅首个账号获取，后续复用）
        if (!activityFetched) {
          try {
            const actRes = await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
            const body = actRes?.body || actRes;
            const activityInfo = body?.activity?.commonActivityInfo || body?.commonActivityInfo || body;

            if (activityInfo) {
              const entries = Object.entries(activityInfo);
              // 第3个位置 (entries[2]) - 兑换商店
              if (entries.length >= 3) {
                globalExchangeActivityId = Number(entries[2][0]);
              }
              // 第5个位置 (entries[4]) - 里程碑进度奖励
              if (entries.length >= 5) {
                globalMilestoneActivityId = Number(entries[4][0]);
              }
              // 如果只有4个条目，里程碑ID可能为 entries[2] + 2
              if (!globalMilestoneActivityId && globalExchangeActivityId) {
                globalMilestoneActivityId = globalExchangeActivityId + 2;
              }
            }
          } catch (e) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取活动数据失败: ${e.message}`, type: "warning" });
          }
          activityFetched = true;
        }

        if (!globalExchangeActivityId) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未找到兑换商店活动ID，跳过`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换商店ID: ${globalExchangeActivityId}，里程碑ID: ${globalMilestoneActivityId}`, type: "info" });

        // 2. 逐个购买选中的商品
        let successCount = 0;
        let failCount = 0;

        for (const suffix of selectedGoods) {
          if (shouldStop.value) break;

          const goods = GOODS_MAP[suffix];
          if (!goods) continue;

          const goodsId = Number(String(globalExchangeActivityId) + String(suffix).padStart(2, '0'));
          const quantity = Math.min(buyCounts[suffix] || 1, goods.maxCount);

          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_exchange', {
              activityId: globalExchangeActivityId,
              goodsId,
              quantity,
            }, batchSettings.defaultCommandTimeout || 5000);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 购买 ${goods.name} x${quantity} 成功`, type: "success" });
            successCount++;
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('400180') || errMsg.includes('已购买') || errMsg.includes('限购')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 购买 ${goods.name}: 已达限购上限`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 购买 ${goods.name} 失败: ${errMsg}`, type: "warning" });
            }
            failCount++;
          }

          await new Promise(r => setTimeout(r, DELAY));
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换购买完成: 成功${successCount}，失败${failCount}`, type: successCount > 0 ? "success" : "warning" });

        // 3. 领取里程碑进度奖励
        if (globalMilestoneActivityId) {
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimmilestone', {
              activityId: globalMilestoneActivityId,
            }, batchSettings.defaultCommandTimeout || 5000);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 里程碑进度奖励领取成功`, type: "success" });
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('无可领取') || errMsg.includes('未达标') || errMsg.includes('700010')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 里程碑进度奖励: 暂无可领取奖励`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 里程碑进度奖励失败: ${errMsg}`, type: "warning" });
            }
          }
        }

        // 刷新数据
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 兑换购买完成 ===`, type: "success" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 兑换购买失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 串行处理
    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;
      await processToken(tokenId);
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      for (const tokenId of cur) {
        if (shouldStop.value) break;
        await processToken(tokenId);
        if (tokenStatus.value[tokenId] === "failed") failed.push(tokenId);
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("消耗活动兑换购买完毕");
    }
  };

  // ====== 竞技大厅道具领取 ======
  const APEX_REWARDS = [
    { confId: 1, name: '累计胜出1场逐鹿盐山 盐山金币x10' },
    { confId: 2, name: '累计胜出2场逐鹿盐山 盐山金币x15' },
    { confId: 3, name: '累计胜出31场逐鹿盐山 盐山金币x13' },
    { confId: 4, name: '周活跃度达到50 助威鼓槌x5' },
    { confId: 5, name: '周活跃度达到100 助威鼓槌x10' },
    { confId: 6, name: '参与1次盐场 助威鼓槌x15' },
    { confId: 7, name: '本周助威1次 助威奖励' },
  ];

  const batchClaimApexRewards = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始领取竞技大厅道具: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        let claimedCount = 0;
        for (const reward of APEX_REWARDS) {
          if (shouldStop.value) break;
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              'apex_taskclaim',
              { confId: reward.confId },
              batchSettings.defaultCommandTimeout || 5000
            );
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ✅ ${reward.name}`, type: "success" });
            claimedCount++;
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('7100140') || errMsg.includes('限流')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 限流中，停止领取`, type: "warning" });
              break;
            }
            if (errMsg.includes('200020')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${reward.name}: 未达标，无法领取`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${reward.name}: ${errMsg}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, _getModuleDelay('apex')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 竞技大厅领取完毕 (${claimedCount}/${APEX_REWARDS.length}) ===`, type: claimedCount > 0 ? "success" : "info" });
      } catch (e) {
        if (e.message === '用户停止') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取竞技大厅道具失败: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // ✅ 分批执行：每批 maxActive 个，一批完成后再执行下一批
    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行第 ${batchNum}/${totalBatches} 批（${batch.length}个账号）`,
        type: "info",
      });
      await Promise.all(batch.map(tokenId => processToken(tokenId)));
    }

    // 批量重试失败账号
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      // 重试也分批执行
      for (let i = 0; i < cur.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = cur.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(tokenId => processToken(tokenId)));
      }
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("竞技大厅道具领取完毕");
    }
  };

  /**
   * 批量橱窗咸将激活（collection_activate）
   * 先调用 collection_getinfo 获取图鉴数据，
   * 根据 activateNum/canActivateNum 精准筛选"已拥有但未激活"的道具，再逐个激活
   */
  const batchCollectionActivate = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processActivate = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      currentRunningTokenId.value = tokenId;
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始橱窗咸将激活: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // ===== 第一步：查询图鉴数据 =====
        let collectionData;
        try {
          collectionData = await tokenStore.sendMessageWithPromise(
            tokenId, "collection_getinfo", {},
            batchSettings.defaultCommandTimeout || 8000,
          );
        } catch (err) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取图鉴数据失败: ${err.message}，跳过`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
          return;
        }

        // ===== 第二步：解析 heroSeries，筛选可激活道具 =====
        const heroSeries = collectionData?.heroSeries || collectionData?.collection?.heroSeries;
        if (!heroSeries) {
          const topKeys = collectionData ? Object.keys(collectionData) : ['null'];
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 图鉴数据无 heroSeries 字段（顶层keys: ${topKeys.join(',')}），跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const toActivate = []; // { poolType, id, seriesId, name }
        let alreadyActivated = 0;
        let totalItems = 0;

        for (const [seriesKey, seriesData] of Object.entries(heroSeries)) {
          const collectMap = seriesData?.collectMap;
          if (!collectMap) continue;

          for (const [itemId, itemData] of Object.entries(collectMap)) {
            totalItems++;
            const isActivated = itemData?.activateNum || 0;   // 1=已激活
            const canActivate = itemData?.canActivateNum || 0; // 1=可激活

            if (isActivated === 1) {
              alreadyActivated++;
              continue; // 已激活，跳过
            }
            if (canActivate === 1) {
              // 查找 SKIN_DICT 获取名称
              const skinInfo = SKIN_DICT[itemId];
              toActivate.push({
                poolType: 2,                        // poolType 固定为 2（珍宝阁系统）
                id: Number(itemId),
                seriesId: Number(seriesKey),         // heroSeries key = seriesId
                name: skinInfo?.name || `道具#${itemId}`,
              });
            }
            // canActivate === 0: 未拥有或不可激活，跳过
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 图鉴统计：总${totalItems}个，已激活${alreadyActivated}个，可激活${toActivate.length}个`,
          type: "info",
        });

        // ===== 第三步：逐个激活 =====
        let successCount = 0;
        let skipCount = 0;

        for (const item of toActivate) {
          if (shouldStop.value) break;

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "collection_activate",
              { poolType: item.poolType, id: item.id, isAll: false, seriesId: item.seriesId },
              batchSettings.defaultCommandTimeout || 5000,
            );
            successCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 激活成功: ${item.name} (poolType=${item.poolType})`,
              type: "success",
            });
          } catch (err) {
            const errMsg = err.message || '';
            // 记录所有失败日志，包含请求参数方便排查
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 激活 ${item.name} 失败: ${errMsg} (poolType=${item.poolType}, id=${item.id}, seriesId=${item.seriesId})`,
              type: "warning",
            });
            skipCount++;
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        // ===== 第四步：循环领取图鉴积分 =====
        let claimTotalCount = 0;
        while (!shouldStop.value) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "collection_claimtotal", {}, batchSettings.defaultCommandTimeout || 5000,
            );
            claimTotalCount++;
          } catch (err) {
            break; // 无可领取，停止
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }
        if (claimTotalCount > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 图鉴积分领取成功 ×${claimTotalCount}次`,
            type: "success",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 橱窗咸将激活完成（可激活${toActivate.length}个，成功${successCount}个，跳过${skipCount}个）===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 橱窗咸将激活失败: ${error.message}`,
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
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processActivate);

    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${retryWait/1000}秒后重试 ${failed.length} 个失败账号（第${r+1}/${retryMax}轮）`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processActivate);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量橱窗咸将激活结束");
  };

  // ========== 批量推图（使用共享推图模块） ==========
  const _pushRunner = createPushMapRunner({
    tokenStore,
    getTokens: () => tokens.value,
    addLog,
    shouldStop,
    tokenStatus,
  });
  
  const _bpSleep = _pushRunner.sleep;
  const _bpPushLoop = _pushRunner.pushLoop;
  const _bpStartOne = _pushRunner.startOne;
  const _bpStopOne = _pushRunner.stopOne;
  const _bpLoadBossData = _pushRunner.loadBossData;
  const _bpUseTorch = _pushRunner.useTorch;
  const _bpReconnect = _pushRunner.reconnect;
  const _getBoss = _pushRunner.getBoss;
  
  const _pushLogCb = (msg, type) => {
    addLog({ time: new Date().toLocaleTimeString(), message: msg, type: type || "info" });
    if (typeof window._pushLog === "function") window._pushLog(msg, type || "info");
  };
  
  const _getTokenName = (tid) => {
    const tk = tokens.value.find(x => x.id === tid);
    return tk ? tk.name || tid : tid;
  };
  
  // 暴露给模态框和TokenCard使用
  window._bpPushLoop = _bpPushLoop;
  window._bpStartOne = _bpStartOne;
  window._bpStopOne = _bpStopOne;
  window._bpLoadBossData = _bpLoadBossData;
  window._getBoss = _getBoss;
  window._bpSleep = _bpSleep;
  window._bpUseTorch = _bpUseTorch;

  // 简化：只打开模态框，实际推图逻辑由模态框控制
  const batchPushMap = async () => {
    if (typeof window._openPushModal === "function") window._openPushModal();
  };

  return {
    batchOpenBox,
    batchOpenBoxByPoints,
    batchOpenDiamondBox,
    batchOpenFragmentPacks,
    batchClaimBoxWeeklyRewards,
    batchClaimBoxPointReward,
    batchFish,
    batchRecruit,
    batchHeroUpgrade,
    batchBookUpgrade,
    batchFishUpgrade,
    batchClaimStarRewards,
    batchClaimPeachTasks,
    batchGenieSweep,
    heroFourSaintsUpgrade,
    batchConsumeActivity,
    batchClaimConsumeRewards,
    batchAutumnUseItem,
    batchClaimCdkReward,
    batchUseActivityItem,
    batchActivityExchange,
    batchClaimApexRewards,
    batchCollectionActivate,
    batchPushMap,
  };
}
