<template>
  <div
    class="token-card"
    :class="{
      'is-selected': isSelected,
      'is-connected': isConnected,
      'is-dragging': isDragging,
      'is-drop-target': isDropTarget,
    }"
    @click="handleCardClick"
    @mouseenter="handleCardMouseEnter"
  >
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="header-left">
        <!-- 拖动手柄 -->
        <div
          class="drag-handle"
          title="拖动调整位置"
          @mousedown="handleDragMouseDown"
        >
          <n-icon size="16">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </n-icon>
        </div>
        <n-checkbox :checked="isSelected" :value="token.id" @update:checked="handleSelect"></n-checkbox>
        <span class="token-name" :title="token.name">{{ displayName }}</span>
      </div>
      <div class="header-right">
        <!-- 连接状态指示灯 -->
        <div class="status-dot" :class="connectionStatusClass" :title="connectionStatusText"></div>
        <!-- 设置按钮 -->
        <n-button circle quaternary size="small" @click.stop="openSettings">
          <template #icon>
            <n-icon><Settings></Settings></n-icon>
          </template>
        </n-button>
        <!-- 一键补齐每日任务按钮 -->
        <n-button circle quaternary size="small" type="primary" :disabled="!isConnected" @click.stop="completeDailyTasks">
          <template #icon>
            <n-icon>
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </n-icon>
          </template>
        </n-button>
        <!-- 月度竞技场补齐按钮 -->
        <n-button circle quaternary size="small" type="warning" :disabled="!isConnected" @click.stop="completeMonthlyArena" title="月度竞技场补齐">
          <template #icon>
            <img src="/icons/竞技场.png" alt="竞技场补齐" style="width: 14px; height: 14px; object-fit: contain;">
          </template>
        </n-button>
        <!-- 月度钓鱼补齐按钮 -->
        <n-button circle quaternary size="small" type="info" :disabled="!isConnected" @click.stop="completeMonthlyFish" title="月度钓鱼补齐">
          <template #icon>
            <img src="/icons/钓鱼.png" alt="钓鱼补齐" style="width: 14px; height: 14px; object-fit: contain;">
          </template>
        </n-button>
        <!-- 推图按钮 -->
        <n-button circle quaternary size="small" :type="isPushing ? 'error' : 'warning'" @click.stop="togglePushMap" :title="isPushing ? '停止推图' : '开始推图'">
          <template #icon>
            <n-icon>
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="!isPushing" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                <path v-else d="M18 6L6 18M6 6l12 12" />
              </svg>
            </n-icon>
          </template>
        </n-button>
        <!-- 打开游戏按钮 -->
        <n-button circle quaternary size="small" type="success" @click.stop="openGame" title="打开游戏">
          <template #icon>
            <n-icon>
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M9 9h6v6H9z" />
                <path d="M9 1v2M15 1v2M9 21v2M15 21v2M21 9h2M21 15h2M1 9h2M1 15h2" />
              </svg>
            </n-icon>
          </template>
        </n-button>
        <!-- 连接/断开按钮 -->
        <n-button 
          circle 
          quaternary 
          size="small" 
          :type="isConnected ? 'error' : (isConnecting ? 'warning' : 'success')"
          :disabled="isConnectionButtonDisabled"
          @click.stop="toggleConnection"
        >
          <template #icon>
            <n-icon>
              <span v-if="isConnecting" class="connecting-spinner">↻</span>
              <Link v-else-if="!isConnected" />
              <Unlink v-else />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 状态标签行 -->
    <div class="status-tags">
      <!-- 盐罐时间 -->
      <div class="status-tag salt-tag" style="cursor: pointer;" title="点击重置盐罐" :class="{ 'is-active': saltJar.isRunning }" @click.stop="resetSaltJar">
        <img class="tag-icon tag-icon-img" src="/icons/saltJar.png" alt="盐罐">
        <span class="tag-text">{{ formatShortTime(saltJar.remainingTime) }}</span>
      </div>
      <!-- 挂机时间 -->
      <div class="status-tag hangup-tag" style="cursor: pointer;" :class="{ 'is-active': hangUp.isActive }" :title="hangUp.isActive ? '点击领取挂机奖励' : '点击一键加钟'" @click.stop="handleHangUp">
        <img class="tag-icon tag-icon-img" src="/icons/挂机.png" alt="挂机">
        <span class="tag-text">
          <span class="hangup-elapsed">{{ formatShortTime(hangUp.elapsedTime) }}</span>
          <span class="hangup-separator">/</span>
          <span class="hangup-remaining">{{ formatShortTime(hangUp.remainingTime) }}</span>
        </span>
      </div>
      <!-- 答题状态 -->
      <div class="status-tag study-tag" style="cursor: pointer;" :class="{ 'is-completed': displayStudyInfo.isCompleted, 'is-answering': studyStatus.isAnswering }" @click.stop="startOneClickAnswer">
        <img class="tag-icon tag-icon-img" src="/icons/study.png" alt="答题">
        <span class="tag-text">
          <span v-if="studyStatus.isAnswering">
            {{ studyStatus.answeredCount }}/{{ studyStatus.questionCount }}
          </span>
          <span v-else-if="displayStudyInfo.isCompleted && displayStudyInfo.thisWeek">
            已完成
          </span>
          <span v-else>
            {{ displayStudyInfo.maxCorrectNum || 0 }}/10
          </span>
        </span>
      </div>
      <!-- 刷新状态 -->
      <div class="status-tag refresh-tag" :class="{ 'is-refreshing': isRefreshing }">
        <img class="tag-icon tag-icon-img" src="/icons/刷新.png" alt="刷新">
        <span class="tag-text">
          <span v-if="isRefreshing">
            刷新中
          </span>
          <span v-else-if="lastRefreshTime">
            {{ lastRefreshTime }}
          </span>
          <span v-else>
            未刷新
          </span>
        </span>
      </div>
      <!-- 残卷状态 -->
      <div class="status-tag legacy-tag" style="cursor: pointer; min-width: 70px; justify-content: center;" :class="{ 'is-available': legacyStatus.isAvailable }" :title="legacyStatus.isAvailable ? '点击领取功法残卷' : '当前残卷数量'" @click.stop="handleLegacyClaim">
        <img class="tag-icon tag-icon-img" src="/icons/残卷.png" alt="残卷">
        <span class="tag-text">
          <span v-if="legacyStatus.isAvailable">
            可领取
          </span>
          <span v-else>
            {{ legacyStatus.quantity }}个
          </span>
        </span>
      </div>
      <!-- 星级挑战总星数 -->
      <div
        class="status-tag star-challenge-tag"
        style="min-width: 70px; justify-content: center; cursor: pointer;"
        :class="{ 'is-zero-stars': starChallengeTotalStars === 0, 'is-challenging': isStarChallenging }"
        :title="`星级挑战总星数: ${starChallengeTotalStars}/24 (点击挑战)`"
        @click.stop="handleStarChallenge"
      >
        <img class="tag-icon tag-icon-img" src="/icons/星级.png" alt="星级">
        <span class="tag-text">
          <span v-if="isStarChallenging">挑战中...</span>
          <span v-else>{{ starChallengeTotalStars }}/24</span>
        </span>
      </div>
      <!-- 功德簿 -->
      <div
        class="status-tag merit-book-tag"
        style="min-width: 70px; justify-content: center; cursor: pointer;"
        :class="{ 'merit-full': meritBookStars >= 120 }"
        :title="`功德簿: ${meritBookStars}/120 (队伍成员本周星数总和)`"
        @click.stop="handleRefreshMeritBook"
      >
        <img class="tag-icon tag-icon-img" src="/icons/残卷.png" alt="功德">
        <span class="tag-text">{{ meritBookStars }}/120</span>
      </div>
      <!-- 十殿通关8状态 -->
      <div
        class="status-tag nightmare-tag"
        style="min-width: 70px; justify-content: center;"
        :class="{ 'nightmare-cleared': nightmareMaxLevel >= 8, 'nightmare-uncleared': nightmareMaxLevel > 0 && nightmareMaxLevel < 8, 'nightmare-none': nightmareMaxLevel === 0 }"
        :title="nightmareMaxLevel >= 8 ? `十殿已通关第8关` : nightmareMaxLevel > 0 ? `十殿通关至第${nightmareMaxLevel}关` : '本周未通关'"
      >
        <img class="tag-icon tag-icon-img" src="/icons/十殿.png" alt="十殿">
        <span class="tag-text">
          <span v-if="nightmareMaxLevel >= 8">通关8</span>
          <span v-else-if="nightmareMaxLevel > 0">Lv.{{ nightmareMaxLevel }}</span>
          <span v-else>未通关</span>
        </span>
      </div>
      <!-- 金鱼达标 -->
      <n-popover trigger="click" placement="bottom" :width="220">
        <template #trigger>
          <div
            v-if="goldFishStatus"
            class="status-tag goldfish-tag"
            style="min-width: 70px; justify-content: center; cursor: pointer;"
            :class="{ 'all-met': goldFishStatus.allMet, 'not-met': !goldFishStatus.allMet }"
          >
            <img class="tag-icon tag-icon-img" src="/icons/金鱼.png" alt="金鱼达标">
            <span class="tag-text">
              {{ goldFishStatus.allMet ? '已达标' : '未达标' }}
            </span>
          </div>
        </template>
        <div style="font-size: 13px; line-height: 1.8;">
          <div>🐟 金鱼达标明细</div>
          <div :style="{ color: goldFishStatus.goldMet ? '#059669' : '#dc2626' }">
            金砖: {{ (goldFishStatus.gold / 10000).toFixed(1) }}万 / {{ goldFishStatus.goldTarget / 10000 }}万
          </div>
          <div :style="{ color: goldFishStatus.recruitMet ? '#059669' : '#dc2626' }">
            招募令: {{ goldFishStatus.recruitTickets }} / {{ goldFishStatus.recruitTarget }}
          </div>
          <div :style="{ color: goldFishStatus.boxesMet ? '#059669' : '#dc2626' }">
            宝箱积分: {{ goldFishStatus.boxScore }} / {{ goldFishStatus.boxesTarget }}
          </div>
          <div style="font-size: 11px; color: #888;">
            青铜{{ goldFishStatus.bronzeCount }}×10 + 黄金{{ goldFishStatus.goldChestCount }}×20 + 铂金{{ goldFishStatus.platinumCount }}×50
          </div>
          <div :style="{ color: goldFishStatus.rodsMet ? '#059669' : '#dc2626' }">
            金鱼竿: {{ goldFishStatus.goldRods }} / {{ goldFishStatus.rodsTarget }}
            <span v-if="goldFishStatus.rodsTarget < 750" style="font-size: 11px; color: #888;">(联动减免)</span>
          </div>
        </div>
      </n-popover>
      <!-- 竞技场排名 -->
      <div
        class="status-tag arena-rank-tag"
        style="min-width: 70px; justify-content: center; cursor: pointer;"
        :class="{ 'has-rank': arenaRank > 0, 'is-fighting': isArenaFighting }"
        :title="arenaRank > 0 ? `点击挑战竞技场(3次)` : '竞技场排名: 未知'"
        @click.stop="handleArenaFight"
      >
        <img class="tag-icon tag-icon-img" src="/icons/排名.png" alt="排名">
        <span class="tag-text">
          <span v-if="isArenaFighting">战斗中...</span>
          <span v-else-if="arenaRank > 0">排名{{ arenaRank }}</span>
          <span v-else>未上榜</span>
        </span>
      </div>
      <!-- 推图状态 -->
      <div
        v-if="isPushing"
        class="status-tag push-tag"
        style="min-width: 80px; justify-content: center; cursor: pointer;"
        :class="{ 'is-pushing': isPushing }"
        :title="pushStatusText"
        @click.stop="togglePushMap"
      >
        <span class="tag-text" style="color: #f59e0b; font-weight: 600;">
          ⚔️ {{ pushStatusText }}
        </span>
      </div>
      <!-- 换皮闯关状态 -->
      <div class="module-grid">
        <div class="tower-status-container">
          <div class="tower-status-header" :title="isTowerExpanded ? '点击最小化' : '点击展开'" @click.stop="isTowerExpanded = !isTowerExpanded">
            <img class="tag-icon tag-icon-img" src="/icons/闯关.png" alt="闯关">
            <span class="tag-text">闯关</span>
            <span class="expand-icon">{{ isTowerExpanded ? '▼' : '▶' }}</span>
            <img class="refresh-icon refresh-icon-img" title="点击刷新闯关进度" @click.stop="refreshTowerInfo" src="/icons/刷新.png" alt="刷新">
          </div>
          <div v-if="isTowerExpanded" class="tower-grid">
            <div
              v-for="type in 6"
              :key="type"
              class="tower-item"
              style="cursor: pointer;"
              :class="{
                'tower-active': isTowerOpen(type),
                'tower-cleared': isTowerCleared(type),
                'tower-locked': !isTowerOpen(type),
              }"
              :title="isTowerOpen(type) && !isTowerCleared(type) ? `点击挑战 BOSS ${type}` : isTowerCleared(type) ? '已通关' : '未开放'"
              @click.stop="challengeTower(type)"
            >
              <div class="tower-number">{{ type }}</div>
              <div class="tower-level">第 {{ getTowerLevel(type) }} 层</div>
              <div class="tower-status">
                <span v-if="isTowerCleared(type)" class="status-dot cleared"></span>
                <span v-else-if="isTowerOpen(type)" class="status-dot active"></span>
                <span v-else class="status-dot locked"></span>
              </div>
            </div>
          </div>
          <div v-if="isTowerExpanded && towerInfo.isActivityValid" class="tower-summary">
            <span class="summary-item">
              今日挑战 {{ towerInfo.dailyFightNum }}/10
            </span>
            <span class="summary-item">
              已通关 {{ towerInfo.finishedCount }}/6
            </span>
          </div>
        </div>
        <!-- 爬塔状态 -->
        <div class="climb-tower-container">
          <div class="climb-tower-header" :title="towerData.isExpanded ? '点击最小化' : '点击展开'" @click.stop="toggleClimbTower">
            <img class="tag-icon tag-icon-img" src="/icons/ta.png" alt="爬塔">
            <span class="tag-text">爬塔</span>
            <span class="expand-icon">{{ towerData.isExpanded ? '▼' : '▶' }}</span>
            <img class="refresh-icon refresh-icon-img" title="点击刷新爬塔数据" @click.stop="refreshTowerData" src="/icons/刷新.png" alt="刷新">
          </div>
          <div v-if="towerData.isExpanded" class="climb-tower-grid">
            <div class="climb-tower-item">
              <div class="item-label">当前层数</div>
              <div class="item-value">{{ towerData.floor }}</div>
            </div>
            <div class="climb-tower-item">
              <div class="item-label">最高层数</div>
              <div class="item-value">{{ towerData.maxFloor }}</div>
            </div>
            <div class="climb-tower-item energy-item">
              <div class="item-label">体力</div>
              <div class="energy-wrapper">
                <div class="energy-bar" :style="{ width: `${towerData.energy / towerData.maxEnergy * 100}%` }"></div>
                <span class="energy-text">{{ towerData.energy }}/{{ towerData.maxEnergy }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 怪异塔状态 -->
        <div class="weird-tower-container">
          <div class="weird-tower-header" :title="weirdTowerData.isExpanded ? '点击最小化' : '点击展开'" @click.stop="toggleWeirdTower">
            <img class="tag-icon tag-icon-img" src="/icons/ta.png" alt="怪塔">
            <span class="tag-text">怪塔</span>
            <span class="expand-icon">{{ weirdTowerData.isExpanded ? '▼' : '▶' }}</span>
            <img class="refresh-icon refresh-icon-img" title="点击刷新怪异塔数据" @click.stop="refreshWeirdTowerData" src="/icons/刷新.png" alt="刷新">
          </div>
          <div v-if="weirdTowerData.isExpanded" class="weird-tower-grid">
            <div class="weird-tower-item" style="cursor: pointer;" title="点击一键爬怪异塔" @click="climbWeirdTower">
              <div class="item-label">当前层数</div>
              <div class="item-value">{{ weirdTowerData.floor }}</div>
            </div>
            <div class="weird-tower-item energy-item" style="cursor: pointer;" title="点击购买10个小鱼干（最多50个）" @click="buyWeirdTowerEnergy">
              <div class="item-label">小鱼干</div>
              <div class="energy-wrapper">
                <div class="energy-bar weird" :style="{ width: `${weirdTowerData.energy / 100 * 100}%` }"></div>
                <span class="energy-text">{{ weirdTowerData.energy }}/100</span>
              </div>
            </div>
            <div class="weird-tower-item" style="cursor: pointer;" title="点击执行: 领取通行证→领取免费道具→使用道具" @click="executeWeirdTowerFullProcess">
              <div class="item-label">剩余钥匙</div>
              <div class="item-value">{{ weirdTowerData.lotteryLeftCnt }}</div>
            </div>
          </div>
        </div>
        <!-- 赛车状态 -->
        <div class="car-status-container">
          <div class="car-status-header" :title="isCarExpanded ? '点击最小化' : '点击展开'" @click.stop="toggleCar">
            <img class="tag-icon tag-icon-img" src="/icons/疯狂赛车.png" alt="赛车">
            <span class="tag-text">赛车</span>
            <span class="expand-icon">{{ isCarExpanded ? '▼' : '▶' }}</span>
            <img class="refresh-icon refresh-icon-img" title="点击刷新赛车状态" @click.stop="refreshCarInfo" src="/icons/刷新.png" alt="刷新">
            <span v-if="carStatus.isLoading && isCarExpanded" class="loading-indicator">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </span>
          </div>
          <div v-if="isCarExpanded">
            <div v-if="!carStatus.isLoading" class="car-grid">
              <!-- 显示前4个赛车的状态 -->
              <div
                v-for="(car, index) in carStatus.cars.slice(0, 4)"
                :key="car.id"
                class="car-item"
                style="cursor: pointer;"
                :class="{
                  'car-available': car.isAvailable,
                  'car-on-mission': car.isOnMission,
                  'car-claimable': car.isClaimable,
                  'car-completed': car.isCompleted,
                }"
                :title="car.isCompleted ? '今日已完成' : car.isAvailable ? '点击智能发车' : car.isClaimable ? '点击领取奖励' : '任务进行中'"
                @click.stop="handleCarClick(car, index + 1)"
              >
                <div class="car-number">{{ index + 1 }}</div>
                <div class="car-status-text">{{ car.status }}</div>
                <div v-if="car.isOnMission" class="car-time">{{ car.formattedTime }}</div>
              </div>
              <!-- 如果赛车数量少于4，显示占位符 -->
              <div
                v-for="index in Math.max(0, 4 - carStatus.cars.length)"
                :key="`placeholder-${index}`"
                class="car-item car-placeholder"
              >
                <div class="car-number">{{ carStatus.cars.length + index }}</div>
                <div class="car-status-text">未解锁</div>
              </div>
            </div>
            <div v-else class="loading-container">
              <div class="loading-spinner"></div>
              <div class="loading-text">获取赛车状态中...</div>
            </div>
            <div v-if="!carStatus.isLoading" class="car-summary">
              <div class="summary-item">
                <span class="label">总发车:</span>
                <span class="value success">{{ carStatus.sendCnt }}/4</span>
              </div>
              <div class="summary-item">
                <span class="label">刷新剩余:</span>
                <span class="value primary">{{ carStatus.refreshTickets }}</span>
              </div>
              <div class="summary-item">
                <span class="label">可收车辆:</span>
                <span class="value warning">{{ carStatus.claimableCars }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 每日任务进度 -->
    <div class="task-progress">
      <div class="progress-header">
        <span class="progress-label"><img class="progress-icon-img" src="/icons/每日.png" alt="每日任务"> 每日任务</span>
        <span class="progress-value">{{ dailyTask.progress }}/110</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: `${dailyTask.progress / 110 * 100}%`, backgroundColor: getProgressColor(dailyTask.progress / 110 * 100) }"></div>
      </div>
    </div>

    <!-- 月度任务进度 -->
    <div class="task-progress">
      <div class="progress-header">
        <span class="progress-label"><img class="progress-icon-img" src="/icons/月度.png" alt="月度任务"> 月度任务</span>
        <span class="progress-value">{{ monthlyTask.fish }}/{{ monthlyTask.fishTarget }} 钓鱼 | {{ monthlyTask.arena }}/{{ monthlyTask.arenaTarget }} 竞技场</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: `${monthlyTask.totalProgress}%`, backgroundColor: getProgressColor(monthlyTask.totalProgress) }"></div>
      </div>
    </div>

    <!-- 分组标签 -->
    <div v-if="tokenGroups.length > 0" class="group-tags">
      <n-tag
        v-for="group in tokenGroups"
        :key="group.id"
        size="tiny"
        :color="{ color: group.color, textColor: 'white' }"
      >
        {{ group.name }}
      </n-tag>
    </div>
    <!-- 任务执行日志 -->
    <div v-if="showTaskLogs && taskLogs.length > 0" class="task-logs">
      <div class="logs-header">
        <span class="logs-title">执行日志</span>
        <n-button size="tiny" type="text" @click="clearTaskLogs">清空</n-button>
      </div>
      <div ref="logsContentRef" class="logs-content" @scroll="handleLogScroll">
        <div v-for="(log, index) in taskLogs" :key="index" class="log-item" :class="`log-${log.type}`">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { createCarManager, normalizeCars } from "@/utils/batch/carUtils.js";
