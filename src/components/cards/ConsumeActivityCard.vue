<template>
  <div class="status-card consume-activity-card">
    <!-- 顶栏 -->
    <div class="ca-header">
      <div class="ca-header-left">
        <span class="ca-icon">🎯</span>
        <span class="ca-title">消耗活动</span>
        <n-tag :type="runningTag.type" size="tiny" :bordered="false">{{ runningTag.text }}</n-tag>
        <n-select
          v-model:value="currentTokenId"
          :options="tokenOptions"
          filterable
          clearable
          size="tiny"
          style="width: 180px; margin-left: 6px"
          placeholder="🔍 搜索并切换账号..."
          @update:value="handleTokenSwitch"
        />
      </div>
      <div class="ca-header-right">
        <span class="ca-delay">
          延迟
          <n-input-number
            v-model:value="globalDelay"
            :min="50" :max="30000" :step="50"
            size="tiny"
            style="width: 70px"
            :show-button="false"
            :formatter="(v) => v >= 1000 ? (v / 1000) + 's' : v + 'ms'"
            :parser="(v) => { const n = parseFloat(v); return isNaN(n) ? 50 : (v.includes('s') && !v.includes('ms') ? n * 1000 : n); }"
          />
        </span>
        <n-button size="tiny" @click="refreshData" :loading="isRefreshing">刷新</n-button>
      </div>
    </div>

    <!-- 活动进度 -->
    <div class="ca-progress-grid">
      <div v-for="item in progressList" :key="item.id" class="ca-progress-cell">
        <div class="cell-top">
          <span class="cell-name">{{ item.name }}</span>
          <span class="cell-nums">
            <b :class="{ done: item.isCompleted }">{{ formatNum(item.current) }}</b>
            <span class="cell-sep">/</span>
            {{ formatNum(item.nextTarget) }}
          </span>
        </div>
        <n-progress
          type="line" :height="3" :percentage="calcPercentage(item)" :show-indicator="false"
          :color="item.isCompleted ? '#52c41a' : '#1890ff'" rail-color="rgba(0,0,0,0.05)"
        />
      </div>
    </div>
    <div v-if="!hasActivityData" class="ca-empty">暂无消耗活动数据</div>

    <!-- 主体双列：资源消耗 | 自动完成 -->
    <div class="ca-main">
      <!-- 左列：资源消耗 -->
      <div class="ca-main-left">
        <div class="ca-section-title">资源消耗</div>
        <div class="ca-table">
          <!-- 宝箱 -->
          <div class="ca-table-row">
            <span class="col-type">📦 宝箱</span>
            <div class="col-stock">
              <span v-for="(cnt, id) in resourceCounts.chests" :key="id" class="stock-item">
                {{ chestNames[id] }}<b>{{ formatNum(cnt) }}</b>
              </span>
            </div>
            <div class="col-ctrl">
              <n-select v-model:value="chestType" :options="chestTypeOptions" size="tiny" style="width: 80px" />
              <n-input-number v-model:value="chestQty" :min="10" :max="99999" :step="10" size="tiny" style="width: 65px" :show-button="false" />
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='chest'" @click="executeConsume('chest')">开箱</n-button>
            </div>
          </div>
          <!-- 钓鱼 -->
          <div class="ca-table-row">
            <span class="col-type">🎣 钓鱼</span>
            <div class="col-stock">
              <span v-for="(cnt, id) in resourceCounts.fishing" :key="id" class="stock-item">
                {{ fishingNames[id] }}<b>{{ formatNum(cnt) }}</b>
              </span>
            </div>
            <div class="col-ctrl">
              <n-select v-model:value="fishType" :options="fishTypeOptions" size="tiny" style="width: 80px" />
              <n-input-number v-model:value="fishQty" :min="10" :max="99999" :step="10" size="tiny" style="width: 65px" :show-button="false" />
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='fishing'" @click="executeConsume('fishing')">钓鱼</n-button>
            </div>
          </div>
          <!-- 招募 -->
          <div class="ca-table-row">
            <span class="col-type">📜 招募</span>
            <div class="col-stock">
              <span class="stock-item">招募令<b>{{ formatNum(resourceCounts.recruit[1001]) }}</b></span>
            </div>
            <div class="col-ctrl">
              <n-input-number v-model:value="recruitQty" :min="10" :max="99999" :step="10" size="tiny" style="width: 65px" :show-button="false" />
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='recruit'" @click="executeConsume('recruit')">招募</n-button>
              <n-button size="tiny" quaternary type="warning" :disabled="isRunning||autoRunning" @click="executeAutoRecruit">自动</n-button>
            </div>
          </div>
          <!-- 火把 -->
          <div class="ca-table-row">
            <span class="col-type">🔥 火把</span>
            <div class="col-stock">
              <span v-for="(cnt, id) in resourceCounts.torch" :key="id" class="stock-item">
                {{ torchNames[id] }}<b>{{ formatNum(cnt) }}</b>
              </span>
            </div>
            <div class="col-ctrl">
              <n-select v-model:value="torchType" :options="torchTypeOptions" size="tiny" style="width: 80px" />
              <n-input-number v-model:value="torchQty" :min="10" :max="99999" :step="10" size="tiny" style="width: 65px" :show-button="false" />
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='torch'" @click="executeConsume('torch')">消耗</n-button>
            </div>
          </div>
          <!-- 金砖 -->
          <div class="ca-table-row">
            <span class="col-type">💎 金砖</span>
            <div class="col-stock">
              <span class="stock-item">金砖<b>{{ formatNum(goldBrickCount) }}</b></span>
              <span v-if="goldTierTarget > 0" class="stock-item" style="color: #1890ff;">差<b>{{ formatNum(goldTierGap) }}</b></span>
            </div>
            <div class="col-ctrl">
              <n-select v-model:value="goldTierTarget" :options="[{label:'选择档位',value:0}, ...goldTierOptions]" size="tiny" style="width: 130px" />
              <n-input-number v-model:value="goldBuyQty" :min="1" :max="99999" :step="1" size="tiny" style="width: 55px" :show-button="false" />
              <span class="gold-cost" :class="{ 'over-budget': goldBuyCost > goldBrickCount }">
                {{ formatNum(goldBuyCost) }}💎
              </span>
              <n-button size="tiny" type="primary" :disabled="isRunning || goldBuyQty <= 0" :loading="runningType==='goldBuyRod'" @click="executeGoldBuy('store_rod')">鱼竿</n-button>
            </div>
          </div>
          <!-- 黄金大枣 -->
          <div class="ca-table-row">
            <span class="col-type">🟡 黄金大枣</span>
            <div class="col-stock">
              <span class="stock-item">大枣<b>{{ formatNum(resourceCounts.consumeItems?.[5280] || 0) }}</b></span>
            </div>
            <div class="col-ctrl">
            </div>
          </div>
          <!-- 使用消耗道具 -->
          <div class="ca-table-row">
            <span class="col-type">🎁 消耗道具</span>
            <div class="col-stock">
              <span class="stock-item">道具<b>{{ formatNum(resourceCounts.consumeItems?.[5279] || 0) }}</b></span>
            </div>
            <div class="col-ctrl">
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='useActivityItem'" @click="executeUseActivityItem">使用</n-button>
            </div>
          </div>
          <!-- 领取消耗奖励 -->
          <div class="ca-table-row">
            <span class="col-type">🏅 领取奖励</span>
            <div class="col-stock">
            </div>
            <div class="col-ctrl">
              <n-button size="tiny" type="success" :disabled="isRunning" :loading="runningType==='claimFreeItem'" @click="executeClaimFreeItem">免费道具</n-button>
              <n-button size="tiny" type="warning" :disabled="isRunning" :loading="runningType==='claimTaskRewards'" @click="executeClaimTaskRewards">档位奖励</n-button>
            </div>
          </div>
          <!-- 挥鼓助威 -->
          <div class="ca-table-row">
            <span class="col-type">🥁 挥鼓助威</span>
            <div class="col-stock">
              <span class="stock-item">道具<b>{{ formatNum(resourceCounts.consumeItems?.[5278] || 0) }}</b></span>
              <n-input-number v-model:value="cheerQty" :min="0" :max="99999" :step="100" size="tiny" style="width: 65px" :show-button="false" placeholder="0=全部" />
            </div>
            <div class="col-ctrl">
              <n-button size="tiny" type="primary" :disabled="isRunning" :loading="runningType==='autumnUseItem'" @click="executeAutumnUseItem">助威</n-button>
            </div>
          </div>
          <!-- 兑换购买 -->
          <div class="ca-table-row">
            <span class="col-type">🏪 兑换商店</span>
            <div class="col-stock">
            </div>
            <div class="col-ctrl">
              <n-button size="tiny" type="info" :disabled="isRunning" :loading="runningType==='activityExchange'" @click="showExchangeModal = true">兑换购买</n-button>
            </div>
          </div>
        </div>
        <!-- 宝箱积分（紧凑内嵌） -->
        <div v-if="chestPointData" class="ca-points-inline">
          <span class="pts-label">宝箱积分</span>
          <span v-for="mode in pointModes" :key="mode.key" class="pts-chip">
            {{ mode.label }} <b>{{ formatNum(mode.data.finalPoints) }}</b>分
          </span>
          <span class="pts-next" v-if="chestPointData.nextReward.remaining > 0">
            {{ chestPointData.nextReward.label }} {{ chestPointData.nextReward.progress }}/{{ chestPointData.nextReward.value }}
          </span>
        </div>
      </div>

      <!-- 右列：扫描+自动完成 -->
      <div class="ca-main-right">
        <!-- 达标扫描（紧凑） -->
        <div class="ca-scan-compact">
          <div class="ca-scan-head">
            <span class="ca-section-title" style="margin-bottom:0">达标扫描</span>
            <n-button size="tiny" type="primary" @click="scanQualifiedMembers" :loading="isScanning" :disabled="isRunning || autoRunning">
              {{ isScanning ? '...' : '🔍 扫描' }}
            </n-button>
            <n-tag v-if="scanResults.length > 0" :type="scanQualifiedIds.length > 0 ? 'success' : 'default'" size="tiny" :bordered="false">
              {{ scanQualifiedIds.length }}/{{ scanResults.length }}
            </n-tag>
            <n-button size="tiny" type="info" @click="showMemberProgressModal = true" :loading="isQueryingMembers">
              📊 成员进度
            </n-button>
          </div>
          <!-- 达标条件输入 -->
          <div class="ca-scan-targets">
            <span class="target-item">📜<n-input-number v-model:value="scanTargets.recruit" :min="0" :max="99999" :step="100" size="tiny" style="width:72px" :show-button="false" /></span>
            <span class="target-item">📦<n-input-number v-model:value="scanTargets.chestPts" :min="0" :max="999999" :step="1000" size="tiny" style="width:80px" :show-button="false" /></span>
            <span class="target-item">🎣<n-input-number v-model:value="scanTargets.fish" :min="0" :max="9999" :step="50" size="tiny" style="width:68px" :show-button="false" /></span>
          </div>
          <div v-if="qualifiedResults.length > 0" class="ca-scan-list">
            <div v-for="r in qualifiedResults" :key="r.id" class="scan-chip ok">
              <span class="scan-chip-name">{{ r.name }}</span>
            </div>
          </div>
          <div v-else-if="scanResults.length > 0" class="ca-empty-sm">暂无达标成员</div>
        </div>

        <!-- 自动完成 -->
        <div class="ca-auto-compact">
          <div class="ca-section-title">
            自动完成
            <n-tag v-if="autoRunning" :type="autoPaused ? 'warning' : 'success'" size="tiny" :bordered="false">
              {{ autoPaused ? '已暂停' : '运行中' }}
            </n-tag>
            <span style="margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:normal;color:#888">
              🎁 使用道具 <n-switch v-model:value="autoUseActivityItem" size="small" />
            </span>
          </div>
          <!-- 多选成员 -->
          <div class="ca-member-bar">
            <n-button size="small" quaternary @click="toggleAllTokens">{{ isAllSelected ? '取消全选' : '全选' }}</n-button>
            <span class="member-count">{{ selectedTokenIds.length }}/{{ displayTokens.length }}</span>
            <span v-if="scanQualifiedIds.length > 0" class="member-excluded">-{{ scanQualifiedIds.length }}达标</span>
            <n-input
              v-model:value="memberSearch"
              size="small"
              placeholder="搜索成员..."
              clearable
              style="width: 130px; margin-left: auto"
            />
          </div>
          <div class="ca-member-list" v-if="filteredDisplayTokens.length > 0">
            <label v-for="t in filteredDisplayTokens" :key="t.id" class="member-chip" :class="{ active: selectedTokenIds.includes(t.id) }">
              <input type="checkbox" :value="t.id" v-model="selectedTokenIds" />
              <span class="chip-name">{{ t.name || t.server }}</span>
            </label>
          </div>
          <div v-else-if="memberSearch && displayTokens.length > 0" class="ca-empty-sm">无匹配成员</div>
          <div v-if="autoRunning" class="ca-auto-step">{{ autoStep }}</div>
          <div v-if="!autoRunning && autoPlan?.details?.length" class="ca-auto-plan">
            <div v-for="(d, i) in autoPlan.details" :key="i" class="plan-line">{{ d }}</div>
          </div>
          <div class="ca-auto-row">
            <span class="fish-target-label">🎣</span>
            <n-select v-model:value="fishTargetType" :options="fishTargetTypeOptions" size="tiny" style="width: 78px" />
            <n-input-number
              v-model:value="fishTarget"
              :min="0" :max="1750" :step="50"
              size="tiny"
              style="width: 75px"
              :show-button="false"
            />
            <span v-if="fishCurrent > 0" class="fish-current">{{ fishCurrent }}</span>
            <span class="fish-target-label">💎</span>
            <n-select v-model:value="autoGoldTierTarget" :options="[{label:'选择档位',value:0}, ...goldTierOptions]" size="tiny" style="width: 130px" />
            <span v-if="autoGoldTierTarget > 0 && goldBrickCurrent > 0" class="fish-current" style="color: #1890ff;">{{ formatNum(goldBrickCurrent) }}</span>
            <template v-if="!autoRunning">
              <n-button size="tiny" type="primary" @click="executeAutoComplete">🚀 一键完成</n-button>
            </template>
            <template v-else>
              <n-button size="tiny" :type="autoPaused ? 'primary' : 'warning'" @click="togglePause">
                {{ autoPaused ? '▶' : '⏸' }}
              </n-button>
              <n-button size="tiny" type="error" @click="stopAuto">⏹</n-button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 执行日志 -->
    <div class="ca-section ca-section-log">
      <div class="ca-section-title">执行日志</div>
      <div class="ca-log" ref="logAreaRef" @scroll="onLogScroll">
        <div v-if="logs.length === 0" class="ca-empty-sm">暂无日志</div>
        <div v-for="(log, i) in logs" :key="i" class="ca-log-line" :class="log.type">
          <span class="log-t">{{ log.time?.slice(11, 19) }}</span>
          <span class="log-m">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 兑换商店多选弹窗 -->
    <n-modal v-model:show="showExchangeModal" preset="card" title="消耗活动兑换商店" style="width: 90%; max-width: 500px">
      <div style="margin-bottom: 12px; font-size: 13px; color: #666;">
        选择要购买的商品，购买后自动领取里程碑进度奖励：
      </div>
      <n-grid :cols="2" :x-gap="8" :y-gap="6">
        <n-grid-item v-for="item in exchangeGoodsList" :key="item.suffix">
          <div style="display: flex; align-items: center; gap: 6px;">
            <n-checkbox v-model:checked="item.checked" size="small">
              <span style="font-size: 12px;">{{ item.name }}</span>
            </n-checkbox>
            <n-input-number
              v-if="item.maxCount > 1"
              v-model:value="item.quantity"
              :min="1" :max="item.maxCount"
              :disabled="!item.checked"
              size="tiny"
              style="width: 65px"
            />
            <n-tag v-else size="tiny" type="info" :bordered="false" style="font-size: 10px;">x1</n-tag>
          </div>
        </n-grid-item>
      </n-grid>
      <div style="margin-top: 10px; font-size: 11px; color: #999;">
        已选 {{ exchangeGoodsList.filter(i => i.checked).length }} 个商品
      </div>
      <div style="margin-top: 14px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
        <n-button size="small" @click="showExchangeModal = false">取消</n-button>
        <n-button size="small" type="primary" :disabled="isRunning || exchangeGoodsList.filter(i => i.checked).length === 0" @click="executeActivityExchange">开始购买</n-button>
      </div>
    </n-modal>

    <!-- 成员进度弹窗 -->
    <n-modal
      v-model:show="showMemberProgressModal"
      preset="card"
      title="成员消耗活动进度"
      style="width: 95%; max-width: 1100px"
      :segmented="{ content: true }"
    >
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <n-button size="small" type="primary" :loading="isQueryingMembers" @click="queryAllMembersProgress">
          {{ isQueryingMembers ? `查询中 ${queryProgress.current}/${queryProgress.total}` : '🔍 刷新查询' }}
        </n-button>
        <span v-if="memberProgressList.length > 0" style="font-size:12px;color:#888">共 {{ filteredMemberProgressList.length }} 个成员</span>
        <n-input v-model:value="memberFilterKeyword" size="small" placeholder="搜索成员..." clearable style="width:160px;margin-left:auto" />
      </div>
      <div v-if="memberProgressList.length === 0 && !isQueryingMembers" style="text-align:center;padding:24px;color:#999;font-size:13px">
        点击上方「刷新查询」获取所有成员消耗活动进度
      </div>
      <n-data-table
        v-else
        :columns="memberProgressColumns"
        :data="filteredMemberProgressList"
        :bordered="true"
        :single-line="false"
        size="small"
        :max-height="480"
        :scroll-x="900"
      />
    </n-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick, h } from 'vue';
