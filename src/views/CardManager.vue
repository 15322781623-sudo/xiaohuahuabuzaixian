<template>
  <div class="card-manager-page">
    <div class="page-header">
      <h1> 卡密管理</h1>
      <p class="page-desc">生成和管理软件激活卡密</p>
    </div>

    <!-- 设备激活验证 -->
    <div v-if="!deviceActivated" class="access-denied-card">
      <div class="denied-icon"></div>
      <h3>访问被拒绝</h3>
      <p class="denied-message">
        只有使用有效激活码绑定的设备才能访问卡密管理页面。
      </p>
      <p class="denied-hint">
        请先在主页面完成卡密激活，然后再访问此页面。
      </p>
      <div class="device-info" v-if="currentDeviceId">
        <span class="label">当前设备 ID：</span>
        <code>{{ currentDeviceId }}</code>
      </div>
      <n-button type="primary" @click="goToActivate" size="large">
        前往激活
      </n-button>
    </div>

    <!-- 管理员密码验证 -->
    <div v-else-if="!adminVerified" class="admin-login-card">
      <h3>管理员验证</h3>
      <div class="password-input-row">
        <n-input
          v-model:value="adminPassword"
          type="password"
          show-password-on="click"
          placeholder="请输入管理员密码"
          size="large"
          @keyup.enter="verifyAdmin"
          :loading="verifying"
        />
        <n-button type="primary" size="large" @click="verifyAdmin" :loading="verifying">
          验证
        </n-button>
      </div>
      <p v-if="adminError" class="admin-error">{{ adminError }}</p>
    </div>

    <!-- 管理面板 -->
    <div v-else class="admin-panel">
      <!-- 操作区 -->
      <div class="action-card">
        <h3>生成卡密</h3>
        <div class="generate-row">
          <n-input-number
            v-model:value="generateCount"
            :min="1"
            :max="100"
            placeholder="数量"
            size="large"
            style="width: 160px;"
          />
          <n-button type="primary" size="large" @click="generateCards" :loading="generating">
            生成
          </n-button>
        </div>

        <!-- 生成结果 -->
        <div v-if="generatedKeys.length > 0" class="generated-keys">
          <div class="keys-header">
            <span>已生成 {{ generatedKeys.length }} 个卡密</span>
            <n-button text type="primary" size="small" @click="copyAllKeys">
              📋 复制全部
            </n-button>
          </div>
          <div class="keys-list">
            <div v-for="key in generatedKeys" :key="key" class="key-item" @click="copyKey(key)">
              <code>{{ key }}</code>
              <n-button text size="tiny" type="primary">复制</n-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 卡密列表 -->
      <div class="cards-list-card">
        <div class="list-header">
          <h3>卡密列表</h3>
          <div class="list-header-actions">
            <n-input
              v-model:value="searchText"
              placeholder="搜索卡密 / 状态 / 设备ID"
              size="small"
              clearable
              style="width: 220px;"
            />
            <n-button size="small" @click="loadCards" :loading="loading">
              🔄 刷新
            </n-button>
          </div>
        </div>

        <div v-if="filteredCards.length === 0 && !loading" class="empty-state">
          {{ searchText ? '没有匹配的卡密' : '暂无卡密，请先生成' }}
        </div>

        <div v-else class="cards-table">
          <div class="table-header">
            <span class="col-index">#</span>
            <span class="col-key">卡密</span>
            <span class="col-status">状态</span>
            <span class="col-time">创建时间</span>
            <span class="col-device">绑定设备</span>
            <span class="col-action">操作</span>
          </div>
          <div v-for="(card, index) in filteredCards" :key="card.cardKey" class="table-row">
            <span class="col-index text-muted">{{ index + 1 }}</span>
            <span class="col-key">
              <code class="card-key-code">{{ card.cardKey }}</code>
            </span>
            <span class="col-status">
              <n-tag :type="card.status === 'activated' ? 'success' : 'warning'" size="small">
                {{ card.status === 'activated' ? '已激活' : '未使用' }}
              </n-tag>
            </span>
            <span class="col-time">
              {{ formatDate(card.createdAt) }}
            </span>
            <span class="col-device">
              <span v-if="card.deviceId" class="device-id-short" :title="card.deviceId">
                {{ card.deviceId.slice(0, 8) }}...
              </span>
              <span v-else class="text-muted">-</span>
            </span>
            <span class="col-action">
              <n-button size="tiny" type="warning" @click="resetCard(card.cardKey)" :loading="actionLoading === card.cardKey">
                重置
              </n-button>
              <n-button size="tiny" type="error" @click="deleteCard(card.cardKey)" :loading="actionLoading === card.cardKey" style="margin-left: 4px;">
                删除
              </n-button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, NInputNumber, NTag, useMessage } from 'naive-ui';
