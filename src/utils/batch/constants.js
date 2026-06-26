/**
 * 批量日常任务常量配置
 */

// 宝箱类型选项
export const boxTypeOptions = [
  { label: "木质宝箱", value: 2001 },
  { label: "青铜宝箱", value: 2002 },
  { label: "黄金宝箱", value: 2003 },
  { label: "铂金宝箱", value: 2004 },
  { label: "钻石宝箱", value: 2005 },
];

// 鱼竿类型选项
export const fishTypeOptions = [
  { label: "普通鱼竿", value: 1 },
  { label: "黄金鱼竿", value: 2 },
];

// 阵容选项
export const formationOptions = [1, 2, 3, 4, 5, 6].map((v) => ({
  label: `阵容${v}`,
  value: v,
}));

// BOSS次数选项
export const bossTimesOptions = [0, 1, 2, 3, 4].map((v) => ({
  label: `${v}次`,
  value: v,
}));

// 每日BOSS次数选项
export const dailyBossTimesOptions = [0, 1, 2, 3, 4, 5].map((v) => ({
  label: `${v}次`,
  value: v,
}));

// 可用的定时任务列表
export const availableTasks = [
  { label: "日常任务", value: "startBatch" },
  { label: "领取挂机", value: "claimHangUpRewards" },
  { label: "一键加钟", value: "batchAddHangUpTime" },
  { label: "重置罐子", value: "resetBottles" },
  { label: "一键领取罐子", value: "batchlingguanzi" },
  { label: "一键爬塔", value: "climbTower" },
  { label: "一键爬怪异塔", value: "climbWeirdTower" },
  { label: "一键答题", value: "batchStudy" },
  { label: "智能发车", value: "batchSmartSendCar" },
  { label: "一键收车", value: "batchClaimCars" },
  { label: "升级改装", value: "batchCarResearchUpgrade" },
  { label: "批量开箱", value: "batchOpenBox" },
  { label: "一键宝箱周开箱", value: "batchOpenBoxByPoints" },
  { label: "一键开钻石宝箱", value: "batchOpenDiamondBox" },
  { label: "一键开碎片礼包", value: "batchOpenFragmentPacks" },
  { label: "宝箱达标奖励自选大奖", value: "batchClaimBoxWeeklyRewards" },
  { label: "领取宝箱积分", value: "batchClaimBoxPointReward" },
  { label: "批量钓鱼", value: "batchFish" },
  { label: "批量招募", value: "batchRecruit" },
  { label: "一键宝库前3层", value: "batchbaoku13" },
  { label: "一键宝库4,5层", value: "batchbaoku45" },
  { label: "一键梦境", value: "batchmengjing" },
  { label: "一键俱乐部签到", value: "batchclubsign" },
  { label: "一键竞技场战斗3次", value: "batcharenafight" },
  { label: "一键钓鱼补齐", value: "batchTopUpFish" },
  { label: "一键竞技场补齐", value: "batchTopUpArena" },
  { label: "一键领取怪异塔免费道具", value: "batchClaimFreeEnergy" },
  { label: "领取怪异塔宝箱目标特权", value: "claim_weird_tower_all" },
  { label: "领取怪异塔通行证", value: "claim_weird_tower_pass" },
  { label: "一键换皮闯关", value: "skinChallenge" },
  { label: "一键换皮寻宝", value: "skinTreasure" },
  { label: "一键购买四圣碎片", value: "legion_storebuygoods" },
  { label: "一键购买俱乐部5皮肤币", value: "legionStoreBuySkinCoins" },
  { label: "黑市周购买", value: "weekly_market_buy" },
  { label: "黑市周免费礼包", value: "weekly_market_free_gift" },
  { label: "免费礼包领取", value: "claim_recruit_welfare" },
  { label: "一键黑市采购", value: "store_purchase" },
  { label: "黑市多选购买", value: "manual_buy" },
  { label: "积分好礼领取", value: "charge_claimaddup_rewards" },
  { label: "一键购买青铜宝箱", value: "store_buy_bronze" },
  { label: "一键购买铂金宝箱", value: "store_buy_platinum" },
  { label: "一键购买黄金鱼竿", value: "store_buy_gold_rod" },
  { label: "一键购买彩玉", value: "store_buy_jade" },
  { label: "购买顶级鱼竿包", value: "buy_top_rod_package" },
  { label: "购买特级灵贝包", value: "buy_super_spirit_shell" },
  { label: "免费领取珍宝阁", value: "collection_claimfreereward" },
  { label: "免费扭蛋", value: "gacha_drawreward" },
  { label: "开启残卷挂机", value: "batchLegacyHangup" },
  { label: "批量领取功法残卷", value: "batchLegacyClaim" },
  { label: "批量赠送功法残卷", value: "batchLegacyGiftSendEnhanced" },
  { label: "领取残卷赠送奖励", value: "batchLegacyClaimGiftTask" },
  { label: "英雄四圣升级", value: "openHeroFourSaintsModal" },
  { label: "一键英雄升星", value: "batchHeroUpgrade" },
  { label: "一键领取英雄图鉴", value: "batchBookUpgrade" },
  { label: "一键鱼灵升星", value: "batchFishUpgrade" },
  { label: "一键领取宠物图鉴", value: "batchClaimStarRewards" },
  { label: "橱窗咸将激活", value: "batchCollectionActivate" },
  { label: "一键使用怪异塔道具", value: "batchUseItems" },
  { label: "一键怪异塔合成", value: "batchMergeItems" },
  { label: "一键领取蟠桃园任务", value: "batchClaimPeachTasks" },
  { label: "一键扫荡灯神", value: "batchGenieSweep" },
  { label: "使用斑点蛋", value: "use_spotted_egg" },
  { label: "宠物领取图鉴奖励", value: "claim_pet_book" },
  { label: "宠物合成", value: "batch_pet_merge" },
  { label: "宠物一键升级", value: "batch_pet_upgrade" },
  { label: "一键购买梦境商品", value: "batchBuyDreamItems" },
  { label: "一键购买5次红玉", value: "legion_buy_red_jade" },
  { label: "一键购买斑点蛋", value: "legion_buy_spotted_egg" },
  { label: "盐晶商店购买", value: "salt_crystal_shop_buy" },
  { label: "盐锭商店购买", value: "salt_ingot_shop_buy" },
  { label: "十殿阎罗挑战", value: "batchNightmareChallengePresets" },
  { label: "十殿抽奖", value: "nightmare_draw_lottery" },
  { label: "十殿抽奖达标奖励", value: "nightmare_claim_book_reward" },
  { label: "星级抽奖", value: "star_drawturntable" },
  { label: "十殿星级挑战", value: "batch_star_challenge" },
  { label: "预约直播", value: "pkroom_appoint" },
  { label: "领取助威币", value: "claim_guess_coin" },
  { label: "助威商店多选购买", value: "legion_buy_store_items" },
  { label: "邮箱领取与清理", value: "batch_mail_claim_and_cleanup" },
  { label: "消耗活动", value: "batchConsumeActivity" },
  { label: "领取消耗活动道具", value: "batchClaimConsumeRewards" },
  { label: "挥鼓助威消耗", value: "batchAutumnUseItem" },
  { label: "使用消耗活动道具", value: "batchUseActivityItem" },
  { label: "兑换码领取", value: "batchClaimCdkReward" },
  { label: "消耗活动兑换购买", value: "batchActivityExchange" },
  { label: "领取竞技大厅道具", value: "batchClaimApexRewards" },
];

