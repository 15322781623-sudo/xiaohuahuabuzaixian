/**
 * 消耗活动管理器
 * 处理宝箱、钓鱼、招募、火把等消耗活动的批量执行
 * 包含宝箱积分计算功能
 * 
 * 重构说明：将前端的业务逻辑和配置数据移至此处
 */

class ConsumeActivityManager {
  constructor() {
    // 消耗活动任务名称映射
    this.taskNames = {
      1: '招募',
      2: '宝箱',
      3: '鱼竿',
      4: '盐罐',
      5: '金砖'
    };

    // 消耗活动任务档位配置 (参考 ConsumptionTask.ts)
    this.missionTypes = {
      1: [ // 招募
        { num: 80 }, { num: 160 }, { num: 240 }, { num: 320 }, { num: 400 },
        { num: 560 }, { num: 720 }, { num: 880 }, { num: 1040 }, { num: 1200 },
        { num: 1440 }, { num: 1680 }, { num: 1920 }, { num: 2160 }, { num: 2400 },
        { num: 2720 }, { num: 3040 }, { num: 3360 }, { num: 3680 }, { num: 4000 }
      ],
      2: [ // 宝箱
        { num: 2000 }, { num: 4000 }, { num: 6000 }, { num: 8000 }, { num: 10000 },
        { num: 14000 }, { num: 18000 }, { num: 22000 }, { num: 26000 }, { num: 30000 },
        { num: 36000 }, { num: 42000 }, { num: 48000 }, { num: 54000 }, { num: 60000 },
        { num: 68000 }, { num: 76000 }, { num: 84000 }, { num: 92000 }, { num: 100000 }
      ],
      3: [ // 鱼竿
        { num: 25 }, { num: 50 }, { num: 75 }, { num: 125 }, { num: 175 },
        { num: 225 }, { num: 300 }, { num: 375 }, { num: 450 }, { num: 525 },
        { num: 625 }, { num: 725 }, { num: 825 }, { num: 925 }, { num: 1050 },
        { num: 1175 }, { num: 1300 }, { num: 1450 }, { num: 1600 }, { num: 1750 }
      ],
      4: [ // 盐罐
        { num: 3 }, { num: 6 }, { num: 9 }, { num: 12 }, { num: 15 },
        { num: 18 }, { num: 21 }, { num: 24 }, { num: 27 }, { num: 30 },
        { num: 33 }, { num: 36 }, { num: 39 }, { num: 42 }, { num: 45 },
        { num: 48 }, { num: 51 }, { num: 54 }, { num: 57 }, { num: 60 }
      ],
      5: [ // 金砖
        { num: 10000 }, { num: 20000 }, { num: 30000 }, { num: 40000 }, { num: 50000 },
        { num: 70000 }, { num: 90000 }, { num: 110000 }, { num: 130000 }, { num: 150000 },
        { num: 180000 }, { num: 210000 }, { num: 240000 }, { num: 270000 }, { num: 300000 },
        { num: 340000 }, { num: 380000 }, { num: 420000 }, { num: 460000 }, { num: 500000 }
      ]
    };

    // 消耗活动奖励配置 (每档奖励的普通道具数量)
    this.rewardConfigs = {
      1: [ // 招募
        { num: 8 }, { num: 8 }, { num: 8 }, { num: 8 }, { num: 8 },
        { num: 16 }, { num: 16 }, { num: 16 }, { num: 16 }, { num: 16 },
        { num: 24 }, { num: 24 }, { num: 24 }, { num: 24 }, { num: 24 },
        { num: 32 }, { num: 32 }, { num: 32 }, { num: 32 }, { num: 32 }
      ],
      2: [ // 宝箱
        { num: 4 }, { num: 4 }, { num: 4 }, { num: 4 }, { num: 4 },
        { num: 8 }, { num: 8 }, { num: 8 }, { num: 8 }, { num: 8 },
        { num: 12 }, { num: 12 }, { num: 12 }, { num: 12 }, { num: 12 },
        { num: 16 }, { num: 16 }, { num: 16 }, { num: 16 }, { num: 16 }
      ],
      3: [ // 鱼竿
        { num: 4 }, { num: 4 }, { num: 4 }, { num: 8 }, { num: 8 },
        { num: 8 }, { num: 12 }, { num: 12 }, { num: 12 }, { num: 12 },
        { num: 16 }, { num: 16 }, { num: 16 }, { num: 16 }, { num: 20 },
        { num: 20 }, { num: 20 }, { num: 24 }, { num: 24 }, { num: 24 }
      ],
      4: [ // 盐罐
        { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 },
        { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 },
        { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 },
        { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 }, { num: 1 }
      ],
      5: [ // 金砖
        { num: 3 }, { num: 3 }, { num: 3 }, { num: 3 }, { num: 3 },
        { num: 6 }, { num: 6 }, { num: 6 }, { num: 6 }, { num: 6 },
        { num: 9 }, { num: 9 }, { num: 9 }, { num: 9 }, { num: 9 },
        { num: 12 }, { num: 12 }, { num: 12 }, { num: 12 }, { num: 12 }
      ]
    };

    // 消耗活动配置
    this.config = {
      globalDelay: 500,  // 全局延迟（ms）
      upgradeStarDelay: 1200,  // 升星任务专用延迟（ms）
      
      // 宝箱类型配置（包含积分比例）
      chestTypes: {
        2001: { name: '木质宝箱', itemId: 2001, pointRatio: 1 },
        2002: { name: '青铜宝箱', itemId: 2002, pointRatio: 10 },
        2003: { name: '黄金宝箱', itemId: 2003, pointRatio: 20 },
        2004: { name: '铂金宝箱', itemId: 2004, pointRatio: 50 },
        2005: { name: '钻石宝箱', itemId: 2005, pointRatio: 0 }
      },
      
      // 宝箱积分奖励阶梯（每达到一个阶梯奖励100分）
      pointMilestones: [1000, 2000, 4000, 6000, 8000],
      
      // 宝箱积分奖励配置（按顺序循环）
      pointRewards: [
        { label: '青铜宝箱', value: 10, reward: 10 },
        { label: '青铜宝箱', value: 20, reward: 10 },
        { label: '黄金宝箱', value: 30, reward: 20 },
        { label: '铂金宝箱', value: 40, reward: 50 },
        { label: '铂金宝箱', value: 80, reward: 50 },
        { label: '铂金宝箱', value: 100, reward: 50 },
        { label: '黄金宝箱', value: 70, reward: 20 },
        { label: '铂金宝箱', value: 50, reward: 50 },
        { label: '钻石宝箱', value: 100, reward: 0 }
      ],
      
      // 钓鱼类型配置
      fishingTypes: {
        1: { name: '普通鱼竿', type: 1, itemId: 1011 },
        2: { name: '黄金鱼竿', type: 2, itemId: 1012 }
      },
      
      // 招募类型配置
      recruitTypes: {
        3: { name: '免费招募', recruitType: 3 },
        1: { name: '付费招募', recruitType: 1, itemId: 1001 }
      },
      
      // 火把类型配置
      torchTypes: {
        1008: { name: '普通火把', itemId: 1008 },
        1009: { name: '青铜火把', itemId: 1009 },
        1010: { name: '咸神火把', itemId: 1010 }
      },
      
      // 升星配置
      upgradeStarConfig: {
        globalDelay: 300,           // 升星操作延迟（ms）
        maxAttemptsPerHero: 30,     // 每个英雄最大升星尝试次数
        maxBookUpgradeAttempts: 30, // 图鉴升星最大尝试次数
        fishUpgradeDelay: 200,      // 鱼灵升星延迟（ms）
        maxStarLevel: 30,           // 最大星级
        forbiddenHeroIds: [223, 304, 305, 310], // 禁止升星的英雄ID
        // 升星消耗碎片数量（按星级索引）
        fallbackStarSpend: [8,8,8,8,8,40,40,40,40,40,80,80,80,80,80,200,200,200,200,200,400,400,400,400,400,400,400,400,400,400],
        // 英雄ID范围
        heroIdRanges: {
          purple: { start: 101, end: 120, synthesizeFragments: 8 },   // 紫将
          orange: { start: 201, end: 228, synthesizeFragments: 4 },   // 橙将
          red: { start: 301, end: 314, synthesizeFragments: 1 }       // 红将
        }
      }
    };
    
    // 任务指令映射
    this.taskCommands = {
      chest: {
        cmd: 'item_openbox',
        getParams: (typeId, quantity) => ({ itemId: parseInt(typeId), number: quantity })
      },
      fishing: {
        cmd: 'artifact_lottery',
        getParams: (typeId, quantity) => ({ lotteryNumber: quantity, newFree: true, type: parseInt(typeId) })
      },
      recruit: {
        cmd: 'hero_recruit',
        getParams: (typeId, quantity) => ({ byClub: false, recruitNumber: quantity, recruitType: parseInt(typeId) })
      },
      torch: {
        cmd: 'item_consume',
        getParams: (typeId, quantity) => ({ itemId: parseInt(typeId), quantity: quantity })
      },
      // 升星相关指令
      heroSynthetic: {
        cmd: 'hero_synthetic',
        getParams: (itemId) => ({ itemId: parseInt(itemId) })
      },
      heroUpgradeStar: {
        cmd: 'hero_heroupgradestar',
        getParams: (heroId) => ({ heroId: parseInt(heroId) })
      },
      bookUpgrade: {
        cmd: 'book_upgrade',
        getParams: (heroId) => ({ heroId: parseInt(heroId) })
      },
      bookClaimReward: {
        cmd: 'book_claimpointreward',
        getParams: () => ({})
      },
      artifactUpgradeStar: {
        cmd: 'artifact_upgradestar',
        getParams: (heroId, itemId) => ({ heroId: parseInt(heroId), itemId: parseInt(itemId) })
      },
      bookUpgradeArtifact: {
        cmd: 'book_upgradeartifact',
        getParams: (artifactId) => ({ artifactId: parseInt(artifactId) })
      }
    };
    
    // 任务状态管理（按用户ID）
    this.taskStates = new Map();
  }
  
