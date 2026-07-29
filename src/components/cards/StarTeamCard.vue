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
            clearable
            placeholder="请选择队长"
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
              <span class="team-captain" @click.stop="openTeamCaptain(team)" title="点击打开该队队长（切换为当前队长）">👑 {{ team.captainName }}</span>
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
          <span class="col-action"></span>
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
          <span class="col-action">
            <n-button size="tiny" quaternary type="error" @click="removeAccount(acc.tokenId)" title="从列表移除">✕</n-button>
          </span>
        </div>
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-section">
      <n-button type="primary" @click="createTeam" :loading="isCreating" :disabled="!captainTokenId && selectedAccountIds.length === 0" :title="teamId && !teamLocked ? '存在未锁定的旧队伍，点击后会自动解散残留队伍并新建' : '以勾选的第一个账号作为队长创建队伍（未勾选时用顶部队长）'">
        创建队伍
      </n-button>
      <n-button type="info" @click="joinAndPrepare" :loading="isJoining" :disabled="!teamId || selectedAccountIds.length === 0">
        加入并准备 ({{ selectedAccountIds.length }}人)
      </n-button>
      <!-- 新添：单独触发全部未准备成员依次准备（不含加入） -->
      <n-button v-if="teamMembers.length > 1" type="success" @click="prepareAllMembers" :loading="isPreparingAll" :disabled="!teamId || teamLocked || allPrepared" :title="allPrepared ? '所有成员已准备' : '让队伍中所有未准备的本地账号成员依次执行准备（不执行加入）'">
        全部准备
      </n-button>
      <n-button type="success" @click="lockTeam" :loading="isLocking" :disabled="!teamId">
        录用锁定
      </n-button>
      <!-- 新添：补齐队伍内未准备成员的星数 -->
      <n-button v-if="teamMembers.length > 0" type="warning" @click="prepareTeamMembersToTargetStars" :loading="isJoining" title="为队伍中所有成员补齐到目标星数后自动加入并准备">
        补齐凑星
      </n-button>
      <!-- 新添：踢掉本周最低星队员并自动补齐替补 -->
      <n-button v-if="teamMembers.length > 1" type="warning" @click="replaceLowestStarMember" :loading="isReplacing" :disabled="!teamId || teamLocked" :title="teamLocked ? '队伍已录用锁定，无法踢人' : '识别本周星数，踢掉最低星队员，踢出后可手动点击补齐凑星补充替补'">
        换最低星
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
          <span class="status-label">还需</span>
          <span class="status-value" :class="teamTotalStars >= targetStars ? 'star-enough' : 'star-lack'">{{ Math.max(targetStars - teamTotalStars, 0) }}</span>
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
          :class="{ captain: isTeamCaptain(member), prepared: isMemberPrepared(member), locked: teamLocked }"
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
            <n-button v-if="!isMemberPrepared(member)" size="tiny" type="success" :loading="preparingRoleId === String(member.roleId)" @click="prepareSingleMember(member)" title="单独让该成员执行准备（仅限本地账号）">准备</n-button>
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

// 星数键前缀，用于 Fallback 匹配
const STAR_KEY_PREFIX = 'nmExtStarCnt_';
let _starKeyMismatchLogged = false;

/**
 * 从成员的 extParam 中获取星数
 * 优先使用精确键 nmExtStarCnt_yymmdd
 * 仅当本周键不存在时才 fallback 到其他周键（兼容服务端日期差异）
 * 本周键存在但值为 0 时直接返回 0（新的一周尚未打星）
 */
const getMemberStarCount = (member) => {
  if (!member) return 0;
  const ext = member.extParam;
  if (!ext || typeof ext !== 'object') return 0;
  // 精确匹配
  const starKey = getStarKey();
  const hasCurrentKey = starKey in ext;
  const exact = Number(ext[starKey]) || 0;
  if (hasCurrentKey) return exact; // 本周键存在，直接返回（含 0）
  // Fallback：仅当本周键不存在时，搜索其他 nmExtStarCnt_ 前缀的键（兼容服务端日期差异）
  for (const key of Object.keys(ext)) {
    if (key.startsWith(STAR_KEY_PREFIX) && key !== starKey) {
      const val = Number(ext[key]) || 0;
      if (val > 0) {
        if (!_starKeyMismatchLogged) {
          _starKeyMismatchLogged = true;
          console.warn(`[StarTeam] 星数键不匹配: 预期 ${starKey}, 实际 ${key}, 值 ${val}`, 'extParam keys:', Object.keys(ext).filter(k => k.startsWith(STAR_KEY_PREFIX)));
        }
        return val;
      }
    }
  }
  return 0;
};

// 从 matchteam_getroleteaminfo 响应中查找星级队伍 teamId
const findStarTeamId = (roleTeamRes) => {
  const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
  // 优先从 gDMTData 中找 teamCfgId=7 的星级队伍
  for (const key of Object.keys(gDMTData)) {
    const td = gDMTData[key];
    if (td?.teamCfgId === 7 && td?.teamId) return td.teamId;
  }
  // 兼容路径
  if (roleTeamRes?.teamInfo?.teamCfgId === 7) return roleTeamRes.teamInfo.teamId;
  if (roleTeamRes?.roleMTData?.teamInfo?.teamCfgId === 7) return roleTeamRes.roleMTData.teamInfo.teamId;
  return null;
};

// 智能转换 teamId：纯数字转 Number，带字母前缀的保持 String
const toTeamIdParam = (id) => {
  if (id === null || id === undefined || id === '') return id;
  const str = String(id);
  return /^\d+$/.test(str) ? Number(str) : str;
};

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
      // 持久化队伍完整成员缓存（含外部成员），避免重新打开后汇总中外部成员丢失
      teamDetails: Array.from(teamDetailsCache.value.entries()),
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
      // 不再恢复队长，用户需手动选择
      // if (data.captainId) captainTokenId.value = data.captainId;
      // if (data.captainRId) captainRoleId.value = data.captainRId;
      if (data.targetStars) targetStars.value = data.targetStars;
      // 恢复队伍完整成员缓存（含外部成员）
      if (Array.isArray(data.teamDetails)) {
        teamDetailsCache.value = new Map(data.teamDetails);
      }
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

// 不再自动选中队长，用户需手动选择
// watch(() => tokenStore.selectedTokenId, (v) => {
//   if (!captainTokenId.value && v) captainTokenId.value = v;
// });

