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
    version: "v2.36.0",
    date: "2026-07-14",
    type: "minor",
    title: "断线重连保活机制 & 游戏引擎崩溃修复 & 十殿加速UI优化",
    features: [
      "新增断线重连+保活机制：WebSocket断线自动检测，8秒后通过刷新游戏窗口重连（最多3次），空闲120秒自动发送心跳保活，连接状态实时指示器显示",
      "新增周期性健康检查：父窗口每30秒向所有游戏iframe发送WS_HEALTH_PING，检测连接存活状态，异常时自动触发恢复",
      "新增game.html增强代码自注入机制：独立窗口打开时自动从localStorage(__game_enhance_codes__)读取增强代码并执行，批量日常任务通过独立窗口登录的账号也能注入游戏增强脚本",
    ],
    improvements: [
      "游戏窗口网格自适应宽高：基于容器尺寸+游戏9:16比例自动计算最优列数和单元格尺寸，ResizeObserver实时监听容器变化，滚动条预留20px，最小单元格180px",
      "十殿加速UI全面优化：面板宽度从220px缩减至160px，字体/滑块/间距全面缩小约40%，收起时仅显示标题标签不占用屏幕空间",
      "十殿加速默认收起状态：初始加载时面板折叠，点击▼按钮展开配置滑块，减少对游戏画面的遮挡",
      "移除挤号断线(kickSession)功能：功能已从增强列表中删除，由断线重连机制替代",
      "增强脚本更新：更新15个增强脚本，新增3个脚本，移除重复功能项(uiSpeed→nightmareAccel, nightmareGacha→nightmareEnhance)",
      "新增4个增强脚本：自动蟠桃园、升星助手(武将升星+图鉴升级+鱼灵升星)、道具使用、对手洗练(自动查询+历史记录)，跳过升星.js和自动星级.js（与升星助手功能重复）",
      "游戏窗口新增刷新按钮(↻)：支持单独刷新指定游戏窗口，无需重新登录",
      "刷新重登重新解码登录数据：refreshSingle重新获取decodeBinForToken并写入localStorage，解决game.html首次加载removeItem后二次刷新token丢失问题",
      "notifyIframesResize增加readyState防护：列数/窗口尺寸变化时跳过未加载完成的iframe，避免contentDocument为null导致报错",
      "列数切换时强制iframe重绘：通过visibility切换+resize事件通知游戏引擎重算画布尺寸，避免布局异常",
    ],
    fixes: [
      "修复cocos2d引擎_initRenderer崩溃：document.querySelector返回null导致'reading tagName of null'错误，采用三层防护（patch.js cc.game.prepare预检hook创建canvas + cocos引擎内联兜底自动创建canvas + null-safe条件分支）",
      "修复patch.js _initFrameSize/_resizeEvent DOM null错误：添加DOM就绪检查，iframe内容为空时跳过操作",
      "修复refreshSingle刷新后登录数据丢失问题：game.html首次加载后removeItem导致二次刷新无法获取token，改为保留数据由父窗口统一管理",
      "修复arenaReport增强脚本语法错误：移除多余的闭合花括号",
    ],
  },
  {
    version: "v2.35.0",
    date: "2026-07-14",
    type: "minor",
    title: "游戏登录多窗口 & 内置增强脚本 & 分组勾选 & 增强模块修复",
    features: [
      "游戏登录多窗口同时显示：右侧面板以 CSS Grid 网格布局同时显示所有已登录游戏窗口，不再通过标签页切换",
      "自适应列数模式：默认「自动」模式根据网格容器宽度计算最优列数（每列最小 250px），也支持手动选择 1-8 列",
      "操作同步功能：开启后一个游戏窗口的点击/触摸操作自动镜像到其他所有窗口，通过 Canvas UI 事件转发实现跨账号操作同步",
      "拖拽登录：从左侧账号列表拖拽账号到右侧游戏区域即可触发登录，带有视觉反馈效果",
      "左侧面板宽度可拖拽调节：拖动中间分隔条可自由调整左侧面板宽度（240-700px），双击恢复默认 360px",
      "日志区折叠/展开：点击日志标题栏可切换日志列表显示/隐藏，减少界面占用",
      "分组快捷勾选：游戏登录和批量推图弹窗均支持按分组一键勾选/取消账号，分组标签颜色跟随分组配色，支持折叠/展开",
      "16 个内置游戏增强脚本：战斗飘字、十殿抽奖/加速/增强、怪异塔合成、模拟对战、无限阵容、更换头像、皮肤切换、四圣升级、武将升级、洗炼加速/面板、咸鱼分析、盐场视距、增强面板，按需从静态文件加载不增加打包体积",
      "增强功能分组显示：31 项增强按 6 个分组（基础/战斗/十殿/洗炼/升级/辅助）展示，每组显示已启用数量",
    ],
    improvements: [
      "增强脚本 waitForModule 重试机制：所有 __require 模块级增强改用与 123 项目一致的 _wfm 轮询模式，每 500ms 单独重试目标模块直到加载完成（60 秒超时），修复批量登录时模块未加载导致 hook 静默失败的问题",
      "跳过弹窗简化为 FirstFaceToPlayerManager 单一 hook：与 123 项目对齐，仅 hook instance.setActive 屏蔽首页活动弹窗，移除无效的 SHOW_SIMPLE_DIALOG/SHOW_MODULE 拦截",
      "列数切换时强制 iframe 重绘：通过 visibility 切换 + resize 事件通知游戏引擎重算画布尺寸，避免布局异常",
      "拖拽分隔条防抖优化：使用 requestAnimationFrame 节流（每帧最多更新一次）+ 遮罩层防止 iframe 捕获鼠标事件，解决拖拽抖动问题",
      "APK 兼容性修复：禁用 CapacitorHttp 原生拦截避免干扰 iframe 内游戏 XHR/fetch，显式锁定 server hostname，添加 usesCleartextTraffic 允许明文流量",
      "APK 多窗口保护：检测 Capacitor 原生环境，超过 3 个游戏窗口时显示内存不足警告",
    ],
    fixes: [],
  },
  {
    version: "v2.34.0",
    date: "2026-07-14",
    type: "minor",
    title: "四层延迟架构 & 单账号智能加速 & 定时任务BUG修复",
    features: [
      "单账号智能加速全链路覆盖：新增 _accelerateDelay() 统一方法，命令延迟/子任务延迟/奖励领取延迟/竞技场/扫荡/阵容切换等全部接入加速倍率，单账号执行速度提升 5 倍",
      "奖励领取延迟独立控制：新增 rewardClaimDelay 配置项（默认3000ms），专门控制任务奖励/日常奖励/周常奖励/通行证领取间的等待时间，单账号模式自动乘以加速倍率",
      "日常子任务延迟独立控制：新增 dailySubtaskDelay 配置项（默认300ms），专门控制同模块内子任务间的等待时间，与命令延迟、模块切换延迟分层独立",
      "四层延迟架构：命令级(commandDelay) → 子任务级(dailySubtaskDelay) → 模块级(delayGroups) → 单账号加速倍率(singleAccountMultiplier)，层次分明各司其职",
    ],
    improvements: [
      "moduleDelay 重叠修复：模块级延迟从「每个子任务后都加」改为「仅在模块切换时加一次」，9个领取任务的纯延迟从 31.5秒 降至 7.5秒，提速4.2倍",
      "API调用优化：移除 ensureConnection 后的冗余 role_getroleinfo 验证调用，英雄升星和鱼灵升星减少约60行重复代码，每账号节省3-4次API调用",
      "卡片日常补齐接入单账号加速：TokenCard 的一键补齐按钮始终为单账号操作，自动启用加速模式",
      "手动执行日常任务创建完成记录：「开始执行」按钮现在也会创建任务完成情况记录，与定时任务和手动按钮功能保持一致",
      "延迟配置 UI 优化：子任务延迟/奖励领取延迟/单账号加速三项合并为一行显示，减少纵向空间占用",
      "400340 重试改为连接池滚动并发：外层重试队列从逐个串行执行改为与第一批相同的连接池滚动模式，支持 maxActive 并发和单账号超时保护",
    ],
    fixes: [
      "不上线时段修复：恢复调度器层最早拦截检查，避免 dependency 验证/token 清理等副作用先于时段检查执行；push_map 任务也支持 offlineTimeEnabled",
      "定时任务重复记录修复：定时任务调用 startBatch 时检测 isScheduledTaskRunning 跳过内部记录创建，避免日常任务出现 2 条重复记录",
      "400340 内部重试移除：sendCommand 不再对限流错误进行 30秒×3 内部重试，立即向上抛出交由外层重试机制处理，避免无效等待",
      "换皮闯关定时检测修复：预检查增加 actId 时间范围校验（YYMMDD+7天），不再仅凭 actEGameInfo 非空就判断活动开启；缓存回退也校验时间范围；请求失败且无缓存时取消执行",
      "怪异塔活动窗口修复：isWeirdTowerActivityOpen 改为独立周期计算，不再依赖 getCurrentActivityWeek，正确处理周五 00:00-11:59 间歇期（黑市周从周五 12:00 开始）",
    ],
  },
  {
    version: "v2.33.0",
    date: "2026-07-14",
    type: "minor",
    title: "定时任务执行逻辑优化 & 防卡死增强",
    features: [
      "runStreaming 单账号超时保护：每个账号执行超过 25 分钟自动强制超时，关闭 WebSocket 连接并释放槽位，防止单账号卡死拖慢整个任务",
    ],
    improvements: [
      "定时任务超时统计修复：子任务超时后，仍在 running/waiting 状态的账号现在正确计入失败数和失败详情列表，不再被统计重算覆盖丢失",
      "定时器清理统一移至 finally 块：scheduledProgressTimer 和 _raceTimeoutId 的清理逻辑统一在 finally 中执行，确保无论成功/失败/异常都能释放，防止内存泄漏",
      "移除不上线时段重复检查：删除已在上游 return 后永远无法执行的死代码（原 27 行），简化执行流程",
    ],
    fixes: [
      "修复超时失败账号记录逻辑反转：原条件会误将已成功/已失败的账号重复记录为失败，现改为通过 tokenStatus 精确判断只记录仍在 running/waiting 的账号",
      "修复不上线时段 UI 文案错误：显示文本从「周三05:00-07:00」修正为「周五05:00-07:00」，与实际代码逻辑（dayOfWeek===5）一致",
      "修复子任务超时后进度回退：post-finally 统计重算现在将 running/waiting 状态的账号视为失败，不再导致 failCount 被覆盖为更小值、进度百分比回退",
    ],
  },
  {
    version: "v2.32.0",
    date: "2026-07-14",
    type: "minor",
    title: "比赛竞猜 & 智能发车优化 & 十殿抽奖优化 & 卡密管理增强",
    features: [
      "新增比赛竞猜功能：资源模块新增比赛竞猜按钮，支持查看所有比赛并选择主胜/平局/客胜下注，多账号并发执行，已下注账号自动跳过，支持定时任务自动对所有未下注比赛下注",
      "新增延迟分组系统：将分散的模块延迟统一为 4 个分组（快速/标准/战斗/重度），默认值 2000/3000/3000/5000ms，可在设置面板调整",
      "十殿抽奖新增独立延迟控制：新增 nightmare 模块延迟（默认 3 秒），可在设置面板「功能模块延迟」区域调整，解决“操作过快”报错",
      "卡密列表排序功能：状态列和创建时间列支持点击排序，点击切换升序/降序，表头显示排序方向指示器",
    ],
    improvements: [
      "比赛竞猜并发执行：多账号通过 runStreaming 并发下注，按 maxActive 控制并发数，账号间无需等待",
      "智能发车 API 调用优化：刷新券仅在发车前获取一次，后续刷新通过本地递减计算，不再每次刷新后查询服务器；护卫使用情况也改为本地跟踪，减少大量冗余 API 调用",
      "智能发车并发控制：主流程和重试逻辑均改为严格分批执行（每批 maxActive 个账号），一批完成后再执行下一批，与十殿抽奖保持一致",
      "智能发车护卫获取容错：legion_getinfo 请求失败时自动重试（最多 2 次），提高护卫分配成功率",
      "十殿抽奖 API 调用优化：移除循环内重复 nightmare_claimturnrewardtimes 调用，改为进入循环前一次性领取，API 调用量减少约 45%，降低触发 400340 限流风险",
      "十殿抽奖分批并发控制：主流程和重试逻辑均改为严格分批执行（每批 maxActive 个账号），一批完成后再执行下一批，批次间自动等待",
      "卡密管理后台登录优化：新增轻量级 /api/card/admin-check 接口，登录验证不再加载完整卡密列表，响应更快",
      "卡密列表接口优化：/api/card/list 改用 Promise.all() 并行读取 KV，提升大批量卡密加载速度",
      "抽奖成功日志改为绿色显示：单次抽奖成功日志类型从 info 改为 success",
    ],
    fixes: [
      "修复智能发车刷新券突降为0：role_getroleinfo 响应异常时不再误判刷新券不足，改为本地计算避免服务端响应缺失导致的误判",
      "修复卡密管理页面无法鼠标滚动：body 样式从 height:100% 改为 min-height:100%，允许页面内容超出视口时正常滚动",
    ],
  },
  {
    version: "v2.31.0",
    date: "2026-07-11",
    type: "minor",
    title: "十殿阎罗后台战斗 UI 优化 & 蟠桃报名 & 多项修复",
    features: [
      "新增蟠桃报名功能：日常模块新增蟠桃报名按钮，先提交铃铛（legion_buypayloaditem num:60）再报名（legion_payloadsignup），提交铃铛失败也继续执行报名，支持定时任务",
      "新增 Dashboard 首页自动跳转：进入控制台 2 分钟后自动跳转到批量日常页面，显示倒计时提示，支持取消跳转",
      "新增十殿后台战斗成员武将恢复状态显示：每个成员下方显示武将列表，存活武将绿色、阵亡武将红色+骷髅图标，鼠标悬停显示详细信息",
    ],
    improvements: [
      "十殿后台战斗 UI 重构：信息行（预设名+关卡+Boss血量）与控制行（时间+状态+操作按钮）分离，成员区域改为 grid 布局自适应排列，手机端 2 列固定布局",
      "一键换皮闯关移除阵容切换逻辑：不再获取/切换/恢复阵容，直接执行挑战流程，减少 API 调用",
      "十殿预设新建表单清空：新建预设时不再保留上次的队长、队员、阵容槽位等数据，从头开始配置",
      "一键换皮闯关活动状态缓存推演：activity_get 失败或返回空时使用 localStorage 缓存（24小时有效期）推演活动是否开启，减少误判",
      "十殿后台战斗 UI 状态恢复增强：添加 _skipCaptainWatch 标志防止程序化状态变更触发 watch 清空队伍信息，!roomId 异常路径也完整恢复 UI 状态",
      "WebSocket 命令注册：新增 legion_buypayloaditem（蟠桃提交铃铛）、legion_payloadsignup（蟠桃报名）及对应响应映射",
      "爬怪异塔能量刷新策略调整：从每 8 次改为每 10 次刷新真实能量，匹配每 10 次胜利后关卡重置体力恢复的节奏，避免第 10 次胜利后因估算能量为 0 而误停",
      "领取挂机 API 顺序调整：先调用 system_claimhangupreward 领取挂机收益，再调用 system_mysharecallback 分享回调，与实际抓包流程一致",
    ],
    fixes: [
      "修复十殿阎罗后台战斗成员恢复状态不显示：_parseRoomInfo 中 _onStatusChange 调用移至成员解析之后，确保 UI 获取到最新的武将存活/阵亡数据",
      "取消黑市采购清单获取失败时清空旧数据：BatchDailyTasks.vue 和 DailyTaskStatus.vue 移除响应为空或获取失败时清空 purchaseList/purchaseDiscounts 的逻辑，保留本地已有数据",
      "修复日常任务黑市采购会重复设置采购清单：移除日常任务中的 store_setpurchase 调用，采购清单设置由独立模块控制，日常任务只负责执行采购",
      "修复十殿阎罗后台战斗失败预设重新执行时出现 2 个相同队伍：在 push 新战斗条目前先移除同一预设的旧条目（failed/completed 等状态）",
      "修复十殿阎罗新建预设时保留之前队伍信息：编辑器容器添加 :key 强制重新渲染，确保 n-select 等组件内部状态完全重置",
      "修复十殿阎罗后台战斗预设队伍成员恢复状态缺失：getMembers() 新增返回 heroes 数组，UI 显示每个武将的存活/阵亡状态",
      "修复任务完成情况误判失败账号：单账号执行超时时不再误判已完成的任务；runStreaming 异常时正确设置 tokenStatus；防御性检查覆盖 running/waiting 状态；任务完成或异常时统一处理未完成账号",
    ],
  },
  {
    version: "v2.30.0",
    date: "2026-07-11",
    type: "minor",
    title: "盐场报名 & 换皮闯关重试修复 & 延迟统一",
    features: [
      "新增盐场报名功能：日常模块新增盐场报名按钮，支持批量报名和定时任务，已报名账号自动识别无需重复报名（错误码 2300280 幂等处理）",
    ],
    improvements: [
      "盐场蟠桃阵容按钮迁移至日常模块：与盐场报名放在一起，功能分组更合理",
      "换皮闯关延迟统一接入模块配置：4处硬编码延迟（1500ms/1000ms/2000ms）全部替换为 _getModuleDelay('tower')，由爬塔/怪塔延迟设置统一控制",
      "新增错误码映射：400340（服务器内部错误）、2300280（已报名无法重复报名）",
    ],
    fixes: [
      "修复换皮闯关重试机制未生效：skinChallenge 缺少外层批量重试循环，400340/200750/11800010 服务器错误现在会立即中断当前账号并加入重试队列，等待 retryDelay 后按批次重新执行",
    ],
  },
  {
    version: "v2.29.0",
    date: "2026-07-10",
    type: "minor",
    title: "批量日常爬怪异塔性能优化与并发控制",
    features: [
      "批量日常爬怪异塔分批并发控制：实现分批并发执行模式，每批 maxActive 个账号全部完成后才执行下一批，日志显示批次进度（📦 批次 N/M 开始执行 X 个账号），重试也采用相同的分批模式",
    ],
    improvements: [
      "爬怪异塔能量刷新策略优化：从每次刷新改为每 8 次刷新一次，减少 87.5% API 调用，智能估算机制，非刷新周期自动扣除 1 点能量，每日宝箱检查和领取仍正常工作",
      "分批并发执行模式统一：爬怪异塔与咸将塔采用相同的分批并发模式，日志格式和重试机制保持一致",
    ],
    fixes: [
      "修复爬怪异塔变量未定义错误：修改能量刷新策略后出现的 `newInfo is not defined` 错误，将每日任务检查逻辑移入 if 块内",
    ],
  },
  {
    version: "v2.28.0",
    date: "2026-07-10",
    type: "minor",
    title: "挂机功能重试恢复 & 爬怪异塔全局限流处理 & 换皮闯关活动判断修复",
    features: [
      "一键爬怪异塔增加全局限流 (400340) 处理：遇到全局限流时暂停执行并记录，支持断点续爬",
      "挂机任务重试逻辑应用到爬怪异塔：第一次执行正常判断，后续重试直接执行不跳过",
      "爬怪异塔批量重试增强：等待第一批完成后统一重试所有失败账号，显示详细的重试进度信息",
      "换皮闯关活动判断优化：不再严格判断 actId === 2606262，只要获取到 actEGameInfo 就认为活动存在",
    ],
    improvements: [
      "爬怪异塔错误日志优化：将'服务器错误 (xxx)，停止爬塔，等待批量重试'改为'🚫 遇到全局限流 (xxx)，暂停爬怪异塔'",
      "重试恢复日志格式优化：与挂机功能保持一致，显示待恢复账号列表、冷却结束、恢复爬塔等信息",
      "定时任务换皮闯关检测优化：兼容手动执行一键换皮闯关时的判断逻辑，不再因活动 ID 不匹配而跳过",
      "批量重试机制增强：多轮重试（默认 2 轮）、账号间延迟配置、持续跟踪仍失败的账号",
    ],
    fixes: [
      "修复定时任务中一键换皮闯关判断为活动未开启而跳过执行的问题",
      "修复爬怪异塔遇到 400340 后无法自动恢复的问题，现在支持断点续爬",
      "修复游戏功能页面一键爬怪异塔只执行一次的问题：改为直接从接口返回获取体力值，避免依赖 computed 属性异步更新导致循环提前退出",
    ],
  },
  {
    version: "v2.27.0",
    date: "2026-07-10",
    type: "minor",
    title: "推图页面 UI 重构 & 挂机升级 & APK 更新优化",
    features: [
      "推图页面 UI 重构：账号选择与推图列表完全解耦，选择账号后点击「添加到推图列表」才加入执行队列",
      "推图卡片列表持久化：数据自动保存到 localStorage，页面切换、重开后自动恢复，无需重新选择账号",
      "推图列表管理增强：每个卡片支持单独删除（停止并移除），新增「清空全部」一键停止并移除所有账号",
      "新增咸鱼神杯使用卡包功能：福利模块新增按钮，循环使用卡包直到报错自动停止，支持批量执行和定时任务",
      "新增挂机升级功能：日常模块新增按钮，循环发送挂机升级命令直到报错自动停止，支持批量执行和定时任务",
      "竞技大厅道具领取新增 confId 7（本周助威 1 次助威奖励）",
    ],
    improvements: [
      "一键收车时间限制取消：移除原有的周一到周三限制，任何时间都可以点击收车按钮",
      "挂机任务错误处理增强：2000150 错误加入批量重试机制，与 400340 等错误一样支持等待后重试",
      "WebSocket 命令注册：新增 saltcup26_openstarpack、system_hangupupgrade 命令",
      "APK 更新提示优化：跳过版本改为仅本次会话生效，每次打开 APP 都会检查更新；新增「不再提示此版本」勾选框，勾选后才永久跳过",
      "R2 APK 文件名统一为中文命名（肝王之王_xxx.apk），Worker 读取文件名同步修改",
    ],
    fixes: [
      "修复推图页面关闭重开后需要重新选择账号的问题，现在卡片列表会自动恢复",
      "修复一键收车按钮在周四及以后显示为灰色无法点击的问题",
    ],
  },
  {
    version: "v2.26.0",
    date: "2026-07-09",
    type: "minor",
    title: "盐场蟠桃阵容批量切换 & 循环依赖修复 & 执行时长统计",
    features: [
      "新增盐场蟠桃阵容批量切换功能，支持多账号自动连接、获取当前阵容、切换到目标阵容 (1-6) 预设配置",
      "阵容切换智能判断：检测是否需要切换，无需切换则直接跳过；切换失败带 3 次重试",
      "旧设置兼容：未配置过盐场蟠桃阵容的账号默认使用阵容 1，并在首次操作时自动保存",
      "阵容槽未解锁提示：检测到 200020 错误时直接标记失败并提示'当前账号未解锁对应阵容槽',不重复重试",
    ],
    improvements: [
      "盐场蟠桃并发执行优化：改回 runStreaming 流式执行模式，按 maxActive 并发处理多个账号，不再逐个串行等待",
      "循环依赖修复：role.ts、study.ts、tower.ts 改为动态导入 useTokenStore，打破 index.ts ↔ role/study/tower ↔ tokenStore 的循环依赖链",
      "功能模块延迟统一：所有延迟均采用 batchSettings.moduleDelays.default 优先级的设置值，避免硬编码固定延迟",
      "任务完成统计增强：集成 executeManualTaskWithRecord，实时进度跟踪 + 执行时长记录 + 成功/失败计数显示",
      "日志输出精简：移除冗余的连接/断开日志，仅保留关键步骤提示信息",
    ],
    fixes: [
      "修复盐场蟠桃阵容切换后缺少完成状态和耗时记录的问题，通过 executeManualTaskWithRecord 统一管理任务记录",
      "修复十殿阎罗挑战战斗时间过长问题，优化挑战流程加快战斗节奏",
      "分组管理新增搜索账号功能，支持多账号组合搜索和全选搜索功能",
    ],
  },
  {
    version: "v2.25.0",
    date: "2026-07-09",
    type: "minor",
    title: "批量推图优化 & 消耗活动模块 & UI 交互优化",
    features: [
      "新增消耗活动模块：将消耗活动、领取消耗活动道具、挥鼓助威消耗、使用消耗活动道具、消耗活动兑换购买统一归入独立标签页",
    ],
    improvements: [
      "批量推图战斗结果解析简化：采用顶层字段直接判定胜负，逻辑更清晰",
      "批量推图 200020 服务器错误优化：重试次数 3 次提升至 5 次，等待时间从 3 秒延长至 8 秒，给服务器更多结算时间",
      "展开/收起按钮合并为单按钮切换：闯关、爬塔、Boss 塔、进化塔模块的展开收起统一为一个按钮，与隐藏卡片交互一致",
      "按钮 UI 优化：切换按钮采用 quaternary 类型，视觉更简洁",
    ],
    fixes: [
      "修复日常任务延迟未使用设置面板模块延迟配置的问题，DailyTaskRunner 现在正确接收 batchSettings 参数",
      "修复批量推图获取战斗结果时 200020 服务器错误导致频繁失败的问题",
    ],
    removals: [
      "删除废弃商店购买函数：batchBuyGoods 及 store_buy_bronze/platinum/gold_rod/jade 四个封装函数",
      "删除购买顶级鱼竿包和购买特级灵贝包功能及相关逻辑代码",
    ],
  },
  {
    version: "v2.24.0",
    date: "2026-07-07",
    type: "minor",
    title: "新增竞技大厅助威功能",
    features: [
      "竞技大厅助威：支持获取可助威俱乐部列表，选择队伍进行助威",
      "场次选择：支持第 1 场到第 7 场的场次切换",
      "分组选择：支持第 1 组到第 32 组的分组切换，切换时自动刷新俱乐部列表",
      "全部赠送模式：赠送数量设为 0 时自动获取每个账号的助威币数量进行全部赠送",
      "自定义赠送：输入具体数值时按该数量进行赠送",
      "助威币查询：通过 apex_getroleinfo 获取当前助威币（棒）数量",
    ],
    improvements: [
      "连接逻辑优化：串行执行避免锁冲突，支持连接中状态等待",
      "错误提示优化：物品数量不足提示改为棒槌道具数量不足",
    ],
  },
  {
    version: "v2.23.0",
    date: "2026-07-07",
    type: "minor",
    title: "挂机任务智能判断 & 批量执行优化 & 推图重构 & 图鉴升星多选",
    features: [
      "领取挂机智能判断：领取奖励后自动获取当前挂机时长，超过 8 小时自动跳过加钟，不足 8 小时自动加钟 4 次",
      "一键加钟无条件执行：不再进行任何跳过判断，直接为所有账号执行加钟",
      "图鉴升星多选执行：支持分别选择英雄升星、鱼灵升星、皮肤升星，按需组合执行",
      "英雄图鉴升星碎片预检查：自动获取英雄碎片数量，跳过已满星（30 星）或碎片不足的英雄，避免无效尝试",
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
      "全量导出/导入升级至 v2.4：新增阵容助手保存数据导出导入，补全批量设置缺失字段（功能模块延迟、黑市采购、珍宝阁、批量任务超时、兑换码、换皮闯关失败次数）",
      "账号星数列表新增单独删除账号按钮，可从列表中移除不需要的账号",
    ],
    improvements: [
      "账号列表卡片组显隐控制优化：4 个独立按钮合并为 1 个统一开关，一键隐藏/显示卡片详情区域",
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
        "优化批量日常页面响应式布局，断点从 480px 调整为 600px",
        "优化珍宝阁商店购买命令超时时间为 10 秒",
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
        "优化金砖模式刷新次数，从 13 次提升到 20 次",
        "优化卡密验证逻辑，支持永久有效卡密",
      ],
      fixes: [
        "修复 EXE 激活弹窗不显示的问题",
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
        "修复日常任务活跃度 100 时跳过 BOSS 任务导致漏号的问题",
        "修复卡密验证服务端返回 400 时反复弹窗要求重新激活的问题",
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
        "新增战绩数据导出功能，支持 Excel 格式",
        "新增月度任务进度跟踪功能",
      ],
      improvements: [
        "优化俱乐部信息数据聚合逻辑，兼容多版本服务端",
        "优化响应式布局以适配新的界面结构",
        "改进 Token 持久化存储，使用 IndexedDB 替代 localStorage",
        "优化游戏状态页面的数据加载性能",
      ],
      fixes: [
        "修复俱乐部战绩数据加载失败的问题",
        "修复身份牌在某些情况下显示异常的 bug",
        "修复月度任务进度计算错误的问题",
      ],
    },
    {
      version: "v1.2.1",
      date: "2025-01-08",
      type: "patch",
      title: "WebSocket 连接优化",
      improvements: [
        "改进 WebSocket 重连机制，提高连接稳定性",
        "优化消息队列管理，防止消息丢失",
        "增强心跳检测机制，及时发现连接异常",
      ],
      fixes: [
        "修复 WebSocket 连接在网络波动时断开的问题",
        "修复消息发送失败后未正确重试的 bug",
        "修复心跳超时后未触发重连的问题",
      ],
    },
    {
      version: "v1.2.0",
      date: "2025-01-01",
      type: "minor",
      title: "Token 管理系统重构",
      features: [
        "全新的 Token 管理界面，支持多账号管理",
        "新增 Token 导入功能，支持 Base64 格式解析",
        "新增 Token 状态监控，实时显示连接状态",
        "新增 Token 分组功能，方便管理多个账号",
      ],
      improvements: [
        "优化 Token 解析算法，支持更多格式",
        "改进 Token 存储机制，使用加密存储",
        "优化 Token 切换速度，提升用户体验",
        "改进路由守卫逻辑，基于 Token 状态进行访问控制",
      ],
      breaking: [
        "旧的用户认证系统已废弃，全面迁移到 Token 管理系统",
        "需要重新导入所有游戏账号 Token",
      ],
    },
    {
      version: "v1.1.5",
      date: "2024-12-20",
      type: "hotfix",
      title: "紧急修复 BON 协议解析问题",
      fixes: [
        "修复 BON 协议解析中的严重 bug，导致部分消息无法正确解析",
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
        "基础 Token 管理功能",
        "WebSocket 连接管理",
        "BON 协议实现",
        "游戏角色管理",
        "基础 UI 框架",
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
   * 获取最近 N 条更新日志
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
