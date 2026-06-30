/**
 * 十殿阎罗挑战 - Mock 数据工厂
 * 为 NightmareAutoBattleService 和 NightmareChallengeCard 提供完整测试数据
 * 使用 ES Module 语法，与项目保持一致
 */

// ====== 内部状态（可通过 resetMockState 重置） ======
let _globalState = {
  callCount: {},       // 每个命令的调用计数
  callLog: [],         // 所有调用记录 [{ cmd, params, tokenId, timestamp }]
  errorQueues: {},     // 每个命令的错误队列（消费式）
  responseOverrides: {}, // 自定义响应覆盖
  roomIdCounter: 1000, // 自增 roomId
  teamIdCounter: 5000, // 自增 teamId
};

/**
 * 重置所有 mock 状态（测试间隔离）
 */
export function resetMockState() {
  _globalState = {
    callCount: {},
    callLog: [],
    errorQueues: {},
    responseOverrides: {},
    roomIdCounter: 1000,
    teamIdCounter: 5000,
  };
}

/**
 * 获取调用日志（用于断言）
 */
export function getCallLog() {
  return [..._globalState.callLog];
}

/**
 * 获取指定命令的调用次数
 */
export function getCallCount(cmd) {
  return _globalState.callCount[cmd] || 0;
}

// ====== Boss 数据字典（1~8关） ======
export const BOSS_DATA = {
  1: { name: '秦广王', bossHp: 2253_0000_0000, minionHp: 751_2000_0000 },
  2: { name: '楚江王', bossHp: 2479_0000_0000, minionHp: 826_4000_0000 },
  3: { name: '宋帝王', bossHp: 2727_0000_0000, minionHp: null },
  4: { name: '五官王', bossHp: 2999_0000_0000, minionHp: null },
  5: { name: '阎罗王', bossHp: 3299_0000_0000, minionHp: 3005_0000_0000 },
  6: { name: '卞城王', bossHp: 300, minionHp: null },  // 特殊低血量
  7: { name: '泰山王', bossHp: 7512_0000_0000, minionHp: null },
  8: { name: '都市王', bossHp: 7888_0000_0000, minionHp: null },
};

// ====== 武将名称字典 ======
export const HERO_NAMES = {
  107: '吕布', 108: '赵云', 109: '关羽', 110: '诸葛亮', 111: '曹操',
  112: '貂蝉', 113: '周瑜', 114: '司马懿', 115: '张飞', 116: '黄月英',
  117: '孙尚香', 118: '大乔', 119: '小乔', 120: '孙策', 121: '孙权',
  122: '刘备', 123: '太史慈', 124: '甘宁', 125: '吕蒙', 126: '陆逊',
  127: '郭嘉', 128: '贾诩', 129: '许褚', 130: '典韦', 131: '夏侯惇',
  140: '华佗', 141: '左慈', 142: '于吉', 143: '南华老仙',
};

// ====== 错误码定义 ======
export const ERROR_CODES = {
  ROOM_ALREADY_FIGHT: 6100070,    // 成员已出战
  ROOM_NOT_FOUND: 6100020,        // 房间已不存在
  ROOM_INVALID: 6100010,          // 房间状态异常/已被服务器清理
  STALE_TEAM: 7100020,            // 残留队伍状态异常
  RATE_LIMIT: 7100140,            // 限流中
};

// ====== 工具函数 ======

/** 深拷贝对象 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** 生成自增 ID */
function nextRoomId() {
  return String(++_globalState.roomIdCounter);
}
function nextTeamId() {
  return String(++_globalState.teamIdCounter);
}

// ====== 错误响应生成 ======

/**
 * 生成指定错误码的错误对象
 * sendMessageWithPromise 在出错时会 reject(new Error(message))
 * 错误消息中包含错误码，业务代码通过 errMsg.includes('7100020') 判断
 *
 * @param {number} errorCode - 错误码
 * @param {string} [message] - 可选自定义消息
 * @returns {Error} 模拟 sendMessageWithPromise 抛出的 Error
 */
export function createErrorResponse(errorCode, message) {
  const msg = message || `操作失败，错误码: ${errorCode}`;
  const err = new Error(`${msg} (${errorCode})`);
  err.errorCode = errorCode;
  return err;
}

/**
 * 生成带错误码的 reject Promise（模拟 sendMessageWithPromise 失败）
 * @param {number} errorCode
 * @param {string} [message]
 * @returns {Promise}
 */
