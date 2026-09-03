<!--
  营地战报组件
  数据来源：club_getinfo / Club_GetInfoResp + club_getgrouprank / Club_GetGroupRankResp（小队周榜 Top4）
  视觉风格：参考咸鱼监控 "营地挑战 · 当日攻防战报" 截图
-->
<template>
  <div ref="exportDom" class="camp-battle-report">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="left">
        <span class="title">营地战报:</span>
        <span v-if="lastUpdateTime" class="update-time">
          更新于 {{ lastUpdateTime }}
        </span>
      </div>
      <div class="right">
        <NButton
          class="action-btn export-btn"
          size="small"
          style="margin-right: 8px"
          :disabled="!hasData"
          @click="handleExportImage"
        >
          <template #icon>
            <NIcon><Copy /></NIcon>
          </template>
          导出图片
        </NButton>
        <NButton
          class="refresh-btn"
          size="small"
          :loading="loading"
          :disabled="loading"
          @click="fetchClubInfo"
        >
          <template #icon>
            <NIcon><Refresh /></NIcon>
          </template>
          刷新
        </NButton>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !hasData" class="loading-state">
      <NSpin size="large">
        <template #description>正在加载营地战报...</template>
      </NSpin>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!hasData" class="empty-state">
      <NEmpty description="暂无营地战报数据，请检查是否已加入俱乐部或确认当日是否有营地战报">
        <template #extra>
          <NButton size="small" type="primary" @click="fetchClubInfo">
            立即获取
          </NButton>
        </template>
      </NEmpty>
    </div>

    <!-- 数据展示 -->
    <div v-else class="report-content">
      <!-- 标题区 -->
      <header class="report-header">
        <div class="header-left">
          <div class="report-eyebrow">CAMP CHALLENGE</div>
          <h1 class="report-title">
            营地挑战<span class="title-sep">·</span><span class="title-sub">当日攻防战报</span>
          </h1>
          <div class="report-subtitle">
            <span class="badge-map">南瓜战场</span>
            <span class="subtitle-sep">·</span>
            <span class="badge-zone">大荒</span>
          </div>
        </div>

        <!-- 营地双方对战：俱乐部总篝火 -->
        <div class="header-battle">
          <div class="battle-side own">
            <div class="side-label">我方营地</div>
            <NAvatar
              round
              class="side-avatar"
              :size="36"
              :src="myClubLogo || '/icons/xiaoyugan.png'"
              :fallback-src="'/icons/xiaoyugan.png'"
            />
            <div class="side-name" :title="myClubName">
              {{ myClubName }}
            </div>
            <div class="side-score">
              <strong>{{ myClubScore }}</strong>
              <em>俱乐部篝火</em>
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="battle-side enemy" :class="{ empty: !enemyClub }">
            <div class="side-label">
              {{ enemyClub ? "敌方营地" : "暂无对打" }}
            </div>
            <NAvatar
              v-if="enemyClub"
              round
              class="side-avatar"
              :size="36"
              :src="enemyClub.logo || '/icons/xiaoyugan.png'"
              :fallback-src="'/icons/xiaoyugan.png'"
            />
            <div v-else class="side-empty-avatar">—</div>
            <div
              class="side-name"
              :title="enemyClub ? enemyClub.name : '暂未发现对打对手（敌方俱乐部 dayScore 为 0）'"
            >
              {{ enemyClub ? enemyClub.name : "暂无对打对手" }}
            </div>
            <div class="side-score">
              <strong>{{ enemyClub ? enemyClub.dayScore : "—" }}</strong>
              <em>俱乐部篝火</em>
            </div>
          </div>
        </div>

        <div class="header-right">
          <div class="overview-card">
            <div class="overview-head">
              <span class="overview-title">攻防总览</span>
              <span class="overview-stat">
                <em>总攻打塔数</em>
                <strong>{{ totalAttackCount }}</strong>
              </span>
              <span class="overview-stat">
                <em>防守失败数</em>
                <strong>{{ totalDefenderDefeat }}</strong>
              </span>
            </div>

            <div class="overview-body">
              <div class="overview-side attack-side">
                <div class="overview-percent attack-percent">
                  {{ attackSuccessRate }}<small>%</small>
                </div>
                <div class="overview-label">我方胜率</div>
                <div class="overview-bars">
                  <div class="bar-row">
                    <span class="bar-label">总攻打</span>
                    <div class="bar-track">
                      <div class="bar-fill attack" :style="{ width: '100%' }"></div>
                    </div>
                    <span class="bar-value">{{ totalAttackCount }}</span>
                  </div>
                  <div class="bar-row">
                    <span class="bar-label">成功次数</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill attack"
                        :style="{ width: attackSuccessRate + '%' }"
                      ></div>
                    </div>
                    <span class="bar-value">{{ attackSuccessCount }}</span>
                  </div>
                  <div class="bar-row">
                    <span class="bar-label">失败次数</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill attack fail"
                        :style="{ width: attackFailRate + '%' }"
                      ></div>
                    </div>
                    <span class="bar-value">{{ attackFailCount }}</span>
                  </div>
                </div>
              </div>

              <div class="overview-side defend-side">
                <div class="overview-percent defend-percent">
                  {{ defendSuccessRate }}<small>%</small>
                </div>
                <div class="overview-label">我方防守胜率</div>
                <div class="overview-bars">
                  <div class="bar-row">
                    <span class="bar-label">总防守</span>
                    <div class="bar-track">
                      <div class="bar-fill defend" :style="{ width: '100%' }"></div>
                    </div>
                    <span class="bar-value">{{ totalDefendCount }}</span>
                  </div>
                  <div class="bar-row">
                    <span class="bar-label">成功次数</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill defend"
                        :style="{ width: defendSuccessRate + '%' }"
                      ></div>
                    </div>
                    <span class="bar-value">{{ defendSuccessCount }}</span>
                  </div>
                  <div class="bar-row">
                    <span class="bar-label">三路攻</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill defend fail"
                        :style="{ width: defendFailRate + '%' }"
                      ></div>
                    </div>
                    <span class="bar-value">{{ threeRouteAttack }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 小队周榜 -->
          <div class="weekly-rank-card">
            <div class="weekly-head">
              <span class="weekly-title">小队周榜</span>
              <span class="weekly-sub">按周篝火排序 Top4</span>
            </div>
            <div class="weekly-list">
              <div
                v-for="player in weeklyTop4"
                :key="player.rank"
                class="weekly-item"
                :class="{ top: player.rank === 1, self: player.self }"
              >
                <span class="rank-no">{{ player.rank }}</span>
                <NAvatar
                  round
                  class="weekly-avatar"
                  :size="22"
                  :src="player.logo || '/icons/xiaoyugan.png'"
                  :fallback-src="'/icons/xiaoyugan.png'"
                />
                <div class="player-card">
                  <span class="player-name" :title="player.name">
                    {{ player.name }}
                  </span>
                  <span class="player-score">
                    <strong>{{ player.score }}</strong>
                    <em>周篝火</em>
                  </span>
                </div>
                <span class="item-badge">
                  <span v-if="player.self" class="me-tag">我</span>
                  <span v-else-if="player.rank === 1" class="crown">◆</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- 我方成员 -->
      <section class="members-section">
        <div class="section-title">
          <span class="title-main">我方成员明细</span>
          <span class="title-sub">
            个人篝火 · 被攻击 · {{ ownMembers.length }} 人
          </span>
        </div>
        <div class="route-columns">
          <div
            v-for="route in ownRoutes"
            :key="route.key"
            class="route-column"
          >
            <div class="route-head">
              <span class="route-name">{{ route.label }}</span>
              <span class="route-meta">
                {{ route.from }}-{{ route.to }}号位 ·
                {{ route.title }}
              </span>
            </div>
            <div class="route-body">
              <div
                v-for="(m, idx) in route.members"
                :key="m.roleId || idx"
                class="member-row"
                :class="{ defeated: m.defeated }"
              >
                <div class="member-rank">
                  <span class="rank-num">#{{ m.idx }}</span>
                </div>
                <NAvatar
                  round
                  class="member-avatar"
                  :size="28"
                  :src="m.headImg || '/icons/xiaoyugan.png'"
                  :fallback-src="'/icons/xiaoyugan.png'"
                />
                <div class="member-info">
                  <div class="member-name" :title="m.name">{{ m.name }}</div>
                  <div class="member-tags">
                    <NTag v-if="m.idx === 1" size="tiny" :bordered="false" type="info">
                      先锋
                    </NTag>
                    <NTag
                      v-if="m.defeated"
                      size="tiny"
                      :bordered="false"
                      type="error"
                    >
                      我方失守
                    </NTag>
                  </div>
                </div>
                <div class="member-stats">
                  <div class="stat">
                    <strong>{{ m.score }}</strong>
                    <em>篝火</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.failCnt }}</strong>
                    <em>被攻击</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.defeatedText }}</strong>
                    <em>被击败</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.challengeCnt }}</strong>
                    <em>被挑战</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 敌方成员：仅当存在真实参与营地战的敌方俱乐部（dayScore 非 0）时展示 -->
      <section
        v-if="enemyMembers.length > 0"
        class="members-section enemy-section"
      >
        <div class="section-title">
          <span class="title-main">敌方成员明细</span>
          <span class="title-sub">
            个人篝火 · 被攻击 · {{ enemyMembers.length }} 人
          </span>
        </div>
        <div class="route-columns">
          <div
            v-for="route in enemyRoutes"
            :key="route.key"
            class="route-column"
          >
            <div class="route-head">
              <span class="route-name">{{ route.label }}</span>
              <span class="route-meta">
                {{ route.from }}-{{ route.to }}号位 ·
                {{ route.title }}
              </span>
            </div>
            <div class="route-body">
              <div
                v-for="(m, idx) in route.members"
                :key="m.roleId || idx"
                class="member-row enemy-row"
                :class="{ defeated: m.defeated }"
              >
                <div class="member-rank">
                  <span class="rank-num">#{{ m.idx }}</span>
                </div>
                <NAvatar
                  round
                  class="member-avatar"
                  :size="28"
                  :src="m.headImg || '/icons/xiaoyugan.png'"
                  :fallback-src="'/icons/xiaoyugan.png'"
                />
                <div class="member-info">
                  <div class="member-name" :title="m.name">{{ m.name }}</div>
                  <div class="member-tags">
                    <NTag
                      v-if="m.idx === 1"
                      size="tiny"
                      :bordered="false"
                      type="warning"
                    >
                      首位
                    </NTag>
                    <NTag
                      v-if="m.defeated"
                      size="tiny"
                      :bordered="false"
                      type="error"
                    >
                      已被击败
                    </NTag>
                  </div>
                </div>
                <div class="member-stats">
                  <div class="stat">
                    <strong>{{ m.score }}</strong>
                    <em>篝火</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.failCnt }}</strong>
                    <em>被攻击</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.defeatedText }}</strong>
                    <em>被击败</em>
                  </div>
                  <div class="stat">
                    <strong>{{ m.challengeCnt }}</strong>
                    <em>被挑战</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 底部签名 -->
      <footer class="report-footer">
        <span class="footer-tip">
          个人/挑战/防守信息由 game server 提供
        </span>
        <span class="footer-time">{{ lastUpdateTime }}</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  NAvatar,
  NButton,
  NEmpty,
  NIcon,
  NSpin,
  NTag,
  useMessage,
} from "naive-ui";
import { Copy, Refresh } from "@vicons/ionicons5";
import { useTokenStore } from "@/stores/tokenStore";
import html2canvas from "html2canvas";

