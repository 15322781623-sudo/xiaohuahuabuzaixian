<template>
  <div class="star-team-container">
    <div class="page-title">星级队伍管理</div>

    <!-- 队长 + 目标星级 + 扫描 -->
    <div class="config-section">
      <div class="config-row">
        <div class="config-item">
          <span class="label">队长：</span>
          <n-select
            :value="captainTokenId"
            :options="captainOptions"
            size="small"
            filterable
            style="width: 200px;"
            @update:value="switchCaptain"
          />
        </div>
        <div class="config-item">
          <span class="label">目标星级：</span>
          <n-select
            v-model:value="targetStars"
            :options="targetStarOptions"
            size="small"
            style="width: 120px;"
          />
        </div>
        <n-button type="primary" size="small" @click="scanStarData" :loading="isScanning">
          扫描星数
        </n-button>
        <n-button size="small" @click="autoSelectAccounts" :disabled="accountStarData.length === 0" type="info">
          自动凑队
        </n-button>
        <n-button size="small" @click="fullAutoTeamBuilding" :disabled="accountStarData.length === 0" :loading="isFullAutoBuilding" type="warning">
          全部凑队
        </n-button>
        <n-button size="small" @click="sendChannelInvite" :disabled="!teamId" :loading="isSendingInvite" type="warning">
          频道邀请
        </n-button>
      </div>
      <div class="summary-row" v-if="accountStarData.length > 0">
        <n-tag size="small" type="info">可用账号: {{ accountStarData.length }}</n-tag>
                <n-tag size="small" type="success">显示: {{ displayAccountData.length }}</n-tag>
                <n-tag v-if="hiddenCount > 0" size="small" type="warning">已隐藏星数<{{ MIN_DISPLAY_STARS }}的{{ hiddenCount }}个账号</n-tag>
        <n-tag size="small" type="success">已选: {{ selectedAccountIds.length }}</n-tag>
        <n-tag size="small" type="warning">总星数: {{ selectedTotalStars }}</n-tag>
        <n-tag size="small" :type="selectedTotalStars >= targetStars ? 'success' : 'error'">
          目标: {{ targetStars }}
        </n-tag>
        <n-tag v-if="inTeamCount > 0" size="small" type="success">已组队: {{ inTeamCount }}人</n-tag>
      </div>
      <!-- 已完成组队汇总 -->
      <div class="completed-teams-section" v-if="allTeamsSummary.length > 0">
        <div class="section-header">
          <span class="section-title">队伍状态汇总</span>
          <n-button size="tiny" @click="refreshTeamSummary" :loading="isRefreshingStatus">刷新状态</n-button>
          <n-tag size="tiny" type="success">已完成: {{ completedTeams.length }}队</n-tag>
          <n-tag v-if="allTeamsSummary.length > completedTeams.length" size="tiny" type="warning">
            进行中: {{ allTeamsSummary.length - completedTeams.length }}队
          </n-tag>
        </div>
        <div class="completed-team-list">
          <div
            v-for="team in allTeamsSummary"
            :key="team.teamId"
            class="completed-team-card"
            :class="{ 'team-completed': team.memberCount >= 5 && team.allLocked, 'team-expanded': expandedTeamId === team.teamId }"
          >
            <div class="team-card-header clickable" @click="toggleTeamExpand(team.teamId)" title="点击展开/收起成员详情">
              <span class="team-captain">👑 {{ team.captainName }}</span>
              <n-tag size="tiny" :type="team.memberCount >= 5 ? 'success' : 'warning'">
                {{ team.memberCount }}/5 {{ team.memberCount >= 5 ? '满员' : '未满' }}
              </n-tag>
              <n-tag size="tiny" :type="team.allLocked ? 'success' : 'default'">
                {{ team.allLocked ? '✅已录用' : '❌未录用' }}
              </n-tag>
              <n-tag size="tiny" type="info">
                星数: {{ team.totalStars }}
              </n-tag>
              <n-tag size="tiny" :type="String(team.teamId) === teamId ? 'error' : 'default'">
                {{ String(team.teamId) === teamId ? '当前队伍' : team.teamId }}
              </n-tag>
              <n-tag v-if="team.memberCount >= 5 && team.allLocked" size="tiny" type="success" style="font-weight:600">
                🎉 已完成
              </n-tag>
              <span class="expand-icon">{{ expandedTeamId === team.teamId ? '▼' : '▶' }}</span>
            </div>
            <div class="team-card-members" v-show="expandedTeamId === team.teamId">
              <div class="members-grid compact-grid">
                <div
                  v-for="m in team.members"
                  :key="m.tokenId || m.roleId"
                  class="member-card compact"
                  :class="{ captain: m.isLeader, locked: team.allLocked }"
                >
                  <div class="member-avatar">
                    <div class="avatar-placeholder">{{ (m.name || '?')[0] }}</div>
                    <div class="lock-badge" v-if="team.allLocked">🔒</div>
                  </div>
                  <div class="member-info">
                    <div class="member-name">
                      {{ m.name }}
                      <n-tag v-if="m.isLeader" size="tiny" type="info">队长</n-tag>
                      <n-tag v-if="team.allLocked" size="tiny" type="success">已录用</n-tag>
                    </div>
                    <div class="member-meta">
                      <span>区服: {{ m.server }}</span>
                      <span>星数: {{ m.starCount }}</span>
                      <span v-if="m.fromScan === false" class="text-gray">👤外部</span>
                      <span v-else-if="m.inCurrentTeam" class="text-green">✅在队</span>
                      <span v-else-if="m.hasTeam" class="text-orange">⚠有队</span>
                      <span v-else class="text-gray">无队</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 账号星数列表 -->
    <div class="account-list-section" v-if="accountStarData.length > 0">
      <div class="section-header">
        <span class="section-title">账号星数列表</span>
        <n-button size="tiny" @click="refreshAccountStatus" :loading="isRefreshingStatus">刷新状态</n-button>
        <n-button size="tiny" @click="selectAll">全选</n-button>
        <n-button size="tiny" @click="clearSelection">清空</n-button>
      </div>
      <div class="account-table">
        <div class="account-row header">
          <span class="col-check"></span>
          <span class="col-name">账号</span>
          <span class="col-server">区服</span>
          <span class="col-star sortable" @click="toggleSort('star')" title="点击排序">
            星数 <span class="sort-icon">{{ getSortIcon('star') }}</span>
          </span>
          <span class="col-status sortable" @click="toggleSort('status')" title="点击排序">
            队伍状态 <span class="sort-icon">{{ getSortIcon('status') }}</span>
          </span>
        </div>
        <div
          v-for="acc in displayAccountData"
          :key="acc.tokenId"
          class="account-row"
          :class="{ selected: selectedAccountIds.includes(acc.tokenId), 'has-team': acc.hasTeam, 'in-team': acc.inCurrentTeam }"
        >
          <span class="col-check">
            <n-checkbox
              :checked="selectedAccountIds.includes(acc.tokenId)"
              @update:checked="(val) => toggleAccount(acc.tokenId, val)"
              size="small"
            />
          </span>
          <span class="col-name">{{ acc.name }}</span>
          <span class="col-server">{{ acc.server }}</span>
          <span class="col-star" :class="{ 'star-high': acc.starCount >= 15, 'star-mid': acc.starCount >= 10 && acc.starCount < 15 }">
            {{ acc.starCount }}
          </span>
          <span class="col-status">
            <n-tag v-if="acc.isLeader" size="tiny" type="error" style="margin-right:2px">队长</n-tag>
            <n-tag v-if="acc.inCurrentTeam" size="tiny" type="success" :title="'已在当前队伍'">已在队伍</n-tag>
            <n-tag v-else-if="acc.hasTeam" size="tiny" type="warning" :title="'队长: ' + (acc.teamCaptainName || '未知') + ', ' + (acc.teamMemberCount || 0) + '人'">
              {{ acc.teamCaptainName || '?' }}队
            </n-tag>
            <n-tag v-else size="tiny" type="info">无队伍</n-tag>
          </span>
        </div>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-section">
      <n-button type="primary" @click="createTeam" :loading="isCreating" :disabled="!!teamId || !captainTokenId">
        {{ teamId ? '队伍已创建' : '创建队伍' }}
      </n-button>
      <n-button type="info" @click="joinAndPrepare" :loading="isJoining" :disabled="!teamId || selectedAccountIds.length === 0">
        加入并准备 ({{ selectedAccountIds.length }}人)
      </n-button>
      <n-button type="success" @click="lockTeam" :loading="isLocking" :disabled="!teamId">
        录用锁定
      </n-button>
      <n-button type="warning" @click="continueNextTeam" :disabled="!teamId || !teamLocked" title="录用锁定后继续创建下一队">
        下一队
      </n-button>
      <n-button v-if="!isRecruiting" type="warning" @click="startRecruitLoop()" :disabled="!teamId || teamMembers.length >= 5" :title="'启动招募循环，每10秒刷新检查'">
        招募
      </n-button>
      <n-button v-if="isRecruiting" type="error" @click="stopRecruitLoop">
        停止招募
      </n-button>
      <n-button @click="refreshTeam" :loading="isRefreshing" :disabled="!teamId">
        刷新队伍
      </n-button>
      <n-button type="error" @click="dismissTeam" :loading="isDismissing" :disabled="!teamId || teamLocked" :title="teamLocked ? '队伍已录用锁定，无法解散' : ''">
        解散
      </n-button>
      <n-tag v-if="teamId" type="success" size="medium">TeamId: {{ teamId }}</n-tag>
      <n-tag v-if="teamStage" :type="teamStage.type" size="medium" style="font-weight:600">
        {{ teamStage.icon }} {{ teamStage.label }}
      </n-tag>
    </div>

    <!-- 队伍状态概览 -->
    <div class="team-status-banner" v-if="teamId && teamMembers.length > 0">
      <div class="status-row">
        <div class="status-item">
          <span class="status-label">成员</span>
          <span class="status-value">{{ teamMembers.length }}/5</span>
        </div>
        <div class="status-item">
          <span class="status-label">总星数</span>
          <span class="status-value" :class="{ 'star-enough': teamTotalStars >= targetStars }">{{ teamTotalStars }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">目标</span>
          <span class="status-value">{{ targetStars }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">准备</span>
          <span class="status-value">{{ preparedCount }}/{{ nonCaptainCount }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">录用</span>
          <span class="status-value">{{ teamLocked ? '✅已录用' : '❌未录用' }}</span>
        </div>
      </div>
      <!-- 成员状态列表 -->
      <div class="member-status-list">
        <div
          v-for="(ms, idx) in teamMemberStatuses"
          :key="idx"
          class="member-status-chip"
          :class="{ captain: ms.isCaptain, prepared: !ms.isCaptain && ms.isPrepared, hired: ms.isHired }"
        >
          <span class="chip-name">{{ ms.name }}</span>
          <span class="chip-star" v-if="ms.stars > 0">⭐{{ ms.stars }}</span>
          <span class="chip-badge" v-if="ms.isCaptain">👑</span>
          <span class="chip-badge" v-if="ms.isHired">📜</span>
          <span class="chip-badge" v-if="!ms.isCaptain && ms.isPrepared">✅</span>
          <span class="chip-badge" v-if="!ms.isCaptain && !ms.isPrepared">⏳</span>
        </div>
      </div>
    </div>

    <!-- 队伍成员列表 -->
    <div class="team-members-section" v-if="teamMembers.length > 0">
      <div class="section-header">
        <span class="section-title">队伍成员详情 ({{ teamMembers.length }}/5)</span>
        <n-tag size="small" :type="allPrepared ? 'success' : 'warning'">
          {{ allPrepared ? '全部已准备' : `准备中 ${preparedCount}/${nonCaptainCount}` }}
        </n-tag>
        <n-tag size="small" :type="teamLocked ? 'success' : 'default'">
          {{ teamLocked ? '✅ 已录用' : '❌ 未录用' }}
        </n-tag>
      </div>
      <div class="members-grid">
        <div
          v-for="(member, idx) in teamMembers"
          :key="member.roleId || idx"
          class="member-card"
          :class="{ captain: isTeamCaptain(member), prepared: member.prepared === 1, locked: teamLocked }"
        >
          <div class="member-avatar">
            <img v-if="member.headImg" :src="member.headImg" class="avatar-img" @error="$event.target.style.display='none'" />
            <div v-else class="avatar-placeholder">{{ (member.name || '?')[0] }}</div>
            <div class="prepared-badge" v-if="!isTeamCaptain(member) && isMemberPrepared(member)">✅</div>
            <div class="lock-badge" v-if="teamLocked">🔒</div>
          </div>
          <div class="member-info">
            <div class="member-name">
              {{ member.name }}
              <n-tag v-if="isTeamCaptain(member)" size="tiny" type="info">队长</n-tag>
              <n-tag v-if="isMemberHired(member)" size="tiny" type="success">已录用</n-tag>
            </div>
            <div class="member-meta">
              <span>区服: {{ member.serverId }}</span>
              <span>星数: {{ getMemberStars(member) }}</span>
              <template v-if="!isTeamCaptain(member)">
                <span :class="isMemberPrepared(member) ? 'text-green' : 'text-orange'">
                  {{ isMemberPrepared(member) ? '已准备' : '未准备' }}
                </span>
              </template>
              <span v-else class="text-green">队长无需准备</span>
            </div>
          </div>
          <div v-if="!isTeamCaptain(member) && !teamLocked" class="member-actions">
            <n-button size="tiny" type="error" @click="kickMember(member)">踢出</n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="log-section">
      <div class="log-header">
        <span class="log-title">操作日志</span>
        <n-button text size="tiny" @click="operationLogs = []">清空</n-button>
      </div>
      <div class="log-container" ref="logContainerRef">
        <div v-for="(log, idx) in operationLogs" :key="idx" class="log-entry" :class="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
        <div v-if="operationLogs.length === 0" class="log-empty">暂无操作日志</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { useMessage } from "naive-ui";

const tokenStore = useTokenStore();
const message = useMessage();

// ====== 工具函数 ======
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const getWeekSuffix = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return String(monday.getFullYear()).slice(2) +
    String(monday.getMonth() + 1).padStart(2, '0') +
    String(monday.getDate()).padStart(2, '0');
};

const getStarKey = () => `nmExtStarCnt_${getWeekSuffix()}`;

// ====== localStorage 缓存 ======
const STAR_TEAM_STORAGE_KEY = 'star_team_scan_data';

const getWeekStartMs = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
};

const saveScanData = () => {
  try {
    localStorage.setItem(STAR_TEAM_STORAGE_KEY, JSON.stringify({
      accounts: accountStarData.value,
      selectedIds: selectedAccountIds.value,
      captainId: captainTokenId.value,
      captainRId: captainRoleId.value,
      targetStars: targetStars.value,
      weekStart: getWeekStartMs(),
      savedAt: Date.now(),
    }));
  } catch {}
};

const loadScanData = () => {
  try {
    const raw = localStorage.getItem(STAR_TEAM_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // 跨周则失效
    if ((data.weekStart || 0) !== getWeekStartMs()) return false;
    if (data.accounts?.length > 0) {
      accountStarData.value = data.accounts;
      selectedAccountIds.value = data.selectedIds || [];
      if (data.captainId) captainTokenId.value = data.captainId;
      if (data.captainRId) captainRoleId.value = data.captainRId;
      if (data.targetStars) targetStars.value = data.targetStars;
      return true;
    }
  } catch {}
  return false;
};

// ====== 日志 ======
const operationLogs = ref([]);

// 排序状态
const sortBy = ref('default'); // 'default' | 'star' | 'status'
const sortAsc = ref(true); // true=升序, false=降序

// 队伍展开状态
const expandedTeamId = ref(null);
const toggleTeamExpand = (tid) => {
  expandedTeamId.value = expandedTeamId.value === tid ? null : tid;
};

const toggleSort = (field) => {
  if (sortBy.value === field) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortBy.value = field;
    sortAsc.value = field === 'star' ? false : true; // 星数默认降序，状态默认升序
  }
};

const getSortIcon = (field) => {
  if (sortBy.value !== field) return '↕';
  return sortAsc.value ? '↑' : '↓';
};
const logContainerRef = ref(null);

const addLog = (msg, type = "info") => {
  operationLogs.value.push({
    time: new Date().toLocaleTimeString(),
    msg,
    type,
  });
  if (operationLogs.value.length > 200) operationLogs.value.splice(0, 50);
  nextTick(() => {
    if (logContainerRef.value) logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
  });
};

// ====== 队长 ======
const captainTokenId = ref("");
const captainRoleId = ref("");

const captainOptions = computed(() => {
  // 扫描后只显示已扫描的账号，未扫描时显示全部
  if (accountStarData.value.length > 0) {
    return accountStarData.value
      .filter((a) => a.starCount >= 5)
      .map((a) => ({
        label: `${a.name} ${a.starCount}星`,
        value: a.tokenId,
      }));
  }
  return (tokenStore.gameTokens || []).map((t) => ({
    label: `${t.name}`,
    value: t.id,
  }));
});

const initCaptain = () => {
  const current = tokenStore.selectedTokenId || "";
  if (current) captainTokenId.value = current;
};

watch(() => tokenStore.selectedTokenId, (v) => {
  if (!captainTokenId.value && v) captainTokenId.value = v;
});

const switchCaptain = async (newId) => {
  if (!newId || newId === captainTokenId.value) return;
  captainTokenId.value = newId;
  teamId.value = "";
  teamMembers.value = [];
  captainRoleId.value = "";
  teamLeaderId.value = "";
  addLog("队长已切换，队伍状态已重置");
  // 尝试初始化
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (connected) {
      const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
      const roleId = roleInfo?.role?.roleId;
      if (roleId) {
        captainRoleId.value = String(roleId);
        addLog(`队长 roleId: ${roleId}`);
        await checkExistingTeam();
      }
    }
  } catch (err) {
    addLog(`切换队长失败: ${err.message || err}`, "error");
  }
};

