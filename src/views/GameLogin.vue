<template>
  <div class="game-login-page">
    <!-- 移动端顶部标签切换栏 -->
    <div v-if="isMobile" class="mobile-tab-bar">
      <div :class="['mobile-tab', activeMobileTab === 'control' && 'active']" @click="activeMobileTab = 'control'">
        📋 控制台
        <span v-if="iframeList.length > 0" class="mobile-tab-badge">{{ iframeList.length }}</span>
      </div>
      <div :class="['mobile-tab', activeMobileTab === 'game' && 'active']" @click="activeMobileTab = 'game'">
        🎮 游戏
        <span v-if="iframeList.length > 0" class="mobile-tab-badge">{{ iframeList.length }}</span>
      </div>
    </div>
    <div class="split-layout" :class="{ 'mobile-layout': isMobile, 'panel-collapsed': leftPanelCollapsed && !isMobile }">
      <!-- 左侧：控制面板 -->
      <div
        class="left-panel"
        :style="isMobile ? {} : { width: leftPanelWidth + 'px' }"
        v-show="(!isMobile || activeMobileTab === 'control') && !leftPanelCollapsed"
      >
        <!-- 收起按钮 -->
        <div v-if="!isMobile" class="panel-collapse-btn" @click="leftPanelCollapsed = true" title="收起面板">
          ◀
        </div>
        <!-- 顶部统计 -->
        <div class="stat-row">
          <div class="mini-stat">
            <span class="mini-label">已选</span>
            <span class="mini-val text-blue">{{ selectedTokenIds.length }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">已登录</span>
            <span class="mini-val text-green">{{ iframeList.length }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">总数</span>
            <span class="mini-val">{{ tokenStore.gameTokens.length }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <n-button-group size="small">
            <n-button @click="selectAll" :type="isAllSelected ? 'primary' : 'default'" ghost size="small">
              {{ isAllSelected ? '取消全选' : '全选' }}
            </n-button>
            <n-button @click="selectInverse" ghost size="small">反选</n-button>
          </n-button-group>
          <n-button
            type="success" size="small"
            :disabled="selectedTokenIds.length === 0 || isBatchOpening"
            :loading="isBatchOpening"
            @click="batchLogin"
          >
            🎮 批量登录 ({{ selectedTokenIds.length }})
          </n-button>
          <n-button type="error" size="small" :disabled="iframeList.length === 0" @click="exitAll">
            ✖ 退出全部
          </n-button>
        </div>

        <!-- 同步控制 -->
        <div v-if="iframeList.length > 1" class="sync-bar">
          <span class="sync-label">📡 操作同步</span>
          <n-switch
            v-model:value="syncEnabled"
            size="small"
            @update:value="onSyncToggle"
          />
          <span :class="['sync-status', syncEnabled ? 'sync-on' : 'sync-off']">
            {{ syncEnabled ? '已开启' : '已关闭' }}
          </span>
          <span v-if="syncEnabled" style="font-size:10px;color:#888;">{{ iframeList.length }}个窗口</span>
        </div>

        <!-- 游戏增强 -->
        <div class="script-section">
          <div class="script-header" @click="enhanceCollapsed = !enhanceCollapsed" style="cursor:pointer;">
            <span style="font-size:12px;font-weight:500;">🔧 游戏增强 ({{ enabledEnhancementCount }}/{{ ENHANCEMENTS.length }})</span>
            <span style="font-size:10px;color:#aaa;">{{ enhanceCollapsed ? '▶' : '▼' }}</span>
          </div>
          <div v-show="!enhanceCollapsed" class="enhance-scroll">
            <template v-for="grp in enhanceGroups" :key="grp.name">
              <div class="enhance-group-label">{{ grp.name }} ({{ grp.items.filter(e => enhancementState[e.key]).length }}/{{ grp.items.length }})</div>
              <div class="enhance-grid">
                <div v-for="enh in grp.items" :key="enh.key" class="enhance-item" @click="toggleEnhancement(enh.key, !enhancementState[enh.key])">
                  <n-switch :value="enhancementState[enh.key]" size="small" @update:value="(v) => toggleEnhancement(enh.key, v)" @click.stop />
                  <div class="enhance-text">
                    <span class="enhance-name">{{ enh.name }}<span v-if="enh.file" class="enhance-file-badge">F</span></span>
                    <span class="enhance-desc">{{ enh.desc }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 脚本管理 -->
        <div class="script-section">
          <div class="script-header" @click="scriptCollapsed = !scriptCollapsed" style="cursor:pointer;">
            <span style="font-size:12px;font-weight:500;">⚡ JS 脚本 ({{ scripts.filter(s => s.enabled).length }}/{{ scripts.length }})</span>
            <div style="display:flex;gap:4px;align-items:center;">
              <n-button size="tiny" type="primary" @click.stop="openAddScript">+ 添加</n-button>
              <span style="font-size:10px;color:#aaa;">{{ scriptCollapsed ? '▶' : '▼' }}</span>
            </div>
          </div>
          <div v-show="!scriptCollapsed" class="script-list">
            <div v-if="scripts.length === 0" style="font-size:11px;color:#999;padding:6px 12px;">暂无脚本，点击添加</div>
            <div v-for="script in scripts" :key="script.id" class="script-item">
              <div class="script-info">
                <n-switch :value="script.enabled" size="small" @update:value="(v) => toggleScript(script.id, v)" />
                <span class="script-name" :title="script.name">{{ script.name }}</span>
              </div>
              <div class="script-actions">
                <n-button size="tiny" text type="info" @click="editScript(script)">编辑</n-button>
                <n-button size="tiny" text type="error" @click="removeScript(script.id)">删除</n-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 脚本编辑弹窗 -->
        <n-modal v-model:show="showScriptModal" preset="card" :title="editingScriptId ? '编辑脚本' : '添加脚本'" style="width:520px;max-width:95vw;">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <n-input v-model:value="scriptForm.name" placeholder="脚本名称" size="small" />
            <div style="display:flex;gap:6px;align-items:center;">
              <n-button size="small" @click="importScriptFile">📂 导入文件</n-button>
              <input ref="fileInputRef" type="file" accept=".js,.txt" style="display:none" @change="onFileSelected" />
              <span style="font-size:11px;color:#999;">支持 .js / .txt 文件</span>
            </div>
            <n-input
              v-model:value="scriptForm.code"
              type="textarea"
              placeholder="// 在此输入 JS 代码&#10;// 脚本将在游戏加载完成后自动执行&#10;console.log('hello from script!');"
              :autosize="{ minRows: 8, maxRows: 20 }"
              style="font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;"
            />
          </div>
          <template #footer>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <n-button size="small" @click="showScriptModal = false">取消</n-button>
              <n-button size="small" type="primary" @click="saveScript" :disabled="!scriptForm.name || !scriptForm.code">保存</n-button>
            </div>
          </template>
        </n-modal>

        <!-- 日志区 -->
        <div v-if="logs.length > 0" class="log-area">
          <div class="log-header" @click="logCollapsed = !logCollapsed" style="cursor:pointer;">
            <span>📋 日志 ({{ logs.length }}) <span style="font-size:10px;color:#aaa;">{{ logCollapsed ? '▶' : '▼' }}</span></span>
            <n-button size="tiny" @click.stop="logs = []">清空</n-button>
          </div>
          <div v-show="!logCollapsed" class="log-list">
            <div v-for="(log, idx) in logs" :key="idx" :class="['log-item', 'log-' + log.type]">
              <span class="log-time">{{ log.time }}</span>{{ log.message }}
            </div>
          </div>
        </div>

        <!-- 账号列表 -->
        <div class="token-section">
          <div class="token-section-header" @click="tokenListCollapsed = !tokenListCollapsed" style="cursor:pointer;">
            <span style="font-size:12px;font-weight:500;">账号列表</span>
            <div style="display:flex;align-items:center;gap:6px;">
              <n-input
                v-model:value="searchKeyword"
                placeholder="搜索账号..."
                size="small"
                clearable
                style="width: 140px;"
                @click.stop
              />
              <span style="font-size: 12px; color: #888;">{{ filteredTokens.length }} 个</span>
              <span class="login-group-toggle">{{ tokenListCollapsed ? '▼' : '▲' }}</span>
            </div>
          </div>
          <div v-show="!tokenListCollapsed" class="token-section-body">
          <!-- 分组快捷选择 -->
          <div v-if="tokenGroups.length > 0" class="login-group-wrapper">
            <div class="login-group-header" @click.stop="loginGroupCollapsed = !loginGroupCollapsed">
              <span class="login-group-title">分组选择</span>
              <span class="login-group-toggle">{{ loginGroupCollapsed ? '▼' : '▲' }}</span>
            </div>
            <div v-show="!loginGroupCollapsed" class="login-group-selector">
              <div
                v-for="group in tokenGroups"
                :key="group.id"
                class="login-group-chip"
                :class="{ 'is-active': loginGroupSelected.includes(group.id) }"
                :style="{
                  borderColor: group.color,
                  backgroundColor: loginGroupSelected.includes(group.id) ? group.color : 'transparent',
                  color: loginGroupSelected.includes(group.id) ? '#fff' : group.color,
                }"
                @click="selectByGroup(group.id)"
              >
                {{ group.name }}({{ tokenStore.getValidGroupTokenIds(group.id).length }})
              </div>
            </div>
          </div>
          <n-checkbox-group v-model:value="selectedTokenIds">
            <div class="token-scroll">
              <div
                v-for="token in filteredTokens" :key="token.id"
                :class="['token-item', { 'token-opened': hasIframe(token.id), 'token-dragging': dragTokenId === token.id }]"
                :draggable="!isMobile"
                @dragstart="onDragStart($event, token)"
                @dragend="onDragEnd"
              >
                <n-checkbox :value="token.id" size="medium">
                  <span class="token-name"><span class="drag-handle">☰</span>{{ token.name }}</span>
                </n-checkbox>
                <div class="token-meta">
                  <span class="token-server">{{ token.server || '未知服' }}</span>
                  <span :class="['token-status', 'status-' + getTokenStatus(token.id)]">
                    {{ getStatusLabel(token.id) }}
                  </span>
                </div>
                <div class="token-actions">
                  <template v-if="hasIframe(token.id)">
                    <n-button size="tiny" type="error" text @click="exitSingle(token.id)">退出</n-button>
                  </template>
                  <template v-else>
                    <n-button
                      size="tiny" type="success" text
                      :loading="openingTokenId === token.id"
                      @click="loginSingle(token.id)"
                    >登录</n-button>
                  </template>
                </div>
              </div>
            </div>
          </n-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 收起时的展开按钮 -->
      <div v-if="leftPanelCollapsed && !isMobile" class="panel-expand-btn" @click="leftPanelCollapsed = false" title="展开面板">
        <span>▶</span>
        <span style="font-size:10px;writing-mode:vertical-lr;margin-top:4px;">控制台</span>
      </div>

      <!-- 可拖拽分隔条 -->
      <div
        v-if="!isMobile && !leftPanelCollapsed"
        class="resize-handle"
        @mousedown="startResize"
        @dblclick="resetPanelWidth"
      >
        <div class="resize-grip"></div>
      </div>

      <!-- 右侧：游戏画面网格 -->
      <div
        class="right-panel"
        ref="rightPanelRef"
        v-show="!isMobile || activeMobileTab === 'game'"
        :class="{ 'drop-active': isDragOver, 'is-resizing': isResizing }"
        @dragover.prevent="onDragOver"
        @dragenter.prevent="onDragEnter"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <!-- 移动端浮动同步控制条 -->
        <div v-if="isMobile && iframeList.length > 1" class="mobile-sync-float" :class="{ 'sync-active': syncEnabled }">
          <div class="mobile-sync-left" @click="onSyncToggle(!syncEnabled)">
            <span class="mobile-sync-icon">📡</span>
            <span class="mobile-sync-text">{{ syncEnabled ? '同步中' : '同步' }}</span>
            <span class="mobile-sync-badge">{{ iframeList.length }}/{{ iframeList.length }}</span>
          </div>
          <div class="mobile-sync-toggle" :class="syncEnabled ? 'on' : 'off'" @click.stop="onSyncToggle(!syncEnabled)">
            <div class="mobile-sync-knob"></div>
          </div>
        </div>
        <!-- 拖拽时遮罩层，防止iframe吃鼠标事件 -->
        <div v-if="isResizing" class="resize-overlay"></div>
        <div v-if="iframeList.length === 0" class="empty-game">
          <div style="font-size: 48px; margin-bottom: 12px;">🎮</div>
          <div style="color: #999; font-size: 14px;">拖拽账号到这里 或 点击「登录」开始游戏</div>
          <div v-if="isDragOver" class="drop-hint">📌 松开即可登录</div>
        </div>
        <template v-else>
          <!-- 顶部工具栏 -->
          <div class="grid-toolbar">
            <span style="font-size: 12px; color: #8899aa;">{{ iframeList.length }} 个游戏在线</span>
            <div v-if="iframeList.length > 1" class="grid-sync-toggle" :class="{ 'sync-on': syncEnabled }" @click="onSyncToggle(!syncEnabled)">
              <span class="sync-icon">📡</span>
              <span>{{ syncEnabled ? '同步中' : '同步' }}</span>
              <span class="sync-dot" :class="syncEnabled ? 'on' : 'off'"></span>
            </div>
            <div class="grid-col-selector">
              <span class="col-label">列数:</span>
              <n-button size="tiny" :type="gridColsMode==='auto'?'primary':'default'" ghost @click="gridColsMode='auto'">
                自动({{ autoCols }})
                <span v-if="!isMobile" style="font-size:9px;color:#888;margin-left:3px;">{{ gridWidth }}×{{ gridHeight }}</span>
              </n-button>
              <template v-if="!isMobile">
                <n-button v-for="n in 10" :key="n" size="tiny" :type="gridColsMode===n?'primary':'default'" ghost @click="gridColsMode=n">{{ n }}</n-button>
              </template>
              <template v-else>
                <n-button size="tiny" :type="gridColsMode===1?'primary':'default'" ghost @click="gridColsMode=1">1</n-button>
                <n-button size="tiny" :type="gridColsMode===2?'primary':'default'" ghost @click="gridColsMode=2">2</n-button>
                <n-button size="tiny" :type="gridColsMode===3?'primary':'default'" ghost @click="gridColsMode=3">3</n-button>
              </template>
            </div>
          </div>
          <!-- 网格容器 -->
          <div class="game-grid" ref="gameGridRef" :class="{ 'grid-redrawing': gridRedrawing }" :style="gridStyle">
            <div v-for="item in iframeList" :key="item.tokenId" class="game-cell">
              <div class="cell-header">
                <span class="cell-name">{{ item.name }}</span>
                <div class="cell-actions">
                  <span class="cell-btn cell-refresh" title="刷新重登" @click="refreshSingle(item.tokenId)">↻</span>
                  <span class="cell-btn cell-close" title="关闭" @click="exitSingle(item.tokenId)">✕</span>
                </div>
              </div>
              <iframe
                :ref="el => { if (el) { iframeRefs[item.tokenId] = el; el.onload = () => onIframeLoad(item.tokenId); } }"
                :src="item.url"
                class="cell-iframe"
                frameborder="0"
                allowfullscreen
              ></iframe>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useTokenStore, gameTokens, tokenGroups } from '@/stores/tokenStore';
import { useMessage } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import useIndexedDB from '@/hooks/useIndexedDB';
import { g_utils } from '@/utils/bonProtocol';

const message = useMessage();
const tokenStore = useTokenStore();
const router = useRouter();
const route = useRoute();
const { getArrayBuffer } = useIndexedDB();

// ── 移动端检测与标签切换 ──
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const isMobile = computed(() => windowWidth.value <= 768);
const activeMobileTab = ref('control'); // 'control' | 'game'

// 监听窗口尺寸变化
function _onResize() { windowWidth.value = window.innerWidth; }
onMounted(() => {
  window.addEventListener('resize', _onResize);
  // ★ APK环境: 处理autoLogin查询参数，自动登录指定token
  const autoLoginId = route.query.autoLogin;
  if (autoLoginId) {
    nextTick(async () => {
      const token = tokenStore.gameTokens.find(t => t.id === autoLoginId);
      if (token) {
        addLog(`🚀 自动登录: ${token.name}...`, 'info');
        try {
          await loginInIframe(token);
          addLog(`✅ ${token.name}: 自动登录成功`, 'success');
          message.success(`${token.name}: 已自动登录`);
          // 自动切换到游戏标签
          if (isMobile.value) {
            activeMobileTab.value = 'game';
          }
        } catch (err) {
          addLog(`❌ ${token.name}: 自动登录失败 - ${err.message}`, 'error');
          message.error(`${token.name}: 自动登录失败`);
        }
      } else {
        addLog(`⚠ 未找到token: ${autoLoginId}`, 'warning');
      }
    });
  }
});
onBeforeUnmount(() => { window.removeEventListener('resize', _onResize); });

// ── 状态 ──
const selectedTokenIds = ref([]);
const searchKeyword = ref('');

// 分组快捷选择
const loginGroupSelected = ref([]);
const loginGroupCollapsed = ref(true);
const tokenListCollapsed = ref(false);
const selectByGroup = (groupId) => {
  const idx = loginGroupSelected.value.indexOf(groupId);
  const groupTokenIds = tokenStore.getValidGroupTokenIds(groupId);
  if (idx >= 0) {
    loginGroupSelected.value.splice(idx, 1);
    selectedTokenIds.value = selectedTokenIds.value.filter(id => !groupTokenIds.includes(id));
  } else {
    loginGroupSelected.value.push(groupId);
    const existing = new Set(selectedTokenIds.value);
    groupTokenIds.forEach(id => existing.add(id));
    selectedTokenIds.value = [...existing];
  }
};
const isBatchOpening = ref(false);
const openingTokenId = ref(null);
const logs = ref([]);
const logCollapsed = ref(false);

// ── 脚本管理 ──
const SCRIPTS_KEY = '__game_scripts__';
const scripts = ref([]);
const scriptCollapsed = ref(false);
const showScriptModal = ref(false);
const editingScriptId = ref(null);
const scriptForm = reactive({ name: '', code: '' });
const fileInputRef = ref(null);

// ── 游戏增强功能 ──
const ENHANCE_KEY = '__game_enhancements__';
const ENHANCEMENTS = [
  // ── 基础增强（内联代码）──
  { key: 'skipPopup', name: '跳过弹窗', desc: '自动关闭弹窗/公告/确认框', group: '基础' },
  { key: 'skipAd', name: '广告跳过', desc: '拦截激励视频，直接获得奖励', group: '基础' },
  { key: 'skipChest', name: '跳过宝箱', desc: '批量开宝箱跳过动画', group: '基础' },
  { key: 'redRefineSkip', name: '红淬跳过', desc: '跳过红色淬炼确认弹窗', group: '基础' },
  { key: 'heroAttrs', name: '属性增强', desc: '显示洗练等特殊战斗属性', file: 'enhance-scripts/hero_attrs_enhance.js', group: '基础' },
  { key: 'arenaReport', name: '战报增强', desc: '点击头像查看对手信息', group: '基础' },
  { key: 'perfOpt', name: '性能优化', desc: '30fps/禁粒子/减装饰动画', group: '基础' },
  { key: 'disableSound', name: '关闭声音', desc: '自动关闭音乐/音效/震动/点击特效', group: '基础' },
  { key: 'disablePowerSave', name: '关闭省电', desc: '自动选择永不进入省电模式', group: '基础' },
  { key: 'wsReconnect', name: '断线重连', desc: 'WebSocket断线自动重连+保活', file: 'enhance-scripts/ws_reconnect.js', group: '基础' },
  // ── 文件型增强（按需加载）──
  { key: 'battleFlyYi', name: '战斗飘字', desc: '飘字亿化+颜色+描边+阴影', file: 'enhance-scripts/battle_fly_yi.js', group: '战斗' },
  { key: 'nightmareAccel', name: '十殿加速', desc: '十殿战斗加速+UI全局加速(可调)', file: 'enhance-scripts/nightmare_accel.js', group: '十殿' },
  { key: 'nightmareEnhance', name: '十殿增强', desc: '倒计时+自动解散+领奖+抽奖', file: 'enhance-scripts/nightmare_enhance.js', group: '十殿' },
  { key: 'evoTowerMerge', name: '怪异塔合成', desc: '一键合成+自动抽合+领奖', file: 'enhance-scripts/evo_tower_merge.js', group: '战斗' },
  { key: 'simulateBattle', name: '模拟对战', desc: '战斗模拟与数据分析', file: 'enhance-scripts/simulate_battle.js', group: '战斗' },
  { key: 'infiniteFormation', name: '无限阵容', desc: '阵容配置与管理增强', file: 'enhance-scripts/infinite_formation.js', group: '战斗' },
  { key: 'avatarSwap', name: '更换头像', desc: '修复H5环境更换头像功能', file: 'enhance-scripts/avatar_headimg_fix.js', group: '辅助' },
  { key: 'skinSwitch', name: '皮肤切换', desc: '武将皮肤切换功能', file: 'enhance-scripts/skin_switch.js', group: '辅助' },
  { key: 'fourSaintUpgrade', name: '四圣升级', desc: '四圣自动升级按钮', file: 'enhance-scripts/four_saint_upgrade.js', group: '升级' },
  { key: 'heroLevelUp', name: '武将升级', desc: '目标等级/速度智能升级', file: 'enhance-scripts/hero_level_up.js', group: '升级' },
  { key: 'quenchAccel', name: '洗炼加速', desc: '淬炼动画2.34x加速', file: 'enhance-scripts/quench_accel.js', group: '洗炼' },
  { key: 'quenchPanel', name: '洗炼面板', desc: '洗炼增强面板功能', file: 'enhance-scripts/quench_panel.js', group: '洗炼' },
  { key: 'saltedFishAnalysis', name: '咸鱼分析', desc: '数据分析与统计工具', file: 'enhance-scripts/salted_fish.js', group: '辅助' },
  { key: 'saltFieldZoom', name: '盐场视距', desc: '盐场无限视距缩放', file: 'enhance-scripts/salt_field_zoom.js', group: '辅助' },
  { key: 'gameEnhancePanel', name: '增强面板', desc: '游戏内增强浮动面板', file: 'enhance-scripts/game_enhance_panel.js', group: '辅助' },
  { key: 'achievementReward', name: '成就奖励', desc: '自动领取成就奖励', file: 'enhance-scripts/achievement_reward.js', group: '辅助' },
  { key: 'peachGarden', name: '自动蟠桃园', desc: '自动完成蟠桃园任务', file: 'enhance-scripts/peach_garden.js', group: '辅助' },
  { key: 'fishHeroStar', name: '升星助手', desc: '武将升星+图鉴升级+鱼灵升星', file: 'enhance-scripts/fish_hero_star.js', group: '升级' },
  { key: 'itemUse', name: '道具使用', desc: '批量使用道具/宝箱', file: 'enhance-scripts/item_use.js', group: '辅助' },
  { key: 'opponentWash', name: '对手洗练', desc: '自动查询对手洗练+历史记录', file: 'enhance-scripts/opponent_wash.js', group: '洗炼' },
];

// 各功能对应的注入代码
// waitForModule 辅助函数 - 与123项目一致，对每个模块单独轮询等待
const WFM_HELPER = `if(!window._wfm){window._wfm=function(n,cb){var c=setInterval(function(){try{if(typeof window.__require!=='function')return;var m=window.__require(n);if(m&&typeof m==='object'&&Object.keys(m).length>0){clearInterval(c);cb(m);}}catch(e){}},500);setTimeout(function(){clearInterval(c);},60000);};}`;
const ENHANCE_CODE = {
  skipPopup: `(function(){${WFM_HELPER}window._wfm('FirstFaceToPlayerManager',function(m){var mgr=m.FirstFaceToPlayerManager?m.FirstFaceToPlayerManager:m;if(mgr&&mgr.instance){mgr.instance.setActive=function(){};console.log('[\\u8df3\\u8fc7\\u5f39\\u7a97] FirstFaceToPlayerManager\\u5df2\\u5c4f\\u853d');}else{console.warn('[\\u8df3\\u8fc7\\u5f39\\u7a97] instance\\u672a\\u627e\\u5230');}});})();`,
  skipAd: `(function(){var c=setInterval(function(){if(!window.wx)return;clearInterval(c);wx.createRewardedVideoAd=function(){var a={};a.load=function(){return Promise.resolve();};a.show=function(){setTimeout(function(){if(a._cb)a._cb({isEnded:true});},200);return Promise.resolve();};a.onClose=function(cb){a._cb=cb;};a.offClose=a.onError=a.offError=a.onLoad=a.offLoad=a.destroy=function(){return Promise.resolve();};return a;};if(window.HSDK)HSDK.showRewardVideoAd=function(o){if(o&&o.success)setTimeout(function(){o.success({isEnded:true});},200);};console.log('[广告跳过]已加载');},500);})();`,
  skipChest: `(function(){${WFM_HELPER}window._wfm('BoxPanel',function(m){if(m&&m.BoxPanel&&m.BoxPanel.prototype){var origOpen=m.BoxPanel.prototype._onOpenBox;m.BoxPanel.prototype._onOpenBox=function(){if(!window._skipBoxAnim)return origOpen.apply(this,arguments);var boxList=this.boxList;var idx=this._currentIndex;if(idx<0||idx>=boxList.length)return;var boxItem=boxList[idx];var itemId=boxItem.id;if(!window.ROLE)return;var qty=window.ROLE.getItemQuantity(itemId);if(qty===0)return;this._removeCoinAnim&&this._removeCoinAnim();var Configs=window.__require('Configs');var ModuleManager=window.__require('ModuleManager');var boxModule=ModuleManager.GET_MODULE(Configs.ModuleType.BOX);var openNum=boxModule.getOpenBoxNum(boxItem,qty);var LanguageExt=window.__require('LanguageExt');var TipsManager=window.__require('TipsManager');boxModule.sendOpenBox(itemId,openNum).then(function(rewards){if(rewards){boxModule.syncBoxPoint&&boxModule.syncBoxPoint();var cfg=Configs.ItemConf.getById(itemId);var name=cfg?LanguageExt.GET_CONTENT(cfg.name):'\\u5b9d\\u7bb1';TipsManager.SHOW_TIP('\\u5f00\\u542f '+openNum+' \\u4e2a'+name);}});};window._skipBoxAnim=true;console.log('[\\u5b9d\\u7bb1\\u8df3\\u8fc7]BoxPanel\\u5df2hook');}});})();`,
  redRefineSkip: `(function(){${WFM_HELPER}window._wfm('QuenchStageUpDialog',function(m){if(m&&m.QuenchStageUpDialog&&m.QuenchStageUpDialog.prototype){var orig=m.QuenchStageUpDialog.prototype._checkQuenchConfirm;m.QuenchStageUpDialog.prototype._checkQuenchConfirm=function(){if(this.isSkipRed)return false;return orig.apply(this,arguments);};console.log('[\\u7ea2\\u6dec\\u8df3\\u8fc7]_checkQuenchConfirm\\u5df2hook');}});})();`,
  arenaReport: `(function(){${WFM_HELPER}window._wfm('ArenaRecordDialog',function(m){if(m&&m.ArenaRecordDialog&&m.ArenaRecordDialog.prototype){var orig=m.ArenaRecordDialog.prototype._refreshSingleListItem;m.ArenaRecordDialog.prototype._refreshSingleListItem=function(e,t){var result=orig.call(this,e,t);var recordData=this.recordList&&this.recordList[e];if(recordData&&t.m_headIcon){var RankModule=window.__require('RankModule');t.m_headIcon.clearClick();t.m_headIcon.onClick(function(){RankModule.SHOW_ROLE_INFO(recordData.oppositeId);});}return result;};console.log('[\\u6218\\u62a5\\u589e\\u5f3a]ArenaRecordDialog\\u5df2hook');}});})();`,
  perfOpt: `(function(){var c=setInterval(function(){if(!window.cc||!cc.director)return;clearInterval(c);if(cc.game)cc.game.frameRate=30;if(cc.ParticleSystem){var op=cc.ParticleSystem.prototype.onLoad;if(op)cc.ParticleSystem.prototype.onLoad=function(){if(this.node)this.node.active=false;return op.apply(this,arguments);};}if(wx&&wx.vibrateShort)wx.vibrateShort=function(){};console.log('[性能优化]30fps/禁粒子');},500);})();`,
  disableSound: `(function(){var c=setInterval(function(){if(!window.cc||!cc.find)return;clearInterval(c);function muteAll(){try{var s=cc.director.getScene();if(!s)return;var labels=s.getComponentsInChildren? s.getComponentsInChildren(cc.Label):[];var audioKeys=['音乐','音效','震动','点击特效'];var clicked=0;labels.forEach(function(lb){var txt=(lb.string||'').trim();var nd=lb.node;if(!nd||!nd.active)return;if(audioKeys.indexOf(txt)!==-1){var p=nd.parent;if(!p)return;var btns=p.getComponentsInChildren? p.getComponentsInChildren(cc.Button):[];for(var i=0;i<btns.length;i++){var b=btns[i];if(!b||!b.node||!b.node.active)continue;var btnLabels=b.node.getComponentsInChildren? b.node.getComponentsInChildren(cc.Label):[];for(var j=0;j<btnLabels.length;j++){var bt=(btnLabels[j].string||'').trim();if(bt==='开启'){try{b._emitClickEvents&&b._emitClickEvents();console.log('[关闭声音]已关闭:',txt);clicked++;}catch(e){}break;}}}}});if(clicked>0)console.log('[关闭声音]已关闭'+clicked+'项');var ae=cc.audioEngine;if(ae){ae.setMusicVolume&&ae.setMusicVolume(0);ae.setEffectsVolume&&ae.setEffectsVolume(0);}cc.game&&cc.game.frameRate&&(cc.game.frameRate=Math.max(cc.game.frameRate,30));}catch(e){console.warn('[关闭声音]异常:',e);}}muteAll();cc.director.on&&cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){setTimeout(muteAll,1000);});console.log('[关闭声音]已加载');},500);})();`,
  disablePowerSave: `(function(){var c=setInterval(function(){if(!window.cc||!cc.find)return;clearInterval(c);function disablePS(){try{var s=cc.director.getScene();if(!s)return;var labels=s.getComponentsInChildren? s.getComponentsInChildren(cc.Label):[];var clicked=false;labels.forEach(function(lb){var txt=(lb.string||'').trim();if(txt==='永不'){var nd=lb.node;if(!nd||!nd.active)return;var p=nd.parent;var tog=p?p.getComponent? p.getComponent(cc.Toggle):null:null;if(tog){try{tog.isChecked=true;tog._emitToggleEvents&&tog._emitToggleEvents();console.log('[关闭省电]已选择永不');clicked=true;}catch(e){}}if(!clicked){var allTogs=s.getComponentsInChildren? s.getComponentsInChildren(cc.Toggle):[];for(var i=0;i<allTogs.length;i++){var t=allTogs[i];var tLabels=t.node.getComponentsInChildren? t.node.getComponentsInChildren(cc.Label):[];for(var j=0;j<tLabels.length;j++){if((tLabels[j].string||'').trim()==='永不'){try{t.isChecked=true;t._emitToggleEvents&&t._emitToggleEvents();console.log('[关闭省电]已选择永不');clicked=true;}catch(e){}break;}}if(clicked)break;}}}});if(!clicked)console.log('[关闭省电]未找到永不选项，将在下次场景切换重试');if(window.__GAME_SPEED__){var cur=window.__GAME_SPEED__.get();if(cur<1){window.__GAME_SPEED__.set(1);console.log('[关闭省电]恢复速度1x');}}}catch(e){console.warn('[关闭省电]异常:',e);}}disablePS();cc.director.on&&cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){setTimeout(disablePS,1000);});console.log('[关闭省电]已加载');},500);})();`,
};

// 增强功能开关状态
const enhancementState = reactive({});
try {
  const saved = JSON.parse(localStorage.getItem(ENHANCE_KEY) || '{}');
  Object.assign(enhancementState, saved);
} catch(e) {}
// 默认启用的增强功能（首次使用时自动开启）
const DEFAULT_ENABLED = new Set(['skipPopup', 'skipAd', 'perfOpt', 'nightmareAccel', 'battleFlyYi', 'wsReconnect']);
// 确保所有功能都有默认值
ENHANCEMENTS.forEach(e => { if (enhancementState[e.key] === undefined) enhancementState[e.key] = DEFAULT_ENABLED.has(e.key); });

const ENHANCE_CODES_KEY = '__game_enhance_codes__';

function saveEnhancements() {
  localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancementState));
  // ★ 同步缓存增强代码到 localStorage，供 game.html 独立窗口自注入
  cacheEnhanceCodes();
}