const tokenStore = useTokenStore();
const message = useMessage();

const exportDom = ref(null);
const loading = ref(false);
const lastUpdateTime = ref("");
const reportData = ref(null);
const groupRankData = ref(null); // Club_GetGroupRankResp：营地小组排名
const legionInfoData = ref(null); // Legion_GetInfoResp：我方俱乐部信息（logo 等）

// 数据扁平化
const ownMembers = computed(() => {
  const raw = reportData.value?.club?.members;
  if (!raw) return [];
  return Object.entries(raw)
    .map(([k, v]) => ({
      idx: Number(k),
      roleId: v.roleId,
      name: v.name,
      headImg: v.headImg,
      score: v.score || 0,
      failCnt: v.failCnt || 0,
      challengeCnt: v.challengeCnt || 0,
      defeated: !!v.defeated,
    }))
    .sort((a, b) => a.idx - b.idx);
});

// 敌方俱乐部列表：oppoMap 下的每个 legion 代表一个对手俱乐部
const enemyLegions = computed(() => {
  const map = reportData.value?.club?.oppoMap;
  if (!map || typeof map !== "object") return [];
  return Object.values(map).filter(Boolean);
});
// 敌方俱乐部总篝火（dayScore），兼容不同字段路径
function legionDayScore(l) {
  return Number(
    l?.dayScore ?? l?.clubDayScore ?? l?.enemyDayScore ?? l?.club?.dayScore ?? 0,
  );
}
// 只统计真实参与了营地战的敌方俱乐部：dayScore 非 0 才展示
const activeEnemyLegions = computed(() =>
  enemyLegions.value.filter((l) => legionDayScore(l) > 0),
);