import { isActivated, getDeviceId } from '@/utils/deviceFingerprint';

const WORKER_BASE = 'https://apk.xiaohuaxyzw.top';
const message = useMessage();
const router = useRouter();

// 设备激活验证
const deviceActivated = ref(false);
const currentDeviceId = ref('');
const checkingDevice = ref(true);

// 管理员验证
const adminPassword = ref('');
const adminVerified = ref(false);
const adminError = ref('');
const verifying = ref(false);

// 生成卡密
const generateCount = ref(1);
const generating = ref(false);
const generatedKeys = ref([]);

// 卡密列表
const cards = ref([]);
const loading = ref(false);
const actionLoading = ref('');

// 搜索
const searchText = ref('');
const filteredCards = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) return cards.value;
  return cards.value.filter(card =>
    card.cardKey.toLowerCase().includes(keyword)
    || (card.status === 'activated' ? '已激活' : '未使用').includes(keyword)
    || (card.deviceId || '').toLowerCase().includes(keyword)
  );
});

/**
 * 验证管理员密码
 */
const verifyAdmin = async () => {
  if (!adminPassword.value) {
    adminError.value = '请输入管理员密码';
    return;
  }
  verifying.value = true;
  adminError.value = '';

  try {
    // 获取设备信息
    const deviceId = await getDeviceId();
    const activatedData = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    const cardKey = activatedData?.cardKey || '';

    // 用 list 接口测试密码是否正确（同时验证设备）
    const resp = await fetch(`${WORKER_BASE}/api/card/list`, {
      headers: {
        'X-Admin-Password': adminPassword.value,
        'X-Device-Id': deviceId,
        'X-Card-Key': cardKey,
      },
    });
    const data = await resp.json();

    if (data.success) {
      adminVerified.value = true;
      cards.value = data.cards || [];
      message.success('验证成功');
    } else {
      adminError.value = data.error || '密码错误';
    }
  } catch (e) {
    adminError.value = `网络错误：${e.message}`;
  } finally {
    verifying.value = false;
  }
};

/**
 * 批量生成卡密
 */
const generateCards = async () => {
  generating.value = true;
  try {
    const deviceId = await getDeviceId();
    const activatedData = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    const cardKey = activatedData?.cardKey || '';

    const resp = await fetch(`${WORKER_BASE}/api/card/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword.value,
        'X-Device-Id': deviceId,
        'X-Card-Key': cardKey,
      },
      body: JSON.stringify({ count: generateCount.value, deviceId, cardKey }),
    });
    const data = await resp.json();

    if (data.success) {
      generatedKeys.value = data.keys;
      message.success(`成功生成 ${data.count} 个卡密`);
      // 刷新列表
      await loadCards();
    } else {
      message.error(data.error || '生成失败');
    }
  } catch (e) {
    message.error(`网络错误：${e.message}`);
  } finally {
    generating.value = false;
  }
};

/**
 * 加载卡密列表
 */
const loadCards = async () => {
  loading.value = true;
  try {
    const deviceId = await getDeviceId();
    const activatedData = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    const cardKey = activatedData?.cardKey || '';

    const resp = await fetch(`${WORKER_BASE}/api/card/list`, {
      headers: {
        'X-Admin-Password': adminPassword.value,
        'X-Device-Id': deviceId,
        'X-Card-Key': cardKey,
      },
    });
    const data = await resp.json();

    if (data.success) {
      cards.value = data.cards || [];
    } else {
      message.error(data.error || '加载失败');
    }
  } catch (e) {
    message.error(`网络错误：${e.message}`);
  } finally {
    loading.value = false;
  }
};

/**
 * 重置卡密
 */
const resetCard = async (cardKey) => {
  actionLoading.value = cardKey;
  try {
    const deviceId = await getDeviceId();
    const activatedData = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    const currentCardKey = activatedData?.cardKey || '';

    const resp = await fetch(`${WORKER_BASE}/api/card/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword.value,
        'X-Device-Id': deviceId,
        'X-Card-Key': currentCardKey,
      },
      body: JSON.stringify({ targetCardKey: cardKey, action: 'reset', deviceId, cardKey: currentCardKey }),
    });
    const data = await resp.json();

    if (data.success) {
      message.success('卡密已重置');
      await loadCards();
    } else {
      message.error(data.error || '重置失败');
    }
  } catch (e) {
    message.error(`网络错误：${e.message}`);
  } finally {
    actionLoading.value = '';
  }
};

