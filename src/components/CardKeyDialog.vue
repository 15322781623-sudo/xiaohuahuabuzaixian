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
          <p class="reset-desc">输入需要重置的卡密，重置后可在新设备激活（24小时内最多重置3次）</p>
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

    <!-- 赞助按钮 -->
    <div style="text-align: center; margin-top: 12px;">
      <n-button text type="warning" size="small" @click="showSponsor = true">
        ❤️ 赞助支持
      </n-button>
    </div>

    <template #footer>
      <n-button type="primary" size="large" :loading="loading" block @click="handleActivate">
        激活
      </n-button>
    </template>
  </n-modal>

  <!-- 赞助弹窗 -->
  <n-modal
    v-model:show="showSponsor"
    preset="card"
    title="赞助支持"
    style="width: 90%; max-width: 400px;"
    :bordered="false"
  >
    <div style="text-align: center; padding: 16px 0;">
      <p style="margin-bottom: 12px; color: #666; font-size: 14px;">感谢您的支持！扫码赞助作者 ❤️</p>
      <div style="background: #fff8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; text-align: left;">
        <p style="margin-bottom: 8px; color: #e67e22; font-size: 14px; font-weight: bold;">📌 激活码赞助方案</p>
        <p style="margin-bottom: 4px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">10元</b> = 1个激活码</p>
        <p style="margin-bottom: 4px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">20元</b> = 3个激活码</p>
        <p style="margin-bottom: 8px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">30元</b> = 5个激活码</p>
        <p style="margin-bottom: 8px; color: #999; font-size: 12px;">（每人最高5个激活码，避免倒卖）</p>
        <p style="margin-bottom: 4px; color: #333; font-size: 13px;">🔄 激活码永久有效，可重置：在另一台设备输入激活码点击「重置卡密」即可</p>
        <p style="color: #333; font-size: 13px;">🎁 残卷赠送ID：<b style="color:#e74c3c;">83203221</b></p>
      </div>
      <p style="margin-bottom: 12px; color: #e67e22; font-size: 13px; font-weight: 500;">赞助后请在QQ联系我领取激活码<br/>联系方式：<span style="font-weight: bold; color: #c0392b; letter-spacing: 1px;">1607863356</span></p>
      <p style="margin-bottom: 12px; color: #999; font-size: 12px;">网页版目前太多人使用，暂时不再免费提供，赞助30以上可联系获取</p>
      <img :src="sponsorQrcode" alt="赞助二维码" style="max-width: 280px; width: 100%; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);" />
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { NModal, NInput, NButton, NAlert } from 'naive-ui';
import { getDeviceId, saveActivation, resetActivationSessionCache } from '@/utils/deviceFingerprint';
import sponsorQrcode from '@/assets/sponsor-qrcode.png';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['success', 'close']);

const WORKER_BASE = 'https://apk.xiaohuaxyzw.top';

// ✅ 卡密版本验证：上报构建时注入的版本号（旧版本 2.32.0-2.37.0 不上报该字段，服务端据此拦截）
const APP_VERSION_CODE = typeof __APK_VERSION_CODE__ !== 'undefined' && __APK_VERSION_CODE__ ? Number(__APK_VERSION_CODE__) : 23800;

const inputCardKey = ref('');
const loading = ref(false);
const errorMsg = ref('');

const showReset = ref(false);
const resetCardKey = ref('');
const resetLoading = ref(false);

const showSponsor = ref(false);

/**
 * 获取卡密的重置记录
 */
const getResetRecords = (cardKey) => {
  try {
    const raw = localStorage.getItem(`card_reset_records_${cardKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * 记录一次重置操作
 */
const recordReset = (cardKey) => {
  const records = getResetRecords(cardKey);
  records.push(Date.now());
  localStorage.setItem(`card_reset_records_${cardKey}`, JSON.stringify(records));
};

/**
 * 检查24小时内重置次数是否超限
 * @returns {{ allowed: boolean, used: number, remaining: number }}
 */
const checkResetLimit = (cardKey) => {
  const records = getResetRecords(cardKey);
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  // 过滤出24小时内的记录
  const recentRecords = records.filter((ts) => now - ts < twentyFourHours);
  const used = recentRecords.length;
  const maxResets = 3;
  return {
    allowed: used < maxResets,
    used,
    remaining: Math.max(0, maxResets - used),
  };
};

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
      body: JSON.stringify({ cardKey, deviceId, appVersionCode: APP_VERSION_CODE }),
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

  // 检查24小时内重置次数限制
  const limitCheck = checkResetLimit(cardKey);
  if (!limitCheck.allowed) {
    errorMsg.value = `该卡密24小时内已重置${limitCheck.used}次，已达上限（最多3次），请稍后再试`;
    resetLoading.value = false;
    return;
  }

  try {
    const deviceId = await getDeviceId();
    const resp = await fetch(`${WORKER_BASE}/api/card/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardKey, deviceId }),
    });
    const data = await resp.json();

    if (data.success) {
      // 记录本次重置
      recordReset(cardKey);
      // 清除本地激活缓存，让用户重新输入卡密激活
      resetActivationSessionCache();
      showReset.value = false;
      resetCardKey.value = '';
      errorMsg.value = '';
      const remaining = checkResetLimit(cardKey).remaining;
      window.$message?.success(`卡密已重置，请重新激活（24小时内还可重置${remaining}次）`);
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
