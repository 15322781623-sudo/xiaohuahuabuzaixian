<template>
  <div class="nightmare-battle-container">
    <!-- 头部 -->
    <div class="battle-header">
      <div class="header-left">
        <h2 class="battle-title">十殿阎罗战斗</h2>
        <n-tag v-if="roomId" size="small" type="info">Room: {{ roomId }}</n-tag>
        <n-tag v-if="isAutoMode" size="small" type="success">一键模式</n-tag>
      </div>
      <div class="header-right">
        <span v-if="battleCountdown > 0" class="countdown">{{ battleCountdown }}s</span>
        <n-button size="small" @click="fetchRoomInfo" :loading="isFetchingInfo">刷新</n-button>
        <n-button size="small" type="error" @click="endBattle" :loading="isDismissing">结束战斗</n-button>
        <n-button size="small" @click="goBack">返回组队</n-button>
      </div>
    </div>

    <!-- 关卡信息 -->
    <div class="level-info" v-if="currentLevel > 0">
      <span class="level-label">当前关卡</span>
      <span class="level-name">第{{ currentLevel }}关 - {{ getBossName(currentLevel) }}</span>
      <span v-if="lastFighter" class="last-fighter">
        上轮: {{ lastFighterName || lastFighter }}
        <n-tag v-if="lastBattleResult?.isWin === true" size="tiny" type="success">胜利</n-tag>
        <n-tag v-else-if="lastBattleResult?.isWin === false" size="tiny" type="error">失败</n-tag>
      </span>
    </div>

    <!-- Boss区域 -->
    <div class="monsters-section">
      <div class="section-title">
        第{{ currentLevel }}关 · {{ getBossName(currentLevel) }}
        <n-tag size="small" :type="currentLevel <= 3 ? 'info' : currentLevel <= 6 ? 'warning' : 'error'">
          关卡 {{ currentLevel }}/8
        </n-tag>
      </div>
      <div class="monsters-grid">
        <div v-for="monster in monsters" :key="monster.id || monster.name"
          class="monster-card" :class="{ boss: monster.isBoss, dead: monster.curHp <= 0 }">
          <div class="monster-header">
            <span class="monster-name">
              {{ monster.name }}
              <n-tag v-if="monster.isBoss" size="tiny" type="error">BOSS</n-tag>
            </span>
            <span class="monster-hp-text">
              {{ formatHp(monster.curHp) }} / {{ formatHp(monster.maxHp) }}
            </span>
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar" :style="{ width: monster.hpPercent + '%' }"
              :class="{ low: monster.hpPercent < 30, mid: monster.hpPercent >= 30 && monster.hpPercent < 60 }"></div>
            <span class="hp-text">{{ monster.hpPercent.toFixed(0) }}%</span>
          </div>
          <div class="energy-bar-container" v-if="monster.maxEnergy > 0">
            <div class="energy-bar" :style="{ width: monster.energyPercent + '%' }"></div>
            <span class="energy-text">怒气 {{ monster.curEnergy }}/{{ monster.maxEnergy }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成员区域 -->
    <div class="members-section">
      <div class="section-title">队伍成员（{{ members.length }}人）</div>
      <div class="members-grid">
        <div v-for="(member, idx) in members" :key="member.roleId || idx" class="member-card"
          :class="{ dead: member.isAllHeroesDead, fought: hasMemberFought(member.roleId) }">
          <div class="member-head">
            <span class="member-name">
              {{ member.name || '成员' + (idx + 1) }}
              <n-tag v-if="member.isCaptain" size="tiny" type="info">队长</n-tag>
            </span>
            <div class="member-actions">
              <n-button size="tiny" type="primary"
                :disabled="battlePhase !== 'idle' || member.isAllHeroesDead || isAutoMode"
                @click="startAttack(member)">出战</n-button>
              <n-button size="tiny" type="warning"
                :disabled="battlePhase !== 'idle' || isAutoMode"
                @click="memberRecover(member)">恢复</n-button>
              <n-button size="tiny" type="error"
                :disabled="battlePhase !== 'idle' || isAutoMode"
                @click="memberFullRage(member)">满怒</n-button>
            </div>
          </div>
          <!-- 武将列表 -->
          <div class="heroes-grid">
            <div v-for="(hero, hIdx) in (member.heroes || [])" :key="hIdx" class="hero-card"
              :class="{ dead: hero.curHp <= 0 }">
              <div class="hero-name">{{ hero.name || '武将' + (hIdx + 1) }}</div>
              <div class="hp-bar-container">
                <div class="hp-bar hero-hp" :style="{ width: hero.hpPercent + '%' }"
                  :class="{ low: hero.hpPercent < 30 }"></div>
                <span class="hp-text-sm">{{ formatHp(hero.curHp) }}</span>
              </div>
              <div class="energy-bar-container">
                <div class="energy-bar" :style="{ width: hero.energyPercent + '%' }"></div>
                <span class="energy-text-sm">{{ hero.curEnergy || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志 -->
    <div class="log-section">
      <div class="log-header">
        <span class="log-title">战斗日志</span>
        <n-button text size="tiny" @click="battleLogs = []">清空</n-button>
      </div>
      <div class="log-container" ref="battleLogRef">
        <div v-for="(log, idx) in battleLogs" :key="idx" class="log-entry" :class="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
        <div v-if="battleLogs.length === 0" class="log-empty">暂无战斗日志</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTokenStore } from '@/stores/tokenStore';
import { useMessage } from 'naive-ui';
import { getMonsterName, getHeroName } from '@/utils/nightmareBattleMock';

const route = useRoute();
const router = useRouter();
const tokenStore = useTokenStore();
const message = useMessage();

// ====== 路由参数 ======
const teamId = computed(() => route.query.teamId || '');
const captainTokenId = ref(route.query.captainTokenId || '');
const isTest = computed(() => route.query.test === 'true');
const roomId = ref(route.query.roomId || '');
const presetId = ref(route.query.presetId || '');
const presetData = ref(null);
const isAutoMode = computed(() => !!presetId.value && !!presetData.value);

// ====== 战斗状态 ======
const battlePhase = ref('idle'); // 'idle' | 'fighting' | 'cooling'
const battleCountdown = ref(0);
const currentLevel = ref(0);
const lastMonsterId = ref(0);
const monsters = ref([]);
const members = ref([]);
const attackRecords = ref({}); // { [level]: [roleId1, roleId2] }
const battleLogs = ref([]);
const battleLogRef = ref(null);
const isFetchingInfo = ref(false);
const isCompleted = ref(false); // 十殿已通关，停止自动执行
let countdownTimer = null;

// 上一轮战斗结果
const lastFighter = ref(null);
const lastFighterName = ref('');
const lastBattleResult = ref({ isWin: null });

// ====== Boss 数据 ======
const BOSS_NAME = {
  1: "秦广王", 2: "楚江王", 3: "宋帝王", 4: "五官王",
  5: "阎罗王", 6: "卞城王", 7: "泰山王", 8: "都市王",
};
const BOSS_MAX_HP = {
  1: { boss: 225300000000, minion: 75120000000 },
  2: { boss: 247900000000, minion: 82640000000 },
  3: { boss: 272700000000, minion: 0 },
  4: { boss: 299900000000, minion: 0 },
  5: { boss: 329900000000, minion: 300500000000 },
  6: { boss: 300, minion: 0 },
  7: { boss: 751200000000, minion: 0 },
  8: { boss: 788800000000, minion: 0 },
};

const getBossName = (level) => BOSS_NAME[level] || `Boss${level}`;

const formatHp = (hp) => {
  if (!hp && hp !== 0) return '0';
  const n = Number(hp);
  if (n >= 1e12) return (n / 1e12).toFixed(1) + '万亿';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '万';
  return n.toLocaleString();
};

// ====== 日志 ======
const addBattleLog = (msg, type = 'info') => {
  const now = new Date();
  battleLogs.value.push({ time: now.toLocaleTimeString('zh-CN', { hour12: false }), msg, type });
  if (battleLogs.value.length > 500) battleLogs.value.splice(0, battleLogs.value.length - 500);
  nextTick(() => { if (battleLogRef.value) battleLogRef.value.scrollTop = battleLogRef.value.scrollHeight; });
};

// ====== 判断成员是否已出战 ======
const hasMemberFought = (roleId) => {
  const foughtList = attackRecords.value[currentLevel.value] || [];
  return foughtList.includes(String(roleId));
};

const recordMemberFought = (roleId) => {
  const lv = currentLevel.value;
  if (!attackRecords.value[lv]) attackRecords.value[lv] = [];
  attackRecords.value[lv].push(String(roleId));
};

// ====== 解析房间信息（完整实现） ======
const parseRoomInfo = (roomInfo, captainRoleId) => {
  if (!roomInfo) {
    addBattleLog('roomInfo 为空，无法解析', 'error');
    return false;
  }

  // 1. 关卡信息
  currentLevel.value = roomInfo.curMonsterCfgId || 0;
  lastMonsterId.value = roomInfo.lastMonsterId || 0;

  // 2. 上一轮战斗结果
  lastFighter.value = roomInfo.lastFighter || null;
  if (roomInfo.lastBattleData) {
    lastBattleResult.value = roomInfo.lastBattleData.result || { isWin: null };
  }
  if (lastFighter.value) {
    const frb = roomInfo.fightRoleBase || {};
    lastFighterName.value = Array.isArray(frb)
      ? (frb.find((m) => String(m.roleId) === String(lastFighter.value))?.name || String(lastFighter.value))
      : (frb[lastFighter.value]?.name || String(lastFighter.value));
  }

  // 3. 解析怪物/Boss（monsterTeamInfo[level].monsterTeam.team + curMonsterData）
  const fightRoleBase = roomInfo.fightRoleBase || {};
  const playerTeamInfo = roomInfo.playerTeamInfo || {};
  const monsterTeamInfo = roomInfo.monsterTeamInfo || {};
  const curLevel = String(currentLevel.value);
  const levelMonsterInfo = monsterTeamInfo[curLevel];
  const monsterTeam = levelMonsterInfo?.monsterTeam?.team || {};

  if (Object.keys(monsterTeam).length === 0) {
    addBattleLog('当前关卡尚未开打，等待战斗数据...', 'warning');
    monsters.value = [];
  } else {
    // 参考满血量（各关卡固定值）
    const refData = BOSS_MAX_HP[Number(curLevel)] || { boss: 0, minion: 0 };
    // curMonsterData 在 levelMonsterInfo 内部（出战后才有 curHp/curEnergy）
    const curMonsterData = levelMonsterInfo?.curMonsterData || {};

    const parsedMonsters = [];
    for (const [slotKey, data] of Object.entries(monsterTeam)) {
      if (!data) continue;
      // Boss判断：id长度<=6位为Boss，否则为喽啰
      const isBoss = String(data.id).length <= 6;
      const monsterId = String(data.id);
      // 从 curMonsterData 获取当前HP/怒气
      const cd = curMonsterData[monsterId] || {};
      // 使用参考表的最大HP
      const refMaxHp = isBoss ? refData.boss : refData.minion;
      const maxHp = refMaxHp > 0 ? refMaxHp : (data.hp || 0);
      const curHp = cd.curHp != null ? cd.curHp : maxHp;
      const curEnergy = cd.curEnergy != null ? cd.curEnergy : 0;

      parsedMonsters.push({
        id: data.id,
        name: getMonsterName(data.id),
        maxHp,
        curHp: Number(curHp),
        maxEnergy: 100,
        curEnergy: Number(curEnergy),
        isBoss,
        hpPercent: maxHp > 0 ? Math.max(0, Math.min(100, (Number(curHp) / maxHp) * 100)) : 100,
        energyPercent: 100 > 0 ? Math.max(0, Math.min(100, (Number(curEnergy) / 100) * 100)) : 0,
      });
    }
    monsters.value = parsedMonsters;
  }

  // 4. 解析成员（fightRoleBase → 武将初始数据，playerTeamInfo → 当前HP/Energy）
  //    兼容 fightRoleBase 的两种格式：数组和对象
  const parsedMembers = [];
  const frbEntries = Array.isArray(fightRoleBase)
    ? fightRoleBase.map((m) => [String(m.roleId), m])
    : Object.entries(fightRoleBase);

  for (const [roleId, roleData] of frbEntries) {
    if (!roleData) continue;
    const team = roleData.battleData?.team || {};
    const curHeroData = playerTeamInfo[roleId]?.curHeroData || {};

    // 解析武将（每个成员最多5个武将）
    const heroes = [];
    for (let i = 0; i < 5; i++) {
      const heroKey = String(i);
      const heroData = team[heroKey];
      if (heroData && heroData.id) {
        const heroIdStr = String(heroData.id);
        const curData = curHeroData[heroIdStr] || curHeroData[heroData.id] || {};
        // HP% = playerTeamInfo.curHp / fightRoleBase.hp（初始满血）
        const fullHp = heroData.hp || 0;
        const curHp = curData.curHp != null ? curData.curHp : fullHp;
        // 抓包中未出战成员 curEnergy=-1，实际显示为 0
        const curEnergy = curData.curEnergy != null && curData.curEnergy >= 0 ? curData.curEnergy : 0;
        const maxEnergy = Number(heroData.maxEnergy || 100);
        heroes.push({
          id: heroData.id,
          name: getHeroName(heroData.id),
          maxHp: fullHp,
          curHp: Number(curHp),
          maxEnergy,
          curEnergy: Number(curEnergy),
          isAlive: Number(curHp) > 0,
          hpPercent: fullHp > 0 ? Math.max(0, Math.min(100, (Number(curHp) / fullHp) * 100)) : 0,
          energyPercent: maxEnergy > 0 ? Math.max(0, Math.min(100, (Number(curEnergy) / maxEnergy) * 100)) : 0,
          type: heroData.type,
          recordFlag: heroData.recordFlag,
        });
      }
    }

    // 判断所有武将是否全部阵亡
    const isAllHeroesDead = heroes.length > 0 && heroes.every(h => !h.isAlive);

    parsedMembers.push({
      roleId: String(roleId),
      name: roleData.name || String(roleId),
      heroes,
      isCaptain: String(roleId) === String(captainRoleId),
      isAllHeroesDead,
      hasFought: false,
    });
  }

  if (parsedMembers.length > 0) members.value = parsedMembers;
  return true;
};

// ====== 获取房间信息 ======
const fetchRoomInfo = async () => {
  if (!captainTokenId.value || !roomId.value) return;
  isFetchingInfo.value = true;
  try {
    const resp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, 'nightmare_getroominfo', { roomId: roomId.value }, 10000);
    const roomInfo = resp?.roomInfo || resp?.body?.roomInfo || resp;
    const captainRoleId = resp?.captainRoleId || '';
    parseRoomInfo(roomInfo, captainRoleId);
    addBattleLog(`房间信息已刷新，关卡: ${currentLevel.value}`, 'info');
  } catch (err) {
    addBattleLog(`获取房间信息失败: ${err.message || err}`, 'error');
  } finally { isFetchingInfo.value = false; }
};

// ====== 出战 ======
const startAttack = async (member) => {
  if (battlePhase.value !== 'idle') return;
  if (member.isAllHeroesDead) { addBattleLog(`${member.name} 武将全部阵亡，无法出战`, 'warning'); return; }
  battlePhase.value = 'fighting';
  addBattleLog(`${member.name} 出战！`, 'info');
  try {
    await tokenStore.sendMessageWithPromise(captainTokenId.value, 'nightmare_fight',
      { roomId: roomId.value, roleId: Number(member.roleId) }, 10000);
    recordMemberFought(member.roleId);
  } catch (err) {
    addBattleLog(`出战失败: ${err.message || err}`, 'error');
    battlePhase.value = 'idle';
    return;
  }

  // 10秒战斗倒计时
  battleCountdown.value = 10;
  startCountdown(async () => {
    // 战斗结束 → leadercomplete
    let completeOk = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await tokenStore.sendMessageWithPromise(captainTokenId.value, 'nightmare_leadercomplete',
          { roomId: roomId.value }, 10000);
        completeOk = true;
        break;
      } catch {
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!completeOk) {
      addBattleLog('leadercomplete 失败', 'error');
      battlePhase.value = 'idle';
      return;
    }
    // 刷新房间信息
    await fetchRoomInfo();

    // 检查第8关是否全员阵亡（战斗失败）
    const allMembersDead = members.value.length > 0 && members.value.every(m => m.isAllHeroesDead);
    const bossAlive = monsters.value.some(m => m.isBoss && m.curHp > 0);
    if (currentLevel.value === 8 && allMembersDead && bossAlive) {
      addBattleLog('❌ 第8关挑战失败，全员阵亡！', 'error');
      // 检查重试次数（最多3次）
      const retryKey = 'nightmare-retry-count';
      const maxRetries = 3;
      const retryCount = Number(sessionStorage.getItem(retryKey) || '0') + 1;
      sessionStorage.setItem(retryKey, String(retryCount));

      // 解散房间
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId.value, 'nightmare_dismiss',
          { roomId: Number(roomId.value) }, 10000
        );
        addBattleLog('战斗房间已遣散', 'success');
      } catch (dismissErr) {
        addBattleLog(`遣散房间失败: ${dismissErr.message || dismissErr}`, 'warning');
      }
      battlePhase.value = 'idle';

      if (retryCount <= maxRetries) {
        // 将当前预设重新放入队列头部，以便重试
        addBattleLog(`🔁 第 ${retryCount}/${maxRetries} 次重试，即将重新挑战...`, 'info');
        message.warning(`第8关全员阵亡，第 ${retryCount} 次重试`);
        try {
          const currentPreset = JSON.parse(sessionStorage.getItem('nightmare-current-preset') || 'null');
          const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
          if (currentPreset) {
            queue.unshift(currentPreset);
            sessionStorage.setItem('nightmare-preset-queue', JSON.stringify(queue));
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 2000));
        router.replace({ name: 'BatchDailyTasks', query: { nextPreset: 'true' } });
      } else {
        addBattleLog(`⚠️ 已达最大重试次数 (${maxRetries})，跳过此预设`, 'warning');
        message.error(`第8关挑战失败，已重试 ${maxRetries} 次，跳过此预设`);
        sessionStorage.removeItem(retryKey);
        await new Promise(r => setTimeout(r, 2000));
        // 检查队列是否有下一个预设
        const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
        if (queue.length > 0) {
          router.replace({ name: 'BatchDailyTasks', query: { nextPreset: 'true' } });
        }
      }
      return;
    }

    // 检查是否通关十殿
    // 判定条件：① curMonsterCfgId > 8（服务器推进到不存在的关卡）
    // ② 当前第8关且所有怪物血量归零（BOSS+小怪全部阵亡）
    // ③ roomInfo 清空导致 currentLevel = 0，但第8关已有出战记录
    const allMonstersDead = monsters.value.length > 0 && monsters.value.every(m => m.curHp <= 0);
    const isLevel8Cleared = currentLevel.value === 8 && allMonstersDead;
    if (currentLevel.value > 8 || isLevel8Cleared || (currentLevel.value === 0 && attackRecords.value[8]?.length > 0)) {
      isCompleted.value = true;
      addBattleLog('🎉 恭喜通关十殿阎罗挑战！', 'success');
      message.success('十殿阎罗挑战通关！正在解散房间...');
      // 通关成功，重置重试计数器
      sessionStorage.removeItem('nightmare-retry-count');
      // 自动遣散房间
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId.value, 'nightmare_dismiss',
          { roomId: Number(roomId.value) }, 10000
        );
        addBattleLog('战斗房间已遣散', 'success');
      } catch (dismissErr) {
        addBattleLog(`遣散房间失败: ${dismissErr.message || dismissErr}，请手动返回`, 'warning');
      }
      battlePhase.value = 'idle';
      // 检查预设队列，如果有下一个预设则自动返回并继续
      try {
        const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
        if (queue.length > 0) {
          addBattleLog(`📝 预设队列剩余 ${queue.length} 个，自动返回继续执行...`, 'info');
          message.info(`预设队列剩余 ${queue.length} 个，即将继续...`);
          await new Promise(r => setTimeout(r, 2000));
          router.replace({ name: 'BatchDailyTasks', query: { nextPreset: 'true' } });
          return;
        }
      } catch { /* ignore */ }
      return;
    }
    addBattleLog(`关卡 ${currentLevel.value} 战斗中`, 'info');
    // 18秒冷却
    startCooling();
  });
};