const switchCaptain = async (newId) => {
  if (newId === captainTokenId.value) return;
  // 清空队长（点击清除按钮）
  if (!newId) {
    captainTokenId.value = "";
    teamId.value = "";
    teamMembers.value = [];
    captainRoleId.value = "";
    teamLeaderId.value = "";
    teamLocked.value = false;
    addLog("队长已清空，请重新选择");
    return;
  }
  captainTokenId.value = newId;
  teamId.value = "";
  teamMembers.value = [];
  captainRoleId.value = "";
  teamLeaderId.value = "";
  teamLocked.value = false;
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

// 点击队伍状态汇总中的队长名称，切换为该队队长并打开该队伍
const openTeamCaptain = async (team) => {
  // 优先从队伍成员中找队长的本地 tokenId，找不到再从扫描数据兜底
  const leader = (team.members || []).find((m) => m.isLeader);
  const tid = leader?.tokenId
    || accountStarData.value.find((a) => a.isLeader && String(a.teamId || '') === String(team.teamId))?.tokenId;
  if (!tid) {
    message.warning(`${team.captainName} 不是本地账号，无法打开该队长`);
    return;
  }
  if (tid === captainTokenId.value) {
    message.info("该队长已是当前队长");
    return;
  }
  addLog(`打开队伍 ${team.teamId} 的队长 [${team.captainName}]...`);
  await switchCaptain(tid);
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
  try { const result = await actionFn(tid); return result !== false; }
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
  const filtered = accountStarData.value.filter((a) => {
    // 星数不达标的不显示
    if (a.starCount < MIN_DISPLAY_STARS) return false;
    // 无队伍的显示
    if (!a.hasTeam || !a.teamId) return true;
    // 当前队伍成员显示（方便查看状态）；队伍已录用锁定（组完）或已切到其他队伍后不再显示
    if (a.inCurrentTeam && String(a.teamId) === String(teamId.value) && !teamLocked.value) return true;
    // 其他有队伍的账号不显示（已在其他队伍中）
    return false;
  });

  // 排序优先级：无队伍 > 当前队伍 > 有队伍未完成
  const getOrder = (acc) => {
    if (!acc.hasTeam) return 0;
    if (acc.inCurrentTeam) return 1;
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
      const tid = String(acc.teamId); // 统一为字符串，避免 Number/String 混用导致同队被拆成两条
      if (!teamMap.has(tid)) {
        teamMap.set(tid, {
          teamId: acc.teamId,
          captainName: acc.teamCaptainName || acc.name,
          members: [],
          totalStars: acc.teamTotalStars || 0,
          memberCount: acc.teamMemberCount || 0,
          allLocked: (String(acc.teamId) === String(teamId.value) && teamLocked.value) || acc.teamAllLocked || false,
        });
      }
      const team = teamMap.get(tid);
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
  // 兼容多种字段路径
  const lt = m.lockedTime || m.lockTime || m.locked || 0;
  if (!lt || lt <= 0) return false;
  // 兼容秒级/毫秒级时间戳
  const lockedMs = lt > 1e12 ? lt : lt * 1000;
  return lockedMs >= getWeekStartMs();
};

// 辅助函数：检测成员是否已录用（本周内）
const isMemberHired = (m) => isLockedThisWeek(m);

// 所有队伍汇总（包含未完成的）
const allTeamsSummary = computed(() => {
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
      const stars = getMemberStarCount(m);
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
    const allLocked = teamLocked.value || (nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek));
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
        const stars = getMemberStarCount(m);
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
// prepared 是时间戳，队伍跨周保留会残留上周的准备时间，必须在本周起始之后才算本周已准备
const isMemberPrepared = (m) => {
  const pt = m.prepared;
  if (typeof pt !== 'number') return !!pt;
  if (pt <= 0) return false;
  // 兼容秒级/毫秒级时间戳
  const preparedMs = pt > 1e12 ? pt : pt * 1000;
  return preparedMs >= getWeekStartMs();
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
  return teamMembers.value.reduce((sum, m) => sum + getMemberStarCount(m), 0);
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
      stars: getMemberStarCount(m),
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

  // ====== 扫描前确保队长队伍信息已加载 ======
  if (captainTokenId.value && !teamId.value) {
    addLog("队长已选择但队伍信息未加载，尝试获取...");
    try {
      const connected = await ensureConnected(captainTokenId.value);
      if (connected) {
        if (!captainRoleId.value) {
          const roleInfo = await tokenStore.sendMessageWithPromise(captainTokenId.value, "role_getroleinfo", {}, 8000);
          const roleId = roleInfo?.role?.roleId;
          if (roleId) captainRoleId.value = String(roleId);
        }
        if (captainRoleId.value) {
          await checkExistingTeam();
        }
      }
    } catch (err) {
      addLog(`获取队长队伍信息失败: ${err.message || err}`, "warning");
    }
  }
  // 缓存当前队伍成员 roleId 集合，用于扫描后校正
  const captainTeamMemberRoleIds = new Set(
    teamMembers.value.map((m) => String(m.roleId || '')).filter(Boolean)
  );
  if (captainTeamMemberRoleIds.size > 0) {
    addLog(`当前队伍 ${teamId.value} 有 ${captainTeamMemberRoleIds.size} 名成员，扫描时将自动排除`);
  }

  // 扫描单个账号（并发安全）
  const scanOne = async (token, idx) => {
    const name = token.name || token.id.slice(0, 8);
    const progress = `[${idx + 1}/${tokens.length}]`;
    const result = {
      tokenId: token.id, name, server: token.server || "?",
      starCount: 0, hasTeam: false, teamId: null, roleId: null,
      inCurrentTeam: false, isLeader: false, teamCaptainName: '',
      teamMemberCount: 0, teamAllLocked: false, teamTotalStars: 0,
      hasTeamStarData: false, // 是否从队伍数据中获取到本周围星
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
      const existingTeamId = findStarTeamId(roleTeamRes);
      const hasTeam = !!existingTeamId;

      result.hasTeam = hasTeam;
      result.teamId = existingTeamId;

      if (existingTeamId) {
        const tid = String(existingTeamId);
        // 复用缓存的队伍信息
        if (!teamInfoCache.has(tid)) {
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              token.id, "matchteam_getteaminfo", { teamId: toTeamIdParam(existingTeamId) }, 8000
            );
            const teamInfo = teamInfoRes?.teamInfo || {};
            const detail = {
              fightRoleBase: teamInfo.fightRoleBase || [],
              leaderId: teamInfo.leaderId,
            };
            teamInfoCache.set(tid, detail);
            // 保存到全局队伍详情缓存，供汇总使用
            teamDetailsCache.value.set(tid, detail);
            // 调试：输出首个成员的 extParam 结构，排查星数为0的问题
            if (detail.fightRoleBase.length > 0) {
              const fm = detail.fightRoleBase[0];
              const extKeys = fm.extParam && typeof fm.extParam === 'object'
                ? Object.keys(fm.extParam).filter(k => k.startsWith(STAR_KEY_PREFIX))
                : [];
              console.log(`[StarTeam] 队伍 ${tid} 首个成员 extParam: type=${typeof fm.extParam}, starKeys=[${extKeys.join(',')}], expectedKey=${getStarKey()}`);
            }
          } catch { teamInfoCache.set(tid, null); }
        }

        const cached = teamInfoCache.get(tid);
        if (cached) {
          const { fightRoleBase, leaderId } = cached;
          result.teamMemberCount = fightRoleBase.length;
          const leaderMember = fightRoleBase.find((m) => String(m.roleId) === String(leaderId));
          result.teamCaptainName = leaderMember?.name || '';
          for (const m of fightRoleBase) {
            result.teamTotalStars += getMemberStarCount(m);
          }
          const nonCapMembers = fightRoleBase.filter((m) => String(m.roleId) !== String(leaderId));
          // 判断录用状态：lockedTime 必须在本周起始时间之后才算本周有效录用
          result.teamAllLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
          if (leaderId && String(leaderId) === String(roleId)) {
            result.isLeader = true;
            foundLeaderTokenId = token.id;
          }
          const self = fightRoleBase.find((m) => String(m.roleId) === String(roleId));
          if (self) {
            result.starCount = getMemberStarCount(self);
            // 记录该账号队伍数据中是否包含本周围星
            result.hasTeamStarData = result.starCount > 0 || 
              Object.values(self.extParam || {}).some(v => v !== undefined && v !== null && v !== 0);
          }
                  
          // 过期旧队伍检测（仅警告，不自动解散）
          // 判定依据：队伍总星数为 0 + 无人本周录用 → 可能是上周残留队伍
          if (result.teamTotalStars === 0 && !result.teamAllLocked && nonCapMembers.length > 0) {
            addLog(`${progress} ${name} - 队伍 ${tid} 可能已过期（总星数0且无本周录用），建议手动解散`, "warning");
          }
        }
      }

      // 统一星数 Fallback：如果从队伍数据中未获取到星数
      // ⚠️ 注意：nmext_getinfo 返回的是累计星数，不是本周剩余次数
      // 因此只有在明确知道该账号有本周星数时才使用此方法
      if (!result.starCount && !result.hasTeamStarData) {
        try {
          const nmextRes = await tokenStore.sendMessageWithPromise(token.id, "nmext_getinfo", {}, 8000);
          const nmextData = nmextRes?.roleNMExt || nmextRes?.body?.roleNMExt || nmextRes;
                
          // 仅在队伍数据为空且无有效 extParam 时，才使用累计星数作为参考
          if (nmextData?.starBossCompleteMap) {
            let total = 0;
            for (const stars of Object.values(nmextData.starBossCompleteMap)) {
              if (Array.isArray(stars)) total += stars.filter(Boolean).length;
              else if (typeof stars === 'object') total += Object.values(stars).filter(Boolean).length;
            }
            // 警告用户使用的是累计星数
            if (total > 0) {
              console.warn(`[StarTeam] ${name} 队伍 extParam 无效，fallback 使用累计星数：${total}`);
              result.starCount = total;
            }
          }
          if (!result.starCount) {
            console.warn(`[StarTeam] Fallback nmext_getinfo 未获取到星数，nmextRes keys:`, Object.keys(nmextRes || {}),
              'roleNMExt keys:', Object.keys(nmextData || {}));
          }
        } catch (e) {
          console.warn(`[StarTeam] Fallback nmext_getinfo 异常:`, e.message);
        }
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

  // ====== 扫描后二次校正：用 teamMembers 的 roleId 匹配，确保队伍成员被正确标记 ======
  if (captainTeamMemberRoleIds.size > 0) {
    let correctedCount = 0;
    for (const acc of accountStarData.value) {
      if (acc.roleId && captainTeamMemberRoleIds.has(String(acc.roleId)) && !acc.inCurrentTeam) {
        acc.inCurrentTeam = true;
        acc.hasTeam = true;
        if (!acc.teamId) acc.teamId = teamId.value;
        correctedCount++;
      }
    }
    if (correctedCount > 0) {
      addLog(`二次校正: ${correctedCount} 个账号被标记为当前队伍成员`, "info");
    }
  }

  // 自动选择队长
  if (!captainTokenId.value && foundLeaderTokenId) {
    captainTokenId.value = foundLeaderTokenId;
    const captainAcc = accountStarData.value.find((a) => a.tokenId === foundLeaderTokenId);
    captainRoleId.value = captainAcc?.roleId || "";
    addLog(`自动设置队长: ${captainAcc?.name}（已有星级队伍的队长）`, "success");
    if (captainAcc?.teamId) {
      teamId.value = String(captainAcc.teamId);
      teamLocked.value = false; // 重置锁定状态，由 refreshTeam 重新检测
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
      const existingTeamId = findStarTeamId(roleTeamRes);
      const hasTeam = !!existingTeamId;

      // 重置字段
      acc.hasTeam = hasTeam;
      acc.teamId = existingTeamId;
      acc.isLeader = false;
      acc.teamCaptainName = '';
      acc.teamMemberCount = 0;
      acc.teamTotalStars = 0;
      acc.starCount = 0;
      acc.hasTeamStarData = false; // 是否从队伍数据中获取到本周围星

      if (existingTeamId) {
        const tid = String(existingTeamId);
        // 复用缓存：同一队伍不重复查询
        if (!teamInfoCache.has(tid)) {
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              acc.tokenId, "matchteam_getteaminfo", { teamId: toTeamIdParam(existingTeamId) }, 6000
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
            acc.teamTotalStars += getMemberStarCount(m);
          }
          const nonCapMembers = fightRoleBase.filter((m) => String(m.roleId) !== String(leaderId));
          // 判断录用状态：lockedTime 必须在本周起始时间之后才算本周有效录用
          acc.teamAllLocked = false; // 先重置，后面会根据实际数据重新计算
          acc.teamAllLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
        
          // 获取自身星数
          const self = fightRoleBase.find((m) => String(m.roleId) === String(roleId));
          if (self) {
            acc.starCount = getMemberStarCount(self);
            // 记录该账号队伍数据中是否包含本周围星
            acc.hasTeamStarData = acc.starCount > 0 || 
              Object.values(self.extParam || {}).some(v => v !== undefined && v !== null && v !== 0);
          }
        
          // 过期旧队伍检测（仅警告，不自动解散）
          if (acc.teamTotalStars === 0 && !acc.teamAllLocked && nonCapMembers.length > 0) {
            addLog(`${progress} ${acc.name} - 队伍 ${tid} 可能已过期（总星数0且无本周录用），建议手动解散`, "warning");
          }
        }
        
        const lockStatus = acc.teamAllLocked ? '✅录用' : '❌未录用';
        const leaderTag = acc.isLeader ? '👑队长' : '队员';
        addLog(`${progress} ${acc.name} - ${acc.teamCaptainName}队 ${acc.teamMemberCount}人 ${acc.teamTotalStars}星 ${lockStatus} ${leaderTag}`, "success");
        teamCount++;
      } else {
        acc.teamAllLocked = false; // 无队伍，重置锁定状态
        addLog(`${progress} ${acc.name} - 无队伍`, "info");
        noTeamCount++;
      }

      // 统一星数 Fallback：如果从队伍数据中未获取到星数
      // ⚠️ 注意：nmext_getinfo 返回的是累计星数，不是本周剩余次数
      if (!acc.starCount && !acc.hasTeamStarData) {
        try {
          const nmextRes = await tokenStore.sendMessageWithPromise(acc.tokenId, "nmext_getinfo", {}, 6000);
          const nmextData = nmextRes?.roleNMExt || nmextRes?.body?.roleNMExt || nmextRes;
          // 仅在队伍数据为空且无有效 extParam 时，才使用累计星数作为参考
          if (nmextData?.starBossCompleteMap) {
            let total = 0;
            for (const stars of Object.values(nmextData.starBossCompleteMap)) {
              if (Array.isArray(stars)) total += stars.filter(Boolean).length;
              else if (typeof stars === 'object') total += Object.values(stars).filter(Boolean).length;
            }
            if (total > 0) {
              console.warn(`[StarTeam] ${acc.name} 队伍 extParam 无效，fallback 使用累计星数：${total}`);
              acc.starCount = total;
            }
          }
        } catch {}
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
            captainTokenId.value, "matchteam_getteaminfo", { teamId: toTeamIdParam(teamId.value) }, 8000
          );
          if (resp?.teamInfo?.fightRoleBase && resp.teamInfo.fightRoleBase.length > 0) {
            teamMembers.value = resp.teamInfo.fightRoleBase;
            if (resp.teamInfo.leaderId) teamLeaderId.value = String(resp.teamInfo.leaderId);
            addLog(`队伍成员已更新: ${teamMembers.value.length} 人`, "success");
            // 检测队伍锁定状态
            const isTeamLevelLocked = !!(
              resp?.teamInfo?.lock || resp?.teamInfo?.locked ||
              resp?.teamInfo?.isLock
            );
            const nonCapMembers = teamMembers.value.filter(
              (m) => String(m.roleId) !== String(teamLeaderId.value || captainRoleId.value)
            );
            const allMembersLocked = nonCapMembers.length > 0 && nonCapMembers.every(isLockedThisWeek);
            teamLocked.value = teamLocked.value || isTeamLevelLocked || allMembersLocked;
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

  // 队长包含在可用成员中，由新算法在内部处理队长分配

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
  if (!captainTokenId.value) {
    message.warning("请先选择队长");
    return;
  }
  // 检查当前队伍是否已锁定
  if (teamId.value && teamLocked.value) {
    addLog("当前队伍已录用锁定，无法自动凑队", "warning");
    message.warning("当前队伍已录用锁定，请先解散或创建新队伍后再凑队");
    return;
  }
  if (isScanning.value) {
    message.warning("正在扫描中，请等待完成");
    return;
  }

  addLog("======= 全部凑队开始 =======", "success");

  // 自动选择所有可用账号
  const allAccounts = accountStarData.value;
  const available = allAccounts
    .filter(a => a.starCount > 0 && !a.inCurrentTeam && (!a.hasTeam || !a.teamAllLocked))
    .sort((a, b) => b.starCount - a.starCount);

  if (available.length < 2) {
    addLog("可用账号不足2人，无法凑队", "warning");
    message.warning("可用账号不足");
    return;
  }

  isFullAutoBuilding.value = true;
  try {
    // 计算队伍计划
    const { plans, insufficient, unassignedCount } = calculateTeamPlans();

    if (plans.length === 0) {
      if (insufficient) {
        addLog(`成员不足以凑满队伍（剩余${unassignedCount}人），发送频道广播招募...`, "warning");
        await sendChannelBroadcast();
      } else {
        addLog("无法计算出有效的队伍计划", "warning");
      }
      return;
    }

    addLog(`计划创建 ${plans.length} 支队伍`, "success");
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const tag = p.skip ? ' [跳过]' : (p.needsRecruit ? ' [需招募]' : '');
      addLog(`第${i+1}队${tag}: ${p.members.map(m => m.name).join(', ')} (${p.members.length}人) 总星数${p.totalStars} 目标${p.targetStar}星`);
    }

    // 保存计划并执行第一队
    pendingTeamPlans.value = plans.slice(1);
    await executeTeamPlan(plans[0], 1, plans.length);
  } catch (err) {
    addLog(`全部凑队失败: ${err.message || err}`, "error");
    message.error(`全部凑队失败: ${err.message || err}`);
  } finally {
    isFullAutoBuilding.value = false;
  }
};

// 执行单队计划
const executeTeamPlan = async (plan, index = 1, total = 1) => {
  addLog(`\n====== 第 ${index}/${total} 队 (${plan.targetStar}星目标, ${plan.totalStars}星实际, ${plan.members.length}人) ======`, "info");

  const memberCount = plan.members.length;

  // 人数不足3人，跳过
  if (plan.skip || memberCount < 3) {
    addLog(`第${index}队仅有 ${memberCount} 人，人员不足无法组队，跳过`, "warning");
    message.warning(`第${index}队人员不足（${memberCount}人），无法组队`);
    return;
  }

  // 设置队长和成员
  captainTokenId.value = plan.members[0].tokenId;
  selectedAccountIds.value = plan.members.map(m => m.tokenId);

  const captainName = plan.members[0].name || '未知';

  // 3-4人：创建队伍 + 加入准备 + 频道广播招募（不锁定）
  if (plan.needsRecruit || (memberCount >= 3 && memberCount < 5)) {
    addLog(`第${index}队有 ${memberCount} 人（不足5人），队长: ${captainName}，先创建队伍再频道广播招募...`, "info");
    await createTeam();
    if (!teamId.value) {
      addLog(`第${index}队创建失败`, "error");
      return;
    }
    addLog(`第${index}队创建成功: ${teamId.value}`, "success");
    // 发送频道广播招募
    await sendChannelBroadcast();
    addLog(`第${index}队已创建并广播招募，等待人数补足后手动锁定`, "success");
    message.success(`第${index}队已创建并广播招募，请等待人员加入后手动锁定`);
    return;
  }

  // 5人：正常完整流程
  addLog(`创建第${index}队, 队长: ${captainName}（${memberCount}人满编）...`);
  await createTeam();
  if (!teamId.value) {
    addLog(`第${index}队创建失败`, "error");
    return;
  }
  addLog(`第${index}队创建成功: ${teamId.value}`, "success");

  // 不自动锁定，等待手动确认
  addLog(`第${index}队已创建并加入完成，请在队伍准备好后手动点击"录用锁定"按钮`, "info");
  message.info(`第${index}队已创建完成，请手动点击"录用锁定"`);

  if (pendingTeamPlans.value.length > 0) {
    addLog(`可点击"下一队"继续（剩余 ${pendingTeamPlans.value.length} 队）`, "info");
    message.info(`可点击"下一队"继续`);
  } else {
    addLog(`第${index}队是最后一队`, "success");
    message.success(`全部队伍已处理完毕`);
  }
};

// 计算队伍分配方案：高星优先，优先凑90星，降级凑75星
const calculateTeamPlans = () => {
  const available = accountStarData.value
    .filter(a => a.starCount > 0 && !a.inCurrentTeam && (!a.hasTeam || !a.teamAllLocked))
    .sort((a, b) => b.starCount - a.starCount);

  if (available.length < 2) {
    return { plans: [], insufficient: true, unassignedCount: available.length };
  }

  const plans = [];
  const usedIds = new Set();
  let targetStar = 90;

  while (true) {
    const remaining = available.filter(acc => !usedIds.has(acc.tokenId));
    if (remaining.length < 2) break;

    const teamMembers = [];
    let totalStars = 0;

    for (const acc of remaining) {
      if (teamMembers.length >= 5) break;
      teamMembers.push(acc);
      totalStars += acc.starCount;
      if (totalStars >= targetStar && teamMembers.length >= 2) break;
    }

    if (totalStars >= targetStar && teamMembers.length >= 2) {
      for (const m of teamMembers) usedIds.add(m.tokenId);
      plans.push({
        members: teamMembers,
        totalStars,
        targetStar,
        captain: teamMembers[0],
        needsRecruit: teamMembers.length < 5 && teamMembers.length >= 3, // 3-4人需要招募
        skip: teamMembers.length < 3, // 不足3人跳过
      });
      continue;
    }

    // 未达标，降级
    if (targetStar === 90) {
      targetStar = 75;
      continue;
    }
    break;
  }

  const unassigned = available.filter(acc => !usedIds.has(acc.tokenId));
  return { plans, insufficient: unassigned.length > 0 && plans.length === 0, unassignedCount: unassigned.length };
};

// 继续下一队（全部凑队后续队伍）
const continueNextTeam = async () => {
  if (!teamLocked.value) {
    // 不强制阻断，仅提示警告
    addLog("当前队伍尚未录用锁定，将直接继续下一队...", "warning");
    message.warning("当前队伍尚未录用锁定，请记得手动锁定！继续下一队...");
  }

  // 刷新已完成队伍成员的状态
  await refreshSelectedAccounts();

  if (pendingTeamPlans.value.length > 0) {
    const nextPlan = pendingTeamPlans.value.shift();
    // 计算总数 = 已完成数 + 当前 1 + 剩余
    const totalCount = completedTeams.value.length + 1 + pendingTeamPlans.value.length;
    const nextIndex = totalCount - pendingTeamPlans.value.length;
    
    addLog(`继续下一队（剩余 ${pendingTeamPlans.value.length + 1} 队）...`, "info");
    isFullAutoBuilding.value = true;
    try {
      await executeTeamPlan(nextPlan, nextIndex, totalCount);
    } finally {
      isFullAutoBuilding.value = false;
    }
  } else {
    // 无剩余计划，重新计算
    addLog("无剩余计划队伍，重新计算...", "info");
    // 当前队伍已锁定时先重置引用（锁定队伍保留），否则会被 fullAutoTeamBuilding 的锁定检查拦截
    if (teamId.value && teamLocked.value) {
      addLog("当前队伍已录用锁定（保留），重置引用后继续...", "info");
      teamId.value = "";
      teamMembers.value = [];
      teamLeaderId.value = "";
      teamLocked.value = false;
    }
    await fullAutoTeamBuilding();
  }
};

const toggleAccount = (id, val) => {
  if (val) {
    if (!selectedAccountIds.value.includes(id)) selectedAccountIds.value.push(id);
  } else {
    selectedAccountIds.value = selectedAccountIds.value.filter((x) => x !== id);
  }
  // 无进行中队伍（或旧队已锁定）时，勾选联动队长选择器：取勾选中第一个无队伍账号
  if (!teamId.value || teamLocked.value) {
    const firstAvailable = selectedAccountIds.value.find((sid) => {
      const acc = accountStarData.value.find((a) => a.tokenId === sid);
      return acc && (!acc.hasTeam || !acc.teamId);
    });
    if (firstAvailable && firstAvailable !== captainTokenId.value) {
      captainTokenId.value = firstAvailable;
      captainRoleId.value = ""; // 旧队长的 roleId 作废，创建时重新获取
      const accName = accountStarData.value.find((a) => a.tokenId === firstAvailable)?.name || '';
      addLog(`已根据勾选自动选择队长: ${accName}`, "info");
    }
  }
  saveScanData();
};

const selectAll = () => { selectedAccountIds.value = accountStarData.value.map((a) => a.tokenId); };
const clearSelection = () => { selectedAccountIds.value = []; };

// 从列表中移除单个账号
const removeAccount = (tokenId) => {
  const acc = accountStarData.value.find((a) => a.tokenId === tokenId);
  if (!acc) return;
  accountStarData.value = accountStarData.value.filter((a) => a.tokenId !== tokenId);
  selectedAccountIds.value = selectedAccountIds.value.filter((id) => id !== tokenId);
  addLog(`已从列表移除: ${acc.name}`, "info");
};

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
const isReplacing = ref(false);

const getMemberStars = (member) => {
  return getMemberStarCount(member);
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
    const existingTeamId = findStarTeamId(roleTeamRes);
    if (existingTeamId) {
      // 尝试获取队伍详情，判断当前账号是否为队长
      try {
        const teamInfoRes = await tokenStore.sendMessageWithPromise(
          captainTokenId.value, "matchteam_getteaminfo",
          { teamId: toTeamIdParam(existingTeamId) }, 8000
        );
        const leaderId = teamInfoRes?.teamInfo?.leaderId;

        if (leaderId && String(leaderId) === String(captainRoleId.value)) {
          // 当前账号是队长，正常设置队伍
          teamId.value = String(existingTeamId);
          teamLocked.value = false; // 重置锁定状态，由 refreshTeam 重新检测
          addLog(`发现已有星级队伍: ${existingTeamId}（当前账号为队长）`, "success");
          await refreshTeam();
        } else {
          // 当前账号是队员，不是队长
          addLog(`账号所在队伍 ${existingTeamId} 的队长非当前账号，请选择队长账号进行操作`, "warning");
          message.warning("所选账号是队员而非队长，请选择队长账号来管理队伍");
          // 不设置 teamId，避免按钮被禁用
          // 但记录该账号的队伍信息供显示
          const acc = accountStarData.value.find((a) => a.tokenId === captainTokenId.value);
          if (acc) {
            acc.hasTeam = true;
            acc.teamId = String(existingTeamId);
            acc.inCurrentTeam = false; // 不是"当前管理的队伍"
          }
        }
      } catch (teamErr) {
        // 获取队伍详情失败，可能也是权限问题
        addLog(`获取队伍 ${existingTeamId} 详情失败: ${teamErr?.message || teamErr}，请确认选择的账号是队长`, "warning");
        message.warning("无法获取队伍详情，请确认选择的是队长账号");
      }
    }
  } catch (err) {
    addLog(`检查已有队伍失败: ${err.message || err}`, "warning");
  }
};

// 创建队伍
const createTeam = async () => {
  // 先清理勾选中已在队伍的残留账号（组完队后列表隐藏但勾选记录还在，会导致误选队长报 7100020）
  const availableIds = selectedAccountIds.value.filter((id) => {
    const acc = accountStarData.value.find((a) => a.tokenId === id);
    return acc && (!acc.hasTeam || !acc.teamId);
  });
  if (availableIds.length !== selectedAccountIds.value.length) {
    addLog(`已自动剔除 ${selectedAccountIds.value.length - availableIds.length} 个已在队伍中的残留勾选账号`, "warning");
    selectedAccountIds.value = availableIds;
    saveScanData();
  }

  // 使用已选账号的第一个作为队长，如果没有则用顶部选择器
  const createCaptainId = availableIds.length > 0
    ? availableIds[0]
    : captainTokenId.value;
  if (!createCaptainId) { message.warning("请先选择队长或勾选可用账号"); return; }

  // 更新顶部队长选择器为当前创建队长
  captainTokenId.value = createCaptainId;
  const captainName = accountStarData.value.find((a) => a.tokenId === createCaptainId)?.name || '未知';
  addLog(`队长: ${captainName}`, "info");

  isCreating.value = true;

  // 检查是否已有旧队伍
  if (teamId.value) {
    addLog(`检测到已有队伍 ${teamId.value}，检查是否需要处理...`, "info");
    try {
      const connected = await ensureConnected(captainTokenId.value);
      if (connected) {
        await refreshTeam();
        if (teamLocked.value) {
          // 旧队伍已录用锁定（已完成），只需重置当前引用即可
          addLog("旧队伍已录用锁定（保留），切换到新队伍创建...", "info");
          teamId.value = "";
          teamMembers.value = [];
          teamLeaderId.value = "";
          // teamLocked 延迟到 matchteam_create 成功后重置，避免失败时锁定信息丢失
          // 保留旧队伍的 teamDetailsCache，队伍状态汇总仍需展示其完整成员（含外部成员）
        } else {
          // 旧队伍未锁定，可能是中断的残留，解散它
          addLog("旧队伍未锁定（残留），自动解散...", "warning");
          const keepSelection = [...selectedAccountIds.value]; // dismissTeam 会清空勾选，先保存
          await dismissTeam();
          selectedAccountIds.value = keepSelection; // 恢复勾选，保证创建后自动加入
          await delay(500);
        }
      }
    } catch (err) {
      addLog(`检查旧队伍失败: ${err.message || err}，继续创建新队伍`, "warning");
      // 强制清空状态继续
      teamId.value = "";
      teamMembers.value = [];
      teamLeaderId.value = "";
      teamLocked.value = false;
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
      // 新队伍创建成功，重置旧队伍的锁定状态（延迟重置，避免创建失败时丢失）
      teamLocked.value = false;
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
  try {
    // 加入前先刷新队伍获取最新成员 roleId 列表
    await refreshTeam();
    if (teamMembers.value.length === 0) {
      addLog("刷新队伍信息失败，将使用缓存数据判断成员状态（可能导致重复加入）", "warning");
    }
    const currentRoleIds = new Set(
      teamMembers.value.map((m) => String(m.roleId)).filter(Boolean)
    );

    // 过滤：排除队长，最多 4 个队员
    const memberIds = selectedAccountIds.value
      .filter((id) => id !== captainTokenId.value)
      .slice(0, 4);

    if (memberIds.length === 0) {
      addLog("没有需要新加入的队员（仅有队长）", "info");
      return;
    }

    addLog(`开始加入并准备，共 ${memberIds.length} 名队友...`);
    let joinedCount = 0, skippedCount = 0;

    for (const tid of memberIds) {
      const token = tokenStore.gameTokens.find((t) => t.id === tid);
      const name = token?.name || tid.slice(0, 8);
      const acc = accountStarData.value.find((a) => a.tokenId === tid);
      const accRoleId = acc?.roleId;

      // 精准判断：如果该成员 roleId 已在队伍中，跳过加入直接准备
      // 兜底：若 roleId 匹配失败，通过 name+serverId 在 teamMembers 中匹配
      let alreadyInTeam = false;
      let resolvedRoleId = accRoleId ? String(accRoleId) : null;
      
      if (accRoleId && currentRoleIds.has(String(accRoleId))) {
        alreadyInTeam = true;
      } else {
        // roleId 匹配失败或为空，通过 name+server 兜底匹配
        const tokenServer = String(token?.server || '');
        const matchedMember = teamMembers.value.find((tm) => {
          return tm.name === name && String(tm.serverId || '') === tokenServer;
        });
        if (matchedMember && matchedMember.roleId) {
          resolvedRoleId = String(matchedMember.roleId);
          alreadyInTeam = currentRoleIds.has(resolvedRoleId);
        }
      }

      const success = await connectAndDo(tid, name, async (tokenId) => {
        // 第一步：检查账号是否已经在其他房间（需要有效的 roleId）
        if (resolvedRoleId) {
          try {
            const checkRes = await tokenStore.sendMessageWithPromise(tokenId, "matchteam_getroleteaminfo", { roleID: Number(resolvedRoleId) }, 5000);
            // 响应结构为 roleMTData.gDMTData，用 findStarTeamId 解析（原 teamInfo 路径永远为空，检查失效）
            const otherTeamId = findStarTeamId(checkRes);
            if (otherTeamId && String(otherTeamId) !== String(teamId.value)) {
              addLog(`[${name}] 已在其他队伍 (${otherTeamId})，无法加入`, "error");
              return false;
            }
          } catch (checkErr) {
            console.warn(`[${name}] 队伍检查失败:`, checkErr.message);
          }
        }
        
        // 第二步：加入队伍（如果不是已组队成员）
        if (!alreadyInTeam) {
          addLog(`[${name}] 加入队伍 (matchteam_join)...`);
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "matchteam_join",
              { teamId: toTeamIdParam(teamId.value) }, 10000
            );
          } catch (joinErr) {
            const errCode = joinErr?.code || joinErr?.errCode || joinErr?.errorCode;
            const errMsg = String(joinErr?.message || joinErr || '');
            if (errCode === 200020 || errMsg.includes('200020')) {
              addLog(`[${name}] 已在队伍中（200020），跳过加入`, "info");
              alreadyInTeam = true; // 纠正：实际已在队伍中
            } else if (errMsg.includes('7100022') || errMsg.includes('已加入其他房间')) {
              addLog(`[${name}] 已在其他房间 (${errMsg})，无法加入`, "error");
              return false;
            } else {
              throw joinErr;
            }
          }
          await delay(800);
          
          // 加入后验证：刷新队伍确认成员真正入队
          if (!alreadyInTeam) {
            try {
              const verifyRes = await tokenStore.sendMessageWithPromise(
                captainTokenId.value, "matchteam_getteaminfo",
                { teamId: toTeamIdParam(teamId.value) }, 8000
              );
              const verifyMembers = verifyRes?.teamInfo?.fightRoleBase || [];
              const verifyRoleIds = new Set(verifyMembers.map((m) => String(m.roleId || '')));
              const myRoleId = resolvedRoleId || (acc?.roleId ? String(acc.roleId) : '');
              const actuallyJoined = myRoleId ? verifyRoleIds.has(myRoleId) : verifyMembers.some((m) => m.name === name);
              if (!actuallyJoined) {
                addLog(`[${name}] 加入后验证失败：成员未出现在队伍中`, "error");
                return false;
              }
              addLog(`[${name}] 加入验证通过`, "info");
            } catch (verifyErr) {
              console.warn(`[${name}] 加入验证失败:`, verifyErr.message);
            }
          }
        } else {
          addLog(`[${name}] 已在队伍中，跳过加入和准备`, "info");
          skippedCount++;
          return true; // 已在队伍中的成员直接返回成功，不再重复准备
        }

        // 第三步：尝试准备（最多重试 3 次）
        addLog(`[${name}] 准备 (matchteam_memberprepare)...`);
        let prepSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const prepResult = await tokenStore.sendMessageWithPromise(
              tokenId, "matchteam_memberprepare",
              { teamId: toTeamIdParam(teamId.value) }, 15000  // 延长超时至 15 秒
            );
                    
            // 分析返回值：可能有的格式
            const hasSuccessFlag = prepResult?.success === true || prepResult?.body?.success === true;
            const hasTeamId = !!prepResult?.teamId; // 兼容纯数字 teamId（原仅认 N 前缀会把准备成功误判为失败）
            const hasErrorCode = prepResult?.code !== undefined && prepResult.code !== null;
                    
            if (hasSuccessFlag || (hasTeamId && !hasErrorCode)) {
              prepSuccess = true;
              if (hasSuccessFlag) {
                addLog(`[${name}] 准备成功 (第${attempt}次尝试)`, "success");
              } else if (hasTeamId) {
                addLog(`[${name}] 准备成功 (收到 teamId=${prepResult.teamId}, 第${attempt}次尝试)`, "success");
              }
              break;
            }
                    
            if (attempt < 3) {
              const errorMsg = JSON.stringify(prepResult).slice(0, 100);
              addLog(`[${name}] 准备第${attempt}次返回异常结果 (${errorMsg})，重试中...`, "warning");
              await delay(1000);
            }
          } catch (prepErr) {
            const errMsg = prepErr?.message || prepErr || String(prepErr);
            // 已在队伍中的成员，prepare 报 7100054/7100150 通常表示已经准备好了，视为成功
            if (alreadyInTeam && (errMsg.includes('7100054') || errMsg.includes('7100150'))) {
              addLog(`[${name}] 已在队伍中，准备状态码 ${errMsg.includes('7100054') ? '7100054' : '7100150'}，视为已就绪`, "info");
              prepSuccess = true;
              break;
            }
            if (attempt < 3) {
              addLog(`[${name}] 准备第${attempt}次异常：${errMsg}, 重试中...`, "warning");
              await delay(1000);
            } else {
              addLog(`[${name}] 准备连续${attempt}次均失败：${errMsg}`, "error");
              break;
            }
          }
        }
                
        if (!prepSuccess) {
          addLog(`[${name}] 最终准备失败`, "error");
          return false;  // 准备失败也返回 false
        }
        
        return true;  // 全部成功
      });

      if (success) {
        addLog(`[${name}] 加入并准备成功！`, "success");
        joinedCount++;
        if (acc) {
          acc.inCurrentTeam = true;
          acc.hasTeam = true;
          acc.teamId = teamId.value;
        }
        // 更新 currentRoleIds 避免后续重复
        if (resolvedRoleId) currentRoleIds.add(resolvedRoleId);
      } else {
        addLog(`[${name}] 加入失败`, "error");
        if (acc) acc.inCurrentTeam = false;
      }
      // 断开队员连接释放资源
      if (tokenStore.getWebSocketStatus(tid) === "connected") {
        await disconnectToken(tid);
      }
      await delay(500);
    }

    const failedCount = memberIds.length - joinedCount;
    addLog(`加入并准备流程完成（成功：${joinedCount}, 跳过：${skippedCount}${failedCount > 0 ? `, 失败：${failedCount}` : ''}）`, failedCount > 0 ? "warning" : "success");
    if (failedCount > 0) {
      message.warning(`有 ${failedCount} 名成员加入或准备失败，请检查日志后重试`);
    }
    await refreshTeam();
    if (teamMembers.value.length >= 5) {
      addLog("队伍已满员，可以录用锁定", "success");
    } else {
      addLog("请手动点击「录用锁定」确认锁定队伍", "info");
    }
  } finally {
    isJoining.value = false;
  }
};

// 单个成员单独准备（仅限本地账号）
const preparingRoleId = ref(null);
const prepareSingleMember = async (member) => {
  if (!teamId.value || teamLocked.value || preparingRoleId.value) return;
  const rid = String(member.roleId || '');
  const name = member.name || `成员${rid.slice(-4)}`;
  // 通过 roleId 在扫描数据中找到对应 token，找不到再按 名称+区服 兜底
  const acc = accountStarData.value.find((a) => String(a.roleId || '') === rid);
  let tid = acc?.tokenId;
  if (!tid) {
    const t = tokenStore.gameTokens.find((x) => x.name === member.name && String(x.server || '') === String(member.serverId || ''));
    tid = t?.id;
  }
  if (!tid) {
    addLog(`[${name}] 非本地账号（外部成员），无法代为准备`, "error");
    message.warning(`${name} 不是本地账号，无法代为准备`);
    return;
  }
  preparingRoleId.value = rid;
  try {
    addLog(`[${name}] 单独准备 (matchteam_memberprepare)...`);
    const success = await connectAndDo(tid, name, async (tokenId) => {
      try {
        const prepResult = await tokenStore.sendMessageWithPromise(
          tokenId, "matchteam_memberprepare",
          { teamId: toTeamIdParam(teamId.value) }, 15000
        );
        const hasSuccessFlag = prepResult?.success === true || prepResult?.body?.success === true;
        const hasTeamId = !!prepResult?.teamId;
        const hasErrorCode = prepResult?.code !== undefined && prepResult.code !== null;
        if (hasSuccessFlag || (hasTeamId && !hasErrorCode)) return true;
        addLog(`[${name}] 准备返回异常结果: ${JSON.stringify(prepResult).slice(0, 100)}`, "error");
        return false;
      } catch (prepErr) {
        const errMsg = String(prepErr?.message || prepErr);
        // 7100054/7100150 通常表示已经准备好了，视为成功
        if (errMsg.includes('7100054') || errMsg.includes('7100150')) {
          addLog(`[${name}] 准备状态码 ${errMsg.includes('7100054') ? '7100054' : '7100150'}，视为已就绪`, "info");
          return true;
        }
        throw prepErr;
      }
    });
    if (success) {
      addLog(`[${name}] 单独准备成功`, "success");
    } else {
      addLog(`[${name}] 单独准备失败`, "error");
    }
    // 断开队员连接释放资源
    if (tokenStore.getWebSocketStatus(tid) === "connected") {
      await disconnectToken(tid);
    }
    await refreshTeam();
  } catch (err) {
    addLog(`[${name}] 单独准备失败: ${err.message || err}`, "error");
  } finally {
    preparingRoleId.value = null;
  }
};

// 全部准备：让队伍中所有未准备的本地账号成员依次执行准备（不含加入）
const isPreparingAll = ref(false);
const prepareAllMembers = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (teamLocked.value) { message.warning("队伍已录用锁定，无需准备"); return; }
  if (isPreparingAll.value) return;
  isPreparingAll.value = true;
  try {
    // 先刷新获取最新准备状态
    await refreshTeam();
    const captainRid = String(teamLeaderId.value || '');
    const pending = teamMembers.value.filter((m) => String(m.roleId) !== captainRid && !isMemberPrepared(m));
    if (pending.length === 0) {
      addLog("所有成员均已准备，无需操作", "info");
      return;
    }
    addLog(`开始全部准备，共 ${pending.length} 名未准备成员...`);
    for (const m of pending) {
      await prepareSingleMember(m);
      await delay(500);
    }
    addLog("全部准备流程完成", "success");
  } catch (err) {
    addLog(`全部准备失败: ${err.message || err}`, "error");
  } finally {
    isPreparingAll.value = false;
  }
};

// 补齐队伍内成员凑星后加入并准备
const prepareTeamMembersToTargetStars = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  
  // 先刷新队伍获取最新成员列表（包含外部成员）
  await refreshTeam();
  if (teamMembers.value.length === 0) {
    message.warning("队伍成员列表为空，请先刷新队伍");
    return;
  }
  
  // 以 teamMembers.value（服务端 fightRoleBase）为权威来源，包含所有外部成员
  const captainRoleId = String(teamLeaderId.value || '');
  const captainMember = teamMembers.value.find((m) => String(m.roleId) === captainRoleId);
  const otherMembers = teamMembers.value.filter((m) => String(m.roleId) !== captainRoleId);
  
  if (otherMembers.length === 0) {
    message.info("队伍中无其他成员，无需补齐");
    return;
  }
  
  // 为每个队伍成员匹配 accountStarData 获取 tokenId 和星数
  const scanByRoleId = new Map();
  for (const acc of accountStarData.value) {
    if (acc.roleId) scanByRoleId.set(String(acc.roleId), acc);
  }
  
  // 构建完整队伍成员列表（含外部成员）
  const allTeamMembersInfo = teamMembers.value.map((m) => {
    const rid = String(m.roleId || '');
    const matchedAcc = scanByRoleId.get(rid);
    const stars = matchedAcc?.starCount || getMemberStarCount(m);
    const isCap = rid === captainRoleId;
    return {
      roleId: rid,
      name: m.name || `成员${rid.slice(-4)}`,
      tokenId: matchedAcc?.tokenId || null,
      starCount: stars,
      isCaptain: isCap,
      fromScan: !!matchedAcc,
    };
  });
  
  const captainInfo = allTeamMembersInfo.find((m) => m.isCaptain);
  const otherMembersInfo = allTeamMembersInfo.filter((m) => !m.isCaptain);
  
  const externalCount = allTeamMembersInfo.filter((m) => !m.fromScan).length;
  const externalNames = allTeamMembersInfo.filter((m) => !m.fromScan).map((m) => m.name);
  
  addLog(`发现 ${allTeamMembersInfo.length} 名已组队成员（队长：${captainInfo?.name || '未知'}, 队员：${otherMembersInfo.map(m => m.name).join(', ')}）${externalCount > 0 ? `，其中 ${externalCount} 名外部成员（${externalNames.join(', ')}）` : ''}`);
  
  const target = targetStars.value;
  const MAX_TEAM = 5;
  
  // 步骤 1: 计算当前已组队成员的总星数和可用名额（包含外部成员）
  let currentSum = 0;
  let currentSlotCount = allTeamMembersInfo.length;
  for (const member of allTeamMembersInfo) {
    currentSum += member.starCount || 0;
  }
  
  addLog(`当前已组队：${currentSlotCount}人/${MAX_TEAM}人，总星数：${currentSum}/${target}`);
  
  // 步骤 2: 计算剩余需要的星数和名额
  let remainingSlots = Math.max(0, MAX_TEAM - currentSlotCount);
  let remainingStarsNeeded = Math.max(0, target - currentSum);
  
  addLog(`剩余名额：${remainingSlots}个，还需星数：${remainingStarsNeeded}星`);
  
  if (remainingSlots === 0) {
    message.info("队伍已满员");
    // 仍让现有扫描过的成员准备
    const scannedIds = allTeamMembersInfo.filter((m) => m.tokenId).map((m) => m.tokenId);
    if (scannedIds.length > 0) {
      selectedAccountIds.value = scannedIds;
      await delay(500);
      await joinAndPrepare();
    }
    return;
  }
  
  if (remainingStarsNeeded <= 0) {
    message.success("已达标，无需添加成员");
    // 仍然调用 joinAndPrepare 让现有成员准备
    const scannedIds = allTeamMembersInfo.filter((m) => m.tokenId).map((m) => m.tokenId);
    selectedAccountIds.value = scannedIds;
    await delay(500);
    await joinAndPrepare();
    return;
  }
  
  // 步骤 3: 组合搜索最优成员选择（优先刚好达标，避免凑超）
  // 已组队成员的 tokenId 集合（用于排除）
  const inTeamTokenIds = new Set(allTeamMembersInfo.filter((m) => m.tokenId).map((m) => m.tokenId));
  
  // 筛选可用账号：排除已在当前队伍、已有其他队伍、星数为0
  const availableAccounts = accountStarData.value
    .filter((a) => {
      if (inTeamTokenIds.has(a.tokenId)) return false;
      if (a.hasTeam && a.teamId && String(a.teamId) !== String(teamId.value)) return false;
      return a.starCount > 0;
    })
    .sort((a, b) => b.starCount - a.starCount);
  
  addLog(`从 ${availableAccounts.length} 个可用账号中组合搜索...`);
  
  // 组合生成器
  const getCombinations = (arr, size) => {
    const result = [];
    const combo = (start, picked) => {
      if (picked.length === size) { result.push([...picked]); return; }
      for (let i = start; i < arr.length; i++) {
        picked.push(arr[i]);
        combo(i + 1, picked);
        picked.pop();
      }
    };
    combo(0, []);
    return result;
  };
  
  // 搜索所有可能的组合（1 ~ remainingSlots 人），找最优解
  let bestCombo = null;
  let bestDiff = Infinity;       // 与目标的差距（绝对值）
  let bestAbove = null;           // 达标的最小超出
  let bestBelow = null;           // 未达标的最大不足
  
  for (let size = 1; size <= remainingSlots; size++) {
    const combos = getCombinations(availableAccounts, size);
    for (const combo of combos) {
      const comboStars = combo.reduce((s, a) => s + a.starCount, 0);
      const totalStars = currentSum + comboStars;
      const diff = totalStars - target;
      
      if (diff === 0) {
        // 恰好达标，直接选中
        bestCombo = combo;
        bestDiff = 0;
        break;
      } else if (diff > 0) {
        // 超出目标，记录最小超出
        if (!bestAbove || diff < bestAbove.diff) {
          bestAbove = { combo, diff, totalStars };
        }
      } else {
        // 未达标，记录最大不足（diff 负值越大越差）
        if (!bestBelow || diff > bestBelow.diff) {
          bestBelow = { combo, diff, totalStars };
        }
      }
    }
    if (bestDiff === 0) break; // 已找到恰好达标
  }
  
  // 选择最优组合：恰好 > 最小超出 > 最大不足
  if (bestCombo) {
    // 恰好达标
  } else if (bestAbove) {
    bestCombo = bestAbove.combo;
    addLog(`无法恰好达标，选择最小超出方案：${bestAbove.totalStars}星（超出${bestAbove.diff}星）`, "info");
  } else if (bestBelow) {
    bestCombo = bestBelow.combo;
    addLog(`无法达标，选择最接近方案：${bestBelow.totalStars}星（差${target - bestBelow.totalStars}星）`, "warning");
  }
  
  const selectedFromRemaining = bestCombo || [];
  const currentAdditionalStars = selectedFromRemaining.reduce((s, a) => s + a.starCount, 0);
  
  for (const acc of selectedFromRemaining) {
    addLog(`选中 ${acc.name} (${acc.starCount}星)`, "info");
  }
  
  // 步骤 4: 验证是否能达标
  const finalSum = currentSum + currentAdditionalStars;
  const finalMemberCount = allTeamMembersInfo.length + selectedFromRemaining.length;
  
  addLog(`最终选择：${finalMemberCount}人，总星数 ${finalSum}/${target}`);
  
  if (finalSum < target) {
    message.warning(`无法达标：${finalMemberCount}人共${finalSum}星 < 目标${target}星，仍差${target - finalSum}星`);
    addLog(`警告：无法达到目标星数！`, "error");
  } else {
    addLog(`达成目标：${finalMemberCount}人共${finalSum}星 ≥ 目标${target}星 ✅`, "success");
  }
  
  // 步骤 5: 更新选中的账号列表（队伍中扫描到的成员 + 新选择的成员）
  const selectedIds = [
    ...allTeamMembersInfo.filter((m) => m.tokenId).map((m) => m.tokenId),
    ...selectedFromRemaining.map((a) => a.tokenId)
  ];
  
  selectedAccountIds.value = selectedIds;
  addLog(`最终准备 ${selectedIds.length} 人，总星数 ${finalSum}/${target}`);
  message.info(`将准备 ${selectedIds.length} 人，总星数 ${finalSum}/${target}`);
  saveScanData();
  
  // 步骤 6: 启动加入并准备流程
  await delay(500);
  await joinAndPrepare();
  
  addLog(`补齐凑星流程完成`, "success");
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

    // 刷新队伍获取最新成员状态（关键：确保 prepared 字段是最新值）
    await refreshTeam();

    addLog(`队长连接已就绪，准备发送录用锁定指令...`);

    // 校验队长ID是否有效
    if (!teamLeaderId.value) {
      addLog("无法识别队长（teamLeaderId为空），队伍数据异常", "error");
      message.error("队伍数据异常，无法识别队长，请刷新队伍后重试");
      isLocking.value = false;
      return;
    }

    // 录用锁定前检查队伍状态
    const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
    const preparedMembers = nonCaptainMembers.filter((m) => isMemberPrepared(m));
    const lockedMembers = nonCaptainMembers.filter((m) => isMemberHired(m));
    addLog(`队伍状态: ${teamMembers.value.length}人, 准备: ${preparedMembers.length}/${nonCaptainMembers.length}, 已录用: ${lockedMembers.length}/${nonCaptainMembers.length}`, "info");

    if (nonCaptainMembers.length > 0 && preparedMembers.length < nonCaptainMembers.length) {
      const unpreparedNames = nonCaptainMembers
        .filter((m) => !isMemberPrepared(m))
        .map((m) => m.name || String(m.roleId).slice(-4))
        .join(', ');
      addLog(`录用失败: ${unpreparedNames} 未准备，请先确保所有成员已准备`, "error");
      message.error(`有成员未准备: ${unpreparedNames}，无法录用`);
      isLocking.value = false;
      return;
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
      { teamId: toTeamIdParam(teamId.value), lockIds }, 15000
    );
    addLog(`录用锁定响应: ${JSON.stringify(resp).slice(0, 200)}`, "success");
    addLog("队伍已录用锁定！", "success");
    message.success("队伍已录用锁定！");
    teamLocked.value = true;

    // 锁定成功后，立即给被锁定的成员设置 lockedTime
    // 防止服务端异步延迟导致 refreshTeam 返回的成员没有 lockedTime
    const now = Date.now();
    for (const m of teamMembers.value) {
      if (!isTeamCaptain(m) && lockIds.includes(Number(m.roleId))) {
        if (!m.lockedTime || m.lockedTime <= 0) {
          m.lockedTime = now;
        }
      }
    }

    await refreshTeam();

    // 二次兜底：refreshTeam 可能用服务端数据覆盖了 lockedTime，再次确保设置
    for (const m of teamMembers.value) {
      if (!isTeamCaptain(m) && lockIds.includes(Number(m.roleId))) {
        if (!m.lockedTime || m.lockedTime <= 0) {
          m.lockedTime = now;
        }
      }
    }

    // 锁定后刷新已勾选账号的队伍状态
    await refreshSelectedAccounts();
  } catch (err) {
    const errCode = err?.code || err?.errCode || err?.errorCode;
    const errMsg = String(err?.message || err || '');
    if (errCode === 200020 || errMsg.includes('200020')) {
      addLog("部分成员已录用，刷新状态...", "info");
      await refreshTeam();
    } else {
      addLog(`录用锁定失败: ${errMsg}`, "error");
      message.error(`录用锁定失败: ${errMsg}`);
    }
  } finally {
    isLocking.value = false;
  }
};

