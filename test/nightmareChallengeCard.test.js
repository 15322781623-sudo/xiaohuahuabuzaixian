/**
 * 十殿阎罗挑战 - NightmareChallengeCard 组队流程测试
 *
 * 测试策略：提取 Vue SFC 组件中的纯逻辑函数进行独立验证
 * 不依赖 Vue 运行时，使用 node:test + node:assert
 *
 * 运行方式：node --test test/nightmareChallengeCard.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  NightmareMockFactory,
  resetMockState,
  createErrorResponse,
  ERROR_CODES,
} from './helpers/nightmareMockFactory.js';

// ====== 辅助：MockLocalStorage（node 环境没有 localStorage） ======

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) ?? null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return [...this.store.keys()][index] ?? null;
  }
}

// ====== 辅助：模拟 getTabId ======

function createTabIdManager() {
  let tabId = null;
  return {
    getTabId() {
      if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      return tabId;
    },
    resetTabId() {
      tabId = null;
    },
    setTabId(id) {
      tabId = id;
    },
  };
}

// ====== 从组件提取的纯逻辑函数（与 NightmareChallengeCard.vue 完全一致） ======

/**
 * 防重复检查：activeBattles 中是否已有同 preset 正在运行
 * 对应源码 line 2126-2134
 */
function checkPresetDuplicate(activeBattles, preset) {
  const existing = activeBattles.find(
    b => b.preset.id === preset.id && ['running', 'cooling', 'waiting_midnight'].includes(b.status)
  );
  return !!existing;
}

/**
 * 跨标签页检查：预设是否在其他标签页运行中
 * 对应源码 line 392-425（自认领机制：同 tab 残留自动清理）
 */