// 黑市商品列表
export const storeGoodsList = [
  { id: 1, name: "青铜宝箱" },
  { id: 2, name: "黄金宝箱" },
  { id: 3, name: "铂金宝箱" },
  { id: 4, name: "进阶石" },
  { id: 5, name: "精铁" },
  { id: 6, name: "招募令" },
  { id: 7, name: "随机红将碎片" },
  { id: 8, name: "随机橙将碎片" },
  { id: 9, name: "随机紫将碎片" },
  { id: 10, name: "梦魇晶石" },
  { id: 11, name: "普通鱼竿" },
  { id: 12, name: "黄金鱼竿" },
  { id: 13, name: "咸神门票" },
  { id: 14, name: "白玉" },
  { id: 15, name: "彩玉" },
  { id: 16, name: "扳手" },
];

// 车辆研究消耗表
export const CarresearchItem = [
  20,
  21,
  22,
  23,
  24,
  26,
  28,
  30,
  32,
  34,
  36,
  38,
  40,
  42,
  44,
  47,
  50,
  53,
  56,
  59,
  62,
  65,
  68,
  71,
  74,
  78,
  82,
  86,
  90,
  94,
  99,
  104,
  109,
  114,
  119,
  126,
  133,
  140,
  147,
  154,
  163,
  172,
  181,
  190,
  199,
  210,
  221,
  232,
  243,
  369,
  393,
  422,
  457,
  498,
  548,
  607,
  678,
  763,
  865,
  1011,
];

// 月度任务目标
export const FISH_TARGET = 320;
export const ARENA_TARGET = 240;

