<script setup>
import { computed } from 'vue';
import { LINEUP_RULES } from '@/utils/HeroList.js';

const props = defineProps({
  modelValue: { type: Object, required: true },
});
const emit = defineEmits(['update:modelValue']);

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});
const set = (key, val) => emit('update:modelValue', { ...props.modelValue, [key]: val });

const strategyOptions = [
  { label: '清空区域优先', value: 'clearArea' },
  { label: '挑战奖励优先', value: 'rewardFirst' },
  { label: '仅空投（挑战虚拟对手）', value: 'airdropOnly' },
];
const targetFilterOptions = [
  { label: '无限制', value: 'none' },
  { label: '仅挑战统帅/骁将', value: 'commanderGeneral' },
  { label: '仅挑战困难/炼狱', value: 'hardHell' },
  { label: '仅挑战统帅/骁将/困难/炼狱', value: 'both' },
];
const formationOptions = [
  { label: '竞技场阵容', value: 'arena' },
  { label: '不切换（使用当前阵容）', value: 'current' },
];
const behaviorOptions = [
  { label: '无失败余地时转空投', value: 'airdrop' },
  { label: '无失败余地时暂停', value: 'pause' },
  { label: '挑战次数直接用完', value: 'useAll' },
];
</script>

<template>
  <div class="camp-challenge-config">
    <div class="camp-cols">
      <n-form-item label="挑战策略">
        <n-select
          :value="form.strategy"
          :options="strategyOptions"
          size="small"
          @update:value="set('strategy', $event)"
        />
      </n-form-item>
      <n-form-item label="目标筛选">
        <n-select
          :value="form.targetFilter"
          :options="targetFilterOptions"
          size="small"
          :disabled="form.strategy !== 'rewardFirst'"
          @update:value="set('targetFilter', $event)"
        />
      </n-form-item>
    </div>

    <n-form-item label="排除对手">
      <n-checkbox-group
        :value="form.excludeLineups"
        class="camp-exclude-group"
        @update:value="set('excludeLineups', $event)"
      >
        <n-checkbox
          v-for="r in LINEUP_RULES"
          :key="r.name"
          :value="r.name"
          :label="r.name"
          size="small"
        />
      </n-checkbox-group>
    </n-form-item>

    <n-form-item label="畏首畏尾">
      <div class="camp-coward-wrap">
        <n-switch
          :value="form.cowardEnabled !== false"
          size="small"
          @update:value="set('cowardEnabled', $event)"
        />
        <span class="camp-hint">
          {{ form.cowardEnabled !== false ? '遇到强力对手会跳过后再选' : '不因对手过强而退缩' }}
        </span>
      </div>
    </n-form-item>

    <n-form-item label=" ">
      <div class="camp-ratio-row">
        <span class="camp-ratio-label">对手战力是自己</span>
        <n-input-number
          :value="form.powerRatio"
          :min="0.8"
          :max="2.0"
          :step="0.1"
          size="small"
          style="width: 110px"
          @update:value="set('powerRatio', $event)"
        />
        <span class="camp-ratio-label">倍时退缩</span>
      </div>
      <div class="camp-ratio-row">
        <span class="camp-ratio-label">对手总红淬炼是自己</span>
        <n-input-number
          :value="form.quenchRatio"
          :min="0.8"
          :max="2.0"
          :step="0.1"
          size="small"
          style="width: 110px"
          @update:value="set('quenchRatio', $event)"
        />
        <span class="camp-ratio-label">倍时退缩</span>
      </div>
    </n-form-item>

    <div class="camp-cols">
      <n-form-item label="出战阵容">
        <n-select
          :value="form.formation"
          :options="formationOptions"
          size="small"
          @update:value="set('formation', $event)"
        />
      </n-form-item>
      <n-form-item label="行为管理">
        <n-select
          :value="form.behavior"
          :options="behaviorOptions"
          size="small"
          @update:value="set('behavior', $event)"
        />
      </n-form-item>
    </div>

    <n-form-item label="屡战屡败">
      <div class="camp-coward-wrap">
        <n-input-number
          :value="form.maxConsecutiveFail"
          :min="1"
          :max="10"
          :step="1"
          size="small"
          style="width: 110px"
          @update:value="set('maxConsecutiveFail', $event)"
        />
        <span class="camp-hint">同一对手允许连续挑战失败次数（1~10）</span>
      </div>
    </n-form-item>
  </div>
</template>

<style scoped>
.camp-challenge-config {
  width: 100%;
}
.camp-cols {
  display: flex;
  gap: 12px;
}
.camp-cols > :deep(.n-form-item) {
  flex: 1 1 0;
  min-width: 0;
}
.camp-challenge-config :deep(.n-form-item) {
  margin-bottom: 12px;
}
.camp-challenge-config :deep(.n-form-item-label) {
  min-width: 78px;
}
.camp-exclude-group {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
}
.camp-coward-wrap,
.camp-ratio-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.camp-hint {
  font-size: 12px;
  opacity: 0.7;
}
.camp-ratio-row {
  width: 100%;
  padding: 2px 0;
}
.camp-ratio-label {
  font-size: 13px;
  white-space: nowrap;
}
</style>