// ====== 连接管理 ======
const ensureConnected = async (tid) => {
  if (tokenStore.getWebSocketStatus(tid) === "connected") return true;
  const token = tokenStore.gameTokens.find((t) => t.id === tid);
  if (!token) { addLog(`Token ${tid.slice(0, 8)} 未找到`, "error"); return false; }
  addLog(`正在连接 ${token.name}...`);
  tokenStore.createWebSocketConnection(tid, token.token, token.wsUrl || null);
  let retries = 0;
  while (tokenStore.getWebSocketStatus(tid) !== "connected" && retries < 30) {
    await delay(1000); retries++;
  }
  if (tokenStore.getWebSocketStatus(tid) !== "connected") {
    addLog(`${token.name} 连接超时`, "error"); return false;
  }
  addLog(`${token.name} 连接成功`, "success");
  return true;
};

const connectAndDo = async (tid, name, actionFn) => {
  const token = tokenStore.gameTokens.find((t) => t.id === tid);
  if (!token) { addLog(`[${name}] Token未找到`, "error"); return false; }
  let status = tokenStore.getWebSocketStatus(tid);
  if (status !== "connected") {
    tokenStore.createWebSocketConnection(tid, token.token, token.wsUrl || null);
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tid) !== "connected" && retries < 30) {
      await delay(1000); retries++;
    }
    if (tokenStore.getWebSocketStatus(tid) !== "connected") {
      addLog(`[${name}] 连接超时`, "error"); return false;
    }
    // 保存 roleId
    if (!token.roleId) {
      try {
        const ri = await tokenStore.sendMessageWithPromise(tid, "role_getroleinfo", {}, 10000);
        const rid = ri?.role?.roleId;
        if (rid) { token.roleId = String(rid); }
      } catch {}
    }
  }
  try { await actionFn(tid); return true; }
  catch (err) { addLog(`[${name}] 操作失败: ${err.message || err}`, "error"); return false; }
};

const disconnectToken = async (tid) => {
  try { tokenStore.closeWebSocketConnection(tid); } catch {}
};

// ====== 目标星级 ======
const targetStars = ref(90);
const targetStarOptions = [30, 40, 50, 60, 75, 90, 105, 120].map((v) => ({ label: `${v}星`, value: v }));

// ====== 扫描数据 ======
const accountStarData = ref([]);
const selectedAccountIds = ref([]);
const isScanning = ref(false);
const isRefreshingStatus = ref(false);

const selectedTotalStars = computed(() => {
  let sum = 0;
  for (const id of selectedAccountIds.value) {
    const acc = accountStarData.value.find((a) => a.tokenId === id);
    if (acc) sum += acc.starCount;
  }
  return sum;
});

// 星数<5的账号不显示在列表中
const MIN_DISPLAY_STARS = 5;
const displayAccountData = computed(() => {
  // 过滤：星数达标 + 无队伍或未满员队伍（排除已加入队伍的）
  const filtered = accountStarData.value.filter((a) => {
    if (a.starCount < MIN_DISPLAY_STARS) return false;
    // 无队伍的显示
    if (!a.hasTeam || !a.teamId) return true;
    // 已在队伍中的不显示（包括当前队伍）
    if (a.inCurrentTeam) return false;
    // 满员5人的队伍不显示
    if ((a.teamMemberCount || 0) >= 5) return false;
    // 未满员的队伍显示
    return true;
  });
  // 分组优先级：无队伍 > 当前队伍 > 有队伍未完成 > 已完成队伍
  const getOrder = (acc) => {
    if (acc.inCurrentTeam) return 1;
    if (!acc.hasTeam) return 0;
    if (acc.teamMemberCount >= 5) return 3;
    return 2;
  };

  return [...filtered].sort((a, b) => {
    // 用户主动排序时优先用户选择
    if (sortBy.value === 'star') {
      const diff = sortAsc.value ? a.starCount - b.starCount : b.starCount - a.starCount;
      if (diff !== 0) return diff;
    }
    if (sortBy.value === 'status') {
      const orderDiff = sortAsc.value ? getOrder(a) - getOrder(b) : getOrder(b) - getOrder(a);
      if (orderDiff !== 0) return orderDiff;
    }
    // 默认排序：分组内按星数降序
    const groupDiff = getOrder(a) - getOrder(b);
    if (groupDiff !== 0) return groupDiff;
    return b.starCount - a.starCount;
  });
});
const hiddenCount = computed(() =>
  accountStarData.value.length - displayAccountData.value.length
);

// 已完成组队的队伍汇总
const completedTeams = computed(() => {
  const teamMap = new Map();
  for (const acc of accountStarData.value) {
    if (acc.hasTeam && acc.teamId) {
      if (!teamMap.has(acc.teamId)) {
        teamMap.set(acc.teamId, {
          teamId: acc.teamId,
          captainName: acc.teamCaptainName || acc.name,
          members: [],
          totalStars: acc.teamTotalStars || 0,
          memberCount: acc.teamMemberCount || 0,
          allLocked: acc.teamAllLocked || false,
        });
      }
      const team = teamMap.get(acc.teamId);
      team.members.push(acc);
    }
  }
  // 返回同时满足：满员5人 + 全部录用 的队伍（不限制星数）
  return Array.from(teamMap.values()).filter(
    (t) => t.memberCount >= 5 && t.allLocked
  );
});