// 发送频道邀请
const isSendingInvite = ref(false);
const isFullAutoBuilding = ref(false);
const pendingTeamPlans = ref([]); // 剩余待创建队伍计划
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
            teamId: toTeamIdParam(teamId.value),
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
    // needStars 未传时按当前缺口计算，避免消息显示 "≥undefined星"
    const needText = needStars || Math.max(targetStars.value - teamTotalStars.value, 1);

    // 有房号时用队伍邀请格式，无房号时用普通消息
    const msg = hasTeam
      ? `星级挑战：${teamId.value}，目标${targetStars.value}星，缺${missingCount}人≥${needText}星，求高星队友！`
      : `星级挑战招募！目标${targetStars.value}星，缺${missingCount}人≥${needText}星队友！`;

    const params = hasTeam ? {
      channel: 1, msgType: 12, msg,
      emojiId: 0,
      extra: {
        extType: 1,
        msg: { teamCfgId: 7, teamId: toTeamIdParam(teamId.value), memberCnt },
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

// 频道广播：成员不足时发送频道广播招募（使用 matchteam_broadcast 协议）
const sendChannelBroadcast = async () => {
  if (!captainTokenId.value) {
    addLog("无法发送频道广播：未选择队长", "warning");
    return;
  }
  if (!teamId.value) {
    addLog("当前无队伍，使用普通频道消息招募...", "info");
    await sendRecruitBroadcast();
    return;
  }
  try {
    // matchteam_channelinfo: 获取频道信息
    const channelRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_channelinfo", {}, 10000
    );

    // matchteam_broadcast: 发送频道广播
    const broadcastRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_broadcast",
      { teamId: toTeamIdParam(teamId.value), channelType: 1 }, 10000
    );
    addLog("频道广播已发送，等待其他玩家加入...", "success");
    message.success("频道广播已发送，等待其他玩家加入...");
  } catch (err) {
    addLog(`频道广播发送失败: ${err?.message || err}`, "error");
    message.error(`频道广播发送失败: ${err?.message || err}`);
  }
};

