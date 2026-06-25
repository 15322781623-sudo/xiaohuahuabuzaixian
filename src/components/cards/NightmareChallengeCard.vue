<template>
  <div class="nightmare-challenge-container">
    <!-- 页面标题 -->
    <div class="page-title">十殿阎罗挑战-组队</div>

    <!-- 初始化中 -->
    <div v-if="isInitializing" class="init-section">
      <n-spin size="small" />
      <span class="init-text">正在检查队伍状态...</span>
    </div>

    <!-- 主内容区（初始化完成后显示） -->
    <template v-if="!isInitializing">

    <!-- 队长信息 + 创建房间 -->
    <div class="captain-section">
      <div class="captain-info">
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
      <div class="captain-actions">
        <n-button
          type="primary"
          @click="createRoom"
          :loading="isCreating"
          :disabled="!!teamId || isCreating"
        >
          {{ teamId ? '房间已创建' : '创建房间' }}
        </n-button>
        <n-button
          type="warning"
          @click="presetRef?.open()"
          style="color: #fff;"
        >
          设置和执行一键挑战
        </n-button>
        <div style="display: flex; align-items: center; gap: 4px; margin-left: 4px;">
          <span style="font-size: 11px; color: var(--text-secondary, #888);">{{ isBackgroundMode ? '后台' : '前台' }}</span>
          <n-switch v-model:value="isBackgroundMode" size="small" />
        </div>
        <div style="display: flex; align-items: center; gap: 4px; margin-left: 4px;" title="预设间执行间隔">
          <span style="font-size: 11px; color: var(--text-secondary, #888);">间隔</span>
          <n-input-number
            v-model:value="presetDelaySec"
            :min="1"
            :max="300"
            :step="1"
            size="tiny"
            style="width: 70px;"
            @update:value="onPresetDelayChange"
          />
          <span style="font-size: 11px; color: var(--text-secondary, #888);">秒</span>
        </div>
        <n-tag type="success" v-if="teamId" size="medium">
          TeamId: {{ teamId }}
        </n-tag>
      </div>
    </div>

    <!-- 队伍成员列表（恢复队伍或创建房间后显示） -->
    <div class="team-members-section" v-if="teamMembers.length > 0">
      <div class="section-header">
        <span class="section-title">队伍成员（{{ teamMembers.length }}人）</span>
        <div class="header-actions">
          <n-tag size="small" :type="allPrepared ? 'success' : 'warning'">
            {{ allPrepared ? '全部已准备' : '等待准备' }}
          </n-tag>
          <n-button size="tiny" @click="refreshTeamMembers" :loading="isRefreshing">
            刷新
          </n-button>
        </div>
      </div>
      <div class="members-grid">
        <div
          v-for="(member, idx) in teamMembersWithTokens"
          :key="member.roleId || idx"
          class="member-card"
          :class="{ captain: idx === 0, prepared: member.prepared === 1 }"
        >
          <div class="member-avatar">
            <div v-if="idx !== 0" class="member-checkbox">
              <n-checkbox
                :checked="selectedMemberRoleIds.includes(String(member.roleId))"
                @update:checked="(val) => toggleMemberSelect(member.roleId, val)"
                size="small"
              />
            </div>
            <img
              v-if="member.headImg"
              :src="member.headImg"
              :alt="member.name"
              class="avatar-img"
              @error="($event.target.style.display = 'none')"
            />
            <div v-else class="avatar-placeholder">
              {{ (member.name || '?')[0] }}
            </div>
            <div class="member-prepared-badge" v-if="member.prepared === 1">✅</div>
          </div>
          <div class="member-info">
            <div class="member-name">
              {{ member.name }}
              <n-tag v-if="idx === 0" size="tiny" type="info">队长</n-tag>
              <n-tag v-if="member.matchedTokenId" size="tiny" type="success">已匹配</n-tag>
            </div>
            <div class="member-meta">
              <span class="meta-item">区服: {{ member.serverId }}</span>
              <span class="meta-item">战力: {{ formatPower(member.power) }}</span>
            </div>
            <div class="member-meta" v-if="member.legionName">
              <span class="meta-item">军团: {{ member.legionName }}</span>
            </div>
            <div class="member-status-row">
              <span class="status-label">枕头:</span>
              <span :class="member.pillowCnt === 0 ? 'pillow-zero' : 'pillow-normal'">
                {{ member.pillowCnt }}
              </span>
              <span v-if="member.pillowCnt === 0" class="pillow-warning">枕头不足</span>
              <span v-if="idx !== 0" class="status-label" style="margin-left:8px">准备:</span>
              <n-tag v-if="idx !== 0" size="tiny" :type="member.prepared === 1 ? 'success' : 'error'">
                {{ member.prepared === 1 ? '已准备' : '未准备' }}
              </n-tag>
              <n-tag v-if="member.presetSlot > 0" size="tiny" type="warning" style="margin-left:6px">
                阵容{{ member.presetSlot }}
              </n-tag>
            </div>
          </div>
          <!-- 踢出/转让按钮（仅非队长成员显示） -->
          <div v-if="idx !== 0" class="member-actions">
            <n-button size="tiny" type="warning" @click="transferLeader(member)" :loading="isTransferring">转让</n-button>
            <n-button size="tiny" type="error" @click="kickMember(member)" :loading="isKicking">踢出</n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 队友选择区域 -->
    <div class="teammate-section" v-if="teamId">
      <div class="section-header">
        <span class="section-title">选择队友（最多4人）</span>
        <span class="section-hint">仅显示同大区账号</span>
      </div>
      <div class="teammate-select">
        <n-select
          v-model:value="selectedTeammates"
          :options="teammateOptions"
          multiple
          placeholder="请选择队友（最多4人）"
          :max-tag-count="4"
          :maxlength="4"
          filterable
          clearable
          @update:value="handleTeammateChange"
        />
      </div>
    </div>

    <!-- 操作按钮区 -->
    <div class="action-section" v-if="teamId">
      <n-button
        v-if="false"
        type="info"
        @click="joinRoom"
        :loading="isJoining"
        :disabled="selectedTeammates.length === 0 || isJoining || isJoiningAndReady"
      >
        加入房间
      </n-button>
      <n-button
        type="primary"
        @click="joinAndReady()"
        :loading="isJoiningAndReady"
        :disabled="selectedTeammates.length === 0 || isJoining || isJoiningAndReady"
      >
        加入房间并准备
      </n-button>
      <n-button
        type="warning"
        @click="prepareSelected"
        :loading="isPreparing"
        :disabled="selectedMemberRoleIds.length === 0 || isPreparing"
      >
        准备选中队员 ({{ selectedMemberRoleIds.length }})
      </n-button>
      <n-button
        v-if="false"
        type="warning"
        @click="prepareAll"
        :loading="isPreparing"
        :disabled="teamMembers.length <= 1 || isPreparing"
        secondary
      >
        全部准备
      </n-button>
      <n-button
        type="success"
        @click="startBattle"
        :loading="isStarting"
        :disabled="isStarting"
      >
        开始战斗
      </n-button>
      <n-button
        type="info"
        @click="returnToBattleRoom"
        :loading="isReturningToRoom"
        :disabled="isReturningToRoom || !teamId"
        secondary
      >
        返回十殿房间
      </n-button>
      <n-button
        type="error"
        @click="dismissRoom"
        :loading="isDismissing"
        :disabled="isDismissing"
      >
        解散
      </n-button>
      <n-button
        v-if="false"
        type="info"
        @click="openTestBattle"
        secondary
      >
        打开测试战斗页
      </n-button>
    </div>

    <!-- 战斗中状态页面 -->
    <div class="fighting-section" v-if="pageState === 'fighting'">
      <n-alert type="success" title="战斗中">
        十殿阎罗挑战进行中，TeamId: {{ teamId }}
      </n-alert>
      <p class="fighting-hint">更多战斗功能建设中...</p>
    </div>

    <!-- 后台战斗状态展示 -->
    <div v-if="activeBattles.length > 0" class="active-battles-section">
      <div class="section-header">
        <span class="section-title">后台战斗 ({{ activeBattles.length }})</span>
        <n-button size="tiny" type="error" @click="stopAllBattles">全部停止</n-button>
      </div>
      <div v-for="b in activeBattles" :key="b.preset.id" class="battle-status-item">
        <span class="battle-preset-name">{{ b.preset.name }}</span>
        <n-tag size="small" :type="b.currentLevel > 0 ? 'success' : 'default'" :bordered="false" style="margin: 0 4px;">第{{ b.currentLevel || '?' }}关</n-tag>
        <span v-if="b.bossHp" class="boss-hp-tag" :class="{ 'boss-low': b.bossHp.curHp / b.bossHp.maxHp < 0.3, 'boss-mid': b.bossHp.curHp / b.bossHp.maxHp >= 0.3 && b.bossHp.curHp / b.bossHp.maxHp < 0.7 }">🔥{{ formatHp(b.bossHp.curHp) }}/{{ formatHp(b.bossHp.maxHp) }}</span>
        <span class="battle-time">{{ b.startedAt }}</span>
        <n-tag v-if="b.status === 'waiting_midnight'" size="small" type="warning">等待00:00</n-tag>
        <n-tag v-else-if="b.status === 'cooling'" size="small" type="info">冷却中</n-tag>
        <n-tag v-else-if="b.status === 'completed'" size="small" type="success">✅完成</n-tag>
        <n-tag v-else-if="b.status === 'failed'" size="small" type="error">❌失败</n-tag>
        <n-tag v-else-if="b.status === 'stopped'" size="small" type="warning">⛔已停止</n-tag>
        <n-tag v-else size="small" type="info">战斗中</n-tag>
        <n-tag v-if="b.preset.waitLevel8" size="tiny" type="warning">卡点</n-tag>
        <n-button
          v-if="b.status === 'running' || b.status === 'waiting_midnight' || b.status === 'cooling'"
          size="tiny" type="error" @click="b.battle.stop()"
        >停止</n-button>
        <n-button
          v-if="b.status === 'stopped' || b.status === 'failed'"
          size="tiny" type="warning" @click="reconnectAndContinue(b)"
        >重连继续</n-button>
        <n-button
          v-if="b.roomId || b.battle?.getRoomId?.()"
          size="tiny" type="primary" @click="enterFrontendBattle(b)"
        >进入战斗</n-button>
      </div>
    </div>

    <!-- 操作日志区 -->
    <div class="log-section">
      <div class="log-header">
        <span class="log-title">操作日志</span>
        <n-button text size="tiny" @click="clearLogs">清空</n-button>
      </div>
      <div class="log-container" ref="logContainerRef">
        <div
          v-for="(log, idx) in operationLogs"
          :key="idx"
          class="log-entry"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg">{{ log.msg }}</span>
        </div>
        <div v-if="operationLogs.length === 0" class="log-empty">
          暂无操作日志
        </div>
      </div>
    </div>
    </template>
    <!-- 一键挑战预设组件 -->
    <NightmarePreset
      ref="presetRef"
      :captain-token-id="captainTokenId"
      :member-token-ids="presetMemberTokenIds"
      @execute="onPresetExecute"
      @execute-all="onPresetExecuteAll"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useTokenStore } from "@/stores/tokenStore";
import { useMessage } from "naive-ui";
import NightmarePreset from "./NightmarePreset.vue";
import { NightmareAutoBattleService } from "@/utils/nightmareAutoBattle";

// 模块级变量：跨组件 remount 持久化后台战斗实例
if (!window.__nightmareActiveBattles) {
  window.__nightmareActiveBattles = [];
}

const tokenStore = useTokenStore();
const router = useRouter();
const message = useMessage();

// ====== 后台战斗状态 ======
const activeBattles = ref([]); // { preset, battle, status, currentLevel, startedAt, bossHp }

// 格式化血量数值（225300000000 → 2253亿）
const formatHp = (hp) => {
  if (hp == null) return '?';
  const n = Number(hp);
  if (n >= 1e12) return (n / 1e12).toFixed(1) + '兆';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '万';
  return String(Math.floor(n));
};