import { pickArenaTargetId, getTodayStartSec } from "@/utils/batch/connectionManager.js";
import { createPushMapRunner } from "@/utils/batch/pushMapRunner";

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Link, Settings, Unlink } from "@vicons/ionicons5";
import { useTokenStore } from "@/stores/tokenStore";
import { isInCurrentWeek } from "@/utils/base";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { useMessage } from "naive-ui";
import { getQuestionCount, preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { storage } from "@/utils/crossPlatformStorage";
import { useRouter } from "vue-router";

const router = useRouter();

const props = defineProps({
  token: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  isTowerExpanded: {
    type: Boolean,
    default: false,
  },
  isCarExpanded: {
    type: Boolean,
    default: false,
  },
  isClimbTowerExpanded: {
    type: Boolean,
    default: false,
  },
  isWeirdTowerExpanded: {
    type: Boolean,
    default: false,
  },
  // 拖动排序相关
  draggable: {
    type: Boolean,
    default: true,
  },
  // 是否为拖放目标
  isDropTarget: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "settings", "toggleConnection", "update:isClimbTowerExpanded", "update:isWeirdTowerExpanded", "update:isCarExpanded", "update:isTowerExpanded", "drag-start", "drag-end", "drop", "drag-query", "drag-update-target", "drag-get-target"]);

const tokenStore = useTokenStore();
const message = useMessage();

// 拖动状态
const isDragging = ref(false);
const dragSourceId = ref(null);

// 鼠标按下拖动手柄
const handleDragMouseDown = (event) => {
  event.preventDefault();
  event.stopPropagation();

  // 不再使用本地状态，而是通过事件通知父组件
  emit("drag-start", props.token.id);

  // 添加全局鼠标事件监听
  document.addEventListener("mousemove", handleDragMouseMove);
  document.addEventListener("mouseup", handleDragMouseUp);
};

// 鼠标移动（拖动中）
const handleDragMouseMove = (event) => {
  if (!isDragging.value)
    return;
  // 可以在这里添加视觉反馈
};

// 鼠标松开（结束拖动）- 在此时执行交换
const handleDragMouseUp = (event) => {
  // 查询最终的目标位置并执行交换
  emit("drag-query", props.token.id, (isDragging, dragSourceId) => {
    if (!isDragging || !dragSourceId) {
      cleanupDragListeners();
      emit("drag-end", props.token.id);
      return;
    }

    // 查询当前鼠标下的目标卡片
    emit("drag-get-target", (targetTokenId) => {
      if (targetTokenId && dragSourceId !== targetTokenId) {
        // 执行交换
        emit("drop", {
          draggedId: dragSourceId,
          targetId: targetTokenId,
        });
      }

      // 清理状态
      cleanupDragListeners();
      emit("drag-end", dragSourceId);
    });
  });
};

// 清理拖动监听器
const cleanupDragListeners = () => {
  document.removeEventListener("mousemove", handleDragMouseMove);
  document.removeEventListener("mouseup", handleDragMouseUp);
};

// 鼠标进入卡片（用于接收拖动）- 只记录目标位置，不立即触发交换
const handleCardMouseEnter = (event) => {
  // 通过事件查询父组件的拖动状态
  emit("drag-query", props.token.id, (isDragging, dragSourceId) => {
    if (!isDragging || !dragSourceId) {
      return;
    }

    const targetTokenId = props.token.id;
    const draggedTokenId = dragSourceId;

    if (draggedTokenId && draggedTokenId !== targetTokenId) {
      // 只更新目标位置，不立即发送drop事件
      // 实际交换在mouseup时执行
      emit("drag-update-target", targetTokenId);
    }
  });
};

// 处理卡片点击
const handleCardClick = (event) => {
  // 如果是在拖动状态，不触发点击
  if (isDragging.value) {
    event.preventDefault();
    event.stopPropagation();
  }
};

// 从store获取token游戏数据（响应式）
const tokenGameData = computed(() => tokenStore.getTokenGameData(props.token.id));

// 去掉名称中的区服前缀显示
const displayName = computed(() => {
  let name = props.token.name;
  if (!name) return name;
  // 去掉开头的区服信息，如 "5服_", "5_", "5服-", "123服_"
  name = name.replace(/^\d+服?[_\-]/, '');
  return name;
});

// 连接状态
const isConnected = computed(() => {
  const connection = tokenStore.wsConnections[props.token.id];
  return connection?.status === "connected";
});

// 是否正在连接中
const isConnecting = computed(() => {
  const connection = tokenStore.wsConnections[props.token.id];
  return connection?.status === "connecting" || connection?.status === "reconnecting";
});

// 连接按钮是否禁用（连接中时禁用）
const isConnectionButtonDisabled = computed(() => {
  return isConnecting.value;
});

const connectionStatusClass = computed(() => {
  if (isConnecting.value) {
    return "status-connecting";
  }
  const connection = tokenStore.wsConnections[props.token.id];
  if (connection?.status === "error") {
    return "status-error";
  }
  return {
    "status-connected": isConnected.value,
    "status-disconnected": !isConnected.value,
  };
});

const connectionStatusText = computed(() => {
  if (isConnecting.value) {
    return "连接中...";
  }
  const connection = tokenStore.wsConnections[props.token.id];
  if (connection?.status === "error") {
    return "连接失败";
  }
  return isConnected.value ? "已连接" : "未连接";
});

// 刷新状态
const isRefreshing = computed(() => {
  return tokenStore.isTokenRunning(props.token.id);
});

// 最后刷新时间
const lastRefreshTime = computed(() => {
  if (!props.token.lastRefreshAt)
    return null;
  const date = new Date(props.token.lastRefreshAt);
  return date.toLocaleTimeString();
});

// 答题状态计算属性（直接从roleInfo获取，确保数据准确）
const studyInfo = computed(() => {
  const study = tokenGameData.value?.roleInfo?.role?.study;
  if (!study)
    return null;

  const maxCorrectNum = study.maxCorrectNum || 0;
  const beginTime = study.beginTime || 0;
  const thisWeek = beginTime > 0 ? isInCurrentWeek(beginTime * 1000) : false;

  // 修复：只有在本周内的 maxCorrectNum 才是有效的，历史数据应该显示为 0
  const effectiveMaxCorrectNum = thisWeek ? maxCorrectNum : 0;
  const isCompleted = effectiveMaxCorrectNum >= 10 && thisWeek;

  return {
    maxCorrectNum: effectiveMaxCorrectNum, // 返回有效的本周数据
    isCompleted,
    thisWeek,
  };
});

// 从items中获取道具数量（兼容多种数据格式）
const getItemCount = (items, id) => {
  if (!items) return 0;
  if (Array.isArray(items)) {
    const found = items.find(it => Number(it.id ?? it.itemId) === id);
    return found ? Number(found.num ?? found.count ?? found.quantity ?? 0) : 0;
  }
  const node = items[String(id)] ?? items[id];
  if (node == null) return 0;
  if (typeof node === 'number') return node;
  if (typeof node === 'object') return Number(node.num ?? node.count ?? node.quantity ?? 0);
  return Number(node) || 0;
};

// 金鱼达标本地缓存key
const goldFishStorageKey = computed(() => `goldfish_status_${props.token.id}`);

// 从本地缓存加载金鱼达标数据
const loadGoldFishCache = () => {
  try {
    const raw = localStorage.getItem(goldFishStorageKey.value);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

// 金鱼达标状态计算（金砖24万+、招募令3400+、宝箱积分32000+、金鱼竿750+）
const goldFishStatus = computed(() => {
  const rawRoleInfo = tokenGameData.value?.roleInfo;
  // 兼容两种数据路径：roleInfo可能是wrapper{role:{...}}或直接是role对象
  const role = rawRoleInfo?.role || rawRoleInfo;

  // 如果没有在线数据，尝试从本地缓存读取
  if (!role) {
    const cache = loadGoldFishCache();
    if (cache) return cache;
    // 无缓存时返回默认值
    return {
      gold: 0, recruitTickets: 0, boxScore: 0, bronzeCount: 0, goldChestCount: 0, platinumCount: 0, goldRods: 0,
      goldTarget: 240000, recruitTarget: 3400, boxesTarget: 32000, rodsTarget: 750,
      goldMet: false, recruitMet: false, boxesMet: false, rodsMet: false, allMet: false,
    };
  }

  const items = role?.items || role?.itemList || role?.bag?.items || role?.inventory || null;

  // 金砖：role.diamond（金砖），注意 role.gold 是金币
  const gold = Number(role?.diamond) || 0;
  // 招募令：itemId 1001
  const recruitTickets = getItemCount(items, 1001);
  // 宝箱积分：青铜(2002)10个=100分(1个=10分)、黄金(2003)10个=200分(1个=20分)、铂金(2004)10个=500分(1个=50分)
  const bronzeCount = getItemCount(items, 2002);
  const goldChestCount = getItemCount(items, 2003);
  const platinumCount = getItemCount(items, 2004);
  const boxScore = bronzeCount * 10 + goldChestCount * 20 + platinumCount * 50;
  // 金鱼竿：itemId 1012
  const goldRods = getItemCount(items, 1012);

  // 达标条件（金砖和金鱼竿联动：金砖每多10万，鱼竿要求减少50）
  const goldTarget = 240000;
  const recruitTarget = 3400;
  const boxesTarget = 32000;
  // 金砖超过24万的部分，每满10万降低鱼竿要求50，最低250
  const goldExcessSteps = Math.floor(Math.max(0, gold - goldTarget) / 100000);
  const rodsTarget = Math.max(250, 750 - goldExcessSteps * 50);

  const goldMet = gold >= goldTarget;
  const recruitMet = recruitTickets >= recruitTarget;
  const boxesMet = boxScore >= boxesTarget;
  const rodsMet = goldRods >= rodsTarget;
  const allMet = goldMet && recruitMet && boxesMet && rodsMet;

  return {
    gold,
    recruitTickets,
    boxScore,
    bronzeCount,
    goldChestCount,
    platinumCount,
    goldRods,
    goldTarget,
    recruitTarget,
    boxesTarget,
    rodsTarget,
    goldMet,
    recruitMet,
    boxesMet,
    rodsMet,
    allMet,
  };
});

// 金鱼达标数据变化时保存到本地缓存
watch(goldFishStatus, (status) => {
  // 只保存有实际数据的（不是默认全零值）
  if (status && (status.gold > 0 || status.recruitTickets > 0 || status.goldRods > 0)) {
    try {
      localStorage.setItem(goldFishStorageKey.value, JSON.stringify(status));
    } catch {}
  }
}, { deep: true });

// 显示用的答题信息(智能合并服务器数据和本地数据)
const displayStudyInfo = computed(() => {
  const serverData = studyInfo.value;
  const localData = studyStatus.value;

  // 如果服务器有数据,优先使用服务器数据(更准确)
  if (serverData && serverData.maxCorrectNum !== undefined) {
    // 检查本地是否有更新的答题进度(正在答题中)
    if (localData.isAnswering && localData.status === "answering") {
      // 正在答题中,显示本地进度
      return {
        maxCorrectNum: serverData.maxCorrectNum, // 基础正确数使用服务器数据
        isCompleted: false, // 答题中,未完成
        thisWeek: serverData.thisWeek,
        isAnswering: true,
        answeredCount: localData.answeredCount,
        questionCount: localData.questionCount,
      };
    }

    // 如果本地标记为已完成,且服务器也显示完成,使用服务器数据
    if (serverData.isCompleted && serverData.thisWeek) {
      return {
        maxCorrectNum: serverData.maxCorrectNum,
        isCompleted: true,
        thisWeek: true,
      };
    }

    // ✅ 关键修复：本地标记为已完成但服务器数据尚未更新（roleInfo缓存延迟）
    // 答题完成后 studyStatus 会先于 roleInfo 更新，此时应信任本地状态
    if (localData.isCompleted && localData.thisWeek && !localData.isAnswering) {
      return {
        maxCorrectNum: localData.maxCorrectNum || serverData.maxCorrectNum,
        isCompleted: true,
        thisWeek: true,
      };
    }

    // 默认使用服务器数据
    return serverData;
  }

  // 服务器无数据时,使用本地保存的状态
  if (localData.maxCorrectNum !== undefined && localData.maxCorrectNum > 0) {
    const localMaxCorrect = localData.maxCorrectNum;
    const isCompleted = localMaxCorrect >= 10;

    return {
      maxCorrectNum: localMaxCorrect,
      isCompleted,
      thisWeek: localData.thisWeek || true,
    };
  }

  // 都没有数据,返回默认值
  return { maxCorrectNum: 0, isCompleted: false, thisWeek: false };
});

// 盐罐数据
const saltJar = ref({
  isRunning: false,
  remainingTime: 0,
  stopTime: 0,
});

// 挂机数据
const hangUp = ref({
  isActive: false,
  remainingTime: 0,
  elapsedTime: 0,
  endTime: null,
});

// 每日任务数据
const dailyTask = ref({
  progress: 0,
  complete: [],
});

// 月度任务数据
const monthlyTask = ref({
  fish: 0,
  arena: 0,
  fishTarget: 320,
  arenaTarget: 240,
  totalProgress: 0,
});

// 模块显示状态
const isTowerExpanded = ref(props.isTowerExpanded);
const isCarExpanded = ref(props.isCarExpanded);

// 监听 props 变化
watch(() => props.isTowerExpanded, (newValue) => {
  isTowerExpanded.value = newValue;
});

watch(() => props.isCarExpanded, (newValue) => {
  isCarExpanded.value = newValue;
});

// 赛车状态数据
const carStatus = ref({
  availableCars: 0, // 可用车辆（未发车）
  onMissionCars: 0, // 已发车但未完成
  claimableCars: 0, // 可以收取
  completedCars: 0, // 今日已完成
  totalCars: 0, // 总车辆数
  cars: [], // 每个车辆的详细状态
  isLoading: false, // 加载状态
  sendCnt: 0, // 今日已发车次数（carDataMap.length）
  remainingSends: 4, // 今日还能发车次数（4 - sendCnt接口值）
  successRaidCnt: 0, // 今日已成功领取次数
  refreshTickets: 0, // 刷新券剩余数量
});

// 残卷状态数据
const legacyStatus = ref({
  isAvailable: false, // 是否有可领取的残卷
  quantity: 0, // 当前拥有数量
  lastClaimTime: null, // 最后领取时间
});

// 星级挑战总星数
const starChallengeTotalStars = ref(0);

// 功德簿星数（队伍成员本周星数总和，上限120）
const meritBookStars = ref(0);

// 星级挑战状态
const isStarChallenging = ref(false);

// 竞技场排名
const arenaRank = ref(0);

// 竞技场战斗状态
const isArenaFighting = ref(false);

// 十殿阎罗通关等级
const nightmareMaxLevel = ref(0);

// 爬塔数据（普通爬塔）
const towerData = ref({
  floor: "0 - 0", // 当前层数 (格式: floor - layer)
  maxFloor: "0 - 0", // 最高层数
  energy: 0, // 当前体力
  maxEnergy: 20, // 最大体力
  isExpanded: false, // 是否展开，默认为false
  isRefreshing: false, // 是否正在刷新
});

// 监听爬塔展开状态props变化
watch(() => props.isClimbTowerExpanded, (newValue) => {
  towerData.value.isExpanded = newValue;
});

// 怪异塔数据
const weirdTowerData = ref({
  floor: "1-1", // 当前层数 (格式: chapter-floor)
  energy: 0, // 当前体力
  maxEnergy: 100, // 最大体力（修改为100）
  lotteryLeftCnt: 0, // 剩余抽奖次数
  isExpanded: false, // 是否展开，默认为false
  isRefreshing: false, // 是否正在刷新
});

// 监听怪异塔展开状态props变化
watch(() => props.isWeirdTowerExpanded, (newValue) => {
  weirdTowerData.value.isExpanded = newValue;
});

// 换皮闯关数据
const towerInfo = ref({
  actId: null,
  levelRewardMap: {},
  dailyFightNum: 0,
  isActivityValid: false,
  finishedCount: 0,
  isRefreshing: false,
});

// 答题状态数据
const studyStatus = ref({
  isAnswering: false,
  questionCount: 0,
  answeredCount: 0,
  status: "",
  isCompleted: false,
  maxCorrectNum: 0,
  thisWeek: false,
});

// 本地存储key前缀
const STORAGE_KEY_PREFIX = "tokencard_";

// 生成存储key
const getStorageKey = (key) => `${STORAGE_KEY_PREFIX}${props.token.id}_${key}`;

// 保存状态到本地存储(跨平台)
const saveCardStatus = async () => {
  try {
    const statusData = {
      // 盐罐状态
      saltJar: saltJar.value,
      // 挂机状态
      hangUp: hangUp.value,
      // 每日任务
      dailyTask: dailyTask.value,
      // 月度任务
      monthlyTask: monthlyTask.value,
      // 功法残卷
      legacyStatus: legacyStatus.value,
      // 星级挑战
      starChallengeTotalStars: starChallengeTotalStars.value,
      // 竞技场排名
      arenaRank: arenaRank.value,
      // 十殿阎罗通关等级
      nightmareMaxLevel: nightmareMaxLevel.value,
      // 答题状态
      studyStatus: studyStatus.value,
      // 普通爬塔
      towerData: towerData.value,
      // 怪异塔
      weirdTowerData: weirdTowerData.value,
      // 换皮闯关
      towerInfo: towerInfo.value,
      // 赛车状态
      carStatus: carStatus.value,
      // 保存时间（只在真正保存时更新）
      savedAt: new Date().toISOString(),
    };
    const key = getStorageKey("status");
    const success = await storage.set(key, statusData);
    // 只在保存成功时输出日志，减少控制台刷屏
    // console.log(`[保存状态] Token: ${props.token.id}, 成功: ${success}`);
  } catch (error) {
    console.warn("[保存状态] Failed to save card status:", error);
  }
};

// 从本地存储恢复状态(跨平台)
const restoreCardStatus = async () => {
  try {
    const key = getStorageKey("status");
    console.log(`[恢复状态] Token: ${props.token.id}, 尝试读取: ${key}`);

    const statusData = await storage.get(key, null);

    if (!statusData) {
      console.log(`[恢复状态] 没有找到保存的数据`);
      return;
    }

    console.log(`[恢复状态] 读取到数据:`, statusData);

    // 检查是否需要重置(每周日24点)
    const savedAt = new Date(statusData.savedAt);
    const now = new Date();
    const shouldReset = checkWeeklyReset(savedAt, now);

    if (shouldReset) {
      console.log("[恢复状态] 检测到周重置，清空卡片状态");
      return;
    }

    // 恢复状态
    if (statusData.saltJar) {
      saltJar.value = { ...saltJar.value, ...statusData.saltJar };
    }
    if (statusData.hangUp) {
      // ✅ 关键修复：验证恢复的 hangUp 数据，防止异常值
      const restoredHangUp = statusData.hangUp;

      // 验证 hangUpTime 是否合理（不超过 20 小时）
      if (restoredHangUp.hangUpTime !== undefined && restoredHangUp.hangUpTime > 72000) {
        console.warn(`[恢复状态] hangUpTime 异常: ${restoredHangUp.hangUpTime}，重置为 0`);
        restoredHangUp.hangUpTime = 0;
      }

      // 验证 elapsedTime 是否合理（不超过 20 小时）
      if (restoredHangUp.elapsedTime !== undefined && restoredHangUp.elapsedTime > 72000) {
        console.warn(`[恢复状态] elapsedTime 异常: ${restoredHangUp.elapsedTime}，重置为 0`);
        restoredHangUp.elapsedTime = 0;
      }

      hangUp.value = { ...hangUp.value, ...restoredHangUp };
    }
    if (statusData.dailyTask) {
      dailyTask.value = { ...dailyTask.value, ...statusData.dailyTask };
    }
    if (statusData.monthlyTask) {
      monthlyTask.value = { ...monthlyTask.value, ...statusData.monthlyTask };
    }
    if (statusData.legacyStatus) {
      legacyStatus.value = { ...legacyStatus.value, ...statusData.legacyStatus };
    }
    if (statusData.starChallengeTotalStars !== undefined) {
      starChallengeTotalStars.value = statusData.starChallengeTotalStars;
    }
    if (statusData.arenaRank !== undefined) {
      arenaRank.value = statusData.arenaRank;
    }
    if (statusData.nightmareMaxLevel !== undefined) {
      nightmareMaxLevel.value = statusData.nightmareMaxLevel;
    }
    if (statusData.studyStatus) {
      studyStatus.value = { ...studyStatus.value, ...statusData.studyStatus };
    }
    if (statusData.towerData) {
      // 恢复爬塔数据，但不恢复展开状态
      const { isExpanded, ...towerDataWithoutExpand } = statusData.towerData;
      towerData.value = { ...towerData.value, ...towerDataWithoutExpand };
    }
    if (statusData.weirdTowerData) {
      // 恢复怪异塔数据，但不恢复展开状态
      const { isExpanded, ...weirdTowerDataWithoutExpand } = statusData.weirdTowerData;
      weirdTowerData.value = { ...weirdTowerData.value, ...weirdTowerDataWithoutExpand };
    }
    if (statusData.towerInfo) {
      towerInfo.value = { ...towerInfo.value, ...statusData.towerInfo };
    }
    if (statusData.carStatus) {
      carStatus.value = { ...carStatus.value, ...statusData.carStatus };
    }

    const env = storage.getEnvironment();
    console.log(`[${env}] 卡片状态恢复成功`);
  } catch (error) {
    console.warn("[恢复状态] Failed to restore card status:", error);
  }
};

// 检查是否需要每周重置
const checkWeeklyReset = (savedAt, now) => {
  // 只在周日晚上11点到周一晚上11点之间进行重置检查
  const currentDay = now.getDay(); // 0=周日, 1=周一...
  const currentHour = now.getHours();

  // 判断是否在重置窗口期内（周日23:00 - 周一23:00）
  const isInResetWindow
    = (currentDay === 0 && currentHour >= 23) // 周日晚上11点后
      || (currentDay === 1 && currentHour < 23); // 周一晚上11点前

  // 如果不在重置窗口期，静默跳过（不输出日志）
  if (!isInResetWindow) {
    return false;
  }

  // 获取保存时间所在周的周一0点
  const savedDay = savedAt.getDay(); // 0=周日, 1=周一...
  const daysSinceMonday = savedDay === 0 ? 6 : savedDay - 1; // 计算距离周一的天数

  const weekMonday = new Date(savedAt);
  weekMonday.setDate(savedAt.getDate() - daysSinceMonday);
  weekMonday.setHours(0, 0, 0, 0);

  // 获取当前时间所在周的周一0点
  const currentDaysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - currentDaysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // 如果两个周一不同,说明跨周了,需要重置
  const needReset = currentMonday.getTime() > weekMonday.getTime();

  console.log(`[周重置检查] 保存时间: ${savedAt.toLocaleString()}, 当前时间: ${now.toLocaleString()}`);
  console.log(`[周重置检查] 保存周周一: ${weekMonday.toLocaleString()}, 当前周周一: ${currentMonday.toLocaleString()}`);
  console.log(`[周重置检查] 是否在重置窗口期: ${isInResetWindow}, 是否需要重置: ${needReset}`);

  return needReset;
};

// 监听状态变化，自动保存（使用防抖避免频繁保存）
let saveTimer = null;
watch([
  saltJar,
  hangUp,
  dailyTask,
  monthlyTask,
  legacyStatus,
  starChallengeTotalStars,
  arenaRank,
  studyStatus,
  towerData,
  weirdTowerData,
  towerInfo,
  carStatus,
], async () => {
  // 清除之前的定时器
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // 设置新的定时器，1秒后再保存（防抖）
  saveTimer = setTimeout(async () => {
    await saveCardStatus();
  }, 1000);
}, { deep: true });

// 分组数据
const tokenGroups = computed(() => {
  return tokenStore.getTokenGroups?.(props.token.id) || [];
});

// 计算今日开放的BOSS
const todayWeekDay = new Date().getDay(); // 0-6 (Sun-Sat)
const openTowerMap = {
  5: [1], // Friday
  6: [2], // Saturday
  0: [3], // Sunday
  1: [4], // Monday
  2: [5], // Tuesday
  3: [6], // Wednesday
  4: [1, 2, 3, 4, 5, 6], // Thursday (All open)
};

const todayOpenTowers = computed(() => {
  return openTowerMap[todayWeekDay] || [];
});

// 检查活动是否有效
const isActivityValid = computed(() => {
  if (!towerInfo.value.actId)
    return false;

  const idStr = String(towerInfo.value.actId);
  if (idStr.length < 6)
    return false;

  // Format: YYMMDDX -> 20YY-MM-DD
  const year = `20${idStr.substring(0, 2)}`;
  const month = idStr.substring(2, 4);
  const day = idStr.substring(4, 6);

  const startDate = new Date(`${year}-${month}-${day}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);

  const now = new Date();
  return now >= startDate && now < endDate;
});

// 检查BOSS是否开放
const isTowerOpen = (type) => {
  return todayOpenTowers.value.includes(type);
};

// 检查BOSS是否已通关
const isTowerCleared = (type) => {
  const key1 = `${type}008`;
  const key2 = Number(key1);
  return !!(towerInfo.value.levelRewardMap[key1] || towerInfo.value.levelRewardMap[key2]);
};

// 获取BOSS当前层数
const getTowerLevel = (type) => {
  // Find highest cleared level
  for (let i = 8; i >= 1; i--) {
    const key1 = `${type}00${i}`;
    const key2 = Number(key1);
    if (towerInfo.value.levelRewardMap[key1] || towerInfo.value.levelRewardMap[key2]) {
      // If 8 is cleared, return 8
      if (i === 8)
        return 8;
      // Else return next level
      return i + 1;
    }
  }
  return 1;
};

// 任务执行日志
const taskLogs = ref([]);
const logsContentRef = ref(null);
const showTaskLogs = ref(false); // 控制日志显示
let autoCloseTimer = null; // 自动关闭定时器
const autoScrollEnabled = ref(true); // ✅ 控制是否自动滚动

// 清空任务日志
const clearTaskLogs = () => {
  taskLogs.value = [];
  showTaskLogs.value = false;
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
};

// 自动关闭日志（只在任务完成后调用）
const autoCloseLogs = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  autoCloseTimer = setTimeout(() => {
    showTaskLogs.value = false;
    autoCloseTimer = null;
  }, 5000); // 5秒后关闭，给用户更多时间查看日志
};

// 滚动日志到底部
const scrollLogsToBottom = () => {
  if (logsContentRef.value && autoScrollEnabled.value) {
    logsContentRef.value.scrollTop = logsContentRef.value.scrollHeight;
  }
};

// ✅ 监听滚动事件，智能控制自动滚动
const handleLogScroll = () => {
  if (!logsContentRef.value)
    return;

  const element = logsContentRef.value;
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;

  // 计算距离底部的距离
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;

  // 如果距离底部小于50px，认为用户已滚动到底部，启用自动滚动
  if (distanceToBottom < 50) {
    autoScrollEnabled.value = true;
  } else {
    // 否则用户正在查看历史日志，禁用自动滚动
    autoScrollEnabled.value = false;
  }
};

// 添加日志
const addLog = (log) => {
  showTaskLogs.value = true; // 显示日志

  taskLogs.value.push({
    ...log,
    time: log.time || new Date().toLocaleTimeString(),
  });
  // ✅ 限制日志数量，只保留最近100条（日常任务通常产生30-50条日志）
  if (taskLogs.value.length > 500) {
    taskLogs.value.shift();
  }
  // 添加日志后自动滚动到底部
  nextTick(() => {
    scrollLogsToBottom();
  });

  // ✅ 不再每次添加日志都重置自动关闭定时器，只在任务完成后调用autoCloseLogs()
};

// 同步游戏数据（带防抖，避免频繁role_getroleinfo导致的闪烁）
let syncGameDataTimer = null;
const syncGameData = () => {
  // 清除之前的定时器
  if (syncGameDataTimer) {
    clearTimeout(syncGameDataTimer);
  }

  // 防抖500ms：500ms内的多次数据变化只同步最后一次，有效合并Debounce机制触发的多次role_getroleinfo
  syncGameDataTimer = setTimeout(() => {
    doSyncGameData();
    syncGameDataTimer = null;
  }, 500);
};

// 实际执行同步的函数
const doSyncGameData = () => {
  const roleInfo = tokenGameData.value?.roleInfo?.role;
  if (!roleInfo)
    return;

  const now = Date.now() / 1000;

  // 同步盐罐数据
  if (roleInfo.bottleHelpers) {
    saltJar.value.stopTime = roleInfo.bottleHelpers.helperStopTime;
    saltJar.value.isRunning = roleInfo.bottleHelpers.helperStopTime > now;
    saltJar.value.remainingTime = Math.max(0, Math.floor(roleInfo.bottleHelpers.helperStopTime - now));
  }

  // 同步挂机数据
  if (roleInfo.hangUp) {
    const serverLastTime = roleInfo.hangUp.lastTime;
    const serverHangUpTime = roleInfo.hangUp.hangUpTime;

    // ✅ 关键修复：只在 lastTime 或 hangUpTime 变化时才重新计算
    const hasChanged = hangUp.value.lastTime !== serverLastTime
      || hangUp.value.hangUpTime !== serverHangUpTime;

    if (hasChanged) {
      // 服务器数据有变化，重新同步
      hangUp.value.lastTime = serverLastTime;
      hangUp.value.hangUpTime = serverHangUpTime;

      const elapsed = now - serverLastTime;

      if (elapsed <= serverHangUpTime) {
        hangUp.value.remainingTime = Math.floor(serverHangUpTime - elapsed);
        hangUp.value.isActive = true;
        hangUp.value.endTime = new Date(Date.now() + hangUp.value.remainingTime * 1000);
      } else {
        hangUp.value.remainingTime = 0;
        hangUp.value.isActive = false;
        hangUp.value.endTime = null;
      }

      // ✅ 关键修复：elapsedTime 直接基于 elapsed 计算，不依赖 remainingTime
      hangUp.value.elapsedTime = Math.floor(elapsed);
    } else {
      // 服务器数据无变化，继续使用定时器更新的值
      // ✅ 关键修复：验证 elapsedTime 是否异常，如果是则重新同步
      const hangUpTime = hangUp.value.hangUpTime || 0;
      if (hangUp.value.elapsedTime > hangUpTime && hangUpTime > 0) {
        // elapsedTime 异常，重新从服务器同步
        const elapsed = now - hangUp.value.lastTime;
        hangUp.value.elapsedTime = Math.floor(elapsed);
      }
      // 不做其他操作，保持定时器计算的准确性
    }
  }

  // 同步每日任务数据
  if (roleInfo.dailyTask) {
    dailyTask.value.progress = Math.min(roleInfo.dailyTask.dailyPoint || 0, 110);
    dailyTask.value.complete = roleInfo.dailyTask.complete || [];

    // 同时更新到tokenStore的活跃度映射中（用于批量排序）
    if (props.token?.id) {
      tokenStore.setTokenActivity(props.token.id, roleInfo.dailyTask.dailyPoint || 0);
    }
  }

  // 同步答题状态数据
  if (roleInfo.study) {
    const maxCorrectNum = roleInfo.study.maxCorrectNum || 0;
    const beginTime = roleInfo.study.beginTime || 0;
    const thisWeek = beginTime > 0 ? isInCurrentWeek(beginTime * 1000) : false;

    // 修复：只有在本周内的 maxCorrectNum 才是有效的
    const effectiveMaxCorrectNum = thisWeek ? maxCorrectNum : 0;

    studyStatus.value.maxCorrectNum = effectiveMaxCorrectNum;
    studyStatus.value.isCompleted = effectiveMaxCorrectNum >= 10 && thisWeek;
    studyStatus.value.thisWeek = thisWeek;
  } else {
    // 如果没有study数据，重置答题状态
    studyStatus.value.maxCorrectNum = 0;
    studyStatus.value.isCompleted = false;
    studyStatus.value.thisWeek = false;
  }

  // 同步实时答题状态（仅同步实时答题进度，不覆盖游戏数据状态）
  if (tokenGameData.value?.studyStatus) {
    const realTimeStatus = tokenGameData.value.studyStatus;
    // 只同步实时答题相关的动态字段
    if (realTimeStatus.isAnswering !== undefined) {
      studyStatus.value.isAnswering = realTimeStatus.isAnswering;
    }
    if (realTimeStatus.questionCount !== undefined) {
      studyStatus.value.questionCount = realTimeStatus.questionCount;
    }
    if (realTimeStatus.answeredCount !== undefined) {
      studyStatus.value.answeredCount = realTimeStatus.answeredCount;
    }
    if (realTimeStatus.status !== undefined) {
      studyStatus.value.status = realTimeStatus.status;
    }
    // 注意：isCompleted、thisWeek、maxCorrectNum 从游戏数据获取，不被实时状态覆盖
  }

  // 同步爬塔数据（普通爬塔）
  if (tokenGameData.value?.roleInfo?.role?.tower) {
    const tower = tokenGameData.value.roleInfo.role.tower;
    const towerId = tower.id;
    if (towerId !== undefined && towerId !== null) {
      const floor = Math.floor(towerId / 10) + 1;
      const layer = (towerId % 10) + 1;
      towerData.value.floor = `${floor} - ${layer}`;
      towerData.value.maxFloor = `${floor} - ${layer}`;
    } else {
      towerData.value.floor = "0 - 0";
      towerData.value.maxFloor = "0 - 0";
    }
    towerData.value.energy = tower.energy || 0;
    towerData.value.maxEnergy = tower.maxEnergy || 20;
  }

  // 同步怪异塔数据（仅在黑市周开放时同步）
  const isWeirdTowerOpen = () => {
    const now = new Date();
    const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
    const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
    const cycleDuration = 3 * weekDuration; // 三周期毫秒数

    const elapsed = now.getTime() - start.getTime();
    if (elapsed < 0)
      return false; // 活动开始前

    const cyclePosition = elapsed % cycleDuration;
    const isBlackMarketWeek = cyclePosition < weekDuration; // 第一周是黑市周

    if (!isBlackMarketWeek)
      return false;

    // 检查时间限制：周五11:00-12:00不开放
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    if (day === 5) {
      // 周五：11:00前 或 12:00后开放
      const morningEnd = 11 * 60; // 11:00 = 660分钟
      const afternoonStart = 12 * 60; // 12:00 = 720分钟
      return currentTime < morningEnd || currentTime >= afternoonStart;
    }

    // 其他时间全天开放
    return true;
  };

  if (isWeirdTowerOpen() && tokenGameData.value?.evoTowerInfo?.evoTower) {
    const evoTower = tokenGameData.value.evoTowerInfo.evoTower;
    const towerId = evoTower.towerId || 0;
    if (towerId === 0) {
      weirdTowerData.value.floor = "1-1";
    } else {
      const chapter = Math.floor(towerId / 10) + 1;
      const floor = (towerId % 10) + 1;
      weirdTowerData.value.floor = `${chapter}-${floor}`;
    }
    weirdTowerData.value.energy = evoTower.energy || 0;
    weirdTowerData.value.maxEnergy = 100; // 修改为100
    weirdTowerData.value.lotteryLeftCnt = evoTower.lotteryLeftCnt || 0;
  } else if (!isWeirdTowerOpen()) {
    // 活动未开放时，清空怪异塔数据
    weirdTowerData.value.floor = "--";
    weirdTowerData.value.energy = 0;
    weirdTowerData.value.lotteryLeftCnt = 0;
  }

  // 同步月度任务数据
  if (tokenGameData.value?.monthActivity) {
    const monthActivity = tokenGameData.value.monthActivity;
    const myMonthInfo = monthActivity.myMonthInfo || {};
    const myArenaInfo = monthActivity.myArenaInfo || {};

    monthlyTask.value.fish = Number(myMonthInfo["2"]?.num || 0);
    monthlyTask.value.arena = Number(myArenaInfo.num || 0);

    // 计算总进度
    const fishProgress = monthlyTask.value.fish / monthlyTask.value.fishTarget;
    const arenaProgress = monthlyTask.value.arena / monthlyTask.value.arenaTarget;
    monthlyTask.value.totalProgress = Math.min(100, Math.round(((fishProgress + arenaProgress) / 2) * 100));
  }

  // 同步残卷状态数据
  if (tokenGameData.value?.roleInfo?.role) {
    const role = tokenGameData.value.roleInfo.role;
    // 检查是否有可领取的残卷（根据挂机状态判断，挂机时间结束后可能有残卷可领取）
    legacyStatus.value.isAvailable = role.hangUp ? (Date.now() / 1000 - role.hangUp.lastTime) > role.hangUp.hangUpTime : false;

    // 获取当前残卷数量
    if (role.items && role.items[37007]) {
      legacyStatus.value.quantity = role.items[37007].quantity;
    } else {
      legacyStatus.value.quantity = 0;
    }
  }

  // 四小时毫秒数
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  // 计算车辆剩余时间
  const calculateRemainingTime = (car) => {
    const sendAt = Number(car?.sendAt || 0);
    if (!sendAt)
      return 0;
    const sendAtMs = sendAt < 1e12 ? sendAt * 1000 : sendAt;
    const remainingMs = sendAtMs + FOUR_HOURS_MS - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
  };

  // 获取车辆状态文本
  const getCarStatusText = (car) => {
    const sendAt = Number(car?.sendAt || 0);
    if (!sendAt) {
      return "未发车";
    }

    const remainingTime = calculateRemainingTime(car);
    if (remainingTime > 0) {
      return "已发车";
    } else {
      return "可收取";
    }
  };

  // 格式化剩余时间为 HH:MM:SS
  const formatRemainingTime = (seconds) => {
    if (seconds <= 0)
      return "00:00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 同步赛车状态数据
  if (tokenGameData.value?.carInfo) {
    const carInfo = tokenGameData.value.carInfo;

    // 使用normalizeCars函数标准化赛车数据，与疯狂赛车模块保持一致
    const carList = normalizeCars(carInfo?.body ?? carInfo);

    // 提取发车次数数据（需在车辆状态处理之前计算，用于判断已完成状态）
    const body = carInfo?.body || carInfo;
    const roleCar = body?.roleCar || body?.rolecar || {};
    const sendCnt = Number(roleCar?.sendCnt || roleCar?.sendcnt || 0);
    const sendCntResetTime = Number(roleCar?.sendCntResetTime || roleCar?.sendcntresettime || 0); // 秒级时间戳
    const successRaidCnt = Number(roleCar?.successRaidCnt || roleCar?.successraidcnt || 0); // 今日已成功领取次数
    // sendCnt必须配合sendCntResetTime判断是否跨天，才能确定是今日发车数
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // 今日0点（秒）
    const todaySends = sendCntResetTime >= todayStart ? sendCnt : 0; // 跨天则为0
    const dailyLimit = 4;
    const remainingSends = Math.max(0, dailyLimit - todaySends); // 今日还能发车次数

    // 处理每个车辆的状态
    const cars = carList.map((car, index) => {
      const sendAt = Number(car?.sendAt || car?.sendat || 0);
      const remainingTime = calculateRemainingTime(car);

      // 判断状态：
      // - sendAt > 0 且有剩余时间 → 已发车（任务中）
      // - sendAt > 0 且无剩余时间 → 可收取
      // - sendAt == 0 且 index < todaySends → 已完成（发车后已收回）
      // - sendAt == 0 且 index >= todaySends → 未发车
      let isOnMission = false;
      let isClaimable = false;
      let isCompleted = false;
      let isAvailable = false;
      let status;

      if (sendAt) {
        if (remainingTime > 0) {
          isOnMission = true;
          status = "已发车";
        } else {
          isClaimable = true;
          status = "可收取";
        }
      } else if (index < todaySends) {
        isCompleted = true;
        status = "已完成";
      } else {
        isAvailable = true;
        status = "未发车";
      }

      return {
        id: car?.id || index + 1,
        status,
        remainingTime,
        formattedTime: formatRemainingTime(remainingTime),
        isAvailable,
        isOnMission,
        isClaimable,
        isCompleted,
      };
    });

    // 计算各种状态的车辆数量
    const totalCars = carList.length;
    const onMissionCount = cars.filter((c) => c.isOnMission).length;
    const claimableCount = cars.filter((c) => c.isClaimable).length;
        
    // 提取刷新卷数量（道具ID 35002）
    const refreshTickets = Number(tokenGameData.value?.roleInfo?.role?.items?.[35002]?.quantity || 0);
        
    const availableCars = cars.filter((car) => car.isAvailable).length;
    const completedCars = cars.filter((car) => car.isCompleted).length;
        
    carStatus.value = {
      availableCars,
      onMissionCars: onMissionCount,
      claimableCars: claimableCount,
      completedCars,
      totalCars,
      cars,
      sendCnt: todaySends,        // 今日已发车次数（carDataMap.length）
      remainingSends,              // 今日还能发车次数（4 - sendCnt接口值）
      successRaidCnt,              // 今日已成功领取次数
      refreshTickets,
    };
  } else {
    // 当没有赛车数据时，重置状态
    carStatus.value = {
      availableCars: 0,
      onMissionCars: 0,
      claimableCars: 0,
      completedCars: 0,
      totalCars: 0,
      cars: [],
      isLoading: false,
      sendCnt: 0,
      remainingSends: 4,
      successRaidCnt: 0,
      refreshTickets: 0,
    };
  }

  // 同步换皮闯关数据（仅在活动开放时同步）
  if (tokenGameData.value?.towerInfo) {
    const towerData = tokenGameData.value.towerInfo;

    // 检查活动是否有效
    const checkActivityValid = () => {
      if (!towerData.actId)
        return false;
      const idStr = String(towerData.actId);
      if (idStr.length < 6)
        return false;

      const year = `20${idStr.substring(0, 2)}`;
      const month = idStr.substring(2, 4);
      const day = idStr.substring(4, 6);

      const startDate = new Date(`${year}-${month}-${day}T00:00:00`);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);

      const now = new Date();
      return now >= startDate && now < endDate;
    };

    const activityValid = checkActivityValid();

    if (activityValid) {
      towerInfo.value.actId = towerData.actId;
      towerInfo.value.levelRewardMap = towerData.levelRewardMap || {};
      towerInfo.value.dailyFightNum = towerData.todayUseTickCnt || 0;
      towerInfo.value.isActivityValid = true;
      towerInfo.value.finishedCount = Object.keys(towerInfo.value.levelRewardMap).filter((key) => {
        const numKey = Number(key);
        return numKey % 1000 === 8; // 第8层标记通关
      }).length;
    } else {
      // 活动未开放时，清空数据
      towerInfo.value.actId = null;
      towerInfo.value.levelRewardMap = {};
      towerInfo.value.dailyFightNum = 0;
      towerInfo.value.isActivityValid = false;
      towerInfo.value.finishedCount = 0;
    }
  }
};

// 监听token变化，重置状态
watch(() => props.token.id, (newTokenId, oldTokenId) => {
  if (newTokenId !== oldTokenId) {
    // Token变化时重置所有状态
    studyStatus.value = {
      isAnswering: false,
      questionCount: 0,
      answeredCount: 0,
      status: "",
      isCompleted: false,
      maxCorrectNum: 0,
      thisWeek: false,
    };
    saltJar.value = {
      isRunning: false,
      remainingTime: 0,
      stopTime: 0,
    };
    hangUp.value = {
      isActive: false,
      remainingTime: 0,
      elapsedTime: 0,
      endTime: null,
    };
    dailyTask.value = {
      progress: 0,
      complete: [],
    };
    monthlyTask.value = {
      fish: 0,
      arena: 0,
      fishTarget: 320,
      arenaTarget: 240,
      totalProgress: 0,
    };
    carStatus.value = {
      availableCars: 0,
      onMissionCars: 0,
      claimableCars: 0,
      completedCars: 0,
      totalCars: 0,
      cars: [],
      isLoading: false,
      sendCnt: 0,
      remainingSends: 4,
      successRaidCnt: 0,
      refreshTickets: 0,
    };
    towerInfo.value = {
      actId: null,
      levelRewardMap: {},
      dailyFightNum: 0,
      isActivityValid: false,
      finishedCount: 0,
      isRefreshing: false,
    };
    // 重置星级挑战数据
    starChallengeTotalStars.value = 0;
    // 重置功德簿数据
    meritBookStars.value = 0;
    // 重置竞技场排名
    arenaRank.value = 0;
  }
}, { immediate: false });

// 监听游戏数据变化
watch(() => tokenGameData.value, syncGameData, { deep: true, immediate: true });

// 监听连接状态变化，加载星级挑战数据
watch(() => isConnected.value, (connected) => {
  if (connected) {
    loadStarChallengeStars();
    loadMeritBookStars();
    loadArenaRank(); // 加载竞技场排名
  }
});

// 处理星级挑战
const handleStarChallenge = async () => {
  if (!isConnected.value) {
    message.warning("请先连接账号");
    return;
  }

  if (isStarChallenging.value) {
    message.warning("星级挑战进行中,请稍候...");
    return;
  }

  try {
    isStarChallenging.value = true;
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();

    addLog({
      message: "开始 十殿星级挑战，一键挑战",
      type: "info",
    });

    message.info("星级挑战开始");

    // 进入界面初始化
    const roleInfo = tokenStore.gameData.roleInfo;
    const roleId = roleInfo?.role?.roleId;
    const enterPromises = [
      tokenStore.sendMessageWithPromise(tokenId, "nmext_getinfo", {}, 5000).catch(() => {}),
    ];
    if (roleId) {
      enterPromises.push(
        tokenStore.sendMessageWithPromise(tokenId, "nightmare_getroleinfo", { roleId }, 5000).catch(() => {}),
        tokenStore.sendMessageWithPromise(tokenId, "matchteam_getroleteaminfo", { roleID: roleId }, 5000).catch(() => {}),
      );
    }
    await Promise.all(enterPromises);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 获取当前星级和次数信息
    const nmextInfo = tokenStore.gameData?.nmextInfo || {};
    const completeMap = nmextInfo.starBossCompleteMap || {};
    const fightCntMap = nmextInfo.starFightCntMap || {};

    // 计算各关卡星数
    const levelStarsMap = {};
    for (const [lv, stars] of Object.entries(completeMap)) {
      levelStarsMap[lv] = Object.values(stars).filter(Boolean).length;
    }

    // 从第1关到第8关顺序挑战
    for (let level = 1; level <= 8; level++) {
      if (!isConnected.value) {
        addLog({
          message: "连接已断开,挑战终止",
          type: "error",
        });
        break;
      }

      // 次数已满(5次),跳过
      const usedCount = fightCntMap[String(level)] || fightCntMap[level] || 0;
      if (usedCount >= 5) {
        addLog({
          message: `关卡 ${level} 次数已满,跳过`,
          type: "info",
        });
        continue;
      }

      // 已是3星,跳过
      const currentStars = levelStarsMap[level] || 0;
      if (currentStars >= 3) {
        addLog({
          message: `关卡 ${level} 已达3星,跳过`,
          type: "info",
        });
        continue;
      }

      addLog({
        message: `== 关卡 ${level} 挑战开始（预设阵容） ==`,
        type: "info",
      });

      // 执行挑战
      const typ = 100 + level;

      // 步骤1: 获取预设阵容信息
      const typeRes = await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_typegetinfo",
        { types: [typ] },
        5000,
      ).catch(() => null);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 构造 battleTeam
      let battleTeam = {};
      let lordWeaponId = 0;

      if (typeRes) {
        const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
        const typeData = body[String(typ)] || body[typ];

        if (typeData?.weapon?.weaponId !== undefined) {
          lordWeaponId = typeData.weapon.weaponId;
        }

        // 扁平化构造 battleTeam
        if (typeData?.teamInfo) {
          const teamInfo = typeData.teamInfo;
          battleTeam = {};
          for (const [pos, hero] of Object.entries(teamInfo)) {
            if (hero && hero.heroId) {
              battleTeam[pos] = {
                heroId: hero.heroId,
                level: hero.level || 1,
                star: hero.star || 1,
                skill: hero.skill || 0,
                equip: hero.equip || {},
                pet: hero.pet || null,
                holyBeast: hero.holyBeast || null,
                artifact: hero.artifact || null,
              };
            }
          }
        }
      }

      if (Object.keys(battleTeam).length === 0) {
        addLog({
          message: `第${level}关挑战失败,请游戏内检查阵容后重试。`,
          type: "error",
        });
        break;
      }

      // 步骤2: 计算战力
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "hero_calcpowerbyteam",
        { battleTeam, lordWeaponId },
        5000,
      ).catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 步骤3: 开始挑战(发送2次)
      const bossResults = await Promise.all([
        tokenStore.sendMessageWithPromise(
          tokenId,
          "nmext_startboss",
          { bossId: level, battleTeam, lordWeaponId, presetTeamType: 0 },
          8000,
        ).catch((err) => ({ __error: true, message: err.message })),
        tokenStore.sendMessageWithPromise(
          tokenId,
          "nmext_startboss",
          { bossId: level, battleTeam, lordWeaponId, presetTeamType: 0 },
          8000,
        ).catch((err) => ({ __error: true, message: err.message })),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 300));

      // 找到成功的结果
      const bossRes = bossResults.find((r) => r && !r.__error) || null;

      if (!bossRes) {
        addLog({
          message: `关卡 ${level} 无法挑战,请先通过十殿8之后再运行`,
          type: "warning",
        });
        break;
      }

      // 解析结果
      const body = bossRes.body || bossRes || {};
      const result = body.result || body;
      const isWin = result.isWin ?? result.iswin ?? result.win;

      if (!isWin) {
        // 挑战失败
        addLog({
          message: `第${level}关挑战失败,请游戏内检查阵容后重试。`,
          type: "error",
        });
        break;
      }

      // 解析获得星数
      const resCompleteMap = result.starBossCompleteMap || body.starBossCompleteMap
        || bossRes?.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
      const lvData = resCompleteMap
        ? (resCompleteMap[String(level)] || resCompleteMap[level])
        : null;

      const starCount = lvData
        ? (() => {
            const trueKeys = Object.entries(lvData)
              .filter(([, v]) => v === true)
              .map(([k]) => Number.parseInt(k, 10))
              .filter((k) => !isNaN(k));
            return trueKeys.length > 0 ? Math.max(...trueKeys) + 1 : 0;
          })()
        : 0;

      if (starCount >= 1) {
        addLog({
          message: `关卡 ${level} 挑战成功,获得 ${starCount} 星`,
          type: "success",
        });

        // 更新本地星数记录
        levelStarsMap[level] = starCount;
      } else {
        addLog({
          message: `第${level}关挑战失败,请游戏内检查阵容后重试。`,
          type: "error",
        });
        break;
      }

      // 第8关完成
      if (level === 8) {
        addLog({
          message: "星级挑战，一键挑战完成。",
          type: "success",
        });
        message.success("星级挑战完成");
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 刷新星级数据
    await loadStarChallengeStars();
  } catch (error) {
    console.error("星级挑战失败:", error);
    addLog({
      message: `星级挑战异常: ${error.message}`,
      type: "error",
    });
    message.error("挑战过程异常");
  } finally {
    isStarChallenging.value = false;
  }
};

// 监听 Token ID 变化，重新加载星级数据
watch(() => props.token.id, (newTokenId, oldTokenId) => {
  if (newTokenId !== oldTokenId && isConnected.value) {
    console.log("[StarChallenge] Token 切换，重新加载星级数据");
    loadStarChallengeStars();
  }
});

// 监听当前 Token 的游戏数据变化，实时更新星级显示
let lastNmextInfoStr = "";
watch(() => tokenGameData.value?.nmextInfo, (nmextInfo) => {
  if (nmextInfo && isConnected.value) {
    // 防抖：如果数据没变化，不重复计算
    const currentNmextInfoStr = JSON.stringify(nmextInfo.starBossCompleteMap || {});
    if (currentNmextInfoStr === lastNmextInfoStr) {
      return; // 数据未变化，跳过
    }
    lastNmextInfoStr = currentNmextInfoStr;

    console.log("[StarChallenge] 监听到 nmextInfo 变化，重新计算星数");

    // 直接使用游戏返回的数据
    const starBossCompleteMap = nmextInfo.starBossCompleteMap || {};
    let totalStars = 0;

    // 计算总星数：统计每个关卡的星数（true的数量）
    for (const [lv, stars] of Object.entries(starBossCompleteMap)) {
      if (stars && typeof stars === "object") {
        const starCount = Object.values(stars).filter(Boolean).length;
        totalStars += starCount;
      }
    }

    console.log("[StarChallenge] 更新总星数:", totalStars);
    starChallengeTotalStars.value = totalStars;
  }
}, { deep: true });

// 刷新赛车状态（仅在周一、周二、周三获取）
const refreshCarInfo = async () => {
  // 判断是否是周一、周二、周三
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6 (周日-周六)
  const isAllowedDay = dayOfWeek >= 1 && dayOfWeek <= 3; // 周一(1)、周二(2)、周三(3)

  if (!isAllowedDay) {
    console.log("[CarStatus] 今天不是周一到周三,跳过获取赛车状态");
    return;
  }

  try {
    carStatus.value.isLoading = true;
    await tokenStore.sendGameMessage(props.token.id, "car_getrolecar", {}, { usePromise: true, timeout: 10000 });
  } catch (error) {
    console.error("获取赛车状态失败:", error);
  } finally {
    carStatus.value.isLoading = false;
  }
};

// 加载竞技场排名
const loadArenaRank = async () => {
  try {
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();

    // 调用 API 获取排名列表
    const arenaRankData = await tokenStore.sendMessageWithPromise(
      tokenId,
      "arena_getarearank",
      {
        rankType: 0,
        minRank: 1,
        maxRank: 100, // 获取前100名
      },
      5000,
    );

    // 从返回数据中查找自己的排名
    const roleInfo = tokenStore.gameData?.roleInfo?.role || {};
    const myRoleId = roleInfo.roleId;
    const rankList = arenaRankData?.rankList || arenaRankData?.roleList || arenaRankData?.list || [];

    const myRankData = rankList.find((item) =>
      item.roleId === myRoleId
      || item.info?.roleId === myRoleId,
    );

    if (myRankData) {
      arenaRank.value = myRankData.rank || myRankData.info?.rank || 0;
      console.log("[ArenaRank] 获取到竞技场排名:", arenaRank.value);
    } else {
      arenaRank.value = 0;
      console.log("[ArenaRank] 未在前100名中找到自己");
    }
  } catch (err) {
    console.warn("[ArenaRank] 获取竞技场排名失败:", err.message);
    arenaRank.value = 0;
  }
};

// 获取十殿阎罗通关等级
const fetchNightmareData = async () => {
  try {
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();
    const roleInfo = tokenStore.gameData?.roleInfo?.role || {};
    const roleId = roleInfo.roleId;

    if (!roleId) {
      console.warn("[Nightmare] 无法获取 roleId，跳过十殿数据查询");
      return;
    }

    const resp = await tokenStore.sendMessageWithPromise(
      tokenId,
      "nightmare_getroleinfo",
      { roleId: Number(roleId) },
      5000,
    );

    // maxLevel 嵌套在 weekAward[周标识].maxLevel 中
    // 周标识为每周一的日期（如 20260615），需判断是否本周
    const weekAward = resp?.nightMareData?.weekAward || resp?.nightmareData?.weekAward || {};
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    const thisWeekKey = `${y}${m}${d}`;

    const thisWeekData = weekAward[thisWeekKey];
    const maxLevel = thisWeekData?.maxLevel ?? 0;

    nightmareMaxLevel.value = Number(maxLevel);
    console.log("[Nightmare] 十殿通关等级:", nightmareMaxLevel.value);
  } catch (err) {
    console.warn("[Nightmare] 获取十殿数据失败:", err.message);
  }
};

// 处理竞技场挑战
const handleArenaFight = async () => {
  if (!isConnected.value) {
    message.warning("请先连接账号");
    return;
  }

  if (isArenaFighting.value) {
    message.warning("竞技场战斗中,请稍候...");
    return;
  }

  try {
    isArenaFighting.value = true;
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();
    const roleInfo = tokenStore.gameData?.roleInfo?.role || {};

    // 获取门票数量
    const ticketCount = roleInfo.items?.[1007]?.quantity || 0;
    const fights = Math.min(3, ticketCount);

    if (fights === 0) {
      message.warning("咸神门票不足,无法挑战");
      isArenaFighting.value = false;
      return;
    }

    addLog({
      message: `开始竞技场挑战 (${fights}/3次)`,
      type: "info",
    });

    // 执行 3 次战斗
    for (let i = 0; i < fights; i++) {
      if (!isConnected.value)
        break;

      addLog({
        message: `第 ${i + 1}/${fights} 次战斗`,
        type: "info",
      });

      // 开启竞技场
      const arenaResult = await tokenStore.sendMessageWithPromise(tokenId, "arena_startarea", {}, 5000);

      console.log("[竞技场] arena_startarea 返回:", arenaResult);

      // 通过 fight_startlevel 获取 battleVersion
      try {
        const startLevelResult = await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startlevel",
          {},
          5000,
        );
        console.log("[竞技场] fight_startlevel 返回:", startLevelResult);

        if (startLevelResult?.battleData?.version) {
          tokenStore.setBattleVersion(startLevelResult.battleData.version);
          console.log("[竞技场] 设置 battleVersion:", startLevelResult.battleData.version);
        } else {
          console.warn("[竞技场] fight_startlevel 未返回 battleVersion");
        }
      } catch (err) {
        console.error("[竞技场] 获取 battleVersion 失败:", err.message);
      }

      console.log("[竞技场] 当前 gameData.battleVersion:", tokenStore.gameData?.battleVersion);

      // 等待一小段时间让服务器更新状态
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 获取目标
      const targets = await tokenStore.sendMessageWithPromise(
        tokenId,
        "arena_getareatarget",
        {},
        5000,
      );

      if (!targets) {
        addLog({
          message: "获取竞技场目标失败",
          type: "error",
        });
        break;
      }

      // 选择战力最低的目标
      const targetList = targets?.rankList || targets?.roleList || targets?.targets || [];
      if (targetList.length === 0) {
        addLog({
          message: "无可用的竞技场目标",
          type: "warning",
        });
        break;
      }

      // 使用 pickArenaTargetId 函数选择目标
      const targetResult = pickArenaTargetId(targets, { rank: 0, power: 0 });
      if (!targetResult || !targetResult.targetId) {
        addLog({
          message: "未找到可用的竞技场目标",
          type: "error",
        });
        break;
      }

      const targetId = targetResult.targetId;
      const targetName = targetResult.targetName || "未知";
      const targetPower = targetResult.targetPower || 0;

      console.log("[竞技场] 目标数据:", {
        targetResult,
        targetId,
        targetName,
        targetPower,
      });

      if (!targetId) {
        addLog({
          message: "目标 ID 为空，无法战斗",
          type: "error",
        });
        break;
      }

      addLog({
        message: `竞技场比赛 ${i + 1}/${fights}`,
        type: "info",
      });

      // 开始战斗
      console.log("[竞技场] 准备战斗, targetId:", targetId);
      try {
        const fightResult = await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startareaarena",
          { targetId },
          // 不传超时时间,使用默认值
        );
        console.log("[竞技场] 战斗结果:", fightResult);
      } catch (fightError) {
        console.error("[竞技场] 战斗失败详情:", {
          error: fightError,
          message: fightError.message,
          targetId,
          targets,
        });
      }

      // 等待 1 秒再进行下一次
      if (i < fights - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    addLog({
      message: `竞技场比赛已完成`,
      type: "success",
    });
    message.success("竞技场挑战完成");

    // 刷新排名
    await loadArenaRank();
  } catch (error) {
    console.error("竞技场挑战失败:", error);
    addLog({
      message: `竞技场挑战失败: ${error.message}`,
      type: "error",
    });
    message.error(`竞技场挑战失败: ${error.message}`);
  } finally {
    isArenaFighting.value = false;
  }
};

// 监听连接状态变化，自动获取数据
watch(() => isConnected.value, (connected) => {
  if (connected) {
    setTimeout(() => {
      if (isConnected.value) {
        // 换皮闯关：始终尝试获取，由组件判断是否有效
        refreshTowerInfo();
        refreshCarInfo();
        // 怪异塔：只在黑市周开放时获取
        refreshWeirdTowerData();
        // 十殿阎罗通关等级
        fetchNightmareData();

        // 连接成功后，等待数据刷新完成再保存状态
        setTimeout(async () => {
          await saveCardStatus();
          const env = storage.getEnvironment();
          console.log(`[${env}] 连接成功，已保存刷新后的卡片状态`);
        }, 3000);
      }
    }, 2000);
  }
}, { immediate: true });

// 定时器更新
let timer = null;
onMounted(async () => {
  // 恢复卡片状态
  await restoreCardStatus();

  timer = setInterval(() => {
    // 更新盐罐剩余时间
    if (saltJar.value.isRunning && saltJar.value.remainingTime > 0) {
      saltJar.value.remainingTime = Math.max(0, saltJar.value.remainingTime - 1);
      if (saltJar.value.remainingTime <= 0) {
        saltJar.value.isRunning = false;
      }
    }
    // 更新挂机剩余时间
    if (hangUp.value.isActive && hangUp.value.remainingTime > 0) {
      hangUp.value.remainingTime = Math.max(0, hangUp.value.remainingTime - 1);

      // ✅ 关键修复:只在 elapsedTime < hangUpTime 时才累加
      const hangUpTime = hangUp.value.hangUpTime || 0;
      if (hangUp.value.elapsedTime < hangUpTime) {
        hangUp.value.elapsedTime++;
      } else {
        // elapsedTime 已达到上限,不再累加
        hangUp.value.elapsedTime = hangUpTime;
      }

      if (hangUp.value.remainingTime <= 0) {
        hangUp.value.isActive = false;
      }
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer)
    clearInterval(timer);
  if (autoCloseTimer)
    clearTimeout(autoCloseTimer);
  if (syncGameDataTimer)
    clearTimeout(syncGameDataTimer); // 清理同步游戏数据定时器
});

// 格式化时间（短格式）
const formatShortTime = (seconds) => {
  const total = Math.floor(Number(seconds) || 0);
  if (total <= 0)
    return "00:00:00";
  const h = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// 格式化结束时间
const formatEndTime = (endTime) => {
  if (!endTime)
    return "";
  const date = new Date(endTime);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

// 处理残卷领取
const handleLegacyClaim = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `开始领取功法残卷...`,
      type: "info",
    });

    const result = await tokenStore.sendMessageWithPromise(
      props.token.id,
      "legacy_claimhangup",
      {},
      10000,
    );

    // 更新残卷状态
    if (result.reward && result.reward.length > 0) {
      const claimedAmount = result.reward[0].value;
      legacyStatus.value.quantity += claimedAmount;
      legacyStatus.value.lastClaimTime = new Date().toLocaleTimeString();
      legacyStatus.value.isAvailable = false;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `成功领取功法残卷${claimedAmount}，当前共有${legacyStatus.value.quantity}个`,
        type: "success",
      });
    }

    // 领取后刷新游戏数据
    tokenStore.refreshGameData(props.token.id);

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    const errorMsg = error.message || "";

    // 错误码12400160或200020表示未达到开启残卷关卡
    if (errorMsg.includes("12400160") || errorMsg.includes("服务器错误: 12400160")
      || errorMsg.includes("200020") || errorMsg.includes("服务器错误: 200020")) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `未达到关卡无法领取`,
        type: "info",
      });
    } else if (errorMsg.includes("12400000") || errorMsg.includes("挂机奖励领取过于频繁")
      || errorMsg.includes("800040") || errorMsg.includes("服务器错误: 800040")) {
      // 错误码12400000或800040表示残卷为0
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `残卷为0无法领取`,
        type: "info",
      });
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `领取功法残卷失败: ${errorMsg}`,
        type: "error",
      });
    }
  }
};

// 加载星级挑战总星数
const loadStarChallengeStars = async () => {
  try {
    console.log("[StarChallenge] 开始加载星级数据...");

    // 主动请求获取当前 Token 的星级数据
    if (isConnected.value) {
      try {
        console.log("[StarChallenge] 主动请求 nmext_getinfo...");
        const res = await tokenStore.sendMessageWithPromise(
          props.token.id,
          "nmext_getinfo",
          {},
          5000,
        );
        console.log("[StarChallenge] nmext_getinfo 响应:", res);
        const nmextInfo = res?.roleNMExt || res?.body?.roleNMExt || res;
        console.log("[StarChallenge] 解析后的 nmextInfo:", nmextInfo);

        if (nmextInfo) {
          console.log("[StarChallenge] 获取到 nmextInfo 数据");

          // 计算总星数
          const starBossCompleteMap = nmextInfo.starBossCompleteMap || {};
          let totalStars = 0;

          for (const [lv, stars] of Object.entries(starBossCompleteMap)) {
            if (stars && typeof stars === "object") {
              const starCount = Object.values(stars).filter(Boolean).length;
              console.log(`[StarChallenge] 关卡 ${lv} 星数:`, starCount, stars);
              totalStars += starCount;
            }
          }

          console.log("[StarChallenge] 总星数:", totalStars);

          // 防重复更新：只有星数变化时才更新
          if (starChallengeTotalStars.value !== totalStars) {
            starChallengeTotalStars.value = totalStars;
            console.log("[StarChallenge] 星数已更新:", totalStars);
          } else {
            console.log("[StarChallenge] 星数未变化，跳过更新");
          }
          return;
        }
      } catch (e) {
        console.warn("[StarChallenge] 获取星级挑战信息失败:", e);
      }
    }

    console.log("[StarChallenge] 未连接或请求失败，尝试从 localStorage 读取");
    // 备用方案：从 localStorage 读取（批量任务执行后的数据）
    const STAR_CHALLENGE_STORAGE_KEY = "batch_star_challenge_data";
    const raw = localStorage.getItem(STAR_CHALLENGE_STORAGE_KEY);
    if (!raw) {
      console.log("[StarChallenge] localStorage 中无数据");
      starChallengeTotalStars.value = 0;
      return;
    }

    const data = JSON.parse(raw);
    const tokenId = props.token.id;
    const stored = data[tokenId];

    if (!stored) {
      console.log("[StarChallenge] localStorage 中无此 token 数据");
      starChallengeTotalStars.value = 0;
      return;
    }

    // 检查是否是本周的数据
    const getWeekStartMs = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };

    const currentWeekStart = getWeekStartMs();
    if ((stored.weekStart || 0) === currentWeekStart) {
      console.log("[StarChallenge] 从 localStorage 读取总星数:", stored.totalStars);
      starChallengeTotalStars.value = stored.totalStars || 0;
    } else {
      // 不是本周数据，重置为0
      console.log("[StarChallenge] 非本周数据，重置为0");
      starChallengeTotalStars.value = 0;
    }
  } catch (error) {
    console.error("[StarChallenge] 加载星级挑战数据失败:", error);
    starChallengeTotalStars.value = 0;
  }
};

/** 加载功德簿星数（队伍成员本周星数总和） */
const loadMeritBookStars = async () => {
  try {
    if (!isConnected.value) return;
    const tokenId = props.token.id;
    const roleInfo = tokenStore.gameData.roleInfo;
    const roleID = roleInfo?.role?.roleId;
    if (!roleID) {
      // 尝试从 localStorage 恢复
      loadMeritBookFromStorage();
      return;
    }

    // 1. 获取队伍信息
    const roleTeamRes = await tokenStore.sendMessageWithPromise(
      tokenId, 'matchteam_getroleteaminfo', { roleID }, 5000
    );
    if (!roleTeamRes) {
      loadMeritBookFromStorage();
      return;
    }

    const gDMTData = roleTeamRes.roleMTData?.gDMTData || {};
    const teamKeys = Object.keys(gDMTData);
    if (teamKeys.length === 0) { meritBookStars.value = 0; return; }

    const teamId = gDMTData[teamKeys[0]]?.teamId;
    if (!teamId) { meritBookStars.value = 0; return; }

    // 2. 获取队伍详情
    const teamInfoRes = await tokenStore.sendMessageWithPromise(
      tokenId, 'matchteam_getteaminfo', { teamId }, 5000
    );
    if (!teamInfoRes) {
      loadMeritBookFromStorage();
      return;
    }

    // 3. 遍历 fightRoleBase 累加星数
    const fightRoleBase = teamInfoRes.teamInfo?.fightRoleBase || [];
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    const weekSuffix = String(monday.getFullYear()).slice(2) +
      String(monday.getMonth() + 1).padStart(2, '0') +
      String(monday.getDate()).padStart(2, '0');
    const targetKey = `nmExtStarCnt_${weekSuffix}`;

    let totalStars = 0;
    for (const member of fightRoleBase) {
      const extParam = member.extParam || {};
      totalStars += Number(extParam[targetKey]) || 0;
    }

    meritBookStars.value = totalStars;
    console.log("[MeritBook] 功德簿星数已刷新:", totalStars);
  } catch (e) {
    console.warn("[MeritBook] 功德簿查询异常:", e.message);
    loadMeritBookFromStorage();
  }
};

/** 从 localStorage 恢复功德簿数据 */
const loadMeritBookFromStorage = () => {
  try {
    const raw = localStorage.getItem("batch_star_challenge_data");
    if (!raw) return;
    const data = JSON.parse(raw);
    const stored = data[props.token.id];
    if (!stored) return;

    const getWeekStartMs = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    };

    if ((stored.weekStart || 0) === getWeekStartMs()) {
      meritBookStars.value = stored.meritBookStars || 0;
    }
  } catch (e) { /* 静默 */ }
};

/** 点击功德簿标签手动刷新 */
const handleRefreshMeritBook = async () => {
  if (!isConnected.value) {
    message.warning("请先连接账号");
    return;
  }
  message.info("正在刷新功德簿...");
  await loadMeritBookStars();
  message.success(`功德簿: ${meritBookStars.value}/120`);
};

// 获取进度条颜色
const getProgressColor = (progress) => {
  if (progress >= 100)
    return "#10b981"; // 绿色
  if (progress >= 60)
    return "#3b82f6"; // 蓝色
  if (progress >= 30)
    return "#f59e0b"; // 橙色
  return "#ef4444"; // 红色
};

// 事件处理
const handleSelect = (checked) => {
  emit("select", props.token.id, checked);
};

const openSettings = () => {
  emit("settings", props.token);
};

const toggleConnection = () => {
  emit("toggleConnection", props.token.id);
};

// 打开游戏功能页面
const openGame = () => {
  const token = props.token;
  const tokenStore = useTokenStore();
  
  // 先选择当前账号,确保游戏功能页面能正确加载数据
  if (tokenStore.selectedToken?.id !== token.id) {
    tokenStore.selectToken(token.id);
  }
  
  // 跳转到游戏功能页面
  router.push({
    path: '/admin/game-features',
    query: { 
      tokenId: token.id,
      tokenName: token.name 
    }
  });
  
  addLog({
    message: `🎮 已为 ${token.name} 打开游戏功能页面`,
    type: "success",
  });
  
  message.success(`已为 ${token.name} 打开游戏功能页面`);
};

// ========== 推图功能（使用共享推图模块） ==========
const isPushing = ref(false);
const pushTick = ref(0);  // 响应式计数器，用于触发推图状态刷新
let _pushTimer = null;

// 创建卡片专用的推图执行器
const _cardPushRunner = createPushMapRunner({
  tokenStore,
  getTokens: () => {
    // 从tokenStore获取所有tokens（Pinia已自动解包，无需.value）
    return tokenStore.gameTokens || [];
  },
  addLog: (log) => {
    // 复用卡片现有的addLog逻辑
    showTaskLogs.value = true;
    taskLogs.value.push({
      ...log,
      time: log.time || new Date().toLocaleTimeString(),
    });
    if (taskLogs.value.length > 500) taskLogs.value.shift();
    nextTick(() => { scrollLogsToBottom(); });
  },
  // 卡片推图不需要批量停止
  shouldStop: () => false,
});

const pushStatusText = computed(() => {
  if (!isPushing.value) return '';
  void pushTick.value;  // 依赖响应式计数器，确保倒计时变化时重新计算
  const st = window._pt && window._pt[props.token.id];
  if (!st || !st.running) return '';
  const cd = st.countdown || 0;
  const mm = Math.floor(cd / 60);
  const ss = String(Math.floor(cd % 60)).padStart(2, '0');
  return `${st.wins}胜${st.losses}负 ${mm}:${ss}`;
});

const togglePushMap = async () => {
  const tokenId = props.token.id;
  const tokenName = props.token.name;

  if (isPushing.value) {
    // 停止推图
    _cardPushRunner.stopOne(tokenId);
    isPushing.value = false;
    if (_pushTimer) { clearInterval(_pushTimer); _pushTimer = null; }
    addLog({ message: `[${tokenName}] 停止推图`, type: "warning" });
    return;
  }

  isPushing.value = true;
  addLog({ message: `[${tokenName}] 开始推图`, type: "info" });

  // 加载Boss数据
  try {
    await _cardPushRunner.loadBossData();
  } catch (e) {
    addLog({ message: `[${tokenName}] Boss数据加载失败，继续推图`, type: "warning" });
  }

  // 使用共享推图模块启动（内部自动处理连接、重连等）
  try {
    await _cardPushRunner.startOne(tokenId);
  } catch (e) {
    addLog({ message: `[${tokenName}] 推图启动失败: ${e.message}`, type: "error" });
    isPushing.value = false;
    if (_pushTimer) { clearInterval(_pushTimer); _pushTimer = null; }
    return;
  }

  // 定时监听推图状态（每秒刷新一次显示）
  _pushTimer = setInterval(() => {
    pushTick.value++;  // 触发 computed 重新计算
    const st = window._pt && window._pt[tokenId];
    if (!st || !st.running) {
      isPushing.value = false;
      clearInterval(_pushTimer);
      _pushTimer = null;
    }
  }, 1000);
};

// 一键补齐每日任务
const completeDailyTasks = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning('请先连接Token');
    return;
  }

  try {
    message.info(`开始为 ${props.token.name} 补齐每日任务...`);
    addLog({
      message: `开始为 ${props.token.name} 补齐每日任务...`,
      type: "info",
    });

    // 加载全局batchSettings延迟配置
    let batchSettings;
    try {
      const batchSettingsRaw = localStorage.getItem("batchSettings");
      batchSettings = batchSettingsRaw ? JSON.parse(batchSettingsRaw) : {};
    } catch (e) {
      batchSettings = {};
    }

    const runner = new DailyTaskRunner(tokenStore, {
      commandDelay: batchSettings.commandDelay || 500,
      taskDelay: batchSettings.taskDelay || 500,
    }, batchSettings);

    // 执行每日任务补齐
    await runner.run(props.token.id, {
      onLog: (logItem) => {
        console.log(`[${props.token.name}] ${logItem.message}`);
        addLog(logItem);
      },
      onProgress: (progress) => {
        addLog({
          message: `任务进度: ${progress}%`,
          type: "info",
        });
      },
    });

    message.success(`为 ${props.token.name} 补齐每日任务完成！`);
    addLog({
      message: `✅ 补齐每日任务完成`,
      type: "success",
    });

    // 刷新角色信息以更新任务状态
    setTimeout(() => {
      tokenStore.sendGetRoleInfo(props.token.id).catch(() => {});
    }, 1000);

    // 5秒后自动关闭日志显示
    autoCloseLogs();
  } catch (error) {
    console.error('补齐每日任务失败:', error);
    message.error(`补齐每日任务失败: ${error.message}`);
    addLog({
      message: `补齐每日任务失败: ${error.message}`,
      type: "error",
    });
  }
};

// 月度竞技场补齐
const completeMonthlyArena = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    const tokenId = props.token.id;
    const tokenName = props.token.name;
    const tokenStore = useTokenStore();

    addLog({
      message: `🏆 开始为 ${tokenName} 执行月度竞技场补齐...`,
      type: "info",
    });

    message.info(`开始为 ${tokenName} 执行月度竞技场补齐...`);

    // 1. 获取月度任务进度
    addLog({
      message: `正在获取月度任务进度...`,
      type: "info",
    });

    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "activity_get",
      {},
      10000,
    );
    const act = result?.activity || result?.body?.activity || result;

    if (!act) {
      addLog({
        message: `${tokenName} 获取月度任务进度失败`,
        type: "error",
      });
      message.error("获取月度任务进度失败");
      return;
    }

    const myArenaInfo = act.myArenaInfo || {};
    const arenaNum = Number(myArenaInfo?.num || 0);
    const ARENA_TARGET = 240; // 月度竞技场目标次数（与MonthlyTasksCard保持一致）

    // 计算当前应该完成的进度（与MonthlyTasksCard保持一致）
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
    const monthProgress = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
    const shouldBe = remainingDays === 0 ? ARENA_TARGET : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
    const need = Math.max(0, shouldBe - arenaNum);

    addLog({
      message: `📊 日期: ${now.getFullYear()}-${now.getMonth()+1}-${dayOfMonth}, 本月天数: ${daysInMonth}, 剩余天数: ${remainingDays}`,
      type: "info",
    });
    addLog({
      message: `📊 月进度: ${(monthProgress * 100).toFixed(1)}%, 应该完成: ${shouldBe}次, 当前: ${arenaNum}次, 需要补齐: ${need}次`,
      type: "info",
    });

    if (need <= 0) {
      addLog({
        message: `当前进度已达标，无需补齐`,
        type: "success",
      });
      message.success("当前进度已达标，无需补齐");
      autoCloseLogs();
      return;
    }

    // 2. 检查咸神门票 (ID: 1007)
    addLog({
      message: `正在检查咸神门票...`,
      type: "info",
    });

    let role = tokenStore.gameData?.roleInfo?.role;
    if (!role) {
      try {
        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        role = roleInfo?.role;
      } catch (e) {
        // ignore
      }
    }
    const ticketCount = role?.items?.[1007]?.quantity || 0;
    addLog({
      message: `${tokenName} 当前咸神门票: ${ticketCount}`,
      type: "info",
    });

    if (ticketCount < need) {
      addLog({
        message: `${tokenName} 咸神门票不足 (${ticketCount} < ${need})，将仅使用现有门票`,
        type: "warning",
      });
    }

    let ticketsLeft = ticketCount;
    let remaining = Math.min(need, ticketsLeft);

    if (remaining <= 0) {
      addLog({
        message: `${tokenName} 没有可用的咸神门票`,
        type: "warning",
      });
      message.warning("没有可用的咸神门票");
      autoCloseLogs();
      return;
    }

    // 3. 执行竞技场补齐
    addLog({
      message: `${tokenName} 开始执行竞技场补齐...`,
      type: "info",
    });

    // 开启竞技场
    try {
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "arena_startarea",
        {},
        3000,
      );
    } catch (error) {
      addLog({
        message: `${tokenName} 开始竞技场失败: ${error.message}`,
        type: "warning",
      });
    }

    let successCount = 0;
    let safetyCounter = 0;
    const safetyMaxFights = 100;
    let round = 1;

    while (remaining > 0 && ticketsLeft > 0 && safetyCounter < safetyMaxFights) {
      const planFights = Math.min(Math.ceil(remaining / 2), ticketsLeft);
      addLog({
        message: `${tokenName} 第${round}轮：计划战斗 ${planFights} 场 (剩余门票: ${ticketsLeft})`,
        type: "info",
      });

      let actualFights = 0;
      for (let i = 0; i < planFights && safetyCounter < safetyMaxFights; i++) {
        try {
          // 每场战斗前都需要开启竞技场
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "arena_startarea",
            {},
            5000,
          );

          // 获取目标（与MonthlyTasksCard保持一致）
          const targetResult = await tokenStore.sendMessageWithPromise(
            tokenId,
            "arena_getareatarget",
            {},
            8000,
          );

          // 使用pickArenaTargetId提取目标ID
          const candidate = targetResult?.rankList?.[0]
            || targetResult?.roleList?.[0]
            || targetResult?.targets?.[0]
            || targetResult?.targetList?.[0]
            || targetResult?.list?.[0];
          
          const targetId = candidate?.roleId || candidate?.id || targetResult?.roleId || targetResult?.id;

          if (targetId) {
            // 执行战斗（与MonthlyTasksCard保持一致）
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "fight_startareaarena",
              { targetId },
              15000,
            );
            actualFights++;
            successCount++;
            ticketsLeft--;
            remaining--;
            safetyCounter++;
          } else {
            addLog({
              message: `${tokenName} 未找到可用的竞技场目标`,
              type: "warning",
            });
            break;
          }

          // 延迟1200ms（与MonthlyTasksCard保持一致）
          await new Promise(r => setTimeout(r, 1200));
        } catch (error) {
          addLog({
            message: `${tokenName} 战斗失败: ${error.message}`,
            type: "warning",
          });
          safetyCounter++;
        }
      }

      addLog({
        message: `${tokenName} 第${round}轮实际战斗 ${actualFights} 场`,
        type: "info",
      });
      round++;

      // 如果这轮没有成功战斗，退出循环
      if (actualFights === 0) break;
    }

    addLog({
      message: `✅ ${tokenName} 月度竞技场补齐完成，成功 ${successCount} 次`,
      type: "success",
    });
    message.success(`${tokenName} 月度竞技场补齐完成！`);

    // 5秒后自动关闭日志显示
    autoCloseLogs();
  } catch (error) {
    console.error("月度竞技场补齐失败:", error);
    addLog({
      message: `月度竞技场补齐失败: ${error.message}`,
      type: "error",
    });
    message.error(`月度竞技场补齐失败: ${error.message}`);
  }
};

// 月度钓鱼补齐
const completeMonthlyFish = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    const tokenId = props.token.id;
    const tokenName = props.token.name;
    const tokenStore = useTokenStore();

    addLog({
      message: `🎣 开始为 ${tokenName} 执行月度钓鱼补齐...`,
      type: "info",
    });

    message.info(`开始为 ${tokenName} 执行月度钓鱼补齐...`);

    // 1. 获取月度任务进度
    addLog({
      message: `正在获取月度任务进度...`,
      type: "info",
    });

    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "activity_get",
      {},
      10000,
    );
    const act = result?.activity || result?.body?.activity || result;

    if (!act) {
      addLog({
        message: `${tokenName} 获取月度任务进度失败`,
        type: "error",
      });
      message.error("获取月度任务进度失败");
      return;
    }

    const myMonthInfo = act.myMonthInfo || {};
    const fishNum = Number(myMonthInfo?.["2"]?.num || 0);
    const FISH_TARGET = 320; // 月度钓鱼目标次数（与MonthlyTasksCard保持一致）

    // 计算当前应该完成的进度（与MonthlyTasksCard保持一致）
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
    const monthProgress = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
    const shouldBe = remainingDays === 0 ? FISH_TARGET : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
    const need = Math.max(0, shouldBe - fishNum);

    addLog({
      message: `📊 日期: ${now.getFullYear()}-${now.getMonth()+1}-${dayOfMonth}, 本月天数: ${daysInMonth}, 剩余天数: ${remainingDays}`,
      type: "info",
    });
    addLog({
      message: `📊 月进度: ${(monthProgress * 100).toFixed(1)}%, 应该完成: ${shouldBe}次, 当前: ${fishNum}次, 需要补齐: ${need}次`,
      type: "info",
    });

    if (need <= 0) {
      addLog({
        message: `当前进度已达标，无需补齐`,
        type: "success",
      });
      message.success("当前进度已达标，无需补齐");
      autoCloseLogs();
      return;
    }

    // 2. 执行钓鱼补齐
    addLog({
      message: `${tokenName} 开始执行钓鱼补齐...`,
      type: "info",
    });

    // 2.1 检查并使用免费次数
    let role = tokenStore.gameData?.roleInfo?.role;
    if (!role) {
      try {
        const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
        role = roleInfo?.role;
      } catch (e) {
        // ignore
      }
    }

    let freeUsed = 0;
    const lastFreeTime = Number(role?.statisticsTime?.["artifact:normal:lottery:time"] || 0);
    const isTodayFreeAvailable = !lastFreeTime || lastFreeTime < getTodayStartSec();

    if (isTodayFreeAvailable) {
      addLog({
        message: `${tokenName} 检测到今日免费钓鱼次数，开始消耗 3 次`,
        type: "info",
      });

      for (let i = 0; i < 3; i++) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "artifact_lottery",
            { lotteryNumber: 1, newFree: true, type: 1 },
            8000,
          );
          freeUsed++;
          addLog({
            message: `${tokenName} 免费钓鱼进度: ${freeUsed}/3`,
            type: "info",
          });
          await new Promise(r => setTimeout(r, 500));
        } catch (error) {
          addLog({
            message: `${tokenName} 免费钓鱼失败: ${error.message}`,
            type: "warning",
          });
          break;
        }
      }

      if (freeUsed > 0) {
        addLog({
          message: `${tokenName} 已通过免费次数完成 ${freeUsed} 次`,
          type: "success",
        });
      }
    }

    // 2.2 重新计算剩余需要补齐的次数
    const remainingAfterFree = Math.max(0, need - freeUsed);

    if (remainingAfterFree <= 0) {
      addLog({
        message: `✅ ${tokenName} 已通过免费次数完成当日目标`,
        type: "success",
      });
      message.success("已通过免费次数完成当日目标");
      autoCloseLogs();
      return;
    }

    addLog({
      message: `${tokenName} 开始付费钓鱼补齐：共需 ${remainingAfterFree} 次（每次最多10）`,
      type: "info",
    });

    // 2.3 批量钓鱼（每次10次）
    const batches = Math.floor(remainingAfterFree / 10);
    const remainder = remainingAfterFree % 10;
    let successCount = freeUsed; // 从免费次数开始计数

    for (let i = 0; i < batches; i++) {
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "artifact_lottery",
          { type: 1, lotteryNumber: 10, newFree: true },
          12000,
        );
        successCount += 10;
        addLog({
          message: `${tokenName} 钓鱼进度: ${successCount}/${need}`,
          type: "info",
        });
        // 延迟500ms
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        addLog({
          message: `${tokenName} 钓鱼失败: ${error.message}`,
          type: "warning",
        });
        break;
      }
    }

    // 2.4 剩余次数
    if (remainder > 0) {
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "artifact_lottery",
          { type: 1, lotteryNumber: remainder, newFree: true },
          12000,
        );
        successCount += remainder;
        addLog({
          message: `${tokenName} 钓鱼进度: ${successCount}/${need}`,
          type: "info",
        });
      } catch (error) {
        addLog({
          message: `${tokenName} 钓鱼失败: ${error.message}`,
          type: "warning",
        });
      }
    }

    addLog({
      message: `✅ ${tokenName} 月度钓鱼补齐完成，成功 ${successCount}/${need} 次`,
      type: "success",
    });
    message.success(`${tokenName} 月度钓鱼补齐完成！`);

    // 5秒后自动关闭日志显示
    autoCloseLogs();
  } catch (error) {
    console.error("月度钓鱼补齐失败:", error);
    addLog({
      message: `月度钓鱼补齐失败: ${error.message}`,
      type: "error",
    });
    message.error(`月度钓鱼补齐失败: ${error.message}`);
  }
};

// 购买怪异塔小鱼干
const buyWeirdTowerEnergy = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();

    // 检查当前能量
    if (weirdTowerData.value.energy >= 50) {
      addLog({
        message: `⚠️ ${props.token.name} 小鱼干已达上限 (50/100)，无需购买`,
        type: "warning",
      });
      message.warning(`${props.token.name} 小鱼干已达上限 (50/100)，无需购买`);
      return;
    }

    addLog({
      message: `开始为 ${props.token.name} 购买小鱼干...`,
      type: "info",
    });

    message.info(`开始为 ${props.token.name} 购买小鱼干...`);

    // 发送购买命令
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "evotower_buyenergy",
      { energy: 10 }, // 每次购买10个
      10000,
    );

    addLog({
      message: `✅ ${props.token.name} 成功购买10个小鱼干`,
      type: "success",
    });

    message.success(`${props.token.name} 成功购买10个小鱼干`);

    // 刷新怪异塔数据
    setTimeout(() => {
      refreshWeirdTowerData();
    }, 500);

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    addLog({
      message: `❌ 购买小鱼干失败: ${error.message}`,
      type: "error",
    });
    message.error(`购买小鱼干失败: ${error.message}`);
  }
};

// 执行怪异塔完整流程: 领取通行证 → 领取免费道具 → 使用道具
const executeWeirdTowerFullProcess = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  if (!tokenGameData.value?.evoTowerInfo?.evoTower) {
    message.warning("怪异塔数据未加载");
    return;
  }

  const tokenId = props.token.id;
  const tokenName = props.token.name;

  try {
    // 步骤1: 领取怪异塔通行证
    addLog({
      message: `🎫 ${tokenName} 开始领取怪异塔通行证...`,
      type: "info",
    });

    try {
      const passResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "activity_battlepassrewardclaim",
        { battlePassId: 1003 },
        10000,
      );

      if (passResult && !passResult.__error && !passResult.error) {
        addLog({
          message: `✅ ${tokenName} 怪异塔通行证领取成功`,
          type: "success",
        });
      } else {
        const errorMsg = passResult?.error || passResult?.message || "未知错误";
        const isAlreadyClaimed
          = errorMsg.includes("已领取")
            || errorMsg.includes("1100010")
            || errorMsg.includes("3500020");

        if (isAlreadyClaimed) {
          addLog({
            message: `ℹ️ ${tokenName} 怪异塔通行证已领取过`,
            type: "info",
          });
        } else {
          addLog({
            message: `⚠️ ${tokenName} 怪异塔通行证领取失败: ${errorMsg}`,
            type: "warning",
          });
        }
      }
    } catch (error) {
      const errorMsg = error.message || "";
      const isAlreadyClaimed
        = errorMsg.includes("已领取")
          || errorMsg.includes("1100010")
          || errorMsg.includes("3500020");

      if (!isAlreadyClaimed) {
        addLog({
          message: `⚠️ ${tokenName} 领取通行证异常: ${errorMsg}`,
          type: "warning",
        });
      } else {
        addLog({
          message: `ℹ️ ${tokenName} 通行证已领取过`,
          type: "info",
        });
      }
    }

    // 等待1秒
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 步骤2: 领取免费道具
    addLog({
      message: `🎁 ${tokenName} 开始领取怪异塔免费道具...`,
      type: "info",
    });

    try {
      const freeEnergyResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "mergebox_getinfo",
        { actType: 1 },
        5000,
      );

      if (freeEnergyResult && freeEnergyResult.mergeBox && freeEnergyResult.mergeBox.freeEnergy > 0) {
        const freeEnergyCount = freeEnergyResult.mergeBox.freeEnergy;
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "mergebox_claimfreeenergy",
          { actType: 1 },
          5000,
        );
        addLog({
          message: `✅ ${tokenName} 成功领取免费道具${freeEnergyCount}个`,
          type: "success",
        });
      } else {
        addLog({
          message: `ℹ️ ${tokenName} 暂无免费道具可领取`,
          type: "info",
        });
      }
    } catch (error) {
      addLog({
        message: `⚠️ ${tokenName} 领取免费道具异常: ${error.message}`,
        type: "warning",
      });
    }

    // 等待1秒
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 步骤3: 使用道具
    addLog({
      message: `🔑 ${tokenName} 开始使用道具...`,
      type: "info",
    });

    try {
      // 获取活动信息
      const infoRes = await tokenStore.sendMessageWithPromise(
        tokenId,
        "mergebox_getinfo",
        { actType: 1 },
        5000,
      );

      // 获取怪异塔信息以读取剩余道具数量
      const towerInfoRes = await tokenStore.sendMessageWithPromise(
        tokenId,
        "evotower_getinfo",
        {},
        5000,
      );

      if (!infoRes || !infoRes.mergeBox) {
        throw new Error("获取活动信息失败");
      }

      let costTotalCnt = infoRes.mergeBox.costTotalCnt || 0;
      let lotteryLeftCnt = towerInfoRes?.evoTower?.lotteryLeftCnt || 0;

      if (lotteryLeftCnt <= 0) {
        addLog({
          message: `ℹ️ ${tokenName} 没有剩余道具可使用`,
          type: "info",
        });
      } else {
        addLog({
          message: `🚀 ${tokenName} 开始使用道具，剩余: ${lotteryLeftCnt}，已用: ${costTotalCnt}`,
          type: "info",
        });

        let processedCount = 0;

        while (lotteryLeftCnt > 0) {
          let pos = {};
          if (costTotalCnt < 2) {
            pos = { gridX: 4, gridY: 5 };
          } else if (costTotalCnt < 102) {
            pos = { gridX: 7, gridY: 3 };
          } else {
            pos = { gridX: 6, gridY: 3 };
          }

          // 使用道具
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "mergebox_openbox",
            {
              actType: 1,
              pos,
            },
            5000,
          );

          costTotalCnt++;
          lotteryLeftCnt--;
          processedCount++;

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 领取累计奖励
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "mergebox_claimcostprogress",
          { actType: 1 },
          5000,
        ).catch(() => {});

        addLog({
          message: `✅ ${tokenName} 已使用道具 ${processedCount} 次`,
          type: "success",
        });
      }
    } catch (error) {
      addLog({
        message: `❌ ${tokenName} 使用道具失败: ${error.message}`,
        type: "error",
      });
    }

    // 等待1秒后刷新数据
    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog({
      message: `🔄 ${tokenName} 怪异塔完整流程执行完毕，刷新数据...`,
      type: "info",
    });

    // 刷新怪异塔数据
    await refreshWeirdTowerData();

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    addLog({
      message: `❌ ${tokenName} 怪异塔完整流程执行失败: ${error.message}`,
      type: "error",
    });
  }
};

// 一键爬怪异塔
const climbWeirdTower = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    const tokenId = props.token.id;
    const tokenStore = useTokenStore();

    addLog({
      message: `开始为 ${props.token.name} 爬怪异塔...`,
      type: "info",
    });

    message.info(`开始为 ${props.token.name} 爬怪异塔...`);

    // 1. 获取怪异塔信息
    addLog({
      message: `正在获取怪异塔信息...`,
      type: "info",
    });

    const evotowerinfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "evotower_getinfo",
      {},
      10000,
    );

    const currentEnergy = evotowerinfo?.evoTower?.energy || 0;
    const floor = evotowerinfo?.evoTower?.floor || 0;

    addLog({
      message: `📊 ${props.token.name} 当前层数: ${floor}, 能量: ${currentEnergy}`,
      type: "info",
    });

    // 2. 检查能量
    if (currentEnergy <= 0) {
      addLog({
        message: `❌ ${props.token.name} 能量不足，无法爬塔`,
        type: "warning",
      });
      message.warning(`${props.token.name} 能量不足，无法爬塔`);
      return;
    }

    // 3. 保存原始阵容
    addLog({
      message: `正在获取阵容信息...`,
      type: "info",
    });

    const teamInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "presetteam_getinfo",
      {},
      10000,
    );

    const originalFormation = teamInfo?.presetTeamInfo?.useTeamId;

    addLog({
      message: `📋 ${props.token.name} 原始阵容: ${originalFormation}`,
      type: "info",
    });

    // 4. 领取宝箱奖励
    try {
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "evotower_claimreward",
        {},
        10000,
      );
      addLog({
        message: `✅ ${props.token.name} 成功领取宝箱奖励`,
        type: "success",
      });
    } catch (err) {
      const claimErrorMsg = err.message || "";
      if (claimErrorMsg.includes("12200030") || claimErrorMsg.includes("1500030")) {
        addLog({
          message: `ℹ️ ${props.token.name} 暂无可领取的宝箱奖励`,
          type: "info",
        });
      } else {
        addLog({
          message: `⚠️ ${props.token.name} 领取宝箱奖励失败: ${claimErrorMsg.substring(0, 80)}`,
          type: "warning",
        });
      }
    }

    // 5. 开始爬塔
    let count = 0;
    let currentEnergyLeft = currentEnergy;
    const MAX_CLIMB = 50; // 默认最大爬塔次数

    addLog({
      message: `🚀 ${props.token.name} 开始爬怪异塔，能量: ${currentEnergyLeft}...`,
      type: "info",
    });

    while (currentEnergyLeft > 0 && count < MAX_CLIMB) {
      try {
        // 领取通关奖励
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "evotower_claimreward",
            {},
            5000,
          );
        } catch (e) {
          // 忽略错误
        }

        // 准备战斗
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "evotower_readyfight",
            {},
            10000,
          );
        } catch (readyErr) {
          const readyErrorMsg = readyErr.message || "";

          // 1500010：已通关
          if (readyErrorMsg.includes("1500010")) {
            addLog({
              message: `✅ ${props.token.name} 怪异塔已全部通关`,
              type: "info",
            });
            break;
          }

          // 200020：状态异常
          if (readyErrorMsg.includes("200020")) {
            addLog({
              message: `⚠️ ${props.token.name} 怪异塔状态异常，刷新后继续`,
              type: "warning",
            });
            const refreshInfo = await tokenStore.sendMessageWithPromise(
              tokenId,
              "evotower_getinfo",
              {},
              5000,
            );
            currentEnergyLeft = refreshInfo?.evoTower?.energy || 0;
            continue;
          }

          // 7800008：战斗准备失败
          if (readyErrorMsg.includes("7800008")) {
            addLog({
              message: `⚠️ ${props.token.name} 准备战斗失败，刷新状态后重试`,
              type: "warning",
            });
            const refreshInfo = await tokenStore.sendMessageWithPromise(
              tokenId,
              "evotower_getinfo",
              {},
              5000,
            );
            currentEnergyLeft = refreshInfo?.evoTower?.energy || 0;
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
        }

        // 战斗
        const fightResult = await tokenStore.sendMessageWithPromise(
          tokenId,
          "evotower_fight",
          { battleNum: 1, winNum: 1 },
          15000,
        );

        count++;

        addLog({
          message: `⚔️ ${props.token.name} 爬怪异塔第 ${count} 次 ${fightResult?.winList?.[0] ? "✅胜利" : "❌失败"}`,
          type: fightResult?.winList?.[0] ? "success" : "warning",
        });

        // 延迟1秒
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 获取最新信息
        const newInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "evotower_getinfo",
          {},
          5000,
        );
        currentEnergyLeft = newInfo?.evoTower?.energy || 0;
      } catch (error) {
        addLog({
          message: `❌ ${props.token.name} 爬塔失败: ${error.message?.substring(0, 100) || "未知错误"}`,
          type: "error",
        });
        break;
      }
    }

    // 6. 恢复原始阵容
    if (originalFormation) {
      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "presetteam_saveteam",
          { teamId: originalFormation },
          10000,
        );
        addLog({
          message: `✅ ${props.token.name} 已恢复原始阵容: ${originalFormation}`,
          type: "info",
        });
      } catch (e) {
        addLog({
          message: `⚠️ ${props.token.name} 恢复阵容失败: ${e.message?.substring(0, 80)}`,
          type: "warning",
        });
      }
    }

    // 7. 显示结果
    addLog({
      message: `=== ${props.token.name} 爬怪异塔结束，共 ${count} 次 ===`,
      type: "success",
    });

    message.success(`${props.token.name} 爬怪异塔结束，共 ${count} 次`);

    // 刷新怪异塔数据
    setTimeout(() => {
      refreshWeirdTowerData();
    }, 1000);

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    addLog({
      message: `❌ 爬怪异塔失败: ${error.message}`,
      type: "error",
    });
    message.error(`爬怪异塔失败: ${error.message}`);
  }
};

// 重置盐罐
const resetSaltJar = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `开始重置盐罐...`,
      type: "info",
    });

    // 发送停止盐罐的游戏消息
    await tokenStore.sendGameMessage(props.token.id, "bottlehelper_stop", {}, { usePromise: true, timeout: 10000 });

    // 短暂延迟后发送启动盐罐的游戏消息
    await new Promise((resolve) => setTimeout(resolve, 500));
    await tokenStore.sendGameMessage(props.token.id, "bottlehelper_start", {}, { usePromise: true, timeout: 10000 });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `盐罐重置成功`,
      type: "success",
    });

    // 刷新角色信息以更新盐罐状态
    // 延迟1.5秒后刷新，确保服务器已处理完成
    setTimeout(async () => {
      try {
        await tokenStore.sendGetRoleInfo(props.token.id);

        // 再等待0.5秒确保数据已同步到tokenGameData
        setTimeout(() => {
          syncGameData();
        }, 500);
      } catch (error) {
        console.error("刷新角色信息失败:", error);
      }
    }, 1500);

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    console.error("重置盐罐失败:", error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `重置盐罐失败: ${error.message}`,
      type: "error",
    });
  }
};

// 一键答题功能
const startOneClickAnswer = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  if (studyInfo.value?.isCompleted && studyInfo.value?.thisWeek) {
    message.success(`${props.token.name} 本周已完成答题任务`);
    return;
  }

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `开始一键答题...`,
      type: "info",
    });

    // 预加载题库
    await preloadQuestions();
    const questionCount = await getQuestionCount();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `题库加载完成，包含 ${questionCount} 道题目`,
      type: "info",
    });

    // 更新答题状态
    studyStatus.value = {
      isAnswering: true,
      questionCount: 0,
      answeredCount: 0,
      status: "answering",
      isCompleted: false,
      maxCorrectNum: studyInfo.value?.maxCorrectNum || 0,
      thisWeek: studyInfo.value?.thisWeek || false,
      timestamp: Date.now(),
    };

    // 发送开始答题命令（使用Promise版确保能获取响应）
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送开始答题命令...`,
      type: "info",
    });

    try {
      await tokenStore.sendMessageWithPromise(props.token.id, "study_startgame", {}, 10000);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `已发送开始答题命令，等待响应...`,
        type: "info",
      });
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `发送答题命令失败: ${error.message}`,
        type: "error",
      });
      throw error;
    }

    // 设置超时处理
    const timeoutId = setTimeout(() => {
      if (studyStatus.value.isAnswering) {
        studyStatus.value = {
          isAnswering: false,
          questionCount: 0,
          answeredCount: 0,
          status: "",
          isCompleted: false,
          maxCorrectNum: studyInfo.value?.maxCorrectNum || 0,
          thisWeek: studyInfo.value?.thisWeek || false,
          timestamp: null,
        };
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `答题超时，已重置状态`,
          type: "warning",
        });
      }
    }, 40000);

    // 监听答题完成状态
    const unwatch = watch(() => studyStatus.value.status, (newStatus) => {
      if (newStatus === "completed") {
        clearTimeout(timeoutId);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `一键答题完成!`,
          type: "success",
        });
        unwatch();

        // ✅ 同步更新本地答题状态,确保账号卡片显示正确
        // 等待服务器数据刷新后再更新本地状态
        setTimeout(async () => {
          try {
            // 刷新角色信息获取最新服务器数据
            await tokenStore.sendGetRoleInfo(props.token.id);

            // 等待数据更新
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 从服务器数据更新本地 studyStatus
            const serverStudyInfo = studyInfo.value;
            if (serverStudyInfo) {
              studyStatus.value = {
                isAnswering: false,
                questionCount: studyStatus.value.questionCount,
                answeredCount: studyStatus.value.answeredCount,
                status: "completed",
                isCompleted: true,
                maxCorrectNum: serverStudyInfo.maxCorrectNum || 10,
                thisWeek: serverStudyInfo.thisWeek || true,
                timestamp: Date.now(),
              };

              addLog({
                time: new Date().toLocaleTimeString(),
                message: `答题状态已同步: ${studyStatus.value.maxCorrectNum}/10`,
                type: "success",
              });
            }
          } catch (error) {
            console.error("同步答题状态失败:", error);
            // 即使同步失败,也标记为完成
            studyStatus.value.isCompleted = true;
            studyStatus.value.maxCorrectNum = Math.max(studyStatus.value.maxCorrectNum, 10);
            studyStatus.value.thisWeek = true;
          }
        }, 1000);

        // 5秒后自动关闭日志显示（不清空日志，只隐藏）
        autoCloseLogs();
      }
    });
  } catch (error) {
    console.error("一键答题失败:", error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `一键答题失败: ${error.message}`,
      type: "error",
    });
    message.error(`一键答题失败: ${error.message}`);
  }
};

