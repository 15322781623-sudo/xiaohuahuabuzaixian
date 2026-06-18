<template>
  <!-- 预设列表弹窗 -->
  <n-modal v-model:show="showPresetList" preset="card" title="一键挑战预设" style="width: 90%; max-width: 700px"
    :bordered="true" :closable="true" :mask-closable="true">
    <div class="preset-list">
      <div class="preset-toolbar">
        <n-button type="primary" size="small" @click="createNewPreset">新建预设</n-button>
        <n-button size="small" type="success" @click="executeAllPresets" :disabled="presets.length === 0">
          按顺序执行全部 ({{ presets.length }})
        </n-button>
        <n-button size="small" @click="exportPresets">导出预设</n-button>
        <n-upload
          :show-file-list="false"
          accept=".json"
          :custom-request="handleImportPresets"
        >
          <n-button size="small">导入预设</n-button>
        </n-upload>
      </div>
      <div v-for="(preset, pIdx) in presets" :key="preset.id" class="preset-item">
        <div class="preset-info">
          <span class="preset-name">
            {{ pIdx + 1 }}. {{ preset.name }}
          </span>
          <span class="preset-meta">
            👑{{ getTokenName(preset.captainTokenId) }}
            <template v-if="preset.memberTokenIds?.length">
              | 队员: {{ preset.memberTokenIds.map(id => getTokenName(id)).join(', ') }}
            </template>
            <template v-else> | 无队员</template>
          </span>
        </div>
        <div class="preset-actions">
          <n-button size="tiny" @click="editPreset(preset)">编辑</n-button>
          <n-button size="tiny" type="success" @click="executePreset(preset)">一键挑战</n-button>
          <n-button size="tiny" type="error" @click="deletePreset(preset.id)">删除</n-button>
        </div>
      </div>
      <div v-if="presets.length === 0" class="preset-empty">暂无预设，点击"新建预设"创建</div>
    </div>
  </n-modal>

  <!-- 编辑弹窗 -->
  <n-modal v-model:show="showEditor" preset="card" :title="editingPreset ? `编辑预设: ${editingPreset.name}` : '新建预设'"
    style="width: 90%; max-width: 760px" :bordered="true" :closable="true" :mask-closable="false">
    <div class="preset-editor" v-if="form">
      <!-- 名称 -->
      <div class="editor-row">
        <span class="editor-label">预设名称：</span>
        <n-input v-model:value="form.name" placeholder="输入预设名称" size="small" style="flex: 1;" />
      </div>


      <!-- 成员卡片 -->
      <div class="member-cards">
        <div v-for="(tid, idx) in allMemberIds" :key="tid" class="member-card-item">
          <div class="member-card-info">
            <span class="member-card-badge">{{ idx === 0 ? '👑' : (idx + 1) }}</span>
            <span class="member-card-name">{{ getTokenName(tid) }}</span>
            <n-tag v-if="idx === 0" size="tiny" type="warning">队长</n-tag>
            <n-tag v-else size="tiny">队员</n-tag>
            <n-tag v-if="getPillowCnt(tid) != null" size="tiny" :type="getPillowCnt(tid) === 0 ? 'error' : 'info'">
              🛏{{ getPillowCnt(tid) }}
            </n-tag>
            <n-tag v-if="isInOtherPreset(tid)" size="tiny" type="warning">已在其他预设</n-tag>
          </div>
          <div class="member-card-slot">
            <span class="slot-label">阵容</span>
            <n-select
              :value="getTeamSlot(tid)"
              :options="teamSlotOptions"
              size="tiny"
              style="width: 72px;"
              @update:value="(val) => setTeamSlot(tid, val)"
            />
          </div>
          <n-button size="tiny" quaternary type="error" @click="removeMember(tid)">×</n-button>
        </div>
        <n-select
          :value="null"
          :options="addMemberOptions"
          size="small"
          filterable
          placeholder="+ 添加成员"
          style="width: 180px;"
          @update:value="addMember"
        />
      </div>

      <!-- 关卡配置网格 -->
      <div class="levels-section">
        <div class="levels-header">
          <span class="levels-title">关卡配置</span>
          <n-button size="tiny" @click="applyLv1ToAll">套用第1关到所有关</n-button>
        </div>
        <div class="level-grid-table" :style="{ gridTemplateColumns: `60px repeat(${Math.max(allMemberIds.length, 1)}, 1fr)` }">
          <!-- 表头：成员名 -->
          <div class="grid-header-cell"></div>
          <div v-for="tid in allMemberIds" :key="`h-${tid}`" class="grid-header-cell">
            <span class="grid-header-name">{{ getRoleName(tid) }}</span>
          </div>
          <!-- 每行：关卡 -->
          <template v-for="lv in 8" :key="lv">
            <div class="grid-level-cell">
              <span class="grid-level-name">第{{ lv }}关</span>
              <span class="grid-level-boss">{{ BOSS_NAME[lv] }}</span>
            </div>
            <div v-for="tid in allMemberIds" :key="`c-${lv}-${tid}`" class="grid-cell">
              <div class="grid-cell-btns">
                <n-button
                  size="tiny"
                  :type="getAttackOrder(lv, tid) > 0 ? 'primary' : 'default'"
                  :class="{ 'btn-active': getAttackOrder(lv, tid) > 0 }"
                  @click="toggleAttack(lv, tid)"
                >出战{{ getAttackOrder(lv, tid) > 0 ? ' ' + getAttackOrder(lv, tid) : '' }}</n-button>
                <n-button
                  size="tiny"
                  :type="isRecovery(lv, tid) ? 'warning' : 'default'"
                  :class="{ 'btn-active': isRecovery(lv, tid) }"
                  @click="toggleRecovery(lv, tid)"
                >恢复</n-button>
                <n-button
                  size="tiny"
                  :type="isFullRage(lv, tid) ? 'error' : 'default'"
                  :class="{ 'btn-active': isFullRage(lv, tid) }"
                  @click="toggleFullRage(lv, tid)"
                >满怒</n-button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="editor-actions">
        <n-button type="primary" @click="savePreset">保存预设</n-button>
        <n-button @click="showEditor = false">取消</n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTokenStore } from '@/stores/tokenStore';
