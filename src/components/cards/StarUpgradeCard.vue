<template>
  <MyCard class="star-upgrade" :status-class="{ active: state.isRunning }">
    <template #icon>
      <img alt="升星图标" src="/icons/ta.png">
    </template>
    <template #title>
      <h3>升星助手</h3>
      <p>升星、图鉴升星、领取奖励</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="settings">
        <div class="setting-item">
          <span class="label">延迟(ms)</span>
          <n-input-number
            size="small"
            v-model:value="delay"
            :min="0"
            :step="100"
          ></n-input-number>
        </div>
        <div class="setting-item">
          <span class="label">鱼灵目标星级</span>
          <n-select
            v-model:value="fishTargetStar"
            :options="fishStarOptions"
            size="small"
            style="width: 100px"
          />
        </div>
        <div class="status-row">
          <span>英雄数量：{{ heroIds.length }}</span>
          <span>鱼灵数量：{{ fishArtifactIds.length }}</span>
        </div>
      </div>
      <div class="progress-row">
        <n-progress type="line" :percentage="percent" :show-indicator="false"></n-progress>
        <span class="progress-text">{{ state.done }}/{{ state.total }} {{ percent }}%</span>
      </div>
    </template>
    <template #action>
      <div class="action-row">
        <a-button
          size="small"
          type="primary"
          :disabled="state.isRunning"
          @click="startHeroUpgrade"
        >
          升星
        </a-button>
        <a-button
          size="small"
          type="primary"
          :disabled="state.isRunning"
          @click="startBookUpgrade"
        >
          图鉴
        </a-button>
        <a-button
          size="small"
          type="primary"
          :disabled="state.isRunning"
          @click="startFishBookUpgrade"
        >
          鱼图鉴
        </a-button>
        <a-button
          size="small"
          type="primary"
          :disabled="state.isRunning"
          @click="startFishUpgrade"
        >
          鱼升星
        </a-button>
        <a-button
          size="small"
          type="primary"
          :disabled="state.isRunning"
          @click="startClaimRewards"
        >
          领奖
        </a-button>
        <a-button
          size="small"
          :disabled="!state.isRunning"
          @click="stopRunning"
        >
          停止
        </a-button>
      </div>
    </template>
  </MyCard>
  <n-modal
    content="将对预设英雄执行升星、图鉴升星并领取奖励。"
    negative-text="取消"
    positive-text="开始"
    preset="dialog"
    title="确认执行"
    v-model:show="state.showConfirm"
  ></n-modal>
</template>

<script setup>
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";
import { HERO_DICT, FishMap } from "@/utils/HeroList";

const tokenStore = useTokenStore();
const message = useMessage();

const delay = ref(300);
const fishTargetStar = ref(5);
const fishStarOptions = [
  { label: '1星', value: 1 },
  { label: '2星', value: 2 },
  { label: '3星', value: 3 },
  { label: '4星', value: 4 },
  { label: '5星', value: 5 },
];
const logs = ref([]);
const state = ref({
  isRunning: false,
  showConfirm: false,
  progressText: "待开始",
  stopRequested: false,
  total: 0,
  done: 0,
});

const heroIds = computed(() => Object.keys(HERO_DICT).map(Number));
const fishArtifactIds = computed(() => Object.keys(FishMap).map(Number));

const percent = computed(() =>
  state.value.total > 0
    ? Math.min(100, Math.round((state.value.done / state.value.total) * 100))
    : 0,
);