// 辅助函数：检测成员录用状态是否为本周有效录用
// lockedTime 必须在本周起始时间之后才算本周有效录用
const isLockedThisWeek = (m) => {
  if (!m.lockedTime || m.lockedTime <= 0) return false;
  // 兼容秒级/毫秒级时间戳
  const lockedMs = m.lockedTime > 1e12 ? m.lockedTime : m.lockedTime * 1000;
  return lockedMs >= getWeekStartMs();
};

// 辅助函数：检测成员是否已录用（本周内）
const isMemberHired = (m) => isLockedThisWeek(m);

// 所有队伍汇总（包含未完成的）
const allTeamsSummary = computed(() => {
  const starKey = getStarKey();
  const teamMap = new Map();

  // 当前队伍：优先使用 teamMembers（服务端完整成员列表）作为主数据源
  if (teamId.value && teamMembers.value.length > 0) {
    const tid = teamId.value;
    const leaderId = teamLeaderId.value;

    // 用扫描数据构建 roleId → acc 的映射，用于交叉补充
    const scanByRoleId = new Map();
    for (const acc of accountStarData.value) {
      if (acc.roleId) scanByRoleId.set(String(acc.roleId), acc);
    }

    let totalStars = 0;
    const members = [];
    for (const m of teamMembers.value) {
      const rid = String(m.roleId || '');
      const stars = Number(m.extParam?.[starKey]) || 0;
      totalStars += stars;
      const isLeader = rid === String(leaderId);
      const scanAcc = scanByRoleId.get(rid);
      members.push({
        tokenId: scanAcc?.tokenId || null,
        roleId: rid,
        name: scanAcc?.name || m.name || `成员${rid.slice(-4)}`,
        server: scanAcc?.server || m.serverId || '?',
        starCount: scanAcc?.starCount || stars,
        isLeader,
        inCurrentTeam: true,
        hasTeam: true,
        fromScan: !!scanAcc,
      });
    }

    const nonCapMembers = teamMembers.value.filter((m) => String(m.roleId) !== String(leaderId));
    const allLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
    const leaderMember = teamMembers.value.find((m) => String(m.roleId) === String(leaderId));

    teamMap.set(tid, {
      teamId: tid,
      captainName: leaderMember?.name || '未知',
      members,
      totalStars,
      memberCount: members.length,
      allLocked,
      isCurrentTeam: true,
    });
  }

  // 其他队伍：优先用 teamDetailsCache（完整成员），否则回退到 accountStarData
  const scanByRoleId = new Map();
  for (const acc of accountStarData.value) {
    if (acc.roleId) scanByRoleId.set(String(acc.roleId), acc);
  }

  const processedTeams = new Set(); // 已处理的队伍 ID
  for (const acc of accountStarData.value) {
    if (!acc.hasTeam || !acc.teamId) continue;
    const tid = String(acc.teamId);
    if (tid === teamId.value) continue; // 跳过当前队伍
    if (processedTeams.has(tid)) continue;
    processedTeams.add(tid);

    const cached = teamDetailsCache.value.get(tid);
    if (cached && cached.fightRoleBase && cached.fightRoleBase.length > 0) {
      // 有完整队伍缓存，用 fightRoleBase 构建
      const { fightRoleBase, leaderId } = cached;
      let totalStars = 0;
      const members = [];
      for (const m of fightRoleBase) {
        const rid = String(m.roleId || '');
        const stars = Number(m.extParam?.[starKey]) || 0;
        totalStars += stars;
        const isLeader = rid === String(leaderId);
        const scanAcc = scanByRoleId.get(rid);
        members.push({
          tokenId: scanAcc?.tokenId || null,
          roleId: rid,
          name: scanAcc?.name || m.name || `成员${rid.slice(-4)}`,
          server: scanAcc?.server || m.serverId || '?',
          starCount: scanAcc?.starCount || stars,
          isLeader,
          inCurrentTeam: false,
          hasTeam: true,
          fromScan: !!scanAcc,
        });
      }
      const nonCapMembers = fightRoleBase.filter((m) => String(m.roleId) !== String(leaderId));
      const allLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
      const leaderMember = fightRoleBase.find((m) => String(m.roleId) === String(leaderId));
      teamMap.set(tid, {
        teamId: acc.teamId,
        captainName: leaderMember?.name || acc.teamCaptainName || acc.name,
        members,
        totalStars,
        memberCount: members.length,
        allLocked,
        isCurrentTeam: false,
      });
    } else {
      // 无缓存，回退到 accountStarData 中同队伍的账号
      const sameTeamAccs = accountStarData.value.filter(
        (a) => a.hasTeam && String(a.teamId) === tid
      );
      teamMap.set(tid, {
        teamId: acc.teamId,
        captainName: acc.teamCaptainName || acc.name,
        members: sameTeamAccs.map((a) => ({
          tokenId: a.tokenId,
          roleId: a.roleId || null,
          name: a.name,
          server: a.server,
          starCount: a.starCount,
          isLeader: a.isLeader,
          inCurrentTeam: false,
          hasTeam: a.hasTeam,
          fromScan: true,
        })),
        totalStars: acc.teamTotalStars || 0,
        memberCount: acc.teamMemberCount || 0,
        allLocked: acc.teamAllLocked || false,
        isCurrentTeam: false,
      });
    }
  }

  return Array.from(teamMap.values());
});

// 已在队伍中的账号数量
const inTeamCount = computed(() =>
  accountStarData.value.filter((a) => a.hasTeam).length
);

const allPrepared = computed(() => {
  if (teamMembers.value.length <= 1) return false;
  // 检查非队长成员是否全部准备
  return teamMembers.value
    .filter((m) => !isTeamCaptain(m))
    .every((m) => isMemberPrepared(m));
});

const teamLocked = ref(false); // 队伍是否已录用锁定

// 辅助函数：检测成员是否已准备
// prepared 是时间戳，> 0 表示已准备
const isMemberPrepared = (m) => {
  return typeof m.prepared === 'number' ? m.prepared > 0 : !!m.prepared;
};

// 队伍阶段状态
const teamStage = computed(() => {
  if (!teamId.value) return null;
  if (teamLocked.value && allPrepared.value) return { label: '已就绪', type: 'success', icon: '✅' };
  if (teamLocked.value) return { label: '已锁定', type: 'info', icon: '🔒' };
  if (teamMembers.value.length >= 5) return { label: '已满员(待锁定)', type: 'warning', icon: '⚠️' };
  if (allPrepared.value) return { label: '全部已准备(可锁定)', type: 'success', icon: '🟢' };
  if (teamMembers.value.length > 1) return { label: '组队中(待准备)', type: 'warning', icon: '⏳' };
  return { label: '仅队长', type: 'default', icon: '👤' };
});

// 队伍成员星数总和
const teamTotalStars = computed(() => {
  const starKey = getStarKey();
  return teamMembers.value.reduce((sum, m) => sum + (Number(m.extParam?.[starKey]) || 0), 0);
});

// 非队长成员数
const nonCaptainCount = computed(() => {
  return Math.max(0, teamMembers.value.length - 1);
});

// 非队长中已准备的数量
const preparedCount = computed(() => {
  return teamMembers.value.filter((m) => !isTeamCaptain(m) && isMemberPrepared(m)).length;
});

// 各成员状态汇总
const teamMemberStatuses = computed(() => {
  return teamMembers.value.map((m) => {
    return {
      name: m.name,
      isCaptain: isTeamCaptain(m),
      isPrepared: isMemberPrepared(m),
      isHired: isMemberHired(m),
      stars: Number(m.extParam?.[getStarKey()]) || 0,
      serverId: m.serverId,
    };
  });
});

