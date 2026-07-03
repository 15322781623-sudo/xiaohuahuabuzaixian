<template>
  <MyCard class="star-upgrade" :status-class="{ active: state.isRunning }">
    <template #icon>
      <img alt="升级图标" src="/icons/legionCup.png">
    </template>
    <template #title>
      <h3>武将升级</h3>
      <p>输入目标等级，自动升级加进阶</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <!-- 武将选择 -->
      <div class="settings">
        <span class="label">武将选择</span>
        <n-select
          v-model:value="HeroValue"
          :options="HeroOptions"
          :disabled="state.isRunning"
          @update:value="handleUpdateValue"
        ></n-select>
      </div>

      <!-- 武将信息 + 目标等级输入 -->
      <div v-if="HeroItem" class="hero-info-area">
        <div class="hero-item-row">
          <img :alt="HeroItem.name" :src="HeroItem.avatar" class="hero-avatar">
          <div class="hero-details">
            <div class="hero-name">{{ HeroItem.name }}</div>
            <div class="hero-stats">
              <span>当前等级: {{ HeroItem.level }}/6000</span>
              <span>进阶阶数: {{ HeroItem.order }}</span>
            </div>
          </div>
        </div>

        <!-- 目标等级 -->
        <div class="target-level-area">
          <div class="select-item">
            <span class="select-label">目标等级</span>
            <n-input-number
              v-model:value="targetLevel"
              :min="1"
              :max="6000"
              :step="100"
              :disabled="state.isRunning"
              size="small"
              style="width: 120px"
            ></n-input-number>
          </div>
          <div class="quick-btns">
            <button
              v-for="lv in quickLevels"
              :key="lv"
              class="quick-btn"
              :class="{ active: targetLevel === lv }"
              :disabled="state.isRunning || lv <= HeroItem.level"
              @click="targetLevel = lv"
            >{{ lv }}</button>
          </div>
        </div>
      </div>

      <!-- 突破等级表 -->
      <details class="breakthrough-table" v-if="HeroItem">
        <summary>突破等级表（点击展开）</summary>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>突破等级</th>
                <th>所需进阶石</th>
                <th>解锁技能</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in breakthroughTable"
                :key="row.level"
                :class="{
                  reached: HeroItem.level >= row.level,
                  next: getNextBreakthrough() === row.level,
                }"
              >
                <td>{{ row.level }}</td>
                <td>{{ row.stones.toLocaleString() }}</td>
                <td>{{ row.skill || '-' }}</td>
                <td>
                  <span v-if="HeroItem.level >= row.level" class="tag done">已突破</span>
                  <span v-else-if="getNextBreakthrough() === row.level" class="tag next">下一个</span>
                  <span v-else class="tag">未突破</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <!-- 操作日志区 -->
      <div class="log-area">
        <span class="log-title">操作日志</span>
        <div class="log-list" ref="logListRef">
          <div v-if="upgradeLogs.length === 0" class="log-empty">暂无操作日志</div>
          <div
            v-for="(log, idx) in upgradeLogs"
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
        size="small"
        type="primary"
        :disabled="state.isRunning || !HeroItem"
        @click="handleAutoUpgrade"
      >
        {{ state.isRunning ? "运行中..." : "自动升级到目标等级" }}
      </a-button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";
import { HERO_DICT } from "@/utils/HeroList";

const tokenStore = useTokenStore();
const message = useMessage();

// ====== 武将选择 ======
const HeroOptions = computed(() => [
  ...Object.values(tokenStore.gameData?.roleInfo?.role?.heroes || {}).map((item) => {
    return {
      label: `${HERO_DICT[item.heroId]?.name || item.heroId}(${item.level}/6000)`,
      value: item.heroId,
      disabled: item.level >= 6000,
    };
  }),
]);

const HeroValue = ref(null);
const HeroItem = ref(null);
const targetLevel = ref(100);

