import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, onUnmounted, ref } from "vue";

import type { ProtoMsg } from "@/utils/bonProtocol";
import { g_utils } from "@/utils/bonProtocol";
import { gameLogger, tokenLogger, wsLogger } from "@/utils/logger";
import { XyzwWebSocketClient } from "@/utils/xyzwWebSocket";

import useIndexedDB from "@/hooks/useIndexedDB";
import { generateRandomSeed } from "@/utils/randomSeed";
import { transformToken } from "@/utils/token";
import { emitPlus } from "./events/index.js";
import router from "@/router";

const { getArrayBuffer, storeArrayBuffer, deleteArrayBuffer, clearAll } = useIndexedDB();

declare interface TokenData {
  id: string;
  name: string;
  token: string; // 原始Base64 token
  wsUrl: string | null; // 可选的自定义WebSocket URL
  server: string;
  remark?: string; // 备注信息
  importMethod?: "manual" | "bin" | "url" | "wxQrcode"; // 导入方式：manual（手动）、bin文件或url链接
  sourceUrl?: string; // 当importMethod为url时，存储url链接
  avatar?: string; // 用户头像URL
  upgradedToPermanent?: boolean; // 是否升级为长期有效
  upgradedAt?: string; // 升级时间
  updatedAt?: string; // 更新时间
  expiresAt?: string; // Token过期时间
  lastRefreshAt?: string; // 最后刷新时间
}

declare interface WebSocketConnection {
  status: "connecting" | "connected" | "disconnected" | "error";
  client: XyzwWebSocketClient | null;
  lastError: { timestamp: string; error: string } | null;
  tokenId: string;
  sessionId: string;
  createdAt: string;
  lastMessageAt: string | null;
  randomSeedSynced?: boolean;
  lastRandomSeedSource?: number | null;
  lastRandomSeed?: number | null;
}

declare type WebCtx = Record<string, Partial<WebSocketConnection>>;

declare interface ConnectLock {
  tokenId: string;
  operation: "connect" | "disconnect";
  timestamp: number;
  sessionId: string;
}
declare type LockCtx = Record<string, Partial<ConnectLock>>;

// 分组接口定义
declare interface TokenGroup {
  id: string;
  name: string;
  color: string; // 分组颜色，用于UI显示
  tokenIds: string[]; // 属于该分组的token ID列表
  createdAt?: string;
  updatedAt?: string;
}

export const gameTokens = useLocalStorage<TokenData[]>("gameTokens", []);
export const hasTokens = computed(() => gameTokens.value.length > 0);
export const selectedTokenId = useLocalStorage("selectedTokenId", "");
export const selectedToken = computed(() => {
  return gameTokens.value?.find((token) => token.id === selectedTokenId.value);
});
export const selectedRoleInfo = useLocalStorage<any>("selectedRoleInfo", null);

// 跨标签页连接协调
const activeConnections = useLocalStorage("activeConnections", {});

// Token分组管理
export const tokenGroups = useLocalStorage<TokenGroup[]>("tokenGroups", []);

/**
 * 重构后的Token管理存储
 * 以名称-token列表形式管理多个游戏角色
 */