// 处理车辆点击事件（智能发车/领取奖励）
const handleCarClick = async (car, carNumber) => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    if (car.isClaimable) {
      // 可收取状态，领取奖励
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `开始领取车辆${carNumber}的奖励...`,
        type: "info",
      });

      await tokenStore.sendGameMessage(props.token.id, "car_claim", { carId: String(car.id) }, { usePromise: true, timeout: 10000 });

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `车辆${carNumber}奖励领取成功`,
        type: "success",
      });

      // 领取奖励后立即刷新赛车状态
      tokenStore.refreshGameData(props.token.id);

      // 5秒后自动关闭日志显示（不清空日志，只隐藏）
      autoCloseLogs();
    } else if (car.isAvailable) {
      // 可用状态，智能发车
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `开始车辆${carNumber}智能发车...`,
        type: "info",
      });

      // 使用与批量日常相同的智能发车逻辑
      // 从localStorage读取用户的自定义设置
      let batchSettings;
      try {
        const settingsRaw = localStorage.getItem(`daily-settings:${props.token.id}`);
        if (settingsRaw) {
          const savedSettings = JSON.parse(settingsRaw);
          // 使用保存的设置,如果不存在则使用默认值
          batchSettings = {
            carMinColor: savedSettings.carMinColor ?? 3,
            useGoldRefreshFallback: savedSettings.useGoldRefreshFallback ?? false,
            smartDepartureEnabled: savedSettings.smartDepartureEnabled ?? true,
            smartDepartureGoldThreshold: savedSettings.smartDepartureGoldThreshold ?? 0,
            smartDepartureRecruitThreshold: savedSettings.smartDepartureRecruitThreshold ?? 0,
            smartDepartureJadeThreshold: savedSettings.smartDepartureJadeThreshold ?? 0,
            smartDepartureTicketThreshold: savedSettings.smartDepartureTicketThreshold ?? 0,
          };
        } else {
          // 没有保存的设置,使用默认值
          batchSettings = {
            carMinColor: 3,
            useGoldRefreshFallback: false,
            smartDepartureEnabled: true,
            smartDepartureGoldThreshold: 0,
            smartDepartureRecruitThreshold: 0,
            smartDepartureJadeThreshold: 0,
            smartDepartureTicketThreshold: 0,
          };
        }
      } catch (error) {
        console.error("读取账号设置失败,使用默认值:", error);
        // 出错时使用默认值
        batchSettings = {
          carMinColor: 3,
          useGoldRefreshFallback: false,
          smartDepartureEnabled: true,
          smartDepartureGoldThreshold: 0,
          smartDepartureRecruitThreshold: 0,
          smartDepartureJadeThreshold: 0,
          smartDepartureTicketThreshold: 0,
        };
      }

      // 创建车辆管理器
      const carManager = createCarManager({
        tokenStore,
        connectionManager: {
          ensureConnection: async () => {}, // 账号卡片已连接，不需要重新连接
          closeConnection: () => {}, // 账号卡片不需要关闭连接
        },
        batchSettings,
        addLog,
      });

      // 获取车辆列表
      const carInfoRes = await tokenStore.sendGameMessage(props.token.id, "car_getrolecar", {}, { usePromise: true, timeout: 10000 });
      const carList = normalizeCars(carInfoRes?.body ?? carInfoRes);

      // 找到当前车辆
      const currentCar = carList.find((c) => c.id === car.id);
      if (!currentCar) {
        throw new Error("车辆信息获取失败");
      }

      // 调用智能发车
      await carManager.smartSendCar(
        props.token.id,
        props.token,
        [props.token],
        { [props.token.id]: "running" },
        { value: false },
      );

      // 发车后立即刷新赛车状态
      tokenStore.refreshGameData(props.token.id);

      // 5秒后自动关闭日志显示（不清空日志，只隐藏）
      autoCloseLogs();
    }
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `车辆${carNumber}操作失败: ${error.message}`,
      type: "error",
    });
  }
};

