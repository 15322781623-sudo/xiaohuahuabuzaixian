/**
 * 俱乐部类任务
 * 包含: 俱乐部签到、俱乐部捐献、赛车研究、车队任务等俱乐部相关功能
 */
import { CarresearchItem } from "./constants.js";
import { XyzwLegionWarWebSocketClient } from "@/utils/xyzwLegionWarWebSocket.js";
import { LINEUP_RULES } from "@/utils/HeroList.js";

// ===== 营地挑战常量 =====
// 统帅节点（基础分8）：3、13、23
const CAMP_COMMANDER_NODES = [3, 13, 23];
// 骁将节点（基础分5）：2、4、8、12、14、18、22、24、28
const CAMP_GENERAL_NODES = [2, 4, 8, 12, 14, 18, 22, 24, 28];
// 每个区域(上/中/下)10个节点，节点1-10=上区, 11-20=中区, 21-30=下区
const campNodeRegion = (node) => Math.floor((node - 1) / 10); // 0=上 1=中 2=下
const campNodeRole = (node) =>
  CAMP_COMMANDER_NODES.includes(node)
    ? "commander"
    : CAMP_GENERAL_NODES.includes(node)
      ? "general"
      : "vanguard";
const campRoleLabel = (role) =>
  role === "commander" ? "统帅" : role === "general" ? "骁将" : "先锋";
const campBaseScore = (node) =>
  CAMP_COMMANDER_NODES.includes(node) ? 8 : CAMP_GENERAL_NODES.includes(node) ? 5 : 1;
// 难度：胜场(challengeCnt-failCnt) 0~2普通(+0) 3困难(+1) 4炼狱(+2) 5已击倒
const campDiffBonus = (wins) => (wins === 4 ? 2 : wins === 3 ? 1 : 0);
const campDiffLabel = (wins) =>
  wins >= 5 ? "已击倒" : wins === 4 ? "炼狱" : wins === 3 ? "困难" : "普通";

