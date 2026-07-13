import { HERO_DICT, FishMap } from "@/utils/HeroList";
import { PEACH_TASKS } from "@/utils/PeachTaskIds";
import ConsumeActivityManager from "@/utils/consumeActivityManager";
import { SKIN_DICT } from "@/utils/skinMap";
import { createPushMapRunner } from "@/utils/batch/pushMapRunner";

/**
 * 寮€绠便€侀挀楸笺€佹嫑鍕熺被浠诲姟
 * 鍖呭惈: batchOpenBox, batchClaimBoxPointReward, batchFish, batchRecruit
 */

/**
 * 鍒涘缓鐗╁搧绫讳换鍔℃墽琛屽櫒
 * @param {object} deps - 渚濊禆椤? * @returns {object} 浠诲姟鍑芥暟闆嗗悎
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
    delayConfig,
    moduleDelays,
  } = deps;

  // 鑾峰彇妯″潡寤惰繜鐨勮緟鍔╁嚱鏁?  const _getModuleDelay = (moduleName) => {
    if (moduleDelays) {
      return moduleDelays[moduleName] || moduleDelays.default || 1000;
    }
    return delayConfig?.task || 1000;
  };

  const boxNames = {
    2001: "鏈ㄨ川瀹濈",
    2002: "闈掗摐瀹濈",
    2003: "榛勯噾瀹濈",
    2004: "閾傞噾瀹濈",
    2005: "閽荤煶瀹濈",
  };

  const fishNames = { 1: "鏅€氶奔绔?, 2: "榛勯噾楸肩" };

  const heroIds = Object.keys(HERO_DICT).map(Number);
    const fishArtifactIds = Object.keys(FishMap).map(Number);

  /**
   * 鎵归噺鑻遍泟鍗囨槦
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
          message: `=== 寮€濮嬭嫳闆勫崌鏄? ${token.name}锛堝叡${heroIds.length}涓嫳闆勶級===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 绛夊緟杩炴帴瀹屽叏绋冲畾
        await new Promise((r) => setTimeout(r, 3000));

        // 杩炴帴楠岃瘉锛氬彂閫佷竴涓交閲忓懡浠ょ‘璁よ繛鎺ョ湡姝ｅ彲鐢?        let connectionVerified = false;
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
              message: `${token.name} 杩炴帴楠岃瘉澶辫触(绗?{verifyAttempt}娆?锛岀瓑寰?绉掗噸璇?..`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, 10000));
          }
        }
        if (!connectionVerified) {
          throw new Error("杩炴帴楠岃瘉澶辫触锛屾棤娉曟墽琛屽崌鏄熸搷浣?);
        }

        // === 鏅鸿兘绛涢€夛細鑾峰彇鑻遍泟鏄熺骇鍜岃儗鍖呮暟鎹?===
        let roleRes;
        try {
          roleRes = await tokenStore.sendMessageWithPromise(
            tokenId, "role_getroleinfo", {}, batchSettings.defaultCommandTimeout || 5000,
          );
        } catch (e) {
          throw new Error("鑾峰彇瑙掕壊淇℃伅澶辫触锛屾棤娉曟墽琛屾櫤鑳界瓫閫?);
        }

        const heroes = roleRes?.role?.heroes || {};
        const items = roleRes?.role?.items || {};
        // 鍗囨槦娑堣€楄〃锛堟寜鏄熺骇绱㈠紩锛?-based锛?        const STAR_COST = [8,8,8,8,8,40,40,40,40,40,80,80,80,80,80,200,200,200,200,200,400,400,400,400,400,400,400,400,400,400];

        // 绛涢€夊彲鍗囨槦鑻遍泟
        const eligibleHeroes = [];
        const skippedReasons = [];
        for (const heroId of heroIds) {
          const heroData = heroes[heroId];
          if (!heroData) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 鏈嫢鏈塦);
            continue;
          }
          const currentStar = Number(heroData.star || 0);
          if (currentStar >= 30) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 宸叉弧鏄?${currentStar})`);
            continue;
          }
          // 妫€鏌ョ鐗囨槸鍚﹁冻澶?          const fragmentCost = STAR_COST[currentStar] || 999;
          const fragmentCount = Number(items[heroId]?.quantity || items[heroId]?.num || 0);
          if (fragmentCount < fragmentCost) {
            skippedReasons.push(`${HERO_DICT[heroId]?.name || heroId}: 纰庣墖涓嶈冻(${fragmentCount}/${fragmentCost})`);
            continue;
          }
          eligibleHeroes.push({ heroId, currentStar, fragmentCount, fragmentCost });
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 绛涢€夌粨鏋? ${eligibleHeroes.length}涓彲鍗囨槦锛?{skippedReasons.length}涓烦杩嘸,
          type: "info",
        });
        if (eligibleHeroes.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鍙崌鏄? ${eligibleHeroes.map(h => `${HERO_DICT[h.heroId]?.name || h.heroId}(${h.currentStar}鏄?`).join(", ")}`,
            type: "info",
          });
        }
        if (skippedReasons.length <= 10) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 璺宠繃: ${skippedReasons.join(", ")}`,
            type: "info",
          });
        }

        if (eligibleHeroes.length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鏃犳弧瓒虫潯浠剁殑鑻遍泟鍙崌鏄焋,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 绗竴杞細瀵圭瓫閫夊嚭鐨勮嫳闆勯€愪釜鍗囨槦
        // 鍏抽敭锛氭鏌ュ搷搴旂爜 _code锛屼笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?        let heroUpgradeCount = 0;
        let heroTotalStars = 0;
        const firstPassFailed = [];

        for (const { heroId } of eligibleHeroes) {
          if (shouldStop.value)
            break;

          let heroStars = 0;
          // 鏈€澶氬皾璇?0娆★紙娓告垙鏄熺骇涓婇檺30鏄燂級
          for (let i = 1; i <= 30; i++) {
            if (shouldStop.value)
              break;

            try {
              const res = await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_heroupgradestar",
                { heroId },
                batchSettings.defaultCommandTimeout || 5000,
              );
              // 妫€鏌ュ搷搴旂爜锛氫笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?              if (res && res._code !== undefined && res._code !== 0) {
                break;
              }
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
              message: `${token.name} 鑻遍泟:${HERO_DICT[heroId]?.name || heroId} 鍗囨槦鎴愬姛 脳${heroStars}`,
              type: "success",
            });
          } else {
            firstPassFailed.push(heroId);
          }
        }

        // 绗簩杞細閲嶈瘯绗竴杞け璐ョ殑鑻遍泟锛堢瓑寰呮洿闀挎椂闂寸‘淇濊繛鎺ョǔ瀹氾級
        if (firstPassFailed.length > 0 && !shouldStop.value) {
          await new Promise((r) => setTimeout(r, 2000));
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 绗簩杞噸璇?${firstPassFailed.length} 涓湭鎴愬姛鑻遍泟`,
            type: "info",
          });
          for (const heroId of firstPassFailed) {
            if (shouldStop.value) break;

            let heroStars = 0;
            for (let i = 1; i <= 30; i++) {
              if (shouldStop.value) break;

              try {
                const res = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hero_heroupgradestar",
                  { heroId },
                  batchSettings.defaultCommandTimeout || 5000,
                );
                if (res && res._code !== undefined && res._code !== 0) {
                  break;
                }
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
                message: `${token.name} 鑻遍泟:${HERO_DICT[heroId]?.name || heroId} 閲嶈瘯鍗囨槦鎴愬姛 脳${heroStars}`,
                type: "success",
              });
            }
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 鑻遍泟鍗囨槦瀹屾垚锛?{heroUpgradeCount}涓嫳闆勫崌鏄燂紝鍏?{heroTotalStars}鏄燂紝${eligibleHeroes.length - heroUpgradeCount}涓湭鑳藉崌鏄燂級===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鑻遍泟鍗囨槦澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 鍒嗘壒鎵ц锛氭瘡鎵?maxActive 涓紝涓€鎵瑰畬鎴愬悗鍐嶆墽琛屼笅涓€鎵?    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鎵ц绗?${batchNum}/${totalBatches} 鎵癸紙${batch.length}涓处鍙凤級`,
        type: "info",
      });
      await Promise.all(batch.map(tokenId => processHeroUpgrade(tokenId)));
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      // 閲嶈瘯涔熷垎鎵规墽琛?      for (let i = 0; i < cur.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = cur.slice(i, i + maxConcurrent);
        await Promise.all(batch.map(tokenId => processHeroUpgrade(tokenId)));
      }
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺鑻遍泟鍗囨槦缁撴潫");
  };

  /**
   * 鎵归噺鍥鹃壌鍗囨槦锛堣嫳闆?book_upgrade + 楸肩伒 book_upgradeartifact锛?   * 涓庡崟璐﹀彿鐗堟湰 runBookUpgrade 閫昏緫瀵归綈
   */
  const batchBookUpgrade = async () => {
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
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 寮€濮嬪浘閴村崌鏄? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // === 鑻遍泟鍥鹃壌鍗囨槦锛堝弻杞皾璇曪級===
        // 鏍稿績锛氭鏌ュ搷搴旂爜 _code锛屼笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?        let heroSuccessCount = 0;
        let heroTotalStars = 0;
        let heroSkippedCount = 0;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 寮€濮嬭嫳闆勫浘閴村崌鏄燂紝鍏?{heroIds.length}涓嫳闆刞,
          type: "info",
        });

        // 绗竴杞細灏濊瘯鎵€鏈夎嫳闆?        const firstPassFailed = [];
        for (const heroId of heroIds) {
          if (shouldStop.value) break;

          let heroStars = 0;
          for (let i = 1; i <= 10; i++) {
            if (shouldStop.value) break;

            try {
              const res = await tokenStore.sendMessageWithPromise(
                tokenId, "book_upgrade", { heroId }, batchSettings.defaultCommandTimeout || 8000,
              );
              // 妫€鏌ュ搷搴旂爜锛氫笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?              if (res && res._code !== undefined && res._code !== 0) {
                break;
              }
              heroStars++;
              heroTotalStars++;
            } catch (err) {
              break;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (heroStars > 0) {
            heroSuccessCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 鑻遍泟:${HERO_DICT[heroId]?.name || heroId} 鍥鹃壌鍗囨槦鎴愬姛 脳${heroStars}`,
              type: "success",
            });
          } else {
            firstPassFailed.push(heroId);
          }
        }

        // 绗簩杞細閲嶈瘯绗竴杞け璐ョ殑鑻遍泟
        if (firstPassFailed.length > 0 && !shouldStop.value) {
          await new Promise((r) => setTimeout(r, _getModuleDelay('hero')));
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 绗簩杞噸璇?${firstPassFailed.length} 涓湭鎴愬姛鑻遍泟`,
            type: "info",
          });
          let retrySuccessCount = 0;
          for (const heroId of firstPassFailed) {
            if (shouldStop.value) break;

            let heroStars = 0;
            for (let i = 1; i <= 10; i++) {
              if (shouldStop.value) break;

              try {
                const res = await tokenStore.sendMessageWithPromise(
                  tokenId, "book_upgrade", { heroId }, batchSettings.defaultCommandTimeout || 8000,
                );
                if (res && res._code !== undefined && res._code !== 0) {
                  break;
                }
                heroStars++;
                heroTotalStars++;
              } catch (err) {
                break;
              }
              await new Promise((r) => setTimeout(r, _getModuleDelay('hero')));
            }
            if (heroStars > 0) {
              retrySuccessCount++;
              heroSuccessCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 鑻遍泟:${HERO_DICT[heroId]?.name || heroId} 閲嶈瘯鍗囨槦鎴愬姛 脳${heroStars}`,
                type: "success",
              });
            }
          }
          heroSkippedCount = firstPassFailed.length - retrySuccessCount;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鑻遍泟鍥鹃壌鍗囨槦瀹屾垚锛?{heroSuccessCount}涓嫳闆勫崌鏄燂紝鍏?{heroTotalStars}鏄燂紝${heroSkippedCount}涓凡婊℃槦璺宠繃`,
          type: "success",
        });

        // === 楸肩伒鍥鹃壌鍗囨槦 ===
        const maxFishStar = 5;
        let fishSuccessCount = 0;
        let fishTotalStars = 0;
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
            message: `${token.name} 鏌ヨ楸肩伒鏄熺骇鏁版嵁澶辫触锛屽皢灏濊瘯鍏ㄩ儴楸肩伒: ${e.message}`,
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
          message: `${token.name} 寮€濮嬮奔鐏靛浘閴村崌鏄燂細${fishToUpgrade.length}涓渶鍗囨槦锛?{fishSkippedCount}涓凡婊℃槦璺宠繃`,
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
              const res = await tokenStore.sendMessageWithPromise(
                tokenId,
                "book_upgradeartifact",
                { artifactId },
                batchSettings.defaultCommandTimeout || 8000,
              );
              // 妫€鏌ュ搷搴旂爜锛氫笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?              if (res && res._code !== undefined && res._code !== 0) {
                if (isUnowned && star === 1) break;
                break;
              }
              fishStars++;
              fishTotalStars++;
            } catch (err) {
              if (isUnowned && star === 1) break;
            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (fishStars > 0) {
            fishSuccessCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 楸肩伒:${FishMap[artifactId]?.name || artifactId} ${startStar}鈫?{startStar + fishStars}鏄焋,
              type: "success",
            });
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 楸肩伒鍥鹃壌鍗囨槦瀹屾垚锛?{fishSuccessCount}涓崌鏄燂紝鍏?{fishTotalStars}鏄燂紝${fishSkippedCount}涓烦杩嘸,
          type: "success",
        });

        // === 鐨偆鍥鹃壌婵€娲?===
        const skinEntries = Object.entries(SKIN_DICT);
        let skinSuccessCount = 0;
        let skinSkipCount = 0;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 寮€濮嬬毊鑲ゅ浘閴存縺娲伙紝鍏?{skinEntries.length}涓毊鑲,
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

        // 鐨偆婵€娲诲畬鎴愬悗寰幆棰嗗彇鍥鹃壌绉垎
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
            message: `${token.name} 鍥鹃壌绉垎棰嗗彇鎴愬姛 脳${claimTotalCount}娆,
            type: "success",
          });
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鐨偆鍥鹃壌婵€娲诲畬鎴愶細${skinSuccessCount}涓垚鍔燂紝${skinSkipCount}涓烦杩嘸,
          type: "success",
        });

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 鍥鹃壌鍗囨槦鍏ㄩ儴瀹屾垚锛堣嫳闆?{heroTotalStars}鏄?+ 楸肩伒${fishTotalStars}鏄?+ 鐨偆${skinSuccessCount}涓級===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鍥鹃壌鍗囨槦澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processBookUpgrade);

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processBookUpgrade);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺鍥鹃壌鍗囨槦缁撴潫");
  };

  /**
   * 鎵归噺楸肩伒鍗囨槦锛坅rtifact_upgradestar锛?   * itemId 瑙勫垯锛歱arseInt(fishId + '' + star)锛屽 1201鈫?2011銆?601鈫?6013
   * 涓庢补鐚磋剼鏈€昏緫瀵归綈
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
          message: `=== 寮€濮嬮奔鐏靛崌鏄? ${token.name}锛堝叡${fishArtifactIds.length}涓奔鐏碉級===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 绛夊緟杩炴帴瀹屽叏绋冲畾
        await new Promise((r) => setTimeout(r, 3000));

        // 杩炴帴楠岃瘉
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
              message: `${token.name} 杩炴帴楠岃瘉澶辫触(绗?{verifyAttempt}娆?锛岀瓑寰?绉掗噸璇?..`,
              type: "warning",
            });
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        if (!connectionVerified) {
          throw new Error("杩炴帴楠岃瘉澶辫触锛屾棤娉曟墽琛岄奔鐏靛崌鏄?);
        }

        // 涓庢补鐚磋剼鏈榻愶細鐩存帴閬嶅巻鍏ㄩ儴楸肩伒锛屼笉渚濊禆 role_getroleinfo 棰勬煡璇?        // itemId 瑙勫垯锛歱arseInt(fishId + '' + star)锛屽 1201 + '1' = 12011
        const maxFishStar = 5;
        let fishSuccessCount = 0;
        let fishTotalStars = 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 寮€濮嬮奔鐏靛崌鏄燂紝鍏?{fishArtifactIds.length}涓奔鐏碉紝鐩爣${maxFishStar}鏄焋,
          type: "info",
        });

        for (const fishId of fishArtifactIds) {
          if (shouldStop.value)
            break;

          let fishStars = 0;
          for (let star = 1; star <= maxFishStar; star++) {
            if (shouldStop.value)
              break;

            // 鍏抽敭淇锛歩temId = fishId鎷兼帴star锛屽 1201鈫?2011, 1601鈫?6013
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
              // 绗竴娆″け璐ヤ笖鏄1鏄燂紝璇存槑鏈嫢鏈夎楸肩伒锛岃烦杩?              if (star === 1) break;
              // 宸叉嫢鏈変絾涓棿澶辫触锛岀户缁皾璇曚笅涓€鏄?            }
            await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
          }
          if (fishStars > 0) {
            fishSuccessCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 楸肩伒:${FishMap[fishId]?.name || fishId} 鍗囨槦鎴愬姛 脳${fishStars}`,
              type: "success",
            });
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 楸肩伒鍗囨槦瀹屾垚锛?{fishSuccessCount}涓崌鏄燂紝鍏?{fishTotalStars}鏄燂級===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 楸肩伒鍗囨槦澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 鍒嗘壒鎵ц锛氭瘡鎵?maxActive 涓紝涓€鎵瑰畬鎴愬悗鍐嶆墽琛屼笅涓€鎵?    const maxConcurrent = batchSettings.maxActive || 5;
    const allTokenIds = [...selectedTokens.value];
    for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
      if (shouldStop.value) break;
      const batch = allTokenIds.slice(i, i + maxConcurrent);
      const batchNum = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鎵ц绗?${batchNum}/${totalBatches} 鎵癸紙${batch.length}涓处鍙凤級`,
        type: "info",
      });
      await Promise.all(batch.map(tokenId => processFishUpgrade(tokenId)));
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
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
    message.success("鎵归噺楸肩伒鍗囨槦缁撴潫");
  };

  /**
   * 鎵归噺棰嗗彇鍥鹃壌濂栧姳
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
          message: `=== 寮€濮嬮鍙栧浘閴村鍔? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 涓庢补鐚磋剼鏈鍙栧浘閴村鍔遍€昏緫涓€鑷达細鏈€澶?0娆★紝鍝嶅簲鐮佹鏌?        for (let i = 1; i <= 10; i++) {
          if (shouldStop.value)
            break;
          try {
            const res = await tokenStore.sendMessageWithPromise(
              tokenId,
              "book_claimpointreward",
              {},
              batchSettings.defaultCommandTimeout || 5000,
            );
            // 妫€鏌ュ搷搴旂爜锛氫笌娌圭尨鑴氭湰 res._code !== 0 鍒ゆ柇涓€鑷?            if (res && res._code !== undefined && res._code !== 0) {
              break;
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 棰嗗彇鍥鹃壌濂栧姳鎴愬姛`,
              type: "success",
            });
          } catch (err) {
            // 澶辫触鍒欏仠姝㈠皾璇?            break;
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 棰嗗彇鍥鹃壌濂栧姳瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 棰嗗彇鍥鹃壌濂栧姳澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processClaimStar);

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimStar);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺棰嗗彇鍥鹃壌濂栧姳缁撴潫");
  };

  /**
   * 棰嗗彇瀹濈绉垎
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
          message: `=== 寮€濮嬮鍙栧疂绠辩Н鍒? ${token.name} ===`,
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
          message: `${token.name} 瀹濈绉垎棰嗗彇鎴愬姛`,
          type: "success",
        });

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 棰嗗彇瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 棰嗗彇澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimBoxPoint);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺棰嗗彇瀹濈绉垎缁撴潫");
  };

  /**
   * 瀹濈杈炬爣濂栧姳鑷€夊ぇ濂?   * @param {object} rewardConfig - 濂栧姳閰嶇疆 { rewardIndex: count }
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
          message: `=== 寮€濮嬮鍙栧疂绠辫揪鏍囧鍔? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 閬嶅巻濂栧姳閰嶇疆锛岄鍙栨瘡涓鍔?        for (const [rewardIndex, count] of Object.entries(rewardConfig)) {
          if (shouldStop.value)
            break;

          const rewardIdx = Number(rewardIndex);
          const claimCount = Number(count);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 寮€濮嬮鍙栧鍔?${rewardIdx}锛屽叡 ${claimCount} 娆,
            type: "info",
          });

          // 寰幆棰嗗彇鎸囧畾娆℃暟
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
                message: `${token.name} 濂栧姳 ${rewardIdx} 棰嗗彇鎴愬姛 (${i + 1}/${claimCount})`,
                type: "success",
              });
            } catch (error) {
              const errorMsg = error.message || "";
              if (errorMsg.includes("宸查鍙?) || errorMsg.includes("1100010")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 濂栧姳 ${rewardIdx} 宸查鍙朻,
                  type: "info",
                });
              } else if (errorMsg.includes("3300080")) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 濂栧姳 ${rewardIdx} 鏈揪鏍囨棤娉曢鍙朻,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 濂栧姳 ${rewardIdx} 棰嗗彇澶辫触: ${errorMsg}`,
                  type: "warning",
                });
              }
            }

            // 姣忔棰嗗彇鍚庡欢杩?            if (i < claimCount - 1 && !shouldStop.value) {
              await new Promise(resolve => setTimeout(resolve, _getModuleDelay('daily')));
            }
          }
        }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 棰嗗彇瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 棰嗗彇澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processClaimWeekly);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺棰嗗彇瀹濈杈炬爣濂栧姳缁撴潫");
  };

  /**
   * 鎵归噺棰嗗彇锜犳鍥换鍔?   */
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
          message: `=== 寮€濮嬮鍙栬煚妗冨洯浠诲姟濂栧姳: ${token.name} ===`,
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
            message: `${token.name} 鑾峰彇鍒?${tasks.length} 涓换鍔″鍔盽,
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
                  message: `${token.name} 棰嗗彇${task.desc}浠诲姟濂栧姳鎴愬姛`,
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
                    message: `${token.name} 棰嗗彇淇变箰閮ㄤ换鍔″鍔?(褰撳墠绉垎: ${legionPoint})`,
                    type: "success",
                  });
                  await new Promise((r) => setTimeout(r, _getModuleDelay('daily')));
                } catch (e) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 棰嗗彇淇变箰閮ㄤ换鍔″鍔卞け璐? ${e.message}`,
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
                    message: `${token.name} 棰嗗彇涓汉浠诲姟濂栧姳 (褰撳墠绉垎: ${selfPoint})`,
                    type: "success",
                  });
                  await new Promise((r) => setTimeout(r, _getModuleDelay('daily')));
                } catch (e) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 棰嗗彇涓汉浠诲姟濂栧姳澶辫触: ${e.message}`,
                    type: "error",
                  });
                }
              }
            }
          } catch (err) {
            console.error("棰嗗彇锜犳鍥Н鍒嗗鍔卞紓甯?", err);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 棰嗗彇绉垎濂栧姳寮傚父: ${err.message}`,
              type: "error",
            });
          }

          if (claimedCount === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 娌℃湁鍙鍙栫殑浠诲姟濂栧姳`,
              type: "info",
            });
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鏈幏鍙栧埌浠诲姟濂栧姳鍒楄〃`,
            type: "warning",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 棰嗗彇锜犳鍥换鍔″鍔卞畬鎴?===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 棰嗗彇锜犳鍥换鍔″鍔卞け璐? ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processPeachTasks);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺棰嗗彇锜犳鍥换鍔″鍔辩粨鏉?);
  };

  /**
   * 涓€閿伅绁炴壂鑽?   */
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
          message: `=== 寮€濮嬬伅绁炴壂鑽? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 鑾峰彇鏈€鏂拌鑹蹭俊鎭?        const roleInfoRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          batchSettings.defaultCommandTimeout || 5000,
        );

        // 瑙ｆ瀽鐏杩涘害鍜屾壂鑽″埜
        const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
        const genieData = role.genie || {};
        // 鎵崱鍒?ID 1021
        const sweepTicketCount = role.items?.[1021]?.quantity || 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 褰撳墠鎵崱鍒告暟閲? ${sweepTicketCount}`,
          type: "info",
        });

        if (sweepTicketCount <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鎵崱鍒镐笉瓒筹紝鍋滄鎵崱`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 璁＄畻鏈€楂樺眰鏁?        // 1-4: 榄忚渶鍚寸兢 (0-16 -> 1-17灞?
        // 5: 娣辨捣 (0-9 -> 1-10灞?
        let maxLayer = -1;
        let bestGenieId = -1;

        // 妫€鏌ラ瓘铚€鍚寸兢 (1-4)
        for (let i = 1; i <= 4; i++) {
          if (genieData[i] !== undefined) {
            // 鏁版嵁鍊?0 浠ｈ〃 1 灞? 鐢ㄦ埛璇?0-16 浠ｈ〃 1-17 灞?            // 鍋囪 genieData[i] 鏄凡閫氳繃鐨勫眰鏁扮储寮?            const currentLayer = genieData[i] + 1;
            if (currentLayer > maxLayer) {
              maxLayer = currentLayer;
              bestGenieId = i;
            }
          }
        }

        if (bestGenieId === -1) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鏈壘鍒板彲鎵崱鐨勭伅绁炲叧鍗,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const genieNames = { 1: "榄忓浗", 2: "铚€鍥?, 3: "鍚村浗", 4: "缇ら泟", 5: "娣辨捣" };
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鎵崱: ${genieNames[bestGenieId]}鐏 (绗?{maxLayer}灞?`,
          type: "info",
        });

        // 寮€濮嬫壂鑽?        let remainingTickets = sweepTicketCount;

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
                message: `${token.name} 鎵崱鎴愬姛 ${sweepCnt} 娆,
                type: "success",
              });
              remainingTickets = res.role.items?.[1021]?.quantity || 0;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 鎵崱澶辫触: ${res.hint || "鏈煡閿欒"}`,
                type: "error",
              });
              break; // 澶辫触鍒欏仠姝?            }
          } catch (err) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 鎵崱璇锋眰寮傚父: ${err.message}`,
              type: "error",
            });
            break;
          }

          if (remainingTickets > 0) {
            await new Promise((r) => setTimeout(r, _getModuleDelay('tower')));
          }
        }

        // 鍒锋柊淇℃伅
        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 鐏鎵崱瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鐏鎵崱澶辫触: ${error.message}`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processGenieSweep);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("涓€閿伅绁炴壂鑽＄粨鏉?);
  };

  /**
   * 涓€閿紑纰庣墖绀煎寘
   * 寮€鍚墍鏈夌被鍨嬬殑纰庣墖绀煎寘锛氱孩灏嗐€佺传灏嗐€佹灏嗐€佺簿閾併€佽繘闃剁煶銆佺櫧鐜夈€佹壋鎵嬨€佽禌杞︽敼瑁呫€侀噾甯併€侀噾鐮栥€佹櫠鐭炽€佹€紓
   * @param {Object} options - 閫夐」
   * @param {boolean} options.isScheduledTask - 鏄惁涓哄畾鏃朵换鍔?   * @param {number[]|null} options.selectedItems - 閫変腑鐨?itemId 鏁扮粍锛宯ull 鎴栨湭浼犳椂鍏ㄩ噺鎵ц
   */
  const batchOpenFragmentPacks = async (options = {}) => {
    // 鍏煎鏃ц皟鐢ㄦ牸寮忥細濡傛灉浼犲叆甯冨皵鍊硷紝杞崲涓哄璞?    if (typeof options === 'boolean') {
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

      // 纰庣墖绀煎寘閰嶇疆锛歩temId -> 鍚嶇О
      const fragmentPacks = [
        { itemId: 3007, name: "闅忔満绾㈠皢纰庣墖" },
        { itemId: 3005, name: "闅忔満绱皢纰庣墖" }, // 淇锛氬簲璇ユ槸 3005 鑰屼笉鏄?2005
        { itemId: 3006, name: "闅忔満姗欏皢纰庣墖" },
        { itemId: 3008, name: "绮鹃搧绂忚" },
        { itemId: 3009, name: "杩涢樁鐭崇琚? },
        { itemId: 3011, name: "鐧界帀绂忚" },
        { itemId: 3012, name: "鎵虫墜绂忚" },
        { itemId: 35011, name: "璧涜溅鏀硅绀肩洅" },
        { itemId: 3001, name: "閲戝竵绀煎寘" },
        { itemId: 3002, name: "閲戠爾绀煎寘" },
        { itemId: 3010, name: "鏅剁煶绂忚" },
        { itemId: 37005, name: "鎬紓绀煎寘" },
      ];

      // 閬嶅巻鎵€鏈夌被鍨嬬殑绀煎寘锛堟寜 selectedItems 杩囨护锛屾湭浼犲弬鏃跺叏閲忔墽琛岋級
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
            message: `=== 寮€濮嬪紑纰庣墖绀煎寘: ${token.name} ===`,
            type: "info",
          });

          // 纭繚杩炴帴
          await ensureConnection(tokenId);

          // 鑾峰彇瑙掕壊淇℃伅锛屾煡鐪嬫嫢鏈夌殑绀煎寘鏁伴噺
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            batchSettings.defaultCommandTimeout || 5000,
          );

          const items = roleRes?.role?.items || {};
          let totalOpened = 0;

          // 閬嶅巻鎵€鏈夌被鍨嬬殑绀煎寘
          for (const pack of packsToOpen) {
            if (shouldStop.value)
              break;

            const quantity = Number(items[pack.itemId]?.quantity || 0);

            if (quantity > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 鎷ユ湁 ${pack.name} x${quantity}锛屽紑濮嬪紑鍚?..`,
                type: "info",
              });

              // 姣忔鏈€澶氬紑鍚?99涓紝寰幆寮€鍚?              let remaining = quantity;
              let openedCount = 0;

              while (remaining > 0 && !shouldStop.value) {
                const openNumber = Math.min(remaining, 999);

                try {
                  // 寮€鍚ぜ鍖?                  await tokenStore.sendMessageWithPromise(
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
                      message: `${token.name} 寮€鍚?${pack.name} x${openNumber} 鎴愬姛锛屽墿浣?${remaining} 涓猔,
                      type: "success",
                    });
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 寮€鍚?${pack.name} x${openedCount} 鎴愬姛`,
                      type: "success",
                    });
                  }

                  // 娣诲姞寤惰繜閬垮厤鎿嶄綔澶揩
                  await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                } catch (error) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 寮€鍚?${pack.name} x${openNumber} 澶辫触: ${error.message}`,
                    type: "error",
                  });
                  break; // 澶辫触鍒欏仠姝㈣绀煎寘鐨勫紑鍚?                }
              }

              totalOpened += openedCount;
            }
          }

          if (totalOpened > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} === 纰庣墖绀煎寘寮€鍚畬鎴愶紝鍏卞紑鍚?${totalOpened} 涓?===`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 娌℃湁浠讳綍鍙紑鍚殑纰庣墖绀煎寘`,
              type: "warning",
            });
          }

          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 寮€纰庣墖绀煎寘澶辫触: ${error.message}`,
            type: "error",
          });
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
        addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
        await new Promise(r2 => setTimeout(r2, retryWait));
        const cur = [...failed]; failed = [];
        await runStreaming(cur, processFragmentPacks);
        cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
      }

      message.success("涓€閿紑纰庣墖绀煎寘缁撴潫");
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
          message: `=== 寮€濮嬫壒閲忓紑绠? ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 瀹濈绫诲瀷: ${boxNames[boxType]}, 鏁伴噺: ${totalCount}`,
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
            message: `${token.name} 寮€绠辫繘搴? ${(i + 1) * 10}/${totalCount}`,
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
            message: `${token.name} 寮€绠辫繘搴? ${totalCount}/${totalCount}`,
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
          message: `=== ${token.name} 寮€绠卞畬鎴?===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 寮€绠卞け璐? ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenBox);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺寮€绠辩粨鏉?);
  };

  /**
   * 鎵归噺寮€閽荤煶瀹濈
   * 鏌ヨ鑳屽寘涓捇鐭冲疂绠?itemId:2005)鏁伴噺锛屽叏閮ㄥ紑鍚?   */
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
          message: `=== 寮€濮嬪紑閽荤煶瀹濈: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 鏌ヨ瑙掕壊淇℃伅鑾峰彇閽荤煶瀹濈鏁伴噺
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
            message: `${token.name} 娌℃湁閽荤煶瀹濈锛岃烦杩嘸,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鎷ユ湁閽荤煶瀹濈 x${boxCount}锛屽紑濮嬪紑鍚痐,
          type: "info",
        });

        // 姣忔鏈€澶氬紑鍚?99涓紝寰幆寮€鍚?        let remaining = boxCount;
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
                message: `${token.name} 寮€鍚捇鐭冲疂绠?x${openNumber} 鎴愬姛锛屽墿浣?${remaining} 涓猔,
                type: "success",
              });
            }
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 寮€鍚捇鐭冲疂绠?x${openNumber} 澶辫触: ${error.message}`,
              type: "error",
            });
            break;
          }

          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        // 棰嗗彇瀹濈绉垎濂栧姳
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
            message: `${token.name} === 閽荤煶瀹濈寮€鍚畬鎴愶紝鍏卞紑鍚?${totalOpened} 涓?===`,
            type: "success",
          });
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 寮€閽荤煶瀹濈澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenDiamondBox);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("鎵归噺寮€閽荤煶瀹濈缁撴潫");
    }
  };

  /**
   * 鎵归噺閽撻奔
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
    const batches = Math.floor(totalCount / 10);
    const remainder = totalCount % 10;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 璁板綍闇€瑕侀噸璇曠殑Token锛?00340/200750/11800010閿欒锛?    const retryTokens = [];
    const MAX_RETRIES = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2;

    const processFishBody = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 寮€濮嬫壒閲忛挀楸? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 妫€鏌ラ奔绔挎暟閲?        let role = tokenStore.gameData?.roleInfo?.role;
        if (!role) {
          try {
            const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
            role = roleInfo?.role;
          } catch {}
        }
        // 鏅€氶奔绔? 1011, 榛勯噾楸肩: 1012
        const rodId = fishType === 1 ? 1011 : 1012;
        const rodCount = role?.items?.[rodId]?.quantity || 0;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 楸肩绫诲瀷: ${fishNames[fishType]}, 鐩爣鏁伴噺: ${totalCount}, 褰撳墠搴撳瓨: ${rodCount}`,
          type: "info",
        });

        let availableCount = totalCount;
        if (rodCount < totalCount) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 搴撳瓨涓嶈冻 (${rodCount} < ${totalCount})锛屽皢浠呮秷鑰楃幇鏈夊簱瀛榒,
            type: "warning",
          });
          availableCount = rodCount;
        }

        if (availableCount <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 娌℃湁鍙敤鐨勯奔绔匡紝鍋滄浠诲姟`,
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
            message: `${token.name} 閽撻奔杩涘害: ${(i + 1) * 10}/${availableCount}`,
            type: "info",
          });

          // 姣?杞紙50娆★級鍚庯紝閲嶆柊鏍￠獙楸肩鏁伴噺
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

                // 鍓╀綑闇€瑕佺殑娆℃暟 (涓嶅寘鎷綋鍓嶈繖杞紝鍥犱负i宸茬粡鎵ц瀹屼簡锛屾墍浠ュ墿浣欐鏁版槸 (batches - 1 - i) * 10 + remainder)
                // 浣嗗疄闄呬笂鎴戜滑鍙渶瑕佺煡閬撲笅涓€杞槸鍚︽湁瓒冲鐨勯奔绔?                // 濡傛灉褰撳墠搴撳瓨灏戜簬10锛岃鏄庝笅涓€杞彲鑳戒笉澶燂紝鎴栬€呮暣涓换鍔′笉澶?                // 閲嶆柊璁＄畻 availableCount 鍙兘浼氭瘮杈冨鏉傦紝鍥犱负寰幆鏄熀浜?batches

                if (currentRodCount < 10) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 鍚屾鍚庡彂鐜伴奔绔夸笉瓒?(${currentRodCount} < 10)锛屽仠姝㈠悗缁壒閲忎换鍔,
                    type: "warning",
                  });
                  // 寮哄埗鍋滄
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
            message: `${token.name} 閽撻奔杩涘害: ${availableCount}/${availableCount}`,
            type: "info",
          });
        }
        // 鑷姩棰嗗彇楸肩绱濂栧姳
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
                message: `${token.name} 妫€娴嬪埌楸肩绱浣跨敤 ${points}锛屽紑濮嬮鍙?${exchangeCount} 娆＄疮璁″鍔盽,
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
                  // 绋嶅井寤惰繜锛岄伩鍏嶈姹傝繃蹇?                  await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                } catch (err) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 棰嗗彇绱濂栧姳澶辫触 (绗?{k + 1}娆?: ${err.message}`,
                    type: "warning",
                  });
                  break; // 濡傛灉鍑洪敊鍙兘鏄笉婊¤冻鏉′欢锛屽仠姝㈤鍙?                }
              }
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 绱濂栧姳棰嗗彇缁撴潫`,
                type: "success",
              });
            }
          }
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 妫€鏌ョ疮璁″鍔卞け璐? ${e.message}`,
            type: "warning",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 閽撻奔瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        const errMsg = error.message || "";
        
        // 鉁?妫€娴?00340銆?00750鎴?1800010閿欒锛屽姞鍏ラ噸璇曢槦鍒?        if (errMsg.includes("400340") || errMsg.includes("200750") || errMsg.includes("11800010")) {
          const errorCode = errMsg.includes("400340") ? "400340鏈嶅姟鍣ㄩ檺娴? : errMsg.includes("200750") ? "200750鏈嶅姟鍣ㄩ敊璇? : "11800010鏈煡閿欒";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 閽撻奔澶辫触: ${errorCode}锛屽姞鍏ラ噸璇曢槦鍒梎,
            type: "warning",
          });
          retryTokens.push({ tokenId, tokenName: token.name, error: errMsg });
          tokenStatus.value[tokenId] = "waiting_retry";
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 閽撻奔澶辫触: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    };

    await runStreaming(selectedTokens.value, processFishBody);

    // 澶勭悊闇€瑕侀噸璇曠殑璐﹀彿
    if (retryTokens.length > 0 && !shouldStop.value) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 鍙戠幇 ${retryTokens.length} 涓处鍙峰嚭鐜?00340/200750/11800010閿欒锛屽紑濮嬮噸璇?===`,
        type: "info",
      });

      const retryWaitTime = batchSettings.retryDelay || 60000;
      await new Promise((r) => setTimeout(r, retryWaitTime));

      for (let retryCount = 1; retryCount <= MAX_RETRIES && retryTokens.length > 0 && !shouldStop.value; retryCount++) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `--- 绗?${retryCount}/${MAX_RETRIES} 杞噸璇?(${retryTokens.length} 涓处鍙? ---`,
          type: "info",
        });

        const stillFailed = [];

        for (const retryTask of retryTokens) {
          if (shouldStop.value)
            break;

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 閲嶈瘯閽撻奔: ${retryTask.tokenName} ===`,
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
            }

            tokenStatus.value[retryTask.tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${retryTask.tokenName} 閲嶈瘯鎴愬姛`,
              type: "success",
            });
          } catch (error) {
            const errMsg = error.message || "";
            if (errMsg.includes("400340") || errMsg.includes("200750") || errMsg.includes("11800010")) {
              stillFailed.push(retryTask);
              tokenStatus.value[retryTask.tokenId] = "waiting_retry";
            } else {
              tokenStatus.value[retryTask.tokenId] = "failed";
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${retryTask.tokenName} 閲嶈瘯澶辫触: ${errMsg}`,
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
            message: `${stillFailed.length} 涓处鍙烽噸璇曞け璐ワ紝绛夊緟${retryWaitTime / 1000}绉掑悗杩涜涓嬩竴杞噸璇昤,
            type: "warning",
          });
          await new Promise((r) => setTimeout(r, retryWaitTime));
        }
      }

      // 鏈€缁堢粨鏋?      const successCount = selectedTokens.value.length - retryTokens.length;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 閽撻奔閲嶈瘯瀹屾垚 ===`,
        type: "info",
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `閲嶈瘯鎴愬姛: ${successCount} 涓猔,
        type: "success",
      });
      if (retryTokens.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `閲嶈瘯澶辫触: ${retryTokens.length} 涓猔,
          type: "error",
        });
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺閽撻奔缁撴潫");
  };

  /**
   * 鎵归噺鎷涘嫙
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
          message: `=== 寮€濮嬫壒閲忔嫑鍕? ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鎷涘嫙鏁伴噺: ${totalCount}`,
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
            message: `${token.name} 鎷涘嫙杩涘害: ${(i + 1) * 10}/${totalCount}`,
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
            message: `${token.name} 鎷涘嫙杩涘害: ${totalCount}/${totalCount}`,
            type: "info",
          });
        }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 鎷涘嫙瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鎷涘嫙澶辫触: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processRecruit);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺鎷涘嫙缁撴潫");
  };

  const batchOpenBoxByPoints = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0)
      return;

    isRunning.value = true;
    shouldStop.value = false;

    const TARGET_SCORE_PER_ROUND = 8000; // 姣忚疆鐩爣绉垎
    const MAX_ROUNDS = 4; // 鏈€澶?杞?
    const targetRounds = isScheduledTask
      ? (batchSettings.targetBoxRounds || 1)
      : (helperSettings.targetRounds || 1);

    const boxPriority = [
      { id: 2002, name: "闈掗摐瀹濈", points: 10, reserve: 0 }, // 浼樺厛寮€闈掗摐
      { id: 2003, name: "榛勯噾瀹濈", points: 20, reserve: 0 }, // 鍏舵寮€榛勯噾
      { id: 2004, name: "閾傞噾瀹濈", points: 50, reserve: 0 }, // 鍐嶆寮€閾傞噾
      { id: 2001, name: "鏈ㄨ川瀹濈", points: 1, reserve: 200 }, // 鏈€鍚庣敤鏈ㄨ川绮剧‘琛ヨ冻
    ];

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processOpenBoxByPoints = async (tokenId) => {
      if (shouldStop.value)
        return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 寮€濮嬫寜绉垎寮€绠? ${token.name} ===`,
          type: "info",
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鐩爣杞暟: ${targetRounds} 杞紙姣忚疆 ${TARGET_SCORE_PER_ROUND} 绉垎锛塦,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 1. 鑾峰彇褰撳墠瀹濈鍛ㄧН鍒?        const activityRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "activity_get",
          {},
          5000,
        );

        const activity = activityRes?.activity || activityRes?.body?.activity || activityRes;
        const myTotalInfo = activity?.myTotalInfo || {};
        const boxWeekInfo = myTotalInfo["2"]; // 2琛ㄧず瀹濈鍛?
        // 璋冭瘯鏃ュ織
        console.log(`[${token.name}] 鍒濆 boxWeekInfo:`, JSON.stringify(boxWeekInfo));

        if (!boxWeekInfo) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鏈幏鍙栧埌瀹濈鍛ㄦ椿鍔ㄦ暟鎹紝鍙兘杩樻湭寮€鍚疂绠卞懆`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
          return;
        }

        // 鍏煎澶氱瀛楁鍚嶏細num, score, value
        const currentRoundScore = Number(boxWeekInfo.num || boxWeekInfo.score || boxWeekInfo.value || 0);
        // rounds 琛ㄧず褰撳墠杞暟锛堢鍑犺疆锛?        const currentRound = Number(boxWeekInfo.rounds || 0);
        
        // 璁＄畻宸插畬鎴愯疆鏁板拰鎬荤Н鍒嗭細
        // - 褰撳綋鍓嶈疆绉垎涓?000鏃讹紝璇ヨ疆宸插畬鎴愶紝completedRounds = rounds
        // - 褰撳綋鍓嶈疆绉垎<8000鏃讹紝璇ヨ疆鏈畬鎴愶紝completedRounds = rounds - 1
        let completedRounds;
        let totalScore;
        if (currentRoundScore >= TARGET_SCORE_PER_ROUND) {
          // 褰撳墠杞凡瀹屾垚
          completedRounds = currentRound;
          totalScore = currentRound * TARGET_SCORE_PER_ROUND;
        } else {
          // 褰撳墠杞湭瀹屾垚
          completedRounds = Math.max(0, currentRound - 1);
          totalScore = completedRounds * TARGET_SCORE_PER_ROUND + currentRoundScore;
        }
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 褰撳墠瀹濈鍛? 绗?${currentRound} 杞紝宸插畬鎴?${completedRounds} 杞紝褰撳墠杞Н鍒? ${currentRoundScore}锛屾€荤Н鍒? ${totalScore}`,
          type: "info",
        });
        
        // 璁＄畻鐩爣鎬荤Н鍒嗗拰杩橀渶瑕佺殑绉垎
        const targetTotalScore = targetRounds * TARGET_SCORE_PER_ROUND;
        let neededScore = Math.max(0, targetTotalScore - totalScore);
        
        // 濡傛灉鐩爣宸茶揪鏍囦絾褰撳墠杞湭瀹屾垚锛岃绠楀畬鎴愬綋鍓嶈疆鎵€闇€绉垎
        if (neededScore <= 0 && currentRoundScore < TARGET_SCORE_PER_ROUND) {
          neededScore = TARGET_SCORE_PER_ROUND - currentRoundScore;
        }
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鐩爣鎬荤Н鍒? ${targetTotalScore}锛岃繕闇€绉垎: ${neededScore}`,
          type: "info",
        });
        
        // 鏃犻渶寮€绠辨潯浠讹細绗?杞笖褰撳墠杞Н鍒嗗凡婊?000锛?杞叏閮ㄥ畬鎴愶級
        if (currentRound === 4 && currentRoundScore >= TARGET_SCORE_PER_ROUND) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 宸插畬鎴?${completedRounds} 杞疂绠变换鍔★紝鏃犻渶寮€绠盽,
            type: "success",
          });
        } else {
          // 2. 鑾峰彇瑙掕壊鐗╁搧淇℃伅
          const roleInfoRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000,
          );
          const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
          const items = role.items || {};

          // 璁＄畻鍙敤瀹濈鏁伴噺
          const boxInventory = {};
          let totalAvailablePoints = 0;

          for (const box of boxPriority) {
            const count = items[box.id]?.quantity || 0;
            const available = box.id === 2001 ? Math.max(0, count - box.reserve) : count;
            boxInventory[box.id] = available;
            totalAvailablePoints += available * box.points;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鍙敤瀹濈: 鏈ㄨ川=${boxInventory[2001]}, 闈掗摐=${boxInventory[2002]}, 榛勯噾=${boxInventory[2003]}, 閾傞噾=${boxInventory[2004]}`,
            type: "info",
          });
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鍙幏寰楁€荤Н鍒? ${totalAvailablePoints}`,
            type: "info",
          });

          if (totalAvailablePoints < neededScore) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 绉垎涓嶈冻锛侀渶瑕?${neededScore}锛屽彲鑾峰緱 ${totalAvailablePoints}`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }

          // 3. 璁＄畻闇€瑕佸紑鐨勫疂绠辨暟閲忥細鎵€鏈夌瀛愬彧寮€10鐨勫€嶆暟锛屾湪璐ㄤ笉寮€鍗曚釜
          let remainingScore = neededScore;
          const openedBoxes = {};

          for (const box of boxPriority) {
            if (remainingScore <= 0)
              break;

            const available = boxInventory[box.id];
            if (available <= 0)
              continue;

            // 鎵€鏈夊疂绠卞彧寮€10鐨勫€嶆暟
            const maxAllowedByScore = Math.floor(remainingScore / box.points);
            const maxAllowed = Math.floor(maxAllowedByScore / 10) * 10;
            const availableBoxes = Math.floor(available / 10) * 10;
            const boxesToOpen = Math.min(maxAllowed, availableBoxes);

            if (boxesToOpen <= 0)
              continue;

            openedBoxes[box.id] = boxesToOpen;
            const gainedPoints = boxesToOpen * box.points;
            remainingScore -= gainedPoints;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 璁″垝寮€ ${box.name}: ${boxesToOpen} 涓?(+${gainedPoints}绉垎)`,
              type: "info",
            });
          }

          // 妫€鏌ユ槸鍚﹁繕鏈夊墿浣欙紙鍓╀綑绉垎涓嶈冻寮€10涓瀛愶紝寰呴鍙栧鍔卞悗琛ヨ冻锛?          if (remainingScore > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 绗竴杞紑绠卞悗杩樺樊 ${remainingScore} 绉垎锛屽緟棰嗗彇濂栧姳鍚庣敤闈掗摐/榛勯噾琛ヨ冻`,
              type: "info",
            });
          }

          // 4. 鎵ц寮€绠憋紙鎵€鏈夌瀛愬彧寮€10鐨勫€嶆暟锛?          for (const box of boxPriority) {
            if (shouldStop.value)
              break;

            const count = openedBoxes[box.id] || 0;
            if (count <= 0)
              continue;

            const batches = count / 10;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 寮€濮嬪紑 ${box.name}: ${count} 涓猔,
              type: "info",
            });

            for (let i = 0; i < batches && !shouldStop.value; i++) {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "item_openbox",
                { itemId: box.id, number: 10 },
                5000,
              );
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${box.name} 寮€绠辫繘搴? ${(i + 1) * 10}/${count}`,
                type: "info",
              });
              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            }
          }

          // 5. 棰嗗彇绉垎鍊煎疂绠卞鍔?          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 棰嗗彇绉垎鍊煎疂绠卞鍔?..`,
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
              message: `${token.name} 鉁?绉垎鍊煎疂绠卞鍔遍鍙栨垚鍔焋,
              type: "success",
            });
          } catch (error) {
            const errorMsg = error.message || "";
            if (errorMsg.includes("宸查鍙?) || errorMsg.includes("1100010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 绉垎鍊煎疂绠卞鍔卞凡棰嗗彇`,
                type: "info",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 棰嗗彇绉垎鍊煎疂绠卞鍔卞け璐? ${errorMsg}`,
                type: "warning",
              });
            }
          }

          // 5.5 绗簩杞ˉ瓒筹細閲嶆柊鏌ヨ绉垎锛岀敤闈掗摐/榛勯噾琛ヨ冻鍓╀綑
          const refreshActivityRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "activity_get",
            {},
            5000,
          );
          const refreshActivity = refreshActivityRes?.activity || refreshActivityRes?.body?.activity || refreshActivityRes;
          const refreshBoxWeekInfo = refreshActivity?.myTotalInfo?.["2"];
          if (refreshBoxWeekInfo) {
            const refreshRoundScore = Number(refreshBoxWeekInfo.num || refreshBoxWeekInfo.score || refreshBoxWeekInfo.value || 0);
            const refreshRound = Number(refreshBoxWeekInfo.rounds || 0);
            if (refreshRoundScore < TARGET_SCORE_PER_ROUND) {
              const stillNeed = TARGET_SCORE_PER_ROUND - refreshRoundScore;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 绗簩杞ˉ瓒? 绗?${refreshRound} 杞紝褰撳墠绉垎 ${refreshRoundScore}锛岃繕闇€ ${stillNeed}`,
                type: "info",
              });

              // 鐢ㄩ潚閾?榛勯噾琛ヨ冻锛堜笉寮€鏈ㄨ川锛?              const supplementPriority = [
                { id: 2002, name: "闈掗摐瀹濈", points: 10 },
                { id: 2003, name: "榛勯噾瀹濈", points: 20 },
                { id: 2004, name: "閾傞噾瀹濈", points: 50 },
              ];
              let supplementRemaining = stillNeed;
              const supplementBoxes = {};

              for (const box of supplementPriority) {
                if (supplementRemaining <= 0) break;
                const avail = Number(items[box.id]?.quantity || 0);
                if (avail <= 0) continue;
                const maxByScore = Math.floor(supplementRemaining / box.points);
                const maxAllowed = Math.floor(maxByScore / 10) * 10 || (maxByScore > 0 ? maxByScore * 10 <= avail ? maxByScore : Math.floor(avail / 10) * 10 : 0);
                const toOpen = Math.min(Math.floor(maxByScore / 10) * 10, Math.floor(avail / 10) * 10);
                // 濡傛灉鍓╀綑绉垎涓嶈冻10鐨勫€嶆暟锛屽悜涓婂彇鏁村紑10涓?                let finalToOpen = toOpen;
                if (finalToOpen <= 0 && supplementRemaining > 0 && avail >= 10) {
                  finalToOpen = 10;
                }
                if (finalToOpen > 0) {
                  supplementBoxes[box.id] = finalToOpen;
                  supplementRemaining -= finalToOpen * box.points;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 琛ヨ冻璁″垝寮€ ${box.name}: ${finalToOpen} 涓?(+${finalToOpen * box.points}绉垎)`,
                    type: "info",
                  });
                }
              }

              // 鎵ц琛ヨ冻寮€绠?              for (const box of supplementPriority) {
                if (shouldStop.value) break;
                const count = supplementBoxes[box.id] || 0;
                if (count <= 0) continue;
                const batches = Math.ceil(count / 10);
                for (let i = 0; i < batches && !shouldStop.value; i++) {
                  const num = Math.min(10, count - i * 10);
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "item_openbox",
                    { itemId: box.id, number: num },
                    5000,
                  );
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 琛ヨ冻 ${box.name}: ${(i + 1) * 10 > count ? count : (i + 1) * 10}/${count}`,
                    type: "info",
                  });
                  await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                }
              }

              // 琛ヨ冻鍚庡啀娆￠鍙栫Н鍒嗗鍔?              try {
                await tokenStore.sendMessageWithPromise(tokenId, "item_batchclaimboxpointreward", {}, 5000);
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鉁?琛ヨ冻鍚庣Н鍒嗗鍔遍鍙栨垚鍔焋, type: "success" });
              } catch (e) { /* ignore */ }
            }
          }

        // 6. 棰嗗彇瀹濈鍛ㄤ换鍔¤揪鏍囧鍔憋紙鐝嶇彔锛?        const finalActivityRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "activity_get",
          {},
          5000,
        );

        // 璋冭瘯鏃ュ織锛氭煡鐪嬪搷搴旂粨鏋?        console.log(`[${token.name}] activity_get 鍝嶅簲:`, JSON.stringify(finalActivityRes).substring(0, 500));

        const finalActivity = finalActivityRes?.activity || finalActivityRes?.body?.activity || finalActivityRes;
        const finalMyTotalInfo = finalActivity?.myTotalInfo || {};
        const finalBoxWeekInfo = finalMyTotalInfo["2"];

        // 璋冭瘯鏃ュ織锛氭煡鐪嬪疂绠卞懆鏁版嵁
        console.log(`[${token.name}] myTotalInfo:`, JSON.stringify(finalMyTotalInfo).substring(0, 300));
        console.log(`[${token.name}] boxWeekInfo["2"]:`, JSON.stringify(finalBoxWeekInfo));

        if (finalBoxWeekInfo) {
          // 鍏煎澶氱瀛楁鍚嶏細num, score, value
          const finalRoundScore = Number(finalBoxWeekInfo.num || finalBoxWeekInfo.score || finalBoxWeekInfo.value || 0);
          // rounds 琛ㄧず褰撳墠杞暟锛堢鍑犺疆锛?          const finalCurrentRound = Number(finalBoxWeekInfo.rounds || 0);
          // 璁＄畻宸插畬鎴愯疆鏁板拰鎬荤Н鍒?          let finalCompletedRounds;
          let finalTotalScore;
          if (finalRoundScore >= TARGET_SCORE_PER_ROUND) {
            finalCompletedRounds = finalCurrentRound;
            finalTotalScore = finalCurrentRound * TARGET_SCORE_PER_ROUND;
          } else {
            finalCompletedRounds = Math.max(0, finalCurrentRound - 1);
            finalTotalScore = finalCompletedRounds * TARGET_SCORE_PER_ROUND + finalRoundScore;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 寮€绠卞畬鎴? 绗?${finalCurrentRound} 杞紝宸插畬鎴?${finalCompletedRounds} 杞紝褰撳墠杞Н鍒? ${finalRoundScore}锛屾€荤Н鍒? ${finalTotalScore}`,
            type: "success",
          });

          // 鏄剧ず姣忚疆瀹屾垚鐘舵€?          for (let i = 1; i <= Math.min(finalCompletedRounds, MAX_ROUNDS); i++) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 鉁?绗?${i} 杞凡瀹屾垚`,
              type: "success",
            });
          }
        }
        } // 鍏抽棴 else 鍧?
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 鎸夌Н鍒嗗紑绠卞畬鎴?===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鎸夌Н鍒嗗紑绠卞け璐? ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processOpenBoxByPoints);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎸夌Н鍒嗗紑绠辩粨鏉?);
  };

  /**
   * 鑻遍泟鍥涘湥鍗囩骇
   * @param {Array} heroIds - 鑻遍泟ID鏁扮粍
   */
  const heroFourSaintsUpgrade = async (heroIds = [], isScheduledTask = false) => {
    if (selectedTokens.value.length === 0 || heroIds.length === 0) {
      if (!isScheduledTask) {
        message.warning("璇烽€夋嫨璐﹀彿鍜岃嫳闆?);
      }
      return;
    }

    // 闄愬埗锛氭瘡娆″彧鑳藉崟涓嫳闆勫崌绾?    if (heroIds.length > 1) {
      if (!isScheduledTask) {
        message.warning("鍥涘湥鍗囩骇姣忔鍙兘閫夋嫨涓€涓嫳闆勶紝璇烽噸鏂伴€夋嫨");
      }
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;
    currentRunningTokenId.value = null;

    // 鑻遍泟ID涓庡悕绉版槧灏?    const heroNameMap = {
      101: "鍙搁┈鎳?,
      103: "鍏崇窘",
      104: "璇歌憶浜?,
      105: "鍛ㄧ憸",
      106: "澶彶鎱?,
      107: "鍚曞竷",
      109: "鐢勫К",
      111: "瀛欑瓥",
      112: "璐捐",
      113: "鏇逛粊",
      114: "濮滅淮",
      116: "鍏瓩鐡?,
      117: "鍏搁煢",
      118: "瓒呬簯",
      120: "寮犺",
      121: "椴佽們",
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
            message: `=== 寮€濮?${token.name} 鑻遍泟鍥涘湥鍗囩骇 ===`,
            type: "info",
          });

          // 閬嶅巻姣忎釜鑻遍泟
          for (const heroId of heroIds) {
            if (shouldStop.value)
              break;

            const heroName = heroNameMap[heroId] || `鑻遍泟${heroId}`;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 寮€濮嬪崌绾?${heroName} 鍥涘湥`,
              type: "info",
            });

            try {
              // 鍥涘湥鍗囩骇閫昏緫锛氱孩鐜?娆?鈫?钃濈帀寰幆鍒颁笂闄?鈫?绾㈢帀1娆?鈫?(鎴愬姛鍒欑户缁摑鐜夛紝澶辫触鍒欏仠姝?
              let totalUpgradeCount = 0; // 绾㈢帀鎬绘鏁?              let totalQuenchCount = 0; // 钃濈帀鎬绘鏁?
              // 1. 绗竴娆＄孩鐜夊崌绾э紙涓嶇鎴愬姛澶辫触锛?              let firstUpgradeSuccess = false;
              try {
                const upgradeResult = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hb_upgradeorder",
                  { heroId },
                  batchSettings.defaultCommandTimeout || 5000,
                );

                if (upgradeResult && upgradeResult.error) {
                  // 绗竴娆＄孩鐜夊崌绾уけ璐ワ紝鍒ゆ柇涓烘湭寮€鍚洓鍦ｆ垨缂哄皯鏉愭枡
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${heroName} 鏈紑鍚洓鍦ｆ垨缂哄皯绾㈢帀/钃濈帀锛岃烦杩囪鑻遍泟`,
                    type: "warning",
                  });
                  firstUpgradeSuccess = false;
                } else {
                  totalUpgradeCount++;
                  firstUpgradeSuccess = true;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} ${heroName} 绾㈢帀鍗囩骇绗?${totalUpgradeCount} 娆℃垚鍔焋,
                    type: "success",
                  });
                }
              } catch (error) {
                // 绗竴娆＄孩鐜夊崌绾у氨鍑洪敊锛屽垽鏂负鏈紑鍚洓鍦ｆ垨缂哄皯鏉愭枡
                // 閿欒鐮?00000琛ㄧず鐗╁搧涓嶅瓨鍦紝400010琛ㄧず鐗╁搧鏁伴噺涓嶈冻锛堢己灏戠孩鐜夛級
                const errorMsg = error.message?.includes("400000") || error.message?.includes("400010")
                  ? `${token.name} ${heroName} 绾㈢帀鏁伴噺缂哄皯锛屾棤娉曞崌绾ф垚鍔焋
                  : `${token.name} ${heroName} 鏈紑鍚洓鍦ｆ垨缂哄皯绾㈢帀锛岃烦杩囪鑻遍泟`;

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: errorMsg,
                  type: "warning",
                });
                firstUpgradeSuccess = false;
              }

              // 2. 涓嶇绾㈢帀鏄惁鎴愬姛锛岄兘瑕佹墽琛岃摑鐜夊崌绾у惊鐜?              if (!shouldStop.value) {
                // 寤惰繜
                await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                let quenchCount = 0;
                let quenchStopped = false;
                const MAX_QUENCH = 200; // 瀹夊叏涓婇檺锛岄槻姝㈡棤闄愬惊鐜?                while (!quenchStopped && !shouldStop.value && quenchCount < MAX_QUENCH) {
                  try {
                    const quenchResult = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "hb_quench",
                      { heroId },
                      batchSettings.defaultCommandTimeout || 5000,
                    );

                    if (quenchResult && quenchResult.error) {
                      // 钃濈帀鍗囩骇鍒拌揪涓婇檺
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺鎴栧け璐? ${quenchResult.error}`,
                        type: "info",
                      });
                      quenchStopped = true;
                    } else {
                      quenchCount++;
                      totalQuenchCount++;
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 钃濈帀鍗囩骇绗?${quenchCount} 娆℃垚鍔焋,
                        type: "success",
                      });
                      // 寤惰繜鍚庣户缁?                      await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                    }
                  } catch (error) {
                    // 閿欒鐮?00020琛ㄧず宸茶揪涓婇檺锛?00000琛ㄧず鐗╁搧涓嶅瓨鍦紙缂哄皯钃濈帀锛?                    let errorMsg;
                    if (error.message?.includes("200020")) {
                      errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺`;
                    } else if (error.message?.includes("400000")) {
                      errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺`;
                    } else {
                      errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇鍑洪敊: ${error.message}`;
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
                    message: `${token.name} ${heroName} 钃濈帀鍗囩骇瀹屾垚 - ${quenchCount}娆,
                    type: "info",
                  });
                }
              }

              // 3. 濡傛灉绗竴娆＄孩鐜夋垚鍔燂紝杩涘叆寰幆锛氱孩鐜?娆?鈫?鎴愬姛鍒欒摑鐜夊惊鐜?鈫?澶辫触鍒欏仠姝?              if (firstUpgradeSuccess && !shouldStop.value) {
                // 寤惰繜鍚庤繘鍏ュ惊鐜?                await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                let shouldContinue = true;
                let redJadeCount = 0;
                const MAX_RED_JADE = 50; // 瀹夊叏涓婇檺锛岄槻姝㈡棤闄愬惊鐜?                while (shouldContinue && !shouldStop.value && redJadeCount < MAX_RED_JADE) {
                  redJadeCount++;
                  // 鎵ц绾㈢帀鍗囩骇1娆?                  let currentUpgradeSuccess = false;
                  try {
                    const upgradeResult = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "hb_upgradeorder",
                      { heroId },
                      batchSettings.defaultCommandTimeout || 5000,
                    );

                    if (upgradeResult && upgradeResult.error) {
                      // 绾㈢帀鍗囩骇澶辫触锛屽仠姝㈡暣涓祦绋?                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 绾㈢帀鍗囩骇宸茶揪涓婇檺鎴栧け璐? ${upgradeResult.error}`,
                        type: "info",
                      });
                      shouldContinue = false;
                    } else {
                      totalUpgradeCount++;
                      currentUpgradeSuccess = true;
                      addLog({
                        time: new Date().toLocaleTimeString(),
                        message: `${token.name} ${heroName} 绾㈢帀鍗囩骇绗?${totalUpgradeCount} 娆℃垚鍔焋,
                        type: "success",
                      });
                    }
                  } catch (error) {
                    // 閿欒鐮?00020琛ㄧず宸插崌绾ф垚鍔燂紝400000/400010琛ㄧず鐗╁搧涓嶅瓨鍦ㄦ垨鏁伴噺涓嶈冻锛堢己灏戠孩鐜夛級
                    let errorMsg;
                    if (error.message?.includes("200020")) {
                      errorMsg = `${token.name} ${heroName} 绾㈢帀宸插崌绾ф垚鍔焋;
                      // 200020琛ㄧず鎴愬姛锛岀户缁墽琛?                      totalUpgradeCount++;
                      currentUpgradeSuccess = true;
                    } else if (error.message?.includes("400000") || error.message?.includes("400010")) {
                      errorMsg = `${token.name} ${heroName} 绾㈢帀鏁伴噺缂哄皯锛屾棤娉曞崌绾ф垚鍔焋;
                      shouldContinue = false;
                    } else {
                      errorMsg = `${token.name} ${heroName} 绾㈢帀鍗囩骇鍑洪敊: ${error.message}`;
                      shouldContinue = false;
                    }

                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: errorMsg,
                      type: error.message?.includes("200020") ? "success" : (error.message?.includes("400000") || error.message?.includes("400010") ? "info" : "error"),
                    });
                  }

                  // 濡傛灉绾㈢帀鎴愬姛锛屾墽琛岃摑鐜夊崌绾у惊鐜?                  if (currentUpgradeSuccess && !shouldStop.value) {
                    // 寤惰繜
                    await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

                    let quenchCount = 0;
                    let quenchStopped = false;
                    const MAX_QUENCH2 = 200; // 瀹夊叏涓婇檺锛岄槻姝㈡棤闄愬惊鐜?                    while (!quenchStopped && !shouldStop.value && quenchCount < MAX_QUENCH2) {
                      try {
                        const quenchResult = await tokenStore.sendMessageWithPromise(
                          tokenId,
                          "hb_quench",
                          { heroId },
                          batchSettings.defaultCommandTimeout || 5000,
                        );

                        if (quenchResult && quenchResult.error) {
                          // 钃濈帀鍗囩骇鍒拌揪涓婇檺
                          addLog({
                            time: new Date().toLocaleTimeString(),
                            message: `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺鎴栧け璐? ${quenchResult.error}`,
                            type: "info",
                          });
                          quenchStopped = true;
                        } else {
                          quenchCount++;
                          totalQuenchCount++;
                          addLog({
                            time: new Date().toLocaleTimeString(),
                            message: `${token.name} ${heroName} 钃濈帀鍗囩骇绗?${quenchCount} 娆℃垚鍔焋,
                            type: "success",
                          });
                          // 寤惰繜鍚庣户缁?                          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                        }
                      } catch (error) {
                        // 閿欒鐮?00020琛ㄧず宸茶揪涓婇檺锛?00000琛ㄧず鐗╁搧涓嶅瓨鍦紙缂哄皯钃濈帀锛?                        let errorMsg;
                        if (error.message?.includes("200020")) {
                          errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺`;
                        } else if (error.message?.includes("400000")) {
                          errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇宸茶揪涓婇檺`;
                        } else {
                          errorMsg = `${token.name} ${heroName} 钃濈帀鍗囩骇鍑洪敊: ${error.message}`;
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
                        message: `${token.name} ${heroName} 鏈疆钃濈帀鍗囩骇瀹屾垚 - ${quenchCount}娆,
                        type: "info",
                      });
                    }

                    // 寤惰繜鍚庣户缁笅涓€杞孩鐜夊崌绾?                    await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
                  }
                }
              }

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${heroName} 鍥涘湥鍗囩骇瀹屾垚 - 绾㈢帀${totalUpgradeCount}娆? 钃濈帀${totalQuenchCount}娆,
                type: "success",
              });

              // 鑻遍泟闂村欢杩?              await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
            } catch (error) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} ${heroName} 鍗囩骇澶辫触: ${error.message}`,
                type: "error",
              });
            }
          }

          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 鑻遍泟鍥涘湥鍗囩骇瀹屾垚 ===`,
            type: "success",
          });
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鑻遍泟鍥涘湥鍗囩骇澶辫触: ${error.message}`,
            type: "error",
          });
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processFourSaints);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("鑻遍泟鍥涘湥鍗囩骇缁撴潫");
    }
  };

  // ====== 娑堣€楁椿鍔ㄥ叡浜緟鍔╁嚱鏁?======
  const _consumeActivityBatchCmd = async (tokenId, cmd, getParams, totalQty, label) => {
    const DELAY = _getModuleDelay('default');
    const batchSize = 10;
    const batches = Math.floor(totalQty / batchSize);
    const remainder = totalQty % batchSize;
    let executed = 0;
    for (let i = 0; i < batches; i++) {
      if (shouldStop.value) throw new Error('鐢ㄦ埛鍋滄');
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(batchSize), 15000);
      executed += batchSize;
      addLog({ time: new Date().toLocaleTimeString(), message: `${label}${batchSize}涓?(${executed}/${totalQty})`, type: "info" });
      if (DELAY > 0) await new Promise(r => setTimeout(r, DELAY));
    }
    if (remainder > 0) {
      if (shouldStop.value) throw new Error('鐢ㄦ埛鍋滄');
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(remainder), 15000);
      executed += remainder;
      addLog({ time: new Date().toLocaleTimeString(), message: `${label}${remainder}涓?(${executed}/${totalQty})`, type: "info" });
    }
  };

  const _consumeActivityChestLoop = async (tokenId, role, progressList, manager, getMaxTarget, formatNum) => {
    const chestPriority = [
      { id: 2004, points: 50, name: '閾傞噾瀹濈' },
      { id: 2003, points: 20, name: '榛勯噾瀹濈' },
      { id: 2002, points: 10, name: '闈掗摐瀹濈' },
      { id: 2001, points: 1, name: '鏈ㄨ川瀹濈' },
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
      if (plan.length === 0) { addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈涓嶈冻锛岃繕鍓?{formatNum(pointGap)}鍒哷, type: "warning" }); break; }
      const planDesc = plan.map(c => `${c.name}x${c.qty}`).join(' + ');
      addLog({ time: new Date().toLocaleTimeString(), message: `绗?{round}杞? ${formatNum(chestProgress.current)}鍒? 宸?{formatNum(pointGap)}鍒?鈫?${planDesc}`, type: "info" });
      let roundOpened = 0, roundPoints = 0;
      for (const chest of plan) {
        if (shouldStop.value) break;
        try {
          await _consumeActivityBatchCmd(tokenId, 'item_openbox', (qty) => ({ itemId: chest.typeId, number: qty }), chest.qty, `寮€${chest.name}`);
          roundOpened += chest.qty; roundPoints += chest.qty * chest.points; totalOpened += chest.qty; totalPoints += chest.qty * chest.points;
          await new Promise(r => setTimeout(r, 300));
        } catch (e) { if (e.message === '鐢ㄦ埛鍋滄') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `寮€${chest.name}澶辫触: ${e.message}`, type: "warning" }); }
      }
      try { await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000); } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
      try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000); await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000); } catch (e) {}
      await new Promise(r => setTimeout(r, 500));
      const newData = tokenStore.gameData?.commonActivityInfo;
      const activityData = newData?.activity?.commonActivityInfo || newData?.commonActivityInfo;
      const newProgressList = manager.calculateProgressList(activityData);
      const newChestProgress = newProgressList.find(p => p.id === 2);
      if (!newChestProgress || newChestProgress.isCompleted) { addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈浠诲姟宸茶揪婊℃。`, type: "success" }); break; }
      const newGap = getMaxTarget(2) - newChestProgress.current;
      addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈绉垎: ${formatNum(newChestProgress.current)}/${formatNum(getMaxTarget(2))}锛岃繕宸?{formatNum(newGap)}鍒哷, type: "info" });
      if (newGap <= 0) break;
      // 鏇存柊杩涘害鍒楄〃锛堝叧閿細纭繚涓嬩竴杞敤鏈€鏂拌繘搴﹁绠楋級
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
   * 鎵归噺娑堣€楁椿鍔?- 鑷姩瀹屾垚鎷涘嫙銆佸疂绠便€侀挀楸兼秷鑰椾换鍔?   */
  const batchConsumeActivity = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    const manager = new ConsumeActivityManager();
    const DELAY = _getModuleDelay('default');

    // 瀹濈浼樺厛绾?    const chestPriority = [
      { id: 2004, points: 50, name: '閾傞噾瀹濈' },
      { id: 2003, points: 20, name: '榛勯噾瀹濈' },
      { id: 2002, points: 10, name: '闈掗摐瀹濈' },
      { id: 2001, points: 1, name: '鏈ㄨ川瀹濈' },
    ];

    const getMaxTarget = (taskId) => {
      const configs = manager.missionTypes[taskId];
      if (!configs || configs.length === 0) return 0;
      return configs[configs.length - 1].num;
    };

    const formatNum = (n) => {
      if (n == null) return '0';
      return n >= 10000 ? (n / 10000).toFixed(1) + '涓? : String(n);
    };

    // 鍒嗘壒鎵ц鍛戒护锛堝惈400340鏈嶅姟鍣ㄩ檺娴侀噸璇曪級
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
              addLog({ time: new Date().toLocaleTimeString(), message: `鈿狅笍 ${label}鏈嶅姟鍣ㄩ檺娴?400340)锛岀瓑寰?0绉掑悗閲嶈瘯(${attempt+1}/${MAX_400340_RETRIES})...`, type: "warning" });
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
        if (shouldStop.value) throw new Error('鐢ㄦ埛鍋滄');
        await sendWithRetry(batchSize);
        executed += batchSize;
        addLog({ time: new Date().toLocaleTimeString(), message: `${label}${batchSize}涓?(${executed}/${totalQty})`, type: "info" });
        if (DELAY > 0) await new Promise(r => setTimeout(r, DELAY));
      }
      if (remainder > 0) {
        if (shouldStop.value) throw new Error('鐢ㄦ埛鍋滄');
        await sendWithRetry(remainder);
        executed += remainder;
        addLog({ time: new Date().toLocaleTimeString(), message: `${label}${remainder}涓?(${executed}/${totalQty})`, type: "info" });
      }
    };

    // 瀹濈寰幆寮€绠?    const executeChestLoop = async (tokenId, role, progressList) => {
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

        // 璁＄畻鏈疆寮€绠辫鍒?        const items = role?.items || role?.itemList || {};
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
          addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈涓嶈冻锛岃繕鍓?{formatNum(pointGap)}鍒嗘棤娉曡揪鎴恅, type: "warning" });
          break;
        }

        const planDesc = plan.map(c => `${c.name}x${c.qty}`).join(' + ');
        const planPoints = plan.reduce((s, c) => s + c.qty * c.points, 0);
        addLog({ time: new Date().toLocaleTimeString(), message: `绗?{round}杞? 褰撳墠${formatNum(chestProgress.current)}鍒? 鐩爣${formatNum(maxTarget)}鍒? 宸?{formatNum(pointGap)}鍒?鈫?璁″垝: ${planDesc} (${formatNum(planPoints)}鍒?`, type: "info" });

        let roundOpened = 0;
        let roundPoints = 0;
        for (const chest of plan) {
          if (shouldStop.value) break;
          try {
            await executeBatchCmd(tokenId, 'item_openbox', (qty) => ({ itemId: chest.typeId, number: qty }), chest.qty, `寮€${chest.name}`);
            roundOpened += chest.qty;
            roundPoints += chest.qty * chest.points;
            totalOpened += chest.qty;
            totalPoints += chest.qty * chest.points;
            await new Promise(r => setTimeout(r, _getModuleDelay('default')));
          } catch (e) {
            if (e.message === '鐢ㄦ埛鍋滄') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `寮€${chest.name}澶辫触: ${e.message}`, type: "warning" });
          }
        }

        // 棰嗗彇绉垎濂栧姳
        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `棰嗗彇瀹濈绉垎濂栧姳...`, type: "info" });
          await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, batchSettings.battleCommandTimeout || 15000);
        } catch (e) {
          // 闈欓粯澶勭悊
        }
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        addLog({ time: new Date().toLocaleTimeString(), message: `绗?{round}杞墽琛屽畬姣? 寮€${roundOpened}涓? ${formatNum(roundPoints)}鍒哷, type: "info" });

        // 鍒锋柊鏁版嵁
        addLog({ time: new Date().toLocaleTimeString(), message: `鍒锋柊鏁版嵁锛岄噸鏂拌绠楃Н鍒?..`, type: "info" });
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        // 閲嶆柊璇诲彇杩涘害
        const newData = tokenStore.gameData?.commonActivityInfo;
        const activityData = newData?.activity?.commonActivityInfo || newData?.commonActivityInfo;
        const newProgressList = manager.calculateProgressList(activityData);
        const newChestProgress = newProgressList.find(p => p.id === 2);
        if (!newChestProgress || newChestProgress.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈浠诲姟宸茶揪婊℃。`, type: "success" });
          break;
        }
        const newGap = maxTarget - newChestProgress.current;
        addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈绉垎: ${formatNum(newChestProgress.current)}/${formatNum(maxTarget)}锛岃繕宸?{formatNum(newGap)}鍒哷, type: "info" });
        if (newGap <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `瀹濈绉垎宸茶揪鏍? ${formatNum(newChestProgress.current)}/${formatNum(maxTarget)}`, type: "success" });
          break;
        }

        // 鏇存柊杩涘害鍜宺ole鏁版嵁锛堝叧閿細纭繚涓嬩竴杞敤鏈€鏂拌繘搴﹁绠楋級
        for (let i = 0; i < progressList.length; i++) {
          const fresh = newProgressList.find(p => p.id === progressList[i].id);
          if (fresh) progressList[i] = fresh;
        }
        role = tokenStore.gameData?.roleInfo?.role || role;
      }

      // 鏈€缁堥鍙栦竴娆＄Н鍒嗭紙纭繚鏈€鍚庝竴杞殑绉垎濂栧姳琚鍙栵級
      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `鏈€缁堥鍙栧疂绠辩Н鍒嗗鍔?..`, type: "info" });
        await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, batchSettings.battleCommandTimeout || 15000);
      } catch (e) {
        // 闈欓粯澶勭悊锛氬彲鑳芥病鏈夋柊鐨勭Н鍒嗗彲棰?      }
      await new Promise(r => setTimeout(r, _getModuleDelay('default')));

      return { rounds: round, totalOpened, totalPoints };
    };

    // 澶勭悊鍗曚釜璐﹀彿
    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 寮€濮嬫秷鑰楁椿鍔? ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 鑾峰彇娲诲姩鏁版嵁
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鑾峰彇娲诲姩鏁版嵁澶辫触: ${e.message}`, type: "warning" });
        }
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        const gameData = tokenStore.gameData;
        const roleInfo = gameData?.roleInfo;
        const role = roleInfo?.role;
        const commonActivityInfo = gameData?.commonActivityInfo;
        const activityData = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;

        if (!activityData) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏃犳秷鑰楁椿鍔ㄦ暟鎹紝璺宠繃`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        const progressList = manager.calculateProgressList(activityData);
        const rcResult = manager.getResourceCounts(roleInfo);
        const rc = rcResult.data || { chests: {}, fishing: {}, recruit: {}, torch: {} };

        // 杈撳嚭褰撳墠杩涘害鎽樿
        const progressSummary = progressList.map(p => {
          const maxTarget = getMaxTarget(p.id);
          const status = p.isCompleted ? '鉁呭凡婊? : `${formatNum(p.current)}/${formatNum(maxTarget)}`;
          return `${p.name}(${status})`;
        }).join(' | ');
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 褰撳墠杩涘害: ${progressSummary}`, type: "info" });

        // 杈撳嚭璧勬簮搴撳瓨
        const chestSummary = Object.entries(rc.chests || {})
          .filter(([_, v]) => v > 0)
          .map(([k, v]) => {
            const names = { 2001: '鏈ㄨ川', 2002: '闈掗摐', 2003: '榛勯噾', 2004: '閾傞噾', 2005: '閽荤煶' };
            return `${names[k] || k}x${formatNum(v)}`;
          }).join(', ');
        const otherSummary = [
          `鎷涘嫙浠${formatNum(rc.recruit?.[1001] || 0)}`,
          `楸肩x${formatNum(rc.fishing?.[1011] || 0)}`,
          `鐏妸x${formatNum(rc.torch?.[1008] || 0)}`,
          `澶ф灒x${formatNum(rc.consumeItems?.[5280] || 0)}`
        ].join(', ');
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 璧勬簮搴撳瓨: ${chestSummary || '鏃犲疂绠?} | ${otherSummary}`, type: "info" });

        // 2. 鎵ц鎷涘嫙锛堝惊鐜垎鎵?+ 姣忔壒鍒锋柊閲嶇畻宸锛岄槻姝㈢敤瓒咃級
        const RECRUIT_BATCH = 1000; // 姣忚疆鏈€澶氭嫑鍕熸暟
        let recruitTotalUsed = 0;
        while (true) {
          if (shouldStop.value) break;
          // 姣忚疆閲嶆柊鑾峰彇鏈€鏂拌繘搴?          const freshActData = (() => {
            const d = tokenStore.gameData?.commonActivityInfo;
            return d?.activity?.commonActivityInfo || d?.commonActivityInfo;
          })();
          const freshProgressList = freshActData ? manager.calculateProgressList(freshActData) : [];
          const recruitProg = freshProgressList.find(p => p.id === 1);
          if (!recruitProg || recruitProg.isCompleted) {
            if (recruitTotalUsed > 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 宸茶揪婊℃。锛屽仠姝, type: "success" });
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
            if (recruitTotalUsed === 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鎷涘嫙浠や笉瓒筹紙闇€${gap}锛屾湁${available}锛夛紝璺宠繃`, type: "warning" });
            break;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 褰撳墠${formatNum(recruitProg.current)}锛岀洰鏍?{formatNum(maxTarget)}锛屽樊${gap}锛屽彲鐢?{available}锛屾湰杞墽琛?{thisRound}`, type: "info" });
          try {
            await executeBatchCmd(tokenId, 'hero_recruit', (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }), thisRound, '鎷涘嫙浠や娇鐢?);
            recruitTotalUsed += thisRound;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鏈疆瀹屾垚 x${thisRound}锛堢疮璁?{recruitTotalUsed}锛塦, type: "success" });
          } catch (e) {
            if (e.message === '鐢ㄦ埛鍋滄') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 澶辫触: ${e.message}`, type: "warning" });
            break;
          }
          // 鍒锋柊鏁版嵁锛岀‘淇濅笅涓€杞敤鏈€鏂拌繘搴?          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          } catch (e) {}
          await new Promise(r => setTimeout(r, 500));
        }
        if (recruitTotalUsed > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鍏卞畬鎴?x${recruitTotalUsed}`, type: "success" });
        }

        // 3. 鎵ц瀹濈寰幆寮€绠?        const chestProgress = progressList.find(p => p.id === 2);
        if (chestProgress && !chestProgress.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 寮€濮嬪惊鐜紑绠?(褰撳墠${formatNum(chestProgress.current)}鍒? 鐩爣${formatNum(getMaxTarget(2))}鍒?`, type: "info" });
          try {
            const result = await executeChestLoop(tokenId, role, progressList);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 瀹屾垚: 鍏?{result.rounds}杞紝寮€${result.totalOpened}涓紝绱${formatNum(result.totalPoints)}鍒哷, type: "success" });
          } catch (e) {
            if (e.message === '鐢ㄦ埛鍋滄') throw e;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 寮€绠卞け璐? ${e.message}`, type: "warning" });
          }
        } else if (chestProgress?.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 宸茶揪婊℃。锛岃烦杩嘸, type: "info" });
        }

        // 4. 鎵ц閽撻奔锛堥粍閲戦奔绔匡紝鐩爣1250锛?        const fishProgress = progressList.find(p => p.id === 3);
        if (fishProgress && !fishProgress.isCompleted) {
          const fishTarget = 1250;
          const current = fishProgress.current;
          const gap = Math.max(0, fishTarget - current);
          if (gap > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 榛勯噾楸肩 褰撳墠${formatNum(current)}锛岀洰鏍?{fishTarget}锛岃繕闇€${gap}`, type: "info" });
            // 鍏堥鍙栭噾楸肩
            try {
              await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, batchSettings.defaultCommandTimeout || 5000);
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 閲戦奔绔块鍙栨垚鍔焋, type: "success" });
            } catch (e) {
              if (!e.message?.includes('400180')) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 閲戦奔绔块鍙栧け璐? ${e.message}锛岀户缁挀楸糮, type: "warning" });
              }
            }
            await new Promise(r => setTimeout(r, _getModuleDelay('default')));

            // 妫€鏌ラ粍閲戦奔绔垮簱瀛?            const freshRole = tokenStore.gameData?.roleInfo?.role || role;
            const rodCount = freshRole?.items?.[1012]?.quantity || 0;
            const fishCount = Math.min(gap, rodCount);
            if (fishCount > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 榛勯噾楸肩搴撳瓨${rodCount}锛屾墽琛?{fishCount}娆, type: "info" });
              try {
                addLog({ time: new Date().toLocaleTimeString(), message: `寮€濮嬫墽琛岄挀楸?x${fishCount}...`, type: "info" });
                await executeBatchCmd(tokenId, 'artifact_lottery', (qty) => ({ type: 2, lotteryNumber: qty, newFree: true }), fishCount, '榛勯噾楸肩浣跨敤');
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 瀹屾垚 x${fishCount}`, type: "success" });
              } catch (e) {
                if (e.message === '鐢ㄦ埛鍋滄') throw e;
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 澶辫触: ${e.message}`, type: "warning" });
              }
              // 鍒锋柊鏁版嵁
              addLog({ time: new Date().toLocaleTimeString(), message: `鍒锋柊鏁版嵁...`, type: "info" });
              try {
                await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
                await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
              } catch (e) {}
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 榛勯噾楸肩涓嶈冻锛堥渶${gap}锛屾湁${rodCount}锛夛紝璺宠繃`, type: "warning" });
            }
          }
        } else if (fishProgress?.isCompleted) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 宸茶揪婊℃。锛岃烦杩嘸, type: "info" });
        }

        // 5. 鐩愮綈鍜岄噾鐮栬繘搴︽彁绀猴紙杩欎袱涓棤娉曡嚜鍔ㄦ墽琛岋紝浠呮樉绀虹姸鎬侊級
        const torchProgress = progressList.find(p => p.id === 4);
        const goldProgress = progressList.find(p => p.id === 5);
        const torchStatus = torchProgress?.isCompleted ? '鉁呭凡婊? : `${formatNum(torchProgress?.current || 0)}/${formatNum(getMaxTarget(4))}`;
        const goldStatus = goldProgress?.isCompleted ? '鉁呭凡婊? : `${formatNum(goldProgress?.current || 0)}/${formatNum(getMaxTarget(5))}`;
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鍏朵粬] 鐩愮綈: ${torchStatus} | 閲戠爾: ${goldStatus}锛堥渶鎵嬪姩瀹屾垚锛塦, type: "info" });

        // 杈撳嚭鎵ц鍚庤繘搴?        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        const endActivityData = tokenStore.gameData?.commonActivityInfo?.activity?.commonActivityInfo
          || tokenStore.gameData?.commonActivityInfo?.commonActivityInfo;
        if (endActivityData) {
          const endProgress = manager.calculateProgressList(endActivityData);
          const completedCount = endProgress.filter(p => p.isCompleted).length;
          const endSummary = endProgress.map(p => {
            const maxT = getMaxTarget(p.id);
            const st = p.isCompleted ? '鉁? : `${formatNum(p.current)}/${formatNum(maxT)}`;
            return `${p.name}(${st})`;
          }).join(' | ');
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鎵ц鍚庤繘搴? ${endSummary} (${completedCount}/5椤瑰畬鎴?`, type: "info" });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 娑堣€楁椿鍔ㄥ畬鎴?===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        if (e.message?.includes('400340')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄩ亣鍒版湇鍔″櫒闄愭祦(400340)锛岀瓑寰?0绉掑悗鍒锋柊鏁版嵁閲嶈瘯...`, type: "warning" });
          await new Promise(r => setTimeout(r, 10000));
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          } catch (_) {}
          tokenStatus.value[tokenId] = "waiting_retry";
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄥけ璐? ${e.message}`, type: "error" });
          tokenStatus.value[tokenId] = "failed";
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    await runStreaming(selectedTokens.value, processToken);

    // 浼樺厛閲嶈瘯400340闄愭祦璐﹀彿锛堢瓑10绉掑悗绔嬪嵆閲嶈瘯锛?    let throttledTokens = selectedTokens.value.filter(id => tokenStatus.value[id] === "waiting_retry");
    if (throttledTokens.length > 0 && !shouldStop.value) {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n=== 鍙戠幇 ${throttledTokens.length} 涓处鍙峰嚭鐜?00340闄愭祦锛?0绉掑悗閲嶈瘯 ===`, type: "info" });
      await new Promise(r => setTimeout(r, 10000));
      await runStreaming(throttledTokens, processToken);
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("娑堣€楁椿鍔ㄦ墽琛屽畬姣?);
    }
  };

  /**
   * 鎵归噺棰嗗彇娑堣€楁椿鍔ㄩ亾鍏?   * 1. 棰嗗彇鍏嶈垂閬撳叿 (activity_commonbuygoods)
   * 2. 棰嗗彇浠诲姟濂栧姳 1-20妗?(activity_claimtaskreward)
   */
  const batchClaimConsumeRewards = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    const DELAY = _getModuleDelay('default');

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 鍏ㄥ眬娲诲姩ID锛堜粎棣栦釜token鑾峰彇涓€娆★紝鍚庣画澶嶇敤锛?    let globalFreeActivityId = null;   // 绗?涓綅缃?- 鍏嶈垂閬撳叿
    let globalFreeGoodsId = null;
    let globalConsumeActivityId = null; // 绗?涓綅缃?- 妗ｄ綅娑堣€楀鍔?    let activityFetched = false;

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 寮€濮嬮鍙栨秷鑰楁椿鍔ㄩ亾鍏? ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 浠呴娆¤幏鍙栨椿鍔ㄦ暟鎹紙鍏嶈垂閬撳叿闇€瑕侊紝妗ｄ綅濂栧姳涓嶉渶瑕侊級
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
              // 绗?涓綅缃?- 妗ｄ綅娑堣€楀鍔辩殑activityId
              if (entries.length >= 1) {
                globalConsumeActivityId = Number(entries[0][0]);
              }
              // 绗?涓綅缃?- 鍏嶈垂閬撳叿鐨刟ctivityId鍜実oodsId
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
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鑾峰彇娲诲姩鏁版嵁澶辫触: ${e.message}`, type: "warning" });
          }
          activityFetched = true;
        }

        if (!globalFreeActivityId && !globalConsumeActivityId) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏈壘鍒版秷鑰楁椿鍔ㄦ暟鎹紝璺宠繃`, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏嶈垂娲诲姩ID: ${globalFreeActivityId}锛屾秷鑰楁椿鍔↖D: ${globalConsumeActivityId}`, type: "info" });

        // 1. 棰嗗彇鍏嶈垂閬撳叿锛堜粠绗?涓潯鐩殑record鍙杇oodsId锛?        if (globalFreeActivityId) {
          const goodsId = globalFreeGoodsId || Number(String(globalFreeActivityId) + '1');
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 棰嗗彇鍏嶈垂閬撳叿 (goodsId: ${goodsId})...`, type: "info" });
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_commonbuygoods', { goodsId, num: 1 }, batchSettings.defaultCommandTimeout || 5000);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏嶈垂閬撳叿棰嗗彇鎴愬姛`, type: "success" });
          } catch (e) {
            if (e.message?.includes('700010') || e.message?.includes('1100010') || e.message?.includes('already')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏嶈垂閬撳叿宸查鍙栬繃`, type: "info" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏嶈垂閬撳叿棰嗗彇澶辫触: ${e.message}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, DELAY));
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏃犲厤璐归亾鍏锋椿鍔紝璺宠繃`, type: "info" });
        }

        // 2. 棰嗗彇浠诲姟濂栧姳 1-100妗?        let claimedCount = 0;
        let skipCount = 0;
        for (let missionId = 1; missionId <= 100; missionId++) {
          if (shouldStop.value) break;
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimtaskreward', { activityId: globalConsumeActivityId, missionId }, batchSettings.defaultCommandTimeout || 5000);
            claimedCount++;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 棰嗗彇绗?{missionId}妗ｅ鍔辨垚鍔焋, type: "success" });
          } catch (e) {
            if (e.message?.includes('700010') || e.message?.includes('3200010') || e.message?.includes('3200020') || e.message?.includes('-10006')) {
              skipCount++;
              // 浠诲姟鏈揪鎴?妗ｄ綅鏈揪鏍?宸查鍙栨秷鑰楅亾鍏凤紝缁х画涓嬩竴涓?            } else if (e.message?.includes('already') || e.message?.includes('700011')) {
              skipCount++;
              // 宸查鍙栬繃
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 绗?{missionId}妗ｉ鍙栧け璐? ${e.message}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, DELAY));
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 棰嗗彇瀹屾垚: 鎴愬姛${claimedCount}妗ｏ紝璺宠繃${skipCount}妗, type: "success" });

        // 鍒锋柊鏁版嵁
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 娑堣€楁椿鍔ㄩ亾鍏烽鍙栧畬鎴?===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 棰嗗彇娑堣€楁椿鍔ㄩ亾鍏峰け璐? ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("娑堣€楁椿鍔ㄩ亾鍏烽鍙栧畬姣?);
    }
  };

  /**
   * 鎵归噺鎸ラ紦鍔╁▉娑堣€?   * autumn_useitem 鍛戒护锛宨temNum 鏈€澶?000
   * 鍔╁▉涓€娆″悗闇€绛夊緟10鍒嗛挓鍐峰嵈
   * @param {Object|boolean} cheerQtyRef - 鏁伴噺 ref 瀵硅薄锛寁alue=0鏃朵娇鐢ㄥ叏閮ㄦ暟閲忥紝>0鏃朵娇鐢ㄦ寚瀹氭暟閲?   * @param {boolean} isScheduledTask - 鏄惁涓哄畾鏃朵换鍔?   */
  const batchAutumnUseItem = async (cheerQtyRef = null, isScheduledTask = false) => {
    // 鍏煎鏃ц皟鐢細濡傛灉绗竴涓弬鏁版槸 boolean锛屽垯涓?isScheduledTask
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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 寮€濮嬫尌榧撳姪濞佹秷鑰? ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 鑾峰彇鑳屽寘涓姪濞侀亾鍏?ID:5278)鐨勫墿浣欐暟閲?        const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
        const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
        const cheerItemCount = role.items?.[5278]?.quantity || 0;

        if (cheerItemCount <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍔╁▉閬撳叿涓嶈冻锛岃烦杩嘸, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        // 2. 瀹為檯浣跨敤閲忥細杈撳叆0=鍏ㄩ儴锛岃緭鍏?0=鎸囧畾鏁伴噺锛屼笂闄?000
        const useNum = inputQty > 0
          ? Math.min(inputQty, cheerItemCount, 3000)
          : Math.min(cheerItemCount, 3000);
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍔╁▉閬撳叿鍓╀綑 ${cheerItemCount}锛屾湰娆′娇鐢?${useNum}`, type: "info" });

        try {
          const result = await tokenStore.sendMessageWithPromise(tokenId, 'autumn_useitem', { itemNum: useNum }, 10000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鎸ラ紦鍔╁▉娑堣€楁垚鍔?(itemNum: ${useNum})`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('鍐峰嵈') || errMsg.includes('cool') || errMsg.includes('wait')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍔╁▉鍐峰嵈涓紝闇€绛夊緟10鍒嗛挓鍚庨噸璇昤, type: "warning" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鎸ラ紦鍔╁▉娑堣€楀け璐? ${errMsg}`, type: "warning" });
          }
        }

        // 鍒锋柊鏁版嵁
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 鎸ラ紦鍔╁▉娑堣€楀畬鎴?===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鎸ラ紦鍔╁▉娑堣€楀け璐? ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 涓茶澶勭悊锛岄伩鍏嶅璐﹀彿骞跺彂autumn_useitem瀵艰嚧鏈嶅姟鍣ㄥ崱浣?    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;
      await processToken(tokenId);
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
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
      message.success("鎸ラ紦鍔╁▉娑堣€楀畬姣曪紙涓嬫鍔╁▉闇€绛夊緟10鍒嗛挓鍐峰嵈锛?);
    }
  };

  /**
   * 鎵归噺鍏戞崲鐮侀鍙?   * system_claimcdkreward 鍛戒护
   * @param {string} cdkCode - 鍏戞崲鐮?   */
  const batchClaimCdkReward = async (isScheduledTask = false, cdkCode = '') => {
    // 瀹氭椂浠诲姟妯″紡锛氫粠batchSettings璇诲彇CDK
    if (isScheduledTask && !cdkCode) {
      cdkCode = batchSettings.cdkCode || '';
    }
    if (!cdkCode || !cdkCode.trim()) {
      if (!isScheduledTask) message.warning("璇疯緭鍏ュ厬鎹㈢爜");
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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 鍏戞崲鐮侀鍙? ${token.name} (CDK: ${cdkCode}) ===`, type: "info" });
        await ensureConnection(tokenId);

        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'system_claimcdkreward', { key: cdkCode, platformType: 'h5' }, batchSettings.defaultCommandTimeout || 5000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鐮?${cdkCode} 棰嗗彇鎴愬姛`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('宸查鍙?) || errMsg.includes('already') || errMsg.includes('12000')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鐮佸凡棰嗗彇杩嘸, type: "info" });
          } else if (errMsg.includes('鏃犳晥') || errMsg.includes('invalid') || errMsg.includes('涓嶅瓨鍦?)) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鐮佹棤鏁? ${cdkCode}`, type: "warning" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鐮侀鍙栧け璐? ${errMsg}`, type: "warning" });
          }
        }

        // 鍒锋柊鏁版嵁
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 鍏戞崲鐮侀鍙栧畬鎴?===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鐮侀鍙栧け璐? ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success(`鍏戞崲鐮?${cdkCode} 棰嗗彇瀹屾瘯`);
    }
  };

  /**
   * 鎵归噺浣跨敤娑堣€楁椿鍔ㄩ亾鍏?   * item_openpack 鍛戒护锛宨temId: 5279锛屾暟閲? 鍏ㄩ儴
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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 浣跨敤娑堣€楁椿鍔ㄩ亾鍏? ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 鑾峰彇瑙掕壊淇℃伅锛屾煡璇㈤亾鍏锋暟閲?        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        const role = tokenStore.gameData?.roleInfo?.role;
        const quantity = Number(role?.items?.[ACTIVITY_ITEM_ID]?.quantity || 0);

        if (quantity <= 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏃犳秷鑰楁椿鍔ㄩ亾鍏?ID:${ACTIVITY_ITEM_ID})锛岃烦杩嘸, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鎷ユ湁娑堣€楁椿鍔ㄩ亾鍏?x${quantity}锛屽叏閮ㄤ娇鐢╜, type: "info" });

        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            'item_openpack',
            { itemId: ACTIVITY_ITEM_ID, number: quantity, index: 0 },
            batchSettings.battleCommandTimeout || 15000,
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄩ亾鍏?x${quantity} 浣跨敤鎴愬姛`, type: "success" });
        } catch (e) {
          const errMsg = e.message || '';
          if (errMsg.includes('3200020')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄩ亾鍏峰凡棰嗗彇杩嘸, type: "info" });
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閬撳叿浣跨敤澶辫触: ${errMsg}`, type: "warning" });
          }
        }

        // 鍒锋柊鏁版嵁
        try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000); } catch (e) {}
        try { await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, batchSettings.defaultCommandTimeout || 5000); } catch (e) {}
        await new Promise(r => setTimeout(r, _getModuleDelay('default')));

        // 妫€鏌ユ槸鍚﹁揪鏍?        const manager = new ConsumeActivityManager();
        const formatNum = (n) => n == null ? '0' : n >= 10000 ? (n / 10000).toFixed(1) + '涓? : String(n);
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
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 杈炬爣妫€鏌? 鎷涘嫙${formatNum(recruit)}(${recruitOk ? '鉁? : '鉂?}) 瀹濈${formatNum(chestPts)}(${chestOk ? '鉁? : '鉂?}) 閽撻奔${fish}(${fishOk ? '鉁? : '鉂?})`, type: isQualified ? "success" : "warning" });
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏃犳椿鍔ㄦ暟鎹紝璺宠繃杈炬爣妫€鏌, type: "warning" });
        }

        // 杈炬爣鍒欐墽琛屾秷鑰楁椿鍔?        if (isQualified && activityData) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鉁?杈炬爣锛佸紑濮嬫墽琛屾秷鑰楁椿鍔?..`, type: "success" });
          const progressList = manager.calculateProgressList(activityData);
          let roleData = tokenStore.gameData?.roleInfo?.role;

          // 鎷涘嫙锛堝惊鐜垎鎵?+ 姣忔壒鍒锋柊閲嶇畻宸锛岄槻姝㈢敤瓒咃級
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
              if (recruitTotalUsed > 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 宸茶揪婊℃。锛屽仠姝, type: "success" });
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
              if (recruitTotalUsed === 0) addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鎷涘嫙浠や笉瓒筹紙闇€${gap}锛屾湁${available}锛夛紝璺宠繃`, type: "warning" });
              break;
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 宸?{gap}锛屽彲鐢?{available}锛屾湰杞墽琛?{thisRound}`, type: "info" });
            try {
              await _consumeActivityBatchCmd(tokenId, 'hero_recruit', (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }), thisRound, '鎷涘嫙浠や娇鐢?);
              recruitTotalUsed += thisRound;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鏈疆瀹屾垚 x${thisRound}锛堢疮璁?{recruitTotalUsed}锛塦, type: "success" });
            } catch (e) { if (e.message === '鐢ㄦ埛鍋滄') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 澶辫触: ${e.message}`, type: "warning" }); break; }
            try { await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000); await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000); } catch (e) {}
            await new Promise(r => setTimeout(r, 500));
          }
          if (recruitTotalUsed > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [鎷涘嫙] 鍏卞畬鎴?x${recruitTotalUsed}`, type: "success" });
          }

          // 瀹濈寰幆寮€绠?          const chestProgress = progressList.find(p => p.id === 2);
          if (chestProgress && !chestProgress.isCompleted) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 寮€濮嬪惊鐜紑绠盽, type: "info" });
            try {
              const result = await _consumeActivityChestLoop(tokenId, roleData, progressList, manager, getMaxTarget, formatNum);
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 瀹屾垚: ${result.rounds}杞紝寮€${result.totalOpened}涓紝${formatNum(result.totalPoints)}鍒哷, type: "success" });
            } catch (e) { if (e.message === '鐢ㄦ埛鍋滄') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [瀹濈] 澶辫触: ${e.message}`, type: "warning" }); }
          }

          // 閽撻奔
          const fishProgress = progressList.find(p => p.id === 3);
          if (fishProgress && !fishProgress.isCompleted) {
            const fishTarget = 1250;
            const gap = Math.max(0, fishTarget - fishProgress.current);
            if (gap > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 杩橀渶${gap}`, type: "info" });
              try { await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, 5000); } catch (e) {}
              await new Promise(r => setTimeout(r, 500));
              const freshRole = tokenStore.gameData?.roleInfo?.role || roleData;
              const rodCount = freshRole?.items?.[1012]?.quantity || 0;
              const fishCount = Math.min(gap, rodCount);
              if (fishCount > 0) {
                try {
                  await _consumeActivityBatchCmd(tokenId, 'artifact_lottery', (qty) => ({ type: 2, lotteryNumber: qty, newFree: true }), fishCount, '榛勯噾楸肩浣跨敤');
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 瀹屾垚 x${fishCount}`, type: "success" });
                } catch (e) { if (e.message === '鐢ㄦ埛鍋滄') throw e; addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 澶辫触: ${e.message}`, type: "warning" }); }
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} [閽撻奔] 榛勯噾楸肩涓嶈冻锛堥渶${gap}锛屾湁${rodCount}锛夛紝璺宠繃`, type: "warning" });
              }
            }
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄦ墽琛屽畬鎴恅, type: "success" });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 娑堣€楁椿鍔ㄩ亾鍏蜂娇鐢ㄥ畬鎴?===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 娑堣€楁椿鍔ㄩ亾鍏蜂娇鐢ㄥけ璐? ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    await runStreaming(selectedTokens.value, processToken);

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processToken);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    if (!isScheduledTask) {
      message.success("娑堣€楁椿鍔ㄩ亾鍏蜂娇鐢ㄥ畬姣?);
    }
  };

  /**
   * 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楀閫夎喘涔?+ 棰嗗彇閲岀▼纰戣繘搴﹀鍔?   * activity_exchange 璐拱鍟嗗搧
   * activity_claimmilestone 棰嗗彇杩涘害濂栧姳
   * @param {Array} selectedGoods - 閫変腑鐨勫晢鍝佸悗缂€ID鍒楄〃 [1, 2, 3, ...]
   * @param {Object} buyCounts - 姣忎釜鍟嗗搧鐨勮喘涔版鏁?{ 1: 1, 2: 1, 10: 30 }
   */
  const batchActivityExchange = async (selectedGoods = [], buyCounts = {}, isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) return;
    if (selectedGoods.length === 0) {
      message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }

    isRunning.value = true;
    shouldStop.value = false;

    const DELAY = _getModuleDelay('default');

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 鍟嗗搧瀹氫箟锛堝悗缂€ + 闄愯喘鏁伴噺 + 鍚嶇О锛?    const GOODS_MAP = {
      1:  { name: '鎯婇浄', maxCount: 1 },
      2:  { name: '鏈堝崕', maxCount: 1 },
      3:  { name: '鍥炲搷', maxCount: 1 },
      4:  { name: '鐞村績鍏?, maxCount: 1 },
      5:  { name: '鐞村績姣?, maxCount: 1 },
      6:  { name: '鐠囩帒', maxCount: 1 },
      7:  { name: '鍓戣儐鍏?, maxCount: 1 },
      8:  { name: '鍓戣儐姣?, maxCount: 1 },
      9:  { name: '闃靛缂栫粍', maxCount: 1 },
      10: { name: '鐝嶇彔', maxCount: 30 },
      11: { name: '涓囪兘绾㈠皢纰庣墖', maxCount: 200 },
      12: { name: '闅忔満绾㈠皢纰庣墖', maxCount: 200 },
      13: { name: '鐧界帀', maxCount: 999 },
      14: { name: '绮鹃搧', maxCount: 999 },
    };

    // 鍏ㄥ眬娲诲姩ID锛堜粎棣栦釜token鑾峰彇涓€娆★紝鍚庣画澶嶇敤锛?    let globalExchangeActivityId = null; // 鍏戞崲鍟嗗簵 activityId (entries[2] 绗笁涓綅缃?
    let globalMilestoneActivityId = null; // 閲岀▼纰戣繘搴﹀鍔?activityId
    let activityFetched = false;

    const processToken = async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      currentRunningTokenId.value = tokenId;

      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 寮€濮嬫秷鑰楁椿鍔ㄥ厬鎹㈣喘涔? ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 鑾峰彇娲诲姩鏁版嵁锛堜粎棣栦釜璐﹀彿鑾峰彇锛屽悗缁鐢級
        if (!activityFetched) {
          try {
            const actRes = await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
            const body = actRes?.body || actRes;
            const activityInfo = body?.activity?.commonActivityInfo || body?.commonActivityInfo || body;

            if (activityInfo) {
              const entries = Object.entries(activityInfo);
              // 绗?涓綅缃?(entries[2]) - 鍏戞崲鍟嗗簵
              if (entries.length >= 3) {
                globalExchangeActivityId = Number(entries[2][0]);
              }
              // 绗?涓綅缃?(entries[4]) - 閲岀▼纰戣繘搴﹀鍔?              if (entries.length >= 5) {
                globalMilestoneActivityId = Number(entries[4][0]);
              }
              // 濡傛灉鍙湁4涓潯鐩紝閲岀▼纰慖D鍙兘涓?entries[2] + 2
              if (!globalMilestoneActivityId && globalExchangeActivityId) {
                globalMilestoneActivityId = globalExchangeActivityId + 2;
              }
            }
          } catch (e) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鑾峰彇娲诲姩鏁版嵁澶辫触: ${e.message}`, type: "warning" });
          }
          activityFetched = true;
        }

        if (!globalExchangeActivityId) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏈壘鍒板厬鎹㈠晢搴楁椿鍔↖D锛岃烦杩嘸, type: "warning" });
          tokenStatus.value[tokenId] = "completed";
          return;
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲鍟嗗簵ID: ${globalExchangeActivityId}锛岄噷绋嬬ID: ${globalMilestoneActivityId}`, type: "info" });

        // 2. 閫愪釜璐拱閫変腑鐨勫晢鍝?        let successCount = 0;
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
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 璐拱 ${goods.name} x${quantity} 鎴愬姛`, type: "success" });
            successCount++;
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('400180') || errMsg.includes('宸茶喘涔?) || errMsg.includes('闄愯喘')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 璐拱 ${goods.name}: 宸茶揪闄愯喘涓婇檺`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 璐拱 ${goods.name} 澶辫触: ${errMsg}`, type: "warning" });
            }
            failCount++;
          }

          await new Promise(r => setTimeout(r, DELAY));
        }

        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲璐拱瀹屾垚: 鎴愬姛${successCount}锛屽け璐?{failCount}`, type: successCount > 0 ? "success" : "warning" });

        // 3. 棰嗗彇閲岀▼纰戣繘搴﹀鍔?        if (globalMilestoneActivityId) {
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimmilestone', {
              activityId: globalMilestoneActivityId,
            }, batchSettings.defaultCommandTimeout || 5000);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲岀▼纰戣繘搴﹀鍔遍鍙栨垚鍔焋, type: "success" });
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('鏃犲彲棰嗗彇') || errMsg.includes('鏈揪鏍?) || errMsg.includes('700010')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲岀▼纰戣繘搴﹀鍔? 鏆傛棤鍙鍙栧鍔盽, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲岀▼纰戣繘搴﹀鍔卞け璐? ${errMsg}`, type: "warning" });
            }
          }
        }

        // 鍒锋柊鏁版嵁
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, batchSettings.defaultCommandTimeout || 5000);
        } catch (e) {}

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 鍏戞崲璐拱瀹屾垚 ===`, type: "success" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鍏戞崲璐拱澶辫触: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 涓茶澶勭悊
    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;
      await processToken(tokenId);
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
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
      message.success("娑堣€楁椿鍔ㄥ厬鎹㈣喘涔板畬姣?);
    }
  };

  // ====== 绔炴妧澶у巺閬撳叿棰嗗彇 ======
  const APEX_REWARDS = [
    { confId: 1, name: '绱鑳滃嚭1鍦洪€愰箍鐩愬北 鐩愬北閲戝竵x10' },
    { confId: 2, name: '绱鑳滃嚭2鍦洪€愰箍鐩愬北 鐩愬北閲戝竵x15' },
    { confId: 3, name: '绱鑳滃嚭31鍦洪€愰箍鐩愬北 鐩愬北閲戝竵x13' },
    { confId: 4, name: '鍛ㄦ椿璺冨害杈惧埌50 鍔╁▉榧撴x5' },
    { confId: 5, name: '鍛ㄦ椿璺冨害杈惧埌100 鍔╁▉榧撴x10' },
    { confId: 6, name: '鍙備笌1娆＄洂鍦?鍔╁▉榧撴x15' },
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
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 寮€濮嬮鍙栫珵鎶€澶у巺閬撳叿: ${token.name} ===`, type: "info" });
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
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鉁?${reward.name}`, type: "success" });
            claimedCount++;
          } catch (e) {
            const errMsg = e.message || '';
            if (errMsg.includes('7100140') || errMsg.includes('闄愭祦')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 闄愭祦涓紝鍋滄棰嗗彇`, type: "warning" });
              break;
            }
            if (errMsg.includes('200020')) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${reward.name}: 鏈揪鏍囷紝鏃犳硶棰嗗彇`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${reward.name}: ${errMsg}`, type: "warning" });
            }
          }
          await new Promise(r => setTimeout(r, _getModuleDelay('default')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 绔炴妧澶у巺棰嗗彇瀹屾瘯 (${claimedCount}/${APEX_REWARDS.length}) ===`, type: claimedCount > 0 ? "success" : "info" });
      } catch (e) {
        if (e.message === '鐢ㄦ埛鍋滄') {
          tokenStatus.value[tokenId] = "stopped";
          return;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 棰嗗彇绔炴妧澶у巺閬撳叿澶辫触: ${e.message}`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
        currentRunningTokenId.value = null;
      }
    };

    // 涓茶澶勭悊
    for (const tokenId of selectedTokens.value) {
      if (shouldStop.value) break;
      await processToken(tokenId);
    }

    // 鎵归噺閲嶈瘯澶辫触璐﹀彿
    const retryMax = batchSettings.defaultRetryCount || 2;
    const retryWait = batchSettings.retryDelay || 60000;
    let failed = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed");
    for (let r = 0; r < retryMax && failed.length > 0; r++) {
      if (shouldStop.value) break;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
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
      message.success("绔炴妧澶у巺閬撳叿棰嗗彇瀹屾瘯");
    }
  };

  /**
   * 鎵归噺姗辩獥鍜稿皢婵€娲伙紙collection_activate锛?   * 鍏堣皟鐢?collection_getinfo 鑾峰彇鍥鹃壌鏁版嵁锛?   * 鏍规嵁 activateNum/canActivateNum 绮惧噯绛涢€?宸叉嫢鏈変絾鏈縺娲?鐨勯亾鍏凤紝鍐嶉€愪釜婵€娲?   */
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
          message: `=== 寮€濮嬫┍绐楀捀灏嗘縺娲? ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // ===== 绗竴姝ワ細鏌ヨ鍥鹃壌鏁版嵁 =====
        let collectionData;
        try {
          collectionData = await tokenStore.sendMessageWithPromise(
            tokenId, "collection_getinfo", {},
            batchSettings.defaultCommandTimeout || 8000,
          );
        } catch (err) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鑾峰彇鍥鹃壌鏁版嵁澶辫触: ${err.message}锛岃烦杩嘸,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
          return;
        }

        // ===== 绗簩姝ワ細瑙ｆ瀽 heroSeries锛岀瓫閫夊彲婵€娲婚亾鍏?=====
        const heroSeries = collectionData?.heroSeries || collectionData?.collection?.heroSeries;
        if (!heroSeries) {
          const topKeys = collectionData ? Object.keys(collectionData) : ['null'];
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鍥鹃壌鏁版嵁鏃?heroSeries 瀛楁锛堥《灞俴eys: ${topKeys.join(',')}锛夛紝璺宠繃`,
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
            const isActivated = itemData?.activateNum || 0;   // 1=宸叉縺娲?            const canActivate = itemData?.canActivateNum || 0; // 1=鍙縺娲?
            if (isActivated === 1) {
              alreadyActivated++;
              continue; // 宸叉縺娲伙紝璺宠繃
            }
            if (canActivate === 1) {
              // 鏌ユ壘 SKIN_DICT 鑾峰彇鍚嶇О
              const skinInfo = SKIN_DICT[itemId];
              toActivate.push({
                poolType: 2,                        // poolType 鍥哄畾涓?2锛堢弽瀹濋榿绯荤粺锛?                id: Number(itemId),
                seriesId: Number(seriesKey),         // heroSeries key = seriesId
                name: skinInfo?.name || `閬撳叿#${itemId}`,
              });
            }
            // canActivate === 0: 鏈嫢鏈夋垨涓嶅彲婵€娲伙紝璺宠繃
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 鍥鹃壌缁熻锛氭€?{totalItems}涓紝宸叉縺娲?{alreadyActivated}涓紝鍙縺娲?{toActivate.length}涓猔,
          type: "info",
        });

        // ===== 绗笁姝ワ細閫愪釜婵€娲?=====
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
              message: `${token.name} 婵€娲绘垚鍔? ${item.name} (poolType=${item.poolType})`,
              type: "success",
            });
          } catch (err) {
            const errMsg = err.message || '';
            // 璁板綍鎵€鏈夊け璐ユ棩蹇楋紝鍖呭惈璇锋眰鍙傛暟鏂逛究鎺掓煡
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 婵€娲?${item.name} 澶辫触: ${errMsg} (poolType=${item.poolType}, id=${item.id}, seriesId=${item.seriesId})`,
              type: "warning",
            });
            skipCount++;
          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        // ===== 绗洓姝ワ細寰幆棰嗗彇鍥鹃壌绉垎 =====
        let claimTotalCount = 0;
        while (!shouldStop.value) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "collection_claimtotal", {}, batchSettings.defaultCommandTimeout || 5000,
            );
            claimTotalCount++;
          } catch (err) {
            break; // 鏃犲彲棰嗗彇锛屽仠姝?          }
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }
        if (claimTotalCount > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鍥鹃壌绉垎棰嗗彇鎴愬姛 脳${claimTotalCount}娆,
            type: "success",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 姗辩獥鍜稿皢婵€娲诲畬鎴愶紙鍙縺娲?{toActivate.length}涓紝鎴愬姛${successCount}涓紝璺宠繃${skipCount}涓級===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 姗辩獥鍜稿皢婵€娲诲け璐? ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`,
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
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${retryWait/1000}绉掑悗閲嶈瘯 ${failed.length} 涓け璐ヨ处鍙凤紙绗?{r+1}/${retryMax}杞級`, type: "info" });
      await new Promise(r2 => setTimeout(r2, retryWait));
      const cur = [...failed]; failed = [];
      await runStreaming(cur, processActivate);
      cur.forEach(id => { if (tokenStatus.value[id] === "failed") failed.push(id); });
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("鎵归噺姗辩獥鍜稿皢婵€娲荤粨鏉?);
  };

  // ========== 鎵归噺鎺ㄥ浘锛堜娇鐢ㄥ叡浜帹鍥炬ā鍧楋級 ==========
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
  
  // 鏆撮湶缁欐ā鎬佹鍜孴okenCard浣跨敤
  window._bpPushLoop = _bpPushLoop;
  window._bpStartOne = _bpStartOne;
  window._bpStopOne = _bpStopOne;
  window._bpLoadBossData = _bpLoadBossData;
  window._getBoss = _getBoss;
  window._bpSleep = _bpSleep;
  window._bpUseTorch = _bpUseTorch;

  // 绠€鍖栵細鍙墦寮€妯℃€佹锛屽疄闄呮帹鍥鹃€昏緫鐢辨ā鎬佹鎺у埗
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
