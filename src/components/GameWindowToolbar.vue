<template>
  <div v-if="windowCount > 0" class="gwt-float" :class="{ collapsed }">
    <!-- 标题栏 -->
    <div class="gwt-header" @click="collapsed = !collapsed">
      <span class="gwt-title">🎮 游戏窗口 ({{ windowCount }})</span>
      <span class="gwt-toggle">{{ collapsed ? '▲' : '▼' }}</span>
    </div>

    <div v-show="!collapsed" class="gwt-body">
      <!-- 工具按钮行 -->
      <div class="gwt-actions">
        <button class="gwt-btn" title="全部刷新" @click="refreshAll">↻ 刷新</button>
        <button
          class="gwt-btn"
          :class="{ active: syncEnabled }"
          title="操作同步"
          @click="toggleSync(!syncEnabled)"
        >
          📡 {{ syncEnabled ? '同步中' : '同步' }}
        </button>
        <button class="gwt-btn" title="自动排列" @click="arrangeWindows">⊞ 排列</button>
        <button class="gwt-btn danger" title="全部关闭" @click="closeAll">✕ 关闭</button>
      </div>

      <!-- 同步分组信息 -->
      <div v-if="syncEnabled" class="gwt-sync-info">
        <template v-if="syncGroupStats.length > 0">
          <span v-for="g in syncGroupStats" :key="g.color" class="gwt-group-chip">
            <span class="gwt-dot" :style="{ background: g.color }"></span>
            <span :style="{ color: g.color }">{{ g.count }}个</span>
            <span v-if="g.masterName" :style="{ color: g.color }" title="主窗口">⚑{{ g.masterName }}</span>
          </span>
        </template>
        <span v-if="syncUngroupedCount > 0" class="gwt-ungrouped">
          {{ syncGroupStats.length === 0 ? `${syncUngroupedCount}个窗口全局同步` : `未分组 ${syncUngroupedCount}` }}
        </span>
      </div>

      <!-- 窗口列表 -->
      <div class="gwt-list">
        <div v-for="item in windowList" :key="item.tokenId" class="gwt-item">
          <span
            class="gwt-item-dot"
            :style="{ background: item.group || '#666' }"
            title="点击切换分组"
            @click="cycleGroup(item.tokenId)"
          ></span>
          <span class="gwt-item-name" :title="item.name">{{ item.name }}</span>
          <button class="gwt-mini-btn" title="刷新" @click="refreshSingle(item.tokenId)">↻</button>
          <button class="gwt-mini-btn" title="设为主窗口" @click="setMasterForItem(item)">⚑</button>
          <button class="gwt-mini-btn danger" title="关闭" @click="removeWindow(item.tokenId)">✕</button>
        </div>
      </div>

      <!-- 游戏增强 -->
      <div class="gwt-enhance-section">
        <div class="gwt-enhance-header" @click="enhanceCollapsed = !enhanceCollapsed">
          <span style="font-weight:500;">🔧 游戏增强 ({{ enabledCount }}/{{ ENHANCEMENTS.length }})</span>
          <span class="gwt-enhance-tools" @click.stop>
            <button class="gwt-btn gwt-reset-btn" title="恢复默认" @click="resetEnhancements">恢复默认</button>
            <span style="font-size:10px;color:#888;">{{ enhanceCollapsed ? '▶' : '▼' }}</span>
          </span>
        </div>
        <div v-show="!enhanceCollapsed" class="gwt-enhance-scroll">
          <template v-for="grp in enhanceGroups" :key="grp.name">
            <div class="gwt-group-label">{{ grp.name }} ({{ grp.items.filter(e => enhancementState[e.key]).length }}/{{ grp.items.length }})</div>
            <div v-for="enh in grp.items" :key="enh.key" class="gwt-enhance-item" @click="toggleEnhancement(enh.key, !enhancementState[enh.key])">
              <span class="gwt-switch" :class="{ on: enhancementState[enh.key] }">
                <span class="gwt-switch-dot"></span>
              </span>
              <div class="gwt-enhance-text">
                <span class="gwt-enhance-name">{{ enh.name }}<span v-if="enh.file" class="gwt-file-badge">F</span></span>
                <span class="gwt-enhance-desc">{{ enh.desc }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue';
import { useGameWindowManager } from '@/composables/useGameWindowManager';
import { ENHANCE_KEY, ENHANCEMENTS, DEFAULT_ENABLED, buildAndCacheEnhanceCodes, migrateEnhancementConfig } from '@/utils/gameEnhanceConfig';

const collapsed = ref(false);

const {
  windowCount,
  windowList,
  syncEnabled,
  syncGroupStats,
  syncUngroupedCount,
  syncGroups,
  refreshSingle,
  refreshAll,
  closeAll,
  toggleSync,
  arrangeWindows,
  removeWindow,
  cycleGroup,
  setMaster,
} = useGameWindowManager();

function setMasterForItem(item) {
  const group = syncGroups[item.tokenId] || '__ungrouped__';
  setMaster(group, item.tokenId);
}

// ── 游戏增强功能 ──
const enhanceCollapsed = ref(true);
const enhancementState = reactive({});
try {
  const saved = JSON.parse(localStorage.getItem(ENHANCE_KEY) || '{}');
  Object.assign(enhancementState, saved);
} catch(e) {}
ENHANCEMENTS.forEach(e => { if (enhancementState[e.key] === undefined) enhancementState[e.key] = DEFAULT_ENABLED.has(e.key); });
// 旧配置迁移：断线重连(wsReconnect)已合并入自动重连，清理残留键并写回
const hadLegacyReconnect = 'wsReconnect' in enhancementState;
migrateEnhancementConfig(enhancementState);
if (hadLegacyReconnect) localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancementState));