// 已处理的残留队伍 ID 缓存，避免同一会话重复检测
const _dismissedStaleTeams = new Set();

// 从模块级变量恢复后台战斗
const restoreActiveBattles = () => {
  const persisted = window.__nightmareActiveBattles;
  if (persisted && persisted.length > 0) {
    activeBattles.value = persisted.map(item => ({
      ...item,
      // 确保状态同步到最新
      status: item.battle?.getStatus?.() || item.status,
      currentLevel: item.battle?.getCurrentLevel?.() || item.currentLevel,
      bossHp: item.battle?.getBossHp?.() || item.bossHp || null,
    }));
    // 重绑定回调到当前组件实例
    activeBattles.value.forEach(b => {
      if (b.battle?.rebindCallbacks) {
        b.battle.rebindCallbacks({
          onLog: (msg, type) => addLog(msg, type),
          onStatusChange: (info) => handleBattleStatusChange(b.preset, info),
          onComplete: (result) => handleBattleComplete(b.preset, result),
          onError: (err) => handleBattleError(b.preset, err),
        });
      }
    });
  }
};

// 保存后台战斗到模块级变量（仅保留真正活跃的战斗）
const persistActiveBattles = () => {
  window.__nightmareActiveBattles = activeBattles.value.filter(
    b => b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight'
  );
};
const isBackgroundMode = ref(true); // 后台执行 / 前台观看
// 预设间错开延迟(ms)，从 localStorage 读取，默认 10 秒
const staggerDelay = computed(() => {
  const val = parseInt(localStorage.getItem('nightmare-preset-delay') || '10', 10);
  return (isNaN(val) || val < 1 ? 10 : val) * 1000;
});
const presetDelaySec = ref(parseInt(localStorage.getItem('nightmare-preset-delay') || '10', 10));
const onPresetDelayChange = (val) => {
  const v = Math.max(1, Math.min(300, val || 10));
  localStorage.setItem('nightmare-preset-delay', String(v));
};
const presetRef = ref(null); // 预设组件 ref

// ====== 页面状态 ======
const pageState = ref("teamBuilding"); // 'teamBuilding' | 'fighting'
const isInitializing = ref(true); // 初始化中
const activePresetTeamSlots = ref({}); // 当前预设的阵容槽位配置（tokenId → slot 1-6）

// ====== 队长信息 ======
const captainTokenId = ref("");
const _skipFormationSwitch = ref(false); // 预设执行时跳过阵容切换

// 初始化队长账号（从 tokenStore.selectedTokenId 取初值）
const initCaptainTokenId = () => {
  const current = tokenStore.selectedTokenId || "";
  if (current && current !== captainTokenId.value) {
    captainTokenId.value = current;
    addLog(`队长账号已设为: ${current.slice(0, 8)}`);
  }
};

// 监听 tokenStore.selectedTokenId
watch(() => tokenStore.selectedTokenId, (newVal) => {
  if (!captainTokenId.value && newVal) {
    captainTokenId.value = newVal;
    addLog(`队长账号初始化: ${newVal.slice(0, 8)}`);
  }
});

const captainTokenObj = computed(() => tokenStore.gameTokens.find((t) => t.id === captainTokenId.value) || null);

const captainName = computed(() => {
  if (!captainTokenObj.value) return "未选择账号";
  const t = captainTokenObj.value;
  return `${t.name} (${t.server || "未知区服"})`;
});

// 队长下拉选项
const captainOptions = computed(() =>
  (tokenStore.gameTokens || []).map((t) => ({
    label: `${t.name} (${t.server || "?"})`,
    value: t.id,
  }))
);

// 切换队长并重新初始化
const switchCaptain = async (newTokenId) => {
  if (!newTokenId || newTokenId === captainTokenId.value) return;
  captainTokenId.value = newTokenId;
  // watch 会自动重置队伍状态，这里触发重新初始化
  isInitializing.value = true;
  addLog(`正在切换队长并检查队伍状态...`);
  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接到新队长账号，切换失败", "error");
      isInitializing.value = false;
      return;
    }
    const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
    const roleId = roleInfo?.role?.roleId;
    if (roleId) {
      captainRoleId.value = String(roleId);
      const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId.value);
      if (captainToken && !captainToken.roleId) {
        captainToken.roleId = String(roleId);
      }
      addLog(`当前角色 roleId: ${roleId}`);
      // 切换队长十殿阵容（从预设/daily-settings）
      const captainName = captainToken?.name || captainTokenId.value.slice(0, 8);
      await switchFormationFromSettings(captainTokenId.value, captainName);
    } else {
      addLog("无法获取 roleId，将开始全新组队", "warning");
    }
    // 检查已有队伍
    if (roleId) {
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        captainTokenId.value, "matchteam_getroleteaminfo",
        { roleID: roleId }, 10000
      );
      // 多路径提取 teamId：兼容不同服务器/协议版本的响应结构
      let existingTeamId = roleTeamRes?.teamInfo?.teamId;
      if (!existingTeamId) {
        const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
        const allTeamKeys = Object.keys(gDMTData);
        if (allTeamKeys.length > 0) {
          const numericKeys = allTeamKeys.filter((k) => /^\d+$/.test(k));
          const pickKey = numericKeys.length > 0 ? numericKeys[0] : allTeamKeys[0];
          existingTeamId = gDMTData[pickKey]?.teamId;
          addLog(`gDMTData 键: [${allTeamKeys.join(", ")}]，选中: ${pickKey} → teamId: ${existingTeamId || "无"}`, "info");
        }
      }
      if (existingTeamId) {
        // 检查是否是已处理的残留队伍
        if (_dismissedStaleTeams.has(String(existingTeamId))) {
          addLog(`队伍 ${existingTeamId} 已标记为残留，跳过`, 'info');
          existingTeamId = null;
        }
      }
      if (existingTeamId) {
        // 检查是否有进行中的战斗房间
        let hasActiveRoom = false;
        try {
          const nightResp = await tokenStore.sendMessageWithPromise(
            captainTokenId.value, 'nightmare_getroleinfo',
            { roleId: Number(roleId) }, 10000
          );
          hasActiveRoom = !!(nightResp?.nightMareData?.roomId
            || nightResp?.nightmareData?.roomId
            || nightResp?.roomId
            || nightResp?.roomid);
        } catch { /* 没有战斗房间 */ }

        if (!hasActiveRoom) {
          // 无战斗房间 → 过期残留
          addLog(`发现残留队伍 TeamId: ${existingTeamId}（无活跃战斗）`, 'warning');
          let dismissSuccess = false;
          // 先获取队伍详情确认是否队长
          let isLeader = true;
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              captainTokenId.value, 'matchteam_getteaminfo',
              { teamId: existingTeamId }, 10000
            );
            const leaderId = String(teamInfoRes?.teamInfo?.leaderId || '');
            isLeader = (leaderId === String(roleId));
          } catch { /* 无法获取队伍信息，默认尝试解散 */ }

          if (isLeader) {
            try {
              await tokenStore.sendMessageWithPromise(
                captainTokenId.value, 'matchteam_dismiss',
                { teamId: Number(existingTeamId) }, 10000
              );
              addLog('残留队伍已解散', 'success');
              dismissSuccess = true;
            } catch (dismissErr) {
              const errMsg = dismissErr.message || String(dismissErr);
              if (errMsg.includes('200020') || errMsg.includes('6100020')) {
                addLog('残留队伍已不存在', 'info');
                dismissSuccess = true;
              } else {
                addLog(`解散残留队伍失败: ${errMsg}`, 'warning');
              }
            }
          } else {
            // 非队长：退出队伍
            addLog('当前不是队长，正在退出残留队伍...', 'warning');
            try {
              await tokenStore.sendMessageWithPromise(
                captainTokenId.value, 'matchteam_leave',
                { teamId: Number(existingTeamId) }, 10000
              );
              addLog('已退出残留队伍', 'success');
              dismissSuccess = true;
            } catch (leaveErr) {
              const errMsg = leaveErr.message || String(leaveErr);
              if (errMsg.includes('200020') || errMsg.includes('6100020')) {
                addLog('残留队伍已不存在', 'info');
                dismissSuccess = true;
              } else {
                addLog(`退出残留队伍失败: ${errMsg}`, 'warning');
              }
            }
          }
          // 标记为已处理
          _dismissedStaleTeams.add(String(existingTeamId));
          addLog('当前无十殿阎罗队伍，可以开始组队');
        } else {
          // 有活跃战斗 → 恢复队伍
          teamId.value = String(existingTeamId);
          addLog(`发现已有队伍 TeamId: ${existingTeamId}（有活跃战斗），恢复中...`, 'success');
          const refreshed = await refreshTeamMembers();
          if (refreshed) matchTeammates(teamMembers.value, roleId);
        }
      } else {
        addLog("当前无十殿阎罗队伍，可以开始组队");
      }
    }
  } catch (err) {
    addLog(`切换队长失败: ${err.message || err}`, "error");
  } finally {
    isInitializing.value = false;
  }
};

const captainServer = computed(() => captainTokenObj.value?.server || "");

// captainRoleId — 从 gameData.roleInfo 获取
const captainRoleId = ref("");

// 按500服为一个大区划分（如 7001~7500, 10001~10500）
const getZoneRange = (server) => {
  if (!server) return "";
  const s = parseInt(String(server), 10);
  if (isNaN(s)) return "";
  const start = Math.floor((s - 1) / 500) * 500 + 1;
  const end = start + 499;
  return `${start}~${end}`;
};

const captainZone = computed(() => getZoneRange(captainServer.value));

// 将队伍成员匹配到本地 Token，设置 selectedTeammates
const matchTeammates = (fightRoleBase, roleId) => {
  const matchedTokenIds = [];
  for (const member of (fightRoleBase || [])) {
    if (String(member.roleId) === String(roleId)) continue; // 跳过自己
    const memberServerId = String(member.serverId || "");
    const matchedToken = tokenStore.gameTokens.find((t) => {
      const tokenServer = String(t.server || "");
      return t.name === member.name && tokenServer === memberServerId;
    });
    if (matchedToken) {
      matchedTokenIds.push(matchedToken.id);
      addLog(`匹配队员: ${member.name} (roleId: ${member.roleId}) → Token: ${matchedToken.id.slice(0, 8)}`);
    } else {
      addLog(`队员 ${member.name} (serverId: ${member.serverId}) 未匹配到本地账号`, "warning");
    }
  }
  selectedTeammates.value = matchedTokenIds;
};

// 从 daily-settings 读取十殿阵容并切换（任务模板应用后也会写入此位置）
const switchFormationFromSettings = async (tokenId, name) => {
  // 预设级别关闭队伍时跳过所有阵容切换
  if (_skipFormationSwitch.value) return;
  // 优先取预设的 teamSlots，其次取 daily-settings.nightmareFormation
  const presetSlot = activePresetTeamSlots.value?.[tokenId] || 0;
  let formation = presetSlot;
  if (!formation) {
    try {
      const raw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (raw) {
        const settings = JSON.parse(raw);
        formation = settings.nightmareFormation || 0;
      }
    } catch { /* ignore */ }
  }
  if (!formation || formation < 1 || formation > 6) return;
  try {
    addLog(`[${name}] 切换阵容 → 阵容${formation}...`);
    await tokenStore.sendMessageWithPromise(
      tokenId, "presetteam_saveteam",
      { teamId: formation }, 10000
    );
    addLog(`[${name}] 阵容已切换为阵容${formation}`, "success");
  } catch (err) {
    const errMsg = String(err.message || err);
    if (errMsg.includes("200020")) {
      addLog(`[${name}] 当前已是阵容${formation}，无需切换`, "info");
    } else {
      addLog(`[${name}] 阵容切换失败(${errMsg})，继续使用当前阵容`, "warning");
    }
  }
};

// ====== 工具函数 ======
const formatPower = (power) => {
  if (!power && power !== 0) return "未知";
  const p = Number(power);
  if (p >= 1e9) return (p / 1e8).toFixed(1) + "亿";
  if (p >= 1e8) return (p / 1e8).toFixed(2) + "亿";
  if (p >= 1e4) return (p / 1e4).toFixed(1) + "万";
  return p.toLocaleString();
};