const scanStarData = async () => {
  isScanning.value = true;
  accountStarData.value = [];
  selectedAccountIds.value = [];
  addLog("开始扫描所有账号星数...");

  const tokens = tokenStore.gameTokens || [];
  if (tokens.length === 0) {
    addLog("没有可用账号", "error");
    isScanning.value = false;
    return;
  }

  const starKey = getStarKey();
  addLog(`本周星数键: ${starKey}`);
  const teamInfoCache = new Map(); // 队伍信息缓存
  let foundLeaderTokenId = null;
  const SCAN_CONCURRENCY = 3;

  // 扫描单个账号（并发安全）
  const scanOne = async (token, idx) => {
    const name = token.name || token.id.slice(0, 8);
    const progress = `[${idx + 1}/${tokens.length}]`;
    const result = {
      tokenId: token.id, name, server: token.server || "?",
      starCount: 0, hasTeam: false, teamId: null, roleId: null,
      inCurrentTeam: false, isLeader: false, teamCaptainName: '',
      teamMemberCount: 0, teamAllLocked: false, teamTotalStars: 0,
    };

    try {
      const connected = await ensureConnected(token.id);
      if (!connected) {
        addLog(`${progress} ${name} - 连接失败`, "error");
        return result;
      }

      // 获取 roleId
      let roleId = token.roleId ? Number(token.roleId) : null;
      if (!roleId) {
        const roleInfo = await tokenStore.sendMessageWithPromise(token.id, "role_getroleinfo", {}, 8000);
        roleId = roleInfo?.role?.roleId;
        if (roleId) { token.roleId = String(roleId); }
      }
      if (!roleId) {
        addLog(`${progress} ${name} - 未获取到roleId`, "warning");
        if (token.id !== captainTokenId.value) await disconnectToken(token.id);
        return result;
      }
      result.roleId = String(roleId);

      // 获取队伍信息
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        token.id, "matchteam_getroleteaminfo", { roleID: roleId }, 8000
      );
      const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
      let existingTeamId = null, hasTeam = false;
      for (const key of Object.keys(gDMTData)) {
        const td = gDMTData[key];
        if (td?.teamCfgId === 7 || (td?.teamId && String(td.teamId).startsWith('N'))) {
          existingTeamId = td.teamId; hasTeam = true; break;
        }
      }
      if (!existingTeamId && roleTeamRes?.teamInfo?.teamCfgId === 7) {
        existingTeamId = roleTeamRes.teamInfo.teamId; hasTeam = true;
      }

      result.hasTeam = hasTeam;
      result.teamId = existingTeamId;

      if (existingTeamId) {
        const tid = String(existingTeamId);
        // 复用缓存的队伍信息
        if (!teamInfoCache.has(tid)) {
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              token.id, "matchteam_getteaminfo", { teamId: existingTeamId }, 8000
            );
            const teamInfo = teamInfoRes?.teamInfo || {};
            const detail = {
              fightRoleBase: teamInfo.fightRoleBase || [],
              leaderId: teamInfo.leaderId,
            };
            teamInfoCache.set(tid, detail);
            // 保存到全局队伍详情缓存，供汇总使用
            teamDetailsCache.value.set(tid, detail);
          } catch { teamInfoCache.set(tid, null); }
        }

        const cached = teamInfoCache.get(tid);
        if (cached) {
          const { fightRoleBase, leaderId } = cached;
          result.teamMemberCount = fightRoleBase.length;
          const leaderMember = fightRoleBase.find((m) => String(m.roleId) === String(leaderId));
          result.teamCaptainName = leaderMember?.name || '';
          for (const m of fightRoleBase) {
            result.teamTotalStars += Number(m.extParam?.[starKey]) || 0;
          }
          const nonCapMembers = fightRoleBase.filter((m) => String(m.roleId) !== String(leaderId));
          // 判断录用状态：lockedTime 必须在本周起始时间之后才算本周有效录用
          result.teamAllLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
          if (leaderId && String(leaderId) === String(roleId)) {
            result.isLeader = true;
            foundLeaderTokenId = token.id;
          }
          const self = fightRoleBase.find((m) => String(m.roleId) === String(roleId));
          if (self) result.starCount = Number(self.extParam?.[starKey]) || 0;

          // 队伍本周无人录用且成员已有数据 → 过期旧队伍，自动解散
          if (fightRoleBase.length > 0 && !result.teamAllLocked && nonCapMembers.length > 0 && nonCapMembers.every((m) => !isLockedThisWeek(m))) {
            addLog(`${progress} ${name} - 队伍 ${tid} 录用状态已过期（非本周），自动解散...`, "warning");
            try {
              await tokenStore.sendMessageWithPromise(token.id, "matchteam_dismiss", { teamId: tid }, 10000);
              addLog(`${progress} ${name} - 过期队伍 ${tid} 已自动解散`, "success");
            } catch (dismissErr) {
              addLog(`${progress} ${name} - 解散过期队伍失败: ${dismissErr.message || dismissErr}`, "warning");
            }
            result.hasTeam = false;
            result.teamId = null;
            result.teamMemberCount = 0;
            result.teamAllLocked = false;
            result.teamCaptainName = '';
            result.isLeader = false;
            result.starCount = 0;
            foundLeaderTokenId = null;
          }
        }
      }

      // 无队伍时尝试 nmext 获取星数
      if (!result.starCount) {
        try {
          const nmextRes = await tokenStore.sendMessageWithPromise(token.id, "nmext_getinfo", {}, 8000);
          const nmextData = nmextRes?.roleNMExt || nmextRes?.body?.roleNMExt || nmextRes;
          if (nmextData?.starBossCompleteMap) {
            const completeMap = nmextData.starBossCompleteMap;
            let total = 0;
            for (const stars of Object.values(completeMap)) {
              if (Array.isArray(stars)) total += stars.filter(Boolean).length;
              else if (typeof stars === 'object') total += Object.values(stars).filter(Boolean).length;
            }
            result.starCount = total;
          }
        } catch {}
      }

      result.inCurrentTeam = hasTeam && teamId.value && String(existingTeamId) === teamId.value;
      addLog(`${progress} ${name} - 星数: ${result.starCount}${result.isLeader ? " [队长]" : ""}${hasTeam ? ` (队伍: ${existingTeamId}, ${result.teamCaptainName}, ${result.teamMemberCount}人)` : ""}`);

      // 断开非队长连接
      if (token.id !== captainTokenId.value) await disconnectToken(token.id);
    } catch (err) {
      addLog(`${progress} ${name} - 扫描失败: ${err.message || err}`, "warning");
    }
    return result;
  };

  // 并发扫描，每批 SCAN_CONCURRENCY 个
  for (let i = 0; i < tokens.length; i += SCAN_CONCURRENCY) {
    const batch = tokens.slice(i, i + SCAN_CONCURRENCY);
    const results = await Promise.all(batch.map((t, j) => scanOne(t, i + j)));
    accountStarData.value.push(...results);
  }

  addLog(`扫描完成，共 ${accountStarData.value.length} 个账号`, "success");

  // 自动选择队长
  if (!captainTokenId.value && foundLeaderTokenId) {
    captainTokenId.value = foundLeaderTokenId;
    const captainAcc = accountStarData.value.find((a) => a.tokenId === foundLeaderTokenId);
    captainRoleId.value = captainAcc?.roleId || "";
    addLog(`自动设置队长: ${captainAcc?.name}（已有星级队伍的队长）`, "success");
    if (captainAcc?.teamId) {
      teamId.value = String(captainAcc.teamId);
      addLog(`自动恢复已有队伍: ${teamId.value}`, "success");
      await ensureConnected(foundLeaderTokenId);
      await refreshTeam();
    }
  } else if (!captainTokenId.value) {
    const firstNoTeam = accountStarData.value.find((a) => !a.hasTeam);
    const fallback = firstNoTeam || accountStarData.value[0];
    captainTokenId.value = fallback.tokenId;
    captainRoleId.value = fallback.roleId || "";
    addLog(`未找到已有队伍队长，自动选择: ${fallback.name}`, "info");
  }

  isScanning.value = false;
  saveScanData();
};

// ====== 刷新核心：支持并发 + 队伍信息缓存 ======
const _refreshAccounts = async (accounts, label = "刷新") => {
  if (accounts.length === 0) return;
  const starKey = getStarKey();
  const teamInfoCache = new Map(); // teamId → {fightRoleBase, leaderId} 复用队伍详情
  let updatedCount = 0, failedCount = 0, teamCount = 0, noTeamCount = 0;

  const processOne = async (acc, idx) => {
    const progress = `[${idx + 1}/${accounts.length}]`;
    try {
      const token = tokenStore.gameTokens.find((t) => t.id === acc.tokenId);
      if (!token) return;

      const connected = await ensureConnected(acc.tokenId);
      if (!connected) { addLog(`${progress} ${acc.name} - 连接失败`, "error"); failedCount++; return; }

      // roleId
      let roleId = acc.roleId ? Number(acc.roleId) : null;
      if (!roleId) {
        const roleInfo = await tokenStore.sendMessageWithPromise(acc.tokenId, "role_getroleinfo", {}, 6000);
        roleId = roleInfo?.role?.roleId;
        if (roleId) { token.roleId = String(roleId); acc.roleId = String(roleId); }
      }
      if (!roleId) { addLog(`${progress} ${acc.name} - 未获取到roleId`, "warning"); failedCount++; return; }

      // 获取我的队伍信息
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        acc.tokenId, "matchteam_getroleteaminfo", { roleID: roleId }, 6000
      );
      const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
      let existingTeamId = null, hasTeam = false;
      for (const key of Object.keys(gDMTData)) {
        const td = gDMTData[key];
        if (td?.teamCfgId === 7 || (td?.teamId && String(td.teamId).startsWith('N'))) {
          existingTeamId = td.teamId; hasTeam = true; break;
        }
      }
      if (!existingTeamId && roleTeamRes?.teamInfo?.teamCfgId === 7) {
        existingTeamId = roleTeamRes.teamInfo.teamId; hasTeam = true;
      }

      // 重置字段
      acc.hasTeam = hasTeam;
      acc.teamId = existingTeamId;
      acc.isLeader = false;
      acc.teamCaptainName = '';
      acc.teamMemberCount = 0;
      acc.teamAllLocked = false;
      acc.teamTotalStars = 0;

      if (existingTeamId) {
        const tid = String(existingTeamId);
        // 复用缓存：同一队伍不重复查询
        if (!teamInfoCache.has(tid)) {
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              acc.tokenId, "matchteam_getteaminfo", { teamId: existingTeamId }, 6000
            );
            const teamInfo = teamInfoRes?.teamInfo || {};
            const detail = {
              fightRoleBase: teamInfo.fightRoleBase || [],
              leaderId: teamInfo.leaderId,
            };
            teamInfoCache.set(tid, detail);
            // 保存到全局队伍详情缓存，供汇总使用
            teamDetailsCache.value.set(tid, detail);
          } catch { teamInfoCache.set(tid, null); }
        }

        const cached = teamInfoCache.get(tid);
        if (cached) {
          const { fightRoleBase, leaderId } = cached;
          acc.teamMemberCount = fightRoleBase.length;
          const leaderMember = fightRoleBase.find((m) => String(m.roleId) === String(leaderId));
          acc.teamCaptainName = leaderMember?.name || '';
          if (leaderId && String(leaderId) === String(roleId)) acc.isLeader = true;
          for (const m of fightRoleBase) {
            acc.teamTotalStars += Number(m.extParam?.[starKey]) || 0;
          }
          const nonCapMembers = fightRoleBase.filter((m) => String(m.roleId) !== String(leaderId));
          // 判断录用状态：lockedTime 必须在本周起始时间之后才算本周有效录用
          acc.teamAllLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);

          // 队伍本周无人录用且成员已有数据 → 过期旧队伍，自动解散
          if (fightRoleBase.length > 0 && !acc.teamAllLocked && nonCapMembers.length > 0 && nonCapMembers.every((m) => !isLockedThisWeek(m))) {
            addLog(`${progress} ${acc.name} - 队伍 ${tid} 录用状态已过期（非本周），自动解散...`, "warning");
            try {
              await tokenStore.sendMessageWithPromise(acc.tokenId, "matchteam_dismiss", { teamId: tid }, 10000);
              addLog(`${progress} ${acc.name} - 过期队伍 ${tid} 已自动解散`, "success");
            } catch (dismissErr) {
              addLog(`${progress} ${acc.name} - 解散过期队伍失败: ${dismissErr.message || dismissErr}`, "warning");
            }
            acc.hasTeam = false;
            acc.teamId = null;
            acc.teamMemberCount = 0;
            acc.teamAllLocked = false;
            acc.teamCaptainName = '';
            acc.isLeader = false;
            hasTeam = false;
            existingTeamId = null;
          }
        }

        const lockStatus = acc.teamAllLocked ? '✅录用' : '❌未录用';
        const leaderTag = acc.isLeader ? '👑队长' : '队员';
        addLog(`${progress} ${acc.name} - ${acc.teamCaptainName}队 ${acc.teamMemberCount}人 ${acc.teamTotalStars}星 ${lockStatus} ${leaderTag}`, "success");
        teamCount++;
      } else {
        addLog(`${progress} ${acc.name} - 无队伍`, "info");
        noTeamCount++;
      }

      acc.inCurrentTeam = hasTeam && teamId.value && String(existingTeamId) === teamId.value;
      updatedCount++;

      // 断开非队长连接
      if (acc.tokenId !== captainTokenId.value) {
        await disconnectToken(acc.tokenId);
      }
    } catch (err) {
      addLog(`${progress} ${acc.name} - 刷新失败: ${err.message || err}`, "error");
      failedCount++;
    }
  };

  // 并发处理，最多 3 个同时
  const CONCURRENCY = 3;
  for (let i = 0; i < accounts.length; i += CONCURRENCY) {
    const batch = accounts.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((acc, j) => processOne(acc, i + j)));
  }

  addLog(`${label}完成: 更新 ${updatedCount} 个, 有队伍 ${teamCount} 人, 无队伍 ${noTeamCount} 人${failedCount > 0 ? `, 失败 ${failedCount} 个` : ''}`, "success");
  saveScanData();
  return { updatedCount, teamCount, noTeamCount, failedCount };
};

// 刷新当前列表显示的账号状态
const refreshAccountStatus = async () => {
  const toRefresh = displayAccountData.value;
  if (toRefresh.length === 0) { message.warning("列表中没有可刷新的账号"); return; }
  isRefreshingStatus.value = true;
  addLog(`刷新当前列表账号状态，共 ${toRefresh.length} 个...`);
  await _refreshAccounts(toRefresh, "列表状态刷新");
  isRefreshingStatus.value = false;
};

