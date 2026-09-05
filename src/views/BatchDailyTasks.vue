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
                    <span class="btn-emoji-icon">➕</span>
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
                    <span class="btn-emoji-icon">📋</span>
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
                    <span class="btn-emoji-icon">▶️</span>
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
                    <span class="btn-emoji-icon">⏸️</span>
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
                    <span class="btn-emoji-icon">📥</span>
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
                    <span class="btn-emoji-icon">📤</span>
                  </template>
                  导出任务
                </n-button>
                <n-button 
                  size="small" 
                  @click="triggerImportAccountConfig"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span class="btn-emoji-icon">📥</span>
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
                    <span class="btn-emoji-icon">📤</span>
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
                    <span class="btn-emoji-icon">📦</span>
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
                    <span class="btn-emoji-icon">📦</span>
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
                <span class="btn-emoji-icon">▶️</span>
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
                <span class="btn-emoji-icon">⏹️</span>
              </template>
              停止
            </n-button>
            <n-button
              @click="openTemplateManagerModal"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span class="btn-emoji-icon">📥</span>
              </template>
              任务模板
            </n-button>
            <n-button @click="openBatchSettings" size="medium" style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;">
              <template #icon>
                <span class="btn-emoji-icon">⚙️</span>
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
                <span class="btn-emoji-icon">🔗</span>
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
                <span class="btn-emoji-icon">🔌</span>
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
                  @click="executeManualTaskWithRecord('claimHangUpRewards', '领取挂机', claimHangUpRewards)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取挂机
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchAddHangUpTime', '一键加钟', batchAddHangUpTime)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键加钟
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchHangUpUpgrade', '挂机升级', () => batchHangUpUpgrade())"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  挂机升级
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('resetBottles', '重置罐子', resetBottles)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  重置罐子
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchlingguanzi', '一键领取罐子', batchlingguanzi)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取罐子
                </n-button>

                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchStudy', '一键答题', batchStudy)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键答题
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchStudyClaimReward', '答题奖励领取', batchStudyClaimReward)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  答题奖励领取
                </n-button>
                <n-button-group size="small">
                  <n-button
                    @click="executeArenaFight"
                    :disabled="
                      isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                    "
                  >
                    一键竞技场战斗{{ currentSettings.arenaFightCount }}次
                  </n-button>
                  <n-dropdown 
                    :options="arenaFightCountOptions" 
                    trigger="click"
                    @select="handleArenaFightCountSelect"
                  >
                    <n-button 
                      :disabled="isRunning || selectedTokens.length === 0 || !isarenaActivityOpen"
                      style="padding: 0 8px;"
                    >
                      <template #icon>
                        <n-icon><ChevronDown /></n-icon>
                      </template>
                    </n-button>
                  </n-dropdown>
                </n-button-group>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchSmartSendCar', '智能发车', batchSmartSendCar)"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  智能发车
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchClaimCars', '一键收车', batchClaimCars)"
                  :disabled="
                    isRunning || selectedTokens.length === 0
                  "
                >
                  一键收车
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchCarResearchUpgrade', '升级改装', batchCarResearchUpgrade)"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  升级改装
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('store_purchase', '一键黑市采购', store_purchase)"
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
                  @click="executeManualTaskWithRecord('batch_mail_claim_and_cleanup', '邮箱领取与清理', batch_mail_claim_and_cleanup)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  邮箱领取与清理
                </n-button>
                <n-button
                  size="small"
                  @click="showSimplifiedDailyModal = true"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  日常精简补齐
                </n-button>
                <n-button
                  size="small"
                  :type="isAnyPushRunning ? 'error' : 'warning'"
                  @click="showPushMapModal = true"
                >
                  {{ isAnyPushRunning ? '停止推图' : '批量推图' }}
                </n-button>

              </n-space>

              <!-- 日常精简补齐 - 任务项勾选弹窗 -->
              <n-modal
                v-model:show="showSimplifiedDailyModal"
                preset="card"
                title="日常精简补齐"
                style="width: 92%; max-width: 480px"
              >
                <n-alert type="info" size="small" style="margin-bottom: 12px;">
                  不判断活跃度，直接对选中账号执行勾选的精简补齐任务项
                </n-alert>
                <n-checkbox-group v-model:value="simplifiedDailySelectedItems">
                  <n-space vertical>
                    <n-checkbox
                      v-for="item in SIMPLIFIED_TASK_ITEMS"
                      :key="item.key"
                      :value="item.key"
                    >
                      {{ item.label }}
                    </n-checkbox>
                  </n-space>
                </n-checkbox-group>
                <template #footer>
                  <n-space justify="end">
                    <n-button size="small" @click="showSimplifiedDailyModal = false">取消</n-button>
                    <n-button
                      size="small"
                      type="primary"
                      @click="startSimplifiedDaily"
                      :disabled="isRunning || simplifiedDailySelectedItems.length === 0"
                    >
                      执行
                    </n-button>
                  </n-space>
                </template>
              </n-modal>

            </n-tab-pane>
            <n-tab-pane name="welfare" tab="福利">
              <n-space>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('charge_claimaddup_rewards', '积分好礼领取', charge_claimaddup_rewards)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  积分好礼领取
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('collection_claimfreereward', '一键领取珍宝阁', collection_claimfreereward)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取珍宝阁
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('gacha_drawreward', '免费扭蛋', gacha_drawreward)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  免费扭蛋
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('claim_recruit_welfare', '免费礼包领取', claim_recruit_welfare)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  免费礼包领取
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('pkroom_appoint', '预约直播', pkroom_appoint)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  预约直播
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('saltcup26_openstarpack_use', '咸鱼神杯使用卡包', saltcup26_openstarpack_use)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  咸鱼神杯使用卡包
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="dungeon" tab="副本">
              <n-space>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('climbTower', '一键爬塔', climbTower)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键爬塔
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchmengjing', '一键梦境', batchmengjing)"
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
                  @click="executeManualTaskWithRecord('skinChallenge', '一键换皮闯关', skinChallenge)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键换皮闯关
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('skinTreasure', '一键换皮寻宝', skinTreasure)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键换皮寻宝
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('newSkinChallenge', '新区一键换皮闯关', newSkinChallenge)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  新区一键换皮闯关
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('newSkinTreasure', '新区一键换皮寻宝', newSkinTreasure)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  新区一键换皮寻宝
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchClaimPeachTasks', '一键领取蟠桃园任务', batchClaimPeachTasks)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取蟠桃园任务
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchBuyDreamItems', '一键购买梦境商品', batchBuyDreamItems)"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  一键购买梦境商品
                </n-button>
                <n-button
                  size="small"
                  @click="openGenieChallengeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  灯神挑战
                </n-button>
                <n-button
                  size="small"
                  @click="openDeepSeaChallengeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  深海挑战
                </n-button>
              </n-space>

              <n-modal
                v-model:show="showGenieChallengeModal"
                preset="card"
                title="🧞 灯神挑战"
                style="width: 420px;"
                :mask-closable="false"
              >
                <div style="padding: 4px 2px;">
                  <div style="font-size: 12px; line-height: 1.6; color: #e6a23c; background: rgba(230,162,60,0.12); border: 1px solid rgba(230,162,60,0.35); border-radius: 4px; padding: 8px 10px; margin-bottom: 14px;">
                    请先在游戏内设置好灯神阵容，并在灯神挑战界面进行预设阵容调整后挑战一次。后续通过账号设置中的"灯神预设阵容"选择阵容，再勾选对应势力进行挑战。
                  </div>
                  <div style="margin-bottom: 14px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">选择挑战势力</div>
                    <n-checkbox-group v-model:value="genieChallengeForm.genieIds">
                      <n-space>
                        <n-checkbox v-for="g in genieIdOptions" :key="g.value" :value="g.value" size="large">{{ g.label }}</n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                    <n-alert v-if="genieChallengeForm.genieIds.length === 0" type="warning" size="small" style="margin-top: 8px;">
                      请至少勾选一个势力
                    </n-alert>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">每日挑战总次数上限</div>
                    <n-input-number v-model:value="genieChallengeForm.dailyLimit" :min="1" :max="99" style="width: 100%;" />
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
                    灯神玩法要求上阵 5 名该国武将。使用账号设置中的"灯神预设阵容"，所有势力共用该队（若与该国阵营不符服务器会拒绝）。从当前进度层开始逐层挑战，直到失败/通关/今日次数用尽（默认每日 10 次，魏蜀吴群共享）。
                  </div>
                  <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
                    <n-button size="small" @click="showGenieChallengeModal = false">取消</n-button>
                    <n-button
                      size="small"
                      type="primary"
                      :disabled="isRunning || selectedTokens.length === 0 || genieChallengeForm.genieIds.length === 0"
                      @click="startGenieChallengeModal"
                    >
                      开始挑战
                    </n-button>
                  </div>
                </div>
              </n-modal>

              <n-modal
                v-model:show="showDeepSeaChallengeModal"
                preset="card"
                title="🌊 深海挑战"
                style="width: 420px;"
                :mask-closable="false"
              >
                <div style="padding: 4px 2px;">
                  <div style="font-size: 12px; line-height: 1.6; color: #409eff; background: rgba(64,158,255,0.1); border: 1px solid rgba(64,158,255,0.35); border-radius: 4px; padding: 8px 10px; margin-bottom: 14px;">
                    深海灯神不限阵营，任意阵容均可挑战。请先在游戏内设置好深海阵容，后续通过账号设置中的"灯神预设阵容"选择该预设槽，将按此阵容逐层挑战深海（最高 10 层）。
                  </div>
                  <div style="margin-bottom: 8px;">
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">每周挑战次数上限（默认 10 次，每周一刷新）</div>
                    <n-input-number v-model:value="deepSeaChallengeForm.weeklyLimit" :min="1" :max="99" style="width: 100%;" />
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
                    使用账号设置中单独配置的"深海预设阵容"（阵容 1-6，与灯神预设阵容相互独立）挑战深海灯神（genieId=5）。从当前进度层开始逐层挑战，直到通关第 10 层 / 本周 10 次挑战次数用尽。
                  </div>
                  <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
                    <n-button size="small" @click="showDeepSeaChallengeModal = false">取消</n-button>
                    <n-button
                      size="small"
                      type="primary"
                      :disabled="isRunning || selectedTokens.length === 0"
                      @click="startDeepSeaChallengeModal"
                    >
                      开始挑战
                    </n-button>
                  </div>
                </div>
              </n-modal>
            </n-tab-pane>
            <n-tab-pane name="baoku" tab="宝库">
              <n-space>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchbaoku13', '一键宝库前3层', batchbaoku13)"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库前3层
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchbaoku45', '一键宝库4,5层', batchbaoku45)"
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
                  @click="executeManualTaskWithRecord('climbWeirdTower', '一键爬怪异塔', climbWeirdTower)"
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
                  @click="executeManualTaskWithRecord('batchUseItems', '一键使用怪异塔道具', batchUseItems)"
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
                  @click="executeManualTaskWithRecord('batchMergeItems', '一键怪异塔合成', batchMergeItems)"
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
                  @click="executeManualTaskWithRecord('batchClaimFreeEnergy', '一键领取怪异塔免费道具', batchClaimFreeEnergy)"
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
                  @click="executeManualTaskWithRecord('claim_weird_tower_all', '领取怪异塔宝箱目标特权', claim_weird_tower_all)"
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
                  @click="executeManualTaskWithRecord('claim_weird_tower_pass', '领取怪异塔通行证', claim_weird_tower_pass)"
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
                  @click="executeManualTaskWithRecord('batchOpenDiamondBox', '一键开钻石宝箱', batchOpenDiamondBox)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键开钻石宝箱
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('fragmentPack')"
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
                  @click="executeManualTaskWithRecord('batchClaimBoxPointReward', '领取宝箱积分', batchClaimBoxPointReward)"
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
                  @click="executeManualTaskWithRecord('legion_storebuygoods', '一键购买四圣碎片', legion_storebuygoods)"
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
                  @click="executeManualTaskWithRecord('weekly_market_free_gift', '黑市周免费礼包', weekly_market_free_gift)"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen"
                  :title="!isWeirdTowerActivityOpen ? '仅在黑市周开放期间可用' : ''"
                >
                  黑市周免费礼包
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
                  @click="openCollectionExchangeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  珍宝阁商店购买
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('legionStoreBuySkinCoins', '一键购买俱乐部5皮肤币', legionStoreBuySkinCoins)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买俱乐部5皮肤币
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('legion_buy_red_jade', '一键购买5次红玉', legion_buy_red_jade)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买5次红玉
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchGenieSweep', '一键灯神扫荡', batchGenieSweep)"
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
                  @click="openApexShopModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  逐鹿商店购买
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
                  @click="executeManualTaskWithRecord('batchClaimApexRewards', '领取竞技大厅道具', batchClaimApexRewards)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  领取竞技大厅道具
                </n-button>
                <n-button
                  size="small"
                  @click="openSaltCupBetModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  比赛竞猜
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="pet" tab="宠物">
              <n-space>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('legion_buy_spotted_egg', '一键购买斑点蛋', legion_buy_spotted_egg)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键购买斑点蛋
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('use_spotted_egg', '使用斑点蛋', use_spotted_egg)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  使用斑点蛋
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batch_pet_merge', '宠物合成', batch_pet_merge)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  宠物合成
                </n-button>
                <n-button
                  size="small"
                  type="warning"
                  secondary
                  @click="executeManualTaskWithRecord('egg_merge_cycle', '点蛋+合成', egg_merge_cycle)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  🥚 点蛋+合成
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batch_pet_upgrade', '宠物一键升级', batch_pet_upgrade)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  宠物一键升级
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('claim_pet_book', '宠物领取图鉴奖励', claim_pet_book)"
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
                  @click="executeManualTaskWithRecord('batchHeroUpgrade', '一键英雄升星', batchHeroUpgrade)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键英雄升星
                </n-button>
                <n-popover trigger="click" placement="bottom">
                  <template #trigger>
                    <n-button
                      size="small"
                      :disabled="isRunning || selectedTokens.length === 0"
                    >
                      一键图鉴升星 ▾
                    </n-button>
                  </template>
                  <div style="padding: 4px; min-width: 140px;">
                    <div style="margin-bottom: 8px; font-weight: 500;">选择升星类型：</div>
                    <n-checkbox-group v-model:value="bookUpgradeTypes">
                      <n-space vertical :size="4">
                        <n-checkbox value="hero">英雄升星</n-checkbox>
                        <n-checkbox value="fish">鱼灵升星</n-checkbox>
                        <n-checkbox value="skin">皮肤升星</n-checkbox>
                      </n-space>
                    </n-checkbox-group>
                    <n-button
                      type="primary"
                      size="small"
                      block
                      style="margin-top: 8px;"
                      :disabled="bookUpgradeTypes.length === 0"
                      @click="executeBookUpgrade"
                    >
                      执行
                    </n-button>
                  </div>
                </n-popover>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchFishUpgrade', '一键鱼灵升星', batchFishUpgrade)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键鱼灵升星
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchClaimStarRewards', '一键领取图鉴奖励', batchClaimStarRewards)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键领取图鉴奖励
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchCollectionActivate', '橱窗咸将激活', batchCollectionActivate)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  橱窗咸将激活
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="club" tab="俱乐部">
              <n-space>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchclubsign', '一键俱乐部签到', batchclubsign)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键俱乐部签到
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchLegionSignup', '盐场报名', batchLegionSignup)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  盐场报名
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchClubSignup', '营地报名', batchClubSignup)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  营地报名
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchAirdropChallenge', '营地空投挑战', batchAirdropChallenge)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  营地空投挑战
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchAirdropClaim', '营地奖励领取', batchAirdropClaim)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  营地奖励领取
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchSaltFieldDig', '盐场刨地', batchSaltFieldDig)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  盐场刨地
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchPayloadSignup', '蟠桃报名', batchPayloadSignup)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  蟠桃报名
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('switchSaltFieldPeachFormation', '盐场蟠桃阵容', handleSwitchSaltFieldPeachFormation)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  盐场蟠桃阵容
                </n-button>
                <n-button
                  size="small"
                  @click="openCampChallengeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  营地挑战
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="nightmare" tab="十殿">
              <n-space>
                <n-button
                  size="small"
                  type="warning"
                  @click="executeManualTaskWithRecord('batchNightmareChallenge', '十殿阎罗挑战', batchNightmareChallenge)"
                  :disabled="isRunning"
                >
                  十殿阎罗挑战
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('nightmare_draw_lottery', '十殿抽奖', nightmare_draw_lottery)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  十殿抽奖
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('nightmare_claim_book_reward', '十殿抽奖达标奖励', nightmare_claim_book_reward)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  十殿抽奖达标奖励
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('star_drawturntable', '星级抽奖', star_drawturntable)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  星级抽奖
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batch_star_challenge', '十殿星级挑战', batch_star_challenge)"
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
                  @click="executeManualTaskWithRecord('batchLegacyHangup', '开启残卷挂机', batchLegacyHangup)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  开启残卷挂机
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchLegacyClaim', '批量功法残卷领取', batchLegacyClaim)"
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
                  @click="executeManualTaskWithRecord('batchLegacyClaimGiftTask', '领取残卷赠送奖励', batchLegacyClaimGiftTask)"
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
                  @click="executeManualTaskWithRecord('batchTopUpFish', '一键钓鱼补齐', batchTopUpFish)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  一键钓鱼补齐
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchTopUpArena', '一键竞技场补齐', batchTopUpArena)"
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
                  @click="openApexCheerModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  竞技大厅助威
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('claim_guess_coin', '领取助威币', claim_guess_coin)"
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
                <n-button
                  size="small"
                  @click="openSaltRoadCheerModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  天宫助威
                </n-button>
                <n-button
                  size="small"
                  @click="openApexGuessModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  逐鹿盐山竞猜
                </n-button>
                <n-button
                  size="small"
                  @click="executeManualTaskWithRecord('batchApexGuessClaim', '逐鹿盐山竞猜领奖', batchApexGuessClaim)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  逐鹿盐山竞猜领奖
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="consumeActivity" tab="消耗活动">
              <n-space>
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
                  @click="executeManualTaskWithRecord('batchClaimConsumeRewards', '领取消耗活动道具', batchClaimConsumeRewards)"
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
                  @click="executeManualTaskWithRecord('batchUseActivityItem', '使用消耗活动道具', batchUseActivityItem)"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  使用消耗活动道具
                </n-button>
                <n-button
                  size="small"
                  @click="openActivityExchangeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  消耗活动兑换购买
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
          <div>
            <!-- 分组管理和选择（分组选择区在收起时也保持显示） -->
            <div
              v-if="isTokenListExpanded || tokenGroups.length > 0"
              style="background: #f7f8fa; border-radius: 6px; padding: 8px; margin-bottom: 12px;"
            >
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

              <!-- 分组管理按钮（仅展开时显示） -->
              <div
                v-if="isTokenListExpanded"
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

          <!-- 排序按钮组（仅展开时显示） -->
          <div v-if="isTokenListExpanded" class="sort-buttons" style="margin-top: 16px; margin-bottom: 12px">
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
                  :disabled="batchSettings.autoColumns"
                  @update:value="handleManualColumnChange"
                />
                <n-checkbox
                  :checked="batchSettings.autoColumns"
                  size="small"
                  @update:checked="handleAutoColumnsToggle"
                >
                  <span style="font-size: 12px; color: #666;">自动</span>
                </n-checkbox>
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
                  <n-button size="small" quaternary :type="isTowerExpandedForAll ? 'primary' : 'default'" @click="isTowerExpandedForAll = !isTowerExpandedForAll">
                    {{ isTowerExpandedForAll ? '收起闯关' : '展开闯关' }}
                  </n-button>
                  <n-button size="small" quaternary :type="isCarExpandedForAll ? 'primary' : 'default'" @click="isCarExpandedForAll = !isCarExpandedForAll">
                    {{ isCarExpandedForAll ? '收起赛车' : '展开赛车' }}
                  </n-button>
                  <n-button size="small" quaternary :type="isClimbTowerExpandedForAll ? 'primary' : 'default'" @click="isClimbTowerExpandedForAll = !isClimbTowerExpandedForAll">
                    {{ isClimbTowerExpandedForAll ? '收起爬塔' : '展开爬塔' }}
                  </n-button>
                  <n-button size="small" quaternary :type="isWeirdTowerExpandedForAll ? 'primary' : 'default'" @click="isWeirdTowerExpandedForAll = !isWeirdTowerExpandedForAll">
                    {{ isWeirdTowerExpandedForAll ? '收起怪塔' : '展开怪塔' }}
                  </n-button>
                  <n-divider vertical />
                  <n-tooltip :show-arrow="true">
                    <template #trigger>
                      <n-button size="small" :type="performanceMode ? 'warning' : 'default'" @click="togglePerformanceMode">
                        {{ performanceMode ? '⚡性能模式·开' : '⚡性能模式' }}
                      </n-button>
                    </template>
                    一键关闭卡片详情、收起所有展开区、日志仅渲染最近200条，大幅降低渲染压力（日志数据仍完整保留）
                  </n-tooltip>
                </div>
              </div>
              <n-grid
                :x-gap="12"
                :y-gap="12"
                :cols="responsiveColumns"
              >
                <!-- 搜索用 v-show 控制显隐，保持卡片挂载，避免删除关键词时整列表重新挂载卡顿 -->
                <n-grid-item
                  v-for="token in sortedAllTokens"
                  v-show="searchVisibleTokenIds.has(token.id)"
                  :key="token.id"
                >
                  <TokenCard
                    :token="token"
                    :is-selected="selectedTokens.includes(token.id)"
                    :is-tower-expanded="isTowerExpandedForAll"
                    :is-car-expanded="isCarExpandedForAll"
                    :is-climb-tower-expanded="isClimbTowerExpandedForAll"
                    :is-weird-tower-expanded="isWeirdTowerExpandedForAll"
                    :show-status-tags="showStatusTags"
                    :show-module-grid="showModuleGrid"
                    :show-daily-progress="showDailyProgress"
                    :show-monthly-progress="showMonthlyProgress"
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
              <div class="card-title-row">
                <div class="card-title-main">
                  {{
                    currentRunningTokenName
                      ? `正在执行：${currentRunningTokenName}`
                      : "执行日志"
                  }}
                  <span class="log-count-badge">
                    {{ logs.length }}/{{ batchSettings.maxLogEntries || 1000 }}
                  </span>
                </div>
              </div>
              <div class="log-header-controls">
                <div class="control-group">
                  <n-checkbox v-model:checked="autoScrollLog" size="small">
                    自动滚动
                  </n-checkbox>
                  <n-checkbox v-model:checked="filterErrorsOnly" size="small">
                    只看错误
                  </n-checkbox>
                  <n-tag v-if="errorCount > 0" type="error" size="small" class="error-tag">
                    {{ errorCount }} 个错误
                  </n-tag>
                </div>
                <div class="control-group">
                  <n-button
                    size="small"
                    type="info"
                    ghost
                    @click="openTaskRecordsModal"
                    class="action-btn"
                  >
                    <n-icon><ListOutline /></n-icon>
                    任务完成情况
                  </n-button>
                  <n-button size="small" @click="clearLogs" class="action-btn">
                    <n-icon><TrashOutline /></n-icon>
                    清空日志
                  </n-button>
                  <n-button size="small" @click="copyLogs" class="action-btn">
                    <n-icon><CopyOutline /></n-icon>
                    复制日志
                  </n-button>
                </div>
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
            <!-- ✅ 性能模式日志截断提示 -->
            <div v-if="performanceMode && logs.length > 200" class="log-item info" style="opacity: 0.7">
              <span class="time">⚡</span>
              <span class="message">性能模式：仅渲染最近 200 条日志（共 {{ logs.length }} 条，复制日志仍为完整内容）</span>
            </div>
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

    <!-- 定时任务执行完成情况 Modal -->
    <n-modal
      v-model:show="showTaskRecordsModal"
      preset="card"
      :title="`定时任务执行完成情况 (${sortedTaskRecords.length})`"
      style="width: 90%; max-width: 580px"
    >
      <!-- 头部操作栏 -->
      <div class="tr-header-actions" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #999; font-size: 12px;">最后更新：{{ new Date().toLocaleString('zh-CN') }}</span>
        <n-button size="small" type="error" @click="clearTaskExecutionRecords">
          <n-icon><TrashOutline /></n-icon>
          清空记录
        </n-button>
      </div>

      <!-- 汇总统计卡片 -->
      <div class="tr-summary-bar">
        <div class="tr-stat-card tr-stat-success">
          <span class="tr-stat-num">{{ sortedTaskRecords.filter(r => r.status === 'success').length }}</span>
          <span class="tr-stat-label">已完成</span>
        </div>
        <div class="tr-stat-card tr-stat-partial">
          <span class="tr-stat-num">{{ sortedTaskRecords.filter(r => r.status === 'partial').length }}</span>
          <span class="tr-stat-label">部分完成</span>
        </div>
        <div class="tr-stat-card tr-stat-fail">
          <span class="tr-stat-num">{{ sortedTaskRecords.filter(r => r.status === 'fail').length }}</span>
          <span class="tr-stat-label">失败</span>
        </div>
        <div class="tr-stat-card tr-stat-running">
          <span class="tr-stat-num">{{ sortedTaskRecords.filter(r => r.status === 'running').length }}</span>
          <span class="tr-stat-label">执行中</span>
        </div>
      </div>

      <!-- 当前执行 & 队列状态 -->
      <div class="tr-queue-section" v-if="isScheduledTaskRunning || queueDisplayList.length > 0">
        <div class="tr-queue-title">
          <span class="tr-queue-icon">⏳</span>
          <span>定时任务队列</span>
        </div>
        <!-- 当前正在执行 -->
        <div class="tr-queue-current" v-if="isScheduledTaskRunning && currentScheduledTaskDisplay">
          <div class="tr-queue-label">执行中：</div>
          <div class="tr-queue-task">
            <span class="tr-dot-running"></span>
            <span class="tr-queue-task-name">{{ currentScheduledTaskDisplay.name }}</span>
            <span class="tr-queue-task-time">{{ currentScheduledTaskDisplay.runTime }}</span>
          </div>
        </div>
        <!-- 排队等待列表 -->
        <div class="tr-queue-waiting" v-if="queueDisplayList.length > 0">
          <div class="tr-queue-label">等待中 ({{ queueDisplayList.length }})：</div>
          <div class="tr-queue-list">
            <div
              v-for="item in queueDisplayList"
              :key="item.id"
              class="tr-queue-item"
            >
              <span class="tr-queue-index">{{ item.index }}</span>
              <span class="tr-queue-task-name">{{ item.name }}</span>
              <span class="tr-queue-task-time">{{ item.runTime }}</span>
            </div>
          </div>
        </div>
        <div class="tr-queue-empty" v-else-if="!isScheduledTaskRunning">
          队列为空
        </div>
      </div>

      <!-- 任务列表 -->
      <div class="tr-list">
        <div
          v-for="(record, index) in sortedTaskRecords"
          :key="`${record.startTime}-${record.name}`"
          class="tr-item"
          :class="`tr-item-${record.status}`"
        >
          <!-- 任务基本信息 -->
          <div class="tr-item-header">
            <div class="tr-item-left">
              <span class="tr-status-dot" :class="`tr-dot-${record.status}`"></span>
              <span class="tr-item-index">{{ index + 1 }}</span>
              <span class="tr-item-name">{{ record.name }}</span>
            </div>
            <div class="tr-item-right">
              <span class="tr-item-time">{{ record.elapsedStr || '执行中...' }}</span>
              <span class="tr-item-badge" :class="`tr-badge-${record.status}`">
                {{ record.status === 'success' ? '已完成' : record.status === 'partial' ? '部分完成' : record.status === 'fail' ? '失败' : '执行中' }}
              </span>
            </div>
          </div>
          
          <!-- 执行时间详情 -->
          <div class="tr-time-details" v-if="record.startTime">
            <div class="tr-time-row">
              <span class="tr-time-label">开始：</span>
              <span class="tr-time-value">{{ formatTime(record.startTime) }}</span>
              <span class="tr-time-label" style="margin-left: 16px;">结束：</span>
              <span class="tr-time-value">{{ record.endTime ? formatTime(record.endTime) : '执行中...' }}</span>
            </div>
            <div class="tr-time-row" v-if="record.scheduledTime">
              <span class="tr-time-label">计划：</span>
              <span class="tr-time-value">{{ formatTime(record.scheduledTime) }}</span>
              <span class="tr-time-label" style="margin-left: 16px;">延迟：</span>
              <span class="tr-time-value" :class="getDelayClass(record)">{{ getDelayText(record) }}</span>
            </div>
          </div>
          
          <!-- 执行进度统计 -->
          <div class="tr-progress-section" v-if="record.totalAccounts > 0">
            <div class="tr-progress-info">
              <span class="tr-progress-text">
                进度：{{ record.successCount + record.failCount }}/{{ record.totalAccounts }}
                <span class="tr-progress-percent">({{ record.progressPercent || 0 }}%)</span>
              </span>
              <span class="tr-progress-stats">
                <span class="tr-stat-success">成功 {{ record.successCount }}</span>
                <span class="tr-stat-fail">失败 {{ record.failCount }}</span>
                <span class="tr-stat-running" v-if="record.runningCount > 0">进行中 {{ record.runningCount }}</span>
              </span>
            </div>
            <div class="tr-progress-bar">
              <div 
                class="tr-progress-fill" 
                :style="{ width: `${record.progressPercent || 0}%` }"
                :class="`tr-progress-${record.status}`"
              ></div>
            </div>
          </div>
          
          <!-- 失败账号详情（可展开） -->
          <div class="tr-failed-accounts" v-if="record.failedAccounts && record.failedAccounts.length > 0">
            <div class="tr-failed-header" @click="record.showFailedDetails = !record.showFailedDetails">
              <span class="tr-failed-toggle">{{ record.showFailedDetails ? '▼' : '▶' }}</span>
              <span class="tr-failed-count">失败账号 ({{ record.failedAccounts.length }})</span>
            </div>
            <div class="tr-failed-list" v-show="record.showFailedDetails">
              <div 
                v-for="(account, idx) in record.failedAccounts" 
                :key="idx"
                class="tr-failed-item"
              >
                <span class="tr-failed-name">{{ typeof account === 'string' ? account : account.name }}</span>
                <span class="tr-failed-error">{{ typeof account === 'string' ? '' : (account.error || '') }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="sortedTaskRecords.length === 0" class="tr-empty">
          暂无执行记录
        </div>
      </div>
    </n-modal>

    <!-- Settings Modal -->
    <n-modal
      v-model:show="showSettingsModal"
      preset="card"
      style="width: 92%; max-width: 600px;"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <template #header>
        <div class="st-modal-header">
          <span class="st-modal-icon">⚙️</span>
          <span>任务设置</span>
          <span class="st-modal-subtitle">{{ currentSettingsTokenName }}</span>
        </div>
      </template>

      <div class="st-settings-body">
        <!-- 阵容配置 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🎯</span>阵容配置</div>
          <div class="st-section-grid">
            <div class="st-field">
              <label class="st-label">竞技场</label>
              <n-select v-model:value="currentSettings.arenaFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">爬塔</label>
              <n-select v-model:value="currentSettings.towerFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">BOSS</label>
              <n-select v-model:value="currentSettings.bossFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">十殿</label>
              <n-select v-model:value="currentSettings.nightmareFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">盐场蟠桃</label>
              <n-select v-model:value="currentSettings.saltFieldPeachFormation" :options="saltFieldFormationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">灯神</label>
              <n-select v-model:value="currentSettings.genieFormation" :options="genieFormationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">深海</label>
              <n-select v-model:value="currentSettings.deepSeaFormation" :options="genieFormationOptions" size="small" />
            </div>
          </div>
        </div>

        <!-- 战斗次数 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">⚔️</span>战斗次数</div>
          <div class="st-section-grid st-grid-2">
            <div class="st-field">
              <label class="st-label">竞技场</label>
              <n-input-number v-model:value="currentSettings.arenaFightCount" :min="1" :max="100" :step="1" size="small" style="width: 100%;" />
            </div>
            <div class="st-field">
              <label class="st-label">俱乐部 BOSS</label>
              <n-select v-model:value="currentSettings.bossTimes" :options="bossTimesOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">每日 BOSS</label>
              <n-select v-model:value="currentSettings.dailyBossTimes" :options="dailyBossTimesOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">星级挑战每关最大尝试次数</label>
              <n-input-number v-model:value="currentSettings.starChallengeAttempts" :min="1" :max="5" :step="1" size="small" style="width: 100;" />
              <div class="st-hint">默认 3 次，总 5 次，建议根据账号实力调整（1-5 次）</div>
            </div>
          </div>
        </div>

        <!-- 功能开关 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🔔</span>功能开关</div>
          <div class="st-switch-grid">
            <div class="st-switch-item">
              <span class="st-switch-text">领罐子</span>
              <n-switch v-model:value="currentSettings.claimBottle" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">领挂机</span>
              <n-switch v-model:value="currentSettings.claimHangUp" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">竞技场</span>
              <n-switch v-model:value="currentSettings.arenaEnable" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">开宝箱</span>
              <n-switch v-model:value="currentSettings.openBox" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">邮件奖励</span>
              <n-switch v-model:value="currentSettings.claimEmail" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">黑市购买</span>
              <n-switch v-model:value="currentSettings.blackMarketPurchase" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">付费招募</span>
              <n-switch v-model:value="currentSettings.payRecruit" size="small" />
            </div>
          </div>
        </div>

        <!-- 黑市采购清单 -->
        <div class="st-section">
          <div
            class="st-section-title st-section-title-collapsible"
            @click="purchaseListCollapsed = !purchaseListCollapsed"
          >
            <div class="st-section-title-left">
              <span class="st-section-icon">🛒</span>
              <span>黑市采购清单</span>
              <span class="st-section-badge">
                已选 {{ (currentSettings.purchaseList || []).length }} 项
              </span>
            </div>
            <span class="st-section-toggle">{{ purchaseListCollapsed ? '▼' : '▲' }}</span>
          </div>
          <div v-show="!purchaseListCollapsed" class="purchase-list-content">
            <div class="purchase-config-bar">
              <div class="purchase-config-field">
                <label class="st-label">采购次数</label>
                <n-input-number v-model:value="currentSettings.purchaseCnt" :min="1" :max="15" :step="1" size="small" style="width: 80px;" />
              </div>
              <div class="purchase-config-actions">
                <n-button size="tiny" @click="currentSettings.purchaseList = purchaseItemOptions.map(i => i.itemId)">全选</n-button>
                <n-button size="tiny" @click="currentSettings.purchaseList = []">清空</n-button>
                <n-button size="tiny" type="primary" :loading="syncPurchaseBusy" @click="syncPurchaseToGame" :disabled="(currentSettings.purchaseList || []).length === 0">
                  同步到游戏
                </n-button>
              </div>
            </div>
            <div class="purchase-list-grid">
              <label
                v-for="item in purchaseItemOptions"
                :key="item.itemId"
                class="purchase-item-label"
                :class="{ 'is-checked': (currentSettings.purchaseList || []).includes(item.itemId) }"
              >
                <input
                  type="checkbox"
                  :checked="(currentSettings.purchaseList || []).includes(item.itemId)"
                  @change="togglePurchaseItem(currentSettings.purchaseList, currentSettings.purchaseDiscounts, item.itemId)"
                />
                <span>{{ item.name }}</span>
                <input
                  type="number"
                  class="discount-input"
                  :value="getDiscount(currentSettings.purchaseDiscounts, item.itemId)"
                  @input="(e) => setDiscount(currentSettings.purchaseDiscounts, item.itemId, e.target.value)"
                  min="1"
                  max="10"
                  :disabled="!(currentSettings.purchaseList || []).includes(item.itemId)"
                />
                <span class="discount-unit">折</span>
              </label>
            </div>
            <div class="purchase-config-hint">勾选商品并设置折扣，保存设置后可在黑市购买任务中自动采购</div>
          </div>
        </div>

        <!-- 安全设置 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🔐</span>安全设置</div>
          <div class="st-field st-field-full">
            <label class="st-label">功法赠送验证密码</label>
            <n-input
              v-model:value="currentSettings.legacyGiftPassword"
              placeholder="留空则使用手动输入"
              type="password"
              show-password-on="click"
              size="small"
            />
          </div>
        </div>

        <!-- 赛车改装策略 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🏎️</span>赛车改装策略</div>
          <div class="st-field st-field-full">
            <label class="st-label">升级策略</label>
            <n-radio-group v-model:value="currentSettings.carUpgradeStrategy" name="carUpgradeGroup">
              <n-grid :cols="1" :x-gap="8" :y-gap="8">
                <n-grid-item>
                  <n-radio value="score" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">积分优先（默认）</div>
                      <div style="font-size: 12px; color: #888; margin-top: 4px;">升级到 4002 累计消耗分后停止；赛季最后一天若可达 5000 则冲刺，否则只收到刚好 4002</div>
                    </div>
                  </n-radio>
                </n-grid-item>
                <n-grid-item>
                  <n-radio value="rank" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">排名优先</div>
                      <div style="font-size: 12px; color: #888; margin-top: 4px;">车辆全收，按门控顺序把发动机→车架→悬架→雷达逐个升满 60 级，不设积分上限</div>
                    </div>
                  </n-radio>
                </n-grid-item>
              </n-grid>
            </n-radio-group>
          </div>
        </div>

        <!-- 智能发车预设护卫成员 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🚢</span>智能发车预设护卫</div>
          <div class="st-helper-bar">
            <n-button size="tiny" :loading="settingsHelperLoading" @click="loadSettingsHelperMembers">
              {{ settingsHelperMembers.length > 0 ? '刷新成员' : '加载成员' }}
            </n-button>
            <span v-if="settingsHelperMembers.length > 0" class="st-helper-count">
              已选 {{ (currentSettings.helperPresets || []).length }} / {{ settingsHelperMembers.length }} 人
            </span>
          </div>
          <div v-if="settingsHelperMembers.length > 0" class="st-helper-tags">
            <n-tag
              v-for="member in settingsHelperMembers"
              :key="member.id"
              :type="(currentSettings.helperPresets || []).includes(member.id) ? 'success' : 'default'"
              :bordered="false"
              size="small"
              style="cursor: pointer;"
              @click="toggleSettingsHelper(member.id)"
            >
              {{ member.name }}
            </n-tag>
          </div>
          <div v-else class="st-helper-hint">
            加载俱乐部成员后勾选预设护卫，智能发车时优先使用
          </div>
        </div>
      </div>

      <template #footer>
        <div class="st-modal-footer">
          <n-button type="primary" block @click="saveSettings">保存设置</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Task Template Modal -->
    <n-modal
      v-model:show="showTaskTemplateModal"
      preset="card"
      style="width: 92%; max-width: 600px;"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <template #header>
        <div class="st-modal-header">
          <span class="st-modal-icon">📋</span>
          <span>{{ currentTemplateId ? '编辑任务模板' : '任务模板设置' }}</span>
        </div>
      </template>

      <div class="st-settings-body">
        <!-- 模板名称 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">📝</span>模板信息</div>
          <div class="st-field st-field-full">
            <label class="st-label">模板名称</label>
            <n-input v-model:value="currentTemplateName" placeholder="请输入模板名称" size="small" />
          </div>
        </div>

        <!-- 阵容配置 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🎯</span>阵容配置</div>
          <div class="st-section-grid">
            <div class="st-field">
              <label class="st-label">竞技场</label>
              <n-select v-model:value="currentTemplate.arenaFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">爬塔</label>
              <n-select v-model:value="currentTemplate.towerFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">BOSS</label>
              <n-select v-model:value="currentTemplate.bossFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">十殿</label>
              <n-select v-model:value="currentTemplate.nightmareFormation" :options="formationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">盐场蟠桃</label>
              <n-select v-model:value="currentTemplate.saltFieldPeachFormation" :options="saltFieldFormationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">灯神</label>
              <n-select v-model:value="currentTemplate.genieFormation" :options="genieFormationOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">深海</label>
              <n-select v-model:value="currentTemplate.deepSeaFormation" :options="genieFormationOptions" size="small" />
            </div>
          </div>
        </div>

        <!-- 战斗次数 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">⚔️</span>战斗次数</div>
          <div class="st-section-grid st-grid-2">
            <div class="st-field">
              <label class="st-label">竞技场</label>
              <n-input-number v-model:value="currentTemplate.arenaFightCount" :min="1" :max="100" :step="1" size="small" style="width: 100;" />
            </div>
            <div class="st-field">
              <label class="st-label">俱乐部 BOSS</label>
              <n-select v-model:value="currentTemplate.bossTimes" :options="bossTimesOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">每日 BOSS</label>
              <n-select v-model:value="currentTemplate.dailyBossTimes" :options="dailyBossTimesOptions" size="small" />
            </div>
            <div class="st-field">
              <label class="st-label">星级挑战每关最大尝试次数</label>
              <n-input-number v-model:value="currentTemplate.starChallengeAttempts" :min="1" :max="5" :step="1" size="small" style="width: 100;" />
              <div class="st-hint">默认 3 次，总 5 次</div>
            </div>
          </div>
        </div>

        <!-- 功能开关 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🔔</span>功能开关</div>
          <div class="st-switch-grid">
            <div class="st-switch-item">
              <span class="st-switch-text">领罐子</span>
              <n-switch v-model:value="currentTemplate.claimBottle" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">领挂机</span>
              <n-switch v-model:value="currentTemplate.claimHangUp" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">竞技场</span>
              <n-switch v-model:value="currentTemplate.arenaEnable" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">开宝箱</span>
              <n-switch v-model:value="currentTemplate.openBox" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">邮件奖励</span>
              <n-switch v-model:value="currentTemplate.claimEmail" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">黑市购买</span>
              <n-switch v-model:value="currentTemplate.blackMarketPurchase" size="small" />
            </div>
            <div class="st-switch-item">
              <span class="st-switch-text">付费招募</span>
              <n-switch v-model:value="currentTemplate.payRecruit" size="small" />
            </div>
          </div>
        </div>

        <!-- 安全设置 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🔐</span>安全设置</div>
          <div class="st-field st-field-full">
            <label class="st-label">功法赠送验证密码</label>
            <n-input
              v-model:value="currentTemplate.legacyGiftPassword"
              placeholder="留空则使用手动输入"
              type="password"
              show-password-on="click"
              size="small"
            />
          </div>
        </div>

        <!-- 赛车改装策略 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🏎️</span>赛车改装策略</div>
          <div class="st-field st-field-full">
            <label class="st-label">升级策略</label>
            <n-radio-group v-model:value="currentTemplate.carUpgradeStrategy" name="carUpgradeGroup">
              <n-grid :cols="1" :x-gap="8" :y-gap="8">
                <n-grid-item>
                  <n-radio value="score" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">积分优先（默认）</div>
                      <div style="font-size: 12px; color: #888; margin-top: 4px;">升级到 4002 累计消耗分后停止；赛季最后一天若可达 5000 则冲刺，否则只收到刚好 4002</div>
                    </div>
                  </n-radio>
                </n-grid-item>
                <n-grid-item>
                  <n-radio value="rank" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600;">排名优先</div>
                      <div style="font-size: 12px; color: #888; margin-top: 4px;">车辆全收，按门控顺序把发动机→车架→悬架→雷达逐个升满 60 级，不设积分上限</div>
                    </div>
                  </n-radio>
                </n-grid-item>
              </n-grid>
            </n-radio-group>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="st-modal-footer">
          <n-button @click="showTaskTemplateModal = false" style="flex: 1;">取消</n-button>
          <n-button @click="saveTaskTemplate" type="primary" style="flex: 1;">保存模板</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Apply Template Modal -->
    <n-modal
      v-model:show="showApplyTemplateModal"
      preset="card"
      style="width: 92%; max-width: 600px"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <template #header>
        <div class="st-modal-header">
          <span class="st-modal-icon">📌</span>
          <span>应用任务模板</span>
        </div>
      </template>

      <div class="st-settings-body">
        <!-- 选择模板 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">📋</span>选择模板</div>
          <div class="st-field st-field-full">
            <n-select
              v-model:value="selectedTemplateId"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="请选择要应用的模板"
              size="small"
            />
          </div>
        </div>

        <!-- 选择账号 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">👤</span>选择账号</div>

          <!-- 分组快速选择 -->
          <div class="apply-group-bar">
            <span class="apply-group-label">快速选择分组</span>
            <div class="apply-group-tags">
              <n-button
                v-for="group in tokenGroups"
                :key="group.id"
                size="tiny"
                @click="() => { const groupTokenIds = getValidGroupTokenIds(group.id); groupTokenIds.forEach((id) => { if (!selectedTokensForApply.includes(id)) selectedTokensForApply.push(id); }); }"
                :style="{ borderColor: group.color, color: group.color }"
                ghost
              >
                {{ group.name }}
              </n-button>
              <div v-if="tokenGroups.length === 0" class="apply-group-empty">暂无分组</div>
            </div>
          </div>

          <div class="apply-select-all">
            <n-checkbox
              :checked="isAllSelectedForApply"
              :indeterminate="isIndeterminateForApply"
              @update:checked="handleSelectAllForApply"
            >全选</n-checkbox>
          </div>
          <n-checkbox-group v-model:value="selectedTokensForApply" class="apply-token-grid">
            <n-grid :cols="2" :x-gap="8" :y-gap="6">
              <n-grid-item v-for="token in sortedTokens" :key="token.id">
                <n-checkbox :value="token.id" class="apply-token-item">{{ token.name }}</n-checkbox>
              </n-grid-item>
            </n-grid>
          </n-checkbox-group>
        </div>
      </div>

      <template #footer>
        <div class="st-modal-footer">
          <n-button @click="showApplyTemplateModal = false" style="flex: 1;">取消</n-button>
          <n-button
            @click="applyTemplate"
            type="success"
            style="flex: 1;"
            :disabled="!selectedTemplateId || selectedTokensForApply.length === 0"
          >应用模板</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Template Manager Modal -->
    <n-modal
      v-model:show="showTemplateManagerModal"
      preset="card"
      style="width: 92%; max-width: 920px"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <template #header>
        <div class="st-modal-header">
          <span class="st-modal-icon">📋</span>
          <span>任务模板管理</span>
          <span class="st-modal-subtitle">共 {{ filteredTaskTemplates.length }} 个模板</span>
        </div>
      </template>

      <div class="template-manager">
        <!-- 操作栏 -->
        <div class="template-toolbar">
          <n-space wrap>
            <n-button type="primary" size="small" @click="openNewTemplateModal">
              <template #icon><n-icon><AddCircleOutline /></n-icon></template>
              新增
            </n-button>
            <n-button type="success" size="small" @click="openApplyTemplateModal">
              <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
              应用
            </n-button>
            <n-button type="info" size="small" @click="openAccountTemplateModal">
              <template #icon><n-icon><ListOutline /></n-icon></template>
              引用
            </n-button>
            <n-button size="small" @click="exportTaskTemplates" :loading="isExporting">
              <template #icon><n-icon><CloudDownloadOutline /></n-icon></template>
              导出
            </n-button>
            <n-upload :show-file-list="false" accept=".json" :custom-request="importTaskTemplates">
              <n-button size="small" :loading="isImporting">
                <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
                导入
              </n-button>
            </n-upload>
          </n-space>
          <n-input
            v-model:value="templateSearchKeyword"
            placeholder="搜索模板名称..."
            clearable
            size="small"
            style="width: 180px"
          >
            <template #prefix><n-icon><SearchOutline /></n-icon></template>
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
              <n-icon :size="48" color="#c0c4cc"><DocumentTextOutline /></n-icon>
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
                  <span class="template-time">{{ formatDate(template.updatedAt || template.createdAt) }}</span>
                  <n-space>
                    <n-button size="small" text @click.stop="openEditTemplateModal(template)">
                      <template #icon><n-icon><CreateOutline /></n-icon></template>编辑
                    </n-button>
                    <n-button size="small" text type="error" @click.stop="deleteTaskTemplate(template.id)">
                      <template #icon><n-icon><TrashOutline /></n-icon></template>删除
                    </n-button>
                  </n-space>
                </div>
              </template>
            </n-card>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="st-modal-footer">
          <n-button @click="showTemplateManagerModal = false" style="margin-left: auto;">关闭</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Account Template References Modal -->
    <n-modal
      v-model:show="showAccountTemplateModal"
      preset="card"
      style="width: 92%; max-width: 800px"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <template #header>
        <div class="st-modal-header">
          <span class="st-modal-icon">📊</span>
          <span>账号模板引用查看</span>
          <span class="st-modal-subtitle">共 {{ filteredAccountTemplates.length }} 个账号</span>
        </div>
      </template>

      <div class="st-settings-body">
        <!-- 筛选与操作 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">🔍</span>筛选与操作</div>
          <div class="account-ref-bar">
            <div class="account-ref-actions">
              <n-button @click="exportAccountReferences" type="default" size="small" :loading="isExporting">
                导出引用
              </n-button>
              <n-upload :show-file-list="false" accept=".json" :custom-request="importAccountReferences">
                <n-button type="default" size="small" :loading="isImporting">导入引用</n-button>
              </n-upload>
            </div>
            <div class="account-ref-filter">
              <label class="st-label">按模板筛选</label>
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
        </div>

        <!-- 账号列表 -->
        <div class="st-section">
          <div class="st-section-title"><span class="st-section-icon">👤</span>账号列表</div>
          <div class="account-template-list" style="max-height: 400px; overflow-y: auto;">
            <n-card
              v-for="item in filteredAccountTemplates"
              :key="item.tokenId"
              size="small"
              class="account-ref-card"
            >
              <div class="account-ref-row">
                <span class="account-ref-name">{{ item.tokenName }}</span>
                <n-tag :type="item.templateId ? 'success' : 'default'" size="small">
                  {{ item.templateName }}
                </n-tag>
              </div>
            </n-card>
            <div v-if="filteredAccountTemplates.length === 0" class="account-ref-empty">
              暂无账号数据
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="st-modal-footer">
          <n-button @click="showAccountTemplateModal = false" style="margin-left: auto;">关闭</n-button>
        </div>
      </template>
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
              @update:value="checkBoxCount"
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
          <div class="setting-item" v-if="helperType === 'fragmentPack'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">选择要开启的碎片礼包（可多选）</label>
            <n-checkbox-group v-model:value="helperSettings.fragmentPackItems">
              <n-space item-style="display: flex;" vertical>
                <n-checkbox :value="3007">随机红将碎片</n-checkbox>
                <n-checkbox :value="3005">随机紫将碎片</n-checkbox>
                <n-checkbox :value="3006">随机橙将碎片</n-checkbox>
                <n-checkbox :value="3008">精铁福袋</n-checkbox>
                <n-checkbox :value="3009">进阶石福袋</n-checkbox>
                <n-checkbox :value="3011">白玉福袋</n-checkbox>
                <n-checkbox :value="3012">扳手福袋</n-checkbox>
                <n-checkbox :value="35011">赛车改装礼盒</n-checkbox>
                <n-checkbox :value="3001">金币礼包</n-checkbox>
                <n-checkbox :value="3002">金砖礼包</n-checkbox>
                <n-checkbox :value="3010">晶石福袋</n-checkbox>
                <n-checkbox :value="37005">怪异礼包</n-checkbox>
              </n-space>
            </n-checkbox-group>
          </div>
          <n-alert v-if="helperType === 'fragmentPack'" type="info" style="margin-bottom: 12px">
            碎片礼包说明：<br/>
            • 开启账号背包中拥有的对应礼包<br/>
            • 每种礼包每次最多开启999个，超出分批开启<br/>
            • 未选中则默认开启全部12种礼包
          </n-alert>
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
            <label class="setting-label">消耗数量（10 的倍数）</label>
            <n-input-number
              v-model:value="helperSettings.count"
              :min="10"
              :max="10000"
              :step="10"
              size="small"
              @update:value="checkBoxCount"
            />
            <span v-if="boxCountInfo" style="margin-left: 12px; color: #888; font-size: 13px;">→ 背包有 {{ boxCountInfo }}</span>
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
            <n-input-number v-model:value="item.count" :min="0" :max="item.limit" size="small"
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

<!-- 逐鹿商店购买 Modal -->
    <n-modal
      v-model:show="showApexShopModal"
      preset="card"
      title="逐鹿商店购买配置"
      style="width: 90%; max-width: 500px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 12px">
          勾选需要购买的商品并设置次数，盐山金币不足时将自动停止购买。
        </n-alert>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="item in apexShopConfig" :key="item.id"
               style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <n-checkbox v-model:checked="item._checked"
                        @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }" />
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ item.name }}</div>
              <div style="font-size: 12px; color: #888;">{{ item.cost }}盐山金币/次 · 限购{{ item.limit }}次</div>
            </div>
            <n-input-number v-model:value="item.count" :min="0" :max="item.limit" size="small"
                            style="width: 100px;"
                            @update:value="(val) => { item._checked = val > 0; }" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showApexShopModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeApexShopBuy" :disabled="isRunning">开始购买</n-button>
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
        <n-grid :cols="gridCols" :x-gap="10" :y-gap="8">
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

    <!-- 珍宝阁商店购买 Modal -->
    <n-modal
      v-model:show="showCollectionExchangeModal"
      preset="card"
      title="珍宝阁商店购买配置"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 14px">
          勾选需要购买的商品并设置次数，使用图鉴积分兑换，每周限购。
        </n-alert>
        <n-grid :cols="gridCols" :x-gap="10" :y-gap="8">
          <n-grid-item v-for="item in collectionExchangeConfig" :key="item.value">
            <div class="manual-buy-item" :class="{ 'is-checked': item._checked }">
              <n-checkbox v-model:checked="item._checked"
                          @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }">
                <span class="manual-buy-label">{{ item.label }}</span>
              </n-checkbox>
              <n-input-number v-if="item._checked"
                              v-model:value="item.count" :min="1" :max="item.maxCount" size="tiny"
                              style="width: 72px;"
                              @update:value="(val) => { if (val <= 0) item._checked = false; }" />
            </div>
          </n-grid-item>
        </n-grid>
        <div style="margin-top: 12px; padding: 8px 12px; background: #f5f5f5; border-radius: 6px; font-size: 13px; color: #666;">
          已选 {{ collectionExchangeConfig.filter(i => i._checked && i.count > 0).length }} 个商品
        </div>
        <div class="modal-actions" style="margin-top: 16px; text-align: right">
          <n-button @click="showCollectionExchangeModal = false" style="margin-right: 12px">取消</n-button>
          <n-button type="primary" @click="executeCollectionExchange" :disabled="isRunning">开始购买</n-button>
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
            <n-grid :cols="dreamGridCols" :x-gap="12" :y-gap="8">
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
          type="primary"
          @click="selectAllTokensForAllTasks"
        >
          <template #icon>
            <n-icon><CheckmarkCircleOutline /></n-icon>
          </template>
          全选账号
        </n-button>
        <n-button
          size="small"
          type="warning"
          @click="clearAllTokensForAllTasks"
        >
          <template #icon>
            <n-icon><CloseCircleOutline /></n-icon>
          </template>
          取消账号
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
              <div class="task-header-actions">
                <n-switch
                  :value="task.selectedTokens.length > 0"
                  @update:value="(val) => val ? selectAllTokensForTask(task) : clearAllTokensForTask(task)"
                  size="small"
                  class="feature-switch"
                >
                  <template #checked>全选</template>
                  <template #unchecked>取消</template>
                </n-switch>
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
            </div>

            <!-- 任务信息 -->
            <div class="task-card-body">
              <div class="task-info-grid">
                <div class="task-info-item">
                  <span class="info-label">运行类型</span>
                  <span class="info-value">
                    <n-tag size="small" :type="task.taskType === 'push_map' ? 'success' : (task.runType === 'daily' ? 'blue' : 'purple')" :bordered="false">
                      {{ task.taskType === 'push_map' ? '🗺️批量推图' : (task.runType === "daily" ? "每天固定时间" : "Cron表达式") }}
                    </n-tag>
                  </span>
                </div>

                <!-- 推图任务：展示开始/停止时间 -->
                <template v-if="task.taskType === 'push_map'">
                  <div class="task-info-item">
                    <span class="info-label">开始时间</span>
                    <span class="info-value code">{{ task.pushStartTime || task.runTime }}</span>
                  </div>
                  <div class="task-info-item" v-if="task.pushStopTime">
                    <span class="info-label">停止时间</span>
                    <span class="info-value code" style="color:#ff4d4f;">{{ task.pushStopTime }}</span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">下次开始</span>
                    <span class="info-value countdown" :class="{'near-execution': taskCountdowns[task.id]?.isNearExecution, 'disabled': !task.enabled}">
                      {{ task.enabled ? (taskCountdowns[task.id]?.formatted || "计算中...") : "已禁用" }}
                    </span>
                  </div>
                </template>

                <!-- 普通任务：展示运行时间/下次执行/账号数/任务数 -->
                <template v-else>
                  <div class="task-info-item">
                    <span class="info-label">运行时间</span>
                    <span class="info-value code">
                      {{ task.runType === "daily" ? task.runTime : task.cronExpression }}
                    </span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">下次执行</span>
                    <span class="info-value countdown" :class="{'near-execution': taskCountdowns[task.id]?.isNearExecution, 'disabled': !task.enabled}">
                      {{ task.enabled ? (taskCountdowns[task.id]?.formatted || "计算中...") : "已禁用" }}
                    </span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">选中账号</span>
                    <span class="info-value">
                      <n-tag size="small" type="info" :bordered="false">
                        {{ task.selectedTokens.length }} 个
                      </n-tag>
                      <n-button
                        size="tiny"
                        text
                        @click="openAccountSelector(task)"
                        style="margin-left: 8px; padding: 0 6px;"
                      >
                        <template #icon>
                          <n-icon><Person /></n-icon>
                        </template>
                        选择
                      </n-button>
                    </span>
                  </div>
                  <div class="task-info-item" v-if="task.maxActive > 0">
                    <span class="info-label">并发执行</span>
                    <span class="info-value">
                      <n-tag size="small" type="warning" :bordered="false">
                        {{ task.maxActive }} 个并发
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
                
                <!-- 珍宝阁商店购买配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('collection_exchange') && task.collectionExchangeItems">
                  <span class="info-label">珍宝阁购买</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.collectionExchangeItems).filter(i => i && i.selected).length }} 件商品
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
                
                <!-- 碎片礼包配置 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchOpenFragmentPacks') && task.fragmentPackItems">
                  <span class="info-label">碎片礼包</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ task.fragmentPackItems.length }} 种礼包
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
                </template><!-- end v-else normal task -->
              </div>
            </div><!-- end task-card-body -->

            <!-- 快捷并发控制（独立行） -->
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-top: 1px solid #e8eaed; background: #fafbfc;">
              <span style="font-size: 12px; opacity: 0.65; white-space: nowrap;">⚡ 并发数</span>
              <n-input-number
                :value="task.maxActive || 0"
                @update:value="(val) => updateTaskMaxActive(task, val)"
                :min="0"
                :max="50"
                :step="1"
                size="tiny"
                style="width: 90px;"
              />
              <span style="font-size: 11px; opacity: 0.5;">0=全局</span>
            </div>

            <!-- 任务操作 -->
            <div class="task-card-footer">
              <n-button size="small" @click="editTask(task)">
                <template #icon>
                  <n-icon><CreateOutline /></n-icon>
                </template>
                编辑
              </n-button>
              <n-button size="small" @click="copyTask(task)">
                <template #icon>
                  <n-icon><CopyOutline /></n-icon>
                </template>
                复制
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

    <!-- Account Selector Modal -->
    <n-modal
      v-model:show="showAccountSelectorModal"
      preset="card"
      title="👥 选择执行账号"
      style="width: 95%; max-width: 700px;"
      :segmented="{ content: true }"
    >
      <div v-if="currentTask" class="account-selector-container account-selector-content">
        <!-- 当前任务信息 -->
        <n-alert type="info" style="margin-bottom: 16px; border-radius: 8px;">
          <strong>当前任务：</strong> {{ currentTask.name }}
          <br />
          <span style="font-size: 12px; opacity: 0.7;">选中账号数：{{ currentTask.selectedTokens.length }}个</span>
        </n-alert>

        <!-- 分组筛选 -->
        <div class="group-filter-section" style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
            <span class="info-label">分组筛选：</span>
            <n-button
              size="small"
              :type="!selectedGroupNames || selectedGroupNames.size === 0 ? 'primary' : 'default'"
              @click="clearGroupFilterSelection"
            >
              全部
            </n-button>
            <n-button
              v-for="{ name, count } in getUniqueGroupNames"
              :key="name"
              size="small"
              :type="selectedGroupNames && selectedGroupNames.has(name) ? 'primary' : 'default'"
              @click="toggleGroupSelectionLogic(name)"
            >
              {{ name }} ({{ count }})
            </n-button>
          </div>
          
          <div class="account-selector-actions" style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
            <n-button
              size="small"
              type="success"
              @click="selectAllVisibleTokens"
            >
              <template #icon>
                <n-icon><CheckmarkCircleOutline /></n-icon>
              </template>
              全选可见
            </n-button>
            <n-button
              size="small"
              type="warning"
              @click="clearVisibleTokens"
            >
              <template #icon>
                <n-icon><CloseCircleOutline /></n-icon>
              </template>
              清空可见
            </n-button>
            <n-button
              size="small"
              class="account-selector-actions-shrink"
              style="margin-left: auto;"
              @click="selectByTokenGroup"
            >
              <template #icon>
                <n-icon><TeamOutline /></n-icon>
              </template>
              按分组勾选
            </n-button>
          </div>
        </div>

        <!-- 账号列表 -->
        <n-list style="max-height: 400px; overflow-y: auto;">
          <n-list-item
            v-for="token in filteredTokens"
            :key="token.id"
          >
            <n-checkbox
              :checked="currentTask.selectedTokens.includes(token.id)"
              @update:checked="(checked) => toggleTokenSelection(token.id, checked)"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div>
                  <div>{{ token.name || token.id.slice(0, 8) }}</div>
                  <div style="font-size: 12px; opacity: 0.6;">
                    {{ token.group || '未分组' }} - {{ token.token ? (token.token.length > 30 ? token.token.substring(0, 10) + '...' : token.token) : '无 Token' }}
                  </div>
                </div>
              </div>
            </n-checkbox>
          </n-list-item>
        </n-list>

        <!-- 统计信息 -->
        <div class="account-selector-stats" style="margin-top: 16px; text-align: right; font-size: 14px; color: var(--text-tertiary);">
          已选：{{ currentTask.selectedTokens.length }} 个 | 
          可见：{{ filteredTokens.length }} 个 | 
          分组：{{ selectedGroup || '全部' }}
        </div>

        <!-- 保存按钮 -->
        <div class="account-selector-footer" style="margin-top: 20px; text-align: right;">
          <n-button @click="showAccountSelectorModal = false" class="account-selector-footer-cancel" style="margin-right: 12px;">取消</n-button>
          <n-button type="primary" @click="saveAccountSelection">保存选择</n-button>
        </div>
      </div>
    </n-modal>
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
              <label class="setting-label">任务类型</label>
              <n-radio-group v-model:value="taskForm.taskType">
                <n-radio-button value="normal">📌普通任务</n-radio-button>
                <n-radio-button value="push_map">🗺️批量推图</n-radio-button>
              </n-radio-group>
            </div>
            
            <!-- 推图任务：开始 / 停止时间配置 -->
            <template v-if="taskForm.taskType === 'push_map'">
              <div class="setting-item">
                <label class="setting-label">开始推图时间</label>
                <n-time-picker v-model:value="taskForm.pushStartTime" format="HH:mm" size="large" placeholder="选择开始推图时刻" />
              </div>
              <div class="setting-item">
                <label class="setting-label">停止推图时间 <span style="color:#999;font-size:12px;">(可不填)</span></label>
                <n-time-picker v-model:value="taskForm.pushStopTime" format="HH:mm" size="large" placeholder="选择停止推图时刻（可选）" :clearable="true" />
              </div>
              <n-alert type="info" size="small">
                💬 推图任务使用「批量推图」弹窗中已勾选的账号。请先在批量推图弹窗中配置好火把和账号，再添加本定时任务。
              </n-alert>
            </template>

            <!-- 普通任务：运行类型选择 -->
            <template v-if="taskForm.taskType !== 'push_map'">
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
            </template><!-- end normal runType -->
          </div>
        </div>
        <!-- 任务级并发控制 -->
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
          <div class="section-title">⚡ 并发控制</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 13px; color: var(--text-secondary); white-space: nowrap;">并发数：</span>
            <n-input-number
              v-model:value="taskForm.maxActive"
              :min="0"
              :max="50"
              :step="1"
              size="small"
              style="width: 140px;"
              placeholder="0"
            />
            <span style="font-size: 12px; color: var(--text-tertiary); line-height: 1.4;">
              {{ taskForm.maxActive > 0 ? `使用 ${taskForm.maxActive} 个并发执行此任务` : '使用全局设置（当前 ' + batchSettings.maxActive + '）' }}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px; opacity: 0.8;">
            设置为 0 则跟随全局「最大并发数」设置，适用于希望某个定时任务单独控制执行速度的场景
          </div>
        </div>
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
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
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
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
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8" style="padding-top: 12px;">
                  <n-grid-item v-for="task in groupedAvailableTasks[group.name]" :key="task.value">
                    <n-checkbox :value="task.value" size="large">{{ taskLabels[task.value] || task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
              
              <n-tab-pane 
                v-if="groupedAvailableTasks['other'] && groupedAvailableTasks['other'].length > 0" 
                name="other" 
                tab="其他"
              >
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8" style="padding-top: 12px;">
                  <n-grid-item v-for="task in groupedAvailableTasks['other']" :key="task.value">
                    <n-checkbox :value="task.value" size="large">{{ taskLabels[task.value] || task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
            </n-tabs>
          </n-checkbox-group>
          
          <!-- 竞技场战斗次数配置 -->
          <div v-if="taskForm.selectedTasks.includes('batcharenafight')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⚔️ 竞技场战斗 - 配置战斗次数</span>
            </div>
            <div class="config-card-content">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="white-space: nowrap; font-size: 13px;">战斗次数：</span>
                <n-input-number
                  v-model:value="taskForm.arenaFightCount"
                  :min="1"
                  :max="100"
                  :step="1"
                  size="small"
                  style="width: 120px;"
                />
                <span style="font-size: 13px; color: var(--text-secondary);">
                  次（1-100，当前门票不足时以实际门票数量为准）
                </span>
              </div>
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                <n-button
                  v-for="count in [1, 3, 5, 8, 10]"
                  :key="count"
                  size="small"
                  @click="taskForm.arenaFightCount = count"
                >
                  {{ count }}次
                </n-button>
              </div>
            </div>
          </div>

          <!-- 灯神挑战配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchGenieChallenge')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🧞 灯神挑战 - 选择势力与阵容</span>
            </div>
            <div class="config-card-content">
              <div style="font-size: 12px; line-height: 1.6; color: #e6a23c; background: rgba(230,162,60,0.12); border: 1px solid rgba(230,162,60,0.35); border-radius: 4px; padding: 6px 8px; margin-bottom: 10px;">
                请先在游戏内设置好灯神阵容，并在灯神挑战界面进行预设阵容调整后挑战一次。后续通过账号设置中的"灯神预设阵容"选择阵容，再勾选对应势力进行挑战。
              </div>
              <div style="margin-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">挑战势力</div>
                <n-checkbox-group v-model:value="taskForm.genieChallenge.genieIds">
                  <n-space>
                    <n-checkbox v-for="g in genieIdOptions" :key="g.value" :value="g.value" size="large">{{ g.label }}</n-checkbox>
                  </n-space>
                </n-checkbox-group>
                <n-alert v-if="!taskForm.genieChallenge.genieIds || taskForm.genieChallenge.genieIds.length === 0" type="warning" size="small" style="margin-top: 8px;">
                  请至少勾选一个势力
                </n-alert>
              </div>
              <div style="margin-top: 10px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">每日挑战总次数上限</div>
                <n-input-number v-model:value="taskForm.genieChallenge.dailyLimit" :min="1" :max="99" size="small" style="max-width: 200px;" />
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">游戏默认每日 10 次（魏蜀吴群共享），挑战从当前进度层开始，次数用尽自动停止</div>
              </div>
            </div>
          </div>

          <!-- 深海挑战配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchDeepSeaChallenge')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🌊 深海挑战 - 挑战深海灯神</span>
            </div>
            <div class="config-card-content">
              <div style="font-size: 12px; line-height: 1.6; color: #409eff; background: rgba(64,158,255,0.1); border: 1px solid rgba(64,158,255,0.35); border-radius: 4px; padding: 6px 8px; margin-bottom: 10px;">
                深海灯神（genieId=5）不限阵营，任意阵容均可挑战。请先在游戏内设置好深海阵容，执行时按账号设置中单独配置的"深海预设阵容"（账号设置-阵容配置-深海）逐层挑战，与灯神互不影响，最高 10 层。
              </div>
              <div style="margin-top: 10px;">
                <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">每周挑战次数上限</div>
                <n-input-number v-model:value="taskForm.deepSeaChallenge.weeklyLimit" :min="1" :max="99" size="small" style="max-width: 200px;" />
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">深海挑战固定每周 10 次（每周一刷新，独立于魏蜀吴群灯神），从当前进度层开始，通关 10 层或次数用尽自动停止</div>
              </div>
            </div>
          </div>

          <!-- 日常精简补齐配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchSimplifiedDaily')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⚡ 日常精简补齐 - 勾选执行任务项（不判断活跃度）</span>
            </div>
            <div class="config-card-content">
              <n-checkbox-group v-model:value="taskForm.simplifiedDailyItems">
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
                  <n-grid-item v-for="item in SIMPLIFIED_TASK_ITEMS" :key="item.key">
                    <n-checkbox :value="item.key" size="large">{{ item.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-checkbox-group>
              <n-alert v-if="!taskForm.simplifiedDailyItems || taskForm.simplifiedDailyItems.length === 0" type="warning" size="small" style="margin-top: 12px;">
                请至少勾选一个任务项
              </n-alert>
            </div>
          </div>

          <!-- 助威商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('legion_buy_store_items')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏪 助威商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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

          <!-- 逐鹿商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('apex_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⛩️ 逐鹿商店 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in apexShopConfig" :key="option.id">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.apexBuyItems && taskForm.apexBuyItems[option.id] && taskForm.apexBuyItems[option.id].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.apexBuyItems) taskForm.apexBuyItems = {};
                        const current = taskForm.apexBuyItems[option.id];
                        taskForm.apexBuyItems[option.id] = {
                          selected: checked,
                          count: checked ? (current?.count || 1) : 0,
                          label: option.name,
                          min: 1,
                          max: option.limit
                        };
                      }"
                    >
                      {{ option.name }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.apexBuyItems && taskForm.apexBuyItems[option.id] && taskForm.apexBuyItems[option.id].selected"
                      v-model:value="taskForm.apexBuyItems[option.id].count"
                      :min="1"
                      :max="option.limit"
                      :disabled="!taskForm.apexBuyItems[option.id].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.apexBuyItems || Object.values(taskForm.apexBuyItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
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
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
          
          <!-- 珍宝阁商店购买配置 -->
          <div v-if="taskForm.selectedTasks.includes('collection_exchange')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏛️ 珍宝阁商店购买 - 选择商品</span>
            </div>
            <div class="config-card-content">
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="option in collectionExchangeItemOptions" :key="option.value">
                  <div class="store-item">
                    <n-checkbox 
                      :checked="taskForm.collectionExchangeItems && taskForm.collectionExchangeItems[option.value] && taskForm.collectionExchangeItems[option.value].selected"
                      @update:checked="(checked) => {
                        if (!taskForm.collectionExchangeItems) taskForm.collectionExchangeItems = {};
                        if (!taskForm.collectionExchangeItems[option.value]) {
                          taskForm.collectionExchangeItems[option.value] = { selected: false, count: 0, label: option.label };
                        }
                        taskForm.collectionExchangeItems[option.value].selected = checked;
                        if (checked && !taskForm.collectionExchangeItems[option.value].count) taskForm.collectionExchangeItems[option.value].count = 1;
                      }"
                    >
                      {{ option.label }}
                    </n-checkbox>
                    <n-input-number 
                      v-if="taskForm.collectionExchangeItems && taskForm.collectionExchangeItems[option.value] && taskForm.collectionExchangeItems[option.value].selected"
                      v-model:value="taskForm.collectionExchangeItems[option.value].count"
                      :min="1"
                      :max="option.maxCount"
                      :disabled="!taskForm.collectionExchangeItems[option.value].selected"
                      size="small"
                      style="width: 80px"
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              <n-alert v-if="!taskForm.collectionExchangeItems || Object.values(taskForm.collectionExchangeItems).filter(i => i && i.selected).length === 0" type="warning" size="small" style="margin-top: 12px;">
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
                        
              <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
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
          
          <!-- 碎片礼包配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchOpenFragmentPacks')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🎁 碎片礼包 - 选择开启的礼包</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                开启账号背包中拥有的对应礼包，每种礼包每次最多开启999个，未配置时默认全量开启
              </n-alert>
              <n-checkbox-group v-model:value="taskForm.fragmentPackItems">
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
                  <n-grid-item><n-checkbox :value="3007">随机红将碎片</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3005">随机紫将碎片</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3006">随机橙将碎片</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3008">精铁福袋</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3009">进阶石福袋</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3011">白玉福袋</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3012">扳手福袋</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="35011">赛车改装礼盒</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3001">金币礼包</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3002">金砖礼包</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3010">晶石福袋</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="37005">怪异礼包</n-checkbox></n-grid-item>
                </n-grid>
              </n-checkbox-group>
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
                  <label class="setting-label-responsive" title="车辆品质达到此等级即可发车，0为不限制品质">最低品质</label>
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
                  <label class="setting-label-responsive" title="车辆奖励中含金砖数量达到此值才满足条件，0为不限制">金砖 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.goldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="车辆奖励中招募令数量达到此值才满足条件，0为不限制">招募令 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.recruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="车辆奖励中白玉数量达到此值才满足条件，0为不限制">白玉 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.jadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="车辆奖励中刷新券数量达到此值才满足条件，0为不限制">刷新券 >=</label>
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
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="开启后，必须满足自定义条件才发车；关闭后，自定义条件或品质任一满足即发车">自定义优先</label>
                  <n-switch v-model:value="taskForm.smartDeparture.customPriority" size="small">
                    <template #checked>开</template>
                    <template #unchecked>关</template>
                  </n-switch>
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="开启后，自动发车没票时使用金砖刷新；关闭时使用原有逻辑">强制用金砖刷新</label>
                  <n-switch v-model:value="taskForm.smartDeparture.useGoldRefreshFallback" size="small">
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

          <!-- 图鉴升星类型选择 -->
          <div v-if="taskForm.selectedTasks.includes('batchBookUpgrade')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⭐ 图鉴升星 - 选择升星类型</span>
            </div>
            <div class="config-card-content">
              <n-checkbox-group v-model:value="taskForm.bookUpgradeTypes">
                <n-checkbox value="hero">英雄升星</n-checkbox>
                <n-checkbox value="fish">鱼灵升星</n-checkbox>
                <n-checkbox value="skin">皮肤激活</n-checkbox>
              </n-checkbox-group>
            </div>
          </div>

          <!-- 比赛竞猜选项 -->
          <div v-if="taskForm.selectedTasks.includes('batchSaltCupBet')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏆 比赛竞猜 - 选择竞猜选项</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                自动获取所有未下注的比赛并对所有比赛下注相同选项
              </n-alert>
              <n-radio-group v-model:value="taskForm.saltCupBetPick" size="small">
                <n-radio :value="1">主胜</n-radio>
                <n-radio :value="2">平局</n-radio>
                <n-radio :value="3">客胜</n-radio>
              </n-radio-group>
            </div>
          </div>

          <!-- 逐鹿盐山竞猜选项 -->
          <div v-if="taskForm.selectedTasks.includes('batchApexGuess')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">⚔️ 逐鹿盐山竞猜 - 配置竞猜参数</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                执行时自动拉取所选赛程全部对阵，并按策略自动择队竞猜（已参与的场次自动跳过）
              </n-alert>
              <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 14px; margin-right: 8px;">期次：</span>
                  <n-select
                    v-model:value="taskForm.apexGuessGroupId"
                    :options="[{ label: '第一期', value: 0 }, { label: '第二期', value: 1 }, { label: '第三期', value: 2 }, { label: '第四期', value: 3 }, { label: '第五期', value: 4 }, { label: '第六期', value: 5 }, { label: '第七期', value: 6 }]"
                    size="small"
                    style="width: 110px;"
                  />
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 14px; margin-right: 8px;">赛程：</span>
                  <n-select
                    v-model:value="taskForm.apexGuessScheduleId"
                    :options="[{ label: '64强', value: 20 }, { label: '32强', value: 21 }, { label: '16强', value: 22 }, { label: '8强', value: 23 }, { label: '4强', value: 24 }, { label: '季军赛', value: 25 }, { label: '决赛', value: 26 }]"
                    size="small"
                    style="width: 110px;"
                  />
                </div>
                <div>
                  <span style="font-size: 14px; margin-right: 8px;">策略：</span>
                  <n-radio-group v-model:value="taskForm.apexGuessStrategy" size="small">
                    <n-radio value="left">全押蓝方</n-radio>
                    <n-radio value="right">全押红方</n-radio>
                    <n-radio value="power">押高战力</n-radio>
                    <n-radio value="cheer">押多助威</n-radio>
                  </n-radio-group>
                </div>
              </div>
            </div>
          </div>

          <!-- 天宫助威选项 -->
          <div v-if="taskForm.selectedTasks.includes('batchSaltRoadCheer')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏆 天宫助威 - 配置助威参数</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                点击“获取对阵”拉取当前对阵列表，然后勾选要助威的俱乐部队伍
              </n-alert>
              <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
                <n-button size="small" :loading="taskSaltRoadLoading" @click="fetchTaskSaltRoadOpponents">
                  获取对阵
                </n-button>
                <span v-if="taskForm.saltRoadLegionName" style="font-size: 14px; color: #18a058; font-weight: bold;">
                  ✅ 已选：{{ taskForm.saltRoadLegionName }}
                </span>
                <span v-else-if="taskSaltRoadOpponents.length === 0" style="font-size: 13px; color: #888;">
                  未获取对阵，将自动按左/右军助威
                </span>
              </div>
              <!-- 对阵列表 -->
              <div v-if="taskSaltRoadOpponents.length > 0" style="margin-bottom: 12px;">
                <div v-for="(match, idx) in taskSaltRoadOpponents" :key="match.groupId || idx" 
                  style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid #eee; flex-wrap: wrap;">
                  <span style="font-size: 13px; color: #666; min-width: 40px;">组{{ match.groupId || (idx+1) }}</span>
                  <n-button 
                    size="tiny" 
                    :type="taskForm.saltRoadLegionId === match.leftLegion?.id ? 'primary' : 'default'"
                    @click="taskForm.saltRoadLegionId = match.leftLegion?.id; taskForm.saltRoadLegionName = match.leftLegion?.name || ''">
                    ← {{ match.leftLegion?.name || '左军' }}
                  </n-button>
                  <span style="font-size: 12px; color: #999;">VS</span>
                  <n-button 
                    size="tiny" 
                    :type="taskForm.saltRoadLegionId === match.rightLegion?.id ? 'primary' : 'default'"
                    @click="taskForm.saltRoadLegionId = match.rightLegion?.id; taskForm.saltRoadLegionName = match.rightLegion?.name || ''">
                    {{ match.rightLegion?.name || '右军' }} →
                  </n-button>
                </div>
              </div>
              <!-- 兑底：左右军选择 -->
              <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                <div>
                  <span style="font-size: 14px; margin-right: 8px;">未选队伍时按方向助威：</span>
                  <n-radio-group v-model:value="taskForm.saltRoadSide" size="small">
                    <n-radio :value="1">左军</n-radio>
                    <n-radio :value="2">右军</n-radio>
                  </n-radio-group>
                </div>
                <div>
                  <span style="font-size: 14px; margin-right: 8px;">助威次数：</span>
                  <n-input-number v-model:value="taskForm.saltRoadVoteCount" :min="1" :max="999" style="width: 120px;" size="small" />
                </div>
              </div>
            </div>
          </div>

          <!-- 营地挑战配置 -->
          <div v-if="taskForm.selectedTasks.includes('batchCampChallenge')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">🏕️ 营地挑战 - 挑战设置</span>
            </div>
            <div class="config-card-content">
              <camp-challenge-config
                v-if="ensureTaskCampForm()"
                v-model="taskForm.campChallenge"
              />
            </div>
          </div>
        </div>
        
        <!-- 不上线时段开关 -->
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
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

    <!-- 营地挑战设置 Modal -->
    <n-modal
      v-model:show="showCampChallengeModal"
      preset="card"
      title="🏕️ 营地挑战设置"
      style="width: 95%; max-width: 640px"
      :mask-closable="false"
    >
      <camp-challenge-config v-model="campChallengeForm" />
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 12px; width: 100%;">
          <n-button @click="showCampChallengeModal = false">取消</n-button>
          <n-button type="primary" @click="saveAndRunCampChallenge">保存并开始</n-button>
        </div>
      </template>
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
                <label class="setting-label-responsive">宝箱周目标轮数(每轮8000分)</label>
                <n-input-number v-model:value="batchSettings.targetBoxRounds" :min="1" :max="4" :step="1" size="small" class="input-responsive" />
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
                <label class="setting-label-responsive" title="总开关，开启后才会检查下方的自定义条件(金砖/招募令/白玉/刷新券)，关闭则只按保底品质判断">启用条件检查</label>
                <n-switch v-model:value="batchSettings.smartDepartureEnabled" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="车辆品质达到此等级即可发车，0为不限制品质">保底车辆颜色</label>
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
                <label class="setting-label-responsive" title="车辆奖励中含金砖数量达到此值才满足条件，0为不限制">金砖 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureGoldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="车辆奖励中招募令数量达到此值才满足条件，0为不限制">招募令 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureRecruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="车辆奖励中白玉数量达到此值才满足条件，0为不限制">白玉 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureJadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="车辆奖励中刷新券数量达到此值才满足条件，0为不限制">刷新券 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureTicketThreshold" :min="0" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="开启后，满足自定义条件(金砖/招募令/白玉/刷新券)时，车辆还必须达到最低品质才会发车">品质必须同时满足</label>
                <n-switch v-model:value="batchSettings.requireMinColorWithConditions" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="开启后，必须满足自定义条件才发车；关闭后，自定义条件或品质任一满足即发车">自定义优先</label>
                <n-switch v-model:value="batchSettings.customPriority" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="开启后，自动发车没票时使用金砖刷新；关闭时使用原有逻辑">强制用金砖刷新</label>
                <n-switch v-model:value="batchSettings.useGoldRefreshFallback" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>开</template>
                  <template #unchecked>关</template>
                </n-switch>
              </div>
            </div>
          </n-grid-item>
                    
          <!-- 右列：延迟与连接设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 8px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">⏱️ 基础延迟设置 (ms) - 旧版兼容</span>
              <n-button size="tiny" quaternary type="primary" @click="resetDelaySettings" style="margin-left: 8px;">
                恢复默认
              </n-button>
            </n-divider>
            <div style="font-size: 11px; color: var(--text-color-3); margin-bottom: 8px;">
              以下为旧版延迟设置，新功能已统一使用上方「功能模块延迟分组」。仅用于个别未迁移场景的兼容。
            </div>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">命令延迟</label>
                <n-input-number v-model:value="batchSettings.commandDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">任务间延迟</label>
                <n-input-number v-model:value="batchSettings.taskDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>

            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🎯 功能模块延迟分组(ms)</span>
              <n-button size="tiny" quaternary type="primary" @click="resetModuleDelays" style="margin-left: 8px;">
                恢复默认
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive" v-for="grp in delayGroupList" :key="grp.key">
                <label class="setting-label-responsive" :title="grp.desc">{{ grp.label }}</label>
                <n-input-number v-model:value="batchSettings.delayGroups[grp.key]" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-color-3); line-height: 1.5; margin-top: 6px;" v-for="grp in delayGroupList" :key="'desc-' + grp.key">
              <strong>{{ grp.label }}</strong>: {{ grp.desc }} → 涵盖: {{ grp.modules.join('、') }}
            </div>

            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">📝 子任务延迟 / 🎁 奖励领取 / ⚡ 单账号加速</span>
            </n-divider>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start;">
              <!-- 子任务间延迟 -->
              <div class="setting-item-responsive" style="flex: 1; min-width: 0; min-width: 140px;">
                <label class="setting-label-responsive" title="日常任务中同一模块内每个子任务完成后的等待时间(ms)，设为0则子任务间无等待">子任务间(ms)</label>
                <n-input-number
                  v-model:value="batchSettings.dailySubtaskDelay"
                  :min="0" :max="5000" :step="50"
                  size="small" class="input-responsive"
                  @update:value="autoSaveBatchSettings"
                />
              </div>
              <!-- 奖励领取延迟 -->
              <div class="setting-item-responsive" style="flex: 1; min-width: 0; min-width: 140px;">
                <label class="setting-label-responsive" title="日常任务奖励领取操作间的等待时间(ms)，包括任务奖励、日常奖励、周常奖励等，设为0则无等待">奖励领取(ms)</label>
                <n-input-number
                  v-model:value="batchSettings.rewardClaimDelay"
                  :min="0" :max="10000" :step="500"
                  size="small" class="input-responsive"
                  @update:value="autoSaveBatchSettings"
                />
              </div>
              <!-- 单账号智能加速 -->
              <div class="setting-item-responsive" style="flex: 1.5; min-width: 180px;">
                <label class="setting-label-responsive" title="仅选拯1个账号执行时，自动降低延迟加快执行速度">单账号加速</label>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <n-switch v-model:value="batchSettings.singleAccountSpeedUp" @update:value="autoSaveBatchSettings" size="small" style="flex-shrink: 0;" />
                  <n-input-number
                    v-model:value="batchSettings.singleAccountMultiplier"
                    :min="0.05" :max="1.0" :step="0.05" :precision="2"
                    size="small" style="flex: 1; min-width: 100px;"
                    @update:value="autoSaveBatchSettings"
                  />
                </div>
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-color-3); line-height: 1.5; margin-top: 4px;">
              子任务间 {{ batchSettings.dailySubtaskDelay }}ms · 奖励领取间 {{ batchSettings.rewardClaimDelay }}ms · 
              <template v-if="batchSettings.singleAccountSpeedUp">
                加速 {{ batchSettings.singleAccountMultiplier }}×（快速 {{ Math.round(batchSettings.delayGroups.fast * batchSettings.singleAccountMultiplier) }}ms，标准 {{ Math.round(batchSettings.delayGroups.normal * batchSettings.singleAccountMultiplier) }}ms，战斗 {{ Math.round(batchSettings.delayGroups.battle * batchSettings.singleAccountMultiplier) }}ms，重度 {{ Math.round(batchSettings.delayGroups.heavy * batchSettings.singleAccountMultiplier) }}ms）
              </template>
              <template v-else>加速已关闭</template>
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
                <label class="setting-label-responsive">重连等待 (ms)</label>
                <n-input-number v-model:value="batchSettings.reconnectDelay" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
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
            
            <!-- 换皮闯关设置 + 功法赠送设置 -->
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">⚔️ 换皮闯关设置 | 💻 功法赠送设置</span>
            </n-divider>
            <div class="settings-grid-responsive-3cols">
              
              <!-- 换皮闯关设置 -->
              <div class="setting-group-merged">
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="连续失败多少次后跳过该 BOSS">失败次数上限</label>
                  <n-input-number v-model:value="batchSettings.skinChallengeMaxFail" :min="1" :max="20" :step="1" size="small" class="input-responsive" />
                </div>
              </div>
              
              <!-- 功法赠送设置 -->
              <div class="setting-group-merged">
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">接收者 ID</label>
                  <n-input v-model:value="batchSettings.receiverId" placeholder="ID" size="small" class="input-responsive" :show-button="false" />
                </div>
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">🐾 宠物合成设置</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="是否启用宠物合成等级限制">启用等级限制</label>
                <n-switch v-model:value="batchSettings.petMergeMaxLevelEnabled" @update:value="autoSaveBatchSettings" />
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
                  <n-switch :value="batchSettings.autoColumns" size="small" style="margin-right: 8px;" @update:value="handleAutoColumnsToggle" />
                  <span style="font-size: 12px; color: #666;">自动</span>
                </div>
                <n-input-number 
                  v-model:value="batchSettings.tokenListColumns" 
                  :min="1" 
                  :max="10" 
                  :step="1" 
                  size="small" 
                  style="width: 100%" 
                  :disabled="batchSettings.autoColumns"
                  @update:value="handleManualColumnChange"
                />
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  {{ batchSettings.autoColumns ? `自动: ${responsiveColumns}列` : `手动: ${batchSettings.tokenListColumns}列` }}
                </div>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">最大日志条目</label>
                <n-input-number v-model:value="batchSettings.maxLogEntries" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">定时刷新页面</label>
                <n-switch v-model:value="batchSettings.enableRefresh" @update:value="autoSaveBatchSettings" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.enableRefresh">
                <label class="setting-label-responsive">刷新间隔(分钟)</label>
                <n-input-number v-model:value="batchSettings.refreshInterval" :min="1" :max="1440" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">Cron定时刷新</label>
                <n-switch v-model:value="batchSettings.enableCronRefresh" @update:value="autoSaveBatchSettings" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.enableCronRefresh">
                <label class="setting-label-responsive">Cron表达式</label>
                <n-input
                  v-model:value="batchSettings.cronRefreshExpression"
                  placeholder="例: 0 8 * * *"
                  @input="parseCronRefreshExpression"
                  size="small"
                  class="input-responsive"
                />
                <div class="cron-parser" v-if="batchSettings.cronRefreshExpression" style="margin-top: 8px;">
                  <n-alert :type="cronRefreshValidation.valid ? 'success' : 'error'" size="small" style="margin-bottom: 8px;">
                    <template #icon>
                      <span>{{ cronRefreshValidation.valid ? '✓' : '✗' }}</span>
                    </template>
                    {{ cronRefreshValidation.message }}
                  </n-alert>
                  <n-alert v-if="cronRefreshValidation.valid && cronRefreshNextRuns.length > 0" type="info" size="small">
                    <template #header>
                      <span style="font-size: 12px;">📅 未来5次执行时间</span>
                    </template>
                    <div style="font-size: 11px; line-height: 1.8;">
                      <div v-for="(run, index) in cronRefreshNextRuns" :key="index">
                        {{ index + 1 }}. {{ run }}
                      </div>
                    </div>
                  </n-alert>
                </div>
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

    <!-- SaltCup Bet Modal (比赛竞猜) -->
    <n-modal
      v-model:show="showSaltCupBetModal"
      preset="card"
      title="比赛竞猜"
      style="width: 90%; max-width: 900px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <n-button type="primary" @click="fetchSaltCupBetData" :loading="saltCupBetLoading">
              刷新比赛数据
            </n-button>
            <span v-if="saltCupBetLoading" style="color: #999;">加载中...</span>
          </div>

          <div v-if="saltCupMatchList.length === 0 && !saltCupBetLoading" style="text-align: center; color: #999; padding: 40px 0;">
            暂无比赛数据，请点击刷新获取
          </div>

          <div v-for="match in saltCupMatchList" :key="match.matchId" style="border: 1px solid var(--n-border-color, #e0e0e0); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <img v-if="match.leftRole?.headImg" :src="match.leftRole.headImg" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
                <div>
                  <div style="font-weight: bold; font-size: 14px;">{{ match.leftRole?.name || '未知' }}</div>
                  <div style="font-size: 12px; color: #999;">战力: {{ formatPower(match.leftTotalPower || 0) }}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end;">
                <div style="text-align: right;">
                  <div style="font-weight: bold; font-size: 14px;">{{ match.rightRole?.name || '未知' }}</div>
                  <div style="font-size: 12px; color: #999;">战力: {{ formatPower(match.rightTotalPower || 0) }}</div>
                </div>
                <img v-if="match.rightRole?.headImg" :src="match.rightRole.headImg" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
              </div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <n-button
                size="small"
                :type="match.betRecord?.pick === 1 ? 'default' : 'error'"
                :disabled="isRunning"
                @click="handleSaltCupBet(match.matchId, 1)"
              >
                {{ match.betRecord?.pick === 1 ? '已押主胜 ✓' : '主胜' }}
              </n-button>
              <n-button
                size="small"
                :type="match.betRecord?.pick === 2 ? 'default' : 'warning'"
                :disabled="isRunning"
                @click="handleSaltCupBet(match.matchId, 2)"
              >
                {{ match.betRecord?.pick === 2 ? '已押平局 ✓' : '平局' }}
              </n-button>
              <n-button
                size="small"
                :type="match.betRecord?.pick === 3 ? 'default' : 'info'"
                :disabled="isRunning"
                @click="handleSaltCupBet(match.matchId, 3)"
              >
                {{ match.betRecord?.pick === 3 ? '已押客胜 ✓' : '客胜' }}
              </n-button>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showSaltCupBetModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Apex Guess Modal (逐鹿盐山竞猜) -->
    <n-modal
      v-model:show="showApexGuessModal"
      preset="card"
      title="逐鹿盐山竞猜"
      style="width: 90%; max-width: 900px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <!-- 顶部操作栏：期次/赛程选择 + 批量操作 -->
          <div style="margin-bottom: 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 13px; color: #666;">期次：</span>
            <n-select
              v-model:value="apexGuessGroupId"
              :options="[{ label: '第一期', value: 0 }, { label: '第二期', value: 1 }, { label: '第三期', value: 2 }, { label: '第四期', value: 3 }, { label: '第五期', value: 4 }, { label: '第六期', value: 5 }, { label: '第七期', value: 6 }]"
              style="width: 100px"
              size="small"
            />
            <span style="font-size: 13px; color: #666;">赛程：</span>
            <n-select
              v-model:value="apexGuessScheduleId"
              :options="[{ label: '64强', value: 20 }, { label: '32强', value: 21 }, { label: '16强', value: 22 }, { label: '8强', value: 23 }, { label: '4强', value: 24 }, { label: '季军赛', value: 25 }, { label: '决赛', value: 26 }]"
              style="width: 110px"
              size="small"
            />
            <span v-if="apexScheduleDetecting" style="color: #2080f0; font-size: 12px;">⏳ 探测赛程中...</span>
            <n-button type="primary" size="small" @click="fetchApexGuessList" :loading="apexGuessLoading" :disabled="apexScheduleDetecting">
              获取对阵列表
            </n-button>
            <span v-if="apexGuessLoading" style="color: #999; font-size: 12px;">加载中...</span>
            <div style="flex: 1; min-width: 8px;"></div>
            <n-button size="tiny" :type="'info'" ghost :disabled="apexGuessMatchList.length === 0" @click="apexGuessPickAll('left')">全押蓝方</n-button>
            <n-button size="tiny" :type="'error'" ghost :disabled="apexGuessMatchList.length === 0" @click="apexGuessPickAll('right')">全押红方</n-button>
            <n-button size="tiny" :type="'warning'" ghost :disabled="apexGuessMatchList.length === 0" @click="apexGuessPickAll('power')">押高战力</n-button>
            <n-button size="tiny" :type="'success'" ghost :disabled="apexGuessMatchList.length === 0" @click="apexGuessPickAll('cheer')">押多助威</n-button>
          </div>

          <!-- 空状态 -->
          <div v-if="apexGuessMatchList.length === 0 && !apexGuessLoading" style="text-align: center; color: #b0b0b0; padding: 48px 0; font-size: 13px;">
            暂无对阵数据，请选择赛程后点击获取
          </div>

          <!-- 对阵列表（固定高度滚动） -->
          <div v-if="apexGuessMatchList.length > 0" style="max-height: 52vh; overflow-y: auto; padding-right: 4px;">
            <div v-for="(match, idx) in apexGuessMatchList" :key="idx" style="display: flex; align-items: center; gap: 6px; border: 1px solid var(--n-border-color, #eaeaea); border-radius: 8px; padding: 4px 8px; margin-bottom: 6px;">
              <span style="width: 24px; flex-shrink: 0; font-size: 11px; color: #bbb; text-align: center;">{{ idx + 1 }}</span>
              <!-- 左队 -->
              <div
                style="flex: 1; min-width: 0; cursor: pointer; border-radius: 6px; padding: 4px 8px; border: 1.5px solid transparent; transition: all 0.15s ease; display: flex; align-items: center; gap: 8px;"
                :style="match.picked === 'left' ? 'border-color: #2080f0; background: rgba(32, 128, 240, 0.08);' : ''"
                @click="match.picked = 'left'"
              >
                <span v-if="match.picked === 'left'" style="display: inline-flex; width: 14px; height: 14px; border-radius: 50%; background: #2080f0; color: #fff; font-size: 10px; align-items: center; justify-content: center; flex-shrink: 0;">✓</span>
                <span style="font-weight: 600; font-size: 13px; color: var(--n-text-color, #222); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ match.left?.name || '未知' }}</span>
                <span style="font-size: 11px; color: #888; white-space: nowrap; margin-left: auto;">战力 {{ formatPower(match.left?.power || 0) }} · 助威 {{ match.left?.cheerCnt || 0 }}</span>
              </div>
              <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; color: #999;">VS</span>
              <!-- 右队 -->
              <div
                style="flex: 1; min-width: 0; cursor: pointer; border-radius: 6px; padding: 4px 8px; border: 1.5px solid transparent; transition: all 0.15s ease; display: flex; align-items: center; gap: 8px;"
                :style="match.picked === 'right' ? 'border-color: #d03050; background: rgba(208, 48, 80, 0.08);' : ''"
                @click="match.picked = 'right'"
              >
                <span style="font-size: 11px; color: #888; white-space: nowrap;">战力 {{ formatPower(match.right?.power || 0) }} · 助威 {{ match.right?.cheerCnt || 0 }}</span>
                <span style="font-weight: 600; font-size: 13px; color: var(--n-text-color, #222); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-left: auto;">{{ match.right?.name || '未知' }}</span>
                <span v-if="match.picked === 'right'" style="display: inline-flex; width: 14px; height: 14px; border-radius: 50%; background: #d03050; color: #fff; font-size: 10px; align-items: center; justify-content: center; flex-shrink: 0;">✓</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
          <n-text v-if="apexGuessMatchList.length > 0" depth="3" style="font-size: 13px;">
            已选择 <b style="color: var(--n-color, #18a058);">{{ apexGuessPickedCount }}</b> / {{ apexGuessMatchList.length }} 场
          </n-text>
          <n-button type="primary" @click="handleApexGuess" :disabled="isRunning || apexGuessPickedCount === 0">
            开始竞猜
          </n-button>
          <n-button @click="showApexGuessModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Apex Cheer Modal (竞技大厅助威) -->
    <n-modal
      v-model:show="showApexCheerModal"
      preset="card"
      title="竞技大厅助威"
      style="width: 90%; max-width: 900px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <!-- 获取列表区域 -->
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <n-button type="primary" @click="fetchApexVoteList" :loading="apexCheerLoading" style="width: 200px; max-width: 100%; margin-bottom: 0;">
              {{ apexCheerLoading ? '加载中...' : '获取可助威俱乐部列表' }}
            </n-button>
            <span class="btn-emoji-icon">期次：</span>
            <n-select
              v-model:value="selectedApexRound"
              :options="[{ label: '第一期', value: 1 }, { label: '第二期', value: 2 }, { label: '第三期', value: 3 }, { label: '第四期', value: 4 }, { label: '第五期', value: 5 }, { label: '第六期', value: 6 }, { label: '第七期', value: 7 }]"
              style="width: 120px"
              size="small"
            />
            <n-button size="small" :loading="apexRoundDetecting" @click="detectCurrentApexRound" :disabled="apexRoundDetecting">
              {{ apexRoundDetecting ? '探测中...' : '🔍 自动探测期次' }}
            </n-button>
            <n-tag v-if="apexRoundDetected" size="small" type="success" :bordered="false">
              当前活跃：第{{ apexRoundDetected }}期
            </n-tag>
            <span class="btn-emoji-icon">分组：</span>
            <n-select
              v-model:value="selectedApexGroupId"
              :options="[{ label: '第1组', value: 1 }, { label: '第2组', value: 2 }, { label: '第3组', value: 3 }, { label: '第4组', value: 4 }, { label: '第5组', value: 5 }, { label: '第6组', value: 6 }, { label: '第7组', value: 7 }, { label: '第8组', value: 8 }, { label: '第9组', value: 9 }, { label: '第10组', value: 10 }, { label: '第11组', value: 11 }, { label: '第12组', value: 12 }, { label: '第13组', value: 13 }, { label: '第14组', value: 14 }, { label: '第15组', value: 15 }, { label: '第16组', value: 16 }, { label: '第17组', value: 17 }, { label: '第18组', value: 18 }, { label: '第19组', value: 19 }, { label: '第20组', value: 20 }, { label: '第21组', value: 21 }, { label: '第22组', value: 22 }, { label: '第23组', value: 23 }, { label: '第24组', value: 24 }, { label: '第25组', value: 25 }, { label: '第26组', value: 26 }, { label: '第27组', value: 27 }, { label: '第28组', value: 28 }, { label: '第29组', value: 29 }, { label: '第30组', value: 30 }, { label: '第31组', value: 31 }, { label: '第32组', value: 32 }]"
              style="width: 120px"
              size="small"
            />
          </div>

          <!-- 投票数量设置 -->
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span class="btn-emoji-icon">赠送数量：</span>
            <n-input-number 
              v-model:value="apexVoteCount" 
              placeholder="0=全部赠送" 
              :min="0" 
              :max="maxApexVoteCount > 0 ? maxApexVoteCount : 999999" 
              style="width: 200px; max-width: 100%"
            />
            <n-text type="info" style="font-size: 14px;">
              {{ apexVoteCount === 0 ? '全部赠送' : `赠送 ${apexVoteCount} 次` }} | 当前助威币：{{ maxApexVoteCount }}
            </n-text>
          </div>

          <!-- 俱乐部搜索 -->
          <div style="margin-bottom: 12px;">
            <n-input
              v-model:value="apexClubSearch"
              placeholder="搜索俱乐部名称或ID..."
              clearable
              style="width: 300px; max-width: 100%"
              size="small"
            />
          </div>

          <!-- 俱乐部列表 -->
          <n-data-table
            :columns="apexVoteColumns"
            :data="filteredApexVoteList"
            :loading="apexCheerLoading"
            :row-key="row => row.teamId"
            :checked-row-keys="selectedApexTeamId ? [selectedApexTeamId] : []"
            @update:checked-row-keys="(keys) => selectedApexTeamId = keys[0]"
            :row-props="apexVoteRowProps"
            class="apex-cheer-table"
            style="flex: 1;"
            flex-height
          />
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px;">
          <n-button @click="applyApexVote" type="primary" :disabled="!selectedApexTeamId || isRunning">
            {{ selectedApexTeamId ? `对队伍"${getSelectedTeamName()}"${apexVoteCount === 0 ? '全部赠送' : `赠送 ${apexVoteCount} 次`}` : '请先选择一个俱乐部' }}
          </n-button>
          <n-button @click="closeApexCheerModal">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- SaltRoad Cheer Modal (天宫助威) -->
    <n-modal
      v-model:show="showSaltRoadCheerModal"
      preset="card"
      title="天宫助威（盐道淘汰赛）"
      style="width: 90%; max-width: 1000px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <!-- 获取列表区域 -->
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-size: 14px;">日期(phase)：</span>
            <n-input v-model:value="saltRoadPhaseInput" placeholder="如 260718，留空自动获取" style="width: 180px;" size="small" />
            <n-button type="primary" @click="fetchSaltRoadOpponents" :loading="saltRoadCheerLoading" style="width: 200px; margin-bottom: 0;">
              {{ saltRoadCheerLoading ? '加载中...' : '获取对阵列表' }}
            </n-button>
            <n-text type="info" style="font-size: 14px;">
              期次：{{ saltRoadPhase || '-' }} | 共 {{ saltRoadOpponentList.length }} 场对阵
            </n-text>
          </div>

          <!-- 助威数量设置 -->
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <span class="btn-emoji-icon">助威次数：</span>
            <n-input-number 
              v-model:value="saltRoadVoteCount" 
              placeholder="助威次数" 
              :min="1" 
              :max="999" 
              style="width: 200px"
            />
          </div>

          <!-- 对阵列表 -->
          <n-data-table
            :columns="saltRoadOpponentColumns"
            :data="saltRoadOpponentList"
            :loading="saltRoadCheerLoading"
            :row-key="row => row.battlefieldId"
            :checked-row-keys="selectedSaltRoadBattlefieldId ? [selectedSaltRoadBattlefieldId] : []"
            @update:checked-row-keys="(keys) => onSaltRoadRowSelect(keys)"
            :row-props="saltRoadRowProps"
            style="height: 500px; flex: 1;"
            flex-height
          />
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button 
            @click="applySaltRoadCheer" 
            type="primary" 
            :disabled="!selectedSaltRoadBattlefieldId || !selectedSaltRoadWinSid || isRunning"
          >
            {{ selectedSaltRoadBattlefieldId && selectedSaltRoadWinSid 
              ? `对 ${selectedSaltRoadSideValue === 1 ? '左军' : '右军'} 助威 ${saltRoadVoteCount} 次` 
              : '请先选择对阵和方向' }}
          </n-button>
          <n-button @click="closeSaltRoadCheerModal">关闭</n-button>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: bold;">包含账号 ({{ newGroupSelectedTokens.length }})</span>
              <n-space size="small" align="center">
                <n-input
                  v-model:value="groupTokenSearch"
                  placeholder="搜索账号(支持多关键词)"
                  size="tiny"
                  clearable
                  style="width: 160px"
                />
                <n-button size="tiny" @click="selectAllNewGroup">全选</n-button>
                <n-button size="tiny" @click="deselectAllNewGroup">全不选</n-button>
              </n-space>
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
              <n-checkbox-group v-model:value="newGroupSelectedTokens">
                <n-grid :cols="3" :x-gap="12" :y-gap="8">
                  <n-grid-item v-for="token in filteredGroupTokens" :key="token.id">
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
        <!-- 批量操作工具栏 -->
        <div
          v-if="tokenGroups.length > 0"
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding: 8px 12px;
            background: #f0f0f0;
            border-radius: 6px;
          "
        >
          <n-checkbox
            :checked="batchDeleteSelectedGroupIds.length === tokenGroups.length && tokenGroups.length > 0"
            :indeterminate="batchDeleteSelectedGroupIds.length > 0 && batchDeleteSelectedGroupIds.length < tokenGroups.length"
            @update:checked="toggleSelectAllGroups"
          >
            全选
          </n-checkbox>
          <n-space>
            <span style="font-size: 12px; color: #86909c">
              已选 {{ batchDeleteSelectedGroupIds.length }} / {{ tokenGroups.length }}
            </span>
            <n-popconfirm
              @positive-click="batchDeleteGroups"
              positive-text="确定删除"
              negative-text="取消"
            >
              <template #trigger>
                <n-button
                  size="small"
                  type="error"
                  :disabled="batchDeleteSelectedGroupIds.length === 0"
                >
                  批量删除 ({{ batchDeleteSelectedGroupIds.length }})
                </n-button>
              </template>
              确定删除选中的 {{ batchDeleteSelectedGroupIds.length }} 个分组？分组中的账号不会被删除。
            </n-popconfirm>
          </n-space>
        </div>
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
                    <n-checkbox
                      :checked="batchDeleteSelectedGroupIds.includes(group.id)"
                      @update:checked="(checked) => toggleBatchDeleteGroupSelection(group.id, checked)"
                    />
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
          <n-button @click="showGroupManageModal = false; batchDeleteSelectedGroupIds = []">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 添加Token弹窗 -->
    <n-modal
      v-model:show="showAddTokenModal"
      preset="card"
      class="add-token-modal"
      :bordered="false"
      style="width: 92%; max-width: 680px; max-height: 85vh"
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
            <n-radio-button value="yybQrcode">应用宝扫码</n-radio-button>
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
          @ok="handleAddedToken"
        />
        <UrlTokenForm
          v-if="addTokenImportMethod === 'url'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="handleAddedToken"
        />
        <WxQrcodeForm
          v-if="addTokenImportMethod === 'wxQrcode'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="handleAddedToken"
        />
        <YybQrcodeForm
          v-if="addTokenImportMethod === 'yybQrcode'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="handleAddedToken"
          @switch-wx="() => (addTokenImportMethod = 'wxQrcode')"
        />
        <BinTokenForm
          v-if="addTokenImportMethod === 'bin'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="handleAddedToken"
        />
        <SingleBinTokenForm
          v-if="addTokenImportMethod === 'singlebin'"
          @cancel="() => (showAddTokenModal = false)"
          @ok="handleAddedToken"
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
        <div style="background: #fff8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; text-align: left;">
          <p style="margin-bottom: 8px; color: #e67e22; font-size: 14px; font-weight: bold;">📌 激活码赞助方案</p>
          <p style="margin-bottom: 4px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">10元</b> = 1个激活码</p>
          <p style="margin-bottom: 4px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">20元</b> = 3个激活码</p>
          <p style="margin-bottom: 8px; color: #333; font-size: 13px;">💰 赞助 <b style="color:#e74c3c;">30元</b> = 5个激活码</p>
          <p style="margin-bottom: 4px; color: #999; font-size: 12px;">（每人最高5个激活码，避免倒卖）</p>
          <p style="margin-bottom: 8px; color: #e67e22; font-size: 13px; font-weight: bold;">💡 赞助30以上可联系我授权云顿配置功能</p>
          <p style="margin-bottom: 4px; color: #333; font-size: 13px;">🔄 激活码永久有效，可重置：在另一台设备输入激活码点击「重置卡密」即可</p>
          <p style="color: #333; font-size: 13px;">🎁 残卷赠送ID：<b style="color:#e74c3c;">83203221</b></p>
        </div>
        <p style="margin-bottom: 12px; color: #e67e22; font-size: 13px; font-weight: 500;">赞助后请在QQ联系我领取激活码<br/>联系方式：<span style="font-weight: bold; color: #c0392b; letter-spacing: 1px;">1607863356</span></p>
        <p style="margin-bottom: 12px; color: #999; font-size: 12px;">网页版目前太多人使用，暂时不再免费提供，赞助30以上可联系获取</p>
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
        <p style="margin-bottom: 12px;">本软件<span style="color: #18a058; font-weight: 500;">电脑端和手机端安装包均是免费提供</span>。如需获取激活码，可联系作者提供赞助截图。</p>
        <p style="margin-bottom: 12px;">该软件根据开源进行开发。（在这里感谢很多技术大哥的技术支持）</p>
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
      class="push-modal"
      style="width: 95%; max-width: 780px"
      :segmented="{ content: true }"
    >
      <template #header>
        <div style="display:flex;align-items:center;gap:8px;">
          <span>批量推图</span>
          <n-tag v-if="pushTimerStatus !== 'idle'" size="tiny" type="success" style="font-size:11px;">
            ⏰定时中 {{ pushTimerCountdown }}
          </n-tag>
        </div>
      </template>
      <div class="push-layout">
        <!-- 顶部工具栏 -->
        <div class="push-toolbar">
          <!-- 账号选择区域（标签式布局） -->
          <div class="push-account-selector">
            <!-- 已选账号标签 -->
            <div v-if="pushSelectedTokens.length > 0" class="push-selected-chips">
              <n-tag
                v-for="tid in pushSelectedTokens"
                :key="tid"
                closable
                size="small"
                type="info"
                :bordered="false"
                class="push-chip"
                @close="pushSelectedTokens = pushSelectedTokens.filter(id => id !== tid)"
              >
                {{ getTokenDisplayName(tid) }}
              </n-tag>
            </div>
            <span v-else class="push-no-selection">未选择账号</span>

            <!-- 搜索框 -->
            <n-input
              v-model:value="pushSearchQuery"
              placeholder="搜索账号..."
              size="small"
              clearable
              class="push-search-input"
            >
              <template #prefix>🔍</template>
            </n-input>

            <!-- 分组快捷选择 -->
            <div v-if="tokenGroups.length > 0" class="push-group-wrapper">
              <div class="push-group-header" @click="pushGroupCollapsed = !pushGroupCollapsed">
                <span class="push-group-title">分组选择</span>
                <span class="push-group-toggle">{{ pushGroupCollapsed ? '▼' : '▲' }}</span>
              </div>
              <div v-show="!pushGroupCollapsed" class="push-group-selector">
                <div
                  v-for="group in tokenGroups"
                  :key="group.id"
                  class="push-group-chip"
                  :class="{ 'is-active': pushGroupSelected.includes(group.id) }"
                  :style="{
                    borderColor: group.color,
                    backgroundColor: pushGroupSelected.includes(group.id) ? group.color : 'transparent',
                    color: pushGroupSelected.includes(group.id) ? '#fff' : group.color,
                  }"
                  @click="pushSelectByGroup(group.id)"
                >
                  {{ group.name }}({{ getValidGroupTokenIds(group.id).length }})
                </div>
              </div>
            </div>

            <!-- 可选账号网格 -->
            <div class="push-account-grid">
              <label
                v-for="opt in filteredPushOptions"
                :key="opt.value"
                class="push-account-item"
                :class="{ 'is-selected': pushSelectedTokens.includes(opt.value) }"
                @click.prevent="togglePushAccount(opt.value)"
              >
                <input
                  type="checkbox"
                  :checked="pushSelectedTokens.includes(opt.value)"
                  @click.stop="togglePushAccount(opt.value)"
                />
                <span class="push-account-name">{{ opt.label }}</span>
              </label>
            </div>

            <!-- 操作按钮 -->
            <div class="push-account-actions">
              <n-button size="tiny" secondary @click="pushSelectAll">全选</n-button>
              <n-button size="tiny" secondary @click="pushClearAll">取消全选</n-button>
              <n-button size="tiny" type="primary" @click="addTokensToPushList" :disabled="!pushSelectedTokens.length">
                ➕ 添加到推图列表
              </n-button>
              <span class="push-select-count">{{ pushSelectedTokens.length }} / {{ pushTokenOptions.length }}</span>
            </div>
          </div>
          <div class="push-toolbar-row">
            <div class="push-torch-group">
              <n-select
                v-model:value="pushTorchType"
                :options="[
                  { label: '不使用火把', value: 0 },
                  { label: '🔥 木材(10min)', value: 1008 },
                  { label: '🔥 青铜(20min)', value: 1009 },
                  { label: '🔥 咸神(30min)', value: 1010 },
                ]"
                size="small"
                class="push-torch-select"
              />
              <n-input-number
                v-model:value="pushTorchCount"
                :min="1"
                :max="99"
                size="small"
                placeholder="数量"
                class="push-torch-count"
              />
              <n-button size="small" type="warning" @click="pushUseTorchManual" :disabled="!pushCards.length || !pushTorchType" class="push-torch-btn">
                使用火把
              </n-button>
            </div>
            <div class="push-toolbar-right">
              <n-button size="small" type="success" @click="pushStartAll" :disabled="!pushCards.length" class="push-action-btn">
                全部开始
              </n-button>
              <n-button size="small" type="error" @click="pushStopAll" class="push-action-btn">
                全部停止
              </n-button>
            </div>
          </div>
        </div>

        <!-- 定时控制模块 -->
        <div class="push-timer-section">
          <div class="push-timer-header" @click="pushTimerExpanded = !pushTimerExpanded">
            <span class="push-timer-title">⏰ 定时控制</span>
            <n-tag v-if="pushTimerStatus !== 'idle'" size="tiny" :type="pushTimerStatus === 'running' ? 'success' : 'warning'">
              {{ pushTimerStatus === 'running' ? '定时中' : '待机中' }}
            </n-tag>
            <span class="push-timer-countdown" v-if="pushTimerCountdown">
              {{ pushTimerCountdown }}
            </span>
            <span class="push-timer-toggle">{{ pushTimerExpanded ? '▲' : '▼' }}</span>
          </div>

          <div v-show="pushTimerExpanded" class="push-timer-body">
            <!-- 启动定时 -->
            <div class="push-timer-row">
              <span class="push-timer-label">自动开始</span>
              <div class="push-timer-controls">
                <n-time-picker
                  v-model:value="pushStartTime"
                  format="HH:mm"
                  :actions="[]"
                  :hours="pushTimeHours"
                  :minutes="pushTimeMinutes"
                  placeholder="选择开始时间"
                  size="small"
                  clearable
                  class="push-time-picker"
                />
                <n-button
                  size="small"
                  :type="pushStartTimer ? 'error' : 'primary'"
                  @click="togglePushStartTimer"
                  :disabled="!pushStartTime && !pushStartTimer"
                >
                  {{ pushStartTimer ? '取消开始定时' : '启动定时' }}
                </n-button>
              </div>
            </div>

            <!-- 停止定时 -->
            <div class="push-timer-row">
              <span class="push-timer-label">自动停止</span>
              <div class="push-timer-controls">
                <n-time-picker
                  v-model:value="pushStopTime"
                  format="HH:mm"
                  :actions="[]"
                  :hours="pushTimeHours"
                  :minutes="pushTimeMinutes"
                  placeholder="选择停止时间"
                  size="small"
                  clearable
                  class="push-time-picker"
                />
                <n-button
                  size="small"
                  :type="pushStopTimer ? 'error' : 'warning'"
                  @click="togglePushStopTimer"
                  :disabled="!pushStopTime && !pushStopTimer"
                >
                  {{ pushStopTimer ? '取消停止定时' : '停止定时' }}
                </n-button>
              </div>
            </div>

            <!-- 定时状态提示 -->
            <div class="push-timer-tips" v-if="pushStartTimer || pushStopTimer">
              <span v-if="pushStartTimer">🟢 将于 <strong>{{ pushStartTimeLabel }}</strong> 自动开始推图</span>
              <span v-if="pushStopTimer">🔴 将于 <strong>{{ pushStopTimeLabel }}</strong> 自动停止推图</span>
            </div>
          </div>
        </div>

        <!-- 统计栏 -->
        <div v-if="pushCards.length" class="push-stats">
          <span class="push-stats-running">正在推关：<strong>{{ pushCards.filter(c => c.running).length }}</strong> 人</span>
          <span class="push-stats-detail">
            总计：{{ pushCards.length }} 人 |
            <span class="stat-win-inline">{{ pushCards.reduce((s,c) => s + (c.wins||0), 0) }} 胜</span> |
            <span class="stat-loss-inline">{{ pushCards.reduce((s,c) => s + (c.losses||0), 0) }} 负</span>
          </span>
          <n-button size="tiny" type="error" @click="clearAllPushCards" class="push-clear-all-btn">
            🗑️ 清空全部
          </n-button>
        </div>

        <!-- 战斗卡片区域 - 两列网格 -->
        <div v-if="pushCards.length" class="push-cards-grid">
          <div v-for="card in pushCards" :key="card.id" class="push-card" :class="{ 'push-card--running': card.running }">
            <!-- 紧凑头部：一行显示所有信息 -->
            <div class="push-card-head">
              <span class="push-status-dot" :class="card.running ? 'dot-active' : card.wsStatus === 'connected' ? 'dot-connected' : card.wsStatus === 'connecting' ? 'dot-connecting' : 'dot-disconnected'"></span>
              <span class="push-card-title">{{ shortName(card.name) }}</span>
              <span class="push-card-level" v-if="card.level">Lv.{{ card.level }}</span>
              <span class="push-card-boss" v-if="card.bossNm">{{ card.bossNm }}</span>
              <span class="push-card-stats">
                <span class="push-stat push-stat-win">{{ card.wins }}胜</span>
                <span class="push-stat push-stat-loss">{{ card.losses }}负</span>
              </span>
              <n-button v-if="card.running" size="tiny" quaternary type="error" @click="pushToggleOne(card.id)" class="push-card-stop">■</n-button>
              <n-button v-else size="tiny" quaternary type="success" @click="pushToggleOne(card.id)" class="push-card-stop">▶</n-button>
              <!-- 删除按钮 -->
              <n-button size="tiny" quaternary type="default" @click="removeTokenFromPushList(card.id)" class="push-card-delete" title="退出推图列表">✕</n-button>
            </div>
                        <!-- 进度条+倒计时（仅运行时显示） -->
            <div class="push-card-progress" v-if="card.running && card.totalTime > 0">
              <n-progress
                type="line"
                :percentage="Math.round((1 - card.countdown / card.totalTime) * 100)"
                :show-indicator="false"
                :height="6"
                :color="card.countdown < 10 ? '#f0a020' : '#2080f0'"
                rail-color="#eef1f5"
              />
              <span class="push-card-timer">
                {{ Math.floor(card.countdown / 60) }}:{{ String(Math.floor(card.countdown % 60)).padStart(2, '0') }}
                <span class="push-timer-sep">/</span>
                {{ Math.floor(card.totalTime / 60) }}:{{ String(Math.floor(card.totalTime % 60)).padStart(2, '0') }}
              </span>
            </div>

          </div>
        </div>
        <div v-else class="push-empty">
          <span>在上方选择账号后点击「➕ 添加到推图列表」</span>
        </div>

        <!-- 日志区域（可折叠） -->
        <div class="push-logs-section">
          <div class="push-logs-header" @click="pushLogsCollapsed = !pushLogsCollapsed" style="cursor: pointer;">
            <span class="push-logs-title">推图日志</span>
            <div class="push-logs-header-actions">
              <n-button text size="tiny" @click.stop="pushLogs = []">清空</n-button>
              <span class="push-logs-arrow" :class="{ 'push-logs-arrow--collapsed': pushLogsCollapsed }">▾</span>
            </div>
          </div>
          <div v-show="!pushLogsCollapsed" class="push-logs-list">
            <div v-for="(log, i) in pushLogs.slice(0, 100)" :key="i" class="push-log-item" :class="'log-' + log.type">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
            <div v-if="!pushLogs.length" class="push-logs-empty">暂无日志</div>
          </div>
        </div>
      </div>
    </n-modal>
    <GameWindowToolbar />
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
import { DailyTaskRunner, SIMPLIFIED_TASK_ITEMS } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings, AddCircleOutline, CheckmarkCircleOutline, CloseCircleOutline, ListOutline, CloudDownloadOutline, CloudUploadOutline, SearchOutline, DocumentTextOutline, CreateOutline, TrashOutline, SettingsOutline, PlayOutline, Add, CopyOutline, ChevronDown, Person } from "@vicons/ionicons5";
import { getFirstSaturdayOfMonth, getLastSaturday } from "@/utils/clubBattleUtils";
import TokenCard from "@/components/TokenCard.vue";
import GameWindowToolbar from "@/components/GameWindowToolbar.vue";
import useIndexedDB from "@/hooks/useIndexedDB";
import { storage } from "@/utils/crossPlatformStorage";
import sponsorQrcode from "@/assets/sponsor-qrcode.png";

// Import Token导入表单组件（用于添加Token弹窗）
import ManualTokenForm from "@/views/TokenImport/manual.vue";
import UrlTokenForm from "@/views/TokenImport/url.vue";
import BinTokenForm from "@/views/TokenImport/bin.vue";
import SingleBinTokenForm from "@/views/TokenImport/singlebin.vue";
import WxQrcodeForm from "@/views/TokenImport/wxqrcode.vue";
import YybQrcodeForm from "@/views/TokenImport/yybqrcode.vue";
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
  createTasksClub,
  createTasksItem,
  createTasksDungeon,
  createTasksSaltField,
  createTasksArena,
  createTasksStore,
  createTasksLegacy,
} from "@/utils/batch";
import {
  DEFAULT_CAMP_CHALLENGE_SETTINGS,
  loadCampChallengeSettings,
  saveCampChallengeSettings,
} from "@/utils/batch/tasksClub.js";
import CampChallengeConfig from "@/components/CampChallengeConfig.vue";
import { getModuleDelay, loadDelayGroups, saveDelayGroups, DELAY_GROUPS, DELAY_GROUP_LABELS, DELAY_GROUP_DESCRIPTIONS, DELAY_GROUP_MODULES, MODULE_DELAY_GROUP_MAP } from "@/utils/batch/delayManager";


import { downloadFile } from "@/utils/imageExport";
import { saveBinBackup, getBinBackupWithFallback } from "@/utils/binBackup";
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

// 排序后的全部Token列表（不含搜索过滤，主卡片网格通过 v-show 控制显隐，避免删除关键词时重新挂载卡顿）
const sortedAllTokens = computed(() => {
  let tokens = [...tokenStore.gameTokens];
  
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

// 排序 + 搜索过滤后的Token列表（使用防抖后的关键词，供弹窗账号列表与全选等逻辑使用）
const sortedTokens = computed(() => {
  if (!debouncedTokenSearchKeyword.value.trim()) return sortedAllTokens.value;
  const keyword = debouncedTokenSearchKeyword.value.trim().toLowerCase();
  return sortedAllTokens.value.filter(token => 
    token.name?.toLowerCase().includes(keyword) ||
    token.server?.toLowerCase().includes(keyword) ||
    token.id?.toLowerCase().includes(keyword)
  );
});

// 搜索命中的Token ID集合（主卡片网格 v-show 显隐判断用）
const searchVisibleTokenIds = computed(() => new Set(sortedTokens.value.map(t => t.id)));

// 分组管理弹窗中账号搜索过滤
const filteredGroupTokens = computed(() => {
  if (!groupTokenSearch.value.trim()) return sortedTokens.value;
  // 支持多关键词搜索（空格或逗号分隔），精准匹配（完整名称或完整片段匹配）
  const keywords = groupTokenSearch.value.trim().split(/[,，\s]+/).filter(k => k.length > 0).map(k => k.toLowerCase());
  if (keywords.length === 0) return sortedTokens.value;
  return sortedTokens.value.filter(token => {
    const name = token.name?.toLowerCase() || '';
    const server = token.server?.toLowerCase() || '';
    const id = token.id?.toLowerCase() || '';
    return keywords.some(kw => {
      // 精准匹配：完整名称相等，或按分隔符拆分后某一段完全匹配
      if (name === kw || server === kw || id === kw) return true;
      // 按常见分隔符拆分后精准匹配每一段
      const nameParts = name.split(/[_\-\s、,，]+/);
      const serverParts = server.split(/[_\-\s、,，]+/);
      return nameParts.some(p => p === kw) || serverParts.some(p => p === kw);
    });
  });
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
  // ✅ 直接使用周期计算，不依赖 getCurrentActivityWeek（避免周期边界误判）
  const now = currentTime.value;
  const start = new Date("2025-12-12T12:00:00"); // 黑市周参考起点：周五 12:00
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cycleMs = 3 * weekMs;

  const elapsed = now - start;
  if (elapsed < 0) return false;

  // 1. 检查是否在3周循环的黑市周周期内
  const cyclePosition = elapsed % cycleMs;
  if (cyclePosition >= weekMs) return false; // 招募周或宝箱周

  // 2. 检查是否在黑市周间歇期（周五 00:00-11:59）
  // 黑市周从周五 12:00 开始，到下周四周 23:59 结束
  // 周五 00:00-11:59 是间歇期（新周期的第一天但活动尚未开启）
  const day = now.getDay();
  if (day === 5) {
    const hour = now.getHours();
    if (hour < 12) return false; // 周五 12:00 前是间歇期
  }

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
const tokenFailReasons = ref({}); // { tokenId: '失败原因' }，用于追踪每个账号的失败原因
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
const groupTokenSearch = ref(""); // 分组管理账号搜索关键词
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const taskScheduleSelectedGroupIds = ref([]); // 定时任务中通过分组按钮选中的分组ID列表
const batchDeleteSelectedGroupIds = ref([]); // 分组管理弹窗中批量删除选中的分组ID列表
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

// ======================
// SaltCup Bet Feature (比赛竞猜)
// ======================
const showSaltCupBetModal = ref(false);
const saltCupMatchList = ref([]);
const saltCupBetLoading = ref(false);

// ======================
// Apex Guess Feature (逐鹿盐山竞猜)
// ======================
const showApexGuessModal = ref(false);
const apexGuessLoading = ref(false);
// localStorage 持久化期次/赛程选中值，下次打开弹窗自动恢复
const apexGuessScheduleId = ref(Number(localStorage.getItem("saltHillGuessScheduleId")) || 20);
const apexGuessGroupId = ref(Number(localStorage.getItem("saltHillGuessStage")) || 1);
const apexGuessMatchList = ref([]); // [{ left, right, picked: 'left'|'right'|null }]
const apexGuessPickedCount = computed(() => apexGuessMatchList.value.filter(m => m.picked).length);

// 选中值变化时自动保存到 localStorage，下次打开弹窗恢复
watch(apexGuessGroupId, (val) => { localStorage.setItem("saltHillGuessStage", val); });
watch(apexGuessScheduleId, (val) => { localStorage.setItem("saltHillGuessScheduleId", val); });

// ✅ 公共探测函数：从决赛(26)→64强(20)逆序试探，找到首个有数据的赛程（局部编号），全部无数据返回 null
// 弹窗打开与切期次共用，避免用 localStorage 恢复的旧赛程拉到上一赛程对阵
const detectApexSchedule = async (tokenId, groupId) => {
  for (let sId = 26; sId >= 20; sId--) {
    const realScheduleId = groupId * 26 + sId;
    try {
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "apex_getguesslist",
        { scheduleId: realScheduleId, groupId, idx: 0 },
        5000
      );
      const list = res?.apexGuessList;
      if (Array.isArray(list) && list.length > 0) {
        return sId;
      }
    } catch (e) {
      // 该赛程无数据，继续试探更早的赛程
    }
  }
  return null;
};

// 期次变化时自动探测最新赛程（从决赛→64强逆序试探，第一个返回数据的即为当前赛程）
const apexScheduleDetecting = ref(false);
watch(apexGuessGroupId, async (newGroupId, oldGroupId) => {
  if (!showApexGuessModal.value) return;
  if (newGroupId === oldGroupId) return;

  apexScheduleDetecting.value = true;
  apexGuessMatchList.value = [];

  const tokenId = selectedTokens.value[0];
  if (!tokenId) {
    apexGuessScheduleId.value = 20;
    apexScheduleDetecting.value = false;
    return;
  }

  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    apexGuessScheduleId.value = 20;
    apexScheduleDetecting.value = false;
    return;
  }

  const detected = await detectApexSchedule(tokenId, newGroupId);
  if (detected !== null) {
    apexGuessScheduleId.value = detected;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `🔍 第${newGroupId + 1}期自动探测到最新赛程：${["64强","32强","16强","8强","4强","季军赛","决赛"][detected - 20]}（scheduleId=${newGroupId * 26 + detected}）`,
      type: "info",
    });
  } else {
    // 全部赛程均无数据（可能新期次未开赛），默认 64强
    apexGuessScheduleId.value = 20;
  }
  apexScheduleDetecting.value = false;
});

// ======================
// Apex Cheering Feature (竞技大厅助威)
// ======================
const showApexCheerModal = ref(false);
const apexVoteList = ref([]);
const apexCheerLoading = ref(false);
const apexVoteCount = ref(0); // 0 = 全部赠送
const maxApexVoteCount = ref(0); // 当前助威币数量（从 apex_getroleinfo 获取）
const selectedApexTeamId = ref(null);
const selectedApexRound = ref(1); // 场次选择（1-7）
const selectedApexGroupId = ref(1); // 分组选择（1-32）
const apexClubSearch = ref(''); // 俱乐部搜索关键词
const apexRoundDetecting = ref(false); // 期次自动探测中
const apexRoundDetected = ref(null); // 探测到的当前期次（null=未探测）

// 分组切换时自动刷新俱乐部列表
watch(selectedApexGroupId, () => {
  if (showApexCheerModal.value && !apexClubSearch.value.trim()) {
    fetchApexVoteList();
  }
});

// 搜索关键词变化时，跨所有分组搜索
let apexSearchTimer = null;
watch(apexClubSearch, (newVal) => {
  if (!showApexCheerModal.value) return;
  clearTimeout(apexSearchTimer);
  if (newVal.trim()) {
    // 有搜索关键词时，跨所有分组搜索
    apexSearchTimer = setTimeout(() => {
      fetchApexVoteList(true);
    }, 500);
  } else {
    // 清空搜索时，恢复当前分组数据
    apexSearchTimer = setTimeout(() => {
      fetchApexVoteList(false);
    }, 300);
  }
});

// 期次切换时自动刷新俱乐部列表
watch(selectedApexRound, () => {
  if (showApexCheerModal.value && !apexClubSearch.value.trim()) {
    fetchApexVoteList();
  }
});

// 自动探测当前活跃期次：从第7期到第1期逆序试探，第一个返回数据的期次即为当前活跃期
const detectCurrentApexRound = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于探测期次");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  apexRoundDetecting.value = true;
  apexRoundDetected.value = null;
  try {
    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name} 以探测当前期次...`,
        type: "info",
      });
      await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在探测当前活跃期次（从第7期到第1期）...`,
      type: "info",
    });

    // 从高到低探测，第一个有数据的期次即为当前活跃期
    for (let round = 7; round >= 1; round--) {
      try {
        const response = await tokenStore.sendMessageWithPromise(
          tokenId,
          "apex_getvotelist",
          { groupId: 1, idx: 0, round },
          8000
        );
        if (response && response.apexVoteList && response.apexVoteList.length > 0) {
          selectedApexRound.value = round;
          apexRoundDetected.value = round;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ 探测到当前活跃期次：第${round}期（${response.apexVoteList.length} 支队伍）`,
            type: "success",
          });
          message.success(`已自动切换到当前活跃期次：第${round}期`);
          return;
        }
      } catch (e) {
        console.warn(`探测第${round}期失败:`, e.message);
      }
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️ 所有期次均无数据，保持当前选择：第${selectedApexRound.value}期`,
      type: "warning",
    });
    message.warning("未能探测到活跃期次，请手动选择");
  } catch (error) {
    console.error("Detect apex round error:", error);
    message.error("探测期次失败：" + error.message);
  } finally {
    apexRoundDetecting.value = false;
  }
};

// 弹窗关闭时释放连接槽（处理点击X按钮关闭的情况）
watch(showApexCheerModal, (newVal) => {
  if (!newVal) {
    for (const tokenId of selectedTokens.value) {
      tokenStore.closeWebSocketConnection(tokenId);
    }
  }
});

// 搜索过滤后的俱乐部列表
const filteredApexVoteList = computed(() => {
  const keyword = apexClubSearch.value.trim().toLowerCase();
  if (!keyword) return apexVoteList.value;
  return apexVoteList.value.filter(item => 
    item.name.toLowerCase().includes(keyword) || item.teamId.toLowerCase().includes(keyword)
  );
});

// 列定义
// 手机端适配：窄屏下缩小列宽，队伍名称自适应剩余宽度
const apexCheerIsMobile = ref(window.innerWidth <= 768);
const handleApexCheerResize = () => { apexCheerIsMobile.value = window.innerWidth <= 768; };
const apexVoteColumns = computed(() => [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'teamId', width: apexCheerIsMobile.value ? 90 : 150, ellipsis: { tooltip: true } },
  { title: '头像', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '36px', height: '36px', borderRadius: '4px' } });
  }, width: apexCheerIsMobile.value ? 56 : 80 },
  { title: '队伍名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '战力', key: 'power', width: apexCheerIsMobile.value ? 90 : 140, render(row) {
      return h('div', null, [formatPower(row.power)]);
    }},
  { title: '已获助力', key: 'cheerCnt', width: apexCheerIsMobile.value ? 90 : 120, render(row) {
      return h('div', null, [(row.cheerCnt || 0).toLocaleString()]);
    }},
]);

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

// Apex Cheer 相关函数
const apexVoteRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedApexTeamId.value = row.teamId;
    },
  };
};

const openApexCheerModal = async () => {
  showApexCheerModal.value = true;
  // 先自动探测当前活跃期次，再获取列表（探测会自动切换到活跃期次）
  await detectCurrentApexRound();
  await fetchApexVoteList();
  await getMaxApexVoteCount();
};

const closeApexCheerModal = () => {
  // 关闭弹窗时释放所有账号的连接槽
  for (const tokenId of selectedTokens.value) {
    tokenStore.closeWebSocketConnection(tokenId);
  }
  showApexCheerModal.value = false;
  apexRoundDetected.value = null; // 重置探测状态
};

const fetchApexVoteList = async (fetchAllGroups = false) => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取竞技大厅列表");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  apexCheerLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: fetchAllGroups
        ? `正在使用 ${token.name} 跨所有分组搜索竞技大厅...`
        : `正在使用 ${token.name} 获取竞技大厅助威列表...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 正在连接中，请稍候...`,
        type: "info",
      });
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败，请检查Token是否有效`);
      }
    }

    let allResults = [];

    if (fetchAllGroups) {
      // 跨所有32个分组搜索
      for (let gid = 1; gid <= 32; gid++) {
        try {
          const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getvotelist", { groupId: gid, idx: 0, round: selectedApexRound.value }, 10000);
          if (response && response.apexVoteList) {
            allResults = allResults.concat(response.apexVoteList);
          }
        } catch (e) {
          console.warn(`获取第${gid}组数据失败:`, e.message);
        }
      }
    } else {
      // 只获取当前分组
      const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getvotelist", { groupId: selectedApexGroupId.value, idx: 0, round: selectedApexRound.value }, 10000);
      if (response && response.apexVoteList) {
        allResults = response.apexVoteList;
      }
    }
    
    if (allResults.length > 0) {
      apexVoteList.value = allResults
        .filter(item => !item.isOut)
        .sort((a, b) => (b.cheerCnt || 0) - (a.cheerCnt || 0));
      
      if (fetchAllGroups && apexVoteList.value.length === 0) {
        message.info("所有分组中均未找到可助威队伍");
      }
    } else {
      message.warning("获取竞技大厅列表为空");
      apexVoteList.value = [];
    }
  } catch (error) {
    console.error("Fetch apex vote list error:", error);
    message.error("获取竞技大厅列表失败：" + error.message);
  } finally {
    apexCheerLoading.value = false;
  }
};

// 获取助威币数量（通过 apex_getroleinfo）
const getMaxApexVoteCount = async () => {
  if (selectedTokens.value.length === 0) return;

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在获取 ${token.name} 的助威币数量...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败，请检查Token是否有效`);
      }
    }

    // 发送请求获取角色信息
    const response = await tokenStore.sendMessageWithPromise(tokenId, "apex_getroleinfo", {}, 10000);
    
    if (response && response.apexRoleInfo) {
      maxApexVoteCount.value = response.apexRoleInfo.voteItemCnt || 0;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `当前助威币数量：${maxApexVoteCount.value}`,
        type: "info",
      });
    } else {
      maxApexVoteCount.value = 0;
    }
  } catch (error) {
    console.error("Get max vote count error:", error);
    maxApexVoteCount.value = 0;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取助威币数量失败：${error.message}`,
      type: "error",
    });
  }
};

const applyApexVote = async () => {
  if (!selectedApexTeamId.value) {
    message.warning("请先选择一个队伍");
    return;
  }
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择账号");
    return;
  }
  // ✅ 修复：统一走 executeManualTaskWithRecord，确保「任务完成情况」显示完成时间/用时（原自维护记录无异常保护，异常时记录永远停在“执行中”）
    await executeManualTaskWithRecord('applyApexVote', '竞技大厅助威', applyApexVoteCore);
  // 关闭弹窗
  showApexCheerModal.value = false;
};

const applyApexVoteCore = async () => {
  const isAllVote = apexVoteCount.value === 0;
  const availableTokens = [...selectedTokens.value];

  for (const tokenId of availableTokens) {
    const token = tokens.value.find(t => t.id === tokenId);
    tokenStatus.value[tokenId] = 'running';

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接超时，跳过`,
          type: "error",
        });
        continue;
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] ❌ 连接失败，跳过`,
          type: "error",
        });
        continue;
      }
    }

    try {
      let voteCnt = apexVoteCount.value;

      // 全部赠送：先获取该账号的助威币数量
      if (isAllVote) {
        const roleInfo = await tokenStore.sendMessageWithPromise(tokenId, "apex_getroleinfo", {}, 10000);
        if (roleInfo && roleInfo.apexRoleInfo) {
          voteCnt = roleInfo.apexRoleInfo.voteItemCnt || 0;
        }
        if (voteCnt <= 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `[${token.name}] 助威币不足，跳过`,
            type: "warning",
          });
          continue;
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 助威币：${voteCnt}，全部赠送`,
          type: "info",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `[${token.name}] 对队伍 ${selectedApexTeamId.value} 赠送 ${voteCnt} 次...`,
          type: "info",
        });
      }

      // 发送助威请求
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "apex_vote",
        {
          teamId: selectedApexTeamId.value,
          groupId: selectedApexGroupId.value,
          round: selectedApexRound.value,
          voteCnt: voteCnt,
        },
        10000
      );

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ✅ 助威成功！赠送 ${voteCnt} 次`,
        type: "success",
      });
      tokenStatus.value[tokenId] = 'completed';

      await new Promise(r => setTimeout(r, 500)); // 防止限流
    } catch (error) {
      let errMsg = error.message || '';
      if (errMsg.includes('物品数量不足')) {
        errMsg = errMsg.replace('物品数量不足', '棒槌道具数量不足');
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `[${token.name}] ❌ 助威失败：${errMsg}`,
        type: "error",
      });
      tokenStatus.value[tokenId] = 'failed';
      tokenFailReasons.value[tokenId] = errMsg;
    }
  }

  // ✅ 关闭所有账号的连接，释放连接槽
  for (const tokenId of availableTokens) {
    tokenStore.closeWebSocketConnection(tokenId);
  }
};

// ======================
// SaltRoad Cheering Feature (天宫助威)
// ======================
const showSaltRoadCheerModal = ref(false);
const saltRoadOpponentList = ref([]);
const saltRoadCheerLoading = ref(false);
const saltRoadPhase = ref('');
const saltRoadPhaseInput = ref(''); // 用户输入的phase，留空则自动获取
const saltRoadVoteCount = ref(1);
const selectedSaltRoadBattlefieldId = ref(null);
const selectedSaltRoadGroupId = ref(null); // 选择的 groupId
const selectedSaltRoadSideValue = ref(null); // 1=leftLegion, 2=rightLegion
const selectedSaltRoadWinSid = ref(null); // 实际的 winSid

const saltRoadRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedSaltRoadBattlefieldId.value = row.battlefieldId;
    },
  };
};

const onSaltRoadRowSelect = (keys) => {
  selectedSaltRoadBattlefieldId.value = keys[0] || null;
  // 选中对阵后默认左军
  if (keys[0] && !selectedSaltRoadSideValue.value) {
    selectedSaltRoadSideValue.value = 1;
    // 找到对应数据，设置 winSid
    const row = saltRoadOpponentList.value.find(r => r.groupId === keys[0]);
    if (row && row.leftLegion?.id) {
      selectedSaltRoadWinSid.value = row.leftLegion.id;
    }
  }
};

// 列定义
const saltRoadOpponentColumns = [
  { type: 'selection', multiple: false },
  { title: '组别', key: 'groupId', width: 70 },
  {
    title: '左军', key: 'leftLegion', width: 280,
    render(row) {
      const leg = row.leftLegion;
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('img', { src: leg?.logo || '', style: { width: '32px', height: '32px', borderRadius: '4px' } }),
        h('div', null, [
          h('div', { style: 'font-weight: bold;' }, leg?.name || '-'),
          h('div', { style: 'font-size: 12px; color: #888;' }, `战力: ${formatPower(leg?.power || 0)}`),
        ]),
      ]);
    }
  },
  {
    title: '助威方向', key: 'side', width: 140,
    render(row) {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h('button', {
          style: selectedSaltRoadBattlefieldId.value === row.battlefieldId && selectedSaltRoadSideValue.value === 1
            ? 'padding: 4px 12px; background: #18a058; color: white; border: none; border-radius: 4px; cursor: pointer;'
            : 'padding: 4px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;',
          onClick: (e) => {
            e.stopPropagation();
            selectedSaltRoadBattlefieldId.value = row.battlefieldId;
            selectedSaltRoadGroupId.value = row.groupId;
            selectedSaltRoadSideValue.value = 1;
            selectedSaltRoadWinSid.value = row.leftLegion?.id || null;
          }
        }, '← 左军'),
        h('button', {
          style: selectedSaltRoadBattlefieldId.value === row.battlefieldId && selectedSaltRoadSideValue.value === 2
            ? 'padding: 4px 12px; background: #2080f0; color: white; border: none; border-radius: 4px; cursor: pointer;'
            : 'padding: 4px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;',
          onClick: (e) => {
            e.stopPropagation();
            selectedSaltRoadBattlefieldId.value = row.battlefieldId;
            selectedSaltRoadGroupId.value = row.groupId;
            selectedSaltRoadSideValue.value = 2;
            selectedSaltRoadWinSid.value = row.rightLegion?.id || null;
          }
        }, '右军 →'),
      ]);
    }
  },
  {
    title: '右军', key: 'rightLegion', width: 280,
    render(row) {
      const leg = row.rightLegion;
      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('img', { src: leg?.logo || '', style: { width: '32px', height: '32px', borderRadius: '4px' } }),
        h('div', null, [
          h('div', { style: 'font-weight: bold;' }, leg?.name || '-'),
          h('div', { style: 'font-size: 12px; color: #888;' }, `战力: ${formatPower(leg?.power || 0)}`),
        ]),
      ]);
    }
  },
];

const openSaltRoadCheerModal = async () => {
  showSaltRoadCheerModal.value = true;
  selectedSaltRoadBattlefieldId.value = null;
  selectedSaltRoadGroupId.value = null;
  selectedSaltRoadSideValue.value = null;
  selectedSaltRoadWinSid.value = null;
  saltRoadOpponentList.value = [];
  await fetchSaltRoadOpponents();
};

const closeSaltRoadCheerModal = () => {
  for (const tokenId of selectedTokens.value) {
    tokenStore.closeWebSocketConnection(tokenId);
  }
  showSaltRoadCheerModal.value = false;
};

const fetchSaltRoadOpponents = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  saltRoadCheerLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取天宫助威对阵列表...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connecting") {
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 超时`);
      }
    } else if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接 ${token.name}...`,
        type: "info",
      });
      const result = await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      if (!result) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接由其他进程处理，等待...`,
          type: "info",
        });
      }
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 20) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        throw new Error(`连接 ${token.name} 失败`);
      }
    }

    // 获取 phase 参数
    let phase = saltRoadPhaseInput.value.trim();
    
    // 如果没有手动输入 phase，先尝试通过 saltroad_getwartype 自动获取
    if (!phase) {
      try {
        const firstSaturday = getFirstSaturdayOfMonth();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `正在获取当前盐战信息 (date=${firstSaturday})...`,
          type: "info",
        });
        const warTypeResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getwartype", { date: firstSaturday }, 10000);
        if (warTypeResp) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `盐战信息: ${JSON.stringify(warTypeResp).substring(0, 300)}`,
            type: "info",
          });
          // 尝试从响应中提取 phase/date 信息
          if (warTypeResp.phase) {
            phase = String(warTypeResp.phase);
          } else if (warTypeResp.date) {
            phase = String(warTypeResp.date);
          } else if (warTypeResp.currentPhase) {
            phase = String(warTypeResp.currentPhase);
          }
        }
      } catch (e) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `获取盐战信息失败: ${e.message}，继续尝试直接获取对阵...`,
          type: "warning",
        });
      }
    }

    // 如果仍然没有 phase，使用上周六的日期 (YYMMDD格式) 作为兜底
    if (!phase) {
      const lastSat = getLastSaturday(); // YYYY/MM/DD
      // 转换为 YYMMDD 格式
      const parts = lastSat.split('/');
      if (parts.length === 3) {
        phase = parts[0].slice(2) + parts[1] + parts[2];
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `使用兜底 phase: ${phase} (上周六: ${lastSat})`,
        type: "info",
      });
    }

    const requestParams = { phase };
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `请求参数: ${JSON.stringify(requestParams)}`,
      type: "info",
    });

    const response = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getoutopponent", requestParams, 10000);
    if (response && response.opponentList) {
      saltRoadPhase.value = response.phase || '';
      saltRoadOpponentList.value = response.opponentList.map(item => ({
        battlefieldId: item.battlefieldId,
        groupId: item.groupId,
        winSid: item.winSid,
        leftLegion: item.leftLegion,
        rightLegion: item.rightLegion,
      }));
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `获取到 ${saltRoadOpponentList.value.length} 场对阵`,
        type: "success",
      });
    } else {
      message.warning("获取对阵列表为空");
      saltRoadOpponentList.value = [];
    }
  } catch (error) {
    console.error("Fetch saltroad opponents error:", error);
    message.error("获取对阵列表失败：" + error.message);
  } finally {
    saltRoadCheerLoading.value = false;
  }
};

const applySaltRoadCheer = async () => {
  if (!selectedSaltRoadSideValue.value) {
    message.warning("请选择助威方向（左军/右军）");
    return;
  }

  // ✅ 修复：走 executeManualTaskWithRecord 创建任务完成记录（原直接调用无任何记录/完成时间）
    await executeManualTaskWithRecord('batchSaltRoadCheer', '天宫助威', () =>
    batchSaltRoadCheer(selectedSaltRoadSideValue.value, saltRoadVoteCount.value)
  );

  // 关闭弹窗
  closeSaltRoadCheerModal();
};

// 弹窗关闭时释放连接槽
watch(showSaltRoadCheerModal, (newVal) => {
  if (!newVal) {
    for (const tokenId of selectedTokens.value) {
      tokenStore.closeWebSocketConnection(tokenId);
    }
  }
});

const getRemainingTimeText = () => {
  // 剩余时间文本（月度任务类似的逻辑）
  // 这里可以计算距离月底/月底的具体时间
  return "-";
};

const getSelectedTeamName = () => {
  const team = apexVoteList.value.find(item => item.teamId === selectedApexTeamId.value);
  return team ? `${team.name} (战力：${formatPower(team.power)})` : '未知';
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
  
  // ✅ 修复：走 executeManualTaskWithRecord 创建任务完成记录（原直接调用无任何记录/完成时间）
    await executeManualTaskWithRecord('legion_buy_store_items', '助威商店购买', () => legion_buy_store_items(selectedItems, buyCounts));
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
    // ✅ 修复：走 executeManualTaskWithRecord 创建任务完成记录（原直接调用无任何记录/完成时间）
      await executeManualTaskWithRecord('batchWarGuessCheer', '月赛助威', () =>
        batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value)
    );
};

// SaltCup Bet Functions (比赛竞猜)
const openSaltCupBetModal = async () => {
  showSaltCupBetModal.value = true;
  saltCupMatchList.value = [];
  await fetchSaltCupBetData();
};

const fetchSaltCupBetData = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取竞猜数据");
    return;
  }
  
  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);
  
  saltCupBetLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取比赛竞猜数据...`,
      type: "info",
    });
    
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    const res = await tokenStore.sendMessageWithPromise(tokenId, "SaltCup26_GetBetInfo", {}, 5000);
    
    if (res && res.matchList) {
      const matchList = Array.isArray(res.matchList) ? res.matchList : Object.values(res.matchList);
      const betRecord = res.roleData?.betRecord || {};
      
      // 解析已下注记录，扁平化为 matchId -> record
      const betRecordMap = {};
      for (const scheduleId of Object.keys(betRecord)) {
        const scheduleMap = betRecord[scheduleId];
        for (const matchId of Object.keys(scheduleMap)) {
          const record = scheduleMap[matchId];
          if (record && record.betTime > 0) {
            betRecordMap[matchId] = record;
          }
        }
      }
      
      saltCupMatchList.value = matchList.map(match => {
        // 计算双方总战力
        const leftTotalPower = (match.leftRole?.starList || []).reduce((sum, star) => sum + (star.power || 0), 0);
        const rightTotalPower = (match.rightRole?.starList || []).reduce((sum, star) => sum + (star.power || 0), 0);
        return {
          matchId: match.matchId,
          leftRole: match.leftRole,
          rightRole: match.rightRole,
          leftTotalPower,
          rightTotalPower,
          betRecord: betRecordMap[match.matchId] || null,
        };
      });
    } else {
      message.warning("获取竞猜数据为空");
    }
  } catch (error) {
    console.error("Fetch saltcup bet error:", error);
    message.error("获取竞猜数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取竞猜数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    saltCupBetLoading.value = false;
  }
};

const handleSaltCupBet = async (matchId, pick) => {
  showSaltCupBetModal.value = false;
  // ✅ 修复：走 executeManualTaskWithRecord 创建任务完成记录（原直接调用无任何记录/完成时间）
    await executeManualTaskWithRecord('batchSaltCupBet', '比赛竞猜', () => batchSaltCupBet(matchId, pick));
};

// Apex Guess Functions (逐鹿盐山竞猜)
const openApexGuessModal = async () => {
  showApexGuessModal.value = true;
  apexGuessMatchList.value = [];
  // 打开弹窗自动获取一次对阵列表（已选账号时）
  if (selectedTokens.value.length > 0) {
    // ✅ 修复：先探测当前期次最新赛程，避免 localStorage 恢复的旧赛程拉到上一赛程对阵，勾选后下注报错
    const tokenId = selectedTokens.value[0];
    if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
      apexScheduleDetecting.value = true;
      const detected = await detectApexSchedule(tokenId, apexGuessGroupId.value);
      if (detected !== null) {
        if (detected !== apexGuessScheduleId.value) {
          apexGuessScheduleId.value = detected;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🔍 第${apexGuessGroupId.value + 1}期自动探测到最新赛程：${["64强","32强","16强","8强","4强","季军赛","决赛"][detected - 20]}（scheduleId=${apexGuessGroupId.value * 26 + detected}）`,
            type: "info",
          });
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 第${apexGuessGroupId.value + 1}期当前无任何对阵数据（赛程可能未开放）`,
          type: "warning",
        });
      }
      apexScheduleDetecting.value = false;
    }
    fetchApexGuessList();
  }
};

const fetchApexGuessList = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取对阵数据");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);

  apexGuessLoading.value = true;
  apexGuessMatchList.value = [];
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取逐鹿盐山对阵列表...`,
      type: "info",
    });

    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise(r => setTimeout(r, 2000));
    }

    const matches = [];
    let idx = 0;
    const seen = new Set(); // ✅ 对阵去重：防止服务器忽略 idx 分页导致同一场重复进入列表，勾选后对同一场重复下注报错
    // 编码规则: scheduleId = (期次-1)*26 + 局部编号，期次从1开始，groupId=期次-1
    const realScheduleId = apexGuessGroupId.value * 26 + apexGuessScheduleId.value;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚔️ 逐鹿盐山竞猜：第${apexGuessGroupId.value + 1}期（scheduleId=${realScheduleId}）拉取对阵列表`,
      type: "info",
    });
    for (let page = 0; page < 40; page++) {
      const res = await tokenStore.sendMessageWithPromise(tokenId, "apex_getguesslist", { scheduleId: realScheduleId, groupId: apexGuessGroupId.value, idx }, 5000);
      const list = res?.apexGuessList;
      if (!Array.isArray(list) || list.length === 0) break;
      let addedCount = 0;
      let dupCount = 0;
      for (const pair of list) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const left = pair[0];
          const right = pair[1];
          const key = `${left?.teamId ?? ''}|${right?.teamId ?? ''}`;
          if (seen.has(key)) { dupCount++; continue; }
          seen.add(key);
          addedCount++;
          matches.push({ left, right, picked: null });
        }
      }
      // ✅ 本页全部为重复数据（服务器分页失效），提前结束，避免重复对阵误导勾选
      if (addedCount === 0 && dupCount > 0) break;
      if (res?.last === true) break;
      idx += 5;
    }

    apexGuessMatchList.value = matches;
    if (matches.length === 0) {
      message.warning("获取对阵数据为空");
    }
  } catch (error) {
    console.error("Fetch apex guess list error:", error);
    message.error("获取对阵数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取对阵数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    apexGuessLoading.value = false;
  }
};

const apexGuessPickAll = (mode) => {
  apexGuessMatchList.value.forEach((match) => {
    if (mode === 'left') {
      match.picked = 'left';
    } else if (mode === 'right') {
      match.picked = 'right';
    } else if (mode === 'power') {
      match.picked = (match.right?.power || 0) > (match.left?.power || 0) ? 'right' : 'left';
    } else if (mode === 'cheer') {
      match.picked = (match.right?.cheerCnt || 0) > (match.left?.cheerCnt || 0) ? 'right' : 'left';
    }
  });
};

const handleApexGuess = async () => {
  const teamIds = apexGuessMatchList.value
    .filter(m => m.picked)
    .map(m => (m.picked === 'left' ? m.left?.teamId : m.right?.teamId))
    .filter(Boolean);
  if (teamIds.length === 0) {
    message.warning("请先选择竞猜队伍");
    return;
  }
  showApexGuessModal.value = false;
  // ✅ 修复：走 executeManualTaskWithRecord 创建任务完成记录（原直接调用 batchApexGuess 导致「任务完成情况」不显示；单账号加速由其内部统一处理）
    await executeManualTaskWithRecord('batchApexGuess', '逐鹿盐山竞猜', () =>
    // 下注用真实scheduleId = 期次序号*26 + 淘汰赛局部编号
    batchApexGuess(apexGuessGroupId.value * 26 + apexGuessScheduleId.value, teamIds, 0, apexGuessGroupId.value)
  );
};

// 预设护卫成员状态（账号单独设置弹窗）
const settingsHelperLoading = ref(false);
const settingsHelperMembers = ref([]);

// 黑市采购清单区块折叠状态（默认收起）
const purchaseListCollapsed = ref(true);

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 十殿阵容
  saltFieldPeachFormation: 0, // 盐场阵容：0=跟随当前出战阵容（默认），1-6=指定预设队
  genieFormation: 1, // 灯神挑战阵容（1-6=使用指定预设队，所有势力共用；已取消自动匹配）
  deepSeaFormation: 1, // 深海挑战阵容（1-6=使用指定预设队，独立于灯神，账号设置单独配置）
  bossTimes: 2,
  dailyBossTimes: 3,
  arenaFightCount: 3, // 竞技场战斗次数
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
  helperPresets: [], // 智能发车预设护卫成员
  carUpgradeStrategy: 'score', // 改装策略：'score' (积分优先) | 'rank' (排名优先)
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
  saltFieldPeachFormation: 0, // 盐场阵容：0=跟随当前出战阵容（默认），1-6=指定预设队
  genieFormation: 1, // 灯神挑战阵容（1-6=使用指定预设队，所有势力共用；已取消自动匹配）
  deepSeaFormation: 1, // 深海挑战阵容（1-6=使用指定预设队，独立于灯神，账号设置单独配置）
  bossTimes: 2,
  dailyBossTimes: 3,
  arenaFightCount: 3, // 竞技场战斗次数
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
  legacyGiftPassword: '', // 新增：功法赠送验证密码
  carUpgradeStrategy: 'score', // 改装策略：'score' (积分优先) | 'rank' (排名优先)
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
const boxCountInfo = ref(null);  // 背包宝箱数量显示
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetRounds: 1,  // 目标轮数（1-4轮）
  weeklyMarketItems: [],  // 黑市周购买的商品列表
  fragmentPackItems: [],  // 选中的碎片礼包 itemId 数组
  cdkCode: '',  // 兑换码
  cheerQty: 0,  // 挥鼓助威数量，0=全部
});

const helperModalTitle = computed(() => {
  const titles = { box: "批量开宝箱", fish: "批量钓鱼", recruit: "批量招募", pointsBox: "一键宝箱周开箱", weeklyMarket: "黑市周购买", fragmentPack: "碎片礼包选择", cdk: "兑换码领取", cheer: "挥鼓助威消耗" };
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
  { label: "赵云", value: 118 },
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

// 逐鹿商店 Modal State
const showApexShopModal = ref(false);

const openApexShopModal = () => {
  // 初始化 _checked 状态
  apexShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showApexShopModal.value = true;
};

const executeApexShopBuy = () => {
  showApexShopModal.value = false;
  
  // Save configuration for scheduled tasks
  const selectedItems = apexShopConfig.value
    .filter(item => item._checked && item.count > 0)
    .map(item => ({
      id: item.id,
      name: item.name,
      count: item.count,
    }));
  
  if (selectedItems.length === 0) {
    message?.warning("请至少选择一个商品");
    return;
  }
  
  // Build apexBuyItems object with id as key (for task config matching)
  batchSettings.apexBuyItems = {};
  apexShopConfig.value.forEach(item => {
    if (item._checked && item.count > 0) {
      batchSettings.apexBuyItems[String(item.id)] = {
        selected: true,
        count: item.count,
        label: item.name,
        min: 1,
        max: item.limit,
      };
    }
  });
  saveBatchSettings();
  
  apex_buy(selectedItems);
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
  
  // ✅ 显示并发数量日志，与定时任务和其他手动任务保持一致
  const totalAccounts = selectedTokens.value.length;
  const maxConcurrent = batchSettings.maxActive > 0 ? batchSettings.maxActive : '全局设置';
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `📊 开始执行 英雄四圣升级，共 ${totalAccounts} 个账号，并发数:${maxConcurrent}`,
    type: 'info',
  });
  
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

// === 竞技场次数选择相关 ===
// 竞技场次数选项（预设值）
const arenaFightCountOptions = [
  { label: '1次', key: 1 },
  { label: '3次', key: 3 },
  { label: '5次', key: 5 },
  { label: '8次', key: 8 },
  { label: '10次', key: 10 },
  { label: '自定义...', key: 'custom' },
];

// 处理竞技场次数选择
const handleArenaFightCountSelect = (key) => {
  if (key === 'custom') {
    // 弹出输入框让用户输入
    const inputCount = prompt('请输入竞技场战斗次数（1-100）:', currentSettings.arenaFightCount);
    if (inputCount !== null) {
      const count = parseInt(inputCount);
      if (!isNaN(count) && count >= 1 && count <= 100) {
        currentSettings.arenaFightCount = count;
        executeArenaFight();
      } else {
        message.warning('请输入1-100之间的数字');
      }
    }
  } else {
    currentSettings.arenaFightCount = key;
    executeArenaFight();
  }
};

// 执行竞技场战斗（带参数）
const executeArenaFight = async () => {
  try {
    const fightCount = currentSettings.arenaFightCount || 3;
    // 调用 executeManualTaskWithRecord，并传递竞技场次数参数
    await executeManualTaskWithRecord(
      'batcharenafight', 
      `一键竞技场战斗${fightCount}次`, 
      () => batcharenafight(fightCount)
    );
  } catch (error) {
    console.error('竞技场战斗执行失败:', error);
  }
};

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
  targetBoxRounds: 1,  // 定时按积分开箱目标轮数（每轮8000分，最多4轮）
  receiverId: "",
  tokenListColumns: 4,  // 默认4列
  autoColumns: true,    // 默认启用自动列数
  useGoldRefreshFallback: false,
  // 延迟配置（毫秒） - 保留用于向后兼容
  commandDelay: 1000,       // 命令间延迟
  taskDelay: 1000,          // 任务间延迟
  dailySubtaskDelay: 300,   // 日常任务子任务间延迟（同模块内每个子任务完成后的等待）
  rewardClaimDelay: 3000,   // 奖励领取间延迟（日常奖励、周常奖励等领取操作间的等待）
  actionDelay: 1000,        // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 1500,        // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1500,       // 刷新延迟（发车刷新等）
  longDelay: 5000,          // 长延迟（功法赠送等）
  taskIntervalWait: 0,      // 定时任务中每完成一个任务后的等待时间(秒)，0为不等待
  batchIntervalWait: 5,     // 定时任务中每完成一批账号后的等待时间(秒)，默认5秒，0为不等待
  // 单账号智能加速配置
  singleAccountSpeedUp: true,          // 是否启用单账号自动加速（总开关）
  singleAccountMultiplier: 0.2,        // 单账号延迟倍率（0.2=原延迟的20%，即加速5倍）
  singleAccountMode: false,            // 运行时标志（不持久化，由执行逻辑自动设置）
  // 功能模块延迟分组配置(ms) - 新统一延迟系统
  // 快速/标准/战斗/重度 四个分组，模块自动映射到对应分组
  delayGroups: { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 },
  // 旧模块延迟配置（保留向后兼容，新代码优先使用 delayGroups）
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
    nightmare: 3000,    // 十殿抽奖
    default: 800,       // 默认
  },
  // 黑市多选购买配置
  manualBuyItems: [],
  // 珍宝阁商店购买配置
  collectionExchangeItems: [],
  // 其他配置
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 30000,
  reconnectDelay: 5000,
  maxLogEntries: 1000,
  // 批量任务超时时间配置（单位：分钟）
  batchTaskTimeout: 240, // 默认 4 小时，可在此调整
  // 页面刷新配置
  enableRefresh: true,
  refreshInterval: 360, // 分钟
  // Cron定时刷新
  enableCronRefresh: false,
  cronRefreshExpression: '',
  smartDepartureEnabled: true,
  smartDepartureGoldThreshold: 800,
  smartDepartureRecruitThreshold: 20,
  smartDepartureJadeThreshold: 1500,
  smartDepartureTicketThreshold: 4,
  requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
  customPriority: false, // 自定义优先模式：开启后必须满足自定义条件才发车
  // 分页配置
  tokensPerPage: 20,      // 账号每页显示数量
  logPageSize: 100,       // 日志虚拟滚动每页数量
  // 高级配置
  defaultCommandTimeout: 5000,      // 默认命令超时时间(ms)
  battleCommandTimeout: 12000,      // 战斗命令超时时间(ms)
  defaultRetryCount: 2,             // 默认重试次数
  retryDelay: 10000,                 // 重试延迟(ms)
  accountRetryInterval: 5000,       // 账号间重试间隔(ms)
  // 宠物合成等级限制
  petMergeMaxLevelEnabled: true,    // 是否启用宠物合成等级限制，默认开启
  petMergeMaxLevel: 4,              // 合成等级上限（1-7），默认4级
  // 兑换码
  cdkCode: '',                      // 兑换码（定时任务使用）
  // 换皮闯关失败次数控制
  skinChallengeMaxFail: 5,          // 换皮闯关连续失败次数上限，默认5次
});

// 账号搜索关键词（输入框实时绑定）
const tokenSearchKeyword = ref("");
// 防抖后的搜索关键词（实际过滤使用，停止输入300ms后才更新）
const debouncedTokenSearchKeyword = ref("");
let tokenSearchDebounceTimer = null;

// 处理账号搜索（300ms防抖，避免每敲一个字符就触发全量过滤渲染）
const handleTokenSearch = () => {
  if (tokenSearchDebounceTimer) {
    clearTimeout(tokenSearchDebounceTimer);
  }
  tokenSearchDebounceTimer = setTimeout(() => {
    debouncedTokenSearchKeyword.value = tokenSearchKeyword.value;
    tokenSearchDebounceTimer = null;
  }, 300);
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
      // 深度合并 delayGroups，保留新增分组的默认值
      if (parsed.delayGroups && batchSettings.delayGroups) {
        Object.assign(batchSettings.delayGroups, parsed.delayGroups);
        delete parsed.delayGroups;
      }
      // 如果没有 delayGroups 但 moduleDelays 存在，从 moduleDelays 迁移默认值
      if (!batchSettings.delayGroups || Object.keys(batchSettings.delayGroups).length === 0) {
        batchSettings.delayGroups = { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 };
      }
      Object.assign(batchSettings, parsed);
      // 确保运行时标志不被持久化
      batchSettings.singleAccountMode = false;
      
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
    // 临时剥离运行时标志
    const runtimeFlags = { singleAccountMode: batchSettings.singleAccountMode };
    batchSettings.singleAccountMode = false;
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
    // 恢复运行时标志
    Object.assign(batchSettings, runtimeFlags);
    
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

// 开关切换时自动保存（不弹窗提示）
const autoSaveBatchSettings = () => {
  try {
    console.log('🔧 [AutoSave] 当前设置:', { 
      maxLevelEnabled: batchSettings.petMergeMaxLevelEnabled,
      maxLevel: batchSettings.petMergeMaxLevel
    }); // 🔍 调试日志
    // 剥离运行时标志
    const wasSingleMode = batchSettings.singleAccountMode;
    batchSettings.singleAccountMode = false;
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    console.log('💾 [AutoSave] 已保存到 localStorage'); // 🔍 调试日志
    batchSettings.singleAccountMode = wasSingleMode;
  } catch (e) {
    console.error('❌ [AutoSave] 保存失败:', e); // 🔍 错误日志
  }
};

// 恢复模块延迟默认值（现在为延迟分组）
const resetModuleDelays = () => {
  const defaults = { fast: 2000, normal: 3000, battle: 3000, heavy: 5000 };
  Object.keys(defaults).forEach(key => {
    batchSettings.delayGroups[key] = defaults[key];
  });
  message.success("模块延迟分组已恢复默认值");
};

// 延迟分组列表（用于UI渲染）
const delayGroupList = computed(() => [
  { key: 'fast', label: DELAY_GROUP_LABELS.fast, desc: DELAY_GROUP_DESCRIPTIONS.fast, modules: DELAY_GROUP_MODULES.fast },
  { key: 'normal', label: DELAY_GROUP_LABELS.normal, desc: DELAY_GROUP_DESCRIPTIONS.normal, modules: DELAY_GROUP_MODULES.normal },
  { key: 'battle', label: DELAY_GROUP_LABELS.battle, desc: DELAY_GROUP_DESCRIPTIONS.battle, modules: DELAY_GROUP_MODULES.battle },
  { key: 'heavy', label: DELAY_GROUP_LABELS.heavy, desc: DELAY_GROUP_DESCRIPTIONS.heavy, modules: DELAY_GROUP_MODULES.heavy },
]);

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
// Scheduled Tasks State Management
const scheduledTasks = ref([]); // List of all scheduled tasks
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const editingTask = ref(null); // Currently editing task
const showCampChallengeModal = ref(false); // 营地挑战设置弹窗
const campChallengeForm = ref({ ...DEFAULT_CAMP_CHALLENGE_SETTINGS }); // 营地挑战设置（手动执行）
const ensureTaskCampForm = () => {
  if (!taskForm.campChallenge) {
    taskForm.campChallenge = { ...loadCampChallengeSettings() };
  } else {
    // 编辑旧任务时，缺失的新字段自动补默认值，保证 UI 展示与运行时一致
    const missing = Object.keys(DEFAULT_CAMP_CHALLENGE_SETTINGS).some(
      (k) => !(k in taskForm.campChallenge),
    );
    if (missing) {
      taskForm.campChallenge = {
        ...DEFAULT_CAMP_CHALLENGE_SETTINGS,
        ...taskForm.campChallenge,
      };
    }
  }
  return taskForm.campChallenge;
};

// Account Selector for Scheduled Tasks
const showAccountSelectorModal = ref(false);
const selectedGroupNames = ref(new Set()); // ✅ 使用 Set 支持多选分组名称
const currentTask = ref(null);

// Get unique group names with token counts from tokenGroups (separated array of TokenGroup[])
const getUniqueGroupNames = computed(() => {
  if (!tokenGroups.value || tokenGroups.value.length === 0) return [];
  const groupsMap = new Map(); // 使用 Map 存储分组名和计数
  
  (tokenGroups.value || []).forEach(group => {
    if (group.name && group.tokenIds) {
      const count = group.tokenIds.length;
      groupsMap.set(group.name, count);
    }
  });
  
  // 按账号数量降序排列
  return Array.from(groupsMap.entries())
    .sort((a, b) => b[1] - a[1]) // 按账号数从大到小排序
    .map(([name, count]) => ({ name, count }));
});

const filteredTokens = computed(() => {
  if (!selectedGroupNames.value || selectedGroupNames.value.size === 0) return tokenStore.gameTokens || [];
  
  // Filter by all selected groups
  const validTokenIds = new Set();
  (selectedGroupNames.value || []).forEach(groupName => {
    const targetGroup = tokenGroups.value.find(g => g.name === groupName);
    if (targetGroup) {
      targetGroup.tokenIds.forEach(id => validTokenIds.add(id));
    }
  });
  
  return (tokenStore.gameTokens || []).filter(t => validTokenIds.has(t.id));
});

// Watch for group selection to auto-check tokens
watch(selectedGroupNames, (newGroups) => {
  // Note: This watch might not work as intended because we're watching a Set object itself
  // The deep: true won't detect changes to Set internals
  // This logic may need to be moved to toggleGroupSelectionLogic instead
}, { deep: true });

const openAccountSelector = (task) => {
  currentTask.value = task;
  if (selectedGroupNames.value) {
    selectedGroupNames.value.clear(); // ✅ 清空 Set
  }
  showAccountSelectorModal.value = true;
};

// 清空分组筛选（模板中"全部"按钮的点击处理）
const clearGroupFilterSelection = () => {
  if (selectedGroupNames.value) {
    selectedGroupNames.value = new Set(); // 重新赋值触发响应式更新
  }
  message.success('已清空所有分组筛选');
};

const toggleTokenSelection = (tokenId, checked) => {
  if (!currentTask.value) return;
  if (checked) {
    if (!currentTask.value.selectedTokens.includes(tokenId)) {
      currentTask.value.selectedTokens.push(tokenId);
    }
  } else {
    currentTask.value.selectedTokens = currentTask.value.selectedTokens.filter(id => id !== tokenId);
  }
};

const selectAllVisibleTokens = () => {
  if (!currentTask.value) return;
  const visibleIds = filteredTokens.value.map(t => t.id);
  currentTask.value.selectedTokens = [...new Set([...currentTask.value.selectedTokens, ...visibleIds])];
};

// ✅ 新增：切换分组选择（支持多选/取消）
const toggleGroupSelectionLogic = (groupName) => {
  if (!currentTask.value) return;
  const current = new Set(selectedGroupNames.value || []);
  if (current.has(groupName)) {
    // 取消选择该分组，移除其所有账号
    current.delete(groupName);
    const groupTokens = tokenGroups.value.find(g => g.name === groupName)?.tokenIds || [];
    currentTask.value.selectedTokens = currentTask.value.selectedTokens.filter(id => !groupTokens.includes(id));
    message.info(`已取消 "${groupName}" 分组的选择`);
  } else {
    // 添加分组，自动勾选其所有账号
    current.add(groupName);
    const groupTokens = tokenGroups.value.find(g => g.name === groupName)?.tokenIds || [];
    currentTask.value.selectedTokens = [...new Set([...currentTask.value.selectedTokens, ...groupTokens])];
    message.success(`已自动勾选 "${groupName}" 分组的 ${groupTokens.length} 个账号`);
  }
  selectedGroupNames.value = current; // 重新赋值触发响应式更新
};

const clearVisibleTokens = () => {
  if (!currentTask.value) return;
  const visibleIds = filteredTokens.value.map(t => t.id);
  currentTask.value.selectedTokens = currentTask.value.selectedTokens.filter(id => !visibleIds.includes(id));
};

const selectByTokenGroup = () => {
  if (!currentTask.value || !selectedGroupNames.value || selectedGroupNames.value.size === 0) return;
  // 批量勾选所有选中分组的所有账号
  const allGroupTokens = [];
  (selectedGroupNames.value || []).forEach(groupName => {
    const groupTokens = tokenGroups.value.find(g => g.name === groupName)?.tokenIds || [];
    allGroupTokens.push(...groupTokens);
  });
  currentTask.value.selectedTokens = [...new Set(allGroupTokens)];
  message.success(`已选择 ${selectedGroupNames.value.size} 个分组的共 ${allGroupTokens.length} 个账号`);
};

const saveAccountSelection = () => {
  if (!currentTask.value) return;
  saveScheduledTasks();
  showAccountSelectorModal.value = false;
  message.success("账号选择已保存");
};

// ===== 灯神挑战（副本）手动执行 =====
const genieIdOptions = [
  { label: "魏国", value: 1 },
  { label: "蜀国", value: 2 },
  { label: "吴国", value: 3 },
  { label: "群雄", value: 4 },
];
// 灯神阵容选项（1-6 手动指定预设队；已取消"0=自动按势力选同阵营队"）
const normalizeGenieFormation = (v) => {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 6 ? n : 1;
};
const genieFormationOptions = Array.from({ length: 6 }, (_, i) => ({ label: `阵容${i + 1}`, value: i + 1 }));
// 盐场布阵阵容选项：0=跟随账号当前出战阵容（默认），1-6=指定预设队（复用通用阵容选项）
const saltFieldFormationOptions = [
  { label: "跟随当前出战阵容", value: 0 },
  ...formationOptions,
];
const showGenieChallengeModal = ref(false);
const genieChallengeForm = reactive({ genieIds: [1, 2, 3, 4], dailyLimit: 10 });
const openGenieChallengeModal = () => {
  // 势力默认全选，阵容始终使用账号设置中的灯神预设阵容
  genieChallengeForm.genieIds = [1, 2, 3, 4];
  genieChallengeForm.dailyLimit = 10;
  showGenieChallengeModal.value = true;
};
const startGenieChallengeModal = async () => {
  if (!genieChallengeForm.genieIds.length) return;
  showGenieChallengeModal.value = false;
  await executeManualTaskWithRecord(
    "batchGenieChallenge",
    "灯神挑战",
    () => batchGenieChallenge([...genieChallengeForm.genieIds], normalizeGenieFormation(currentSettings.genieFormation), { dailyLimit: genieChallengeForm.dailyLimit }),
  );
};

// ===== 深海挑战（副本）手动执行 =====
const showDeepSeaChallengeModal = ref(false);
const deepSeaChallengeForm = reactive({ weeklyLimit: 10 });
const openDeepSeaChallengeModal = () => {
  // 阵容始终使用账号设置中单独配置的深海预设阵容（1-6，不限阵营，与灯神预设阵容相互独立）
  deepSeaChallengeForm.weeklyLimit = 10;
  showDeepSeaChallengeModal.value = true;
};
const startDeepSeaChallengeModal = async () => {
  showDeepSeaChallengeModal.value = false;
  await executeManualTaskWithRecord(
    "batchDeepSeaChallenge",
    "深海挑战",
    () => batchDeepSeaChallenge(normalizeGenieFormation(currentSettings.deepSeaFormation || 1), { weeklyLimit: deepSeaChallengeForm.weeklyLimit }),
  );
};

const taskForm = reactive({
  name: "", // Task name
  taskType: "normal", // 'normal' | 'push_map'
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
  offlineTimeEnabled: false, // 是否启用不上线时段
  // 推图任务专属字段
  pushStartTime: null, // 推图开始时间（HH:mm时间戳）
  pushStopTime: null,  // 推图停止时间（HH:mm时间戳，可选）
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
  apexBuyItems: { // 逐鹿商店商品配置
    1: { selected: false, count: 0, label: "饼干", min: 1, max: 25 },
    2: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 75 },
    3: { selected: false, count: 0, label: "四圣转换镜", min: 1, max: 1 },
  },
  fragmentPackItems: [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005], // 碎片礼包选中的 itemId 数组（默认全选）
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
  collectionExchangeItems: { // 珍宝阁商店购买配置
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
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
  boxWeeklyRewards: {5: 1}, // 宝箱周自选大奖配置，默认珍珠 1 次
  arenaFightCount: 3, // 竞技场战斗次数配置
  genieChallenge: { genieIds: [1, 2, 3, 4], formation: 1, dailyLimit: 10 }, // 灯神挑战任务级配置
  deepSeaChallenge: { formation: 1, weeklyLimit: 10 }, // 深海挑战任务级配置（阵容始终取账号设置"灯神预设阵容"，每周一刷新 10 次上限）
  campChallenge: null, // 营地挑战任务级配置（null 时运行时取全局 camp-challenge-settings）
  smartDeparture: { // 智能发车任务级配置（覆盖全局设置）
    enabled: false, // 是否启用任务级配置
    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2, // 刷新后等待同步延迟（秒）
    requireMinColorWithConditions: false, // 满足自定义条件时是否还必须满足最低品质
    customPriority: false, // 自定义优先模式
    useGoldRefreshFallback: false, // 强制用金砖刷新
  },
  nightmarePresetIds: [], // 十殿阎罗挑战预设ID列表
  nightmarePresetDelay: 10, // 预设间执行间隔（秒），默认10秒
  saltCupBetPick: 1, // 比赛竞猜选项: 1=主胜, 2=平局, 3=客胜
  apexGuessScheduleId: 20, // 逐鹿盐山竞猜淘汰赛局部编号: 20=64强…26=决赛（真实scheduleId=期次序号*26+局部）
  apexGuessGroupId: 1, // 逐鹿盐山竞猜期次: 0=第一期, 1=第二期, 2=第三期…
  apexGuessStrategy: 'power', // 逐鹿盐山竞猜策略: left=全押蓝方 right=全押红方 power=押高战力 cheer=押多助威
  saltRoadBattlefieldId: '', // 天宫助威战场ID（已废弃，保留兼容）
  saltRoadSide: 1, // 天宫助威方向: 1=左军, 2=右军
  saltRoadVoteCount: 1, // 天宫助威次数
  saltRoadLegionId: null, // 天宫助威预选军团ID
  saltRoadLegionName: '', // 天宫助威预选军团名（显示用）
  bookUpgradeTypes: ['hero', 'fish', 'skin'], // 图鉴升星类型: hero=英雄, fish=鱼灵, skin=皮肤
  simplifiedDailyItems: SIMPLIFIED_TASK_ITEMS.map(item => item.key), // 日常精简补齐勾选的任务项（默认全选）
  maxActive: 0, // 任务级并发控制：0=使用全局设置，>0=使用此任务的并发数
});

// 定时任务配置 - 天宫助威对阵列表获取
const taskSaltRoadOpponents = ref([]);
const taskSaltRoadLoading = ref(false);

const fetchTaskSaltRoadOpponents = async () => {
  const formTokens = taskForm.selectedTokens;
  if (!formTokens || formTokens.length === 0) {
    message.warning("请先在定时任务中选择至少一个账号");
    return;
  }
  const tokenId = formTokens[0];
  const token = tokens.value.find(t => t.id === tokenId);
  taskSaltRoadLoading.value = true;
  try {
    // 确保连接
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `正在连接 ${token.name} 以获取对阵列表...`, type: "info" });
      await tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(tokenId) !== 'connected' && retries < 15) {
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== 'connected') {
        throw new Error(`连接 ${token.name} 超时`);
      }
    }

    // 获取 phase
    let phase = null;
    try {
      const firstSaturday = getFirstSaturdayOfMonth();
      const warTypeResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getwartype", { date: firstSaturday }, 10000);
      if (warTypeResp) {
        if (warTypeResp.phase) phase = String(warTypeResp.phase);
        else if (warTypeResp.date) phase = String(warTypeResp.date);
        else if (warTypeResp.currentPhase) phase = String(warTypeResp.currentPhase);
      }
    } catch (e) { /* ignore */ }
    if (!phase) {
      const lastSat = getLastSaturday();
      const parts = lastSat.split('/');
      if (parts.length === 3) phase = parts[0].slice(2) + parts[1] + parts[2];
    }

    const opponentResp = await tokenStore.sendMessageWithPromise(tokenId, "saltroad_getoutopponent", { phase }, 10000);
    if (opponentResp && opponentResp.opponentList && opponentResp.opponentList.length > 0) {
      taskSaltRoadOpponents.value = opponentResp.opponentList.map(item => ({
        groupId: item.groupId,
        leftLegion: item.leftLegion,
        rightLegion: item.rightLegion,
      }));
      addLog({ time: new Date().toLocaleTimeString(), message: `获取到 ${taskSaltRoadOpponents.value.length} 场对阵`, type: "success" });
    } else {
      message.warning("获取对阵列表为空");
      taskSaltRoadOpponents.value = [];
    }
  } catch (error) {
    message.error("获取对阵列表失败：" + error.message);
    taskSaltRoadOpponents.value = [];
  } finally {
    taskSaltRoadLoading.value = false;
  }
};

// 任务分组定义
const taskGroupDefinitions = [
  { name: 'daily', label: '日常', tasks: ['startBatch', 'batchSimplifiedDaily', 'claimHangUpRewards', 'batchAddHangUpTime', 'batchHangUpUpgrade', 'resetBottles', 'batchlingguanzi', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'batchCarResearchUpgrade', 'store_purchase', 'batch_mail_claim_and_cleanup'] },
  { name: 'welfare', label: '福利', tasks: ['charge_claimaddup_rewards', 'collection_claimfreereward', 'gacha_drawreward', 'claim_recruit_welfare', 'pkroom_appoint', 'saltcup26_openstarpack_use'] },
  { name: 'dungeon', label: '副本', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'skinTreasure', 'newSkinChallenge', 'newSkinTreasure', 'batchClaimPeachTasks', 'batchBuyDreamItems', 'batchGenieChallenge', 'batchDeepSeaChallenge'] },
  { name: 'baoku', label: '宝库', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '怪异塔', tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy', 'claim_weird_tower_all', 'claim_weird_tower_pass'] },
  { name: 'illustration', label: '图鉴', tasks: ['openHeroFourSaintsModal', 'batchHeroUpgrade', 'batchBookUpgrade', 'batchFishUpgrade', 'batchClaimStarRewards', 'batchCollectionActivate'] },
  { name: 'club', label: '俱乐部', tasks: ['batchclubsign', 'batchLegionSignup', 'batchClubSignup', 'batchAirdropChallenge', 'batchAirdropClaim', 'batchSaltFieldDig', 'batchPayloadSignup', 'switchSaltFieldPeachFormation', 'batchCampChallenge'] },
  { name: 'pet', label: '宠物', tasks: ['legion_buy_spotted_egg', 'use_spotted_egg', 'claim_pet_book', 'batch_pet_merge', 'egg_merge_cycle', 'batch_pet_upgrade'] },
  { name: 'nightmare', label: '十殿', tasks: ['batchNightmareChallengePresets', 'nightmare_draw_lottery', 'nightmare_claim_book_reward', 'star_drawturntable', 'batch_star_challenge'] },
  { name: 'resource', label: '资源', tasks: ['batchOpenBox', 'batchOpenBoxByPoints', 'batchOpenDiamondBox', 'batchOpenFragmentPacks', 'batchClaimBoxWeeklyRewards', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods', 'legionStoreBuySkinCoins', 'weekly_market_buy', 'weekly_market_free_gift', 'store_purchase', 'manual_buy', 'collection_exchange', 'legion_buy_red_jade', 'salt_crystal_shop_buy', 'salt_ingot_shop_buy', 'apex_buy', 'batchGenieSweep', 'batchClaimCdkReward', 'batchClaimApexRewards', 'batchSaltCupBet'] },
  { name: 'legacy', label: '功法', tasks: ['batchLegacyHangup', 'batchLegacyClaim', 'batchLegacyGiftSendEnhanced', 'batchLegacyClaimGiftTask'] },
  { name: 'monthly', label: '月度', tasks: ['batchTopUpFish', 'batchTopUpArena', 'claim_guess_coin', 'legion_buy_store_items', 'batchSaltRoadCheer', 'batchApexGuess', 'batchApexGuessClaim'] },
  // 注：原列有 batchApexCheer，但代码里并不存在该函数（助威只能通过弹窗交互完成），
  // 且 availableTasks 也没有对应项，属死条目，移除以免误导
  { name: 'consumeActivity', label: '消耗活动', tasks: ['batchConsumeActivity', 'batchClaimConsumeRewards', 'batchUseActivityItem', 'batchActivityExchange', 'batchAutumnUseItem'] }
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

// ✅ 动态任务标签计算属性（用于显示竞技场配置的次数）
const taskLabels = computed(() => {
  const labels = {};
  availableTasks.forEach(task => {
    if (task.value === 'batcharenafight') {
      // 竞技场任务显示配置的次数
      labels[task.value] = `一键竞技场战斗${currentSettings.arenaFightCount || 3}次`;
    } else {
      labels[task.value] = task.label;
    }
  });
  return labels;
});

// Cron表达式解析相关变量
const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// Cron定时刷新解析变量
const cronRefreshValidation = ref({ valid: true, message: "" });
const cronRefreshNextRuns = ref([]);

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
 * 检查任务函数是否存在（通过 eval+try-catch 安全检测）
 */
const isTaskFunctionExists = (taskName) => {
  try {
    // ✅ 优先从映射表获取函数引用（生产环境 eval 无法访问组件局部变量）
    if (taskFunctionMap && taskFunctionMap[taskName]) {
      return typeof taskFunctionMap[taskName] === 'function';
    }

    const fn = eval(taskName);
    return typeof fn === 'function';
  } catch {
    return false;
  }
};

/**
 * 清理定时任务中已失效的功能模块引用和 Token 引用
 * 在 onMounted 中调用，自动移除已删除的任务函数和 Token
 */
const cleanupInvalidTaskReferences = () => {
  let cleaned = false;
  
  // ✅ 清理失效的功能模块引用
  for (const task of scheduledTasks.value) {
    if (task.selectedTasks && Array.isArray(task.selectedTasks)) {
      const originalLength = task.selectedTasks.length;
      task.selectedTasks = task.selectedTasks.filter(taskName => {
        // 处理函数名映射
        let fnName = taskName;
        if (taskName === 'weekly_market_buy') fnName = 'weeklyMarketBuy';
        else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
          // manual_buy 和 collection_exchange 直接使用下划线名称
          fnName = taskName;
        }
        return isTaskFunctionExists(fnName);
      });
      if (task.selectedTasks.length !== originalLength) {
        cleaned = true;
        const removedCount = originalLength - task.selectedTasks.length;
        addLog({ time: new Date().toLocaleTimeString(), message: `定时任务「${task.name}」中 ${removedCount} 个已失效的功能模块已自动清理`, type: "info" });
      }
    }
  }
  
  // ✅ 清理失效的 Token 引用
  const allTokenIds = new Set(tokens.value.map(t => t.id));
  for (const task of scheduledTasks.value) {
    if (task.selectedTokens && Array.isArray(task.selectedTokens)) {
      const originalLength = task.selectedTokens.length;
      task.selectedTokens = task.selectedTokens.filter(id => allTokenIds.has(id));
      
      if (task.selectedTokens.length !== originalLength) {
        cleaned = true;
        const removedCount = originalLength - task.selectedTokens.length;
        addLog({ time: new Date().toLocaleTimeString(), message: `定时任务「${task.name}」中 ${removedCount} 个已删除账号已自动移除`, type: "warning" });
      }
    }
  }
  
  if (cleaned) {
    saveScheduledTasks();
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
    taskForm.taskType = "normal";
    taskForm.runType = "daily";
    taskForm.runTime = undefined;
    taskForm.cronExpression = "";
    taskForm.selectedTokens = [];
    taskForm.selectedTasks = [];
    taskForm.enabled = true;
    taskForm.offlineTimeEnabled = false;
    taskForm.pushStartTime = null;
    taskForm.pushStopTime = null;
    
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
    taskForm.smartDeparture = {
      enabled: false,
      goldThreshold: 800,
      recruitThreshold: 20,
      jadeThreshold: 1500,
      ticketThreshold: 4,
      carMinColor: 4,
      refreshDelay: 2,
      requireMinColorWithConditions: false,
      customPriority: false,
      useGoldRefreshFallback: false,
    };
    taskForm.nightmarePresetIds = [];
    taskForm.nightmarePresetDelay = 10;
    taskForm.saltCupBetPick = 1;
    taskForm.apexGuessScheduleId = 20;
    taskForm.apexGuessGroupId = 1;
    taskForm.apexGuessStrategy = 'power';
    taskForm.saltRoadBattlefieldId = '';
    taskForm.saltRoadSide = 1;
    taskForm.saltRoadVoteCount = 1;
    taskForm.saltRoadLegionId = null;
    taskForm.saltRoadLegionName = '';
    taskForm.bookUpgradeTypes = ['hero', 'fish', 'skin'];
    taskForm.maxActive = 0;
    taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
    taskSaltRoadOpponents.value = [];
    taskScheduleSelectedGroupIds.value = [];
  }, 300);
};

const openTaskModal = () => {
  editingTask.value = null;
  
  console.log('[新增任务] 开始初始化表单');
  
  // 重置表单，直接赋値确保嵌套对象正确重置
  taskForm.name = "";
  taskForm.taskType = "normal";
  taskForm.runType = "daily";
  taskForm.runTime = undefined;
  taskForm.cronExpression = "";
  taskForm.selectedTokens = [];
  taskForm.selectedTasks = [];
  taskForm.enabled = true;
  taskForm.offlineTimeEnabled = false;
  taskForm.pushStartTime = null;
  taskForm.pushStopTime = null;
  
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
  
  // 智能发车任务级配置
  taskForm.smartDeparture = {
    enabled: false,
    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2,
    requireMinColorWithConditions: false,
    useGoldRefreshFallback: false,
  };
  
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

  // 逐鹿商店配置
  taskForm.apexBuyItems = {
    1: { selected: false, count: 0, label: "饼干", min: 1, max: 25 },
    2: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 75 },
    3: { selected: false, count: 0, label: "四圣转换镜", min: 1, max: 1 },
  };
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

  // 珍宝阁商店购买商品配置
  taskForm.collectionExchangeItems = {
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
  };

  // 十殿预设配置
  taskForm.nightmarePresetIds = [];
  taskForm.nightmarePresetDelay = 10;
  taskForm.saltCupBetPick = 1;
  taskForm.apexGuessScheduleId = 20;
  taskForm.apexGuessGroupId = 1;
  taskForm.apexGuessStrategy = 'power';
  taskForm.saltRoadBattlefieldId = '';
  taskForm.saltRoadSide = 1;
  taskForm.saltRoadVoteCount = 1;
  taskForm.saltRoadLegionId = null;
  taskForm.saltRoadLegionName = '';
  taskForm.bookUpgradeTypes = ['hero', 'fish', 'skin'];
  taskForm.maxActive = 0;
  // 灯神挑战任务级配置
  taskForm.genieChallenge = { genieIds: [1, 2, 3, 4], formation: 1, dailyLimit: 10 };
  // 深海挑战任务级配置
  taskForm.deepSeaChallenge = { formation: 1, weeklyLimit: 10 };
  // 营地挑战任务级配置（新增任务默认空，运行时读取全局营地挑战设置）
  taskForm.campChallenge = null;
  
  // 碎片礼包配置（默认全选）
  taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
  
  console.log('[新增任务] 初始化完成');
  console.log('[新增任务] weeklyMarketItems:', taskForm.weeklyMarketItems);
  console.log('[新增任务] legionStoreItems:', taskForm.legionStoreItems);
  
  taskSaltRoadOpponents.value = [];
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
  
  // 默认珍宝阁商店购买配置
  const defaultCollectionExchangeItems = {
    7001: { selected: false, count: 0, label: "铂金宝箱" },
    4001: { selected: false, count: 0, label: "军团币" },
    5001: { selected: false, count: 0, label: "招募令" },
    6001: { selected: false, count: 0, label: "万能红将碎片" },
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
  
  // 合并珍宝阁商店购买配置，补充缺失的label
  const mergedCollectionExchangeItems = { ...defaultCollectionExchangeItems };
  if (task.collectionExchangeItems) {
    Object.keys(task.collectionExchangeItems).forEach(key => {
      if (mergedCollectionExchangeItems[key]) {
        mergedCollectionExchangeItems[key] = {
          ...mergedCollectionExchangeItems[key],
          ...task.collectionExchangeItems[key],
        };
      }
    });
  }
  
  const taskData = { 
    ...task,
    taskType: task.taskType || 'normal',
    legionStoreItems: mergedLegionStoreItems,
    weeklyMarketItems: mergedWeeklyMarketItems,
    saltCrystalShopItems: mergedSaltCrystalShopItems,
    saltIngotShopItems: mergedSaltIngotShopItems,
    // 老任务数据没有该字段时为 undefined，必须兜底，否则保存时深拷贝会抛
    // SyntaxError: "undefined" is not valid JSON
    apexBuyItems: task.apexBuyItems || {
      1: { selected: false, count: 0, label: "饼干", min: 1, max: 25 },
      2: { selected: false, count: 0, label: "幻彩灵果", min: 1, max: 75 },
      3: { selected: false, count: 0, label: "四圣转换镜", min: 1, max: 1 },
    },
    manualBuyItems: mergedManualBuyItems,
    collectionExchangeItems: mergedCollectionExchangeItems,
    fragmentPackItems: task.fragmentPackItems || [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005],
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
      customPriority: false,
      useGoldRefreshFallback: false,
    },
    nightmarePresetIds: task.nightmarePresetIds || [],
    nightmarePresetDelay: task.nightmarePresetDelay || 10,
    saltCupBetPick: task.saltCupBetPick !== undefined ? task.saltCupBetPick : 1,
    apexGuessScheduleId: task.apexGuessScheduleId !== undefined ? (task.apexGuessScheduleId >= 46 ? task.apexGuessScheduleId - 26 : task.apexGuessScheduleId) : 20,
    apexGuessGroupId: task.apexGuessGroupId !== undefined ? task.apexGuessGroupId : 1,
    apexGuessStrategy: task.apexGuessStrategy || 'power',
    saltRoadBattlefieldId: task.saltRoadBattlefieldId || '',
    saltRoadSide: task.saltRoadSide !== undefined ? task.saltRoadSide : 1,
    saltRoadVoteCount: task.saltRoadVoteCount || 1,
    saltRoadLegionId: task.saltRoadLegionId || null,
    saltRoadLegionName: task.saltRoadLegionName || '',
    bookUpgradeTypes: task.bookUpgradeTypes && task.bookUpgradeTypes.length > 0 ? [...task.bookUpgradeTypes] : ['hero', 'fish', 'skin'],
    simplifiedDailyItems: task.simplifiedDailyItems && task.simplifiedDailyItems.length > 0 ? [...task.simplifiedDailyItems] : SIMPLIFIED_TASK_ITEMS.map(item => item.key),
    arenaFightCount: task.arenaFightCount || 3, // 竞技场战斗次数配置
    maxActive: task.maxActive !== undefined ? task.maxActive : 0, // 任务级并发控制：0=使用全局
    // 灯神挑战配置兜底（老任务无该字段时为 undefined，须补默认）
    genieChallenge: task.genieChallenge && Array.isArray(task.genieChallenge.genieIds)
      ? { genieIds: [...task.genieChallenge.genieIds], formation: normalizeGenieFormation(task.genieChallenge.formation), dailyLimit: task.genieChallenge.dailyLimit || 10 }
      : { genieIds: [1, 2, 3, 4], formation: 1, dailyLimit: 10 },
    // 深海挑战配置兜底
    deepSeaChallenge: task.deepSeaChallenge
      ? { weeklyLimit: task.deepSeaChallenge.weeklyLimit || task.deepSeaChallenge.dailyLimit || 10 }
      : { weeklyLimit: 10 },
    pushStartTime: task.pushStartTime ? (() => {
      const [h, m] = task.pushStartTime.split(':').map(Number);
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
    })() : null,
    pushStopTime: task.pushStopTime ? (() => {
      const [h, m] = task.pushStopTime.split(':').map(Number);
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
    })() : null,
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
  // 浅拷贝基本属性
  Object.assign(taskForm, taskData);
  // 深度合并 smartDeparture，保留 Vue 响应式
  if (taskData.smartDeparture) {
    Object.assign(taskForm.smartDeparture, taskData.smartDeparture);
  }
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// 复制任务：以原任务配置为基础创建新任务（名称加"(副本)"，ID 重新生成）
const copyTask = (task) => {
  editTask(task);            // 复用编辑逻辑填充表单
  editingTask.value = null;  // 标记为新任务，saveTask 会走创建路径
  taskForm.name = (task.name || '未命名') + ' (副本)';
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

// 解析 Cron 定时刷新表达式
const parseCronRefreshExpression = () => {
  const expression = batchSettings.cronRefreshExpression;
  if (!expression || !expression.trim()) {
    cronRefreshValidation.value = { valid: true, message: '' };
    cronRefreshNextRuns.value = [];
    return;
  }
  const validation = validateCronExpression(expression);
  cronRefreshValidation.value = validation;
  if (!validation.valid) {
    cronRefreshNextRuns.value = [];
    return;
  }
  const cronParts = expression.split(" ").filter(Boolean);
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = cronParts;
  const nextRuns = calculateNextRuns(minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField, 5);
  cronRefreshNextRuns.value = nextRuns;
};

// 注: calculateNextRuns 已从 @/utils/batch 导入

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("请输入任务名称");
    return;
  }

  // 推图任务特殊验证
  if (taskForm.taskType === 'push_map') {
    if (!taskForm.pushStartTime) {
      message.warning("请选择开始推图时间");
      return;
    }
    // 推图任务直接跳过其他验证，进入保存逻辑
    const msToTimeStr = (ms) => {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    const taskData = {
      id: editingTask.value?.id || "task_" + Date.now(),
      name: taskForm.name,
      taskType: 'push_map',
      runType: 'daily',
      runTime: msToTimeStr(taskForm.pushStartTime), // 以开始时间为主时间（调度器将根据此时间触发）
      cronExpression: '',
      selectedTokens: [],
      selectedTasks: [],
      enabled: taskForm.enabled,
      offlineTimeEnabled: taskForm.offlineTimeEnabled || false, // 推图任务也支持不上线时段
      pushStartTime: msToTimeStr(taskForm.pushStartTime),
      pushStopTime: taskForm.pushStopTime ? msToTimeStr(taskForm.pushStopTime) : null,
    };
    const isNew = !editingTask.value;
    if (editingTask.value) {
      const index = scheduledTasks.value.findIndex(t => t.id === editingTask.value.id);
      if (index !== -1) scheduledTasks.value[index] = taskData;
    } else {
      scheduledTasks.value.push(taskData);
    }
    saveScheduledTasks();
    addTaskSaveLog(taskData, isNew, addLog);
    showTaskModal.value = false;
    message.success("推图定时任务已保存");
    return;
  }
  // ===================== 以下为普通任务验证 =====================

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
  
  // 验证珍宝阁商店购买是否选择了商品
  if (taskForm.selectedTasks.includes('collection_exchange')) {
    const hasSelectedItem = taskForm.collectionExchangeItems && Object.values(taskForm.collectionExchangeItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("珍宝阁商店购买需要至少选择一个商品");
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
    // 注意：JSON.parse(JSON.stringify(x)) 在 x 为 undefined 时会抛
    // `SyntaxError: "undefined" is not valid JSON`
    // （因为 JSON.stringify(undefined) 返回 undefined 值而非字符串），
    // 因此每个字段都必须有默认值兜底，不能依赖上游已初始化。
    legionStoreItems: JSON.parse(JSON.stringify(taskForm.legionStoreItems || {})),
    weeklyMarketItems: JSON.parse(JSON.stringify(taskForm.weeklyMarketItems || {})),
    saltCrystalShopItems: JSON.parse(JSON.stringify(taskForm.saltCrystalShopItems || {})),
    saltIngotShopItems: JSON.parse(JSON.stringify(taskForm.saltIngotShopItems || {})),
    apexBuyItems: JSON.parse(JSON.stringify(taskForm.apexBuyItems || {})),
    manualBuyItems: JSON.parse(JSON.stringify(taskForm.manualBuyItems || {})),
    collectionExchangeItems: JSON.parse(JSON.stringify(taskForm.collectionExchangeItems || {})),
    fragmentPackItems: [...(taskForm.fragmentPackItems || [])],
    boxWeeklyRewards: {...taskForm.boxWeeklyRewards},
    smartDeparture: JSON.parse(JSON.stringify(taskForm.smartDeparture || {})),
    nightmarePresetIds: [...(taskForm.nightmarePresetIds || [])],
    nightmarePresetDelay: taskForm.nightmarePresetDelay || 10,
    saltCupBetPick: taskForm.saltCupBetPick || 1,
    apexGuessScheduleId: taskForm.apexGuessScheduleId || 20,
    apexGuessGroupId: taskForm.apexGuessGroupId !== undefined ? taskForm.apexGuessGroupId : 1,
    apexGuessStrategy: taskForm.apexGuessStrategy || 'power',
    saltRoadBattlefieldId: taskForm.saltRoadBattlefieldId || '',
    saltRoadSide: taskForm.saltRoadSide || 1,
    saltRoadVoteCount: taskForm.saltRoadVoteCount || 1,
    saltRoadLegionId: taskForm.saltRoadLegionId || null,
    saltRoadLegionName: taskForm.saltRoadLegionName || '',
    bookUpgradeTypes: [...(taskForm.bookUpgradeTypes || ['hero', 'fish', 'skin'])],
    simplifiedDailyItems: [...(taskForm.simplifiedDailyItems || SIMPLIFIED_TASK_ITEMS.map(item => item.key))],
    arenaFightCount: taskForm.arenaFightCount || 3, // 竞技场战斗次数配置
    maxActive: taskForm.maxActive || 0, // 任务级并发控制：0=使用全局设置
    // 灯神挑战任务级配置
    genieChallenge: {
      genieIds: [...(taskForm.genieChallenge?.genieIds || [1, 2, 3, 4])],
      formation: normalizeGenieFormation(taskForm.genieChallenge?.formation),
      dailyLimit: taskForm.genieChallenge?.dailyLimit || 10,
    },
    // 深海挑战任务级配置（阵容执行时按账号设置"灯神预设阵容"实时读取）
    deepSeaChallenge: {
      weeklyLimit: taskForm.deepSeaChallenge?.weeklyLimit || 10,
    },
    // 营地挑战任务级配置
    campChallenge: taskForm.campChallenge
      ? JSON.parse(JSON.stringify(taskForm.campChallenge))
      : null,
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

// 快捷修改任务并发数（任务卡片外部控件）
const updateTaskMaxActive = (task, val) => {
  const newVal = val || 0;
  const idx = scheduledTasks.value.findIndex(t => t.id === task.id);
  if (idx !== -1) {
    scheduledTasks.value[idx].maxActive = newVal;
    saveScheduledTasks();
    const label = newVal > 0 ? `${newVal} 个并发` : '全局设置';
    message.success(`${task.name} 并发已设为: ${label}`);
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

// ✅ 全选账号：将所有定时任务的选中账号设置为所有可用账号
const selectAllTokensForAllTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  if (!tokens.value || tokens.value.length === 0) { message.warning("暂无可用账号"); return; }
  
  const allTokenIds = tokens.value.map(t => t.id);
  let updatedCount = 0;
  
  scheduledTasks.value.forEach(task => {
    // 将任务的选中账号设置为所有账号
    task.selectedTokens = [...allTokenIds];
    updatedCount++;
  });
  
  saveScheduledTasks();
  message.success(`已为所有 ${updatedCount} 个定时任务选中全部 ${allTokenIds.length} 个账号`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已为所有定时任务选中全部 ${allTokenIds.length} 个账号 ===`,
    type: "success",
  });
};

// ✅ 取消账号：清空所有定时任务的选中账号
const clearAllTokensForAllTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("暂无定时任务"); return; }
  
  let updatedCount = 0;
  
  scheduledTasks.value.forEach(task => {
    // 清空任务的选中账号
    task.selectedTokens = [];
    updatedCount++;
  });
  
  saveScheduledTasks();
  message.success(`已清空所有 ${updatedCount} 个定时任务的选中账号`);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已清空所有定时任务的选中账号 ===`,
    type: "info",
  });
};

// ✅ 单个任务全选账号
const selectAllTokensForTask = (task) => {
  if (!tokens.value || tokens.value.length === 0) { message.warning("暂无可用账号"); return; }
  const allTokenIds = tokens.value.map(t => t.id);
  task.selectedTokens = [...allTokenIds];
  saveScheduledTasks();
  message.success(`已为任务「${task.name}」选中全部 ${allTokenIds.length} 个账号`);
};

// ✅ 单个任务取消账号
const clearAllTokensForTask = (task) => {
  task.selectedTokens = [];
  saveScheduledTasks();
  message.success(`已清空任务「${task.name}」的选中账号`);
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
    let invalidTokenCount = 0;

    if (Array.isArray(importData.scheduledTasks)) {
      if (!scheduledTasks.value || !Array.isArray(scheduledTasks.value)) {
        scheduledTasks.value = [];
      }
      // 构建本地有效token ID集合
      const localTokenIds = new Set(gameTokens.value.map(t => t.id));

      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          // 过滤无效账号：只保留本地存在的token ID
          if (Array.isArray(task.selectedTokens)) {
            const originalCount = task.selectedTokens.length;
            task.selectedTokens = task.selectedTokens.filter(id => localTokenIds.has(id));
            const removed = originalCount - task.selectedTokens.length;
            if (removed > 0) {
              invalidTokenCount += removed;
            }
          }
          scheduledTasks.value.push(task);
          importedTasks++;
        }
      });
      if (importedTasks > 0) saveScheduledTasks();
    }

    const parts = [];
    if (importedTasks > 0) parts.push(`${importedTasks} 个新定时任务`);
    if (invalidTokenCount > 0) parts.push(`已过滤 ${invalidTokenCount} 个无效账号`);
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

// 收集所有token的BIN数据（从IndexedDB，缺失时兜底localStorage备份）
const collectBinData = async (tokenList) => {
  const binDataMap = {};
  const skippedTokens = [];
  for (const token of tokenList) {
    if (token.importMethod === "bin" || token.importMethod === "wxQrcode") {
      try {
        let binData = await getArrayBufferFromDB(token.id);
        if (!binData && token.name) {
          binData = await getArrayBufferFromDB(token.name);
        }
        // IndexedDB 缺失时，尝试 localStorage 备份
        if (!binData) {
          binData = await getBinBackupWithFallback(token.id, token.name);
          if (binData) {
            console.log(`从 localStorage 备份导出BIN数据: ${token.name} (${binData.byteLength} bytes)`);
          }
        }
        if (binData) {
          binDataMap[token.id] = arrayBufferToBase64(binData);
          console.log(`导出BIN数据: ${token.name} (${binData.byteLength} bytes)`);
        } else {
          console.warn(`未找到Token "${token.name}" 的BIN数据`);
          skippedTokens.push(token.name);
        }
      } catch (error) {
        console.error(`导出Token "${token.name}" BIN数据失败:`, error);
      }
    }
  }
  return { binDataMap, skippedTokens };
};

// 导入BIN数据到IndexedDB
// tokenIdMapping: { 源tokenId: 目标实际tokenId }，sourceTokens: 源配置中的token列表
const importBinData = async (binData, tokenIdMapping, sourceTokens) => {
  if (!binData || typeof binData !== 'object' || Object.keys(binData).length === 0) {
    return { importedCount: 0, skippedCount: 0, skippedTokens: [] };
  }
  // 确保IndexedDB已就绪
  try {
    await useIndexedDB().ensureReady();
  } catch (e) {
    console.warn('等待IndexedDB就绪超时:', e.message);
  }

  let importedCount = 0;
  let skippedCount = 0;
  const skippedTokens = [];
  for (const [tokenId, base64Data] of Object.entries(binData)) {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`跳过无效BIN数据: Token ID ${tokenId}`);
        skippedCount++;
        continue;
      }
      // 1. 先用tokenId精确匹配
      let token = gameTokens.value.find(t => t.id === tokenId);
      let actualTokenId = tokenId;
      // 2. 如果没找到，检查tokenIdMapping映射
      if (!token && tokenIdMapping?.[tokenId]) {
        const mappedId = tokenIdMapping[tokenId];
        token = gameTokens.value.find(t => t.id === mappedId);
        if (token) actualTokenId = mappedId;
      }
      // 3. 如果还没找到，通过token内容匹配
      if (!token && sourceTokens) {
        const sourceToken = sourceTokens.find(st => st.id === tokenId);
        if (sourceToken?.token) {
          token = gameTokens.value.find(t => t.token === sourceToken.token);
          if (token) actualTokenId = token.id;
        }
      }
      if (!token) {
        console.warn(`跳过BIN数据导入: 未找到Token ID ${tokenId}`);
        skippedCount++;
        // 尝试从sourceTokens获取名称
        const srcInfo = sourceTokens?.find(st => st.id === tokenId);
        skippedTokens.push(srcInfo?.name || tokenId);
        continue;
      }
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      // 用目标设备实际 token 的 ID 作为键存储
      const success = await storeArrayBufferToDB(actualTokenId, arrayBuffer);
      if (success) {
        importedCount++;
        // 同时备份到 localStorage，防止下次 IndexedDB 被清理后无法导出/刷新
        saveBinBackup(actualTokenId, arrayBuffer);
      
        // 验证写入
        const verify = await getArrayBufferFromDB(actualTokenId);
        if (!verify) {
          console.warn(`BIN数据写入验证失败: ${token.name}`);
          importedCount--;
          skippedCount++;
          skippedTokens.push(token.name);
        } else {
          console.log(`导入BIN数据成功: ${token.name} (${arrayBuffer.byteLength} bytes)`);
        }
      } else {
        console.error(`导入BIN数据失败: ${token.name}`);
        skippedCount++;
        skippedTokens.push(token.name);
      }
    } catch (error) {
      console.error(`处理Token BIN数据失败 [${tokenId}]:`, error);
      skippedCount++;
      skippedTokens.push(tokenId);
    }
  }
  return { importedCount, skippedCount, skippedTokens };
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
const importTokenSettings = (tokenSettings, tokenIdMapping = {}) => {
  if (!Array.isArray(tokenSettings)) return 0;
  let count = 0;
  tokenSettings.forEach((item) => {
    if (item.tokenId && item.settings) {
      // 使用 tokenIdMapping 映射到新设备的 token ID
      const newTokenId = tokenIdMapping[item.tokenId] || item.tokenId;
      localStorage.setItem(
        `daily-settings:${newTokenId}`,
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
  targetBoxRounds: batchSettings.targetBoxRounds,
  receiverId: batchSettings.receiverId || "",
  carMinColor: batchSettings.carMinColor,
  tokenListColumns: batchSettings.tokenListColumns,
  autoColumns: batchSettings.autoColumns,
  useGoldRefreshFallback: batchSettings.useGoldRefreshFallback,
  commandDelay: batchSettings.commandDelay,
  taskDelay: batchSettings.taskDelay,
  dailySubtaskDelay: batchSettings.dailySubtaskDelay,
  rewardClaimDelay: batchSettings.rewardClaimDelay,
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
  customPriority: batchSettings.customPriority,
  tokensPerPage: batchSettings.tokensPerPage,
  logPageSize: batchSettings.logPageSize,
  defaultCommandTimeout: batchSettings.defaultCommandTimeout,
  battleCommandTimeout: batchSettings.battleCommandTimeout,
  defaultRetryCount: batchSettings.defaultRetryCount,
  retryDelay: batchSettings.retryDelay,
  accountRetryInterval: batchSettings.accountRetryInterval,
  petMergeMaxLevelEnabled: batchSettings.petMergeMaxLevelEnabled,
  petMergeMaxLevel: batchSettings.petMergeMaxLevel,
  dreamPurchaseList: batchSettings.dreamPurchaseList,
  singleAccountSpeedUp: batchSettings.singleAccountSpeedUp,
  singleAccountMultiplier: batchSettings.singleAccountMultiplier,
  delayGroups: { ...batchSettings.delayGroups },
  moduleDelays: { ...batchSettings.moduleDelays },
  manualBuyItems: batchSettings.manualBuyItems || [],
  collectionExchangeItems: batchSettings.collectionExchangeItems || [],
  batchTaskTimeout: batchSettings.batchTaskTimeout,
  cdkCode: batchSettings.cdkCode || '',
  skinChallengeMaxFail: batchSettings.skinChallengeMaxFail,
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
    const { binDataMap, skippedTokens: exportSkipped } = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    const totalBinTokens = tokens.value.filter(t => t.importMethod === "bin" || t.importMethod === "wxQrcode").length;
    if (totalBinTokens > 0 && binCount < totalBinTokens) {
      console.warn(`BIN数据不完整: ${binCount}/${totalBinTokens} 个token有BIN数据`);
    }
    if (exportSkipped.length > 0) {
      message.warning(`以下账号缺少BIN数据，刷新Token可能失败：${exportSkipped.join('、')}`, { duration: 8000 });
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
    const tokenIdMapping = {};

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
          // 建立映射：找到目标设备上的实际token ID
          const actualToken = gameTokens.value.find(t => t.token === token.token || t.id === token.id);
          if (actualToken) {
            tokenIdMapping[token.id] = actualToken.id;
          }
          // 如果已存在但有更新的BIN数据importMethod，保留原始importMethod
          return;
        }
        const newId = token.id || "token_" + Date.now() + Math.random().toString(36).slice(2);
        gameTokens.value.push({
          id: newId,
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
        tokenIdMapping[token.id] = newId;
        importedTokens++;
      });
    }

    // 导入BIN数据到IndexedDB
    let importedBinCount = 0;
    if (importData.binData && Object.keys(importData.binData).length > 0) {
      const binResult = await importBinData(importData.binData, tokenIdMapping, importData.tokens);
      importedBinCount = binResult.importedCount;
      if (importedBinCount > 0) {
        console.log(`成功导入 ${importedBinCount} 个BIN数据`);
      }
      if (binResult.skippedTokens && binResult.skippedTokens.length > 0) {
        message.warning(`以下账号BIN数据导入失败：${binResult.skippedTokens.join('、')}`, { duration: 8000 });
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
    const settingsCount = importTokenSettings(importData.tokenSettings, tokenIdMapping);

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
    })).filter((task) => task.taskType === 'push_map' || task.selectedTokens.length > 0);

    const { binDataMap, skippedTokens: exportSkipped } = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    if (exportSkipped.length > 0) {
      message.warning(`以下账号缺少BIN数据，刷新Token可能失败：${exportSkipped.join('、')}`, { duration: 8000 });
    }

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

    // 游戏登录页分组数据
    let loginGroupsData = null;
    try {
      const saved = localStorage.getItem('loginGroups');
      if (saved) loginGroupsData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 阵容助手保存数据（按 token.id 收集）
    const lineupDataMap = {};
    tokens.value.forEach((token) => {
      try {
        const saved = localStorage.getItem(`saved_lineups_${token.id}`);
        if (saved) {
          const lineups = JSON.parse(saved);
          if (Array.isArray(lineups) && lineups.length > 0) {
            lineupDataMap[token.id] = lineups;
          }
        }
      } catch (e) { /* ignore */ }
    });

    const exportData = {
      version: "2.5",
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
      lineups: lineupDataMap,
      loginGroups: loginGroupsData || [],
    };

    const filename = `xyzw_full_config_${new Date().toISOString().slice(0, 10)}.json`;
    const success = await encryptAndDownload(exportData, filename);

    if (success === false) return;
    if (success) {
      const binMsg = binCount > 0 ? ` (含${binCount}个BIN数据)` : '';
      const groupMsg = filteredGroups.length > 0 ? `, ${filteredGroups.length} 个分组` : '';
      const templateMsg = (taskTemplates.value || []).length > 0 ? `, ${(taskTemplates.value || []).length} 个任务模板` : '';
      const nmMsg = (nightmarePresetsData || []).length > 0 ? `, ${(nightmarePresetsData || []).length} 个十殿预设` : '';
      const lineupCount = Object.values(lineupDataMap).reduce((sum, arr) => sum + arr.length, 0);
      const lineupMsg = lineupCount > 0 ? `, ${lineupCount} 个阵容` : '';
      message.success(
        `全量导出成功: ${tokens.value.length} 个账号, ${filteredScheduledTasks.length} 个定时任务${groupMsg}${templateMsg}${nmMsg}${lineupMsg}${binMsg}`,
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

    const stats = { tokens: 0, tasks: 0, bin: 0, settings: 0, groups: 0, templates: 0, nightmare: 0, lineups: 0, loginGroups: 0 };
    const tokenIdMapping = {};

    // 导入tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      importData.tokens.forEach((token) => {
        if (!token.token) return;
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) {
          // 建立映射：找到目标设备上的实际token ID
          const actualToken = gameTokens.value.find(t => t.token === token.token || t.id === token.id);
          if (actualToken) {
            tokenIdMapping[token.id] = actualToken.id;
          }
          return;
        }
        const newId = token.id || "token_" + Date.now() + Math.random().toString(36).slice(2);
        gameTokens.value.push({
          id: newId,
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
        tokenIdMapping[token.id] = newId;
        stats.tokens++;
      });
    }

    // 导入BIN数据
    if (importData.binData) {
      const binResult = await importBinData(importData.binData, tokenIdMapping, importData.tokens);
      stats.bin = binResult.importedCount;
      if (binResult.skippedTokens && binResult.skippedTokens.length > 0) {
        message.warning(`以下账号BIN数据导入失败：${binResult.skippedTokens.join('、')}`, { duration: 8000 });
      }
    }

    // 导入定时任务
    if (Array.isArray(importData.scheduledTasks)) {
      // 构建本地有效token ID集合
      const localTokenIds = new Set(gameTokens.value.map(t => t.id));

      importData.scheduledTasks.forEach((task) => {
        if (!task.id) return;
        const exists = scheduledTasks.value.some(t => t.id === task.id);
        if (!exists) {
          // 用tokenIdMapping修复跨设备token ID，并过滤本地不存在的账号
          if (Array.isArray(task.selectedTokens)) {
            task.selectedTokens = task.selectedTokens
              .map(id => tokenIdMapping[id] || id)  // 优先使用映射后的ID
              .filter(id => localTokenIds.has(id));  // 只保留本地存在的
          }
          scheduledTasks.value.push(task);
          stats.tasks++;
        }
      });
      if (stats.tasks > 0) saveScheduledTasks();
    }

    // 导入批量设置
    if (importData.batchSettings && typeof importData.batchSettings === 'object') {
      const importedBatch = { ...importData.batchSettings };
      // 深度合并 moduleDelays / delayGroups，保留新增模块的默认值
      if (importedBatch.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, importedBatch.moduleDelays);
        delete importedBatch.moduleDelays;
      }
      if (importedBatch.delayGroups && batchSettings.delayGroups) {
        Object.assign(batchSettings.delayGroups, importedBatch.delayGroups);
        delete importedBatch.delayGroups;
      }
      Object.assign(batchSettings, importedBatch);
      // 运行时标志不导入
      batchSettings.singleAccountMode = false;
      try { localStorage.setItem("batchSettings", JSON.stringify(batchSettings)); } catch (e) { /* ignore */ }
    }

    // 导入token设置（含 helperPresets 等全部账号任务设置）
    if (importData.tokenSettings) {
      stats.settings = importTokenSettings(importData.tokenSettings, tokenIdMapping);
    }

    // 导入排序配置
    if (importData.sortConfig) {
      try { localStorage.setItem("tokenSortConfig", JSON.stringify(importData.sortConfig)); } catch (e) { /* ignore */ }
    }

    // 导入管理分组
    if (Array.isArray(importData.tokenGroups) && importData.tokenGroups.length > 0) {
      const existingGroupIds = new Set(tokenGroups.value.map((g) => g.id));
      // 构建本地有效token ID集合（用于过滤分组中的无效账号）
      const localTokenIdsForGroups = new Set(gameTokens.value.map(t => t.id));

      importData.tokenGroups.forEach((group) => {
        if (!group.id || !group.name) return;
        // 过滤分组中的无效tokenIds：先映射跨设备ID，再只保留本地存在的
        const validTokenIds = (group.tokenIds || [])
          .map(id => tokenIdMapping[id] || id)
          .filter(id => localTokenIdsForGroups.has(id));

        if (existingGroupIds.has(group.id)) {
          // 已存在的分组：合并tokenIds（去重）
          const existing = tokenGroups.value.find((g) => g.id === group.id);
          if (existing) {
            const mergedIds = new Set([...(existing.tokenIds || []), ...validTokenIds]);
            existing.tokenIds = [...mergedIds];
            existing.updatedAt = new Date().toISOString();
            stats.groups++;
          }
        } else {
          // 新分组：使用过滤后的tokenIds
          tokenGroups.value.push({
            id: group.id,
            name: group.name,
            color: group.color || '#18a058',
            tokenIds: validTokenIds,
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

    // 导入阵容数据
    if (importData.lineups && typeof importData.lineups === 'object') {
      for (const [oldTokenId, lineups] of Object.entries(importData.lineups)) {
        if (!Array.isArray(lineups) || lineups.length === 0) continue;
        const newTokenId = tokenIdMapping[oldTokenId] || oldTokenId;
        try {
          localStorage.setItem(`saved_lineups_${newTokenId}`, JSON.stringify(lineups));
          stats.lineups += lineups.length;
        } catch (e) { /* ignore */ }
      }
    }

    // 导入游戏登录页分组
    if (Array.isArray(importData.loginGroups) && importData.loginGroups.length > 0) {
      try {
        const existingLoginGroups = JSON.parse(localStorage.getItem('loginGroups') || '[]');
        const existingLgIds = new Set(existingLoginGroups.map((g) => g.id));
        const localTokenIdsForLg = new Set(gameTokens.value.map((t) => t.id));
        importData.loginGroups.forEach((group) => {
          if (!group.id || !group.name) return;
          // 映射跨设备ID并过滤本地不存在的账号
          const validTokenIds = (group.tokenIds || [])
            .map((id) => tokenIdMapping[id] || id)
            .filter((id) => localTokenIdsForLg.has(id));
          if (existingLgIds.has(group.id)) {
            // 已存在的分组：合并tokenIds（去重）
            const existing = existingLoginGroups.find((g) => g.id === group.id);
            if (existing) {
              existing.tokenIds = [...new Set([...(existing.tokenIds || []), ...validTokenIds])];
              stats.loginGroups++;
            }
          } else {
            existingLoginGroups.push({
              id: group.id,
              name: group.name,
              color: group.color || '#1677ff',
              tokenIds: validTokenIds,
            });
            stats.loginGroups++;
          }
        });
        if (stats.loginGroups > 0) {
          localStorage.setItem('loginGroups', JSON.stringify(existingLoginGroups));
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
    if (stats.lineups > 0) parts.push(`${stats.lineups} 个阵容`);
    if (stats.loginGroups > 0) parts.push(`${stats.loginGroups} 个登录分组`);
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
let _componentUnmounted = false; // 组件卸载标志，防止 interval 回调在销毁后继续访问响应式数据

// Update countdowns for all tasks
const updateCountdowns = () => {
  if (_componentUnmounted) return; // 组件已卸载，直接退出
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

// 定时任务执行完成情况记录
const taskExecutionRecords = ref([]);
const showTaskRecordsModal = ref(false);

// 展示用记录：去重（startTime+name）后按开始时间倒序（最新在前），避免合并历史记录后顺序错乱和重复项
const sortedTaskRecords = computed(() => {
  const seen = new Set();
  const unique = [];
  for (const r of taskExecutionRecords.value) {
    const id = `${r.startTime}-${r.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(r);
  }
  return unique.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
});

// 打开任务完成情况Modal（重新加载数据）
const openTaskRecordsModal = () => {
  // ✅ 从 localStorage 加载历史记录
  const loadedRecords = loadTaskExecutionRecordsFromStorage();
  
  // ✅ 获取内存中所有记录的 startTime（用于去重）
  const memoryRecordIds = new Set(
    taskExecutionRecords.value.map(r => `${r.startTime}-${r.name}`)
  );
  
  // ✅ 过滤掉 localStorage 中已在内存中的记录（避免重复）
  const newRecordsFromStorage = loadedRecords.filter(r => {
    const recordId = `${r.startTime}-${r.name}`;
    return !memoryRecordIds.has(recordId);
  });
  
  // ✅ 合并：内存中的记录（最新） + localStorage 中的新记录
  if (newRecordsFromStorage.length > 0) {
    taskExecutionRecords.value = [...taskExecutionRecords.value, ...newRecordsFromStorage];
    console.log(`[定时任务] 打开任务完成情况，内存 ${taskExecutionRecords.value.length - newRecordsFromStorage.length} 条 + localStorage ${newRecordsFromStorage.length} 条 = 共 ${taskExecutionRecords.value.length} 条记录`);
  } else {
    console.log(`[定时任务] 打开任务完成情况，共 ${taskExecutionRecords.value.length} 条记录（全部来自内存）`);
  }
  
  showTaskRecordsModal.value = true;
  syncQueueDisplay(); // 打开时同步队列展示
};

// 同步到全局，供推图循环 (pushMapRunner) 检测定时任务互斥
watch(isScheduledTaskRunning, (v) => { window._isScheduledTaskRunning = v; }, { immediate: true });
let currentScheduledTask = null; // 当前正在执行的定时任务
const pendingTaskQueue = []; // ✅ 待执行队列：当定时任务冲突时，排队等待执行
const queueDisplayList = ref([]); // 响应式队列展示列表（同步自 pendingTaskQueue）
const currentScheduledTaskDisplay = ref(null); // 响应式当前执行任务展示
const syncQueueDisplay = () => {
  queueDisplayList.value = pendingTaskQueue.map((t, i) => ({
    index: i + 1,
    name: t.name,
    runTime: t.runType === 'daily' ? t.runTime : (t.cronExpression || ''),
    runType: t.runType,
    id: t.id,
  }));
  currentScheduledTaskDisplay.value = currentScheduledTask ? {
    name: currentScheduledTask.name,
    runTime: currentScheduledTask.runType === 'daily' ? currentScheduledTask.runTime : (currentScheduledTask.cronExpression || ''),
    runType: currentScheduledTask.runType,
  } : null;
};
let _activeNightmareBattles = []; // ✅ 模块级引用：跟踪当前十殿战斗，用于超时传导停止

// =====================
// 统一队列消费函数（互斥锁保护，防止多路径竞态启动并发任务）
// =====================
let _isProcessingQueue = false; // 队列消费互斥锁
let _scheduledTaskGeneration = 0; // 任务代计数器：防止 stale 后旧任务 finally 覆盖新任务状态

/**
 * 统一队列消费函数 — 所有路径必须调用此函数
 * 确保同一时刻只有一个任务从队列中启动
 */
const processPendingQueue = (source = '') => {
  // 互斥：已有消费者在执行，直接返回
  if (_isProcessingQueue) return;
  // 已有定时任务在运行，不消费
  if (isScheduledTaskRunning.value) return;
  // 队列为空
  if (pendingTaskQueue.length === 0) return;

  _isProcessingQueue = true;
  try {
    // 跳过过期任务（容差 180 分钟：前序任务可能执行 1–2 小时，队列任务不应因等待时间过长而被丢弃）
    // 已在队列中的任务说明用户需要它执行，时间检查仅作为极端场景的安全兜底
    while (pendingTaskQueue.length > 0) {
      const peek = pendingTaskQueue[0];
      const timeCheck = isTaskTimeStillValid(peek, 180);
      if (!timeCheck.valid) {
        pendingTaskQueue.shift();
        syncQueueDisplay(); // 过期任务移除后同步展示
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏰ [${source}] 跳过过期队列任务: ${peek.name}（${timeCheck.reason}，剩余: ${pendingTaskQueue.length}）`,
          type: 'warning',
        });
        continue;
      }
      break; // 找到有效任务
    }
    if (pendingTaskQueue.length === 0) { syncQueueDisplay(); return; }

    const nextTask = pendingTaskQueue.shift();
    syncQueueDisplay(); // 任务出队后同步展示

    // 孤儿记录清理
    const orphanRecs = taskExecutionRecords.value.filter(
      r => r.status === 'running' && r.name === nextTask.name
    );
    if (orphanRecs.length > 0) {
      orphanRecs.forEach(r => {
        r.status = 'timeout';
        r.elapsedStr = '超时（队列启动前孤儿清理）';
        r.endTime = Date.now();
      });
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `▶️ [${source}] 从队列执行定时任务: ${nextTask.name}（剩余队列: ${pendingTaskQueue.length}）`,
      type: 'info',
    });

    // 立即锁定（同步设置，防止竞态）
    _scheduledTaskGeneration++; // 递增代数，使旧任务的 finally 知道自己已被替代
    isScheduledTaskRunning.value = true;
    currentScheduledTask = nextTask;
    scheduledTaskStartTime = Date.now();
    lastTaskExecution = Date.now();
    try { localStorage.setItem(`lastTaskExecution_${nextTask.id}`, Date.now().toString()); } catch (e) { /* ignore */ }

    // 异步执行任务（executeScheduledTask 的 finally 会调用 processPendingQueue 消费下一个）
    executeScheduledTask(nextTask).catch(error => {
      console.error(`[${source}] 队列任务执行错误:`, error);
    });
  } finally {
    _isProcessingQueue = false;
  }
};

// =====================
// 任务完成情况持久化与自动清空机制
// =====================

// 从 localStorage 加载任务完成情况（支持查看历史所有记录）
const loadTaskExecutionRecordsFromStorage = () => {
  try {
    const savedData = localStorage.getItem('taskExecutionRecords');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // ✅ 不再限制日期，加载所有历史记录
      if (Array.isArray(parsed.records)) {
        console.log(`[定时任务] 加载任务执行情况，共 ${parsed.records.length} 条记录`);
        return parsed.records;
      }
    }
    return [];
  } catch (error) {
    console.error('[定时任务] 加载任务执行情况失败:', error);
    return [];
  }
};

// 保存任务完成情况到 localStorage（保存所有已完成记录，去重）
const saveTaskExecutionRecordsToStorage = () => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // ✅ 先加载现有记录（如果有）
    let existingRecords = [];
    const savedData = localStorage.getItem('taskExecutionRecords');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed.records)) {
        existingRecords = parsed.records;
        console.log(`[定时任务] 加载现有记录 ${existingRecords.length} 条`);
      }
    }
    
    // ✅ 收集所有已完成的记录（running 状态的任务不保存）
    const completedRecords = taskExecutionRecords.value.filter(record => {
      return record.status !== 'running'; // 只跳过正在执行的任务
    });
    
    if (completedRecords.length > 0) {
      console.log(`[定时任务] 检测到 ${completedRecords.length} 条已完成记录，准备保存`);
      
      // ✅ 去重：使用 startTime + name 作为唯一标识，只添加 localStorage 中不存在的记录
      const existingRecordIds = new Set(
        existingRecords.map(r => `${r.startTime}-${r.name}`)
      );
      
      const newRecords = completedRecords.filter(record => {
        const recordId = `${record.startTime}-${record.name}`;
        return !existingRecordIds.has(recordId);
      });
      
      if (newRecords.length > 0) {
        // ✅ 合并新旧记录（只添加新记录）
        const allRecords = [...existingRecords, ...newRecords];
        
        const dataToSave = {
          date: todayStr,
          records: allRecords,
          updatedAt: now.toISOString(),
          totalRecords: allRecords.length
        };
        
        localStorage.setItem('taskExecutionRecords', JSON.stringify(dataToSave));
        console.log(`[定时任务] 已保存 ${newRecords.length} 条新记录，累计 ${allRecords.length} 条`);
      } else {
        console.log(`[定时任务] 无新记录需要保存（所有记录已存在于 localStorage）`);
      }
    } else {
      console.log(`[定时任务] 无已完成记录，跳过保存`);
    }
  } catch (error) {
    console.error('[定时任务] 保存任务执行情况到 localStorage 失败:', error);
  }
};

// 清空任务执行情况（内存 + localStorage + 折叠状态）
const clearTaskExecutionRecords = () => {
  // ✅ 执行中禁止清空：记录通过数组下标引用更新，清空会导致后续更新写入错误记录（时间/进度错乱）
  const hasRunning = taskExecutionRecords.value.some(r => r.status === 'running');
  if (hasRunning || isScheduledTaskRunning.value) {
    message.warning('有任务正在执行，请等待执行完成后再清空记录');
    return;
  }

  taskExecutionRecords.value = [];
  
  // 清除 localStorage
  localStorage.removeItem('taskExecutionRecords');
  
  message.success('任务完成记录已清空');
  console.log('[定时任务] 任务完成记录已清空');
};

// ---------- 营地挑战设置 ----------
const openCampChallengeModal = () => {
  campChallengeForm.value = { ...loadCampChallengeSettings() };
  showCampChallengeModal.value = true;
};
const saveAndRunCampChallenge = () => {
  const saved = saveCampChallengeSettings(campChallengeForm.value);
  campChallengeForm.value = { ...saved };
  showCampChallengeModal.value = false;
  executeManualTaskWithRecord('batchCampChallenge', '营地挑战', batchCampChallenge);
};

/**
 * 为手动执行的批量功能添加任务完成记录
 * @param {string} taskName - 任务名称（如 'claimHangUpRewards'）
 * @param {string} taskLabel - 任务显示名称（如 '领取挂机'）
 * @param {Function} taskFunction - 实际执行的任务函数
 * @returns {Promise<void>}
 */
const executeManualTaskWithRecord = async (taskName, taskLabel, taskFunction) => {
  // ✅ 十殿阎罗挑战预设自带账号（队长 + 队员），无需额外选择账号
  const isNightmareChallenge = taskName === 'batchNightmareChallenge';
  
  // 十殿阎罗挑战：如果没有选择账号，直接打开弹窗（不创建任务记录）
  if (isNightmareChallenge && selectedTokens.value.length === 0) {
    await taskFunction();
    return;
  }
  
  if (!isNightmareChallenge && selectedTokens.value.length === 0) {
    message.warning('请先选择账号');
    return;
  }
  
  const taskStartTime = Date.now();
  const availableTokens = [...selectedTokens.value];
  const totalAccounts = availableTokens.length;
  
  // ✅ 单账号智能加速：仅 1 个账号时自动降低延迟
  if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
    batchSettings.singleAccountMode = true;
    const mult = batchSettings.singleAccountMultiplier;
    const token = tokens.value.find(t => t.id === availableTokens[0]);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
      type: 'info',
    });
  } else {
    // ✅ 显示并发数量日志，与定时任务保持一致
    const maxConcurrent = batchSettings.maxActive > 0 ? batchSettings.maxActive : '全局设置';
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 开始执行 ${taskLabel},共 ${totalAccounts} 个账号，并发数:${maxConcurrent}`,
      type: 'info',
    });
  }
  
  // 清理本次执行相关的失败原因缓存 + 重置 tokenStatus，避免上一个任务的残留状态污染本次记录
  availableTokens.forEach(tokenId => {
    delete tokenFailReasons.value[tokenId];
    tokenStatus.value[tokenId] = 'waiting';
  });
  
  // 添加任务记录
  const taskRecordIndex = taskExecutionRecords.value.push({
    name: taskLabel,
    startTime: taskStartTime,
    endTime: null,
    elapsedStr: null,
    status: 'running',
    totalAccounts: availableTokens.length,
    successCount: 0,
    failCount: 0,
    runningCount: availableTokens.length,
    progressPercent: 0,
    failedAccounts: [],
    scheduledTime: null,
    isManual: true, // 标记为手动执行
  }) - 1;
  
  // 监听 tokenStatus 变化，实时更新成功/失败计数
  const updateProgressFromTokenStatus = () => {
    let successCount = 0;
    let failCount = 0;
    let runningCount = 0;
    const failedAccounts = [];
    
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') {
        successCount++;
      } else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
        runningCount++;
      }
    });
    
    // 更新任务记录
    if (taskExecutionRecords.value[taskRecordIndex]) {
      taskExecutionRecords.value[taskRecordIndex].successCount = successCount;
      taskExecutionRecords.value[taskRecordIndex].failCount = failCount;
      taskExecutionRecords.value[taskRecordIndex].runningCount = runningCount;
      taskExecutionRecords.value[taskRecordIndex].failedAccounts = failedAccounts;
      
      // 更新进度百分比
      const completed = successCount + failCount;
      const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
      taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
  };
  
  // 设置定时器，每500ms更新一次进度
  const progressTimer = setInterval(updateProgressFromTokenStatus, 500);
  
  try {
    // 执行任务函数
    await taskFunction();
    
    // 最后一次更新进度
    updateProgressFromTokenStatus();
    
    // 任务成功完成
    const taskElapsed = Date.now() - taskStartTime;
    const taskElapsedStr = taskElapsed >= 60000
      ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
      : `${(taskElapsed / 1000).toFixed(1)}秒`;
    
    taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
    taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
    taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
    
    // ✅ 根据实际完成情况设置状态（而不是直接设置为 success）
    const record = taskExecutionRecords.value[taskRecordIndex];
    if (record.failCount === 0) {
      record.status = 'success'; // 全部成功
    } else if (record.successCount > 0 && record.failCount > 0) {
      record.status = 'partial'; // 部分完成
    } else {
      record.status = 'fail'; // 全部失败
    }
    
    // 保存任务完成情况到本地存储
    saveTaskExecutionRecordsToStorage();
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `✅ ${taskLabel} 手动执行完成，用时：${taskElapsedStr}，成功：${taskExecutionRecords.value[taskRecordIndex].successCount}，失败：${taskExecutionRecords.value[taskRecordIndex].failCount}`,
      type: "success",
    });
  } catch (error) {
    // ✅ 修复：任务异常时，检查所有账号的 status，将仍未完成的账号标记为 failed
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status !== 'completed' && status !== 'failed') {
        tokenStatus.value[tokenId] = "failed";
        tokenFailReasons.value[tokenId] = `任务异常: ${error.message?.substring(0, 50) || '未知错误'}`;
      }
    });
    
    // 最后一次更新进度
    updateProgressFromTokenStatus();
    
    // 任务执行失败
    const taskElapsed = Date.now() - taskStartTime;
    const taskElapsedStr = taskElapsed >= 60000
      ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
      : `${(taskElapsed / 1000).toFixed(1)}秒`;
    
    taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
    taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
    taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    
    // ✅ 根据实际完成情况设置状态（即使抛异常，也可能有部分账号成功）
    const record = taskExecutionRecords.value[taskRecordIndex];
    if (record.failCount === 0 && record.successCount === 0) {
      record.status = 'fail'; // 全部失败（无成功）
    } else if (record.successCount > 0 && record.failCount > 0) {
      record.status = 'partial'; // 部分完成
    } else if (record.successCount > 0) {
      record.status = 'success'; // 全部成功（虽然有异常但都成功了）
    } else {
      record.status = 'fail'; // 全部失败
    }
    
    // 保存任务完成情况到本地存储
    saveTaskExecutionRecordsToStorage();
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ ${taskLabel} 手动执行失败：${error.message}，成功：${taskExecutionRecords.value[taskRecordIndex].successCount}，失败：${taskExecutionRecords.value[taskRecordIndex].failCount}`,
      type: "error",
    });
  } finally {
    // 清除定时器
    clearInterval(progressTimer);
    // 重置单账号加速标志
    batchSettings.singleAccountMode = false;
    
    // ✅ 修复 Bug #1: 手动任务结束后，通过统一入口消费 pendingTaskQueue
    setTimeout(() => processPendingQueue('manual'), 1000);
  }
};

// 注册每天凌晨 00:00:00 自动清空的任务完成情况
const scheduleMidnightClear = () => {
  const clearAtMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // 计算距离明天凌晨的毫秒数
    const delay = tomorrow.getTime() - now.getTime();
    
    console.log(`[定时任务] 已调度任务完成情况自动清空，将在 ${Math.floor(delay / 1000 / 60 / 60)} 小时后执行`);
    
    setTimeout(() => {
      // 在午夜执行清空
      clearTaskExecutionRecords();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: '🌙 每日任务完成记录已自动清空（00:00:00）',
        type: 'info'
      });
      
      // 重新调度下一次自动清空
      scheduleMidnightClear();
    }, delay);
  };
  
  clearAtMidnight();
};

// 页面加载时恢复数据并调度自动清空
onMounted(() => {
  // 从 localStorage 加载当天的任务完成情况
  const loadedRecords = loadTaskExecutionRecordsFromStorage();
  if (loadedRecords.length > 0) {
    taskExecutionRecords.value = loadedRecords;
    console.log(`[定时任务] 页面加载时恢复了 ${loadedRecords.length} 条历史任务执行记录`);
  }
  
  // 调度每天凌晨自动清空
  scheduleMidnightClear();
});

// =====================
// 任务记录辅助函数
// =====================

// 格式化时间戳为可读时间
const formatTime = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

// 获取延迟文本
const getDelayText = (record) => {
  if (!record.scheduledTime || !record.startTime) return '--';
  const delay = record.startTime - record.scheduledTime;
  if (delay < 0) return '提前';
  const seconds = Math.floor(delay / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds}秒`;
};

// 获取延迟样式类
const getDelayClass = (record) => {
  if (!record.scheduledTime || !record.startTime) return '';
  const delay = record.startTime - record.scheduledTime;
  if (delay < 0) return 'tr-delay-early';
  if (delay < 30000) return 'tr-delay-normal'; // 30 秒内正常
  if (delay < 60000) return 'tr-delay-warning'; // 1 分钟内警告
  return 'tr-delay-error'; // 超过 1 分钟错误
};

// Health check for the scheduler
// ✅ 刷新安全检查：判断当前是否可以安全刷新页面（不会中断/丢失定时任务）
// 刷新页面会导致任务中断，必须等待定时任务执行完之后再刷新
const isSafeToRefreshPage = () => {
  // 1. 有任务正在执行或排队等待
  if (isRunning.value || isScheduledTaskRunning.value || pendingTaskQueue.length > 0) {
    const reason = isRunning.value ? '批量任务执行中' : isScheduledTaskRunning.value ? `定时任务[${currentScheduledTask?.name || '未知'}]执行中` : `队列中有${pendingTaskQueue.length}个待执行任务`;
    return { safe: false, reason };
  }
  // 2. 底层仍有账号任务在跑（防止 stale 检测误释放 isScheduledTaskRunning 后刷新中断真实任务）
  const runningSet = tokenStore.runningTokens?.value;
  if (runningSet && typeof runningSet.size === 'number' && runningSet.size > 0) {
    return { safe: false, reason: `仍有${runningSet.size}个账号任务活跃` };
  }
  // 2.5 批量推图正在执行（推图走 window._pt 独立状态，不经过 isRunning/runningTokens，必须单独检查；
  // 否则定时刷新会误判为安全而 reload 页面，推图连接全部丢失且无法恢复）
  try {
    const pt = window._pt;
    if (pt) {
      const pushing = Object.keys(pt).filter((id) => pt[id] && pt[id].running);
      if (pushing.length > 0) {
        return { safe: false, reason: `批量推图执行中（${pushing.length}个账号）` };
      }
    }
  } catch (e) { /* 读取推图状态失败不阻塞刷新判断 */ }
  // 3. 未来2分钟内有定时任务即将触发（daily 为精确分钟匹配，刷新跨过触发分钟会导致任务被静默丢失）
  const now = new Date();
  for (const task of scheduledTasks.value) {
    if (!task.enabled) continue;
    for (let i = 0; i <= 2; i++) {
      const t = new Date(now.getTime() + i * 60000);
      let willRun = false;
      if (task.runType === 'daily') {
        const tStr = t.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
        willRun = tStr === task.runTime;
      } else if (task.runType === 'cron') {
        try { willRun = matchesCronExpression(task.cronExpression, t); } catch (e) { /* 解析失败不阻塞刷新 */ }
      }
      if (willRun) {
        return { safe: false, reason: `定时任务[${task.name}]将在${i}分钟内触发` };
      }
    }
  }
  return { safe: true, reason: '' };
};

const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // ✅ 修改：不再强制重置isRunning，只记录警告日志
  // 原因：日常任务多账号执行可能较长，但2小时无活动则认为卡死
  if (isRunning.value) {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000; // 2 hours ago
    if (lastTaskExecution && lastTaskExecution < twoHoursAgo) {
      console.warn(
        `[${new Date().toISOString()}] isRunning has been true for more than 2 hours without activity`,
      );
      // ✅ 修复：超时后强制重置 isRunning，防止调度器永远被阻塞
      // 之前只记录警告不重置，导致后续所有定时任务都无法执行
      if (!isScheduledTaskRunning.value) {
        // 仅在非定时任务执行时重置（定时任务有自己的状态管理）
        console.error(
          `[${new Date().toISOString()}] isRunning卡住超过2小时且无定时任务运行，强制重置`,
        );
        isRunning.value = false;
        currentRunningTokenId.value = null;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到 isRunning 卡住超过2小时，已强制重置（非定时任务状态） ===",
          type: "warning",
        });
      } else {
        // ✅ 定时任务超 2 小时仍运行 → 直接终止并清理 (Bug #2)
        console.error(`[${new Date().toISOString()}] 定时任务卡住超过 2 小时，强制结束`);
        shouldStop.value = true;
        isScheduledTaskRunning.value = false;
        currentScheduledTask = null;
        scheduledTaskStartTime = null;
        try { window._pausePushRequested = false; } catch (e) { /* 兜底：释放推图暂停标记 */ }
        isRunning.value = false;
        currentRunningTokenId.value = null;
        tokenStore.runningTokens?.value.forEach(tokenId => {
          tokenStore.closeWebSocketConnection(tokenId);
          tokenStore.setTokenRunning(tokenId, false);
        });
        updateLastTaskExecution();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 检测到定时任务执行已超过 2 小时，已强制结束 ===",
          type: "warning",
        });
        // ✅ 强制结束后消费队列，避免排队任务等待下一个调度器 tick
        setTimeout(() => processPendingQueue('healthCheck'), 500);
      }
    }
  }
  
  // 兜底检查：isRunning=false 但 isScheduledTaskRunning 仍为 true（异常情况，如子任务 finally 已重置 isRunning 但外层未清理）
  if (!isRunning.value && isScheduledTaskRunning.value && scheduledTaskStartTime) {
    const elapsed = Date.now() - scheduledTaskStartTime;
    // ✅ Bug #2: 阈值从 15 分钟进一步降低到 5 分钟
    if (elapsed > 5 * 60 * 1000) {
      const taskName = currentScheduledTask?.name || '未知任务';
      console.error(
        `[${new Date().toISOString()}] isRunning=false 但定时任务 [${taskName}] 已持续${Math.round(elapsed/60000)}分钟，重置状态`,
      );
      // ✅ 通知旧任务停止（防止 stale 清理后旧实例仍在后台跑）
      shouldStop.value = true;
      // ✅ 标记孤儿 running 记录为 timeout（用于下次启动前的去重检测）
      let orphanCount = 0;
      taskExecutionRecords.value.forEach(r => {
        if (r.status === 'running' && r.name === taskName) {
          r.status = 'timeout';
          r.elapsedStr = `超时 (${Math.round(elapsed/60000)}分钟强制清理)`;
          r.endTime = Date.now();
          orphanCount++;
        }
      });
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null;
      try { window._pausePushRequested = false; } catch (e) { /* 兜底：释放推图暂停标记 */ }
      tokenStore.runningTokens?.value.forEach(tokenId => {
        tokenStore.setTokenRunning(tokenId, false);
      });
      updateLastTaskExecution();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 检测到 isRunning=false 但定时任务 [${taskName}] 状态未清理（持续${Math.round(elapsed/60000)}分钟），已兜底重置${orphanCount ? `，标记${orphanCount}条孤儿记录为 timeout` : ''} ===`,
        type: "warning",
      });
      // ✅ 兆底重置后消费队列，避免排队任务等待下一个调度器 tick
      setTimeout(() => processPendingQueue('stale5m'), 500);
    }
  }

  // ✅ 三层递进式 stale 检测（针对"用户感知无任务执行但队列卡住"场景）
  // 层 1: 60 秒超激进（基于 tokenStatus 全部完成）
  // 层 2: 3 分钟常规（基于 runningTokens 无活跃）
  if (!isRunning.value && isScheduledTaskRunning.value && scheduledTaskStartTime) {
    const elapsed = Date.now() - scheduledTaskStartTime;
    const taskName = currentScheduledTask?.name || '未知任务';
  
    // 公共：判断 runningTokens 是否还有活跃子任务
    const runningTokenSet = tokenStore.runningTokens?.value;
    const hasActiveChildTask = runningTokenSet && typeof runningTokenSet.size === 'number' ? runningTokenSet.size > 0 : false;
  
    // 公共：判断 tokenStatus 是否全部为终态（completed/failed）
    // 仅当选中的账号数>0 且全部有状态时才认为"全部完成"（避免空数组误判）
    const selectedList = selectedTokens.value || [];
    const hasTokens = selectedList.length > 0;
    const allTerminal = hasTokens && selectedList.every(id => {
      const s = tokenStatus.value?.[id];
      return s === 'completed' || s === 'failed';
    });
  
    // ✅ 层 1：60 秒超激进（所有账号均已完成/失败 → 说明异步链断裂，任务主体已停摆）
    // 给任务 60 秒的连接建立/初始 setup 宽容期
    let triggerLayer = 0;
    if (!hasActiveChildTask && elapsed > 60 * 1000 && allTerminal) {
      triggerLayer = 1;
    }
    // ✅ 层 2：3 分钟常规（无活跃子账号但 tokenStatus 未全部完成，可能部分账号 waiting_retry）
    else if (!hasActiveChildTask && elapsed > 3 * 60 * 1000) {
      triggerLayer = 2;
    }
      
    // ✅ 新增：防止"假执行"导致的误判
    // 场景：任务依赖验证失败等场景下，scheduledStartTime 刚设置不久（<3 秒），但没有子任务真正执行
    // 这不是卡死，而是正常提前退出
    const isVeryEarlyStage = elapsed < 3000 && !hasActiveChildTask;
  
    if (triggerLayer > 0 && !isVeryEarlyStage) {
      console.warn(
        `[${new Date().toISOString()}] 调度器侧 stale 层${triggerLayer} 触发：定时任务[${taskName}]已持续${Math.round(elapsed/1000)}秒，强制释放`,
      );
      // ✅ 通知旧任务停止
      shouldStop.value = true;
      // ✅ 标记孤儿 running 记录为 timeout
      let orphanCount = 0;
      taskExecutionRecords.value.forEach(r => {
        if (r.status === 'running' && r.name === taskName) {
          r.status = 'timeout';
          r.elapsedStr = `超时（stale层${triggerLayer}清理，${Math.round(elapsed/1000)}秒）`;
          r.endTime = Date.now();
          orphanCount++;
        }
      });
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null;
      try { window._pausePushRequested = false; } catch (e) { /* 兜底：释放推图暂停标记 */ }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 定时任务[${taskName}]已无活跃进度达${Math.round(elapsed/1000)}秒（层${triggerLayer}），调度器已强制释放${orphanCount ? `（标记${orphanCount}条孤儿记录）` : ''}`,
        type: "warning",
      });
      // ✅ stale 释放后消费队列，避免排队任务等待下一个调度器 tick
      setTimeout(() => processPendingQueue(`stale${triggerLayer}`), 500);
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      // ✅ 统一走刷新安全检查：任务执行中/队列非空/账号任务活跃/定时任务即将触发 均推迟刷新
      const refreshCheck = isSafeToRefreshPage();
      if (refreshCheck.safe) {
        console.log(`[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`);
        window.location.reload();
      } else {
         console.log(`[${new Date().toISOString()}] Scheduled refresh postponed: ${refreshCheck.reason}, will refresh after task completion`);
         // 标记需要在任务完成后刷新
         shouldRefreshAfterTask.value = true;
      }
    }
  }
};

// ✅ Cron 定时刷新检查（原实现在 healthCheck 中每5分钟才检查一次，而 Cron 最小粒度为分钟，
// 5分钟的检查点几乎无法命中目标分钟 → 定时刷新永不生效。改为在调度器每10秒的 tick 中检查）
let lastCronRefreshMinute = -1;
const checkCronRefresh = () => {
  if (!batchSettings.enableCronRefresh || !batchSettings.cronRefreshExpression) return;
  const now = new Date();
  let matched = false;
  try {
    matched = matchesCronExpression(batchSettings.cronRefreshExpression, now);
  } catch (e) {
    return;
  }
  if (!matched) return;

  // ✅ 防重复：10秒tick在同一命中分钟内会多次匹配，同一分钟只触发一次刷新
  const minute = Math.floor(now.getTime() / 60000);
  if (lastCronRefreshMinute === minute) return;
  lastCronRefreshMinute = minute;

  const refreshCheck = isSafeToRefreshPage();
  if (refreshCheck.safe) {
    console.log(`[${new Date().toISOString()}] Cron refresh triggered: ${batchSettings.cronRefreshExpression}`);
    window.location.reload();
  } else {
    console.log(`[${new Date().toISOString()}] Cron refresh postponed: ${refreshCheck.reason}, will refresh after task completion`);
    shouldRefreshAfterTask.value = true;
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
      // ✅ Cron 定时刷新：必须在调度器 tick 中检查（分钟粒度需 10 秒精度才能命中），
      // 且要放在下方 tasksToRun 空判断的 early return 之前
      checkCronRefresh();

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
            // ✅ 防重复触发：调度器每10秒tick一次，daily 任务按 HH:mm 匹配会在同一分钟内多次命中
            // executeScheduledTask 开头会写入 lastTaskExecution_，此处校验同一分钟内是否已触发过
            const lastExecRaw = localStorage.getItem(`lastTaskExecution_${task.id}`);
            if (lastExecRaw) {
              const lastExecTs = isNaN(Number(lastExecRaw)) ? new Date(lastExecRaw).getTime() : Number(lastExecRaw);
              if (lastExecTs && !isNaN(lastExecTs) &&
                  Math.floor(lastExecTs / 60000) === Math.floor(Date.now() / 60000)) {
                return; // 同一分钟内已触发过该任务，跳过（防止任务1分钟内完成后被同一分钟的后续tick重复执行）
              }
            }

            // ✅ 不上线时段检查（调度器层：最早拦截，避免任何副作用执行）
            if (task.offlineTimeEnabled && isInOfflineTime()) {
              // 写入触发时间戳：同一分钟内后续 tick 会被上方防重复逻辑静默拦截，
              // 避免每10秒重复打印一次跳过日志（一分钟内会出现6次）
              try { localStorage.setItem(`lastTaskExecution_${task.id}`, Date.now().toString()); } catch (e) { /* ignore */ }
              addLog({
                time: currentTime,
                message: `🚫 定时任务 ${task.name} 处于不上线时段，跳过执行`,
                type: "warning",
              });
              return;
            }
        
            // ✅ 定时任务仅与其他定时任务互斥，不参与日常任务的互斥排队
            // 定时任务绝对优先：日常任务正在执行时，定时任务直接执行，日常任务自动暂停
            if (isScheduledTaskRunning.value && currentScheduledTask) {
              // 同一个定时任务正在执行，跳过
              if (currentScheduledTask.id === task.id) {
                return;
              }
              // ✅ 加入待执行队列（仅定时任务之间互斥）
              if (!pendingTaskQueue.some(t => t.id === task.id)) {
                pendingTaskQueue.push(task);
                syncQueueDisplay(); // 同步响应式展示
                addLog({
                  time: currentTime,
                  message: `⏸️ 定时任务 ${task.name} 加入待执行队列（当前：${currentScheduledTask.name} 执行中，队列：${pendingTaskQueue.length}）`,
                  type: "info",
                });
              }
              return;
            }
                    
            // ✅ 启动前安全检查：防止 stale 清理后旧实例仍在运行时启动新实例
            if (task.taskType === 'push_map') {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏰ 推图定时触发：开始推图（${task.name}）`,
                type: "info",
              });
              window.$message?.success(`定时触发：自动开始推图`);
              pushStartAll().catch(e => console.error('[PushMap定时开始] 错误:', e));
              return; // 快速返回，不销耗调度器的“正在运行”状态
            }
            // ======================================================

            // ✅ 启动前安全检查：防止 stale 清理后旧实例仍在运行时启动新实例
            // 1. 检查队列中是否已有相同任务（避免“启动 + 排队”同时发生）
            if (pendingTaskQueue.some(t => t.id === task.id)) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏭️ 定时任务 ${task.name} 已在待执行队列中，跳过本次启动`,
                type: "info",
              });
              return;
            }
            // 2. 检查是否有同名孤儿 running 记录（说明旧实例被 stale 强制清理但可能仍在跑）
            const orphanRunningRecords = taskExecutionRecords.value.filter(
              r => r.status === 'running' && r.name === task.name
            );
            if (orphanRunningRecords.length > 0) {
              // 标记为 timeout，避免并发执行
              orphanRunningRecords.forEach(r => {
                r.status = 'timeout';
                r.elapsedStr = '超时（启动前孤儿清理）';
                r.endTime = Date.now();
              });
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚠️ 定时任务 ${task.name} 检测到${orphanRunningRecords.length}条孤儿 running 记录，等待健康检查清理后再试`,
                type: "warning",
              });
              return; // ✅ Bug #3 修复：立即返回，等待 healthCheck 清理孤儿后重试
            }

            // 设置任务执行状态并立即更新lastTaskExecution
            _scheduledTaskGeneration++; // 递增代数，使旧任务的 finally 知道自己已被替代
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
              // ✅ 确保任务完成后更新 lastTaskExecution
              lastTaskExecution = Date.now();
            });
        }
      });
      
      // ===== 推图任务停止时间检测 =====
      const nowTimeHHMM = now.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
      tasksToRun.forEach((task) => {
        if (task.taskType !== 'push_map' || !task.pushStopTime || !task.enabled) return;
        if (nowTimeHHMM !== task.pushStopTime) return;
        // 防重复：1分钟内已执行过
        const stopKey = `lastPushStopExecution_${task.id}`;
        const lastStop = localStorage.getItem(stopKey);
        if (lastStop && (now.getTime() - new Date(lastStop).getTime()) < 60000) return;
        localStorage.setItem(stopKey, now.toString());
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⏰ 推图定时触发：停止推图（${task.name}）`,
          type: "warning",
        });
        window.$message?.warning(`定时触发：自动停止推图`);
        pushStopAll(true);
      });
      // =============================================
      
      // ✅ 调度器兜底：通过统一入口消费队列
      processPendingQueue('scheduler');
    
      // ✅ 调度器统一处理延迟刷新：在所有任务处理和队列处理完毕后，检查是否需要刷新页面
      // ✅ 使用统一的刷新安全检查（含账号任务活跃度与即将触发的定时任务）
      if (shouldRefreshAfterTask.value && isSafeToRefreshPage().safe) {
        console.log(`[${new Date().toISOString()}] All tasks completed, executing postponed page refresh from scheduler tick`);
        shouldRefreshAfterTask.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `✅ 所有任务已完成，定时刷新页面将在 3 秒后执行...`,
          type: "info",
        });
        setTimeout(() => {
          // 再次确认没有新任务启动
          if (isSafeToRefreshPage().safe) {
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

// 处理手动调节每行数量（仅取消勾选自动时可编辑）
const handleManualColumnChange = () => {
  autoSaveBatchSettings();
};

// 切换「自动」勾选：勾选后禁用手动输入并立即按窗口宽度自适应，取消勾选后可手动修改
const handleAutoColumnsToggle = (checked) => {
  batchSettings.autoColumns = checked;
  if (checked) {
    // 立即同步为自动计算的列数
    batchSettings.tokenListColumns = responsiveColumns.value;
  }
  autoSaveBatchSettings();
};

// 窗口大小变化监听
let resizeTimer = null;
const handleResize = () => {
  // 防抖处理,避免频繁计算
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newWidth = window.innerWidth;
    windowWidth.value = newWidth;
    // 列数模式由「自动」勾选框控制，窗口大小变化不再强制切换
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
  _componentUnmounted = false; // HMR 重新挂载时重置标志
  // 监听窗口尺寸变化，用于竞技大厅助威弹窗移动端自适应
  window.addEventListener('resize', handleApexCheerResize);
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

  // 加载后清理已失效的任务引用（所有函数已在 script setup 中定义）
  cleanupInvalidTaskReferences();

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
  _componentUnmounted = true; // 标记组件已卸载，阻止 interval 回调继续执行
  window.removeEventListener('resize', handleApexCheerResize);
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
  // 推图任务跳过普通验证
  if (task.taskType === 'push_map') return true;

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
    } else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
      // manual_buy 和 collection_exchange 直接使用下划线名称
      functionName = taskName;
    }
    
    let taskFunction;
    try {
      // ✅ 优先从映射表获取函数引用（生产环境 eval 无法访问组件局部变量）
      taskFunction = taskFunctionMap[functionName] || eval(functionName);
    } catch (e) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 任务函数不存在: ${taskName}（可能已被删除），跳过验证`,
        type: "warning",
      });
      continue;
    }
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 任务 "${taskName}" 不是可执行函数，跳过验证`,
        type: "warning",
      });
      continue;
    }
  }

  // 验证宝笱周任务是否在宝笱周执行
  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚠️  当前不是宝箱周，跳过宝箱周任务：${task.selectedTasks.filter(t => boxWeeklyTasks.includes(t)).join(', ')}`,
      type: "warning",
    });
    // 返回 false，因为任务无法在当前条件下执行
    return false;
  }
  
  // 验证黑市周任务是否在黑市周执行
  const weirdTowerTasks = [
    'climbWeirdTower',
    'batchUseItems', 
    'batchMergeItems',
    'batchClaimFreeEnergy',
    'claim_weird_tower_all',
    'claim_weird_tower_pass',
    'weekly_market_buy'
  ];
  const hasWeirdTowerTask = task.selectedTasks.some(t => weirdTowerTasks.includes(t));
  if (hasWeirdTowerTask && !isWeirdTowerActivityOpen.value) {
    // 原逻辑：只有全部任务都是黑市周任务时才阻止启动；
    // 混合任务放行验证，由执行阶段过滤并记录“跳过不在活动周的任务”
    const otherTasks = task.selectedTasks.filter(t => !weirdTowerTasks.includes(t));
    if (otherTasks.length === 0) {
      // 只显示简化的警告信息，不显示详细周期说明
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `当前不是黑市周，${task.name} 任务需要在黑市周开放期间才能执行`,
        type: "warning",
      });
      // 返回 false，阻止任务启动
      return false;
    }
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
  // ✅ originalMaxActive 提升到函数级作用域，确保 finally 块能访问
  let originalMaxActive = batchSettings.maxActive;
  // ✅ 捕获当前任务代数，finally 块中用于判断自己是否仍是当前任务
  // 场景：stale 检测强制释放后新任务已启动，旧任务的 finally 不应覆盖新任务状态
  const _myGeneration = _scheduledTaskGeneration;
  
  // ✅ 在函数开始处就设置状态(调用者已设置,这里做防御性检查)
  if (!isScheduledTaskRunning.value) {
    isScheduledTaskRunning.value = true;
    currentScheduledTask = task;
  }

  // ✅ 防重复执行：无论从调度器还是队列/兜底路径进入，统一写入触发时间戳
  // 修复队列执行路径未写入 lastTaskExecution_ 导致同一分钟内重复执行的问题
  try {
    localStorage.setItem(`lastTaskExecution_${task.id}`, new Date().toString());
  } catch (e) { /* ignore */ }
  
  // ✅ 重置停止标志，防止用户手动停止后影响定时任务执行
  shouldStop.value = false;
  
  // ✅ 记录总执行开始时间
  const totalStartTime = Date.now();

  // ✅ 保留上次的任务执行记录（不覆盖，追加新记录）
  // taskExecutionRecords.value = [];  //  删除：不再清空
  
  // ✅ 保留本地存储（不清除，新记录会追加）
  // localStorage.removeItem('taskExecutionRecords');  // ❌ 删除：不再清除

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  // ✅ 推图互斥：定时任务优先 — 到点自动暂停推图，等推图真正停下后再执行定时，结束后自动恢复
  let _pausedPushIds = [];
  try {
    _pausedPushIds = (typeof window !== "undefined" && window._pt)
      ? Object.keys(window._pt).filter((id) => window._pt[id]?.running && !window._pt[id]?.stopFlag)
      : [];
  } catch (e) { _pausedPushIds = []; }
  if (_pausedPushIds.length > 0) {
    try { window._pausePushRequested = true; } catch (e) { /* ignore */ }
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⏸️ 定时任务优先：${_pausedPushIds.length} 个推图账号自动暂停，等待其停稳后执行定时…`,
      type: "warning",
    });
    // 等待推图循环检测到标记并进入暂停（每轮/每次发送/倒计时都会检查，最多等 30 秒）
    const _waitStart = Date.now();
    while (Date.now() - _waitStart < 30000) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const _stillActive = _pausedPushIds.filter((id) => {
          const st = window._pt?.[id];
          return st?.running && !st.stopFlag && !st.pausedBySchedule;
        });
        if (_stillActive.length === 0) break;
      } catch (e) { break; }
    }
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `▶️ 推图已暂停，开始执行定时任务（结束后自动重连继续推图）`,
      type: "info",
    });
  }

  try {

    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "warning",
      });
      return;  // ✅ finally 块会清理状态
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
        : (task.selectedTokens || []);
      
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

    // ✅ 单账号智能加速（定时任务）
    if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
      batchSettings.singleAccountMode = true;
      const mult = batchSettings.singleAccountMultiplier;
      const token = tokens.value.find(t => t.id === availableTokens[0]);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
        type: 'info',
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

    // ✅ 换皮闯关活动检测：在执行前检测，未开启就跳过整个任务
    const skinChallengeTasks = ["skinChallenge", "skinTreasure"];
    const hasSkinChallengeTask = activeTasks.some(t => skinChallengeTasks.includes(t));
    let skinChallengeConfirmedOpen = false; // ✅ 服务器确认活动已开启标记
    
    if (hasSkinChallengeTask && availableTokens.length > 0) {
      // ✅ 修复：短期负缓存防重 - 预检失败/活动关闭后 10 分钟内不再发起服务器请求
      // 避免活动未开启时每个调度器 tick（10秒）都重复连接服务器检测，浪费连接资源
      const SKIN_NEGATIVE_CACHE_KEY = 'skinChallenge_negativeCache';
      const SKIN_NEGATIVE_TTL = 10 * 60 * 1000; // 10 分钟
      let skipDueToNegativeCache = false;
      try {
        const negCache = JSON.parse(localStorage.getItem(SKIN_NEGATIVE_CACHE_KEY) || 'null');
        if (negCache?.timestamp && (Date.now() - negCache.timestamp) < SKIN_NEGATIVE_TTL) {
          const minsAgo = Math.round((Date.now() - negCache.timestamp) / 60000);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏭️ 换皮闯关检测：${minsAgo}分钟前已确认活动未开启（原因: ${negCache.reason || '未知'}），10分钟内不再重复检测，直接跳过`,
            type: "warning",
          });
          skipDueToNegativeCache = true;
          return false; // ✅ 直接短路，不建立连接
        }
      } catch {}
      
      if (!skipDueToNegativeCache) {
      // 需要连接一个Token来检测活动是否开启
      const testTokenId = availableTokens[0];
      let precheckSlotHeld = false; // ✅ 跟踪预检测连接的槽位持有状态，防止重复释放破坏连接池计数
      
      // ✅ 活动时间范围校验函数（根据 actId 前6位解析 YYMMDD，活动周期7天）
      const isActivityTimeValid = (rawActId) => {
        const idStr = String(rawActId);
        if (idStr.length < 6) return false;
        const year = 2000 + parseInt(idStr.substring(0, 2));
        const month = parseInt(idStr.substring(2, 4)) - 1;
        const day = parseInt(idStr.substring(4, 6));
        const startDate = new Date(year, month, day);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        const now = new Date();
        return now >= startDate && now < endDate;
      };
      
      try {
        await ensureConnection(testTokenId);
        precheckSlotHeld = true; // ✅ ensureConnection 成功后才持有槽位（失败抛出时其内部已释放）
        const activityRes = await tokenStore.sendMessageWithPromise(
          testTokenId,
          "activity_get",
          {},
          5000,
        );
        const actEGameInfo = activityRes?.activity?.actEGameInfo || activityRes?.actEGameInfo;
        let isActivityOpen = false;
        let validActId = null;
        
        console.log('[换皮闯关检测] actEGameInfo:', actEGameInfo);
        
        if (actEGameInfo?.actId) {
          const rawActId = actEGameInfo.actId;
          // ✅ 严格校验：actEGameInfo 非空 + 活动时间范围内
          isActivityOpen = isActivityTimeValid(rawActId);
          if (isActivityOpen) {
            skinChallengeConfirmedOpen = true; // ✅ 服务器确认活动开启
            validActId = rawActId;
            // ✅ 成功检测，缓存结果
            try {
              localStorage.setItem('skinChallenge_activityCache', JSON.stringify({
                actId: Number(rawActId),
                timestamp: Date.now(),
              }));
            } catch {}
            // ✅ 修复：服务器确认活动开启，清除负缓存，避免误拦后续任务
            try { localStorage.removeItem(SKIN_NEGATIVE_CACHE_KEY); } catch {}
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ 换皮闯关活动已开启（actId: ${rawActId}）`,
              type: "success",
            });
          } else {
            // ✅ 活动已过期，清除缓存防止后续任务误用旧缓存
            try { localStorage.removeItem('skinChallenge_activityCache'); } catch {}
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `🚫 换皮闯关活动已过期（actId: ${rawActId}，已不在7天周期内）`,
              type: "warning",
            });
          }
        } else {
          // ✅ actEGameInfo 为空：服务器明确返回无活动，清除缓存防止后续任务误判
          try { localStorage.removeItem('skinChallenge_activityCache'); } catch {}
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🚫 服务器返回活动信息为空，活动未开启`,
            type: "warning",
          });
        }
        
        if (!isActivityOpen) {
          // ✅ 写入负缓存：10 分钟内不再重复发起检测
          try {
            localStorage.setItem(SKIN_NEGATIVE_CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              reason: actEGameInfo?.actId ? '活动已过期' : '活动未开启',
            }));
          } catch {}
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 定时任务 ${task.name} 包含的任务都需要换皮闯关活动，但当前活动未开启，取消执行（10分钟内不再重复检测） ===`,
            type: "warning",
          });
          tokenStore.closeWebSocketConnection(testTokenId);
          releaseConnectionSlot(); // ✅ 修复：预检测获取的连接槽位必须释放，否则并发 1 时后续任务永久卡死
          precheckSlotHeld = false;
          return false; // ✅ 修改：返回 false 而不是直接 return，让调用者知道是验证失败
        }
        
        // 关闭测试连接，后续任务会按需连接
        tokenStore.closeWebSocketConnection(testTokenId);
        releaseConnectionSlot(); // ✅ 修复：释放连接槽位
        precheckSlotHeld = false;
      } catch (err) {
        console.error('[换皮闯关检测] 检测失败:', err);
        // ✅ 回退：请求失败时检查缓存并校验时间范围
        let useCache = false;
        try {
          const cache = JSON.parse(localStorage.getItem('skinChallenge_activityCache') || 'null');
          if (cache?.actId && cache?.timestamp && (Date.now() - cache.timestamp) < 24 * 60 * 60 * 1000) {
            if (isActivityTimeValid(cache.actId)) {
              const hoursAgo = Math.round((Date.now() - cache.timestamp) / 3600000);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚠️ 活动检测请求失败: ${err.message}，但 ${hoursAgo}小时前缓存显示活动已开启(actId:${cache.actId})且时间未过期，继续执行`,
                type: "warning",
              });
              useCache = true;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🚫 活动检测请求失败，缓存 actId:${cache.actId} 已过期，活动未开启`,
                type: "warning",
              });
            }
          }
        } catch {}
        
        if (!useCache) {
          // ✅ 写入负缓存：10 分钟内不再重复发起检测
          try {
            localStorage.setItem(SKIN_NEGATIVE_CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              reason: '检测失败且无缓存',
            }));
          } catch {}
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 换皮闯关活动检测失败且无可用缓存，取消执行（10分钟内不再重复检测） ===`,
            type: "warning",
          });
          try { tokenStore.closeWebSocketConnection(testTokenId); } catch {}
          // ✅ 修复：仅在持有槽位时释放（ensureConnection 失败时其内部已释放，重复释放会破坏连接池计数导致超并发）
          if (precheckSlotHeld) { try { releaseConnectionSlot(); } catch {} precheckSlotHeld = false; }
          return false; // ✅ 修改：返回 false 而不是直接 return，让调用者知道是验证失败
        }
        // 关闭测试连接
        try { tokenStore.closeWebSocketConnection(testTokenId); } catch {}
        // ✅ 修复：仅在持有槽位时释放，防止重复释放
        if (precheckSlotHeld) { try { releaseConnectionSlot(); } catch {} precheckSlotHeld = false; }
      }
      } // end of if (!skipDueToNegativeCache)
    }

    // ✅ 新区换皮检测：通过 towers_getinfo 判断新区闯关是否开启（负缓存防重，同换皮闯关范式）
    const newSkinTasks = ["newSkinChallenge", "newSkinTreasure"];
    const hasNewSkinTask = activeTasks.some(t => newSkinTasks.includes(t));
    if (hasNewSkinTask && availableTokens.length > 0) {
      const NEW_SKIN_NEGATIVE_CACHE_KEY = 'newSkinChallenge_negativeCache';
      const NEW_SKIN_NEGATIVE_TTL = 10 * 60 * 1000; // 10 分钟
      let newSkinSkipDueToNegativeCache = false;
      try {
        const negCache = JSON.parse(localStorage.getItem(NEW_SKIN_NEGATIVE_CACHE_KEY) || 'null');
        if (negCache?.timestamp && (Date.now() - negCache.timestamp) < NEW_SKIN_NEGATIVE_TTL) {
          const minsAgo = Math.round((Date.now() - negCache.timestamp) / 60000);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏭️ 新区闯关检测：${minsAgo}分钟前已确认活动未开启，10分钟内不再重复检测，直接跳过`,
            type: "warning",
          });
          newSkinSkipDueToNegativeCache = true;
          return false; // ✅ 直接短路，不建立连接
        }
      } catch {}

      if (!newSkinSkipDueToNegativeCache) {
        // 新区换皮闯关兜底种子 actId（与 tasksTower.js 的 NEW_SERVER_TOWERS_ACT_ID 一致，抓包获取）；优先从 commonActivityInfo 最高 key 推导（maxKey - 2）
        const NEW_SERVER_TOWERS_ACT_ID = 2603131;
        const newSkinTestTokenId = availableTokens[0];
        let newSkinSlotHeld = false; // ✅ 跟踪预检测连接槽位，防止重复释放破坏连接池计数
        try {
          await ensureConnection(newSkinTestTokenId);
          newSkinSlotHeld = true;
          // ✅ 先从 activity_get commonActivityInfo 最高 key 推导本周新区闯关 actId（maxKey - 2），推导失败回退抓包种子
          let newSkinActId = NEW_SERVER_TOWERS_ACT_ID;
          try {
            const actRes = await tokenStore.sendMessageWithPromise(newSkinTestTokenId, "activity_get", {}, 5000);
            const commonActivityInfo = actRes?.commonActivityInfo || actRes?.activity?.commonActivityInfo || {};
            // ✅ 排除普通闯关礼包 key（actEGameInfo.actId + 1），取新区礼包 key 推导 actId = maxKey - 2
            const actEGameInfo = actRes?.activity?.actEGameInfo || actRes?.actEGameInfo;
            const normalKey = actEGameInfo?.actId ? String(Number(actEGameInfo.actId) + 1) : null;
            const giftKeys = Object.keys(commonActivityInfo).filter(k => /\d{6,7}3$/.test(k) && k !== normalKey);
            if (giftKeys.length > 0) {
              giftKeys.sort((a, b) => Number(b) - Number(a));
              newSkinActId = Number(giftKeys[0]) - 2;
            } else {
              // ✅ 无新区礼包 key：活动未开启，写入负缓存
              try {
                localStorage.setItem(NEW_SKIN_NEGATIVE_CACHE_KEY, JSON.stringify({
                  timestamp: Date.now(),
                  reason: 'commonActivityInfo 无新区礼包 key',
                }));
              } catch {}
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 定时任务 ${task.name} 包含新区换皮任务，但 commonActivityInfo 无新区礼包 key，新区闯关活动未开启，取消执行（10分钟内不再重复检测） ===`,
                type: "warning",
              });
              try { tokenStore.closeWebSocketConnection(newSkinTestTokenId); } catch {}
              if (newSkinSlotHeld) { try { releaseConnectionSlot(); } catch {} newSkinSlotHeld = false; }
              return false;
            }
          } catch (deriveErr) {
            // ✅ activity_get 失败不阻断，回退抓包种子交由 towers_getinfo 判定
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ 新区闯关 actId 推导失败: ${deriveErr?.message || deriveErr}，回退抓包种子 ${NEW_SERVER_TOWERS_ACT_ID}`,
              type: "warning",
            });
          }
          // ✅ towers_getinfo 成功返回即判定新区闯关活动已开启
          await tokenStore.sendMessageWithPromise(
            newSkinTestTokenId,
            "towers_getinfo",
            { actId: newSkinActId },
            5000,
          );
          // ✅ 服务器确认活动开启，清除负缓存
          try { localStorage.removeItem(NEW_SKIN_NEGATIVE_CACHE_KEY); } catch {}
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ 新区换皮闯关活动已开启（towers_getinfo actId: ${newSkinActId}）`,
            type: "success",
          });
          tokenStore.closeWebSocketConnection(newSkinTestTokenId);
          releaseConnectionSlot();
          newSkinSlotHeld = false;
        } catch (err) {
          const errMsg = err?.message || '';
          if (errMsg.includes('7900021') || errMsg.includes('7900022')) {
            // ✅ 活动未开启：写入负缓存，10 分钟内不再重复检测
            try {
              localStorage.setItem(NEW_SKIN_NEGATIVE_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                reason: '新区闯关活动未开启',
              }));
            } catch {}
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 定时任务 ${task.name} 包含新区换皮任务，但新区闯关活动未开启（7900021/7900022），取消执行（10分钟内不再重复检测） ===`,
              type: "warning",
            });
            try { tokenStore.closeWebSocketConnection(newSkinTestTokenId); } catch {}
            if (newSkinSlotHeld) { try { releaseConnectionSlot(); } catch {} newSkinSlotHeld = false; }
            return false;
          }
          // ✅ 其他错误（超时/限流等）不阻断，交由任务函数内部重试验证
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ 新区闯关检测请求失败: ${errMsg}，继续执行任务（内部会再次验证）`,
            type: "warning",
          });
          try { tokenStore.closeWebSocketConnection(newSkinTestTokenId); } catch {}
          if (newSkinSlotHeld) { try { releaseConnectionSlot(); } catch {} newSkinSlotHeld = false; }
        }
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
    
    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // 标记所有Token为正在执行任务
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, true);
    });

    // Execute selected tasks sequentially (not in parallel) to avoid connection conflicts
    for (const taskName of activeTasks) {
      if (shouldStop.value) break;

      // ✅ 移除免费扭蛋的跳过逻辑，允许独立执行（不再受日常任务判断控制）
      // 原逻辑：免费扭蛋已内置在日常任务的 buildActivityTasks 中（周二/四/六自动执行+累抽），无需独立执行
      // 现逻辑：允许用户手动点击免费扭蛋按钮独立执行，不受日常任务是否包含的影响

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
        !skinChallengeConfirmedOpen && // ✅ 服务器已确认活动开启则不再做本地周期判断
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
        message: `执行任务：${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });
            
      // ✅ 重置所有账号的状态（防止前一个任务的状态影响当前任务）
      availableTokens.forEach(tokenId => {
        tokenStatus.value[tokenId] = "waiting";
      });
            
      // ✅ 记录单个功能模块开始时间
      const taskStartTime = Date.now();
      const taskLabel = availableTasks.find((t) => t.value === taskName)?.label || taskName;

      // ✅ 记录子任务执行情况
      const taskRecordIndex = taskExecutionRecords.value.push({
        name: taskLabel,
        startTime: taskStartTime,
        endTime: null,
        elapsedStr: null,
        status: 'running',
        // 新增：执行进度统计
        totalAccounts: availableTokens.length,
        successCount: 0,
        failCount: 0,
        runningCount: availableTokens.length,
        progressPercent: 0,
        // 新增：失败账号详情
        failedAccounts: [],
        // 新增：计划执行时间（如果是定时任务）
        scheduledTime: null,
      }) - 1;

      // ✅ 添加实时进度更新定时器（每 500ms 更新一次）
      // 十殿挑战任务使用独立的进度统计逻辑，不使用定时器
      const isNightmareTask = taskName === 'batchNightmareChallengePresets';
      const scheduledProgressTimer = isNightmareTask ? null : setInterval(() => {
        let successCount = 0;
        let failCount = 0;
        let runningCount = 0;
        const failedAccounts = [];
        
        availableTokens.forEach(tokenId => {
          const status = tokenStatus.value[tokenId];
          if (status === 'completed') {
            successCount++;
          } else if (status === 'failed') {
            failCount++;
            const token = tokens.value.find(t => t.id === tokenId);
            failedAccounts.push({
              name: token?.name || '未知账号',
              error: tokenFailReasons.value[tokenId] || '未知错误',
              time: new Date().toLocaleTimeString(),
            });
          } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
            runningCount++;
          }
        });
        
        // 更新任务记录
        if (taskExecutionRecords.value[taskRecordIndex]) {
          taskExecutionRecords.value[taskRecordIndex].successCount = successCount;
          taskExecutionRecords.value[taskRecordIndex].failCount = failCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount = runningCount;
          taskExecutionRecords.value[taskRecordIndex].failedAccounts = failedAccounts;
          
          // 更新进度百分比
          const completed = successCount + failCount;
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
      }, 500);

      // Call the task function dynamically
      // 处理函数名映射（下划线格式 -> 驼峰格式）
      let functionName = taskName;
      if (taskName === 'weekly_market_buy') {
        functionName = 'weeklyMarketBuy';
      } else if (taskName === 'manual_buy' || taskName === 'collection_exchange') {
        // manual_buy 和 collection_exchange 直接使用下划线名称
        functionName = taskName;
      }
      
      // ✅ 新增：先通过 isTaskFunctionExists 验证，避免 eval() 失败
      // 这包括 knownGlobalTaskFunctions 白名单中的所有函数
      if (!isTaskFunctionExists(functionName)) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 任务函数 "${functionName}" 不存在（可能已被删除），跳过执行`,
          type: "warning",
        });
        continue;
      }
      
      let taskFunction;
      try {
        // ✅ 优先从映射表获取函数引用（生产环境 eval 无法访问组件局部变量）
        taskFunction = taskFunctionMap[functionName] || eval(functionName);
      } catch (e) {
        // eval 理论上不会走到这里，因为上面已经有 isTaskFunctionExists 验证了
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `⚠️ 任务函数 "${functionName}" 不存在（可能已被删除），跳过执行`,
          type: "warning",
        });
        continue;
      }
      if (typeof taskFunction === "function") {
        // ✅ 优化：不再预先分批，直接传递所有账号给任务函数
        // runStreaming 内部会根据 maxActive 自动控制并发数
        // 定时任务优先使用任务级并发数，否则使用全局设置
        const maxConcurrent = (task.maxActive > 0) ? task.maxActive : (batchSettings.maxActive || 5);
        // 同步连接池大小，确保与当前设置一致
        wsPool.setPoolSize(maxConcurrent);
        const totalAccounts = availableTokens.length;
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 共 ${totalAccounts} 个账号，使用流式执行（并发数${maxConcurrent}）`,
          type: "info",
        });
        
        // ✅ 设置当前批次的账号（所有账号）
        selectedTokens.value = [...availableTokens];
        
        // ✅ 临时修改 batchSettings.maxActive 为任务级并发数，确保内部 runStreaming 使用正确
        originalMaxActive = batchSettings.maxActive;
        if (task.maxActive > 0) {
          batchSettings.maxActive = task.maxActive;
          console.log(`[定时任务] 临时设置 batchSettings.maxActive = ${task.maxActive}（任务级并发控制）`);
        }
        
        // 执行任务函数（带超时保护，防止单个任务卡死导致整个定时任务挂起）
        // ✅ BUG 修复：十殿挑战内部有 2 小时超时保护，外层超时需适配
        const isNightmareTask = taskName === 'batchNightmareChallengePresets';
        const BATCH_TASK_TIMEOUT = isNightmareTask
          ? (150 * 60 * 1000) // 十殿挑战：150 分钟（>内部 2 小时超时 + 重试余量）
          : ((batchSettings.batchTaskTimeout || 240) * 60 * 1000); // 批量任务：默认为 4 小时（240 分钟）
        
        // ✅ 记录当前批次的账号数量（用于统计）
        const batchStartCount = availableTokens.length;
        console.log(`[定时任务] ${taskName} 批次开始：batchStartCount=${batchStartCount}, totalAccounts=${totalAccounts}`);
        
        try {
          const executeTaskFunction = async () => {
            if (
              [
                "batchOpenBox",
                "batchOpenBoxByPoints",
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
            } else if (taskName === 'apex_buy') {
              // 逐鹿商店多选购买，根据任务配置更新商店配置后执行
              const shopConfig = task.apexBuyItems || {};
              if (Object.keys(shopConfig).length > 0) {
                // 更新 tasksStore 中的逐鹿商店配置
                apexShopConfig.value.forEach(item => {
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
                  message: `⚠️ 逐鹿商店未配置商品，跳过`,
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
            } else if (taskName === 'collection_exchange') {
              // 珍宝阁商店购买，从任务配置读取选中的商品
              const buyConfig = task.collectionExchangeItems || {};
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
                // 更新 batchSettings.collectionExchangeItems 供 collection_exchange 函数读取
                batchSettings.collectionExchangeItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 珍宝阁商店购买未配置商品，跳过`,
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
            } else if (taskName === 'batchOpenFragmentPacks') {
              // 碎片礼包多选开启，传递选中的 itemId 数组
              const fragmentConfig = task.fragmentPackItems || [];
              console.log('[定时任务-碎片礼包] task.fragmentPackItems:', fragmentConfig);
              await taskFunction({ isScheduledTask: true, selectedItems: fragmentConfig.length > 0 ? fragmentConfig : null });
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
                await batchNightmareChallengePresets(true, taskRecordIndex);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 十殿阎罗挑战未配置预设，跳过`,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchBookUpgrade') {
              // 图鉴升星，传入选择的升星类型
              const types = task.bookUpgradeTypes && task.bookUpgradeTypes.length > 0 ? task.bookUpgradeTypes : ['hero', 'fish', 'skin'];
              const typeLabels = { hero: '英雄', fish: '鱼灵', skin: '皮肤' };
              const selectedLabels = types.map(t => typeLabels[t] || t).join('+');
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⭐ 图鉴升星：执行【${selectedLabels}】`,
                type: "info",
              });
              await taskFunction(types);
            } else if (taskName === 'batcharenafight') {
              // ✅ 竞技场战斗，读取任务配置的竞技场次数（优先任务级配置，否则用全局设置）
              const fightCount = task.arenaFightCount || currentSettings.arenaFightCount || 3;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚔️ 竞技场战斗：执行 ${fightCount} 次`,
                type: "info",
              });
              await taskFunction(fightCount);
            } else if (taskName === 'batchGenieChallenge') {
              // 灯神挑战：读取任务级配置的势力与阵容（缺省时用账号设置的灯神阵容）
              const genieConf = task.genieChallenge || {};
              const genieIds = (genieConf.genieIds && genieConf.genieIds.length > 0) ? genieConf.genieIds : [1, 2, 3, 4];
              const genieFormation = normalizeGenieFormation(currentSettings.genieFormation);
              const genieDailyLimit = genieConf.dailyLimit || 10;
              const genieNamesMap = { 1: '魏国', 2: '蜀国', 3: '吴国', 4: '群雄' };
              const genieLabel = genieIds.map(g => genieNamesMap[g] || g).join('、');
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🧞 灯神挑战：执行【${genieLabel}】（阵容${genieFormation}），每日上限${genieDailyLimit}次`,
                type: "info",
              });
              await taskFunction(genieIds, genieFormation, { dailyLimit: genieDailyLimit });
            } else if (taskName === 'batchDeepSeaChallenge') {
              // 深海挑战：固定挑战深海灯神（genieId=5），阵容按账号设置中单独配置的深海预设阵容（深海不限阵营）
              const dsConf = task.deepSeaChallenge || {};
              const dsFormation = normalizeGenieFormation(currentSettings.deepSeaFormation || 1);
              const dsWeeklyLimit = dsConf.weeklyLimit || dsConf.dailyLimit || 10;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🌊 深海挑战：执行深海灯神（阵容${dsFormation}），每周上限${dsWeeklyLimit}次（周一刷新）`,
                type: "info",
              });
              await taskFunction(dsFormation, { weeklyLimit: dsWeeklyLimit });
            } else if (taskName === 'batchSaltCupBet') {
              // 比赛竞猜，自动获取所有比赛并下注
              const pickVal = task.saltCupBetPick !== undefined ? task.saltCupBetPick : 1;
              const pickLabels = { 1: '主胜', 2: '平局', 3: '客胜' };
              const taskMaxConcurrent = (task.maxActive > 0) ? task.maxActive : (batchSettings.maxActive || 5);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `🏆 比赛竞猜：自动对所有未下注比赛押【${pickLabels[pickVal] || '主胜'}】（并发 ${taskMaxConcurrent}）`,
                type: "info",
              });
              // ✅ 修复：显式把任务级并发数传给 batchSaltCupBet→runStreaming，避免仅靠 batchSettings.maxActive 隐式中继导致用户设置的并行数不生效（表现为串行）
              await taskFunction(null, pickVal, taskMaxConcurrent);
            } else if (taskName === 'batchApexGuess') {
              // 逐鹿盐山竞猜：自动拉取对阵并按策略择队
              // 淘汰赛局部编号（20-26），兼容旧存的绝对编号46-52
              let stage = task.apexGuessScheduleId || 20;
              if (stage >= 46) stage -= 26;
              const groupId = task.apexGuessGroupId !== undefined ? task.apexGuessGroupId : 1;
              // 编码规则: scheduleId = (期次-1)*26 + 局部编号
              const scheduleId = groupId * 26 + stage;
              const strategy = task.apexGuessStrategy || 'power';
              const strategyLabels = { left: '全押蓝方', right: '全押红方', power: '押高战力', cheer: '押多助威' };
              const scheduleLabels = { 20: '64强', 21: '32强', 22: '16强', 23: '8强', 24: '4强', 25: '季军赛', 26: '决赛' };
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚔️ 逐鹿盐山竞猜：第${groupId + 1}期 ${scheduleLabels[stage] || stage}（scheduleId=${scheduleId}） 按【${strategyLabels[strategy] || strategy}】自动择队`,
                type: "info",
              });
              // 用第一个账号拉取对阵列表
              const fetchTokenId = availableTokens[0];
              const fetchToken = tokens.value.find(t => t.id === fetchTokenId);
              let fetchReady = false;
              if (!fetchToken) {
                // ✅ 修复：Token 可能已被删除，避免 fetchToken.token 报 TypeError 导致整个子任务失败
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 逐鹿盐山竞猜：账号 ${fetchTokenId} 不存在，无法拉取对阵列表`,
                  type: "warning",
                });
              } else if (tokenStore.getWebSocketStatus(fetchTokenId) !== 'connected') {
                // ✅ 修复：等待连接真正建立（原固定等待2秒可能未连上，导致后续请求失败使整个子任务中断）
                tokenStore.createWebSocketConnection(fetchTokenId, fetchToken.token, fetchToken.wsUrl);
                fetchReady = await waitForConnection(fetchTokenId);
                if (!fetchReady) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `⚠️ 逐鹿盐山竞猜：账号 ${fetchToken.name} 连接超时，无法拉取对阵列表`,
                    type: "warning",
                  });
                }
              } else {
                fetchReady = true;
              }
              const guessTeamIds = [];
              const seenTeamIds = new Set(); // ✅ 对阵去重：防止分页失效时对同一场重复下注
              let guessIdx = 0;
              for (let page = 0; fetchReady && page < 40; page++) {
                const res = await tokenStore.sendMessageWithPromise(fetchTokenId, "apex_getguesslist", { scheduleId, groupId, idx: guessIdx }, 5000);
                const list = res?.apexGuessList;
                if (!Array.isArray(list) || list.length === 0) break;
                let addedCount = 0;
                let dupCount = 0;
                for (const pair of list) {
                  if (Array.isArray(pair) && pair.length >= 2) {
                    const left = pair[0];
                    const right = pair[1];
                    let pickRight = false;
                    if (strategy === 'right') pickRight = true;
                    else if (strategy === 'power') pickRight = (right?.power || 0) > (left?.power || 0);
                    else if (strategy === 'cheer') pickRight = (right?.cheerCnt || 0) > (left?.cheerCnt || 0);
                    const pickedTeamId = pickRight ? right?.teamId : left?.teamId;
                    if (pickedTeamId) {
                      if (seenTeamIds.has(pickedTeamId)) { dupCount++; continue; }
                      seenTeamIds.add(pickedTeamId);
                      addedCount++;
                      guessTeamIds.push(pickedTeamId);
                    }
                  }
                }
                // ✅ 本页全部为重复数据（服务器分页失效），提前结束
                if (addedCount === 0 && dupCount > 0) break;
                if (res?.last === true) break;
                guessIdx += 5;
              }
              if (guessTeamIds.length === 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ 逐鹿盐山竞猜未获取到对阵数据（赛程可能未开放），跳过`,
                  type: "warning",
                });
              } else {
                const taskMaxConcurrent = (task.maxActive > 0) ? task.maxActive : (batchSettings.maxActive || 5);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚔️ 已择队 ${guessTeamIds.length} 场，开始批量竞猜（并发 ${taskMaxConcurrent}）`,
                  type: "info",
                });
                // ✅ 修复：显式把任务级并发数传给 batchApexGuess→runStreaming，避免仅靠 batchSettings.maxActive 隐式中继
                await taskFunction(scheduleId, guessTeamIds, taskMaxConcurrent, groupId);
              }
            } else if (taskName === 'batchSaltRoadCheer') {
              // 天宫助威：支持预选军团ID或自动按方向获取
              const side = task.saltRoadSide || 1;
              const voteCnt = task.saltRoadVoteCount || 1;
              const legionId = task.saltRoadLegionId || null;
              const legionName = task.saltRoadLegionName || '';
              if (legionId) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🏆 天宫助威：对 ${legionName}(${legionId}) 助威 ${voteCnt} 次`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `🏆 天宫助威：对 ${side === 1 ? '左军' : '右军'} 助威 ${voteCnt} 次（自动获取对阵）`,
                  type: "info",
                });
              }
              await taskFunction(side, voteCnt, legionId || undefined, legionName || undefined);
            } else if (taskName === 'batchSimplifiedDaily') {
              // 日常精简补齐：不判断活跃度，按任务配置勾选的任务项执行
              const keys = (task.simplifiedDailyItems && task.simplifiedDailyItems.length > 0)
                ? task.simplifiedDailyItems
                : SIMPLIFIED_TASK_ITEMS.map(item => item.key);
              const keyLabels = keys.map(k => SIMPLIFIED_TASK_ITEMS.find(item => item.key === k)?.label || k).join('、');
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚡ 日常精简补齐：${keyLabels}（不判断活跃度）`,
                type: "info",
              });
              await taskFunction(keys);
            } else if (taskName === 'batchLegacyClaimGiftTask') {
              // 领取残卷赠送奖励：传入任务级并发数
              const taskMaxConcurrent = (task.maxActive > 0) ? task.maxActive : (batchSettings.maxActive || 5);
              await taskFunction(taskMaxConcurrent);
            } else if (taskName === 'batchCampChallenge') {
              // 营地挑战：优先使用定时任务里配置的策略（未配置时运行时读取全局"营地挑战"设置）
              const cc =
                task.campChallenge && Object.keys(task.campChallenge).length > 0
                  ? task.campChallenge
                  : undefined;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: cc
                  ? '🏕️ 营地挑战：使用定时任务内配置执行'
                  : '🏕️ 营地挑战：使用全局营地挑战设置执行',
                type: 'info',
              });
              await taskFunction(cc);
            } else {
              await taskFunction();
            }
            }; // end executeTaskFunction
            let _raceTimeoutId;
            await Promise.race([
              executeTaskFunction(),
              new Promise((_, reject) => { _raceTimeoutId = setTimeout(() => {
                console.error(`[定时任务] 检测到 ${taskName} 执行超时 (${BATCH_TASK_TIMEOUT / 60000}分钟)，记录当前正在执行的账号数量:`, 
                  taskExecutionRecords.value[taskRecordIndex]?.runningCount || 0);
                reject(new Error(`批量任务执行超时（${BATCH_TASK_TIMEOUT / 60000}分钟）`));
              }, BATCH_TASK_TIMEOUT); })
            ]);

          
            // ✅ 任务执行成功，更新成功统计（由实时进度定时器负责计算，这里不再累加）
            if (taskExecutionRecords.value[taskRecordIndex]) {
              console.log(`[定时任务] ${taskName} 执行成功，当前 successCount = ${taskExecutionRecords.value[taskRecordIndex].successCount}`);
              // 更新进度（由实时定时器负责，这里确保最终状态正确）
              const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
              taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
            }
          } catch (error) {
            console.error(`执行任务 ${taskName} 失败:`, error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `❌ 执行失败：${error.message}`,
              type: "error",
            });
            
            // ✅ 检查是否为真正的超时错误（区分误报和真实超时）
            const isTimeoutError = error.message && error.message.includes('批量任务执行超时');
                      
            // ✅ 标记子任务执行记录
            if (taskExecutionRecords.value[taskRecordIndex]) {
              const currentRunningCount = taskExecutionRecords.value[taskRecordIndex].runningCount;
              const currentSuccessCount = taskExecutionRecords.value[taskRecordIndex].successCount;
              const currentFailCount = taskExecutionRecords.value[taskRecordIndex].failCount;
              
              console.log(`[定时任务] ${taskName} 进入 catch 块，当前状态:`, {
                batchStartCount,
                totalAccounts: taskExecutionRecords.value[taskRecordIndex].totalAccounts,
                currentSuccessCount,
                currentFailCount,
                currentRunningCount,
                isTimeoutError,
              });
                        
              // ✅ 如果所有账号都已执行完成（无 running 且 success 达到总数），则不是真实超时，直接返回
              const isAllCompleted = currentRunningCount === 0 && currentSuccessCount > 0;
                        
              if (isAllCompleted && !isTimeoutError) {
                console.log(`[定时任务] ${taskName} 未检测到超时，忽略非 timeout 错误`);
                return; // ⚠️ 不要在这里标记失败
              }
                        
              // ✅ 如果是超时错误，但实际所有账号都已成功完成，可能是超时误报，需要进一步确认
              if (isTimeoutError && isAllCompleted && currentSuccessCount === batchStartCount) {
                console.warn(`[定时任务] 检测到超时，但所有 ${currentSuccessCount} 个账号均已成功完成，可能为误报，保留已完成的记录`);
                
                // ✅ 清除实时进度更新定时器
                if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
                
                // ✅ 关键修复：虽然是误报，但仍需正常结束任务
                // 防止因为超时误报导致任务状态不正确
                if (taskExecutionRecords.value[taskRecordIndex]) {
                  const taskElapsed = Date.now() - taskStartTime;
                  const taskElapsedStr = taskElapsed >= 60000
                    ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
                    : `${(taskElapsed / 1000).toFixed(1)}秒`;
                  
                  taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
                  taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
                  taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
                  taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
                  taskExecutionRecords.value[taskRecordIndex].status = 'success'; // ✅ 明确设置为 success
                  
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `✅ ${taskLabel} 执行完成（超时误报），用时：${taskElapsedStr}`,
                    type: "warning",
                  });
                  
                  // 保存任务完成情况到本地存储
                  saveTaskExecutionRecordsToStorage();
                }
                
                return; // ⚠️ 不要覆盖已完成的结果
              }
                        
              // ✅ 只有当存在仍在运行的账号时，才将其标记为失败（避免重复累加已失败的账号）
              if (currentRunningCount > 0) {
                // 只将仍在 running/waiting 的账号追加到失败
                taskExecutionRecords.value[taskRecordIndex].failCount += currentRunningCount;
                taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
                          
                // ✅ 修复：使用 tokenStatus 准确判断哪些账号尚未完成（原逻辑条件反转，会将已成功/已失败的账号重复记录）
                availableTokens.forEach(tokenId => {
                  const status = tokenStatus.value[tokenId];
                  // 只处理尚未完成的账号（running/waiting/waiting_retry 状态）
                  if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
                    const token = tokens.value.find(t => t.id === tokenId);
                    taskExecutionRecords.value[taskRecordIndex].failedAccounts.push({
                      name: token?.name || '未知账号',
                      error: tokenFailReasons.value[tokenId] || error.message || '执行超时',
                      time: new Date().toLocaleTimeString(),
                    });
                  }
                });
                          
                // 更新进度
                const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
                const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
                taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
                          
                // 保存任务完成情况到本地存储（失败时也保存）
                saveTaskExecutionRecordsToStorage();
              }
            }

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
          } finally {
            // ✅ 统一在 finally 中清理定时器和状态，确保无论成功/失败/异常都能执行
            // 1. 清理超时定时器（防止内存泄漏）
            if (typeof _raceTimeoutId !== 'undefined' && _raceTimeoutId) clearTimeout(_raceTimeoutId);
            // 2. 清理实时进度定时器
            if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
            // 3. 刷新心跳时间戳，防止 healthCheck 误判定时任务卡死
            scheduledTaskStartTime = Date.now();
            lastTaskExecution = Date.now();
          }
          
          // ✅ 显示当前功能模块用时
          const taskElapsed = Date.now() - taskStartTime;
          const taskElapsedStr = taskElapsed >= 60000
            ? `${Math.floor(taskElapsed / 60000)}分${Math.floor((taskElapsed % 60000) / 1000)}秒`
            : `${(taskElapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ ${taskLabel} 执行完成，用时：${taskElapsedStr}`,
            type: "success",
          });
          
          // ✅ 更新子任务执行记录
          if (taskExecutionRecords.value[taskRecordIndex]) {
            taskExecutionRecords.value[taskRecordIndex].endTime = Date.now();
            taskExecutionRecords.value[taskRecordIndex].elapsedStr = taskElapsedStr;
            
            // ✅ 十殿挑战任务使用独立的进度统计逻辑（由 onComplete/onError 回调更新）
            // 其他任务：任务完成后重新计算统计（确保所有账号都被正确统计）
            if (!isNightmareTask) {
              let finalSuccessCount = 0;
              let finalFailCount = 0;
              const finalFailedAccounts = [];
              
              availableTokens.forEach(tokenId => {
                const status = tokenStatus.value[tokenId];
                if (status === 'completed') {
                  finalSuccessCount++;
                } else if (status === 'failed') {
                  finalFailCount++;
                  const token = tokens.value.find(t => t.id === tokenId);
                  finalFailedAccounts.push({
                    name: token?.name || '未知账号',
                    error: tokenFailReasons.value[tokenId] || '未知错误',
                    time: new Date().toLocaleTimeString(),
                  });
                } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') {
                  // ✅ 修复：仍在 running/waiting 的账号视为失败（超时中断后 tokenStatus 可能未被更新）
                  finalFailCount++;
                  const token = tokens.value.find(t => t.id === tokenId);
                  finalFailedAccounts.push({
                    name: token?.name || '未知账号',
                    error: tokenFailReasons.value[tokenId] || '执行中断',
                    time: new Date().toLocaleTimeString(),
                  });
                }
              });
              
              taskExecutionRecords.value[taskRecordIndex].successCount = finalSuccessCount;
              taskExecutionRecords.value[taskRecordIndex].failCount = finalFailCount;
              taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
              taskExecutionRecords.value[taskRecordIndex].failedAccounts = finalFailedAccounts;
              
              // ✅ 如果所有账号都已完成，设置进度为 100%
              const totalCompleted = finalSuccessCount + finalFailCount;
              const totalAccounts = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              if (totalCompleted >= totalAccounts) {
                taskExecutionRecords.value[taskRecordIndex].progressPercent = 100;
              } else {
                // 否则根据实际完成情况计算进度
                taskExecutionRecords.value[taskRecordIndex].progressPercent = totalAccounts > 0 ? Math.round((totalCompleted / totalAccounts) * 100) : 0;
              }
            } else {
              // 十殿挑战：只更新 runningCount 为 0，保留已有的 successCount/failCount
              taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
              // 确保进度百分比正确
              const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
              const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
              taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
            }
                        
            // 🔍 DEBUG: 输出最终的统计信息
            console.log(`[定时任务] ${taskName} 最终结果:`, {
              successCount: taskExecutionRecords.value[taskRecordIndex].successCount,
              failCount: taskExecutionRecords.value[taskRecordIndex].failCount,
              runningCount: 0,
              totalAccounts: taskExecutionRecords.value[taskRecordIndex].totalAccounts,
              failedAccountsLength: taskExecutionRecords.value[taskRecordIndex].failedAccounts.length,
            });
                        
            // ✅ 根据实际完成情况设置状态（修复：之前只看之前的状态，现在根据 successCount 和 failCount 判断）
            const record = taskExecutionRecords.value[taskRecordIndex];
            if (record.failCount === 0) {
              record.status = 'success'; // 全部成功
            } else if (record.successCount > 0 && record.failCount > 0) {
              record.status = 'partial'; // 部分完成
            } else {
              record.status = 'fail'; // 全部失败
            }
            // 保存任务完成情况到本地存储
            saveTaskExecutionRecordsToStorage();
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
            message: `任务函数不存在：${taskName}`,
            type: "error",
          });
          // ✅ 清除实时进度更新定时器
          if (scheduledProgressTimer) clearInterval(scheduledProgressTimer);
          // ✅ 更新子任务执行记录为失败
          if (taskExecutionRecords.value[taskRecordIndex]) {
            taskExecutionRecords.value[taskRecordIndex].status = 'fail';
            taskExecutionRecords.value[taskRecordIndex].elapsedStr = '函数不存在';
          }
        }
      }

    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    // ✅ 显示总执行用时
    const totalElapsed = Date.now() - totalStartTime;
    const totalElapsedStr = totalElapsed >= 60000
      ? `${Math.floor(totalElapsed / 60000)}分${Math.floor((totalElapsed % 60000) / 1000)}秒`
      : `${(totalElapsed / 1000).toFixed(1)}秒`;
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成：${task.name}，总用时：${totalElapsedStr} ===`,
      type: "success",
    });
    
    // 定时任务完成后保存所有记录到本地存储
saveTaskExecutionRecordsToStorage();
  } catch (error) {
    // 标记所有Token为任务完成
    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    // ✅ 失败时也显示总用时
    const failElapsed = Date.now() - totalStartTime;
    const failElapsedStr = failElapsed >= 60000
      ? `${Math.floor(failElapsed / 60000)}分${Math.floor((failElapsed % 60000) / 1000)}秒`
      : `${(failElapsed / 1000).toFixed(1)}秒`;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message}，已用时: ${failElapsedStr} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );

    // ✅ 将所有仍在执行中的子任务标记为失败
    taskExecutionRecords.value.forEach(record => {
      if (record.status === 'running') {
        record.status = 'fail';
        record.elapsedStr = '未完成';
      }
    });
  } finally {
    // ✅ 恢复原始的 batchSettings.maxActive（确保无论成功还是失败都恢复）
    // ✅ 原判断 if (originalMaxActive !== undefined) 有缺陷，已在函数开头初始化解决
    if (originalMaxActive !== undefined && task.maxActive > 0) {
      batchSettings.maxActive = originalMaxActive;
      console.log(`[定时任务] 已恢复 batchSettings.maxActive = ${originalMaxActive}`);
    } else if (task.maxActive <= 0) {
      // 如果任务本身没有设置 maxActive，确保使用全局配置（防止其他模块修改）
      // ✅ 这个 else 分支是防御性编程，确保全局并发数不会被意外修改
    }
    
    // ✅ 关键修复：检查任务是否"假执行"（依赖验证失败等早期返回场景）
    // 场景：任务还未真正开始就提前返回，但 scheduledStartTime 已被设置
    // 导致 runningTokens.size === 0，被 stale 检测误判为卡死
    const elapsedSinceStart = scheduledTaskStartTime ? Date.now() - scheduledTaskStartTime : 0;
    // ✅ 修复：Pinia store 会自动解包 ref（无 .value），且原写法运算符优先级错误（size || 0 > 0）
    const hasActiveChildTask = (tokenStore.runningTokens?.size ?? 0) > 0;
    if (!hasActiveChildTask && elapsedSinceStart < 3000) {
      console.warn(
        `[${new Date().toISOString()}] 检测到任务可能未真正执行（elapsed=${elapsedSinceStart}ms, runningTokens=${tokenStore.runningTokens?.size ?? 0}）`
      );
    }
    
    // ✅ 检查自己是否仍是当前任务（代数未变 → 没有被 stale 检测替代 → 安全清理）
    // 如果代数已变，说明新任务已启动，跳过状态重置避免覆盖新任务
    const _isMyCleanup = (_myGeneration === _scheduledTaskGeneration);
    if (!_isMyCleanup) {
      console.warn(
        `[${new Date().toISOString()}] 任务 [${task.name}] 的 finally 检测到代数已变（我的=${_myGeneration}, 当前=${_scheduledTaskGeneration}），跳过状态重置避免覆盖新任务`
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️ 任务 [${task.name}] 已被 stale 检测替代，finally 跳过状态重置`,
        type: 'warning',
      });
    }

    // 清除任务执行状态（仅当自己仍是当前任务时）
    if (_isMyCleanup) {
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null; // ✅ 清除超时计时
      // ✅ 推图互斥恢复：清除暂停标记，被暂停的推图会自动重连继续
      try { window._pausePushRequested = false; } catch (e) { /* ignore */ }
      try {
        const _resumedPushIds = (typeof window !== "undefined" && window._pt)
          ? Object.keys(window._pt).filter((id) => window._pt[id]?.pausedBySchedule || _pausedPushIds.includes(id))
          : [];
        if (_resumedPushIds.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `▶️ 定时任务完成：${_resumedPushIds.length} 个推图账号恢复，自动重连继续推图`,
            type: "success",
          });
        }
      } catch (e) { /* ignore */ }
      // 重置单账号加速标志
      batchSettings.singleAccountMode = false;
      // ✅ 统一在此处重置 isRunning（不再在子任务 finally 中重置，避免竞态窗口）
      if (isRunning.value) {
        isRunning.value = false;
        currentRunningTokenId.value = null;
      }
    }

    // ✅ 任务完成后，通过统一入口消费队列（延迟 500ms 确保状态完全释放）
    // 即使被 stale 替代也尝试消费（processPendingQueue 内部有 isScheduledTaskRunning 守卫）
    setTimeout(() => processPendingQueue('finally'), 500);

    // ✅ 不在 finally 块中立即触发刷新
    // 改为由调度器 10 秒 tick 统一检查 shouldRefreshAfterTask 并在无任务运行时刷新
    // 这样可以确保所有队列任务都被处理完毕后，才真正刷新页面
  }
};

// ====================
// Bug #5: 统一的 lastTaskExecution 更新函数
// ====================
const updateLastTaskExecution = () => {
  const nowMs = Date.now();
  lastTaskExecution = nowMs;
  // ✅ 使用 currentScheduledTask.id 或 fallback
  const taskId = currentScheduledTask?.id || 'unknown';
  localStorage.setItem(`lastTaskExecution_${taskId}`, nowMs.toString());
};

// 注：boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const checkBoxCount = async () => {
  // 宝箱类型或消耗数量变化时，重新查询背包中对应宝箱的数量
  if (helperType.value !== 'box' && helperType.value !== 'diamondBox') return;

  const token = tokens.value.find(t => t.id === selectedTokens.value[0]);
  if (!token) {
    boxCountInfo.value = null;
    return;
  }

  const boxId = helperType.value === 'diamondBox' ? 2005 : helperSettings.boxType;
  const boxName = boxTypeOptions.find(o => o.value === boxId)?.label || `宝箱(${boxId})`;

  boxCountInfo.value = '查询中...';
  try {
    // 未连接时自动建立连接（已连接则直接复用）
    if (tokenStore.getWebSocketStatus(token.id) !== 'connected') {
      await ensureConnection(token.id);
    }
    const roleRes = await tokenStore.sendMessageWithPromise(
      token.id,
      "role_getroleinfo",
      {},
      batchSettings.defaultCommandTimeout || 5000,
    );
    const items = roleRes?.role?.items || roleRes?.data?.role?.items || {};
    const count = Number(items[boxId]?.quantity || 0);
    boxCountInfo.value = `${boxName} ${count}个`;
  } catch (e) {
    console.error('查询宝箱数量失败:', e);
    boxCountInfo.value = null;
  }
};

const openHelperModal = async (type) => {
  helperType.value = type;

  // 一键开箱功能：提前查询背包中对应宝箱的数量
  if (type === 'box' || type === 'diamondBox') {
    checkBoxCount();
  }

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
  } else if (helperType.value === 'fragmentPack') {
    // 碎片礼包多选开启
    if (!helperSettings.fragmentPackItems || helperSettings.fragmentPackItems.length === 0) {
      message.warning("请至少选择一个碎片礼包");
      return;
    }
    showHelperModal.value = false;
    batchOpenFragmentPacks({ selectedItems: [...helperSettings.fragmentPackItems] });
  } else {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
    showHelperModal.value = false;
    
    // ✅ 单账号智能加速检测
    const availableTokens = selectedTokens.value.filter(id => id !== 'all');
    if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
      batchSettings.singleAccountMode = true;
      const mult = batchSettings.singleAccountMultiplier;
      const token = tokens.value.find(t => t.id === availableTokens[0]);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `✅ 单账号加速模式：${token?.name || '当前账号'}（延迟倍率：${mult * 100}%）`,
        type: "info",
      });
    } else {
      batchSettings.singleAccountMode = false;
    }
    
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

// 梦境购买网格列数（手机端2列，桌面端3列）
const dreamGridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 2;
  return 3;
});

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
      saltFieldPeachFormation: 0, // 盐场阵容：0=跟随当前出战阵容（默认），1-6=指定预设队
      genieFormation: 1, // 灯神挑战阵容（1-6=使用指定预设队，所有势力共用；已取消自动匹配）
      deepSeaFormation: 1, // 深海挑战阵容（1-6=使用指定预设队，独立于灯神，账号设置单独配置）
      bossTimes: 2,
      dailyBossTimes: 3,
      starChallengeAttempts: 3, // ✅ 星级挑战每关最大尝试次数（默认 3 次）
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
      helperPresets: [], // 智能发车预设护卫成员
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
  // 兼容旧设置：缺失字段默认跟随当前出战阵容
  if (currentSettings.saltFieldPeachFormation == null) {
    currentSettings.saltFieldPeachFormation = 0;
  }
  if (currentSettings.genieFormation == null || currentSettings.genieFormation < 1 || currentSettings.genieFormation > 6) {
    currentSettings.genieFormation = 1; // 灯神挑战阵容（1-6 指定预设队，兼容旧值 0/非法值回退阵容 1）
  }
  if (currentSettings.deepSeaFormation == null || currentSettings.deepSeaFormation < 1 || currentSettings.deepSeaFormation > 6) {
    currentSettings.deepSeaFormation = 1; // 深海挑战阵容（1-6 指定预设队，旧账号无此字段时默认阵容 1）
  }
  if (currentSettings.starChallengeAttempts == null) {
    currentSettings.starChallengeAttempts = 3; // ✅ 星级挑战每关最大尝试次数，默认 3 次
  }
  if (!currentSettings.helperPresets) {
    currentSettings.helperPresets = [];
  }
  currentSettings.purchaseDiscounts = initPurchaseDiscounts(currentSettings.purchaseDiscounts);
  settingsHelperMembers.value = []; // 重置护卫成员列表
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
    nightmareFormation: 1,
    saltFieldPeachFormation: 0, // 盐场阵容：0=跟随当前出战阵容
    deepSeaFormation: 1, // 深海挑战阵容（1-6 指定预设队）
    bossTimes: 2,
    dailyBossTimes: 3,
    starChallengeAttempts: 3, // ✅ 星级挑战每关最大尝试次数
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
    nightmareFormation: 1,
    saltFieldPeachFormation: 0, // 盐场阵容：0=跟随当前出战阵容
    deepSeaFormation: 1, // 深海挑战阵容（1-6 指定预设队）
    bossTimes: 2,
    dailyBossTimes: 3,
    starChallengeAttempts: 3, // ✅ 星级挑战每关最大尝试次数
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

// ========== 预设护卫成员功能 ==========

/** 加载俱乐部成员列表（账号单独设置弹窗用） */
const loadSettingsHelperMembers = async () => {
  settingsHelperLoading.value = true;
  try {
    const tokenId = currentSettingsTokenId.value;
    if (!tokenId) {
      message.warning("请先选择账号");
      return;
    }

    // 未连接时自动连接该账号
    const wsStatus = tokenStore.getWebSocketStatus(tokenId);
    if (wsStatus !== "connected") {
      message.info("正在连接账号，请稍候...");
      const connected = await ensureConnection(tokenId, 2);
      if (!connected) {
        message.error("账号连接失败，请检查网络或 token 有效性");
        return;
      }
    }

    const legionRes = await tokenStore.sendMessageWithPromise(tokenId, "legion_getinfo", {}, 10000);
    const membersMap = legionRes?.body?.info?.members || legionRes?.info?.members || {};
    const members = Object.values(membersMap).map((m) => ({
      id: String(m.roleId),
      name: m.name || m.nickname || String(m.roleId),
    }));
    settingsHelperMembers.value = members;
    message.success(`已加载 ${members.length} 名俱乐部成员`);
  } catch (e) {
    message.error(`获取俱乐部成员失败: ${e.message || "未知错误"}`);
  } finally {
    settingsHelperLoading.value = false;
  }
};

/** 切换账号设置预设护卫成员 */
const toggleSettingsHelper = (memberId) => {
  if (!currentSettings.helperPresets) {
    currentSettings.helperPresets = [];
  }
  const idx = currentSettings.helperPresets.indexOf(memberId);
  if (idx >= 0) {
    currentSettings.helperPresets.splice(idx, 1);
  } else {
    currentSettings.helperPresets.push(memberId);
  }
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

// 图鉴升星类型选择
const bookUpgradeTypes = ref(['hero']);
const bookUpgradeOptions = [
  { label: '英雄升星', value: 'hero' },
  { label: '鱼灵升星', value: 'fish' },
  { label: '皮肤升星', value: 'skin' },
];

const executeBookUpgrade = () => {
  if (bookUpgradeTypes.value.length === 0) {
    message.warning('请至少选择一种升星类型');
    return;
  }
  const typeLabels = { hero: '英雄', fish: '鱼灵', skin: '皮肤' };
  const selectedLabels = bookUpgradeTypes.value.map(t => typeLabels[t]).join('+');
  executeManualTaskWithRecord('batchBookUpgrade', `图鉴升星(${selectedLabels})`, () => batchBookUpgrade(bookUpgradeTypes.value));
};

// 盐场桃阵容切换
const handleSwitchSaltFieldPeachFormation = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning('请先选择账号');
    return;
  }

  isRunning.value = true;
  shouldStop.value = false;

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始批量切换盐场蟠桃阵容，共${selectedTokens.value.length}个账号（并发数${batchSettings.maxActive || 5}） ===`, type: "info" });

  const moduleDelay = batchSettings.moduleDelays?.default || batchSettings.taskDelay || 1000;

  const processFormation = async (tokenId) => {
    if (shouldStop.value) return;

    const token = tokens.value.find((t) => t.id === tokenId);
    if (!token) return;

    let connected = false;
    try {
      // 读取账号设置
      const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (!settingsRaw) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 未找到账号设置，跳过`, type: "warning" });
        tokenStatus.value[tokenId] = "failed";
        return;
      }
      const settings = JSON.parse(settingsRaw);
      // 兼容旧设置：缺失字段默认跟随当前出战阵容
      if (settings.saltFieldPeachFormation == null) {
        settings.saltFieldPeachFormation = 0;
        localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
      }
      const formation = settings.saltFieldPeachFormation;
      // 0=跟随当前出战阵容：该按钮是"切换到盐场专用预设队"，跟随当前时无需切换
      if (formation === 0 || formation == null) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 配置为跟随当前出战阵容，无需切换`, type: "success" });
        tokenStatus.value[tokenId] = "completed";
        return;
      }
      if (formation < 1 || formation > 6) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 盐场蟠桃阵容配置无效(${formation})，跳过`, type: "warning" });
        tokenStatus.value[tokenId] = "failed";
        return;
      }

      tokenStatus.value[tokenId] = "running";

      // 连接（skipSlot=true，由runStreaming控制并发）
      await ensureConnection(tokenId, 3, true);
      connected = true;
      await new Promise((r) => setTimeout(r, moduleDelay));

      // 获取当前阵容
      let currentFormation = null;
      try {
        const teamInfo = await tokenStore.sendMessageWithPromise(tokenId, 'presetteam_getinfo', {}, 8000);
        currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
      } catch (e) {
        // 获取失败不阻塞
      }

      // 如果当前阵容已是目标阵容，跳过
      if (currentFormation === formation) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前已是目标阵容${formation}，无需切换`, type: "success" });
        tokenStatus.value[tokenId] = "completed";
        return;
      }

      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前: ${currentFormation ?? '未知'} → 目标: ${formation}，切换中...`, type: "info" });

      // 切换阵容（带重试）
      let switched = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId, 'presetteam_saveteam',
            { teamId: formation }, 8000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换成功: ${currentFormation ?? '?'} → ${formation}`, type: "success" });
          switched = true;
          break;
        } catch (err) {
          const errMsg = err.message || String(err);
          // 200020表示阵容槽未解锁，无需重试
          if (errMsg.includes('200020')) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换失败，当前账号未解锁对应阵容槽`, type: "error" });
            break;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换失败(第${attempt}次): ${errMsg}`, type: "warning" });
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, moduleDelay));
      }

      if (switched) {
        tokenStatus.value[tokenId] = "completed";
      } else {
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 阵容切换失败(已重试3次)`, type: "error" });
        tokenStatus.value[tokenId] = "failed";
      }
    } catch (error) {
      tokenStatus.value[tokenId] = "failed";
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 切换阵容失败: ${error.message}`, type: "error" });
    } finally {
      if (connected) {
        tokenStore.closeWebSocketConnection(tokenId);
      }
    }
  };

  await runStreaming(selectedTokens.value, processFormation);

  const successCount = selectedTokens.value.filter(id => tokenStatus.value[id] === "completed").length;
  const failCount = selectedTokens.value.filter(id => tokenStatus.value[id] === "failed").length;
  const summary = `盐场蟠桃阵容切换完成：${successCount}成功，${failCount}失败`;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
  isRunning.value = false;
};

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
  let result;
  if (filterErrorsOnly.value) {
    result = logs.value.filter((log) => log.type === "error");
  } else {
    result = logs.value;
  }
  // ✅ 性能模式：渲染层仅保留最近200条，降低DOM节点数量与列表diff开销（完整日志仍在 logs 中保留）
  if (performanceMode.value && result.length > 200) {
    return result.slice(-200);
  }
  return result;
});

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// Selection logic
const isAllSelected = computed(() => {
  // 如果有搜索关键词，基于搜索结果判断
  if (debouncedTokenSearchKeyword.value.trim()) {
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
  if (debouncedTokenSearchKeyword.value.trim()) {
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

// ✅ 卡片区域显隐由性能模式统一驱动（原「隐藏卡片详情」独立开关已合并进性能模式）
const performanceMode = ref(localStorage.getItem('batchPerformanceMode') === 'true');
const showCardSections = computed(() => !performanceMode.value);
const showStatusTags = computed(() => showCardSections.value);
const showModuleGrid = computed(() => showCardSections.value);
const showDailyProgress = computed(() => showCardSections.value);
const showMonthlyProgress = computed(() => showCardSections.value);

// ✅ 一键性能模式：同时关闭卡片详情、收起所有展开区、限制日志渲染条数，降低渲染压力
const togglePerformanceMode = () => {
  performanceMode.value = !performanceMode.value;
  localStorage.setItem('batchPerformanceMode', String(performanceMode.value));
  if (performanceMode.value) {
    isTowerExpandedForAll.value = false;
    isCarExpandedForAll.value = false;
    isClimbTowerExpandedForAll.value = false;
    isWeirdTowerExpandedForAll.value = false;
    message.success('⚡ 性能模式已开启：卡片详情已隐藏，日志仅渲染最近200条');
  } else {
    message.info('性能模式已关闭，已恢复卡片详情显示');
  }
};

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
    if (debouncedTokenSearchKeyword.value.trim()) {
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
// ✅ 仅单独连接按钮触发：获取游戏采购清单并同步到本地设置（其他连接路径不获取）
const syncPurchaseFromGame = (tokenId) => {
  setTimeout(async () => {
    try {
      const conn = tokenStore.wsConnections[tokenId];
      if (conn?.status !== 'connected') return;
      const result = await tokenStore.sendMessageWithPromise(tokenId, 'store_getpurchase', {}, 8000);
      // 兼容多种响应结构：直接 purchaseItemList 或嵌套在 store 子对象中
      const purchaseItems = result?.purchaseItemList
        || result?.store?.purchaseItemList
        || result?.data?.purchaseItemList;
      if (purchaseItems?.length > 0) {
        let settings = {};
        try {
          const raw = localStorage.getItem(`daily-settings:${tokenId}`);
          if (raw) settings = JSON.parse(raw);
        } catch (e) {}
        settings.purchaseList = purchaseItems.map(i => i.itemId);
        const discounts = {};
        purchaseItems.forEach(i => { if (i.discount != null) discounts[i.itemId] = i.discount; });
        settings.purchaseDiscounts = discounts;
        const purchaseCnt = result?.purchaseCnt ?? result?.store?.purchaseCnt;
        if (purchaseCnt != null) settings.purchaseCnt = purchaseCnt;
        localStorage.setItem(`daily-settings:${tokenId}`, JSON.stringify(settings));
        console.log(`[采购清单] 单独连接已同步 [${tokenId}]: ${purchaseItems.length}项, 次数${purchaseCnt ?? '未设置'}`);
      }
    } catch (e) {
      console.warn(`[采购清单] 单独连接同步失败 [${tokenId}]: ${e?.message || e}`);
    }
  }, 2000);
};

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
          // 单独连接按钮触发：同步采购清单
          syncPurchaseFromGame(tokenId);
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
                  // 单独连接按钮触发（刷新Token后重连成功）：同步采购清单
                  syncPurchaseFromGame(tokenId);
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
    // ✅ 清理定时任务中对已删除账号的引用
    cleanupInvalidTaskReferences();
    
    message.success(`已删除 ${deletedCount} 个账号`);
  }
  if (failedNames.length > 0) {
    message.error(`${failedNames.length} 个账号删除失败：${failedNames.join(', ')}`);
  }
};

/**
 * 处理新添加的 Token：自动将其添加到所有未开启的定时任务中
 * 当用户通过任意方式（扫码、BIN、手动输入等）添加 Token 时触发
 */
const handleAddedToken = async (newTokenId) => {
  // 关闭弹窗前稍作等待，确保 Token 已完全添加到列表中
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const latestTokens = tokens.value;
  let targetTokenId = newTokenId;
  
  // 如果没有提供 token ID，尝试获取最后添加的一个
  if (!targetTokenId && latestTokens.length > 0) {
    // 找到最近添加的那个（可能根据时间戳或其他标识）
    // 简单做法：获取最后一个
    const lastToken = latestTokens[latestTokens.length - 1];
    if (lastToken) {
      targetTokenId = lastToken.id;
    }
  }
  
  if (!targetTokenId) {
    console.log('未识别新添加的 Token，跳过自动添加到定时任务');
    return;
  }
  
  const tokenToAdd = latestTokens.find(t => t.id === targetTokenId);
  if (!tokenToAdd) {
    console.warn(`找不到 Token: ${targetTokenId}`);
    return;
  }
  
  // ✅ 只在定时任务存在时才处理
  if (scheduledTasks.value.length === 0) {
    console.log('没有定时任务，跳过自动添加');
    return;
  }
  
  let updatedCount = 0;
  for (const task of scheduledTasks.value) {
    // 跳过已关闭的任务
    if (!task.enabled) continue;
    
    // 检查该 token 是否已在任务中
    if (!task.selectedTokens) {
      task.selectedTokens = [];
    }
    
    const alreadyExists = task.selectedTokens.includes(targetTokenId);
    if (alreadyExists) {
      continue; // 已经在列表中，跳过
    }
    
    // 将新 Token 添加到该定时任务
    task.selectedTokens.push(targetTokenId);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `定时任务「${task.name}」自动添加了账号：${tokenToAdd.name}`,
      type: "info"
    });
    updatedCount++;
  }
  
  // 保存修改后的定时任务
  if (updatedCount > 0) {
    saveScheduledTasks();
    message.success(`已将新账号添加到 ${updatedCount} 个定时任务中`);
  } else {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `新账号「${tokenToAdd.name}」未添加到任何定时任务（所有任务已包含或已关闭）`,
      type: "warning"
    });
  }
};

// 添加 Token 弹窗状态
const showAddTokenModal = ref(false);
const addTokenImportMethod = ref("singlebin");

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
  newGroupSelectedTokens.value = filteredGroupTokens.value.map(t => t.id);
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
    // 从批量删除选中列表中移除
    const idx = batchDeleteSelectedGroupIds.value.indexOf(groupId);
    if (idx !== -1) batchDeleteSelectedGroupIds.value.splice(idx, 1);
    message.success("分组已删除");
  }
};

/**
 * 切换单个分组的批量删除选中状态
 */
const toggleBatchDeleteGroupSelection = (groupId, checked) => {
  if (checked) {
    if (!batchDeleteSelectedGroupIds.value.includes(groupId)) {
      batchDeleteSelectedGroupIds.value.push(groupId);
    }
  } else {
    const idx = batchDeleteSelectedGroupIds.value.indexOf(groupId);
    if (idx !== -1) batchDeleteSelectedGroupIds.value.splice(idx, 1);
  }
};

/**
 * 全选/取消全选分组
 */
const toggleSelectAllGroups = (checked) => {
  if (checked) {
    batchDeleteSelectedGroupIds.value = tokenGroups.value.map(g => g.id);
  } else {
    batchDeleteSelectedGroupIds.value = [];
  }
};

/**
 * 批量删除分组
 */
const batchDeleteGroups = () => {
  if (batchDeleteSelectedGroupIds.value.length === 0) return;
  const count = batchDeleteSelectedGroupIds.value.length;
  batchDeleteSelectedGroupIds.value.forEach(groupId => {
    tokenStore.deleteTokenGroup(groupId);
  });
  batchDeleteSelectedGroupIds.value = [];
  message.success(`已删除 ${count} 个分组`);
};

// 打开分组管理弹窗时清除选中状态
watch(showGroupManageModal, (val) => {
  if (val) batchDeleteSelectedGroupIds.value = [];
});

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
const exportGroups = async () => {
  const result = await tokenStore.exportTokenGroups();
  if (result) {
    message.success("分组导出成功");
  } else {
    message.error("分组导出失败");
  }
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

// 监听 tokenStore 全局日志（云端恢复等），转发到 UI 执行日志
const _globalLogProcessed = ref(new Set());
watch(
  () => tokenStore.globalLogs.length,
  () => {
    const gLogs = tokenStore.globalLogs;
    if (!gLogs || !gLogs.length) return;
    for (const gLog of gLogs) {
      if (!_globalLogProcessed.value.has(gLog.id)) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: gLog.message,
          type: gLog.type === "error" ? "error" : gLog.type === "warn" ? "warning" : "info",
        });
        _globalLogProcessed.value.add(gLog.id);
      }
    }
  },
  { immediate: true }
);

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
 * @param {number} [maxConcurrent] - 可选，指定并发数（定时任务级并发控制）
 */
const ACCOUNT_STUCK_TIMEOUT = 25 * 60 * 1000; // 25分钟单账号超时

const runStreaming = async (tokenIds, processFn, maxConcurrent) => {
  // ✅ 优先使用传入的并发数（定时任务级），否则使用全局设置
  const effectiveMaxConcurrent = maxConcurrent || batchSettings.maxActive || 5;
  const queue = [...tokenIds];
  const running = new Set();
  let completedCount = 0;

  const launchNext = () => {
    if (queue.length === 0 || shouldStop.value) return;
    const tokenId = queue.shift();
    const token = tokens.value.find(t => t.id === tokenId);
    let timeoutId;
    const p = Promise.race([
      processFn(tokenId),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏱️ ${token?.name || tokenId} 执行超过25分钟，强制超时`,
            type: "warning",
          });
          // 关闭 WebSocket 连接，使正在等待响应的 sendWithPromise 立即报错
          try { tokenStore.closeWebSocketConnection(tokenId); } catch {}
          // 释放连接槽位，防止槽位泄漏
          try { releaseConnectionSlot(); } catch {}
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = '单账号执行超时（25分钟）';
          reject(new Error(`账号 ${token?.name || tokenId} 执行超时（25分钟）`));
        }, ACCOUNT_STUCK_TIMEOUT);
      })
    ])
      .catch((err) => {
        // ✅ 修复：确保异常时 tokenStatus 被正确设置，避免误判
        const currentStatus = tokenStatus.value[tokenId];
        if (currentStatus !== 'completed' && currentStatus !== 'failed') {
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = err?.message || '执行异常';
        }
      })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
        running.delete(p);
        completedCount++;
      });
    running.add(p);
  };

  // 启动初始批次
  for (let i = 0; i < Math.min(effectiveMaxConcurrent, queue.length); i++) {
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
    // ✅ 修复：找出未处理的Token（包括 waiting、undefined 和可能卡住的 running 状态）
    const remaining = tokenIds.filter(id => {
      const status = tokenStatus.value[id];
      return status === 'waiting' || status === undefined || status === 'running';
    });
    for (const tokenId of remaining) {
      try {
        const currentStatus = tokenStatus.value[tokenId];
        // 如果是 running 状态，可能是卡住了，标记为 failed
        if (currentStatus === 'running') {
          console.warn(`[runStreaming] Token ${tokenId} 状态为 running，可能卡住，标记为 failed`);
          tokenStatus.value[tokenId] = "failed";
          tokenFailReasons.value[tokenId] = '执行卡住，状态未更新';
          continue;
        }
        await processFn(tokenId).catch((err) => {
          // ✅ 确保异常时 tokenStatus 被正确设置
          const status = tokenStatus.value[tokenId];
          if (status !== 'completed' && status !== 'failed') {
            tokenStatus.value[tokenId] = "failed";
            tokenFailReasons.value[tokenId] = err?.message || '执行异常';
          }
        });
      } catch (e) {
        console.error(`[runStreaming] 补充处理 ${tokenId} 失败:`, e);
      }
    }
  }
};

const ensureConnection = async (tokenId, maxRetries = 3, skipSlot = false) => {
  let retryCount = 0;
  let lastError = null;
  let slotAcquired = false; // ✅ 跟踪槽位持有状态，防止未获取就释放导致连接池计数错乱
  let tokenRefreshed = false; // ✅ 跟踪本轮是否已尝试刷新 Token，避免反复刷新浪费接口配额

  while (retryCount < maxRetries) {
    // ✅ 用户中途停止时立即退出，避免无效的长时间等待
    if (shouldStop.value) {
      throw new Error('任务已停止');
    }

    try {
      const latestToken = tokens.value.find((t) => t.id === tokenId);
      if (!latestToken) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      // 获取连接槽位来限制并发数（skipSlot=true时由外层滚动执行控制并发）
      if (!skipSlot && !slotAcquired) {
        await waitForConnectionSlot(60000);
        slotAcquired = true;
      }

      // 检查现有连接状态
      const connection = tokenStore.wsConnections[tokenId];
      if (connection && connection.status === 'connected') {
        return true;
      }

      // 先关闭可能存在的旧连接
      if (connection) {
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
        // 连接成功后延迟3-5秒，确保连接稳定
        const connectionDelay = 3000 + Math.random() * 2000; // 3-5秒随机延迟
        await new Promise(resolve => setTimeout(resolve, connectionDelay));

        // ✅ 深度精简：不再在连接时统一获取 role_getroleinfo / fight_startlevel
        // 战斗命令所需的 randomSeed/battleVersion 已改为在 tokenStore.sendMessageWithPromise 中懒加载，
        // 各功能只产生自身需要的API调用

        return true;
      }

      throw new Error('连接超时');

    } catch (error) {
      lastError = error;
      retryCount++;

      // ✅ 修复：只释放已获取的槽位（原逻辑无条件释放，若失败发生在获取槽位之前会造成虚假释放，破坏连接池计数）
      if (!skipSlot && slotAcquired) {
        releaseConnectionSlot();
        slotAcquired = false;
      }

      // 关闭可能存在的连接
      tokenStore.closeWebSocketConnection(tokenId);

      // ✅ 新增：首次连接失败时尝试刷新 Token 后再连接
      // 策略：仅在第一次失败（retryCount === 1）时尝试刷新一次，
      //       利用 tokenStore.attemptTokenRefresh 的 URL/BIN/手动三种刷新通道，
      //       很多"连接超时"实际是 Token 过期导致，新 Token 可显著提高重连成功率
      // 复用 attemptTokenRefresh 内置保护：refreshingTokenIds 防重复 + 10-20秒冷却 + 最多3次内部重试
      if (retryCount === 1 && maxRetries > 1 && !tokenRefreshed) {
        tokenRefreshed = true;
        const tokenInfo = tokens.value.find((t) => t.id === tokenId);
        const tokenName = tokenInfo?.name || tokenId;
        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `🔄 连接失败(${error.message})，尝试自动刷新 Token: ${tokenName}`,
            type: "warning",
          });
          const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);

          // 用户中途停止时立即中断
          if (shouldStop.value) {
            throw new Error('任务已停止');
          }

          if (refreshSuccess) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ Token刷新成功，准备立即重连: ${tokenName}`,
              type: "success",
            });
            // 等待 2 秒让新 Token 在客户端生效，跳过阶梯退避直接进入下一轮重试
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ Token刷新失败，按原计划阶梯退避重试: ${tokenName}`,
              type: "warning",
            });
          }
        } catch (refreshErr) {
          // 任务停止信号：直接抛出，保留 shouldStop 状态
          if (refreshErr?.message === '任务已停止') throw refreshErr;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⚠️ Token刷新出错(${refreshErr?.message || refreshErr})，继续原重试逻辑: ${tokenName}`,
            type: "warning",
          });
        }
      }

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
        // 分段等待以便及时响应 shouldStop
        const checkInterval = 1000;
        for (let waited = 0; waited < waitTime; waited += checkInterval) {
          if (shouldStop.value) break;
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
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
  tokenFailReasons,
  isRunning,
  shouldStop,
  ensureConnection,
  releaseConnectionSlot,
  runStreaming,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog: (log) => {
    addLog(log);
    // 自动捕获失败原因：从日志消息中提取失败信息
    if (log.type === 'error' && log.message) {
      const msg = log.message;
      const failIdx = msg.indexOf('失败');
      if (failIdx !== -1) {
        for (const tokenId of selectedTokens.value) {
          const token = tokens.value.find(t => t.id === tokenId);
          if (token && msg.includes(token.name)) {
            const afterFail = msg.substring(failIdx);
            const colonMatch = afterFail.match(/失败[：:]\s*/);
            if (colonMatch) {
              const reason = afterFail.substring(colonMatch.index + colonMatch[0].length).trim();
              if (reason) {
                tokenFailReasons.value[tokenId] = reason.substring(0, 100);
              }
            } else if (!tokenFailReasons.value[tokenId]) {
              tokenFailReasons.value[tokenId] = afterFail.substring(2).trim().substring(0, 100) || '执行失败';
            }
            break;
          }
        }
      }
    }
  },
  message,
  currentRunningTokenId,
  // 延迟配置 - 统一使用 delayManager 的延迟分组
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 功能模块延迟配置（保留用于向后兼容）
  moduleDelays: batchSettings.moduleDelays,
  // 延迟分组配置（新统一系统）
  delayGroups: batchSettings.delayGroups,
  // 获取模块延迟的辅助函数（使用集中式 delayManager）
  getModuleDelay: (moduleName) => {
    return getModuleDelay(moduleName, batchSettings);
  },
  // 安全延迟函数（支持中途停止）
  safeDelay: async (ms, checkInterval = 100) => {
    const endTime = Date.now() + ms;
    while (Date.now() < endTime && !shouldStop.value) {
      await new Promise((r) => setTimeout(r, Math.min(checkInterval, endTime - Date.now())));
    }
    return !shouldStop.value;
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

// 包装函数：为单独执行的功能添加用时显示
const wrapTaskFunctions = (obj) => {
  const wrapped = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'function') {
      wrapped[key] = async (...args) => {
        const startTime = Date.now();
        try {
          const result = await val(...args);
          const elapsed = Date.now() - startTime;
          const elapsedStr = elapsed >= 60000
            ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
            : `${(elapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `✅ 功能执行完成，用时: ${elapsedStr}`,
            type: "success",
          });
          return result;
        } catch (error) {
          const elapsed = Date.now() - startTime;
          const elapsedStr = elapsed >= 60000
            ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
            : `${(elapsed / 1000).toFixed(1)}秒`;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `❌ 功能执行异常，已用时: ${elapsedStr}，错误: ${error.message}`,
            type: "error",
          });
          throw error;
        }
      };
    } else {
      wrapped[key] = val;
    }
  }
  return wrapped;
};

// 初始化任务模块
const tasksHangUp = wrapTaskFunctions(createTasksHangUp(createTaskDeps()));
const { claimHangUpRewards, batchAddHangUpTime, batchStudy, batchStudyClaimReward, batchclubsign, batchLegionSignup, batchClubSignup, batchAirdropChallenge, batchAirdropClaim, batchPayloadSignup, batchWarGuessCheer, batchHangUpUpgrade } = tasksHangUp;

const tasksBottle = wrapTaskFunctions(createTasksBottle(createTaskDeps()));
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = wrapTaskFunctions(createTasksTower(createTaskDeps()));
const { climbTower, climbWeirdTower, batchClaimFreeEnergy, skinChallenge, skinTreasure, newSkinChallenge, newSkinTreasure, batchUseItems, batchMergeItems } = tasksTower;

const tasksCar = wrapTaskFunctions(createTasksCar(createTaskDeps()));
const { batchSmartSendCar, batchClaimCars, batchCarResearchUpgrade } = tasksCar;

const tasksSaltField = wrapTaskFunctions(createTasksSaltField(createTaskDeps()));
const { batchSaltFieldDig } = tasksSaltField;

const tasksClub = wrapTaskFunctions(createTasksClub(createTaskDeps()));
const { batchCampChallenge } = tasksClub;

const tasksItem = wrapTaskFunctions(createTasksItem(createTaskDeps()));
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

// 账号选择器（只做选择，不直接控制推图）
const pushSelectedTokens = ref([]);

// 推图卡片列表（独立管理，持久化到 localStorage）
const _savedPushCards = localStorage.getItem('pushCards');
const pushCards = ref(_savedPushCards ? JSON.parse(_savedPushCards) : []);

// 监听卡片列表变化，自动持久化
watch(pushCards, (v) => {
  localStorage.setItem('pushCards', JSON.stringify(v));
}, { deep: true });

// 监听账号选择器变化（用于临时选择，不影响推图列表）
watch(pushSelectedTokens, (v) => {
  // 可以保存到 localStorage 以便恢复
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
  if (!pushTorchType.value || !pushCards.value.length) return;
  if (typeof window._bpUseTorch === "function") {
    for (const card of pushCards.value) {
      await window._bpUseTorch(card.id);
    }
  }
};

const pushLogs = ref([]);
const pushLogsCollapsed = ref(false);
let _pushCheckTimer = null;

// 账号选项（只显示已连接的）
const pushTokenOptions = computed(() => {
  const tkList = tokens.value;
  if (!tkList || !Array.isArray(tkList)) return [];
  return tkList.map(t => {
    const st = tokenStore.getWebSocketStatus(t.id);
    const tag = st === "connected" ? " ✅" : st === "connecting" ? " ⏳" : " ⚪";
    return { label: shortName(t.name || t.id) + tag, value: t.id };
  });
});

// 打开推图模态框时自动恢复状态
watch(showPushMapModal, (v) => {
  if (v) {
    // 恢复正在运行的推图状态（从 window._pt 中恢复）
    if (window._pt) {
      const runningIds = Object.keys(window._pt).filter(id => window._pt[id] && window._pt[id].running);
      if (runningIds.length > 0) {
        // 合并已运行的 Token 到卡片列表（如果不在列表中）
        const existingIds = new Set(pushCards.value.map(c => c.id));
        runningIds.forEach(id => {
          if (!existingIds.has(id)) {
            const tk = tokens.value.find(t => t.id === id);
            const wsStatus = tokenStore.getWebSocketStatus(id);
            pushCards.value.push({
              id,
              name: tk ? tk.name : id,
              running: true,
              level: window._pt[id].level || 0,
              wins: window._pt[id].wins || 0,
              losses: window._pt[id].losses || 0,
              countdown: window._pt[id].countdown || 0,
              totalTime: window._pt[id].totalTime || 0,
              bossNm: "",
              wsStatus,
            });
          }
        });
      }
    }
    // 如果没有卡片且全局有选中 Token，使用全局的
    if (!pushCards.value.length && selectedTokens.value?.length) {
      pushCards.value = selectedTokens.value.map(id => {
        const tk = tokens.value.find(t => t.id === id);
        const wsStatus = tokenStore.getWebSocketStatus(id);
        return {
          id,
          name: tk ? tk.name : id,
          running: false,
          level: 0,
          wins: 0,
          losses: 0,
          countdown: 0,
          totalTime: 0,
          bossNm: "",
          wsStatus,
        };
      });
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
  // 从 pushCards 中获取账号 ID 列表（而不是 pushSelectedTokens）
  const ids = pushCards.value.map(c => c.id);
  const getBoss = window._getBoss || (() => "");
  
  // 更新现有卡片的状态
  pushCards.value = ids.map(id => {
    const st = window._pt[id] || {};
    const tk = tokens.value.find(t => t.id === id);
    const wsStatus = tokenStore.getWebSocketStatus(id);
    return {
      id, name: tk ? tk.name : id,
      running: !!st.running, level: st.level || 0,
      wins: st.wins || 0, losses: st.losses || 0,
      countdown: st.countdown || 0, totalTime: st.totalTime || 0,
      bossNm: getBoss(st.level || 0),
      wsStatus,
    };
  });
};

// 将选中的账号添加到推图列表
const addTokensToPushList = () => {
  if (!pushSelectedTokens.value.length) return;
  
  // 获取当前已有的 ID 列表
  const existingIds = new Set(pushCards.value.map(c => c.id));
  
  // 添加新的账号（去重）
  pushSelectedTokens.value.forEach(id => {
    if (!existingIds.has(id)) {
      const tk = tokens.value.find(t => t.id === id);
      const wsStatus = tokenStore.getWebSocketStatus(id);
      pushCards.value.push({
        id,
        name: tk ? tk.name : id,
        running: false,
        level: 0,
        wins: 0,
        losses: 0,
        countdown: 0,
        totalTime: 0,
        bossNm: "",
        wsStatus,
      });
    }
  });
  
  // 清空选择器
  pushSelectedTokens.value = [];
};

// 从推图列表中移除账号
const removeTokenFromPushList = (tokenId) => {
  // 先停止该账号的推图
  if (window._bpStopOne) {
    window._bpStopOne(tokenId);
  }
  // 从列表中移除
  pushCards.value = pushCards.value.filter(c => c.id !== tokenId);
};

// 清空全部推图列表
const clearAllPushCards = () => {
  // 先停止所有账号的推图
  pushCards.value.forEach(card => {
    if (window._bpStopOne) {
      window._bpStopOne(card.id);
    }
  });
  // 清空列表
  pushCards.value = [];
};

// 定时刷新状态
const _startPushCheck = () => {
  if (_pushCheckTimer) return;
  _pushCheckTimer = setInterval(() => {
    if (!window._pt) { isAnyPushRunning.value = false; return; }
    // 检查卡片列表中是否有正在运行的账号
    isAnyPushRunning.value = pushCards.value.some(c => window._pt[c.id] && window._pt[c.id].running);
    if (showPushMapModal.value) _refreshPushCards();
  }, 1000);  // 1秒刷新一次，让倒计时显示更流畅
};
_startPushCheck();

// 全部开始（错开启动避免限流：根据账号数量动态调整间隔）
const pushStartAll = async () => {
  // 从卡片列表中获取账号（而不是选择器）
  const ids = pushCards.value.map(c => c.id);
  if (!ids || !ids.length) return;
  if (!window._pt) window._pt = {};
  if (window._bpLoadBossData) await window._bpLoadBossData();

  // 根据账号数量动态调整间隔：
  // - 1-10个账号：3-5秒间隔
  // - 11-30个账号：2-4秒间隔
  // - 31个以上：1-3秒间隔（避免总时间过长）
  const count = ids.length;
  let minDelay, maxDelay;
  if (count <= 10) {
    minDelay = 3000; maxDelay = 5000;
  } else if (count <= 30) {
    minDelay = 2000; maxDelay = 4000;
  } else {
    minDelay = 1000; maxDelay = 3000;
  }

  // 使用_bpStartOne（内含自动连接逻辑），错开启动避免瞬时并发
  if (window._bpStartOne) {
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      if (!window._pt || !window._pt[id] || !window._pt[id].running) {
        window._bpStartOne(id);
        // 动态间隔 + 随机延迟，错开每个账号的执行
        if (idx < ids.length - 1) {  // 最后一个不需要等待
          const staggerDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
          await new Promise(r => setTimeout(r, staggerDelay));
        }
      }
    }
  }
};

// 全部停止
const pushStopAll = (stopAll = false) => {
  if (!window._pt) return;
  // stopAll=true 时（定时触发）：停止所有正在运行的账号，而不仅限于卡片列表
  // stopAll=false 时（按钮手动）：只停止 pushCards 中的账号
  const ids = stopAll
    ? Object.keys(window._pt).filter(id => window._pt[id]?.running)
    : pushCards.value.map(c => c.id);
  if (!ids.length) return;
  ids.forEach(id => {
    if (window._bpStopOne) window._bpStopOne(id);
    else if (window._pt[id]) window._pt[id].stopFlag = true;
  });
  // 定时停止时延迟 5 秒断开 WebSocket 连接，给 pushLoop 时间检测 stopFlag 并优雅退出
  if (stopAll && ids.length) {
    console.log(`[定时停止] 已向 ${ids.length} 个账号发送停止指令，5秒后断开连接`);
    const stopIds = [...ids]; // 快照，避免 ids 引用在异步前被修改
    setTimeout(() => {
      stopIds.forEach(id => {
        // 只关闭仍在推图的连接（pushLoop 退出后 running 会变 false）
        if (window._pt && window._pt[id] && window._pt[id].running) {
          // pushLoop 仍在运行，先强制标记停止
          window._pt[id].running = false;
        }
        try {
          tokenStore.closeWebSocketConnection(id);
        } catch (e) {
          console.warn(`[定时停止] 延迟断开连接失败: ${id}`, e);
        }
      });
      console.log(`[定时停止] 延迟断开完成，共处理 ${stopIds.length} 个账号`);
    }, 5000);
  }
};

// ===================== 定时控制模块 =====================
const pushTimerExpanded = ref(false);

// 时间值（毫秒时间戳，只取时分，n-time-picker 返回当天的 ms 时间戳）
const pushStartTime = ref(null);
const pushStopTime  = ref(null);

// 定时器句柄
const pushStartTimer = ref(null);   // setInterval 句柄
const pushStopTimer  = ref(null);

// 倒计时显示
const pushTimerCountdown = ref('');
let _pushCountdownInterval = null;

// 状态：idle / running（有任意定时器激活就是 running）
const pushTimerStatus = computed(() =>
  (pushStartTimer.value || pushStopTimer.value) ? 'running' : 'idle'
);

// 时间选项（整点分钟，每10分钟一档）
const pushTimeHours   = Array.from({ length: 24 }, (_, i) => i);
const pushTimeMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** 把 n-time-picker 返回的 ms 时间戳转成本地 HH:mm（用 Date 本地方法，避免时区偏移） */
const msToHHMM = (ms) => {
  if (ms == null) return '';
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const pushStartTimeLabel = computed(() => msToHHMM(pushStartTime.value));
const pushStopTimeLabel  = computed(() => msToHHMM(pushStopTime.value));

/** 计算距离目标时间还有多少 ms（均用本地时间对比） */
const msUntilTarget = (targetMs) => {
  const now = new Date();
  // targetMs 是 n-time-picker 返回的本地时间戳，取其本地时分秒
  const t = new Date(targetMs);
  const targetSec = t.getHours() * 3600 + t.getMinutes() * 60;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let diff = (targetSec - nowSec) * 1000;
  if (diff <= 0) diff += 24 * 3600 * 1000;  // 跨日
  return diff;
};

/** 格式化倒计时 */
const formatCountdown = (ms) => {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2,'0')}s`;
  return `${s}s`;
};

/** 更新倒计时文字（每秒刷新，显示最近触发的那个） */
const _updateCountdown = () => {
  const targets = [];
  if (pushStartTimer.value && pushStartTime.value != null)
    targets.push({ label: '开始', ms: msUntilTarget(pushStartTime.value) });
  if (pushStopTimer.value && pushStopTime.value != null)
    targets.push({ label: '停止', ms: msUntilTarget(pushStopTime.value) });
  if (!targets.length) { pushTimerCountdown.value = ''; return; }
  targets.sort((a, b) => a.ms - b.ms);
  const nearest = targets[0];
  pushTimerCountdown.value = `${nearest.label} ${formatCountdown(nearest.ms)}`;
};

/** 启动/取消 开始定时 */
/** 内部：注册下一次开始定时（每天循环） */
const _scheduleNextStart = () => {
  if (pushStartTime.value == null) return;
  const delay = msUntilTarget(pushStartTime.value);
  pushStartTimer.value = setTimeout(async () => {
    window.$message?.success(`定时触发：自动开始推图`);
    await pushStartAll();
    _scheduleNextStart();   // 循环：注册明天同一时刻
    _updateCountdown();
  }, delay);
};

/** 内部：注册下一次停止定时（每天循环） */
const _scheduleNextStop = () => {
  if (pushStopTime.value == null) return;
  const delay = msUntilTarget(pushStopTime.value);
  pushStopTimer.value = setTimeout(() => {
    window.$message?.warning(`定时触发：自动停止推图`);
    pushStopAll(true);      // 停止所有正在运行的账号
    _scheduleNextStop();    // 循环：注册明天同一时刻
    _updateCountdown();
  }, delay);
};

/** 启动/取消 开始定时 */
const togglePushStartTimer = () => {
  if (pushStartTimer.value) {
    clearTimeout(pushStartTimer.value);
    pushStartTimer.value = null;
    window.$message?.info('已取消自动开始定时');
    _updateCountdown();
    return;
  }
  if (pushStartTime.value == null) return;
  _scheduleNextStart();
  const delay = msUntilTarget(pushStartTime.value);
  window.$message?.success(`已设置 ${pushStartTimeLabel.value} 每天自动开始推图（${formatCountdown(delay)}后首次触发）`);
  _updateCountdown();
};

/** 启动/取消 停止定时 */
const togglePushStopTimer = () => {
  if (pushStopTimer.value) {
    clearTimeout(pushStopTimer.value);
    pushStopTimer.value = null;
    window.$message?.info('已取消自动停止定时');
    _updateCountdown();
    return;
  }
  if (pushStopTime.value == null) return;
  _scheduleNextStop();
  const delay = msUntilTarget(pushStopTime.value);
  window.$message?.success(`已设置 ${pushStopTimeLabel.value} 每天自动停止推图（${formatCountdown(delay)}后首次触发）`);
  _updateCountdown();
};

// 每秒刷新倒计时
_pushCountdownInterval = setInterval(_updateCountdown, 1000);

// 定时器与弹窗生命周期无关，关闭弹窗后仍继续倒计，到时自动触发推图开始/停止
// ===================== 定时控制模块 END =====================

// 全选/取消全选
const pushSelectAll = () => {
  const allIds = pushTokenOptions.value.map(o => o.value);
  pushSelectedTokens.value = [...allIds];
};
const pushClearAll = () => {
  pushSelectedTokens.value = [];
  pushGroupSelected.value = [];
};

// 推图弹窗分组快捷选择
const pushGroupSelected = ref([]);
const pushGroupCollapsed = ref(false);
const pushSelectByGroup = (groupId) => {
  const idx = pushGroupSelected.value.indexOf(groupId);
  const groupTokenIds = getValidGroupTokenIds(groupId);
  if (idx >= 0) {
    // 取消选中：从 pushSelectedTokens 移除该分组的所有 token
    pushGroupSelected.value.splice(idx, 1);
    pushSelectedTokens.value = pushSelectedTokens.value.filter(id => !groupTokenIds.includes(id));
  } else {
    // 选中：将该分组的 token 合并进 pushSelectedTokens
    pushGroupSelected.value.push(groupId);
    const existing = new Set(pushSelectedTokens.value);
    groupTokenIds.forEach(id => existing.add(id));
    pushSelectedTokens.value = [...existing];
  }
};

// 标签式账号选择器：搜索、过滤、切换、显示名
const pushSearchQuery = ref('');
const filteredPushOptions = computed(() => {
  if (!pushSearchQuery.value) return pushTokenOptions.value;
  const q = pushSearchQuery.value.toLowerCase();
  return pushTokenOptions.value.filter(opt => opt.label.toLowerCase().includes(q));
});
const togglePushAccount = (tokenId) => {
  const idx = pushSelectedTokens.value.indexOf(tokenId);
  if (idx >= 0) {
    pushSelectedTokens.value.splice(idx, 1);
  } else {
    pushSelectedTokens.value.push(tokenId);
  }
};
const shortName = (name) => {
  if (!name) return name;
  return name.replace(/-\d+$/, '');
};
const getTokenDisplayName = (tokenId) => {
  const opt = pushTokenOptions.value.find(o => o.value === tokenId);
  return opt ? shortName(opt.label.replace(/[✅⏳⚪]/g, '').trim()) : tokenId.slice(0, 8);
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

const tasksDungeon = wrapTaskFunctions(createTasksDungeon(createTaskDeps()));
const { batchbaoku13, batchbaoku45, batchmengjing, batchBuyDreamItems, batchGenieChallenge, batchDeepSeaChallenge } = tasksDungeon;

const tasksArena = wrapTaskFunctions(createTasksArena(createTaskDeps()));
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = wrapTaskFunctions(createTasksStore(createTaskDeps()));
const { legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, manual_buy, collection_exchange, charge_claimaddup_rewards, collection_claimfreereward, claim_recruit_welfare, claim_weird_tower_all, claim_weird_tower_pass, use_spotted_egg, claim_pet_book, batch_pet_merge, egg_merge_cycle, batch_pet_upgrade, gacha_drawreward, store_buy_selectable, batchCollectionExchange, legion_buy_red_jade, legion_buy_spotted_egg, salt_crystal_shop_buy, saltCrystalShopConfig, apex_buy, apexShopConfig, salt_ingot_shop_buy, saltIngotShopConfig, star_drawturntable, batch_star_challenge, nightmare_draw_lottery, nightmare_claim_book_reward, pkroom_appoint, claim_guess_coin, legion_buy_store_items, weeklyMarketBuy, weekly_market_free_gift, batch_mail_claim_and_cleanup, saltcup26_openstarpack_use, batchSaltCupBet, getSaltCupBetInfo, batchApexGuess, batchApexGuessClaim, batchSaltRoadCheer } = tasksStore;

// ✅ 定时任务函数名映射表（替代 eval()，解决生产构建中 eval 无法访问组件局部变量的问题）
// 任务函数映射表
// ⚠️ 不能依赖 eval(functionName) 兜底：生产构建经混淆后所有标识符都被重命名，
//   eval("resetBottles") 这类调用必然取不到函数，定时任务会误报"函数不存在，跳过执行"。
//   因此这里展开各任务模块，改为按属性名查找（对象属性名不受混淆影响）。
const taskFunctionMap = {
  // 整模块展开：后续新增任务函数无需再手工维护本表，也避免逐个遗漏
  ...tasksClub,
  ...tasksHangUp,
  ...tasksBottle,
  ...tasksTower,
  ...tasksCar,
  ...tasksSaltField,
  ...tasksItem,
  ...tasksDungeon,
  ...tasksArena,
  ...tasksStore,
  // 非模块化的独立函数
  manual_buy,
  collection_exchange,
  legion_storebuygoods,
  legionStoreBuySkinCoins,
  store_purchase,
  charge_claimaddup_rewards,
  collection_claimfreereward,
  claim_recruit_welfare,
  claim_weird_tower_all,
  claim_weird_tower_pass,
  use_spotted_egg,
  claim_pet_book,
  batch_pet_merge,
  egg_merge_cycle,
  batch_pet_upgrade,
  gacha_drawreward,
  store_buy_selectable,
  batchCollectionExchange,
  legion_buy_red_jade,
  legion_buy_spotted_egg,
  salt_crystal_shop_buy,
  salt_ingot_shop_buy,
  star_drawturntable,
  batch_star_challenge,
  nightmare_draw_lottery,
  nightmare_claim_book_reward,
  pkroom_appoint,
  claim_guess_coin,
  legion_buy_store_items,
  weeklyMarketBuy,
  weekly_market_free_gift,
  batch_mail_claim_and_cleanup,
  saltcup26_openstarpack_use,
  batchSaltCupBet,
  getSaltCupBetInfo,
  batchApexGuess,
  batchApexGuessClaim,
  batchSaltRoadCheer,
  // tasksHangUp 函数
  batchLegionSignup,
  batchClubSignup,
  // tasksDungeon 函数
  batchbaoku13,
  batchbaoku45,
  batchmengjing,
  batchBuyDreamItems,
  // tasksArena 函数
  batcharenafight,
  batchTopUpFish,
  batchTopUpArena,
  // tasksSaltField 函数
  batchSaltFieldDig,
};

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

// 珍宝阁商店购买 Modal State
const showCollectionExchangeModal = ref(false);
const collectionExchangeConfig = ref([]);

// 珍宝阁商店商品选项（goodsId/限购次数）
const collectionExchangeItemOptions = [
  { label: "铂金宝箱", value: 7001, maxCount: 3 },
  { label: "军团币", value: 4001, maxCount: 2 },
  { label: "招募令", value: 5001, maxCount: 1 },
  { label: "万能红将碎片", value: 6001, maxCount: 10 },
];

// 黑市多选购买网格列数（手机端1列，桌面端2列）
const gridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

// 定时任务弹窗网格列数（手机端1列，桌面端2列）
const taskGridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

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

const openCollectionExchangeModal = () => {
  // 从已保存的配置恢复勾选状态
  const savedItems = batchSettings.collectionExchangeItems || [];
  collectionExchangeConfig.value = collectionExchangeItemOptions.map(item => {
    const saved = savedItems.find(s => s.goodsId === item.value);
    return {
      ...item,
      _checked: !!saved && saved.count > 0,
      count: saved ? saved.count : 0,
    };
  });
  showCollectionExchangeModal.value = true;
};

const executeCollectionExchange = () => {
  const selectedItems = collectionExchangeConfig.value
    .filter(item => item._checked && item.count > 0)
    .map(item => ({
      goodsId: item.value,
      name: item.label,
      count: item.count,
    }));
  
  if (selectedItems.length === 0) {
    message.warning("请至少选择一个商品");
    return;
  }
  
  // 保存配置到 batchSettings，供定时任务使用
  batchSettings.collectionExchangeItems = selectedItems;
  saveBatchSettings();
  
  showCollectionExchangeModal.value = false;
  batchCollectionExchange(selectedItems);
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

const tasksLegacy = wrapTaskFunctions(createTasksLegacy(createTaskDeps()));
const { batchLegacyClaim, batchLegacyHangup, batchLegacyGiftSendEnhanced, batchLegacyClaimGiftTask } = tasksLegacy;

// tasksLegacy 定义在 taskFunctionMap 之后（存在暂时性死区，不能在表内直接展开），
// 故在此补登记，使其函数同样可按名查到，不依赖混淆后会失效的 eval
Object.assign(taskFunctionMap, tasksLegacy);

// ====== 十殿阀罗挑战（弹窗打开组队界面） ======
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
const batchNightmareChallengePresets = async (silent, taskRecordIndex = -1) => {
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
    // ✅ BUG修复：预设不存在时清零 runningCount，避免任务记录进度永远无法完成
    if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
      taskExecutionRecords.value[taskRecordIndex].runningCount = 0;
    }
    return;
  }

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 十殿阎罗挑战：开始执行 ${presets.length} 个预设 ===`, type: 'info' });

  // 计算所有预设的成员总数（用于任务完成度统计）
  // ✅ BUG修复：改为按预设累加计数，与 onComplete/onError 的按预设计数口径一致
  // （原先用唯一成员数，共享队员会被每个预设重复计入 success/fail，导致进度超过100%、runningCount 变负）
  let totalMembers = 0;
  for (const p of presets) {
    totalMembers += (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length;
  }

  // 更新任务记录：设置正确的总成员数
  if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
    taskExecutionRecords.value[taskRecordIndex].totalAccounts = totalMembers;
    taskExecutionRecords.value[taskRecordIndex].runningCount = totalMembers;
  }

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

  // ====== 跨标签页协调机制 ======
  // ✅ BUG修复：与 NightmareChallengeCard 保持一致，tabId 存入 sessionStorage（页面刷新后不变），
  // 避免刷新后自己残留的运行标记被误判为"其他标签页运行中"而阻塞执行
  const getTabId = () => {
    if (!sessionStorage.getItem('__nightmare_tab_id')) {
      sessionStorage.setItem('__nightmare_tab_id', `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    }
    return sessionStorage.getItem('__nightmare_tab_id');
  };

  const isPresetRunningInOtherTab = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (!data.tabId || !data.timestamp) return false;
      // ✅ BUG修复：过期窗口由 10 分钟改为 3 小时（与卡片端及战斗最长时长对齐），
      // 原 10 分钟窗口在战斗进行 10 分钟后即失效，其他标签页会重复启动同一预设
      if (Date.now() - data.timestamp > 3 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return false;
      }
      return data.tabId !== getTabId();
    } catch {
      return false;
    }
  };

  const markPresetRunning = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      localStorage.setItem(key, JSON.stringify({
        tabId: getTabId(),
        timestamp: Date.now(),
      }));
    } catch { /* ignore */ }
  };

  const clearPresetRunning = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  };

  // ✅ BUG修复：预设未实际启动（跳过/启动失败）时同步任务统计，
  // 避免 runningCount 卡住导致任务记录进度永远无法到 100%
  const countPresetAsFailed = (preset) => {
    if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
      const rec = taskExecutionRecords.value[taskRecordIndex];
      const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
      rec.failCount += memberCount;
      rec.runningCount = Math.max(0, rec.runningCount - memberCount);
      const completed = rec.successCount + rec.failCount;
      rec.progressPercent = rec.totalAccounts > 0 ? Math.round((completed / rec.totalAccounts) * 100) : 0;
    }
  };

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

    // 防止跨标签页重复启动
    if (isPresetRunningInOtherTab(preset.id)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `预设「${preset.name}」在其他标签页运行中，跳过`, type: 'warning' });
      return null;
    }

    // 标记为运行中（跨标签页协调）
    markPresetRunning(preset.id);

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
      clearPresetRunning(preset.id); // ✅ BUG修复：提前退出时清除跨标签页运行标记
      return null;
    }

    // 2. 获取队长 roleId
    let captainRoleId = '';
    try {
      const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId, {});
      captainRoleId = String(roleInfo?.role?.roleId || '');
      if (!captainRoleId) {
        addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 失败，跳过预设`, type: 'error' });
        clearPresetRunning(preset.id);
        return null;
      }
    } catch (err) {
      addLog({ time: new Date().toLocaleTimeString(), message: `获取队长 roleId 异常: ${err.message || err}，跳过`, type: 'error' });
      clearPresetRunning(preset.id);
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
      clearPresetRunning(preset.id);
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
          clearPresetRunning(preset.id);
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
          clearPresetRunning(preset.id);
          return null;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `房间创建成功 TeamId: ${teamId}`, type: 'success' });
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `创建房间异常: ${err.message || err}，跳过`, type: 'error' });
        clearPresetRunning(preset.id);
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
        clearPresetRunning(preset.id);
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
      clearPresetRunning(preset.id);
      return null;
    }

    // 7. 启动后台战斗服务
    addLog({ time: new Date().toLocaleTimeString(), message: `RoomId: ${roomId}，启动后台战斗服务`, type: 'info' });

    const battleEntry = { preset, battle: null, roomId, teamId, status: 'running', currentLevel: 0, failReason: null, originalIndex: presetIndex };

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
        // 清除跨标签页运行标记
        clearPresetRunning(preset.id);

        // 更新任务完成度统计：该预设的所有成员都成功
        if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
          const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
          taskExecutionRecords.value[taskRecordIndex].successCount += memberCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount -= memberCount;
          // 更新进度百分比
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
      },
      onError: (err) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `❌ 预设「${preset.name}」战斗异常: ${err.message || err}`, type: 'error' });
        // 清除跨标签页运行标记
        clearPresetRunning(preset.id);

        // 更新任务完成度统计：该预设的所有成员都失败
        if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
          const memberCount = (preset.memberTokenIds || []).length + (preset.captainTokenId ? 1 : 0);
          taskExecutionRecords.value[taskRecordIndex].failCount += memberCount;
          taskExecutionRecords.value[taskRecordIndex].runningCount -= memberCount;
          // 更新进度百分比
          const total = taskExecutionRecords.value[taskRecordIndex].totalAccounts;
          const completed = taskExecutionRecords.value[taskRecordIndex].successCount + taskExecutionRecords.value[taskRecordIndex].failCount;
          taskExecutionRecords.value[taskRecordIndex].progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
        }
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
      countPresetAsFailed(presets[i]); // ✅ BUG修复：跳过的预设同步计入统计，避免 runningCount 卡住
      continue;
    }
    const preset = presets[i];
    const entry = await executeOnePreset(preset, `执行预设「${preset.name}」(${i + 1}/${presets.length})`, i);
    if (!entry) { countPresetAsFailed(preset); continue; }

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
        // 实力不足/无可用成员类失败，重试只会浪费挑战次数，直接跳过
        if (['retry_limit_reached', 'no_available_members'].includes(fb.failReason)) {
          fb._retried = true;
          addLog({ time: new Date().toLocaleTimeString(), message: `⏹ 预设「${fb.preset.name}」失败原因 ${fb.failReason}，重试无法解决，不再重试`, type: 'warning' });
          continue;
        }
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
            // ✅ BUG修复：重试启动成功后回退上次失败已计入的统计（onError 已 failCount += memberCount），
            // 否则重试完成后再次计数会导致 success+fail 超过总数、runningCount 变负、进度超过100%
            if (taskRecordIndex >= 0 && taskExecutionRecords.value[taskRecordIndex]) {
              const rec = taskExecutionRecords.value[taskRecordIndex];
              const memberCount = (fb.preset.memberTokenIds || []).length + (fb.preset.captainTokenId ? 1 : 0);
              rec.failCount = Math.max(0, rec.failCount - memberCount);
              rec.runningCount += memberCount;
              const completed = rec.successCount + rec.failCount;
              rec.progressPercent = rec.totalAccounts > 0 ? Math.round((completed / rec.totalAccounts) * 100) : 0;
            }
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
    
    // ✅ BUG修复：收到停止信号时同步停止所有后台战斗
    // （原逻辑仅退出等待循环，已启动的战斗会继续在后台挂机最长 2 小时）
    if (shouldStop.value) {
      for (const b of activeBattles) {
        if (b.battle && (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight' || b.status === 'retrying')) {
          try { b.battle.stop(); } catch { /* ignore */ }
          clearPresetRunning(b.preset.id); // stop() 不触发 onComplete/onError，需手动清除运行标记
        }
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

// ==================== 日常精简补齐 ====================
// 手动执行弹窗状态与勾选项（默认全选）
const showSimplifiedDailyModal = ref(false);
// 付费招募默认不勾选：该项消耗元宝，防止用户在弹窗里误点导致浪费，需手动勾选才执行
const simplifiedDailySelectedItems = ref(
  SIMPLIFIED_TASK_ITEMS
    .filter((item) => item.key !== 'paidRecruit')
    .map((item) => item.key),
);

// 日常精简补齐：不受任何活跃度判断，按勾选任务项直接执行
const batchSimplifiedDaily = async (selectedKeys = null) => {
  if (selectedTokens.value.length === 0) return;

  const keys = (Array.isArray(selectedKeys) && selectedKeys.length > 0)
    ? selectedKeys
    : [...simplifiedDailySelectedItems.value];
  if (keys.length === 0) {
    message.warning('请至少勾选一个精简补齐任务项');
    return;
  }
  const keyLabels = keys.map(k => SIMPLIFIED_TASK_ITEMS.find(item => item.key === k)?.label || k).join('、');

  try {
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始日常精简补齐（不判断活跃度）：${keyLabels} ===`,
      type: "info",
    });

    wsPool.setPoolSize(batchSettings.maxActive);

    await runStreaming([...selectedTokens.value], async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始精简补齐: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);

        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        }, batchSettings);

        await runner.runSimplifiedTasks(tokenId, {
          onLog: (log) => addLog(log),
        }, keys);

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 精简补齐完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        tokenFailReasons.value[tokenId] = error?.message || '执行异常';
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token?.name || tokenId} 精简补齐失败: ${error.message}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 日常精简补齐结束 ===`,
      type: "success",
    });
    message.success("日常精简补齐结束");
  } finally {
    isRunning.value = false;
  }
};

// 手动弹窗执行入口（带任务完成情况记录）
const startSimplifiedDaily = async () => {
  if (simplifiedDailySelectedItems.value.length === 0) {
    message.warning('请至少勾选一个精简补齐任务项');
    return;
  }
  showSimplifiedDailyModal.value = false;
  await executeManualTaskWithRecord('batchSimplifiedDaily', '日常精简补齐', () => batchSimplifiedDaily([...simplifiedDailySelectedItems.value]));
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0) return;

  // ✅ 记录日常任务开始时间
  const batchStartTime = Date.now();

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

  // ✅ 新增：为手动日常任务创建任务完成情况记录
  // 定时任务调用时跳过：executeScheduledTask 已在外层创建了记录，避免重复
  const _isFromScheduledTask = isScheduledTaskRunning.value;
  const availableTokens = [...selectedTokens.value];

  // ✅ 单账号智能加速
  if (batchSettings.singleAccountSpeedUp && availableTokens.length === 1) {
    batchSettings.singleAccountMode = true;
    const mult = batchSettings.singleAccountMultiplier;
    const token = tokens.value.find(t => t.id === availableTokens[0]);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `⚡ ${token?.name || '单账号'} 单账号加速模式（延迟×${mult}）`,
      type: 'info',
    });
  }

  // 清理本次执行相关的失败原因缓存 + 重置 tokenStatus，避免上一个任务的残留状态污染本次记录
  availableTokens.forEach(tokenId => {
    delete tokenFailReasons.value[tokenId];
    tokenStatus.value[tokenId] = 'waiting';
  });
  const _batchTaskRecordIndex = _isFromScheduledTask ? -1 : taskExecutionRecords.value.push({
    name: '日常任务',
    startTime: batchStartTime,
    endTime: null,
    elapsedStr: null,
    status: 'running',
    totalAccounts: availableTokens.length,
    successCount: 0,
    failCount: 0,
    runningCount: availableTokens.length,
    progressPercent: 0,
    failedAccounts: [],
    scheduledTime: null,
    isManual: true,
  }) - 1;

  // 定时更新进度
  const _batchProgressTimer = setInterval(() => {
    let successCount = 0, failCount = 0, runningCount = 0;
    const failedAccounts = [];
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') successCount++;
      else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      } else if (status === 'running' || status === 'waiting' || status === 'waiting_retry') runningCount++;
    });
    const record = taskExecutionRecords.value[_batchTaskRecordIndex];
    if (record) {
      record.successCount = successCount;
      record.failCount = failCount;
      record.runningCount = runningCount;
      record.failedAccounts = failedAccounts;
      const completed = successCount + failCount;
      record.progressPercent = record.totalAccounts > 0 ? Math.round((completed / record.totalAccounts) * 100) : 0;
    }
  }, 500);

  // 400340重试队列：收集第一批执行中遇到400340错误的账号
  const retry400340Tokens = [];
  const MAX_400340_RETRIES = batchSettings.defaultRetryCount || 2;
  const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000;

  // 单账号执行超时保护（默认 30 分钟）
  const TOKEN_EXECUTION_TIMEOUT = (batchSettings.taskTimeout || 30) * 60 * 1000;

  // ========== 连接池滚动执行 ==========
  // 同步连接池大小：定时任务优先使用任务级并发数，否则使用全局设置
  const _effectiveMaxActive = (isScheduledTaskRunning.value && currentScheduledTask?.maxActive > 0)
    ? currentScheduledTask.maxActive
    : batchSettings.maxActive;
  wsPool.setPoolSize(_effectiveMaxActive);
  const maxConcurrent = _effectiveMaxActive;
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
          // ✅ 使用轻量级刷新函数获取角色信息（仅用于判断活跃度）
          const roleInfo = await tokenStore.refreshForBatchRoleOnly(tokenId);
                  
          // 尝试多种可能的路径
          const dailyTask = roleInfo?.role?.dailyTask 
            || roleInfo?.body?.role?.dailyTask
            || roleInfo?.dailyTask
            || roleInfo?.body?.dailyTask;
                  
          const activityPoints = dailyTask?.dailyPoint ?? 0;
                  
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `📊 ${token.name} 当前活跃度：${activityPoints}/110`,
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
          
          // ✅ 使用轻量级刷新函数获取最新角色信息
          const roleInfoResp = await tokenStore.refreshForBatchRoleOnly(tokenId);
          
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
          const currentStatus = tokenStatus.value[nextTokenId];
          // ✅ 修复：只有在状态不是 completed/failed 时才标记为 failed，避免误判
          if (currentStatus !== 'completed' && currentStatus !== 'failed') {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⏰ ${token?.name} ${timeoutErr.message}，强制标记为失败`,
              type: "warning",
            });
            tokenStatus.value[nextTokenId] = "failed";
            tokenFailReasons.value[nextTokenId] = `执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`;
          } else {
            // 任务实际上已完成，只是超时先触发了
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⏰ ${token?.name} 超时触发但任务已完成（状态：${currentStatus}），忽略超时`,
              type: "info",
            });
          }
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

  // ==================== 400340 重试逻辑（连接池滚动执行） ====================
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
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⏳ 等待${waitDesc}后进行第${retryRound + 1}次重试（${retry400340Tokens.length}个账号）...`,
        type: "info",
      });
      await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));

      if (shouldStop.value) break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 开始400340重试 第${retryRound + 1}/${MAX_400340_RETRIES}次（${retry400340Tokens.length}个账号）并发数: ${maxConcurrent} ===`,
        type: "info",
      });

      // ✅ 使用连接池滚动执行重试任务
      const retryQueue = [...retry400340Tokens];
      const retryActiveTokens = new Set();
      const retryCompletionMap = new Map();
      const stillFailed = [];

      const executeRetryTokenRolling = async (tokenId) => {
        if (shouldStop.value) return;
        const token = tokens.value.find((t) => t.id === tokenId);
        if (!token) return;

        tokenStatus.value[tokenId] = "running";

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 重试执行: ${token.name} (第${retryRound + 1}次重试) ===`,
            type: "info",
          });

          await ensureConnection(tokenId, 3, true); // skipSlot=true，由滚动执行控制并发
          await new Promise((r) => setTimeout(r, 2000));

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
          lastTaskExecution = Date.now();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (活跃: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      };

      // 滚动执行循环
      while (retryQueue.length > 0 || retryActiveTokens.size > 0) {
        if (shouldStop.value) break;

        while (retryQueue.length > 0 && retryActiveTokens.size < maxConcurrent) {
          const nextTokenId = retryQueue.shift();
          retryActiveTokens.add(nextTokenId);

          const promise = (async () => {
            try {
              await Promise.race([
                executeRetryTokenRolling(nextTokenId),
                new Promise((_, reject) => setTimeout(() =>
                  reject(new Error(`重试执行超时（${TOKEN_EXECUTION_TIMEOUT / 60000}分钟）`)),
                  TOKEN_EXECUTION_TIMEOUT
                ))
              ]);
            } catch (timeoutErr) {
              const token = tokens.value.find((t) => t.id === nextTokenId);
              stillFailed.push(nextTokenId);
              tokenStatus.value[nextTokenId] = "failed";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏰ ${token?.name} 重试超时，强制标记为失败`,
                type: "warning",
              });
              tokenStore.closeWebSocketConnection(nextTokenId);
              lastTaskExecution = Date.now();
            }
          })();

          retryCompletionMap.set(nextTokenId, promise);
        }

        if (retryActiveTokens.size > 0) {
          const activePromises = [...retryActiveTokens].map(id => retryCompletionMap.get(id));
          await Promise.race(activePromises);

          for (const [tid] of retryCompletionMap.entries()) {
            const status = tokenStatus.value[tid];
            if (status === 'completed' || status === 'failed' || status === 'waiting_retry') {
              retryActiveTokens.delete(tid);
              retryCompletionMap.delete(tid);
            }
          }
        }

        await new Promise(r => setTimeout(r, 50));
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

  // ✅ 清理进度定时器并最终更新任务记录
  clearInterval(_batchProgressTimer);
  {
    let successCount = 0, failCount = 0;
    const failedAccounts = [];
    availableTokens.forEach(tokenId => {
      const status = tokenStatus.value[tokenId];
      if (status === 'completed') successCount++;
      else if (status === 'failed') {
        failCount++;
        const token = tokens.value.find(t => t.id === tokenId);
        failedAccounts.push({
          name: token?.name || '未知账号',
          error: tokenFailReasons.value[tokenId] || '未知错误',
          time: new Date().toLocaleTimeString(),
        });
      }
    });
    const record = taskExecutionRecords.value[_batchTaskRecordIndex];
    if (record) {
      record.successCount = successCount;
      record.failCount = failCount;
      record.runningCount = 0;
      record.failedAccounts = failedAccounts;
      record.progressPercent = 100;
      record.endTime = Date.now();
      const elapsed = record.endTime - record.startTime;
      record.elapsedStr = elapsed >= 60000
        ? `${Math.floor(elapsed / 60000)}分${Math.floor((elapsed % 60000) / 1000)}秒`
        : `${(elapsed / 1000).toFixed(1)}秒`;
      if (failCount === 0) record.status = 'success';
      else if (successCount > 0) record.status = 'partial';
      else record.status = 'fail';
    }
    saveTaskExecutionRecordsToStorage();
  }

  // ✅ 显示日常任务总用时
  const batchElapsed = Date.now() - batchStartTime;
  const batchElapsedStr = batchElapsed >= 60000
    ? `${Math.floor(batchElapsed / 60000)}分${Math.floor((batchElapsed % 60000) / 1000)}秒`
    : `${(batchElapsed / 1000).toFixed(1)}秒`;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 日常任务执行完成，总用时: ${batchElapsedStr} ===`,
    type: "success",
  });

  isRunning.value = false;
  currentRunningTokenId.value = null;
  // 重置单账号加速标志
  batchSettings.singleAccountMode = false;
  
  // ✅ 日常任务结束后，通过统一入口消费定时任务队列
  setTimeout(() => processPendingQueue('daily'), 500);
  
  // 检查是否需要在任务完成后刷新页面
  // ✅ 使用统一的刷新安全检查，避免刷新中断任务或丢失即将触发的定时任务
  if (shouldRefreshAfterTask.value && isSafeToRefreshPage().safe) {
    console.log(`[${new Date().toISOString()}] Task completed, executing postponed page refresh`);
    shouldRefreshAfterTask.value = false; // 重置标记
    // 稍等片刻再刷新，让用户看到任务完成的消息
    setTimeout(() => {
      // ✅ 二次确认：防止 1.5 秒内调度器启动了新任务
      if (isSafeToRefreshPage().safe) {
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
 * 低活跃度（<90）的账号排到前面，高活跃度（>=90）的账号排到后面
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

    // 活跃度阈值：90为分界线（满值110，>=105跳过任务）
    const ACTIVITY_THRESHOLD = 90;

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
      
      // 低活跃度(<90)排前面，高活跃度(>=90)排后面
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
      message: `📊 低活跃度(0-89): ${lowActivityTokens.length}个账号 → 排到前面`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `📊 高活跃度(90-110): ${highActivityTokens.length}个账号 → 排到后面`,
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

// ====== 任务函数映射表：补登记 ======
// 以下函数定义在 taskFunctionMap 之后（存在暂时性死区，不能在表内直接引用），
// 若不登记，定时任务按名称查找时会取不到函数而报"不存在，跳过执行"。
Object.assign(taskFunctionMap, {
  startBatch,
  batchSimplifiedDaily,
  batchNightmareChallenge,
  batchNightmareChallengePresets,
  openHeroFourSaintsModal,
  // 任务名与实际函数名不一致，登记别名
  switchSaltFieldPeachFormation: handleSwitchSaltFieldPeachFormation,
  weekly_market_buy: weeklyMarketBuy,
});

// 自检：一次性列出所有无法按名解析的任务，便于定位遗漏（仅打印，不影响执行）
try {
  const _missingTaskFns = [];
  taskGroupDefinitions.forEach((group) => {
    group.tasks.forEach((name) => {
      if (typeof taskFunctionMap[name] !== "function") {
        _missingTaskFns.push(`${group.name}/${name}`);
      }
    });
  });
  if (_missingTaskFns.length > 0) {
    console.warn(
      "[任务映射自检] 以下任务无法按名解析，定时执行时会被跳过:",
      _missingTaskFns,
    );
  }
} catch (e) {
  /* 自检失败不影响主流程 */
}
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

  /* emoji图标在手机端缩小，避免挤占按钮文字空间 */
  .btn-emoji-icon {
    font-size: 14px !important;
  }

  /* 防止按钮文字溢出：截断+省略号 */
  .scheduled-tasks-buttons :deep(.n-button__content) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 底部操作按钮（开始执行/停止/任务模板/设置/连接/断开）手机端缩小 */
  .page-header > div:last-child :deep(.n-button) {
    font-size: 12px !important;
    height: 32px !important;
    padding: 0 8px !important;
  }

  .page-header > div:last-child :deep(.n-button .n-button__content) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .page-header > div:last-child :deep(.n-button .n-button__icon) {
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

/* 按钮emoji图标默认大小（桌面端） */
.btn-emoji-icon {
  font-size: 16px;
}

/* 极小屏设备（≤400px）进一步增强适配 */
@media (max-width: 400px) {
  .scheduled-tasks-buttons :deep(.n-button) {
    font-size: 11px !important;
    height: 28px !important;
    padding: 0 6px !important;
  }

  .scheduled-tasks-buttons :deep(.n-button .n-button__icon) {
    font-size: 12px !important;
  }

  .btn-emoji-icon {
    font-size: 12px !important;
  }

  /* 底部操作按钮极小屏进一步缩小 */
  .page-header > div:last-child :deep(.n-button) {
    font-size: 11px !important;
    height: 28px !important;
    padding: 0 6px !important;
  }

  .page-header > div:last-child :deep(.n-button .n-button__icon) {
    font-size: 12px !important;
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
  gap: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.card-title-main {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-count-badge {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  color: #666;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
  width: 100%;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.error-tag {
  animation: pulse-error 2s ease-in-out infinite;
}

@keyframes pulse-error {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 0 12px;
  font-size: 13px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:active {
  transform: translateY(0);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .custom-card-header {
    gap: 10px;
  }
  
  .card-title-row {
    gap: 8px;
  }
  
  .card-title-main {
    font-size: 15px;
  }
  
  .log-count-badge {
    padding: 2px 8px;
    font-size: 11px;
  }
  
  .log-header-controls {
    gap: 8px;
    justify-content: flex-start;
  }
  
  .control-group {
    gap: 6px;
    width: 100%;
  }
  
  .action-btn {
    flex: 1;
    min-height: 36px;
    padding: 0 10px;
    font-size: 12px;
    justify-content: center;
  }
  
  .action-btn :deep(.n-icon) {
    font-size: 14px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .card-title-main {
    font-size: 14px;
  }
  
  .control-group {
    width: 100%;
  }
  
  .action-btn {
    min-height: 40px;
    padding: 0 8px;
  }
}
/* 任务执行完成情况样式 */
.tr-summary-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.tr-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}

.tr-stat-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.tr-stat-label {
  font-size: 12px;
  margin-top: 2px;
  opacity: 0.85;
}

.tr-stat-success { background: rgba(76, 175, 80, 0.12); }
.tr-stat-success .tr-stat-num { color: #2E7D32; }
.tr-stat-success .tr-stat-label { color: #2E7D32; }

.tr-stat-partial { background: rgba(255, 152, 0, 0.12); }
.tr-stat-partial .tr-stat-num { color: #E65100; }
.tr-stat-partial .tr-stat-label { color: #E65100; }

.tr-stat-fail { background: rgba(244, 67, 54, 0.12); }
.tr-stat-fail .tr-stat-num { color: #C62828; }
.tr-stat-fail .tr-stat-label { color: #C62828; }

.tr-stat-running { background: rgba(33, 150, 243, 0.12); }
.tr-stat-running .tr-stat-num { color: #1565C0; }
.tr-stat-running .tr-stat-label { color: #1565C0; }

/* 暗色主题适配 */
html[data-theme="dark"] .tr-stat-success { background: rgba(76, 175, 80, 0.18); }
html[data-theme="dark"] .tr-stat-success .tr-stat-num,
html[data-theme="dark"] .tr-stat-success .tr-stat-label { color: #66BB6A; }
html[data-theme="dark"] .tr-stat-partial { background: rgba(255, 152, 0, 0.18); }
html[data-theme="dark"] .tr-stat-partial .tr-stat-num,
html[data-theme="dark"] .tr-stat-partial .tr-stat-label { color: #FFA726; }
html[data-theme="dark"] .tr-stat-fail { background: rgba(244, 67, 54, 0.18); }
html[data-theme="dark"] .tr-stat-fail .tr-stat-num,
html[data-theme="dark"] .tr-stat-fail .tr-stat-label { color: #EF5350; }
html[data-theme="dark"] .tr-stat-running { background: rgba(33, 150, 243, 0.18); }
html[data-theme="dark"] .tr-stat-running .tr-stat-num,
html[data-theme="dark"] .tr-stat-running .tr-stat-label { color: #42A5F5; }

/* Modal 头部操作栏样式 */
.tr-header-actions {
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecef 100%);
  border-radius: 8px;
}

html[data-theme="dark"] .tr-header-actions {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
}

.tr-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

html[data-theme="dark"] .tr-empty {
  color: #666;
}

/* 队列状态区域 */
.tr-queue-section {
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
  border: 1px solid #d0e8f7;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
html[data-theme="dark"] .tr-queue-section {
  background: linear-gradient(135deg, #1a2332 0%, #1e2d3d 100%);
  border-color: #2a3f52;
}
.tr-queue-title {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
html[data-theme="dark"] .tr-queue-title {
  color: #a0c4e8;
}
.tr-queue-icon {
  font-size: 14px;
}
.tr-queue-current,
.tr-queue-waiting {
  margin-bottom: 6px;
}
.tr-queue-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}
html[data-theme="dark"] .tr-queue-label {
  color: #8899aa;
}
.tr-queue-task,
.tr-queue-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255,255,255,0.6);
  border-radius: 4px;
  margin-bottom: 3px;
  font-size: 12px;
}
html[data-theme="dark"] .tr-queue-task,
html[data-theme="dark"] .tr-queue-item {
  background: rgba(255,255,255,0.05);
}
.tr-queue-task-name {
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
}
html[data-theme="dark"] .tr-queue-task-name {
  color: #c8d8e8;
}
.tr-queue-task-time {
  font-size: 11px;
  color: #888;
  font-family: monospace;
}
.tr-queue-index {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e0e7ef;
  color: #555;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}
html[data-theme="dark"] .tr-queue-index {
  background: #2a3f52;
  color: #8899aa;
}
.tr-queue-empty {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 4px;
}

.tr-list {
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tr-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.05);
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.tr-item:hover {
  background: rgba(128, 128, 128, 0.1);
  /* ✅ 移除 transform: translateX(2px) 避免鼠标移动时触发抖动 */
}

.tr-item-success { border-left-color: #4CAF50; }
.tr-item-partial { border-left-color: #FF9800; }
.tr-item-fail { border-left-color: #F44336; }
.tr-item-running { border-left-color: #2196F3; }

.tr-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tr-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tr-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tr-dot-success { background: #4CAF50; box-shadow: 0 0 6px rgba(76, 175, 80, 0.5); }
.tr-dot-partial { background: #FF9800; box-shadow: 0 0 6px rgba(255, 152, 0, 0.5); }
.tr-dot-fail { background: #F44336; box-shadow: 0 0 6px rgba(244, 67, 54, 0.5); }
.tr-dot-running {
  background: #2196F3;
  box-shadow: 0 0 6px rgba(33, 150, 243, 0.5);
  animation: tr-pulse 1.2s ease-in-out infinite;
}

@keyframes tr-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tr-item-index {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

html[data-theme="dark"] .tr-item-index { color: #aaa; }

.tr-item-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tr-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.tr-item-time {
  font-size: 13px;
  color: #888;
  font-variant-numeric: tabular-nums;
}

html[data-theme="dark"] .tr-item-time { color: #aaa; }

.tr-item-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

.tr-badge-success { background: rgba(76, 175, 80, 0.15); color: #2E7D32; }
.tr-badge-partial { background: rgba(255, 152, 0, 0.15); color: #E65100; }
.tr-badge-fail { background: rgba(244, 67, 54, 0.15); color: #C62828; }
.tr-badge-running { background: rgba(33, 150, 243, 0.15); color: #1565C0; }

html[data-theme="dark"] .tr-badge-success { background: rgba(76, 175, 80, 0.2); color: #66BB6A; }
html[data-theme="dark"] .tr-badge-partial { background: rgba(255, 152, 0, 0.2); color: #FFA726; }
html[data-theme="dark"] .tr-badge-fail { background: rgba(244, 67, 54, 0.2); color: #EF5350; }
html[data-theme="dark"] .tr-badge-running { background: rgba(33, 150, 243, 0.2); color: #42A5F5; }

/* 执行时间详情 */
.tr-time-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  font-size: 12px;
}

html[data-theme="dark"] .tr-time-details {
  background: rgba(255, 255, 255, 0.05);
}

.tr-time-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.tr-time-label {
  color: #888;
  font-weight: 500;
}

html[data-theme="dark"] .tr-time-label { color: #aaa; }

.tr-time-value {
  color: #333;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

html[data-theme="dark"] .tr-time-value { color: #ddd; }

.tr-delay-early { color: #4CAF50; }
.tr-delay-normal { color: #2196F3; }
.tr-delay-warning { color: #FF9800; }
.tr-delay-error { color: #F44336; }

/* 执行进度统计 */
.tr-progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tr-progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.tr-progress-text {
  color: #666;
  font-weight: 500;
}

html[data-theme="dark"] .tr-progress-text { color: #aaa; }

.tr-progress-percent {
  color: #2196F3;
  font-weight: 600;
}

.tr-progress-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tr-stat-success { color: #4CAF50; font-weight: 500; }
.tr-stat-fail { color: #F44336; font-weight: 500; }
.tr-stat-running { color: #2196F3; font-weight: 500; }

.tr-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

html[data-theme="dark"] .tr-progress-bar {
  background: rgba(255, 255, 255, 0.1);
}

.tr-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 3px;
}

.tr-progress-success { background: linear-gradient(90deg, #4CAF50, #66BB6A); }
.tr-progress-partial { background: linear-gradient(90deg, #FF9800, #FFA726); }
.tr-progress-fail { background: linear-gradient(90deg, #F44336, #EF5350); }
.tr-progress-running { 
  background: linear-gradient(90deg, #2196F3, #42A5F5);
  animation: tr-progress-pulse 1.5s ease-in-out infinite;
}

@keyframes tr-progress-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 失败账号详情 */
.tr-failed-accounts {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 10px;
}

html[data-theme="dark"] .tr-failed-accounts {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.tr-failed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
  font-size: 13px;
  color: #F44336;
  font-weight: 500;
}

.tr-failed-header:hover {
  background: rgba(244, 67, 54, 0.1);
}

.tr-failed-toggle {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.tr-failed-count {
  flex: 1;
}

.tr-failed-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.tr-failed-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(244, 67, 54, 0.05);
  border-radius: 6px;
  border-left: 2px solid #F44336;
  font-size: 12px;
}

.tr-failed-name {
  font-weight: 600;
  color: #333;
}

html[data-theme="dark"] .tr-failed-name { color: #ddd; }

.tr-failed-error {
  color: #F44336;
  word-break: break-word;
  line-height: 1.4;
}

.tr-empty {
  text-align: center;
  color: #999;
  padding: 32px;
  font-size: 14px;
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

.task-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
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

/* ========== Task Settings Modal - New Design ========== */
.st-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}
.st-modal-icon { font-size: 18px; }
.st-modal-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #86909c;
  margin-left: auto;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-settings-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.st-section {
  padding: 12px 0 8px;
}
.st-section + .st-section {
  border-top: 1px solid #f0f0f0;
}
.st-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.st-section-icon { font-size: 14px; }
.st-section-title-collapsible {
  cursor: pointer;
  user-select: none;
  justify-content: space-between;
}
.st-section-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.st-section-badge {
  font-size: 11px;
  font-weight: 400;
  color: #fff;
  background: #18a058;
  padding: 1px 6px;
  border-radius: 10px;
}
.st-section-toggle {
  font-size: 12px;
  color: #86909c;
  transition: transform 0.2s;
}
.st-section-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.st-section-grid.st-grid-2 {
  grid-template-columns: repeat(2, 1fr);
}
.st-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.st-field-full {
  width: 100%;
}
.st-label {
  font-size: 12px;
  color: #86909c;
  line-height: 1;
}
.st-switch-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
}
.st-switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  transition: background 0.15s;
}
.st-switch-item:hover {
  background: #f5f7fa;
}
.st-switch-text {
  font-size: 13px;
  color: #4e5969;
}
.st-helper-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.st-helper-count {
  font-size: 12px;
  color: #86909c;
}
.st-helper-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 140px;
  overflow-y: auto;
  padding: 8px 10px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafbfc;
}
.st-helper-hint {
  font-size: 12px;
  color: #c0c4cc;
  padding: 6px 0;
}
.st-hint {
  font-size: 11px;
  color: #999;
  margin-top: -2px;
  padding-bottom: 4px;
}
.st-modal-footer {
  display: flex;
  gap: 12px;
}

/* Settings Modal - Responsive */
@media (max-width: 768px) {
  .st-section-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .st-section-grid.st-grid-2 {
    grid-template-columns: 1fr;
  }
  .st-switch-grid {
    grid-template-columns: 1fr;
  }
  .st-switch-item {
    padding: 10px 8px;
    min-height: 40px;
  }
  .st-modal-subtitle {
    max-width: 120px;
  }
}

/* Settings Modal - Dark Mode */
html.dark .st-section + .st-section,
html[data-theme="dark"] .st-section + .st-section {
  border-top-color: rgba(255,255,255,0.08);
}
html.dark .st-label,
html[data-theme="dark"] .st-label {
  color: #a0a4b8;
}
html.dark .st-switch-item:hover,
html[data-theme="dark"] .st-switch-item:hover {
  background: rgba(255,255,255,0.06);
}
html.dark .st-helper-tags,
html[data-theme="dark"] .st-helper-tags {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
}
html.dark .st-modal-subtitle,
html[data-theme="dark"] .st-modal-subtitle {
  color: #a0a4b8;
}
html.dark .st-helper-count,
html.dark .st-helper-hint,
html[data-theme="dark"] .st-helper-count,
html[data-theme="dark"] .st-helper-hint {
  color: #86909c;
}

/* Purchase Config (Account Settings) */
.purchase-config-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.purchase-config-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.purchase-config-actions {
  display: flex;
  gap: 6px;
}
.purchase-config-hint {
  font-size: 12px;
  color: #86909c;
  margin-top: 8px;
}

/* Apply Template Modal */
.apply-group-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.apply-group-label {
  font-size: 12px;
  color: #86909c;
}
.apply-group-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.apply-group-empty {
  font-size: 12px;
  color: #c0c4cc;
}
.apply-select-all {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}
.apply-token-grid {
  margin-top: 4px;
}
.apply-token-item {
  padding: 4px 0;
}

/* Account Template References */
.account-ref-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.account-ref-actions {
  display: flex;
  gap: 8px;
}
.account-ref-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.account-ref-card {
  margin-bottom: 10px;
}
.account-ref-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.account-ref-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-ref-empty {
  text-align: center;
  padding: 24px;
  color: #86909c;
  font-size: 13px;
}

/* Purchase Config Responsive */
@media (max-width: 768px) {
  .purchase-config-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .purchase-config-actions {
    justify-content: flex-end;
  }
  .purchase-list-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

/* Template Manager Responsive */
@media (max-width: 768px) {
  .template-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .template-toolbar .n-input {
    width: 100% !important;
  }
  .template-grid {
    grid-template-columns: 1fr;
  }
  .account-ref-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .account-ref-filter {
    width: 100%;
  }
  .account-ref-filter .n-select {
    width: 100% !important;
  }
}

/* Template Manager Dark Mode */
html.dark .apply-group-label,
html[data-theme="dark"] .apply-group-label {
  color: #a0a4b8;
}
html.dark .apply-select-all,
html[data-theme="dark"] .apply-select-all {
  border-bottom-color: rgba(255,255,255,0.08);
}
html.dark .account-ref-name,
html[data-theme="dark"] .account-ref-name {
  color: #ffffff;
}
html.dark .account-ref-empty,
html[data-theme="dark"] .account-ref-empty {
  color: #86909c;
}

/* Purchase Config Dark Mode */
html.dark .purchase-config-hint,
html[data-theme="dark"] .purchase-config-hint {
  color: #a0a4b8;
}
html.dark .st-section-toggle,
html[data-theme="dark"] .st-section-toggle {
  color: #a0a4b8;
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
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    /* 每行数量和搜索框自适应 */
    :deep(.n-input-number),
    :deep(.n-input) {
      width: 120px !important;
      min-width: 80px;
    }

    /* 移动端减少控制区左边距 */
    :deep(.n-space) > div {
      margin-left: 8px !important;
    }
  }

  /* 账号列表头部按钮移动端自适应 */
  :deep(.n-card-header) {
    flex-wrap: wrap;
    gap: 6px;
  }

  /* Naive UI 卡片标题真实类名为 __main（非 __title），flex:1 1 auto 防止标题被压缩成竖排 */
  :deep(.n-card-header__main) {
    flex: 1 1 auto;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

/* 三列合并布局 */
.settings-grid-responsive-3cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 8px;
}

.setting-group-merged {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--border-light, #e5e7eb);
  transition: all 0.2s ease;
}

.setting-group-merged:hover {
  background: var(--bg-tertiary, #f3f4f6);
  border-color: var(--border-hover, #d1d5db);
}

/* 三列合并布局 - 移动端适配 */
@media (max-width: 768px) {
  .settings-grid-responsive-3cols {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .setting-group-merged {
    padding: 10px;
  }
}

/* 三列合并布局 - 平板端适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .settings-grid-responsive-3cols {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 三列合并布局 - 桌面端适配 */
@media (min-width: 1025px) {
  .settings-grid-responsive-3cols {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ========== 定时任务弹窗手机端优化 ========== */
@media (max-width: 600px) {
  /* 分区卡片减少内边距 */
  .form-section {
    padding: 10px;
    border-radius: 8px;
  }

  /* 分区标题缩小 */
  .section-title {
    font-size: 13px;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }

  /* 商店商品项紧凑化 */
  .store-item {
    padding: 6px 8px;
    min-height: 36px;
    flex-wrap: wrap;
    gap: 4px;
  }

  .store-item .n-checkbox {
    flex: 1;
    min-width: 0;
  }

  .store-item .n-checkbox :deep(.n-checkbox__label) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* 奖励项紧凑化 */
  .reward-item {
    padding: 6px 8px;
    min-height: 36px;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* 配置卡片头部：标题和开关纵向排列 */
  .config-card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
  }

  .config-card-title {
    font-size: 13px;
  }

  .config-card-content {
    padding: 10px;
  }

  /* 操作按钮全宽 */
  .form-actions {
    flex-direction: column;
    gap: 8px;
  }

  .form-actions .n-button {
    width: 100%;
  }

  /* 分组标签紧凑 */
  .group-tags {
    gap: 6px;
  }

  /* 工具栏按钮紧凑 */
  .section-toolbar {
    margin-bottom: 8px;
  }

  /* 不上线时段紧凑 */
  .offline-time-section {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start !important;
  }

  /* 十殿预设项紧凑 */
  .nightmare-preset-item {
    padding: 6px 0;
  }

  .preset-item-label {
    font-size: 12px;
  }

  /* 单选按钮组手机端换行 */
  .setting-item :deep(.n-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .setting-item :deep(.n-radio-button) {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  /* 时间选择器全宽 */
  .setting-item :deep(.n-time-picker) {
    width: 100% !important;
  }

  /* 输入框全宽 */
  .setting-item :deep(.n-input) {
    width: 100% !important;
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
  gap: 12px;
}

/* 工具栏 */
.push-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.push-toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: space-between;
}
.push-torch-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: nowrap;
}
/* 火把选择器：弹性宽度，最小100px最大140px */
.push-torch-select {
  flex: 1 1 100px;
  min-width: 100px;
  max-width: 140px;
}
/* 数量输入框固定宽度 */
.push-torch-count {
  width: 74px !important;
  flex-shrink: 0;
}
/* 使用火把按钮不收缩 */
.push-torch-btn {
  flex-shrink: 0;
  white-space: nowrap;
}
.push-toolbar-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
/* 全部开始/全部停止按钮等宽 */
.push-action-btn {
  flex: 1 1 auto;
  white-space: nowrap;
}
/* 小屏：torch-group 和 toolbar-right 各占一行 */
@media (max-width: 480px) {
  .push-toolbar-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .push-torch-group {
    width: 100%;
  }
  .push-torch-select {
    flex: 1 1 0;
    max-width: none;
  }
  .push-toolbar-right {
    width: 100%;
  }
  .push-action-btn {
    flex: 1;
  }
}

/* 已选账号标签 */
.push-selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #eef0f3;
  max-height: 100px;
  overflow-y: auto;
}
.push-selected-tags::-webkit-scrollbar {
  width: 3px;
}
.push-selected-tags::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}
.push-tag {
  font-size: 12px;
  border-radius: 4px;
}

/* 标签式账号选择器 */
.push-account-selector {
  background: var(--n-color-modal, #f8f9fb);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--n-border-color, #eef0f3);
}
.push-selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 28px;
  max-height: 80px;
  overflow-y: auto;
}
.push-selected-chips::-webkit-scrollbar {
  width: 3px;
}
.push-selected-chips::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}
.push-chip {
  font-size: 12px;
  border-radius: 4px;
}
.push-search-input {
  margin: 8px 0;
}
.push-group-wrapper {
  margin: 4px 0 8px;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 6px;
}
.push-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 2px 0;
  user-select: none;
}
.push-group-title {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}
.push-group-toggle {
  font-size: 10px;
  color: #999;
}
.push-group-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 8px;
}
.push-group-chip {
  padding: 4px 10px;
  border-radius: 5px;
  border: 2px solid;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
}
.push-group-chip:hover {
  opacity: 0.85;
}
.push-account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: var(--n-color, #fff);
  border: 1px solid var(--n-border-color, #e0e0e0);
  border-radius: 6px;
}
.push-account-grid::-webkit-scrollbar {
  width: 4px;
}
.push-account-grid::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}
.push-account-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
  user-select: none;
}
.push-account-item:hover {
  background: var(--n-color-hover, #f0f0f0);
}
.push-account-item.is-selected {
  background: var(--n-color-info-suppl, #e8f4fd);
}
.push-account-item input[type="checkbox"] {
  margin: 0;
  pointer-events: none;
}
.push-account-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.push-account-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.push-select-count {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}
.push-no-selection {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  display: block;
}

/* 统计栏 */
.push-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f0f4f8;
  border-radius: 6px;
  border: 1px solid #e4e8ed;
  font-size: 12px;
  color: #555;
}

/* 定时控制模块 */
.push-timer-section {
  border: 1px solid #e4e8ed;
  border-radius: 8px;
  overflow: hidden;
}
.push-timer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  cursor: pointer;
  user-select: none;
  &:hover { background: #eef1f6; }
}
.push-timer-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.push-timer-countdown {
  font-size: 12px;
  color: #2080f0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.push-timer-toggle {
  margin-left: auto;
  font-size: 10px;
  color: #999;
}
.push-timer-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.push-timer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.push-timer-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  width: 52px;
  flex-shrink: 0;
}
.push-timer-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  flex-wrap: wrap;
}
.push-time-picker {
  flex: 1 1 120px;
  min-width: 110px;
  max-width: 180px;
}
.push-timer-tips {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: #f0f6ff;
  border-radius: 6px;
  font-size: 12px;
  color: #444;
  line-height: 1.7;
  strong { color: #2080f0; }
}
/* 小屏自适应 */
@media (max-width: 480px) {
  .push-timer-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .push-timer-label { width: auto; }
  .push-timer-controls { width: 100%; }
  .push-time-picker { max-width: none; flex: 1; }
}
.push-stats-running {
  font-size: 12.5px;
}
.push-stats-running strong {
  color: #2080f0;
  font-size: 14px;
  margin: 0 2px;
}
.push-stats-detail {
  color: #777;
  font-size: 11.5px;
}
.stat-win-inline { color: #18a058; font-weight: 600; }
.stat-loss-inline { color: #d03050; font-weight: 600; }

/* 卡片网格 */
.push-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
  max-height: 400px;
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
  border-radius: 6px;
  padding: 6px 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.push-card--running {
  border-color: #b6d7ff;
  background: #f0f7ff;
  box-shadow: 0 0 0 1px rgba(32, 128, 240, 0.08);
}

/* 紧凑头部 - 单行 */
.push-card-head {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
}
.push-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-active {
  background: #18a058;
  box-shadow: 0 0 4px #18a058aa;
  animation: dot-pulse 2s infinite;
}
.push-card-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.push-card-progress .n-progress {
  flex: 1;
}
.push-card-timer {
  font-size: 10.5px;
  color: #2080f0;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
  flex-shrink: 0;
}
.push-timer-sep {
  color: #aab;
  margin: 0 1px;
  font-weight: 400;
}
.dot-idle {
  background: #c0c4cc;
}
.dot-connected {
  background: #18a058;
}
.dot-connecting {
  background: #f0a020;
  animation: dot-pulse 1.5s infinite;
}
.dot-disconnected {
  background: #d03050;
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.push-card-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
  flex-shrink: 1;
  min-width: 0;
}
.push-card-level {
  font-size: 10.5px;
  color: #666;
  background: #eef0f3;
  padding: 0 4px;
  border-radius: 3px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 18px;
}
.push-card-boss {
  font-size: 10.5px;
  color: #c0392b;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 50px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.push-card-stats {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
  margin-left: auto;
}
.push-stat {
  font-size: 10px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 3px;
  line-height: 17px;
}
.push-stat-win {
  color: #18a058;
  background: #e8f5ee;
}
.push-stat-loss {
  color: #d03050;
  background: #fde8ec;
}
.push-card-stop {
  flex-shrink: 0;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  font-size: 10px !important;
  min-width: 0 !important;
  border-radius: 4px !important;
  margin-left: 2px;
}

.push-card-delete {
  flex-shrink: 0;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  font-size: 12px !important;
  min-width: 0 !important;
  border-radius: 4px !important;
  margin-left: 2px;
  color: #999 !important;
  transition: all 0.2s;
}

.push-card-delete:hover {
  color: #f56c6c !important;
  background: #fef0f0 !important;
}

.push-clear-all-btn {
  margin-left: auto;
  font-size: 11px !important;
  padding: 0 8px !important;
  height: 24px !important;
}


.push-empty {
  text-align: center;
  padding: 32px 0;
  color: #bbb;
  font-size: 13px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e4e7ed;
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
  user-select: none;
}
.push-logs-title {
  font-weight: 600;
  font-size: 13px;
}
.push-logs-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.push-logs-arrow {
  font-size: 12px;
  color: #999;
  transition: transform 0.2s;
  display: inline-block;
}
.push-logs-arrow--collapsed {
  transform: rotate(-90deg);
}
.push-logs-list {
  max-height: 180px;
  overflow-y: auto;
  background: #fafbfc;
  border-radius: 6px;
  padding: 6px 8px;
  border: 1px solid #eef0f3;
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

/* 竞技大厅助威弹窗 - 俱乐部列表高度移动端自适应 */
.apex-cheer-table {
  height: 500px;
}
@media (max-width: 768px) {
  .apex-cheer-table {
    height: 50vh;
  }
}

/* ====== 选择执行账号弹窗：手机端自适应 ====== */
@media (max-width: 600px) {
  .account-selector-content .n-alert {
    font-size: 13px;
    padding: 10px 12px;
    margin-bottom: 12px;
  }
  .account-selector-content .group-filter-section {
    padding: 10px !important;
  }
  .account-selector-content .info-label {
    font-size: 12px;
  }
  /* 账号行 Token 描述更短，避免在窄屏溢出 */
  .account-selector-content .n-list-item {
    padding: 10px 12px !important;
  }
  /* 操作按钮：让"按分组勾选"在窄屏独立成行 */
  .account-selector-actions-shrink {
    margin-left: 0 !important;
    flex-basis: 100%;
  }
  /* 底部按钮堆叠：主操作在前 */
  .account-selector-footer {
    text-align: stretch !important;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .account-selector-footer-cancel {
    margin-right: 0 !important;
    order: 2;
  }
  .account-selector-footer .n-button[type="primary"] {
    order: 1;
  }
  /* 统计信息左对齐、字号缩小 */
  .account-selector-stats {
    text-align: left !important;
    font-size: 12px !important;
  }
}
</style>
