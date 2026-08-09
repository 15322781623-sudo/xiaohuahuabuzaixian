<template>
  <div class="cloud-admin-page">
    <div class="container">
      <!-- 顶部横幅 -->
      <div class="page-hero">
        <div class="hero-icon">
          <n-icon><CloudOutline /></n-icon>
        </div>
        <h1>云端账号后台</h1>
        <p>云同步注册账号与配置数据管理 · 授权控制</p>
      </div>

      <!-- 管理员登录 -->
      <div v-if="!authed" class="login-card">
        <div class="login-title">管理员验证</div>
        <div class="login-form">
          <n-input
            v-model:value="adminPassword"
            type="password"
            placeholder="请输入管理员密码"
            show-password-on="click"
            @keyup.enter="enterAdmin"
          />
          <n-button type="primary" :loading="checking" @click="enterAdmin">进入后台</n-button>
        </div>
      </div>

      <template v-else>
        <!-- 统计卡片 -->
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-num">{{ users.length }}</div>
            <div class="stat-label">注册账号</div>
          </div>
          <div class="stat-card success">
            <div class="stat-num">{{ approvedCount }}</div>
            <div class="stat-label">已授权</div>
          </div>
          <div class="stat-card info">
            <div class="stat-num">{{ usersWithConfig }}</div>
            <div class="stat-label">已存配置</div>
          </div>
          <div class="stat-card warn">
            <div class="stat-num">{{ formatSize(totalSize) }}</div>
            <div class="stat-label">存储总量</div>
          </div>
        </div>

        <!-- 工具栏：搜索 + 操作 -->
        <div class="toolbar">
          <n-input
            v-model:value="searchText"
            placeholder="搜索用户名…"
            clearable
            class="search-input"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          <div class="toolbar-actions">
            <n-button size="small" :loading="loading" @click="loadUsers">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新
            </n-button>
            <n-button size="small" quaternary @click="exitAdmin">退出后台</n-button>
          </div>
        </div>

        <!-- 桌面端表格 -->
        <div class="table-card desktop-only">
          <n-data-table
            :columns="columns"
            :data="filteredUsers"
            :bordered="false"
            size="small"
            :row-key="(row) => row.username"
          />
          <div v-if="!filteredUsers.length" class="empty-tip">
            {{ searchText ? `未找到匹配「${searchText}」的账号` : "暂无注册账号" }}
          </div>
        </div>

        <!-- 移动端卡片列表 -->
        <div class="mobile-only card-list">
          <div v-for="row in filteredUsers" :key="row.username" class="user-card">
            <div class="user-card-head">
              <span class="user-name">{{ row.username }}</span>
              <div class="user-tags">
                <n-tag :type="row.approved ? 'success' : 'warning'" size="small" :bordered="false">
                  {{ row.approved ? "已授权" : "未授权" }}
                </n-tag>
                <n-tag :type="row.hasConfig ? 'info' : 'default'" size="small" :bordered="false">
                  {{ row.hasConfig ? "已存配置" : "无配置" }}
                </n-tag>
              </div>
            </div>
            <div class="user-card-meta">
              <div><span>注册：</span>{{ formatTime(row.createdAt) }}</div>
              <div><span>配置更新：</span>{{ formatTime(row.configUpdatedAt) }}</div>
              <div>
                <span>大小：</span>{{ formatSize(row.configSize) }}
                <span style="margin-left: 12px;">设备数：</span>{{ row.configKeys }}
              </div>
            </div>
            <div class="user-card-actions">
              <span class="approve-label">授权</span>
              <n-switch
                :value="!!row.approved"
                size="small"
                @update:value="(on) => toggleApprove(row, on)"
              />
              <div style="flex: 1;"></div>
              <n-button size="tiny" :disabled="!row.hasConfig" @click="viewConfig(row.username)">
                查看配置
              </n-button>
              <n-button size="tiny" type="warning" @click="resetPassword(row.username)">重置密码</n-button>
              <n-button size="tiny" type="error" @click="deleteUser(row.username)">删除</n-button>
            </div>
          </div>
          <div v-if="!filteredUsers.length" class="empty-tip">
            {{ searchText ? `未找到匹配「${searchText}」的账号` : "暂无注册账号" }}
          </div>
        </div>
      </template>
    </div>

    <!-- 配置详情弹窗 -->
    <n-modal
      v-model:show="showConfigModal"
      preset="card"
      :title="`配置详情 - ${viewingUser}`"
      style="width: 640px; max-width: 92vw;"
    >
      <div v-if="viewingConfig" style="max-height: 60vh; overflow: auto;">
        <div style="margin-bottom: 8px; color: var(--text-tertiary, #999); font-size: 12px;">
          云端更新时间：{{ formatTime(viewingConfig.updatedAt) }} ・ 共 {{ configKeyList.length }} 项
        </div>
        <n-data-table
          :columns="configColumns"
          :data="configKeyList"
          :bordered="false"
          size="small"
          :row-key="(row) => row.key"
        />
      </div>
      <template #footer>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <n-button size="small" @click="copyConfig">复制JSON</n-button>
          <n-button size="small" type="primary" @click="downloadConfig">下载JSON</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { h, ref, computed } from "vue";
