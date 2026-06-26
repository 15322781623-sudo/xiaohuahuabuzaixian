import { useTokenStore } from "@/stores/tokenStore";

// ==================== 常量定义 ====================

const RECRUIT_TYPES = {
  FREE: 3,
  PAID: 1,
};

const BOX_TYPES = {
  DIAMOND: { id: 2005, name: '钻石宝箱' },
  WOODEN: { id: 2001, name: '木质宝箱' },
  BRONZE: { id: 1, name: '青铜宝箱' },
};

const ARENA_TIME = {
  START_HOUR: 6,
  END_HOUR: 22,
  MAX_FIGHTS: 3,
};

const CARD_IDS = {
  WEEKLY: 4001,
  MONTHLY: 4002,
  PERMANENT: 4003,
};

const GENIE_COUNT = 4;
const FREE_FISH_COUNT = 3;
const FREE_SWEEP_COUNT = 3;
const GOLD_BUY_COUNT = 3;
const HANG_UP_COUNT = 4;
const DAILY_TASK_COUNT = 10;
const DREAM_WORLD_DAYS = [0, 3]; // 周日、周三

// 错误码映射表
const ERROR_MESSAGES = new Map([
  ['400190', '没有可领取的签到奖励'],
  ['2300190', '今日已完成签到'],
  ['1000020', '该奖励今日已领取'],
  ['12000116', '已领取'],
  ['1400010', '没有购买该月卡,不能领取每日奖励'],
  ['3300050', '购买数量超出限制'],
  ['2600040', '条件不满足'],
  ['200750', '临时错误'],
  ['700020', '任务奖励已领取'],
  ['200020', '无法解锁免费扭蛋'],
  ['1300050', '黑市采购次数异常'],
  ['1500020', '能量不足'],
  ['3500020', '暂无可领取奖励'],
  ['200160', '模块未开启无法领取'],
  ['700010', '任务未达成无法领取'],
  ['4100040', '推关未达标，无法解锁领取'],
  ['1100010', '已购买过青铜宝箱'],
  ['400010', '数量不足'],
  ['2000150', '无对应罐子，无法领取'],
  ['400030', '已领取，无需重复操作'],
  ['2300070', '未加入俱乐部'],
  ['2300250', '俱乐部BOSS次数已用完'],
  ['3300060', '灯神扫荡条件不满足'],
  ['400000', '已上限'],  // ✅ 添加400000错误码
  ['200140', '未达到奖励目标'],
  ['200370', '已领取完累抽奖励'],  // ✅ 累抽奖励已领取
]);

// 上下文错误文案
const CONTEXT_ERRORS = {
  dreamWorld: { '200160': '该账号未达到关卡无法解锁梦境' },
  arena: { '200020': '推关关卡未达标无法解锁竞技场' },
  blackMarket: { '1300040': '未解锁关卡，无法使用采购功能' },
  formation: { '200020': '该账号阵容未解锁' },
  genie: { '200020': '该账号灯神扫荡条件未满足' },  // ✅ 添加灯神上下文
  hangUp: { '200020': '加钟请求过于频繁，请稍后重试' },  // ✅ 添加加钟上下文
  collection: { '12000116': '珍宝礼包已领取' },  // ✅ 珍宝阁免费礼包上下文
  gacha: { '400000': '免费扭蛋已上限' },  // ✅ 免费扭蛋上下文
  // ✅ egg 上下文已移除，砸金蛋仅保留在免费礼包领取按钮中
};

// 信息性错误消息集合（用于静默模式下拼接description前缀）
const INFORMATIONAL_MESSAGES = new Set([
  '已领取', '已上限', '该奖励今日已领取', '今日已完成签到',
  '今天已经签到过了', '今天已经领取过奖励了', '已经领取过这个任务',
  '暂无可领取奖励', '没有可领取的签到奖励', '已购买过青铜宝箱',
  '已领取招募', '数量不足', '珍宝礼包已领取', '免费扭蛋已上限',
  '未达到奖励目标', '已领取完累抽奖励', '条件不满足',
]);

// 默认设置
const DEFAULT_SETTINGS = {
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  bossTimes: 2,
  dailyBossTimes: 1,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
  blackMarketStandalonePurchase: false,
  legacyGiftPassword: '',
};

// ==================== 工具函数 ====================

/**
 * 延迟函数
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取错误码
 */
const getErrorCode = (error) => {
  const msg = typeof error === 'string' ? error : error?.message || '';
  const match = msg.match(/\d{6,8}/);  // ✅ 修改为匹配6-8位数字，支持12000116等8位错误码
  return match ? match[0] : '';
};

/**
 * 获取友好错误消息
 */
const getFriendlyError = (error, context = '') => {
  const code = getErrorCode(error);
  
  // 检查上下文错误
  if (context && CONTEXT_ERRORS[context]?.[code]) {
    return CONTEXT_ERRORS[context][code];
  }
  
  // 检查通用错误
  if (ERROR_MESSAGES.has(code)) {
    return ERROR_MESSAGES.get(code);
  }
  
  return error?.message || '未知错误';
};

/**
 * 是否为可忽略的错误
 */
const isIgnorableError = (error) => {
  return ERROR_MESSAGES.has(getErrorCode(error));
};

/**
 * 是否为连接错误
 */
const isConnectionError = (error) => {
  const msg = error?.message || '';
  return msg.includes('连接') || msg.includes('WebSocket');
};

/**
 * ✅ 是否为可重试的错误码（仅 400340、200750、11800010）
 */
const isRetryableError = (error) => {
  const msg = error?.message || '';
  return msg.includes('400340') || msg.includes('200750') || msg.includes('11800010');
};

/**
 * 检查是否为今天
 */
const isToday = (timestamp) => {
  if (!timestamp) return true;
  const today = new Date().toDateString();
  const recordDate = new Date(timestamp * 1000).toDateString();
  return today !== recordDate;
};

/**
 * 获取今日BOSS ID
 */
const getTodayBossId = () => {
  const DAY_BOSS_MAP = [9904, 9905, 9901, 9902, 9903, 9904, 9905];
  return DAY_BOSS_MAP[new Date().getDay()];
};