const enemyMembers = computed(() => {
  const lists = [];
  // oppoMap 下每个有效的敌方 legion 再聚合 defenders（key 为字符串编号）
  activeEnemyLegions.value.forEach((legion) => {
    const defenders = legion?.defenders;
    if (defenders && typeof defenders === "object") {
      Object.entries(defenders).forEach(([k, v]) => {
        lists.push({
          idx: Number(k),
          roleId: v.roleId,
          name: v.name,
          headImg: v.headImg,
          score: v.score || 0,
          failCnt: v.failCnt || 0,
          challengeCnt: v.challengeCnt || 0,
          defeated: !!v.defeated,
        });
      });
    }
  });
  // 按编号排序后再分组到三路
  return lists.sort((a, b) => a.idx - b.idx);
});

const hasData = computed(
  () =>
    !!reportData.value
    && (ownMembers.value.length > 0 || enemyMembers.value.length > 0),
);

// 从俱乐部节点尽量取出头像（兼容不同字段路径）
function pickClubLogo(node) {
  const c = node?.club;
  return (
    node?.logo
    || node?.legionLogo
    || node?.icon
    || node?.avatar
    || c?.logo
    || c?.icon
    || c?.avatar
    || ""
  );
}
// 从俱乐部第一个成员取头像（俱乐部无 logo 时的兜底）
function firstMemberHead(node) {
  const d = node?.defenders || node?.members;
  if (d && typeof d === "object") {
    const first = Object.values(d).find(Boolean);
    return first?.headImg || first?.logo || "";
  }
  return "";
}

