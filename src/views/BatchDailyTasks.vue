<template>
  <div class="batch-daily-tasks">
    <div class="main-layout">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Header -->
        <div
          class="page-header"
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          "
        >
          <div class="scheduled-tasks-wrapper">
            <!-- 定时任务统计卡片 -->
            <div
              class="scheduled-tasks-card"
              style="
                flex: 1;
                min-width: 280px;
                padding: 16px 20px;
                background: #ffffff;
                border-radius: 10px;
                color: #333333;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                border: 1px solid #e8e8e8;
              "
            >
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="flex: 1;">
                  <div style="font-size: 14px; color: #666666; margin-bottom: 6px; font-weight: 500;">
                    📅 定时任务
                  </div>
                  <div style="font-size: 32px; font-weight: 700; line-height: 1; color: #1890ff;">
                    {{ scheduledTasks.length }}
                  </div>
                </div>
                <div style="flex: 1; border-left: 2px solid #e8e8e8; padding-left: 16px;">
                  <div style="font-size: 14px; color: #666666; margin-bottom: 6px; font-weight: 500;">
                    ⏰ 即将执行
                  </div>
                  <div style="font-size: 15px; font-weight: 600; word-break: break-word; line-height: 1.4; color: #333333;">
                    {{ shortestCountdownTask ? `${shortestCountdownTask.task.name} (${shortestCountdownTask.countdown.formatted})` : '暂无任务' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮组 -->
            <div class="scheduled-tasks-buttons">
              <!-- 任务管理 -->
              <div class="button-row button-row-task">
                <n-button 
                  size="small" 
                  @click="openTaskModal"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">➕</span>
                  </template>
                  新增任务
                </n-button>
                <n-button 
                  size="small" 
                  @click="showTasksModal = true"
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📋</span>
                  </template>
                  查看任务
                </n-button>
              </div>

              <!-- 时段控制 -->
              <div class="button-row button-row-time">
                <n-button 
                  size="small" 
                  @click="toggleAllOfflineTime(true)" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">▶️</span>
                  </template>
                  开启时段
                </n-button>
                <n-button 
                  size="small" 
                  @click="toggleAllOfflineTime(false)" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">⏸️</span>
                  </template>
                  关闭时段
                </n-button>
              </div>

              <!-- 配置管理 -->
              <div class="button-row button-row-config">
                <n-button 
                  size="small" 
                  @click="triggerImportScheduledTasks"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📥</span>
                  </template>
                  导入任务
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportScheduledTasksConfig" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📤</span>
                  </template>
                  导出任务
                </n-button>
                <n-button 
                  size="small" 
                  @click="triggerImportAccountConfig"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📥</span>
                  </template>
                  导入账号
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportAccountConfig" 
                  :disabled="tokens.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📤</span>
                  </template>
                  导出账号
                </n-button>
              </div>
              <!-- 全量配置导入导出 -->
              <div class="button-row button-row-config">
                <n-button 
                  size="small" 
                  @click="triggerImportFullConfig"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📦</span>
                  </template>
                  全量导入
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportConfig" 
                  :disabled="tokens.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">📦</span>
                  </template>
                  全量导出
                </n-button>
              </div>
            </div>
          </div>

          <!-- 隐藏的文件输入框 -->
          <input 
            ref="importScheduledTasksInput" 
            type="file" 
            accept=".json" 
            style="display: none;" 
            @change="handleImportScheduledTasks"
          />
          <input 
            ref="importAccountConfigInput" 
            type="file" 
            accept=".json" 
            style="display: none;" 
            @change="handleImportAccountConfig"
          />
          <input 
            ref="importFullConfigInput" 
            type="file" 
            accept=".json" 
            style="display: none;" 
            @change="handleImportFullConfig"
          />
          <div
            style="
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 12px;
              background-color: transparent;
              border-radius: 12px;
              border: none;
              flex-wrap: wrap;
            "
          >
            <n-button
              @click="startBatch"
              :disabled="isRunning || selectedTokens.length === 0"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">▶️</span>
              </template>
              {{ isRunning ? "执行中..." : "开始执行" }}
            </n-button>
            <n-button
              @click="stopBatch"
              :disabled="!isRunning"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">⏹️</span>
              </template>
              停止
            </n-button>
            <n-button
              @click="openTemplateManagerModal"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">📥</span>
              </template>
              任务模板
            </n-button>
            <n-button @click="openBatchSettings" size="medium" style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;">
              <template #icon>
                <span style="font-size: 16px;">⚙️</span>
              </template>
              设置
            </n-button>
            <n-button
              @click="connectSelected"
              :disabled="selectedTokens.length === 0"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">🔗</span>
              </template>
              连接
            </n-button>
            <n-button
              @click="disconnectSelected"
              :disabled="selectedTokens.length === 0"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">🔌</span>
              </template>
              断开
            </n-button>
          </div>
        </div>

        <!-- Batch Functions -->
        <n-card title="批量功能列表" class="token-list-card">
          <template #header-extra>
            <n-space style="gap: 8px; align-items: center;">
              <!-- 防休眠开关 -->
              <n-space style="gap: 6px; align-items: center;" size="small">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-switch 
                      v-model:value="isWakeLockEnabled" 
                      :disabled="!wakeLockSupported"
                      @update:value="handleWakeLockToggle"
                      size="small"
                      style="transform: scale(0.85);"
                    >
                      <template #checked>🛡️ 已开启</template>
                      <template #unchecked>🛡️ 防休眠</template>
                    </n-switch>
                  </template>
                  <span v-if="!wakeLockSupported">当前环境不支持防休眠功能</span>
                  <span v-else>开启后系统将保持唤醒状态,防止自动休眠</span>
                </n-tooltip>
                <n-text v-if="!wakeLockSupported" type="warning" style="font-size: 11px;">
                  不支持
                </n-text>
              </n-space>
              <n-button 
                size="small" 
                @click="isBatchFunctionsExpanded = !isBatchFunctionsExpanded"
                :type="isBatchFunctionsExpanded ? 'primary' : 'default'"
              >
                {{ isBatchFunctionsExpanded ? '收起' : '展开' }}
              </n-button>
            </n-space>
          </template>
          <div v-if="isBatchFunctionsExpanded">
          <n-tabs type="line" animated>
            <n-tab-pane name="daily" tab="日常">
              <n-space>
                <n-button
                  size="small"
                  @click="claimHangUpRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取挂机
                </n-button>
                <n-button
                  size="small"
                  @click="batchAddHangUpTime"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键加钟
                </n-button>
                <n-button
                  size="small"
                  @click="resetBottles"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  重置罐子
                </n-button>
                <n-button
                  size="small"
                  @click="batchlingguanzi"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取罐子
                </n-button>
                <n-button
                  size="small"
                  @click="batchclubsign"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键俱乐部签到
                </n-button>
                <n-button
                  size="small"
                  @click="batchStudy"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键答题
                </n-button>
                <n-button
                  size="small"
                  @click="batcharenafight"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  一键竞技场战斗3次
                </n-button>
                <n-button
                  size="small"
                  @click="batchSmartSendCar"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  智能发车
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimCars"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  一键收车
                </n-button>
                <n-button
                  size="small"
                  @click="batchCarResearchUpgrade"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  升级改装
                </n-button>
                <n-button
                  size="small"
                  @click="store_purchase"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键黑市采购
                </n-button>
                <n-button
                  size="small"
                  @click="openBatchPurchaseConfig"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  同步采购清单
                </n-button>
                <n-button
                  size="small"
                  @click="batch_mail_claim_and_cleanup"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  邮箱领取与清理
                </n-button>
                <n-button
                  size="small"
                  :type="isAnyPushRunning ? 'error' : 'warning'"
                  @click="showPushMapModal = true"
                >
                  {{ isAnyPushRunning ? '停止推图' : '批量推图' }}
                </n-button>

              </n-space>
            </n-tab-pane>
            <n-tab-pane name="welfare" tab="福利">
              <n-space>
                <n-button
                  size="small"
                  @click="charge_claimaddup_rewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  积分好礼领取
                </n-button>
                <n-button
                  size="small"
                  @click="collection_claimfreereward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取珍宝阁
                </n-button>
                <n-button
                  size="small"
                  @click="gacha_drawreward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  免费扭蛋
                </n-button>
                <n-button
                  size="small"
                  @click="claim_recruit_welfare"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  免费礼包领取
                </n-button>
                <n-button
                  size="small"
                  @click="pkroom_appoint"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  预约直播
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="dungeon" tab="副本">
              <n-space>
                <n-button
                  size="small"
                  @click="climbTower"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键爬塔
                </n-button>
                <n-button
                  size="small"
                  @click="batchmengjing"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  一键梦境
                </n-button>
                <n-button
                  size="small"
                  @click="skinChallenge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键换皮闯关
                </n-button>
                <n-button
                  size="small"
                  @click="skinTreasure"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键换皮寻宝
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimPeachTasks"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取蟠桃园任务
                </n-button>
                <n-button
                  size="small"
                  @click="batchBuyDreamItems"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  一键购买梦境商品
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="baoku" tab="宝库">
              <n-space>
                <n-button
                  size="small"
                  @click="batchbaoku13"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库前3层
                </n-button>
                <n-button
                  size="small"
                  @click="batchbaoku45"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库4,5层
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="weirdTower" tab="怪异塔">
              <n-space>
                <n-button
                  size="small"
                  @click="climbWeirdTower"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键爬怪异塔
                </n-button>
                <n-button
                  size="small"
                  @click="batchUseItems"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键使用怪异塔道具
                </n-button>
                <n-button
                  size="small"
                  @click="batchMergeItems"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键怪异塔合成
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimFreeEnergy"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键领取怪异塔免费道具
                </n-button>
                <n-button
                  size="small"
                  @click="claim_weird_tower_all"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  领取怪异塔宝箱目标特权
                </n-button>
                <n-button
                  size="small"
                  @click="claim_weird_tower_pass"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  领取怪异塔通行证
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="resource" tab="资源">
              <n-space>
                <n-button
                  size="small"
                  @click="openHelperModal('box')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  批量开箱
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('pointsBox')"
                  :disabled="isRunning || selectedTokens.length === 0 || !isBoxWeeklyActivityOpen"
                  :title="!isBoxWeeklyActivityOpen ? '仅在宝箱周开放期间可用' : ''"
                >
                  一键宝箱周开箱
                </n-button>
                <n-button
                  size="small"
                  @click="batchOpenDiamondBox"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键开钻石宝箱
                </n-button>
                <n-button
                  size="small"
                  @click="batchOpenFragmentPacks"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键开碎片礼包
                </n-button>
                <n-button
                  size="small"
                  @click="openBoxWeeklyRewardModal"
                  :disabled="isRunning || selectedTokens.length === 0 || !isBoxWeeklyActivityOpen"
                  :title="!isBoxWeeklyActivityOpen ? '仅在宝箱周开放期间可用' : ''"
                >
                  宝箱达标奖励自选大奖
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimBoxPointReward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取宝箱积分
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('fish')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  批量钓鱼
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('recruit')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  批量招募
                </n-button>
                <n-button
                  size="small"
                  @click="legion_storebuygoods"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买四圣碎片
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('weeklyMarket')"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen"
                  :title="!isWeirdTowerActivityOpen ? '仅在黑市周开放期间可用' : ''"
                >
                  黑市周购买
                </n-button>
                <n-button
                  size="small"
                  @click="weekly_market_free_gift"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen"
                  :title="!isWeirdTowerActivityOpen ? '仅在黑市周开放期间可用' : ''"
                >
                  黑市周免费礼包
                </n-button>
                <n-button
                  size="small"
                  @click="buy_top_rod_package"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  购买顶级鱼竿包
                </n-button>
                <n-button
                  size="small"
                  @click="buy_super_spirit_shell"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  购买特级灵贝包
                </n-button>
                <n-button
                  size="small"
                  @click="store_buy_jade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买彩玉
                </n-button>
                <n-button
                  size="small"
                  @click="openManualBuyModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  黑市多选购买
                </n-button>
                <n-button
                  size="small"
                  @click="legionStoreBuySkinCoins"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买俱乐部5皮肤币
                </n-button>
                <n-button
                  size="small"
                  @click="legion_buy_red_jade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买5次红玉
                </n-button>
                <n-button
                  size="small"
                  @click="batchGenieSweep"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键灯神扫荡
                </n-button>
                <n-button
                  size="small"
                  @click="openSaltCrystalShopModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  盐晶商店购买
                </n-button>
                <n-button
                  size="small"
                  @click="openSaltIngotShopModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  盐锭商店购买
                </n-button>
                <n-button
                  size="small"
                  @click="showConsumeModal = true"
                  :disabled="isRunning"
                  type="warning"
                >
                  消耗活动
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimConsumeRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取消耗活动道具
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('cheer')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  挥鼓助威消耗
                </n-button>
                <n-button
                  size="small"
                  @click="batchUseActivityItem"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  使用消耗活动道具
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('cdk')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  兑换码领取
                </n-button>
                <n-button
                  size="small"
                  @click="openActivityExchangeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  消耗活动兑换购买
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimApexRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取竞技大厅道具
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="pet" tab="宠物">
              <n-space>
                <n-button
                  size="small"
                  @click="legion_buy_spotted_egg"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买斑点蛋
                </n-button>
                <n-button
                  size="small"
                  @click="use_spotted_egg"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  使用斑点蛋
                </n-button>
                <n-button
                  size="small"
                  @click="batch_pet_merge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  宠物合成
                </n-button>
                <n-button
                  size="small"
                  @click="batch_pet_upgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  宠物一键升级
                </n-button>
                <n-button
                  size="small"
                  @click="claim_pet_book"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  宠物领取图鉴奖励
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="illustration" tab="图鉴">
              <n-space>
                <n-button
                  size="small"
                  @click="openHeroFourSaintsModal()"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  英雄四圣升级
                </n-button>
                <n-button
                  size="small"
                  @click="batchHeroUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键英雄升星
                </n-button>
                <n-button
                  size="small"
                  @click="batchBookUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键图鉴升星
                </n-button>
                <n-button
                  size="small"
                  @click="batchFishUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键鱼灵升星
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimStarRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取图鉴奖励
                </n-button>
                <n-button
                  size="small"
                  @click="batchCollectionActivate"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  橱窗咸将激活
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="nightmare" tab="十殿">
              <n-space>
                <n-button
                  size="small"
                  type="warning"
                  @click="batchNightmareChallenge"
                  :disabled="isRunning"
                >
                  十殿阎罗挑战
                </n-button>
                <n-button
                  size="small"
                  @click="nightmare_draw_lottery"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  十殿抽奖
                </n-button>
                <n-button
                  size="small"
                  @click="nightmare_claim_book_reward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  十殿抽奖达标奖励
                </n-button>
                <n-button
                  size="small"
                  @click="star_drawturntable"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  星级抽奖
                </n-button>
                <n-button
                  size="small"
                  @click="batch_star_challenge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  十殿星级挑战
                </n-button>
                <n-button
                  size="small"
                  type="info"
                  @click="showStarTeamModal = true"
                >
                  星级队伍
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="legacy" tab="功法">
              <n-space>
                <n-button
                  size="small"
                  @click="batchLegacyHangup"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  开启残卷挂机
                </n-button>
                <n-button
                  size="small"
                  @click="batchLegacyClaim"
                  :disabled="isRunning || selectedTokens.length === 0 || isLegacyRestricted"
                  :title="isLegacyRestricted ? '赛季日00:00-12:00为残卷更新时间，禁止操作' : ''"
                >
                  批量功法残卷领取
                </n-button>
                <n-button
                  size="small"
                  @click="showLegacyGiftModal = true"
                  :disabled="isRunning || selectedTokens.length === 0 || isLegacyRestricted"
                  :title="isLegacyRestricted ? '赛季日00:00-12:00为残卷更新时间，禁止操作' : ''"
                >
                  批量功法残卷赠送
                </n-button>
                <n-button
                  size="small"
                  @click="batchLegacyClaimGiftTask"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取残卷赠送奖励
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="monthly" tab="月度">
              <n-space>
                <n-button
                  size="small"
                  @click="batchTopUpFish"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键钓鱼补齐
                </n-button>
                <n-button
                  size="small"
                  @click="batchTopUpArena"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  一键竞技场补齐
                </n-button>
                <n-button
                  size="small"
                  @click="openWarGuessModal"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWarGuessActivityOpen"
                  :title="isWarGuessActivityOpen ? '' : warGuessActivityTip"
                >
                  月赛助威
                </n-button>
                <n-button
                  size="small"
                  @click="claim_guess_coin"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取助威币
                </n-button>
                <n-button
                  size="small"
                  @click="openLegionStoreModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  助威商店多选购买
                </n-button>
              </n-space>
            </n-tab-pane>
          </n-tabs>
          </div>
        </n-card>

        <!-- Token Selection -->
        <n-card title="账号列表" style="margin-top: 16px">
          <template #header-extra>
            <n-button 
              size="small" 
              @click="showSponsorModal = true"
              style="margin-right: 8px; color: #ff6b6b;"
              type="primary"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">❤️</span>
              </template>
              赞助
            </n-button>
            <n-button 
              size="small" 
              @click="showTipsModal = true"
              style="margin-right: 8px; color: #e67e22;"
              type="warning"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">💡</span>
              </template>
              温馨提示
            </n-button>
            <n-button 
              size="small" 
              @click="showQQGroupModal = true"
              style="margin-right: 8px; color: #1890ff;"
              type="info"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">👥</span>
              </template>
              QQ群
            </n-button>
            <n-button 
              size="small" 
              @click="isTokenListExpanded = !isTokenListExpanded"
              :type="isTokenListExpanded ? 'primary' : 'default'"
            >
              {{ isTokenListExpanded ? '收起' : '展开' }}
            </n-button>
          </template>
          <div v-if="isTokenListExpanded">
            <!-- 分组管理和选择 -->
            <div style="background: #f7f8fa; border-radius: 6px; padding: 8px; margin-bottom: 12px;">
              <n-space vertical style="width: 100%">
              <!-- 分组选择部分 -->
              <div
                v-if="tokenGroups.length > 0"
                class="group-selection-section"
              >
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                  "
                >
                  <label style="font-weight: 500; color: #333; font-size: 12px;">分组选择</label>
                  <n-button
                    size="tiny"
                    type="error"
                    text
                    @click="clearAllGroupSelection"
                    style="font-size: 11px;"
                  >
                    一键清除所有分组选择
                  </n-button>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap">
                  <div
                    v-for="group in tokenGroups"
                    :key="group.id"
                    @click="toggleGroupSelection(group.id)"
                    :style="{
                      padding: '6px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      backgroundColor: isGroupSelected(group.id)
                        ? group.color
                        : 'transparent',
                      border: `2px solid ${group.color}`,
                      color: isGroupSelected(group.id) ? 'white' : group.color,
                      fontWeight: isGroupSelected(group.id) ? '600' : '400',
                      transition: 'all 0.3s ease',
                      userSelect: 'none',
                    }"
                  >
                    <span style="font-size: 11px;">
                      {{ group.name }} ({{
                        getValidGroupTokenIds(group.id).length
                      }})
                    </span>
                  </div>
                </div>
              </div>

              <!-- 分组管理按钮 -->
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-top: 12px;
                  padding-top: 12px;
                  border-top: 1px solid #e5e6eb;
                "
              >
                <n-space>
                  <n-button
                    type="info"
                    size="small"
                    @click="showGroupManageModal = true"
                  >
                    管理分组
                  </n-button>
                  <n-button
                    type="primary"
                    size="small"
                    @click="navigateToAddToken"
                  >
                    添加Token
                  </n-button>
                  <n-button
                    type="primary"
                    size="small"
                    @click="refreshSelectedTokens"
                    :disabled="selectedTokens.length === 0"
                  >
                    刷新Token
                  </n-button>
                  <n-popconfirm
                    @positive-click="deleteSelectedTokens"
                    positive-text="确定删除"
                    negative-text="取消"
                  >
                    <template #trigger>
                      <n-button
                        type="error"
                        size="small"
                        :disabled="selectedTokens.length === 0"
                      >
                        删除账号
                      </n-button>
                    </template>
                    确定要删除已选的 {{ selectedTokens.length }} 个账号吗？这将断开WebSocket连接并清除关联的BIN数据和任务配置，操作不可撤销。
                  </n-popconfirm>
                  <n-popconfirm
                    @positive-click="resetSelectedTokensCache"
                    positive-text="确认重置"
                    negative-text="取消"
                  >
                    <template #trigger>
                      <n-button
                        type="warning"
                        size="small"
                        :disabled="selectedTokens.length === 0"
                      >
                        重置缓存
                      </n-button>
                    </template>
                    确定要重置已选账号的本地缓存吗？这将清除localStorage缓存并重新加载卡片数据。
                  </n-popconfirm>
                </n-space>
                <span
                  v-if="selectedGroups.length > 0"
                  style="font-size: 12px; color: #86909c"
                >
                  已选择 {{ selectedGroups.length }} 个分组，包含
                  {{ selectedTokens.length }} 个账号
                </span>
              </div>
            </n-space>
            </div>
          </div>

          <!-- 排序按钮组 -->
          <div class="sort-buttons" style="margin-top: 16px; margin-bottom: 12px">
            <n-space align="center">
              <n-button-group size="small">
                <n-button
                  @click="toggleSort('name')"
                  :type="sortConfig.field === 'name' ? 'primary' : 'default'"
                >
                  名称 {{ getSortIcon("name") }}
                </n-button>
                <n-button
                  @click="toggleSort('server')"
                  :type="sortConfig.field === 'server' ? 'primary' : 'default'"
                >
                  服务器 {{ getSortIcon("server") }}
                </n-button>
                <n-button
                  @click="toggleSort('createdAt')"
                  :type="
                    sortConfig.field === 'createdAt' ? 'primary' : 'default'
                  "
                >
                  创建时间 {{ getSortIcon("createdAt") }}
                </n-button>
                <n-button
                  @click="toggleSort('lastUsed')"
                  :type="
                    sortConfig.field === 'lastUsed' ? 'primary' : 'default'
                  "
                >
                  最后使用 {{ getSortIcon("lastUsed") }}
                </n-button>
                <n-button
                  @click="toggleSort('monthly')"
                  :type="
                    sortConfig.field === 'monthly' ? 'primary' : 'default'
                  "
                >
                  月度排序 {{ getSortIcon("monthly") }}
                </n-button>
              </n-button-group>
              
              <!-- 每行数量调节 -->
              <div style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
                <span style="font-size: 12px; color: #666;">每行数量:</span>
                <n-input-number 
                  v-model:value="batchSettings.tokenListColumns" 
                  :min="1" 
                  :max="10" 
                  :step="1" 
                  size="small" 
                  style="width: 80px" 
                  :disabled="!isMaximizedWindow"
                  @update:value="handleManualColumnChange"
                />
                <span v-if="!isMaximizedWindow" style="font-size: 12px; color: #999;">(自动)</span>
              </div>
              
              <!-- 账号搜索框 -->
              <div style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
                <span style="font-size: 12px; color: #666;">搜索账号:</span>
                <n-input 
                  v-model:value="tokenSearchKeyword" 
                  placeholder="输入账号名称搜索..." 
                  size="small" 
                  clearable
                  style="width: 200px"
                  @update:value="handleTokenSearch"
                >
                  <template #prefix>
                    <n-icon>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    </n-icon>
                  </template>
                </n-input>
              </div>
            </n-space>
          </div>

          <div v-if="isTokenListExpanded">
            <div style="background: #f7f8fa; border-radius: 8px; padding: 12px; margin-top: 16px;">
              <n-space vertical>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px">
                <n-checkbox
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @update:checked="handleSelectAll"
                >
                  全选
                </n-checkbox>
                <div class="expand-collapse-buttons">
                  <div class="button-group">
                    <n-button size="small" @click="isTowerExpandedForAll = true">
                      展开闯关
                    </n-button>
                    <n-button size="small" @click="isTowerExpandedForAll = false">
                      收起闯关
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isCarExpandedForAll = true">
                      展开赛车
                    </n-button>
                    <n-button size="small" @click="isCarExpandedForAll = false">
                      收起赛车
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isClimbTowerExpandedForAll = true">
                      展开爬塔
                    </n-button>
                    <n-button size="small" @click="isClimbTowerExpandedForAll = false">
                      收起爬塔
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isWeirdTowerExpandedForAll = true">
                      展开怪塔
                    </n-button>
                    <n-button size="small" @click="isWeirdTowerExpandedForAll = false">
                      收起怪塔
                    </n-button>
                  </div>
                </div>
              </div>
              <n-grid
                :x-gap="12"
                :y-gap="12"
                :cols="responsiveColumns"
              >
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <TokenCard
                    :token="token"
                    :is-selected="selectedTokens.includes(token.id)"
                    :is-tower-expanded="isTowerExpandedForAll"
                    :is-car-expanded="isCarExpandedForAll"
                    :is-climb-tower-expanded="isClimbTowerExpandedForAll"
                    :is-weird-tower-expanded="isWeirdTowerExpandedForAll"
                    :is-drop-target="targetTokenId === token.id"
                    @select="handleTokenSelect"
                    @settings="openSettings"
                    @toggleConnection="handleToggleConnection"
                    @drag-start="handleTokenDragStart"
                    @drag-end="handleTokenDragEnd"
                    @drop="handleTokenDrop"
                    @drag-query="handleTokenDragQuery"
                    @drag-update-target="handleTokenDragUpdateTarget"
                    @drag-get-target="handleTokenDragGetTarget"
                  />
                </n-grid-item>
              </n-grid>
            </n-space>
            </div>
          </div>
        </n-card>
      </div>

      <!-- Right Column - Execution Log -->
      <div class="right-column">
        <n-card class="log-card">
          <template #header>
            <div class="custom-card-header">
              <div class="card-title">
                {{
                  currentRunningTokenName
                    ? `正在执行: ${currentRunningTokenName}`
                    : "执行日志"
                }}
                <span
                  style="margin-left: 12px; font-size: 12px; color: #86909c"
                >
                  {{ logs.length }}/{{ batchSettings.maxLogEntries || 1000 }}
                </span>
              </div>
              <div class="log-header-controls">
                <n-checkbox v-model:checked="autoScrollLog" size="small">
                  自动滚动
                </n-checkbox>
                <n-checkbox v-model:checked="filterErrorsOnly" size="small">
                  只看错误
                </n-checkbox>
                <n-tag v-if="errorCount > 0" type="error" size="small">
                  {{ errorCount }} 个错误
                </n-tag>
                <n-button size="small" @click="clearLogs"> 清空日志 </n-button>
                <n-button size="small" @click="copyLogs"> 复制日志 </n-button>
              </div>
            </div>
          </template>
          <n-progress
            type="line"
            :percentage="currentProgress"
            :indicator-placement="'inside'"
            processing
          />
          <div class="log-container" ref="logContainer" @scroll="handleLogScroll">
            <div
              v-for="(log, index) in filteredLogs"
              :key="index"
              class="log-item"
              :class="log.type"
            >
              <span class="time">{{ log.time }}</span>
              <span class="message">{{ log.message }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </div>



    <!-- Settings Modal -->
    <n-modal
      v-model:show="showSettingsModal"
      preset="card"
      :title="`任务设置 - ${currentSettingsTokenName}`"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">竞技场阵容</label>
            <n-select
              v-model:value="currentSettings.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">爬塔阵容</label>
            <n-select
              v-model:value="currentSettings.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS阵容</label>
            <n-select
              v-model:value="currentSettings.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">十殿阵容</label>
            <n-select
              v-model:value="currentSettings.nightmareFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS次数</label>
            <n-select
              v-model:value="currentSettings.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">每日BOSS次数</label>
            <n-select
              v-model:value="currentSettings.dailyBossTimes"
              :options="dailyBossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">领罐子</span
              ><n-switch v-model:value="currentSettings.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领挂机</span
              ><n-switch v-model:value="currentSettings.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">竞技场</span
              ><n-switch v-model:value="currentSettings.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">开宝箱</span
              ><n-switch v-model:value="currentSettings.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领取邮件奖励</span
              ><n-switch v-model:value="currentSettings.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">黑市购买物品</span
              ><n-switch v-model:value="currentSettings.blackMarketPurchase" />
            </div>
            <!-- 采购清单多选 -->
            <div v-if="currentSettings.blackMarketPurchase" class="purchase-config-area">
              <div class="switch-row" style="margin-bottom: 6px;">
                <span class="switch-label">采购次数</span>
                <n-input-number
                  v-model:value="currentSettings.purchaseCnt"
                  :min="1" :max="15" :step="1"
                  size="tiny" style="width: 80px;"
                />
                <n-button
                  size="tiny"
                  :disabled="syncPurchaseBusy || !currentSettingsTokenId"
                  @click="syncPurchaseToGame"
                  style="margin-left: 8px;"
                >
                  {{ syncPurchaseBusy ? '同步中...' : '同步到游戏' }}
                </n-button>
              </div>
              <div class="purchase-list-grid">
                <label
                  v-for="item in purchaseItemOptions"
                  :key="item.itemId"
                  class="purchase-item-label"
                >
                  <input
                    type="checkbox"
                    :checked="currentSettings.purchaseList.includes(item.itemId)"
                    @change="togglePurchaseItem(currentSettings.purchaseList, currentSettings.purchaseDiscounts, item.itemId)"
                  />
                  <span>{{ item.name }}</span>
                  <input type="number" class="discount-input"
                    :value="getDiscount(currentSettings.purchaseDiscounts, item.itemId)"
                    @input="(e) => setDiscount(currentSettings.purchaseDiscounts, item.itemId, e.target.value)"
                    min="1" max="10"
                    :disabled="!currentSettings.purchaseList.includes(item.itemId)"
                  />
                  <span class="discount-unit">折</span>
                </label>
              </div>
            </div>
            <div class="switch-row">
              <span class="switch-label">付费招募</span
              ><n-switch v-model:value="currentSettings.payRecruit" />
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">功法赠送验证密码</label>
            <n-input
              v-model:value="currentSettings.legacyGiftPassword"
              placeholder="留空则使用手动输入"
              type="password"
              show-password-on="click"
              size="small"
            />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button type="primary" @click="saveSettings">保存设置</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Task Template Modal -->
    <n-modal
      v-model:show="showTaskTemplateModal"
      preset="card"
      :title="currentTemplateId ? '编辑任务模板' : '任务模板设置'"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">模板名称</label>
            <n-input
              v-model:value="currentTemplateName"
              placeholder="请输入模板名称"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">竞技场阵容</label>
            <n-select
              v-model:value="currentTemplate.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">爬塔阵容</label>
            <n-select
              v-model:value="currentTemplate.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS阵容</label>
            <n-select
              v-model:value="currentTemplate.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">十殿阵容</label>
            <n-select
              v-model:value="currentTemplate.nightmareFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS次数</label>
            <n-select
              v-model:value="currentTemplate.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">每日BOSS次数</label>
            <n-select
              v-model:value="currentTemplate.dailyBossTimes"
              :options="dailyBossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">领罐子</span
              ><n-switch v-model:value="currentTemplate.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领挂机</span
              ><n-switch v-model:value="currentTemplate.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">竞技场</span
              ><n-switch v-model:value="currentTemplate.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">开宝箱</span
              ><n-switch v-model:value="currentTemplate.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领取邮件奖励</span
              ><n-switch v-model:value="currentTemplate.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">黑市购买物品</span
              ><n-switch v-model:value="currentTemplate.blackMarketPurchase" />
            </div>
            <!-- 采购清单多选（仅在黑市购买开启时显示） -->
            <div v-if="currentTemplate.blackMarketPurchase" class="purchase-config-area">
              <div class="switch-row" style="margin-bottom: 6px;">
                <span class="switch-label">采购次数</span>
                <n-input-number
                  v-model:value="currentTemplate.purchaseCnt"
                  :min="1" :max="15" :step="1"
                  size="tiny" style="width: 80px;"
                />
              </div>
              <div class="purchase-list-grid">
                <label
                  v-for="item in purchaseItemOptions"
                  :key="item.itemId"
                  class="purchase-item-label"
                >
                  <input
                    type="checkbox"
                    :checked="currentTemplate.purchaseList.includes(item.itemId)"
                    @change="togglePurchaseItem(currentTemplate.purchaseList, currentTemplate.purchaseDiscounts, item.itemId)"
                  />
                  <span>{{ item.name }}</span>
                  <input type="number" class="discount-input"
                    :value="getDiscount(currentTemplate.purchaseDiscounts, item.itemId)"
                    @input="(e) => setDiscount(currentTemplate.purchaseDiscounts, item.itemId, e.target.value)"
                    min="1" max="10"
                    :disabled="!currentTemplate.purchaseList.includes(item.itemId)"
                  />
                  <span class="discount-unit">折</span>
                </label>
              </div>
            </div>

            <div class="switch-row">
              <span class="switch-label">付费招募</span
              ><n-switch v-model:value="currentTemplate.payRecruit" />
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">功法赠送验证密码</label>
            <n-input
              v-model:value="currentTemplate.legacyGiftPassword"
              placeholder="留空则使用手动输入"
              type="password"
              show-password-on="click"
              size="small"
            />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showTaskTemplateModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button @click="saveTaskTemplate" type="primary">保存模板</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Apply Template Modal -->
    <n-modal
      v-model:show="showApplyTemplateModal"
      preset="card"
      title="应用任务模板"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">选择模板</label>
            <n-select
              v-model:value="selectedTemplateId"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="请选择要应用的模板"
              size="small"
              style="width: 100%"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">选择账号</label>
            
            <!-- 分组快速选择 -->
            <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
              <div style="font-size: 12px; color: #86909c; margin-bottom: 8px">
                快速选择分组：
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <n-button
                  v-for="group in tokenGroups"
                  :key="group.id"
                  size="small"
                  @click="
                    () => {
                      const groupTokenIds = getValidGroupTokenIds(group.id);
                      groupTokenIds.forEach((id) => {
                        if (!selectedTokensForApply.includes(id)) {
                          selectedTokensForApply.push(id);
                        }
                      });
                    }
                  "
                  :style="{
                    borderColor: group.color,
                    color: group.color
                  }"
                  ghost
                >
                  {{ group.name }}
                </n-button>
                <div v-if="tokenGroups.length === 0" style="font-size: 12px; color: #ccc;">
                  暂无分组
                </div>
              </div>
            </div>

            <n-checkbox
              :checked="isAllSelectedForApply"
              :indeterminate="isIndeterminateForApply"
              @update:checked="handleSelectAllForApply"
            >
              全选
            </n-checkbox>
            <n-checkbox-group
              v-model:value="selectedTokensForApply"
              style="margin-top: 8px"
            >
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showApplyTemplateModal = false">取消</n-button>
          <n-button
            @click="applyTemplate"
            type="success"
            :disabled="
              !selectedTemplateId || selectedTokensForApply.length === 0
            "
            >应用模板</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- Template Manager Modal -->
    <n-modal
      v-model:show="showTemplateManagerModal"
      preset="card"
      title="任务模板管理"
      :bordered="false"
      style="width: 900px"
    >
      <div class="template-manager">
        <!-- 操作栏 -->
        <div class="template-toolbar">
          <n-space>
            <n-button type="primary" @click="openNewTemplateModal">
              <template #icon>
                <n-icon><AddCircleOutline /></n-icon>
              </template>
              新增模板
            </n-button>
            <n-button type="success" @click="openApplyTemplateModal">
              <template #icon>
                <n-icon><CheckmarkCircleOutline /></n-icon>
              </template>
              应用模板
            </n-button>
            <n-button type="info" @click="openAccountTemplateModal">
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
              引用统计
            </n-button>
            <n-divider vertical />
            <n-button @click="exportTaskTemplates" :loading="isExporting">
              <template #icon>
                <n-icon><CloudDownloadOutline /></n-icon>
              </template>
              导出
            </n-button>
            <n-upload
              :show-file-list="false"
              accept=".json"
              :custom-request="importTaskTemplates"
            >
              <n-button :loading="isImporting">
                <template #icon>
                  <n-icon><CloudUploadOutline /></n-icon>
                </template>
                导入
              </n-button>
            </n-upload>
          </n-space>
          <n-input
            v-model:value="templateSearchKeyword"
            placeholder="搜索模板名称..."
            clearable
            size="small"
            style="width: 220px"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
        </div>

        <!-- 模板列表 -->
        <div class="template-list-container">
          <n-empty
            v-if="filteredTaskTemplates.length === 0"
            description="暂无模板，点击上方按钮创建第一个模板"
            style="padding: 60px 0"
          >
            <template #icon>
              <n-icon :size="48" color="#c0c4cc">
                <DocumentTextOutline />
              </n-icon>
            </template>
          </n-empty>

          <div v-else class="template-grid">
            <n-card
              v-for="template in filteredTaskTemplates"
              :key="template.id"
              class="template-card"
              hoverable
              @click="openEditTemplateModal(template)"
            >
              <template #header>
                <div class="template-card-header">
                  <span class="template-name">{{ template.name }}</span>
                  <n-tag size="small" :type="getTemplateAccountCount(template.id) > 0 ? 'success' : 'default'">
                    {{ getTemplateAccountCount(template.id) }} 个账号
                  </n-tag>
                </div>
              </template>
              <template #footer>
                <div class="template-card-footer">
                  <span class="template-time">
                    {{ formatDate(template.updatedAt || template.createdAt) }}
                  </span>
                  <n-space>
                    <n-button
                      size="small"
                      text
                      @click.stop="openEditTemplateModal(template)"
                    >
                      <template #icon>
                        <n-icon><CreateOutline /></n-icon>
                      </template>
                      编辑
                    </n-button>
                    <n-button
                      size="small"
                      text
                      type="error"
                      @click.stop="deleteTaskTemplate(template.id)"
                    >
                      <template #icon>
                        <n-icon><TrashOutline /></n-icon>
                      </template>
                      删除
                    </n-button>
                  </n-space>
                </div>
              </template>
            </n-card>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTemplateManagerModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Account Template References Modal -->
    <n-modal
      v-model:show="showAccountTemplateModal"
      preset="card"
      title="账号模板引用查看"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div
          class="modal-header-actions"
          style="
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <div style="display: flex; gap: 8px; align-items: center">
            <span>共 {{ filteredAccountTemplates.length }} 个账号</span>
            <n-button
              @click="exportAccountReferences"
              type="default"
              size="small"
              :loading="isExporting"
              >导出引用</n-button
            >
            <n-upload
              :show-file-list="false"
              accept=".json"
              :custom-request="importAccountReferences"
            >
              <n-button type="default" size="small" :loading="isImporting">导入引用</n-button>
            </n-upload>
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <label style="font-size: 12px; color: #86909c">按模板筛选:</label>
            <n-select
              v-model:value="selectedTemplateForFilter"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="全部模板"
              size="small"
              @update:value="filterAccountTemplates"
              style="width: 180px"
            />
          </div>
        </div>

        <!-- Account Template List -->
        <div
          class="account-template-list"
          style="max-height: 400px; overflow-y: auto; margin-bottom: 16px"
        >
          <n-card
            v-for="item in filteredAccountTemplates"
            :key="item.tokenId"
            size="small"
            style="margin-bottom: 12px"
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <div>
                <h4 style="margin: 0; margin-bottom: 4px">
                  {{ item.tokenName }}
                </h4>
              </div>
              <div>
                <n-tag
                  :type="item.templateId ? 'success' : 'default'"
                  size="small"
                >
                  {{ item.templateName }}
                </n-tag>
              </div>
            </div>
          </n-card>
          <div
            v-if="filteredAccountTemplates.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无账号数据
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showAccountTemplateModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Legacy Gift Modal -->
    <n-modal
      v-model:show="showLegacyGiftModal"
      preset="card"
      title="批量功法残卷赠送"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <!-- 接收者ID输入 -->
          <div class="setting-item">
            <label class="setting-label">接收者ID</label>
            <n-space>
              <n-input-number
                v-model:value="recipientIdInput"
                placeholder="ID"
                :show-button="false"
                @update:value="clearRecipientError"
                style="width: 200px"
              />
              <n-button
                type="primary"
                @click="queryRecipientInfo"
                :disabled="!recipientIdInput || isQueryingRecipient || !hasPasswordForSelectedTokens"
              >
                查询
              </n-button>
            </n-space>
            <n-text
              v-if="recipientIdError"
              type="error"
              style="margin-top: 5px; display: block"
            >
              {{ recipientIdError }}
            </n-text>
            <!-- 密码状态提示 -->
            <n-text
              v-if="passwordStatusMessage"
              :type="passwordStatusType"
              style="margin-top: 8px; display: block; font-size: 12px;"
            >
              {{ passwordStatusMessage }}
            </n-text>
          </div>

          <!-- 接收者信息展示 -->
          <div class="setting-item" v-if="recipientInfo">
            <label class="setting-label">接收者信息</label>
            <div
              class="recipient-info"
              style="
                background: #f7f8fa;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                display: flex;
                align-items: flex-start;
                gap: 16px;
                transition: all 0.3s ease;
              "
            >
              <!-- 头像部分 -->
              <div
                class="avatar-container"
                style="
                  position: relative;
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.3s ease;
                "
              >
                <img
                  v-if="recipientInfo.avatarUrl && !avatarLoadError"
                  :src="recipientInfo.avatarUrl"
                  alt="角色头像"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.3s ease;
                  "
                  @error="handleAvatarError"
                  @load="handleAvatarLoad"
                />
                <!-- 头像加载失败或未设置时的 fallback -->
                <div
                  v-else
                  class="avatar-fallback"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                  "
                >
                  {{ (recipientInfo.name || "未知角色")[0] || "?" }}
                </div>
                <!-- 加载指示器 -->
                <div
                  v-if="isAvatarLoading"
                  class="avatar-loading"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                  "
                >
                  <div
                    class="loading-spinner"
                    style="
                      width: 30px;
                      height: 30px;
                      border: 3px solid rgba(255, 255, 255, 0.3);
                      border-top: 3px solid white;
                      border-radius: 50%;
                      animation: spin 1s linear infinite;
                    "
                  ></div>
                </div>
              </div>

              <!-- 角色信息部分 -->
              <div class="role-info" style="flex: 1; min-width: 0">
                <div
                  style="
                    margin-bottom: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #1d2129;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                  "
                >
                  {{ recipientInfo.name || "未知角色" }}
                </div>
                <div
                  class="role-info-grid"
                  style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                  "
                >
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      角色ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.roleId }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      服务器
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.serverName }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      战力
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 16px; font-weight: 600; color: #667eea"
                    >
                      {{ recipientInfo.power }} {{ recipientInfo.powerUnit }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionName || "无" }}
                    </div>
                  </div>
                  <div class="info-item" style="grid-column: 1 / -1">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionId || "无" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showLegacyGiftModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button
            type="primary"
            @click="confirmLegacyGift"
            :disabled="!recipientIdInput || !recipientInfo"
          >
            开始赠送
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Helper Modal (开箱/钓鱼/招募/一键宝箱周开箱) -->
    <n-modal
      v-model:show="showHelperModal"
      preset="card"
      :title="helperModalTitle"
      style="width: 90%; max-width: 400px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item" v-if="helperType === 'box'">
            <label class="setting-label">宝箱类型</label>
            <n-select
              v-model:value="helperSettings.boxType"
              :options="boxTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'fish'">
            <label class="setting-label">鱼竿类型</label>
            <n-select
              v-model:value="helperSettings.fishType"
              :options="fishTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'pointsBox'">
            <label class="setting-label">目标轮数（1-4轮，每轮8000积分）</label>
            <n-input-number
              v-model:value="helperSettings.targetRounds"
              :min="1"
              :max="4"
              :step="1"
              size="small"
              style="width: 100%"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'weeklyMarket'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">选择要购买的商品（每种只能购买一次）</label>
            <n-checkbox-group v-model:value="helperSettings.weeklyMarketItems">
              <n-space item-style="display: flex;" vertical>
                <n-checkbox value="0">免费金砖</n-checkbox>
                <n-checkbox value="1">黑市见面礼</n-checkbox>
                <n-checkbox value="2">黑市惊喜礼</n-checkbox>
                <n-checkbox value="3">初级黑市包</n-checkbox>
                <n-checkbox value="4">中级黑市包</n-checkbox>
                <n-checkbox value="5">高级黑市包</n-checkbox>
                <n-checkbox value="6">顶级鱼竿包</n-checkbox>
                <n-checkbox value="7">白玉黑市包</n-checkbox>
                <n-checkbox value="8">特级灵贝包</n-checkbox>
                <n-checkbox value="9">养成补给包</n-checkbox>
              </n-space>
            </n-checkbox-group>
          </div>
          <n-alert v-if="helperType === 'weeklyMarket'" type="info" style="margin-bottom: 12px">
            黑市周商品说明：<br/>
            • 每种商品每周只能购买一次<br/>
            • 活动ID: 9（黑市周活动）<br/>
            • 自动跳过已购买的商品
          </n-alert>
          <n-alert v-if="helperType === 'pointsBox'" :type="isBoxWeeklyActivityOpen ? 'info' : 'warning'" style="margin-bottom: 12px">
            <div v-if="isBoxWeeklyActivityOpen">
              开箱优先级: 木质宝箱(保留200个) → 青铜宝箱 → 黄金宝箱 → 铂金宝箱<br/>
              积分: 木质=1分, 青铜=10分, 黄金=20分, 铂金=50分<br/>
              执行流程: 获取当前积分 → 计算缺少积分 → 按顺序开箱 → 领取积分值宝箱 → 领取宝箱周达标奖励
            </div>
            <div v-else>
              ⚠️ 当前不是宝箱周，此功能仅在宝箱周期间可用
            </div>
          </n-alert>
          <div class="setting-item" v-if="helperType === 'cdk'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">兑换码</label>
            <n-input
              v-model:value="helperSettings.cdkCode"
              placeholder="请输入兑换码"
              size="small"
              clearable
            />
          </div>
          <div class="setting-item" v-if="helperType === 'cheer'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">助威数量（0 = 使用全部道具，上限3000）</label>
            <n-input-number
              v-model:value="helperSettings.cheerQty"
              :min="0"
              :max="99999"
              :step="100"
              size="small"
              placeholder="0=全部使用"
            />
          </div>
          <div class="setting-item" v-if="helperType !== 'pointsBox' && helperType !== 'weeklyMarket' && helperType !== 'cdk' && helperType !== 'cheer'">
            <label class="setting-label">消耗数量（10的倍数）</label>
            <n-input-number
              v-model:value="helperSettings.count"
              :min="10"
              :max="10000"
              :step="10"
              size="small"
            />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showHelperModal = false" style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="executeHelper">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 英雄四圣升级 Modal -->
    <n-modal
      v-model:show="showHeroFourSaintsModal"
      preset="card"
      title="英雄四圣升级配置"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="warning" show-icon style="margin-bottom: 12px">
            注意：四圣升级每次只能选择一个英雄进行升级！<br/>
            如果英雄未开启四圣或缺少红玉/蓝玉，将自动跳过。
          </n-alert>
          
          <n-radio-group v-model:value="selectedHeroSingle" name="heroGroup">
            <n-grid :cols="3" :x-gap="12" :y-gap="8">
              <n-grid-item v-for="hero in heroOptions" :key="hero.value">
                <n-radio :value="hero.value">
                  {{ hero.label }}
                </n-radio>
              </n-grid-item>
            </n-grid>
          </n-radio-group>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showHeroFourSaintsModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeHeroFourSaintsUpgrade" :disabled="!selectedHeroSingle">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 盐晶商店购买 Modal -->
    <n-modal
      v-model:show="showSaltCrystalShopModal"
      preset="card"
      title="盐晶商店购买配置"
      style="width: 90%; max-width: 500px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 12px">
          勾选需要购买的商品并设置次数，盐晶不足时将自动停止购买。
        </n-alert>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="item in saltCrystalShopConfig" :key="item.id"
               style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <n-checkbox v-model:checked="item._checked"
                        @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }" />
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ item.name }}</div>
              <div style="font-size: 12px; color: #888;">{{ item.cost }}盐晶/次 · 限购{{ item.limit }}次</div>
            </div>
            <n-input-number v-model:value="item.count" :min="0" :max="item.limit" size="small"
                            style="width: 100px;"
                            @update:value="(val) => { item._checked = val > 0; }" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showSaltCrystalShopModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeSaltCrystalShopBuy" :disabled="isRunning">开始购买</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 盐锭商店购买 Modal -->
    <n-modal
      v-model:show="showSaltIngotShopModal"
      preset="card"
      title="盐锭商店购买配置"
      style="width: 90%; max-width: 500px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 12px">
          勾选需要购买的商品并设置次数，盐锭不足时将自动停止购买。
        </n-alert>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="item in saltIngotShopConfig" :key="item.id"
               style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <n-checkbox v-model:checked="item._checked"
                        @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }" />
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ item.name }}</div>
              <div style="font-size: 12px; color: #888;">{{ item.cost }}盐锭/次 · 限购{{ item.limit }}次</div>
            </div>
            <n-input、-number v-model:value="item.count" :min="0" :max="item.limit" size="small"
                            style="width: 100px;"
                            @update:value="(val) => { item._checked = val > 0; }" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showSaltIngotShopModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeSaltIngotShopBuy" :disabled="isRunning">开始购买</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 多选购买 Modal -->
    <n-modal
      v-model:show="showManualBuyModal"
      preset="card"
      title="黑市商品购买配置"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 14px">
          勾选需要购买的商品并设置次数，每购买一次将刷新商品列表。
        </n-alert>
        <n-grid :cols="2" :x-gap="10" :y-gap="8">
          <n-grid-item v-for="item in manualBuyConfig" :key="item.goodsId">
            <div class="manual-buy-item" :class="{ 'is-checked': item._checked }">
              <n-checkbox v-model:checked="item._checked"
                          @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }">
                <span class="manual-buy-label">{{ item.name }}</span>
              </n-checkbox>
              <n-input-number v-if="item._checked"
                              v-model:value="item.count" :min="1" :max="99" size="tiny"
                              style="width: 72px;"
                              @update:value="(val) => { if (val <= 0) item._checked = false; }" />
            </div>
          </n-grid-item>
        </n-grid>
        <div style="margin-top: 12px; padding: 8px 12px; background: #f5f5f5; border-radius: 6px; font-size: 13px; color: #666;">
          已选 {{ manualBuyConfig.filter(i => i._checked && i.count > 0).length }} 个商品
        </div>
        <div class="modal-actions" style="margin-top: 16px; text-align: right">
          <n-button @click="showManualBuyModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeManualBuy" :disabled="isRunning">开始购买</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 宝箱周自选大奖 Modal -->
    <n-modal
      v-model:show="showBoxWeeklyRewardModal"
      preset="card"
      title="宝箱周自选大奖配置"
      style="width: 90%; max-width: 700px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="info" show-icon style="margin-bottom: 12px">
            请选择要领取的大奖，并为每个大奖设置领取次数（总计最多4次）：<br/>
            已配置: {{ totalBoxWeeklyRewardCount }}/4次
          </n-alert>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div v-for="reward in boxWeeklyRewardOptions" :key="reward.value" 
                 style="display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
              <n-checkbox :checked="selectedBoxWeeklyRewards.includes(reward.value)"
                          @update:checked="(checked) => toggleBoxWeeklyReward(reward.value, checked)"
                          :disabled="!selectedBoxWeeklyRewards.includes(reward.value) && totalBoxWeeklyRewardCount >= 4"
                          style="flex: 1;">
                {{ reward.label }}
              </n-checkbox>
              <n-input-number v-if="selectedBoxWeeklyRewards.includes(reward.value)"
                              v-model:value="boxWeeklyRewardCounts[reward.value]"
                              :min="1"
                              :max="4 - (totalBoxWeeklyRewardCount - (boxWeeklyRewardCounts[reward.value] || 1))"
                              :disabled="!selectedBoxWeeklyRewards.includes(reward.value)"
                              size="small"
                              style="width: 80px;"
                              placeholder="次数" />
              <span v-if="selectedBoxWeeklyRewards.includes(reward.value)" style="color: #666; font-size: 12px;">次</span>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showBoxWeeklyRewardModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeBoxWeeklyRewards" :disabled="totalBoxWeeklyRewardCount === 0 || totalBoxWeeklyRewardCount > 4">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Dream Buy Modal -->
    <n-modal
      v-model:show="showDreamBuyModal"
      preset="card"
      title="梦境商品购买配置"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="info" show-icon style="margin-bottom: 12px">
            请勾选需要购买的商品。只会购买列表中存在的商品。
          </n-alert>
          
          <div style="display: flex; gap: 12px; margin-bottom: 12px">
            <n-button size="small" type="warning" @click="selectGoldItems">
              一键勾选金币商品
            </n-button>
            <n-button size="small" @click="selectAllItems">
              全选所有
            </n-button>
            <n-button size="small" @click="clearAllItems">
              清空选择
            </n-button>
          </div>

          <div v-for="(merchant, id) in merchantConfig" :key="id" style="margin-bottom: 16px">
            <div style="font-weight: bold; margin-bottom: 8px">{{ merchant.name }}</div>
            <n-grid :cols="3" :x-gap="12" :y-gap="8">
              <n-grid-item v-for="(item, index) in merchant.items" :key="index">
                <n-checkbox
                  :value="`${id}-${index}`"
                  :checked="dreamBuyList.includes(`${id}-${index}`)"
                  @update:checked="(checked) => toggleDreamItem(`${id}-${index}`, checked)"
                >
                  {{ item }}
                </n-checkbox>
              </n-grid-item>
            </n-grid>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showDreamBuyModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="saveDreamBuyConfig">保存配置</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Tasks List Modal -->
    <n-modal
      v-model:show="showTasksModal"
      preset="card"
      title="📋 定时任务列表"
      style="width: 95%; max-width: 850px;"
      :segmented="{ content: true }"
    >
      <!-- 全局操作按钮 -->
      <div v-if="scheduledTasks.length > 0" style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <n-button
          size="small"
          :type="allTasksEnabled ? 'error' : 'success'"
          @click="allTasksEnabled ? disableAllScheduledTasks() : enableAllScheduledTasks()"
        >
          {{ allTasksEnabled ? '关闭所有任务' : '启动所有任务' }}
        </n-button>
        <n-button
          size="small"
          type="error"
          @click="deleteAllScheduledTasks"
        >
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
          批量删除所有任务
        </n-button>
      </div>
      <div class="tasks-list-container" style="max-height: 70vh; overflow-y: auto;">
        <n-empty 
          v-if="scheduledTasks.length === 0" 
          description="暂无定时任务，点击上方'新增任务'按钮创建"
          style="padding: 60px 0"
        >
          <template #icon>
            <n-icon :size="48" color="#c0c4cc">
              <DocumentTextOutline />
            </n-icon>
          </template>
        </n-empty>

        <div v-else class="tasks-grid">
          <div
            v-for="task in scheduledTasks"
            :key="task.id"
            class="task-card"
          >
            <!-- 任务头部 -->
            <div class="task-card-header">
              <div class="task-header-left">
                <span class="task-status-dot" :class="{ 'enabled': task.enabled, 'disabled': !task.enabled }"></span>
                <span class="task-name">{{ task.name }}</span>
              </div>
              <n-switch
                v-model:value="task.enabled"
                @update:value="toggleTaskEnabled(task.id, $event)"
                size="small"
                class="feature-switch"
              >
                <template #checked>禁用</template>
                <template #unchecked>禁用</template>
              </n-switch>
            </div>

            <!-- 任务信息 -->
            <div class="task-card-body">
              <div class="task-info-grid">
                <div class="task-info-item">
                  <span class="info-label">运行类型</span>
                  <span class="info-value">
                    <n-tag size="small" :type="task.runType === 'daily' ? 'blue' : 'purple'" :bordered="false">
                      {{ task.runType === "daily" ? "每天固定时间" : "Cron表达式" }}
                    </n-tag>
                  </span>
                </div>

                <div class="task-info-item">
                  <span class="info-label">运行时间</span>
                  <span class="info-value code">
                    {{ task.runType === "daily" ? task.runTime : task.cronExpression }}
                  </span>
                </div>

                <div class="task-info-item">
                  <span class="info-label">下次执行</span>
                  <span 
                    class="info-value countdown"
                    :class="{
                      'near-execution': taskCountdowns[task.id]?.isNearExecution,
                      'disabled': !task.enabled
                    }"
                  >
                    {{ task.enabled ? (taskCountdowns[task.id]?.formatted || "计算中...") : "已禁用" }}
                  </span>
                </div>

                <div class="task-info-item">
                  <span class="info-label">选中账号</span>
                  <span class="info-value">
                    <n-tag size="small" type="info" :bordered="false">
                      {{ task.selectedTokens.length }} 个
                    </n-tag>
                  </span>
                </div>

                <div class="task-info-item">
                  <span class="info-label">选中任务</span>
                  <span class="info-value">
                    <n-tag size="small" type="success" :bordered="false">
                      {{ task.selectedTasks.length }} 个
                    </n-tag>
                  </span>
                </div>

                <div class="task-info-item" v-if="task.offlineTimeEnabled">
                  <span class="info-label">不上线时段</span>
                  <span class="info-value">
                    <n-tag size="small" type="warning" :bordered="false">
                      已开启
                    </n-tag>
                  </span>
                </div>
                
                <!-- 助威商店配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('legion_buy_store_items') && task.legionStoreItems">
                  <span class="info-label">助威商店</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.legionStoreItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>

                <!-- 消耗活动兑换商店配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchActivityExchange') && task.activityExchangeItems">
                  <span class="info-label">兑换商店</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.activityExchangeItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>
                
                <!-- 盐晶商店配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('salt_crystal_shop_buy') && task.saltCrystalShopItems">
                  <span class="info-label">盐晶商店</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.saltCrystalShopItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>
                
                <!-- 盐锭商店配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('salt_ingot_shop_buy') && task.saltIngotShopItems">
                  <span class="info-label">盐锭商店</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.saltIngotShopItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>
                
                <!-- 黑市多选购买配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('manual_buy') && task.manualBuyItems">
                  <span class="info-label">黑市多选</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.manualBuyItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>
                
                <!-- 黑市周购买配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('weekly_market_buy') && task.weeklyMarketItems">
                  <span class="info-label">黑市周购买</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.weeklyMarketItems).filter(i => i && i.selected).length }} 件商品
                    </n-tag>
                  </span>
                </div>
                
                <!-- 宝箱周奖励配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchClaimBoxWeeklyRewards') && task.boxWeeklyRewards">
                  <span class="info-label">宝箱周奖励</span>
                  <span class="info-value">
                    <n-tag size="small" type="orange" :bordered="false">
                      {{ Object.values(task.boxWeeklyRewards).reduce((sum, count) => sum + (count || 0), 0) }}/4次
                    </n-tag>
                  </span>
                </div>
              </div>
            </div>

            <!-- 任务操作 -->
            <div class="task-card-footer">
              <n-button size="small" @click="editTask(task)">
                <template #icon>
                  <n-icon><CreateOutline /></n-icon>
                </template>
                编辑
              </n-button>
              <n-button
                size="small"
                type="info"
                secondary
                :loading="executingTaskIds.includes(task.id)"
                @click="manualExecuteTask(task)"
              >
                <template #icon>
                  <n-icon><PlayOutline /></n-icon>
                </template>
                立即执行
              </n-button>
              <n-button size="small" type="error" @click="deleteTask(task.id)">
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
                删除
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </n-modal>

    <!-- Task Modal -->
    <n-modal
      v-model:show="showTaskModal"
      preset="card"
      :title="editingTask ? '编辑定时任务' : '新增定时任务'"
      style="width: 95%; max-width: 650px;"
      :closable="true"
      :mask-closable="false"
      :segmented="{ content: true }"
      @close="showTaskModal = false"
    >
      <div class="task-form-container" style="max-height: 70vh; overflow-y: auto;">
        <!-- 基础配置区 -->
        <div class="form-section">
          <div class="section-title">📋 基础配置</div>
          <div class="settings-grid">
            <div class="setting-item">
              <label class="setting-label">任务名称</label>
              <n-input
                v-model:value="taskForm.name"
                placeholder="请输入任务名称"
                size="large"
              />
            </div>
            
            <div class="setting-item">
              <label class="setting-label">运行类型</label>
              <n-radio-group v-model:value="taskForm.runType" @update:value="resetRunType">
                <n-radio-button value="daily">每天固定时间</n-radio-button>
                <n-radio-button value="cron">Cron表达式</n-radio-button>
              </n-radio-group>
            </div>
            
            <div class="setting-item" v-if="taskForm.runType === 'daily'">
              <label class="setting-label">运行时间</label>
              <n-time-picker v-model:value="taskForm.runTime" format="HH:mm" size="large" />
            </div>
            
            <div class="setting-item" v-if="taskForm.runType === 'cron'">
              <label class="setting-label">Cron表达式</label>
              <n-input
                v-model:value="taskForm.cronExpression"
                placeholder="例: 0 9 * * * (每天9点执行)"
                @input="parseCronExpression"
                size="large"
              />

              <!-- Cron表达式解析结果 -->
              <div class="cron-parser" v-if="taskForm.cronExpression" style="margin-top: 12px;">
                <n-alert :type="cronValidation.valid ? 'success' : 'error'" size="small" style="margin-bottom: 8px;">
                  <template #icon>
                    <span>{{ cronValidation.valid ? '✓' : '✗' }}</span>
                  </template>
                  {{ cronValidation.message }}
                </n-alert>

                <!-- 未来执行时间 -->
                <n-alert v-if="cronValidation.valid && cronNextRuns.length > 0" type="info" size="small">
                  <template #header>
                    <span style="font-size: 12px;">📅 未来5次执行时间</span>
                  </template>
                  <div style="font-size: 11px; line-height: 1.8;">
                    <div v-for="(run, index) in cronNextRuns" :key="index">
                      {{ index + 1 }}. {{ run }}
                    </div>
                  </div>
                </n-alert>
              </div>
            </div>
          </div>
        </div>

        <!-- 账号选择区 -->
        <div class="form-section">
          <div class="section-title">👥 选择账号</div>
          
          <!-- 操作按钮 -->
          <div class="section-toolbar">
            <n-button-group size="small">
              <n-button @click="selectAllTokens">全选</n-button>
              <n-button @click="deselectAllTokens">全不选</n-button>
            </n-button-group>
          </div>

          <!-- 分组快速选择 -->
          <div class="group-selector" v-if="tokenGroups.length > 0">
            <div class="group-selector-header">
              <span class="group-selector-label">快速选择分组</span>
              <n-button type="primary" size="small" text @click="showGroupManageModal = true">
                <template #icon><n-icon><SettingsOutline /></n-icon></template>
                管理分组
              </n-button>
            </div>
            <div class="group-tags">
              <n-tag
                v-for="group in tokenGroups"
                :key="group.id"
                size="medium"
                :type="taskScheduleSelectedGroupIds.includes(group.id) ? 'primary' : 'default'"
                :bordered="false"
                @click="() => {
                  const index = taskScheduleSelectedGroupIds.indexOf(group.id);
                  const groupTokenIds = getValidGroupTokenIds(group.id);
                  
                  if (index > -1) {
                    taskScheduleSelectedGroupIds.splice(index, 1);
                    taskForm.selectedTokens = taskForm.selectedTokens.filter(
                      (id) => !groupTokenIds.includes(id),
                    );
                  } else {
                    taskScheduleSelectedGroupIds.push(group.id);
                    groupTokenIds.forEach((id) => {
                      if (!taskForm.selectedTokens.includes(id)) {
                        taskForm.selectedTokens.push(id);
                      }
                    });
                  }
                }"
                style="cursor: pointer;"
              >
                {{ group.name }}
              </n-tag>
            </div>
          </div>

          <!-- 账号列表 -->
          <div class="token-list">
            <n-checkbox-group v-model:value="taskForm.selectedTokens">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <n-checkbox :value="token.id" size="large">
                    {{ token.name }}
                  </n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
        </div>

        <!-- 任务选择区 -->
        <div class="form-section">
          <div class="section-title">⚙️ 选择任务</div>
          
          <!-- 操作按钮 -->
          <div class="section-toolbar">
            <n-button-group size="small">
              <n-button @click="selectAllTasks">全选</n-button>
              <n-button @click="deselectAllTasks">全不选</n-button>
            </n-button-group>
          </div>
          
          <n-checkbox-group v-model:value="taskForm.selectedTasks">
            <n-tabs type="line" animated size="medium">
              <n-tab-pane 
                v-for="group in taskGroupDefinitions" 
                :key="group.name" 
                :name="group.name" 
                :tab="group.label"
              >
                <n-grid :cols="2" :x-gap="12" :y-gap="8" style="padding-top: 12px;">
                  <n-grid-item v-for="task in groupedAvailableTasks[group.name]" :key="task.value">
                    <n-checkbox :value="task.value" size="large">{{ task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
              
              <n-tab-pane 
                v-if="groupedAvailableTasks['other'] && groupedAvailableTasks['other'].length > 0" 
                name="other" 
                tab="其他"
              >
                <n-grid :cols="2" :x-gap="12" :y-gap="8" style="padding-top: 12px;">
                  <n-grid-item v-for="task in groupedAvailableTasks['other']" :key="task.value">
                    <n-checkbox :value="task.value" size="large">{{ task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
            </n-tabs>
          </n-checkbox-group>
          
          <!-- 助威商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('legion_buy_store_items')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏪 助威商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in legionStoreItemOptions" :key="option.value">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.legionStoreItems && taskForm.legionStoreItems[option.value] && taskForm.legionStoreItems[option.value].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.legionStoreItems) taskForm.legionStoreItems = {};
                        if (!taskForm.legionStoreItems[option.value]) {
                          taskForm.legionStoreItems[option.value] = { selected: false, count: 1, label: option.label, min: option.min, max: option.max };
                        }
                        taskForm.legionStoreItems[option.value].selected = checked;
                      }"
                    >
                      {{ option.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.legionStoreItems && taskForm.legionStoreItems[option.value] && taskForm.legionStoreItems[option.value].selected"
                      v-model:value="taskForm.legionStoreItems[option.value].count"
                      :min="option.min || 1"
                      :max="option.max || 1"
                      :disabled="!taskForm.legionStoreItems[option.value].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              
              <n-alert v-if="!taskForm.legionStoreItems || Object.values(taskForm.legionStoreItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>

          <!-- 消耗活动兑换商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchActivityExchange')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏪 消耗活动兑换商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="item in activityExchangeItemOptions" :key="item.suffix">
                  <div class="store-item" style="display: flex; align-items: center; gap: 8px;">
                    <n-checkbox
                      :checked="taskForm.activityExchangeItems && taskForm.activityExchangeItems[item.suffix] && taskForm.activityExchangeItems[item.suffix].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.activityExchangeItems) taskForm.activityExchangeItems = {};
                        if (!taskForm.activityExchangeItems[item.suffix]) {
                          taskForm.activityExchangeItems[item.suffix] = { selected: false, count: item.maxCount };
                        }
                        taskForm.activityExchangeItems[item.suffix].selected = checked;
                      }"
                    >
                      {{ item.name }} (限购{{ item.maxCount }})
                    </n-checkbox>
                    <n-input-number
                      v-if="item.maxCount > 1 && taskForm.activityExchangeItems && taskForm.activityExchangeItems[item.suffix] && taskForm.activityExchangeItems[item.suffix].selected"
                      v-model:value="taskForm.activityExchangeItems[item.suffix].count"
                      :min="1"
                      :max="item.maxCount"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.activityExchangeItems || Object.values(taskForm.activityExchangeItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>

          <!-- 盐晶商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('salt_crystal_shop_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🧂 盐晶商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in saltCrystalShopItemOptions" :key="option.value">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.saltCrystalShopItems && taskForm.saltCrystalShopItems[option.value] && taskForm.saltCrystalShopItems[option.value].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.saltCrystalShopItems) taskForm.saltCrystalShopItems = {};
                        if (!taskForm.saltCrystalShopItems[option.value]) {
                          taskForm.saltCrystalShopItems[option.value] = { selected: false, count: 1, label: option.label, min: option.min, max: option.max };
                        }
                        taskForm.saltCrystalShopItems[option.value].selected = checked;
                      }"
                    >
                      {{ option.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.saltCrystalShopItems && taskForm.saltCrystalShopItems[option.value] && taskForm.saltCrystalShopItems[option.value].selected"
                      v-model:value="taskForm.saltCrystalShopItems[option.value].count"
                      :min="option.min || 1"
                      :max="option.max || 1"
                      :disabled="!taskForm.saltCrystalShopItems[option.value].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.saltCrystalShopItems || Object.values(taskForm.saltCrystalShopItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>

          <!-- 盐锭商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('salt_ingot_shop_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🧂 盐锭商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in saltIngotShopItemOptions" :key="option.value">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.saltIngotShopItems && taskForm.saltIngotShopItems[option.value] && taskForm.saltIngotShopItems[option.value].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.saltIngotShopItems) taskForm.saltIngotShopItems = {};
                        if (!taskForm.saltIngotShopItems[option.value]) {
                          taskForm.saltIngotShopItems[option.value] = { selected: false, count: 1, label: option.label, min: option.min, max: option.max };
                        }
                        taskForm.saltIngotShopItems[option.value].selected = checked;
                      }"
                    >
                      {{ option.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.saltIngotShopItems && taskForm.saltIngotShopItems[option.value] && taskForm.saltIngotShopItems[option.value].selected"
                      v-model:value="taskForm.saltIngotShopItems[option.value].count"
                      :min="option.min || 1"
                      :max="option.max || 1"
                      :disabled="!taskForm.saltIngotShopItems[option.value].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.saltIngotShopItems || Object.values(taskForm.saltIngotShopItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>

          <!-- 黑市多选购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('manual_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🛒 黑市多选购买 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in manualBuyItemOptions" :key="option.value">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.manualBuyItems && taskForm.manualBuyItems[option.value] && taskForm.manualBuyItems[option.value].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.manualBuyItems) taskForm.manualBuyItems = {};
                        if (!taskForm.manualBuyItems[option.value]) {
                          taskForm.manualBuyItems[option.value] = { selected: false, count: 0, label: option.label };
                        }
                        taskForm.manualBuyItems[option.value].selected = checked;
                        if (checked && !taskForm.manualBuyItems[option.value].count) taskForm.manualBuyItems[option.value].count = 1;
                      }"
                    >
                      {{ option.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.manualBuyItems && taskForm.manualBuyItems[option.value] && taskForm.manualBuyItems[option.value].selected"
                      v-model:value="taskForm.manualBuyItems[option.value].count"
                      :min="1"
                      :max="99"
                      :disabled="!taskForm.manualBuyItems[option.value].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.manualBuyItems || Object.values(taskForm.manualBuyItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>
          
          <!-- 宝箱达标奖励自选大奖配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchClaimBoxWeeklyRewards')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🎁 宝箱达标奖励自选大奖配置</span>
            </div>
            <div class="config-card-content">
              <n-alert :type="isBoxWeeklyActivityOpen ? 'info' : 'warning'" size="small" style="margin-bottom: 12px;">
                <div v-if="isBoxWeeklyActivityOpen">
                  请选择要领取的大奖，并为每个大奖设置领取次数（总计最多4次）<br/>
                  <strong>已配置: {{ totalTaskBoxWeeklyRewardCount }}/4次</strong>
                </div>
                <div v-else>
                  ⚠️ 当前不是宝箱周，此任务将在宝箱周期间自动执行
                </div>
              </n-alert>
              
              <n-grid :cols="1" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="reward in boxWeeklyRewardOptions" :key="reward.value">
                  <div class="reward-item">
                    <n-checkbox 
                      :checked="taskForm.boxWeeklyRewards[reward.value] && taskForm.boxWeeklyRewards[reward.value] > 0"
                      @update:checked="(checked) => toggleTaskBoxWeeklyReward(reward.value, checked)"
                      :disabled="!taskForm.boxWeeklyRewards[reward.value] && totalTaskBoxWeeklyRewardCount >= 4"
                    >
                      {{ reward.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.boxWeeklyRewards[reward.value] && taskForm.boxWeeklyRewards[reward.value] > 0"
                      v-model:value="taskForm.boxWeeklyRewards[reward.value]"
                      :min="1"
                      :max="4 - (totalTaskBoxWeeklyRewardCount - taskForm.boxWeeklyRewards[reward.value])"
                      size="small"
                      style="width: 80px;"
                      placeholder="次数" 
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              
              <n-alert v-if="totalTaskBoxWeeklyRewardCount === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个奖励
              </n-alert>
            </div>
          </div>
          
          <!-- 黑市周购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('weekly_market_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title"> 黑市周购买 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                每种商品每周只能购买一次，活动ID: 9，自动跳过已购买的商品
              </n-alert>
                        
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in weeklyMarketItemOptions" :key="option.value">
                  <n-checkbox 
                    :checked="taskForm.weeklyMarketItems && taskForm.weeklyMarketItems[option.value] && taskForm.weeklyMarketItems[option.value].selected"
                    @update:checked="(checked) => {
                      if (!taskForm.weeklyMarketItems) taskForm.weeklyMarketItems = {};
                      if (!taskForm.weeklyMarketItems[option.value]) {
                        taskForm.weeklyMarketItems[option.value] = { selected: false, label: option.label };
                      }
                      taskForm.weeklyMarketItems[option.value].selected = checked;
                    }"
                  >
                    {{ option.label }}
                  </n-checkbox>
                </n-grid-item>
              </n-grid>
                        
              <n-alert v-if="!taskForm.weeklyMarketItems || Object.values(taskForm.weeklyMarketItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少选择一个商品
              </n-alert>
            </div>
          </div>
          
          <!-- 智能发车条件配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchSmartSendCar')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🚗 智能发车 - 发车条件</span>
              <n-switch v-model:value="taskForm.smartDeparture.enabled" size="small">
                <template #checked>启用自定义</template>
                <template #unchecked>使用全局设置</template>
              </n-switch>
            </div>
            <div class="config-card-content" v-if="taskForm.smartDeparture && taskForm.smartDeparture.enabled">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                启用后将覆盖全局设置中的智能发车条件，仅对此定时任务生效
              </n-alert>
              <div class="settings-grid-responsive">
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">最低品质</label>
                  <n-select
                    v-model:value="taskForm.smartDeparture.carMinColor"
                    :options="[
                      { label: '绿·普通', value: 1 },
                      { label: '蓝·稀有', value: 2 },
                      { label: '紫·史诗', value: 3 },
                      { label: '橙·传说', value: 4 },
                      { label: '红·神话', value: 5 },
                      { label: '金·传奇', value: 6 },
                    ]"
                    size="small"
                    class="input-responsive"
                  />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">金砖 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.goldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">招募令 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.recruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">白玉 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.jadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">刷新券 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.ticketThreshold" :min="0" :step="1" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="刷新车辆后等待服务端数据同步的延迟时间（秒）">刷新延迟(秒)</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.refreshDelay" :min="0" :max="30" :step="1" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="开启后，满足自定义条件(金砖/招募令/白玉/刷新券)时，车辆还必须达到最低品质才会发车">品质必须同时满足</label>
                  <n-switch v-model:value="taskForm.smartDeparture.requireMinColorWithConditions" size="small">
                    <template #checked>开</template>
                    <template #unchecked>关</template>
                  </n-switch>
                </div>
              </div>
            </div>
          </div>

          <!-- 十殿阎罗挑战预设选择 -->
          <div v-if="taskForm.selectedTasks.includes('batchNightmareChallengePresets')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⚔️ 十殿阎罗挑战 - 选择预设</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                选择要执行的十殿预设，按顺序依次执行（后台模式）。如无可选预设，请先在十殿挑战弹窗中创建预设
              </n-alert>
              <div v-if="nightmarePresetOptions.length > 0" class="nightmare-preset-list">
                <div v-for="preset in nightmarePresetOptions" :key="preset.id" class="nightmare-preset-item">
                  <n-checkbox
                    :checked="taskForm.nightmarePresetIds.includes(preset.id)"
                    @update:checked="(checked) => onNightmarePresetToggle(preset, checked)"
                  >
                    <span class="preset-item-label">
                      {{ preset.name }}
                      <n-tag size="tiny" type="info" :bordered="false" style="margin-left: 4px;">👑{{ preset.captainName }}</n-tag>
                      <n-tag size="tiny" :type="preset.totalMembers > 1 ? 'success' : 'default'" :bordered="false">
                        👥{{ preset.totalMembers }}人
                      </n-tag>
                    </span>
                  </n-checkbox>
                </div>
              </div>
              <n-alert v-else type="warning" size="small">
                暂无可用预设，请先在「十殿挑战」弹窗中创建预设
              </n-alert>
              <!-- 预设间执行延迟配置 -->
              <div class="nightmare-delay-config" style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="white-space: nowrap; font-size: 13px;">预设间隔：</span>
                <n-input-number
                  v-model:value="taskForm.nightmarePresetDelay"
                  :min="1"
                  :max="300"
                  :step="1"
                  size="small"
                  style="width: 100px;"
                />
                <span style="font-size: 13px; color: var(--text-secondary);">秒（下一个预设启动前的等待时间）</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 不上线时段开关 -->
        <div class="form-section">
          <div class="offline-time-section">
            <div class="offline-time-info">
              <div class="offline-time-title">🚫 不上线时段</div>
              <div class="offline-time-desc">
                周五05:00-07:00 / 周六19:50-21:10 / 周日19:50-20:40
              </div>
            </div>
            <n-switch
              v-model:value="taskForm.offlineTimeEnabled"
              size="large"
            >
              <template #checked>已开启</template>
              <template #unchecked>已关闭</template>
            </n-switch>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="form-actions">
          <n-button @click="cancelTaskEdit" size="large">取消</n-button>
          <n-button type="primary" @click="saveTask" size="large">保存</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Batch Settings Modal -->
    <n-modal
      v-model:show="showBatchSettingsModal"
      preset="card"
      title="任务设置"
      style="width: 95%; max-width: 900px; max-height: 90vh"
    >
      <div class="settings-content" style="max-height: calc(90vh - 120px); overflow-y: auto; padding: 8px;">
        <!-- ✅ 响应式网格：手机1列，平板2列，桌面2列 -->
        <n-grid :cols="1" :x-gap="16" :y-gap="16" responsive="screen" :collapsed="false"
          :collapsed-rows="1" :x-gap-screen1="12" :x-gap-screen2="16"
        >
          <!-- 左列：批量操作设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 8px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">📦 批量操作设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">开箱数量(10倍)</label>
                <n-input-number v-model:value="batchSettings.boxCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">钓鱼数量(10倍)</label>
                <n-input-number v-model:value="batchSettings.fishCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">招募数量(10倍)</label>
                <n-input-number v-model:value="batchSettings.recruitCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">默认宝箱类型</label>
                <n-select v-model:value="batchSettings.defaultBoxType" :options="boxTypeOptions" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">默认鱼竿类型</label>
                <n-select v-model:value="batchSettings.defaultFishType" :options="fishTypeOptions" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">一键宝箱周开箱目标</label>
                <n-input-number v-model:value="batchSettings.targetBoxPoints" :min="1" :max="1000000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">梦境商品购买配置</label>
                <n-button size="small" @click="openDreamBuyModal" style="width: 100%;">点击配置</n-button>
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🚗 智能发车条件(0为不限制)</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">启用条件检查</label>
                <n-switch v-model:value="batchSettings.smartDepartureEnabled" size="small">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">保底车辆颜色</label>
                <n-select
                  v-model:value="batchSettings.carMinColor"
                  :options="[
                    { label: '绿·普通', value: 1 },
                    { label: '蓝·稀有', value: 2 },
                    { label: '紫·史诗', value: 3 },
                    { label: '橙·传说', value: 4 },
                    { label: '红·神话', value: 5 },
                    { label: '金·传奇', value: 6 },
                  ]"
                  size="small"
                  class="input-responsive"
                />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">金砖 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureGoldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">招募令 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureRecruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">白玉 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureJadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">刷新券 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureTicketThreshold" :min="0" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="开启后，满足自定义条件(金砖/招募令/白玉/刷新券)时，车辆还必须达到最低品质才会发车">品质必须同时满足</label>
                <n-switch v-model:value="batchSettings.requireMinColorWithConditions" size="small">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;"> 功法赠送设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">接收者ID</label>
                <n-input v-model:value="batchSettings.receiverId" placeholder="ID" size="small" class="input-responsive" :show-button="false" />
              </div>
            </div>
          </n-grid-item>
          
          <!-- 右列：延迟与连接设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 8px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">️ 延迟设置(ms)</span>
              <n-button size="tiny" quaternary type="primary" @click="resetDelaySettings" style="margin-left: 8px;">
                恢复默认
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">命令延迟</label>
                <n-input-number v-model:value="batchSettings.commandDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">任务间延迟</label>
                <n-input-number v-model:value="batchSettings.taskDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">操作延迟</label>
                <n-input-number v-model:value="batchSettings.actionDelay" :min="100" :max="2000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">战斗延迟</label>
                <n-input-number v-model:value="batchSettings.battleDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">刷新延迟</label>
                <n-input-number v-model:value="batchSettings.refreshDelay" :min="500" :max="6000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">长延迟</label>
                <n-input-number v-model:value="batchSettings.longDelay" :min="1000" :max="13000" :step="500" size="small" class="input-responsive" />
              </div>
            </div>

            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🎯 功能模块延迟(ms)</span>
              <n-button size="tiny" quaternary type="primary" @click="resetModuleDelays" style="margin-left: 8px;">
                恢复默认
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">日常任务</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.daily" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">竞技场</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.arena" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">爬塔/怪塔</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.tower" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">黑市商店</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.store" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">宝库/梦境</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.treasure" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">消耗活动</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.activity" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">俱乐部</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.club" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">英雄升级</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.hero" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">罐子</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.bottle" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">挂机/签到</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.hangup" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">默认</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.default" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">⏰ 定时任务设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="勾选多个功能任务时，每完成一个任务后等待的时间（秒），0为不等待">任务间隔等待(秒)</label>
                <n-input-number v-model:value="batchSettings.taskIntervalWait" :min="0" :max="600" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="定时任务执行时，每完成一批账号后等待的时间（秒），0为不等待">批次间等待(秒)</label>
                <n-input-number v-model:value="batchSettings.batchIntervalWait" :min="0" :max="600" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🔗 连接设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">最大并发数</label>
                <n-input-number v-model:value="batchSettings.maxActive" :min="1" :max="20" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">连接超时(ms)</label>
                <n-input-number v-model:value="batchSettings.connectionTimeout" :min="1000" :max="30000" :step="1000" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">重连等待(ms)</label>
                <n-input-number v-model:value="batchSettings.reconnectDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">⚙️ 高级配置</span>
              <n-button size="tiny" quaternary type="primary" @click="resetAdvancedSettings" style="margin-left: 8px;">
                恢复默认
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="API调用超时时间">默认命令超时(ms)</label>
                <n-input-number v-model:value="batchSettings.defaultCommandTimeout" :min="3000" :max="15000" :step="500" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="爬塔战斗超时时间">战斗命令超时(ms)</label>
                <n-input-number v-model:value="batchSettings.battleCommandTimeout" :min="10000" :max="30000" :step="1000" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="默认重试次数">默认重试次数</label>
                <n-input-number v-model:value="batchSettings.defaultRetryCount" :min="0" :max="5" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="重试间隔时间">重试延迟(ms)</label>
                <n-input-number v-model:value="batchSettings.retryDelay" :min="500" :max="180000" :step="500" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="账号间重试间隔">账号重试间隔(ms)</label>
                <n-input-number v-model:value="batchSettings.accountRetryInterval" :min="500" :max="60000" :step="500" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;"> 挂机时间控制</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="是否启用挂机时间控制">启用时间控制</label>
                <n-switch v-model:value="batchSettings.hangUpTimeControlEnabled" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.hangUpTimeControlEnabled">
                <label class="setting-label-responsive" title="领取挂机奖励和加钟的最小挂机时间">最小挂机时间(小时)</label>
                <n-input-number v-model:value="batchSettings.hangUpMinTime" :min="1" :max="24" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🐾 宠物合成设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="是否启用宠物合成等级限制">启用等级限制</label>
                <n-switch v-model:value="batchSettings.petMergeMaxLevelEnabled" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.petMergeMaxLevelEnabled">
                <label class="setting-label-responsive" title="宠物合成最高等级，超过此等级将不再合成">合成等级上限</label>
                <n-input-number v-model:value="batchSettings.petMergeMaxLevel" :min="1" :max="7" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.petMergeMaxLevelEnabled" style="flex-basis: 100%; font-size: 11px; color: #999;">
                开启后，宠物合成只会进行到指定等级，例如设置为4则只合成到4级紫色宠物
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">💻 系统设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label class="setting-label-responsive" style="flex: 1;">列表每行数量</label>
                  <n-switch v-model:value="batchSettings.autoColumns" size="small" style="margin-right: 8px;" />
                  <span style="font-size: 12px; color: #666;">自动</span>
                </div>
                <n-input-number 
                  v-model:value="batchSettings.tokenListColumns" 
                  :min="1" 
                  :max="10" 
                  :step="1" 
                  size="small" 
                  style="width: 100%" 
                  :disabled="batchSettings.autoColumns || !isMaximizedWindow"
                  @update:value="handleManualColumnChange"
                />
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  {{ batchSettings.autoColumns ? `自动: ${responsiveColumns}列` : `手动: ${batchSettings.tokenListColumns}列` }}
                  {{ !isMaximizedWindow && !batchSettings.autoColumns ? ' (窗口<1400px，已自动切换为自动模式)' : '' }}
                </div>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">最大日志条目</label>
                <n-input-number v-model:value="batchSettings.maxLogEntries" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">定时刷新页面</label>
                <n-switch v-model:value="batchSettings.enableRefresh" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.enableRefresh">
                <label class="setting-label-responsive">刷新间隔(分钟)</label>
                <n-input-number v-model:value="batchSettings.refreshInterval" :min="1" :max="1440" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
          </n-grid-item>
        </n-grid>
        
        <div class="modal-actions" style="margin-top: 20px; text-align: right; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <n-button
            @click="showBatchSettingsModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="saveBatchSettings"
            >保存设置</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- War Guess Modal -->
    <n-modal
      v-model:show="showWarGuessModal"
      preset="card"
      title="月赛助威"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 16px">拍手器:</span>
             <n-input-number v-model:value="warGuessCoin" placeholder="拍手器" :min="1" :max="20" style="width: 120px" >
             </n-input-number>
             <n-button type="primary" @click="handleWarGuessCheer" :disabled="!selectedWarGuessLegionId || isRunning">
               助威
             </n-button>
             <n-button @click="fetchWarGuessRank" :loading="warGuessLoading">
               刷新数据
             </n-button>
          </div>
          
          <n-data-table
            :columns="warGuessColumns"
            :data="warGuessList"
            :loading="warGuessLoading"
            :row-key="row => row.id"
            :checked-row-keys="selectedWarGuessLegionId ? [selectedWarGuessLegionId] : []"
            @update:checked-row-keys="(keys) => selectedWarGuessLegionId = keys[0]"
            :row-props="warGuessRowProps"
            style="height: 400px; flex: 1;"
            flex-height
          />
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showWarGuessModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 助威商店多选购买弹窗 -->
    <n-modal
      v-model:show="showLegionStoreModal"
      preset="card"
      title="助威商店多选购买"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
            选择要购买的商品（可多选）：
          </div>
          <n-space vertical>
            <!-- 随机红将碎片 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="7" v-model:checked="legionStoreSelections[7].selected" :disabled="legionStoreSelections[7].disabled">
                <span>随机红将碎片 - 限购{{ legionStoreSelections[7].maxCount }}次</span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[7].count" 
                :min="1" 
                :max="legionStoreSelections[7].maxCount"
                :disabled="!legionStoreSelections[7].selected"
                size="small"
                style="width: 100px"
                placeholder="次数"
                @update:value="handleLegionStoreCountChange(7)"
              />
            </div>
            
            <!-- 白玉 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="8" v-model:checked="legionStoreSelections[8].selected" :disabled="legionStoreSelections[8].disabled">
                <span>白玉 - 限购{{ legionStoreSelections[8].maxCount }}次</span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[8].count" 
                :min="1" 
                :max="legionStoreSelections[8].maxCount"
                :disabled="!legionStoreSelections[8].selected"
                size="small"
                style="width: 100px"
                placeholder="次数"
                @update:value="handleLegionStoreCountChange(8)"
              />
            </div>
            
            <!-- 军团币 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="9" v-model:checked="legionStoreSelections[9].selected" :disabled="legionStoreSelections[9].disabled">
                <span>军团币 - 限购{{ legionStoreSelections[9].maxCount }}次</span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[9].count" 
                :min="1" 
                :max="legionStoreSelections[9].maxCount"
                :disabled="!legionStoreSelections[9].selected"
                size="small"
                style="width: 100px"
                placeholder="次数"
                @update:value="handleLegionStoreCountChange(9)"
              />
            </div>
            
            <!-- 进阶石 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="10" v-model:checked="legionStoreSelections[10].selected" :disabled="legionStoreSelections[10].disabled">
                <span>进阶石 - 限购{{ legionStoreSelections[10].maxCount }}次</span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[10].count" 
                :min="1" 
                :max="legionStoreSelections[10].maxCount"
                :disabled="!legionStoreSelections[10].selected"
                size="small"
                style="width: 100px"
                placeholder="次数"
                @update:value="handleLegionStoreCountChange(10)"
              />
            </div>
            
            <!-- 精铁 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="11" v-model:checked="legionStoreSelections[11].selected" :disabled="legionStoreSelections[11].disabled">
                <span>精铁 - 限购{{ legionStoreSelections[11].maxCount }}次</span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[11].count" 
                :min="1" 
                :max="legionStoreSelections[11].maxCount"
                :disabled="!legionStoreSelections[11].selected"
                size="small"
                style="width: 100px"
                placeholder="次数"
                @update:value="handleLegionStoreCountChange(11)"
              />
            </div>
          </n-space>
        </div>
        
        <div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-size: 12px; color: #999;">
            已选 {{ Object.values(legionStoreSelections).filter(s => s.selected).length }} 个商品
          </div>
        </div>
        
        <div class="modal-actions" style="margin-top: 20px; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
          <n-button @click="showLegionStoreModal = false">取消</n-button>
          <n-button 
            type="primary" 
            @click="handleLegionStoreBuy" 
            :disabled="Object.values(legionStoreSelections).filter(s => s.selected).length === 0 || isRunning"
          >
            开始购买
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 消耗活动兑换商店多选购买弹窗 -->
    <n-modal
      v-model:show="showActivityExchangeModal"
      preset="card"
      title="消耗活动兑换商店购买"
      style="width: 90%; max-width: 700px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
            选择要购买的商品（可多选），购买后自动领取里程碑进度奖励：
          </div>
          <n-grid :cols="2" :x-gap="12" :y-gap="8">
            <n-grid-item v-for="suffix in [1,2,3,4,5,6,7,8,9,10,11,12,13,14]" :key="suffix">
              <div style="display: flex; align-items: center; gap: 8px;">
                <n-checkbox
                  :checked="activityExchangeSelections[suffix].selected"
                  @update:checked="(val) => { activityExchangeSelections[suffix].selected = val; }"
                >
                  <span style="font-size: 13px;">{{ activityExchangeSelections[suffix].name }}</span>
                </n-checkbox>
                <n-input-number
                  v-if="activityExchangeSelections[suffix].maxCount > 1"
                  v-model:value="activityExchangeSelections[suffix].count"
                  :min="1"
                  :max="activityExchangeSelections[suffix].maxCount"
                  :disabled="!activityExchangeSelections[suffix].selected"
                  size="small"
                  style="width: 90px"
                  placeholder="数量"
                  @update:value="handleActivityExchangeCountChange(suffix)"
                />
                <n-tag v-else size="small" type="info" :bordered="false" style="font-size: 11px;">限购1</n-tag>
              </div>
            </n-grid-item>
          </n-grid>
        </div>

        <div style="margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-size: 12px; color: #999;">
            已选 {{ Object.values(activityExchangeSelections).filter(s => s.selected).length }} 个商品，购买后自动领取里程碑进度奖励
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 20px; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
          <n-button @click="showActivityExchangeModal = false">取消</n-button>
          <n-button
            type="primary"
            @click="handleActivityExchangeBuy"
            :disabled="Object.values(activityExchangeSelections).filter(s => s.selected).length === 0 || isRunning"
          >
            开始购买
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Token Group Management Modal -->
    <n-modal
      v-model:show="showGroupManageModal"
      preset="card"
      title="分组管理"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <!-- 导入导出工具 -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px; justify-content: flex-end">
          <n-button size="small" @click="exportGroups">
            导出分组
          </n-button>
          <n-button size="small" @click="triggerImportGroups">
            导入分组
          </n-button>
        </div>
        
        <!-- 导入分组文件输入 -->
        <input
          ref="importFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImportFile"
        />
        
        <!-- 创建新分组 -->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          创建新分组
        </n-divider>
        <div style="margin-bottom: 24px">
          <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
            <n-input
              v-model:value="newGroupName"
              placeholder="输入分组名称"
              style="width: 200px"
              size="small"
            />
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="font-size: 12px">选择颜色:</span>
              <div style="display: flex; gap: 6px">
                <div
                  v-for="color in groupColors"
                  :key="color"
                  :style="{
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border: newGroupColor === color ? '3px solid #000' : '2px solid #ddd',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }"
                  @click="newGroupColor = color"
                  @mouseover="$event.target.style.transform = 'scale(1.1)'"
                  @mouseleave="$event.target.style.transform = 'scale(1)'"
                />
              </div>
            </div>
            <n-button type="primary" size="small" @click="createNewGroup">
              创建分组
            </n-button>
          </div>
          
          <!-- 选择包含的账号 -->
          <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: bold;">包含账号 ({{ newGroupSelectedTokens.length }})</span>
              <n-space size="small">
                <n-button size="tiny" @click="selectAllNewGroup">全选</n-button>
                <n-button size="tiny" @click="deselectAllNewGroup">全不选</n-button>
              </n-space>
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
              <n-checkbox-group v-model:value="newGroupSelectedTokens">
                <n-grid :cols="3" :x-gap="12" :y-gap="8">
                  <n-grid-item v-for="token in sortedTokens" :key="token.id">
                    <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-checkbox-group>
            </div>
          </div>
        </div>

        <!-- 分组列表 -->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          分组列表
        </n-divider>
        <div
          style="
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
          "
        >
          <div
            v-for="group in tokenGroups"
            :key="group.id"
            style="
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              margin-bottom: 12px;
              background: #fafafa;
            "
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
              "
            >
              <div style="flex: 1">
                <!-- 编辑模式 -->
                <div
                  v-if="editingGroupId === group.id"
                  style="display: flex; gap: 8px"
                >
                  <n-input
                    v-model:value="editingGroupName"
                    placeholder="分组名称"
                    size="small"
                    style="width: 150px"
                  />
                  <div style="display: flex; gap: 6px; align-items: center">
                    <div
                      v-for="color in groupColors"
                      :key="color"
                      :style="{
                        width: '20px',
                        height: '20px',
                        backgroundColor: color,
                        borderRadius: '4px',
                        border: editingGroupColor === color ? '3px solid #000' : '2px solid #ddd',
                        cursor: 'pointer',
                      }"
                      @click="editingGroupColor = color"
                    />
                  </div>
                  <n-button
                    size="small"
                    type="primary"
                    @click="saveEditGroup"
                    style="width: 60px"
                  >
                    保存
                  </n-button>
                  <n-button
                    size="small"
                    @click="cancelEditGroup"
                    style="width: 60px"
                  >
                    取消
                  </n-button>
                </div>
                <!-- 显示模式 -->
                <div v-else>
                  <div
                    style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      :style="{
                        width: '16px',
                        height: '16px',
                        backgroundColor: group.color,
                        borderRadius: '3px',
                      }"
                    />
                    <span style="font-weight: 500; font-size: 14px">
                      {{ group.name }}
                    </span>
                    <n-tag size="small" type="info">
                      {{ getValidGroupTokenIds(group.id).length }} 个账号
                    </n-tag>
                  </div>
                  <div
                    style="
                      display: flex;
                      gap: 4px;
                      flex-wrap: wrap;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      v-for="tokenId in getValidGroupTokenIds(group.id)"
                      :key="tokenId"
                      style="
                        padding: 2px 8px;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      "
                    >
                      {{ tokens.find((t) => t.id === tokenId)?.name }}
                      <n-button
                        size="tiny"
                        type="error"
                        text
                        @click="removeTokenFromSelectedGroup(group.id, tokenId)"
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                  <!-- 添加token到分组 -->
                  <div style="margin-bottom: 8px">
                    <n-select
                      placeholder="添加账号到分组"
                      size="small"
                      filterable
                      :options="
                        tokens
                          .filter(
                            (t) =>
                              !getValidGroupTokenIds(group.id).includes(t.id),
                          )
                          .map((t) => ({ label: t.name, value: t.id }))
                      "
                      @update:value="
                        (tokenId) => {
                          if (tokenId) {
                            addTokenToSelectedGroup(group.id, tokenId);
                          }
                        }
                      "
                    />
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div
                style="display: flex; gap: 8px"
                v-if="editingGroupId !== group.id"
              >
                <n-button size="small" @click="startEditGroup(group.id)">
                  编辑
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  @click="deleteGroup(group.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>

          <div
            v-if="tokenGroups.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无分组，请创建一个新分组
          </div>
        </div>

        <!-- 关闭按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showGroupManageModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 添加Token弹窗 -->
    <n-modal
      v-model:show="showAddTokenModal"
      preset="card"
      class="add-token-modal"
      :bordered="false"
      style="width: 92%; max-width: 540px; max-height: 85vh"
      content-style="overflow-y: auto; max-height: calc(85vh - 60px); padding: 0 20px 20px;"
      header-style="padding: 16px 20px 12px; border-bottom: 1px solid rgba(0,0,0,0.06);"
    >
      <template #header>
        <div class="add-token-header">
          <span class="add-token-title">添加游戏Token</span>
          <n-radio-group
            size="small"
            v-model:value="addTokenImportMethod"
            class="import-method-tabs"
          >
            <n-radio-button value="wxQrcode">微信扫码</n-radio-button>
            <n-radio-button value="bin">BIN多角色</n-radio-button>
            <n-radio-button value="singlebin">BIN单角色</n-radio-button>
            <n-radio-button value="manual">手动输入</n-radio-button>
            <n-radio-button value="url">URL获取</n-radio-button>
          </n-radio-group>
        </div>
      </template>
      <div class="add-token-body">
        <ManualTokenForm
          v-if="addTokenImportMethod === 'manual'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="() => (showAddTokenModal = false)"
        />
        <UrlTokenForm
          v-if="addTokenImportMethod === 'url'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="() => (showAddTokenModal = false)"
        />
        <WxQrcodeForm
          v-if="addTokenImportMethod === 'wxQrcode'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="() => (showAddTokenModal = false)"
        />
        <BinTokenForm
          v-if="addTokenImportMethod === 'bin'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="() => (showAddTokenModal = false)"
        />
        <SingleBinTokenForm
          v-if="addTokenImportMethod === 'singlebin'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="() => (showAddTokenModal = false)"
        />
      </div>
    </n-modal>

    <!-- 赞助弹窗 -->
    <n-modal
      v-model:show="showSponsorModal"
      preset="card"
      title="赞助支持"
      style="width: 90%; max-width: 400px;"
      :bordered="false"
    >
      <div style="text-align: center; padding: 16px 0;">
        <p style="margin-bottom: 12px; color: #666; font-size: 14px;">感谢您的支持！扫码赞助作者 ❤️</p>
        <p style="margin-bottom: 16px; color: #e67e22; font-size: 13px; font-weight: 500;">赞助10元的小伙伴请在QQ联系我领网页版纯前端<br/>联系方式：<span style="font-weight: bold; color: #c0392b; letter-spacing: 1px;">1607863356</span></p>
        <img :src="sponsorQrcode" alt="赞助二维码" style="max-width: 280px; width: 100%; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);" />
      </div>
    </n-modal>

    <!-- QQ群弹窗 -->
    <n-modal
      v-model:show="showQQGroupModal"
      preset="card"
      title="👥 加入QQ群"
      style="width: 90%; max-width: 420px;"
      :bordered="false"
    >
      <div style="text-align: center; padding: 16px 0;">
        <p style="margin-bottom: 16px; color: #333; font-size: 15px; font-weight: 500;">欢迎加入QQ群交流群</p>
        <div style="background: linear-gradient(135deg, #e8f4ff, #f0e6ff); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fqm.qq.com%2Fq%2FPAPE6cThmw&margin=10"
            alt="QQ群二维码"
            style="max-width: 240px; width: 100%; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);"
            @error="(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }"
          />
          <p style="display: none; color: #999; font-size: 13px; margin-bottom: 12px;">二维码加载失败，请点击下方按钮加群</p>
          <p style="font-size: 14px; color: #666; margin-bottom: 8px;">QQ群号</p>
          <p style="font-size: 28px; font-weight: bold; color: #1890ff; letter-spacing: 2px; margin-bottom: 12px;">723315066</p>
          <p style="font-size: 13px; color: #888;">【咸鱼之王开源】</p>
        </div>
        <n-button
          type="primary"
          size="large"
          tag="a"
          href="https://qm.qq.com/q/PAPE6cThmw"
          target="_blank"
          style="width: 200px; border-radius: 24px; font-size: 16px; height: 44px;"
        >
          <template #icon>
            <span style="font-size: 18px;">🚀</span>
          </template>
          加入群聊
        </n-button>
        <p style="margin-top: 12px; color: #999; font-size: 12px;">扫描二维码或点击按钮加入QQ群</p>
      </div>
    </n-modal>

    <!-- 温馨提示弹窗 -->
    <n-modal
      v-model:show="showTipsModal"
      preset="card"
      title="💡 温馨提示"
      style="width: 90%; max-width: 420px;"
      :bordered="false"
    >
      <div style="padding: 8px 0; font-size: 14px; line-height: 1.8; color: #333;">
        <p style="margin-bottom: 12px;">本软件除了<span style="color: #e67e22; font-weight: 500;">网页版</span>，<span style="color: #18a058; font-weight: 500;">电脑端和手机端均是免费提供</span>。如果是购买获取的，请自行联系购买商家。</p>
        <p style="margin-bottom: 12px;">该软件根据开源进行开发。</p>
        <div style="background: #f7f8fa; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
          <p style="margin-bottom: 6px;"><span style="color: #c0392b; font-weight: bold;">1.</span> 无使用说明，请自行研究。</p>
          <p><span style="color: #c0392b; font-weight: bold;">2.</span> 本软件承诺不存在任何数据上传行为。</p>
        </div>
        <div style="background: linear-gradient(135deg, #e8f4ff, #f0e6ff); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; text-align: center;">
          <p style="margin-bottom: 6px; color: #1890ff; font-weight: 500;">👥 加入QQ群：723315066</p>
          <a href="https://qm.qq.com/q/PAPE6cThmw" target="_blank" style="color: #1890ff; font-size: 13px; text-decoration: underline;">点击加入【咸鱼之王开源】群聊 →</a>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 8px;">本软件仅供个人非商业学习使用</p>
      </div>
    </n-modal>

    <!-- 十殿阎罗挑战组队弹窗 -->
    <n-modal
      v-model:show="showNightmareChallengeModal"
      preset="card"
      title="十殿阎罗挑战"
      style="width: 90%; max-width: 760px"
      :bordered="true"
      :segmented="{ content: true, footer: true }"
      :closable="true"
      :mask-closable="true"
    >
      <NightmareChallengeCard />
    </n-modal>

    <!-- 星级队伍管理弹窗 -->
    <n-modal
      v-model:show="showStarTeamModal"
      preset="card"
      title="星级队伍管理"
      style="width: 90%; max-width: 800px"
      :bordered="true"
      :segmented="{ content: true, footer: true }"
      :closable="true"
      :mask-closable="true"
    >
      <StarTeamCard />
    </n-modal>

    <!-- 批量采购清单配置弹窗 -->
    <n-modal
      v-model:show="showBatchPurchaseConfigModal"
      preset="card"
      title="批量同步采购清单"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 12px; color: var(--text-secondary, #666); font-size: 13px;">
          勾选要采购的商品并设置折扣，确认后同步到所有已勾选的 {{ selectedTokens.length }} 个账号
        </div>
        <div class="switch-row" style="margin-bottom: 10px;">
          <span class="switch-label">采购次数</span>
          <n-input-number
            v-model:value="batchPurchaseCnt"
            :min="1" :max="15" :step="1"
            size="small" style="width: 80px;"
          />
          <n-button
            size="small"
            style="margin-left: auto;"
            @click="batchPurchaseList = purchaseItemOptions.map(i => i.itemId)"
          >全选</n-button>
          <n-button
            size="small"
            style="margin-left: 6px;"
            @click="batchPurchaseList = []"
          >清空</n-button>
        </div>
        <div class="purchase-list-grid">
          <label
            v-for="item in purchaseItemOptions"
            :key="item.itemId"
            class="purchase-item-label"
          >
            <input
              type="checkbox"
              :checked="batchPurchaseList.includes(item.itemId)"
              @change="togglePurchaseItem(batchPurchaseList, batchPurchaseDiscounts, item.itemId)"
            />
            <span>{{ item.name }}</span>
            <input type="number" class="discount-input"
              :value="getDiscount(batchPurchaseDiscounts, item.itemId)"
              @input="(e) => setDiscount(batchPurchaseDiscounts, item.itemId, e.target.value)"
              min="1" max="10"
              :disabled="!batchPurchaseList.includes(item.itemId)"
            />
            <span class="discount-unit">折</span>
          </label>
        </div>
        <div style="margin-top: 16px; text-align: right;">
          <n-button @click="showBatchPurchaseConfigModal = false" style="margin-right: 12px;">取消</n-button>
          <n-button type="primary" @click="applyBatchPurchaseConfig" :loading="batchPurchaseSyncing">
            同步到 {{ selectedTokens.length }} 个账号
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 消耗活动弹窗 -->
    <n-modal
      v-model:show="showConsumeModal"
      preset="card"
      title="消耗活动"
      style="width: 95%; max-width: 900px"
      :segmented="{ content: true }"
    >
      <ConsumeActivityCard />
    </n-modal>

    <!-- 批量推图弹窗 -->
    <n-modal
      v-model:show="showPushMapModal"
      preset="card"
      title="批量推图"
      class="push-modal"
      style="width: 95%; max-width: 780px"
      :segmented="{ content: true }"
    >
      <div class="push-layout">
        <!-- 工具栏 -->
        <div class="push-toolbar">
          <div class="push-toolbar-left">
            <n-select
              v-model:value="pushSelectedTokens"
              :options="pushTokenOptions"
              multiple
              size="small"
              placeholder="选择账号"
              style="flex: 1; min-width: 200px;"
            />
            <n-select
              v-model:value="pushTorchType"
              :options="[
                { label: '不使用火把', value: 0 },
                { label: '🔥 木材(10min)', value: 1008 },
                { label: '🔥 青铜(20min)', value: 1009 },
                { label: '🔥 咸神(30min)', value: 1010 },
              ]"
              size="small"
              style="width: 140px;"
            />
            <n-input-number
              v-model:value="pushTorchCount"
              :min="1"
              :max="99"
              size="small"
              placeholder="数量"
              style="width: 90px;"
            />
            <n-button size="small" type="warning" @click="pushUseTorchManual" :disabled="!pushSelectedTokens.length || !pushTorchType">
              使用火把
            </n-button>
          </div>
          <div class="push-toolbar-right">
            <n-button size="small" type="success" @click="pushStartAll" :disabled="!pushSelectedTokens.length">
              全部开始
            </n-button>
            <n-button size="small" type="error" @click="pushStopAll">
              全部停止
            </n-button>
          </div>
        </div>

        <!-- 战斗卡片区域 - 两列网格 -->
        <div v-if="pushCards.length" class="push-cards-grid">
          <div v-for="card in pushCards" :key="card.id" class="push-card" :class="{ 'push-card--running': card.running }">
            <!-- 卡片头部 -->
            <div class="push-card-header">
              <div class="push-card-name">
                <span class="push-status-dot" :class="card.running ? 'dot-active' : 'dot-idle'"></span>
                <span class="push-card-title">{{ card.name }}</span>
              </div>
              <div class="push-card-stats">
                <span class="push-stat push-stat-win">{{ card.wins }}胜</span>
                <span class="push-stat push-stat-loss">{{ card.losses }}负</span>
              </div>
            </div>
            <!-- 卡片内容 -->
            <div class="push-card-body">
              <div class="push-card-info">
                <span class="push-info-level">Lv.{{ card.level }}</span>
                <span v-if="card.bossNm" class="push-info-boss">{{ card.bossNm }}</span>
              </div>
              <div v-if="card.running && card.countdown > 0" class="push-card-timer">
                <span class="push-timer-label">战斗剩余</span>
                <span class="push-timer-value">{{ Math.floor(card.countdown / 60) }}:{{ String(Math.floor(card.countdown % 60)).padStart(2, '0') }}</span>
              </div>
              <n-progress
                v-if="card.running && card.totalTime > 0"
                type="line"
                :percentage="Math.round((1 - card.countdown / card.totalTime) * 100)"
                :show-indicator="false"
                :height="4"
                :color="card.countdown < 10 ? '#f0a020' : '#2080f0'"
                rail-color="#eef1f5"
                style="margin: 6px 0;"
              />
            </div>
            <!-- 卡片操作 -->
            <div class="push-card-footer">
              <n-button size="tiny" :type="card.running ? 'error' : 'success'" quaternary @click="pushToggleOne(card.id)">
                {{ card.running ? '停止' : '开始' }}
              </n-button>
            </div>
          </div>
        </div>
        <div v-else class="push-empty">
          <span>选择账号后点击「全部开始」</span>
        </div>

        <!-- 日志区域 -->
        <div class="push-logs-section">
          <div class="push-logs-header">
            <span class="push-logs-title">推图日志</span>
            <n-button text size="tiny" @click="pushLogs = []">清空</n-button>
          </div>
          <div class="push-logs-list">
            <div v-for="(log, i) in pushLogs.slice(0, 100)" :key="i" class="push-log-item" :class="'log-' + log.type">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
            <div v-if="!pushLogs.length" class="push-logs-empty">暂无日志</div>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
// Import required dependencies
import {
  ref,
  computed,
  nextTick,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  h,
} from "vue";
import { useTokenStore, gameTokens, tokenGroups } from "@/stores/tokenStore";
import { useRouter, useRoute } from "vue-router";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings, AddCircleOutline, CheckmarkCircleOutline, ListOutline, CloudDownloadOutline, CloudUploadOutline, SearchOutline, DocumentTextOutline, CreateOutline, TrashOutline, SettingsOutline, PlayOutline, Add } from "@vicons/ionicons5";
import TokenCard from "@/components/TokenCard.vue";
import useIndexedDB from "@/hooks/useIndexedDB";
import { storage } from "@/utils/crossPlatformStorage";
import sponsorQrcode from "@/assets/sponsor-qrcode.png";

// Import Token导入表单组件（用于添加Token弹窗）
import ManualTokenForm from "@/views/TokenImport/manual.vue";
import UrlTokenForm from "@/views/TokenImport/url.vue";
import BinTokenForm from "@/views/TokenImport/bin.vue";
import SingleBinTokenForm from "@/views/TokenImport/singlebin.vue";
import WxQrcodeForm from "@/views/TokenImport/wxqrcode.vue";
import NightmareChallengeCard from "@/components/cards/NightmareChallengeCard.vue";
import StarTeamCard from "@/components/cards/StarTeamCard.vue";
import ConsumeActivityCard from "@/components/cards/ConsumeActivityCard.vue";
import { NightmareAutoBattleService } from "@/utils/nightmareAutoBattle";

// Import batch task modules
import {
  // Constants
  boxTypeOptions,
  fishTypeOptions,
  formationOptions,
  bossTimesOptions,
  dailyBossTimesOptions,
  availableTasks,
  CarresearchItem,
  FISH_TARGET,
  ARENA_TARGET,
  taskColumns,
  defaultSettings,
  defaultBatchSettings,
  defaultTemplate,
  defaultTaskForm,
  defaultHelperSettings,
  // Cron utilities
  validateCronField,
  validateCronExpression,
  parseCronField,
  calculateNextRuns,
  calculateNextExecutionTime,
  formatTimeDifference,
  matchesCronExpression,
  // Connection manager
  createConnectionManager,
  getActivityStatus,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  pickArenaTargetId,
  // Log utilities
  createLogManager,
  addTaskSaveLog,
  // Car utilities
  normalizeCars,
  gradeLabel,
  isBigPrize,
  countRacingRefreshTickets,
  shouldSendCar,
  canClaim,
  // Task factories
  createTasksHangUp,
  createTasksBottle,
  createTasksTower,
  createTasksCar,
  createTasksItem,
  createTasksDungeon,
  createTasksArena,
  createTasksStore,
  createTasksLegacy,
} from "@/utils/batch";


import { downloadFile } from "@/utils/imageExport";
import { wakeLockManager } from "@/utils/wakeLock";
import { WebSocketPool } from "@/utils/WebSocketPool";

// Refs for file input elements
const importScheduledTasksInput = ref(null);
const importAccountConfigInput = ref(null);
const importFullConfigInput = ref(null);

import { merchantConfig, goldItemsConfig } from "@/utils/dreamConstants";

// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const message = useMessage();
const router = useRouter();
const route = useRoute();
const { storeArrayBuffer: storeArrayBufferToDB, getArrayBuffer: getArrayBufferFromDB } = useIndexedDB();

// 排序配置（从localStorage读取，与TokenImport共享）
const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 排序字段：name, server, createdAt, lastUsed
        direction: "asc", // 排序方向：asc, desc
      },
);

// 自定义Token排序
const tokenOrder = ref([]);

// 加载保存的Token排序
const loadSavedTokenOrder = async () => {
  tokenOrder.value = await loadTokenOrder();
};

// 计算属性 - 从gameData中获取塔相关信息
const evoTowerInfo = computed(() => {
  const data = tokenStore.gameData?.evoTowerInfo || null;
  return data;
});

const weirdTowerData = computed(() => {
  return evoTowerInfo.value?.evoTower || null;
});

const currentTowerId = computed(() => {
  return weirdTowerData.value?.towerId || 0;
});

const towerEnergy = computed(() => {
  return weirdTowerData.value?.energy || 0;
});

// 排序后的游戏角色Token列表
const sortedTokens = computed(() => {
  let tokens = [...tokenStore.gameTokens];
  
  // 搜索过滤
  if (tokenSearchKeyword.value.trim()) {
    const keyword = tokenSearchKeyword.value.trim().toLowerCase();
    tokens = tokens.filter(token => 
      token.name?.toLowerCase().includes(keyword) ||
      token.server?.toLowerCase().includes(keyword) ||
      token.id?.toLowerCase().includes(keyword)
    );
  }
  
  // 检查是否有自定义排序
  const customOrder = tokenOrder.value;
  if (customOrder && customOrder.length > 0) {
    // 应用自定义排序
    tokens.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      
      // 如果两个token都在自定义排序中，按照自定义顺序
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // 如果只有a在自定义排序中，a排前面
      if (indexA !== -1) return -1;
      
      // 如果只有b在自定义排序中，b排前面
      if (indexB !== -1) return 1;
      
      // 都不在自定义排序中，按名称排序
      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // 使用默认排序
    tokens = tokens.sort((tokenA, tokenB) => {
      let valueA, valueB;

      // 根据排序字段获取比较值
      switch (sortConfig.value.field) {
        case "name":
          valueA = tokenA.name?.toLowerCase() || "";
          valueB = tokenB.name?.toLowerCase() || "";
          break;
        case "server":
          valueA = tokenA.server?.toLowerCase() || "";
          valueB = tokenB.server?.toLowerCase() || "";
          break;
        case "createdAt":
          valueA = new Date(tokenA.createdAt || 0).getTime();
          valueB = new Date(tokenB.createdAt || 0).getTime();
          break;
        case "lastUsed":
          valueA = new Date(tokenA.lastUsed || 0).getTime();
          valueB = new Date(tokenB.lastUsed || 0).getTime();
          break;
        case "monthly":
          // 月度排序：根据竞技场和钓鱼的未完成进度排序
          // 未完成进度越多（距离目标越远）越靠前
          const gameDataA = tokenStore.getTokenGameData(tokenA.id);
          const gameDataB = tokenStore.getTokenGameData(tokenB.id);
          const monthDataA = gameDataA?.monthActivity;
          const monthDataB = gameDataB?.monthActivity;
          
          // 计算月度未完成进度
          const calculateMonthlyNeed = (data) => {
            if (!data) return 999999; // 无数据的排最后
            
            const FISH_TARGET = 320;
            const ARENA_TARGET = 240;
            
            // 获取当前进度
            const myMonthInfo = data.myMonthInfo || {};
            const myArenaInfo = data.myArenaInfo || {};
            const fishNum = Number(myMonthInfo?.["2"]?.num || 0);
            const arenaNum = Number(myArenaInfo?.num || 0);
            
            // 计算当前应该完成的进度（根据日期比例）
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const dayOfMonth = now.getDate();
            const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
            const monthProgress = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
            
            // 应该完成的次数
            const fishShouldBe = remainingDays === 0 ? FISH_TARGET : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
            const arenaShouldBe = remainingDays === 0 ? ARENA_TARGET : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
            
            // 计算未完成次数
            const fishNeed = Math.max(0, fishShouldBe - fishNum);
            const arenaNeed = Math.max(0, arenaShouldBe - arenaNum);
            
            // 返回总未完成次数（钓鱼 + 竞技场）
            return fishNeed + arenaNeed;
          };
          
          valueA = calculateMonthlyNeed(monthDataA);
          valueB = calculateMonthlyNeed(monthDataB);
          break;
        default:
          valueA = tokenA.name?.toLowerCase() || "";
          valueB = tokenB.name?.toLowerCase() || "";
      }

      // 根据排序方向比较值
      if (valueA < valueB) {
        return sortConfig.value.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.value.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  
  // ✅ 选中分组的账号自动排序到前面（最高优先级）
  const selectedGroupIds = selectedGroups.value;
  if (selectedGroupIds && selectedGroupIds.length > 0) {
    // 收集所有选中分组中的token ID
    const selectedGroupTokenIds = new Set();
    selectedGroupIds.forEach(groupId => {
      const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
      validTokenIds.forEach(id => selectedGroupTokenIds.add(id));
    });
    
    // 排序：选中分组的账号在前，其他账号在后
    tokens.sort((a, b) => {
      const aInSelectedGroup = selectedGroupTokenIds.has(a.id);
      const bInSelectedGroup = selectedGroupTokenIds.has(b.id);
      
      // 如果a在选中分组中，b不在，a排前面
      if (aInSelectedGroup && !bInSelectedGroup) return -1;
      // 如果b在选中分组中，a不在，b排前面
      if (!aInSelectedGroup && bInSelectedGroup) return 1;
      // 都在或都不在选中分组中，保持原有顺序（已应用的排序）
      return 0;
    });
  }
  
  return tokens;
});

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction =
      sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 如果点击的是新的排序字段，则默认升序
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // ✅ 清除自定义排序，让按钮排序生效
  if (tokenOrder.value && tokenOrder.value.length > 0) {
    tokenOrder.value = [];
    // 清除保存的自定义排序
    localStorage.removeItem('tokenOrder');
  }

  // 保存排序设置到localStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

// 获取排序图标
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) return null;
  return sortConfig.value.direction === "asc" ? "↑" : "↓";
};

const tokens = computed(() => tokenStore.gameTokens);

// 响应式时间引用，每30秒更新一次，确保computed属性能正确响应时间变化
const currentTime = ref(new Date());
let currentTimeTimer = null;

// 时间检查函数直接使用 new Date()，确保每次调用都获取实时时间
const checkCarActivityOpen = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 1=Mon, 2=Tue, 3=Wed; 6点之后
  return day >= 1 && day <= 3 && hour >= 6;
};

const checkMengjingActivityOpen = () => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
};

const checkBaokuActivityOpen = () => {
  const day = new Date().getDay();
  return day != 1 && day != 2;
};

// 保留computed用于UI显示，但任务执行时使用函数
const isCarActivityOpen = computed(() => checkCarActivityOpen());
const ismengjingActivityOpen = computed(() => checkMengjingActivityOpen());
const isbaokuActivityOpen = computed(() => checkBaokuActivityOpen());
// 直接使用 new Date()，不依赖响应式 ref，避免 computed 缓存导致时间判断失效
const checkArenaActivityOpen = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
};

// 保留computed用于UI显示，但任务执行时使用函数
const isarenaActivityOpen = computed(() => {
  return checkArenaActivityOpen();
});
const getCurrentActivityWeek = computed(() => {
  const now = currentTime.value;
  const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
  const cycleDuration = 3 * weekDuration; // 三周期毫秒数

  const elapsed = now - start;
  if (elapsed < 0) return null; // 活动开始前

  const cyclePosition = elapsed % cycleDuration;

  if (cyclePosition < weekDuration) {
    return "黑市周";
  } else if (cyclePosition < 2 * weekDuration) {
    return "招募周";
  } else {
    return "宝箱周";
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  if (getCurrentActivityWeek.value !== "黑市周") return false;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute; // 转换为分钟
  
  // 黑市周开放时间：周五12:00开始，到下周五11:00结束
  if (day === 5) {
    // 周五：11:00前 或 12:00后开放
    const morningEnd = 11 * 60;      // 11:00 = 660分钟
    const afternoonStart = 12 * 60;  // 12:00 = 720分钟
    
    // 周五11:00前开放（本周黑市周的最后时刻）
    // 或周五12:00后开放（新黑市周的开始）
    if (currentTime < morningEnd || currentTime >= afternoonStart) {
      return true;
    }
    // 周五11:00-12:00之间不开放
    return false;
  }
  
  // 其他时间（周六到周四）全天开放
  return true;
});

// 黑市周活动时间状态提示
const weirdTowerActivityStatus = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  
  if (currentWeek !== "黑市周") {
    return `当前是${currentWeek}，黑市周购买功能未开放`;
  }
  
  if (isWeirdTowerActivityOpen.value) {
    return "黑市周购买功能开放中";
  }
  
  return "黑市周购买功能暂时关闭（每周五11:00-12:00为切换时间）";
});

// 招募周开放判断（免费礼包领取按钮 - 包含所有周的礼包）
const isRecruitActivityOpen = computed(() => {
  // 免费礼包领取包含：招募周、黑市周、宝箱周、周一免费礼
  // 所以在任何活动周都应该可以领取
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "招募周" || currentWeek === "黑市周" || currentWeek === "宝箱周";
});

// 宝箱周开放判断（一键宝箱周开箱、宝箱达标奖励自选大奖）
const isBoxWeeklyActivityOpen = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "宝箱周";
});

// 功法残卷限制判断（28天赛季周期，新赛季中午12:00开启，赛季日00:00-12:00禁止领取和赠送）
const SEASON_REFERENCE_DATE = new Date(2026, 0, 16); // 第1赛季开始日期（2026年1月16日12:00）
const isLegacyRestricted = computed(() => {
  const now = currentTime.value;
  const hour = now.getHours();
  
  // 12:00 之后赛季已开启，不限制
  if (hour >= 12) return false;
  
  // 计算距离参考赛季日的天数
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - SEASON_REFERENCE_DATE.getTime();
  const daysSinceRef = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  // 处理负数取模（JavaScript % 对负数返回负值）
  const daysMod = ((daysSinceRef % 28) + 28) % 28;
  
  // 赛季日当天（余数为0）且 00:00-12:00 之间
  return daysMod === 0;
});

// 获取本月第四个周日的日期
const getFourthSundayOfMonth = () => {
  const now = currentTime.value;
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 当月第一天
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0-6
  
  // 计算第一个周日的日期 (1号是周日则为1，否则为 1 + 7 - dayOfWeek)
  let firstSundayDate = 1 + (7 - dayOfWeek) % 7;

  // 仅针对2026年3月进行特殊处理
  if (year === 2026 && month === 2 && dayOfWeek === 0) {
    firstSundayDate = 8;
  }
  
  // 第四个周日 = 第一个周日 + 21天
  return new Date(year, month, firstSundayDate + 21);
};

const isWarGuessActivityOpen = computed(() => {
  const now = currentTime.value;
  
  // 手动修正：2026年3月1日开放
  if (now.getFullYear() === 2026 && now.getMonth() === 2 && now.getDate() === 1) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 19 || (hour === 19 && minute <= 55)) return true;
  }

  const fourthSunday = getFourthSundayOfMonth();
  
  // 检查是否是今天
  if (now.getDate() !== fourthSunday.getDate()) return false;
  
  // 检查时间 00:00 - 19:55
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > 19 || (hour === 19 && minute > 55)) return false;
  
  return true;
});

const warGuessActivityTip = computed(() => {
  if (isWarGuessActivityOpen.value) return "";
  
  const fourthSunday = getFourthSundayOfMonth();
  const month = fourthSunday.getMonth() + 1;
  const date = fourthSunday.getDate();
  return `月赛助威仅在每月第四个周日 (${month}月${date}日) 00:00-19:55 开放`;
});

const selectedTokens = ref([]);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' | 'waiting_retry' }
const isRunning = ref(false);
const shouldStop = ref(false);
const shouldRefreshAfterTask = ref(false); // 标记是否需要在任务完成后刷新页面

// =====================
// Token分组管理状态
// =====================
const showGroupManageModal = ref(false);
const showGroupSelectModal = ref(false);
const selectedGroups = ref([]); // 选中的分组ID列表
const newGroupName = ref("");
const newGroupColor = ref("#1677ff");
const newGroupSelectedTokens = ref([]); // 新建分组时选中的Token ID列表
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const taskScheduleSelectedGroupIds = ref([]); // 定时任务中通过分组按钮选中的分组ID列表
const groupColors = [
  "#1677ff", // 蓝色
  "#52c41a", // 绿色
  "#faad14", // 橙色
  "#f5222d", // 红色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#eb2f96", // 粉色
  "#fa8c16", // 赤红色
];

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);
const currentGuessCount = ref(0);

// 助威商店
const showLegionStoreModal = ref(false);
const legionStoreSelections = ref({
  7: { selected: false, count: 1, maxCount: 1, disabled: false },   // 随机红将碎片
  8: { selected: false, count: 1, maxCount: 1, disabled: false },   // 白玉
  9: { selected: false, count: 1, maxCount: 1, disabled: false },   // 军团币
  10: { selected: false, count: 20, maxCount: 20, disabled: false }, // 进阶石
  11: { selected: false, count: 20, maxCount: 20, disabled: false }, // 精铁
});

// 消耗活动兑换商店
const showActivityExchangeModal = ref(false);
const activityExchangeSelections = ref({
  1:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '惊雷' },
  2:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '月华' },
  3:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '回响' },
  4:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '琴心公' },
  5:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '琴心母' },
  6:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '璇玑' },
  7:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '剑胆公' },
  8:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '剑胆母' },
  9:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '阵容编组' },
  10: { selected: false, count: 30, maxCount: 30, disabled: false, name: '珍珠' },
  11: { selected: false, count: 200, maxCount: 200, disabled: false, name: '万能红将碎片' },
  12: { selected: false, count: 200, maxCount: 200, disabled: false, name: '随机红将碎片' },
  13: { selected: false, count: 999, maxCount: 999, disabled: false, name: '白玉' },
  14: { selected: false, count: 999, maxCount: 999, disabled: false, name: '精铁' },
});

const openActivityExchangeModal = () => {
  showActivityExchangeModal.value = true;
};

const handleActivityExchangeCountChange = (suffix) => {
  const item = activityExchangeSelections.value[suffix];
  if (item.count > item.maxCount) item.count = item.maxCount;
  if (item.count < 1) item.count = 1;
  // 限购1次的商品不允许修改次数
  if (item.maxCount === 1) item.count = 1;
};

const handleActivityExchangeBuy = async () => {
  const selectedSuffixes = [];
  const buyCounts = {};
  Object.keys(activityExchangeSelections.value).forEach(key => {
    const item = activityExchangeSelections.value[key];
    if (item.selected) {
      const suffix = parseInt(key);
      selectedSuffixes.push(suffix);
      buyCounts[suffix] = item.count;
    }
  });
  if (selectedSuffixes.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  showActivityExchangeModal.value = false;
  await batchActivityExchange(selectedSuffixes, buyCounts);
};

const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "亿";
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "万";
  }
  return power.toString();
};

const warGuessColumns = [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'id', width: 100 },
  { title: '头像', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '30px', height: '30px', borderRadius: '50%' } });
  }, width: 60 },
  { title: '区服', key: 'serverId', width: 80 },
  { title: '俱乐部', key: 'name', width: 120 },
  { title: '战力', key: 'power', render(row) {
    return formatPower(row.power);
  }, width: 100 },
  { title: '红淬', key: 'quenchNum' },
  { title: '已助威', key: 'guessNum' },
  { title: '总热度', key: 'totalNum',render(row) {
    return formatPower(row.totalNum || 0);
  }, width: 100 },
];

const warGuessRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedWarGuessLegionId.value = row.id;
    },
  };
};



const openWarGuessModal = () => {
  showWarGuessModal.value = true;
  // Reset selection
  selectedWarGuessLegionId.value = null;
  warGuessList.value = [];
  
  // Auto fetch if tokens selected
  if (selectedTokens.value.length > 0) {
      fetchWarGuessRank();
  }
};

// 打开助威商店弹窗
const openLegionStoreModal = () => {
  showLegionStoreModal.value = true;
  // 重置选择
  Object.keys(legionStoreSelections.value).forEach(key => {
    legionStoreSelections.value[key].selected = false;
    legionStoreSelections.value[key].disabled = false;
    // 恢复默认购买次数
    if (key === '10' || key === '11') {
      legionStoreSelections.value[key].count = 20;
    } else {
      legionStoreSelections.value[key].count = 1;
    }
  });
};

// 处理助威商店购买次数变化
const handleLegionStoreCountChange = (itemId) => {
  const item = legionStoreSelections.value[itemId];
  
  // 限购1次的商品（7、8、9）
  const limitedItems = [7, 8, 9];
  
  // 如果任何商品的购买次数 > 1，则禁用所有限购1次的商品
  let hasCountOverOne = false;
  Object.keys(legionStoreSelections.value).forEach(key => {
    if (legionStoreSelections.value[key].count > 1) {
      hasCountOverOne = true;
    }
  });
  
  if (hasCountOverOne) {
    // 禁用限购1次的商品
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = true;
      // 如果被禁用的商品已被勾选，则取消勾选
      if (legionStoreSelections.value[id].selected) {
        legionStoreSelections.value[id].selected = false;
      }
    });
    
    // 如果当前修改的是限购1次的商品，提示用户
    if (limitedItems.includes(itemId)) {
      message.warning("当前物品限购1次，无法购买2次");
      // 重置次数为1
      item.count = 1;
    }
  } else {
    // 恢复启用
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = false;
    });
  }
};

// 处理助威商店购买
const handleLegionStoreBuy = async () => {
  // 收集选中的商品
  const selectedItems = [];
  const buyCounts = {};
  
  Object.keys(legionStoreSelections.value).forEach(key => {
    const item = legionStoreSelections.value[key];
    if (item.selected) {
      selectedItems.push(parseInt(key));
      buyCounts[parseInt(key)] = item.count;
    }
  });
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 关闭弹窗
  showLegionStoreModal.value = false;
  
  // 调用购买函数
  await legion_buy_store_items(selectedItems, buyCounts);
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取月赛助威数据");
    return;
  }
  
  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);
  
  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取月赛助威数据...`,
      type: "info",
    });
    
    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
        tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
        await new Promise(r => setTimeout(r, 2000)); // Wait for connection
    }
    
    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(tokenId, "warguess_getrank", { bfId: '' }, 5000);
    
    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }
      
      // Sort by totalNum desc
      warGuessList.value = list.sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0)).slice(0, 20);
    } else {
      message.warning("获取月赛助威数据为空");
    }
    
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error("获取月赛助威数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取月赛助威数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
    if (!selectedWarGuessLegionId.value) {
        message.warning("请先选择一个俱乐部");
        return;
    }
    // Close modal
    showWarGuessModal.value = false;
    // Call the batch function
    await batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value);
    
    
};

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 十殿阵容
  bossTimes: 2,
  dailyBossTimes: 1,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
  legacyGiftPassword: '', // 功法赠送验证密码
});

// Task Template State
const showTaskTemplateModal = ref(false);
const showApplyTemplateModal = ref(false);
const showTemplateManagerModal = ref(false);
const showAccountTemplateModal = ref(false);
const taskTemplates = ref([]);
const selectedTemplateId = ref(null);
const selectedTokensForApply = ref([]);
const currentTemplateName = ref("");
const currentTemplateId = ref(null); // 用于编辑现有模板
const currentTemplate = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 十殿阵容
  bossTimes: 2,
  dailyBossTimes: 1,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
  legacyGiftPassword: '', // 新增: 功法赠送验证密码
});

// Account Template References
const accountTemplateReferences = ref([]);
const filteredAccountTemplates = ref([]);
const selectedTemplateForFilter = ref(null);

// Computed for Apply Template
const isAllSelectedForApply = computed(() => {
  return (
    selectedTokensForApply.value.length === sortedTokens.value.length &&
    sortedTokens.value.length > 0
  );
});

const isIndeterminateForApply = computed(() => {
  return (
    selectedTokensForApply.value.length > 0 &&
    selectedTokensForApply.value.length < sortedTokens.value.length
  );
});

// Computed for Template Manager
const templateSearchKeyword = ref("");
const filteredTaskTemplates = computed(() => {
  if (!templateSearchKeyword.value) {
    return taskTemplates.value;
  }
  const keyword = templateSearchKeyword.value.toLowerCase();
  return taskTemplates.value.filter(template => 
    template.name.toLowerCase().includes(keyword)
  );
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 小于1小时显示“刚刚”
  if (diff < 3600000) {
    return "刚刚";
  }
  // 小于24小时显示“x小时前”
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  // 小于7天显示“x天前”
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }
  // 否则显示完整日期
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

// Helper Modal State
const showHelperModal = ref(false);
const showConsumeModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetRounds: 1,  // 目标轮数（1-4轮）
  weeklyMarketItems: [],  // 黑市周购买的商品列表
  cdkCode: '',  // 兑换码
  cheerQty: 0,  // 挥鼓助威数量，0=全部
});

const helperModalTitle = computed(() => {
  const titles = { box: "批量开宝箱", fish: "批量钓鱼", recruit: "批量招募", pointsBox: "一键宝箱周开箱", weeklyMarket: "黑市周购买", cdk: "兑换码领取", cheer: "挥鼓助威消耗" };
  return titles[helperType.value] || "批量助手";
});

// 英雄四圣升级 Modal State
const showHeroFourSaintsModal = ref(false);
const selectedHeroSingle = ref(null);  // 单选英雄

const heroOptions = [
  { label: "司马懿", value: 101 },
  { label: "关羽", value: 103 },
  { label: "诸葛亮", value: 104 },
  { label: "周瑜", value: 105 },
  { label: "太史慈", value: 106 },
  { label: "吕布", value: 107 },
  { label: "甄姬", value: 109 },
  { label: "孙策", value: 111 },
  { label: "贾诩", value: 112 },
  { label: "曹仁", value: 113 },
  { label: "姜维", value: 114 },
  { label: "公孙瓒", value: 116 },
  { label: "典韦", value: 117 },
  { label: "超云", value: 118 },
  { label: "张角", value: 120 },
  { label: "鲁肃", value: 121 },
];

const openHeroFourSaintsModal = () => {
  selectedHeroSingle.value = null;
  showHeroFourSaintsModal.value = true;
};

// 盐晶商店 Modal State
const showSaltCrystalShopModal = ref(false);

const openSaltCrystalShopModal = () => {
  // 初始化 _checked 状态
  saltCrystalShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showSaltCrystalShopModal.value = true;
};

const executeSaltCrystalShopBuy = () => {
  showSaltCrystalShopModal.value = false;
  salt_crystal_shop_buy();
};

// 盐锭商店 Modal State
const showSaltIngotShopModal = ref(false);

const openSaltIngotShopModal = () => {
  saltIngotShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showSaltIngotShopModal.value = true;
};

const executeSaltIngotShopBuy = () => {
  showSaltIngotShopModal.value = false;
  salt_ingot_shop_buy();
};

const executeHeroFourSaintsUpgrade = () => {
  if (!selectedHeroSingle.value) {
    message.warning("请选择一个英雄");
    return;
  }
  showHeroFourSaintsModal.value = false;
  heroFourSaintsUpgrade([selectedHeroSingle.value]);
};

// 宝箱周自选大奖 Modal State
const showBoxWeeklyRewardModal = ref(false);
const selectedBoxWeeklyRewards = ref([5]);  // 默认选择珍珠
const boxWeeklyRewardCounts = ref({ 5: 1 });  // 每个奖励的领取次数

const boxWeeklyRewardOptions = [
  { label: "万能红将碎片", value: 0 },
  { label: "梦魇晶石", value: 1 },
  { label: "精铁", value: 2 },
  { label: "进阶石", value: 3 },
  { label: "扳手", value: 4 },
  { label: "珍珠", value: 5 },
];

// 黑市周商品选项
const weeklyMarketItemOptions = [
  { label: "免费金砖", value: "0" },
  { label: "黑市见面礼", value: "1" },
  { label: "黑市惊喜礼", value: "2" },
  { label: "初级黑市包", value: "3" },
  { label: "中级黑市包", value: "4" },
  { label: "高级黑市包", value: "5" },
  { label: "顶级鱼竿包", value: "6" },
  { label: "白玉黑市包", value: "7" },
  { label: "特级灵贝包", value: "8" },
  { label: "养成补给包", value: "9" },
];

// 助威商店商品选项
const legionStoreItemOptions = [
  { label: "随机红将碎片", value: "7", min: 1, max: 1 },
  { label: "白玉", value: "8", min: 1, max: 1 },
  { label: "军团币", value: "9", min: 1, max: 1 },
  { label: "进阶石", value: "10", min: 1, max: 20 },
  { label: "精铁", value: "11", min: 1, max: 20 },
];

// 消耗活动兑换商店商品选项
const activityExchangeItemOptions = [
  { name: '惊雷', suffix: 1, maxCount: 1 },
  { name: '月华', suffix: 2, maxCount: 1 },
  { name: '回响', suffix: 3, maxCount: 1 },
  { name: '琴心公', suffix: 4, maxCount: 1 },
  { name: '琴心母', suffix: 5, maxCount: 1 },
  { name: '璇玑', suffix: 6, maxCount: 1 },
  { name: '剑胆公', suffix: 7, maxCount: 1 },
  { name: '剑胆母', suffix: 8, maxCount: 1 },
  { name: '阵容编组', suffix: 9, maxCount: 1 },
  { name: '珍珠', suffix: 10, maxCount: 30 },
  { name: '万能红将碎片', suffix: 11, maxCount: 200 },
  { name: '随机红将碎片', suffix: 12, maxCount: 200 },
  { name: '白玉', suffix: 13, maxCount: 999 },
  { name: '精铁', suffix: 14, maxCount: 999 },
];

// 盐晶商店商品选项
const saltCrystalShopItemOptions = [
  { label: "四圣蓝玉", value: "201", min: 1, max: 60 },
  { label: "四圣红玉", value: "202", min: 1, max: 50 },
  { label: "成长脆饼", value: "203", min: 1, max: 60 },
  { label: "幻彩灵果", value: "204", min: 1, max: 60 },
  { label: "斑点蛋", value: "205", min: 1, max: 5 },
];

// 黑市多选购买商品选项
const manualBuyItemOptions = [
  { label: "青铜宝箱", value: "1" },
  { label: "黄金宝箱", value: "2" },
  { label: "铂金宝箱", value: "3" },
  { label: "进阶石", value: "4" },
  { label: "精铁", value: "5" },
  { label: "招募令", value: "6" },
  { label: "随机红将碎片", value: "7" },
  { label: "随机橙将碎片", value: "8" },
  { label: "随机紫将碎片", value: "9" },
  { label: "梦魇晶石", value: "10" },
  { label: "普通鱼竿", value: "11" },
  { label: "黄金鱼竿", value: "12" },
  { label: "咸神门票", value: "13" },
  { label: "白玉", value: "14" },
  { label: "彩玉", value: "15" },
  { label: "扳手", value: "16" },
];

// 盐锭商店商品选项
const saltIngotShopItemOptions = [
  { label: "皮肤币", value: "1", min: 1, max: 5 },
  { label: "军团币", value: "2", min: 1, max: 1 },
  { label: "进阶石", value: "3", min: 1, max: 1 },
  { label: "精铁", value: "4", min: 1, max: 1 },
  { label: "白玉", value: "5", min: 1, max: 1 },
  { label: "四圣宝珠碎片", value: "6", min: 1, max: 1 },
];

// 十殿预设选项（从 localStorage 加载）
const nightmarePresetOptions = computed(() => {
  try {
    const raw = localStorage.getItem('nightmare-presets');
    const presets = raw ? JSON.parse(raw) : [];
    return presets.map(p => ({
      id: p.id,
      name: p.name || '未命名预设',
      captainTokenId: p.captainTokenId,
      memberTokenIds: p.memberTokenIds || [],
      captainName: tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '未知',
      totalMembers: (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length,
    }));
  } catch {
    return [];
  }
});

// 勾选/取消十殿预设时，自动同步对应账号到 selectedTokens
const onNightmarePresetToggle = (preset, checked) => {
  if (checked) {
    if (!taskForm.nightmarePresetIds.includes(preset.id)) {
      taskForm.nightmarePresetIds.push(preset.id);
    }
    // 自动勾选队长和队员到账号列表
    const allIds = [preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean);
    for (const tid of allIds) {
      if (!taskForm.selectedTokens.includes(tid)) {
        taskForm.selectedTokens.push(tid);
      }
    }
  } else {
    taskForm.nightmarePresetIds = taskForm.nightmarePresetIds.filter(id => id !== preset.id);
    // 收集该预设的所有 token ID
    const removeIds = new Set([preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean));
    // 检查这些 token 是否被其他已勾选的预设引用
    const usedByOtherPresets = new Set();
    for (const pid of taskForm.nightmarePresetIds) {
      const p = nightmarePresetOptions.value.find(opt => opt.id === pid);
      if (p) {
        [p.captainTokenId, ...p.memberTokenIds].filter(Boolean).forEach(id => usedByOtherPresets.add(id));
      }
    }
    // 只移除不被其他预设使用的 token
    for (const tid of removeIds) {
      if (!usedByOtherPresets.has(tid)) {
        taskForm.selectedTokens = taskForm.selectedTokens.filter(id => id !== tid);
      }
    }
  }
};

// 计算总次数
const totalBoxWeeklyRewardCount = computed(() => {
  let total = 0;
  selectedBoxWeeklyRewards.value.forEach(rewardIndex => {
    total += boxWeeklyRewardCounts.value[rewardIndex] || 1;
  });
  return total;
});

const toggleBoxWeeklyReward = (rewardIndex, checked) => {
  if (checked) {
    if (!selectedBoxWeeklyRewards.value.includes(rewardIndex)) {
      selectedBoxWeeklyRewards.value.push(rewardIndex);
      if (!boxWeeklyRewardCounts.value[rewardIndex]) {
        boxWeeklyRewardCounts.value[rewardIndex] = 1;
      }
    }
  } else {
    const index = selectedBoxWeeklyRewards.value.indexOf(rewardIndex);
    if (index > -1) {
      selectedBoxWeeklyRewards.value.splice(index, 1);
      delete boxWeeklyRewardCounts.value[rewardIndex];
    }
  }
};

const openBoxWeeklyRewardModal = () => {
  selectedBoxWeeklyRewards.value = [5];  // 重置为默认选择珍珠
  boxWeeklyRewardCounts.value = { 5: 1 };  // 重置次数
  showBoxWeeklyRewardModal.value = true;
};

const executeBoxWeeklyRewards = () => {
  if (selectedBoxWeeklyRewards.value.length === 0) {
    message.warning("请至少选择一个奖励");
    return;
  }
  if (totalBoxWeeklyRewardCount.value > 4) {
    message.warning("总计最多只能领取4次");
    return;
  }
  
  // 构建奖励配置：{ rewardIndex: count }
  const rewardConfig = {};
  selectedBoxWeeklyRewards.value.forEach(rewardIndex => {
    rewardConfig[rewardIndex] = boxWeeklyRewardCounts.value[rewardIndex] || 1;
  });
  
  showBoxWeeklyRewardModal.value = false;
  batchClaimBoxWeeklyRewards(rewardConfig);
};

// 定时任务中的宝箱自选大奖配置
const totalTaskBoxWeeklyRewardCount = computed(() => {
  let total = 0;
  Object.values(taskForm.boxWeeklyRewards).forEach(count => {
    total += count;
  });
  return total;
});

const toggleTaskBoxWeeklyReward = (rewardIndex, checked) => {
  if (checked) {
    if (!taskForm.boxWeeklyRewards[rewardIndex] || taskForm.boxWeeklyRewards[rewardIndex] === 0) {
      taskForm.boxWeeklyRewards[rewardIndex] = 1;
    }
  } else {
    taskForm.boxWeeklyRewards[rewardIndex] = 0;
    delete taskForm.boxWeeklyRewards[rewardIndex];
  }
};

// Batch Settings State
const showBatchSettingsModal = ref(false);



const defaultDreamPurchaseList = [];
for (const merchantId in goldItemsConfig) {
  goldItemsConfig[merchantId].forEach((index) => {
    defaultDreamPurchaseList.push(`${merchantId}-${index}`);
  });
}

const batchSettings = reactive({
  dreamPurchaseList: defaultDreamPurchaseList,
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  targetBoxPoints: 1000,
  receiverId: "",
  tokenListColumns: 4,  // 默认4列
  autoColumns: true,    // 默认启用自动列数
  useGoldRefreshFallback: false,
  // 延迟配置（毫秒）
  commandDelay: 1000,       // 命令间延迟
  taskDelay: 1000,          // 任务间延迟
  actionDelay: 1000,        // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 1500,        // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1500,       // 刷新延迟（发车刷新等）
  longDelay: 5000,          // 长延迟（功法赠送等）
  taskIntervalWait: 0,      // 定时任务中每完成一个任务后的等待时间(秒)，0为不等待
  batchIntervalWait: 5,     // 定时任务中每完成一批账号后的等待时间(秒)，默认5秒，0为不等待
  // 功能模块延迟配置(ms)
  moduleDelays: {
    daily: 800,         // 日常任务
    arena: 1000,        // 竞技场
    tower: 1500,        // 爬塔/怪异塔
    store: 500,         // 黑市/商店购买
    treasure: 1500,     // 宝库/梦境
    activity: 2000,     // 消耗活动
    club: 1500,         // 俱乐部
    hero: 1000,         // 英雄/鱼灵/宠物升级
    bottle: 500,        // 罐子（重置/领取）
    hangup: 500,        // 挂机/签到/答题
    default: 800,       // 默认
  },
  // 黑市多选购买配置
  manualBuyItems: [],
  // 其他配置
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 30000,
  reconnectDelay: 5000,
  maxLogEntries: 1000,
  // 页面刷新配置
  enableRefresh: true,
  refreshInterval: 360, // 分钟
  smartDepartureEnabled: true,
  smartDepartureGoldThreshold: 800,
  smartDepartureRecruitThreshold: 20,
  smartDepartureJadeThreshold: 1500,
  smartDepartureTicketThreshold: 4,
  requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
  // 分页配置
  tokensPerPage: 20,      // 账号每页显示数量
  logPageSize: 100,       // 日志虚拟滚动每页数量
  // 高级配置
  defaultCommandTimeout: 5000,      // 默认命令超时时间(ms)
  battleCommandTimeout: 12000,      // 战斗命令超时时间(ms)
  defaultRetryCount: 2,             // 默认重试次数
  retryDelay: 10000,                 // 重试延迟(ms)
  accountRetryInterval: 5000,       // 账号间重试间隔(ms)
  // 挂机时间控制配置
  hangUpMinTime: 9,                 // 最小挂机时间（小时），默认9小时
  hangUpTimeControlEnabled: false,  // 是否启用挂机时间控制，默认关闭
  // 宠物合成等级限制
  petMergeMaxLevelEnabled: false,   // 是否启用宠物合成等级限制，默认关闭
  petMergeMaxLevel: 4,              // 合成等级上限（1-7），默认4级
  // 兑换码
  cdkCode: '',                      // 兑换码（定时任务使用）
});

// 账号搜索关键词
const tokenSearchKeyword = ref("");

// 处理账号搜索
const handleTokenSearch = () => {
  // 搜索逻辑已在 sortedTokens 计算属性中实现
  // 这里可以添加额外的搜索逻辑，如高亮显示等
};

// Load batch settings from localStorage
// 检测浏览器类型并返回推荐的连接池大小
const getOptimalPoolSize = () => {
  const ua = navigator.userAgent;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 5;  // Safari
  if (/Firefox/.test(ua)) return 5;                       // Firefox
  if (/Chrome|Edge/.test(ua)) return 5;                   // Chrome/Edge
  return 5;                                               // 默认
};

const loadBatchSettings = () => {
  try {
    const saved = localStorage.getItem("batchSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      // 深度合并 moduleDelays，保留新增模块的默认值
      if (parsed.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, parsed.moduleDelays);
        delete parsed.moduleDelays;
      }
      Object.assign(batchSettings, parsed);
      
      // 如果开启了自动模式，立即重新计算列数
      if (batchSettings.autoColumns && typeof window !== 'undefined') {
        nextTick(() => {
          windowWidth.value = window.innerWidth;
        });
      }
    } else {
      // 根据浏览器自动设置最佳连接池大小
      batchSettings.maxActive = getOptimalPoolSize();
    }
  } catch (error) {
    console.error("Failed to load batch settings:", error);
  }
};

// Save batch settings to localStorage
const saveBatchSettings = () => {
  try {
    // 检查并发数是否超过推荐值
    const optimalSize = getOptimalPoolSize();
    if (batchSettings.maxActive > optimalSize) {
      let browserName = "浏览器";
      if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
        browserName = "Safari";
      } else if (/Firefox/.test(navigator.userAgent)) {
        browserName = "Firefox";
      } else if (/Chrome|Edge/.test(navigator.userAgent)) {
        browserName = "Chrome/Edge";
      }
      
      console.warn(`⚠️ 警告：并发数 ${batchSettings.maxActive} 超过${browserName}推荐值(${optimalSize})`);
      console.warn(`⚠️ 可能导致WebSocket连接失败、浏览器卡顿等问题`);
      console.warn(`️ 建议设置为${optimalSize}或以下`);
      message.warning(`${browserName}浏览器建议连接池大小不超过${optimalSize}，当前设置: ${batchSettings.maxActive}，可能导致WebSocket连接失败`);
    }
    
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    
    // 输出当前配置信息
    console.log('=== 当前高级配置 ===');
    console.log('超时配置:');
    console.log('  - 默认命令超时:', batchSettings.defaultCommandTimeout, 'ms');
    console.log('  - 战斗命令超时:', batchSettings.battleCommandTimeout, 'ms');
    console.log('重试配置:');
    console.log('  - 默认重试次数:', batchSettings.defaultRetryCount, '次');
    console.log('  - 重试延迟:', batchSettings.retryDelay, 'ms');
    console.log('  - 账号重试间隔:', batchSettings.accountRetryInterval, 'ms');
    console.log('==================');
    
    message.success("定时批量任务设置已保存");
    showBatchSettingsModal.value = false;
  } catch (error) {
    console.error("Failed to save batch settings:", error);
    message.error("保存设置失败");
  }
};

// 恢复模块延迟默认值
const resetModuleDelays = () => {
  const defaults = defaultBatchSettings.moduleDelays;
  Object.keys(defaults).forEach(key => {
    batchSettings.moduleDelays[key] = defaults[key];
  });
  message.success("模块延迟已恢复默认值");
};

// 恢复延迟设置默认值
const resetDelaySettings = () => {
  const keys = ['commandDelay', 'taskDelay', 'actionDelay', 'battleDelay', 'refreshDelay', 'longDelay'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("延迟设置已恢复默认值");
};

// 恢复高级配置默认值
const resetAdvancedSettings = () => {
  const keys = ['defaultCommandTimeout', 'battleCommandTimeout', 'defaultRetryCount', 'retryDelay', 'accountRetryInterval'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("高级配置已恢复默认值");
};

// Open batch settings modal
const openBatchSettings = () => {
  loadBatchSettings();
  showBatchSettingsModal.value = true;
};

// Load settings on component mount
loadBatchSettings();

// ======================
// Legacy Gift Feature
// ======================

// Legacy Gift Modal State
const showLegacyGiftModal = ref(false);
const recipientIdInput = ref("");
const recipientIdError = ref("");
const recipientInfo = ref(null);
const isQueryingRecipient = ref(false);

const securityPassword = ref(""); // 安全密码(保留以兼容旧逻辑)
const isPasswordAutoFilled = ref(false); // 保留以兼容旧逻辑

// 计算属性: 检查选中的账号是否都有密码
const hasPasswordForSelectedTokens = computed(() => {
  if (selectedTokens.value.length === 0) return false;
  
  // 检查所有选中的账号是否都有密码配置
  return selectedTokens.value.every((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        return !!settings?.legacyGiftPassword;
      }
      return false;
    } catch (error) {
      return false;
    }
  });
});

// 计算属性: 密码状态提示信息
const passwordStatusMessage = computed(() => {
  if (selectedTokens.value.length === 0) {
    return '请先选择要操作的账号';
  }
  
  const tokensWithoutPassword = [];
  const tokensWithPassword = [];
  
  selectedTokens.value.forEach((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (settings?.legacyGiftPassword) {
          tokensWithPassword.push(tokenId);
        } else {
          tokensWithoutPassword.push(tokenId);
        }
      } else {
        tokensWithoutPassword.push(tokenId);
      }
    } catch (error) {
      tokensWithoutPassword.push(tokenId);
    }
  });
  
  if (tokensWithoutPassword.length === 0) {
    return `✓ 所有选中账号(${selectedTokens.value.length}个)已配置功法赠送密码`;
  } else if (tokensWithPassword.length === 0) {
    return `✗ 所有选中账号(${selectedTokens.value.length}个)未配置密码，请在账号设置或任务模板中配置`;
  } else {
    return `⚠ ${tokensWithPassword.length}个账号已配置密码，${tokensWithoutPassword.length}个账号未配置`;
  }
});

// 计算属性: 密码状态提示类型
const passwordStatusType = computed(() => {
  if (selectedTokens.value.length === 0) return 'default';
  
  const tokensWithoutPassword = [];
  selectedTokens.value.forEach((tokenId) => {
    try {
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (!settings?.legacyGiftPassword) {
          tokensWithoutPassword.push(tokenId);
        }
      } else {
        tokensWithoutPassword.push(tokenId);
      }
    } catch (error) {
      tokensWithoutPassword.push(tokenId);
    }
  });
  
  if (tokensWithoutPassword.length === 0) return 'success';
  if (tokensWithoutPassword.length === selectedTokens.value.length) return 'error';
  return 'warning';
});
// 从任务模板加载密码(保留以兼容旧逻辑，但不再使用)
const loadPasswordFromTemplate = () => {
  // 不再需要自动填充，密码直接从账号设置中读取
};

// 头像加载状态
const isAvatarLoading = ref(false);
const avatarLoadError = ref(false);

// ======================
// Scheduled Tasks Feature
// ======================

// Scheduled Tasks State Management
const scheduledTasks = ref([]); // List of all scheduled tasks
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const editingTask = ref(null); // Currently editing task
const taskForm = reactive({
  name: "", // Task name
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
  offlineTimeEnabled: false, // 是否启用不上线时段
  legionStoreItems: { // 助威商店商品配置
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  },
  saltCrystalShopItems: { // 盐晶商店商品配置
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  },
  saltIngotShopItems: { // 盐锭商店商品配置
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  },
  manualBuyItems: { // 黑市多选购买商品配置
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  },
  weeklyMarketItems: { // 黑市周商品配置
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  },
  boxWeeklyRewards: {5: 1}, // 宝箱周自选大奖配置，默认珍珠1次
  smartDeparture: { // 智能发车任务级配置（覆盖全局设置）
    enabled: false, // 是否启用任务级配置
    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2, // 刷新后等待同步延迟（秒）
    requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
  },
  nightmarePresetIds: [], // 十殿阎罗挑战预设ID列表
  nightmarePresetDelay: 10, // 预设间执行间隔（秒），默认10秒
});

// 任务分组定义
const taskGroupDefinitions = [
  { name: 'daily', label: '日常', tasks: ['startBatch', 'claimHangUpRewards', 'batchAddHangUpTime', 'resetBottles', 'batchlingguanzi', 'batchclubsign', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'batchCarResearchUpgrade', 'store_purchase', 'batch_mail_claim_and_cleanup'] },
  { name: 'welfare', label: '福利', tasks: ['charge_claimaddup_rewards', 'collection_claimfreereward', 'gacha_drawreward', 'claim_recruit_welfare', 'pkroom_appoint'] },
  { name: 'dungeon', label: '副本', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'skinTreasure', 'batchClaimPeachTasks', 'batchBuyDreamItems'] },
  { name: 'baoku', label: '宝库', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '怪异塔', tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy', 'claim_weird_tower_all', 'claim_weird_tower_pass'] },
  { name: 'illustration', label: '图鉴', tasks: ['openHeroFourSaintsModal', 'batchHeroUpgrade', 'batchBookUpgrade', 'batchFishUpgrade', 'batchClaimStarRewards', 'batchCollectionActivate'] },
  { name: 'pet', label: '宠物', tasks: ['legion_buy_spotted_egg', 'use_spotted_egg', 'claim_pet_book', 'batch_pet_merge', 'batch_pet_upgrade'] },
  { name: 'nightmare', label: '十殿', tasks: ['batchNightmareChallengePresets', 'nightmare_draw_lottery', 'nightmare_claim_book_reward', 'star_drawturntable', 'batch_star_challenge'] },
  { name: 'resource', label: '资源', tasks: ['batchOpenBox', 'batchOpenBoxByPoints', 'batchOpenDiamondBox', 'batchOpenFragmentPacks', 'batchClaimBoxWeeklyRewards', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods', 'legionStoreBuySkinCoins', 'weekly_market_buy', 'weekly_market_free_gift', 'store_purchase', 'manual_buy', 'buy_top_rod_package', 'buy_super_spirit_shell', 'store_buy_jade', 'legion_buy_red_jade', 'salt_crystal_shop_buy', 'salt_ingot_shop_buy', 'batchGenieSweep', 'batchConsumeActivity', 'batchClaimConsumeRewards', 'batchAutumnUseItem', 'batchUseActivityItem', 'batchActivityExchange', 'batchClaimCdkReward', 'batchClaimApexRewards'] },
  { name: 'legacy', label: '功法', tasks: ['batchLegacyHangup', 'batchLegacyClaim', 'batchLegacyGiftSendEnhanced', 'batchLegacyClaimGiftTask'] },
  { name: 'monthly', label: '月度', tasks: ['batchTopUpFish', 'batchTopUpArena', 'claim_guess_coin', 'legion_buy_store_items'] }
];

// 计算属性，根据 taskGroupDefinitions 将 availableTasks 分组
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach(group => {
    groups[group.name] = availableTasks.filter(task => group.tasks.includes(task.value));
  });
  
  // ✅ 禁用“其他”模块，只显示明确分组的任务
  // const groupedTaskValues = taskGroupDefinitions.flatMap(g => g.tasks);
  // const otherTasks = availableTasks.filter(task => !groupedTaskValues.includes(task.value));
  // if (otherTasks.length > 0) {
  //   groups['other'] = otherTasks;
  // }
  
  return groups;
});

// Cron表达式解析相关变量
const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// 注: availableTasks, CarresearchItem, taskColumns 已从 @/utils/batch 导入

// ======================
// Scheduled Tasks Storage
// ======================

// Track executing tasks for UI loading state
const executingTaskIds = ref([]);

// Manual execute task
const manualExecuteTask = async (task) => {
  if (executingTaskIds.value.includes(task.id)) return;
  
  // Reset stop flag if not running, to allow manual execution
  if (!isRunning.value && shouldStop.value) {
    shouldStop.value = false;
  }
  
  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(id => id !== task.id);
  }
};

// Load scheduled tasks from localStorage
const loadScheduledTasks = () => {
  try {
    const saved = localStorage.getItem("scheduledTasks");

    if (saved) {
      const parsed = JSON.parse(saved);

      // Ensure we have an array
      scheduledTasks.value = Array.isArray(parsed) ? parsed : [];
    } else {
      scheduledTasks.value = [];
    }
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    scheduledTasks.value = [];
  }
};

/**
 * 检查当前时间是否在不上线时段内
 * 不上线时段：周五05:00-07:00 / 周六19:50-21:10 / 周日19:50-20:40
 * @returns {boolean} true表示在不上线时段内，false表示不在
 */
const isInOfflineTime = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6 (0=周日, 6=周六, 5=周五)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // 转换为分钟数
  
  // 调试日志
  console.log('[不上线时段检查] ========== 开始检查 ==========');
  console.log('[不上线时段检查] 当前时间:', now.toLocaleString('zh-CN'));
  console.log('[不上线时段检查] 星期:', ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek], `(dayOfWeek=${dayOfWeek})`);
  console.log('[不上线时段检查] 当前分钟数:', currentTime, `(${hours}:${minutes.toString().padStart(2, '0')})`);
  
  // 周五 05:00-07:00
  if (dayOfWeek === 5) {
    const startTime = 5 * 60;       // 05:00 = 300分钟
    const endTime = 7 * 60;         // 07:00 = 420分钟
    console.log('[不上线时段检查] 周五时段:', `${startTime}-${endTime}分钟 (05:00-07:00)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  // 周六 19:50-21:10
  if (dayOfWeek === 6) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190分钟
    const endTime = 21 * 60 + 10;   // 21:10 = 1270分钟
    console.log('[不上线时段检查] 周六时段:', `${startTime}-${endTime}分钟 (19:50-21:10)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  // 周日 19:50-20:40
  if (dayOfWeek === 0) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190分钟
    const endTime = 20 * 60 + 40;   // 20:40 = 1240分钟
    console.log('[不上线时段检查] 周日时段:', `${startTime}-${endTime}分钟 (19:50-20:40)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[不上线时段检查] 是否在范围内:', inRange);
    if (inRange) {
      console.log('[不上线时段检查] ✓ 在不上线时段内');
      console.log('[不上线时段检查] ========== 结束检查 ==========');
      return true;
    }
  }
  
  console.log('[不上线时段检查]  不在不上线时段内');
  console.log('[不上线时段检查] ========== 结束检查 ==========');
  return false;
};

/**
 * 测试不上线时段功能（临时测试函数）
 */
const testOfflineTime = () => {
  console.log('\n========== 测试不上线时段功能 ==========');
  const result = isInOfflineTime();
  console.log('测试结果:', result ? '在不上线时段内' : '不在不上线时段内');
  console.log('========================================\n');
  return result;
};

// 暴露到全局供测试
window.testOfflineTime = testOfflineTime;

// Save scheduled tasks to localStorage
const saveScheduledTasks = () => {
  try {
    const dataToSave = JSON.stringify(scheduledTasks.value);

    localStorage.setItem("scheduledTasks", dataToSave);
    // Verify save was successful
    const saved = localStorage.getItem("scheduledTasks");
  } catch (error) {
    console.error("Failed to save scheduled tasks:", error);
  }
};

/**
 * 批量控制所有任务的不上线时段开关
 * @param {boolean} enabled - true为开启，false为关闭
 */
const toggleAllOfflineTime = (enabled) => {
  if (scheduledTasks.value.length === 0) {
    message.warning("没有定时任务可操作");
    return;
  }
  
  const action = enabled ? "开启" : "关闭";
  
  // 更新所有任务的不上线时段设置
  scheduledTasks.value.forEach(task => {
    task.offlineTimeEnabled = enabled;
  });
  
  // 保存到localStorage
  saveScheduledTasks();
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已批量${action}所有定时任务的不上线时段 ===`,
    type: "success",
  });
  
  message.success(`已批量${action}所有定时任务的不上线时段`);
};

// Open task modal for adding new task
// 取消任务编辑
const cancelTaskEdit = () => {
  showTaskModal.value = false;
  // 延迟重置表单，避免模态框关闭动画时看到表单变化
  setTimeout(() => {
    editingTask.value = null;
    
    // 直接赋值重置表单
    taskForm.name = "";
    taskForm.runType = "daily";
    taskForm.runTime = undefined;
    taskForm.cronExpression = "";
    taskForm.selectedTokens = [];
    taskForm.selectedTasks = [];
    taskForm.enabled = true;
    taskForm.offlineTimeEnabled = false;
    
    taskForm.legionStoreItems = {
      7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
      8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
      9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
      10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
      11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
    };
    
    taskForm.weeklyMarketItems = {
      0: { selected: false, label: "免费金砖" },
      1: { selected: false, label: "黑市见面礼" },
      2: { selected: false, label: "黑市惊喜礼" },
      3: { selected: false, label: "初级黑市包" },
      4: { selected: false, label: "中级黑市包" },
      5: { selected: false, label: "高级黑市包" },
      6: { selected: false, label: "顶级鱼竿包" },
      7: { selected: false, label: "白玉黑市包" },
      8: { selected: false, label: "特级灵贝包" },
      9: { selected: false, label: "养成补给包" },
    };
    
    taskForm.boxWeeklyRewards = {5: 1};
    taskForm.nightmarePresetIds = [];
    taskForm.nightmarePresetDelay = 10;
    taskScheduleSelectedGroupIds.value = [];
  }, 300);
};

const openTaskModal = () => {
  editingTask.value = null;
  
  console.log('[新增任务] 开始初始化表单');
  
  // 重置表单，直接赋值确保嵌套对象正确重置
  taskForm.name = "";
  taskForm.runType = "daily";
  taskForm.runTime = undefined;
  taskForm.cronExpression = "";
  taskForm.selectedTokens = [];
  taskForm.selectedTasks = [];
  taskForm.enabled = true;
  taskForm.offlineTimeEnabled = false;
  
  // 直接赋值助威商店配置
  taskForm.legionStoreItems = {
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  };
  
  // 直接赋值黑市商品配置
  taskForm.weeklyMarketItems = {
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  };
  
  // 直接赋值宝箱周奖励配置
  taskForm.boxWeeklyRewards = {5: 1};
  
  // 盐晶商店配置
  taskForm.saltCrystalShopItems = {
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  };
  
  // 盐锭商店配置
  taskForm.saltIngotShopItems = {
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  };

  // 黑市多选购买商品配置
  taskForm.manualBuyItems = {
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  };

  // 十殿预设配置
  taskForm.nightmarePresetIds = [];
  taskForm.nightmarePresetDelay = 10;
  
  console.log('[新增任务] 初始化完成');
  console.log('[新增任务] weeklyMarketItems:', taskForm.weeklyMarketItems);
  console.log('[新增任务] legionStoreItems:', taskForm.legionStoreItems);
  
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// Edit existing task
const editTask = (task) => {
  editingTask.value = task;
  
  // 默认助威商店配置
  const defaultLegionStoreItems = {
    7: { selected: false, count: 1, label: "随机红将碎片", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "白玉", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "军团币", min: 1, max: 1 },
    10: { selected: false, count: 20, label: "进阶石", min: 1, max: 20 },
    11: { selected: false, count: 20, label: "精铁", min: 1, max: 20 },
  };
  
  // 默认黑市商品配置
  const defaultWeeklyMarketItems = {
    0: { selected: false, label: "免费金砖" },
    1: { selected: false, label: "黑市见面礼" },
    2: { selected: false, label: "黑市惊喜礼" },
    3: { selected: false, label: "初级黑市包" },
    4: { selected: false, label: "中级黑市包" },
    5: { selected: false, label: "高级黑市包" },
    6: { selected: false, label: "顶级鱼竿包" },
    7: { selected: false, label: "白玉黑市包" },
    8: { selected: false, label: "特级灵贝包" },
    9: { selected: false, label: "养成补给包" },
  };
  
  // 默认盐晶商店配置
  const defaultSaltCrystalShopItems = {
    201: { selected: false, count: 0, label: "四圣蓝玉", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "四圣红玉", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "成长脆饼", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "斑点蛋", min: 1, max: 5 },
  };
  
  // 默认盐锭商店配置
  const defaultSaltIngotShopItems = {
    1: { selected: false, count: 0, label: "皮肤币", min: 1, max: 5 },
    2: { selected: false, count: 0, label: "军团币", min: 1, max: 1 },
    3: { selected: false, count: 0, label: "进阶石", min: 1, max: 1 },
    4: { selected: false, count: 0, label: "精铁", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "白玉", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "四圣宝珠碎片", min: 1, max: 1 },
  };
  
  // 默认黑市多选购买配置
  const defaultManualBuyItems = {
    1: { selected: false, count: 0, label: "青铜宝箱" },
    2: { selected: false, count: 0, label: "黄金宝箱" },
    3: { selected: false, count: 0, label: "铂金宝箱" },
    4: { selected: false, count: 0, label: "进阶石" },
    5: { selected: false, count: 0, label: "精铁" },
    6: { selected: false, count: 0, label: "招募令" },
    7: { selected: false, count: 0, label: "随机红将碎片" },
    8: { selected: false, count: 0, label: "随机橙将碎片" },
    9: { selected: false, count: 0, label: "随机紫将碎片" },
    10: { selected: false, count: 0, label: "梦魇晶石" },
    11: { selected: false, count: 0, label: "普通鱼竿" },
    12: { selected: false, count: 0, label: "黄金鱼竿" },
    13: { selected: false, count: 0, label: "咸神门票" },
    14: { selected: false, count: 0, label: "白玉" },
    15: { selected: false, count: 0, label: "彩玉" },
    16: { selected: false, count: 0, label: "扳手" },
  };
  
  // 合并助威商店配置，补充缺失的label
  const mergedLegionStoreItems = { ...defaultLegionStoreItems };
  if (task.legionStoreItems) {
    Object.keys(task.legionStoreItems).forEach(key => {
      if (mergedLegionStoreItems[key]) {
        // 保留用户的选择，但补充label等字段
        mergedLegionStoreItems[key] = {
          ...mergedLegionStoreItems[key],
          ...task.legionStoreItems[key],
        };
      }
    });
  }
  
  // 合并黑市商品配置，补充缺失的label
  const mergedWeeklyMarketItems = { ...defaultWeeklyMarketItems };
  if (task.weeklyMarketItems) {
    Object.keys(task.weeklyMarketItems).forEach(key => {
      if (mergedWeeklyMarketItems[key]) {
        mergedWeeklyMarketItems[key] = {
          ...mergedWeeklyMarketItems[key],
          ...task.weeklyMarketItems[key],
        };
      }
    });
  }
  
  // 合并盐晶商店配置，补充缺失的label
  const mergedSaltCrystalShopItems = { ...defaultSaltCrystalShopItems };
  if (task.saltCrystalShopItems) {
    Object.keys(task.saltCrystalShopItems).forEach(key => {
      if (mergedSaltCrystalShopItems[key]) {
        mergedSaltCrystalShopItems[key] = {
          ...mergedSaltCrystalShopItems[key],
          ...task.saltCrystalShopItems[key],
        };
      }
    });
  }
  
  // 合并盐锭商店配置，补充缺失的label
  const mergedSaltIngotShopItems = { ...defaultSaltIngotShopItems };
  if (task.saltIngotShopItems) {
    Object.keys(task.saltIngotShopItems).forEach(key => {
      if (mergedSaltIngotShopItems[key]) {
        mergedSaltIngotShopItems[key] = {
          ...mergedSaltIngotShopItems[key],
          ...task.saltIngotShopItems[key],
        };
      }
    });
  }
  
  // 合并黑市多选购买配置，补充缺失的label
  const mergedManualBuyItems = { ...defaultManualBuyItems };
  if (task.manualBuyItems) {
    Object.keys(task.manualBuyItems).forEach(key => {
      if (mergedManualBuyItems[key]) {
        mergedManualBuyItems[key] = {
          ...mergedManualBuyItems[key],
          ...task.manualBuyItems[key],
        };
      }
    });
  }
  
  const taskData = { 
    ...task,
    legionStoreItems: mergedLegionStoreItems,
    weeklyMarketItems: mergedWeeklyMarketItems,
    saltCrystalShopItems: mergedSaltCrystalShopItems,
    saltIngotShopItems: mergedSaltIngotShopItems,
    manualBuyItems: mergedManualBuyItems,
    boxWeeklyRewards: task.boxWeeklyRewards || {5: 1},
    smartDeparture: task.smartDeparture || {
      enabled: false,
      goldThreshold: 800,
      recruitThreshold: 20,
      jadeThreshold: 1500,
      ticketThreshold: 4,
      carMinColor: 4,
      refreshDelay: 2,
      requireMinColorWithConditions: false,
    },
    nightmarePresetIds: task.nightmarePresetIds || [],
    nightmarePresetDelay: task.nightmarePresetDelay || 10,
  };
  
  if (
    task.runType === "daily" &&
    task.runTime &&
    typeof task.runTime === "string"
  ) {
    const [hours, minutes] = task.runTime.split(":").map(Number);
    const now = new Date();
    taskData.runTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    );
  }
  Object.assign(taskForm, taskData);
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// 注: validateCronExpression 已从 @/utils/batch 导入

// Parse cron expression and calculate next execution times
const parseCronExpression = (expression) => {
  // Validate the expression first
  const validation = validateCronExpression(expression);
  cronValidation.value = validation;

  if (!validation.valid) {
    cronNextRuns.value = [];
    return;
  }

  // Parse the expression and calculate next runs
  const cronParts = expression.split(" ").filter(Boolean);
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    cronParts;

  // Calculate next 5 execution times
  const nextRuns = calculateNextRuns(
    minuteField,
    hourField,
    dayOfMonthField,
    monthField,
    dayOfWeekField,
    5,
  );
  cronNextRuns.value = nextRuns;
};

// 注: calculateNextRuns 已从 @/utils/batch 导入

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("请输入任务名称");
    return;
  }

  if (taskForm.runType === "daily" && !taskForm.runTime) {
    message.warning("请选择运行时间");
    return;
  }

  if (taskForm.runType === "cron") {
    if (!taskForm.cronExpression) {
      message.warning("请输入Cron表达式");
      return;
    }

    // Validate cron expression
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }

  // 十殿阎罗挑战预设自带账号（队长+队员），无需额外选择账号
  const hasNightmarePresets = taskForm.selectedTasks.includes('batchNightmareChallengePresets') && (taskForm.nightmarePresetIds?.length > 0);
  // 其他需要账号的任务（排除十殿预设）
  const nonNightmareTasks = taskForm.selectedTasks.filter(t => t !== 'batchNightmareChallengePresets');
  
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length > 0 && !hasNightmarePresets) {
    message.warning("请选择至少一个账号");
    return;
  }
  // 如果只有十殿预设任务且未选预设，提示选择预设
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length === 0 && !hasNightmarePresets) {
    message.warning("请选择至少一个账号，或选择十殿阎罗挑战预设（预设自带账号）");
    return;
  }

  if (taskForm.selectedTasks.length === 0) {
    message.warning("请选择至少一个任务");
    return;
  }
  
  // 验证助威商店是否选择了商品
  if (taskForm.selectedTasks.includes('legion_buy_store_items')) {
    const hasSelectedItem = Object.values(taskForm.legionStoreItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("助威商店多选购买需要至少选择一个商品");
      return;
    }
  }

  // 验证消耗活动兑换商店是否选择了商品
  if (taskForm.selectedTasks.includes('batchActivityExchange')) {
    const hasSelectedItem = taskForm.activityExchangeItems && Object.values(taskForm.activityExchangeItems).some(item => item && item.selected);
    if (!hasSelectedItem) {
      message.warning("消耗活动兑换购买需要至少选择一个商品");
      return;
    }
  }
  
  // 验证盐晶商店是否选择了商品
  if (taskForm.selectedTasks.includes('salt_crystal_shop_buy')) {
    const hasSelectedItem = taskForm.saltCrystalShopItems && Object.values(taskForm.saltCrystalShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("盐晶商店需要至少选择一个商品");
      return;
    }
  }
  
  // 验证盐锭商店是否选择了商品
  if (taskForm.selectedTasks.includes('salt_ingot_shop_buy')) {
    const hasSelectedItem = taskForm.saltIngotShopItems && Object.values(taskForm.saltIngotShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("盐锭商店需要至少选择一个商品");
      return;
    }
  }
  
  // 验证黑市多选购买是否选择了商品
  if (taskForm.selectedTasks.includes('manual_buy')) {
    const hasSelectedItem = taskForm.manualBuyItems && Object.values(taskForm.manualBuyItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("黑市多选购买需要至少选择一个商品");
      return;
    }
  }
  
  // 验证黑市周购买是否选择了商品
  if (taskForm.selectedTasks.includes('weekly_market_buy')) {
    const hasSelectedItem = Object.values(taskForm.weeklyMarketItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("黑市周购买需要至少选择一个商品");
      return;
    }
  }

  // 验证十殿阎罗挑战是否选择了预设
  if (taskForm.selectedTasks.includes('batchNightmareChallengePresets')) {
    if (!taskForm.nightmarePresetIds || taskForm.nightmarePresetIds.length === 0) {
      message.warning("十殿阎罗挑战需要至少选择一个预设");
      return;
    }
  }

  // 验证宝箱周任务是否在当前是宝箱周（保存时提醒）
  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = taskForm.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    message.warning("当前不是宝箱周，宝箱周任务将在宝箱周期间自动执行");
    // 不阻止保存，但给用户提示
  }

  // Format runTime as string for storage
  let formattedRunTime = null;
  if (taskForm.runType === "daily" && taskForm.runTime) {
    const time = new Date(taskForm.runTime);
    formattedRunTime = time.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const taskData = {
    id: editingTask.value?.id || "task_" + Date.now(),
    name: taskForm.name,
    runType: taskForm.runType,
    runTime: formattedRunTime,
    cronExpression: taskForm.runType === "cron" ? taskForm.cronExpression : "",
    selectedTokens: [...taskForm.selectedTokens],
    selectedTasks: [...taskForm.selectedTasks],
    enabled: taskForm.enabled,
    offlineTimeEnabled: taskForm.offlineTimeEnabled || false, // 保存不上线时段设置
    // 始终保存完整配置，确保编辑时能正确显示
    legionStoreItems: JSON.parse(JSON.stringify(taskForm.legionStoreItems)),
    weeklyMarketItems: JSON.parse(JSON.stringify(taskForm.weeklyMarketItems)),
    saltCrystalShopItems: JSON.parse(JSON.stringify(taskForm.saltCrystalShopItems)),
    saltIngotShopItems: JSON.parse(JSON.stringify(taskForm.saltIngotShopItems)),
    manualBuyItems: JSON.parse(JSON.stringify(taskForm.manualBuyItems)),
    boxWeeklyRewards: {...taskForm.boxWeeklyRewards},
    smartDeparture: JSON.parse(JSON.stringify(taskForm.smartDeparture)),
    nightmarePresetIds: [...(taskForm.nightmarePresetIds || [])],
    nightmarePresetDelay: taskForm.nightmarePresetDelay || 10,
  };

  let isNew = !editingTask.value;

  if (editingTask.value) {
    // Update existing task
    const index = scheduledTasks.value.findIndex(
      (t) => t.id === editingTask.value.id,
    );
    if (index !== -1) {
      scheduledTasks.value[index] = taskData;
    }
  } else {
    // Add new task
    scheduledTasks.value.push(taskData);
  }

  saveScheduledTasks();

  // Add log entry for task save
  addTaskSaveLog(taskData, isNew, addLog);

  showTaskModal.value = false;
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    message.success("定时任务已删除");
  }
};

// Delete all scheduled tasks
const deleteAllScheduledTasks = () => {
  const count = scheduledTasks.value.length;
  if (count === 0) return;
  
  if (!confirm(`确定要删除全部 ${count} 个定时任务吗？此操作不可恢复！`)) return;
  
  scheduledTasks.value = [];
  saveScheduledTasks();
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已批量删除 ${count} 个定时任务 ===`,
    type: "info",
  });
  message.success(`已删除 ${count} 个定时任务`);
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  }
};

// 启动/关闭所有定时任务
const allTasksEnabled = computed(() =>
  scheduledTasks.value.length > 0 && scheduledTasks.value.every(t => t.enabled)
);

const enableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = true; });
  saveScheduledTasks();
  message.success(`已启动所有 ${scheduledTasks.value.length} 个定时任务`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已启动所有 ${scheduledTasks.value.length} 个定时任务 ===`,
    type: "success",
  });
};

const disableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = false; });
  saveScheduledTasks();
  message.success(`已关闭所有 ${scheduledTasks.value.length} 个定时任务`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已关闭所有 ${scheduledTasks.value.length} 个定时任务 ===`,
    type: "info",
  });
};

// 注: addTaskSaveLog 已从 @/utils/batch 导入，调用时需传入 addLog

// Reset run type related fields
const resetRunType = () => {
  if (taskForm.runType === "daily") {
    taskForm.cronExpression = "";
  } else {
    taskForm.runTime = undefined;
  }
};

// Select all tokens
const selectAllTokens = () => {
  taskForm.selectedTokens = tokens.value.map((token) => token.id);
};

// Deselect all tokens
const deselectAllTokens = () => {
  taskForm.selectedTokens = [];
};

// Select all tasks
const selectAllTasks = () => {
  taskForm.selectedTasks = availableTasks.map((task) => task.value);
};

// Deselect all tasks
const deselectAllTasks = () => {
  taskForm.selectedTasks = [];
};

// ======================
// Import/Export Config
// ======================

// Export scheduled tasks configuration only
const exportScheduledTasksConfig = async () => {
  try {
    if (!scheduledTasks.value || !Array.isArray(scheduledTasks.value)) {
      message.error("定时任务数据加载失败，请刷新页面后重试");
      return;
    }

    const validTokenIds = new Set((tokens.value || []).map((t) => t.id));
    const filteredScheduledTasks = scheduledTasks.value.map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((task) => task.selectedTokens.length > 0);

    const exportData = {
      version: "1.3",
      exportTime: new Date().toISOString(),
      configType: "scheduled-tasks",
      scheduledTasks: filteredScheduledTasks,
      batchSettings: getFullBatchSettings(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const success = await downloadFile(blob, `scheduled-tasks-config_${new Date().toISOString().slice(0, 10)}.json`);
    if (success) {
      message.success(`定时配置导出成功: ${filteredScheduledTasks.length} 个定时任务`);
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Export scheduled tasks failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// Trigger file input for importing scheduled tasks
const triggerImportScheduledTasks = () => {
  importScheduledTasksInput.value?.click();
};

// Handle scheduled tasks file import
const handleImportScheduledTasks = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importScheduledTasksConfig({ file });
  } finally {
    event.target.value = '';
  }
};

// Trigger file input for importing account config
const triggerImportAccountConfig = () => {
  importAccountConfigInput.value?.click();
};

// Handle account config file import
const handleImportAccountConfig = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await importAccountConfig({ file });
  event.target.value = '';
};

// Trigger file input for full config import
const triggerImportFullConfig = () => {
  importFullConfigInput.value?.click();
};

// Handle full config file import
const handleImportFullConfig = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importConfig({ file });
  } finally {
    event.target.value = '';
  }
};

// Import scheduled tasks configuration only
const importScheduledTasksConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    const importData = JSON.parse(fileContent);

    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "scheduled-tasks") {
      message.error("这是账号配置文件，请使用「导入账号配置」功能");
      return;
    }
    if (!importData.scheduledTasks && !importData.configType) {
      message.error("无效的定时配置文件格式：缺少定时任务数据");
      return;
    }

    let importedTasks = 0;

    if (Array.isArray(importData.scheduledTasks)) {
      if (!scheduledTasks.value || !Array.isArray(scheduledTasks.value)) {
        scheduledTasks.value = [];
      }
      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          scheduledTasks.value.push(task);
          importedTasks++;
        }
      });
      if (importedTasks > 0) saveScheduledTasks();
    }

    if (importData.batchSettings && typeof importData.batchSettings === 'object') {
      if (importData.batchSettings.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, importData.batchSettings.moduleDelays);
      }
      Object.assign(batchSettings, importData.batchSettings);
      try { localStorage.setItem("batchSettings", JSON.stringify(batchSettings)); } catch (e) { /* ignore */ }
    }

    const parts = [];
    if (importedTasks > 0) parts.push(`${importedTasks} 个新定时任务`);
    if (importData.batchSettings) parts.push('批量设置已恢复');
    if (parts.length === 0) parts.push('无新增数据（已存在）');

    message.success(`定时配置导入成功: ${parts.join(', ')}`);
  } catch (error) {
    console.error("Import scheduled tasks failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// ===== 导入导出共享辅助函数 =====

// 读取文件内容为文本（Promise化）
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// ArrayBuffer → Base64 字符串
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // 分块处理，避免大文件栈溢出
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

// Base64 字符串 → ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 收集所有token的BIN数据（从IndexedDB）
const collectBinData = async (tokenList) => {
  const binDataMap = {};
  for (const token of tokenList) {
    if (token.importMethod === "bin" || token.importMethod === "wxQrcode") {
      try {
        let binData = await getArrayBufferFromDB(token.id);
        if (!binData && token.name) {
          binData = await getArrayBufferFromDB(token.name);
        }
        if (binData) {
          binDataMap[token.id] = arrayBufferToBase64(binData);
          console.log(`导出BIN数据: ${token.name} (${binData.byteLength} bytes)`);
        } else {
          console.warn(`未找到Token "${token.name}" 的BIN数据`);
        }
      } catch (error) {
        console.error(`导出Token "${token.name}" BIN数据失败:`, error);
      }
    }
  }
  return binDataMap;
};

// 导入BIN数据到IndexedDB
const importBinData = async (binData) => {
  if (!binData || typeof binData !== 'object' || Object.keys(binData).length === 0) {
    return 0;
  }
  // 确保IndexedDB已就绪
  try {
    await useIndexedDB().ensureReady();
  } catch (e) {
    console.warn('等待IndexedDB就绪超时:', e.message);
  }

  let importedCount = 0;
  for (const [tokenId, base64Data] of Object.entries(binData)) {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`跳过无效BIN数据: Token ID ${tokenId}`);
        continue;
      }
      const token = gameTokens.value.find(t => t.id === tokenId);
      if (!token) {
        console.warn(`跳过BIN数据导入: 未找到Token ID ${tokenId}`);
        continue;
      }
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const success = await storeArrayBufferToDB(tokenId, arrayBuffer);
      if (success) {
        importedCount++;
        // 验证写入
        const verify = await getArrayBufferFromDB(tokenId);
        if (!verify) {
          console.warn(`BIN数据写入验证失败: ${token.name}`);
          importedCount--;
        } else {
          console.log(`导入BIN数据成功: ${token.name} (${arrayBuffer.byteLength} bytes)`);
        }
      } else {
        console.error(`导入BIN数据失败: ${token.name}`);
      }
    } catch (error) {
      console.error(`处理Token BIN数据失败 [${tokenId}]:`, error);
    }
  }
  return importedCount;
};

// 收集每个token的日常任务设置
const collectTokenSettings = (tokenList) => {
  const tokenSettings = [];
  tokenList.forEach((token) => {
    const settings = localStorage.getItem(`daily-settings:${token.id}`);
    if (settings) {
      try {
        tokenSettings.push({
          tokenId: token.id,
          settings: JSON.parse(settings),
        });
      } catch (e) {
        console.warn(`Failed to parse settings for token ${token.id}`, e);
      }
    }
  });
  return tokenSettings;
};

// 导入token设置到localStorage
const importTokenSettings = (tokenSettings) => {
  if (!Array.isArray(tokenSettings)) return 0;
  let count = 0;
  tokenSettings.forEach((item) => {
    if (item.tokenId && item.settings) {
      localStorage.setItem(
        `daily-settings:${item.tokenId}`,
        JSON.stringify(item.settings)
      );
      count++;
    }
  });
  return count;
};

// 将token列表映射为导出格式（包含所有必要字段）
const mapTokensForExport = (tokenList) => {
  return tokenList.map((t) => ({
    id: t.id,
    name: t.name,
    token: t.token,
    server: t.server,
    wsUrl: t.wsUrl || null,
    remark: t.remark || "",
    importMethod: t.importMethod || "manual",
    sourceUrl: t.sourceUrl || null,
    avatar: t.avatar || null,
    upgradedToPermanent: t.upgradedToPermanent || false,
    upgradedAt: t.upgradedAt || null,
    updatedAt: t.updatedAt || null,
    createdAt: t.createdAt || null,
    lastUsed: t.lastUsed || null,
    expiresAt: t.expiresAt || null,
    lastRefreshAt: t.lastRefreshAt || null,
  }));
};

// 通用文件解析（支持加密/Base64/普通JSON）
const parseExportFile = async (fileContent) => {
  const fileData = JSON.parse(fileContent);
  
  if (fileData.encrypted && fileData.data) {
    // 加密文件
    let password;
    try {
      password = await showPasswordDialog('解密导入配置', '请输入解密密码');
    } catch (err) {
      return { cancelled: true };
    }
    const isCryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
    if (!isCryptoAvailable) {
      throw new Error('当前环境不支持AES解密，请在HTTPS或localhost环境下导入加密文件');
    }
    try {
      return { data: await decryptConfigData(fileData.data, password) };
    } catch (e) {
      throw new Error('解密失败: 密码错误或文件已损坏');
    }
  } else if (fileData.data && fileData.encoding === 'base64') {
    // Base64编码文件
    try {
      const decoded = decodeURIComponent(escape(atob(fileData.data)));
      return { data: JSON.parse(decoded) };
    } catch (e) {
      throw new Error('Base64解码失败: 文件已损坏');
    }
  } else {
    // 未加密文件
    return { data: fileData };
  }
};

// 通用加密导出（弹出密码框 → 加密/Base64 → 下载）
const encryptAndDownload = async (exportData, filename) => {
  let password;
  try {
    password = await showPasswordDialog('加密导出配置', '请输入加密密码（至少6位）');
  } catch (e) {
    return false; // 用户取消
  }
  if (password.length < 6) {
    message.error('密码长度至少6位');
    return false;
  }

  const isCryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
  let finalExportFile;
  if (isCryptoAvailable) {
    const encryptedData = await encryptConfigData(exportData, password);
    finalExportFile = {
      encrypted: true,
      version: exportData.version,
      exportTime: new Date().toISOString(),
      data: encryptedData,
    };
  } else {
    console.warn('crypto.subtle不可用，使用Base64编码导出');
    const jsonStr = JSON.stringify(exportData);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    finalExportFile = {
      encrypted: false,
      version: exportData.version,
      exportTime: new Date().toISOString(),
      encoding: "base64",
      data: encoded,
    };
  }

  const blob = new Blob([JSON.stringify(finalExportFile, null, 2)], { type: "application/json" });
  const success = await downloadFile(blob, filename);
  return success;
};

// 获取完整的batchSettings导出对象
const getFullBatchSettings = () => ({
  boxCount: batchSettings.boxCount,
  fishCount: batchSettings.fishCount,
  recruitCount: batchSettings.recruitCount,
  defaultBoxType: batchSettings.defaultBoxType,
  defaultFishType: batchSettings.defaultFishType,
  targetBoxPoints: batchSettings.targetBoxPoints,
  receiverId: batchSettings.receiverId || "",
  carMinColor: batchSettings.carMinColor,
  tokenListColumns: batchSettings.tokenListColumns,
  autoColumns: batchSettings.autoColumns,
  useGoldRefreshFallback: batchSettings.useGoldRefreshFallback,
  commandDelay: batchSettings.commandDelay,
  taskDelay: batchSettings.taskDelay,
  actionDelay: batchSettings.actionDelay,
  battleDelay: batchSettings.battleDelay,
  refreshDelay: batchSettings.refreshDelay,
  longDelay: batchSettings.longDelay,
  taskIntervalWait: batchSettings.taskIntervalWait,
  batchIntervalWait: batchSettings.batchIntervalWait,
  maxActive: batchSettings.maxActive,
  connectionTimeout: batchSettings.connectionTimeout,
  reconnectDelay: batchSettings.reconnectDelay,
  maxLogEntries: batchSettings.maxLogEntries,
  enableRefresh: batchSettings.enableRefresh,
  refreshInterval: batchSettings.refreshInterval,
  smartDepartureEnabled: batchSettings.smartDepartureEnabled,
  smartDepartureGoldThreshold: batchSettings.smartDepartureGoldThreshold,
  smartDepartureRecruitThreshold: batchSettings.smartDepartureRecruitThreshold,
  smartDepartureJadeThreshold: batchSettings.smartDepartureJadeThreshold,
  smartDepartureTicketThreshold: batchSettings.smartDepartureTicketThreshold,
  requireMinColorWithConditions: batchSettings.requireMinColorWithConditions,
  tokensPerPage: batchSettings.tokensPerPage,
  logPageSize: batchSettings.logPageSize,
  defaultCommandTimeout: batchSettings.defaultCommandTimeout,
  battleCommandTimeout: batchSettings.battleCommandTimeout,
  defaultRetryCount: batchSettings.defaultRetryCount,
  retryDelay: batchSettings.retryDelay,
  accountRetryInterval: batchSettings.accountRetryInterval,
  hangUpMinTime: batchSettings.hangUpMinTime,
  hangUpTimeControlEnabled: batchSettings.hangUpTimeControlEnabled,
  petMergeMaxLevelEnabled: batchSettings.petMergeMaxLevelEnabled,
  petMergeMaxLevel: batchSettings.petMergeMaxLevel,
  dreamPurchaseList: batchSettings.dreamPurchaseList,
});

// 加密配置数据
const encryptConfigData = async (data, password) => {
  try {
    // 将数据转为JSON字符串
    const jsonStr = JSON.stringify(data);
    
    // 使用Web Crypto API进行AES-GCM加密
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    
    // 从密码生成密钥
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密数据
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    // 将IV和加密数据组合: IV(12 bytes) + 加密数据
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    // 转为Base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('加密失败: ' + error.message);
  }
};

// 解密配置数据
const decryptConfigData = async (encryptedData, password) => {
  try {
    // Base64解码
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // 提取IV和加密数据
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // 从密码生成密钥
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBuffer
    );
    
    // 转为JSON对象
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('解密失败: 密码错误或文件已损坏');
  }
};

// 显示密码输入对话框
const showPasswordDialog = (title, placeholder) => {
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    dialog.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 24px;
        min-width: 400px;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      ">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">${title}</h3>
        <input 
          id="password-input" 
          type="password" 
          placeholder="${placeholder}"
          style="
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 16px;
          "
        />
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-btn" style="
            padding: 8px 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 14px;
          ">取消</button>
          <button id="confirm-btn" style="
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            background: #2080f0;
            color: white;
            cursor: pointer;
            font-size: 14px;
          ">确定</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const input = dialog.querySelector('#password-input');
    const cancelBtn = dialog.querySelector('#cancel-btn');
    const confirmBtn = dialog.querySelector('#confirm-btn');
    
    input.focus();
    
    // 回车键确认
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
    
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
      reject(new Error('用户取消'));
    };
    
    confirmBtn.onclick = () => {
      const password = input.value.trim();
      if (!password) {
        input.style.borderColor = '#ff4d4f';
        input.placeholder = '密码不能为空';
        return;
      }
      document.body.removeChild(dialog);
      resolve(password);
    };
  });
};

// Export account configuration only
const exportAccountConfig = async () => {
  try {
    if (!tokens.value || !Array.isArray(tokens.value) || tokens.value.length === 0) {
      message.warning("没有可导出的账号");
      return;
    }

    // 收集BIN数据
    const binDataMap = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    const totalBinTokens = tokens.value.filter(t => t.importMethod === "bin" || t.importMethod === "wxQrcode").length;
    if (totalBinTokens > 0 && binCount < totalBinTokens) {
      console.warn(`BIN数据不完整: ${binCount}/${totalBinTokens} 个token有BIN数据`);
    }

    const exportData = {
      version: "1.5",
      exportTime: new Date().toISOString(),
      configType: "accounts",
      tokens: mapTokensForExport(tokens.value),
      tokenSettings: collectTokenSettings(tokens.value),
      binData: binDataMap,
    };

    const filename = `account-config-encrypted_${new Date().toISOString().slice(0, 10)}.json`;
    const success = await encryptAndDownload(exportData, filename);

    if (success === false) return; // 用户取消或密码太短
    if (success) {
      const isInApk = window.Capacitor !== undefined;
      const binMsg = binCount > 0 ? ` (含${binCount}个BIN数据)` : '';
      message.success(
        `账号配置导出成功: ${tokens.value.length} 个账号${binMsg}${isInApk ? '，请查看分享对话框保存' : ''}`,
        { duration: 4000 }
      );
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Export accounts failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// Import account configuration only
const importAccountConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    let importData;

    try {
      const result = await parseExportFile(fileContent);
      if (result.cancelled) return;
      importData = result.data;
    } catch (e) {
      message.error(e.message);
      return;
    }

    // 验证结构
    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "accounts") {
      message.error("这是定时配置文件，请使用「导入定时配置」功能");
      return;
    }
    if (!importData.tokens && !importData.configType) {
      message.error("无效的账号配置文件格式");
      return;
    }

    let importedTokens = 0;
    let skippedTokens = 0;

    // 导入tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      if (!gameTokens.value || !Array.isArray(gameTokens.value)) {
        message.error("账号数据存储异常，请刷新页面后重试");
        return;
      }

      importData.tokens.forEach((token) => {
        if (!token.token) {
          console.warn('跳过无效token：缺少token字段', token.name || token.id);
          return;
        }
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) {
          skippedTokens++;
          // 如果已存在但有更新的BIN数据importMethod，保留原始importMethod
          return;
        }
        gameTokens.value.push({
          id: token.id || "token_" + Date.now() + Math.random().toString(36).slice(2),
          name: token.name || "",
          token: token.token,
          server: token.server || "",
          wsUrl: token.wsUrl || null,
          remark: token.remark || "",
          importMethod: token.importMethod || "manual",
          sourceUrl: token.sourceUrl || null,
          avatar: token.avatar || null,
          upgradedToPermanent: token.upgradedToPermanent || false,
          upgradedAt: token.upgradedAt || null,
          updatedAt: token.updatedAt || new Date().toISOString(),
          createdAt: token.createdAt || new Date().toISOString(),
          lastUsed: token.lastUsed || new Date().toISOString(),
          expiresAt: token.expiresAt || null,
          lastRefreshAt: token.lastRefreshAt || null,
        });
        importedTokens++;
      });
    }

    // 导入BIN数据到IndexedDB
    let importedBinCount = 0;
    if (importData.binData && Object.keys(importData.binData).length > 0) {
      importedBinCount = await importBinData(importData.binData);
      if (importedBinCount > 0) {
        console.log(`成功导入 ${importedBinCount} 个BIN数据`);
      }
    } else {
      // 兼容旧版：没有binData字段
      const binTokens = (importData.tokens || []).filter(t =>
        (t.importMethod === "bin" || t.importMethod === "wxQrcode") &&
        gameTokens.value.some(gt => gt.id === t.id)
      );
      if (binTokens.length > 0) {
        console.warn(`配置文件版本较低(${importData.version})，不包含BIN数据`);
        message.warning(
          `${binTokens.length}个bin/wxQrcode类型的token缺少BIN数据，可能无法正常刷新Token。建议重新导入原始BIN文件。`,
          { duration: 6000 }
        );
      }
    }

    // 导入token设置
    const settingsCount = importTokenSettings(importData.tokenSettings);

    // 构建成功消息
    const parts = [];
    if (importedTokens > 0) parts.push(`${importedTokens} 个新账号`);
    if (skippedTokens > 0) parts.push(`${skippedTokens} 个已存在跳过`);
    if (importedBinCount > 0) parts.push(`${importedBinCount} 个BIN数据`);
    if (settingsCount > 0) parts.push(`${settingsCount} 个任务配置`);
    const encryptTag = importData.version >= "1.4" ? ' [加密文件]' : '';

    message.success(`账号导入成功: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Import accounts failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// 全量导出（账号 + 定时任务 + 批量设置 + BIN数据 + 管理分组）
const exportConfig = async () => {
  try {
    if (!tokens.value || tokens.value.length === 0) {
      message.warning("没有可导出的数据");
      return;
    }

    const validTokenIds = new Set(tokens.value.map((t) => t.id));
    const filteredScheduledTasks = (scheduledTasks.value || []).map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((task) => task.selectedTokens.length > 0);

    const binDataMap = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;

    // 排序配置
    let sortConfigData = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) sortConfigData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 管理分组数据（过滤掉无有效token的分组）
    const filteredGroups = (tokenGroups.value || []).map((group) => ({
      ...group,
      tokenIds: group.tokenIds?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((group) => group.tokenIds.length > 0);

    // 十殿预设数据
    let nightmarePresetsData = null;
    try {
      const saved = localStorage.getItem('nightmare-presets');
      if (saved) nightmarePresetsData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    const exportData = {
      version: "2.3",
      exportTime: new Date().toISOString(),
      configType: "full",
      tokens: mapTokensForExport(tokens.value),
      scheduledTasks: filteredScheduledTasks,
      batchSettings: getFullBatchSettings(),
      tokenSettings: collectTokenSettings(tokens.value),
      binData: binDataMap,
      sortConfig: sortConfigData,
      tokenGroups: filteredGroups,
      taskTemplates: taskTemplates.value || [],
      nightmarePresets: nightmarePresetsData || [],
    };

    const filename = `xyzw_full_config_${new Date().toISOString().slice(0, 10)}.json`;
    const success = await encryptAndDownload(exportData, filename);

    if (success === false) return;
    if (success) {
      const binMsg = binCount > 0 ? ` (含${binCount}个BIN数据)` : '';
      const groupMsg = filteredGroups.length > 0 ? `, ${filteredGroups.length} 个分组` : '';
      const templateMsg = (taskTemplates.value || []).length > 0 ? `, ${(taskTemplates.value || []).length} 个任务模板` : '';
      const nmMsg = (nightmarePresetsData || []).length > 0 ? `, ${(nightmarePresetsData || []).length} 个十殿预设` : '';
      message.success(
        `全量导出成功: ${tokens.value.length} 个账号, ${filteredScheduledTasks.length} 个定时任务${groupMsg}${templateMsg}${nmMsg}${binMsg}`,
        { duration: 4000 }
      );
    } else {
      message.error("导出失败");
    }
  } catch (error) {
    console.error("Full export failed:", error);
    message.error("导出失败: " + (error.message || error));
  }
};

// 全量导入（账号 + 定时任务 + 批量设置 + BIN数据 + 管理分组 + 任务模板 + 十殿预设）
const importConfig = async ({ file }) => {
  try {
    const fileContent = await readFileAsText(file);
    let importData;

    try {
      const result = await parseExportFile(fileContent);
      if (result.cancelled) return;
      importData = result.data;
    } catch (e) {
      message.error(e.message);
      return;
    }

    if (!importData.version) {
      message.error("无效的配置文件格式：缺少版本号");
      return;
    }

    const stats = { tokens: 0, tasks: 0, bin: 0, settings: 0, groups: 0, templates: 0, nightmare: 0 };

    // 导入tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      importData.tokens.forEach((token) => {
        if (!token.token) return;
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) return;
        gameTokens.value.push({
          id: token.id || "token_" + Date.now() + Math.random().toString(36).slice(2),
          name: token.name || "",
          token: token.token,
          server: token.server || "",
          wsUrl: token.wsUrl || null,
          remark: token.remark || "",
          importMethod: token.importMethod || "manual",
          sourceUrl: token.sourceUrl || null,
          avatar: token.avatar || null,
          upgradedToPermanent: token.upgradedToPermanent || false,
          upgradedAt: token.upgradedAt || null,
          updatedAt: token.updatedAt || new Date().toISOString(),
          createdAt: token.createdAt || new Date().toISOString(),
          lastUsed: token.lastUsed || new Date().toISOString(),
          expiresAt: token.expiresAt || null,
          lastRefreshAt: token.lastRefreshAt || null,
        });
        stats.tokens++;
      });
    }

    // 导入BIN数据
    if (importData.binData) {
      stats.bin = await importBinData(importData.binData);
    }

    // 导入定时任务
    if (Array.isArray(importData.scheduledTasks)) {
      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          scheduledTasks.value.push(task);
          stats.tasks++;
        }
      });
      if (stats.tasks > 0) saveScheduledTasks();
    }

    // 导入批量设置
    if (importData.batchSettings && typeof importData.batchSettings === 'object') {
      if (importData.batchSettings.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, importData.batchSettings.moduleDelays);
      }
      Object.assign(batchSettings, importData.batchSettings);
      try { localStorage.setItem("batchSettings", JSON.stringify(batchSettings)); } catch (e) { /* ignore */ }
    }

    // 导入token设置
    if (importData.tokenSettings) {
      stats.settings = importTokenSettings(importData.tokenSettings);
    }

    // 导入排序配置
    if (importData.sortConfig) {
      try { localStorage.setItem("tokenSortConfig", JSON.stringify(importData.sortConfig)); } catch (e) { /* ignore */ }
    }

    // 导入管理分组
    if (Array.isArray(importData.tokenGroups) && importData.tokenGroups.length > 0) {
      const existingGroupIds = new Set(tokenGroups.value.map((g) => g.id));
      importData.tokenGroups.forEach((group) => {
        if (!group.id || !group.name) return;
        if (existingGroupIds.has(group.id)) {
          // 已存在的分组：合并tokenIds（去重）
          const existing = tokenGroups.value.find((g) => g.id === group.id);
          if (existing) {
            const mergedIds = new Set([...(existing.tokenIds || []), ...(group.tokenIds || [])]);
            existing.tokenIds = [...mergedIds];
            existing.updatedAt = new Date().toISOString();
            stats.groups++;
          }
        } else {
          // 新分组：直接添加
          tokenGroups.value.push({
            id: group.id,
            name: group.name,
            color: group.color || '#18a058',
            tokenIds: group.tokenIds || [],
            createdAt: group.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.groups++;
        }
      });
    }

    // 导入任务模板
    if (Array.isArray(importData.taskTemplates) && importData.taskTemplates.length > 0) {
      const existingTemplates = taskTemplates.value || [];
      const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
      let importedTemplates = 0;
      importData.taskTemplates.forEach((template) => {
        if (!template.id || !template.name) return;
        if (existingTemplateIds.has(template.id)) return; // 跳过已存在的模板
        existingTemplates.push(template);
        importedTemplates++;
      });
      if (importedTemplates > 0) {
        taskTemplates.value = existingTemplates;
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));
      }
      stats.templates = importedTemplates;
    }

    // 导入十殿预设
    if (Array.isArray(importData.nightmarePresets) && importData.nightmarePresets.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('nightmare-presets') || '[]');
        const existingIds = new Set(existing.map((p) => p.id));
        let added = 0;
        importData.nightmarePresets.forEach((p) => {
          if (!p.id || !p.name) return;
          if (existingIds.has(p.id)) return;
          // 补充缺失的卡点/队伍默认值
          if (p.waitLevel8 === undefined) p.waitLevel8 = false;
          if (p.usePresetTeam === undefined) p.usePresetTeam = true;
          if (!p.teamSlots) p.teamSlots = {};
          if (!p.levelConfig) p.levelConfig = {};
          if (!p.memberTokenIds) p.memberTokenIds = [];
          existing.push(p);
          added++;
        });
        if (added > 0) {
          localStorage.setItem('nightmare-presets', JSON.stringify(existing));
          stats.nightmare = added;
        }
      } catch (e) { /* ignore */ }
    }

    // 构建消息
    const parts = [];
    if (stats.tokens > 0) parts.push(`${stats.tokens} 个新账号`);
    if (stats.tasks > 0) parts.push(`${stats.tasks} 个定时任务`);
    if (stats.groups > 0) parts.push(`${stats.groups} 个分组`);
    if (stats.templates > 0) parts.push(`${stats.templates} 个任务模板`);
    if (stats.nightmare > 0) parts.push(`${stats.nightmare} 个十殿预设`);
    if (stats.bin > 0) parts.push(`${stats.bin} 个BIN数据`);
    if (stats.settings > 0) parts.push(`${stats.settings} 个任务配置`);
    if (parts.length === 0) parts.push('无新增数据（已存在）');
    const encryptTag = importData.version >= "1.4" && importData.encrypted !== undefined ? ' [加密文件]' : '';

    message.success(`全量导入成功: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Full import failed:", error);
    message.error("导入失败: " + (error.message || error));
  }
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 注: parseCronField, calculateNextExecutionTime, formatTimeDifference 已从 @/utils/batch 导入

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    if (
      !nextExecutionTimes.value[task.id] ||
      nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000, // Less than 5 minutes
      };
    }
  });
};

// 计算最短倒计时任务
const shortestCountdownTask = computed(() => {
  if (scheduledTasks.value.length === 0) return null;

  let shortestTask = null;
  let shortestTime = Infinity;

  // 遍历所有任务，找到倒计时最短的任务
  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) return;

    const countdown = taskCountdowns.value[task.id];
    if (countdown && countdown.remainingTime < shortestTime) {
      shortestTime = countdown.remainingTime;
      shortestTask = {
        task,
        countdown,
      };
    }
  });

  return shortestTask;
});

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

// ======================
// Scheduled Tasks Scheduler
// ======================

// Initialize scheduled tasks from localStorage
loadScheduledTasks();

// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  (newVal) => {
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// 修复TimePicker的"Invalid time value"错误：确保runTime的初始值不是null
watch(
  () => showTaskModal.value,
  (isVisible) => {
    if (isVisible && !taskForm.runTime) {
      // 当模态框显示且runTime为null时，将其设置为undefined
      taskForm.runTime = undefined;
    }
  },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
let scheduledTaskStartTime = null; // ✅ 单独跟踪定时任务开始时间，用于超时检测
const pageLoadTime = Date.now();

// 跟踪定时任务是否正在执行
const isScheduledTaskRunning = ref(false);
let currentScheduledTask = null; // 当前正在执行的定时任务
const pendingTaskQueue = []; // ✅ 待执行队列：当定时任务冲突时，排队等待执行
let _activeNightmareBattles = []; // ✅ 模块级引用：跟踪当前十殿战斗，用于超时传导停止

// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // ✅ 修改：不再强制重置isRunning，只记录警告日志
  // 原因：日常任务多账号执行可能需要1个多小时
  if (isRunning.value) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 1 hour ago
    if (lastTaskExecution && lastTaskExecution < oneHourAgo) {
      console.warn(
        `[${new Date().toISOString()}] isRunning has been true for more than 1 hour`,
      );
      // ✅ 修复：超时后强制重置 isRunning，防止调度器永远被阻塞
      // 之前只记录警告不重置，导致后续所有定时任务都无法执行
      if (!isScheduledTaskRunning.value) {
        // 仅在非定时任务执行时重置（定时任务有自己的状态管理）
        console.error(
          `[${new Date().toISOString()}] isRunning卡住超过1小时且无定时任务运行，强制重置`,
        );
        isRunning.value = false;
        currentRunningTokenId.value = null;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到 isRunning 卡住超过1小时，已强制重置（非定时任务状态） ===",
          type: "warning",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 警告：任务执行已超过1小时，定时任务仍在运行中 ===",
          type: "warning",
        });
      }
    }
  }
  
  // 检查定时任务执行状态是否卡住
  if (isScheduledTaskRunning.value && currentScheduledTask) {
    const now = Date.now();
    // 十殿挑战任务超时阈值为160分钟（>内部150分钟超时），其他任务保持1小时
    const isNightmareHealthTask = currentScheduledTask?.taskName === 'batchNightmareChallengePresets' 
      || currentScheduledTask?.name?.includes('十殿');
    const taskTimeoutMs = isNightmareHealthTask ? (160 * 60 * 1000) : (60 * 60 * 1000);
    const taskTimeoutAgo = now - taskTimeoutMs;
    if (scheduledTaskStartTime && scheduledTaskStartTime < taskTimeoutAgo) {
      const timeoutMinutes = Math.round(taskTimeoutMs / 60000);
      console.error(
        `[${new Date().toISOString()}] 定时任务执行状态已持续${timeoutMinutes}分钟，重置状态`,
      );
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null; // ✅ 问题2：健康检查重置时清除超时计时
      // ✅ 关键修复：定时任务超时后也必须重置 isRunning
      // 否则 isRunning 卡在 true → 调度器行6491永远 return → 后续所有定时任务无法执行
      if (isRunning.value) {
        isRunning.value = false;
        currentRunningTokenId.value = null;
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 检测到定时任务执行超过${timeoutMinutes}分钟，已重置定时任务状态和isRunning ===`,
        type: "warning",
      });
      // ✅ 同时清理runningTokens状态
      tokenStore.runningTokens.value.forEach(tokenId => {
        tokenStore.setTokenRunning(tokenId, false);
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      // 必须同时检查批量任务、定时任务、以及队列中是否有待执行任务
      const hasRunningTask = isRunning.value || isScheduledTaskRunning.value || pendingTaskQueue.length > 0;
      if (!hasRunningTask) {
        console.log(`[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`);
        window.location.reload();
      } else {
         const reason = isRunning.value ? '批量任务' : isScheduledTaskRunning.value ? '定时任务' : '队列任务';
         console.log(`[${new Date().toISOString()}] Scheduled refresh postponed due to running ${reason}, will refresh after task completion`);
         // 标记需要在任务完成后刷新
         shouldRefreshAfterTask.value = true;
      }
    }
  }
};

// Start the scheduler
const startScheduler = () => {
  // Clear any existing interval first
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Check every 10 seconds instead of 60 seconds for more timely task execution
  intervalId.value = setInterval(() => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // ✅ 注意：不在此处 early return
      // 原因：如果 isRunning=true 时直接 return，调度器不会执行到第6596行的队列逻辑
      // 导致时间匹配的定时任务无法加入 pendingTaskQueue → 任务被静默丢弃
      // 改由后续逻辑判断：排队 or 跳过执行
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;
        let reason = "";

        // 注意：不上线时段检查移到executeScheduledTask函数中执行，避免每10秒循环检查

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
          reason = `currentTime=${nowTime}, taskTime=${taskTime}, match=${shouldRun}`;
        } else if (task.runType === "cron") {
          // Improved cron expression parsing using shared utility
          try {
             shouldRun = matchesCronExpression(task.cronExpression, now);
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
              error,
            );
            addLog({
              time: currentTime,
              message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
            // ✅ 防重复执行：检查此任务是否在最近1分钟内已触发
            const lastExecStr = localStorage.getItem(`lastTaskExecution_${task.id}`);
            if (lastExecStr) {
              const elapsed = now.getTime() - new Date(lastExecStr).getTime();
              if (elapsed < 60000) { // 1分钟内已执行过
                return;
              }
            }

            // ✅ 检查是否有任务正在执行中（包括用户手动任务 isRunning 和定时任务 isScheduledTaskRunning）
            // 无论是哪种情况，都加入待执行队列等待完成后再执行
            if (isRunning.value || (isScheduledTaskRunning.value && currentScheduledTask)) {
              // 同一个任务正在执行，跳过
              if (currentScheduledTask && currentScheduledTask.id === task.id) {
                return;
              }
              // ✅ 加入待执行队列
              if (!pendingTaskQueue.some(t => t.id === task.id)) {
                pendingTaskQueue.push(task);
                const runningName = currentScheduledTask ? currentScheduledTask.name : '手动任务';
                addLog({
                  time: currentTime,
                  message: `⏸️ 定时任务 ${task.name} 加入待执行队列（当前: ${runningName} 执行中，队列: ${pendingTaskQueue.length}）`,
                  type: "info",
                });
              }
              return;
            }
            
            // Update last execution time with timestamp
            localStorage.setItem(
              `lastTaskExecution_${task.id}`,
              now.toString(),
            );

            // 设置任务执行状态并立即更新lastTaskExecution
            isScheduledTaskRunning.value = true;
            currentScheduledTask = task;
            scheduledTaskStartTime = Date.now(); // ✅ 记录任务开始时间
            lastTaskExecution = Date.now();  // ✅ 在任务执行前立即更新
            
            // Execute the task (异步执行,不阻塞scheduler循环)
            executeScheduledTask(task).catch(error => {
              console.error(`[${new Date().toISOString()}] 定时任务执行未捕获错误:`, error);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 定时任务 ${task.name} 执行异常: ${error.message} ===`,
                type: "error",
              });
            }).finally(() => {
              // ✅ 确保任务完成后更新lastTaskExecution
              lastTaskExecution = Date.now();
              // ✅ 队列处理由 executeScheduledTask 自身的 finally 统一负责，此处不再重复处理
              // 避免双重队列处理导致竞态条件（同一任务被重复入队或状态冲突）
            });
        }
      });

      // ✅ 调度器兜底：如果队列中有等待任务且当前无任务运行，主动消费队列（跳过已过期任务）
      if (pendingTaskQueue.length > 0 && !isRunning.value && !isScheduledTaskRunning.value) {
        // 循环清理已过期任务，找到第一个有效的执行
        while (pendingTaskQueue.length > 0) {
          const peekTask = pendingTaskQueue[0];
          const timeCheck = isTaskTimeStillValid(peekTask, 60);

          if (!timeCheck.valid) {
            pendingTaskQueue.shift();
            addLog({
              time: currentTime,
              message: `⏰ 兜底跳过已过期队列任务: ${peekTask.name}（${timeCheck.reason}，剩余队列: ${pendingTaskQueue.length}）`,
              type: "warning",
            });
            continue;
          }

          // 找到有效任务，正式出队并执行
          const nextTask = pendingTaskQueue.shift();
          addLog({
            time: currentTime,
            message: `▶️ 调度器兜底：从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
            type: "info",
          });
          isScheduledTaskRunning.value = true;
          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          lastTaskExecution = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`兜底队列任务执行错误:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
          return; // 已找到有效任务并执行，退出兜底逻辑
        }

        // 队列全部过期，已清空
        if (pendingTaskQueue.length === 0) {
          addLog({
            time: currentTime,
            message: `✅ 兜底消费：队列中所有任务均已过期，已清空`,
            type: "info",
          });
        }
      }
    
      // ✅ 调度器统一处理延迟刷新：在所有任务处理和队列处理完毕后，检查是否需要刷新页面
      // 这样可以确保当前没有运行中的任务，且队列中没有待执行的任务
      if (shouldRefreshAfterTask.value && !isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        console.log(`[${new Date().toISOString()}] All tasks completed, executing postponed page refresh from scheduler tick`);
        shouldRefreshAfterTask.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 所有任务已完成，定时刷新页面将在 3 秒后执行...`,
          type: "info",
        });
        setTimeout(() => {
          // 再次确认没有新任务启动
          if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
            window.location.reload();
          } else {
            shouldRefreshAfterTask.value = true; // 重新标记，等待下次调度器检查
          }
        }, 3000);
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// 响应式列数计算
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

// 计算响应式列数
const responsiveColumns = computed(() => {
  // 如果用户关闭了自动模式,使用手动设置的列数
  if (!batchSettings.autoColumns) {
    return batchSettings.tokenListColumns;
  }
  
  // 自动根据窗口宽度计算
  const width = windowWidth.value;
  
  if (width >= 1400) {
    return 4;  // 大屏幕(PC最大化): 4列
  } else if (width >= 1100) {
    return 3;  // 中等屏幕: 3列
  } else if (width >= 768) {
    return 2;  // 平板/小屏幕: 2列
  } else {
    return 1;  // 手机端: 1列
  }
});

// 同步响应式列数到batchSettings
watch(responsiveColumns, (newCols) => {
  if (batchSettings.autoColumns) {
    batchSettings.tokenListColumns = newCols;
  }
});

// 判断是否是最大化窗口（≥1400px）
const isMaximizedWindow = computed(() => {
  return windowWidth.value >= 1400;
});

// 处理手动调节每行数量
const handleManualColumnChange = () => {
  // 只有在最大化窗口时才允许手动调节
  if (isMaximizedWindow.value) {
    // 用户手动调节时，关闭自动模式
    if (batchSettings.autoColumns) {
      batchSettings.autoColumns = false;
    }
  } else {
    // 如果不是最大化窗口，恢复自动模式
    if (!batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
  }
};

// 窗口大小变化监听
let resizeTimer = null;
const handleResize = () => {
  // 防抖处理,避免频繁计算
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newWidth = window.innerWidth;
    windowWidth.value = newWidth;
    
    // 当窗口缩小到小于1400px时，自动开启自适应模式
    if (newWidth < 1400 && !batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
    // 当窗口放大到≥1400px时，如果之前是手动模式，保持手动模式
    // （用户可以通过输入框手动调节）
  }, 100);
};

// 响应式列数监听清理函数
let cleanupResponsiveColumns = null;
const setupResponsiveColumns = () => {
  // 立即计算一次窗口宽度，确保页面加载时就正确响应
  if (batchSettings.autoColumns) {
    windowWidth.value = window.innerWidth;
  }
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize);
  
  // 使用 ResizeObserver 监听 body 大小变化(更精确)
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      windowWidth.value = window.innerWidth;
    });
    resizeObserver.observe(document.body);
    
    cleanupResponsiveColumns = () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  } else {
    cleanupResponsiveColumns = () => {
      window.removeEventListener('resize', handleResize);
    };
  }
};

// Debug: Log initial state when component mounts
onMounted(() => {
  // 初始化防休眠支持检测
  wakeLockSupported.value = wakeLockManager.isSupported();
  const envInfo = wakeLockManager.getEnvironmentInfo();
  console.log(`防休眠功能初始化 - 环境: ${envInfo.envName}, 支持: ${envInfo.supported}`);
  
  // ✅ 如果之前开启了防休眠，页面刷新后自动重新激活
  if (isWakeLockEnabled.value && wakeLockSupported.value) {
    console.log('检测到防休眠之前已开启，自动重新激活...');
    wakeLockManager.request().then(success => {
      if (success) {
        console.log('防休眠自动激活成功');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "🛡️ 防休眠已自动恢复（页面刷新后）",
          type: "success",
        });
      } else {
        console.warn('防休眠自动激活失败');
        isWakeLockEnabled.value = false;
        saveWakeLockState(false);
      }
    }).catch(err => {
      console.error('防休眠自动激活异常:', err);
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);
    });
  }
  
  // 加载保存的Token排序
  loadSavedTokenOrder();
  
  // 确保DOM加载完成后再计算响应式列数
  nextTick(() => {
    if (batchSettings.autoColumns) {
      windowWidth.value = window.innerWidth;
    }
  });
  
  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();
  // Start countdown timer
  startCountdown();
  loadTaskTemplates();
  // 启动自动刷新Token
  tokenStore.startAutoRefresh();
  
  // 启动响应式列数监听
  setupResponsiveColumns();

  // 检查是否需要自动打开十殿预设队列
  if (route.query.nextPreset === 'true') {
    try {
      const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
      if (queue.length > 0) {
        showNightmareChallengeModal.value = true;
        message.info(`预设队列剩余 ${queue.length} 个，正在继续执行...`);
      }
    } catch { /* ignore */ }
  }

  // 从战斗页面返回时自动打开十殿弹窗（读取后立即移除参数，防止刷新重复触发）
  if (route.query.openNightmare === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }

  // 启动响应式时间更新（每30秒更新一次，让活动开放时间computed属性正确响应）
  currentTimeTimer = setInterval(() => {
    currentTime.value = new Date();
  }, 30000);
});

// 监听路由变化：从战斗页返回时自动打开十殿挑战 Modal
watch(() => route.query.openNightmare, (val) => {
  if (val === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Cleanup task scheduler intervals
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // 清理响应式时间更新定时器
  if (currentTimeTimer) {
    clearInterval(currentTimeTimer);
    currentTimeTimer = null;
  }
  
  // 清理响应式列数监听
  if (cleanupResponsiveColumns) {
    cleanupResponsiveColumns();
  }
  
  // 清理防抖定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  
  // 停止自动刷新Token
  tokenStore.stopAutoRefresh();
  
  // 清理防休眠
  if (isWakeLockEnabled.value) {
    wakeLockManager.release().catch(err => {
      console.error('组件卸载时释放WakeLock失败:', err);
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "防休眠已自动关闭",
      type: "info",
    });
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();
};

// Verify task dependencies - 只验证基础依赖，WebSocket连接由具体任务函数处理
const verifyTaskDependencies = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    // 处理函数名映射（下划线格式 -> 驼峰格式）
    let functionName = taskName;
    if (taskName === 'weekly_market_buy') {
      functionName = 'weeklyMarketBuy';
    }
    
    const taskFunction = eval(functionName);
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ 任务函数不存在: ${taskName}`,
        type: "error",
      });
      return false;
    }
  }

  // 验证宝箱周任务是否在宝箱周执行
  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️  当前不是宝箱周，跳过宝箱周任务: ${task.selectedTasks.filter(t => boxWeeklyTasks.includes(t)).join(', ')}`,
      type: "warning",
    });
    // 返回true，但会在执行阶段跳过这些任务
  }

  // 直接使用所有选中的token，WebSocket连接由具体任务函数内部管理
  // ensureConnection函数会自动处理并行连接和连接池管理
  const connectedTokens = task.selectedTokens
    .filter((tokenId) => tokenStore.gameTokens.some((t) => t.id === tokenId))
    .map((tokenId) => {
      const tokenName = tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
      return { id: tokenId, name: tokenName };
    });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// 检查定时任务的时间是否仍然有效（队列任务被阻塞后不再符合执行时间时跳过）
const isTaskTimeStillValid = (task, toleranceMinutes = 2) => {
  const now = new Date();

  if (task.runType === "daily") {
    if (!task.runTime) return { valid: false, reason: "任务未配置执行时间" };
    const nowTime = now.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    // 完全匹配，立即有效
    if (nowTime === task.runTime) return { valid: true };

    const [taskH, taskM] = task.runTime.split(":").map(Number);
    const taskMinutes = taskH * 60 + taskM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const diffMinutes = nowMinutes - taskMinutes;

    // 在容差窗口内（0~toleranceMinutes分钟）仍有效
    if (diffMinutes >= 0 && diffMinutes <= toleranceMinutes) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `已过预定时间 ${task.runTime}（已超出 ${diffMinutes} 分钟，容差 ${toleranceMinutes} 分钟）`,
    };
  } else if (task.runType === "cron") {
    if (!task.cronExpression) return { valid: false, reason: "Cron表达式为空" };
    try {
      // Cron表达式：检查是否在容差窗口内匹配
      const matched = matchesCronExpression(task.cronExpression, now);
      if (matched) return { valid: true };
      // 往前检查容差分钟数
      for (let m = 1; m <= toleranceMinutes; m++) {
        const past = new Date(now.getTime() - m * 60 * 1000);
        if (matchesCronExpression(task.cronExpression, past)) {
          return { valid: true };
        }
      }
      return { valid: false, reason: `Cron任务已过执行时间窗口（容差 ${toleranceMinutes} 分钟）` };
    } catch {
      return { valid: false, reason: "Cron表达式解析失败" };
    }
  }

  return { valid: false, reason: "未知任务类型" };
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  // ✅ 在函数开始处就定义 availableTokens，确保 catch 块可以访问
  let availableTokens = [];
  
  // ✅ 在函数开始处就设置状态(调用者已设置,这里做防御性检查)
  if (!isScheduledTaskRunning.value) {
    isScheduledTaskRunning.value = true;
    currentScheduledTask = task;
  }
  
  // ✅ 重置停止标志，防止用户手动停止后影响定时任务执行
  shouldStop.value = false;
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;  // ✅ finally块会清理状态
    }

    availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return tokens.value.some((t) => t.id === tokenId);
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !tokens.value.some((t) => t.id === tokenId);
      },
    );

    if (missingTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
      
      // ✅ 自动清除任务配置中不存在的Token
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `🗑️  正在从任务配置中清除 ${missingTokens.length} 个不存在的Token...`,
        type: "info",
      });
      
      // ✅ 同时清理 selectedTokens 和 connectedTokens，防止下次执行时从 selectedTokens 重新生成
      if (task.selectedTokens) {
        task.selectedTokens = task.selectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      if (task.connectedTokens) {
        task.connectedTokens = task.connectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      
      // 重新计算 availableTokens 使用清理后的数据
      availableTokens = (task.connectedTokens && task.connectedTokens.length > 0)
        ? task.connectedTokens
        : task.selectedTokens;
      
      // 保存到localStorage
      saveScheduledTasks();
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `✅ 已成功清除不存在的Token，当前任务配置剩余 ${availableTokens.length} 个Token`,
        type: "success",
      });
    }

    // 十殿预设任务自带账号，无需检查 availableTokens
    const taskHasNightmarePresets = task.selectedTasks.includes('batchNightmareChallengePresets') && (task.nightmarePresetIds?.length > 0);
    
    if (availableTokens.length === 0 && !taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
        type: "error",
      });
      return;  // ✅ finally块会清理状态
    }
    
    if (availableTokens.length === 0 && taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 使用十殿预设自带账号执行 ===`,
        type: "info",
      });
    }

    // 任务执行前检查不上线时段（只检查一次）
    let isOfflineTime = false;
    if (task.offlineTimeEnabled) {
      isOfflineTime = isInOfflineTime();
      console.log('[Token检查] offlineTimeEnabled:', task.offlineTimeEnabled);
      console.log('[Token检查] isInOfflineTime:', isOfflineTime);
    }
    
    // 如果在不上线时段，跳过任务执行
    if (isOfflineTime) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 处于不上线时段，跳过执行 ===`,
        type: "warning",
      });
      return;  // ✅ finally块会清理状态
    }
    
    console.log('[Token检查] 是否跳过检查:', isOfflineTime);
    
    // ✅ 使用局部变量避免永久修改原始配置
    let activeTasks = [...task.selectedTasks];
    
    // 新增：检查任务是否包含活动周限制的任务
    const weirdTowerTasks = [
      "climbWeirdTower",
      "batchUseItems",
      "batchMergeItems",
      "batchClaimFreeEnergy",
      "claim_weird_tower_all",
      "claim_weird_tower_pass",
    ];
    
    // 如果任务列表中包含怪异塔任务，且不在黑市周，则跳过Token连接
    const hasWeirdTowerTask = task.selectedTasks.some(t => weirdTowerTasks.includes(t));
    
    if (hasWeirdTowerTask && !isWeirdTowerActivityOpen.value) {
      // 过滤掉不在活动周的任务
      const tasksInActivityWeek = task.selectedTasks.filter(t => !weirdTowerTasks.includes(t));
      
      if (tasksInActivityWeek.length === 0) {
        // 所有任务都是怪异塔任务，完全不需要连接
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 包含的任务都需要黑市周，但当前不在活动时间内，取消执行 ===`,
          type: "warning",
        });
        
        // 跳过Token连接，直接返回
        return;  // ✅ finally块会清理状态
      } else {
        // 有部分任务不在活动周，记录日志
        const skippedTasks = task.selectedTasks.filter(t => weirdTowerTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过不在活动周的任务: ${skippedLabels}`,
          type: "warning",
        });
        
        // ✅ 只执行在活动周的任务（使用局部变量，不修改原始配置）
        activeTasks = tasksInActivityWeek;
      }
    }

    // 检查任务是否包含宝箱周限制的任务
    const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
    const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
    
    if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
      // 过滤掉宝箱周任务
      const tasksOutsideBoxWeek = task.selectedTasks.filter(t => !boxWeeklyTasks.includes(t));
      
      if (tasksOutsideBoxWeek.length === 0) {
        // 所有任务都是宝箱周任务，完全不需要连接
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 定时任务 ${task.name} 包含的任务都需要宝箱周，但当前不在宝箱周，取消执行 ===`,
          type: "warning",
        });
        
        // 跳过Token连接，直接返回
        return;  // ✅ finally块会清理状态
      } else {
        // 有部分任务是宝箱周任务，记录日志并过滤
        const skippedTasks = task.selectedTasks.filter(t => boxWeeklyTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过宝箱周任务（当前不是宝箱周）: ${skippedLabels}`,
          type: "warning",
        });
        
        // ✅ 只执行非宝箱周任务（使用局部变量，不修改原始配置）
        activeTasks = tasksOutsideBoxWeek;
      }
    }
    
    if (isOfflineTime) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 处于不上线时段，跳过Token检查 ===`,
        type: "warning",
      });
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `开始检查Token连接状态...`,
        type: "info",
      });

      // 先检查所有Token的连接状态
      const tokensToConnect = [];
      const tokensAlreadyConnected = [];
      
      console.log('[Token检查] 开始检查', availableTokens.length, '个Token');
      
      for (const tokenId of availableTokens) {
        const connection = tokenStore.wsConnections[tokenId];
        const tokenName = tokens.value.find(t => t.id === tokenId)?.name || tokenId;
        
        console.log('[Token检查]', tokenName, '连接状态:', connection?.status, connection);
        
        if (connection?.status === "connected") {
          // 已经连接成功，不需要处理
          tokensAlreadyConnected.push(tokenId);
          console.log('[Token检查]', tokenName, '✓ 已连接');
        } else {
          // 未连接或连接失败，需要处理
          tokensToConnect.push(tokenId);
          console.log('[Token检查]', tokenName, '✗ 未连接，状态:', connection?.status || '无连接');
        }
      }
      
      console.log('[Token检查] 已连接:', tokensAlreadyConnected.length, '需要连接:', tokensToConnect.length);
      
      if (tokensAlreadyConnected.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokensAlreadyConnected.length} 个Token已连接，无需处理`,
          type: "info",
        });
      }

      if (tokensToConnect.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `发现 ${tokensToConnect.length} 个需要连接的Token`,
          type: "info",
        });

        // 批量处理需要连接的Token
        let connectSuccessCount = 0;
        let connectFailCount = 0;

        for (let i = 0; i < tokensToConnect.length; i++) {
          const tokenId = tokensToConnect[i];
          const token = tokens.value.find(t => t.id === tokenId);
          if (!token) continue;

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `处理Token: ${token.name} (${i + 1}/${tokensToConnect.length})`,
              type: "info",
            });

            // 1. 先尝试直接连接（不刷新Token）
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `尝试直接连接Token: ${token.name}`,
              type: "info",
            });
            
            await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl);
            
            // 2. 等待连接建立（最多等待2秒）
            let connected = false;
            const waitStart = Date.now();
            while (Date.now() - waitStart < 2000) {
              const connection = tokenStore.wsConnections[token.id];
              if (connection?.status === "connected") {
                connected = true;
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (connected) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `Token连接成功: ${token.name}`,
                type: "success",
              });
              connectSuccessCount++;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `Token直接连接失败，尝试刷新Token: ${token.name}`,
                type: "warning",
              });
              
              // 3. 直接连接失败，尝试刷新Token
              const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId);
            
              if (refreshSuccess) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `Token刷新成功: ${token.name}，准备重新连接`,
                  type: "info",
                });
                
                // 4. 保存当前选中的Token ID（避免影响用户当前选择）
                const currentSelectedTokenId = tokenStore.selectedTokenId;
                
                // 5. 获取最新的Token信息
                const updatedToken = tokens.value.find(t => t.id === tokenId);
                if (updatedToken) {
                  // 6. 创建WebSocket连接
                  await tokenStore.createWebSocketConnection(updatedToken.id, updatedToken.token, updatedToken.wsUrl);
                  
                  // 7. 等待连接建立（最多等待2秒）
                  let refreshedConnected = false;
                  const refreshWaitStart = Date.now();
                  while (Date.now() - refreshWaitStart < 2000) {
                    const connection = tokenStore.wsConnections[updatedToken.id];
                    if (connection?.status === "connected") {
                      refreshedConnected = true;
                      break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  
                  if (refreshedConnected) {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `Token刷新后连接成功: ${token.name}`,
                      type: "success",
                    });
                    connectSuccessCount++;
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `Token刷新后连接超时: ${token.name}`,
                      type: "error",
                    });
                    connectFailCount++;
                  }
                }
                
                // 8. 恢复用户之前选中的Token
                if (currentSelectedTokenId) {
                  tokenStore.selectToken(currentSelectedTokenId);
                }
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `Token刷新失败: ${token.name}`,
                  type: "error",
                });
                connectFailCount++;
              }
            }
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `处理Token失败 [${token.name}]: ${error.message}`,
              type: "error",
            });
            connectFailCount++;
          }

          // 添加短暂延迟避免请求过于频繁
          if (i < tokensToConnect.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token处理完成: 成功 ${connectSuccessCount}, 失败 ${connectFailCount}`,
          type: "info",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `所有Token连接状态良好，无需处理`,
          type: "success",
        });
      }
    }

    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // 标记所有Token为正在执行任务
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, true);
    });

    // Execute selected tasks sequentially (not in parallel) to avoid connection conflicts
    for (const taskName of activeTasks) {
      if (shouldStop.value) break;

      // 免费扭蛋已内置在日常任务的 buildActivityTasks 中（周二/四/六自动执行+累抽），无需独立执行
      if (taskName === "gacha_drawreward") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: 免费扭蛋 (已包含在日常任务中，无需独立执行)`,
          type: "info",
        });
        continue;
      }

      if (
        ["batchbaoku45", "batchbaoku13"].includes(taskName) &&
        !checkBaokuActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在宝库开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName) &&
        !checkMengjingActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在梦境开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchSmartSendCar", "batchClaimCars"].includes(taskName) &&
        !checkCarActivityOpen()  // 使用函数而不是computed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在发车开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchTopUpArena", "batcharenafight"].includes(taskName) &&
        !checkArenaActivityOpen()
      ) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        addLog({
          time: now.toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在竞技场开放时间，当前时间:${currentHour}:${currentMinute.toString().padStart(2, '0')}, 开放时段:6:00-22:00)`,
          type: "warning",
        });
        continue;
      }

      if (
        [
          "climbWeirdTower",
          "batchUseItems",
          "batchMergeItems",
          "batchClaimFreeEnergy",
          "claim_weird_tower_all",
          "claim_weird_tower_pass",
          "weekly_market_buy",
        ].includes(taskName) &&
        !isWeirdTowerActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在黑市周开放时间)`,
          type: "warning",
        });
        continue;
      }

      if (
        ["skinChallenge"].includes(taskName) &&
        !["招募周", "黑市周"].includes(getCurrentActivityWeek.value)
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在换皮闯关开放时间)`,
          type: "warning",
        });
        continue;
      }

      // 免费礼包领取不跳过（内含战排金砖每日可领，各礼包内部自行判断活动周条件）

      // 一键宝箱周开箱、宝箱达标奖励自选大奖只允许在宝箱周执行
      if (
        ["batchOpenBoxByPoints", "batchClaimBoxWeeklyRewards"].includes(taskName) &&
        !isBoxWeeklyActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在宝箱周开放时间)`,
          type: "warning",
        });
        continue;
      }

      // 功法残卷领取/赠送在周五00:00-12:00残卷更新期间禁止执行
      if (
        ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"].includes(taskName) &&
        isLegacyRestricted.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (赛季日00:00-12:00为残卷更新时间，禁止操作)`,
          type: "warning",
        });
        continue;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function dynamically
      // 处理函数名映射（下划线格式 -> 驼峰格式）
      let functionName = taskName;
      if (taskName === 'weekly_market_buy') {
        functionName = 'weeklyMarketBuy';
      }
      const taskFunction = eval(functionName);
      if (typeof taskFunction === "function") {
        // 根据批次间等待设置，分批执行账号
        const maxConcurrent = batchSettings.maxActive || 5;
        // 同步连接池大小，确保与当前设置一致
        wsPool.setPoolSize(maxConcurrent);
        const totalAccounts = availableTokens.length;
        const batches = [];
        
        // 将账号分批
        for (let i = 0; i < totalAccounts; i += maxConcurrent) {
          batches.push(availableTokens.slice(i, i + maxConcurrent));
        }
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 共 ${totalAccounts} 个账号，分为 ${batches.length} 批执行（每批${maxConcurrent}个）`,
          type: "info",
        });
        
        // 逐批执行
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          if (shouldStop.value) break;
          
          const batchTokens = batches[batchIndex];
          const isLastBatch = batchIndex === batches.length - 1;
          
          // 设置当前批次的账号
          selectedTokens.value = [...batchTokens];
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` 执行第 ${batchIndex + 1}/${batches.length} 批账号 (${batchTokens.length}个)...`,
            type: "info",
          });
          
          // 执行任务函数（带超时保护，防止单个任务卡死导致整个定时任务挂起）
          // ✅ BUG修复：十殿挑战内部有2小时超时保护，外层超时需适配
          const isNightmareTask = taskName === 'batchNightmareChallengePresets';
          const BATCH_TASK_TIMEOUT = isNightmareTask
            ? (150 * 60 * 1000) // 十殿挑战：150分钟（>内部2小时超时+重试余量）
            : ((batchSettings.batchTaskTimeout || 15) * 60 * 1000);
          try {
            const executeTaskFunction = async () => {
            if (
              [
                "batchOpenBox",
                "batchOpenBoxByPoints",
                "batchOpenFragmentPacks",
                "batchOpenDiamondBox",
                "batchFish",
                "batchRecruit",
                "batchLegacyGiftSendEnhanced",
                "heroFourSaintsUpgrade",
                "batchConsumeActivity",
                "batchClaimConsumeRewards",
                "batchAutumnUseItem",
                "batchUseActivityItem",
                "batchClaimCdkReward",
                "batchClaimApexRewards",
              ].includes(taskName)
            ) {
              await taskFunction(true);
            } else if (taskName === 'legion_buy_store_items') {
              // 助威商店多选购买，传递选中的商品ID和购买次数
              console.log('[定时任务-助威商店] task.legionStoreItems:', task.legionStoreItems);
              const storeConfig = task.legionStoreItems || {};
              const selectedItems = [];
              const buyCounts = {};
              Object.keys(storeConfig).forEach(key => {
                if (storeConfig[key] && storeConfig[key].selected) {
                  selectedItems.push(parseInt(key));
                  buyCounts[parseInt(key)] = storeConfig[key].count;
                }
              });
              console.log('[定时任务-助威商店] selectedItems:', selectedItems, 'buyCounts:', buyCounts);
              if (selectedItems.length > 0) {
                await taskFunction(selectedItems, buyCounts);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 助威商店多选购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchActivityExchange') {
              // 消耗活动兑换商店多选购买，传递选中的商品后缀和购买次数
              const exchangeConfig = task.activityExchangeItems || {};
              const selectedSuffixes = [];
              const buyCounts = {};
              Object.keys(exchangeConfig).forEach(key => {
                if (exchangeConfig[key] && exchangeConfig[key].selected) {
                  const suffix = parseInt(key);
                  selectedSuffixes.push(suffix);
                  buyCounts[suffix] = exchangeConfig[key].count || 1;
                }
              });
              if (selectedSuffixes.length > 0) {
                await taskFunction(selectedSuffixes, buyCounts, true);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 消耗活动兑换购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_crystal_shop_buy') {
              // 盐晶商店多选购买，根据任务配置更新商店配置后执行
              const shopConfig = task.saltCrystalShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 更新 tasksStore 中的盐晶商店配置
                saltCrystalShopConfig.value.forEach(item => {
                  const taskItem = shopConfig[String(item.id)];
                  if (taskItem && taskItem.selected) {
                    item.count = taskItem.count;
                  } else {
                    item.count = 0;
                  }
                });
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 盐晶商店未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_ingot_shop_buy') {
              // 盐锭商店多选购买，根据任务配置更新商店配置后执行
              const shopConfig = task.saltIngotShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 更新 tasksStore 中的盐锭商店配置
                saltIngotShopConfig.value.forEach(item => {
                  const taskItem = shopConfig[String(item.id)];
                  if (taskItem && taskItem.selected) {
                    item.count = taskItem.count;
                  } else {
                    item.count = 0;
                  }
                });
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 盐锭商店未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'manual_buy') {
              // 黑市多选购买，根据任务配置更新配置后执行
              const buyConfig = task.manualBuyItems || {};
              const selectedItems = [];
              Object.keys(buyConfig).forEach(key => {
                if (buyConfig[key] && buyConfig[key].selected && buyConfig[key].count > 0) {
                  selectedItems.push({
                    goodsId: parseInt(key),
                    name: buyConfig[key].label || '',
                    count: buyConfig[key].count,
                  });
                }
              });
              if (selectedItems.length > 0) {
                // 更新 batchSettings.manualBuyItems 供 manual_buy 函数读取
                batchSettings.manualBuyItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 黑市多选购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchClaimBoxWeeklyRewards') {
              // 宝箱周自选大奖，传递选中的奖励配置 { rewardIndex: count }
              const rewardConfig = task.boxWeeklyRewards || {5: 1};
              if (rewardConfig && Object.keys(rewardConfig).length > 0) {
                await taskFunction(rewardConfig, true);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `️ 宝箱达标奖励自选大奖未配置奖励，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'weekly_market_buy') {
              // 黑市周购买，传递选中的商品索引列表
              console.log('[定时任务-黑市周购买] task.weeklyMarketItems:', task.weeklyMarketItems);
              const marketConfig = task.weeklyMarketItems || {};
              const selectedItems = [];
              Object.keys(marketConfig).forEach(key => {
                if (marketConfig[key] && marketConfig[key].selected) {
                  selectedItems.push(key);  // goodsIndex 是字符串
                }
              });
              console.log('[定时任务-黑市周购买] selectedItems:', selectedItems);
              if (selectedItems.length > 0) {
                await taskFunction({ selectedItems });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 黑市周购买未配置商品，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchSmartSendCar') {
              // 智能发车，传递任务级发车条件配置
              const smartDeparture = task.smartDeparture;
              if (smartDeparture && smartDeparture.enabled) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🚗 使用任务级发车条件: 金砖≥${smartDeparture.goldThreshold} 招募≥${smartDeparture.recruitThreshold} 白玉≥${smartDeparture.jadeThreshold} 券≥${smartDeparture.ticketThreshold}`,
                  type: "info",
                });
                await taskFunction(smartDeparture);
              } else {
                await taskFunction();
              }
            } else if (taskName === 'batchNightmareChallengePresets') {
              // 十殿阎罗挑战，根据勾选的预设执行
              const presetIds = task.nightmarePresetIds || [];
              if (presetIds.length > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚔️ 十殿阎罗挑战：执行 ${presetIds.length} 个预设`,
                  type: "info",
                });
                await batchNightmareChallengePresets();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 十殿阎罗挑战未配置预设，跳过`,
                  type: "warning",
                });
              }
            } else {
              await taskFunction();
            }
            }; // end executeTaskFunction
            await Promise.race([
              executeTaskFunction(),
              new Promise((_, reject) => setTimeout(() =>
                reject(new Error(`批量任务执行超时（${BATCH_TASK_TIMEOUT / 60000}分钟）`)),
                BATCH_TASK_TIMEOUT
              ))
            ]);
            
            // 如果不是最后一批，且设置了批次间等待，则等待
            if (!isLastBatch && batchSettings.batchIntervalWait > 0) {
              const waitSeconds = batchSettings.batchIntervalWait;
              const waitMs = waitSeconds * 1000;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏳ 第 ${batchIndex + 1} 批完成，等待${waitSeconds}秒后执行下一批...`,
                type: "info",
              });
              await new Promise(resolve => setTimeout(resolve, waitMs));
            }
          } catch (error) {
            console.error(`执行任务 ${taskName} 第 ${batchIndex + 1} 批失败:`, error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `❌ 第 ${batchIndex + 1} 批执行失败: ${error.message}`,
              type: "error",
            });

            // ✅ 超时或失败时，停止所有后台十殿战斗（防止资源泄漏）
            if (isNightmareTask && _activeNightmareBattles.length > 0) {
              for (const entry of _activeNightmareBattles) {
                if (entry.battle && (entry.status === 'running' || entry.status === 'waiting_midnight' || entry.status === 'cooling')) {
                  try {
                    entry.battle.stop();
                    addLog({ time: new Date().toLocaleTimeString(), message: `[${entry.preset.name}] 超时停止战斗`, type: 'warning' });
                  } catch {}
                }
              }
            }
            
            // 即使失败也等待
            if (!isLastBatch && batchSettings.batchIntervalWait > 0) {
              const waitSeconds = batchSettings.batchIntervalWait;
              const waitMs = waitSeconds * 1000;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏳ 等待${waitSeconds}秒后继续...`,
                type: "warning",
              });
              await new Promise(resolve => setTimeout(resolve, waitMs));
            }
          } finally {
            // ✅ 关键修复：无论任务函数成功或失败，都必须重置 isRunning
            // 原因：大部分任务函数内部设置 isRunning.value = true，但异常时没有 try/finally 保护
            // 如果 isRunning 卡住为 true，调度器会永远跳过所有定时任务
            if (isRunning.value) {
              isRunning.value = false;
              currentRunningTokenId.value = null;
            }
            // ✅ 修复：每个子任务完成后刷新 scheduledTaskStartTime，防止 healthCheck 误判定时任务卡死
            scheduledTaskStartTime = Date.now();
            lastTaskExecution = Date.now();
          }
        }
        
        // 任务执行完成后，如果不是最后一个任务，根据设置等待一段时间再执行下一个
        const currentIndex = activeTasks.indexOf(taskName);
        const isLastTask = currentIndex === activeTasks.length - 1;
        
        if (!isLastTask && batchSettings.taskIntervalWait > 0) {
          const waitSeconds = batchSettings.taskIntervalWait;
          const waitMs = waitSeconds * 1000;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏳ 等待${waitSeconds}秒后执行下一个功能...`,
            type: "info",
          });
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `任务函数不存在: ${taskName}`,
          type: "error",
        });
      }
    }

    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );
  } finally {
    // 清除任务执行状态
    isScheduledTaskRunning.value = false;
    currentScheduledTask = null;
    scheduledTaskStartTime = null; // ✅ 清除超时计时

    // ✅ 任务完成后，同步处理待执行队列（不再用 nextTick，避免与调度器兖底竞态）
    if (pendingTaskQueue.length > 0) {
      // 循环清理已过期任务，找到第一个仍然有效的任务执行
      while (pendingTaskQueue.length > 0) {
        const nextTask = pendingTaskQueue[0]; // 只peek，不先shift
        const timeCheck = isTaskTimeStillValid(nextTask, 60);

        if (!timeCheck.valid) {
          pendingTaskQueue.shift(); // 移除过期任务
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏰ 跳过已过期的队列任务: ${nextTask.name}（${timeCheck.reason}，剩余队列: ${pendingTaskQueue.length}）`,
            type: "warning",
          });
          continue; // 继续检查下一个
        }

        // 找到了时间有效的任务
        pendingTaskQueue.shift(); // 正式出队
        if (!isRunning.value && !isScheduledTaskRunning.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `▶️ 从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
            type: "info",
          });
          isScheduledTaskRunning.value = true; // 立即锁定，防止兖底逻辑竞态
          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`队列任务执行错误:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
        } else {
          // 状态被占用（用户手动执行了任务），放回队列等待
          pendingTaskQueue.unshift(nextTask);
        }
        return; // 已处理，退出
      }

      // 队列已全部清空（全部过期）
      if (pendingTaskQueue.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 队列中所有任务均已过期，已清空`,
          type: "info",
        });
      }
    }

    // ✅ 不在 finally 块中立即触发刷新
    // 改为由调度器 10 秒 tick 统一检查 shouldRefreshAfterTask 并在无任务运行时刷新
    // 这样可以确保所有队列任务都被处理完毕后，才真正刷新页面
  }
};

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = async (type) => {
  helperType.value = type;
  
  //  一键宝箱周开箱不提前获取积分，避免重复连接
  // batchOpenBoxByPoints 执行时会自动连接并获取积分
  if (type === 'pointsBox') {
    helperSettings.targetRounds = 1;  // 默认值
  }
  
  showHelperModal.value = true;
};

// 批量功法残卷赠送相关方法
const clearRecipientError = () => {
  recipientIdError.value = "";
};

const validateRecipientId = (value) => {
  if (!value || value === "") {
    return true; // 允许为空，由按钮禁用控制
  }
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return false;
  }
  return true;
};

// 头像处理方法
const handleAvatarLoad = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = false;
};

const handleAvatarError = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = true;
};

const resetAvatarState = () => {
  isAvatarLoading.value = true;
  avatarLoadError.value = false;
};

const queryRecipientInfo = async () => {
  // 1. 输入验证
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "请输入接收者ID";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return;
  }

  // 2. 检查选中账号
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "请先选择要操作的角色";
    return;
  }

  // 3. 初始化状态
  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;
  // 重置头像状态
  resetAvatarState();

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 记录开始查询
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 确保WebSocket连接
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在建立WebSocket连接...`,
      type: "info",
    });

    // 使用现有的ensureConnection函数，它已经包含了重连机制
    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket连接成功`,
      type: "success",
    });

    // 发送查询命令
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送查询命令，接收者ID: ${recipientId}`,
      type: "info",
    });

    // 延长超时时间到10秒，确保有足够时间处理
    const resp = await tokenStore.sendMessageWithPromise(
      firstTokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: recipientId,
      },
      10000,
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `查询命令发送成功，正在处理响应...`,
      type: "info",
    });

    // 处理查询结果
    console.log("rank_getroleinfo 响应结果:", resp);

    // 兼容不同的响应结构
    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 构建完整的角色信息，移除等级和VIP字段
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 添加头像URL
        avatarUrl:
          resp?.roleInfo?.headImg ||
          roleData?.headImg ||
          roleData?.role?.headImg ||
          "",
        // 战力转换为亿为单位
        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "亿",
        // 扩展更多角色信息
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 格式化角色名，处理特殊字符
      const displayName = recipientInfo.value.name || "未知角色";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("查询成功");
    } else {
      const errorMsg = "未找到该角色信息";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询失败: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 详细的错误处理
    console.error("查询接收者信息失败:", error);

    let errorMsg = "查询失败";
    let logType = "error";

    // 根据错误类型提供更友好的错误信息
    if (error.message.includes("连接失败")) {
      errorMsg = "WebSocket连接失败，请检查网络或账号状态";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("超时")
    ) {
      errorMsg = "查询超时，请稍后重试";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "功法系统未开启";
    } else {
      errorMsg = `查询失败: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 记录错误日志
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 显示用户友好的错误提示
    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 记录查询完成
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 查询操作完成 ===`,
      type: "info",
    });
  }
};

// 重置功法赠送模态框
const resetLegacyGiftModal = () => {
  recipientIdInput.value = '';
  recipientInfo.value = null;
  recipientIdError.value = '';
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("请先查询并确认接收者信息");
    return;
  }

  // 检查是否所有选中账号都有密码配置
  if (!hasPasswordForSelectedTokens.value) {
    message.error("请确保所有选中的账号都已配置功法赠送密码(在账号设置或任务模板中)");
    return;
  }

  // 调用增强版批量赠送功能
  await batchLegacyGiftSendEnhanced();

  // 关闭模态框
  showLegacyGiftModal.value = false;
  // 重置所有状态
  resetLegacyGiftModal();
};

const executeHelper = () => {
  if (helperType.value === 'weeklyMarket') {
    // 黑市周购买特殊处理
    // 验证是否在黑市周开放期间
    if (!isWeirdTowerActivityOpen.value) {
      message.warning(weirdTowerActivityStatus.value);
      return;
    }
    
    if (!helperSettings.weeklyMarketItems || helperSettings.weeklyMarketItems.length === 0) {
      message.warning("请至少选择一个商品");
      return;
    }
    showHelperModal.value = false;
    // 传递选中的商品列表
    weeklyMarketBuy({ selectedItems: [...helperSettings.weeklyMarketItems] });
  } else if (helperType.value === 'cdk') {
    // 兑换码领取
    if (!helperSettings.cdkCode || !helperSettings.cdkCode.trim()) {
      message.warning("请输入兑换码");
      return;
    }
    // 同步到batchSettings（定时任务使用）
    batchSettings.cdkCode = helperSettings.cdkCode.trim();
    showHelperModal.value = false;
    batchClaimCdkReward(false, helperSettings.cdkCode.trim());
  } else if (helperType.value === 'cheer') {
    // 挥鼓助威消耗
    showHelperModal.value = false;
    batchAutumnUseItem({ value: helperSettings.cheerQty || 0 });
  } else {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
    showHelperModal.value = false;
    if (helperType.value === "box") {
      batchOpenBox();
    } else if (helperType.value === "fish") {
      batchFish();
    } else if (helperType.value === "recruit") {
      batchRecruit();
    } else if (helperType.value === "pointsBox") {
      batchOpenBoxByPoints();
    }
  }
};

// Dream Buy Modal Logic
const showDreamBuyModal = ref(false);
const dreamBuyList = ref([]);

const openDreamBuyModal = () => {
  // Load saved settings
  dreamBuyList.value = batchSettings.dreamPurchaseList || [];
  showDreamBuyModal.value = true;
};

const toggleDreamItem = (itemKey, checked) => {
  if (checked) {
    if (!dreamBuyList.value.includes(itemKey)) {
      dreamBuyList.value.push(itemKey);
    }
  } else {
    dreamBuyList.value = dreamBuyList.value.filter(k => k !== itemKey);
  }
};

const saveDreamBuyConfig = () => {
  // Save settings
  batchSettings.dreamPurchaseList = [...dreamBuyList.value];
  saveBatchSettings();
  
  showDreamBuyModal.value = false;
  message.success("梦境购买配置已保存");
};

const selectGoldItems = () => {
  const newSelection = new Set(dreamBuyList.value);
  
  for (const merchantId in goldItemsConfig) {
    const items = goldItemsConfig[merchantId];
    items.forEach(index => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }
  
  dreamBuyList.value = Array.from(newSelection);
};

const selectAllItems = () => {
  const newSelection = new Set(dreamBuyList.value);
  
  for (const merchantId in merchantConfig) {
    const items = merchantConfig[merchantId].items;
    items.forEach((_, index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }
  
  dreamBuyList.value = Array.from(newSelection);
};

const clearAllItems = () => {
  dreamBuyList.value = [];
};

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      bossFormation: 1,
      nightmareFormation: 1, // 十殿阵容
      bossTimes: 2,
      dailyBossTimes: 1,
      claimBottle: true,
      payRecruit: true,
      openBox: true,
      arenaEnable: true,
      claimHangUp: true,
      claimEmail: true,
      blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
      blackMarketStandalonePurchase: false,
      legacyGiftPassword: '', // 新增
    };
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return null;
  }
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  currentSettings.purchaseDiscounts = initPurchaseDiscounts(currentSettings.purchaseDiscounts);
  showSettingsModal.value = true;

  // 自动获取黑市采购清单（需WebSocket已连接）
  const wsStatus = tokenStore.getWebSocketStatus(token.id);
  if (wsStatus === 'connected') {
    tokenStore.sendMessageWithPromise(token.id, 'store_getpurchase', {}, 8000)
      .then((result) => {
        console.log('[采购清单] 响应:', JSON.stringify(result).substring(0, 500));
        // 兼容多种响应结构
        const purchaseItems = result?.purchaseItemList
          || result?.store?.purchaseItemList
          || result?.data?.purchaseItemList;
        if (purchaseItems?.length > 0) {
          currentSettings.purchaseList = purchaseItems.map(i => i.itemId);
          // 回填折扣
          const discounts = {};
          purchaseItems.forEach(i => { if (i.discount != null) discounts[i.itemId] = i.discount; });
          currentSettings.purchaseDiscounts = initPurchaseDiscounts(discounts);
          // 回填采购次数
          const purchaseCnt = result?.purchaseCnt ?? result?.store?.purchaseCnt;
          if (purchaseCnt != null) currentSettings.purchaseCnt = purchaseCnt;
        } else {
          console.warn('[采购清单] 响应为空或无purchaseItemList, keys:', result ? Object.keys(result).join(',') : 'null');
        }
      })
      .catch((e) => {
        console.warn('[采购清单] 获取失败:', e?.message || e);
      });
  } else {
    console.warn('[采购清单] WebSocket未连接, 状态:', wsStatus);
  }
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

// Task Template Functions
const openTaskTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置当前模板
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    bossTimes: 2,
    dailyBossTimes: 1,
    claimBottle: true,
    payRecruit: true,
    openBox: true,
    arenaEnable: true,
    claimHangUp: true,
    claimEmail: true,
    blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
    legacyGiftPassword: '',
  });
  currentTemplateName.value = "";
  currentTemplate.purchaseDiscounts = initPurchaseDiscounts(currentTemplate.purchaseDiscounts);
  showTaskTemplateModal.value = true;
};

const loadTaskTemplates = () => {
  const templates = localStorage.getItem("task-templates");
  const parsed = templates ? JSON.parse(templates) : [];
  taskTemplates.value = parsed;
  return parsed;
};

// 计算引用某个模板的账号数量
const getTemplateAccountCount = (templateId) => {
  if (!templateId) return 0;
  let count = 0;
  const tokens = tokenStore.gameTokens || [];
  tokens.forEach((token) => {
    try {
      const settingsStr = localStorage.getItem(`daily-settings:${token.id}`);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.templateId === templateId) {
          count++;
        }
      }
    } catch (e) { /* ignore */ }
  });
  return count;
};

const openApplyTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置选择
  selectedTemplateId.value = null;
  selectedTokensForApply.value = [];
  showApplyTemplateModal.value = true;
};

const handleSelectAllForApply = (checked) => {
  if (checked) {
    selectedTokensForApply.value = sortedTokens.value.map((token) => token.id);
  } else {
    selectedTokensForApply.value = [];
  }
};

const applyTemplate = () => {
  if (!selectedTemplateId.value || selectedTokensForApply.value.length === 0) {
    message.error("请选择模板和要应用的账号");
    return;
  }

  // 找到选中的模板
  const templates = loadTaskTemplates();
  const template = templates.find((t) => t.id === selectedTemplateId.value);
  if (!template) {
    message.error("模板不存在");
    return;
  }

  // 应用模板到选中的账号
  let successCount = 0;
  selectedTokensForApply.value.forEach((tokenId) => {
    // 保存账号设置时同时保存模板ID
    const accountSettings = {
      ...template.settings,
      templateId: template.id, // 记录模板ID
    };
    localStorage.setItem(
      `daily-settings:${tokenId}`,
      JSON.stringify(accountSettings),
    );
    successCount++;
  });

  message.success(`已成功应用模板到 ${successCount} 个账号`);
  showApplyTemplateModal.value = false;
};

// Template Manager Functions
const openTemplateManagerModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  showTemplateManagerModal.value = true;
};

const openEditTemplateModal = (template) => {
  // 加载模板数据到当前编辑模板
  currentTemplateId.value = template.id;
  currentTemplateName.value = template.name;
  Object.assign(currentTemplate, template.settings);
  currentTemplate.purchaseDiscounts = initPurchaseDiscounts(currentTemplate.purchaseDiscounts);
  showTaskTemplateModal.value = true;
};

const updateTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  // 找到并更新模板
  const templates = loadTaskTemplates();
  const templateIndex = templates.findIndex(
    (t) => t.id === currentTemplateId.value,
  );
  if (templateIndex === -1) {
    message.error("模板不存在");
    return;
  }

  // 更新模板
  templates[templateIndex] = {
    ...templates[templateIndex],
    name: currentTemplateName.value.trim(),
    settings: {
      ...currentTemplate,
    },
    updatedAt: new Date().toISOString(),
  };

  // 保存模板到localStorage
  localStorage.setItem("task-templates", JSON.stringify(templates));

  // 更新模板列表
  taskTemplates.value = templates;

  // ✅ 同步更新所有应用了该模板的账号设置
  const templateId = currentTemplateId.value;
  const newSettings = { ...currentTemplate };
  let updatedAccounts = 0;
  
  // 遍历localStorage，找到所有应用了该模板的账号
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('daily-settings:')) {
      try {
        const accountSettings = JSON.parse(localStorage.getItem(key));
        // 如果该账号使用了当前模板，则更新其设置
        if (accountSettings.templateId === templateId) {
          const updatedAccountSettings = {
            ...newSettings,
            templateId: templateId, // 保留模板ID
          };
          localStorage.setItem(key, JSON.stringify(updatedAccountSettings));
          updatedAccounts++;
        }
      } catch (error) {
        console.error(`解析账号设置失败: ${key}`, error);
      }
    }
  }

  const updateMessage = updatedAccounts > 0 
    ? `已更新模板 "${templates[templateIndex].name}"，并同步到 ${updatedAccounts} 个账号`
    : `已更新模板 "${templates[templateIndex].name}"`;
  
  message.success(updateMessage);
  showTaskTemplateModal.value = false;

  // 重置编辑状态
  resetTemplateForm();
};

const deleteTaskTemplate = (templateId) => {
  // 确认删除
  if (confirm("确定要删除这个模板吗？")) {
    // 找到并删除模板
    const templates = loadTaskTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== templateId);

    // 保存模板到localStorage
    localStorage.setItem("task-templates", JSON.stringify(filteredTemplates));

    // 更新模板列表
    taskTemplates.value = filteredTemplates;

    message.success("模板已删除");
  }
};

const resetTemplateForm = () => {
  currentTemplateId.value = null;
  currentTemplateName.value = "";
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    bossTimes: 2,
    dailyBossTimes: 1,
    claimBottle: true,
    payRecruit: true,
    openBox: true,
    arenaEnable: true,
    claimHangUp: true,
    claimEmail: true,
    blackMarketPurchase: true,
  purchaseList: [],
  purchaseDiscounts: {},
  purchaseCnt: 15,
    blackMarketStandalonePurchase: false, // 黑市单独购买，默认不启用
  });
};

const openAccountTemplateModal = () => {
  // 加载账号模板引用关系
  loadAccountTemplateReferences();
  showAccountTemplateModal.value = true;
};

const loadAccountTemplateReferences = () => {
  const templates = loadTaskTemplates();
  const references = [];

  // 遍历所有账号，获取其模板引用
  sortedTokens.value.forEach((token) => {
    const settingsStr = localStorage.getItem(`daily-settings:${token.id}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        const templateId = settings.templateId;
        const template = templates.find((t) => t.id === templateId);

        references.push({
          tokenId: token.id,
          tokenName: token.name,
          templateId: templateId,
          templateName: template ? template.name : "未引用模板",
        });
      } catch (e) {
        console.error(`解析账号 ${token.name} 的设置失败:`, e);
      }
    } else {
      // 没有设置的账号
      references.push({
        tokenId: token.id,
        tokenName: token.name,
        templateId: null,
        templateName: "未引用模板",
      });
    }
  });

  accountTemplateReferences.value = references;
  filteredAccountTemplates.value = references;
};

const filterAccountTemplates = () => {
  if (!selectedTemplateForFilter.value) {
    filteredAccountTemplates.value = accountTemplateReferences.value;
  } else {
    filteredAccountTemplates.value = accountTemplateReferences.value.filter(
      (item) => item.templateId === selectedTemplateForFilter.value,
    );
  }
};

// 导出账号模板引用
const exportAccountReferences = () => {
  try {
    isExporting.value = true;
    loadAccountTemplateReferences();
    
    const references = accountTemplateReferences.value;
    
    if (references.length === 0) {
      message.warning("没有可导出的账号模板引用");
      isExporting.value = false;
      return;
    }

    const exportData = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      references: references,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `account_references_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`导出成功: ${references.length} 个账号模板引用`);
  } catch (error) {
    console.error("导出账号引用失败:", error);
    message.error("导出失败: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 导入账号模板引用
const importAccountReferences = async ({ file }) => {
  try {
    isImporting.value = true;
    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 验证结构
        if (!importData.version || !Array.isArray(importData.references)) {
          message.error("无效的账号引用文件格式");
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        importData.references.forEach((reference) => {
          if (!reference.tokenId || !reference.tokenName) {
            skippedCount++;
            return;
          }

          // 检查账号是否存在
          const tokenExists = tokens.value.some(t => t.id === reference.tokenId);
          if (!tokenExists) {
            skippedCount++;
            return;
          }

          // 检查模板是否存在
          const templates = loadTaskTemplates();
          const templateExists = !reference.templateId || templates.some(t => t.id === reference.templateId);
          if (!templateExists) {
            skippedCount++;
            return;
          }

          // 保存账号设置，包含模板引用
          const settingsStr = localStorage.getItem(`daily-settings:${reference.tokenId}`);
          let settings = {};
          if (settingsStr) {
            try {
              settings = JSON.parse(settingsStr);
            } catch (e) {
              console.error(`解析账号 ${reference.tokenName} 的设置失败:`, e);
            }
          }

          // 更新模板引用
          if (reference.templateId) {
            settings.templateId = reference.templateId;
          } else {
            delete settings.templateId;
          }

          // 保存更新后的设置
          localStorage.setItem(
            `daily-settings:${reference.tokenId}`,
            JSON.stringify(settings)
          );

          importedCount++;
        });

        // 重新加载账号模板引用
        loadAccountTemplateReferences();

        message.success(
          `导入成功: ${importedCount} 个账号引用, ${skippedCount} 个跳过`
        );
      } catch (parseError) {
        console.error("解析账号引用文件失败:", parseError);
        message.error("解析账号引用文件失败");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("导入账号引用失败:", error);
    message.error("导入失败: " + error.message);
    isImporting.value = false;
  }
};

const openNewTemplateModal = () => {
  // 重置表单，准备创建新模板
  resetTemplateForm();
  showTaskTemplateModal.value = true;
};

// 修改saveTaskTemplate函数，支持新增和编辑
const saveTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  const templates = loadTaskTemplates();

  if (currentTemplateId.value) {
    // 更新现有模板
    updateTaskTemplate();
  } else {
    // 创建新模板
    const template = {
      id: Date.now().toString(),
      name: currentTemplateName.value.trim(),
      settings: {
        ...currentTemplate,
      },
      createdAt: new Date().toISOString(),
    };

    // 添加新模板
    templates.push(template);
    localStorage.setItem("task-templates", JSON.stringify(templates));

    // 更新模板列表
    taskTemplates.value = templates;

    message.success(`已保存模板 "${template.name}"`);
    showTaskTemplateModal.value = false;

    // 重置表单
    resetTemplateForm();
  }
};

// 加载状态
const isExporting = ref(false);
const isImporting = ref(false);

// 导出任务模板
const exportTaskTemplates = () => {
  try {
    isExporting.value = true;
    const templates = loadTaskTemplates();
    
    if (templates.length === 0) {
      message.warning("没有可导出的任务模板");
      isExporting.value = false;
      return;
    }

    const exportData = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      templates: templates,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task_templates_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`导出成功: ${templates.length} 个任务模板`);
  } catch (error) {
    console.error("导出模板失败:", error);
    message.error("导出失败: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 导入任务模板
const importTaskTemplates = async ({ file }) => {
  try {
    isImporting.value = true;
    // n-upload的custom-request中，file是UploadFileInfo对象，实际File对象在file.file中
    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 验证结构
        if (!importData.version || !Array.isArray(importData.templates)) {
          message.error("无效的模板文件格式");
          return;
        }

        let importedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const existingTemplates = loadTaskTemplates();
        const existingTemplateIds = new Set(existingTemplates.map(t => t.id));

        importData.templates.forEach((template) => {
          if (!template.id || !template.name || !template.settings) {
            skippedCount++;
            return;
          }

          if (existingTemplateIds.has(template.id)) {
            // 更新现有模板
            const index = existingTemplates.findIndex(t => t.id === template.id);
            if (index !== -1) {
              existingTemplates[index] = {
                ...template,
                updatedAt: new Date().toISOString(),
              };
              updatedCount++;
            }
          } else {
            // 添加新模板
            existingTemplates.push({
              ...template,
              createdAt: template.createdAt || new Date().toISOString(),
            });
            importedCount++;
          }
        });

        // 保存更新后的模板
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));

        // 更新模板列表
        taskTemplates.value = existingTemplates;

        message.success(
          `导入成功: ${importedCount} 个新模板, ${updatedCount} 个更新模板, ${skippedCount} 个跳过`
        );
      } catch (parseError) {
        console.error("解析模板文件失败:", parseError);
        message.error("解析模板文件失败");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("导入模板失败:", error);
    message.error("导入失败: " + error.message);
    isImporting.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const autoScrollLog = ref(true);
const userManuallyDisabledScroll = ref(false); // 记录用户是否手动关闭了自动滚动
const filterErrorsOnly = ref(false);
const errorCount = computed(() => {
  return logs.value.filter((log) => log.type === "error").length;
});

// 监听日志容器的滚动事件
const handleLogScroll = () => {
  if (!logContainer.value) return;
  
  // 如果用户手动关闭了自动滚动，不再自动开启
  if (userManuallyDisabledScroll.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const isAtBottom = distanceToBottom < 10; // 距离底部10px以内视为到达底部
  
  // 如果滚动到底部，开启自动滚动
  if (isAtBottom && !autoScrollLog.value) {
    autoScrollLog.value = true;
    console.log('[自动滚动] 检测到滚动到底部，开启自动滚动');
  }
  // 如果往上滚动（距离底部超过10px），立即关闭自动滚动
  else if (!isAtBottom && autoScrollLog.value) {
    autoScrollLog.value = false;
    console.log(`[自动滚动] 检测到往上滚动（距离底部${distanceToBottom.toFixed(0)}px），关闭自动滚动`);
  }
};

const filteredLogs = computed(() => {
  if (filterErrorsOnly.value) {
    return logs.value.filter((log) => log.type === "error");
  }
  return logs.value;
});

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// Selection logic
const isAllSelected = computed(() => {
  // 如果有搜索关键词，基于搜索结果判断
  if (tokenSearchKeyword.value.trim()) {
    return (
      selectedTokens.value.length === sortedTokens.value.length &&
      sortedTokens.value.length > 0 &&
      sortedTokens.value.every((t) => selectedTokens.value.includes(t.id))
    );
  }
  // 没有搜索时，基于所有账号判断
  return (
    selectedTokens.value.length === tokens.value.length &&
    tokens.value.length > 0
  );
});

const isIndeterminate = computed(() => {
  // 如果有搜索关键词，基于搜索结果判断
  if (tokenSearchKeyword.value.trim()) {
    const selectedInSearch = sortedTokens.value.filter((t) =>
      selectedTokens.value.includes(t.id)
    ).length;
    return (
      selectedInSearch > 0 &&
      selectedInSearch < sortedTokens.value.length
    );
  }
  // 没有搜索时，基于所有账号判断
  return (
    selectedTokens.value.length > 0 &&
    selectedTokens.value.length < tokens.value.length
  );
});

// 模块展开/收起状态（持久化到 localStorage）
const LS_EXPAND_KEY = 'batch_expand_state';
const loadExpandState = () => {
  try {
    const saved = localStorage.getItem(LS_EXPAND_KEY);
    return saved ? JSON.parse(saved) : { functions: false, tokens: true };
  } catch { return { functions: false, tokens: true }; }
};
const saveExpandState = () => {
  try {
    localStorage.setItem(LS_EXPAND_KEY, JSON.stringify({
      functions: isBatchFunctionsExpanded.value,
      tokens: isTokenListExpanded.value
    }));
  } catch {}
};
const _initExpand = loadExpandState();
const isTokenListExpanded = ref(_initExpand.tokens); // 账号列表展开/收起状态
const showSponsorModal = ref(false); // 赞助弹窗显示状态
const showTipsModal = ref(false); // 温馨提示弹窗显示状态
const showQQGroupModal = ref(false); // QQ群弹窗显示状态
const isBatchFunctionsExpanded = ref(_initExpand.functions); // 批量功能列表展开/收起状态
watch(isBatchFunctionsExpanded, saveExpandState);
watch(isTokenListExpanded, saveExpandState);
const isTowerExpandedForAll = ref(false);
const isCarExpandedForAll = ref(false);
const isClimbTowerExpandedForAll = ref(false);
const isWeirdTowerExpandedForAll = ref(false);

// 防休眠状态
// ✅ 防休眠状态持久化
const WAKE_LOCK_STORAGE_KEY = 'wakeLockEnabled';

// 从 localStorage 加载防休眠状态
const loadWakeLockState = () => {
  try {
    const saved = localStorage.getItem(WAKE_LOCK_STORAGE_KEY);
    return saved === 'true';
  } catch (error) {
    console.error('加载防休眠状态失败:', error);
    return false;
  }
};

// 保存防休眠状态到 localStorage
const saveWakeLockState = (enabled) => {
  try {
    localStorage.setItem(WAKE_LOCK_STORAGE_KEY, String(enabled));
  } catch (error) {
    console.error('保存防休眠状态失败:', error);
  }
};

const isWakeLockEnabled = ref(loadWakeLockState());  // ✅ 从 localStorage 加载
const wakeLockSupported = ref(false);

// 防休眠开关处理
const handleWakeLockToggle = async (enabled) => {
  if (enabled) {
    const success = await wakeLockManager.request();
    if (success) {
      message.success('防休眠已开启,系统将保持唤醒状态');
      isWakeLockEnabled.value = true;
      saveWakeLockState(true);  // ✅ 保存到 localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "🛡️ 防休眠已开启",
        type: "success",
      });
    } else {
      message.error('防休眠开启失败,请检查环境支持');
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);  // ✅ 保存到 localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "防休眠开启失败",
        type: "error",
      });
    }
  } else {
    await wakeLockManager.release();
    message.info('防休眠已关闭');
    isWakeLockEnabled.value = false;
    saveWakeLockState(false);  // ✅ 保存到 localStorage
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "防休眠已关闭",
      type: "info",
    });
  }
};

const handleSelectAll = (checked) => {
  if (checked) {
    // 如果有搜索关键词，只选中搜索出来的账号
    if (tokenSearchKeyword.value.trim()) {
      selectedTokens.value = sortedTokens.value.map((t) => t.id);
    } else {
      // 没有搜索时，选中所有账号
      selectedTokens.value = tokens.value.map((t) => t.id);
    }
  } else {
    selectedTokens.value = [];
  }
};

// 处理TokenCard选择事件
const handleTokenSelect = (tokenId, checked) => {
  if (checked) {
    if (!selectedTokens.value.includes(tokenId)) {
      selectedTokens.value.push(tokenId);
    }
  } else {
    const index = selectedTokens.value.indexOf(tokenId);
    if (index > -1) {
      selectedTokens.value.splice(index, 1);
    }
  }
};

// 处理TokenCard连接切换事件
const handleToggleConnection = async (tokenId) => {
  const connection = tokenStore.wsConnections[tokenId];
  const isConnected = connection?.status === 'connected';
  const isConnecting = connection?.status === 'connecting';
  
  // 防止重复点击
  if (isConnecting) {
    message.info('连接正在建立中,请稍候...');
    return;
  }
  
  if (isConnected) {
    // 断开连接
    await tokenStore.closeWebSocketConnection(tokenId);
    message.success(`已断开连接`);
  } else {
    // 建立连接
    const token = tokens.value.find(t => t.id === tokenId);
    if (token) {
      try {
        message.loading(`正在连接: ${token.name}...`);
        
        // 尝试建立连接
        await tokenStore.createWebSocketConnection(tokenId, token.token);
        
        // 等待连接状态更新
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 检查连接结果
        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          message.destroyAll();
          message.success(`已连接: ${token.name}`);
          
          // 连接成功后自动获取角色信息
          tokenStore.sendGetRoleInfo(tokenId);
        } else {
          message.destroyAll();
          if (conn?.status === 'error') {
            message.warning(`连接失败，正在刷新Token，稍后重连`);
            // error状态时自动尝试刷新Token并重连
            try {
              const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
              if (refreshSuccess) {
                message.success(`Token刷新成功, 正在重新连接: ${token.name}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const reConn = tokenStore.wsConnections[tokenId];
                if (reConn?.status === 'connected') {
                  tokenStore.sendGetRoleInfo(tokenId);
                }
              } else {
                message.error(`Token刷新失败, 请手动重新导入: ${token.name}`);
              }
            } catch (refreshError) {
              message.error(`Token刷新失败: ${refreshError.message || '未知错误'}`);
            }
          } else if (conn?.status === 'disconnected') {
            message.warning(`连接未完成状态：已刷新Token请重新连接`);
          } else {
            message.warning(`连接未完成, 状态: ${conn?.status || 'unknown'}`);
          }
        }
      } catch (error) {
        message.destroyAll();
        message.warning(`连接失败: ${error.message || '未知错误'},正在尝试刷新Token...`);
        
        // 连接失败时尝试刷新Token
        try {
          const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
          
          if (refreshSuccess) {
            message.success(`Token刷新成功,正在重新连接: ${token.name}`);
            
            // 等待重连完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const conn = tokenStore.wsConnections[tokenId];
            if (conn?.status === 'connected') {
              tokenStore.sendGetRoleInfo(tokenId);
            }
          } else {
            message.error(`Token刷新失败,请手动重新导入: ${token.name}`);
          }
        } catch (refreshError) {
          message.error(`Token刷新失败: ${refreshError.message || '未知错误'}`);
        }
      }
    }
  }
};

// 拖动排序相关 - 在父组件中维护全局状态
const draggedTokenId = ref(null);
const isDragging = ref(false);
const targetTokenId = ref(null); // 当前鼠标下的目标卡片

// 处理拖动开始
const handleTokenDragStart = (tokenId) => {
  draggedTokenId.value = tokenId;
  isDragging.value = true;
  targetTokenId.value = null; // 重置目标位置
};

// 处理拖动结束
const handleTokenDragEnd = (tokenId) => {
  draggedTokenId.value = null;
  isDragging.value = false;
  targetTokenId.value = null;
};

// 处理拖动查询（子组件查询拖动状态）
const handleTokenDragQuery = (tokenId, callback) => {
  callback(isDragging.value, draggedTokenId.value);
};

// 处理更新目标位置（鼠标进入新卡片时）
const handleTokenDragUpdateTarget = (tokenId) => {
  targetTokenId.value = tokenId;
};

// 处理获取目标位置（鼠标松开时）
const handleTokenDragGetTarget = (callback) => {
  callback(targetTokenId.value);
};

// 处理放下
const handleTokenDrop = async ({ draggedId, targetId }) => {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }
  
  // 获取当前排序后的token列表
  const currentTokens = [...sortedTokens.value];
  
  const draggedIndex = currentTokens.findIndex(t => t.id === draggedId);
  const targetIndex = currentTokens.findIndex(t => t.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }
  
  // 重新排序
  const [removed] = currentTokens.splice(draggedIndex, 1);
  currentTokens.splice(targetIndex, 0, removed);
  
  // 保存新的排序
  const newTokenOrder = currentTokens.map(t => t.id);
  
  // 更新tokenOrder响应式变量，触发sortedTokens重新计算
  tokenOrder.value = newTokenOrder;
  
  // 保存到存储
  await saveTokenOrder(newTokenOrder);
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `已调整账号位置`,
    type: 'success'
  });
};

// 保存Token排序
const saveTokenOrder = async (tokenOrder) => {
  try {
    await storage.set('tokenOrder', tokenOrder);
  } catch (error) {
    console.error('保存Token排序失败:', error);
  }
};

// 加载Token排序
const loadTokenOrder = async () => {
  try {
    const savedOrder = await storage.get('tokenOrder');
    return savedOrder || [];
  } catch (error) {
    console.error('加载Token排序失败:', error);
    return [];
  }
};

// 刷新选中的Token
const refreshSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择要刷新的账号');
    return;
  }

  message.info(`开始刷新 ${selectedTokens.value.length} 个Token...`);

  let successCount = 0;
  let failCount = 0;

  // 串行刷新，避免同时发起太多请求
  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 标记Token为正在执行任务
      tokenStore.setTokenRunning(tokenId, true);
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `尝试刷新Token: ${token.name}`,
        type: "info",
      });

      // 尝试刷新Token
      const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId);
      
      if (refreshSuccess) {
        // 刷新成功，更新最后刷新时间
        token.lastRefreshAt = new Date().toISOString();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token刷新成功: ${token.name}`,
          type: "success",
        });
        successCount++;
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token刷新失败: ${token.name}`,
          type: "warning",
        });
        failCount++;
      }
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `刷新Token失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
      failCount++;
    } finally {
      // 标记Token为任务完成
      tokenStore.setTokenRunning(tokenId, false);
    }

    // 添加短暂延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (successCount > 0) {
    message.success(`成功刷新 ${successCount} 个Token`);
  }
  if (failCount > 0) {
    message.error(`${failCount} 个Token刷新失败`);
  }
};

// 重置选中账号的本地缓存
const resetSelectedTokensCache = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择要重置的账号');
    return;
  }

  let resetCount = 0;
  
  // 遍历选中的token,清除localStorage中的缓存
  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 清除该token的所有相关缓存
      // 根据 TokenCard.vue 中的实际存储键名: tokencard_{id}_status
      const cacheKeys = [
        `tokencard_${tokenId}_status`,  // 卡片状态缓存
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[重置缓存] 已清除: ${key}`);
      });
      
      resetCount++;
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `已重置缓存: ${token.name}`,
        type: "success",
      });
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `重置缓存失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  if (resetCount > 0) {
    message.success(`已重置 ${resetCount} 个账号的缓存，请刷新页面查看效果`);
  }
};

// 删除选中的账号（复用tokenStore.removeToken逻辑）
const deleteSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) return;

  let deletedCount = 0;
  const failedNames = [];

  for (const tokenId of [...selectedTokens.value]) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 调用tokenStore的removeToken：断开WS连接 + 从gameTokens移除 + 删除IndexedDB BIN数据
      await tokenStore.removeToken(tokenId);

      // 清除该token的日常任务配置
      localStorage.removeItem(`daily-settings:${tokenId}`);
      // 清除卡片状态缓存
      localStorage.removeItem(`tokencard_${tokenId}_status`);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `已删除账号: ${token.name}`,
        type: "success",
      });
      deletedCount++;
    } catch (error) {
      console.error(`删除账号失败 [${token.name}]:`, error);
      failedNames.push(token.name);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `删除账号失败 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  // 清除选中列表
  selectedTokens.value = [];

  if (deletedCount > 0) {
    message.success(`已删除 ${deletedCount} 个账号`);
  }
  if (failedNames.length > 0) {
    message.error(`${failedNames.length} 个账号删除失败: ${failedNames.join(', ')}`);
  }
};

// 添加Token弹窗状态
const showAddTokenModal = ref(false);
const addTokenImportMethod = ref("manual");

// 打开添加Token弹窗（替代跳转）
const navigateToAddToken = () => {
  showAddTokenModal.value = true;
};

const getStatusType = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "info";
  if (status === "waiting_retry") return "warning";
  return "default";
};

const getStatusText = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "running") return "执行中";
  if (status === "waiting_retry") return "等待重试";
  return "等待中";
};

// =====================
// 连接/断开相关方法
// =====================

/**
 * 连接选中的账号
 */
const connectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择要连接的账号");
    return;
  }

  const tokensToConnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return !connection || connection.status !== "connected";
  });

  if (tokensToConnect.length === 0) {
    message.info("选中的账号已全部连接");
    return;
  }

  // 显示加载提示
  const loadingMsg = message.loading(`开始连接 ${tokensToConnect.length} 个账号...`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  // 串行连接，避免同时发起太多请求
  for (const tokenId of tokensToConnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    if (!token) continue;

    try {
      // 更新加载提示
      loadingMsg.content = `正在连接: ${token.name} (${successCount + failCount + 1}/${tokensToConnect.length})`;
      
      await tokenStore.createWebSocketConnection(tokenId, token.token);
      successCount++;

      // 连接成功后自动获取角色信息
      setTimeout(() => {
        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          tokenStore.sendGetRoleInfo(tokenId);
        }
      }, 1000);

      // 添加小延迟，避免请求过于频繁
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failCount++;
      console.error(`连接失败 ${token.name}:`, error);
    }
  }
  
  // 关闭加载提示
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`成功连接 ${successCount} 个账号，${failCount} 个账号连接失败`);
    } else {
      message.success(`成功连接 ${successCount} 个账号`);
    }
  } else {
    message.error(`所有账号连接失败，共 ${failCount} 个账号`);
  }
};

/**
 * 断开选中的账号
 */
const disconnectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择要断开的账号");
    return;
  }

  const tokensToDisconnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return connection && connection.status === "connected";
  });

  if (tokensToDisconnect.length === 0) {
    message.info("选中的账号未连接");
    return;
  }

  // 显示加载提示
  const loadingMsg = message.loading(`开始断开 ${tokensToDisconnect.length} 个账号...`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of tokensToDisconnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      // 更新加载提示
      loadingMsg.content = `正在断开: ${token?.name || tokenId} (${successCount + failCount + 1}/${tokensToDisconnect.length})`;
      
      await tokenStore.closeWebSocketConnection(tokenId);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`断开连接失败 ${tokenId}:`, error);
    }
  }
  
  // 关闭加载提示
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`已断开 ${successCount} 个账号的连接，${failCount} 个账号断开失败`);
    } else {
      message.success(`已断开 ${successCount} 个账号的连接`);
    }
  } else {
    message.error(`所有账号断开失败，共 ${failCount} 个账号`);
  }
};

// =====================
// Token分组管理相关方法
// =====================

/**
 * 创建新分组
 */
const createNewGroup = () => {
  if (!newGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  const newGroup = tokenStore.createTokenGroup(newGroupName.value.trim(), newGroupColor.value);
  
  // 添加选中的Token到新分组
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach(tokenId => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("分组创建成功");
  newGroupName.value = "";
  newGroupColor.value = "#1677ff";
  newGroupSelectedTokens.value = [];
};

const selectAllNewGroup = () => {
  newGroupSelectedTokens.value = sortedTokens.value.map(t => t.id);
};

const deselectAllNewGroup = () => {
  newGroupSelectedTokens.value = [];
};

/**
 * 删除分组
 */
const deleteGroup = (groupId) => {
  if (confirm("确定要删除这个分组吗？分组中的token不会被删除。")) {
    tokenStore.deleteTokenGroup(groupId);
    message.success("分组已删除");
  }
};

/**
 * 保存编辑的分组
 */
const saveEditGroup = () => {
  if (!editingGroupId.value) return;

  if (!editingGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  tokenStore.updateTokenGroup(editingGroupId.value, {
    name: editingGroupName.value.trim(),
    color: editingGroupColor.value,
  });

  message.success("分组已更新");
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 开始编辑分组
 */
const startEditGroup = (groupId) => {
  const group = tokenGroups.value.find((g) => g.id === groupId);
  if (group) {
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
    editingGroupColor.value = group.color;
  }
};

/**
 * 取消编辑分组
 */
const cancelEditGroup = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

// 导入导出分组相关函数
const importFileInput = ref(null);

/**
 * 导出分组
 */
const exportGroups = () => {
  tokenStore.exportTokenGroups();
  message.success("分组导出成功");
};

/**
 * 触发导入分组文件选择
 */
const triggerImportGroups = () => {
  if (importFileInput.value) {
    importFileInput.value.click();
  }
};

/**
 * 处理导入文件
 */
const handleImportFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = e.target.result;
      if (jsonData) {
        const success = tokenStore.importTokenGroups(jsonData.toString());
        if (success) {
          message.success("分组导入成功");
        }
      }
    } catch (error) {
      message.error(`导入失败: ${error.message}`);
      console.error("分组导入失败:", error);
    } finally {
      // 重置文件输入
      if (importFileInput.value) {
        importFileInput.value.value = "";
      }
    }
  };
  reader.readAsText(file);
};

/**
 * 切换分组选择状态
 */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 更新selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 判断分组是否被选中
 */
const isGroupSelected = (groupId) => {
  return selectedGroups.value.includes(groupId);
};

/**
 * 根据选中的分组更新selectedTokens
 */
const updateSelectedTokensFromGroups = () => {
  const tokenIds = new Set();

  selectedGroups.value.forEach((groupId) => {
    const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
    validTokenIds.forEach((id) => tokenIds.add(id));
  });

  selectedTokens.value = Array.from(tokenIds);
};

/**
 * 一键清除所有分组选择
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

/**
 * 添加token到分组
 */
const addTokenToSelectedGroup = (groupId, tokenId) => {
  tokenStore.addTokenToGroup(groupId, tokenId);
  message.success("已将token添加到分组");
};

/**
 * 从分组移除token
 */
const removeTokenFromSelectedGroup = (groupId, tokenId) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  message.success("已将token从分组移除");
};

/**
 * 获取分组中有效的token ID列表（用于模板中展示）
 */
const getValidGroupTokenIds = (groupId) => {
  return tokenStore.getValidGroupTokenIds(groupId);
};

/**
 * 获取分组中的token列表
 */
const getGroupTokenList = (groupId) => {
  const tokenIds = tokenStore.getValidGroupTokenIds(groupId);
  return tokens.value.filter((t) => tokenIds.includes(t.id));
};

// 注: pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 已从 @/utils/batch 导入

const addLog = (log) => {
  // 添加日志数据到数组
  logs.value.push(log);

  // 限制logs数组大小，防止内存占用过大
  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }

  // 只有在启用自动滚动时才执行滚动
  if (autoScrollLog.value && logContainer.value) {
    try {
      // 使用nextTick确保DOM已更新
      nextTick(() => {
        // 检查自动滚动是否仍然启用
        if (logContainer.value && autoScrollLog.value === true) {
          // 滚动到底部
          logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
      });
    } catch (error) {
      // 忽略DOM操作错误，确保日志数据仍然被记录
      console.warn("Failed to scroll log container:", error);
    }
  }
};

watch(autoScrollLog, (newValue, oldValue) => {
  console.log(`[自动滚动] 状态变化: ${oldValue} -> ${newValue}`);
  
  // 如果用户从开启变为关闭，标记为用户手动关闭
  if (oldValue === true && newValue === false) {
    userManuallyDisabledScroll.value = true;
    console.log('[自动滚动] 用户手动关闭自动滚动');
  }
  // 如果用户从关闭变为开启，清除手动关闭标记
  else if (oldValue === false && newValue === true) {
    userManuallyDisabledScroll.value = false;
    console.log('[自动滚动] 用户手动开启自动滚动');
  }
  
  if (newValue && logContainer.value) {
    nextTick(() => {
      try {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
        console.log('[自动滚动] 启用后自动滚动到底部');
      } catch (error) {
        // 忽略DOM操作错误
        console.warn("Failed to scroll log container:", error);
      }
    });
  } else if (!newValue) {
    console.log('[自动滚动] 已禁用，取消自动滚动');
  }
});

// 监听filterErrorsOnly变化，防止在切换过滤时触发自动滚动
watch(filterErrorsOnly, (newValue, oldValue) => {
  console.log(`[只看错误] 状态变化: ${oldValue} -> ${newValue}`);
  // 如果自动滚动已禁用，确保不会因为DOM更新而滚动
  if (!autoScrollLog.value && logContainer.value) {
    // 保存当前滚动位置
    const currentScrollTop = logContainer.value.scrollTop;
    nextTick(() => {
      // 恢复滚动位置，防止自动滚动
      if (logContainer.value && !autoScrollLog.value) {
        logContainer.value.scrollTop = currentScrollTop;
        console.log('[只看错误] 切换过滤时保持滚动位置');
      }
    });
  }
});

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error("复制日志失败: " + err.message);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("日志已清空");
};

const waitForConnection = async (
  tokenId,
  timeout = batchSettings.connectionTimeout,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected") return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// ========== 连接池管理 ==========
// 连接池：控制并发连接数（信号量模式，实际WS生命周期由调用方管理）
const wsPool = new WebSocketPool({
  poolSize: batchSettings.maxActive,
  connectionInterval: 300,
});

// 兼容性对象：保持 connectionQueue.active 供日志显示
const connectionQueue = {
  get active() { return wsPool.activeCount; }
};

const waitForConnectionSlot = async (timeout = 60000) => {
  // 通用槽位等待（无tokenId时使用默认标识）
  await wsPool.acquire('_generic_', timeout);
};

const releaseConnectionSlot = () => {
  wsPool.release('_generic_');
};

/**
 * 流式执行器：替代 Promise.all，确保同时只有 maxActive 个任务在运行
 * 当一个任务完成时立即启动下一个，避免所有任务同时排队等待连接槽
 * @param {string[]} tokenIds - Token ID 列表
 * @param {Function} processFn - 处理函数 (tokenId) => Promise
 */
const runStreaming = async (tokenIds, processFn) => {
  const maxConcurrent = batchSettings.maxActive || 5;
  const queue = [...tokenIds];
  const running = new Set();
  let completedCount = 0;

  const launchNext = () => {
    if (queue.length === 0 || shouldStop.value) return;
    const tokenId = queue.shift();
    const p = processFn(tokenId)
      .catch(() => {}) // 确保不抛出未捕获的拒绝
      .finally(() => {
        running.delete(p);
        completedCount++;
      });
    running.add(p);
  };

  // 启动初始批次
  for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
    launchNext();
  }

  // 每当一个任务完成，自动启动下一个
  while (running.size > 0) {
    await Promise.race([...running]);
    launchNext();
  }

  // 防御性检查：确保所有Token都已处理
  if (completedCount < tokenIds.length && !shouldStop.value) {
    console.warn(`[runStreaming] 完成数(${completedCount})少于总数(${tokenIds.length})，补充处理剩余Token`);
    // 找出未处理的Token（通过检查tokenStatus）
    const remaining = tokenIds.filter(id => {
      const status = tokenStatus.value[id];
      return status === 'waiting' || status === undefined;
    });
    for (const tokenId of remaining) {
      try {
        await processFn(tokenId).catch(() => {});
      } catch (e) {
        console.error(`[runStreaming] 补充处理 ${tokenId} 失败:`, e);
      }
    }
  }
};

const ensureConnection = async (tokenId, maxRetries = 3, skipSlot = false) => {
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const latestToken = tokens.value.find((t) => t.id === tokenId);
      if (!latestToken) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      // 获取连接槽位来限制并发数（skipSlot=true时由外层滚动执行控制并发）
      if (!skipSlot) {
        await waitForConnectionSlot(60000);
      }

      // 检查现有连接状态
      const connection = tokenStore.wsConnections[tokenId];
      if (connection && connection.status === 'connected') {
        return true;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `🔄 连接WebSocket: ${latestToken.name} (尝试 ${retryCount + 1}/${maxRetries})`,
        type: "info",
      });

      // 先关闭可能存在的旧连接
      if (connection) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `🔌 关闭旧连接: ${latestToken.name}`,
          type: "info",
        });
        tokenStore.closeWebSocketConnection(tokenId);
        // 等待一小段时间确保连接完全关闭
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 创建新的WebSocket连接
      const wsClient = tokenStore.createWebSocketConnection(
        tokenId,
        latestToken.token,
        latestToken.wsUrl,
      );

      if (!wsClient) {
        throw new Error('创建WebSocket客户端失败');
      }

      // 等待连接建立
      const connected = await waitForConnection(tokenId);

      if (connected) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ WebSocket连接成功: ${latestToken.name}`,
          type: "info",
        });

        // 连接成功后延迟3-5秒，确保连接稳定
        const connectionDelay = 3000 + Math.random() * 2000; // 3-5秒随机延迟
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏱️ 等待连接稳定 (${(connectionDelay / 1000).toFixed(1)}秒)...`,
          type: "info",
        });
        await new Promise(resolve => setTimeout(resolve, connectionDelay));

        // Initialize Game Data (Critical for Battle Version and Session)
        try {
          // Fetch Role Info first (Standard flow)
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            5000,
          );

          // Fetch Battle Version
          const res = await tokenStore.sendMessageWithPromise(
            tokenId,
            "fight_startlevel",
            {},
            5000,
          );
          if (res?.battleData?.version) {
            tokenStore.setBattleVersion(res.battleData.version);
          }
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `初始化数据失败: ${e.message}`,
            type: "warning",
          });
        }

        return true;
      }

      throw new Error('连接超时');

    } catch (error) {
      lastError = error;
      retryCount++;
      
      // 释放连接槽位
      if (!skipSlot) {
        releaseConnectionSlot();
      }
      
      // 关闭可能存在的连接
      tokenStore.closeWebSocketConnection(tokenId);
      
      if (retryCount < maxRetries) {
        // 阶梯退避：第1次等30秒，第2次等1分钟，第3次等3分钟
        let waitTime;
        if (retryCount === 1) {
          waitTime = 30000; // 第一次重试等待30秒
        } else if (retryCount === 2) {
          waitTime = 60000; // 第二次重试等待1分钟
        } else {
          waitTime = 180000; // 第三次重试等待3分钟
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 连接失败，${waitTime >= 60000 ? (waitTime / 60000) + '分钟' : (waitTime / 1000) + '秒'}后重试: ${error.message}`,
          type: "warning",
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 3次重试全部失败，直接停止
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `❌ 连接失败，已重试${maxRetries}次，停止任务: ${error.message}`,
          type: "error",
        });
      }
    }
  }
  
  // 所有重试都失败
  throw new Error(`WebSocket连接失败: ${lastError?.message || '未知错误'}`);
};

const createTaskDeps = () => ({
  selectedTokens,
  tokens,
  tokenStatus,
  isRunning,
  shouldStop,
  ensureConnection,
  releaseConnectionSlot,
  runStreaming,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog,
  message,
  currentRunningTokenId,
  // 延迟配置
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 功能模块延迟配置
  moduleDelays: batchSettings.moduleDelays,
  // 获取模块延迟的辅助函数
  getModuleDelay: (moduleName) => {
    const md = batchSettings.moduleDelays;
    if (md) return md[moduleName] || md.default || batchSettings.taskDelay || 1000;
    return batchSettings.taskDelay || 1000;
  },
  // 其他特定依赖
  logs,
  logContainer,
  autoScrollLog,
  nextTick,
  shouldSendCar,
  canClaim,
  normalizeCars,
  gradeLabel,
  // 设置相关
  currentSettings,
  helperSettings,
  // 功法赠送相关
  recipientIdInput,
  recipientInfo,
  securityPassword,

  // 竞技场相关辅助函数
  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 配置加载函数
  loadSettings,
});

// 初始化任务模块
const tasksHangUp = createTasksHangUp(createTaskDeps());
const { claimHangUpRewards, batchAddHangUpTime, batchStudy, batchclubsign, batchWarGuessCheer } = tasksHangUp;

const tasksBottle = createTasksBottle(createTaskDeps());
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = createTasksTower(createTaskDeps());
const { climbTower, climbWeirdTower, batchClaimFreeEnergy, skinChallenge, skinTreasure, batchUseItems, batchMergeItems } = tasksTower;

const tasksCar = createTasksCar(createTaskDeps());
const { batchSmartSendCar, batchClaimCars, batchCarResearchUpgrade } = tasksCar;

const tasksItem = createTasksItem(createTaskDeps());
const {
  batchOpenBox,
  batchOpenBoxByPoints,
  batchOpenFragmentPacks,
  batchOpenDiamondBox,
  batchClaimBoxWeeklyRewards,
  batchClaimBoxPointReward,
  batchFish,
  batchRecruit,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchFishUpgrade,
  batchClaimStarRewards,
  batchClaimPeachTasks,
  batchGenieSweep,
  heroFourSaintsUpgrade,
  batchConsumeActivity,
  batchClaimConsumeRewards,
  batchAutumnUseItem,
  batchUseActivityItem,
  batchClaimCdkReward,
  batchActivityExchange,
  batchClaimApexRewards,
  batchCollectionActivate,
  batchPushMap,
} = tasksItem;

// 推图状态检测与模态框
const showPushMapModal = ref(false);
const isAnyPushRunning = ref(false);
// 持久化推图选中账号（切换页面后恢复）
const _savedPushTokens = localStorage.getItem('pushSelectedTokens');
const pushSelectedTokens = ref(_savedPushTokens ? JSON.parse(_savedPushTokens) : []);
// 监听变化自动持久化
watch(pushSelectedTokens, (v) => {
  localStorage.setItem('pushSelectedTokens', JSON.stringify(v));
}, { deep: true });
const pushTorchType = ref(0);
// 同步火把类型到全局
watch(pushTorchType, (v) => { window._pushTorchType = v; }, { immediate: true });
const pushTorchCount = ref(10);
// 同步火把数量到全局
watch(pushTorchCount, (v) => { window._pushTorchCount = v; }, { immediate: true });

// 手动使用火把
const pushUseTorchManual = async () => {
  if (!pushTorchType.value || !pushSelectedTokens.value.length) return;
  if (typeof window._bpUseTorch === "function") {
    for (const id of pushSelectedTokens.value) {
      await window._bpUseTorch(id);
    }
  }
};

const pushLogs = ref([]);
const pushCards = ref([]);
let _pushCheckTimer = null;

// 账号选项（只显示已连接的）
const pushTokenOptions = computed(() => {
  const tkList = tokens.value;
  if (!tkList || !Array.isArray(tkList)) return [];
  return tkList.map(t => {
    const st = tokenStore.getWebSocketStatus(t.id);
    const tag = st === "connected" ? " ✅" : st === "connecting" ? " ⏳" : " ⚪";
    return { label: (t.name || t.id) + tag, value: t.id };
  });
});

// 打开推图模态框时自动恢复状态
watch(showPushMapModal, (v) => {
  if (v) {
    // 恢复正在运行的推图状态
    if (window._pt) {
      const runningIds = Object.keys(window._pt).filter(id => window._pt[id] && window._pt[id].running);
      if (runningIds.length > 0) {
        // 合并已运行的Token到选中列表
        const merged = new Set([...pushSelectedTokens.value, ...runningIds]);
        pushSelectedTokens.value = [...merged];
      }
    }
    // 如果没有选中且全局有选中Token，使用全局的
    if (!pushSelectedTokens.value.length && selectedTokens.value?.length) {
      pushSelectedTokens.value = [...selectedTokens.value];
    }
  }
});

// 推图日志回调（由tasksItem.js的pushLoop调用）
window._pushLog = (msg, type) => {
  pushLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    text: msg,
    type: type || "info",
  });
  if (pushLogs.value.length > 300) pushLogs.value.length = 300;
};

// 打开模态框回调
window._openPushModal = () => {
  showPushMapModal.value = true;
};

// 刷新卡片状态
const _refreshPushCards = () => {
  if (!window._pt) return;
  const ids = pushSelectedTokens.value || [];
  const getBoss = window._getBoss || (() => "");
  pushCards.value = ids.map(id => {
    const st = window._pt[id] || {};
    const tk = tokens.value.find(t => t.id === id);
    return {
      id, name: tk ? tk.name : id,
      running: !!st.running, level: st.level || 0,
      wins: st.wins || 0, losses: st.losses || 0,
      countdown: st.countdown || 0, totalTime: st.totalTime || 0,
      bossNm: getBoss(st.level || 0),
    };
  });
};

// 定时刷新状态
const _startPushCheck = () => {
  if (_pushCheckTimer) return;
  _pushCheckTimer = setInterval(() => {
    if (!window._pt) { isAnyPushRunning.value = false; return; }
    isAnyPushRunning.value = pushSelectedTokens.value.some(id => window._pt[id] && window._pt[id].running);
    if (showPushMapModal.value) _refreshPushCards();
  }, 1500);
};
_startPushCheck();

// 全部开始（错开启动避免限流：每个账号间隔3秒 + 随机延迟）
const pushStartAll = async () => {
  const ids = pushSelectedTokens.value;
  if (!ids || !ids.length) return;
  if (!window._pt) window._pt = {};
  if (window._bpLoadBossData) await window._bpLoadBossData();

  // 使用_bpStartOne（内含自动连接逻辑），错开启动避免瞬时并发
  if (window._bpStartOne) {
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      if (!window._pt || !window._pt[id] || !window._pt[id].running) {
        window._bpStartOne(id);
        // 基础间隔3秒 + 随机延迟0~2秒，错开每个账号的执行
        const staggerDelay = 3000 + Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, staggerDelay));
      }
    }
  }
};

// 全部停止
const pushStopAll = () => {
  const ids = pushSelectedTokens.value;
  if (!ids || !window._pt) return;
  ids.forEach(id => {
    if (window._bpStopOne) window._bpStopOne(id);
    else if (window._pt[id]) window._pt[id].stopFlag = true;
  });
};

// 单个切换
const pushToggleOne = (id) => {
  if (!window._pt) window._pt = {};
  if (window._pt[id] && window._pt[id].running) {
    if (window._bpStopOne) window._bpStopOne(id);
    else window._pt[id].stopFlag = true;
  } else {
    if (window._bpStartOne) window._bpStartOne(id);
    else if (window._bpPushLoop) window._bpPushLoop(id);
  }
};

const tasksDungeon = createTasksDungeon(createTaskDeps());
const { batchbaoku13, batchbaoku45, batchmengjing, batchBuyDreamItems } = tasksDungeon;

const tasksArena = createTasksArena(createTaskDeps());
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = createTasksStore(createTaskDeps());
const { legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, manual_buy, charge_claimaddup_rewards, collection_claimfreereward, claim_recruit_welfare, claim_weird_tower_all, claim_weird_tower_pass, use_spotted_egg, claim_pet_book, batch_pet_merge, batch_pet_upgrade, gacha_drawreward, store_buy_bronze, store_buy_platinum, store_buy_gold_rod, store_buy_jade, store_buy_selectable, legion_buy_red_jade, legion_buy_spotted_egg, salt_crystal_shop_buy, saltCrystalShopConfig, salt_ingot_shop_buy, saltIngotShopConfig, star_drawturntable, batch_star_challenge, nightmare_draw_lottery, nightmare_claim_book_reward, pkroom_appoint, claim_guess_coin, legion_buy_store_items, weeklyMarketBuy, weekly_market_free_gift, buy_top_rod_package, buy_super_spirit_shell, batch_mail_claim_and_cleanup } = tasksStore;

// ====== 采购清单配置 ======
// 采购清单可选项（用于任务模板中多选）
// goodsId: store_buy 使用的商品ID（从 store_goodslist 获取）
// itemId: 采购清单使用的物品ID（用于 store_setpurchase）
const purchaseItemOptions = [
  // 宝箱类
  { goodsId: 1, itemId: 2002, name: '青铜宝箱' },
  { goodsId: 2, itemId: 2003, name: '黄金宝箱' },
  { goodsId: 3, itemId: 2004, name: '铂金宝箱' },
  // 材料类
  { goodsId: 4, itemId: 1003, name: '进阶石' },
  { goodsId: 5, itemId: 1006, name: '精铁' },
  { goodsId: 6, itemId: 1001, name: '招募令' },
  // 武将碎片类
  { goodsId: 7, itemId: 3007, name: '随机红将碎片' },
  { goodsId: 8, itemId: 3006, name: '随机橙将碎片' },
  { goodsId: 9, itemId: 3005, name: '随机紫将碎片' },
  // 特殊类
  { goodsId: 10, itemId: 1016, name: '梦魇晶石' },
  // 鱼竿类
  { goodsId: 11, itemId: 1011, name: '普通鱼竿' },
  { goodsId: 12, itemId: 1012, name: '黄金鱼竿' },
  // 活动类
  { goodsId: 13, itemId: 1030, name: '咸神门票' },
  // 玉石类
  { goodsId: 14, itemId: 1022, name: '白玉' },
  { goodsId: 15, itemId: 1023, name: '彩玉' },
  // 材料类
  { goodsId: 16, itemId: 1026, name: '扳手' },
];

// 多选购买 Modal State
const showManualBuyModal = ref(false);
const manualBuyConfig = ref([]);

const openManualBuyModal = () => {
  // 从已保存的配置恢复勾选状态
  const savedItems = batchSettings.manualBuyItems || [];
  manualBuyConfig.value = purchaseItemOptions.map(item => {
    const saved = savedItems.find(s => s.goodsId === item.goodsId);
    return {
      ...item,
      _checked: !!saved && saved.count > 0,
      count: saved ? saved.count : 0,
    };
  });
  showManualBuyModal.value = true;
};

const executeManualBuy = () => {
  const selectedItems = manualBuyConfig.value
    .filter(item => item._checked && item.count > 0)
    .map(item => ({
      goodsId: item.goodsId,
      name: item.name,
      count: item.count,
    }));
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 保存配置到 batchSettings，供定时任务使用
  batchSettings.manualBuyItems = selectedItems;
  saveBatchSettings();
  
  showManualBuyModal.value = false;
  store_buy_selectable(selectedItems);
};

// 采购清单 checkbox 切换辅助函数
const togglePurchaseItem = (arr, discounts, itemId) => {
  const idx = arr.indexOf(itemId);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(itemId);
    // 勾选时确保折扣值存在
    if (!discounts) discounts = {};
    if (discounts[itemId] == null) discounts[itemId] = 10;
  }
};

// 确保采购清单折扣全部初始化（返回新对象触发响应式更新）
const initPurchaseDiscounts = (discounts) => {
  const result = { ...(discounts || {}) };
  purchaseItemOptions.forEach(item => {
    if (result[item.goodsId] == null) result[item.goodsId] = 10;
  });
  return result;
};

// 获取折扣值（始终返回数字，避免 undefined 导致 n-input-number 显示空白）
const getDiscount = (discounts, itemId) => {
  return discounts?.[itemId] ?? 10;
};

// 设置折扣值（显式赋值确保响应式更新）
const setDiscount = (discounts, itemId, val) => {
  const num = (val != null && val !== '') ? Number(val) : 10;
  discounts[itemId] = Math.max(1, Math.min(10, isNaN(num) ? 10 : num));
};

// 同步采购清单到游戏
const syncPurchaseBusy = ref(false);
const syncPurchaseToGame = async () => {
  const tokenId = currentSettingsTokenId.value;
  if (!tokenId) return;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    message.warning('该账号WebSocket未连接，请先连接后再同步');
    return;
  }
  const purchaseList = currentSettings.purchaseList || [];
  if (purchaseList.length === 0) {
    message.warning('请先勾选采购商品');
    return;
  }
  syncPurchaseBusy.value = true;
  try {
    const discounts = currentSettings.purchaseDiscounts || {};
    const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
    const purchaseCnt = currentSettings.purchaseCnt ?? 15;
    await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
    message.success(`采购清单已同步到游戏 (${purchaseItemList.length}项, 次数${purchaseCnt})`);
  } catch (e) {
    message.error(`同步失败: ${e.message}`);
  } finally {
    syncPurchaseBusy.value = false;
  }
};

// 同步采购清单到勾选的账号（自动连接）
const batchSyncPurchaseToGame = async () => {
  if (selectedTokens.value.length === 0) return;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    // 读取该账号的日常设置
    let settings = null;
    try {
      const raw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}

    const purchaseList = settings?.purchaseList || [];
    if (purchaseList.length === 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未配置采购清单，跳过`, type: "info" });
      skipCount++;
      continue;
    }

    try {
      // 自动连接
      await ensureConnection(tokenId);
      await new Promise(r => setTimeout(r, 2000));

      const discounts = settings.purchaseDiscounts || {};
      const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
      const purchaseCnt = settings.purchaseCnt ?? 15;
      await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步成功 (${purchaseItemList.length}项, 次数${purchaseCnt})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步失败: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 连接已关闭 (队列: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
    }
  }

  const summary = `同步完成: 成功${successCount}个, 跳过${skipCount}个, 失败${failCount}个`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
};

// ====== 批量采购清单配置弹窗 ======
const showBatchPurchaseConfigModal = ref(false);
const batchPurchaseList = ref([]);
const batchPurchaseDiscounts = ref({});
const batchPurchaseCnt = ref(15);
const batchPurchaseSyncing = ref(false);

// 打开弹窗：从第一个勾选账号读取现有配置作为默认值
const openBatchPurchaseConfig = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先勾选账号');
    return;
  }
  // 从第一个账号读取现有配置
  const firstTokenId = selectedTokens.value[0];
  try {
    const raw = localStorage.getItem(`daily-settings:${firstTokenId}`);
    if (raw) {
      const settings = JSON.parse(raw);
      batchPurchaseList.value = [...(settings.purchaseList || [])];
      batchPurchaseDiscounts.value = initPurchaseDiscounts(settings.purchaseDiscounts);
      batchPurchaseCnt.value = settings.purchaseCnt ?? 15;
    } else {
      batchPurchaseList.value = [];
      batchPurchaseDiscounts.value = initPurchaseDiscounts({});
      batchPurchaseCnt.value = 15;
    }
  } catch (e) {
    batchPurchaseList.value = [];
    batchPurchaseDiscounts.value = initPurchaseDiscounts({});
    batchPurchaseCnt.value = 15;
  }
  showBatchPurchaseConfigModal.value = true;
};

// 保存并同步采购清单到所有勾选账号
const applyBatchPurchaseConfig = async () => {
  if (batchPurchaseList.value.length === 0) {
    message.warning('请先勾选至少一个采购商品');
    return;
  }
  showBatchPurchaseConfigModal.value = false;
  batchPurchaseSyncing.value = true;

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    // 1. 保存到该账号的 localStorage
    try {
      let settings = {};
      try {
        const raw = localStorage.getItem(`daily-settings:${tokenId}`);
        if (raw) settings = JSON.parse(raw);
      } catch (e) {}
      settings.purchaseList = [...batchPurchaseList.value];
      settings.purchaseDiscounts = { ...batchPurchaseDiscounts.value };
      settings.purchaseCnt = batchPurchaseCnt.value;
      settings.blackMarketPurchase = true;
      localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 保存采购清单到本地失败: ${e.message}`, type: "warning" });
    }

    // 2. 自动连接并同步到游戏
    try {
      await ensureConnection(tokenId);
      await new Promise(r => setTimeout(r, 2000));

      const purchaseItemList = batchPurchaseList.value.map(id => ({
        itemId: id,
        discount: batchPurchaseDiscounts.value[id] ?? 10,
      }));
      await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', {
        purchaseItemList,
        purchaseCnt: batchPurchaseCnt.value,
      }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步成功 (${purchaseItemList.length}项, 次数${batchPurchaseCnt.value})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 采购清单同步失败: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
    }
  }

  const summary = `采购清单同步完成: 成功${successCount}个, 失败${failCount}个`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
  batchPurchaseSyncing.value = false;
};

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyHangup, batchLegacyGiftSendEnhanced, batchLegacyClaimGiftTask } = tasksLegacy;

// ====== 十殿阎罗挑战（弹窗打开组队界面） ======
const showNightmareChallengeModal = ref(false);
const showStarTeamModal = ref(false);
const batchNightmareChallenge = async () => {
  // 当未勾选账号时直接打开弹窗，由十殿卡片内的队长下拉框选择队长
  if (selectedTokens.value.length === 0) {
    showNightmareChallengeModal.value = true;
    return;
  }
  // 勾选了多个账号时提示只选一个
  if (selectedTokens.value.length > 1) { message.warning("请只选择一个队长执行"); return; }
  const tokenId = selectedTokens.value[0];
  // 自动连接
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    tokenStore.selectToken(tokenId, true);
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 30) {
      await new Promise((r) => setTimeout(r, 500)); retries++;
    }
  }
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    message.error("WebSocket连接失败，无法打开十殿挑战");
    return;
  }
  // 根据账号设置自动切换十殿阵容
  try {
    const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      const nmFormation = settings.nightmareFormation;
      if (nmFormation && nmFormation >= 1 && nmFormation <= 6) {
        await tokenStore.sendMessageWithPromise(
          tokenId, 'presetteam_saveteam',
          { teamId: nmFormation }, 8000);
        message.success(`已切换到十殿阵容${nmFormation}`);
      }
    }
  } catch (err) {
    // 切换失败不阻塞，静默处理
    console.warn('十殿阵容切换失败:', err);
  }
  // 打开组队弹窗
  showNightmareChallengeModal.value = true;
};

// ====== 定时任务：十殿阎罗挑战（根据勾选预设执行） ======
const batchNightmareChallengePresets = async (silent) => {
  // silent 参数兼容定时任务调用，此处不使用
  const nmTask = currentScheduledTask;
  const presetIds = nmTask?.nightmarePresetIds || [];
  if (presetIds.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '十殿挑战：未配置预设，跳过', type: 'warning' });
    return;
  }

  // 加载全部预设
  let allPresets = [];
  try {
    const raw = localStorage.getItem('nightmare-presets');
    allPresets = raw ? JSON.parse(raw) : [];
  } catch { allPresets = []; }

  // 过滤出选中的预设
  const presets = allPresets.filter(p => presetIds.includes(p.id));
  if (presets.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '十殿挑战：选中的预设不存在，跳过', type: 'warning' });
    return;
  }

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 十殿阎罗挑战：开始执行 ${presets.length} 个预设 ===`, type: 'info' });

  // 构建队员使用计数（用于共享队员检测 + 延迟断连）
  const memberUsageCount = new Map(); // tokenId → 使用该队员的预设数量
  const memberLastPresetIndex = new Map(); // tokenId → 最后使用该队员的预设索引
  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const allIds = [p.captainTokenId, ...(p.memberTokenIds || [])].filter(Boolean);
    for (const tid of allIds) {
      memberUsageCount.set(tid, (memberUsageCount.get(tid) || 0) + 1);
      memberLastPresetIndex.set(tid, idx); // 不断更新，最终值为最后使用的索引
    }
  }

  // 检测共享队长（严重冲突）
  const captainIds = presets.map(p => p.captainTokenId).filter(Boolean);
  const duplicateCaptains = captainIds.filter((id, i) => captainIds.indexOf(id) !== i);
  if (duplicateCaptains.length > 0) {
    const names = [...new Set(duplicateCaptains)].map(id => tokenStore.gameTokens.find(t => t.id === id)?.name || id.slice(0, 8));
    addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 多个预设使用相同队长: ${names.join('、')}，后续预设将自动跳过`, type: 'warning' });
  }

  // 收集需要跳过的重复队长预设索引（仅保留第一个，跳过后续）
  const skipDuplicateCaptainPresets = new Set();
  if (duplicateCaptains.length > 0) {
    const seenCaptains = new Set();
    for (let idx = 0; idx < captainIds.length; idx++) {
      const cid = captainIds[idx];
      if (duplicateCaptains.includes(cid)) {
        if (seenCaptains.has(cid)) {
          skipDuplicateCaptainPresets.add(idx);
        } else {
          seenCaptains.add(cid);
        }
      }
    }
  }

  // 检测共享队员（可能导致前预设战斗异常）
  const sharedMembers = [...memberUsageCount.entries()]
    .filter(([tid, count]) => count > 1 && !duplicateCaptains.includes(tid))
    .map(([tid]) => tokenStore.gameTokens.find(t => t.id === tid)?.name || tid.slice(0, 8));
  if (sharedMembers.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 以下队员被多个预设共享: ${sharedMembers.join('、')}，加入新房间后可能从前一个房间被移除`, type: 'warning' });
  }

  // 输出预设概览
  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const capName = tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '未知';
    const memberNames = (p.memberTokenIds || []).map(mid => tokenStore.gameTokens.find(t => t.id === mid)?.name || mid.slice(0, 8)).join('、') || '无';
    const totalCount = (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length;
    addLog({ time: new Date().toLocaleTimeString(), message: `  预设${idx + 1}:「${p.name || '未命名'}」👑${capName} 👥${totalCount}人(队员: ${memberNames})`, type: 'info' });
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const activeBattles = [];
  _activeNightmareBattles = activeBattles; // ✅ 暴露给模块级，便于外层超时传导停止
  const MAX_RETRY = 2; // 每个预设最多重试2次
  const retryCountMap = new Map(); // presetId → 重试次数

  // 初始化 sessionStorage（清除上次的批量数据）
  try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }

  // ====== 单预设执行函数（初始执行和重试共用） ======
  const executeOnePreset = async (preset, label, presetIndex = -1) => {
    const captainTokenId = preset.captainTokenId;
    const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId);
    if (!captainToken) {
      addLog({ time: new Date().toLocaleTimeString(), message: `预设「${preset.name}」队长Token不存在，跳过`, type: 'warning' });
      return null;
    }

    addLog({ time: new Date().toLocaleTimeString(), message: `▶ ${label} 队长: ${captainToken.name}`, type: 'info' });

    // 1. 确保队长连接
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `连接队长 ${captainToken.name}...`, type: 'info' });
      await tokenStore.createWebSocketConnection(captainTokenId, captainToken.token, captainToken.wsUrl || null);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected' && retries < 30) {
        await delay(1000);
        retries++;
      }
    }
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `队长 ${captainToken.name} 连接失败，跳过预设`, type: 'error' });
      return null;
    }

    // 2. 获取队长 roleId
    let captainRoleId = '';
    try {
      const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId, {});
      captainRoleId = String(roleInfo?.role?.roleId || '');
      if (!captainRoleId) {
        addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 失败，跳过预设`, type: 'error' });
        return null;
      }
    } catch (err) {
      addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 异常: ${err.message || err}，跳过`, type: 'error' });
      return null;
    }

    // 3. 检查现有队伍和战斗房间
    let teamId = '';
    let hasActiveBattle = false;
    let existingRoomId = null;

    // 3a. 先检查是否已有活跃后台战斗（防止重复启动同一队长的战斗）
    const alreadyRunning = activeBattles.find(b =>
      b.preset.captainTokenId === captainTokenId &&
      (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')
    );
    if (alreadyRunning) {
      addLog({ time: new Date().toLocaleTimeString(), message: `队长 ${captainToken.name} 已有后台战斗「${alreadyRunning.preset.name}」运行中，跳过`, type: 'warning' });
      return null;
    }

    // 3b. 查询队长是否有队伍
    let existingTeamId = null;
    try {
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'matchteam_getroleteaminfo',
        { roleID: Number(captainRoleId) }, 10000
      );
      existingTeamId = roleTeamRes?.teamInfo?.teamId;
    } catch { /* 无队伍 */ }

    // 3c. 独立检查是否有进行中的战斗房间（无论是否有队伍）
    try {
      const nightResp = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'nightmare_getroleinfo',
        { roleId: Number(captainRoleId) }, 10000
      );
      existingRoomId = nightResp?.nightMareData?.roomId
        || nightResp?.nightmareData?.roomId
        || nightResp?.roomId
        || nightResp?.roomid
        || null;
    } catch { /* 没有战斗房间 */ }

    if (existingRoomId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `✅ 发现进行中的战斗 RoomId: ${existingRoomId}，接管继续挑战`, type: 'success' });
      teamId = existingTeamId ? String(existingTeamId) : '';
      hasActiveBattle = true;
    } else if (existingTeamId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `发现过期残留队伍 TeamId: ${existingTeamId}，正在解散...`, type: 'warning' });
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_dismiss',
          { teamId: Number(existingTeamId) }, 10000
        );
        addLog({ time: new Date().toLocaleTimeString(), message: '残留队伍已解散', type: 'success' });
      } catch (dismissErr) {
        const errMsg = dismissErr.message || String(dismissErr);
        if (!errMsg.includes('200020') && !errMsg.includes('6100020')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `解散失败: ${errMsg}，跳过`, type: 'error' });
          return null;
        }
      }
      await delay(1000);
    }

    // 4. 创建房间（如果没有活跃战斗）
    if (!hasActiveBattle) {
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_getrandteamlist',
          { teamCfgId: 1, param: 0, custom: {} }, 10000
        );
        const createResp = await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_create',
          {
            teamCfgId: 1,
            setting: { name: '十殿先锋队', notice: '', secret: 1, apply: 0, applyList: [] },
            param: 0, custom: {}, extParam: 0,
          }, 10000
        );
        teamId = String(createResp?.teamInfo?.teamId || '');
        if (!teamId) {
          addLog({ time: new Date().toLocaleTimeString(), message: '创建房间失败，跳过预设', type: 'error' });
          return null;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `房间创建成功 TeamId: ${teamId}`, type: 'success' });
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `创建房间异常: ${err.message || err}，跳过`, type: 'error' });
        return null;
      }
      await delay(3000);
    }

    // 5. 队员加入并准备
    const memberTokenIds = (preset.memberTokenIds || []).slice(0, 4)
      .filter(tid => tokenStore.gameTokens.some(t => t.id === tid));

    if (!hasActiveBattle && memberTokenIds.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `队员加入并准备 (${memberTokenIds.length}人)...`, type: 'info' });
      const alreadyJoined = new Set();

      for (const tid of memberTokenIds) {
        const token = tokenStore.gameTokens.find(t => t.id === tid);
        const name = token ? token.name : tid.slice(0, 8);

        if (tokenStore.getWebSocketStatus(tid) !== 'connected') {
          tokenStore.createWebSocketConnection(tid, token.token, token.wsUrl || null).catch(() => {});
          let retries = 0;
          while (tokenStore.getWebSocketStatus(tid) !== 'connected' && retries < 20) {
            await delay(1000);
            retries++;
          }
        }
        if (tokenStore.getWebSocketStatus(tid) !== 'connected') {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 连接失败，跳过该成员`, type: 'warning' });
          continue;
        }

        try {
          if (preset.usePresetTeam !== false && preset.teamSlots?.[tid]) {
            const slot = preset.teamSlots[tid];
            try {
              await tokenStore.sendMessageWithPromise(
                tid, 'presetteam_saveteam', { teamId: slot }, 8000
              );
              addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 已切换到阵容槽位 ${slot}`, type: 'info' });
            } catch { /* 阵容切换失败不阻塞 */ }
          }

          await tokenStore.sendMessageWithPromise(
            tid, 'matchteam_getrandteamlist',
            { teamCfgId: 1, param: 0, custom: {} }, 10000
          );

          if (!alreadyJoined.has(tid)) {
            try {
              await tokenStore.sendMessageWithPromise(
                tid, 'matchteam_join', { teamId: Number(teamId) }, 10000
              );
              alreadyJoined.add(tid);
            } catch (joinErr) {
              const joinMsg = joinErr.message || String(joinErr);
              if (joinMsg.includes('7100020')) {
                alreadyJoined.add(tid);
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 加入房间失败: ${joinMsg}`, type: 'warning' });
                continue;
              }
            }
          }
          await delay(1000);

          await tokenStore.sendMessageWithPromise(
            tid, 'matchteam_memberprepare', { teamId: Number(teamId) }, 10000
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 加入并准备成功`, type: 'success' });
        } catch (err) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 操作失败: ${err.message || err}`, type: 'warning' });
        }

        // BUG2修复：共享队员延迟断连 - 如果后续预设还需要该队员，不断开连接
        const isSharedMember = memberUsageCount.get(tid) > 1;
        const lastPresetIdx = memberLastPresetIndex.get(tid) ?? -1;
        if (isSharedMember && presetIndex >= 0 && presetIndex < lastPresetIdx) {
          // 后续预设还需要该队员，保持连接（避免从前预设房间被移除）
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 共享队员，保持连接供后续预设使用`, type: 'info' });
        } else {
          try { await tokenStore.closeWebSocketConnection(tid); } catch { /* ignore */ }
        }
        await delay(500);
      }
    }

    // 6. 获取 RoomId
    addLog({ time: new Date().toLocaleTimeString(), message: '开始战斗，获取 RoomId...', type: 'info' });
    let roomId = existingRoomId;

    if (!roomId) {
      try {
        const openResp = await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_openteam',
          { teamId: Number(teamId) }, 10000
        );
        roomId = openResp?.roomId || openResp?.roomid || openResp?.roomInfo?.roomId || null;
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `开启房间失败: ${err.message || err}`, type: 'error' });
        return null;
      }

      if (!roomId && captainRoleId) {
        for (let attempt = 1; attempt <= 10; attempt++) {
          try {
            const resp = await tokenStore.sendMessageWithPromise(
              captainTokenId, 'nightmare_getroleinfo',
              { roleId: Number(captainRoleId) }, 10000
            );
            roomId = resp?.nightMareData?.roomId || resp?.nightmareData?.roomId || resp?.roomId || resp?.roomid || null;
            if (roomId) break;
            await delay(3000);
          } catch { await delay(3000); }
        }
      }
    }

    if (!roomId) {
      addLog({ time: new Date().toLocaleTimeString(), message: '无法获取 RoomId，跳过预设', type: 'error' });
      return null;
    }

    // 7. 启动后台战斗服务
    addLog({ time: new Date().toLocaleTimeString(), message: `RoomId: ${roomId}，启动后台战斗服务`, type: 'info' });

    const battleEntry = { preset, battle: null, roomId, teamId, status: 'running', currentLevel: 0, failReason: null, originalIndex: i };

    const battle = new NightmareAutoBattleService({
      captainTokenId,
      roomId,
      teamId,
      presetData: preset,
      captainRoleId,
      tokenStore,
      activeBattles,
      onLog: (msg, type) => addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] ${msg}`, type: type || 'info' }),
      onStatusChange: (info) => {
        if (battleEntry) {
          battleEntry.status = info.status;
          if (info.currentLevel !== undefined) battleEntry.currentLevel = info.currentLevel;
          if (info.reason) battleEntry.failReason = info.reason;
          // ✅ 处理 teamId 变更（_reopenRoom 7100020 重试重建队伍后）
          if (info.teamId) battleEntry.teamId = String(info.teamId);
        }
        if (info.status === 'running' && info.currentLevel > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 当前挑战第${info.currentLevel}关`, type: 'info' });
        }
      },
      onComplete: (result) => {
        const levelInfo = result?.level ? ` (第${result.level}关)` : '';
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${preset.name}」挑战完成${levelInfo}！`, type: 'success' });
      },
      onError: (err) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `❌ 预设「${preset.name}」战斗异常: ${err.message || err}`, type: 'error' });
      },
    });

    battleEntry.battle = battle;
    activeBattles.push(battleEntry);
    battle.start().catch(err => {
      addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 战斗启动异常: ${err.message || err}`, type: 'error' });
      console.error('[十殿阎罗] battle.start() 未捕获异常:', err);
    });

    addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${preset.name}」已在后台启动战斗`, type: 'success' });

    // BUG1修复：批量模式用数组存储所有活跃预设，避免覆盖
    try {
      const existing = JSON.parse(sessionStorage.getItem('nightmare-batch-battles') || '[]');
      existing.push({
        presetId: preset.id,
        presetName: preset.name,
        captainTokenId,
        captainRoleId,
        memberTokenIds: preset.memberTokenIds || [],
        teamSlots: preset.teamSlots || {},
        roomId: battle.getRoomId(),
        startedAt: new Date().toISOString(),
      });
      sessionStorage.setItem('nightmare-batch-battles', JSON.stringify(existing));
      // 同时保留最后一个单预设记录（兼容旧逻辑）
      sessionStorage.setItem('nightmare-last-battle-preset', JSON.stringify(existing[existing.length - 1]));
    } catch { /* ignore */ }

    return battleEntry;
  };

  // ====== 主执行循环：逐个启动预设 ======
  for (let i = 0; i < presets.length; i++) {
    if (shouldStop.value) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 收到停止信号，取消剩余 ${presets.length - i} 个预设`, type: 'warning' });
      break;
    }
    // ✅ 跳过重复队长的后续预设
    if (skipDuplicateCaptainPresets.has(i)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏭ 预设「${presets[i].name}」队长与其他预设重复，自动跳过`, type: 'warning' });
      continue;
    }
    const preset = presets[i];
    const entry = await executeOnePreset(preset, `执行预设「${preset.name}」(${i + 1}/${presets.length})`, i);
    if (!entry) continue;

    // 预设间错开延迟（避免服务器压力）
    if (i < presets.length - 1) {
      const delaySec = nmTask?.nightmarePresetDelay || 10;
      addLog({ time: new Date().toLocaleTimeString(), message: `等待${delaySec}秒后启动下一个预设...`, type: 'info' });
      await delay(delaySec * 1000);
    }
  }

  // ====== 等待所有战斗完成 + 失败重试 ======
  if (activeBattles.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `⏳ 等待 ${activeBattles.length} 个后台战斗完成...`, type: 'info' });
    const maxWait = 2 * 60 * 60 * 1000; // 2小时超时
    const startTime = Date.now();
    let reportInterval = 0;
    while (Date.now() - startTime < maxWait && !shouldStop.value) {
      // 检测失败的预设并触发重试
      const failedBattles = activeBattles.filter(b =>
        b.status === 'failed' && !b._retried
      );
      for (const fb of failedBattles) {
        const currentRetries = retryCountMap.get(fb.preset.id) || 0;
        if (currentRetries < MAX_RETRY) {
          retryCountMap.set(fb.preset.id, currentRetries + 1);
          fb._retried = true; // 标记已处理，避免重复重试
          fb.status = 'retrying'; // 标记为重试中

          const retryNum = currentRetries + 1;
          addLog({ time: new Date().toLocaleTimeString(), message: `🔄 预设「${fb.preset.name}」第${retryNum}次重试（失败原因: ${fb.failReason || '未知'}）`, type: 'warning' });

          // 确保旧战斗已完全解散（NightmareAutoBattleService 已在失败时调用 _dismissRoom）
          await delay(3000);

          // 从 activeBattles 移除旧条目（避免重复统计和 allDone 误判）
          const oldIdx = activeBattles.indexOf(fb);
          if (oldIdx !== -1) activeBattles.splice(oldIdx, 1);

          // ✅ BUG修复：等待旧 NightmareAutoBattleService 的 _dismissRoom 完成清理
          // 旧战斗在标记 failed 时调用了 _dismissRoom，但 finally 块中的异步清理可能尚未完成
          const oldBattle = fb.battle;
          if (oldBattle) {
            let cleanupWait = 0;
            while (!oldBattle._cleanupDone && cleanupWait < 10) {
              await delay(1000);
              cleanupWait++;
            }
            if (cleanupWait > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `等待旧战斗清理完成 (${cleanupWait}秒)`, type: 'info' });
            }
          }

          // 重新执行完整流程：连接队长→创建房间→队员加入→启动战斗
          // ✅ BUG修复：传递 presetIndex 确保共享队员延迟断连逻辑正确，优先使用保存的原始索引
          const retryPresetIndex = presets.findIndex(p => p.id === fb.preset.id);
          const newEntry = await executeOnePreset(
            fb.preset,
            `重试预设「${fb.preset.name}」(第${retryNum}次)`,
            fb.originalIndex >= 0 ? fb.originalIndex : retryPresetIndex
          );
          if (newEntry) {
            addLog({ time: new Date().toLocaleTimeString(), message: `✅ 预设「${fb.preset.name}」重试已启动`, type: 'success' });
            await delay(5000); // 重试后等待一会再检测
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `❌ 预设「${fb.preset.name}」重试启动失败`, type: 'error' });
          }
        } else {
          fb._retried = true; // 已达重试上限，标记避免重复检测
          addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 预设「${fb.preset.name}」已达最大重试次数(${MAX_RETRY})，不再重试`, type: 'warning' });
        }
      }

      const allDone = activeBattles.every(b =>
        b.status === 'completed' || b.status === 'failed' || b.status === 'stopped'
      );
      if (allDone) break;
      await delay(10000);
      reportInterval++;
      // 每60秒输出一次进度
      if (reportInterval >= 6) {
        reportInterval = 0;
        const running = activeBattles.filter(b => b.status === 'running');
        const done = activeBattles.filter(b => b.status === 'completed');
        const failed = activeBattles.filter(b => b.status === 'failed');
        const retrying = activeBattles.filter(b => b.status === 'retrying');
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        const runningDetail = running.map(b => `「${b.preset.name}」${b.currentLevel ? `第${b.currentLevel}关` : ''}`).join('、');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏳ 十殿挑战进行中 (${elapsed}分钟) - 运行中: ${runningDetail || '无'} | 已完成: ${done.length}个 | 失败: ${failed.length}个${retrying.length > 0 ? ` | 重试中: ${retrying.length}个` : ''}`,
          type: 'info',
        });
      }
    }
    
    // 最终汇总
    const completed = activeBattles.filter(b => b.status === 'completed');
    const failed = activeBattles.filter(b => b.status === 'failed');
    const stopped = activeBattles.filter(b => b.status === 'stopped');
    const timeout = Date.now() - startTime >= maxWait;
    const totalElapsed = Math.floor((Date.now() - startTime) / 60000);
    
    addLog({ time: new Date().toLocaleTimeString(), message: `=== 十殿阎罗挑战执行完毕 (${totalElapsed}分钟) ===`, type: 'info' });
    if (completed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `✅ 成功: ${completed.map(b => `「${b.preset.name}」`).join('、')}`, type: 'success' });
    }
    if (failed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `❌ 失败: ${failed.map(b => `「${b.preset.name}」${b.failReason ? `(${b.failReason})` : ''}`).join('、')}`, type: 'error' });
    }
    if (stopped.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 已停止: ${stopped.map(b => `「${b.preset.name}」`).join('、')}`, type: 'warning' });
    }
    if (timeout) {
      const running = activeBattles.filter(b => b.status === 'running');
      addLog({ time: new Date().toLocaleTimeString(), message: `⚠️ 超时2小时，${running.length}个预设未完成: ${running.map(b => `「${b.preset.name}」`).join('、')}`, type: 'warning' });
    }

    // 清理 sessionStorage 批量战斗数据
    try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }
    _activeNightmareBattles = []; // ✅ 清理模块级引用
  }
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // ✅ 修复：手动批量任务开始时也更新 lastTaskExecution，防止 healthCheck 误判为卡死
  lastTaskExecution = Date.now();
  // 任务开始时重置用户手动关闭标记，允许新的任务使用自动滚动
  userManuallyDisabledScroll.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // 400340重试队列：收集第一批执行中遇到400340错误的账号
  const retry400340Tokens = [];
  const MAX_400340_RETRIES = batchSettings.defaultRetryCount || 2;
  const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000;

  // 单账号执行超时保护（默认10分钟）
  const TOKEN_EXECUTION_TIMEOUT = (batchSettings.taskTimeout || 10) * 60 * 1000;

  // ========== 连接池滚动执行 ==========
  // 同步连接池大小与当前设置
  wsPool.setPoolSize(batchSettings.maxActive);
  const maxConcurrent = batchSettings.maxActive;
  const tokenQueue = [...selectedTokens.value];
  const activeTokens = new Set();
  const completionMap = new Map(); // tokenId -> Promise

  // 定义单个Token执行函数（用于连接池滚动执行）
  const executeTokenRolling = async (tokenId) => {
    if (shouldStop.value) return;

    tokenStatus.value[tokenId] = "running";

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      if (shouldStop.value) break;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId, 3, true); // skipSlot=true，由外层滚动执行控制并发

        // 等待连接稳定
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 等待连接稳定...`,
          type: "info",
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 检查活跃度
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 正在获取活跃度信息...`,
          type: "info",
        });
        
        try {
          const roleInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000
          );
          
          // 尝试多种可能的路径
          const dailyTask = roleInfo?.role?.dailyTask 
            || roleInfo?.body?.role?.dailyTask
            || roleInfo?.dailyTask
            || roleInfo?.body?.dailyTask;
          
          const activityPoints = dailyTask?.dailyPoint ?? 0;
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `📊 ${token.name} 当前活跃度: ${activityPoints}/110`,
            type: "info",
          });
          
          // 如果活跃度 >= 105，跳过日常任务
          if (activityPoints >= 105) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ ${token.name} 活跃度已达标 ${activityPoints}/110，无需执行日常任务`,
              type: "success",
            });
            success = true;
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 执行完成 ===`,
              type: "success",
            });
            continue; // 跳过后续的任务执行
          }
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🚀 ${token.name} 活跃度 ${activityPoints}，开始执行日常任务...`,
            type: "info",
          });
        } catch (error) {
          console.error("获取活跃度失败:", error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 获取活跃度失败，继续执行任务`,
            type: "warning",
          });
        }

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        }, batchSettings);  // ✅ 传入batchSettings支持高级配置

        // Run tasks
        const runnerResult = await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: (p) => {
            // 每个token维护自己的进度
          },
        });

        // 检查是否有400340错误，加入重试队列
        if (runnerResult?.has400340Error) {
          retry400340Tokens.push(tokenId);
          tokenStatus.value[tokenId] = "waiting_retry";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ ${token.name} 遇到400340服务器错误，已加入重试队列（等待第一批完成后重试）`,
            type: "warning",
          });
        }

        // 任务执行完成后，在关闭连接前获取最新的活跃度
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🔄 ${token.name} 正在获取最新角色信息...`,
            type: "info",
          });
          
          // 使用sendGetRoleInfo获取最新角色信息
          const roleInfoResp = await tokenStore.sendGetRoleInfo(tokenId);
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` ${token.name} 收到角色信息响应`,
            type: "info",
          });
          
          // 调试：输出响应结构
          console.log(`[${token.name}] roleInfoResp:`, roleInfoResp);
          console.log(`[${token.name}] roleInfoResp?.role:`, roleInfoResp?.role);
          console.log(`[${token.name}] roleInfoResp?.role?.dailyTask:`, roleInfoResp?.role?.dailyTask);
          
          // 消息监听器会自动更新tokenGameDataMap，但为了确保，我们再手动更新一次
          if (roleInfoResp) {
            const roleData = roleInfoResp?.role || roleInfoResp;
            const activityPoints = roleData?.dailyTask?.dailyPoint ?? 0;
            
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `📊 ${token.name} 解析活跃度: ${activityPoints}/110`,
              type: "info",
            });
            
            // 显式设置活跃度到tokenActivityMap，确保排序时能正确获取
            tokenStore.setTokenActivity(tokenId, activityPoints);
            
            if (roleData) {
              // 更新到tokenGameDataMap
              tokenStore.updateTokenGameData(tokenId, { roleInfo: roleInfoResp });
              
              // 验证更新（数据路径：roleInfo.role.dailyTask.dailyPoint）
              const cached = tokenStore.getTokenGameData(tokenId);
              const cachedActivity = cached?.roleInfo?.role?.dailyTask?.dailyPoint 
                ?? cached?.roleInfo?.dailyTask?.dailyPoint ?? 0;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `✅ ${token.name} 活跃度已缓存: ${cachedActivity}/110`,
                type: "success",
              });
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `️ ${token.name} 角色信息响应为空`,
              type: "warning",
            });
          }
        } catch (error) {
          console.error(`获取${token.name}最新活跃度失败:`, error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ ${token.name} 获取活跃度失败: ${error.message}`,
            type: "error",
          });
        }

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行失败: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 完成后关闭连接（skipSlot模式不需要释放槽位，由外层滚动循环控制）
        tokenStore.closeWebSocketConnection(tokenId);
        // ✅ 修复：每个账号完成时更新 lastTaskExecution，作为心跳防止 healthCheck 误判
        lastTaskExecution = Date.now();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (活跃: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  }; // end executeTokenRolling

  // ========== 连接池滚动执行循环 ==========
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `🚀 连接池滚动执行开始，并发数: ${maxConcurrent}，Token数: ${tokenQueue.length}`,
    type: "info",
  });

  while (tokenQueue.length > 0 || activeTokens.size > 0) {
    if (shouldStop.value) break;

    // 填充执行槽位（最多 maxConcurrent 个）
    while (tokenQueue.length > 0 && activeTokens.size < maxConcurrent) {
      const nextTokenId = tokenQueue.shift();
      activeTokens.add(nextTokenId);

      // 启动执行（不等待完成）
      const promise = (async () => {
        try {
          await Promise.race([
            executeTokenRolling(nextTokenId),
            new Promise((_, reject) => setTimeout(() =>
              reject(new Error(`单账号执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`)),
              TOKEN_EXECUTION_TIMEOUT
            ))
          ]);
        } catch (timeoutErr) {
          const token = tokens.value.find((t) => t.id === nextTokenId);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏰ ${token?.name} ${timeoutErr.message}，强制跳过`,
            type: "warning",
          });
          tokenStatus.value[nextTokenId] = "failed";
          tokenStore.closeWebSocketConnection(nextTokenId);
          lastTaskExecution = Date.now();
        }
      })();

      completionMap.set(nextTokenId, promise);
    }

    // 等待至少一个完成
    if (activeTokens.size > 0) {
      const activePromises = [...activeTokens].map(id => completionMap.get(id));
      await Promise.race(activePromises);

      // 清理已完成的
      for (const [tid, promise] of completionMap.entries()) {
        const status = tokenStatus.value[tid];
        if (status === 'completed' || status === 'failed' || status === 'waiting_retry') {
          activeTokens.delete(tid);
          completionMap.delete(tid);
        }
      }
    }

    await new Promise(r => setTimeout(r, 50));
  }

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 连接池滚动执行完成`,
    type: "success",
  });

  // 等待所有任务完成后再继续
  await new Promise((r) => setTimeout(r, 1000));

  // ==================== 400340 重试逻辑 ====================
  if (retry400340Tokens.length > 0 && !shouldStop.value) {
    const waitSeconds = RETRY_WAIT_TIME / 1000;
    const waitMinutes = Math.floor(waitSeconds / 60);
    const waitDesc = waitMinutes > 0 ? `${waitMinutes}分钟` : `${waitSeconds}秒`;
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 第一批执行完成，${retry400340Tokens.length} 个账号遇到400340服务器错误，等待${waitDesc}后重试 ===`,
      type: "info",
    });

    for (let retryRound = 0; retryRound < MAX_400340_RETRIES && retry400340Tokens.length > 0 && !shouldStop.value; retryRound++) {
      // 等待重试延迟
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⏳ 等待${waitDesc}后进行第${retryRound + 1}次重试（${retry400340Tokens.length}个账号）...`,
        type: "info",
      });
      await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));

      if (shouldStop.value) break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 开始400340重试 第${retryRound + 1}/${MAX_400340_RETRIES}次（${retry400340Tokens.length}个账号）===`,
        type: "info",
      });

      const stillFailed = [];

      for (let i = 0; i < retry400340Tokens.length; i++) {
        if (shouldStop.value) break;

        const tokenId = retry400340Tokens[i];
        const token = tokens.value.find((t) => t.id === tokenId);
        if (!token) continue;

        // 账号间延迟（非第一个账号时）
        if (i > 0 && (batchSettings.accountRetryInterval || 0) > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏳ 等待${batchSettings.accountRetryInterval / 1000}秒后处理下一个账号...`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, batchSettings.accountRetryInterval || 3000));
        }

        tokenStatus.value[tokenId] = "running";

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 重试执行: ${token.name} (第${retryRound + 1}次重试) ===`,
            type: "info",
          });

          await ensureConnection(tokenId, 3);

          // 等待连接稳定
          await new Promise((r) => setTimeout(r, 2000));

          // 创建新的runner
          const retryRunner = new DailyTaskRunner(tokenStore, {
            commandDelay: batchSettings.commandDelay,
            taskDelay: batchSettings.taskDelay,
          }, batchSettings);

          const retryResult = await retryRunner.run(tokenId, {
            onLog: (log) => addLog(log),
            onProgress: () => {},
          });

          if (retryResult?.has400340Error) {
            stillFailed.push(tokenId);
            tokenStatus.value[tokenId] = "waiting_retry";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} 重试后仍有400340错误`,
              type: "warning",
            });
          } else {
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ ${token.name} 重试成功`,
              type: "success",
            });
          }
        } catch (error) {
          stillFailed.push(tokenId);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ ${token.name} 重试失败: ${error.message}`,
            type: "error",
          });
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot(); // 与 ensureConnection 中的 waitForConnectionSlot 对应
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (活跃: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }

      // 更新重试队列
      retry400340Tokens.length = 0;
      retry400340Tokens.push(...stillFailed);

      if (retry400340Tokens.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 所有400340错误账号重试成功！`,
          type: "success",
        });
      }
    }

    // 最终仍失败的账号
    if (retry400340Tokens.length > 0) {
      for (const tokenId of retry400340Tokens) {
        tokenStatus.value[tokenId] = "failed";
        const token = tokens.value.find((t) => t.id === tokenId);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `❌ ${token?.name} 400340重试${MAX_400340_RETRIES}次后仍失败`,
          type: "error",
        });
      }
    }
  }

  // 根据活跃度自动排序账号（只有执行多个账号时才排序）
  if (selectedTokens.value.length > 1) {
    await sortByActivityAfterDailyTask();
  } else {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `ℹ️  只执行了1个账号，跳过活跃度排序`,
      type: "info",
    });
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  
  // 检查是否需要在任务完成后刷新页面
  // 注意：需同时确认定时任务和队列中没有待执行任务，避免刷新中断
  if (shouldRefreshAfterTask.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
    console.log(`[${new Date().toISOString()}] Task completed, executing postponed page refresh`);
    shouldRefreshAfterTask.value = false; // 重置标记
    // 稍等片刻再刷新，让用户看到任务完成的消息
    setTimeout(() => {
      // ✅ 二次确认：防止 1.5 秒内调度器启动了新任务
      if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        window.location.reload();
      } else {
        shouldRefreshAfterTask.value = true; // 重新标记，等待下次调度器检查
        console.log(`[${new Date().toISOString()}] Postponed refresh: new task started during delay`);
      }
    }, 1500);
    return; // 提前返回，不显示成功消息
  }
  
  message.success("批量任务执行结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};

/**
 * 日常任务执行完成后，根据活跃度自动排序账号
 * 低活跃度（<100）的账号排到前面，高活跃度（>=100）的账号排到后面
 * 注意：只对本次执行的selectedTokens排序，不影响未执行的token顺序
 */
const sortByActivityAfterDailyTask = async () => {
  try {
    // 检查账号数量，只有多个账号才排序
    const executedTokenCount = selectedTokens.value.length;
    if (executedTokenCount <= 1) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `ℹ️  只执行了${executedTokenCount}个账号，无需排序`,
        type: "info",
      });
      return;
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 开始根据活跃度自动排序账号 (${executedTokenCount}个账号) ===`,
      type: "info",
    });

    // 活跃度阈值：100为分界线（满值110，>=105跳过任务）
    const ACTIVITY_THRESHOLD = 100;

    // 获取本次执行的token的活跃度
    const activityMap = new Map();
    
    for (const tokenId of selectedTokens.value) {
      const token = tokenStore.gameTokens.find(t => t.id === tokenId);
      
      try {
        const activityPoints = tokenStore.getTokenActivity(tokenId);
        activityMap.set(tokenId, activityPoints);
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token?.name || tokenId} 活跃度: ${activityPoints}/110`,
          type: "info",
        });
      } catch (error) {
        console.error(`获取活跃度失败:`, error);
        activityMap.set(tokenId, 0);
      }
    }

    // 只对selectedTokens按活跃度排序
    const sortedExecutedIds = [...selectedTokens.value].sort((a, b) => {
      const activityA = activityMap.get(a) || 0;
      const activityB = activityMap.get(b) || 0;
      
      // 低活跃度(<100)排前面，高活跃度(>=100)排后面
      const isLowA = activityA < ACTIVITY_THRESHOLD;
      const isLowB = activityB < ACTIVITY_THRESHOLD;
      
      if (isLowA && !isLowB) return -1;
      if (!isLowA && isLowB) return 1;
      
      // 同组内按活跃度升序排列
      return activityA - activityB;
    });

    // 合并：已执行的token（按活跃度排序）+ 未执行的token（保持原顺序）
    const executedSet = new Set(selectedTokens.value);
    const nonExecutedIds = tokenOrder.value.filter(id => !executedSet.has(id));
    const sortedTokenIds = [...sortedExecutedIds, ...nonExecutedIds];

    // 更新tokenOrder
    tokenOrder.value = sortedTokenIds;
    
    // 保存到存储
    await saveTokenOrder(sortedTokenIds);

    // 统计信息
    const lowActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) < ACTIVITY_THRESHOLD
    );
    const highActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) >= ACTIVITY_THRESHOLD
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ 活跃度排序完成`,
      type: "success",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 低活跃度(0-99): ${lowActivityTokens.length}个账号 → 排到前面`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 高活跃度(100-110): ${highActivityTokens.length}个账号 → 排到后面`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 活跃度排序完成 ===`,
      type: "success",
    });
  } catch (error) {
    console.error('活跃度排序失败:', error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️ 活跃度排序失败: ${error.message}`,
      type: "warning",
    });
  }
};
</script>

<style scoped>
.batch-daily-tasks {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

/* 定时任务模块样式 */
.scheduled-tasks-wrapper {
  display: flex;
  align-items: stretch;
  gap: 16px;
  width: 100%;
}

.scheduled-tasks-card {
  flex: 1;
  min-width: 280px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 10px;
  color: #333333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.scheduled-tasks-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.scheduled-tasks-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 320px;
}

.button-row {
  display: flex;
  gap: 8px;
}

/* 手机端响应式 - 自动缩小并换行 */
@media (max-width: 768px) {
  .scheduled-tasks-wrapper {
    flex-direction: column;
    gap: 12px;
  }

  .scheduled-tasks-card {
    min-width: 100%;
    padding: 12px 16px;
  }

  .scheduled-tasks-card > div {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .scheduled-tasks-card > div > div:last-child {
    border-left: none !important;
    border-top: 2px solid #e8e8e8;
    padding-left: 0 !important;
    padding-top: 12px;
  }

  .scheduled-tasks-buttons {
    min-width: 100%;
  }

  .button-row {
    flex-wrap: wrap;
  }

  /* 任务管理和时段控制 - 每行2个 */
  .button-row-task,
  .button-row-time {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .button-row-task > *,
  .button-row-time > * {
    min-width: 0 !important;
  }

  /* 配置管理 - 每行2个 */
  .button-row-config {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }

  .button-row-config > * {
    min-width: 0 !important;
    width: 100% !important;
  }

  /* 强制n-upload占满容器宽度 */
  .button-row-config :deep(.n-upload) {
    width: 100% !important;
    display: block !important;
  }

  .button-row-config :deep(.n-upload .n-button) {
    width: 100% !important;
    flex: none !important;
  }

  /* 确保n-upload使用flex布局与n-button一致 */
  .button-row-config :deep(.n-upload) {
    flex: 1 !important;
    display: flex !important;
  }

  .button-row-config :deep(.n-upload .n-button) {
    flex: 1 !important;
    width: auto !important;
  }

  /* 强制导入按钮与导出按钮宽度一致 */
  .button-row-config > .n-upload {
    flex: 1 1 0% !important;
    min-width: 0 !important;
  }

  .button-row-config > .n-upload > .n-button,
  .button-row-config > .n-upload .n-button {
    flex: 1 1 0% !important;
    min-width: 0 !important;
    width: 100% !important;
  }

  /* 确保导入按钮在PC端也使用flex布局 */
  @media (min-width: 769px) {
    .button-row-config {
      display: flex !important;
      flex-wrap: nowrap !important;
    }
    
    .button-row-config > .n-button,
    .button-row-config > .n-upload {
      flex: 1 1 0% !important;
      min-width: 0 !important;
    }
    
    .button-row-config > .n-upload .n-button {
      flex: 1 1 0% !important;
      width: 100% !important;
    }
  }

  /* 缩小按钮字体和图标 */
  .scheduled-tasks-buttons :deep(.n-button) {
    font-size: 12px !important;
    height: 32px !important;
    padding: 0 8px !important;
  }

  .scheduled-tasks-buttons :deep(.n-button .n-button__icon) {
    font-size: 14px !important;
  }

  /* 缩小统计卡片数字 */
  .scheduled-tasks-card > div > div:first-child > div:last-child {
    font-size: 24px !important;
  }

  .scheduled-tasks-card > div > div:last-child > div:last-child {
    font-size: 13px !important;
  }
}

.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.left-column {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding-right: 8px;
}

.right-column {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 700px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.token-item {
  display: flex;
  align-items: center;
}

.log-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-card-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

/* Cron Parser Styles */
.cron-parser {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.cron-validation {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
}

.cron-validation.success {
  background-color: rgba(24, 160, 88, 0.12);
}

.cron-validation.error {
  background-color: rgba(235, 87, 87, 0.12);
}

.cron-next-runs h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.cron-next-runs ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cron-next-runs li {
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.cron-next-runs li:last-child {
  border-bottom: none;
}

.log-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-family: monospace;
  min-height: 200px;
}

.log-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.log-item.error {
  color: #d03050;
}

.log-item.success {
  color: #18a058;
}

.log-item.warning {
  color: #f0a020;
}

.log-item.info {
  color: #333;
}

.time {
  color: #999;
  margin-right: 8px;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

/* Settings Modal Styles */
.task-form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 8px;
}

/* 查看任务列表样式 */
.tasks-list-container {
  padding: 8px 0;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px;
}

.task-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8eaed;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.task-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
  border-color: #d0d3d8;
}

/* 任务头部 */
.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaed 100%);
  border-bottom: 1px solid #e8eaed;
}

.task-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.task-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-status-dot.enabled {
  background: #52c41a;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.2);
}

.task-status-dot.disabled {
  background: #d9d9d9;
}

.task-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 任务内容 */
.task-card-body {
  padding: 16px;
}

.task-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.task-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: #86909c;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 13px;
  color: #1f2329;
  font-weight: 500;
}

.info-value.code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f7f8fa;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.info-value.countdown {
  font-weight: 600;
}

.info-value.countdown.near-execution {
  color: #ff4d4f;
  animation: pulse 2s ease-in-out infinite;
}

.info-value.countdown.disabled {
  color: #d9d9d9;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 任务底部操作 */
.task-card-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #fafbfc;
  border-top: 1px solid #e8eaed;
}

.task-card-footer .n-button {
  flex: 1;
}

.form-section {
  background: #fafbfc;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e8eaed;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e8eaed;
}

.section-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

/* 分组选择器 */
.group-selector {
  margin-bottom: 16px;
  padding: 12px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e8eaed;
}

.group-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.group-selector-label {
  font-size: 12px;
  color: #86909c;
  font-weight: 500;
}

.group-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 账号和任务列表 */
.token-list,
.task-list {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e8eaed;
  max-height: 300px;
  overflow-y: auto;
}

/* 任务配置卡片 */
.task-config-card {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e8eaed;
  overflow: hidden;
}

.config-card-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaed 100%);
  border-bottom: 1px solid #e8eaed;
}

.config-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}

.config-card-content {
  padding: 16px;
}

/* 商店商品项 */
.store-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid #e8eaed;
  transition: all 0.2s ease;
}

.store-item:hover {
  background: #f0f2f5;
  border-color: #d0d3d8;
}

/* 黑市多选购买项 */
.manual-buy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f7f8fa;
  border-radius: 6px;
  border: 1px solid #e8eaed;
  transition: all 0.2s ease;
  min-height: 38px;
}

.manual-buy-item:hover {
  background: #f0f2f5;
  border-color: #d0d3d8;
}

.manual-buy-item.is-checked {
  background: #e8f4fd;
  border-color: #91caff;
}

.manual-buy-label {
  font-size: 13px;
  font-weight: 500;
}

/* 奖励项 */
.reward-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid #e8eaed;
  transition: all 0.2s ease;
}

.reward-item:hover {
  background: #f0f2f5;
  border-color: #d0d3d8;
}

/* 不上线时段 */
.offline-time-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border-radius: 10px;
  border: 1px solid #ffd6d6;
}

.offline-time-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 4px;
}

.offline-time-desc {
  font-size: 12px;
  color: #86909c;
  line-height: 1.5;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 2px solid #e8eaed;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

.setting-switches {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.switch-row:last-child {
  border-bottom: none;
}

.switch-label {
  font-size: 14px;
  color: #666;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .right-column {
    width: 380px;
  }
}

@media (max-width: 992px) {
  .batch-daily-tasks {
    height: auto;
    overflow: visible;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-column {
    overflow-y: visible;
    padding-right: 0;
  }

  .right-column {
    width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .batch-daily-tasks {
    padding: 12px;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .main-layout {
    height: auto;
    overflow: visible;
    flex-direction: column;
  }

  .left-column {
    overflow: visible;
    padding-right: 0;
    flex: none;
    height: auto;
  }

  .right-column {
    height: auto;
    width: 100%;
    flex: none;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .page-header .actions {
    display: flex;
    gap: 8px;
  }

  .log-card {
    height: auto !important;
  }

  .log-card :deep(.n-card__content) {
    flex: none !important;
    overflow: visible !important;
    display: block !important;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
    flex: none !important;
  }

  .log-header-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  /* 批量功法残卷赠送样式 */
  .recipient-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  /* 头像悬停效果 */
  .avatar-container:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  }

  /* Token分组管理样式 */
  .group-selection-section {
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .group-tag {
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    text-align: center;
    font-weight: 500;
  }

  .group-tag:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .group-tag-selected {
    color: white;
    font-weight: 600;
  }

  /* 排序按钮组移动端自适应 */
  .sort-buttons {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
    margin-top: 8px !important;
    margin-bottom: 8px !important;

    :deep(.n-space) {
      flex-wrap: wrap;
      gap: 6px;
      max-width: 100%;
    }

    :deep(.n-button-group) {
      flex-wrap: wrap;
      display: flex;
      
      .n-button {
        font-size: 12px !important;
        padding: 4px 8px !important;
        white-space: nowrap;
      }
    }

    /* 每行数量和搜索框自适应 */
    :deep(.n-input-number),
    :deep(.n-input) {
      width: 120px !important;
      min-width: 80px;
    }
  }

  /* 账号列表头部按钮移动端自适应 */
  :deep(.n-card-header) {
    flex-wrap: wrap;
    gap: 6px;
  }

  :deep(.n-card-header__title) {
    white-space: nowrap;
    font-size: 15px;
  }

  :deep(.n-card-header__extra) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    width: 100%;
    justify-content: flex-start;
  }

  :deep(.n-card-header__extra .n-button) {
    font-size: 12px !important;
    padding: 4px 10px !important;
    height: 28px !important;
  }

  :deep(.n-card-header__extra .n-button .n-button__content) {
    font-size: 12px !important;
  }

  /* 响应式设计 */
  @media (max-width: 600px) {
    .recipient-info {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .avatar-container {
      margin-bottom: 12px;
    }
  }
}

/* 展开/收起按钮组样式 */
.expand-collapse-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.button-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.button-group :deep(.n-button) {
  border-radius: 6px;
  font-weight: 500;
}

/* 手机端响应式 */
@media (max-width: 768px) {
  .expand-collapse-buttons {
    gap: 6px;
  }
  
  .button-group {
    gap: 4px;
  }
  
  .button-group :deep(.n-button) {
    font-size: 12px !important;
    height: 30px !important;
    padding: 0 10px !important;
    border-radius: 4px;
  }
}

/* 暗黑模式适配 */
[data-theme="dark"] {
  .batch-daily-tasks-container {
    background: var(--bg-primary);
  }
  
  /* 功能卡片背景 */
  .function-section,
  .token-list-section,
  .log-section {
    background: var(--card-bg) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 分组管理区域 */
  .group-selection-section,
  [style*="background: #f7f8fa"],
  [style*="background:#f7f8fa"] {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 输入框和搜索框 */
  :deep(.n-input),
  :deep(.n-input-wrapper),
  :deep(.n-base-selection) {
    background: var(--input-bg) !important;
    border-color: var(--input-border) !important;
    color: var(--text-primary) !important;
  }
  
  :deep(.n-input__input-el),
  :deep(.n-base-selection-label) {
    color: var(--text-primary) !important;
  }
  
  /* 按钮样式优化 */
  :deep(.n-button) {
    color: var(--text-primary) !important;
  }
  
  :deep(.n-button:not(.n-button--primary):not(.n-button--success):not(.n-button--error):not(.n-button--warning)) {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-medium) !important;
  }
  
  /* 标签页 */
  :deep(.n-tabs-tab) {
    color: var(--text-secondary) !important;
  }
  
  :deep(.n-tabs-tab--active) {
    color: var(--primary-color) !important;
  }
  
  :deep(.n-tabs-tab-pane) {
    background: var(--card-bg) !important;
  }
  
  /* 复选框 */
  :deep(.n-checkbox__label) {
    color: var(--text-primary) !important;
  }
  
  /* 进度条 */
  :deep(.n-progress) {
    background: var(--bg-tertiary) !important;
  }
  
  /* 日志区域 */
  .log-content {
    background: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 日志容器 */
  .log-container {
    background: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-light) !important;
  }
  
  /* 日志项 */
  .log-item {
    color: var(--text-primary) !important;
    border-bottom-color: var(--border-light) !important;
  }
  
  .log-item .time {
    color: var(--text-secondary) !important;
  }
  
  .log-item .message {
    color: var(--text-primary) !important;
  }
  
  /* 日志类型颜色 */
  .log-item.success .message {
    color: #52c41a !important;
  }
  
  .log-item.error .message {
    color: #ff4d4f !important;
  }
  
  .log-item.warning .message {
    color: #faad14 !important;
  }
  
  .log-item.info .message {
    color: #1890ff !important;
  }
  
  /* 定时任务卡片 */
  .scheduled-tasks-card {
    background: var(--card-bg) !important;
    border: 1px solid var(--border-light) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
  }
  
  .scheduled-tasks-card [style*="color: #666666"],
  .scheduled-tasks-card [style*="color:#666666"] {
    color: var(--text-secondary) !important;
  }
  
  .scheduled-tasks-card [style*="color: #1890ff"],
  .scheduled-tasks-card [style*="color:#1890ff"] {
    color: #40a9ff !important;
  }
  
  .scheduled-tasks-card > div > div:last-child {
    border-left-color: var(--border-light) !important;
    border-top-color: var(--border-light) !important;
  }
  
  /* 定时任务按钮区域 */
  .scheduled-tasks-buttons {
    background: var(--card-bg) !important;
  }
  
  .scheduled-tasks-buttons :deep(.n-button) {
    color: var(--text-primary) !important;
  }
  
  /* 定时任务列表 */
  .tasks-list {
    background: var(--bg-secondary) !important;
  }
  
  .tasks-list [style*="color: #6b7280"],
  .tasks-list [style*="color:#6b7280"] {
    color: var(--text-tertiary) !important;
  }
  
  /* 任务项 */
  .task-item {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  .task-item:hover {
    background: var(--card-bg-hover) !important;
  }
  
  /* 模态框 */
  :deep(.n-modal) {
    background: var(--card-bg) !important;
  }
  
  :deep(.n-modal-header) {
    background: var(--card-bg) !important;
    color: var(--text-primary) !important;
    border-bottom-color: var(--border-light) !important;
  }
  
  :deep(.n-modal-body) {
    background: var(--card-bg) !important;
    color: var(--text-primary) !important;
  }
  
  :deep(.n-card) {
    background: var(--card-bg) !important;
  }
  
  :deep(.n-card-header) {
    background: var(--card-bg) !important;
    color: var(--text-primary) !important;
  }
  
  :deep(.n-card__content) {
    background: var(--card-bg) !important;
    color: var(--text-primary) !important;
  }
  
  /* 任务模板区域 */
  [style*="background: #f0f5ff"],
  [style*="background:#f0f5ff"] {
    background: rgba(22, 119, 255, 0.1) !important;
    border-color: rgba(22, 119, 255, 0.3) !important;
  }
  
  /* 接收者信息 */
  .recipient-info {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 卡片头部 */
  .card-header {
    color: var(--text-primary) !important;
  }
  
  /* Token卡片 */
  .token-card {
    background: var(--card-bg) !important;
    border-color: var(--border-light) !important;
  }
  
  .token-card:hover {
    background: var(--card-bg-hover) !important;
  }
}

/* ================= 设置弹窗响应式样式 ================= */
/* 设置项网格 - 自适应换行 */
.settings-grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

/* 设置项 - 响应式布局 */
.setting-item-responsive {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--border-light, #e5e7eb);
  transition: all 0.2s ease;
}

.setting-item-responsive:hover {
  background: var(--bg-tertiary, #f3f4f6);
  border-color: var(--border-hover, #d1d5db);
}

/* 设置标签 */
.setting-label-responsive {
  font-size: 13px;
  color: var(--text-secondary, #4b5563);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 输入框响应式 */
.input-responsive {
  width: 100% !important;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .settings-grid-responsive {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .setting-item-responsive {
    padding: 6px 10px;
  }
  
  .setting-label-responsive {
    font-size: 12px;
  }
}

/* 平板端适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .settings-grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面端适配 */
@media (min-width: 1025px) {
  .settings-grid-responsive {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

/* ========== 任务模板管理器样式 ========== */
.template-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 工具栏 */
.template-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
}

/* 模板列表容器 */
.template-list-container {
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
}

/* 模板网格布局 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* 模板卡片 */
.template-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--n-border-color, #e5e7eb);
}

.template-card:hover {
  border-color: var(--n-primary-color, #18a058);
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.1);
  transform: translateY(-2px);
}

/* 模板卡片头部 */
.template-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.template-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--n-title-text-color, #1f2937);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 模板卡片底部 */
.template-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--n-border-color, #f3f4f6);
}

.template-time {
  font-size: 12px;
  color: var(--n-text-color-3, #9ca3af);
}

/* 采购清单网格 */
.purchase-config-area {
  margin: 4px 0 8px;
}
.purchase-list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 6px;
  margin-top: 4px;
}
.purchase-item-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  min-width: 0;
  border: 1px solid var(--n-border-color, #e5e7eb);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: var(--n-color-hover, #f0f0f0); }
  input[type="checkbox"] { margin: 0; flex-shrink: 0; }
  > span { white-space: nowrap; flex-shrink: 0; }
}
.discount-input {
  width: 38px;
  height: 24px;
  padding: 0 4px;
  border: 1px solid var(--n-border-color, #e0e0e6);
  border-radius: 3px;
  font-size: 12px;
  text-align: center;
  background: var(--n-color, #fff);
  color: var(--n-text-color, #333);
  flex-shrink: 0;
  -moz-appearance: textfield;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &:focus {
    outline: none;
    border-color: var(--n-color-focus, #36ad6a);
  }
}
.discount-unit {
  font-size: 11px;
  color: var(--n-text-color-3, #9ca3af);
  flex-shrink: 0;
}
/* 绿色开关样式（与预设卡点开关一致） */
:deep(.feature-switch) {
  --n-rail-color-active: #18a058 !important;
  --n-rail-color: #ccc !important;
  min-width: 64px;
}
:deep(.feature-switch .n-switch__rail) {
  min-width: 64px;
}
</style>

<!-- 添加Token弹窗样式（非scoped，因为n-modal被传送到body） -->
<style>
.add-token-modal {
  border-radius: 12px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04) !important;
}

.add-token-modal .n-card-header {
  padding: 16px 20px 12px !important;
}

.add-token-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.add-token-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--n-title-text-color, #1a1a1a);
}

.import-method-tabs {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.import-method-tabs .n-radio-button {
  flex: 0 0 auto;
  min-width: 0;
  text-align: center;
  white-space: nowrap;
  font-size: 13px;
  padding: 0 10px;
}

.import-method-tabs .n-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
}

.add-token-body {
  padding-top: 4px;
}

.add-token-body .form-actions {
  margin-top: 0 !important;
  margin-bottom: 16px;
  gap: 8px !important;
}

.add-token-body .form-actions .n-button--primary-type {
  border-radius: 8px;
  font-weight: 500;
  height: 40px;
}

.add-token-body .form-actions .n-button--default-type {
  border-radius: 8px;
  height: 36px;
}

.add-token-body .n-form-item {
  margin-bottom: 14px;
}

.add-token-body .n-form-item .n-form-item-label {
  font-weight: 500;
  font-size: 13px;
}

.add-token-body .n-input {
  border-radius: 8px;
}

.add-token-body .n-collapse {
  margin-top: 4px;
}

.add-token-body .n-collapse .n-collapse-item__header {
  font-size: 13px;
  color: #666;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .add-token-modal {
    width: 96% !important;
    max-width: none !important;
    margin: 8px;
  }
  
  .add-token-header {
    flex-direction: column;
    gap: 8px;
  }

  .import-method-tabs {
    justify-content: flex-start;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .import-method-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .import-method-tabs .n-radio-button {
    flex: 0 0 auto;
    font-size: 12px;
    padding: 0 8px;
  }
  
  .import-method-tabs .n-radio-button__state-border {
    padding: 0 6px;
  }
}

/* 十殿预设选择列表 */
.nightmare-preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nightmare-preset-item {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.2s;
}

.nightmare-preset-item:hover {
  background: #f0f0f0;
  border-color: #c0c0c0;
}

.preset-item-label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* === 批量推图弹窗样式 === */
.push-modal .n-card-header {
  padding: 14px 20px 10px !important;
}
.push-modal .n-card__content {
  padding: 12px 20px 16px !important;
}
.push-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.push-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.push-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.push-toolbar-right {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 卡片网格 */
.push-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
}
.push-cards-grid::-webkit-scrollbar {
  width: 4px;
}
.push-cards-grid::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}

/* 单个卡片 */
.push-card {
  background: #f8f9fb;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  padding: 10px 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.push-card--running {
  border-color: #b6d7ff;
  background: #f0f7ff;
  box-shadow: 0 0 0 1px rgba(32, 128, 240, 0.08);
}
.push-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.push-card-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.push-card-title {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.push-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-active {
  background: #18a058;
  box-shadow: 0 0 4px #18a058aa;
  animation: dot-pulse 2s infinite;
}
.dot-idle {
  background: #c0c4cc;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.push-card-stats {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.push-stat {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.push-stat-win {
  color: #18a058;
  background: #e8f5ee;
}
.push-stat-loss {
  color: #d03050;
  background: #fde8ec;
}

.push-card-body {
  margin-bottom: 6px;
}
.push-card-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.push-info-level {
  font-size: 11.5px;
  color: #666;
  background: #eef0f3;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
}
.push-info-boss {
  font-size: 11.5px;
  color: #c0392b;
  font-weight: 600;
}
.push-card-timer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
}
.push-timer-label {
  color: #888;
}
.push-timer-value {
  color: #2080f0;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.push-card-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eef0f3;
  padding-top: 4px;
}

.push-empty {
  text-align: center;
  padding: 28px 0;
  color: #bbb;
  font-size: 13px;
}

/* 日志区域 */
.push-logs-section {
  border-top: 1px solid #eef0f3;
  padding-top: 10px;
}
.push-logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.push-logs-title {
  font-weight: 600;
  font-size: 13px;
}
.push-logs-list {
  max-height: 180px;
  overflow-y: auto;
  background: #fafbfc;
  border-radius: 6px;
  padding: 6px 8px;
}
.push-logs-list::-webkit-scrollbar {
  width: 4px;
}
.push-logs-list::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}
.push-log-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.6;
}
.log-time {
  color: #aab;
  flex-shrink: 0;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}
.log-text {
  word-break: break-all;
}
.log-info .log-text { color: #666; }
.log-success .log-text { color: #18a058; font-weight: 500; }
.log-error .log-text { color: #d03050; font-weight: 500; }
.log-warning .log-text { color: #e6a23c; font-weight: 500; }
.push-logs-empty {
  text-align: center;
  color: #ccc;
  padding: 20px 0;
  font-size: 12px;
}
</style>