import { useMessage } from 'naive-ui';
import { NUpload } from 'naive-ui';

const props = defineProps({
  captainTokenId: { type: String, default: '' },
  memberTokenIds: { type: Array, default: () => [] },
});
const emit = defineEmits(['execute', 'execute-all']);

const tokenStore = useTokenStore();
const message = useMessage();

const BOSS_NAME = {
  1: "秦广王", 2: "楚江王", 3: "宋帝王", 4: "五官王",
  5: "阎罗王", 6: "卞城王", 7: "泰山王", 8: "都市王",
};

const STORAGE_KEY = 'nightmare-presets';

const showPresetList = ref(false);
const showEditor = ref(false);
const presets = ref([]);
const editingPreset = ref(null);
const form = ref(null);

const allMemberIds = computed(() => {
  if (!form.value) return [];
  const ids = [];
  if (form.value.captainTokenId) ids.push(form.value.captainTokenId);
  if (form.value.memberTokenIds) ids.push(...form.value.memberTokenIds);
  return ids;
});

// 成员变更后同步更新关卡配置（保留已有恢复/满怒设置，清理已移除成员）
const reinitAllLevels = () => {
  if (!form.value) return;
  const currentIds = [
    ...(form.value.memberTokenIds || []),
    ...(form.value.captainTokenId ? [form.value.captainTokenId] : []),
  ];
  for (let lv = 1; lv <= 8; lv++) {
    if (!form.value.levelConfig) form.value.levelConfig = {};
    if (!form.value.levelConfig[lv]) {
      form.value.levelConfig[lv] = { priority: [...currentIds], recovery: {}, fullRage: {} };
    } else {
      // 更新优先级列表
      form.value.levelConfig[lv].priority = [...currentIds];
      // 清理已移除成员的恢复/满怒配置
      const rec = form.value.levelConfig[lv].recovery || {};
      const rage = form.value.levelConfig[lv].fullRage || {};
      for (const key of Object.keys(rec)) {
        if (!currentIds.includes(key)) delete rec[key];
      }
      for (const key of Object.keys(rage)) {
        if (!currentIds.includes(key)) delete rage[key];
      }
    }
  }
};

const getTokenName = (tokenId) => {
  if (!tokenId) return '未知';
  const t = tokenStore.gameTokens.find((x) => x.id === tokenId);
  return t ? t.name : tokenId.slice(0, 8);
};