const addLog = (messageText, type = "info") => {
  logs.value.push({
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type,
    message: messageText,
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 启动仅英雄升星 */
const startHeroUpgrade = async () => {
  state.value.stopRequested = false;
  state.value.total = heroIds.value.length;
  state.value.done = 0;
  await runHeroUpgrade({ delay: delay.value });
};

/** 启动仅图鉴升星（英雄+鱼灵） */
const startBookUpgrade = async () => {
  state.value.stopRequested = false;
  state.value.total = heroIds.value.length + fishArtifactIds.value.length;
  state.value.done = 0;
  await runBookUpgrade({ delay: delay.value });
};

/** 启动仅鱼灵图鉴升星 */
const startFishBookUpgrade = async () => {
  state.value.stopRequested = false;
  state.value.total = fishArtifactIds.value.length;
  state.value.done = 0;
  await runFishBookUpgrade({ delay: delay.value });
};

/** 启动仅鱼灵升星 */
const startFishUpgrade = async () => {
  state.value.stopRequested = false;
  state.value.total = fishArtifactIds.value.length;
  state.value.done = 0;
  await runFishUpgrade({ delay: delay.value });
};

/** 启动仅领取奖励 */
const startClaimRewards = async () => {
  state.value.stopRequested = false;
  state.value.total = 10;
  state.value.done = 0;
  await runClaimRewards({ delay: delay.value });
};

const stopRunning = () => {
  state.value.stopRequested = true;
};

/**
 * 执行升星、图鉴升星与奖励领取的组合任务
 * @param {{ delay: number }} mod 延迟设置（毫秒）
 * @returns {Promise<void>}
 */
const executeUpgradeStarTask = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法执行");
    addLog("WebSocket连接缺失", "error");
    return;
  }

  try {
    state.value.isRunning = true;
    state.value.progressText = "开始升星";
    message.success("开始升星");
    addLog("升星任务启动", "success");

    await runHeroUpgrade(mod);

    state.value.progressText = "图鉴升星";
    message.success("英雄升星完成，开始图鉴升星");
    addLog("英雄升星全部完成", "success");

    await runBookUpgrade(mod);

    state.value.progressText = "领取奖励";
    message.success("图鉴升星完成，开始领取奖励");
    addLog("图鉴升星全部完成（含鱼灵）", "success");

    await runClaimRewards(mod);

    state.value.progressText = "完成";
    message.success("升星全部完成");
    addLog("升星任务全部完成", "success");
  } catch (error) {
    addLog(`升星任务执行出错: ${error.message}`, "error");
    message.error("升星任务执行出错");
  } finally {
    state.value.isRunning = false;
  }
};

/**
 * 仅执行英雄升星
 * @param {{ delay: number }} mod
 */
const runHeroUpgrade = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接");
    return;
  }
  try {
    state.value.isRunning = true;
    let heroSuccessCount = 0;
    let heroTotalStars = 0;

    // === 智能筛选：获取英雄星级和背包数据 ===
    let roleRes;
    try {
      roleRes = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 8000);
    } catch (e) {
      addLog("获取角色信息失败，回退到全量尝试", "warning");
    }

    const STAR_COST = [8,8,8,8,8,40,40,40,40,40,80,80,80,80,80,200,200,200,200,200,400,400,400,400,400,400,400,400,400,400];

    let eligibleHeroIds = heroIds.value;
    if (roleRes?.role?.heroes && roleRes?.role?.items) {
      const heroes = roleRes.role.heroes;
      const items = roleRes.role.items;

      eligibleHeroIds = [];
      for (const heroId of heroIds.value) {
        const heroData = heroes[heroId];
        if (!heroData) continue;
        const currentStar = Number(heroData.star || 0);
        if (currentStar >= 30) continue;
        const fragmentCost = STAR_COST[currentStar] || 999;
        const fragmentCount = Number(items[heroId]?.quantity || items[heroId]?.num || 0);
        if (fragmentCount < fragmentCost) continue;
        eligibleHeroIds.push(heroId);
      }
      addLog(`筛选结果: ${eligibleHeroIds.length}个可升星，${heroIds.value.length - eligibleHeroIds.length}个跳过`, "info");
      if (eligibleHeroIds.length === 0) {
        addLog("无满足条件的英雄可升星", "warning");
        message.info("无满足条件的英雄可升星");
        return;
      }
    }

    addLog(`开始英雄升星，共${eligibleHeroIds.length}个英雄`, "info");
    for (const heroId of eligibleHeroIds) {
      if (state.value.stopRequested)
        break;
      let heroStars = 0;
      // 最多尝试30次（游戏星级上限30星）
      for (let i = 1; i <= 30; i++) {
        if (state.value.stopRequested)
          break;
        try {
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_heroupgradestar",
            { heroId },
            8000,
          );
          // 检查响应码：与油猴脚本 res._code !== 0 判断一致
          if (res && res._code !== undefined && res._code !== 0) {
            break;
          }
          heroStars++;
          heroTotalStars++;
        } catch (err) {
          break;
        }
        await sleep(mod.delay);
      }
      if (heroStars > 0) {
        heroSuccessCount++;
        addLog(`英雄:${HERO_DICT[heroId]?.name || heroId} 升星成功 ×${heroStars}`, "success");
      }
      state.value.done++;
    }
    addLog(`英雄升星完成：${heroSuccessCount}个英雄升星，共${heroTotalStars}星`, "success");
    message.success(state.value.stopRequested ? "已停止" : "英雄升星完成");
  } finally {
    state.value.isRunning = false;
  }
};

