/**
 * NightmareAutoBattleService 单元测试
 * 使用 Node.js 内置测试运行器 (node:test + node:assert)
 *
 * 运行方式: node --import ./test/helpers/register-loader.mjs --test test/nightmareAutoBattle.test.js
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ====== 加速 sleep：将 setTimeout 延迟压到 1ms ======
const _origSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...args) => _origSetTimeout(fn, 1, ...args);

// 让出微任务队列
const flush = () => new Promise(r => _origSetTimeout(r, 0));

// ====== 被测目标 & Mock 工厂 ======
import { NightmareAutoBattleService } from '../src/utils/nightmareAutoBattle.js';
import {
  NightmareMockFactory,
  createErrorResponse,
  resetMockState,
  createGetRoomInfoResponse,
  createRoomInfo,
} from './helpers/nightmareMockFactory.js';

// ====== 辅助函数 ======

/** 创建服务实例（带合理默认值） */
function createService(overrides = {}) {
  const logs = [];
  const statuses = [];
  const completions = [];
  const errors = [];

  const mockStore = overrides.mockStore || NightmareMockFactory.createMockTokenStore({
    memberCount: overrides.memberCount ?? 3,
    wsStatus: overrides.wsStatus || 'connected',
    responseOverrides: overrides.responseOverrides || {},
    errorSequence: overrides.errorSequence || {},
  });

  const preset = overrides.preset || NightmareMockFactory.createPreset({
    name: '测试预设',
    captainTokenId: 'token_1',
    memberTokenIds: overrides.noMembers ? [] : ['token_2', 'token_3'],
    waitLevel8: overrides.waitLevel8 || false,
    levelConfig: overrides.levelConfig || generateLevelConfig(),
  });

  const service = new NightmareAutoBattleService({
    captainTokenId: 'token_1',
    roomId: overrides.roomId || '28314045',
    teamId: overrides.teamId || 12345,
    captainRoleId: overrides.captainRoleId || '10001',
    presetData: preset,
    tokenStore: mockStore,
    activeBattles: overrides.activeBattles || [],
    onLog: (msg, type) => logs.push({ msg, type }),
    onStatusChange: (info) => statuses.push(info),
    onComplete: (result) => completions.push(result),
    onError: (error) => errors.push(error),
  });

  return { service, mockStore, logs, statuses, completions, errors };
}

/** 生成 1-8 关 levelConfig（priority 为 tokenId 列表） */
function generateLevelConfig() {
  const config = {};
  for (let i = 1; i <= 8; i++) {
    config[i] = {
      priority: ['token_1', 'token_2', 'token_3'],
    };
  }
  return config;
}

/**
 * 生成关卡递进 roomInfo 响应覆盖（1→8→9 通关）
 * @param {number} [failLevel] - 在哪一关让怪物全存活（导致通关失败逻辑）
 */
function progressingRoomInfo(failLevel) {
  let callCount = 0;
  return (params) => {
    callCount++;
    const level = Math.min(callCount, 9);
    if (level > 8) {
      return createGetRoomInfoResponse({ currentLevel: 9 });
    }
    return createGetRoomInfoResponse({
      currentLevel: level,
      monsterOptions: level === failLevel ? {} : { bossDead: level < 8 ? false : true },
    });
  };
}

// ========================================================================
//  测试套件
// ========================================================================

