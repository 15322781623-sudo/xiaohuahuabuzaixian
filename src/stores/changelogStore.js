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
      version: "v2.50.5",
      date: new Date().toISOString().split('T')[0],
      type: "minor",
      title: "定时任务多项崩溃修复、逐鹿盐山竞猜旧对阵修复、付费招募精简补齐与前端 JS 混淆加固",
      fixes: [
        "修复定时任务编辑保存时报错「undefined is not valid JSON」：老任务数据缺少逐鹿商店（apexBuyItems）字段时保存直接崩溃——该字段此前只在「新增任务」初始化时赋值，打开 App 直接编辑已有任务即为 undefined，JSON.parse(JSON.stringify(undefined)) 立即抛错；现补上默认定义、编辑合并、保存兜底三层防护",
        "修复大量定时任务报「任务函数不存在（可能已被删除），跳过执行」：任务函数映射表为手工维护存在遗漏（重置罐子、一键领取罐子等未被登记），且生产构建混淆后 eval 无法按名访问组件局部变量导致兜底失效；映射表改为整模块注册，补全独立函数与名称别名（盐场蟠桃阵容、黑市周购买），并新增运行时自检一次性列出无法解析的任务",
        "修复 Android 7 及以下设备卡密激活报「网络错误：Object.fromEntries is not a function」：该 API 需 Chrome 73+，旧 WebView 缺失；补对应 polyfill",
        "修复定时任务选择列表中盐场任务名显示为「盐场创地」的错别字，与批量日常按钮「盐场刨地」统一（执行日志与 API 注释同步修正）",
        "修复 structuredClone 降级实现与原生行为不一致：旧 WebView 下 structuredClone(undefined) 会抛错而原生不会，已对齐",
        "新增日常精简补齐「付费招募」选项：与完整日常流程共用防重复标记，一天最多购买一次；默认不勾选防止误点消耗元宝，需手动勾选才执行",
        "安全加固：前端 JS 由 terser 压缩（伪混淆，格式化即可读）升级为 javascript-obfuscator 真混淆（字符串 base64 加密 + 标识符混淆 + 防格式化自防御），并覆盖 game.html 内联脚本；Release 包关闭 WebView 调试开关，防止 adb 远程 inspect",
        "卡密设备绑定增强：补齐 Android DeviceId 插件（ANDROID_ID），清除 WebView 数据后设备标识保持不变，不再误退化为随机指纹导致反复重新激活",
        "定时任务账号选择弹窗适配手机端：窄屏下按钮换行堆叠、主操作前置、统计信息左对齐",
        "构建稳定性：EXE 打包前校验前端产物完整性，防止清空过程被中断时打出无法启动的坏包；修复 EXE 打包时因重复构建触发批量删除保护而中断的问题",
        "修复逐鹿盐山竞猜获取到之前的对阵数据、勾选后下注报错的问题：弹窗打开时直接使用 localStorage 恢复的旧赛程 scheduleId 拉取对阵，比赛进入新赛程后仍拉到上一赛程的旧对阵，勾选已开赛队伍下注即报错；现打开弹窗先逆序探测当前期次真正有数据的最新赛程并自动切换，当前期次无任何对阵时明确提示「赛程可能未开放」",
        "修复逐鹿盐山竞猜对阵列表可能出现重复的问题：apex_getguesslist 分页依赖 idx 参数，若服务器忽略 idx 每次都从头返回，同一批对阵会被重复拉取多次，列表出现重复对阵导致对同一场重复下注；现按队伍 teamId 组合去重，整页全为重复数据（分页失效）时提前停止",
      ],
    },
    {
      version: "v2.50.4",
      date: new Date().toISOString().split('T')[0],
      type: "patch",
      title: "Cron 定时刷新无法生效 Bug 修复",
      fixes: [
        "修复批量日常-设置-Cron定时刷新完全无法生效的问题：设置正确的 Cron 表达式后页面从不按计划刷新",
        "根本原因：Cron 定时刷新检查被放在 healthCheck 函数中，而 healthCheck 每 5 分钟才执行一次；Cron 表达式最小粒度为分钟，5 分钟一次的检查点几乎不可能落在目标分钟上，导致定时刷新永不触发",
        "修复方案：新增 checkCronRefresh 检查函数，将检查移动到调度器每 10 秒的 tick 中执行，分钟级精度下可以精确命中目标时间",
        "检查位置优化：置于调度器 tick 的最前面（启用的定时任务为空时的 early return 之前），即使未启用任何定时任务也能正常执行 Cron 定时刷新",
        "新增同一分钟防重复机制：10 秒 tick 在同一命中分钟内会多次匹配，现在同一分钟只触发一次刷新，避免页面被连续多次刷新",
        "保留刷新安全检查：刷新前仍判断任务执行中/队列非空/账号任务活跃/未来2分钟内有定时任务即将触发等场景，不安全时自动推迟到任务完成后刷新，不会中断正在执行的任务",
      ],
    },
    {
      version: "v2.50.3",
      date: new Date().toISOString().split('T')[0],
      type: "patch",
      title: "逐鹿商店勾选项互不独立 Bug 修复",
      fixes: [
        "修复逐鹿商店多选购买功能中勾选项互相干扰的严重 Bug：点击一个商品会导致其他商品同时被勾选",
        "根本原因：apexShopConfig 使用 id 字段 (1,2,3)，但模板错误使用不存在的 shopId 字段作为 key 和对象索引",
        "所有 checkbox 共享 taskForm.apexBuyItems[undefined] 对象引用，修改任何一个都会影响所有三个商品",
        "修复 Vue v-for 的 key：从 :key=\"option.shopId\" 改为 :key=\"option.id\" 确保 DOM 正确区分",
        "修复所有 checkbox 绑定：将 option.shopId 全部替换为 option.id 以匹配实际数据结构",
        "修复 Modal 执行函数配置保存：使用 String(item.id) 作为键存储到 batchSettings.apexBuyItems",
        "修复定时任务执行逻辑：使用 String(item.id) 查找任务配置并更新商店状态",
        "重构 checkbox 更新逻辑：完全重建对象而非仅修改.selected 属性，避免 Vue 响应式副作用",
        "确保数据结构一致性：源数据、UI 绑定、任务保存、定时任务执行全部统一使用 id 字段",
      ],
    },
    {
      version: "v2.50.2",
      date: new Date().toISOString().split('T')[0],
      type: "minor",
      title: "逐鹿商店多选购买功能与营地报名：批量定时自动执行，支持手动触发",
      fixes: [
        "新增逐鹿商店多选购买功能：支持在资源模块下勾选商品并设置购买数量",
        "通过背包获取盐山金币数量 (item ID 16002) 作为购买货币，自动校验余额充足性",
        "三种商店商品配置：饼干限购 25 次、幻彩灵果限购 75 次、四圣转换镜限购 1 次",
        "智能预校验：根据盐山金币余额自动调整各商品购买次数，不足时提示并跳过",
        "限购保护：超过限购数量时自动调整为允许的最大值",
        "错误处理增强：检测到「已上限」「限购」「超出限制」等错误码时自动停止继续购买",
        "集成逐鹿商店购买命令 (apex_buy)：注册到 WebSocket 命令注册表，支持请求 - 响应匹配",
        "批量任务支持：可在定时任务中配置逐鹿商店购买，与其他资源购买功能保持一致",
        "UI 交互优化：弹窗形式展示商店配置，复选框 + 数字输入框，清晰直观",
        "新增营地报名功能：在公会/俱乐部模块下添加营地报名按钮，支持批量定时自动报名",
        "实现 batchClubSignup 函数：调用 club_signup 接口，自动为选中账号加入训练营地",
        "实现 batchLegionSignup 函数：调用 legion_signup 接口，自动为选中账号加入军团营地",
        "修复营地报名手动执行失败 bug：从 tasksHangUp 解构中提取 batchClubSignup/batchLegionSignup 函数",
        "将 batchClubSignup/batchLegionSignup 添加到 taskFunctionMap 映射表，确保定时任务可正常访问",
        "完善任务函数映射表结构：新增 tasksHangUp 函数分组，保持与其他任务模块的一致性",
      ],
    },
    {
      version: "v2.50.1",
      date: new Date().toISOString().split('T')[0],
      type: "patch",
      title: "定时任务手动执行函数映射缺失修复",
      fixes: [
        "修复营地报名手动执行失败 bug：taskFunctionMap 中缺少 batchClubSignup 和 batchLegionSignup 函数引用导致执行报错",
        "从 tasksHangUp 解构中提取 batchClubSignup 函数并添加到 taskFunctionMap 映射表",
        "定时任务批量执行逻辑统一使用 taskFunctionMap 获取函数引用，确保所有定时任务都能正常访问",
        "完善任务函数映射表结构，新增 tasksHangUp 函数分组，保持与 tasksStore/tasksDungeon/tasksArena 的一致性",
      ],
    },
    {
      version: "v2.50.0",
      date: "2026-08-20",
      type: "minor",
      title: "盐场创地功能上线：纯前端定时执行，批量自动刨地",
      fixes: [
        "新增盐场创地功能：纯前端实现，无需后端服务，批量自动刨地",
        "支持手动执行：勾选账号后在批量日常页面点击「盐场创地」按钮即刻启动",
        "支持定时执行：新增定时任务时勾选「盐场创地」，设置 Cron 0 20 * * 6 每周六 20:00 自动执行",
        "并行刨地：所有账号同时在线刨地，按 1.5 秒间隔错开启动，互不等待",
        "智能阵容切换：创地前自动读取账号 saltFieldPeachFormation 配置并切换到目标阵容，如已是正确阵容则跳过",
        "六边形随机刨地：基于 even-q 偏移坐标系，随机选择相邻格子行军占领，最高 100 格安全上限",
        "盐场时间窗限制：仅周六 20:00-21:00 执行，非活动时间自动提示并跳过",
        "独立盐场 WebSocket 连接：自动建立盐场专用 WS 连接，不影响主服连接",
        "支持中途停止：点击停止按钮可随时终止所有账号刨地",
        "吕布单将布阵：进场后自动使用吕布单将布阵，创地效率最高",
      ],
    },
    {
      version: "v2.49.8",
      date: "2026-08-10",
      type: "patch",
      title: "星级挑战每关最大尝试次数配置 + 连续失败自动跳过下一关",
      fixes: [
        "任务设置弹窗添加星级挑战每关最大尝试次数选项（战斗次数区域）：范围 1-5 次，默认 3 次，总上限 5 次",
        "任务模板管理界面同步添加该选项：保存模板时包含此配置，应用到账号时自动继承",
        "批量星级挑战执行逻辑修改：从账号设置中读取 starChallengeAttempts 字段，MAX_ATTEMPTS = maxAttemptsFromSettings",
        "关卡失败行为优化：连续失败达到设定次数后不再终止整个流程，而是 continue 跳过本关继续下一关",
        "调试日志增强：启动时输出『⚙️ 从设置读取挑战次数：X 次』或『⚠️ 未找到设置，使用默认 3 次』",
        "UI 提示优化：输入框下方显示『默认 3 次，总 5 次，建议根据账号实力调整（1-5 次）''",
        // === 与 NightmareAutoBattle 十殿阎罗挑战的区别 ===
        "注意：十殿星级挑战的每关次数配置在任务设置中，而非 nightmareAutoBattle.js（那是后台战斗模式）",
      ],
    },
    {
      version: "v2.49.7",
      date: "2026-08-17",
      type: "patch",
      title: "Token 管理增强 + 定时任务 eval 失效终极修复：删除引用自动清理 + 新增自动添加到所有开启任务 + 函数名映射表",
      fixes: [
        // === 第 1 部分：Token 管理增强 (2026-08-16) ===
        "修复 Token 删除后定时任务仍保留引用：删除账号 Token 时自动检查并移除 scheduledTasks.selectedTokens 中的所有引用，避免执行报错",
        "新增 handleAddedToken 处理器：通过扫码/BIN/手动输入等方式新增 Token 后，自动将新账号添加到所有未开启的定时任务的 selectedTokens 列表中",
        "智能去重与提示：仅当 Token 未存在于定时任务且任务处于启用状态时才添加，保存后显示成功消息告知添加到的任务数量",
        "用户体验优化：新增 Token 无需手动逐个添加到定时任务，减少重复操作",
        
        // === 第 2 部分：定时任务 eval 失效终极修复 (2026-08-17) ===
        "修复定时任务 manual_buy/collection_exchange 函数不存在：生产构建中 eval() 无法访问组件局部变量（tasksStore/tasksDungeon/tasksArena 解构的函数）",
        "新增 taskFunctionMap 函数名映射表：在 tasksStore 解构后创建含 47 个函数的对象，优先从映射表获取函数引用（taskFunctionMap[functionName]），回退 eval() 兜底兼容其他路径",
        "isTaskFunctionExists 验证优化：优先查询 taskFunctionMap，避免白名单机制复杂且不直观",
        "依赖验证与执行路径统一：verifyScheduledTaskExecute、executeScheduledTask、手动执行全部使用 taskFunctionMap，确保所有 eval() 调用点均能访问任务函数",
        "影响范围：黑市多选购买、珍宝阁商店购买、各类商店购买、宠物合成升级等所有定时任务功能",
      ],
    },
    {
      version: "v2.49.6",
      date: "2026-08-10",
      type: "patch",
      title: "宝箱周开箱功能简化与对齐：固定优先级 + 补货后置 + 移除超标逻辑",
      fixes: [
        "固定优先级 [2002, 2003, 2004]（青铜→黄金→铂金）",
        "要求每批必须 10 个一组开箱，避免超额浪费积分",
        "优化批量计算公式：从 Math.floor(remain / pts) 改为 Math.floor(maxBoxesByScore / 10) * 10，确保实际开箱数量始终是 10 的倍数",
        "修复达标奖励领取失效：完全移除 activity_buystoregoods 达标奖励领取逻辑（原约 140 行）",
        "修复 woodStock 变量未定义错误：在木质宝箱使用前添加 const woodStock = bagItems[2001]?.quantity || 0;",
        "修复重复补货逻辑 bug：删除两段重复的补货代码，仅保留一段完整的 if (!lastBoxId) 条件判断",
        "补货机制位置调整：在所有高级箱优先级尝试失败后才执行补货，不再中途介入",
        "清理临时探测代码：删除 scripts/tmp-probe-manifest*.cjs 等不必要的测试文件",
        
        // === 昨晚修复的黑市多选购买与批量开箱 (2026-08-09) ===
       
        "黑市多选购买支持定时任务配置：可从设置面板保存配置到 batchSettings.manualBuyItems，定时任务自动读取执行",
        "批量开箱功能：固定优先级、10 个一组开箱、补货后置、移除超标逻辑",
      ],
    },
    {
      version: "v2.49.4",
      date: "2026-08-14",
      type: "patch",
      title: "批量钓鱼多轮优化：次数控制 + 错误码处理 + 鱼竿数据源 + 并发控制 + 延迟配置 + 单账号加速",
      fixes: [
        // === 第 1 轮：基础修复 (2026-08-13) ===
        "赛车改装新增双策略升级：积分优先（升级到 4002 分停止，最后一天可达 5000 则冲刺）和排名优先（全部升满 60 级），可在任务设置面板或任务模板中配置",
        "修复资源模块批量钓鱼变量未定义错误：调整 remainingCount/availableCount 变量初始化顺序，避免 TDZ 错误导致的执行失败",
        "将赛车改装策略集成到任务设置面板和任务模板，统一在齿轮⚙️设置弹窗中管理所有账号配置项",
        
        // === 第 2 轮：次数控制与错误处理 (2026-08-14) ===
        "修复批量钓鱼执行次数超过用户设定值：实际执行次数现在同时考虑用户输入次数、鱼竿库存和剩余月任务进度三者最小值，避免超额执行",
        "优化错误码 200020 处理：当检测到'当前钓鱼免费次数未使用'错误时直接标记为失败并提示原因，不再加入重试队列",
        "完善鱼竿数据获取：从 tokenGameDataMap 读取指定 tokenId 的鱼竿数量，避免多账号批量时误读当前选中账号的数据",
        
        // === 第 3 轮：并发与加速 (2026-08-14) ===
        "重构批量钓鱼执行逻辑：改用 runStreaming 函数处理多账号并发，支持模块级别的并发数配置（defaultConcurrency）",
        "新增模块级别延迟控制：在每次 API 请求后使用 _getModuleDelay('default') 延迟，支持批量任务全局延迟设置",
        "完善单账号加速功能：手动执行批量任务时自动检测单账号模式，所有鱼钩操作均应用延迟控制，加速模式下响应更快",
        "优化代码结构：移除重复的 runStreaming 调用，将 processFishBody 改为内联回调函数",
        
        // === 第 4 轮：Bug 修复 (2026-08-10) ===
        "修复星级队伍补齐凑星重复加入房间 bug：新增 inCurrentTeam 筛选条件，防止已加入过房间的账号被重复选中",
        "修复星级队伍锁定后账号消失问题：允许已录用锁定的队伍成员在主列表显示，并添加到已完成组队汇总区",
      ],
    },
    {
      version: "v2.49.3",
      date: "2026-08-12",
      type: "patch",
      title: "月度钓鱼补齐鱼竿预检 + 付费招募防用超修复",
      fixes: [
        "月度钓鱼补齐新增普通鱼竿预检：执行前优先检查账号普通鱼竿库存，若「达标进度 (320) - 当前进度 > 鱼竿库存」则直接跳过该账号不再执行，避免白白消耗鱼竿却无法达标；单账号卡片按钮与批量一键钓鱼补齐均已接入",
        "修复批量钓鱼补齐鱼竿数量获取错误：预检改用 getTokenGameData(tokenId) 获取目标账号数据，避免读取到当前选中账号的鱼竿库存导致判断错误",
        "付费招募防用超修复：付费招募禁用连接错误自动重试（noRetry），避免超时重试导致重复扣费；新增本地当日执行标记（paidRecruit:账号:日期），同一账号同一天只执行一次付费招募；默认开启，用户可主动关闭",
      ],
    },
    {
      version: "v2.49.2",
      date: "2026-08-12",
      type: "patch",
      title: "云端同步数据客户端 AES 加密：上传密文化、下载自动解密恢复、密钥本机派生",
      fixes: [
        "云端快照上传全程加密：快照 JSON → gzip 压缩 → AES-GCM-256 加密（随机 IV）→ base64 封装为 JSON 信封上传，云端（Cloudflare R2）仅存密文，作者与管理后台均无法读取用户 Token/BIN 等敏感配置",
        "加密密钥安全派生：密钥由账号密码经 PBKDF2-SHA256（10 万次迭代、用户名盐）派生，仅存本机 localStorage、绝不上传云端；跨设备使用同一密码登录即可复现密钥解密快照",
        "下载自动解密恢复：拉取云端快照自动检测密文格式（__enc）→ 自动 AES-GCM 解密 → gzip 解压 → 应用恢复；旧版明文快照完全兼容不受影响",
        "密钥生命周期管理：登录/注册成功后自动派生保存密钥，登出自动清除，修改密码后自动用新密码重新派生（旧密码加密的快照需重新上传后方可恢复）",
        "防明文回退保护：未重新登录的老用户无加密密钥时自动同步跳过上传（控制台提示重新登录启用加密），手动上传保留旧版明文兼容路径；上传日志显示「AES加密(+gzip)」状态",
        "解密失败友好提示：密码变更或快照损坏导致解密失败时提示「请使用上传该配置时的账号密码重新登录后重试」，不再静默失败",
      ],
    },
    {
      version: "v2.49.1",
      date: "2026-08-12",
      type: "patch",
      title: "云顿配置授权提示：赞助弹窗、云端同步弹窗新增赞助授权指引",
      fixes: [
        "赞助弹窗（批量任务页、卡密弹窗）新增提示「赞助30以上可联系我授权云顿配置功能」，以橙色加粗样式置于赞助方案说明与激活码规则之间，引导用户了解云端配置授权获取方式",
        "云端同步弹窗中，未授权账号在「需管理员开通授权」警告下方新增相同赞助授权提示，打通云端配置功能与赞助体系的认知路径",
      ],
    },
    {
      version: "v2.49.0",
      date: "2026-08-11",
      type: "minor",
      title: "请求头伪装方案统一管理、品牌文字优化、移动端UI适配、微信扫码流程文档",
      fixes: [
        "新增请求头伪装统一配置模块：从 Cloudflare Worker (_worker.js) 的代理伪装方案中提取 4 套端点配置（微信 OAuth / 微信长轮询 / Hortor / Ucenter），创建 src/utils/spoofedHeaders.ts 集中管理 Android 设备 UA、Referer、Origin、Host 等伪装头；wxqrcode.vue 与 hortorLogin.ts 的硬编码头迁移至共享模块，消除重复代码；新增 UCENTER_HEADERS 端点配置，为后续接入游戏用户中心接口提供伪装能力",
        "品牌文字优化：导航栏品牌名由「XYZW 控制台」简化为「控制台」，字体大小改为 clamp(14px, 3.5vw, 20px) 响应式缩放配合 white-space: nowrap 防止窄屏换行",
        "APK 移动端 UI 适配修复：批量日常任务页按钮内的 emoji 图标因内联 style 固定 16px 无法随移动端 CSS 缩放，改为 class 控制并通过媒体查询在 768px/400px 两档自动缩小至 14px/12px；排序按钮（名称/服务器/创建时间等）标题溢出添加 text-overflow 保护；底部操作按钮（开始执行/停止/设置等）在移动端自动缩小字号与高度",
        "新增微信扫码登录角色获取流程文档：docs/wechat-scan-role-logic.md 覆盖从二维码生成、OAuth 扫码轮询、Hortor 登录加密编码、BIN 生成、服务器角色列表获取、选服生成 Token 到三层持久化存储的完整链路，含三端适配说明",
      ],
    },
    {
      version: "v2.48.4",
      date: "2026-08-11",
      type: "patch",
      title: "BIN 存储四层防护、云端同步日志化、默认启动页可配置、游戏界面防顶号",
      fixes: [
        "BIN 数据存储升级为四层防护：IndexedDB 主存储 → localStorage gzip 压缩备份（节省 60-80% 空间）→ localStorage 原始 base64 备份（兼容回退）→ 云端配置快照（跨设备恢复）；应用启动 2 秒后自动校验补齐备份、旧格式迁移、孤儿备份清理",
        "云端同步全面接入执行日志：云端恢复结果（BIN 成功/失败数、Token 数量差异）恢复后自动输出到执行日志、控制台分组展示；手动上传与自动同步上传均输出 Token/BIN 数及传输大小（含 gzip 压缩率）到执行日志",
        "修复云端恢复 BIN 日志被 location.reload() 清空不可见：恢复前将结果写入 sessionStorage 跨 reload 保留，页面重启后在 App.vue 读取并以醒目 console.group 展示，同时自动对比云端 BIN 与本地 Token 数量差异并告警",
        "修复云端恢复后 BIN 写回遗漏与备份缺失：restoreBinData 预校验 base64 后再事务写入，15 秒超时保护；恢复后自动补齐 localStorage BIN 备份兜底；collectBinData 采集时自动对比 IndexedDB 与 Token 数量",
        "新增游戏界面防顶号：打开游戏（Tauri 窗口 / iframe / 批量登录）前自动断开助手 WebSocket 连接，避免游戏内连接与助手连接同账号冲突被踢下线；执行日志输出断开原因",
        "新增默认启动页可配置：设置面板新增「默认启动页」下拉（Token管理 / 首页），首页路径映射为 /admin/dashboard 控制台；路由守卫无 Token 时自动跳转默认页",
      ],
    },
    {
      version: "v2.48.3",
      date: "2026-08-10",
      type: "patch",
      title: "逐鹿盐山竞猜：期次/赛程顺序调整、切换期次自动探测最新赛程、选中值 localStorage 持久化",
      fixes: [
        "逐鹿盐山竞猜弹窗及定时任务配置卡片期次/赛程顺序调整：期次选择器移至赛程之前，更符合先选期次再选赛程的直觉操作顺序",
        "切换期次自动探测最新赛程：从决赛(26)→64强(20)逆序试探 apex_getguesslist，找到首个有对阵数据的赛程自动选中并输出日志；探测期间显示 ⏳ 提示且获取按钮禁用防重复操作；全部无数据时默认回落 64强",
        "期次与赛程选中值 localStorage 持久化：键名 saltHillGuessStage / saltHillGuessScheduleId，页面加载时自动恢复上次选中值，每次变更实时写入，下次打开弹窗无需重新选择",
      ],
    },
    {
      version: "v2.48.2",
      date: "2026-08-10",
      type: "patch",
      title: "EXE本地HTTP/WS代理补齐wx_mini_1协议伪装、日常任务竞技场次数读取账号设置、Cron定时刷新",
      fixes: [
        "新增 EXE 本地 HTTP+WebSocket 代理（方案 B）：Tauri Rust 层启动 127.0.0.1:19863 代理服务，前端自动拦截游戏域名请求（hortorgames.com/servicewechat.com）转发至代理，代理以原生 HTTP 请求补齐微信小程序 Origin=https://servicewechat.com、Referer、PC 微信 UA、xweb_xhr=1 等完整请求头，WebSocket 同样支持 ws:// 代理双向转发；突破浏览器禁止设置 Origin/Referer/UA 的硬限制，EXE 端实现与 APK 一致的请求头伪装",
        "代理 CORS 兼容：所有代理响应添加 Access-Control-Allow-Origin 头，OPTIONS 预检返回 204 并允许 X-Target-Url/X-Target-Method 自定义头，确保 Tauri WebView 跨域请求不被浏览器拦截",
        "修复批量任务设置弹窗及模板弹窗中竞技场次数无法自定义输入：n-select 的下拉选项点击「自定义...」后无输入框弹出，不能输入数字；现改为 n-input-number 组件（min=1 max=100），可直接编辑次数",
        "日常任务竞技场战斗次数统一读取账号设置：每日任务执行器（dailyTaskRunner.js）原先硬编码 3 次，现改为读取账号设置 arenaFightCount；单账号设置卡片（DailyTaskStatus.vue）新增竞技场次数数字输入（紧挨竞技场开关）；批量页手动竞技场按钮同样改为读取账号设置而非工具栏下拉独立值，三条路径统一",
        "新增 Cron 表达式定时刷新页面：设置面板「Cron定时刷新」开关（默认关闭），开启后输入 cron 表达式（如 0 8 * * *），实时校验并显示未来 5 次执行时间；调度器每 10 秒检查表达式是否命中当前分钟，命中则触发页面刷新（复用防任务中断安全检查）",
      ],
    },
    {
      version: "v2.48.1",
      date: "2026-08-09",
      type: "patch",
      title: "云端恢复后账号BIN数据可用性修复：上传改gzip二进制、恢复不再卡死、全入口三级读取兜底",
      fixes: [
        "云端配置上传改用 gzip 压缩二进制传输：原 JSON 内嵌 base64 体积膨胀且受 4MB 限制，现浏览器端 CompressionStream 压缩后直传二进制，Worker 端 DecompressionStream 解压，单账号配置上限提升至 20MB，多账号大批量 BIN 也能完整上云；不支持压缩流的旧环境自动回退明文 JSON",
        "修复云端恢复后 BIN 写回卡死：下载覆盖时 deleteDatabase 清理会被应用自身的 IndexedDB 连接阻塞导致死锁，BIN 永远写不回、页面不刷新；现 BIN 库不再参与删库清理，改为打开后清空旧记录再写入（clear+put 单事务），15 秒超时保护并在控制台输出采集/写回条数便于排查",
        "云端恢复后账号无法登录/跳转游戏修复：恢复后 BIN 仅存在于 localStorage 备份（随快照还原），而跳转游戏、游戏登录页登录、分组导出、手动刷新Token、自动续期均只读 IndexedDB 报『BIN数据不存在』；现全部统一为三级读取（IndexedDB→名称键→localStorage备份），手动刷新与自动续期命中备份后自动回填 IndexedDB",
        "十殿星级挑战适配游戏取消前置关卡限制：不再校验前置关卡星级，所有关卡均可直接挑战；每关最多尝试3次，3次失败后停止整个挑战流程（批量与单账号卡片两处一致）",
        "逐鹿盐山竞猜新增期次选择与赛程编码适配：赛程下拉保存淘汰赛局部编号（64强=20~决赛=26），新增期次下拉（第一期~第七期，默认第二期，第一期=0）；执行时按 scheduleId=(期次-1)*26+局部编号 编码（第二期64强=46），新期开赛自动适配无需改配置；取对阵/下注均携带真实scheduleId+groupId；旧配置46-52自动-26迁移；竞猜弹窗确认下注入口补齐单账号智能加速（仅选1个账号时延迟自动乘加速倍率，与其他手动任务一致）；打开弹窗已选账号时自动拉取一次对阵列表；领奖按 guessClaimMap 键动态领取（天然跨期），日志按编码规则解码显示『第N期64强(46)』",
      ],
    },
    {
      version: "v2.48.0",
      date: "2026-08-09",
      type: "minor",
      title: "云端配置同步：登录账号全量配置上云，多设备快照换设备一键恢复；新增新区换皮闯关/寻宝",
      fixes: [
        "新增新区一键换皮闯关/寻宝：新区活动ID每周动态推导（activity_get commonActivityInfo 排除普通礼包 key 后取最高 key，闯关 actId=maxKey-2、寻宝=maxKey-1、礼包 goodsId=maxKey+1），经 towers_getinfo 验证并跟随服务器响应动态赋值；批量页按钮与定时任务均已登记，预检确认未开启时写10分钟负缓存自动跳过",
        "新区换皮闯关 BOSS 轮巡：新区活动为旧赛季换皮不适用星期硬编码开放表，改为轮巡尝试 BOSS 1-6，未开放/不可打（200020/7900021/7900019）一次失败即跳下一个，已通关的按 levelRewardMap 自动过滤",
        "新增云端配置同步功能：支持注册/登录云端账号（Cloudflare Worker + KV 存储，密码加盐SHA-256），登录后即可将本机全量配置（游戏Token、分组、任务模板、定时任务、各账号日常设置、自动跳转/主题等偏好）上传云端；换设备登录后一键下载恢复，页面自动刷新完整还原",
        "同步入口三处可达：顶部导航栏、Token管理页头部新增云图标按钮，弹窗内提供上传本地到云端/下载云端覆盖本地（二次确认）/自动同步开关/退出登录",
        "自动同步可选：开启后每5小时检测本地配置变化，防抖1小时自动上传；登录时若本地无Token且云端有配置则自动拉取恢复",
        "同步安全与容量：localStorage 全量快照排除连接状态等易失数据，单账号配置上限4MB，凭据独立保存不随下载覆盖丢失",
        "新增云端账号后台：隐藏入口仅路径 /gwydpz-admin 访问（与卡密后台一致），复用卡密管理员密码鉴权；可查看注册账号列表（注册时间/授权状态/是否存入配置/配置更新时间/大小/设备快照数）、授权/取消授权账号、查看任意账号完整配置（支持复制/下载JSON）、删除账号及其云端数据",
        "云端配置存储升级 R2：原 KV 存储免费额度有限（1GB/每日1000次写入），现迁移至独立 R2 桶 cloud-cfg-bucket（10GB/每月百万级写入）；存量配置在下次读写时自动懒迁移，无需手动处理",
        "多设备配置快照：云端配置按设备名独立保存、不再互相覆盖；弹窗展示全部设备快照列表（名称/更新时间/本机标记），可恢复任意一份覆盖本地或删除过期快照；恢复后本机接管该设备名身份，后续上传更新对应快照",
        "恢复覆盖彻底清理：下载并覆盖时同步清空 localStorage、sessionStorage 与 IndexedDB（token 等旧数据），杜绝恢复后旧配置残留；登录凭据与自动同步开关保留",
        "云端账号注册/登录不区分大小写：注册时同名不同大小写（如 Admin/admin）判定为重复账号拦截；登录时输错大小写也能正确匹配账号",
        "云同步弹窗 UI 升级：卡片式分区布局（账号信息卡/本机上云卡/云端设备配置列表卡/自动同步开关卡），规整大气并自适应手机端窄屏",
      ],
    },
    {
      version: "v2.47.1",
      date: "2026-08-09",
      type: "patch",
      title: "Web版应用宝扫码公共代理接入与批量页体验优化",
      fixes: [
        "Web版应用宝扫码自动接入公共代理服务：Pages/worker 环境无法拉起本地 yyb-go.exe 导致应用宝服务无法开启；现纯 Web 生产环境默认连接公共代理服务（进入页面自动健康检查并切换），扫码、轮询、确认、取码全链路直接走远程 API，服务地址仍可手动修改；EXE/APK/Web开发版行为不变",
        "批量页添加Token新增应用宝扫码入口：此前仅 Token 导入页支持应用宝扫码，批量任务页的添加Token弹窗缺少该方式；现与微信扫码并列提供应用宝扫码页签，支持一键切换回微信扫码",
        "挂机模块请求超时账号加入重试队列：执行领取挂机等功能按钮时出现『请求超时』的账号原先直接跳过；现将请求超时与 400340/200750 等错误码同等对待，进入批次重试队列按重试轮数再次执行（与收车模块策略一致）",
        "获取角色列表失败原因明确化：serverlist 接口返回业务错误码（如 -10001 登录凭证校验失败）或空响应时不再静默返回空列表，而是抛出带错误码的明确报错，微信扫码保存账号时提示具体失败原因而非笼统的『获取服务器角色列表失败』",
        "应用宝扫码Token纳入长期有效管理：应用宝方式导入的Token与微信/BIN/URL导入同等标记『长期有效』，支持单个刷新与一键全部刷新（通过应用宝协议服务免扫码静默重新登录，失败时自动回退本地BIN刷新）",
        "任务模板设置补齐竞技场次数：模板弹窗战斗次数区块原先只有俱乐部BOSS与每日BOSS，缺少竞技场次数（账号单独设置里有）；现新增竞技场次数下拉（1/3/5/8/10次），随模板保存并应用到各账号，编辑旧模板自动补默认值3次",
        "盐场报名错误码语义化：服务器返回 2300290 时不再报『服务器错误: 2300290 - 未知错误』并触发重试，改为提示『当前盐场报名已报名或不在报名时间内』并正常结束",
        "自动跳转批量日常可配置、各页面独立控制：原先首页/控制台固定120秒自动跳转且无法关闭；现重构为首页/Token管理/控制台三个独立开关（默认仅首页开启），倒计时秒数可自定义10-3600；设置入口位于顶部导航与Token管理页头部时钟按钮弹窗、个人设置-系统偏好，三处同步生效，倒计时期间显示提示条并可一键取消",
      ],
    },
    {
      version: "v2.47.0",
      date: "2026-08-08",
      type: "minor",
      title: "应用宝扫码链路全面修复与APK内置协议服务（502轮询/取码配对/多ABI内置/DNS容错）",
      fixes: [
        "修复应用宝扫码轮询502导致扫码状态无法检测：应用宝服务(yyb-go)的扫码长轮询复用了带8秒超时的会话HTTP客户端，而微信长轮询接口会保持连接十余秒等待扫码状态，8秒即触发 Client.Timeout exceeded 报502『扫码状态检查失败』，用户真实扫码确认也无法检测到；现长轮询改用独立HTTP客户端（复用会话Cookie、仅由35秒上下文控制超时），等待超时无响应时按 pending(errcode:408) 返回，前端继续轮询不再报错",
        "应用宝getCode新增控制台调试输出：执行获取Token时控制台打印完整响应JSON及 code 值与长度，便于排查应用宝扫码链路各环节状态",
        "修复EXE版应用宝协议服务无法自动启动（二维码获取失败：未知错误）：原自动启动逻辑只找主程序同目录的 yyb-go.exe，而构建产物直跑和安装包布局下该文件不在同目录被跳过；现构建脚本自动复制 yyb-go.exe 到 EXE 产物目录、安装包资源改为平铺命名，自动启动逻辑新增 yyb_go.rar 子目录与 Tauri 资源目录回退查找，直跑与安装两种场景均可自动拉起服务",
        "修复应用宝扫码获取Token时游戏服返回-10001无法获取角色：参照扫码分析项目定位到『取码appid必须与登录通道配对』原则——原流程用小游戏appid取码后走 mini-we 小程序通道，产出24字符短凭证被游戏服拒绝；现改用 Android APP 微信开放平台 appid（wxfb0d5667e5cb1c44）取码并走 app-we 通道，产出游戏服认可的长凭证（实测1432字符，serverlist返回56个角色），导入配置页默认值与标签同步调整，本地已存的旧小游戏appid自动迁移",
        "APK内置应用宝协议服务，免外部部署：yyb-go 服务交叉编译为原生二进制内置进 APK（arm64-v8a/armeabi-v7a/x86_64 三种架构，覆盖真机与模拟器），进入应用宝扫码页自动在本机拉起服务，开关可手动启停；修复非 arm64 设备启动报『仅支持 arm64 设备』以及前端吞掉真实错误信息的问题，启动失败时现在会展示设备ABI与服务日志尾部",
        "修复APK内置服务插件未注册报『\"YybService\" plugin is not implemented on android』：Capacitor 5+ 要求 registerPlugin 在 super.onCreate 之前调用，原顺序导致桥接初始化后注册被忽略；同时为两个本地插件新增 ProGuard 保留规则，防止 release 包 R8 裁剪 @PluginMethod 反射调用的方法",
        "修复APK内置服务无法解析域名导致二维码获取失败（lookup open.weixin.qq.com on [::1]:53 connection refused）：Android 系统没有 /etc/resolv.conf，纯 Go 二进制 DNS 回退到本机 53 端口被拒绝；现检测到 resolv.conf 缺失时自动启用内置公共 DNS 解析器（223.5.5.5/119.29.29.29/8.8.8.8 依次尝试），Windows/macOS 不受影响",
        "修复EXE版微信扫码约10秒误判过期自动刷新：微信长轮询 wx_errcode=408 是服务端挂起约15秒的正常等待响应，EXE版无 XHR 5秒超时真实收到408被误判为二维码失效；现408仅继续轮询，仅本地300秒超时才触发自动刷新（最多1次）",
        "定时任务不上线时段跳过日志去重：处于不上线时段时调度器每10秒打印一次『跳过执行』日志（一分钟6条刷屏）；现每次触发仅记录1条",
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
