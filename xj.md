# 十殿星级挑战 - 完整实现代码

## 目录

1. [路由与入口](#1-路由与入口)
2. [入口 UI（GameStatus.vue）](#2-入口-uigamestatusvue)
3. [核心组件（StarChallengeCard.vue）](#3-核心组件starchallengecardvue)
4. [WebSocket 指令注册（xyzwWebSocket.js）](#4-websocket-指令注册xyzwwebsocketjs)
5. [指令构造（gameCommands.js）](#5-指令构造gamecommandsjs)
6. [批量星级挑战（tasksNightmare.js）](#6-批量星级挑战tasksnightmarejs)
7. [批量十殿抽奖（tasksDungeon.js）](#7-批量十殿抽奖tasksdungeonjs)
8. [批量任务注册（constants.js）](#8-批量任务注册constantsjs)
9. [批量页面集成（BatchDailyTasks.vue）](#9-批量页面集成batchdailytasksvue)
10. [WebSocket 指令汇总](#10-websocket-指令汇总)

---

## 1. 路由与入口

> 星级挑战没有独立路由页面，以 Modal 弹窗形式嵌入游戏功能页面 `GameStatus.vue`。
> 路由路径：`/game-features`（游戏功能页面）

---

## 2. 入口 UI（GameStatus.vue）

> 文件路径：`components/GameStatus.vue`

### 2.1 活动模块卡片触发器（template）

```html
<!-- 十殿星级挑战 -->
<div v-show="activeSection === 'activity'" class="star-challenge-trigger">
  <MyCard class="star-challenge-entry" statusClass="energy">
    <template #icon>
      <img src="/icons/ta.png" alt="星级挑战" />
    </template>
    <template #title>
      <h3>十殿星级挑战</h3>
      <p>一键挑战、罗盘抽奖、领取星章</p>
    </template>
    <template #badge>
      <span>活动</span>
    </template>
    <template #default>
      <p class="description" style="color: #ff0033;">十殿阎罗星级挑战，请先在游戏内设置关卡预设阵容。支持一键挑战、转盘抽奖和星级奖励领取。部分功能建设中</p>
    </template>
    <template #action>
      <button class="action-button" @click="showStarChallengeModal = true">
        打开星级挑战
      </button>
    </template>
  </MyCard>
</div>
```

### 2.2 Modal 弹窗

```html
<!-- 星级挑战 Modal -->
<n-modal
  v-model:show="showStarChallengeModal"
  preset="card"
  title="十殿星级挑战"
  style="width: 90%; max-width: 720px"
  :bordered="true"
  :segmented="{ content: true, footer: true }"
  :closable="true"
  :mask-closable="true"
>
  <StarChallengeCard />
</n-modal>
```

### 2.3 导入与响应式变量

```js
import StarChallengeCard from "./cards/StarChallengeCard.vue";

const showStarChallengeModal = ref(false);
```

---

## 3. 核心组件（StarChallengeCard.vue）

> 文件路径：`components/cards/StarChallengeCard.vue`（1886行）

### 3.1 完整源码

```vue
<template>
  <MyCard class="star-challenge" :statusClass="statusClass">
    <template #icon>
      <img src="/icons/ta.png" alt="星级挑战" />
    </template>
    <template #title>
      <h3>星级挑战</h3>
      <div class="title-actions">
        <a-button type="primary" size="small" :disabled="state.isRunning" @click="startChallenge">一键挑战</a-button>
        <a-button type="primary" size="small" :disabled="state.isRunning" @click="drawAllTurntable">罗盘抽奖</a-button>
        <a-button type="primary" size="small" :disabled="state.isRunning" @click="claimAllStarRewards">领取星章</a-button>
      </div>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? '运行中' : '已停止' }}</span>
    </template>
    <template #default>
      <!-- 进度信息栏 -->
      <div class="progress-bar">
        <div class="progress-main">
          <span class="total-label">总星数</span>
          <span class="total-value">{{ totalStars }} / 24</span>
          <span class="merit-divider">|</span>
          <span class="total-label">功德簿</span>
          <span class="total-value merit-value">{{ meritBookStars }} / 120</span>
        </div>
        <div class="progress-tools">
          <a-button type="primary" size="small" :disabled="state.isRunning" @click="refreshInfo">
            刷新进度
          </a-button>
        </div>
        <div class="medals-line">
          <span class="medals-label">罗盘奖章</span>
          <span class="medal-item bronze">铜质奖章 x{{ hasKeyCntMap[36997] ?? '—' }}</span>
          <span class="medal-item silver">银质奖章 x{{ hasKeyCntMap[36998] ?? '—' }}</span>
          <span class="medal-item gold">金质奖章 x{{ hasKeyCntMap[36999] ?? '—' }}</span>
        </div>
      </div>

      <!-- 8关关卡网格 -->
      <div class="level-grid">
        <div
          v-for="lv in 8"
          :key="lv"
          class="lv-card"
          :class="{
            'completed': getLevelStars(lv) >= 3,
            'partial': getLevelStars(lv) > 0 && getLevelStars(lv) < 3,
            'empty': getLevelStars(lv) === 0,
            'max-fight': getLevelFightCnt(lv) >= 5,
            'locked': !isPrevLevelUnlocked(lv),
          }"
        >
          <div class="lv-head">
            <span class="lv-title">关卡 {{ lv }}</span>
            <n-checkbox
              :checked="selectedLevels.has(lv)"
              :disabled="getLevelFightCnt(lv) >= 5 || !isPrevLevelUnlocked(lv)"
              @update:checked="(val) => toggleLevel(lv, val)"
            />
          </div>
          <div class="lv-stars">
            <span
              v-for="s in 3"
              :key="s"
              class="star-icon"
              :class="{ 'lit': s <= getLevelStars(lv) }"
            >★</span>
          </div>
          <div class="lv-fight-info">
            <span class="fight-cnt">{{ getLevelFightCnt(lv) }}/5次</span>
            <span v-if="getLevelFightCnt(lv) >= 5" class="max-badge">已满</span>
            <span v-if="isLevelRewardClaimed(lv)" class="claimed-badge">已领奖</span>
          </div>
          <div class="lv-actions">
            <n-select
              :value="levelTeamMap[lv] ?? 'preset'"
              :options="teamOptions"
              size="tiny"
              :style="{ width: '100%', fontSize: '11px' }"
              @focus="loadMainLineTeamSlots"
              @update:value="(val) => levelTeamMap[lv] = val"
            />
            <a-button
              type="primary"
              size="small"
              block
              :disabled="state.isRunning || getLevelFightCnt(lv) >= 5 || !isPrevLevelUnlocked(lv)"
              @click="challengeSingleLevel(lv)"
            >挑战</a-button>
          </div>
        </div>
      </div>

      <!-- 配置与操作 -->
      <div class="config-block">
        <div v-if="showBattleTeamTestPanel" class="bt-test-panel">
          <div class="bt-test-title">BattleTeam 数据结构测试</div>
          <div class="bt-test-desc">
            选择不同的 battleTeam 构造方案，通过"仅执行布阵"或"完整挑战"来验证哪种格式服务端接受。
          </div>
          <div class="bt-test-select">
            <span class="bt-label">方案：</span>
            <n-select
              v-model:value="battleTeamScheme"
              :options="battleTeamSchemeOptions"
              size="small"
              style="flex: 1"
            />
          </div>
          <div class="bt-test-actions">
            <a-button type="primary" size="small" :disabled="state.isRunning" @click="testFormationOnly">仅执行布阵（不发 startboss）</a-button>
            <a-button type="primary" size="small" :disabled="state.isRunning" @click="testFullChallenge">完整挑战第1关</a-button>
          </div>
          <div class="bt-test-log">
            <div v-for="(log, idx) in btTestLogs" :key="idx" class="bt-log-item" :class="log.type">
              <span class="bt-log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="bt-log-msg">{{ log.message }}</span>
            </div>
            <div v-if="btTestLogs.length === 0" class="bt-log-placeholder">点击按钮开始测试</div>
          </div>
        </div>

        <div class="config-tools">
          <a-button size="small" @click="selectAllLevels" :disabled="state.isRunning">全选关卡</a-button>
          <a-button size="small" @click="clearAllLevels" :disabled="state.isRunning">清空勾选</a-button>
        </div>
        <div class="actions-row">
          <label class="global-max">
            <span>每关最大尝试</span>
            <n-input-number v-model:value="maxAttempts" :min="1" :max="5" size="small" style="width: 80px" />
          </label>
          <a-button size="small" :disabled="!state.isRunning" @click="stopRunning">停止</a-button>
        </div>
      </div>

      <!-- 运行日志 -->
      <div class="run-log">
        <div v-for="log in logs" :key="log.id" class="log-item" :class="log.type">
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-placeholder">点击按钮开始操作</div>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useTokenStore } from '@/stores/tokenStore';
import { useMessage } from 'naive-ui';
import MyCard from '../Common/MyCard.vue';

const tokenStore = useTokenStore();
const message = useMessage();

// ==================== 响应式数据 ====================

const nmextInfo = ref(null);
const levelStarsMap = ref({});
const starFightCntMap = ref({});
const starRewardsClaimedMap = ref({});
const hasKeyCntMap = ref({});
const meritBookStars = ref(0);

// ==================== localStorage 同步 ====================
const STAR_CHALLENGE_STORAGE_KEY = 'batch_star_challenge_data';

const getWeekStartMs = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

const saveStarChallengeToStorage = (tokenId) => {
  try {
    const raw = localStorage.getItem(STAR_CHALLENGE_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[tokenId] = {
      totalStars: totalStars.value,
      meritBookStars: meritBookStars.value,
      weekStart: getWeekStartMs(),
    };
    localStorage.setItem(STAR_CHALLENGE_STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
};

const loadStarChallengeFromStorage = (tokenId) => {
  try {
    const raw = localStorage.getItem(STAR_CHALLENGE_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const stored = data[tokenId];
    if (!stored) return;
    const currentWeekStart = getWeekStartMs();
    if ((stored.weekStart || 0) === currentWeekStart) {
      if (stored.meritBookStars > 0 && meritBookStars.value === 0) {
        meritBookStars.value = stored.meritBookStars;
      }
    }
  } catch { /* ignore */ }
};

/** 物品ID → 名称映射 */
const ITEM_NAMES = {
  36997: '铜质星章',
  36998: '银质星章',
  36999: '金质星章',
};

/** 罗盘抽奖奖品ID → 名称映射 */
const REWARD_ITEM_NAMES = {
  1022: '白玉',
  1023: '彩玉',
  1033: '灵贝',
  10003: '红玉',
  10002: '蓝玉',
  10101: '四圣碎片',
  1020: '皮肤币',
};

const KEY_ORDER = [36997, 36998, 36999];
const selectedLevels = ref(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
const maxAttempts = ref(5);
const levelTeamMap = reactive({});
const mainLineTeamSlotCount = ref(0);

const teamOptions = computed(() => {
  const opts = [{ label: '预设阵容', value: 'preset' }];
  for (let i = 1; i <= mainLineTeamSlotCount.value; i++) {
    opts.push({ label: `阵容槽 ${i}`, value: `mainline_${i}` });
  }
  return opts;
});

/**
 * battleTeam 数据结构方案
 * A - full（完整透传）  B - flat（扁平映射，已确认可用）
 * C - minimal（仅关键字段）  D - empty（空对象）  E - numericKey（数字key完整透传）
 */
const battleTeamSchemeOptions = [
  { label: 'A: 完整透传(推荐)', value: 'full' },
  { label: 'B: 扁平 {pos: heroId}', value: 'flat' },
  { label: 'C: 仅关键字段 {heroId,level}', value: 'minimal' },
  { label: 'D: 空对象 {}', value: 'empty' },
  { label: 'E: 数字key完整透传', value: 'numericKey' },
];

const battleTeamScheme = ref('flat');
const showBattleTeamTestPanel = ref(false);
const btTestLogs = ref([]);
const logs = ref([]);
const state = reactive({ isRunning: false, stopRequested: false });

// ==================== 计算属性 ====================
const totalStars = computed(() => {
  return Object.values(levelStarsMap.value).reduce((sum, v) => sum + (v || 0), 0);
});

const statusClass = computed(() => {
  if (state.isRunning) return 'active';
  if (totalStars.value >= 24) return 'completed';
  return 'energy';
});

// ==================== 工具方法 ====================
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const formatTime = (ts) => new Date(ts).toLocaleTimeString('zh-CN');

const addLog = (msg, type = 'info') => {
  logs.value.push({ id: Date.now() + Math.random(), timestamp: Date.now(), type, message: msg });
  if (logs.value.length > 500) logs.value.splice(0, logs.value.length - 500);
};

const getLevelStars = (level) => levelStarsMap.value[level] || 0;
const isPrevLevelUnlocked = (level) => level <= 1 ? true : getLevelStars(level - 1) >= 1;
const getLevelFightCnt = (level) => starFightCntMap.value[level] || 0;
const isLevelRewardClaimed = (level) => !!starRewardsClaimedMap.value[level];

const toggleLevel = (level, checked) => {
  if (checked) selectedLevels.value.add(level);
  else selectedLevels.value.delete(level);
  selectedLevels.value = new Set(selectedLevels.value);
};

const selectAllLevels = () => { selectedLevels.value = new Set([1, 2, 3, 4, 5, 6, 7, 8]); };
const clearAllLevels = () => { selectedLevels.value = new Set(); };

const getTokenId = () => {
  const token = tokenStore.selectedToken;
  if (!token) { message.warning('请先选择Token'); return null; }
  const tokenId = token.id;
  if (tokenStore.getWebSocketStatus(tokenId) !== 'connected') {
    message.error('WebSocket未连接，无法执行'); return null;
  }
  return tokenId;
};

const loadMainLineTeamSlots = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  if (mainLineTeamSlotCount.value > 0) return;
  try {
    const res = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 5000);
    const outerInfo = res?.presetTeamInfo || res?.body?.presetTeamInfo || res;
    const slotMap = outerInfo?.presetTeamInfo || {};
    const slotKeys = Object.keys(slotMap).filter(k => /^\d+$/.test(k));
    mainLineTeamSlotCount.value = slotKeys.length;
  } catch (err) { console.warn('获取主线阵容槽失败:', err); }
};

// ==================== API 调用 ====================

/** 刷新星级挑战进度 (nmext_getinfo) */
const refreshInfo = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  try {
    const res = await tokenStore.sendMessageWithPromise(tokenId, 'nmext_getinfo', {}, 5000);
    if (res) {
      const data = res.roleNMExt || res.body?.roleNMExt || res;
      nmextInfo.value = data;
      const bossCompleteMap = data.starBossCompleteMap || (res.body?.roleNMExt?.starBossCompleteMap);
      if (bossCompleteMap) {
        const starsMap = {};
        for (const [lv, stars] of Object.entries(bossCompleteMap)) {
          starsMap[lv] = Object.values(stars).filter(Boolean).length;
        }
        levelStarsMap.value = starsMap;
      }
      const fightCntMap = data.starFightCntMap || (res.body?.roleNMExt?.starFightCntMap);
      if (fightCntMap) starFightCntMap.value = { ...fightCntMap };
      const rewardsClaimedMap = data.starRewardsClaimedMap || (res.body?.roleNMExt?.starRewardsClaimedMap);
      if (rewardsClaimedMap) starRewardsClaimedMap.value = { ...rewardsClaimedMap };
      const keyCntMap = data.hasKeyCntMap || (res.body?.roleNMExt?.hasKeyCntMap);
      if (keyCntMap) hasKeyCntMap.value = { ...keyCntMap };
      addLog(`进度已刷新：总星数 ${totalStars.value}/24`, 'success');
    }
  } catch (e) { addLog(`刷新进度失败: ${e.message}`, 'error'); }
  await refreshMeritBook(tokenId);
  saveStarChallengeToStorage(tokenId);
};

/** 刷新功德簿数据 */
const refreshMeritBook = async (tokenId) => {
  if (!tokenId) return;
  try {
    const roleInfo = tokenStore.gameData.roleInfo;
    const roleID = roleInfo?.role?.roleId;
    if (!roleID) { addLog('功德簿查询失败：未获取到角色ID', 'warning'); return; }
    const roleTeamRes = await tokenStore.sendMessageWithPromise(tokenId, 'matchteam_getroleteaminfo', { roleID }, 5000);
    if (!roleTeamRes) { addLog('功德簿查询失败：未获取到队伍信息', 'warning'); return; }
    const gDMTData = roleTeamRes.roleMTData?.gDMTData || {};
    const teamKeys = Object.keys(gDMTData);
    if (teamKeys.length === 0) { meritBookStars.value = 0; return; }
    const teamId = gDMTData[teamKeys[0]]?.teamId;
    if (!teamId) { meritBookStars.value = 0; return; }
    const teamInfoRes = await tokenStore.sendMessageWithPromise(tokenId, 'matchteam_getteaminfo', { teamId }, 5000);
    if (!teamInfoRes) { addLog('功德簿查询失败', 'warning'); return; }
    const fightRoleBase = teamInfoRes.teamInfo?.fightRoleBase || [];
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    const weekSuffix = String(monday.getFullYear()).slice(2) +
      String(monday.getMonth() + 1).padStart(2, '0') +
      String(monday.getDate()).padStart(2, '0');
    const targetKey = `nmExtStarCnt_${weekSuffix}`;
    let totalStars = 0;
    for (const member of fightRoleBase) {
      const extParam = member.extParam || {};
      totalStars += Number(extParam[targetKey]) || 0;
    }
    meritBookStars.value = totalStars;
  } catch (e) { console.error('[StarChallenge] 功德簿查询异常:', e); }
};

/** 提取英雄信息 */
const extractHeroesFromTeamInfo = (teamInfo) => {
  const heroes = [];
  if (!teamInfo || typeof teamInfo !== 'object') return heroes;
  for (const [pos, hero] of Object.entries(teamInfo)) {
    const heroId = hero?.heroId ?? hero?.id;
    if (heroId) heroes.push({ pos, heroId, raw: { ...hero } });
  }
  return heroes;
};

/** 根据方案构造 battleTeam */
const buildBattleTeamByScheme = (teamInfo, scheme = 'flat') => {
  const heroes = extractHeroesFromTeamInfo(teamInfo);
  if (heroes.length === 0 || scheme === 'empty') return {};
  const battleTeam = {};
  switch (scheme) {
    case 'full':
      for (const { pos, raw } of heroes) battleTeam[pos] = { ...raw };
      break;
    case 'flat':
      for (const { pos, heroId } of heroes) battleTeam[pos] = heroId;
      break;
    case 'minimal':
      for (const { pos, raw } of heroes) battleTeam[pos] = { heroId: raw.heroId, level: raw.level };
      break;
    case 'numericKey':
      for (const { pos, raw } of heroes) battleTeam[Number(pos)] = { ...raw };
      break;
    default:
      for (const { pos, raw } of heroes) battleTeam[pos] = { ...raw };
  }
  return battleTeam;
};

/** 从 typegetinfo 响应中提取阵容构造 battleTeam（含 gameData 兜底） */
const buildBattleTeam = (typeRes, typ, tokenId, scheme = 'flat') => {
  if (typeRes) {
    const bodyObj = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
    const typeData = bodyObj[String(typ)] || bodyObj[typ];
    const teamInfo = typeData?.teamInfo;
    if (teamInfo && Object.keys(teamInfo).length > 0) {
      const battleTeam = buildBattleTeamByScheme(teamInfo, scheme);
      if (Object.keys(battleTeam).length > 0) {
        return { battleTeam, hasRealTeam: true, hasNoTeam: false, teamInfo };
      }
    }
  }
  // 兜底：从 gameData.presetTeam 读取
  const gameData = tokenStore.gameData;
  const presetTeam = gameData?.presetTeam;
  if (presetTeam) {
    const teams = presetTeam.presetTeamInfo?.teams || presetTeam.teams || presetTeam;
    let teamInfo = null;
    if (teams && typeof teams === 'object') {
      const firstTeamKey = Object.keys(teams)[0];
      teamInfo = teams[firstTeamKey]?.teamInfo || (firstTeamKey === '0' ? null : teams[firstTeamKey]);
    }
    if (!teamInfo) {
      const hasHeroId = Object.values(presetTeam).some(v => v?.heroId);
      if (hasHeroId) teamInfo = presetTeam;
    }
    if (teamInfo && typeof teamInfo === 'object') {
      const battleTeam = buildBattleTeamByScheme(teamInfo, scheme);
      if (Object.keys(battleTeam).length > 0) {
        return { battleTeam, hasRealTeam: false, hasNoTeam: false, teamInfo };
      }
    }
  }
  return { battleTeam: {}, hasRealTeam: false, hasNoTeam: true, teamInfo: null };
};

/** 发送指令 */
const sendCmd = async (tokenId, cmd, params, timeout = 5000, options = {}) => {
  const { silent = false, suppressAllError = false } = options;
  const res = await tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout).catch((e) => {
    const msg = e.message || '';
    if (!suppressAllError && !silent) addLog(`<<< ${cmd} 失败: ${msg}`, 'error');
    return { __error: msg };
  });
  return res;
};

/** 顺序发送同一条指令 N 次 */
const sendCmdRepeat = async (tokenId, cmd, params, times, delayMs = 300, timeout = 5000, options = {}) => {
  const results = [];
  for (let i = 0; i < times; i++) {
    const res = await sendCmd(tokenId, cmd, params, timeout, options);
    results.push(res);
    if (i < times - 1) await sleep(delayMs);
  }
  return results;
};

const CMD_DELAY = 500;

/** 单关挑战 */
const challengeSingleLevel = async (lv) => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  if (getLevelFightCnt(lv) >= 5) { message.warning(`关卡 ${lv} 已达最大挑战次数`); return; }
  if (!isPrevLevelUnlocked(lv)) { message.warning(`请先在关卡 ${lv - 1} 获得至少1星`); return; }
  const teamMode = levelTeamMap[lv] ?? 'preset';
  const modeLabel = teamMode === 'preset' ? '预设阵容' : `阵容槽 ${teamMode.replace('mainline_', '')}`;
  state.isRunning = true;
  addLog(`== 关卡 ${lv} 挑战开始（${modeLabel}） ==`, 'info');
  try {
    let result;
    if (teamMode === 'preset') {
      result = await challengeSingleLevelInternal(tokenId, lv, 'flat');
      if (result && result.__noTeam) {
        addLog(`== 关卡 ${lv} 挑战结束，请先在游戏内设置预设阵容 ==`, 'error');
        return;
      }
    } else {
      const targetSlot = parseInt(teamMode.replace('mainline_', ''));
      result = await challengeSingleLevelMainLine(tokenId, lv, targetSlot);
    }
    logChallengeResult(lv, result);
    await sleep(CMD_DELAY);
    await refreshInfo();
  } catch (err) {
    addLog(`== 关卡 ${lv} 挑战失败: ${err.message} ==`, 'error');
  } finally { state.isRunning = false; }
};

/**
 * 一键挑战
 * 从第1关开始顺序执行，次数已满/已3星跳过，预设阵容挑战
 * 失败/0星/无阵容/异常 → 终止
 */
const startChallenge = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  state.isRunning = true;
  state.stopRequested = false;
  addLog('开始 十殿星级挑战，一键挑战', 'info');
  message.info('一键挑战开始');
  try {
    const roleInfo = tokenStore.gameData.roleInfo;
    const roleId = roleInfo?.role?.roleId;
    const enterPromises = [
      tokenStore.sendMessageWithPromise(tokenId, 'nmext_getinfo', {}, 5000).catch(() => {}),
    ];
    if (roleId) {
      enterPromises.push(
        tokenStore.sendMessageWithPromise(tokenId, 'nightmare_getroleinfo', { roleId }, 5000).catch(() => {}),
        tokenStore.sendMessageWithPromise(tokenId, 'matchteam_getroleteaminfo', { roleID: roleId }, 5000).catch(() => {}),
      );
    }
    await Promise.all(enterPromises);
    await sleep(CMD_DELAY);
    for (let level = 1; level <= 8; level++) {
      if (state.stopRequested) { addLog('用户停止了挑战', 'warning'); break; }
      if (getLevelFightCnt(level) >= 5) { addLog(`关卡 ${level} 次数已满，跳过`, 'info'); continue; }
      if (getLevelStars(level) >= 3) { addLog(`关卡 ${level} 已达3星，跳过`, 'info'); continue; }
      addLog(`== 关卡 ${level} 挑战开始（预设阵容） ==`, 'info');
      let result = null;
      try {
        result = await challengeSingleLevelInternal(tokenId, level, 'flat');
      } catch (err) {
        addLog(`第${level}关挑战失败，请游戏内检查阵容后重试。`, 'error');
        break;
      }
      await refreshInfo();
      await sleep(CMD_DELAY);
      if (result && result.__noTeam) {
        addLog(`第${level}关挑战失败，请游戏内检查阵容后重试。`, 'error');
        break;
      }
      const body = result?.body || result || {};
      const res = body.result || body;
      const isWin = res.isWin ?? res.iswin ?? res.win;
      if (!isWin) {
        logChallengeResult(level, result);
        addLog(`第${level}关挑战失败，请游戏内检查阵容后重试。`, 'error');
        break;
      }
      const completeMap = res.starBossCompleteMap || body.starBossCompleteMap
        || result?.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
      const lvData = completeMap ? (completeMap[String(level)] || completeMap[level]) : null;
      const starCount = lvData
        ? (() => {
            const trueKeys = Object.entries(lvData)
              .filter(([, v]) => v === true).map(([k]) => parseInt(k, 10)).filter(k => !isNaN(k));
            return trueKeys.length > 0 ? Math.max(...trueKeys) + 1 : 0;
          })()
        : 0;
      logChallengeResult(level, result);
      if (starCount < 1) {
        addLog(`第${level}关挑战失败，请游戏内检查阵容后重试。`, 'error');
        break;
      }
      if (level === 8) {
        addLog('星级挑战，一键挑战完成。', 'success');
        message.success('一键挑战完成');
      }
    }
  } catch (e) {
    addLog(`一键挑战异常: ${e.message}`, 'error');
    message.error('挑战过程异常');
  } finally { state.isRunning = false; }
};

/**
 * 内部单次挑战执行（预设阵容模式）
 * 步骤: typegetinfo×2 → calcpower×2 → typesetteam×2 → calcpower×4 → startboss×2
 */
const challengeSingleLevelInternal = async (tokenId, lv, scheme = 'flat') => {
  const typ = 100 + lv;
  const silent = { silent: true };
  // 步骤 1: typegetinfo ×2
  const typeResArr = await sendCmdRepeat(tokenId, 'presetteam_typegetinfo', { types: [typ] }, 2, CMD_DELAY, 5000, silent);
  const typeRes = typeResArr.find(r => r && !r.__error) || null;
  await sleep(CMD_DELAY);
  let lordWeaponId = 0;
  if (typeRes) {
    const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
    const typeData = body[String(typ)] || body[typ];
    if (typeData?.weapon?.weaponId !== undefined) lordWeaponId = typeData.weapon.weaponId;
  }
  const { battleTeam, hasNoTeam } = buildBattleTeam(typeRes, typ, tokenId, scheme);
  if (hasNoTeam) return { __noTeam: true };
  // 步骤 2: calcpower ×2
  await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY, 5000, silent);
  await sleep(CMD_DELAY);
  // 步骤 3: typesetteam ×2
  const setTeamResArr = await sendCmdRepeat(tokenId, 'presetteam_typesetteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY, 5000, silent);
  await sleep(CMD_DELAY);
  let updatedBattleTeam = battleTeam;
  let updatedWeaponId = lordWeaponId;
  for (const setRes of setTeamResArr) {
    if (setRes && !setRes.__error) {
      const setBody = setRes.presetTeamMap || setRes.body?.presetTeamMap || setRes;
      const setTypeData = setBody[String(typ)] || setBody[typ];
      if (setTypeData?.teamInfo) updatedBattleTeam = buildBattleTeamByScheme(setTypeData.teamInfo, scheme);
      if (setTypeData?.weapon?.weaponId !== undefined) updatedWeaponId = setTypeData.weapon.weaponId;
    }
  }
  // 步骤 4: calcpower ×4
  await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId }, 4, CMD_DELAY, 5000, silent);
  await sleep(CMD_DELAY);
  // 步骤 5: startboss ×2
  const bossSilent = { silent: true, suppressAllError: true };
  const bossResults = await sendCmdRepeat(tokenId, 'nmext_startboss', { bossId: lv, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId, presetTeamType: typ }, 2, CMD_DELAY, 8000, bossSilent);
  return bossResults.find(r => r && !r.__error) || null;
};

/**
 * 主线阵容槽挑战（单关）
 * 步骤: getinfo×2 → (切槽)saveteam×2+getinfo×2 → calcpowerbyteam×2 → startboss×2
 */
const challengeSingleLevelMainLine = async (tokenId, lv, targetSlot) => {
  const silent = { silent: true };
  const getInfoArr = await sendCmdRepeat(tokenId, 'presetteam_getinfo', {}, 2, CMD_DELAY, 5000, silent);
  const getInfoRes = getInfoArr.find(r => r && !r.__error) || getInfoArr[0] || null;
  const outerInfo = getInfoRes?.presetTeamInfo || getInfoRes?.body?.presetTeamInfo || getInfoRes;
  const useTeamId = outerInfo?.useTeamId;
  const slotMap = outerInfo?.presetTeamInfo || {};
  let activeSlotData = null;
  if (useTeamId) activeSlotData = slotMap[String(useTeamId)] || slotMap[useTeamId];
  let lordWeaponId = 0;
  if (activeSlotData?.weapon?.weaponId !== undefined) lordWeaponId = activeSlotData.weapon.weaponId;
  let battleTeam = {};
  if (activeSlotData?.teamInfo && Object.keys(activeSlotData.teamInfo).length > 0) {
    battleTeam = buildBattleTeamByScheme(activeSlotData.teamInfo, 'flat');
  }
  await sleep(CMD_DELAY);
  if (useTeamId && useTeamId !== targetSlot) {
    await sendCmdRepeat(tokenId, 'presetteam_saveteam', { teamId: targetSlot }, 2, CMD_DELAY, 5000, silent);
    await sleep(CMD_DELAY);
    const getInfoArr2 = await sendCmdRepeat(tokenId, 'presetteam_getinfo', {}, 2, CMD_DELAY, 5000, silent);
    const getInfoRes2 = getInfoArr2.find(r => r && !r.__error) || getInfoArr2[0] || null;
    if (getInfoRes2) {
      const outerInfo2 = getInfoRes2?.presetTeamInfo || getInfoRes2?.body?.presetTeamInfo || getInfoRes2;
      const slotMap2 = outerInfo2?.presetTeamInfo || {};
      const targetSlotData = slotMap2[String(targetSlot)] || slotMap2[targetSlot];
      if (targetSlotData?.weapon?.weaponId !== undefined) lordWeaponId = targetSlotData.weapon.weaponId;
      if (targetSlotData?.teamInfo && Object.keys(targetSlotData.teamInfo).length > 0) {
        battleTeam = buildBattleTeamByScheme(targetSlotData.teamInfo, 'flat');
      }
    }
    await sleep(CMD_DELAY);
  }
  if (Object.keys(battleTeam).length === 0) return { __noTeam: true };
  await sendCmdRepeat(tokenId, 'hero_calcpowerbyteam', { battleTeam, lordWeaponId }, 2, CMD_DELAY, 5000, silent);
  await sleep(CMD_DELAY);
  const bossSilent = { silent: true, suppressAllError: true };
  const bossResults = await sendCmdRepeat(
    tokenId, 'nmext_startboss',
    { bossId: lv, battleTeam, lordWeaponId, presetTeamType: 0 },
    2, CMD_DELAY, 8000, bossSilent
  );
  return bossResults.find(r => r && !r.__error) || null;
};

/** 挑战结果日志 */
const logChallengeResult = (lv, bossRes) => {
  if (!bossRes) { addLog(`== 关卡 ${lv} 挑战无响应 ==`, 'warning'); return; }
  const body = bossRes.body || bossRes;
  const result = body.result || body;
  const isWin = result.isWin ?? result.iswin ?? result.win;
  if (!isWin) { addLog(`== 关卡 ${lv} 挑战失败 ==`, 'error'); return; }
  const completeMap = result.starBossCompleteMap || body.starBossCompleteMap
    || bossRes.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
  if (completeMap) {
    const lvData = completeMap[String(lv)] || completeMap[lv];
    if (lvData) {
      const trueKeys = Object.entries(lvData)
        .filter(([, v]) => v === true).map(([k]) => parseInt(k, 10)).filter(k => !isNaN(k));
      const starCount = trueKeys.length > 0 ? Math.max(...trueKeys) + 1 : 0;
      addLog(`== 关卡 ${lv} 挑战成功，获得${starCount}星 ==`, 'success');
      return;
    }
  }
  addLog(`== 关卡 ${lv} 挑战成功 ==`, 'success');
};

const stopRunning = () => {
  state.stopRequested = true;
  addLog('已发送停止信号...', 'warning');
};

// ==================== BattleTeam 测试面板 ====================
const addBtLog = (msg, type = 'info') => {
  btTestLogs.value.push({ id: Date.now() + Math.random(), timestamp: Date.now(), type, message: msg });
  if (btTestLogs.value.length > 200) btTestLogs.value.splice(0, btTestLogs.value.length - 200);
};

/** 仅执行布阵测试 */
const testFormationOnly = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  state.isRunning = true;
  const scheme = battleTeamScheme.value;
  const typ = 101;
  addBtLog(`===== 仅布阵测试 (方案=${scheme}) =====`, 'info');
  try {
    addBtLog(`[1] typegetinfo ×2...`, 'info');
    const typeResArr = await sendCmdRepeat(tokenId, 'presetteam_typegetinfo', { types: [typ] }, 2, CMD_DELAY);
    const typeRes = typeResArr.find(r => r) || null;
    let lordWeaponId = 0;
    if (typeRes) {
      const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
      const typeData = body[String(typ)] || body[typ];
      if (typeData?.weapon?.weaponId !== undefined) lordWeaponId = typeData.weapon.weaponId;
      addBtLog(`lordWeaponId=${lordWeaponId}`, 'info');
      const teamInfo = typeData?.teamInfo;
      if (teamInfo) {
        const { battleTeam } = buildBattleTeam(typeRes, typ, tokenId, scheme);
        addBtLog(`teamInfo slots: ${Object.keys(teamInfo).join(', ')}`, 'info');
        addBtLog(`构造 battleTeam (${scheme}): ${JSON.stringify(battleTeam).slice(0, 300)}...`, 'info');
      } else {
        addBtLog('未获取到 teamInfo，将从 gameData 兜底', 'warning');
      }
    }
    await sleep(CMD_DELAY);
    addBtLog(`[2] calcpower ×2...`, 'info');
    const { battleTeam } = buildBattleTeam(typeRes, typ, tokenId, scheme);
    const calcRes = await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
    calcRes.forEach((r, i) => {
      addBtLog(r ? `calcpower [${i+1}] 响应正常` : `calcpower [${i+1}] 无响应`, r ? 'success' : 'error');
    });
    await sleep(CMD_DELAY);
    addBtLog(`[3] typesetteam ×2...`, 'info');
    const setRes = await sendCmdRepeat(tokenId, 'presetteam_typesetteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
    setRes.forEach((r, i) => {
      addBtLog(r ? `typesetteam [${i+1}] 响应正常` : `typesetteam [${i+1}] 无响应`, r ? 'success' : 'error');
    });
    await sleep(CMD_DELAY);
    addBtLog(`[4] calcpower ×4...`, 'info');
    let updatedBattleTeam = battleTeam;
    let updatedWeaponId = lordWeaponId;
    for (const sr of setRes) {
      if (sr) {
        const setBody = sr.presetTeamMap || sr.body?.presetTeamMap || sr;
        const setTypeData = setBody[String(typ)] || setBody[typ];
        if (setTypeData?.teamInfo) updatedBattleTeam = buildBattleTeamByScheme(setTypeData.teamInfo, scheme);
        if (setTypeData?.weapon?.weaponId !== undefined) updatedWeaponId = setTypeData.weapon.weaponId;
      }
    }
    const calc4Res = await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId }, 4, CMD_DELAY);
    calc4Res.forEach((r, i) => {
      addBtLog(r ? `calcpower [${i+1}/4] 响应正常` : `calcpower [${i+1}/4] 无响应`, r ? 'success' : 'error');
    });
    addBtLog(`===== 布阵测试完成（方案=${scheme}）=====`, 'success');
  } catch (e) { addBtLog(`测试异常: ${e.message}`, 'error'); }
  finally { state.isRunning = false; }
};

const testFullChallenge = async () => {
  state.isRunning = true;
  try { await challengeSingleLevel(1, battleTeamScheme.value); }
  finally { state.isRunning = false; }
};

/** 转盘抽奖 */
const drawTurntable = async (tokenId, itemId) => {
  return await tokenStore.sendMessageWithPromise(tokenId, 'nmext_drawturntable', { itemId }, 8000);
};

/** 领取星级奖励 */
const claimStarReward = async (tokenId, level) => {
  return await tokenStore.sendMessageWithPromise(tokenId, 'nmext_claimstarreward', { level }, 8000);
};

/** 转盘抽奖 - 按钥匙数量依次消耗（铜→银→金） */
const drawAllTurntable = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  await refreshInfo();
  const keys = hasKeyCntMap.value;
  if (!keys || Object.keys(keys).length === 0) {
    message.warning('没有可用的转盘钥匙');
    addLog('转盘抽奖失败：没有钥匙', 'warning');
    return;
  }
  state.isRunning = true;
  state.stopRequested = false;
  let totalDrawn = 0;
  addLog('开始转盘抽奖...', 'info');
  message.info('开始转盘抽奖');
  try {
    for (const itemId of KEY_ORDER) {
      if (state.stopRequested) break;
      const count = hasKeyCntMap.value[itemId] || 0;
      if (count <= 0) continue;
      const typeName = ITEM_NAMES[itemId] || `ID:${itemId}`;
      for (let i = 0; i < count; i++) {
        if (state.stopRequested) break;
        try {
          const res = await drawTurntable(tokenId, itemId);
          if (res) {
            const rewards = res.body?.reward || res.reward || [];
            let rewardText = '无奖励';
            if (Array.isArray(rewards) && rewards.length > 0) {
              rewardText = rewards.map(r => {
                if (typeof r === 'object' && r.itemId != null) {
                  const name = REWARD_ITEM_NAMES[r.itemId] || `ID:${r.itemId}`;
                  return `${name} x${r.value || 0}`;
                }
                if (typeof r === 'object') return r.name || r.itemId || JSON.stringify(r);
                return r;
              }).join(', ');
            }
            addLog(`${typeName}→ ${rewardText}`, 'success');
          } else {
            addLog(`${typeName} 抽奖无响应`, 'warning');
          }
          totalDrawn++;
        } catch (err) { addLog(`${typeName} 抽奖出错: ${err.message}`, 'error'); }
        await sleep(800);
      }
    }
    addLog(`转盘抽奖完成，共抽 ${totalDrawn} 次`, 'success');
    message.success(state.stopRequested ? '抽奖已停止' : `抽奖完成，共 ${totalDrawn} 次`);
    await refreshInfo();
  } catch (e) {
    addLog(`转盘抽奖异常: ${e.message}`, 'error');
    message.error('抽奖过程异常');
  } finally { state.isRunning = false; }
};

/** 领取所有星级奖励 */
const claimAllStarRewards = async () => {
  const tokenId = getTokenId();
  if (!tokenId) return;
  await refreshInfo();
  const claimableLevels = [];
  for (let lv = 1; lv <= 8; lv++) {
    if (getLevelStars(lv) > 0) claimableLevels.push(lv);
  }
  if (claimableLevels.length === 0) { message.info('没有可领取的星级奖励'); return; }
  state.isRunning = true;
  state.stopRequested = false;
  addLog(`开始领取星级奖励，共 ${claimableLevels.length} 关`, 'info');
  try {
    for (const level of claimableLevels) {
      if (state.stopRequested) break;
      try {
        const res = await claimStarReward(tokenId, level);
        if (res) {
          const rewards = res.body?.reward || res.reward || [];
          const rewardText = Array.isArray(rewards)
            ? rewards.map(r => `★${r}`).join(' ')
            : '已领取';
          addLog(`关卡 ${level} 星奖 → ${rewardText}`, 'success');
        }
      } catch (_err) { /* 静默 */ }
      await sleep(500);
    }
    addLog('星级奖励领取完成', 'success');
    message.success(state.stopRequested ? '已停止' : '星级奖励领取完成');
    await refreshInfo();
  } catch (_e) { /* 静默 */ }
  finally { state.isRunning = false; }
};

// ==================== 生命周期 ====================
watch(
  () => tokenStore.selectedToken,
  (newVal) => { if (newVal) setTimeout(refreshInfo, 1000); },
  { immediate: true }
);

watch(
  () => tokenStore.getWebSocketStatus(tokenStore.selectedToken?.id),
  (status) => { if (status === 'connected') refreshInfo(); }
);
</script>
```

### 3.2 样式（SCSS）

```scss
.star-challenge {
  .title-actions { display: flex; gap: 6px; margin-top: 4px; }
  .progress-bar { display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-md); padding-bottom: var(--spacing-sm); border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
  .progress-main { display: flex; align-items: center; gap: var(--spacing-xs); }
  .total-label { font-size: var(--font-size-sm); color: var(--text-secondary); }
  .total-value { font-size: var(--font-size-md); font-weight: bold; color: var(--primary-color); }
  .merit-divider { margin: 0 var(--spacing-xs); color: var(--border-color); font-size: var(--font-size-md); }
  .merit-value { color: #f59e0b; }
  .progress-tools { margin-left: auto; }
  .medals-line { width: 100%; display: flex; align-items: center; gap: 12px; font-size: var(--font-size-xs); color: var(--text-tertiary); margin-top: 4px; flex-wrap: wrap; }
  .medals-label { color: var(--text-secondary); font-weight: 500; }
  .medal-item {
    padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500;
    &.bronze { background: rgba(180,130,70,0.15); color: #b48246; }
    &.silver { background: rgba(160,160,170,0.15); color: #8a8a94; }
    &.gold { background: rgba(245,190,50,0.15); color: #c49a20; }
  }
  .level-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
  .lv-card {
    background: var(--bg-secondary); border-radius: var(--border-radius-medium); padding: var(--spacing-sm); border: 1px solid transparent; transition: all var(--transition-fast);
    &.completed { background: rgba(34,197,94,0.05); border-color: var(--success-color); }
    &.partial { background: rgba(245,158,11,0.05); border-color: var(--warning-color); }
    &.empty { background: var(--bg-tertiary); opacity: 0.8; }
    &.max-fight { opacity: 0.6; }
    &.locked { opacity: 0.45; filter: grayscale(60%); cursor: not-allowed; }
  }
  .lv-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .lv-title { font-size: var(--font-size-sm); font-weight: bold; color: var(--text-primary); }
  .lv-stars { display: flex; gap: 2px; }
  .lv-fight-info { display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 11px; }
  .lv-actions {
    display: flex; flex-direction: column; gap: 4px; margin-top: 6px;
    :deep(.n-base-selection) { font-size: 11px; }
    :deep(.n-base-select-option) { font-size: 11px; }
  }
  .fight-cnt { color: var(--text-tertiary); }
  .max-badge { color: var(--error-color); font-weight: bold; }
  .claimed-badge { color: var(--success-color); font-size: 10px; }
  .star-icon {
    font-size: 16px; color: var(--bg-tertiary); transition: color var(--transition-fast);
    &.lit { color: #f59e0b; text-shadow: 0 0 4px rgba(245,158,11,0.5); }
  }
  .config-block { margin-bottom: var(--spacing-md); }
  .config-tools { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
  .actions-row { display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; }
  .global-max {
    display: flex; align-items: center; gap: var(--spacing-xs); font-size: var(--font-size-sm); color: var(--text-secondary);
    .n-input-number { width: 80px; }
  }
  .run-log {
    max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-medium);
    padding: var(--spacing-sm); background: var(--bg-tertiary); font-size: var(--font-size-xs); line-height: 1.6;
  }
  .log-item {
    display: flex; gap: var(--spacing-xs);
    &.success .log-msg { color: var(--success-color); }
    &.error .log-msg { color: var(--error-color); }
    &.warning .log-msg { color: var(--warning-color); }
  }
  .log-time { color: var(--text-tertiary); flex-shrink: 0; }
  .log-msg { color: var(--text-secondary); word-break: break-all; }
  .log-placeholder { color: var(--text-tertiary); text-align: center; padding: var(--spacing-sm); }
}
@media (max-width: 640px) {
  .star-challenge {
    .level-grid { grid-template-columns: repeat(2, 1fr); }
    .actions-row { flex-direction: column; align-items: stretch; }
    .global-max { width: 100%; justify-content: space-between; }
  }
}
```

---

## 4. WebSocket 指令注册（xyzwWebSocket.js）

> 文件路径：`utils/xyzwWebSocket.js`

### 4.1 指令注册

```js
// 十殿星级挑战相关
.register("nmext_getinfo")
.register("nmext_startboss")
.register("nmext_drawturntable")
.register("nmext_claimstarreward")
.register("presetteam_typegetinfo")
.register("presetteam_typecalcpowerbyteam")
.register("presetteam_typesetteam")
.register("hero_calcpowerbyteam")

// 梦魇相关（星级挑战抽奖共用）
.register("nightmare_claimweekreward")
.register("nightmare_claimturnrewardtimes")
.register("nightmare_clickturntable")
.register("nightmare_claimbook")
```

### 4.2 响应映射

```js
// 十殿星级挑战相关响应映射
nmext_getinforesp: "nmext_getinfo",
nmext_startbossresp: "nmext_startboss",
nmext_drawturntableresp: "nmext_drawturntable",
nmext_claimstarrewardresp: "nmext_claimstarreward",
presetteam_typegetinforesp: "presetteam_typegetinfo",
presetteam_typecalcpowerbyteamresp: "presetteam_typecalcpowerbyteam",
presetteam_typesetteamresp: "presetteam_typesetteam",
hero_calcpowerbyteamresp: "hero_calcpowerbyteam",

// 梦魇相关响应映射
nightmare_claimweekrewardresp: "nightmare_claimweekreward",
nightmare_claimturnrewardtimesresp: "nightmare_claimturnrewardtimes",
nightmare_clickturntableresp: "nightmare_clickturntable",
nightmare_claimbookresp: "nightmare_claimbook",
```

---

## 5. 指令构造（gameCommands.js）

> 文件路径：`utils/gameCommands.js`

```js
// ==================== 十殿星级挑战 ====================

/** 获取十殿星级挑战进度 (无参数) */
nmext_getinfo(ack = 0, seq = 0, params = {}) {
  return {
    ack, body: this.g_utils.bon.encode({ ...params }),
    cmd: 'nmext_getinfo', seq, time: Date.now(),
  };
}

/**
 * 开始挑战 Boss
 * 参数: { bossId: 关卡编号(1-8), presetTeamType: 阵容类型(可选) }
 */
nmext_startboss(ack = 0, seq = 0, params = {}) {
  return {
    ack, body: this.g_utils.bon.encode({ bossId: 1, presetTeamType: 1, ...params }),
    cmd: 'nmext_startboss', seq, time: Date.now(),
  };
}

/**
 * 星级转盘抽奖
 * 参数: { itemId: 钥匙类型(36997=铜, 36998=银, 36999=金) }
 */
nmext_drawturntable(ack = 0, seq = 0, params = {}) {
  return {
    ack, body: this.g_utils.bon.encode({ itemId: 1, ...params }),
    cmd: 'nmext_drawturntable', seq, time: Date.now(),
  };
}

/**
 * 领取星级奖励
 * 参数: { level: 关卡编号 }
 */
nmext_claimstarreward(ack = 0, seq = 0, params = {}) {
  return {
    ack, body: this.g_utils.bon.encode({ level: 1, ...params }),
    cmd: 'nmext_claimstarreward', seq, time: Date.now(),
  };
}
```

---

## 6. 批量星级挑战（tasksNightmare.js）

> 文件路径：`utils/batch/tasksNightmare.js`（305行）

```js
/**
 * 十殿类任务
 * 包含: batchStarChallenge
 */

export function createTasksNightmare(deps) {
  const {
    selectedTokens, tokens, tokenStatus, isRunning, shouldStop,
    ensureConnection, releaseConnectionSlot, connectionQueue, batchSettings,
    tokenStore, addLog, message, currentRunningTokenId,
    currentSettings, loadSettings,
  } = deps;

  /**
   * 批量十殿星级挑战（一键挑战）
   * 从第1关顺序执行到第8关，某关次数已满（5次）则跳过
   * 挑战成功且获得至少1星 → 继续下一关
   * 挑战失败 / 0星 / 无阵容 / 异常 → 该账号终止
   */
  const batchStarChallenge = async () => {
    if (selectedTokens.value.length === 0) return;
    isRunning.value = true;
    shouldStop.value = false;
    selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

    const CMD_DELAY = 500;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const sendCmd = async (tokenId, cmd, params, timeout = 5000) => {
      return tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout).catch((e) => {
        return { __error: e.message || '' };
      });
    };

    const sendCmdRepeat = async (tokenId, cmd, params, times, delayMs = 300, timeout = 5000) => {
      const results = [];
      for (let i = 0; i < times; i++) {
        const res = await sendCmd(tokenId, cmd, params, timeout);
        results.push(res);
        if (i < times - 1) await sleep(delayMs);
      }
      return results;
    };

    const buildBattleTeam = (typeRes, typ) => {
      if (typeRes) {
        const bodyObj = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
        const typeData = bodyObj[String(typ)] || bodyObj[typ];
        const teamInfo = typeData?.teamInfo;
        if (teamInfo && Object.keys(teamInfo).length > 0) {
          const battleTeam = {};
          for (const [slot, hero] of Object.entries(teamInfo)) {
            if (hero?.heroId) battleTeam[slot] = hero.heroId;
          }
          if (Object.keys(battleTeam).length > 0) {
            return { battleTeam, hasNoTeam: false };
          }
        }
      }
      return { battleTeam: {}, hasNoTeam: true };
    };

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始 十殿星级挑战，一键挑战: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        const nmextInfo = await tokenStore.sendMessageWithPromise(tokenId, 'nmext_getinfo', {}, 5000).catch(() => null);
        const nmextData = nmextInfo?.roleNMExt || nmextInfo?.body?.roleNMExt || nmextInfo;
        const fightCntMap = nmextData?.starFightCntMap || {};
        const completeMap = nmextData?.starBossCompleteMap || {};
        const starsMap = {};
        for (const [lv, stars] of Object.entries(completeMap)) {
          starsMap[lv] = Object.values(stars).filter(Boolean).length;
        }

        for (let level = 1; level <= 8; level++) {
          if (shouldStop.value) break;
          const usedCount = fightCntMap[String(level)] || fightCntMap[level] || 0;
          if (usedCount >= 5) continue;
          const typ = 100 + level;
          addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战开始 ==`, type: "info" });

          // 步骤 1: typegetinfo ×2
          const typeResArr = await sendCmdRepeat(tokenId, 'presetteam_typegetinfo', { types: [typ] }, 2, CMD_DELAY);
          const typeRes = typeResArr.find(r => r && !r.__error) || null;
          await sleep(CMD_DELAY);

          const { battleTeam, hasNoTeam } = buildBattleTeam(typeRes, typ);
          if (hasNoTeam) {
            addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战结束，请先在游戏内设置预设阵容 ==`, type: "error" });
            break;
          }

          let lordWeaponId = 0;
          if (typeRes) {
            const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
            const typeData = body[String(typ)] || body[typ];
            if (typeData?.weapon?.weaponId !== undefined) lordWeaponId = typeData.weapon.weaponId;
          }

          // 步骤 2: calcpower ×2
          await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
          await sleep(CMD_DELAY);

          // 步骤 3: typesetteam ×2
          const setTeamResArr = await sendCmdRepeat(tokenId, 'presetteam_typesetteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
          await sleep(CMD_DELAY);

          let updatedBattleTeam = battleTeam;
          let updatedWeaponId = lordWeaponId;
          for (const setRes of setTeamResArr) {
            if (setRes && !setRes.__error) {
              const setBody = setRes.presetTeamMap || setRes.body?.presetTeamMap || setRes;
              const setTypeData = setBody[String(typ)] || setBody[typ];
              if (setTypeData?.teamInfo) {
                const newTeam = {};
                for (const [slot, hero] of Object.entries(setTypeData.teamInfo)) {
                  if (hero?.heroId) newTeam[slot] = hero.heroId;
                }
                if (Object.keys(newTeam).length > 0) updatedBattleTeam = newTeam;
              }
              if (setTypeData?.weapon?.weaponId !== undefined) updatedWeaponId = setTypeData.weapon.weaponId;
            }
          }

          // 步骤 4: calcpower ×4
          await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId }, 4, CMD_DELAY);
          await sleep(CMD_DELAY);

          // 步骤 5: startboss ×2
          const bossResults = await sendCmdRepeat(
            tokenId, 'nmext_startboss',
            { bossId: level, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId, presetTeamType: typ },
            2, CMD_DELAY, 8000
          );
          const bossRes = bossResults.find(r => r && !r.__error) || null;
          if (!bossRes) {
            addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战无响应 ==`, type: "warning" });
            break;
          }

          const body = bossRes.body || bossRes || {};
          const result = body.result || body;
          const isWin = result.isWin ?? result.iswin ?? result.win;
          if (!isWin) {
            addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战失败 ==`, type: "error" });
            addLog({ time: new Date().toLocaleTimeString(), message: `第${level}关挑战失败，请游戏内检查阵容后重试。`, type: "error" });
            break;
          }

          const bossCompleteMap = result.starBossCompleteMap || body.starBossCompleteMap
            || bossRes.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
          let starCount = 0;
          if (bossCompleteMap) {
            const lvData = bossCompleteMap[String(level)] || bossCompleteMap[level];
            if (lvData) starCount = Object.values(lvData).filter(Boolean).length;
          }

          if (starCount > 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战成功，获得${starCount}星 ==`, type: "success" });
            starsMap[level] = Math.max(starsMap[level] || 0, starCount);
            fightCntMap[level] = usedCount + 1;
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `== 关卡 ${level} 挑战成功，获得0星 ==`, type: "warning" });
            addLog({ time: new Date().toLocaleTimeString(), message: `第${level}关挑战失败，请游戏内检查阵容后重试。`, type: "error" });
            break;
          }

          if (level === 8) {
            addLog({ time: new Date().toLocaleTimeString(), message: `星级挑战，一键挑战完成。`, type: "success" });
          }
          await sleep(CMD_DELAY);
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 十殿星级挑战失败: ${error.message}`, type: "error" });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
      }
    });

    await Promise.all(taskPromises);
    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量十殿星级挑战结束");
  };

  return { batchStarChallenge };
}
```

---

## 7. 批量十殿抽奖（tasksDungeon.js）

> 文件路径：`utils/batch/tasksDungeon.js`（抽奖部分，含奖品映射）

### 7.1 奖品映射

```js
/** 十殿罗盘抽奖奖品ID → 名称映射（与十殿星级挑战罗盘相同） */
const REWARD_ITEM_NAMES = {
  1022: "白玉",
  1023: "彩玉",
  1033: "灵贝",
  10003: "红玉",
  10002: "蓝玉",
  10101: "四圣碎片",
  1020: "皮肤币",
};
```

### 7.2 batchNightmareLottery 完整代码

```js
/**
 * 一键十殿抽奖
 * 步骤：领取铃铛 → 领取累抽次数 → 循环抽奖直到次数用尽
 */
const batchNightmareLottery = async () => {
  if (selectedTokens.value.length === 0) return;
  isRunning.value = true;
  shouldStop.value = false;
  selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    tokenStatus.value[tokenId] = "running";
    const token = tokens.value.find((t) => t.id === tokenId);
    let totalDraws = 0;
    let totalRewards = [];

    try {
      await ensureConnection(tokenId);

      // 步骤1：领取铃铛（抽奖次数）
      try {
        await tokenStore.sendMessageWithPromise(tokenId, "nightmare_claimweekreward", {}, 5000);
      } catch (e) { /* 铃铛已领取时静默忽略 */ }

      // 步骤2~4：领取累抽 → 循环抽奖 → 抽完后再领累抽，直到无新次数
      let claimTurnResp = null;
      let lastDrawResp = null;

      while (!shouldStop.value) {
        // 步骤2：领取累抽奖励次数
        claimTurnResp = null;
        try {
          claimTurnResp = await tokenStore.sendMessageWithPromise(
            tokenId, "nightmare_claimturnrewardtimes", {}, 5000
          );
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 领取累抽奖励次数失败: ${e?.message || "未知错误"}`,
            type: "warning" });
          break;
        }

        const claimLeft = claimTurnResp?.weekAward?.turntableLeftCnt;
        addLog({ time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 领取累抽次数成功，剩余抽奖次数: ${claimLeft ?? "未知"}`,
          type: "info" });

        if (!claimLeft || claimLeft <= 0) break;

        // 步骤4：循环抽奖
        while (!shouldStop.value) {
          lastDrawResp = await tokenStore.sendMessageWithPromise(
            tokenId, "nightmare_clickturntable", {}, 5000
          );
          totalDraws++;
          const leftCnt = lastDrawResp?.weekAward?.turntableLeftCnt;
          addLog({ time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 十殿抽奖 第${totalDraws}次，剩余: ${leftCnt ?? "未知"}`,
            type: "info" });
          if (leftCnt === undefined || leftCnt <= 0) break;
        }
      }

      // 统计奖品
      const finalReward = lastDrawResp?.weekAward?.turntableReward;
      if (finalReward) {
        Object.values(finalReward).forEach((items) => {
          if (Array.isArray(items)) {
            items.forEach((r) => {
              const name = REWARD_ITEM_NAMES[r.itemId] || `ID:${r.itemId}`;
              const existing = totalRewards.find((x) => x.itemId === r.itemId);
              if (existing) existing.value += r.value;
              else totalRewards.push({ itemId: r.itemId, name, value: r.value });
            });
          }
        });
      }

      if (totalRewards.length > 0) {
        const rewardLog = totalRewards.map((r) => `${r.name}×${r.value}`).join("、");
        addLog({ time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 本周十殿抽奖 (共${totalDraws}次): ${rewardLog}`, type: "success" });
      } else {
        addLog({ time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 十殿抽奖完成 (共${totalDraws}次)，无奖品`, type: "info" });
      }

      tokenStatus.value[tokenId] = "completed";
    } catch (error) {
      console.error(error);
      tokenStatus.value[tokenId] = "failed";
      addLog({ time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 十殿抽奖失败: ${error.message || "未知错误"}`, type: "error" });
    }

    // 末尾领取通关奖励
    try {
      if (tokenStatus.value[tokenId] === "completed") {
        addLog({ time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 领取十殿通关奖励...`, type: "info" });
        await tokenStore.sendMessageWithPromise(tokenId, "nightmare_claimbook", {}, 5000);
        addLog({ time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 十殿通关奖励领取完成`, type: "success" });
      }
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(),
        message: `[${token.name}] 领取十殿通关奖励失败: ${e?.message || "未知错误"}`, type: "warning" });
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
      addLog({ time: new Date().toLocaleTimeString(),
        message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
        type: "info" });
    }
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("一键十殿抽奖结束");
};
```

---

## 8. 批量任务注册（constants.js）

> 文件路径：`utils/batch/constants.js`

```js
// 批量任务列表中注册十殿相关任务
{ label: "一键十殿抽奖", value: "batchNightmareLottery" },
```

> `batchStarChallenge` 通过 `createTasksNightmare` 工厂函数导出，在 `BatchDailyTasks.vue` 中直接调用。

---

## 9. 批量页面集成（BatchDailyTasks.vue）

> 文件路径：`views/BatchDailyTasks.vue`

### 9.1 十殿 Tab UI

```html
<n-tab-pane name="nightmare" tab="十殿">
    <n-space>
        <n-button size="small" type="warning"
                  @click="batchNightmareChallenge"
                  :disabled="isRunning || selectedTokens.length === 0">
            十殿阎罗挑战
        </n-button>
        <n-button size="small"
                  @click="batchStarChallenge"
                  :disabled="isRunning || selectedTokens.length === 0">
            一键十殿星级挑战
        </n-button>
        <n-button size="small"
                  @click="batchNightmareLottery"
                  :disabled="isRunning || selectedTokens.length === 0">
            一键十殿抽奖
        </n-button>
    </n-space>
</n-tab-pane>
```

### 9.2 任务引用

```js
// 从 tasksNightmare.js 工厂函数获取
const { batchStarChallenge } = createTasksNightmare(deps);

// 从 tasksDungeon.js 工厂函数获取
const { batchNightmareLottery } = createTasksDungeon(deps);

// 十殿阎罗挑战：跳转到游戏功能页面
const batchNightmareChallenge = () => {
  router.push({ name: 'GameFeatures', query: { openNightmare: '1' } });
};
```

---

## 10. WebSocket 指令汇总

| 指令 | 用途 | 参数 | 使用位置 |
|------|------|------|----------|
| `nmext_getinfo` | 获取星级挑战进度 | `{}` | StarChallengeCard / tasksNightmare |
| `nmext_startboss` | 开始挑战Boss | `{ bossId, battleTeam, lordWeaponId, presetTeamType }` | StarChallengeCard / tasksNightmare |
| `nmext_drawturntable` | 罗盘抽奖 | `{ itemId }` (36997/36998/36999) | StarChallengeCard |
| `nmext_claimstarreward` | 领取星级奖励 | `{ level }` | StarChallengeCard |
| `presetteam_typegetinfo` | 获取类型预设阵容 | `{ types: [typ] }` (101~108) | StarChallengeCard / tasksNightmare |
| `presetteam_typecalcpowerbyteam` | 计算阵容战力 | `{ typ, battleTeam, lordWeaponId }` | StarChallengeCard / tasksNightmare |
| `presetteam_typesetteam` | 设置预设阵容 | `{ typ, battleTeam, lordWeaponId }` | StarChallengeCard / tasksNightmare |
| `hero_calcpowerbyteam` | 计算英雄战力 | `{ battleTeam, lordWeaponId }` | StarChallengeCard（主线阵容模式） |
| `presetteam_getinfo` | 获取主线阵容槽 | `{}` | StarChallengeCard（主线阵容模式） |
| `presetteam_saveteam` | 切换阵容槽 | `{ teamId }` | StarChallengeCard（主线阵容模式） |
| `nightmare_claimweekreward` | 领取铃铛（抽奖次数） | `{}` | tasksDungeon（批量抽奖） |
| `nightmare_claimturnrewardtimes` | 领取累抽奖励次数 | `{}` | tasksDungeon（批量抽奖） |
| `nightmare_clickturntable` | 点击罗盘抽奖 | `{}` | tasksDungeon（批量抽奖） |
| `nightmare_claimbook` | 领取通关奖励 | `{}` | tasksDungeon（批量抽奖） |
| `matchteam_getroleteaminfo` | 获取角色队伍信息 | `{ roleID }` | StarChallengeCard（功德簿查询） |
| `matchteam_getteaminfo` | 获取队伍详情 | `{ teamId }` | StarChallengeCard（功德簿查询） |
| `nightmare_getroleinfo` | 获取角色十殿信息 | `{ roleId }` | StarChallengeCard（一键挑战进入界面） |

### 物品ID映射表

| ID | 名称 | 用途 |
|----|------|------|
| 36997 | 铜质星章 | 罗盘抽奖钥匙 |
| 36998 | 银质星章 | 罗盘抽奖钥匙 |
| 36999 | 金质星章 | 罗盘抽奖钥匙 |
| 1022 | 白玉 | 罗盘奖品 |
| 1023 | 彩玉 | 罗盘奖品 |
| 1033 | 灵贝 | 罗盘奖品 |
| 10003 | 红玉 | 罗盘奖品 |
| 10002 | 蓝玉 | 罗盘奖品 |
| 10101 | 四圣碎片 | 罗盘奖品 |
| 1020 | 皮肤币 | 罗盘奖品 |

### 关卡类型映射

| 关卡编号 | 类型编号 (typ) | 说明 |
|----------|---------------|------|
| 1 | 101 | 第1关 |
| 2 | 102 | 第2关 |
| 3 | 103 | 第3关 |
| 4 | 104 | 第4关 |
| 5 | 105 | 第5关 |
| 6 | 106 | 第6关 |
| 7 | 107 | 第7关 |
| 8 | 108 | 第8关 |

### 挑战指令执行流程

```
预设阵容模式 (presetTeamType = 100 + level):
  1. presetteam_typegetinfo ×2   → 获取预设阵容数据
  2. presetteam_typecalcpowerbyteam ×2  → 计算战力
  3. presetteam_typesetteam ×2   → 设置阵容
  4. presetteam_typecalcpowerbyteam ×4  → 再次计算战力（基于设置响应）
  5. nmext_startboss ×2          → 挑战Boss

主线阵容模式 (presetTeamType = 0):
  1. presetteam_getinfo ×2       → 获取当前阵容槽
  2. presetteam_saveteam ×2      → 切换目标槽（如需）
  3. presetteam_getinfo ×2       → 确认切换结果
  4. hero_calcpowerbyteam ×2     → 计算战力
  5. nmext_startboss ×2          → 挑战Boss
```
