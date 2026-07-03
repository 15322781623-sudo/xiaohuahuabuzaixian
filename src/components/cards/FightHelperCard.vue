<template>
  <MyCard class="bottle-helper" :status-class="{ active: state.isRunning }">
    <template #icon>
      <img alt="竞技场" src="/icons/1736425783912140.png">
    </template>
    <template #title>
      <h3>竞技场助手</h3>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="total-points">
        <span class="label">当前咸神门票数量：</span>
        <span class="value">{{ itemcount }}</span>
      </div>
      <div class="container">
        <div class="selects">
          <div class="select-item">
            <span class="select-label">战斗次数</span>
            <n-input-number
              v-model:value="number"
              :min="1"
              :max="10000"
              :step="1"
              :disabled="state.isRunning"
              size="small"
              style="width: 110px"
            ></n-input-number>
          </div>
          <div class="quick-btns">
            <button
              v-for="opt in numberOptions"
              :key="opt.value"
              class="quick-btn"
              :class="{ active: number === opt.value }"
              :disabled="state.isRunning"
              @click="number = opt.value"
            >{{ opt.label }}</button>
          </div>
          <div class="select-item">
            <span class="select-label">执行延迟(ms)</span>
            <n-input-number
              v-model:value="fightDelay"
              :min="100"
              :max="5000"
              :step="100"
              :disabled="state.isRunning"
              size="small"
              style="width: 110px"
            ></n-input-number>
          </div>
        </div>
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
    <template #action>
      <a-button
        block
        secondary
        size="small"
        type="primary"
        :disabled="state.isRunning"
        @click="handleFightHelper"
      >
        {{ state.isRunning ? "运行中" : "开始战斗" }}
      </a-button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, ref, nextTick } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { pickArenaTargetId } from "@/utils/batch/connectionManager.js";
import MyCard from "../Common/MyCard.vue";

const tokenStore = useTokenStore();
const message = useMessage();

const roleInfo = computed(() => tokenStore.gameData?.roleInfo || null);
const itemcount = computed(
  () => roleInfo.value?.role?.items?.[1007]?.quantity || 0,
);