// 处理挂机操作 - 使用与批量领取挂机相同的逻辑
const handleHangUp = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    // ✅ 导入批量挂机任务函数
    const { createTasksHangUp } = await import("@/utils/batch/tasksHangUp.js");

    // ✅ 读取全局batchSettings配置
    let batchSettings;
    try {
      const batchSettingsRaw = localStorage.getItem("batchSettings");
      if (batchSettingsRaw) {
        batchSettings = JSON.parse(batchSettingsRaw);
      } else {
        batchSettings = {
          hangUpMinTime: 9,
          hangUpTimeControlEnabled: false,
          defaultRetryCount: 2,
          retryDelay: 60000,
        };
      }
    } catch (error) {
      console.error("读取batchSettings失败，使用默认值:", error);
      batchSettings = {
        hangUpMinTime: 9,
        hangUpTimeControlEnabled: false,
        defaultRetryCount: 2,
        retryDelay: 60000,
      };
    }

    // ✅ 创建任务执行器（单token模式）
    const tokenId = props.token.id;
    const tokenName = props.token.name;

    const deps = {
      selectedTokens: { value: [tokenId] },
      tokens: { value: [props.token] },
      tokenStatus: { value: { [tokenId]: "waiting" } },
      isRunning: { value: true },
      shouldStop: { value: false },
      ensureConnection: async () => {}, // 账号卡片已连接，不需要重新连接
      releaseConnectionSlot: () => {},
      connectionQueue: { active: 0 },
      batchSettings,
      tokenStore,
      addLog,
      message,
      currentRunningTokenId: { value: null },
    };

    const { claimHangUpRewards } = createTasksHangUp(deps);

    // ✅ 执行领取挂机（使用与批量领取相同的逻辑）
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始领取挂机: ${tokenName} ===`,
      type: "info",
    });

    await claimHangUpRewards();

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ ${tokenName} 领取挂机完成`,
      type: "success",
    });

    message.success("领取挂机完成");

    // 5秒后自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  } catch (error) {
    console.error("领取挂机失败:", error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `领取挂机失败: ${error.message}`,
      type: "error",
    });
    message.error(`领取挂机失败: ${error.message}`);
  }
};