// ====== 恢复 ======
const memberRecover = async (member) => {
  if (battlePhase.value !== 'idle') return;
  if (!member) return;
  addBattleLog(`[${member.name}] 发送恢复指令...`, 'info');
  try {
    await tokenStore.sendMessageWithPromise(captainTokenId.value, 'nightmare_restore',
      { roomId: roomId.value, roleId: Number(member.roleId) }, 10000);
    addBattleLog(`[${member.name}] 恢复指令已发送`, 'success');
  } catch (err) {
    addBattleLog(`[${member.name}] 恢复指令已发送（服务器可能不支持，继续刷新数据）`, 'info');
  }
  // 恢复后刷新房间数据
  await fetchRoomInfo();
};

// ====== 满怒 ======
const memberFullRage = async (member) => {
  if (battlePhase.value !== 'idle') return;
  if (!member) return;
  addBattleLog(`[${member.name}] 发送满怒指令...`, 'info');
  try {
    await tokenStore.sendMessageWithPromise(captainTokenId.value, 'nightmare_fullrage',
      { roomId: roomId.value, targetRoleId: Number(member.roleId) }, 10000);
    addBattleLog(`[${member.name}] 满怒指令已发送`, 'success');
  } catch (err) {
    addBattleLog(`[${member.name}] 满怒指令已发送（服务器可能不支持，继续刷新数据）`, 'info');
  }
  // 满怒后刷新房间数据
  await fetchRoomInfo();
};

