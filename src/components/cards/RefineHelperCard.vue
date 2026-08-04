<template>
  <MyCard class="refine-helper" :status-class="{ active: state.isRunning }">
    <template #icon>
      <img alt="洗练图标" src="/icons/ta.png">
    </template>
    <template #title>
      <h3>洗练助手</h3>
      <p>装备洗练、锁定孔位、自动洗练</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="refine-container">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <n-button size="small" type="primary" @click="refreshHeroes">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
              刷新阵容
            </n-button>
            <n-button size="small" @click="resetCount">清零</n-button>
          </div>
          <div class="jade-info">
            <n-tag size="small" type="info" :bordered="false">
              白玉: {{ jadeCount }}
            </n-tag>
            <n-tag size="small" type="warning" :bordered="false">
              彩玉: {{ colorJadeCount }}
            </n-tag>
          </div>
        </div>

        <!-- 武将列表 -->
        <div class="section">
          <div class="section-header">
            <h4>选择武将</h4>
            <span class="section-hint">点击选择要洗练的武将</span>
          </div>
          <div class="hero-list">
            <div v-if="loading" class="loading-state">
              <n-spin size="small" />
              <span>加载中...</span>
            </div>
            <div v-else-if="heroes.length === 0" class="empty-state">
              <n-empty description="暂无武将数据" size="small" />
            </div>
            <div
              v-for="hero in heroes"
              :key="hero.id"
              class="hero-item"
              :class="{ active: selectedHeroId === hero.id }"
              @click="selectHero(hero.id)"
            >
              <div class="hero-avatar">
                <img v-if="HERO_DICT[hero.id]?.avatar" :alt="hero.name" :src="HERO_DICT[hero.id]?.avatar">
                <div v-else class="hero-placeholder">{{ hero.name?.substring(0, 2) || "?" }}</div>
              </div>
              <div class="hero-info">
                <div class="hero-name">{{ hero.name }}</div>
                <div class="hero-level">Lv.{{ hero.level }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 装备列表 -->
        <div v-if="selectedHeroId" class="section">
          <div class="section-header">
            <h4>选择装备</h4>
            <span class="section-hint">点击选择要洗练的装备部位</span>
          </div>
          <div class="equip-tabs">
            <div
              v-for="part in equipParts"
              :key="part.id"
              class="equip-tab"
              :class="{ active: selectedPart === part.id }"
              @click="selectPart(part.id)"
            >
              <div class="tab-name">{{ part.name }}</div>
              <div class="tab-level">Lv.{{ part.level }}</div>
            </div>
          </div>
        </div>

        <!-- 洗练详情 -->
        <div v-if="selectedPart" class="refine-detail">
          <!-- 洗练统计 -->
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-label">淬炼次数</span>
              <span class="stat-value">{{ quenchTimes }}</span>
              <template v-if="remainingForNextSlot">
                <span class="stat-remaining">
                  (剩余{{ remainingForNextSlot.remaining }}次解锁{{ remainingForNextSlot.slotNumber }}孔)
                </span>
              </template>
              <span v-else class="stat-complete">✓全部孔位已解锁</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ equipBonusName }}</span>
              <span class="stat-value bonus-value">+{{ equipBonusValue }}</span>
            </div>
          </div>

          <!-- 洗练孔位 -->
          <div class="section">
            <div class="section-header">
              <h4>孔位锁定</h4>
              <span class="section-hint">勾选锁定孔位，洗练时不会改变</span>
              <n-button
                size="tiny"
                type="primary"
                quaternary
                :loading="refreshingSlots"
                :disabled="state.isRunning"
                @click="refreshSlots"
              >
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                刷新孔位
              </n-button>
            </div>
            <div class="slots-row">
              <div
                v-for="slot in slots"
                :key="slot.id"
                class="slot-item"
                :class="{
                  locked: slot.isLocked,
                  [`color-${slot.colorId}`]: slot.colorId > 0,
                }"
              >
                <div class="slot-icon">
                  <n-checkbox
                    v-model:checked="slot.isLocked"
                    @update:checked="(val) => handleSlotLock(slot.id, val)"
                    size="small"
                  ></n-checkbox>
                </div>
                <div class="slot-name">孔{{ slot.id }}</div>
                <div v-if="slot.attrId" class="slot-attr-info">
                  <div class="slot-attr-name">{{ getAttrName(slot.attrId) }}</div>
                  <div class="slot-attr-value">+{{ slot.attrNum }}%</div>
                </div>
                <div v-else class="slot-attr-info empty">
                  <span>未淬炼</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 密码验证区域 -->
          <div class="password-section">
            <div v-if="!isPasswordValidated" class="password-form">
              <span class="password-label">解锁二级密码：</span>
              <n-input
                placeholder="请输入二级密码"
                size="small"
                type="password"
                v-model:value="password"
                @input="passwordError = ''"
                style="flex: 1; max-width: 150px;"
              ></n-input>
              <n-button
                size="small"
                type="primary"
                :loading="isVerifying"
                @click="verifyPassword"
              >
                验证
              </n-button>
              <span v-if="passwordError" class="password-error">{{ passwordError }}</span>
            </div>
            <div v-else class="password-validated">
              <n-tag size="small" type="success" :bordered="false">
                <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
                密码已验证
              </n-tag>
              <n-button
                size="small"
                type="warning"
                @click="resetPasswordValidation"
              >
                重新验证
              </n-button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="actions-section">
            <div class="actions-row">
              <n-button
                size="small"
                type="primary"
                :disabled="state.isRunning"
                @click="quenchOnce"
              >
                <template #icon><n-icon><FlashOutline /></n-icon></template>
                淬炼一次
              </n-button>
              <n-button
                size="small"
                type="success"
                :disabled="state.isRunning"
                @click="quenchContinuous"
              >
                <template #icon><n-icon><PlayCircleOutline /></n-icon></template>
                连续淬炼
              </n-button>
              <n-button
                size="small"
                type="info"
                :disabled="state.isRunning"
                @click="flipQuench"
              >
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                翻转
              </n-button>
              <div class="quench-count-wrapper">
                <span class="count-label">次数</span>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-input-number
                      v-model:value="continuousQuenchCount"
                      :min="0"
                      :max="9000"
                      :step="10"
                      size="small"
                      :disabled="state.isRunning"
                      style="width: 90px;"
                    />
                  </template>
                  设为 0 时不限次数，自动淬炼直到达成目标或手动停止
                </n-tooltip>
                <span class="count-hint">0=无限</span>
              </div>
            </div>
            <div class="actions-row">
              <n-button
                size="small"
                type="warning"
                :disabled="state.isRunning"
                @click="startAutoQuench"
              >
                <template #icon><n-icon><SettingsOutline /></n-icon></template>
                自动淬炼
              </n-button>
              <n-button
                size="small"
                type="error"
                :disabled="!state.isRunning"
                @click="stopQuench"
              >
                <template #icon><n-icon><StopCircleOutline /></n-icon></template>
                停止
              </n-button>
              <div class="quench-status">
                <span class="status-label">已淬炼</span>
                <span class="status-value">{{ quenchCount }}</span>
              </div>
              <div class="quench-count-wrapper">
                <span class="count-label">延迟(ms)</span>
                <n-input-number
                  v-model:value="delay"
                  :min="0"
                  :max="5000"
                  :step="100"
                  size="small"
                  style="width: 100px;"
                />
              </div>
              <n-switch
                size="small"
                v-model:value="skipOrangeQuality"
                :disabled="state.isRunning"
                class="skip-switch"
              >
                <template #checked>跳过橙</template>
                <template #unchecked>遇橙确认</template>
              </n-switch>
              <n-switch
                size="small"
                v-model:value="skipRedQuality"
                :disabled="state.isRunning"
                class="skip-switch"
              >
                <template #checked>跳过红</template>
                <template #unchecked>遇红确认</template>
              </n-switch>
            </div>
          </div>

          <!-- 自动淬炼设置 -->
          <div class="auto-section">
            <div class="section-header">
              <h4>自动淬炼设置</h4>
              <span class="section-hint">设置目标属性，达到条件自动停止</span>
            </div>
            <!-- 条件列表 -->
            <div class="conditions-list">
              <div
                v-for="(condition, index) in targetConditions"
                :key="index"
                class="condition-row"
              >
                <div class="condition-form">
                  <div class="form-group">
                    <span class="form-label">属性</span>
                    <n-select
                      placeholder="选择属性"
                      size="small"
                      v-model:value="condition.attrId"
                      :options="attrOptions"
                      style="width: 100%;"
                    ></n-select>
                  </div>
                  <div class="form-group">
                    <span class="form-label">≥</span>
                    <n-input-number
                      size="small"
                      v-model:value="condition.attrValue"
                      :max="100"
                      :min="1"
                      style="width: 100%;"
                    ></n-input-number>
                  </div>
                  <n-button
                    size="small"
                    type="error"
                    quaternary
                    :disabled="targetConditions.length <= 1"
                    @click="removeCondition(index)"
                  >
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                  </n-button>
                </div>
              </div>
            </div>
            <!-- 添加条件按钮 -->
            <div class="add-condition-row">
              <n-button
                size="small"
                type="primary"
                dashed
                @click="addCondition"
                style="width: 100%;"
              >
                <template #icon><n-icon><AddCircleOutline /></n-icon></template>
                添加条件
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, h, ref, watch } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";
import { HERO_DICT } from "@/utils/HeroList.js";
import {
  RefreshOutline,
  CheckmarkCircleOutline,
  FlashOutline,
  PlayCircleOutline,
  SettingsOutline,
  StopCircleOutline,
  TrashOutline,
  AddCircleOutline,
} from "@vicons/ionicons5";