// 收集所有已启用增强的代码并缓存
async function cacheEnhanceCodes() {
  const codes = [];
  for (const enh of ENHANCEMENTS) {
    if (!enhancementState[enh.key]) continue;
    if (enh.file) {
      // 文件型增强：fetch 加载
      const code = await loadScriptFile(enh.file);
      if (code) codes.push({ name: enh.name, code });
    } else if (ENHANCE_CODE[enh.key]) {
      codes.push({ name: enh.name, code: ENHANCE_CODE[enh.key] });
    }
  }
  // 用户自定义脚本
  const enabledScripts = scripts.value.filter(s => s.enabled);
  enabledScripts.forEach(s => codes.push({ name: s.name, code: s.code }));
  try {
    localStorage.setItem(ENHANCE_CODES_KEY, JSON.stringify(codes));
  } catch(e) {
    console.warn('[增强] 缓存代码失败:', e.message);
  }
}

function toggleEnhancement(key, val) {
  enhancementState[key] = val;
  saveEnhancements();
}

// 初始化时缓存一次代码
nextTick(() => cacheEnhanceCodes());

const enabledEnhancementCount = computed(() =>
  ENHANCEMENTS.filter(e => enhancementState[e.key]).length
);

// 按分组组织增强功能
const enhanceGroups = computed(() => {
  const map = new Map();
  const order = ['基础', '战斗', '十殿', '洗炼', '升级', '辅助'];
  ENHANCEMENTS.forEach(e => {
    const g = e.group || '其他';
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(e);
  });
  return order.filter(g => map.has(g)).map(g => ({ name: g, items: map.get(g) }));
});