// 俱乐部双方信息（营地双方对战区使用）
const myClubName = computed(() => {
  const li = legionInfoData.value;
  const legionName = li?.info?.name || li?.body?.info?.name || "";
  return reportData.value?.club?.name || legionName || "我方营地";
});
// 我方营地徽标：优先取自 legion_getinfo（Legion_GetInfoResp.body.info.logo）
const myClubLogo = computed(() => {
  const li = legionInfoData.value;
  const legionLogo =
    li?.info?.logo || li?.body?.info?.logo || li?.logo || "";
  if (legionLogo) return legionLogo;
  const c = reportData.value?.club || {};
  const logo = pickClubLogo(c) || c?.legionData?.logo || "";
  if (logo) return logo;
  // club 节点没有 logo 时，回退到首位成员（先锋/会长）头像
  const first = ownMembers.value[0];
  return first?.headImg || "";
});
const myClubScore = computed(() => {
  const c = reportData.value?.club;
  return Number(c?.dayScore ?? c?.clubDayScore ?? 0);
});
// 敌方俱乐部信息：只取真实参战（dayScore 非 0）的对手联盟
const enemyClub = computed(() => {
  const first = activeEnemyLegions.value[0];
  if (!first) return null;
  return {
    name: first.name || first.legionName || "",
    logo: pickClubLogo(first) || firstMemberHead(first),
    dayScore: legionDayScore(first),
  };
});