export function createRejectedPromise(errorCode, message) {
  return Promise.reject(createErrorResponse(errorCode, message));
}

// ====== 关卡怪物数据生成 ======

/**
 * 生成指定关卡的怪物团队数据（模拟 monsterTeamInfo[level] 结构）
 *
 * @param {number} level - 关卡 1~8
 * @param {Object} [options]
 * @param {number} [options.bossDamagePercent=0] - Boss 已损血百分比 (0~100)
 * @param {number} [options.minionDamagePercent=0] - 喽啰已损血百分比 (0~100)
 * @param {boolean} [options.bossDead=false] - Boss 是否已击杀
 * @param {boolean} [options.minionDead=false] - 喽啰是否已击杀
 * @returns {Object} monsterTeamInfo[level] 结构
 */
export function createLevelMonsters(level, options = {}) {
  const {
    bossDamagePercent = 0,
    minionDamagePercent = 0,
    bossDead = false,
    minionDead = false,
  } = options;

  const bossData = BOSS_DATA[level];
  if (!bossData) throw new Error(`无效关卡: ${level}，有效范围 1~8`);

  // Boss 怪物 ID 格式：1000X（5位）
  const bossId = Number(`1000${level}`);
  const bossMaxHp = bossData.bossHp;
  const bossCurHp = bossDead ? 0 : Math.floor(bossMaxHp * (1 - bossDamagePercent / 100));

  const team = {
    '0': { id: bossId, hp: bossMaxHp },
  };

  const curMonsterData = {
    [String(bossId)]: { curHp: bossCurHp },
  };

  // 喽啰（仅关卡 1, 2, 5 有）
  if (bossData.minionHp && bossData.minionHp > 0) {
    // 喽啰 ID 格式：1000X01（7位）
    const minionId = Number(`1000${level}01`);
    const minionMaxHp = bossData.minionHp;
    const minionCurHp = minionDead ? 0 : Math.floor(minionMaxHp * (1 - minionDamagePercent / 100));
    team['1'] = { id: minionId, hp: minionMaxHp };
    curMonsterData[String(minionId)] = { curHp: minionCurHp };
  }

  return {
    monsterTeam: { team },
    curMonsterData,
  };
}

// ====== RoomInfo 生成 ======

/**
 * 生成完整的 roomInfo 响应数据
 *
 * @param {Object} [options]
 * @param {string} [options.roomId] - 房间 ID
 * @param {number} [options.currentLevel=1] - 当前关卡
 * @param {number} [options.memberCount=3] - 成员数量（含队长）
 * @param {string} [options.captainRoleId='10001'] - 队长 roleId
 * @param {Array} [options.members] - 自定义成员数组（覆盖自动生成）
 * @param {Object} [options.monsterOptions] - 怪物选项（透传 createLevelMonsters）
 * @param {Object} [options.attackRecords] - 出战记录 { level: [roleId1, ...] }
 * @returns {Object} roomInfo 完整结构
 */
export function createRoomInfo(options = {}) {
  const {
    roomId = '28314045',
    currentLevel = 1,
    memberCount = 3,
    captainRoleId = '10001',
    members: customMembers = null,
    monsterOptions = {},
    attackRecords = {},
  } = options;

  // 构建怪物数据
  const levelMonster = createLevelMonsters(currentLevel, monsterOptions);
  const monsterTeamInfo = {};
  // 为所有关卡生成怪物数据（默认满血），当前关卡可自定义
  for (let lvl = 1; lvl <= 8; lvl++) {
    if (lvl === currentLevel) {
      monsterTeamInfo[String(lvl)] = levelMonster;
    } else {
      monsterTeamInfo[String(lvl)] = createLevelMonsters(lvl);
    }
  }

  // 构建成员数据（fightRoleBase）
  const fightRoleBase = customMembers || _generateMembers(memberCount, captainRoleId, attackRecords);

  // 构建 playerTeamInfo（当前武将血量数据）
  const playerTeamInfo = {};
  for (const member of fightRoleBase) {
    const curHeroData = {};
    const team = member.battleData?.team || {};
    for (const [slotKey, hero] of Object.entries(team)) {
      if (hero && hero.id) {
        curHeroData[String(hero.id)] = { curHp: hero.hp || 100000 };
      }
    }
    playerTeamInfo[String(member.roleId)] = { curHeroData };
  }

  return {
    curMonsterCfgId: currentLevel,
    monsterTeamInfo,
    fightRoleBase,
    playerTeamInfo,
    roomId,
  };
}