// 刷新换皮闯关信息
const refreshTowerInfo = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    towerInfo.value.isRefreshing = true;

    // 根据今天日期推导 actId：yymmdd1
    const now = new Date();
    const yy = String(now.getFullYear() % 100).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const actId = Number(`${yy}${mm}${dd}1`);

    const res = await tokenStore.sendMessageWithPromise(
      props.token.id,
      "towers_getinfo",
      { actId },
      5000,
    );

    if (res) {
      // Handle nested data structure if necessary
      const data = res.actId ? res : (res.towerData && res.towerData.actId ? res.towerData : res);

      towerInfo.value.actId = data.actId;
      towerInfo.value.levelRewardMap = data.levelRewardMap || {};
      towerInfo.value.dailyFightNum = data.todayUseTickCnt || 0;
      towerInfo.value.isActivityValid = isActivityValid.value;
      towerInfo.value.finishedCount = Object.keys(towerInfo.value.levelRewardMap).filter((key) => {
        const numKey = Number(key);
        return numKey % 1000 === 8; // 第8层标记通关
      }).length;

      // 如果活动已结束，不显示数据
      if (!isActivityValid.value) {
        towerInfo.value.actId = null;
        towerInfo.value.levelRewardMap = {};
        towerInfo.value.dailyFightNum = 0;
        towerInfo.value.finishedCount = 0;
      }
    }
  } catch (error) {
    const errorMsg = error.message || "";

    // 错误码7900021表示活动未开放或不存在，这不是错误
    if (errorMsg.includes("7900021")) {
      // 活动未开放，清空数据
      towerInfo.value.actId = null;
      towerInfo.value.levelRewardMap = {};
      towerInfo.value.dailyFightNum = 0;
      towerInfo.value.finishedCount = 0;
      towerInfo.value.isActivityValid = false;
    } else {
      console.error("刷新换皮闯关信息失败:", error);
    }
  } finally {
    towerInfo.value.isRefreshing = false;
  }
};