const enhanceCollapsed = ref(true);

// 脚本文件缓存
const _scriptFileCache = new Map();
async function loadScriptFile(filePath) {
  if (_scriptFileCache.has(filePath)) return _scriptFileCache.get(filePath);
  try {
    const resp = await fetch('/' + filePath);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const code = await resp.text();
    _scriptFileCache.set(filePath, code);
    return code;
  } catch(e) {
    console.warn('[增强] 加载脚本失败:', filePath, e.message);
    return null;
  }
}

// 从 localStorage 加载用户自定义脚本
try {
  const raw = localStorage.getItem(SCRIPTS_KEY);
  if (raw) scripts.value = JSON.parse(raw);
} catch(e) {}

function saveScriptsToStorage() {
  localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts.value));
}

function saveScript() {
  if (!scriptForm.name || !scriptForm.code) return;
  if (editingScriptId.value) {
    const idx = scripts.value.findIndex(s => s.id === editingScriptId.value);
    if (idx !== -1) {
      scripts.value[idx].name = scriptForm.name;
      scripts.value[idx].code = scriptForm.code;
    }
  } else {
    scripts.value.push({
      id: 'script_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: scriptForm.name,
      code: scriptForm.code,
      enabled: true,
      createdAt: new Date().toISOString()
    });
  }
  saveScriptsToStorage();
  showScriptModal.value = false;
  editingScriptId.value = null;
  scriptForm.name = '';
  scriptForm.code = '';
}

