<template>
  <n-modal
    :show="show"
    preset="card"
    :title="loggedIn ? '☁️ 云端配置同步' : '☁️ 云端配置同步登录'"
    style="width: 420px; max-width: 92vw;"
    @update:show="(v) => $emit('update:show', v)"
  >
    <!-- 未登录：登录/注册 -->
    <div v-if="!loggedIn" class="cs-panel">
      <n-tabs v-model:value="activeTab" type="line" justify-content="space-evenly">
        <n-tab-pane name="login" tab="登录">
          <div class="cs-form">
            <n-input v-model:value="loginForm.username" placeholder="用户名" clearable />
            <n-input
              v-model:value="loginForm.password"
              type="password"
              placeholder="密码"
              show-password-on="click"
              @keyup.enter="handleLogin"
            />
            <n-button type="primary" block :loading="submitting" @click="handleLogin">
              登录并同步
            </n-button>
          </div>
        </n-tab-pane>
        <n-tab-pane name="register" tab="注册">
          <div class="cs-form">
            <n-input v-model:value="registerForm.username" placeholder="用户名（3-20位）" clearable />
            <n-input
              v-model:value="registerForm.password"
              type="password"
              placeholder="密码（至少6位）"
              show-password-on="click"
              @keyup.enter="handleRegister"
            />
            <n-button type="primary" block :loading="submitting" @click="handleRegister">
              注册账号
            </n-button>
          </div>
        </n-tab-pane>
      </n-tabs>
      <div class="cs-tip">
        登录后即可将本机配置（Token/分组/模板/设置）上传云端，换设备登录自动恢复
      </div>
    </div>

    <!-- 已登录：同步操作 -->
    <div v-else class="cs-panel">
      <!-- 账号信息卡 -->
      <div class="cs-account">
        <div class="cs-avatar">☁️</div>
        <div class="cs-account-info">
          <div class="cs-account-line">
            <b class="cs-username">{{ username }}</b>
            <n-tag v-if="approved" type="success" size="small" :bordered="false">已授权</n-tag>
            <n-tag v-else type="warning" size="small" :bordered="false">未授权</n-tag>
          </div>
          <div class="cs-account-sub">
            {{ cloudUpdatedAt ? `云端最近更新：${formatTime(cloudUpdatedAt)}` : "云端暂无配置，可上传本机配置" }}
          </div>
        </div>
      </div>

      <n-alert v-if="!approved" type="warning" :bordered="false" style="padding: 8px;">
        账号注册后需管理员在「云端后台」开通授权，才能使用上传/下载云端功能
      </n-alert>

      <!-- 本机上云 -->
      <div class="cs-card">
        <div class="cs-card-title">本机上云</div>
        <div class="cs-field-row">
          <span class="cs-field-label">设备名</span>
          <n-input
            v-model:value="deviceName"
            size="small"
            placeholder="用于区分多设备配置"
            @blur="handleDeviceNameSave"
            @keyup.enter="handleDeviceNameSave"
          />
        </div>
        <n-button type="primary" block :disabled="!approved" :loading="pushing" @click="handlePush">
          上传本地配置到云端
        </n-button>
        <div class="cs-card-hint">以「{{ deviceName }}」名义保存，各设备独立互不覆盖</div>
      </div>

      <!-- 云端快照列表 -->
      <div v-if="configs.length" class="cs-card">
        <div class="cs-card-title">
          云端设备配置
          <span class="cs-card-count">{{ configs.length }}</span>
        </div>
        <div class="cs-list">
          <div v-for="cfg in configs" :key="cfg.name" class="cs-list-row">
            <div class="cs-row-main">
              <div class="cs-row-name">
                <span class="cs-row-title">{{ cfg.name }}</span>
                <n-tag v-if="cfg.name === deviceName" size="tiny" type="primary" :bordered="false">本机</n-tag>
              </div>
              <div class="cs-row-time">{{ formatTime(cfg.updatedAt) }}</div>
            </div>
            <div class="cs-row-actions">
              <n-button size="tiny" type="warning" :disabled="!approved" :loading="pullingName === cfg.name" @click="handleRestore(cfg)">恢复</n-button>
              <n-button size="tiny" quaternary type="error" :disabled="!approved" @click="handleDeleteCfg(cfg)">删除</n-button>
            </div>
          </div>
        </div>
        <div class="cs-card-hint">点「恢复」将下载该配置并覆盖本机数据</div>
      </div>

      <!-- 自动同步 -->
      <div class="cs-switch-card">
        <div>
          <div class="cs-switch-title">自动同步</div>
          <div class="cs-switch-sub">本地配置变化后自动上传云端</div>
        </div>
        <n-switch :value="autoSync" :disabled="!approved" size="small" @update:value="handleAutoSync" />
      </div>

      <!-- 修改密码 -->
      <div v-if="showChangePwd" class="cs-card">
        <div class="cs-card-title">修改密码</div>
        <div class="cs-form">
          <n-input
            v-model:value="pwdForm.oldPassword"
            type="password"
            placeholder="当前密码"
            show-password-on="click"
            size="small"
          />
          <n-input
            v-model:value="pwdForm.newPassword"
            type="password"
            placeholder="新密码（至少6位）"
            show-password-on="click"
            size="small"
            @keyup.enter="handleChangePassword"
          />
          <n-button size="small" type="primary" block :loading="changingPwd" @click="handleChangePassword">
            确认修改
          </n-button>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="cs-footer">
        <n-button quaternary size="small" @click="showChangePwd = !showChangePwd">
          {{ showChangePwd ? "收起修改密码" : "修改密码" }}
        </n-button>
        <n-button quaternary size="small" @click="handleLogout">退出登录</n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { useDialog, useMessage } from "naive-ui";
