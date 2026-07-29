
// Import required dependencies
import {
  ref,
  computed,
  nextTick,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  h,
} from "vue";
import { useTokenStore, gameTokens, tokenGroups } from "@/stores/tokenStore";
import { useRouter, useRoute } from "vue-router";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings, AddCircleOutline, CheckmarkCircleOutline, CloseCircleOutline, ListOutline, CloudDownloadOutline, CloudUploadOutline, SearchOutline, DocumentTextOutline, CreateOutline, TrashOutline, SettingsOutline, PlayOutline, Add, CopyOutline } from "@vicons/ionicons5";
import { getFirstSaturdayOfMonth, getLastSaturday } from "@/utils/clubBattleUtils";
import TokenCard from "@/components/TokenCard.vue";
import useIndexedDB from "@/hooks/useIndexedDB";
import { storage } from "@/utils/crossPlatformStorage";
import sponsorQrcode from "@/assets/sponsor-qrcode.png";

// Import Token导入表单组件（用于添加Token弹窗）
import ManualTokenForm from "@/views/TokenImport/manual.vue";
import UrlTokenForm from "@/views/TokenImport/url.vue";
import BinTokenForm from "@/views/TokenImport/bin.vue";
import SingleBinTokenForm from "@/views/TokenImport/singlebin.vue";
import WxQrcodeForm from "@/views/TokenImport/wxqrcode.vue";
import NightmareChallengeCard from "@/components/cards/NightmareChallengeCard.vue";
import StarTeamCard from "@/components/cards/StarTeamCard.vue";
import ConsumeActivityCard from "@/components/cards/ConsumeActivityCard.vue";
import { NightmareAutoBattleService } from "@/utils/nightmareAutoBattle";

// Import batch task modules
import {
  // Constants
  boxTypeOptions,
  fishTypeOptions,
  formationOptions,
  bossTimesOptions,
  dailyBossTimesOptions,
  availableTasks,
  CarresearchItem,
  FISH_TARGET,
  ARENA_TARGET,
  taskColumns,
  defaultSettings,
  defaultBatchSettings,
  defaultTemplate,
  defaultTaskForm,
  defaultHelperSettings,
  // Cron utilities
  validateCronField,
  validateCronExpression,
  parseCronField,
  calculateNextRuns,
  calculateNextExecutionTime,
  formatTimeDifference,
  matchesCronExpression,
  // Connection manager
  createConnectionManager,
  getActivityStatus,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  pickArenaTargetId,
  // Log utilities
  createLogManager,
  addTaskSaveLog,
  // Car utilities
  normalizeCars,
  gradeLabel,
  isBigPrize,
  countRacingRefreshTickets,
  shouldSendCar,
  canClaim,
  // Task factories
  createTasksHangUp,
  createTasksBottle,
  createTasksTower,
  createTasksCar,
  createTasksItem,
  createTasksDungeon,
  createTasksArena,
  createTasksStore,
  createTasksLegacy,
} from "@/utils/batch";
import { getModuleDelay, loadDelayGroups, saveDelayGroups, DELAY_GROUPS, DELAY_GROUP_LABELS, DELAY_GROUP_DESCRIPTIONS, DELAY_GROUP_MODULES, MODULE_DELAY_GROUP_MAP } from "@/utils/batch/delayManager";


import { downloadFile } from "@/utils/imageExport";
import { saveBinBackup, getBinBackupWithFallback } from "@/utils/binBackup";
import { wakeLockManager } from "@/utils/wakeLock";
import { WebSocketPool } from "@/utils/WebSocketPool";

// Refs for file input elements
const importScheduledTasksInput = ref(null);
const importAccountConfigInput = ref(null);
const importFullConfigInput = ref(null);

import { merchantConfig, goldItemsConfig } from "@/utils/dreamConstants";

// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const message = useMessage();
const router = useRouter();
const route = useRoute();
const { storeArrayBuffer: storeArrayBufferToDB, getArrayBuffer: getArrayBufferFromDB } = useIndexedDB();

// 排序配置（从localStorage读取，与TokenImport共享）
const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 排序字段：name, server, createdAt, lastUsed
        direction: "asc", // 排序方向：asc, desc
      },
);

// 自定义Token排序
const tokenOrder = ref([]);

// 加载保存的Token排序
const loadSavedTokenOrder = async () => {
  tokenOrder.value = await loadTokenOrder();
};

// 计算属性 - 从gameData中获取塔相关信息
const evoTowerInfo = computed(() => {
  const data = tokenStore.gameData?.evoTowerInfo || null;
  return data;
});

const weirdTowerData = computed(() => {
  return evoTowerInfo.value?.evoTower || null;
});

const currentTowerId = computed(() => {
  return weirdTowerData.value?.towerId || 0;
});

const towerEnergy = computed(() => {
  return weirdTowerData.value?.energy || 0;
});

// 排序后的游戏角色Token列表
const sortedTokens = computed(() => {
  let tokens = [...tokenStore.gameTokens];
  
  // 搜索过滤
  if (tokenSearchKeyword.value.trim()) {
    const keyword = tokenSearchKeyword.value.trim().toLowerCase();
    tokens = tokens.filter(token => 
      token.name?.toLowerCase().includes(keyword) ||
      token.server?.toLowerCase().includes(keyword) ||
      token.id?.toLowerCase().includes(keyword)
    );
  }
  
  // 检查是否有自定义排序
  const customOrder = tokenOrder.value;
  if (customOrder && customOrder.length > 0) {
    // 应用自定义排序
    tokens.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      
      // 如果两个token都在自定义排序中，按照自定义顺序
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // 如果只有a在自定义排序中，a排前面
      if (indexA !== -1) return -1;
      
      // 如果只有b在自定义排序中，b排前面
      if (indexB !== -1) return 1;
      
      // 都不在自定义排序中，按名称排序
      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // 使用默认排序
    tokens = tokens.sort((tokenA, tokenB) => {
      let valueA, valueB;

      // 根据排序字段获取比较值
      switch (sortConfig.value.field) {
        case "name":
          valueA = tokenA.name?.toLowerCase() || "";
          valueB = tokenB.name?.toLowerCase() || "";
          break;
        case "server":
          valueA = tokenA.server?.toLowerCase() || "";
          valueB = tokenB.server?.toLowerCase() || "";
          break;
        case "createdAt":
          valueA = new Date(tokenA.createdAt || 0).getTime();
          valueB = new Date(tokenB.createdAt || 0).getTime();
          break;
        case "lastUsed":
          valueA = new Date(tokenA.lastUsed || 0).getTime();
          valueB = new Date(tokenB.lastUsed || 0).getTime();
          break;
        case "monthly":
          // 月度排序：根据竞技场和钓鱼的未完成进度排序
          // 未完成进度越多（距离目标越远）越靠前
          const gameDataA = tokenStore.getTokenGameData(tokenA.id);
          const gameDataB = tokenStore.getTokenGameData(tokenB.id);
          const monthDataA = gameDataA?.monthActivity;
          const monthDataB = gameDataB?.monthActivity;
          
          // 计算月度未完成进度
          const calculateMonthlyNeed = (data) => {
            if (!data) return 999999; // 无数据的排最后
            
            const FISH_TARGET = 320;
            const ARENA_TARGET = 240;
            
            // 获取当前进度
            const myMonthInfo = data.myMonthInfo || {};
            const myArenaInfo = data.myArenaInfo || {};
            const fishNum = Number(myMonthInfo?.["2"]?.num || 0);
            const arenaNum = Number(myArenaInfo?.num || 0);
            
            // 计算当前应该完成的进度（根据日期比例）
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const dayOfMonth = now.getDate();
            const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
            const monthProgress = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
            
            // 应该完成的次数
            const fishShouldBe = remainingDays === 0 ? FISH_TARGET : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
            const arenaShouldBe = remainingDays === 0 ? ARENA_TARGET : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
            
            // 计算未完成次数
            const fishNeed = Math.max(0, fishShouldBe - fishNum);
            const arenaNeed = Math.max(0, arenaShouldBe - arenaNum);
            
            // 返回总未完成次数（钓鱼 + 竞技场）
            return fishNeed + arenaNeed;
          };
          
          valueA = calculateMonthlyNeed(monthDataA);
          valueB = calculateMonthlyNeed(monthDataB);
          break;
        default:
          valueA = tokenA.name?.toLowerCase() || "";
          valueB = tokenB.name?.toLowerCase() || "";
      }

      // 根据排序方向比较值
      if (valueA < valueB) {
        return sortConfig.value.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.value.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  
  // ✅ 选中分组的账号自动排序到前面（最高优先级）
  const selectedGroupIds = selectedGroups.value;
  if (selectedGroupIds && selectedGroupIds.length > 0) {
    // 收集所有选中分组中的token ID
    const selectedGroupTokenIds = new Set();
    selectedGroupIds.forEach(groupId => {
      const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
      validTokenIds.forEach(id => selectedGroupTokenIds.add(id));
    });
    
    // 排序：选中分组的账号在前，其他账号在后
    tokens.sort((a, b) => {
      const aInSelectedGroup = selectedGroupTokenIds.has(a.id);
      const bInSelectedGroup = selectedGroupTokenIds.has(b.id);
      
      // 如果a在选中分组中，b不在，a排前面
      if (aInSelectedGroup && !bInSelectedGroup) return -1;
      // 如果b在选中分组中，a不在，b排前面
      if (!aInSelectedGroup && bInSelectedGroup) return 1;
      // 都在或都不在选中分组中，保持原有顺序（已应用的排序）
      return 0;
    });
  }
  
  return tokens;
});

// 分组管理弹窗中账号搜索过滤
const filteredGroupTokens = computed(() => {
  if (!groupTokenSearch.value.trim()) return sortedTokens.value;
  // 支持多关键词搜索（空格或逗号分隔），精准匹配（完整名称或完整片段匹配）
  const keywords = groupTokenSearch.value.trim().split(/[,，\s]+/).filter(k => k.length > 0).map(k => k.toLowerCase());
  if (keywords.length === 0) return sortedTokens.value;
  return sortedTokens.value.filter(token => {
    const name = token.name?.toLowerCase() || '';
    const server = token.server?.toLowerCase() || '';
    const id = token.id?.toLowerCase() || '';
    return keywords.some(kw => {
      // 精准匹配：完整名称相等，或按分隔符拆分后某一段完全匹配
      if (name === kw || server === kw || id === kw) return true;
      // 按常见分隔符拆分后精准匹配每一段
      const nameParts = name.split(/[_\-\s、,，]+/);
      const serverParts = server.split(/[_\-\s、,，]+/);
      return nameParts.some(p => p === kw) || serverParts.some(p => p === kw);
    });
  });
});

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction =
      sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 如果点击的是新的排序字段，则默认升序
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // ✅ 清除自定义排序，让按钮排序生效
  if (tokenOrder.value && tokenOrder.value.length > 0) {
    tokenOrder.value = [];
    // 清除保存的自定义排序
    localStorage.removeItem('tokenOrder');
  }

  // 保存排序设置到localStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

// 获取排序图标
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) return null;
  return sortConfig.value.direction === "asc" ? "↑" : "↓";
};

const tokens = computed(() => tokenStore.gameTokens);

// 响应式时间引用，每30秒更新一次，确保computed属性能正确响应时间变化
const currentTime = ref(new Date());
let currentTimeTimer = null;

// 时间检查函数直接使用 new Date()，确保每次调用都获取实时时间
const checkCarActivityOpen = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 1=Mon, 2=Tue, 3=Wed; 6点之后
  return day >= 1 && day <= 3 && hour >= 6;
};

const checkMengjingActivityOpen = () => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
};

const checkBaokuActivityOpen = () => {
  const day = new Date().getDay();
  return day != 1 && day != 2;
};

// 保留computed用于UI显示，但任务执行时使用函数
const isCarActivityOpen = computed(() => checkCarActivityOpen());
const ismengjingActivityOpen = computed(() => checkMengjingActivityOpen());
const isbaokuActivityOpen = computed(() => checkBaokuActivityOpen());
// 直接使用 new Date()，不依赖响应式 ref，避免 computed 缓存导致时间判断失效
const checkArenaActivityOpen = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
};

// 保留computed用于UI显示，但任务执行时使用函数
const isarenaActivityOpen = computed(() => {
  return checkArenaActivityOpen();
});
const getCurrentActivityWeek = computed(() => {
  const now = currentTime.value;
  const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
  const cycleDuration = 3 * weekDuration; // 三周期毫秒数

  const elapsed = now - start;
  if (elapsed < 0) return null; // 活动开始前

  const cyclePosition = elapsed % cycleDuration;

  if (cyclePosition < weekDuration) {
    return "黑市周";
  } else if (cyclePosition < 2 * weekDuration) {
    return "招募周";
  } else {
    return "宝箱周";
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  // ✅ 直接使用周期计算，不依赖 getCurrentActivityWeek（避免周期边界误判）
  const now = currentTime.value;
  const start = new Date("2025-12-12T12:00:00"); // 黑市周参考起点：周五 12:00
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cycleMs = 3 * weekMs;

  const elapsed = now - start;
  if (elapsed < 0) return false;

  // 1. 检查是否在3周循环的黑市周周期内
  const cyclePosition = elapsed % cycleMs;
  if (cyclePosition >= weekMs) return false; // 招募周或宝箱周

  // 2. 检查是否在黑市周间歇期（周五 00:00-11:59）
  // 黑市周从周五 12:00 开始，到下周四周 23:59 结束
  // 周五 00:00-11:59 是间歇期（新周期的第一天但活动尚未开启）
  const day = now.getDay();
  if (day === 5) {
    const hour = now.getHours();
    if (hour < 12) return false; // 周五 12:00 前是间歇期
  }

  return true;
});

// 黑市周活动时间状态提示
const weirdTowerActivityStatus = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  
  if (currentWeek !== "黑市周") {
    return `当前是${currentWeek}，黑市周购买功能未开放`;
  }
  
  if (isWeirdTowerActivityOpen.value) {
    return "黑市周购买功能开放中";
  }
  
  return "黑市周购买功能暂时关闭（每周五11:00-12:00为切换时间）";
});

// 招募周开放判断（免费礼包领取按钮 - 包含所有周的礼包）
const isRecruitActivityOpen = computed(() => {
  // 免费礼包领取包含：招募周、黑市周、宝箱周、周一免费礼
  // 所以在任何活动周都应该可以领取
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "招募周" || currentWeek === "黑市周" || currentWeek === "宝箱周";
});

// 宝箱周开放判断（一键宝箱周开箱、宝箱达标奖励自选大奖）
const isBoxWeeklyActivityOpen = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "宝箱周";
});

// 功法残卷限制判断（28天赛季周期，新赛季中午12:00开启，赛季日00:00-12:00禁止领取和赠送）
const SEASON_REFERENCE_DATE = new Date(2026, 0, 16); // 第1赛季开始日期（2026年1月16日12:00）
const isLegacyRestricted = computed(() => {
  const now = currentTime.value;
  const hour = now.getHours();
  
  // 12:00 之后赛季已开启，不限制
  if (hour >= 12) return false;
  
  // 计算距离参考赛季日的天数
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - SEASON_REFERENCE_DATE.getTime();
  const daysSinceRef = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  // 处理负数取模（JavaScript % 对负数返回负值）
  const daysMod = ((daysSinceRef % 28) + 28) % 28;
  
  // 赛季日当天（余数为0）且 00:00-12:00 之间
  return daysMod === 0;
});

// 获取本月第四个周日的日期
const getFourthSundayOfMonth = () => {
  const now = currentTime.value;
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 当月第一天
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0-6
  
  // 计算第一个周日的日期 (1号是周日则为1，否则为 1 + 7 - dayOfWeek)
  let firstSundayDate = 1 + (7 - dayOfWeek) % 7;

  // 仅针对2026年3月进行特殊处理
  if (year === 2026 && month === 2 && dayOfWeek === 0) {
    firstSundayDate = 8;
  }
  
  // 第四个周日 = 第一个周日 + 21天
  return new Date(year, month, firstSundayDate + 21);
};

const isWarGuessActivityOpen = computed(() => {
  const now = currentTime.value;
  
  // 手动修正：2026年3月1日开放
  if (now.getFullYear() === 2026 && now.getMonth() === 2 && now.getDate() === 1) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 19 || (hour === 19 && minute <= 55)) return true;
  }

  const fourthSunday = getFourthSundayOfMonth();
  
  // 检查是否是今天
  if (now.getDate() !== fourthSunday.getDate()) return false;
  
  // 检查时间 00:00 - 19:55
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > 19 || (hour === 19 && minute > 55)) return false;
  
  return true;
});

const warGuessActivityTip = computed(() => {
  if (isWarGuessActivityOpen.value) return "";
  
  const fourthSunday = getFourthSundayOfMonth();
  const month = fourthSunday.getMonth() + 1;
  const date = fourthSunday.getDate();
  return `月赛助威仅在每月第四个周日 (${month}月${date}日) 00:00-19:55 开放`;
});

const selectedTokens = ref([]);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' | 'waiting_retry' }
const tokenFailReasons = ref({}); // { tokenId: '失败原因' }，用于追踪每个账号的失败原因
const isRunning = ref(false);
const shouldStop = ref(false);
const shouldRefreshAfterTask = ref(false); // 标记是否需要在任务完成后刷新页面

// =====================
// Token分组管理状态
// =====================
const showGroupManageModal = ref(false);
const showGroupSelectModal = ref(false);
const selectedGroups = ref([]); // 选中的分组ID列表
const newGroupName = ref("");
const newGroupColor = ref("#1677ff");
const newGroupSelectedTokens = ref([]); // 新建分组时选中的Token ID列表
const groupTokenSearch = ref(""); // 分组管理账号搜索关键词
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const taskScheduleSelectedGroupIds = ref([]); // 定时任务中通过分组按钮选中的分组ID列表
const batchDeleteSelectedGroupIds = ref([]); // 分组管理弹窗中批量删除选中的分组ID列表
const groupColors = [
  "#1677ff", // 蓝色
  "#52c41a", // 绿色
  "#faad14", // 橙色
  "#f5222d", // 红色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#eb2f96", // 粉色
  "#fa8c16", // 赤红色
];

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);
const currentGuessCount = ref(0);

// ======================
// SaltCup Bet Feature (比赛竞猜)
// ======================
const showSaltCupBetModal = ref(false);
const saltCupMatchList = ref([]);
const saltCupBetLoading = ref(false);

// ======================
// Apex Cheering Feature (竞技大厅助威)
// ======================
const showApexCheerModal = ref(false);
const apexVoteList = ref([]);
const apexCheerLoading = ref(false);
const apexVoteCount = ref(0); // 0 = 全部赠送
const maxApexVoteCount = ref(0); // 当前助威币数量（从 apex_getroleinfo 获取）
const selectedApexTeamId = ref(null);
const selectedApexRound = ref(1); // 场次选择（1-7）
const selectedApexGroupId = ref(1); // 分组选择（1-32）
const apexClubSearch = ref(''); // 俱乐部搜索关键词

// 分组切换时自动刷新俱乐部列表
watch(selectedApexGroupId, () => {
  if (showApexCheerModal.value && !apexClubSearch.value.trim()) {
    fetchApexVoteList();
  }
});

// 搜索关键词变化时，跨所有分组搜索
let apexSearchTimer = null;
watch(apexClubSearch, (newVal) => {
  if (!showApexCheerModal.value) return;
  clearTimeout(apexSearchTimer);
  if (newVal.trim()) {
    // 有搜索关键词时，跨所有分组搜索
    apexSearchTimer = setTimeout(() => {
      fetchApexVoteList(true);
    }, 500);
  } else {
    // 清空搜索时，恢复当前分组数据
    apexSearchTimer = setTimeout(() => {
      fetchApexVoteList(false);
    }, 300);
  }
});

// 弹窗关闭时释放连接槽（处理点击X按钮关闭的情况）
watch(showApexCheerModal, (newVal) => {
  if (!newVal) {
    for (const tokenId of selectedTokens.value) {
      tokenStore.closeWebSocketConnection(tokenId);
    }
  }
});

// 搜索过滤后的俱乐部列表
const filteredApexVoteList = computed(() => {
  const keyword = apexClubSearch.value.trim().toLowerCase();
  if (!keyword) return apexVoteList.value;
  return apexVoteList.value.filter(item => 
    item.name.toLowerCase().includes(keyword) || item.teamId.toLowerCase().includes(keyword)
  );
});

// 列定义
const apexVoteColumns = [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'teamId', width: 150 },
  { title: '头像', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '36px', height: '36px', borderRadius: '4px' } });
  }, width: 80 },
  { title: '队伍名称', key: 'name', width: 150 },
  { title: '战力', key: 'power', width: 140, render(row) {
      return h('div', null, [formatPower(row.power)]);
    }},
  { title: '已获助力', key: 'cheerCnt', width: 120, render(row) {
      return h('div', null, [(row.cheerCnt || 0).toLocaleString()]);
    }},
];

// 助威商店
const showLegionStoreModal = ref(false);
const legionStoreSelections = ref({
  7: { selected: false, count: 1, maxCount: 1, disabled: false },   // 随机红将碎片
  8: { selected: false, count: 1, maxCount: 1, disabled: false },   // 白玉
  9: { selected: false, count: 1, maxCount: 1, disabled: false },   // 军团币
  10: { selected: false, count: 20, maxCount: 20, disabled: false }, // 进阶石
  11: { selected: false, count: 20, maxCount: 20, disabled: false }, // 精铁
});

// 消耗活动兑换商店
const showActivityExchangeModal = ref(false);
const activityExchangeSelections = ref({
  1:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '惊雷' },
  2:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '月华' },
  3:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '回响' },
  4:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '琴心公' },
  5:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '琴心母' },
  6:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '璇玑' },
  7:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '剑胆公' },
  8:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '剑胆母' },
  9:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '阵容编组' },
  10: { selected: false, count: 30, maxCount: 30, disabled: false, name: '珍珠' },
  11: { selected: false, count: 200, maxCount: 200, disabled: false, name: '万能红将碎片' },
  12: { selected: false, count: 200, maxCount: 200, disabled: false, name: '随机红将碎片' },
  13: { selected: false, count: 999, maxCount: 999, disabled: false, name: '白玉' },
  14: { selected: false, count: 999, maxCount: 999, disabled: false, name: '精铁' },
});

const openActivityExchangeModal = () => {
  showActivityExchangeModal.value = true;
};

const handleActivityExchangeCountChange = (suffix) => {
  const item = activityExchangeSelections.value[suffix];
  if (item.count > item.maxCount) item.count = item.maxCount;
  if (item.count < 1) item.count = 1;
  // 限购1次的商品不允许修改次数
  if (item.maxCount === 1) item.count = 1;
};

const handleActivityExchangeBuy = async () => {
  const selectedSuffixes = [];
  const buyCounts = {};
  Object.keys(activityExchangeSelections.value).forEach(key => {
    const item = activityExchangeSelections.value[key];
    if (item.selected) {
      const suffix = parseInt(key);
      selectedSuffixes.push(suffix);
      buyCounts[suffix] = item.count;
    }
  });
  if (selectedSuffixes.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  showActivityExchangeModal.value = false;
  await batchActivityExchange(selectedSuffixes, buyCounts);
};

const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "亿";
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "万";
  }
  return power.toString();
};

const warGuessColumns = [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'id', width: 100 },
  { title: '头像', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '30px', height: '30px', borderRadius: '50%' } });
  }, width: 60 },
  { title: '区服', key: 'serverId', width: 80 },
  { title: '俱乐部', key: 'name', width: 120 },
  { title: '战力', key: 'power', render(row) {
    return formatPower(row.power);
  }, width: 100 },
  { title: '红淬', key: 'quenchNum' },
  { title: '已助威', key: 'guessNum' },
  { title: '总热度', key: 'totalNum',render(row) {
    return formatPower(row.totalNum || 0);
  }, width: 100 },
];

const warGuessRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedWarGuessLegionId.value = row.id;
    },
  };
};

// Apex Cheer 相关函数
const apexVoteRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedApexTeamId.value = row.teamId;
    },
  };
};

const openApexCheerModal = async () => {
  showApexCheerModal.value = true;
  // 先获取列表，再获取助威币数量（避免同时创建连接导致锁冲突）
  await fetchApexVoteList();
  await getMaxApexVoteCount();
};

const closeApexCheerModal = () => {
  // 关闭弹窗时释放所有账号的连接槽
  for (const tokenId of selectedTokens.value) {
    tokenStore.closeWebSocketConnection(tokenId);
  }
  showApexCheerModal.value = false;
};

const fetchApexVoteList = async (fetchAllGroups = false) => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取竞技大厅列表");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  apexCheerLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: fetchAllGroups
        ? `正在使用 ${token.name} 跨所有分组搜索竞技大厅...`
        : `正在使用 ${token.name} 获取竞技大厅助威列表...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 正在连接中，请稍候...`,
        type: "info",
      });
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败，请检查Token是否有效`);
      }
    }

    let allResults = [];

    if (fetchAllGroups) {
      // 跨所有32个分组搜索
      for (let gid = 1; gid <= 32; gid++) {
        try {
          const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getvotelist", { groupId: gid, idx: 0, round: selectedApexRound.value }, 10000);
          if (response && response.apexVoteList) {
            allResults = allResults.concat(response.apexVoteList);
          }
        } catch (e) {
          console.warn(`获取第${gid}组数据失败:`, e.message);
        }
      }
    } else {
      // 只获取当前分组
      const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getvotelist", { groupId: selectedApexGroupId.value, idx: 0, round: selectedApexRound.value }, 10000);
      if (response && response.apexVoteList) {
        allResults = response.apexVoteList;
      }
    }
    
    if (allResults.length > 0) {
      apexVoteList.value = allResults
        .filter(item => !item.isOut)
        .sort((a, b) => (b.cheerCnt || 0) - (a.cheerCnt || 0));
      
      if (fetchAllGroups && apexVoteList.value.length === 0) {
        message.info("所有分组中均未找到可助威队伍");
      }
    } else {
      message.warning("获取竞技大厅列表为空");
      apexVoteList.value = [];
    }
  } catch (error) {
    console.error("Fetch apex vote list error:", error);
    message.error("获取竞技大厅列表失败：" + error.message);
  } finally {
    apexCheerLoading.value = false;
  }
};

// 获取助威币数量（通过 apex_getroleinfo）
const getMaxApexVoteCount = async () => {
  if (selectedTokens.value.length === 0) return;

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在获取 ${token.name} 的助威币数量...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败，请检查Token是否有效`);
      }
    }

    // 发送请求获取角色信息
    const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getroleinfo", {}, 10000);
    
    if (response && response.apexRoleInfo) {
      maxApexVoteCount.value = response.apexRoleInfo.voteItemCnt || 0;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `当前助威币数量：${maxApexVoteCount.value}`,
        type: "info",
      });
    } else {
      maxApexVoteCount.value = 0;
    }
  } catch (error) {
    console.error("Get max vote count error:", error);
    maxApexVoteCount.value = 0;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取助威币数量失败：${error.message}`,
      type: "error",
    });
  }
};

const applyApexVote = async () => {
  if (!selectedApexTeamId.value) {
    message.warning("请先选择一个队伍");
    return;
  }

  const isAllVote = apexVoteCount.value === 0;

  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    
    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接超时，跳过`,
          type: "error",
        });
        continue;
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接失败，跳过`,
          type: "error",
        });
        continue;
      }
    }

    try {
      let voteCnt = apexVoteCount.value;

      // 全部赠送：先获取该账号的助威币数量
      if (isAllVote) {
        const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "apex_getroleinfo", {}, 10000);
        if (roleInfo && roleInfo.apexRoleInfo) {
          voteCnt = roleInfo.apexRoleInfo.voteItemCnt || 0;
        }
        if (voteCnt <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 助威币不足，跳过`,
            type: "warning",
          });
          continue;
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 助威币：${voteCnt}，全部赠送`,
          type: "info",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 对队伍 ${selectedApexTeamId.value} 赠送 ${voteCnt} 次...`,
          type: "info",
        });
      }

      // 发送助威请求
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "apex_vote",
        {
          teamId: selectedApexTeamId.value,
          groupId: selectedApexGroupId.value,
          round: selectedApexRound.value,
          voteCnt: voteCnt,
        },
        10000
      );

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ✅ 助威成功！赠送 ${voteCnt} 次`,
        type: "success",
      });

      await new Promise(r => setTimeout(r, 500)); // 防止限流
    } catch (error) {
      let errMsg = error.message || '';
      if (errMsg.includes('物品数量不足')) {
        errMsg = errMsg.replace('物品数量不足', '棒槌道具数量不足');
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ❌ 助威失败：${errMsg}`,
        type: "error",
      });
    }
  }

  // 关闭所有账号的连接，释放连接槽
  for (const tokenId of selectedTokens.value) {
    tokenStore.closeWebSocketConnection(tokenId);
  }

  // 关闭弹窗
  showApexCheerModal.value = false;
  message.success(`所有账号助威完成`);
};

// ======================
// Apex Guess Feature (竞技大厅竞猜)
// ======================
const showApexGuessModal = ref(false);
const apexGuessLoading = ref(false);
const apexGuessClaimLoading = ref(false);
const apexGuessScheduleId = ref(21); // 场次ID：海选8场、预选4场、正赛7场（32强=21，64强=20）
const apexGuessMatchList = ref([]);

// 弹窗关闭时断开连接，释放连接槽
watch(showApexGuessModal, (visible) => {
  if (!visible) {
    for (const tokenId of selectedTokens.value) {
      tokenStore.closeWebSocketConnection(tokenId);
    }
  }
});

const openApexGuessModal = () => {
  apexGuessMatchList.value = [];
  showApexGuessModal.value = true;
  fetchApexGuessList();
};

// 确保指定账号已连接
const ensureApexGuessConnection = async (tokenId, token) => {
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status === "connected") return true;
  if (status !== "connecting") {
    await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
  }
  let retries = 0;
  while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
    await new Promise(r => setTimeout(r, 1000));
    retries++;
  }
  return tokenStore.getWebSocketStatus(tokenId) === "connected";
};

// 从响应中提取队伍列表（字段名不确定，按 teamId 特征扫描）
const extractApexGuessTeams = (resp) => {
  if (!resp || typeof resp !== "object") return [];
  for (const value of Object.values(resp)) {
    if (Array.isArray(value) && value.length > 0 && value.every(item => item && typeof item === "object" && item.teamId)) {
      return value;
    }
  }
  // 兼容对象形式（键值 map）
  for (const value of Object.values(resp)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const items = Object.values(value);
      if (items.length > 0 && items.every(item => item && typeof item === "object" && item.teamId)) {
        return items;
      }
    }
  }
  return [];
};

// 分页收集指定场次的全部队伍（idx 从 0 开始每次 +5，直到 last=true）
const collectApexGuessTeams = async (tokenId, scheduleId) => {
  const teams = [];
  let idx = 0;
  for (let page = 0; page < 40; page++) {
    const resp = await tokenStore.sendMessageWithPromise(
      tokenId,
      "apex_getguesslist",
      { scheduleId, idx },
      10000
    );
    const list = extractApexGuessTeams(resp);
    teams.push(...list);
    if (!resp || resp.last === true || list.length === 0) break;
    idx += 5;
  }
  return teams;
};

// 获取对阵列表（使用第一个选中账号）
const fetchApexGuessList = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取竞猜列表");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  apexGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取场次 ${apexGuessScheduleId.value} 的竞猜对阵列表...`,
      type: "info",
    });

    if (!(await ensureApexGuessConnection(tokenId, token))) {
      throw new Error(`连接 ${token.name} 失败，请检查Token是否有效`);
    }

    const teams = await collectApexGuessTeams(tokenId, apexGuessScheduleId.value);

    if (teams.length === 0) {
      message.warning("获取竞猜对阵列表为空，请确认场次ID是否正确");
      apexGuessMatchList.value = [];
      return;
    }

    // 按顺序两两配对为一场对决
    const matches = [];
    for (let i = 0; i + 1 < teams.length; i += 2) {
      matches.push({ left: teams[i], right: teams[i + 1] });
    }
    if (teams.length % 2 !== 0) {
      message.warning(`队伍数量为奇数（${teams.length}），最后一支队伍无法配对`);
    }
    apexGuessMatchList.value = matches;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ 获取到 ${teams.length} 支队伍，共 ${matches.length} 场对决`,
      type: "success",
    });
  } catch (error) {
    console.error("Fetch apex guess list error:", error);
    message.error("获取竞猜对阵列表失败：" + error.message);
  } finally {
    apexGuessLoading.value = false;
  }
};

// 对所有选中账号执行竞猜（二选一）
const handleApexGuess = async (team) => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择账号");
    return;
  }

  const teamName = team.name || team.teamId;
  let successCount = 0;

  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      if (!(await ensureApexGuessConnection(tokenId, token))) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接失败，跳过竞猜`,
          type: "error",
        });
        continue;
      }

      await tokenStore.sendMessageWithPromise(
        tokenId,
        "apex_guess",
        { teamId: team.teamId },
        10000
      );

      successCount++;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ✅ 竞猜成功：押 ${teamName} 获胜`,
        type: "success",
      });

      await new Promise(r => setTimeout(r, 500)); // 防止限流
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ❌ 竞猜失败：${error.message}`,
        type: "error",
      });
    }
  }

  message.success(`竞猜完成：${successCount}/${selectedTokens.value.length} 个账号押 ${teamName} 获胜`);
};

// 领取上一场竞猜奖励：对上一场所有队伍依次尝试 apex_guessclaim，忽略失败，只要有一个成功即算成功
const claimApexGuessRewards = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择账号");
    return;
  }

  const prevScheduleId = apexGuessScheduleId.value - 1;
  if (prevScheduleId < 1) {
    message.warning("当前场次没有上一场");
    return;
  }

  apexGuessClaimLoading.value = true;
  try {
    // 用第一个账号收集上一场全部队伍
    const firstTokenId = selectedTokens.value[0];
    const firstToken = tokens.value.find(t => t.id === firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在获取场次 ${prevScheduleId} 的队伍列表用于领取奖励...`,
      type: "info",
    });

    if (!(await ensureApexGuessConnection(firstTokenId, firstToken))) {
      throw new Error(`连接 ${firstToken.name} 失败，请检查Token是否有效`);
    }

    const teams = await collectApexGuessTeams(firstTokenId, prevScheduleId);
    if (teams.length === 0) {
      message.warning(`场次 ${prevScheduleId} 队伍列表为空，无法领取奖励`);
      return;
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `场次 ${prevScheduleId} 共 ${teams.length} 支队伍，开始逐账号领取奖励...`,
      type: "info",
    });

    let successAccounts = 0;

    for (const tokenId of selectedTokens.value) {
      const token = tokens.value.find(t => t.id === tokenId);
      if (!token) continue;

      if (!(await ensureApexGuessConnection(tokenId, token))) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接失败，跳过领奖`,
          type: "error",
        });
        continue;
      }

      let claimed = false;
      for (const team of teams) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "apex_guessclaim",
            { scheduleId: prevScheduleId, teamId: team.teamId },
            10000
          );
          claimed = true; // 只要有一个成功即算成功
        } catch (e) {
          // 忽略错误（未竞猜该队伍/已领取等），继续尝试下一支队伍
        }
        await new Promise(r => setTimeout(r, 200));
      }

      if (claimed) {
        successAccounts++;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ✅ 场次 ${prevScheduleId} 竞猜奖励领取成功`,
          type: "success",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ⚠️ 场次 ${prevScheduleId} 无可领取的竞猜奖励`,
          type: "warning",
        });
      }

      await new Promise(r => setTimeout(r, 500)); // 防止限流
    }

    message.success(`领奖完成：${successAccounts}/${selectedTokens.value.length} 个账号领取成功`);
  } catch (error) {
    console.error("Claim apex guess rewards error:", error);
    message.error("领取竞猜奖励失败：" + error.message);
  } finally {
    apexGuessClaimLoading.value = false;
  }
};

// ======================
// SaltRoad Cheering Feature (天宫助威)
// ======================
const showSaltRoadCheerModal = ref(false);
const saltRoadOpponentList = ref([]);
const saltRoadCheerLoading = ref(false);
const saltRoadPhase = ref('');
const saltRoadPhaseInput = ref(''); // 用户输入的phase，留空则自动获取
const saltRoadVoteCount = ref(1);
const selectedSaltRoadBattlefieldId = ref(null);
const selectedSaltRoadGroupId = ref(null); // 选择的 groupId
const selectedSaltRoadSideValue = ref(null); // 1=leftLegion, 2=rightLegion
const selectedSaltRoadWinSid = ref(null); // 实际的 winSid

const saltRoadRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedSaltRoadBattlefieldId.value = row.battlefieldId;
    },
  };
};

const onSaltRoadRowSelect = (keys) => {
  selectedSaltRoadBattlefieldId.value = keys[0] || null;
  // 选中对阵后默认左军
  if (keys[0] && !selectedSaltRoadSideValue.value) {
    selectedSaltRoadSideValue.value = 1;
    // 找到对应数据，设置 winSid
    const row = saltRoadOpponentList.value.find(r => r.groupId === keys[0]);
    if (row && row.leftLegion?.id) {
      selectedSaltRoadWinSid.value = row.leftLegion.id;
    }
  }
};

// 列定义
const saltRoadOpponentColumns = [
  { type: 'selection', multiple: false },
  { title: '组别', key: 'groupId', width: 70 },
  {
    title: '左军', key: 'leftLegion', width: 280,
    render(row) {
      const leg = row.leftLegion;
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('img', { src: leg?.logo || '', style: { width: '32px', height: '32px', borderRadius: '4px' } }),
        h('div', null, [
          h('div', { style: 'font-weight: bold;' }, leg?.name || '-'),
          h('div', { style: 'font-size: 12px; color: #888;' }, `战力: ${formatPower(leg?.power || 0)}`),
        ]),
      ]);
    }
  },
  {
    title: '助威方向', key: 'side', width: 140,
    render(row) {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h('button', {
          style: selectedSaltRoadBattlefieldId.value === row.battlefieldId && selectedSaltRoadSideValue.value === 1
            ? 'padding: 4px 12px; background: #18a058; color: white; border: none; border-radius: 4px; cursor: pointer;'
            : 'padding: 4px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;',
          onClick: (e) => {
            e.stopPropagation();
            selectedSaltRoadBattlefieldId.value = row.battlefieldId;
            selectedSaltRoadGroupId.value = row.groupId;
            selectedSaltRoadSideValue.value = 1;
            selectedSaltRoadWinSid.value = row.leftLegion?.id || null;
          }
        }, '← 左军'),
        h('button', {
          style: selectedSaltRoadBattlefieldId.value === row.battlefieldId && selectedSaltRoadSideValue.value === 2
            ? 'padding: 4px 12px; background: #2080f0; color: white; border: none; border-radius: 4px; cursor: pointer;'
            : 'padding: 4px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;',
          onClick: (e) => {
            e.stopPropagation();
            selectedSaltRoadBattlefieldId.value = row.battlefieldId;
            selectedSaltRoadGroupId.value = row.groupId;
            selectedSaltRoadSideValue.value = 2;
            selectedSaltRoadWinSid.value = row.rightLegion?.id || null;
          }
        }, '右军 →'),
      ]);
    }
  },
  {
    title: '右军', key: 'rightLegion', width: 280,
    render(row) {
      const leg = row.rightLegion;
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('img', { src: leg?.logo || '', style: { width: '32px', height: '32px', borderRadius: '4px' } }),
        h('div', null, [
          h('div', { style: 'font-weight: bold;' }, leg?.name || '-'),
          h('div', { style: 'font-size: 12px; color: #888;' }, `战力: ${formatPower(leg?.power || 0)}`),
        ]),
      ]);
    }
  },
];

const openSaltRoadCheerModal = async () => {
  showSaltRoadCheerModal.value = true;
  selectedSaltRoadBattlefieldId.value = null;
  selectedSaltRoadGroupId.value = null;
  selectedSaltRoadSideValue.value = null;
  selectedSaltRoadWinSid.value = null;
  saltRoadOpponentList.value = [];
  await fetchSaltRoadOpponents();
};

const closeSaltRoadCheerModal = () => {
  for (const tokenId of selectedTokens.value) {
    tokenStore.closeWebSocketConnection(tokenId);
  }
  showSaltRoadCheerModal.value = false;
};

const fetchSaltRoadOpponents = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  saltRoadCheerLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取天宫助威对阵列表...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败`);
      }
    }

    // 获取 phase 参数
    let phase = saltRoadPhaseInput.value.trim();
    
    // 如果没有手动输入 phase，先尝试通过 saltroad_getwartype 自动获取
    if (!phase) {
      try {
        const firstSaturday = getFirstSaturdayOfMonth();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `正在获取当前盐战信息 (date=${firstSaturday})...`,
          type: "info",
        });
        const warTypeResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getwartype", { date: firstSaturday }, 10000);
        if (warTypeResp) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `盐战信息: ${JSON.stringify(warTypeResp).substring(0, 300)}`,
            type: "info",
          });
          // 尝试从响应中提取 phase/date 信息
          if (warTypeResp.phase) {
            phase = String(warTypeResp.phase);
          } else if (warTypeResp.date) {
            phase = String(warTypeResp.date);
          } else if (warTypeResp.currentPhase) {
            phase = String(warTypeResp.currentPhase);
          }
        }
      } catch (e) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `获取盐战信息失败: ${e.message}，继续尝试直接获取对阵...`,
          type: "warning",
        });
      }
    }

    // 如果仍然没有 phase，使用上周六的日期 (YYMMDD格式) 作为兜底
    if (!phase) {
      const lastSat = getLastSaturday(); // YYYY/MM/DD
      // 转换为 YYMMDD 格式
      const parts = lastSat.split('/');
      if (parts.length === 3) {
        phase = parts[0].slice(2) + parts[1] + parts[2];
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `使用兜底 phase: ${phase} (上周六: ${lastSat})`,
        type: "info",
      });
    }

    const requestParams = { phase };
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `请求参数: ${JSON.stringify(requestParams)}`,
      type: "info",
    });

    const response = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getoutopponent", requestParams, 10000);
    if (response && response.opponentList) {
      saltRoadPhase.value = response.phase || '';
      saltRoadOpponentList.value = response.opponentList.map(item => ({
        battlefieldId: item.battlefieldId,
        groupId: item.groupId,
        winSid: item.winSid,
        leftLegion: item.leftLegion,
        rightLegion: item.rightLegion,
      }));
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `获取到 ${saltRoadOpponentList.value.length} 场对阵`,
        type: "success",
      });
    } else {
      message.warning("获取对阵列表为空");
      saltRoadOpponentList.value = [];
    }
  } catch (error) {
    console.error("Fetch saltroad opponents error:", error);
    message.error("获取对阵列表失败：" + error.message);
  } finally {
    saltRoadCheerLoading.value = false;
  }
};

const applySaltRoadCheer = async () => {
  if (!selectedSaltRoadSideValue.value) {
    message.warning("请选择助威方向（左军/右军）");
    return;
  }

  // 调用批量助威任务（自动获取 phase 和对阵列表）
  await batchSaltRoadCheer(selectedSaltRoadSideValue.value, saltRoadVoteCount.value);

  // 关闭弹窗
  closeSaltRoadCheerModal();
};

// 弹窗关闭时释放连接槽
watch(showSaltRoadCheerModal, (newVal) => {
  if (!newVal) {
    for (const tokenId of selectedTokens.value) {
      tokenStore.closeWebSocketConnection(tokenId);
    }
  }
});

const getRemainingTimeText = () => {
  // 剩余时间文本（月度任务类似的逻辑）
  // 这里可以计算距离月底/月底的具体时间
  return "-";
};

const getSelectedTeamName = () => {
  const team = apexVoteList.value.find(item => item.teamId === selectedApexTeamId.value);
  return team ? `${team.name} (战力：${formatPower(team.power)})` : '未知';
};



const openWarGuessModal = () => {
  showWarGuessModal.value = true;
  // Reset selection
  selectedWarGuessLegionId.value = null;
  warGuessList.value = [];
  
  // Auto fetch if tokens selected
  if (selectedTokens.value.length > 0) {
      fetchWarGuessRank();
  }
};

// 打开助威商店弹窗
const openLegionStoreModal = () => {
  showLegionStoreModal.value = true;
  // 重置选择
  Object.keys(legionStoreSelections.value).forEach(key => {
    legionStoreSelections.value[key].selected = false;
    legionStoreSelections.value[key].disabled = false;
    // 恢复默认购买次数
    if (key === '10' || key === '11') {
      legionStoreSelections.value[key].count = 20;
    } else {
      legionStoreSelections.value[key].count = 1;
    }
  });
};

// 处理助威商店购买次数变化
const handleLegionStoreCountChange = (itemId) => {
  const item = legionStoreSelections.value[itemId];
  
  // 限购1次的商品（7、8、9）
  const limitedItems = [7, 8, 9];
  
  // 如果任何商品的购买次数 > 1，则禁用所有限购1次的商品
  let hasCountOverOne = false;
  Object.keys(legionStoreSelections.value).forEach(key => {
    if (legionStoreSelections.value[key].count > 1) {
      hasCountOverOne = true;
    }
  });
  
  if (hasCountOverOne) {
    // 禁用限购1次的商品
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = true;
      // 如果被禁用的商品已被勾选，则取消勾选
      if (legionStoreSelections.value[id].selected) {
        legionStoreSelections.value[id].selected = false;
      }
    });
    
    // 如果当前修改的是限购1次的商品，提示用户
    if (limitedItems.includes(itemId)) {
      message.warning("当前物品限购1次，无法购买2次");
      // 重置次数为1
      item.count = 1;
    }
  } else {
    // 恢复启用
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = false;
    });
  }
};

// 处理助威商店购买
const handleLegionStoreBuy = async () => {
  // 收集选中的商品
  const selectedItems = [];
  const buyCounts = {};
  
  Object.keys(legionStoreSelections.value).forEach(key => {
    const item = legionStoreSelections.value[key];
    if (item.selected) {
      selectedItems.push(parseInt(key));
      buyCounts[parseInt(key)] = item.count;
    }
  });
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 关闭弹窗
  showLegionStoreModal.value = false;
  
  // 调用购买函数
  await legion_buy_store_items(selectedItems, buyCounts);
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取月赛助威数据");
    return;
  }
  
  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);
  
  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取月赛助威数据...`,
      type: "info",
    });
    
    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
        tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
        await new Promise(r => setTimeout(r, 2000)); // Wait for connection
    }
    
    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(tokenId, "warguess_getrank", { bfId: '' }, 5000);
    
    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }
      
      // Sort by totalNum desc
      warGuessList.value = list.sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0)).slice(0, 20);
    } else {
      message.warning("获取月赛助威数据为空");
    }
    
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error("获取月赛助威数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取月赛助威数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
    if (!selectedWarGuessLegionId.value) {
        message.warning("请先选择一个俱乐部");
        return;
    }
    // Close modal
    showWarGuessModal.value = false;
    // Call the batch function
    await batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value);
    
    
};

// SaltCup Bet Functions (比赛竞猜)
const openSaltCupBetModal = async () => {
  showSaltCupBetModal.value = true;
  saltCupMatchList.value = [];
  await fetchSaltCupBetData();
};

const fetchSaltCupBetData = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取竞猜数据");
    return;
  }
  
  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);
  
  saltCupBetLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取比赛竞猜数据...`,
      type: "info",
    });
    
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    const res = await tokenStore.sendMessageWithPromise(tokenId, "SaltCup26_GetBetInfo", {}, 5000);
    
    if (res && res.matchList) {
      const matchList = Array.isArray(res.matchList) ? res.matchList : Object.values(res.matchList);
      const betRecord = res.roleData?.betRecord || {};
      
      // 解析已下注记录，扁平化为 matchId -> record
      const betRecordMap = {};
      for (const scheduleId of Object.keys(betRecord)) {
        const scheduleMap = betRecord[scheduleId];
        for (const matchId of Object.keys(scheduleMap)) {
          const record = scheduleMap[matchId];
          if (record && record.betTime > 0) {
            betRecordMap[matchId] = record;
          }
        }
      }
      
      saltCupMatchList.value = matchList.map(match => {
        // 计算双方总战力
        const leftTotalPower = (match.leftRole?.starList || []).reduce((sum, star) => sum + (star.power || 0), 0);
        const rightTotalPower = (match.rightRole?.starList || []).reduce((sum, star) => sum + (star.power || 0), 0);
        return {
          matchId: match.matchId,
          leftRole: match.leftRole,
          rightRole: match.rightRole,
          leftTotalPower,
          rightTotalPower,
          betRecord: betRecordMap[match.matchId] || null,
        };
      });
    } else {
      message.warning("获取竞猜数据为空");
    }
  } catch (error) {
    console.error("Fetch saltcup bet error:", error);
    message.error("获取竞猜数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取竞猜数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    saltCupBetLoading.value = false;
  }
};

const handleSaltCupBet = async (matchId, pick) => {
  showSaltCupBetModal.value = false;
  await batchSaltCupBet(matchId, pick);
};

// 预设护卫成员状态（账号单独设置弹窗）
const settingsHelperLoading = ref(false);
const settingsHelperMembers = ref([]);

// 黑市采购清单区块折叠状态（默认收起）
const purchaseListCollapsed = ref(true);

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 十殿阵容
  saltFieldPeachFormation: 1, // 盐场蟠桃阵容
  bossTimes: 2,
  dailyBossTimes: 3,
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
  legacyGiftPassword: '', // 功法赠送验证密码
  helperPresets: [], // 智能发车预设护卫成员
});

// Task Template State
const showTaskTemplateModal = ref(false);
const showApplyTemplateModal = ref(false);
const showTemplateManagerModal = ref(false);
const showAccountTemplateModal = ref(false);
const taskTemplates = ref([]);
const selectedTemplateId = ref(null);
const selectedTokensForApply = ref([]);
const currentTemplateName = ref("");
const currentTemplateId = ref(null); // 用于编辑现有模板
const currentTemplate = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 十殿阵容
  saltFieldPeachFormation: 1, // 盐场蟠桃阵容
  bossTimes: 2,
  dailyBossTimes: 3,
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
  legacyGiftPassword: '', // 新增: 功法赠送验证密码
});

// Account Template References
const accountTemplateReferences = ref([]);
const filteredAccountTemplates = ref([]);
const selectedTemplateForFilter = ref(null);

// Computed for Apply Template
const isAllSelectedForApply = computed(() => {
  return (
    selectedTokensForApply.value.length === sortedTokens.value.length &&
    sortedTokens.value.length > 0
  );
});

const isIndeterminateForApply = computed(() => {
  return (
    selectedTokensForApply.value.length > 0 &&
    selectedTokensForApply.value.length < sortedTokens.value.length
  );
});

// Computed for Template Manager
const templateSearchKeyword = ref("");
const filteredTaskTemplates = computed(() => {
  if (!templateSearchKeyword.value) {
    return taskTemplates.value;
  }
  const keyword = templateSearchKeyword.value.toLowerCase();
  return taskTemplates.value.filter(template => 
    template.name.toLowerCase().includes(keyword)
  );
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 小于1小时显示“刚刚”
  if (diff < 3600000) {
    return "刚刚";
  }
  // 小于24小时显示“x小时前”
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  // 小于7天显示“x天前”
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }
  // 否则显示完整日期
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

// Helper Modal State
const showHelperModal = ref(false);
const showConsumeModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetRounds: 1,  // 目标轮数（1-4轮）
  weeklyMarketItems: [],  // 黑市周购买的商品列表
  fragmentPackItems: [],  // 选中的碎片礼包 itemId 数组
  cdkCode: '',  // 兑换码
  cheerQty: 0,  // 挥鼓助威数量，0=全部
});

const helperModalTitle = computed(() => {
  const titles = { box: "批量开宝箱", fish: "批量钓鱼", recruit: "批量招募", pointsBox: "一键宝箱周开箱", weeklyMarket: "黑市周购买", fragmentPack: "碎片礼包选择", cdk: "兑换码领取", cheer: "挥鼓助威消耗" };
  return titles[helperType.value] || "批量助手";
});

// 英雄四圣升级 Modal State
const showHeroFourSaintsModal = ref(false);
const selectedHeroSingle = ref(null);  // 单选英雄

const heroOptions = [
  { label: "司马懿", value: 101 },
  { label: "关羽", value: 103 },
  { label: "诸葛亮", value: 104 },
  { label: "周瑜", value: 105 },
  { label: "太史慈", value: 106 },
  { label: "吕布", value: 107 },
  { label: "甄姬", value: 109 },
  { label: "孙策", value: 111 },
  { label: "贾诩", value: 112 },
  { label: "曹仁", value: 113 },
  { label: "姜维", value: 114 },
  { label: "公孙瓒", value: 116 },
  { label: "典韦", value: 117 },
  { label: "超云", value: 118 },
  { label: "张角", value: 120 },
  { label: "鲁肃", value: 121 },
];

const openHeroFourSaintsModal = () => {
  selectedHeroSingle.value = null;
  showHeroFourSaintsModal.value = true;
};

// 盐晶商店 Modal State
const showSaltCrystalShopModal = ref(false);

const openSaltCrystalShopModal = () => {
  // 初始化 _checked 状态
  saltCrystalShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showSaltCrystalShopModal.value = true;
};

const executeSaltCrystalShopBuy = () => {
  showSaltCrystalShopModal.value = false;
  salt_crystal_shop_buy();
};

// 盐锭商店 Modal State
const showSaltIngotShopModal = ref(false);

const openSaltIngotShopModal = () => {
  saltIngotShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showSaltIngotShopModal.value = true;
};

const executeSaltIngotShopBuy = () => {
  showSaltIngotShopModal.value = false;
  salt_ingot_shop_buy();
};

const executeHeroFourSaintsUpgrade = () => {
  if (!selectedHeroSingle.value) {
    message.warning("请选择一个英雄");
    return;
  }
  showHeroFourSaintsModal.value = false;
  heroFourSaintsUpgrade([selectedHeroSingle.value]);
};

// 宝箱周自选大奖 Modal State
const showBoxWeeklyRewardModal = ref(false);
const selectedBoxWeeklyRewards = ref([5]);  // 默认选择珍珠
const boxWeeklyRewardCounts = ref({ 5: 1 });  // 每个奖励的领取次数

const boxWeeklyRewardOptions = [
  { label: "万能红将碎片", value: 0 },
  { label: "梦魇晶石", value: 1 },
  { label: "精铁", value: 2 },
  { label: "进阶石", value: 3 },
  { label: "扳手", value: 4 },
  { label: "珍珠", value: 5 },
];

// 黑市周商品选项
const weeklyMarketItemOptions = [
  { label: "免费金砖", value: "0" },
  { label: "黑市见面礼", value: "1" },
  { label: "黑市惊喜礼", value: "2" },
  { label: "初级黑市包", value: "3" },
  { label: "中级黑市包", value: "4" },
  { label: "高级黑市包", value: "5" },
  { label: "顶级鱼竿包", value: "6" },
  { label: "白玉黑市包", value: "7" },
  { label: "特级灵贝包", value: "8" },
  { label: "养成补给包", value: "9" },
];

// 助威商店商品选项
const legionStoreItemOptions = [
  { label: "随机红将碎片", value: "7", min: 1, max: 1 },
  { label: "白玉", value: "8", min: 1, max: 1 },
  { label: "军团币", value: "9", min: 1, max: 1 },
  { label: "进阶石", value: "10", min: 1, max: 20 },
  { label: "精铁", value: "11", min: 1, max: 20 },
];

// 消耗活动兑换商店商品选项
const activityExchangeItemOptions = [
  { name: '惊雷', suffix: 1, maxCount: 1 },
  { name: '月华', suffix: 2, maxCount: 1 },
  { name: '回响', suffix: 3, maxCount: 1 },
  { name: '琴心公', suffix: 4, maxCount: 1 },
  { name: '琴心母', suffix: 5, maxCount: 1 },
  { name: '璇玑', suffix: 6, maxCount: 1 },
  { name: '剑胆公', suffix: 7, maxCount: 1 },
  { name: '剑胆母', suffix: 8, maxCount: 1 },
  { name: '阵容编组', suffix: 9, maxCount: 1 },
  { name: '珍珠', suffix: 10, maxCount: 30 },
  { name: '万能红将碎片', suffix: 11, maxCount: 200 },
  { name: '随机红将碎片', suffix: 12, maxCount: 200 },
  { name: '白玉', suffix: 13, maxCount: 999 },
  { name: '精铁', suffix: 14, maxCount: 999 },
];

// 盐晶商店商品选项
const saltCrystalShopItemOptions = [
  { label: "四圣蓝玉", value: "201", min: 1, max: 60 },
  { label: "四圣红玉", value: "202", min: 1, max: 50 },
  { label: "成长脆饼", value: "203", min: 1, max: 60 },
  { label: "幻彩灵果", value: "204", min: 1, max: 60 },
  { label: "斑点蛋", value: "205", min: 1, max: 5 },
];

// 黑市多选购买商品选项
const manualBuyItemOptions = [
  { label: "青铜宝箱", value: "1" },
  { label: "黄金宝箱", value: "2" },
  { label: "铂金宝箱", value: "3" },
  { label: "进阶石", value: "4" },
  { label: "精铁", value: "5" },
  { label: "招募令", value: "6" },
  { label: "随机红将碎片", value: "7" },
  { label: "随机橙将碎片", value: "8" },
  { label: "随机紫将碎片", value: "9" },
  { label: "梦魇晶石", value: "10" },
  { label: "普通鱼竿", value: "11" },
  { label: "黄金鱼竿", value: "12" },
  { label: "咸神门票", value: "13" },
  { label: "白玉", value: "14" },
  { label: "彩玉", value: "15" },
  { label: "扳手", value: "16" },
];

// 盐锭商店商品选项
const saltIngotShopItemOptions = [
  { label: "皮肤币", value: "1", min: 1, max: 5 },
  { label: "军团币", value: "2", min: 1, max: 1 },
  { label: "进阶石", value: "3", min: 1, max: 1 },
  { label: "精铁", value: "4", min: 1, max: 1 },
  { label: "白玉", value: "5", min: 1, max: 1 },
  { label: "四圣宝珠碎片", value: "6", min: 1, max: 1 },
];

// 十殿预设选项（从 localStorage 加载）
const nightmarePresetOptions = computed(() => {
  try {
    const raw = localStorage.getItem('nightmare-presets');
    const presets = raw ? JSON.parse(raw) : [];
    return presets.map(p => ({
      id: p.id,
      name: p.name || '未命名预设',
      captainTokenId: p.captainTokenId,
      memberTokenIds: p.memberTokenIds || [],
      captainName: tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '未知',
      totalMembers: (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length,
    }));
  } catch {
    return [];
  }
});

// 勾选/取消十殿预设时，自动同步对应账号到 selectedTokens
const onNightmarePresetToggle = (preset, checked) => {
  if (checked) {
    if (!taskForm.nightmarePresetIds.includes(preset.id)) {
      taskForm.nightmarePresetIds.push(preset.id);
    }
    // 自动勾选队长和队员到账号列表
    const allIds = [preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean);
    for (const tid of allIds) {
      if (!taskForm.selectedTokens.includes(tid)) {
        taskForm.selectedTokens.push(tid);
      }
    }
  } else {
    taskForm.nightmarePresetIds = taskForm.nightmarePresetIds.filter(id => id !== preset.id);
    // 收集该预设的所有 token ID
    const removeIds = new Set([preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean));
    // 检查这些 token 是否被其他已勾选的预设引用
    const usedByOtherPresets = new Set();
    for (const pid of taskForm.nightmarePresetIds) {
      const p = nightmarePresetOptions.value.find(opt => opt.id === pid);
      if (p) {
        [p.captainTokenId, ...p.memberTokenIds].filter(Boolean).forEach(id => usedByOtherPresets.add(id));
      }
    }
    // 只移除不被其他预设使用的 token
    for (const tid of removeIds) {
      if (!usedByOtherPresets.has(tid)) {
        taskForm.selectedTokens = taskForm.selectedTokens.filter(id => id !== tid);
      }
    }
  }
};

// 计算总次数
const totalBoxWeeklyRewardCount = computed(() => {
  let total = 0;
  selectedBoxWeeklyRewards.value.forEach(rewardIndex => {
    total += boxWeeklyRewardCounts.value[rewardIndex] || 1;
  });
  return total;
});

const toggleBoxWeeklyReward = (rewardIndex, checked) => {
  if (checked) {
    if (!selectedBoxWeeklyRewards.value.includes(rewardIndex)) {
      selectedBoxWeeklyRewards.value.push(rewardIndex);
      if (!boxWeeklyRewardCounts.value[rewardIndex]) {
        boxWeeklyRewardCounts.value[rewardIndex] = 1;
      }
    }
  } else {
    const index = selectedBoxWeeklyRewards.value.indexOf(rewardIndex);
    if (index > -1) {
      selectedBoxWeeklyRewards.value.splice(index, 1);
      delete boxWeeklyRewardCounts.value[rewardIndex];
    }
  }
};

const openBoxWeeklyRewardModal = () => {
  selectedBoxWeeklyRewards.value = [5];  // 重置为默认选择珍珠
  boxWeeklyRewardCounts.value = { 5: 1 };  // 重置次数
  showBoxWeeklyRewardModal.value = true;
};

const executeBoxWeeklyRewards = () => {
  if (selectedBoxWeeklyRewards.value.length === 0) {
    message.warning("请至少选择一个奖励");
    return;
  }
  if (totalBoxWeeklyRewardCount.value > 4) {
    message.warning("总计最多只能领取4次");
    return;
  }
  
  // 构建奖励配置：{ rewardIndex: count }
  const rewardConfig = {};
  selectedBoxWeeklyRewards.value.forEach(rewardIndex => {
    rewardConfig[rewardIndex] = boxWeeklyRewardCounts.value[rewardIndex] || 1;
  });
  
  showBoxWeeklyRewardModal.value = false;
  batchClaimBoxWeeklyRewards(rewardConfig);
};

// 定时任务中的宝箱自选大奖配置
const totalTaskBoxWeeklyRewardCount = computed(() => {
  let total = 0;
  Object.values(taskForm.boxWeeklyRewards).forEach(count => {
    total += count;
  });
  return total;
});

const toggleTaskBoxWeeklyReward = (rewardIndex, checked) => {
  if (checked) {
    if (!taskForm.boxWeeklyRewards[rewardIndex] || taskForm.boxWeeklyRewards[rewardIndex] === 0) {
      taskForm.boxWeeklyRewards[rewardIndex] = 1;
    }
  } else {
    taskForm.boxWeeklyRewards[rewardIndex] = 0;
    delete taskForm.boxWeeklyRewards[rewardIndex];
  }
};

// Batch Settings State
const showBatchSettingsModal = ref(false);



const defaultDreamPurchaseList = [];
for (const merchantId in goldItemsConfig) {
  goldItemsConfig[merchantId].forEach((index) => {
    defaultDreamPurchaseList.push(`${merchantId}-${index}`);
  });
}

const batchSettings = reactive({
  dreamPurchaseList: defaultDreamPurchaseList,
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  targetBoxRounds: 1,  // 定时按积分开箱目标轮数（每轮8000分，最多4轮）
  receiverId: "",
  tokenListColumns: 4,  // 默认4列
  autoColumns: true,    // 默认启用自动列数
  useGoldRefreshFallback: false,
  // 延迟配置（毫秒） - 保留用于向后兼容
  commandDelay: 1000,       // 命令间延迟
  taskDelay: 1000,          // 任务间延迟
  dailySubtaskDelay: 300,   // 日常任务子任务间延迟（同模块内每个子任务完成后的等待）
  rewardClaimDelay: 3000,   // 奖励领取间延迟（日常奖励、周常奖励等领取操作间的等待）
  actionDelay: 1000,        // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 1500,        // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1500,       // 刷新延迟（发车刷新等）
  longDelay: 5000,          // 长延迟（功法赠送等）
  taskIntervalWait: 0,      // 定时任务中每完成一个任务后的等待时间(秒)，0为不等待
  batchIntervalWait: 5,     // 定时任务中每完成一批账号后的等待时间(秒)，默认5秒，0为不等待
  // 单账号智能加速配置
  singleAccountSpeedUp: true,          // 是否启用单账号自动加速（总开关）
  singleAccountMultiplier: 0.2,        // 单账号延迟倍率（0.2=原延迟的20%，即加速5倍）
  singleAccountMode: false,            // 运行时标志（不持久化，由执行逻辑自动设置）
  // 功能模块延迟分组配置(ms) - 新统一延迟系统
  // 快速/标准/战斗/重度 四个分组，模块自动映射到对应分组
  delayGroups: { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 },
  // 旧模块延迟配置（保留向后兼容，新代码优先使用 delayGroups）
  moduleDelays: {
    daily: 800,         // 日常任务
    arena: 1000,        // 竞技场
    tower: 1500,        // 爬塔/怪异塔
    store: 500,         // 黑市/商店购买
    treasure: 1500,     // 宝库/梦境
    activity: 2000,     // 消耗活动
    club: 1500,         // 俱乐部
    hero: 1000,         // 英雄/鱼灵/宠物升级
    bottle: 500,        // 罐子（重置/领取）
    hangup: 500,        // 挂机/签到/答题
    nightmare: 3000,    // 十殿抽奖
    default: 800,       // 默认
  },
  // 黑市多选购买配置
  manualBuyItems: [],
  // 珍宝阁商店购买配置
  collectionExchangeItems: [],
  // 其他配置
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 30000,
  reconnectDelay: 5000,
  maxLogEntries: 1000,
  // 批量任务超时时间配置（单位：分钟）
  batchTaskTimeout: 240, // 默认 4 小时，可在此调整
  // 页面刷新配置
  enableRefresh: true,
  refreshInterval: 360, // 分钟
  smartDepartureEnabled: true,
  smartDepartureGoldThreshold: 800,
  smartDepartureRecruitThreshold: 20,
  smartDepartureJadeThreshold: 1500,
  smartDepartureTicketThreshold: 4,
  requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
  // 分页配置
  tokensPerPage: 20,      // 账号每页显示数量
  logPageSize: 100,       // 日志虚拟滚动每页数量
  // 高级配置
  defaultCommandTimeout: 5000,      // 默认命令超时时间(ms)
  battleCommandTimeout: 12000,      // 战斗命令超时时间(ms)
  defaultRetryCount: 2,             // 默认重试次数
  retryDelay: 10000,                 // 重试延迟(ms)
  accountRetryInterval: 5000,       // 账号间重试间隔(ms)
  // 挂机时间控制配置
  hangUpMinTime: 9,                 // 最小挂机时间（小时），默认9小时
  hangUpTimeControlEnabled: false,  // 是否启用挂机时间控制，默认关闭
  // 宠物合成等级限制
  petMergeMaxLevelEnabled: false,   // 是否启用宠物合成等级限制，默认关闭
  petMergeMaxLevel: 4,              // 合成等级上限（1-7），默认4级
  // 兑换码
  cdkCode: '',                      // 兑换码（定时任务使用）
  // 换皮闯关失败次数控制
  skinChallengeMaxFail: 5,          // 换皮闯关连续失败次数上限，默认5次
});

// 账号搜索关键词
const tokenSearchKeyword = ref("");

// 处理账号搜索
const handleTokenSearch = () => {
  // 搜索逻辑已在 sortedTokens 计算属性中实现
  // 这里可以添加额外的搜索逻辑，如高亮显示等
};

// Load batch settings from localStorage
// 检测浏览器类型并返回推荐的连接池大小
const getOptimalPoolSize = () => {
  const ua = navigator.userAgent;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 5;  // Safari
  if (/Firefox/.test(ua)) return 5;                       // Firefox
  if (/Chrome|Edge/.test(ua)) return 5;                   // Chrome/Edge
  return 5;                                               // 默认
};

const loadBatchSettings = () => {
  try {
    const saved = localStorage.getItem("batchSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      // 深度合并 moduleDelays，保留新增模块的默认值
      if (parsed.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, parsed.moduleDelays);
        delete parsed.moduleDelays;
      }
      // 深度合并 delayGroups，保留新增分组的默认值
      if (parsed.delayGroups && batchSettings.delayGroups) {
        Object.assign(batchSettings.delayGroups, parsed.delayGroups);
        delete parsed.delayGroups;
      }
      // 如果没有 delayGroups 但 moduleDelays 存在，从 moduleDelays 迁移默认值
      if (!batchSettings.delayGroups || Object.keys(batchSettings.delayGroups).length === 0) {
        batchSettings.delayGroups = { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 };
      }
      Object.assign(batchSettings, parsed);
      // 确保运行时标志不被持久化
      batchSettings.singleAccountMode = false;
      
      // 如果开启了自动模式，立即重新计算列数
      if (batchSettings.autoColumns && typeof window !== 'undefined') {
        nextTick(() => {
          windowWidth.value = window.innerWidth;
        });
      }
    } else {
      // 根据浏览器自动设置最佳连接池大小
      batchSettings.maxActive = getOptimalPoolSize();
    }
  } catch (error) {
    console.error("Failed to load batch settings:", error);
  }
};

// Save batch settings to localStorage
const saveBatchSettings = () => {
  try {
    // 检查并发数是否超过推荐值
    const optimalSize = getOptimalPoolSize();
    // 临时剥离运行时标志
    const runtimeFlags = { singleAccountMode: batchSettings.singleAccountMode };
    batchSettings.singleAccountMode = false;
    if (batchSettings.maxActive > optimalSize) {
      let browserName = "浏览器";
      if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
        browserName = "Safari";
      } else if (/Firefox/.test(navigator.userAgent)) {
        browserName = "Firefox";
      } else if (/Chrome|Edge/.test(navigator.userAgent)) {
        browserName = "Chrome/Edge";
      }
      
      console.warn(`⚠️ 警告：并发数 ${batchSettings.maxActive} 超过${browserName}推荐值(${optimalSize})`);
      console.warn(`⚠️ 可能导致WebSocket连接失败、浏览器卡顿等问题`);
      console.warn(`️ 建议设置为${optimalSize}或以下`);
      message.warning(`${browserName}浏览器建议连接池大小不超过${optimalSize}，当前设置: ${batchSettings.maxActive}，可能导致WebSocket连接失败`);
    }
    
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    // 恢复运行时标志
    Object.assign(batchSettings, runtimeFlags);
    
    // 输出当前配置信息
    console.log('=== 当前高级配置 ===');
    console.log('超时配置:');
    console.log('  - 默认命令超时:', batchSettings.defaultCommandTimeout, 'ms');
    console.log('  - 战斗命令超时:', batchSettings.battleCommandTimeout, 'ms');
    console.log('重试配置:');
    console.log('  - 默认重试次数:', batchSettings.defaultRetryCount, '次');
    console.log('  - 重试延迟:', batchSettings.retryDelay, 'ms');
    console.log('  - 账号重试间隔:', batchSettings.accountRetryInterval, 'ms');
    console.log('==================');
    
    message.success("定时批量任务设置已保存");
    showBatchSettingsModal.value = false;
  } catch (error) {
    console.error("Failed to save batch settings:", error);
    message.error("保存设置失败");
  }
};

// 开关切换时自动保存（不弹窗提示）
const autoSaveBatchSettings = () => {
  try {
    // 剥离运行时标志
    const wasSingleMode = batchSettings.singleAccountMode;
    batchSettings.singleAccountMode = false;
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    batchSettings.singleAccountMode = wasSingleMode;
  } catch (e) { /* ignore */ }
};

// 恢复模块延迟默认值（现在为延迟分组）
const resetModuleDelays = () => {
  const defaults = { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 };
  Object.keys(defaults).forEach(key => {
    batchSettings.delayGroups[key] = defaults[key];
  });
  message.success("模块延迟分组已恢复默认值");
};

// 延迟分组列表（用于UI渲染）
const delayGroupList = computed(() => [
  { key: 'fast', label: DELAY_GROUP_LABELS.fast, desc: DELAY_GROUP_DESCRIPTIONS.fast, modules: DELAY_GROUP_MODULES.fast },
  { key: 'normal', label: DELAY_GROUP_LABELS.normal, desc: DELAY_GROUP_DESCRIPTIONS.normal, modules: DELAY_GROUP_MODULES.normal },
  { key: 'battle', label: DELAY_GROUP_LABELS.battle, desc: DELAY_GROUP_DESCRIPTIONS.battle, modules: DELAY_GROUP_MODULES.battle },
  { key: 'heavy', label: DELAY_GROUP_LABELS.heavy, desc: DELAY_GROUP_DESCRIPTIONS.heavy, modules: DELAY_GROUP_MODULES.heavy },
]);

// 恢复延迟设置默认值
const resetDelaySettings = () => {
  const keys = ['commandDelay', 'taskDelay', 'actionDelay', 'battleDelay', 'refreshDelay', 'longDelay'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("延迟设置已恢复默认值");
};

// 恢复高级配置默认值
const resetAdvancedSettings = () => {
  const keys = ['defaultCommandTimeout', 'battleCommandTimeout', 'defaultRetryCount', 'retryDelay', 'accountRetryInterval'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("高级配置已恢复默认值");
};

// Open batch settings modal
const openBatchSettings = () => {
  loadBatchSettings();
  showBatchSettingsModal.value = true;
};

// Load settings on component mount
loadBatchSettings();

// ======================
// Legacy Gift Feature
// ======================

// Legacy Gift Modal State
const showLegacyGiftModal = ref(false);
const recipientIdInput = ref("");
const recipientIdError = ref("");
const recipientInfo = ref(null);
const isQueryingRecipient = ref(false);

const securityPassword = ref(""); // 安全密码(保留以兼容旧逻辑)
const isPasswordAutoFilled = ref(false); // 保留以兼容旧逻辑

// 计算属性: 检查选中的账号是否都有密码
const hasPasswordForSelectedTokens = computed(() => {
  if (selectedTokens.value.length === 0) return false;
  
  // 检查所有选中的账号是否都有密码配置
  return selectedTokens.value.every((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        return !!settings?.legacyGiftPassword;
      }
      return false;
    } catch (error) {
      return false;
    }
  });
});

// 计算属性: 密码状态提示信息
const passwordStatusMessage = computed(() => {
  if (selectedTokens.value.length === 0) {
    return '请先选择要操作的账号';
  }
  
  const tokensWithoutPassword = [];
  const tokensWithPassword = [];
  
  selectedTokens.value.forEach((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (settings?.legacyGiftPassword) {
          tokensWithPassword.push(tokenId);
        } else {
          tokensWithoutPassword.push(tokenId);
        }
      } else {
        tokensWithoutPassword.push(tokenId);
      }
    } catch (error) {
      tokensWithoutPassword.push(tokenId);
    }
  });
  
  if (tokensWithoutPassword.length === 0) {
    return `✓ 所有选中账号(${selectedTokens.value.length}个)已配置功法赠送密码`;
  } else if (tokensWithPassword.length === 0) {
    return `✗ 所有选中账号(${selectedTokens.value.length}个)未配置密码，请在账号设置或任务模板中配置`;
  } else {
    return `⚠ ${tokensWithPassword.length}个账号已配置密码，${tokensWithoutPassword.length}个账号未配置`;
  }
});

// 计算属性: 密码状态提示类型
const passwordStatusType = computed(() => {
  if (selectedTokens.value.length === 0) return 'default';
  
  const tokensWithoutPassword = [];
  selectedTokens.value.forEach((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (!settings?.legacyGiftPassword) {
          tokensWithoutPassword.push(tokenId);
        }
      } else {
        tokensWithoutPassword.push(tokenId);
      }
    } catch (error) {
      tokensWithoutPassword.push(tokenId);
    }
  });
  
  if (tokensWithoutPassword.length === 0) return 'success';
  if (tokensWithoutPassword.length === selectedTokens.value.length) return 'error';
  return 'warning';
});
// 从任务模板加载密码(保留以兼容旧逻辑，但不再使用)
const loadPasswordFromTemplate = () => {
  // 不再需要自动填充，密码直接从账号设置中读取
};

// 头像加载状态
const isAvatarLoading = ref(false);
const avatarLoadError = ref(false);

// ======================
// Scheduled Tasks Feature
// ======================

// Scheduled Tasks State Management
const scheduledTasks = ref([]); // List of all scheduled tasks
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const editingTask = ref(null); // Currently editing task
const taskForm = reactive({
  name: "", // Task name
  taskType: "normal", // 'normal' | 'push_map'
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
  offlineTimeEnabled: false, // 是否启用不上线时段
  // 推图任务专属字段
  pushStartTime: null, // 推图开始时间（HH:mm时间戳）
  pushStopTime: null,  // 推图停止时间（HH:mm时间戳，可选）
  legionStoreItems: { // 助威商店商品配置
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  },
  saltCrystalShopItems: { // 盐晶商店商品配置
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  },
  saltIngotShopItems: { // 盐锭商店商品配置
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  },
  fragmentPackItems: [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005], // 碎片礼包选中的 itemId 数组（默认全选）
  manualBuyItems: { // 黑市多选购买商品配置
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  },
  collectionExchangeItems: { // 珍宝阁商店购买配置
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
  },
  weeklyMarketItems: { // 黑市周商品配置
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  },
  boxWeeklyRewards: {5: 1}, // 宝箱周自选大奖配置，默认珍珠1次
  smartDeparture: { // 智能发车任务级配置（覆盖全局设置）
    enabled: false, // 是否启用任务级配置
    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2, // 刷新后等待同步延迟（秒）
    requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
    useGoldRefreshFallback: false, // 强制用金砖刷新
  },
  nightmarePresetIds: [], // 十殿阎罗挑战预设ID列表
  nightmarePresetDelay: 10, // 预设间执行间隔（秒），默认10秒
  saltCupBetPick: 1, // 比赛竞猜选项: 1=主胜, 2=平局, 3=客胜
  saltRoadBattlefieldId: '', // 天宫助威战场ID（已废弃，保留兼容）
  saltRoadSide: 1, // 天宫助威方向: 1=左军, 2=右军
  saltRoadVoteCount: 1, // 天宫助威次数
  saltRoadLegionId: null, // 天宫助威预选军团ID
  saltRoadLegionName: '', // 天宫助威预选军团名（显示用）
  bookUpgradeTypes: ['hero', 'fish', 'skin'], // 图鉴升星类型: hero=英雄, fish=鱼灵, skin=皮肤
});

// 定时任务配置 - 天宫助威对阵列表获取
const taskSaltRoadOpponents = ref([]);
const taskSaltRoadLoading = ref(false);

const fetchTaskSaltRoadOpponents = async () => {
  const formTokens = taskForm.selectedTokens;
  if (!formTokens || formTokens.length === 0) {
    message.warning("请先在定时任务中选择至少一个账号");
    return;
  }
  const tokenId = formTokens[0];
  const token = tokens.value.find(t => t.id === tokenId);
  taskSaltRoadLoading.value = true;
  try {
    // 确保连接
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `正在连接 ${token.name} 以获取对阵列表...`, type: "info" });
      await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== 'connected' && retries < 15) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== 'connected') {
        throw new Error(`连接 ${token.name} 超时`);
      }
    }

    // 获取 phase
    let phase = null;
    try {
      const firstSaturday = getFirstSaturdayOfMonth();
      const warTypeResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getwartype", { date: firstSaturday }, 10000);
      if (warTypeResp) {
        if (warTypeResp.phase) phase = String(warTypeResp.phase);
        else if (warTypeResp.date) phase = String(warTypeResp.date);
        else if (warTypeResp.currentPhase) phase = String(warTypeResp.currentPhase);
      }
    } catch (e) { /* ignore */ }
    if (!phase) {
      const lastSat = getLastSaturday();
      const parts = lastSat.split('/');
      if (parts.length === 3) phase = parts[0].slice(2) + parts[1] + parts[2];
    }

    const opponentResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getoutopponent", { phase }, 10000);
    if (opponentResp && opponentResp.opponentList && opponentResp.opponentList.length > 0) {
      taskSaltRoadOpponents.value = opponentResp.opponentList.map(item => ({
        groupId: item.groupId,
        leftLegion: item.leftLegion,
        rightLegion: item.rightLegion,
      }));
      addLog({ time: new Date().toLocaleTimeString(), message: `获取到 ${taskSaltRoadOpponents.value.length} 场对阵`, type: "success" });
    } else {
      message.warning("获取对阵列表为空");
      taskSaltRoadOpponents.value = [];
    }
  } catch (error) {
    message.error("获取对阵列表失败：" + error.message);
    taskSaltRoadOpponents.value = [];
  } finally {
    taskSaltRoadLoading.value = false;
  }
};

// 任务分组定义
const taskGroupDefinitions = [
  { name: 'daily', label: '日常', tasks: ['startBatch', 'claimHangUpRewards', 'batchAddHangUpTime', 'batchHangUpUpgrade', 'resetBottles', 'batchlingguanzi', 'batchclubsign', 'batchLegionSignup', 'batchPayloadSignup', 'switchSaltFieldPeachFormation', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'batchCarResearchUpgrade', 'store_purchase', 'batch_mail_claim_and_cleanup'] },
  { name: 'welfare', label: '福利', tasks: ['charge_claimaddup_rewards', 'collection_claimfreereward', 'gacha_drawreward', 'claim_recruit_welfare', 'pkroom_appoint', 'saltcup26_openstarpack_use'] },
  { name: 'dungeon', label: '副本', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'skinTreasure', 'batchClaimPeachTasks', 'batchBuyDreamItems'] },
  { name: 'baoku', label: '宝库', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '怪异塔', tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy', 'claim_weird_tower_all', 'claim_weird_tower_pass'] },
  { name: 'illustration', label: '图鉴', tasks: ['openHeroFourSaintsModal', 'batchHeroUpgrade', 'batchBookUpgrade', 'batchFishUpgrade', 'batchClaimStarRewards', 'batchCollectionActivate'] },
  { name: 'pet', label: '宠物', tasks: ['legion_buy_spotted_egg', 'use_spotted_egg', 'claim_pet_book', 'batch_pet_merge', 'batch_pet_upgrade'] },
  { name: 'nightmare', label: '十殿', tasks: ['batchNightmareChallengePresets', 'nightmare_draw_lottery', 'nightmare_claim_book_reward', 'star_drawturntable', 'batch_star_challenge'] },
  { name: 'resource', label: '资源', tasks: ['batchOpenBox', 'batchOpenBoxByPoints', 'batchOpenDiamondBox', 'batchOpenFragmentPacks', 'batchClaimBoxWeeklyRewards', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods', 'legionStoreBuySkinCoins', 'weekly_market_buy', 'weekly_market_free_gift', 'store_purchase', 'manual_buy', 'collection_exchange', 'legion_buy_red_jade', 'salt_crystal_shop_buy', 'salt_ingot_shop_buy', 'batchGenieSweep', 'batchAutumnUseItem', 'batchClaimCdkReward', 'batchClaimApexRewards', 'batchSaltCupBet'] },
  { name: 'legacy', label: '功法', tasks: ['batchLegacyHangup', 'batchLegacyClaim', 'batchLegacyGiftSendEnhanced', 'batchLegacyClaimGiftTask'] },
  { name: 'monthly', label: '月度', tasks: ['batchTopUpFish', 'batchTopUpArena', 'claim_guess_coin', 'legion_buy_store_items', 'batchSaltRoadCheer'] },
  { name: 'consumeActivity', label: '消耗活动', tasks: ['batchConsumeActivity', 'batchClaimConsumeRewards', 'batchApexCheer', 'batchUseActivityItem', 'batchActivityExchange'] }
];

// 计算属性，根据 taskGroupDefinitions 将 availableTasks 分组
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach(group => {
    groups[group.name] = availableTasks.filter(task => group.tasks.includes(task.value));
  });
  
  // ✅ 禁用“其他”模块，只显示明确分组的任务
  // const groupedTaskValues = taskGroupDefinitions.flatMap(g => g.tasks);
  // const otherTasks = availableTasks.filter(task => !groupedTaskValues.includes(task.value));
  // if (otherTasks.length > 0) {
  //   groups['other'] = otherTasks;
  // }
  
  return groups;
});

// Cron表达式解析相关变量
const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// 注: availableTasks, CarresearchItem, taskColumns 已从 @/utils/batch 导入

// ======================
// Scheduled Tasks Storage
// ======================

// Track executing tasks for UI loading state
const executingTaskIds = ref([]);

// Manual execute task
const manualExecuteTask = async (task) => {
  if (executingTaskIds.value.includes(task.id)) return;
  
  // Reset stop flag if not running, to allow manual execution
  if (!isRunning.value && shouldStop.value) {
    shouldStop.value = false;
  }
  
  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(id => id !== task.id);
  }
};

// Load scheduled tasks from localStorage
const loadScheduledTasks = () => {
  try {
    const saved = localStorage.getItem("scheduledTasks");

    if (saved) {
      const parsed = JSON.parse(saved);

      // Ensure we have an array
      scheduledTasks.value = Array.isArray(parsed) ? parsed : [];
    } else {
      scheduledTasks.value = [];
    }
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    scheduledTasks.value = [];
  }
};

/**
 * 检查任务函数是否存在（通过 eval+try-catch 安全检测）
 */
const isTaskFunctionExists = (taskName) => {
  try {
    const fn = eval(taskName);
    return typeof fn === 'function';
  } catch {
    return false;
  }
};

/**
 * 清理定时任务中已失效的功能模块引用
 * 在 onMounted 中调用，自动移除已删除的任务函数
 */
const cleanupInvalidTaskReferences = () => {
  let cleaned = false;
  for (const task of scheduledTasks.value) {
    if (task.selectedTasks && Array.isArray(task.selectedTasks)) {
      const originalLength = task.selectedTasks.length;
      task.selectedTasks = task.selectedTasks.filter(taskName => {
        // 处理函数名映射
        let fnName = taskName;
        if (taskName === 'weekly_market_buy') fnName = 'weeklyMarketBuy';
        else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
          // manual_buy 和 collection_exchange 直接使用下划线名称
          fnName = taskName;
        }
        return isTaskFunctionExists(fnName);
      });
      if (task.selectedTasks.length !== originalLength) {
        cleaned = true;
        const removedCount = originalLength - task.selectedTasks.length;
        addLog({ time: new Date().toLocaleTimeString(), message: `定时任务「${task.name}」中 ${removedCount} 个已失效的功能模块已自动清理`, type: "info" });
      }
    }
  }
  if (cleaned) {
    saveScheduledTasks();
  }
};

/**
 * 检查当前时间是否在不上线时段内
 * 不上线时段：周五05:00-07:00 / 周六19:50-21:10 / 周日19:50-20:40
 * @returns {boolean} true表示在不上线时段内，false表示不在
 */
const isInOfflineTime = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6 (0=周日, 6=周六, 5=周五)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // 转换为分钟数
  
  // 调试日志
  console.log('[不上线时段检查] ========== 开始检查 ==========');
  console.log('[不上线时段检查] 当前时间:', now.toLocaleString('zh-CN'));
  console.log('[不上线时段检查] 星期:', ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek], `(dayOfWeek=${dayOfWeek})`);
  console.log('[不上线时段检查] 当前分钟数:', currentTime, `(${hours}:${minutes.toString().padStart(2, '0')})`);
  
  // 周五 05:00-07:00
  if (dayOfWeek === 5) {
    const startTime = 5 * 60;       // 05:00 = 300分钟
    const endTime = 7 * 60;         // 07:00 = 420分钟
    console.log('[不上线时段检查] 周五时段:', `${startTime}-${endTime}分钟 (05:00-07:00)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  // 周六 19:50-21:10
  if (dayOfWeek === 6) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190分钟
    const endTime = 21 * 60 + 10;   // 21:10 = 1270分钟
    console.log('[不上线时段检查] 周六时段:', `${startTime}-${endTime}分钟 (19:50-21:10)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  // 周日 19:50-20:40
  if (dayOfWeek === 0) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190分钟
    const endTime = 20 * 60 + 40;   // 20:40 = 1240分钟
    console.log('[不上线时段检查] 周日时段:', `${startTime}-${endTime}分钟 (19:50-20:40)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  console.log('[不上线时段检查]  不在不上线时段内');
  console.log('[不上线时段检查] ========== 结束检查 ==========');
  return false;
};

/**
 * 测试不上线时段功能（临时测试函数）
 */
const testOfflineTime = () => {
  console.log('\n========== 测试不上线时段功能 ==========');
  const result = isInOfflineTime();
  console.log('测试结果:', result ? '在不上线时段内' : '不在不上线时段内');
  console.log('========================================\n');
  return result;
};

// 暴露到全局供测试
window.testOfflineTime = testOfflineTime;

// Save scheduled tasks to localStorage
const saveScheduledTasks = () => {
  try {
    const dataToSave = JSON.stringify(scheduledTasks.value);

    localStorage.setItem("scheduledTasks", dataToSave);
    // Verify save was successful
    const saved = localStorage.getItem("scheduledTasks");
  } catch (error) {
    console.error("Failed to save scheduled tasks:", error);
  }
};

/**
 * 批量控制所有任务的不上线时段开关
 * @param {boolean} enabled - true为开启，false为关闭
 */
const toggleAllOfflineTime = (enabled) => {
  if (scheduledTasks.value.length === 0) {
    message.warning("没有定时任务可操作");
    return;
  }
  
  const action = enabled ? "开启" : "关闭";
  
  // 更新所有任务的不上线时段设置
  scheduledTasks.value.forEach(task => {
    task.offlineTimeEnabled = enabled;
  });
  
  // 保存到localStorage
  saveScheduledTasks();
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已批量${action}所有定时任务的不上线时段 ===`,
    type: "success",
  });
  
  message.success(`已批量${action}所有定时任务的不上线时段`);
};

// Open task modal for adding new task
// 取消任务编辑
const cancelTaskEdit = () => {
  showTaskModal.value = false;
  // 延迟重置表单，避免模态框关闭动画时看到表单变化
  setTimeout(() => {
    editingTask.value = null;
    
    // 直接赋值重置表单
    taskForm.name = "";
    taskForm.taskType = "normal";
    taskForm.runType = "daily";
    taskForm.runTime = undefined;
    taskForm.cronExpression = "";
    taskForm.selectedTokens = [];
    taskForm.selectedTasks = [];
    taskForm.enabled = true;
    taskForm.offlineTimeEnabled = false;
    taskForm.pushStartTime = null;
    taskForm.pushStopTime = null;
    
    taskForm.legionStoreItems = {
      7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
      8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
      9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
      10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
      11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
    };
    
    taskForm.weeklyMarketItems = {
      0: { selected: false, label: "免费金砖" },
      1: { selected: false, label: "黑市见面礼" },
      2: { selected: false, label: "黑市惊喜礼" },
      3: { selected: false, label: "初级黑市包" },
      4: { selected: false, label: "中级黑市包" },
      5: { selected: false, label: "高级黑市包" },
      6: { selected: false, label: "顶级鱼竿包" },
      7: { selected: false, label: "白玉黑市包" },
      8: { selected: false, label: "特级灵贝包" },
      9: { selected: false, label: "养成补给包" },
    };
    
    taskForm.boxWeeklyRewards = {5: 1};
    taskForm.smartDeparture = {
      enabled: false,
      goldThreshold: 800,
      recruitThreshold: 20,
      jadeThreshold: 1500,
      ticketThreshold: 4,
      carMinColor: 4,
      refreshDelay: 2,
      requireMinColorWithConditions: false,
      useGoldRefreshFallback: false,
    };
    taskForm.nightmarePresetIds = [];
    taskForm.nightmarePresetDelay = 10;
    taskForm.saltCupBetPick = 1;
    taskForm.saltRoadBattlefieldId = '';
    taskForm.saltRoadSide = 1;
    taskForm.saltRoadVoteCount = 1;
    taskForm.saltRoadLegionId = null;
    taskForm.saltRoadLegionName = '';
    taskForm.bookUpgradeTypes = ['hero', 'fish', 'skin'];
    taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
    taskSaltRoadOpponents.value = [];
    taskScheduleSelectedGroupIds.value = [];
  }, 300);
};

const openTaskModal = () => {
  editingTask.value = null;
  
  console.log('[新增任务] 开始初始化表单');
  
  // 重置表单，直接赋値确保嵌套对象正确重置
  taskForm.name = "";
  taskForm.taskType = "normal";
  taskForm.runType = "daily";
  taskForm.runTime = undefined;
  taskForm.cronExpression = "";
  taskForm.selectedTokens = [];
  taskForm.selectedTasks = [];
  taskForm.enabled = true;
  taskForm.offlineTimeEnabled = false;
  taskForm.pushStartTime = null;
  taskForm.pushStopTime = null;
  
  // 直接赋值助威商店配置
  taskForm.legionStoreItems = {
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  };
  
  // 直接赋值黑市商品配置
  taskForm.weeklyMarketItems = {
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  };
  
  // 直接赋值宝箱周奖励配置
  taskForm.boxWeeklyRewards = {5: 1};
  
  // 智能发车任务级配置
  taskForm.smartDeparture = {
    enabled: false,
    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2,
    requireMinColorWithConditions: false,
    useGoldRefreshFallback: false,
  };
  
  // 盐晶商店配置
  taskForm.saltCrystalShopItems = {
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  };
  
  // 盐锭商店配置
  taskForm.saltIngotShopItems = {
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  };

  // 黑市多选购买商品配置
  taskForm.manualBuyItems = {
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  };

  // 珍宝阁商店购买商品配置
  taskForm.collectionExchangeItems = {
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
  };

  // 十殿预设配置
  taskForm.nightmarePresetIds = [];
  taskForm.nightmarePresetDelay = 10;
  taskForm.saltCupBetPick = 1;
  taskForm.saltRoadBattlefieldId = '';
  taskForm.saltRoadSide = 1;
  taskForm.saltRoadVoteCount = 1;
  taskForm.saltRoadLegionId = null;
  taskForm.saltRoadLegionName = '';
  taskForm.bookUpgradeTypes = ['hero', 'fish', 'skin'];
  
  // 碎片礼包配置（默认全选）
  taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
  
  console.log('[新增任务] 初始化完成');
  console.log('[新增任务] weeklyMarketItems:', taskForm.weeklyMarketItems);
  console.log('[新增任务] legionStoreItems:', taskForm.legionStoreItems);
  
  taskSaltRoadOpponents.value = [];
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// Edit existing task
const editTask = (task) => {
  editingTask.value = task;
  
  // 默认助威商店配置
  const defaultLegionStoreItems = {
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  };
  
  // 默认黑市商品配置
  const defaultWeeklyMarketItems = {
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  };
  
  // 默认盐晶商店配置
  const defaultSaltCrystalShopItems = {
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  };
  
  // 默认盐锭商店配置
  const defaultSaltIngotShopItems = {
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  };
  
  // 默认黑市多选购买配置
  const defaultManualBuyItems = {
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  };
  
  // 默认珍宝阁商店购买配置
  const defaultCollectionExchangeItems = {
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
  };
  
  // 合并助威商店配置，补充缺失的label
  const mergedLegionStoreItems = { ...defaultLegionStoreItems };
  if (task.legionStoreItems) {
    Object.keys(task.legionStoreItems).forEach(key => {
      if (mergedLegionStoreItems[key]) {
        // 保留用户的选择，但补充label等字段
        mergedLegionStoreItems[key] = {
          ...mergedLegionStoreItems[key],
          ...task.legionStoreItems[key],
        };
      }
    });
  }
  
  // 合并黑市商品配置，补充缺失的label
  const mergedWeeklyMarketItems = { ...defaultWeeklyMarketItems };
  if (task.weeklyMarketItems) {
    Object.keys(task.weeklyMarketItems).forEach(key => {
      if (mergedWeeklyMarketItems[key]) {
        mergedWeeklyMarketItems[key] = {
          ...mergedWeeklyMarketItems[key],
          ...task.weeklyMarketItems[key],
        };
      }
    });
  }
  
  // 合并盐晶商店配置，补充缺失的label
  const mergedSaltCrystalShopItems = { ...defaultSaltCrystalShopItems };
  if (task.saltCrystalShopItems) {
    Object.keys(task.saltCrystalShopItems).forEach(key => {
      if (mergedSaltCrystalShopItems[key]) {
        mergedSaltCrystalShopItems[key] = {
          ...mergedSaltCrystalShopItems[key],
          ...task.saltCrystalShopItems[key],
        };
      }
    });
  }
  
  // 合并盐锭商店配置，补充缺失的label
  const mergedSaltIngotShopItems = { ...defaultSaltIngotShopItems };
  if (task.saltIngotShopItems) {
    Object.keys(task.saltIngotShopItems).forEach(key => {
      if (mergedSaltIngotShopItems[key]) {
        mergedSaltIngotShopItems[key] = {
          ...mergedSaltIngotShopItems[key],
          ...task.saltIngotShopItems[key],
        };
      }
    });
  }
  
  // 合并黑市多选购买配置，补充缺失的label
  const mergedManualBuyItems = { ...defaultManualBuyItems };
  if (task.manualBuyItems) {
    Object.keys(task.manualBuyItems).forEach(key => {
      if (mergedManualBuyItems[key]) {
        mergedManualBuyItems[key] = {
          ...mergedManualBuyItems[key],
          ...task.manualBuyItems[key],
        };
      }
    });
  }
  
  // 合并珍宝阁商店购买配置，补充缺失的label
  const mergedCollectionExchangeItems = { ...defaultCollectionExchangeItems };
  if (task.collectionExchangeItems) {
    Object.keys(task.collectionExchangeItems).forEach(key => {
      if (mergedCollectionExchangeItems[key]) {
        mergedCollectionExchangeItems[key] = {
          ...mergedCollectionExchangeItems[key],
          ...task.collectionExchangeItems[key],
        };
      }
    });
  }
  
  const taskData = { 
    ...task,
    taskType: task.taskType || 'normal',
    legionStoreItems: mergedLegionStoreItems,
    weeklyMarketItems: mergedWeeklyMarketItems,
    saltCrystalShopItems: mergedSaltCrystalShopItems,
    saltIngotShopItems: mergedSaltIngotShopItems,
    manualBuyItems: mergedManualBuyItems,
    collectionExchangeItems: mergedCollectionExchangeItems,
    fragmentPackItems: task.fragmentPackItems || [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005],
    boxWeeklyRewards: task.boxWeeklyRewards || {5: 1},
    smartDeparture: task.smartDeparture || {
      enabled: false,
      goldThreshold: 800,
      recruitThreshold: 20,
      jadeThreshold: 1500,
      ticketThreshold: 4,
      carMinColor: 4,
      refreshDelay: 2,
      requireMinColorWithConditions: false,
    },
    nightmarePresetIds: task.nightmarePresetIds || [],
    nightmarePresetDelay: task.nightmarePresetDelay || 10,
    saltCupBetPick: task.saltCupBetPick !== undefined ? task.saltCupBetPick : 1,
    saltRoadBattlefieldId: task.saltRoadBattlefieldId || '',
    saltRoadSide: task.saltRoadSide !== undefined ? task.saltRoadSide : 1,
    saltRoadVoteCount: task.saltRoadVoteCount || 1,
    saltRoadLegionId: task.saltRoadLegionId || null,
    saltRoadLegionName: task.saltRoadLegionName || '',
    bookUpgradeTypes: task.bookUpgradeTypes && task.bookUpgradeTypes.length > 0 ? [...task.bookUpgradeTypes] : ['hero', 'fish', 'skin'],
    pushStartTime: task.pushStartTime ? (() => {
      const [h, m] = task.pushStartTime.split(':').map(Number);
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
    })() : null,
    pushStopTime: task.pushStopTime ? (() => {
      const [h, m] = task.pushStopTime.split(':').map(Number);
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
    })() : null,
  };
  
  if (
    task.runType === "daily" &&
    task.runTime &&
    typeof task.runTime === "string"
  ) {
    const [hours, minutes] = task.runTime.split(":").map(Number);
    const now = new Date();
    taskData.runTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    );
  }
  // 浅拷贝基本属性
  Object.assign(taskForm, taskData);
  // 深度合并 smartDeparture，保留 Vue 响应式
  if (taskData.smartDeparture) {
    Object.assign(taskForm.smartDeparture, taskData.smartDeparture);
  }
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// 注: validateCronExpression 已从 @/utils/batch 导入

// Parse cron expression and calculate next execution times
const parseCronExpression = (expression) => {
  // Validate the expression first
  const validation = validateCronExpression(expression);
  cronValidation.value = validation;

  if (!validation.valid) {
    cronNextRuns.value = [];
    return;
  }

  // Parse the expression and calculate next runs
  const cronParts = expression.split(" ").filter(Boolean);
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    cronParts;

  // Calculate next 5 execution times
  const nextRuns = calculateNextRuns(
    minuteField,
    hourField,
    dayOfMonthField,
    monthField,
    dayOfWeekField,
    5,
  );
  cronNextRuns.value = nextRuns;
};

// 注: calculateNextRuns 已从 @/utils/batch 导入

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("请输入任务名称");
    return;
  }

  // 推图任务特殊验证
  if (taskForm.taskType === 'push_map') {
    if (!taskForm.pushStartTime) {
      message.warning("请选择开始推图时间");
      return;
    }
    // 推图任务直接跳过其他验证，进入保存逻辑
    const msToTimeStr = (ms) => {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    const taskData = {
      id: editingTask.value?.id || "task_" + Date.now(),
      name: taskForm.name,
      taskType: 'push_map',
      runType: 'daily',
      runTime: msToTimeStr(taskForm.pushStartTime), // 以开始时间为主时间（调度器将根据此时间触发）
      cronExpression: '',
      selectedTokens: [],
      selectedTasks: [],
      enabled: taskForm.enabled,
      offlineTimeEnabled: taskForm.offlineTimeEnabled || false, // 推图任务也支持不上线时段
      pushStartTime: msToTimeStr(taskForm.pushStartTime),
      pushStopTime: taskForm.pushStopTime ? msToTimeStr(taskForm.pushStopTime) : null,
    };
    const isNew = !editingTask.value;
    if (editingTask.value) {
      const index = scheduledTasks.value.findIndex(t => t.id === editingTask.value.id);
      if (index !== -1) scheduledTasks.value[index] = taskData;
    } else {
      scheduledTasks.value.push(taskData);
    }
    saveScheduledTasks();
    addTaskSaveLog(taskData, isNew, addLog);
    showTaskModal.value = false;
    message.success("推图定时任务已保存");
    return;
  }
  // ===================== 以下为普通任务验证 =====================

  if (taskForm.runType === "daily" && !taskForm.runTime) {
    message.warning("请选择运行时间");
    return;
  }

  if (taskForm.runType === "cron") {
    if (!taskForm.cronExpression) {
      message.warning("请输入Cron表达式");
      return;
    }

    // Validate cron expression
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }

  // 十殿阎罗挑战预设自带账号（队长+队员），无需额外选择账号
  const hasNightmarePresets = taskForm.selectedTasks.includes('batchNightmareChallengePresets') && (taskForm.nightmarePresetIds?.length > 0);
  // 其他需要账号的任务（排除十殿预设）
  const nonNightmareTasks = taskForm.selectedTasks.filter(t => t !== 'batchNightmareChallengePresets');
  
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length > 0 && !hasNightmarePresets) {
    message.warning("请选择至少一个账号");
    return;
  }
  // 如果只有十殿预设任务且未选预设，提示选择预设
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length === 0 && !hasNightmarePresets) {
    message.warning("请选择至少一个账号，或选择十殿阎罗挑战预设（预设自带账号）");
    return;
  }

  if (taskForm.selectedTasks.length === 0) {
    message.warning("请选择至少一个任务");
    return;
  }
  
  // 验证助威商店是否选择了商品
  if (taskForm.selectedTasks.includes('legion_buy_store_items')) {
    const hasSelectedItem = Object.values(taskForm.legionStoreItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("助威商店多选购买需要至少选择一个商品");
      return;
    }
  }

  // 验证消耗活动兑换商店是否选择了商品
  if (taskForm.selectedTasks.includes('batchActivityExchange')) {
    const hasSelectedItem = taskForm.activityExchangeItems && Object.values(taskForm.activityExchangeItems).some(item => item && item.selected);
    if (!hasSelectedItem) {
      message.warning("消耗活动兑换购买需要至少选择一个商品");
      return;
    }
  }
  
  // 验证盐晶商店是否选择了商品
  if (taskForm.selectedTasks.includes('salt_crystal_shop_buy')) {
    const hasSelectedItem = taskForm.saltCrystalShopItems && Object.values(taskForm.saltCrystalShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("盐晶商店需要至少选择一个商品");
      return;
    }
  }
  
  // 验证盐锭商店是否选择了商品
  if (taskForm.selectedTasks.includes('salt_ingot_shop_buy')) {
    const hasSelectedItem = taskForm.saltIngotShopItems && Object.values(taskForm.saltIngotShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("盐锭商店需要至少选择一个商品");
      return;
    }
  }
  
  // 验证黑市多选购买是否选择了商品
  if (taskForm.selectedTasks.includes('manual_buy')) {
    const hasSelectedItem = taskForm.manualBuyItems && Object.values(taskForm.manualBuyItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("黑市多选购买需要至少选择一个商品");
      return;
    }
  }
  
  // 验证珍宝阁商店购买是否选择了商品
  if (taskForm.selectedTasks.includes('collection_exchange')) {
    const hasSelectedItem = taskForm.collectionExchangeItems && Object.values(taskForm.collectionExchangeItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("珍宝阁商店购买需要至少选择一个商品");
      return;
    }
  }
  
  // 验证黑市周购买是否选择了商品
  if (taskForm.selectedTasks.includes('weekly_market_buy')) {
    const hasSelectedItem = Object.values(taskForm.weeklyMarketItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("黑市周购买需要至少选择一个商品");
      return;
    }
  }

  // 验证十殿阎罗挑战是否选择了预设
  if (taskForm.selectedTasks.includes('batchNightmareChallengePresets')) {
    if (!taskForm.nightmarePresetIds || taskForm.nightmarePresetIds.length === 0) {
      message.warning("十殿阎罗挑战需要至少选择一个预设");
      return;
    }
  }

  // 验证宝箱周任务是否在当前是宝箱周（保存时提醒）
  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = taskForm.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    message.warning("当前不是宝箱周，宝箱周任务将在宝箱周期间自动执行");
    // 不阻止保存，但给用户提示
  }

  // Format runTime as string for storage
  let formattedRunTime = null;
  if (taskForm.runType === "daily" && taskForm.runTime) {
    const time = new Date(taskForm.runTime);
    formattedRunTime = time.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const taskData = {
    id: editingTask.value?.id || "task_" + Date.now(),
    name: taskForm.name,
    runType: taskForm.runType,
    runTime: formattedRunTime,
    cronExpression: taskForm.runType === "cron" ? taskForm.cronExpression : "",
    selectedTokens: [...taskForm.selectedTokens],
    selectedTasks: [...taskForm.selectedTasks],
    enabled: taskForm.enabled,
    offlineTimeEnabled: taskForm.offlineTimeEnabled || false, // 保存不上线时段设置
    // 始终保存完整配置，确保编辑时能正确显示
    legionStoreItems: JSON.parse(JSON.stringify(taskForm.legionStoreItems)),
    weeklyMarketItems: JSON.parse(JSON.stringify(taskForm.weeklyMarketItems)),
    saltCrystalShopItems: JSON.parse(JSON.stringify(taskForm.saltCrystalShopItems)),
    saltIngotShopItems: JSON.parse(JSON.stringify(taskForm.saltIngotShopItems)),
    manualBuyItems: JSON.parse(JSON.stringify(taskForm.manualBuyItems)),
    collectionExchangeItems: JSON.parse(JSON.stringify(taskForm.collectionExchangeItems)),
    fragmentPackItems: [...(taskForm.fragmentPackItems || [])],
    boxWeeklyRewards: {...taskForm.boxWeeklyRewards},
    smartDeparture: JSON.parse(JSON.stringify(taskForm.smartDeparture)),
    nightmarePresetIds: [...(taskForm.nightmarePresetIds || [])],
    nightmarePresetDelay: taskForm.nightmarePresetDelay || 10,
    saltCupBetPick: taskForm.saltCupBetPick || 1,
    saltRoadBattlefieldId: taskForm.saltRoadBattlefieldId || '',
    saltRoadSide: taskForm.saltRoadSide || 1,
    saltRoadVoteCount: taskForm.saltRoadVoteCount || 1,
    saltRoadLegionId: taskForm.saltRoadLegionId || null,
    saltRoadLegionName: taskForm.saltRoadLegionName || '',
    bookUpgradeTypes: [...(taskForm.bookUpgradeTypes || ['hero', 'fish', 'skin'])],
  };

  let isNew = !editingTask.value;

  if (editingTask.value) {
    // Update existing task
    const index = scheduledTasks.value.findIndex(
      (t) => t.id === editingTask.value.id,
    );
    if (index !== -1) {
      scheduledTasks.value[index] = taskData;
    }
  } else {
    // Add new task
    scheduledTasks.value.push(taskData);
  }

  saveScheduledTasks();

  // Add log entry for task save
  addTaskSaveLog(taskData, isNew, addLog);

  showTaskModal.value = false;
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    message.success("定时任务已删除");
  }
};

// Delete all scheduled tasks
const deleteAllScheduledTasks = () => {
  const count = scheduledTasks.value.length;
  if (count === 0) return;
  
  if (!confirm(`确定要删除全部 ${count} 个定时任务吗？此操作不可恢复！`)) return;
  
  scheduledTasks.value = [];
  saveScheduledTasks();
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已批量删除 ${count} 个定时任务 ===`,
    type: "info",
  });
  message.success(`已删除 ${count} 个定时任务`);
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  }
};

// 启动/关闭所有定时任务
const allTasksEnabled = computed(() =>
  scheduledTasks.value.length > 0 && scheduledTasks.value.every(t => t.enabled)
);

const enableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = true; });
  saveScheduledTasks();
  message.success(`已启动所有 ${scheduledTasks.value.length} 个定时任务`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已启动所有 ${scheduledTasks.value.length} 个定时任务 ===`,
    type: "success",
  });
};

const disableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = false; });
  saveScheduledTasks();
  message.success(`已关闭所有 ${scheduledTasks.value.length} 个定时任务`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已关闭所有 ${scheduledTasks.value.length} 个定时任务 ===`,
    type: "info",
  });
};

// ✅ 全选账号：将所有定时任务的选中账号设置为所有可用账号
const selectAllTokensForAllTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  if (!tokens.value || tokens.value.length === 0) { message.warning("暂无可用账号"); return; }
  
  const allTokenIds = tokens.value.map(t => t.id);
  let updatedCount = 0;
  
  scheduledTasks.value.forEach(task => {
    // 将任务的选中账号设置为所有账号
    task.selectedTokens = [...allTokenIds];
    updatedCount++;
  });
  
  saveScheduledTasks();
  message.success(`已为所有 ${updatedCount} 个定时任务选中全部 ${allTokenIds.length} 个账号`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已为所有定时任务选中全部 ${allTokenIds.length} 个账号 ===`,
    type: "success",
  });
};

// ✅ 取消账号：清空所有定时任务的选中账号
const clearAllTokensForAllTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  
  let updatedCount = 0;
  
  scheduledTasks.value.forEach(task => {
    // 清空任务的选中账号
    task.selectedTokens = [];
    updatedCount++;
  });
  
  saveScheduledTasks();
  message.success(`已清空所有 ${updatedCount} 个定时任务的选中账号`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已清空所有定时任务的选中账号 ===`,
    type: "info",
  });
};

// ✅ 单个任务全选账号
const selectAllTokensForTask = (task) => {
  if (!tokens.value || tokens.value.length === 0) { message.warning("暂无可用账号"); return; }
  const allTokenIds = tokens.value.map(t => t.id);
  task.selectedTokens = [...allTokenIds];
  saveScheduledTasks();
  message.success(`已为任务「${task.name}」选中全部 ${allTokenIds.length} 个账号`);
};

// ✅ 单个任务取消账号
const clearAllTokensForTask = (task) => {
  task.selectedTokens = [];
  saveScheduledTasks();
  message.success(`已清空任务「${task.name}」的选中账号`);
};

// 注: addTaskSaveLog 已从 @/utils/batch 导入，调用时需传入 addLog

// Reset run type related fields
const resetRunType = () => {
  if (taskForm.runType === "daily") {
    taskForm.cronExpression = "";
  } else {
    taskForm.runTime = undefined;
  }
};

// Select all tokens
const selectAllTokens = () => {
  taskForm.selectedTokens = tokens.value.map((token) => token.id);
};

// Deselect all tokens
const deselectAllTokens = () => {
  taskForm.selectedTokens = [];
};

// Select all tasks
const selectAllTasks = () => {
  taskForm.selectedTasks = availableTasks.map((task) => task.value);
};

// Deselect all tasks
const deselectAllTasks = () => {
  taskForm.selectedTasks = [];
};

// ======================
// Import/Export Config
// ======================

// Export scheduled tasks configuration only
const exportScheduledTasksConfig = async () => {
  try {
    if (!scheduledTasks.value || !Array.isArray(scheduledTasks.value)) {
      message.error("定时任务数据加载失败，请刷新页面后重试");
      return;
    }

    const validTokenIds = new Set((tokens.value || []).map((t) => t.id));
    const filteredScheduledTasks = scheduledTasks.value.map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((task) => task.selectedTokens.length > 0);

    const exportData = {
      version: "1.3",
      exportTime: new Date().toISOString(),
      configType: "scheduled-tasks",
      scheduledTasks: filteredScheduledTasks,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const success = await downloadFile(blob, `scheduled-tasks-config_${new Date().toISOString().slice(0, 10)}.json`);
    if (success) {
      message.success(`定时配置导出成功: ${filteredScheduledTasks.length} 个定时任务`);
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Export scheduled tasks failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// Trigger file input for importing scheduled tasks
const triggerImportScheduledTasks = () => {
  importScheduledTasksInput.value?.click();
};

// Handle scheduled tasks file import
const handleImportScheduledTasks = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importScheduledTasksConfig({ file });
  } finally {
    event.target.value = '';
  }
};

// Trigger file input for importing account config
const triggerImportAccountConfig = () => {
  importAccountConfigInput.value?.click();
};

// Handle account config file import
const handleImportAccountConfig = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await importAccountConfig({ file });
  event.target.value = '';
};

// Trigger file input for full config import
const triggerImportFullConfig = () => {
  importFullConfigInput.value?.click();
};

// Handle full config file import
const handleImportFullConfig = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importConfig({ file });
  } finally {
    event.target.value = '';
  }
};

// Import scheduled tasks configuration only
const importScheduledTasksConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    const importData = JSON.parse(fileContent);

    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "scheduled-tasks") {
      message.error("这是账号配置文件，请使用「导入账号配置」功能");
      return;
    }
    if (!importData.scheduledTasks && !importData.configType) {
      message.error("无效的定时配置文件格式：缺少定时任务数据");
      return;
    }

    let importedTasks = 0;
    let invalidTokenCount = 0;

    if (Array.isArray(importData.scheduledTasks)) {
      if (!scheduledTasks.value || !Array.isArray(scheduledTasks.value)) {
        scheduledTasks.value = [];
      }
      // 构建本地有效token ID集合
      const localTokenIds = new Set(gameTokens.value.map(t => t.id));

      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          // 过滤无效账号：只保留本地存在的token ID
          if (Array.isArray(task.selectedTokens)) {
            const originalCount = task.selectedTokens.length;
            task.selectedTokens = task.selectedTokens.filter(id => localTokenIds.has(id));
            const removed = originalCount - task.selectedTokens.length;
            if (removed > 0) {
              invalidTokenCount += removed;
            }
          }
          scheduledTasks.value.push(task);
          importedTasks++;
        }
      });
      if (importedTasks > 0) saveScheduledTasks();
    }

    const parts = [];
    if (importedTasks > 0) parts.push(`${importedTasks} 个新定时任务`);
    if (invalidTokenCount > 0) parts.push(`已过滤 ${invalidTokenCount} 个无效账号`);
    if (parts.length === 0) parts.push('无新增数据（已存在）');

    message.success(`定时配置导入成功: ${parts.join(', ')}`);
  } catch (error) {
    console.error("Import scheduled tasks failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// ===== 导入导出共享辅助函数 =====

// 读取文件内容为文本（Promise化）
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// ArrayBuffer → Base64 字符串
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // 分块处理，避免大文件栈溢出
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

// Base64 字符串 → ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 收集所有token的BIN数据（从IndexedDB，缺失时兜底localStorage备份）
const collectBinData = async (tokenList) => {
  const binDataMap = {};
  const skippedTokens = [];
  for (const token of tokenList) {
    if (token.importMethod === "bin" || token.importMethod === "wxQrcode") {
      try {
        let binData = await getArrayBufferFromDB(token.id);
        if (!binData && token.name) {
          binData = await getArrayBufferFromDB(token.name);
        }
        // IndexedDB 缺失时，尝试 localStorage 备份
        if (!binData) {
          binData = await getBinBackupWithFallback(token.id, token.name);
          if (binData) {
            console.log(`从 localStorage 备份导出BIN数据: ${token.name} (${binData.byteLength} bytes)`);
          }
        }
        if (binData) {
          binDataMap[token.id] = arrayBufferToBase64(binData);
          console.log(`导出BIN数据: ${token.name} (${binData.byteLength} bytes)`);
        } else {
          console.warn(`未找到Token "${token.name}" 的BIN数据`);
          skippedTokens.push(token.name);
        }
      } catch (error) {
        console.error(`导出Token "${token.name}" BIN数据失败:`, error);
      }
    }
  }
  return { binDataMap, skippedTokens };
};

// 导入BIN数据到IndexedDB
// tokenIdMapping: { 源tokenId: 目标实际tokenId }，sourceTokens: 源配置中的token列表
const importBinData = async (binData, tokenIdMapping, sourceTokens) => {
  if (!binData || typeof binData !== 'object' || Object.keys(binData).length === 0) {
    return { importedCount: 0, skippedCount: 0, skippedTokens: [] };
  }
  // 确保IndexedDB已就绪
  try {
    await useIndexedDB().ensureReady();
  } catch (e) {
    console.warn('等待IndexedDB就绪超时:', e.message);
  }

  let importedCount = 0;
  let skippedCount = 0;
  const skippedTokens = [];
  for (const [tokenId, base64Data] of Object.entries(binData)) {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`跳过无效BIN数据: Token ID ${tokenId}`);
        skippedCount++;
        continue;
      }
      // 1. 先用tokenId精确匹配
      let token = gameTokens.value.find(t => t.id === tokenId);
      let actualTokenId = tokenId;
      // 2. 如果没找到，检查tokenIdMapping映射
      if (!token && tokenIdMapping?.[tokenId]) {
        const mappedId = tokenIdMapping[tokenId];
        token = gameTokens.value.find(t => t.id === mappedId);
        if (token) actualTokenId = mappedId;
      }
      // 3. 如果还没找到，通过token内容匹配
      if (!token && sourceTokens) {
        const sourceToken = sourceTokens.find(st => st.id === tokenId);
        if (sourceToken?.token) {
          token = gameTokens.value.find(t => t.token === sourceToken.token);
          if (token) actualTokenId = token.id;
        }
      }
      if (!token) {
        console.warn(`跳过BIN数据导入: 未找到Token ID ${tokenId}`);
        skippedCount++;
        // 尝试从sourceTokens获取名称
        const srcInfo = sourceTokens?.find(st => st.id === tokenId);
        skippedTokens.push(srcInfo?.name || tokenId);
        continue;
      }
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      // 用目标设备实际 token 的 ID 作为键存储
      const success = await storeArrayBufferToDB(actualTokenId, arrayBuffer);
      if (success) {
        importedCount++;
        // 同时备份到 localStorage，防止下次 IndexedDB 被清理后无法导出/刷新
        saveBinBackup(actualTokenId, arrayBuffer);
      
        // 验证写入
        const verify = await getArrayBufferFromDB(actualTokenId);
        if (!verify) {
          console.warn(`BIN数据写入验证失败: ${token.name}`);
          importedCount--;
          skippedCount++;
          skippedTokens.push(token.name);
        } else {
          console.log(`导入BIN数据成功: ${token.name} (${arrayBuffer.byteLength} bytes)`);
        }
      } else {
        console.error(`导入BIN数据失败: ${token.name}`);
        skippedCount++;
        skippedTokens.push(token.name);
      }
    } catch (error) {
      console.error(`处理Token BIN数据失败 [${tokenId}]:`, error);
      skippedCount++;
      skippedTokens.push(tokenId);
    }
  }
  return { importedCount, skippedCount, skippedTokens };
};

// 收集每个token的日常任务设置
const collectTokenSettings = (tokenList) => {
  const tokenSettings = [];
  tokenList.forEach((token) => {
    const settings = localStorage.getItem(`daily-settings:${token.id}`);
    if (settings) {
      try {
        tokenSettings.push({
          tokenId: token.id,
          settings: JSON.parse(settings),
        });
      } catch (e) {
        console.warn(`Failed to parse settings for token ${token.id}`, e);
      }
    }
  });
  return tokenSettings;
};

// 导入token设置到localStorage
const importTokenSettings = (tokenSettings, tokenIdMapping = {}) => {
  if (!Array.isArray(tokenSettings)) return 0;
  let count = 0;
  tokenSettings.forEach((item) => {
    if (item.tokenId && item.settings) {
      // 使用 tokenIdMapping 映射到新设备的 token ID
      const newTokenId = tokenIdMapping[item.tokenId] || item.tokenId;
      localStorage.setItem(
        `daily-settings:${newTokenId}`,
        JSON.stringify(item.settings)
      );
      count++;
    }
  });
  return count;
};

// 将token列表映射为导出格式（包含所有必要字段）
const mapTokensForExport = (tokenList) => {
  return tokenList.map((t) => ({
    id: t.id,
    name: t.name,
    token: t.token,
    server: t.server,
    wsUrl: t.wsUrl || null,
    remark: t.remark || "",
    importMethod: t.importMethod || "manual",
    sourceUrl: t.sourceUrl || null,
    avatar: t.avatar || null,
    upgradedToPermanent: t.upgradedToPermanent || false,
    upgradedAt: t.upgradedAt || null,
    updatedAt: t.updatedAt || null,
    createdAt: t.createdAt || null,
    lastUsed: t.lastUsed || null,
    expiresAt: t.expiresAt || null,
    lastRefreshAt: t.lastRefreshAt || null,
  }));
};

// 通用文件解析（支持加密/Base64/普通JSON）
const parseExportFile = async (fileContent) => {
  const fileData = JSON.parse(fileContent);
  
  if (fileData.encrypted && fileData.data) {
    // 加密文件
    let password;
    try {
      password = await showPasswordDialog('解密导入配置', '请输入解密密码');
    } catch (err) {
      return { cancelled: true };
    }
    const isCryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
    if (!isCryptoAvailable) {
      throw new Error('当前环境不支持AES解密，请在HTTPS或localhost环境下导入加密文件');
    }
    try {
      return { data: await decryptConfigData(fileData.data, password) };
    } catch (e) {
      throw new Error('解密失败: 密码错误或文件已损坏');
    }
  } else if (fileData.data && fileData.encoding === 'base64') {
    // Base64编码文件
    try {
      const decoded = decodeURIComponent(escape(atob(fileData.data)));
      return { data: JSON.parse(decoded) };
    } catch (e) {
      throw new Error('Base64解码失败: 文件已损坏');
    }
  } else {
    // 未加密文件
    return { data: fileData };
  }
};

// 通用加密导出（弹出密码框 → 加密/Base64 → 下载）
const encryptAndDownload = async (exportData, filename) => {
  let password;
  try {
    password = await showPasswordDialog('加密导出配置', '请输入加密密码（至少6位）');
  } catch (e) {
    return false; // 用户取消
  }
  if (password.length < 6) {
    message.error('密码长度至少6位');
    return false;
  }

  const isCryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
  let finalExportFile;
  if (isCryptoAvailable) {
    const encryptedData = await encryptConfigData(exportData, password);
    finalExportFile = {
      encrypted: true,
      version: exportData.version,
      exportTime: new Date().toISOString(),
      data: encryptedData,
    };
  } else {
    console.warn('crypto.subtle不可用，使用Base64编码导出');
    const jsonStr = JSON.stringify(exportData);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    finalExportFile = {
      encrypted: false,
      version: exportData.version,
      exportTime: new Date().toISOString(),
      encoding: "base64",
      data: encoded,
    };
  }

  const blob = new Blob([JSON.stringify(finalExportFile, null, 2)], { type: "application/json" });
  const success = await downloadFile(blob, filename);
  return success;
};

// 获取完整的batchSettings导出对象
const getFullBatchSettings = () => ({
  boxCount: batchSettings.boxCount,
  fishCount: batchSettings.fishCount,
  recruitCount: batchSettings.recruitCount,
  defaultBoxType: batchSettings.defaultBoxType,
  defaultFishType: batchSettings.defaultFishType,
  targetBoxRounds: batchSettings.targetBoxRounds,
  receiverId: batchSettings.receiverId || "",
  carMinColor: batchSettings.carMinColor,
  tokenListColumns: batchSettings.tokenListColumns,
  autoColumns: batchSettings.autoColumns,
  useGoldRefreshFallback: batchSettings.useGoldRefreshFallback,
  commandDelay: batchSettings.commandDelay,
  taskDelay: batchSettings.taskDelay,
  dailySubtaskDelay: batchSettings.dailySubtaskDelay,
  rewardClaimDelay: batchSettings.rewardClaimDelay,
  actionDelay: batchSettings.actionDelay,
  battleDelay: batchSettings.battleDelay,
  refreshDelay: batchSettings.refreshDelay,
  longDelay: batchSettings.longDelay,
  taskIntervalWait: batchSettings.taskIntervalWait,
  batchIntervalWait: batchSettings.batchIntervalWait,
  maxActive: batchSettings.maxActive,
  connectionTimeout: batchSettings.connectionTimeout,
  reconnectDelay: batchSettings.reconnectDelay,
  maxLogEntries: batchSettings.maxLogEntries,
  enableRefresh: batchSettings.enableRefresh,
  refreshInterval: batchSettings.refreshInterval,
  smartDepartureEnabled: batchSettings.smartDepartureEnabled,
  smartDepartureGoldThreshold: batchSettings.smartDepartureGoldThreshold,
  smartDepartureRecruitThreshold: batchSettings.smartDepartureRecruitThreshold,
  smartDepartureJadeThreshold: batchSettings.smartDepartureJadeThreshold,
  smartDepartureTicketThreshold: batchSettings.smartDepartureTicketThreshold,
  requireMinColorWithConditions: batchSettings.requireMinColorWithConditions,
  tokensPerPage: batchSettings.tokensPerPage,
  logPageSize: batchSettings.logPageSize,
  defaultCommandTimeout: batchSettings.defaultCommandTimeout,
  battleCommandTimeout: batchSettings.battleCommandTimeout,
  defaultRetryCount: batchSettings.defaultRetryCount,
  retryDelay: batchSettings.retryDelay,
  accountRetryInterval: batchSettings.accountRetryInterval,
  hangUpMinTime: batchSettings.hangUpMinTime,
  hangUpTimeControlEnabled: batchSettings.hangUpTimeControlEnabled,
  petMergeMaxLevelEnabled: batchSettings.petMergeMaxLevelEnabled,
  petMergeMaxLevel: batchSettings.petMergeMaxLevel,
  dreamPurchaseList: batchSettings.dreamPurchaseList,
  singleAccountSpeedUp: batchSettings.singleAccountSpeedUp,
  singleAccountMultiplier: batchSettings.singleAccountMultiplier,
  delayGroups: { ...batchSettings.delayGroups },
  moduleDelays: { ...batchSettings.moduleDelays },
  manualBuyItems: batchSettings.manualBuyItems || [],
  collectionExchangeItems: batchSettings.collectionExchangeItems || [],
  batchTaskTimeout: batchSettings.batchTaskTimeout,
  cdkCode: batchSettings.cdkCode || '',
  skinChallengeMaxFail: batchSettings.skinChallengeMaxFail,
});

// 加密配置数据
const encryptConfigData = async (data, password) => {
  try {
    // 将数据转为JSON字符串
    const jsonStr = JSON.stringify(data);
    
    // 使用Web Crypto API进行AES-GCM加密
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    
    // 从密码生成密钥
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密数据
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    // 将IV和加密数据组合: IV(12 bytes) + 加密数据
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    // 转为Base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败: ' + error.message);
  }
};

// 解密配置数据
const decryptConfigData = async (encryptedData, password) => {
  try {
    // Base64解码
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // 提取IV和加密数据
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // 从密码生成密钥
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBuffer
    );
    
    // 转为JSON对象
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败: 密码错误或文件已损坏');
  }
};

// 显示密码输入对话框
const showPasswordDialog = (title, placeholder) => {
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    dialog.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        min-width: 400px;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      ">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">${title}</h3>
        <input 
          id="password-input" 
          type="password" 
          placeholder="${placeholder}"
          style="
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 16px;
          "
        />
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-btn" style="
            padding: 8px 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 14px;
          ">取消</button>
          <button id="confirm-btn" style="
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            background: #2080f0;
            color: white;
            cursor: pointer;
            font-size: 14px;
          ">确定</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const input = dialog.querySelector('#password-input');
    const cancelBtn = dialog.querySelector('#cancel-btn');
    const confirmBtn = dialog.querySelector('#confirm-btn');
    
    input.focus();
    
    // 回车键确认
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
    
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
      reject(new Error('用户取消'));
    };
    
    confirmBtn.onclick = () => {
      const password = input.value.trim();
      if (!password) {
        input.style.borderColor = '#ff4d4f';
        input.placeholder = '密码不能为空';
        return;
      }
      document.body.removeChild(dialog);
      resolve(password);
    };
  });
};

// Export account configuration only
const exportAccountConfig = async () => {
  try {
    if (!tokens.value || !Array.isArray(tokens.value) || tokens.value.length === 0) {
      message.warning("没有可导出的账号");
      return;
    }

    // 收集BIN数据
    const { binDataMap, skippedTokens: exportSkipped } = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    const totalBinTokens = tokens.value.filter(t => t.importMethod === "bin" || t.importMethod === "wxQrcode").length;
    if (totalBinTokens > 0 && binCount < totalBinTokens) {
      console.warn(`BIN数据不完整: ${binCount}/${totalBinTokens} 个token有BIN数据`);
    }
    if (exportSkipped.length > 0) {
      message.warning(`以下账号缺少BIN数据，刷新Token可能失败：${exportSkipped.join('、')}`, { duration: 8000 });
    }

    const exportData = {
      version: "1.5",
      exportTime: new Date().toISOString(),
      configType: "accounts",
      tokens: mapTokensForExport(tokens.value),
      tokenSettings: collectTokenSettings(tokens.value),
      binData: binDataMap,
    };

    const filename = `account-config-encrypted_${new Date().toISOString().slice(0, 10)}.json`;
    const success = await encryptAndDownload(exportData, filename);

    if (success === false) return; // 用户取消或密码太短
    if (success) {
      const isInApk = window.Capacitor !== undefined;
      const binMsg = binCount > 0 ? ` (含${binCount}个BIN数据)` : '';
      message.success(
        `账号配置导出成功: ${tokens.value.length} 个账号${binMsg}${isInApk ? '，请查看分享对话框保存' : ''}`,
        { duration: 4000 }
      );
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Export accounts failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// Import account configuration only
const importAccountConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    let importData;

    try {
      const result = await parseExportFile(fileContent);
      if (result.cancelled) return;
      importData = result.data;
    } catch (e) {
      message.error(e.message);
      return;
    }

    // 验证结构
    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "accounts") {
      message.error("这是定时配置文件，请使用「导入定时配置」功能");
      return;
    }
    if (!importData.tokens && !importData.configType) {
      message.error("无效的账号配置文件格式");
      return;
    }

    let importedTokens = 0;
    let skippedTokens = 0;
    const tokenIdMapping = {};

    // 导入tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      if (!gameTokens.value || !Array.isArray(gameTokens.value)) {
        message.error("账号数据存储异常，请刷新页面后重试");
        return;
      }

      importData.tokens.forEach((token) => {
        if (!token.token) {
          console.warn('跳过无效token：缺少token字段', token.name || token.id);
          return;
        }
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) {
          skippedTokens++;
          // 建立映射：找到目标设备上的实际token ID
          const actualToken = gameTokens.value.find(t => t.token === token.token || t.id === token.id);
          if (actualToken) {
            tokenIdMapping[token.id] = actualToken.id;
          }
          // 如果已存在但有更新的BIN数据importMethod，保留原始importMethod
          return;
        }
        const newId = token.id || "token_" + Date.now() + Math.random().toString(36).slice(2);
        gameTokens.value.push({
          id: newId,
          name: token.name || "",
          token: token.token,
          server: token.server || "",
          wsUrl: token.wsUrl || null,
          remark: token.remark || "",
          importMethod: token.importMethod || "manual",
          sourceUrl: token.sourceUrl || null,
          avatar: token.avatar || null,
          upgradedToPermanent: token.upgradedToPermanent || false,
          upgradedAt: token.upgradedAt || null,
          updatedAt: token.updatedAt || new Date().toISOString(),
          createdAt: token.createdAt || new Date().toISOString(),
          lastUsed: token.lastUsed || new Date().toISOString(),
          expiresAt: token.expiresAt || null,
          lastRefreshAt: token.lastRefreshAt || null,
        });
        tokenIdMapping[token.id] = newId;
        importedTokens++;
      });
    }

    // 导入BIN数据到IndexedDB
    let importedBinCount = 0;
    if (importData.binData && Object.keys(importData.binData).length > 0) {
      const binResult = await importBinData(importData.binData, tokenIdMapping, importData.tokens);
      importedBinCount = binResult.importedCount;
      if (importedBinCount > 0) {
        console.log(`成功导入 ${importedBinCount} 个BIN数据`);
      }
      if (binResult.skippedTokens && binResult.skippedTokens.length > 0) {
        message.warning(`以下账号BIN数据导入失败：${binResult.skippedTokens.join('、')}`, { duration: 8000 });
      }
    } else {
      // 兼容旧版：没有binData字段
      const binTokens = (importData.tokens || []).filter(t =>
        (t.importMethod === "bin" || t.importMethod === "wxQrcode") &&
        gameTokens.value.some(gt => gt.id === t.id)
      );
      if (binTokens.length > 0) {
        console.warn(`配置文件版本较低(${importData.version})，不包含BIN数据`);
        message.warning(
          `${binTokens.length}个bin/wxQrcode类型的token缺少BIN数据，可能无法正常刷新Token。建议重新导入原始BIN文件。`,
          { duration: 6000 }
        );
      }
    }

    // 导入token设置
    const settingsCount = importTokenSettings(importData.tokenSettings, tokenIdMapping);

    // 构建成功消息
    const parts = [];
    if (importedTokens > 0) parts.push(`${importedTokens} 个新账号`);
    if (skippedTokens > 0) parts.push(`${skippedTokens} 个已存在跳过`);
    if (importedBinCount > 0) parts.push(`${importedBinCount} 个BIN数据`);
    if (settingsCount > 0) parts.push(`${settingsCount} 个任务配置`);
    const encryptTag = importData.version >= "1.4" ? ' [加密文件]' : '';

    message.success(`账号导入成功: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Import accounts failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// 全量导出（账号 + 定时任务 + 批量设置 + BIN数据 + 管理分组）
const exportConfig = async () => {
  try {
    if (!tokens.value || tokens.value.length === 0) {
      message.warning("没有可导出的数据");
      return;
    }

    const validTokenIds = new Set(tokens.value.map((t) => t.id));
    const filteredScheduledTasks = (scheduledTasks.value || []).map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((task) => task.taskType === 'push_map' || task.selectedTokens.length > 0);

    const { binDataMap, skippedTokens: exportSkipped } = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    if (exportSkipped.length > 0) {
      message.warning(`以下账号缺少BIN数据，刷新Token可能失败：${exportSkipped.join('、')}`, { duration: 8000 });
    }

    // 排序配置
    let sortConfigData = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) sortConfigData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 管理分组数据（过滤掉无有效token的分组）
    const filteredGroups = (tokenGroups.value || []).map((group) => ({
      ...group,
      tokenIds: group.tokenIds?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((group) => group.tokenIds.length > 0);

    // 十殿预设数据
    let nightmarePresetsData = null;
    try {
      const saved = localStorage.getItem('nightmare-presets');
      if (saved) nightmarePresetsData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 游戏登录页分组数据
    let loginGroupsData = null;
    try {
      const saved = localStorage.getItem('loginGroups');
      if (saved) loginGroupsData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 阵容助手保存数据（按 token.id 收集）
    const lineupDataMap = {};
    tokens.value.forEach((token) => {
      try {
        const saved = localStorage.getItem(`saved_lineups_${token.id}`);
        if (saved) {
          const lineups = JSON.parse(saved);
          if (Array.isArray(lineups) && lineups.length > 0) {
            lineupDataMap[token.id] = lineups;
          }
        }
      } catch (e) { /* ignore */ }
    });

    const exportData = {
      version: "2.5",
      exportTime: new Date().toISOString(),
      configType: "full",
      tokens: mapTokensForExport(tokens.value),
      scheduledTasks: filteredScheduledTasks,
      batchSettings: getFullBatchSettings(),
      tokenSettings: collectTokenSettings(tokens.value),
      binData: binDataMap,
      sortConfig: sortConfigData,
      tokenGroups: filteredGroups,
      taskTemplates: taskTemplates.value || [],
      nightmarePresets: nightmarePresetsData || [],
      lineups: lineupDataMap,
      loginGroups: loginGroupsData || [],
    };

    const filename = `xyzw_full_config_${new Date().toISOString().slice(0, 10)}.json`;
    const success = await encryptAndDownload(exportData, filename);

    if (success === false) return;
    if (success) {
      const binMsg = binCount > 0 ? ` (含${binCount}个BIN数据)` : '';
      const groupMsg = filteredGroups.length > 0 ? `, ${filteredGroups.length} 个分组` : '';
      const templateMsg = (taskTemplates.value || []).length > 0 ? `, ${(taskTemplates.value || []).length} 个任务模板` : '';
      const nmMsg = (nightmarePresetsData || []).length > 0 ? `, ${(nightmarePresetsData || []).length} 个十殿预设` : '';
      const lineupCount = Object.values(lineupDataMap).reduce((sum, arr) => sum + arr.length, 0);
      const lineupMsg = lineupCount > 0 ? `, ${lineupCount} 个阵容` : '';
      message.success(
        `全量导出成功: ${tokens.value.length} 个账号, ${filteredScheduledTasks.length} 个定时任务${groupMsg}${templateMsg}${nmMsg}${lineupMsg}${binMsg}`,
        { duration: 4000 }
      );
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Full export failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// 全量导入（账号 + 定时任务 + 批量设置 + BIN数据 + 管理分组 + 任务模板 + 十殿预设）
const importConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    let importData;

    try {
      const result = await parseExportFile(fileContent);
      if (result.cancelled) return;
      importData = result.data;
    } catch (e) {
      message.error(e.message);
      return;
    }

    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }

    const stats = { tokens: 0, tasks: 0, bin: 0, settings: 0, groups: 0, templates: 0, nightmare: 0, lineups: 0, loginGroups: 0 };
    const tokenIdMapping = {};

    // 导入tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      importData.tokens.forEach((token) => {
        if (!token.token) return;
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) {
          // 建立映射：找到目标设备上的实际token ID
          const actualToken = gameTokens.value.find(t => t.token === token.token || t.id === token.id);
          if (actualToken) {
            tokenIdMapping[token.id] = actualToken.id;
          }
          return;
        }
        const newId = token.id || "token_" + Date.now() + Math.random().toString(36).slice(2);
        gameTokens.value.push({
          id: newId,
          name: token.name || "",
          token: token.token,
          server: token.server || "",
          wsUrl: token.wsUrl || null,
          remark: token.remark || "",
          importMethod: token.importMethod || "manual",
          sourceUrl: token.sourceUrl || null,
          avatar: token.avatar || null,
          upgradedToPermanent: token.upgradedToPermanent || false,
          upgradedAt: token.upgradedAt || null,
          updatedAt: token.updatedAt || new Date().toISOString(),
          createdAt: token.createdAt || new Date().toISOString(),
          lastUsed: token.lastUsed || new Date().toISOString(),
          expiresAt: token.expiresAt || null,
          lastRefreshAt: token.lastRefreshAt || null,
        });
        tokenIdMapping[token.id] = newId;
        stats.tokens++;
      });
    }

    // 导入BIN数据
    if (importData.binData) {
      const binResult = await importBinData(importData.binData, tokenIdMapping, importData.tokens);
      stats.bin = binResult.importedCount;
      if (binResult.skippedTokens && binResult.skippedTokens.length > 0) {
        message.warning(`以下账号BIN数据导入失败：${binResult.skippedTokens.join('、')}`, { duration: 8000 });
      }
    }

    // 导入定时任务
    if (Array.isArray(importData.scheduledTasks)) {
      // 构建本地有效token ID集合
      const localTokenIds = new Set(gameTokens.value.map(t => t.id));

      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          // 用tokenIdMapping修复跨设备token ID，并过滤本地不存在的账号
          if (Array.isArray(task.selectedTokens)) {
            task.selectedTokens = task.selectedTokens
              .map(id => tokenIdMapping[id] || id)  // 优先使用映射后的ID
              .filter(id => localTokenIds.has(id));  // 只保留本地存在的
          }
          scheduledTasks.value.push(task);
          stats.tasks++;
        }
      });
      if (stats.tasks > 0) saveScheduledTasks();
    }

    // 导入批量设置
    if (importData.batchSettings && typeof importData.batchSettings === 'object') {
      const importedBatch = { ...importData.batchSettings };
      // 深度合并 moduleDelays / delayGroups，保留新增模块的默认值
      if (importedBatch.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, importedBatch.moduleDelays);
        delete importedBatch.moduleDelays;
      }
      if (importedBatch.delayGroups && batchSettings.delayGroups) {
        Object.assign(batchSettings.delayGroups, importedBatch.delayGroups);
        delete importedBatch.delayGroups;
      }
      Object.assign(batchSettings, importedBatch);
      // 运行时标志不导入
      batchSettings.singleAccountMode = false;
      try { localStorage.setItem("batchSettings", JSON.stringify(batchSettings)); } catch (e) { /* ignore */ }
    }

    // 导入token设置（含 helperPresets 等全部账号任务设置）
    if (importData.tokenSettings) {
      stats.settings = importTokenSettings(importData.tokenSettings, tokenIdMapping);
    }

    // 导入排序配置
    if (importData.sortConfig) {
      try { localStorage.setItem("tokenSortConfig", JSON.stringify(importData.sortConfig)); } catch (e) { /* ignore */ }
    }

    // 导入管理分组
    if (Array.isArray(importData.tokenGroups) && importData.tokenGroups.length > 0) {
      const existingGroupIds = new Set(tokenGroups.value.map((g) => g.id));
      // 构建本地有效token ID集合（用于过滤分组中的无效账号）
      const localTokenIdsForGroups = new Set(gameTokens.value.map(t => t.id));

      importData.tokenGroups.forEach((group) => {
        if (!group.id || !group.name) return;
        // 过滤分组中的无效tokenIds：先映射跨设备ID，再只保留本地存在的
        const validTokenIds = (group.tokenIds || [])
          .map(id => tokenIdMapping[id] || id)
          .filter(id => localTokenIdsForGroups.has(id));

        if (existingGroupIds.has(group.id)) {
          // 已存在的分组：合并tokenIds（去重）
          const existing = tokenGroups.value.find((g) => g.id === group.id);
          if (existing) {
            const mergedIds = new Set([...(existing.tokenIds || []), ...validTokenIds]);
            existing.tokenIds = [...mergedIds];
            existing.updatedAt = new Date().toISOString();
            stats.groups++;
          }
        } else {
          // 新分组：使用过滤后的tokenIds
          tokenGroups.value.push({
            id: group.id,
            name: group.name,
            color: group.color || '#18a058',
            tokenIds: validTokenIds,
            createdAt: group.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.groups++;
        }
      });
    }

    // 导入任务模板
    if (Array.isArray(importData.taskTemplates) && importData.taskTemplates.length > 0) {
      const existingTemplates = taskTemplates.value || [];
      const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
      let importedTemplates = 0;
      importData.taskTemplates.forEach((template) => {
        if (!template.id || !template.name) return;
        if (existingTemplateIds.has(template.id)) return; // 跳过已存在的模板
        existingTemplates.push(template);
        importedTemplates++;
      });
      if (importedTemplates > 0) {
        taskTemplates.value = existingTemplates;
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));
      }
      stats.templates = importedTemplates;
    }

    // 导入十殿预设
    if (Array.isArray(importData.nightmarePresets) && importData.nightmarePresets.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('nightmare-presets') || '[]');
        const existingIds = new Set(existing.map((p) => p.id));
        let added = 0;
        importData.nightmarePresets.forEach((p) => {
          if (!p.id || !p.name) return;
          if (existingIds.has(p.id)) return;
          // 补充缺失的卡点/队伍默认值
          if (p.waitLevel8 === undefined) p.waitLevel8 = false;
          if (p.usePresetTeam === undefined) p.usePresetTeam = true;
          if (!p.teamSlots) p.teamSlots = {};
          if (!p.levelConfig) p.levelConfig = {};
          if (!p.memberTokenIds) p.memberTokenIds = [];
          existing.push(p);
          added++;
        });
        if (added > 0) {
          localStorage.setItem('nightmare-presets', JSON.stringify(existing));
          stats.nightmare = added;
        }
      } catch (e) { /* ignore */ }
    }

    // 导入阵容数据
    if (importData.lineups && typeof importData.lineups === 'object') {
      for (const [oldTokenId, lineups] of Object.entries(importData.lineups)) {
        if (!Array.isArray(lineups) || lineups.length === 0) continue;
        const newTokenId = tokenIdMapping[oldTokenId] || oldTokenId;
        try {
          localStorage.setItem(`saved_lineups_${newTokenId}`, JSON.stringify(lineups));
          stats.lineups += lineups.length;
        } catch (e) { /* ignore */ }
      }
    }

    // 导入游戏登录页分组
    if (Array.isArray(importData.loginGroups) && importData.loginGroups.length > 0) {
      try {
        const existingLoginGroups = JSON.parse(localStorage.getItem('loginGroups') || '[]');
        const existingLgIds = new Set(existingLoginGroups.map((g) => g.id));
        const localTokenIdsForLg = new Set(gameTokens.value.map((t) => t.id));
        importData.loginGroups.forEach((group) => {
          if (!group.id || !group.name) return;
          // 映射跨设备ID并过滤本地不存在的账号
          const validTokenIds = (group.tokenIds || [])
            .map((id) => tokenIdMapping[id] || id)
            .filter((id) => localTokenIdsForLg.has(id));
          if (existingLgIds.has(group.id)) {
            // 已存在的分组：合并tokenIds（去重）
            const existing = existingLoginGroups.find((g) => g.id === group.id);
            if (existing) {
              existing.tokenIds = [...new Set([...(existing.tokenIds || []), ...validTokenIds])];
              stats.loginGroups++;
            }
          } else {
            existingLoginGroups.push({
              id: group.id,
              name: group.name,
              color: group.color || '#1677ff',
              tokenIds: validTokenIds,
            });
            stats.loginGroups++;
          }
        });
        if (stats.loginGroups > 0) {
          localStorage.setItem('loginGroups', JSON.stringify(existingLoginGroups));
        }
      } catch (e) { /* ignore */ }
    }

    // 构建消息
    const parts = [];
    if (stats.tokens > 0) parts.push(`${stats.tokens} 个新账号`);
    if (stats.tasks > 0) parts.push(`${stats.tasks} 个定时任务`);
    if (stats.groups > 0) parts.push(`${stats.groups} 个分组`);
    if (stats.templates > 0) parts.push(`${stats.templates} 个任务模板`);
    if (stats.nightmare > 0) parts.push(`${stats.nightmare} 个十殿预设`);
    if (stats.lineups > 0) parts.push(`${stats.lineups} 个阵容`);
    if (stats.loginGroups > 0) parts.push(`${stats.loginGroups} 个登录分组`);
    if (stats.bin > 0) parts.push(`${stats.bin} 个BIN数据`);
    if (stats.settings > 0) parts.push(`${stats.settings} 个任务配置`);
    if (parts.length === 0) parts.push('无新增数据（已存在）');
    const encryptTag = importData.version >= "1.4" && importData.encrypted !== undefined ? ' [加密文件]' : '';

    message.success(`全量导入成功: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Full import failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 注: parseCronField, calculateNextExecutionTime, formatTimeDifference 已从 @/utils/batch 导入

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});
let _componentUnmounted = false; // 组件卸载标志，防止 interval 回调在销毁后继续访问响应式数据

// Update countdowns for all tasks
const updateCountdowns = () => {
  if (_componentUnmounted) return; // 组件已卸载，直接退出
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    if (
      !nextExecutionTimes.value[task.id] ||
      nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000, // Less than 5 minutes
      };
    }
  });
};

// 计算最短倒计时任务
const shortestCountdownTask = computed(() => {
  if (scheduledTasks.value.length === 0) return null;

  let shortestTask = null;
  let shortestTime = Infinity;

  // 遍历所有任务，找到倒计时最短的任务
  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) return;

    const countdown = taskCountdowns.value[task.id];
    if (countdown && countdown.remainingTime < shortestTime) {
      shortestTime = countdown.remainingTime;
      shortestTask = {
        task,
        countdown,
      };
    }
  });

  return shortestTask;
});

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

// ======================
// Scheduled Tasks Scheduler
// ======================

// Initialize scheduled tasks from localStorage
loadScheduledTasks();

// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  (newVal) => {
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// 修复TimePicker的"Invalid time value"错误：确保runTime的初始值不是null
watch(
  () => showTaskModal.value,
  (isVisible) => {
    if (isVisible && !taskForm.runTime) {
      // 当模态框显示且runTime为null时，将其设置为undefined
      taskForm.runTime = undefined;
    }
  },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
let scheduledTaskStartTime = null; // ✅ 单独跟踪定时任务开始时间，用于超时检测 
const pageLoadTime = Date.now();

// 跟踪定时任务是否正在执行
const isScheduledTaskRunning = ref(false);

// 定时任务执行完成情况记录
const taskExecutionRecords = ref([]);
const showTaskRecordsModal = ref(false);

// 展示用记录：去重（startTime+name）后按开始时间倒序（最新在前），避免合并历史记录后顺序错乱和重复项
const sortedTaskRecords = computed(() => {
  const seen = new Set();
  const unique = [];
  for (const r of taskExecutionRecords.value) {
    const id = `${r.startTime}-${r.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(r);
  }
  return unique.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
});

// 打开任务完成情况Modal（重新加载数据）
const openTaskRecordsModal = () => {
  // ✅ 从 localStorage 加载历史记录
  const loadedRecords = loadTaskExecutionRecordsFromStorage();
  
  // ✅ 获取内存中所有记录的 startTime（用于去重）
  const memoryRecordIds = new Set(
    taskExecutionRecords.value.map(r => `${r.startTime}-${r.name}`)
  );
  
  // ✅ 过滤掉 localStorage 中已在内存中的记录（避免重复）
  const newRecordsFromStorage = loadedRecords.filter(r => {
    const recordId = `${r.startTime}-${r.name}`;
    return !memoryRecordIds.has(recordId);
  });
  
  // ✅ 合并：内存中的记录（最新） + localStorage 中的新记录
  if (newRecordsFromStorage.length > 0) {
    taskExecutionRecords.value = [...taskExecutionRecords.value, ...newRecordsFromStorage];
    console.log(`[定时任务] 打开任务完成情况，内存 ${taskExecutionRecords.value.length - newRecordsFromStorage.length} 条 + localStorage ${newRecordsFromStorage.length} 条 = 共 ${taskExecutionRecords.value.length} 条记录`);
  } else {
    console.log(`[定时任务] 打开任务完成情况，共 ${taskExecutionRecords.value.length} 条记录（全部来自内存）`);
  }
  
  showTaskRecordsModal.value = true;
};

// 同步到全局，供推图循环 (pushMapRunner) 检测定时任务互斥
watch(isScheduledTaskRunning, (v) => { window._isScheduledTaskRunning = v; }, { immediate: true });
let currentScheduledTask = null; // 当前正在执行的定时任务
const pendingTaskQueue = []; // ✅ 待执行队列：当定时任务冲突时，排队等待执行
let _activeNightmareBattles = []; // ✅ 模块级引用：跟踪当前十殿战斗，用于超时传导停止

// =====================
// 任务完成情况持久化与自动清空机制
// =====================

// 从 localStorage 加载任务完成情况（支持查看历史所有记录）
const loadTaskExecutionRecordsFromStorage = () => {
  try {
    const savedData = localStorage.getItem('taskExecutionRecords');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // ✅ 不再限制日期，加载所有历史记录
      if (Array.isArray(parsed.records)) {
        console.log(`[定时任务] 加载任务执行情况，共 ${parsed.records.length} 条记录`);
        return parsed.records;
      }
    }
    return [];
  } catch (error) {
    console.error('[定时任务] 加载任务执行情况失败:', error);
    return [];
  }
};

// 保存任务完成情况到 localStorage（保存所有已完成记录，去重）
const saveTaskExecutionRecordsToStorage = () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // ✅ 先加载现有记录（如果有）
    let existingRecords = [];
    const savedData = localStorage.getItem('taskExecutionRecords');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed.records)) {
        existingRecords = parsed.records;
        console.log(`[定时任务] 加载现有记录 ${existingRecords.length} 条`);
      }
    }
    
    // ✅ 收集所有已完成的记录（running 状态的任务不保存）
    const completedRecords = taskExecutionRecords.value.filter(record => {
      return record.status !== 'running'; // 只跳过正在执行的任务
    });
    
    if (completedRecords.length > 0) {
      console.log(`[定时任务] 检测到 ${completedRecords.length} 条已完成记录，准备保存`);
      
      // ✅ 去重：使用 startTime + name 作为唯一标识，只添加 localStorage 中不存在的记录
      const existingRecordIds = new Set(
        existingRecords.map(r => `${r.startTime}-${r.name}`)
      );
      
      const newRecords = completedRecords.filter(record => {
        const recordId = `${record.startTime}-${record.name}`;
        return !existingRecordIds.has(recordId);
      });
      
      if (newRecords.length > 0) {
        // ✅ 合并新旧记录（只添加新记录）
        const allRecords = [...existingRecords, ...newRecords];
        
        const dataToSave = {
          date: todayStr,
          records: allRecords,
          updatedAt: now.toISOString(),
          totalRecords: allRecords.length
        };
        
        localStorage.setItem('taskExecutionRecords', JSON.stringify(dataToSave));
        console.log(`[定时任务] 已保存 ${newRecords.length} 条新记录，累计 ${allRecords.length} 条`);
      } else {
        console.log(`[定时任务] 无新记录需要保存（所有记录已存在于 localStorage）`);
      }
    } else {
      console.log(`[定时任务] 无已完成记录，跳过保存`);
    }
  } catch (error) {
    console.error('[定时任务] 保存任务执行情况到 localStorage 失败:', error);
  }
};

// 清空任务执行情况（内存 + localStorage + 折叠状态）
const clearTaskExecutionRecords = () => {
  // ✅ 执行中禁止清空：记录通过数组下标引用更新，清空会导致后续更新写入错误记录（时间/进度错乱）
  const hasRunning = taskExecutionRecords.value.some(r => r.status === 'running');
  if (hasRunning || isScheduledTaskRunning.value) {
    message.warning('有任务正在执行，请等待执行完成后再清空记录');
    return;
  }

  taskExecutionRecords.value = [];
  
  // 清除 localStorage
  localStorage.removeItem('taskExecutionRecords');
  
  message.success('任务完成记录已清空');
  console.log('[定时任务] 任务完成记录已清空');
};

/**
 * 为手动执行的批量功能添加任务完成记录
 * @param {string} taskName - 任务名称（如 'claimHangUpRewards'）
 * @param {string} taskLabel - 任务显示名称（如 '领取挂机'）
 * @param {Function} taskFunction - 实际执行的任务函数
 * @returns {Promise<void>}
 */
const executeManualTaskWithRecord = async (taskName, taskLabel, taskFunction) => {
  // ✅ 十殿阎罗挑战预设自带账号（队长 + 队员），无需额外选择账号
  const isNightmareChallenge = taskName === 'batchNightmareChallenge';
  
  // 十殿阎罗挑战：如果没有选择账号，直接打开弹窗（不创建任务记录）
  if (isNightmareChallenge && selectedTokens.value.length === 0) {
    await taskFunction();
    return;
  }
  
  if (!isNightmareChallenge && selectedTokens.value.length === 0) {
    message.warning('请先选择账号');
    return;
  }
  
  const taskStartTime = Date.now();
  const availableTokens = [...selectedTokens.value];

  // ✅ 单账号智能加速：仅1个账号时自动降低延迟
  if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
    batchSettings.singleAccountMode = true;
    const mult = batchSettings.singleAccountMultiplier;
    const token = tokens.value.find(t => t.id === availableTokens[0]);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
      type: 'info',
    });
  }
  
  // 清理本次执行相关的失败原因缓存
  availableTokens.forEach(tokenId => {
    delete tokenFailReasons.value[tokenId];
  });
  
  // 添加任务记录
  const taskRecordIndex = taskExecutionRecords.value.push({
    name: taskLabel,
    startTime: taskStartTime,
    endTime: null,
    elapsedStr: null,
    status: 'running',
    totalAccounts: availableTokens.length,
    successCount: 0,
    failCount: 0,
    runningCount: availableTokens.length,
    progressPercent: 0,
    failedAccounts: [],
    scheduledTime: null,
    isManual: true, // 标记为手动执行
  }) - 1;
  
  // 监听 tokenStatus 变化，实时更新成功/失败计数
  const updateProgressFromTokenStatus = () => {
    let successCount = 0;
    let failCount = 0;
    let runningCount = 0;
    const failedAccounts = [];
    
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') {
        successCount++;
      } else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
        runningCount++;
      }
    });
    
    // 更新任务记录
    if (taskExecutionRecords.value[taskRecordIndex]) {
      taskExecutionRecords.value[taskRecordIndex].successCount = successCount;
      taskExecutionRecords.value[taskRecordIndex].failCount = failCount;
      taskExecutionRecords.value[taskRecordIndex].runningCount = runningCount;
      taskExecutionRecords.value[taskRecordIndex].failedAccounts = failedAccounts;
      
      // 更新进度百分比
      const completed = successCount + failCount;
      const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
      taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
  };
  
  // 设置定时器，每500ms更新一次进度
  const progressTimer = setInterval(updateProgressFromTokenStatus, 500);
  
  try {
    // 执行任务函数
    await taskFunction();
    
    // ✅ 修复：任务完成后，检查所有账号的 status，将仍然 running/waiting 的账号标记为 failed
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
        tokenStatus.value[tokenId] = "failed";
        tokenFailReasons.value[tokenId] = '任务完成但状态未更新，可能执行卡住';
        const token = tokens.value.find(t => t.id === tokenId);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ ${token?.name || '未知账号'} 任务完成但状态为 ${status}，标记为失败`,
          type: "warning",
        });
      }
    });
    
    // 最后一次更新进度
    updateProgressFromTokenStatus();
    
    // 任务成功完成
    const taskElapsed = Date.now() - taskStartTime;
    const taskElapsedStr = taskElapsed >= 60000
      ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
      : `${(taskElapsed / 1000).toFixed(1)}秒`;
    
    taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
    taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
    taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
    
    // ✅ 根据实际完成情况设置状态（而不是直接设置为 success）
    const record = taskExecutionRecords.value[taskRecordIndex];
    if (record.failCount === 0) {
      record.status = 'success'; // 全部成功
    } else if (record.successCount > 0 && record.failCount > 0) {
      record.status = 'partial'; // 部分完成
    } else {
      record.status = 'fail'; // 全部失败
    }
    
    // 保存任务完成情况到本地存储
    saveTaskExecutionRecordsToStorage();
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ ${taskLabel} 手动执行完成，用时：${taskElapsedStr}，成功：${taskExecutionRecords.value[taskRecordIndex].successCount}，失败：${taskExecutionRecords.value[taskRecordIndex].failCount}`,
      type: "success",
    });
  } catch (error) {
    // ✅ 修复：任务异常时，检查所有账号的 status，将仍然 running/waiting 的账号标记为 failed
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
        tokenStatus.value[tokenId] = "failed";
        tokenFailReasons.value[tokenId] = `任务异常: ${error.message?.substring(0, 50) || '未知错误'}`;
      }
    });
    
    // 最后一次更新进度
    updateProgressFromTokenStatus();
    
    // 任务执行失败
    const taskElapsed = Date.now() - taskStartTime;
    const taskElapsedStr = taskElapsed >= 60000
      ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
      : `${(taskElapsed / 1000).toFixed(1)}秒`;
    
    taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
    taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
    taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    
    // ✅ 根据实际完成情况设置状态（即使抛异常，也可能有部分账号成功）
    const record = taskExecutionRecords.value[taskRecordIndex];
    if (record.failCount === 0 && record.successCount === 0) {
      record.status = 'fail'; // 全部失败（无成功）
    } else if (record.successCount > 0 && record.failCount > 0) {
      record.status = 'partial'; // 部分完成
    } else if (record.successCount > 0) {
      record.status = 'success'; // 全部成功（虽然有异常但都成功了）
    } else {
      record.status = 'fail'; // 全部失败
    }
    
    // 保存任务完成情况到本地存储
    saveTaskExecutionRecordsToStorage();
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ ${taskLabel} 手动执行失败：${error.message}，成功：${taskExecutionRecords.value[taskRecordIndex].successCount}，失败：${taskExecutionRecords.value[taskRecordIndex].failCount}`,
      type: "error",
    });
  } finally {
    // 清除定时器
    clearInterval(progressTimer);
    // 重置单账号加速标志
    batchSettings.singleAccountMode = false;
  }
};

// 注册每天凌晨 00:00:00 自动清空的任务完成情况
const scheduleMidnightClear = () => {
  const clearAtMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // 计算距离明天凌晨的毫秒数
    const delay = tomorrow.getTime() - now.getTime();
    
    console.log(`[定时任务] 已调度任务完成情况自动清空，将在 ${Math.floor(delay / 1000 / 60 / 60)} 小时后执行`);
    
    setTimeout(() => {
      // 在午夜执行清空
      clearTaskExecutionRecords();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: '🌙 每日任务完成记录已自动清空（00:00:00）',
        type: 'info'
      });
      
      // 重新调度下一次自动清空
      scheduleMidnightClear();
    }, delay);
  };
  
  clearAtMidnight();
};

// 页面加载时恢复数据并调度自动清空
onMounted(() => {
  // 从 localStorage 加载当天的任务完成情况
  const loadedRecords = loadTaskExecutionRecordsFromStorage();
  if (loadedRecords.length > 0) {
    taskExecutionRecords.value = loadedRecords;
    console.log(`[定时任务] 页面加载时恢复了 ${loadedRecords.length} 条历史任务执行记录`);
  }
  
  // 调度每天凌晨自动清空
  scheduleMidnightClear();
});

// =====================
// 任务记录辅助函数
// =====================

// 格式化时间戳为可读时间
const formatTime = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

// 获取延迟文本
const getDelayText = (record) => {
  if (!record.scheduledTime || !record.startTime) return '--';
  const delay = record.startTime - record.scheduledTime;
  if (delay < 0) return '提前';
  const seconds = Math.floor(delay / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
};

// 获取延迟样式类
const getDelayClass = (record) => {
  if (!record.scheduledTime || !record.startTime) return '';
  const delay = record.startTime - record.scheduledTime;
  if (delay < 0) return 'tr-delay-early';
  if (delay < 30000) return 'tr-delay-normal'; // 30 秒内正常
  if (delay < 60000) return 'tr-delay-warning'; // 1 分钟内警告
  return 'tr-delay-error'; // 超过 1 分钟错误
};

// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // ✅ 修改：不再强制重置isRunning，只记录警告日志
  // 原因：日常任务多账号执行可能较长，但2小时无活动则认为卡死
  if (isRunning.value) {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000; // 2 hours ago
    if (lastTaskExecution && lastTaskExecution < twoHoursAgo) {
      console.warn(
        `[${new Date().toISOString()}] isRunning has been true for more than 2 hours without activity`,
      );
      // ✅ 修复：超时后强制重置 isRunning，防止调度器永远被阻塞
      // 之前只记录警告不重置，导致后续所有定时任务都无法执行
      if (!isScheduledTaskRunning.value) {
        // 仅在非定时任务执行时重置（定时任务有自己的状态管理）
        console.error(
          `[${new Date().toISOString()}] isRunning卡住超过2小时且无定时任务运行，强制重置`,
        );
        isRunning.value = false;
        currentRunningTokenId.value = null;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到 isRunning 卡住超过2小时，已强制重置（非定时任务状态） ===",
          type: "warning",
        });
      } else {
        // ✅ 定时任务超2小时仍运行，强制结束
        console.error(
          `[${new Date().toISOString()}] 定时任务卡住超过2小时，强制结束`,
        );
        shouldStop.value = true; // 通知正在执行的任务停止
        isScheduledTaskRunning.value = false;
        currentScheduledTask = null;
        scheduledTaskStartTime = null;
        isRunning.value = false;
        currentRunningTokenId.value = null;
        // 清理所有 runningTokens 状态并关闭 WebSocket 连接
        tokenStore.runningTokens.value.forEach(tokenId => {
          tokenStore.closeWebSocketConnection(tokenId);
          tokenStore.setTokenRunning(tokenId, false);
        });
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到定时任务执行已超过2小时，已强制结束当前任务 ===",
          type: "warning",
        });
      }
    }
  }
  
  // 兜底检查：isRunning=false 但 isScheduledTaskRunning 仍为 true（异常情况，如子任务 finally 已重置 isRunning 但外层未清理）
  if (!isRunning.value && isScheduledTaskRunning.value && scheduledTaskStartTime) {
    const elapsed = Date.now() - scheduledTaskStartTime;
    if (elapsed > 260 * 60 * 1000) {
      console.error(
        `[${new Date().toISOString()}] isRunning=false 但 isScheduledTaskRunning 已持续${Math.round(elapsed/60000)}分钟，重置状态`,
      );
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null;
      tokenStore.runningTokens.value.forEach(tokenId => {
        tokenStore.setTokenRunning(tokenId, false);
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 检测到 isRunning=false 但定时任务状态未清理（持续${Math.round(elapsed/60000)}分钟），已兜底重置 ===`,
        type: "warning",
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      // 必须同时检查批量任务、定时任务、以及队列中是否有待执行任务
      const hasRunningTask = isRunning.value || isScheduledTaskRunning.value || pendingTaskQueue.length > 0;
      if (!hasRunningTask) {
        console.log(`[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`);
        window.location.reload();
      } else {
         const reason = isRunning.value ? '批量任务' : isScheduledTaskRunning.value ? '定时任务' : '队列任务';
         console.log(`[${new Date().toISOString()}] Scheduled refresh postponed due to running ${reason}, will refresh after task completion`);
         // 标记需要在任务完成后刷新
         shouldRefreshAfterTask.value = true;
      }
    }
  }
};

// Start the scheduler
const startScheduler = () => {
  // Clear any existing interval first
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Check every 10 seconds instead of 60 seconds for more timely task execution
  intervalId.value = setInterval(() => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // ✅ 注意：不在此处 early return
      // 原因：如果 isRunning=true 时直接 return，调度器不会执行到第6596行的队列逻辑
      // 导致时间匹配的定时任务无法加入 pendingTaskQueue → 任务被静默丢弃
      // 改由后续逻辑判断：排队 or 跳过执行
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;
        let reason = "";

        // 注意：不上线时段检查移到executeScheduledTask函数中执行，避免每10秒循环检查

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
          reason = `currentTime=${nowTime}, taskTime=${taskTime}, match=${shouldRun}`;
        } else if (task.runType === "cron") {
          // Improved cron expression parsing using shared utility
          try {
             shouldRun = matchesCronExpression(task.cronExpression, now);
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
              error,
            );
            addLog({
              time: currentTime,
              message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
            // ✅ 防重复执行：检查此任务是否在最近1分钟内已触发
            const lastExecStr = localStorage.getItem(`lastTaskExecution_${task.id}`);
            if (lastExecStr) {
              const elapsed = now.getTime() - new Date(lastExecStr).getTime();
              if (elapsed < 60000) { // 1分钟内已执行过
                return;
              }
            }

            // ✅ 不上线时段检查（调度器层：最早拦截，避免任何副作用执行）
            if (task.offlineTimeEnabled && isInOfflineTime()) {
              addLog({
                time: currentTime,
                message: `🚫 定时任务 ${task.name} 处于不上线时段，跳过执行`,
                type: "warning",
              });
              return;
            }

            // ✅ 定时任务仅与其他定时任务互斥，不参与日常任务的互斥排队
            // 定时任务绝对优先：日常任务正在执行时，定时任务直接执行，日常任务自动暂停
            if (isScheduledTaskRunning.value && currentScheduledTask) {
              // 同一个定时任务正在执行，跳过
              if (currentScheduledTask.id === task.id) {
                return;
              }
              // ✅ 加入待执行队列（仅定时任务之间互斥）
              if (!pendingTaskQueue.some(t => t.id === task.id)) {
                pendingTaskQueue.push(task);
                addLog({
                  time: currentTime,
                  message: `⏸️ 定时任务 ${task.name} 加入待执行队列（当前: ${currentScheduledTask.name} 执行中，队列: ${pendingTaskQueue.length}）`,
                  type: "info",
                });
              }
              return;
            }
            
            // Update last execution time with timestamp
            localStorage.setItem(
              `lastTaskExecution_${task.id}`,
              now.toString(),
            );

            // ===== 推图任务：直接调用 pushStartAll，不走 executeScheduledTask 流程 =====
            if (task.taskType === 'push_map') {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏰ 推图定时触发：开始推图（${task.name}）`,
                type: "info",
              });
              window.$message?.success(`定时触发：自动开始推图`);
              pushStartAll().catch(e => console.error('[PushMap定时开始] 错误:', e));
              return; // 快速返回，不销耗调度器的“正在运行”状态
            }
            // ======================================================

            // 设置任务执行状态并立即更新lastTaskExecution
            isScheduledTaskRunning.value = true;
            currentScheduledTask = task;
            scheduledTaskStartTime = Date.now(); // ✅ 记录任务开始时间
            lastTaskExecution = Date.now();  // ✅ 在任务执行前立即更新
            
            // Execute the task (异步执行,不阻塞scheduler循环)
            executeScheduledTask(task).catch(error => {
              console.error(`[${new Date().toISOString()}] 定时任务执行未捕获错误:`, error);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 定时任务 ${task.name} 执行异常: ${error.message} ===`,
                type: "error",
              });
            }).finally(() => {
              // ✅ 确保任务完成后更新lastTaskExecution
              lastTaskExecution = Date.now();
              // ✅ 队列处理由 executeScheduledTask 自身的 finally 统一负责，此处不再重复处理
              // 避免双重队列处理导致竞态条件（同一任务被重复入队或状态冲突）
            });
        }
      });
      
      // ===== 推图任务停止时间检测 =====
      const nowTimeHHMM = now.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
      tasksToRun.forEach((task) => {
        if (task.taskType !== 'push_map' || !task.pushStopTime || !task.enabled) return;
        if (nowTimeHHMM !== task.pushStopTime) return;
        // 防重复：1分钟内已执行过
        const stopKey = `lastPushStopExecution_${task.id}`;
        const lastStop = localStorage.getItem(stopKey);
        if (lastStop && (now.getTime() - new Date(lastStop).getTime()) < 60000) return;
        localStorage.setItem(stopKey, now.toString());
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏰ 推图定时触发：停止推图（${task.name}）`,
          type: "warning",
        });
        window.$message?.warning(`定时触发：自动停止推图`);
        pushStopAll(true);
      });
      // =============================================
      
      // ✅ 调度器尼底：如果队列中有等待任务且当前无定时任务运行，主动消费队列（跳过已过期任务）
      // 定时任务优先：即使日常任务正在执行，定时任务也可以启动
      if (pendingTaskQueue.length > 0 && !isScheduledTaskRunning.value) {
        // 循环清理已过期任务，找到第一个有效的执行
        while (pendingTaskQueue.length > 0) {
          const peekTask = pendingTaskQueue[0];
          const timeCheck = isTaskTimeStillValid(peekTask, 60);

          if (!timeCheck.valid) {
            pendingTaskQueue.shift();
            addLog({
              time: currentTime,
              message: `⏰ 兜底跳过已过期队列任务: ${peekTask.name}（${timeCheck.reason}，剩余队列: ${pendingTaskQueue.length}）`,
              type: "warning",
            });
            continue;
          }

          // 找到有效任务，正式出队并执行
          const nextTask = pendingTaskQueue.shift();
          addLog({
            time: currentTime,
            message: `▶️ 调度器兜底：从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
            type: "info",
          });
          isScheduledTaskRunning.value = true;
          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          lastTaskExecution = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`兜底队列任务执行错误:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
          return; // 已找到有效任务并执行，退出兜底逻辑
        }

        // 队列全部过期，已清空
        if (pendingTaskQueue.length === 0) {
          addLog({
            time: currentTime,
            message: `✅ 兜底消费：队列中所有任务均已过期，已清空`,
            type: "info",
          });
        }
      }
    
      // ✅ 调度器统一处理延迟刷新：在所有任务处理和队列处理完毕后，检查是否需要刷新页面
      // 这样可以确保当前没有运行中的任务，且队列中没有待执行的任务
      if (shouldRefreshAfterTask.value && !isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        console.log(`[${new Date().toISOString()}] All tasks completed, executing postponed page refresh from scheduler tick`);
        shouldRefreshAfterTask.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 所有任务已完成，定时刷新页面将在 3 秒后执行...`,
          type: "info",
        });
        setTimeout(() => {
          // 再次确认没有新任务启动
          if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
            window.location.reload();
          } else {
            shouldRefreshAfterTask.value = true; // 重新标记，等待下次调度器检查
          }
        }, 3000);
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// 响应式列数计算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

// 计算响应式列数
const responsiveColumns = computed(() => {
  // 如果用户关闭了自动模式,使用手动设置的列数
  if (!batchSettings.autoColumns) {
    return batchSettings.tokenListColumns;
  }
  
  // 自动根据窗口宽度计算
  const width = windowWidth.value;
  
  if (width >= 1400) {
    return 4;  // 大屏幕(PC最大化): 4列
  } else if (width >= 1100) {
    return 3;  // 中等屏幕: 3列
  } else if (width >= 768) {
    return 2;  // 平板/小屏幕: 2列
  } else {
    return 1;  // 手机端: 1列
  }
});

// 同步响应式列数到batchSettings
watch(responsiveColumns, (newCols) => {
  if (batchSettings.autoColumns) {
    batchSettings.tokenListColumns = newCols;
  }
});

// 判断是否是最大化窗口（≥1400px）
const isMaximizedWindow = computed(() => {
  return windowWidth.value >= 1400;
});

// 处理手动调节每行数量
const handleManualColumnChange = () => {
  // 只有在最大化窗口时才允许手动调节
  if (isMaximizedWindow.value) {
    // 用户手动调节时，关闭自动模式
    if (batchSettings.autoColumns) {
      batchSettings.autoColumns = false;
    }
  } else {
    // 如果不是最大化窗口，恢复自动模式
    if (!batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
  }
};

// 窗口大小变化监听
let resizeTimer = null;
const handleResize = () => {
  // 防抖处理,避免频繁计算
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newWidth = window.innerWidth;
    windowWidth.value = newWidth;
    
    // 当窗口缩小到小于1400px时，自动开启自适应模式
    if (newWidth < 1400 && !batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
    // 当窗口放大到≥1400px时，如果之前是手动模式，保持手动模式
    // （用户可以通过输入框手动调节）
  }, 100);
};

// 响应式列数监听清理函数
let cleanupResponsiveColumns = null;
const setupResponsiveColumns = () => {
  // 立即计算一次窗口宽度，确保页面加载时就正确响应
  if (batchSettings.autoColumns) {
    windowWidth.value = window.innerWidth;
  }
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  // 使用 ResizeObserver 监听 body 大小变化(更精确)
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      windowWidth.value = window.innerWidth;
    });
    resizeObserver.observe(document.body);
    
    cleanupResponsiveColumns = () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  } else {
    cleanupResponsiveColumns = () => {
      window.removeEventListener('resize', handleResize);
    };
  }
};

// Debug: Log initial state when component mounts
onMounted(() => {
  _componentUnmounted = false; // HMR 重新挂载时重置标志
  // 初始化防休眠支持检测
  wakeLockSupported.value = wakeLockManager.isSupported();
  const envInfo = wakeLockManager.getEnvironmentInfo();
  console.log(`防休眠功能初始化 - 环境: ${envInfo.envName}, 支持: ${envInfo.supported}`);
  
  // ✅ 如果之前开启了防休眠，页面刷新后自动重新激活
  if (isWakeLockEnabled.value && wakeLockSupported.value) {
    console.log('检测到防休眠之前已开启，自动重新激活...');
    wakeLockManager.request().then(success => {
      if (success) {
        console.log('防休眠自动激活成功');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "🛡️ 防休眠已自动恢复（页面刷新后）",
          type: "success",
        });
      } else {
        console.warn('防休眠自动激活失败');
        isWakeLockEnabled.value = false;
        saveWakeLockState(false);
      }
    }).catch(err => {
      console.error('防休眠自动激活异常:', err);
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);
    });
  }
  
  // 加载保存的Token排序
  loadSavedTokenOrder();
  
  // 确保DOM加载完成后再计算响应式列数
  nextTick(() => {
    if (batchSettings.autoColumns) {
      windowWidth.value = window.innerWidth;
    }
  });
  
  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();

  // 加载后清理已失效的任务引用（所有函数已在 script setup 中定义）
  cleanupInvalidTaskReferences();

  // Start countdown timer
  startCountdown();
  loadTaskTemplates();
  // 启动自动刷新Token
  tokenStore.startAutoRefresh();
  
  // 启动响应式列数监听
  setupResponsiveColumns();

  // 检查是否需要自动打开十殿预设队列
  if (route.query.nextPreset === 'true') {
    try {
      const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
      if (queue.length > 0) {
        showNightmareChallengeModal.value = true;
        message.info(`预设队列剩余 ${queue.length} 个，正在继续执行...`);
      }
    } catch { /* ignore */ }
  }

  // 从战斗页面返回时自动打开十殿弹窗（读取后立即移除参数，防止刷新重复触发）
  if (route.query.openNightmare === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }

  // 启动响应式时间更新（每30秒更新一次，让活动开放时间computed属性正确响应）
  currentTimeTimer = setInterval(() => {
    currentTime.value = new Date();
  }, 30000);
});

// 监听路由变化：从战斗页返回时自动打开十殿挑战 Modal
watch(() => route.query.openNightmare, (val) => {
  if (val === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  _componentUnmounted = true; // 标记组件已卸载，阻止 interval 回调继续执行
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Cleanup task scheduler intervals
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // 清理响应式时间更新定时器
  if (currentTimeTimer) {
    clearInterval(currentTimeTimer);
    currentTimeTimer = null;
  }
  
  // 清理响应式列数监听
  if (cleanupResponsiveColumns) {
    cleanupResponsiveColumns();
  }
  
  // 清理防抖定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  
  // 停止自动刷新Token
  tokenStore.stopAutoRefresh();
  
  // 清理防休眠
  if (isWakeLockEnabled.value) {
    wakeLockManager.release().catch(err => {
      console.error('组件卸载时释放WakeLock失败:', err);
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "防休眠已自动关闭",
      type: "info",
    });
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();
};

// Verify task dependencies - 只验证基础依赖，WebSocket连接由具体任务函数处理
const verifyTaskDependencies = async (task) => {
  // 推图任务跳过普通验证
  if (task.taskType === 'push_map') return true;

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    // 处理函数名映射（下划线格式 -> 驼峰格式） 
    let functionName = taskName;
    if (taskName === 'weekly_market_buy') {
      functionName = 'weeklyMarketBuy';
    } else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
      // manual_buy 和 collection_exchange 直接使用下划线名称
      functionName = taskName;
    }
    
    let taskFunction;
    try {
      taskFunction = eval(functionName);
    } catch (e) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 任务函数不存在: ${taskName}（可能已被删除），跳过验证`,
        type: "warning",
      });
      continue;
    }
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 任务 "${taskName}" 不是可执行函数，跳过验证`,
        type: "warning",
      });
      continue;
    }
  }

  // 验证宝笱周任务是否在宝笱周执行
  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️  当前不是宝箱周，跳过宝箱周任务: ${task.selectedTasks.filter(t => boxWeeklyTasks.includes(t)).join(', ')}`,
      type: "warning",
    });
    // 返回true，但会在执行阶段跳过这些任务
  }

  // 直接使用所有选中的token，WebSocket连接由具体任务函数内部管理
  // ensureConnection函数会自动处理并行连接和连接池管理
  const connectedTokens = task.selectedTokens
    .filter((tokenId) => tokenStore.gameTokens.some((t) => t.id === tokenId))
    .map((tokenId) => {
      const tokenName = tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
      return { id: tokenId, name: tokenName };
    });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// 检查定时任务的时间是否仍然有效（队列任务被阻塞后不再符合执行时间时跳过）
const isTaskTimeStillValid = (task, toleranceMinutes = 2) => {
  const now = new Date();

  if (task.runType === "daily") {
    if (!task.runTime) return { valid: false, reason: "任务未配置执行时间" };
    const nowTime = now.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    // 完全匹配，立即有效
    if (nowTime === task.runTime) return { valid: true };

    const [taskH, taskM] = task.runTime.split(":").map(Number);
    const taskMinutes = taskH * 60 + taskM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const diffMinutes = nowMinutes - taskMinutes;

    // 在容差窗口内（0~toleranceMinutes分钟）仍有效
    if (diffMinutes >= 0 && diffMinutes <= toleranceMinutes) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `已过预定时间 ${task.runTime}（已超出 ${diffMinutes} 分钟，容差 ${toleranceMinutes} 分钟）`,
    };
  } else if (task.runType === "cron") {
    if (!task.cronExpression) return { valid: false, reason: "Cron表达式为空" };
    try {
      // Cron表达式：检查是否在容差窗口内匹配
      const matched = matchesCronExpression(task.cronExpression, now);
      if (matched) return { valid: true };
      // 往前检查容差分钟数
      for (let m = 1; m <= toleranceMinutes; m++) {
        const past = new Date(now.getTime() - m * 60 * 1000);
        if (matchesCronExpression(task.cronExpression, past)) {
          return { valid: true };
        }
      }
      return { valid: false, reason: `Cron任务已过执行时间窗口（容差 ${toleranceMinutes} 分钟）` };
    } catch {
      return { valid: false, reason: "Cron表达式解析失败" };
    }
  }

  return { valid: false, reason: "未知任务类型" };
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  // ✅ 在函数开始处就定义 availableTokens，确保 catch 块可以访问
  let availableTokens = [];
  
  // ✅ 在函数开始处就设置状态(调用者已设置,这里做防御性检查)
  if (!isScheduledTaskRunning.value) {
    isScheduledTaskRunning.value = true;
    currentScheduledTask = task;
  }

  // ✅ 防重复执行：无论从调度器还是队列/兜底路径进入，统一写入触发时间戳
  // 修复队列执行路径未写入 lastTaskExecution_ 导致同一分钟内重复执行的问题
  try {
    localStorage.setItem(`lastTaskExecution_${task.id}`, new Date().toString());
  } catch (e) { /* ignore */ }
  
  // ✅ 重置停止标志，防止用户手动停止后影响定时任务执行
  shouldStop.value = false;
  
  // ✅ 记录总执行开始时间
  const totalStartTime = Date.now();

  // ✅ 保留上次的任务执行记录（不覆盖，追加新记录）
  // taskExecutionRecords.value = [];  //  删除：不再清空
  
  // ✅ 保留本地存储（不清除，新记录会追加）
  // localStorage.removeItem('taskExecutionRecords');  // ❌ 删除：不再清除

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;  // ✅ finally块会清理状态
    }

    availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return tokens.value.some((t) => t.id === tokenId);
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !tokens.value.some((t) => t.id === tokenId);
      },
    );

    if (missingTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
      
      // ✅ 自动清除任务配置中不存在的Token
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `🗑️  正在从任务配置中清除 ${missingTokens.length} 个不存在的Token...`,
        type: "info",
      });
      
      // ✅ 同时清理 selectedTokens 和 connectedTokens，防止下次执行时从 selectedTokens 重新生成
      if (task.selectedTokens) {
        task.selectedTokens = task.selectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      if (task.connectedTokens) {
        task.connectedTokens = task.connectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      
      // 重新计算 availableTokens 使用清理后的数据
      availableTokens = (task.connectedTokens && task.connectedTokens.length > 0)
        ? task.connectedTokens
        : task.selectedTokens;
      
      // 保存到localStorage
      saveScheduledTasks();
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `✅ 已成功清除不存在的Token，当前任务配置剩余 ${availableTokens.length} 个Token`,
        type: "success",
      });
    }

    // 十殿预设任务自带账号，无需检查 availableTokens
    const taskHasNightmarePresets = task.selectedTasks.includes('batchNightmareChallengePresets') && (task.nightmarePresetIds?.length > 0);
    
    if (availableTokens.length === 0 && !taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
        type: "error",
      });
      return;  // ✅ finally块会清理状态
    }
    
    if (availableTokens.length === 0 && taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 使用十殿预设自带账号执行 ===`,
        type: "info",
      });
    }

    // ✅ 单账号智能加速（定时任务）
    if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
      batchSettings.singleAccountMode = true;
      const mult = batchSettings.singleAccountMultiplier;
      const token = tokens.value.find(t => t.id === availableTokens[0]);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
        type: 'info',
      });
    }

    // 任务执行前检查不上线时段（只检查一次）
    let isOfflineTime = false;
    if (task.offlineTimeEnabled) {
      isOfflineTime = isInOfflineTime();
      console.log('[Token检查] offlineTimeEnabled:', task.offlineTimeEnabled);
      console.log('[Token检查] isInOfflineTime:', isOfflineTime);
    }
    
    // 如果在不上线时段，跳过任务执行
    if (isOfflineTime) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 处于不上线时段，跳过执行 ===`,
        type: "warning",
      });
      return;  // ✅ finally块会清理状态
    }
    
    console.log('[Token检查] 是否跳过检查:', isOfflineTime);
    
    // ✅ 使用局部变量避免永久修改原始配置
    let activeTasks = [...task.selectedTasks];
    
    // 新增：检查任务是否包含活动周限制的任务
    const weirdTowerTasks = [
      "climbWeirdTower",
      "batchUseItems",
      "batchMergeItems",
      "batchClaimFreeEnergy",
      "claim_weird_tower_all",
      "claim_weird_tower_pass",
    ];
    
    // 如果任务列表中包含怪异塔任务，且不在黑市周，则跳过Token连接
    const hasWeirdTowerTask = task.selectedTasks.some(t => weirdTowerTasks.includes(t));
    
    if (hasWeirdTowerTask && !isWeirdTowerActivityOpen.value) {
      // 过滤掉不在活动周的任务
      const tasksInActivityWeek = task.selectedTasks.filter(t => !weirdTowerTasks.includes(t));
      
      if (tasksInActivityWeek.length === 0) {
        // 所有任务都是怪异塔任务，完全不需要连接
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 包含的任务都需要黑市周，但当前不在活动时间内，取消执行 ===`,
          type: "warning",
        });
        
        // 跳过Token连接，直接返回
        return;  // ✅ finally块会清理状态
      } else {
        // 有部分任务不在活动周，记录日志
        const skippedTasks = task.selectedTasks.filter(t => weirdTowerTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过不在活动周的任务: ${skippedLabels}`,
          type: "warning",
        });
        
        // ✅ 只执行在活动周的任务（使用局部变量，不修改原始配置）
        activeTasks = tasksInActivityWeek;
      }  
    }

    // ✅ 换皮闯关活动检测：在执行前检测，未开启就跳过整个任务
    const skinChallengeTasks = ["skinChallenge", "skinTreasure"];
    const hasSkinChallengeTask = activeTasks.some(t => skinChallengeTasks.includes(t));
    
    if (hasSkinChallengeTask && availableTokens.length > 0) {
      // 需要连接一个Token来检测活动是否开启
      const testTokenId = availableTokens[0];
      
      // ✅ 活动时间范围校验函数（根据 actId 前6位解析 YYMMDD，活动周期7天）
      const isActivityTimeValid = (rawActId) => {
        const idStr = String(rawActId);
        if (idStr.length < 6) return false;
        const year = 2000 + parseInt(idStr.substring(0, 2));
        const month = parseInt(idStr.substring(2, 4)) - 1;
        const day = parseInt(idStr.substring(4, 6));
        const startDate = new Date(year, month, day);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        const now = new Date();
        return now >= startDate && now < endDate;
      };
      
      try {
        await ensureConnection(testTokenId);
        const activityRes = await tokenStore.sendMessageWithPromise(
          testTokenId,
          "activity_get",
          {},
          5000,
        );
        const actEGameInfo = activityRes?.activity?.actEGameInfo || activityRes?.actEGameInfo;
        let isActivityOpen = false;
        let validActId = null;
        
        console.log('[换皮闯关检测] actEGameInfo:', actEGameInfo);
        
        if (actEGameInfo?.actId) {
          const rawActId = actEGameInfo.actId;
          // ✅ 严格校验：actEGameInfo 非空 + 活动时间范围内
          isActivityOpen = isActivityTimeValid(rawActId);
          if (isActivityOpen) {
            validActId = rawActId;
            // ✅ 成功检测，缓存结果
            try {
              localStorage.setItem('skinChallenge_activityCache', JSON.stringify({
                actId: Number(rawActId),
                timestamp: Date.now(),
              }));
            } catch {}
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ 换皮闯关活动已开启（actId: ${rawActId}）`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `🚫 换皮闯关活动已过期（actId: ${rawActId}，已不在7天周期内）`,
              type: "warning",
            });
          }
        } else {
          // ✅ actEGameInfo 为空，检查缓存并校验时间范围
          try {
            const cache = JSON.parse(localStorage.getItem('skinChallenge_activityCache') || 'null');
            if (cache?.actId && cache?.timestamp && (Date.now() - cache.timestamp) < 24 * 60 * 60 * 1000) {
              if (isActivityTimeValid(cache.actId)) {
                const hoursAgo = Math.round((Date.now() - cache.timestamp) / 3600000);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 活动检测返回空，但 ${hoursAgo}小时前缓存显示活动已开启(actId:${cache.actId})且时间未过期，继续执行`,
                  type: "warning",
                });
                isActivityOpen = true;
                validActId = cache.actId;
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🚫 活动检测返回空，缓存 actId:${cache.actId} 已过期，活动未开启`,
                  type: "warning",
                });
              }
            }
          } catch {}
        }
        
        if (!isActivityOpen) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 定时任务 ${task.name} 包含的任务都需要换皮闯关活动，但当前活动未开启，取消执行 ===`,
            type: "warning",
          });
          tokenStore.closeWebSocketConnection(testTokenId);
          return;  // ✅ finally块会清理状态
        }
        
        // 关闭测试连接，后续任务会按需连接
        tokenStore.closeWebSocketConnection(testTokenId);
      } catch (err) {
        console.error('[换皮闯关检测] 检测失败:', err);
        // ✅ 回退：请求失败时检查缓存并校验时间范围
        let useCache = false;
        try {
          const cache = JSON.parse(localStorage.getItem('skinChallenge_activityCache') || 'null');
          if (cache?.actId && cache?.timestamp && (Date.now() - cache.timestamp) < 24 * 60 * 60 * 1000) {
            if (isActivityTimeValid(cache.actId)) {
              const hoursAgo = Math.round((Date.now() - cache.timestamp) / 3600000);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚠️ 活动检测请求失败: ${err.message}，但 ${hoursAgo}小时前缓存显示活动已开启(actId:${cache.actId})且时间未过期，继续执行`,
                type: "warning",
              });
              useCache = true;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🚫 活动检测请求失败，缓存 actId:${cache.actId} 已过期，活动未开启`,
                type: "warning",
              });
            }
          }
        } catch {}
        
        if (!useCache) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 换皮闯关活动检测失败且无可用缓存，取消执行 ===`,
            type: "warning",
          });
          try { tokenStore.closeWebSocketConnection(testTokenId); } catch {}
          return;  // ✅ 无法确认活动状态，取消执行
        }
        // 关闭测试连接
        try { tokenStore.closeWebSocketConnection(testTokenId); } catch {}
      }
    }

    // 检查任务是否包含宝箱周限制的任务
    const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
    const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
    
    if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
      // 过滤掉宝箱周任务
      const tasksOutsideBoxWeek = task.selectedTasks.filter(t => !boxWeeklyTasks.includes(t));
      
      if (tasksOutsideBoxWeek.length === 0) {
        // 所有任务都是宝箱周任务，完全不需要连接
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 包含的任务都需要宝箱周，但当前不在宝箱周，取消执行 ===`,
          type: "warning",
        });
        
        // 跳过Token连接，直接返回
        return;  // ✅ finally块会清理状态
      } else {
        // 有部分任务是宝箱周任务，记录日志并过滤
        const skippedTasks = task.selectedTasks.filter(t => boxWeeklyTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过宝箱周任务（当前不是宝箱周）: ${skippedLabels}`,
          type: "warning",
        });
        
        // ✅ 只执行非宝箱周任务（使用局部变量，不修改原始配置）
        activeTasks = tasksOutsideBoxWeek;
      }
    }
    
    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // 标记所有Token为正在执行任务
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, true);
    });

    // Execute selected tasks sequentially (not in parallel) to avoid connection conflicts
    for (const taskName of activeTasks) {
      if (shouldStop.value) break;

      // 免费扭蛋已内置在日常任务的 buildActivityTasks 中（周二/四/六自动执行+累抽），无需独立执行
      if (taskName === "gacha_drawreward") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: 免费扭蛋 (已包含在日常任务中，无需独立执行)`,
          type: "info",
        });
        continue;
      }

      if (
        ["batchbaoku45", "batchbaoku13"].includes(taskName) &&
        !checkBaokuActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在宝库开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName) &&
        !checkMengjingActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在梦境开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchSmartSendCar", "batchClaimCars"].includes(taskName) &&
        !checkCarActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在发车开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchTopUpArena", "batcharenafight"].includes(taskName) &&
        !checkArenaActivityOpen()
      ) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        addLog({
          time: now.toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在竞技场开放时间，当前时间:${currentHour}:${currentMinute.toString().padStart(2, '0')}, 开放时段:6:00-22:00)`,
          type: "warning",
        });
        continue;
      }

      if (
        [
          "climbWeirdTower",
          "batchUseItems",
          "batchMergeItems",
          "batchClaimFreeEnergy",
          "claim_weird_tower_all",
          "claim_weird_tower_pass",
          "weekly_market_buy",
        ].includes(taskName) &&
        !isWeirdTowerActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在黑市周开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["skinChallenge"].includes(taskName) &&
        !["招募周", "黑市周"].includes(getCurrentActivityWeek.value)
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在换皮闯关开放时间)`,
          type: "warning",
        });
        continue;
      }

      // 免费礼包领取不跳过（内含战排金砖每日可领，各礼包内部自行判断活动周条件）

      // 一键宝箱周开箱、宝箱达标奖励自选大奖只允许在宝箱周执行
      if (
        ["batchOpenBoxByPoints", "batchClaimBoxWeeklyRewards"].includes(taskName) &&
        !isBoxWeeklyActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在宝箱周开放时间)`,
          type: "warning",
        });
        continue;
      }

      // 功法残卷领取/赠送在周五00:00-12:00残卷更新期间禁止执行
      if (
        ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"].includes(taskName) &&
        isLegacyRestricted.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (赛季日00:00-12:00为残卷更新时间，禁止操作)`,
          type: "warning",
        });
        continue;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务：${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });
            
      // ✅ 重置所有账号的状态（防止前一个任务的状态影响当前任务）
      availableTokens.forEach(tokenId => {
        tokenStatus.value[tokenId] = "waiting";
      });
            
      // ✅ 记录单个功能模块开始时间
      const taskStartTime = Date.now();
      const taskLabel = availableTasks.find((t) => t.value === taskName)?.label || taskName;

      // ✅ 记录子任务执行情况
      const taskRecordIndex = taskExecutionRecords.value.push({
        name: taskLabel,
        startTime: taskStartTime,
        endTime: null,
        elapsedStr: null,
        status: 'running',
        // 新增：执行进度统计
        totalAccounts: availableTokens.length,
        successCount: 0,
        failCount: 0,
        runningCount: availableTokens.length,
        progressPercent: 0,
        // 新增：失败账号详情
        failedAccounts: [],
        // 新增：计划执行时间（如果是定时任务）
        scheduledTime: null,
      }) - 1;

      // ✅ 添加实时进度更新定时器（每 500ms 更新一次）
      // 十殿挑战任务使用独立的进度统计逻辑，不使用定时器
      const isNightmareTask = taskName === 'batchNightmareChallengePresets';
      const scheduledProgressTimer = isNightmareTask ? null : setInterval(() => {
        let successCount = 0;
        let failCount = 0;
        let runningCount = 0;
        const failedAccounts = [];
        
        availableTokens.forEach(tokenId => {
          const status = tokenStatus.value[tokenId];
          if (status === 'completed') {
            successCount++;
          } else if (status === 'failed') {
            failCount++;
            const token = tokens.value.find(t => t.id === tokenId);
            failedAccounts.push({
              name: token?.name || '未知账号',
              error: tokenFailReasons.value[tokenId] || '未知错误',
              time: new Date().toLocaleTimeString(),
            });
          } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
            runningCount++;
          }
        });
        
        // 更新任务记录
        if (taskExecutionRecords.value[taskRecordIndex]) {
          taskExecutionRecords.value[taskRecordIndex].successCount = successCount;
          taskExecutionRecords.value[taskRecordIndex].failCount = failCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount = runningCount;
          taskExecutionRecords.value[taskRecordIndex].failedAccounts = failedAccounts;
          
          // 更新进度百分比
          const completed = successCount + failCount;
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
      }, 500);

      // Call the task function dynamically
      // 处理函数名映射（下划线格式 -> 驼峰格式）
      let functionName = taskName;
      if (taskName === 'weekly_market_buy') {
        functionName = 'weeklyMarketBuy';
      } else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
        // manual_buy 和 collection_exchange 直接使用下划线名称
        functionName = taskName;
      }
      let taskFunction;
      try {
        taskFunction = eval(functionName);
      } catch (e) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 任务函数 "${functionName}" 不存在（可能已被删除），跳过执行`,
          type: "warning",
        });
        continue;
      }
      if (typeof taskFunction === "function") {
        // ✅ 优化：不再预先分批，直接传递所有账号给任务函数
        // runStreaming 内部会根据 maxActive 自动控制并发数
        const maxConcurrent = batchSettings.maxActive || 5;
        // 同步连接池大小，确保与当前设置一致
        wsPool.setPoolSize(maxConcurrent);
        const totalAccounts = availableTokens.length;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 共 ${totalAccounts} 个账号，使用流式执行（并发数${maxConcurrent}）`,
          type: "info",
        });
        
        // ✅ 设置当前批次的账号（所有账号）
        selectedTokens.value = [...availableTokens];
        
        // 执行任务函数（带超时保护，防止单个任务卡死导致整个定时任务挂起）
        // ✅ BUG 修复：十殿挑战内部有 2 小时超时保护，外层超时需适配
        const isNightmareTask = taskName === 'batchNightmareChallengePresets';
        const BATCH_TASK_TIMEOUT = isNightmareTask
          ? (150 * 60 * 1000) // 十殿挑战：150 分钟（>内部 2 小时超时 + 重试余量）
          : ((batchSettings.batchTaskTimeout || 240) * 60 * 1000); // 批量任务：默认为 4 小时（240 分钟）
        
        // ✅ 记录当前批次的账号数量（用于统计）
        const batchStartCount = availableTokens.length;
        console.log(`[定时任务] ${taskName} 批次开始：batchStartCount=${batchStartCount}, totalAccounts=${totalAccounts}`);
        
        try {
          const executeTaskFunction = async () => {
            if (
              [
                "batchOpenBox",
                "batchOpenBoxByPoints",
                "batchOpenDiamondBox",
                "batchFish",
                "batchRecruit",
                "batchLegacyGiftSendEnhanced",
                "heroFourSaintsUpgrade",
                "batchConsumeActivity",
                "batchClaimConsumeRewards",
                "batchAutumnUseItem",
                "batchUseActivityItem",
                "batchClaimCdkReward",
                "batchClaimApexRewards",
              ].includes(taskName)
            ) {
              await taskFunction(true);
            } else if (taskName === 'legion_buy_store_items') {
              // 助威商店多选购买，传递选中的商品ID和购买次数
              console.log('[定时任务-助威商店] task.legionStoreItems:', task.legionStoreItems);
              const storeConfig = task.legionStoreItems || {};
              const selectedItems = [];
              const buyCounts = {};
              Object.keys(storeConfig).forEach(key => {
                if (storeConfig[key] && storeConfig[key].selected) {
                  selectedItems.push(parseInt(key));
                  buyCounts[parseInt(key)] = storeConfig[key].count;
                }
              });
              console.log('[定时任务-助威商店] selectedItems:', selectedItems, 'buyCounts:', buyCounts);
              if (selectedItems.length > 0) {
                await taskFunction(selectedItems, buyCounts);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 助威商店多选购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchActivityExchange') {
              // 消耗活动兑换商店多选购买，传递选中的商品后缀和购买次数
              const exchangeConfig = task.activityExchangeItems || {};
              const selectedSuffixes = [];
              const buyCounts = {};
              Object.keys(exchangeConfig).forEach(key => {
                if (exchangeConfig[key] && exchangeConfig[key].selected) {
                  const suffix = parseInt(key);
                  selectedSuffixes.push(suffix);
                  buyCounts[suffix] = exchangeConfig[key].count || 1;
                }
              });
              if (selectedSuffixes.length > 0) {
                await taskFunction(selectedSuffixes, buyCounts, true);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 消耗活动兑换购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_crystal_shop_buy') {
              // 盐晶商店多选购买，根据任务配置更新商店配置后执行
              const shopConfig = task.saltCrystalShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 更新 tasksStore 中的盐晶商店配置
                saltCrystalShopConfig.value.forEach(item => {
                  const taskItem = shopConfig[String(item.id)];
                  if (taskItem && taskItem.selected) {
                    item.count = taskItem.count;
                  } else {
                    item.count = 0;
                  }
                });
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 盐晶商店未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_ingot_shop_buy') {
              // 盐锭商店多选购买，根据任务配置更新商店配置后执行
              const shopConfig = task.saltIngotShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 更新 tasksStore 中的盐锭商店配置
                saltIngotShopConfig.value.forEach(item => {
                  const taskItem = shopConfig[String(item.id)];
                  if (taskItem && taskItem.selected) {
                    item.count = taskItem.count;
                  } else {
                    item.count = 0;
                  }
                });
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 盐锭商店未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'manual_buy') {
              // 黑市多选购买，根据任务配置更新配置后执行
              const buyConfig = task.manualBuyItems || {};
              const selectedItems = [];
              Object.keys(buyConfig).forEach(key => {
                if (buyConfig[key] && buyConfig[key].selected && buyConfig[key].count > 0) {
                  selectedItems.push({
                    goodsId: parseInt(key),
                    name: buyConfig[key].label || '',
                    count: buyConfig[key].count,
                  });
                }
              });
              if (selectedItems.length > 0) {
                // 更新 batchSettings.manualBuyItems 供 manual_buy 函数读取
                batchSettings.manualBuyItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 黑市多选购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'collection_exchange') {
              // 珍宝阁商店购买，从任务配置读取选中的商品
              const buyConfig = task.collectionExchangeItems || {};
              const selectedItems = [];
              Object.keys(buyConfig).forEach(key => {
                if (buyConfig[key] && buyConfig[key].selected && buyConfig[key].count > 0) {
                  selectedItems.push({
                    goodsId: parseInt(key),
                    name: buyConfig[key].label || '',
                    count: buyConfig[key].count,
                  });
                }
              });
              if (selectedItems.length > 0) {
                // 更新 batchSettings.collectionExchangeItems 供 collection_exchange 函数读取
                batchSettings.collectionExchangeItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 珍宝阁商店购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchClaimBoxWeeklyRewards') {
              // 宝箱周自选大奖，传递选中的奖励配置 { rewardIndex: count }
              const rewardConfig = task.boxWeeklyRewards || {5: 1};
              if (rewardConfig && Object.keys(rewardConfig).length > 0) {
                await taskFunction(rewardConfig, true);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `️ 宝箱达标奖励自选大奖未配置奖励，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'weekly_market_buy') {
              // 黑市周购买，传递选中的商品索引列表
              console.log('[定时任务-黑市周购买] task.weeklyMarketItems:', task.weeklyMarketItems);
              const marketConfig = task.weeklyMarketItems || {};
              const selectedItems = [];
              Object.keys(marketConfig).forEach(key => {
                if (marketConfig[key] && marketConfig[key].selected) {
                  selectedItems.push(key);  // goodsIndex 是字符串
                }
              });
              console.log('[定时任务-黑市周购买] selectedItems:', selectedItems);
              if (selectedItems.length > 0) {
                await taskFunction({ selectedItems });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 黑市周购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchOpenFragmentPacks') {
              // 碎片礼包多选开启，传递选中的 itemId 数组
              const fragmentConfig = task.fragmentPackItems || [];
              console.log('[定时任务-碎片礼包] task.fragmentPackItems:', fragmentConfig);
              await taskFunction({ isScheduledTask: true, selectedItems: fragmentConfig.length > 0 ? fragmentConfig : null });
            } else if (taskName === 'batchSmartSendCar') {
              // 智能发车，传递任务级发车条件配置
              const smartDeparture = task.smartDeparture;
              if (smartDeparture && smartDeparture.enabled) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🚗 使用任务级发车条件: 金砖≥${smartDeparture.goldThreshold} 招募≥${smartDeparture.recruitThreshold} 白玉≥${smartDeparture.jadeThreshold} 券≥${smartDeparture.ticketThreshold}`,
                  type: "info",
                });
                await taskFunction(smartDeparture);
              } else {
                await taskFunction();
              }
            } else if (taskName === 'batchNightmareChallengePresets') {
              // 十殿阎罗挑战，根据勾选的预设执行
              const presetIds = task.nightmarePresetIds || [];
              if (presetIds.length > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚔️ 十殿阎罗挑战：执行 ${presetIds.length} 个预设`,
                  type: "info",
                });
                await batchNightmareChallengePresets(true, taskRecordIndex);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 十殿阎罗挑战未配置预设，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchBookUpgrade') {
              // 图鉴升星，传入选择的升星类型
              const types = task.bookUpgradeTypes && task.bookUpgradeTypes.length > 0 ? task.bookUpgradeTypes : ['hero', 'fish', 'skin'];
              const typeLabels = { hero: '英雄', fish: '鱼灵', skin: '皮肤' };
              const selectedLabels = types.map(t => typeLabels[t] || t).join('+');
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⭐ 图鉴升星：执行【${selectedLabels}】`,
                type: "info",
              });
              await taskFunction(types);
            } else if (taskName === 'batchSaltCupBet') {
              // 比赛竞猜，自动获取所有比赛并下注
              const pickVal = task.saltCupBetPick !== undefined ? task.saltCupBetPick : 1;
              const pickLabels = { 1: '主胜', 2: '平局', 3: '客胜' };
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🏆 比赛竞猜：自动对所有未下注比赛押【${pickLabels[pickVal] || '主胜'}】`,
                type: "info",
              });
              await taskFunction(null, pickVal);
            } else if (taskName === 'batchSaltRoadCheer') {
              // 天宫助威：支持预选军团ID或自动按方向获取
              const side = task.saltRoadSide || 1;
              const voteCnt = task.saltRoadVoteCount || 1;
              const legionId = task.saltRoadLegionId || null;
              const legionName = task.saltRoadLegionName || '';
              if (legionId) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🏆 天宫助威：对 ${legionName}(${legionId}) 助威 ${voteCnt} 次`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🏆 天宫助威：对 ${side === 1 ? '左军' : '右军'} 助威 ${voteCnt} 次（自动获取对阵）`,
                  type: "info",
                });
              }
              await taskFunction(side, voteCnt, legionId || undefined, legionName || undefined);
            } else {
              await taskFunction();
            }
            }; // end executeTaskFunction
            let _raceTimeoutId;
            await Promise.race([
              executeTaskFunction(),
              new Promise((_, reject) => { _raceTimeoutId = setTimeout(() => {
                console.error(`[定时任务] 检测到 ${taskName} 执行超时 (${BATCH_TASK_TIMEOUT / 60000}分钟)，记录当前正在执行的账号数量:`, 
                  taskExecutionRecords.value[taskRecordIndex]?.runningCount || 0);
                reject(new Error(`批量任务执行超时（${BATCH_TASK_TIMEOUT / 60000}分钟）`));
              }, BATCH_TASK_TIMEOUT); })
            ]);

          
            // ✅ 任务执行成功，更新成功统计（由实时进度定时器负责计算，这里不再累加）
            if (taskExecutionRecords.value[taskRecordIndex]) {
              console.log(`[定时任务] ${taskName} 执行成功，当前 successCount = ${taskExecutionRecords.value[taskRecordIndex].successCount}`);
              // 更新进度（由实时定时器负责，这里确保最终状态正确）
              const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
              taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
            }
          } catch (error) {
            console.error(`执行任务 ${taskName} 失败:`, error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `❌ 执行失败：${error.message}`,
              type: "error",
            });
            
            // ✅ 检查是否为真正的超时错误（区分误报和真实超时）
            const isTimeoutError = error.message && error.message.includes('批量任务执行超时');
                      
            // ✅ 标记子任务执行记录
            if (taskExecutionRecords.value[taskRecordIndex]) {
              const currentRunningCount = taskExecutionRecords.value[taskRecordIndex].runningCount;
              const currentSuccessCount = taskExecutionRecords.value[taskRecordIndex].successCount;
              const currentFailCount = taskExecutionRecords.value[taskRecordIndex].failCount;
              
              console.log(`[定时任务] ${taskName} 进入 catch 块，当前状态:`, {
                batchStartCount,
                totalAccounts: taskExecutionRecords.value[taskRecordIndex].totalAccounts,
                currentSuccessCount,
                currentFailCount,
                currentRunningCount,
                isTimeoutError,
              });
                        
              // ✅ 如果所有账号都已执行完成（无 running 且 success 达到总数），则不是真实超时，直接返回
              const isAllCompleted = currentRunningCount === 0 && currentSuccessCount > 0;
                        
              if (isAllCompleted && !isTimeoutError) {
                console.log(`[定时任务] ${taskName} 未检测到超时，忽略非 timeout 错误`);
                return; // ⚠️ 不要在这里标记失败
              }
                        
              // ✅ 如果是超时错误，但实际所有账号都已成功完成，可能是超时误报，需要进一步确认
              if (isTimeoutError && isAllCompleted && currentSuccessCount === batchStartCount) {
                console.warn(`[定时任务] 检测到超时，但所有 ${currentSuccessCount} 个账号均已成功完成，可能为误报，保留已完成的记录`);
                
                // ✅ 清除实时进度更新定时器
                if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
                
                // ✅ 关键修复：虽然是误报，但仍需正常结束任务
                // 防止因为超时误报导致任务状态不正确
                if (taskExecutionRecords.value[taskRecordIndex]) {
                  const taskElapsed = Date.now() - taskStartTime;
                  const taskElapsedStr = taskElapsed >= 60000
                    ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
                    : `${(taskElapsed / 1000).toFixed(1)}秒`;
                  
                  taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
                  taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
                  taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
                  taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
                  taskExecutionRecords.value[taskRecordIndex].status = 'success'; // ✅ 明确设置为 success
                  
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `✅ ${taskLabel} 执行完成（超时误报），用时：${taskElapsedStr}`,
                    type: "warning",
                  });
                  
                  // 保存任务完成情况到本地存储
                  saveTaskExecutionRecordsToStorage();
                }
                
                return; // ⚠️ 不要覆盖已完成的结果
              }
                        
              // ✅ 只有当存在仍在运行的账号时，才将其标记为失败（避免重复累加已失败的账号）
              if (currentRunningCount > 0) {
                // 只将仍在 running/waiting 的账号追加到失败
                taskExecutionRecords.value[taskRecordIndex].failCount += currentRunningCount;
                taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
                          
                // ✅ 修复：使用 tokenStatus 准确判断哪些账号尚未完成（原逻辑条件反转，会将已成功/已失败的账号重复记录）
                availableTokens.forEach(tokenId => {
                  const status = tokenStatus.value[tokenId];
                  // 只处理尚未完成的账号（running/waiting/waiting_retry 状态）
                  if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
                    const token = tokens.value.find(t => t.id === tokenId);
                    taskExecutionRecords.value[taskRecordIndex].failedAccounts.push({
                      name: token?.name || '未知账号',
                      error: tokenFailReasons.value[tokenId] || error.message || '执行超时',
                      time: new Date().toLocaleTimeString(),
                    });
                  }
                });
                          
                // 更新进度
                const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
                const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
                taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                          
                // 保存任务完成情况到本地存储（失败时也保存）
                saveTaskExecutionRecordsToStorage();
              }
            }

            // ✅ 超时或失败时，停止所有后台十殿战斗（防止资源泄漏）
            if (isNightmareTask && _activeNightmareBattles.length > 0) {
              for (const entry of _activeNightmareBattles) {
                if (entry.battle && (entry.status === 'running' || entry.status === 'waiting_midnight' || entry.status === 'cooling')) {
                  try {
                    entry.battle.stop();
                    addLog({ time: new Date().toLocaleTimeString(), message: `[${entry.preset.name}] 超时停止战斗`, type: 'warning' });
                  } catch {}
                }
              }
            }
          } finally {
            // ✅ 统一在 finally 中清理定时器和状态，确保无论成功/失败/异常都能执行
            // 1. 清理超时定时器（防止内存泄漏）
            if (typeof _raceTimeoutId !== 'undefined' && _raceTimeoutId) clearTimeout(_raceTimeoutId);
            // 2. 清理实时进度定时器
            if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
            // 3. 刷新心跳时间戳，防止 healthCheck 误判定时任务卡死
            scheduledTaskStartTime = Date.now();
            lastTaskExecution = Date.now();
          }
          
          // ✅ 显示当前功能模块用时
          const taskElapsed = Date.now() - taskStartTime;
          const taskElapsedStr = taskElapsed >= 60000
            ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
            : `${(taskElapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ ${taskLabel} 执行完成，用时：${taskElapsedStr}`,
            type: "success",
          });
          
          // ✅ 更新子任务执行记录
          if (taskExecutionRecords.value[taskRecordIndex]) {
            taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
            taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
            
            // ✅ 十殿挑战任务使用独立的进度统计逻辑（由 onComplete/onError 回调更新）
            // 其他任务：任务完成后重新计算统计（确保所有账号都被正确统计）
            if (!isNightmareTask) {
              let finalSuccessCount = 0;
              let finalFailCount = 0;
              const finalFailedAccounts = [];
              
              availableTokens.forEach(tokenId => {
                const status = tokenStatus.value[tokenId];
                if (status === 'completed') {
                  finalSuccessCount++;
                } else if (status === 'failed') {
                  finalFailCount++;
                  const token = tokens.value.find(t => t.id === tokenId);
                  finalFailedAccounts.push({
                    name: token?.name || '未知账号',
                    error: tokenFailReasons.value[tokenId] || '未知错误',
                    time: new Date().toLocaleTimeString(),
                  });
                } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
                  // ✅ 修复：仍在 running/waiting 的账号视为失败（超时中断后 tokenStatus 可能未被更新）
                  finalFailCount++;
                  const token = tokens.value.find(t => t.id === tokenId);
                  finalFailedAccounts.push({
                    name: token?.name || '未知账号',
                    error: tokenFailReasons.value[tokenId] || '执行中断',
                    time: new Date().toLocaleTimeString(),
                  });
                }
              });
              
              taskExecutionRecords.value[taskRecordIndex].successCount = finalSuccessCount;
              taskExecutionRecords.value[taskRecordIndex].failCount = finalFailCount;
              taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
              taskExecutionRecords.value[taskRecordIndex].failedAccounts = finalFailedAccounts;
              
              // ✅ 如果所有账号都已完成，设置进度为 100%
              const totalCompleted = finalSuccessCount + finalFailCount;
              const totalAccounts = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              if (totalCompleted >= totalAccounts) {
                taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
              } else {
                // 否则根据实际完成情况计算进度
                taskExecutionRecords.value[taskRecordIndex].progressPercent = totalAccounts > 0 ? Math.round((totalCompleted / totalAccounts) * 100) : 0;
              }
            } else {
              // 十殿挑战：只更新 runningCount 为 0，保留已有的 successCount/failCount
              taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
              // 确保进度百分比正确
              const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
              taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
            }
                        
            // 🔍 DEBUG: 输出最终的统计信息
            console.log(`[定时任务] ${taskName} 最终结果:`, {
              successCount: taskExecutionRecords.value[taskRecordIndex].successCount,
              failCount: taskExecutionRecords.value[taskRecordIndex].failCount,
              runningCount: 0,
              totalAccounts: taskExecutionRecords.value[taskRecordIndex].totalAccounts,
              failedAccountsLength: taskExecutionRecords.value[taskRecordIndex].failedAccounts.length,
            });
                        
            // ✅ 根据实际完成情况设置状态（修复：之前只看之前的状态，现在根据 successCount 和 failCount 判断）
            const record = taskExecutionRecords.value[taskRecordIndex];
            if (record.failCount === 0) {
              record.status = 'success'; // 全部成功
            } else if (record.successCount > 0 && record.failCount > 0) {
              record.status = 'partial'; // 部分完成
            } else {
              record.status = 'fail'; // 全部失败
            }
            // 保存任务完成情况到本地存储
            saveTaskExecutionRecordsToStorage();
          }
          
          // 任务执行完成后，如果不是最后一个任务，根据设置等待一段时间再执行下一个
          const currentIndex = activeTasks.indexOf(taskName);
          const isLastTask = currentIndex === activeTasks.length - 1;
          
          if (!isLastTask && batchSettings.taskIntervalWait > 0) {
            const waitSeconds = batchSettings.taskIntervalWait;
            const waitMs = waitSeconds * 1000;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⏳ 等待${waitSeconds}秒后执行下一个功能...`,
              type: "info",
            });
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `任务函数不存在：${taskName}`,
            type: "error",
          });
          // ✅ 清除实时进度更新定时器
          if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
          // ✅ 更新子任务执行记录为失败
          if (taskExecutionRecords.value[taskRecordIndex]) {
            taskExecutionRecords.value[taskRecordIndex].status = 'fail';
            taskExecutionRecords.value[taskRecordIndex].elapsedStr = '函数不存在';
          }
        }
      }

    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    // ✅ 显示总执行用时
    const totalElapsed = Date.now() - totalStartTime;
    const totalElapsedStr = totalElapsed >= 60000
      ? `${Math.floor(totalElapsed / 60000)}分${Math.floor((totalElapsed % 60000) / 1000)}秒`
      : `${(totalElapsed / 1000).toFixed(1)}秒`;
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成：${task.name}，总用时：${totalElapsedStr} ===`,
      type: "success",
    });
    
    // 定时任务完成后保存所有记录到本地存储
saveTaskExecutionRecordsToStorage();
  } catch (error) {
    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    // ✅ 失败时也显示总用时
    const failElapsed = Date.now() - totalStartTime;
    const failElapsedStr = failElapsed >= 60000
      ? `${Math.floor(failElapsed / 60000)}分${Math.floor((failElapsed % 60000) / 1000)}秒`
      : `${(failElapsed / 1000).toFixed(1)}秒`;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message}，已用时: ${failElapsedStr} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );

    // ✅ 将所有仍在执行中的子任务标记为失败
    taskExecutionRecords.value.forEach(record => {
      if (record.status === 'running') {
        record.status = 'fail';
        record.elapsedStr = '未完成';
      }
    });
  } finally {
    // 清除任务执行状态
    isScheduledTaskRunning.value = false;
    currentScheduledTask = null;
    scheduledTaskStartTime = null; // ✅ 清除超时计时
    // 重置单账号加速标志
    batchSettings.singleAccountMode = false;
    // ✅ 统一在此处重置 isRunning（不再在子任务 finally 中重置，避免竞态窗口）
    if (isRunning.value) {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }

    // ✅ 任务完成后，同步处理待执行队列（不再用 nextTick，避免与调度器兖底竞态）
    if (pendingTaskQueue.length > 0) {
      // 循环清理已过期任务，找到第一个仍然有效的任务执行
      while (pendingTaskQueue.length > 0) {
        const nextTask = pendingTaskQueue[0]; // 只peek，不先shift
        const timeCheck = isTaskTimeStillValid(nextTask, 60);

        if (!timeCheck.valid) {
          pendingTaskQueue.shift(); // 移除过期任务
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏰ 跳过已过期的队列任务: ${nextTask.name}（${timeCheck.reason}，剩余队列: ${pendingTaskQueue.length}）`,
            type: "warning",
          });
          continue; // 继续检查下一个
        }

        // 找到了时间有效的任务
        pendingTaskQueue.shift(); // 正式出队
        // ✅ 定时任务仅与其他定时任务互斥，日常任务执行中也可以启动定时任务
        if (!isScheduledTaskRunning.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `▶️ 从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
            type: "info",
          });
          isScheduledTaskRunning.value = true; // 立即锁定，防止兖底逻辑竞态
          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`队列任务执行错误:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
        } else {
          // 另一个定时任务正在执行，放回队列等待
          pendingTaskQueue.unshift(nextTask);
        }
        return; // 已处理，退出
      }

      // 队列已全部清空（全部过期）
      if (pendingTaskQueue.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 队列中所有任务均已过期，已清空`,
          type: "info",
        });
      }
    }

    // ✅ 不在 finally 块中立即触发刷新
    // 改为由调度器 10 秒 tick 统一检查 shouldRefreshAfterTask 并在无任务运行时刷新
    // 这样可以确保所有队列任务都被处理完毕后，才真正刷新页面
  }
};

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = async (type) => {
  helperType.value = type;
  
  //  一键宝箱周开箱不提前获取积分，避免重复连接
  // batchOpenBoxByPoints 执行时会自动连接并获取积分
  if (type === 'pointsBox') {
    helperSettings.targetRounds = 1;  // 默认值
  }
  
  showHelperModal.value = true;
};

// 批量功法残卷赠送相关方法
const clearRecipientError = () => {
  recipientIdError.value = "";
};

const validateRecipientId = (value) => {
  if (!value || value === "") {
    return true; // 允许为空，由按钮禁用控制
  }
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return false;
  }
  return true;
};

// 头像处理方法
const handleAvatarLoad = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = false;
};

const handleAvatarError = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = true;
};

const resetAvatarState = () => {
  isAvatarLoading.value = true;
  avatarLoadError.value = false;
};

const queryRecipientInfo = async () => {
  // 1. 输入验证
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "请输入接收者ID";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return;
  }

  // 2. 检查选中账号
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "请先选择要操作的角色";
    return;
  }

  // 3. 初始化状态
  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;
  // 重置头像状态
  resetAvatarState();

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 记录开始查询
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 确保WebSocket连接
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在建立WebSocket连接...`,
      type: "info",
    });

    // 使用现有的ensureConnection函数，它已经包含了重连机制
    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket连接成功`,
      type: "success",
    });

    // 发送查询命令
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送查询命令，接收者ID: ${recipientId}`,
      type: "info",
    });

    // 延长超时时间到10秒，确保有足够时间处理
    const resp = await tokenStore.sendMessageWithPromise(
      firstTokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: recipientId,
      },
      10000,
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `查询命令发送成功，正在处理响应...`,
      type: "info",
    });

    // 处理查询结果
    console.log("rank_getroleinfo 响应结果:", resp);

    // 兼容不同的响应结构
    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 构建完整的角色信息，移除等级和VIP字段
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 添加头像URL
        avatarUrl:
          resp?.roleInfo?.headImg ||
          roleData?.headImg ||
          roleData?.role?.headImg ||
          "",
        // 战力转换为亿为单位
        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "亿",
        // 扩展更多角色信息
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 格式化角色名，处理特殊字符
      const displayName = recipientInfo.value.name || "未知角色";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("查询成功");
    } else {
      const errorMsg = "未找到该角色信息";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询失败: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 详细的错误处理
    console.error("查询接收者信息失败:", error);

    let errorMsg = "查询失败";
    let logType = "error";

    // 根据错误类型提供更友好的错误信息
    if (error.message.includes("连接失败")) {
      errorMsg = "WebSocket连接失败，请检查网络或账号状态";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("超时")
    ) {
      errorMsg = "查询超时，请稍后重试";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "功法系统未开启";
    } else {
      errorMsg = `查询失败: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 记录错误日志
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 显示用户友好的错误提示
    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 记录查询完成
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 查询操作完成 ===`,
      type: "info",
    });
  }
};

// 重置功法赠送模态框
const resetLegacyGiftModal = () => {
  recipientIdInput.value = '';
  recipientInfo.value = null;
  recipientIdError.value = '';
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("请先查询并确认接收者信息");
    return;
  }

  // 检查是否所有选中账号都有密码配置
  if (!hasPasswordForSelectedTokens.value) {
    message.error("请确保所有选中的账号都已配置功法赠送密码(在账号设置或任务模板中)");
    return;
  }

  // 调用增强版批量赠送功能
  await batchLegacyGiftSendEnhanced();

  // 关闭模态框
  showLegacyGiftModal.value = false;
  // 重置所有状态
  resetLegacyGiftModal();
};

const executeHelper = () => {
  if (helperType.value === 'weeklyMarket') {
    // 黑市周购买特殊处理
    // 验证是否在黑市周开放期间
    if (!isWeirdTowerActivityOpen.value) {
      message.warning(weirdTowerActivityStatus.value);
      return;
    }
    
    if (!helperSettings.weeklyMarketItems || helperSettings.weeklyMarketItems.length === 0) {
      message.warning("请至少选择一个商品");
      return;
    }
    showHelperModal.value = false;
    // 传递选中的商品列表
    weeklyMarketBuy({ selectedItems: [...helperSettings.weeklyMarketItems] });
  } else if (helperType.value === 'cdk') {
    // 兑换码领取
    if (!helperSettings.cdkCode || !helperSettings.cdkCode.trim()) {
      message.warning("请输入兑换码");
      return;
    }
    // 同步到batchSettings（定时任务使用）
    batchSettings.cdkCode = helperSettings.cdkCode.trim();
    showHelperModal.value = false;
    batchClaimCdkReward(false, helperSettings.cdkCode.trim());
  } else if (helperType.value === 'cheer') {
    // 挥鼓助威消耗
    showHelperModal.value = false;
    batchAutumnUseItem({ value: helperSettings.cheerQty || 0 });
  } else if (helperType.value === 'fragmentPack') {
    // 碎片礼包多选开启
    if (!helperSettings.fragmentPackItems || helperSettings.fragmentPackItems.length === 0) {
      message.warning("请至少选择一个碎片礼包");
      return;
    }
    showHelperModal.value = false;
    batchOpenFragmentPacks({ selectedItems: [...helperSettings.fragmentPackItems] });
  } else {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
    showHelperModal.value = false;
    if (helperType.value === "box") {
      batchOpenBox();
    } else if (helperType.value === "fish") {
      batchFish();
    } else if (helperType.value === "recruit") {
      batchRecruit();
    } else if (helperType.value === "pointsBox") {
      batchOpenBoxByPoints();
    }
  }
};

// Dream Buy Modal Logic
const showDreamBuyModal = ref(false);
const dreamBuyList = ref([]);

// 梦境购买网格列数（手机端2列，桌面端3列）
const dreamGridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 2;
  return 3;
});

const openDreamBuyModal = () => {
  // Load saved settings
  dreamBuyList.value = batchSettings.dreamPurchaseList || [];
  showDreamBuyModal.value = true;
};

const toggleDreamItem = (itemKey, checked) => {
  if (checked) {
    if (!dreamBuyList.value.includes(itemKey)) {
      dreamBuyList.value.push(itemKey);
    }
  } else {
    dreamBuyList.value = dreamBuyList.value.filter(k => k !== itemKey);
  }
};

const saveDreamBuyConfig = () => {
  // Save settings
  batchSettings.dreamPurchaseList = [...dreamBuyList.value];
  saveBatchSettings();
  
  showDreamBuyModal.value = false;
  message.success("梦境购买配置已保存");
};

const selectGoldItems = () => {
  const newSelection = new Set(dreamBuyList.value);
  
  for (const merchantId in goldItemsConfig) {
    const items = goldItemsConfig[merchantId];
    items.forEach(index => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }
  
  dreamBuyList.value = Array.from(newSelection);
};

const selectAllItems = () => {
  const newSelection = new Set(dreamBuyList.value);
  
  for (const merchantId in merchantConfig) {
    const items = merchantConfig[merchantId].items;
    items.forEach((_, index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }
  
  dreamBuyList.value = Array.from(newSelection);
};

const clearAllItems = () => {
  dreamBuyList.value = [];
};

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      bossFormation: 1,
      nightmareFormation: 1, // 十殿阵容
      saltFieldPeachFormation: 1, // 盐场蟠桃阵容
      bossTimes: 2,
      dailyBossTimes: 3,
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
      legacyGiftPassword: '', // 新增
      helperPresets: [], // 智能发车预设护卫成员
    };
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return null;
  }
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  // 兼容旧设置：缺失字段使用默认值
  if (currentSettings.saltFieldPeachFormation == null) {
    currentSettings.saltFieldPeachFormation = 1;
  }
  if (!currentSettings.helperPresets) {
    currentSettings.helperPresets = [];
  }
  currentSettings.purchaseDiscounts = initPurchaseDiscounts(currentSettings.purchaseDiscounts);
  settingsHelperMembers.value = []; // 重置护卫成员列表
  showSettingsModal.value = true;

  // 自动获取黑市采购清单（需WebSocket已连接）
  const wsStatus = tokenStore.getWebSocketStatus(token.id);
  if (wsStatus === 'connected') {
    tokenStore.sendMessageWithPromise(token.id, 'store_getpurchase', {}, 8000)
      .then((result) => {
        console.log('[采购清单] 响应:', JSON.stringify(result).substring(0, 500));
        // 兼容多种响应结构
        const purchaseItems = result?.purchaseItemList
          || result?.store?.purchaseItemList
          || result?.data?.purchaseItemList;
        if (purchaseItems?.length > 0) {
          currentSettings.purchaseList = purchaseItems.map(i => i.itemId);
          // 回填折扣
          const discounts = {};
          purchaseItems.forEach(i => { if (i.discount != null) discounts[i.itemId] = i.discount; });
          currentSettings.purchaseDiscounts = initPurchaseDiscounts(discounts);
          // 回填采购次数
          const purchaseCnt = result?.purchaseCnt ?? result?.store?.purchaseCnt;
          if (purchaseCnt != null) currentSettings.purchaseCnt = purchaseCnt;
        }
      })
      .catch((e) => {
        console.warn('[采购清单] 获取失败:', e?.message || e);
      });
  } else {
    console.warn('[采购清单] WebSocket未连接, 状态:', wsStatus);
  }
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

// Task Template Functions
const openTaskTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置当前模板
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    nightmareFormation: 1,
    saltFieldPeachFormation: 1,
    bossTimes: 2,
    dailyBossTimes: 3,
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
    legacyGiftPassword: '',
  });
  currentTemplateName.value = "";
  currentTemplate.purchaseDiscounts = initPurchaseDiscounts(currentTemplate.purchaseDiscounts);
  showTaskTemplateModal.value = true;
};

const loadTaskTemplates = () => {
  const templates = localStorage.getItem("task-templates");
  const parsed = templates ? JSON.parse(templates) : [];
  taskTemplates.value = parsed;
  return parsed;
};

// 计算引用某个模板的账号数量
const getTemplateAccountCount = (templateId) => {
  if (!templateId) return 0;
  let count = 0;
  const tokens = tokenStore.gameTokens || [];
  tokens.forEach((token) => {
    try {
      const settingsStr = localStorage.getItem(`daily-settings:${token.id}`);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.templateId === templateId) {
          count++;
        }
      }
    } catch (e) { /* ignore */ }
  });
  return count;
};

const openApplyTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置选择
  selectedTemplateId.value = null;
  selectedTokensForApply.value = [];
  showApplyTemplateModal.value = true;
};

const handleSelectAllForApply = (checked) => {
  if (checked) {
    selectedTokensForApply.value = sortedTokens.value.map((token) => token.id);
  } else {
    selectedTokensForApply.value = [];
  }
};

const applyTemplate = () => {
  if (!selectedTemplateId.value || selectedTokensForApply.value.length === 0) {
    message.error("请选择模板和要应用的账号");
    return;
  }

  // 找到选中的模板
  const templates = loadTaskTemplates();
  const template = templates.find((t) => t.id === selectedTemplateId.value);
  if (!template) {
    message.error("模板不存在");
    return;
  }

  // 应用模板到选中的账号
  let successCount = 0;
  selectedTokensForApply.value.forEach((tokenId) => {
    // 保存账号设置时同时保存模板ID
    const accountSettings = {
      ...template.settings,
      templateId: template.id, // 记录模板ID
    };
    localStorage.setItem(
      `daily-settings:${tokenId}`,
      JSON.stringify(accountSettings),
    );
    successCount++;
  });

  message.success(`已成功应用模板到 ${successCount} 个账号`);
  showApplyTemplateModal.value = false;
};

// Template Manager Functions
const openTemplateManagerModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  showTemplateManagerModal.value = true;
};

const openEditTemplateModal = (template) => {
  // 加载模板数据到当前编辑模板
  currentTemplateId.value = template.id;
  currentTemplateName.value = template.name;
  Object.assign(currentTemplate, template.settings);
  currentTemplate.purchaseDiscounts = initPurchaseDiscounts(currentTemplate.purchaseDiscounts);
  showTaskTemplateModal.value = true;
};

const updateTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  // 找到并更新模板
  const templates = loadTaskTemplates();
  const templateIndex = templates.findIndex(
    (t) => t.id === currentTemplateId.value,
  );
  if (templateIndex === -1) {
    message.error("模板不存在");
    return;
  }

  // 更新模板
  templates[templateIndex] = {
    ...templates[templateIndex],
    name: currentTemplateName.value.trim(),
    settings: {
      ...currentTemplate,
    },
    updatedAt: new Date().toISOString(),
  };

  // 保存模板到localStorage
  localStorage.setItem("task-templates", JSON.stringify(templates));

  // 更新模板列表
  taskTemplates.value = templates;

  // ✅ 同步更新所有应用了该模板的账号设置
  const templateId = currentTemplateId.value;
  const newSettings = { ...currentTemplate };
  let updatedAccounts = 0;
  
  // 遍历localStorage，找到所有应用了该模板的账号
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('daily-settings:')) {
      try {
        const accountSettings = JSON.parse(localStorage.getItem(key));
        // 如果该账号使用了当前模板，则更新其设置
        if (accountSettings.templateId === templateId) {
          const updatedAccountSettings = {
            ...newSettings,
            templateId: templateId, // 保留模板ID
          };
          localStorage.setItem(key, JSON.stringify(updatedAccountSettings));
          updatedAccounts++;
        }
      } catch (error) {
        console.error(`解析账号设置失败: ${key}`, error);
      }
    }
  }

  const updateMessage = updatedAccounts > 0 
    ? `已更新模板 "${templates[templateIndex].name}"，并同步到 ${updatedAccounts} 个账号`
    : `已更新模板 "${templates[templateIndex].name}"`;
  
  message.success(updateMessage);
  showTaskTemplateModal.value = false;

  // 重置编辑状态
  resetTemplateForm();
};

const deleteTaskTemplate = (templateId) => {
  // 确认删除
  if (confirm("确定要删除这个模板吗？")) {
    // 找到并删除模板
    const templates = loadTaskTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== templateId);

    // 保存模板到localStorage
    localStorage.setItem("task-templates", JSON.stringify(filteredTemplates));

    // 更新模板列表
    taskTemplates.value = filteredTemplates;

    message.success("模板已删除");
  }
};

const resetTemplateForm = () => {
  currentTemplateId.value = null;
  currentTemplateName.value = "";
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    nightmareFormation: 1,
    saltFieldPeachFormation: 1,
    bossTimes: 2,
    dailyBossTimes: 3,
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
    blackMarketStandalonePurchase: false, // 黑市单独购买，默认不启用
  });
};

// ========== 预设护卫成员功能 ==========

/** 加载俱乐部成员列表（账号单独设置弹窗用） */
const loadSettingsHelperMembers = async () => {
  settingsHelperLoading.value = true;
  try {
    const tokenId = currentSettingsTokenId.value;
    if (!tokenId) {
      message.warning("请先选择账号");
      return;
    }

    // 未连接时自动连接该账号
    const wsStatus = tokenStore.getWebSocketStatus(tokenId);
    if (wsStatus !== "connected") {
      message.info("正在连接账号，请稍候...");
      const connected = await ensureConnection(tokenId, 2);
      if (!connected) {
        message.error("账号连接失败，请检查网络或 token 有效性");
        return;
      }
    }

    const legionRes = await tokenStore.sendMessageWithPromise(tokenId, "legion_getinfo", {}, 10000);
    const membersMap = legionRes?.body?.info?.members || legionRes?.info?.members || {};
    const members = Object.values(membersMap).map((m) => ({
      id: String(m.roleId),
      name: m.name || m.nickname || String(m.roleId),
    }));
    settingsHelperMembers.value = members;
    message.success(`已加载 ${members.length} 名俱乐部成员`);
  } catch (e) {
    message.error(`获取俱乐部成员失败: ${e.message || "未知错误"}`);
  } finally {
    settingsHelperLoading.value = false;
  }
};

/** 切换账号设置预设护卫成员 */
const toggleSettingsHelper = (memberId) => {
  if (!currentSettings.helperPresets) {
    currentSettings.helperPresets = [];
  }
  const idx = currentSettings.helperPresets.indexOf(memberId);
  if (idx >= 0) {
    currentSettings.helperPresets.splice(idx, 1);
  } else {
    currentSettings.helperPresets.push(memberId);
  }
};

const openAccountTemplateModal = () => {
  // 加载账号模板引用关系
  loadAccountTemplateReferences();
  showAccountTemplateModal.value = true;
};

const loadAccountTemplateReferences = () => {
  const templates = loadTaskTemplates();
  const references = [];

  // 遍历所有账号，获取其模板引用
  sortedTokens.value.forEach((token) => {
    const settingsStr = localStorage.getItem(`daily-settings:${token.id}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        const templateId = settings.templateId;
        const template = templates.find((t) => t.id === templateId);

        references.push({
          tokenId: token.id,
          tokenName: token.name,
          templateId: templateId,
          templateName: template ? template.name : "未引用模板",
        });
      } catch (e) {
        console.error(`解析账号 ${token.name} 的设置失败:`, e);
      }
    } else {
      // 没有设置的账号
      references.push({
        tokenId: token.id,
        tokenName: token.name,
        templateId: null,
        templateName: "未引用模板",
      });
    }
  });

  accountTemplateReferences.value = references;
  filteredAccountTemplates.value = references;
};

const filterAccountTemplates = () => {
  if (!selectedTemplateForFilter.value) {
    filteredAccountTemplates.value = accountTemplateReferences.value;
  } else {
    filteredAccountTemplates.value = accountTemplateReferences.value.filter(
      (item) => item.templateId === selectedTemplateForFilter.value,
    );
  }
};

// 导出账号模板引用
const exportAccountReferences = () => {
  try {
    isExporting.value = true;
    loadAccountTemplateReferences();
    
    const references = accountTemplateReferences.value;
    
    if (references.length === 0) {
      message.warning("没有可导出的账号模板引用");
      isExporting.value = false;
      return;
    }

    const exportData = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      references: references,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `account_references_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`导出成功: ${references.length} 个账号模板引用`);
  } catch (error) {
    console.error("导出账号引用失败:", error);
    message.error("导出失败: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 导入账号模板引用
const importAccountReferences = async ({ file }) => {
  try {
    isImporting.value = true;
    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 验证结构
        if (!importData.version || !Array.isArray(importData.references)) {
          message.error("无效的账号引用文件格式");
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        importData.references.forEach((reference) => {
          if (!reference.tokenId || !reference.tokenName) {
            skippedCount++;
            return;
          }

          // 检查账号是否存在
          const tokenExists = tokens.value.some(t => t.id === reference.tokenId);
          if (!tokenExists) {
            skippedCount++;
            return;
          }

          // 检查模板是否存在
          const templates = loadTaskTemplates();
          const templateExists = !reference.templateId || templates.some(t => t.id === reference.templateId);
          if (!templateExists) {
            skippedCount++;
            return;
          }

          // 保存账号设置，包含模板引用
          const settingsStr = localStorage.getItem(`daily-settings:${reference.tokenId}`);
          let settings = {};
          if (settingsStr) {
            try {
              settings = JSON.parse(settingsStr);
            } catch (e) {
              console.error(`解析账号 ${reference.tokenName} 的设置失败:`, e);
            }
          }

          // 更新模板引用
          if (reference.templateId) {
            settings.templateId = reference.templateId;
          } else {
            delete settings.templateId;
          }

          // 保存更新后的设置
          localStorage.setItem(
            `daily-settings:${reference.tokenId}`,
            JSON.stringify(settings)
          );

          importedCount++;
        });

        // 重新加载账号模板引用
        loadAccountTemplateReferences();

        message.success(
          `导入成功: ${importedCount} 个账号引用, ${skippedCount} 个跳过`
        );
      } catch (parseError) {
        console.error("解析账号引用文件失败:", parseError);
        message.error("解析账号引用文件失败");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("导入账号引用失败:", error);
    message.error("导入失败: " + error.message);
    isImporting.value = false;
  }
};

const openNewTemplateModal = () => {
  // 重置表单，准备创建新模板
  resetTemplateForm();
  showTaskTemplateModal.value = true;
};

// 修改saveTaskTemplate函数，支持新增和编辑
const saveTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  const templates = loadTaskTemplates();

  if (currentTemplateId.value) {
    // 更新现有模板
    updateTaskTemplate();
  } else {
    // 创建新模板
    const template = {
      id: Date.now().toString(),
      name: currentTemplateName.value.trim(),
      settings: {
        ...currentTemplate,
      },
      createdAt: new Date().toISOString(),
    };

    // 添加新模板
    templates.push(template);
    localStorage.setItem("task-templates", JSON.stringify(templates));

    // 更新模板列表
    taskTemplates.value = templates;

    message.success(`已保存模板 "${template.name}"`);
    showTaskTemplateModal.value = false;

    // 重置表单
    resetTemplateForm();
  }
};

// 加载状态
const isExporting = ref(false);
const isImporting = ref(false);

// 导出任务模板
const exportTaskTemplates = () => {
  try {
    isExporting.value = true;
    const templates = loadTaskTemplates();
    
    if (templates.length === 0) {
      message.warning("没有可导出的任务模板");
      isExporting.value = false;
      return;
    }

    const exportData = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      templates: templates,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task_templates_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`导出成功: ${templates.length} 个任务模板`);
  } catch (error) {
    console.error("导出模板失败:", error);
    message.error("导出失败: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 导入任务模板
const importTaskTemplates = async ({ file }) => {
  try {
    isImporting.value = true;
    // n-upload的custom-request中，file是UploadFileInfo对象，实际File对象在file.file中
    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 验证结构
        if (!importData.version || !Array.isArray(importData.templates)) {
          message.error("无效的模板文件格式");
          return;
        }

        let importedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const existingTemplates = loadTaskTemplates();
        const existingTemplateIds = new Set(existingTemplates.map(t => t.id));

        importData.templates.forEach((template) => {
          if (!template.id || !template.name || !template.settings) {
            skippedCount++;
            return;
          }

          if (existingTemplateIds.has(template.id)) {
            // 更新现有模板
            const index = existingTemplates.findIndex(t => t.id === template.id);
            if (index !== -1) {
              existingTemplates[index] = {
                ...template,
                updatedAt: new Date().toISOString(),
              };
              updatedCount++;
            }
          } else {
            // 添加新模板
            existingTemplates.push({
              ...template,
              createdAt: template.createdAt || new Date().toISOString(),
            });
            importedCount++;
          }
        });

        // 保存更新后的模板
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));

        // 更新模板列表
        taskTemplates.value = existingTemplates;

        message.success(
          `导入成功: ${importedCount} 个新模板, ${updatedCount} 个更新模板, ${skippedCount} 个跳过`
        );
      } catch (parseError) {
        console.error("解析模板文件失败:", parseError);
        message.error("解析模板文件失败");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("导入模板失败:", error);
    message.error("导入失败: " + error.message);
    isImporting.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const autoScrollLog = ref(true);

// 图鉴升星类型选择
const bookUpgradeTypes = ref(['hero']);
const bookUpgradeOptions = [
  { label: '英雄升星', value: 'hero' },
  { label: '鱼灵升星', value: 'fish' },
  { label: '皮肤升星', value: 'skin' },
];

const executeBookUpgrade = () => {
  if (bookUpgradeTypes.value.length === 0) {
    message.warning('请至少选择一种升星类型');
    return;
  }
  const typeLabels = { hero: '英雄', fish: '鱼灵', skin: '皮肤' };
  const selectedLabels = bookUpgradeTypes.value.map(t => typeLabels[t]).join('+');
  executeManualTaskWithRecord('batchBookUpgrade', `图鉴升星(${selectedLabels})`, () => batchBookUpgrade(bookUpgradeTypes.value));
};

// 盐场桃阵容切换
const handleSwitchSaltFieldPeachFormation = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择账号');
    return;
  }

  isRunning.value = true;
  shouldStop.value = false;

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始批量切换盐场蟠桃阵容，共${selectedTokens.value.length}个账号（并发数${batchSettings.maxActive || 5}） ===`, type: "info" });

  const moduleDelay = batchSettings.moduleDelays?.default || batchSettings.taskDelay || 1000;

  const processFormation = async (tokenId) => {
    if (shouldStop.value) return;

    const token = tokens.value.find((t) => t.id === tokenId);
    if (!token) return;

    let connected = false;
    try {
      // 读取账号设置
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (!settingsRaw) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未找到账号设置，跳过`, type: "warning" });
        tokenStatus.value[tokenId] = "failed";
        return;
      }
      const settings = JSON.parse(settingsRaw);
      // 兼容旧设置：缺失字段默认使用阵容1
      if (settings.saltFieldPeachFormation == null) {
        settings.saltFieldPeachFormation = 1;
        localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
      }
      const formation = settings.saltFieldPeachFormation;
      if (formation < 1 || formation > 6) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 盐场蟠桃阵容配置无效(${formation})，跳过`, type: "warning" });
        tokenStatus.value[tokenId] = "failed";
        return;
      }

      tokenStatus.value[tokenId] = "running";

      // 连接（skipSlot=true，由runStreaming控制并发）
      await ensureConnection(tokenId, 3, true);
      connected = true;
      await new Promise((r) => setTimeout(r, moduleDelay));

      // 获取当前阵容
      let currentFormation = null;
      try {
        const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000);
        currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
      } catch (e) {
        // 获取失败不阻塞
      }

      // 如果当前阵容已是目标阵容，跳过
      if (currentFormation === formation) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前已是目标阵容${formation}，无需切换`, type: "success" });
        tokenStatus.value[tokenId] = "completed";
        return;
      }

      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前: ${currentFormation ?? '未知'} → 目标: ${formation}，切换中...`, type: "info" });

      // 切换阵容（带重试）
      let switched = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId, 'presetteam_saveteam',
            { teamId: formation }, 8000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换成功: ${currentFormation ?? '?'} → ${formation}`, type: "success" });
          switched = true;
          break;
        } catch (err) {
          const errMsg = err.message || String(err);
          // 200020表示阵容槽未解锁，无需重试
          if (errMsg.includes('200020')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换失败，当前账号未解锁对应阵容槽`, type: "error" });
            break;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换失败(第${attempt}次): ${errMsg}`, type: "warning" });
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, moduleDelay));
      }

      if (switched) {
        tokenStatus.value[tokenId] = "completed";
      } else {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 阵容切换失败(已重试3次)`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      }
    } catch (error) {
      tokenStatus.value[tokenId] = "failed";
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换阵容失败: ${error.message}`, type: "error" });
    } finally {
      if (connected) {
        tokenStore.closeWebSocketConnection(tokenId);
      }
    }
  };

  await runStreaming(selectedTokens.value, processFormation);

  const successCount = selectedTokens.value.filter(id => tokenStatus.value[id] === "completed").length;
  const failCount = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed").length;
  const summary = `盐场蟠桃阵容切换完成：${successCount}成功，${failCount}失败`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
  isRunning.value = false;
};
const userManuallyDisabledScroll = ref(false); // 记录用户是否手动关闭了自动滚动
const filterErrorsOnly = ref(false);
const errorCount = computed(() => {
  return logs.value.filter((log) => log.type === "error").length;
});

// 监听日志容器的滚动事件
const handleLogScroll = () => {
  if (!logContainer.value) return;
  
  // 如果用户手动关闭了自动滚动，不再自动开启
  if (userManuallyDisabledScroll.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const isAtBottom = distanceToBottom < 10; // 距离底部10px以内视为到达底部
  
  // 如果滚动到底部，开启自动滚动
  if (isAtBottom && !autoScrollLog.value) {
    autoScrollLog.value = true;
    console.log('[自动滚动] 检测到滚动到底部，开启自动滚动');
  }
  // 如果往上滚动（距离底部超过10px），立即关闭自动滚动
  else if (!isAtBottom && autoScrollLog.value) {
    autoScrollLog.value = false;
    console.log(`[自动滚动] 检测到往上滚动（距离底部${distanceToBottom.toFixed(0)}px），关闭自动滚动`);
  }
};

const filteredLogs = computed(() => {
  if (filterErrorsOnly.value) {
    return logs.value.filter((log) => log.type === "error");
  }
  return logs.value;
});

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// Selection logic
const isAllSelected = computed(() => {
  // 如果有搜索关键词，基于搜索结果判断
  if (tokenSearchKeyword.value.trim()) {
    return (
      selectedTokens.value.length === sortedTokens.value.length &&
      sortedTokens.value.length > 0 &&
      sortedTokens.value.every((t) => selectedTokens.value.includes(t.id))
    );
  }
  // 没有搜索时，基于所有账号判断
  return (
    selectedTokens.value.length === tokens.value.length &&
    tokens.value.length > 0
  );
});

const isIndeterminate = computed(() => {
  // 如果有搜索关键词，基于搜索结果判断
  if (tokenSearchKeyword.value.trim()) {
    const selectedInSearch = sortedTokens.value.filter((t) =>
      selectedTokens.value.includes(t.id)
    ).length;
    return (
      selectedInSearch > 0 &&
      selectedInSearch < sortedTokens.value.length
    );
  }
  // 没有搜索时，基于所有账号判断
  return (
    selectedTokens.value.length > 0 &&
    selectedTokens.value.length < tokens.value.length
  );
});

// 模块展开/收起状态（持久化到 localStorage）
const LS_EXPAND_KEY = 'batch_expand_state';
const loadExpandState = () => {
  try {
    const saved = localStorage.getItem(LS_EXPAND_KEY);
    return saved ? JSON.parse(saved) : { functions: false, tokens: true };
  } catch { return { functions: false, tokens: true }; }
};
const saveExpandState = () => {
  try {
    localStorage.setItem(LS_EXPAND_KEY, JSON.stringify({
      functions: isBatchFunctionsExpanded.value,
      tokens: isTokenListExpanded.value
    }));
  } catch {}
};
const _initExpand = loadExpandState();
const isTokenListExpanded = ref(_initExpand.tokens); // 账号列表展开/收起状态
const showSponsorModal = ref(false); // 赞助弹窗显示状态
const showTipsModal = ref(false); // 温馨提示弹窗显示状态
const showQQGroupModal = ref(false); // QQ群弹窗显示状态
const isBatchFunctionsExpanded = ref(_initExpand.functions); // 批量功能列表展开/收起状态
watch(isBatchFunctionsExpanded, saveExpandState);
watch(isTokenListExpanded, saveExpandState);
const isTowerExpandedForAll = ref(false);
const isCarExpandedForAll = ref(false);
const isClimbTowerExpandedForAll = ref(false);
const isWeirdTowerExpandedForAll = ref(false);

// 卡片区域显隐控制（默认全部显示，合并为一个开关）
const showCardSections = ref(true);
const showStatusTags = computed(() => showCardSections.value);
const showModuleGrid = computed(() => showCardSections.value);

// 卡片区域显隐状态持久化
const STORAGE_KEY_SHOW_CARD_SECTIONS = 'showCardSections';
if (typeof localStorage !== 'undefined') {
  const savedState = localStorage.getItem(STORAGE_KEY_SHOW_CARD_SECTIONS);
  if (savedState !== null) {
    showCardSections.value = JSON.parse(savedState);
  }
}

// 监听变化并保存到 localStorage
watch(showCardSections, (newValue) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SHOW_CARD_SECTIONS, JSON.stringify(newValue));
  }
});
const showDailyProgress = computed(() => showCardSections.value);
const showMonthlyProgress = computed(() => showCardSections.value);
const toggleCardSections = () => {
  showCardSections.value = !showCardSections.value;
  if (!showCardSections.value) {
    message.info('已隐藏卡片详情，可减少渲染压力');
  }
};

// 防休眠状态
// ✅ 防休眠状态持久化
const WAKE_LOCK_STORAGE_KEY = 'wakeLockEnabled';

// 从 localStorage 加载防休眠状态
const loadWakeLockState = () => {
  try {
    const saved = localStorage.getItem(WAKE_LOCK_STORAGE_KEY);
    return saved === 'true';
  } catch (error) {
    console.error('加载防休眠状态失败:', error);
    return false;
  }
};

// 保存防休眠状态到 localStorage
const saveWakeLockState = (enabled) => {
  try {
    localStorage.setItem(WAKE_LOCK_STORAGE_KEY, String(enabled));
  } catch (error) {
    console.error('保存防休眠状态失败:', error);
  }
};

const isWakeLockEnabled = ref(loadWakeLockState());  // ✅ 从 localStorage 加载
const wakeLockSupported = ref(false);

// 防休眠开关处理
const handleWakeLockToggle = async (enabled) => {
  if (enabled) {
    const success = await wakeLockManager.request();
    if (success) {
      message.success('防休眠已开启,系统将保持唤醒状态');
      isWakeLockEnabled.value = true;
      saveWakeLockState(true);  // ✅ 保存到 localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "🛡️ 防休眠已开启",
        type: "success",
      });
    } else {
      message.error('防休眠开启失败,请检查环境支持');
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);  // ✅ 保存到 localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "防休眠开启失败",
        type: "error",
      });
    }
  } else {
    await wakeLockManager.release();
    message.info('防休眠已关闭');
    isWakeLockEnabled.value = false;
    saveWakeLockState(false);  // ✅ 保存到 localStorage
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "防休眠已关闭",
      type: "info",
    });
  }
};

const handleSelectAll = (checked) => {
  if (checked) {
    // 如果有搜索关键词，只选中搜索出来的账号
    if (tokenSearchKeyword.value.trim()) {
      selectedTokens.value = sortedTokens.value.map((t) => t.id);
    } else {
      // 没有搜索时，选中所有账号
      selectedTokens.value = tokens.value.map((t) => t.id);
    }
  } else {
    selectedTokens.value = [];
  }
};

// 处理TokenCard选择事件
const handleTokenSelect = (tokenId, checked) => {
  if (checked) {
    if (!selectedTokens.value.includes(tokenId)) {
      selectedTokens.value.push(tokenId);
    }
  } else {
    const index = selectedTokens.value.indexOf(tokenId);
    if (index > -1) {
      selectedTokens.value.splice(index, 1);
    }
  }
};

// 处理TokenCard连接切换事件
const handleToggleConnection = async (tokenId) => {
  const connection = tokenStore.wsConnections[tokenId];
  const isConnected = connection?.status === 'connected';
  const isConnecting = connection?.status === 'connecting';
  
  // 防止重复点击
  if (isConnecting) {
    message.info('连接正在建立中,请稍候...');
    return;
  }
  
  if (isConnected) {
    // 断开连接
    await tokenStore.closeWebSocketConnection(tokenId);
    message.success(`已断开连接`);
  } else {
    // 建立连接
    const token = tokens.value.find(t => t.id === tokenId);
    if (token) {
      try {
        message.loading(`正在连接: ${token.name}...`);
        
        // 尝试建立连接
        await tokenStore.createWebSocketConnection(tokenId, token.token);
        
        // 等待连接状态更新
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 检查连接结果
        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          message.destroyAll();
          message.success(`已连接: ${token.name}`);
          
          // 连接成功后自动获取角色信息
          tokenStore.sendGetRoleInfo(tokenId);
        } else {
          message.destroyAll();
          if (conn?.status === 'error') {
            message.warning(`连接失败，正在刷新Token，稍后重连`);
            // error状态时自动尝试刷新Token并重连
            try {
              const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
              if (refreshSuccess) {
                message.success(`Token刷新成功, 正在重新连接: ${token.name}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const reConn = tokenStore.wsConnections[tokenId];
                if (reConn?.status === 'connected') {
                  tokenStore.sendGetRoleInfo(tokenId);
                }
              } else {
                message.error(`Token刷新失败, 请手动重新导入: ${token.name}`);
              }
            } catch (refreshError) {
              message.error(`Token刷新失败: ${refreshError.message || '未知错误'}`);
            }
          } else if (conn?.status === 'disconnected') {
            message.warning(`连接未完成状态：已刷新Token请重新连接`);
          } else {
            message.warning(`连接未完成, 状态: ${conn?.status || 'unknown'}`);
          }
        }
      } catch (error) {
        message.destroyAll();
        message.warning(`连接失败: ${error.message || '未知错误'},正在尝试刷新Token...`);
        
        // 连接失败时尝试刷新Token
        try {
          const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
          
          if (refreshSuccess) {
            message.success(`Token刷新成功,正在重新连接: ${token.name}`);
            
            // 等待重连完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const conn = tokenStore.wsConnections[tokenId];
            if (conn?.status === 'connected') {
              tokenStore.sendGetRoleInfo(tokenId);
            }
          } else {
            message.error(`Token刷新失败,请手动重新导入: ${token.name}`);
          }
        } catch (refreshError) {
          message.error(`Token刷新失败: ${refreshError.message || '未知错误'}`);
        }
      }
    }
  }
};

// 拖动排序相关 - 在父组件中维护全局状态
const draggedTokenId = ref(null);
const isDragging = ref(false);
const targetTokenId = ref(null); // 当前鼠标下的目标卡片

// 处理拖动开始
const handleTokenDragStart = (tokenId) => {
  draggedTokenId.value = tokenId;
  isDragging.value = true;
  targetTokenId.value = null; // 重置目标位置
};

// 处理拖动结束
const handleTokenDragEnd = (tokenId) => {
  draggedTokenId.value = null;
  isDragging.value = false;
  targetTokenId.value = null;
};

// 处理拖动查询（子组件查询拖动状态）
const handleTokenDragQuery = (tokenId, callback) => {
  callback(isDragging.value, draggedTokenId.value);
};

// 处理更新目标位置（鼠标进入新卡片时）
const handleTokenDragUpdateTarget = (tokenId) => {
  targetTokenId.value = tokenId;
};

// 处理获取目标位置（鼠标松开时）
const handleTokenDragGetTarget = (callback) => {
  callback(targetTokenId.value);
};

// 处理放下
const handleTokenDrop = async ({ draggedId, targetId }) => {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }
  
  // 获取当前排序后的token列表
  const currentTokens = [...sortedTokens.value];
  
  const draggedIndex = currentTokens.findIndex(t => t.id === draggedId);
  const targetIndex = currentTokens.findIndex(t => t.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }
  
  // 重新排序
  const [removed] = currentTokens.splice(draggedIndex, 1);
  currentTokens.splice(targetIndex, 0, removed);
  
  // 保存新的排序
  const newTokenOrder = currentTokens.map(t => t.id);
  
  // 更新tokenOrder响应式变量，触发sortedTokens重新计算
  tokenOrder.value = newTokenOrder;
  
  // 保存到存储
  await saveTokenOrder(newTokenOrder);
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `已调整账号位置`,
    type: 'success'
  });
};

// 保存Token排序
const saveTokenOrder = async (tokenOrder) => {
  try {
    await storage.set('tokenOrder', tokenOrder);
  } catch (error) {
    console.error('保存Token排序失败:', error);
  }
};

// 加载Token排序
const loadTokenOrder = async () => {
  try {
    const savedOrder = await storage.get('tokenOrder');
    return savedOrder || [];
  } catch (error) {
    console.error('加载Token排序失败:', error);
    return [];
  }
};

// 刷新选中的Token
const refreshSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择要刷新的账号');
    return;
  }

  message.info(`开始刷新 ${selectedTokens.value.length} 个Token...`);

  let successCount = 0;
  let failCount = 0;

  // 串行刷新，避免同时发起太多请求
  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 标记Token为正在执行任务
      tokenStore.setTokenRunning(tokenId, true);
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `尝试刷新Token: ${token.name}`,
        type: "info",
      });

      // 尝试刷新Token
      const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId);
      
      if (refreshSuccess) {
        // 刷新成功，更新最后刷新时间
        token.lastRefreshAt = new Date().toISOString();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token刷新成功: ${token.name}`,
          type: "success",
        });
        successCount++;
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token刷新失败: ${token.name}`,
          type: "warning",
        });
        failCount++;
      }
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `刷新Token失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
      failCount++;
    } finally {
      // 标记Token为任务完成
      tokenStore.setTokenRunning(tokenId, false);
    }

    // 添加短暂延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (successCount > 0) {
    message.success(`成功刷新 ${successCount} 个Token`);
  }
  if (failCount > 0) {
    message.error(`${failCount} 个Token刷新失败`);
  }
};

// 重置选中账号的本地缓存
const resetSelectedTokensCache = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择要重置的账号');
    return;
  }

  let resetCount = 0;
  
  // 遍历选中的token,清除localStorage中的缓存
  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 清除该token的所有相关缓存
      // 根据 TokenCard.vue 中的实际存储键名: tokencard_{id}_status
      const cacheKeys = [
        `tokencard_${tokenId}_status`,  // 卡片状态缓存
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[重置缓存] 已清除: ${key}`);
      });
      
      resetCount++;
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `已重置缓存: ${token.name}`,
        type: "success",
      });
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `重置缓存失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  if (resetCount > 0) {
    message.success(`已重置 ${resetCount} 个账号的缓存，请刷新页面查看效果`);
  }
};

// 删除选中的账号（复用tokenStore.removeToken逻辑）
const deleteSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) return;

  let deletedCount = 0;
  const failedNames = [];

  for (const tokenId of [...selectedTokens.value]) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 调用tokenStore的removeToken：断开WS连接 + 从gameTokens移除 + 删除IndexedDB BIN数据
      await tokenStore.removeToken(tokenId);

      // 清除该token的日常任务配置
      localStorage.removeItem(`daily-settings:${tokenId}`);
      // 清除卡片状态缓存
      localStorage.removeItem(`tokencard_${tokenId}_status`);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `已删除账号: ${token.name}`,
        type: "success",
      });
      deletedCount++;
    } catch (error) {
      console.error(`删除账号失败 [${token.name}]:`, error);
      failedNames.push(token.name);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `删除账号失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  // 清除选中列表
  selectedTokens.value = [];

  if (deletedCount > 0) {
    message.success(`已删除 ${deletedCount} 个账号`);
  }
  if (failedNames.length > 0) {
    message.error(`${failedNames.length} 个账号删除失败: ${failedNames.join(', ')}`);
  }
};

// 添加Token弹窗状态
const showAddTokenModal = ref(false);
const addTokenImportMethod = ref("manual");

// 打开添加Token弹窗（替代跳转）
const navigateToAddToken = () => {
  showAddTokenModal.value = true;
};

const getStatusType = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "info";
  if (status === "waiting_retry") return "warning";
  return "default";
};

const getStatusText = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "running") return "执行中";
  if (status === "waiting_retry") return "等待重试";
  return "等待中";
};

// =====================
// 连接/断开相关方法
// =====================

/**
 * 连接选中的账号
 */
const connectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择要连接的账号");
    return;
  }

  const tokensToConnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return !connection || connection.status !== "connected";
  });

  if (tokensToConnect.length === 0) {
    message.info("选中的账号已全部连接");
    return;
  }

  // 显示加载提示
  const loadingMsg = message.loading(`开始连接 ${tokensToConnect.length} 个账号...`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  // 串行连接，避免同时发起太多请求
  for (const tokenId of tokensToConnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    if (!token) continue;

    try {
      // 更新加载提示
      loadingMsg.content = `正在连接: ${token.name} (${successCount + failCount + 1}/${tokensToConnect.length})`;
      
      await tokenStore.createWebSocketConnection(tokenId, token.token);
      successCount++;

      // 连接成功后自动获取角色信息
      setTimeout(() => {
        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          tokenStore.sendGetRoleInfo(tokenId);
        }
      }, 1000);

      // 添加小延迟，避免请求过于频繁
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failCount++;
      console.error(`连接失败 ${token.name}:`, error);
    }
  }
  
  // 关闭加载提示
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`成功连接 ${successCount} 个账号，${failCount} 个账号连接失败`);
    } else {
      message.success(`成功连接 ${successCount} 个账号`);
    }
  } else {
    message.error(`所有账号连接失败，共 ${failCount} 个账号`);
  }
};

/**
 * 断开选中的账号
 */
const disconnectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择要断开的账号");
    return;
  }

  const tokensToDisconnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return connection && connection.status === "connected";
  });

  if (tokensToDisconnect.length === 0) {
    message.info("选中的账号未连接");
    return;
  }

  // 显示加载提示
  const loadingMsg = message.loading(`开始断开 ${tokensToDisconnect.length} 个账号...`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of tokensToDisconnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      // 更新加载提示
      loadingMsg.content = `正在断开: ${token?.name || tokenId} (${successCount + failCount + 1}/${tokensToDisconnect.length})`;
      
      await tokenStore.closeWebSocketConnection(tokenId);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`断开连接失败 ${tokenId}:`, error);
    }
  }
  
  // 关闭加载提示
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`已断开 ${successCount} 个账号的连接，${failCount} 个账号断开失败`);
    } else {
      message.success(`已断开 ${successCount} 个账号的连接`);
    }
  } else {
    message.error(`所有账号断开失败，共 ${failCount} 个账号`);
  }
};

// =====================
// Token分组管理相关方法
// =====================

/**
 * 创建新分组
 */
const createNewGroup = () => {
  if (!newGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  const newGroup = tokenStore.createTokenGroup(newGroupName.value.trim(), newGroupColor.value);
  
  // 添加选中的Token到新分组
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach(tokenId => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("分组创建成功");
  newGroupName.value = "";
  newGroupColor.value = "#1677ff";
  newGroupSelectedTokens.value = [];
};

const selectAllNewGroup = () => {
  newGroupSelectedTokens.value = filteredGroupTokens.value.map(t => t.id);
};

const deselectAllNewGroup = () => {
  newGroupSelectedTokens.value = [];
};

/**
 * 删除分组
 */
const deleteGroup = (groupId) => {
  if (confirm("确定要删除这个分组吗？分组中的token不会被删除。")) {
    tokenStore.deleteTokenGroup(groupId);
    // 从批量删除选中列表中移除
    const idx = batchDeleteSelectedGroupIds.value.indexOf(groupId);
    if (idx !== -1) batchDeleteSelectedGroupIds.value.splice(idx, 1);
    message.success("分组已删除");
  }
};

/**
 * 切换单个分组的批量删除选中状态
 */
const toggleBatchDeleteGroupSelection = (groupId, checked) => {
  if (checked) {
    if (!batchDeleteSelectedGroupIds.value.includes(groupId)) {
      batchDeleteSelectedGroupIds.value.push(groupId);
    }
  } else {
    const idx = batchDeleteSelectedGroupIds.value.indexOf(groupId);
    if (idx !== -1) batchDeleteSelectedGroupIds.value.splice(idx, 1);
  }
};

/**
 * 全选/取消全选分组
 */
const toggleSelectAllGroups = (checked) => {
  if (checked) {
    batchDeleteSelectedGroupIds.value = tokenGroups.value.map(g => g.id);
  } else {
    batchDeleteSelectedGroupIds.value = [];
  }
};

/**
 * 批量删除分组
 */
const batchDeleteGroups = () => {
  if (batchDeleteSelectedGroupIds.value.length === 0) return;
  const count = batchDeleteSelectedGroupIds.value.length;
  batchDeleteSelectedGroupIds.value.forEach(groupId => {
    tokenStore.deleteTokenGroup(groupId);
  });
  batchDeleteSelectedGroupIds.value = [];
  message.success(`已删除 ${count} 个分组`);
};

// 打开分组管理弹窗时清除选中状态
watch(showGroupManageModal, (val) => {
  if (val) batchDeleteSelectedGroupIds.value = [];
});

/**
 * 保存编辑的分组
 */
const saveEditGroup = () => {
  if (!editingGroupId.value) return;

  if (!editingGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  tokenStore.updateTokenGroup(editingGroupId.value, {
    name: editingGroupName.value.trim(),
    color: editingGroupColor.value,
  });

  message.success("分组已更新");
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 开始编辑分组
 */
const startEditGroup = (groupId) => {
  const group = tokenGroups.value.find((g) => g.id === groupId);
  if (group) {
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
    editingGroupColor.value = group.color;
  }
};

/**
 * 取消编辑分组
 */
const cancelEditGroup = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

// 导入导出分组相关函数
const importFileInput = ref(null);

/**
 * 导出分组
 */
const exportGroups = async () => {
  const result = await tokenStore.exportTokenGroups();
  if (result) {
    message.success("分组导出成功");
  } else {
    message.error("分组导出失败");
  }
};

/**
 * 触发导入分组文件选择
 */
const triggerImportGroups = () => {
  if (importFileInput.value) {
    importFileInput.value.click();
  }
};

/**
 * 处理导入文件
 */
const handleImportFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = e.target.result;
      if (jsonData) {
        const success = tokenStore.importTokenGroups(jsonData.toString());
        if (success) {
          message.success("分组导入成功");
        }
      }
    } catch (error) {
      message.error(`导入失败: ${error.message}`);
      console.error("分组导入失败:", error);
    } finally {
      // 重置文件输入
      if (importFileInput.value) {
        importFileInput.value.value = "";
      }
    }
  };
  reader.readAsText(file);
};

/**
 * 切换分组选择状态
 */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 更新selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 判断分组是否被选中
 */
const isGroupSelected = (groupId) => {
  return selectedGroups.value.includes(groupId);
};

/**
 * 根据选中的分组更新selectedTokens
 */
const updateSelectedTokensFromGroups = () => {
  const tokenIds = new Set();

  selectedGroups.value.forEach((groupId) => {
    const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
    validTokenIds.forEach((id) => tokenIds.add(id));
  });

  selectedTokens.value = Array.from(tokenIds);
};

/**
 * 一键清除所有分组选择
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

/**
 * 添加token到分组
 */
const addTokenToSelectedGroup = (groupId, tokenId) => {
  tokenStore.addTokenToGroup(groupId, tokenId);
  message.success("已将token添加到分组");
};

/**
 * 从分组移除token
 */
const removeTokenFromSelectedGroup = (groupId, tokenId) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  message.success("已将token从分组移除");
};

/**
 * 获取分组中有效的token ID列表（用于模板中展示）
 */
const getValidGroupTokenIds = (groupId) => {
  return tokenStore.getValidGroupTokenIds(groupId);
};

/**
 * 获取分组中的token列表
 */
const getGroupTokenList = (groupId) => {
  const tokenIds = tokenStore.getValidGroupTokenIds(groupId);
  return tokens.value.filter((t) => tokenIds.includes(t.id));
};

// 注: pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 已从 @/utils/batch 导入

const addLog = (log) => {
  // 添加日志数据到数组
  logs.value.push(log);

  // 限制logs数组大小，防止内存占用过大
  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }

  // 只有在启用自动滚动时才执行滚动
  if (autoScrollLog.value && logContainer.value) {
    try {
      // 使用nextTick确保DOM已更新
      nextTick(() => {
        // 检查自动滚动是否仍然启用
        if (logContainer.value && autoScrollLog.value === true) {
          // 滚动到底部
          logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
      });
    } catch (error) {
      // 忽略DOM操作错误，确保日志数据仍然被记录
      console.warn("Failed to scroll log container:", error);
    }
  }
};

watch(autoScrollLog, (newValue, oldValue) => {
  console.log(`[自动滚动] 状态变化: ${oldValue} -> ${newValue}`);
  
  // 如果用户从开启变为关闭，标记为用户手动关闭
  if (oldValue === true && newValue === false) {
    userManuallyDisabledScroll.value = true;
    console.log('[自动滚动] 用户手动关闭自动滚动');
  }
  // 如果用户从关闭变为开启，清除手动关闭标记
  else if (oldValue === false && newValue === true) {
    userManuallyDisabledScroll.value = false;
    console.log('[自动滚动] 用户手动开启自动滚动');
  }
  
  if (newValue && logContainer.value) {
    nextTick(() => {
      try {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
        console.log('[自动滚动] 启用后自动滚动到底部');
      } catch (error) {
        // 忽略DOM操作错误
        console.warn("Failed to scroll log container:", error);
      }
    });
  } else if (!newValue) {
    console.log('[自动滚动] 已禁用，取消自动滚动');
  }
});

// 监听filterErrorsOnly变化，防止在切换过滤时触发自动滚动
watch(filterErrorsOnly, (newValue, oldValue) => {
  console.log(`[只看错误] 状态变化: ${oldValue} -> ${newValue}`);
  // 如果自动滚动已禁用，确保不会因为DOM更新而滚动
  if (!autoScrollLog.value && logContainer.value) {
    // 保存当前滚动位置
    const currentScrollTop = logContainer.value.scrollTop;
    nextTick(() => {
      // 恢复滚动位置，防止自动滚动
      if (logContainer.value && !autoScrollLog.value) {
        logContainer.value.scrollTop = currentScrollTop;
        console.log('[只看错误] 切换过滤时保持滚动位置');
      }
    });
  }
});

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error("复制日志失败: " + err.message);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("日志已清空");
};

const waitForConnection = async (
  tokenId,
  timeout = batchSettings.connectionTimeout,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected") return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// ========== 连接池管理 ==========
// 连接池：控制并发连接数（信号量模式，实际WS生命周期由调用方管理）
const wsPool = new WebSocketPool({
  poolSize: batchSettings.maxActive,
  connectionInterval: 300,
});

// 兼容性对象：保持 connectionQueue.active 供日志显示
const connectionQueue = {
  get active() { return wsPool.activeCount; }
};

const waitForConnectionSlot = async (timeout = 60000) => {
  // 通用槽位等待（无tokenId时使用默认标识）
  await wsPool.acquire('_generic_', timeout);
};

const releaseConnectionSlot = () => {
  wsPool.release('_generic_');
};

/**
 * 流式执行器：替代 Promise.all，确保同时只有 maxActive 个任务在运行
 * 当一个任务完成时立即启动下一个，避免所有任务同时排队等待连接槽
 * @param {string[]} tokenIds - Token ID 列表
 * @param {Function} processFn - 处理函数 (tokenId) => Promise
 */
const ACCOUNT_STUCK_TIMEOUT = 25 * 60 * 1000; // 25分钟单账号超时

const runStreaming = async (tokenIds, processFn) => {
  const maxConcurrent = batchSettings.maxActive || 5;
  const queue = [...tokenIds];
  const running = new Set();
  let completedCount = 0;

  const launchNext = () => {
    if (queue.length === 0 || shouldStop.value) return;
    const tokenId = queue.shift();
    const token = tokens.value.find(t => t.id === tokenId);
    let timeoutId;
    const p = Promise.race([
      processFn(tokenId),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏱️ ${token?.name || tokenId} 执行超过25分钟，强制超时`,
            type: "warning",
          });
          // 关闭 WebSocket 连接，使正在等待响应的 sendWithPromise 立即报错
          try { tokenStore.closeWebSocketConnection(tokenId); } catch {}
          // 释放连接槽位，防止槽位泄漏
          try { releaseConnectionSlot(); } catch {}
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = '单账号执行超时（25分钟）';
          reject(new Error(`账号 ${token?.name || tokenId} 执行超时（25分钟）`));
        }, ACCOUNT_STUCK_TIMEOUT);
      })
    ])
      .catch((err) => {
        // ✅ 修复：确保异常时 tokenStatus 被正确设置，避免误判
        const currentStatus = tokenStatus.value[tokenId];
        if (currentStatus !== 'completed' && currentStatus !== 'failed') {
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = err?.message || '执行异常';
        }
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
        running.delete(p);
        completedCount++;
      });
    running.add(p);
  };

  // 启动初始批次
  for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
    launchNext();
  }

  // 每当一个任务完成，自动启动下一个
  while (running.size > 0) {
    await Promise.race([...running]);
    launchNext();
  }

  // 防御性检查：确保所有Token都已处理
  if (completedCount < tokenIds.length && !shouldStop.value) {
    console.warn(`[runStreaming] 完成数(${completedCount})少于总数(${tokenIds.length})，补充处理剩余Token`);
    // ✅ 修复：找出未处理的Token（包括 waiting、undefined 和可能卡住的 running 状态）
    const remaining = tokenIds.filter(id => {
      const status = tokenStatus.value[id];
      return status === 'waiting' || status === undefined || status === 'running';
    });
    for (const tokenId of remaining) {
      try {
        const currentStatus = tokenStatus.value[tokenId];
        // 如果是 running 状态，可能是卡住了，标记为 failed
        if (currentStatus === 'running') {
          console.warn(`[runStreaming] Token ${tokenId} 状态为 running，可能卡住，标记为 failed`);
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = '执行卡住，状态未更新';
          continue;
        }
        await processFn(tokenId).catch((err) => {
          // ✅ 确保异常时 tokenStatus 被正确设置
          const status = tokenStatus.value[tokenId];
          if (status !== 'completed' && status !== 'failed') {
            tokenStatus.value[tokenId] = "failed";
            tokenFailReasons.value[tokenId] = err?.message || '执行异常';
          }
        });
      } catch (e) {
        console.error(`[runStreaming] 补充处理 ${tokenId} 失败:`, e);
      }
    }
  }
};

const ensureConnection = async (tokenId, maxRetries = 3, skipSlot = false) => {
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const latestToken = tokens.value.find((t) => t.id === tokenId);
      if (!latestToken) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      // 获取连接槽位来限制并发数（skipSlot=true时由外层滚动执行控制并发）
      if (!skipSlot) {
        await waitForConnectionSlot(60000);
      }

      // 检查现有连接状态
      const connection = tokenStore.wsConnections[tokenId];
      if (connection && connection.status === 'connected') {
        return true;
      }

      // 先关闭可能存在的旧连接
      if (connection) {
        tokenStore.closeWebSocketConnection(tokenId);
        // 等待一小段时间确保连接完全关闭
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 创建新的WebSocket连接
      const wsClient = tokenStore.createWebSocketConnection(
        tokenId,
        latestToken.token,
        latestToken.wsUrl,
      );

      if (!wsClient) {
        throw new Error('创建WebSocket客户端失败');
      }

      // 等待连接建立
      const connected = await waitForConnection(tokenId);

      if (connected) {
        // 连接成功后延迟3-5秒，确保连接稳定
        const connectionDelay = 3000 + Math.random() * 2000; // 3-5秒随机延迟
        await new Promise(resolve => setTimeout(resolve, connectionDelay));

        // Initialize Game Data (Critical for Battle Version and Session)
        try {
          // Fetch Role Info first (Standard flow)
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            20000,
          );

          // Fetch Battle Version
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "fight_startlevel",
            {},
            20000,
          );
          if (res?.battleData?.version) {
            tokenStore.setBattleVersion(res.battleData.version);
          }
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `初始化数据失败: ${e.message}`,
            type: "warning",
          });
        }

        return true;
      }

      throw new Error('连接超时');

    } catch (error) {
      lastError = error;
      retryCount++;
      
      // 释放连接槽位
      if (!skipSlot) {
        releaseConnectionSlot();
      }
      
      // 关闭可能存在的连接
      tokenStore.closeWebSocketConnection(tokenId);
      
      if (retryCount < maxRetries) {
        // 阶梯退避：第1次等30秒，第2次等1分钟，第3次等3分钟
        let waitTime;
        if (retryCount === 1) {
          waitTime = 30000; // 第一次重试等待30秒
        } else if (retryCount === 2) {
          waitTime = 60000; // 第二次重试等待1分钟
        } else {
          waitTime = 180000; // 第三次重试等待3分钟
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 连接失败，${waitTime >= 60000 ? (waitTime / 60000) + '分钟' : (waitTime / 1000) + '秒'}后重试: ${error.message}`,
          type: "warning",
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 3次重试全部失败，直接停止
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `❌ 连接失败，已重试${maxRetries}次，停止任务: ${error.message}`,
          type: "error",
        });
      }
    }
  }
  
  // 所有重试都失败
  throw new Error(`WebSocket连接失败: ${lastError?.message || '未知错误'}`);
};

const createTaskDeps = () => ({
  selectedTokens,
  tokens,
  tokenStatus,
  tokenFailReasons,
  isRunning,
  shouldStop,
  ensureConnection,
  releaseConnectionSlot,
  runStreaming,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog: (log) => {
    addLog(log);
    // 自动捕获失败原因：从日志消息中提取失败信息
    if (log.type === 'error' && log.message) {
      const msg = log.message;
      const failIdx = msg.indexOf('失败');
      if (failIdx !== -1) {
        for (const tokenId of selectedTokens.value) {
          const token = tokens.value.find(t => t.id === tokenId);
          if (token && msg.includes(token.name)) {
            const afterFail = msg.substring(failIdx);
            const colonMatch = afterFail.match(/失败[：:]\s*/);
            if (colonMatch) {
              const reason = afterFail.substring(colonMatch.index + colonMatch[0].length).trim();
              if (reason) {
                tokenFailReasons.value[tokenId] = reason.substring(0, 100);
              }
            } else if (!tokenFailReasons.value[tokenId]) {
              tokenFailReasons.value[tokenId] = afterFail.substring(2).trim().substring(0, 100) || '执行失败';
            }
            break;
          }
        }
      }
    }
  },
  message,
  currentRunningTokenId,
  // 延迟配置 - 统一使用 delayManager 的延迟分组
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 功能模块延迟配置（保留用于向后兼容）
  moduleDelays: batchSettings.moduleDelays,
  // 延迟分组配置（新统一系统）
  delayGroups: batchSettings.delayGroups,
  // 获取模块延迟的辅助函数（使用集中式 delayManager）
  getModuleDelay: (moduleName) => {
    return getModuleDelay(moduleName, batchSettings);
  },
  // 安全延迟函数（支持中途停止）
  safeDelay: async (ms, checkInterval = 100) => {
    const endTime = Date.now() + ms;
    while (Date.now() < endTime && !shouldStop.value) {
      await new Promise((r) => setTimeout(r, Math.min(checkInterval, endTime - Date.now())));
    }
    return !shouldStop.value;
  },
  // 其他特定依赖
  logs,
  logContainer,
  autoScrollLog,
  nextTick,
  shouldSendCar,
  canClaim,
  normalizeCars,
  gradeLabel,
  // 设置相关
  currentSettings,
  helperSettings,
  // 功法赠送相关
  recipientIdInput,
  recipientInfo,
  securityPassword,

  // 竞技场相关辅助函数
  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 配置加载函数
  loadSettings,
});

// 包装函数：为单独执行的功能添加用时显示
const wrapTaskFunctions = (obj) => {
  const wrapped = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'function') {
      wrapped[key] = async (...args) => {
        const startTime = Date.now();
        try {
          const result = await val(...args);
          const elapsed = Date.now() - startTime;
          const elapsedStr = elapsed >= 60000
            ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
            : `${(elapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ 功能执行完成，用时: ${elapsedStr}`,
            type: "success",
          });
          return result;
        } catch (error) {
          const elapsed = Date.now() - startTime;
          const elapsedStr = elapsed >= 60000
            ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
            : `${(elapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ 功能执行异常，已用时: ${elapsedStr}，错误: ${error.message}`,
            type: "error",
          });
          throw error;
        }
      };
    } else {
      wrapped[key] = val;
    }
  }
  return wrapped;
};

// 初始化任务模块
const tasksHangUp = wrapTaskFunctions(createTasksHangUp(createTaskDeps()));
const { claimHangUpRewards, batchAddHangUpTime, batchStudy, batchclubsign, batchLegionSignup, batchPayloadSignup, batchWarGuessCheer, batchHangUpUpgrade } = tasksHangUp;

const tasksBottle = wrapTaskFunctions(createTasksBottle(createTaskDeps()));
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = wrapTaskFunctions(createTasksTower(createTaskDeps()));
const { climbTower, climbWeirdTower, batchClaimFreeEnergy, skinChallenge, skinTreasure, batchUseItems, batchMergeItems } = tasksTower;

const tasksCar = wrapTaskFunctions(createTasksCar(createTaskDeps()));
const { batchSmartSendCar, batchClaimCars, batchCarResearchUpgrade } = tasksCar;

const tasksItem = wrapTaskFunctions(createTasksItem(createTaskDeps()));
const {
  batchOpenBox,
  batchOpenBoxByPoints,
  batchOpenFragmentPacks,
  batchOpenDiamondBox,
  batchClaimBoxWeeklyRewards,
  batchClaimBoxPointReward,
  batchFish,
  batchRecruit,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchFishUpgrade,
  batchClaimStarRewards,
  batchClaimPeachTasks,
  batchGenieSweep,
  heroFourSaintsUpgrade,
  batchConsumeActivity,
  batchClaimConsumeRewards,
  batchAutumnUseItem,
  batchUseActivityItem,
  batchClaimCdkReward,
  batchActivityExchange,
  batchClaimApexRewards,
  batchCollectionActivate,
  batchPushMap,
} = tasksItem;

// 推图状态检测与模态框
const showPushMapModal = ref(false);
const isAnyPushRunning = ref(false);

// 账号选择器（只做选择，不直接控制推图）
const pushSelectedTokens = ref([]);

// 推图卡片列表（独立管理，持久化到 localStorage）
const _savedPushCards = localStorage.getItem('pushCards');
const pushCards = ref(_savedPushCards ? JSON.parse(_savedPushCards) : []);

// 监听卡片列表变化，自动持久化
watch(pushCards, (v) => {
  localStorage.setItem('pushCards', JSON.stringify(v));
}, { deep: true });

// 监听账号选择器变化（用于临时选择，不影响推图列表）
watch(pushSelectedTokens, (v) => {
  // 可以保存到 localStorage 以便恢复
  localStorage.setItem('pushSelectedTokens', JSON.stringify(v));
}, { deep: true });
const pushTorchType = ref(0);
// 同步火把类型到全局
watch(pushTorchType, (v) => { window._pushTorchType = v; }, { immediate: true });
const pushTorchCount = ref(10);
// 同步火把数量到全局
watch(pushTorchCount, (v) => { window._pushTorchCount = v; }, { immediate: true });

// 手动使用火把
const pushUseTorchManual = async () => {
  if (!pushTorchType.value || !pushCards.value.length) return;
  if (typeof window._bpUseTorch === "function") {
    for (const card of pushCards.value) {
      await window._bpUseTorch(card.id);
    }
  }
};

const pushLogs = ref([]);
const pushLogsCollapsed = ref(false);
let _pushCheckTimer = null;

// 账号选项（只显示已连接的）
const pushTokenOptions = computed(() => {
  const tkList = tokens.value;
  if (!tkList || !Array.isArray(tkList)) return [];
  return tkList.map(t => {
    const st = tokenStore.getWebSocketStatus(t.id);
    const tag = st === "connected" ? " ✅" : st === "connecting" ? " ⏳" : " ⚪";
    return { label: shortName(t.name || t.id) + tag, value: t.id };
  });
});

// 打开推图模态框时自动恢复状态
watch(showPushMapModal, (v) => {
  if (v) {
    // 恢复正在运行的推图状态（从 window._pt 中恢复）
    if (window._pt) {
      const runningIds = Object.keys(window._pt).filter(id => window._pt[id] && window._pt[id].running);
      if (runningIds.length > 0) {
        // 合并已运行的 Token 到卡片列表（如果不在列表中）
        const existingIds = new Set(pushCards.value.map(c => c.id));
        runningIds.forEach(id => {
          if (!existingIds.has(id)) {
            const tk = tokens.value.find(t => t.id === id);
            const wsStatus = tokenStore.getWebSocketStatus(id);
            pushCards.value.push({
              id,
              name: tk ? tk.name : id,
              running: true,
              level: window._pt[id].level || 0,
              wins: window._pt[id].wins || 0,
              losses: window._pt[id].losses || 0,
              countdown: window._pt[id].countdown || 0,
              totalTime: window._pt[id].totalTime || 0,
              bossNm: "",
              wsStatus,
            });
          }
        });
      }
    }
    // 如果没有卡片且全局有选中 Token，使用全局的
    if (!pushCards.value.length && selectedTokens.value?.length) {
      pushCards.value = selectedTokens.value.map(id => {
        const tk = tokens.value.find(t => t.id === id);
        const wsStatus = tokenStore.getWebSocketStatus(id);
        return {
          id,
          name: tk ? tk.name : id,
          running: false,
          level: 0,
          wins: 0,
          losses: 0,
          countdown: 0,
          totalTime: 0,
          bossNm: "",
          wsStatus,
        };
      });
    }
  }
});

// 推图日志回调（由tasksItem.js的pushLoop调用）
window._pushLog = (msg, type) => {
  pushLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    text: msg,
    type: type || "info",
  });
  if (pushLogs.value.length > 300) pushLogs.value.length = 300;
};

// 打开模态框回调
window._openPushModal = () => {
  showPushMapModal.value = true;
};

// 刷新卡片状态
const _refreshPushCards = () => {
  if (!window._pt) return;
  // 从 pushCards 中获取账号 ID 列表（而不是 pushSelectedTokens）
  const ids = pushCards.value.map(c => c.id);
  const getBoss = window._getBoss || (() => "");
  
  // 更新现有卡片的状态
  pushCards.value = ids.map(id => {
    const st = window._pt[id] || {};
    const tk = tokens.value.find(t => t.id === id);
    const wsStatus = tokenStore.getWebSocketStatus(id);
    return {
      id, name: tk ? tk.name : id,
      running: !!st.running, level: st.level || 0,
      wins: st.wins || 0, losses: st.losses || 0,
      countdown: st.countdown || 0, totalTime: st.totalTime || 0,
      bossNm: getBoss(st.level || 0),
      wsStatus,
    };
  });
};

// 将选中的账号添加到推图列表
const addTokensToPushList = () => {
  if (!pushSelectedTokens.value.length) return;
  
  // 获取当前已有的 ID 列表
  const existingIds = new Set(pushCards.value.map(c => c.id));
  
  // 添加新的账号（去重）
  pushSelectedTokens.value.forEach(id => {
    if (!existingIds.has(id)) {
      const tk = tokens.value.find(t => t.id === id);
      const wsStatus = tokenStore.getWebSocketStatus(id);
      pushCards.value.push({
        id,
        name: tk ? tk.name : id,
        running: false,
        level: 0,
        wins: 0,
        losses: 0,
        countdown: 0,
        totalTime: 0,
        bossNm: "",
        wsStatus,
      });
    }
  });
  
  // 清空选择器
  pushSelectedTokens.value = [];
};

// 从推图列表中移除账号
const removeTokenFromPushList = (tokenId) => {
  // 先停止该账号的推图
  if (window._bpStopOne) {
    window._bpStopOne(tokenId);
  }
  // 从列表中移除
  pushCards.value = pushCards.value.filter(c => c.id !== tokenId);
};

// 清空全部推图列表
const clearAllPushCards = () => {
  // 先停止所有账号的推图
  pushCards.value.forEach(card => {
    if (window._bpStopOne) {
      window._bpStopOne(card.id);
    }
  });
  // 清空列表
  pushCards.value = [];
};

// 定时刷新状态
const _startPushCheck = () => {
  if (_pushCheckTimer) return;
  _pushCheckTimer = setInterval(() => {
    if (!window._pt) { isAnyPushRunning.value = false; return; }
    // 检查卡片列表中是否有正在运行的账号
    isAnyPushRunning.value = pushCards.value.some(c => window._pt[c.id] && window._pt[c.id].running);
    if (showPushMapModal.value) _refreshPushCards();
  }, 1000);  // 1秒刷新一次，让倒计时显示更流畅
};
_startPushCheck();

// 全部开始（错开启动避免限流：根据账号数量动态调整间隔）
const pushStartAll = async () => {
  // 从卡片列表中获取账号（而不是选择器）
  const ids = pushCards.value.map(c => c.id);
  if (!ids || !ids.length) return;
  if (!window._pt) window._pt = {};
  if (window._bpLoadBossData) await window._bpLoadBossData();

  // 根据账号数量动态调整间隔：
  // - 1-10个账号：3-5秒间隔
  // - 11-30个账号：2-4秒间隔
  // - 31个以上：1-3秒间隔（避免总时间过长）
  const count = ids.length;
  let minDelay, maxDelay;
  if (count <= 10) {
    minDelay = 3000; maxDelay = 5000;
  } else if (count <= 30) {
    minDelay = 2000; maxDelay = 4000;
  } else {
    minDelay = 1000; maxDelay = 3000;
  }

  // 使用_bpStartOne（内含自动连接逻辑），错开启动避免瞬时并发
  if (window._bpStartOne) {
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      if (!window._pt || !window._pt[id] || !window._pt[id].running) {
        window._bpStartOne(id);
        // 动态间隔 + 随机延迟，错开每个账号的执行
        if (idx < ids.length - 1) {  // 最后一个不需要等待
          const staggerDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
          await new Promise(r => setTimeout(r, staggerDelay));
        }
      }
    }
  }
};

// 全部停止
const pushStopAll = (stopAll = false) => {
  if (!window._pt) return;
  // stopAll=true 时（定时触发）：停止所有正在运行的账号，而不仅限于卡片列表
  // stopAll=false 时（按钮手动）：只停止 pushCards 中的账号
  const ids = stopAll
    ? Object.keys(window._pt).filter(id => window._pt[id]?.running)
    : pushCards.value.map(c => c.id);
  if (!ids.length) return;
  ids.forEach(id => {
    if (window._bpStopOne) window._bpStopOne(id);
    else if (window._pt[id]) window._pt[id].stopFlag = true;
  });
  // 定时停止时延迟 5 秒断开 WebSocket 连接，给 pushLoop 时间检测 stopFlag 并优雅退出
  if (stopAll && ids.length) {
    console.log(`[定时停止] 已向 ${ids.length} 个账号发送停止指令，5秒后断开连接`);
    const stopIds = [...ids]; // 快照，避免 ids 引用在异步前被修改
    setTimeout(() => {
      stopIds.forEach(id => {
        // 只关闭仍在推图的连接（pushLoop 退出后 running 会变 false）
        if (window._pt && window._pt[id] && window._pt[id].running) {
          // pushLoop 仍在运行，先强制标记停止
          window._pt[id].running = false;
        }
        try {
          tokenStore.closeWebSocketConnection(id);
        } catch (e) {
          console.warn(`[定时停止] 延迟断开连接失败: ${id}`, e);
        }
      });
      console.log(`[定时停止] 延迟断开完成，共处理 ${stopIds.length} 个账号`);
    }, 5000);
  }
};

// ===================== 定时控制模块 =====================
const pushTimerExpanded = ref(false);

// 时间值（毫秒时间戳，只取时分，n-time-picker 返回当天的 ms 时间戳）
const pushStartTime = ref(null);
const pushStopTime  = ref(null);

// 定时器句柄
const pushStartTimer = ref(null);   // setInterval 句柄
const pushStopTimer  = ref(null);

// 倒计时显示
const pushTimerCountdown = ref('');
let _pushCountdownInterval = null;

// 状态：idle / running（有任意定时器激活就是 running）
const pushTimerStatus = computed(() =>
  (pushStartTimer.value || pushStopTimer.value) ? 'running' : 'idle'
);

// 时间选项（整点分钟，每10分钟一档）
const pushTimeHours   = Array.from({ length: 24 }, (_, i) => i);
const pushTimeMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** 把 n-time-picker 返回的 ms 时间戳转成本地 HH:mm（用 Date 本地方法，避免时区偏移） */
const msToHHMM = (ms) => {
  if (ms == null) return '';
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const pushStartTimeLabel = computed(() => msToHHMM(pushStartTime.value));
const pushStopTimeLabel  = computed(() => msToHHMM(pushStopTime.value));

/** 计算距离目标时间还有多少 ms（均用本地时间对比） */
const msUntilTarget = (targetMs) => {
  const now = new Date();
  // targetMs 是 n-time-picker 返回的本地时间戳，取其本地时分秒
  const t = new Date(targetMs);
  const targetSec = t.getHours() * 3600 + t.getMinutes() * 60;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let diff = (targetSec - nowSec) * 1000;
  if (diff <= 0) diff += 24 * 3600 * 1000;  // 跨日
  return diff;
};

/** 格式化倒计时 */
const formatCountdown = (ms) => {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2,'0')}s`;
  return `${s}s`;
};

/** 更新倒计时文字（每秒刷新，显示最近触发的那个） */
const _updateCountdown = () => {
  const targets = [];
  if (pushStartTimer.value && pushStartTime.value != null)
    targets.push({ label: '开始', ms: msUntilTarget(pushStartTime.value) });
  if (pushStopTimer.value && pushStopTime.value != null)
    targets.push({ label: '停止', ms: msUntilTarget(pushStopTime.value) });
  if (!targets.length) { pushTimerCountdown.value = ''; return; }
  targets.sort((a, b) => a.ms - b.ms);
  const nearest = targets[0];
  pushTimerCountdown.value = `${nearest.label} ${formatCountdown(nearest.ms)}`;
};

/** 启动/取消 开始定时 */
/** 内部：注册下一次开始定时（每天循环） */
const _scheduleNextStart = () => {
  if (pushStartTime.value == null) return;
  const delay = msUntilTarget(pushStartTime.value);
  pushStartTimer.value = setTimeout(async () => {
    window.$message?.success(`定时触发：自动开始推图`);
    await pushStartAll();
    _scheduleNextStart();   // 循环：注册明天同一时刻
    _updateCountdown();
  }, delay);
};

/** 内部：注册下一次停止定时（每天循环） */
const _scheduleNextStop = () => {
  if (pushStopTime.value == null) return;
  const delay = msUntilTarget(pushStopTime.value);
  pushStopTimer.value = setTimeout(() => {
    window.$message?.warning(`定时触发：自动停止推图`);
    pushStopAll(true);      // 停止所有正在运行的账号
    _scheduleNextStop();    // 循环：注册明天同一时刻
    _updateCountdown();
  }, delay);
};

/** 启动/取消 开始定时 */
const togglePushStartTimer = () => {
  if (pushStartTimer.value) {
    clearTimeout(pushStartTimer.value);
    pushStartTimer.value = null;
    window.$message?.info('已取消自动开始定时');
    _updateCountdown();
    return;
  }
  if (pushStartTime.value == null) return;
  _scheduleNextStart();
  const delay = msUntilTarget(pushStartTime.value);
  window.$message?.success(`已设置 ${pushStartTimeLabel.value} 每天自动开始推图（${formatCountdown(delay)}后首次触发）`);
  _updateCountdown();
};

/** 启动/取消 停止定时 */
const togglePushStopTimer = () => {
  if (pushStopTimer.value) {
    clearTimeout(pushStopTimer.value);
    pushStopTimer.value = null;
    window.$message?.info('已取消自动停止定时');
    _updateCountdown();
    return;
  }
  if (pushStopTime.value == null) return;
  _scheduleNextStop();
  const delay = msUntilTarget(pushStopTime.value);
  window.$message?.success(`已设置 ${pushStopTimeLabel.value} 每天自动停止推图（${formatCountdown(delay)}后首次触发）`);
  _updateCountdown();
};

// 每秒刷新倒计时
_pushCountdownInterval = setInterval(_updateCountdown, 1000);

// 定时器与弹窗生命周期无关，关闭弹窗后仍继续倒计，到时自动触发推图开始/停止
// ===================== 定时控制模块 END =====================

// 全选/取消全选
const pushSelectAll = () => {
  const allIds = pushTokenOptions.value.map(o => o.value);
  pushSelectedTokens.value = [...allIds];
};
const pushClearAll = () => {
  pushSelectedTokens.value = [];
  pushGroupSelected.value = [];
};

// 推图弹窗分组快捷选择
const pushGroupSelected = ref([]);
const pushGroupCollapsed = ref(false);
const pushSelectByGroup = (groupId) => {
  const idx = pushGroupSelected.value.indexOf(groupId);
  const groupTokenIds = getValidGroupTokenIds(groupId);
  if (idx >= 0) {
    // 取消选中：从 pushSelectedTokens 移除该分组的所有 token
    pushGroupSelected.value.splice(idx, 1);
    pushSelectedTokens.value = pushSelectedTokens.value.filter(id => !groupTokenIds.includes(id));
  } else {
    // 选中：将该分组的 token 合并进 pushSelectedTokens
    pushGroupSelected.value.push(groupId);
    const existing = new Set(pushSelectedTokens.value);
    groupTokenIds.forEach(id => existing.add(id));
    pushSelectedTokens.value = [...existing];
  }
};

// 标签式账号选择器：搜索、过滤、切换、显示名
const pushSearchQuery = ref('');
const filteredPushOptions = computed(() => {
  if (!pushSearchQuery.value) return pushTokenOptions.value;
  const q = pushSearchQuery.value.toLowerCase();
  return pushTokenOptions.value.filter(opt => opt.label.toLowerCase().includes(q));
});
const togglePushAccount = (tokenId) => {
  const idx = pushSelectedTokens.value.indexOf(tokenId);
  if (idx >= 0) {
    pushSelectedTokens.value.splice(idx, 1);
  } else {
    pushSelectedTokens.value.push(tokenId);
  }
};
const shortName = (name) => {
  if (!name) return name;
  return name.replace(/-\d+$/, '');
};
const getTokenDisplayName = (tokenId) => {
  const opt = pushTokenOptions.value.find(o => o.value === tokenId);
  return opt ? shortName(opt.label.replace(/[✅⏳⚪]/g, '').trim()) : tokenId.slice(0, 8);
};

// 单个切换
const pushToggleOne = (id) => {
  if (!window._pt) window._pt = {};
  if (window._pt[id] && window._pt[id].running) {
    if (window._bpStopOne) window._bpStopOne(id);
    else window._pt[id].stopFlag = true;
  } else {
    if (window._bpStartOne) window._bpStartOne(id);
    else if (window._bpPushLoop) window._bpPushLoop(id);
  }
};

const tasksDungeon = wrapTaskFunctions(createTasksDungeon(createTaskDeps()));
const { batchbaoku13, batchbaoku45, batchmengjing, batchBuyDreamItems } = tasksDungeon;

const tasksArena = wrapTaskFunctions(createTasksArena(createTaskDeps()));
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = wrapTaskFunctions(createTasksStore(createTaskDeps()));
const { legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, manual_buy, collection_exchange, charge_claimaddup_rewards, collection_claimfreereward, claim_recruit_welfare, claim_weird_tower_all, claim_weird_tower_pass, use_spotted_egg, claim_pet_book, batch_pet_merge, batch_pet_upgrade, gacha_drawreward, store_buy_selectable, batchCollectionExchange, legion_buy_red_jade, legion_buy_spotted_egg, salt_crystal_shop_buy, saltCrystalShopConfig, salt_ingot_shop_buy, saltIngotShopConfig, star_drawturntable, batch_star_challenge, nightmare_draw_lottery, nightmare_claim_book_reward, pkroom_appoint, claim_guess_coin, legion_buy_store_items, weeklyMarketBuy, weekly_market_free_gift, batch_mail_claim_and_cleanup, saltcup26_openstarpack_use, batchSaltCupBet, getSaltCupBetInfo, batchSaltRoadCheer } = tasksStore;

// ====== 采购清单配置 ======
// 采购清单可选项（用于任务模板中多选）
// goodsId: store_buy 使用的商品ID（从 store_goodslist 获取）
// itemId: 采购清单使用的物品ID（用于 store_setpurchase）
const purchaseItemOptions = [
  // 宝箱类
  { goodsId: 1, itemId: 2002, name: '青铜宝箱' },
  { goodsId: 2, itemId: 2003, name: '黄金宝箱' },
  { goodsId: 3, itemId: 2004, name: '铂金宝箱' },
  // 材料类
  { goodsId: 4, itemId: 1003, name: '进阶石' },
  { goodsId: 5, itemId: 1006, name: '精铁' },
  { goodsId: 6, itemId: 1001, name: '招募令' },
  // 武将碎片类
  { goodsId: 7, itemId: 3007, name: '随机红将碎片' },
  { goodsId: 8, itemId: 3006, name: '随机橙将碎片' },
  { goodsId: 9, itemId: 3005, name: '随机紫将碎片' },
  // 特殊类
  { goodsId: 10, itemId: 1016, name: '梦魇晶石' },
  // 鱼竿类
  { goodsId: 11, itemId: 1011, name: '普通鱼竿' },
  { goodsId: 12, itemId: 1012, name: '黄金鱼竿' },
  // 活动类
  { goodsId: 13, itemId: 1030, name: '咸神门票' },
  // 玉石类
  { goodsId: 14, itemId: 1022, name: '白玉' },
  { goodsId: 15, itemId: 1023, name: '彩玉' },
  // 材料类
  { goodsId: 16, itemId: 1026, name: '扳手' },
];

// 多选购买 Modal State
const showManualBuyModal = ref(false);
const manualBuyConfig = ref([]);

// 珍宝阁商店购买 Modal State
const showCollectionExchangeModal = ref(false);
const collectionExchangeConfig = ref([]);

// 珍宝阁商店商品选项（goodsId/限购次数）
const collectionExchangeItemOptions = [
  { label: "铂金宝箱", value: 7001, maxCount: 3 },
  { label: "军团币", value: 4001, maxCount: 2 },
  { label: "招募令", value: 5001, maxCount: 1 },
  { label: "万能红将碎片", value: 6001, maxCount: 10 },
];

// 黑市多选购买网格列数（手机端1列，桌面端2列）
const gridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

// 定时任务弹窗网格列数（手机端1列，桌面端2列）
const taskGridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

const openManualBuyModal = () => {
  // 从已保存的配置恢复勾选状态
  const savedItems = batchSettings.manualBuyItems || [];
  manualBuyConfig.value = purchaseItemOptions.map(item => {
    const saved = savedItems.find(s => s.goodsId === item.goodsId);
    return {
      ...item,
      _checked: !!saved && saved.count > 0,
      count: saved ? saved.count : 0,
    };
  });
  showManualBuyModal.value = true;
};

const executeManualBuy = () => {
  const selectedItems = manualBuyConfig.value
    .filter(item => item._checked && item.count > 0)
    .map(item => ({
      goodsId: item.goodsId,
      name: item.name,
      count: item.count,
    }));
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 保存配置到 batchSettings，供定时任务使用
  batchSettings.manualBuyItems = selectedItems;
  saveBatchSettings();
  
  showManualBuyModal.value = false;
  store_buy_selectable(selectedItems);
};

const openCollectionExchangeModal = () => {
  // 从已保存的配置恢复勾选状态
  const savedItems = batchSettings.collectionExchangeItems || [];
  collectionExchangeConfig.value = collectionExchangeItemOptions.map(item => {
    const saved = savedItems.find(s => s.goodsId === item.value);
    return {
      ...item,
      _checked: !!saved && saved.count > 0,
      count: saved ? saved.count : 0,
    };
  });
  showCollectionExchangeModal.value = true;
};

const executeCollectionExchange = () => {
  const selectedItems = collectionExchangeConfig.value
    .filter(item => item._checked && item.count > 0)
    .map(item => ({
      goodsId: item.value,
      name: item.label,
      count: item.count,
    }));
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 保存配置到 batchSettings，供定时任务使用
  batchSettings.collectionExchangeItems = selectedItems;
  saveBatchSettings();
  
  showCollectionExchangeModal.value = false;
  batchCollectionExchange(selectedItems);
};

// 采购清单 checkbox 切换辅助函数
const togglePurchaseItem = (arr, discounts, itemId) => {
  const idx = arr.indexOf(itemId);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(itemId);
    // 勾选时确保折扣值存在
    if (!discounts) discounts = {};
    if (discounts[itemId] == null) discounts[itemId] = 10;
  }
};

// 确保采购清单折扣全部初始化（返回新对象触发响应式更新）
const initPurchaseDiscounts = (discounts) => {
  const result = { ...(discounts || {}) };
  purchaseItemOptions.forEach(item => {
    if (result[item.goodsId] == null) result[item.goodsId] = 10;
  });
  return result;
};

// 获取折扣值（始终返回数字，避免 undefined 导致 n-input-number 显示空白）
const getDiscount = (discounts, itemId) => {
  return discounts?.[itemId] ?? 10;
};

// 设置折扣值（显式赋值确保响应式更新）
const setDiscount = (discounts, itemId, val) => {
  const num = (val != null && val !== '') ? Number(val) : 10;
  discounts[itemId] = Math.max(1, Math.min(10, isNaN(num) ? 10 : num));
};

// 同步采购清单到游戏
const syncPurchaseBusy = ref(false);
const syncPurchaseToGame = async () => {
  const tokenId = currentSettingsTokenId.value;
  if (!tokenId) return;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    message.warning('该账号WebSocket未连接，请先连接后再同步');
    return;
  }
  const purchaseList = currentSettings.purchaseList || [];
  if (purchaseList.length === 0) {
    message.warning('请先勾选采购商品');
    return;
  }
  syncPurchaseBusy.value = true;
  try {
    const discounts = currentSettings.purchaseDiscounts || {};
    const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
    const purchaseCnt = currentSettings.purchaseCnt ?? 15;
    await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
    message.success(`采购清单已同步到游戏 (${purchaseItemList.length}项, 次数${purchaseCnt})`);
  } catch (e) {
    message.error(`同步失败: ${e.message}`);
  } finally {
    syncPurchaseBusy.value = false;
  }
};

// 同步采购清单到勾选的账号（自动连接）
const batchSyncPurchaseToGame = async () => {
  if (selectedTokens.value.length === 0) return;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    // 读取该账号的日常设置
    let settings = null;
    try {
      const raw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}

    const purchaseList = settings?.purchaseList || [];
    if (purchaseList.length === 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未配置采购清单，跳过`, type: "info" });
      skipCount++;
      continue;
    }

    try {
      // 自动连接
      await ensureConnection(tokenId);
      await new Promise(r => setTimeout(r, 2000));

      const discounts = settings.purchaseDiscounts || {};
      const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
      const purchaseCnt = settings.purchaseCnt ?? 15;
      await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步成功 (${purchaseItemList.length}项, 次数${purchaseCnt})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步失败: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
    }
  }

  const summary = `同步完成: 成功${successCount}个, 跳过${skipCount}个, 失败${failCount}个`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
};

// ====== 批量采购清单配置弹窗 ======
const showBatchPurchaseConfigModal = ref(false);
const batchPurchaseList = ref([]);
const batchPurchaseDiscounts = ref({});
const batchPurchaseCnt = ref(15);
const batchPurchaseSyncing = ref(false);

// 打开弹窗：从第一个勾选账号读取现有配置作为默认值
const openBatchPurchaseConfig = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先勾选账号');
    return;
  }
  // 从第一个账号读取现有配置
  const firstTokenId = selectedTokens.value[0];
  try {
    const raw = localStorage.getItem(`daily-settings:${firstTokenId}`);
    if (raw) {
      const settings = JSON.parse(raw);
      batchPurchaseList.value = [...(settings.purchaseList || [])];
      batchPurchaseDiscounts.value = initPurchaseDiscounts(settings.purchaseDiscounts);
      batchPurchaseCnt.value = settings.purchaseCnt ?? 15;
    } else {
      batchPurchaseList.value = [];
      batchPurchaseDiscounts.value = initPurchaseDiscounts({});
      batchPurchaseCnt.value = 15;
    }
  } catch (e) {
    batchPurchaseList.value = [];
    batchPurchaseDiscounts.value = initPurchaseDiscounts({});
    batchPurchaseCnt.value = 15;
  }
  showBatchPurchaseConfigModal.value = true;
};

// 保存并同步采购清单到所有勾选账号
const applyBatchPurchaseConfig = async () => {
  if (batchPurchaseList.value.length === 0) {
    message.warning('请先勾选至少一个采购商品');
    return;
  }
  showBatchPurchaseConfigModal.value = false;
  batchPurchaseSyncing.value = true;

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    // 1. 保存到该账号的 localStorage
    try {
      let settings = {};
      try {
        const raw = localStorage.getItem(`daily-settings:${tokenId}`);
        if (raw) settings = JSON.parse(raw);
      } catch (e) {}
      settings.purchaseList = [...batchPurchaseList.value];
      settings.purchaseDiscounts = { ...batchPurchaseDiscounts.value };
      settings.purchaseCnt = batchPurchaseCnt.value;
      settings.blackMarketPurchase = true;
      localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 保存采购清单到本地失败: ${e.message}`, type: "warning" });
    }

    // 2. 自动连接并同步到游戏
    try {
      await ensureConnection(tokenId);
      await new Promise(r => setTimeout(r, 2000));

      const purchaseItemList = batchPurchaseList.value.map(id => ({
        itemId: id,
        discount: batchPurchaseDiscounts.value[id] ?? 10,
      }));
      await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', {
        purchaseItemList,
        purchaseCnt: batchPurchaseCnt.value,
      }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步成功 (${purchaseItemList.length}项, 次数${batchPurchaseCnt.value})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步失败: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
    }
  }

  const summary = `采购清单同步完成: 成功${successCount}个, 失败${failCount}个`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
  batchPurchaseSyncing.value = false;
};

const tasksLegacy = wrapTaskFunctions(createTasksLegacy(createTaskDeps()));
const { batchLegacyClaim, batchLegacyHangup, batchLegacyGiftSendEnhanced, batchLegacyClaimGiftTask } = tasksLegacy;

// ====== 十殿阀罗挑战（弹窗打开组队界面） ======
const showNightmareChallengeModal = ref(false);
const showStarTeamModal = ref(false);
const batchNightmareChallenge = async () => {
  // 当未勾选账号时直接打开弹窗，由十殿卡片内的队长下拉框选择队长
  if (selectedTokens.value.length === 0) {
    showNightmareChallengeModal.value = true;
    return;
  }
  // 勾选了多个账号时提示只选一个
  if (selectedTokens.value.length > 1) { message.warning("请只选择一个队长执行"); return; }
  const tokenId = selectedTokens.value[0];
  // 自动连接
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    tokenStore.selectToken(tokenId, true);
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 30) {
      await new Promise((r) => setTimeout(r, 500)); retries++;
    }
  }
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    message.error("WebSocket连接失败，无法打开十殿挑战");
    return;
  }
  // 根据账号设置自动切换十殿阵容
  try {
    const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      const nmFormation = settings.nightmareFormation;
      if (nmFormation && nmFormation >= 1 && nmFormation <= 6) {
        await tokenStore.sendMessageWithPromise(
          tokenId, 'presetteam_saveteam',
          { teamId: nmFormation }, 8000);
        message.success(`已切换到十殿阵容${nmFormation}`);
      }
    }
  } catch (err) {
    // 切换失败不阻塞，静默处理
    console.warn('十殿阵容切换失败:', err);
  }
  // 打开组队弹窗
  showNightmareChallengeModal.value = true;
};

// ====== 定时任务：十殿阎罗挑战（根据勾选预设执行） ======
const batchNightmareChallengePresets = async (silent, taskRecordIndex = -1) => {
  // silent 参数兼容定时任务调用，此处不使用
  const nmTask = currentScheduledTask;
  const presetIds = nmTask?.nightmarePresetIds || [];
  if (presetIds.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '十殿挑战：未配置预设，跳过', type: 'warning' });
    return;
  }

  // 加载全部预设
  let allPresets = [];
  try {
    const raw = localStorage.getItem('nightmare-presets');
    allPresets = raw ? JSON.parse(raw) : [];
  } catch { allPresets = []; }

  // 过滤出选中的预设
  const presets = allPresets.filter(p => presetIds.includes(p.id));
  if (presets.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '十殿挑战：选中的预设不存在，跳过', type: 'warning' });
    // ✅ BUG修复：预设不存在时清零 runningCount，避免任务记录进度永远无法完成
    if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
      taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    }
    return;
  }

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 十殿阎罗挑战：开始执行 ${presets.length} 个预设 ===`, type: 'info' });

  // 计算所有预设的成员总数（用于任务完成度统计）
  // ✅ BUG修复：改为按预设累加计数，与 onComplete/onError 的按预设计数口径一致
  // （原先用唯一成员数，共享队员会被每个预设重复计入 success/fail，导致进度超过100%、runningCount 变负）
  let totalMembers = 0;
  for (const p of presets) {
    totalMembers += (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length;
  }

  // 更新任务记录：设置正确的总成员数
  if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
    taskExecutionRecords.value[taskRecordIndex].totalAccounts = totalMembers;
    taskExecutionRecords.value[taskRecordIndex].runningCount = totalMembers;
  }

  // 构建队员使用计数（用于共享队员检测 + 延迟断连）
  const memberUsageCount = new Map(); // tokenId → 使用该队员的预设数量
  const memberLastPresetIndex = new Map(); // tokenId → 最后使用该队员的预设索引
  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const allIds = [p.captainTokenId, ...(p.memberTokenIds || [])].filter(Boolean);
    for (const tid of allIds) {
      memberUsageCount.set(tid, (memberUsageCount.get(tid) || 0) + 1);
      memberLastPresetIndex.set(tid, idx); // 不断更新，最终值为最后使用的索引
    }
  }

  // 检测共享队长（严重冲突）
  const captainIds = presets.map(p => p.captainTokenId).filter(Boolean);
  const duplicateCaptains = captainIds.filter((id, i) => captainIds.indexOf(id) !== i);
  if (duplicateCaptains.length > 0) {
    const names = [...new Set(duplicateCaptains)].map(id => tokenStore.gameTokens.find(t => t.id === id)?.name || id.slice(0, 8));
    addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 多个预设使用相同队长: ${names.join('、')}，后续预设将自动跳过`, type: 'warning' });
  }

  // 收集需要跳过的重复队长预设索引（仅保留第一个，跳过后续）
  const skipDuplicateCaptainPresets = new Set();
  if (duplicateCaptains.length > 0) {
    const seenCaptains = new Set();
    for (let idx = 0; idx < captainIds.length; idx++) {
      const cid = captainIds[idx];
      if (duplicateCaptains.includes(cid)) {
        if (seenCaptains.has(cid)) {
          skipDuplicateCaptainPresets.add(idx);
        } else {
          seenCaptains.add(cid);
        }
      }
    }
  }

  // 检测共享队员（可能导致前预设战斗异常）
  const sharedMembers = [...memberUsageCount.entries()]
    .filter(([tid, count]) => count > 1 && !duplicateCaptains.includes(tid))
    .map(([tid]) => tokenStore.gameTokens.find(t => t.id === tid)?.name || tid.slice(0, 8));
  if (sharedMembers.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 以下队员被多个预设共享: ${sharedMembers.join('、')}，加入新房间后可能从前一个房间被移除`, type: 'warning' });
  }

  // 输出预设概览
  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const capName = tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '未知';
    const memberNames = (p.memberTokenIds || []).map(mid => tokenStore.gameTokens.find(t => t.id === mid)?.name || mid.slice(0, 8)).join('、') || '无';
    const totalCount = (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length;
    addLog({ time: new Date().toLocaleTimeString(), message: `  预设${idx + 1}:「${p.name || '未命名'}」👑${capName} 👥${totalCount}人(队员: ${memberNames})`, type: 'info' });
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const activeBattles = [];
  _activeNightmareBattles = activeBattles; // ✅ 暴露给模块级，便于外层超时传导停止
  const MAX_RETRY = 2; // 每个预设最多重试2次
  const retryCountMap = new Map(); // presetId → 重试次数

  // ====== 跨标签页协调机制 ======
  // ✅ BUG修复：与 NightmareChallengeCard 保持一致，tabId 存入 sessionStorage（页面刷新后不变），
  // 避免刷新后自己残留的运行标记被误判为"其他标签页运行中"而阻塞执行
  const getTabId = () => {
    if (!sessionStorage.getItem('__nightmare_tab_id')) {
      sessionStorage.setItem('__nightmare_tab_id', `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    }
    return sessionStorage.getItem('__nightmare_tab_id');
  };

  const isPresetRunningInOtherTab = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (!data.tabId || !data.timestamp) return false;
      // ✅ BUG修复：过期窗口由 10 分钟改为 3 小时（与卡片端及战斗最长时长对齐），
      // 原 10 分钟窗口在战斗进行 10 分钟后即失效，其他标签页会重复启动同一预设
      if (Date.now() - data.timestamp > 3 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return false;
      }
      return data.tabId !== getTabId();
    } catch {
      return false;
    }
  };

  const markPresetRunning = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      localStorage.setItem(key, JSON.stringify({
        tabId: getTabId(),
        timestamp: Date.now(),
      }));
    } catch { /* ignore */ }
  };

  const clearPresetRunning = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  };

  // ✅ BUG修复：预设未实际启动（跳过/启动失败）时同步任务统计，
  // 避免 runningCount 卡住导致任务记录进度永远无法到 100%
  const countPresetAsFailed = (preset) => {
    if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
      const rec = taskExecutionRecords.value[taskRecordIndex];
      const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
      rec.failCount += memberCount;
      rec.runningCount = Math.max(0, rec.runningCount - memberCount);
      const completed = rec.successCount + rec.failCount;
      rec.progressPercent = rec.totalAccounts > 0 ? Math.round((completed / rec.totalAccounts) * 100) : 0;
    }
  };

  // 初始化 sessionStorage（清除上次的批量数据）
  try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }

  // ====== 单预设执行函数（初始执行和重试共用） ======
  const executeOnePreset = async (preset, label, presetIndex = -1) => {
    const captainTokenId = preset.captainTokenId;
    const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId);
    if (!captainToken) {
      addLog({ time: new Date().toLocaleTimeString(), message: `预设「${preset.name}」队长Token不存在，跳过`, type: 'warning' });
      return null;
    }

    // 防止跨标签页重复启动
    if (isPresetRunningInOtherTab(preset.id)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `预设「${preset.name}」在其他标签页运行中，跳过`, type: 'warning' });
      return null;
    }

    // 标记为运行中（跨标签页协调）
    markPresetRunning(preset.id);

    addLog({ time: new Date().toLocaleTimeString(), message: `▶ ${label} 队长: ${captainToken.name}`, type: 'info' });

    // 1. 确保队长连接
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `连接队长 ${captainToken.name}...`, type: 'info' });
      await tokenStore.createWebSocketConnection(captainTokenId, captainToken.token, captainToken.wsUrl || null);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected' && retries < 30) {
        await delay(1000);
        retries++;
      }
    }
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `队长 ${captainToken.name} 连接失败，跳过预设`, type: 'error' });
      clearPresetRunning(preset.id); // ✅ BUG修复：提前退出时清除跨标签页运行标记
      return null;
    }

    // 2. 获取队长 roleId
    let captainRoleId = '';
    try {
      const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId, {});
      captainRoleId = String(roleInfo?.role?.roleId || '');
      if (!captainRoleId) {
        addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 失败，跳过预设`, type: 'error' });
        clearPresetRunning(preset.id);
        return null;
      }
    } catch (err) {
      addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 异常: ${err.message || err}，跳过`, type: 'error' });
      clearPresetRunning(preset.id);
      return null;
    }

    // 3. 检查现有队伍和战斗房间
    let teamId = '';
    let hasActiveBattle = false;
    let existingRoomId = null;

    // 3a. 先检查是否已有活跃后台战斗（防止重复启动同一队长的战斗）
    const alreadyRunning = activeBattles.find(b =>
      b.preset.captainTokenId === captainTokenId &&
      (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')
    );
    if (alreadyRunning) {
      addLog({ time: new Date().toLocaleTimeString(), message: `队长 ${captainToken.name} 已有后台战斗「${alreadyRunning.preset.name}」运行中，跳过`, type: 'warning' });
      clearPresetRunning(preset.id);
      return null;
    }

    // 3b. 查询队长是否有队伍
    let existingTeamId = null;
    try {
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'matchteam_getroleteaminfo',
        { roleID: Number(captainRoleId) }, 10000
      );
      existingTeamId = roleTeamRes?.teamInfo?.teamId;
    } catch { /* 无队伍 */ }

    // 3c. 独立检查是否有进行中的战斗房间（无论是否有队伍）
    try {
      const nightResp = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'nightmare_getroleinfo',
        { roleId: Number(captainRoleId) }, 10000
      );
      existingRoomId = nightResp?.nightMareData?.roomId
        || nightResp?.nightmareData?.roomId
        || nightResp?.roomId
        || nightResp?.roomid
        || null;
    } catch { /* 没有战斗房间 */ }

    if (existingRoomId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `✅ 发现进行中的战斗 RoomId: ${existingRoomId}，接管继续挑战`, type: 'success' });
      teamId = existingTeamId ? String(existingTeamId) : '';
      hasActiveBattle = true;
    } else if (existingTeamId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `发现过期残留队伍 TeamId: ${existingTeamId}，正在解散...`, type: 'warning' });
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_dismiss',
          { teamId: Number(existingTeamId) }, 10000
        );
        addLog({ time: new Date().toLocaleTimeString(), message: '残留队伍已解散', type: 'success' });
      } catch (dismissErr) {
        const errMsg = dismissErr.message || String(dismissErr);
        if (!errMsg.includes('200020') && !errMsg.includes('6100020')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `解散失败: ${errMsg}，跳过`, type: 'error' });
          clearPresetRunning(preset.id);
          return null;
        }
      }
      await delay(1000);
    }

    // 4. 创建房间（如果没有活跃战斗）
    if (!hasActiveBattle) {
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_getrandteamlist',
          { teamCfgId: 1, param: 0, custom: {} }, 10000
        );
        const createResp = await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_create',
          {
            teamCfgId: 1,
            setting: { name: '十殿先锋队', notice: '', secret: 1, apply: 0, applyList: [] },
            param: 0, custom: {}, extParam: 0,
          }, 10000
        );
        teamId = String(createResp?.teamInfo?.teamId || '');
        if (!teamId) {
          addLog({ time: new Date().toLocaleTimeString(), message: '创建房间失败，跳过预设', type: 'error' });
          clearPresetRunning(preset.id);
          return null;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `房间创建成功 TeamId: ${teamId}`, type: 'success' });
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `创建房间异常: ${err.message || err}，跳过`, type: 'error' });
        clearPresetRunning(preset.id);
        return null;
      }
      await delay(3000);
    }

    // 5. 队员加入并准备
    const memberTokenIds = (preset.memberTokenIds || []).slice(0, 4)
      .filter(tid => tokenStore.gameTokens.some(t => t.id === tid));

    if (!hasActiveBattle && memberTokenIds.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `队员加入并准备 (${memberTokenIds.length}人)...`, type: 'info' });
      const alreadyJoined = new Set();

      for (const tid of memberTokenIds) {
        const token = tokenStore.gameTokens.find(t => t.id === tid);
        const name = token ? token.name : tid.slice(0, 8);

        if (tokenStore.getWebSocketStatus(tid) !== 'connected') {
          tokenStore.createWebSocketConnection(tid, token.token, token.wsUrl || null).catch(() => {});
          let retries = 0;
          while (tokenStore.getWebSocketStatus(tid) !== 'connected' && retries < 20) {
            await delay(1000);
            retries++;
          }
        }
        if (tokenStore.getWebSocketStatus(tid) !== 'connected') {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 连接失败，跳过该成员`, type: 'warning' });
          continue;
        }

        try {
          if (preset.usePresetTeam !== false && preset.teamSlots?.[tid]) {
            const slot = preset.teamSlots[tid];
            try {
              await tokenStore.sendMessageWithPromise(
                tid, 'presetteam_saveteam', { teamId: slot }, 8000
              );
              addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 已切换到阵容槽位 ${slot}`, type: 'info' });
            } catch { /* 阵容切换失败不阻塞 */ }
          }

          await tokenStore.sendMessageWithPromise(
            tid, 'matchteam_getrandteamlist',
            { teamCfgId: 1, param: 0, custom: {} }, 10000
          );

          if (!alreadyJoined.has(tid)) {
            try {
              await tokenStore.sendMessageWithPromise(
                tid, 'matchteam_join', { teamId: Number(teamId) }, 10000
              );
              alreadyJoined.add(tid);
            } catch (joinErr) {
              const joinMsg = joinErr.message || String(joinErr);
              if (joinMsg.includes('7100020')) {
                alreadyJoined.add(tid);
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 加入房间失败: ${joinMsg}`, type: 'warning' });
                continue;
              }
            }
          }
          await delay(1000);

          await tokenStore.sendMessageWithPromise(
            tid, 'matchteam_memberprepare', { teamId: Number(teamId) }, 10000
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 加入并准备成功`, type: 'success' });
        } catch (err) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 操作失败: ${err.message || err}`, type: 'warning' });
        }

        // BUG2修复：共享队员延迟断连 - 如果后续预设还需要该队员，不断开连接
        const isSharedMember = memberUsageCount.get(tid) > 1;
        const lastPresetIdx = memberLastPresetIndex.get(tid) ?? -1;
        if (isSharedMember && presetIndex >= 0 && presetIndex < lastPresetIdx) {
          // 后续预设还需要该队员，保持连接（避免从前预设房间被移除）
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 共享队员，保持连接供后续预设使用`, type: 'info' });
        } else {
          try { await tokenStore.closeWebSocketConnection(tid); } catch { /* ignore */ }
        }
        await delay(500);
      }
    }

    // 6. 获取 RoomId
    addLog({ time: new Date().toLocaleTimeString(), message: '开始战斗，获取 RoomId...', type: 'info' });
    let roomId = existingRoomId;

    if (!roomId) {
      try {
        const openResp = await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_openteam',
          { teamId: Number(teamId) }, 10000
        );
        roomId = openResp?.roomId || openResp?.roomid || openResp?.roomInfo?.roomId || null;
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `开启房间失败: ${err.message || err}`, type: 'error' });
        clearPresetRunning(preset.id);
        return null;
      }

      if (!roomId && captainRoleId) {
        for (let attempt = 1; attempt <= 10; attempt++) {
          try {
            const resp = await tokenStore.sendMessageWithPromise(
              captainTokenId, 'nightmare_getroleinfo',
              { roleId: Number(captainRoleId) }, 10000
            );
            roomId = resp?.nightMareData?.roomId || resp?.nightmareData?.roomId || resp?.roomId || resp?.roomid || null;
            if (roomId) break;
            await delay(3000);
          } catch { await delay(3000); }
        }
      }
    }

    if (!roomId) {
      addLog({ time: new Date().toLocaleTimeString(), message: '无法获取 RoomId，跳过预设', type: 'error' });
      clearPresetRunning(preset.id);
      return null;
    }

    // 7. 启动后台战斗服务
    addLog({ time: new Date().toLocaleTimeString(), message: `RoomId: ${roomId}，启动后台战斗服务`, type: 'info' });

    const battleEntry = { preset, battle: null, roomId, teamId, status: 'running', currentLevel: 0, failReason: null, originalIndex: presetIndex };

    const battle = new NightmareAutoBattleService({
      captainTokenId,
      roomId,
      teamId,
      presetData: preset,
      captainRoleId,
      tokenStore,
      activeBattles,
      onLog: (msg, type) => addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] ${msg}`, type: type || 'info' }),
      onStatusChange: (info) => {
        if (battleEntry) {
          battleEntry.status = info.status;
          if (info.currentLevel !== undefined) battleEntry.currentLevel = info.currentLevel;
          if (info.reason) battleEntry.failReason = info.reason;
          // ✅ 处理 teamId 变更（_reopenRoom 7100020 重试重建队伍后）
          if (info.teamId) battleEntry.teamId = String(info.teamId);
        }
        if (info.status === 'running' && info.currentLevel > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 当前挑战第${info.currentLevel}关`, type: 'info' });
        }
      },
      onComplete: (result) => {
        const levelInfo = result?.level ? ` (第${result.level}关)` : '';
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${preset.name}」挑战完成${levelInfo}！`, type: 'success' });
        // 清除跨标签页运行标记
        clearPresetRunning(preset.id);

        // 更新任务完成度统计：该预设的所有成员都成功
        if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
          const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
          taskExecutionRecords.value[taskRecordIndex].successCount += memberCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount -= memberCount;
          // 更新进度百分比
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
      },
      onError: (err) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `❌ 预设「${preset.name}」战斗异常: ${err.message || err}`, type: 'error' });
        // 清除跨标签页运行标记
        clearPresetRunning(preset.id);

        // 更新任务完成度统计：该预设的所有成员都失败
        if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
          const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
          taskExecutionRecords.value[taskRecordIndex].failCount += memberCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount -= memberCount;
          // 更新进度百分比
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
      },
    });

    battleEntry.battle = battle;
    activeBattles.push(battleEntry);
    battle.start().catch(err => {
      addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 战斗启动异常: ${err.message || err}`, type: 'error' });
      console.error('[十殿阎罗] battle.start() 未捕获异常:', err);
    });

    addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${preset.name}」已在后台启动战斗`, type: 'success' });

    // BUG1修复：批量模式用数组存储所有活跃预设，避免覆盖
    try {
      const existing = JSON.parse(sessionStorage.getItem('nightmare-batch-battles') || '[]');
      existing.push({
        presetId: preset.id,
        presetName: preset.name,
        captainTokenId,
        captainRoleId,
        memberTokenIds: preset.memberTokenIds || [],
        teamSlots: preset.teamSlots || {},
        roomId: battle.getRoomId(),
        startedAt: new Date().toISOString(),
      });
      sessionStorage.setItem('nightmare-batch-battles', JSON.stringify(existing));
      // 同时保留最后一个单预设记录（兼容旧逻辑）
      sessionStorage.setItem('nightmare-last-battle-preset', JSON.stringify(existing[existing.length - 1]));
    } catch { /* ignore */ }

    return battleEntry;
  };

  // ====== 主执行循环：逐个启动预设 ======
  for (let i = 0; i < presets.length; i++) {
    if (shouldStop.value) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 收到停止信号，取消剩余 ${presets.length - i} 个预设`, type: 'warning' });
      break;
    }
    // ✅ 跳过重复队长的后续预设
    if (skipDuplicateCaptainPresets.has(i)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏭ 预设「${presets[i].name}」队长与其他预设重复，自动跳过`, type: 'warning' });
      countPresetAsFailed(presets[i]); // ✅ BUG修复：跳过的预设同步计入统计，避免 runningCount 卡住
      continue;
    }
    const preset = presets[i];
    const entry = await executeOnePreset(preset, `执行预设「${preset.name}」(${i + 1}/${presets.length})`, i);
    if (!entry) { countPresetAsFailed(preset); continue; }

    // 预设间错开延迟（避免服务器压力）
    if (i < presets.length - 1) {
      const delaySec = nmTask?.nightmarePresetDelay || 10;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${delaySec}秒后启动下一个预设...`, type: 'info' });
      await delay(delaySec * 1000);
    }
  }

  // ====== 等待所有战斗完成 + 失败重试 ======
  if (activeBattles.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `⏳ 等待 ${activeBattles.length} 个后台战斗完成...`, type: 'info' });
    const maxWait = 2 * 60 * 60 * 1000; // 2小时超时
    const startTime = Date.now();
    let reportInterval = 0;
    while (Date.now() - startTime < maxWait && !shouldStop.value) {
      // 检测失败的预设并触发重试
      const failedBattles = activeBattles.filter(b =>
        b.status === 'failed' && !b._retried
      );
      for (const fb of failedBattles) {
        const currentRetries = retryCountMap.get(fb.preset.id) || 0;
        // 实力不足/无可用成员类失败，重试只会浪费挑战次数，直接跳过
        if (['retry_limit_reached', 'no_available_members'].includes(fb.failReason)) {
          fb._retried = true;
          addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 预设「${fb.preset.name}」失败原因 ${fb.failReason}，重试无法解决，不再重试`, type: 'warning' });
          continue;
        }
        if (currentRetries < MAX_RETRY) {
          retryCountMap.set(fb.preset.id, currentRetries + 1);
          fb._retried = true; // 标记已处理，避免重复重试
          fb.status = 'retrying'; // 标记为重试中

          const retryNum = currentRetries + 1;
          addLog({ time: new Date().toLocaleTimeString(), message: `🔄 预设「${fb.preset.name}」第${retryNum}次重试（失败原因: ${fb.failReason || '未知'}）`, type: 'warning' });

          // 确保旧战斗已完全解散（NightmareAutoBattleService 已在失败时调用 _dismissRoom）
          await delay(3000);

          // 从 activeBattles 移除旧条目（避免重复统计和 allDone 误判）
          const oldIdx = activeBattles.indexOf(fb);
          if (oldIdx !== -1) activeBattles.splice(oldIdx, 1);

          // ✅ BUG修复：等待旧 NightmareAutoBattleService 的 _dismissRoom 完成清理
          // 旧战斗在标记 failed 时调用了 _dismissRoom，但 finally 块中的异步清理可能尚未完成
          const oldBattle = fb.battle;
          if (oldBattle) {
            let cleanupWait = 0;
            while (!oldBattle._cleanupDone && cleanupWait < 10) {
              await delay(1000);
              cleanupWait++;
            }
            if (cleanupWait > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `等待旧战斗清理完成 (${cleanupWait}秒)`, type: 'info' });
            }
          }

          // 重新执行完整流程：连接队长→创建房间→队员加入→启动战斗
          // ✅ BUG修复：传递 presetIndex 确保共享队员延迟断连逻辑正确，优先使用保存的原始索引
          const retryPresetIndex = presets.findIndex(p => p.id === fb.preset.id);
          const newEntry = await executeOnePreset(
            fb.preset,
            `重试预设「${fb.preset.name}」(第${retryNum}次)`,
            fb.originalIndex >= 0 ? fb.originalIndex : retryPresetIndex
          );
          if (newEntry) {
            // ✅ BUG修复：重试启动成功后回退上次失败已计入的统计（onError 已 failCount += memberCount），
            // 否则重试完成后再次计数会导致 success+fail 超过总数、runningCount 变负、进度超过100%
            if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
              const rec = taskExecutionRecords.value[taskRecordIndex];
              const memberCount = (fb.preset.memberTokenIds || []).length + (fb.preset.captainTokenId ? 1 : 0);
              rec.failCount = Math.max(0, rec.failCount - memberCount);
              rec.runningCount += memberCount;
              const completed = rec.successCount + rec.failCount;
              rec.progressPercent = rec.totalAccounts > 0 ? Math.round((completed / rec.totalAccounts) * 100) : 0;
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${fb.preset.name}」重试已启动`, type: 'success' });
            await delay(5000); // 重试后等待一会再检测
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `❌ 预设「${fb.preset.name}」重试启动失败`, type: 'error' });
          }
        } else {
          fb._retried = true; // 已达重试上限，标记避免重复检测
          addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 预设「${fb.preset.name}」已达最大重试次数(${MAX_RETRY})，不再重试`, type: 'warning' });
        }
      }

      const allDone = activeBattles.every(b =>
        b.status === 'completed' || b.status === 'failed' || b.status === 'stopped'
      );
      if (allDone) break;
      await delay(10000);
      reportInterval++;
      // 每60秒输出一次进度
      if (reportInterval >= 6) {
        reportInterval = 0;
        const running = activeBattles.filter(b => b.status === 'running');
        const done = activeBattles.filter(b => b.status === 'completed');
        const failed = activeBattles.filter(b => b.status === 'failed');
        const retrying = activeBattles.filter(b => b.status === 'retrying');
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        const runningDetail = running.map(b => `「${b.preset.name}」${b.currentLevel ? `第${b.currentLevel}关` : ''}`).join('、');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏳ 十殿挑战进行中 (${elapsed}分钟) - 运行中: ${runningDetail || '无'} | 已完成: ${done.length}个 | 失败: ${failed.length}个${retrying.length > 0 ? ` | 重试中: ${retrying.length}个` : ''}`,
          type: 'info',
        });
      }
    }
    
    // ✅ BUG修复：收到停止信号时同步停止所有后台战斗
    // （原逻辑仅退出等待循环，已启动的战斗会继续在后台挂机最长 2 小时）
    if (shouldStop.value) {
      for (const b of activeBattles) {
        if (b.battle && (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight' || b.status === 'retrying')) {
          try { b.battle.stop(); } catch { /* ignore */ }
          clearPresetRunning(b.preset.id); // stop() 不触发 onComplete/onError，需手动清除运行标记
        }
      }
    }

    // 最终汇总
    const completed = activeBattles.filter(b => b.status === 'completed');
    const failed = activeBattles.filter(b => b.status === 'failed');
    const stopped = activeBattles.filter(b => b.status === 'stopped');
    const timeout = Date.now() - startTime >= maxWait;
    const totalElapsed = Math.floor((Date.now() - startTime) / 60000);
    
    addLog({ time: new Date().toLocaleTimeString(), message: `=== 十殿阎罗挑战执行完毕 (${totalElapsed}分钟) ===`, type: 'info' });
    if (completed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `✅ 成功: ${completed.map(b => `「${b.preset.name}」`).join('、')}`, type: 'success' });
    }
    if (failed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `❌ 失败: ${failed.map(b => `「${b.preset.name}」${b.failReason ? `(${b.failReason})` : ''}`).join('、')}`, type: 'error' });
    }
    if (stopped.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 已停止: ${stopped.map(b => `「${b.preset.name}」`).join('、')}`, type: 'warning' });
    }
    if (timeout) {
      const running = activeBattles.filter(b => b.status === 'running');
      addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 超时2小时，${running.length}个预设未完成: ${running.map(b => `「${b.preset.name}」`).join('、')}`, type: 'warning' });
    }

    // 清理 sessionStorage 批量战斗数据
    try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }
    _activeNightmareBattles = []; // ✅ 清理模块级引用
  }
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0) return;

  // ✅ 记录日常任务开始时间
  const batchStartTime = Date.now();

  isRunning.value = true;
  shouldStop.value = false;
  // ✅ 修复：手动批量任务开始时也更新 lastTaskExecution，防止 healthCheck 误判为卡死
  lastTaskExecution = Date.now();
  // 任务开始时重置用户手动关闭标记，允许新的任务使用自动滚动
  userManuallyDisabledScroll.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // ✅ 新增：为手动日常任务创建任务完成情况记录
  // 定时任务调用时跳过：executeScheduledTask 已在外层创建了记录，避免重复
  const _isFromScheduledTask = isScheduledTaskRunning.value;
  const availableTokens = [...selectedTokens.value];

  // ✅ 单账号智能加速
  if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
    batchSettings.singleAccountMode = true;
    const mult = batchSettings.singleAccountMultiplier;
    const token = tokens.value.find(t => t.id === availableTokens[0]);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
      type: 'info',
    });
  }

  // 清理本次执行相关的失败原因缓存
  availableTokens.forEach(tokenId => {
    delete tokenFailReasons.value[tokenId];
  });
  const _batchTaskRecordIndex = _isFromScheduledTask ? -1 : taskExecutionRecords.value.push({
    name: '日常任务',
    startTime: batchStartTime,
    endTime: null,
    elapsedStr: null,
    status: 'running',
    totalAccounts: availableTokens.length,
    successCount: 0,
    failCount: 0,
    runningCount: availableTokens.length,
    progressPercent: 0,
    failedAccounts: [],
    scheduledTime: null,
    isManual: true,
  }) - 1;

  // 定时更新进度
  const _batchProgressTimer = setInterval(() => {
    let successCount = 0, failCount = 0, runningCount = 0;
    const failedAccounts = [];
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') successCount++;
      else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') runningCount++;
    });
    const record = taskExecutionRecords.value[_batchTaskRecordIndex];
    if (record) {
      record.successCount = successCount;
      record.failCount = failCount;
      record.runningCount = runningCount;
      record.failedAccounts = failedAccounts;
      const completed = successCount + failCount;
      record.progressPercent = record.totalAccounts > 0 ? Math.round((completed / record.totalAccounts) * 100) : 0;
    }
  }, 500);

  // 400340重试队列：收集第一批执行中遇到400340错误的账号
  const retry400340Tokens = [];
  const MAX_400340_RETRIES = batchSettings.defaultRetryCount || 2;
  const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000;

  // 单账号执行超时保护（默认 30 分钟）
  const TOKEN_EXECUTION_TIMEOUT = (batchSettings.taskTimeout || 30) * 60 * 1000;

  // ========== 连接池滚动执行 ==========
  // 同步连接池大小与当前设置
  wsPool.setPoolSize(batchSettings.maxActive);
  const maxConcurrent = batchSettings.maxActive;
  const tokenQueue = [...selectedTokens.value];
  const activeTokens = new Set();
  const completionMap = new Map(); // tokenId -> Promise

  // 定义单个Token执行函数（用于连接池滚动执行）
  const executeTokenRolling = async (tokenId) => {
    if (shouldStop.value) return;

    tokenStatus.value[tokenId] = "running";

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      if (shouldStop.value) break;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId, 3, true); // skipSlot=true，由外层滚动执行控制并发

        // 等待连接稳定
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 等待连接稳定...`,
          type: "info",
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 检查活跃度
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 正在获取活跃度信息...`,
          type: "info",
        });
                
        try {
          // ✅ 使用轻量级刷新函数获取角色信息（仅用于判断活跃度）
          const roleInfo = await tokenStore.refreshForBatchRoleOnly(tokenId);
                  
          // 尝试多种可能的路径
          const dailyTask = roleInfo?.role?.dailyTask 
            || roleInfo?.body?.role?.dailyTask
            || roleInfo?.dailyTask
            || roleInfo?.body?.dailyTask;
                  
          const activityPoints = dailyTask?.dailyPoint ?? 0;
                  
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `📊 ${token.name} 当前活跃度：${activityPoints}/110`,
            type: "info",
          });
                  
          // 如果活跃度 >= 105，跳过日常任务
          if (activityPoints >= 105) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ ${token.name} 活跃度已达标 ${activityPoints}/110，无需执行日常任务`,
              type: "success",
            });
            success = true;
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 执行完成 ===`,
              type: "success",
            });
            continue; // 跳过后续的任务执行
          }
                  
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🚀 ${token.name} 活跃度 ${activityPoints}，开始执行日常任务...`,
            type: "info",
          });
        } catch (error) {
          console.error("获取活跃度失败:", error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 获取活跃度失败，继续执行任务`,
            type: "warning",
          });
        }

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        }, batchSettings);  // ✅ 传入batchSettings支持高级配置

        // Run tasks
        const runnerResult = await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: (p) => {
            // 每个token维护自己的进度
          },
        });

        // 检查是否有400340错误，加入重试队列
        if (runnerResult?.has400340Error) {
          retry400340Tokens.push(tokenId);
          tokenStatus.value[tokenId] = "waiting_retry";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 遇到400340服务器错误，已加入重试队列（等待第一批完成后重试）`,
            type: "warning",
          });
        }

        // 任务执行完成后，在关闭连接前获取最新的活跃度
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🔄 ${token.name} 正在获取最新角色信息...`,
            type: "info",
          });
          
          // ✅ 使用轻量级刷新函数获取最新角色信息
          const roleInfoResp = await tokenStore.refreshForBatchRoleOnly(tokenId);
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` ${token.name} 收到角色信息响应`,
            type: "info",
          });
          
          // 调试：输出响应结构
          console.log(`[${token.name}] roleInfoResp:`, roleInfoResp);
          console.log(`[${token.name}] roleInfoResp?.role:`, roleInfoResp?.role);
          console.log(`[${token.name}] roleInfoResp?.role?.dailyTask:`, roleInfoResp?.role?.dailyTask);
          
          // 消息监听器会自动更新tokenGameDataMap，但为了确保，我们再手动更新一次
          if (roleInfoResp) {
            const roleData = roleInfoResp?.role || roleInfoResp;
            const activityPoints = roleData?.dailyTask?.dailyPoint ?? 0;
            
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `📊 ${token.name} 解析活跃度: ${activityPoints}/110`,
              type: "info",
            });
            
            // 显式设置活跃度到tokenActivityMap，确保排序时能正确获取
            tokenStore.setTokenActivity(tokenId, activityPoints);
            
            if (roleData) {
              // 更新到tokenGameDataMap
              tokenStore.updateTokenGameData(tokenId, { roleInfo: roleInfoResp });
              
              // 验证更新（数据路径：roleInfo.role.dailyTask.dailyPoint）
              const cached = tokenStore.getTokenGameData(tokenId);
              const cachedActivity = cached?.roleInfo?.role?.dailyTask?.dailyPoint 
                ?? cached?.roleInfo?.dailyTask?.dailyPoint ?? 0;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `✅ ${token.name} 活跃度已缓存: ${cachedActivity}/110`,
                type: "success",
              });
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `️ ${token.name} 角色信息响应为空`,
              type: "warning",
            });
          }
        } catch (error) {
          console.error(`获取${token.name}最新活跃度失败:`, error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ ${token.name} 获取活跃度失败: ${error.message}`,
            type: "error",
          });
        }

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行失败: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 完成后关闭连接（skipSlot模式不需要释放槽位，由外层滚动循环控制）
        tokenStore.closeWebSocketConnection(tokenId);
        // ✅ 修复：每个账号完成时更新 lastTaskExecution，作为心跳防止 healthCheck 误判
        lastTaskExecution = Date.now();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (活跃: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  }; // end executeTokenRolling

  // ========== 连接池滚动执行循环 ==========
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `🚀 连接池滚动执行开始，并发数: ${maxConcurrent}，Token数: ${tokenQueue.length}`,
    type: "info",
  });

  while (tokenQueue.length > 0 || activeTokens.size > 0) {
    if (shouldStop.value) break;

    // 填充执行槽位（最多 maxConcurrent 个）
    while (tokenQueue.length > 0 && activeTokens.size < maxConcurrent) {
      const nextTokenId = tokenQueue.shift();
      activeTokens.add(nextTokenId);

      // 启动执行（不等待完成）
      const promise = (async () => {
        try {
          await Promise.race([
            executeTokenRolling(nextTokenId),
            new Promise((_, reject) => setTimeout(() =>
              reject(new Error(`单账号执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`)),
              TOKEN_EXECUTION_TIMEOUT
            ))
          ]);
        } catch (timeoutErr) {
          const token = tokens.value.find((t) => t.id === nextTokenId);
          const currentStatus = tokenStatus.value[nextTokenId];
          // ✅ 修复：只有在状态不是 completed/failed 时才标记为 failed，避免误判
          if (currentStatus !== 'completed' && currentStatus !== 'failed') {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⏰ ${token?.name} ${timeoutErr.message}，强制标记为失败`,
              type: "warning",
            });
            tokenStatus.value[nextTokenId] = "failed";
            tokenFailReasons.value[nextTokenId] = `执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`;
          } else {
            // 任务实际上已完成，只是超时先触发了
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⏰ ${token?.name} 超时触发但任务已完成（状态：${currentStatus}），忽略超时`,
              type: "info",
            });
          }
          tokenStore.closeWebSocketConnection(nextTokenId);
          lastTaskExecution = Date.now();
        }
      })();

      completionMap.set(nextTokenId, promise);
    }

    // 等待至少一个完成
    if (activeTokens.size > 0) {
      const activePromises = [...activeTokens].map(id => completionMap.get(id));
      await Promise.race(activePromises);

      // 清理已完成的
      for (const [tid, promise] of completionMap.entries()) {
        const status = tokenStatus.value[tid];
        if (status === 'completed' || status === 'failed' || status === 'waiting_retry') {
          activeTokens.delete(tid);
          completionMap.delete(tid);
        }
      }
    }

    await new Promise(r => setTimeout(r, 50));
  }

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 连接池滚动执行完成`,
    type: "success",
  });

  // 等待所有任务完成后再继续
  await new Promise((r) => setTimeout(r, 1000));

  // ==================== 400340 重试逻辑（连接池滚动执行） ====================
  if (retry400340Tokens.length > 0 && !shouldStop.value) {
    const waitSeconds = RETRY_WAIT_TIME / 1000;
    const waitMinutes = Math.floor(waitSeconds / 60);
    const waitDesc = waitMinutes > 0 ? `${waitMinutes}分钟` : `${waitSeconds}秒`;
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 第一批执行完成，${retry400340Tokens.length} 个账号遇到400340服务器错误，等待${waitDesc}后重试 ===`,
      type: "info",
    });

    for (let retryRound = 0; retryRound < MAX_400340_RETRIES && retry400340Tokens.length > 0 && !shouldStop.value; retryRound++) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⏳ 等待${waitDesc}后进行第${retryRound + 1}次重试（${retry400340Tokens.length}个账号）...`,
        type: "info",
      });
      await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));

      if (shouldStop.value) break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 开始400340重试 第${retryRound + 1}/${MAX_400340_RETRIES}次（${retry400340Tokens.length}个账号）并发数: ${maxConcurrent} ===`,
        type: "info",
      });

      // ✅ 使用连接池滚动执行重试任务
      const retryQueue = [...retry400340Tokens];
      const retryActiveTokens = new Set();
      const retryCompletionMap = new Map();
      const stillFailed = [];

      const executeRetryTokenRolling = async (tokenId) => {
        if (shouldStop.value) return;
        const token = tokens.value.find((t) => t.id === tokenId);
        if (!token) return;

        tokenStatus.value[tokenId] = "running";

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 重试执行: ${token.name} (第${retryRound + 1}次重试) ===`,
            type: "info",
          });

          await ensureConnection(tokenId, 3, true); // skipSlot=true，由滚动执行控制并发
          await new Promise((r) => setTimeout(r, 2000));

          const retryRunner = new DailyTaskRunner(tokenStore, {
            commandDelay: batchSettings.commandDelay,
            taskDelay: batchSettings.taskDelay,
          }, batchSettings);

          const retryResult = await retryRunner.run(tokenId, {
            onLog: (log) => addLog(log),
            onProgress: () => {},
          });

          if (retryResult?.has400340Error) {
            stillFailed.push(tokenId);
            tokenStatus.value[tokenId] = "waiting_retry";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} 重试后仍有400340错误`,
              type: "warning",
            });
          } else {
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ ${token.name} 重试成功`,
              type: "success",
            });
          }
        } catch (error) {
          stillFailed.push(tokenId);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ ${token.name} 重试失败: ${error.message}`,
            type: "error",
          });
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          lastTaskExecution = Date.now();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (活跃: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      };

      // 滚动执行循环
      while (retryQueue.length > 0 || retryActiveTokens.size > 0) {
        if (shouldStop.value) break;

        while (retryQueue.length > 0 && retryActiveTokens.size < maxConcurrent) {
          const nextTokenId = retryQueue.shift();
          retryActiveTokens.add(nextTokenId);

          const promise = (async () => {
            try {
              await Promise.race([
                executeRetryTokenRolling(nextTokenId),
                new Promise((_, reject) => setTimeout(() =>
                  reject(new Error(`重试执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`)),
                  TOKEN_EXECUTION_TIMEOUT
                ))
              ]);
            } catch (timeoutErr) {
              const token = tokens.value.find((t) => t.id === nextTokenId);
              stillFailed.push(nextTokenId);
              tokenStatus.value[nextTokenId] = "failed";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏰ ${token?.name} 重试超时，强制标记为失败`,
                type: "warning",
              });
              tokenStore.closeWebSocketConnection(nextTokenId);
              lastTaskExecution = Date.now();
            }
          })();

          retryCompletionMap.set(nextTokenId, promise);
        }

        if (retryActiveTokens.size > 0) {
          const activePromises = [...retryActiveTokens].map(id => retryCompletionMap.get(id));
          await Promise.race(activePromises);

          for (const [tid] of retryCompletionMap.entries()) {
            const status = tokenStatus.value[tid];
            if (status === 'completed' || status === 'failed' || status === 'waiting_retry') {
              retryActiveTokens.delete(tid);
              retryCompletionMap.delete(tid);
            }
          }
        }

        await new Promise(r => setTimeout(r, 50));
      }

      // 更新重试队列
      retry400340Tokens.length = 0;
      retry400340Tokens.push(...stillFailed);

      if (retry400340Tokens.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 所有400340错误账号重试成功！`,
          type: "success",
        });
      }
    }

    // 最终仍失败的账号
    if (retry400340Tokens.length > 0) {
      for (const tokenId of retry400340Tokens) {
        tokenStatus.value[tokenId] = "failed";
        const token = tokens.value.find((t) => t.id === tokenId);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `❌ ${token?.name} 400340重试${MAX_400340_RETRIES}次后仍失败`,
          type: "error",
        });
      }
    }
  }

  // 根据活跃度自动排序账号（只有执行多个账号时才排序）
  if (selectedTokens.value.length > 1) {
    await sortByActivityAfterDailyTask();
  } else {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `ℹ️  只执行了1个账号，跳过活跃度排序`,
      type: "info",
    });
  }

  // ✅ 清理进度定时器并最终更新任务记录
  clearInterval(_batchProgressTimer);
  {
    let successCount = 0, failCount = 0;
    const failedAccounts = [];
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') successCount++;
      else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      }
    });
    const record = taskExecutionRecords.value[_batchTaskRecordIndex];
    if (record) {
      record.successCount = successCount;
      record.failCount = failCount;
      record.runningCount = 0;
      record.failedAccounts = failedAccounts;
      record.progressPercent = 100;
      record.endTime = Date.now();
      const elapsed = record.endTime - record.startTime;
      record.elapsedStr = elapsed >= 60000
        ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
        : `${(elapsed / 1000).toFixed(1)}秒`;
      if (failCount === 0) record.status = 'success';
      else if (successCount > 0) record.status = 'partial';
      else record.status = 'fail';
    }
    saveTaskExecutionRecordsToStorage();
  }

  // ✅ 显示日常任务总用时
  const batchElapsed = Date.now() - batchStartTime;
  const batchElapsedStr = batchElapsed >= 60000
    ? `${Math.floor(batchElapsed / 60000)}分${Math.floor((batchElapsed % 60000) / 1000)}秒`
    : `${(batchElapsed / 1000).toFixed(1)}秒`;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 日常任务执行完成，总用时: ${batchElapsedStr} ===`,
    type: "success",
  });

  isRunning.value = false;
  currentRunningTokenId.value = null;
  // 重置单账号加速标志
  batchSettings.singleAccountMode = false;
  
  // ✅ 日常任务结束后，主动消费定时任务队列
  if (pendingTaskQueue.length > 0 && !isScheduledTaskRunning.value) {
    while (pendingTaskQueue.length > 0) {
      const nextTask = pendingTaskQueue[0];
      const timeCheck = isTaskTimeStillValid(nextTask, 60);
      
      if (!timeCheck.valid) {
        pendingTaskQueue.shift();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏰ 日常任务完成后，跳过已过期的队列任务: ${nextTask.name}（${timeCheck.reason}）`,
          type: "warning",
        });
        continue;
      }
      
      // 找到有效任务，出队并执行
      pendingTaskQueue.shift();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `▶️ 日常任务结束后，从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
        type: "info",
      });
      isScheduledTaskRunning.value = true;
      currentScheduledTask = nextTask;
      scheduledTaskStartTime = Date.now();
      lastTaskExecution = Date.now();
      executeScheduledTask(nextTask).catch(error => {
        console.error(`日常任务完成后队列任务执行错误:`, error);
      }).finally(() => {
        lastTaskExecution = Date.now();
      });
      break; // 每次只启动一个定时任务
    }
  }
  
  // 检查是否需要在任务完成后刷新页面
  // 注意：需同时确认定时任务和队列中没有待执行任务，避免刷新中断
  if (shouldRefreshAfterTask.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
    console.log(`[${new Date().toISOString()}] Task completed, executing postponed page refresh`);
    shouldRefreshAfterTask.value = false; // 重置标记
    // 稍等片刻再刷新，让用户看到任务完成的消息
    setTimeout(() => {
      // ✅ 二次确认：防止 1.5 秒内调度器启动了新任务
      if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        window.location.reload();
      } else {
        shouldRefreshAfterTask.value = true; // 重新标记，等待下次调度器检查
        console.log(`[${new Date().toISOString()}] Postponed refresh: new task started during delay`);
      }
    }, 1500);
    return; // 提前返回，不显示成功消息
  }
  
  message.success("批量任务执行结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};

/**
 * 日常任务执行完成后，根据活跃度自动排序账号
 * 低活跃度（<90）的账号排到前面，高活跃度（>=90）的账号排到后面
 * 注意：只对本次执行的selectedTokens排序，不影响未执行的token顺序
 */
const sortByActivityAfterDailyTask = async () => {
  try {
    // 检查账号数量，只有多个账号才排序
    const executedTokenCount = selectedTokens.value.length;
    if (executedTokenCount <= 1) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `ℹ️  只执行了${executedTokenCount}个账号，无需排序`,
        type: "info",
      });
      return;
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 开始根据活跃度自动排序账号 (${executedTokenCount}个账号) ===`,
      type: "info",
    });

    // 活跃度阈值：90为分界线（满值110，>=105跳过任务）
    const ACTIVITY_THRESHOLD = 90;

    // 获取本次执行的token的活跃度
    const activityMap = new Map();
    
    for (const tokenId of selectedTokens.value) {
      const token = tokenStore.gameTokens.find(t => t.id === tokenId);
      
      try {
        const activityPoints = tokenStore.getTokenActivity(tokenId);
        activityMap.set(tokenId, activityPoints);
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token?.name || tokenId} 活跃度: ${activityPoints}/110`,
          type: "info",
        });
      } catch (error) {
        console.error(`获取活跃度失败:`, error);
        activityMap.set(tokenId, 0);
      }
    }

    // 只对selectedTokens按活跃度排序
    const sortedExecutedIds = [...selectedTokens.value].sort((a, b) => {
      const activityA = activityMap.get(a) || 0;
      const activityB = activityMap.get(b) || 0;
      
      // 低活跃度(<90)排前面，高活跃度(>=90)排后面
      const isLowA = activityA < ACTIVITY_THRESHOLD;
      const isLowB = activityB < ACTIVITY_THRESHOLD;
      
      if (isLowA && !isLowB) return -1;
      if (!isLowA && isLowB) return 1;
      
      // 同组内按活跃度升序排列
      return activityA - activityB;
    });

    // 合并：已执行的token（按活跃度排序）+ 未执行的token（保持原顺序）
    const executedSet = new Set(selectedTokens.value);
    const nonExecutedIds = tokenOrder.value.filter(id => !executedSet.has(id));
    const sortedTokenIds = [...sortedExecutedIds, ...nonExecutedIds];

    // 更新tokenOrder
    tokenOrder.value = sortedTokenIds;
    
    // 保存到存储
    await saveTokenOrder(sortedTokenIds);

    // 统计信息
    const lowActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) < ACTIVITY_THRESHOLD
    );
    const highActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) >= ACTIVITY_THRESHOLD
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ 活跃度排序完成`,
      type: "success",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 低活跃度(0-89): ${lowActivityTokens.length}个账号 → 排到前面`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 高活跃度(90-110): ${highActivityTokens.length}个账号 → 排到后面`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 活跃度排序完成 ===`,
      type: "success",
    });
  } catch (error) {
    console.error('活跃度排序失败:', error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️ 活跃度排序失败: ${error.message}`,
      type: "warning",
    });
  }
};