const getRoleName = (id) => {
  if (!id) return '未知';
  // 优先按 tokenId 查找
  const byTokenId = tokenStore.gameTokens.find((x) => x.id === id);
  if (byTokenId) return byTokenId.name;
  // 兼容旧数据：按 roleId 查找
  const byRoleId = tokenStore.gameTokens.find((x) => x.roleId && String(x.roleId) === String(id));
  return byRoleId ? byRoleId.name : `ID:${String(id).slice(-4)}`;
};

// ====== localStorage CRUD ======
const loadPresets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    presets.value = raw ? JSON.parse(raw) : [];
  } catch { presets.value = []; }
};

const savePresets = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value)); } catch {}
};

// ====== 初始化关卡配置 ======
const initLevelConfig = (lv) => {
  const priority = [];
  // 从表单中已选的队员开始（使用 tokenId 作为标识符，确保所有成员都出现）
  for (const tid of (form.value?.memberTokenIds || [])) {
    priority.push(tid);
  }
  // 队长放最后
  if (form.value?.captainTokenId) {
    priority.push(form.value.captainTokenId);
  }
  if (!form.value.levelConfig) form.value.levelConfig = {};
  form.value.levelConfig[lv] = { priority, recovery: {}, fullRage: {} };
};

const initAllLevels = () => {
  for (let lv = 1; lv <= 8; lv++) initLevelConfig(lv);
};

// ====== 网格操作 ======
const getAttackOrder = (lv, tokenId) => {
  const priority = form.value?.levelConfig?.[lv]?.priority || [];
  const idx = priority.indexOf(tokenId);
  return idx >= 0 ? idx + 1 : 0;
};

const toggleAttack = (lv, tokenId) => {
  if (!form.value?.levelConfig?.[lv]) return;
  const priority = form.value.levelConfig[lv].priority;
  const idx = priority.indexOf(tokenId);
  if (idx >= 0) {
    priority.splice(idx, 1);
  } else {
    priority.push(tokenId);
  }
};

const isRecovery = (lv, tokenId) => {
  return !!form.value?.levelConfig?.[lv]?.recovery?.[tokenId];
};

const isFullRage = (lv, tokenId) => {
  return !!form.value?.levelConfig?.[lv]?.fullRage?.[tokenId];
};

const toggleRecovery = (lv, tokenId) => {
  if (!form.value?.levelConfig?.[lv]) return;
  if (!form.value.levelConfig[lv].recovery) form.value.levelConfig[lv].recovery = {};
  form.value.levelConfig[lv].recovery[tokenId] = !form.value.levelConfig[lv].recovery[tokenId];
};

const toggleFullRage = (lv, tokenId) => {
  if (!form.value?.levelConfig?.[lv]) return;
  if (!form.value.levelConfig[lv].fullRage) form.value.levelConfig[lv].fullRage = {};
  form.value.levelConfig[lv].fullRage[tokenId] = !form.value.levelConfig[lv].fullRage[tokenId];
};

// ====== 阵容槽位配置 ======
const teamSlotOptions = [
  { label: '不切换', value: 0 },
  { label: '阵容1', value: 1 },
  { label: '阵容2', value: 2 },
  { label: '阵容3', value: 3 },
  { label: '阵容4', value: 4 },
  { label: '阵容5', value: 5 },
  { label: '阵容6', value: 6 },
];

const getTeamSlot = (tokenId) => {
  return form.value?.teamSlots?.[tokenId] ?? 0;
};

const setTeamSlot = (tokenId, val) => {
  if (!form.value) return;
  if (!form.value.teamSlots) form.value.teamSlots = {};
  form.value.teamSlots[tokenId] = val || 0;
};

// ====== 成员管理（卡片操作） ======
const pillowCache = ref({});
const loadPillowCache = () => {
  try {
    pillowCache.value = JSON.parse(localStorage.getItem('nightmare-pillow-cache') || '{}');
  } catch { pillowCache.value = {}; }
};

const getPillowCnt = (tokenId) => {
  const raw = pillowCache.value[tokenId];
  if (raw == null) return null;
  return Math.max(0, Number(raw) - 1);
};

// 检查成员是否在其他预设中
const isInOtherPreset = (tokenId) => {
  const editingId = editingPreset.value?.id;
  for (const p of presets.value) {
    if (p.id === editingId) continue;
    if (p.captainTokenId === tokenId) return true;
    if (p.memberTokenIds?.includes(tokenId)) return true;
  }
  return false;
};

