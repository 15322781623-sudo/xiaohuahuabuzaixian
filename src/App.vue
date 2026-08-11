<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <n-loading-bar-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <ApkUpdateHandler>
              <div id="app">
                <router-view></router-view>
              </div>
            </ApkUpdateHandler>
            <CardKeyDialog
              :visible="showCardKeyDialog"
              @success="handleActivationSuccess"
            />
          </n-dialog-provider>
        </n-notification-provider>
      </n-loading-bar-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { darkTheme } from "naive-ui";
import { useTheme } from "@/composables/useTheme";
import { useTokenStore } from "@/stores/tokenStore";
import ApkUpdateHandler from "@/components/ApkUpdateHandler.vue";
import CardKeyDialog from "@/components/CardKeyDialog.vue";
import { isActivated } from "@/utils/deviceFingerprint";

const { isDark, initTheme, setupSystemThemeListener, updateReactiveState }
  = useTheme();

const showCardKeyDialog = ref(false);

// Naive UI 主题
const naiveTheme = computed(() => {
  return isDark.value ? darkTheme : null;
});

// 监听主题变化事件
const handleThemeChange = () => {
  // 确保响应式状态同步
  updateReactiveState();
  // 强制重新渲染
  setTimeout(() => {
    updateReactiveState();
  }, 50);
};

