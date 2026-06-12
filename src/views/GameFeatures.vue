<template>
  <div class="game-features-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <!-- 左侧：标题和账号选择 -->
          <div class="header-left">
            <div class="title-section">
              <h1 class="page-title">
                <n-icon class="title-icon" :component="CloudDone" />
                游戏功能
              </h1>
              <p class="page-subtitle">管理和使用游戏功能模块</p>
            </div>
            
            <!-- Token选择器 -->
            <div class="token-selector-wrapper">
              <n-select
                v-if="tokenStore.gameTokens.length > 0"
                clearable
                filterable
                class="token-selector"
                placeholder="选择游戏账号"
                size="large"
                v-model:value="selectedTokenId"
                :disabled="isSwitchingToken"
                :loading="isSwitchingToken"
                :options="tokenOptions"
                @update:value="handleTokenSwitch"
              >
                <template #arrow>
                  <n-icon :class="{ rotating: isSwitchingToken }" :component="SwapHorizontal"></n-icon>
                </template>
              </n-select>
              <div v-else class="no-token-hint">
                <n-icon :component="CloudDone" />
                <span>未选择Token</span>
              </div>
            </div>
          </div>

          <!-- 右侧：操作按钮和状态 -->
          <div class="header-right">
            <!-- 连接状态指示器 -->
            <div class="connection-indicator" :class="connectionStatus">
              <div class="status-dot"></div>
              <span class="status-text">{{ connectionStatusText }}</span>
            </div>

            <!-- 刷新用户按钮 -->
            <n-button
              v-if="tokenStore.selectedToken"
              class="action-btn refresh-btn"
              size="large"
              type="primary"
              :disabled="isSwitchingToken || isRefreshingUser"
              :loading="isRefreshingUser"
              @click="handleRefreshUser"
            >
              <template #icon>
                <n-icon :class="{ spinning: isRefreshingUser }" :component="Refresh"></n-icon>
              </template>
              刷新用户
            </n-button>

            <!-- 返回按钮 -->
            <n-button 
              class="action-btn back-btn"
              size="large"
              type="default"
              @click="handleBackToDaily"
            >
              <template #icon>
                <n-icon :component="ArrowBack"></n-icon>
              </template>
              返回批量日常
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈提示区域 -->
    <div v-if="showFeedback" class="feedback-section"></div>

    <!-- 功能模块网格 -->
    <div class="features-grid-section">
      <div class="container">
        <GameStatus></GameStatus>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { CloudDone, Refresh, SwapHorizontal, ArrowBack } from "@vicons/ionicons5";

const router = useRouter();
const message = useMessage();
const tokenStore = useTokenStore();

// 响应式数据
const showFeedback = ref(true);
const lastActivity = ref(null);
const isSwitchingToken = ref(false);
const isRefreshingUser = ref(false);

// 计算属性
const connectionStatus = computed(() => {
  if (!tokenStore.selectedToken)
    return "disconnected";
  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  return status === "connected" ? "connected" : "disconnected";
});

const connectionStatusText = computed(() => {
  if (!tokenStore.selectedToken)
    return "未选择Token";
  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  return status === "connected" ? "已连接" : "未连接";
});

const connectionClass = computed(() => {
  return connectionStatus.value === "connected"
    ? "status-connected"
    : "status-disconnected";
});

const isConnected = computed(() => {
  return connectionStatus.value === "connected";
});

const selectedTokenId = computed({
  get: () => tokenStore.selectedTokenId || null,
  set: (value) => {
    if (value) {
      tokenStore.selectToken(value);
    } else {
      tokenStore.selectedTokenId = "";
    }
  },
});

const tokenOptions = computed(() => {
  return tokenStore.gameTokens.map((token) => ({
    label: token.name,
    value: token.id,
    disabled: token.id === tokenStore.selectedTokenId,
  }));
});

const pickArenaTargetId = (targets) => {
  const candidate
    = targets?.rankList?.[0]
      || targets?.roleList?.[0]
      || targets?.targets?.[0]
      || targets?.targetList?.[0]
      || targets?.list?.[0];

  if (candidate?.roleId)
    return candidate.roleId;
  if (candidate?.id)
    return candidate.id;
  return targets?.roleId || targets?.id;
};