// 是否全部准备就绪（排除队长）
const allPrepared = computed(() => {
  if (teamMembers.value.length <= 1) return false;
  return teamMembers.value.slice(1).every((m) => m.prepared === 1);
});

// ====== 房间信息 ======
const teamId = ref("");
const isCreating = ref(false);

// ====== 队伍队员信息 ======
const teamMembers = ref([]);

// 规范化名称
const normalizeName = (name) => {
  if (!name) return "";
  return String(name)
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, "")
    .replace(/[\u272A-\u272F\u2730-\u2736]/g, "")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "")
    .toLowerCase();
};

// 将 fightRoleBase 成员与 gameTokens 匹配
const teamMembersWithTokens = computed(() => {
  return teamMembers.value.map((member) => {
    const memberRoleId = String(member.roleId || "");
    const memberServerId = String(member.serverId || "");
    const memberNormName = normalizeName(member.name);

    let matchedToken = null;
    if (memberRoleId) {
      matchedToken = tokenStore.gameTokens.find(
        (t) => t.roleId && String(t.roleId) === memberRoleId
      );
    }
    if (!matchedToken && memberNormName) {
      matchedToken = tokenStore.gameTokens.find((t) => {
        const tokenServer = String(t.server || "");
        const tokenNormName = normalizeName(t.name);
        return tokenNormName === memberNormName && tokenServer === memberServerId;
      });
    }
    if (!matchedToken && memberNormName) {
      matchedToken = tokenStore.gameTokens.find((t) => {
        const tokenNormName = normalizeName(t.name);
        return tokenNormName === memberNormName;
      });
    }

    const pillowCnt = member.extParam?.itemCnt != null ? Number(member.extParam.itemCnt) : 5;
    const presetSlot = matchedToken ? (activePresetTeamSlots.value[matchedToken.id] || 0) : 0;
    return {
      ...member,
      matchedTokenId: matchedToken?.id || null,
      matchedTokenName: matchedToken?.name || member.name,
      pillowCnt,
      presetSlot,
    };
  });
});

// ====== 队友选择 ======
const selectedTeammates = ref([]);

const presetMemberTokenIds = computed(() => {
  if (teamMembersWithTokens.value.length > 1) {
    return teamMembersWithTokens.value
      .slice(1)
      .map((m) => m.matchedTokenId)
      .filter(Boolean);
  }
  return selectedTeammates.value;
});

const handleTeammateChange = (value) => {
  if (value.length > 4) {
    message.warning("最多选择4名队友");
    selectedTeammates.value = value.slice(0, 4);
  } else {
    selectedTeammates.value = value;
  }
};

// ====== 队员选择（勾选） ======
const selectedMemberRoleIds = ref([]);

const toggleMemberSelect = (roleId, checked) => {
  const rid = String(roleId);
  if (checked) {
    if (!selectedMemberRoleIds.value.includes(rid)) {
      selectedMemberRoleIds.value.push(rid);
    }
  } else {
    const idx = selectedMemberRoleIds.value.indexOf(rid);
    if (idx !== -1) {
      selectedMemberRoleIds.value.splice(idx, 1);
    }
  }
};

const isPreparing = ref(false);

// 同大区队友列表
const teammateOptions = computed(() => {
  return tokenStore.gameTokens
    .filter((t) => {
      if (t.id === captainTokenId.value) return false;
      const tokenZone = getZoneRange(t.server || "");
      return tokenZone === captainZone.value;
    })
    .sort((a, b) => {
      const sa = parseInt(a.server || "0", 10);
      const sb = parseInt(b.server || "0", 10);
      return sa - sb;
    })
    .map((t) => ({
      label: `${t.name} (${t.server}) [${t.id.slice(0, 8)}]`,
      value: t.id,
    }));
});

// ====== 操作日志 ======
const operationLogs = ref([]);
const logContainerRef = ref(null);

const addLog = (msg, type = "info") => {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-CN", { hour12: false });
  operationLogs.value.push({ time, msg, type });
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
    }
  });
};

const clearLogs = () => {
  operationLogs.value = [];
};

// ====== 连接管理工具 ======
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureCaptainConnected = async () => {
  const status = tokenStore.getWebSocketStatus(captainTokenId.value);
  if (status === "connected") return true;

  addLog("队长未连接，正在连接...");
  // 直接创建WebSocket连接，不通过selectToken（避免断开其他连接和重置gameData）
  const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId.value);
  if (!captainToken) {
    addLog("队长 Token 未找到", "error");
    return false;
  }
  tokenStore.createWebSocketConnection(captainTokenId.value, captainToken.token, captainToken.wsUrl || null);
  let retries = 0;
  while (tokenStore.getWebSocketStatus(captainTokenId.value) !== "connected" && retries < 30) {
    await delay(1000);
    retries++;
  }
  if (tokenStore.getWebSocketStatus(captainTokenId.value) !== "connected") {
    addLog("队长连接超时", "error");
    return false;
  }
  addLog("队长连接成功", "success");
  return true;
};

// 连接队员并执行操作
const connectAndDo = async (tid, name, actionFn) => {
  const token = tokenStore.gameTokens.find((t) => t.id === tid);
  if (!token) {
    addLog(`[${name}] Token未找到`, "error");
    return false;
  }

  const savedSelectedId = tokenStore.selectedTokenId;

  let status = tokenStore.getWebSocketStatus(tid);
  if (status !== "connected") {
    addLog(`[${name}] 正在连接（不影响队长连接状态）...`);
    tokenStore.createWebSocketConnection(tid, token.token, token.wsUrl || null);
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tid) !== "connected" && retries < 30) {
      await delay(1000);
      retries++;
    }
    if (tokenStore.getWebSocketStatus(tid) !== "connected") {
      addLog(`[${name}] 连接超时`, "error");
      if (tokenStore.selectedTokenId !== savedSelectedId) {
        tokenStore.selectedTokenId = savedSelectedId;
      }
      return false;
    }
    addLog(`[${name}] 连接成功`, "success");

    // 获取并保存 roleId
    if (token && !token.roleId) {
      try {
        const roleInfo = await tokenStore.sendMessageWithPromise(
          tid,
          "role_getroleinfo",
          {},
          10000
        );
        const rid = roleInfo?.role?.roleId;
        if (rid) {
          const idx = tokenStore.gameTokens.findIndex((t) => t.id === tid);
          if (idx !== -1) {
            const updated = { ...tokenStore.gameTokens[idx], roleId: String(rid) };
            tokenStore.gameTokens = tokenStore.gameTokens.map((t, i) => i === idx ? updated : t);
            addLog(`[${name}] roleId 已保存: ${rid}`, "success");
          }
        }
      } catch {
        // 静默忽略
      }
    }
  }

  try {
    await actionFn(tid);
    return true;
  } catch (err) {
    addLog(`[${name}] 操作失败: ${err.message || err}`, "error");
    return false;
  } finally {
    if (tokenStore.selectedTokenId !== savedSelectedId) {
      addLog(`[${name}] 恢复页面状态为队长`, "info");
      tokenStore.selectedTokenId = savedSelectedId;
    }
  }
};

// 断开队员连接
const disconnectTeammate = async (tid) => {
  const token = tokenStore.gameTokens.find((t) => t.id === tid);
  const name = token ? token.name : tid.slice(0, 8);
  try {
    await tokenStore.closeWebSocketConnection(tid);
    addLog(`[${name}] 已断开连接`);
  } catch {
    // 静默忽略
  }
};

// ====== 初始化：检查已有队伍 ======
onMounted(async () => {
  // 从模块级变量恢复后台战斗（跨导航持久化）
  restoreActiveBattles();

  // 优先从 sessionStorage 恢复上次后台战斗的预设队长
  const lastBattlePresetStr = sessionStorage.getItem('nightmare-last-battle-preset');
  if (lastBattlePresetStr) {
    try {
      const lastPreset = JSON.parse(lastBattlePresetStr);
      if (lastPreset.captainTokenId && tokenStore.gameTokens.some(t => t.id === lastPreset.captainTokenId)) {
        captainTokenId.value = lastPreset.captainTokenId;
        addLog(`从上次后台战斗恢复队长: ${getTokenName(lastPreset.captainTokenId)}`, 'info');
        if (lastPreset.memberTokenIds && lastPreset.memberTokenIds.length > 0) {
          selectedTeammates.value = [...lastPreset.memberTokenIds].slice(0, 4);
          addLog(`恢复队员: ${selectedTeammates.value.map(id => getTokenName(id)).join(', ')}`, 'info');
        }
        if (lastPreset.teamSlots) {
          activePresetTeamSlots.value = lastPreset.teamSlots;
        }
      }
      // 读取后清除，避免反复恢复
      sessionStorage.removeItem('nightmare-last-battle-preset');
    } catch { /* ignore */ }
  } else {
    initCaptainTokenId();
  }
  addLog("正在检查已有队伍状态...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接到队长账号，初始化失败", "error");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    let roleInfo = tokenStore.gameData.roleInfo;
    if (!roleInfo || !roleInfo.role || !roleInfo.role.roleId) {
      addLog("获取角色信息 (role_getroleinfo)...");
      roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
    }
    const roleId = roleInfo?.role?.roleId;
    if (!roleId) {
      addLog("无法获取 roleId，将开始全新组队", "warning");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }
    captainRoleId.value = String(roleId);
    addLog(`当前角色 roleId: ${roleId}`);

    const captainToken = tokenStore.gameTokens.find((t) => t.id === captainTokenId.value);
    if (captainToken && !captainToken.roleId) {
      captainToken.roleId = String(roleId);
      addLog(`队长 roleId 已保存到本地账号`, "success");
    }

    // 切换队长十殿阵容（从预设/daily-settings）
    await switchFormationFromSettings(captainTokenId.value, captainToken?.name || captainTokenId.value.slice(0, 8));

    addLog("检查队伍状态 (matchteam_getroleteaminfo)...");
    const roleTeamRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getroleteaminfo",
      { roleID: roleId },
      10000
    );

    // 多路径提取 teamId：兼容不同服务器/协议版本的响应结构
    let existingTeamId = roleTeamRes?.teamInfo?.teamId;
    if (!existingTeamId) {
      const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
      const allTeamKeys = Object.keys(gDMTData);
      if (allTeamKeys.length > 0) {
        // 优先取数字键（十殿 teamCfgId=1），否则取第一个
        const numericKeys = allTeamKeys.filter((k) => /^\d+$/.test(k));
        const pickKey = numericKeys.length > 0 ? numericKeys[0] : allTeamKeys[0];
        existingTeamId = gDMTData[pickKey]?.teamId;
        addLog(`gDMTData 键: [${allTeamKeys.join(", ")}]，选中: ${pickKey} → teamId: ${existingTeamId || "无"}`, "info");
      }
    }

    if (!existingTeamId) {
      addLog("当前无十殿阎罗队伍，可以开始组队");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    // 检查是否是已处理的残留队伍
    if (_dismissedStaleTeams.has(String(existingTeamId))) {
      addLog(`队伍 ${existingTeamId} 已标记为残留，跳过检测`, 'info');
      addLog("当前无十殿阎罗队伍，可以开始组队");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    addLog(`发现已有十殿队伍 TeamId: ${existingTeamId}，正在获取队伍详情...`);

    const teamInfoRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getteaminfo",
      { teamId: existingTeamId },
      10000
    );

    if (!teamInfoRes || !teamInfoRes.teamInfo) {
      addLog("获取队伍详情失败，将开始全新组队", "warning");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    const teamInfo = teamInfoRes.teamInfo;
    const leaderId = String(teamInfo.leaderId || "");

    addLog(`队伍队长 roleId: ${leaderId}，当前角色 roleId: ${roleId}`);

    // 先检查是否有进行中的战斗房间（不管是队长还是队员）
    let existingRoomId = null;
    try {
      const nightResp = await tokenStore.sendMessageWithPromise(
        captainTokenId.value,
        'nightmare_getroleinfo',
        { roleId: Number(roleId) },
        10000
      );
      existingRoomId = nightResp?.nightMareData?.roomId
        || nightResp?.nightmareData?.roomId
        || nightResp?.roomId
        || nightResp?.roomid
        || null;
    } catch { /* 没有战斗房间 */ }

    if (!existingRoomId) {
      // 无战斗房间 → 过期残留队伍
      if (leaderId === String(roleId)) {
        // 当前是队长，可以直接解散
        addLog(`发现残留队伍 TeamId: ${existingTeamId}（无活跃战斗），正在解散...`, 'warning');
        try {
          await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            'matchteam_dismiss',
            { teamId: Number(existingTeamId) },
            10000
          );
          addLog('残留队伍已解散，可以开始全新组队', 'success');
        } catch (dismissErr) {
          const errMsg = dismissErr.message || String(dismissErr);
          if (errMsg.includes('200020') || errMsg.includes('6100020')) {
            addLog('残留队伍已不存在，可以开始全新组队', 'info');
          } else {
            addLog(`解散残留队伍失败: ${errMsg}`, 'warning');
          }
        }
        // 标记为已处理的残留队伍
        _dismissedStaleTeams.add(String(existingTeamId));
      } else {
        // 非队长：使用 matchteam_leave 退出残留队伍
        addLog(`发现残留队伍（无活跃战斗），当前不是队长，正在退出队伍...`, 'warning');
        try {
          await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            'matchteam_leave',
            { teamId: Number(existingTeamId) },
            10000
          );
          addLog('已退出残留队伍，可以开始全新组队', 'success');
        } catch (leaveErr) {
          const errMsg = leaveErr.message || String(leaveErr);
          if (errMsg.includes('200020') || errMsg.includes('6100020')) {
            addLog('残留队伍已不存在，可以开始全新组队', 'info');
          } else {
            addLog(`退出残留队伍失败: ${errMsg}`, 'warning');
          }
        }
        // 标记为已处理的残留队伍
        _dismissedStaleTeams.add(String(existingTeamId));
      }
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    // 有活跃战斗房间 → 检查是否队长
    if (leaderId !== String(roleId)) {
      addLog(`当前账号不是队长（队长 roleId: ${leaderId}），可通过上方下拉切换队长账号`, "warning");
      isInitializing.value = false;
      checkAndExecuteNextPreset();
      return;
    }

    // 有活跃战斗 + 是队长 → 恢复队伍到UI
    teamId.value = String(existingTeamId);
    const fightRoleBase = teamInfo.fightRoleBase || [];
    teamMembers.value = fightRoleBase;
    matchTeammates(fightRoleBase, roleId);

    const otherCount = fightRoleBase.length - 1;
    addLog(`队伍已恢复！TeamId: ${teamId.value}，${otherCount > 0 ? `已有 ${otherCount} 名队员` : "暂无队员"}`, "success");
    message.success(`已恢复队伍 TeamId: ${teamId.value}（有活跃战斗房间）`);
    isInitializing.value = false;
    // 检查是否有待执行的预设队列（从战斗页面返回）
    checkAndExecuteNextPreset();
  } catch (err) {
    addLog(`初始化检查失败: ${err.message || err}`, "error");
    addLog("将开始全新组队流程");
    isInitializing.value = false;
    // 初始化失败也检查队列
    checkAndExecuteNextPreset();
  }
});