  /**
   * 获取消耗活动配置
   */
  getConfig() {
    return {
      success: true,
      config: this.config
    };
  }
  
  /**
   * 更新全局延迟设置
   */
  updateDelay(userId, delay, type = 'global') {
    const delayValue = Math.max(0, parseInt(delay) || 0);
    
    if (type === 'upgrade') {
      this.config.upgradeStarDelay = delayValue;
    } else {
      this.config.globalDelay = delayValue;
    }
    
    return {
      success: true,
      delay: delayValue,
      type: type
    };
  }
  
  /**
   * 获取用户任务状态
   */
  getTaskState(userId) {
    if (!this.taskStates.has(userId)) {
      this.taskStates.set(userId, {
        isRunning: false,
        isPaused: false,
        isStopped: false,
        currentTask: null,
        logs: []
      });
    }
    return this.taskStates.get(userId);
  }
  
  /**
   * 暂停任务
   */
  pauseTask(userId) {
    const state = this.getTaskState(userId);
    state.isPaused = !state.isPaused;
    return {
      success: true,
      isPaused: state.isPaused
    };
  }
  
  /**
   * 停止任务
   */
  stopTask(userId) {
    const state = this.getTaskState(userId);
    state.isStopped = true;
    state.isPaused = false;
    state.isRunning = false;
    state.currentTask = null;
    return {
      success: true,
      message: '任务已停止'
    };
  }
  