const enabledCount = computed(() => ENHANCEMENTS.filter(e => enhancementState[e.key]).length);

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

function toggleEnhancement(key, val) {
  enhancementState[key] = val;
  localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancementState));
  buildAndCacheEnhanceCodes(enhancementState, getScripts());
}

function resetEnhancements() {
  ENHANCEMENTS.forEach(e => { enhancementState[e.key] = DEFAULT_ENABLED.has(e.key); });
  localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancementState));
  buildAndCacheEnhanceCodes(enhancementState, getScripts());
}

function getScripts() {
  try { return JSON.parse(localStorage.getItem('__game_scripts__') || '[]'); } catch { return []; }
}

// 初始化时确保缓存存在
nextTick(() => buildAndCacheEnhanceCodes(enhancementState, getScripts()));
</script>

<style scoped>
.gwt-float {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  width: 300px;
  max-height: 75vh;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 12px;
}
.gwt-float.collapsed {
  max-height: none;
}
.gwt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  user-select: none;
}
.gwt-title {
  font-weight: 600;
  font-size: 13px;
}
.gwt-toggle {
  font-size: 10px;
  color: #888;
}
.gwt-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.gwt-actions {
  display: flex;
  gap: 4px;
  padding: 8px;
  flex-wrap: wrap;
}
.gwt-btn {
  flex: 1;
  min-width: 52px;
  padding: 4px 6px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 5px;
  background: var(--bg-primary, #fff);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  transition: all .15s;
}
.gwt-btn:hover {
  background: var(--bg-secondary, #f0f0f0);
}
.gwt-btn.active {
  background: #e8f5e9;
  border-color: #4caf50;
  color: #2e7d32;
}
.gwt-btn.danger:hover {
  background: #ffebee;
  border-color: #e74c3c;
  color: #c0392b;
}
.gwt-sync-info {
  padding: 2px 10px 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 11px;
}
.gwt-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.gwt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.gwt-ungrouped {
  color: #888;
  font-size: 10px;
}
.gwt-list {
  overflow-y: auto;
  max-height: 220px;
  padding: 4px 8px 8px;
}
.gwt-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 4px;
  border-radius: 4px;
}
.gwt-item:hover {
  background: var(--bg-secondary, #f5f5f5);
}
.gwt-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
}
.gwt-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.gwt-mini-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
  padding: 0;
  flex-shrink: 0;
}
.gwt-mini-btn:hover {
  background: var(--bg-secondary, #eee);
}
.gwt-mini-btn.danger:hover {
  background: #ffebee;
  color: #c0392b;
}

/* 游戏增强区域 */
.gwt-enhance-section {
  border-top: 1px solid var(--border-color, #e0e0e0);
}
.gwt-enhance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  user-select: none;
}
.gwt-enhance-header:hover {
  background: var(--bg-secondary, #f5f5f5);
}
.gwt-enhance-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}
.gwt-reset-btn {
  flex: none;
  padding: 1px 6px;
  font-size: 10px;
  line-height: 1.6;
}
.gwt-enhance-scroll {
  max-height: 240px;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.gwt-group-label {
  font-size: 10px;
  font-weight: 600;
  color: #888;
  padding: 6px 2px 2px;
  text-transform: uppercase;
}
.gwt-enhance-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 2px;
  border-radius: 4px;
  cursor: pointer;
}
.gwt-enhance-item:hover {
  background: var(--bg-secondary, #f5f5f5);
}
.gwt-switch {
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: #ccc;
  position: relative;
  flex-shrink: 0;
  margin-top: 1px;
  transition: background .2s;
}
.gwt-switch.on {
  background: #4caf50;
}
.gwt-switch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left .2s;
}
.gwt-switch.on .gwt-switch-dot {
  left: 14px;
}
.gwt-enhance-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.gwt-enhance-name {
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: break-word;
  word-break: break-word;
}
.gwt-enhance-desc {
  font-size: 10px;
  color: #888;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}
.gwt-file-badge {
  display: inline-block;
  font-size: 9px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 2px;
  padding: 0 3px;
  margin-left: 3px;
  vertical-align: middle;
}

/* 暗色主题 */
:root[data-theme="dark"] .gwt-float,
.dark .gwt-float {
  background: #1e1e2e;
  border-color: #333;
  box-shadow: 0 4px 20px rgba(0,0,0,.4);
}
:root[data-theme="dark"] .gwt-header,
.dark .gwt-header {
  background: #262636;
  border-color: #333;
}
:root[data-theme="dark"] .gwt-btn,
.dark .gwt-btn {
  background: #2a2a3a;
  border-color: #444;
  color: #ddd;
}
:root[data-theme="dark"] .gwt-btn:hover,
.dark .gwt-btn:hover {
  background: #333346;
}
:root[data-theme="dark"] .gwt-btn.active,
.dark .gwt-btn.active {
  background: #1b3d1e;
  border-color: #4caf50;
  color: #81c784;
}
:root[data-theme="dark"] .gwt-item:hover,
.dark .gwt-item:hover {
  background: #2a2a3a;
}
:root[data-theme="dark"] .gwt-enhance-section,
.dark .gwt-enhance-section {
  border-color: #333;
}
:root[data-theme="dark"] .gwt-enhance-header:hover,
.dark .gwt-enhance-header:hover {
  background: #2a2a3a;
}
:root[data-theme="dark"] .gwt-enhance-item:hover,
.dark .gwt-enhance-item:hover {
  background: #2a2a3a;
}
:root[data-theme="dark"] .gwt-switch,
.dark .gwt-switch {
  background: #555;
}
:root[data-theme="dark"] .gwt-file-badge,
.dark .gwt-file-badge {
  background: #1a3a5c;
  color: #64b5f6;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .gwt-float {
    right: 8px;
    bottom: 8px;
    width: 240px;
  }
}
</style>