import { useMessage } from 'naive-ui';
import { useTokenStore } from '@/stores/tokenStore';
import { gameTokens } from '@/stores/tokenStore';
import ConsumeActivityManager from '@/utils/consumeActivityManager';

const props = defineProps({
  activeSection: { type: String, default: '' },
});

const tokenStore = useTokenStore();
const message = useMessage();

// 初始化管理器
const manager = new ConsumeActivityManager();
const userId = 'default';

// 状态
const isRunning = ref(false);
const runningType = ref(null);
const isRefreshing = ref(false);
const globalDelay = ref(manager.config.globalDelay);
const logs = ref([]);

// ====== 账号切换 ======
const currentTokenId = computed({
  get: () => tokenStore.selectedTokenId || null,
  set: () => {} // 由 handleTokenSwitch 处理
});
const tokenOptions = computed(() => {
  return (gameTokens.value || []).map((t) => ({
    label: t.name || t.server || t.id.slice(0, 8),
    value: t.id,
  }));
});
const handleTokenSwitch = (tokenId) => {
  if (!tokenId || tokenId === tokenStore.selectedTokenId) return;
  tokenStore.selectToken(tokenId);
};

// ====== localStorage 持久化 ======
const LS_SCAN_KEY = 'consume_scan_results';
const LS_SELECT_KEY = 'consume_selected_token_ids';       // 旧版（全局）
const LS_SELECT_MAP_KEY = 'consume_selected_token_map';   // 新版（按账号）
const loadLS = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const saveLS = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// 多选成员 —— 按当前账号分别存储
const selectMap = ref(loadLS(LS_SELECT_MAP_KEY, {}));  // { [accountId]: [selectedIds] }
// 迁移旧版全局数据（一次性）
if (Object.keys(selectMap.value).length === 0) {
  const legacy = loadLS(LS_SELECT_KEY, []);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const curId = tokenStore.selectedTokenId || '';
    if (curId) selectMap.value[curId] = legacy;
    saveLS(LS_SELECT_MAP_KEY, selectMap.value);
  }
  try { localStorage.removeItem(LS_SELECT_KEY); } catch {}
}
const currentAccountId = computed(() => tokenStore.selectedTokenId || '');
const selectedTokenIds = computed({
  get: () => selectMap.value[currentAccountId.value] || [],
  set: (ids) => {
    selectMap.value[currentAccountId.value] = ids;
    saveLS(LS_SELECT_MAP_KEY, selectMap.value);
  }
});
// 切换账号时自动同步成员勾选（selectMap 是响应式的，computed 会自动更新）
const allTokens = computed(() => gameTokens.value || []);
// 成员搜索关键词
const memberSearch = ref('');
// 排除达标成员后的可选列表
const displayTokens = computed(() => allTokens.value.filter(t => !scanQualifiedIds.value.includes(t.id)));
// 搜索过滤后的成员列表
const filteredDisplayTokens = computed(() => {
  const kw = memberSearch.value.trim().toLowerCase();
  if (!kw) return displayTokens.value;
  return displayTokens.value.filter(t => {
    const name = (t.name || t.server || t.id).toLowerCase();
    return name.includes(kw);
  });
});
const isAllSelected = computed(() => displayTokens.value.length > 0 && selectedTokenIds.value.length === displayTokens.value.length);
const toggleAllTokens = () => {
  if (isAllSelected.value) {
    selectedTokenIds.value = [];
  } else {
    selectedTokenIds.value = displayTokens.value.map(t => t.id);
  }
};
// 初始化默认选中当前选中的Token（仅当该账号无保存数据时）
watch(() => tokenStore.selectedToken, (t) => {
  if (t && (!selectMap.value[t.id] || selectMap.value[t.id].length === 0)) {
    selectMap.value[t.id] = [t.id];
    saveLS(LS_SELECT_MAP_KEY, selectMap.value);
  }
}, { immediate: true });

// 消耗类型选择
const chestType = ref(2001);
const chestQty = ref(100);
const fishType = ref(1);
const fishQty = ref(100);
const fishTarget = ref(1250); // 钓鱼目标消耗值
const fishTargetType = ref(2); // 钓鱼目标类型：1=普通鱼竿，2=黄金鱼竿（默认黄金）
const fishTargetTypeOptions = [
  { label: '普通鱼竿', value: 1 },
  { label: '黄金鱼竿', value: 2 },
];
const recruitQty = ref(100);
const torchType = ref(1008);
const torchQty = ref(100);
const cheerQty = ref(0); // 挥鼓助威数量，0=全部使用

// 金砖购买
const goldBuyQty = ref(1); // 购买次数
// 商品单价（金砖）
const GOLD_PRICE = { store_rod: 600 };
// 金砖档位目标（taskId=5）
const GOLD_TIERS = [10000, 20000, 30000, 40000, 50000, 70000, 90000, 110000, 130000, 150000, 180000, 210000, 240000, 270000, 300000, 340000, 380000, 420000, 460000, 500000];
const goldTierOptions = GOLD_TIERS.map((v, i) => ({ label: `档${i + 1} (${v >= 10000 ? (Math.floor(v / 1000) / 10).toFixed(1) + '万' : v})`, value: v }));
const goldTierTarget = ref(0); // 0=未选择档位（金砖行鱼竿按钮用）
const autoGoldTierTarget = ref(0); // 自动完成专用金砖档位
const autoUseActivityItem = ref(loadLS('consume_auto_use_activity_item', true)); // 一键完成是否使用消耗道具
watch(autoUseActivityItem, (v) => saveLS('consume_auto_use_activity_item', v));
// goldBrickCurrent / goldTierGap / calcGoldBuyQty 已移至 progressList、resourceCounts 声明之后
// 当前选中商品的预估总金砖消耗
const goldBuyCost = computed(() => {
  return goldBuyQty.value * (GOLD_PRICE.store_rod || 600);
});

// 金砖数量（从身份牌角色信息读取 roleInfo.role.diamond）
const goldBrickCount = computed(() => {
  const role = tokenStore.gameData?.roleInfo?.role;
  return Number(role?.diamond) || 0;
});

// 日志区域引用
const logAreaRef = ref(null);

// 名称映射
const chestNames = { 2001: '木质', 2002: '青铜', 2003: '黄金', 2004: '铂金', 2005: '钻石' };
const fishingNames = { 1011: '普通鱼竿', 1012: '黄金鱼竿' };
const torchNames = { 1008: '普通火把', 1009: '青铜火把', 1010: '咸神火把' };

