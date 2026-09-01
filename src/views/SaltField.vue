<template>
  <div class="salt-field-page">
    <div class="container">
      <div class="page-header">
        <h1>⛏️ 盐场刨地</h1>
        <p>纯前端执行 · 每周六 20:00-21:00 自动刨地 · 需保持页面打开</p>
      </div>

      <!-- 使用说明 -->
      <n-alert type="info" :bordered="false">
        <strong>活动时间：</strong>每周六 20:00 ~ 21:00（北京时间）<br />
        <strong>执行方式：</strong>纯前端 WebSocket 直连游戏服务器，勾选账号保存后，周六 20:00 页面打开时自动执行；也可随时点账号行的"开始"立即执行<br />
        <strong>注意事项：</strong>浏览器需保持打开，关闭页面或标签页会停止刨地
      </n-alert>

      <!-- 操作区 -->
      <div class="action-bar">
        <n-button type="primary" @click="saveEnabled">
          保存参与账号 ({{ enabledIds.length }})
        </n-button>
        <n-button :loading="refreshing" @click="refreshStatus">刷新状态</n-button>
        <n-button type="success" :disabled="!canStartAny" @click="startAll">全部开始</n-button>
        <n-button type="error" :disabled="!hasRunning" @click="stopAll">全部停止</n-button>
        <span v-if="hasRunning > 0" class="running-count">
          🔥 {{ hasRunning }} 个账号正在刨地中...
        </span>
      </div>

      <!-- 账号表格 -->
      <n-data-table
        :columns="columns"
        :data="tableData"
        :scroll-x="1200"
        row-key="id"
        :pagination="pagination"
        :loading="loading"
        virtual-scroll
      />

      <!-- 运行日志 -->
      <n-card title="运行日志" :bordered="true" class="log-card">
        <div class="log-list">
          <div v-if="logs.length === 0" class="log-empty">暂无日志，点击"开始"开始刨地</div>
          <div v-for="(log, i) in logs" :key="i" class="log-item">
            <span class="log-time">{{ log.time }}</span>
            <span :class="['log-msg', log.type]">{{ log.message }}</span>
          </div>
        </div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, h } from 'vue';
import { NButton, NTag, useMessage } from 'naive-ui';
import { useTokenStore } from '@/stores/tokenStore';
import { createTasksSaltField, inSaltFieldWindow } from '@/utils/batch/tasksSaltField';
import { createConnectionManager } from '@/utils/batch/connectionManager';

const message = useMessage();
const tokenStore = useTokenStore();

// 参与账号本地存储 key
const SALT_ENABLED_KEY = 'saltFieldEnabledTokens';

// 页面状态
const loading = ref(false);
const refreshing = ref(false);
const enabledIds = ref<string[]>([]);
const statusMap = ref<Record<string, any>>({});
const runningMap = ref<Record<string, boolean>>({});
const stopMap: Record<string, any> = reactive({});
const logs = ref<any[]>([]);

// 任务依赖（复用前端盐场刨地逻辑）
const selectedTokens = ref<string[]>([]);
const tokenStatus = ref<Record<string, any>>({});
const isRunning = ref(false);
const shouldStop = ref(false);
const batchSettings = reactive({
  maxActive: 10,
  defaultCommandTimeout: 8000,
  defaultRetryCount: 1,
  connectionTimeout: 15000,
  reconnectDelay: 3000,
});

const addLog = (entry: any) => {
  logs.value.push({ ...entry, ts: Date.now() });
  if (logs.value.length > 300) logs.value.splice(0, logs.value.length - 300);
};
const safeDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const { ensureConnection } = createConnectionManager({ tokenStore, batchSettings, addLog });
// connectionManager 签名为 (tokenId, tokens, maxRetries)；任务内调用为 (tokenId, maxRetries)
const wrappedEnsureConnection = async (tokenId: string, maxRetries = 1) => {
  await ensureConnection(tokenId, tokenStore.gameTokens || [], maxRetries);
};

const sf = createTasksSaltField({
  tokenStore,
  addLog,
  tokenStatus,
  selectedTokens,
  isRunning,
  shouldStop,
  batchSettings,
  safeDelay,
  getModuleDelay: null,
  ensureConnection: wrappedEnsureConnection,
});

// 数据
const tokens = computed(() => tokenStore.gameTokens || []);
const hasRunning = computed(() =>
  Object.values(statusMap.value).filter((s: any) => s.status === 'running').length
);
const canStartAny = computed(() => tableData.value.some((r: any) => !runningMap.value[r.id]));

const tableData = computed(() =>
  tokens.value.map((t: any) => {
    const st = statusMap.value[t.id] || { status: 'idle', lastMsg: '' };
    return {
      tokenId: t.id,
      id: t.id,
      name: t.name || t.id,
      server: t.server || '',
      isChecked: enabledIds.value.includes(t.id),
      ...st,
    };
  })
);

const pagination = {
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
};

const statusMeta: Record<string, [string, string]> = {
  idle: ['default', '空闲'],
  running: ['success', '刨地中'],
  completed: ['info', '已完成'],
  failed: ['error', '失败'],
  stopped: ['warning', '已停止'],
};