/**
 * 生成成员列表（fightRoleBase 结构）
 * @private
 */
function _generateMembers(count, captainRoleId, attackRecords = {}) {
  const members = [];
  const heroPool = Object.keys(HERO_NAMES).map(Number);

  for (let i = 0; i < count; i++) {
    const roleId = Number(captainRoleId) + i;
    const isCaptain = i === 0;
    const name = isCaptain ? '队长' : `队员${i}`;

    // 每人分配 5 个武将
    const team = {};
    const startIdx = i * 5;
    for (let slot = 0; slot < 5; slot++) {
      const heroId = heroPool[(startIdx + slot) % heroPool.length];
      team[String(slot)] = {
        id: heroId,
        hp: 100000,
      };
    }

    members.push({
      roleId,
      name,
      battleData: { team },
    });
  }

  return members;
}

// ====== 命令响应生成器 ======

/**
 * 生成 nightmare_fight 命令响应
 * @param {Object} [_options] - 预留参数（当前未使用，后续可扩展为自定义战斗结果）
 * @returns {Object}
 */
export function createFightResponse(_options = {}) {
  return deepClone({ success: true, timestamp: Date.now() });
}

/**
 * 生成 nightmare_leadercomplete 命令响应
 * @param {Object} [_options] - 预留参数（当前未使用，后续可扩展为关卡推进结果）
 * @returns {Object}
 */
export function createLeaderCompleteResponse(_options = {}) {
  return deepClone({ success: true, timestamp: Date.now() });
}

/**
 * 生成 matchteam_getroleteaminfo 命令响应
 * @param {Object} [options]
 * @param {string} [options.teamId] - 队伍 ID
 * @param {boolean} [options.hasTeam=true] - 是否有队伍
 * @param {number} [options.lockedTime=0] - 队伍锁定时间（0=本周未锁定）
 * @returns {Object}
 */
export function createGetRoleTeamInfoResponse(options = {}) {
  const {
    teamId = nextTeamId(),
    hasTeam = true,
    lockedTime = 0,
  } = options;

  if (!hasTeam) {
    return deepClone({ teamInfo: null, roleMTData: { gDMTData: {} } });
  }

  return deepClone({
    teamInfo: {
      teamId: Number(teamId),
      leaderId: 10001,
      lockedTime,
      fightRoleBase: [],
    },
    roleMTData: {
      gDMTData: {
        '1': { teamId: Number(teamId) },
      },
    },
  });
}

/**
 * 生成 matchteam_openteam 命令响应
 * @param {Object} [options]
 * @param {string} [options.roomId] - 战斗房间 ID
 * @returns {Object}
 */
export function createOpenTeamResponse(options = {}) {
  const roomId = options.roomId || nextRoomId();
  return deepClone({
    roomId: String(roomId),
    roomid: String(roomId),
    roomInfo: { roomId: String(roomId) },
  });
}

/**
 * 生成 nightmare_getroominfo 命令响应
 * @param {Object} [options]
 * @param {Object} [options.roomInfo] - 自定义 roomInfo（透传 createRoomInfo）
 * @param {string} [options.captainRoleId='10001'] - 队长 roleId
 * @returns {Object}
 */
export function createGetRoomInfoResponse(options = {}) {
  const { captainRoleId = '10001', roomInfo: customRoomInfo = null } = options;
  const roomInfo = customRoomInfo || createRoomInfo(options);
  return deepClone({
    roomInfo,
    captainRoleId,
  });
}

/**
 * 生成 matchteam_create 命令响应
 * @param {Object} [options]
 * @param {string} [options.teamId] - 队伍 ID
 * @param {number} [options.memberCount=1] - 初始成员数（仅队长）
 * @returns {Object}
 */
export function createCreateRoomResponse(options = {}) {
  const teamId = options.teamId || nextTeamId();
  const memberCount = options.memberCount || 1;

  const fightRoleBase = [];
  for (let i = 0; i < memberCount; i++) {
    fightRoleBase.push({
      roleId: 10001 + i,
      name: i === 0 ? '队长' : `队员${i}`,
      battleData: { team: {} },
    });
  }

  return deepClone({
    teamInfo: {
      teamId: Number(teamId),
      leaderId: 10001,
      fightRoleBase,
    },
  });
}