import {
  isCloudLoggedIn,
  isCloudApproved,
  getCloudAuth,
  cloudLogin,
  cloudRegister,
  cloudLogout,
  cloudChangePassword,
  pushConfig,
  pullConfig,
  fetchConfigList,
  deleteCloudConfig,
  getDeviceName,
  setDeviceName,
  applySnapshot,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  startAutoSync,
} from "@/utils/cloudSync";

const props = defineProps({
  show: { type: Boolean, default: false },
});
defineEmits(["update:show"]);

const message = useMessage();
const dialog = useDialog();

const loggedIn = ref(isCloudLoggedIn());
const username = ref(getCloudAuth().username);
const approved = ref(isCloudApproved());
const cloudUpdatedAt = ref("");
const autoSync = ref(isAutoSyncEnabled());
const activeTab = ref("login");
const submitting = ref(false);
const pushing = ref(false);
const pullingName = ref("");
const deviceName = ref(getDeviceName());
const configs = ref([]);

const loginForm = ref({ username: "", password: "" });
const registerForm = ref({ username: "", password: "" });
const showChangePwd = ref(false);
const changingPwd = ref(false);
const pwdForm = ref({ oldPassword: "", newPassword: "" });

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const refreshState = () => {
  loggedIn.value = isCloudLoggedIn();
  username.value = getCloudAuth().username;
  approved.value = isCloudApproved();
  autoSync.value = isAutoSyncEnabled();
  deviceName.value = getDeviceName();
  configs.value = [];
};

/** 拉取云端设备快照列表 */
const loadConfigs = async () => {
  if (!loggedIn.value || !approved.value) return;
  try {
    configs.value = await fetchConfigList();
  } catch {
    /* 列表拉取失败不阻断 */
  }
};

/** 弹窗打开时刷新快照列表 */
watch(
  () => props.show,
  (v) => {
    if (v) loadConfigs();
  }
);

/** 修改本机设备名（失焦/回车保存） */
const handleDeviceNameSave = () => {
  try {
    deviceName.value = setDeviceName(deviceName.value);
  } catch (e) {
    message.error(e.message || "设备名不合法");
    deviceName.value = getDeviceName();
  }
};

/** 登录成功后：本地无Token且云端有配置时自动恢复 */
const afterLogin = async (result) => {
  loggedIn.value = true;
  username.value = result.username;
  approved.value = !!result.approved;
  cloudUpdatedAt.value = result.configUpdatedAt || "";
  configs.value = Array.isArray(result.configs) ? result.configs : [];
  if (isAutoSyncEnabled()) startAutoSync();
  if (!approved.value) return; // 未授权不触发自动恢复
  let localEmpty = true;
  try {
    const raw = localStorage.getItem("gameTokens");
    localEmpty = !raw || (JSON.parse(raw) || []).length === 0;
  } catch {
    localEmpty = true;
  }
  if (result.hasConfig && localEmpty) {
    try {
      const cfg = await pullConfig();
      message.success("检测到云端配置，自动恢复中…");
      setTimeout(() => applySnapshot(cfg.data), 600);
    } catch {
      /* 自动恢复失败不阻断 */
    }
  }
};

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    message.warning("请输入用户名和密码");
    return;
  }
  submitting.value = true;
  try {
    const result = await cloudLogin(loginForm.value.username, loginForm.value.password);
    message.success("登录成功");
    await afterLogin(result);
  } catch (e) {
    message.error(e.message || "登录失败");
  } finally {
    submitting.value = false;
  }
};

const handleRegister = async () => {
  if (!registerForm.value.username || !registerForm.value.password) {
    message.warning("请输入用户名和密码");
    return;
  }
  submitting.value = true;
  try {
    const result = await cloudRegister(registerForm.value.username, registerForm.value.password);
    message.success(result.approved ? "注册成功，已自动登录" : "注册成功，已自动登录（待管理员授权后可同步）");
    await afterLogin({ ...result, hasConfig: false, configUpdatedAt: null });
  } catch (e) {
    message.error(e.message || "注册失败");
  } finally {
    submitting.value = false;
  }
};

