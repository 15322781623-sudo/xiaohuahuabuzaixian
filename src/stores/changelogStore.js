import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * 更新日志数据存储
 * 管理系统更新日志的状态和数据
 */
export const useChangelogStore = defineStore("changelog", () => {
  // ==================== State ====================

  const changelogs = ref([
    {
      version: "v2.19.0",
      date: "2026-07-04",
      type: "minor",
      title: "洗练助手UI优化 & BIN账号一键添加 & 战力过滤 & 任务完成情况优化",
      features: [
        "洗练助手UI全面重构：武将、装备、孔位改为宝箱式一行排列布局，自动平分空间",
        "新增孔位解锁进度显示：实时显示剩余多少次解锁下一孔（1孔0次/2孔10次/3孔100次/4孔1000次/5孔10000次）",
        "连续淬炼次数支持设置为0：次数为0时使用9999次上限，作为无限制批量淬炼的快捷入口",
        "连续淬炼智能默认值：自动计算下一孔所需次数减去500作为默认值，减少手动输入",
        "跳过橙红功能只能通过按钮开关控制：不通过次数控制，运行中禁用开关防止误操作",
        "孔位尺寸进一步缩小：优化padding、gap、字体大小，确保4个孔位在一行内完整显示",
        "响应式设计优化：桌面端、平板端、手机端三级断点适配，所有元素一行显示不换行",
        "新增定时任务勾选账号功能：支持在定时任务中选择特定账号执行，提升任务执行灵活性",
        "新增BIN账号一键添加全部功能：ServerRoleList组件右上角添加一键添加按钮，批量添加当前搜索过滤后的角色列表",
        "新增战力过滤逻辑：一键添加时自动过滤战力低于1亿的角色，只添加高战力角色",
        "新增全部删除功能：待添加角色列表上方添加全部删除按钮，一键清空所有待添加角色",
        "任务完成情况按钮解除限制：移除按钮禁用条件，随时可查看任务执行记录",
        "任务完成情况数据动态加载：打开Modal前自动从localStorage刷新最新数据，避免长时间未刷新导致数据丢失",
        "一键添加确认对话框优化：显示实际添加数量和过滤数量，防止误操作",
        "添加前确认机制：一键添加和全部删除操作前均弹出确认对话框，提升安全性",
      ],
      improvements: [
        "武将列表从网格布局改为flex一行排列，头像、名称、等级垂直堆叠显示",
        "装备标签从网格布局改为flex一行排列，名称、等级垂直堆叠显示",
        "孔位锁定区域从网格布局改为flex一行排列，复选框、名称、属性垂直堆叠显示",
        "所有UI元素统一使用flex: 1自动平分空间，属性名称过长时自动截断显示",
        "优化连续淬炼次数输入框最小值为0，支持无限制模式",
        "ServerRoleList组件新增addAll事件，支持批量添加角色",
        "待添加角色列表显示角色计数，方便用户了解待添加数量",
        "全部删除按钮使用TrashOutline图标，符合项目图标使用规范",
        "任务完成情况Modal标题动态显示记录数量",
        "优化串行队列处理逻辑，每个角色间隔2秒，避免transformToken并发冲突",
      ],
      fixes: [
        "修复执行任务情况显示问题：定时任务执行记录中账号状态误判为失败的bug，实际已成功执行的账号现在正确显示为成功",
        "修复定时任务执行记录只显示最近3条的限制，现在显示全部历史记录",
        "解除定时任务执行完成情况Modal的打开限制，不再要求必须先运行定时任务才能点击查看",
        "修复任务完成情况按钮长时间未刷新后无法触发的问题",
        "修复凌晨自动清空后按钮禁用导致无法查看历史记录的问题",
      ],
    },
    {
      version: "v2.18.0",
      date: "2026-07-04",
      type: "patch",
      title: "竞技场战斗结果反馈修复 & 批量任务性能优化 & 活跃度缓存",
      features: [
        "新增批量赛车专用刷新函数 refreshForBatchCar，仅获取车辆信息，减少60%+无效请求",
        "新增批量俱乐部签到专用刷新函数 refreshForBatchClub，仅获取俱乐部信息",
        "新增宝库信息专用刷新函数 refreshForBatchBossTower，用于批量宝库任务",
        "新增换皮闯关专用刷新函数 refreshForBatchSkinChallenge，用于批量换皮闯关/寻宝",
        "新增桃园任务专用刷新函数 refreshForBatchPeach，用于批量领取桃园任务",
        "新增活跃度数据缓存机制（refreshForBatchActivity），30秒有效期，避免频繁请求",
        "批量赛车完成后使用专用刷新函数替代全量 refreshGameData，提升执行效率",
        "批量俱乐部签到前使用专用刷新函数获取俱乐部信息，减少网络请求",
        "批量爬塔使用专用刷新函数获取塔信息，优化请求流程",
        "批量宝库任务使用专用刷新函数，减少60%+无效请求",
        "批量换皮闯关使用专用刷新函数，替代 activity_get 全量请求",
        "批量桃园任务使用专用刷新函数，优化任务领取流程",
        "挂机状态检查使用活跃度缓存（30秒），批量领取挂机时减少重复请求",
        "手动执行功能按钮添加任务完成情况记录，支持在任务完成情况 Modal 中查看手动执行的历史记录",
        "新增 executeManualTaskWithRecord 包装函数，为所有手动执行的批量功能添加执行记录、成功/失败状态统计和耗时统计",
      ],
      fixes: [
        "修复一键竞技场3次战斗后不显示胜负和积分变化的问题，正确解析 battleData.result.isWin、selfScore、oppoScore 字段",
        "新增 fallback 逻辑，当 isWin 字段缺失时通过 sponsor/accept 队伍血量判定胜负（全队curHP=0为战败）",
        "修复对手积分始终显示为正的问题，胜利时对手扣分、战败时对手加分",
        "修复 loadArenaRank() 在失败或未找到排名时将数据清零的问题，改为保留已有数据",
        '修复账号卡片领取挂机时"开始领取挂机"日志重复显示两次的问题',
        "修复单 token 模式调用 createTasksHangUp 时缺少 runStreaming 依赖导致的 TypeError",
        '修复 taskPromises 未 await 导致"批量竞技场战斗完成"在战斗结束前就打印的问题',
        "删除硬编码重试逻辑（等60秒手动重连），统一到 retryTargetTokens + batchSettings 参数驱动的重试机制",
        "修复 WebSocket 连接成功后立即加载数据，因服务端验证 token expired 导致 StarChallenge/MeritBook/ArenaRank 三个请求各超时5秒的问题",
        "修复定时任务执行完成情况中账号状态误判为失败的问题，实际已成功执行的账号现在正确显示为成功",
        "修复定时任务执行记录只显示最近3条的限制，现在显示全部历史记录",
        "解除定时任务执行完成情况 Modal 的打开限制，不再要求必须先运行定时任务才能点击查看",
        "解除 Token 页面2分钟自动跳转到批量日常页面的限制，Token 页面不再自动跳转，仅首页保留自动跳转逻辑",
      ],
      improvements: [
        "连接成功后延迟1.5秒再加载数据，并二次校验连接状态，避免 token 过期时发送无效请求",
        "竞技场响应结构兼容 battleData.result.isWin、result.isWin、body.result.isWin 多种响应路径",
        "批量任务刷新函数遵循职责分离原则，每个函数专注单一业务场景，命名清晰表达用途",
      ],
    },
    {
      version: "v2.17.0",
      date: "2026-07-02",
      type: "patch",
      title: "火把加速验证优化 & 批量推图定时停止连接释放",
      features: [
        "任务执行情况统计：新增定时任务执行记录 Modal，支持成功/失败/部分完成状态统计和查看",
        "批量推图火把使用验证：item_consume 调用后检查响应，错误时停止尝试并记录错误码",
        "fight_calcleveltime 接口增加 levelId 参数，确保服务器正确计算战斗时间",
        "火把激活次数统计修正：只有成功的 item_consume 才会计入总时长",
        "火把续用逻辑增强：过期前自动检测并提前续用，避免战斗中火把失效",
        "批量推图定时停止功能优化：stopAll=true 时主动断开所有账号的 WebSocket 连接，释放资源",
        "定时任务活动检测优化：换皮闯关使用 activity_get 命令动态检测 actId，不再依赖周类型判断",
        "批量推图火把验证问题：战斗剩余时间不受火把影响，需进一步排查服务器响应逻辑",
      ],
      improvements: [
        "俱乐部 BOSS 次数默认值从 1 次调整为 3 次，名称统一为“俱乐部 BOSS 次数”",
        "每日 BOSS 次数与俱乐部 BOSS 次数显示名称修正，避免模板配置混淆",
      ],
      notes: [
        "⚠️ 火把加速功能待验证：当前火把使用后战斗时间无变化，建议用户反馈实际战斗耗时数据",
      ],
    },
    {
      version: "v2.16.0",
      date: "2026-07-02",
      type: "minor",
      title: "批量任务重试并发化 & 功能卡片交互升级",
      features: [
        "武将升级重构：支持自定义目标等级（1-6000），自动升级加进阶",
        "战斗助手增强：战斗次数自定义输入、快捷按钮、执行延迟配置、操作日志实时显示",
        "换皮闯关增加操作日志区域，修复活动状态判断（actId为空时不显示遮罩）",
        "十殿挑战组合布局：星级挑战与阎罗挑战上下排列，视觉更紧凑",
        "阵容助手新增无损换将功能，阵容应用增加实时日志显示",
        "定时任务导入时自动过滤无效账号，只保留本地存在的token并提示过滤数量",
        "定时任务执行时自动清理已删除账号，防止无效账号参与执行",
        "BIN数据新增localStorage备份，导出按钮优先从备份恢复，防止IndexedDB被清理后数据丢失",
        "批量任务完成后显示总执行用时（分+秒）",
        "更新APK/EXE应用图标，新增图标生成脚本",
      ],
      improvements: [
        "批量任务所有模块重试逻辑统一改为safeDelay + runStreaming并发控制，大幅提升重试效率",
        "俱乐部BOSS次数默认值从1次调整为3次，名称统一为“俱乐部BOSS次数”",
        "梦境战斗增加防华佗/董卓回血死循环机制，连续失败5次自动停止",
        "消耗活动卡片增加移动端响应式布局，适配768px以下屏幕",
        "无限阵容武将卡片展示优化，布局更紧凑美观",
        "BIN Token刷新使用串行队列（间隔2秒），防止并发请求触发服务器限流",
        "Token删除时同步清理localStorage备份数据",
      ],
    },
    {
      version: "v2.15.0",
      date: "2026-07-01",
      type: "patch",
      title: "功法残卷充值特权赛季计算修复",
      fixes: [
        "修复功法残卷充值特权判断逻辑，改为通过28天赛季周期动态计算当前赛季开始时间",
        "修复旧赛季充值被误判为特权的问题，只有当前赛季内的充值才算特权开启",
      ],
    },
    {
      version: "v2.14.0",
      date: "2026-07-01",
      type: "minor",
      title: "珍宝阁商店购买 & 功法残卷特权修复",
      features: [
        "新增珍宝阁商店多选购买功能，支持铂金宝箱/军团币/招募令/万能红将碎片",
        "珍宝阁商店购买支持定时任务自动执行",
      ],
      improvements: [
        "优化批量日常页面响应式布局，断点从480px调整为600px",
        "优化珍宝阁商店购买命令超时时间为10秒",
      ],
      fixes: [
        "修复功法残卷赠送充值特权判断逻辑，使用赛季充值时间与赛季开始时间对比",
        "修复推图定时任务未包含在全量导出中的问题",
      ],
    },
    {
      version: "v2.13.0",
      date: "2026-06-30",
      type: "minor",
      title: "批量推图每小时自动刷新状态",
      features: [
        "新增批量推图每小时自动刷新状态机制，防止长时间挂机卡住",
      ],
      improvements: [
        "优化智能发车条件，支持强制用金砖刷新模式",
        "优化金砖模式刷新次数，从13次提升到20次",
        "优化卡密验证逻辑，支持永久有效卡密",
      ],
      fixes: [
        "修复EXE激活弹窗不显示的问题",
      ],
    },
    {
      version: "v2.12.0",
      date: "2026-06-30",
      type: "minor",
      title: "星级队伍自动解散与卡密验证优化",
      features: [
        "新增更新日志导航标签页，方便查看版本更新记录",
      ],
      improvements: [
        "优化星级队伍扫描逻辑，检测到队长持有队伍时自动解散",
        "优化日常任务执行，确保每日咸王考验不遗漏账号",
        "优化卡密验证逻辑，避免已激活设备反复弹窗",
      ],
      fixes: [
        "修复星级队伍扫描星数时扫出上周残留队伍的问题",
        "修复日常任务活跃度100时跳过BOSS任务导致漏号的问题",
        "修复卡密验证服务端返回400时反复弹窗要求重新激活的问题",
      ],
    },
    {
      version: "v1.3.0",
      date: "2025-01-15",
      type: "minor",
      title: "俱乐部战绩与身份牌功能上线",
      features: [
        "新增俱乐部盐场战绩查询功能，支持内联和弹窗两种展示模式",
        "新增身份牌组件，展示玩家个人信息和游戏数据",
        "新增游戏状态页面的日常/俱乐部/活动分区切换",
        "新增战绩数据导出功能，支持Excel格式",
        "新增月度任务进度跟踪功能",
      ],
      improvements: [
        "优化俱乐部信息数据聚合逻辑，兼容多版本服务端",
        "优化响应式布局以适配新的界面结构",
        "改进Token持久化存储，使用IndexedDB替代localStorage",
        "优化游戏状态页面的数据加载性能",
      ],
      fixes: [
        "修复俱乐部战绩数据加载失败的问题",
        "修复身份牌在某些情况下显示异常的bug",
        "修复月度任务进度计算错误的问题",
      ],
    },
    {
      version: "v1.2.1",
      date: "2025-01-08",
      type: "patch",
      title: "WebSocket连接优化",
      improvements: [
        "改进WebSocket重连机制，提高连接稳定性",
        "优化消息队列管理，防止消息丢失",
        "增强心跳检测机制，及时发现连接异常",
      ],
      fixes: [
        "修复WebSocket连接在网络波动时断开的问题",
        "修复消息发送失败后未正确重试的bug",
        "修复心跳超时后未触发重连的问题",
      ],
    },
    {
      version: "v1.2.0",
      date: "2025-01-01",
      type: "minor",
      title: "Token管理系统重构",
      features: [
        "全新的Token管理界面，支持多账号管理",
        "新增Token导入功能，支持Base64格式解析",
        "新增Token状态监控，实时显示连接状态",
        "新增Token分组功能，方便管理多个账号",
      ],
      improvements: [
        "优化Token解析算法，支持更多格式",
        "改进Token存储机制，使用加密存储",
        "优化Token切换速度，提升用户体验",
        "改进路由守卫逻辑，基于Token状态进行访问控制",
      ],
      breaking: [
        "旧的用户认证系统已废弃，全面迁移到Token管理系统",
        "需要重新导入所有游戏账号Token",
      ],
    },
    {
      version: "v1.1.5",
      date: "2024-12-20",
      type: "hotfix",
      title: "紧急修复BON协议解析问题",
      fixes: [
        "修复BON协议解析中的严重bug，导致部分消息无法正确解析",
        "修复加密消息解密失败的问题",
        "修复消息序列号错误导致的通信异常",
      ],
    },
    {
      version: "v1.1.0",
      date: "2024-12-15",
      type: "minor",
      title: "日常任务系统上线",
      features: [
        "新增日常任务管理页面",
        "新增任务进度跟踪功能",
        "新增任务自动完成功能",
        "新增任务奖励领取提醒",
      ],
      improvements: [
        "优化任务数据加载速度",
        "改进任务状态更新机制",
        "优化任务列表渲染性能",
      ],
    },
    {
      version: "v1.0.0",
      date: "2024-12-01",
      type: "major",
      title: "系统正式发布",
      features: [
        "基础Token管理功能",
        "WebSocket连接管理",
        "BON协议实现",
        "游戏角色管理",
        "基础UI框架",
        "响应式设计支持",
      ],
    },
  ]);

  // ==================== Computed ====================

  /**
   * 最新版本
   */
  const latestVersion = computed(() => {
    return changelogs.value.length > 0 ? changelogs.value[0] : null;
  });

  /**
   * 获取最近N条更新日志
   */
  const getRecentChangelogs = computed(() => {
    return (count = 3) => {
      return changelogs.value.slice(0, count);
    };
  });

  /**
   * 按类型筛选更新日志
   */
  const getChangelogsByType = computed(() => {
    return (type) => {
      return changelogs.value.filter((log) => log.type === type);
    };
  });

  /**
   * 统计数据
   */
  const statistics = computed(() => {
    return {
      totalVersions: changelogs.value.length,
      majorVersions: changelogs.value.filter((log) => log.type === "major")
        .length,
      minorVersions: changelogs.value.filter((log) => log.type === "minor")
        .length,
      patchVersions: changelogs.value.filter((log) => log.type === "patch")
        .length,
      hotfixVersions: changelogs.value.filter((log) => log.type === "hotfix")
        .length,
    };
  });

  // ==================== Actions ====================

  /**
   * 添加新的更新日志
   * @param {object} changelog - 更新日志对象
   */
  const addChangelog = (changelog) => {
    changelogs.value.unshift(changelog);
    saveToLocalStorage();
  };

  /**
   * 更新指定版本的日志
   * @param {string} version - 版本号
   * @param {object} updates - 更新内容
   */
  const updateChangelog = (version, updates) => {
    const index = changelogs.value.findIndex((log) => log.version === version);
    if (index !== -1) {
      changelogs.value[index] = {
        ...changelogs.value[index],
        ...updates,
      };
      saveToLocalStorage();
    }
  };

  /**
   * 删除指定版本的日志
   * @param {string} version - 版本号
   */
  const deleteChangelog = (version) => {
    const index = changelogs.value.findIndex((log) => log.version === version);
    if (index !== -1) {
      changelogs.value.splice(index, 1);
      saveToLocalStorage();
    }
  };

  /**
   * 保存到本地存储
   */
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem("changelogs", JSON.stringify(changelogs.value));
    } catch (error) {
      console.error("保存更新日志到本地存储失败:", error);
    }
  };

  /**
   * 从本地存储加载
   */
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem("changelogs");
      if (stored) {
        changelogs.value = JSON.parse(stored);
      }
    } catch (error) {
      console.error("从本地存储加载更新日志失败:", error);
    }
  };

  /**
   * 获取版本之间的差异
   * @param {string} fromVersion - 起始版本
   * @param {string} toVersion - 结束版本
   * @returns {Array} 版本差异列表
   */
  const getVersionDiff = (fromVersion, toVersion) => {
    const fromIndex = changelogs.value.findIndex(
      (log) => log.version === fromVersion,
    );
    const toIndex = changelogs.value.findIndex(
      (log) => log.version === toVersion,
    );

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    // 返回两个版本之间的所有更新日志
    return changelogs.value.slice(
      Math.min(fromIndex, toIndex),
      Math.max(fromIndex, toIndex) + 1,
    );
  };

  /**
   * 检查是否有新版本
   * @param {string} currentVersion - 当前版本
   * @returns {boolean} 是否有新版本
   */
  const hasNewVersion = (currentVersion) => {
    if (!latestVersion.value)
      return false;
    return latestVersion.value.version !== currentVersion;
  };

  /**
   * 获取未读的更新日志
   * @returns {Array} 未读的更新日志列表
   */
  const getUnreadChangelogs = () => {
    try {
      const lastReadVersion = localStorage.getItem(
        "last_read_changelog_version",
      );
      if (!lastReadVersion)
        return changelogs.value;

      const lastReadIndex = changelogs.value.findIndex(
        (log) => log.version === lastReadVersion,
      );

      if (lastReadIndex === -1)
        return changelogs.value;

      return changelogs.value.slice(0, lastReadIndex);
    } catch (error) {
      console.error("获取未读更新日志失败:", error);
      return [];
    }
  };

  /**
   * 标记为已读
   * @param {string} version - 版本号
   */
  const markAsRead = (version) => {
    try {
      localStorage.setItem("last_read_changelog_version", version);
    } catch (error) {
      console.error("标记更新日志为已读失败:", error);
    }
  };

  // 初始化时从本地存储加载
  loadFromLocalStorage();

  return {
    // State
    changelogs,

    // Computed
    latestVersion,
    getRecentChangelogs,
    getChangelogsByType,
    statistics,

    // Actions
    addChangelog,
    updateChangelog,
    deleteChangelog,
    saveToLocalStorage,
    loadFromLocalStorage,
    getVersionDiff,
    hasNewVersion,
    getUnreadChangelogs,
    markAsRead,
  };
});
