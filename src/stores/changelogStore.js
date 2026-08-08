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
      version: "v2.47.0",
      date: "2026-08-06",
      type: "minor",
      title: "应用宝扫码链路全面修复（502轮询/EXE服务自启动/取码通道配对）",
      fixes: [
        "修复应用宝扫码轮询502导致扫码状态无法检测：应用宝服务(yyb-go)的扫码长轮询复用了带8秒超时的会话HTTP客户端，而微信长轮询接口会保持连接十余秒等待扫码状态，8秒即触发 Client.Timeout exceeded 报502『扫码状态检查失败』，用户真实扫码确认也无法检测到；现长轮询改用独立HTTP客户端（复用会话Cookie、仅由35秒上下文控制超时），等待超时无响应时按 pending(errcode:408) 返回，前端继续轮询不再报错",
        "应用宝getCode新增控制台调试输出：执行获取Token时控制台打印完整响应JSON及 code 值与长度，便于排查应用宝扫码链路各环节状态",
        "修复EXE版应用宝协议服务无法自动启动（二维码获取失败：未知错误）：原自动启动逻辑只找主程序同目录的 yyb-go.exe，而构建产物直跑和安装包布局下该文件不在同目录被跳过；现构建脚本自动复制 yyb-go.exe 到 EXE 产物目录、安装包资源改为平铺命名，自动启动逻辑新增 yyb_go.rar 子目录与 Tauri 资源目录回退查找，直跑与安装两种场景均可自动拉起服务",
        "修复应用宝扫码获取Token时游戏服返回-10001无法获取角色：参照扫码分析项目定位到『取码appid必须与登录通道配对』原则——原流程用小游戏appid取码后走 mini-we 小程序通道，产出24字符短凭证被游戏服拒绝；现改用 Android APP 微信开放平台 appid（wxfb0d5667e5cb1c44）取码并走 app-we 通道，产出游戏服认可的长凭证（实测1432字符，serverlist返回56个角色），导入配置页默认值与标签同步调整，本地已存的旧小游戏appid自动迁移",
      ],
    },
    {
      version: "v2.46.1",
      date: "2026-08-06",
      type: "patch",
      title: "APK微信扫码异常刷新修复与竞技大厅助威移动端适配",
      fixes: [
        "修复APK端微信扫码登录每10秒左右误触发自动刷新：微信长轮询接口 wx_errcode=408 是服务端挂起约15秒后返回的正常等待响应而非二维码过期；Web/EXE端XHR有5秒超时走ontimeout分支收不到408，而APK端Capacitor原生HTTP无超时会真实收到408被误判为过期；现收到408仅继续轮询，仅在本地300秒等待超时才触发自动刷新",
        "竞技大厅助威弹窗移动端自适应：获取列表按钮/赠送数量输入框/搜索框增加max-width:100%防止窄屏溢出，赠送数量行支持换行，俱乐部列表列宽按屏幕宽度响应式缩小（ID 150→90、头像 80→56、战力 140→90、已获助力 120→90），队伍名称列自适应剩余宽度并支持超长省略，表格高度手机端改为50vh避免底部按钮被挤出屏幕",
        "游戏内嵌页面名称统一：public/game 及 Android assets 中的『鸟哥之王』全部更名为『肝王之王』",
      ],
    },
    {
      version: "v2.46.0",
      date: "2026-08-05",
      type: "minor",
      title: "兼容层、脚本存储与任务记录优化",
      features: [
        "逐鹿盐山竞猜新增期次选择器：支持第一期/第二期切换，赛程选项随期次动态变化；自动检测赛程时仅检查当前期次范围，避免跨期次误匹配",
        "兼容层全面重构（patch.js v11.12）：新增 GM_xmlhttpRequest（fetch 实现，自动过滤 Accept-Encoding 等浏览器管控头，responseHeaders 返回标准 HTTP 头字符串格式）、GM_info（scriptHandler='Tampermonkey'）、GM_getValue/GM_setValue/GM_deleteValue/GM_listValues、GM_addStyle、GM_openInTab、GM_setClipboard、GM_log 等完整 API；unsafeWindow 指向 window",
        "JS 自定义脚本存储迁移至 IndexedDB：解决 localStorage 5MB 配额不足导致脚本保存失败的问题；首次加载自动从 localStorage 迁移到 IndexedDB，存储空间大幅提升",
      ],
      fixes: [
        "修复任务执行记录状态污染：连续执行多个手动任务时，上一个任务的失败状态(如残卷为0)会被下一个任务(如一键收车)的进度监控误读，导致记录错乱；现每次任务启动前重置所有账号的 tokenStatus 为 waiting，并清理 tokenFailReasons",
        "竞技大厅助威新增任务完成记录：助威执行完成后会记录成功/失败账号数、耗时、失败原因，与其他手动任务保持一致",
        "删除未生效的挂机时间控制设置：启用时间控制开关和最小挂机时间配置仅在 dailyTaskRunner 中部分生效，批量任务路径完全忽略，已移除 UI、默认值和逻辑分支",
        "宠物合成等级限制默认开启：petMergeMaxLevelEnabled 默认值从 false 改为 true，新用户默认启用合成等级上限(4级)",
      ],
    },
    {
      version: "v2.45.10",
      date: "2026-08-05",
      type: "minor",
      title: "智能发车自定义优先开关与设置说明",
      fixes: [
        "新增智能发车“自定义优先”开关：开启后必须满足自定义条件(金砖/招募令/白玉/刷新券)才发车；关闭后自定义条件或品质任一满足即发车(OR 模式)，同时支持任务级和全局配置，任务级优先",
        "智能发车设置项补充悬浮提示说明：启用条件检查、保底车辆颜色/最低品质、金砖/招募令/白玉/刷新券阈值等选项均增加 title 说明，悬停可查看功能含义",
      ],
    },
    {
      version: "v2.45.9",
      date: "2026-08-05",
      type: "minor",
      title: "定时任务复制功能",
      fixes: [
        "新增定时任务复制功能：任务卡片操作栏新增“复制”按钮，点击后以原任务的全部配置（运行类型、时间、账号、任务、商店配置等）预填表单，任务名称自动加“(副本)”后缀，保存为新任务",
      ],
    },
    {
      version: "v2.45.8",
      date: "2026-08-04",
      type: "patch",
      title: "定时任务队列串行化修复（5 路径统一互斥锁）",
      fixes: [
        "修复定时任务 B/C 并行启动：A 完成后 finally 同步块启动 B，调度器 tick / finally setTimeout 恰好在 isScheduledTaskRunning=false 瞬态窗口也启动 C，导致两个任务并发；现新增 _isProcessingQueue 互斥锁 + processPendingQueue() 统一消费函数，所有路径必须经此入口",
        "修复进度条共用污染：B 和 C 并发运行时都覆写 selectedTokens/tokenStatus 全局状态，导致进度定时器读到对方状态；串行化后每个任务独立占用全局状态",
        "修复 D 中断正在执行的 B/C：D 到时间触发调度器时覆写 selectedTokens 和 currentScheduledTask，导致 B/C 进度定时器失效；现 D 排队等待 B/C 完成后才执行",
        "统一 5 条队列消费路径为单入口：① executeScheduledTask finally 同步块 ② 调度器 finally setTimeout ③ 调度器兜底 tick ④ 手动任务 finally ⑤ 日常任务完成后路径，全部替换为 processPendingQueue(source) 调用",
        "processPendingQueue 内置过期任务跳过 + 孤儿记录清理 + 来源日志标记，确保队列消费可追溯、无竞态",
        "修复 stale 检测后旧任务 finally 覆盖新任务状态：旧任务被 stale 强制释放后新任务已启动，旧任务的 finally 块延迟到达时会错误地重置 isScheduledTaskRunning=false 和 currentScheduledTask=null；新增 _scheduledTaskGeneration 代计数器，finally 块只在代数匹配时才重置状态",
        "修复 stale 检测和 2h 健康检查后不处理队列：强制释放 isScheduledTaskRunning 后未调用 processPendingQueue，导致排队任务需等待下一个调度器 tick（最多 10 秒）；现强制释放后均触发 processPendingQueue 消费队列",
        "新增任务完成情况 Modal 内队列状态显示：显示当前正在执行的定时任务和排队等待列表（任务名称、计划时间、序号），队列变化时实时同步，支持明暗主题",
        "修复队列任务因前序任务执行时间过长被误判过期丢弃：isTaskTimeStillValid 容差从 60 分钟提升至 180 分钟，避免前序任务执行 1–2 小时后队列中 B/C 等任务因超出容差窗口被静默跳过",
      ],
    },
    {
      version: "v2.45.7",
      date: "2026-08-03",
      type: "patch",
      title: "怪异塔累抽奖励日志语义化 & 收车发车400340重试链路修复",
      fixes: [
        "怪异塔使用道具（batchUseItems）领取累计奖励语义化：原 mergebox_claimcostprogress 默认走 2 次重试 + 打 warning『服务器错误: 11800010 - 未知错误，交由批量重试处理』，实际 11800010 在本接口代表「未达累计阈值/无奖励可领」；现调用指定 retries: 0 只请求 1 次，并按错误码映射为 info『累抽奖励无奖励可领取』",
        "callWithRetry 可重试错误日志分级：retries === 0 时跳过『交由批量重试处理』warning（调用方已自行处理错误），仅 retries > 0 时打 warning，避免静默 catch 场景刷屏",
        "怪异塔累抽奖励成功日志细化：捕获 API 响应并尝试解析 rewards/rewardList/items 字段，有奖励明细时展示『累抽奖励领取成功：道具名×数量』，空响应时展示『累抽奖励领取成功』，区分真实领取结果",
        "修复收车发车 400340 不走外部重试：carUtils.js processCarForSmartSend 内层 catch 只处理 12000050/12000030 后静默吞掉所有错误，导致 400340/200750/11800010 无法冒泡到 tasksCar.js 的 retry400340Tokens 队列；现新增三码判断分支 throw 向上抛出",
        "修复旧版 claimCars 收车 catch 静默吞错：carUtils.js 的 claimCars 原 catch 无差别 warning 吞掉所有错误含 400340；现新增 400340/200750/11800010 判断 throw 向上抛出",
        "tasksCar.js executeSmartSendCarForToken 外层 catch 扩展：原仅 12000030 向上 throw，现扩展为 12000030/400340/200750/11800010 全部 throw，确保错误码能穿透到 retry400340Tokens 重试队列（防御第二层）",
        "extractErrorCode 补全错误码：原只识别 400340/200750/11800010 三个码，12000030 和 12000050 进来时日志显示『服务器错误unknown』；现补充 12000030/12000050 映射",
        "processCarForSmartSend car_refresh 加回 12000030 限流局部重试：旧版 carUtils.js 对 car_refresh 有专门的 12000030 重试循环（最多 N 次等 retryDelay），新版 tasksCar.js 缺失导致单次刷新限流就中断整个账号等 60 秒全账号重试；现加回局部重试循环对齐旧版逻辑",
      ],
    },
    {
      version: "v2.45.6",
      date: "2026-08-03",
      type: "patch",
      title: "十殿抽奖重试机制全面对齐面板配置",
      fixes: [
        "修复十殿抽奖（nightmare_draw_lottery）寻宝次数领取失效：原代码 commandTimeout 在 try 块内声明导致第二次领取作用域越界为 undefined，且 catch 无脑吞错把所有异常当“已领取”，400340/超时/200750 都静默跳过致使后续抽奖无次数；现 commandTimeout 提升到外层、新增 claimWithRetry 三步区分“已领取 / 可重试 / 需上抛”",
        "十殿抽奖补齐重试机制：抽取阶段的 400340/200750/11800010 错误已能进入账号级重试队列；且重试轮次内也走「领取周奖励 → 领取寻宝次数 → 抽奖」完整闭环，避免“重试只抽不领”导致空转",
        "十殿抽奖重试机制对齐面板配置：① 领取步骤的 claimWithRetry 原硬编码 3 次 / 3s，现改为读取「默认重试次数」与「重试延迟」；② 账号级重试 fallback 默认值从 60s 改为 10s 与面板一致；③ 重试循环改为每轮重试前先等待「重试延迟」（与智能发车/收车对齐）；④ 重试批次间新增「账号间重试间隔」避免级联限流；⑤ 「默认重试次数=0」时跳过重试并直接标记失败，不白等一次 retryDelay",
      ],
    },
    {
      version: "v2.45.5",
      date: "2026-08-02",
      type: "patch",
      title: "定时任务账号连接逻辑全面修复（11 处 BUG）",
      fixes: [
        "修复调度器同一分钟重复执行：每日任务按 HH:mm 匹配整分钟且调度器每 10 秒 tick，任务在 1 分钟内完成后会被再次触发；新增同分钟去重检查（兼容两种 lastTaskExecution 存储格式）",
        "修复调度器 finally 队列消费无互斥：补充 isScheduledTaskRunning 互斥检查与过期任务跳过循环，避免两个定时任务并发执行；同时修复 currentScheduledTask.name 空引用风险",
        "修复手动任务结束后启动过期队列任务：消费 pendingTaskQueue 前新增 isTaskTimeStillValid 时效校验",
        "修复皮肤挑战预检双重释放槽位：ensureConnection 抛错时内部已释放槽位，外层 catch 再次释放导致连接池计数破坏、超并发；新增 precheckSlotHeld 标志守卫",
        "修复 ensureConnection 虚假释放：获取槽位之前的异常（Token 不存在、等待超时）也会误释放槽位；新增 slotAcquired 标志确保只释放已获取的槽位",
        "修复顶级竞猜取数连接：fetchToken 可能为 undefined 直接 TypeError，连接后盲等 2 秒不验证状态；新增空值守卫并改用 waitForConnection 确认连接",
        "修复 hasActiveChildTask 判断恒错：运算符优先级错误（|| 0 > 0）叠加 Pinia setup store 自动解包误用 .value，导致永远判定为无子任务；修正为 (runningTokens?.size ?? 0) > 0",
        "修复 WebSocketPool 等待者永久挂起：acquire 超时仅在 release 时检查，无释放发生时等待者永远卡死；为每个等待者增加独立超时定时器，超时主动出队拒绝",
        "修复 WebSocketPool 释放槽位丢失：release 时队首等待者已过期则直接 return，槽位既未分配也未归还导致后续等待者饥饿；改为循环跳过过期者唤醒首个有效等待者",
        "修复 connectionManager 重连槽位泄漏：重连时 Token 若被中途删除，refreshedToken 为 undefined 抛 TypeError 跳过释放逻辑；回退使用 latestToken",
        "修复 availableTokens 回退缺失：task.selectedTokens 可能为 undefined，补充空数组回退防止遍历报错",
        "修复比赛竞猜（batchSaltCupBet）/逐鹿盐山竞猜（batchApexGuess）并行失效：调用 runStreaming 时未显式传递 maxConcurrent，仅靠 batchSettings.maxActive 隐式中继，导致用户配置的并行数未真正作用；现从调度器直达 runStreaming 显式传递 task.maxActive",
        "修复比赛竞猜硬编码 300ms 延迟与其他功能不一致：改用统一延迟管理器 _getModuleDelay('saltcup')；同时在账号级末尾补充收尾延迟，避免账号快速完成后立即启动下一个账号导致“级联启动”视觉上是串行",
        "delayManager 新增 saltcup/saltroad 模块映射至 battle 分组（默认 3000ms），与竞技、助威类任务的延迟策略统一",
        "修复换皮闯关活动检测跨分钟边界重复触发：新增 10 分钟负缓存机制（skinChallenge_negativeCache），预检失败或活动未开启时 10 分钟内不再建立服务器连接检测，避免调度器每 10秒 tick 重复请求；服务器确认活动开启时自动清除负缓存",
        "修复一键收车延迟控制与智能发车不一致：claimCars 原硬编码 300ms 不受「⚙️ 延迟设置」面板 battle 分组滑块与单账号智能加速控制；现统一走 _getModuleDelay('car')（与 smartSendCar 共享 car→battle 分组，默认 3000ms）",
        "一键收车精简为纯收车逻辑：移除内嵌的 role_getroleinfo、car_research、car_claimpartconsumereward API 调用（改装升级与累计奖励已拆分为独立按钮），单辆车 API 调用从 3–5 次降至 1 次",
        "升级改装累计奖励诊断日志补齐：原 batchCarResearchUpgrade 的 car_claimpartconsumereward 调用在异常 / 无奖励时均静默，现补充尝试/成功/错误/空响应四种日志，便于定位“看不到领取操作”的原因",
        "优化升级改装累计奖励错误码 200020 提示：原“出了点小问题，请尝试重启游戏”与实际语义不符，现改为“改装累计奖励还未达标，无法领取”",
        "修复批量一键收车（tasksCar.js 的 batchClaimCars）延迟未走 battle 分组：原写死 _getModuleDelay('default')（normal 分组），「⚙️ 延迟设置」面板的战斗操作滑块对其不生效；现统一改为 _getModuleDelay('car')（与 carUtils.js 的 claimCars / smartSendCar 对齐）",
        "修复批量收车重试逻辑三项缺陷：① 原 400340 触发后仍继续循环请求同账号剩余车辆，导致 0ms 间隔连续打满服务端（现首辆 400340 后终止本账号循环，剩余车直接入队）；② 主流程结束到重试第一轮仅 1秒间隔，服务端限流未冷却（现记录首次 400340 时间戳，重试前强制冷却至少 8s）；③ 重试循环内失败后无延迟导致同账号多辆车又 0ms 连续请求（现限流后跳过剩余车等下一轮，非限流错误也加 car 分组延迟）",
        "统一批量收车重试机制与智能发车：每轮重试前先等待 batchSettings.retryDelay（默认 60s），与智能发车 400340 重试模式一致，替代原“主流程后 8s 冷却 + 轮间 retryDelay”的混合模式",
        "批量收车新增跨账号限流共享冷却：任一账号触发 400340 后 12s 内所有账号主动避让（sharedCooldown），避免并发账号连锁触发限流；主流程与重试阶段均接入共享冷却检查",
      ],
    },
    {
      version: "v2.45.4",
      date: "2026-07-31",
      type: "patch",
      title: "一键竞技场战斗次数动态配置功能",
      fixes: [
        "新增定时任务竞技场次数配置：支持 1-100 次自定义战斗次数，提供数字输入框和快捷按钮（1/3/5/8/10 次）",
        "任务级配置优先：定时任务执行时优先读取任务配置的竞技场次数，其次使用全局设置，默认 3 次",
        "日志动态显示：竞技场战斗进度日志从固定的\/3 修改为\/${fights}，根据实际配置次数动态显示",
        "配置持久化：保存和编辑定时任务时正确保存和回显竞技场次数配置",
        "任务标签优化：定时任务列表中竞技场任务名称动态显示配置的次数（如\u201c一键竞技场战斗 8 次\u201d）",
        "日常任务不受影响：日常精简补齐中的竞技场仍固定为 3 次，保持原有行为一致性",
        "修复定时任务蟠桃报名连接问题：在 batchPayloadSignup 入口处新增预连接逻辑（ensureConnection 重试 3 次、跳过槽位检查），形成双重连接保障机制，解决定时任务执行时\u201c未连接\u201d的问题",
        "修复微信扫码自动刷新问题：扫码成功后重置自动刷新计数器，防止重复刷新；调整自动刷新间隔从 30 秒增加到 300 秒，减少不必要的刷新频率",
      ],
    },
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
    {
      version: "v2.45.0",
      date: "2026-07-31",
      type: "patch",
      title: "换皮闯关定时任务死循环问题修复",
      fixes: [
        "修复 Bug #1: 换皮闯关依赖验证返回错误 - verifyTaskDependencies()函数在活动未开启时内部使用 return;而非 return false，导致调用者接收到的 undefined(truthy)被误判为验证成功，引发无限循环重复合并尝试执行",
        "修复 Bug #2: 调度器死循环触发 - 依赖验证失败但无返回值时，scheduler 每 10 秒检查一次认为验证通过就再次启动任务，即使日志显示'活动未开启'仍形成死循环",
        "修复代码逻辑：将 verifyTaskDependencies() 中两处活动未开启的 return;改为 return false，明确返回验证失败状态，让调度器正确拦截无效任务执行",
        "优化日志输出：依赖验证失败时显示更明确的拒绝原因，便于排查活动开放状态问题",
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