// ====== 冷却 ======
const startCooling = () => {
  battlePhase.value = 'cooling';
  battleCountdown.value = 18;
  startCountdown(() => {
    battlePhase.value = 'idle';
    addBattleLog('冷却结束，可以再次出战', 'info');
  });
};

// ====== 通用倒计时 ======
const startCountdown = (onComplete) => {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    battleCountdown.value--;
    if (battleCountdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      onComplete?.();
    }
  }, 1000);
};

// ====== 自动出战（一键挑战） ======

// 将预设中的优先级条目解析为 roleId（兼容新旧格式：tokenId 或 roleId）
const resolveRoleId = (entry) => {
  // 优先按 tokenId 查找
  const token = tokenStore.gameTokens.find(t => t.id === entry);
  if (token?.roleId) return String(token.roleId);
  // 兼容旧预设：直接作为 roleId
  return String(entry);
};

// 通过成员名称反查房间中的 roleId（当 roleId 未就绪时使用）
const resolveRoleIdByName = (entry) => {
  const token = tokenStore.gameTokens.find(t => t.id === entry);
  if (!token?.name) return null;
  const member = members.value.find(m => m.name === token.name);
  return member ? String(member.roleId) : null;
};

// 在配置 map 中查找成员的值（兼容 tokenId 和 roleId 作为 key）
const getConfigValue = (configMap, member, priorityEntry) => {
  if (!configMap) return false;
  // 新预设：key 是 tokenId
  if (priorityEntry && configMap[priorityEntry]) return true;
  // 旧预设：key 是 roleId
  if (member.roleId && configMap[String(member.roleId)]) return true;
  return false;
};

