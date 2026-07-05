/**
 * 绔炴妧鍦恒€佽ˉ榻愮被浠诲姟
 * 鍖呭惈: batcharenafight, batchTopUpFish, batchTopUpArena
 */

import { ARENA_TARGET, FISH_TARGET } from "./constants.js";

/**
 * 鏍煎紡鍖栨垬鍔涘€间负澶ф暟瀛楁牸寮?(渚嬪: 11128873547 -> 111.29浜?
 * @param {number} power - 鎴樺姏鍊? * @returns {string} - 鏍煎紡鍖栧悗鐨勫瓧绗︿覆
 */
const formatPower = (power) => {
  if (!power || power === 0)
    return "0";

  const num = Number(power);

  if (num >= 100000000) { // 浜?    return `${(num / 100000000).toFixed(2)}浜縛;
  } else if (num >= 10000) { // 涓?    return `${(num / 10000).toFixed(2)}涓嘸;
  }

  return num.toString();
};

/**
 * 鍒涘缓绔炴妧鍦恒€佽ˉ榻愮被浠诲姟鎵ц鍣? * @param {object} deps - 渚濊禆椤? * @returns {object} 浠诲姟鍑芥暟闆嗗悎
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
    loadSettings,
  } = deps;

  /**
   * 鎵ц鍗曟绔炴妧鍦烘垬鏂?   */
  const executeArenaFight = async (tokenId, tokenName, playerInfo, delayConfig) => {
    // 鉁?浣跨敤鐢ㄦ埛閰嶇疆
    const commandTimeout = batchSettings.defaultCommandTimeout || 5000;
    const battleTimeout = batchSettings.battleCommandTimeout || 8000;

    // 寮€鍚珵鎶€鍦?    await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, commandTimeout);

    // 鑾峰彇鐩爣
    const targets = await tokenStore.sendMessageWithPromise(
      tokenId,
      "arena_getareatarget",
      {},
      commandTimeout,
    );

    if (!targets) {
      return { success: false, error: "鐩爣鏁版嵁涓虹┖", errorCode: null };
    }

    // 鏅鸿兘閫夋嫨鐩爣
    const targetResult = pickArenaTargetId(targets, playerInfo);
    if (!targetResult || !targetResult.targetId) {
      return { success: false, error: "鏈壘鍒板彲鐢ㄧ洰鏍?, errorCode: null };
    }

    // 鎵ц鎴樻枟
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startareaarena",
      { targetId: targetResult.targetId },
      battleTimeout,
    );

    await new Promise((r) => setTimeout(r, delayConfig.battle));

    return { success: true, error: null, errorCode: null };
  };

  /**
   * 鑾峰彇鐜╁绔炴妧鍦轰俊鎭?   */
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
      console.warn("[绔炴妧鍦篯 鑾峰彇鎺掑悕澶辫触:", err.message);
    }

    return {
      rank: playerRank,
      power: roleInfo.power || roleInfo.fightPower || 0,
    };
  };

  /**
   * 閲嶈瘯绔炴妧鍦烘垬鏂楋紙閫氱敤閫昏緫锛?   */
  const retryArenaFight = async (retryInfo, retryCount, maxRetries, errorTypes, waitTime) => {
    const { tokenId, tokenName, fightIndex, totalFights, originalFormation, isSwitched, tokenSettings } = retryInfo;
    const token = tokens.value.find((t) => t.id === tokenId);

    // 灏嗛敊璇被鍨嬪瓧绗︿覆杞崲涓烘暟缁?    const errorTypeArray = errorTypes.split("|");

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 閲嶈瘯 ${tokenName} (绗?{retryCount + 1}杞? ===`,
        type: "info",
      });

      tokenStatus.value[tokenId] = "retrying";
      await ensureConnection(tokenId);

      // 妫€鏌ラ棬绁?      let role = tokenStore.gameData?.roleInfo?.role;
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
          message: `${tokenName} 鍜哥闂ㄧエ涓嶈冻锛岃烦杩囬噸璇昤,
          type: "warning",
        });
        return { success: false, reason: "闂ㄧエ涓嶈冻" };
      }

      // 鍒囨崲闃靛锛堝鏋滈渶瑕侊級
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
            message: `${tokenName} 鎴愬姛鍒囨崲鍒伴樀瀹?{tokenSettings.arenaFormation}`,
            type: "info",
          });
        } catch (err) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 鍒囨崲闃靛澶辫触: ${err.message}`,
            type: "warning",
          });
        }
      }

      // 鎵ц鍓╀綑鎴樻枟
      const remainingFights = totalFights - fightIndex + 1;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${tokenName} 浠庣 ${fightIndex} 娆℃垬鏂楃户缁紝鍓╀綑 ${remainingFights} 娆,
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
              message: `${tokenName} 閲嶈瘯绔炴妧鍦烘垬鏂?${i + 1}/${totalFights}`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 閲嶈瘯鎴樻枟${i + 1} - ${result.error}`,
              type: "warning",
            });
            hasError = true;
            break;
          }
        } catch (e) {
          const errorMsg = e.message || "鏈煡閿欒";

          // 妫€鏌ユ槸鍚︽槸浠讳綍鐩爣閿欒绫诲瀷
          const isTargetError = errorTypeArray.some((type) => errorMsg.includes(type));

          if (isTargetError) {
            hasError = true;
            const matchedType = errorTypeArray.find((type) => errorMsg.includes(type));
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 閲嶈瘯鎴樻枟${i + 1} - 鍐嶆鍑虹幇${matchedType}閿欒`,
              type: "warning",
            });
            break;
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 閲嶈瘯鎴樻枟${i + 1} - 鍑虹幇鍏朵粬閿欒: ${errorMsg}`,
              type: "error",
            });
            hasError = true;
            break;
          }
        }
      }

      // 鎭㈠鍘熼樀瀹?      if (isSwitched && originalFormation) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "presetteam_saveteam",
            { teamId: originalFormation },
            3000,
          );
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 宸叉仮澶嶅師闃靛${originalFormation}`,
            type: "success",
          });
        } catch (restoreErr) {
          const restoreErrorMsg = restoreErr.message || "";
          if (!restoreErrorMsg.includes("200020")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${tokenName} 鎭㈠闃靛澶辫触: ${restoreErr.message}`,
              type: "warning",
            });
          }
        }
      }

      return { success: !hasError, reason: hasError ? errorType : "success" };
    } catch (error) {
      console.error("閲嶈瘯澶辫触:", error);
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
   * 澶勭悊鎵归噺閲嶈瘯閫昏緫
   */
  const handleBatchRetry = async (retryTokens, maxRetries, errorType, waitTime, errorLabel) => {
    if (retryTokens.length === 0)
      return;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 鍙戠幇 ${retryTokens.length} 涓处鍙峰嚭鐜?{errorLabel}閿欒锛岀瓑寰?{waitTime / 1000}绉掑悗寮€濮嬮噸璇?===`,
      type: "info",
    });

    await new Promise((resolve) => setTimeout(resolve, waitTime));

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      if (shouldStop.value || retryTokens.length === 0)
        break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n--- 绗?${retryCount + 1} 杞噸璇?(${retryTokens.length} 涓处鍙? ---`,
        type: "info",
      });

      const failedTokens = [];

      for (const retryInfo of retryTokens) {
        if (shouldStop.value)
          break;

        const result = await retryArenaFight(retryInfo, retryCount, maxRetries, errorType, waitTime);

        if (!result.success) {
          failedTokens.push(retryInfo);
          tokenStatus.value[retryInfo.tokenId] = result.reason === "闂ㄧエ涓嶈冻" ? "completed" : "waiting_retry";
        } else {
          tokenStatus.value[retryInfo.tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${retryInfo.tokenName} 閲嶈瘯鎴愬姛 ===`,
            type: "success",
          });
        }
      }

      retryTokens.length = 0;
      retryTokens.push(...failedTokens);

      if (failedTokens.length > 0 && retryCount < maxRetries - 1) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${failedTokens.length} 涓处鍙烽噸璇曞け璐ワ紝绛夊緟${waitTime / 1000}绉掑悗杩涜涓嬩竴杞噸璇昤,
          type: "warning",
        });
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // 鏈€缁堢粺璁?    const successCount = selectedTokens.value.length - retryTokens.length;
    const failedCount = retryTokens.length;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== ${errorLabel}閿欒閲嶈瘯瀹屾垚 ===`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `閲嶈瘯鎴愬姛: ${successCount} 涓猔,
      type: "success",
    });
    if (failedCount > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `閲嶈瘯澶辫触: ${failedCount} 涓?(閲嶈瘯${maxRetries}娆″悗浠嶅嚭鐜?{errorLabel}閿欒)`,
        type: "error",
      });
      const failedNames = retryTokens.map((t) => t.tokenName).join(", ");
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `澶辫触璐﹀彿: ${failedNames}`,
        type: "error",
      });
    }
  };

  /**
   * 涓€閿珵鎶€鍦烘垬鏂?娆?   */
  const batcharenafight = async () => {
    if (selectedTokens.value.length === 0)
      return;

    try {
      isRunning.value = true;
      shouldStop.value = false;

      const retry400340Tokens = [];
      const retry200750Tokens = [];
      const retry11800010Tokens = []; // 11800010鏈煡閿欒閲嶈瘯
      const retryTargetTokens = []; // 鑾峰彇鐩爣瓒呮椂鎴栨湭鎵惧埌鐩爣鐨勮处鍙?      const maxRetries = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2; // 浣跨敤璁剧疆鐨勯噸璇曟鏁?      const retryWaitTime = batchSettings.retryDelay || 60000; // 浣跨敤璁剧疆鐨勯噸璇曞欢杩?
      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      // 鎸夊苟鍙戞暟閲忓垎鎵规墽琛?      const batchSize = batchSettings.maxActive || 10;
      const batches = [];

      for (let i = 0; i < selectedTokens.value.length; i += batchSize) {
        batches.push(selectedTokens.value.slice(i, i + batchSize));
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 寮€濮嬫壒閲忕珵鎶€鍦烘垬鏂楋紝鍏?${selectedTokens.value.length} 涓处鍙凤紝鍒?${batches.length} 鎵规墽琛岋紙姣忔壒${batchSize}涓級 ===`,
        type: "info",
      });

      // 閫愭壒鎵ц
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        if (batchIndex > 0) {
        // 浣跨敤閰嶇疆鐨勬壒娆￠棿闅旂瓑寰呮椂闂?          const batchWaitTime = batchSettings.batchIntervalWait || 0;
          if (batchWaitTime > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `\n=== 绛夊緟${batchWaitTime}绉掑悗鎵ц绗?${batchIndex + 1}/${batches.length} 鎵?===`,
              type: "info",
            });
            await new Promise((r) => setTimeout(r, batchWaitTime * 1000));
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `\n=== 鎵ц绗?${batchIndex + 1}/${batches.length} 鎵?(${batch.length} 涓处鍙? ===`,
            type: "info",
          });
        }

        const taskPromises = batch.map(async (tokenId) => {
          if (shouldStop.value)
            return;
          tokenStatus.value[tokenId] = "running";
          const token = tokens.value.find((t) => t.id === tokenId);
          // 鍔犺浇璇oken鐨勭嫭绔嬮厤缃紝濡傛灉鏈壘鍒板垯鍥為€€鍒癱urrentSettings(铏界劧鍙兘涓嶅噯纭紝浣嗕綔涓烘渶鍚庣殑鍏滃簳)
          const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

          // 鍦╰ry鍧楀閮ㄥ０鏄庡彉閲忥紝纭繚finally鍧楀彲浠ヨ闂?          let originalFormation = null; // 淇濆瓨鍘熷闃靛
          let currentFormation = null; // 褰撳墠闃靛
          let isSwitched = false; // 鏄惁鍒囨崲杩囬樀瀹?
          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 寮€濮嬩竴閿珵鎶€鍦烘垬鏂? ${token.name} ===`,
              type: "info",
            });
            await ensureConnection(tokenId);
            if (shouldStop.value)
              return;

            // 妫€鏌ュ捀绁為棬绁?(ID: 1007)
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
              message: `${token.name} 褰撳墠鍜哥闂ㄧエ: ${ticketCount}`,
              type: "info",
            });

            if (ticketCount <= 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 鍜哥闂ㄧエ涓嶈冻锛屾棤娉曡繘琛岀珵鎶€鍦烘垬鏂梎,
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
                message: `闃靛淇℃伅寮傚父: ${JSON.stringify(teamInfo)}`,
                type: "warning",
              });
            }

            originalFormation = teamInfo?.presetTeamInfo?.useTeamId;
            currentFormation = originalFormation;

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 鍘熷闃靛: ${originalFormation}`,
              type: "info",
            });

            if (originalFormation === tokenSettings.arenaFormation) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `褰撳墠宸叉槸闃靛${tokenSettings.arenaFormation}锛屾棤闇€鍒囨崲`,
                type: "info",
              });
            } else {
              await tokenStore.sendMessageWithPromise(
