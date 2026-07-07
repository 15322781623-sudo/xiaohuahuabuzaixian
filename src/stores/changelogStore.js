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
    version: "v2.23.0",
    date: "2026-07-07",
    type: "minor",
    title: "挂机任务智能判断 & 批量执行优化 & 推图重构 & 图鉴升星多选",
    features: [
      "领取挂机智能判断：领取奖励后自动获取当前挂机时长，超过8小时自动跳过加钟，不足8小时自动加钟4次",
      "一键加钟无条件执行：不再进行任何跳过判断，直接为所有账号执行加钟操作",
      "图鉴升星多选执行：支持分别选择英雄升星、鱼灵升星、皮肤升星，按需组合执行",
      "英雄图鉴升星碎片预检查：自动获取英雄碎片数量，跳过已满星（30星）或碎片不足的英雄，避免无效尝试",
      "新增队伍补齐功能按钮：支持快速补齐队伍成员，提升组队效率",
    ],
    improvements: [
      "批量任务执行模型优化：改为分批并发模式，每批 maxActive 个账号并发执行，本批全部完成后再执行下一批，日志批次边界清晰",
      "推图重构重新优化逻辑：优化推图执行流程，提升稳定性和效率",
      "重试账号跳过挂机时长检查：重试时直接执行加钟，不再重复判断挂机时长",
      "英雄图鉴升星取消第二轮重试：避免对已满星英雄的无效重试，节省执行时间",
      "日志输出大幅精简：移除冗余的 WebSocket 连接/断开日志，日志量减少约 70%",
      "领取挂机判断字段修正：领取后使用 hangUpTime（当前挂机时长）判断，而非 totalTime（累计时间，领取后可能重置）",
    ],
    fixes: [
      "修复星级显示/计算相关 BUG",
    ],
  },
  {
    version: "v2.22.0",
    date: "2026-07-06",
    type: "minor",
    title: "智能发车预设护卫成员 & 宝箱类型配置 & 卡片显隐优化",
    features: [
      "新增智能发车预设护卫成员功能：在账号任务设置中可勾选预设护卫成员，智能发车时优先按预设顺序分配护卫",
      "预设护卫次数已满时自动回退到原有按红淬排序的自动分配逻辑，确保发车不受影响",
      "新增日常任务宝箱类型控制：批量操作设置中可配置默认宝箱类型，默认使用木质宝箱",
      "全量导出/导入升级至v2.4：新增阵容助手保存数据导出导入，补全批量设置缺失字段（功能模块延迟、黑市采购、珍宝阁、批量任务超时、兑换码、换皮闯关失败次数）",
      "账号星数列表新增单独删除账号按钮，可从列表中移除不需要的账号",
    ],
    improvements: [
      "账号列表卡片组显隐控制优化：4个独立按钮合并为1个统一开关，一键隐藏/显示卡片详情区域",
      "卡片区域使用 v-if 控制 DOM 渲染，隐藏时完全移除节点，降低大量 Token 场景下的渲染压力",
      "智能发车日志优化：显示预设护卫使用情况和回退自动分配的提示信息",
      "账号星数列表过滤优化：已有其他队伍的账号不再显示在可选列表中，避免误选",
      "补齐凑星按钮文字简化，移除冗余的人数显示",
      "导出导入任务功能精简：移除批量设置数据，仅保留定时任务，设置信息统一由全量导出管理",
    ],
    fixes: [
      "修复宝箱类型配置位置不统一的问题，统一由批量操作设置中的默认宝箱类型控制",
      "修复跨设备导入时账号任务设置（含发车护卫预设）未正确恢复到对应账号的问题，导入时自动映射 token ID",
      "修复全量导出中批量设置缺失功能模块延迟、黑市采购、珍宝阁等字段的问题",
    ],
  },
  {
    version: "v2.21.0",
    date: "2026-07-04",
    type: "minor",
    title: "一键答题稳定性优化 & 多账号并发修复",
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
    title: "十殿阎罗挑战优化 & 成员出战显示 & UI 美化",
    features: [
      "十殿阎罗挑战按钮解除账号限制：未选择账号时可直接点击按钮进入，通过弹窗内队长下拉框选择",
      "新增后台战斗成员出战情况显示：实时显示每个成员的阵亡状态和已出战状态",
      "成员标签视觉优化：存活成员绿色显示，阵亡成员红色显示，已出战成员半透明 + 灰度效果",
      "后台战斗 UI 重构：主信息行和成员行分离，按钮统一靠右对齐，布局更规整",
      "关卡推进时出战记录清理：确保进入新关卡时出战记录干净，避免继承上一关数据",
    ],
    improvements: [
      "NightmareAutoBattleService 新增 getMembers() 和 getAttackRecords() 公共方法，暴露成员信息给 UI",
      "后台战斗状态同步优化：handleBattleStatusChange 时自动更新成员信息和出战记录",
      "成员标签样式优化：统一使用 small 尺寸，间距 6px，圆角 4px，已出战成员添加灰度滤镜",
      "战斗列表布局优化：采用两行布局（主信息行 + 成员行），按钮容器使用 margin-left: auto 靠右对齐",
      "日志输出优化：成员状态使用三元表达式转换为中文'是/否'",
    ],
    fixes: [
      "修复十殿阎罗挑战未选择账号时点击按钮提示'请先选择账号'的问题",
      "修复十殿阎罗挑战未选择账号时创建空任务记录导致'用时 0.0 秒，成功 0，失败 0'的问题",
      "修复关卡推进时未清理出战记录可能导致成员被误判为已出战的问题",
      "修复后台战斗列表成员显示混乱、换行不整齐的问题",
      "修复成员状态日志显示 false/true 不符合中文习惯的问题",
    ],
  },
  {
    version: "v2.19.1",
    date: "2026-07-03",
    type: "patch",
    title: "任务完成情况修复 & 爬塔重试机制优化 & UI 抖动修复",
    features: [
      "任务完成情况支持重复执行显示：移除去重逻辑，每次执行都生成独立记录",
      "任务完成情况 Modal 数据加载优化：合并内存和 localStorage 数据，确保正在执行的任务也能显示",
    ],
    improvements: [
      "任务完成情况状态判断修复：retry 状态正确计入 runningCount，避免误判为失败",
      "任务完成情况保存逻辑修复：finally 块中添加保存调用，确保定时任务记录不丢失",
      "领取挂机无挂机数据处理优化：无挂机数据时跳过并标记为成功，不再标记为失败",
      "领取挂机重试机制优化：超时错误加入重试队列，不再直接标记为失败账号",
      "挂机 API 超时时间延长：从 5000ms 增加到 15000ms，减少超时失败",
      "任务记录 CSS 抖动修复：移除 hover 时的 translateX 效果，避免鼠标移动时触发抖动",
    ],
    fixes: [
      "修复任务完成情况重复执行只显示一条记录的问题（移除 startTime+name 去重逻辑）",
      "修复任务完成情况 Modal 打开时数据覆盖问题（改为合并内存和 localStorage 数据）",
      "修复任务完成情况状态判断错误（retry 状态未计入 runningCount 导致误判为失败）",
      "修复任务完成情况 finally 块缺少 saveTaskExecutionRecordsToStorage 调用",
      "修复领取挂机无挂机数据导致加钟失败的问题（返回 true 而非 undefined）",
      "修复领取挂机重试机制将超时账号错误标记为失败的问题（超时加入重试队列）",
      "修复 CSS hover translateX(2px) 导致任务记录鼠标移动时抖动的问题",
      "修复一键爬塔执行时重试机制未被识别，直接标记为失败账号的问题",
    ],
  },
  {
    version: "v2.19.0",
    date: "2026-07-02",
    type: "minor",
    title: "洗练助手 UI 优化 & BIN 账号一键添加 & 战力过滤",
    features: [
      "洗练助手 UI 全面重构：武将、装备、孔位改为宝箱式一行排列布局，自动平分空间",
      "新增孔位解锁进度显示：实时显示剩余多少次解锁下一孔（1 孔 0 次/2 孔 10 次/3 孔 100 次/4 孔 1000 次/5 孔 10000 次）",
      "连续淬炼次数支持设置为 0：次数为 0 时使用 9999 次上限，作为无限制批量淬炼的快捷入口",
      "新增定时任务勾选账号功能：支持在定时任务中选择特定账号执行，提升任务执行灵活性",
      "新增 BIN 账号一键添加全部功能：ServerRoleList 组件右上角添加一键添加按钮，批量添加当前搜索过滤后的角色列表",
      "新增战力过滤逻辑：一键添加时自动过滤战力低于 1 亿的角色，只添加高战力角色",
      "新增全部删除功能：待添加角色列表上方添加全部删除按钮，一键清空所有待添加角色",
      "任务完成情况按钮解除限制：移除按钮禁用条件，随时可查看任务执行记录",
      "任务完成情况数据动态加载：打开 Modal 前自动从 localStorage 刷新最新数据，避免长时间未刷新导致数据丢失",
    ],
    improvements: [
      "武将列表从网格布局改为 flex 一行排列，头像、名称、等级垂直堆叠显示",
      "装备标签从网格布局改为 flex 一行排列，名称、等级垂直堆叠显示",
      "孔位锁定区域从网格布局改为 flex 一行排列，复选框、名称、属性垂直堆叠显示",
      "所有 UI 元素统一使用 flex: 1 自动平分空间，属性名称过长时自动截断显示",
      "ServerRoleList 组件新增 addAll 事件，支持批量添加角色",
      "待添加角色列表显示角色计数，方便用户了解待添加数量",
      "任务完成情况 Modal 标题动态显示记录数量",
    ],
    fixes: [
      "修复执行任务情况显示问题：定时任务执行记录中账号状态误判为失败的 bug，实际已成功执行的账号现在正确显示为成功",
      "修复定时任务执行记录只显示最近 3 条的限制，现在显示全部历史记录",
      "解除定时任务执行完成情况 Modal 的打开限制，不再要求必须先运行定时任务才能点击查看",
      "修复任务完成情况按钮长时间未刷新后无法触发的问题",
      "修复凌晨自动清空后按钮禁用导致无法查看历史记录的问题",
    ],
  },
  {
    version: "v2.18.0",
    date: "2026-07-02",
    type: "patch",
    title: "竞技场战斗结果反馈修复 & 批量任务性能优化",
    features: [
      "新增批量赛车专用刷新函数 refreshForBatchCar，仅获取车辆信息，减少 60%+无效请求",
      "新增批量俱乐部签到专用刷新函数 refreshForBatchClub，仅获取俱乐部信息",
      "新增宝库信息专用刷新函数 refreshForBatchBossTower，用于批量宝库任务",
      "新增换皮闯关专用刷新函数 refreshForBatchSkinChallenge，用于批量换皮闯关/寻宝",
      "新增桃园任务专用刷新函数 refreshForBatchPeach，用于批量领取桃园任务",
      "新增活跃度数据缓存机制（refreshForBatchActivity），30 秒有效期，避免频繁请求",
      "手动执行功能按钮添加任务完成情况记录，支持在任务完成情况 Modal 中查看手动执行的历史记录",
    ],
    improvements: [
      "批量赛车完成后使用专用刷新函数替代全量 refreshGameData，提升执行效率",
      "批量俱乐部签到前使用专用刷新函数获取俱乐部信息，减少网络请求",
      "批量爬塔使用专用刷新函数获取塔信息，优化请求流程",
      "批量宝库任务使用专用刷新函数，减少 60%+无效请求",
      "批量换皮闯关使用专用刷新函数，替代 activity_get 全量请求",
      "批量桃园任务使用专用刷新函数，优化任务领取流程",
      "挂机状态检查使用活跃度缓存（30 秒），批量领取挂机时减少重复请求",
      "连接成功后延迟 1.5 秒再加载数据，并二次校验连接状态，避免 token 过期时发送无效请求",
      "竞技场响应结构兼容 battleData.result.isWin、result.isWin、body.result.isWin 多种响应路径",
    ],
    fixes: [
      "修复一键竞技场 3 次战斗后不显示胜负和积分变化的问题，正确解析 battleData.result.isWin、selfScore、oppoScore 字段",
      "新增 fallback 逻辑，当 isWin 字段缺失时通过 sponsor/accept 队伍血量判定胜负（全队 curHP=0 为战败）",
      "修复对手积分始终显示为正的问题，胜利时对手扣分、战败时对手加分",
      "修复 loadArenaRank() 在失败或未找到排名时将数据清零的问题，改为保留已有数据",
      "修复账号卡片领取挂机时'开始领取挂机'日志重复显示两次的问题",
      "修复单 token 模式调用 createTasksHangUp 时缺少 runStreaming 依赖导致的 TypeError",
      "修复 taskPromises 未 await 导致'批量竞技场战斗完成'在战斗结束前就打印的问题",
      "修复 WebSocket 连接成功后立即加载数据，因服务端验证 token expired 导致 StarChallenge/MeritBook/ArenaRank 三个请求各超时 5 秒的问题",
    ],
  },
  {
    version: "v2.17.0",
    date: "2026-06-30",
    type: "patch",
    title: "火把加速验证优化 & 批量推图定时停止连接释放",
    features: [
      "任务执行情况统计：新增定时任务执行记录 Modal，支持成功/失败/部分完成状态统计和查看",
      "批量推图火把使用验证：item_consume 调用后检查响应，错误时停止尝试并记录错误码",
      "fight_calcleveltime 接口增加 levelId 参数，确保服务器正确计算战斗时间",
      "火把续用逻辑增强：过期前自动检测并提前续用，避免战斗中火把失效",
      "批量推图定时停止功能优化：stopAll=true 时主动断开所有账号的 WebSocket 连接，释放资源",
      "定时任务活动检测优化：换皮闯关使用 activity_get 命令动态检测 actId，不再依赖周类型判断",
    ],
    improvements: [
      "俱乐部 BOSS 次数默认值从 1 次调整为 3 次，名称统一为'俱乐部 BOSS 次数'",
      "每日 BOSS 次数与俱乐部 BOSS 次数显示名称修正，避免模板配置混淆",
    ],
    fixes: [
      "修复火把激活次数统计修正：只有成功的 item_consume 才会计入总时长",
      "修复批量推图火把验证问题：战斗剩余时间不受火把影响，需进一步排查服务器响应逻辑",
    ],
  },
  {
    version: "v2.16.0",
    date: "2026-06-30",
    type: "minor",
    title: "批量任务重试并发化 & 功能卡片交互升级",
    features: [
      "武将升级重构：支持自定义目标等级（1-6000），自动升级加进阶",
      "战斗助手增强：战斗次数自定义输入、快捷按钮、执行延迟配置、操作日志实时显示",
      "换皮闯关增加操作日志区域，修复活动状态判断（actId 为空时不显示遮罩）",
      "十殿挑战组合布局：星级挑战与阎罗挑战上下排列，视觉更紧凑",
      "阵容助手新增无损换将功能，阵容应用增加实时日志显示",
      "定时任务导入时自动过滤无效账号，只保留本地存在的 token 并提示过滤数量",
      "定时任务执行时自动清理已删除账号，防止无效账号参与执行",
      "BIN 数据新增 localStorage 备份，导出按钮优先从备份恢复，防止 IndexedDB 被清理后数据丢失",
      "批量任务完成后显示总执行用时（分 + 秒）",
      "更新 APK/EXE 应用图标，新增图标生成脚本",
    ],
    improvements: [
      "批量任务所有模块重试逻辑统一改为 safeDelay + runStreaming 并发控制，大幅提升重试效率",
      "俱乐部 BOSS 次数默认值从 1 次调整为 3 次，名称统一为'俱乐部 BOSS 次数'",
      "梦境战斗增加防华佗/董卓回血死循环机制，连续失败 5 次自动停止",
      "消耗活动卡片增加移动端响应式布局，适配 768px 以下屏幕",
      "无限阵容武将卡片展示优化，布局更紧凑美观",
      "BIN Token 刷新使用串行队列（间隔 2 秒），防止并发请求触发服务器限流",
      "Token 删除时同步清理 localStorage 备份数据",
    ],
  },
  {
    version: "v2.15.0",
    date: "2026-06-29",
    type: "patch",
    title: "功法残卷充值特权赛季计算修复",
    fixes: [
      "修复功法残卷充值特权判断逻辑，改为通过 28 天赛季周期动态计算当前赛季开始时间",
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