// 切换爬塔展开状态
const toggleClimbTower = () => {
  towerData.value.isExpanded = !towerData.value.isExpanded;
  emit("update:isClimbTowerExpanded", towerData.value.isExpanded);
};

// 切换怪异塔展开状态
const toggleWeirdTower = () => {
  weirdTowerData.value.isExpanded = !weirdTowerData.value.isExpanded;
  emit("update:isWeirdTowerExpanded", weirdTowerData.value.isExpanded);
};

// 切换赛车展开状态
const toggleCar = () => {
  isCarExpanded.value = !isCarExpanded.value;
  emit("update:isCarExpanded", isCarExpanded.value);
};

// 切换换皮闯关展开状态
const toggleTower = () => {
  isTowerExpanded.value = !isTowerExpanded.value;
  emit("update:isTowerExpanded", isTowerExpanded.value);
};

// 刷新爬塔数据
const refreshTowerData = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  try {
    towerData.value.isRefreshing = true;

    const tokenId = props.token.id;
    // 发送获取角色信息的请求来刷新爬塔数据
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );
    // 同时发送获取塔信息的请求
    tokenStore.sendMessage(tokenId, "tower_getinfo");

    // 数据会自动通过syncGameData同步
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "爬塔数据已刷新",
      type: "success",
    });
  } catch (error) {
    console.error("刷新爬塔数据失败:", error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `刷新爬塔数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    towerData.value.isRefreshing = false;
  }
};

// 刷新怪异塔数据
const refreshWeirdTowerData = async () => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  // 判断怪异塔活动是否开放（黑市周 + 时间限制）
  const isWeirdTowerOpen = () => {
    const now = new Date();
    const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
    const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
    const cycleDuration = 3 * weekDuration; // 三周期毫秒数

    const elapsed = now.getTime() - start.getTime();
    if (elapsed < 0)
      return false; // 活动开始前

    const cyclePosition = elapsed % cycleDuration;
    const isBlackMarketWeek = cyclePosition < weekDuration; // 第一周是黑市周

    if (!isBlackMarketWeek)
      return false;

    // 检查时间限制：周五11:00-12:00不开放
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    if (day === 5) {
      // 周五：11:00前 或 12:00后开放
      const morningEnd = 11 * 60; // 11:00 = 660分钟
      const afternoonStart = 12 * 60; // 12:00 = 720分钟
      return currentTime < morningEnd || currentTime >= afternoonStart;
    }

    // 其他时间全天开放
    return true;
  };

  // 如果活动未开放，不获取数据
  if (!isWeirdTowerOpen()) {
    return;
  }

  try {
    weirdTowerData.value.isRefreshing = true;

    const tokenId = props.token.id;
    // 发送获取怪异塔信息的请求
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "evotower_getinfo",
      {},
      5000,
    );

    // 成功刷新，不显示日志

    // 2秒后清空日志
    setTimeout(() => {
      taskLogs.value = [];
    }, 2000);
  } catch (error) {
    const errorMsg = error.message || "";

    // 错误码200160表示模块未开启，这不是错误
    if (errorMsg.includes("200160")) {
      // 怪异塔模块未开启，静默处理
      weirdTowerData.value.floor = 0;
      weirdTowerData.value.energy = 0;
      weirdTowerData.value.maxEnergy = 0;
      weirdTowerData.value.lotteryLeftCnt = 0;
    } else if (errorMsg.includes("2100010")) {
      // 不在开放时间内，静默处理
      console.log("[怪异塔] 不在开放时间内，跳过刷新");
    } else {
      console.error("刷新怪异塔数据失败:", error);
      // 不显示错误日志，静默处理
    }
  } finally {
    weirdTowerData.value.isRefreshing = false;
  }
};

// 挑战换皮闯关 BOSS
const challengeTower = async (type) => {
  if (!isConnected.value && !isConnecting.value) {
    message.warning("请先连接Token");
    return;
  }

  if (!isTowerOpen(type) || isTowerCleared(type)) {
    return;
  }

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `开始挑战 BOSS ${type}...`,
      type: "info",
    });

    let needStart = true;
    let loop = true;
    let failCount = 0;

    while (loop) {
      if (needStart) {
        await tokenStore.sendMessageWithPromise(props.token.id, "towers_start", { towerType: type }, 5000);
      }

      const fightRes = await tokenStore.sendMessageWithPromise(props.token.id, "towers_fight", { towerType: type }, 5000);
      const battleData = fightRes?.battleData;
      const curHP = battleData?.result?.accept?.ext?.curHP;

      if (curHP === 0) {
        // 挑战成功，不需要重新 start，直接继续 fight
        needStart = false;
        failCount = 0;

        const currentLevel = getTowerLevel(type);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `BOSS ${type} 第 ${currentLevel} 层挑战成功`,
          type: "success",
        });

        // 检查是否通关（需要更新 levelRewardMap）
        await refreshTowerInfo();
        if (isTowerCleared(type)) {
          loop = false;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `BOSS ${type} 已全部通关`,
            type: "success",
          });
        } else {
          // 等待一下避免过快请求
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        const currentLevel = getTowerLevel(type);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `BOSS ${type} 第 ${currentLevel} 层挑战失败`,
          type: "warning",
        });
        // 挑战失败，需要重新 start
        needStart = true;
        failCount++;

        if (failCount >= 3) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `BOSS ${type} 第 ${currentLevel} 层连续失败 3 次，停止挑战`,
            type: "error",
          });
          loop = false;
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `挑战 BOSS ${type} 失败: ${error.message}`,
      type: "error",
    });
  } finally {
    // 挑战完成后5秒自动关闭日志显示（不清空日志，只隐藏）
    autoCloseLogs();
  }
};
</script>

<style scoped lang="scss">
.token-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  container-type: inline-size;
  border: 1px solid rgba(0, 0, 0, 0.06);

  // 防止拖动时选择文本
  user-select: none;
  -webkit-user-select: none;

  // 拖动中的样式
  &.is-dragging {
    opacity: 0.5;
    border: 2px dashed #1890ff;
    transform: scale(0.98);
  }

  // 拖放目标高亮样式
  &.is-drop-target {
    border: 2px solid #52c41a;
    box-shadow: 0 0 12px rgba(82, 196, 26, 0.4);
    transform: scale(1.02);

    &::before {
      opacity: 1;
      background: linear-gradient(90deg, #52c41a 0%, #389e0d 100%);
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.12);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }

  &.is-selected {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-color: rgba(33, 150, 243, 0.3);

    &::before {
      opacity: 1;
      background: linear-gradient(90deg, #2196f3 0%, #1976d2 100%);
    }
  }

  &.is-connected {
    &::before {
      opacity: 1;
      background: linear-gradient(90deg, #4caf50 0%, #388e3c 100%);
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;

    // 拖动手柄样式
    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      padding: 4px 8px;
      border-radius: 4px;
      color: #94a3b8;
      transition: all 0.2s ease;
      user-select: none;
      -webkit-user-select: none;

      &:hover {
        background: rgba(148, 163, 184, 0.15);
        color: #64748b;
      }

      &:active {
        cursor: grabbing;
      }

      // 拖动时的样式
      .is-dragging & {
        opacity: 0.5;
        cursor: grabbing;
      }

      svg {
        display: block;
        pointer-events: none;
      }
    }

    .token-name {
      flex-basis: 100%;
      font-weight: 600;
      font-size: clamp(8px, 7cqi, 15px);
      color: #000000;
      word-break: break-all;
      line-height: 1.3;
      letter-spacing: 0.3px;
      padding-left: 2px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 4px;

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 4px;
      transition: all 0.3s ease;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);

      &.status-connected {
        background: #4caf50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2), 0 0 8px rgba(76, 175, 80, 0.4);
      }

      &.status-disconnected {
        background: #9e9e9e;
      }

      &.status-connecting {
        background: #ff9800;
        animation: pulse 1.5s ease-in-out infinite;
      }

      &.status-error {
        background: #f44336;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
  }

  // 连接中旋转动画
  .connecting-spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
    font-size: 14px;
    font-weight: bold;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}

.status-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;

  .status-tag {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    min-width: fit-content;
    flex-shrink: 1;
    border-radius: 14px;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1;
    transition: all 0.3s ease;
    border: 1px solid transparent;
    overflow: hidden;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    // 默认底色：统一的浅灰蓝色
    background: rgba(241, 245, 249, 0.8);
    color: #000000;
    border-color: rgba(226, 232, 240, 0.6);

    // 连接成功时的底色变化
    .token-card.is-connected & {
      background: rgba(220, 252, 231, 0.6);
      color: #059669;
      border-color: rgba(167, 243, 208, 0.4);
    }

    &.salt-tag {
      &.is-active {
        background: rgba(220, 252, 231, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(167, 243, 208, 0.6) !important;
      }
    }

    &.hangup-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      &.is-active {
        background: rgba(220, 252, 231, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(167, 243, 208, 0.6) !important;
      }

      .hangup-elapsed {
        font-weight: 600;
      }

      .hangup-separator {
        margin: 0 2px;
        opacity: 0.5;
      }

      .hangup-remaining {
        opacity: 0.7;
        font-size: 10px;
      }
    }

    &.study-tag {
      &.is-completed {
        background: rgba(220, 252, 231, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(167, 243, 208, 0.6) !important;
      }

      &.is-answering {
        background: rgba(254, 243, 199, 0.8) !important;
        color: #b45309 !important;
        border-color: rgba(253, 230, 138, 0.6) !important;
        animation: pulse-glow 1.5s infinite;
      }
    }

    &.refresh-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      min-width: 80px;
      justify-content: center;

      &.is-refreshing {
        background: rgba(219, 234, 254, 0.8) !important;
        color: #1d4ed8 !important;
        border-color: rgba(191, 219, 254, 0.6) !important;
        animation: pulse-glow 1.5s infinite;
      }
    }

    &.legacy-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      &.is-available {
        background: rgba(220, 252, 231, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(167, 243, 208, 0.6) !important;
        animation: pulse-glow 1.5s infinite;
      }
    }

    &.star-challenge-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      font-weight: 600;

      // 连接成功且0星时标记为黄色
      .token-card.is-connected & {
        &.is-zero-stars {
          background: rgba(254, 243, 199, 0.8) !important;
          color: #b45309 !important;
          border-color: rgba(253, 230, 138, 0.6) !important;
          animation: pulse-glow 2s infinite;
        }
      }

      // 挑战中状态
      &.is-challenging {
        background: rgba(191, 219, 254, 0.8) !important;
        color: #1d4ed8 !important;
        border-color: rgba(147, 197, 253, 0.6) !important;
        animation: pulse-glow 1.5s infinite;
      }
    }

    &.merit-book-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      font-weight: 600;
      background: rgba(253, 230, 138, 0.6) !important;
      color: #92400e !important;
      border-color: rgba(252, 211, 77, 0.5) !important;

      // 满120星时显示金色
      &.merit-full {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.8), rgba(245, 158, 11, 0.8)) !important;
        color: #78350f !important;
        border-color: rgba(245, 158, 11, 0.6) !important;
        animation: pulse-glow 2s infinite;
      }
    }

    &.nightmare-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      font-weight: 600;

      // 通关8关：绿色
      &.nightmare-cleared {
        background: rgba(134, 239, 172, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(110, 231, 183, 0.6) !important;
      }

      // 未通关8关：橙色
      &.nightmare-uncleared {
        background: rgba(254, 215, 170, 0.8) !important;
        color: #9a3412 !important;
        border-color: rgba(253, 186, 116, 0.6) !important;
      }

      // 本周未通关：灰色
      &.nightmare-none {
        background: rgba(203, 213, 225, 0.5) !important;
        color: #64748b !important;
        border-color: rgba(203, 213, 225, 0.4) !important;
      }
    }

    &.arena-rank-tag {
      .tag-icon-img {
        width: 14px;
        height: 14px;
        object-fit: contain;
        margin-right: 3px;
      }

      font-weight: 600;

      // 有排名时显示绿色
      &.has-rank {
        background: rgba(134, 239, 172, 0.8) !important;
        color: #059669 !important;
        border-color: rgba(110, 231, 183, 0.6) !important;
      }

      // 战斗中显示橙色
      &.is-fighting {
        background: rgba(254, 215, 170, 0.8) !important;
        color: #c2410c !important;
        border-color: rgba(253, 186, 116, 0.6) !important;
        animation: pulse-glow 1s infinite;
      }
    }

    .tag-icon {
      font-size: 13px;
    }

    .tag-icon-img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }

    .refresh-icon-img {
      width: 12px;
      height: 12px;
      object-fit: contain;
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: rotate(180deg);
      }
    }
  }
}

/* 模块Grid容器 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 6px;
}

/* 换皮闯关状态容器样式 */
.tower-status-container {
  padding: 5px;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  // 默认底色：统一的浅灰蓝色
  background: rgba(241, 245, 249, 0.6);
  border-color: rgba(226, 232, 240, 0.4);

  // 连接成功时的底色变化
  .token-card.is-connected & {
    background: rgba(220, 252, 231, 0.4);
    border-color: rgba(167, 243, 208, 0.3);
  }
}

.tower-status-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 9px;
  color: #000000;
  cursor: pointer;
  transition: color 0.3s ease;

  .token-card.is-connected & {
    color: #000000;
  }

  .tag-icon {
    margin-right: 3px;
    font-size: 11px;
  }

  .tag-icon-img {
    width: 14px;
    height: 14px;
    object-fit: contain;
    margin-right: 3px;
  }

  .tag-text {
    flex: 1;
  }

  .expand-icon {
    font-size: 9px;
    margin-right: 6px;
    color: #000000;
    transition: transform 0.2s ease;
  }

  &:hover .expand-icon {
    color: #000000;
  }

  .refresh-icon {
    font-size: 11px;
    color: #000000;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: #000000;
      transform: rotate(180deg);
    }
  }

  .refresh-icon-img {
    width: 11px;
    height: 11px;
    object-fit: contain;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

.tower-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 2px;
  margin-bottom: 3px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tower-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 2px 3px 2px;
  border-radius: 4px;
  background-color: #ffffff;
  transition: all 0.2s ease;
  min-height: 30px;
  justify-content: center;
}

.tower-item:hover {
  background-color: #f1f5f9;
}

.tower-item.tower-active {
  background: #eff6ff;
}

.tower-item.tower-cleared {
  background: #d1fae5;
}

.tower-item.tower-locked {
  background: #f1f5f9;
  opacity: 0.5;
}

.tower-number {
  font-size: 8px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0px;
  line-height: 1;
}

.tower-level {
  font-size: 6px;
  color: #000000;
  margin-bottom: 1px;
  font-weight: 500;
}

.tower-status {
  display: flex;
  justify-content: center;
}

.tower-status .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.tower-status .status-dot.active {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}

.tower-status .status-dot.cleared {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.tower-status .status-dot.locked {
  background: #94a3b8;
}

/* 爬塔状态容器样式 */
.climb-tower-container {
  padding: 6px;
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  // 默认底色：统一的浅灰蓝色
  background: rgba(241, 245, 249, 0.6);
  border-color: rgba(226, 232, 240, 0.4);

  // 连接成功时的底色变化
  .token-card.is-connected & {
    background: rgba(220, 252, 231, 0.4);
    border-color: rgba(167, 243, 208, 0.3);
  }
}

.climb-tower-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 10px;
  color: #000000;
  cursor: pointer;
  transition: color 0.3s ease;

  .token-card.is-connected & {
    color: #000000;
  }

  .tag-icon {
    margin-right: 3px;
    font-size: 11px;
  }

  .tag-icon-img {
    width: 14px;
    height: 14px;
    margin-right: 3px;
  }

  .tag-text {
    flex: 1;
  }

  .expand-icon {
    font-size: 9px;
    margin-right: 6px;
    color: #000000;
    transition: transform 0.2s ease;
  }

  &:hover .expand-icon {
    color: #000000;
  }

  .refresh-icon {
    font-size: 11px;
    color: #000000;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: #000000;
      transform: rotate(180deg);
    }
  }

  .refresh-icon-img {
    width: 11px;
    height: 11px;
    object-fit: contain;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

.climb-tower-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.climb-tower-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 3px;
  border-radius: 5px;
  background-color: #ffffff;
  min-height: 38px;

  &.energy-item {
    min-height: 42px;
  }

  .item-label {
    font-size: 8px;
    color: #000000;
    margin-bottom: 3px;
  }

  .item-value {
    font-size: 10px;
    font-weight: 600;
    color: #000000;
  }
}

.energy-wrapper {
  position: relative;
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;

  .energy-bar {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .energy-bar.weird {
    background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  }

  .energy-text {
    position: absolute;
    right: 3px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 8px;
    font-weight: 500;
    color: #000000;
    white-space: nowrap;
  }
}

/* 怪异塔状态容器样式 */
.weird-tower-container {
  padding: 6px;
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  // 默认底色：统一的浅灰蓝色
  background: rgba(241, 245, 249, 0.6);
  border-color: rgba(226, 232, 240, 0.4);

  // 连接成功时的底色变化
  .token-card.is-connected & {
    background: rgba(220, 252, 231, 0.4);
    border-color: rgba(167, 243, 208, 0.3);
  }
}

.weird-tower-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 10px;
  color: #000000;
  cursor: pointer;
  transition: color 0.3s ease;

  .token-card.is-connected & {
    color: #000000;
  }

  .tag-icon {
    margin-right: 3px;
    font-size: 11px;
  }

  .tag-icon-img {
    width: 14px;
    height: 14px;
    margin-right: 3px;
  }

  .tag-text {
    flex: 1;
  }

  .expand-icon {
    font-size: 9px;
    margin-right: 6px;
    color: #000000;
    transition: transform 0.2s ease;
  }

  &:hover .expand-icon {
    color: #000000;
  }

  .refresh-icon {
    font-size: 11px;
    color: #000000;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: #000000;
      transform: rotate(180deg);
    }
  }

  .refresh-icon-img {
    width: 11px;
    height: 11px;
    object-fit: contain;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

.weird-tower-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.weird-tower-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 3px;
  border-radius: 5px;
  background-color: #ffffff;
  min-height: 38px;

  &.energy-item {
    min-height: 42px;
  }

  .item-label {
    font-size: 8px;
    color: #000000;
    margin-bottom: 3px;
  }

  .item-value {
    font-size: 10px;
    font-weight: 600;
    color: #000000;
  }
}

.tower-summary {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #000000;
  padding-top: 4px;
}

/* 赛车状态容器样式 */
.car-status-container {
  padding: 6px;
  border-radius: 10px;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  // 默认底色：统一的浅灰蓝色
  background: rgba(241, 245, 249, 0.6);
  border-color: rgba(226, 232, 240, 0.4);

  // 连接成功时的底色变化
  .token-card.is-connected & {
    background: rgba(220, 252, 231, 0.4);
    border-color: rgba(167, 243, 208, 0.3);
  }
}

.car-status-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 10px;
  color: #000000;
  cursor: pointer;
  transition: color 0.3s ease;

  .token-card.is-connected & {
    color: #000000;
  }

  .tag-icon {
    margin-right: 3px;
    font-size: 11px;
  }

  .tag-icon-img {
    width: 14px;
    height: 14px;
    margin-right: 3px;
  }

  .tag-text {
    flex: 1;
  }

  .expand-icon {
    font-size: 9px;
    margin-right: 6px;
    color: #000000;
    transition: transform 0.2s ease;
  }

  &:hover .expand-icon {
    color: #000000;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 2px;

    .loading-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: #d97706;
      animation: dot-pulse 1.5s infinite ease-in-out;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }

  .refresh-icon-img {
    width: 11px;
    height: 11px;
    object-fit: contain;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: rotate(180deg);
    }
  }
}

@keyframes dot-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
}

.car-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  margin-bottom: 5px;
}

.car-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3px 2px;
  border-radius: 4px;
  background-color: #ffffff;
  transition: all 0.2s ease;
  min-height: 35px;
}

.car-item:hover {
  background-color: #fef9c3;
}

.car-number {
  font-size: 8px;
  color: #92400e;
  margin-bottom: 0px;
  font-weight: 500;
}

.car-status-text {
  font-size: 8px;
  font-weight: 600;
  margin-bottom: 1px;
}

.car-time {
  font-size: 6px;
  color: #a16207;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 赛车状态样式 */
.car-available {
  background: #d1fae5;
}

.car-available .car-status-text {
  color: #059669;
}

.car-on-mission {
  background: #fef3c7;
}

.car-on-mission .car-status-text {
  color: #d97706;
}

.car-claimable {
  background: #fee2e2;
  animation: claimable-pulse 2s infinite;
}

.car-claimable .car-status-text {
  color: #dc2626;
}

/* 今日已完成：蓝灰色背景，表示当天已发车并收取 */
.car-completed {
  background: #dbeafe;
}

.car-completed .car-status-text {
  color: #2563eb;
}

.car-completed .car-number {
  color: #3b82f6;
}

@keyframes claimable-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.car-placeholder {
  background: #fef9c3;
  opacity: 0.5;
}

.car-placeholder .car-status-text {
  color: #ca8a04;
}

/* 加载状态样式 */
.loading-indicator {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #64748b;
  margin: 0 2px;
  animation: loading-pulse 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-text {
  font-size: 12px;
  color: #64748b;
}

@keyframes loading-pulse {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 状态摘要 */
.car-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 3px;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 3px;
  margin-top: 2px;
  gap: 3px;
}

html.dark .car-summary {
  background: rgba(30, 41, 59, 0.3);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.summary-item .label {
  font-size: 6px;
  color: #64748b;
  white-space: nowrap;
}

html.dark .summary-item .label {
  color: #94a3b8;
}

.summary-item .value {
  font-size: 8px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  min-width: 12px;
  text-align: center;
}

.summary-item .value.success {
  color: #10b981;
}

.summary-item .value.primary {
  color: #3b82f6;
}

.summary-item .value.warning {
  color: #f59e0b;
}

html.dark .summary-item .value.success {
  color: #34d399;
}

html.dark .summary-item .value.primary {
  color: #60a5fa;
}

html.dark .summary-item .value.warning {
  color: #fbbf24;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

@keyframes status-dot-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
  50% {
    box-shadow: 0 0 8px 2px rgba(0, 0, 0, 0.08);
  }
}

/* 金鱼达标标签样式 */
.goldfish-tag {
  .tag-icon-img {
    width: 14px;
    height: 14px;
    object-fit: contain;
    margin-right: 3px;
  }

  &.all-met {
    background: #d1fae5 !important;
    border-color: #6ee7b7 !important;
    color: #059669 !important;
  }

  &.not-met {
    background: #fee2e2 !important;
    border-color: #fca5a5 !important;
    color: #000000 !important;
  }
}

.task-progress {
  margin-bottom: 6px;

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
    font-size: 10px;

    .progress-label {
      color: #000000;
      font-weight: 500;
      font-size: 9px;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .progress-icon-img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }

    .progress-value {
      font-weight: 600;
      color: #000000;
      font-size: 9px;
    }
  }

  .progress-bar-container {
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    overflow: hidden;

    .progress-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease;
    }
  }
}

.group-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}

/* 任务执行日志样式 */
.task-logs {
  margin-top: 10px;

  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;

    .logs-title {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
    }
  }

  .logs-content {
    max-height: 100px;
    overflow-y: auto;
    font-size: 11px;
    padding-right: 3px;

    &::-webkit-scrollbar {
      width: 3px;
    }

    &::-webkit-scrollbar-track {
      background: #f8fafc;
      border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 2px;
    }

    .log-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 3px;
      padding: 4px 6px;
      border-radius: 3px;

      .log-time {
        width: 65px;
        color: #94a3b8;
        margin-right: 6px;
        font-size: 10px;
        font-family: 'SF Mono', Monaco, monospace;
        flex-shrink: 0;
      }

      .log-message {
        flex: 1;
        line-height: 1.3;
      }

      &.log-info {
        background: #f8fafc;
        color: #64748b;
      }

      &.log-success {
        background: rgba(16, 185, 129, 0.08);
        color: #065f46;
      }

      &.log-error {
        background: rgba(239, 68, 68, 0.08);
        color: #b91c1c;
      }

      &.log-warning {
        background: rgba(251, 191, 36, 0.08);
        color: #92400e;
      }
    }
  }
}

/* 手机端响应式设计 */
@media (max-width: 768px) {
  .token-card {
    padding: 6px;
    border-radius: 6px;
  }

  .card-header {
    margin-bottom: 8px;

    .header-left {
      gap: 6px;

      .token-name {
        // 移动端使用更小的字体范围
        font-size: clamp(7px, 6cqi, 12px);
        word-break: break-all;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
    }

    .header-right {
      gap: 3px;

      // 响应式缩小按钮
      .n-button {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        
        // 缩小图标
        .n-icon {
          font-size: 14px !important;
          
          svg {
            width: 14px !important;
            height: 14px !important;
          }
        }
      }

      .status-dot {
        width: 8px;
        height: 8px;
        margin-right: 3px;
      }

      .status-icon {
        width: 14px;
        height: 14px;
      }
    }
  }

  // 状态标签行
  .status-tags {
    gap: 4px;
    flex-wrap: wrap;

    .status-tag {
      padding: 3px 6px;
      font-size: 10px;
      border-radius: 4px;
      min-width: fit-content;
      flex-shrink: 1;
      overflow: hidden;

      .tag-icon {
        font-size: 12px;
      }

      .tag-icon-img {
        width: 13px;
        height: 13px;
      }

      .tag-text {
        font-size: 10px;
      }
    }
  }

  // 换皮闯关
  .module-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 6px !important;

    .tower-status-container,
    .climb-tower-container,
    .weird-tower-container,
    .car-status-container {
      padding: 6px !important;
      border-radius: 8px !important;

      .tower-status-header,
      .climb-tower-header,
      .weird-tower-header,
      .car-status-header {
        padding: 4px 6px;
        font-size: 10px;
        margin-bottom: 4px;

        .tag-icon {
          font-size: 12px;
          margin-right: 3px;
        }

        .tag-text {
          font-size: 10px;
        }

        .expand-icon {
          font-size: 9px;
        }

        .refresh-icon {
          font-size: 12px;
        }
      }
    }
  }

  .tower-status-container {
    .tower-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 4px !important;

      .tower-item {
        padding: 4px !important;
        font-size: 9px !important;

        .tower-number {
          font-size: 9px !important;
        }

        .tower-level {
          font-size: 8px !important;
        }
      }
    }

    .tower-summary {
      font-size: 9px !important;
      padding: 4px !important;
    }
  }

  // 爬塔
  .climb-tower-container {
    .climb-tower-grid {
      gap: 4px !important;

      .climb-tower-item {
        padding: 4px !important;

        .item-label {
          font-size: 9px !important;
        }

        .item-value {
          font-size: 11px !important;
        }
      }
    }
  }

  // 怪异塔
  .weird-tower-container {
    .weird-tower-grid {
      gap: 4px !important;

      .weird-tower-item {
        padding: 4px !important;

        .item-label {
          font-size: 9px !important;
        }

        .item-value {
          font-size: 11px !important;
        }
      }
    }
  }

  // 赛车
  .car-status-container {
    .car-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 4px !important;

      .car-item {
        padding: 4px !important;

        .car-number {
          font-size: 10px !important;
        }

        .car-status-text {
          font-size: 9px !important;
        }

        .car-time {
          font-size: 8px !important;
        }
      }
    }

    .car-summary {
      padding: 2px 3px !important;
      margin-top: 2px !important;
      gap: 2px !important;

      .summary-item {
        gap: 2px !important;

        .label {
          font-size: 6px !important;
        }

        .value {
          font-size: 8px !important;
          min-width: 12px !important;
        }
      }
    }
  }

  // 每日任务和月度任务
  .task-progress-container {
    .task-progress-header {
      padding: 4px 6px;
      font-size: 10px;

      .tag-icon {
        font-size: 12px;
      }

      .tag-text {
        font-size: 10px;
      }

      .progress-value {
        font-size: 10px !important;
      }
    }
  }
}

// 脉冲动画
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

/* 暗黑模式适配 */
[data-theme="dark"] {
  /* 闯关模块 */
  .tower-item {
    background-color: var(--bg-tertiary) !important;

    &:hover {
      background-color: var(--card-bg-hover) !important;
    }

    &.tower-active {
      background: rgba(59, 130, 246, 0.2) !important;
    }

    &.tower-cleared {
      background: rgba(16, 185, 129, 0.2) !important;
    }

    &.tower-locked {
      background: var(--bg-secondary) !important;
      opacity: 0.4;
    }
  }

  .tower-number,
  .tower-level {
    color: var(--text-primary) !important;
  }

  /* 爬塔模块 */
  .climb-tower-item {
    background-color: var(--bg-tertiary) !important;

    .item-label,
    .item-value {
      color: var(--text-primary) !important;
    }
  }

  .energy-wrapper {
    background: var(--bg-secondary) !important;

    .energy-text {
      color: var(--text-primary) !important;
    }
  }

  /* 怪塔模块 */
  .weird-tower-item {
    background-color: var(--bg-tertiary) !important;

    .item-label,
    .item-value {
      color: var(--text-primary) !important;
    }
  }

  .weird-tower-container {
    background: var(--bg-secondary) !important;
    border-color: var(--border-light) !important;

    .token-card.is-connected & {
      background: rgba(16, 185, 129, 0.1) !important;
      border-color: rgba(16, 185, 129, 0.2) !important;
    }
  }

  .weird-tower-header {
    color: var(--text-primary) !important;
  }

  /* 赛车模块 */
  .car-item {
    background-color: var(--bg-tertiary) !important;

    &:hover {
      background-color: var(--card-bg-hover) !important;
    }
  }

  .car-number {
    color: var(--text-secondary) !important;
  }

  .car-time {
    color: var(--text-tertiary) !important;
  }

  .car-available {
    background: rgba(16, 185, 129, 0.2) !important;

    .car-status-text {
      color: #34d399 !important;
    }
  }

  .car-on-mission {
    background: rgba(245, 158, 11, 0.2) !important;

    .car-status-text {
      color: #fbbf24 !important;
    }
  }

  .car-claimable {
    background: rgba(239, 68, 68, 0.2) !important;

    .car-status-text {
      color: #f87171 !important;
    }
  }

  .car-completed {
    background: rgba(59, 130, 246, 0.2) !important;

    .car-status-text {
      color: #60a5fa !important;
    }

    .car-number {
      color: #60a5fa !important;
    }
  }

  .car-placeholder {
    background: var(--bg-secondary) !important;
    opacity: 0.4;

    .car-number,
    .car-status-text {
      color: var(--text-tertiary) !important;
    }
  }

  /* 模块容器 */
  .tower-status-container,
  .climb-tower-container {
    background: var(--bg-secondary) !important;
    border-color: var(--border-light) !important;

    .token-card.is-connected & {
      background: rgba(16, 185, 129, 0.1) !important;
      border-color: rgba(16, 185, 129, 0.2) !important;
    }
  }

  .tower-status-header,
  .climb-tower-header,
  .car-status-header {
    color: var(--text-primary) !important;
  }

  .tag-text {
    color: var(--text-primary) !important;
  }
}

// ====== 窄卡片容器查询适配（卡片宽度 < 220px 时整体缩小） ======
@container (max-width: 220px) {
  .token-card {
    padding: 6px;
    border-radius: 8px;
  }

  .card-header {
    margin-bottom: 6px;
    padding-bottom: 6px;

    .header-left {
      gap: 4px;

      .drag-handle {
        padding: 2px 4px;
      }

      .token-name {
        font-size: clamp(7px, 6cqi, 11px);
      }
    }

    .header-right {
      gap: 2px;

      .n-button {
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;

        .n-icon {
          font-size: 12px !important;

          svg {
            width: 12px !important;
            height: 12px !important;
          }
        }
      }

      .status-dot {
        width: 7px;
        height: 7px;
        margin-right: 2px;
      }
    }
  }

  .status-tags {
    gap: 3px;
    margin-bottom: 6px;

    .status-tag {
      padding: 2px 5px;
      font-size: 9px;
      border-radius: 10px;
      gap: 2px;
      min-width: auto !important;

      .tag-icon-img {
        width: 11px !important;
        height: 11px !important;
      }
    }
  }

  .module-grid {
    gap: 4px;
    margin-top: 4px;
  }

  .tower-status-container,
  .climb-tower-container,
  .weird-tower-container,
  .car-status-container {
    padding: 4px;
    border-radius: 6px;

    .tower-status-header,
    .climb-tower-header,
    .weird-tower-header,
    .car-status-header {
      font-size: 9px;
      margin-bottom: 3px;

      .tag-icon-img {
        width: 11px !important;
        height: 11px !important;
      }

      .expand-icon {
        font-size: 8px;
      }

      .refresh-icon-img {
        width: 9px !important;
        height: 9px !important;
      }
    }
  }

  // 每日任务 / 月度任务行
  .daily-task-row,
  .monthly-task-row {
    font-size: 9px;
    margin-bottom: 3px;
  }
}

// 窗口缩小时的额外适配 (481px - 600px)
@media (max-width: 600px) and (min-width: 481px) {
  .token-card {
    .header-right {
      .n-button {
        width: 22px !important;
        height: 22px !important;
        min-width: 22px !important;
        
        .n-icon {
          font-size: 13px !important;
          
          svg {
            width: 13px !important;
            height: 13px !important;
          }
        }
      }

      .status-dot {
        width: 7px;
        height: 7px;
      }
    }
  }
}
</style>