const getAutoAttacker = () => {
  const priority = presetData.value?.levelConfig?.[currentLevel.value]?.priority || [];
  const foughtList = attackRecords.value[currentLevel.value] || [];
  for (const entry of priority) {
    // 优先通过 roleId 匹配，失败后通过名称反查
    let roleId = resolveRoleId(entry);
    let member = members.value.find(m => String(m.roleId) === roleId);
    if (!member) {
      const nameResolved = resolveRoleIdByName(entry);
      if (nameResolved) {
        roleId = nameResolved;
        member = members.value.find(m => String(m.roleId) === roleId);
      }
    }
    if (!member) continue;
    if (foughtList.includes(roleId)) continue;
    if (!member.isAllHeroesDead) return { member, entry };
  }
  // 兜底：找任何未出战的活人
  for (const member of members.value) {
    if (!member.isAllHeroesDead && !foughtList.includes(String(member.roleId))) {
      return { member, entry: null };
    }
  }
  return null;
};

const shouldAutoRecover = (member, priorityEntry) => {
  const configMap = presetData.value?.levelConfig?.[currentLevel.value]?.recovery;
  return getConfigValue(configMap, member, priorityEntry);
};

const shouldAutoFullRage = (member, priorityEntry) => {
  const configMap = presetData.value?.levelConfig?.[currentLevel.value]?.fullRage;
  return getConfigValue(configMap, member, priorityEntry);
};

