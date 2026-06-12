<template>
  <MyCard class="hang-up" :status-class="{ active: hangUp.isActive }">
    <template #icon>
      <img alt="挂机图标" src="/icons/174061875626614.png">
    </template>
    <template #title>
      <h3>挂机时间</h3>
      <p>已挂机：{{ formatTime(hangUp.elapsedTime) }}</p>
    </template>
    <template #badge>
      <span>{{ hangUp.isActive ? "挂机中" : "已完成" }}</span>
    </template>
    <template #default>
      <div class="time-display">
        {{ formatTime(hangUp.remainingTime) }}
      </div>
    </template>
    <template #action>
      <button
        class="action-button secondary"
        :disabled="hangUp.isExtending"
        @click="extendHangUp"
      >
        <span v-if="hangUp.isExtending" class="loading-text">
          <i class="line-md:loading-loop"></i> 加钟中...
        </span>
        <span v-else>加钟</span>
      </button>
      <button
        class="action-button primary"
        :disabled="hangUp.isClaiming"
        @click="claimHangUpReward"
      >
        <span v-if="hangUp.isClaiming" class="loading-text">
          <i class="line-md:loading-loop"></i> 领取中...
        </span>
        <span v-else>领取奖励</span>
      </button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";

const tokenStore = useTokenStore();
const message = useMessage();
const roleInfo = computed(() => tokenStore.gameData?.roleInfo || null);

const hangUp = ref({
  isActive: false,
  remainingTime: 0,
  elapsedTime: 0,
  lastTime: 0,
  hangUpTime: 0,
  isExtending: false,
  isClaiming: false,
});