onMounted(() => {
  // 云恢复结果日志：applySnapshot 中 location.reload() 会清空 console，
  // 因此恢复结果被写入 sessionStorage，启动时在此读取打印
  try {
    const raw = sessionStorage.getItem("__cloudRestoreResult__");
    if (raw) {
      const result = JSON.parse(raw);
      const { totalBin, succeeded, failed, failedDetails, timestamp } = result;
      console.group("%c[云同步] 云端配置恢复结果", "font-weight:bold;color:#4fc3f7");
      console.info(`恢复时间: ${timestamp || "未知"}`);
      console.info(`云端 BIN 总数: ${totalBin}`);
      console.info(`成功写入: ${succeeded} 条`);
      if (failed > 0) {
        console.error(`失败: ${failed} 条`, failedDetails);
      } else {
        console.info("%c✅ 全部 BIN 数据恢复成功", "color:#66bb6a");
      }
      // 同时比对 localStorage 中 token 与 IndexedDB BIN 数量，提示差异
      try {
        const tokens = JSON.parse(localStorage.getItem("gameTokens") || "[]");
        if (tokens.length > 0 && totalBin !== tokens.length) {
          console.warn(
            `%c⚠️ 数量不一致：云端 BIN ${totalBin} 条 vs 本地 Token ${tokens.length} 条（差值 ${tokens.length - totalBin}）。`,
            "color:#ffa726"
          );
          if (totalBin < tokens.length) {
            console.warn(
              `缺少 ${tokens.length - totalBin} 个账号的 BIN 数据，这些账号将无法连接。`
            );
          }
        }
      } catch { /* ignore */ }
      console.groupEnd();
      // 同步推送到 UI 执行日志
      try {
        const tokenStore = useTokenStore();
        if (failed > 0) {
          tokenStore.pushGlobalLog(
            `⚠️ 云端恢复：${succeeded} 个BIN成功，${failed} 个失败`,
            "error"
          );
        } else if (totalBin > 0) {
          tokenStore.pushGlobalLog(
            `✅ 云端配置恢复完成：${succeeded} 个BIN数据已恢复`,
            "info"
          );
        } else {
          tokenStore.pushGlobalLog(
            `⚠️ 云端快照中无 BIN 数据，${tokens?.length || 0} 个账号无法连接`,
            "warn"
          );
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem("__cloudRestoreResult__");
    }
  } catch { /* ignore */ }

  initTheme();
  setupSystemThemeListener();

  // 监听自定义主题变化事件
  window.addEventListener("theme-change", handleThemeChange);

  // 初始化时更新状态
  updateReactiveState();

  // 检查设备激活状态
  const checkActivation = async () => {
    try {
      console.log('[App] 开始检查激活状态...');
      const activated = await isActivated();
      console.log('[App] 激活检查结果:', activated);
      showCardKeyDialog.value = !activated;
      console.log('[App] showCardKeyDialog:', showCardKeyDialog.value);
    } catch (e) {
      console.error('[App] 激活检查失败:', e);
      showCardKeyDialog.value = true;
    }
  };

  checkActivation();

  // APK更新检查已移至 ApkUpdateHandler 组件
});

const handleActivationSuccess = () => {
  showCardKeyDialog.value = false;
};

onUnmounted(() => {
  window.removeEventListener("theme-change", handleThemeChange);
});
</script>

<style>
/* 主题变量 */
:root {
  --app-background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --text-color: #333;
  --text-secondary: #666;
  --text-tertiary: #999;
  --bg-color: #ffffff;
  --border-color: #e0e0e0;
}

/* 深色主题变量 */
.dark {
  --app-background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  --text-color: #ffffff !important;
  --text-secondary: #cbd5e0 !important;
  --text-tertiary: #a0aec0 !important;
  --bg-color: #1a202c !important;
  --border-color: #4a5568 !important;
}

/* 深色主题样式优化 - 针对Naive UI组件 */
html.dark,
html[data-theme="dark"] {
  color-scheme: dark;
}

/* 全局深色主题文字颜色 */
html.dark *,
html[data-theme="dark"] * {
  color: #ffffff;
}

/* Naive UI 表单组件 */
html.dark .n-form-item-label,
html.dark .n-form-item-label__text,
html[data-theme="dark"] .n-form-item-label,
html[data-theme="dark"] .n-form-item-label__text {
  color: #ffffff !important;
}

/* Naive UI 输入组件 */
html.dark .n-input,
html.dark .n-input__input,
html.dark .n-input__textarea,
html[data-theme="dark"] .n-input,
html[data-theme="dark"] .n-input__input,
html[data-theme="dark"] .n-input__textarea {
  color: #ffffff !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* Naive UI 弹框组件 */
html.dark .n-modal,
html.dark .n-drawer,
html.dark .n-popover,
html.dark .n-dropdown,
html.dark .n-tooltip,
html.dark .n-dialog,
html[data-theme="dark"] .n-modal,
html[data-theme="dark"] .n-drawer,
html[data-theme="dark"] .n-popover,
html[data-theme="dark"] .n-dropdown,
html[data-theme="dark"] .n-tooltip,
html[data-theme="dark"] .n-dialog {
  color: #ffffff !important;
}

/* Naive UI 弹框内容 */
html.dark .n-modal .n-card,
html.dark .n-drawer-content,
html.dark .n-popover-content,
html.dark .n-dropdown-option,
html.dark .n-dialog__content,
html[data-theme="dark"] .n-modal .n-card,
html[data-theme="dark"] .n-drawer-content,
html[data-theme="dark"] .n-popover-content,
html[data-theme="dark"] .n-dropdown-option,
html[data-theme="dark"] .n-dialog__content {
  color: #ffffff !important;
}

/* Naive UI 下拉选项 */
html.dark .n-dropdown-option__label,
html.dark .n-select-option,
html.dark .n-menu-item-content,
html[data-theme="dark"] .n-dropdown-option__label,
html[data-theme="dark"] .n-select-option,
html[data-theme="dark"] .n-menu-item-content {
  color: #ffffff !important;
}

/* 其他组件 */
html.dark .n-collapse-item__header,
html.dark .n-radio-button,
html.dark .n-card,
html.dark .n-card__content,
html.dark .n-button,
html.dark .n-tag,
html[data-theme="dark"] .n-collapse-item__header,
html[data-theme="dark"] .n-radio-button,
html[data-theme="dark"] .n-card,
html[data-theme="dark"] .n-card__content,
html[data-theme="dark"] .n-button,
html[data-theme="dark"] .n-tag {
  color: #ffffff !important;
}

/* 标题和文本 */
html.dark h1,
html.dark h2,
html.dark h3,
html.dark h4,
html.dark h5,
html.dark h6,
html.dark p,
html.dark span,
html.dark div,
html.dark label,
html[data-theme="dark"] h1,
html[data-theme="dark"] h2,
html[data-theme="dark"] h3,
html[data-theme="dark"] h4,
html[data-theme="dark"] h5,
html[data-theme="dark"] h6,
html[data-theme="dark"] p,
html[data-theme="dark"] span,
html[data-theme="dark"] div,
html[data-theme="dark"] label {
  color: #ffffff !important;
}

/* 占位符文本 */
html.dark .n-input__placeholder,
html.dark ::placeholder,
html[data-theme="dark"] .n-input__placeholder,
html[data-theme="dark"] ::placeholder {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* 确保Portal渲染的组件也应用深色主题 */
body.dark .n-modal-container,
body.dark .n-drawer-container,
body.dark .n-popover-container,
body[data-theme="dark"] .n-modal-container,
body[data-theme="dark"] .n-drawer-container,
body[data-theme="dark"] .n-popover-container {
  color: #ffffff !important;
}

#app {
  min-height: 100vh;
  background: var(--app-background);
  color: var(--text-color);
  transition:
    background 0.3s ease,
    color 0.3s ease;
}

/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family:
    "SF Pro Display",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;
  color: var(--text-color);
  transition: color 0.3s ease;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