function editScript(script) {
  editingScriptId.value = script.id;
  scriptForm.name = script.name;
  scriptForm.code = script.code;
  showScriptModal.value = true;
}

function removeScript(id) {
  scripts.value = scripts.value.filter(s => s.id !== id);
  saveScriptsToStorage();
}

function toggleScript(id, val) {
  const s = scripts.value.find(s => s.id === id);
  if (s) { s.enabled = val; saveScriptsToStorage(); }
}

function importScriptFile() {
  fileInputRef.value?.click();
}

function openAddScript() {
  editingScriptId.value = null;
  scriptForm.name = '';
  scriptForm.code = '';
  showScriptModal.value = true;
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    scriptForm.code = ev.target.result || '';
    if (!scriptForm.name) scriptForm.name = file.name.replace(/\.(js|txt)$/i, '');
  };
  reader.readAsText(file);
  e.target.value = '';
}

// iframe 加载完成后注入脚本
async function onIframeLoad(tokenId) {
  const el = iframeRefs[tokenId];
  if (!el || !el.contentWindow) return;
  // 收集所有需要注入的代码：内联增强 + 文件增强 + 用户脚本
  const codes = [];
  const fileLoads = [];
  ENHANCEMENTS.forEach(enh => {
    if (!enhancementState[enh.key]) return;
    if (enh.file) {
      // 文件型增强：异步加载
      fileLoads.push(loadScriptFile(enh.file).then(code => {
        if (code) codes.push({ name: enh.name, code });
      }));
    } else if (ENHANCE_CODE[enh.key]) {
      codes.push({ name: enh.name, code: ENHANCE_CODE[enh.key] });
    }
  });
  const enabledScripts = scripts.value.filter(s => s.enabled);
  enabledScripts.forEach(s => codes.push({ name: s.name, code: s.code }));
  // 等待所有文件型增强加载完成
  if (fileLoads.length > 0) await Promise.all(fileLoads);
  if (codes.length === 0) return;
  // 延迟 1 秒等待游戏初始化
  setTimeout(() => {
    codes.forEach(item => {
      try {
        el.contentWindow.postMessage({ type: 'INJECT_SCRIPT', name: item.name, code: item.code }, '*');
      } catch(e) {}
    });
    const f = iframeList.value.find(i => i.tokenId === tokenId);
    if (f) addLog(`⚡ ${f.name}: 已注入 ${codes.length} 项功能`, 'info');
  }, 1000);
}