/**
 * 仅执行图鉴升星
 * @param {{ delay: number }} mod
 */
const runBookUpgrade = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接");
    return;
  }
  try {
    state.value.isRunning = true;
    let heroSuccessCount = 0;
    let heroTotalStars = 0;
    let heroSkippedCount = 0;

    // === 英雄图鉴升星（双轮尝试）===
    // 核心：检查响应码 _code，与油猴脚本 res._code !== 0 判断一致
    addLog(`开始英雄图鉴升星，共${heroIds.value.length}个英雄`, "info");

    // 第一轮：尝试所有英雄
    const firstPassFailed = [];
    for (const heroId of heroIds.value) {
      if (state.value.stopRequested) break;
      let heroStars = 0;
      for (let i = 1; i <= 10; i++) {
        if (state.value.stopRequested) break;
        try {
          const res = await tokenStore.sendMessageWithPromise(
            tokenId, "book_upgrade", { heroId }, 8000,
          );
          // 检查响应码：与油猴脚本 res._code !== 0 判断一致
          if (res && res._code !== undefined && res._code !== 0) {
            break;
          }
          heroStars++;
          heroTotalStars++;
        } catch (err) {
          break;
        }
        await sleep(mod.delay);
      }
      if (heroStars > 0) {
        heroSuccessCount++;
        addLog(`英雄:${HERO_DICT[heroId]?.name || heroId} 图鉴升星成功 ×${heroStars}`, "success");
      } else {
        firstPassFailed.push(heroId);
      }
      state.value.done++;
    }

    // 第二轮：重试第一轮失败的英雄
    if (firstPassFailed.length > 0 && !state.value.stopRequested) {
      await sleep(1000);
      addLog(`第二轮重试 ${firstPassFailed.length} 个未成功英雄`, "info");
      let retrySuccessCount = 0;
      for (const heroId of firstPassFailed) {
        if (state.value.stopRequested) break;
        let heroStars = 0;
        for (let i = 1; i <= 10; i++) {
          if (state.value.stopRequested) break;
          try {
            const res = await tokenStore.sendMessageWithPromise(
              tokenId, "book_upgrade", { heroId }, 8000,
            );
            if (res && res._code !== undefined && res._code !== 0) {
              break;
            }
            heroStars++;
            heroTotalStars++;
          } catch (err) {
            break;
          }
          await sleep(mod.delay);
        }
        if (heroStars > 0) {
          retrySuccessCount++;
          heroSuccessCount++;
          addLog(`英雄:${HERO_DICT[heroId]?.name || heroId} 重试升星成功 ×${heroStars}`, "success");
        }
      }
      heroSkippedCount = firstPassFailed.length - retrySuccessCount;
    }

    addLog(`英雄图鉴升星完成：${heroSuccessCount}个英雄升星，共${heroTotalStars}星，${heroSkippedCount}个已满星跳过`, "success");

    // 鱼灵图鉴升星（最高5星）- 先查询当前星级，跳过已满星
    const maxFishStar = fishTargetStar.value;
    let fishSuccessCount = 0;
    let fishTotalStars = 0;
    let fishSkippedCount = 0;

    // 查询角色信息获取鱼灵当前星级
    let fishStarMap = {};
    try {
      const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 8000);
      const role = roleInfo?.role || roleInfo;
      const books = role?.artifactBooks || {};
      for (const [fishId, book] of Object.entries(books)) {
        fishStarMap[Number(fishId)] = book.claimedStar || 0;
      }
    } catch (e) {
      addLog("查询鱼灵星级数据失败，将尝试全部鱼灵", "error");
    }

    // 筛选需要升星的鱼灵：已满星跳过，未拥有和未满星都尝试
    const fishToUpgrade = fishArtifactIds.value.filter(id => {
      const currentStar = fishStarMap[id];
      if (currentStar !== undefined && currentStar >= maxFishStar) {
        fishSkippedCount++;
        return false; // 已满星，跳过
      }
      return true; // 未拥有或未满星，都尝试升星
    });

    addLog(`开始鱼灵图鉴升星：${fishToUpgrade.length}个需升星，${fishSkippedCount}个已满星跳过，目标${maxFishStar}星`, "info");
    for (const artifactId of fishToUpgrade) {
      if (state.value.stopRequested)
        break;
      const startStar = fishStarMap[artifactId] || 0;
      const isUnowned = fishStarMap[artifactId] === undefined;
      let fishStars = 0;
      for (let star = startStar + 1; star <= maxFishStar; star++) {
        if (state.value.stopRequested)
          break;
        try {
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "book_upgradeartifact",
            { artifactId },
            8000,
          );
          // 检查响应码：与油猴脚本 res._code !== 0 判断一致
          if (res && res._code !== undefined && res._code !== 0) {
            // 未拥有鱼灵第一次失败则跳过，已拥有则继续尝试
            if (isUnowned && star === 1) break;
            break;
          }
          fishStars++;
          fishTotalStars++;
        } catch (err) {
          // 未拥有鱼灵第一次失败则跳过，已拥有则继续尝试
          if (isUnowned && star === 1) break;
        }
        await sleep(mod.delay);
      }
      if (fishStars > 0) {
        fishSuccessCount++;
        addLog(`鱼灵:${FishMap[artifactId]?.name || artifactId} ${startStar}→${startStar + fishStars}星`, "success");
      }
      state.value.done++;
    }
    addLog(`鱼灵图鉴升星完成：${fishSuccessCount}个升星，共${fishTotalStars}星，${fishSkippedCount}个跳过`, "success");
    message.success(state.value.stopRequested ? "已停止" : "图鉴升星完成");
  } finally {
    state.value.isRunning = false;
  }
};