// 选项
const chestTypeOptions = [
  { label: '木质宝箱', value: 2001 },
  { label: '青铜宝箱', value: 2002 },
  { label: '黄金宝箱', value: 2003 },
  { label: '铂金宝箱', value: 2004 },
];
const fishTypeOptions = [
  { label: '普通鱼竿', value: 1 },
  { label: '黄金鱼竿', value: 2 },
];
const torchTypeOptions = [
  { label: '普通火把', value: 1008 },
  { label: '青铜火把', value: 1009 },
  { label: '咸神火把', value: 1010 },
];
const qtyOptions = [
  { label: '10', value: 10 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1000', value: 1000 },
  { label: '5000', value: 5000 },
];
const recruitQtyOptions = [
  { label: '10', value: 10 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '200', value: 200 },
  { label: '400', value: 400 },
];

// ====== 自动完成 ======
const autoRunning = ref(false);
const autoPaused = ref(false);
const autoStopped = ref(false);
const autoStep = ref('');
const autoPlanDetails = ref([]);

// 运行状态标签
const runningTag = computed(() => {
  if (autoRunning.value) return autoPaused.value
    ? { type: 'warning', text: '已暂停' }
    : { type: 'success', text: '自动中' };
  if (isRunning.value) return { type: 'success', text: '执行中' };
  return { type: 'default', text: '空闲' };
});

// 宝箱优先级（高分优先）
const chestPriority = [
  { id: 2004, points: 50, name: '铂金宝箱' },
  { id: 2003, points: 20, name: '黄金宝箱' },
  { id: 2002, points: 10, name: '青铜宝箱' },
  { id: 2001, points: 1, name: '木质宝箱' },
];

// 获取任务最大目标值
const getMaxTarget = (taskId) => {
  const configs = manager.missionTypes[taskId];
  if (!configs || configs.length === 0) return 0;
  return configs[configs.length - 1].num;
};

// 自动执行计划
const autoPlan = computed(() => {
  if (!hasActivityData.value) return null;
  const plan = [];
  const details = [];
  const rc = resourceCounts.value;

  // 招募 (taskId=1) - 使用最大目标（招募令必须10的倍数）
  const recruitProgress = progressList.value.find(p => p.id === 1);
  if (recruitProgress && !recruitProgress.isCompleted) {
    const maxTarget = getMaxTarget(1);
    const gap = maxTarget - recruitProgress.current;
    const recruitGap = Math.ceil(gap / 10) * 10; // 向上取整到10的倍数，确保达标
    const available = rc.recruit[1001] || 0;
    const recruitAvail = Math.floor(available / 10) * 10;
    const useCount = Math.min(recruitGap, recruitAvail);
    if (useCount > 0) {
      plan.push({ type: 'recruit', qty: useCount, gap, available });
      details.push(`招募: 距满级差 ${gap}（取整${recruitGap}），可用 ${available}，执行 ${useCount}`);
    } else {
      details.push(`招募: 距满级差 ${gap}，可用 ${available}，资源不足`);
    }
  }

  // 宝箱 (taskId=2) - 使用最大目标积分
  const chestProgress = progressList.value.find(p => p.id === 2);
  if (chestProgress && !chestProgress.isCompleted) {
    const maxTarget = getMaxTarget(2);
    const pointGap = maxTarget - chestProgress.current;
    let remainingPoints = pointGap;
    const chestPlan = [];

    for (const chest of chestPriority) {
      if (remainingPoints <= 0) break;
      const available = rc.chests[chest.id] || 0;
      if (available <= 0) continue;
      const availableRound = Math.floor(available / 10) * 10;
      if (availableRound <= 0) continue;
      const needed = Math.ceil(remainingPoints / chest.points);
      // 所有宝箱统一用 floor 向下取整，确保不超额
      const useCount = Math.min(Math.floor(needed / 10) * 10, availableRound);
      if (useCount <= 0) continue;
      chestPlan.push({ typeId: chest.id, name: chest.name, qty: useCount, points: chest.points });
      remainingPoints -= useCount * chest.points;
    }
    // 兆底：剩余 <10 分时，用最小宝箱开10个补齐（不可避免的小额超出）
    if (remainingPoints > 0 && remainingPoints < 10) {
      for (let i = chestPriority.length - 1; i >= 0; i--) {
        const avail = rc.chests[chestPriority[i].id] || 0;
        if (avail >= 10) {
          chestPlan.push({ typeId: chestPriority[i].id, name: chestPriority[i].name, qty: 10, points: chestPriority[i].points });
          remainingPoints -= 10 * chestPriority[i].points;
          break;
        }
      }
    }

    if (chestPlan.length > 0) {
      const totalChests = chestPlan.reduce((s, c) => s + c.qty, 0);
      const totalPts = chestPlan.reduce((s, c) => s + c.qty * c.points, 0);
      plan.push({ type: 'chest', chests: chestPlan, pointGap, totalChests, totalPts });
      details.push(`宝箱: 距满级差 ${formatNum(pointGap)} 分（目标 ${formatNum(maxTarget)}），计划开 ${totalChests} 个 (${formatNum(totalPts)} 分)`);
    } else {
      details.push(`宝箱: 距满级差 ${formatNum(pointGap)} 分，无可用宝箱`);
    }
  }

  // 鱼竿 (taskId=3) - 基于用户设定的目标值
  const fishProgress = progressList.value.find(p => p.id === 3);
  if (fishProgress && !fishProgress.isCompleted) {
    const target = fishTarget.value;
    const current = fishProgress.current;
    const gap = Math.max(0, target - current);
    if (gap > 0) {
      plan.push({ type: 'fishing', qty: gap, target, current, fishType: fishTargetType.value });
      details.push(`钓鱼(${fishTargetType.value === 2 ? '黄金鱼竿' : '普通鱼竿'}): 目标 ${target}，已消耗 ${current}，还需 ${gap}`);
    } else {
      details.push(`钓鱼(${fishTargetType.value === 2 ? '黄金鱼竿' : '普通鱼竿'}): 已达标（已消耗 ${current} ≥ 目标 ${target}）`);
    }
  }

  // 金砖 (taskId=5) - 基于档位目标
  const effectiveGoldTarget = autoGoldTierTarget.value;
  if (effectiveGoldTarget > 0) {
    const goldProgress = progressList.value.find(p => p.id === 5);
    const current = goldProgress?.current || 0;
    const target = effectiveGoldTarget;
    const gap = Math.max(0, target - current);
    if (gap > 0) {
      const unitPrice = GOLD_PRICE.store_rod || 600;
      const rodNeeded = Math.ceil(gap / unitPrice); // 每根鱼竿=600金砖消耗
      const cost = rodNeeded * unitPrice; // 实际金砖消耗
      const balance = goldBrickCount.value;
      const canAfford = balance >= cost;
      plan.push({ type: 'goldRod', qty: rodNeeded, target, current, cost, balance, canAfford });
      const tierIdx = GOLD_TIERS.indexOf(target);
      const tierLabel = tierIdx >= 0 ? `档${tierIdx + 1}` : '';
      details.push(`金砖${tierLabel}: 目标 ${formatNum(target)}，已消耗 ${formatNum(current)}，差 ${formatNum(gap)} 金砖 ≈ ${rodNeeded} 根鱼竿 (${formatNum(cost)}💎)${canAfford ? '' : '（金砖不足，无法购买）'}`);
    } else {
      const tierIdx = GOLD_TIERS.indexOf(target);
      const tierLabel = tierIdx >= 0 ? `档${tierIdx + 1}` : '';
      details.push(`金砖${tierLabel}: 已达标（已消耗 ${formatNum(current)} ≥ ${formatNum(target)}）`);
    }
  }

  return { plan, details };
});

// 批次执行工具
const executeBatch = async (tokenId, cmd, getParams, totalQty, label) => {
  const batchSize = 10;
  const batches = Math.floor(totalQty / batchSize);
  const remainder = totalQty % batchSize;
  const totalBatches = batches + (remainder > 0 ? 1 : 0);
  addLog(`${label}: 共 ${totalQty} 个，分 ${totalBatches} 批执行（每批 ${batchSize} 个）`);

  let batchIndex = 0;
  for (let i = 0; i < batches; i++) {
    if (autoStopped.value) throw new Error('用户停止');
    while (autoPaused.value) {
      if (autoStopped.value) throw new Error('用户停止');
      await delay(200);
    }
    batchIndex++;
    await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(batchSize), 15000);
    addLog(`${label} 第${batchIndex}/${totalBatches}批: 开 ${batchSize} 个 (已完成 ${(i + 1) * batchSize}/${totalQty})`);
    if (globalDelay.value > 0) await delay(globalDelay.value);
    autoStep.value = `${label} (${(i + 1) * batchSize}/${totalQty})`;
  }
  if (remainder > 0) {
    if (autoStopped.value) throw new Error('用户停止');
    batchIndex++;
    await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(remainder), 15000);
    addLog(`${label} 第${batchIndex}/${totalBatches}批: 开 ${remainder} 个 (已完成 ${totalQty}/${totalQty})`);
    autoStep.value = `${label} (${totalQty}/${totalQty})`;
  }
};

const stopAuto = () => {
  autoStopped.value = true;
  autoPaused.value = false;
  addLog('⏹ 用户停止自动执行', 'warning');
};

const togglePause = () => {
  autoPaused.value = !autoPaused.value;
  addLog(autoPaused.value ? '⏸ 暂停自动执行' : '▶ 继续自动执行');
};