// 把成员均分成三路：1-10 上路、11-20 中路、21-30 下路
function splitRoutes(list, side = "own") {
  const upper = [];
  const middle = [];
  const lower = [];
  const prefix = side === "enemy" ? "敌方" : "我方";
  list.forEach((m) => {
    const item = {
      ...m,
      defeatedText: m.defeated ? "1" : "0",
    };
    if (m.idx >= 1 && m.idx <= 10) upper.push(item);
    else if (m.idx >= 11 && m.idx <= 20) middle.push(item);
    else if (m.idx >= 21 && m.idx <= 30) lower.push(item);
  });
  return [
    {
      key: "upper",
      label: "上路",
      from: 1,
      to: 10,
      title: `${prefix}杀敌数`,
      members: upper,
    },
    {
      key: "middle",
      label: "中路",
      from: 11,
      to: 20,
      title: `${prefix}被攻击数`,
      members: middle,
    },
    {
      key: "lower",
      label: "下路",
      from: 21,
      to: 30,
      title: `${prefix}被挑战数`,
      members: lower,
    },
  ];
}

const ownRoutes = computed(() => splitRoutes(ownMembers.value, "own"));
const enemyRoutes = computed(() => splitRoutes(enemyMembers.value, "enemy"));

// 攻防统计
const totalAttackCount = computed(() => {
  const map = reportData.value?.siege?.attackMap || {};
  return Object.values(map).reduce(
    (sum, v) => sum + (v.attackCnt || 0),
    0,
  );
});

const attackSuccessCount = computed(() => {
  const map = reportData.value?.siege?.attackMap || {};
  return Object.values(map).reduce(
    (sum, v) => sum + (v.aSuccessCnt || 0),
    0,
  );
});

const attackFailCount = computed(() =>
  Math.max(0, totalAttackCount.value - attackSuccessCount.value),
);

const attackSuccessRate = computed(() => {
  if (!totalAttackCount.value) return "0";
  return Math.round(
    (attackSuccessCount.value / totalAttackCount.value) * 100,
  ).toString();
});

const attackFailRate = computed(() => {
  if (!totalAttackCount.value) return "0";
  return Math.round(
    (attackFailCount.value / totalAttackCount.value) * 100,
  ).toString();
});

const totalDefendCount = computed(() =>
  ownMembers.value.reduce((s, m) => s + (m.challengeCnt || 0), 0),
);

const totalDefenderDefeat = computed(() =>
  ownMembers.value.filter((m) => m.defeated).length,
);

const defendSuccessCount = computed(() =>
  Math.max(0, totalDefendCount.value - totalDefenderDefeat.value),
);

const defendSuccessRate = computed(() => {
  if (!totalDefendCount.value) return "0";
  return Math.round(
    (defendSuccessCount.value / totalDefendCount.value) * 100,
  ).toString();
});

const defendFailRate = computed(() => {
  if (!totalDefendCount.value) return "0";
  return Math.round(
    (totalDefenderDefeat.value / totalDefendCount.value) * 100,
  ).toString();
});