  /**
   * 获取任务执行参数
   * @param {string} moduleType - 模块类型：chest/fishing/recruit/torch
   * @param {string} typeId - 类型ID
   * @param {number} quantity - 数量
   */
  getTaskParams(moduleType, typeId, quantity) {
    const taskConfig = this.taskCommands[moduleType];
    if (!taskConfig) {
      return { success: false, error: '无效的模块类型' };
    }
    
    // 确保 typeId 和 quantity 是正确的类型
    const numTypeId = parseInt(typeId) || 0;
    const numQuantity = parseInt(quantity) || 0;
    
    if (numQuantity <= 0) {
      return { success: false, error: '数量必须大于0' };
    }
    
    // 获取类型配置
    let typeConfig;
    switch (moduleType) {
      case 'chest':
        typeConfig = this.config.chestTypes[numTypeId];
        break;
      case 'fishing':
        typeConfig = this.config.fishingTypes[numTypeId];
        break;
      case 'recruit':
        typeConfig = this.config.recruitTypes[numTypeId];
        break;
      case 'torch':
        typeConfig = this.config.torchTypes[numTypeId];
        break;
    }
    
    if (!typeConfig) {
      return { success: false, error: '无效的类型ID' };
    }
    
    // 计算执行次数和每次数量
    let execCount, singleQty;
    if (numQuantity <= 10) {
      execCount = 1;
      singleQty = numQuantity;
    } else {
      execCount = Math.floor(numQuantity / 10);
      singleQty = 10;
      if (numQuantity % 10 > 0) {
        execCount++;
      }
    }
    
    const result = {
      success: true,
      cmd: taskConfig.cmd,
      name: typeConfig.name,
      moduleType: moduleType,
      typeId: numTypeId,  // 确保是数字类型
      itemId: typeConfig.itemId,  // 已经是数字类型
      execCount: execCount,
      singleQty: singleQty,
      totalQty: numQuantity,  // 确保是数字类型
      getParams: (qty) => taskConfig.getParams(numTypeId, qty),
      delay: this.config.globalDelay
    };
    
    return result;
  }
  