// iframe 列表: [{tokenId, name, url}]
const iframeList = ref([]);
const gridColsMode = ref('auto'); // 'auto' 或手动数字
const tokenStatusMap = ref(new Map());
const iframeRefs = reactive({});
const rightPanelRef = ref(null);
const gameGridRef = ref(null);

// ── 自适应列数计算（宽高双约束）──
const GAME_ASPECT_RATIO = 9 / 16; // 游戏竖屏宽高比 (width/height)
const MIN_CELL_WIDTH = 180;
const MOBILE_MIN_CELL_WIDTH = 120; // 移动端最小 cell 宽度
const MIN_IFRAME_HEIGHT = 240; // iframe 最小高度
const MOBILE_MIN_IFRAME_HEIGHT = 160; // 移动端 iframe 最小高度
const CELL_HEADER_H = 28; // cell-header 高度
const GRID_GAP = 4;
const GRID_PADDING = 4;
const SCROLLBAR_W = 20;   // 滚动条预留宽度

// ── APK 环境检测与限制 ──
const isApk = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const APK_MAX_WINDOWS = 3; // APK 环境下建议最大游戏窗口数
const gridWidth = ref(800);
const gridHeight = ref(600);
let gridResizeObserver = null;

// 计算给定列数时的每个 cell 实际宽度
function calcCellW(cols, availW) {
  return (availW - (cols + 1) * GRID_GAP) / cols;
}
// 计算给定列数时的每个 cell iframe 可用高度（考虑行数）
function calcCellH(cols, availH, count) {
  const rows = Math.ceil(count / cols);
  return (availH - (rows + 1) * GRID_GAP) / rows - CELL_HEADER_H;
}

// 获取当前环境的最小 cell 宽度
function getMinCellW() { return isMobile.value ? MOBILE_MIN_CELL_WIDTH : MIN_CELL_WIDTH; }
function getMinIframeH() { return isMobile.value ? MOBILE_MIN_IFRAME_HEIGHT : MIN_IFRAME_HEIGHT; }

const autoCols = computed(() => {
  const availW = gridWidth.value - SCROLLBAR_W - GRID_PADDING * 2;
  const toolbarReserve = isMobile.value ? 80 : 40; // 移动端工具栏+tab bar 占更多空间
  const availH = Math.max(200, gridHeight.value - toolbarReserve - GRID_PADDING * 2);
  const count = iframeList.value.length;
  if (count <= 0) return 1;
  if (count === 1) return 1;
  const minW = getMinCellW();
  const minH = getMinIframeH();
  // 移动端限制最大列数
  const maxCols = isMobile.value ? Math.min(count, 3) : Math.min(count, 12);

  let bestCols = 1;
  let bestScore = -Infinity;

  for (let cols = 1; cols <= maxCols; cols++) {
    const cellW = calcCellW(cols, availW);
    const iframeH = calcCellH(cols, availH, count);

    if (cellW < minW) continue;
    if (iframeH < minH) continue;

    // 理想宽度 = iframeH * 游戏宽高比
    const idealW = iframeH * GAME_ASPECT_RATIO;
    const ratioMatch = Math.min(cellW / idealW, idealW / cellW);

    const rows = Math.ceil(count / cols);
    const lastRowItems = count - (rows - 1) * cols;
    const fillRatio = lastRowItems / cols;

    const areaUsage = (count * cellW * (iframeH + CELL_HEADER_H)) / (availW * availH);

    const score = ratioMatch * 0.4 + fillRatio * 0.3 + areaUsage * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }

  if (bestScore === -Infinity) {
    bestCols = Math.max(1, Math.min(count, Math.floor(availW / (minW + GRID_GAP))));
  }
  return bestCols;
});

const effectiveCols = computed(() => {
  if (gridColsMode.value === 'auto') return autoCols.value;
  return gridColsMode.value;
});

/**
 * 网格布局策略：
 * 始终同时约束宽和高，计算精确的 cell 尺寸，
 * 通过 CSS 变量 --cell-w 和 --cell-h 传递给每个 cell
 */
const gridStyle = computed(() => {
  const cols = effectiveCols.value;
  const count = iframeList.value.length;
  if (count === 0) return {};

  const toolbarReserve = isMobile.value ? 80 : 40;
  const availW = gridWidth.value - SCROLLBAR_W - GRID_PADDING * 2;
  const availH = Math.max(200, gridHeight.value - toolbarReserve - GRID_PADDING * 2);

  const minW = getMinCellW();
  const cellW = calcCellW(cols, availW);
  const iframeH = calcCellH(cols, availH, count);
  const cellH = iframeH + CELL_HEADER_H;

  // 理想宽度（按游戏比例）
  const idealW = iframeH * GAME_ASPECT_RATIO;
  // 取较小值确保不溢出，但不低于移动端/桌面端最小宽度
  const finalW = Math.max(minW, Math.min(cellW, idealW));
  // 最终高度按实际宽度反算（保持游戏比例）
  const finalIframeH = finalW / GAME_ASPECT_RATIO;
  const finalH = finalIframeH + CELL_HEADER_H;

  const totalW = finalW * cols + (cols + 1) * GRID_GAP;
  const rows = Math.ceil(count / cols);
  const totalH = finalH * rows + (rows + 1) * GRID_GAP;

  // 判断是否需要滚动
  const needScrollH = totalH > availH;
  const needScrollV = totalW > availW;

  return {
    gridTemplateColumns: `repeat(${cols}, ${finalW}px)`,
    gridAutoRows: `${finalH}px`,
    justifyContent: needScrollV ? 'start' : 'center',
    alignContent: needScrollH ? 'start' : 'center',
    '--cell-w': finalW + 'px',
    '--cell-h': finalH + 'px',
  };
});

function setupGridResize() {
  if (gridResizeObserver) gridResizeObserver.disconnect();
  // 监听右侧面板而非网格本身，获取更准确的可用空间
  const el = rightPanelRef.value;
  if (!el) return;
  gridResizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      gridWidth.value = entry.contentRect.width;
      gridHeight.value = entry.contentRect.height;
    }
  });
  gridResizeObserver.observe(el);
  gridWidth.value = el.clientWidth || 800;
  gridHeight.value = el.clientHeight || 600;
}

// ── 拖拽登录 ──
const dragTokenId = ref(null);
const isDragOver = ref(false);
let dragEnterCount = 0;

function onDragStart(e, token) {
  dragTokenId.value = token.id;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', token.id);
}
function onDragEnd() {
  dragTokenId.value = null;
  isDragOver.value = false;
  dragEnterCount = 0;
}
function onDragOver(e) {
  e.dataTransfer.dropEffect = 'copy';
}
function onDragEnter() {
  dragEnterCount++;
  isDragOver.value = true;
}
function onDragLeave() {
  dragEnterCount--;
  if (dragEnterCount <= 0) {
    isDragOver.value = false;
    dragEnterCount = 0;
  }
}
async function onDrop(e) {
  isDragOver.value = false;
  dragEnterCount = 0;
  const tokenId = e.dataTransfer.getData('text/plain') || dragTokenId.value;
  dragTokenId.value = null;
  if (!tokenId) return;
  const token = tokenStore.gameTokens.find(t => t.id === tokenId);
  if (!token) return;
  if (hasIframe(tokenId)) {
    message.info(`${token.name} 已在游戏中`);
    return;
  }
  openingTokenId.value = tokenId;
  try {
    await loginInIframe(token);
    addLog(`✅ ${token.name} 拖拽登录成功`, 'success');
    message.success(`${token.name}: 拖拽登录成功`);
  } catch (err) {
    addLog(`❌ ${token.name}: ${err.message}`, 'error');
    message.error(`${token.name}: ${err.message}`);
    tokenStatusMap.value.set(tokenId, 'idle');
    tokenStatusMap.value = new Map(tokenStatusMap.value);
  }
  openingTokenId.value = null;
}

// ── 同步控制 ──
const syncEnabled = ref(false);