import { NButton, NTag, NSwitch, useDialog, useMessage } from "naive-ui";
import { CloudOutline, SearchOutline, RefreshOutline } from "@vicons/ionicons5";
import { CLOUD_API_BASE } from "@/utils/cloudSync";

const message = useMessage();
const dialog = useDialog();

const adminPassword = ref(sessionStorage.getItem("cloudAdminPassword") || "");
const authed = ref(false);
const checking = ref(false);
const loading = ref(false);
const users = ref([]);
const searchText = ref("");

const showConfigModal = ref(false);
const viewingUser = ref("");
const viewingConfig = ref(null);

const filteredUsers = computed(() => {
  const kw = searchText.value.trim().toLowerCase();
  if (!kw) return users.value;
  return users.value.filter((u) => u.username.toLowerCase().includes(kw));
});
const approvedCount = computed(() => users.value.filter((u) => u.approved).length);
const usersWithConfig = computed(() => users.value.filter((u) => u.hasConfig).length);
const totalSize = computed(() => users.value.reduce((s, u) => s + (u.configSize || 0), 0));

const formatTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const adminFetch = async (path, options = {}) => {
  const resp = await fetch(`${CLOUD_API_BASE}${path}`, {
    ...options,
    headers: { "X-Admin-Password": adminPassword.value, ...(options.headers || {}) },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `请求失败（${resp.status}）`);
  return data;
};

const enterAdmin = async () => {
  if (!adminPassword.value) {
    message.warning("请输入管理员密码");
    return;
  }
  checking.value = true;
  try {
    await loadUsers();
    sessionStorage.setItem("cloudAdminPassword", adminPassword.value);
    authed.value = true;
    message.success("已进入后台");
  } catch (e) {
    message.error(e.message || "管理员密码错误");
  } finally {
    checking.value = false;
  }
};

const exitAdmin = () => {
  authed.value = false;
  sessionStorage.removeItem("cloudAdminPassword");
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const data = await adminFetch("/api/cloud/admin/users");
    users.value = data.users || [];
  } finally {
    loading.value = false;
  }
};

const viewConfig = async (username) => {
  try {
    const cfg = await adminFetch(`/api/cloud/admin/config?username=${encodeURIComponent(username)}`);
    viewingUser.value = username;
    viewingConfig.value = cfg;
    showConfigModal.value = true;
  } catch (e) {
    message.error(e.message || "获取配置失败");
  }
};