const tokenStore = useTokenStore();
const message = useMessage();
const dialog = useDialog();

// 响应式数据
const loading = ref(false);
const heroes = ref([]);
const selectedHeroId = ref(null);
const selectedPart = ref(null);
const quenchCount = ref(0);
const delay = ref(300);
const skipOrangeQuality = ref(false); // 跳过橙色品质
const skipRedQuality = ref(false); // 跳过红色品质
// 连续淬炼次数（初始值100，后续根据装备动态计算）
const continuousQuenchCount = ref(100);

// 计算连续淬炼默认值（下一孔所需次数 - 500）
const calculateDefaultQuenchCount = () => {
  const nextSlot = remainingForNextSlot.value;
  if (!nextSlot) {
    // 全部孔位已解锁，默认9999
    return 9999;
  }
  
  // 下一孔所需次数 - 500，最小为1
  const defaultCount = nextSlot.remaining - 500;
  return Math.max(1, defaultCount);
};
const MAX_QUENCH_COUNT = 9000; // 最大淬炼次数
// 将单个条件改为数组形式，支持多个条件
const targetConditions = ref([{
  attrId: null,
  attrValue: null,
}]);
const jadeCount = ref(0);
const colorJadeCount = ref(0);
// 密码验证相关
const password = ref("");
const isPasswordValidated = ref(false);
const passwordError = ref("");
const isVerifying = ref(false);

// 状态
const state = ref({
  isRunning: false,
  continuousQuenching: false,
  autoQuenching: false,
  stopRequested: false,
});

// WebSocket相关
let continuousTimer = null;
let autoTimer = null;

// 属性映射
const attrMap = {
  1: "攻击",
  2: "血量",
  3: "防御",
  4: "速度",
  5: "破甲",
  6: "破甲抵抗",
  7: "精准",
  8: "格挡",
  9: "减伤",
  10: "暴击",
  11: "暴击抵抗",
  12: "爆伤",
  13: "爆伤抵抗",
  14: "技能伤害",
  15: "免控",
  16: "眩晕免疫",
  17: "冰冻免疫",
  18: "沉默免疫",
  19: "流血免疫",
  20: "中毒免疫",
  21: "灼烧免疫",
};