/**
 * 仅执行鱼灵图鉴升星
 * @param {{ delay: number }} mod
 */
const runFishBookUpgrade = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接");
    return;
  }
  try {
    state.value.isRunning = true;
    const maxFishStar = fishTargetStar.value;
    let fishSuccessCount = 0;
    let fishTotalStars = 0;
    let fishSkippedCount = 0;

    // 查询角色信息获取鱼灵当前星级
    let fishStarMap = {};
    try {
      const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 8000);
      const role = roleInfo?.role || roleInfo;
      const books = role?.artifactBooks || {};
      for (const [fishId, book] of Object.entries(books)) {
        fishStarMap[Number(fishId)] = book.claimedStar || 0;
      }
    } catch (e) {
      addLog("查询鱼灵星级数据失败，将尝试全部鱼灵", "error");
    }

    // 筛选需要升星的鱼灵：已满星跳过，未拥有和未满星都尝试
    const fishToUpgrade = fishArtifactIds.value.filter(id => {
      const currentStar = fishStarMap[id];
      if (currentStar !== undefined && currentStar >= maxFishStar) {
        fishSkippedCount++;
        return false;
      }
      return true;
    });

    addLog(`开始鱼灵图鉴升星：${fishToUpgrade.length}个需升星，${fishSkippedCount}个已满星跳过，目标${maxFishStar}星`, "info");
    for (const artifactId of fishToUpgrade) {
      if (state.value.stopRequested)
        break;
      const startStar = fishStarMap[artifactId] || 0;
      const isUnowned = fishStarMap[artifactId] === undefined;
      let fishStars = 0;
      for (let star = startStar + 1; star <= maxFishStar; star++) {
        if (state.value.stopRequested)
          break;
        try {
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "book_upgradeartifact",
            { artifactId },
            8000,
          );
          // 检查响应码：与油猴脚本 res._code !== 0 判断一致
          if (res && res._code !== undefined && res._code !== 0) {
            // 未拥有鱼灵第一次失败则跳过，已拥有则继续尝试
            if (isUnowned && star === 1) break;
            break;
          }
          fishStars++;
          fishTotalStars++;
        } catch (err) {
          // 未拥有鱼灵第一次失败则跳过，已拥有则继续尝试
          if (isUnowned && star === 1) break;
        }
        await sleep(mod.delay);
      }
      if (fishStars > 0) {
        fishSuccessCount++;
        addLog(`鱼灵:${FishMap[artifactId]?.name || artifactId} ${startStar}→${startStar + fishStars}星`, "success");
      }
      state.value.done++;
    }
    addLog(`鱼灵图鉴升星完成：${fishSuccessCount}个升星，共${fishTotalStars}星，${fishSkippedCount}个跳过`, "success");
    message.success(state.value.stopRequested ? "已停止" : "鱼灵图鉴升星完成");
  } finally {
    state.value.isRunning = false;
  }
};