  /**
   * 获取升星任务参数
   * 返回升星任务所需的配置和指令信息
   */
  getUpgradeStarParams() {
    const config = this.config.upgradeStarConfig;
    const ranges = config.heroIdRanges;
    
    // 生成英雄ID列表（排除禁止升星的英雄）
    const heroIds = [
      ...Array.from({length: ranges.purple.end - ranges.purple.start + 1}, (_, i) => ranges.purple.start + i),
      ...Array.from({length: ranges.orange.end - ranges.orange.start + 1}, (_, i) => ranges.orange.start + i),
      ...Array.from({length: ranges.red.end - ranges.red.start + 1}, (_, i) => ranges.red.start + i)
    ].filter(id => !config.forbiddenHeroIds.includes(id));
    
    return {
      success: true,
      heroIds: heroIds,
      config: {
        globalDelay: config.globalDelay,
        maxAttemptsPerHero: config.maxAttemptsPerHero,
        maxBookUpgradeAttempts: config.maxBookUpgradeAttempts,
        fishUpgradeDelay: config.fishUpgradeDelay,
        maxStarLevel: config.maxStarLevel,
        forbiddenHeroIds: config.forbiddenHeroIds,
        fallbackStarSpend: config.fallbackStarSpend,
        heroIdRanges: ranges
      },
      commands: {
        heroSynthetic: this.taskCommands.heroSynthetic.cmd,
        heroUpgradeStar: this.taskCommands.heroUpgradeStar.cmd,
        bookUpgrade: this.taskCommands.bookUpgrade.cmd,
        bookClaimReward: this.taskCommands.bookClaimReward.cmd,
        artifactUpgradeStar: this.taskCommands.artifactUpgradeStar.cmd,
        bookUpgradeArtifact: this.taskCommands.bookUpgradeArtifact.cmd
      }
    };
  }
  
  /**
   * 获取升星任务指令参数
   * @param {string} taskType - 任务类型：heroSynthetic/heroUpgradeStar/bookUpgrade/bookClaimReward/artifactUpgradeStar/bookUpgradeArtifact
   * @param {Object} params - 参数对象
   */
  getUpgradeTaskParams(taskType, params = {}) {
    const taskConfig = this.taskCommands[taskType];
    if (!taskConfig) {
      return { success: false, error: '无效的升星任务类型' };
    }
    
    let cmdParams;
    switch (taskType) {
      case 'heroSynthetic':
        cmdParams = taskConfig.getParams(params.itemId);
        break;
      case 'heroUpgradeStar':
      case 'bookUpgrade':
        cmdParams = taskConfig.getParams(params.heroId);
        break;
      case 'bookClaimReward':
        cmdParams = taskConfig.getParams();
        break;
      case 'artifactUpgradeStar':
        cmdParams = taskConfig.getParams(params.heroId, params.itemId);
        break;
      case 'bookUpgradeArtifact':
        cmdParams = taskConfig.getParams(params.artifactId);
        break;
      default:
        return { success: false, error: '未知的任务类型' };
    }
    
    return {
      success: true,
      cmd: taskConfig.cmd,
      params: cmdParams,
      delay: this.config.upgradeStarConfig.globalDelay
    };
  }
  
  /**
   * 获取物品数量（从角色数据中提取）
   */
  getItemCount(items, itemId) {
    if (!items) return 0;
    
    // 数组结构
    if (Array.isArray(items)) {
      const found = items.find(it => 
        Number(it.id ?? it.itemId) === itemId
      );
      if (!found) return 0;
      return Number(found.num ?? found.count ?? found.quantity ?? 0);
    }
    
    // 对象结构
    const node = items[String(itemId)] ?? items[itemId];
    if (node == null) {
      const match = Object.values(items).find(
        (v) => Number(v?.itemId ?? v?.id) === itemId
      );
      if (match) return Number(match.num ?? match.count ?? match.quantity ?? 0);
      return 0;
    }
    
    if (typeof node === 'number') return Number(node);
    if (typeof node === 'object') return Number(node.num ?? node.count ?? node.quantity ?? 0);
    return Number(node) || 0;
  }
  
  /**
   * 从角色数据中获取所有资源数量
   * @deprecated 使用 getResourceCounts 代替
   */
  getAllResourceQuantities(roleData) {
    const items = roleData?.role?.items || roleData?.items || roleData?.itemList || roleData?.bag?.items || roleData?.inventory || null;
    
    return {
      // 宝箱
      chest_2001: this.getItemCount(items, 2001),
      chest_2002: this.getItemCount(items, 2002),
      chest_2003: this.getItemCount(items, 2003),
      chest_2004: this.getItemCount(items, 2004),
      chest_2005: this.getItemCount(items, 2005),
      
      // 鱼竿
      fishing_1: this.getItemCount(items, 1011),
      fishing_2: this.getItemCount(items, 1012),
      
      // 招募令
      recruit_1: this.getItemCount(items, 1001),
      recruit_3: roleData?.recruit?.freeRecruitNum || 0,
      
      // 火把
      torch_1008: this.getItemCount(items, 1008),
      torch_1009: this.getItemCount(items, 1009),
      torch_1010: this.getItemCount(items, 1010)
    };
  }

