/**
 * 十殿阎罗后台自动战斗 - 全流程随机模拟测试（20 轮）
 *
 * 使用带状态的模拟游戏服务器（随机战斗结果/成员阵亡/异常注入），
 * 完整驱动 NightmareAutoBattleService 的 start() 流程，验证：
 *  1. 最终状态必须是 completed 或合理原因的 failed（不允许挂起/异常）
 *  2. 出战记录无重复（同一关不允许同一成员出战两次）
 *  3. 关卡只能递进，不能回退（含异常空响应注入场景）
 *  4. 恢复次数统计与实际 restore 成功次数一致
 *  5. matchteam_dismiss 最多调用一次（清理不重复）
 *
 * 运行方式:
 *   node --experimental-loader ./test/helpers/test-loader.js test/nightmareSimulation.test.js
 */

// ====== 加速 sleep：将 setTimeout 延迟压到 1ms ======
const _origSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...args) => _origSetTimeout(fn, 1, ...args);

import { NightmareAutoBattleService } from '../src/utils/nightmareAutoBattle.js';

// ====== 可复现的随机数（mulberry32） ======
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOSS_MAX = { 1: 2253e8, 2: 2479e8, 3: 2727e8, 4: 2999e8, 5: 3299e8, 6: 300, 7: 7512e8, 8: 7888e8 };

// ====== 有状态模拟游戏服务器 ======
class SimServer {
  constructor(rng, opts) {
    this.rng = rng;
    this.level = 1;
    this.roomId = opts.roomId;
    this.memberCount = opts.memberCount;
    this.deathChance = opts.deathChance;       // 每次出战成员阵亡概率
    this.minDamage = opts.minDamage;           // 每次出战对Boss伤害比例下限
    this.maxDamage = opts.maxDamage;           // 上限
    this.glitchAt = opts.glitchAt;             // 第N次 getroominfo 返回空响应（0=不注入）
    this.alreadyFoughtAt = opts.alreadyFoughtAt; // 第N次 fight 返回 6100070
    this.rateLimitAt = opts.rateLimitAt;       // 第N次 fight 返回 7100140
    this.bossHp = BOSS_MAX[1];
    this.roomInfoCalls = 0;
    this.fightCalls = 0;
    this.restoreOk = 0;
    this.teamDismissCalls = 0;
    this.roomDismissCalls = 0;
    // 成员状态 { roleId: { dead: bool } }
    this.members = {};
    for (let i = 0; i < this.memberCount; i++) {
      this.members[String(90001 + i)] = { dead: false };
    }
  }

  aliveCount() {
    return Object.values(this.members).filter(m => !m.dead).length;
  }

  buildRoomInfo() {
    const fightRoleBase = [];
    const playerTeamInfo = {};
    let idx = 0;
    for (const [roleId, st] of Object.entries(this.members)) {
      const team = {};
      const curHeroData = {};
      for (let slot = 0; slot < 5; slot++) {
        const heroId = 107 + idx * 5 + slot;
        team[String(slot)] = { id: heroId, hp: 100000 };
        curHeroData[String(heroId)] = { curHp: st.dead ? 0 : 100000 };
      }
      fightRoleBase.push({ roleId: Number(roleId), name: `模拟成员${idx + 1}`, battleData: { team } });
      playerTeamInfo[roleId] = { curHeroData };
      idx++;
    }
    const monsterTeamInfo = {};
    if (this.level >= 1 && this.level <= 8) {
      const bossId = Number(`1000${this.level}`);
      monsterTeamInfo[String(this.level)] = {
        monsterTeam: { team: { '0': { id: bossId, hp: BOSS_MAX[this.level] } } },
        curMonsterData: { [String(bossId)]: { curHp: Math.max(0, this.bossHp) } },
      };
    }
    return {
      curMonsterCfgId: this.level,
      monsterTeamInfo,
      fightRoleBase,
      playerTeamInfo,
      roomId: this.roomId,
    };
  }