export const CAMP_SETTINGS_KEY = "camp-challenge-settings";
export const DEFAULT_CAMP_CHALLENGE_SETTINGS = {
  strategy: "clearArea", // clearArea清空区域优先 | rewardFirst挑战奖励优先 | airdropOnly仅空投
  targetFilter: "none", // none无限制 | commanderGeneral仅统帅骁将 | hardHell仅困难炼狱 | both两者
  excludeLineups: [], // 排除阵容（LINEUP_RULES 的 name）
  cowardEnabled: true, // 畏首畏尾总开关：关闭后不因对手过强而退缩
  powerRatio: 1.0, // 对手战力是自己 N 倍时退缩（0.8~2.0）
  quenchRatio: 1.0, // 对手总红淬炼是自己 N 倍时退缩（0.8~2.0）
  formation: "arena", // arena竞技场阵容 | current不切换
  behavior: "airdrop", // airdrop无失败余地转空投 | pause暂停 | useAll次数直接用完
  maxConsecutiveFail: 3, // 同一对手连续失败上限 1~10
};
// 对手阵容缓存：同俱乐部共享（按对手俱乐部id/自身俱乐部id+角色id+日期），有效期1天
export const CAMP_TARGET_CACHE_KEY = "camp-target-team-cache";
const CAMP_TARGET_CACHE_TTL = 24 * 60 * 60 * 1000; // 1天
const clampNum = (v, min, max, dft) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dft;
  return Math.min(max, Math.max(min, n));
};
const loadCampSettings = () => {
  try {
    const raw = localStorage.getItem(CAMP_SETTINGS_KEY);
    const s = { ...DEFAULT_CAMP_CHALLENGE_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    s.cowardEnabled = s.cowardEnabled !== false;
    s.powerRatio = clampNum(s.powerRatio, 0.8, 2.0, 1.0);
    s.quenchRatio = clampNum(s.quenchRatio, 0.8, 2.0, 1.0);
    s.maxConsecutiveFail = Math.round(clampNum(s.maxConsecutiveFail, 1, 10, 3));
    if (!Array.isArray(s.excludeLineups)) s.excludeLineups = [];
    return s;
  } catch (e) {
    return { ...DEFAULT_CAMP_CHALLENGE_SETTINGS };
  }
};
export const loadCampChallengeSettings = () => loadCampSettings();
export const saveCampChallengeSettings = (settings) => {
  try {
    const s = { ...loadCampSettings(), ...(settings || {}) };
    s.cowardEnabled = s.cowardEnabled !== false;
    s.powerRatio = clampNum(s.powerRatio, 0.8, 2.0, 1.0);
    s.quenchRatio = clampNum(s.quenchRatio, 0.8, 2.0, 1.0);
    s.maxConsecutiveFail = Math.round(clampNum(s.maxConsecutiveFail, 1, 10, 3));
    if (!Array.isArray(s.excludeLineups)) s.excludeLineups = [];
    localStorage.setItem(CAMP_SETTINGS_KEY, JSON.stringify(s));
    return s;
  } catch (e) {
    return { ...DEFAULT_CAMP_CHALLENGE_SETTINGS };
  }
};
const loadTargetCache = () => {
  try {
    const raw = localStorage.getItem(CAMP_TARGET_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};
const saveTargetCache = (obj) => {
  try {
    localStorage.setItem(CAMP_TARGET_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // 存储空间不足时忽略缓存
  }
};

const fmtPower = (n) => {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return String(n);
};

function connectWarWS(tokenStr, sid, battlefieldId, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url =
      `wss://xxz-xyzw-new.hortorgames.com/agent?p=${encodeURIComponent(tokenStr)}` +
      `&e=x&sid2=${sid}&lang=chinese&sid2=${sid}`;
    const client = new XyzwLegionWarWebSocketClient({
      url,
      utils: null,
      hint: battlefieldId,
      heartbeatMs: 5000,
    });
    const timer = setTimeout(() => {
      try { client.disconnect(); } catch (_) {}
      reject(new Error(`战场WS连接超时(${timeoutMs}ms)`));
    }, timeoutMs);
    client.onConnect = () => {
      clearTimeout(timer);
      resolve(client);
    };
    client.onError = (err) => {
      clearTimeout(timer);
      try { client.disconnect(); } catch (_) {}
      reject(err || new Error("战场WS连接错误"));
    };
    client.onDisconnect = () => {
      clearTimeout(timer);
      reject(new Error("战场WS连接断开"));
    };
    client.init();
  });
}

export function createTasksClub(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    isConnectionManaged = { value: false },
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
    normalizeCars,
    gradeLabel,
    shouldSendCar,
    canClaim,
    delayConfig,
    currentSettings,
    loadSettings,
  } = deps;

  /**
   * 俱乐部签到
   */
  const batchclubsign = async () => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始俱乐部签到: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId, tokens.value);
        if (shouldStop.value) return;
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_signin",
          {},
          5000,
        );
        await new Promise((r) => setTimeout(r, 500));
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 俱乐部签到已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 俱乐部签到失败: ${error.message || "未知错误"}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量俱乐部签到结束");
  };

  /**
   * 智能发车
   */
  const batchSmartSendCar = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
        tokenStatus.value[tokenId] = "running";

        const token = tokens.value.find((t) => t.id === tokenId);
        
        const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始智能发车: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId, tokens.value);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 发车前自动执行一键收车...`,
            type: "info",
          });
          const claimRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "car_getrolecar",
            {},
            10000,
          );
          let claimCarList = normalizeCars(claimRes?.body ?? claimRes);
          let refreshlevel = claimRes?.roleCar?.research?.[1] || 0;
          let claimedCount = 0;

          for (const car of claimCarList) {
            if (shouldStop.value) break;
            if (canClaim(car)) {
              await new Promise((r) => setTimeout(r, 200));
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_claim",
                  { carId: String(car.id) },
                  10000,
                );
                claimedCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 收车成功: ${gradeLabel(car.color)}`,
                  type: "success",
                });

                if (tokenSettings?.upgradeCar !== false) {
                const roleRes = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "role_getroleinfo",
                  {},
                  5000,
                );
                let refreshpieces = Number(
                  roleRes?.role?.items?.[35009]?.quantity || 0,
                );
                while (
                  refreshlevel < CarresearchItem.length &&
                  refreshpieces >= CarresearchItem[refreshlevel] &&
                  !shouldStop.value
                ) {
                  try {
                    await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "car_research",
                      { researchId: 1 },
                      5000,
                    );
                    refreshlevel++;
                    const updatedRoleRes = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "role_getroleinfo",
                      {},
                      5000,
                    );
                    refreshpieces = Number(
                      updatedRoleRes?.role?.items?.[35009]?.quantity || 0,
                    );
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 执行车辆改装升级，当前等级: ${refreshlevel}`,
                      type: "success",
                    });
                    await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
                    await new Promise((r) => setTimeout(r, 1400));
                  } catch (e) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 车辆改装升级失败: ${e.message}`,
                      type: "error",
                    });
                    break;
                  }
                }

                try {
                  const rewardRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_claimpartconsumereward",
                    {},
                    5000,
                  );
                  if (rewardRes && rewardRes.reward) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 领取改装升级累计奖励成功`,
                      type: "success",
                    });
                  }
                } catch (e) {}
              }
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 收车失败: ${e.message}`,
                type: "warning",
              });
            }
            await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
          }
        }
        if (claimedCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有可收取的车辆`,
            type: "info",
          });
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发车前收车完成，共收取 ${claimedCount} 辆`,
          type: "success",
        });

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取车辆信息...`,
          type: "info",
        });
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "car_getrolecar",
          {},
          10000,
        );
        let carList = normalizeCars(res?.body ?? res);

        let refreshTickets = 0;
        let currentRoleId = null;
        try {
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000,
          );
          const qty = roleRes?.role?.items?.[35002]?.quantity;
          refreshTickets = Number(qty || 0);
          currentRoleId = roleRes?.role?.roleId ? String(roleRes.role.roleId) : null;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 剩余刷新次数: ${refreshTickets}`,
            type: "info",
          });
        } catch (_) {}

        let helperUsageMap = {};
        let sortedHelpers = [];

        const updateHelperUsage = async () => {
          try {
            const usageRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_getmemberhelpingcnt",
              {},
              5000
            );
            helperUsageMap =
              usageRes?.body?.memberHelpingCntMap ||
              usageRes?.memberHelpingCntMap ||
              {};
          } catch (e) {}
        };

        try {
          await updateHelperUsage();

          const legionRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_getinfo",
            {},
            5000
          );
          const membersMap =
            legionRes?.body?.info?.members || legionRes?.info?.members || {};
          
          sortedHelpers = Object.values(membersMap)
            .filter(
              (m) =>
                !currentRoleId || String(m.roleId) !== currentRoleId
            )
            .map((m) => ({
              id: String(m.roleId),
              name: m.name || m.nickname || String(m.roleId),
              redQuench: m.custom?.red_quench_cnt || 0,
            }))
            .sort((a, b) => b.redQuench - a.redQuench);
            
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取到 ${sortedHelpers.length} 位潜在护卫`,
            type: "info",
          });
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取护卫数据失败: ${e.message}，将不带护卫发车`,
            type: "warning",
            code: e.code
          });
        }

        const assignHelperIfNeeded = async (car) => {
          const color = Number(car.color || 0);
          if (color < 5) return;
          if (car.helperId) return;

          await updateHelperUsage();

          if (!sortedHelpers.length) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]需要护卫，但未获取到可用护卫列表`,
              type: "warning",
            });
            return;
          }

          const bestHelper = sortedHelpers.find((h) => {
            const used = Number(helperUsageMap[h.id] || 0);
            return used < 4;
          });

          if (bestHelper) {
            car.helperId = bestHelper.id;
            helperUsageMap[bestHelper.id] = Number(helperUsageMap[bestHelper.id] || 0) + 1;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]自动分配护卫: ${bestHelper.name} (已助战: ${helperUsageMap[bestHelper.id]}/4)`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]需要护卫，但所有护卫次数已满`,
              type: "warning",
            });
          }
        };

        for (const car of carList) {
          if (shouldStop.value) break;

          if (Number(car.sendAt || 0) !== 0) continue;

          try {
            const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
            
            const customConditions = {
              gold: batchSettings.smartDepartureGoldThreshold,
              recruit: batchSettings.smartDepartureRecruitThreshold,
              jade: batchSettings.smartDepartureJadeThreshold,
              ticket: batchSettings.smartDepartureTicketThreshold,
            };

            if (shouldSendCar(car, effectiveTickets, batchSettings.carMinColor, customConditions, batchSettings.useGoldRefreshFallback, batchSettings.smartDepartureMatchAll)) {
              await assignHelperIfNeeded(car);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]满足条件，直接发车`,
                type: "info",
              });
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
              } catch (sendError) {
                const errorCode = sendError.code || sendError.error?.code || sendError.response?.code || (sendError.message && parseInt(sendError.message.match(/(\d+)/)?.[0]));
                if (errorCode === 12000050) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 今日发车次数已达上限，跳过该车辆`,
                    type: "info",
                  });
                  continue;
                }
                throw sendError;
              }
              await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
              continue;
            }

            let shouldRefresh = false;
            const free = Number(car.refreshCount ?? 0) === 0;
            const useGoldFallback = batchSettings.useGoldRefreshFallback && !free && refreshTickets < 6;
            
            if (refreshTickets >= 6) shouldRefresh = true;
            else if (free) shouldRefresh = true;
            else if (useGoldFallback) {
              shouldRefresh = true;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                type: "warning",
              });
            }
            else {
              await assignHelperIfNeeded(car);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]不满足条件且无刷新次数，直接发车`,
                type: "warning",
              });
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
              } catch (sendError) {
                const errorCode = sendError.code || sendError.error?.code || sendError.response?.code || (sendError.message && parseInt(sendError.message.match(/(\d+)/)?.[0]));
                if (errorCode === 12000050) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 今日发车次数已达上限，跳过该车辆`,
                    type: "info",
                  });
                  continue;
                }
                throw sendError;
              }
              await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
              continue;
            }

            while (shouldRefresh && !shouldStop.value) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]尝试刷新...`,
                type: "info",
              });
              let resp;
              try {
                resp = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_refresh",
                  { carId: String(car.id) },
                  10000,
                );
              } catch (refreshError) {
                const errorCode = refreshError.code || refreshError.message;
                if (errorCode === 200060 || String(errorCode).includes("200060")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 车辆[${gradeLabel(car.color)}]刷新失败(错误码: ${errorCode})，金砖和刷新票已用完，直接发车`,
                    type: "warning",
                  });
                  await assignHelperIfNeeded(car);
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                  await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
                  break;
                }
                throw refreshError;
              }
              const data = resp?.car || resp?.body?.car || resp;

              if (data && typeof data === "object") {
                if (data.color != null) car.color = Number(data.color);
                if (data.refreshCount != null)
                  car.refreshCount = Number(data.refreshCount);
                if (data.rewards != null) car.rewards = data.rewards;
              }

              try {
                const roleRes = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "role_getroleinfo",
                  {},
                  5000,
                );
                refreshTickets = Number(
                  roleRes?.role?.items?.[35002]?.quantity || 0,
                );
              } catch (_) {}

              if (shouldSendCar(car, batchSettings.useGoldRefreshFallback ? 999 : refreshTickets, batchSettings.carMinColor, customConditions, batchSettings.useGoldRefreshFallback, batchSettings.smartDepartureMatchAll)) {
                await assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`,
                  type: "success",
                });
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                } catch (sendError) {
                  const errorCode = sendError.code || sendError.error?.code || sendError.response?.code || (sendError.message && parseInt(sendError.message.match(/(\d+)/)?.[0]));
                  if (errorCode === 12000050) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 今日发车次数已达上限，跳过该车辆`,
                      type: "info",
                    });
                    break;
                  }
                  throw sendError;
                }
                await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
                break;
              }

              const freeNow = Number(car.refreshCount ?? 0) === 0;
              const useGoldFallbackNow = batchSettings.useGoldRefreshFallback && !freeNow && refreshTickets < 6;

              if (refreshTickets >= 6) shouldRefresh = true;
              else if (freeNow) shouldRefresh = true;
              else if (useGoldFallbackNow) {
                shouldRefresh = true;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                  type: "warning",
                });
              }
              else {
                assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，发车`,
                type: "warning",
                });
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                } catch (sendError) {
                  const errorCode = sendError.code || sendError.error?.code || sendError.response?.code || (sendError.message && parseInt(sendError.message.match(/(\d+)/)?.[0]));
                  if (errorCode === 12000050) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 今日发车次数已达上限，跳过该车辆`,
                      type: "info",
                    });
                    break;
                  }
                  throw sendError;
                }
                await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
                break;
              }

              await new Promise((r) => setTimeout(r, batchSettings.refreshDelay));
            }
          } catch (carError) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]处理失败: ${carError.message}，跳过该车辆`,
              type: "error",
            });
            continue;
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 智能发车完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `智能发车失败: ${error.message}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量智能发车结束");
  };

  /**
   * 领取赛车奖励
   */
  const batchClaimCars = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
        tokenStatus.value[tokenId] = "running";

        const token = tokens.value.find((t) => t.id === tokenId);
        
        const tokenSettings = loadSettings ? (loadSettings(tokenId) || currentSettings) : currentSettings;

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始一键收车: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId, tokens.value);

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取车辆信息...`,
            type: "info",
          });
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "car_getrolecar",
            {},
            10000,
          );
          let carList = normalizeCars(res?.body ?? res);
          let refreshlevel = res?.roleCar?.research?.[1] || 0;

          let claimedCount = 0;
          for (const car of carList) {
            if (shouldStop.value) break;
            if (canClaim(car)) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_claim",
                  { carId: String(car.id) },
                  10000,
                );
                claimedCount++;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 收车成功: ${gradeLabel(car.color)}`,
                  type: "success",
                });

                if (tokenSettings?.upgradeCar !== false) {
                const roleRes = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "role_getroleinfo",
                  {},
                  5000,
                );
                let refreshpieces = Number(
                  roleRes?.role?.items?.[35009]?.quantity || 0,
                );
                while (
                  refreshlevel < CarresearchItem.length &&
                  refreshpieces >= CarresearchItem[refreshlevel] &&
                  !shouldStop.value
                ) {
                  try {
                    await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "car_research",
                      { researchId: 1 },
                      5000,
                    );
                    refreshlevel++;

                    const updatedRoleRes = await tokenStore.sendMessageWithPromise(
                      tokenId,
                      "role_getroleinfo",
                      {},
                      5000,
                    );
                    refreshpieces = Number(
                      updatedRoleRes?.role?.items?.[35009]?.quantity || 0,
                    );

                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 执行车辆改装升级，当前等级: ${refreshlevel}`,
                      type: "success",
                    });

                    await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
                    await new Promise((r) => setTimeout(r, 1400));
                  } catch (e) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 车辆改装升级失败: ${e.message}`,
                      type: "error",
                    });
                    break;
                  }
                }

                try {
                  const rewardRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_claimpartconsumereward",
                    {},
                    5000,
                  );
                  if (rewardRes && rewardRes.reward) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 领取改装升级累计奖励成功`,
                      type: "success",
                    });
                  }
                } catch (e) {}
              }
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 收车失败: ${e.message}`,
                type: "warning",
              });
            }
            await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
          }
        }

        if (claimedCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有可收取的车辆`,
            type: "info",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 收车完成，共收取 ${claimedCount} 辆 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 收车失败: ${error.message}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量一键收车结束");
  };

  /**
   * 军团商店购买
   */
  const legion_storebuygoods = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      const tokenId = selectedTokens.value[index];

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始购买四圣碎片: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送购买请求...`,
          type: "info",
        });
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_storebuygoods",
          { id: 6 },
          5000,
        );

        await new Promise((r) => setTimeout(r, batchSettings.actionDelay));

        if (result.error) {
          if (result.error.includes("俱乐部商品购买数量超出上限")) {
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
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 军团商店购买皮肤币
   */
  const legionStoreBuySkinCoins = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      const tokenId = selectedTokens.value[index];

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始购买俱乐部5皮肤币: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送购买请求...`,
          type: "info",
        });

        let result = null;
        for (let i = 0; i < 5; i++) {
          if (shouldStop.value) break;
          result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_storebuygoods",
            { id: 1 },
            5000,
          );

          await new Promise((r) => setTimeout(r, batchSettings.actionDelay));
        }

        if (result && result.error) {
          if (result.error.includes("俱乐部商品购买数量超出上限")) {
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
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }
    }

    currentRunningTokenId.value = null;
    isRunning.value = false;
    shouldStop.value = false;
  };

  /**
   * 军团购买斑点蛋
   */
  const legionBuyBanDianDan = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      const tokenId = selectedTokens.value[index];

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始购买斑点蛋: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 发送购买斑点蛋请求...`,
          type: "info",
        });
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_storebuygoods",
          { id: 205, num: 4 },
          5000,
        );

        await new Promise((r) => setTimeout(r, batchSettings.actionDelay));

        if (result.error) {
          if (result.error.includes("俱乐部商品购买数量超出上限")) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 本周已购买过斑点蛋，跳过`,
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
            message: `${token.name} 购买成功，获得斑点蛋 x4`,
            type: "success",
          });
          tokenStatus.value[tokenId] = "completed";
        }

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买过程出错: ${error.message}`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("购买斑点蛋结束");
  };

  /**
   * 盐场报名
   */
  const batchLegionSignup = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      const tokenId = selectedTokens.value[index];

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始盐场报名: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_signup",
          {},
          5000,
        );
        await new Promise((r) => setTimeout(r, 500));

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐场报名成功`,
          type: "success",
        });

        await tokenStore.sendMessage(tokenId, "role_getroleinfo");
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} === 盐场报名完成 ===`,
          type: "success",
        });

      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `盐场报名失败: ${error.message}`,
          type: "error",
        });
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量盐场报名结束");
  };

  /**
   * (payload报名)
   */
  const batchPayloadSignup = async () => {
    if (selectedTokens.value.length === 0) return;
    
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始蟠桃报名: ${token.name} ===`,
          type: "info",
        });
        
        await ensureConnection(tokenId, tokens.value);
        
        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        const itemId = 1037;
        const quantity = roleInfo?.role?.items?.[itemId]?.quantity || 0;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 当前入梦铃数量: ${quantity}`,
          type: "info",
        });
        
        if (quantity >= 60) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_buypayloaditem",
              { id: 1037, num: 60 },
              5000,
            );
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已提交60个入梦铃`,
              type: "success",
            });
          } catch (buyError) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 提交入梦铃失败: ${buyError.message}，继续执行报名`,
              type: "warning",
            });
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 入梦铃数量不足60，跳过提交`,
            type: "info",
          });
        }
        
        try {
          const signupResult = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_payloadsignup",
            {},
            5000,
          );
          
          if (signupResult && signupResult.ret === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 蟠桃报名成功`,
              type: "success",
            });
          } else {
            const errorCode = signupResult?.ret || (signupResult?.error && parseInt(signupResult.error.match(/(\d+)/)?.[0]));
            if (errorCode === 10000420) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 蟠桃报名失败: 有效人数不足`,
                type: "warning",
              });
            } else if (errorCode === 8000010) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 蟠桃报名失败: 已报名`,
                type: "warning",
              });
            } else if (errorCode === 2300100) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 蟠桃报名失败: 非团长`,
                type: "warning",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 蟠桃报名失败: ${signupResult?.error || "未知错误"}`,
                type: "error",
              });
            }
            
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "legion_getpayloadlegioninfo",
                {},
                5000,
              );
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 已获取俱乐部信息`,
                type: "info",
              });
            } catch (infoError) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 获取俱乐部信息失败: ${infoError.message}`,
                type: "error",
              });
            }
          }
        } catch (signupError) {
          const errorCode = signupError.code || (signupError.message && parseInt(signupError.message.match(/(\d+)/)?.[0]));
          if (errorCode === 10000420) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 蟠桃报名失败: 有效人数不足`,
              type: "warning",
            });
          } else if (errorCode === 8000010) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 蟠桃报名失败: 已报名`,
              type: "warning",
            });
          } else if (errorCode === 2300100) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 蟠桃报名失败: 非团长`,
              type: "warning",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 蟠桃报名失败: ${signupError.message}`,
              type: "error",
            });
          }
          
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "legion_getpayloadlegioninfo",
              {},
              5000,
            );
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 已获取俱乐部信息`,
              type: "info",
            });
          } catch (infoError) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 获取俱乐部信息失败: ${infoError.message}`,
              type: "error",
            });
          }
        }
        
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 蟠桃报名已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 蟠桃报名失败: ${error.message}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量蟠桃报名结束");
  };

  /**
   * 盐场布阵入场抓包
   */
  const batchWarDeployEnter = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始盐场布阵入场: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        const getCommandDelay = () => batchSettings.commandDelay || 500;

        // 1. 获取战场信息
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取战场信息...`,
          type: "info",
        });

        const battlefieldResp = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getbattlefield",
          {},
          10000,
        );
        const battlefieldBody = battlefieldResp?.body !== undefined ? battlefieldResp.body : battlefieldResp;
        const bfInfo = battlefieldBody?.info || {};
        const isInWeekWar = battlefieldBody?.isInWeekWar;
        const battlefieldId = bfInfo.battlefieldId;
        const canEnterWar = bfInfo.canEnterWar;
        const phase = bfInfo.phase;
        const bfType = bfInfo.type;
        const bfSubType = bfInfo.subType;
        const sid = bfInfo.sid;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 战场信息 - isInWeekWar: ${isInWeekWar}, battlefieldId: ${battlefieldId}, canEnterWar: ${canEnterWar}, phase: ${phase}, type: ${bfType}/${bfSubType}`,
          type: "info",
        });
        console.log("[盐场布阵入场] battlefield full info:", JSON.stringify(bfInfo));

        if (!battlefieldId) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到battlefieldId，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        if (canEnterWar === false) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前不可入场(canEnterWar=false)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        if (!sid) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到sid(无法建立战场WS)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        await new Promise((r) => setTimeout(r, getCommandDelay()));

        // 2. 获取角色信息
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取角色布阵信息...`,
          type: "info",
        });

        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        const role = roleInfo?.role;
        const battleTeamRaw = role?.battleTeam;
        const lordWeaponId = Number(role?.lordWeaponId) || 0;
        const petUId = role?.pet?.petUId || "";

        const battleTeam = {};
        if (battleTeamRaw) {
          for (const [slot, heroInfo] of Object.entries(battleTeamRaw)) {
            if (heroInfo && heroInfo.heroId != null) {
              battleTeam[slot] = Number(heroInfo.heroId);
            }
          }
        }

        if (Object.keys(battleTeam).length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 阵型为空(battleTeam无数据)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 布阵信息 - battleTeam: ${JSON.stringify(battleTeam)}, lordWeaponId: ${lordWeaponId}, petUId: ${petUId}`,
          type: "info",
        });
        console.log("[盐场布阵入场] warParams preview:", JSON.stringify({ battlefieldId, battleTeam, lordWeaponId, petUId }));

        await new Promise((r) => setTimeout(r, getCommandDelay()));

        // 3. 建立战场 WebSocket 连接 —— war_* 命令需要在战场WS上发送
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 建立战场WS连接...`,
          type: "info",
        });

        let warClient = null;
        try {
          warClient = await connectWarWS(token.token, sid, battlefieldId);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 战场WS连接成功`,
            type: "info",
          });

          // 进入战场 —— 参考 legionWarStore：用 send() 不等待响应，延时后服务器状态就绪
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 进入战场...`,
            type: "info",
          });
          warClient.send("war_enterbattlefield", { battlefieldId, useGzip: true });
          await new Promise((r) => setTimeout(r, 2000));

          const warParams = {
            battlefieldId,
            battleTeam,
            lordWeaponId,
            petUId,
          };
          console.log("[盐场布阵入场] warParams:", JSON.stringify(warParams));

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行盐场布阵...`,
            type: "info",
          });

          const teamSetResp = await warClient.sendWithPromise(
            "war_teamsetbattleteam",
            warParams,
            10000,
          );
          const teamSetBody = teamSetResp?.body !== undefined ? teamSetResp.body : teamSetResp;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 盐场布阵响应: ${JSON.stringify(teamSetBody)}`,
            type: "success",
          });
          console.log("[盐场布阵入场] war_teamsetbattleteam response:", JSON.stringify(teamSetBody));

          await new Promise((r) => setTimeout(r, getCommandDelay()));

          // 5. 执行盐场入场
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行盐场入场...`,
            type: "info",
          });

          const setBattleResp = await warClient.sendWithPromise(
            "war_setbattleteam",
            warParams,
            10000,
          );
          const setBattleBody = setBattleResp?.body !== undefined ? setBattleResp.body : setBattleResp;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 盐场入场响应: ${JSON.stringify(setBattleBody)}`,
            type: "success",
          });
          console.log("[盐场布阵入场] war_setbattleteam response:", JSON.stringify(setBattleBody));
        } finally {
          if (warClient) {
            try { warClient.disconnect(); } catch (_) {}
            console.log("[盐场布阵入场] 战场WS已关闭");
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 盐场布阵入场完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐场布阵入场失败: ${error.message}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("盐场布阵入场抓包结束");
  };

  /**
   * 盐场入场抓包（不含布阵）
   */
  const batchWarEnterOnly = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) => setTimeout(r, batchSettings.accountSwitchDelay * 1000));
      }

      const tokenId = selectedTokens.value[index];
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始盐场入场: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);

        const getCommandDelay = () => batchSettings.commandDelay || 500;

        // 1. 获取战场信息
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取战场信息...`,
          type: "info",
        });

        const battlefieldResp = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getbattlefield",
          {},
          10000,
        );
        const battlefieldBody = battlefieldResp?.body !== undefined ? battlefieldResp.body : battlefieldResp;
        const bfInfo = battlefieldBody?.info || {};
        const isInWeekWar = battlefieldBody?.isInWeekWar;
        const battlefieldId = bfInfo.battlefieldId;
        const canEnterWar = bfInfo.canEnterWar;
        const phase = bfInfo.phase;
        const bfType = bfInfo.type;
        const bfSubType = bfInfo.subType;
        const sid = bfInfo.sid;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 战场信息 - isInWeekWar: ${isInWeekWar}, battlefieldId: ${battlefieldId}, canEnterWar: ${canEnterWar}, phase: ${phase}, type: ${bfType}/${bfSubType}`,
          type: "info",
        });
        console.log("[盐场入场] battlefield full info:", JSON.stringify(bfInfo));

        if (!battlefieldId) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到battlefieldId，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        if (canEnterWar === false) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 当前不可入场(canEnterWar=false)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        if (!sid) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 未获取到sid(无法建立战场WS)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        await new Promise((r) => setTimeout(r, getCommandDelay()));

        // 2. 获取角色信息
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取角色布阵信息...`,
          type: "info",
        });

        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        const role = roleInfo?.role;
        const battleTeamRaw = role?.battleTeam;
        const lordWeaponId = Number(role?.lordWeaponId) || 0;
        const petUId = role?.pet?.petUId || "";

        const battleTeam = {};
        if (battleTeamRaw) {
          for (const [slot, heroInfo] of Object.entries(battleTeamRaw)) {
            if (heroInfo && heroInfo.heroId != null) {
              battleTeam[slot] = Number(heroInfo.heroId);
            }
          }
        }

        if (Object.keys(battleTeam).length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 阵型为空(battleTeam无数据)，跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 布阵信息 - battleTeam: ${JSON.stringify(battleTeam)}, lordWeaponId: ${lordWeaponId}, petUId: ${petUId}`,
          type: "info",
        });
        console.log("[盐场入场] warParams preview:", JSON.stringify({ battlefieldId, battleTeam, lordWeaponId, petUId }));

        await new Promise((r) => setTimeout(r, getCommandDelay()));

        // 3. 建立战场 WebSocket 连接 —— war_* 命令需要在战场WS上发送
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 建立战场WS连接...`,
          type: "info",
        });

        let warClient = null;
        try {
          warClient = await connectWarWS(token.token, sid, battlefieldId);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 战场WS连接成功`,
            type: "info",
          });

          // 进入战场 —— 参考 legionWarStore：用 send() 不等待响应，延时后服务器状态就绪
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 进入战场...`,
            type: "info",
          });
          warClient.send("war_enterbattlefield", { battlefieldId, useGzip: true });
          await new Promise((r) => setTimeout(r, 2000));

          const warParams = {
            battlefieldId,
            battleTeam,
            lordWeaponId,
            petUId,
          };
          console.log("[盐场入场] warParams:", JSON.stringify(warParams));

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行盐场入场...`,
            type: "info",
          });

          const setBattleResp = await warClient.sendWithPromise(
            "war_setbattleteam",
            warParams,
            10000,
          );
          const setBattleBody = setBattleResp?.body !== undefined ? setBattleResp.body : setBattleResp;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 盐场入场响应: ${JSON.stringify(setBattleBody)}`,
            type: "success",
          });
          console.log("[盐场入场] war_setbattleteam response:", JSON.stringify(setBattleBody));
        } finally {
          if (warClient) {
            try { warClient.disconnect(); } catch (_) {}
            console.log("[盐场入场] 战场WS已关闭");
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 盐场入场完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 盐场入场失败: ${error.message}`,
          type: "error",
        });
        const errorCode = error.code || error.error?.code || error.response?.code || (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("盐场入场抓包结束");
  };

  /**
   * 营地挑战
   * 依据 localStorage 中的 camp-challenge-settings 执行：
   *  - 清空区域优先 / 挑战奖励优先 / 仅空投
   *  - 目标筛选、排除对手(阵容)、畏首畏尾(战力/红淬炼)、出战阵容、行为管理、屡战屡败
   *  - 营地通行证决定 最大攻击10/15次、最大击杀3/5次
   * 结束后自动领取营地任务奖励。
   */
  const batchCampChallenge = async (customSettings) => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;

    const settings = { ...loadCampSettings(), ...(customSettings || {}) };

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    for (let index = 0; index < selectedTokens.value.length; index++) {
      if (shouldStop.value) break;

      if (index > 0 && batchSettings.accountSwitchDelay > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `等待 ${batchSettings.accountSwitchDelay}秒 后切换账号...`,
          type: "info",
        });
        await new Promise((r) =>
          setTimeout(r, batchSettings.accountSwitchDelay * 1000),
        );
      }

      const tokenId = selectedTokens.value[index];
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      // 出战阵容切换/还原状态（与竞技场战斗逻辑一致，finally 中还原）
      let campFormationSwitched = false;
      let campOriginalFormation = null;

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始营地挑战: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId, tokens.value);
        if (shouldStop.value) return;

        const cmdDelay = batchSettings.commandDelay || 500;
        const delay = () => new Promise((r) => setTimeout(r, cmdDelay));

        const send = (cmd, params = {}, timeout = 8000) =>
          tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout);
        // 部分响应存在 body 包裹，统一解开以便后续直接取字段
        const unwrap = (r) =>
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          r.body &&
          typeof r.body === "object"
            ? r.body
            : r;

        // ---------- 1. 自身信息 ----------
        const roleInfo = unwrap(await send("role_getroleinfo", {}, 15000));
        const role = roleInfo?.role || {};
        let selfPower = Number(role.power || 0);
        let lordWeaponId = role.lordWeaponId || 0;
        const selfRedQuench = Number(role.redQuenchCnt || 0);
        let petUId = role.pet?.petUId || "";
        const passExpire = Number(role.statisticsTime?.["paid:car:s"] || 0);
        const hasPass = passExpire > Math.floor(Date.now() / 1000);
        const maxAttack = hasPass ? 15 : 10;
        const maxKill = hasPass ? 5 : 3;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 营地通行证${hasPass ? "有效" : "无效"}：上限 攻击${maxAttack}次 / 击败${maxKill}人，自身战力 ${fmtPower(selfPower)}，总红淬炼 ${selfRedQuench}`,
          type: "info",
        });

        // ---------- 2. 营地信息 ----------
        const dayKey = String(new Date().getDay());
        if (!["2", "3", "4"].includes(dayKey)) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 今天不是营地挑战日（仅周二~周四），跳过`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        // ---------- 出战阵容（与竞技场战斗相同的切换/还原逻辑） ----------
        let battleTeam = null;

        if (settings.formation === "arena") {
          const tokenSettings = loadSettings ? loadSettings(tokenId) || {} : {};
          const teamId = Number(tokenSettings?.arenaFormation || 1);

          // 解析角色队伍数据（切换阵容响应 / 当前角色信息通用）
          const parseRoleTeam = (r) => {
            const bt = {};
            for (const [pos, hero] of Object.entries(r?.battleTeam || {})) {
              const hid = hero?.heroId ?? hero?.id;
              if (hid) bt[pos] = Number(hid);
            }
            return bt;
          };

          // 1. 读取当前阵容编号并记录（用于结束后还原）
          let currentFormation = null;
          try {
            const preset = unwrap(await send("presetteam_getinfo", {}, 8000));
            await delay();
            currentFormation = preset?.presetTeamInfo?.useTeamId;
            if (currentFormation != null)
              campOriginalFormation = Number(currentFormation) || currentFormation;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前阵容: ${currentFormation}`,
              type: "info",
            });
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 读取当前阵容失败: ${e.message}，将尝试强制切换`,
              type: "warning",
            });
          }

          // 2. 已是目标阵容则不切换，否则切换（失败则强制切换）
          if (currentFormation === teamId) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 当前已是竞技场阵容${teamId}，无需切换`,
              type: "success",
            });
          } else {
            const applySaveResp = (saveResp) => {
              const newRole = saveResp?.role || {};
              const bt = parseRoleTeam(newRole);
              if (Object.keys(bt).length > 0) {
                battleTeam = bt;
                if (newRole.lordWeaponId != null)
                  lordWeaponId = Number(newRole.lordWeaponId);
                if (newRole.pet?.petUId) petUId = newRole.pet.petUId;
                if (newRole.power) selfPower = Number(newRole.power);
                return true;
              }
              return false;
            };

            let switchDone = false;
            try {
              switchDone = applySaveResp(
                await send("presetteam_saveteam", { teamId }, 8000),
              );
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 切换竞技场阵容失败: ${e.message}，尝试强制切换`,
                type: "warning",
              });
            }
            if (!switchDone) {
              try {
                switchDone = applySaveResp(
                  await send("presetteam_saveteam", { teamId }, 8000),
                );
              } catch (e) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 强制切换也失败: ${e.message}，将使用当前阵容`,
                  type: "warning",
                });
              }
            }
            if (switchDone) {
              campFormationSwitched = true;
              await delay();
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 成功切换到竞技场阵容${teamId}，切换后战力 ${fmtPower(selfPower)}`,
                type: "success",
              });
            }
          }
        }

        if (!battleTeam) {
          // 未切换（当前已是竞技场阵容）/ 不切换 / 切换失败兜底：使用当前阵容
          const bt = {};
          for (const [pos, hero] of Object.entries(role.battleTeam || {})) {
            const hid = hero?.heroId ?? hero?.id;
            if (hid) bt[pos] = Number(hid);
          }
          battleTeam = bt;
        }
        if (Object.keys(battleTeam).length === 0) {
          throw new Error("无法获取出战阵容");
        }
        const teamSetParams = { lordWeaponId, petUId, battleTeam };
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 出战阵容: ${Object.values(battleTeam).join(", ")}（${settings.formation === "arena" ? "竞技场阵容" : "当前阵容"}）`,
          type: "info",
        });

        const now = new Date();
        const yymmdd =
          String(now.getFullYear() % 100).padStart(2, "0") +
          String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0");
        const todayKey = yymmdd;
        const todayKeyFull = `${now.getFullYear()}${String(
          now.getMonth() + 1,
        ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

        const clubInfo = unwrap(await send("club_getinfo", {}, 8000));
        const oppoDay = clubInfo?.club?.oppoMap?.[dayKey];
        const defendersRaw = oppoDay?.defenders || {};

        if (Object.keys(defendersRaw).length === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 今日营地没有可挑战对手`,
            type: "warning",
          });
          tokenStatus.value[tokenId] = "completed";
          continue;
        }

        // 今日已用次数
        const siegeMap = clubInfo?.siege?.attackMap || {};
        const siegeToday = siegeMap[todayKey] || siegeMap[todayKeyFull] || {};
        let attackCnt = Number(siegeToday.attackCnt || 0);
        let killCnt = Number(siegeToday.aSuccessCnt || 0);

        // 构建防守者模型
        const defenders = {};
        for (let node = 1; node <= 30; node++) {
          const d = defendersRaw[String(node)];
          if (!d || d.roleId == null) continue;
          const challengeCnt = Number(d.challengeCnt || 0);
          const failCnt = Number(d.failCnt || 0);
          const wins = challengeCnt - failCnt;
          defenders[node] = {
            nodeId: node,
            roleId: d.roleId,
            name: d.name || `节点${node}`,
            challengeCnt,
            failCnt,
            wins,
            attackable: wins < 5,
            roleType: campNodeRole(node),
            baseScore: campBaseScore(node),
          };
        }

        const scoreOf = (def) => def.baseScore + campDiffBonus(def.wins);

        // ---------- 目标阵容信息（用于排除/畏首畏尾） ----------
        const targetTeamCache = {};
        // 对手阵容缓存 key：对手俱乐部id(或自身俱乐部id)+roleId+日期，同俱乐部账号共享，有效期1天
        const campCacheClubId =
          oppoDay?.legionId ||
          clubInfo?.club?.legionId ||
          clubInfo?.legionId ||
          "";
        const buildCampCacheKey = (def) =>
          `${campCacheClubId || "no-club"}:${def.roleId}:${todayKey}`;
        const fetchTargetTeam = async (def) => {
          if (targetTeamCache[def.nodeId]) return targetTeamCache[def.nodeId];
          const readCached = () => {
            try {
              const cache = loadTargetCache();
              const hit = cache[buildCampCacheKey(def)];
              if (
                hit &&
                hit.savedAt &&
                Date.now() - Number(hit.savedAt) < CAMP_TARGET_CACHE_TTL &&
                Array.isArray(hit.heroes) &&
                hit.heroes.length > 0
              ) {
                return {
                  power: Number(hit.power || 0),
                  redQuench: Number(hit.redQuench || 0),
                  heroes: hit.heroes.map((h) => ({
                    heroId: Number(h.heroId ?? h.id) || 0,
                    level: Number(h.level || 0),
                    star: Number(h.star || 0),
                    redQuenchCnt: Number(h.redQuenchCnt || 0),
                  })),
                };
              }
            } catch (e) {
              /* 忽略缓存读取错误 */
            }
            return null;
          };
          const hit = readCached();
          if (hit) {
            targetTeamCache[def.nodeId] = hit;
            return hit;
          }
          let data = { power: 0, redQuench: 0, heroes: [] };
          try {
            const resp = unwrap(
              await send(
                "club_gettargetteam",
                { targetId: def.roleId },
                5000,
              ),
            );
            const rbt = resp?.roleBattleTeam || {};
            const oppRole = rbt.role || {};
            const oppTeam = rbt.battleTeam || {};
            const heroes = Object.values(oppTeam).map((h) => ({
              heroId: Number(h.heroId ?? h.id),
              level: Number(h.level || 0),
              star: Number(h.star || 0),
              redQuenchCnt: Number(h.redQuenchCnt || 0),
            }));
            const redQuench = heroes.reduce((s, h) => s + h.redQuenchCnt, 0);
            data = {
              power: Number(oppRole.power || 0),
              redQuench,
              heroes,
            };
            // 写回浏览器缓存（同俱乐部通用，1天过期；顺便清理过期条目防止无限膨胀）
            if (data.heroes.length > 0 && campCacheClubId) {
              try {
                const cache = loadTargetCache();
                const key = buildCampCacheKey(def);
                cache[key] = {
                  savedAt: Date.now(),
                  power: data.power,
                  redQuench: data.redQuench,
                  heroes: data.heroes,
                };
                const cutoff = Date.now() - 2 * CAMP_TARGET_CACHE_TTL;
                for (const k of Object.keys(cache)) {
                  if (cache[k]?.savedAt && cache[k].savedAt < cutoff) {
                    delete cache[k];
                  }
                }
                saveTargetCache(cache);
              } catch (e) {
                /* 缓存写入失败不影响主流程 */
              }
            }
          } catch (e) {
            data = { power: 0, redQuench: 0, heroes: [], error: e.message };
          }
          targetTeamCache[def.nodeId] = data;
          return data;
        };

        // 排除阵容：命中已勾选阵容且该阵容所需武将全部 30 星才生效（防止对手刻意降级绕过）
        const lineupExcluded = (team) => {
          if (!settings.excludeLineups || settings.excludeLineups.length === 0)
            return null;
          const heroMap = {};
          for (const h of team.heroes) heroMap[h.heroId] = h;
          const has = (id) => !!heroMap[id];
          for (const rule of LINEUP_RULES) {
            if (!settings.excludeLineups.includes(rule.name)) continue;
            if (rule.required && !rule.required.every(has)) continue;
            if (rule.forbidden && rule.forbidden.some(has)) continue;
            if (
              rule.oneOf &&
              !rule.oneOf.every((group) => group.some(has))
            )
              continue;
            // 参与判定的武将（必需 + 各 oneOf 组命中）均需满级(6000)
            const checkIds = [...(rule.required || [])];
            if (rule.oneOf) {
              for (const group of rule.oneOf) {
                const hit = group.find(has);
                if (hit) checkIds.push(hit);
              }
            }
            const allMax = checkIds.every(
              (id) => (heroMap[id]?.star || 0) >= 30,
            );
            if (allMax) return rule.name;
          }
          return null;
        };

        // 畏首畏尾（开关关闭则不跳过任何对手）
        const tooStrongReason = (team) => {
          if (settings.cowardEnabled === false) return null;
          const pr = Number(settings.powerRatio) || 1.0;
          const qr = Number(settings.quenchRatio) || 1.0;
          if (team.power > 0 && selfPower > 0 && team.power >= selfPower * pr)
            return "战力";
          if (
            team.redQuench > 0 &&
            selfRedQuench > 0 &&
            team.redQuench >= selfRedQuench * qr
          )
            return "红淬炼";
          return null;
        };

        // 目标筛选（挑战奖励优先时生效）
        const passesTargetFilter = (def) => {
          if (settings.strategy !== "rewardFirst") return true;
          const f = settings.targetFilter || "none";
          if (f === "none") return true;
          const isCmdGen = def.roleType !== "vanguard";
          const isHardHell = def.wins === 3 || def.wins === 4;
          if (f === "commanderGeneral") return isCmdGen;
          if (f === "hardHell") return isHardHell;
          if (f === "both") return isCmdGen || isHardHell;
          return true;
        };

        // 按策略排序候选（分数从大到小，同分随机；清空区域优先先锁定区域）
        const orderedCandidates = (abandoned) => {
          let list = Object.values(defenders).filter(
            (d) => d.attackable && !abandoned.has(d.nodeId) && passesTargetFilter(d),
          );

          if (settings.strategy === "clearArea") {
            const regionRemain = [0, 0, 0];
            for (const d of list) {
              regionRemain[campNodeRegion(d.nodeId)] += 5 - d.wins;
            }
            let chosen = -1;
            let min = Infinity;
            // 剩余相同时优先下区，其次中区，最后上区
            for (const r of [2, 1, 0]) {
              if (regionRemain[r] > 0 && regionRemain[r] < min) {
                min = regionRemain[r];
                chosen = r;
              }
            }
            if (chosen >= 0) {
              list = list.filter((d) => campNodeRegion(d.nodeId) === chosen);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 清空区域优先：锁定${["上", "中", "下"][chosen]}区（剩余可击败 ${min}）`,
                type: "info",
              });
            }
          }

          list.sort((a, b) => scoreOf(b) - scoreOf(a));
          // 同分随机
          const shuffled = [];
          let i = 0;
          while (i < list.length) {
            let j = i;
            while (j < list.length && scoreOf(list[j]) === scoreOf(list[i]))
              j++;
            const grp = list.slice(i, j);
            for (let k = grp.length - 1; k > 0; k--) {
              const x = Math.floor(Math.random() * (k + 1));
              [grp[k], grp[x]] = [grp[x], grp[k]];
            }
            shuffled.push(...grp);
            i = j;
          }
          return shuffled;
        };

        const abandoned = new Set();
        const failStreak = {};

        const selectTarget = async (applyFilters) => {
          const candidates = orderedCandidates(abandoned);
          if (candidates.length === 0) return null;

          if (applyFilters) {
            for (const def of candidates) {
              const team = await fetchTargetTeam(def);
              const excl = lineupExcluded(team);
              if (excl) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `跳过 ${def.name}(节点${def.nodeId})：命中排除阵容[${excl}]`,
                  type: "info",
                });
                continue;
              }
              const strong = tooStrongReason(team);
              if (strong) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `跳过 ${def.name}(节点${def.nodeId})：对手${strong}过高（战力${fmtPower(team.power)}，红淬${team.redQuench}）`,
                  type: "info",
                });
                continue;
              }
              return { def, team };
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `按排除/畏首畏尾筛选后无对手，忽略这些条件重新选择`,
              type: "warning",
            });
          }

          const def = candidates[0];
          const team = await fetchTargetTeam(def);
          return { def, team };
        };

        const syncCounts = (resp) => {
          const am = resp?.siege?.attackMap || {};
          const t = am[todayKey] || am[todayKeyFull];
          if (t) {
            if (t.attackCnt != null) attackCnt = Number(t.attackCnt);
            if (t.aSuccessCnt != null) killCnt = Number(t.aSuccessCnt);
          }
        };
        const syncDefender = (resp, nodeId) => {
          const upd =
            resp?.club?.oppoMap?.[dayKey]?.defenders?.[String(nodeId)];
          const def = defenders[nodeId];
          if (upd && def) {
            if (upd.challengeCnt != null)
              def.challengeCnt = Number(upd.challengeCnt);
            if (upd.failCnt != null) def.failCnt = Number(upd.failCnt);
            def.wins = def.challengeCnt - def.failCnt;
            def.attackable = def.wins < 5;
          }
        };
        const isWinResp = (resp) => {
          if (Array.isArray(resp?.reward) && resp.reward.length > 0) return true;
          if (resp?.battleData?.result?.isWin === true) return true;
          return false;
        };

        // 空投（挑战虚拟对手，保底必胜）
        const doAirdrop = async () => {
          let guard = 0;
          while (
            !shouldStop.value &&
            killCnt < maxKill &&
            attackCnt < maxAttack &&
            guard < 30
          ) {
            guard++;
            try {
              const resp = unwrap(
                await send(
                  "club_attackmonster",
                  { useItem: false, teamSetParams },
                  8000,
                ),
              );
              await delay();
              syncCounts(resp);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `空投挑战虚拟对手 胜利（击败 ${killCnt}/${maxKill}，攻击 ${attackCnt}/${maxAttack}）`,
                type: "success",
              });
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `空投挑战失败: ${e.message}`,
                type: "error",
              });
              break;
            }
          }
        };

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 今日已攻击 ${attackCnt}/${maxAttack}，已击败 ${killCnt}/${maxKill}`,
          type: "info",
        });

        if (settings.strategy === "airdropOnly") {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 策略：仅空投（挑战虚拟对手）`,
            type: "info",
          });
          await doAirdrop();
        } else if (killCnt >= maxKill || attackCnt >= maxAttack) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 已达今日上限，跳过真人挑战`,
            type: "info",
          });
        } else {
          const strategyLabel =
            settings.strategy === "rewardFirst"
              ? "挑战奖励优先"
              : "清空区域优先";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 策略：${strategyLabel}`,
            type: "info",
          });

          let guard = 0;
          let current = null; // 当前目标（失败未达上限时保持连续挑战同一对手）
          while (
            !shouldStop.value &&
            attackCnt < maxAttack &&
            killCnt < maxKill &&
            guard < 60
          ) {
            guard++;
            if (!current) {
              current = await selectTarget(true);
              if (!current) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 没有可挑战的真人对手`,
                  type: "warning",
                });
                if (settings.behavior === "airdrop") {
                  await doAirdrop();
                }
                break;
              }
              const newDef = current.def;
              const newTeam = current.team;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `挑战 ${newDef.name}（节点${newDef.nodeId}·${campRoleLabel(newDef.roleType)}·${campDiffLabel(newDef.wins)}·积分${scoreOf(newDef)}）战力${fmtPower(newTeam.power)} 红淬${newTeam.redQuench}`,
                type: "info",
              });
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `继续挑战 ${current.def.name}（连续失败 ${failStreak[current.def.nodeId] || 0}/${settings.maxConsecutiveFail}）`,
                type: "info",
              });
            }

            const def = current.def;

            let resp = null;
            try {
              resp = unwrap(
                await send(
                  "club_attack",
                  {
                    nodeId: def.nodeId,
                    targetId: def.roleId,
                    challengeCnt: def.challengeCnt,
                    failCnt: def.failCnt,
                    useItem: false,
                    teamSetParams,
                  },
                  10000,
                ),
              );
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `挑战 ${def.name} 请求失败: ${e.message}`,
                type: "error",
              });
              break;
            }
            await delay();
            if (!resp) break;

            syncCounts(resp);
            syncDefender(resp, def.nodeId);
            const win = isWinResp(resp);

            if (win) {
              failStreak[def.nodeId] = 0;
              current = null; // 胜利后按规则重新选择对手
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `胜利：${def.name}（击败 ${killCnt}/${maxKill}，攻击 ${attackCnt}/${maxAttack}）`,
                type: "success",
              });
            } else {
              failStreak[def.nodeId] = (failStreak[def.nodeId] || 0) + 1;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `失败：${def.name}（连续失败 ${failStreak[def.nodeId]}/${settings.maxConsecutiveFail}）`,
                type: "error",
              });
              if (
                failStreak[def.nodeId] >= Number(settings.maxConsecutiveFail)
              ) {
                abandoned.add(def.nodeId);
                current = null; // 达到上限，切换对手（选择时排除已放弃节点）
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `连续 ${failStreak[def.nodeId]} 次失败，放弃 ${def.name} 并切换对手`,
                  type: "warning",
                });
              }
              // 未达上限：保持 current，继续挑战同一对手
            }

            // 无失败余地判定
            const remainingAttacks = maxAttack - attackCnt;
            if (
              killCnt < maxKill &&
              remainingAttacks + killCnt <= maxKill
            ) {
              if (settings.behavior === "airdrop") {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `剩余攻击已无失败余地（剩余${remainingAttacks}次/还需击败${maxKill - killCnt}人），转空投保底`,
                  type: "warning",
                });
                await doAirdrop();
                break;
              } else if (settings.behavior === "pause") {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `剩余攻击已无失败余地，按设置暂停真人挑战，直接领奖`,
                  type: "warning",
                });
                break;
              }
              // useAll：继续真人挑战直到次数用完
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 营地挑战结束：击败 ${killCnt}/${maxKill}，攻击 ${attackCnt}/${maxAttack}，开始领奖`,
          type: "info",
        });

        // ---------- 领取营地任务奖励 ----------
        try {
          const freshInfo = unwrap(await send("club_getinfo", {}, 8000));
          const siege = freshInfo?.siege || clubInfo?.siege || {};
          const taskProgress = siege.taskProgress || {};
          const taskClaimedMap = siege.taskClaimedMap || {};
          const claimedKeyMap = { 1: "3", 2: "2", 3: "1", 4: "4" };
          const claimableIds = [];
          for (const id of [1, 2, 3]) {
            if (
              taskProgress[String(id)] === 1 &&
              !taskClaimedMap[claimedKeyMap[id]]
            ) {
              claimableIds.push(id);
            }
          }
          if (
            (Number(taskProgress["4"]) || 0) >= 3 &&
            !taskClaimedMap[claimedKeyMap[4]]
          ) {
            claimableIds.push(4);
          }

          if (claimableIds.length === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 没有可领取的营地任务奖励`,
              type: "warning",
            });
          } else {
            for (const confId of claimableIds) {
              if (shouldStop.value) break;
              try {
                await send("club_taskclaim", { confId }, 5000);
                await delay();
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 成功领取营地任务 ${confId} 奖励`,
                  type: "success",
                });
              } catch (e) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 领取营地任务 ${confId} 失败: ${e.message}`,
                  type: "error",
                });
              }
            }
          }
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 领取营地任务奖励阶段失败: ${e.message}`,
            type: "error",
          });
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 营地挑战失败: ${error.message || "未知错误"}`,
          type: "error",
        });
        const errorCode =
          error.code ||
          error.error?.code ||
          error.response?.code ||
          (error.message && parseInt(error.message.match(/(\d{6,8})/)?.[0]));
        if ([400340, 200400, 12000030, 200750, 200350].includes(errorCode)) {
          throw error;
        }
      } finally {
        // 阵容还原（与竞技场战斗一致：切换过才还原，还原后再关闭连接）
        if (campFormationSwitched && campOriginalFormation != null) {
          try {
            let cur = null;
            try {
              const preset = unwrap(
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "presetteam_getinfo",
                  {},
                  8000,
                ),
              );
              cur = preset?.presetTeamInfo?.useTeamId;
              cur = cur != null ? Number(cur) || cur : null;
            } catch (e) {
              // 读取失败则直接强制还原
            }
            if (cur !== campOriginalFormation) {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "presetteam_saveteam",
                { teamId: campOriginalFormation },
                8000,
              );
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 阵容已还原为 ${campOriginalFormation}`,
              type: "success",
            });
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 阵容还原失败: ${e.message}`,
              type: "warning",
            });
          }
        }
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected" && !isConnectionManaged.value) {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭`,
            type: "info",
          });
        }
      }
    }

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量营地挑战结束");
  };

  return {
    batchclubsign,
    batchSmartSendCar,
    batchClaimCars,
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    legionBuyBanDianDan,
    batchLegionSignup,
    batchPayloadSignup,
    batchWarDeployEnter,
    batchWarEnterOnly,
    batchCampChallenge,
  };
}