  /**
   * 获取所有资源数量（符合设计文档规范）
   * @param {Object} roleData - 角色数据
   * @returns {Object} 资源数量数据，按类型分组
   */
  getResourceCounts(roleData) {
    const items = roleData?.role?.items || roleData?.items || roleData?.itemList || roleData?.bag?.items || roleData?.inventory || null;
    
    return {
      success: true,
      data: {
        // 宝箱数量
        chests: {
          2001: this.getItemCount(items, 2001),  // 木质宝箱
          2002: this.getItemCount(items, 2002),  // 青铜宝箱
          2003: this.getItemCount(items, 2003),  // 黄金宝箱
          2004: this.getItemCount(items, 2004),  // 铂金宝箱
          2005: this.getItemCount(items, 2005)   // 钻石宝箱
        },
        // 鱼竿数量
        fishing: {
          1011: this.getItemCount(items, 1011),  // 普通鱼竿
          1012: this.getItemCount(items, 1012)   // 黄金鱼竿
        },
        // 招募相关
        recruit: {
          1001: this.getItemCount(items, 1001),  // 招募令
          freeNum: roleData?.recruit?.freeRecruitNum || 0  // 免费招募次数
        },
        // 火把数量
        torch: {
          1008: this.getItemCount(items, 1008),  // 普通火把
          1009: this.getItemCount(items, 1009),  // 青铜火把
          1010: this.getItemCount(items, 1010)   // 咸神火把
        },
        // 消耗活动道具
        consumeItems: {
          5261: this.getItemCount(items, 5261),  // 普通道具
          5262: this.getItemCount(items, 5262),  // 金道具
          5278: this.getItemCount(items, 5278),  // 挥鼓助威道具
          5279: this.getItemCount(items, 5279),  // 消耗活动道具（可打开）
          5280: this.getItemCount(items, 5280)   // 黄金大枣
        }
      }
    };
  }
  
  /**
   * 添加任务日志
   */
  addLog(userId, message, type = 'info') {
    const state = this.getTaskState(userId);
    const log = {
      time: new Date().toISOString(),
      message: message,
      type: type
    };
    state.logs.push(log);
    
    // 只保留最近100条日志
    if (state.logs.length > 100) {
      state.logs = state.logs.slice(-100);
    }
    
    return log;
  }
  
  /**
   * 获取任务日志
   */
  getLogs(userId, limit = 50) {
    const state = this.getTaskState(userId);
    return {
      success: true,
      logs: state.logs.slice(-limit)
    };
  }
  
  /**
   * 清空任务日志
   */
  clearLogs(userId) {
    const state = this.getTaskState(userId);
    state.logs = [];
    return { success: true };
  }

  /**
   * 计算宝箱总积分
   * @param {Object} chestCounts - 各类宝箱数量 { 2001: 数量, 2002: 数量, ... }
   * @param {string} mode - 计算模式: 'all'(全开), 'noWood'(不开木质), 'noPlat'(不开铂金)
   * @returns {number} 总积分
   */
  calculateTotalPoints(chestCounts, mode = 'all') {
    let total = 0;
    for (const [itemId, count] of Object.entries(chestCounts)) {
      // 根据模式跳过特定宝箱
      if (mode === 'noWood' && itemId === '2001') continue;
      if (mode === 'noPlat' && itemId === '2004') continue;
      
      const config = this.config.chestTypes[itemId];
      if (config && config.pointRatio) {
        total += (count || 0) * config.pointRatio;
      }
    }
    return total;
  }