// 自动招募（按活动差额）
const executeAutoRecruit = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  const recruitProgress = progressList.value.find(p => p.id === 1);
  if (!recruitProgress || recruitProgress.isCompleted) { message.info('招募任务已完成'); return; }
  const maxTarget = getMaxTarget(1);
  const gap = maxTarget - recruitProgress.current;
  const available = resourceCounts.value.recruit[1001] || 0;
  const useCount = Math.min(Math.ceil(gap / 10) * 10, Math.floor(available / 10) * 10); // 目标向上取整确保达标
  if (useCount <= 0) { message.warning(`招募令不足（需${Math.ceil(gap / 10) * 10}，有${available}）`); return; }
  isRunning.value = true;
  runningType.value = 'recruit';
  addLog(`🤖 自动招募 x${useCount}（差额${gap}）`);
  try {
    await executeBatch(tokenId, 'hero_recruit', (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }), useCount, '招募');
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    tokenStore.sendMessage(tokenId, 'activity_get');
    addLog(`✅ 自动招募完成 x${useCount}`, 'success');
    message.success(`自动招募完成 x${useCount}`);
  } catch (err) {
    addLog(`❌ 自动招募失败: ${err.message}`, 'error');
    message.error(`自动招募失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 金砖购买执行
const executeGoldBuy = async (type) => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  let qty = goldBuyQty.value;
  if (qty <= 0) { message.warning('购买次数必须大于0'); return; }

  // 购买前刷新角色数据，获取最新金砖余额
  const unitPrice = GOLD_PRICE.store_rod || 600;
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
  } catch (e) { /* 使用缓存数据 */ }
  if (qty <= 0) {
    message.warning('购买数量无效');
    return;
  }

  const totalCost = qty * unitPrice;
  const balance = goldBrickCount.value;

  // 购买确认（防止误触）
  const confirmed = window.confirm(`确认购买 ${qty} 次黄金鱼竿？\n预计消耗 ${totalCost} 💎（当前余额 ${balance} 💎）`);
  if (!confirmed) return;

  // 金砖不足时自动降低购买数量
  if (totalCost > balance) {
    const maxQty = Math.floor(balance / unitPrice);
    if (maxQty <= 0) {
      message.error(`金砖不足（需 ${formatNum(totalCost)}，仅有 ${formatNum(balance)}）`);
      addLog(`❌ 金砖不足: 需 ${formatNum(totalCost)} 💎，仅有 ${formatNum(balance)} 💎`, 'error');
      return;
    }
    addLog(`⚠️ 金砖不足（需${formatNum(totalCost)}，有${formatNum(balance)}），自动降至 ${maxQty} 次`, 'warning');
    qty = maxQty;
  }

  let typeName, runningKey;
  switch (type) {
    case 'store_rod':
      typeName = '黄金鱼竿';
      runningKey = 'goldBuyRod';
      break;
    default:
      return;
  }

  const estimatedCost = qty * unitPrice;
  isRunning.value = true;
  runningType.value = runningKey;
  addLog(`💎 开始购买 ${typeName} x${qty}（预计消耗 ${formatNum(estimatedCost)} 💎，余额 ${formatNum(balance)}）`);

  try {
    if (type === 'store_rod') {
      // 黄金鱼竿：system_buyitem 一次性购买
      await tokenStore.sendMessageWithPromise(tokenId, 'system_buyitem', { itemId: 1012, buyNum: qty }, 8000);
      addLog(`💎 ${typeName} x${qty} 购买成功`);
    }

    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    const actualCost = qty * unitPrice;
    addLog(`✅ ${typeName} 购买完成，消耗 ${formatNum(actualCost)} 💎`, 'success');
    message.success(`${typeName} 购买完成 (x${qty})，消耗 ${formatNum(actualCost)} 💎`);
  } catch (err) {
    addLog(`❌ ${typeName} 购买异常: ${err.message}`, 'error');
    message.error(`${typeName} 购买失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 计算当前宝箱开箱计划（内部工具函数）
// 规则：所有宝箱只能开10的倍数
// 策略：铂金/黄金/青铜/木质均用 floor 向下取整，避免超额；不足部分由下一轮循环补齐
const calcChestPlan = (pointGap) => {
  const rc = resourceCounts.value;
  let remaining = pointGap;
  const plan = [];
  for (const chest of chestPriority) {
    if (remaining <= 0) break;
    // 木质宝箱仅在剩余积分 <=100 时使用（精确补齐）
    if (chest.id === 2001 && remaining > 100) continue;
    const available = rc.chests[chest.id] || 0;
    if (available <= 0) continue;
    const availableRound = Math.floor(available / 10) * 10;
    if (availableRound <= 0) continue;

    const needed = Math.ceil(remaining / chest.points);
    // 所有宝箱统一用 floor 向下取整，确保不超额
    const useCount = Math.min(Math.floor(needed / 10) * 10, availableRound);
    if (useCount <= 0) continue;
    plan.push({ typeId: chest.id, name: chest.name, qty: useCount, points: chest.points });
    remaining -= useCount * chest.points;
  }
  // 兆底：剩余 <10 分时，用最小宝箱开10个补齐（不可避免的小额超出）
  if (remaining > 0 && remaining < 10) {
    for (let i = chestPriority.length - 1; i >= 0; i--) {
      const avail = rc.chests[chestPriority[i].id] || 0;
      if (avail >= 10) {
        plan.push({ typeId: chestPriority[i].id, name: chestPriority[i].name, qty: 10, points: chestPriority[i].points });
        break;
      }
    }
  }
  return plan;
};

// 循环开箱核心逻辑：开箱 → 领取积分 → 刷新 → 重算缺口 → 继续
const executeChestLoop = async (tokenId, isAutoCtx = false) => {
  const checkStop = () => {
    if (isAutoCtx && autoStopped.value) throw new Error('用户停止');
  };

  let round = 0;
  let totalOpened = 0;
  let totalPoints = 0;

  while (true) {
    checkStop();
    round++;

    // 1. 获取最新活动进度，计算缺口
    const chestProgress = progressList.value.find(p => p.id === 2);
    if (!chestProgress || chestProgress.isCompleted) {
      addLog('✅ 宝箱任务已完成', 'success');
      break;
    }
    const maxTarget = getMaxTarget(2);
    const pointGap = maxTarget - chestProgress.current;
    if (pointGap <= 0) {
      addLog(`✅ 宝箱积分已达标（${formatNum(chestProgress.current)} / ${formatNum(maxTarget)}）`, 'success');
      break;
    }

    // 2. 计算本轮开箱计划
    const plan = calcChestPlan(pointGap);
    if (plan.length === 0) {
      addLog(`⚠️ 宝箱不足，还剩 ${formatNum(pointGap)} 分无法达成`, 'warning');
      break;
    }
    const roundChests = plan.reduce((s, c) => s + c.qty, 0);
    const roundPts = plan.reduce((s, c) => s + c.qty * c.points, 0);
    addLog(`📊 第${round}轮: 缺口${formatNum(pointGap)}分，计划开${roundChests}个(${formatNum(roundPts)}分)`);

    // 3. 执行开箱（每种宝箱开后立即领取积分 + 刷新重算）
    let planCompleted = false; // 标记是否已达标提前结束
    for (const chest of plan) {
      checkStop();
      try {
        const label = isAutoCtx ? `开箱 ${chest.name}` : `开${chest.name}`;
        if (isAutoCtx) autoStep.value = `第${round}轮 开${chest.name}...`;
        addLog(`📦 开 ${chest.name} x${chest.qty} (${formatNum(chest.qty * chest.points)}分)`);
        await executeBatch(tokenId, 'item_openbox', (qty) => ({ itemId: chest.typeId, number: qty }), chest.qty, label);
        totalOpened += chest.qty;
        totalPoints += chest.qty * chest.points;
        await delay(300);
      } catch (e) {
        if (e.message === '用户停止') throw e;
        addLog(`⚠️ 开${chest.name}失败: ${e.message}，继续下一种`, 'warning');
        continue;
      }

      // 每开完一种宝箱后立即领取积分奖励
      checkStop();
      try {
        if (isAutoCtx) autoStep.value = `领取${chest.name}积分奖励...`;
        addLog(`🎁 领取${chest.name}积分奖励...`);
        await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000);
      } catch (e) {
        addLog(`⚠️ 领取${chest.name}积分奖励异常: ${e.message}`, 'warning');
      }
      await delay(300);

      // 领取积分后刷新数据，重新计算积分缺口
      try {
        await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
        await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
        await delay(300);
      } catch (e) {
        addLog(`⚠️ 刷新数据失败: ${e.message}`, 'warning');
      }
      const curProgress = progressList.value.find(p => p.id === 2);
      if (curProgress) {
        const newGap = getMaxTarget(2) - curProgress.current;
        addLog(`📊 宝箱积分: ${formatNum(curProgress.current)} / ${formatNum(getMaxTarget(2))}（缺口${formatNum(newGap)}）`, 'info');
        if (newGap <= 0 || curProgress.isCompleted) {
          addLog(`✅ 宝箱积分已达标，停止开箱`, 'success');
          planCompleted = true;
          break;
        }
      }
    }

    // 4. 如果本轮已达标，跳过剩余步骤直接进入下一轮检查
    if (planCompleted) {
      const finalProgress = progressList.value.find(p => p.id === 2);
      if (finalProgress) {
        addLog(`📊 宝箱积分: ${formatNum(finalProgress.current)} / ${formatNum(getMaxTarget(2))}`, 'info');
      }
      continue;
    }
  }

  // 最终领取一次积分（确保最后一轮的积分奖励被领取）
  checkStop();
  try {
    addLog('🎁 最终领取宝箱积分奖励...');
    await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000);
  } catch (e) {
    // 静默处理：可能没有新的积分可领
  }
  await delay(300);

  return { totalOpened, totalPoints, rounds: round };
};