// 组件卸载前持久化后台战斗实例（跨导航保留）
onBeforeUnmount(() => {
  persistActiveBattles();
});

// 检查并执行队列中的下一个预设
const checkAndExecuteNextPreset = async () => {
  try {
    const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
    if (queue.length > 0) {
      addLog(`检测到预设队列剩余 ${queue.length} 个，自动继续执行...`, 'info');
      await delay(2000);
      await executeNextPresetInQueue();
    }
  } catch { /* ignore */ }
};

// ====== 监听队长切换 ======
watch(captainTokenId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    teamId.value = "";
    teamMembers.value = [];
    selectedTeammates.value = [];
    captainRoleId.value = "";
    pageState.value = "teamBuilding";
    addLog("队长账号已切换，队伍状态已重置");
  }
});

// ====== 队伍信息刷新 ======
const isRefreshing = ref(false);

const saveRoleIdsToTokens = (fightRoleBase) => {
  let savedCount = 0;
  const pillowCache = {};
  for (const member of fightRoleBase) {
    const memberRoleId = String(member.roleId || "");
    if (!memberRoleId) continue;
    // 缓存枕头数量
    const pillowCnt = member.extParam?.itemCnt != null ? Number(member.extParam.itemCnt) : null;
    const idx = tokenStore.gameTokens.findIndex(
      (t) => t.roleId && String(t.roleId) === memberRoleId
    );
    if (idx !== -1) {
      // 已有 roleId，只缓存枕头
      if (pillowCnt != null) pillowCache[tokenStore.gameTokens[idx].id] = pillowCnt;
      continue;
    }
    const memberServerId = String(member.serverId || "");
    const memberNormName = normalizeName(member.name);
    const nameIdx = tokenStore.gameTokens.findIndex((t) => {
      const tokenServer = String(t.server || "");
      const tokenNormName = normalizeName(t.name);
      return tokenNormName && tokenNormName === memberNormName && tokenServer === memberServerId;
    });
    if (nameIdx !== -1) {
      const token = tokenStore.gameTokens[nameIdx];
      const updated = { ...token, roleId: memberRoleId };
      tokenStore.gameTokens = tokenStore.gameTokens.map((t, i) => i === nameIdx ? updated : t);
      savedCount++;
      addLog(`自动保存 roleId: ${member.name} → ${memberRoleId}`, "success");
      if (pillowCnt != null) pillowCache[token.id] = pillowCnt;
    }
  }
  // 保存枕头缓存到 localStorage
  if (Object.keys(pillowCache).length > 0) {
    try {
      const existing = JSON.parse(localStorage.getItem('nightmare-pillow-cache') || '{}');
      Object.assign(existing, pillowCache);
      localStorage.setItem('nightmare-pillow-cache', JSON.stringify(existing));
    } catch { /* ignore */ }
  }
  if (savedCount > 0) {
    addLog(`共自动保存 ${savedCount} 个队员的 roleId`, "success");
  }
};

const refreshTeamMembers = async () => {
  if (!teamId.value || !captainTokenId.value) return false;
  isRefreshing.value = true;
  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      isRefreshing.value = false;
      return false;
    }
    const teamInfoRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getteaminfo",
      { teamId: teamId.value },
      10000
    );
    if (teamInfoRes?.teamInfo?.fightRoleBase) {
      teamMembers.value = teamInfoRes.teamInfo.fightRoleBase;
      addLog(`队伍成员已刷新，共 ${teamMembers.value.length} 人`);
      saveRoleIdsToTokens(teamInfoRes.teamInfo.fightRoleBase);
    } else {
      addLog("刷新队伍成员：无fightRoleBase数据", "warning");
      isRefreshing.value = false;
      return false;
    }
  } catch (err) {
    addLog(`刷新队伍成员失败: ${err.message || err}`, "error");
    isRefreshing.value = false;
    return false;
  }
  isRefreshing.value = false;
  return true;
};

// ====== 核心操作 ======

// 1. 创建房间
const createRoom = async (isRetry = false) => {
  if (!captainTokenId.value) {
    message.warning("请先选择队长账号");
    return;
  }

  isCreating.value = true;
  addLog(isRetry ? "重新创建房间..." : "开始创建房间...");

  try {
    addLog("正在获取战斗阵容 (matchteam_getrandteamlist)...");
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getrandteamlist",
      { teamCfgId: 1, param: 0, custom: {} },
      10000
    );
    addLog("获取战斗阵容成功", "success");

    addLog("正在创建组队房间 (matchteam_create)...");
    const createResp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_create",
      {
        teamCfgId: 1,
        setting: {
          name: "十殿先锋队",
          notice: "",
          secret: 1,
          apply: 0,
          applyList: [],
        },
        param: 0,
        custom: {},
        extParam: 0,
      },
      10000
    );

    if (createResp && createResp.teamInfo && createResp.teamInfo.teamId) {
      teamId.value = String(createResp.teamInfo.teamId);
      if (createResp.teamInfo.fightRoleBase && createResp.teamInfo.fightRoleBase.length > 0) {
        teamMembers.value = createResp.teamInfo.fightRoleBase;
      } else {
        addLog("创建响应中无队员信息，正在刷新...");
        await refreshTeamMembers();
      }
      addLog(`房间创建成功！TeamId: ${teamId.value}`, "success");
      message.success(`房间创建成功！TeamId: ${teamId.value}`);
    } else {
      addLog(`创建房间响应异常: ${JSON.stringify(createResp)}`, "error");
      message.error("创建房间失败，响应数据异常");
    }
  } catch (err) {
    const errMsg = err.message || String(err);
    // 7100020: 服务器残留队伍导致创建失败，自动解散后重试一次
    if (!isRetry && errMsg.includes('7100020')) {
      addLog('创建房间失败(7100020)，检测到服务器残留队伍，正在解散后重试...', 'warning');
      try {
        // 查询队长现有队伍
        const roleTeamRes = await tokenStore.sendMessageWithPromise(
          captainTokenId.value,
          'matchteam_getroleteaminfo',
          { roleID: Number(captainRoleId.value) },
          10000
        );
        let staleTeamId = roleTeamRes?.teamInfo?.teamId;
        if (!staleTeamId) {
          const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
          const keys = Object.keys(gDMTData);
          if (keys.length > 0) {
            const numKeys = keys.filter(k => /^\d+$/.test(k));
            staleTeamId = gDMTData[numKeys[0] || keys[0]]?.teamId;
          }
        }
        if (staleTeamId) {
          addLog(`发现残留队伍 TeamId: ${staleTeamId}，正在解散...`, 'info');
          await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            'matchteam_dismiss',
            { teamId: Number(staleTeamId) },
            10000
          );
          addLog('残留队伍已解散，2秒后重新创建房间', 'success');
          await delay(2000);
          isCreating.value = false;
          return createRoom(true);
        } else {
          addLog('未找到残留队伍，尝试直接重试...', 'warning');
          await delay(2000);
          isCreating.value = false;
          return createRoom(true);
        }
      } catch (dismissErr) {
        addLog(`解散残留队伍失败: ${dismissErr.message || dismissErr}`, 'error');
        message.error('解散残留队伍失败，请手动解散后重试');
      }
    } else {
      addLog(`创建房间失败: ${errMsg}`, "error");
      message.error(`创建房间失败: ${errMsg}`);
    }
  } finally {
    isCreating.value = false;
  }
};

// 2. 加入房间
const isJoining = ref(false);

const joinRoom = async () => {
  if (!teamId.value) { message.warning("请先创建房间"); return; }
  if (selectedTeammates.value.length === 0) { message.warning("请先选择队友"); return; }

  isJoining.value = true;
  addLog(`开始加入房间，共 ${selectedTeammates.value.length} 名队友...`);

  for (const tid of selectedTeammates.value) {
    const token = tokenStore.gameTokens.find((t) => t.id === tid);
    const name = token ? token.name : tid.slice(0, 8);
    addLog(`[${name}] 开始加入流程...`);

    const success = await connectAndDo(tid, name, async (tokenId) => {
      addLog(`[${name}] 获取阵容 (matchteam_getrandteamlist)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_getrandteamlist",
        { teamCfgId: 1, param: 0, custom: {} }, 10000
      );
      addLog(`[${name}] 加入房间 (matchteam_join)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_join",
        { teamId: Number(teamId.value) }, 10000
      );
    });

    if (success) addLog(`[${name}] 加入房间成功！`, "success");
    if (tokenStore.getWebSocketStatus(tid) === "connected") await disconnectTeammate(tid);
    await delay(500);
  }

  addLog("所有队友加入流程完成（队员已断开）", "success");
  await refreshTeamMembers();
  isJoining.value = false;
};