/**
 * 生成 nightmare_dismiss 命令响应
 * @param {Object} [options]
 * @returns {Object}
 */
export function createDismissResponse(options = {}) {
  return deepClone({ success: true });
}

/**
 * 生成 matchteam_join 命令响应
 * @param {Object} [options]
 * @returns {Object}
 */
export function createJoinResponse(options = {}) {
  return deepClone({ success: true });
}

/**
 * 生成 matchteam_memberprepare 命令响应
 * @param {Object} [options]
 * @returns {Object}
 */
export function createPrepareResponse(options = {}) {
  return deepClone({ success: true });
}

/**
 * 生成 nightmare_getroleinfo 命令响应
 * @param {Object} [options]
 * @param {string} [options.roomId] - 战斗房间 ID
 * @returns {Object}
 */
export function createNightmareRoleInfoResponse(options = {}) {
  const roomId = options.roomId || nextRoomId();
  return deepClone({
    nightMareData: {
      roomId: String(roomId),
    },
    nightmareData: {
      roomId: String(roomId),
    },
    roomId: String(roomId),
  });
}

/**
 * 生成 matchteam_getrandteamlist 命令响应
 * @returns {Object}
 */
export function createGetRandTeamListResponse() {
  return deepClone({ success: true, teamList: [] });
}

/**
 * 生成 matchteam_getteaminfo 命令响应
 * @param {Object} [options]
 * @param {string} [options.teamId]
 * @param {number} [options.leaderId=10001]
 * @returns {Object}
 */
export function createGetTeamInfoResponse(options = {}) {
  const teamId = options.teamId || nextTeamId();
  return deepClone({
    teamInfo: {
      teamId: Number(teamId),
      leaderId: options.leaderId || 10001,
      fightRoleBase: [],
    },
  });
}

/**
 * 生成 matchteam_dismiss 命令响应
 * @returns {Object}
 */
export function createTeamDismissResponse() {
  return deepClone({ success: true });
}

/**
 * 生成 nightmare_restore 命令响应
 * @returns {Object}
 */
export function createRestoreResponse() {
  return deepClone({ success: true });
}

/**
 * 生成 nightmare_fullrage 命令响应
 * @returns {Object}
 */
export function createFullRageResponse() {
  return deepClone({ success: true });
}

// ====== 预设配置生成 ======

/**
 * 生成预设配置
 * @param {Object} [options]
 * @param {string} [options.id] - 预设 ID
 * @param {string} [options.name] - 预设名称
 * @param {string} [options.captainTokenId='token_1'] - 队长 tokenId
 * @param {Array<string>} [options.memberTokenIds] - 队员 tokenId 列表
 * @param {boolean} [options.waitLevel8=false] - 是否卡点等待第8关
 * @param {boolean} [options.usePresetTeam=true] - 是否使用预设队伍
 * @param {Object} [options.levelConfig] - 关卡配置
 * @returns {Object}
 */
export function createPreset(options = {}) {
  const {
    id = `preset_${Date.now()}`,
    name = '测试预设',
    captainTokenId = 'token_1',
    memberTokenIds = ['token_2', 'token_3'],
    waitLevel8 = false,
    usePresetTeam = true,
    levelConfig = {},
    teamSlots = {},
  } = options;

  return deepClone({
    id,
    name,
    captainTokenId,
    memberTokenIds,
    waitLevel8,
    usePresetTeam,
    levelConfig,
    teamSlots,
  });
}

/**
 * 生成预设成员配置
 * @param {Object} [options]
 * @param {string} [options.tokenId] - Token ID
 * @param {string} [options.name] - 成员名称
 * @param {string} [options.roleId] - 角色 ID
 * @returns {Object}
 */
export function createPresetMember(options = {}) {
  const {
    tokenId = 'token_1',
    name = '测试成员',
    roleId = '10001',
  } = options;

  return deepClone({ tokenId, name, roleId });
}

// ====== 默认命令→响应映射表 ======