const formatTime = (seconds) => {
  const total = Math.floor(Number(seconds) || 0);
  if (total <= 0)
    return "00:00:00";
  const h = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const syncFromRole = () => {
  const role = roleInfo.value?.role;
  if (!role?.hangUp)
    return;

  const now = Date.now() / 1000;
  const serverLastTime = role.hangUp.lastTime;
  const serverHangUpTime = role.hangUp.hangUpTime;

  // ✅ 关键修复：只在 lastTime 或 hangUpTime 变化时才重新计算
  const hasChanged = hangUp.value.lastTime !== serverLastTime
    || hangUp.value.hangUpTime !== serverHangUpTime;

  if (hasChanged) {
    // 服务器数据有变化，重新同步
    hangUp.value.lastTime = serverLastTime;
    hangUp.value.hangUpTime = serverHangUpTime;

    const elapsed = now - serverLastTime;
    if (elapsed <= serverHangUpTime) {
      hangUp.value.remainingTime = Math.floor(serverHangUpTime - elapsed);
      hangUp.value.isActive = true;
    } else {
      hangUp.value.remainingTime = 0;
      hangUp.value.isActive = false;
    }

    // ✅ 关键修复：elapsedTime 直接基于 elapsed 计算，不依赖 remainingTime
    hangUp.value.elapsedTime = Math.floor(elapsed);
  } else {
    // 服务器数据无变化，继续使用定时器更新的值
    // ✅ 关键修复：验证 elapsedTime 是否异常，如果是则重新同步
    const hangUpTime = hangUp.value.hangUpTime || 0;
    if (hangUp.value.elapsedTime > hangUpTime && hangUpTime > 0) {
      // elapsedTime 异常，重新从服务器同步
      const elapsed = now - hangUp.value.lastTime;
      hangUp.value.elapsedTime = Math.floor(elapsed);
    }
    // 不做其他操作，保持定时器计算的准确性
  }
};

watch(roleInfo, () => syncFromRole(), { deep: true, immediate: true });

let timer = null;
onMounted(() => {
  timer = setInterval(() => {
    if (hangUp.value.isActive && hangUp.value.remainingTime > 0) {
      hangUp.value.remainingTime = Math.max(0, hangUp.value.remainingTime - 1);

      // ✅ 关键修复:只在 elapsedTime < hangUpTime 时才累加
      const hangUpTime = hangUp.value.hangUpTime || 0;
      if (hangUp.value.elapsedTime < hangUpTime) {
        hangUp.value.elapsedTime++;
      } else {
        // elapsedTime 已达到上限,不再累加
        hangUp.value.elapsedTime = hangUpTime;
      }

      if (hangUp.value.remainingTime <= 0)
        hangUp.value.isActive = false;
    }
  }, 1000);
});
onUnmounted(() => {
  if (timer)
    clearInterval(timer);
});

const extendHangUp = async () => {
  if (!tokenStore.selectedToken)
    return message.warning("请先选择Token");
  const tokenId = tokenStore.selectedToken.id;
  try {
    hangUp.value.isExtending = true;
    message.info("正在加钟...");

    // ✅ 使用 sendWithPromise 等待每次加钟完成
    for (let i = 0; i < 4; i++) {
      await tokenStore.sendGameMessage(tokenId, "system_mysharecallback", {
        isSkipShareCard: true,
        type: 2,
      }, { usePromise: true, timeout: 40000 });

      // 每次加钟后间隔1秒，避免200020错误
      if (i < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // ✅ 加钟完成后，等待服务器响应更新数据
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 刷新角色信息
    tokenStore.sendMessage(tokenId, "role_getroleinfo");

    // ✅ 再等待一下确保数据同步
    await new Promise((resolve) => setTimeout(resolve, 1000));

    message.success("加钟操作已完成，请查看挂机剩余时间");
    hangUp.value.isExtending = false;
  } catch (e) {
    message.error(`加钟操作失败: ${e?.message || "未知错误"}`);
    hangUp.value.isExtending = false;
  }
};

const claimHangUpReward = async () => {
  if (!tokenStore.selectedToken)
    return message.warning("请先选择Token");
  const tokenId = tokenStore.selectedToken.id;

  try {
    hangUp.value.isClaiming = true;

    if (hangUp.value.isActive) {
      // ✅ 挂机中，先检查是否满足领取条件（挂机时间 >= 6小时）
      const minClaimTime = 21600; // 6小时 = 21600秒
      const elapsedTime = hangUp.value.elapsedTime || 0;

      if (elapsedTime < minClaimTime) {
        // 不满足领取条件
        message.info(`挂机时间${formatTime(elapsedTime)}，未达到6小时，跳过领取`);
        hangUp.value.isClaiming = false;
        return;
      }
    }

    message.info("正在领取挂机奖励...");

    // 1. 初始化
    await tokenStore.sendGameMessage(tokenId, "system_mysharecallback", {}, { usePromise: true, timeout: 5000 });
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 2. 领取奖励
    await tokenStore.sendGameMessage(tokenId, "system_claimhangupreward", {}, { usePromise: true, timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 200));

    message.success("挂机奖励领取成功");

    // 3. 判断是否需要加钟
    // ✅ 关键修复：未挂机状态必须加钟，不检查hangUpTime上限
    if (!hangUp.value.isActive) {
      // 未挂机，必须加钟
      message.info("开始加钟...");
    } else {
      // 挂机中，基于剩余时间智能判断
      const remainingTime = hangUp.value.remainingTime || 0;
      const hangUpTime = hangUp.value.hangUpTime || 0;
      const maxHangUpTime = 36000; // 10小时

      // ✅ 基于剩余时间智能判断
      let needAddTime = false;
      if (!hangUp.value.isActive) {
        needAddTime = true; // 挂机已完成，必须加钟
      } else if (remainingTime < 7200) {
        needAddTime = true; // 剩余时间不足2小时，建议加钟
      } else if (hangUpTime < maxHangUpTime && remainingTime < 14400) {
        needAddTime = true; // 总挂机时间 < 10小时且剩余时间 < 4小时，可以加钟
      }

      if (!needAddTime) {
        message.info("挂机时间充足，无需加钟");
        hangUp.value.isClaiming = false;
        return;
      }

      message.info("开始加钟...");
    }

    // 加钟4次
    for (let i = 0; i < 4; i++) {
      await tokenStore.sendGameMessage(tokenId, "system_mysharecallback", {
        isSkipShareCard: true,
        type: 2,
      }, { usePromise: true, timeout: 40000 });

      // 每次加钟后间隔1秒，避免200020错误
      if (i < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    message.success("4次加钟全部完成");

    // ✅ 加钟完成后，等待服务器响应更新数据
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 刷新角色信息
    tokenStore.sendMessage(tokenId, "role_getroleinfo");

    // ✅ 再等待一下确保数据同步
    await new Promise((resolve) => setTimeout(resolve, 1000));

    hangUp.value.isClaiming = false;
  } catch (e) {
    message.error(`领取挂机奖励失败: ${e?.message || "未知错误"}`);
    hangUp.value.isClaiming = false;
  }
};
</script>

<style scoped lang="scss">
/* 按钮改用 Naive UI；time-display 样式由 MyCard 统一提供 */
</style>