function onSyncToggle(val) {
  syncEnabled.value = val;
  let okCount = 0, failCount = 0;
  iframeList.value.forEach(item => {
    const el = iframeRefs[item.tokenId];
    if (el && el.contentWindow) {
      try {
        el.contentWindow._syncEnabled = val;
        // 验证设置成功
        if (el.contentWindow._syncEnabled === val) {
          okCount++;
        } else {
          failCount++;
          console.warn(`[Sync] ${item.name}: 设置失败，实际值=${el.contentWindow._syncEnabled}`);
        }
      } catch(e) {
        failCount++;
        console.warn(`[Sync] ${item.name}: 跨域访问失败`, e.message);
      }
    } else {
      failCount++;
      console.warn(`[Sync] ${item.name}: iframe或contentWindow不存在`);
    }
  });
  if (val) {
    addLog(`📡 操作同步已开启 (${okCount}/${iframeList.value.length}个窗口就绪)，在任一窗口的操作将同步到其他窗口`, okCount > 0 ? 'success' : 'error');
  } else {
    addLog(`📡 操作同步已关闭`, 'info');
  }
}

// 监听 iframe 发来的UI操作事件，广播到其他窗口
// ── WebSocket 断线重连状态追踪 ──
const wsReconnectState = reactive({}); // tokenId -> { status, count, lastUpdate }

function onWsStatus(tokenId, wsType, data) {
  const item = iframeList.value.find(i => i.tokenId === tokenId);
  const name = item?.name || tokenId;
  if (!wsReconnectState[tokenId]) wsReconnectState[tokenId] = { status: 'unknown', count: 0, lastUpdate: '' };
  const state = wsReconnectState[tokenId];
  state.lastUpdate = new Date().toLocaleTimeString();

  switch(wsType) {
    case 'ws_connected':
      state.status = 'connected';
      state.count = 0;
      addLog(`🟢 ${name}: 游戏连接已建立`, 'success');
      break;
    case 'ws_disconnected':
      state.status = 'disconnected';
      addLog(`🔴 ${name}: 连接断开 (code=${data.code})`, 'warning');
      break;
    case 'ws_reconnecting':
      state.status = 'reconnecting';
      state.count = data.count;
      addLog(`🟡 ${name}: 正在重连 (第${data.count}次)...`, 'info');
      break;
    case 'ws_reconnect_failed':
      state.status = 'failed';
      addLog(`❌ ${name}: 自动重连失败 (已尝试${data.count}次)，请手动刷新`, 'error');
      break;
    case 'ws_request_refresh':
      // iframe 内脚本请求父窗口执行刷新
      if (data.count <= 3) {
        addLog(`🔄 ${name}: 触发自动重连刷新...`, 'info');
        refreshSingle(tokenId);
      } else {
        addLog(`⛔ ${name}: 重连次数超限，停止自动刷新`, 'warning');
        state.status = 'failed';
      }
      break;
    case 'ws_health':
      state.status = data.connected ? 'connected' : 'disconnected';
      break;
  }
}

function onIframeMessage(e) {
  if (!e.data || !e.data.type) return;

  // ── WebSocket 状态上报 ──
  if (e.data.type === 'WS_STATUS' && e.data.wsType) {
    const tokenId = e.data.tokenId || '';
    if (tokenId) onWsStatus(tokenId, e.data.wsType, e.data.data || {});
    return;
  }

  // ── 操作同步 ──
  if (e.data.type !== 'GAME_INPUT_EVENT' || !syncEnabled.value) return;
  const sourceTokenId = e.data.tokenId;
  const evData = e.data.event;
  if (!evData) return;

  let count = 0;
  iframeList.value.forEach(item => {
    if (item.tokenId === sourceTokenId) return;
    const el = iframeRefs[item.tokenId];
    if (el && el.contentWindow) {
      try {
        el.contentWindow.postMessage({ type: 'INPUT_EVENT', event: evData }, '*');
        count++;
      } catch(e) {}
    }
  });
  if (count > 0) {
    const src = iframeList.value.find(i => i.tokenId === sourceTokenId);
    addLog(`👆 ${src?.name || '?'} → ${count}个窗口 (${evData.eventType})`, 'info');
  }
}

// ── 左侧面板宽度拖拽 ──
const DEFAULT_PANEL_WIDTH = 360;
const leftPanelWidth = ref(DEFAULT_PANEL_WIDTH);
const leftPanelCollapsed = ref(false);
const isResizing = ref(false);

function startResize(e) {
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = leftPanelWidth.value;
  let rafId = null;

  const onMove = (ev) => {
    if (rafId) return; // 节流：上一帧未完成则跳过
    rafId = requestAnimationFrame(() => {
      const delta = ev.clientX - startX;
      leftPanelWidth.value = Math.max(240, Math.min(700, startWidth + delta));
      rafId = null;
    });
  };
  const onUp = () => {
    isResizing.value = false;
    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function resetPanelWidth() {
  leftPanelWidth.value = DEFAULT_PANEL_WIDTH;
}

// ── 计算属性 ──
const filteredTokens = computed(() => {
  let tokens = [...tokenStore.gameTokens];
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    tokens = tokens.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      (t.server && t.server.toLowerCase().includes(kw))
    );
  }
  return tokens;
});

const isAllSelected = computed(() =>
  filteredTokens.value.length > 0 &&
  filteredTokens.value.every(t => selectedTokenIds.value.includes(t.id))
);

// ── 工具函数 ──
function addLog(msg, type = 'info') {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  logs.value.unshift({ time, message: msg, type });
  if (logs.value.length > 200) logs.value.pop();
}

function hasIframe(tokenId) {
  return iframeList.value.some(i => i.tokenId === tokenId);
}

function getTokenStatus(tokenId) {
  if (hasIframe(tokenId)) return 'opened';
  return tokenStatusMap.value.get(tokenId) || 'idle';
}

function getStatusLabel(tokenId) {
  if (hasIframe(tokenId)) return '🟢 已登录';
  if (tokenStatusMap.value.get(tokenId) === 'opening') return '⏳ 登录中';
  return '⚪ 未登录';
}

// ── BIN 解码 ──
async function decodeBinForToken(token) {
  let binData = await getArrayBuffer(token.id);
  if (!binData) binData = await getArrayBuffer(token.name);
  if (!binData) throw new Error('BIN数据不存在');

  const u8 = new Uint8Array(binData);
  let binDecoded = null;
  try {
    const enc = g_utils.getEnc('auto');
    const decrypted = enc.decrypt(u8);
    binDecoded = g_utils.bon.decode(decrypted);
  } catch {
    try { binDecoded = g_utils.bon.decode(u8); } catch { throw new Error('BIN数据解码失败'); }
  }
  if (!binDecoded || typeof binDecoded !== 'object') throw new Error('BIN解码结果无效');

  let info = '';
  const infoRaw = binDecoded.info;
  if (typeof infoRaw === 'string') {
    info = infoRaw;
  } else if (infoRaw && typeof infoRaw === 'object') {
    info = JSON.stringify(infoRaw);
  }
  if (!info) {
    const fallback = binDecoded.skey || binDecoded.encryptCombUser;
    if (fallback) info = typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
  }
  if (!info) throw new Error('无法提取登录凭证');

  return {
    info,
    platform: binDecoded.platform ?? 0,
    platformExt: binDecoded.platformExt ?? 'mix',
    serverId: binDecoded.serverId ?? 0,
  };
}

// ── 登录：创建 iframe ──
async function loginInIframe(token) {
  if (hasIframe(token.id)) return;

  // APK 环境窗口数限制警告
  if (isApk() && iframeList.value.length >= APK_MAX_WINDOWS) {
    addLog(`⚠ APK环境已开启 ${iframeList.value.length} 个窗口，继续开启可能导致内存不足崩溃`, 'warning');
    message.warning(`APK环境建议不超过 ${APK_MAX_WINDOWS} 个游戏窗口，当前已有 ${iframeList.value.length} 个`);
  }

  const loginData = await decodeBinForToken(token);
  const loginKey = `__game_login_${token.id}__`;
  localStorage.setItem(loginKey, JSON.stringify(loginData));

  const gameUrl = `${window.location.origin}/game.html?token=${encodeURIComponent(token.id)}`;
  iframeList.value.push({ tokenId: token.id, name: token.name, url: gameUrl });
  tokenStatusMap.value.set(token.id, 'opened');
  tokenStatusMap.value = new Map(tokenStatusMap.value);
  // 移动端登录后自动切换到游戏标签
  if (isMobile.value) {
    nextTick(() => { activeMobileTab.value = 'game'; });
  }
}

