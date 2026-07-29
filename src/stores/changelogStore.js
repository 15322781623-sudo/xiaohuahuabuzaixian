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
      version: "v2.45.3",
      date: "2026-07-31",
      type: "patch",
      title: "定时任务调度系统六项关键修复",
      fixes: [
        "修复 Bug #1: 队列消费死锁 - 在 executeScheduledTask 的 finally 块中消费 pendingTaskQueue 后写入 localStorage，防止浏览器崩溃时防重标记丢失导致队列永远无法消费",
        "修复 Bug #2: Health Check 优化 - 所有强制重置分支统一调用 updateLastTaskExecution() 函数，确保状态持久化，避免浏览器崩溃后定时任务被阻塞",
        "修复 Bug #3: 孤儿记录竞态 - 检测到孤儿 running 记录后立即 return，改为\"等待健康检查清理后再试\",避免同一任务并发执行两次",
        "修复 Bug #5: lastTaskExecution 写入不一致 - 新增统一的 updateLastTaskExecution() 函数，确保所有路径都写入 localStorage，提供跨会话状态恢复能力",
        "增强日志输出：孤儿记录检测时显示更明确的状态信息",
      ],
    },
    {
      version: "v2.45.2",
      date: "2026-07-31",
      type: "patch",
      title: "定时任务逻辑全面修复 (Bug #1-#4)",
      fixes: [
        "修复 Bug #1: 手动任务结束未触发定时任务队列消费 - 在 finally 块中添加 setTimeout(processPendingQueue) 调用，防止定时任务被'静默丢失'",
        "修复 Bug #2: 统一防重标记写入时机 - 移除依赖验证失败提前返回的 localStorage 写入，改为在所有路径启动前统一写入，避免浏览器崩溃时防重标记丢失导致重复执行",
        "修复 Bug #3: 队列消费与防重标记写入死锁 - executeScheduledTask 的 finally 块直接消费 pendingTaskQueue，跳过 lastTaskExecution_ 防重检查，解决'队列永远无法消费'的死锁问题",
        "优化 Bug #4: 明确定时任务与手动任务的互斥规则 - 定时任务绝对优先（不参与日常任务互斥排队），日常任务执行中定时任务可强制插入",
        "增强日志输出：队列任务执行时显示详细日志（当前任务名称、队列任务名称）",
      ],
    },
    {
      version: "v2.45.1",
      date: "2026-07-31",
      type: "patch",
      title: "爬怪异塔定时任务执行中断修复 & 月度任务普通钓鱼数量限制",
      fixes: [
        "修复定时任务爬怪异塔执行中断问题：采用 tokenListSnapshot 固定账号列表快照，防止定时任务执行过程中 selectedTokens.value 被外部修改导致后续批次为 0 个账号；所有分批并发逻辑和批量重试均基于快照而非动态响应式数据，确保整个批处理过程账号列表稳定一致",
        "修复月度任务普通钓鱼数量超过 320 次的问题：批量钓鱼执行前新增月度任务进度检查（myMonthInfo[\"2\"]?.num），当进度已达上限时直接跳过该账号；实际执行次数取鱼竿库存与剩余任务进度的较小值，避免超额执行",
        "增强批量钓鱼日志输出：显示月度进度、目标和剩余可执行次数，便于用户监控执行情况",
      ],
    },
  ]);

  // ==================== Computed ====================

  /**
   * 最新版本号
   */
  const latestVersion = computed(() => {
    return changelogs.value[0]?.version || "v1.0.0";
  });

  /**
   * 最新版本日期
   */
  const latestDate = computed(() => {
    return changelogs.value[0]?.date || "";
  });

  /**
   * 获取指定版本号的更新日志
   */
  const getVersionLog = (version) => {
    return changelogs.value.find((log) => log.version === version);
  };

  /**
   * 判断是否为最新版本
   */
  const isLatestVersion = (version) => {
    return version === latestVersion.value;
  };

  // ==================== Actions ====================

  /**
   * 添加新的更新日志
   */
  const addChangelog = (changelog) => {
    changelogs.value.unshift(changelog);
  };

  /**
   * 删除指定的更新日志
   */
  const removeChangelog = (version) => {
    changelogs.value = changelogs.value.filter(
      (log) => log.version !== version
    );
  };

  return {
    changelogs,
    latestVersion,
    latestDate,
    getVersionLog,
    isLatestVersion,
    addChangelog,
    removeChangelog,
  };
});