const handlePush = async () => {
  pushing.value = true;
  try {
    const { result, details } = await pushConfig(deviceName.value);
    cloudUpdatedAt.value = result.updatedAt || "";
    const sizeStr = details.compressed
      ? `${(details.rawBytes / 1024).toFixed(1)}KB → ${(details.compressedBytes / 1024).toFixed(1)}KB(gzip)`
      : `${(details.rawBytes / 1024).toFixed(1)}KB`;
    message.success(`已上传为「${deviceName.value}」，不会覆盖其他设备配置`);
    // 推送执行日志
    try {
      const tokenStore = useTokenStore();
      tokenStore.pushGlobalLog(
        `☁️ 配置已上传：${details.tokenCount} 个Token，${details.binCount} 个BIN，${sizeStr}`,
        "info"
      );
    } catch { /* ignore */ }
    await loadConfigs();
  } catch (e) {
    message.error(e.message || "上传失败");
    // 上传失败也推送到执行日志
    try {
      useTokenStore().pushGlobalLog(`❌ 云端上传失败：${e.message || "未知错误"}`, "error");
    } catch { /* ignore */ }
  } finally {
    pushing.value = false;
  }
};

/** 恢复指定设备快照（覆盖本地） */
const handleRestore = async (cfg) => {
  pullingName.value = cfg.name;
  let snapshot = null;
  try {
    snapshot = await pullConfig(cfg.name);
  } catch (e) {
    message.error(e.message || "下载失败");
  } finally {
    pullingName.value = "";
  }
  if (!snapshot) return;
  dialog.warning({
    title: `确认恢复「${cfg.name}」配置`,
    content: "将清空本机当前数据并替换为该云端配置，本机设备名切换为「" + cfg.name + "」（登录凭据保留），完成后页面自动刷新。是否继续？",
    positiveText: "下载并覆盖",
    negativeText: "取消",
    onPositiveClick: () => {
      message.success("正在恢复云端配置…");
      setTimeout(() => applySnapshot(snapshot.data, cfg.name), 300);
    },
  });
};

/** 删除指定设备的云端快照 */
const handleDeleteCfg = (cfg) => {
  dialog.warning({
    title: `删除云端「${cfg.name}」配置？`,
    content: "删除后该设备的云端配置将无法恢复，是否继续？",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await deleteCloudConfig(cfg.name);
        message.success("已删除");
        await loadConfigs();
      } catch (e) {
        message.error(e.message || "删除失败");
      }
    },
  });
};

const handleChangePassword = async () => {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) {
    message.warning("请输入当前密码和新密码");
    return;
  }
  if (pwdForm.value.newPassword.length < 6) {
    message.warning("新密码至少6位");
    return;
  }
  changingPwd.value = true;
  try {
    await cloudChangePassword(pwdForm.value.oldPassword, pwdForm.value.newPassword);
    message.success("密码修改成功");
    pwdForm.value = { oldPassword: "", newPassword: "" };
    showChangePwd.value = false;
  } catch (e) {
    message.error(e.message || "修改密码失败");
  } finally {
    changingPwd.value = false;
  }
};

const handleAutoSync = (on) => {
  setAutoSyncEnabled(on);
  autoSync.value = on;
  message.success(on ? "已开启自动同步" : "已关闭自动同步");
};

const handleLogout = () => {
  cloudLogout();
  refreshState();
  message.info("已退出云端账号");
};
</script>

<style scoped>
.cs-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cs-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
}
.cs-tip {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary, #999);
  background: var(--bg-secondary, #f5f7fa);
}

/* 账号信息卡 */
.cs-account {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-secondary, #f5f7fa);
}
.cs-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(24, 160, 88, 0.12);
  flex-shrink: 0;
}
.cs-account-info {
  min-width: 0;
}
.cs-account-line {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cs-username {
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.cs-account-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

/* 功能卡片 */
.cs-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));
}
.cs-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.cs-card-count {
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary, #999);
  background: var(--bg-secondary, #f5f7fa);
}
.cs-card-hint {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}
.cs-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cs-field-label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

/* 快照列表 */
.cs-list {
  display: flex;
  flex-direction: column;
}
.cs-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 2px;
}
.cs-list-row + .cs-list-row {
  border-top: 1px dashed var(--border-color, rgba(128, 128, 128, 0.2));
}
.cs-row-main {
  flex: 1;
  min-width: 0;
}
.cs-row-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.cs-row-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.cs-row-time {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-tertiary, #999);
}
.cs-row-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* 自动同步开关卡 */
.cs-switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-secondary, #f5f7fa);
}
.cs-switch-title {
  font-size: 13px;
  font-weight: 600;
}
.cs-switch-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

/* 底部操作 */
.cs-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 手机端自适应 */
@media (max-width: 480px) {
  .cs-list-row {
    flex-wrap: wrap;
  }
  .cs-row-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .cs-username {
    max-width: 140px;
  }
  .cs-row-title {
    max-width: 140px;
  }
}
</style>