const autoAttack = async () => {
  const result = getAutoAttacker();
  if (!result) {
    addBattleLog('自动模式：无可用出战成员', 'warning');
    return;
  }
  const { member: attacker, entry: attackerEntry } = result;
  // 检查恢复
  if (shouldAutoRecover(attacker, attackerEntry)) {
    addBattleLog(`自动模式：恢复 ${attacker.name}`, 'info');
    await memberRecover(attacker);
    await new Promise(r => setTimeout(r, 1000));
  }
  // 检查满怒
  if (shouldAutoFullRage(attacker, attackerEntry)) {
    addBattleLog(`自动模式：满怒 ${attacker.name}`, 'info');
    await memberFullRage(attacker);
    await new Promise(r => setTimeout(r, 1000));
  }
  await startAttack(attacker);
};

watch(battlePhase, (newPhase) => {
  if (newPhase === 'idle' && isAutoMode.value && !isCompleted.value) {
    setTimeout(() => { autoAttack(); }, 1000);
  }
});

// ====== 测试模式 ======
const fightSnapshotIndex = ref(0);
const applyTestSnapshot = async () => {
  // 测试模式使用 mock 数据
  try {
    const mockModule = await import('@/utils/nightmareBattleMock');
    const snapshot = mockModule.getFightSnapshot(fightSnapshotIndex.value);
    if (snapshot) {
      parseRoomInfo(snapshot.roomInfo, '');
      fightSnapshotIndex.value++;
      addBattleLog(`[测试] 应用快照 #${fightSnapshotIndex.value}`, 'info');
    }
  } catch (e) {
    addBattleLog(`[测试] 快照加载失败: ${e.message}`, 'error');
  }
};