// 刷新队伍状态汇总：更新当前队伍teamMembers + 汇总中扫描账号状态
const refreshTeamSummary = async () => {
  isRefreshingStatus.value = true;
  try {
    // 1. 先刷新当前队伍的 teamMembers（服务端完整5人列表）
    if (teamId.value && captainTokenId.value) {
      addLog(`刷新当前队伍 ${teamId.value} 的完整成员列表...`);
      try {
        const connected = await ensureConnected(captainTokenId.value);
        if (connected) {
          const resp = await tokenStore.sendMessageWithPromise(
            captainTokenId.value, "matchteam_getteaminfo", { teamId: teamId.value }, 8000
          );
          if (resp?.teamInfo?.fightRoleBase) {
            teamMembers.value = resp.teamInfo.fightRoleBase;
            if (resp.teamInfo.leaderId) teamLeaderId.value = String(resp.teamInfo.leaderId);
            addLog(`队伍成员已更新: ${teamMembers.value.length} 人`, "success");
          }
        }
      } catch (err) {
        addLog(`获取队伍信息失败: ${err.message || err}`, "error");
      }
    }

    // 2. 刷新汇总中扫描账号的状态（排除外部成员）
    const teamMemberTokenIds = new Set();
    for (const team of allTeamsSummary.value) {
      for (const m of team.members) {
        if (m.tokenId) teamMemberTokenIds.add(m.tokenId);
      }
    }
    const toRefresh = accountStarData.value.filter((a) => teamMemberTokenIds.has(a.tokenId));
    if (toRefresh.length > 0) {
      addLog(`刷新汇总中扫描账号状态，共 ${toRefresh.length} 个...`);
      await _refreshAccounts(toRefresh, "队伍汇总刷新");
    }
  } finally {
    isRefreshingStatus.value = false;
  }
};

// 刷新已勾选账号的队伍状态（轻量版）
const refreshSelectedAccounts = async () => {
  if (selectedAccountIds.value.length === 0) return;
  const selectedIds = new Set(selectedAccountIds.value);
  const toRefresh = accountStarData.value.filter((a) => selectedIds.has(a.tokenId));
  if (toRefresh.length === 0) return;
  addLog(`刷新已勾选账号状态，共 ${toRefresh.length} 个...`);
  await _refreshAccounts(toRefresh, "勾选账号刷新");
};

// ====== 自动凑队算法 ======
const autoSelectAccounts = async () => {
  const allAccounts = accountStarData.value; // 包含所有账号
  const allWithStars = allAccounts.filter((a) => a.starCount > 0);
  if (allWithStars.length === 0) {
    message.warning("没有可用星数账号");
    return;
  }

  const target = targetStars.value;
  const MAX_TEAM = 5; // 队伍最多5个成员
  const selected = [];
  let sum = 0;

  addLog(`目标 ${target} 星，开始组合搜索凑队...`);

  // 获取已完成组队的 teamId 集合（满员+录用+星级达标）
  const completedTeamIds = new Set(completedTeams.value.map((t) => String(t.teamId)));

  // 同时获取“疑似已完成”的队伍（满员5人但不是当前队伍）—— 兑容旧扫描数据缺少锁定/星数字段
  const allTeamMap = new Map();
  for (const acc of allAccounts) {
    if (acc.hasTeam && acc.teamId && !acc.inCurrentTeam) {
      const tid = String(acc.teamId);
      if (!allTeamMap.has(tid)) {
        allTeamMap.set(tid, { memberCount: acc.teamMemberCount || 0, allLocked: acc.teamAllLocked || false });
      }
    }
  }
  // 排除逻辑：已完成队伍 OR 满员5人的非当前队伍（保守策略）
  const excludedTeamIds = new Set();
  for (const [tid, info] of allTeamMap) {
    if (completedTeamIds.has(tid) || (info.memberCount >= 5)) {
      excludedTeamIds.add(tid);
    }
  }
  if (excludedTeamIds.size > 0) {
    addLog(`排除 ${excludedTeamIds.size} 个已完成/满员队伍的成员`, "info");
  }

  // 过滤函数：排除已有队伍的账号（包括队长），以及已完成/满员队伍的成员
  const isAvailable = (a) => {
    if (!a.hasTeam || !a.teamId) return true; // 无队伍的可用
    if (a.inCurrentTeam) return false; // 当前队伍成员不可用（要组建新队伍）
    if (excludedTeamIds.has(String(a.teamId))) return false; // 已完成/满员队伍成员不可用
    return false; // 有队伍的都不可用
  };

  // 队长不自动包含，由贪心算法从列表中选取

  // 优先选无队伍的账号（排除已完成队伍的成员）
  const alreadySelected = new Set(selected);
  const allAvailable = allWithStars
    .filter((a) => !alreadySelected.has(a.tokenId) && isAvailable(a))
    .sort((a, b) => b.starCount - a.starCount); // 降序

  // 4. 组合搜索：选 MAX_TEAM 人，星数总和最接近目标
  addLog(`可用账号 ${allAvailable.length} 人，开始组合搜索目标 ${target} 星...`);
  const candidates = allAvailable.slice(0, 30); // 限制搜索池
  let bestAbove = null;
  let bestBelow = null;

  const searchTeam = (start, picked, pSum) => {
    if (picked.length === MAX_TEAM) {
      const diff = pSum - target;
      if (diff >= 0) {
        if (!bestAbove || diff < bestAbove.diff) {
          bestAbove = { members: [...picked], sum: pSum, diff };
        }
      } else {
        if (!bestBelow || diff > bestBelow.diff) {
          bestBelow = { members: [...picked], sum: pSum, diff };
        }
      }
      return;
    }
    const remaining = candidates.length - start;
    if (picked.length + remaining < MAX_TEAM) return;
    for (let i = start; i < candidates.length; i++) {
      picked.push(candidates[i]);
      searchTeam(i + 1, picked, pSum + candidates[i].starCount);
      picked.pop();
      if (bestAbove && bestAbove.diff === 0) return;
    }
  };

  searchTeam(0, [], 0);

  const best = bestAbove || bestBelow;
  if (best) {
    for (const m of best.members) {
      selected.push(m.tokenId);
      alreadySelected.add(m.tokenId);
    }
    sum = best.sum;
    for (const m of best.members) {
      addLog(`选中 ${m.name} 星数: ${m.starCount}`);
    }
    addLog(`组合搜索完成，总星数 ${sum}/${target}（差值: ${sum - target}）`, sum >= target ? "success" : "warning");
  } else {
    // 兑底：直接用最高星的前5人
    let slotsLeft = MAX_TEAM - selected.length;
    for (let i = 0; i < allAvailable.length && slotsLeft > 0; i++) {
      const acc = allAvailable[i];
      if (alreadySelected.has(acc.tokenId)) continue;
      selected.push(acc.tokenId);
      sum += acc.starCount;
      alreadySelected.add(acc.tokenId);
      slotsLeft--;
      addLog(`选中 ${acc.name} 星数: ${acc.starCount}（当前 ${sum}/${target}）`);
    }
  }

  if (selected.length >= MAX_TEAM && sum < target) {
    addLog(`5人总星数仅 ${sum}，未达到目标 ${target} 星，无法凑队`, "warning");
    message.warning(`5人总星数 ${sum} < 目标 ${target}，无法凑队`);
  } else if (sum < target && allAvailable.length + selected.length < MAX_TEAM) {
    addLog(`可用账号不足，总星数 ${sum}，未达到目标 ${target} 星`, "warning");
    message.warning(`可用账号总星数 ${sum} < 目标 ${target}，无法凑队`);
  } else if (sum >= target) {
    addLog(`凑队完成！总星数 ${sum} ≥ 目标 ${target}`, "success");
  }

  selectedAccountIds.value = selected;
  addLog(`自动凑队: 已选 ${selected.length} 人，总星数 ${sum}/${target}`, sum >= target ? "success" : "warning");
  message.info(`已选 ${selected.length} 人，总星数 ${sum}`);
  saveScanData();

  // 星数不达标时，踢掉最低星成员再创建队伍并招募
  if (sum < target) {
    if (selected.length >= MAX_TEAM) {
      // 找到最低星的成员，踢掉
      let lowestIdx = -1, lowestStars = Infinity;
      for (let i = 0; i < selected.length; i++) {
        const acc = accountStarData.value.find((a) => a.tokenId === selected[i]);
        if (acc && acc.starCount < lowestStars) {
          lowestStars = acc.starCount;
          lowestIdx = i;
        }
      }
      if (lowestIdx >= 0) {
        const removed = selected.splice(lowestIdx, 1)[0];
        const removedAcc = accountStarData.value.find((a) => a.tokenId === removed);
        const newSum = sum - lowestStars;
        const needFor5th = target - newSum;
        addLog(`踢掉最低星成员 ${removedAcc?.name}(${lowestStars}星)，剩余4人${newSum}星，需要第5人≥${needFor5th}星`, "info");
        selectedAccountIds.value = selected;
        saveScanData();

        // 先用4人创建队伍，再启动招募循环
        if (selected.length >= 2) {
          addLog(`先用4人创建队伍，再招募第5人...`, "info");
          await delay(500);
          await createTeam();
          // 创建成功后启动招募循环
          if (teamId.value) {
            await startRecruitLoop(needFor5th);
          }
        }
        return;
      }
    }
    // 人不够5个时也先创建队伍再招募
    if (selected.length >= 2) {
      addLog(`先用 ${selected.length} 人创建队伍，再招募...`, "info");
      await delay(500);
      await createTeam();
      if (teamId.value) {
        await startRecruitLoop(target - sum);
      }
    } else {
      addLog(`可用账号不足，无法凑队`, "warning");
      message.warning(`可用账号不足，无法凑队`);
    }
    return;
  }

  // 自动触发创建队伍 + 加入准备
  if (selected.length >= 2) {
    addLog(`自动凑队完成，即将自动创建队伍并加入...`, "info");
    await delay(500);
    await createTeam();
  }
};

// ====== 全部凑队：计算 + 自动创建多支队伍 ======
const fullAutoTeamBuilding = async () => {
  if (accountStarData.value.length === 0) { message.warning("请先扫描星数"); return; }
  isFullAutoBuilding.value = true;

  try {
    // 1. 获取所有可用账号（无队伍 + 非已完成队伍成员）
    const completedTeamIds = new Set(completedTeams.value.map((t) => String(t.teamId)));
    const availableAccounts = accountStarData.value.filter((a) => {
      if (a.starCount <= 0) return false;
      if (!a.hasTeam || !a.teamId) return true; // 无队伍
      if (completedTeamIds.has(String(a.teamId))) return false; // 已完成队伍
      // 检查是否满员5人
      if ((a.teamMemberCount || 0) >= 5) return false;
      return true;
    });

    if (availableAccounts.length < 5) {
      message.warning(`可用账号不足5人（仅${availableAccounts.length}人），无法凑队`);
      return;
    }

    addLog(`=== 全部凑队开始 === 可用账号: ${availableAccounts.length} 人`, "info");

    // 2. 计算队伍分配方案
    const teamPlans = calculateTeamPlans(availableAccounts);
    if (teamPlans.length === 0) {
      message.warning("无法凑出任何达标的队伍");
      return;
    }

    const summary = teamPlans.map((p, i) => `第${i + 1}队: ${p.targetStars}星/${p.members.length}人(${p.sum}星)`).join(', ');
    addLog(`计算完成，共 ${teamPlans.length} 支队伍: ${summary}`, "success");
    message.info(`共计算出 ${teamPlans.length} 支队伍`);

    // 3. 逐队创建并加入
    for (let i = 0; i < teamPlans.length; i++) {
      const plan = teamPlans[i];
      addLog(`\n====== 第 ${i + 1}/${teamPlans.length} 队 (${plan.targetStars}星目标, ${plan.sum}星实际) ======`, "info");

      // 设置队长和成员
      captainTokenId.value = plan.members[0];
      selectedAccountIds.value = [...plan.members];

      // 创建队伍（createTeam 内部已自动触发加入并准备）
      addLog(`创建第${i + 1}队, 队长: ${accountStarData.value.find((a) => a.tokenId === plan.members[0])?.name}...`);
      await createTeam();
      if (!teamId.value) {
        addLog(`第${i + 1}队创建失败，停止`, "error");
        break;
      }
      addLog(`第${i + 1}队创建成功: ${teamId.value}`, "success");

      addLog(`第${i + 1}队已就绪，请手动录用锁定后再继续下一队`, "success");
      message.info(`第${i + 1}队已就绪，请手动录用锁定`);

      // 等待用户手动录用（如果有更多队伍）
      if (i < teamPlans.length - 1) {
        addLog(`等待手动录用锁定...录用后点击“继续下一队”或扫描状态后自动继续`, "info");
        // 不自动等待，让用户手动控制节奏
        break;
      }
    }

    addLog(`=== 全部凑队执行完毕 ===`, "success");
  } catch (err) {
    addLog(`全部凑队失败: ${err.message || err}`, "error");
    message.error(`全部凑队失败: ${err.message || err}`);
  } finally {
    isFullAutoBuilding.value = false;
  }
};