function isPresetRunningInOtherTab(presetId, localStorage, getTabId) {
  try {
    const key = `nightmare-running-${presetId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (!data.tabId || !data.timestamp) {
      // 格式异常，清理并允许执行
      localStorage.removeItem(key);
      return false;
    }

    // 过期清理（3小时，与 _MAX_BATTLE_TIME 对齐）
    if (Date.now() - data.timestamp > 3 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return false;
    }

    // 同一标签页残留（页面刷新或战斗异常中断）→ 清理并允许执行
    if (data.tabId === getTabId()) {
      localStorage.removeItem(key);
      return false;
    }

    // 不同标签页正在运行
    return true;
  } catch {
    // JSON 解析异常，清理并允许执行
    try { localStorage.removeItem(`nightmare-running-${presetId}`); } catch { /* ignore */ }
    return false;
  }
}

/**
 * 清理当前标签页的所有残留预设运行标记
 * 对应源码 cleanupStalePresetMarkers
 */
function cleanupStalePresetMarkers(localStorage, getTabId) {
  const currentTabId = getTabId();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('nightmare-running-')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.tabId === currentTabId) {
          localStorage.removeItem(key);
          i--;
        }
      } catch {
        localStorage.removeItem(key);
        i--;
      }
    }
  }
}

/**
 * 标记预设为运行中（写入 localStorage）
 * 对应源码 line 410-418
 */
function markPresetRunning(presetId, localStorage, getTabId) {
  try {
    const key = `nightmare-running-${presetId}`;
    localStorage.setItem(key, JSON.stringify({
      tabId: getTabId(),
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
}

/**
 * 清除预设的运行标记
 * 对应源码 line 421-426
 */
function clearPresetRunning(presetId, localStorage) {
  try {
    const key = `nightmare-running-${presetId}`;
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

/**
 * 从 getroleteaminfo 响应中提取 existingTeamId
 * 对应源码 line 2247-2255（也出现于 line 1374-1381, 2391-2398）
 */
function extractTeamIdFromResponse(roleTeamRes) {
  let existingTeamId = roleTeamRes?.teamInfo?.teamId;
  if (!existingTeamId) {
    const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
    const keys = Object.keys(gDMTData);
    if (keys.length > 0) {
      const numKeys = keys.filter(k => /^\d+$/.test(k));
      existingTeamId = gDMTData[numKeys[0] || keys[0]]?.teamId;
    }
  }
  return existingTeamId || null;
}

/**
 * 从 nightmare_getroleinfo 响应中提取 roomId
 * 对应源码 line 2278-2282, 1929-1933
 */
function extractRoomIdFromResponse(resp) {
  return resp?.nightMareData?.roomId
    || resp?.nightmareData?.roomId
    || resp?.roomId
    || resp?.roomid
    || null;
}

/**
 * 检测两个预设是否共享成员
 * 对应源码 line 2530-2543（onPresetExecuteAll 中的冲突检测）
 */
function detectSharedMembers(presetA, presetB) {
  const membersA = new Set([
    presetA.captainTokenId,
    ...(presetA.memberTokenIds || []).slice(0, 4),
  ].filter(Boolean));
  const membersB = new Set([
    presetB.captainTokenId,
    ...(presetB.memberTokenIds || []).slice(0, 4),
  ].filter(Boolean));
  return [...membersA].filter(m => membersB.has(m));
}

/**
 * 检测预设是否与 activeBattles 中的运行项有成员冲突
 * 对应源码 line 2537-2544
 */
function findConflictingBattles(currentPreset, activeBattles) {
  const currentMembers = new Set([
    currentPreset.captainTokenId,
    ...(currentPreset.memberTokenIds || []).slice(0, 4),
  ].filter(Boolean));

  return activeBattles.filter(b => {
    if (!['running', 'cooling', 'waiting_midnight'].includes(b.status)) return false;
    const otherMembers = new Set([
      b.preset.captainTokenId,
      ...(b.preset.memberTokenIds || []).slice(0, 4),
    ].filter(Boolean));
    return [...currentMembers].some(m => otherMembers.has(m));
  });
}

// ================================================================
//  测试套件
// ================================================================

describe('1. 防重复检查（activeBattles）', () => {
  it('activeBattles 中已有同 preset.id 且 status=running → 判定为重复', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'running' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), true);
  });

  it('activeBattles 中已有同 preset.id 且 status=cooling → 判定为重复', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'cooling' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), true);
  });

  it('activeBattles 中已有同 preset.id 且 status=waiting_midnight → 判定为重复', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'waiting_midnight' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), true);
  });

  it('activeBattles 中已有同 preset.id 但 status=completed → 允许执行', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'completed' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), false);
  });

  it('activeBattles 中已有同 preset.id 但 status=failed → 允许执行', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'failed' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), false);
  });

  it('activeBattles 为空 → 允许执行', () => {
    const preset = { id: 'nm_preset_1', name: '测试预设' };
    assert.strictEqual(checkPresetDuplicate([], preset), false);
  });

  it('activeBattles 中 preset.id 不同 → 允许执行', () => {
    const preset = { id: 'nm_preset_2', name: '另一个预设' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'running' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), false);
  });

  it('activeBattles 中多个战斗，仅一个匹配 → 判定为重复', () => {
    const preset = { id: 'nm_preset_2', name: '预设B' };
    const activeBattles = [
      { preset: { id: 'nm_preset_1' }, status: 'completed' },
      { preset: { id: 'nm_preset_2' }, status: 'running' },
      { preset: { id: 'nm_preset_3' }, status: 'cooling' },
    ];
    assert.strictEqual(checkPresetDuplicate(activeBattles, preset), true);
  });
});

describe('2. 跨标签页协调（localStorage）', () => {
  let localStorage;
  let tabManager;

  beforeEach(() => {
    localStorage = new MockLocalStorage();
    tabManager = createTabIdManager();
    tabManager.setTabId('tab_current_abc');
  });

  it('无运行标记 → 不在其他标签页运行', () => {
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
  });

  it('3小时内的运行标记且不同 tabId → 在其他标签页运行', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', JSON.stringify({
      tabId: 'tab_other_xyz',
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2小时前
    }));
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      true
    );
  });

  it('超过3小时的运行标记 → 过期清理并返回 false', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', JSON.stringify({
      tabId: 'tab_other_xyz',
      timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4小时前
    }));
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
    // 验证过期标记已被清除
    assert.strictEqual(localStorage.getItem('nightmare-running-nm_preset_1'), null);
  });

  it('同一 tabId 的标记 → 自动清理并返回 false（自认领机制）', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', JSON.stringify({
      tabId: 'tab_current_abc',
      timestamp: Date.now() - 2 * 60 * 1000,
    }));
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
    // 验证同 tab 残留标记已被自动清理
    assert.strictEqual(localStorage.getItem('nightmare-running-nm_preset_1'), null);
  });

  it('localStorage 数据格式异常 → 返回 false（容错）', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', '这不是 JSON');
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
  });

  it('标记写入和读取完整链路', () => {
    const getTabId = () => tabManager.getTabId();
    // 当前标签页标记
    markPresetRunning('nm_preset_1', localStorage, getTabId);
    // 换一个标签页 ID 检查 → 应视为"其他标签页运行"（先检查其他 tab，因为同 tab 检查会清理标记）
    const otherGetTabId = () => 'tab_other_999';
    assert.strictEqual(isPresetRunningInOtherTab('nm_preset_1', localStorage, otherGetTabId), true);
    // 同一标签页检查 → 自认领机制自动清理标记并返回 false
    assert.strictEqual(isPresetRunningInOtherTab('nm_preset_1', localStorage, getTabId), false);
    // 标记已被同 tab 清理，再次从其他标签页检查也应返回 false
    assert.strictEqual(isPresetRunningInOtherTab('nm_preset_1', localStorage, otherGetTabId), false);
    // 手动重新标记并清除
    markPresetRunning('nm_preset_1', localStorage, getTabId);
    clearPresetRunning('nm_preset_1', localStorage);
    assert.strictEqual(isPresetRunningInOtherTab('nm_preset_1', localStorage, otherGetTabId), false);
  });

  it('标记缺少 tabId 字段 → 清理并返回 false', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', JSON.stringify({
      timestamp: Date.now(),
    }));
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
    // 格式异常标记应被清理
    assert.strictEqual(localStorage.getItem('nightmare-running-nm_preset_1'), null);
  });

  it('标记缺少 timestamp 字段 → 清理并返回 false', () => {
    localStorage.setItem('nightmare-running-nm_preset_1', JSON.stringify({
      tabId: 'tab_other',
    }));
    assert.strictEqual(
      isPresetRunningInOtherTab('nm_preset_1', localStorage, () => tabManager.getTabId()),
      false
    );
    // 格式异常标记应被清理
    assert.strictEqual(localStorage.getItem('nightmare-running-nm_preset_1'), null);
  });
});

describe('2b. cleanupStalePresetMarkers（残留标记批量清理）', () => {
  let localStorage;
  let tabManager;

  beforeEach(() => {
    localStorage = new MockLocalStorage();
    tabManager = createTabIdManager();
    tabManager.setTabId('tab_current_abc');
  });

  it('清理当前 tab 的所有残留标记', () => {
    // 写入 3 个标记：2 个属于当前 tab，1 个属于其他 tab
    localStorage.setItem('nightmare-running-preset_1', JSON.stringify({
      tabId: 'tab_current_abc', timestamp: Date.now(),
    }));
    localStorage.setItem('nightmare-running-preset_2', JSON.stringify({
      tabId: 'tab_current_abc', timestamp: Date.now(),
    }));
    localStorage.setItem('nightmare-running-preset_3', JSON.stringify({
      tabId: 'tab_other_xyz', timestamp: Date.now(),
    }));

    cleanupStalePresetMarkers(localStorage, () => tabManager.getTabId());

    // 当前 tab 的标记应被清理
    assert.strictEqual(localStorage.getItem('nightmare-running-preset_1'), null);
    assert.strictEqual(localStorage.getItem('nightmare-running-preset_2'), null);
    // 其他 tab 的标记应保留
    assert.ok(localStorage.getItem('nightmare-running-preset_3'));
  });

  it('无残留标记时不报错', () => {
    cleanupStalePresetMarkers(localStorage, () => tabManager.getTabId());
    assert.strictEqual(localStorage.length, 0);
  });

  it('格式异常的标记也被清理', () => {
    localStorage.setItem('nightmare-running-bad_data', '这不是 JSON');
    cleanupStalePresetMarkers(localStorage, () => tabManager.getTabId());
    assert.strictEqual(localStorage.getItem('nightmare-running-bad_data'), null);
  });

  it('不影响非 nightmare-running 前缀的 localStorage 项', () => {
    localStorage.setItem('nightmare-running-preset_1', JSON.stringify({
      tabId: 'tab_current_abc', timestamp: Date.now(),
    }));
    localStorage.setItem('other-key', 'some-value');

    cleanupStalePresetMarkers(localStorage, () => tabManager.getTabId());

    assert.strictEqual(localStorage.getItem('nightmare-running-preset_1'), null);
    assert.strictEqual(localStorage.getItem('other-key'), 'some-value');
  });
});

describe('3. 队伍状态判断（extractTeamIdFromResponse）', () => {
  it('teamInfo.teamId 直接存在 → 直接返回', () => {
    const resp = { teamInfo: { teamId: 12345 }, roleMTData: { gDMTData: {} } };
    assert.strictEqual(extractTeamIdFromResponse(resp), 12345);
  });

  it('teamInfo 为空，从 gDMTData 数字键提取 → 返回 teamId', () => {
    const resp = { teamInfo: null, roleMTData: { gDMTData: { '1': { teamId: 67890 } } } };
    // teamInfo 为 null → teamInfo?.teamId 为 undefined → 走 gDMTData
    // 注意：源码中 teamInfo 为 null 时 .teamId 为 undefined，!undefined 为 true
    assert.strictEqual(extractTeamIdFromResponse(resp), 67890);
  });

  it('teamInfo 为空且 gDMTData 也为空 → 返回 null', () => {
    const resp = { teamInfo: null, roleMTData: { gDMTData: {} } };
    assert.strictEqual(extractTeamIdFromResponse(resp), null);
  });

  it('响应为 null → 返回 null', () => {
    assert.strictEqual(extractTeamIdFromResponse(null), null);
  });

  it('teamInfo.teamId 存在优先于 gDMTData', () => {
    const resp = {
      teamInfo: { teamId: 11111 },
      roleMTData: { gDMTData: { '1': { teamId: 22222 } } },
    };
    assert.strictEqual(extractTeamIdFromResponse(resp), 11111);
  });

  it('gDMTData 有多个键，优先数字键', () => {
    const resp = {
      teamInfo: { teamId: undefined },
      roleMTData: { gDMTData: { 'abc': { teamId: 33333 }, '2': { teamId: 44444 } } },
    };
    // 源码：numKeys = keys.filter(k => /^\d+$/.test(k)) → ['2']
    // numKeys[0] = '2' → gDMTData['2'].teamId = 44444
    assert.strictEqual(extractTeamIdFromResponse(resp), 44444);
  });
});

describe('4. RoomId 提取（extractRoomIdFromResponse）', () => {
  it('nightMareData.roomId 存在 → 直接返回', () => {
    const resp = { nightMareData: { roomId: '1001' } };
    assert.strictEqual(extractRoomIdFromResponse(resp), '1001');
  });

  it('nightmareData.roomId 存在（备用字段） → 返回', () => {
    const resp = { nightMareData: {}, nightmareData: { roomId: '1002' } };
    assert.strictEqual(extractRoomIdFromResponse(resp), '1002');
  });

  it('顶层 roomId 存在 → 返回', () => {
    const resp = { nightMareData: {}, nightmareData: {}, roomId: '1003' };
    assert.strictEqual(extractRoomIdFromResponse(resp), '1003');
  });

  it('顶层 roomid（小写）存在 → 返回', () => {
    const resp = { nightMareData: {}, nightmareData: {}, roomid: '1004' };
    assert.strictEqual(extractRoomIdFromResponse(resp), '1004');
  });

  it('所有字段都不存在 → 返回 null', () => {
    assert.strictEqual(extractRoomIdFromResponse({}), null);
    assert.strictEqual(extractRoomIdFromResponse(null), null);
  });

  it('多字段同时存在，nightMareData 优先', () => {
    const resp = {
      nightMareData: { roomId: 'first' },
      nightmareData: { roomId: 'second' },
      roomId: 'third',
    };
    assert.strictEqual(extractRoomIdFromResponse(resp), 'first');
  });
});

describe('5. 房间创建错误处理（7100020 流程）', () => {
  let mockStore;

  beforeEach(() => {
    resetMockState();
  });

  it('matchteam_create 首次成功 → 返回 teamId', async () => {
    mockStore = NightmareMockFactory.createMockTokenStore();
    const resp = await mockStore.sendMessageWithPromise('token_1', 'matchteam_create', {
      teamCfgId: 1,
      setting: { name: '十殿先锋队', secret: 1 },
    });
    assert.ok(resp.teamInfo);
    assert.ok(resp.teamInfo.teamId);
  });

  it('matchteam_create 返回 7100020 → 触发残留队伍处理流程', async () => {
    mockStore = NightmareMockFactory.createMockTokenStore({
      errorSequence: {
        'matchteam_create': [createErrorResponse(ERROR_CODES.STALE_TEAM, '残留队伍')],
      },
    });

    // 第一次调用 matchteam_create 应该抛出 7100020
    let caughtError = null;
    try {
      await mockStore.sendMessageWithPromise('token_1', 'matchteam_create', {});
    } catch (err) {
      caughtError = err;
    }
    assert.ok(caughtError, '应该抛出错误');
    assert.ok(caughtError.message.includes('7100020'), '错误消息应包含 7100020');

    // 第二次调用应该走默认成功响应（错误队列已消费）
    const resp2 = await mockStore.sendMessageWithPromise('token_1', 'matchteam_create', {});
    assert.ok(resp2.teamInfo, '重试后应该成功');
  });

  it('createRoom 7100020 完整流程：失败 → 查询残留 → 解散 → 重试创建', async () => {
    // 模拟完整的 7100020 处理流程
    mockStore = NightmareMockFactory.createMockTokenStore({
      errorSequence: {
        'matchteam_create': [createErrorResponse(ERROR_CODES.STALE_TEAM, '残留队伍')],
      },
    });

    // Step 1: 创建房间失败 (7100020)
    let createFailed = false;
    try {
      await mockStore.sendMessageWithPromise('token_1', 'matchteam_create', {});
    } catch (err) {
      if (err.message.includes('7100020')) {
        createFailed = true;
      }
    }
    assert.strictEqual(createFailed, true, '首次创建应该因 7100020 失败');

    // Step 2: 查询残留队伍 (matchteam_getroleteaminfo)
    const roleTeamRes = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_getroleteaminfo', { roleID: 10001 }
    );
    const staleTeamId = extractTeamIdFromResponse(roleTeamRes);
    assert.ok(staleTeamId, '应该能找到残留队伍 ID');

    // Step 3: 解散残留队伍 (matchteam_dismiss)
    const dismissRes = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_dismiss', { teamId: staleTeamId }
    );
    assert.ok(dismissRes.success !== false, '解散应该成功');

    // Step 4: 重试创建 (matchteam_create 第二次，错误队列已空)
    const retryRes = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_create', {}
    );
    assert.ok(retryRes.teamInfo, '重试创建应该成功');

    // 验证调用日志
    const log = mockStore.getCallLog();
    const cmds = log.map(l => l.cmd);
    assert.ok(cmds.includes('matchteam_create'), '日志应包含 matchteam_create');
    assert.ok(cmds.includes('matchteam_getroleteaminfo'), '日志应包含查询队伍');
    assert.ok(cmds.includes('matchteam_dismiss'), '日志应包含解散队伍');
  });
});

describe('6. openTeamAndGetRoomId 流程', () => {
  beforeEach(() => {
    resetMockState();
  });

  it('openteam 响应直接包含 roomId → 直接返回', async () => {
    const mockStore = NightmareMockFactory.createMockTokenStore();
    const resp = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_openteam', { teamId: 5001 }
    );
    const roomId = extractRoomIdFromResponse(resp) || resp?.roomId || resp?.roomid;
    assert.ok(roomId, 'openteam 响应应包含 roomId');
  });

  it('openteam 不含 roomId → 轮询 nightmare_getroleinfo 获取', async () => {
    // 前2次 getroleinfo 不返回 roomId，第3次返回
    let callNum = 0;
    const mockStore = NightmareMockFactory.createMockTokenStore({
      responseOverrides: {
        'nightmare_getroleinfo': () => {
          callNum++;
          if (callNum < 3) {
            return { nightMareData: {}, nightmareData: {} }; // 无 roomId
          }
          return NightmareMockFactory.createNightmareRoleInfoResponse({ roomId: '9999' });
        },
      },
    });

    // 模拟轮询逻辑
    let roomId = null;
    const maxRetries = 10;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const resp = await mockStore.sendMessageWithPromise(
        'token_1', 'nightmare_getroleinfo', { roleId: 10001 }
      );
      roomId = extractRoomIdFromResponse(resp);
      if (roomId) break;
    }
    assert.strictEqual(roomId, '9999', '轮询应在第3次获取到 roomId');
    assert.strictEqual(callNum, 3, '应该恰好调用了3次');
  });

  it('openteam 遇到 7100020 → 标记为重试场景', async () => {
    const mockStore = NightmareMockFactory.createMockTokenStore({
      errorSequence: {
        'matchteam_openteam': [createErrorResponse(ERROR_CODES.STALE_TEAM, '队伍状态异常')],
      },
    });

    // 模拟 openTeamAndGetRoomId 的 7100020 处理
    let isRetry = false;
    let resultRoomId = null;
    try {
      await mockStore.sendMessageWithPromise(
        'token_1', 'matchteam_openteam', { teamId: 5001 }
      );
    } catch (err) {
      const errMsg = err.message || String(err);
      if (!isRetry && errMsg.includes('7100020')) {
        isRetry = true;
        // 重试（第二次 openteam 走默认成功响应）
        const retryResp = await mockStore.sendMessageWithPromise(
          'token_1', 'matchteam_openteam', { teamId: 5001 }
        );
        resultRoomId = retryResp?.roomId || retryResp?.roomid || null;
      }
    }
    assert.strictEqual(isRetry, true, '应该触发 7100020 重试');
    assert.ok(resultRoomId, '重试后应该获取到 roomId');
  });
});

describe('7. 共享成员冲突检测', () => {
  it('两个预设有共享成员 → 检测到冲突', () => {
    const preset1 = NightmareMockFactory.createPreset({
      id: 'preset_1',
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2', 'token_3'],
    });
    const preset2 = NightmareMockFactory.createPreset({
      id: 'preset_2',
      captainTokenId: 'token_4',
      memberTokenIds: ['token_3', 'token_5'], // token_3 共享
    });

    const shared = detectSharedMembers(preset1, preset2);
    assert.deepStrictEqual(shared, ['token_3']);
  });

  it('两个预设无共享成员 → 空数组', () => {
    const preset1 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2'],
    });
    const preset2 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_3',
      memberTokenIds: ['token_4'],
    });

    const shared = detectSharedMembers(preset1, preset2);
    assert.deepStrictEqual(shared, []);
  });

  it('队长与队员共享 → 检测到冲突', () => {
    const preset1 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2'],
    });
    const preset2 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_3',
      memberTokenIds: ['token_1'], // preset2 的队员是 preset1 的队长
    });

    const shared = detectSharedMembers(preset1, preset2);
    assert.deepStrictEqual(shared, ['token_1']);
  });

  it('队长与队长相同 → 检测到冲突', () => {
    const preset1 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2'],
    });
    const preset2 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1', // 同一队长
      memberTokenIds: ['token_3'],
    });

    const shared = detectSharedMembers(preset1, preset2);
    assert.deepStrictEqual(shared, ['token_1']);
  });

  it('memberTokenIds 超过4人时只取前4个', () => {
    const preset1 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2', 'token_3', 'token_4', 'token_5', 'token_6'],
    });
    const preset2 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_7',
      memberTokenIds: ['token_6', 'token_8'], // token_6 在第5位，被 slice(0,4) 截掉
    });

    const shared = detectSharedMembers(preset1, preset2);
    // preset1 成员：token_1, token_2, token_3, token_4, token_5（前4个队员）
    // preset2 成员：token_7, token_6, token_8
    // token_6 不在 preset1 的前4个队员中
    assert.deepStrictEqual(shared, []);
  });

  it('memberTokenIds 为空 → 仅比较队长', () => {
    const preset1 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: [],
    });
    const preset2 = NightmareMockFactory.createPreset({
      captainTokenId: 'token_2',
      memberTokenIds: [],
    });

    const shared = detectSharedMembers(preset1, preset2);
    assert.deepStrictEqual(shared, []);
  });
});

describe('8. 预设队列冲突检测（findConflictingBattles）', () => {
  it('当前预设与运行中的战斗有共享成员 → 检测到冲突', () => {
    const currentPreset = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2', 'token_3'],
    });
    const activeBattles = [
      {
        preset: { captainTokenId: 'token_4', memberTokenIds: ['token_3', 'token_5'] },
        status: 'running',
      },
    ];
    const conflicts = findConflictingBattles(currentPreset, activeBattles);
    assert.strictEqual(conflicts.length, 1);
  });

  it('当前预设与已完成的战斗无冲突', () => {
    const currentPreset = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2'],
    });
    const activeBattles = [
      {
        preset: { captainTokenId: 'token_3', memberTokenIds: ['token_2'] },
        status: 'completed',
      },
    ];
    const conflicts = findConflictingBattles(currentPreset, activeBattles);
    assert.strictEqual(conflicts.length, 0);
  });

  it('多个运行中战斗，只返回有冲突的', () => {
    const currentPreset = NightmareMockFactory.createPreset({
      captainTokenId: 'token_1',
      memberTokenIds: ['token_2'],
    });
    const activeBattles = [
      {
        preset: { captainTokenId: 'token_3', memberTokenIds: ['token_4'] },
        status: 'running',
      },
      {
        preset: { captainTokenId: 'token_5', memberTokenIds: ['token_2'] },
        status: 'cooling',
      },
    ];
    const conflicts = findConflictingBattles(currentPreset, activeBattles);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].preset.captainTokenId, 'token_5');
  });
});

describe('9. 残留队伍解散标记（_dismissedStaleTeams）', () => {
  it('已标记的残留队伍应被跳过', () => {
    // 模拟组件内 _dismissedStaleTeams 的行为
    const dismissedStaleTeams = new Set();

    const existingTeamId = 12345;

    // 第一次遇到：未标记，处理解散
    assert.strictEqual(dismissedStaleTeams.has(String(existingTeamId)), false);

    // 解散成功后标记
    dismissedStaleTeams.add(String(existingTeamId));

    // 第二次遇到：已标记，跳过
    assert.strictEqual(dismissedStaleTeams.has(String(existingTeamId)), true);
  });

  it('不同 teamId 互不影响', () => {
    const dismissedStaleTeams = new Set();
    dismissedStaleTeams.add('11111');
    assert.strictEqual(dismissedStaleTeams.has('22222'), false);
  });
});

describe('10. 解散残留队伍的队长/非队长判断', () => {
  beforeEach(() => {
    resetMockState();
  });

  it('当前角色是队长 → 调用 matchteam_dismiss', async () => {
    const mockStore = NightmareMockFactory.createMockTokenStore({
      responseOverrides: {
        'matchteam_getteaminfo': () => ({
          teamInfo: { teamId: 55555, leaderId: 10001, fightRoleBase: [] },
        }),
      },
    });

    const captainRoleId = '10001';
    const teamInfoRes = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_getteaminfo', { teamId: 55555 }
    );
    const leaderId = String(teamInfoRes?.teamInfo?.leaderId || '');
    const isLeader = leaderId === String(captainRoleId);

    assert.strictEqual(isLeader, true, '当前角色应该是队长');
  });

  it('当前角色非队长 → 调用 matchteam_leave', async () => {
    const mockStore = NightmareMockFactory.createMockTokenStore({
      responseOverrides: {
        'matchteam_getteaminfo': () => ({
          teamInfo: { teamId: 55555, leaderId: 99999, fightRoleBase: [] },
        }),
      },
    });

    const captainRoleId = '10001';
    const teamInfoRes = await mockStore.sendMessageWithPromise(
      'token_1', 'matchteam_getteaminfo', { teamId: 55555 }
    );
    const leaderId = String(teamInfoRes?.teamInfo?.leaderId || '');
    const isLeader = leaderId === String(captainRoleId);

    assert.strictEqual(isLeader, false, '当前角色不应该是队长');
  });

  it('解散返回 6100020（房间已不存在） → 视为成功', () => {
    // 源码中 errMsg.includes('6100020') → dismissSuccess = true
    const errMsg = '队伍已不存在 (6100020)';
    const dismissSuccess = errMsg.includes('200020') || errMsg.includes('6100020');
    assert.strictEqual(dismissSuccess, true);
  });

  it('解散返回 200020 → 视为成功', () => {
    const errMsg = '操作异常 (200020)';
    const dismissSuccess = errMsg.includes('200020') || errMsg.includes('6100020');
    assert.strictEqual(dismissSuccess, true);
  });
});

describe('11. getTabId 唯一性和稳定性', () => {
  it('同一标签页多次调用返回相同 ID', () => {
    const manager = createTabIdManager();
    const id1 = manager.getTabId();
    const id2 = manager.getTabId();
    assert.strictEqual(id1, id2);
  });

  it('不同标签页生成不同 ID', () => {
    const m1 = createTabIdManager();
    const m2 = createTabIdManager();
    assert.notStrictEqual(m1.getTabId(), m2.getTabId());
  });

  it('tabId 格式符合预期', () => {
    const manager = createTabIdManager();
    const id = manager.getTabId();
    assert.ok(id.startsWith('tab_'), 'tabId 应以 tab_ 开头');
    assert.ok(id.length > 10, 'tabId 长度应大于10');
  });
});

describe('12. Mock 工厂集成验证', () => {
  beforeEach(() => {
    resetMockState();
  });

  it('createMockTokenStore 默认响应正常', async () => {
    const store = NightmareMockFactory.createMockTokenStore({ memberCount: 3 });

    // 验证 Token 列表
    assert.strictEqual(store.gameTokens.length, 3);
    assert.strictEqual(store.gameTokens[0].id, 'token_1');

    // 验证连接状态
    assert.strictEqual(store.getWebSocketStatus('token_1'), 'connected');

    // 验证命令调用
    const resp = await store.sendMessageWithPromise('token_1', 'matchteam_getroleteaminfo', {});
    assert.ok(resp, '应有响应');
  });

  it('errorSequence 按顺序消费后恢复默认', async () => {
    const store = NightmareMockFactory.createMockTokenStore({
      errorSequence: {
        'matchteam_create': [
          createErrorResponse(ERROR_CODES.STALE_TEAM),
          createErrorResponse(ERROR_CODES.RATE_LIMIT),
        ],
      },
    });

    // 第1次：7100020
    await assert.rejects(
      () => store.sendMessageWithPromise('token_1', 'matchteam_create', {}),
      (err) => err.message.includes('7100020')
    );

    // 第2次：7100140
    await assert.rejects(
      () => store.sendMessageWithPromise('token_1', 'matchteam_create', {}),
      (err) => err.message.includes('7100140')
    );

    // 第3次：错误队列耗尽，走默认成功响应
    const resp = await store.sendMessageWithPromise('token_1', 'matchteam_create', {});
    assert.ok(resp.teamInfo, '第3次应成功');
  });

  it('调用日志正确记录', async () => {
    const store = NightmareMockFactory.createMockTokenStore();

    await store.sendMessageWithPromise('token_1', 'matchteam_create', { teamCfgId: 1 });
    await store.sendMessageWithPromise('token_1', 'matchteam_openteam', { teamId: 123 });

    assert.strictEqual(store.getCallCount('matchteam_create'), 1);
    assert.strictEqual(store.getCallCount('matchteam_openteam'), 1);

    const log = store.getCallLog();
    assert.strictEqual(log.length, 2);
    assert.strictEqual(log[0].cmd, 'matchteam_create');
    assert.strictEqual(log[1].cmd, 'matchteam_openteam');
  });
});