// ====== 导航 ======
const goBack = () => {
  if (countdownTimer) clearInterval(countdownTimer);
  router.back();
};

// ====== 结束战斗（遣散房间） ======
const isDismissing = ref(false);
const endBattle = async () => {
  if (!roomId.value || !captainTokenId.value) {
    message.warning('缺少房间信息');
    return;
  }
  isDismissing.value = true;
  addBattleLog('正在遣散战斗房间...', 'info');
  try {
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      'nightmare_dismiss',
      { roomId: Number(roomId.value) },
      10000
    );
    addBattleLog('战斗房间已遣散', 'success');
    message.success('战斗已结束');
    if (countdownTimer) clearInterval(countdownTimer);
    router.back();
  } catch (err) {
    addBattleLog(`遣散失败: ${err.message || err}`, 'error');
    message.error(`结束战斗失败: ${err.message || err}`);
  } finally {
    isDismissing.value = false;
  }
};

// ====== 加载预设 ======
const loadPresetData = () => {
  if (!presetId.value) return;
  try {
    const raw = localStorage.getItem('nightmare-presets');
    const all = raw ? JSON.parse(raw) : [];
    presetData.value = all.find(p => p.id === presetId.value) || null;
    if (presetData.value) addBattleLog(`已加载预设: ${presetData.value.name}`, 'success');
  } catch {}
};