// 招募循环：发送广播→等待→刷新队伍→检查新成员→踢出不符合的→循环
const startRecruitLoop = async (needStars) => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (isRecruiting.value) { message.warning("招募进行中"); return; }

  isRecruiting.value = true;
  recruitAbortRef.abort = false;
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
        const memberStars = getMemberStarCount(m);
        // 检查是否是我们扫描过的已知账号（已知账号不需要踢）
        const isKnownAccount = accountStarData.value.some(
          (a) => a.roleId && String(a.roleId) === String(m.roleId)
        );
        if (!isKnownAccount && memberStars < avgNeedPerSlot) {
          addLog(`成员 ${m.name} 星数 ${memberStars} < 每位置需求 ${avgNeedPerSlot}（总需${totalRemainingNeed}÷${remainingSlots}位），踢出`, "warning");
          try {
            await tokenStore.sendMessageWithPromise(
              captainTokenId.value, "matchteam_kick",
              { teamId: toTeamIdParam(teamId.value), kickRoleId: Number(m.roleId) }, 10000
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
      { teamId: toTeamIdParam(teamId.value) }, 10000
    );

    if (resp?.teamInfo?.fightRoleBase && resp.teamInfo.fightRoleBase.length > 0) {
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
          // 该账号之前标记为在当前队伍，但实际已不在（可能被踢出或退出）
          acc.inCurrentTeam = false;
          acc.isLeader = false;
          acc.hasTeam = false;
          acc.teamId = null;
          acc.teamCaptainName = '';
          acc.teamMemberCount = 0;
          acc.teamAllLocked = false;
          acc.teamTotalStars = 0;
        }
      }

      // 检测队伍是否已录用锁定
      // 1. 先尝试队伍级别字段
      const teamInfo = resp.teamInfo;
      const lockFlag = teamInfo.lock ?? teamInfo.locked ?? teamInfo.isLock;
      let isTeamLevelLocked = lockFlag === 1 || lockFlag === 2 || lockFlag === 'locked';

      // 2. 回退：检查非队长成员的 lockedTime，如果都有本周有效 lockedTime 则队伍已锁定
      const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
      const allMembersLocked = nonCaptainMembers.length > 0 && nonCaptainMembers.every(isLockedThisWeek);
      // 使用 OR 保留已有的 teamLocked 状态，避免服务端 lockedTime 异步延迟导致误重置为 false
      teamLocked.value = teamLocked.value || isTeamLevelLocked || allMembersLocked;

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
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) return;
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_kick",
      { teamId: toTeamIdParam(teamId.value), kickRoleId: Number(member.roleId) }, 10000
    );
    addLog(`已踢出: ${name}`, "success");
    await refreshTeam();
    // 补齐凑星不自动触发，需手动点击"补齐凑星"按钮
  } catch (err) {
    addLog(`踢出失败: ${err.message || err}`, "error");
  }
};