  handle(cmd, params) {
    switch (cmd) {
      case 'nightmare_getroominfo': {
        this.roomInfoCalls++;
        if (this.glitchAt && this.roomInfoCalls === this.glitchAt) {
          return {}; // 异常空响应：验证关卡状态不被重置
        }
        return { roomInfo: this.buildRoomInfo(), captainRoleId: '90001' };
      }
      case 'nightmare_fight': {
        this.fightCalls++;
        const roleId = String(params.roleId);
        const member = this.members[roleId];
        if (this.alreadyFoughtAt && this.fightCalls === this.alreadyFoughtAt) {
          throw new Error('成员已出战 (6100070)');
        }
        if (this.rateLimitAt && this.fightCalls === this.rateLimitAt) {
          throw new Error('操作过于频繁 (7100140)');
        }
        if (!member) throw new Error('角色不在房间 (6100010)');
        if (member.dead) throw new Error('武将全部阵亡无法出战 (6100060)');
        // 随机战斗结果：对Boss造成伤害，成员可能阵亡
        const dmg = this.minDamage + this.rng() * (this.maxDamage - this.minDamage);
        this.bossHp -= BOSS_MAX[this.level] * dmg;
        if (this.rng() < this.deathChance) member.dead = true;
        return { success: true };
      }
      case 'nightmare_leadercomplete': {
        if (this.bossHp <= 0 && this.level <= 8) {
          this.level++;
          if (this.level <= 8) this.bossHp = BOSS_MAX[this.level];
        }
        return { success: true };
      }
      case 'nightmare_restore': {
        const roleId = String(params.roleId);
        if (this.members[roleId]) {
          this.members[roleId].dead = false;
          this.restoreOk++;
        }
        return { success: true };
      }
      case 'nightmare_fullrage':
        return { success: true };
      case 'nightmare_dismiss':
        this.roomDismissCalls++;
        return { success: true };
      case 'matchteam_dismiss':
        this.teamDismissCalls++;
        return { success: true };
      case 'matchteam_openteam': {
        // 第8关重建房间：Boss回满血、成员复活、出战状态清空
        this.roomId = String(Number(this.roomId) + 1);
        this.bossHp = BOSS_MAX[this.level] || BOSS_MAX[8];
        for (const m of Object.values(this.members)) m.dead = false;
        return { roomId: this.roomId };
      }
      default:
        return {};
    }
  }
}

// ====== 构建注入用 mock tokenStore ======
function makeMockStore(server, memberCount) {
  const gameTokens = [];
  for (let i = 0; i < memberCount; i++) {
    gameTokens.push({
      id: `token_${i + 1}`,
      name: `模拟成员${i + 1}`,
      token: 'x',
      roleId: String(90001 + i),
      wsUrl: null,
    });
  }
  return {
    gameTokens,
    sendMessageWithPromise: async (tokenId, cmd, params) => server.handle(cmd, params),
    getWebSocketStatus: () => 'connected',
    createWebSocketConnection: () => {},
  };
}