// 方法
const handleTokenSwitch = async (tokenId) => {
  if (!tokenId || tokenId === tokenStore.selectedTokenId)
    return;

  isSwitchingToken.value = true;
  try {
    // 断开当前连接（如果已连接）
    if (tokenStore.selectedToken && tokenStore.getWebSocketStatus(tokenStore.selectedToken.id) === "connected") {
      tokenStore.closeWebSocketConnection(tokenStore.selectedToken.id);
    }

    // 切换到新Token（强制重连）
    tokenStore.selectToken(tokenId, true);

    // 等待连接建立
    const connected = await new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        const status = tokenStore.getWebSocketStatus(tokenId);
        if (status === "connected") {
          clearInterval(checkConnection);
          resolve(true);
        } else if (status === "error" || status === "disconnected") {
          clearInterval(checkConnection);
          resolve(false);
        }
      }, 500);

      // 10秒超时
      setTimeout(() => {
        clearInterval(checkConnection);
        resolve(false);
      }, 10000);
    });

    // 连接成功后刷新用户数据
    if (connected) {
      await tokenStore.sendGetRoleInfo(tokenId);
      message.success(`已切换到: ${tokenStore.selectedToken?.name}`);
    } else {
      message.warning("连接失败，请检查Token是否有效");
    }
  } catch (error) {
    console.error("Token切换失败:", error);
    message.error("Token切换失败");
  } finally {
    isSwitchingToken.value = false;
  }
};

const handleRefreshUser = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    return;
  }

  isRefreshingUser.value = true;
  try {
    // 使用tokenStore的refreshGameData方法刷新用户信息（会自动重连）
    await tokenStore.refreshGameData(tokenStore.selectedToken.id);
    message.success("用户信息已刷新");
  } catch (error) {
    console.error("刷新用户失败:", error);
    message.error("刷新用户失败");
  } finally {
    isRefreshingUser.value = false;
  }
};

// 返回批量日常页面
const handleBackToDaily = () => {
  router.push('/admin/batch-daily-tasks');
  message.success('已返回批量日常页面');
};

const handleFeatureAction = async (featureType) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    router.push("/tokens");
    return;
  }

  const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  if (status !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  const actions = {
    "team-challenge": async () => {
      message.info("开始执行队伍挑战...");
      let targets;
      try {
        targets = await tokenStore.sendMessageWithPromise(
          tokenId,
          "arena_getareatarget",
          {},
          8000,
        );
      } catch (err) {
        message.error(`获取竞技场目标失败：${err.message}`);
        return;
      }
      const targetId = pickArenaTargetId(targets);
      if (!targetId) {
        message.warning("未找到可挑战的竞技场目标");
        return;
      }
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startareaarena",
          { targetId },
          15000,
        );
        message.success("竞技场战斗已发起");
      } catch (err) {
        message.error(`竞技场战斗失败：${err.message}`);
      }
    },
    "daily-tasks": () => {
      message.info("启动每日任务服务...");
      tokenStore.sendMessage(tokenId, "task_claimdailyreward");
    },
    "salt-robot": () => {
      message.info("领取盐罐机器人奖励...");
      tokenStore.sendMessage(tokenId, "bottlehelper_claim");
    },
    "idle-time": () => {
      message.info("领取挂机时间奖励...");
      tokenStore.sendMessage(tokenId, "system_claimhangupreward");
    },
    "power-switch": () => {
      message.info("执行威震大开关...");
      tokenStore.sendMessage(tokenId, "role_getroleinfo");
    },
    "club-ranking": () => {
      message.info("报名俱乐部排位...");
      tokenStore.sendMessage(tokenId, "legionmatch_rolesignup");
    },
    "club-checkin": () => {
      message.info("执行俱乐部签到...");
      tokenStore.sendMessage(tokenId, "legion_signin");
    },
    "tower-challenge": () => {
      message.info("开始爬塔挑战...");
      // 关键业务：只提示 UI，不打印冗余日志
      // 实际请求体: {"ack":0,"body":{},"cmd":"fight_starttower","seq":XX,"time":TIMESTAMP}
      tokenStore.sendMessage(tokenId, "fight_starttower");
    },
  };

  const action = actions[featureType];
  if (action) {
    await action();
  } else {
    message.warning("功能暂未实现");
  }
};

// 已移除 sendWebSocketMessage，使用 tokenStore.sendMessage 代替

const connectWebSocket = () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择一个Token");
    router.push("/tokens");
    return;
  }

  try {
    const tokenId = tokenStore.selectedToken.id;
    const token = tokenStore.selectedToken.token;

    // 使用 tokenStore 的 WebSocket 连接管理
    tokenStore.createWebSocketConnection(tokenId, token);
    message.info("正在建立 WebSocket 连接...");

    // 等待连接建立
    setTimeout(async () => {
      const status = tokenStore.getWebSocketStatus(tokenId);
      if (status === "connected") {
        message.success("WebSocket 连接成功");
        // 连接成功后自动初始化游戏数据
        await initializeGameData();
      }
    }, 2000);
  } catch (error) {
    console.error("WebSocket连接失败:", error);
    message.error("WebSocket连接失败");
  }
};

const disconnectWebSocket = () => {
  if (tokenStore.selectedToken) {
    const tokenId = tokenStore.selectedToken.id;
    tokenStore.closeWebSocketConnection(tokenId);
    message.info("WebSocket连接已断开");
  }
};