const handleUpdateValue = (value) => {
  const heroData = tokenStore.gameData?.roleInfo?.role?.heroes?.[value];
  if (!heroData) return;
  HeroItem.value = Object.assign({}, heroData, HERO_DICT[value] || {});
  // 默认目标等级设为下一个突破节点
  const next = getNextBreakthrough();
  if (next) targetLevel.value = next;
};

// 监听英雄数据变化
watch(
  () => tokenStore.gameData?.roleInfo?.role?.heroes,
  () => {
    if (HeroValue.value) {
      const heroData = tokenStore.gameData?.roleInfo?.role?.heroes?.[HeroValue.value];
      if (heroData) {
        HeroItem.value = Object.assign({}, heroData, HERO_DICT[HeroValue.value] || {});
      }
    }
  },
  { deep: true },
);

// ====== 突破等级表 ======
const breakthroughTable = [
  { level: 100, stones: 20, skill: "2技能", order: 1 },
  { level: 200, stones: 100, skill: null, order: 2 },
  { level: 300, stones: 200, skill: "3技能", order: 3 },
  { level: 500, stones: 400, skill: "4技能", order: 4 },
  { level: 700, stones: 800, skill: null, order: 5 },
  { level: 900, stones: 3000, skill: null, order: 6 },
  { level: 1100, stones: 5000, skill: null, order: 7 },
  { level: 1300, stones: 8000, skill: null, order: 8 },
  { level: 1500, stones: 15000, skill: null, order: 9 },
  { level: 1800, stones: 25000, skill: null, order: 10 },
  { level: 2100, stones: 35000, skill: null, order: 11 },
  { level: 2400, stones: 45000, skill: null, order: 12 },
  { level: 2800, stones: 60000, skill: null, order: 13 },
  { level: 3200, stones: 80000, skill: null, order: 14 },
  { level: 3600, stones: 100000, skill: null, order: 15 },
  { level: 4000, stones: 120000, skill: null, order: 16 },
  { level: 4500, stones: 140000, skill: null, order: 17 },
  { level: 5000, stones: 160000, skill: null, order: 18 },
  { level: 5500, stones: 180000, skill: null, order: 19 },
];

// 快捷等级按钮
const quickLevels = [100, 200, 300, 500, 700, 900, 1100, 1500, 2100, 3000, 6000];

// 获取下一个突破等级
const getNextBreakthrough = () => {
  if (!HeroItem.value) return null;
  const currentLevel = HeroItem.value.level;
  for (const row of breakthroughTable) {
    if (currentLevel < row.level) return row.level;
  }
  return null;
};

// 获取等级对应的order
const getOrder = (level) => {
  let order = 0;
  for (const row of breakthroughTable) {
    if (level >= row.level) {
      order = row.order;
    } else {
      break;
    }
  }
  return order;
};

// 获取当前等级的下一个突破节点
const getNextOrderLevel = (currentLevel) => {
  for (const row of breakthroughTable) {
    if (currentLevel < row.level) return row.level;
  }
  return null;
};

// ====== 日志 ======
const upgradeLogs = ref([]);
const logListRef = ref(null);

const addLog = (msg, type = "info") => {
  upgradeLogs.value.push({
    time: new Date().toLocaleTimeString(),
    message: msg,
    type,
  });
  if (upgradeLogs.value.length > 80) {
    upgradeLogs.value = upgradeLogs.value.slice(-80);
  }
  nextTick(() => {
    if (logListRef.value) {
      logListRef.value.scrollTop = logListRef.value.scrollHeight;
    }
  });
};

// ====== 状态 ======
const state = ref({ isRunning: false });

// 延迟辅助
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// 升级时可选择的最大步长（服务器限制，从大到小尝试）
const UPGRADE_OPTIONS = [50, 10, 5, 1];