// 自动开箱（按活动积分差额，循环执行）
const executeAutoChest = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  const chestProgress = progressList.value.find(p => p.id === 2);
  if (!chestProgress || chestProgress.isCompleted) { message.info('宝箱任务已完成'); return; }

  isRunning.value = true;
  runningType.value = 'chest';
  addLog('🤖 开始自动开箱（循环模式）');
  try {
    const result = await executeChestLoop(tokenId, false);
    addLog(`✅ 自动开箱完成: 共${result.rounds}轮，开${result.totalOpened}个，${formatNum(result.totalPoints)}分`, 'success');
    message.success(`自动开箱完成 (${result.totalOpened}个, ${formatNum(result.totalPoints)}分)`);
  } catch (err) {
    if (err.message !== '用户停止') {
      addLog(`❌ 自动开箱失败: ${err.message}`, 'error');
      message.error(`自动开箱失败: ${err.message}`);
    }
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 单账号自动完成逻辑
const executeAutoCompleteForToken = async (tokenId, tokenName, idx, total) => {
  addLog(`\n━━━ [${idx}/${total}] ${tokenName} ━━━`);

  // 刷新数据，确保获取最新消耗进度
  addLog('🔄 刷新活动数据...', 'info');
  autoStep.value = `[${idx}/${total}] ${tokenName} - 刷新数据...`;
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
  } catch (e) {
    addLog(`⚠️ 刷新数据失败: ${e.message}，使用缓存数据`, 'warning');
  }
  await delay(500);

  const planData = autoPlan.value;
  if (!planData || planData.plan.length === 0) {
    addLog(`ℹ️ ${tokenName} 无需自动执行，跳过`, 'info');
    return;
  }

  autoPlanDetails.value = planData.details;
  planData.details.forEach(d => addLog(`  📋 ${d}`));

  for (const task of planData.plan) {
    if (autoStopped.value) break;

    // --- 招募 ---
    if (task.type === 'recruit') {
      autoStep.value = `[${idx}/${total}] ${tokenName} - 执行招募...`;
      addLog(`📜 开始招募 x${task.qty}`);
      await executeBatch(
        tokenId, 'hero_recruit',
        (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false }),
        task.qty, '招募'
      );
      addLog('🔄 刷新数据...', 'info');
      autoStep.value = `[${idx}/${total}] ${tokenName} - 刷新数据...`;
      await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
      tokenStore.sendMessage(tokenId, 'activity_get');
      await delay(500);
      addLog(`✅ 招募完成 x${task.qty}`, 'success');
    }

    // --- 宝箱（循环开箱→领取→刷新→重算） ---
    if (task.type === 'chest') {
      autoStep.value = `[${idx}/${total}] ${tokenName} - 宝箱循环开箱...`;
      addLog(`📦 开始宝箱循环开箱（目标${formatNum(task.pointGap)}分）`);
      const result = await executeChestLoop(tokenId, true);
      addLog(`✅ 宝箱完成: 共${result.rounds}轮，开${result.totalOpened}个，${formatNum(result.totalPoints)}分`, 'success');
    }
  }

  // --- 金砖档位购买鱼竿（先买再钓） ---
  const effectiveGoldTarget = autoGoldTierTarget.value;
  let goldTierRodsBought = 0; // 档位购买的鱼竿数
  if (!autoStopped.value && effectiveGoldTarget > 0) {
    // 刷新活动数据，确保金砖已消耗量是最新的
    try {
      await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
      await delay(300);
    } catch (e) {
      addLog(`⚠️ 金砖刷新数据失败: ${e.message}`, 'warning');
    }
    const goldProgress = progressList.value.find(p => p.id === 5);
    const current = Number(goldProgress?.current) || 0;
    const target = effectiveGoldTarget;
    const gap = Math.max(0, target - current);
    if (gap > 0) {
      const unitPrice = GOLD_PRICE.store_rod || 600;
      // 直接用差额计算购买数量，不减已有鱼竿
      const rodNeeded = Math.ceil(gap / unitPrice);
      if (rodNeeded > 0) {
        const cost = rodNeeded * unitPrice;
        const balance = goldBrickCount.value;
        if (balance >= cost) {
          autoStep.value = `[${idx}/${total}] ${tokenName} - 购买黄金鱼竿...`;
          addLog(`💎 金砖档位差 ${formatNum(gap)}，购买 x${rodNeeded} 鱼竿（消耗 ${formatNum(cost)}💎，余额 ${formatNum(balance)}💎）`);
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'system_buyitem', { itemId: 1012, buyNum: rodNeeded }, 8000);
            goldTierRodsBought = rodNeeded;
            addLog(`✅ 黄金鱼竿 x${rodNeeded} 购买完成`, 'success');
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          } catch (e) {
            addLog(`❌ 黄金鱼竿购买失败: ${e.message}`, 'error');
          }
        } else {
          addLog(`⚠️ 金砖不足（需 ${formatNum(cost)}💎，余额 ${formatNum(balance)}💎），无法购买 ${rodNeeded} 根鱼竿，跳过`, 'warning');
        }
      }
    } else {
      addLog(`💎 金砖档位已达标（已消耗 ${formatNum(current)} ≥ ${formatNum(target)}）`);
    }
  }

  // --- 钓鱼（基于目标值差额） ---
  if (!autoStopped.value) {
    const fishProgress = progressList.value.find(p => p.id === 3);
    if (fishProgress && !fishProgress.isCompleted) {
      const target = fishTarget.value;
      const current = fishProgress.current;
      let gap = Math.max(0, target - current);
      if (gap > 0) {
        // BUG 3 修复：领取金鱼竿累计奖励（每 20 钓鱼积分可领 1 次）
        autoStep.value = `[${idx}/${total}] ${tokenName} - 领取金鱼竿...`;
        try {
          const freshRole = (await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000));
          const fishPoints = freshRole?.role?.statistics?.['artifact:point'] || tokenStore.gameData?.roleInfo?.role?.statistics?.['artifact:point'] || 0;
          const exchangeCount = Math.floor(fishPoints / 20);
          if (exchangeCount > 0) {
            addLog(`🎣 钓鱼累计积分 ${fishPoints}，可领取金鱼竿 x${exchangeCount}`);
            for (let k = 0; k < exchangeCount; k++) {
              try {
                await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, 5000);
                await delay(150);
              } catch (ex) {
                if (ex.message?.includes('400180')) break;
                addLog(`⚠️ 金鱼竿领取失败 (第${k + 1}次): ${ex.message}`, 'warning');
                break;
              }
            }
            addLog('✅ 金鱼竿累计领取完成', 'success');
            // 刷新角色数据以获取最新鱼竿库存
            await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
          } else {
            // 积分不足 20，尝试单次领取（兑底）
            try {
              await tokenStore.sendMessageWithPromise(tokenId, 'artifact_exchange', {}, 5000);
              addLog('✅ 金鱼竿领取成功', 'success');
            } catch (e) {
              if (!e.message?.includes('400180')) {
                addLog(`⚠️ 金鱼竿领取失败: ${e.message}`, 'warning');
              }
            }
          }
        } catch (e) {
          addLog(`⚠️ 领取金鱼竿异常: ${e.message}，继续钓鱼`, 'warning');
        }
        await delay(500);

        const fishTypeName = fishTargetType.value === 1 ? '普通鱼竿' : '黄金鱼竿';
        autoStep.value = `[${idx}/${total}] ${tokenName} - 执行钓鱼...`;
        addLog(`🎣 开始钓鱼 (${fishTypeName}) 目标${target}，已消耗${current}，还需${gap}`);

        if (gap > 0) {
          await executeBatch(
            tokenId, 'artifact_lottery',
            (q) => ({ type: fishTargetType.value, lotteryNumber: q, newFree: true }),
            gap, '钓鱼'
          );
          addLog('🔄 刷新数据...', 'info');
          autoStep.value = `[${idx}/${total}] ${tokenName} - 刷新数据...`;
          await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
          addLog(`✅ 钓鱼完成 x${gap}`, 'success');
        } else {
          addLog(`🎣 钓鱼目标已达成`, 'info');
        }

        // 钓鱼后宝箱积分可能仍不足，用钓鱼获得的宝箱再开一轮
        const hasChestTask = planData.plan.some(t => t.type === 'chest');
        if (hasChestTask) {
          await delay(300);
          const chestProgress2 = progressList.value.find(p => p.id === 2);
          if (chestProgress2 && !chestProgress2.isCompleted) {
            autoStep.value = `[${idx}/${total}] ${tokenName} - 宝箱补开（钓鱼获得宝箱）...`;
            addLog('📦 钓鱼获得宝箱，执行第二轮开箱补充积分...', 'info');
            const result2 = await executeChestLoop(tokenId, true);
            addLog(`✅ 宝箱补开完成: 共${result2.rounds}轮，开${result2.totalOpened}个，${formatNum(result2.totalPoints)}分`, 'success');
          }
        }
      } else {
        addLog(`🎣 钓鱼已达标（已消耗${current} ≥ 目标${target}），跳过`);
      }
    }
  }

  // === 钓鱼结束后：领取档位奖励 ===
  if (autoStopped.value) { addLog('⛔ 已手动停止', 'warning'); return; }
  autoStep.value = `[${idx}/${total}] ${tokenName} - 领取档位奖励...`;
  addLog('🏅 开始领取档位奖励...', 'info');
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await delay(300);
    const commonActivityInfo = tokenStore.gameData?.commonActivityInfo;
    const activityInfo = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;
    if (activityInfo) {
      const entries = Object.entries(activityInfo);
      if (entries.length >= 1) {
        const consumeActivityId = Number(entries[0][0]);
        let claimedCount = 0;
        let skipCount = 0;
        for (let missionId = 1; missionId <= 100; missionId++) {
          try {
            await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimtaskreward', { activityId: consumeActivityId, missionId }, 5000);
            claimedCount++;
          } catch (e) {
            if (e.message?.includes('700010') || e.message?.includes('3200010') || e.message?.includes('3200020') || e.message?.includes('-10006') || e.message?.includes('700011')) {
              skipCount++;
            }
          }
          await delay(100);
        }
        addLog(`✅ 档位领取完成: 成功${claimedCount}档，跳过${skipCount}档`, 'success');
      }
    }
    // 领取免费道具
    if (activityInfo) {
      const entries = Object.entries(activityInfo);
      if (entries.length >= 4) {
        const [key, val] = entries[3];
        const freeActivityId = Number(key);
        const recordKeys = val?.record ? Object.keys(val.record) : [];
        const goodsId = recordKeys.length > 0 ? Number(recordKeys[0]) : Number(key + '1');
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'activity_commonbuygoods', { goodsId, num: 1 }, 5000);
          addLog('✅ 免费道具领取成功', 'success');
        } catch (e) {
          if (!e.message?.includes('3200020')) {
            addLog(`ℹ️ 免费道具: ${e.message}`, 'info');
          }
        }
      }
    }
  } catch (err) {
    addLog(`⚠️ 领取奖励失败: ${err.message}`, 'warning');
  }

  // === 领取完奖励后：消耗道具 ===
  if (autoStopped.value) { addLog('⛔ 已手动停止', 'warning'); return; }
  autoStep.value = `[${idx}/${total}] ${tokenName} - 消耗道具...`;
  addLog('🎁 开始消耗道具...', 'info');
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await delay(300);
    const role = tokenStore.gameData?.roleInfo?.role;
    // 使用消耗活动道具 (5279)
    if (autoUseActivityItem.value) {
      const actItemQty = Number(role?.items?.[5279]?.quantity || 0);
      if (actItemQty > 0) {
        addLog(`🎁 使用消耗活动道具 x${actItemQty}...`, 'info');
        try {
          await tokenStore.sendMessageWithPromise(tokenId, 'item_openpack', { itemId: 5279, number: actItemQty, index: 0 }, 15000);
          addLog(`✅ 消耗活动道具 x${actItemQty} 使用成功`, 'success');
        } catch (e) {
          if (!e.message?.includes('3200020')) {
            addLog(`⚠️ 道具使用失败: ${e.message}`, 'warning');
          }
        }
      } else {
        addLog('ℹ️ 无消耗活动道具(5279)，跳过', 'info');
      }
    } else {
      addLog('ℹ️ 已关闭使用消耗道具，跳过', 'info');
    }

  } catch (err) {
    addLog(`⚠️ 消耗道具失败: ${err.message}`, 'warning');
  }

  // 最终刷新数据
  await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000).catch(() => {});
  await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000).catch(() => {});

  addLog(`✅ [${idx}/${total}] ${tokenName} 完成`, 'success');
};

// 自动完成主逻辑（支持多账号顺序执行）
const executeAutoComplete = async () => {
  // 安全过滤：只保留当前可见（非达标且未删除）的已选账号
  const visibleIds = new Set(displayTokens.value.map(t => t.id));
  const ids = selectedTokenIds.value.filter(id => visibleIds.has(id));
  if (ids.length === 0) { message.warning('请先选择至少一个执行成员'); return; }

  // 记住原始账号，循环切换后恢复
  const originalAccountId = currentAccountId.value;

  autoRunning.value = true;
  autoStopped.value = false;
  autoPaused.value = false;

  addLog(`🤖 开始自动完成消耗活动，共 ${ids.length} 个账号`);

  let successCount = 0;
  let failCount = 0;
  const successIds = []; // 追踪执行成功的账号

  try {
    for (let i = 0; i < ids.length; i++) {
      if (autoStopped.value) break;
      const tokenId = ids[i];
      const token = allTokens.value.find(t => t.id === tokenId);
      const tokenName = token?.name || token?.server || tokenId.slice(0, 8);

      // 切换当前Token
      tokenStore.selectToken(tokenId);
      await delay(1500); // 等待连接建立

      try {
        await executeAutoCompleteForToken(tokenId, tokenName, i + 1, ids.length);
        successIds.push(tokenId);
        // 执行成功后自动取消勾选（直接操作原始账号的selectMap，避免切换干扰）
        const curSel = selectMap.value[originalAccountId] || [];
        selectMap.value[originalAccountId] = curSel.filter(id => id !== tokenId);
        saveLS(LS_SELECT_MAP_KEY, selectMap.value);
        successCount++;
      } catch (err) {
        if (err.message === '用户停止') break;
        addLog(`❌ [${i + 1}/${ids.length}] ${tokenName} 执行失败: ${err.message}`, 'error');
        failCount++;
      }

      // 多账号间隔
      if (i < ids.length - 1 && !autoStopped.value) {
        addLog('⏳ 切换下一个账号...', 'info');
        await delay(1000);
      }
    }

    if (!autoStopped.value) {
      autoStep.value = '全部完成!';
      addLog(`\n🎉 全部完成！成功 ${successCount} 个，失败 ${failCount} 个`, 'success');
      message.success(`自动消耗完成：成功${successCount}，失败${failCount}`);
      // 自动扫描已完成的账号（仅扫描执行成功的）
      if (successIds.length > 0) {
        addLog(`🔍 正在扫描 ${successIds.length} 个已完成账号...`, 'info');
        const freshResults = [];
        for (let i = 0; i < successIds.length; i++) {
          const token = allTokens.value.find(t => t.id === successIds[i]);
          if (!token) continue;
          const result = await scanSingleMember(token, i, successIds.length);
          if (result) freshResults.push(result);
        }
        // 合并到扫描结果（更新已有，追加新的）
        const existingMap = new Map(scanResults.value.map(r => [r.id, r]));
        freshResults.forEach(r => existingMap.set(r.id, r));
        scanResults.value = Array.from(existingMap.values());
        const q = freshResults.filter(r => r.qualified).length;
        addLog(`📊 已完成账号扫描: ${q}/${freshResults.length} 个达标`, 'success');
      }
    } else {
      addLog('⏹ 自动执行已停止', 'warning');
    }
  } catch (err) {
    if (err.message !== '用户停止') {
      addLog(`❌ 自动执行失败: ${err.message}`, 'error');
      message.error(`自动执行失败: ${err.message}`);
    }
  } finally {
    autoRunning.value = false;
    autoPaused.value = false;
  }
};

// 游戏数据
const roleInfo = computed(() => tokenStore.gameData?.roleInfo || null);
const commonActivityInfo = computed(() => {
  const data = tokenStore.gameData?.commonActivityInfo;
  return data?.activity?.commonActivityInfo || data?.commonActivityInfo || {};
});

// 活动数据
const hasActivityData = computed(() => {
  if (!commonActivityInfo.value) return false;
  return Object.values(commonActivityInfo.value).some((activity) => {
    if (!activity?.task) return false;
    return Object.keys(activity.task).some((key) => {
      const id = Number(key);
      return id >= 1 && id <= 5;
    });
  });
});

// 进度列表
const progressList = computed(() => {
  return manager.calculateProgressList(commonActivityInfo.value);
});

// 资源数量
const resourceCounts = computed(() => {
  const result = manager.getResourceCounts(roleInfo.value);
  return result.data || { chests: {}, fishing: {}, recruit: {}, torch: {} };
});