const addMemberOptions = computed(() => {
  // 当前预设已使用的成员
  const currentUsedIds = new Set([
    ...(form.value?.memberTokenIds || []),
    ...(form.value?.captainTokenId ? [form.value.captainTokenId] : []),
  ]);

  // 其他预设已使用的成员（排除当前正在编辑的预设）
  const otherPresetUsedIds = new Set();
  const editingId = editingPreset.value?.id;
  for (const p of presets.value) {
    if (p.id === editingId) continue; // 跳过当前编辑的预设
    if (p.captainTokenId) otherPresetUsedIds.add(p.captainTokenId);
    for (const mid of (p.memberTokenIds || [])) otherPresetUsedIds.add(mid);
  }

  return (tokenStore.gameTokens || [])
    .filter(t => !currentUsedIds.has(t.id))
    .map(t => {
      const pillow = pillowCache.value[t.id];
      const realPillow = pillow != null ? Math.max(0, Number(pillow) - 1) : null;
      const pillowStr = realPillow != null ? ` 🛏${realPillow}` : '';
      const inOther = otherPresetUsedIds.has(t.id);
      const otherStr = inOther ? ' [已在其他预设]' : '';
      return { label: `${t.name}${pillowStr}${otherStr}`, value: t.id, disabled: false };
    });
});

const addMember = (tokenId) => {
  if (!tokenId || !form.value) return;
  if (!form.value.memberTokenIds) form.value.memberTokenIds = [];
  const totalMembers = (form.value.captainTokenId ? 1 : 0) + form.value.memberTokenIds.length;
  if (totalMembers >= 5) {
    message.warning('最多5名成员（含队长）');
    return;
  }
  // 第一个添加的成员自动成为队长
  if (!form.value.captainTokenId) {
    form.value.captainTokenId = tokenId;
  } else {
    form.value.memberTokenIds.push(tokenId);
  }
  reinitAllLevels();
};

const removeMember = (tokenId) => {
  if (!form.value) return;
  if (form.value.captainTokenId === tokenId) {
    // 队长移除后，第一个队员自动晋升为队长
    if (form.value.memberTokenIds && form.value.memberTokenIds.length > 0) {
      form.value.captainTokenId = form.value.memberTokenIds.shift();
    } else {
      form.value.captainTokenId = '';
    }
  } else {
    if (form.value.memberTokenIds) {
      form.value.memberTokenIds = form.value.memberTokenIds.filter(id => id !== tokenId);
    }
  }
  // 清理已移除成员的阵容槽位配置
  if (form.value.teamSlots && form.value.teamSlots[tokenId] !== undefined) {
    delete form.value.teamSlots[tokenId];
  }
  reinitAllLevels();
};

// ====== 套用第1关 ======
const applyLv1ToAll = () => {
  const lv1 = form.value.levelConfig[1];
  if (!lv1) return;
  for (let lv = 2; lv <= 8; lv++) {
    form.value.levelConfig[lv] = JSON.parse(JSON.stringify(lv1));
  }
  message.success('已将第1关配置套用到所有关卡');
};

