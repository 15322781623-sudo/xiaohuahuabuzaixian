<template>
  <div class="default-layout">
    <!-- 顶部导航 -->
    <nav class="dashboard-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <img alt="XYZW" class="brand-logo" src="/icons/gangzhongwang.png">
          <div class="brand-toggle" @click="isMobileMenuOpen = true">
            <n-icon>
              <Menu></Menu>
            </n-icon>
            <span class="brand-text">控制台</span>
          </div>
        </div>

        <div class="nav-menu">
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/dashboard"
          >
            <n-icon>
              <Home></Home>
            </n-icon>
            <span>首页</span>
          </router-link>
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/game-features"
          >
            <n-icon>
              <Cube></Cube>
            </n-icon>
            <span>游戏功能</span>
          </router-link>
          <router-link active-class="active" class="nav-item" to="/tokens">
            <n-icon>
              <PersonCircle></PersonCircle>
            </n-icon>
            <span>Token管理</span>
          </router-link>
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/batch-daily-tasks"
          >
            <n-icon>
              <Layers></Layers>
            </n-icon>
            <span>批量日常</span>
          </router-link>
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/game-login"
          >
            <n-icon>
              <GameController></GameController>
            </n-icon>
            <span>游戏登录</span>
          </router-link>
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/message-test"
          >
            <n-icon>
              <ChatbubbleEllipsesSharp></ChatbubbleEllipsesSharp>
            </n-icon>
            <span>消息测试</span>
          </router-link>
          <router-link
            active-class="active"
            class="nav-item"
            to="/admin/changelog"
          >
            <n-icon>
              <DocumentText></DocumentText>
            </n-icon>
            <span>更新日志</span>
          </router-link>
          <router-link v-if="isNowInLegionWarTime()" active-class="active" class="nav-item" to="/admin/legion-war">
            <n-icon>
              <LockOpen></LockOpen>
            </n-icon>
            <span>实时盐场</span>
          </router-link>
        </div>

        <div class="nav-user">
          <!-- 云端同步入口 -->
          <n-button quaternary circle size="small" title="云端配置同步" @click="showCloudSync = true">
            <template #icon>
              <n-icon><CloudOutline /></n-icon>
            </template>
          </n-button>
          <!-- 自动跳转设置入口 -->
          <n-popover trigger="click" placement="bottom-end" :show-arrow="false">
            <template #trigger>
              <n-button quaternary circle size="small" title="自动跳转设置">
                <template #icon>
                  <n-icon><TimerOutline /></n-icon>
                </template>
              </n-button>
            </template>
            <div style="width: 240px; padding: 4px 0;">
              <div v-for="p in redirectPageStates" :key="p.key" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span>{{ p.label }}自动跳转</span>
                <n-switch :value="p.enabled" size="small" @update:value="(on) => toggleRedirectPage(p.key, on)" />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span>默认启动页</span>
                <n-select
                  :value="defaultStartPage"
                  :options="DEFAULT_START_PAGES.map(p => ({ label: p.label, value: p.key }))"
                  size="small"
                  style="width: 110px;"
                  @update:value="saveDefaultStartPage"
                />
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>倒计时（秒）</span>
                <n-input-number
                  v-model:value="autoRedirectSeconds"
                  :min="10"
                  :max="3600"
                  :step="10"
                  size="small"
                  style="width: 110px;"
                  @update:value="saveRedirectSeconds"
                />
              </div>
              <div style="margin-top: 8px; color: var(--text-tertiary, #999); font-size: 12px;">
                各页面独立控制，默认仅首页开启
              </div>
            </div>
          </n-popover>
          <!-- 主题切换按钮 -->
          <ThemeToggle></ThemeToggle>

          <n-dropdown :options="userMenuOptions" @select="handleUserAction">
            <div class="user-info">
              <n-avatar
                fallback-src="/icons/xiaoyugan.png"
                size="medium"
                :src="selectedToken?.avatar || '/icons/xiaoyugan.png'"
              ></n-avatar>
              <span class="username">{{
                selectedToken?.name || "未选择Token"
              }}</span>
              <n-icon>
                <ChevronDown></ChevronDown>
              </n-icon>
            </div>
          </n-dropdown>
        </div>
      </div>
    </nav>
    <n-drawer
      placement="left"
      style="width: 260px"
      v-model:show="isMobileMenuOpen"
    >
      <div class="drawer-menu">
        <router-link
          class="drawer-item"
          to="/admin/dashboard"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Home></Home>
          </n-icon>
          <span>首页</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/game-features"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Cube></Cube>
          </n-icon>
          <span>游戏功能</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/tokens"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <PersonCircle></PersonCircle>
          </n-icon>
          <span>Token管理</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/daily-tasks"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings></Settings>
          </n-icon>
          <span>任务管理</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/batch-daily-tasks"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Layers></Layers>
          </n-icon>
          <span>批量日常</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/game-login"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <GameController></GameController>
          </n-icon>
          <span>游戏登录</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/message-test"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <ChatbubbleEllipsesSharp></ChatbubbleEllipsesSharp>
          </n-icon>
          <span>消息测试</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/changelog"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <DocumentText></DocumentText>
          </n-icon>
          <span>更新日志</span>
        </router-link>
        <router-link v-if="isNowInLegionWarTime()" active-class="active" class="nav-item" to="/admin/legion-war">
          <n-icon>
            <LockOpen></LockOpen>
          </n-icon>
          <span>实时盐场</span>
        </router-link>
        <router-link
          class="drawer-item"
          to="/admin/profile"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings></Settings>
          </n-icon>
          <span>个人设置</span>
        </router-link>
      </div>
    </n-drawer>
    <div class="main">
      <router-view></router-view>
    </div>

    <!-- 云端配置同步弹窗 -->
    <CloudSyncModal v-model:show="showCloudSync" />
  </div>