const threeRouteAttack = computed(() => {
  // 三路攻击次数：直接采用 attackMap key 数
  const map = reportData.value?.siege?.attackMap || {};
  return Object.keys(map).length;
});

// 小队周榜 Top4：优先使用营地小组排名（Club_GetGroupRankResp，按积分/周篝火降序）
// 无小组排名数据时回退到我方成员周篝火榜
const weeklyTop4 = computed(() => {
  const body = groupRankData.value?.body || groupRankData.value;
  const list = Array.isArray(body?.rankList) ? body.rankList : [];
  if (list.length) {
    const selfId = body?.selfRank?.legionId;
    return [...list]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 4)
      .map((p, i) => ({
        name: p.name || "",
        logo: p.logo || "",
        score: p.score || 0,
        rank: p.rank || i + 1,
        self: !!selfId && p.legionId === selfId,
      }));
  }
  return [...ownMembers.value]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((m, i) => ({
      name: m.name,
      logo: m.headImg || "",
      score: m.score || 0,
      rank: i + 1,
      self: false,
    }));
});

// 获取俱乐部营地信息
async function fetchClubInfo() {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择 Token");
    return;
  }
  const tokenId = tokenStore.selectedToken.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.warning("WebSocket 未连接，请先建立连接");
    return;
  }

  loading.value = true;
  try {
    const [clubResp, rankResp, legionResp] = await Promise.allSettled([
      tokenStore.sendMessageWithPromise(tokenId, "club_getinfo", {}, 8000),
      tokenStore.sendMessageWithPromise(
        tokenId,
        "club_getgrouprank",
        {},
        8000,
      ),
      tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfo",
        {},
        8000,
      ),
    ]);
    const resp = clubResp.status === "fulfilled" ? clubResp.value : null;
    groupRankData.value =
      rankResp.status === "fulfilled" ? rankResp.value : null;
    if (rankResp.status === "rejected") {
      console.warn("[营地战报] 获取小组排名失败:", rankResp.reason);
    }
    legionInfoData.value =
      legionResp.status === "fulfilled" ? legionResp.value : null;
    if (legionResp.status === "rejected") {
      console.warn("[营地战报] 获取俱乐部信息失败:", legionResp.reason);
    }
    if (resp) {
      reportData.value = resp;
      const ts = resp?.club?.danUpdateAt;
      lastUpdateTime.value = ts
        ? new Date(ts * 1000).toLocaleString("zh-CN")
        : new Date().toLocaleString("zh-CN");
    } else {
      message.warning("未获取到营地战报数据");
    }
  } catch (err) {
    console.error("获取营地战报失败:", err);
    message.error(`获取营地战报失败: ${err?.message || "未知错误"}`);
  } finally {
    loading.value = false;
  }
}