const deleteUser = (username) => {
  dialog.warning({
    title: "确认删除账号",
    content: `将删除账号「${username}」及其云端配置数据，不可恢复。是否继续？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await adminFetch(`/api/cloud/admin/user?username=${encodeURIComponent(username)}`, { method: "DELETE" });
        message.success("已删除");
        await loadUsers();
      } catch (e) {
        message.error(e.message || "删除失败");
      }
    },
  });
};

const toggleApprove = async (row, on) => {
  try {
    await adminFetch("/api/cloud/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: row.username, approved: on }),
    });
    row.approved = on;
    message.success(on ? `已授权「${row.username}」` : `已取消授权「${row.username}」`);
  } catch (e) {
    message.error(e.message || "授权操作失败");
  }
};

const resetPassword = (username) => {
  dialog.warning({
    title: "确认重置密码",
    content: `将为账号「${username}」生成新随机密码，原密码立即失效。是否继续？`,
    positiveText: "重置",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        const data = await adminFetch("/api/cloud/admin/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        dialog.success({
          title: "密码已重置",
          content: `账号「${username}」的新密码：\n${data.newPassword}\n\n请妥善告知用户，此密码仅展示一次。`,
          positiveText: "知道了",
        });
      } catch (e) {
        message.error(e.message || "重置密码失败");
      }
    },
  });
};

const columns = [
  { title: "用户名", key: "username" },
  { title: "注册时间", key: "createdAt", render: (row) => formatTime(row.createdAt) },
  {
    title: "授权",
    key: "approved",
    render: (row) =>
      h(NSwitch, {
        value: !!row.approved,
        size: "small",
        onUpdateValue: (on) => toggleApprove(row, on),
      }),
  },
  {
    title: "配置状态",
    key: "hasConfig",
    render: (row) =>
      h(NTag, { type: row.hasConfig ? "success" : "default", size: "small", bordered: false }, () => (row.hasConfig ? "已存入" : "无配置")),
  },
  { title: "配置更新时间", key: "configUpdatedAt", render: (row) => formatTime(row.configUpdatedAt) },
  { title: "配置大小", key: "configSize", render: (row) => formatSize(row.configSize) },
  { title: "设备快照数", key: "configKeys" },
  {
    title: "操作",
    key: "actions",
    render: (row) =>
      h("div", { style: "display:flex;gap:8px;" }, [
        h(NButton, { size: "tiny", disabled: !row.hasConfig, onClick: () => viewConfig(row.username) }, () => "查看配置"),
        h(NButton, { size: "tiny", type: "warning", onClick: () => resetPassword(row.username) }, () => "重置密码"),
        h(NButton, { size: "tiny", type: "error", onClick: () => deleteUser(row.username) }, () => "删除"),
      ]),
  },
];

const configKeyList = computed(() => {
  const data = viewingConfig.value?.data || {};
  return Object.entries(data)
    .map(([key, value]) => ({ key, size: String(value ?? "").length }))
    .sort((a, b) => b.size - a.size);
});

const configColumns = [
  { title: "配置项", key: "key" },
  { title: "大小", key: "size", render: (row) => formatSize(row.size) },
];

const copyConfig = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(viewingConfig.value));
    message.success("已复制到剪贴板");
  } catch {
    message.error("复制失败");
  }
};

const downloadConfig = () => {
  const blob = new Blob([JSON.stringify(viewingConfig.value, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cloud-config-${viewingUser.value}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// 已缓存密码时自动进入
if (adminPassword.value) {
  enterAdmin();
}
</script>

<style scoped lang="scss">
.cloud-admin-page {
  min-height: 100vh;
  padding: 24px 0 48px;
  background: var(--bg-secondary, #f5f7fa);
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 16px;
}

/* 顶部横幅 */
.page-hero {
  text-align: center;
  padding: 32px 16px 28px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.35);

  .hero-icon {
    width: 52px;
    height: 52px;
    margin: 0 auto 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  h1 {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  p {
    margin: 0;
    opacity: 0.85;
    font-size: 13px;
  }
}

/* 登录卡片 */
.login-card {
  max-width: 440px;
  margin: 0 auto;
  padding: 28px 24px;
  border-radius: 16px;
  background: var(--card-bg, #fff);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

  .login-title {
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .login-form {
    display: flex;
    gap: 10px;
  }
}

/* 统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 16px 12px;
  border-radius: 12px;
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  text-align: center;
  border-top: 3px solid var(--primary-color, #667eea);

  &.success { border-top-color: #18a058; }
  &.info { border-top-color: #2080f0; }
  &.warn { border-top-color: #f0a020; }

  .stat-num {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .stat-label {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-tertiary, #999);
  }
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .search-input {
    max-width: 280px;
  }

  .toolbar-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

/* 桌面表格卡片 */
.table-card {
  border-radius: 12px;
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 8px 12px;
  overflow-x: auto;
}

.empty-tip {
  padding: 32px 0;
  text-align: center;
  color: var(--text-tertiary, #999);
  font-size: 13px;
}

/* 移动端卡片列表 */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  border-radius: 12px;
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 14px;

  .user-card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;

    .user-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      word-break: break-all;
    }

    .user-tags {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
  }

  .user-card-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary, #666);

    span {
      color: var(--text-tertiary, #999);
    }
  }

  .user-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-color, #e5e7eb);

    .approve-label {
      font-size: 12px;
      color: var(--text-tertiary, #999);
    }
  }
}

/* 响应式 */
.desktop-only { display: block; }
.mobile-only { display: none; }

@media (max-width: 768px) {
  .cloud-admin-page { padding: 12px 0 32px; }

  .page-hero {
    padding: 24px 12px 20px;
    border-radius: 12px;

    h1 { font-size: 20px; }
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card .stat-num { font-size: 18px; }

  .toolbar {
    flex-direction: column;
    align-items: stretch;

    .search-input { max-width: none; }

    .toolbar-actions { justify-content: flex-end; }
  }

  .desktop-only { display: none; }
  .mobile-only { display: flex; }
}
</style>