</template>

<script setup>
import {
  selectedToken,
  useTokenStore,
} from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
import CloudSyncModal from "@/components/Common/CloudSyncModal.vue";
import {
  ChatbubbleEllipsesSharp,
  ChevronDown,
  Cube,
  DocumentText,
  Home,
  Layers,
  LockOpen,
  Menu,
  PersonCircle,
  Settings,
  GameController,
  TimerOutline,
  CloudOutline,
} from "@vicons/ionicons5";

import { useRouter } from "vue-router";
import { useDialog, useMessage } from "naive-ui";
import { ref } from "vue";
import { isNowInLegionWarTime } from "@/utils/clubBattleUtils";
import { useAutoRedirectSettings, DEFAULT_START_PAGES } from "@/composables/useAutoRedirect";

const tokenStore = useTokenStore();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const isMobileMenuOpen = ref(false);
const showCloudSync = ref(false);

// 自动跳转设置（各页面独立，默认仅首页开启，与 Token 管理页/个人设置页共用同一配置）
const { pageStates: redirectPageStates, seconds: autoRedirectSeconds, startPage: defaultStartPage, togglePage: toggleRedirectPage, saveSeconds: saveRedirectSeconds, saveStartPage: saveDefaultStartPage } = useAutoRedirectSettings();

const userMenuOptions = [
  {
    label: "清除所有Token并退出",
    key: "logout",
  },
];

// 方法
const handleUserAction = async (key) => {
  switch (key) {
    case "logout":
      dialog.warning({
        title: "确认清除所有Token",
        content: "此操作将清除所有Token数据并断开所有连接，此操作不可恢复！是否继续？",
        positiveText: "确定清除",
        negativeText: "取消",
        onPositiveClick: async () => {
          await tokenStore.clearAllTokens();
          message.success("已清除所有Token");
          router.push("/tokens");
        },
      });
      break;
  }
};
</script>

<style scoped lang="scss">
// 导航栏
.dashboard-nav {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 var(--spacing-lg);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.nav-container {
  display: flex;
  align-items: center;
  height: 64px;
  max-width: 1400px;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-right: var(--spacing-xl);
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-small);
}

.brand-text {
  font-size: clamp(14px, 3.5vw, 20px);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
}

.brand-toggle {
  display: none;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-lg);
}

.brand-toggle .n-icon {
  font-size: inherit;
}

.nav-menu {
  display: flex;
  gap: var(--spacing-md);
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: var(--primary-color-light);
    color: var(--primary-color);
  }
}

.nav-user {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
  }
}

.username {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .nav-item span {
    display: none;
  }

  .nav-menu {
    display: none;
  }

  .nav-item {
    padding: var(--spacing-sm);
    flex: 0 0 auto;
  }

  .nav-container {
    height: 56px;
  }

  .brand-logo {
    display: none;
  }

  .brand-toggle {
    display: inline-flex;
  }
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
}

.drawer-item.router-link-active {
  background: var(--primary-color-light);
  color: var(--primary-color);
}

/* 禁用样式：灰化、鼠标禁止、无hover效果 */
.nav-item.disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed; /* 鼠标样式：禁止 */
  pointer-events: none; /* 可选：直接禁用所有鼠标事件（比阻止click更彻底） */
}
</style>