// ====== 生命周期 ======
onMounted(async () => {
  loadPresetData();
  if (roomId.value) {
    await fetchRoomInfo();
  }
  // 自动模式：3秒后首轮自动出战
  if (isAutoMode.value && presetData.value) {
    setTimeout(() => { autoAttack(); }, 3000);
  }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style lang="scss" scoped>
.nightmare-battle-container {
  padding: 12px;
  max-width: 960px;
  margin: 0 auto;

  .battle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .battle-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
    }
    .countdown {
      font-size: 18px;
      font-weight: 700;
      color: #f59e0b;
      min-width: 32px;
      text-align: center;
    }
  }

  .level-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding: 6px 12px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
    flex-wrap: wrap;
    .level-label {
      color: var(--text-secondary, #888);
      font-size: 12px;
    }
    .level-name {
      font-weight: 600;
      color: var(--primary-color, #1677ff);
      font-size: 13px;
    }
    .last-fighter {
      margin-left: auto;
      font-size: 12px;
      color: var(--text-secondary, #888);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .monsters-section,
  .members-section {
    margin-bottom: 12px;
    .section-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 6px;
      color: var(--text-primary, #333);
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .monsters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .monster-card {
    padding: 8px 10px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
    border: 1px solid var(--border-color, #e0e0e0);
    &.boss {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.04);
    }
    &.dead {
      opacity: 0.45;
    }
    .monster-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .monster-name {
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .monster-hp-text {
      font-size: 11px;
      color: var(--text-secondary, #888);
      white-space: nowrap;
    }
  }

  .hp-bar-container,
  .energy-bar-container {
    position: relative;
    height: 16px;
    background: var(--bg-tertiary, #e8e8e8);
    border-radius: 3px;
    margin-bottom: 3px;
    overflow: hidden;
  }

  .hp-bar {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #4ade80);
    border-radius: 3px;
    transition: width 0.3s;
    &.low {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }
    &.mid {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    &.hero-hp {
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      &.low {
        background: linear-gradient(90deg, #ef4444, #f87171);
      }
    }
  }

  .energy-bar {
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    border-radius: 3px;
    transition: width 0.3s;
  }

  .hp-text,
  .energy-text {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--text-primary, #333);
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  }

  .hp-text-sm,
  .energy-text-sm {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: var(--text-primary, #333);
  }

  .members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
  }

  .member-card {
    padding: 8px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 6px;
    border: 1px solid var(--border-color, #e0e0e0);
    &.dead {
      opacity: 0.45;
    }
    &.fought {
      border-color: #f59e0b;
    }
    .member-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      gap: 4px;
      .member-name {
        font-weight: 600;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .member-actions {
        display: flex;
        gap: 3px;
        flex-shrink: 0;
      }
    }
    .heroes-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .hero-card {
      padding: 2px 6px;
      background: var(--bg-tertiary, #e8e8e8);
      border-radius: 3px;
      &.dead {
        opacity: 0.35;
      }
      .hero-name {
        font-size: 10px;
        color: var(--text-secondary, #888);
        margin-bottom: 1px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .log-section {
    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      .log-title {
        font-weight: 600;
        font-size: 13px;
      }
    }
    .log-container {
      max-height: 180px;
      overflow-y: auto;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 6px;
      padding: 6px 8px;
      background: var(--bg-tertiary, #e8e8e8);
      font-size: 11px;
      line-height: 1.5;
    }
    .log-entry {
      display: flex;
      gap: 6px;
      padding: 1px 0;
      &.success .log-msg {
        color: #22c55e;
      }
      &.error .log-msg {
        color: #ef4444;
      }
      &.warning .log-msg {
        color: #f59e0b;
      }
    }
    .log-time {
      color: var(--text-tertiary, #aaa);
      flex-shrink: 0;
      font-size: 10px;
    }
    .log-msg {
      color: var(--text-secondary, #666);
      word-break: break-all;
    }
    .log-empty {
      color: var(--text-tertiary, #aaa);
      text-align: center;
      padding: 8px;
    }
  }

  /* 手机端适配 */
  @media (max-width: 768px) {
    padding: 8px;
    .battle-header {
      flex-direction: column;
      align-items: flex-start;
      .header-right {
        width: 100%;
        justify-content: flex-start;
      }
    }
    .monsters-grid {
      grid-template-columns: 1fr;
    }
    .members-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }

  @media (max-width: 480px) {
    .members-grid {
      grid-template-columns: 1fr 1fr;
    }
    .member-card .member-head {
      flex-direction: column;
      align-items: flex-start;
      .member-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  }
}
</style>