const DEFAULT_RESPONSE_MAP = {
  'nightmare_getroominfo': (params) => createGetRoomInfoResponse({
    roomId: params?.roomId || '28314045',
  }),
  'nightmare_fight': () => createFightResponse(),
  'nightmare_leadercomplete': () => createLeaderCompleteResponse(),
  'nightmare_dismiss': () => createDismissResponse(),
  'nightmare_restore': () => createRestoreResponse(),
  'nightmare_fullrage': () => createFullRageResponse(),
  'nightmare_getroleinfo': (params) => createNightmareRoleInfoResponse({
    roomId: params?.roomId,
  }),
  'matchteam_openteam': () => createOpenTeamResponse(),
  'matchteam_create': () => createCreateRoomResponse(),
  'matchteam_getroleteaminfo': () => createGetRoleTeamInfoResponse(),
  'matchteam_getteaminfo': () => createGetTeamInfoResponse(),
  'matchteam_join': () => createJoinResponse(),
  'matchteam_memberprepare': () => createPrepareResponse(),
  'matchteam_dismiss': () => createTeamDismissResponse(),
  'matchteam_getrandteamlist': () => createGetRandTeamListResponse(),
  'matchteam_kick': () => deepClone({ success: true }),
  'matchteam_setleader': () => deepClone({ success: true }),
  'matchteam_leave': () => deepClone({ success: true }),
  'role_getroleinfo': () => deepClone({
    role: { roleId: 10001, name: '测试角色', level: 100 },
  }),
};

// ====== Mock TokenStore ======

/**
 * 创建完整的 mock tokenStore，可直接传入 NightmareAutoBattleService
 *
 * @param {Object} [options]
 * @param {Object} [options.responseOverrides] - 命令响应覆盖
 *   key: 命令名, value: 响应对象 或 function(params) => 响应对象
 * @param {Object} [options.errorSequence] - 错误序列注入
 *   key: 命令名, value: Error 数组（按顺序消费，耗尽后恢复默认响应）
 * @param {number} [options.memberCount=3] - Token 数量（1队长 + N-1队员）
 * @param {string} [options.wsStatus='connected'] - WebSocket 连接状态
 * @returns {Object} mock tokenStore
 */