// 计算队伍分配方案：优先90星，其次75星
const calculateTeamPlans = (accounts) => {
  const MAX_TEAM = 5;
  const pool = accounts.map((a) => ({ ...a })).sort((a, b) => b.starCount - a.starCount); // 降序
  const usedIds = new Set();
  const plans = [];

  // 组合搜索：从 available 中选 MAX_TEAM 人，星数总和最接近 targetStars
  const tryFormTeam = (targetStars) => {
    const available = pool.filter((a) => !usedIds.has(a.tokenId));
    if (available.length < MAX_TEAM) return null;

    // 限制搜索池大小避免组合爆炸（取星数最高的前30人）
    const candidates = available.slice(0, 30);
    let bestAbove = null; // 达标且最接近目标的组合
    let bestBelow = null;  // 未达标但最接近的组合（兑底）

    // 递归枚举组合
    const search = (start, selected, sum) => {
      if (selected.length === MAX_TEAM) {
        const diff = sum - targetStars;
        if (diff >= 0) {
          if (!bestAbove || diff < bestAbove.diff) {
            bestAbove = { members: [...selected], sum, diff };
          }
        } else {
          if (!bestBelow || diff > bestBelow.diff) {
            bestBelow = { members: [...selected], sum, diff };
          }
        }
        return;
      }
      // 剪枝：剩余可选数 + 已选数 < MAX_TEAM
      const remaining = candidates.length - start;
      if (selected.length + remaining < MAX_TEAM) return;

      for (let i = start; i < candidates.length; i++) {
        selected.push(candidates[i]);
        search(i + 1, selected, sum + candidates[i].starCount);
        selected.pop();
        // 已找到精确匹配时提前终止
        if (bestAbove && bestAbove.diff === 0) return;
      }
    };

    search(0, [], 0);

    const best = bestAbove || bestBelow;
    if (!best) return null;

    // 标记已使用
    for (const s of best.members) usedIds.add(s.tokenId);
    // 按星数降序排列，第一个为队长
    best.members.sort((a, b) => b.starCount - a.starCount);
    return {
      members: best.members.map((s) => s.tokenId),
      targetStars,
      sum: best.sum,
    };
  };

  // 优先凑90星队伍
  while (true) {
    const plan = tryFormTeam(90);
    if (!plan) break;
    plans.push(plan);
  }

  // 然后凑75星队伍
  while (true) {
    const plan = tryFormTeam(75);
    if (!plan) break;
    plans.push(plan);
  }

  // 剩余未分配的账号日志
  const unused = pool.filter((a) => !usedIds.has(a.tokenId));
  if (unused.length > 0) {
    addLog(`剩余 ${unused.length} 人未分配队伍: ${unused.map((a) => `${a.name}(${a.starCount}星)`).join(', ')}`, "info");
  }

  return plans;
};

// 继续下一队（全部凑队后续队伍）
const continueNextTeam = async () => {
  // 检查是否已有队伍（已录用状态）
  if (!teamId.value || !teamLocked.value) {
    message.warning("当前队伍未录用锁定，请先录用锁定");
    return;
  }
  // 重新计算剩余可用账号并继续
  addLog("继续下一队...", "info");
  await fullAutoTeamBuilding();
};

const toggleAccount = (id, val) => {
  if (val) {
    if (!selectedAccountIds.value.includes(id)) selectedAccountIds.value.push(id);
  } else {
    selectedAccountIds.value = selectedAccountIds.value.filter((x) => x !== id);
  }
  saveScanData();
};

const selectAll = () => { selectedAccountIds.value = accountStarData.value.map((a) => a.tokenId); };
const clearSelection = () => { selectedAccountIds.value = []; };

// ====== 队伍操作 ======
const teamId = ref("");
const teamMembers = ref([]);
const teamLeaderId = ref("");
const teamDetailsCache = ref(new Map()); // teamId → { fightRoleBase, leaderId } 所有队伍完整成员数据 // 队伍队长 roleId
const isCreating = ref(false);
const isJoining = ref(false);
const isLocking = ref(false);
const isRefreshing = ref(false);
const isDismissing = ref(false);

const getMemberStars = (member) => {
  const starKey = getStarKey();
  return Number(member.extParam?.[starKey]) || 0;
};

const isTeamCaptain = (member) => {
  if (!member || !teamLeaderId.value) return false;
  return String(member.roleId) === teamLeaderId.value;
};

// 检查已有队伍
const checkExistingTeam = async () => {
  if (!captainTokenId.value || !captainRoleId.value) return;
  try {
    const roleTeamRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_getroleteaminfo",
      { roleID: Number(captainRoleId.value) }, 10000
    );
    const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
    let existingTeamId = null;
    for (const key of Object.keys(gDMTData)) {
      const td = gDMTData[key];
      if (td?.teamCfgId === 7 || (td?.teamId && String(td.teamId).startsWith('N'))) {
        existingTeamId = td.teamId; break;
      }
    }
    if (!existingTeamId && roleTeamRes?.teamInfo?.teamCfgId === 7) {
      existingTeamId = roleTeamRes.teamInfo.teamId;
    }
    if (existingTeamId) {
      teamId.value = String(existingTeamId);
      addLog(`发现已有星级队伍: ${existingTeamId}`, "success");
      await refreshTeam();
    }
  } catch (err) {
    addLog(`检查已有队伍失败: ${err.message || err}`, "warning");
  }
};

// 创建队伍
const createTeam = async () => {
  // 使用已选账号的第一个作为队长，如果没有则用顶部选择器
  const createCaptainId = selectedAccountIds.value.length > 0
    ? selectedAccountIds.value[0]
    : captainTokenId.value;
  if (!createCaptainId) { message.warning("请先选择队长"); return; }

  // 更新顶部队长选择器为当前创建队长
  captainTokenId.value = createCaptainId;
  const captainName = accountStarData.value.find((a) => a.tokenId === createCaptainId)?.name || '未知';
  addLog(`队长: ${captainName}`, "info");

  isCreating.value = true;

  // 检查是否已有旧队伍，如已锁定则自动解散
  if (teamId.value) {
    addLog(`检测到已有队伍 ${teamId.value}，检查是否需要解散...`, "info");
    try {
      const connected = await ensureConnected(captainTokenId.value);
      if (connected) {
        await refreshTeam();
        if (teamLocked.value) {
          addLog("旧队伍已录用锁定，自动解散以便创建新队伍...", "info");
          await dismissTeam();
          await delay(500);
        } else {
          addLog("旧队伍未锁定，将直接解散...", "warning");
          await dismissTeam();
          await delay(500);
        }
      }
    } catch (err) {
      addLog(`检查旧队伍失败: ${err.message || err}，继续创建新队伍`, "warning");
    }
  }

  addLog("正在创建星级队伍...");
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) { isCreating.value = false; return; }

    // 创建队伍
    addLog("创建队伍 (matchteam_create, teamCfgId: 7)...");
    const resp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_create",
      {
        teamCfgId: 7,
        setting: { name: "星级先锋队", notice: "", secret: 1, apply: 0, applyList: [] },
        param: 0, custom: {}, extParam: 0,
      },
      10000
    );

    if (resp?.teamInfo?.teamId) {
      teamId.value = String(resp.teamInfo.teamId);
      if (resp.teamInfo.leaderId) teamLeaderId.value = String(resp.teamInfo.leaderId);
      if (resp.teamInfo.fightRoleBase?.length > 0) {
        teamMembers.value = resp.teamInfo.fightRoleBase;
      }
      addLog(`队伍创建成功！TeamId: ${teamId.value}，队长 roleId: ${teamLeaderId.value || '未知'}`, "success");
      message.success(`队伍创建成功！TeamId: ${teamId.value}`);

      // 新队伍只有队长，重置所有非队长的 inCurrentTeam 避免旧数据干扰加入判断
      for (const acc of accountStarData.value) {
        if (acc.tokenId !== captainTokenId.value) {
          acc.inCurrentTeam = false;
        }
      }

      // 自动触发队员加入并准备
      if (selectedAccountIds.value.length > 1) {
        addLog(`队伍创建成功，自动触发 ${selectedAccountIds.value.length - 1} 名队员加入...`, "info");
        isCreating.value = false;
        await delay(1000); // 等待队伍创建完成
        await joinAndPrepare();
        return;
      }
    } else {
      addLog(`创建响应异常: ${JSON.stringify(resp).slice(0, 200)}`, "error");
    }
  } catch (err) {
    addLog(`创建队伍失败: ${err.message || err}`, "error");
    message.error(`创建队伍失败`);
  } finally {
    isCreating.value = false;
  }
};

// 加入并准备
const joinAndPrepare = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (selectedAccountIds.value.length === 0) { message.warning("请先选择队友"); return; }

  isJoining.value = true;

  // 获取已在当前队伍中的成员 tokenId 集合
  const inTeamTokenIds = new Set(
    accountStarData.value.filter((a) => a.inCurrentTeam).map((a) => a.tokenId)
  );

  // 过滤：排除队长和已在队伍中的成员，最多4个队员
  const memberIds = selectedAccountIds.value
    .filter((id) => id !== captainTokenId.value && !inTeamTokenIds.has(id))
    .slice(0, 4);

  const alreadyInCount = selectedAccountIds.value.filter((id) => inTeamTokenIds.has(id)).length;
  if (alreadyInCount > 0) {
    addLog(`${alreadyInCount} 人已在队伍中，跳过重复加入`, "info");
  }

  if (memberIds.length === 0) {
    addLog("没有需要新加入的队员（都已在队伍中或仅有队长）", "info");
    // 尝试为已在队伍的成员执行准备
    const existingMemberIds = selectedAccountIds.value
      .filter((id) => id !== captainTokenId.value && inTeamTokenIds.has(id));
    if (existingMemberIds.length > 0) {
      addLog(`尝试为 ${existingMemberIds.length} 名已在队伍的成员执行准备...`);
      for (const tid of existingMemberIds) {
        const token = tokenStore.gameTokens.find((t) => t.id === tid);
        const name = token?.name || tid.slice(0, 8);
        await connectAndDo(tid, name, async (tokenId) => {
          addLog(`[${name}] 准备 (matchteam_memberprepare)...`);
          await tokenStore.sendMessageWithPromise(
            tokenId, "matchteam_memberprepare",
            { teamId: teamId.value }, 10000
          );
        });
      }
    }
    isJoining.value = false;
    await refreshTeam();
    return;
  }

  addLog(`开始加入并准备，共 ${memberIds.length} 名新队友（已有${alreadyInCount}人在队）...`);

  for (const tid of memberIds) {
    const token = tokenStore.gameTokens.find((t) => t.id === tid);
    const name = token?.name || tid.slice(0, 8);

    const success = await connectAndDo(tid, name, async (tokenId) => {
      addLog(`[${name}] 加入队伍 (matchteam_join)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_join",
        { teamId: teamId.value }, 10000
      );
      await delay(800);
      addLog(`[${name}] 准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_memberprepare",
        { teamId: teamId.value }, 10000
      );
    });

    if (success) {
      addLog(`[${name}] 加入并准备成功！`, "success");
      // 更新 accountStarData 中的 inCurrentTeam 状态
      const acc = accountStarData.value.find((a) => a.tokenId === tid);
      if (acc) {
        acc.inCurrentTeam = true;
        acc.hasTeam = true;
        acc.teamId = teamId.value;
      }
    } else {
      addLog(`[${name}] 加入失败`, "error");
      // 失败时重置状态，避免显示错误的“已在队伍”
      const acc = accountStarData.value.find((a) => a.tokenId === tid);
      if (acc) {
        acc.inCurrentTeam = false;
      }
    }
    // 断开队员连接释放资源
    if (tokenStore.getWebSocketStatus(tid) === "connected") {
      await disconnectToken(tid);
    }
    await delay(500);
  }

  addLog("加入并准备流程完成", "success");
  await refreshTeam();
  isJoining.value = false;
  addLog("请手动点击「录用锁定」确认锁定队伍", "info");
};