// ====== 自动升级主逻辑 ======
const handleAutoUpgrade = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查 WebSocket 连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.warning("WebSocket未连接，请先建立连接");
    addLog(`WebSocket状态: ${wsStatus}，请先建立连接`, "error");
    return;
  }

  if (!HeroItem.value) {
    message.warning("请先选择武将");
    return;
  }

  const heroId = HeroValue.value;
  const heroName = HeroItem.value.name || `英雄${heroId}`;
  let currentLevel = HeroItem.value.level;
  const target = targetLevel.value;

  if (currentLevel >= target) {
    message.info(`${heroName} 当前等级 ${currentLevel} 已达到或超过目标 ${target}`);
    addLog(`${heroName} 当前等级 ${currentLevel}，已达到目标 ${target}`, "warning");
    return;
  }

  state.value.isRunning = true;
  upgradeLogs.value = [];
  addLog(`=== 开始自动升级 ${heroName} ===`);
  addLog(`当前等级: ${currentLevel}，目标等级: ${target}`);
  addLog(`当前进阶阶数: ${HeroItem.value.order}`);

  let successCount = 0;
  let advanceCount = 0;
  let failCount = 0;

  // 循环升级直到达到目标等级
  while (currentLevel < target) {
    // 找下一个突破节点
    const nextOrderLevel = getNextOrderLevel(currentLevel);
    // 如果下一个突破节点存在且在目标范围内，先升到突破节点再进阶
    const needBreakthrough = nextOrderLevel && nextOrderLevel <= target;

    if (needBreakthrough) {
      // 升级到突破节点
      const stepsToBreakthrough = nextOrderLevel - currentLevel;
      addLog(`升级到突破节点 ${nextOrderLevel} 级（需 ${stepsToBreakthrough} 级）`);

      while (currentLevel < nextOrderLevel) {
        const remaining = nextOrderLevel - currentLevel;
        // 选择最大的可行步长
        let upgradeNum = 1;
        for (const opt of UPGRADE_OPTIONS) {
          if (opt <= remaining) {
            upgradeNum = opt;
            break;
          }
        }

        try {
          addLog(`升级 +${upgradeNum} (${currentLevel} → ${currentLevel + upgradeNum})`);
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_heroupgradelevel",
            { heroId, upgradeNum },
            5000,
          );
          currentLevel += upgradeNum;
          successCount++;
          addLog(`升级成功，当前 ${currentLevel} 级`, "success");

          // 更新本地数据
          if (result?.role?.heroes?.[heroId]) {
            HeroItem.value = Object.assign(
              {},
              result.role.heroes[heroId],
              HERO_DICT[heroId] || {},
            );
          }
        } catch (err) {
          addLog(`升级失败: ${err.message}`, "error");
          failCount++;
          // 升级失败可能是资源不足，退出
          if (err.message?.includes("不足") || err.message?.includes("不够")) {
            addLog("资源不足，无法继续升级", "error");
            break;
          }
          // 其他错误尝试用更小步长
          if (upgradeNum > 1) {
            addLog(`尝试用更小步长重试...`, "warning");
            await delay(500);
            continue;
          }
          break;
        }
        await delay(300);
      }

      // 到达突破节点，执行进阶
      if (currentLevel >= nextOrderLevel) {
        const breakthroughRow = breakthroughTable.find(r => r.level === nextOrderLevel);
        addLog(`到达突破节点 ${nextOrderLevel} 级，执行进阶（消耗 ${breakthroughRow?.stones.toLocaleString() || '?'} 进阶石）`);

        try {
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_heroupgradeorder",
            { heroId },
            5000,
          );
          advanceCount++;
          addLog(`进阶成功！阶数: ${getOrder(currentLevel)}`, "success");

          // 更新本地数据
          if (result?.role?.heroes?.[heroId]) {
            HeroItem.value = Object.assign(
              {},
              result.role.heroes[heroId],
              HERO_DICT[heroId] || {},
            );
          }
        } catch (err) {
          addLog(`进阶失败: ${err.message}`, "error");
          failCount++;
          // 进阶失败无法继续，退出
          break;
        }
        await delay(300);
      }
    } else {
      // 没有突破节点在目标范围内，直接升级到目标
      const remaining = target - currentLevel;

      while (currentLevel < target) {
        const stepRemaining = target - currentLevel;
        let upgradeNum = 1;
        for (const opt of UPGRADE_OPTIONS) {
          if (opt <= stepRemaining) {
            upgradeNum = opt;
            break;
          }
        }

        try {
          addLog(`升级 +${upgradeNum} (${currentLevel} → ${currentLevel + upgradeNum})`);
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_heroupgradelevel",
            { heroId, upgradeNum },
            5000,
          );
          currentLevel += upgradeNum;
          successCount++;
          addLog(`升级成功，当前 ${currentLevel} 级`, "success");

          if (result?.role?.heroes?.[heroId]) {
            HeroItem.value = Object.assign(
              {},
              result.role.heroes[heroId],
              HERO_DICT[heroId] || {},
            );
          }
        } catch (err) {
          addLog(`升级失败: ${err.message}`, "error");
          failCount++;
          if (err.message?.includes("不足") || err.message?.includes("不够")) {
            addLog("资源不足，无法继续升级", "error");
          }
          break;
        }
        await delay(300);
      }
    }

    // 安全退出：如果升级失败已经 break 出内循环
    if (currentLevel >= target) break;
    // 检查是否因错误退出
    if (failCount > 0 && currentLevel < nextOrderLevel && nextOrderLevel <= target) {
      addLog("因错误中断升级流程", "error");
      break;
    }
  }

  // 刷新角色信息
  addLog("正在刷新角色信息...");
  try {
    await tokenStore.sendGetRoleInfo(tokenId);
    addLog(`角色信息已刷新，${heroName} 当前等级: ${HeroItem.value?.level || currentLevel}`, "success");
  } catch (e) {
    addLog(`刷新角色信息失败: ${e.message}`, "warning");
  }

  const summary = `升级完成: ${heroName} ${HeroItem.value?.level || currentLevel}级 (升级${successCount}次 进阶${advanceCount}次 失败${failCount}次)`;
  addLog(summary, successCount > 0 ? "success" : "error");
  message.success(summary);
  state.value.isRunning = false;
};
</script>