  /**
   * 递归计算宝箱积分和钻石宝箱（参考星驰.js的BoxCalculator逻辑）
   * @param {number} points - 当前积分
   * @param {number} required - 当前档位所需积分
   * @param {string} boxType - 当前档位宝箱类型
   * @param {boolean} skipPlatinum - 是否跳过铂金宝箱奖励
   * @param {number} diamondBoxes - 累计钻石宝箱数
   * @param {number} totalEarnedPoints - 累计获得的奖励积分
   * @returns {Object} 计算结果
   */
  calculateRecursive(points, required, boxType, skipPlatinum = false, diamondBoxes = 0, totalEarnedPoints = 0) {
    const stagesConfig = {
      values: [10, 20, 30, 40, 80, 100, 70, 50, 100],
      boxes: ['青铜宝箱', '青铜宝箱', '黄金宝箱', '铂金宝箱', '铂金宝箱', '铂金宝箱', '黄金宝箱', '铂金宝箱', '钻石宝箱']
    };
    
    const boxPointMap = {
      '青铜宝箱': 10,
      '黄金宝箱': 20,
      '铂金宝箱': 50,
      '钻石宝箱': 0
    };
    
    // 找到当前档位索引
    let stageIndex = stagesConfig.boxes.findIndex((box, index) => 
      box === boxType && stagesConfig.values[index] === required
    );
    
    if (stageIndex === -1) {
      // 默认从第一个档位开始
      stageIndex = 0;
      required = stagesConfig.values[0];
      boxType = stagesConfig.boxes[0];
    }
    
    // 积分不足，返回当前状态
    if (points < required) {
      return {
        totalEarnedPoints: totalEarnedPoints,
        diamondBoxes: diamondBoxes,
        remainingPoints: points,
        finalStageInfo: `积分值：${points}/${required} (${boxType})`
      };
    }
    
    // 统计各类宝箱获得数量
    const boxCounts = {
      '青铜宝箱': 0,
      '黄金宝箱': 0,
      '铂金宝箱': 0,
      '钻石宝箱': 0
    };
    
    let remainingPoints = points;
    
    // 模拟开箱过程
    while (remainingPoints >= stagesConfig.values[stageIndex]) {
      remainingPoints -= stagesConfig.values[stageIndex];
      boxCounts[stagesConfig.boxes[stageIndex]]++;
      stageIndex = (stageIndex + 1) % stagesConfig.values.length;
    }
    
    // 计算获得的奖励积分
    let earnedPoints = boxCounts['青铜宝箱'] * boxPointMap['青铜宝箱'] +
                       boxCounts['黄金宝箱'] * boxPointMap['黄金宝箱'] +
                       (skipPlatinum ? 0 : boxCounts['铂金宝箱'] * boxPointMap['铂金宝箱']);
    
    // 递归计算
    return this.calculateRecursive(
      remainingPoints + earnedPoints,
      stagesConfig.values[stageIndex],
      stagesConfig.boxes[stageIndex],
      skipPlatinum,
      diamondBoxes + boxCounts['钻石宝箱'],
      totalEarnedPoints + earnedPoints
    );
  }

  /**
   * 计算宝箱积分奖励（使用递归算法，参考星驰.js）
   * @param {number} basePoints - 宝箱裸分
   * @param {number} currentBoxPoint - 当前累计积分（从角色数据获取）
   * @param {number} lastRewardIndex - 上次领取奖励的索引（从角色数据获取）
   * @param {boolean} skipPlatinum - 是否跳过铂金宝箱奖励（不开铂金模式）
   * @returns {Object} 计算结果
   */
  calculatePointRewards(basePoints, currentBoxPoint = 0, lastRewardIndex = 0, skipPlatinum = false) {
    const stagesConfig = {
      values: [10, 20, 30, 40, 80, 100, 70, 50, 100],
      boxes: ['青铜宝箱', '青铜宝箱', '黄金宝箱', '铂金宝箱', '铂金宝箱', '铂金宝箱', '黄金宝箱', '铂金宝箱', '钻石宝箱']
    };
    
    // 计算初始积分（宝箱裸分 + 当前累计积分）
    const totalPoints = basePoints + currentBoxPoint;
    
    // 获取当前档位信息
    const currentRequired = stagesConfig.values[lastRewardIndex] || stagesConfig.values[0];
    const currentBoxType = stagesConfig.boxes[lastRewardIndex] || stagesConfig.boxes[0];
    
    // 递归计算
    const result = this.calculateRecursive(totalPoints, currentRequired, currentBoxType, skipPlatinum);
    
    // 计算最终总积分
    const finalPoints = basePoints + result.totalEarnedPoints;
    
    // 计算可完成轮数
    const completedRounds = (finalPoints / 8000).toFixed(2);
    const nextRoundNeed = 8000 - (finalPoints % 8000);
    
    return {
      basePoints: basePoints,                    // 宝箱裸分
      totalEarnedPoints: result.totalEarnedPoints, // 获得的奖励积分
      finalPoints: finalPoints,                  // 最终总积分
      completedRounds: completedRounds,          // 可完成轮数
      diamondBoxes: result.diamondBoxes,         // 可获得钻石宝箱数
      nextRoundNeed: nextRoundNeed,              // 下轮还需积分
      finalStageInfo: result.finalStageInfo      // 最终档位信息
    };
  }

