/**
 * 集中式延迟管理模块
 *
 * 替代原来分散在各任务模块中的重复 _getModuleDelay 实现。
 * 将12个独立模块延迟合并为4个延迟分组（快速/标准/战斗/重度），
 * 每个功能模块映射到一个延迟分组，共用同一延迟控制。
 *
 * 延迟分组说明：
 *   fast   (500ms)  - 轻量操作：商店购买、罐子、挂机签到
 *   normal (800ms)  - 标准操作：日常任务、英雄升级、功法
 *   battle (1500ms) - 战斗操作：竞技场、爬塔、宝库、俱乐部、发车
 *   heavy  (3000ms) - 重度操作：消耗活动、十殿抽奖
 */

// ==================== 默认延迟分组配置 ====================

/** 延迟分组默认值（ms） */
export const DELAY_GROUPS = {
  /** 快速延迟 - 轻量操作 */
  fast: 2000,
  /** 标准延迟 - 常规操作 */
  normal: 3000,
  /** 战斗延迟 - 战斗/刷新操作 */
  battle: 3000,
  /** 重度延迟 - 复杂/耗时操作 */
  heavy: 5000,
};

/** 延迟分组默认值（存储于 localStorage 的 key） */
const STORAGE_KEY = 'batch_delay_groups';

// ==================== 模块 → 延迟分组映射 ====================

/**
 * 模块名 → 延迟分组映射表
 * 每个任务模块对应到一个延迟分组
 */
export const MODULE_DELAY_GROUP_MAP = {
  // === 快速操作 (fast) ===
  store: 'fast',     // 黑市/商店购买
  bottle: 'fast',    // 罐子（重置/领取）
  hangup: 'fast',    // 挂机/签到/答题

  // === 标准操作 (normal) ===
  daily: 'normal',   // 日常任务
  hero: 'normal',    // 英雄/鱼灵/宠物升级
  legacy: 'normal',  // 功法残卷
  default: 'normal', // 默认回退

  // === 战斗操作 (battle) ===
  arena: 'battle',   // 竞技场
  tower: 'battle',   // 爬塔/怪异塔
  treasure: 'battle',// 宝库/梦境
  club: 'battle',    // 俱乐部
  car: 'battle',     // 发车/收车
  dungeon: 'battle', // 宝库/梦境（别名）

  // === 重度操作 (heavy) ===
  activity: 'heavy',   // 消耗活动
  nightmare: 'heavy',  // 十殿抽奖
};

// ==================== 延迟分组中文标签 ====================

/** 延迟分组的中文显示名 */
export const DELAY_GROUP_LABELS = {
  fast: '快速操作',
  normal: '标准操作',
  battle: '战斗操作',
  heavy: '重度操作',
};

/** 延迟分组的描述说明 */
export const DELAY_GROUP_DESCRIPTIONS = {
  fast: '商店购买、罐子、挂机签到等轻量操作',
  normal: '日常任务、英雄升级、功法等标准操作',
  battle: '竞技场、爬塔、宝库、俱乐部、发车等战斗/刷新操作',
  heavy: '消耗活动、十殿抽奖等复杂耗时操作',
};

/** 延迟分组中涵盖的功能模块（用于UI提示） */
export const DELAY_GROUP_MODULES = {
  fast: ['黑市商店', '罐子', '挂机/签到/答题'],
  normal: ['日常任务', '英雄/鱼灵/宠物升级', '功法残卷'],
  battle: ['竞技场', '爬塔/怪塔', '宝库/梦境', '俱乐部', '智能发车'],
  heavy: ['消耗活动', '十殿抽奖'],
};

// ==================== 单账号加速配置 ====================

/** 单账号模式下的延迟倍率（0.2 = 原始延迟的 20%，即加速 5 倍） */
export const SINGLE_ACCOUNT_DELAY_MULTIPLIER = 0.2;