// 装备部位映射
const partMap = {
  1: "武器",
  2: "铠甲",
  3: "头冠",
  4: "坐骑",
};

// 英雄数据
const allHeroesData = ref({});
const heroEquipment = ref({});
const slots = ref([]);
const quenchTimes = ref(0);
const equipBonusName = ref("攻击");
const equipBonusValue = ref(0);

// 孔位解锁所需次数
const SLOT_THRESHOLDS = [0, 10, 100, 1000, 10000];

// 剩余下一孔次数
const remainingForNextSlot = computed(() => {
  const current = quenchTimes.value;
  
  // 找到下一个未解锁的孔位
  for (let i = 0; i < SLOT_THRESHOLDS.length; i++) {
    if (current < SLOT_THRESHOLDS[i]) {
      return {
        remaining: SLOT_THRESHOLDS[i] - current,
        slotNumber: i + 1,
        threshold: SLOT_THRESHOLDS[i],
      };
    }
  }
  
  // 全部解锁
  return null;
});

// 属性选项
const attrOptions = computed(() => {
  return Object.entries(attrMap).map(([id, name]) => ({
    label: name,
    value: Number(id),
  }));
});

// 装备部位列表
const equipParts = computed(() => {
  if (!heroEquipment.value)
    return [];
  return Object.entries(heroEquipment.value).map(([id, equip]) => ({
    id: Number(id),
    name: partMap[Number(id)] || `装备${id}`,
    level: equip?.level || 1,
  }));
});

