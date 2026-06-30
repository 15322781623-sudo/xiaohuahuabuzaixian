<template>
  <n-modal
    :show="visible"
    :mask-closable="false"
    :closable="false"
    preset="card"
    title="激活软件"
    style="width: 420px; max-width: 90vw;"
  >
    <div class="card-key-dialog">
      <p class="dialog-desc">请输入您的激活卡密以继续使用</p>
      
      <n-input
        v-model:value="inputCardKey"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        size="large"
        :disabled="loading"
        @keyup.enter="handleActivate"
      />
      
      <n-alert
        v-if="errorMsg"
        type="error"
        :show-icon="false"
        style="margin-top: 12px;"
      >
        {{ errorMsg }}
      </n-alert>

      <div class="reset-section">
        <n-button
          v-if="!showReset"
          text
          type="primary"
          size="small"
          @click="showReset = true"
        >
          更换设备？点击重置卡密
        </n-button>
        
        <div v-else class="reset-box">
          <p class="reset-desc">输入需要重置的卡密，重置后可在新设备激活</p>
          <n-input
            v-model:value="resetCardKey"
            placeholder="请输入要重置的卡密"
            size="medium"
            :disabled="resetLoading"
            @keyup.enter="handleReset"
          />
          <div class="reset-actions">
            <n-button size="small" @click="showReset = false" :disabled="resetLoading">
              取消
            </n-button>
            <n-button size="small" type="warning" :loading="resetLoading" @click="handleReset">
              重置
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <n-button type="primary" size="large" :loading="loading" block @click="handleActivate">
        激活
      </n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { NModal, NInput, NButton, NAlert } from 'naive-ui';
import { getDeviceId, saveActivation, resetActivationSessionCache } from '@/utils/deviceFingerprint';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['success', 'close']);

const WORKER_BASE = 'https://apk.xiaohuaxyzw.top';

const inputCardKey = ref('');
const loading = ref(false);
const errorMsg = ref('');

const showReset = ref(false);
const resetCardKey = ref('');
const resetLoading = ref(false);

// 弹窗打开时清空状态
watch(() => props.visible, (val) => {
  if (val) {
    inputCardKey.value = '';
    errorMsg.value = '';
    showReset.value = false;
    resetCardKey.value = '';
  }
});

/**
 * 激活卡密
 */
const handleActivate = async () => {
  const cardKey = inputCardKey.value.trim().toUpperCase();
  if (!cardKey) {
    errorMsg.value = '请输入卡密';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    const deviceId = await getDeviceId();
    const resp = await fetch(`${WORKER_BASE}/api/card/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardKey, deviceId }),
    });
    const data = await resp.json();

    if (data.success) {
      await saveActivation(cardKey);
      emit('success');
    } else {
      errorMsg.value = data.error || '激活失败';
    }
  } catch (e) {
    errorMsg.value = `网络错误：${e.message}`;
  } finally {
    loading.value = false;
  }
};

/**
 * 自助重置卡密
 */
const handleReset = async () => {
  const cardKey = resetCardKey.value.trim().toUpperCase();
  if (!cardKey) {
    errorMsg.value = '请输入需要重置的卡密';
    return;
  }

  resetLoading.value = true;
  errorMsg.value = '';

  try {
    const deviceId = await getDeviceId();
    const resp = await fetch(`${WORKER_BASE}/api/card/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardKey, deviceId }),
    });
    const data = await resp.json();

    if (data.success) {
      // 清除本地激活缓存，让用户重新输入卡密激活
      resetActivationSessionCache();
      showReset.value = false;
      resetCardKey.value = '';
      errorMsg.value = '';
      window.$message?.success('卡密已重置，请重新激活');
    } else {
      errorMsg.value = data.error || '重置失败';
    }
  } catch (e) {
    errorMsg.value = `网络错误：${e.message}`;
  } finally {
    resetLoading.value = false;
  }
};
</script>

<style scoped>
.card-key-dialog {
  padding: 8px 0;
}

.dialog-desc {
  color: #666;
  font-size: 14px;
  margin: 0 0 16px;
}

.reset-section {
  margin-top: 16px;
}

.reset-box {
  background: #f6f8fa;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.reset-desc {
  color: #666;
  font-size: 12px;
  margin: 0 0 8px;
}

.reset-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
</style>