/** 单账号模式下命令延迟上限（ms） */
export const SINGLE_ACCOUNT_COMMAND_DELAY_CAP = 100;

// ==================== 核心 API ====================

/**
 * 获取持久化的延迟分组配置
 * @returns {object} 如 { fast: 500, normal: 800, battle: 1500, heavy: 3000 }
 */
export const loadDelayGroups = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并：只用已保存的值覆盖默认值，保留新增分组的默认值
      return { ...DELAY_GROUPS, ...parsed };
    }
  } catch (e) {
    console.warn('[delayManager] 读取延迟分组配置失败:', e);
  }
  return { ...DELAY_GROUPS };
};

/**
 * 保存延迟分组配置到 localStorage
 * @param {object} groups - 延迟分组配置
 */
export const saveDelayGroups = (groups) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.warn('[delayManager] 保存延迟分组配置失败:', e);
  }
};

/**
 * 根据模块名获取对应的延迟值（ms）
 *
 * 优先级：
 *   1. 用户自定义的延迟分组值（来自 batchSettings.delayGroups）
 *   2. 延迟分组默认值（DELAY_GROUPS）
 *   3. 回退到 batchSettings.taskDelay
 *
 * @param {string} moduleName - 模块名称（如 'arena', 'tower', 'store'）
 * @param {object} [batchSettings] - batchSettings 对象（包含 delayGroups）
 * @returns {number} 延迟值（毫秒）
 */
export const getModuleDelay = (moduleName, batchSettings) => {
  // 1. 确定模块对应的分组
  const group = MODULE_DELAY_GROUP_MAP[moduleName] || 'normal';

  // 2. 获取分组延迟值
  const userGroups = batchSettings?.delayGroups;
  let delayMs;
  if (userGroups && typeof userGroups[group] === 'number') {
    delayMs = userGroups[group];
  } else {
    // 3. 回退到默认值
    delayMs = DELAY_GROUPS[group];
  }

  // 4. 单账号加速：乘以加速倍率
  if (batchSettings?.singleAccountMode) {
    const multiplier = typeof batchSettings.singleAccountMultiplier === 'number'
      ? batchSettings.singleAccountMultiplier
      : SINGLE_ACCOUNT_DELAY_MULTIPLIER;
    delayMs = Math.max(50, Math.round(delayMs * multiplier));
  }

  return delayMs;
};

/**
 * 兼容旧 API：返回 batchSettings.moduleDelays 风格的延迟值
 * 用于过渡期间保持向后兼容
 *
 * @param {string} moduleName - 模块名称
 * @param {object} [batchSettings] - batchSettings 对象
 * @returns {number} 延迟值（毫秒）
 */
export const getModuleDelayCompat = (moduleName, batchSettings) => {
  // 优先使用新的延迟分组
  if (batchSettings?.delayGroups) {
    return getModuleDelay(moduleName, batchSettings);
  }

  // 回退到旧的 moduleDelays（向后兼容旧 localStorage 数据）
  const md = batchSettings?.moduleDelays;
  if (md) {
    return md[moduleName] || md.default || batchSettings?.taskDelay || 1000;
  }

  return batchSettings?.taskDelay || 1000;
};

/**
 * 重置延迟分组为默认值
 * @returns {object} 默认的延迟分组配置
 */
export const resetDelayGroups = () => {
  const defaults = { ...DELAY_GROUPS };
  saveDelayGroups(defaults);
  return defaults;
};

export default {
  DELAY_GROUPS,
  DELAY_GROUP_LABELS,
  DELAY_GROUP_DESCRIPTIONS,
  DELAY_GROUP_MODULES,
  MODULE_DELAY_GROUP_MAP,
  SINGLE_ACCOUNT_DELAY_MULTIPLIER,
  SINGLE_ACCOUNT_COMMAND_DELAY_CAP,
  loadDelayGroups,
  saveDelayGroups,
  getModuleDelay,
  getModuleDelayCompat,
  resetDelayGroups,
};