  /**
   * 解析活动数据，提取消耗活动任务数据
   * @param {Object} commonActivityInfo - 活动信息
   * @returns {Object|null} 活动数据
   */
  parseActivityData(commonActivityInfo) {
    if (!commonActivityInfo) return null;
    
    // 查找包含有效任务ID (1-5) 的活动
    const activityData = Object.values(commonActivityInfo).find(activity => {
      if (!activity?.task) return false;
      return Object.keys(activity.task).some(key => {
        const id = Number(key);
        return id >= 1 && id <= 5;
      });
    });
    
    return activityData || null;
  }

  /**
   * 计算单个任务已获得的普通道具数量
   * @param {number} taskId - 任务ID
   * @param {number} consumed - 已消耗数量
   * @returns {number} 已获得的普通道具数量
   */
  calcObtainedForTask(taskId, consumed) {
    const rewardCfg = this.rewardConfigs[taskId];
    if (!rewardCfg || !rewardCfg.length || !consumed || consumed <= 0) return 0;
    
    const missionCfg = this.missionTypes[taskId] || [];
    
    // 计算已完成的档位数：missionCfg 中 num <= consumed 的数量
    let completedRounds = 0;
    for (let i = 0; i < missionCfg.length; i++) {
      const threshold = missionCfg[i]?.num || 0;
      if (consumed >= threshold) completedRounds++;
      else break;
    }
    
    // 累加 rewardCfg 前 completedRounds 项
    const len = rewardCfg.length;
    const lastVal = rewardCfg[len - 1]?.num || 0;
    let total = 0;
    for (let i = 0; i < completedRounds; i++) {
      if (i < len) total += rewardCfg[i]?.num || 0;
      else total += lastVal;
    }
    
    return total;
  }

  /**
   * 计算消耗活动进度列表
   * @param {Object} commonActivityInfo - 活动信息
   * @returns {Array} 进度列表
   */
  calculateProgressList(commonActivityInfo) {
    if (!commonActivityInfo) return [];
    
    // 解析活动数据
    const activityData = this.parseActivityData(commonActivityInfo);
    if (!activityData) return [];
    
    const tasks = activityData.task || {};
    
    return Object.keys(this.taskNames).map(key => {
      const id = Number(key);
      const current = tasks[id] || 0;
      const configs = this.missionTypes[id] || [];
      
      // 找到下一个未完成的目标
      let nextTarget = 0;
      let isCompleted = false;
      
      const nextConfig = configs.find(c => c.num > current);
      if (nextConfig) {
        nextTarget = nextConfig.num;
      } else {
        // 如果都完成了，取最后一个作为目标
        if (configs.length > 0) {
          nextTarget = configs[configs.length - 1].num;
          isCompleted = true;
        }
      }
      
      return {
        id,
        name: this.taskNames[id],
        current,
        nextTarget,
        isCompleted,
        obtainedItems: this.calcObtainedForTask(id, current)
      };
    });
  }

  /**
   * 获取消耗活动进度数据（供前端使用）
   * @param {Object} commonActivityInfo - 活动信息
   * @param {number} goldItem - 金道具数量
   * @param {number} ordinaryItem - 普通道具数量
   * @returns {Object} 完整的进度数据
   */
  getConsumeProgressData(commonActivityInfo, goldItem = 0, ordinaryItem = 0) {
    const progressList = this.calculateProgressList(commonActivityInfo);
    
    // 计算累计获得的普通道具
    const totalObtained = progressList.reduce((sum, item) => sum + (item.obtainedItems || 0), 0);
    
    // 计算金道具获取率
    let goldRate = 4; // 默认值
    if (goldItem > 0 && totalObtained > 0 && totalObtained > ordinaryItem) {
      goldRate = (totalObtained - ordinaryItem) / goldItem;
    }
    
    return {
      success: true,
      data: {
        progressList,
        totalObtained,
        goldItem,
        ordinaryItem,
        goldRate,
        // 目标金道具数量
        targetGold: 250,
        remainingGold: Math.max(0, 250 - goldItem)
      }
    };
  }

