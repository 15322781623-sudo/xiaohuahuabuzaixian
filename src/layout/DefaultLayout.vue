<template>
  <div class="default-layout">
    <!-- 顶部导航 -->
    <nav class="dashboard-nav">
      <div class="nav-container">
        <div class="nav-brand">
          <img alt="XYZW" class="brand-logo" src="/icons/xiaoyugan.png">
          <div class="brand-toggle" @click="isMobileMenuOpen = true">
            <n-icon>
              <Menu></Menu>
            </n-icon>
            <span class="brand-text">XYZW 控制台</span>
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
  </div>
</template>

<script setup>
import {
  selectedToken,
  useTokenStore,
} from "@/stores/tokenStore";
import ThemeToggle from "@/components/Common/ThemeToggle.vue";
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
} from "@vicons/ionicons5";

import { useRouter } from "vue-router";
import { useDialog, useMessage } from "naive-ui";
import { ref } from "vue";
import { isNowInLegionWarTime } from "@/utils/clubBattleUtils";

const tokenStore = useTokenStore();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const isMobileMenuOpen = ref(false);

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
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
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