// 表格列
const columns = [
  {
    title: '',
    key: 'isChecked',
    width: 60,
    render(row: any) {
      return h('input', {
        type: 'checkbox',
        checked: row.isChecked,
        onChange: (e: Event) => {
          const v = (e.target as HTMLInputElement).checked;
          enabledIds.value = v
            ? [...enabledIds.value, row.id]
            : enabledIds.value.filter((id) => id !== row.id);
        },
        style: { cursor: 'pointer' },
      });
    },
  },
  { title: '账号名', key: 'name', width: 160, ellipsis: { tooltip: true } },
  { title: '服务器', key: 'server', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: any) {
      const meta = statusMeta[row.status] || ['default', row.status || '-'];
      return h(NTag, { type: meta[0] as any, size: 'small' }, () => meta[1]);
    },
  },
  { title: '最近信息', key: 'lastMsg', width: 260, ellipsis: { tooltip: true }, render: (r: any) => r.lastMsg || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row: any) {
      if (runningMap.value[row.id]) {
        return h(NButton, {
          size: 'small',
          type: 'error',
          onClick: () => stopOne(row.id, row.name),
        }, () => '停止');
      }
      return h(NButton, {
        size: 'small',
        type: 'primary',
        onClick: () => startOne(row.id),
      }, () => '开始');
    },
  },
];

// 参与账号（localStorage）
function loadEnabled() {
  try {
    enabledIds.value = JSON.parse(localStorage.getItem(SALT_ENABLED_KEY) || '[]');
  } catch {
    enabledIds.value = [];
  }
}

function saveEnabled() {
  localStorage.setItem(SALT_ENABLED_KEY, JSON.stringify(enabledIds.value));
  message.success(`已保存 ${enabledIds.value.length} 个参与账号`);
}

function refreshStatus() {
  refreshing.value = true;
  setTimeout(() => {
    refreshing.value = false;
    message.success('状态已刷新');
  }, 300);
}

// 单账号开始 / 停止
async function startOne(tokenId: string) {
  if (runningMap.value[tokenId]) return;
  const token = tokens.value.find((t: any) => t.id === tokenId);
  if (!token) {
    message.error('未找到账号 Token');
    return;
  }

  runningMap.value = { ...runningMap.value, [tokenId]: true };
  const stopRef = ref(false);
  stopMap[tokenId] = stopRef;
  statusMap.value[tokenId] = { status: 'running', lastMsg: '启动中...' };

  const success = await sf.saltFieldDigForToken(tokenId, token, {
    stopRef,
    skipWindowCheck: true,
  });

  statusMap.value[tokenId] = {
    status: success ? 'completed' : 'failed',
    lastMsg: success ? '刨地结束' : '刨地失败',
  };
  runningMap.value = { ...runningMap.value, [tokenId]: false };
  delete stopMap[tokenId];
}

function stopOne(tokenId: string, name: string) {
  if (stopMap[tokenId]) {
    stopMap[tokenId].value = true;
    statusMap.value[tokenId] = {
      ...(statusMap.value[tokenId] || {}),
      status: 'stopped',
      lastMsg: '正在停止...',
    };
    message.success(`${name || tokenId} 已请求停止`);
  }
}

// 全部开始 / 停止
async function startAll() {
  const idle = tableData.value.filter((r: any) => !runningMap.value[r.id]);
  if (!idle.length) {
    message.warning('没有可开始的账号');
    return;
  }
  idle.forEach((r: any) => startOne(r.id));
  message.success(`已开始 ${idle.length} 个账号`);
}

function stopAll() {
  const running = tableData.value.filter((r: any) => runningMap.value[r.id]);
  running.forEach((r: any) => stopOne(r.id, r.name));
  message.success('已请求全部停止');
}

// 周六 20:00-21:00 页面打开时自动执行勾选账号
function tryAutoStart() {
  if (!inSaltFieldWindow()) return;
  const targets = tableData.value.filter((r: any) => r.isChecked && !runningMap.value[r.id]);
  if (targets.length) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⏰ 已进入盐场时间窗，自动开始 ${targets.length} 个勾选账号`,
      type: 'info',
    });
    targets.forEach((r: any) => startOne(r.id));
  }
}

onMounted(() => {
  loadEnabled();
  tryAutoStart();
});
</script>

<style scoped lang="scss">
.salt-field-page {
  min-height: 100dvh;
  background: var(--bg-secondary);
  padding: var(--spacing-xl) 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);

  h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
  }

  p {
    color: var(--text-secondary);
    font-size: var(--font-size-lg);
  }
}

.action-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-lg);
  margin: var(--spacing-xl) 0;
  flex-wrap: wrap;
}

.running-count {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--success-color);
}

.log-card {
  margin-top: var(--spacing-xl);
}

.log-list {
  max-height: 320px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.7;
}

.log-empty {
  color: var(--text-secondary);
  text-align: center;
  padding: 16px 0;
}

.log-item {
  display: flex;
  gap: 8px;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.15);
  padding: 2px 0;
}

.log-time {
  color: var(--text-secondary);
  flex-shrink: 0;
  font-family: monospace;
}

.log-msg.info { color: var(--text-primary); }
.log-msg.success { color: var(--success-color); }
.log-msg.warning { color: #f0a020; }
.log-msg.error { color: var(--error-color); }

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