/**
 * 检查是否为咸王梦境开放日
 */
const isDreamWorldDay = () => DREAM_WORLD_DAYS.includes(new Date().getDay());

/**
 * 安全获取嵌套属性
 */
const safeGet = (obj, path, defaultValue = null) => {
  return path.split('.').reduce((acc, key) => 
    (acc && acc[key] !== undefined) ? acc[key] : defaultValue, obj);
};

// ==================== 竞技场目标选择 ====================

/**
 * 提取目标列表
 */
const extractTargetList = (targets) => {
  if (!targets) return [];
  if (Array.isArray(targets)) return targets;
  
  return targets.rankList || targets.roleList || 
         targets.targets || targets.targetList || 
         targets.list || [];
};

/**
 * 提取目标信息
 */
const extractTargetInfo = (target) => ({
  targetId: target.roleId || target.id || target.targetId || safeGet(target, 'info.roleId'),
  targetName: target.name || safeGet(target, 'info.name', '未知'),
  targetRank: target.rank || safeGet(target, 'info.rank', 0),
  targetPower: target.power || safeGet(target, 'info.power', 0),
});

/**
 * 按战力排序
 */
const sortByPower = (a, b) => {
  const powerA = a.power || safeGet(a, 'info.power', 0);
  const powerB = b.power || safeGet(b, 'info.power', 0);
  return powerA - powerB;
};

/**
 * 智能竞技场目标选择
 */
const pickArenaTargetId = (targets, playerInfo = {}) => {
  if (!targets) return null;

  const targetList = extractTargetList(targets);

  // 兜底：单个目标对象
  if (targetList.length === 0 && (targets.roleId || targets.id || targets.targetId)) {
    return extractTargetInfo(targets);
  }

  if (targetList.length === 0) return null;

  const myRank = playerInfo.rank || 0;

  // 过滤排名比自己高的对手
  let candidates = targetList.filter(target => {
    const targetRank = target.rank || safeGet(target, 'info.rank', 0);
    return !(myRank > 0 && targetRank < myRank);
  });

  // 如果没有可挑战的，使用所有目标
  if (candidates.length === 0) {
    candidates = targetList;
  }

  // 按战力升序，选择最弱的
  const sorted = [...candidates].sort(sortByPower);
  return extractTargetInfo(sorted[0]);
};

// ==================== 主类 ====================

export class DailyTaskRunner {
  constructor(tokenStore, delaySettings = null, batchSettings = null) {
    this.tokenStore = tokenStore;
    this.delaySettings = {
      commandDelay: 500,
      taskDelay: 500,
      ...delaySettings,
    };
    // ✅ 高级配置支持
    this.batchSettings = batchSettings || {};
    this.callbacks = {};
    this.settings = {};
    this.tokenId = '';
    this.originalFormation = null;
    this.has400340Error = false; // 追踪400340错误
  }

  // ==================== 日志系统 ====================
  
  /** 获取当前账号名称（用于日志前缀） */
  get tokenName() {
    if (!this.tokenId) return '';
    const token = this.tokenStore?.gameTokens?.find(t => t.id === this.tokenId);
    return token?.name || '';
  }

  log(message, type = 'info') {
    const prefix = this.tokenName ? `[${this.tokenName}] ` : '';
    this.callbacks?.onLog?.({
      time: new Date().toLocaleTimeString(),
      message: `${prefix}${message}`,
      type,
    });
  }

  success(msg) { this.log(msg, 'success'); }
  warn(msg) { this.log(msg, 'warning'); }
  error(msg) { this.log(msg, 'error'); }
  info(msg) { this.log(msg, 'info'); }

  // ==================== 设置管理 ====================
  