const toggleConnection = () => {
  if (connectionStatus.value === "connected") {
    disconnectWebSocket();
  } else {
    connectWebSocket();
  }
};

// handleWebSocketMessage 已移除，消息处理由 tokenStore 负责

// 生命周期
onMounted(() => {
  // 检查是否需要连接 WebSocket
  if (tokenStore.selectedToken) {
    const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
    if (status !== "connected") {
      connectWebSocket();
    } else {
      // 如果已连接，立即获取初始数据
      initializeGameData();
    }
  }
});

// 监听当前选中 Token 的连接错误（如 token 过期）并给出明确提示
watch(
  () => {
    if (!tokenStore.selectedToken)
      return { status: "disconnected", lastError: null };
    const conn = tokenStore.wsConnections[tokenStore.selectedToken.id];
    return { status: conn?.status, lastError: conn?.lastError };
  },
  (cur) => {
    if (!cur)
      return;
    if (cur.status === "error" && cur.lastError) {
      const err = String(cur.lastError.error || "").toLowerCase();
      if (err.includes("token") && err.includes("expired")) {
        const importMethod = tokenStore.selectedToken?.importMethod;
        if (
          importMethod === "url"
          || importMethod === "bin"
          || importMethod === "wxQrcode"
        ) {
          message.warning("Token已过期，正在尝试自动刷新...");
          return;
        }
        message.error("当前 Token 已过期，请重新导入后再试");
        router.push("/tokens");
      }
    }
  },
  { deep: true },
);

// 初始化游戏数据
const initializeGameData = async () => {
  if (!tokenStore.selectedToken)
    return;

  try {
    const tokenId = tokenStore.selectedToken.id;
    // 获取初始化数据（静默）
    tokenStore.sendMessage(tokenId, "role_getroleinfo");
    tokenStore.sendMessage(tokenId, "tower_getinfo");
    tokenStore.sendMessage(tokenId, "evotower_getinfo");
    tokenStore.sendMessage(tokenId, "presetteam_getinfo");
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
    );
    tokenStore.setBattleVersion(res?.battleData?.version);
  } catch (error) {
    // 静默处理初始化异常
  }
};

onUnmounted(() => {
  // WebSocket 连接由 tokenStore 管理，不需要手动清理
});
</script>

<style scoped lang="scss">
.game-features-page {
  min-height: 100dvh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
}

/* 深色主题下背景 */
[data-theme="dark"] .game-features-page {
  background: linear-gradient(135deg, #0f172a 0%, #1f2937 100%);
}

// 页面头部
.page-header {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  padding: 24px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  // 左侧：标题和选择器
  .header-left {
    display: flex;
    align-items: center;
    gap: 24px;
    flex: 1;

    .title-section {
      .page-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 4px 0;
        font-size: 22px;
        font-weight: 600;
        color: var(--text-primary);

        .title-icon {
          font-size: 24px;
          color: var(--primary-color);
        }
      }

      .page-subtitle {
        margin: 0;
        font-size: 13px;
        color: var(--text-tertiary);
      }
    }

    .token-selector-wrapper {
      min-width: 260px;

      .token-selector {
        :deep(.n-input) {
          border-radius: 10px;
        }
      }

      .no-token-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-radius: 10px;
        font-size: 14px;
        color: var(--text-tertiary);

        .n-icon {
          font-size: 18px;
        }
      }
    }
  }

  // 右侧：按钮和状态
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    // 连接状态指示器
    .connection-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--bg-secondary);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--warning-color);
        animation: pulse 2s infinite;
      }

      .status-text {
        color: var(--text-secondary);
      }

      &.connected {
        background: rgba(16, 185, 129, 0.1);

        .status-dot {
          background: #10b981;
          animation: none;
        }

        .status-text {
          color: #10b981;
        }
      }

      &.disconnected {
        .status-dot {
          background: #ef4444;
        }
      }
    }

    // 按钮样式
    .action-btn {
      border-radius: 10px;
      font-weight: 500;
      transition: all 0.3s;

      &.refresh-btn {
        min-width: 110px;
      }

      &.back-btn {
        min-width: 120px;
      }
    }
  }
}

// 脉冲动画
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

// 响应式
@media (max-width: 768px) {
  .page-header {
    padding: 16px 0;

    .container {
      padding: 0 16px;
    }

    .header-content {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .header-left {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;

      .title-section {
        text-align: center;

        .page-title {
          font-size: 20px;
          justify-content: center;
        }
      }

      .token-selector-wrapper {
        min-width: 100%;
      }
    }

    .header-right {
      justify-content: center;
      flex-wrap: wrap;

      .action-btn {
        flex: 1;
        min-width: 100px;
      }
    }
  }
}

// 功能模块区域
.features-grid-section {
  padding: 24px 0;
}

// 反馈区域
.feedback-section {
  min-height: 20px;
}

// 动画样式
.rotating {
  animation: rotate 1s linear infinite;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