/**
 * 仅执行鱼灵升星（artifact_upgradestar）
 * itemId 规则：parseInt(fishId + '' + star)，如 1201→12011、1601→16013
 * @param {{ delay: number }} mod
 */
const runFishUpgrade = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接");
    return;
  }
  try {
    state.value.isRunning = true;
    const maxFishStar = fishTargetStar.value;
    let fishSuccessCount = 0;

    addLog(`开始鱼灵升星：共${fishArtifactIds.value.length}个鱼灵，目标${maxFishStar}星`, "info");
    for (const fishId of fishArtifactIds.value) {
      if (state.value.stopRequested)
        break;
      let fishStars = 0;
      for (let star = 1; star <= maxFishStar; star++) {
        if (state.value.stopRequested)
          break;
        // itemId = fishId拼接star，如 1201 + '1' = 12011
        const itemId = parseInt(fishId + '' + star);
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "artifact_upgradestar",
            { heroId: -1, itemId },
            8000,
          );
          fishStars++;
        } catch (err) {
          // 第1星失败说明未拥有该鱼灵，跳过
          if (star === 1) break;
        }
        await sleep(mod.delay);
      }
      if (fishStars > 0) {
        fishSuccessCount++;
        addLog(`鱼灵:${FishMap[fishId]?.name || fishId} 升星成功 ×${fishStars}`, "success");
      }
      state.value.done++;
    }
    addLog(`鱼灵升星完成：${fishSuccessCount}个升星`, "success");
    message.success(state.value.stopRequested ? "已停止" : "鱼灵升星完成");
  } finally {
    state.value.isRunning = false;
  }
};

/**
 * 仅执行领取奖励
 * @param {{ delay: number }} mod
 */
const runClaimRewards = async (mod) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }
  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接");
    return;
  }
  try {
    state.value.isRunning = true;
    // 与油猴脚本领取图鉴奖励逻辑一致：最多10次，响应码检查
    for (let i = 1; i <= 10; i++) {
      if (state.value.stopRequested)
        break;
      try {
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "book_claimpointreward",
          {},
          8000,
        );
        // 检查响应码：与油猴脚本 res._code !== 0 判断一致
        if (res && res._code !== undefined && res._code !== 0) {
          break;
        }
        addLog(`领取图鉴奖励第${i}/10次`, "success");
        state.value.done++;
      } catch (err) {
        break;
      }
      await sleep(mod.delay);
    }
    message.success(state.value.stopRequested ? "已停止" : "领取奖励完成");
  } finally {
    state.value.isRunning = false;
  }
};

const formatTime = (ts) => new Date(ts).toLocaleTimeString("zh-CN");
</script>

<style scoped lang="scss">
.settings {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}
.setting-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.setting-item .n-input-number {
  width: 110px;
}
.status-row {
  display: flex;
  gap: var(--spacing-lg);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
.progress-row .n-progress {
  flex: 1;
}
.progress-text {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.log-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.log-item {
  display: flex;
  gap: 8px;
}
.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.log-item.success {
  color: var(--success-color);
}
.log-item.error {
  color: var(--error-color);
}
.time {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}
.msg {
  color: var(--text-secondary);
}
</style>