const number = ref(3);
const numberOptions = [
  { label: "1", value: 1 },
  { label: "3", value: 3 },
  { label: "10", value: 10 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

// 执行延迟（毫秒），控制每步操作之间的间隔
const fightDelay = ref(200);

const state = ref({
  isRunning: false,
});

// 延迟等待辅助函数
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ====== 日志 ======
const fightLogs = ref([]);
const logListRef = ref(null);

const addLog = (msg, type = "info") => {
  fightLogs.value.push({
    time: new Date().toLocaleTimeString(),
    message: msg,
    type,
  });
  // 限制日志条数
  if (fightLogs.value.length > 50) {
    fightLogs.value = fightLogs.value.slice(-50);
  }
  // 滚动到底部
  nextTick(() => {
    if (logListRef.value) {
      logListRef.value.scrollTop = logListRef.value.scrollHeight;
    }
  });
};

const handleFightHelper = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查 WebSocket 连接状态
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    addLog(`WebSocket状态: ${wsStatus}，请先建立连接`, "error");
    return;
  }

  if (itemcount.value < number.value) {
    message.warning("咸神门票不足以完成该战斗次数");
    addLog(`门票不足: 当前${itemcount.value}张，需要${number.value}张`, "warning");
    return;
  }

  state.value.isRunning = true;
  fightLogs.value = []; // 清空旧日志
  addLog(`开始竞技场战斗 (${number.value}次)，当前门票: ${itemcount.value}张`);

  // 获取 battleVersion（战斗必需，否则服务器返回"版本过低"）
  if (!tokenStore.getBattleVersion()) {
    addLog("正在获取战斗版本(battleVersion)...");
    try {
      const levelResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startlevel",
        {},
        5000,
      );
      if (levelResult?.battleData?.version) {
        tokenStore.setBattleVersion(levelResult.battleData.version);
        addLog(`获取 battleVersion 成功: ${levelResult.battleData.version}`, "success");
      } else {
        addLog("fight_startlevel 未返回 battleVersion，战斗可能异常", "warning");
      }
    } catch (err) {
      addLog(`获取 battleVersion 失败: ${err.message}`, "error");
      message.warning(`获取战斗版本失败: ${err.message}，可能导致战斗异常`);
    }
    await delay(fightDelay.value);
  } else {
    addLog(`已有 battleVersion: ${tokenStore.getBattleVersion()}`);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < number.value; i++) {
    addLog(`--- 第${i + 1}/${number.value}次战斗 ---`);

    try {
      // 1. 开启竞技场
      addLog("正在开启竞技场...");
      await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, 5000);
      await delay(fightDelay.value);

      // 2. 获取目标
      addLog("正在获取竞技场目标...");
      const targets = await tokenStore.sendMessageWithPromise(
        tokenId,
        "arena_getareatarget",
        {},
        5000,
      );
      await delay(fightDelay.value);

      if (!targets) {
        addLog("获取竞技场目标失败: 返回数据为空", "error");
        failCount++;
        break;
      }

      // 3. 智能选择目标
      const role = tokenStore.gameData?.roleInfo?.role || {};
      const playerInfo = {
        rank: 0,
        power: role.power || role.fightPower || 0,
      };
      const targetResult = pickArenaTargetId(targets, playerInfo);

      if (!targetResult || !targetResult.targetId) {
        addLog("未找到可用的竞技场目标", "warning");
        failCount++;
        break;
      }

      const targetId = targetResult.targetId;
      const targetName = targetResult.targetName || "未知";
      const targetRank = targetResult.targetRank || "?";
      const targetPower = targetResult.targetPower || "?";
      addLog(`选择目标: ${targetName} (排名:${targetRank}, 战力:${targetPower})`);
      await delay(fightDelay.value);

      // 4. 执行战斗（battleVersion 由 tokenStore 自动注入）
      addLog(`正在战斗... (targetId: ${targetId})`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startareaarena",
        { targetId },
        10000,
      );
      successCount++;
      addLog(`第${i + 1}次战斗完成`, "success");

      // 5. 战斗间隔延迟
      if (i < number.value - 1) {
        addLog(`等待${fightDelay.value}ms...`);
        await delay(fightDelay.value);
      }
    } catch (e) {
      const errorMsg = e.message || "未知错误";
      if (errorMsg.includes("200020")) {
        addLog("竞技场状态异常(200020)，可能关卡未达标", "warning");
        failCount++;
        break;
      } else if (errorMsg.includes("400340")) {
        addLog(`服务器错误 400340: ${errorMsg}`, "warning");
        failCount++;
      } else {
        addLog(`竞技场对决失败: ${errorMsg}`, "error");
        failCount++;
      }
    }
  }

  // 刷新角色信息（更新门票数量）
  addLog("正在刷新角色信息...");
  try {
    await tokenStore.sendGetRoleInfo(tokenId);
    addLog(`角色信息已刷新，当前门票: ${itemcount.value}张`, "success");
  } catch (e) {
    addLog(`刷新角色信息失败: ${e.message}`, "warning");
  }

  addLog(`竞技场战斗完毕 (成功:${successCount} 失败:${failCount})`, successCount > 0 ? "success" : "error");
  message.success(`竞技场战斗完毕 (成功:${successCount} 失败:${failCount})`);
  state.value.isRunning = false;
};
</script>

<style scoped lang="scss">
.container {
  padding: 10px 0;
  display: flex;
  flex-direction: column;

  .selects {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .select-item {
    display: flex;
    align-items: center;
    gap: 6px;

    .select-label {
      font-size: var(--font-size-sm, 12px);
      color: var(--text-secondary, #888);
      white-space: nowrap;
    }
  }

  .quick-btns {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;

    .quick-btn {
      padding: 2px 8px;
      font-size: 11px;
      border: 1px solid var(--border-light, #e0e0e0);
      border-radius: 4px;
      background: var(--bg-primary, #fff);
      color: var(--text-secondary, #888);
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        border-color: var(--primary-color, #2080f0);
        color: var(--primary-color, #2080f0);
      }

      &.active {
        border-color: var(--primary-color, #2080f0);
        background: var(--primary-color, #2080f0);
        color: #fff;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .total-points {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 2px;
    background: var(--bg-tertiary);
    border-radius: var(--border-radius-medium);
    flex-wrap: wrap;

    .label {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .value {
      color: var(--text-primary);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
    }
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
</style>