// 2b. 加入房间并准备
const isJoiningAndReady = ref(false);

const joinAndReady = async (explicitMembers) => {
  if (!teamId.value) { message.warning("请先创建房间"); return false; }
  // 支持外部直接传入成员列表，避免依赖 selectedTeammates 共享状态（防止 watch 竞态清空）
  const members = Array.isArray(explicitMembers) ? explicitMembers : selectedTeammates.value;
  if (members.length === 0) { message.warning("请先选择队友"); return false; }

  isJoiningAndReady.value = true;
  addLog(`开始"加入房间并准备"，共 ${members.length} 名队友...`);

  const MAX_RETRIES = 2;
  let pendingMembers = [...members];
  // 记录已成功加入房间的成员（join成功但prepare失败）
  const alreadyJoined = new Set();

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const failedThisRound = [];

    for (const tid of pendingMembers) {
      const token = tokenStore.gameTokens.find((t) => t.id === tid);
      const name = token ? token.name : tid.slice(0, 8);

      if (attempt > 1) {
        addLog(`[${name}] 第 ${attempt - 1} 次重试...`);
        await delay(2000);
      } else {
        addLog(`[${name}] 开始加入并准备流程...`);
      }

      const wasJoined = alreadyJoined.has(tid);

      const success = await connectAndDo(tid, name, async (tokenId) => {
        if (!wasJoined) {
          // 未加入房间 → 执行完整流程
          await switchFormationFromSettings(tokenId, name);
          addLog(`[${name}] 获取阵容 (matchteam_getrandteamlist)...`);
          await tokenStore.sendMessageWithPromise(
            tokenId, "matchteam_getrandteamlist",
            { teamCfgId: 1, param: 0, custom: {} }, 10000
          );
          addLog(`[${name}] 加入房间 (matchteam_join)...`);
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId, "matchteam_join",
              { teamId: Number(teamId.value) }, 10000
            );
            // join成功，标记
            alreadyJoined.add(tid);
          } catch (joinErr) {
            const joinMsg = joinErr.message || String(joinErr);
            // 7100020: 已在房间中，跳过join继续prepare
            if (joinMsg.includes('7100020')) {
              addLog(`[${name}] 已在房间中，跳过加入`, 'info');
              alreadyJoined.add(tid);
            } else {
              throw joinErr; // 其他错误继续抛出
            }
          }
          addLog(`[${name}] 等待1秒后准备...`);
          await delay(1000);
        } else {
          // 已加入房间 → 只做prepare
          addLog(`[${name}] 已在房间中，直接准备...`);
          await delay(500);
        }
        addLog(`[${name}] 准备 (matchteam_memberprepare)...`);
        await tokenStore.sendMessageWithPromise(
          tokenId, "matchteam_memberprepare",
          { teamId: Number(teamId.value) }, 10000
        );
      });

      if (success) {
        addLog(`[${name}] 加入并准备成功！`, "success");
      } else {
        addLog(`[${name}] 加入并准备失败`, "error");
        failedThisRound.push(tid);
      }

      if (tokenStore.getWebSocketStatus(tid) === "connected") await disconnectTeammate(tid);
      await delay(500);
    }

    if (failedThisRound.length === 0) {
      pendingMembers = [];
      break;
    }
    pendingMembers = failedThisRound;
    if (attempt <= MAX_RETRIES) {
      addLog(`本轮 ${failedThisRound.length} 名成员失败，将重试...`, "warning");
    }
  }

  // 恢复队长连接
  if (captainTokenId.value) {
    const captainStatus = tokenStore.getWebSocketStatus(captainTokenId.value);
    if (captainStatus !== "connected") {
      addLog("恢复队长连接...");
      const captainToken = tokenStore.gameTokens.find((t) => t.id === captainTokenId.value);
      if (captainToken) {
        tokenStore.createWebSocketConnection(captainTokenId.value, captainToken.token, captainToken.wsUrl || null);
        let retries = 0;
        while (tokenStore.getWebSocketStatus(captainTokenId.value) !== "connected" && retries < 20) {
          await delay(500);
          retries++;
        }
        addLog("队长连接已恢复", "success");
      }
    }
  }
  await refreshTeamMembers();
  isJoiningAndReady.value = false;

  // 报告最终结果
  if (pendingMembers.length > 0) {
    const failedNames = pendingMembers.map(tid => {
      const t = tokenStore.gameTokens.find((x) => x.id === tid);
      return t ? t.name : tid.slice(0, 8);
    }).join(", ");
    addLog(`以下成员未能加入房间: ${failedNames}`, "error");
    return false;
  }

  addLog("所有队友加入并准备流程完成（队员已断开）", "success");
  return true;
};

// 踢出成员
const isKicking = ref(false);

const kickMember = async (member) => {
  if (!teamId.value) { message.warning("请先创建房间"); return; }
  if (!member || !member.roleId) { message.warning("无法识别该成员"); return; }

  isKicking.value = true;
  const name = member.name || `roleId:${member.roleId}`;
  addLog(`正在踢出成员: ${name}...`);

  try {
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_kick",
      { teamId: Number(teamId.value), kickRoleId: Number(member.roleId) },
      10000
    );
    addLog(`已踢出成员: ${name}`, "success");
    message.success(`已踢出 ${name}`);
    await refreshTeamMembers();
  } catch (err) {
    addLog(`踢出失败: ${err.message || err}`, "error");
    message.error(`踢出失败: ${err.message || err}`);
  } finally {
    isKicking.value = false;
  }
};

// 转让队长
const isTransferring = ref(false);

const transferLeader = async (member) => {
  if (!teamId.value) { message.warning("请先创建房间"); return; }
  if (!member || !member.roleId) { message.warning("无法识别该成员"); return; }

  isTransferring.value = true;
  const name = member.name || `roleId:${member.roleId}`;
  addLog(`正在转让队长给: ${name}...`);

  try {
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_setleader",
      { teamId: Number(teamId.value), leaderId: Number(member.roleId) },
      10000
    );
    addLog(`已将队长转让给: ${name}`, "success");
    message.success(`已将队长转让给 ${name}`);
    await refreshTeamMembers();
  } catch (err) {
    addLog(`转让队长失败: ${err.message || err}`, "error");
    message.error(`转让队长失败: ${err.message || err}`);
  } finally {
    isTransferring.value = false;
  }
};

// 3. 准备选中队员
const prepareSelected = async () => {
  if (!teamId.value) { message.warning("请先创建房间"); return; }
  if (selectedMemberRoleIds.value.length === 0) { message.warning("请先选择要准备的队员"); return; }

  isPreparing.value = true;

  const selectedTokens = [];
  for (const roleId of selectedMemberRoleIds.value) {
    const member = teamMembersWithTokens.value.find(
      (m) => String(m.roleId) === String(roleId)
    );
    if (member && member.matchedTokenId) {
      selectedTokens.push({
        roleId: member.roleId,
        tokenId: member.matchedTokenId,
        name: member.name,
      });
    } else {
      addLog(`队员 ${member?.name || roleId} 未匹配到本地账号，跳过`, "warning");
    }
  }

  if (selectedTokens.length === 0) {
    addLog("没有可准备的队员（未匹配到本地账号）", "warning");
    isPreparing.value = false;
    return;
  }

  addLog(`开始准备选中队员，共 ${selectedTokens.length} 人...`);

  for (const item of selectedTokens) {
    const success = await connectAndDo(item.tokenId, item.name, async (tokenId) => {
      addLog(`[${item.name}] 发送准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_memberprepare",
        { teamId: Number(teamId.value) }, 10000
      );
    });
    if (success) addLog(`[${item.name}] 准备就绪！`, "success");
    if (tokenStore.getWebSocketStatus(item.tokenId) === "connected") await disconnectTeammate(item.tokenId);
    await delay(300);
  }

  addLog("准备选中队员流程完成", "success");
  await refreshTeamMembers();
  selectedMemberRoleIds.value = [];
  isPreparing.value = false;
};

// 4. 全部准备
const prepareAll = async () => {
  if (!teamId.value) { message.warning("请先创建房间"); return; }
  isPreparing.value = true;
  addLog("全部准备：先刷新队伍信息，获取队员 roleId...");

  const refreshed = await refreshTeamMembers();
  if (!refreshed) {
    addLog("刷新队伍信息失败，无法继续", "error");
    isPreparing.value = false;
    return;
  }

  const unpreparedMembers = teamMembers.value.filter(
    (m, idx) => idx !== 0 && m.prepared !== 1
  );

  if (unpreparedMembers.length === 0) {
    addLog("所有队员已准备就绪", "success");
    isPreparing.value = false;
    return;
  }

  addLog(`开始全部准备，共 ${unpreparedMembers.length} 名未准备队员...`);

  const selectedTokens = [];
  for (const member of unpreparedMembers) {
    const matchedMember = teamMembersWithTokens.value.find(
      (m) => String(m.roleId) === String(member.roleId)
    );
    if (matchedMember && matchedMember.matchedTokenId) {
      selectedTokens.push({
        roleId: member.roleId,
        tokenId: matchedMember.matchedTokenId,
        name: member.name,
      });
    } else {
      addLog(`队员 ${member.name} (roleId: ${member.roleId}) 未匹配到本地账号，跳过`, "warning");
    }
  }

  if (selectedTokens.length === 0) {
    addLog("没有可准备的队员（未匹配到本地账号）", "warning");
    isPreparing.value = false;
    return;
  }

  for (const item of selectedTokens) {
    const success = await connectAndDo(item.tokenId, item.name, async (tokenId) => {
      addLog(`[${item.name}] 发送准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId, "matchteam_memberprepare",
        { teamId: Number(teamId.value) }, 10000
      );
    });
    if (success) addLog(`[${item.name}] 准备就绪！`, "success");
    if (tokenStore.getWebSocketStatus(item.tokenId) === "connected") await disconnectTeammate(item.tokenId);
    await delay(300);
  }

  addLog("全部准备流程完成", "success");
  await refreshTeamMembers();
  isPreparing.value = false;
};

// 5. 开始战斗
const isStarting = ref(false);

// 预设重试计数器 { presetId: count }
const presetRetryCount = {};
const MAX_PRESET_RETRY = 1;

// 恢复预设组队到UI
const restorePresetTeamToUI = (preset) => {
  if (!preset) return;
  if (preset.captainTokenId) {
    captainTokenId.value = preset.captainTokenId;
    addLog(`已恢复队长: ${getTokenName(preset.captainTokenId)}`, 'info');
  }
  if (preset.memberTokenIds && preset.memberTokenIds.length > 0) {
    selectedTeammates.value = [...preset.memberTokenIds].slice(0, 4);
    addLog(`已恢复队员: ${selectedTeammates.value.map(id => getTokenName(id)).join(', ')}`, 'info');
  }
  if (preset.teamSlots) {
    activePresetTeamSlots.value = preset.teamSlots;
  }
};

// ====== 后台战斗回调 ======
const handleBattleComplete = (preset, result) => {
  const idx = activeBattles.value.findIndex(b => b.preset.id === preset.id);
  if (idx !== -1) activeBattles.value[idx].status = 'completed';
  addLog(`✅ 预设「${preset.name}」战斗完成 (第${result.level}关)`, 'success');
  // 重置重试计数
  delete presetRetryCount[preset.id];
  // 战斗完成 → 清除本地队伍状态（服务端已 nightmare_dismiss + matchteam_dismiss）
  teamId.value = '';
  teamMembers.value = [];
  captainRoleId.value = '';
  // 自动恢复预设组队到UI
  restorePresetTeamToUI(preset);
  // 完成后30秒自动移除
  setTimeout(() => {
    activeBattles.value = activeBattles.value.filter(b => b.preset.id !== preset.id);
  }, 30000);
};