  /**
   * 获取宝箱积分计算数据
   * @param {Object} roleData - 角色数据
   * @returns {Object} 积分计算结果（包含三种模式）
   */
  getChestPointData(roleData) {
    const items = roleData?.role?.items || roleData?.items || roleData?.itemList || roleData?.bag?.items || {};
    const role = roleData?.role || roleData || {};
    
    // 获取各类宝箱数量
    const chestCounts = {
      2001: this.getItemCount(items, 2001),
      2002: this.getItemCount(items, 2002),
      2003: this.getItemCount(items, 2003),
      2004: this.getItemCount(items, 2004),
      2005: this.getItemCount(items, 2005)
    };
    
    // 获取当前累计积分和上次奖励索引
    const currentBoxPoint = Number(role.boxPoint || 0);
    const lastRewardIndex = Number(role.boxPointLastReward || 0);
    const openBoxCount = Number(role.statistics?.['activity:open:box'] || 0);
    
    // 计算三种模式的宝箱裸分
    const allPoints = this.calculateTotalPoints(chestCounts, 'all');       // 全开
    const noWoodPoints = this.calculateTotalPoints(chestCounts, 'noWood'); // 不开木质
    const noPlatPoints = this.calculateTotalPoints(chestCounts, 'noPlat'); // 不开铂金
    
    // 计算三种模式的奖励结果
    const allResult = this.calculatePointRewards(allPoints, currentBoxPoint, lastRewardIndex, false);
    const noWoodResult = this.calculatePointRewards(noWoodPoints, currentBoxPoint, lastRewardIndex, false);
    const noPlatResult = this.calculatePointRewards(noPlatPoints, currentBoxPoint, lastRewardIndex, true);
    
    // 获取下一个奖励信息
    const stagesConfig = {
      values: [10, 20, 30, 40, 80, 100, 70, 50, 100],
      boxes: ['青铜宝箱', '青铜宝箱', '黄金宝箱', '铂金宝箱', '铂金宝箱', '铂金宝箱', '黄金宝箱', '铂金宝箱', '钻石宝箱'],
      rewards: [10, 10, 20, 50, 50, 50, 20, 50, 0]
    };
    const nextRewardValue = stagesConfig.values[lastRewardIndex] || stagesConfig.values[0];
    const nextRewardLabel = stagesConfig.boxes[lastRewardIndex] || stagesConfig.boxes[0];
    const nextRewardPoints = stagesConfig.rewards[lastRewardIndex] || stagesConfig.rewards[0];
    const pointsToNextReward = Math.max(0, nextRewardValue - currentBoxPoint);
    
    return {
      success: true,
      data: {
        // 宝箱数量
        chestCounts: chestCounts,
        // 当前累计积分（已开箱获得的积分）
        currentBoxPoint: currentBoxPoint,
        // 上次奖励索引
        lastRewardIndex: lastRewardIndex,
        // 历史开箱总数
        openBoxCount: openBoxCount,
        
        // 【全开】模式结果
        allMode: {
          basePoints: allResult.basePoints,
          finalPoints: allResult.finalPoints,
          completedRounds: allResult.completedRounds,
          diamondBoxes: allResult.diamondBoxes,
          nextRoundNeed: allResult.nextRoundNeed,
          finalStageInfo: allResult.finalStageInfo
        },
        
        // 【不开木质】模式结果
        noWoodMode: {
          basePoints: noWoodResult.basePoints,
          finalPoints: noWoodResult.finalPoints,
          completedRounds: noWoodResult.completedRounds,
          diamondBoxes: noWoodResult.diamondBoxes,
          nextRoundNeed: noWoodResult.nextRoundNeed,
          finalStageInfo: noWoodResult.finalStageInfo
        },
        
        // 【不开铂金】模式结果
        noPlatMode: {
          basePoints: noPlatResult.basePoints,
          finalPoints: noPlatResult.finalPoints,
          completedRounds: noPlatResult.completedRounds,
          diamondBoxes: noPlatResult.diamondBoxes,
          nextRoundNeed: noPlatResult.nextRoundNeed,
          finalStageInfo: noPlatResult.finalStageInfo
        },
        
        // 兼容旧版本（使用全开模式数据）
        totalPoints: allResult.basePoints,
        finalPoints: allResult.finalPoints,
        earnedReward: allResult.totalEarnedPoints,
        completedRounds: allResult.completedRounds,
        diamondChests: allResult.diamondBoxes,
        
        // 下一个奖励信息
        nextReward: {
          label: nextRewardLabel,
          value: nextRewardValue,
          reward: nextRewardPoints,
          progress: currentBoxPoint,
          remaining: pointsToNextReward
        },
        // 里程碑配置
        milestones: this.config.pointMilestones,
        // 积分比例配置
        pointRatios: {
          2001: 1,
          2002: 10,
          2003: 20,
          2004: 50,
          2005: 0
        }
      }
    };
  }
}

export default ConsumeActivityManager;
