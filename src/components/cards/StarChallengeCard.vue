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

<style scoped lang="scss">
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
</style>