// 换掉最低星成员：识别当前队伍本周星数，踢掉最低星的非队长成员，再自动补齐一名满足目标星数的替补
const replaceLowestStarMember = async () => {
  if (!teamId.value) { message.warning("请先创建队伍"); return; }
  if (teamLocked.value) {
    message.warning("队伍已录用锁定，无法踢人");
    addLog("队伍已录用锁定，无法踢人", "warning");
    return;
  }
  if (isReplacing.value) return;
  isReplacing.value = true;
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) return;
    // 刷新队伍，获取本周最新星数（队伍跨周保留，星数按本周键重新识别）
    await refreshTeam();
    const nonCaptainMembers = teamMembers.value.filter((m) => !isTeamCaptain(m));
    if (nonCaptainMembers.length === 0) {
      message.info("队伍中无可替换的队员（仅队长）");
      return;
    }
    // 识别本周星数，找出最低星成员
    let lowest = nonCaptainMembers[0];
    let lowestStars = getMemberStarCount(lowest);
    for (const m of nonCaptainMembers) {
      const s = getMemberStarCount(m);
      if (s < lowestStars) { lowest = m; lowestStars = s; }
    }
    addLog(`当前队伍本周星数：${nonCaptainMembers.map((m) => `${m.name}(${getMemberStarCount(m)}星)`).join('、')}，总星数 ${teamTotalStars.value}/${targetStars.value}`);
    addLog(`最低星队员：${lowest.name || lowest.roleId} (${lowestStars}星)，将踢出`, "warning");
    // 踢出后不自动补齐，需手动点击"补齐凑星"按钮找替补
    await kickMember(lowest);
    addLog(`已踢出最低星队员，可点击"补齐凑星"手动补充替补`, "info");
  } catch (err) {
    addLog(`换最低星失败: ${err.message || err}`, "error");
  } finally {
    isReplacing.value = false;
  }
};