// 刷新阵容
const refreshHeroes = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法刷新阵容");
    return;
  }

  loading.value = true;
  try {
    // 获取预设队伍信息和角色信息
    const [presetTeamInfo, roleInfo] = await Promise.all([
      tokenStore.sendMessageWithPromise(tokenId, "presetteam_getinfo", {}),
      tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}),
    ]);

    // 解析队伍数据
    const teamData = parseTeamData(presetTeamInfo);
    const role = roleInfo?.role || roleInfo;
    const heroData = role?.heroes || {};
    const items = role?.items || {};

    // 更新白玉和彩玉数量
    jadeCount.value = items["1022"]?.quantity || 0;
    colorJadeCount.value = items["1023"]?.quantity || 0;

    // 构建英雄列表
    const heroList = buildHeroList(teamData, heroData);
    heroes.value = heroList;
    allHeroesData.value = heroData;

    message.success("阵容刷新成功");
  } catch (error) {
    message.error(`刷新阵容失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 切换账号时重置洗练助手状态（英雄/装备/孔位信息属于旧账号，必须清空）
watch(
  () => tokenStore.selectedToken?.id,
  (newId, oldId) => {
    if (!oldId || newId === oldId)
      return;

    // 停止进行中的洗练
    if (state.value.isRunning) {
      stopQuench();
    }

    // 清空旧账号数据
    heroes.value = [];
    allHeroesData.value = {};
    selectedHeroId.value = null;
    selectedPart.value = null;
    heroEquipment.value = {};
    slots.value = [];
    quenchTimes.value = 0;
    equipBonusValue.value = 0;
    jadeCount.value = 0;
    colorJadeCount.value = 0;
    quenchCount.value = 0;

    // 新账号已连接时自动刷新阵容
    if (newId && tokenStore.getWebSocketStatus(newId) === "connected") {
      refreshHeroes();
    }
  },
);

// 解析队伍数据
const parseTeamData = (presetTeamInfo) => {
  if (!presetTeamInfo) {
    return {
      useTeamId: 1,
      teams: {},
    };
  }
  const root = presetTeamInfo.presetTeamInfo ?? presetTeamInfo;
  const findUseIdRec = (obj) => {
    if (!obj || typeof obj !== "object")
      return null;
    if (typeof obj.useTeamId === "number")
      return obj.useTeamId;
    for (const k of Object.keys(obj)) {
      const v = findUseIdRec(obj[k]);
      if (v)
        return v;
    }
    return null;
  };
  const useTeamId = root.useTeamId ?? root.presetTeamInfo?.useTeamId ?? findUseIdRec(root) ?? 1;

  const dict = root.presetTeamInfo ?? root;
  const teams = {};
  const ids = Object.keys(dict || {}).filter((k) => /^\d+$/.test(k));
  for (const idStr of ids) {
    const id = Number(idStr);
    const node = dict[idStr];
    if (!node) {
      teams[id] = { teamInfo: {} };
      continue;
    }
    if (node.teamInfo) {
      teams[id] = { teamInfo: node.teamInfo };
    } else if (node.heroes) {
      const ti = {};
      node.heroes.forEach((h, idx) => {
        ti[String(idx + 1)] = h;
      });
      teams[id] = { teamInfo: ti };
    } else if (typeof node === "object") {
      const hasHero = Object.values(node).some(
        (v) => v && typeof v === "object" && "heroId" in v,
      );
      teams[id] = { teamInfo: hasHero ? node : {} };
    } else {
      teams[id] = { teamInfo: {} };
    }
  }
  return { useTeamId: Number(useTeamId) || 1, teams };
};

// 构建英雄列表
const buildHeroList = (teamData, heroData) => {
  const { useTeamId, teams } = teamData;
  const currentTeam = teams[useTeamId] || { teamInfo: {} };
  const teamInfo = currentTeam.teamInfo;

  const heroList = [];

  // 从当前队伍中获取英雄
  for (const [position, hero] of Object.entries(teamInfo)) {
    const heroId = hero?.heroId || hero?.id;
    if (!heroId)
      continue;

    const heroDetail = heroData[String(heroId)] || {};
    heroList.push({
      id: heroId,
      name: HERO_DICT[heroId]?.name || `武将${heroId}`,
      position: Number(position),
      level: hero?.level || heroDetail?.level || 1,
      equipment: heroDetail?.equipment || {},
    });
  }

  // 如果队伍中没有英雄，从所有英雄中获取
  if (heroList.length === 0 && Object.keys(heroData).length > 0) {
    for (const [id, hero] of Object.entries(heroData)) {
      if (hero && hero.equipment) {
        heroList.push({
          id: Number(id),
          name: HERO_DICT[Number(id)]?.name || `武将${Number(id)}`,
          position: heroList.length + 1,
          level: hero?.level || 1,
          equipment: hero?.equipment || {},
        });
        if (heroList.length >= 5)
          break;
      }
    }
  }

  // 按位置排序
  return heroList.sort((a, b) => a.position - b.position);
};

// 选择英雄
const selectHero = (heroId) => {
  selectedHeroId.value = heroId;
  selectedPart.value = null;
  quenchCount.value = 0;

  // 获取英雄装备
  const heroDetail = allHeroesData.value[String(heroId)] || {};
  heroEquipment.value = heroDetail?.equipment || {};
};

// 选择装备部位
const selectPart = (partId) => {
  selectedPart.value = partId;
  quenchCount.value = 0;

  // 获取装备详情
  const equip = heroEquipment.value[partId];
  if (equip) {
    // 更新洗练次数和加成
    quenchTimes.value = equip.quenchTimes || 0;

    // 根据部位类型更新加成名称
    const bonusType
      = partId === 1
        ? "quenchAttackExt"
        : partId === 3
          ? "quenchDefenseExt"
          : "quenchHpExt";
    equipBonusName.value
      = partId === 1 ? "攻击" : partId === 3 ? "防御" : "血量";
    equipBonusValue.value = equip[bonusType] || 0;

    // 更新孔位信息
    updateSlots(equip.quenches || {});
    
    // 更新连续淬炼次数默认值（下一孔所需次数 - 500）
    continuousQuenchCount.value = calculateDefaultQuenchCount();
  } else {
    quenchTimes.value = 0;
    equipBonusValue.value = 0;
    slots.value = [];
  }
};

// 更新孔位信息
const updateSlots = (quenches) => {
  const slotList = [];
  const slotKeys = Object.keys(quenches).sort((a, b) => Number(a) - Number(b));

  for (const key of slotKeys) {
    const slotId = Number(key);
    const slot = quenches[key];
    slotList.push({
      id: slotId,
      attrId: slot.attrId || null,
      attrNum: slot.attrNum || 0,
      isLocked: slot.isLocked || slot.locked || false,
      colorId: slot.colorId || 0,
    });
  }

  slots.value = slotList;
};

// 获取属性名称
const getAttrName = (attrId) => {
  return attrMap[attrId] || `属性${attrId}`;
};

// 密码验证
const verifyPassword = async () => {
  if (!password.value) {
    passwordError.value = "请输入密码";
    return;
  }

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法验证密码");
    return;
  }

  isVerifying.value = true;
  passwordError.value = "";

  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_commitpassword",
      {
        password: password.value,
        passwordType: 1,
      },
    );

    isPasswordValidated.value = true;
    message.success("密码验证成功");
  } catch (error) {
    passwordError.value = `验证失败: ${error.message}`;
    message.error(`密码验证失败: ${error.message}`);
  } finally {
    isVerifying.value = false;
  }
};

// 重置密码验证
const resetPasswordValidation = () => {
  isPasswordValidated.value = false;
  password.value = "";
  passwordError.value = "";
};

// 处理孔位锁定
const handleSlotLock = async (slotId, isLocked) => {
  const token = tokenStore.selectedToken;
  if (!token || !selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备");
    return;
  }

  // 解锁时需要验证密码
  if (!isLocked && !isPasswordValidated.value) {
    message.warning("请先验证二级密码以解锁孔位");
    // 恢复锁定状态
    const slot = slots.value.find((s) => s.id === slotId);
    if (slot) {
      slot.isLocked = true;
    }
    return;
  }

  const tokenId = token.id;
  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_updatequenchlock",
      {
        heroId: selectedHeroId.value,
        part: selectedPart.value,
        slot: slotId,
        isLocked,
      },
    );

    // 更新孔位状态
    const slot = slots.value.find((s) => s.id === slotId);
    if (slot) {
      slot.isLocked = isLocked;
    }

    // 同步更新装备数据中的锁定状态（洗练发送的 quenches 与高词条检测都依赖此数据）
    const equipQuenches = heroEquipment.value[selectedPart.value]?.quenches;
    const equipSlot = equipQuenches?.[slotId] || equipQuenches?.[String(slotId)];
    if (equipSlot) {
      equipSlot.isLocked = isLocked;
    }

    // 拉取服务器最新装备数据，避免本地快照与服务端不一致（失败不阻断）
    try {
      await syncEquipFromServer(tokenId);
    } catch (syncError) {
      console.warn(`[洗练] 锁定后同步装备数据失败: ${syncError.message}`);
    }

    message.success(isLocked ? "孔位已锁定" : "孔位已解锁");
  } catch (error) {
    message.error(`锁定孔位失败: ${error.message}`);
  }
};

// 淬炼一次
const quenchOnce = async () => {
  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  await executeQuench();
};

// 连续淬炼
const quenchContinuous = async () => {
  if (state.value.continuousQuenching)
    return;

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  // 重置淬炼次数
  quenchCount.value = 0;
  state.value.continuousQuenching = true;
  state.value.isRunning = true;

  // 开始前先刷新一次孔位状态，避免本地数据与服务端不一致
  await refreshSlotsBeforeStart();

  // 次数为0时使用9999上限
  const targetCount = continuousQuenchCount.value === 0 ? 9999 : (continuousQuenchCount.value || 100);

  const skipDesc = [
    skipOrangeQuality.value ? "跳过橙" : "遇橙确认",
    skipRedQuality.value ? "跳过红" : "遇红确认",
  ].join("、");
  message.info(`开始连续淬炼(${skipDesc})，共${targetCount}次`);

  const continuousQuench = async () => {
    if (!state.value.continuousQuenching)
      return;

    // 检查是否达到目标次数
    if (quenchCount.value >= targetCount) {
      message.success(`已完成${targetCount}次淬炼`);
      stopQuench();
      return;
    }

    try {
      const result = await executeQuench();

      // 不跳过橙红时无需在此停止：下一次 executeQuench 检测到橙红会弹窗让用户确认

      // 跳过橙红时无需额外处理：下一次 executeQuench 会自动先确认放弃高品质词条再继续

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      continuousTimer = setTimeout(continuousQuench, randomDelay);
    } catch (error) {
      message.error(`连续淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  continuousQuench();
};

// 添加条件
const addCondition = () => {
  targetConditions.value.push({
    attrId: null,
    attrValue: null,
  });
};

// 删除条件
const removeCondition = (index) => {
  if (targetConditions.value.length <= 1) {
    message.warning("至少需要保留一个条件");
    return;
  }
  targetConditions.value.splice(index, 1);
};

// 自动淬炼
const startAutoQuench = async () => {
  // 检查是否有有效的条件
  const hasValidCondition = targetConditions.value.some((condition) =>
    condition.attrId !== null && condition.attrValue !== null,
  );

  if (!hasValidCondition) {
    message.warning("请至少设置一个有效的目标属性和数值");
    return;
  }

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  state.value.autoQuenching = true;
  state.value.isRunning = true;

  // 开始前先刷新一次孔位状态，避免切换锁定后本地数据与服务端不一致
  await refreshSlotsBeforeStart();

  // 生成条件描述
  const conditionDescriptions = targetConditions.value
    .filter((condition) => condition.attrId && condition.attrValue)
    .map((condition) => `${getAttrName(condition.attrId)} ≥ ${condition.attrValue}`);

  message.info(
    `开始自动淬炼，目标：${conditionDescriptions.join(" 或 ")}`,
  );

  const autoQuench = async () => {
    if (!state.value.autoQuenching)
      return;

    try {
      const result = await executeQuench();
      if (result && checkTargetAttr(result)) {
        message.success(
          `已达到目标条件，自动淬炼已停止`,
        );
        stopQuench();
        return;
      }

      // 未达标时无需额外处理橙红：下一次 executeQuench 会自动确认放弃后继续

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      autoTimer = setTimeout(autoQuench, randomDelay);
    } catch (error) {
      message.error(`自动淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  autoQuench();
};

// 手动刷新孔位状态（从服务器拉取最新装备数据）
const refreshingSlots = ref(false);
const refreshSlots = async () => {
  const token = tokenStore.selectedToken;
  if (!token || tokenStore.getWebSocketStatus(token.id) !== "connected") {
    message.warning("请先连接游戏");
    return;
  }
  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  refreshingSlots.value = true;
  try {
    const synced = await syncEquipFromServer(token.id);
    if (synced) {
      message.success("孔位状态已刷新");
    } else {
      message.warning("未获取到装备数据");
    }
  } catch (error) {
    message.error(`刷新孔位失败: ${error.message}`);
  } finally {
    refreshingSlots.value = false;
  }
};

// 开始洗练前刷新一次孔位状态（失败不阻断后续流程，executeQuench 自带失败重试自救）
const refreshSlotsBeforeStart = async () => {
  const token = tokenStore.selectedToken;
  if (!token || tokenStore.getWebSocketStatus(token.id) !== "connected")
    return;

  try {
    await syncEquipFromServer(token.id);
  } catch (error) {
    console.warn(`[洗练] 开始前刷新孔位状态失败: ${error.message}`);
  }
};

// 从服务器重新拉取当前装备的最新数据（本地快照与服务端不一致时用于自救）
const syncEquipFromServer = async (tokenId) => {
  const roleInfo = await tokenStore.sendMessageWithPromise(
    tokenId,
    "role_getroleinfo",
    {},
    15000,
  );

  const heroData = roleInfo?.role?.heroes?.[String(selectedHeroId.value)]
    || roleInfo?.heroes?.[String(selectedHeroId.value)];
  const latestEquip = heroData?.equipment?.[selectedPart.value];
  if (latestEquip) {
    // 合并保留本地已有基础字段，防止增量数据缺level等字段导致装备显示为1级
    heroEquipment.value[selectedPart.value] = {
      ...heroEquipment.value[selectedPart.value],
      ...latestEquip,
    };
    quenchTimes.value = latestEquip.quenchTimes || 0;
    if (latestEquip.quenches) {
      updateSlots(latestEquip.quenches);
    }
    return true;
  }
  return false;
};

// 执行淬炼
const executeQuench = async (retried = false) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return null;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法执行淬炼");
    return null;
  }

  // 检查武器等级（如果是武器）
  if (selectedPart.value === 1) {
    const equip = heroEquipment.value[selectedPart.value];
    if (equip?.level < 4000) {
      message.warning(
        `武器等级不足，需要4000级以上（当前${equip?.level || 0}级）`,
      );
      return null;
    }
  }

  try {
    // 获取当前孔位信息
    const currentEquip = heroEquipment.value[selectedPart.value];
    if (!currentEquip?.quenches) {
      message.error("未获取到装备孔位信息");
      return null;
    }

    // 不做字段过滤或类型转换，保持与服务器返回的数据完全一致
    const rawQuenches = currentEquip.quenches;

    // seed 默认取装备自身携带的 seed 字段（服务端会校验，发 0 会报"界面已发生变化"）
    let seed = Number(currentEquip.seed) || 0;

    // 存在未锁定的高品质词条（橙/红）时，须先发送 equipment_confirm 获取最新 seed，
    // 否则服务端会拒绝洗练并报"您当前看到的界面已发生变化，请重新登录"
    const highSlots = getHighAttrSlots(rawQuenches);
    const needConfirm = highSlots.length > 0;

    // 未开启对应"跳过"开关的词条（红看跳红、橙看跳橙），放弃前弹窗让用户确认
    const pendingSlots = highSlots.filter(slot =>
      Number(slot.colorId) >= 6 ? !skipRedQuality.value : !skipOrangeQuality.value,
    );
    if (pendingSlots.length > 0) {
      const approved = await confirmDiscardDialog(pendingSlots);
      if (!approved) {
        message.info("已停止洗练，可锁定孔位保留词条");
        stopQuench();
        return null;
      }
    }

    if (needConfirm) {
      const confirmResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "equipment_confirm",
        {
          heroId: selectedHeroId.value,
          part: selectedPart.value,
          quenchId: 0,
          quenches: rawQuenches,
        },
        15000,
      );
      seed = extractSeedFromConfirm(confirmResult) || seed;
    }

    console.log(
      `[洗练] needConfirm=${needConfirm}, seed=${seed}, equipSeed=${currentEquip.seed ?? "无"}`,
    );

    // 构建淬炼制请求参数
    const quenchParams = {
      heroId: selectedHeroId.value,
      part: selectedPart.value,
      quenchId: 0,
      quenches: rawQuenches,
      seed,
      skipOrange: false,
    };

    // 发送淬炼请求（设置更长的超时时间，淬炼操作可能较慢）
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_quench",
      quenchParams,
      15000,
    );

    // 更新淬炼次数
    quenchCount.value++;

    // 更新装备信息 - 处理不同格式的响应
    let updatedEquip = null;

    // 处理1: Equipment_QuenchResp响应直接包含装备数据
    // 兼容两种结构：装备对象本身（含quenches）/ 按部位id索引的映射
    if (result?.equipment) {
      updatedEquip = result.equipment.quenches
        ? result.equipment
        : result.equipment[selectedPart.value];
    }
    // 处理2: 响应包含角色英雄数据
    else if (result?.role?.heroes) {
      const updatedHero = result.role.heroes[String(selectedHeroId.value)];
      if (updatedHero?.equipment) {
        updatedEquip = updatedHero.equipment[selectedPart.value];
      }
    }
    // 处理3: 响应直接包含淬炼制结果
    else if (result?.quenches) {
      // 基于现有装备创建更新后的装备对象
      updatedEquip = {
        ...heroEquipment.value[selectedPart.value],
        quenches: result.quenches,
        quenchTimes: (heroEquipment.value[selectedPart.value].quenchTimes || 0) + 1,
      };
    }

    // 如果获取到了更新的装备数据，更新界面
    if (updatedEquip) {
      // 合并而非整体替换：响应可能只含淬炼相关字段（缺level等基础字段），
      // 整体替换会导致装备显示为1级、武器等级校验误拦截
      updatedEquip = { ...heroEquipment.value[selectedPart.value], ...updatedEquip };
      // 更新装备对象
      heroEquipment.value[selectedPart.value] = updatedEquip;

      // 更新淬炼次数和加成
      quenchTimes.value = updatedEquip.quenchTimes || 0;
      const bonusType
        = selectedPart.value === 1
          ? "quenchAttackExt"
          : selectedPart.value === 3
            ? "quenchDefenseExt"
            : "quenchHpExt";
      equipBonusValue.value = updatedEquip[bonusType] || 0;

      // 更新孔位信息
      if (updatedEquip.quenches) {
        updateSlots(updatedEquip.quenches);
      }
    }

    // 更新白玉和彩玉数量
    if (result?.role?.items) {
      const items = result.role.items;
      jadeCount.value = items["1022"]?.quantity || jadeCount.value;
      colorJadeCount.value = items["1023"]?.quantity || colorJadeCount.value;
    }

    return result;
  } catch (error) {
    // 400010-物品数量不足（白玉/彩玉耗尽）、400000-已上限，重试无意义，直接停止洗练
    const errMsg = String(error.message);
    if (errMsg.includes("400010") || errMsg.includes("物品数量不足")) {
      message.error("物品数量不足，已自动停止洗练");
      stopQuench();
      return null;
    }
    if (errMsg.includes("400000") || errMsg.includes("已上限")) {
      message.error("淬炼已上限，已自动停止洗练");
      stopQuench();
      return null;
    }
    // 首次失败时自动同步服务器最新装备数据后重试一次
    // （本地装备快照过期会导致服务端报"界面已发生变化"）
    if (!retried) {
      console.warn(`[洗练] 淬炼失败(${error.message})，同步服务器装备数据后重试...`);
      try {
        const synced = await syncEquipFromServer(tokenId);
        if (synced) {
          return await executeQuench(true);
        }
      } catch (syncError) {
        console.warn(`[洗练] 同步装备数据失败: ${syncError.message}`);
      }
    }
    message.error(`淬炼失败: ${error.message}`);
    return null;
  }
};

// 从响应中获取最新的装备数据
const getEquipFromResult = (result) => {
  // 处理1: Equipment_QuenchResp响应直接包含装备数据
  if (result?.equipment) {
    // 兼容两种结构：装备对象本身（含quenches）/ 按部位id索引的映射
    return result.equipment.quenches
      ? result.equipment
      : result.equipment[selectedPart.value];
  }
  // 处理2: 响应包含角色英雄数据
  else if (result?.role?.heroes) {
    const updatedHero = result.role.heroes[String(selectedHeroId.value)];
    if (updatedHero?.equipment) {
      return updatedHero.equipment[selectedPart.value];
    }
  }
  // 处理3: 响应直接包含淬炼制结果
  else if (result?.quenches) {
    // 基于现有装备创建更新后的装备对象
    return {
      ...heroEquipment.value[selectedPart.value],
      quenches: result.quenches,
      quenchTimes: (heroEquipment.value[selectedPart.value].quenchTimes || 0) + 1,
    };
  }
  // 处理4: 使用当前界面的装备数据（兜底）
  return heroEquipment.value[selectedPart.value];
};

// 弹窗确认是否放弃未锁定的橙/红词条（未开启跳过橙红时使用），展示具体词条信息
const confirmDiscardDialog = (highSlots = []) => {
  return new Promise((resolve) => {
    dialog.warning({
      title: "发现橙/红词条",
      content: () =>
        h("div", null, [
          h(
            "div",
            null,
            "当前存在未锁定的橙色或红色词条，继续洗练将放弃该词条。如需保留请先锁定孔位。",
          ),
          ...highSlots.map(slot =>
            h(
              "div",
              {
                style: `margin-top: 8px; font-weight: 600; color: ${
                  Number(slot.colorId) >= 6 ? "#d03050" : "#f0a020"
                };`,
              },
              `孔${slot.id} [${Number(slot.colorId) >= 6 ? "红" : "橙"}] ${getAttrName(slot.attrId)} +${slot.attrNum}%`,
            ),
          ),
        ]),
      positiveText: "放弃并继续",
      negativeText: "停止洗练",
      maskClosable: false,
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    });
  });
};

// 获取未锁定的高品质词条列表（attrNum > 50 或 colorId >= 5，即橙/红），
// 存在此类词条时必须先 equipment_confirm 确认后服务端才允许继续洗练
const getHighAttrSlots = (quenches) => {
  if (!quenches)
    return [];

  return Object.entries(quenches)
    .filter(
      ([, slot]) =>
        (Number(slot.attrNum) > 50 || Number(slot.colorId) >= 5)
        && !(slot.isLocked || slot.locked),
    )
    .map(([id, slot]) => ({ id, ...slot }));
};

// 从 equipment_confirm 响应中提取 seed（兼容多种响应格式）
const extractSeedFromConfirm = (result) => {
  if (!result)
    return 0;

  // 格式1: role.heroes[heroId].equipment[part].seed
  const hero = result?.role?.heroes?.[String(selectedHeroId.value)];
  const equipSeed = hero?.equipment?.[String(selectedPart.value)]?.seed;

  // 格式2: seed直接在响应中；格式3: equipment.seed
  return equipSeed || result?.seed || result?.equipment?.seed || 0;
};

// 检查目标属性
const checkTargetAttr = (result) => {
  // 获取有效的条件
  const validConditions = targetConditions.value.filter((condition) =>
    condition.attrId && condition.attrValue,
  );

  if (validConditions.length === 0)
    return false;

  const equip = getEquipFromResult(result);
  if (!equip?.quenches)
    return false;

  const slots = Object.values(equip.quenches);

  // 检查是否有任何一个条件满足（OR关系）
  return validConditions.some((condition) => {
    return slots.some((slot) => {
      return slot.attrId === condition.attrId && slot.attrNum >= condition.attrValue;
    });
  });
};

// 翻转洗练（反面洗练）：在quenches和quenches2之间切换
const flipQuench = async () => {
  const token = tokenStore.selectedToken;
  if (!token || !selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法翻转洗练");
    return;
  }

  try {
    // equipment_changequench 是 SyncResp（ack=0），必须用 fire-and-forget
    tokenStore.sendMessage(tokenId, "equipment_changequench", {
      heroId: selectedHeroId.value,
      part: selectedPart.value,
    });

    // 等待500ms后刷新装备数据
    await new Promise((resolve) => setTimeout(resolve, 500));

    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      15000,
    );

    // 更新装备信息
    const heroData = roleInfo?.role?.heroes?.[String(selectedHeroId.value)];
    if (heroData?.equipment?.[selectedPart.value]) {
      // 合并保留本地已有基础字段，防止增量数据缺level等字段导致装备显示为1级
      const updatedEquip = {
        ...heroEquipment.value[selectedPart.value],
        ...heroData.equipment[selectedPart.value],
      };
      heroEquipment.value[selectedPart.value] = updatedEquip;
      quenchTimes.value = updatedEquip.quenchTimes || 0;

      const bonusType
        = selectedPart.value === 1
          ? "quenchAttackExt"
          : selectedPart.value === 3
            ? "quenchDefenseExt"
            : "quenchHpExt";
      equipBonusValue.value = updatedEquip[bonusType] || 0;

      if (updatedEquip.quenches) {
        updateSlots(updatedEquip.quenches);
      }
    }

    message.success("翻转洗练成功");
  } catch (error) {
    message.error(`翻转洗练失败: ${error.message}`);
  }
};

// 停止淬炼
const stopQuench = () => {
  state.value.continuousQuenching = false;
  state.value.autoQuenching = false;
  state.value.isRunning = false;

  if (continuousTimer) {
    clearTimeout(continuousTimer);
    continuousTimer = null;
  }

  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }

  message.success("淬炼已停止");
};

// 重置淬炼次数
const resetCount = () => {
  quenchCount.value = 0;
  message.success("已清零");
};
</script>

<style scoped lang="scss">
.refine-container {
  padding: 8px;
}

// 工具栏
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.jade-info {
  display: flex;
  gap: 8px;
}

// 通用区块样式
.section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}

.section-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.section-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

// 武将列表 - 一行排列
.hero-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  max-height: none;
  overflow-x: auto;
  padding: 4px 0;
  background: transparent;
  border-radius: 0;
}

.hero-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-medium);
  border-bottom: 3px solid var(--border-light);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text-primary);
  min-width: 0;
  flex: 1;
  flex-shrink: 1;
}

.hero-item:hover {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
}

.hero-item.active {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.hero-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-placeholder {
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
}

.hero-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  min-width: 0;
}

.hero-name {
  font-weight: var(--font-weight-medium);
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.hero-level {
  font-size: 10px;
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.empty-state {
  padding: 12px;
}

// 装备标签 - 一行排列
.equip-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
}

.equip-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-medium);
  border-bottom: 3px solid var(--border-light);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  min-width: 0;
  flex: 1;
  flex-shrink: 1;
}

.equip-tab:hover {
  border-color: var(--border-light);
}

.equip-tab.active {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
  border-bottom-color: var(--primary-color);
}

.tab-name {
  font-weight: var(--font-weight-medium);
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
}

.tab-level {
  font-size: 10px;
  color: var(--text-secondary);
}

// 统计栏
.stats-bar {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
  border-radius: var(--border-radius-medium);
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 11px;
}

.stat-value {
  font-weight: var(--font-weight-bold);
  font-size: 16px;
  color: var(--primary-color);
}

.stat-remaining {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.stat-complete {
  font-size: 10px;
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
  margin-top: 2px;
}

.bonus-value {
  color: var(--color-success);
}

// 孔位行 - 类似宝箱一行排列
.slots-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  overflow-x: auto;
  padding: 2px 0;
}

.slot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-small);
  border-bottom: 2px solid var(--border-light);
  transition: all 0.2s;
  min-width: 0;
  flex: 1;
  flex-shrink: 1;
}

.slot-item:hover {
  background: var(--bg-secondary);
}

.slot-item.locked {
  border-bottom-color: var(--primary-color);
  background: var(--primary-color-light);
}

.slot-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.slot-name {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.slot-attr-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 100%;
  min-width: 0;
}

.slot-attr-name {
  font-size: 9px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.slot-attr-value {
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  color: var(--primary-color);
  flex-shrink: 0;
}

.slot-attr-info.empty {
  color: var(--text-tertiary);
  font-size: 9px;
}

// 孔位颜色样式
.slot-item.color-1 { border-bottom-color: #ffffff; background: rgba(255, 255, 255, 0.05); }
.slot-item.color-2 { border-bottom-color: #4caf50; background: rgba(76, 175, 80, 0.05); }
.slot-item.color-3 { border-bottom-color: #2196f3; background: rgba(33, 150, 243, 0.05); }
.slot-item.color-4 { border-bottom-color: #9c27b0; background: rgba(156, 39, 176, 0.05); }
.slot-item.color-5 { border-bottom-color: #ff9800; background: rgba(255, 152, 0, 0.05); }
.slot-item.color-6 { border-bottom-color: #f44336; background: rgba(244, 67, 54, 0.05); }

.slot-item.locked.color-1 { background: rgba(255, 255, 255, 0.15); }
.slot-item.locked.color-2 { background: rgba(76, 175, 80, 0.15); }
.slot-item.locked.color-3 { background: rgba(33, 150, 243, 0.15); }
.slot-item.locked.color-4 { background: rgba(156, 39, 176, 0.15); }
.slot-item.locked.color-5 { background: rgba(255, 152, 0, 0.15); }
.slot-item.locked.color-6 { background: rgba(244, 67, 54, 0.15); }

// 密码验证区域
.password-section {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
}

.password-form {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.password-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.password-error {
  color: var(--color-error);
  font-size: 11px;
}

.password-validated {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

// 操作按钮区域
.actions-section {
  margin-bottom: 8px;
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.quench-count-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-small);
}

.count-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.count-hint {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.quench-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-small);
}

.status-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.status-value {
  font-weight: var(--font-weight-bold);
  font-size: 14px;
  color: var(--primary-color);
}

.skip-switch {
  margin-left: auto;
}

// 自动淬炼设置
.auto-section {
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.conditions-list {
  margin-bottom: 6px;
}

.condition-row {
  padding: 6px;
  background: var(--bg-primary);
  border-radius: var(--border-radius-medium);
  margin-bottom: 6px;
  border: 1px solid var(--border-light);
}

.condition-form {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 100px;
}

.form-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.add-condition-row {
  margin-bottom: 6px;
}

// 响应式设计
@media (max-width: 768px) {
  .refine-container {
    padding: 6px;
  }

  .hero-list {
    gap: 4px;
  }

  .hero-item {
    padding: 5px 6px;
  }

  .hero-avatar {
    width: 28px;
    height: 28px;
  }

  .hero-name {
    font-size: 10px;
  }

  .hero-level {
    font-size: 9px;
  }

  .equip-tabs {
    gap: 4px;
  }

  .equip-tab {
    padding: 5px 6px;
  }

  .tab-name {
    font-size: 10px;
  }

  .tab-level {
    font-size: 9px;
  }

  .slots-row {
    flex-wrap: nowrap;
    gap: 3px;
  }

  .slot-item {
    min-width: 0;
    flex: 1;
    padding: 3px 5px;
    gap: 2px;
  }

  .slot-icon {
    width: 18px;
    height: 18px;
  }

  .slot-name {
    font-size: 9px;
  }

  .slot-attr-name {
    font-size: 8px;
  }

  .slot-attr-value {
    font-size: 10px;
  }

  .actions-row {
    flex-wrap: wrap;
  }

  .skip-switch {
    margin-left: 0;
    width: 100%;
  }

  .quench-count-wrapper,
  .quench-status {
    flex: 1;
  }

  .condition-form {
    flex-direction: column;
    align-items: stretch;
  }

  .form-group {
    width: 100%;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    justify-content: center;
  }

  .jade-info {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .hero-list {
    gap: 3px;
  }

  .hero-item {
    padding: 4px 5px;
    gap: 2px;
  }

  .hero-avatar {
    width: 24px;
    height: 24px;
  }

  .hero-name {
    font-size: 9px;
  }

  .hero-level {
    font-size: 8px;
  }

  .equip-tabs {
    gap: 3px;
  }

  .equip-tab {
    padding: 4px 5px;
    gap: 2px;
  }

  .tab-name {
    font-size: 9px;
  }

  .tab-level {
    font-size: 8px;
  }

  .slots-row {
    flex-wrap: nowrap;
    gap: 3px;
  }

  .slot-item {
    min-width: 0;
    flex: 1;
    padding: 3px 4px;
    gap: 1px;
  }

  .slot-icon {
    width: 16px;
    height: 16px;
  }

  .slot-name {
    font-size: 9px;
  }

  .slot-attr-name {
    font-size: 8px;
  }

  .slot-attr-value {
    font-size: 10px;
  }

  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