// ====== CRUD ======
const createNewPreset = () => {
  editingPreset.value = null;
  form.value = {
    id: 'nm_preset_' + Date.now(),
    name: '新预设',
    captainTokenId: props.captainTokenId,
    memberTokenIds: [...(props.memberTokenIds || [])],
    teamSlots: {},
    levelConfig: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  initAllLevels();
  showEditor.value = true;
};

const editPreset = (preset) => {
  editingPreset.value = preset;
  form.value = JSON.parse(JSON.stringify(preset));
  // 补全缺失字段
  if (!form.value.memberTokenIds) form.value.memberTokenIds = [];
  if (!form.value.teamSlots) form.value.teamSlots = {};
  const currentIds = [
    ...(form.value.memberTokenIds || []),
    ...(form.value.captainTokenId ? [form.value.captainTokenId] : []),
  ];
  // 补全缺失的关卡配置，并清理已移除成员的恢复/满怒
  for (let lv = 1; lv <= 8; lv++) {
    if (!form.value.levelConfig[lv]) {
      initLevelConfig(lv);
    } else {
      if (!form.value.levelConfig[lv].fullRage) form.value.levelConfig[lv].fullRage = {};
      if (!form.value.levelConfig[lv].recovery) form.value.levelConfig[lv].recovery = {};
      // 清理已移除成员的配置
      for (const key of Object.keys(form.value.levelConfig[lv].recovery)) {
        if (!currentIds.includes(key)) delete form.value.levelConfig[lv].recovery[key];
      }
      for (const key of Object.keys(form.value.levelConfig[lv].fullRage)) {
        if (!currentIds.includes(key)) delete form.value.levelConfig[lv].fullRage[key];
      }
    }
  }
  showEditor.value = true;
};

const savePreset = () => {
  if (!form.value.name?.trim()) { message.warning('请输入预设名称'); return; }
  if (!form.value.captainTokenId) { message.warning('请选择队长'); return; }
  form.value.updatedAt = Date.now();
  const idx = presets.value.findIndex((p) => p.id === form.value.id);
  if (idx !== -1) presets.value[idx] = { ...form.value };
  else presets.value.push({ ...form.value });
  savePresets();
  showEditor.value = false;
  message.success('预设已保存');
};

const deletePreset = (id) => {
  presets.value = presets.value.filter((p) => p.id !== id);
  savePresets();
  message.success('预设已删除');
};

const executePreset = (preset) => {
  showPresetList.value = false;
  emit('execute', preset);
};

const executeAllPresets = () => {
  if (presets.value.length === 0) { message.warning('暂无预设可执行'); return; }
  showPresetList.value = false;
  message.info(`开始按顺序执行 ${presets.value.length} 个预设...`);
  emit('execute-all', [...presets.value]);
};

// ====== 导入/导出 ======
const exportPresets = () => {
  if (presets.value.length === 0) { message.warning('暂无预设可导出'); return; }
  const data = JSON.stringify(presets.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nightmare-presets_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success(`已导出 ${presets.value.length} 个十殿预设`);
};

const handleImportPresets = async ({ file }) => {
  try {
    const text = await file.file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) { message.error('文件格式无效：需要预设数组'); return; }
    const existingIds = new Set(presets.value.map((p) => p.id));
    let added = 0;
    imported.forEach((p) => {
      if (!p.id || !p.name) return;
      if (existingIds.has(p.id)) return; // 跳过重复
      presets.value.push(p);
      added++;
    });
    savePresets();
    message.success(`导入成功：新增 ${added} 个预设`);
  } catch (err) {
    message.error(`导入失败: ${err.message || err}`);
  }
};

// ====== 对外暴露 ======
const open = () => {
  loadPresets();
  loadPillowCache();
  showPresetList.value = true;
};

const close = () => {
  showPresetList.value = false;
  showEditor.value = false;
};

defineExpose({ open, close });
</script>

<style lang="scss" scoped>
.preset-list {
  .preset-toolbar {
    display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;
  }
  .preset-item {
    display: flex; justify-content: space-between; align-items: center; padding: 10px;
    border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px;
    .preset-info {
      .preset-name { font-weight: bold; display: block; }
      .preset-meta { font-size: 12px; color: var(--text-tertiary); }
    }
    .preset-actions { display: flex; gap: 4px; }
  }
  .preset-empty { text-align: center; color: var(--text-tertiary); padding: 20px; }
}
.preset-editor {
  .editor-row {
    display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    .editor-label { font-weight: bold; white-space: nowrap; color: var(--text-primary); }
  }
  .member-cards {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; align-items: center;
  }
  .member-card-item {
    display: flex; align-items: center; gap: 6px; padding: 6px 10px;
    border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary);
    .member-card-info { display: flex; align-items: center; gap: 4px; }
    .member-card-badge { font-size: 16px; }
    .member-card-name { font-size: 12px; font-weight: bold; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .member-card-slot {
      display: flex; align-items: center; gap: 4px;
      .slot-label { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }
    }
  }
  .levels-section {
    margin-bottom: 16px;
    .levels-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      .levels-title { font-weight: bold; color: var(--text-primary); }
    }
  }
  .level-grid-table {
    display: grid; gap: 2px; align-items: center;
  }
  .grid-header-cell {
    padding: 4px 2px; text-align: center; font-size: 11px; font-weight: bold;
    color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    .grid-header-name { display: block; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 auto; }
  }
  .grid-level-cell {
    padding: 4px 6px; display: flex; flex-direction: column; align-items: flex-end;
    .grid-level-name { font-size: 12px; font-weight: bold; color: var(--text-primary); }
    .grid-level-boss { font-size: 10px; color: var(--text-tertiary); }
  }
  .grid-cell {
    padding: 3px 2px;
    .grid-cell-btns { display: flex; flex-direction: column; gap: 2px; }
    .btn-active { font-weight: bold; }
  }
  .editor-actions { display: flex; gap: 8px; margin-top: 16px; }
}
</style>