// 导出图片
async function handleExportImage() {
  if (!exportDom.value) return;
  try {
    const canvas = await html2canvas(exportDom.value, {
      backgroundColor: "#f5f7fa",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `营地战报_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("营地战报已导出");
  } catch (err) {
    console.error("导出图片失败:", err);
    message.error("导出图片失败，请稍后重试");
  }
}

// 监听选中 Token 切换时自动刷新
watch(
  () => tokenStore.selectedTokenId,
  () => {
    reportData.value = null;
    lastUpdateTime.value = "";
    nextTick(() => fetchClubInfo());
  },
);

// 监听连接建立时也刷新
watch(
  () => {
    if (!tokenStore.selectedToken) return "disconnected";
    return tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
  },
  (status) => {
    if (status === "connected" && !reportData.value) {
      fetchClubInfo();
    }
  },
);

onMounted(() => {
  if (tokenStore.selectedToken) {
    const status = tokenStore.getWebSocketStatus(
      tokenStore.selectedToken.id,
    );
    if (status === "connected") {
      fetchClubInfo();
    }
  }
});

onUnmounted(() => {
  reportData.value = null;
  groupRankData.value = null;
  legionInfoData.value = null;
});
</script>

<style scoped lang="scss">
.camp-battle-report {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4eaf2 100%);
  padding: clamp(10px, 1.5vw, 18px);
  border-radius: 12px;
  min-height: 400px;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #1f2937 0%, #0f172a 100%);
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  margin-bottom: 10px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-light);

  .left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .update-time {
    color: var(--text-tertiary);
    font-size: 12px;
  }
}

.report-content {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  background: var(--bg-primary);
  border-radius: 12px;
  padding: clamp(10px, 1.6vw, 16px);
  border: 1px solid var(--border-light);
}

.report-header {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(200px, 1.1fr) 1.6fr;
  gap: 12px;
  margin-bottom: 12px;
  min-width: 0;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
}

.header-left {
  min-width: 0;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #f59e0b;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    border-color: #b45309;
  }
}

.report-eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #b45309;
  font-weight: 700;
  margin-bottom: 6px;
}

.report-title {
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 700;
  color: #78350f;
  margin: 0 0 8px 0;

  .title-sep {
    color: #f59e0b;
    margin: 0 6px;
  }

  .title-sub {
    font-size: clamp(13px, 2vw, 16px);
    color: #92400e;
    font-weight: 500;
  }

  [data-theme="dark"] & {
    color: #fbbf24;
  }
}

.report-subtitle {
  font-size: 13px;
  color: #92400e;

  .subtitle-sep {
    margin: 0 6px;
    color: #f59e0b;
  }

  .badge-map,
  .badge-zone {
    background: rgba(255, 255, 255, 0.55);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }
}

.header-right {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(230px, 1fr);
  gap: 12px;
  min-width: 0;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.header-battle {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
  padding: 10px;
}

.battle-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.battle-side.own {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);

  [data-theme="dark"] & {
    background: rgba(59, 130, 246, 0.22);
    border-color: rgba(59, 130, 246, 0.5);
  }
}

.battle-side.enemy {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.35);

  [data-theme="dark"] & {
    background: rgba(239, 68, 68, 0.22);
    border-color: rgba(239, 68, 68, 0.5);
  }
}

// 敌方俱乐部 dayScore 为 0（未参战）时整体淡化
.battle-side.enemy.empty {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.3);
  border-style: dashed;

  .side-name {
    color: var(--text-tertiary);
    font-weight: 500;
  }

  .side-score strong {
    color: var(--text-tertiary) !important;
  }
}

.side-empty-avatar {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.06);
}

.side-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 1px;
}

.side-avatar {
  flex: none;
}

.side-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-score {
  display: flex;
  align-items: baseline;
  gap: 4px;

  strong {
    font-size: clamp(20px, 2.6vw, 26px);
    font-weight: 800;
    line-height: 1;
  }

  em {
    font-size: 10px;
    color: var(--text-tertiary);
    font-style: normal;
  }
}

.battle-side.own .side-score strong {
  color: #2563eb;
}

.battle-side.enemy .side-score strong {
  color: #dc2626;
}

.vs {
  flex: none;
  align-self: center;
  font-size: 18px;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 1px;
}

.overview-card,
.weekly-rank-card {
  min-width: 0;
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-light);
}

.overview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 8px;
  gap: 4px 8px;
}

.overview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.overview-stat {
  font-size: 11px;
  color: var(--text-tertiary);

  em {
    font-style: normal;
    margin-right: 4px;
  }

  strong {
    color: var(--text-primary);
    font-weight: 600;
    margin-left: 2px;
  }
}

.overview-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 440px) {
    grid-template-columns: 1fr;
  }
}

.overview-side {
  min-width: 0;
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.overview-percent {
  font-size: clamp(24px, 3.5vw, 32px);
  font-weight: 700;
  line-height: 1;

  small {
    font-size: 13px;
    font-weight: 400;
    margin-left: 2px;
  }
}

.attack-percent {
  color: #2563eb;
}

.defend-percent {
  color: #f97316;
}

.overview-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 4px 0 8px 0;
}

.overview-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 26px;
  align-items: center;
  gap: 4px;
  font-size: 10px;

  .bar-label {
    color: var(--text-tertiary);
    text-align: right;
    white-space: nowrap;
  }

  .bar-track {
    height: 6px;
    background: var(--border-light);
    border-radius: 3px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;

    &.attack {
      background: linear-gradient(90deg, #3b82f6, #2563eb);
    }

    &.defend {
      background: linear-gradient(90deg, #f59e0b, #f97316);
    }

    &.fail {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }
  }

  .bar-value {
    color: var(--text-primary);
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
  }
}

.weekly-rank-card {
  display: flex;
  flex-direction: column;
}

.weekly-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.weekly-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.weekly-sub {
  font-size: 11px;
  color: var(--text-tertiary);
}

.weekly-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.weekly-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px solid transparent;
  min-width: 0;

  &.top {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  }

  &.self {
    border-color: #60a5fa;
    background: rgba(59, 130, 246, 0.12);

    [data-theme="dark"] & {
      background: rgba(59, 130, 246, 0.28);
      border-color: #3b82f6;
    }
  }
}

.weekly-avatar {
  flex: none;
}

.rank-no {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  min-width: 16px;
  text-align: center;
}

.weekly-item.top .rank-no {
  color: #f59e0b;
}

.weekly-item.self .rank-no {
  color: #2563eb;
}

.player-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;

  .player-name {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-score {
    flex: none;
    display: flex;
    align-items: baseline;
    gap: 3px;

    strong {
      font-size: 14px;
      font-weight: 700;
      color: #f59e0b;
    }

    em {
      font-size: 10px;
      color: var(--text-tertiary);
      font-style: normal;
    }
  }
}

.item-badge {
  width: 18px;
  flex: none;
  display: inline-flex;
  justify-content: center;
}

.me-tag {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: #2563eb;
  border-radius: 3px;
  padding: 2px 4px;
}

.crown {
  color: #f59e0b;
  font-size: 12px;
}

.members-section {
  margin-bottom: 14px;
}

.section-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 3px solid #f59e0b;

  .title-main {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .title-sub {
    font-size: 11px;
    color: var(--text-tertiary);
  }
}

.enemy-section {
  .section-title {
    border-left-color: #ef4444;
  }
}

.route-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 10px;
}

.route-column {
  min-width: 0;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 6px;
  border: 1px solid var(--border-light);
}

.route-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2px 8px;
  padding: 2px 4px 6px 4px;
  border-bottom: 1px dashed var(--border-light);
  margin-bottom: 4px;

  .route-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .route-meta {
    font-size: 10px;
    color: var(--text-tertiary);
  }
}

.route-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-row {
  display: grid;
  grid-template-columns: 22px 28px minmax(0, 1fr) 1.5fr;
  align-items: center;
  gap: clamp(4px, 0.6vw, 8px);
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  border-left: 3px solid transparent;
  transition: box-shadow 0.2s ease;

  &.defeated {
    background: rgba(239, 68, 68, 0.08);
    border-left-color: rgba(239, 68, 68, 0.55);

    .member-name {
      color: var(--text-tertiary);
    }
  }

  &.enemy-row {
    background: var(--bg-tertiary);

    &.defeated {
      background: rgba(239, 68, 68, 0.12);
    }
  }
}

.member-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .rank-num {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-tertiary);
  }
}

.member-avatar {
  border: 2px solid var(--border-light);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.member-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  overflow: hidden;
}

.member-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-tags {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.member-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  line-height: 1.15;

  strong {
    font-size: clamp(14px, 1.6vw, 17px);
    color: var(--text-primary);
    font-weight: 700;
  }

  em {
    font-size: 10px;
    color: var(--text-tertiary);
    font-style: normal;
    white-space: nowrap;
  }
}

.report-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-tertiary);
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}
</style>