export function createMockTokenStore(options = {}) {
  const {
    responseOverrides = {},
    errorSequence = {},
    memberCount = 3,
    wsStatus = 'connected',
  } = options;

  // 初始化内部错误队列
  const _errorQueues = {};
  for (const [cmd, errors] of Object.entries(errorSequence)) {
    _errorQueues[cmd] = [...errors];
  }

  // 初始化调用计数
  const _callCount = {};
  const _callLog = [];

  // 生成 Token 列表
  const gameTokens = [];
  for (let i = 0; i < memberCount; i++) {
    gameTokens.push({
      id: `token_${i + 1}`,
      name: i === 0 ? '队长' : `队员${i}`,
      token: `base64token${i + 1}`,
      server: 'server1',
      roleId: String(10001 + i),
      wsUrl: null,
    });
  }

  // 连接状态跟踪
  const _wsStatuses = {};
  for (const token of gameTokens) {
    _wsStatuses[token.id] = wsStatus;
  }

  /**
   * 核心：模拟 sendMessageWithPromise
   * 根据命令名分发到对应 mock 响应，支持错误队列和自定义覆盖
   */
  const sendMessageWithPromise = async (tokenId, cmd, params = {}, timeout = 5000) => {
    // 记录调用
    if (!_callCount[cmd]) _callCount[cmd] = 0;
    _callCount[cmd]++;
    _callLog.push({ cmd, params: deepClone(params), tokenId, timestamp: Date.now() });

    // 同步到全局状态（便于测试查询）
    if (!_globalState.callCount[cmd]) _globalState.callCount[cmd] = 0;
    _globalState.callCount[cmd]++;
    _globalState.callLog.push({ cmd, params: deepClone(params), tokenId, timestamp: Date.now() });

    // 1. 检查错误队列（优先消费）
    if (_errorQueues[cmd] && _errorQueues[cmd].length > 0) {
      const err = _errorQueues[cmd].shift();
      throw err;
    }

    // 2. 检查全局错误队列
    if (_globalState.errorQueues[cmd] && _globalState.errorQueues[cmd].length > 0) {
      const err = _globalState.errorQueues[cmd].shift();
      throw err;
    }

    // 3. 检查自定义响应覆盖（实例级别）
    if (responseOverrides[cmd]) {
      const override = responseOverrides[cmd];
      const result = typeof override === 'function' ? override(params) : deepClone(override);
      return result;
    }

    // 4. 检查全局响应覆盖
    if (_globalState.responseOverrides[cmd]) {
      const override = _globalState.responseOverrides[cmd];
      const result = typeof override === 'function' ? override(params) : deepClone(override);
      return result;
    }

    // 5. 使用默认响应映射
    const defaultHandler = DEFAULT_RESPONSE_MAP[cmd];
    if (defaultHandler) {
      return typeof defaultHandler === 'function'
        ? defaultHandler(params)
        : deepClone(defaultHandler);
    }

    // 未注册的命令返回空对象
    return {};
  };

  const mockStore = {
    // === 核心方法 ===
    sendMessageWithPromise,

    /**
     * 获取 WebSocket 连接状态
     * @param {string} tokenId
     * @returns {string} 'connected' | 'disconnected' | 'connecting' | 'error'
     */
    getWebSocketStatus: (tokenId) => {
      return _wsStatuses[tokenId] || 'disconnected';
    },

    /**
     * 创建 WebSocket 连接（mock：立即设为 connected）
     * @param {string} tokenId
     * @param {string} token
     * @param {string|null} wsUrl
     */
    createWebSocketConnection: async (tokenId, token, wsUrl) => {
      _wsStatuses[tokenId] = 'connected';
    },

    /**
     * 关闭 WebSocket 连接
     * @param {string} tokenId
     */
    closeWebSocketConnection: (tokenId) => {
      _wsStatuses[tokenId] = 'disconnected';
    },

    /**
     * 发送获取角色信息（tokenStore.sendGetRoleInfo 的 mock）
     * @param {string} tokenId
     * @param {Object} params
     * @returns {Object}
     */
    sendGetRoleInfo: async (tokenId, params = {}) => {
      return sendMessageWithPromise(tokenId, 'role_getroleinfo', params);
    },

    // === 数据 ===
    gameTokens,

    // === 辅助方法 ===

    /**
     * 根据 roleId 获取角色信息
     * @param {string|number} roleId
     * @returns {Object}
     */
    getRoleInfoById: (roleId) => {
      const token = gameTokens.find(t => t.roleId === String(roleId));
      return {
        roleId: Number(roleId),
        name: token?.name || `角色${roleId}`,
        level: 100,
        server: 'server1',
      };
    },

    /**
     * 设置某个 Token 的连接状态（测试辅助）
     * @param {string} tokenId
     * @param {string} status
     */
    setWebSocketStatus: (tokenId, status) => {
      _wsStatuses[tokenId] = status;
    },

    /**
     * 获取调用日志（测试断言用）
     * @returns {Array}
     */
    getCallLog: () => [..._callLog],

    /**
     * 获取指定命令调用次数
     * @param {string} cmd
     * @returns {number}
     */
    getCallCount: (cmd) => _callCount[cmd] || 0,

    /**
     * 重置调用日志和计数
     */
    resetCallLog: () => {
      for (const key of Object.keys(_callCount)) delete _callCount[key];
      _callLog.length = 0;
    },

    /**
     * 动态注入错误到队列（测试中动态使用）
     * @param {string} cmd
     * @param {Error} error
     */
    injectError: (cmd, error) => {
      if (!_errorQueues[cmd]) _errorQueues[cmd] = [];
      _errorQueues[cmd].push(error);
    },

    /**
     * 动态设置响应覆盖（测试中动态使用）
     * @param {string} cmd
     * @param {Object|Function} response
     */
    setResponseOverride: (cmd, response) => {
      responseOverrides[cmd] = response;
    },

    /**
     * 移除响应覆盖
     * @param {string} cmd
     */
    removeResponseOverride: (cmd) => {
      delete responseOverrides[cmd];
    },
  };

  return mockStore;
}

// ====== 便捷导出：NightmareMockFactory 命名空间 ======
export const NightmareMockFactory = {
  // Token/Store Mock
  createMockTokenStore,

  // Room Info Mock
  createRoomInfo,
  createLevelMonsters,

  // Command Response Mocks
  createFightResponse,
  createLeaderCompleteResponse,
  createGetRoleTeamInfoResponse,
  createOpenTeamResponse,
  createGetRoomInfoResponse,
  createCreateRoomResponse,
  createDismissResponse,
  createJoinResponse,
  createPrepareResponse,
  createNightmareRoleInfoResponse,
  createGetRandTeamListResponse,
  createGetTeamInfoResponse,
  createTeamDismissResponse,
  createRestoreResponse,
  createFullRageResponse,

  // Error Response Mock
  createErrorResponse,
  createRejectedPromise,

  // Preset Mock
  createPreset,
  createPresetMember,

  // 数据字典
  BOSS_DATA,
  HERO_NAMES,
  ERROR_CODES,
};