  loadSettings(roleId) {
    try {
      const raw = localStorage.getItem(`daily-settings:${roleId}`);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('设置加载失败:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  // ✅ 获取超时配置（智能识别命令类型）
  getTimeout(command) {
    const isBattleCommand = command.includes('fight') || 
                            command.includes('tower') || 
                            command.includes('evo') ||
                            command.includes('arena');
    
    return isBattleCommand
      ? (this.batchSettings.battleCommandTimeout || 15000)
      : (this.batchSettings.defaultCommandTimeout || 5000);
  }

  // ==================== 连接管理 ====================
  
  isConnected() {
    return this.tokenStore.wsConnections?.[this.tokenId]?.status === 'connected';
  }

  async ensureConnection(retryCount = 0) {
    const MAX_RETRIES = 3;

    if (this.isConnected()) return true;

    if (retryCount >= MAX_RETRIES) {
      this.error(`连接失败次数已达上限 (${MAX_RETRIES}次)`);
      this.tokenStore.closeWebSocketConnection(this.tokenId);
      return false;
    }

    this.warn(`连接异常，尝试刷新Token (${retryCount + 1}/${MAX_RETRIES})`);

    try {
      const success = await this.tokenStore.attemptTokenRefresh(this.tokenId, true);
      
      if (success) {
        await delay(5000);
        if (this.isConnected()) {
          this.success('连接已恢复');
          return true;
        }
        this.warn('Token刷新成功但连接未建立');
      } else {
        this.error('Token刷新失败');
      }
      
      return false;
    } catch (e) {
      this.error(`刷新Token出错: ${e.message}`);
      return false;
    }
  }

  // ==================== 命令执行 ====================
  
  /**
   * 发送游戏命令（支持重试和静默错误处理）
   */
  async sendCommand(cmd, params = {}, options = {}) {
    const {
      description = '',
      timeout,  // ✅ 移除默认值，改用getTimeout获取
      context = '',
      silentErrors = false,
      silent = false,
      retryCount = 0,
    } = options;

    // ✅ 使用高级配置获取超时时间
    const actualTimeout = timeout || this.getTimeout(cmd);

    const MAX_RETRIES = 3;

    try {
      // 确保连接
      if (!await this.ensureConnection(retryCount)) {
        throw new Error('连接异常');
      }

      // 发送命令
      const result = await this.tokenStore.sendMessageWithPromise(
        this.tokenId, cmd, params, actualTimeout
      );
      
      await delay(this.delaySettings.commandDelay);
      
      // 检查服务器返回的错误（不抛出异常，由调用者处理）
      if (result && result.error) {
        // 静默错误模式：处理可忽略错误
        if (silentErrors && isIgnorableError(result.error)) {
          const friendlyMsg = getFriendlyError(result.error, context);
          // ✅ 对于信息性错误，拼接description前缀
          if (INFORMATIONAL_MESSAGES.has(friendlyMsg)) {
            this.info(`${description}${friendlyMsg}`);
          } else {
            this.info(friendlyMsg);
          }
          return { success: true, silent: true };
        }
        // 不显示成功消息，直接返回结果
        return result;
      }
      
      if (description && !silent) this.success(`${description} - 成功`);
      
      return result;
    } catch (error) {
      // ✅ 连接错误或可重试错误码重试
      if ((isConnectionError(error) || isRetryableError(error)) && retryCount < MAX_RETRIES) {
        const isRateLimit = isRetryableError(error);
        // ✅ 限流错误用更长的重试间隔（15秒），连接错误保持2秒
        const retryDelay = isRateLimit ? 15000 : 2000;
        if (!silent) this.warn(`[${isRateLimit ? '服务器限流' : '连接错误'}] ${description}，${retryDelay/1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})`);
        await delay(retryDelay);
        return this.sendCommand(cmd, params, { ...options, retryCount: retryCount + 1 });
      }

      // 静默错误模式
      if (silentErrors && isIgnorableError(error)) {
        const friendlyMsg = getFriendlyError(error, context);
        // ✅ 对于信息性错误，拼接description前缀
        if (INFORMATIONAL_MESSAGES.has(friendlyMsg)) {
          this.info(`${description}${friendlyMsg}`);
        } else {
          this.info(friendlyMsg);
        }
        return { success: true, silent: true };
      }

      // 记录错误
      if (description && !silent) {
        const friendlyMsg = getFriendlyError(error, context);
        if (!isIgnorableError(error)) {
          this.error(`${description} - 失败: ${friendlyMsg}`);
        }
      }

      throw error;
    }
  }

  /**
   * 发送命令并静默处理可忽略错误
   */
  async sendCommandSafe(cmd, params = {}, options = {}) {
    return this.sendCommand(cmd, params, { ...options, silentErrors: true });
  }

  // ==================== 阵容管理 ====================
  
  async getCurrentFormation() {
    try {
      const teamInfo = await this.sendCommand('presetteam_getinfo', {}, {
        description: '获取阵容信息',
      });
      return safeGet(teamInfo, 'presetTeamInfo.useTeamId');
    } catch {
      return null;
    }
  }

  async switchFormation(formationId) {
    try {
      await this.sendCommand('presetteam_saveteam', { teamId: formationId }, {
        description: `切换到阵容${formationId}`,
        context: 'formation',
      });
      this.success(`已切换到阵容${formationId}`);
      return true;
    } catch (error) {
      this.warn(`切换阵容失败: ${getFriendlyError(error, 'formation')}`);
      return false;
    }
  }

  async switchFormationIfNeeded(targetFormation, name = '') {
    const current = await this.getCurrentFormation();
    
    if (current === targetFormation) {
      this.info(`当前已是${name}${targetFormation}，无需切换`);
      return false;
    }

    this.info(`切换阵容: ${current} → ${targetFormation}`);
    return this.switchFormation(targetFormation);
  }

  async restoreFormation() {
    if (!this.originalFormation) return;
    
    try {
      await this.sendCommand('presetteam_saveteam', { teamId: this.originalFormation }, {
        description: '恢复原阵容',
        context: 'formation',
        timeout: this.getTimeout('presetteam_saveteam'),
      });
      this.success(`已恢复阵容${this.originalFormation}`);
    } catch (error) {
      if (getErrorCode(error) === '200020') {
        this.info(`阵容${this.originalFormation}已是当前阵容`);
      } else {
        this.error(`恢复阵容失败: ${error.message}`);
      }
    }
  }

  // ==================== 宝箱操作 ====================
  
  async tryOpenBox(boxId, boxName) {
    try {
      const result = await this.tokenStore.sendMessageWithPromise(
        this.tokenId,
        'item_openbox',
        { itemId: boxId, number: 10 },
        3000
      );
      await delay(this.delaySettings.commandDelay);
      this.success(`开启${boxName}10个 - 成功`);
      return true;
    } catch (error) {
      const errorMsg = error.message || '';
      // 400010错误表示物品数量不足，静默处理不输出日志
      if (errorMsg.includes('400010')) {
        return false;
      }
      // 其他错误也静默处理
      return false;
    }
  }

  /**
   * 领取累抽奖励（第1-10层），逐层尝试
   * - 已领取的层跳过，继续检查下一层
   * - 未达标或其他错误直接停止（后续层需要更多抽取次数）
   */
  async claimGachaStageRewards() {
    for (let stageId = 1; stageId <= 10; stageId++) {
      try {
        await this.tokenStore.sendMessageWithPromise(
          this.tokenId, 'gacha_claimstagereward', { stageId }, 5000);
        // 领取成功
        this.info(`累抽奖励 第${stageId}层 领取成功`);
      } catch (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('200370') || errorMsg.includes('3500020')
            || errorMsg.includes('400000') || errorMsg.includes('物品不存在')) {
          continue; // 已领取，跳过检查下一层
        }
        // 未达标或其他错误，直接停止
        if (errorMsg.includes('200140')) {
          this.info(`累抽奖励 第${stageId}层 未达标，停止领取`);
        }
        break;
      }
    }
  }

  // ==================== 任务构建器 ====================

  /**
   * 基础每日任务
   */
  buildBasicTasks(completedTasks, statistics, statisticsTime, roleData = null) {
    const tasks = [];
    const isDone = (id) => completedTasks[id] === -1;
    const available = (key) => isToday(statisticsTime[key]);

    // 分享游戏
    if (!isDone(2)) {
      tasks.push(() => this.sendCommand('system_mysharecallback', 
        { isSkipShareCard: true, type: 2 }, { description: '分享游戏', silent: true }));
    }

    // 赠送好友金币
    if (!isDone(3)) {
      tasks.push(() => this.sendCommandSafe('friend_batch', {}, { description: '赠送好友金币' }));
    }

    // 招募
    if (!isDone(4)) {
      tasks.push(() => this.sendCommandSafe('hero_recruit', 
        { recruitType: RECRUIT_TYPES.FREE, recruitNumber: 1 }, 
        { description: '免费招募' }));
      
      if (this.settings.payRecruit) {
        tasks.push(() => this.sendCommandSafe('hero_recruit', 
          { recruitType: RECRUIT_TYPES.PAID, recruitNumber: 1 }, 
          { description: '付费招募' }));
      }
    }

    // 免费点金
    if (!isDone(6) && available('buy:gold')) {
      for (let i = 0; i < GOLD_BUY_COUNT; i++) {
        tasks.push(() => this.sendCommandSafe('system_buygold', { buyNum: 1 }, 
          { description: `免费点金 ${i + 1}/${GOLD_BUY_COUNT}` }));
      }
    }

    // 挂机奖励
    if (!isDone(5) && this.settings.claimHangUp) {
      // ✅ 智能领取挂机：先检查状态，再决定是否领取和加钟
      tasks.push(async () => {
        // ✅ Step 1: 获取挂机状态（独立try-catch，避免与后续逻辑冲突）
        let hangUpStatus;
        try {
          hangUpStatus = await this.getHangUpStatus({ 
            checkAddTime: false,  // 领取时不检查加钟
            thresholdSeconds: 0,  // 开关关闭时不设阈值
            maxHangUpTime: 43200,    // 12小时上限
            roleData,                // ✅ 传入已有的roleData，避免重复请求
          });
        } catch (error) {
          // 状态获取失败时，仅尝试领取，不盲目加钟（避免浪费时间）
          this.warn(`获取挂机状态失败，仅尝试领取: ${error.message}`);
          await this.sendCommand('system_mysharecallback', {}, 
            { timeout: this.getTimeout('system_mysharecallback'), silent: true });
          await this.sendCommand('system_claimhangupreward', {}, 
            { description: '领取挂机奖励', timeout: this.getTimeout('system_claimhangupreward') });
          return;
        }
        
        // ✅ Step 2: 判断是否满足领取条件
        const canClaim = this.batchSettings?.hangUpTimeControlEnabled
          ? (hangUpStatus.hasData && hangUpStatus.elapsedTime >= ((this.batchSettings.hangUpMinTime || 9) * 3600))
          : hangUpStatus.hasData; // 开关关闭时，有挂机数据就可以领取
        
        if (!canClaim) {
          // 不满足领取条件，跳过领取
          if (this.batchSettings?.hangUpTimeControlEnabled) {
            const elapsedTime = hangUpStatus.elapsedTime || 0;
            const minTime = this.batchSettings.hangUpMinTime || 9;
            this.info(`挂机时间${this.formatTime(elapsedTime)}，未达到${this.formatTime(minTime * 3600)}（${minTime}小时），跳过领取`);
          } else {
            this.info(`无挂机数据，跳过领取`);
          }
          // ✅ 刷新角色信息（独立try-catch，不影响跳过决策）
          try {
            await this.sendCommand('role_getroleinfo', {}, { timeout: this.getTimeout('role_getroleinfo') });
          } catch { /* 刷新失败不影响流程 */ }
          return;
        }
        
        // ✅ Step 3: 满足条件，初始化 + 领取奖励
        this.info(`挂机时间${this.formatTime(hangUpStatus.elapsedTime)}，满足领取条件，开始领取...`);
        await this.sendCommand('system_mysharecallback', {}, 
          { timeout: this.getTimeout('system_mysharecallback'), silent: true });
        await this.sendCommand('system_claimhangupreward', {}, 
          { description: '领取挂机奖励', timeout: this.getTimeout('system_claimhangupreward') });
        
        // ✅ Step 4: 加钟4次（不受状态限制）
        for (let i = 0; i < HANG_UP_COUNT; i++) {
          await this.sendCommandSafe('system_mysharecallback', 
            { isSkipShareCard: true, type: 2 }, 
            { timeout: this.getTimeout('system_mysharecallback'), context: 'hangUp', silent: true });
        }
      });
    }

    // 开启宝箱
    if (!isDone(7) && this.settings.openBox) {
      tasks.push(async () => {
        const opened = await this.tryOpenBox(BOX_TYPES.DIAMOND.id, BOX_TYPES.DIAMOND.name);
        if (!opened) {
          await this.tryOpenBox(BOX_TYPES.WOODEN.id, BOX_TYPES.WOODEN.name);
        }
      });
    }

    return tasks;
  }

  /**
   * 盐罐任务
   */
  buildSaltBottleTasks(completedTasks) {
    const tasks = [];
    const isDone = (id) => completedTasks[id] === -1;

    tasks.push(
      () => this.sendCommandSafe('bottlehelper_stop', {}, { description: '停止盐罐计时' }),
      () => this.sendCommandSafe('bottlehelper_start', {}, { description: '开始盐罐计时' }),
    );

    if (!isDone(14) && this.settings.claimBottle) {
      tasks.push(() => this.sendCommandSafe('bottlehelper_claim', {}, 
        { description: '领取盐罐奖励' }));
    }

    return tasks;
  }

  /**
   * 竞技场任务
   */
  buildArenaTask() {
    if (!this.settings.arenaEnable) return [];

    return [async () => {
      const hour = new Date().getHours();
      if (hour < ARENA_TIME.START_HOUR || hour > ARENA_TIME.END_HOUR) {
        this.warn(`竞技场未开放 (${ARENA_TIME.START_HOUR}:00-${ARENA_TIME.END_HOUR}:00)`);
        return;
      }

      this.info('开始竞技场战斗流程');
      
      // 切换阵容
      const switched = await this.switchFormationIfNeeded(this.settings.arenaFormation);
      if (switched) {
        await delay(4000); // 切换后短暂等待
      }

      try {
        // 开启竞技场
        try {
          await this.sendCommand('arena_startarea', {}, { 
            description: '开始竞技场', 
            timeout: this.getTimeout('arena_startarea'), 
            context: 'arena' 
          });
        } catch (error) {
          if (getErrorCode(error) === '200020') {
            this.warn('关卡未达标，无法开启竞技场');
            return;
          }
          throw error;
        }

        // 获取 battleVersion（战斗必需，否则服务器返回"版本过低"）
        if (!this.tokenStore.getBattleVersion()) {
          try {
            const levelResult = await this.sendCommand('fight_startlevel', {}, {
              description: '获取战斗版本',
              timeout: 5000,
              silent: true,
            });
            if (levelResult?.battleData?.version) {
              this.tokenStore.setBattleVersion(levelResult.battleData.version);
              this.info(`获取 battleVersion: ${levelResult.battleData.version}`);
            }
          } catch (err) {
            this.warn(`获取 battleVersion 失败: ${err.message}`);
          }
        }

        // 执行战斗
        for (let i = 1; i <= ARENA_TIME.MAX_FIGHTS; i++) {
          await this.executeArenaFight(i);
          if (i < ARENA_TIME.MAX_FIGHTS) await delay(1000);
        }

        this.success('竞技场战斗流程完成');
      } finally {
        if (switched) await this.restoreFormation();
      }
    }];
  }

  /**
   * 执行单次竞技场战斗
   */
  async executeArenaFight(fightIndex) {
    this.info(`竞技场战斗 ${fightIndex}/${ARENA_TIME.MAX_FIGHTS}`);

    // 获取目标
    let targets;
    try {
      targets = await this.sendCommand('arena_getareatarget', {}, 
        { description: `获取目标${fightIndex}` });
    } catch (error) {
      // ✅ 限流错误向上传播，触发主循环break
      if (isRetryableError(error)) {
        this.warn(`获取目标${fightIndex} - 服务器限流(${getErrorCode(error)})，停止竞技场战斗`);
        throw error;
      }
      this.error(`获取目标失败: ${error.message}`);
      return;
    }

    if (!targets || (extractTargetList(targets).length === 0 && 
        !targets.roleId && !targets.id && !targets.targetId)) {
      this.warn(`战斗${fightIndex} - 无可用目标`);
      return;
    }

    // 选择目标
    const roleInfo = safeGet(this.tokenStore, 'gameData.roleInfo.role', {});
    const target = pickArenaTargetId(targets, roleInfo);

    if (!target?.targetId) {
      this.warn(`战斗${fightIndex} - 未找到合适目标`);
      return;
    }

    this.info(`目标: ${target.targetName} (排名:${target.targetRank})`);

    // ✅ 执行战斗（支持一次重试）
    try {
      await this.sendCommand('fight_startareaarena', { targetId: target.targetId }, 
        { description: `竞技场战斗${fightIndex}`, timeout: this.getTimeout('fight_startareaarena') });
    } catch (error) {
      // ✅ 限流错误(400340/200750/11800010)：不再局部重试，直接向上抛出，让主循环break
      if (isRetryableError(error)) {
        this.warn(`战斗${fightIndex} - 服务器限流(${getErrorCode(error)})，停止竞技场战斗`);
        throw error; // ✅ 向上抛出，触发主循环break
      }
      this.error(`战斗失败: ${error.message}`);
    }
  }

  /**
   * BOSS任务
   */
  buildBossTasks(statistics, statisticsTime) {
    const tasks = [];

    // 军团BOSS
    let legionBossCount = statistics['legion:boss'] ?? 0;
    if (isToday(statisticsTime['legion:boss'])) legionBossCount = 0;
    
    const remaining = Math.max(this.settings.bossTimes - legionBossCount, 0);

    if (remaining > 0) {
      let switched = false;

      tasks.push(async () => {
        switched = await this.switchFormationIfNeeded(this.settings.bossFormation, 'BOSS阵容');
      });

      for (let i = 0; i < remaining; i++) {
        tasks.push(() => this.sendCommandSafe('fight_startlegionboss', {}, 
          { description: `军团BOSS ${i + 1}/${remaining}` }));
      }

      tasks.push(async () => {
        if (switched) await this.restoreFormation();
      });
    }

    // 每日BOSS
    let dailyBossCount = statistics['boss'] ?? 0;
    if (isToday(statisticsTime['boss'])) dailyBossCount = 0;

    const dailyBossMax = this.settings.dailyBossTimes ?? 1;
    const dailyBossRemaining = Math.max(dailyBossMax - dailyBossCount, 0);

    if (dailyBossRemaining > 0) {
      let dailySwitched = false;

      tasks.push(async () => {
        dailySwitched = await this.switchFormationIfNeeded(this.settings.bossFormation, 'BOSS阵容');
      });
      for (let i = 0; i < dailyBossRemaining; i++) {
        tasks.push(() => this.sendCommandSafe('fight_startboss', 
          { bossId: getTodayBossId() }, { description: `每日BOSS ${i + 1}/${dailyBossRemaining}` }));
      }

      tasks.push(async () => {
        if (dailySwitched) await this.restoreFormation();
      });
    }

    return tasks;
  }

  /**
   * 固定奖励任务
   */
  buildFixedRewardTasks() {
    const tasks = [];

    // 俱乐部签到
    tasks.push(() => this.sendCommandSafe('legion_signin', {}, { description: '俱乐部' }));

    // 各类礼包
    const rewards = [
      { name: '福利签到', cmd: 'system_signinreward' },
      { name: '每日礼包', cmd: 'discount_claimreward' },
      { name: '免费礼包', cmd: 'card_claimreward' },
      { name: '周卡礼包', cmd: 'card_claimreward', params: { cardId: CARD_IDS.WEEKLY } },
      { name: '月卡礼包', cmd: 'card_claimreward', params: { cardId: CARD_IDS.MONTHLY } },
      { name: '永久卡礼包', cmd: 'card_claimreward', params: { cardId: CARD_IDS.PERMANENT } },
      // ✅ 砸金蛋已移除，仅保留在免费礼包领取按钮中
      // ✅ collection_claimfreereward 已在珍宝阁部分调用，此处删除避免重复
    ];

    if (this.settings.claimEmail) {
      rewards.push({ name: '邮件奖励', cmd: 'mail_claimallattachment' });
    }

    rewards.forEach(({ name, cmd, params = {}, context }) => {
      tasks.push(() => this.sendCommandSafe(cmd, params, { description: name, context }));
    });

    // 珍宝阁免费礼包
    tasks.push(
      () => this.sendCommandSafe('collection_claimfreereward', {}, { description: '珍宝阁免费礼包', context: 'collection' }),
    );

    return tasks;
  }

  /**
   * 免费扫荡卷任务（独立方法，用于活跃度100时的精简模式）
   */
  buildFreeSweepTickets() {
    const tasks = [];
    
    // 免费扫荡卷（每次间隔3-5秒防限流）
    for (let i = 0; i < FREE_SWEEP_COUNT; i++) {
      tasks.push(async () => {
        await this.sendCommandSafe('genie_buysweep', {}, 
          { description: `免费扫荡卷 ${i + 1}/${FREE_SWEEP_COUNT}` });
        if (i < FREE_SWEEP_COUNT - 1) {
          await delay(3000 + Math.random() * 2000);
        }
      });
    }
    
    return tasks;
  }

  /**
   * 活动任务
   */
  buildActivityTasks(statistics, statisticsTime) {
    const tasks = [];

    // 免费钓鱼
    if (isToday(statistics['artifact:normal:lottery:time'])) {
      for (let i = 0; i < FREE_FISH_COUNT; i++) {
        tasks.push(() => this.sendCommandSafe('artifact_lottery', 
          { lotteryNumber: 1, newFree: true, type: 1 }, 
          { description: `免费钓鱼 ${i + 1}/${FREE_FISH_COUNT}` }));
      }
    }

    // 灯神扫荡（每次间隔3-5秒防限流）
    const kingdoms = ['魏国', '蜀国', '吴国', '群雄'];
    const genieSweeps = [];
    for (let gid = 1; gid <= GENIE_COUNT; gid++) {
      if (isToday(statisticsTime[`genie:daily:free:${gid}`])) {
        genieSweeps.push({ gid, name: kingdoms[gid - 1] });
      }
    }
    genieSweeps.forEach(({ gid, name }, idx) => {
      tasks.push(async () => {
        await this.sendCommandSafe('genie_sweep', { genieId: gid }, 
          { description: `${name}灯神扫荡`, timeout: this.getTimeout('genie_sweep'), context: 'genie' });
        if (idx < genieSweeps.length - 1) {
          await delay(3000 + Math.random() * 2000);
        }
      });
    });

    // 免费扫荡卷（复用独立方法）
    tasks.push(...this.buildFreeSweepTickets());

    // 免费扭蛋（仅在周二、周四、周六执行）
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, 2=周二, ..., 6=周六
    const allowedDays = [2, 4, 6]; // 周二、周四、周六
    
    if (allowedDays.includes(dayOfWeek)) {
      tasks.push(async () => {
        // ✅ 免费扭蛋（sendCommandSafe已处理400000等可忽略错误，自动输出信息日志）
        await this.sendCommandSafe('gacha_drawreward', 
          { isGroup: false, num: 1 }, 
          { description: '免费扭蛋', context: 'gacha' });
        
        // ✅ 无论扭蛋成功还是已上限/失败，都尝试领取累抽奖励
        // claimGachaStageRewards 内部有独立的错误处理和 break 逻辑
        await this.claimGachaStageRewards();
      });
    }

    return tasks;
  }

  /**
   * 黑市任务
   */
  buildBlackMarketTask() {
    if (!this.settings.blackMarketPurchase) return [];

    return [async () => {
      try {
        // 如果配置了采购清单，先设置再采购
        const purchaseList = this.settings.purchaseList || [];
        if (purchaseList.length > 0) {
          try {
            const discounts = this.settings.purchaseDiscounts || {};
            const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
            const purchaseCnt = this.settings.purchaseCnt ?? 15;
            await this.sendCommand('store_setpurchase', { purchaseItemList, purchaseCnt },
              { description: '设置采购清单', timeout: 5000 });
            this.info(`已设置采购清单 (${purchaseItemList.length}项, 次数${purchaseCnt})`);
          } catch (e) {
            this.warn(`设置采购清单失败: ${e.message}`);
          }
        }

        // 尝试黑市采购
        const result = await this.sendCommand('store_purchase', { goodsId: 1 }, 
          { context: 'blackMarket' });

        const hasItems = result && (
          result.buyList?.length || result.goodsList?.length ||
          result.items?.length || result.reward?.length || 
          result.rewards?.length || result.code === 0 || result.ret === 0
        );

        if (hasItems) {
          this.success('黑市购买成功');
          return;
        }

        throw new Error('未购买到物品');
      } catch (error) {
        this.warn(`黑市采购失败，尝试兜底...`);
        
        try {
          await this.sendCommand('store_buy', { goodsId: BOX_TYPES.BRONZE.id }, 
            { description: '青铜宝箱(兜底)', timeout: this.getTimeout('store_buy') });
          this.success('兜底购买成功');
        } catch (bronzeError) {
          if (getErrorCode(bronzeError) === '1100010') {
            this.info('青铜宝箱已购买过');
          } else {
            this.error(`兜底购买失败: ${bronzeError.message}`);
          }
        }
      }
    }];
  }

  /**
   * 梦境任务
   */
  buildDreamWorldTask() {
    if (!isDreamWorldDay()) return [];

    return [() => this.sendCommandSafe('dungeon_selecthero', 
      { battleTeam: { 0: 107 } }, 
      { description: '咸王梦境', context: 'dreamWorld' })];
  }

  /**
   * 深海灯神任务
   */
  buildDeepSeaLampTask(statisticsTime) {
    if (new Date().getDay() !== 1 || !isToday(statisticsTime['genie:daily:free:5'])) {
      return [];
    }

    return [() => this.sendCommandSafe('genie_sweep', 
      { genieId: 5, sweepCnt: 1 }, { description: '深海灯神' })];
  }

  /**
   * 任务奖励领取
   */
  buildRewardTasks() {
    const tasks = [];

    // 每日任务奖励（使用sendCommandSafe静默处理已领取的）
    for (let i = 1; i <= DAILY_TASK_COUNT; i++) {
      tasks.push(() => this.sendCommandSafe('task_claimdailypoint', { taskId: i }, 
        { description: `任务奖励${i}` }));
    }

    // 日常奖励（领取类操作间隔3-5秒，防止触发限流）
    tasks.push(async () => {
      await this.sendCommandSafe('task_claimdailyreward', {}, { description: '日常奖励' });
      await delay(3000 + Math.random() * 2000);
    });

    // 周常奖励
    tasks.push(async () => {
      await this.sendCommandSafe('task_claimweekreward', {}, { description: '周常奖励' });
      await delay(3000 + Math.random() * 2000);
    });

    // 通行证奖励
    tasks.push(() => this.sendCommandSafe('activity_recyclewarorderrewardclaim', { actId: 1 }, 
      { description: '通行证奖励' }));

    return tasks;
  }

  // ==================== 主流程 ====================

  /**
   * 获取角色数据
   */
  async fetchRoleData() {
    try {
      const resp = await this.tokenStore.sendGetRoleInfo(this.tokenId);
      this.success('角色信息获取成功');
      
      if (!resp?.role) throw new Error('角色数据不存在');
      
      return resp.role;
    } catch (error) {
      if (isConnectionError(error)) {
        this.warn('获取角色信息失败，尝试刷新Token');
        
        if (!await this.ensureConnection(1)) {
          throw error;
        }
        
        const resp = await this.tokenStore.sendGetRoleInfo(this.tokenId);
        this.success('角色信息获取成功');
        
        if (!resp?.role) throw new Error('角色数据不存在');
        return resp.role;
      }
      
      throw error;
    }
  }

  /**
   * 获取当前挂机状态
   * @param {Object} options 配置选项
   * @param {boolean} options.checkAddTime 是否检查是否需要加钟（默认false）
   * @param {number} options.thresholdSeconds 加钟阈值（秒），默认3600秒（1小时）
   * @param {number} options.maxHangUpTime 最大挂机时间（秒），默认36000秒（10小时）
   * @param {Object} options.roleData 已获取的角色数据（可选，避免重复fetch）
   * @returns {Object} 挂机状态信息
   */
  async getHangUpStatus(options = {}) {
    const { checkAddTime = false, thresholdSeconds = 3600, maxHangUpTime = 36000, roleData: existingRoleData = null } = options;
    
    try {
      // ✅ 优先使用已传入的roleData，避免重复请求
      const roleData = existingRoleData || await this.fetchRoleData();
      const hangUpData = roleData?.hangUp;
      
      if (!hangUpData) {
        return {
          hasData: false,
          message: '无挂机数据',
          needAddTime: false,
          addTimeMessage: '',
        };
      }
      
      const now = Date.now() / 1000;
      const lastTime = hangUpData.lastTime || 0;
      const hangUpTime = hangUpData.hangUpTime || 0;
      const elapsed = now - lastTime;
      
      // 计算状态
      const isActive = elapsed <= hangUpTime;
      const remainingTime = isActive ? Math.floor(hangUpTime - elapsed) : 0;
      const elapsedTime = isActive ? Math.floor(elapsed) : Math.floor(hangUpTime);
      
      // 计算进度百分比
      const progress = hangUpTime > 0 ? Math.min(100, Math.floor((elapsedTime / hangUpTime) * 100)) : 0;
      
      // ✅ 智能判断是否需要加钟
      let needAddTime = false;
      let addTimeMessage = '';
      
      if (checkAddTime) {
        // 场景 1: 挂机已完成，必须加钟
        if (!isActive) {
          needAddTime = true;
          addTimeMessage = '挂机已完成，立即加钟';
        } 
        // 场景 2: 剩余时间不足 2 小时，建议加钟
        else if (remainingTime < 7200) {
          needAddTime = true;
          addTimeMessage = `剩余时间不足2小时(${this.formatTime(remainingTime)})，建议加钟`;
        } 
        // 场景 3: 总挂机时间 < 10 小时且剩余时间 < 4 小时，可以加钟
        else if (hangUpTime < maxHangUpTime && remainingTime < 14400) {
          needAddTime = true;
          addTimeMessage = `挂机时间${this.formatTime(hangUpTime)}，剩余${this.formatTime(remainingTime)}，可以加钟`;
        } 
        // 场景 4: 挂机时间已达 10 小时或剩余时间充足，无需加钟
        else {
          needAddTime = false;
          addTimeMessage = hangUpTime >= maxHangUpTime
            ? `总挂机时间已达${this.formatTime(maxHangUpTime)}，剩余${this.formatTime(remainingTime)}，无需加钟`
            : `挂机时间${this.formatTime(hangUpTime)}，剩余${this.formatTime(remainingTime)}，充足，无需加钟`;
        }
      }
      
      const status = {
        hasData: true,
        isActive,  // 是否正在挂机
        lastTime,  // 最后开始挂机的时间戳
        hangUpTime,  // 总挂机时长（秒）
        elapsedTime,  // 已挂机时间（秒）
        remainingTime,  // 剩余挂机时间（秒）
        progress,  // 进度百分比 (0-100)
        needAddTime,  // ✅ 是否需要加钟
        addTimeMessage,  // ✅ 加钟提示信息
        message: isActive 
          ? `挂机中：${this.formatTime(elapsedTime)}/${this.formatTime(hangUpTime)}` 
          : `挂机已完成`,
      };
      
      // 输出日志
      if (checkAddTime) {
        this.info(`挂机状态: ${status.message} | ${addTimeMessage}`);
      } else {
        this.info(`挂机状态: ${status.message}`);
      }
      
      return status;
    } catch (error) {
      this.error(`获取挂机状态失败: ${error.message}`);
      return {
        hasData: false,
        message: `获取失败: ${error.message}`,
        needAddTime: false,
        addTimeMessage: '',
      };
    }
  }

  /**
   * 格式化时间（秒转为可读格式）
   */
  formatTime(seconds) {
    if (!seconds || seconds <= 0) return '0秒';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
    
    return parts.join('');
  }

  /**
   * 检查活跃度
   * @returns {Object} { shouldSkip: boolean, activityPoints: number, isFullActivity: boolean }
   */
  checkActivity(roleData) {
    const activity = roleData.dailyTask?.dailyPoint ?? 0;
    const max = 110;  // 总活跃度改为110
    const skipThreshold = 105;  // 达到105就跳过任务
    
    this.info(`活跃度: ${activity}/${max}`);
    
    if (activity >= skipThreshold) {
      this.success(`活跃度已达标 (${activity}/${max} >= ${skipThreshold})，无需执行任务`);
      if (this.callbacks?.onProgress) this.callbacks.onProgress(100);
      return { shouldSkip: true, activityPoints: activity, isFullActivity: false };
    }
    
    // ✅ 活跃度 >= 100 时，标记为满活跃度状态（精简模式，只执行特定任务）
    if (activity >= 100) {
      this.info(`活跃度已达${activity}，将只执行：竞技场战斗、灯神扫荡、免费扫荡卷、任务奖励领取`);
      return { shouldSkip: false, activityPoints: activity, isFullActivity: true };
    }
    
    return { shouldSkip: false, activityPoints: activity, isFullActivity: false };
  }

  /**
   * 执行主流程
   */
  async run(tokenId, callbacks = {}, customSettings = null) {
    this.tokenId = tokenId;
    this.callbacks = callbacks;
    this.settings = customSettings || this.loadSettings(tokenId) || { ...DEFAULT_SETTINGS };

    // 检查连接
    this.info('检查连接状态...');
    if (!await this.ensureConnection()) {
      this.error('连接失败，无法执行任务');
      throw new Error('连接异常');
    }

    // 获取角色数据
    this.info('获取角色信息...');
    const roleData = await this.fetchRoleData();

    // 检查活跃度
    const activityResult = this.checkActivity(roleData);
    if (activityResult.shouldSkip) {
      this.callbacks?.onProgress?.(100);
      return;
    }

    this.info('开始执行每日任务');

    // 保存当前阵容
    this.originalFormation = await this.getCurrentFormation();
    if (this.originalFormation) {
      this.info(`当前阵容: ${this.originalFormation}`);
    }

    // 提取任务状态
    const completedTasks = roleData.dailyTask?.complete ?? {};
    const statistics = roleData.statistics ?? {};
    const statisticsTime = roleData.statisticsTime ?? {};

    // ✅ 根据活跃度决定执行哪些任务
    let allTasks = []; // 每项格式: { fn, module }
    
    // 获取模块延迟的辅助函数
    const getModuleDelay = (moduleName) => {
      const md = this.batchSettings?.moduleDelays;
      if (md) {
        return md[moduleName] || md.default || this.delaySettings.taskDelay;
      }
      return this.delaySettings.taskDelay;
    };

    if (activityResult.isFullActivity) {
      // 活跃度为100时，只执行4个特定任务
      this.info('🎯 活跃度为100，执行精简任务模式');
      
      const limitedTaskBuilders = [
        { build: () => this.buildArenaTask(), module: 'arena' },
        { build: () => this.buildDeepSeaLampTask(statisticsTime), module: 'treasure' },
        { build: () => this.buildFreeSweepTickets(), module: 'activity' },
        { build: () => this.buildRewardTasks(), module: 'daily' },
      ];
      
      allTasks = limitedTaskBuilders.flatMap(({ build, module }) => 
        build().map(fn => ({ fn, module }))
      );
      this.info(`精简模式：共 ${allTasks.length} 个任务待执行`);
    } else {
      // 活跃度小于100时，执行完整任务列表
      const taskBuilders = [
        { build: () => this.buildBasicTasks(completedTasks, statistics, statisticsTime, roleData), module: 'daily' },
        { build: () => this.buildSaltBottleTasks(completedTasks), module: 'daily' },
        { build: () => this.buildArenaTask(), module: 'arena' },
        { build: () => this.buildBossTasks(statistics, statisticsTime), module: 'treasure' },
        { build: () => this.buildFixedRewardTasks(), module: 'club' },
        { build: () => this.buildActivityTasks(statistics, statisticsTime), module: 'activity' },
        { build: () => this.buildBlackMarketTask(), module: 'store' },
        { build: () => this.buildDreamWorldTask(), module: 'treasure' },
        { build: () => this.buildDeepSeaLampTask(statisticsTime), module: 'treasure' },
        { build: () => this.originalFormation ? [() => this.restoreFormation()] : [], module: 'daily' },
        { build: () => this.buildRewardTasks(), module: 'daily' },
      ];
      
      allTasks = taskBuilders.flatMap(({ build, module }) => 
        build().map(fn => ({ fn, module }))
      );
      this.info(`完整模式：共 ${allTasks.length} 个任务待执行`);
    }

    // 执行任务
    const total = allTasks.length;
    this.has400340Error = false; // ✅ 重置可重试错误标记（400340/200750/11800010）
    let completedCount = 0;

    for (let i = 0; i < allTasks.length; i++) {
      try {
        const { fn, module } = allTasks[i];
        await fn();
        completedCount++;
        this.callbacks?.onProgress?.(Math.floor(((i + 1) / total) * 100));
        // 使用模块延迟代替全局任务延迟
        await delay(getModuleDelay(module));
      } catch (error) {
        // ✅ 检测可重试错误码，标记需要外层重试
        const errMsg = error?.message || '';
        if (errMsg.includes('400340') || errMsg.includes('200750') || errMsg.includes('11800010')) {
          this.has400340Error = true;
          const code = errMsg.includes('400340') ? '400340' : errMsg.includes('200750') ? '200750' : '11800010';
          this.warn(`遇到${code}服务器限流，停止后续任务（已完成${completedCount}/${total}），交由外层重试机制处理`);
          // ✅ 立即中断循环，避免后续任务也被限流白白浪费重试次数
          break;
        }
      }
    }

    if (!this.has400340Error) {
      this.callbacks?.onProgress?.(100);
      this.success(`任务执行完成 (${completedCount}/${total})`);
    }
    
    return { has400340Error: this.has400340Error, completedCount, totalCount: total };
  }
}