// 任务表列配置
export const taskColumns = [
  { title: "任务名称", key: "name", width: 150 },
  { title: "运行类型", key: "runType", width: 100 },
  {
    title: "运行时间",
    key: "runTime",
    width: 150,
    render: (row) => {
      return row.runType === "daily" ? row.runTime : row.cronExpression;
    },
  },
  {
    title: "选中账号",
    key: "selectedTokens",
    width: 150,
    render: (row) => `${row.selectedTokens.length} 个`,
  },
  {
    title: "选中任务",
    key: "selectedTasks",
    width: 150,
    render: (row) => `${row.selectedTasks.length} 个`,
  },
  {
    title: "状态",
    key: "enabled",
    width: 80,
    render: (row) => (row.enabled ? "启用" : "禁用"),
  },
  { title: "操作", key: "actions", width: 150 },
];

// 默认设置
export const defaultSettings = {
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

// 默认批量设置
export const defaultBatchSettings = {
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  receiverId: "",
  password: "",
  useGoldRefreshFallback: false,
  tokenListColumns: 4,
  commandDelay: 1000,
  taskDelay: 1000,
  actionDelay: 1000,
  battleDelay: 1500,
  refreshDelay: 1500,
  longDelay: 5000,
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 30000,
  reconnectDelay: 5000,
  maxLogEntries: 1000,
  // 智能发车阈值设置
  smartDepartureEnabled: true,
  smartDepartureGoldThreshold: 0,
  smartDepartureRecruitThreshold: 0,
  smartDepartureJadeThreshold: 0,
  smartDepartureTicketThreshold: 0,
  smartDepartureMatchAll: false,
  // 功能模块延迟配置(ms)
  moduleDelays: {
    daily: 800,         // 日常任务（签到、邮件、挂机等）
    arena: 1000,        // 竞技场
    tower: 1500,        // 爬塔/怪异塔
    store: 500,         // 黑市/商店购买
    treasure: 1500,     // 宝库/梦境
    activity: 2000,     // 消耗活动
    club: 1500,         // 俱乐部
    hero: 1000,         // 英雄/鱼灵/宠物升级
    bottle: 500,        // 罐子（重置/领取）
    hangup: 500,        // 挂机/签到/答题
    default: 800,       // 默认（未分类的功能）
  },
  manualBuyItems: [],   // 黑市多选购买配置
  // 高级配置
  defaultCommandTimeout: 5000,      // 默认命令超时时间(ms)
  battleCommandTimeout: 12000,      // 战斗命令超时时间(ms)
  defaultRetryCount: 2,             // 默认重试次数
  retryDelay: 10000,                // 重试延迟(ms)
  accountRetryInterval: 5000,       // 账号间重试间隔(ms)
};

// 默认模板
export const defaultTemplate = {
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

// 默认任务表单
export const defaultTaskForm = {
  name: "",
  runType: "daily",
  runTime: undefined,
  cronExpression: "",
  selectedTokens: [],
  selectedTasks: [],
  enabled: true,
};

// 默认助手设置
export const defaultHelperSettings = {
  boxType: 2001,
  fishType: 1,
  count: 100,
};

// ==================== 超时配置 (默认值) ====================
export const TIMEOUT_CONFIG = {
  /** 默认命令超时时间 (ms) */
  DEFAULT_COMMAND: 5000,

  /** 爬塔战斗超时时间 (ms) */
  TOWER_FIGHT: 12000,

  /** 获取角色信息超时时间 (ms) */
  ROLE_INFO: 10000,

  /** 连接超时时间 (ms) */
  CONNECTION: 30000,

  /** 短操作超时时间 (ms) */
  SHORT_OPERATION: 3000,
};

// ==================== 重试配置 (默认值) ====================
export const RETRY_CONFIG = {
  /** 默认重试次数 */
  DEFAULT_COUNT: 2,

  /** 最大重试次数 */
  MAX_COUNT: 5,

  /** 默认重试延迟 (ms) */
  DEFAULT_DELAY: 10000,

  /** 最大重试延迟 (ms) - 3分钟 */
  MAX_DELAY: 180000,

  /** 账号间重试间隔 (ms) */
  ACCOUNT_INTERVAL: 5000,

  /** 指数退避基数 (ms) */
  EXPONENTIAL_BASE: 3000,
};

// ==================== 延迟配置 (默认值) ====================
export const DELAY_CONFIG = {
  /** 命令间延迟 (ms) */
  COMMAND: 1000,

  /** 任务间延迟 (ms) */
  TASK: 1000,

  /** 一般操作延迟 (ms) */
  ACTION: 1000,

  /** 战斗延迟 (ms) */
  BATTLE: 1500,

  /** 刷新延迟 (ms) */
  REFRESH: 1500,

  /** 长延迟 (ms) */
  LONG: 5000,
};
