<template>
  <a-card class="token-manager-card">
    <template #extra>
      <div class="header-actions">
        <n-button size="small" :disabled="isLoading" @click="refreshTokens">
          <template #icon>
            <NIcon>
              <Refresh></Refresh>
            </NIcon>
          </template>
          <span class="btn-text">刷新</span>
        </n-button>
        <n-button size="small" type="warning" :disabled="isLoading" @click="exportTokens">
          <template #icon>
            <i class="i-mdi:download"></i>
          </template>
          <span class="btn-text">导出</span>
        </n-button>
        <n-upload accept=".json" :disabled="isLoading" :show-file-list="false" @change="importTokens">
          <n-button size="small" type="info">
            <template #icon>
              <NIcon>
                <CloudUpload></CloudUpload>
              </NIcon>
            </template>
            <span class="btn-text">导入</span>
          </n-button>
        </n-upload>
      </div>
    </template>
    <template #default>
      <!-- 用户Token -->
      <div class="token-section">
        <h4 class="section-title">用户认证Token</h4>
        <div v-if="localTokenStore.userToken" class="token-item">
          <div class="token-info">
            <span class="token-label">Token:</span>
            <span class="token-value">{{
              maskToken(localTokenStore.userToken)
            }}</span>
          </div>
          <n-button size="tiny" type="error" :disabled="isLoading" @click="clearUserToken">
            清除
          </n-button>
        </div>
        <div v-else class="empty-token">
          <NEmpty description="未设置用户Token"></NEmpty>
        </div>
      </div>
      <!-- 游戏Token列表 -->
      <div class="token-section">
        <div class="section-header">
          <h4 class="section-title">
            游戏角色Token
            <n-tag class="token-count-tag" size="small" type="info">
              {{ Object.keys(localTokenStore.gameTokens).length }}个
            </n-tag>
          </h4>
          <n-button
            size="small"
            type="primary"
            :disabled="isLoading"
            @click="showAddTokenDialog"
          >
            <template #icon>
              <NIcon>
                <Create></Create>
              </NIcon>
            </template>
            添加Token
          </n-button>
        </div>
        <div v-if="Object.keys(localTokenStore.gameTokens).length === 0" class="empty-state">
          <NEmpty description="暂无游戏Token"></NEmpty>
        </div>
        <div v-else class="game-tokens-list">
          <div
            v-for="(tokenData, roleId) in localTokenStore.gameTokens"
            :key="roleId"
            class="game-token-item"
            :class="{ selected: selectedTokenId === roleId }"
          >
            <div class="token-header">
              <div class="role-info">
                <div class="role-name-row">
                  <span class="role-name">{{ tokenData.roleName }}</span>
                  <n-tag class="server-tag" size="small" type="default">
                    {{ tokenData.server }}
                  </n-tag>
                </div>
                <div class="role-meta">
                  <span class="import-method-tag" :class="`method-${tokenData.importMethod}`">
                    {{ getImportMethodText(tokenData.importMethod) }}
                  </span>
                  <span class="last-used">
                    最后使用: {{ formatTime(tokenData.lastUsed) }}
                  </span>
                </div>
              </div>
              <div class="token-actions">
                <n-button
                  size="tiny"
                  :disabled="isLoading"
                  :type="
                    getWSStatus(roleId) === 'connected' ? 'success' : 'default'
                  "
                  @click="toggleWebSocket(roleId, tokenData)"
                >
                  <template #icon>
                    <NIcon>
                      <component :is="getWSStatusIcon(getWSStatus(roleId))"></component>
                    </NIcon>
                  </template>
                  {{
                    getWSStatus(roleId) === "connected" ? "断开" : "连接"
                  }}
                </n-button>

                <n-dropdown
                  trigger="click"
                  :options="getTokenMenuOptions(tokenData)"
                  @select="handleTokenAction($event, roleId, tokenData)"
                >
                  <n-button size="tiny" type="tertiary">
                    <template #icon>
                      <NIcon>
                        <EllipsisHorizontal></EllipsisHorizontal>
                      </NIcon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>

            <div class="token-details">
              <div class="detail-item">
                <span class="detail-label">Token:</span>
                <span class="detail-value">{{
                  maskToken(tokenData.token)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">WebSocket URL:</span>
                <span class="detail-value">{{ tokenData.wsUrl || '默认' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">创建时间:</span>
                <span class="detail-value">{{
                  formatTime(tokenData.createdAt)
                }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">连接状态:</span>
                <n-tag
                  size="small"
                  :type="getWSStatusType(getWSStatus(roleId))"
                >
                  {{ getWSStatusText(getWSStatus(roleId)) }}
                </n-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <!-- 批量操作 -->
    <template #actions>
      <n-dropdown :options="bulkOptions" @select="handleBulkAction">
        <n-button type="primary">
          <template #icon>
            <NIcon><Menu></Menu></NIcon>
          </template>
          批量操作
        </n-button>
      </n-dropdown>
      <n-button type="warning" :disabled="isLoading" @click="cleanExpiredTokens">
        清理过期Token
      </n-button>
      <n-button type="error" :disabled="isLoading" @click="clearAllTokens">
        清除所有Token
      </n-button>
    </template>
  </a-card>
</template>

<script setup>
import { h, ref } from "vue";
import { NEmpty, NIcon, useDialog, useMessage } from "naive-ui";
import { selectedTokenId } from "@/stores/tokenStore";
import { useLocalTokenStore } from "@/stores/localTokenManager";
import { useGameRolesStore } from "@/stores/gameRoles";
import {
  AlertCircle,
  CloudUpload,
  CopyOutline,
  Create,
  EllipsisHorizontal,
  Refresh,
  SyncCircle,
  Time,
  TrashBin,
  Wifi,
  WifiOutline,
} from "@vicons/ionicons5";

const message = useMessage();
const dialog = useDialog();
const localTokenStore = useLocalTokenStore();
const gameRolesStore = useGameRolesStore();

// 加载状态
const isLoading = ref(false);

// 方法
const maskToken = (token) => {
  if (!token)
    return "";
  const len = token.length;
  if (len <= 8)
    return token;
  return `${token.substring(0, 8)}***${token.substring(len - 8)}`;
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

const getWSStatus = (roleId) => {
  return localTokenStore.getWebSocketStatus(roleId);
};

const getWSStatusType = (status) => {
  switch (status) {
    case "connected":
      return "success";
    case "error":
      return "error";
    case "connecting":
      return "warning";
    default:
      return "default";
  }
};

const getWSStatusText = (status) => {
  switch (status) {
    case "connected":
      return "已连接";
    case "error":
      return "连接错误";
    case "connecting":
      return "连接中";
    default:
      return "未连接";
  }
};

// 获取WebSocket状态图标
const getWSStatusIcon = (status) => {
  switch (status) {
    case "connected":
      return Wifi;
    case "error":
      return AlertCircle;
    case "connecting":
      return Time;
    default:
      return WifiOutline;
  }
};

// 获取导入方式文本
const getImportMethodText = (method) => {
  switch (method) {
    case "url":
      return "URL导入";
    case "bin":
      return "Bin导入";
    case "wxQrcode":
      return "微信二维码";
    default:
      return "手动导入";
  }
};

// 显示添加Token对话框
const showAddTokenDialog = () => {
  // 这里可以实现跳转到Token导入页面的逻辑
  // 暂时显示提示信息
  message.info("请使用页面顶部的Token导入功能添加新Token");
};

// 获取Token菜单选项
const getTokenMenuOptions = (tokenData) => {
  const options = [
    {
      label: "编辑",
      key: "edit",
      icon: () => h(NIcon, null, { default: () => h(Create) }),
    },
    {
      label: "复制Token",
      key: "copy",
      icon: () => h(NIcon, null, { default: () => h(CopyOutline) }),
    },
  ];

  // 如果是URL获取的Token，显示刷新选项
  if (tokenData.importMethod === "url" && tokenData.sourceUrl) {
    options.unshift({
      label: "从URL刷新",
      key: "refresh-url",
      icon: () => h(NIcon, null, { default: () => h(SyncCircle) }),
    });
  } else {
    // 手动添加的Token显示重新生成选项
    options.unshift({
      label: "刷新Token",
      key: "refresh",
      icon: () => h(NIcon, null, { default: () => h(Refresh) }),
    });
  }

  options.push(
    { type: "divider" },
    {
      label: "删除",
      key: "delete",
      icon: () => h(NIcon, null, { default: () => h(TrashBin) }),
    },
  );

  return options;
};

// 处理Token菜单操作
const handleTokenAction = (action, roleId, tokenData) => {
  switch (action) {
    case "edit":
      editToken(roleId, tokenData);
      break;
    case "copy":
      copyToken(tokenData.token);
      break;
    case "refresh":
      regenerateToken(roleId);
      break;
    case "refresh-url":
      refreshTokenFromUrl(roleId, tokenData);
      break;
    case "delete":
      removeToken(roleId);
      break;
  }
};

const refreshTokens = () => {
  localTokenStore.initTokenManager();
  message.success("Token数据已刷新");
};

const clearUserToken = () => {
  dialog.warning({
    title: "清除用户Token",
    content: "确定要清除用户认证Token吗？这将会退出登录。",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      localTokenStore.clearUserToken();
      message.success("用户Token已清除");
    },
  });
};

const toggleWebSocket = (roleId, tokenData) => {
  const status = getWSStatus(roleId);

  if (status === "connected") {
    localTokenStore.closeWebSocketConnection(roleId);
    message.info("WebSocket连接已断开");
  } else {
    try {
      localTokenStore.createWebSocketConnection(
        roleId,
        tokenData.token,
        tokenData.wsUrl,
      );
      message.success("正在建立WebSocket连接...");
    } catch (error) {
      message.error("建立WebSocket连接失败");
    }
  }
};

const regenerateToken = (roleId) => {
  const oldTokenData = localTokenStore.getGameToken(roleId);
  if (!oldTokenData) {
    message.error("找不到对应的Token数据");
    return;
  }

  // 检查是否有源URL可以重新获取
  if (!oldTokenData.sourceUrl) {
    message.warning(
      "该Token没有配置源地址，无法重新生成。请手动重新导入Token。",
    );
    return;
  }

  dialog.info({
    title: "重新获取Token",
    content: "确定要从源地址重新获取此角色的Token吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        // 显示加载状态
        const loadingMsg = message.loading("正在重新获取Token...", {
          duration: 0,
        });

        // 从源URL重新获取token
        let response;
        const sourceUrl = oldTokenData.sourceUrl;

        // 使用与TokenImport相同的跨域处理逻辑
        const isLocalUrl
          = sourceUrl.startsWith(window.location.origin)
            || sourceUrl.startsWith("/")
            || sourceUrl.startsWith("http://localhost")
            || sourceUrl.startsWith("http://127.0.0.1");

        if (isLocalUrl) {
          response = await fetch(sourceUrl);
        } else {
          try {
            response = await fetch(sourceUrl, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
              mode: "cors",
            });
          } catch (corsError) {
            throw new Error(
              `跨域请求被阻止。请确保目标服务器支持CORS。错误详情: ${corsError.message}`,
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!data.token) {
          throw new Error("返回数据中未找到token字段");
        }

        // 更新token
        localTokenStore.updateGameToken(roleId, {
          token: data.token,
          server: data.server || oldTokenData.server,
          regeneratedAt: new Date().toISOString(),
          lastRefreshed: new Date().toISOString(),
        });

        // 如果当前token有连接，需要重新连接
        if (localTokenStore.getWebSocketStatus(roleId) === "connected") {
          localTokenStore.closeWebSocketConnection(roleId);
          setTimeout(() => {
            localTokenStore.createWebSocketConnection(
              roleId,
              data.token,
              oldTokenData.wsUrl,
            );
          }, 500);
        }

        loadingMsg.destroy();
        message.success("Token已成功重新获取");
      } catch (error) {
        console.error("重新获取Token失败:", error);
        message.error(error.message || "Token重新获取失败");
      }
    },
  });
};

const removeToken = (roleId) => {
  dialog.warning({
    title: "删除Token",
    content: "确定要删除此角色的游戏Token吗？这将断开相关的WebSocket连接。",
    positiveText: "确定删除",
    negativeText: "取消",
    onPositiveClick: () => {
      localTokenStore.removeGameToken(roleId);
      message.success("Token已删除");
    },
  });
};

// 编辑Token（暂时显示提示信息，后续可以实现编辑功能）
const editToken = (roleId, tokenData) => {
  message.info("编辑功能正在开发中");
};

// 复制Token到剪贴板
const copyToken = async (token) => {
  try {
    await navigator.clipboard.writeText(token);
    message.success("Token已复制到剪贴板");
  } catch (error) {
    // 降级方案
    const textArea = document.createElement("textarea");
    textArea.value = token;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    message.success("Token已复制到剪贴板");
  }
};

// 从URL刷新Token
const refreshTokenFromUrl = async (roleId, tokenData) => {
  if (!tokenData.sourceUrl) {
    message.warning("该Token没有配置源URL");
    return;
  }

  dialog.info({
    title: "从URL刷新Token",
    content: `确定要从源URL重新获取Token吗？\n源地址：${tokenData.sourceUrl}`,
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        const loadingMsg = message.loading("正在从URL获取新Token...", {
          duration: 0,
        });

        // 使用与TokenImport相同的逻辑获取Token
        let response;
        const isLocalUrl
          = tokenData.sourceUrl.startsWith(window.location.origin)
            || tokenData.sourceUrl.startsWith("/")
            || tokenData.sourceUrl.startsWith("http://localhost")
            || tokenData.sourceUrl.startsWith("http://127.0.0.1");

        if (isLocalUrl) {
          response = await fetch(tokenData.sourceUrl);
        } else {
          // 跨域请求，使用代理
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(tokenData.sourceUrl)}`;
          response = await fetch(proxyUrl);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.token) {
          throw new Error("返回数据中未找到token字段");
        }

        // 更新Token
        localTokenStore.updateGameToken(roleId, {
          token: data.token,
          lastUsed: new Date().toISOString(),
        });

        loadingMsg.destroy();
        message.success("Token刷新成功");
      } catch (error) {
        console.error("URL刷新Token失败:", error);
        message.error(`刷新失败: ${error.message}`);
      }
    },
  });
};

const exportTokens = () => {
  try {
    const tokenData = localTokenStore.exportTokens();
    const dataStr = JSON.stringify(tokenData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tokens_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    message.success("Token数据已导出");
  } catch (error) {
    message.error(`导出失败: ${error.message}`);
  }
};

const importTokens = ({ file }) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const tokenData = JSON.parse(e.target.result);
      const result = localTokenStore.importTokens(tokenData);

      if (result.success) {
        message.success(result.message);
        // 刷新游戏角色数据
        gameRolesStore.fetchGameRoles();
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error("导入失败：文件格式错误");
    }
  };
  reader.readAsText(file.file);
};

const cleanExpiredTokens = () => {
  dialog.info({
    title: "清理过期Token",
    content: "确定要清理超过24小时未使用的Token吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      const cleanedCount = localTokenStore.cleanExpiredTokens();
      message.success(`已清理 ${cleanedCount} 个过期Token`);
    },
  });
};

const clearAllTokens = () => {
  dialog.error({
    title: "清除所有Token",
    content:
      "确定要清除所有游戏Token吗？这将断开所有WebSocket连接。此操作不可恢复！",
    positiveText: "确定清除",
    negativeText: "取消",
    onPositiveClick: () => {
      localTokenStore.clearAllGameTokens();
      message.success("所有游戏Token已清除");
    },
  });
};
</script>

<style scoped lang="scss">
.token-manager-card {
  border-radius: var(--border-radius-large);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.token-section {
  margin-bottom: var(--spacing-lg);

  .section-title {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);

    .token-count-tag {
      margin-left: var(--spacing-sm);
    }
  }
}

.token-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

.token-info {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
  overflow: hidden;
}

.token-label {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.token-value {
  font-family: monospace;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-token {
  padding: var(--spacing-xl);
  text-align: center;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.empty-state {
  padding: var(--spacing-2xl);
  text-align: center;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  margin-top: var(--spacing-md);
}

.game-tokens-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.game-token-item {
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  transition: all 0.3s ease;
  background: white;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color);
  }

  &.selected {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
  }
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-md);
}

.role-info {
  flex: 1;
  min-width: 0;
}

.role-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);

  .role-name {
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    font-size: var(--font-size-md);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .server-tag {
    flex-shrink: 0;
  }
}

.role-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;

  .import-method-tag {
    font-size: var(--font-size-xs);
    padding: 2px 8px;
    border-radius: var(--border-radius-small);
    background: var(--bg-tertiary);
    color: var(--text-secondary);

    &.method-url {
      background: #e6f7ff;
      color: #1890ff;
    }

    &.method-bin {
      background: #f6ffed;
      color: #52c41a;
    }

    &.method-wxQrcode {
      background: #fff2e8;
      color: #fa8c16;
    }
  }

  .last-used {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
  }
}

.token-actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.token-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-family: monospace;
  word-break: break-all;
}

.bulk-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}

@media (max-width: 768px) {
  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .btn-text {
    display: none;
  }

  .token-item {
    flex-direction: column;
    gap: var(--spacing-md);
    align-items: stretch;
  }

  .token-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }

  .token-details {
    grid-template-columns: 1fr;
  }

  .role-name-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  .role-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}

// APK环境下的手机端自适应缩小
@media (max-width: 768px) and (hover: none) and (pointer: coarse) {
  // 直接缩小整个容器,不做宽度补偿
  .token-manager-card {
    zoom: 0.8; // 使用zoom属性直接缩放
    -webkit-zoom: 0.8;
    -moz-zoom: 0.8;
  }

  // 强制缩小所有按钮
  :deep(.n-button) {
    transform: scale(0.8) !important;
    transform-origin: center center !important;
    margin: 1px !important;
  }

  // 强制缩小所有标签
  :deep(.n-tag) {
    transform: scale(0.8) !important;
    transform-origin: center center !important;
    margin: 1px !important;
  }

  // 强制缩小所有图标
  :deep(.n-icon) {
    transform: scale(0.8) !important;
  }

  // 强制缩小上传组件
  :deep(.n-upload) {
    transform: scale(0.8) !important;
    transform-origin: center center !important;
  }

  // 强制缩小下拉菜单触发器
  :deep(.n-dropdown) {
    transform: scale(0.8) !important;
    transform-origin: center center !important;
  }

  .header-actions {
    gap: 3px;

    .btn-text {
      font-size: 10px !important;
    }
  }

  .section-title {
    font-size: 14px !important;
  }

  .game-token-item {
    padding: 6px !important;

    .role-name {
      font-size: 12px !important;
    }

    .role-meta {
      font-size: 10px !important;
    }

    .server-tag {
      font-size: 10px !important;
    }

    .import-method-tag {
      font-size: 10px !important;
    }
  }

  .token-details {
    font-size: 10px !important;

    .detail-label,
    .detail-value {
      font-size: 10px !important;
    }
  }

  .token-item {
    padding: 6px !important;

    .token-label,
    .token-value {
      font-size: 10px !important;
    }
  }
}
</style>