/**
 * 删除卡密
 */
const deleteCard = async (cardKey) => {
  if (!confirm(`确定要删除卡密 ${cardKey} 吗？`)) return;

  actionLoading.value = cardKey;
  try {
    const deviceId = await getDeviceId();
    const activatedData = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    const currentCardKey = activatedData?.cardKey || '';

    const resp = await fetch(`${WORKER_BASE}/api/card/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword.value,
        'X-Device-Id': deviceId,
        'X-Card-Key': currentCardKey,
      },
      body: JSON.stringify({ targetCardKey: cardKey, action: 'delete', deviceId, cardKey: currentCardKey }),
    });
    const data = await resp.json();

    if (data.success) {
      message.success('卡密已删除');
      await loadCards();
    } else {
      message.error(data.error || '删除失败');
    }
  } catch (e) {
    message.error(`网络错误：${e.message}`);
  } finally {
    actionLoading.value = '';
  }
};

/**
 * 复制单个卡密
 */
const copyKey = (key) => {
  navigator.clipboard.writeText(key).then(() => {
    message.success('已复制');
  }).catch(() => {
    message.error('复制失败');
  });
};

/**
 * 复制全部卡密
 */
const copyAllKeys = () => {
  const text = generatedKeys.value.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制全部');
  }).catch(() => {
    message.error('复制失败');
  });
};

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 检查设备激活状态
 */
const checkDeviceActivation = async () => {
  checkingDevice.value = true;
  try {
    // 获取当前设备 ID
    currentDeviceId.value = await getDeviceId();
    
    // 检查是否已激活
    const activated = await isActivated();
    deviceActivated.value = activated;
    
    if (!activated) {
      console.log('[卡密管理] 设备未激活，拒绝访问');
    }
  } catch (e) {
    console.error('[卡密管理] 设备验证失败:', e);
    deviceActivated.value = false;
  } finally {
    checkingDevice.value = false;
  }
};

/**
 * 前往激活页面
 */
const goToActivate = () => {
  router.push('/');
};

// 组件挂载时检查设备激活状态
onMounted(() => {
  checkDeviceActivation();
});
</script>

<style scoped>
.card-manager-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0 0 4px;
}

.page-desc {
  color: #999;
  font-size: 14px;
  margin: 0;
}

/* 访问被拒绝卡片 */
.access-denied-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 480px;
  margin: 40px auto;
}

.denied-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.access-denied-card h3 {
  margin: 0 0 16px;
  font-size: 20px;
  color: #333;
}

.denied-message {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 12px;
}

.denied-hint {
  color: #999;
  font-size: 13px;
  margin: 0 0 20px;
}

.device-info {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
}

.device-info .label {
  color: #666;
}

.device-info code {
  font-family: 'Courier New', monospace;
  color: #333;
  word-break: break-all;
}

.access-denied-card .n-button {
  margin-top: 8px;
}

/* 管理员登录卡片 */
.admin-login-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.admin-login-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
}

.password-input-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.password-input-row .n-input {
  flex: 1;
  min-width: 160px;
}

.admin-error {
  color: #ff4d4f;
  font-size: 13px;
  margin-top: 8px;
}

/* 管理面板 */
.admin-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-card,
.cards-list-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.action-card h3,
.list-header h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.generate-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* 生成结果 */
.generated-keys {
  margin-top: 16px;
  background: #f6f8fa;
  border-radius: 8px;
  padding: 12px;
}

.keys-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
  gap: 8px;
  flex-wrap: wrap;
}

.keys-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.key-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  gap: 8px;
  word-break: break-all;
}

.key-item:hover {
  background: #e8f4fd;
}

.key-item code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  letter-spacing: 1px;
}

/* 卡密列表 */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

.list-header h3 {
  flex-shrink: 0;
}

.list-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.list-header-actions .n-input {
  flex: 1;
  max-width: 260px;
  min-width: 140px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 14px;
}

.cards-table {
  font-size: 13px;
}

.table-header {
  display: flex;
  padding: 8px 0;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;
  color: #666;
}

.table-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.col-index {
  flex: 0 0 36px;
  width: 36px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

.col-key {
  flex: 2;
  min-width: 0;
}

.col-status {
  flex: 1;
}

.col-time {
  flex: 1;
  font-size: 12px;
  color: #999;
}

.col-device {
  flex: 1;
  font-size: 11px;
}

.col-action {
  flex: 1;
  text-align: right;
}

.card-key-code {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  word-break: break-all;
}

.device-id-short {
  font-family: monospace;
  color: #999;
  word-break: break-all;
}

.text-muted {
  color: #ccc;
}

/* 深色主题 */
html.dark .admin-login-card,
html.dark .action-card,
html.dark .cards-list-card,
html[data-theme="dark"] .admin-login-card,
html[data-theme="dark"] .action-card,
html[data-theme="dark"] .cards-list-card {
  background: rgba(255, 255, 255, 0.08);
}

html.dark .generated-keys,
html[data-theme="dark"] .generated-keys {
  background: rgba(255, 255, 255, 0.05);
}

html.dark .key-item,
html[data-theme="dark"] .key-item {
  background: rgba(255, 255, 255, 0.05);
}

html.dark .key-item:hover,
html[data-theme="dark"] .key-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

html.dark .card-key-code,
html[data-theme="dark"] .card-key-code {
  background: rgba(255, 255, 255, 0.1);
}

html.dark .table-header,
html[data-theme="dark"] .table-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

html.dark .table-row,
html[data-theme="dark"] .table-row {
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

html.dark .access-denied-card,
html[data-theme="dark"] .access-denied-card {
  background: rgba(255, 255, 255, 0.08);
}

html.dark .access-denied-card h3,
html[data-theme="dark"] .access-denied-card h3 {
  color: #fff;
}

html.dark .denied-message,
html[data-theme="dark"] .denied-message {
  color: #ccc;
}

html.dark .device-info,
html[data-theme="dark"] .device-info {
  background: rgba(255, 255, 255, 0.05);
}

html.dark .device-info code,
html[data-theme="dark"] .device-info code {
  color: #fff;
}

/* 移动端响应式适配 */
@media (max-width: 768px) {
  .card-manager-page {
    padding: 12px;
  }

  .admin-login-card,
  .action-card,
  .cards-list-card {
    padding: 16px;
    border-radius: 10px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .password-input-row,
  .generate-row {
    flex-direction: column;
    align-items: stretch;
  }

  .password-input-row .n-input,
  .generate-row .n-input-number,
  .generate-row .n-button {
    width: 100% !important;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .list-header-actions .n-input {
    max-width: none;
    width: 100%;
    flex: 1;
  }

  /* 表格改为卡片式布局 */
  .table-header {
    display: none;
  }

  .table-row {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
    margin-bottom: 8px;
    background: #fafafa;
    border-radius: 8px;
    border-bottom: none;
    gap: 8px;
  }

  .table-row:last-child {
    margin-bottom: 0;
  }

  .col-index,
  .col-key,
  .col-status,
  .col-time,
  .col-device,
  .col-action {
    flex: none;
    width: 100%;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .col-index::before {
    content: "#";
    font-weight: 600;
    color: #666;
    width: 60px;
    flex-shrink: 0;
  }

  .col-key::before {
    content: "卡密";
    font-weight: 600;
    color: #666;
    width: 60px;
    flex-shrink: 0;
  }

  .col-status::before {
    content: "状态";
    font-weight: 600;
    color: #666;
    width: 60px;
    flex-shrink: 0;
  }

  .col-time::before {
    content: "创建时间";
    font-weight: 600;
    color: #666;
    width: 60px;
    flex-shrink: 0;
  }

  .col-device::before {
    content: "绑定设备";
    font-weight: 600;
    color: #666;
    width: 60px;
    flex-shrink: 0;
  }

  .col-action {
    justify-content: flex-end;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }

  .col-action::before {
    content: none;
  }

  .card-key-code {
    flex: 1;
  }

  .device-id-short {
    flex: 1;
  }

  html.dark .table-row,
  html[data-theme="dark"] .table-row {
    background: rgba(255, 255, 255, 0.04);
  }

  html.dark .col-action,
  html[data-theme="dark"] .col-action {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