export const useTokenStore = defineStore("tokens", () => {
  const wsConnections = ref<WebCtx>({}); // WebSocket连接状态
  const connectionLocks = ref<LockCtx>({}); // 连接操作锁，防止竞态条件
  const intentionallyDisconnected = new Set<string>(); // 主动断开的连接，禁止自动重连

  // 游戏数据存储（当前选中token的数据）
  const gameData = ref({
    roleInfo: null,
    legionInfo: null,
    carInfo: null, // 赛车信息
    commonActivityInfo: null, // 消耗活动进度
    bossTowerInfo: null, // 宝库
    evoTowerInfo: null, // 怪异塔
    monthActivity: null, // 月度任务数据
    presetTeam: null,
    nmextInfo: null, // 星级挑战信息
    battleVersion: null as number | null, // 战斗版本号
    studyStatus: {
      isAnswering: false,
      questionCount: 0,
      answeredCount: 0,
      status: "", // '', 'starting', 'answering', 'claiming_rewards', 'completed'
      timestamp: null,
    },
    lastUpdated: null as string | null,
  });

  // 每个token的游戏数据存储（用于批量显示）
  const tokenGameDataMap = ref<Record<string, any>>({});

  // 每个token的活跃度存储（用于批量排序）
  const tokenActivityMap = ref<Record<string, number>>({});

  // 获取指定token的游戏数据
  const getTokenGameData = (tokenId: string) => {
    return tokenGameDataMap.value[tokenId] || {};
  };

  // 更新指定token的游戏数据
  const updateTokenGameData = (tokenId: string, data: any) => {
    tokenGameDataMap.value[tokenId] = {
      ...tokenGameDataMap.value[tokenId],
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    // 同时更新活跃度
    const roleInfo = data.roleInfo || tokenGameDataMap.value[tokenId]?.roleInfo;
    if (roleInfo?.dailyTask?.dailyPoint !== undefined) {
      tokenActivityMap.value[tokenId] = roleInfo.dailyTask.dailyPoint;
      wsLogger.debug(`更新活跃度 [${tokenId}]: ${roleInfo.dailyTask.dailyPoint}/100`);
    }
  };

  // 获取指定token的活跃度
  const getTokenActivity = (tokenId: string): number => {
    return tokenActivityMap.value[tokenId] ?? 0;
  };

  // 设置指定token的活跃度
  const setTokenActivity = (tokenId: string, activity: number) => {
    tokenActivityMap.value[tokenId] = activity;
    wsLogger.debug(`设置活跃度 [${tokenId}]: ${activity}/100`);
  };

  // 获取当前选中token的角色信息
  const selectedTokenRoleInfo = computed(() => {
    return gameData.value.roleInfo;
  });

  const readStatisticsValue = (stats: any, key: string) => {
    if (!stats)
      return undefined;
    try {
      if (typeof stats.get === "function") {
        return stats.get(key);
      }
      if (Object.prototype.hasOwnProperty.call(stats, key)) {
        return stats[key];
      }
    } catch (error) {
      gameLogger.warn("读取统计数据失败:", error);
    }
    return undefined;
  };

  const extractLastLoginTimestamp = (payload: any) => {
    if (!payload)
      return null;

    const candidateSources = [
      payload?.role?.statistics,
      payload?.statistics,
      payload?.role?.statisticsTime,
      payload?.statisticsTime,
    ];

    const candidateKeys = [
      "last:login:time",
      "lastLoginTime",
      "last_login_time",
    ];

    for (const stats of candidateSources) {
      if (!stats)
        continue;
      for (const key of candidateKeys) {
        const value = readStatisticsValue(stats, key);
        if (value !== undefined && value !== null) {
          const numeric = Number(value);
          if (!Number.isNaN(numeric) && numeric > 0) {
            return numeric;
          }
        }
      }
    }
    return null;
  };

  const syncRandomSeedFromStatistics = (
    tokenId: string,
    rolePayload: any,
    client: XyzwWebSocketClient | null,
  ) => {
    if (!client)
      return;
    const connection = wsConnections.value[tokenId];
    if (!connection || connection.status !== "connected") {
      return;
    }

    const lastLoginTime = extractLastLoginTimestamp(rolePayload);
    if (!lastLoginTime) {
      return;
    }

    if (
      connection.randomSeedSynced
      && connection.lastRandomSeedSource === lastLoginTime
    ) {
      return;
    }

    const randomSeed = generateRandomSeed(lastLoginTime);

    try {
      client.send("system_custom", {
        key: "randomSeed",
        value: randomSeed,
      });
      connection.randomSeedSynced = true;
      connection.lastRandomSeedSource = lastLoginTime;
      connection.lastRandomSeed = randomSeed;
      wsLogger.info(`同步 randomSeed [${tokenId}]`, {
        lastLoginTime,
        randomSeed,
      });
    } catch (error) {
      wsLogger.error(`发送 randomSeed 失败 [${tokenId}]`, error);
    }
  };

  // Token管理
  const addToken = (tokenData: TokenData) => {
    const id = tokenData.id || `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToken = {
      id,
      name: tokenData.name,
      token: tokenData.token, // 保存原始Base64 token
      wsUrl: tokenData.wsUrl || null, // 可选的自定义WebSocket URL
      server: tokenData.server || "",
      remark: tokenData.remark || "", // 备注信息
      level: tokenData.level || 1,
      profession: tokenData.profession || "",
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isActive: true,
      // URL获取相关信息
      sourceUrl: tokenData.sourceUrl || null, // Token来源URL（用于刷新）
      importMethod: tokenData.importMethod || "manual", // 导入方式：manual 或 url
      avatar: tokenData.avatar || "", // 用户头像
    };

    gameTokens.value.push(newToken);
    return newToken;
  };

  const updateToken = (tokenId: string, updates: Partial<TokenData>) => {
    const index = gameTokens.value.findIndex((token) => token.id === tokenId);
    if (index !== -1) {
      const updatedToken = {
        ...gameTokens.value[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 如果更新了token字段，记录最后刷新时间
      if (updates.token) {
        updatedToken.lastRefreshAt = new Date().toISOString();
        // 简单估算过期时间（假设24小时）
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        updatedToken.expiresAt = expiresAt.toISOString();
      }

      gameTokens.value[index] = updatedToken;
      return true;
    }
    return false;
  };

  const removeToken = async (tokenId: string) => {
    gameTokens.value = gameTokens.value.filter((token) => token.id !== tokenId);

    // 关闭对应的WebSocket连接
    if (wsConnections.value[tokenId]) {
      closeWebSocketConnection(tokenId);
    }

    // 如果删除的是当前选中token，清除选中状态
    if (selectedTokenId.value === tokenId) {
      selectedTokenId.value = null;
    }

    // 同时删除IndexedDB中的数据
    await deleteArrayBuffer(tokenId);

    return true;
  };

  // 刷新游戏数据的方法
  const refreshGameData = async (tokenId: string) => {
    try {
      const connection = wsConnections.value[tokenId];

      // 如果该连接是主动断开的，跳过自动重连
      if (intentionallyDisconnected.has(tokenId)) {
        wsLogger.debug(`跳过刷新游戏数据，连接已主动断开 [${tokenId}]`);
        return;
      }

      // ✅ 如果未连接，先尝试自动重连
      if (!connection || connection.status !== "connected") {
        wsLogger.info(`刷新游戏数据时发现未连接，尝试自动重连 [${tokenId}]`);

        // 尝试刷新Token并重连
        const refreshSuccess = await attemptTokenRefresh(tokenId, true);

        if (!refreshSuccess) {
          wsLogger.error(`刷新游戏数据失败: Token ${tokenId} 自动重连失败`);
          return;
        }

        // 等待连接建立
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 再次检查连接状态
        const updatedConnection = wsConnections.value[tokenId];
        if (!updatedConnection || updatedConnection.status !== "connected") {
          wsLogger.error(`刷新游戏数据失败: Token ${tokenId} 重连后仍未连接`);
          return;
        }

        wsLogger.info(`自动重连成功，开始刷新游戏数据 [${tokenId}]`);
      }

      wsLogger.info(`开始刷新游戏数据 [${tokenId}]`);

      // 1. 2秒后刷新阵容（角色信息）
      setTimeout(async () => {
        try {
          const conn = wsConnections.value[tokenId];
          if (conn?.status === "connected") {
            await sendGetRoleInfo(tokenId);
            wsLogger.info(`刷新阵容数据完成 [${tokenId}]`);
          }
        } catch (error) {
          // 超时错误不显示为错误，只是警告
          const errorMsg = (error as Error).message || "";
          if (errorMsg.includes("超时")) {
            wsLogger.warn(`刷新阵容数据超时 [${tokenId}]，将在下次连接时重试`);
          } else {
            wsLogger.error(`刷新阵容数据失败 [${tokenId}]:`, error);
          }
        }
      }, 2000);

      // 2. 1秒后刷新俱乐部信息
      setTimeout(async () => {
        try {
          const conn = wsConnections.value[tokenId];
          if (conn?.status === "connected") {
            await sendMessageWithPromise(
              tokenId,
              "legion_getinfo",
              {},
              20000, // 增加超时时间到20秒
            );
            wsLogger.info(`刷新俱乐部信息完成 [${tokenId}]`);
          }
        } catch (error) {
          // 超时错误不显示为错误，只是警告
          if (error.message?.includes("超时")) {
            wsLogger.warn(`刷新俱乐部信息超时 [${tokenId}]，将在下次连接时重试`);
          } else {
            wsLogger.error(`刷新俱乐部信息失败 [${tokenId}]:`, error);
          }
        }
      }, 1000);

      // 3. 3秒后刷新赛车游戏信息（缩短延迟时间，确保用户能快速看到最新状态）
      setTimeout(async () => {
        try {
          const conn = wsConnections.value[tokenId];
          if (conn?.status === "connected") {
            await sendMessageWithPromise(
              tokenId,
              "car_getrolecar",
              {},
              20000, // 增加超时时间到20秒
            );
            wsLogger.info(`刷新赛车游戏信息完成 [${tokenId}]`);
          }
        } catch (error) {
          // 超时错误不显示为错误，只是警告
          if (error.message?.includes("超时")) {
            wsLogger.warn(`刷新赛车游戏信息超时 [${tokenId}]，将在下次连接时重试`);
          } else {
            wsLogger.error(`刷新赛车游戏信息失败 [${tokenId}]:`, error);
          }
        }
      }, 3000);

      // 4. 4秒后刷新怪异塔信息
      setTimeout(async () => {
        try {
          const conn = wsConnections.value[tokenId];
          if (conn?.status === "connected") {
            // 检查是否在怪异塔开放时间内
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const currentTime = hour * 60 + minute;

            // 计算当前是否是黑市周（简化版：每3周循环，第1周是黑市周）
            const start = new Date("2025-12-12T12:00:00");
            const weekDuration = 7 * 24 * 60 * 60 * 1000;
            const cycleDuration = 3 * weekDuration;
            const elapsed = now.getTime() - start.getTime();
            const cyclePosition = elapsed % cycleDuration;
            const isBlackMarketWeek = cyclePosition < weekDuration;

            // 判断是否在开放时间
            let isWeirdTowerOpen = false;
            if (isBlackMarketWeek) {
              if (day === 5) {
                // 周五：11:00前 或 12:00后开放
                const morningEnd = 11 * 60;
                const afternoonStart = 12 * 60;
                isWeirdTowerOpen = currentTime < morningEnd || currentTime >= afternoonStart;
              } else {
                // 其他时间全天开放
                isWeirdTowerOpen = true;
              }
            }

            if (!isWeirdTowerOpen) {
              wsLogger.info(`不在怪异塔开放时间内，跳过刷新 [${tokenId}]`);
              return;
            }

            await sendMessageWithPromise(
              tokenId,
              "evotower_getinfo",
              {},
              20000, // 增加超时时间到20秒
            );
            wsLogger.info(`刷新怪异塔信息完成 [${tokenId}]`);
          }
        } catch (error) {
          // 超时错误不显示为错误，只是警告
          if (error.message?.includes("超时")) {
            wsLogger.warn(`刷新怪异塔信息超时 [${tokenId}]，将在下次连接时重试`);
          } else {
            wsLogger.error(`刷新怪异塔信息失败 [${tokenId}]:`, error);
          }
        }
      }, 4000);

      wsLogger.info(`游戏数据刷新计划已安排 [${tokenId}]`);
    } catch (error) {
      wsLogger.error(`刷新游戏数据失败 [${tokenId}]:`, error);
    }
  };

  const selectToken = (tokenId: string, forceReconnect = false) => {
    const token = gameTokens.value.find((t) => t.id === tokenId);
    if (!token) {
      return null;
    }

    // 检查是否已经是当前选中的token
    const isAlreadySelected = selectedTokenId.value === tokenId;
    const existingConnection = wsConnections.value[tokenId];
    const isConnected = existingConnection?.status === "connected";
    const isConnecting = existingConnection?.status === "connecting";

    tokenLogger.debug(`选择Token: ${tokenId}`, {
      isAlreadySelected,
      isConnected,
      isConnecting,
      forceReconnect,
    });

    // 断开旧的WebSocket连接（如果存在）
    if (!isAlreadySelected && selectedTokenId.value) {
      const oldTokenId = selectedTokenId.value;
      if (wsConnections.value[oldTokenId]) {
        wsLogger.info(`断开旧Token的连接: ${oldTokenId}`);
        closeWebSocketConnection(oldTokenId);
      }
    }

    // 重置游戏数据
    gameData.value = {
      roleInfo: null,
      legionInfo: null,
      carInfo: null, // 赛车信息
      commonActivityInfo: null, // 消耗活动进度
      bossTowerInfo: null, // 宝库
      evoTowerInfo: null, // 怪异塔
      monthActivity: null, // 月度任务数据
      presetTeam: null,
      nmextInfo: null, // 星级挑战信息
      battleVersion: null as number | null, // 战斗版本号
      studyStatus: {
        isAnswering: false,
        questionCount: 0,
        answeredCount: 0,
        status: "", // '', 'starting', 'answering', 'claiming_rewards', 'completed'
        timestamp: null,
      },
      lastUpdated: null as string | null,
    };

    // 更新选中状态
    selectedTokenId.value = tokenId;

    // 更新最后使用时间
    updateToken(tokenId, { lastUsed: new Date().toISOString() });

    // 如果已经连接，直接刷新游戏数据
    if (isConnected) {
      wsLogger.info(`Token已连接，刷新游戏数据: ${tokenId}`);
      refreshGameData(tokenId);
      return token;
    }

    // 智能连接判断
    const shouldCreateConnection
      = forceReconnect // 强制重连
        || !isAlreadySelected // 首次选择此token
        || !existingConnection // 没有现有连接
        || existingConnection.status === "disconnected" // 连接已断开
        || existingConnection.status === "error"; // 连接出错

    if (shouldCreateConnection) {
      if (isAlreadySelected && !forceReconnect) {
        wsLogger.info(`Token已选中但无连接，创建新连接: ${tokenId}`);
      } else if (!isAlreadySelected) {
        wsLogger.info(`切换到新Token，创建连接: ${tokenId}`);
      } else if (forceReconnect) {
        wsLogger.info(`强制重连Token: ${tokenId}`);
      }

      // 创建WebSocket连接，传入onConnect回调
      const wsClient = createWebSocketConnection(tokenId, token.token, token.wsUrl, () => {
        // 连接成功后刷新游戏数据
        wsLogger.info(`连接成功，开始刷新游戏数据 [${tokenId}]`);
        refreshGameData(tokenId);
      });
    } else {
      if (isConnected) {
        wsLogger.debug(`Token已连接，跳过连接创建: ${tokenId}`);
      } else if (isConnecting) {
        wsLogger.debug(`Token连接中，跳过连接创建: ${tokenId}`);
      } else {
        wsLogger.debug(`Token已选中且有连接，跳过连接创建: ${tokenId}`);
      }
    }

    return token;
  };

  // Token刷新尝试记录
  const tokenRefreshAttempts = ref<Record<string, number>>({});

  // Token自动刷新状态记录
  const tokenAutoRefreshStatus = ref<Record<string, {
    lastRefresh: number;
    status: "success" | "failed" | "pending";
    error?: string;
  }>>({});

  // 正在刷新的Token集合（防止循环调用）
  const refreshingTokenIds = ref<Set<string>>(new Set());

  // Token刷新连续失败计数（用于退避策略）
  const tokenRefreshFailCount = ref<Record<string, number>>({});

  // onDisconnect 触发的自动刷新次数（防止无限重连循环）
  const disconnectRefreshCount = ref<Record<string, number>>({});
  const MAX_DISCONNECT_REFRESH = 3; // 最多允许 3 次握手失败后的自动刷新

  // 尝试自动刷新Token（带重试机制）
  const attemptTokenRefresh = async (tokenId: string, forceReconnect = false, retryCount = 0) => {
    // 防止重复进入：如果正在刷新此token，直接返回
    if (refreshingTokenIds.value.has(tokenId)) {
      wsLogger.warn(`Token正在刷新中，跳过重复请求 [${tokenId}]`);
      return false;
    }

    // 检查冷却时间 (10秒基础冷却)
    const lastAttempt = tokenRefreshAttempts.value[tokenId] || 0;
    const now = Date.now();
    const failCount = tokenRefreshFailCount.value[tokenId] || 0;

    // 只在非重试情况下检查冷却（重试时应立即执行）
    if (retryCount === 0) {
      const cooldownMs = Math.min(500 + failCount * 500, 1000); // 递增冷却：10秒 + 失败次数*5秒，最多20秒
      if (now - lastAttempt < cooldownMs) {
        wsLogger.warn(`Token刷新冷却中，跳过 [${tokenId}]，剩余${Math.ceil((cooldownMs - (now - lastAttempt)) / 1000)}秒`);
        return false;
      }
    }

    // 标记为正在刷新
    refreshingTokenIds.value.add(tokenId);
    tokenRefreshAttempts.value[tokenId] = now;

    const gameToken = gameTokens.value.find((t) => t.id === tokenId);
    if (!gameToken) {
      wsLogger.error(`Token刷新失败: 未找到Token [${tokenId}]`);
      tokenAutoRefreshStatus.value[tokenId] = {
        lastRefresh: now,
        status: "failed",
        error: "未找到Token",
      };
      refreshingTokenIds.value.delete(tokenId);
      return false;
    }

    // 设置自动刷新状态为待处理
    tokenAutoRefreshStatus.value[tokenId] = {
      lastRefresh: now,
      status: "pending",
    };

    wsLogger.info(`尝试自动刷新Token [${tokenId}] - 导入方式: ${gameToken.importMethod}${retryCount > 0 ? ` (重试 ${retryCount}/3)` : ""}`);
    let refreshSuccess = false;
    let errorMessage = "";

    try {
      if (gameToken.importMethod === "url" && gameToken.sourceUrl) {
        // URL形式token刷新
        wsLogger.debug(`从 URL刷新Token: ${gameToken.sourceUrl}`);
        const response = await fetch(gameToken.sourceUrl, {
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            updateToken(tokenId, {
              ...gameToken,
              token: data.token,
              lastRefreshed: now,
            });
            wsLogger.info(`从 URL获取token成功: ${gameToken.name}`);
            refreshSuccess = true;
          } else {
            errorMessage = "URL返回数据中没有token字段";
            wsLogger.error(`Token刷新失败: ${errorMessage} [${tokenId}]`);
          }
        } else {
          errorMessage = `URL请求失败: ${response.status} ${response.statusText}`;
          wsLogger.error(`Token刷新失败: ${errorMessage} [${tokenId}]`);
        }
      } else if (
        gameToken.importMethod === "bin"
        || gameToken.importMethod === "wxQrcode"
      ) {
        // Bin形式token刷新
        wsLogger.debug(`从 BIN数据刷新Token`);
        let userToken: ArrayBuffer | null = await getArrayBuffer(tokenId);
        let usedOldKey = false;

        if (!userToken) {
          wsLogger.debug(`尝试使用名称作为键查找BIN数据: ${gameToken.name}`);
          const tokenByName = await getArrayBuffer(gameToken.name);
          if (tokenByName) {
            userToken = tokenByName;
            usedOldKey = true;
            wsLogger.info(`使用名称作为键找到BIN数据: ${gameToken.name}`);
          } else {
            errorMessage = "未找到BIN数据";
            wsLogger.error(`Token刷新失败: ${errorMessage} [${tokenId}]`);
          }
        }

        if (userToken) {
          try {
            const token = await transformToken(userToken);
            updateToken(tokenId, {
              ...gameToken,
              token,
              lastRefreshed: now,
            });
            if (usedOldKey) {
              const saved = await storeArrayBuffer(tokenId, userToken);
              if (saved) {
                await deleteArrayBuffer(gameToken.name);
                wsLogger.info(`更新BIN数据存储键为Token ID [${tokenId}]`);
              }
            }
            refreshSuccess = true;
            wsLogger.info(`从 BIN数据刷新Token成功: ${gameToken.name}`);
          } catch (transformError) {
            errorMessage = `BIN数据转换失败: ${(transformError as Error).message}`;
            wsLogger.error(`Token刷新失败: ${errorMessage} [${tokenId}]`);
          }
        }
      } else if (gameToken.importMethod === "manual") {
        // 手动导入的Token，尝试使用现有token重新连接
        wsLogger.info(`手动导入的Token，尝试重新连接: ${gameToken.name}`);
        // 对于手动导入的Token，我们无法自动刷新，但可以尝试重新连接
        refreshSuccess = true;
        wsLogger.info(`手动导入Token重新连接尝试: ${gameToken.name}`);
      } else {
        errorMessage = `不支持的导入方式: ${gameToken.importMethod}`;
        wsLogger.error(`Token刷新失败: ${errorMessage} [${tokenId}]`);
      }

      // 重试机制：如果失败且重试次数小于3，等待后重试
      if (!refreshSuccess && retryCount < 3) {
        wsLogger.info(`Token刷新失败，${retryCount + 1}秒后重试 [${tokenId}]`);
        await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
        // 重试前清理标记，允许递归调用
        refreshingTokenIds.value.delete(tokenId);
        return attemptTokenRefresh(tokenId, forceReconnect, retryCount + 1);
      }
    } catch (error) {
      errorMessage = `刷新过程出错: ${(error as Error).message}`;
      wsLogger.error(`Token刷新过程出错 [${tokenId}]:`, error);
    } finally {
      // 更新自动刷新状态
      tokenAutoRefreshStatus.value[tokenId] = {
        lastRefresh: now,
        status: refreshSuccess ? "success" : "failed",
        error: errorMessage,
      };

      // 清理刷新标记（仅在非重试情况下清理）
      if (retryCount === 0) {
        refreshingTokenIds.value.delete(tokenId);
      }

      // 更新失败计数
      if (refreshSuccess) {
        tokenRefreshFailCount.value[tokenId] = 0; // 成功后重置失败计数
      } else {
        tokenRefreshFailCount.value[tokenId] = (tokenRefreshFailCount.value[tokenId] || 0) + 1;
        wsLogger.warn(`Token刷新失败计数: ${tokenId} = ${tokenRefreshFailCount.value[tokenId]}`);
      }
    }

    if (refreshSuccess) {
      wsLogger.info(`Token刷新成功 [${tokenId}]`);

      // 获取当前选中的Token
      const currentSelectedTokenId = selectedTokenId.value;
      const isCurrentToken = tokenId === currentSelectedTokenId;

      wsLogger.info(`Token刷新成功 - 当前选中Token: ${currentSelectedTokenId}, 刷新Token: ${tokenId}, 是否当前Token: ${isCurrentToken}`);

      const currentPath = router.currentRoute.value.path;
      const shouldReconnect
        = forceReconnect
          || isCurrentToken // 如果是当前切换的Token，需要重连
          || currentPath === "/tokens"
          || currentPath === "/admin/game-features";

      // 批量任务页面不自动重连
      if (shouldReconnect && currentPath !== "/batch-tasks") {
        wsLogger.info(`触发自动重连 [${tokenId}] - 原因: ${isCurrentToken ? "当前切换的Token" : (forceReconnect ? "强制重连" : "页面要求")}`);

        // 先彻底关闭旧连接
        if (wsConnections.value[tokenId]) {
          wsLogger.info(`关闭旧连接以进行重连 [${tokenId}]`);
          await closeWebSocketConnectionAsync(tokenId);
          // 清除连接状态
          delete wsConnections.value[tokenId];
        }

        // 获取最新的token信息
        const updatedToken = gameTokens.value.find((t) => t.id === tokenId);
        if (updatedToken) {
          // 直接创建新连接，不依赖selectToken
          wsLogger.info(`使用新Token创建连接 [${tokenId}]`);
          await createWebSocketConnection(tokenId, updatedToken.token, updatedToken.wsUrl);

          // 如果是当前选中的Token，刷新游戏数据
          if (isCurrentToken) {
            wsLogger.info(`当前Token重连成功，刷新游戏数据 [${tokenId}]`);
            // 等待连接建立后再刷新数据
            await new Promise((resolve) => setTimeout(resolve, 1000));
            refreshGameData(tokenId);
          }
        }
      }
      return true;
    } else {
      wsLogger.error(`Token刷新失败，请手动重新导入 [${tokenId}] - ${errorMessage}`);
      // 失败时增加冷却时间（已经在前面处理了）
      return false;
    }
  };

  // 游戏消息处理
  const handleGameMessage = async (
    tokenId: string,
    message: ProtoMsg,
    client: any,
  ) => {
    try {
      if (!message) {
        gameLogger.warn(`消息处理跳过 [${tokenId}]: 无效消息`);
        return;
      }
      if (message.error) {
        const errText = String(message.error).toLowerCase();

        // 检查是否是Token相关错误
        if (errText.includes("token") && (errText.includes("expired") || errText.includes("error"))) {
          const conn = wsConnections.value[tokenId];
          if (conn) {
            conn.status = "error";
            conn.lastError = {
              timestamp: new Date().toISOString(),
              error: message.error,
            };
          }

          const gameToken = gameTokens.value.find((t) => t.id === tokenId);
          if (gameToken && !refreshingTokenIds.value.has(tokenId)) {
            // 调用统一的Token刷新逻辑（带保护检查）
            wsLogger.info(`检测到Token错误，尝试自动刷新 [${tokenId}]`);
            const refreshed = await attemptTokenRefresh(tokenId);
            if (!refreshed) {
              wsLogger.warn(`Token 刷新失败 [${tokenId}]，请检查Token是否有效或重新导入`);
            }
          } else if (refreshingTokenIds.value.has(tokenId)) {
            wsLogger.debug(`Token正在刷新中，跳过重复刷新请求 [${tokenId}]`);
          }
        } else {
          // 非Token错误的其他错误
          gameLogger.warn(`消息处理跳过 [${tokenId}]:`, message.error);
        }
        return;
      }

      const cmd = message.cmd?.toLowerCase();
      const body = message.getData();

      if (cmd === "role_getroleinforesp") {
        syncRandomSeedFromStatistics(tokenId, body, client);

        // 更新角色信息（当前选中token）
        if (body?.role) {
          gameData.value.roleInfo = body.role;
          gameData.value.lastUpdated = new Date().toISOString();
          wsLogger.debug(`更新角色信息 [${tokenId}]`);

          // 同时更新到tokenGameDataMap（用于批量显示）
          updateTokenGameData(tokenId, { roleInfo: body });
        }

        // 更新头像
        if (body?.role?.headImg) {
          const token = gameTokens.value.find((t) => t.id === tokenId);
          if (token && token.avatar !== body.role.headImg) {
            updateToken(tokenId, { avatar: body.role.headImg });
            wsLogger.debug(`更新头像 [${tokenId}]: ${body.role.headImg}`);
          }
        }
      } else if (cmd === "legion_getinforesp") {
        // 更新俱乐部信息（当前选中token）
        if (body) {
          gameData.value.legionInfo = body;
          gameData.value.lastUpdated = new Date().toISOString();
          wsLogger.debug(`更新俱乐部信息 [${tokenId}]`);

          // 同时更新到tokenGameDataMap
          updateTokenGameData(tokenId, { legionInfo: body });
        }
      } else if (cmd === "car_getrolecarresp") {
        // 更新赛车信息（当前选中token）
        if (body) {
          gameData.value.carInfo = body;
          gameData.value.lastUpdated = new Date().toISOString();
          wsLogger.debug(`更新赛车信息 [${tokenId}]`);

          // 同时更新到tokenGameDataMap
          updateTokenGameData(tokenId, { carInfo: body });
        }
      } else if (cmd === "evotowerinforesp" || cmd === "evotower_getinforesp" || cmd === "evotower_getinfo") {
        // 更新怪异塔信息（当前选中token）
        if (body) {
          gameData.value.evoTowerInfo = body;
          gameData.value.lastUpdated = new Date().toISOString();
          wsLogger.debug(`更新怪异塔信息 [${tokenId}]`);

          // 同时更新到tokenGameDataMap（用于批量显示）
          updateTokenGameData(tokenId, { evoTowerInfo: body });
        }
      } else if (cmd === "nmext_getinforesp" || cmd === "nmext_getinfo") {
        // 更新星级挑战信息（当前选中token）
        console.log("[tokenStore] 收到星级挑战响应, cmd:", cmd, "body:", body);
        const nmextData = body?.roleNMExt || body;
        console.log("[tokenStore] 解析后的 nmextData:", nmextData);
        if (nmextData) {
          gameData.value.nmextInfo = nmextData;
          gameData.value.lastUpdated = new Date().toISOString();
          wsLogger.debug(`更新星级挑战信息 [${tokenId}]`);
          console.log("[tokenStore] 已更新 gameData.nmextInfo:", gameData.value.nmextInfo);

          // 同时更新到tokenGameDataMap（用于批量显示）
          updateTokenGameData(tokenId, { nmextInfo: nmextData });
        }
      }

      emitPlus(cmd, {
        tokenId,
        body,
        message,
        client,
        gameData,
      });

      gameLogger.gameMessage(tokenId, cmd, !!body);
    } catch (error) {
      gameLogger.error(`处理消息失败 [${tokenId}]:`, error);
    }
  };

  // 验证token有效性
  const validateToken = (token: any) => {
    if (!token)
      return false;
    if (typeof token !== "string")
      return false;
    if (token.trim().length === 0)
      return false;
    // 简单检查：token应该至少有一定长度
    if (token.trim().length < 10)
      return false;
    return true;
  };

  // Base64解析功能（增强版）
  const parseBase64Token = (base64String: string) => {
    try {
      // 输入验证
      if (!base64String || typeof base64String !== "string") {
        throw new Error("Token字符串无效");
      }

      // 移除可能的前缀和空格
      const cleanBase64 = base64String.replace(/^data:.*base64,/, "").trim();

      if (cleanBase64.length === 0) {
        throw new Error("Token字符串为空");
      }

      // 解码base64
      let decoded;
      try {
        decoded = atob(cleanBase64);
      } catch (decodeError) {
        // 如果不是有效的Base64，作为纯文本token处理
        decoded = base64String.trim();
      }

      // 尝试解析为JSON
      let tokenData;
      try {
        tokenData = JSON.parse(decoded);
      } catch {
        // 不是JSON格式，作为纯token处理
        tokenData = { token: decoded };
      }

      // 提取实际token
      const actualToken = tokenData.token || tokenData.gameToken || decoded;

      // 验证token有效性
      if (!validateToken(actualToken)) {
        throw new Error(`提取的token无效: "${actualToken}"`);
      }

      return {
        success: true,
        data: {
          ...tokenData,
          actualToken, // 添加提取出的实际token
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `解析失败：${error.message}`,
      };
    }
  };

  const importBase64Token = (
    name: string,
    base64String: string,
    additionalInfo = {},
  ) => {
    const parseResult = parseBase64Token(base64String);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        message: `Token "${name}" 导入失败: ${parseResult.error}`,
      };
    }

    const tokenData = {
      name,
      token: parseResult.data.actualToken, // 使用验证过的实际token
      ...additionalInfo,
      ...parseResult.data, // 解析出的数据覆盖手动输入
    };

    try {
      const newToken = addToken(tokenData);

      // 添加更多验证信息到成功消息
      const tokenInfo = parseResult.data.actualToken;
      const displayToken
        = tokenInfo.length > 20
          ? `${tokenInfo.substring(0, 10)}...${tokenInfo.substring(tokenInfo.length - 6)}`
          : tokenInfo;

      return {
        success: true,
        token: newToken,
        tokenName: name,
        message: `Token "${name}" 导入成功`,
        details: `实际Token: ${displayToken}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Token "${name}" 添加失败: ${error.message}`,
      };
    }
  };

  // 连接管理辅助函数
  const generateSessionId = () =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const currentSessionId = generateSessionId();

  // 获取连接锁
  const acquireConnectionLock = async (
    tokenId: string,
    operation = "connect",
  ) => {
    const lockKey = `${tokenId}_${operation}`;
    const connect = connectionLocks.value;
    if (connect[lockKey]) {
      wsLogger.debug(`等待连接锁释放: ${tokenId} (${operation})`);
      // ✅ 增加等待时间到30秒，适应批量连接场景
      let attempts = 0;
      const maxAttempts = 300; // 30秒 (300 * 100ms)
      while (connect[lockKey] && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
        // ✅ 每5秒输出一次等待日志
        if (attempts % 50 === 0) {
          wsLogger.debug(`连接锁等待中: ${tokenId} (${operation}) - ${Math.floor(attempts / 10)}秒`);
        }
      }
      if (connect[lockKey]) {
        wsLogger.warn(`连接锁等待超时: ${tokenId} (${operation}) - 前一个操作可能卡住`);
        // ✅ 强制释放旧锁，允许新操作继续
        wsLogger.warn(`强制释放旧锁: ${lockKey}`);
        delete connect[lockKey];
      }
    }
    connect[lockKey] = {
      tokenId,
      operation,
      timestamp: Date.now(),
      sessionId: currentSessionId,
    };
    wsLogger.connectionLock(tokenId, operation, true);
    return true;
  };

  // 释放连接锁
  const releaseConnectionLock = (tokenId: string, operation = "connect") => {
    const lockKey = `${tokenId}_${operation}`;
    if (connectionLocks.value[lockKey]) {
      delete connectionLocks.value[lockKey];
      wsLogger.connectionLock(tokenId, operation, false);
    }
  };

  // 更新跨标签页连接状态
  const updateCrossTabConnectionState = (
    tokenId: string,
    action: string,
    sessionId: string = currentSessionId,
  ) => {
    const state = useLocalStorage(`ws_connection_${tokenId}`, {
      action, // 'connecting', 'connected', 'disconnecting', 'disconnected'
      sessionId,
      timestamp: Date.now(),
      url: window.location.href,
    });

    if (activeConnections.value) {
      activeConnections.value[tokenId] = state.value;
    }
  };

  // 检查是否有其他标签页的活跃连接
  const crossTabLoggedTokens = new Set<string>(); // 记录已输出日志的token
  const checkCrossTabConnection = (tokenId: string) => {
    const storageKey = `ws_connection_${tokenId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const state = JSON.parse(stored);
        const isRecent = Date.now() - state.timestamp < 30000; // 30秒内的状态认为是活跃的
        const isDifferentSession = state.sessionId !== currentSessionId;

        if (
          isRecent
          && isDifferentSession
          && (state.action === "connecting" || state.action === "connected")
        ) {
          // 只在首次检测到时输出日志，避免刷屏
          if (!crossTabLoggedTokens.has(tokenId)) {
            wsLogger.debug(`检测到其他标签页的活跃连接: ${tokenId}`);
            crossTabLoggedTokens.add(tokenId);

            // 30秒后清除记录，允许再次提示
            setTimeout(() => {
              crossTabLoggedTokens.delete(tokenId);
            }, 30000);
          }
          return state;
        }
      }
    } catch (error) {
      wsLogger.warn("检查跨标签页连接状态失败:", error);
    }
    return null;
  };

  // 获取连接状态（兼容跨标签页场景）
  const getWebSocketStatus = (tokenId: string): string => {
    const connection = wsConnections.value[tokenId];
    if (connection) {
      return connection.status;
    }

    // 如果本地没有连接，检查是否有其他标签页的活跃连接
    const crossTabState = checkCrossTabConnection(tokenId);
    if (crossTabState) {
      return crossTabState.action;
    }

    return "disconnected";
  };

  // WebSocket连接管理（重构版 - 防重连）
  const createWebSocketConnection = async (
    tokenId: string,
    base64Token: string,
    customWsUrl = null,
    onConnect?: () => void,
  ) => {
    wsLogger.info(`开始创建连接: ${tokenId}`);

    // 清除主动断开标记，允许后续自动重连
    intentionallyDisconnected.delete(tokenId);

    // 1. 获取连接锁，防止竞态条件
    const lockAcquired = await acquireConnectionLock(tokenId, "connect");
    if (!lockAcquired) {
      wsLogger.error(`无法获取连接锁: ${tokenId}`);
      return null;
    }

    try {
      // 2. 检查跨标签页连接状态
      const crossTabState = checkCrossTabConnection(tokenId);
      if (crossTabState) {
        wsLogger.debug(`跳过创建，其他标签页已有连接: ${tokenId}`);
        releaseConnectionLock(tokenId, "connect");
        return null;
      }

      // 3. 更新跨标签页状态为连接中
      updateCrossTabConnectionState(tokenId, "connecting");

      // 4. 如果存在现有连接，先优雅关闭
      if (wsConnections.value[tokenId]) {
        wsLogger.debug(`优雅关闭现有连接: ${tokenId}`);
        await closeWebSocketConnectionAsync(tokenId);
      }

      // 5. 解析token
      const parseResult = parseBase64Token(base64Token);
      let actualToken;
      if (parseResult.success) {
        actualToken = parseResult.data.actualToken;
      } else {
        if (validateToken(base64Token)) {
          actualToken = base64Token;
        } else {
          throw new Error(`Token无效: ${parseResult.error}`);
        }
      }
      // 6. 构建WebSocket URL
      const baseWsUrl = `wss://xxz-xyzw.hortorgames.com/agent?p=${encodeURIComponent(actualToken)}&e=x&lang=chinese`;

      const wsUrl = customWsUrl || baseWsUrl;

      wsLogger.debug(
        `Token: ${actualToken.substring(0, 10)}...${actualToken.slice(-4)}`,
      );

      // 7. 创建新的WebSocket客户端（增强版）
      const wsClient = new XyzwWebSocketClient({
        url: wsUrl,
        utils: g_utils,
        heartbeatMs: 5000,
        idleTimeout: 5 * 60 * 1000, // 5分钟空闲超时
      });

      // 8. 设置连接状态（带会话ID）
      wsConnections.value[tokenId] = {
        client: wsClient,
        status: "connecting",
        tokenId,
        wsUrl,
        actualToken,
        sessionId: currentSessionId,
        connectedAt: null,
        lastMessage: null,
        lastError: null,
        reconnectAttempts: 0,
        randomSeedSynced: false,
        lastRandomSeedSource: null,
        lastRandomSeed: null,
      };

      // 9. 设置事件监听（增强版）
      wsClient.onConnect = () => {
        wsLogger.wsConnect(tokenId);
        if (wsConnections.value[tokenId]) {
          wsConnections.value[tokenId].status = "connected";
          wsConnections.value[tokenId].connectedAt = new Date().toISOString();
          wsConnections.value[tokenId].reconnectAttempts = 0;
          wsConnections.value[tokenId].randomSeedSynced = false;
          wsConnections.value[tokenId].lastRandomSeedSource = null;
          wsConnections.value[tokenId].lastRandomSeed = null;
        }
        // 连接成功，重置断开刷新计数
        disconnectRefreshCount.value[tokenId] = 0;
        updateCrossTabConnectionState(tokenId, "connected");
        releaseConnectionLock(tokenId, "connect");
        localStorage.removeItem("xyzw_chat_msg_list");
        try {
          wsClient.send("role_getroleinfo");
        } catch (error) {
          wsLogger.warn(`初始化角色信息请求失败 [${tokenId}]`, error);
        }
        // 调用传入的onConnect回调
        if (onConnect) {
          try {
            onConnect();
          } catch (error) {
            wsLogger.error(`onConnect回调执行失败 [${tokenId}]:`, error);
          }
        }
      };

      wsClient.onDisconnect = async (event) => {
        const reason = event.code === 1006 ? "异常断开" : event.reason || "";
        wsLogger.wsDisconnect(tokenId, reason);
        if (wsConnections.value[tokenId]) {
          const conn = wsConnections.value[tokenId];
          conn.status = "disconnected";
          conn.randomSeedSynced = false;

          // 如果连接异常断开(1006)且从未连接成功(握手失败)，尝试刷新Token
          // connectedAt 为 null 表示 socket.onopen 还没触发就断开了，通常意味着握手失败（如403 Forbidden）
          // 添加额外检查：只有当token不在刷新中时才尝试刷新
          const refreshCount = disconnectRefreshCount.value[tokenId] || 0;
          if (event.code === 1006 && !conn.connectedAt && !refreshingTokenIds.value.has(tokenId) && refreshCount < MAX_DISCONNECT_REFRESH) {
            disconnectRefreshCount.value[tokenId] = refreshCount + 1;
            wsLogger.warn(`检测到握手失败(1006)，尝试刷新Token (${refreshCount + 1}/${MAX_DISCONNECT_REFRESH}) [${tokenId}]`);
            // 强制刷新并重连
            await attemptTokenRefresh(tokenId, true);
          } else if (event.code === 1006 && !conn.connectedAt && refreshCount >= MAX_DISCONNECT_REFRESH) {
            wsLogger.error(`握手失败(1006)已达最大自动刷新次数(${MAX_DISCONNECT_REFRESH})，停止自动重连 [${tokenId}]，请手动重新连接`);
          }
        }
        updateCrossTabConnectionState(tokenId, "disconnected");
      };

      wsClient.onError = (error) => {
        wsLogger.wsError(tokenId, error);
        if (wsConnections.value[tokenId]) {
          wsConnections.value[tokenId].status = "error";
          wsConnections.value[tokenId].lastError = {
            timestamp: new Date().toISOString(),
            error: error.toString(),
            url: wsUrl,
          };
        }
        releaseConnectionLock(tokenId, "connect");
      };

      // 10. 设置消息监听
      wsClient.setMessageListener((message: ProtoMsg) => {
        const cmd = message?.cmd || "unknown";
        wsLogger.wsMessage(tokenId, cmd, true);

        if (wsConnections.value[tokenId]) {
          wsConnections.value[tokenId].lastMessage = {
            timestamp: new Date().toISOString(),
            data: message,
            cmd: message?.cmd,
          };
          handleGameMessage(tokenId, message, wsClient);
        }
      });

      // 11. 初始化连接
      wsClient.init();

      wsLogger.verbose(`WebSocket客户端创建成功: ${tokenId}`);
      return wsClient;
    } catch (error) {
      wsLogger.error(`创建连接失败 [${tokenId}]:`, error);
      updateCrossTabConnectionState(tokenId, "disconnected");
      releaseConnectionLock(tokenId, "connect");
      return null;
    }
  };

  // 异步版本的关闭连接（优雅关闭）
  const closeWebSocketConnectionAsync = async (tokenId: string) => {
    const lockAcquired = await acquireConnectionLock(tokenId, "disconnect");
    if (!lockAcquired) {
      wsLogger.warn(`无法获取断开连接锁: ${tokenId}`);
      return;
    }

    try {
      // 标记为主动断开，禁止 refreshGameData 自动重连
      intentionallyDisconnected.add(tokenId);

      const connection = wsConnections.value[tokenId];
      if (connection && connection.client) {
        wsLogger.debug(`开始优雅关闭连接: ${tokenId}`);

        connection.status = "disconnecting";
        updateCrossTabConnectionState(tokenId, "disconnecting");

        connection.client.disconnect();

        // 等待连接完全关闭
        await new Promise((resolve) => {
          const checkDisconnected = () => {
            if (!connection.client.connected) {
              resolve();
            } else {
              setTimeout(checkDisconnected, 100);
            }
          };
          setTimeout(resolve, 5000); // 最多等待5秒
          checkDisconnected();
        });

        delete wsConnections.value[tokenId];
        updateCrossTabConnectionState(tokenId, "disconnected");
        wsLogger.info(`连接已优雅关闭: ${tokenId}`);
      }
    } catch (error) {
      wsLogger.error(`关闭连接失败 [${tokenId}]:`, error);
    } finally {
      releaseConnectionLock(tokenId, "disconnect");
    }
  };

  // 同步版本的关闭连接（保持向后兼容）
  const closeWebSocketConnection = (tokenId: string) => {
    // 同步标记主动断开，防止 refreshGameData 触发自动重连
    intentionallyDisconnected.add(tokenId);
    closeWebSocketConnectionAsync(tokenId).catch((error) => {
      wsLogger.error(`关闭连接异步操作失败 [${tokenId}]:`, error);
    });
  };

  // 主动断开连接标记（供批量任务调用，禁止自动重连）
  const markIntentionalDisconnect = (tokenId: string) => {
    intentionallyDisconnected.add(tokenId);
  };

  // 获取WebSocket客户端
  const getWebSocketClient = (tokenId: string) => {
    return wsConnections.value[tokenId]?.client || null;
  };

  // 设置消息监听器
  const setMessageListener = (listener: any) => {
    if (selectedToken.value) {
      const connection = wsConnections.value[selectedToken.value.id];
      if (connection && connection.client) {
        connection.client.setMessageListener(listener);
      }
    }
  };

  // 设置是否显示消息
  const setShowMsg = (show: any) => {
    if (selectedToken.value) {
      const connection = wsConnections.value[selectedToken.value.id];
      if (connection && connection.client) {
        connection.client.setShowMsg(show);
      }
    }
  };

  // 发送消息到WebSocket
  const sendMessage = (
    tokenId: string,
    cmd: string,
    params = {},
    options = {},
  ) => {
    const connection = wsConnections.value[tokenId];
    if (!connection || connection.status !== "connected") {
      wsLogger.error(`WebSocket未连接，无法发送消息 [${tokenId}]`);
      return false;
    }

    try {
      const client = connection.client;
      if (!client) {
        wsLogger.error(`WebSocket客户端不存在 [${tokenId}]`);
        return false;
      }

      client.send(cmd, params, options);
      wsLogger.wsMessage(tokenId, cmd, false);

      return true;
    } catch (error) {
      wsLogger.error(`发送失败 [${tokenId}] ${cmd}:`, error.message);
      return false;
    }
  };

  // Promise版发送消息
  const sendMessageWithPromise = async (
    tokenId: string,
    cmd: string,
    params = {},
    timeout = 5000,
  ) => {
    const connection = wsConnections.value[tokenId];
    if (!connection || connection.status !== "connected") {
      return Promise.reject(new Error(`WebSocket未连接 [${tokenId}]`));
    }

    const client = connection.client;
    if (!client) {
      return Promise.reject(new Error(`WebSocket客户端不存在 [${tokenId}]`));
    }

    // 为战斗相关命令自动注入 battleVersion
    const battleCommands = [
      "fight_startareaarena",
      "fight_startpvp",
      "fight_starttower",
      "fight_startboss",
      "fight_startlegionboss",
      "fight_startdungeon",
    ];
    if (battleCommands.includes(cmd)) {
      const battleVersion = gameData.value.battleVersion;
      params = { battleVersion, ...params };
      wsLogger.info(
        `⚔️ [战斗命令] 注入 battleVersion: ${battleVersion} [${cmd}]`,
      );
    }

    try {
      const result = await client.sendWithPromise(cmd, params, timeout);

      // 特殊日志：fight_starttower 响应
      if (cmd === "fight_starttower") {
        wsLogger.info(`🗼 [咸将塔] 收到爬塔响应 [${tokenId}]:`, result);
      }

      return result;
    } catch (error) {
      // 特殊日志：fight_starttower 错误
      if (cmd === "fight_starttower") {
        wsLogger.error(`🗼 [咸将塔] 爬塔请求失败 [${tokenId}]:`, error.message);
      }
      return Promise.reject(error);
    }
  };

  // 发送心跳消息
  const sendHeartbeat = (tokenId: string) => {
    return sendMessage(tokenId, "heart_beat");
  };

  // 发送获取角色信息请求（异步处理）
  const sendGetRoleInfo = async (
    tokenId: string,
    params = {},
    retryCount = 0,
  ) => {
    try {
      // 增加超时时间到15秒，并添加重试机制
      const timeout = 15000;
      const roleInfo = await sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        params,
        timeout,
      );

      // 手动更新游戏数据（因为响应可能不会自动触发消息处理）
      if (roleInfo) {
        gameData.value.roleInfo = roleInfo;
        gameData.value.lastUpdated = new Date().toISOString();
        gameLogger.verbose("角色信息已通过 Promise 更新");
      }

      // 获取月度任务数据
      try {
        await sendGetMonthlyActivity(tokenId);
      } catch (error) {
        gameLogger.warn(`获取月度任务数据失败 [${tokenId}]:`, error.message);
      }

      return roleInfo;
    } catch (error) {
      gameLogger.error(`获取角色信息失败 [${tokenId}]:`, error.message);

      // 重试机制：最多重试2次，每次间隔1秒
      if (retryCount < 2) {
        gameLogger.info(
          `正在重试获取角色信息 [${tokenId}]，重试次数: ${retryCount + 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return sendGetRoleInfo(tokenId, params, retryCount + 1);
      }

      throw error;
    }
  };

  // 发送获取月度任务数据请求
  const sendGetMonthlyActivity = async (tokenId: string) => {
    try {
      const result = await sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        10000,
      );
      const act = result?.activity || result?.body?.activity || result;
      if (act) {
        // 更新到tokenGameDataMap（用于批量显示）
        updateTokenGameData(tokenId, { monthActivity: act });
        // 更新当前选中token的游戏数据
        if (selectedTokenId.value === tokenId) {
          gameData.value.monthActivity = act;
        }
      }
      return act;
    } catch (error) {
      gameLogger.error(`获取月度任务数据失败 [${tokenId}]:`, error.message);
      throw error;
    }
  };

  // 发送获取数据版本请求
  const sendGetDataBundleVersion = (tokenId: string, params = {}) => {
    return sendMessageWithPromise(tokenId, "system_getdatabundlever", params);
  };

  // 发送签到请求
  const sendSignIn = (tokenId: string) => {
    return sendMessageWithPromise(tokenId, "system_signinreward");
  };

  // 发送领取日常任务奖励
  const sendClaimDailyReward = (tokenId: string, rewardId = 0) => {
    return sendMessageWithPromise(tokenId, "task_claimdailyreward", {
      rewardId,
    });
  };

  // 发送获取队伍信息
  const sendGetTeamInfo = (tokenId: string, params = {}) => {
    return sendMessageWithPromise(tokenId, "presetteam_getinfo", params);
  };

  // 发送消息到世界
  const sendMessageToWorld = (tokenId: string, message: string) => {
    return sendMessageWithPromise(tokenId, "system_sendchatmessage", { channel: 1, emojiId: 0, extra: null, msg: message, msgType: 1 });
  };
  // 发送消息到俱乐部
  const sendMessageToLegion = (tokenId: string, message: string) => {
    return sendMessageWithPromise(tokenId, "system_sendchatmessage", { channel: 2, emojiId: 0, extra: null, msg: message, msgType: 1 });
  };

  // 发送自定义游戏消息
  const sendGameMessage = (
    tokenId: string,
    cmd: string,
    params = {},
    options = {},
  ) => {
    if (options.usePromise) {
      return sendMessageWithPromise(tokenId, cmd, params, options.timeout);
    } else {
      return sendMessage(tokenId, cmd, params, options);
    }
  };

  // 获取当前塔层数
  const getCurrentTowerLevel = () => {
    try {
      // 从游戏数据中获取塔信息
      const roleInfo = gameData.value.roleInfo;
      if (!roleInfo || !roleInfo.role) {
        gameLogger.warn("角色信息不存在");
        return null;
      }

      const tower = roleInfo.role.tower;
      if (!tower) {
        gameLogger.warn("塔信息不存在");
        return null;
      }

      // 可能的塔层数字段（根据实际数据结构调整）
      const level
        = tower.level || tower.currentLevel || tower.floor || tower.stage;

      // 当前塔层数
      return level;
    } catch (error) {
      gameLogger.error("获取塔层数失败:", error);
      return null;
    }
  };

  // 获取详细塔信息
  const getTowerInfo = () => {
    try {
      const roleInfo = gameData.value.roleInfo;
      if (!roleInfo || !roleInfo.role) {
        return null;
      }

      return roleInfo.role.tower || null;
    } catch (error) {
      gameLogger.error("获取塔信息失败:", error);
      return null;
    }
  };

  // 自动刷新Token的定时器
  let autoRefreshTimer: number | null = null;

  // 正在执行任务的Token ID集合
  const runningTokens = ref<Set<string>>(new Set());

  // 标记Token为正在执行任务
  const setTokenRunning = (tokenId: string, isRunning: boolean) => {
    if (isRunning) {
      runningTokens.value.add(tokenId);
      tokenLogger.debug(`Token标记为正在执行任务: ${tokenId}`);
    } else {
      runningTokens.value.delete(tokenId);
      tokenLogger.debug(`Token标记为任务完成: ${tokenId}`);
    }
  };

  // 检查Token是否正在执行任务
  const isTokenRunning = (tokenId: string): boolean => {
    return runningTokens.value.has(tokenId);
  };

  // 启动自动刷新Token（已禁用）
  const startAutoRefresh = () => {
    tokenLogger.info("自动刷新Token功能已禁用");
    // 原有的每3小时自动刷新逻辑已取消
    // 如需启用，请在定时任务执行前手动刷新Token
  };

  // 停止自动刷新Token
  const stopAutoRefresh = () => {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
      tokenLogger.info("自动刷新Token已停止");
    }
  };

  // 工具方法
  const exportTokens = () => {
    return {
      tokens: gameTokens.value,
      exportedAt: new Date().toISOString(),
      version: "2.0",
    };
  };

  const importTokens = (data: any) => {
    try {
      if (data.tokens && Array.isArray(data.tokens)) {
        gameTokens.value = data.tokens;
        return {
          success: true,
          message: `成功导入 ${data.tokens.length} 个Token`,
        };
      } else {
        return { success: false, message: "导入数据格式错误" };
      }
    } catch (error) {
      return { success: false, message: `导入失败：${error.message}` };
    }
  };

  const clearAllTokens = async () => {
    // 关闭所有WebSocket连接
    Object.keys(wsConnections.value).forEach((tokenId) => {
      closeWebSocketConnection(tokenId);
    });

    gameTokens.value = [];
    selectedTokenId.value = null;

    // 清空IndexedDB
    await clearAll();
  };

  const cleanExpiredTokens = async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 找出需要清理的token
    const tokensToRemove = gameTokens.value.filter((token) => {
      // URL和bin文件导入的token设为长期有效，不会过期
      // 升级为长期有效的token也不会过期
      if (
        token.importMethod === "url"
        || token.importMethod === "bin"
        || token.importMethod === "wxQrcode"
        || token.upgradedToPermanent
      ) {
        return false;
      }
      // 手动导入的token按原逻辑处理（24小时过期）
      const lastUsed = new Date(token.lastUsed || token.createdAt);
      return lastUsed <= oneDayAgo;
    });

    const cleanedCount = tokensToRemove.length;

    // 逐个删除，触发清理逻辑（WebSocket断开、IndexedDB删除等）
    for (const token of tokensToRemove) {
      await removeToken(token.id);
    }

    return cleanedCount;
  };

  // 将现有token升级为长期有效
  const upgradeTokenToPermanent = (tokenId: string) => {
    const token = gameTokens.value.find((t) => t.id === tokenId);
    if (
      token
      && !token.upgradedToPermanent
      && token.importMethod !== "url"
      && token.importMethod !== "bin"
      && token.importMethod !== "wxQrcode"
    ) {
      updateToken(tokenId, {
        upgradedToPermanent: true,
        upgradedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  };

  // 检查Token是否即将过期（剩余时间小于1小时）
  const isTokenExpiringSoon = (token: TokenData): boolean => {
    if (token.upgradedToPermanent)
      return false; // 长期有效Token不需要检查
    if (!token.expiresAt)
      return true; // 没有过期时间的Token需要检查

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    return timeUntilExpiry < 60 * 60 * 1000; // 1小时内过期
  };

  // 定期检查并刷新即将过期的Token
  let tokenRefreshInterval: number | null = null;

  const startTokenRefreshInterval = () => {
    // 每30分钟检查一次
    if (tokenRefreshInterval)
      clearInterval(tokenRefreshInterval);

    tokenRefreshInterval = window.setInterval(async () => {
      wsLogger.info("开始定期检查Token状态");

      // 过滤出需要检查的Token
      const tokensToCheck = gameTokens.value.filter((token) => {
        // 跳过长期有效Token和手动导入的Token
        if (token.upgradedToPermanent)
          return false;
        if (token.importMethod === "manual")
          return false;
        return true;
      });

      wsLogger.info(`检查 ${tokensToCheck.length} 个Token的过期状态`);

      // 检查并刷新即将过期的Token
      let refreshedCount = 0;
      for (const token of tokensToCheck) {
        try {
          // 检查是否需要刷新
          if (isTokenExpiringSoon(token)) {
            wsLogger.info(`Token即将过期，尝试刷新: ${token.name} [${token.id}]`);
            const success = await attemptTokenRefresh(token.id);
            if (success) {
              refreshedCount++;
              wsLogger.info(`Token刷新成功: ${token.name}`);
            } else {
              wsLogger.warn(`Token刷新失败: ${token.name}`);
            }
            // 添加短暂延迟避免请求过于频繁
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          wsLogger.warn(`检查Token状态时出错 [${token.name}]:`, error.message);
        }
      }

      wsLogger.info(`Token定期检查完成，成功刷新 ${refreshedCount} 个Token`);
    }, 30 * 60 * 1000); // 30分钟

    wsLogger.info("Token定期刷新任务已启动");
  };

  // 停止定期检查
  const stopTokenRefreshInterval = () => {
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      tokenRefreshInterval = null;
      wsLogger.info("Token定期刷新任务已停止");
    }
  };

  // 连接唯一性验证和监控
  const validateConnectionUniqueness = (tokenId: string) => {
    const connections = Object.values(wsConnections.value).filter(
      (conn) =>
        conn.tokenId === tokenId
        && (conn.status === "connecting" || conn.status === "connected"),
    );

    if (connections.length > 1) {
      wsLogger.warn(
        `检测到重复连接: ${tokenId}, 连接数: ${connections.length}`,
      );
      // 保留最新的连接，关闭旧连接
      const sortedConnections = connections.sort(
        (a, b) => new Date(b.connectedAt || 0) - new Date(a.connectedAt || 0),
      );

      for (let i = 1; i < sortedConnections.length; i++) {
        const oldConnection = sortedConnections[i];
        wsLogger.debug(`关闭重复连接: ${tokenId}`);
        closeWebSocketConnectionAsync(oldConnection.tokenId);
      }

      return false; // 检测到重复连接
    }

    return true; // 连接唯一
  };

  // 连接监控和清理
  const connectionMonitor = {
    // 定期检查连接状态
    startMonitoring: () => {
      setInterval(() => {
        const now = Date.now();

        // 检查连接超时（超过30秒未活动）
        Object.entries(wsConnections.value).forEach(([tokenId, connection]) => {
          const lastActivity
            = connection.lastMessage?.timestamp || connection.connectedAt;
          if (lastActivity) {
            const timeSinceActivity = now - new Date(lastActivity).getTime();
            if (
              timeSinceActivity > 30000
              && connection.status === "connected"
            ) {
              wsLogger.warn(`检测到连接可能已断开: ${tokenId}`);
              // 发送心跳检测
              if (connection.client) {
                connection.client.sendHeartbeat();
              }
            }
          }
        });

        // 清理过期的连接锁（超过10分钟）
        Object.entries(connectionLocks.value).forEach(([tokenId, lock]) => {
          if (now - lock.timestamp > 600000) {
            delete connectionLocks.value[tokenId];
            wsLogger.debug(`清理过期连接锁: ${tokenId}`);
          }
        });

        // 清理过期的跨标签页状态（超过5分钟）
        Object.entries(activeConnections.value).forEach(([tokenId, state]) => {
          if (now - state.timestamp > 300000) {
            wsLogger.debug(`清理过期跨标签页状态: ${tokenId}`);
            delete activeConnections.value[tokenId];
            localStorage.removeItem(`ws_connection_${tokenId}`);
          }
        });
      }, 10000); // 每10秒检查一次
    },

    // 获取连接统计信息
    getStats: () => {
      const duplicateTokens: string[] = [];
      const stats = {
        totalConnections: Object.keys(wsConnections.value).length,
        connectedCount: 0,
        connectingCount: 0,
        disconnectedCount: 0,
        errorCount: 0,
        duplicateTokens,
        activeLocks: Object.keys(connectionLocks.value).length,
        crossTabStates: Object.keys(activeConnections.value).length,
      };

      // 统计连接状态
      const tokenCounts = new Map();
      Object.values(wsConnections.value).forEach((connection) => {
        stats[`${connection.status}Count`]++;

        // 检测重复token
        const count = tokenCounts.get(connection.tokenId) || 0;
        tokenCounts.set(connection.tokenId, count + 1);

        if (count > 0) {
          stats.duplicateTokens.push(connection.tokenId);
        }
      });

      return stats;
    },

    // 强制清理所有连接
    forceCleanup: async () => {
      wsLogger.info("开始强制清理所有连接...");

      const cleanupPromises = Object.keys(wsConnections.value).map((tokenId) =>
        closeWebSocketConnectionAsync(tokenId),
      );

      await Promise.all(cleanupPromises);

      // 清理所有锁和状态
      Object.keys(connectionLocks.value).forEach((key) => {
        delete connectionLocks.value[key];
      });
      Object.keys(activeConnections.value).forEach((key) => {
        delete activeConnections.value[key];
      });

      // 清理localStorage中的跨标签页状态
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("ws_connection_")) {
          localStorage.removeItem(key);
        }
      });

      wsLogger.info("强制清理完成");
    },
  };

  // 监听localStorage变化（跨标签页通信）
  const setupCrossTabListener = () => {
    window.addEventListener("storage", (event) => {
      if (event.key?.startsWith("ws_connection_")) {
        const tokenId = event.key.replace("ws_connection_", "");
        wsLogger.debug(
          `检测到跨标签页连接状态变化: ${tokenId}`,
          event.newValue,
        );

        // 如果其他标签页建立了连接，考虑关闭本标签页的连接
        if (event.newValue) {
          try {
            const newState = JSON.parse(event.newValue);
            const localConnection = wsConnections.value[tokenId];

            if (
              newState.action === "connected"
              && newState.sessionId !== currentSessionId
              && localConnection?.status === "connected"
            ) {
              wsLogger.info(
                `检测到其他标签页已连接同一token，关闭本地连接: ${tokenId}`,
              );
              closeWebSocketConnectionAsync(tokenId);
            }
          } catch (error) {
            wsLogger.warn("解析跨标签页状态失败:", error);
          }
        }
      }
    });
  };

  // 初始化
  const initTokenStore = () => {
    // // 恢复数据
    // const savedTokens = localStorage.getItem('gameTokens')
    // const savedSelectedId = localStorage.getItem('selectedTokenId')

    // if (savedTokens) {
    //   try {
    //     gameTokens.value = JSON.parse(savedTokens)
    //   } catch (error) {
    //     tokenLogger.error('解析Token数据失败:', error.message)
    //     gameTokens.value = []
    //   }
    // }

    // if (savedSelectedId) {
    //   selectedTokenId.value = savedSelectedId
    // }

    // 清理过期token
    cleanExpiredTokens();
    // 启动连接监控
    connectionMonitor.startMonitoring();
    // // 启动自动刷新Token - 已取消
    // startAutoRefresh();

    // 设置跨标签页监听
    setupCrossTabListener();
    tokenLogger.info("Token Store 初始化完成，连接监控已启动");
  };
  const setBattleVersion = (version: number | null) => {
    gameData.value.battleVersion = version;
    gameData.value.lastUpdated = new Date().toISOString();
  };

  const getBattleVersion = () => {
    return gameData.value.battleVersion;
  };

  // =====================
  // Token分组管理方法
  // =====================

  /**
   * 创建新的分组
   */
  const createTokenGroup = (name: string, color: string = "#1677ff") => {
    const group: TokenGroup = {
      id: `group_${Date.now()}${Math.random().toString(36).slice(2)}`,
      name,
      color,
      tokenIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tokenGroups.value.push(group);
    return group;
  };

  /**
   * 删除分组
   */
  const deleteTokenGroup = (groupId: string) => {
    const index = tokenGroups.value.findIndex((g) => g.id === groupId);
    if (index !== -1) {
      tokenGroups.value.splice(index, 1);
    }
  };

  /**
   * 更新分组信息
   */
  const updateTokenGroup = (
    groupId: string,
    updates: Partial<TokenGroup>,
  ) => {
    const group = tokenGroups.value.find((g) => g.id === groupId);
    if (group) {
      Object.assign(group, updates, {
        updatedAt: new Date().toISOString(),
      });
    }
  };

  /**
   * 添加token到分组
   */
  const addTokenToGroup = (groupId: string, tokenId: string) => {
    const group = tokenGroups.value.find((g) => g.id === groupId);
    if (group && !group.tokenIds.includes(tokenId)) {
      group.tokenIds.push(tokenId);
      group.updatedAt = new Date().toISOString();
    }
  };

  /**
   * 从分组移除token
   */
  const removeTokenFromGroup = (groupId: string, tokenId: string) => {
    const group = tokenGroups.value.find((g) => g.id === groupId);
    if (group) {
      const index = group.tokenIds.indexOf(tokenId);
      if (index !== -1) {
        group.tokenIds.splice(index, 1);
        group.updatedAt = new Date().toISOString();
      }
    }
  };

  /**
   * 获取token所属的分组
   */
  const getTokenGroups = (tokenId: string): TokenGroup[] => {
    return tokenGroups.value.filter((g) => g.tokenIds.includes(tokenId));
  };

  /**
   * 获取分组中的所有token ID
   */
  const getGroupTokenIds = (groupId: string): string[] => {
    const group = tokenGroups.value.find((g) => g.id === groupId);
    return group ? group.tokenIds : [];
  };

  /**
   * 获取分组中有效的（存在于gameTokens中的）token ID
   */
  const getValidGroupTokenIds = (groupId: string): string[] => {
    const tokenIds = getGroupTokenIds(groupId);
    const validTokenIds = gameTokens.value.map((t) => t.id);
    return tokenIds.filter((id) => validTokenIds.includes(id));
  };

  /**
   * 移除不存在的token从所有分组
   */
  const cleanupInvalidTokens = () => {
    const validTokenIds = new Set(gameTokens.value.map((t) => t.id));
    tokenGroups.value.forEach((group) => {
      group.tokenIds = group.tokenIds.filter((id) => validTokenIds.has(id));
    });
  };

  // 导出分组
  const exportTokenGroups = () => {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      groups: tokenGroups.value,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `token-groups-${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);

    tokenLogger.info("分组导出成功");
    return true;
  };

  // 导入分组
  const importTokenGroups = (jsonData: string, replace: boolean = false) => {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.groups || !Array.isArray(importData.groups)) {
        throw new Error("无效的分组数据格式");
      }

      // 验证分组数据结构
      const validGroups = importData.groups.filter((group: any) => {
        return group.id && group.name && Array.isArray(group.tokenIds);
      });

      if (validGroups.length === 0) {
        throw new Error("没有有效的分组数据");
      }

      if (replace) {
        // 替换所有分组
        tokenGroups.value = validGroups;
      } else {
        // 合并分组（避免ID冲突）
        const existingIds = new Set(tokenGroups.value.map((g) => g.id));
        const newGroups = validGroups.filter((group: TokenGroup) => !existingIds.has(group.id));
        tokenGroups.value.push(...newGroups);
      }

      // 清理无效的token引用
      cleanupInvalidTokens();

      tokenLogger.info(`成功导入 ${validGroups.length} 个分组`);
      return true;
    } catch (error) {
      tokenLogger.error("分组导入失败:", error);
      throw error;
    }
  };

  // // 启动Token定期刷新任务 - 已取消
  // startTokenRefreshInterval();

  // 清理函数
  onUnmounted(() => {
    stopTokenRefreshInterval();
    stopAutoRefresh();
  });

  return {
    // 状态
    gameTokens,
    selectedTokenId,
    wsConnections,
    gameData,
    tokenAutoRefreshStatus,
    runningTokens,

    // 计算属性
    hasTokens,
    selectedToken,
    selectedTokenRoleInfo,

    // Token管理方法
    addToken,
    updateToken,
    removeToken,
    selectToken,

    // Base64解析方法
    parseBase64Token,
    importBase64Token,

    // WebSocket方法
    createWebSocketConnection,
    closeWebSocketConnection,
    markIntentionalDisconnect,
    getWebSocketStatus,
    getWebSocketClient,
    sendMessage,
    sendMessageWithPromise,
    setMessageListener,
    setShowMsg,
    sendHeartbeat,
    sendGetRoleInfo,
    sendGetDataBundleVersion,
    sendSignIn,
    sendClaimDailyReward,
    sendGetTeamInfo,
    sendGameMessage,
    sendGetMonthlyActivity, // ✅ 刷新月度任务数据

    // 工具方法
    startAutoRefresh,
    stopAutoRefresh,
    exportTokens,
    importTokens,
    clearAllTokens,
    cleanExpiredTokens,
    upgradeTokenToPermanent,
    initTokenStore,
    setTokenRunning,
    isTokenRunning,
    attemptTokenRefresh,
    refreshGameData,

    // 游戏内发送消息方法
    sendMessageToLegion,
    sendMessageToWorld,

    // 塔信息方法
    getCurrentTowerLevel,
    getTowerInfo,

    // battleVersion
    setBattleVersion,
    getBattleVersion,

    // 调试工具方法
    validateToken,
    debugToken: (tokenString: string) => {
      console.log("🔍 Token调试信息:");
      console.log("原始Token:", tokenString);
      const parseResult = parseBase64Token(tokenString);
      console.log("解析结果:", parseResult);
      if (parseResult.success) {
        console.log("实际Token:", parseResult.data.actualToken);
        console.log(
          "Token有效性:",
          validateToken(parseResult.data.actualToken),
        );
      }
      return parseResult;
    },

    // 连接管理增强功能
    validateConnectionUniqueness,
    connectionMonitor,
    currentSessionId: () => currentSessionId,

    // Token分组管理方法
    tokenGroups,
    createTokenGroup,
    deleteTokenGroup,
    updateTokenGroup,
    addTokenToGroup,
    removeTokenFromGroup,
    getTokenGroups,
    getGroupTokenIds,
    getValidGroupTokenIds,
    cleanupInvalidTokens,
    exportTokenGroups,
    importTokenGroups,

    // Token游戏数据管理（用于批量显示）
    tokenGameDataMap,
    getTokenGameData,
    updateTokenGameData,

    // Token活跃度管理（用于批量排序）
    tokenActivityMap,
    getTokenActivity,
    setTokenActivity,

    // 开发者工具
    devTools: {
      getConnectionStats: () => connectionMonitor.getStats(),
      forceCleanup: () => connectionMonitor.forceCleanup(),
      showConnectionLocks: () => Object.keys(connectionLocks.value),
      showCrossTabStates: () => Object.keys(activeConnections.value),
      testDuplicateConnection: (tokenId: string) => {
        // 降噪
        const token = gameTokens.value.find((t) => t.id === tokenId);
        if (token) {
          // 故意创建第二个连接进行测试
          createWebSocketConnection(`${tokenId}_test`, token.token);
        }
      },
    },
  };
});