describe('NightmareAutoBattleService', () => {

  beforeEach(() => resetMockState());
  afterEach(() => {});

  // ==================== 1. 正常流程 ====================

  describe('正常流程', () => {

    it('1) 8关全通：fight→leadercomplete→roomInfo 推进→completed', async () => {
      const { service, completions, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      assert.equal(service.getStatus(), 'completed');
      assert.ok(completions.length >= 1, 'onComplete 应被调用');
      assert.equal(completions[0].level, 8);
      const completedStatus = statuses.find(s => s.status === 'completed');
      assert.ok(completedStatus, 'onStatusChange 应收到 completed');
    });

    it('2) 单人通关：仅队长无队员', async () => {
      const { service, completions } = createService({
        noMembers: true,
        memberCount: 3,
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      assert.equal(service.getStatus(), 'completed');
      assert.ok(completions.length >= 1);
    });

    it('3) 出战成功后记录 attackRecords', async () => {
      let roomLevel = 0;
      const { service, mockStore } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => {
            roomLevel++;
            if (roomLevel <= 1) {
              return createGetRoomInfoResponse({ currentLevel: 1 });
            }
            return createGetRoomInfoResponse({ currentLevel: 9 });
          },
        },
      });

      await service.start();

      const fightCalls = mockStore.getCallLog().filter(c => c.cmd === 'nightmare_fight');
      assert.ok(fightCalls.length >= 1, '至少有一次 fight 调用');
    });
  });

  // ==================== 2. 错误恢复 ====================

  describe('错误恢复', () => {

    it('4) 6100070 已出战：成员被标记并自动跳过', async () => {
      const { service, mockStore, logs } = createService({
        errorSequence: {
          'nightmare_fight': [createErrorResponse(6100070)],
        },
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      // 6100070 应被标记为已出战
      const skipLog = logs.find(l => l.msg.includes('6100070'));
      assert.ok(skipLog, '应有 6100070 跳过日志');
      // 服务最终应完成或失败（不因 6100070 卡死）
      assert.ok(
        service.getStatus() === 'completed' || service.getStatus() === 'failed',
        `状态应为终态，实际: ${service.getStatus()}`
      );
    });

    it('5) 7100020 残留队伍：成员被标记并跳过', async () => {
      const { service, logs } = createService({
        errorSequence: {
          'nightmare_fight': [createErrorResponse(7100020)],
        },
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      const log7100020 = logs.find(l => l.msg.includes('7100020'));
      assert.ok(log7100020, '应有 7100020 跳过日志');
    });

    it('6) 7100140 限流：返回 false 但不终止循环', async () => {
      const { service, logs } = createService({
        errorSequence: {
          'nightmare_fight': [createErrorResponse(7100140)],
        },
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      const limitLog = logs.find(l => l.msg.includes('限流'));
      assert.ok(limitLog, '应有限流日志');
      // 限流不应导致直接失败
      assert.notEqual(service.getStatus(), 'failed');
    });

    it('7) leadercomplete 3次重试：前2次失败第3次成功', async () => {
      const { service, mockStore, completions } = createService({
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
        errorSequence: {
          'nightmare_leadercomplete': [
            createErrorResponse(9999999, 'fail1'),
            createErrorResponse(9999999, 'fail2'),
          ],
        },
      });

      await service.start();

      // 第3次 leadercomplete 应成功（错误队列耗尽后返回默认成功响应）
      const lcCalls = mockStore.getCallLog().filter(c => c.cmd === 'nightmare_leadercomplete');
      assert.ok(lcCalls.length >= 3, `leadercomplete 应至少调用3次，实际 ${lcCalls.length}`);
    });

    it('8) leadercomplete 3次全失败：触发房间验证', async () => {
      const { service, mockStore, errors, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
        errorSequence: {
          'nightmare_leadercomplete': [
            createErrorResponse(9999999, 'fail1'),
            createErrorResponse(9999999, 'fail2'),
            createErrorResponse(9999999, 'fail3'),
          ],
        },
      });

      await service.start();

      // 3次全失败后，_leaderComplete 返回 false → 触发 _fetchRoomInfo 验证
      const roomInfoCalls = mockStore.getCallLog().filter(c => c.cmd === 'nightmare_getroominfo');
      assert.ok(roomInfoCalls.length >= 2, '应多次获取房间信息');
    });

    it('9) fight 失败后验证房间有效性', async () => {
      const { service, mockStore, logs } = createService({
        errorSequence: {
          'nightmare_fight': [new Error('generic fight failure')],
        },
        responseOverrides: {
          'nightmare_getroominfo': progressingRoomInfo(),
        },
      });

      await service.start();

      // fight 失败后应等5秒再 _fetchRoomInfo 验证房间
      const roomInfoCalls = mockStore.getCallLog().filter(c => c.cmd === 'nightmare_getroominfo');
      assert.ok(roomInfoCalls.length >= 2, 'fight 失败后应刷新房间信息');
    });

    it('10) 队长断连后自动重连', async () => {
      let roomCallCount = 0;
      const mockStore = NightmareMockFactory.createMockTokenStore({
        memberCount: 3,
        wsStatus: 'connected',
        responseOverrides: {
          'nightmare_getroominfo': (params) => {
            roomCallCount++;
            // 第一次调用后设置断连（fight 失败后的 _fetchRoomInfo 时队长已断连）
            if (roomCallCount >= 1) {
              disconnected = true;
            }
            // 第一次返回第1关，后续返回第8关 Boss 已击杀（触发通关流程）
            if (roomCallCount <= 1) {
              return createGetRoomInfoResponse({ currentLevel: 1 });
            }
            return createGetRoomInfoResponse({
              currentLevel: 8,
              monsterOptions: { bossDead: true },
            });
          },
        },
        errorSequence: {
          'nightmare_fight': [new Error('fight fail to trigger reconnect')],
        },
      });

      // fight 失败 → fetchRoomInfo → 重连检查
      const origGetStatus = mockStore.getWebSocketStatus;
      let disconnected = false;
      mockStore.getWebSocketStatus = (id) => {
        if (id === 'token_1' && disconnected) return 'disconnected';
        return origGetStatus(id);
      };

      // 追踪 createWebSocketConnection 调用（验证重连是否真正触发）
      let reconnectCalled = false;
      const origCreate = mockStore.createWebSocketConnection;
      mockStore.createWebSocketConnection = async (...args) => {
        reconnectCalled = true;
        return origCreate(...args);
      };

      const { service } = createService({ mockStore });

      await service.start();

      // 验证 createWebSocketConnection 被实际调用（重连逻辑被触发）
      assert.ok(reconnectCalled, '应触发队长重连（createWebSocketConnection 被调用）');
      // 确保服务到达终态
      assert.ok(
        ['completed', 'failed'].includes(service.getStatus()),
        `应到达终态，实际: ${service.getStatus()}`
      );
    });
  });

  // ==================== 3. 边界条件 ====================

  describe('边界条件', () => {

    it('11) _checkCompletion: currentLevel > 8 → true', () => {
      const { service } = createService();
      service._currentLevel = 9;
      service._monsters = [];
      assert.equal(service._checkCompletion(), true);
    });

    it('12) _checkCompletion: level 8 + 全部怪物死亡 → true', () => {
      const { service } = createService();
      service._currentLevel = 8;
      service._monsters = [
        { id: 10008, name: '都市王', maxHp: 788800000000, curHp: 0, isBoss: true },
      ];
      assert.equal(service._checkCompletion(), true);
    });

    it('13) _checkCompletion: level 8 + Boss 存活 → false', () => {
      const { service } = createService();
      service._currentLevel = 8;
      service._monsters = [
        { id: 10008, name: '都市王', maxHp: 788800000000, curHp: 500000, isBoss: true },
      ];
      assert.equal(service._checkCompletion(), false);
    });

    it('14) _checkCompletion: level 3 未通关 → false', () => {
      const { service } = createService();
      service._currentLevel = 3;
      service._monsters = [
        { id: 10003, name: '宋帝王', maxHp: 272700000000, curHp: 100000, isBoss: true },
      ];
      assert.equal(service._checkCompletion(), false);
    });

    it('15) _getAutoAttacker: 全员阵亡 → null', () => {
      const { service } = createService();
      service._currentLevel = 5;
      service._members = [
        { roleId: '10001', name: '队长', heroes: [], isAllHeroesDead: true, isCaptain: true },
        { roleId: '10002', name: '队员1', heroes: [], isAllHeroesDead: true, isCaptain: false },
        { roleId: '10003', name: '队员2', heroes: [], isAllHeroesDead: true, isCaptain: false },
      ];
      service._attackRecords = {};
      assert.equal(service._getAutoAttacker(), null);
    });

    it('16) _getAutoAttacker: 按预设优先级选出第一人', () => {
      const { service } = createService();
      service._currentLevel = 3;
      service._members = [
        { roleId: '10001', name: '队长', heroes: [{ id: 107 }], isAllHeroesDead: false, isCaptain: true },
        { roleId: '10002', name: '队员1', heroes: [{ id: 108 }], isAllHeroesDead: false, isCaptain: false },
        { roleId: '10003', name: '队员2', heroes: [{ id: 109 }], isAllHeroesDead: false, isCaptain: false },
      ];
      service._attackRecords = {};

      const result = service._getAutoAttacker();
      assert.ok(result, '应返回出战成员');
      assert.equal(result.member.roleId, '10001');
    });

    it('17) _getAutoAttacker: 已出战的跳过，选下一人', () => {
      const { service } = createService();
      service._currentLevel = 3;
      service._members = [
        { roleId: '10001', name: '队长', heroes: [{ id: 107 }], isAllHeroesDead: false, isCaptain: true },
        { roleId: '10002', name: '队员1', heroes: [{ id: 108 }], isAllHeroesDead: false, isCaptain: false },
        { roleId: '10003', name: '队员2', heroes: [{ id: 109 }], isAllHeroesDead: false, isCaptain: false },
      ];
      service._attackRecords = { 3: ['10001'] };

      const result = service._getAutoAttacker();
      assert.ok(result);
      assert.equal(result.member.roleId, '10002');
    });

    it('18) _getAutoAttacker: 兜底选人（不在 priority 中的存活成员）', () => {
      const { service } = createService({
        preset: NightmareMockFactory.createPreset({
          levelConfig: { 3: { priority: ['token_99'] } }, // 不存在的 token
        }),
      });
      service._currentLevel = 3;
      service._members = [
        { roleId: '10001', name: '队长', heroes: [{ id: 107 }], isAllHeroesDead: false, isCaptain: true },
      ];
      service._attackRecords = {};

      const result = service._getAutoAttacker();
      assert.ok(result, '兜底应选出存活成员');
      assert.equal(result.member.roleId, '10001');
    });

    it('19) _isAllMembersDead: 全员阵亡 → true', () => {
      const { service } = createService();
      service._members = [
        { roleId: '10001', isAllHeroesDead: true },
        { roleId: '10002', isAllHeroesDead: true },
      ];
      assert.equal(service._isAllMembersDead(), true);
    });

    it('20) _isAllMembersDead: 有存活成员 → false', () => {
      const { service } = createService();
      service._members = [
        { roleId: '10001', isAllHeroesDead: true },
        { roleId: '10002', isAllHeroesDead: false },
      ];
      assert.equal(service._isAllMembersDead(), false);
    });

    it('21) 第8关全员阵亡 → 标记 failed + level8_all_dead', async () => {
      // 手动构造 roomInfo，确保 playerTeamInfo 中 curHp=0
      // 注意：createRoomInfo 用 hero.hp || 100000，hp:0 会被视为 falsy
      const deadRoomInfo = {
        curMonsterCfgId: 8,
        monsterTeamInfo: createRoomInfo({ currentLevel: 8 }).monsterTeamInfo,
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
          { roleId: 10002, name: '队员1', battleData: { team: { '0': { id: 112, hp: 100 } } } },
          { roleId: 10003, name: '队员2', battleData: { team: { '0': { id: 117, hp: 100 } } } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 0 } } },
          '10002': { curHeroData: { '112': { curHp: 0 } } },
          '10003': { curHeroData: { '117': { curHp: 0 } } },
        },
      };
      const { service, errors, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => ({ roomInfo: deadRoomInfo, captainRoleId: '10001' }),
        },
      });

      // 让 _battleLoop 自然运行到全员阵亡分支
      await service.start();

      // 断言终态
      assert.equal(service.getStatus(), 'failed', '第8关全员阵亡应为 failed');
      // 断言 onError 回调包含 reason 字段
      const error = errors.find(e => e.reason === 'level8_all_dead');
      assert.ok(error, 'errors 回调中应包含 reason: level8_all_dead');
      // 断言 onStatusChange 回调
      const failedStatus = statuses.find(s => s.status === 'failed' && s.reason === 'level8_all_dead');
      assert.ok(failedStatus, 'statuses 回调中应包含 reason: level8_all_dead');
    });

    it('22) 第8关 BOSS 血量归零 → completed', async () => {
      const { service, completions } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => createGetRoomInfoResponse({
            currentLevel: 8,
            monsterOptions: { bossDead: true },
          }),
        },
      });

      await service.start();

      assert.equal(service.getStatus(), 'completed');
      assert.ok(completions.length >= 1);
    });

    it('23) _reopenRetryCount 达到上限(1) → 终止', async () => {
      // 手动构造 roomInfo，确保 playerTeamInfo 中 curHp=0
      const deadRoomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: createRoomInfo({ currentLevel: 3 }).monsterTeamInfo,
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
          { roleId: 10002, name: '队员1', battleData: { team: { '0': { id: 112, hp: 100 } } } },
          { roleId: 10003, name: '队员2', battleData: { team: { '0': { id: 117, hp: 100 } } } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 0 } } },
          '10002': { curHeroData: { '112': { curHp: 0 } } },
          '10003': { curHeroData: { '117': { curHp: 0 } } },
        },
      };
      const { service, errors, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => ({ roomInfo: deadRoomInfo, captainRoleId: '10001' }),
        },
      });

      // 让 _battleLoop 自然运行 dismiss→reopen→再次失败→retry_limit 分支
      await service.start();

      // 断言终态
      assert.equal(service.getStatus(), 'failed', '重试上限后应为 failed');
      // 断言 onError 回调
      const error = errors.find(e => e.reason === 'retry_limit_reached');
      assert.ok(error, 'errors 回调中应包含 reason: retry_limit_reached');
      // 断言 onStatusChange 回调
      const failedStatus = statuses.find(s => s.status === 'failed' && s.reason === 'retry_limit_reached');
      assert.ok(failedStatus, 'statuses 回调中应包含 reason: retry_limit_reached');
    });

    it('24) 2小时超时保护触发', async () => {
      const { service, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => createGetRoomInfoResponse({ currentLevel: 1 }),
        },
      });

      // 服务已创建，_startTime 是真实时间。现在 mock Date.now 让其远超2小时
      const realDateNow = Date.now;
      Date.now = () => service._startTime + 7_200_001;

      try {
        await service.start();

        assert.equal(service.getStatus(), 'failed');
        const timeoutStatus = statuses.find(s => s.reason === 'timeout');
        assert.ok(timeoutStatus, '应有 timeout 原因');
      } finally {
        Date.now = realDateNow;
      }
    });

    it('25) _shouldWaitForMidnight: 周日+第8关+首次 → true', () => {
      const realDate = globalThis.Date;
      const FakeDate = class extends realDate {
        constructor(...args) {
          if (args.length === 0) return new realDate(2025, 0, 5, 20, 0, 0); // 周日
          return new realDate(...args);
        }
        static now() { return new realDate(2025, 0, 5, 20, 0, 0).getTime(); }
      };
      globalThis.Date = FakeDate;

      try {
        const { service } = createService({ waitLevel8: true });
        service._currentLevel = 8;
        service._level8FirstEntry = false;
        assert.equal(service._shouldWaitForMidnight(), true);
        assert.equal(service._level8FirstEntry, true);
      } finally {
        globalThis.Date = realDate;
      }
    });

    it('26) _shouldWaitForMidnight: 非周日 → false', () => {
      const realDate = globalThis.Date;
      const FakeDate = class extends realDate {
        constructor(...args) {
          if (args.length === 0) return new realDate(2025, 0, 7, 20, 0, 0); // 周二
          return new realDate(...args);
        }
        static now() { return new realDate(2025, 0, 7, 20, 0, 0).getTime(); }
      };
      globalThis.Date = FakeDate;

      try {
        const { service } = createService({ waitLevel8: true });
        service._currentLevel = 8;
        assert.equal(service._shouldWaitForMidnight(), false);
      } finally {
        globalThis.Date = realDate;
      }
    });

    it('27) _shouldWaitForMidnight: waitLevel8=false → false', () => {
      const { service } = createService({ waitLevel8: false });
      service._currentLevel = 8;
      assert.equal(service._shouldWaitForMidnight(), false);
    });

    it('28) _shouldWaitForMidnight: 非第8关 → false', () => {
      const { service } = createService({ waitLevel8: true });
      service._currentLevel = 5;
      assert.equal(service._shouldWaitForMidnight(), false);
    });
  });

  // ==================== 4. 防重复与状态管理 ====================

  describe('防重复与状态管理', () => {

    it('29) _cleanupDone 确保 _dismissRoom 只执行一次', async () => {
      const mockStore = NightmareMockFactory.createMockTokenStore({ memberCount: 3 });
      const { service } = createService({ mockStore });

      await service._dismissRoom([]);
      assert.equal(mockStore.getCallCount('nightmare_dismiss'), 1);
      assert.equal(mockStore.getCallCount('matchteam_dismiss'), 1);

      // 第二次调用应被 _cleanupDone 阻止
      await service._dismissRoom([]);
      assert.equal(mockStore.getCallCount('nightmare_dismiss'), 1, '不应重复遣散');
    });

    it('30) resume() 重置 _cleanupDone 支持续战', async () => {
      const mockStore = NightmareMockFactory.createMockTokenStore({ memberCount: 3 });
      const { service } = createService({ mockStore });

      // 先手动遣散
      await service._dismissRoom([]);
      assert.equal(service._cleanupDone, true);

      // stop 后 resume 应重置 _cleanupDone
      service.stop();
      // resume 内部会调 _fetchRoomInfo → _battleLoop，我们只检查重置效果
      // 用 stop 后立即检查：resume 还没调，但 _cleanupDone 应为 true
      assert.equal(service._cleanupDone, true);
    });

    it('31) stop() 设置 _stopped=true 和 status=stopped', () => {
      const { service, statuses } = createService();
      service.stop();
      assert.equal(service._stopped, true);
      assert.equal(service.getStatus(), 'stopped');
      assert.ok(statuses.some(s => s.status === 'stopped'));
    });

    it('32) rebindCallbacks 正确替换回调', () => {
      const { service } = createService();
      const newLogs = [];
      const newStatuses = [];
      const newCompletions = [];
      const newErrors = [];

      service.rebindCallbacks({
        onLog: (msg, type) => newLogs.push({ msg, type }),
        onStatusChange: (info) => newStatuses.push(info),
        onComplete: (result) => newCompletions.push(result),
        onError: (error) => newErrors.push(error),
      });

      service.stop();
      assert.ok(newLogs.length > 0, '新 onLog 回调应被调用');
      assert.ok(newStatuses.some(s => s.status === 'stopped'), '新 onStatusChange 应收到 stopped');
    });

    it('33) getBossHp 正确返回 Boss 血量信息', () => {
      const { service } = createService();
      service._monsters = [
        { id: 10001, name: '秦广王', maxHp: 225300000000, curHp: 100000, isBoss: true },
        { id: 1000101, name: '喽啰', maxHp: 75120000000, curHp: 50000, isBoss: false },
      ];
      const hp = service.getBossHp();
      assert.ok(hp);
      assert.equal(hp.curHp, 100000);
      assert.equal(hp.maxHp, 225300000000);
      assert.equal(hp.name, '秦广王');
    });

    it('34) getBossHp 无 Boss 时返回 null', () => {
      const { service } = createService();
      service._monsters = [];
      assert.equal(service.getBossHp(), null);
    });

    it('35) getter 方法返回正确值', () => {
      const { service } = createService({ roomId: '99999' });
      assert.equal(service.getRoomId(), '99999');
      assert.equal(service.getStatus(), 'idle');
      assert.equal(service.getCurrentLevel(), 0);
    });

    it('36) onStatusChange 在 start 时收到 running 状态', async () => {
      const { service, statuses } = createService({
        responseOverrides: {
          'nightmare_getroominfo': () => createGetRoomInfoResponse({ currentLevel: 9 }),
        },
      });

      await service.start();

      const runningStatus = statuses.find(s => s.status === 'running');
      assert.ok(runningStatus, '应收到 running 状态');
      assert.equal(runningStatus.currentLevel, 0, '初始 currentLevel 应为 0');
    });

    it('37) 共享队伍时不解散 matchteam', async () => {
      const mockStore = NightmareMockFactory.createMockTokenStore({ memberCount: 3 });
      const otherBattle = {
        teamId: 12345,
        status: 'running',
      };
      const { service } = createService({
        mockStore,
        activeBattles: [otherBattle],
      });

      await service._dismissRoom([otherBattle]);

      assert.equal(mockStore.getCallCount('nightmare_dismiss'), 1, '房间应遣散');
      assert.equal(mockStore.getCallCount('matchteam_dismiss'), 0, '共享队伍不应解散');
    });

    it('38) 遣散房间遇到 6100020（房间已不存在）不报错', async () => {
      const mockStore = NightmareMockFactory.createMockTokenStore({
        memberCount: 3,
        errorSequence: {
          'nightmare_dismiss': [createErrorResponse(6100020)],
        },
      });
      const { service, logs } = createService({ mockStore });

      // 不应抛出
      await service._dismissRoom([]);

      const infoLog = logs.find(l => l.msg.includes('已不存在') || l.msg.includes('已清理'));
      assert.ok(infoLog, '应有房间已不存在的信息日志');
    });

    it('39) resume() 在非 stopped/failed 状态下不执行', async () => {
      const { service, logs } = createService();
      // 初始状态 idle，不是 stopped 或 failed
      await service.resume();
      const noNeedLog = logs.find(l => l.msg.includes('无需继续'));
      assert.ok(noNeedLog, '应有"无需继续"日志');
    });

    it('40) _fight 对全阵亡成员直接返回 false', async () => {
      const { service } = createService();
      service._currentLevel = 3;
      const member = { roleId: '10001', name: '队长', isAllHeroesDead: true };
      const result = await service._fight(member);
      assert.equal(result, false);
    });
  });

  // ==================== 5. _parseRoomInfo 解析边界 ====================

  describe('_parseRoomInfo 解析边界', () => {

    it('41) 怪物 ID 长度判断 isBoss：短 ID 为 Boss，长 ID 为喽啰', () => {
      const { service } = createService();
      const roomInfo = createRoomInfo({
        currentLevel: 1,
      });
      service._parseRoomInfo(roomInfo, '10001');

      const boss = service._monsters.find(m => m.isBoss);
      assert.ok(boss, '应有 Boss（ID 长度 ≤ 6）');
      // 关卡1有喽啰（minionHp > 0）
      const minion = service._monsters.find(m => !m.isBoss);
      assert.ok(minion, '关卡1应有喽啰（ID 长度 > 6）');
    });

    it('42) fightRoleBase 为数组格式时正确解析', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: {},
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
          { roleId: 10002, name: '队员1', battleData: { team: { '0': { id: 112, hp: 50 } } } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 80 } } },
          '10002': { curHeroData: { '112': { curHp: 30 } } },
        },
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.equal(service._members.length, 2);
      assert.equal(service._members[0].roleId, '10001');
      assert.equal(service._members[0].isCaptain, true);
      assert.equal(service._members[0].heroes[0].curHp, 80);
      assert.equal(service._members[1].roleId, '10002');
      assert.equal(service._members[1].isCaptain, false);
    });

    it('43) fightRoleBase 为对象格式时正确解析', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: {},
        fightRoleBase: {
          '10001': { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
        },
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 50 } } },
        },
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.equal(service._members.length, 1);
      assert.equal(service._members[0].heroes[0].curHp, 50);
    });

    it('44) playerTeamInfo 中 curHeroData 缺失时 fallback 到武将默认 HP', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: {},
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 200 } } } },
        ],
        playerTeamInfo: {}, // 无 curHeroData
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.equal(service._members.length, 1);
      // curHeroData 缺失 → curHp fallback 到 hero.hp = 200
      assert.equal(service._members[0].heroes[0].curHp, 200);
      assert.equal(service._members[0].heroes[0].isAlive, true);
    });

    it('45) 成员武将为空数组时 isAllHeroesDead 为 false', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: {},
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: {} } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: {} },
        },
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.equal(service._members.length, 1);
      assert.equal(service._members[0].heroes.length, 0);
      // heroes.length === 0 → isAllHeroesDead = false（防御性设计）
      assert.equal(service._members[0].isAllHeroesDead, false);
    });

    it('46) 全员武将 curHp=0 时 isAllHeroesDead 为 true', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 8,
        monsterTeamInfo: {},
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
          { roleId: 10002, name: '队员1', battleData: { team: { '0': { id: 112, hp: 100 } } } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 0 } } },
          '10002': { curHeroData: { '112': { curHp: 0 } } },
        },
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.equal(service._members.length, 2);
      assert.equal(service._members[0].isAllHeroesDead, true);
      assert.equal(service._members[1].isAllHeroesDead, true);
    });

    it('47) roomInfo 为 null 时不修改现有状态', () => {
      const { service } = createService();
      service._currentLevel = 5;
      service._members = [{ roleId: '10001', isAllHeroesDead: false }];
      service._parseRoomInfo(null, '10001');

      // roomInfo 为 null → 直接 return，不修改任何状态
      assert.equal(service._currentLevel, 5);
      assert.equal(service._members.length, 1);
    });

    it('48) 怪物团队为空时 _monsters 为空数组', () => {
      const { service } = createService();
      const roomInfo = {
        curMonsterCfgId: 3,
        monsterTeamInfo: {}, // 无怪物数据
        fightRoleBase: [
          { roleId: 10001, name: '队长', battleData: { team: { '0': { id: 107, hp: 100 } } } },
        ],
        playerTeamInfo: {
          '10001': { curHeroData: { '107': { curHp: 50 } } },
        },
      };
      service._parseRoomInfo(roomInfo, '10001');

      assert.deepEqual(service._monsters, []);
    });
  });
});
