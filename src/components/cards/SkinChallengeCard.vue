<template>
  <MyCard class="skin-challenge" :status-class="statusClass">
    <template #icon>
      <img alt="换皮闯关" src="/icons/1733492491706152.png">
    </template>
    <template #title>
      <h3>换皮闯关</h3>
      <p>挑战关卡赢取奖励</p>
    </template>
    <template #badge>
      <span v-if="!actId && !isFighting" class="badge-closed">活动未开启</span>
      <span v-else-if="actId" class="badge-open">活动已开启</span>
      <span v-else>{{ isFighting ? "挑战中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="header-info">
        <span class="challenge-count">今日挑战 {{ dailyFightNum }}/10</span>
        <span v-if="isActivityValid" class="daily-target">{{ todayInfo }}</span>
        <span v-else class="daily-target">活动未开启</span>
      </div>

      <div v-if="!isActivityValid && actId" class="expired-mask">
        当前活动已结束
      </div>
      <div v-if="!actId && !isFighting" class="activity-closed-tip">
        <span class="closed-tip-icon">⚠️</span>
        <span class="closed-tip-text">换皮闯关活动未开启（activity_get 未返回 actEGameInfo）</span>
      </div>
      <div class="boss-grid" :class="{ disabled: !isActivityValid || !actId }">
        <div
          v-for="type in 6"
          :key="type"
          class="boss-card"
          :class="{
            active: isTowerOpen(type),
            cleared: isTowerCleared(type),
            locked: !isTowerOpen(type),
          }"
        >
          <div class="boss-title">BOSS {{ type }}</div>
          <div class="boss-level">第 {{ getTowerLevel(type) }} 层</div>

          <div class="boss-status">
            <span v-if="isTowerCleared(type)" class="status-text cleared">已通关</span>
            <span v-else-if="!isTowerOpen(type)" class="status-text locked">未开放</span>
            <span v-else class="status-text active">进行中</span>
          </div>

          <button
            class="challenge-btn"
            :disabled="!canChallenge(type) || isFighting"
            @click="challengeSingle(type)"
          >
            挑战
          </button>
        </div>
      </div>

      <div class="action-row">
        <button
          class="action-button secondary"
          :disabled="isFighting"
          @click="refreshInfo"
        >
          {{ isFighting ? "刷新中..." : "刷新进度" }}
        </button>
      </div>

      <!-- 操作日志区 -->
      <div class="log-area">
        <span class="log-title">操作日志</span>
        <div class="log-list" ref="logListRef">
          <div v-if="fightLogs.length === 0" class="log-empty">暂无操作日志</div>
          <div
            v-for="(log, idx) in fightLogs"
            :key="idx"
            class="log-item"
            :class="log.type"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-msg">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { useMessage } from "naive-ui";
import MyCard from "../Common/MyCard.vue";

const tokenStore = useTokenStore();
const message = useMessage();

const isFighting = ref(false);
const actId = ref(null);

// 活动有效期判断：基于 actId 的日期格式 YYMMDDX
const isActivityValid = computed(() => {
  if (!actId.value) return false;
  const idStr = String(actId.value);
  if (idStr.length < 6) return false;

  const year = `20${idStr.substring(0, 2)}`;
  const month = idStr.substring(2, 4);
  const day = idStr.substring(4, 6);

  const startDate = new Date(`${year}-${month}-${day}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  const now = new Date();
  return now >= startDate && now < endDate;
});

const levelRewardMap = ref({});
const dailyFightNum = ref(0);
const finishedCount = computed(() => Object.keys(levelRewardMap.value).length);

const statusClass = computed(() => {
  if (finishedCount.value >= 48) return "completed";
  return "active";
});

// ====== 今日开放 BOSS ======
const todayWeekDay = new Date().getDay();
const openTowerMap = {
  5: [1], // Friday
  6: [2], // Saturday
  0: [3], // Sunday
  1: [4], // Monday
  2: [5], // Tuesday
  3: [6], // Wednesday
  4: [1, 2, 3, 4, 5, 6], // Thursday (All open)
};

const todayOpenTowers = computed(() => {
  return openTowerMap[todayWeekDay] || [];
});

const todayInfo = computed(() => {
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dayName = weekDays[todayWeekDay];
  const towers = todayOpenTowers.value;
  if (towers.length === 6) return `${dayName} - 全部开放`;
  if (towers.length > 0) return `${dayName} - BOSS ${towers.join(",")}`;
  return `${dayName} - 无活动`;
});

const isTowerOpen = (type) => {
  return todayOpenTowers.value.includes(type);
};

const isTowerCleared = (type) => {
  const key1 = `${type}008`;
  const key2 = Number(key1);
  return !!(levelRewardMap.value[key1] || levelRewardMap.value[key2]);
};

const getTowerLevel = (type) => {
  for (let i = 8; i >= 1; i--) {
    const key1 = `${type}00${i}`;
    const key2 = Number(key1);
    if (levelRewardMap.value[key1] || levelRewardMap.value[key2]) {
      if (i === 8) return 8;
      return i + 1;
    }
  }
  return 1;
};

const canChallenge = (type) => {
  return isActivityValid.value && isTowerOpen(type) && !isTowerCleared(type);
};

// ====== 日志 ======
const fightLogs = ref([]);
const logListRef = ref(null);

const addLog = (msg, type = "info") => {
  fightLogs.value.push({
    time: new Date().toLocaleTimeString(),
    message: msg,
    type,
  });
  if (fightLogs.value.length > 60) {
    fightLogs.value = fightLogs.value.slice(-60);
  }
  nextTick(() => {
    if (logListRef.value) {
      logListRef.value.scrollTop = logListRef.value.scrollHeight;
    }
  });
};

// ====== 获取换皮闯关信息（参考 TokenCard 的 refreshTowerInfo）======
const getInfo = async () => {
  if (!tokenStore.selectedToken) return;
  const tokenId = tokenStore.selectedToken.id;
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") return;

  try {
    // 从 activity_get 动态获取换皮闯关活动ID
    // actEGameInfo.actId 为本周活动ID，减1即为 towers_getinfo 的 actId
    let derivedActId = null;
    try {
      const activityRes = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_get",
        {},
        5000,
      );
      const actEGameInfo = activityRes?.activity?.actEGameInfo || activityRes?.actEGameInfo;
      if (actEGameInfo?.actId) {
        derivedActId = Number(actEGameInfo.actId) - 1;
        console.log(`[换皮闯关] actEGameInfo.actId=${actEGameInfo.actId}, 推导 towers actId: ${derivedActId}`);
      }
    } catch (e) {
      console.warn("[换皮闯关] activity_get 失败:", e.message);
    }

    if (!derivedActId) {
      // actEGameInfo 不存在，活动未开启
      actId.value = null;
      levelRewardMap.value = {};
      dailyFightNum.value = 0;
      return;
    }

    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "towers_getinfo",
      { actId: derivedActId },
      5000,
    );

    if (res) {
      const data = res.actId ? res : (res.towerData && res.towerData.actId ? res.towerData : res);
      actId.value = data.actId;
      levelRewardMap.value = data.levelRewardMap || {};
      if (data.todayUseTickCnt !== undefined) {
        dailyFightNum.value = data.todayUseTickCnt;
      }
    }
  } catch (e) {
    const errorMsg = e.message || "";
    // 错误码7900021表示活动未开放或不存在
    if (errorMsg.includes("7900021")) {
      actId.value = null;
      levelRewardMap.value = {};
      dailyFightNum.value = 0;
    } else {
      console.error("[换皮闯关] 刷新信息失败:", e);
    }
  }
};

const refreshInfo = async () => {
  isFighting.value = true;
  await getInfo();
  if (actId.value) {
    message.success("进度已刷新");
    addLog(`进度已刷新，actId: ${actId.value}`);
  } else {
    message.warning("换皮闯关活动未开启");
    addLog("换皮闯关活动未开启", "warning");
  }
  isFighting.value = false;
};

// ====== 挑战换皮闯关 BOSS（参考 TokenCard 的 challengeTower）======
const challengeSingle = async (type) => {
  if (isFighting.value) return;

  // 检查 WebSocket 连接
  const tokenId = tokenStore.selectedToken.id;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    addLog(`WebSocket状态: ${wsStatus}，请先建立连接`, "error");
    return;
  }

  if (!actId.value) {
    message.warning("换皮闯关活动未开启或信息未刷新");
    addLog("actId 为空，请先刷新进度", "warning");
    return;
  }

  isFighting.value = true;
  addLog(`=== 开始挑战 BOSS ${type} ===`);
  addLog(`actId: ${actId.value}，当前层数: 第${getTowerLevel(type)}层`);

  try {
    let needStart = true;
    let loop = true;
    let failCount = 0;
    const currentActId = Number(actId.value);

    while (loop) {
      if (needStart) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "towers_start",
            { towerType: type, actId: currentActId },
            5000,
          );
          addLog(`towers_start BOSS ${type} 成功`);
        } catch (startErr) {
          const startErrorMsg = startErr.message || "";
          // 200330错误：已经开启过了，视为成功，继续战斗
          if (startErrorMsg.includes("200330")) {
            addLog(`BOSS ${type} 已开启过，继续战斗 (200330)`, "info");
          } else {
            addLog(`BOSS ${type} 开启失败: ${startErrorMsg.substring(0, 80)}`, "error");
            throw startErr;
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      const fightRes = await tokenStore.sendMessageWithPromise(
        tokenId,
        "towers_fight",
        { towerType: type, actId: currentActId },
        5000,
      );
      const battleData = fightRes?.battleData;
      const curHP = battleData?.result?.accept?.ext?.curHP;

      if (curHP === 0) {
        // 挑战成功
        needStart = false;
        failCount = 0;

        const currentLevel = getTowerLevel(type);
        addLog(`BOSS ${type} 第 ${currentLevel} 层挑战成功`, "success");

        // 刷新数据检查是否通关
        await getInfo();
        if (isTowerCleared(type)) {
          loop = false;
          addLog(`BOSS ${type} 已全部通关`, "success");
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        // 挑战失败
        const currentLevel = getTowerLevel(type);
        addLog(`BOSS ${type} 第 ${currentLevel} 层挑战失败 (curHP=${curHP})`, "warning");
        needStart = true;
        failCount++;

        if (failCount >= 3) {
          addLog(`BOSS ${type} 第 ${currentLevel} 层连续失败 3 次，停止挑战`, "error");
          loop = false;
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  } catch (e) {
    const errorMsg = e.message || "未知错误";
    addLog(`挑战 BOSS ${type} 出错: ${errorMsg}`, "error");
    message.error(`挑战出错: ${errorMsg}`);
  } finally {
    isFighting.value = false;
    await getInfo();
    addLog(`挑战结束，当前进度已刷新`);
  }
};

// ====== 监听 ======
watch(
  () => tokenStore.selectedToken,
  (newVal) => {
    if (newVal) {
      setTimeout(getInfo, 1000);
    }
  },
  { immediate: true },
);

watch(
  () => tokenStore.selectedToken ? tokenStore.getWebSocketStatus(tokenStore.selectedToken.id) : "disconnected",
  (status) => {
    if (status === "connected") {
      getInfo();
    }
  },
);
</script>

<style scoped lang="scss">
.badge-closed {
  background: #fee2e2;
  color: #991b1b;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.badge-open {
  background: #dcfce7;
  color: #166534;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.activity-closed-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 6px;
  font-size: 11px;
  color: #92400e;
  
  .closed-tip-icon {
    font-size: 12px;
  }
  
  .closed-tip-text {
    line-height: 1.4;
  }
}

.header-info {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.challenge-count {
  font-weight: bold;
  color: var(--primary-color);
}

.daily-target {
  color: var(--text-secondary);
}

.boss-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.boss-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid transparent;
  transition: all var(--transition-fast);

  &.active {
    background: var(--bg-primary, #fff);
    border-color: var(--primary-color);
    box-shadow: var(--shadow-sm);
  }

  &.cleared {
    background: rgba(34, 197, 94, 0.05);
    border-color: var(--success-color);
  }

  &.locked {
    opacity: 0.7;
    background: var(--bg-tertiary);
  }
}

.expired-mask {
  text-align: center;
  color: var(--error-color);
  font-weight: bold;
  padding: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--border-radius-medium);
  margin-bottom: var(--spacing-md);
}

.boss-grid.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.boss-title {
  font-weight: bold;
  color: var(--primary-color);
  font-size: var(--font-size-md);
  margin-bottom: 4px;
}

.boss-level {
  font-size: var(--font-size-lg);
  font-weight: bold;
  margin-bottom: 8px;
}

.boss-status {
  margin-bottom: 8px;
}

.status-text {
  font-size: var(--font-size-sm);
  font-weight: bold;

  &.cleared {
    color: var(--success-color);
  }

  &.locked {
    color: var(--text-tertiary);
  }

  &.active {
    color: var(--primary-color);
  }
}

.challenge-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 4px 12px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:disabled {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: var(--primary-color-hover);
  }
}

.action-row {
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
}

.action-button {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border: none;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  background: var(--bg-tertiary);
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-secondary);
  }
}

.log-area {
  margin-top: 8px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;

  .log-title {
    display: block;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: bold;
    color: var(--text-secondary, #888);
    background: var(--bg-tertiary, #f5f5f5);
    border-bottom: 1px solid var(--border-light, #e0e0e0);
  }

  .log-list {
    max-height: 180px;
    overflow-y: auto;
    padding: 4px 8px;
    font-size: 12px;
    line-height: 1.6;

    .log-empty {
      color: var(--text-tertiary, #aaa);
      text-align: center;
      padding: 8px;
    }

    .log-item {
      display: flex;
      gap: 6px;
      padding: 1px 0;

      .log-time {
        color: var(--text-tertiary, #aaa);
        flex-shrink: 0;
        font-family: monospace;
      }

      .log-msg {
        word-break: break-all;
      }

      &.success .log-msg {
        color: var(--success-color, #18a058);
      }

      &.error .log-msg {
        color: var(--error-color, #d03050);
      }

      &.warning .log-msg {
        color: var(--warning-color, #f0a020);
      }
    }
  }
}

@media (max-width: 640px) {
  .boss-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