// ── 批量登录 ──
async function batchLogin() {
  if (selectedTokenIds.value.length === 0) return;

  // APK 环境批量登录警告
  const totalAfter = iframeList.value.length + selectedTokenIds.value.length;
  if (isApk() && totalAfter > APK_MAX_WINDOWS) {
    message.warning(`APK环境建议不超过 ${APK_MAX_WINDOWS} 个游戏窗口，当前将开启 ${totalAfter} 个，可能导致内存不足`);
    addLog(`⚠ APK环境批量登录 ${totalAfter} 个窗口（建议≤${APK_MAX_WINDOWS}），注意内存`, 'warning');
  }

  isBatchOpening.value = true;
  let successCount = 0, failCount = 0;

  const tokensToOpen = tokenStore.gameTokens.filter(
    t => selectedTokenIds.value.includes(t.id)
  );

  for (let i = 0; i < tokensToOpen.length; i++) {
    const token = tokensToOpen[i];
    openingTokenId.value = token.id;
    tokenStatusMap.value.set(token.id, 'opening');
    tokenStatusMap.value = new Map(tokenStatusMap.value);

    try {
      await loginInIframe(token);
      successCount++;
      addLog(`✅ ${token.name} 已登录`, 'success');
    } catch (err) {
      failCount++;
      addLog(`❌ ${token.name}: ${err.message}`, 'error');
      tokenStatusMap.value.set(token.id, 'idle');
      tokenStatusMap.value = new Map(tokenStatusMap.value);
    }
    if (i < tokensToOpen.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  openingTokenId.value = null;
  isBatchOpening.value = false;
  message.success(`批量登录完成: 成功 ${successCount}, 失败 ${failCount}`);
  addLog(`批量登录完成: 成功 ${successCount}, 失败 ${failCount}`, 'success');
}

// ── 单个登录 ──
async function loginSingle(tokenId) {
  const token = tokenStore.gameTokens.find(t => t.id === tokenId);
  if (!token) return;
  openingTokenId.value = tokenId;
  try {
    await loginInIframe(token);
    addLog(`✅ ${token.name} 已登录`, 'success');
    message.success(`${token.name}: 已登录`);
  } catch (err) {
    addLog(`❌ ${token.name}: ${err.message}`, 'error');
    message.error(`${token.name}: ${err.message}`);
    tokenStatusMap.value.set(tokenId, 'idle');
    tokenStatusMap.value = new Map(tokenStatusMap.value);
  }
  openingTokenId.value = null;
}

// ── 退出 ──
function exitAll() {
  const count = iframeList.value.length;
  iframeList.value = [];
  tokenStatusMap.value = new Map();
  message.info(`已退出 ${count} 个游戏`);
  addLog(`✖ 已退出 ${count} 个游戏`, 'info');
}

async function refreshSingle(tokenId) {
  const el = iframeRefs[tokenId];
  const item = iframeList.value.find(i => i.tokenId === tokenId);
  if (!el || !item) return;
  // 重新解码并存储登录数据（首次登录时游戏页已删除了 localStorage 中的数据）
  const token = tokenStore.gameTokens.find(t => t.id === tokenId);
  if (token) {
    try {
      const loginData = await decodeBinForToken(token);
      const loginKey = `__game_login_${tokenId}__`;
      localStorage.setItem(loginKey, JSON.stringify(loginData));
    } catch(e) {
      addLog(`⚠ ${item.name}: 登录数据刷新失败: ${e.message}`, 'warning');
      return;
    }
  }
  // 重新设置 src 强制刷新（带时间戳绕过缓存）
  const baseUrl = item.url.split('?')[0];
  const params = item.url.split('?')[1] || '';
  const newUrl = `${baseUrl}?${params}&_t=${Date.now()}`;
  el.src = newUrl;
  addLog(`↻ ${item.name}: 刷新重登`, 'info');
}

function exitSingle(tokenId) {
  const idx = iframeList.value.findIndex(i => i.tokenId === tokenId);
  if (idx === -1) return;
  const name = iframeList.value[idx].name;
  iframeList.value.splice(idx, 1);
  tokenStatusMap.value.set(tokenId, 'closed');
  tokenStatusMap.value = new Map(tokenStatusMap.value);
  addLog(`✖ ${name}: 已退出`, 'info');
}

// ── 选择 ──
function selectAll() {
  if (isAllSelected.value) selectedTokenIds.value = [];
  else selectedTokenIds.value = filteredTokens.value.map(t => t.id);
}
function selectInverse() {
  const allIds = new Set(filteredTokens.value.map(t => t.id));
  const selected = new Set(selectedTokenIds.value);
  selectedTokenIds.value = [...allIds].filter(id => !selected.has(id));
}

// ── 周期性健康检查: 每30秒 ping 每个iframe ──
let healthCheckTimer = null;
function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(() => {
    iframeList.value.forEach(item => {
      const el = iframeRefs[item.tokenId];
      if (el && el.contentWindow) {
        try {
          el.contentWindow.postMessage({ type: 'WS_HEALTH_PING' }, '*');
        } catch(e) {}
      }
    });
  }, 30000);
}

onMounted(() => {
  window.addEventListener('message', onIframeMessage);
  window.addEventListener('resize', onWindowResize);
  startHealthCheck();
});

let windowResizeTimer = null;
function onWindowResize() {
  if (windowResizeTimer) clearTimeout(windowResizeTimer);
  windowResizeTimer = setTimeout(() => {
    if (iframeList.value.length > 0) {
      notifyIframesResize();
    }
  }, 200);
}

// 当网格可见时设置 resize 监听
watch(() => iframeList.value.length, (len) => {
  if (len > 0) {
    nextTick(() => {
      setupGridResize();
      setupCellResizeObserver();
    });
  }
});

// 移动端切换标签时重新测量网格尺寸
watch(activeMobileTab, () => {
  nextTick(() => {
    const el = rightPanelRef.value;
    if (el && el.clientWidth > 0) {
      gridWidth.value = el.clientWidth;
      gridHeight.value = el.clientHeight;
    }
  });
});

// ── 列数/网格尺寸变化时强制iframe重绘 ──
const gridRedrawing = ref(false);
let cellResizeObserver = null;
let iframeResizeTimer = null;

function notifyIframesResize() {
  if (iframeResizeTimer) clearTimeout(iframeResizeTimer);
  iframeResizeTimer = setTimeout(() => {
    iframeList.value.forEach(item => {
      const el = iframeRefs[item.tokenId];
      if (!el || !el.contentWindow) return;
      // 跳过未加载完成的 iframe（刷新重登/首次加载中）
      try {
        if (el.contentDocument && el.contentDocument.readyState !== 'complete') return;
        el.contentWindow.dispatchEvent(new Event('resize'));
      } catch(e) {}
    });
  }, 120);
}

// 监听网格容器实际尺寸变化，触发iframe resize
function setupCellResizeObserver() {
  if (cellResizeObserver) cellResizeObserver.disconnect();
  const el = gameGridRef.value;
  if (!el) return;

  cellResizeObserver = new ResizeObserver(() => {
    if (iframeList.value.length === 0) return;
    notifyIframesResize();
  });
  cellResizeObserver.observe(el);
}

watch(effectiveCols, () => {
  gridRedrawing.value = true;
  setTimeout(() => {
    notifyIframesResize();
    gridRedrawing.value = false;
  }, 80);
});

// 监听 iframeList 变化时重新设置 cell 的 ResizeObserver (merged above)

onBeforeUnmount(() => {
  window.removeEventListener('message', onIframeMessage);
  window.removeEventListener('resize', onWindowResize);
  if (gridResizeObserver) gridResizeObserver.disconnect();
  if (cellResizeObserver) cellResizeObserver.disconnect();
  if (iframeResizeTimer) clearTimeout(iframeResizeTimer);
  if (windowResizeTimer) clearTimeout(windowResizeTimer);
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  iframeList.value = [];
});
</script>

<style scoped>
.game-login-page {
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* 左右分栏 */
.split-layout {
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
}

/* 拖拽分隔条 */
.resize-handle {
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e8e8;
  flex-shrink: 0;
  transition: background 0.15s;
  z-index: 10;
}
.resize-handle:hover,
.resize-handle:active {
  background: #1890ff;
}
.resize-grip {
  width: 2px;
  height: 32px;
  border-radius: 1px;
  background: #bbb;
}
.resize-handle:hover .resize-grip,
.resize-handle:active .resize-grip {
  background: #fff;
}

/* 左侧面板 */
.left-panel {
  min-width: 240px;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  position: relative;
  overflow: hidden;
}
/* 收起按钮 */
.panel-collapse-btn {
  position: absolute;
  top: 50%;
  right: -1px;
  transform: translateY(-50%);
  z-index: 10;
  width: 16px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 10px;
  color: #666;
  opacity: 0;
  transition: opacity 0.2s;
}
.left-panel:hover .panel-collapse-btn {
  opacity: 1;
}
.panel-collapse-btn:hover {
  background: #1890ff;
  color: #fff;
}
/* 展开按钮 */
.panel-expand-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 24px;
  background: #f0f0f0;
  border-right: 1px solid #ddd;
  cursor: pointer;
  color: #888;
  transition: background 0.2s;
  flex-shrink: 0;
}
.panel-expand-btn:hover {
  background: #e0e8ff;
  color: #1890ff;
}
.split-layout.panel-collapsed .right-panel {
  flex: 1;
}

.stat-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px 6px;
}
.mini-stat {
  flex: 1;
  text-align: center;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 6px 4px;
}
.mini-label { display: block; font-size: 11px; color: #888; }
.mini-val { display: block; font-size: 22px; font-weight: 700; color: #333; }
.text-blue { color: #1890ff; }
.text-green { color: #52c41a; }

.action-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  padding: 6px 12px 8px;
  border-bottom: 1px solid #eee;
}

/* 日志 */
.log-area {
  margin: 0 8px 6px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.log-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 10px; background: #f5f5f5; border-bottom: 1px solid #eee;
  font-size: 11px; font-weight: 500;
}
.log-list { max-height: 90px; overflow-y: auto; padding: 2px 0; }
.log-item { padding: 1px 10px; font-size: 11px; line-height: 1.7; color: #555; }
.log-time { color: #aaa; margin-right: 4px; font-family: monospace; }
.log-success { color: #52c41a; }
.log-error { color: #ff4d4f; }
.log-warning { color: #faad14; }
.log-info { color: #1890ff; }

/* 账号列表 */
.token-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 8px 8px;
  min-height: 0;
}
.token-section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 4px 6px;
  flex-shrink: 0;
}
.token-section-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.token-section :deep(.n-checkbox-group) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.token-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}
.login-group-wrapper {
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}
.login-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}
.login-group-title {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}
.login-group-toggle {
  font-size: 10px;
  color: #999;
}
.login-group-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 6px 0;
}
.login-group-chip {
  padding: 3px 9px;
  border-radius: 5px;
  border: 2px solid;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
}
.login-group-chip:hover {
  opacity: 0.85;
}
.token-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #fff;
  transition: all 0.15s;
  flex-shrink: 0;
}
.token-item:hover {
  border-color: #1890ff;
  box-shadow: 0 1px 3px rgba(24,144,255,0.1);
}
.token-opened { border-color: #52c41a; background: #f6ffed; }
.token-dragging { opacity: 0.4; border-color: #faad14; }
.drag-handle {
  display: inline-block;
  color: #ccc;
  font-size: 10px;
  margin-right: 3px;
  cursor: grab;
}
.token-item:active .drag-handle { cursor: grabbing; }
.token-name {
  font-size: 12px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px;
}
.token-meta { display: flex; gap: 4px; font-size: 10px; margin-left: auto; }
.token-server { color: #888; }
.token-status { font-size: 10px; }
.status-opened { color: #52c41a; }
.status-opening { color: #faad14; }
.status-idle { color: #bbb; }
.token-actions { display: flex; gap: 2px; }

/* 右侧游戏面板 */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  overflow: hidden;
  position: relative;
}
.resize-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  cursor: col-resize;
}
.right-panel.is-resizing .cell-iframe {
  pointer-events: none;
}
.empty-game {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-hint {
  margin-top: 12px;
  padding: 8px 20px;
  background: rgba(24,144,255,0.15);
  border: 2px dashed #1890ff;
  border-radius: 8px;
  color: #1890ff;
  font-size: 14px;
  font-weight: 500;
  animation: dropPulse 1s ease-in-out infinite;
}
@keyframes dropPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

/* 拖拽悬停效果 */
.right-panel.drop-active {
  outline: 3px dashed #1890ff;
  outline-offset: -3px;
  background: #1a1a2eee;
}

/* 顶部工具栏 */
.grid-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
  gap: 8px;
}

.grid-sync-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8899aa;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
  border: 1px solid #0f3460;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}
.grid-sync-toggle:hover { background: rgba(255,255,255,0.1); }
.grid-sync-toggle.sync-on { color: #4ade80; border-color: #4ade8044; background: rgba(74,222,128,0.1); }
.grid-sync-toggle .sync-icon { font-size: 12px; }
.grid-sync-toggle .sync-dot {
  width: 6px; height: 6px; border-radius: 50%;
}
.grid-sync-toggle .sync-dot.on { background: #4ade80; box-shadow: 0 0 4px #4ade80; }
.grid-sync-toggle .sync-dot.off { background: #555; }

/* 游戏网格 */
.game-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 4px;
  padding: 4px;
  overflow: auto;
  scrollbar-gutter: stable;
  justify-content: center;
}
.game-grid.grid-redrawing .cell-iframe {
  visibility: hidden;
}
.game-cell {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #111;
  border-radius: 4px;
  overflow: hidden;
  width: var(--cell-w);
  height: var(--cell-h);
}
.cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px;
  background: #16213e;
  flex-shrink: 0;
  height: 28px;
}
.cell-name {
  font-size: 11px;
  color: #aabbcc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-actions { display: flex; gap: 4px; align-items: center; }
.cell-btn {
  font-size: 10px;
  color: #888;
  cursor: pointer;
  padding: 1px 3px;
  border-radius: 3px;
  line-height: 1;
}
.cell-btn:hover { background: rgba(255,255,255,0.1); color: #ccc; }
.cell-close:hover { background: rgba(255,77,79,0.3); color: #ff4d4f; }
.cell-refresh:hover { background: rgba(74,222,128,0.2); color: #4ade80; }
.cell-iframe {
  flex: 1;
  width: 100%;
  border: none;
  min-height: 0;
}

@media (max-width: 768px) {
  .game-login-page {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
  }
  .mobile-layout {
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .left-panel {
    width: 100% !important;
    min-width: auto !important;
    max-width: none !important;
    flex: 1;
    min-height: 0;
    border-bottom: 1px solid #e8e8e8;
  }
  .right-panel {
    flex: 1;
    min-height: 0;
  }
  .resize-handle { display: none; }
  /* 移动端列选择器简化 */
  .grid-col-selector {
    display: flex;
    gap: 2px;
    align-items: center;
    flex-wrap: nowrap;
  }
  .col-label { display: none; }
  /* 移动端增强面板单列 */
  .enhance-grid {
    grid-template-columns: 1fr;
  }
  .enhance-scroll {
    max-height: 200px;
  }
  /* 移动端日志区缩小 */
  .log-list {
    max-height: 60px;
  }
  /* 移动端工具栏紧凑化 */
  .grid-toolbar {
    flex-wrap: nowrap;
    gap: 4px;
    padding: 2px 6px;
    min-height: 28px;
  }
  .grid-toolbar > span:first-child {
    font-size: 10px;
    white-space: nowrap;
  }
  .grid-sync-toggle {
    font-size: 10px;
    padding: 1px 5px;
  }
  /* 移动端账号名称不截断 */
  .token-name {
    max-width: 120px;
  }
  /* 移动端 token 列表触摸优化 */
  .token-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .token-item {
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  /* 移动端 cell header 缩小 */
  .cell-header {
    height: 22px;
    padding: 2px 6px;
  }
  .cell-name { font-size: 10px; }
  .cell-btn { font-size: 9px; }
  /* 移动端网格间距缩小 */
  .game-grid {
    gap: 2px;
    padding: 2px;
  }
}

/* 同步控制栏 */
.sync-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 5px 12px;
  border-bottom: 1px solid #eee;
  background: #f0f7ff;
}
.sync-label {
  font-size: 11px;
  font-weight: 500;
  color: #555;
}
.sync-status {
  font-size: 11px;
  font-weight: 500;
}
.sync-on { color: #52c41a; }
.sync-off { color: #bbb; }

/* 脚本管理 */
.script-section {
  border-bottom: 1px solid #eee;
}
.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 12px;
  background: #f9f9f9;
}
.script-list {
  max-height: 150px;
  overflow-y: auto;
}
.script-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  border-top: 1px solid #f0f0f0;
}
.script-item:hover { background: #f5f5f5; }
.script-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.script-name {
  font-size: 11px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.script-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.enhance-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding: 2px 0;
}
.enhance-group-label {
  font-size: 10px;
  color: #aaa;
  padding: 4px 8px 2px;
  font-weight: 500;
}
.enhance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  padding: 0 2px;
}
.enhance-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}
.enhance-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
.enhance-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.enhance-name {
  font-size: 11px;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.enhance-file-badge {
  display: inline-block;
  font-size: 8px;
  background: #4caf50;
  color: #fff;
  padding: 0 3px;
  border-radius: 2px;
  margin-left: 4px;
  vertical-align: middle;
  line-height: 1.6;
}
.enhance-desc {
  font-size: 9px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 移动端标签切换栏 */
.mobile-tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 2px solid #e8e8e8;
  flex-shrink: 0;
}
.mobile-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mobile-tab.active {
  color: #1890ff;
}
.mobile-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 20%;
  width: 60%;
  height: 2px;
  background: #1890ff;
  border-radius: 1px;
}
.mobile-tab-badge {
  display: inline-block;
  font-size: 10px;
  background: #1890ff;
  color: #fff;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}

/* 移动端浮动同步控制条 */
.mobile-sync-float {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 5px 8px 5px 12px;
  gap: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.mobile-sync-float.sync-active {
  background: rgba(24, 144, 0, 0.85);
}
.mobile-sync-left {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.mobile-sync-icon {
  font-size: 14px;
}
.mobile-sync-text {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
.mobile-sync-badge {
  font-size: 10px;
  background: rgba(255,255,255,0.25);
  color: #fff;
  padding: 1px 6px;
  border-radius: 8px;
  white-space: nowrap;
}
.mobile-sync-toggle {
  width: 38px;
  height: 20px;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
  flex-shrink: 0;
}
.mobile-sync-toggle.off {
  background: rgba(255,255,255,0.3);
}
.mobile-sync-toggle.on {
  background: #52c41a;
}
.mobile-sync-knob {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  transition: left 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.mobile-sync-toggle.off .mobile-sync-knob {
  left: 2px;
}
.mobile-sync-toggle.on .mobile-sync-knob {
  left: 20px;
}

/* 移动端触摸提示 */
@media (hover: none) and (pointer: coarse) {
  .token-item {
    padding: 8px 10px;
  }
  .token-item:active {
    background: #e6f7ff;
    border-color: #1890ff;
  }
  .drag-handle {
    font-size: 14px;
    color: #aaa;
  }
}
</style>