const handleBattleError = (preset, err) => {
  const idx = activeBattles.value.findIndex(b => b.preset.id === preset.id);
  if (idx !== -1) activeBattles.value[idx].status = 'failed';
  addLog(`❌ 预设「${preset.name}」战斗失败: ${err.message || err}`, 'error');

  // 第8关全员阵亡 → 自动重新执行预设
  if (err.reason === 'level8_all_dead') {
    // 清除队伍状态（服务端已解散）
    teamId.value = '';
    teamMembers.value = [];
    captainRoleId.value = '';
    const retries = presetRetryCount[preset.id] || 0;
    if (retries < MAX_PRESET_RETRY) {
      presetRetryCount[preset.id] = retries + 1;
      addLog(`🔄 第8关全员阵亡，自动重新执行预设「${preset.name}」(第${retries + 1}/${MAX_PRESET_RETRY}次)`, 'warning');
      message.warning(`第8关全员阵亡，重新执行预设「${preset.name}」(${retries + 1}/${MAX_PRESET_RETRY})`);
      // 移除失败的后台战斗
      activeBattles.value = activeBattles.value.filter(b => b.preset.id !== preset.id);
      // 延迟3秒后重新执行
      setTimeout(() => onPresetExecute(preset), 3000);
    } else {
      addLog(`❌ 预设「${preset.name}」第8关全员阵亡已达最大重试次数(${MAX_PRESET_RETRY})，停止执行`, 'error');
      message.error(`预设「${preset.name}」第8关失败已达上限`);
      delete presetRetryCount[preset.id];
    }
  }
  // 其他失败不自动移除，保留“重连继续”按钮
};

const handleBattleStatusChange = (preset, info) => {
  const idx = activeBattles.value.findIndex(b => b.preset.id === preset.id);
  if (idx !== -1) {
    activeBattles.value[idx].status = info.status;
    activeBattles.value[idx].currentLevel = info.currentLevel || activeBattles.value[idx].currentLevel;
    if (info.bossHp) {
      activeBattles.value[idx].bossHp = info.bossHp;
    }
  }
};

const stopAllBattles = () => {
  activeBattles.value.forEach(b => {
    if (b.battle && (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')) {
      b.battle.stop();
    }
  });
  addLog('已停止所有后台战斗', 'warning');
};

// 重连队长并继续战斗
const reconnectAndContinue = async (battleItem) => {
  const { preset, battle } = battleItem;
  addLog(`尝试重连队长并继续预设「${preset.name}」...`, 'info');

  // 1. 切换队长并重新连接
  const savedCaptain = captainTokenId.value;
  captainTokenId.value = preset.captainTokenId;
  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog(`重连队长失败，无法继续预设「${preset.name}」`, 'error');
      captainTokenId.value = savedCaptain;
      return;
    }
    addLog(`队长重连成功，继续战斗...`, 'success');
  } catch (e) {
    addLog(`重连异常: ${e.message}`, 'error');
    captainTokenId.value = savedCaptain;
    return;
  }

  // 2. 调用 Service 的 resume 方法继续战斗
  battleItem.status = 'running';
  battle.resume(); // 异步启动，不等待
  captainTokenId.value = savedCaptain;
};

// ====== 进入前端战斗页面 ======
const enterFrontendBattle = (battleItem) => {
  const bRoomId = battleItem.roomId || battleItem.battle?.getRoomId?.();
  const bCaptain = battleItem.preset?.captainTokenId || captainTokenId.value;
  if (!bRoomId) {
    message.warning('无法获取房间 ID');
    return;
  }
  router.push({
    name: 'NightmareBattle',
    query: {
      teamId: teamId.value || '',
      captainTokenId: bCaptain,
      roomId: String(bRoomId),
    },
  });
};

// ====== 提取：openTeam + 获取 roomId（供后台模式使用） ======
const openTeamAndGetRoomId = async (isRetry = false) => {
  try {
    const openResp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_openteam",
      { teamId: Number(teamId.value) },
      10000
    );
    addLog("战斗开始成功！", "success");
    pageState.value = "fighting";

    let roomId = openResp?.roomId || openResp?.roomid || openResp?.roomInfo?.roomId || null;
    if (roomId) {
      addLog(`从 openteam 响应直接获取 RoomId: ${roomId}`, "success");
      return roomId;
    }

    // 轮询 nightmare_getroleinfo 获取 roomId
    const maxRetries = 10;
    if (captainRoleId.value) {
      addLog("正在获取战斗 RoomId...", "info");
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const resp = await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            "nightmare_getroleinfo",
            { roleId: Number(captainRoleId.value) },
            10000
          );
          roomId = resp?.nightMareData?.roomId
            || resp?.nightmareData?.roomId
            || resp?.roomId
            || resp?.roomid
            || null;
          if (roomId) {
            addLog(`获取到 RoomId: ${roomId}`, "success");
            return roomId;
          }
          addLog(`RoomId 尚未生成，等待3秒后重试 (${attempt}/${maxRetries})...`, "warning");
          if (attempt < maxRetries) await delay(3000);
        } catch (err) {
          addLog(`获取 RoomId 失败 (${attempt}/${maxRetries}): ${err.message || String(err)}`, "warning");
          if (attempt < maxRetries) await delay(3000);
        }
      }
    }
    return roomId; // 可能为 null
  } catch (err) {
    const errMsg = err.message || String(err);
    // 7100020: 服务器残留队伍导致开启失败，先解散再重建
    if (!isRetry && errMsg.includes('7100020')) {
      addLog('开启房间失败(7100020)，检测到服务器残留队伍，正在解散后重试...', 'warning');
      try {
        // 查询队长现有队伍
        const roleTeamRes = await tokenStore.sendMessageWithPromise(
          captainTokenId.value,
          'matchteam_getroleteaminfo',
          { roleID: Number(captainRoleId.value) },
          10000
        );
        let staleTeamId = roleTeamRes?.teamInfo?.teamId;
        if (!staleTeamId) {
          const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
          const keys = Object.keys(gDMTData);
          if (keys.length > 0) {
            const numKeys = keys.filter(k => /^\d+$/.test(k));
            staleTeamId = gDMTData[numKeys[0] || keys[0]]?.teamId;
          }
        }
        if (staleTeamId) {
          addLog(`发现残留队伍 TeamId: ${staleTeamId}，正在解散...`, 'info');
          await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            'matchteam_dismiss',
            { teamId: Number(staleTeamId) },
            10000
          );
          addLog('残留队伍已解散', 'success');
        } else {
          addLog('未找到残留队伍ID，尝试直接解散当前队伍...', 'warning');
          try {
            await tokenStore.sendMessageWithPromise(
              captainTokenId.value,
              'matchteam_dismiss',
              { teamId: Number(teamId.value) },
              10000
            );
          } catch { /* 可能队伍已不存在 */ }
        }
        await delay(2000);
        // 重新创建队伍并开启房间
        addLog('重新创建队伍和房间...', 'info');
        const createResp = await tokenStore.sendMessageWithPromise(
          captainTokenId.value,
          'matchteam_create',
          {
            teamCfgId: 1,
            setting: { name: '十殿先锋队', notice: '', secret: 1, apply: 0, applyList: [] },
            param: 0, custom: {}, extParam: 0,
          },
          10000
        );
        const newTeamId = createResp?.teamInfo?.teamId;
        if (newTeamId) {
          teamId.value = String(newTeamId);
          addLog(`新队伍已创建 TeamId: ${newTeamId}`, 'success');
          await delay(2000);
          return openTeamAndGetRoomId(true);
        } else {
          addLog('重新创建队伍失败', 'error');
          return null;
        }
      } catch (retryErr) {
        addLog(`7100020重试失败: ${retryErr.message || retryErr}`, 'error');
        return null;
      }
    }
    throw err;
  }
};

const startBattle = async (presetId = null) => {
  if (!teamId.value || !captainTokenId.value) { message.warning("请先创建房间"); return; }

  isStarting.value = true;
  addLog("开始战斗 (matchteam_openteam)...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接队长账号", "error");
      isStarting.value = false;
      return;
    }

    const roomId = await openTeamAndGetRoomId();
    message.success("战斗开始成功！");

    if (!roomId) addLog("RoomId 获取失败（已重试），战斗页面将自行尝试获取", "warning");

    router.push({
      name: "NightmareBattle",
      query: {
        teamId: teamId.value,
        captainTokenId: captainTokenId.value,
        ...(roomId ? { roomId: String(roomId) } : {}),
        ...(presetId ? { presetId } : {}),
      },
    });
  } catch (err) {
    const errMsg = err.message || String(err);
    addLog(`开始战斗失败: ${errMsg}`, "error");
    message.warning("请确认全队准备就绪");
  } finally {
    isStarting.value = false;
  }
};

// 测试：打开战斗页面
const openTestBattle = () => {
  router.push({
    name: "NightmareBattle",
    query: {
      teamId: teamId.value || "14970667",
      captainTokenId: captainTokenId.value || "",
      test: "true",
    },
  });
};

// 6. 返回十殿房间（恢复已组队的战斗）
const isReturningToRoom = ref(false);

const returnToBattleRoom = async () => {
  if (!captainTokenId.value) { message.warning("请先选择队长账号"); return; }

  isReturningToRoom.value = true;
  addLog("正在查找十殿战斗房间...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接队长账号", "error");
      isReturningToRoom.value = false;
      return;
    }

    // 确保 captainRoleId 已获取
    if (!captainRoleId.value) {
      let roleInfo = tokenStore.gameData.roleInfo;
      if (!roleInfo || !roleInfo.role || !roleInfo.role.roleId) {
        roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
      }
      const roleId = roleInfo?.role?.roleId;
      if (roleId) captainRoleId.value = String(roleId);
    }

    // 尝试从 nightmare_getroleinfo 获取 roomId
    let roomId = null;
    if (captainRoleId.value) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const resp = await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            "nightmare_getroleinfo",
            { roleId: Number(captainRoleId.value) },
            10000
          );
          roomId = resp?.nightMareData?.roomId
            || resp?.nightmareData?.roomId
            || resp?.roomId
            || resp?.roomid
            || null;
          if (roomId) break;
          if (attempt < 5) await delay(2000);
        } catch {
          if (attempt < 5) await delay(2000);
        }
      }
    }

    if (roomId) {
      addLog(`找到战斗房间 RoomId: ${roomId}，正在进入...`, "success");
      router.push({
        name: "NightmareBattle",
        query: {
          teamId: teamId.value,
          captainTokenId: captainTokenId.value,
          roomId: String(roomId),
        },
      });
    } else {
      addLog("未找到进行中的十殿战斗房间，可能尚未开始战斗", "warning");
      message.warning("未找到进行中的战斗房间，请先开始战斗");
    }
  } catch (err) {
    addLog(`返回十殿房间失败: ${err.message || err}`, "error");
    message.error(`返回失败: ${err.message || err}`);
  } finally {
    isReturningToRoom.value = false;
  }
};

// 7. 解散房间
const isDismissing = ref(false);

const dismissRoom = async () => {
  if (!teamId.value || !captainTokenId.value) { message.warning("没有可解散的房间"); return; }
  isDismissing.value = true;
  addLog("解散房间 (matchteam_dismiss)...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接队长账号", "error");
      isDismissing.value = false;
      return;
    }
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_dismiss",
      { teamId: Number(teamId.value) },
      10000
    );
    addLog("房间已解散", "success");
    message.success("房间已解散");
    teamId.value = "";
    teamMembers.value = [];
    selectedTeammates.value = [];
    pageState.value = "teamBuilding";
  } catch (err) {
    addLog(`解散失败: ${err.message || err}`, "error");
  } finally {
    isDismissing.value = false;
  }
};