// 金砖当前已消耗值
const goldBrickCurrent = computed(() => {
  const goldProgress = progressList.value.find(p => p.id === 5);
  return goldProgress?.current || 0;
});
// 金砖档位差额计算
const goldTierGap = computed(() => {
  const target = goldTierTarget.value;
  if (!target) return 0;
  return Math.max(0, target - goldBrickCurrent.value);
});
// 档位或已消耗金砖变化时自动计算鱼竿购买数量
const calcGoldBuyQty = () => {
  const target = goldTierTarget.value;
  if (!target) {
    goldBuyQty.value = 1;
    return;
  }
  const current = goldBrickCurrent.value;
  const gap = Math.max(0, target - current);
  if (gap <= 0) {
    goldBuyQty.value = 0;
    return;
  }
  const unitPrice = GOLD_PRICE.store_rod || 600;
  goldBuyQty.value = Math.ceil(gap / unitPrice);
};
watch(goldTierTarget, calcGoldBuyQty);
watch(goldBrickCurrent, calcGoldBuyQty);

// 宝箱积分数据
const chestPointData = computed(() => {
  if (!roleInfo.value) return null;
  const result = manager.getChestPointData(roleInfo.value);
  return result.data || null;
});

// 钓鱼当前已消耗
const fishCurrent = computed(() => {
  const fishProgress = progressList.value.find(p => p.id === 3);
  return fishProgress ? fishProgress.current : 0;
});

// 三种积分模式展示
const pointModes = computed(() => {
  const d = chestPointData.value;
  if (!d) return [];
  return [
    { key: 'all', label: '全开', data: d.allMode },
    { key: 'noWood', label: '不开木质', data: d.noWoodMode },
    { key: 'noPlat', label: '不开铂金', data: d.noPlatMode },
  ];
});

// 工具函数
const formatNum = (n) => {
  if (n == null) return '0';
  return n >= 10000 ? (Math.floor(n / 1000) / 10).toFixed(1) + '万' : String(n);
};

const calcPercentage = (item) => {
  if (item.isCompleted) return 100;
  if (item.nextTarget > 0) return Math.min(100, (item.current / item.nextTarget) * 100);
  return 0;
};

// 添加日志
const userScrolledUp = ref(false);
const onLogScroll = () => {
  if (!logAreaRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = logAreaRef.value;
  userScrolledUp.value = scrollTop + clientHeight < scrollHeight - 20;
};
const addLog = (msg, type = 'info') => {
  const log = { time: new Date().toISOString(), message: msg, type };
  logs.value.push(log);
  if (logs.value.length > 100) logs.value = logs.value.slice(-100);
  if (userScrolledUp.value) return;
  nextTick(() => {
    if (logAreaRef.value) {
      logAreaRef.value.scrollTop = logAreaRef.value.scrollHeight;
    }
  });
};

// 刷新数据
const refreshData = async () => {
  if (!tokenStore.selectedToken) return;
  const tokenId = tokenStore.selectedToken.id;
  // 检查 WebSocket 是否已连接，未连接则静默跳过
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') return;
  isRefreshing.value = true;
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    addLog('数据刷新完成', 'success');
  } catch (err) {
    addLog(`刷新失败: ${err.message}`, 'error');
  } finally {
    isRefreshing.value = false;
  }
};

// 延迟执行
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ====== 达标扫描（目标值可配置） ======
const LS_SCAN_TARGETS_KEY = 'consume_scan_targets';
const defaultScanTargets = { recruit: 4000, chestPts: 100000, fish: 1250 };
const scanTargets = ref(loadLS(LS_SCAN_TARGETS_KEY, defaultScanTargets));
watch(scanTargets, (v) => saveLS(LS_SCAN_TARGETS_KEY, v), { deep: true });
const isScanning = ref(false);
const scanResults = ref(loadLS(LS_SCAN_KEY, []));
watch(scanResults, (v) => saveLS(LS_SCAN_KEY, v), { deep: true });
const scanQualifiedIds = computed(() => scanResults.value.filter(r => r.qualified).map(r => r.id));
const qualifiedResults = computed(() => scanResults.value.filter(r => r.qualified));

// 扫描达标后自动从 selectedTokenIds 移除达标账号 + 已删除的账号
watch(scanQualifiedIds, (qIds) => {
  if (qIds.length > 0 || selectedTokenIds.value.length > 0) {
    const allIds = new Set(allTokens.value.map(t => t.id));
    selectedTokenIds.value = selectedTokenIds.value.filter(
      id => !qIds.includes(id) && allIds.has(id)
    );
  }
});

// 等待连接建立（最多等待指定毫秒）
const waitForConnected = async (tokenId, timeout = 10000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === 'connected') return true;
    await delay(500);
  }
  return false;
};

// 确保Token连接可用
const ensureScanConnection = async (tokenId, tokenData) => {
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status === 'connected') return true;
  // 未连接则创建连接
  addLog(`🔌 正在连接 ${tokenData.name || tokenData.server}...`);
  await tokenStore.createWebSocketConnection(tokenId, tokenData.token, tokenData.wsUrl);
  const connected = await waitForConnected(tokenId, 10000);
  if (!connected) {
    addLog(`❌ 连接超时: ${tokenData.name || tokenData.server}`, 'error');
  }
  return connected;
};

// 扫描单个成员
const scanSingleMember = async (token, idx, total) => {
  const name = token.name || token.server || token.id.slice(0, 8);
  addLog(`🔍 [${idx + 1}/${total}] 扫描 ${name}...`);

  // 确保连接建立
  const connected = await ensureScanConnection(token.id, token);
  if (!connected) {
    return {
      id: token.id, name, recruit: 0, chestPts: 0, fish: 0,
      recruitOk: false, chestOk: false, fishOk: false, qualified: false
    };
  }
  await delay(500);

  try {
    await tokenStore.sendMessageWithPromise(token.id, 'activity_get', {}, 8000);
    await tokenStore.sendMessageWithPromise(token.id, 'role_getroleinfo', {}, 8000);
  } catch (e) {
    addLog(`⚠️ ${name} 数据获取失败，使用缓存`, 'warning');
  }
  await delay(300);

  const actInfo = tokenStore.gameData?.commonActivityInfo;
  const actData = actInfo?.activity?.commonActivityInfo || actInfo?.commonActivityInfo || {};
  const progList = manager.calculateProgressList(actData);

  const recruitProg = progList.find(p => p.id === 1);
  const recruit = recruitProg?.current || 0;
  const recruitOk = recruit >= scanTargets.value.recruit || recruitProg?.isCompleted === true;

  const chestProg = progList.find(p => p.id === 2);
  const chestPts = chestProg?.current || 0;
  const chestOk = chestPts >= scanTargets.value.chestPts || chestProg?.isCompleted === true;

  const fishProg = progList.find(p => p.id === 3);
  const fish = fishProg?.current || 0;
  const fishOk = fish >= scanTargets.value.fish || fishProg?.isCompleted === true;

  const qualified = recruitOk && chestOk && fishOk;
  const result = {
    id: token.id, name, recruit, chestPts, fish,
    recruitOk, chestOk, fishOk, qualified
  };
  addLog(`${qualified ? '✅' : '❌'} ${name}: 招募${formatNum(recruit)} 宝箱${formatNum(chestPts)} 钓鱼${fish}`, qualified ? 'success' : 'warning');
  return result;
};

// 并发扫描（默认3路并发）
const SCAN_CONCURRENCY = 3;
const scanQualifiedMembers = async () => {
  const tokens = allTokens.value;
  if (tokens.length === 0) { message.warning('无Token可扫描'); return; }
  const savedTokenId = tokenStore.selectedToken?.id;
  isScanning.value = true;
  scanResults.value = [];
  addLog(`🔍 开始并发扫描 ${tokens.length} 个成员（并发${SCAN_CONCURRENCY}）...`, 'info');

  // 并发池执行
  const results = new Array(tokens.length);
  let nextIdx = 0;
  const worker = async () => {
    while (nextIdx < tokens.length) {
      const idx = nextIdx++;
      results[idx] = await scanSingleMember(tokens[idx], idx, tokens.length);
    }
  };
  const workers = Array.from({ length: Math.min(SCAN_CONCURRENCY, tokens.length) }, () => worker());
  await Promise.all(workers);

  // 汇总结果
  scanResults.value = results.filter(Boolean);
  const qualifiedCount = scanResults.value.filter(r => r.qualified).length;
  addLog(`\n🏁 扫描完成: ${qualifiedCount}/${tokens.length} 个达标`, 'success');
  message.success(`扫描完成: ${qualifiedCount}/${tokens.length} 达标`);

  // 恢复原选中Token
  if (savedTokenId) tokenStore.selectToken(savedTokenId);
  isScanning.value = false;
};