// ====== 单轮模拟 ======
async function runOneSimulation(runIdx, seed) {
  const rng = makeRng(seed);
  const memberCount = 2 + Math.floor(rng() * 4);              // 2~5人
  const deathChance = 0.15 + rng() * 0.45;                    // 15%~60% 阵亡率
  const minDamage = 0.3 + rng() * 0.2;                        // 单次伤害 30%~50%
  const maxDamage = minDamage + 0.3 + rng() * 0.3;            // ~60%~110%
  const glitchAt = rng() < 0.3 ? 3 + Math.floor(rng() * 10) : 0;
  const alreadyFoughtAt = rng() < 0.25 ? 2 + Math.floor(rng() * 6) : 0;
  const rateLimitAt = rng() < 0.25 ? 2 + Math.floor(rng() * 6) : 0;

  const server = new SimServer(rng, {
    roomId: String(28000000 + runIdx),
    memberCount, deathChance, minDamage, maxDamage,
    glitchAt, alreadyFoughtAt, rateLimitAt,
  });
  const mockStore = makeMockStore(server, memberCount);

  // 预设：全成员按顺序出战，随机为部分关卡配置恢复（tokenId 键，验证配置解析）
  const levelConfig = {};
  for (let lv = 1; lv <= 8; lv++) {
    const recovery = {};
    for (let i = 0; i < memberCount; i++) {
      if (rng() < 0.4) recovery[`token_${i + 1}`] = true;
    }
    levelConfig[lv] = {
      priority: gameTokensIds(memberCount),
      recovery,
    };
  }

  const logs = [];
  const statusLevels = [];
  const completions = [];
  const errors = [];

  const service = new NightmareAutoBattleService({
    captainTokenId: 'token_1',
    roomId: server.roomId,
    teamId: 55000 + runIdx,
    captainRoleId: '90001',
    presetData: { name: `模拟预设${runIdx}`, levelConfig, waitLevel8: false, memberTokenIds: gameTokensIds(memberCount).slice(1) },
    tokenStore: mockStore,
    activeBattles: [],
    onLog: (msg, type) => logs.push({ msg, type }),
    onStatusChange: (info) => { if (info.currentLevel != null) statusLevels.push(info.currentLevel); },
    onComplete: (r) => completions.push(r),
    onError: (e) => errors.push(e),
  });

  // 每轮 60 秒兜底（1ms sleep 下正常几秒内结束），防止死循环挂起
  const timeoutGuard = new Promise((_, rej) =>
    _origSetTimeout(() => rej(new Error('SIMULATION_TIMEOUT: 战斗循环疑似挂起')), 60000)
  );

  let crashError = null;
  try {
    await Promise.race([service.start(), timeoutGuard]);
  } catch (e) {
    crashError = e;
  }

  // ====== 校验 ======
  const problems = [];
  const finalStatus = service.getStatus();

  if (crashError) problems.push(`异常/挂起: ${crashError.message}`);

  // 1. 最终状态合法
  const okFailReasons = ['all_members_fought', 'level8_all_dead', 'retry_limit_reached', 'timeout'];
  if (finalStatus === 'completed') {
    if (completions.length < 1) problems.push('completed 但 onComplete 未回调');
  } else if (finalStatus === 'failed') {
    const reason = errors[0]?.reason || '';
    if (!okFailReasons.includes(reason)) problems.push(`failed 原因异常: ${reason || errors[0]?.message || '未知'}`);
  } else {
    problems.push(`最终状态异常: ${finalStatus}`);
  }

  // 2. 出战记录无重复
  const records = service._attackRecords || {};
  for (const [lv, list] of Object.entries(records)) {
    if (new Set(list).size !== list.length) problems.push(`第${lv}关出战记录重复: [${list.join(',')}]`);
  }

  // 3. 关卡只能递进不能回退
  for (let i = 1; i < statusLevels.length; i++) {
    if (statusLevels[i] < statusLevels[i - 1]) {
      problems.push(`关卡回退: ${statusLevels[i - 1]} → ${statusLevels[i]}`);
      break;
    }
  }

  // 4. 恢复次数统计一致
  const info = service.getRecoverInfo();
  if (info.used !== server.restoreOk) problems.push(`恢复计数不一致: 统计${info.used} vs 实际成功${server.restoreOk}`);
  if (info.left !== Math.max(0, info.total - info.used)) problems.push('getRecoverInfo left 计算错误');

  // 5. 队伍解散最多一次
  if (server.teamDismissCalls > 1) problems.push(`matchteam_dismiss 调用${server.teamDismissCalls}次`);

  // 6. completed 时必须通关（level>8 或第8关Boss死亡）
  if (finalStatus === 'completed' && !(server.level > 8 || (server.level === 8 && server.bossHp <= 0))) {
    problems.push(`误报通关: 服务器实际 level=${server.level}, bossHp=${server.bossHp}`);
  }

  return {
    runIdx, seed, memberCount,
    deathChance: deathChance.toFixed(2),
    glitchAt, alreadyFoughtAt, rateLimitAt,
    finalStatus,
    failReason: errors[0]?.reason || '',
    serverLevel: server.level,
    fightCalls: server.fightCalls,
    restoreOk: server.restoreOk,
    problems,
  };
}

function gameTokensIds(count) {
  return Array.from({ length: count }, (_, i) => `token_${i + 1}`);
}

// ====== 主入口：运行 20 轮 ======
const TOTAL_RUNS = 20;
const results = [];
console.log(`\n========== 十殿阎罗自动战斗模拟测试（${TOTAL_RUNS} 轮） ==========\n`);

for (let i = 1; i <= TOTAL_RUNS; i++) {
  const seed = 20260714 + i * 1013;
  const r = await runOneSimulation(i, seed);
  results.push(r);
  const flag = r.problems.length === 0 ? '✅ PASS' : '❌ FAIL';
  const inject = [
    r.glitchAt ? `空响应@roomInfo#${r.glitchAt}` : '',
    r.alreadyFoughtAt ? `6100070@fight#${r.alreadyFoughtAt}` : '',
    r.rateLimitAt ? `7100140@fight#${r.rateLimitAt}` : '',
  ].filter(Boolean).join(' ') || '无';
  console.log(
    `[${String(i).padStart(2, '0')}] ${flag} | ${r.memberCount}人 阵亡率${r.deathChance} | 注入:${inject}\n` +
    `     结果:${r.finalStatus}${r.failReason ? `(${r.failReason})` : ''} 到达第${r.serverLevel}关 出战${r.fightCalls}次 恢复${r.restoreOk}次` +
    (r.problems.length ? `\n     问题: ${r.problems.join('; ')}` : '')
  );
}

const passed = results.filter(r => r.problems.length === 0).length;
const completedRuns = results.filter(r => r.finalStatus === 'completed').length;
console.log(`\n========== 汇总 ==========`);
console.log(`通过: ${passed}/${TOTAL_RUNS}  |  通关: ${completedRuns} 轮  |  合理失败: ${results.filter(r => r.finalStatus === 'failed').length} 轮`);
if (passed < TOTAL_RUNS) {
  console.log('存在校验失败的轮次，请检查上方问题详情');
  process.exit(1);
} else {
  console.log('全部模拟通过 ✅');
  process.exit(0);
}