// 录用锁定
const lockTeam = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (!captainTokenId.value) { message.warning("队长未设置"); return; }

  isLocking.value = true;
  addLog(`正在录用锁定 (matchteam_lock)... 队长: ${captainTokenId.value.slice(0, 8)}`);

  try {
    // 确保队长连接正常
    const captainToken = tokenStore.gameTokens.find((t) => t.id === captainTokenId.value);
    if (!captainToken) {
      addLog("队长 Token 未找到", "error");
      isLocking.value = false;
      return;
    }

    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) {
      addLog("队长连接失败", "error");
      isLocking.value = false;
      return;
    }

    // 等待连接稳定
    await delay(500);

    addLog(`队长连接已就绪，发送录用锁定指令...`);

    // 录用锁定前检查队伍状态
    const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
    const preparedMembers = nonCaptainMembers.filter((m) => isMemberPrepared(m));
    const lockedMembers = nonCaptainMembers.filter((m) => isMemberHired(m));
    addLog(`队伍状态: ${teamMembers.value.length}人, 准备: ${preparedMembers.length}/${nonCaptainMembers.length}, 已录用: ${lockedMembers.length}/${nonCaptainMembers.length}`, "info");

    if (nonCaptainMembers.length > 0 && preparedMembers.length < nonCaptainMembers.length) {
      addLog(`注意: 有 ${nonCaptainMembers.length - preparedMembers.length} 名成员未准备，可能影响录用锁定`, "warning");
    }

    // 构建 lockIds：只锁定未录用的成员 roleId（已录用的不再发送）
    const unlockedMembers = nonCaptainMembers.filter((m) => !isMemberHired(m));
    const lockIds = unlockedMembers
      .filter((m) => m.roleId)
      .map((m) => Number(m.roleId));

    if (lockIds.length === 0) {
      if (lockedMembers.length === nonCaptainMembers.length) {
        addLog("所有成员已录用锁定，无需重复操作", "info");
        message.info("所有成员已录用锁定");
        teamLocked.value = true;
        isLocking.value = false;
        return;
      }
      addLog("没有需要锁定的成员（无非队长成员或无roleId）", "warning");
      isLocking.value = false;
      return;
    }

    if (lockedMembers.length > 0) {
      addLog(`${lockedMembers.length} 人已录用，跳过。本次锁定 ${lockIds.length} 人`, "info");
    }

    addLog(`发送录用锁定指令，lockIds: ${lockIds.join(', ')}`);

    const resp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_lock",
      { teamId: teamId.value, lockIds }, 15000
    );
    addLog(`录用锁定响应: ${JSON.stringify(resp).slice(0, 200)}`, "success");
    addLog("队伍已录用锁定！", "success");
    message.success("队伍已录用锁定！");
    teamLocked.value = true;
    await refreshTeam();
    // 锁定后刷新已勾选账号的队伍状态
    await refreshSelectedAccounts();
  } catch (err) {
    addLog(`录用锁定失败: ${err.message || err}`, "error");
    message.error(`录用锁定失败: ${err.message || err}`);
  } finally {
    isLocking.value = false;
  }
};

// 发送频道邀请
const isSendingInvite = ref(false);
const isFullAutoBuilding = ref(false);
const isRecruiting = ref(false);
const recruitAbortRef = { abort: false }; // 招募循环取消标记
const sendChannelInvite = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (!captainTokenId.value) { message.warning("队长未设置"); return; }

  isSendingInvite.value = true;
  addLog("正在发送频道邀请...");

  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) {
      addLog("队长连接失败", "error");
      isSendingInvite.value = false;
      return;
    }

    const memberCnt = teamMembers.value.length || 1;
    const msg = `星级挑战：${teamId.value}，求组队！目标${targetStars.value}星`;

    const resp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "system_sendchatmessage",
      {
        channel: 1,
        msgType: 12,
        msg: msg,
        emojiId: 0,
        extra: {
          extType: 1,
          msg: {
            teamCfgId: 7,
            teamId: teamId.value,
            memberCnt: memberCnt,
          },
        },
      },
      10000
    );

    addLog(`频道邀请已发送！队伍 ${teamId.value}，当前 ${memberCnt} 人`, "success");
    message.success("频道邀请已发送！");
  } catch (err) {
    addLog(`发送频道邀请失败: ${err.message || err}`, "error");
    message.error(`发送频道邀请失败: ${err.message || err}`);
  } finally {
    isSendingInvite.value = false;
  }
};

// 招募广播：凑不齐时自动发送频道消息招募成员（带房号）
const sendRecruitBroadcast = async (needStars) => {
  const senderId = captainTokenId.value || selectedAccountIds.value[0];
  if (!senderId) { addLog("无可用账号发送招募广播", "warning"); return; }

  try {
    const connected = await ensureConnected(senderId);
    if (!connected) { addLog("发送者连接失败，无法发送招募广播", "error"); return; }

    const senderName = accountStarData.value.find((a) => a.tokenId === senderId)?.name || '未知';
    const memberCnt = teamMembers.value.length || selectedAccountIds.value.length || 1;
    const missingCount = Math.max(5 - memberCnt, 0);
    const hasTeam = !!teamId.value;

    // 有房号时用队伍邀请格式，无房号时用普通消息
    const msg = hasTeam
      ? `星级挑战：${teamId.value}，目标${targetStars.value}星，缺${missingCount}人≥${needStars}星，求高星队友！`
      : `星级挑战招募！目标${targetStars.value}星，缺${missingCount}人≥${needStars}星队友！`;

    const params = hasTeam ? {
      channel: 1, msgType: 12, msg,
      emojiId: 0,
      extra: {
        extType: 1,
        msg: { teamCfgId: 7, teamId: teamId.value, memberCnt },
      },
    } : {
      channel: 1, msgType: 1, msg,
      emojiId: 0, extra: {},
    };

    await tokenStore.sendMessageWithPromise(senderId, "system_sendchatmessage", params, 10000);

    addLog(`招募广播已发送: "${msg}" (${senderName})`, "success");
    message.success(hasTeam ? `招募广播已发送！房号: ${teamId.value}` : "招募广播已发送！");
  } catch (err) {
    addLog(`发送招募广播失败: ${err.message || err}`, "error");
    message.error(`招募广播发送失败: ${err.message || err}`);
  }
};

// 招募循环：发送广播→等待→刷新队伍→检查新成员→踢出不符合的→循环
const startRecruitLoop = async (needStars) => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (isRecruiting.value) { message.warning("招募进行中"); return; }

  isRecruiting.value = true;
  recruitAbortRef.abort = false;
  const starKey = getStarKey();
  const target = needStars || (targetStars.value - teamTotalStars.value);
  addLog(`=== 招募循环开始 === 需要成员≥${target}星，每30秒刷新检查`, "info");

  try {
    while (!recruitAbortRef.abort) {
      // 1. 检查队伍是否已满
      if (teamMembers.value.length >= 5) {
        addLog(`队伍已满 ${teamMembers.value.length}/5，停止招募`, "success");
        message.success("队伍已满，招募结束");
        break;
      }

      // 2. 发送招募广播
      const currentNeed = targetStars.value - teamTotalStars.value;
      await sendRecruitBroadcast(Math.max(currentNeed, target));

      // 3. 等待30秒
      addLog(`等待30秒，查看是否有新成员加入...`, "info");
      for (let s = 30; s > 0; s--) {
        if (recruitAbortRef.abort) break;
        await delay(1000);
      }
      if (recruitAbortRef.abort) break;

      // 4. 刷新队伍查看新成员
      await refreshTeam();
      if (recruitAbortRef.abort) break;

      // 5. 检查新加入的成员是否满足星数要求（按每个空缺位置平均需求计算）
      const remainingSlots = Math.max(5 - teamMembers.value.length, 1); // 剩余空缺位置数
      const totalRemainingNeed = Math.max(targetStars.value - teamTotalStars.value, 0); // 总共还需多少星
      const avgNeedPerSlot = Math.ceil(totalRemainingNeed / remainingSlots); // 每个位置平均需要多少星
      const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
      for (const m of nonCaptainMembers) {
        const memberStars = Number(m.extParam?.[starKey]) || 0;
        // 检查是否是我们扫描过的已知账号（已知账号不需要踢）
        const isKnownAccount = accountStarData.value.some(
          (a) => a.roleId && String(a.roleId) === String(m.roleId)
        );
        if (!isKnownAccount && memberStars < avgNeedPerSlot) {
          addLog(`成员 ${m.name} 星数 ${memberStars} < 每位置需求 ${avgNeedPerSlot}（总需${totalRemainingNeed}÷${remainingSlots}位），踢出`, "warning");
          try {
            await tokenStore.sendMessageWithPromise(
              captainTokenId.value, "matchteam_kick",
              { teamId: teamId.value, kickRoleId: Number(m.roleId) }, 10000
            );
            addLog(`已踢出不符合成员: ${m.name} (${memberStars}星)`, "success");
            await refreshTeam();
          } catch (err) {
            addLog(`踢出失败: ${err.message || err}`, "error");
          }
        }
      }

      // 6. 再次检查是否已满
      if (teamMembers.value.length >= 5) {
        addLog(`队伍已满 ${teamMembers.value.length}/5，停止招募`, "success");
        message.success("队伍已满，招募结束");
        break;
      }
    }
  } catch (err) {
    addLog(`招募循环异常: ${err.message || err}`, "error");
  } finally {
    isRecruiting.value = false;
    if (recruitAbortRef.abort) {
      addLog("招募循环已手动停止", "info");
    }
  }
};

// 停止招募循环
const stopRecruitLoop = () => {
  recruitAbortRef.abort = true;
  isRecruiting.value = false;
  addLog("正在停止招募...", "info");
};