// ====== 预设执行：一键挑战 ======
const onPresetExecute = async (preset) => {
  presetRef.value?.close();
  message.info(`开始执行预设「${preset.name}」...`);
  addLog(`一键挑战：使用预设「${preset.name}」`, "info");

  // 保存当前预设到 sessionStorage，以便战斗失败时可重试
  sessionStorage.setItem('nightmare-current-preset', JSON.stringify(preset));

  const savedCaptain = captainTokenId.value;
  const savedTeammates = [...selectedTeammates.value];
  const savedSelectedMembers = [...selectedMemberRoleIds.value];
  const savedTeamId = teamId.value;
  const savedCaptainRoleId = captainRoleId.value;

  try {
    captainTokenId.value = preset.captainTokenId || savedCaptain;
    // 等待 watch(captainTokenId) 执行完毕，避免异步竞态清空 selectedTeammates
    await nextTick();
    selectedTeammates.value = [...(preset.memberTokenIds || [])].slice(0, 4);
    activePresetTeamSlots.value = preset.teamSlots || {};

    // 预设级别：关闭预设队伍时清空 teamSlots，跳过阵容切换
    if (preset.usePresetTeam === false) {
      activePresetTeamSlots.value = {};
      _skipFormationSwitch.value = true;
      addLog(`预设「${preset.name}」已关闭预设队伍，跳过阵容切换`, 'info');
    }

    // 每次预设执行都重置队伍状态，强制查询服务端最新状态
    teamId.value = '';
    captainRoleId.value = '';

    // 保存预设成员列表，直接传入 joinAndReady，避免被 watch 竞态清空
    const presetMemberIds = [...(preset.memberTokenIds || [])].slice(0, 4)
      .filter(tid => tokenStore.gameTokens.some(t => t.id === tid));

    addLog(`一键挑战：使用预设「${preset.name}」`, "info");
    addLog(`预设队长为：${getTokenName(captainTokenId.value)}`, "info");
    addLog(`预设队员（${presetMemberIds.length}人）：${presetMemberIds.map(t => getTokenName(t)).join(", ") || "无"}`, "info");

    // 1. 确保队长已连接
    addLog("预设执行：连接队长...", "info");
    const captainConnected = await ensureCaptainConnected();
    if (!captainConnected) {
      addLog("队长连接失败，无法执行预设", "error");
      message.error("队长连接超时，无法执行预设");
      captainTokenId.value = savedCaptain;
      selectedTeammates.value = savedTeammates;
      selectedMemberRoleIds.value = savedSelectedMembers;
      teamId.value = savedTeamId;
      captainRoleId.value = savedCaptainRoleId;
      _skipFormationSwitch.value = false;
      return;
    }
    addLog("队长连接成功", "success");

    // 2. 获取队长 roleId（如果尚未获取）
    if (!captainRoleId.value) {
      addLog("获取队长 roleId...", "info");
      try {
        const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
        const rid = roleInfo?.role?.roleId;
        if (rid) {
          captainRoleId.value = String(rid);
          const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId.value);
          if (captainToken && !captainToken.roleId) {
            captainToken.roleId = String(rid);
          }
          addLog(`队长 roleId: ${rid}`, "success");
        }
      } catch (err) {
        addLog(`获取队长 roleId 失败: ${err.message || err}`, "warning");
      }
    }

    // captainRoleId 是后续所有查询的必要参数，为空则中止
    if (!captainRoleId.value) {
      addLog("无法获取队长 roleId，中止预设执行", "error");
      message.error("无法获取队长 roleId，预设中止");
      captainTokenId.value = savedCaptain;
      selectedTeammates.value = savedTeammates;
      selectedMemberRoleIds.value = savedSelectedMembers;
      teamId.value = savedTeamId;
      captainRoleId.value = savedCaptainRoleId;
      _skipFormationSwitch.value = false;
      return;
    }

    // 3. 检查是否已有队伍/战斗房间，或创建新房间
    let hasActiveBattle = false;
    let existingRoomId = null;

    if (!teamId.value) {
      // 先查询队长是否已有队伍
      addLog('查询队长是否已有组队...', 'info');
      let existingTeamId = null;
      try {
        const roleTeamRes = await tokenStore.sendMessageWithPromise(
          captainTokenId.value,
          'matchteam_getroleteaminfo',
          { roleID: Number(captainRoleId.value) },
          10000
        );
        existingTeamId = roleTeamRes?.teamInfo?.teamId;
        if (!existingTeamId) {
          const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
          const keys = Object.keys(gDMTData);
          if (keys.length > 0) {
            const numKeys = keys.filter(k => /^\d+$/.test(k));
            existingTeamId = gDMTData[numKeys[0] || keys[0]]?.teamId;
          }
        }
      } catch (err) {
        addLog(`查询队伍信息失败: ${err.message || err}`, 'warning');
      }

      if (existingTeamId) {
        // 检查是否是已处理的残留队伍（避免重复检测）
        if (_dismissedStaleTeams.has(String(existingTeamId))) {
          addLog(`队伍 ${existingTeamId} 已标记为残留，跳过检测`, 'info');
          existingTeamId = null;
        }
      }

      if (existingTeamId) {
        // 已有队伍 → 先检查是否有进行中的战斗房间
        if (captainRoleId.value) {
          try {
            const nightResp = await tokenStore.sendMessageWithPromise(
              captainTokenId.value,
              'nightmare_getroleinfo',
              { roleId: Number(captainRoleId.value) },
              10000
            );
            existingRoomId = nightResp?.nightMareData?.roomId
              || nightResp?.nightmareData?.roomId
              || nightResp?.roomId
              || nightResp?.roomid
              || null;
          } catch { /* 没有战斗房间 */ }
        }

        if (existingRoomId) {
          // 有进行中的战斗房间
          const alreadyRunning = activeBattles.value.find(b =>
            b.preset.captainTokenId === captainTokenId.value &&
            (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')
          );
          if (alreadyRunning) {
            addLog(`该队长已有后台战斗「${alreadyRunning.preset.name}」，跳过本次执行`, 'warning');
            captainTokenId.value = savedCaptain;
            selectedTeammates.value = savedTeammates;
            selectedMemberRoleIds.value = savedSelectedMembers;
            teamId.value = savedTeamId;
            captainRoleId.value = savedCaptainRoleId;
            _skipFormationSwitch.value = false;
            return;
          }
          addLog(`✅ 发现进行中的战斗房间 RoomId: ${existingRoomId}，接管继续挑战`, 'success');
          teamId.value = String(existingTeamId);
          hasActiveBattle = true;
        } else {
          // 队伍存在但无战斗房间 → 过期残留
          addLog(`发现过期残留队伍 TeamId: ${existingTeamId}（无活跃战斗）`, 'warning');
          let dismissSuccess = false;

          // 获取队伍详情确认是否队长
          let isLeader = true;
          try {
            const teamInfoRes = await tokenStore.sendMessageWithPromise(
              captainTokenId.value, 'matchteam_getteaminfo',
              { teamId: existingTeamId }, 10000
            );
            const leaderId = String(teamInfoRes?.teamInfo?.leaderId || '');
            isLeader = (leaderId === String(captainRoleId.value));
          } catch { /* 无法获取队伍信息，默认尝试解散 */ }

          if (isLeader) {
            try {
              await tokenStore.sendMessageWithPromise(
                captainTokenId.value, 'matchteam_dismiss',
                { teamId: Number(existingTeamId) }, 10000
              );
              addLog('残留队伍已解散', 'success');
              dismissSuccess = true;
            } catch (dismissErr) {
              const errMsg = dismissErr.message || String(dismissErr);
              if (errMsg.includes('200020') || errMsg.includes('6100020')) {
                addLog('残留队伍已不存在，继续创建', 'info');
                dismissSuccess = true;
              } else {
                addLog(`解散残留队伍失败: ${errMsg}，中止本次执行`, 'error');
              }
            }
          } else {
            // 非队长：退出队伍
            addLog('当前不是队长，正在退出残留队伍...', 'warning');
            try {
              await tokenStore.sendMessageWithPromise(
                captainTokenId.value, 'matchteam_leave',
                { teamId: Number(existingTeamId) }, 10000
              );
              addLog('已退出残留队伍，继续创建', 'success');
              dismissSuccess = true;
            } catch (leaveErr) {
              const errMsg = leaveErr.message || String(leaveErr);
              if (errMsg.includes('200020') || errMsg.includes('6100020')) {
                addLog('残留队伍已不存在，继续创建', 'info');
                dismissSuccess = true;
              } else {
                addLog(`退出残留队伍失败: ${errMsg}，中止本次执行`, 'error');
              }
            }
          }
          // 标记为已处理的残留队伍（无论成功与否，避免重复检测）
          if (dismissSuccess) {
            _dismissedStaleTeams.add(String(existingTeamId));
          }
          // 解散失败则中止本次预设
          if (!dismissSuccess) {
            captainTokenId.value = savedCaptain;
            selectedTeammates.value = savedTeammates;
            selectedMemberRoleIds.value = savedSelectedMembers;
            teamId.value = savedTeamId;
            captainRoleId.value = savedCaptainRoleId;
            _skipFormationSwitch.value = false;
            return;
          }
          await delay(1000);
          addLog('预设执行：创建房间...', 'info');
          await createRoom();
          addLog('等待服务器就绪...', 'info');
          await delay(3000);
        }
      } else {
        // 没有队伍，创建新房间
        addLog('预设执行：创建房间...', 'info');
        await createRoom();
        if (!teamId.value) {
          addLog('创建房间未成功，尝试解散现有队伍后重试...', 'warning');
          try {
            const roleTeamRes = await tokenStore.sendMessageWithPromise(
              captainTokenId.value,
              'matchteam_getroleteaminfo',
              { roleID: Number(captainRoleId.value) },
              10000
            );
            let oldTeamId = roleTeamRes?.teamInfo?.teamId;
            if (!oldTeamId) {
              const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
              const keys = Object.keys(gDMTData);
              if (keys.length > 0) {
                const numKeys = keys.filter(k => /^\d+$/.test(k));
                oldTeamId = gDMTData[numKeys[0] || keys[0]]?.teamId;
              }
            }
            if (oldTeamId) {
              addLog(`发现旧队伍 TeamId: ${oldTeamId}，正在解散...`, 'info');
              await tokenStore.sendMessageWithPromise(
                captainTokenId.value,
                'matchteam_dismiss',
                { teamId: Number(oldTeamId) },
                10000
              );
              addLog('旧队伍已解散，重新创建房间...', 'info');
              await delay(1000);
              await createRoom();
            }
          } catch (dismissErr) {
            addLog(`解散旧队伍失败: ${dismissErr.message || dismissErr}`, 'error');
          }
        }
        addLog('等待服务器就绪...', 'info');
        await delay(3000);
      }
    }

    // 4. 队员连接、加入并准备（已有战斗时跳过）
    if (!hasActiveBattle) {
      if (presetMemberIds.length > 0) {
        addLog(`预设执行：队员加入并准备（${presetMemberIds.length}人）...`, 'info');
        const allJoined = await joinAndReady(presetMemberIds);
        if (!allJoined) {
          addLog('部分成员连接失败，无法开始战斗', 'error');
          message.error('部分成员连接超时，无法开始十殿挑战');
          captainTokenId.value = savedCaptain;
          selectedTeammates.value = savedTeammates;
          selectedMemberRoleIds.value = savedSelectedMembers;
          teamId.value = savedTeamId;
          captainRoleId.value = savedCaptainRoleId;
          _skipFormationSwitch.value = false;
          return;
        }
      } else {
        addLog('预设未配置队员，将仅以队长开始战斗', 'warning');
      }
    } else {
      addLog('已有进行中的战斗，跳过队员加入步骤', 'info');
    }

    // 5. 开始战斗
    addLog('预设执行：开始战斗...', 'info');

    // 已有活跃战斗或后台模式均走后台服务
    if (hasActiveBattle || isBackgroundMode.value) {
      // === 后台模式：启动后台战斗服务，立即返回 ===
      const roomId = hasActiveBattle
        ? existingRoomId
        : await openTeamAndGetRoomId();
      if (!roomId) {
        addLog('无法获取 RoomId，后台战斗启动失败', 'error');
        message.error('无法获取战斗房间 ID');
        return;
      }

      const battle = new NightmareAutoBattleService({
        captainTokenId: captainTokenId.value,
        roomId,
        teamId: teamId.value,
        presetData: preset,
        captainRoleId: captainRoleId.value,
        tokenStore,
        onLog: (msg, type) => addLog(msg, type),
        onStatusChange: (info) => handleBattleStatusChange(preset, info),
        onComplete: (result) => handleBattleComplete(preset, result),
        onError: (err) => handleBattleError(preset, err),
      });

      activeBattles.value.push({
        preset,
        battle,
        roomId: battle.getRoomId(),
        status: 'running',
        currentLevel: 0,
        startedAt: new Date().toLocaleTimeString(),
      });

      battle.start(); // 异步启动，不等待
      addLog(`✅ 预设「${preset.name}」已在后台启动战斗`, 'success');

      // 保存后台战斗预设到 sessionStorage，以便重新打开时自动恢复
      sessionStorage.setItem('nightmare-last-battle-preset', JSON.stringify({
        presetId: preset.id,
        presetName: preset.name,
        captainTokenId: captainTokenId.value,
        captainRoleId: captainRoleId.value,
        memberTokenIds: preset.memberTokenIds || [],
        teamSlots: preset.teamSlots || {},
        roomId: battle.getRoomId(),
        startedAt: new Date().toISOString(),
      }));

      // 恢复状态，准备执行下一个预设
      captainTokenId.value = savedCaptain;
      selectedTeammates.value = savedTeammates;
      selectedMemberRoleIds.value = savedSelectedMembers;
      teamId.value = savedTeamId;
      captainRoleId.value = savedCaptainRoleId;
      _skipFormationSwitch.value = false;
    } else {
      // === 前台模式：原有逻辑，跳转战斗页面 ===
      await startBattle(preset.id);
    }
  } catch (err) {
    addLog(`预设执行失败: ${err.message || err}`, "error");
    message.error(`预设执行失败: ${err.message || err}`);
    captainTokenId.value = savedCaptain;
    selectedTeammates.value = savedTeammates;
    selectedMemberRoleIds.value = savedSelectedMembers;
    teamId.value = savedTeamId;
    captainRoleId.value = savedCaptainRoleId;
    _skipFormationSwitch.value = false;
  }
};

