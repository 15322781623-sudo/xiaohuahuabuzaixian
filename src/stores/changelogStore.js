import { defineStore } from "pinia";
import { computed, ref } from "vue";

/**
 * 更新日志数据存储
 * 管理系统更新日志的状态和数据
 */
export const useChangelogStore = defineStore("changelog", () => {
  // ==================== State ====================

  /**
   * 更新日志列表
   * 按照时间倒序排列
   */
  const changelogs = ref([
    {
      version: "v2.21.0",
      date: "2026-07-04",
      type: "minor",
      title: "一键答题稳定性与多账号并发优化",
      features: [
        "新增 tokenStore.refreshForBatchRoleOnly 轻量级方法，用于批量任务获取活跃度",
      ],
      improvements: [
        "优化一键答题完成判断逻辑，同时检查 answeredCount 和 maxCorrectNum，避免误判",
        "优化答题状态隔离，移除全局 studyStatus 更新，防止多账号数据混乱",
        "优化答题重试机制，答对 < 10 题时自动进入重试流程",
        "优化日志输出，显示实际答对数量，便于排查问题",
      ],
      fixes: [
        "修复多账号并发答题时进度数据互相覆盖的问题",
        "修复答题进度显示异常（如 10/10 又变回 2/10）的问题",
        "修复一键答题提前执行下一批次的 bug",
        "修复获取活跃度失败：tokenStore.refreshForBatchRoleOnly is not a function 的错误",
      ],
    },
    {
      version: "v2.20.0",
      date: "2026-07-04",
      type: "minor",
      title: "批量任务性能优化与稳定性提升",
      improvements: [
        "优化批量日常任务执行逻辑，提升稳定性",
        "优化 WebSocket 连接管理，减少断连重连次数",
        "优化任务重试机制，提高成功率",
      ],
      fixes: [
        "修复批量任务执行过程中的内存泄漏问题",
        "修复任务状态同步不及时的问题",
      ],
    },
    {
      version: "v2.19.1",
      date: "2026-07-05",
      type: "patch",
      title: "任务完成情况修复 & 爬塔重试机制优化 & UI 抖动修复",
      fixes: [
        "修复任务完成情况重复执行只显示一条记录的问题（移除去重逻辑）",
        "修复任务完成情况 Modal 打开时数据覆盖问题（合并内存和 localStorage）",
        "修复任务完成情况状态判断错误（retry 状态未计入 runningCount）",
        "修复任务完成情况 finally 块缺少保存逻辑",
        "修复领取挂机无挂机数据导致加钟失败的问题",
        "修复领取挂机重试机制将超时账号错误标记为失败的问题",
        "修复 CSS hover translateX 导致任务记录抖动的问题",
        "修复一键爬塔执行时重试机制未被识别的问题",
      ],
      improvements: [
        "挂机 API 超时时间从 5000ms 延长到 15000ms",
        "任务完成情况保存逻辑优化（去重但允许重复执行）",
        "任务记录 hover 效果优化（移除水平位移避免抖动）",
      ],
    },
    {
      version: "v2.19.0",
      date: "2026-07-05",
      type: "minor",
      title: "洗练助手 UI 优化 & BIN 账号一键添加 & 任务完成情况修复",
      features: [
        "洗练助手 UI 全面重构：武将、装备、孔位改为宝箱式一行排列布局",
        "新增孔位解锁进度显示：实时显示剩余多少次解锁下一孔",
        "连续淬炼次数支持设置为 0：作为无限制批量淬炼的快捷入口",
        "新增 BIN 账号一键添加全部功能：批量添加当前搜索过滤后的角色列表",
        "新增战力过滤逻辑：一键添加时自动过滤战力低于 1 亿的角色",
        "新增全部删除功能：待添加角色列表上方添加全部删除按钮",
        "新增定时任务勾选账号功能：支持在定时任务中选择特定账号执行",
      ],
      fixes: [
        "修复任务完成情况重复执行只显示一条记录的问题（移除去重逻辑）",
        "修复任务完成情况 Modal 打开时数据加载逻辑（合并内存和 localStorage）",
        "修复任务完成情况状态判断错误（retry 状态未计入 runningCount）",
        "修复任务完成情况 finally 块缺少保存逻辑",
        "修复领取挂机无挂机数据导致加钟失败的问题",
        "修复领取挂机重试机制将超时账号错误标记为失败的问题",
        "修复 CSS hover translateX 导致任务记录抖动的问题",
      ],
      improvements: [
        "延长挂机相关 API 超时时间到 15000ms",
        "任务完成情况数据动态加载：打开 Modal 前自动刷新最新数据",
      ],
    },
    {
      version: "v2.18.0",
      date: "2026-07-04",
      type: "minor",
      title: "APK 更新检测与定时任务重复记录修复",
      features: [
        "新增 APK 更新检测逻辑，采用提示更新模式（非强制）",
        "TokenCard 组件添加竞技场功能复用",
      ],
      fixes: [
        "修复定时任务重复记录问题，添加重复检查机制",
        "修复竞技场战斗失败根因，优化响应解析",
      ],
      improvements: [
        "更新 Worker 地址配置，指向正确的 R2 存储",
        "优化批量任务刷新函数，提升性能",
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