<style scoped lang="scss">
.settings {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);

  .label {
    flex-shrink: 0;
    font-size: var(--font-size-sm, 12px);
    color: var(--text-secondary, #888);
    white-space: nowrap;
  }
}

.hero-info-area {
  margin-bottom: 8px;
}

.hero-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .hero-avatar {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
  }

  .hero-details {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .hero-name {
      font-weight: bold;
      font-size: 14px;
    }

    .hero-stats {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
  }
}

.target-level-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;

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
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
}

.breakthrough-table {
  margin-bottom: 8px;

  summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary, #888);
    padding: 4px 0;
    user-select: none;
  }

  .table-scroll {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 4px;
    border: 1px solid var(--border-light, #e0e0e0);
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;

    th {
      position: sticky;
      top: 0;
      background: var(--bg-tertiary, #f5f5f5);
      padding: 4px 6px;
      text-align: center;
      border-bottom: 1px solid var(--border-light, #e0e0e0);
    }

    td {
      padding: 3px 6px;
      text-align: center;
      border-bottom: 1px solid var(--border-light, #f0f0f0);
    }

    tr.reached td {
      color: var(--success-color, #18a058);
    }

    tr.next td {
      background: rgba(32, 128, 240, 0.08);
      font-weight: bold;
    }

    .tag {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--bg-tertiary, #eee);

      &.done {
        color: var(--success-color, #18a058);
      }

      &.next {
        color: var(--primary-color, #2080f0);
        background: rgba(32, 128, 240, 0.1);
      }
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