// 解散队伍
const dismissTeam = async () => {
  if (teamLocked.value) {
    message.warning("队伍已录用锁定，无法解散");
    addLog("队伍已录用锁定，无法解散", "warning");
    return;
  }
  if (!teamId.value) return;
  isDismissing.value = true;
  addLog("正在解散队伍 (matchteam_dismiss)...");
  try {
    const connected = await ensureConnected(captainTokenId.value);
    if (!connected) { isDismissing.value = false; return; }
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value, "matchteam_dismiss",
      { teamId: toTeamIdParam(teamId.value) }, 10000
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

    // 踢出/解散队伍时，取消星数列表的勾选账号
    selectedAccountIds.value = [];

    teamId.value = "";
    teamMembers.value = [];
    teamLeaderId.value = "";
    teamLocked.value = false;
    // 清理队伍详情缓存
    if (dismissedTeamId) {
      teamDetailsCache.value.delete(String(dismissedTeamId));
    }
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

  // 不再自动选中队长，用户需手动选择
  // initCaptain();
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
.star-team-container { padding: 10px; }
.page-title { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
.config-section { margin-bottom: 8px; }
.config-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.config-item { display: flex; align-items: center; gap: 6px; }
.label { font-weight: 600; font-size: 13px; white-space: nowrap; }
.summary-row { display: flex; gap: 6px; flex-wrap: wrap; }

.account-list-section { margin-bottom: 8px; }

.completed-teams-section {
  margin: 8px 0;
  padding: 6px;
  background: var(--n-color, #f8f9fa);
  border-radius: 8px;
  border: 1px solid var(--n-border-color, #e8e8e8);
}
.completed-team-list { display: flex; flex-direction: column; gap: 6px; }
.completed-team-card {
  padding: 6px;
  background: var(--n-color, #fff);
  border-radius: 6px;
  border: 1px solid var(--n-border-color, #e0e0e0);
}
.completed-team-card.team-completed {
  border-color: #18a058;
  background: linear-gradient(135deg, rgba(24,160,88,0.05), rgba(24,160,88,0.1));
}
.team-card-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;
  .team-captain {
    font-weight: 600; font-size: 13px;
    cursor: pointer;
    &:hover { color: #18a058; text-decoration: underline; }
  }
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
  padding-top: 4px; margin-top: 4px;
  border-top: 1px dashed rgba(255,255,255,0.1);
}
.compact-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 4px;
}
.member-card.compact {
  padding: 4px 6px;
  font-size: 12px;
  .member-avatar { width: 24px; height: 24px; }
  .avatar-placeholder { width: 24px; height: 24px; font-size: 11px; }
  .member-name { font-size: 12px; }
  .member-meta { font-size: 11px; }
}
.section-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  .section-title { font-weight: 600; font-size: 13px; }
}
.account-table { border: 1px solid var(--n-border-color, #e0e0e0); border-radius: 8px; overflow: hidden; }
.account-row {
  display: flex; align-items: center; padding: 4px 10px; gap: 8px;
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
.col-action { width: 32px; text-align: center; flex-shrink: 0; }

.action-section { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; align-items: center; }

.members-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px; margin-bottom: 8px;
}
.member-card {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border: 1px solid var(--n-border-color, #e8e8e8); border-radius: 8px;
  &.captain { border-color: #18a058; background: rgba(24, 160, 88, 0.04); }
  &.prepared { border-color: #67c23a; }
}
.member-avatar { position: relative; width: 30px; height: 30px; }
.avatar-img { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder {
  width: 30px; height: 30px; border-radius: 50%; background: #e0e0e0;
  display: flex; align-items: center; justify-content: center; font-size: 13px;
}
.prepared-badge { position: absolute; bottom: -2px; right: -2px; font-size: 12px; }
.lock-badge { position: absolute; top: -2px; right: -2px; font-size: 10px; }
.member-card.locked { opacity: 0.85; border-color: #999; }

// 队伍状态概览横幅
.team-status-banner {
  margin-bottom: 8px; padding: 8px 12px;
  background: rgba(var(--n-color-rgb, 245,245,245), 0.5);
  border: 1px solid var(--n-border-color, #e8e8e8); border-radius: 8px;
}
.status-row {
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;
}
.status-item {
  display: flex; flex-direction: column; align-items: center; min-width: 50px;
}
.status-label { font-size: 11px; color: #999; }
.status-value { font-size: 14px; font-weight: 700; &.star-enough { color: #18a058; } &.star-lack { color: #d03050; } }
.member-status-list {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.member-status-chip {
  display: flex; align-items: center; gap: 4px; padding: 3px 8px;
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
.member-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.member-meta { font-size: 11px; color: #888; display: flex; gap: 8px; flex-wrap: wrap; span { white-space: nowrap; } }
.member-actions { flex-shrink: 0; display: flex; gap: 4px; align-items: center; }

.log-section { margin-top: 8px; }
.log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.log-title { font-weight: 600; font-size: 13px; }
.log-container {
  max-height: 140px; overflow-y: auto; border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 8px; padding: 6px;
}
.log-entry { font-size: 12px; padding: 2px 0; &.success { color: #18a058; } &.error { color: #e74c3c; } &.warning { color: #e6a23c; } }
.log-time { color: #999; margin-right: 8px; }
.log-empty { text-align: center; color: #999; padding: 12px; font-size: 13px; }
</style>