// 通用消耗执行
const executeConsume = async (moduleType) => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;

  let typeId, totalQty, cmd, getParams;
  switch (moduleType) {
    case 'chest':
      typeId = chestType.value;
      totalQty = chestQty.value;
      cmd = 'item_openbox';
      getParams = (qty) => ({ itemId: typeId, number: qty });
      break;
    case 'fishing':
      typeId = fishType.value;
      totalQty = fishQty.value;
      cmd = 'artifact_lottery';
      getParams = (qty) => ({ type: typeId, lotteryNumber: qty, newFree: true });
      break;
    case 'recruit':
      typeId = 1;
      totalQty = recruitQty.value;
      cmd = 'hero_recruit';
      getParams = (qty) => ({ recruitType: 1, recruitNumber: qty, byClub: false });
      break;
    case 'torch':
      typeId = torchType.value;
      totalQty = torchQty.value;
      cmd = 'item_consume';
      getParams = (qty) => ({ itemId: typeId, quantity: qty });
      break;
    default:
      return;
  }

  isRunning.value = true;
  runningType.value = moduleType;
  addLog(`开始执行: ${moduleType} x${totalQty}`);

  const batchSize = 10;
  const batches = Math.floor(totalQty / batchSize);
  const remainder = totalQty % batchSize;
  const totalBatches = batches + (remainder > 0 ? 1 : 0);
  addLog(`共 ${totalQty} 个，分 ${totalBatches} 批（每批 ${batchSize}，延迟 ${globalDelay.value >= 1000 ? (globalDelay.value / 1000) + 's' : globalDelay.value + 'ms'}）`);

  let batchIndex = 0;
  try {
    for (let i = 0; i < batches; i++) {
      batchIndex++;
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(batchSize), 15000);
      addLog(`第${batchIndex}/${totalBatches}批: ${batchSize} 个 (已完成 ${(i + 1) * batchSize}/${totalQty})`);
      if (globalDelay.value > 0) await delay(globalDelay.value);
    }
    if (remainder > 0) {
      batchIndex++;
      await tokenStore.sendMessageWithPromise(tokenId, cmd, getParams(remainder), 15000);
      addLog(`第${batchIndex}/${totalBatches}批: ${remainder} 个 (已完成 ${totalQty}/${totalQty})`);
    }

    // 宝箱：全部开完后领取一次积分，再刷新数据
    if (moduleType === 'chest') {
      addLog('🎁 领取宝箱积分奖励...');
      try {
        await tokenStore.sendMessageWithPromise(tokenId, 'item_batchclaimboxpointreward', {}, 15000);
        addLog('✅ 积分奖励领取成功', 'success');
      } catch (e) {
        addLog(`⚠️ 领取积分奖励异常: ${e.message}`, 'warning');
      }
      await delay(500);
    }

    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    // 宝箱：显示当前积分进度
    if (moduleType === 'chest') {
      const chestProgress = progressList.value.find(p => p.id === 2);
      if (chestProgress) {
        addLog(`📊 宝箱积分: ${formatNum(chestProgress.current)} / ${formatNum(getMaxTarget(2))}`, 'info');
      }
    }
    addLog(`执行完成: ${moduleType} x${totalQty}`, 'success');
    message.success('消耗执行完毕');
  } catch (err) {
    addLog(`执行失败: ${err.message}`, 'error');
    message.error(`消耗执行失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 使用消耗活动道具（ID: 5279）
const executeUseActivityItem = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  const ACTIVITY_ITEM_ID = 5279;

  isRunning.value = true;
  runningType.value = 'useActivityItem';
  try {
    // 刷新道具数量
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await delay(300);
    const role = tokenStore.gameData?.roleInfo?.role;
    const quantity = Number(role?.items?.[ACTIVITY_ITEM_ID]?.quantity || 0);
    if (quantity <= 0) {
      addLog('🎁 无消耗活动道具，跳过', 'warning');
      message.warning('无消耗活动道具');
      return;
    }
    addLog(`🎁 拥有消耗活动道具 x${quantity}，全部使用`, 'info');
    try {
      await tokenStore.sendMessageWithPromise(tokenId, 'item_openpack', { itemId: ACTIVITY_ITEM_ID, number: quantity, index: 0 }, 15000);
      addLog(`✅ 消耗活动道具 x${quantity} 使用成功`, 'success');
      message.success(`使用道具 x${quantity} 成功`);
    } catch (e) {
      if ((e.message || '').includes('3200020')) {
        addLog('ℹ️ 消耗活动道具已领取过', 'info');
        message.info('已领取过');
      } else {
        addLog(`❌ 道具使用失败: ${e.message}`, 'error');
        message.error(`道具使用失败: ${e.message}`);
      }
    }
    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
  } catch (err) {
    addLog(`❌ 使用道具失败: ${err.message}`, 'error');
    message.error(`失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// ====== 挥鼓助威 ======
const executeAutumnUseItem = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  const token = tokenStore.selectedToken;
  isRunning.value = true;
  runningType.value = 'autumnUseItem';
  try {
    // 获取背包中助威道具(ID:5278)的剩余数量
    const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    const role = roleInfoRes?.role || roleInfoRes?.data?.role || {};
    const cheerItemCount = role.items?.[5278]?.quantity || 0;
    if (cheerItemCount <= 0) {
      addLog('⚠️ 助威道具不足，跳过', 'warning');
      message.warning('助威道具不足');
      return;
    }
    // 当输入为0时使用全部数量，输入>0时使用指定数量
    const inputQty = cheerQty.value || 0;
    const useNum = inputQty > 0
      ? Math.min(inputQty, cheerItemCount, 3000)
      : Math.min(cheerItemCount, 3000);
    addLog(`🥁 使用助威道具 x${useNum} (背包: ${cheerItemCount})`, 'info');
    await tokenStore.sendMessageWithPromise(tokenId, 'autumn_useitem', { itemNum: useNum }, 8000);
    addLog('✅ 挥鼓助威完成', 'success');
    message.success(`挥鼓助威完成 (x${useNum})`);
    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
  } catch (err) {
    addLog(`❌ 助威失败: ${err.message}`, 'error');
    message.error(`助威失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// ====== 兑换购买 ======
const showExchangeModal = ref(false);

// 商品列表（14种商品，与 batchActivityExchange GOODS_MAP 保持一致）
const exchangeGoodsList = ref([
  { suffix: 1, name: '惊雷', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 2, name: '月华', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 3, name: '回响', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 4, name: '琴心公', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 5, name: '琴心母', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 6, name: '璇玑', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 7, name: '剑胆公', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 8, name: '剑胆母', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 9, name: '阵容编组', maxCount: 1, checked: false, quantity: 1 },
  { suffix: 10, name: '珍珠', maxCount: 30, checked: false, quantity: 1 },
  { suffix: 11, name: '万能红将碎片', maxCount: 200, checked: false, quantity: 1 },
  { suffix: 12, name: '随机红将碎片', maxCount: 200, checked: false, quantity: 1 },
  { suffix: 13, name: '白玉', maxCount: 999, checked: false, quantity: 1 },
  { suffix: 14, name: '精铁', maxCount: 999, checked: false, quantity: 1 },
]);

const executeActivityExchange = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;
  showExchangeModal.value = false;
  isRunning.value = true;
  runningType.value = 'activityExchange';

  try {
    // 刷新活动数据
    addLog('🔄 获取活动数据...', 'info');
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await delay(300);

    // 获取兑换商店和里程碑的 activityId（与 batchActivityExchange 一致，使用 Object.entries）
    const commonActivityInfo = tokenStore.gameData?.commonActivityInfo;
    const activityInfo = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;
    const entries = activityInfo ? Object.entries(activityInfo) : [];
    const exchangeActivityId = entries.length >= 3 ? Number(entries[2][0]) : null; // 第3个位置
    const milestoneActivityId = entries.length >= 5 ? Number(entries[4][0]) : null; // 第5个位置

    if (!exchangeActivityId) {
      addLog('❌ 未找到兑换商店活动ID', 'error');
      message.error('未找到兑换商店，请确认活动是否开启');
      return;
    }

    const selectedItems = exchangeGoodsList.value.filter(i => i.checked);
    addLog(`🏪 开始购买 ${selectedItems.length} 个商品...`, 'info');

    // 购买选中商品
    let successCount = 0;
    for (const item of selectedItems) {
      const goodsId = Number(String(exchangeActivityId) + String(item.suffix).padStart(2, '0'));
      addLog(`🛒 购买 ${item.name} (x${item.quantity})`, 'info');
      try {
        await tokenStore.sendMessageWithPromise(tokenId, 'activity_exchange', {
          activityId: exchangeActivityId, goodsId, quantity: item.quantity
        }, 5000);
        successCount++;
        addLog(`✅ ${item.name} 购买成功`, 'success');
      } catch (e) {
        if (e.message?.includes('400180') || e.message?.includes('限购') || e.message?.includes('已购买')) {
          addLog(`⚠️ ${item.name}: 已达限购数量，跳过`, 'warning');
        } else {
          addLog(`❌ ${item.name} 购买失败: ${e.message}`, 'error');
        }
      }
    }

    // 领取里程碑进度奖励
    if (milestoneActivityId) {
      addLog('🎯 领取里程碑进度奖励...', 'info');
      try {
        await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimmilestone', { activityId: milestoneActivityId }, 5000);
        addLog('✅ 里程碑进度奖励领取成功', 'success');
      } catch (e) {
        if (e.message?.includes('700010') || e.message?.includes('未达标')) {
          addLog('ℹ️ 里程碑进度暂无可领取', 'info');
        } else {
          addLog(`⚠️ 里程碑领取失败: ${e.message}`, 'warning');
        }
      }
    }

    message.success(`兑换完成: 成功${successCount}/${selectedItems.length}`);
    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
  } catch (err) {
    addLog(`❌ 兑换失败: ${err.message}`, 'error');
    message.error(`失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
    // 重置选择
    exchangeGoodsList.value.forEach(i => { i.checked = false; i.quantity = 1; });
  }
};

// 领取免费消耗道具
const executeClaimFreeItem = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;

  isRunning.value = true;
  runningType.value = 'claimFreeItem';
  try {
    // 获取活动数据
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await delay(300);
    const commonActivityInfo = tokenStore.gameData?.commonActivityInfo;
    const activityInfo = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;
    if (!activityInfo) {
      addLog('⚠️ 无消耗活动数据', 'warning');
      message.warning('无消耗活动数据');
      return;
    }
    const entries = Object.entries(activityInfo);
    // 第4个位置 - 免费道具
    if (entries.length < 4) {
      addLog('⚠️ 未找到免费道具活动条目', 'warning');
      message.warning('未找到免费道具活动');
      return;
    }
    const [key, val] = entries[3];
    const freeActivityId = Number(key);
    const recordKeys = val?.record ? Object.keys(val.record) : [];
    const goodsId = recordKeys.length > 0 ? Number(recordKeys[0]) : Number(key + '1');
    addLog(`🎁 领取免费道具 (activityId: ${freeActivityId}, goodsId: ${goodsId})...`, 'info');
    try {
      await tokenStore.sendMessageWithPromise(tokenId, 'activity_commonbuygoods', { goodsId, num: 1 }, 5000);
      addLog('✅ 免费道具领取成功', 'success');
      message.success('免费道具领取成功');
    } catch (e) {
      if (e.message?.includes('700010') || e.message?.includes('1100010')) {
        addLog('ℹ️ 免费道具已领取过', 'info');
        message.info('已领取过');
      } else {
        addLog(`❌ 免费道具领取失败: ${e.message}`, 'error');
        message.error(`领取失败: ${e.message}`);
      }
    }
    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
  } catch (err) {
    addLog(`❌ 领取失败: ${err.message}`, 'error');
    message.error(`失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 领取消耗档位奖励 (1-100档)
const executeClaimTaskRewards = async () => {
  if (!tokenStore.selectedToken) { message.warning('请先选择Token'); return; }
  const tokenId = tokenStore.selectedToken.id;

  isRunning.value = true;
  runningType.value = 'claimTaskRewards';
  try {
    // 获取活动数据
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await delay(300);
    const commonActivityInfo = tokenStore.gameData?.commonActivityInfo;
    const activityInfo = commonActivityInfo?.activity?.commonActivityInfo || commonActivityInfo?.commonActivityInfo;
    if (!activityInfo) {
      addLog('⚠️ 无消耗活动数据', 'warning');
      message.warning('无消耗活动数据');
      return;
    }
    const entries = Object.entries(activityInfo);
    // 第1个位置 - 档位消耗奖励
    if (entries.length < 1) {
      addLog('⚠️ 未找到消耗活动条目', 'warning');
      message.warning('未找到消耗活动');
      return;
    }
    const consumeActivityId = Number(entries[0][0]);
    addLog(`🏅 开始领取档位奖励 (activityId: ${consumeActivityId})...`, 'info');
    let claimedCount = 0;
    let skipCount = 0;
    for (let missionId = 1; missionId <= 100; missionId++) {
      try {
        await tokenStore.sendMessageWithPromise(tokenId, 'activity_claimtaskreward', { activityId: consumeActivityId, missionId }, 5000);
        claimedCount++;
      } catch (e) {
        if (e.message?.includes('700010') || e.message?.includes('3200010') || e.message?.includes('3200020') || e.message?.includes('-10006') || e.message?.includes('700011')) {
          skipCount++;
        } else {
          addLog(`⚠️ 第${missionId}档领取失败: ${e.message}`, 'warning');
        }
      }
      await delay(100);
    }
    addLog(`✅ 档位领取完成: 成功${claimedCount}档，跳过${skipCount}档`, 'success');
    message.success(`领取完成: 成功${claimedCount}档`);
    // 刷新数据
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
  } catch (err) {
    addLog(`❌ 领取失败: ${err.message}`, 'error');
    message.error(`失败: ${err.message}`);
  } finally {
    isRunning.value = false;
    runningType.value = null;
  }
};

// 初始化
onMounted(() => {
  refreshData();
});

// 防抖刷新：避免扫描/执行期间重复触发
let refreshTimer = null;
const debouncedRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => refreshData(), 1000);
};

watch(() => tokenStore.selectedToken, async (newToken) => {
  // 扫描或执行中不自动刷新
  if (isScanning.value || isRunning.value || autoRunning.value) return;
  if (!newToken) return;
  const tokenId = newToken.id;

  // 等待 WebSocket 连接建立（最多等 8 秒）
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    isRefreshing.value = true;
    addLog(`⏳ 切换账号，等待连接...`, 'info');
    const connected = await new Promise((resolve) => {
      const timer = setInterval(() => {
        const s = tokenStore.getWebSocketStatus(tokenId);
        if (s === 'connected') { clearInterval(timer); resolve(true); }
        else if (s === 'error' || s === 'disconnected') { clearInterval(timer); resolve(false); }
      }, 500);
      setTimeout(() => { clearInterval(timer); resolve(false); }, 8000);
    });
    if (!connected) {
      addLog(`⚠️ 连接超时，无法获取活动数据`, 'warning');
      isRefreshing.value = false;
      return;
    }
  }

  // 连接已就绪，获取活动数据
  try {
    await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 5000);
    await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
    addLog(`✅ 已获取 ${newToken.name || '当前账号'} 的活动数据`, 'success');
  } catch (err) {
    addLog(`刷新失败: ${err.message}`, 'error');
  } finally {
    isRefreshing.value = false;
  }
});

// 切换到活动模块时等待2秒再刷新
watch(() => props.activeSection, async (newVal) => {
  if (newVal === 'activity') {
    await delay(2000);
    refreshData();
  }
});

// ====== 成员进度查询 ======
const LS_MEMBER_PROGRESS_KEY = 'consume_member_progress';
const showMemberProgressModal = ref(false);
const isQueryingMembers = ref(false);
const memberProgressList = ref(loadLS(LS_MEMBER_PROGRESS_KEY, []));
const memberFilterKeyword = ref('');
const queryProgress = ref({ current: 0, total: 0 });

const formatProgressNum = (v) => {
  if (v == null || v === 0) return '0';
  if (v >= 10000) return (v / 10000).toFixed(2) + '万';
  return String(v);
};

const getProgressColor = (current, target) => {
  if (!target || target === 0) return undefined;
  const ratio = current / target;
  if (ratio >= 1) return '#52c41a';
  if (ratio >= 0.8) return '#1890ff';
  if (ratio >= 0.5) return '#722ed1';
  return undefined;
};

const memberProgressColumns = [
  {
    title: '成员', key: 'name', width: 120, fixed: 'left',
    ellipsis: { tooltip: true },
    render: (row) => h('span', { style: 'font-weight:600' }, row.name),
  },
  {
    title: '招募进度', key: 'recruit', width: 110,
    render: (row) => {
      const color = getProgressColor(row.recruit, row.recruitTarget);
      return h('span', { style: color ? `color:${color};font-weight:600` : '' }, formatProgressNum(row.recruit));
    },
  },
  {
    title: '宝箱进度', key: 'chest', width: 110,
    render: (row) => {
      const color = getProgressColor(row.chest, row.chestTarget);
      return h('span', { style: color ? `color:${color};font-weight:600` : '' }, formatProgressNum(row.chest));
    },
  },
  {
    title: '金砖进度', key: 'gold', width: 110,
    render: (row) => {
      const color = getProgressColor(row.gold, row.goldTarget);
      return h('span', { style: color ? `color:${color};font-weight:600` : '' }, formatProgressNum(row.gold));
    },
  },
  {
    title: '鱼竿进度', key: 'fish', width: 110,
    render: (row) => {
      const color = getProgressColor(row.fish, row.fishTarget);
      return h('span', { style: color ? `color:${color};font-weight:600` : '' }, formatProgressNum(row.fish));
    },
  },
  {
    title: '盐罐进度', key: 'torch', width: 100,
    render: (row) => {
      const color = getProgressColor(row.torch, row.torchTarget);
      return h('span', { style: color ? `color:${color};font-weight:600` : '' }, String(row.torch || 0));
    },
  },
  {
    title: '消耗道具', key: 'ordinaryItem', width: 90,
    render: (row) => h('span', { style: 'color:#722ed1;font-weight:600' }, String(row.ordinaryItem || 0)),
  },
  {
    title: '黄金大枣', key: 'goldItem', width: 90,
    render: (row) => h('span', { style: 'color:#fa8c16;font-weight:600' }, String(row.goldItem || 0)),
  },
];

const filteredMemberProgressList = computed(() => {
  const kw = memberFilterKeyword.value.trim().toLowerCase();
  if (!kw) return memberProgressList.value;
  return memberProgressList.value.filter(m => m.name.toLowerCase().includes(kw));
});

const scanMemberProgress = async (token) => {
  const name = token.name || token.server || token.id.slice(0, 8);
  const tokenId = token.id;

  // 确保连接
  const connected = await ensureScanConnection(tokenId, token);
  if (!connected) {
    return { id: tokenId, name, error: true, recruit: 0, chest: 0, gold: 0, fish: 0, torch: 0, ordinaryItem: 0, goldItem: 0 };
  }
  await delay(300);

  // 直接使用返回值，避免从共享gameData读取导致并发数据错乱
  let actBody = null;
  let roleBody = null;
  try {
    actBody = await tokenStore.sendMessageWithPromise(tokenId, 'activity_get', {}, 8000);
  } catch { /* 无活动数据 */ }
  try {
    roleBody = await tokenStore.sendMessageWithPromise(tokenId, 'role_getroleinfo', {}, 8000);
  } catch { /* 无角色数据 */ }

  const actData = actBody?.activity?.commonActivityInfo || actBody?.commonActivityInfo || actBody || {};
  const progList = manager.calculateProgressList(actData);

  const recruitProg = progList.find(p => p.id === 1);
  const chestProg = progList.find(p => p.id === 2);
  const fishProg = progList.find(p => p.id === 3);
  const torchProg = progList.find(p => p.id === 4);
  const goldProg = progList.find(p => p.id === 5);

  const items = roleBody?.role?.items || {};
  const ordinaryItem = manager.getItemCount(items, 5279); // 消耗活动道具（item_openpack调用）
  const goldItem = manager.getItemCount(items, 5280);     // 黄金大枣

  return {
    id: tokenId, name, error: false,
    recruit: recruitProg?.current || 0, recruitTarget: recruitProg?.nextTarget || 0,
    chest: chestProg?.current || 0, chestTarget: chestProg?.nextTarget || 0,
    gold: goldProg?.current || 0, goldTarget: goldProg?.nextTarget || 0,
    fish: fishProg?.current || 0, fishTarget: fishProg?.nextTarget || 0,
    torch: torchProg?.current || 0, torchTarget: torchProg?.nextTarget || 0,
    ordinaryItem, goldItem,
  };
};

const queryAllMembersProgress = async () => {
  const tokens = allTokens.value;
  if (tokens.length === 0) { message.warning('无Token可查询'); return; }

  isQueryingMembers.value = true;
  memberProgressList.value = [];
  saveLS(LS_MEMBER_PROGRESS_KEY, []);
  queryProgress.value = { current: 0, total: tokens.length };

  const savedTokenId = tokenStore.selectedToken?.id;

  // 并发池
  const results = new Array(tokens.length);
  let nextIdx = 0;
  const worker = async () => {
    while (nextIdx < tokens.length) {
      const idx = nextIdx++;
      results[idx] = await scanMemberProgress(tokens[idx]);
      queryProgress.value.current = idx + 1;
    }
  };
  const workers = Array.from(
    { length: Math.min(SCAN_CONCURRENCY, tokens.length) },
    () => worker()
  );
  await Promise.all(workers);

  memberProgressList.value = results.filter(Boolean);
  saveLS(LS_MEMBER_PROGRESS_KEY, memberProgressList.value);
  message.success(`查询完成，共 ${memberProgressList.value.length} 个成员`);

  if (savedTokenId) tokenStore.selectToken(savedTokenId);
  isQueryingMembers.value = false;
};
</script>

<style scoped lang="scss">
.consume-activity-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  border: 1px solid var(--border-light);
  font-size: 12px;
}

/* ---- Header ---- */
.ca-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ca-header-left {
  display: flex; align-items: center; gap: 6px;
  .ca-icon { font-size: 1rem; }
  .ca-title { font-weight: 700; font-size: 13px; color: var(--text-primary); }
}
.ca-header-right {
  display: flex; align-items: center; gap: 8px;
}
.ca-delay {
  display: flex; align-items: center; gap: 4px; color: var(--text-secondary); font-size: 11px;
}

/* ---- Section Title ---- */
.ca-section-title {
  font-weight: 600; font-size: 12px; color: var(--text-primary);
  margin-bottom: 6px;
  display: flex; align-items: center; gap: 5px;
}
.ca-empty { color: var(--text-tertiary); text-align: center; padding: 10px 0; font-size: 11px; }
.ca-empty-sm { color: var(--text-tertiary); text-align: center; padding: 4px 0; font-size: 10px; }

/* ---- Progress Grid (compact) ---- */
.ca-progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}
.ca-progress-cell {
  background: var(--bg-tertiary);
  border-radius: 5px;
  padding: 5px 8px;
}
.cell-top {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 2px;
  .cell-name { font-weight: 600; color: var(--text-primary); font-size: 11px; }
  .cell-nums { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary);
    b { color: var(--primary-color); &.done { color: #52c41a; } }
    .cell-sep { margin: 0 1px; color: var(--text-tertiary); }
  }
}

/* ---- Main 2-column layout ---- */
.ca-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}
.ca-main-left, .ca-main-right { min-width: 0; }

/* ---- Resource Table ---- */
.ca-table { width: 100%; }
.ca-table-row {
  display: grid;
  grid-template-columns: 58px 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px dashed var(--border-light);
  &:last-child { border-bottom: none; }

  .col-type { font-weight: 600; color: var(--text-primary); font-size: 11px; white-space: nowrap; }
  .col-stock {
    display: flex; flex-wrap: wrap; gap: 3px; align-items: center;
  }
  .col-ctrl {
    display: flex; align-items: center; gap: 3px; flex-wrap: wrap; justify-content: flex-end;
  }
}
.stock-item {
  font-size: 10px; color: var(--text-secondary);
  padding: 1px 5px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  white-space: nowrap;
  b { margin-left: 2px; color: var(--text-primary); font-weight: 600; }
}

/* 积分内嵌 */
.ca-points-inline {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding-top: 8px; margin-top: 6px;
  border-top: 1px dashed var(--border-light);
  .pts-label { font-weight: 600; font-size: 11px; color: var(--text-primary); }
  .pts-chip {
    font-size: 10px; color: var(--text-secondary);
    background: var(--bg-tertiary); border-radius: 3px; padding: 1px 6px;
    b { color: var(--primary-color); font-weight: 600; }
  }
  .pts-next { font-size: 10px; color: var(--text-tertiary); margin-left: auto; }
}

/* ---- Scan compact ---- */
.ca-scan-compact {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}
.ca-scan-head {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.ca-scan-targets {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  .target-item {
    display: inline-flex; align-items: center; gap: 2px; font-size: 11px;
  }
}
.ca-scan-list {
  display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto;
  .scan-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 12px; font-size: 12px;
    border: 1px solid transparent;
    &.ok { background: rgba(82,196,26,.08); border-color: #52c41a; color: #52c41a; }
    .scan-chip-name { font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
}

/* ---- Auto complete compact ---- */
.ca-auto-compact {
  /* no extra padding */
}
.ca-member-bar {
  display: flex; align-items: center; gap: 6px; margin-bottom: 5px;
  .member-count { font-size: 12px; color: var(--primary-color); font-weight: 600; }
  .member-excluded { font-size: 11px; color: #52c41a; }
}
.ca-member-list {
  display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; max-height: 90px; overflow-y: auto;
  .member-chip {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 3px 10px; border-radius: 12px; cursor: pointer;
    background: var(--bg-tertiary); border: 1px solid transparent;
    font-size: 12px; color: var(--text-secondary); transition: all .15s;
    input { display: none; }
    &.active { border-color: var(--primary-color); background: rgba(var(--primary-color-rgb, 24,144,255),.08); color: var(--primary-color); font-weight: 600; }
    .chip-name { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
}
.ca-auto-step {
  background: var(--bg-tertiary);
  border-radius: 5px;
  padding: 4px 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 6px;
}
.ca-auto-plan {
  background: var(--bg-tertiary);
  border-radius: 5px;
  padding: 4px 6px;
  margin-bottom: 6px;
}
.plan-line {
  font-size: 10px; color: var(--text-secondary); padding: 1px 0;
  &::before { content: '• '; color: var(--primary-color); }
}
.ca-auto-row {
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
  .fish-target-label { font-size: 11px; }
  .fish-current { font-size: 10px; color: var(--primary-color); font-weight: 600; }
}

/* ---- Log ---- */
.ca-section-log { border-bottom: none !important; margin-bottom: 0; }
.ca-log {
  max-height: 90px;
  overflow-y: auto;
  font-size: 10px;
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  border-radius: 5px;
  padding: 3px 6px;
}
.ca-log-line {
  display: flex; gap: 5px; padding: 1px 0;
  .log-t { color: var(--text-tertiary); min-width: 52px; flex-shrink: 0; }
  .log-m { color: var(--text-secondary); }
  &.success .log-m { color: #52c41a; }
  &.error .log-m { color: #ef4444; }
  &.warning .log-m { color: #f59e0b; }
}
.gold-cost {
  font-size: 10px;
  color: #10b981;
  white-space: nowrap;
  &.over-budget { color: #ef4444; font-weight: 600; }
  b { font-size: 11px; }
}

/* ---- Responsive: narrow screen fallback ---- */
@media (max-width: 600px) {
  .ca-main { grid-template-columns: 1fr; gap: 10px; }
  .ca-progress-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