// ====== 预设队列执行 ======
const PRESET_QUEUE_KEY = 'nightmare-preset-queue';

const onPresetExecuteAll = async (presets) => {
  if (!presets || presets.length === 0) return;

  if (isBackgroundMode.value) {
    // === 后台模式：逐个启动，有成员冲突时等待完成 ===
    addLog(`📝 后台模式：将逐个启动 ${presets.length} 个预设`, "info");
    for (let i = 0; i < presets.length; i++) {
      const current = presets[i];
      const currentMembers = new Set([
        current.captainTokenId,
        ...(current.memberTokenIds || []).slice(0, 4),
      ].filter(Boolean));

      // 检查是否与正在运行的预设共享成员
      if (i > 0) {
        const conflicting = activeBattles.value.filter(b => {
          if (b.status !== 'running' && b.status !== 'cooling' && b.status !== 'waiting_midnight') return false;
          const otherMembers = new Set([
            b.preset.captainTokenId,
            ...(b.preset.memberTokenIds || []).slice(0, 4),
          ].filter(Boolean));
          return [...currentMembers].some(m => otherMembers.has(m));
        });

        if (conflicting.length > 0) {
          const names = conflicting.map(b => `「${b.preset.name}」`).join(', ');
          addLog(`⏳ 预设「${current.name}」与 ${names} 存在共同成员，等待其完成...`, 'warning');
          // 轮询等待冲突预设完成（最多等待30分钟）
          const maxWait = 30 * 60 * 1000;
          const startTime = Date.now();
          while (Date.now() - startTime < maxWait) {
            await delay(5000);
            const stillRunning = conflicting.some(b =>
              activeBattles.value.find(ab =>
                ab.preset.id === b.preset.id &&
                (ab.status === 'running' || ab.status === 'cooling' || ab.status === 'waiting_midnight')
              )
            );
            if (!stillRunning) {
              addLog(`✅ 冲突预设已完成，继续执行「${current.name}」`, 'success');
              await delay(2000); // 等待服务端队伍解散生效
              break;
            }
          }
          if (Date.now() - startTime >= maxWait) {
            addLog(`⚠️ 等待超时（30分钟），强制继续执行「${current.name}」`, 'warning');
          }
        } else {
          // 无冲突，按正常间隔启动
          addLog(`等待 ${staggerDelay.value/1000}秒后启动下一个预设...`, "info");
          await delay(staggerDelay.value);
        }
      }

      addLog(`▶️ 启动预设「${current.name}」(${i+1}/${presets.length})`, "info");
      await onPresetExecute(current);
    }
    addLog(`✅ 所有 ${presets.length} 个预设已启动后台战斗`, "success");
  } else {
    // === 前台模式：原有串行逻辑 ===
    const queue = presets.map(p => ({ ...p }));
    sessionStorage.setItem(PRESET_QUEUE_KEY, JSON.stringify(queue));
    const first = queue.shift();
    sessionStorage.setItem(PRESET_QUEUE_KEY, JSON.stringify(queue));
    addLog(`📝 预设队列已建立，共 ${presets.length} 个预设，当前执行: 「${first.name}」`, "info");
    onPresetExecute(first);
  }
};

// 从 sessionStorage 获取剩余队列
const getPresetQueue = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PRESET_QUEUE_KEY) || '[]');
  } catch { return []; }
};

// 执行队列中的下一个预设
const executeNextPresetInQueue = async () => {
  const queue = getPresetQueue();
  if (queue.length === 0) {
    addLog('✅ 所有预设已执行完毕！', 'success');
    message.success('所有预设已执行完毕！');
    sessionStorage.removeItem(PRESET_QUEUE_KEY);
    return;
  }
  const next = queue.shift();
  sessionStorage.setItem(PRESET_QUEUE_KEY, JSON.stringify(queue));
  addLog(`▶️ 继续执行下一个预设: 「${next.name}」(剩余 ${queue.length} 个)`, 'info');
  message.info(`继续执行预设: 「${next.name}」(剩余 ${queue.length} 个)`);

  // 重置状态前先解散服务器上的现有队伍
  if (teamId.value && captainTokenId.value) {
    addLog("检测到现有队伍，正在解散...", "info");
    try {
      await tokenStore.sendMessageWithPromise(
        captainTokenId.value,
        "matchteam_dismiss",
        { teamId: Number(teamId.value) },
        10000
      );
      addLog("现有队伍已解散", "success");
    } catch (err) {
      addLog(`解散现有队伍失败: ${err.message || err}，继续执行...`, "warning");
    }
  }

  // 重置状态
  teamId.value = '';
  teamMembers.value = [];
  selectedTeammates.value = [];
  selectedMemberRoleIds.value = [];
  activePresetTeamSlots.value = {};
  captainRoleId.value = '';
  pageState.value = 'teamBuilding';

  await delay(2000); // 等待2秒确保状态重置
  await onPresetExecute(next);
};

const getTokenName = (tokenId) => {
  if (!tokenId) return "未知";
  const t = tokenStore.gameTokens.find((t) => t.id === tokenId);
  return t ? t.name : tokenId.slice(0, 8);
};
</script>

<style scoped lang="scss">
.nightmare-challenge-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #333);
  text-align: center;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--primary-color, #1677ff);
}

.init-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  .init-text {
    color: var(--text-secondary, #888);
    font-size: 13px;
  }
}

.captain-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e0e0e0);

  .captain-info {
    display: flex;
    align-items: center;
    gap: 6px;
    .label {
      font-weight: 600;
      color: var(--text-secondary, #888);
      white-space: nowrap;
      font-size: 13px;
    }
  }
  .captain-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.teammate-section {
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e0e0e0);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    .section-title {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-primary, #333);
    }
    .section-hint {
      font-size: 11px;
      color: var(--text-tertiary, #aaa);
    }
  }
  .teammate-select {
    width: 100%;
  }
}

.action-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.fighting-section {
  padding: 12px;
  background: rgba(34, 197, 94, 0.04);
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  .fighting-hint {
    margin-top: 8px;
    text-align: center;
    color: var(--text-secondary, #888);
    font-size: 12px;
  }
}

.team-members-section {
  padding: 10px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e0e0e0);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    .section-title {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-primary, #333);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
  }

  .member-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--bg-primary, #fff);
    border-radius: 6px;
    border: 1.5px solid var(--border-color, #e0e0e0);
    transition: border-color 0.2s;
    &.captain {
      border-color: var(--primary-color, #1677ff);
    }
    &.prepared {
      border-color: rgba(34, 197, 94, 0.5);
    }

    .member-avatar {
      position: relative;
      flex-shrink: 0;
      .member-checkbox {
        position: absolute;
        top: -4px;
        left: -4px;
        z-index: 2;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        padding: 2px;
      }
      .avatar-img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
      .avatar-placeholder {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--primary-color, #1677ff);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
      }
      .member-prepared-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        font-size: 11px;
        background: #fff;
        border-radius: 50%;
        width: 15px;
        height: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    .member-info {
      flex: 1;
      min-width: 0;
      .member-name {
        font-weight: 600;
        font-size: 13px;
        color: var(--text-primary, #333);
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .member-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        .meta-item {
          font-size: 11px;
          color: var(--text-secondary, #888);
        }
      }
      .member-status-row {
        margin-top: 3px;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        .status-label {
          color: var(--text-secondary, #888);
          font-size: 11px;
        }
        .pillow-normal {
          font-weight: 600;
          color: var(--text-primary, #333);
        }
        .pillow-zero {
          font-weight: 600;
          color: #d03050;
        }
        .pillow-warning {
          font-weight: 600;
          color: #d03050;
          font-size: 10px;
        }
      }
    }

    .member-actions {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex-shrink: 0;
    }
  }
}

.active-battles-section {
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: var(--bg-secondary, #f9f9f9);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .section-title {
      font-weight: 600;
      font-size: 13px;
    }
  }

  .battle-status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    border-bottom: 1px dashed var(--border-color, #e8e8e8);

    &:last-child { border-bottom: none; }

    .battle-preset-name {
      font-weight: 500;
      font-size: 12px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .battle-time {
      font-size: 10px;
      color: var(--text-tertiary, #aaa);
      flex-shrink: 0;
    }

    .boss-hp-tag {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      background: #e8f5e9;
      color: #2e7d32;
      white-space: nowrap;
      flex-shrink: 0;
      &.boss-mid {
        background: #fff3e0;
        color: #e65100;
      }
      &.boss-low {
        background: #ffebee;
        color: #c62828;
      }
    }
  }
}

.log-section {
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    .log-title {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-primary, #333);
    }
  }
  .log-container {
    max-height: 180px;
    overflow-y: auto;
    padding: 6px 10px;
    background: #1a1a2e;
    font-family: "SF Mono", "Monaco", "Consolas", monospace;
    font-size: 11px;
    line-height: 1.5;
    .log-entry {
      display: flex;
      gap: 6px;
      padding: 1px 0;
      .log-time {
        color: #888;
        flex-shrink: 0;
        font-size: 10px;
      }
      .log-msg {
        color: #ccc;
      }
      &.success .log-msg {
        color: #52c41a;
      }
      &.error .log-msg {
        color: #ff4d4f;
      }
      &.warning .log-msg {
        color: #faad14;
      }
    }
    .log-empty {
      color: #666;
      text-align: center;
      padding: 12px;
    }
  }
}

/* 手机端适配 */
@media (max-width: 768px) {
  .captain-section {
    flex-direction: column;
    align-items: flex-start;
    .captain-info {
      width: 100%;
      :deep(.n-select) {
        flex: 1;
      }
    }
    .captain-actions {
      width: 100%;
      flex-wrap: wrap;
      > :deep(.n-button) {
        flex: 1;
        min-width: 0;
      }
    }
  }
  .action-section {
    flex-direction: column;
    > button,
    > :deep(.n-button) {
      width: 100%;
    }
  }
  .team-members-section .members-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .member-card {
    flex-wrap: wrap;
    .member-actions {
      flex-direction: row;
      width: 100%;
      justify-content: flex-end;
      margin-top: 4px;
    }
  }
}
</style>