// 刷新队伍
const refreshTeam = async () => {
  if (!teamId.value || !captainTokenId.value) return;
  isRefreshing.value = true;
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) { isRefreshing.value = false; return; }
    const resp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_getteaminfo",
      { teamId: teamId.value }, 10000
    );

    if (resp?.teamInfo?.fightRoleBase) {
      teamMembers.value = resp.teamInfo.fightRoleBase;
      if (resp.teamInfo.leaderId) teamLeaderId.value = String(resp.teamInfo.leaderId);

      // 同步更新 accountStarData 中的队伍状态
      const currentTeamRoleIds = new Set(
        teamMembers.value.map((m) => String(m.roleId)).filter(Boolean)
      );
      const leaderRoleId = String(resp.teamInfo.leaderId || '');

      for (const acc of accountStarData.value) {
        const accRoleId = String(acc.roleId || '');
        if (accRoleId && currentTeamRoleIds.has(accRoleId)) {
          // 该账号在当前队伍中
          acc.inCurrentTeam = true;
          acc.hasTeam = true;
          acc.teamId = teamId.value;
          acc.isLeader = accRoleId === leaderRoleId;
          acc.teamMemberCount = teamMembers.value.length;
          acc.teamCaptainName = teamMembers.value.find(
            (m) => String(m.roleId) === leaderRoleId
          )?.name || '';
        } else if (acc.inCurrentTeam) {
          // 该账号之前标记为在当前队伍，但实际已不在
          acc.inCurrentTeam = false;
          acc.isLeader = false;
        }
      }

      // 检测队伍是否已录用锁定
      // 1. 先尝试队伍级别字段
      const teamInfo = resp.teamInfo;
      const lockFlag = teamInfo.lock ?? teamInfo.locked ?? teamInfo.isLock ?? teamInfo.status ?? teamInfo.state;
      let isTeamLevelLocked = lockFlag === 1 || lockFlag === 2 || lockFlag === 'locked';

      // 2. 回退：检查非队长成员的 lockedTime，如果都有本周有效 lockedTime 则队伍已锁定
      const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
      const allMembersLocked = nonCaptainMembers.length > 0 && nonCaptainMembers.every(isLockedThisWeek);
      teamLocked.value = isTeamLevelLocked || allMembersLocked;

      addLog(`队伍已刷新，共 ${teamMembers.value.length} 人`);

      // 保存 roleId 到 token
      for (const m of resp.teamInfo.fightRoleBase) {
        if (m.roleId) {
          const token = tokenStore.gameTokens.find(
            (t) => t.name === m.name && String(t.server) === String(m.serverId)
          );
          if (token && !token.roleId) { token.roleId = String(m.roleId); }
        }
      }
    }
  } catch (err) {
    addLog(`刷新队伍失败: ${err.message || err}`, "warning");
  } finally {
    isRefreshing.value = false;
  }
};

// 踢出成员
const kickMember = async (member) => {
  if (!teamId.value) return;
  const name = member.name || String(member.roleId);
  addLog(`正在踢出: ${name}...`);
  try {
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_kick",
      { teamId: teamId.value, kickRoleId: Number(member.roleId) }, 10000
    );
    addLog(`已踢出: ${name}`, "success");
    await refreshTeam();
  } catch (err) {
    addLog(`踢出失败: ${err.message || err}`, "error");
  }
};

// 解散队伍
const dismissTeam = async () => {
  if (!teamId.value) return;
  isDismissing.value = true;
  addLog("正在解散队伍 (matchteam_dismiss)...");
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) { isDismissing.value = false; return; }
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_dismiss",
      { teamId: teamId.value }, 10000
    );
    addLog("队伍已解散", "success");
    message.success("队伍已解散");

    // 将队伍成员的状态重置为无队伍，回到列表
    const dismissedTeamId = teamId.value;
    let resetCount = 0;
    for (const acc of accountStarData.value) {
      if (acc.inCurrentTeam || (acc.teamId && String(acc.teamId) === dismissedTeamId)) {
        acc.inCurrentTeam = false;
        acc.hasTeam = false;
        acc.teamId = null;
        acc.isLeader = false;
        acc.teamCaptainName = '';
        acc.teamMemberCount = 0;
        acc.teamAllLocked = false;
        acc.teamTotalStars = 0;
        resetCount++;
      }
    }
    if (resetCount > 0) {
      addLog(`已重置 ${resetCount} 名成员状态为无队伍`, "info");
    }

    teamId.value = "";
    teamMembers.value = [];
    teamLeaderId.value = "";
    teamLocked.value = false;
    saveScanData();
  } catch (err) {
    addLog(`解散失败: ${err.message || err}`, "error");
  } finally {
    isDismissing.value = false;
  }
};

// ====== 自动获取队伍成员 ======
watch(teamId, async (newId) => {
  if (newId && teamMembers.value.length === 0 && captainTokenId.value) {
    await nextTick();
    await refreshTeam();
  }
});

// ====== 初始化 ======
onMounted(async () => {
  // 尝试从 localStorage 恢复扫描数据
  const restored = loadScanData();
  if (restored) {
    addLog(`已恢复上次扫描数据（${accountStarData.value.length}个账号）`, "success");
  }

  initCaptain();
  if (captainTokenId.value) {
    try {
      const connected = await ensureConnected(captainTokenId.value);
      if (connected) {
        const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
        const roleId = roleInfo?.role?.roleId;
        if (roleId) {
          captainRoleId.value = String(roleId);
          const t = tokenStore.gameTokens.find((x) => x.id === captainTokenId.value);
          if (t) t.roleId = String(roleId);
          await checkExistingTeam();
        }
      }
    } catch (err) {
      addLog(`初始化失败: ${err.message || err}`, "warning");
    }
  }

  // 如果有 teamId 但 teamMembers 为空，自动获取队伍成员
  if (teamId.value && teamMembers.value.length === 0 && captainTokenId.value) {
    addLog(`检测到队伍 ${teamId.value} 但成员列表为空，自动获取...`);
    await refreshTeam();
  }
  addLog("星级队伍管理就绪");
});
</script>

<style scoped lang="scss">
.star-team-container { padding: 16px; }
.page-title { font-size: 18px; font-weight: bold; margin-bottom: 16px; }
.config-section { margin-bottom: 16px; }
.config-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.config-item { display: flex; align-items: center; gap: 6px; }
.label { font-weight: 600; font-size: 13px; white-space: nowrap; }
.summary-row { display: flex; gap: 8px; flex-wrap: wrap; }

.account-list-section { margin-bottom: 16px; }

.completed-teams-section {
  margin: 12px 0;
  padding: 10px;
  background: var(--n-color, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--n-border-color, #e8e8e8);
}
.completed-team-list { display: flex; flex-direction: column; gap: 8px; }
.completed-team-card {
  padding: 8px;
  background: var(--n-color, #fff);
  border-radius: 6px;
  border: 1px solid var(--n-border-color, #e0e0e0);
}
.completed-team-card.team-completed {
  border-color: #18a058;
  background: linear-gradient(135deg, rgba(24,160,88,0.05), rgba(24,160,88,0.1));
}
.team-card-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
  .team-captain { font-weight: 600; font-size: 13px; }
  &.clickable {
    cursor: pointer;
    &:hover { background: rgba(24, 160, 88, 0.08); border-radius: 4px; }
  }
  .expand-icon {
    font-size: 10px; color: #999; margin-left: auto;
  }
}
.team-expanded {
  border-left: 3px solid #18a058 !important;
}
.team-card-members {
  padding-top: 6px; margin-top: 6px;
  border-top: 1px dashed rgba(255,255,255,0.1);
}
.compact-grid {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px;
}
.member-card.compact {
  padding: 6px 8px;
  font-size: 12px;
  .member-avatar { width: 28px; height: 28px; }
  .avatar-placeholder { width: 28px; height: 28px; font-size: 12px; }
  .member-name { font-size: 12px; }
  .member-meta { font-size: 11px; }
}
.section-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
  .section-title { font-weight: 600; font-size: 14px; }
}
.account-table { border: 1px solid var(--n-border-color, #e0e0e0); border-radius: 8px; overflow: hidden; }
.account-row {
  display: flex; align-items: center; padding: 6px 12px; gap: 8px;
  border-bottom: 1px solid var(--n-border-color, #f0f0f0);
  &:last-child { border-bottom: none; }
  &.header { background: var(--n-color, #f7f8fa); font-weight: 600; font-size: 12px; }
    .sortable {
      cursor: pointer;
      user-select: none;
      &:hover { color: #2080f0; }
      .sort-icon { font-size: 10px; opacity: 0.6; }
    }
  &.selected { background: rgba(24, 160, 88, 0.06); }
  &.has-team { opacity: 0.7; }
  &.in-team { background: rgba(24, 160, 88, 0.1); }
}
.col-check { width: 28px; text-align: center; flex-shrink: 0; }
.col-name { flex: 1; min-width: 60px; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-server { width: 52px; font-size: 12px; color: #888; flex-shrink: 0; }
.col-star { width: 36px; text-align: center; font-weight: 600; flex-shrink: 0; }
.star-high { color: #e6a23c; }
.star-mid { color: #18a058; }
.col-status { min-width: 70px; max-width: 140px; text-align: center; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.action-section { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }

.members-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px; margin-bottom: 16px;
}
.member-card {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border: 1px solid var(--n-border-color, #e8e8e8); border-radius: 8px;
  &.captain { border-color: #18a058; background: rgba(24, 160, 88, 0.04); }
  &.prepared { border-color: #67c23a; }
}
.member-avatar { position: relative; width: 36px; height: 36px; }
.avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder {
  width: 36px; height: 36px; border-radius: 50%; background: #e0e0e0;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.prepared-badge { position: absolute; bottom: -2px; right: -2px; font-size: 12px; }
.lock-badge { position: absolute; top: -2px; right: -2px; font-size: 10px; }
.member-card.locked { opacity: 0.85; border-color: #999; }

// 队伍状态概览横幅
.team-status-banner {
  margin-bottom: 16px; padding: 12px 16px;
  background: rgba(var(--n-color-rgb, 245,245,245), 0.5);
  border: 1px solid var(--n-border-color, #e8e8e8); border-radius: 10px;
}
.status-row {
  display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px;
}
.status-item {
  display: flex; flex-direction: column; align-items: center; min-width: 60px;
}
.status-label { font-size: 11px; color: #999; }
.status-value { font-size: 15px; font-weight: 700; &.star-enough { color: #18a058; } }
.member-status-list {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.member-status-chip {
  display: flex; align-items: center; gap: 4px; padding: 4px 10px;
  border-radius: 16px; background: #f0f0f0; font-size: 12px;
  &.captain { background: rgba(24, 160, 88, 0.15); font-weight: 600; }
  &.prepared { border: 1px solid #67c23a; }
}
.chip-name { font-weight: 500; }
.chip-star { color: #e6a23c; font-weight: 600; }
.chip-badge { font-size: 13px; }

// 队伍成员详情区
.text-green { color: #18a058; }
.text-orange { color: #e6a23c; }
.text-gray { color: #999; }
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.member-meta { font-size: 11px; color: #888; display: flex; gap: 8px; }
.member-actions { flex-shrink: 0; }

.log-section { margin-top: 16px; }
.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.log-title { font-weight: 600; font-size: 14px; }
.log-container {
  max-height: 200px; overflow-y: auto; border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 8px; padding: 8px;
}
.log-entry { font-size: 12px; padding: 2px 0; &.success { color: #18a058; } &.error { color: #e74c3c; } &.warning { color: #e6a23c; } }
.log-time { color: #999; margin-right: 8px; }
.log-empty { text-align: center; color: #999; padding: 16px; font-size: 13px; }
</style>
