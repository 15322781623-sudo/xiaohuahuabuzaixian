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
            <!-- 瀹氭椂浠诲姟缁熻鍗＄墖 -->
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
                    馃搮 瀹氭椂浠诲姟
                  </div>
                  <div style="font-size: 32px; font-weight: 700; line-height: 1; color: #1890ff;">
                    {{ scheduledTasks.length }}
                  </div>
                </div>
                <div style="flex: 1; border-left: 2px solid #e8e8e8; padding-left: 16px;">
                  <div style="font-size: 14px; color: #666666; margin-bottom: 6px; font-weight: 500;">
                    鈴?鍗冲皢鎵ц
                  </div>
                  <div style="font-size: 15px; font-weight: 600; word-break: break-word; line-height: 1.4; color: #333333;">
                    {{ shortestCountdownTask ? `${shortestCountdownTask.task.name} (${shortestCountdownTask.countdown.formatted})` : '鏆傛棤浠诲姟' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 鎿嶄綔鎸夐挳缁?-->
            <div class="scheduled-tasks-buttons">
              <!-- 浠诲姟绠＄悊 -->
              <div class="button-row button-row-task">
                <n-button 
                  size="small" 
                  @click="openTaskModal"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">鉃?/span>
                  </template>
                  鏂板浠诲姟
                </n-button>
                <n-button 
                  size="small" 
                  @click="showTasksModal = true"
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃搵</span>
                  </template>
                  鏌ョ湅浠诲姟
                </n-button>
              </div>

              <!-- 鏃舵鎺у埗 -->
              <div class="button-row button-row-time">
                <n-button 
                  size="small" 
                  @click="toggleAllOfflineTime(true)" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">鈻讹笍</span>
                  </template>
                  寮€鍚椂娈?                </n-button>
                <n-button 
                  size="small" 
                  @click="toggleAllOfflineTime(false)" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">鈴革笍</span>
                  </template>
                  鍏抽棴鏃舵
                </n-button>
              </div>

              <!-- 閰嶇疆绠＄悊 -->
              <div class="button-row button-row-config">
                <n-button 
                  size="small" 
                  @click="triggerImportScheduledTasks"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摜</span>
                  </template>
                  瀵煎叆浠诲姟
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportScheduledTasksConfig" 
                  :disabled="scheduledTasks.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摛</span>
                  </template>
                  瀵煎嚭浠诲姟
                </n-button>
                <n-button 
                  size="small" 
                  @click="triggerImportAccountConfig"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摜</span>
                  </template>
                  瀵煎叆璐﹀彿
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportAccountConfig" 
                  :disabled="tokens.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摛</span>
                  </template>
                  瀵煎嚭璐﹀彿
                </n-button>
              </div>
              <!-- 鍏ㄩ噺閰嶇疆瀵煎叆瀵煎嚭 -->
              <div class="button-row button-row-config">
                <n-button 
                  size="small" 
                  @click="triggerImportFullConfig"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摝</span>
                  </template>
                  鍏ㄩ噺瀵煎叆
                </n-button>
                <n-button 
                  size="small" 
                  @click="exportConfig" 
                  :disabled="tokens.length === 0"
                  style="flex: 1; color: white;"
                >
                  <template #icon>
                    <span style="font-size: 16px;">馃摝</span>
                  </template>
                  鍏ㄩ噺瀵煎嚭
                </n-button>
              </div>
            </div>
          </div>

          <!-- 闅愯棌鐨勬枃浠惰緭鍏ユ -->
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
                <span style="font-size: 16px;">鈻讹笍</span>
              </template>
              {{ isRunning ? "鎵ц涓?.." : "寮€濮嬫墽琛? }}
            </n-button>
            <n-button
              @click="stopBatch"
              :disabled="!isRunning"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">鈴癸笍</span>
              </template>
              鍋滄
            </n-button>
            <n-button
              @click="openTemplateManagerModal"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">馃摜</span>
              </template>
              浠诲姟妯℃澘
            </n-button>
            <n-button @click="openBatchSettings" size="medium" style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;">
              <template #icon>
                <span style="font-size: 16px;">鈿欙笍</span>
              </template>
              璁剧疆
            </n-button>
            <n-button
              @click="connectSelected"
              :disabled="selectedTokens.length === 0"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">馃敆</span>
              </template>
              杩炴帴
            </n-button>
            <n-button
              @click="disconnectSelected"
              :disabled="selectedTokens.length === 0"
              size="medium"
              style="flex: 1; min-width: 120px; border-radius: 8px; font-weight: 500; background: rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.3); color: white;"
            >
              <template #icon>
                <span style="font-size: 16px;">馃攲</span>
              </template>
              鏂紑
            </n-button>
          </div>
        </div>

        <!-- Batch Functions -->
        <n-card title="鎵归噺鍔熻兘鍒楄〃" class="token-list-card">
          <template #header-extra>
            <n-space style="gap: 8px; align-items: center;">
              <!-- 闃蹭紤鐪犲紑鍏?-->
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
                      <template #checked>馃洝锔?宸插紑鍚?/template>
                      <template #unchecked>馃洝锔?闃蹭紤鐪?/template>
                    </n-switch>
                  </template>
                  <span v-if="!wakeLockSupported">褰撳墠鐜涓嶆敮鎸侀槻浼戠湢鍔熻兘</span>
                  <span v-else>寮€鍚悗绯荤粺灏嗕繚鎸佸敜閱掔姸鎬?闃叉鑷姩浼戠湢</span>
                </n-tooltip>
                <n-text v-if="!wakeLockSupported" type="warning" style="font-size: 11px;">
                  涓嶆敮鎸?                </n-text>
              </n-space>
              <n-button 
                size="small" 
                @click="isBatchFunctionsExpanded = !isBatchFunctionsExpanded"
                :type="isBatchFunctionsExpanded ? 'primary' : 'default'"
              >
                {{ isBatchFunctionsExpanded ? '鏀惰捣' : '灞曞紑' }}
              </n-button>
            </n-space>
          </template>
          <div v-if="isBatchFunctionsExpanded">
          <n-tabs type="line" animated>
            <n-tab-pane name="daily" tab="鏃ュ父">
              <n-space>
                <n-button
                  size="small"
                  @click="claimHangUpRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇鎸傛満
                </n-button>
                <n-button
                  size="small"
                  @click="batchAddHangUpTime"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿姞閽?                </n-button>
                <n-button
                  size="small"
                  @click="resetBottles"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  閲嶇疆缃愬瓙
                </n-button>
                <n-button
                  size="small"
                  @click="batchlingguanzi"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿鍙栫綈瀛?                </n-button>
                <n-button
                  size="small"
                  @click="batchclubsign"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿勘涔愰儴绛惧埌
                </n-button>
                <n-button
                  size="small"
                  @click="batchStudy"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿瓟棰?                </n-button>
                <n-button
                  size="small"
                  @click="batcharenafight"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  涓€閿珵鎶€鍦烘垬鏂?娆?                </n-button>
                <n-button
                  size="small"
                  @click="batchSmartSendCar"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  鏅鸿兘鍙戣溅
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimCars"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  涓€閿敹杞?                </n-button>
                <n-button
                  size="small"
                  @click="batchCarResearchUpgrade"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  鍗囩骇鏀硅
                </n-button>
                <n-button
                  size="small"
                  @click="store_purchase"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿粦甯傞噰璐?                </n-button>
                <n-button
                  size="small"
                  @click="openBatchPurchaseConfig"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍚屾閲囪喘娓呭崟
                </n-button>
                <n-button
                  size="small"
                  @click="batch_mail_claim_and_cleanup"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  閭棰嗗彇涓庢竻鐞?                </n-button>
                <n-button
                  size="small"
                  :type="isAnyPushRunning ? 'error' : 'warning'"
                  @click="showPushMapModal = true"
                >
                  {{ isAnyPushRunning ? '鍋滄鎺ㄥ浘' : '鎵归噺鎺ㄥ浘' }}
                </n-button>

              </n-space>
            </n-tab-pane>
            <n-tab-pane name="welfare" tab="绂忓埄">
              <n-space>
                <n-button
                  size="small"
                  @click="charge_claimaddup_rewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  绉垎濂界ぜ棰嗗彇
                </n-button>
                <n-button
                  size="small"
                  @click="collection_claimfreereward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿鍙栫弽瀹濋榿
                </n-button>
                <n-button
                  size="small"
                  @click="gacha_drawreward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍏嶈垂鎵泲
                </n-button>
                <n-button
                  size="small"
                  @click="claim_recruit_welfare"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍏嶈垂绀煎寘棰嗗彇
                </n-button>
                <n-button
                  size="small"
                  @click="pkroom_appoint"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰勭害鐩存挱
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="dungeon" tab="鍓湰">
              <n-space>
                <n-button
                  size="small"
                  @click="climbTower"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿埇濉?                </n-button>
                <n-button
                  size="small"
                  @click="batchmengjing"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  涓€閿ⅵ澧?                </n-button>
                <n-button
                  size="small"
                  @click="skinChallenge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿崲鐨棷鍏?                </n-button>
                <n-button
                  size="small"
                  @click="skinTreasure"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿崲鐨瀹?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimPeachTasks"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿鍙栬煚妗冨洯浠诲姟
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
                  涓€閿喘涔版ⅵ澧冨晢鍝?                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="baoku" tab="瀹濆簱">
              <n-space>
                <n-button
                  size="small"
                  @click="batchbaoku13"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  涓€閿疂搴撳墠3灞?                </n-button>
                <n-button
                  size="small"
                  @click="batchbaoku45"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  涓€閿疂搴?,5灞?                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="weirdTower" tab="鎬紓濉?>
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
                  涓€閿埇鎬紓濉?                </n-button>
                <n-button
                  size="small"
                  @click="batchUseItems"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  涓€閿娇鐢ㄦ€紓濉旈亾鍏?                </n-button>
                <n-button
                  size="small"
                  @click="batchMergeItems"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  涓€閿€紓濉斿悎鎴?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimFreeEnergy"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  涓€閿鍙栨€紓濉斿厤璐归亾鍏?                </n-button>
                <n-button
                  size="small"
                  @click="claim_weird_tower_all"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  棰嗗彇鎬紓濉斿疂绠辩洰鏍囩壒鏉?                </n-button>
                <n-button
                  size="small"
                  @click="claim_weird_tower_pass"
                  :disabled="
                    isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  棰嗗彇鎬紓濉旈€氳璇?                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="resource" tab="璧勬簮">
              <n-space>
                <n-button
                  size="small"
                  @click="openHelperModal('box')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鎵归噺寮€绠?                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('pointsBox')"
                  :disabled="isRunning || selectedTokens.length === 0 || !isBoxWeeklyActivityOpen"
                  :title="!isBoxWeeklyActivityOpen ? '浠呭湪瀹濈鍛ㄥ紑鏀炬湡闂村彲鐢? : ''"
                >
                  涓€閿疂绠卞懆寮€绠?                </n-button>
                <n-button
                  size="small"
                  @click="batchOpenDiamondBox"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿紑閽荤煶瀹濈
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('fragmentPack')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿紑纰庣墖绀煎寘
                </n-button>
                <n-button
                  size="small"
                  @click="openBoxWeeklyRewardModal"
                  :disabled="isRunning || selectedTokens.length === 0 || !isBoxWeeklyActivityOpen"
                  :title="!isBoxWeeklyActivityOpen ? '浠呭湪瀹濈鍛ㄥ紑鏀炬湡闂村彲鐢? : ''"
                >
                  瀹濈杈炬爣濂栧姳鑷€夊ぇ濂?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimBoxPointReward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇瀹濈绉垎
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('fish')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鎵归噺閽撻奔
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('recruit')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鎵归噺鎷涘嫙
                </n-button>
                <n-button
                  size="small"
                  @click="legion_storebuygoods"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿喘涔板洓鍦ｇ鐗?                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('weeklyMarket')"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen"
                  :title="!isWeirdTowerActivityOpen ? '浠呭湪榛戝競鍛ㄥ紑鏀炬湡闂村彲鐢? : ''"
                >
                  榛戝競鍛ㄨ喘涔?                </n-button>
                <n-button
                  size="small"
                  @click="weekly_market_free_gift"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen"
                  :title="!isWeirdTowerActivityOpen ? '浠呭湪榛戝競鍛ㄥ紑鏀炬湡闂村彲鐢? : ''"
                >
                  榛戝競鍛ㄥ厤璐圭ぜ鍖?                </n-button>
                <n-button
                  size="small"
                  @click="buy_top_rod_package"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  璐拱椤剁骇楸肩鍖?                </n-button>
                <n-button
                  size="small"
                  @click="buy_super_spirit_shell"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  璐拱鐗圭骇鐏佃礉鍖?                </n-button>
                <n-button
                  size="small"
                  @click="store_buy_jade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿喘涔板僵鐜?                </n-button>
                <n-button
                  size="small"
                  @click="openManualBuyModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  榛戝競澶氶€夎喘涔?                </n-button>
                <n-button
                  size="small"
                  @click="openCollectionExchangeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鐝嶅疂闃佸晢搴楄喘涔?                </n-button>
                <n-button
                  size="small"
                  @click="legionStoreBuySkinCoins"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿喘涔颁勘涔愰儴5鐨偆甯?                </n-button>
                <n-button
                  size="small"
                  @click="legion_buy_red_jade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿喘涔?娆＄孩鐜?                </n-button>
                <n-button
                  size="small"
                  @click="batchGenieSweep"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿伅绁炴壂鑽?                </n-button>
                <n-button
                  size="small"
                  @click="openSaltCrystalShopModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鐩愭櫠鍟嗗簵璐拱
                </n-button>
                <n-button
                  size="small"
                  @click="openSaltIngotShopModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鐩愰敪鍟嗗簵璐拱
                </n-button>
                <n-button
                  size="small"
                  @click="showConsumeModal = true"
                  :disabled="isRunning"
                  type="warning"
                >
                  娑堣€楁椿鍔?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimConsumeRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇娑堣€楁椿鍔ㄩ亾鍏?                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('cheer')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鎸ラ紦鍔╁▉娑堣€?                </n-button>
                <n-button
                  size="small"
                  @click="batchUseActivityItem"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  浣跨敤娑堣€楁椿鍔ㄩ亾鍏?                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('cdk')"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍏戞崲鐮侀鍙?                </n-button>
                <n-button
                  size="small"
                  @click="openActivityExchangeModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  娑堣€楁椿鍔ㄥ厬鎹㈣喘涔?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimApexRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇绔炴妧澶у巺閬撳叿
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="pet" tab="瀹犵墿">
              <n-space>
                <n-button
                  size="small"
                  @click="legion_buy_spotted_egg"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿喘涔版枒鐐硅泲
                </n-button>
                <n-button
                  size="small"
                  @click="use_spotted_egg"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  浣跨敤鏂戠偣铔?                </n-button>
                <n-button
                  size="small"
                  @click="batch_pet_merge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  瀹犵墿鍚堟垚
                </n-button>
                <n-button
                  size="small"
                  @click="batch_pet_upgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  瀹犵墿涓€閿崌绾?                </n-button>
                <n-button
                  size="small"
                  @click="claim_pet_book"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  瀹犵墿棰嗗彇鍥鹃壌濂栧姳
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="illustration" tab="鍥鹃壌">
              <n-space>
                <n-button
                  size="small"
                  @click="openHeroFourSaintsModal()"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鑻遍泟鍥涘湥鍗囩骇
                </n-button>
                <n-button
                  size="small"
                  @click="batchHeroUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿嫳闆勫崌鏄?                </n-button>
                <n-button
                  size="small"
                  @click="batchBookUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿浘閴村崌鏄?                </n-button>
                <n-button
                  size="small"
                  @click="batchFishUpgrade"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿奔鐏靛崌鏄?                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimStarRewards"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿鍙栧浘閴村鍔?                </n-button>
                <n-button
                  size="small"
                  @click="batchCollectionActivate"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  姗辩獥鍜稿皢婵€娲?                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="nightmare" tab="鍗佹">
              <n-space>
                <n-button
                  size="small"
                  type="warning"
                  @click="batchNightmareChallenge"
                  :disabled="isRunning"
                >
                  鍗佹闃庣綏鎸戞垬
                </n-button>
                <n-button
                  size="small"
                  @click="nightmare_draw_lottery"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍗佹鎶藉
                </n-button>
                <n-button
                  size="small"
                  @click="nightmare_claim_book_reward"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍗佹鎶藉杈炬爣濂栧姳
                </n-button>
                <n-button
                  size="small"
                  @click="star_drawturntable"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鏄熺骇鎶藉
                </n-button>
                <n-button
                  size="small"
                  @click="batch_star_challenge"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍗佹鏄熺骇鎸戞垬
                </n-button>
                <n-button
                  size="small"
                  type="info"
                  @click="showStarTeamModal = true"
                >
                  鏄熺骇闃熶紞
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="legacy" tab="鍔熸硶">
              <n-space>
                <n-button
                  size="small"
                  @click="batchLegacyHangup"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  寮€鍚畫鍗锋寕鏈?                </n-button>
                <n-button
                  size="small"
                  @click="batchLegacyClaim"
                  :disabled="isRunning || selectedTokens.length === 0 || isLegacyRestricted"
                  :title="isLegacyRestricted ? '璧涘鏃?0:00-12:00涓烘畫鍗锋洿鏂版椂闂达紝绂佹鎿嶄綔' : ''"
                >
                  鎵归噺鍔熸硶娈嬪嵎棰嗗彇
                </n-button>
                <n-button
                  size="small"
                  @click="showLegacyGiftModal = true"
                  :disabled="isRunning || selectedTokens.length === 0 || isLegacyRestricted"
                  :title="isLegacyRestricted ? '璧涘鏃?0:00-12:00涓烘畫鍗锋洿鏂版椂闂达紝绂佹鎿嶄綔' : ''"
                >
                  鎵归噺鍔熸硶娈嬪嵎璧犻€?                </n-button>
                <n-button
                  size="small"
                  @click="batchLegacyClaimGiftTask"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇娈嬪嵎璧犻€佸鍔?                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="monthly" tab="鏈堝害">
              <n-space>
                <n-button
                  size="small"
                  @click="batchTopUpFish"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  涓€閿挀楸艰ˉ榻?                </n-button>
                <n-button
                  size="small"
                  @click="batchTopUpArena"
                  :disabled="
                    isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  涓€閿珵鎶€鍦鸿ˉ榻?                </n-button>
                <n-button
                  size="small"
                  @click="openWarGuessModal"
                  :disabled="isRunning || selectedTokens.length === 0 || !isWarGuessActivityOpen"
                  :title="isWarGuessActivityOpen ? '' : warGuessActivityTip"
                >
                  鏈堣禌鍔╁▉
                </n-button>
                <n-button
                  size="small"
                  @click="claim_guess_coin"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  棰嗗彇鍔╁▉甯?                </n-button>
                <n-button
                  size="small"
                  @click="openLegionStoreModal"
                  :disabled="isRunning || selectedTokens.length === 0"
                >
                  鍔╁▉鍟嗗簵澶氶€夎喘涔?                </n-button>
              </n-space>
            </n-tab-pane>
          </n-tabs>
          </div>
        </n-card>

        <!-- Token Selection -->
        <n-card title="璐﹀彿鍒楄〃" style="margin-top: 16px">
          <template #header-extra>
            <n-button 
              size="small" 
              @click="showSponsorModal = true"
              style="margin-right: 8px; color: #ff6b6b;"
              type="primary"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">鉂わ笍</span>
              </template>
              璧炲姪
            </n-button>
            <n-button 
              size="small" 
              @click="showTipsModal = true"
              style="margin-right: 8px; color: #e67e22;"
              type="warning"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">馃挕</span>
              </template>
              娓╅Θ鎻愮ず
            </n-button>
            <n-button 
              size="small" 
              @click="showQQGroupModal = true"
              style="margin-right: 8px; color: #1890ff;"
              type="info"
              ghost
            >
              <template #icon>
                <span style="font-size: 14px;">馃懃</span>
              </template>
              QQ缇?            </n-button>
            <n-button 
              size="small" 
              @click="isTokenListExpanded = !isTokenListExpanded"
              :type="isTokenListExpanded ? 'primary' : 'default'"
            >
              {{ isTokenListExpanded ? '鏀惰捣' : '灞曞紑' }}
            </n-button>
          </template>
          <div v-if="isTokenListExpanded">
            <!-- 鍒嗙粍绠＄悊鍜岄€夋嫨 -->
            <div style="background: #f7f8fa; border-radius: 6px; padding: 8px; margin-bottom: 12px;">
              <n-space vertical style="width: 100%">
              <!-- 鍒嗙粍閫夋嫨閮ㄥ垎 -->
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
                  <label style="font-weight: 500; color: #333; font-size: 12px;">鍒嗙粍閫夋嫨</label>
                  <n-button
                    size="tiny"
                    type="error"
                    text
                    @click="clearAllGroupSelection"
                    style="font-size: 11px;"
                  >
                    涓€閿竻闄ゆ墍鏈夊垎缁勯€夋嫨
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

              <!-- 鍒嗙粍绠＄悊鎸夐挳 -->
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
                    绠＄悊鍒嗙粍
                  </n-button>
                  <n-button
                    type="primary"
                    size="small"
                    @click="navigateToAddToken"
                  >
                    娣诲姞Token
                  </n-button>
                  <n-button
                    type="primary"
                    size="small"
                    @click="refreshSelectedTokens"
                    :disabled="selectedTokens.length === 0"
                  >
                    鍒锋柊Token
                  </n-button>
                  <n-popconfirm
                    @positive-click="deleteSelectedTokens"
                    positive-text="纭畾鍒犻櫎"
                    negative-text="鍙栨秷"
                  >
                    <template #trigger>
                      <n-button
                        type="error"
                        size="small"
                        :disabled="selectedTokens.length === 0"
                      >
                        鍒犻櫎璐﹀彿
                      </n-button>
                    </template>
                    纭畾瑕佸垹闄ゅ凡閫夌殑 {{ selectedTokens.length }} 涓处鍙峰悧锛熻繖灏嗘柇寮€WebSocket杩炴帴骞舵竻闄ゅ叧鑱旂殑BIN鏁版嵁鍜屼换鍔￠厤缃紝鎿嶄綔涓嶅彲鎾ら攢銆?                  </n-popconfirm>
                  <n-popconfirm
                    @positive-click="resetSelectedTokensCache"
                    positive-text="纭閲嶇疆"
                    negative-text="鍙栨秷"
                  >
                    <template #trigger>
                      <n-button
                        type="warning"
                        size="small"
                        :disabled="selectedTokens.length === 0"
                      >
                        閲嶇疆缂撳瓨
                      </n-button>
                    </template>
                    纭畾瑕侀噸缃凡閫夎处鍙风殑鏈湴缂撳瓨鍚楋紵杩欏皢娓呴櫎localStorage缂撳瓨骞堕噸鏂板姞杞藉崱鐗囨暟鎹€?                  </n-popconfirm>
                </n-space>
                <span
                  v-if="selectedGroups.length > 0"
                  style="font-size: 12px; color: #86909c"
                >
                  宸查€夋嫨 {{ selectedGroups.length }} 涓垎缁勶紝鍖呭惈
                  {{ selectedTokens.length }} 涓处鍙?                </span>
              </div>
            </n-space>
            </div>
          </div>

          <!-- 鎺掑簭鎸夐挳缁?-->
          <div class="sort-buttons" style="margin-top: 16px; margin-bottom: 12px">
            <n-space align="center">
              <n-button-group size="small">
                <n-button
                  @click="toggleSort('name')"
                  :type="sortConfig.field === 'name' ? 'primary' : 'default'"
                >
                  鍚嶇О {{ getSortIcon("name") }}
                </n-button>
                <n-button
                  @click="toggleSort('server')"
                  :type="sortConfig.field === 'server' ? 'primary' : 'default'"
                >
                  鏈嶅姟鍣?{{ getSortIcon("server") }}
                </n-button>
                <n-button
                  @click="toggleSort('createdAt')"
                  :type="
                    sortConfig.field === 'createdAt' ? 'primary' : 'default'
                  "
                >
                  鍒涘缓鏃堕棿 {{ getSortIcon("createdAt") }}
                </n-button>
                <n-button
                  @click="toggleSort('lastUsed')"
                  :type="
                    sortConfig.field === 'lastUsed' ? 'primary' : 'default'
                  "
                >
                  鏈€鍚庝娇鐢?{{ getSortIcon("lastUsed") }}
                </n-button>
                <n-button
                  @click="toggleSort('monthly')"
                  :type="
                    sortConfig.field === 'monthly' ? 'primary' : 'default'
                  "
                >
                  鏈堝害鎺掑簭 {{ getSortIcon("monthly") }}
                </n-button>
              </n-button-group>
              
              <!-- 姣忚鏁伴噺璋冭妭 -->
              <div style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
                <span style="font-size: 12px; color: #666;">姣忚鏁伴噺:</span>
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
                <span v-if="!isMaximizedWindow" style="font-size: 12px; color: #999;">(鑷姩)</span>
              </div>
              
              <!-- 璐﹀彿鎼滅储妗?-->
              <div style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
                <span style="font-size: 12px; color: #666;">鎼滅储璐﹀彿:</span>
                <n-input 
                  v-model:value="tokenSearchKeyword" 
                  placeholder="杈撳叆璐﹀彿鍚嶇О鎼滅储..." 
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
                  鍏ㄩ€?                </n-checkbox>
                <div class="expand-collapse-buttons">
                  <div class="button-group">
                    <n-button size="small" @click="isTowerExpandedForAll = true">
                      灞曞紑闂叧
                    </n-button>
                    <n-button size="small" @click="isTowerExpandedForAll = false">
                      鏀惰捣闂叧
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isCarExpandedForAll = true">
                      灞曞紑璧涜溅
                    </n-button>
                    <n-button size="small" @click="isCarExpandedForAll = false">
                      鏀惰捣璧涜溅
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isClimbTowerExpandedForAll = true">
                      灞曞紑鐖
                    </n-button>
                    <n-button size="small" @click="isClimbTowerExpandedForAll = false">
                      鏀惰捣鐖
                    </n-button>
                  </div>
                  <div class="button-group">
                    <n-button size="small" @click="isWeirdTowerExpandedForAll = true">
                      灞曞紑鎬
                    </n-button>
                    <n-button size="small" @click="isWeirdTowerExpandedForAll = false">
                      鏀惰捣鎬
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
                    ? `姝ｅ湪鎵ц: ${currentRunningTokenName}`
                    : "鎵ц鏃ュ織"
                }}
                <span
                  style="margin-left: 12px; font-size: 12px; color: #86909c"
                >
                  {{ logs.length }}/{{ batchSettings.maxLogEntries || 1000 }}
                </span>
              </div>
              <div class="log-header-controls">
                <n-checkbox v-model:checked="autoScrollLog" size="small">
                  鑷姩婊氬姩
                </n-checkbox>
                <n-checkbox v-model:checked="filterErrorsOnly" size="small">
                  鍙湅閿欒
                </n-checkbox>
                <n-tag v-if="errorCount > 0" type="error" size="small">
                  {{ errorCount }} 涓敊璇?                </n-tag>
                <n-button size="small" @click="clearLogs"> 娓呯┖鏃ュ織 </n-button>
                <n-button size="small" @click="copyLogs"> 澶嶅埗鏃ュ織 </n-button>
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
      :title="`浠诲姟璁剧疆 - ${currentSettingsTokenName}`"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">绔炴妧鍦洪樀瀹?/label>
            <n-select
              v-model:value="currentSettings.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">鐖闃靛</label>
            <n-select
              v-model:value="currentSettings.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS闃靛</label>
            <n-select
              v-model:value="currentSettings.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">鍗佹闃靛</label>
            <n-select
              v-model:value="currentSettings.nightmareFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS娆℃暟</label>
            <n-select
              v-model:value="currentSettings.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">姣忔棩BOSS娆℃暟</label>
            <n-select
              v-model:value="currentSettings.dailyBossTimes"
              :options="dailyBossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">棰嗙綈瀛?/span
              ><n-switch v-model:value="currentSettings.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">棰嗘寕鏈?/span
              ><n-switch v-model:value="currentSettings.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">绔炴妧鍦?/span
              ><n-switch v-model:value="currentSettings.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">寮€瀹濈</span
              ><n-switch v-model:value="currentSettings.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">棰嗗彇閭欢濂栧姳</span
              ><n-switch v-model:value="currentSettings.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">榛戝競璐拱鐗╁搧</span
              ><n-switch v-model:value="currentSettings.blackMarketPurchase" />
            </div>
            <!-- 閲囪喘娓呭崟澶氶€?-->
            <div v-if="currentSettings.blackMarketPurchase" class="purchase-config-area">
              <div class="switch-row" style="margin-bottom: 6px;">
                <span class="switch-label">閲囪喘娆℃暟</span>
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
                  {{ syncPurchaseBusy ? '鍚屾涓?..' : '鍚屾鍒版父鎴? }}
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
                  <span class="discount-unit">鎶?/span>
                </label>
              </div>
            </div>
            <div class="switch-row">
              <span class="switch-label">浠樿垂鎷涘嫙</span
              ><n-switch v-model:value="currentSettings.payRecruit" />
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">鍔熸硶璧犻€侀獙璇佸瘑鐮?/label>
            <n-input
              v-model:value="currentSettings.legacyGiftPassword"
              placeholder="鐣欑┖鍒欎娇鐢ㄦ墜鍔ㄨ緭鍏?
              type="password"
              show-password-on="click"
              size="small"
            />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button type="primary" @click="saveSettings">淇濆瓨璁剧疆</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Task Template Modal -->
    <n-modal
      v-model:show="showTaskTemplateModal"
      preset="card"
      :title="currentTemplateId ? '缂栬緫浠诲姟妯℃澘' : '浠诲姟妯℃澘璁剧疆'"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">妯℃澘鍚嶇О</label>
            <n-input
              v-model:value="currentTemplateName"
              placeholder="璇疯緭鍏ユā鏉垮悕绉?
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">绔炴妧鍦洪樀瀹?/label>
            <n-select
              v-model:value="currentTemplate.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">鐖闃靛</label>
            <n-select
              v-model:value="currentTemplate.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS闃靛</label>
            <n-select
              v-model:value="currentTemplate.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">鍗佹闃靛</label>
            <n-select
              v-model:value="currentTemplate.nightmareFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS娆℃暟</label>
            <n-select
              v-model:value="currentTemplate.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">姣忔棩BOSS娆℃暟</label>
            <n-select
              v-model:value="currentTemplate.dailyBossTimes"
              :options="dailyBossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">棰嗙綈瀛?/span
              ><n-switch v-model:value="currentTemplate.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">棰嗘寕鏈?/span
              ><n-switch v-model:value="currentTemplate.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">绔炴妧鍦?/span
              ><n-switch v-model:value="currentTemplate.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">寮€瀹濈</span
              ><n-switch v-model:value="currentTemplate.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">棰嗗彇閭欢濂栧姳</span
              ><n-switch v-model:value="currentTemplate.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">榛戝競璐拱鐗╁搧</span
              ><n-switch v-model:value="currentTemplate.blackMarketPurchase" />
            </div>
            <!-- 閲囪喘娓呭崟澶氶€夛紙浠呭湪榛戝競璐拱寮€鍚椂鏄剧ず锛?-->
            <div v-if="currentTemplate.blackMarketPurchase" class="purchase-config-area">
              <div class="switch-row" style="margin-bottom: 6px;">
                <span class="switch-label">閲囪喘娆℃暟</span>
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
                  <span class="discount-unit">鎶?/span>
                </label>
              </div>
            </div>

            <div class="switch-row">
              <span class="switch-label">浠樿垂鎷涘嫙</span
              ><n-switch v-model:value="currentTemplate.payRecruit" />
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">鍔熸硶璧犻€侀獙璇佸瘑鐮?/label>
            <n-input
              v-model:value="currentTemplate.legacyGiftPassword"
              placeholder="鐣欑┖鍒欎娇鐢ㄦ墜鍔ㄨ緭鍏?
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
            >鍙栨秷</n-button
          >
          <n-button @click="saveTaskTemplate" type="primary">淇濆瓨妯℃澘</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Apply Template Modal -->
    <n-modal
      v-model:show="showApplyTemplateModal"
      preset="card"
      title="搴旂敤浠诲姟妯℃澘"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">閫夋嫨妯℃澘</label>
            <n-select
              v-model:value="selectedTemplateId"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="璇烽€夋嫨瑕佸簲鐢ㄧ殑妯℃澘"
              size="small"
              style="width: 100%"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">閫夋嫨璐﹀彿</label>
            
            <!-- 鍒嗙粍蹇€熼€夋嫨 -->
            <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
              <div style="font-size: 12px; color: #86909c; margin-bottom: 8px">
                蹇€熼€夋嫨鍒嗙粍锛?              </div>
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
                  鏆傛棤鍒嗙粍
                </div>
              </div>
            </div>

            <n-checkbox
              :checked="isAllSelectedForApply"
              :indeterminate="isIndeterminateForApply"
              @update:checked="handleSelectAllForApply"
            >
              鍏ㄩ€?            </n-checkbox>
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
          <n-button @click="showApplyTemplateModal = false">鍙栨秷</n-button>
          <n-button
            @click="applyTemplate"
            type="success"
            :disabled="
              !selectedTemplateId || selectedTokensForApply.length === 0
            "
            >搴旂敤妯℃澘</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- Template Manager Modal -->
    <n-modal
      v-model:show="showTemplateManagerModal"
      preset="card"
      title="浠诲姟妯℃澘绠＄悊"
      :bordered="false"
      style="width: 900px"
    >
      <div class="template-manager">
        <!-- 鎿嶄綔鏍?-->
        <div class="template-toolbar">
          <n-space>
            <n-button type="primary" @click="openNewTemplateModal">
              <template #icon>
                <n-icon><AddCircleOutline /></n-icon>
              </template>
              鏂板妯℃澘
            </n-button>
            <n-button type="success" @click="openApplyTemplateModal">
              <template #icon>
                <n-icon><CheckmarkCircleOutline /></n-icon>
              </template>
              搴旂敤妯℃澘
            </n-button>
            <n-button type="info" @click="openAccountTemplateModal">
              <template #icon>
                <n-icon><ListOutline /></n-icon>
              </template>
              寮曠敤缁熻
            </n-button>
            <n-divider vertical />
            <n-button @click="exportTaskTemplates" :loading="isExporting">
              <template #icon>
                <n-icon><CloudDownloadOutline /></n-icon>
              </template>
              瀵煎嚭
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
                瀵煎叆
              </n-button>
            </n-upload>
          </n-space>
          <n-input
            v-model:value="templateSearchKeyword"
            placeholder="鎼滅储妯℃澘鍚嶇О..."
            clearable
            size="small"
            style="width: 220px"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
        </div>

        <!-- 妯℃澘鍒楄〃 -->
        <div class="template-list-container">
          <n-empty
            v-if="filteredTaskTemplates.length === 0"
            description="鏆傛棤妯℃澘锛岀偣鍑讳笂鏂规寜閽垱寤虹涓€涓ā鏉?
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
                    {{ getTemplateAccountCount(template.id) }} 涓处鍙?                  </n-tag>
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
                      缂栬緫
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
                      鍒犻櫎
                    </n-button>
                  </n-space>
                </div>
              </template>
            </n-card>
          </div>
        </div>
      </div>

      <!-- 搴曢儴鎿嶄綔鏍?-->
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTemplateManagerModal = false">鍏抽棴</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Account Template References Modal -->
    <n-modal
      v-model:show="showAccountTemplateModal"
      preset="card"
      title="璐﹀彿妯℃澘寮曠敤鏌ョ湅"
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
            <span>鍏?{{ filteredAccountTemplates.length }} 涓处鍙?/span>
            <n-button
              @click="exportAccountReferences"
              type="default"
              size="small"
              :loading="isExporting"
              >瀵煎嚭寮曠敤</n-button
            >
            <n-upload
              :show-file-list="false"
              accept=".json"
              :custom-request="importAccountReferences"
            >
              <n-button type="default" size="small" :loading="isImporting">瀵煎叆寮曠敤</n-button>
            </n-upload>
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <label style="font-size: 12px; color: #86909c">鎸夋ā鏉跨瓫閫?</label>
            <n-select
              v-model:value="selectedTemplateForFilter"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="鍏ㄩ儴妯℃澘"
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
            鏆傛棤璐﹀彿鏁版嵁
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showAccountTemplateModal = false">鍏抽棴</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Legacy Gift Modal -->
    <n-modal
      v-model:show="showLegacyGiftModal"
      preset="card"
      title="鎵归噺鍔熸硶娈嬪嵎璧犻€?
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <!-- 鎺ユ敹鑰匢D杈撳叆 -->
          <div class="setting-item">
            <label class="setting-label">鎺ユ敹鑰匢D</label>
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
                鏌ヨ
              </n-button>
            </n-space>
            <n-text
              v-if="recipientIdError"
              type="error"
              style="margin-top: 5px; display: block"
            >
              {{ recipientIdError }}
            </n-text>
            <!-- 瀵嗙爜鐘舵€佹彁绀?-->
            <n-text
              v-if="passwordStatusMessage"
              :type="passwordStatusType"
              style="margin-top: 8px; display: block; font-size: 12px;"
            >
              {{ passwordStatusMessage }}
            </n-text>
          </div>

          <!-- 鎺ユ敹鑰呬俊鎭睍绀?-->
          <div class="setting-item" v-if="recipientInfo">
            <label class="setting-label">鎺ユ敹鑰呬俊鎭?/label>
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
              <!-- 澶村儚閮ㄥ垎 -->
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
                  alt="瑙掕壊澶村儚"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.3s ease;
                  "
                  @error="handleAvatarError"
                  @load="handleAvatarLoad"
                />
                <!-- 澶村儚鍔犺浇澶辫触鎴栨湭璁剧疆鏃剁殑 fallback -->
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
                  {{ (recipientInfo.name || "鏈煡瑙掕壊")[0] || "?" }}
                </div>
                <!-- 鍔犺浇鎸囩ず鍣?-->
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

              <!-- 瑙掕壊淇℃伅閮ㄥ垎 -->
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
                  {{ recipientInfo.name || "鏈煡瑙掕壊" }}
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
                      瑙掕壊ID
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
                      鏈嶅姟鍣?                    </div>
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
                      鎴樺姏
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
                      鍐涘洟
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionName || "鏃? }}
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
                      鍐涘洟ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionId || "鏃? }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        <!-- 鎿嶄綔鎸夐挳 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showLegacyGiftModal = false"
            style="margin-right: 12px"
            >鍙栨秷</n-button
          >
          <n-button
            type="primary"
            @click="confirmLegacyGift"
            :disabled="!recipientIdInput || !recipientInfo"
          >
            寮€濮嬭禒閫?          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Helper Modal (寮€绠?閽撻奔/鎷涘嫙/涓€閿疂绠卞懆寮€绠? -->
    <n-modal
      v-model:show="showHelperModal"
      preset="card"
      :title="helperModalTitle"
      style="width: 90%; max-width: 400px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item" v-if="helperType === 'box'">
            <label class="setting-label">瀹濈绫诲瀷</label>
            <n-select
              v-model:value="helperSettings.boxType"
              :options="boxTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'fish'">
            <label class="setting-label">楸肩绫诲瀷</label>
            <n-select
              v-model:value="helperSettings.fishType"
              :options="fishTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'pointsBox'">
            <label class="setting-label">鐩爣杞暟锛?-4杞紝姣忚疆8000绉垎锛?/label>
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
            <label class="setting-label" style="margin-bottom: 8px;">閫夋嫨瑕佽喘涔扮殑鍟嗗搧锛堟瘡绉嶅彧鑳借喘涔颁竴娆★級</label>
            <n-checkbox-group v-model:value="helperSettings.weeklyMarketItems">
              <n-space item-style="display: flex;" vertical>
                <n-checkbox value="0">鍏嶈垂閲戠爾</n-checkbox>
                <n-checkbox value="1">榛戝競瑙侀潰绀?/n-checkbox>
                <n-checkbox value="2">榛戝競鎯婂枩绀?/n-checkbox>
                <n-checkbox value="3">鍒濈骇榛戝競鍖?/n-checkbox>
                <n-checkbox value="4">涓骇榛戝競鍖?/n-checkbox>
                <n-checkbox value="5">楂樼骇榛戝競鍖?/n-checkbox>
                <n-checkbox value="6">椤剁骇楸肩鍖?/n-checkbox>
                <n-checkbox value="7">鐧界帀榛戝競鍖?/n-checkbox>
                <n-checkbox value="8">鐗圭骇鐏佃礉鍖?/n-checkbox>
                <n-checkbox value="9">鍏绘垚琛ョ粰鍖?/n-checkbox>
              </n-space>
            </n-checkbox-group>
          </div>
          <div class="setting-item" v-if="helperType === 'fragmentPack'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">閫夋嫨瑕佸紑鍚殑纰庣墖绀煎寘锛堝彲澶氶€夛級</label>
            <n-checkbox-group v-model:value="helperSettings.fragmentPackItems">
              <n-space item-style="display: flex;" vertical>
                <n-checkbox :value="3007">闅忔満绾㈠皢纰庣墖</n-checkbox>
                <n-checkbox :value="3005">闅忔満绱皢纰庣墖</n-checkbox>
                <n-checkbox :value="3006">闅忔満姗欏皢纰庣墖</n-checkbox>
                <n-checkbox :value="3008">绮鹃搧绂忚</n-checkbox>
                <n-checkbox :value="3009">杩涢樁鐭崇琚?/n-checkbox>
                <n-checkbox :value="3011">鐧界帀绂忚</n-checkbox>
                <n-checkbox :value="3012">鎵虫墜绂忚</n-checkbox>
                <n-checkbox :value="35011">璧涜溅鏀硅绀肩洅</n-checkbox>
                <n-checkbox :value="3001">閲戝竵绀煎寘</n-checkbox>
                <n-checkbox :value="3002">閲戠爾绀煎寘</n-checkbox>
                <n-checkbox :value="3010">鏅剁煶绂忚</n-checkbox>
                <n-checkbox :value="37005">鎬紓绀煎寘</n-checkbox>
              </n-space>
            </n-checkbox-group>
          </div>
          <n-alert v-if="helperType === 'fragmentPack'" type="info" style="margin-bottom: 12px">
            纰庣墖绀煎寘璇存槑锛?br/>
            鈥?寮€鍚处鍙疯儗鍖呬腑鎷ユ湁鐨勫搴旂ぜ鍖?br/>
            鈥?姣忕绀煎寘姣忔鏈€澶氬紑鍚?99涓紝瓒呭嚭鍒嗘壒寮€鍚?br/>
            鈥?鏈€変腑鍒欓粯璁ゅ紑鍚叏閮?2绉嶇ぜ鍖?          </n-alert>
          <n-alert v-if="helperType === 'weeklyMarket'" type="info" style="margin-bottom: 12px">
            榛戝競鍛ㄥ晢鍝佽鏄庯細<br/>
            鈥?姣忕鍟嗗搧姣忓懆鍙兘璐拱涓€娆?br/>
            鈥?娲诲姩ID: 9锛堥粦甯傚懆娲诲姩锛?br/>
            鈥?鑷姩璺宠繃宸茶喘涔扮殑鍟嗗搧
          </n-alert>
          <n-alert v-if="helperType === 'pointsBox'" :type="isBoxWeeklyActivityOpen ? 'info' : 'warning'" style="margin-bottom: 12px">
            <div v-if="isBoxWeeklyActivityOpen">
              寮€绠变紭鍏堢骇: 鏈ㄨ川瀹濈(淇濈暀200涓? 鈫?闈掗摐瀹濈 鈫?榛勯噾瀹濈 鈫?閾傞噾瀹濈<br/>
              绉垎: 鏈ㄨ川=1鍒? 闈掗摐=10鍒? 榛勯噾=20鍒? 閾傞噾=50鍒?br/>
              鎵ц娴佺▼: 鑾峰彇褰撳墠绉垎 鈫?璁＄畻缂哄皯绉垎 鈫?鎸夐『搴忓紑绠?鈫?棰嗗彇绉垎鍊煎疂绠?鈫?棰嗗彇瀹濈鍛ㄨ揪鏍囧鍔?            </div>
            <div v-else>
              鈿狅笍 褰撳墠涓嶆槸瀹濈鍛紝姝ゅ姛鑳戒粎鍦ㄥ疂绠卞懆鏈熼棿鍙敤
            </div>
          </n-alert>
          <div class="setting-item" v-if="helperType === 'cdk'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">鍏戞崲鐮?/label>
            <n-input
              v-model:value="helperSettings.cdkCode"
              placeholder="璇疯緭鍏ュ厬鎹㈢爜"
              size="small"
              clearable
            />
          </div>
          <div class="setting-item" v-if="helperType === 'cheer'" style="flex-direction: column; align-items: flex-start;">
            <label class="setting-label" style="margin-bottom: 8px;">鍔╁▉鏁伴噺锛? = 浣跨敤鍏ㄩ儴閬撳叿锛屼笂闄?000锛?/label>
            <n-input-number
              v-model:value="helperSettings.cheerQty"
              :min="0"
              :max="99999"
              :step="100"
              size="small"
              placeholder="0=鍏ㄩ儴浣跨敤"
            />
          </div>
          <div class="setting-item" v-if="helperType !== 'pointsBox' && helperType !== 'weeklyMarket' && helperType !== 'cdk' && helperType !== 'cheer'">
            <label class="setting-label">娑堣€楁暟閲忥紙10鐨勫€嶆暟锛?/label>
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
            >鍙栨秷</n-button
          >
          <n-button type="primary" @click="executeHelper">寮€濮嬫墽琛?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 鑻遍泟鍥涘湥鍗囩骇 Modal -->
    <n-modal
      v-model:show="showHeroFourSaintsModal"
      preset="card"
      title="鑻遍泟鍥涘湥鍗囩骇閰嶇疆"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="warning" show-icon style="margin-bottom: 12px">
            娉ㄦ剰锛氬洓鍦ｅ崌绾ф瘡娆″彧鑳介€夋嫨涓€涓嫳闆勮繘琛屽崌绾э紒<br/>
            濡傛灉鑻遍泟鏈紑鍚洓鍦ｆ垨缂哄皯绾㈢帀/钃濈帀锛屽皢鑷姩璺宠繃銆?          </n-alert>
          
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
          <n-button @click="showHeroFourSaintsModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeHeroFourSaintsUpgrade" :disabled="!selectedHeroSingle">寮€濮嬫墽琛?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 鐩愭櫠鍟嗗簵璐拱 Modal -->
    <n-modal
      v-model:show="showSaltCrystalShopModal"
      preset="card"
      title="鐩愭櫠鍟嗗簵璐拱閰嶇疆"
      style="width: 90%; max-width: 500px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 12px">
          鍕鹃€夐渶瑕佽喘涔扮殑鍟嗗搧骞惰缃鏁帮紝鐩愭櫠涓嶈冻鏃跺皢鑷姩鍋滄璐拱銆?        </n-alert>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="item in saltCrystalShopConfig" :key="item.id"
               style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <n-checkbox v-model:checked="item._checked"
                        @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }" />
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ item.name }}</div>
              <div style="font-size: 12px; color: #888;">{{ item.cost }}鐩愭櫠/娆?路 闄愯喘{{ item.limit }}娆?/div>
            </div>
            <n-input-number v-model:value="item.count" :min="0" :max="item.limit" size="small"
                            style="width: 100px;"
                            @update:value="(val) => { item._checked = val > 0; }" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showSaltCrystalShopModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeSaltCrystalShopBuy" :disabled="isRunning">寮€濮嬭喘涔?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 鐩愰敪鍟嗗簵璐拱 Modal -->
    <n-modal
      v-model:show="showSaltIngotShopModal"
      preset="card"
      title="鐩愰敪鍟嗗簵璐拱閰嶇疆"
      style="width: 90%; max-width: 500px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 12px">
          鍕鹃€夐渶瑕佽喘涔扮殑鍟嗗搧骞惰缃鏁帮紝鐩愰敪涓嶈冻鏃跺皢鑷姩鍋滄璐拱銆?        </n-alert>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="item in saltIngotShopConfig" :key="item.id"
               style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <n-checkbox v-model:checked="item._checked"
                        @update:checked="(checked) => { if (checked) item.count = item.count || 1; else item.count = 0; }" />
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ item.name }}</div>
              <div style="font-size: 12px; color: #888;">{{ item.cost }}鐩愰敪/娆?路 闄愯喘{{ item.limit }}娆?/div>
            </div>
            <n-input銆?number v-model:value="item.count" :min="0" :max="item.limit" size="small"
                            style="width: 100px;"
                            @update:value="(val) => { item._checked = val > 0; }" />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showSaltIngotShopModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeSaltIngotShopBuy" :disabled="isRunning">寮€濮嬭喘涔?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 澶氶€夎喘涔?Modal -->
    <n-modal
      v-model:show="showManualBuyModal"
      preset="card"
      title="榛戝競鍟嗗搧璐拱閰嶇疆"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 14px">
          鍕鹃€夐渶瑕佽喘涔扮殑鍟嗗搧骞惰缃鏁帮紝姣忚喘涔颁竴娆″皢鍒锋柊鍟嗗搧鍒楄〃銆?        </n-alert>
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
          宸查€?{{ manualBuyConfig.filter(i => i._checked && i.count > 0).length }} 涓晢鍝?        </div>
        <div class="modal-actions" style="margin-top: 16px; text-align: right">
          <n-button @click="showManualBuyModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeManualBuy" :disabled="isRunning">寮€濮嬭喘涔?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 鐝嶅疂闃佸晢搴楄喘涔?Modal -->
    <n-modal
      v-model:show="showCollectionExchangeModal"
      preset="card"
      title="鐝嶅疂闃佸晢搴楄喘涔伴厤缃?
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <n-alert type="info" show-icon style="margin-bottom: 14px">
          鍕鹃€夐渶瑕佽喘涔扮殑鍟嗗搧骞惰缃鏁帮紝浣跨敤鍥鹃壌绉垎鍏戞崲锛屾瘡鍛ㄩ檺璐€?        </n-alert>
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
          宸查€?{{ collectionExchangeConfig.filter(i => i._checked && i.count > 0).length }} 涓晢鍝?        </div>
        <div class="modal-actions" style="margin-top: 16px; text-align: right">
          <n-button @click="showCollectionExchangeModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeCollectionExchange" :disabled="isRunning">寮€濮嬭喘涔?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- 瀹濈鍛ㄨ嚜閫夊ぇ濂?Modal -->
    <n-modal
      v-model:show="showBoxWeeklyRewardModal"
      preset="card"
      title="瀹濈鍛ㄨ嚜閫夊ぇ濂栭厤缃?
      style="width: 90%; max-width: 700px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="info" show-icon style="margin-bottom: 12px">
            璇烽€夋嫨瑕侀鍙栫殑澶у锛屽苟涓烘瘡涓ぇ濂栬缃鍙栨鏁帮紙鎬昏鏈€澶?娆★級锛?br/>
            宸查厤缃? {{ totalBoxWeeklyRewardCount }}/4娆?          </n-alert>
          
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
                              placeholder="娆℃暟" />
              <span v-if="selectedBoxWeeklyRewards.includes(reward.value)" style="color: #666; font-size: 12px;">娆?/span>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showBoxWeeklyRewardModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="executeBoxWeeklyRewards" :disabled="totalBoxWeeklyRewardCount === 0 || totalBoxWeeklyRewardCount > 4">寮€濮嬫墽琛?/n-button>
        </div>
      </div>
    </n-modal>

    <!-- Dream Buy Modal -->
    <n-modal
      v-model:show="showDreamBuyModal"
      preset="card"
      title="姊﹀鍟嗗搧璐拱閰嶇疆"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="info" show-icon style="margin-bottom: 12px">
            璇峰嬀閫夐渶瑕佽喘涔扮殑鍟嗗搧銆傚彧浼氳喘涔板垪琛ㄤ腑瀛樺湪鐨勫晢鍝併€?          </n-alert>
          
          <div style="display: flex; gap: 12px; margin-bottom: 12px">
            <n-button size="small" type="warning" @click="selectGoldItems">
              涓€閿嬀閫夐噾甯佸晢鍝?            </n-button>
            <n-button size="small" @click="selectAllItems">
              鍏ㄩ€夋墍鏈?            </n-button>
            <n-button size="small" @click="clearAllItems">
              娓呯┖閫夋嫨
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
          <n-button @click="showDreamBuyModal = false" style="margin-right: 12px">鍙栨秷</n-button>
          <n-button type="primary" @click="saveDreamBuyConfig">淇濆瓨閰嶇疆</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Tasks List Modal -->
    <n-modal
      v-model:show="showTasksModal"
      preset="card"
      title="馃搵 瀹氭椂浠诲姟鍒楄〃"
      style="width: 95%; max-width: 850px;"
      :segmented="{ content: true }"
    >
      <!-- 鍏ㄥ眬鎿嶄綔鎸夐挳 -->
      <div v-if="scheduledTasks.length > 0" style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <n-button
          size="small"
          :type="allTasksEnabled ? 'error' : 'success'"
          @click="allTasksEnabled ? disableAllScheduledTasks() : enableAllScheduledTasks()"
        >
          {{ allTasksEnabled ? '鍏抽棴鎵€鏈変换鍔? : '鍚姩鎵€鏈変换鍔? }}
        </n-button>
        <n-button
          size="small"
          type="error"
          @click="deleteAllScheduledTasks"
        >
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
          鎵归噺鍒犻櫎鎵€鏈変换鍔?        </n-button>
      </div>
      <div class="tasks-list-container" style="max-height: 70vh; overflow-y: auto;">
        <n-empty 
          v-if="scheduledTasks.length === 0" 
          description="鏆傛棤瀹氭椂浠诲姟锛岀偣鍑讳笂鏂?鏂板浠诲姟'鎸夐挳鍒涘缓"
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
            <!-- 浠诲姟澶撮儴 -->
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
                <template #checked>绂佺敤</template>
                <template #unchecked>绂佺敤</template>
              </n-switch>
            </div>

            <!-- 浠诲姟淇℃伅 -->
            <div class="task-card-body">
              <div class="task-info-grid">
                <div class="task-info-item">
                  <span class="info-label">杩愯绫诲瀷</span>
                  <span class="info-value">
                    <n-tag size="small" :type="task.taskType === 'push_map' ? 'success' : (task.runType === 'daily' ? 'blue' : 'purple')" :bordered="false">
                      {{ task.taskType === 'push_map' ? '馃椇锔忔壒閲忔帹鍥? : (task.runType === "daily" ? "姣忓ぉ鍥哄畾鏃堕棿" : "Cron琛ㄨ揪寮?) }}
                    </n-tag>
                  </span>
                </div>

                <!-- 鎺ㄥ浘浠诲姟锛氬睍绀哄紑濮?鍋滄鏃堕棿 -->
                <template v-if="task.taskType === 'push_map'">
                  <div class="task-info-item">
                    <span class="info-label">寮€濮嬫椂闂?/span>
                    <span class="info-value code">{{ task.pushStartTime || task.runTime }}</span>
                  </div>
                  <div class="task-info-item" v-if="task.pushStopTime">
                    <span class="info-label">鍋滄鏃堕棿</span>
                    <span class="info-value code" style="color:#ff4d4f;">{{ task.pushStopTime }}</span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">涓嬫寮€濮?/span>
                    <span class="info-value countdown" :class="{'near-execution': taskCountdowns[task.id]?.isNearExecution, 'disabled': !task.enabled}">
                      {{ task.enabled ? (taskCountdowns[task.id]?.formatted || "璁＄畻涓?..") : "宸茬鐢? }}
                    </span>
                  </div>
                </template>

                <!-- 鏅€氫换鍔★細灞曠ず杩愯鏃堕棿/涓嬫鎵ц/璐﹀彿鏁?浠诲姟鏁?-->
                <template v-else>
                  <div class="task-info-item">
                    <span class="info-label">杩愯鏃堕棿</span>
                    <span class="info-value code">
                      {{ task.runType === "daily" ? task.runTime : task.cronExpression }}
                    </span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">涓嬫鎵ц</span>
                    <span class="info-value countdown" :class="{'near-execution': taskCountdowns[task.id]?.isNearExecution, 'disabled': !task.enabled}">
                      {{ task.enabled ? (taskCountdowns[task.id]?.formatted || "璁＄畻涓?..") : "宸茬鐢? }}
                    </span>
                  </div>
                  <div class="task-info-item">
                    <span class="info-label">閫変腑璐﹀彿</span>
                    <span class="info-value">
                      <n-tag size="small" type="info" :bordered="false">
                        {{ task.selectedTokens.length }} 涓?                      </n-tag>
                    </span>
                  </div>

                <div class="task-info-item">
                  <span class="info-label">閫変腑浠诲姟</span>
                  <span class="info-value">
                    <n-tag size="small" type="success" :bordered="false">
                      {{ task.selectedTasks.length }} 涓?                    </n-tag>
                  </span>
                </div>

                <div class="task-info-item" v-if="task.offlineTimeEnabled">
                  <span class="info-label">涓嶄笂绾挎椂娈?/span>
                  <span class="info-value">
                    <n-tag size="small" type="warning" :bordered="false">
                      宸插紑鍚?                    </n-tag>
                  </span>
                </div>
                
                <!-- 鍔╁▉鍟嗗簵閰嶇疆 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('legion_buy_store_items') && task.legionStoreItems">
                  <span class="info-label">鍔╁▉鍟嗗簵</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.legionStoreItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>

                <!-- 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楅厤缃?-->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchActivityExchange') && task.activityExchangeItems">
                  <span class="info-label">鍏戞崲鍟嗗簵</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.activityExchangeItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 鐩愭櫠鍟嗗簵閰嶇疆 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('salt_crystal_shop_buy') && task.saltCrystalShopItems">
                  <span class="info-label">鐩愭櫠鍟嗗簵</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.saltCrystalShopItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 鐩愰敪鍟嗗簵閰嶇疆 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('salt_ingot_shop_buy') && task.saltIngotShopItems">
                  <span class="info-label">鐩愰敪鍟嗗簵</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.saltIngotShopItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 榛戝競澶氶€夎喘涔伴厤缃?-->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('manual_buy') && task.manualBuyItems">
                  <span class="info-label">榛戝競澶氶€?/span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.manualBuyItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 鐝嶅疂闃佸晢搴楄喘涔伴厤缃?-->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('collection_exchange') && task.collectionExchangeItems">
                  <span class="info-label">鐝嶅疂闃佽喘涔?/span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.collectionExchangeItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 榛戝競鍛ㄨ喘涔伴厤缃?-->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('weekly_market_buy') && task.weeklyMarketItems">
                  <span class="info-label">榛戝競鍛ㄨ喘涔?/span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ Object.values(task.weeklyMarketItems).filter(i => i && i.selected).length }} 浠跺晢鍝?                    </n-tag>
                  </span>
                </div>
                
                <!-- 纰庣墖绀煎寘閰嶇疆 -->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchOpenFragmentPacks') && task.fragmentPackItems">
                  <span class="info-label">纰庣墖绀煎寘</span>
                  <span class="info-value">
                    <n-tag size="small" type="blue" :bordered="false">
                      {{ task.fragmentPackItems.length }} 绉嶇ぜ鍖?                    </n-tag>
                  </span>
                </div>
                
                <!-- 瀹濈鍛ㄥ鍔遍厤缃?-->
                <div class="task-info-item" v-if="task.selectedTasks && task.selectedTasks.includes('batchClaimBoxWeeklyRewards') && task.boxWeeklyRewards">
                  <span class="info-label">瀹濈鍛ㄥ鍔?/span>
                  <span class="info-value">
                    <n-tag size="small" type="orange" :bordered="false">
                      {{ Object.values(task.boxWeeklyRewards).reduce((sum, count) => sum + (count || 0), 0) }}/4娆?                    </n-tag>
                  </span>
                </div>
                </template><!-- end v-else normal task -->
              </div>
            </div><!-- end task-card-body -->

            <!-- 浠诲姟鎿嶄綔 -->
            <div class="task-card-footer">
              <n-button size="small" @click="editTask(task)">
                <template #icon>
                  <n-icon><CreateOutline /></n-icon>
                </template>
                缂栬緫
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
                绔嬪嵆鎵ц
              </n-button>
              <n-button size="small" type="error" @click="deleteTask(task.id)">
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
                鍒犻櫎
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
      :title="editingTask ? '缂栬緫瀹氭椂浠诲姟' : '鏂板瀹氭椂浠诲姟'"
      style="width: 95%; max-width: 650px;"
      :closable="true"
      :mask-closable="false"
      :segmented="{ content: true }"
      @close="showTaskModal = false"
    >
      <div class="task-form-container" style="max-height: 70vh; overflow-y: auto;">
        <!-- 鍩虹閰嶇疆鍖?-->
        <div class="form-section">
          <div class="section-title">馃搵 鍩虹閰嶇疆</div>
          <div class="settings-grid">
            <div class="setting-item">
              <label class="setting-label">浠诲姟鍚嶇О</label>
              <n-input
                v-model:value="taskForm.name"
                placeholder="璇疯緭鍏ヤ换鍔″悕绉?
                size="large"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">浠诲姟绫诲瀷</label>
              <n-radio-group v-model:value="taskForm.taskType">
                <n-radio-button value="normal">馃搶鏅€氫换鍔?/n-radio-button>
                <n-radio-button value="push_map">馃椇锔忔壒閲忔帹鍥?/n-radio-button>
              </n-radio-group>
            </div>
            
            <!-- 鎺ㄥ浘浠诲姟锛氬紑濮?/ 鍋滄鏃堕棿閰嶇疆 -->
            <template v-if="taskForm.taskType === 'push_map'">
              <div class="setting-item">
                <label class="setting-label">寮€濮嬫帹鍥炬椂闂?/label>
                <n-time-picker v-model:value="taskForm.pushStartTime" format="HH:mm" size="large" placeholder="閫夋嫨寮€濮嬫帹鍥炬椂鍒? />
              </div>
              <div class="setting-item">
                <label class="setting-label">鍋滄鎺ㄥ浘鏃堕棿 <span style="color:#999;font-size:12px;">(鍙笉濉?</span></label>
                <n-time-picker v-model:value="taskForm.pushStopTime" format="HH:mm" size="large" placeholder="閫夋嫨鍋滄鎺ㄥ浘鏃跺埢锛堝彲閫夛級" :clearable="true" />
              </div>
              <n-alert type="info" size="small">
                馃挰 鎺ㄥ浘浠诲姟浣跨敤銆屾壒閲忔帹鍥俱€嶅脊绐椾腑宸插嬀閫夌殑璐﹀彿銆傝鍏堝湪鎵归噺鎺ㄥ浘寮圭獥涓厤缃ソ鐏妸鍜岃处鍙凤紝鍐嶆坊鍔犳湰瀹氭椂浠诲姟銆?              </n-alert>
            </template>

            <!-- 鏅€氫换鍔★細杩愯绫诲瀷閫夋嫨 -->
            <template v-if="taskForm.taskType !== 'push_map'">
            <div class="setting-item">
              <label class="setting-label">杩愯绫诲瀷</label>
              <n-radio-group v-model:value="taskForm.runType" @update:value="resetRunType">
                <n-radio-button value="daily">姣忓ぉ鍥哄畾鏃堕棿</n-radio-button>
                <n-radio-button value="cron">Cron琛ㄨ揪寮?/n-radio-button>
              </n-radio-group>
            </div>
            
            <div class="setting-item" v-if="taskForm.runType === 'daily'">
              <label class="setting-label">杩愯鏃堕棿</label>
              <n-time-picker v-model:value="taskForm.runTime" format="HH:mm" size="large" />
            </div>
            
            <div class="setting-item" v-if="taskForm.runType === 'cron'">
              <label class="setting-label">Cron琛ㄨ揪寮?/label>
              <n-input
                v-model:value="taskForm.cronExpression"
                placeholder="渚? 0 9 * * * (姣忓ぉ9鐐规墽琛?"
                @input="parseCronExpression"
                size="large"
              />

              <!-- Cron琛ㄨ揪寮忚В鏋愮粨鏋?-->
              <div class="cron-parser" v-if="taskForm.cronExpression" style="margin-top: 12px;">
                <n-alert :type="cronValidation.valid ? 'success' : 'error'" size="small" style="margin-bottom: 8px;">
                  <template #icon>
                    <span>{{ cronValidation.valid ? '鉁? : '鉁? }}</span>
                  </template>
                  {{ cronValidation.message }}
                </n-alert>

                <!-- 鏈潵鎵ц鏃堕棿 -->
                <n-alert v-if="cronValidation.valid && cronNextRuns.length > 0" type="info" size="small">
                  <template #header>
                    <span style="font-size: 12px;">馃搮 鏈潵5娆℃墽琛屾椂闂?/span>
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
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
          <div class="section-title">馃懃 閫夋嫨璐﹀彿</div>
          
          <!-- 鎿嶄綔鎸夐挳 -->
          <div class="section-toolbar">
            <n-button-group size="small">
              <n-button @click="selectAllTokens">鍏ㄩ€?/n-button>
              <n-button @click="deselectAllTokens">鍏ㄤ笉閫?/n-button>
            </n-button-group>
          </div>

          <!-- 鍒嗙粍蹇€熼€夋嫨 -->
          <div class="group-selector" v-if="tokenGroups.length > 0">
            <div class="group-selector-header">
              <span class="group-selector-label">蹇€熼€夋嫨鍒嗙粍</span>
              <n-button type="primary" size="small" text @click="showGroupManageModal = true">
                <template #icon><n-icon><SettingsOutline /></n-icon></template>
                绠＄悊鍒嗙粍
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

          <!-- 璐﹀彿鍒楄〃 -->
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

        <!-- 浠诲姟閫夋嫨鍖?-->
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
          <div class="section-title">鈿欙笍 閫夋嫨浠诲姟</div>
          
          <!-- 鎿嶄綔鎸夐挳 -->
          <div class="section-toolbar">
            <n-button-group size="small">
              <n-button @click="selectAllTasks">鍏ㄩ€?/n-button>
              <n-button @click="deselectAllTasks">鍏ㄤ笉閫?/n-button>
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
                    <n-checkbox :value="task.value" size="large">{{ task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
              
              <n-tab-pane 
                v-if="groupedAvailableTasks['other'] && groupedAvailableTasks['other'].length > 0" 
                name="other" 
                tab="鍏朵粬"
              >
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8" style="padding-top: 12px;">
                  <n-grid-item v-for="task in groupedAvailableTasks['other']" :key="task.value">
                    <n-checkbox :value="task.value" size="large">{{ task.label }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-tab-pane>
            </n-tabs>
          </n-checkbox-group>
          
          <!-- 鍔╁▉鍟嗗簵璐拱閰嶇疆 -->
          <div v-if="taskForm.selectedTasks.includes('legion_buy_store_items')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃彧 鍔╁▉鍟嗗簵 - 閫夋嫨鍟嗗搧</span>
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>

          <!-- 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楄喘涔伴厤缃?-->
          <div v-if="taskForm.selectedTasks.includes('batchActivityExchange')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃彧 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴?- 閫夋嫨鍟嗗搧</span>
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
                      {{ item.name }} (闄愯喘{{ item.maxCount }})
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>

          <!-- 鐩愭櫠鍟嗗簵璐拱閰嶇疆 -->
          <div v-if="taskForm.selectedTasks.includes('salt_crystal_shop_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃 鐩愭櫠鍟嗗簵 - 閫夋嫨鍟嗗搧</span>
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>

          <!-- 鐩愰敪鍟嗗簵璐拱閰嶇疆 -->
          <div v-if="taskForm.selectedTasks.includes('salt_ingot_shop_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃 鐩愰敪鍟嗗簵 - 閫夋嫨鍟嗗搧</span>
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>

          <!-- 榛戝競澶氶€夎喘涔伴厤缃?-->
          <div v-if="taskForm.selectedTasks.includes('manual_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃洅 榛戝競澶氶€夎喘涔?- 閫夋嫨鍟嗗搧</span>
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>
          
          <!-- 鐝嶅疂闃佸晢搴楄喘涔伴厤缃?-->
          <div v-if="taskForm.selectedTasks.includes('collection_exchange')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃彌锔?鐝嶅疂闃佸晢搴楄喘涔?- 閫夋嫨鍟嗗搧</span>
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>
          
          <!-- 瀹濈杈炬爣濂栧姳鑷€夊ぇ濂栭厤缃?-->
          <div v-if="taskForm.selectedTasks.includes('batchClaimBoxWeeklyRewards')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃巵 瀹濈杈炬爣濂栧姳鑷€夊ぇ濂栭厤缃?/span>
            </div>
            <div class="config-card-content">
              <n-alert :type="isBoxWeeklyActivityOpen ? 'info' : 'warning'" size="small" style="margin-bottom: 12px;">
                <div v-if="isBoxWeeklyActivityOpen">
                  璇烽€夋嫨瑕侀鍙栫殑澶у锛屽苟涓烘瘡涓ぇ濂栬缃鍙栨鏁帮紙鎬昏鏈€澶?娆★級<br/>
                  <strong>宸查厤缃? {{ totalTaskBoxWeeklyRewardCount }}/4娆?/strong>
                </div>
                <div v-else>
                  鈿狅笍 褰撳墠涓嶆槸瀹濈鍛紝姝や换鍔″皢鍦ㄥ疂绠卞懆鏈熼棿鑷姩鎵ц
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
                      placeholder="娆℃暟" 
                    />
                  </div>
                </n-grid-item>
              </n-grid>
              
              <n-alert v-if="totalTaskBoxWeeklyRewardCount === 0" type="warning" size="small" style="margin-top: 12px;">
                璇疯嚦灏戦€夋嫨涓€涓鍔?              </n-alert>
            </div>
          </div>
          
          <!-- 榛戝競鍛ㄨ喘涔伴厤缃?-->
          <div v-if="taskForm.selectedTasks.includes('weekly_market_buy')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title"> 榛戝競鍛ㄨ喘涔?- 閫夋嫨鍟嗗搧</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                姣忕鍟嗗搧姣忓懆鍙兘璐拱涓€娆★紝娲诲姩ID: 9锛岃嚜鍔ㄨ烦杩囧凡璐拱鐨勫晢鍝?              </n-alert>
                        
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
                璇疯嚦灏戦€夋嫨涓€涓晢鍝?              </n-alert>
            </div>
          </div>
          
          <!-- 纰庣墖绀煎寘閰嶇疆 -->
          <div v-if="taskForm.selectedTasks.includes('batchOpenFragmentPacks')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃巵 纰庣墖绀煎寘 - 閫夋嫨寮€鍚殑绀煎寘</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                寮€鍚处鍙疯儗鍖呬腑鎷ユ湁鐨勫搴旂ぜ鍖咃紝姣忕绀煎寘姣忔鏈€澶氬紑鍚?99涓紝鏈厤缃椂榛樿鍏ㄩ噺寮€鍚?              </n-alert>
              <n-checkbox-group v-model:value="taskForm.fragmentPackItems">
                <n-grid :cols="taskGridCols" :x-gap="12" :y-gap="8">
                  <n-grid-item><n-checkbox :value="3007">闅忔満绾㈠皢纰庣墖</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3005">闅忔満绱皢纰庣墖</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3006">闅忔満姗欏皢纰庣墖</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3008">绮鹃搧绂忚</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3009">杩涢樁鐭崇琚?/n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3011">鐧界帀绂忚</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3012">鎵虫墜绂忚</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="35011">璧涜溅鏀硅绀肩洅</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3001">閲戝竵绀煎寘</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3002">閲戠爾绀煎寘</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="3010">鏅剁煶绂忚</n-checkbox></n-grid-item>
                  <n-grid-item><n-checkbox :value="37005">鎬紓绀煎寘</n-checkbox></n-grid-item>
                </n-grid>
              </n-checkbox-group>
            </div>
          </div>
          
          <!-- 鏅鸿兘鍙戣溅鏉′欢閰嶇疆 -->
          <div v-if="taskForm.selectedTasks.includes('batchSmartSendCar')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">馃殫 鏅鸿兘鍙戣溅 - 鍙戣溅鏉′欢</span>
              <n-switch v-model:value="taskForm.smartDeparture.enabled" size="small">
                <template #checked>鍚敤鑷畾涔?/template>
                <template #unchecked>浣跨敤鍏ㄥ眬璁剧疆</template>
              </n-switch>
            </div>
            <div class="config-card-content" v-if="taskForm.smartDeparture && taskForm.smartDeparture.enabled">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                鍚敤鍚庡皢瑕嗙洊鍏ㄥ眬璁剧疆涓殑鏅鸿兘鍙戣溅鏉′欢锛屼粎瀵规瀹氭椂浠诲姟鐢熸晥
              </n-alert>
              <div class="settings-grid-responsive">
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">鏈€浣庡搧璐?/label>
                  <n-select
                    v-model:value="taskForm.smartDeparture.carMinColor"
                    :options="[
                      { label: '缁柯锋櫘閫?, value: 1 },
                      { label: '钃澛风█鏈?, value: 2 },
                      { label: '绱峰彶璇?, value: 3 },
                      { label: '姗櫬蜂紶璇?, value: 4 },
                      { label: '绾⒙风璇?, value: 5 },
                      { label: '閲懧蜂紶濂?, value: 6 },
                    ]"
                    size="small"
                    class="input-responsive"
                  />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">閲戠爾 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.goldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">鎷涘嫙浠?>=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.recruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">鐧界帀 >=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.jadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive">鍒锋柊鍒?>=</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.ticketThreshold" :min="0" :step="1" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="鍒锋柊杞﹁締鍚庣瓑寰呮湇鍔＄鏁版嵁鍚屾鐨勫欢杩熸椂闂达紙绉掞級">鍒锋柊寤惰繜(绉?</label>
                  <n-input-number v-model:value="taskForm.smartDeparture.refreshDelay" :min="0" :max="30" :step="1" size="small" class="input-responsive" />
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="寮€鍚悗锛屾弧瓒宠嚜瀹氫箟鏉′欢(閲戠爾/鎷涘嫙浠?鐧界帀/鍒锋柊鍒?鏃讹紝杞﹁締杩樺繀椤昏揪鍒版渶浣庡搧璐ㄦ墠浼氬彂杞?>鍝佽川蹇呴』鍚屾椂婊¤冻</label>
                  <n-switch v-model:value="taskForm.smartDeparture.requireMinColorWithConditions" size="small">
                    <template #checked>寮€</template>
                    <template #unchecked>鍏?/template>
                  </n-switch>
                </div>
                <div class="setting-item-responsive">
                  <label class="setting-label-responsive" title="寮€鍚悗锛岃嚜鍔ㄥ彂杞︽病绁ㄦ椂浣跨敤閲戠爾鍒锋柊锛涘叧闂椂浣跨敤鍘熸湁閫昏緫">寮哄埗鐢ㄩ噾鐮栧埛鏂?/label>
                  <n-switch v-model:value="taskForm.smartDeparture.useGoldRefreshFallback" size="small">
                    <template #checked>寮€</template>
                    <template #unchecked>鍏?/template>
                  </n-switch>
                </div>
              </div>
            </div>
          </div>

          <!-- 鍗佹闃庣綏鎸戞垬棰勮閫夋嫨 -->
          <div v-if="taskForm.selectedTasks.includes('batchNightmareChallengePresets')" class="task-config-card">
            <div class="config-card-header">
              <span class="config-card-title">鈿旓笍 鍗佹闃庣綏鎸戞垬 - 閫夋嫨棰勮</span>
            </div>
            <div class="config-card-content">
              <n-alert type="info" size="small" style="margin-bottom: 12px;">
                閫夋嫨瑕佹墽琛岀殑鍗佹棰勮锛屾寜椤哄簭渚濇鎵ц锛堝悗鍙版ā寮忥級銆傚鏃犲彲閫夐璁撅紝璇峰厛鍦ㄥ崄娈挎寫鎴樺脊绐椾腑鍒涘缓棰勮
              </n-alert>
              <div v-if="nightmarePresetOptions.length > 0" class="nightmare-preset-list">
                <div v-for="preset in nightmarePresetOptions" :key="preset.id" class="nightmare-preset-item">
                  <n-checkbox
                    :checked="taskForm.nightmarePresetIds.includes(preset.id)"
                    @update:checked="(checked) => onNightmarePresetToggle(preset, checked)"
                  >
                    <span class="preset-item-label">
                      {{ preset.name }}
                      <n-tag size="tiny" type="info" :bordered="false" style="margin-left: 4px;">馃憫{{ preset.captainName }}</n-tag>
                      <n-tag size="tiny" :type="preset.totalMembers > 1 ? 'success' : 'default'" :bordered="false">
                        馃懃{{ preset.totalMembers }}浜?                      </n-tag>
                    </span>
                  </n-checkbox>
                </div>
              </div>
              <n-alert v-else type="warning" size="small">
                鏆傛棤鍙敤棰勮锛岃鍏堝湪銆屽崄娈挎寫鎴樸€嶅脊绐椾腑鍒涘缓棰勮
              </n-alert>
              <!-- 棰勮闂存墽琛屽欢杩熼厤缃?-->
              <div class="nightmare-delay-config" style="margin-top: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="white-space: nowrap; font-size: 13px;">棰勮闂撮殧锛?/span>
                <n-input-number
                  v-model:value="taskForm.nightmarePresetDelay"
                  :min="1"
                  :max="300"
                  :step="1"
                  size="small"
                  style="width: 100px;"
                />
                <span style="font-size: 13px; color: var(--text-secondary);">绉掞紙涓嬩竴涓璁惧惎鍔ㄥ墠鐨勭瓑寰呮椂闂达級</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 涓嶄笂绾挎椂娈靛紑鍏?-->
        <div class="form-section" v-if="taskForm.taskType !== 'push_map'">
          <div class="offline-time-section">
            <div class="offline-time-info">
              <div class="offline-time-title">馃毇 涓嶄笂绾挎椂娈?/div>
              <div class="offline-time-desc">
                鍛ㄤ笁05:00-07:00 / 鍛ㄥ叚19:50-21:10 / 鍛ㄦ棩19:50-20:40
              </div>
            </div>
            <n-switch
              v-model:value="taskForm.offlineTimeEnabled"
              size="large"
            >
              <template #checked>宸插紑鍚?/template>
              <template #unchecked>宸插叧闂?/template>
            </n-switch>
          </div>
        </div>
        
        <!-- 鎿嶄綔鎸夐挳 -->
        <div class="form-actions">
          <n-button @click="cancelTaskEdit" size="large">鍙栨秷</n-button>
          <n-button type="primary" @click="saveTask" size="large">淇濆瓨</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Batch Settings Modal -->
    <n-modal
      v-model:show="showBatchSettingsModal"
      preset="card"
      title="浠诲姟璁剧疆"
      style="width: 95%; max-width: 900px; max-height: 90vh"
    >
      <div class="settings-content" style="max-height: calc(90vh - 120px); overflow-y: auto; padding: 8px;">
        <!-- 鉁?鍝嶅簲寮忕綉鏍硷細鎵嬫満1鍒楋紝骞虫澘2鍒楋紝妗岄潰2鍒?-->
        <n-grid :cols="1" :x-gap="16" :y-gap="16" responsive="screen" :collapsed="false"
          :collapsed-rows="1" :x-gap-screen1="12" :x-gap-screen2="16"
        >
          <!-- 宸﹀垪锛氭壒閲忔搷浣滆缃?-->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 8px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃摝 鎵归噺鎿嶄綔璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">寮€绠辨暟閲?10鍊?</label>
                <n-input-number v-model:value="batchSettings.boxCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">閽撻奔鏁伴噺(10鍊?</label>
                <n-input-number v-model:value="batchSettings.fishCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎷涘嫙鏁伴噺(10鍊?</label>
                <n-input-number v-model:value="batchSettings.recruitCount" :min="10" :max="10000" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">榛樿瀹濈绫诲瀷</label>
                <n-select v-model:value="batchSettings.defaultBoxType" :options="boxTypeOptions" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">榛樿楸肩绫诲瀷</label>
                <n-select v-model:value="batchSettings.defaultFishType" :options="fishTypeOptions" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">涓€閿疂绠卞懆寮€绠辩洰鏍?/label>
                <n-input-number v-model:value="batchSettings.targetBoxPoints" :min="1" :max="1000000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">姊﹀鍟嗗搧璐拱閰嶇疆</label>
                <n-button size="small" @click="openDreamBuyModal" style="width: 100%;">鐐瑰嚮閰嶇疆</n-button>
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃殫 鏅鸿兘鍙戣溅鏉′欢(0涓轰笉闄愬埗)</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鍚敤鏉′欢妫€鏌?/label>
                <n-switch v-model:value="batchSettings.smartDepartureEnabled" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>寮€</template>
                  <template #unchecked>鍏?/template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">淇濆簳杞﹁締棰滆壊</label>
                <n-select
                  v-model:value="batchSettings.carMinColor"
                  :options="[
                    { label: '缁柯锋櫘閫?, value: 1 },
                    { label: '钃澛风█鏈?, value: 2 },
                    { label: '绱峰彶璇?, value: 3 },
                    { label: '姗櫬蜂紶璇?, value: 4 },
                    { label: '绾⒙风璇?, value: 5 },
                    { label: '閲懧蜂紶濂?, value: 6 },
                  ]"
                  size="small"
                  class="input-responsive"
                />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">閲戠爾 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureGoldThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎷涘嫙浠?>=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureRecruitThreshold" :min="0" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鐧界帀 >=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureJadeThreshold" :min="0" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鍒锋柊鍒?>=</label>
                <n-input-number v-model:value="batchSettings.smartDepartureTicketThreshold" :min="0" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="寮€鍚悗锛屾弧瓒宠嚜瀹氫箟鏉′欢(閲戠爾/鎷涘嫙浠?鐧界帀/鍒锋柊鍒?鏃讹紝杞﹁締杩樺繀椤昏揪鍒版渶浣庡搧璐ㄦ墠浼氬彂杞?>鍝佽川蹇呴』鍚屾椂婊¤冻</label>
                <n-switch v-model:value="batchSettings.requireMinColorWithConditions" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>寮€</template>
                  <template #unchecked>鍏?/template>
                </n-switch>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="寮€鍚悗锛岃嚜鍔ㄥ彂杞︽病绁ㄦ椂浣跨敤閲戠爾鍒锋柊锛涘叧闂椂浣跨敤鍘熸湁閫昏緫">寮哄埗鐢ㄩ噾鐮栧埛鏂?/label>
                <n-switch v-model:value="batchSettings.useGoldRefreshFallback" size="small" @update:value="autoSaveBatchSettings">
                  <template #checked>寮€</template>
                  <template #unchecked>鍏?/template>
                </n-switch>
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;"> 鍔熸硶璧犻€佽缃?/span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎺ユ敹鑰匢D</label>
                <n-input v-model:value="batchSettings.receiverId" placeholder="ID" size="small" class="input-responsive" :show-button="false" />
              </div>
            </div>
          </n-grid-item>
          
          <!-- 鍙冲垪锛氬欢杩熶笌杩炴帴璁剧疆 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 8px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">锔?寤惰繜璁剧疆(ms)</span>
              <n-button size="tiny" quaternary type="primary" @click="resetDelaySettings" style="margin-left: 8px;">
                鎭㈠榛樿
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鍛戒护寤惰繜</label>
                <n-input-number v-model:value="batchSettings.commandDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">浠诲姟闂村欢杩?/label>
                <n-input-number v-model:value="batchSettings.taskDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎿嶄綔寤惰繜</label>
                <n-input-number v-model:value="batchSettings.actionDelay" :min="100" :max="2000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎴樻枟寤惰繜</label>
                <n-input-number v-model:value="batchSettings.battleDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鍒锋柊寤惰繜</label>
                <n-input-number v-model:value="batchSettings.refreshDelay" :min="500" :max="6000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">闀垮欢杩?/label>
                <n-input-number v-model:value="batchSettings.longDelay" :min="1000" :max="13000" :step="500" size="small" class="input-responsive" />
              </div>
            </div>

            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃幆 鍔熻兘妯″潡寤惰繜(ms)</span>
              <n-button size="tiny" quaternary type="primary" @click="resetModuleDelays" style="margin-left: 8px;">
                鎭㈠榛樿
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鏃ュ父浠诲姟</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.daily" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">绔炴妧鍦?/label>
                <n-input-number v-model:value="batchSettings.moduleDelays.arena" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鐖/鎬</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.tower" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">榛戝競鍟嗗簵</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.store" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">瀹濆簱/姊﹀</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.treasure" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">娑堣€楁椿鍔?/label>
                <n-input-number v-model:value="batchSettings.moduleDelays.activity" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">淇变箰閮?/label>
                <n-input-number v-model:value="batchSettings.moduleDelays.club" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鑻遍泟鍗囩骇</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.hero" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">缃愬瓙</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.bottle" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鎸傛満/绛惧埌</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.hangup" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">榛樿</label>
                <n-input-number v-model:value="batchSettings.moduleDelays.default" :min="100" :max="10000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">鈴?瀹氭椂浠诲姟璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="鍕鹃€夊涓姛鑳戒换鍔℃椂锛屾瘡瀹屾垚涓€涓换鍔″悗绛夊緟鐨勬椂闂达紙绉掞級锛?涓轰笉绛夊緟">浠诲姟闂撮殧绛夊緟(绉?</label>
                <n-input-number v-model:value="batchSettings.taskIntervalWait" :min="0" :max="600" :step="10" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="瀹氭椂浠诲姟鎵ц鏃讹紝姣忓畬鎴愪竴鎵硅处鍙峰悗绛夊緟鐨勬椂闂达紙绉掞級锛?涓轰笉绛夊緟">鎵规闂寸瓑寰?绉?</label>
                <n-input-number v-model:value="batchSettings.batchIntervalWait" :min="0" :max="600" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃敆 杩炴帴璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鏈€澶у苟鍙戞暟</label>
                <n-input-number v-model:value="batchSettings.maxActive" :min="1" :max="20" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">杩炴帴瓒呮椂(ms)</label>
                <n-input-number v-model:value="batchSettings.connectionTimeout" :min="1000" :max="30000" :step="1000" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">閲嶈繛绛夊緟(ms)</label>
                <n-input-number v-model:value="batchSettings.reconnectDelay" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">鈿欙笍 楂樼骇閰嶇疆</span>
              <n-button size="tiny" quaternary type="primary" @click="resetAdvancedSettings" style="margin-left: 8px;">
                鎭㈠榛樿
              </n-button>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="API璋冪敤瓒呮椂鏃堕棿">榛樿鍛戒护瓒呮椂(ms)</label>
                <n-input-number v-model:value="batchSettings.defaultCommandTimeout" :min="3000" :max="15000" :step="500" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="鐖鎴樻枟瓒呮椂鏃堕棿">鎴樻枟鍛戒护瓒呮椂(ms)</label>
                <n-input-number v-model:value="batchSettings.battleCommandTimeout" :min="10000" :max="30000" :step="1000" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="榛樿閲嶈瘯娆℃暟">榛樿閲嶈瘯娆℃暟</label>
                <n-input-number v-model:value="batchSettings.defaultRetryCount" :min="0" :max="5" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="閲嶈瘯闂撮殧鏃堕棿">閲嶈瘯寤惰繜(ms)</label>
                <n-input-number v-model:value="batchSettings.retryDelay" :min="500" :max="180000" :step="500" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="璐﹀彿闂撮噸璇曢棿闅?>璐﹀彿閲嶈瘯闂撮殧(ms)</label>
                <n-input-number v-model:value="batchSettings.accountRetryInterval" :min="500" :max="60000" :step="500" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;"> 鎸傛満鏃堕棿鎺у埗</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="鏄惁鍚敤鎸傛満鏃堕棿鎺у埗">鍚敤鏃堕棿鎺у埗</label>
                <n-switch v-model:value="batchSettings.hangUpTimeControlEnabled" @update:value="autoSaveBatchSettings" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.hangUpTimeControlEnabled">
                <label class="setting-label-responsive" title="棰嗗彇鎸傛満濂栧姳鍜屽姞閽熺殑鏈€灏忔寕鏈烘椂闂?>鏈€灏忔寕鏈烘椂闂?灏忔椂)</label>
                <n-input-number v-model:value="batchSettings.hangUpMinTime" :min="1" :max="24" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃惥 瀹犵墿鍚堟垚璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="鏄惁鍚敤瀹犵墿鍚堟垚绛夌骇闄愬埗">鍚敤绛夌骇闄愬埗</label>
                <n-switch v-model:value="batchSettings.petMergeMaxLevelEnabled" @update:value="autoSaveBatchSettings" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.petMergeMaxLevelEnabled">
                <label class="setting-label-responsive" title="瀹犵墿鍚堟垚鏈€楂樼瓑绾э紝瓒呰繃姝ょ瓑绾у皢涓嶅啀鍚堟垚">鍚堟垚绛夌骇涓婇檺</label>
                <n-input-number v-model:value="batchSettings.petMergeMaxLevel" :min="1" :max="7" :step="1" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.petMergeMaxLevelEnabled" style="flex-basis: 100%; font-size: 11px; color: #999;">
                寮€鍚悗锛屽疇鐗╁悎鎴愬彧浼氳繘琛屽埌鎸囧畾绛夌骇锛屼緥濡傝缃负4鍒欏彧鍚堟垚鍒?绾х传鑹插疇鐗?              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">鈿旓笍 鎹㈢毊闂叧璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive">
                <label class="setting-label-responsive" title="杩炵画澶辫触澶氬皯娆″悗璺宠繃璇OSS">澶辫触娆℃暟涓婇檺</label>
                <n-input-number v-model:value="batchSettings.skinChallengeMaxFail" :min="1" :max="20" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
            
            <n-divider title-placement="left" style="margin: 16px 0 12px 0">
              <span style="font-size: 14px; font-weight: 600;">馃捇 绯荤粺璁剧疆</span>
            </n-divider>
            <div class="settings-grid-responsive">
              <div class="setting-item-responsive" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label class="setting-label-responsive" style="flex: 1;">鍒楄〃姣忚鏁伴噺</label>
                  <n-switch v-model:value="batchSettings.autoColumns" size="small" style="margin-right: 8px;" @update:value="autoSaveBatchSettings" />
                  <span style="font-size: 12px; color: #666;">鑷姩</span>
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
                  {{ batchSettings.autoColumns ? `鑷姩: ${responsiveColumns}鍒梎 : `鎵嬪姩: ${batchSettings.tokenListColumns}鍒梎 }}
                  {{ !isMaximizedWindow && !batchSettings.autoColumns ? ' (绐楀彛<1400px锛屽凡鑷姩鍒囨崲涓鸿嚜鍔ㄦā寮?' : '' }}
                </div>
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">鏈€澶ф棩蹇楁潯鐩?/label>
                <n-input-number v-model:value="batchSettings.maxLogEntries" :min="100" :max="5000" :step="100" size="small" class="input-responsive" />
              </div>
              <div class="setting-item-responsive">
                <label class="setting-label-responsive">瀹氭椂鍒锋柊椤甸潰</label>
                <n-switch v-model:value="batchSettings.enableRefresh" @update:value="autoSaveBatchSettings" />
              </div>
              <div class="setting-item-responsive" v-if="batchSettings.enableRefresh">
                <label class="setting-label-responsive">鍒锋柊闂撮殧(鍒嗛挓)</label>
                <n-input-number v-model:value="batchSettings.refreshInterval" :min="1" :max="1440" :step="1" size="small" class="input-responsive" />
              </div>
            </div>
          </n-grid-item>
        </n-grid>
        
        <div class="modal-actions" style="margin-top: 20px; text-align: right; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <n-button
            @click="showBatchSettingsModal = false"
            style="margin-right: 12px"
            >鍙栨秷</n-button
          >
          <n-button type="primary" @click="saveBatchSettings"
            >淇濆瓨璁剧疆</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- War Guess Modal -->
    <n-modal
      v-model:show="showWarGuessModal"
      preset="card"
      title="鏈堣禌鍔╁▉"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 16px">鎷嶆墜鍣?</span>
             <n-input-number v-model:value="warGuessCoin" placeholder="鎷嶆墜鍣? :min="1" :max="20" style="width: 120px" >
             </n-input-number>
             <n-button type="primary" @click="handleWarGuessCheer" :disabled="!selectedWarGuessLegionId || isRunning">
               鍔╁▉
             </n-button>
             <n-button @click="fetchWarGuessRank" :loading="warGuessLoading">
               鍒锋柊鏁版嵁
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
          <n-button @click="showWarGuessModal = false">鍏抽棴</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 鍔╁▉鍟嗗簵澶氶€夎喘涔板脊绐?-->
    <n-modal
      v-model:show="showLegionStoreModal"
      preset="card"
      title="鍔╁▉鍟嗗簵澶氶€夎喘涔?
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
            閫夋嫨瑕佽喘涔扮殑鍟嗗搧锛堝彲澶氶€夛級锛?          </div>
          <n-space vertical>
            <!-- 闅忔満绾㈠皢纰庣墖 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="7" v-model:checked="legionStoreSelections[7].selected" :disabled="legionStoreSelections[7].disabled">
                <span>闅忔満绾㈠皢纰庣墖 - 闄愯喘{{ legionStoreSelections[7].maxCount }}娆?/span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[7].count" 
                :min="1" 
                :max="legionStoreSelections[7].maxCount"
                :disabled="!legionStoreSelections[7].selected"
                size="small"
                style="width: 100px"
                placeholder="娆℃暟"
                @update:value="handleLegionStoreCountChange(7)"
              />
            </div>
            
            <!-- 鐧界帀 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="8" v-model:checked="legionStoreSelections[8].selected" :disabled="legionStoreSelections[8].disabled">
                <span>鐧界帀 - 闄愯喘{{ legionStoreSelections[8].maxCount }}娆?/span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[8].count" 
                :min="1" 
                :max="legionStoreSelections[8].maxCount"
                :disabled="!legionStoreSelections[8].selected"
                size="small"
                style="width: 100px"
                placeholder="娆℃暟"
                @update:value="handleLegionStoreCountChange(8)"
              />
            </div>
            
            <!-- 鍐涘洟甯?-->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="9" v-model:checked="legionStoreSelections[9].selected" :disabled="legionStoreSelections[9].disabled">
                <span>鍐涘洟甯?- 闄愯喘{{ legionStoreSelections[9].maxCount }}娆?/span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[9].count" 
                :min="1" 
                :max="legionStoreSelections[9].maxCount"
                :disabled="!legionStoreSelections[9].selected"
                size="small"
                style="width: 100px"
                placeholder="娆℃暟"
                @update:value="handleLegionStoreCountChange(9)"
              />
            </div>
            
            <!-- 杩涢樁鐭?-->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="10" v-model:checked="legionStoreSelections[10].selected" :disabled="legionStoreSelections[10].disabled">
                <span>杩涢樁鐭?- 闄愯喘{{ legionStoreSelections[10].maxCount }}娆?/span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[10].count" 
                :min="1" 
                :max="legionStoreSelections[10].maxCount"
                :disabled="!legionStoreSelections[10].selected"
                size="small"
                style="width: 100px"
                placeholder="娆℃暟"
                @update:value="handleLegionStoreCountChange(10)"
              />
            </div>
            
            <!-- 绮鹃搧 -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <n-checkbox :value="11" v-model:checked="legionStoreSelections[11].selected" :disabled="legionStoreSelections[11].disabled">
                <span>绮鹃搧 - 闄愯喘{{ legionStoreSelections[11].maxCount }}娆?/span>
              </n-checkbox>
              <n-input-number 
                v-model:value="legionStoreSelections[11].count" 
                :min="1" 
                :max="legionStoreSelections[11].maxCount"
                :disabled="!legionStoreSelections[11].selected"
                size="small"
                style="width: 100px"
                placeholder="娆℃暟"
                @update:value="handleLegionStoreCountChange(11)"
              />
            </div>
          </n-space>
        </div>
        
        <div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-size: 12px; color: #999;">
            宸查€?{{ Object.values(legionStoreSelections).filter(s => s.selected).length }} 涓晢鍝?          </div>
        </div>
        
        <div class="modal-actions" style="margin-top: 20px; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
          <n-button @click="showLegionStoreModal = false">鍙栨秷</n-button>
          <n-button 
            type="primary" 
            @click="handleLegionStoreBuy" 
            :disabled="Object.values(legionStoreSelections).filter(s => s.selected).length === 0 || isRunning"
          >
            寮€濮嬭喘涔?          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楀閫夎喘涔板脊绐?-->
    <n-modal
      v-model:show="showActivityExchangeModal"
      preset="card"
      title="娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楄喘涔?
      style="width: 90%; max-width: 700px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
            閫夋嫨瑕佽喘涔扮殑鍟嗗搧锛堝彲澶氶€夛級锛岃喘涔板悗鑷姩棰嗗彇閲岀▼纰戣繘搴﹀鍔憋細
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
                  placeholder="鏁伴噺"
                  @update:value="handleActivityExchangeCountChange(suffix)"
                />
                <n-tag v-else size="small" type="info" :bordered="false" style="font-size: 11px;">闄愯喘1</n-tag>
              </div>
            </n-grid-item>
          </n-grid>
        </div>

        <div style="margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-size: 12px; color: #999;">
            宸查€?{{ Object.values(activityExchangeSelections).filter(s => s.selected).length }} 涓晢鍝侊紝璐拱鍚庤嚜鍔ㄩ鍙栭噷绋嬬杩涘害濂栧姳
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 20px; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
          <n-button @click="showActivityExchangeModal = false">鍙栨秷</n-button>
          <n-button
            type="primary"
            @click="handleActivityExchangeBuy"
            :disabled="Object.values(activityExchangeSelections).filter(s => s.selected).length === 0 || isRunning"
          >
            寮€濮嬭喘涔?          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Token Group Management Modal -->
    <n-modal
      v-model:show="showGroupManageModal"
      preset="card"
      title="鍒嗙粍绠＄悊"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <!-- 瀵煎叆瀵煎嚭宸ュ叿 -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px; justify-content: flex-end">
          <n-button size="small" @click="exportGroups">
            瀵煎嚭鍒嗙粍
          </n-button>
          <n-button size="small" @click="triggerImportGroups">
            瀵煎叆鍒嗙粍
          </n-button>
        </div>
        
        <!-- 瀵煎叆鍒嗙粍鏂囦欢杈撳叆 -->
        <input
          ref="importFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImportFile"
        />
        
        <!-- 鍒涘缓鏂板垎缁?-->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          鍒涘缓鏂板垎缁?        </n-divider>
        <div style="margin-bottom: 24px">
          <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
            <n-input
              v-model:value="newGroupName"
              placeholder="杈撳叆鍒嗙粍鍚嶇О"
              style="width: 200px"
              size="small"
            />
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="font-size: 12px">閫夋嫨棰滆壊:</span>
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
              鍒涘缓鍒嗙粍
            </n-button>
          </div>
          
          <!-- 閫夋嫨鍖呭惈鐨勮处鍙?-->
          <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: bold;">鍖呭惈璐﹀彿 ({{ newGroupSelectedTokens.length }})</span>
              <n-space size="small">
                <n-button size="tiny" @click="selectAllNewGroup">鍏ㄩ€?/n-button>
                <n-button size="tiny" @click="deselectAllNewGroup">鍏ㄤ笉閫?/n-button>
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

        <!-- 鍒嗙粍鍒楄〃 -->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          鍒嗙粍鍒楄〃
        </n-divider>
        <!-- 鎵归噺鎿嶄綔宸ュ叿鏍?-->
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
            鍏ㄩ€?          </n-checkbox>
          <n-space>
            <span style="font-size: 12px; color: #86909c">
              宸查€?{{ batchDeleteSelectedGroupIds.length }} / {{ tokenGroups.length }}
            </span>
            <n-popconfirm
              @positive-click="batchDeleteGroups"
              positive-text="纭畾鍒犻櫎"
              negative-text="鍙栨秷"
            >
              <template #trigger>
                <n-button
                  size="small"
                  type="error"
                  :disabled="batchDeleteSelectedGroupIds.length === 0"
                >
                  鎵归噺鍒犻櫎 ({{ batchDeleteSelectedGroupIds.length }})
                </n-button>
              </template>
              纭畾鍒犻櫎閫変腑鐨?{{ batchDeleteSelectedGroupIds.length }} 涓垎缁勶紵鍒嗙粍涓殑璐﹀彿涓嶄細琚垹闄ゃ€?            </n-popconfirm>
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
                <!-- 缂栬緫妯″紡 -->
                <div
                  v-if="editingGroupId === group.id"
                  style="display: flex; gap: 8px"
                >
                  <n-input
                    v-model:value="editingGroupName"
                    placeholder="鍒嗙粍鍚嶇О"
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
                    淇濆瓨
                  </n-button>
                  <n-button
                    size="small"
                    @click="cancelEditGroup"
                    style="width: 60px"
                  >
                    鍙栨秷
                  </n-button>
                </div>
                <!-- 鏄剧ず妯″紡 -->
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
                      {{ getValidGroupTokenIds(group.id).length }} 涓处鍙?                    </n-tag>
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
                        脳
                      </n-button>
                    </div>
                  </div>
                  <!-- 娣诲姞token鍒板垎缁?-->
                  <div style="margin-bottom: 8px">
                    <n-select
                      placeholder="娣诲姞璐﹀彿鍒板垎缁?
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

              <!-- 鎿嶄綔鎸夐挳 -->
              <div
                style="display: flex; gap: 8px"
                v-if="editingGroupId !== group.id"
              >
                <n-button size="small" @click="startEditGroup(group.id)">
                  缂栬緫
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  @click="deleteGroup(group.id)"
                >
                  鍒犻櫎
                </n-button>
              </div>
            </div>
          </div>

          <div
            v-if="tokenGroups.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            鏆傛棤鍒嗙粍锛岃鍒涘缓涓€涓柊鍒嗙粍
          </div>
        </div>

        <!-- 鍏抽棴鎸夐挳 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showGroupManageModal = false; batchDeleteSelectedGroupIds = []">鍏抽棴</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 娣诲姞Token寮圭獥 -->
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
          <span class="add-token-title">娣诲姞娓告垙Token</span>
          <n-radio-group
            size="small"
            v-model:value="addTokenImportMethod"
            class="import-method-tabs"
          >
            <n-radio-button value="wxQrcode">寰俊鎵爜</n-radio-button>
            <n-radio-button value="bin">BIN澶氳鑹?/n-radio-button>
            <n-radio-button value="singlebin">BIN鍗曡鑹?/n-radio-button>
            <n-radio-button value="manual">鎵嬪姩杈撳叆</n-radio-button>
            <n-radio-button value="url">URL鑾峰彇</n-radio-button>
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

    <!-- 璧炲姪寮圭獥 -->
    <n-modal
      v-model:show="showSponsorModal"
      preset="card"
      title="璧炲姪鏀寔"
      style="width: 90%; max-width: 400px;"
      :bordered="false"
    >
      <div style="text-align: center; padding: 16px 0;">
        <p style="margin-bottom: 12px; color: #666; font-size: 14px;">鎰熻阿鎮ㄧ殑鏀寔锛佹壂鐮佽禐鍔╀綔鑰?鉂わ笍</p>
        <p style="margin-bottom: 16px; color: #e67e22; font-size: 13px; font-weight: 500;">璧炲姪10鍏冪殑灏忎紮浼磋鍦≦Q鑱旂郴鎴戦缃戦〉鐗堢函鍓嶇<br/>鑱旂郴鏂瑰紡锛?span style="font-weight: bold; color: #c0392b; letter-spacing: 1px;">1607863356</span></p>
        <img :src="sponsorQrcode" alt="璧炲姪浜岀淮鐮? style="max-width: 280px; width: 100%; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1);" />
      </div>
    </n-modal>

    <!-- QQ缇ゅ脊绐?-->
    <n-modal
      v-model:show="showQQGroupModal"
      preset="card"
      title="馃懃 鍔犲叆QQ缇?
      style="width: 90%; max-width: 420px;"
      :bordered="false"
    >
      <div style="text-align: center; padding: 16px 0;">
        <p style="margin-bottom: 16px; color: #333; font-size: 15px; font-weight: 500;">娆㈣繋鍔犲叆QQ缇や氦娴佺兢</p>
        <div style="background: linear-gradient(135deg, #e8f4ff, #f0e6ff); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https%3A%2F%2Fqm.qq.com%2Fq%2FPAPE6cThmw&margin=10"
            alt="QQ缇や簩缁寸爜"
            style="max-width: 240px; width: 100%; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);"
            @error="(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }"
          />
          <p style="display: none; color: #999; font-size: 13px; margin-bottom: 12px;">浜岀淮鐮佸姞杞藉け璐ワ紝璇风偣鍑讳笅鏂规寜閽姞缇?/p>
          <p style="font-size: 14px; color: #666; margin-bottom: 8px;">QQ缇ゅ彿</p>
          <p style="font-size: 28px; font-weight: bold; color: #1890ff; letter-spacing: 2px; margin-bottom: 12px;">723315066</p>
          <p style="font-size: 13px; color: #888;">銆愬捀楸间箣鐜嬪紑婧愩€?/p>
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
            <span style="font-size: 18px;">馃殌</span>
          </template>
          鍔犲叆缇よ亰
        </n-button>
        <p style="margin-top: 12px; color: #999; font-size: 12px;">鎵弿浜岀淮鐮佹垨鐐瑰嚮鎸夐挳鍔犲叆QQ缇?/p>
      </div>
    </n-modal>

    <!-- 娓╅Θ鎻愮ず寮圭獥 -->
    <n-modal
      v-model:show="showTipsModal"
      preset="card"
      title="馃挕 娓╅Θ鎻愮ず"
      style="width: 90%; max-width: 420px;"
      :bordered="false"
    >
      <div style="padding: 8px 0; font-size: 14px; line-height: 1.8; color: #333;">
        <p style="margin-bottom: 12px;">鏈蒋浠堕櫎浜?span style="color: #e67e22; font-weight: 500;">缃戦〉鐗?/span>锛?span style="color: #18a058; font-weight: 500;">鐢佃剳绔拰鎵嬫満绔潎鏄厤璐规彁渚?/span>銆傚鏋滄槸璐拱鑾峰彇鐨勶紝璇疯嚜琛岃仈绯昏喘涔板晢瀹躲€?/p>
        <p style="margin-bottom: 12px;">璇ヨ蒋浠舵牴鎹紑婧愯繘琛屽紑鍙戙€?/p>
        <div style="background: #f7f8fa; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
          <p style="margin-bottom: 6px;"><span style="color: #c0392b; font-weight: bold;">1.</span> 鏃犱娇鐢ㄨ鏄庯紝璇疯嚜琛岀爺绌躲€?/p>
          <p><span style="color: #c0392b; font-weight: bold;">2.</span> 鏈蒋浠舵壙璇轰笉瀛樺湪浠讳綍鏁版嵁涓婁紶琛屼负銆?/p>
        </div>
        <div style="background: linear-gradient(135deg, #e8f4ff, #f0e6ff); border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; text-align: center;">
          <p style="margin-bottom: 6px; color: #1890ff; font-weight: 500;">馃懃 鍔犲叆QQ缇わ細723315066</p>
          <a href="https://qm.qq.com/q/PAPE6cThmw" target="_blank" style="color: #1890ff; font-size: 13px; text-decoration: underline;">鐐瑰嚮鍔犲叆銆愬捀楸间箣鐜嬪紑婧愩€戠兢鑱?鈫?/a>
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 8px;">鏈蒋浠朵粎渚涗釜浜洪潪鍟嗕笟瀛︿範浣跨敤</p>
      </div>
    </n-modal>

    <!-- 鍗佹闃庣綏鎸戞垬缁勯槦寮圭獥 -->
    <n-modal
      v-model:show="showNightmareChallengeModal"
      preset="card"
      title="鍗佹闃庣綏鎸戞垬"
      style="width: 90%; max-width: 760px"
      :bordered="true"
      :segmented="{ content: true, footer: true }"
      :closable="true"
      :mask-closable="true"
    >
      <NightmareChallengeCard />
    </n-modal>

    <!-- 鏄熺骇闃熶紞绠＄悊寮圭獥 -->
    <n-modal
      v-model:show="showStarTeamModal"
      preset="card"
      title="鏄熺骇闃熶紞绠＄悊"
      style="width: 90%; max-width: 800px"
      :bordered="true"
      :segmented="{ content: true, footer: true }"
      :closable="true"
      :mask-closable="true"
    >
      <StarTeamCard />
    </n-modal>

    <!-- 鎵归噺閲囪喘娓呭崟閰嶇疆寮圭獥 -->
    <n-modal
      v-model:show="showBatchPurchaseConfigModal"
      preset="card"
      title="鎵归噺鍚屾閲囪喘娓呭崟"
      style="width: 90%; max-width: 560px"
    >
      <div class="settings-content">
        <div style="margin-bottom: 12px; color: var(--text-secondary, #666); font-size: 13px;">
          鍕鹃€夎閲囪喘鐨勫晢鍝佸苟璁剧疆鎶樻墸锛岀‘璁ゅ悗鍚屾鍒版墍鏈夊凡鍕鹃€夌殑 {{ selectedTokens.length }} 涓处鍙?        </div>
        <div class="switch-row" style="margin-bottom: 10px;">
          <span class="switch-label">閲囪喘娆℃暟</span>
          <n-input-number
            v-model:value="batchPurchaseCnt"
            :min="1" :max="15" :step="1"
            size="small" style="width: 80px;"
          />
          <n-button
            size="small"
            style="margin-left: auto;"
            @click="batchPurchaseList = purchaseItemOptions.map(i => i.itemId)"
          >鍏ㄩ€?/n-button>
          <n-button
            size="small"
            style="margin-left: 6px;"
            @click="batchPurchaseList = []"
          >娓呯┖</n-button>
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
            <span class="discount-unit">鎶?/span>
          </label>
        </div>
        <div style="margin-top: 16px; text-align: right;">
          <n-button @click="showBatchPurchaseConfigModal = false" style="margin-right: 12px;">鍙栨秷</n-button>
          <n-button type="primary" @click="applyBatchPurchaseConfig" :loading="batchPurchaseSyncing">
            鍚屾鍒?{{ selectedTokens.length }} 涓处鍙?          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 娑堣€楁椿鍔ㄥ脊绐?-->
    <n-modal
      v-model:show="showConsumeModal"
      preset="card"
      title="娑堣€楁椿鍔?
      style="width: 95%; max-width: 900px"
      :segmented="{ content: true }"
    >
      <ConsumeActivityCard />
    </n-modal>

    <!-- 鎵归噺鎺ㄥ浘寮圭獥 -->
    <n-modal
      v-model:show="showPushMapModal"
      preset="card"
      class="push-modal"
      style="width: 95%; max-width: 780px"
      :segmented="{ content: true }"
    >
      <template #header>
        <div style="display:flex;align-items:center;gap:8px;">
          <span>鎵归噺鎺ㄥ浘</span>
          <n-tag v-if="pushTimerStatus !== 'idle'" size="tiny" type="success" style="font-size:11px;">
            鈴板畾鏃朵腑 {{ pushTimerCountdown }}
          </n-tag>
        </div>
      </template>
      <div class="push-layout">
        <!-- 椤堕儴宸ュ叿鏍?-->
        <div class="push-toolbar">
          <!-- 璐﹀彿閫夋嫨鍖哄煙锛堟爣绛惧紡甯冨眬锛?-->
          <div class="push-account-selector">
            <!-- 宸查€夎处鍙锋爣绛?-->
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
            <span v-else class="push-no-selection">鏈€夋嫨璐﹀彿</span>

            <!-- 鎼滅储妗?-->
            <n-input
              v-model:value="pushSearchQuery"
              placeholder="鎼滅储璐﹀彿..."
              size="small"
              clearable
              class="push-search-input"
            >
              <template #prefix>馃攳</template>
            </n-input>

            <!-- 鍙€夎处鍙风綉鏍?-->
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

            <!-- 鎿嶄綔鎸夐挳 -->
            <div class="push-account-actions">
              <n-button size="tiny" secondary @click="pushSelectAll">鍏ㄩ€?/n-button>
              <n-button size="tiny" secondary @click="pushClearAll">鍙栨秷鍏ㄩ€?/n-button>
              <span class="push-select-count">{{ pushSelectedTokens.length }} / {{ pushTokenOptions.length }}</span>
            </div>
          </div>
          <div class="push-toolbar-row">
            <div class="push-torch-group">
              <n-select
                v-model:value="pushTorchType"
                :options="[
                  { label: '涓嶄娇鐢ㄧ伀鎶?, value: 0 },
                  { label: '馃敟 鏈ㄦ潗(10min)', value: 1008 },
                  { label: '馃敟 闈掗摐(20min)', value: 1009 },
                  { label: '馃敟 鍜哥(30min)', value: 1010 },
                ]"
                size="small"
                class="push-torch-select"
              />
              <n-input-number
                v-model:value="pushTorchCount"
                :min="1"
                :max="99"
                size="small"
                placeholder="鏁伴噺"
                class="push-torch-count"
              />
              <n-button size="small" type="warning" @click="pushUseTorchManual" :disabled="!pushSelectedTokens.length || !pushTorchType" class="push-torch-btn">
                浣跨敤鐏妸
              </n-button>
            </div>
            <div class="push-toolbar-right">
              <n-button size="small" type="success" @click="pushStartAll" :disabled="!pushSelectedTokens.length" class="push-action-btn">
                鍏ㄩ儴寮€濮?              </n-button>
              <n-button size="small" type="error" @click="pushStopAll" class="push-action-btn">
                鍏ㄩ儴鍋滄
              </n-button>
            </div>
          </div>
        </div>

        <!-- 瀹氭椂鎺у埗妯″潡 -->
        <div class="push-timer-section">
          <div class="push-timer-header" @click="pushTimerExpanded = !pushTimerExpanded">
            <span class="push-timer-title">鈴?瀹氭椂鎺у埗</span>
            <n-tag v-if="pushTimerStatus !== 'idle'" size="tiny" :type="pushTimerStatus === 'running' ? 'success' : 'warning'">
              {{ pushTimerStatus === 'running' ? '瀹氭椂涓? : '寰呮満涓? }}
            </n-tag>
            <span class="push-timer-countdown" v-if="pushTimerCountdown">
              {{ pushTimerCountdown }}
            </span>
            <span class="push-timer-toggle">{{ pushTimerExpanded ? '鈻? : '鈻? }}</span>
          </div>

          <div v-show="pushTimerExpanded" class="push-timer-body">
            <!-- 鍚姩瀹氭椂 -->
            <div class="push-timer-row">
              <span class="push-timer-label">鑷姩寮€濮?/span>
              <div class="push-timer-controls">
                <n-time-picker
                  v-model:value="pushStartTime"
                  format="HH:mm"
                  :actions="[]"
                  :hours="pushTimeHours"
                  :minutes="pushTimeMinutes"
                  placeholder="閫夋嫨寮€濮嬫椂闂?
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
                  {{ pushStartTimer ? '鍙栨秷寮€濮嬪畾鏃? : '鍚姩瀹氭椂' }}
                </n-button>
              </div>
            </div>

            <!-- 鍋滄瀹氭椂 -->
            <div class="push-timer-row">
              <span class="push-timer-label">鑷姩鍋滄</span>
              <div class="push-timer-controls">
                <n-time-picker
                  v-model:value="pushStopTime"
                  format="HH:mm"
                  :actions="[]"
                  :hours="pushTimeHours"
                  :minutes="pushTimeMinutes"
                  placeholder="閫夋嫨鍋滄鏃堕棿"
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
                  {{ pushStopTimer ? '鍙栨秷鍋滄瀹氭椂' : '鍋滄瀹氭椂' }}
                </n-button>
              </div>
            </div>

            <!-- 瀹氭椂鐘舵€佹彁绀?-->
            <div class="push-timer-tips" v-if="pushStartTimer || pushStopTimer">
              <span v-if="pushStartTimer">馃煝 灏嗕簬 <strong>{{ pushStartTimeLabel }}</strong> 鑷姩寮€濮嬫帹鍥?/span>
              <span v-if="pushStopTimer">馃敶 灏嗕簬 <strong>{{ pushStopTimeLabel }}</strong> 鑷姩鍋滄鎺ㄥ浘</span>
            </div>
          </div>
        </div>

        <!-- 缁熻鏍?-->
        <div v-if="pushCards.length" class="push-stats">
          <span class="push-stats-running">姝ｅ湪鎺ㄥ叧锛?strong>{{ pushCards.filter(c => c.running).length }}</strong> 浜?/span>
          <span class="push-stats-detail">
            鎬昏锛歿{ pushCards.length }} 浜?|
            <span class="stat-win-inline">{{ pushCards.reduce((s,c) => s + (c.wins||0), 0) }} 鑳?/span> |
            <span class="stat-loss-inline">{{ pushCards.reduce((s,c) => s + (c.losses||0), 0) }} 璐?/span>
          </span>
        </div>

        <!-- 鎴樻枟鍗＄墖鍖哄煙 - 涓ゅ垪缃戞牸 -->
        <div v-if="pushCards.length" class="push-cards-grid">
          <div v-for="card in pushCards" :key="card.id" class="push-card" :class="{ 'push-card--running': card.running }">
            <!-- 绱у噾澶撮儴锛氫竴琛屾樉绀烘墍鏈変俊鎭?-->
            <div class="push-card-head">
              <span class="push-status-dot" :class="card.running ? 'dot-active' : 'dot-idle'"></span>
              <span class="push-card-title">{{ card.name }}</span>
              <span class="push-card-level" v-if="card.level">Lv.{{ card.level }}</span>
              <span class="push-card-boss" v-if="card.bossNm">{{ card.bossNm }}</span>
              <span class="push-card-stats">
                <span class="push-stat push-stat-win">{{ card.wins }}鑳?/span>
                <span class="push-stat push-stat-loss">{{ card.losses }}璐?/span>
              </span>
              <n-button v-if="card.running" size="tiny" quaternary type="error" @click="pushToggleOne(card.id)" class="push-card-stop">鈻?/n-button>
              <n-button v-else size="tiny" quaternary type="success" @click="pushToggleOne(card.id)" class="push-card-stop">鈻?/n-button>
            </div>
            <!-- 杩涘害鏉?鍊掕鏃讹紙浠呰繍琛屾椂鏄剧ず锛?-->
            <div class="push-card-progress" v-if="card.running && card.totalTime > 0">
              <n-progress
                type="line"
                :percentage="Math.round((1 - card.countdown / card.totalTime) * 100)"
                :show-indicator="false"
                :height="6"
                :color="card.countdown < 10 ? '#f0a020' : '#2080f0'"
                rail-color="#eef1f5"
              />
              <span class="push-card-timer">{{ Math.floor(card.countdown / 60) }}:{{ String(Math.floor(card.countdown % 60)).padStart(2, '0') }}<span class="push-timer-sep">/</span>{{ Math.floor(card.totalTime / 60) }}:{{ String(Math.floor(card.totalTime % 60)).padStart(2, '0') }}</span>
            </div>
          </div>
        </div>
        <div v-else class="push-empty">
          <span>閫夋嫨璐﹀彿鍚庣偣鍑汇€屽叏閮ㄥ紑濮嬨€?/span>
        </div>

        <!-- 鏃ュ織鍖哄煙锛堝彲鎶樺彔锛?-->
        <div class="push-logs-section">
          <div class="push-logs-header" @click="pushLogsCollapsed = !pushLogsCollapsed" style="cursor: pointer;">
            <span class="push-logs-title">鎺ㄥ浘鏃ュ織</span>
            <div class="push-logs-header-actions">
              <n-button text size="tiny" @click.stop="pushLogs = []">娓呯┖</n-button>
              <span class="push-logs-arrow" :class="{ 'push-logs-arrow--collapsed': pushLogsCollapsed }">鈻?/span>
            </div>
          </div>
          <div v-show="!pushLogsCollapsed" class="push-logs-list">
            <div v-for="(log, i) in pushLogs.slice(0, 100)" :key="i" class="push-log-item" :class="'log-' + log.type">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
            <div v-if="!pushLogs.length" class="push-logs-empty">鏆傛棤鏃ュ織</div>
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

// Import Token瀵煎叆琛ㄥ崟缁勪欢锛堢敤浜庢坊鍔燭oken寮圭獥锛?import ManualTokenForm from "@/views/TokenImport/manual.vue";
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

// 鎺掑簭閰嶇疆锛堜粠localStorage璇诲彇锛屼笌TokenImport鍏变韩锛?const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 鎺掑簭瀛楁锛歯ame, server, createdAt, lastUsed
        direction: "asc", // 鎺掑簭鏂瑰悜锛歛sc, desc
      },
);

// 鑷畾涔塗oken鎺掑簭
const tokenOrder = ref([]);

// 鍔犺浇淇濆瓨鐨凾oken鎺掑簭
const loadSavedTokenOrder = async () => {
  tokenOrder.value = await loadTokenOrder();
};

// 璁＄畻灞炴€?- 浠巊ameData涓幏鍙栧鐩稿叧淇℃伅
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

// 鎺掑簭鍚庣殑娓告垙瑙掕壊Token鍒楄〃
const sortedTokens = computed(() => {
  let tokens = [...tokenStore.gameTokens];
  
  // 鎼滅储杩囨护
  if (tokenSearchKeyword.value.trim()) {
    const keyword = tokenSearchKeyword.value.trim().toLowerCase();
    tokens = tokens.filter(token => 
      token.name?.toLowerCase().includes(keyword) ||
      token.server?.toLowerCase().includes(keyword) ||
      token.id?.toLowerCase().includes(keyword)
    );
  }
  
  // 妫€鏌ユ槸鍚︽湁鑷畾涔夋帓搴?  const customOrder = tokenOrder.value;
  if (customOrder && customOrder.length > 0) {
    // 搴旂敤鑷畾涔夋帓搴?    tokens.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      
      // 濡傛灉涓や釜token閮藉湪鑷畾涔夋帓搴忎腑锛屾寜鐓ц嚜瀹氫箟椤哄簭
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // 濡傛灉鍙湁a鍦ㄨ嚜瀹氫箟鎺掑簭涓紝a鎺掑墠闈?      if (indexA !== -1) return -1;
      
      // 濡傛灉鍙湁b鍦ㄨ嚜瀹氫箟鎺掑簭涓紝b鎺掑墠闈?      if (indexB !== -1) return 1;
      
      // 閮戒笉鍦ㄨ嚜瀹氫箟鎺掑簭涓紝鎸夊悕绉版帓搴?      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // 浣跨敤榛樿鎺掑簭
    tokens = tokens.sort((tokenA, tokenB) => {
      let valueA, valueB;

      // 鏍规嵁鎺掑簭瀛楁鑾峰彇姣旇緝鍊?      switch (sortConfig.value.field) {
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
          // 鏈堝害鎺掑簭锛氭牴鎹珵鎶€鍦哄拰閽撻奔鐨勬湭瀹屾垚杩涘害鎺掑簭
          // 鏈畬鎴愯繘搴﹁秺澶氾紙璺濈鐩爣瓒婅繙锛夎秺闈犲墠
          const gameDataA = tokenStore.getTokenGameData(tokenA.id);
          const gameDataB = tokenStore.getTokenGameData(tokenB.id);
          const monthDataA = gameDataA?.monthActivity;
          const monthDataB = gameDataB?.monthActivity;
          
          // 璁＄畻鏈堝害鏈畬鎴愯繘搴?          const calculateMonthlyNeed = (data) => {
            if (!data) return 999999; // 鏃犳暟鎹殑鎺掓渶鍚?            
            const FISH_TARGET = 320;
            const ARENA_TARGET = 240;
            
            // 鑾峰彇褰撳墠杩涘害
            const myMonthInfo = data.myMonthInfo || {};
            const myArenaInfo = data.myArenaInfo || {};
            const fishNum = Number(myMonthInfo?.["2"]?.num || 0);
            const arenaNum = Number(myArenaInfo?.num || 0);
            
            // 璁＄畻褰撳墠搴旇瀹屾垚鐨勮繘搴︼紙鏍规嵁鏃ユ湡姣斾緥锛?            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const dayOfMonth = now.getDate();
            const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
            const monthProgress = Math.min(1, Math.max(0, dayOfMonth / daysInMonth));
            
            // 搴旇瀹屾垚鐨勬鏁?            const fishShouldBe = remainingDays === 0 ? FISH_TARGET : Math.min(FISH_TARGET, Math.ceil(monthProgress * FISH_TARGET));
            const arenaShouldBe = remainingDays === 0 ? ARENA_TARGET : Math.min(ARENA_TARGET, Math.ceil(monthProgress * ARENA_TARGET));
            
            // 璁＄畻鏈畬鎴愭鏁?            const fishNeed = Math.max(0, fishShouldBe - fishNum);
            const arenaNeed = Math.max(0, arenaShouldBe - arenaNum);
            
            // 杩斿洖鎬绘湭瀹屾垚娆℃暟锛堥挀楸?+ 绔炴妧鍦猴級
            return fishNeed + arenaNeed;
          };
          
          valueA = calculateMonthlyNeed(monthDataA);
          valueB = calculateMonthlyNeed(monthDataB);
          break;
        default:
          valueA = tokenA.name?.toLowerCase() || "";
          valueB = tokenB.name?.toLowerCase() || "";
      }

      // 鏍规嵁鎺掑簭鏂瑰悜姣旇緝鍊?      if (valueA < valueB) {
        return sortConfig.value.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.value.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  
  // 鉁?閫変腑鍒嗙粍鐨勮处鍙疯嚜鍔ㄦ帓搴忓埌鍓嶉潰锛堟渶楂樹紭鍏堢骇锛?  const selectedGroupIds = selectedGroups.value;
  if (selectedGroupIds && selectedGroupIds.length > 0) {
    // 鏀堕泦鎵€鏈夐€変腑鍒嗙粍涓殑token ID
    const selectedGroupTokenIds = new Set();
    selectedGroupIds.forEach(groupId => {
      const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
      validTokenIds.forEach(id => selectedGroupTokenIds.add(id));
    });
    
    // 鎺掑簭锛氶€変腑鍒嗙粍鐨勮处鍙峰湪鍓嶏紝鍏朵粬璐﹀彿鍦ㄥ悗
    tokens.sort((a, b) => {
      const aInSelectedGroup = selectedGroupTokenIds.has(a.id);
      const bInSelectedGroup = selectedGroupTokenIds.has(b.id);
      
      // 濡傛灉a鍦ㄩ€変腑鍒嗙粍涓紝b涓嶅湪锛宎鎺掑墠闈?      if (aInSelectedGroup && !bInSelectedGroup) return -1;
      // 濡傛灉b鍦ㄩ€変腑鍒嗙粍涓紝a涓嶅湪锛宐鎺掑墠闈?      if (!aInSelectedGroup && bInSelectedGroup) return 1;
      // 閮藉湪鎴栭兘涓嶅湪閫変腑鍒嗙粍涓紝淇濇寔鍘熸湁椤哄簭锛堝凡搴旂敤鐨勬帓搴忥級
      return 0;
    });
  }
  
  return tokens;
});

// 鍒囨崲鎺掑簭
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 濡傛灉鐐瑰嚮鐨勬槸褰撳墠鎺掑簭瀛楁锛屽垯鍒囨崲鎺掑簭鏂瑰悜
    sortConfig.value.direction =
      sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 濡傛灉鐐瑰嚮鐨勬槸鏂扮殑鎺掑簭瀛楁锛屽垯榛樿鍗囧簭
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // 鉁?娓呴櫎鑷畾涔夋帓搴忥紝璁╂寜閽帓搴忕敓鏁?  if (tokenOrder.value && tokenOrder.value.length > 0) {
    tokenOrder.value = [];
    // 娓呴櫎淇濆瓨鐨勮嚜瀹氫箟鎺掑簭
    localStorage.removeItem('tokenOrder');
  }

  // 淇濆瓨鎺掑簭璁剧疆鍒發ocalStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

// 鑾峰彇鎺掑簭鍥炬爣
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) return null;
  return sortConfig.value.direction === "asc" ? "鈫? : "鈫?;
};

const tokens = computed(() => tokenStore.gameTokens);

// 鍝嶅簲寮忔椂闂村紩鐢紝姣?0绉掓洿鏂颁竴娆★紝纭繚computed灞炴€ц兘姝ｇ‘鍝嶅簲鏃堕棿鍙樺寲
const currentTime = ref(new Date());
let currentTimeTimer = null;

// 鏃堕棿妫€鏌ュ嚱鏁扮洿鎺ヤ娇鐢?new Date()锛岀‘淇濇瘡娆¤皟鐢ㄩ兘鑾峰彇瀹炴椂鏃堕棿
const checkCarActivityOpen = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 1=Mon, 2=Tue, 3=Wed; 6鐐逛箣鍚?  return day >= 1 && day <= 3 && hour >= 6;
};

const checkMengjingActivityOpen = () => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
};

const checkBaokuActivityOpen = () => {
  const day = new Date().getDay();
  return day != 1 && day != 2;
};

// 淇濈暀computed鐢ㄤ簬UI鏄剧ず锛屼絾浠诲姟鎵ц鏃朵娇鐢ㄥ嚱鏁?const isCarActivityOpen = computed(() => checkCarActivityOpen());
const ismengjingActivityOpen = computed(() => checkMengjingActivityOpen());
const isbaokuActivityOpen = computed(() => checkBaokuActivityOpen());
// 鐩存帴浣跨敤 new Date()锛屼笉渚濊禆鍝嶅簲寮?ref锛岄伩鍏?computed 缂撳瓨瀵艰嚧鏃堕棿鍒ゆ柇澶辨晥
const checkArenaActivityOpen = () => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
};

// 淇濈暀computed鐢ㄤ簬UI鏄剧ず锛屼絾浠诲姟鎵ц鏃朵娇鐢ㄥ嚱鏁?const isarenaActivityOpen = computed(() => {
  return checkArenaActivityOpen();
});
const getCurrentActivityWeek = computed(() => {
  const now = currentTime.value;
  const start = new Date("2025-12-12T12:00:00"); // 璧峰鏃堕棿锛氶粦甯傚懆寮€濮?  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 涓€鍛ㄦ绉掓暟
  const cycleDuration = 3 * weekDuration; // 涓夊懆鏈熸绉掓暟

  const elapsed = now - start;
  if (elapsed < 0) return null; // 娲诲姩寮€濮嬪墠

  const cyclePosition = elapsed % cycleDuration;

  if (cyclePosition < weekDuration) {
    return "榛戝競鍛?;
  } else if (cyclePosition < 2 * weekDuration) {
    return "鎷涘嫙鍛?;
  } else {
    return "瀹濈鍛?;
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  if (getCurrentActivityWeek.value !== "榛戝競鍛?) return false;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour * 60 + minute; // 杞崲涓哄垎閽?  
  // 榛戝競鍛ㄥ紑鏀炬椂闂达細鍛ㄤ簲12:00寮€濮嬶紝鍒颁笅鍛ㄤ簲11:00缁撴潫
  if (day === 5) {
    // 鍛ㄤ簲锛?1:00鍓?鎴?12:00鍚庡紑鏀?    const morningEnd = 11 * 60;      // 11:00 = 660鍒嗛挓
    const afternoonStart = 12 * 60;  // 12:00 = 720鍒嗛挓
    
    // 鍛ㄤ簲11:00鍓嶅紑鏀撅紙鏈懆榛戝競鍛ㄧ殑鏈€鍚庢椂鍒伙級
    // 鎴栧懆浜?2:00鍚庡紑鏀撅紙鏂伴粦甯傚懆鐨勫紑濮嬶級
    if (currentTime < morningEnd || currentTime >= afternoonStart) {
      return true;
    }
    // 鍛ㄤ簲11:00-12:00涔嬮棿涓嶅紑鏀?    return false;
  }
  
  // 鍏朵粬鏃堕棿锛堝懆鍏埌鍛ㄥ洓锛夊叏澶╁紑鏀?  return true;
});

// 榛戝競鍛ㄦ椿鍔ㄦ椂闂寸姸鎬佹彁绀?const weirdTowerActivityStatus = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  
  if (currentWeek !== "榛戝競鍛?) {
    return `褰撳墠鏄?{currentWeek}锛岄粦甯傚懆璐拱鍔熻兘鏈紑鏀綻;
  }
  
  if (isWeirdTowerActivityOpen.value) {
    return "榛戝競鍛ㄨ喘涔板姛鑳藉紑鏀句腑";
  }
  
  return "榛戝競鍛ㄨ喘涔板姛鑳芥殏鏃跺叧闂紙姣忓懆浜?1:00-12:00涓哄垏鎹㈡椂闂达級";
});

// 鎷涘嫙鍛ㄥ紑鏀惧垽鏂紙鍏嶈垂绀煎寘棰嗗彇鎸夐挳 - 鍖呭惈鎵€鏈夊懆鐨勭ぜ鍖咃級
const isRecruitActivityOpen = computed(() => {
  // 鍏嶈垂绀煎寘棰嗗彇鍖呭惈锛氭嫑鍕熷懆銆侀粦甯傚懆銆佸疂绠卞懆銆佸懆涓€鍏嶈垂绀?  // 鎵€浠ュ湪浠讳綍娲诲姩鍛ㄩ兘搴旇鍙互棰嗗彇
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "鎷涘嫙鍛? || currentWeek === "榛戝競鍛? || currentWeek === "瀹濈鍛?;
});

// 瀹濈鍛ㄥ紑鏀惧垽鏂紙涓€閿疂绠卞懆寮€绠便€佸疂绠辫揪鏍囧鍔辫嚜閫夊ぇ濂栵級
const isBoxWeeklyActivityOpen = computed(() => {
  const currentWeek = getCurrentActivityWeek.value;
  return currentWeek === "瀹濈鍛?;
});

// 鍔熸硶娈嬪嵎闄愬埗鍒ゆ柇锛?8澶╄禌瀛ｅ懆鏈燂紝鏂拌禌瀛ｄ腑鍗?2:00寮€鍚紝璧涘鏃?0:00-12:00绂佹棰嗗彇鍜岃禒閫侊級
const SEASON_REFERENCE_DATE = new Date(2026, 0, 16); // 绗?璧涘寮€濮嬫棩鏈燂紙2026骞?鏈?6鏃?2:00锛?const isLegacyRestricted = computed(() => {
  const now = currentTime.value;
  const hour = now.getHours();
  
  // 12:00 涔嬪悗璧涘宸插紑鍚紝涓嶉檺鍒?  if (hour >= 12) return false;
  
  // 璁＄畻璺濈鍙傝€冭禌瀛ｆ棩鐨勫ぉ鏁?  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - SEASON_REFERENCE_DATE.getTime();
  const daysSinceRef = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  // 澶勭悊璐熸暟鍙栨ā锛圝avaScript % 瀵硅礋鏁拌繑鍥炶礋鍊硷級
  const daysMod = ((daysSinceRef % 28) + 28) % 28;
  
  // 璧涘鏃ュ綋澶╋紙浣欐暟涓?锛変笖 00:00-12:00 涔嬮棿
  return daysMod === 0;
});

// 鑾峰彇鏈湀绗洓涓懆鏃ョ殑鏃ユ湡
const getFourthSundayOfMonth = () => {
  const now = currentTime.value;
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 褰撴湀绗竴澶?  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0-6
  
  // 璁＄畻绗竴涓懆鏃ョ殑鏃ユ湡 (1鍙锋槸鍛ㄦ棩鍒欎负1锛屽惁鍒欎负 1 + 7 - dayOfWeek)
  let firstSundayDate = 1 + (7 - dayOfWeek) % 7;

  // 浠呴拡瀵?026骞?鏈堣繘琛岀壒娈婂鐞?  if (year === 2026 && month === 2 && dayOfWeek === 0) {
    firstSundayDate = 8;
  }
  
  // 绗洓涓懆鏃?= 绗竴涓懆鏃?+ 21澶?  return new Date(year, month, firstSundayDate + 21);
};

const isWarGuessActivityOpen = computed(() => {
  const now = currentTime.value;
  
  // 鎵嬪姩淇锛?026骞?鏈?鏃ュ紑鏀?  if (now.getFullYear() === 2026 && now.getMonth() === 2 && now.getDate() === 1) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 19 || (hour === 19 && minute <= 55)) return true;
  }

  const fourthSunday = getFourthSundayOfMonth();
  
  // 妫€鏌ユ槸鍚︽槸浠婂ぉ
  if (now.getDate() !== fourthSunday.getDate()) return false;
  
  // 妫€鏌ユ椂闂?00:00 - 19:55
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
  return `鏈堣禌鍔╁▉浠呭湪姣忔湀绗洓涓懆鏃?(${month}鏈?{date}鏃? 00:00-19:55 寮€鏀綻;
});

const selectedTokens = ref([]);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' | 'waiting_retry' }
const isRunning = ref(false);
const shouldStop = ref(false);
const shouldRefreshAfterTask = ref(false); // 鏍囪鏄惁闇€瑕佸湪浠诲姟瀹屾垚鍚庡埛鏂伴〉闈?
// =====================
// Token鍒嗙粍绠＄悊鐘舵€?// =====================
const showGroupManageModal = ref(false);
const showGroupSelectModal = ref(false);
const selectedGroups = ref([]); // 閫変腑鐨勫垎缁処D鍒楄〃
const newGroupName = ref("");
const newGroupColor = ref("#1677ff");
const newGroupSelectedTokens = ref([]); // 鏂板缓鍒嗙粍鏃堕€変腑鐨凾oken ID鍒楄〃
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const taskScheduleSelectedGroupIds = ref([]); // 瀹氭椂浠诲姟涓€氳繃鍒嗙粍鎸夐挳閫変腑鐨勫垎缁処D鍒楄〃
const batchDeleteSelectedGroupIds = ref([]); // 鍒嗙粍绠＄悊寮圭獥涓壒閲忓垹闄ら€変腑鐨勫垎缁処D鍒楄〃
const groupColors = [
  "#1677ff", // 钃濊壊
  "#52c41a", // 缁胯壊
  "#faad14", // 姗欒壊
  "#f5222d", // 绾㈣壊
  "#722ed1", // 绱壊
  "#13c2c2", // 闈掕壊
  "#eb2f96", // 绮夎壊
  "#fa8c16", // 璧ょ孩鑹?];

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);
const currentGuessCount = ref(0);

// 鍔╁▉鍟嗗簵
const showLegionStoreModal = ref(false);
const legionStoreSelections = ref({
  7: { selected: false, count: 1, maxCount: 1, disabled: false },   // 闅忔満绾㈠皢纰庣墖
  8: { selected: false, count: 1, maxCount: 1, disabled: false },   // 鐧界帀
  9: { selected: false, count: 1, maxCount: 1, disabled: false },   // 鍐涘洟甯?  10: { selected: false, count: 20, maxCount: 20, disabled: false }, // 杩涢樁鐭?  11: { selected: false, count: 20, maxCount: 20, disabled: false }, // 绮鹃搧
});

// 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴?const showActivityExchangeModal = ref(false);
const activityExchangeSelections = ref({
  1:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鎯婇浄' },
  2:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鏈堝崕' },
  3:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鍥炲搷' },
  4:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鐞村績鍏? },
  5:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鐞村績姣? },
  6:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鐠囩帒' },
  7:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鍓戣儐鍏? },
  8:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '鍓戣儐姣? },
  9:  { selected: false, count: 1, maxCount: 1, disabled: false, name: '闃靛缂栫粍' },
  10: { selected: false, count: 30, maxCount: 30, disabled: false, name: '鐝嶇彔' },
  11: { selected: false, count: 200, maxCount: 200, disabled: false, name: '涓囪兘绾㈠皢纰庣墖' },
  12: { selected: false, count: 200, maxCount: 200, disabled: false, name: '闅忔満绾㈠皢纰庣墖' },
  13: { selected: false, count: 999, maxCount: 999, disabled: false, name: '鐧界帀' },
  14: { selected: false, count: 999, maxCount: 999, disabled: false, name: '绮鹃搧' },
});

const openActivityExchangeModal = () => {
  showActivityExchangeModal.value = true;
};

const handleActivityExchangeCountChange = (suffix) => {
  const item = activityExchangeSelections.value[suffix];
  if (item.count > item.maxCount) item.count = item.maxCount;
  if (item.count < 1) item.count = 1;
  // 闄愯喘1娆＄殑鍟嗗搧涓嶅厑璁镐慨鏀规鏁?  if (item.maxCount === 1) item.count = 1;
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
    message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
    return;
  }
  showActivityExchangeModal.value = false;
  await batchActivityExchange(selectedSuffixes, buyCounts);
};

const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "浜?;
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "涓?;
  }
  return power.toString();
};

const warGuessColumns = [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'id', width: 100 },
  { title: '澶村儚', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '30px', height: '30px', borderRadius: '50%' } });
  }, width: 60 },
  { title: '鍖烘湇', key: 'serverId', width: 80 },
  { title: '淇变箰閮?, key: 'name', width: 120 },
  { title: '鎴樺姏', key: 'power', render(row) {
    return formatPower(row.power);
  }, width: 100 },
  { title: '绾㈡番', key: 'quenchNum' },
  { title: '宸插姪濞?, key: 'guessNum' },
  { title: '鎬荤儹搴?, key: 'totalNum',render(row) {
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

// 鎵撳紑鍔╁▉鍟嗗簵寮圭獥
const openLegionStoreModal = () => {
  showLegionStoreModal.value = true;
  // 閲嶇疆閫夋嫨
  Object.keys(legionStoreSelections.value).forEach(key => {
    legionStoreSelections.value[key].selected = false;
    legionStoreSelections.value[key].disabled = false;
    // 鎭㈠榛樿璐拱娆℃暟
    if (key === '10' || key === '11') {
      legionStoreSelections.value[key].count = 20;
    } else {
      legionStoreSelections.value[key].count = 1;
    }
  });
};

// 澶勭悊鍔╁▉鍟嗗簵璐拱娆℃暟鍙樺寲
const handleLegionStoreCountChange = (itemId) => {
  const item = legionStoreSelections.value[itemId];
  
  // 闄愯喘1娆＄殑鍟嗗搧锛?銆?銆?锛?  const limitedItems = [7, 8, 9];
  
  // 濡傛灉浠讳綍鍟嗗搧鐨勮喘涔版鏁?> 1锛屽垯绂佺敤鎵€鏈夐檺璐?娆＄殑鍟嗗搧
  let hasCountOverOne = false;
  Object.keys(legionStoreSelections.value).forEach(key => {
    if (legionStoreSelections.value[key].count > 1) {
      hasCountOverOne = true;
    }
  });
  
  if (hasCountOverOne) {
    // 绂佺敤闄愯喘1娆＄殑鍟嗗搧
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = true;
      // 濡傛灉琚鐢ㄧ殑鍟嗗搧宸茶鍕鹃€夛紝鍒欏彇娑堝嬀閫?      if (legionStoreSelections.value[id].selected) {
        legionStoreSelections.value[id].selected = false;
      }
    });
    
    // 濡傛灉褰撳墠淇敼鐨勬槸闄愯喘1娆＄殑鍟嗗搧锛屾彁绀虹敤鎴?    if (limitedItems.includes(itemId)) {
      message.warning("褰撳墠鐗╁搧闄愯喘1娆★紝鏃犳硶璐拱2娆?);
      // 閲嶇疆娆℃暟涓?
      item.count = 1;
    }
  } else {
    // 鎭㈠鍚敤
    limitedItems.forEach(id => {
      legionStoreSelections.value[id].disabled = false;
    });
  }
};

// 澶勭悊鍔╁▉鍟嗗簵璐拱
const handleLegionStoreBuy = async () => {
  // 鏀堕泦閫変腑鐨勫晢鍝?  const selectedItems = [];
  const buyCounts = {};
  
  Object.keys(legionStoreSelections.value).forEach(key => {
    const item = legionStoreSelections.value[key];
    if (item.selected) {
      selectedItems.push(parseInt(key));
      buyCounts[parseInt(key)] = item.count;
    }
  });
  
  if (selectedItems.length === 0) {
    message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
    return;
  }
  
  // 鍏抽棴寮圭獥
  showLegionStoreModal.value = false;
  
  // 璋冪敤璐拱鍑芥暟
  await legion_buy_store_items(selectedItems, buyCounts);
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("璇峰厛閫夋嫨涓€涓处鍙风敤浜庤幏鍙栨湀璧涘姪濞佹暟鎹?);
    return;
  }
  
  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find(t => t.id === tokenId);
  
  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `姝ｅ湪浣跨敤 ${token.name} 鑾峰彇鏈堣禌鍔╁▉鏁版嵁...`,
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
      message.warning("鑾峰彇鏈堣禌鍔╁▉鏁版嵁涓虹┖");
    }
    
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error("鑾峰彇鏈堣禌鍔╁▉鏁版嵁澶辫触: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鑾峰彇鏈堣禌鍔╁▉鏁版嵁澶辫触: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
    if (!selectedWarGuessLegionId.value) {
        message.warning("璇峰厛閫夋嫨涓€涓勘涔愰儴");
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
  nightmareFormation: 1, // 鍗佹闃靛
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
  legacyGiftPassword: '', // 鍔熸硶璧犻€侀獙璇佸瘑鐮?});

// Task Template State
const showTaskTemplateModal = ref(false);
const showApplyTemplateModal = ref(false);
const showTemplateManagerModal = ref(false);
const showAccountTemplateModal = ref(false);
const taskTemplates = ref([]);
const selectedTemplateId = ref(null);
const selectedTokensForApply = ref([]);
const currentTemplateName = ref("");
const currentTemplateId = ref(null); // 鐢ㄤ簬缂栬緫鐜版湁妯℃澘
const currentTemplate = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  nightmareFormation: 1, // 鍗佹闃靛
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
  legacyGiftPassword: '', // 鏂板: 鍔熸硶璧犻€侀獙璇佸瘑鐮?});

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

// 鏍煎紡鍖栨棩鏈?const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 灏忎簬1灏忔椂鏄剧ず鈥滃垰鍒氣€?  if (diff < 3600000) {
    return "鍒氬垰";
  }
  // 灏忎簬24灏忔椂鏄剧ず鈥渪灏忔椂鍓嶁€?  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}灏忔椂鍓峘;
  }
  // 灏忎簬7澶╂樉绀衡€渪澶╁墠鈥?  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}澶╁墠`;
  }
  // 鍚﹀垯鏄剧ず瀹屾暣鏃ユ湡
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
  targetRounds: 1,  // 鐩爣杞暟锛?-4杞級
  weeklyMarketItems: [],  // 榛戝競鍛ㄨ喘涔扮殑鍟嗗搧鍒楄〃
  fragmentPackItems: [],  // 閫変腑鐨勭鐗囩ぜ鍖?itemId 鏁扮粍
  cdkCode: '',  // 鍏戞崲鐮?  cheerQty: 0,  // 鎸ラ紦鍔╁▉鏁伴噺锛?=鍏ㄩ儴
});

const helperModalTitle = computed(() => {
  const titles = { box: "鎵归噺寮€瀹濈", fish: "鎵归噺閽撻奔", recruit: "鎵归噺鎷涘嫙", pointsBox: "涓€閿疂绠卞懆寮€绠?, weeklyMarket: "榛戝競鍛ㄨ喘涔?, fragmentPack: "纰庣墖绀煎寘閫夋嫨", cdk: "鍏戞崲鐮侀鍙?, cheer: "鎸ラ紦鍔╁▉娑堣€? };
  return titles[helperType.value] || "鎵归噺鍔╂墜";
});

// 鑻遍泟鍥涘湥鍗囩骇 Modal State
const showHeroFourSaintsModal = ref(false);
const selectedHeroSingle = ref(null);  // 鍗曢€夎嫳闆?
const heroOptions = [
  { label: "鍙搁┈鎳?, value: 101 },
  { label: "鍏崇窘", value: 103 },
  { label: "璇歌憶浜?, value: 104 },
  { label: "鍛ㄧ憸", value: 105 },
  { label: "澶彶鎱?, value: 106 },
  { label: "鍚曞竷", value: 107 },
  { label: "鐢勫К", value: 109 },
  { label: "瀛欑瓥", value: 111 },
  { label: "璐捐", value: 112 },
  { label: "鏇逛粊", value: 113 },
  { label: "濮滅淮", value: 114 },
  { label: "鍏瓩鐡?, value: 116 },
  { label: "鍏搁煢", value: 117 },
  { label: "瓒呬簯", value: 118 },
  { label: "寮犺", value: 120 },
  { label: "椴佽們", value: 121 },
];

const openHeroFourSaintsModal = () => {
  selectedHeroSingle.value = null;
  showHeroFourSaintsModal.value = true;
};

// 鐩愭櫠鍟嗗簵 Modal State
const showSaltCrystalShopModal = ref(false);

const openSaltCrystalShopModal = () => {
  // 鍒濆鍖?_checked 鐘舵€?  saltCrystalShopConfig.value.forEach((item) => {
    item._checked = item.count > 0;
  });
  showSaltCrystalShopModal.value = true;
};

const executeSaltCrystalShopBuy = () => {
  showSaltCrystalShopModal.value = false;
  salt_crystal_shop_buy();
};

// 鐩愰敪鍟嗗簵 Modal State
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
    message.warning("璇烽€夋嫨涓€涓嫳闆?);
    return;
  }
  showHeroFourSaintsModal.value = false;
  heroFourSaintsUpgrade([selectedHeroSingle.value]);
};

// 瀹濈鍛ㄨ嚜閫夊ぇ濂?Modal State
const showBoxWeeklyRewardModal = ref(false);
const selectedBoxWeeklyRewards = ref([5]);  // 榛樿閫夋嫨鐝嶇彔
const boxWeeklyRewardCounts = ref({ 5: 1 });  // 姣忎釜濂栧姳鐨勯鍙栨鏁?
const boxWeeklyRewardOptions = [
  { label: "涓囪兘绾㈠皢纰庣墖", value: 0 },
  { label: "姊﹂瓏鏅剁煶", value: 1 },
  { label: "绮鹃搧", value: 2 },
  { label: "杩涢樁鐭?, value: 3 },
  { label: "鎵虫墜", value: 4 },
  { label: "鐝嶇彔", value: 5 },
];

// 榛戝競鍛ㄥ晢鍝侀€夐」
const weeklyMarketItemOptions = [
  { label: "鍏嶈垂閲戠爾", value: "0" },
  { label: "榛戝競瑙侀潰绀?, value: "1" },
  { label: "榛戝競鎯婂枩绀?, value: "2" },
  { label: "鍒濈骇榛戝競鍖?, value: "3" },
  { label: "涓骇榛戝競鍖?, value: "4" },
  { label: "楂樼骇榛戝競鍖?, value: "5" },
  { label: "椤剁骇楸肩鍖?, value: "6" },
  { label: "鐧界帀榛戝競鍖?, value: "7" },
  { label: "鐗圭骇鐏佃礉鍖?, value: "8" },
  { label: "鍏绘垚琛ョ粰鍖?, value: "9" },
];

// 鍔╁▉鍟嗗簵鍟嗗搧閫夐」
const legionStoreItemOptions = [
  { label: "闅忔満绾㈠皢纰庣墖", value: "7", min: 1, max: 1 },
  { label: "鐧界帀", value: "8", min: 1, max: 1 },
  { label: "鍐涘洟甯?, value: "9", min: 1, max: 1 },
  { label: "杩涢樁鐭?, value: "10", min: 1, max: 20 },
  { label: "绮鹃搧", value: "11", min: 1, max: 20 },
];

// 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楀晢鍝侀€夐」
const activityExchangeItemOptions = [
  { name: '鎯婇浄', suffix: 1, maxCount: 1 },
  { name: '鏈堝崕', suffix: 2, maxCount: 1 },
  { name: '鍥炲搷', suffix: 3, maxCount: 1 },
  { name: '鐞村績鍏?, suffix: 4, maxCount: 1 },
  { name: '鐞村績姣?, suffix: 5, maxCount: 1 },
  { name: '鐠囩帒', suffix: 6, maxCount: 1 },
  { name: '鍓戣儐鍏?, suffix: 7, maxCount: 1 },
  { name: '鍓戣儐姣?, suffix: 8, maxCount: 1 },
  { name: '闃靛缂栫粍', suffix: 9, maxCount: 1 },
  { name: '鐝嶇彔', suffix: 10, maxCount: 30 },
  { name: '涓囪兘绾㈠皢纰庣墖', suffix: 11, maxCount: 200 },
  { name: '闅忔満绾㈠皢纰庣墖', suffix: 12, maxCount: 200 },
  { name: '鐧界帀', suffix: 13, maxCount: 999 },
  { name: '绮鹃搧', suffix: 14, maxCount: 999 },
];

// 鐩愭櫠鍟嗗簵鍟嗗搧閫夐」
const saltCrystalShopItemOptions = [
  { label: "鍥涘湥钃濈帀", value: "201", min: 1, max: 60 },
  { label: "鍥涘湥绾㈢帀", value: "202", min: 1, max: 50 },
  { label: "鎴愰暱鑴嗛ゼ", value: "203", min: 1, max: 60 },
  { label: "骞诲僵鐏垫灉", value: "204", min: 1, max: 60 },
  { label: "鏂戠偣铔?, value: "205", min: 1, max: 5 },
];

// 榛戝競澶氶€夎喘涔板晢鍝侀€夐」
const manualBuyItemOptions = [
  { label: "闈掗摐瀹濈", value: "1" },
  { label: "榛勯噾瀹濈", value: "2" },
  { label: "閾傞噾瀹濈", value: "3" },
  { label: "杩涢樁鐭?, value: "4" },
  { label: "绮鹃搧", value: "5" },
  { label: "鎷涘嫙浠?, value: "6" },
  { label: "闅忔満绾㈠皢纰庣墖", value: "7" },
  { label: "闅忔満姗欏皢纰庣墖", value: "8" },
  { label: "闅忔満绱皢纰庣墖", value: "9" },
  { label: "姊﹂瓏鏅剁煶", value: "10" },
  { label: "鏅€氶奔绔?, value: "11" },
  { label: "榛勯噾楸肩", value: "12" },
  { label: "鍜哥闂ㄧエ", value: "13" },
  { label: "鐧界帀", value: "14" },
  { label: "褰╃帀", value: "15" },
  { label: "鎵虫墜", value: "16" },
];

// 鐩愰敪鍟嗗簵鍟嗗搧閫夐」
const saltIngotShopItemOptions = [
  { label: "鐨偆甯?, value: "1", min: 1, max: 5 },
  { label: "鍐涘洟甯?, value: "2", min: 1, max: 1 },
  { label: "杩涢樁鐭?, value: "3", min: 1, max: 1 },
  { label: "绮鹃搧", value: "4", min: 1, max: 1 },
  { label: "鐧界帀", value: "5", min: 1, max: 1 },
  { label: "鍥涘湥瀹濈彔纰庣墖", value: "6", min: 1, max: 1 },
];

// 鍗佹棰勮閫夐」锛堜粠 localStorage 鍔犺浇锛?const nightmarePresetOptions = computed(() => {
  try {
    const raw = localStorage.getItem('nightmare-presets');
    const presets = raw ? JSON.parse(raw) : [];
    return presets.map(p => ({
      id: p.id,
      name: p.name || '鏈懡鍚嶉璁?,
      captainTokenId: p.captainTokenId,
      memberTokenIds: p.memberTokenIds || [],
      captainName: tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '鏈煡',
      totalMembers: (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length,
    }));
  } catch {
    return [];
  }
});

// 鍕鹃€?鍙栨秷鍗佹棰勮鏃讹紝鑷姩鍚屾瀵瑰簲璐﹀彿鍒?selectedTokens
const onNightmarePresetToggle = (preset, checked) => {
  if (checked) {
    if (!taskForm.nightmarePresetIds.includes(preset.id)) {
      taskForm.nightmarePresetIds.push(preset.id);
    }
    // 鑷姩鍕鹃€夐槦闀垮拰闃熷憳鍒拌处鍙峰垪琛?    const allIds = [preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean);
    for (const tid of allIds) {
      if (!taskForm.selectedTokens.includes(tid)) {
        taskForm.selectedTokens.push(tid);
      }
    }
  } else {
    taskForm.nightmarePresetIds = taskForm.nightmarePresetIds.filter(id => id !== preset.id);
    // 鏀堕泦璇ラ璁剧殑鎵€鏈?token ID
    const removeIds = new Set([preset.captainTokenId, ...preset.memberTokenIds].filter(Boolean));
    // 妫€鏌ヨ繖浜?token 鏄惁琚叾浠栧凡鍕鹃€夌殑棰勮寮曠敤
    const usedByOtherPresets = new Set();
    for (const pid of taskForm.nightmarePresetIds) {
      const p = nightmarePresetOptions.value.find(opt => opt.id === pid);
      if (p) {
        [p.captainTokenId, ...p.memberTokenIds].filter(Boolean).forEach(id => usedByOtherPresets.add(id));
      }
    }
    // 鍙Щ闄や笉琚叾浠栭璁句娇鐢ㄧ殑 token
    for (const tid of removeIds) {
      if (!usedByOtherPresets.has(tid)) {
        taskForm.selectedTokens = taskForm.selectedTokens.filter(id => id !== tid);
      }
    }
  }
};

// 璁＄畻鎬绘鏁?const totalBoxWeeklyRewardCount = computed(() => {
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
  selectedBoxWeeklyRewards.value = [5];  // 閲嶇疆涓洪粯璁ら€夋嫨鐝嶇彔
  boxWeeklyRewardCounts.value = { 5: 1 };  // 閲嶇疆娆℃暟
  showBoxWeeklyRewardModal.value = true;
};

const executeBoxWeeklyRewards = () => {
  if (selectedBoxWeeklyRewards.value.length === 0) {
    message.warning("璇疯嚦灏戦€夋嫨涓€涓鍔?);
    return;
  }
  if (totalBoxWeeklyRewardCount.value > 4) {
    message.warning("鎬昏鏈€澶氬彧鑳介鍙?娆?);
    return;
  }
  
  // 鏋勫缓濂栧姳閰嶇疆锛歿 rewardIndex: count }
  const rewardConfig = {};
  selectedBoxWeeklyRewards.value.forEach(rewardIndex => {
    rewardConfig[rewardIndex] = boxWeeklyRewardCounts.value[rewardIndex] || 1;
  });
  
  showBoxWeeklyRewardModal.value = false;
  batchClaimBoxWeeklyRewards(rewardConfig);
};

// 瀹氭椂浠诲姟涓殑瀹濈鑷€夊ぇ濂栭厤缃?const totalTaskBoxWeeklyRewardCount = computed(() => {
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
  tokenListColumns: 4,  // 榛樿4鍒?  autoColumns: true,    // 榛樿鍚敤鑷姩鍒楁暟
  useGoldRefreshFallback: false,
  // 寤惰繜閰嶇疆锛堟绉掞級
  commandDelay: 1000,       // 鍛戒护闂村欢杩?  taskDelay: 1000,          // 浠诲姟闂村欢杩?  actionDelay: 1000,        // 涓€鑸搷浣滃欢杩燂紙寮€绠便€侀挀楸笺€佹嫑鍕熺瓑锛?  battleDelay: 1500,        // 鎴樻枟寤惰繜锛堝疂搴撱€佺珵鎶€鍦虹瓑锛?  refreshDelay: 1500,       // 鍒锋柊寤惰繜锛堝彂杞﹀埛鏂扮瓑锛?  longDelay: 5000,          // 闀垮欢杩燂紙鍔熸硶璧犻€佺瓑锛?  taskIntervalWait: 0,      // 瀹氭椂浠诲姟涓瘡瀹屾垚涓€涓换鍔″悗鐨勭瓑寰呮椂闂?绉?锛?涓轰笉绛夊緟
  batchIntervalWait: 5,     // 瀹氭椂浠诲姟涓瘡瀹屾垚涓€鎵硅处鍙峰悗鐨勭瓑寰呮椂闂?绉?锛岄粯璁?绉掞紝0涓轰笉绛夊緟
  // 鍔熻兘妯″潡寤惰繜閰嶇疆(ms)
  moduleDelays: {
    daily: 800,         // 鏃ュ父浠诲姟
    arena: 1000,        // 绔炴妧鍦?    tower: 1500,        // 鐖/鎬紓濉?    store: 500,         // 榛戝競/鍟嗗簵璐拱
    treasure: 1500,     // 瀹濆簱/姊﹀
    activity: 2000,     // 娑堣€楁椿鍔?    club: 1500,         // 淇变箰閮?    hero: 1000,         // 鑻遍泟/楸肩伒/瀹犵墿鍗囩骇
    bottle: 500,        // 缃愬瓙锛堥噸缃?棰嗗彇锛?    hangup: 500,        // 鎸傛満/绛惧埌/绛旈
    default: 800,       // 榛樿
  },
  // 榛戝競澶氶€夎喘涔伴厤缃?  manualBuyItems: [],
  // 鐝嶅疂闃佸晢搴楄喘涔伴厤缃?  collectionExchangeItems: [],
  // 鍏朵粬閰嶇疆
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 30000,
  reconnectDelay: 5000,
  maxLogEntries: 1000,
  // 椤甸潰鍒锋柊閰嶇疆
  enableRefresh: true,
  refreshInterval: 360, // 鍒嗛挓
  smartDepartureEnabled: true,
  smartDepartureGoldThreshold: 800,
  smartDepartureRecruitThreshold: 20,
  smartDepartureJadeThreshold: 1500,
  smartDepartureTicketThreshold: 4,
  requireMinColorWithConditions: false, // 婊¤冻鑷畾涔夋潯浠舵椂鏄惁杩樺繀椤绘弧瓒虫渶浣庡搧璐?  // 鍒嗛〉閰嶇疆
  tokensPerPage: 20,      // 璐﹀彿姣忛〉鏄剧ず鏁伴噺
  logPageSize: 100,       // 鏃ュ織铏氭嫙婊氬姩姣忛〉鏁伴噺
  // 楂樼骇閰嶇疆
  defaultCommandTimeout: 5000,      // 榛樿鍛戒护瓒呮椂鏃堕棿(ms)
  battleCommandTimeout: 12000,      // 鎴樻枟鍛戒护瓒呮椂鏃堕棿(ms)
  defaultRetryCount: 2,             // 榛樿閲嶈瘯娆℃暟
  retryDelay: 10000,                 // 閲嶈瘯寤惰繜(ms)
  accountRetryInterval: 5000,       // 璐﹀彿闂撮噸璇曢棿闅?ms)
  // 鎸傛満鏃堕棿鎺у埗閰嶇疆
  hangUpMinTime: 9,                 // 鏈€灏忔寕鏈烘椂闂达紙灏忔椂锛夛紝榛樿9灏忔椂
  hangUpTimeControlEnabled: false,  // 鏄惁鍚敤鎸傛満鏃堕棿鎺у埗锛岄粯璁ゅ叧闂?  // 瀹犵墿鍚堟垚绛夌骇闄愬埗
  petMergeMaxLevelEnabled: false,   // 鏄惁鍚敤瀹犵墿鍚堟垚绛夌骇闄愬埗锛岄粯璁ゅ叧闂?  petMergeMaxLevel: 4,              // 鍚堟垚绛夌骇涓婇檺锛?-7锛夛紝榛樿4绾?  // 鍏戞崲鐮?  cdkCode: '',                      // 鍏戞崲鐮侊紙瀹氭椂浠诲姟浣跨敤锛?  // 鎹㈢毊闂叧澶辫触娆℃暟鎺у埗
  skinChallengeMaxFail: 5,          // 鎹㈢毊闂叧杩炵画澶辫触娆℃暟涓婇檺锛岄粯璁?娆?});

// 璐﹀彿鎼滅储鍏抽敭璇?const tokenSearchKeyword = ref("");

// 澶勭悊璐﹀彿鎼滅储
const handleTokenSearch = () => {
  // 鎼滅储閫昏緫宸插湪 sortedTokens 璁＄畻灞炴€т腑瀹炵幇
  // 杩欓噷鍙互娣诲姞棰濆鐨勬悳绱㈤€昏緫锛屽楂樹寒鏄剧ず绛?};

// Load batch settings from localStorage
// 妫€娴嬫祻瑙堝櫒绫诲瀷骞惰繑鍥炴帹鑽愮殑杩炴帴姹犲ぇ灏?const getOptimalPoolSize = () => {
  const ua = navigator.userAgent;
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 5;  // Safari
  if (/Firefox/.test(ua)) return 5;                       // Firefox
  if (/Chrome|Edge/.test(ua)) return 5;                   // Chrome/Edge
  return 5;                                               // 榛樿
};

const loadBatchSettings = () => {
  try {
    const saved = localStorage.getItem("batchSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      // 娣卞害鍚堝苟 moduleDelays锛屼繚鐣欐柊澧炴ā鍧楃殑榛樿鍊?      if (parsed.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, parsed.moduleDelays);
        delete parsed.moduleDelays;
      }
      Object.assign(batchSettings, parsed);
      
      // 濡傛灉寮€鍚簡鑷姩妯″紡锛岀珛鍗抽噸鏂拌绠楀垪鏁?      if (batchSettings.autoColumns && typeof window !== 'undefined') {
        nextTick(() => {
          windowWidth.value = window.innerWidth;
        });
      }
    } else {
      // 鏍规嵁娴忚鍣ㄨ嚜鍔ㄨ缃渶浣宠繛鎺ユ睜澶у皬
      batchSettings.maxActive = getOptimalPoolSize();
    }
  } catch (error) {
    console.error("Failed to load batch settings:", error);
  }
};

// Save batch settings to localStorage
const saveBatchSettings = () => {
  try {
    // 妫€鏌ュ苟鍙戞暟鏄惁瓒呰繃鎺ㄨ崘鍊?    const optimalSize = getOptimalPoolSize();
    if (batchSettings.maxActive > optimalSize) {
      let browserName = "娴忚鍣?;
      if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
        browserName = "Safari";
      } else if (/Firefox/.test(navigator.userAgent)) {
        browserName = "Firefox";
      } else if (/Chrome|Edge/.test(navigator.userAgent)) {
        browserName = "Chrome/Edge";
      }
      
      console.warn(`鈿狅笍 璀﹀憡锛氬苟鍙戞暟 ${batchSettings.maxActive} 瓒呰繃${browserName}鎺ㄨ崘鍊?${optimalSize})`);
      console.warn(`鈿狅笍 鍙兘瀵艰嚧WebSocket杩炴帴澶辫触銆佹祻瑙堝櫒鍗￠】绛夐棶棰榒);
      console.warn(`锔?寤鸿璁剧疆涓?{optimalSize}鎴栦互涓媊);
      message.warning(`${browserName}娴忚鍣ㄥ缓璁繛鎺ユ睜澶у皬涓嶈秴杩?{optimalSize}锛屽綋鍓嶈缃? ${batchSettings.maxActive}锛屽彲鑳藉鑷碬ebSocket杩炴帴澶辫触`);
    }
    
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    
    // 杈撳嚭褰撳墠閰嶇疆淇℃伅
    console.log('=== 褰撳墠楂樼骇閰嶇疆 ===');
    console.log('瓒呮椂閰嶇疆:');
    console.log('  - 榛樿鍛戒护瓒呮椂:', batchSettings.defaultCommandTimeout, 'ms');
    console.log('  - 鎴樻枟鍛戒护瓒呮椂:', batchSettings.battleCommandTimeout, 'ms');
    console.log('閲嶈瘯閰嶇疆:');
    console.log('  - 榛樿閲嶈瘯娆℃暟:', batchSettings.defaultRetryCount, '娆?);
    console.log('  - 閲嶈瘯寤惰繜:', batchSettings.retryDelay, 'ms');
    console.log('  - 璐﹀彿閲嶈瘯闂撮殧:', batchSettings.accountRetryInterval, 'ms');
    console.log('==================');
    
    message.success("瀹氭椂鎵归噺浠诲姟璁剧疆宸蹭繚瀛?);
    showBatchSettingsModal.value = false;
  } catch (error) {
    console.error("Failed to save batch settings:", error);
    message.error("淇濆瓨璁剧疆澶辫触");
  }
};

// 寮€鍏冲垏鎹㈡椂鑷姩淇濆瓨锛堜笉寮圭獥鎻愮ず锛?const autoSaveBatchSettings = () => {
  try {
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
  } catch (e) { /* ignore */ }
};

// 鎭㈠妯″潡寤惰繜榛樿鍊?const resetModuleDelays = () => {
  const defaults = defaultBatchSettings.moduleDelays;
  Object.keys(defaults).forEach(key => {
    batchSettings.moduleDelays[key] = defaults[key];
  });
  message.success("妯″潡寤惰繜宸叉仮澶嶉粯璁ゅ€?);
};

// 鎭㈠寤惰繜璁剧疆榛樿鍊?const resetDelaySettings = () => {
  const keys = ['commandDelay', 'taskDelay', 'actionDelay', 'battleDelay', 'refreshDelay', 'longDelay'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("寤惰繜璁剧疆宸叉仮澶嶉粯璁ゅ€?);
};

// 鎭㈠楂樼骇閰嶇疆榛樿鍊?const resetAdvancedSettings = () => {
  const keys = ['defaultCommandTimeout', 'battleCommandTimeout', 'defaultRetryCount', 'retryDelay', 'accountRetryInterval'];
  keys.forEach(key => {
    batchSettings[key] = defaultBatchSettings[key];
  });
  message.success("楂樼骇閰嶇疆宸叉仮澶嶉粯璁ゅ€?);
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

const securityPassword = ref(""); // 瀹夊叏瀵嗙爜(淇濈暀浠ュ吋瀹规棫閫昏緫)
const isPasswordAutoFilled = ref(false); // 淇濈暀浠ュ吋瀹规棫閫昏緫

// 璁＄畻灞炴€? 妫€鏌ラ€変腑鐨勮处鍙锋槸鍚﹂兘鏈夊瘑鐮?const hasPasswordForSelectedTokens = computed(() => {
  if (selectedTokens.value.length === 0) return false;
  
  // 妫€鏌ユ墍鏈夐€変腑鐨勮处鍙锋槸鍚﹂兘鏈夊瘑鐮侀厤缃?  return selectedTokens.value.every((tokenId) => {
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

// 璁＄畻灞炴€? 瀵嗙爜鐘舵€佹彁绀轰俊鎭?const passwordStatusMessage = computed(() => {
  if (selectedTokens.value.length === 0) {
    return '璇峰厛閫夋嫨瑕佹搷浣滅殑璐﹀彿';
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
    return `鉁?鎵€鏈夐€変腑璐﹀彿(${selectedTokens.value.length}涓?宸查厤缃姛娉曡禒閫佸瘑鐮乣;
  } else if (tokensWithPassword.length === 0) {
    return `鉁?鎵€鏈夐€変腑璐﹀彿(${selectedTokens.value.length}涓?鏈厤缃瘑鐮侊紝璇峰湪璐﹀彿璁剧疆鎴栦换鍔℃ā鏉夸腑閰嶇疆`;
  } else {
    return `鈿?${tokensWithPassword.length}涓处鍙峰凡閰嶇疆瀵嗙爜锛?{tokensWithoutPassword.length}涓处鍙锋湭閰嶇疆`;
  }
});

// 璁＄畻灞炴€? 瀵嗙爜鐘舵€佹彁绀虹被鍨?const passwordStatusType = computed(() => {
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
// 浠庝换鍔℃ā鏉垮姞杞藉瘑鐮?淇濈暀浠ュ吋瀹规棫閫昏緫锛屼絾涓嶅啀浣跨敤)
const loadPasswordFromTemplate = () => {
  // 涓嶅啀闇€瑕佽嚜鍔ㄥ～鍏咃紝瀵嗙爜鐩存帴浠庤处鍙疯缃腑璇诲彇
};

// 澶村儚鍔犺浇鐘舵€?const isAvatarLoading = ref(false);
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
  taskType: "normal", // 'normal' | 'push_map'
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
  offlineTimeEnabled: false, // 鏄惁鍚敤涓嶄笂绾挎椂娈?  // 鎺ㄥ浘浠诲姟涓撳睘瀛楁
  pushStartTime: null, // 鎺ㄥ浘寮€濮嬫椂闂达紙HH:mm鏃堕棿鎴筹級
  pushStopTime: null,  // 鎺ㄥ浘鍋滄鏃堕棿锛圚H:mm鏃堕棿鎴筹紝鍙€夛級
  legionStoreItems: { // 鍔╁▉鍟嗗簵鍟嗗搧閰嶇疆
    7: { selected: false, count: 1, label: "闅忔満绾㈠皢纰庣墖", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "鐧界帀", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "鍐涘洟甯?, min: 1, max: 1 },
    10: { selected: false, count: 20, label: "杩涢樁鐭?, min: 1, max: 20 },
    11: { selected: false, count: 20, label: "绮鹃搧", min: 1, max: 20 },
  },
  saltCrystalShopItems: { // 鐩愭櫠鍟嗗簵鍟嗗搧閰嶇疆
    201: { selected: false, count: 0, label: "鍥涘湥钃濈帀", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "鍥涘湥绾㈢帀", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "鎴愰暱鑴嗛ゼ", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "骞诲僵鐏垫灉", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "鏂戠偣铔?, min: 1, max: 5 },
  },
  saltIngotShopItems: { // 鐩愰敪鍟嗗簵鍟嗗搧閰嶇疆
    1: { selected: false, count: 0, label: "鐨偆甯?, min: 1, max: 5 },
    2: { selected: false, count: 0, label: "鍐涘洟甯?, min: 1, max: 1 },
    3: { selected: false, count: 0, label: "杩涢樁鐭?, min: 1, max: 1 },
    4: { selected: false, count: 0, label: "绮鹃搧", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "鐧界帀", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "鍥涘湥瀹濈彔纰庣墖", min: 1, max: 1 },
  },
  fragmentPackItems: [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005], // 纰庣墖绀煎寘閫変腑鐨?itemId 鏁扮粍锛堥粯璁ゅ叏閫夛級
  manualBuyItems: { // 榛戝競澶氶€夎喘涔板晢鍝侀厤缃?    1: { selected: false, count: 0, label: "闈掗摐瀹濈" },
    2: { selected: false, count: 0, label: "榛勯噾瀹濈" },
    3: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4: { selected: false, count: 0, label: "杩涢樁鐭? },
    5: { selected: false, count: 0, label: "绮鹃搧" },
    6: { selected: false, count: 0, label: "鎷涘嫙浠? },
    7: { selected: false, count: 0, label: "闅忔満绾㈠皢纰庣墖" },
    8: { selected: false, count: 0, label: "闅忔満姗欏皢纰庣墖" },
    9: { selected: false, count: 0, label: "闅忔満绱皢纰庣墖" },
    10: { selected: false, count: 0, label: "姊﹂瓏鏅剁煶" },
    11: { selected: false, count: 0, label: "鏅€氶奔绔? },
    12: { selected: false, count: 0, label: "榛勯噾楸肩" },
    13: { selected: false, count: 0, label: "鍜哥闂ㄧエ" },
    14: { selected: false, count: 0, label: "鐧界帀" },
    15: { selected: false, count: 0, label: "褰╃帀" },
    16: { selected: false, count: 0, label: "鎵虫墜" },
  },
  collectionExchangeItems: { // 鐝嶅疂闃佸晢搴楄喘涔伴厤缃?    7001: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4001: { selected: false, count: 0, label: "鍐涘洟甯? },
    5001: { selected: false, count: 0, label: "鎷涘嫙浠? },
    6001: { selected: false, count: 0, label: "涓囪兘绾㈠皢纰庣墖" },
  },
  weeklyMarketItems: { // 榛戝競鍛ㄥ晢鍝侀厤缃?    0: { selected: false, label: "鍏嶈垂閲戠爾" },
    1: { selected: false, label: "榛戝競瑙侀潰绀? },
    2: { selected: false, label: "榛戝競鎯婂枩绀? },
    3: { selected: false, label: "鍒濈骇榛戝競鍖? },
    4: { selected: false, label: "涓骇榛戝競鍖? },
    5: { selected: false, label: "楂樼骇榛戝競鍖? },
    6: { selected: false, label: "椤剁骇楸肩鍖? },
    7: { selected: false, label: "鐧界帀榛戝競鍖? },
    8: { selected: false, label: "鐗圭骇鐏佃礉鍖? },
    9: { selected: false, label: "鍏绘垚琛ョ粰鍖? },
  },
  boxWeeklyRewards: {5: 1}, // 瀹濈鍛ㄨ嚜閫夊ぇ濂栭厤缃紝榛樿鐝嶇彔1娆?  smartDeparture: { // 鏅鸿兘鍙戣溅浠诲姟绾ч厤缃紙瑕嗙洊鍏ㄥ眬璁剧疆锛?    enabled: false, // 鏄惁鍚敤浠诲姟绾ч厤缃?    goldThreshold: 800,
    recruitThreshold: 20,
    jadeThreshold: 1500,
    ticketThreshold: 4,
    carMinColor: 4,
    refreshDelay: 2, // 鍒锋柊鍚庣瓑寰呭悓姝ュ欢杩燂紙绉掞級
    requireMinColorWithConditions: false, // 婊¤冻鑷畾涔夋潯浠舵椂鏄惁杩樺繀椤绘弧瓒虫渶浣庡搧璐?    useGoldRefreshFallback: false, // 寮哄埗鐢ㄩ噾鐮栧埛鏂?  },
  nightmarePresetIds: [], // 鍗佹闃庣綏鎸戞垬棰勮ID鍒楄〃
  nightmarePresetDelay: 10, // 棰勮闂存墽琛岄棿闅旓紙绉掞級锛岄粯璁?0绉?});

// 浠诲姟鍒嗙粍瀹氫箟
const taskGroupDefinitions = [
  { name: 'daily', label: '鏃ュ父', tasks: ['startBatch', 'claimHangUpRewards', 'batchAddHangUpTime', 'resetBottles', 'batchlingguanzi', 'batchclubsign', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'batchCarResearchUpgrade', 'store_purchase', 'batch_mail_claim_and_cleanup'] },
  { name: 'welfare', label: '绂忓埄', tasks: ['charge_claimaddup_rewards', 'collection_claimfreereward', 'gacha_drawreward', 'claim_recruit_welfare', 'pkroom_appoint'] },
  { name: 'dungeon', label: '鍓湰', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'skinTreasure', 'batchClaimPeachTasks', 'batchBuyDreamItems'] },
  { name: 'baoku', label: '瀹濆簱', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '鎬紓濉?, tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy', 'claim_weird_tower_all', 'claim_weird_tower_pass'] },
  { name: 'illustration', label: '鍥鹃壌', tasks: ['openHeroFourSaintsModal', 'batchHeroUpgrade', 'batchBookUpgrade', 'batchFishUpgrade', 'batchClaimStarRewards', 'batchCollectionActivate'] },
  { name: 'pet', label: '瀹犵墿', tasks: ['legion_buy_spotted_egg', 'use_spotted_egg', 'claim_pet_book', 'batch_pet_merge', 'batch_pet_upgrade'] },
  { name: 'nightmare', label: '鍗佹', tasks: ['batchNightmareChallengePresets', 'nightmare_draw_lottery', 'nightmare_claim_book_reward', 'star_drawturntable', 'batch_star_challenge'] },
  { name: 'resource', label: '璧勬簮', tasks: ['batchOpenBox', 'batchOpenBoxByPoints', 'batchOpenDiamondBox', 'batchOpenFragmentPacks', 'batchClaimBoxWeeklyRewards', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods', 'legionStoreBuySkinCoins', 'weekly_market_buy', 'weekly_market_free_gift', 'store_purchase', 'manual_buy', 'collection_exchange', 'buy_top_rod_package', 'buy_super_spirit_shell', 'store_buy_jade', 'legion_buy_red_jade', 'salt_crystal_shop_buy', 'salt_ingot_shop_buy', 'batchGenieSweep', 'batchConsumeActivity', 'batchClaimConsumeRewards', 'batchAutumnUseItem', 'batchUseActivityItem', 'batchActivityExchange', 'batchClaimCdkReward', 'batchClaimApexRewards'] },
  { name: 'legacy', label: '鍔熸硶', tasks: ['batchLegacyHangup', 'batchLegacyClaim', 'batchLegacyGiftSendEnhanced', 'batchLegacyClaimGiftTask'] },
  { name: 'monthly', label: '鏈堝害', tasks: ['batchTopUpFish', 'batchTopUpArena', 'claim_guess_coin', 'legion_buy_store_items'] }
];

// 璁＄畻灞炴€э紝鏍规嵁 taskGroupDefinitions 灏?availableTasks 鍒嗙粍
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach(group => {
    groups[group.name] = availableTasks.filter(task => group.tasks.includes(task.value));
  });
  
  // 鉁?绂佺敤鈥滃叾浠栤€濇ā鍧楋紝鍙樉绀烘槑纭垎缁勭殑浠诲姟
  // const groupedTaskValues = taskGroupDefinitions.flatMap(g => g.tasks);
  // const otherTasks = availableTasks.filter(task => !groupedTaskValues.includes(task.value));
  // if (otherTasks.length > 0) {
  //   groups['other'] = otherTasks;
  // }
  
  return groups;
});

// Cron琛ㄨ揪寮忚В鏋愮浉鍏冲彉閲?const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// 娉? availableTasks, CarresearchItem, taskColumns 宸蹭粠 @/utils/batch 瀵煎叆

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
    message.info(`寮€濮嬫墽琛屼换鍔? ${task.name}`);
    await executeScheduledTask(task);
    message.success(`浠诲姟 ${task.name} 鎵ц瀹屾垚`);
  } catch (e) {
    console.error(`鎵ц浠诲姟 ${task.name} 澶辫触:`, e);
    message.error(`浠诲姟 ${task.name} 鎵ц澶辫触`);
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
 * 妫€鏌ヤ换鍔″嚱鏁版槸鍚﹀瓨鍦紙閫氳繃 eval+try-catch 瀹夊叏妫€娴嬶級
 */
const isTaskFunctionExists = (taskName) => {
  try {
    const fn = eval(taskName);
    return typeof fn === 'function';
  } catch {
    return false;
  }
};

/**
 * 娓呯悊瀹氭椂浠诲姟涓凡澶辨晥鐨勫姛鑳芥ā鍧楀紩鐢? * 鍦?onMounted 涓皟鐢紝鑷姩绉婚櫎宸插垹闄ょ殑浠诲姟鍑芥暟
 */
const cleanupInvalidTaskReferences = () => {
  let cleaned = false;
  for (const task of scheduledTasks.value) {
    if (task.selectedTasks && Array.isArray(task.selectedTasks)) {
      const originalLength = task.selectedTasks.length;
      task.selectedTasks = task.selectedTasks.filter(taskName => {
        // 澶勭悊鍑芥暟鍚嶆槧灏?        let fnName = taskName;
        if (taskName === 'weekly_market_buy') fnName = 'weeklyMarketBuy';
        return isTaskFunctionExists(fnName);
      });
      if (task.selectedTasks.length !== originalLength) {
        cleaned = true;
        const removedCount = originalLength - task.selectedTasks.length;
        addLog({ time: new Date().toLocaleTimeString(), message: `瀹氭椂浠诲姟銆?{task.name}銆嶄腑 ${removedCount} 涓凡澶辨晥鐨勫姛鑳芥ā鍧楀凡鑷姩娓呯悊`, type: "info" });
      }
    }
  }
  if (cleaned) {
    saveScheduledTasks();
  }
};

/**
 * 妫€鏌ュ綋鍓嶆椂闂存槸鍚﹀湪涓嶄笂绾挎椂娈靛唴
 * 涓嶄笂绾挎椂娈碉細鍛ㄤ簲05:00-07:00 / 鍛ㄥ叚19:50-21:10 / 鍛ㄦ棩19:50-20:40
 * @returns {boolean} true琛ㄧず鍦ㄤ笉涓婄嚎鏃舵鍐咃紝false琛ㄧず涓嶅湪
 */
const isInOfflineTime = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6 (0=鍛ㄦ棩, 6=鍛ㄥ叚, 5=鍛ㄤ簲)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // 杞崲涓哄垎閽熸暟
  
  // 璋冭瘯鏃ュ織
  console.log('[涓嶄笂绾挎椂娈垫鏌 ========== 寮€濮嬫鏌?==========');
  console.log('[涓嶄笂绾挎椂娈垫鏌 褰撳墠鏃堕棿:', now.toLocaleString('zh-CN'));
  console.log('[涓嶄笂绾挎椂娈垫鏌 鏄熸湡:', ['鏃?, '涓€', '浜?, '涓?, '鍥?, '浜?, '鍏?][dayOfWeek], `(dayOfWeek=${dayOfWeek})`);
  console.log('[涓嶄笂绾挎椂娈垫鏌 褰撳墠鍒嗛挓鏁?', currentTime, `(${hours}:${minutes.toString().padStart(2, '0')})`);
  
  // 鍛ㄤ簲 05:00-07:00
  if (dayOfWeek === 5) {
    const startTime = 5 * 60;       // 05:00 = 300鍒嗛挓
    const endTime = 7 * 60;         // 07:00 = 420鍒嗛挓
    console.log('[涓嶄笂绾挎椂娈垫鏌 鍛ㄤ簲鏃舵:', `${startTime}-${endTime}鍒嗛挓 (05:00-07:00)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[涓嶄笂绾挎椂娈垫鏌 鏄惁鍦ㄨ寖鍥村唴:', inRange);
    if (inRange) {
      console.log('[涓嶄笂绾挎椂娈垫鏌 鉁?鍦ㄤ笉涓婄嚎鏃舵鍐?);
      console.log('[涓嶄笂绾挎椂娈垫鏌 ========== 缁撴潫妫€鏌?==========');
      return true;
    }
  }
  
  // 鍛ㄥ叚 19:50-21:10
  if (dayOfWeek === 6) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190鍒嗛挓
    const endTime = 21 * 60 + 10;   // 21:10 = 1270鍒嗛挓
    console.log('[涓嶄笂绾挎椂娈垫鏌 鍛ㄥ叚鏃舵:', `${startTime}-${endTime}鍒嗛挓 (19:50-21:10)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[涓嶄笂绾挎椂娈垫鏌 鏄惁鍦ㄨ寖鍥村唴:', inRange);
    if (inRange) {
      console.log('[涓嶄笂绾挎椂娈垫鏌 鉁?鍦ㄤ笉涓婄嚎鏃舵鍐?);
      console.log('[涓嶄笂绾挎椂娈垫鏌 ========== 缁撴潫妫€鏌?==========');
      return true;
    }
  }
  
  // 鍛ㄦ棩 19:50-20:40
  if (dayOfWeek === 0) {
    const startTime = 19 * 60 + 50; // 19:50 = 1190鍒嗛挓
    const endTime = 20 * 60 + 40;   // 20:40 = 1240鍒嗛挓
    console.log('[涓嶄笂绾挎椂娈垫鏌 鍛ㄦ棩鏃舵:', `${startTime}-${endTime}鍒嗛挓 (19:50-20:40)`);
    const inRange = currentTime >= startTime && currentTime <= endTime;
    console.log('[涓嶄笂绾挎椂娈垫鏌 鏄惁鍦ㄨ寖鍥村唴:', inRange);
    if (inRange) {
      console.log('[涓嶄笂绾挎椂娈垫鏌 鉁?鍦ㄤ笉涓婄嚎鏃舵鍐?);
      console.log('[涓嶄笂绾挎椂娈垫鏌 ========== 缁撴潫妫€鏌?==========');
      return true;
    }
  }
  
  console.log('[涓嶄笂绾挎椂娈垫鏌  涓嶅湪涓嶄笂绾挎椂娈靛唴');
  console.log('[涓嶄笂绾挎椂娈垫鏌 ========== 缁撴潫妫€鏌?==========');
  return false;
};

/**
 * 娴嬭瘯涓嶄笂绾挎椂娈靛姛鑳斤紙涓存椂娴嬭瘯鍑芥暟锛? */
const testOfflineTime = () => {
  console.log('\n========== 娴嬭瘯涓嶄笂绾挎椂娈靛姛鑳?==========');
  const result = isInOfflineTime();
  console.log('娴嬭瘯缁撴灉:', result ? '鍦ㄤ笉涓婄嚎鏃舵鍐? : '涓嶅湪涓嶄笂绾挎椂娈靛唴');
  console.log('========================================\n');
  return result;
};

// 鏆撮湶鍒板叏灞€渚涙祴璇?window.testOfflineTime = testOfflineTime;

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
 * 鎵归噺鎺у埗鎵€鏈変换鍔＄殑涓嶄笂绾挎椂娈靛紑鍏? * @param {boolean} enabled - true涓哄紑鍚紝false涓哄叧闂? */
const toggleAllOfflineTime = (enabled) => {
  if (scheduledTasks.value.length === 0) {
    message.warning("娌℃湁瀹氭椂浠诲姟鍙搷浣?);
    return;
  }
  
  const action = enabled ? "寮€鍚? : "鍏抽棴";
  
  // 鏇存柊鎵€鏈変换鍔＄殑涓嶄笂绾挎椂娈佃缃?  scheduledTasks.value.forEach(task => {
    task.offlineTimeEnabled = enabled;
  });
  
  // 淇濆瓨鍒發ocalStorage
  saveScheduledTasks();
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 宸叉壒閲?{action}鎵€鏈夊畾鏃朵换鍔＄殑涓嶄笂绾挎椂娈?===`,
    type: "success",
  });
  
  message.success(`宸叉壒閲?{action}鎵€鏈夊畾鏃朵换鍔＄殑涓嶄笂绾挎椂娈礰);
};

// Open task modal for adding new task
// 鍙栨秷浠诲姟缂栬緫
const cancelTaskEdit = () => {
  showTaskModal.value = false;
  // 寤惰繜閲嶇疆琛ㄥ崟锛岄伩鍏嶆ā鎬佹鍏抽棴鍔ㄧ敾鏃剁湅鍒拌〃鍗曞彉鍖?  setTimeout(() => {
    editingTask.value = null;
    
    // 鐩存帴璧嬪€奸噸缃〃鍗?    taskForm.name = "";
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
      7: { selected: false, count: 1, label: "闅忔満绾㈠皢纰庣墖", min: 1, max: 1 },
      8: { selected: false, count: 1, label: "鐧界帀", min: 1, max: 1 },
      9: { selected: false, count: 1, label: "鍐涘洟甯?, min: 1, max: 1 },
      10: { selected: false, count: 20, label: "杩涢樁鐭?, min: 1, max: 20 },
      11: { selected: false, count: 20, label: "绮鹃搧", min: 1, max: 20 },
    };
    
    taskForm.weeklyMarketItems = {
      0: { selected: false, label: "鍏嶈垂閲戠爾" },
      1: { selected: false, label: "榛戝競瑙侀潰绀? },
      2: { selected: false, label: "榛戝競鎯婂枩绀? },
      3: { selected: false, label: "鍒濈骇榛戝競鍖? },
      4: { selected: false, label: "涓骇榛戝競鍖? },
      5: { selected: false, label: "楂樼骇榛戝競鍖? },
      6: { selected: false, label: "椤剁骇楸肩鍖? },
      7: { selected: false, label: "鐧界帀榛戝競鍖? },
      8: { selected: false, label: "鐗圭骇鐏佃礉鍖? },
      9: { selected: false, label: "鍏绘垚琛ョ粰鍖? },
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
      useGoldRefreshFallback: false,
    };
    taskForm.nightmarePresetIds = [];
    taskForm.nightmarePresetDelay = 10;
    taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
    taskScheduleSelectedGroupIds.value = [];
  }, 300);
};

const openTaskModal = () => {
  editingTask.value = null;
  
  console.log('[鏂板浠诲姟] 寮€濮嬪垵濮嬪寲琛ㄥ崟');
  
  // 閲嶇疆琛ㄥ崟锛岀洿鎺ヨ祴鍊ょ‘淇濆祵濂楀璞℃纭噸缃?  taskForm.name = "";
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
  
  // 鐩存帴璧嬪€煎姪濞佸晢搴楅厤缃?  taskForm.legionStoreItems = {
    7: { selected: false, count: 1, label: "闅忔満绾㈠皢纰庣墖", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "鐧界帀", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "鍐涘洟甯?, min: 1, max: 1 },
    10: { selected: false, count: 20, label: "杩涢樁鐭?, min: 1, max: 20 },
    11: { selected: false, count: 20, label: "绮鹃搧", min: 1, max: 20 },
  };
  
  // 鐩存帴璧嬪€奸粦甯傚晢鍝侀厤缃?  taskForm.weeklyMarketItems = {
    0: { selected: false, label: "鍏嶈垂閲戠爾" },
    1: { selected: false, label: "榛戝競瑙侀潰绀? },
    2: { selected: false, label: "榛戝競鎯婂枩绀? },
    3: { selected: false, label: "鍒濈骇榛戝競鍖? },
    4: { selected: false, label: "涓骇榛戝競鍖? },
    5: { selected: false, label: "楂樼骇榛戝競鍖? },
    6: { selected: false, label: "椤剁骇楸肩鍖? },
    7: { selected: false, label: "鐧界帀榛戝競鍖? },
    8: { selected: false, label: "鐗圭骇鐏佃礉鍖? },
    9: { selected: false, label: "鍏绘垚琛ョ粰鍖? },
  };
  
  // 鐩存帴璧嬪€煎疂绠卞懆濂栧姳閰嶇疆
  taskForm.boxWeeklyRewards = {5: 1};
  
  // 鏅鸿兘鍙戣溅浠诲姟绾ч厤缃?  taskForm.smartDeparture = {
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
  
  // 鐩愭櫠鍟嗗簵閰嶇疆
  taskForm.saltCrystalShopItems = {
    201: { selected: false, count: 0, label: "鍥涘湥钃濈帀", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "鍥涘湥绾㈢帀", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "鎴愰暱鑴嗛ゼ", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "骞诲僵鐏垫灉", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "鏂戠偣铔?, min: 1, max: 5 },
  };
  
  // 鐩愰敪鍟嗗簵閰嶇疆
  taskForm.saltIngotShopItems = {
    1: { selected: false, count: 0, label: "鐨偆甯?, min: 1, max: 5 },
    2: { selected: false, count: 0, label: "鍐涘洟甯?, min: 1, max: 1 },
    3: { selected: false, count: 0, label: "杩涢樁鐭?, min: 1, max: 1 },
    4: { selected: false, count: 0, label: "绮鹃搧", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "鐧界帀", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "鍥涘湥瀹濈彔纰庣墖", min: 1, max: 1 },
  };

  // 榛戝競澶氶€夎喘涔板晢鍝侀厤缃?  taskForm.manualBuyItems = {
    1: { selected: false, count: 0, label: "闈掗摐瀹濈" },
    2: { selected: false, count: 0, label: "榛勯噾瀹濈" },
    3: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4: { selected: false, count: 0, label: "杩涢樁鐭? },
    5: { selected: false, count: 0, label: "绮鹃搧" },
    6: { selected: false, count: 0, label: "鎷涘嫙浠? },
    7: { selected: false, count: 0, label: "闅忔満绾㈠皢纰庣墖" },
    8: { selected: false, count: 0, label: "闅忔満姗欏皢纰庣墖" },
    9: { selected: false, count: 0, label: "闅忔満绱皢纰庣墖" },
    10: { selected: false, count: 0, label: "姊﹂瓏鏅剁煶" },
    11: { selected: false, count: 0, label: "鏅€氶奔绔? },
    12: { selected: false, count: 0, label: "榛勯噾楸肩" },
    13: { selected: false, count: 0, label: "鍜哥闂ㄧエ" },
    14: { selected: false, count: 0, label: "鐧界帀" },
    15: { selected: false, count: 0, label: "褰╃帀" },
    16: { selected: false, count: 0, label: "鎵虫墜" },
  };

  // 鐝嶅疂闃佸晢搴楄喘涔板晢鍝侀厤缃?  taskForm.collectionExchangeItems = {
    7001: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4001: { selected: false, count: 0, label: "鍐涘洟甯? },
    5001: { selected: false, count: 0, label: "鎷涘嫙浠? },
    6001: { selected: false, count: 0, label: "涓囪兘绾㈠皢纰庣墖" },
  };

  // 鍗佹棰勮閰嶇疆
  taskForm.nightmarePresetIds = [];
  taskForm.nightmarePresetDelay = 10;
  
  // 纰庣墖绀煎寘閰嶇疆锛堥粯璁ゅ叏閫夛級
  taskForm.fragmentPackItems = [3007, 3005, 3006, 3008, 3009, 3011, 3012, 35011, 3001, 3002, 3010, 37005];
  
  console.log('[鏂板浠诲姟] 鍒濆鍖栧畬鎴?);
  console.log('[鏂板浠诲姟] weeklyMarketItems:', taskForm.weeklyMarketItems);
  console.log('[鏂板浠诲姟] legionStoreItems:', taskForm.legionStoreItems);
  
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// Edit existing task
const editTask = (task) => {
  editingTask.value = task;
  
  // 榛樿鍔╁▉鍟嗗簵閰嶇疆
  const defaultLegionStoreItems = {
    7: { selected: false, count: 1, label: "闅忔満绾㈠皢纰庣墖", min: 1, max: 1 },
    8: { selected: false, count: 1, label: "鐧界帀", min: 1, max: 1 },
    9: { selected: false, count: 1, label: "鍐涘洟甯?, min: 1, max: 1 },
    10: { selected: false, count: 20, label: "杩涢樁鐭?, min: 1, max: 20 },
    11: { selected: false, count: 20, label: "绮鹃搧", min: 1, max: 20 },
  };
  
  // 榛樿榛戝競鍟嗗搧閰嶇疆
  const defaultWeeklyMarketItems = {
    0: { selected: false, label: "鍏嶈垂閲戠爾" },
    1: { selected: false, label: "榛戝競瑙侀潰绀? },
    2: { selected: false, label: "榛戝競鎯婂枩绀? },
    3: { selected: false, label: "鍒濈骇榛戝競鍖? },
    4: { selected: false, label: "涓骇榛戝競鍖? },
    5: { selected: false, label: "楂樼骇榛戝競鍖? },
    6: { selected: false, label: "椤剁骇楸肩鍖? },
    7: { selected: false, label: "鐧界帀榛戝競鍖? },
    8: { selected: false, label: "鐗圭骇鐏佃礉鍖? },
    9: { selected: false, label: "鍏绘垚琛ョ粰鍖? },
  };
  
  // 榛樿鐩愭櫠鍟嗗簵閰嶇疆
  const defaultSaltCrystalShopItems = {
    201: { selected: false, count: 0, label: "鍥涘湥钃濈帀", min: 1, max: 60 },
    202: { selected: false, count: 5, label: "鍥涘湥绾㈢帀", min: 1, max: 50 },
    203: { selected: false, count: 0, label: "鎴愰暱鑴嗛ゼ", min: 1, max: 60 },
    204: { selected: false, count: 0, label: "骞诲僵鐏垫灉", min: 1, max: 60 },
    205: { selected: false, count: 5, label: "鏂戠偣铔?, min: 1, max: 5 },
  };
  
  // 榛樿鐩愰敪鍟嗗簵閰嶇疆
  const defaultSaltIngotShopItems = {
    1: { selected: false, count: 0, label: "鐨偆甯?, min: 1, max: 5 },
    2: { selected: false, count: 0, label: "鍐涘洟甯?, min: 1, max: 1 },
    3: { selected: false, count: 0, label: "杩涢樁鐭?, min: 1, max: 1 },
    4: { selected: false, count: 0, label: "绮鹃搧", min: 1, max: 1 },
    5: { selected: false, count: 0, label: "鐧界帀", min: 1, max: 1 },
    6: { selected: false, count: 1, label: "鍥涘湥瀹濈彔纰庣墖", min: 1, max: 1 },
  };
  
  // 榛樿榛戝競澶氶€夎喘涔伴厤缃?  const defaultManualBuyItems = {
    1: { selected: false, count: 0, label: "闈掗摐瀹濈" },
    2: { selected: false, count: 0, label: "榛勯噾瀹濈" },
    3: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4: { selected: false, count: 0, label: "杩涢樁鐭? },
    5: { selected: false, count: 0, label: "绮鹃搧" },
    6: { selected: false, count: 0, label: "鎷涘嫙浠? },
    7: { selected: false, count: 0, label: "闅忔満绾㈠皢纰庣墖" },
    8: { selected: false, count: 0, label: "闅忔満姗欏皢纰庣墖" },
    9: { selected: false, count: 0, label: "闅忔満绱皢纰庣墖" },
    10: { selected: false, count: 0, label: "姊﹂瓏鏅剁煶" },
    11: { selected: false, count: 0, label: "鏅€氶奔绔? },
    12: { selected: false, count: 0, label: "榛勯噾楸肩" },
    13: { selected: false, count: 0, label: "鍜哥闂ㄧエ" },
    14: { selected: false, count: 0, label: "鐧界帀" },
    15: { selected: false, count: 0, label: "褰╃帀" },
    16: { selected: false, count: 0, label: "鎵虫墜" },
  };
  
  // 榛樿鐝嶅疂闃佸晢搴楄喘涔伴厤缃?  const defaultCollectionExchangeItems = {
    7001: { selected: false, count: 0, label: "閾傞噾瀹濈" },
    4001: { selected: false, count: 0, label: "鍐涘洟甯? },
    5001: { selected: false, count: 0, label: "鎷涘嫙浠? },
    6001: { selected: false, count: 0, label: "涓囪兘绾㈠皢纰庣墖" },
  };
  
  // 鍚堝苟鍔╁▉鍟嗗簵閰嶇疆锛岃ˉ鍏呯己澶辩殑label
  const mergedLegionStoreItems = { ...defaultLegionStoreItems };
  if (task.legionStoreItems) {
    Object.keys(task.legionStoreItems).forEach(key => {
      if (mergedLegionStoreItems[key]) {
        // 淇濈暀鐢ㄦ埛鐨勯€夋嫨锛屼絾琛ュ厖label绛夊瓧娈?        mergedLegionStoreItems[key] = {
          ...mergedLegionStoreItems[key],
          ...task.legionStoreItems[key],
        };
      }
    });
  }
  
  // 鍚堝苟榛戝競鍟嗗搧閰嶇疆锛岃ˉ鍏呯己澶辩殑label
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
  
  // 鍚堝苟鐩愭櫠鍟嗗簵閰嶇疆锛岃ˉ鍏呯己澶辩殑label
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
  
  // 鍚堝苟鐩愰敪鍟嗗簵閰嶇疆锛岃ˉ鍏呯己澶辩殑label
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
  
  // 鍚堝苟榛戝競澶氶€夎喘涔伴厤缃紝琛ュ厖缂哄け鐨刲abel
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
  
  // 鍚堝苟鐝嶅疂闃佸晢搴楄喘涔伴厤缃紝琛ュ厖缂哄け鐨刲abel
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
    },
    nightmarePresetIds: task.nightmarePresetIds || [],
    nightmarePresetDelay: task.nightmarePresetDelay || 10,
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
  // 娴呮嫹璐濆熀鏈睘鎬?  Object.assign(taskForm, taskData);
  // 娣卞害鍚堝苟 smartDeparture锛屼繚鐣?Vue 鍝嶅簲寮?  if (taskData.smartDeparture) {
    Object.assign(taskForm.smartDeparture, taskData.smartDeparture);
  }
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// 娉? validateCronExpression 宸蹭粠 @/utils/batch 瀵煎叆

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

// 娉? calculateNextRuns 宸蹭粠 @/utils/batch 瀵煎叆

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("璇疯緭鍏ヤ换鍔″悕绉?);
    return;
  }

  // 鎺ㄥ浘浠诲姟鐗规畩楠岃瘉
  if (taskForm.taskType === 'push_map') {
    if (!taskForm.pushStartTime) {
      message.warning("璇烽€夋嫨寮€濮嬫帹鍥炬椂闂?);
      return;
    }
    // 鎺ㄥ浘浠诲姟鐩存帴璺宠繃鍏朵粬楠岃瘉锛岃繘鍏ヤ繚瀛橀€昏緫
    const msToTimeStr = (ms) => {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    const taskData = {
      id: editingTask.value?.id || "task_" + Date.now(),
      name: taskForm.name,
      taskType: 'push_map',
      runType: 'daily',
      runTime: msToTimeStr(taskForm.pushStartTime), // 浠ュ紑濮嬫椂闂翠负涓绘椂闂达紙璋冨害鍣ㄥ皢鏍规嵁姝ゆ椂闂磋Е鍙戯級
      cronExpression: '',
      selectedTokens: [],
      selectedTasks: [],
      enabled: taskForm.enabled,
      offlineTimeEnabled: false,
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
    message.success("鎺ㄥ浘瀹氭椂浠诲姟宸蹭繚瀛?);
    return;
  }
  // ===================== 浠ヤ笅涓烘櫘閫氫换鍔￠獙璇?=====================

  if (taskForm.runType === "daily" && !taskForm.runTime) {
    message.warning("璇烽€夋嫨杩愯鏃堕棿");
    return;
  }

  if (taskForm.runType === "cron") {
    if (!taskForm.cronExpression) {
      message.warning("璇疯緭鍏ron琛ㄨ揪寮?);
      return;
    }

    // Validate cron expression
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }

  // 鍗佹闃庣綏鎸戞垬棰勮鑷甫璐﹀彿锛堥槦闀?闃熷憳锛夛紝鏃犻渶棰濆閫夋嫨璐﹀彿
  const hasNightmarePresets = taskForm.selectedTasks.includes('batchNightmareChallengePresets') && (taskForm.nightmarePresetIds?.length > 0);
  // 鍏朵粬闇€瑕佽处鍙风殑浠诲姟锛堟帓闄ゅ崄娈块璁撅級
  const nonNightmareTasks = taskForm.selectedTasks.filter(t => t !== 'batchNightmareChallengePresets');
  
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length > 0 && !hasNightmarePresets) {
    message.warning("璇烽€夋嫨鑷冲皯涓€涓处鍙?);
    return;
  }
  // 濡傛灉鍙湁鍗佹棰勮浠诲姟涓旀湭閫夐璁撅紝鎻愮ず閫夋嫨棰勮
  if (taskForm.selectedTokens.length === 0 && nonNightmareTasks.length === 0 && !hasNightmarePresets) {
    message.warning("璇烽€夋嫨鑷冲皯涓€涓处鍙凤紝鎴栭€夋嫨鍗佹闃庣綏鎸戞垬棰勮锛堥璁捐嚜甯﹁处鍙凤級");
    return;
  }

  if (taskForm.selectedTasks.length === 0) {
    message.warning("璇烽€夋嫨鑷冲皯涓€涓换鍔?);
    return;
  }
  
  // 楠岃瘉鍔╁▉鍟嗗簵鏄惁閫夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('legion_buy_store_items')) {
    const hasSelectedItem = Object.values(taskForm.legionStoreItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("鍔╁▉鍟嗗簵澶氶€夎喘涔伴渶瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }

  // 楠岃瘉娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楁槸鍚﹂€夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('batchActivityExchange')) {
    const hasSelectedItem = taskForm.activityExchangeItems && Object.values(taskForm.activityExchangeItems).some(item => item && item.selected);
    if (!hasSelectedItem) {
      message.warning("娑堣€楁椿鍔ㄥ厬鎹㈣喘涔伴渶瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }
  
  // 楠岃瘉鐩愭櫠鍟嗗簵鏄惁閫夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('salt_crystal_shop_buy')) {
    const hasSelectedItem = taskForm.saltCrystalShopItems && Object.values(taskForm.saltCrystalShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("鐩愭櫠鍟嗗簵闇€瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }
  
  // 楠岃瘉鐩愰敪鍟嗗簵鏄惁閫夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('salt_ingot_shop_buy')) {
    const hasSelectedItem = taskForm.saltIngotShopItems && Object.values(taskForm.saltIngotShopItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("鐩愰敪鍟嗗簵闇€瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }
  
  // 楠岃瘉榛戝競澶氶€夎喘涔版槸鍚﹂€夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('manual_buy')) {
    const hasSelectedItem = taskForm.manualBuyItems && Object.values(taskForm.manualBuyItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("榛戝競澶氶€夎喘涔伴渶瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }
  
  // 楠岃瘉鐝嶅疂闃佸晢搴楄喘涔版槸鍚﹂€夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('collection_exchange')) {
    const hasSelectedItem = taskForm.collectionExchangeItems && Object.values(taskForm.collectionExchangeItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("鐝嶅疂闃佸晢搴楄喘涔伴渶瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }
  
  // 楠岃瘉榛戝競鍛ㄨ喘涔版槸鍚﹂€夋嫨浜嗗晢鍝?  if (taskForm.selectedTasks.includes('weekly_market_buy')) {
    const hasSelectedItem = Object.values(taskForm.weeklyMarketItems).some(item => item.selected);
    if (!hasSelectedItem) {
      message.warning("榛戝競鍛ㄨ喘涔伴渶瑕佽嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
  }

  // 楠岃瘉鍗佹闃庣綏鎸戞垬鏄惁閫夋嫨浜嗛璁?  if (taskForm.selectedTasks.includes('batchNightmareChallengePresets')) {
    if (!taskForm.nightmarePresetIds || taskForm.nightmarePresetIds.length === 0) {
      message.warning("鍗佹闃庣綏鎸戞垬闇€瑕佽嚦灏戦€夋嫨涓€涓璁?);
      return;
    }
  }

  // 楠岃瘉瀹濈鍛ㄤ换鍔℃槸鍚﹀湪褰撳墠鏄疂绠卞懆锛堜繚瀛樻椂鎻愰啋锛?  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = taskForm.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    message.warning("褰撳墠涓嶆槸瀹濈鍛紝瀹濈鍛ㄤ换鍔″皢鍦ㄥ疂绠卞懆鏈熼棿鑷姩鎵ц");
    // 涓嶉樆姝繚瀛橈紝浣嗙粰鐢ㄦ埛鎻愮ず
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
    offlineTimeEnabled: taskForm.offlineTimeEnabled || false, // 淇濆瓨涓嶄笂绾挎椂娈佃缃?    // 濮嬬粓淇濆瓨瀹屾暣閰嶇疆锛岀‘淇濈紪杈戞椂鑳芥纭樉绀?    legionStoreItems: JSON.parse(JSON.stringify(taskForm.legionStoreItems)),
    weeklyMarketItems: JSON.parse(JSON.stringify(taskForm.weeklyMarketItems)),
    saltCrystalShopItems: JSON.parse(JSON.stringify(taskForm.saltCrystalShopItems)),
    saltIngotShopItems: JSON.parse(JSON.stringify(taskForm.saltIngotShopItems)),
    manualBuyItems: JSON.parse(JSON.stringify(taskForm.manualBuyItems)),
    collectionExchangeItems: JSON.parse(JSON.stringify(taskForm.collectionExchangeItems)),
    fragmentPackItems: [...(taskForm.fragmentPackItems || [])],
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
  message.success("瀹氭椂浠诲姟宸蹭繚瀛?);
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 瀹氭椂浠诲姟 ${task.name} 宸插垹闄?===`,
      type: "info",
    });
    message.success("瀹氭椂浠诲姟宸插垹闄?);
  }
};

// Delete all scheduled tasks
const deleteAllScheduledTasks = () => {
  const count = scheduledTasks.value.length;
  if (count === 0) return;
  
  if (!confirm(`纭畾瑕佸垹闄ゅ叏閮?${count} 涓畾鏃朵换鍔″悧锛熸鎿嶄綔涓嶅彲鎭㈠锛乣)) return;
  
  scheduledTasks.value = [];
  saveScheduledTasks();
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 宸叉壒閲忓垹闄?${count} 涓畾鏃朵换鍔?===`,
    type: "info",
  });
  message.success(`宸插垹闄?${count} 涓畾鏃朵换鍔);
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`瀹氭椂浠诲姟宸?{enabled ? "鍚敤" : "绂佺敤"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 瀹氭椂浠诲姟 ${task.name} 宸?{enabled ? "鍚敤" : "绂佺敤"} ===`,
      type: "info",
    });
  }
};

// 鍚姩/鍏抽棴鎵€鏈夊畾鏃朵换鍔?const allTasksEnabled = computed(() =>
  scheduledTasks.value.length > 0 && scheduledTasks.value.every(t => t.enabled)
);

const enableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("鏆傛棤瀹氭椂浠诲姟"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = true; });
  saveScheduledTasks();
  message.success(`宸插惎鍔ㄦ墍鏈?${scheduledTasks.value.length} 涓畾鏃朵换鍔);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 宸插惎鍔ㄦ墍鏈?${scheduledTasks.value.length} 涓畾鏃朵换鍔?===`,
    type: "success",
  });
};

const disableAllScheduledTasks = () => {
  if (scheduledTasks.value.length === 0) { message.warning("鏆傛棤瀹氭椂浠诲姟"); return; }
  scheduledTasks.value.forEach(t => { t.enabled = false; });
  saveScheduledTasks();
  message.success(`宸插叧闂墍鏈?${scheduledTasks.value.length} 涓畾鏃朵换鍔);
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 宸插叧闂墍鏈?${scheduledTasks.value.length} 涓畾鏃朵换鍔?===`,
    type: "info",
  });
};

// 娉? addTaskSaveLog 宸蹭粠 @/utils/batch 瀵煎叆锛岃皟鐢ㄦ椂闇€浼犲叆 addLog

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
      message.error("瀹氭椂浠诲姟鏁版嵁鍔犺浇澶辫触锛岃鍒锋柊椤甸潰鍚庨噸璇?);
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
      message.success(`瀹氭椂閰嶇疆瀵煎嚭鎴愬姛: ${filteredScheduledTasks.length} 涓畾鏃朵换鍔);
    } else {
      message.error("瀵煎嚭澶辫触");
    }
  } catch (error) {
    console.error("Export scheduled tasks failed:", error);
    message.error("瀵煎嚭澶辫触: " + (error.message || error));
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
      message.error("鏃犳晥鐨勯厤缃枃浠舵牸寮忥細缂哄皯鐗堟湰鍙?);
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "scheduled-tasks") {
      message.error("杩欐槸璐﹀彿閰嶇疆鏂囦欢锛岃浣跨敤銆屽鍏ヨ处鍙烽厤缃€嶅姛鑳?);
      return;
    }
    if (!importData.scheduledTasks && !importData.configType) {
      message.error("鏃犳晥鐨勫畾鏃堕厤缃枃浠舵牸寮忥細缂哄皯瀹氭椂浠诲姟鏁版嵁");
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
    if (importedTasks > 0) parts.push(`${importedTasks} 涓柊瀹氭椂浠诲姟`);
    if (importData.batchSettings) parts.push('鎵归噺璁剧疆宸叉仮澶?);
    if (parts.length === 0) parts.push('鏃犳柊澧炴暟鎹紙宸插瓨鍦級');

    message.success(`瀹氭椂閰嶇疆瀵煎叆鎴愬姛: ${parts.join(', ')}`);
  } catch (error) {
    console.error("Import scheduled tasks failed:", error);
    message.error("瀵煎叆澶辫触: " + (error.message || error));
  }
};

// ===== 瀵煎叆瀵煎嚭鍏变韩杈呭姪鍑芥暟 =====

// 璇诲彇鏂囦欢鍐呭涓烘枃鏈紙Promise鍖栵級
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('鏂囦欢璇诲彇澶辫触'));
    reader.readAsText(file);
  });
};

// ArrayBuffer 鈫?Base64 瀛楃涓?const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // 鍒嗗潡澶勭悊锛岄伩鍏嶅ぇ鏂囦欢鏍堟孩鍑?  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

// Base64 瀛楃涓?鈫?ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 鏀堕泦鎵€鏈塼oken鐨凚IN鏁版嵁锛堜粠IndexedDB锛?const collectBinData = async (tokenList) => {
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
          console.log(`瀵煎嚭BIN鏁版嵁: ${token.name} (${binData.byteLength} bytes)`);
        } else {
          console.warn(`鏈壘鍒癟oken "${token.name}" 鐨凚IN鏁版嵁`);
        }
      } catch (error) {
        console.error(`瀵煎嚭Token "${token.name}" BIN鏁版嵁澶辫触:`, error);
      }
    }
  }
  return binDataMap;
};

// 瀵煎叆BIN鏁版嵁鍒癐ndexedDB
const importBinData = async (binData) => {
  if (!binData || typeof binData !== 'object' || Object.keys(binData).length === 0) {
    return 0;
  }
  // 纭繚IndexedDB宸插氨缁?  try {
    await useIndexedDB().ensureReady();
  } catch (e) {
    console.warn('绛夊緟IndexedDB灏辩华瓒呮椂:', e.message);
  }

  let importedCount = 0;
  for (const [tokenId, base64Data] of Object.entries(binData)) {
    try {
      if (!base64Data || typeof base64Data !== 'string') {
        console.warn(`璺宠繃鏃犳晥BIN鏁版嵁: Token ID ${tokenId}`);
        continue;
      }
      const token = gameTokens.value.find(t => t.id === tokenId);
      if (!token) {
        console.warn(`璺宠繃BIN鏁版嵁瀵煎叆: 鏈壘鍒癟oken ID ${tokenId}`);
        continue;
      }
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const success = await storeArrayBufferToDB(tokenId, arrayBuffer);
      if (success) {
        importedCount++;
        // 楠岃瘉鍐欏叆
        const verify = await getArrayBufferFromDB(tokenId);
        if (!verify) {
          console.warn(`BIN鏁版嵁鍐欏叆楠岃瘉澶辫触: ${token.name}`);
          importedCount--;
        } else {
          console.log(`瀵煎叆BIN鏁版嵁鎴愬姛: ${token.name} (${arrayBuffer.byteLength} bytes)`);
        }
      } else {
        console.error(`瀵煎叆BIN鏁版嵁澶辫触: ${token.name}`);
      }
    } catch (error) {
      console.error(`澶勭悊Token BIN鏁版嵁澶辫触 [${tokenId}]:`, error);
    }
  }
  return importedCount;
};

// 鏀堕泦姣忎釜token鐨勬棩甯镐换鍔¤缃?const collectTokenSettings = (tokenList) => {
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

// 瀵煎叆token璁剧疆鍒發ocalStorage
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

// 灏唗oken鍒楄〃鏄犲皠涓哄鍑烘牸寮忥紙鍖呭惈鎵€鏈夊繀瑕佸瓧娈碉級
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

// 閫氱敤鏂囦欢瑙ｆ瀽锛堟敮鎸佸姞瀵?Base64/鏅€欽SON锛?const parseExportFile = async (fileContent) => {
  const fileData = JSON.parse(fileContent);
  
  if (fileData.encrypted && fileData.data) {
    // 鍔犲瘑鏂囦欢
    let password;
    try {
      password = await showPasswordDialog('瑙ｅ瘑瀵煎叆閰嶇疆', '璇疯緭鍏ヨВ瀵嗗瘑鐮?);
    } catch (err) {
      return { cancelled: true };
    }
    const isCryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
    if (!isCryptoAvailable) {
      throw new Error('褰撳墠鐜涓嶆敮鎸丄ES瑙ｅ瘑锛岃鍦℉TTPS鎴杔ocalhost鐜涓嬪鍏ュ姞瀵嗘枃浠?);
    }
    try {
      return { data: await decryptConfigData(fileData.data, password) };
    } catch (e) {
      throw new Error('瑙ｅ瘑澶辫触: 瀵嗙爜閿欒鎴栨枃浠跺凡鎹熷潖');
    }
  } else if (fileData.data && fileData.encoding === 'base64') {
    // Base64缂栫爜鏂囦欢
    try {
      const decoded = decodeURIComponent(escape(atob(fileData.data)));
      return { data: JSON.parse(decoded) };
    } catch (e) {
      throw new Error('Base64瑙ｇ爜澶辫触: 鏂囦欢宸叉崯鍧?);
    }
  } else {
    // 鏈姞瀵嗘枃浠?    return { data: fileData };
  }
};

// 閫氱敤鍔犲瘑瀵煎嚭锛堝脊鍑哄瘑鐮佹 鈫?鍔犲瘑/Base64 鈫?涓嬭浇锛?const encryptAndDownload = async (exportData, filename) => {
  let password;
  try {
    password = await showPasswordDialog('鍔犲瘑瀵煎嚭閰嶇疆', '璇疯緭鍏ュ姞瀵嗗瘑鐮侊紙鑷冲皯6浣嶏級');
  } catch (e) {
    return false; // 鐢ㄦ埛鍙栨秷
  }
  if (password.length < 6) {
    message.error('瀵嗙爜闀垮害鑷冲皯6浣?);
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
    console.warn('crypto.subtle涓嶅彲鐢紝浣跨敤Base64缂栫爜瀵煎嚭');
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

// 鑾峰彇瀹屾暣鐨刡atchSettings瀵煎嚭瀵硅薄
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

// 鍔犲瘑閰嶇疆鏁版嵁
const encryptConfigData = async (data, password) => {
  try {
    // 灏嗘暟鎹浆涓篔SON瀛楃涓?    const jsonStr = JSON.stringify(data);
    
    // 浣跨敤Web Crypto API杩涜AES-GCM鍔犲瘑
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    
    // 浠庡瘑鐮佺敓鎴愬瘑閽?    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    // 鐢熸垚闅忔満IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 鍔犲瘑鏁版嵁
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    );
    
    // 灏咺V鍜屽姞瀵嗘暟鎹粍鍚? IV(12 bytes) + 鍔犲瘑鏁版嵁
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    // 杞负Base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('鍔犲瘑澶辫触:', error);
    throw new Error('鍔犲瘑澶辫触: ' + error.message);
  }
};

// 瑙ｅ瘑閰嶇疆鏁版嵁
const decryptConfigData = async (encryptedData, password) => {
  try {
    // Base64瑙ｇ爜
    const binaryString = atob(encryptedData);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // 鎻愬彇IV鍜屽姞瀵嗘暟鎹?    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // 浠庡瘑鐮佺敓鎴愬瘑閽?    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // 瑙ｅ瘑鏁版嵁
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBuffer
    );
    
    // 杞负JSON瀵硅薄
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('瑙ｅ瘑澶辫触:', error);
    throw new Error('瑙ｅ瘑澶辫触: 瀵嗙爜閿欒鎴栨枃浠跺凡鎹熷潖');
  }
};

// 鏄剧ず瀵嗙爜杈撳叆瀵硅瘽妗?const showPasswordDialog = (title, placeholder) => {
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
          ">鍙栨秷</button>
          <button id="confirm-btn" style="
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            background: #2080f0;
            color: white;
            cursor: pointer;
            font-size: 14px;
          ">纭畾</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    const input = dialog.querySelector('#password-input');
    const cancelBtn = dialog.querySelector('#cancel-btn');
    const confirmBtn = dialog.querySelector('#confirm-btn');
    
    input.focus();
    
    // 鍥炶溅閿‘璁?    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });
    
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
      reject(new Error('鐢ㄦ埛鍙栨秷'));
    };
    
    confirmBtn.onclick = () => {
      const password = input.value.trim();
      if (!password) {
        input.style.borderColor = '#ff4d4f';
        input.placeholder = '瀵嗙爜涓嶈兘涓虹┖';
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
      message.warning("娌℃湁鍙鍑虹殑璐﹀彿");
      return;
    }

    // 鏀堕泦BIN鏁版嵁
    const binDataMap = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;
    const totalBinTokens = tokens.value.filter(t => t.importMethod === "bin" || t.importMethod === "wxQrcode").length;
    if (totalBinTokens > 0 && binCount < totalBinTokens) {
      console.warn(`BIN鏁版嵁涓嶅畬鏁? ${binCount}/${totalBinTokens} 涓猼oken鏈塀IN鏁版嵁`);
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

    if (success === false) return; // 鐢ㄦ埛鍙栨秷鎴栧瘑鐮佸お鐭?    if (success) {
      const isInApk = window.Capacitor !== undefined;
      const binMsg = binCount > 0 ? ` (鍚?{binCount}涓狟IN鏁版嵁)` : '';
      message.success(
        `璐﹀彿閰嶇疆瀵煎嚭鎴愬姛: ${tokens.value.length} 涓处鍙?{binMsg}${isInApk ? '锛岃鏌ョ湅鍒嗕韩瀵硅瘽妗嗕繚瀛? : ''}`,
        { duration: 4000 }
      );
    } else {
      message.error("瀵煎嚭澶辫触");
    }
  } catch (error) {
    console.error("Export accounts failed:", error);
    message.error("瀵煎嚭澶辫触: " + (error.message || error));
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

    // 楠岃瘉缁撴瀯
    if (!importData.version) {
      message.error("鏃犳晥鐨勯厤缃枃浠舵牸寮忥細缂哄皯鐗堟湰鍙?);
      return;
    }
    if (importData.version >= "1.2" && importData.configType && importData.configType !== "accounts") {
      message.error("杩欐槸瀹氭椂閰嶇疆鏂囦欢锛岃浣跨敤銆屽鍏ュ畾鏃堕厤缃€嶅姛鑳?);
      return;
    }
    if (!importData.tokens && !importData.configType) {
      message.error("鏃犳晥鐨勮处鍙烽厤缃枃浠舵牸寮?);
      return;
    }

    let importedTokens = 0;
    let skippedTokens = 0;

    // 瀵煎叆tokens
    if (Array.isArray(importData.tokens) && importData.tokens.length > 0) {
      if (!gameTokens.value || !Array.isArray(gameTokens.value)) {
        message.error("璐﹀彿鏁版嵁瀛樺偍寮傚父锛岃鍒锋柊椤甸潰鍚庨噸璇?);
        return;
      }

      importData.tokens.forEach((token) => {
        if (!token.token) {
          console.warn('璺宠繃鏃犳晥token锛氱己灏憈oken瀛楁', token.name || token.id);
          return;
        }
        const exists = gameTokens.value.some(t => t.token === token.token || t.id === token.id);
        if (exists) {
          skippedTokens++;
          // 濡傛灉宸插瓨鍦ㄤ絾鏈夋洿鏂扮殑BIN鏁版嵁importMethod锛屼繚鐣欏師濮媔mportMethod
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

    // 瀵煎叆BIN鏁版嵁鍒癐ndexedDB
    let importedBinCount = 0;
    if (importData.binData && Object.keys(importData.binData).length > 0) {
      importedBinCount = await importBinData(importData.binData);
      if (importedBinCount > 0) {
        console.log(`鎴愬姛瀵煎叆 ${importedBinCount} 涓狟IN鏁版嵁`);
      }
    } else {
      // 鍏煎鏃х増锛氭病鏈塨inData瀛楁
      const binTokens = (importData.tokens || []).filter(t =>
        (t.importMethod === "bin" || t.importMethod === "wxQrcode") &&
        gameTokens.value.some(gt => gt.id === t.id)
      );
      if (binTokens.length > 0) {
        console.warn(`閰嶇疆鏂囦欢鐗堟湰杈冧綆(${importData.version})锛屼笉鍖呭惈BIN鏁版嵁`);
        message.warning(
          `${binTokens.length}涓猙in/wxQrcode绫诲瀷鐨則oken缂哄皯BIN鏁版嵁锛屽彲鑳芥棤娉曟甯稿埛鏂癟oken銆傚缓璁噸鏂板鍏ュ師濮婤IN鏂囦欢銆俙,
          { duration: 6000 }
        );
      }
    }

    // 瀵煎叆token璁剧疆
    const settingsCount = importTokenSettings(importData.tokenSettings);

    // 鏋勫缓鎴愬姛娑堟伅
    const parts = [];
    if (importedTokens > 0) parts.push(`${importedTokens} 涓柊璐﹀彿`);
    if (skippedTokens > 0) parts.push(`${skippedTokens} 涓凡瀛樺湪璺宠繃`);
    if (importedBinCount > 0) parts.push(`${importedBinCount} 涓狟IN鏁版嵁`);
    if (settingsCount > 0) parts.push(`${settingsCount} 涓换鍔￠厤缃甡);
    const encryptTag = importData.version >= "1.4" ? ' [鍔犲瘑鏂囦欢]' : '';

    message.success(`璐﹀彿瀵煎叆鎴愬姛: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Import accounts failed:", error);
    message.error("瀵煎叆澶辫触: " + (error.message || error));
  }
};

// 鍏ㄩ噺瀵煎嚭锛堣处鍙?+ 瀹氭椂浠诲姟 + 鎵归噺璁剧疆 + BIN鏁版嵁 + 绠＄悊鍒嗙粍锛?const exportConfig = async () => {
  try {
    if (!tokens.value || tokens.value.length === 0) {
      message.warning("娌℃湁鍙鍑虹殑鏁版嵁");
      return;
    }

    const validTokenIds = new Set(tokens.value.map((t) => t.id));
    const filteredScheduledTasks = (scheduledTasks.value || []).map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((task) => task.taskType === 'push_map' || task.selectedTokens.length > 0);

    const binDataMap = await collectBinData(tokens.value);
    const binCount = Object.keys(binDataMap).length;

    // 鎺掑簭閰嶇疆
    let sortConfigData = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) sortConfigData = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // 绠＄悊鍒嗙粍鏁版嵁锛堣繃婊ゆ帀鏃犳湁鏁坱oken鐨勫垎缁勶級
    const filteredGroups = (tokenGroups.value || []).map((group) => ({
      ...group,
      tokenIds: group.tokenIds?.filter((tid) => validTokenIds.has(tid)) || [],
    })).filter((group) => group.tokenIds.length > 0);

    // 鍗佹棰勮鏁版嵁
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
      const binMsg = binCount > 0 ? ` (鍚?{binCount}涓狟IN鏁版嵁)` : '';
      const groupMsg = filteredGroups.length > 0 ? `, ${filteredGroups.length} 涓垎缁刞 : '';
      const templateMsg = (taskTemplates.value || []).length > 0 ? `, ${(taskTemplates.value || []).length} 涓换鍔℃ā鏉縛 : '';
      const nmMsg = (nightmarePresetsData || []).length > 0 ? `, ${(nightmarePresetsData || []).length} 涓崄娈块璁綻 : '';
      message.success(
        `鍏ㄩ噺瀵煎嚭鎴愬姛: ${tokens.value.length} 涓处鍙? ${filteredScheduledTasks.length} 涓畾鏃朵换鍔?{groupMsg}${templateMsg}${nmMsg}${binMsg}`,
        { duration: 4000 }
      );
    } else {
      message.error("瀵煎嚭澶辫触");
    }
  } catch (error) {
    console.error("Full export failed:", error);
    message.error("瀵煎嚭澶辫触: " + (error.message || error));
  }
};

// 鍏ㄩ噺瀵煎叆锛堣处鍙?+ 瀹氭椂浠诲姟 + 鎵归噺璁剧疆 + BIN鏁版嵁 + 绠＄悊鍒嗙粍 + 浠诲姟妯℃澘 + 鍗佹棰勮锛?const importConfig = async ({ file }) => {
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
      message.error("鏃犳晥鐨勯厤缃枃浠舵牸寮忥細缂哄皯鐗堟湰鍙?);
      return;
    }

    const stats = { tokens: 0, tasks: 0, bin: 0, settings: 0, groups: 0, templates: 0, nightmare: 0 };

    // 瀵煎叆tokens
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

    // 瀵煎叆BIN鏁版嵁
    if (importData.binData) {
      stats.bin = await importBinData(importData.binData);
    }

    // 瀵煎叆瀹氭椂浠诲姟
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

    // 瀵煎叆鎵归噺璁剧疆
    if (importData.batchSettings && typeof importData.batchSettings === 'object') {
      if (importData.batchSettings.moduleDelays && batchSettings.moduleDelays) {
        Object.assign(batchSettings.moduleDelays, importData.batchSettings.moduleDelays);
      }
      Object.assign(batchSettings, importData.batchSettings);
      try { localStorage.setItem("batchSettings", JSON.stringify(batchSettings)); } catch (e) { /* ignore */ }
    }

    // 瀵煎叆token璁剧疆
    if (importData.tokenSettings) {
      stats.settings = importTokenSettings(importData.tokenSettings);
    }

    // 瀵煎叆鎺掑簭閰嶇疆
    if (importData.sortConfig) {
      try { localStorage.setItem("tokenSortConfig", JSON.stringify(importData.sortConfig)); } catch (e) { /* ignore */ }
    }

    // 瀵煎叆绠＄悊鍒嗙粍
    if (Array.isArray(importData.tokenGroups) && importData.tokenGroups.length > 0) {
      const existingGroupIds = new Set(tokenGroups.value.map((g) => g.id));
      importData.tokenGroups.forEach((group) => {
        if (!group.id || !group.name) return;
        if (existingGroupIds.has(group.id)) {
          // 宸插瓨鍦ㄧ殑鍒嗙粍锛氬悎骞秚okenIds锛堝幓閲嶏級
          const existing = tokenGroups.value.find((g) => g.id === group.id);
          if (existing) {
            const mergedIds = new Set([...(existing.tokenIds || []), ...(group.tokenIds || [])]);
            existing.tokenIds = [...mergedIds];
            existing.updatedAt = new Date().toISOString();
            stats.groups++;
          }
        } else {
          // 鏂板垎缁勶細鐩存帴娣诲姞
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

    // 瀵煎叆浠诲姟妯℃澘
    if (Array.isArray(importData.taskTemplates) && importData.taskTemplates.length > 0) {
      const existingTemplates = taskTemplates.value || [];
      const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
      let importedTemplates = 0;
      importData.taskTemplates.forEach((template) => {
        if (!template.id || !template.name) return;
        if (existingTemplateIds.has(template.id)) return; // 璺宠繃宸插瓨鍦ㄧ殑妯℃澘
        existingTemplates.push(template);
        importedTemplates++;
      });
      if (importedTemplates > 0) {
        taskTemplates.value = existingTemplates;
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));
      }
      stats.templates = importedTemplates;
    }

    // 瀵煎叆鍗佹棰勮
    if (Array.isArray(importData.nightmarePresets) && importData.nightmarePresets.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('nightmare-presets') || '[]');
        const existingIds = new Set(existing.map((p) => p.id));
        let added = 0;
        importData.nightmarePresets.forEach((p) => {
          if (!p.id || !p.name) return;
          if (existingIds.has(p.id)) return;
          // 琛ュ厖缂哄け鐨勫崱鐐?闃熶紞榛樿鍊?          if (p.waitLevel8 === undefined) p.waitLevel8 = false;
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

    // 鏋勫缓娑堟伅
    const parts = [];
    if (stats.tokens > 0) parts.push(`${stats.tokens} 涓柊璐﹀彿`);
    if (stats.tasks > 0) parts.push(`${stats.tasks} 涓畾鏃朵换鍔);
    if (stats.groups > 0) parts.push(`${stats.groups} 涓垎缁刞);
    if (stats.templates > 0) parts.push(`${stats.templates} 涓换鍔℃ā鏉縛);
    if (stats.nightmare > 0) parts.push(`${stats.nightmare} 涓崄娈块璁綻);
    if (stats.bin > 0) parts.push(`${stats.bin} 涓狟IN鏁版嵁`);
    if (stats.settings > 0) parts.push(`${stats.settings} 涓换鍔￠厤缃甡);
    if (parts.length === 0) parts.push('鏃犳柊澧炴暟鎹紙宸插瓨鍦級');
    const encryptTag = importData.version >= "1.4" && importData.encrypted !== undefined ? ' [鍔犲瘑鏂囦欢]' : '';

    message.success(`鍏ㄩ噺瀵煎叆鎴愬姛: ${parts.join(', ')}${encryptTag}`, { duration: 4000 });
  } catch (error) {
    console.error("Full import failed:", error);
    message.error("瀵煎叆澶辫触: " + (error.message || error));
  }
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 娉? parseCronField, calculateNextExecutionTime, formatTimeDifference 宸蹭粠 @/utils/batch 瀵煎叆

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});
let _componentUnmounted = false; // 缁勪欢鍗歌浇鏍囧織锛岄槻姝?interval 鍥炶皟鍦ㄩ攢姣佸悗缁х画璁块棶鍝嶅簲寮忔暟鎹?
// Update countdowns for all tasks
const updateCountdowns = () => {
  if (_componentUnmounted) return; // 缁勪欢宸插嵏杞斤紝鐩存帴閫€鍑?  const now = Date.now();

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

// 璁＄畻鏈€鐭€掕鏃朵换鍔?const shortestCountdownTask = computed(() => {
  if (scheduledTasks.value.length === 0) return null;

  let shortestTask = null;
  let shortestTime = Infinity;

  // 閬嶅巻鎵€鏈変换鍔★紝鎵惧埌鍊掕鏃舵渶鐭殑浠诲姟
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

// 淇TimePicker鐨?Invalid time value"閿欒锛氱‘淇漴unTime鐨勫垵濮嬪€间笉鏄痭ull
watch(
  () => showTaskModal.value,
  (isVisible) => {
    if (isVisible && !taskForm.runTime) {
      // 褰撴ā鎬佹鏄剧ず涓攔unTime涓簄ull鏃讹紝灏嗗叾璁剧疆涓簎ndefined
      taskForm.runTime = undefined;
    }
  },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
let scheduledTaskStartTime = null; // 鉁?鍗曠嫭璺熻釜瀹氭椂浠诲姟寮€濮嬫椂闂达紝鐢ㄤ簬瓒呮椂妫€娴?
const pageLoadTime = Date.now();

// 璺熻釜瀹氭椂浠诲姟鏄惁姝ｅ湪鎵ц
const isScheduledTaskRunning = ref(false);
// 鍚屾鍒板叏灞€锛屼緵鎺ㄥ浘寰幆(pushMapRunner)妫€娴嬪畾鏃朵换鍔′簰鏂?watch(isScheduledTaskRunning, (v) => { window._isScheduledTaskRunning = v; }, { immediate: true });
let currentScheduledTask = null; // 褰撳墠姝ｅ湪鎵ц鐨勫畾鏃朵换鍔?const pendingTaskQueue = []; // 鉁?寰呮墽琛岄槦鍒楋細褰撳畾鏃朵换鍔″啿绐佹椂锛屾帓闃熺瓑寰呮墽琛?let _activeNightmareBattles = []; // 鉁?妯″潡绾у紩鐢細璺熻釜褰撳墠鍗佹鎴樻枟锛岀敤浜庤秴鏃朵紶瀵煎仠姝?
// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // 鉁?淇敼锛氫笉鍐嶅己鍒堕噸缃甶sRunning锛屽彧璁板綍璀﹀憡鏃ュ織
  // 鍘熷洜锛氭棩甯镐换鍔″璐﹀彿鎵ц鍙兘杈冮暱锛屼絾15鍒嗛挓鏃犳椿鍔ㄥ垯璁や负鍗℃
  if (isRunning.value) {
    const now = Date.now();
    const fifteenMinAgo = now - 15 * 60 * 1000; // 15 minutes ago
    if (lastTaskExecution && lastTaskExecution < fifteenMinAgo) {
      console.warn(
        `[${new Date().toISOString()}] isRunning has been true for more than 15 minutes without activity`,
      );
      // 鉁?淇锛氳秴鏃跺悗寮哄埗閲嶇疆 isRunning锛岄槻姝㈣皟搴﹀櫒姘歌繙琚樆濉?      // 涔嬪墠鍙褰曡鍛婁笉閲嶇疆锛屽鑷村悗缁墍鏈夊畾鏃朵换鍔￠兘鏃犳硶鎵ц
      if (!isScheduledTaskRunning.value) {
        // 浠呭湪闈炲畾鏃朵换鍔℃墽琛屾椂閲嶇疆锛堝畾鏃朵换鍔℃湁鑷繁鐨勭姸鎬佺鐞嗭級
        console.error(
          `[${new Date().toISOString()}] isRunning鍗′綇瓒呰繃15鍒嗛挓涓旀棤瀹氭椂浠诲姟杩愯锛屽己鍒堕噸缃甡,
        );
        isRunning.value = false;
        currentRunningTokenId.value = null;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 妫€娴嬪埌 isRunning 鍗′綇瓒呰繃15鍒嗛挓锛屽凡寮哄埗閲嶇疆锛堥潪瀹氭椂浠诲姟鐘舵€侊級 ===",
          type: "warning",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "=== 璀﹀憡锛氫换鍔℃墽琛屽凡瓒呰繃15鍒嗛挓锛屽畾鏃朵换鍔′粛鍦ㄨ繍琛屼腑 ===",
          type: "warning",
        });
      }
    }
  }
  
  // 妫€鏌ュ畾鏃朵换鍔℃墽琛岀姸鎬佹槸鍚﹀崱浣?  if (isScheduledTaskRunning.value && currentScheduledTask) {
    const now = Date.now();
    // 鍗佹鎸戞垬浠诲姟瓒呮椂闃堝€间负160鍒嗛挓锛?鍐呴儴150鍒嗛挓瓒呮椂锛夛紝鍏朵粬浠诲姟淇濇寔1灏忔椂
    const isNightmareHealthTask = currentScheduledTask?.taskName === 'batchNightmareChallengePresets' 
      || currentScheduledTask?.name?.includes('鍗佹');
    const taskTimeoutMs = isNightmareHealthTask ? (160 * 60 * 1000) : (60 * 60 * 1000);
    const taskTimeoutAgo = now - taskTimeoutMs;
    if (scheduledTaskStartTime && scheduledTaskStartTime < taskTimeoutAgo) {
      const timeoutMinutes = Math.round(taskTimeoutMs / 60000);
      console.error(
        `[${new Date().toISOString()}] 瀹氭椂浠诲姟鎵ц鐘舵€佸凡鎸佺画${timeoutMinutes}鍒嗛挓锛岄噸缃姸鎬乣,
      );
      isScheduledTaskRunning.value = false;
      currentScheduledTask = null;
      scheduledTaskStartTime = null; // 鉁?闂2锛氬仴搴锋鏌ラ噸缃椂娓呴櫎瓒呮椂璁℃椂
      // 鉁?鍏抽敭淇锛氬畾鏃朵换鍔¤秴鏃跺悗涔熷繀椤婚噸缃?isRunning
      // 鍚﹀垯 isRunning 鍗″湪 true 鈫?璋冨害鍣ㄨ6491姘歌繙 return 鈫?鍚庣画鎵€鏈夊畾鏃朵换鍔℃棤娉曟墽琛?      if (isRunning.value) {
        isRunning.value = false;
        currentRunningTokenId.value = null;
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 妫€娴嬪埌瀹氭椂浠诲姟鎵ц瓒呰繃${timeoutMinutes}鍒嗛挓锛屽凡閲嶇疆瀹氭椂浠诲姟鐘舵€佸拰isRunning ===`,
        type: "warning",
      });
      // 鉁?鍚屾椂娓呯悊runningTokens鐘舵€?      tokenStore.runningTokens.value.forEach(tokenId => {
        tokenStore.setTokenRunning(tokenId, false);
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      // 蹇呴』鍚屾椂妫€鏌ユ壒閲忎换鍔°€佸畾鏃朵换鍔°€佷互鍙婇槦鍒椾腑鏄惁鏈夊緟鎵ц浠诲姟
      const hasRunningTask = isRunning.value || isScheduledTaskRunning.value || pendingTaskQueue.length > 0;
      if (!hasRunningTask) {
        console.log(`[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`);
        window.location.reload();
      } else {
         const reason = isRunning.value ? '鎵归噺浠诲姟' : isScheduledTaskRunning.value ? '瀹氭椂浠诲姟' : '闃熷垪浠诲姟';
         console.log(`[${new Date().toISOString()}] Scheduled refresh postponed due to running ${reason}, will refresh after task completion`);
         // 鏍囪闇€瑕佸湪浠诲姟瀹屾垚鍚庡埛鏂?         shouldRefreshAfterTask.value = true;
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

      // 鉁?娉ㄦ剰锛氫笉鍦ㄦ澶?early return
      // 鍘熷洜锛氬鏋?isRunning=true 鏃剁洿鎺?return锛岃皟搴﹀櫒涓嶄細鎵ц鍒扮6596琛岀殑闃熷垪閫昏緫
      // 瀵艰嚧鏃堕棿鍖归厤鐨勫畾鏃朵换鍔℃棤娉曞姞鍏?pendingTaskQueue 鈫?浠诲姟琚潤榛樹涪寮?      // 鏀圭敱鍚庣画閫昏緫鍒ゆ柇锛氭帓闃?or 璺宠繃鎵ц
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;
        let reason = "";

        // 娉ㄦ剰锛氫笉涓婄嚎鏃舵妫€鏌ョЩ鍒癳xecuteScheduledTask鍑芥暟涓墽琛岋紝閬垮厤姣?0绉掑惊鐜鏌?
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
              message: `=== 瑙ｆ瀽瀹氭椂浠诲姟 ${task.name} 鐨凜ron琛ㄨ揪寮忓け璐? ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
            // 鉁?闃查噸澶嶆墽琛岋細妫€鏌ユ浠诲姟鏄惁鍦ㄦ渶杩?鍒嗛挓鍐呭凡瑙﹀彂
            const lastExecStr = localStorage.getItem(`lastTaskExecution_${task.id}`);
            if (lastExecStr) {
              const elapsed = now.getTime() - new Date(lastExecStr).getTime();
              if (elapsed < 60000) { // 1鍒嗛挓鍐呭凡鎵ц杩?                return;
              }
            }

            // 鉁?瀹氭椂浠诲姟浠呬笌鍏朵粬瀹氭椂浠诲姟浜掓枼锛屼笉鍙備笌鏃ュ父浠诲姟鐨勪簰鏂ユ帓闃?            // 瀹氭椂浠诲姟缁濆浼樺厛锛氭棩甯镐换鍔℃鍦ㄦ墽琛屾椂锛屽畾鏃朵换鍔＄洿鎺ユ墽琛岋紝鏃ュ父浠诲姟鑷姩鏆傚仠
            if (isScheduledTaskRunning.value && currentScheduledTask) {
              // 鍚屼竴涓畾鏃朵换鍔℃鍦ㄦ墽琛岋紝璺宠繃
              if (currentScheduledTask.id === task.id) {
                return;
              }
              // 鉁?鍔犲叆寰呮墽琛岄槦鍒楋紙浠呭畾鏃朵换鍔′箣闂翠簰鏂ワ級
              if (!pendingTaskQueue.some(t => t.id === task.id)) {
                pendingTaskQueue.push(task);
                addLog({
                  time: currentTime,
                  message: `鈴革笍 瀹氭椂浠诲姟 ${task.name} 鍔犲叆寰呮墽琛岄槦鍒楋紙褰撳墠: ${currentScheduledTask.name} 鎵ц涓紝闃熷垪: ${pendingTaskQueue.length}锛塦,
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

            // ===== 鎺ㄥ浘浠诲姟锛氱洿鎺ヨ皟鐢?pushStartAll锛屼笉璧?executeScheduledTask 娴佺▼ =====
            if (task.taskType === 'push_map') {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `鈴?鎺ㄥ浘瀹氭椂瑙﹀彂锛氬紑濮嬫帹鍥撅紙${task.name}锛塦,
                type: "info",
              });
              window.$message?.success(`瀹氭椂瑙﹀彂锛氳嚜鍔ㄥ紑濮嬫帹鍥綻);
              pushStartAll().catch(e => console.error('[PushMap瀹氭椂寮€濮媇 閿欒:', e));
              return; // 蹇€熻繑鍥烇紝涓嶉攢鑰楄皟搴﹀櫒鐨勨€滄鍦ㄨ繍琛屸€濈姸鎬?            }
            // ======================================================

            // 璁剧疆浠诲姟鎵ц鐘舵€佸苟绔嬪嵆鏇存柊lastTaskExecution
            isScheduledTaskRunning.value = true;
            currentScheduledTask = task;
            scheduledTaskStartTime = Date.now(); // 鉁?璁板綍浠诲姟寮€濮嬫椂闂?            lastTaskExecution = Date.now();  // 鉁?鍦ㄤ换鍔℃墽琛屽墠绔嬪嵆鏇存柊
            
            // Execute the task (寮傛鎵ц,涓嶉樆濉瀞cheduler寰幆)
            executeScheduledTask(task).catch(error => {
              console.error(`[${new Date().toISOString()}] 瀹氭椂浠诲姟鎵ц鏈崟鑾烽敊璇?`, error);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 瀹氭椂浠诲姟 ${task.name} 鎵ц寮傚父: ${error.message} ===`,
                type: "error",
              });
            }).finally(() => {
              // 鉁?纭繚浠诲姟瀹屾垚鍚庢洿鏂發astTaskExecution
              lastTaskExecution = Date.now();
              // 鉁?闃熷垪澶勭悊鐢?executeScheduledTask 鑷韩鐨?finally 缁熶竴璐熻矗锛屾澶勪笉鍐嶉噸澶嶅鐞?              // 閬垮厤鍙岄噸闃熷垪澶勭悊瀵艰嚧绔炴€佹潯浠讹紙鍚屼竴浠诲姟琚噸澶嶅叆闃熸垨鐘舵€佸啿绐侊級
            });
        }
      });
      
      // ===== 鎺ㄥ浘浠诲姟鍋滄鏃堕棿妫€娴?=====
      const nowTimeHHMM = now.toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit" });
      tasksToRun.forEach((task) => {
        if (task.taskType !== 'push_map' || !task.pushStopTime || !task.enabled) return;
        if (nowTimeHHMM !== task.pushStopTime) return;
        // 闃查噸澶嶏細1鍒嗛挓鍐呭凡鎵ц杩?        const stopKey = `lastPushStopExecution_${task.id}`;
        const lastStop = localStorage.getItem(stopKey);
        if (lastStop && (now.getTime() - new Date(lastStop).getTime()) < 60000) return;
        localStorage.setItem(stopKey, now.toString());
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈴?鎺ㄥ浘瀹氭椂瑙﹀彂锛氬仠姝㈡帹鍥撅紙${task.name}锛塦,
          type: "warning",
        });
        window.$message?.warning(`瀹氭椂瑙﹀彂锛氳嚜鍔ㄥ仠姝㈡帹鍥綻);
        pushStopAll(true);
      });
      // =============================================
      
      // 鉁?璋冨害鍣ㄥ凹搴曪細濡傛灉闃熷垪涓湁绛夊緟浠诲姟涓斿綋鍓嶆棤瀹氭椂浠诲姟杩愯锛屼富鍔ㄦ秷璐归槦鍒楋紙璺宠繃宸茶繃鏈熶换鍔★級
      // 瀹氭椂浠诲姟浼樺厛锛氬嵆浣挎棩甯镐换鍔℃鍦ㄦ墽琛岋紝瀹氭椂浠诲姟涔熷彲浠ュ惎鍔?      if (pendingTaskQueue.length > 0 && !isScheduledTaskRunning.value) {
        // 寰幆娓呯悊宸茶繃鏈熶换鍔★紝鎵惧埌绗竴涓湁鏁堢殑鎵ц
        while (pendingTaskQueue.length > 0) {
          const peekTask = pendingTaskQueue[0];
          const timeCheck = isTaskTimeStillValid(peekTask, 60);

          if (!timeCheck.valid) {
            pendingTaskQueue.shift();
            addLog({
              time: currentTime,
              message: `鈴?鍏滃簳璺宠繃宸茶繃鏈熼槦鍒椾换鍔? ${peekTask.name}锛?{timeCheck.reason}锛屽墿浣欓槦鍒? ${pendingTaskQueue.length}锛塦,
              type: "warning",
            });
            continue;
          }

          // 鎵惧埌鏈夋晥浠诲姟锛屾寮忓嚭闃熷苟鎵ц
          const nextTask = pendingTaskQueue.shift();
          addLog({
            time: currentTime,
            message: `鈻讹笍 璋冨害鍣ㄥ厹搴曪細浠庨槦鍒楁墽琛屽畾鏃朵换鍔? ${nextTask.name}锛堝墿浣欓槦鍒? ${pendingTaskQueue.length}锛塦,
            type: "info",
          });
          isScheduledTaskRunning.value = true;
          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          lastTaskExecution = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`鍏滃簳闃熷垪浠诲姟鎵ц閿欒:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
          return; // 宸叉壘鍒版湁鏁堜换鍔″苟鎵ц锛岄€€鍑哄厹搴曢€昏緫
        }

        // 闃熷垪鍏ㄩ儴杩囨湡锛屽凡娓呯┖
        if (pendingTaskQueue.length === 0) {
          addLog({
            time: currentTime,
            message: `鉁?鍏滃簳娑堣垂锛氶槦鍒椾腑鎵€鏈変换鍔″潎宸茶繃鏈燂紝宸叉竻绌篳,
            type: "info",
          });
        }
      }
    
      // 鉁?璋冨害鍣ㄧ粺涓€澶勭悊寤惰繜鍒锋柊锛氬湪鎵€鏈変换鍔″鐞嗗拰闃熷垪澶勭悊瀹屾瘯鍚庯紝妫€鏌ユ槸鍚﹂渶瑕佸埛鏂伴〉闈?      // 杩欐牱鍙互纭繚褰撳墠娌℃湁杩愯涓殑浠诲姟锛屼笖闃熷垪涓病鏈夊緟鎵ц鐨勪换鍔?      if (shouldRefreshAfterTask.value && !isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        console.log(`[${new Date().toISOString()}] All tasks completed, executing postponed page refresh from scheduler tick`);
        shouldRefreshAfterTask.value = false;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉁?鎵€鏈変换鍔″凡瀹屾垚锛屽畾鏃跺埛鏂伴〉闈㈠皢鍦?3 绉掑悗鎵ц...`,
          type: "info",
        });
        setTimeout(() => {
          // 鍐嶆纭娌℃湁鏂颁换鍔″惎鍔?          if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
            window.location.reload();
          } else {
            shouldRefreshAfterTask.value = true; // 閲嶆柊鏍囪锛岀瓑寰呬笅娆¤皟搴﹀櫒妫€鏌?          }
        }, 3000);
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 瀹氭椂浠诲姟璋冨害鏈嶅姟鍙戠敓閿欒: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// 鍝嶅簲寮忓垪鏁拌绠?const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);

// 璁＄畻鍝嶅簲寮忓垪鏁?const responsiveColumns = computed(() => {
  // 濡傛灉鐢ㄦ埛鍏抽棴浜嗚嚜鍔ㄦā寮?浣跨敤鎵嬪姩璁剧疆鐨勫垪鏁?  if (!batchSettings.autoColumns) {
    return batchSettings.tokenListColumns;
  }
  
  // 鑷姩鏍规嵁绐楀彛瀹藉害璁＄畻
  const width = windowWidth.value;
  
  if (width >= 1400) {
    return 4;  // 澶у睆骞?PC鏈€澶у寲): 4鍒?  } else if (width >= 1100) {
    return 3;  // 涓瓑灞忓箷: 3鍒?  } else if (width >= 768) {
    return 2;  // 骞虫澘/灏忓睆骞? 2鍒?  } else {
    return 1;  // 鎵嬫満绔? 1鍒?  }
});

// 鍚屾鍝嶅簲寮忓垪鏁板埌batchSettings
watch(responsiveColumns, (newCols) => {
  if (batchSettings.autoColumns) {
    batchSettings.tokenListColumns = newCols;
  }
});

// 鍒ゆ柇鏄惁鏄渶澶у寲绐楀彛锛堚墺1400px锛?const isMaximizedWindow = computed(() => {
  return windowWidth.value >= 1400;
});

// 澶勭悊鎵嬪姩璋冭妭姣忚鏁伴噺
const handleManualColumnChange = () => {
  // 鍙湁鍦ㄦ渶澶у寲绐楀彛鏃舵墠鍏佽鎵嬪姩璋冭妭
  if (isMaximizedWindow.value) {
    // 鐢ㄦ埛鎵嬪姩璋冭妭鏃讹紝鍏抽棴鑷姩妯″紡
    if (batchSettings.autoColumns) {
      batchSettings.autoColumns = false;
    }
  } else {
    // 濡傛灉涓嶆槸鏈€澶у寲绐楀彛锛屾仮澶嶈嚜鍔ㄦā寮?    if (!batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
  }
};

// 绐楀彛澶у皬鍙樺寲鐩戝惉
let resizeTimer = null;
const handleResize = () => {
  // 闃叉姈澶勭悊,閬垮厤棰戠箒璁＄畻
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const newWidth = window.innerWidth;
    windowWidth.value = newWidth;
    
    // 褰撶獥鍙ｇ缉灏忓埌灏忎簬1400px鏃讹紝鑷姩寮€鍚嚜閫傚簲妯″紡
    if (newWidth < 1400 && !batchSettings.autoColumns) {
      batchSettings.autoColumns = true;
    }
    // 褰撶獥鍙ｆ斁澶у埌鈮?400px鏃讹紝濡傛灉涔嬪墠鏄墜鍔ㄦā寮忥紝淇濇寔鎵嬪姩妯″紡
    // 锛堢敤鎴峰彲浠ラ€氳繃杈撳叆妗嗘墜鍔ㄨ皟鑺傦級
  }, 100);
};

// 鍝嶅簲寮忓垪鏁扮洃鍚竻鐞嗗嚱鏁?let cleanupResponsiveColumns = null;
const setupResponsiveColumns = () => {
  // 绔嬪嵆璁＄畻涓€娆＄獥鍙ｅ搴︼紝纭繚椤甸潰鍔犺浇鏃跺氨姝ｇ‘鍝嶅簲
  if (batchSettings.autoColumns) {
    windowWidth.value = window.innerWidth;
  }
  
  // 鐩戝惉绐楀彛澶у皬鍙樺寲
  window.addEventListener('resize', handleResize);
  
  // 浣跨敤 ResizeObserver 鐩戝惉 body 澶у皬鍙樺寲(鏇寸簿纭?
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
  _componentUnmounted = false; // HMR 閲嶆柊鎸傝浇鏃堕噸缃爣蹇?  // 鍒濆鍖栭槻浼戠湢鏀寔妫€娴?  wakeLockSupported.value = wakeLockManager.isSupported();
  const envInfo = wakeLockManager.getEnvironmentInfo();
  console.log(`闃蹭紤鐪犲姛鑳藉垵濮嬪寲 - 鐜: ${envInfo.envName}, 鏀寔: ${envInfo.supported}`);
  
  // 鉁?濡傛灉涔嬪墠寮€鍚簡闃蹭紤鐪狅紝椤甸潰鍒锋柊鍚庤嚜鍔ㄩ噸鏂版縺娲?  if (isWakeLockEnabled.value && wakeLockSupported.value) {
    console.log('妫€娴嬪埌闃蹭紤鐪犱箣鍓嶅凡寮€鍚紝鑷姩閲嶆柊婵€娲?..');
    wakeLockManager.request().then(success => {
      if (success) {
        console.log('闃蹭紤鐪犺嚜鍔ㄦ縺娲绘垚鍔?);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: "馃洝锔?闃蹭紤鐪犲凡鑷姩鎭㈠锛堥〉闈㈠埛鏂板悗锛?,
          type: "success",
        });
      } else {
        console.warn('闃蹭紤鐪犺嚜鍔ㄦ縺娲诲け璐?);
        isWakeLockEnabled.value = false;
        saveWakeLockState(false);
      }
    }).catch(err => {
      console.error('闃蹭紤鐪犺嚜鍔ㄦ縺娲诲紓甯?', err);
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);
    });
  }
  
  // 鍔犺浇淇濆瓨鐨凾oken鎺掑簭
  loadSavedTokenOrder();
  
  // 纭繚DOM鍔犺浇瀹屾垚鍚庡啀璁＄畻鍝嶅簲寮忓垪鏁?  nextTick(() => {
    if (batchSettings.autoColumns) {
      windowWidth.value = window.innerWidth;
    }
  });
  
  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();

  // 鍔犺浇鍚庢竻鐞嗗凡澶辨晥鐨勪换鍔″紩鐢紙鎵€鏈夊嚱鏁板凡鍦?script setup 涓畾涔夛級
  cleanupInvalidTaskReferences();

  // Start countdown timer
  startCountdown();
  loadTaskTemplates();
  // 鍚姩鑷姩鍒锋柊Token
  tokenStore.startAutoRefresh();
  
  // 鍚姩鍝嶅簲寮忓垪鏁扮洃鍚?  setupResponsiveColumns();

  // 妫€鏌ユ槸鍚﹂渶瑕佽嚜鍔ㄦ墦寮€鍗佹棰勮闃熷垪
  if (route.query.nextPreset === 'true') {
    try {
      const queue = JSON.parse(sessionStorage.getItem('nightmare-preset-queue') || '[]');
      if (queue.length > 0) {
        showNightmareChallengeModal.value = true;
        message.info(`棰勮闃熷垪鍓╀綑 ${queue.length} 涓紝姝ｅ湪缁х画鎵ц...`);
      }
    } catch { /* ignore */ }
  }

  // 浠庢垬鏂楅〉闈㈣繑鍥炴椂鑷姩鎵撳紑鍗佹寮圭獥锛堣鍙栧悗绔嬪嵆绉婚櫎鍙傛暟锛岄槻姝㈠埛鏂伴噸澶嶈Е鍙戯級
  if (route.query.openNightmare === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }

  // 鍚姩鍝嶅簲寮忔椂闂存洿鏂帮紙姣?0绉掓洿鏂颁竴娆★紝璁╂椿鍔ㄥ紑鏀炬椂闂碿omputed灞炴€ф纭搷搴旓級
  currentTimeTimer = setInterval(() => {
    currentTime.value = new Date();
  }, 30000);
});

// 鐩戝惉璺敱鍙樺寲锛氫粠鎴樻枟椤佃繑鍥炴椂鑷姩鎵撳紑鍗佹鎸戞垬 Modal
watch(() => route.query.openNightmare, (val) => {
  if (val === '1') {
    showNightmareChallengeModal.value = true;
    const { openNightmare, ...restQuery } = route.query;
    router.replace({ ...route, query: restQuery });
  }
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  _componentUnmounted = true; // 鏍囪缁勪欢宸插嵏杞斤紝闃绘 interval 鍥炶皟缁х画鎵ц
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
      message: "=== 瀹氭椂浠诲姟璋冨害鏈嶅姟宸插仠姝?===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // 娓呯悊鍝嶅簲寮忔椂闂存洿鏂板畾鏃跺櫒
  if (currentTimeTimer) {
    clearInterval(currentTimeTimer);
    currentTimeTimer = null;
  }
  
  // 娓呯悊鍝嶅簲寮忓垪鏁扮洃鍚?  if (cleanupResponsiveColumns) {
    cleanupResponsiveColumns();
  }
  
  // 娓呯悊闃叉姈瀹氭椂鍣?  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  
  // 鍋滄鑷姩鍒锋柊Token
  tokenStore.stopAutoRefresh();
  
  // 娓呯悊闃蹭紤鐪?  if (isWakeLockEnabled.value) {
    wakeLockManager.release().catch(err => {
      console.error('缁勪欢鍗歌浇鏃堕噴鏀網akeLock澶辫触:', err);
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "闃蹭紤鐪犲凡鑷姩鍏抽棴",
      type: "info",
    });
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 瀹氭椂浠诲姟璋冨害鏈嶅姟宸插惎鍔?===",
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

// Verify task dependencies - 鍙獙璇佸熀纭€渚濊禆锛學ebSocket杩炴帴鐢卞叿浣撲换鍔″嚱鏁板鐞?const verifyTaskDependencies = async (task) => {
  // 鎺ㄥ浘浠诲姟璺宠繃鏅€氶獙璇?  if (task.taskType === 'push_map') return true;

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 寮€濮嬮獙璇佸畾鏃朵换鍔?${task.name} 鐨勪緷璧?===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "鉁?localStorage鍙敤",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鉂?localStorage涓嶅彲鐢? ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "鉂?Token瀛樺偍涓嶅彲鐢?,
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    // 澶勭悊鍑芥暟鍚嶆槧灏勶紙涓嬪垝绾挎牸寮?-> 椹煎嘲鏍煎紡锛?
    let functionName = taskName;
    if (taskName === 'weekly_market_buy') {
      functionName = 'weeklyMarketBuy';
    }
    
    let taskFunction;
    try {
      taskFunction = eval(functionName);
    } catch (e) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鈿狅笍 浠诲姟鍑芥暟涓嶅瓨鍦? ${taskName}锛堝彲鑳藉凡琚垹闄わ級锛岃烦杩囬獙璇乣,
        type: "warning",
      });
      continue;
    }
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鈿狅笍 浠诲姟 "${taskName}" 涓嶆槸鍙墽琛屽嚱鏁帮紝璺宠繃楠岃瘉`,
        type: "warning",
      });
      continue;
    }
  }

  // 楠岃瘉瀹濈鍛ㄤ换鍔℃槸鍚﹀湪瀹濈鍛ㄦ墽琛?  const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
  const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
  if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鈿狅笍  褰撳墠涓嶆槸瀹濈鍛紝璺宠繃瀹濈鍛ㄤ换鍔? ${task.selectedTasks.filter(t => boxWeeklyTasks.includes(t)).join(', ')}`,
      type: "warning",
    });
    // 杩斿洖true锛屼絾浼氬湪鎵ц闃舵璺宠繃杩欎簺浠诲姟
  }

  // 鐩存帴浣跨敤鎵€鏈夐€変腑鐨則oken锛學ebSocket杩炴帴鐢卞叿浣撲换鍔″嚱鏁板唴閮ㄧ鐞?  // ensureConnection鍑芥暟浼氳嚜鍔ㄥ鐞嗗苟琛岃繛鎺ュ拰杩炴帴姹犵鐞?  const connectedTokens = task.selectedTokens
    .filter((tokenId) => tokenStore.gameTokens.some((t) => t.id === tokenId))
    .map((tokenId) => {
      const tokenName = tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
      return { id: tokenId, name: tokenName };
    });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `鉁?灏嗕娇鐢?${connectedTokens.length} 涓处鍙锋墽琛屼换鍔,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 瀹氭椂浠诲姟 ${task.name} 鐨勪緷璧栭獙璇侀€氳繃锛屽皢鎵ц ${connectedTokens.length} 涓处鍙?===`,
    type: "success",
  });
  return true;
};

// 妫€鏌ュ畾鏃朵换鍔＄殑鏃堕棿鏄惁浠嶇劧鏈夋晥锛堥槦鍒椾换鍔¤闃诲鍚庝笉鍐嶇鍚堟墽琛屾椂闂存椂璺宠繃锛?const isTaskTimeStillValid = (task, toleranceMinutes = 2) => {
  const now = new Date();

  if (task.runType === "daily") {
    if (!task.runTime) return { valid: false, reason: "浠诲姟鏈厤缃墽琛屾椂闂? };
    const nowTime = now.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    // 瀹屽叏鍖归厤锛岀珛鍗虫湁鏁?    if (nowTime === task.runTime) return { valid: true };

    const [taskH, taskM] = task.runTime.split(":").map(Number);
    const taskMinutes = taskH * 60 + taskM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const diffMinutes = nowMinutes - taskMinutes;

    // 鍦ㄥ宸獥鍙ｅ唴锛?~toleranceMinutes鍒嗛挓锛変粛鏈夋晥
    if (diffMinutes >= 0 && diffMinutes <= toleranceMinutes) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `宸茶繃棰勫畾鏃堕棿 ${task.runTime}锛堝凡瓒呭嚭 ${diffMinutes} 鍒嗛挓锛屽宸?${toleranceMinutes} 鍒嗛挓锛塦,
    };
  } else if (task.runType === "cron") {
    if (!task.cronExpression) return { valid: false, reason: "Cron琛ㄨ揪寮忎负绌? };
    try {
      // Cron琛ㄨ揪寮忥細妫€鏌ユ槸鍚﹀湪瀹瑰樊绐楀彛鍐呭尮閰?      const matched = matchesCronExpression(task.cronExpression, now);
      if (matched) return { valid: true };
      // 寰€鍓嶆鏌ュ宸垎閽熸暟
      for (let m = 1; m <= toleranceMinutes; m++) {
        const past = new Date(now.getTime() - m * 60 * 1000);
        if (matchesCronExpression(task.cronExpression, past)) {
          return { valid: true };
        }
      }
      return { valid: false, reason: `Cron浠诲姟宸茶繃鎵ц鏃堕棿绐楀彛锛堝宸?${toleranceMinutes} 鍒嗛挓锛塦 };
    } catch {
      return { valid: false, reason: "Cron琛ㄨ揪寮忚В鏋愬け璐? };
    }
  }

  return { valid: false, reason: "鏈煡浠诲姟绫诲瀷" };
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  // 鉁?鍦ㄥ嚱鏁板紑濮嬪灏卞畾涔?availableTokens锛岀‘淇?catch 鍧楀彲浠ヨ闂?  let availableTokens = [];
  
  // 鉁?鍦ㄥ嚱鏁板紑濮嬪灏辫缃姸鎬?璋冪敤鑰呭凡璁剧疆,杩欓噷鍋氶槻寰℃€ф鏌?
  if (!isScheduledTaskRunning.value) {
    isScheduledTaskRunning.value = true;
    currentScheduledTask = task;
  }
  
  // 鉁?閲嶇疆鍋滄鏍囧織锛岄槻姝㈢敤鎴锋墜鍔ㄥ仠姝㈠悗褰卞搷瀹氭椂浠诲姟鎵ц
  shouldStop.value = false;
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 寮€濮嬫墽琛屽畾鏃朵换鍔? ${task.name} ===`,
    type: "info",
  });

  try {
    
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 瀹氭椂浠诲姟 ${task.name} 渚濊禆楠岃瘉澶辫触锛屽彇娑堟墽琛?===`,
        type: "error",
      });
      return;  // 鉁?finally鍧椾細娓呯悊鐘舵€?    }

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
        message: `鈿狅笍  璺宠繃涓嶅瓨鍦ㄧ殑Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
      
      // 鉁?鑷姩娓呴櫎浠诲姟閰嶇疆涓笉瀛樺湪鐨凾oken
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `馃棏锔? 姝ｅ湪浠庝换鍔￠厤缃腑娓呴櫎 ${missingTokens.length} 涓笉瀛樺湪鐨凾oken...`,
        type: "info",
      });
      
      // 鉁?鍚屾椂娓呯悊 selectedTokens 鍜?connectedTokens锛岄槻姝笅娆℃墽琛屾椂浠?selectedTokens 閲嶆柊鐢熸垚
      if (task.selectedTokens) {
        task.selectedTokens = task.selectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      if (task.connectedTokens) {
        task.connectedTokens = task.connectedTokens.filter((id) => tokens.value.some((t) => t.id === id));
      }
      
      // 閲嶆柊璁＄畻 availableTokens 浣跨敤娓呯悊鍚庣殑鏁版嵁
      availableTokens = (task.connectedTokens && task.connectedTokens.length > 0)
        ? task.connectedTokens
        : task.selectedTokens;
      
      // 淇濆瓨鍒發ocalStorage
      saveScheduledTasks();
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鉁?宸叉垚鍔熸竻闄や笉瀛樺湪鐨凾oken锛屽綋鍓嶄换鍔￠厤缃墿浣?${availableTokens.length} 涓猅oken`,
        type: "success",
      });
    }

    // 鍗佹棰勮浠诲姟鑷甫璐﹀彿锛屾棤闇€妫€鏌?availableTokens
    const taskHasNightmarePresets = task.selectedTasks.includes('batchNightmareChallengePresets') && (task.nightmarePresetIds?.length > 0);
    
    if (availableTokens.length === 0 && !taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 瀹氭椂浠诲姟 ${task.name} 娌℃湁鍙敤鐨凾oken锛屽彇娑堟墽琛?===`,
        type: "error",
      });
      return;  // 鉁?finally鍧椾細娓呯悊鐘舵€?    }
    
    if (availableTokens.length === 0 && taskHasNightmarePresets) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 瀹氭椂浠诲姟 ${task.name} 浣跨敤鍗佹棰勮鑷甫璐﹀彿鎵ц ===`,
        type: "info",
      });
    }

    // 浠诲姟鎵ц鍓嶆鏌ヤ笉涓婄嚎鏃舵锛堝彧妫€鏌ヤ竴娆★級
    let isOfflineTime = false;
    if (task.offlineTimeEnabled) {
      isOfflineTime = isInOfflineTime();
      console.log('[Token妫€鏌 offlineTimeEnabled:', task.offlineTimeEnabled);
      console.log('[Token妫€鏌 isInOfflineTime:', isOfflineTime);
    }
    
    // 濡傛灉鍦ㄤ笉涓婄嚎鏃舵锛岃烦杩囦换鍔℃墽琛?    if (isOfflineTime) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 瀹氭椂浠诲姟 ${task.name} 澶勪簬涓嶄笂绾挎椂娈碉紝璺宠繃鎵ц ===`,
        type: "warning",
      });
      return;  // 鉁?finally鍧椾細娓呯悊鐘舵€?    }
    
    console.log('[Token妫€鏌 鏄惁璺宠繃妫€鏌?', isOfflineTime);
    
    // 鉁?浣跨敤灞€閮ㄥ彉閲忛伩鍏嶆案涔呬慨鏀瑰師濮嬮厤缃?    let activeTasks = [...task.selectedTasks];
    
    // 鏂板锛氭鏌ヤ换鍔℃槸鍚﹀寘鍚椿鍔ㄥ懆闄愬埗鐨勪换鍔?    const weirdTowerTasks = [
      "climbWeirdTower",
      "batchUseItems",
      "batchMergeItems",
      "batchClaimFreeEnergy",
      "claim_weird_tower_all",
      "claim_weird_tower_pass",
    ];
    
    // 濡傛灉浠诲姟鍒楄〃涓寘鍚€紓濉斾换鍔★紝涓斾笉鍦ㄩ粦甯傚懆锛屽垯璺宠繃Token杩炴帴
    const hasWeirdTowerTask = task.selectedTasks.some(t => weirdTowerTasks.includes(t));
    
    if (hasWeirdTowerTask && !isWeirdTowerActivityOpen.value) {
      // 杩囨护鎺変笉鍦ㄦ椿鍔ㄥ懆鐨勪换鍔?      const tasksInActivityWeek = task.selectedTasks.filter(t => !weirdTowerTasks.includes(t));
      
      if (tasksInActivityWeek.length === 0) {
        // 鎵€鏈変换鍔￠兘鏄€紓濉斾换鍔★紝瀹屽叏涓嶉渶瑕佽繛鎺?        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 瀹氭椂浠诲姟 ${task.name} 鍖呭惈鐨勪换鍔￠兘闇€瑕侀粦甯傚懆锛屼絾褰撳墠涓嶅湪娲诲姩鏃堕棿鍐咃紝鍙栨秷鎵ц ===`,
          type: "warning",
        });
        
        // 璺宠繃Token杩炴帴锛岀洿鎺ヨ繑鍥?        return;  // 鉁?finally鍧椾細娓呯悊鐘舵€?      } else {
        // 鏈夐儴鍒嗕换鍔′笉鍦ㄦ椿鍔ㄥ懆锛岃褰曟棩蹇?        const skippedTasks = task.selectedTasks.filter(t => weirdTowerTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃涓嶅湪娲诲姩鍛ㄧ殑浠诲姟: ${skippedLabels}`,
          type: "warning",
        });
        
        // 鉁?鍙墽琛屽湪娲诲姩鍛ㄧ殑浠诲姟锛堜娇鐢ㄥ眬閮ㄥ彉閲忥紝涓嶄慨鏀瑰師濮嬮厤缃級
        activeTasks = tasksInActivityWeek;
      }
    }

    // 妫€鏌ヤ换鍔℃槸鍚﹀寘鍚疂绠卞懆闄愬埗鐨勪换鍔?    const boxWeeklyTasks = ['batchOpenBoxByPoints', 'batchClaimBoxWeeklyRewards'];
    const hasBoxWeeklyTask = task.selectedTasks.some(t => boxWeeklyTasks.includes(t));
    
    if (hasBoxWeeklyTask && !isBoxWeeklyActivityOpen.value) {
      // 杩囨护鎺夊疂绠卞懆浠诲姟
      const tasksOutsideBoxWeek = task.selectedTasks.filter(t => !boxWeeklyTasks.includes(t));
      
      if (tasksOutsideBoxWeek.length === 0) {
        // 鎵€鏈変换鍔￠兘鏄疂绠卞懆浠诲姟锛屽畬鍏ㄤ笉闇€瑕佽繛鎺?        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 瀹氭椂浠诲姟 ${task.name} 鍖呭惈鐨勪换鍔￠兘闇€瑕佸疂绠卞懆锛屼絾褰撳墠涓嶅湪瀹濈鍛紝鍙栨秷鎵ц ===`,
          type: "warning",
        });
        
        // 璺宠繃Token杩炴帴锛岀洿鎺ヨ繑鍥?        return;  // 鉁?finally鍧椾細娓呯悊鐘舵€?      } else {
        // 鏈夐儴鍒嗕换鍔℃槸瀹濈鍛ㄤ换鍔★紝璁板綍鏃ュ織骞惰繃婊?        const skippedTasks = task.selectedTasks.filter(t => boxWeeklyTasks.includes(t));
        const skippedLabels = skippedTasks.map(t => 
          availableTasks.find(at => at.value === t)?.label || t
        ).join(', ');
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃瀹濈鍛ㄤ换鍔★紙褰撳墠涓嶆槸瀹濈鍛級: ${skippedLabels}`,
          type: "warning",
        });
        
        // 鉁?鍙墽琛岄潪瀹濈鍛ㄤ换鍔★紙浣跨敤灞€閮ㄥ彉閲忥紝涓嶄慨鏀瑰師濮嬮厤缃級
        activeTasks = tasksOutsideBoxWeek;
      }
    }
    
    if (isOfflineTime) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 澶勪簬涓嶄笂绾挎椂娈碉紝璺宠繃Token妫€鏌?===`,
        type: "warning",
      });
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `寮€濮嬫鏌oken杩炴帴鐘舵€?..`,
        type: "info",
      });

      // 鍏堟鏌ユ墍鏈塗oken鐨勮繛鎺ョ姸鎬?      const tokensToConnect = [];
      const tokensAlreadyConnected = [];
      
      console.log('[Token妫€鏌 寮€濮嬫鏌?, availableTokens.length, '涓猅oken');
      
      for (const tokenId of availableTokens) {
        const connection = tokenStore.wsConnections[tokenId];
        const tokenName = tokens.value.find(t => t.id === tokenId)?.name || tokenId;
        
        console.log('[Token妫€鏌', tokenName, '杩炴帴鐘舵€?', connection?.status, connection);
        
        if (connection?.status === "connected") {
          // 宸茬粡杩炴帴鎴愬姛锛屼笉闇€瑕佸鐞?          tokensAlreadyConnected.push(tokenId);
          console.log('[Token妫€鏌', tokenName, '鉁?宸茶繛鎺?);
        } else {
          // 鏈繛鎺ユ垨杩炴帴澶辫触锛岄渶瑕佸鐞?          tokensToConnect.push(tokenId);
          console.log('[Token妫€鏌', tokenName, '鉁?鏈繛鎺ワ紝鐘舵€?', connection?.status || '鏃犺繛鎺?);
        }
      }
      
      console.log('[Token妫€鏌 宸茶繛鎺?', tokensAlreadyConnected.length, '闇€瑕佽繛鎺?', tokensToConnect.length);
      
      if (tokensAlreadyConnected.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${tokensAlreadyConnected.length} 涓猅oken宸茶繛鎺ワ紝鏃犻渶澶勭悊`,
          type: "info",
        });
      }

      if (tokensToConnect.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鍙戠幇 ${tokensToConnect.length} 涓渶瑕佽繛鎺ョ殑Token`,
          type: "info",
        });

        // 鎵归噺澶勭悊闇€瑕佽繛鎺ョ殑Token
        let connectSuccessCount = 0;
        let connectFailCount = 0;

        for (let i = 0; i < tokensToConnect.length; i++) {
          const tokenId = tokensToConnect[i];
          const token = tokens.value.find(t => t.id === tokenId);
          if (!token) continue;

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `澶勭悊Token: ${token.name} (${i + 1}/${tokensToConnect.length})`,
              type: "info",
            });

            // 1. 鍏堝皾璇曠洿鎺ヨ繛鎺ワ紙涓嶅埛鏂癟oken锛?            addLog({
              time: new Date().toLocaleTimeString(),
              message: `灏濊瘯鐩存帴杩炴帴Token: ${token.name}`,
              type: "info",
            });
            
            await tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl);
            
            // 2. 绛夊緟杩炴帴寤虹珛锛堟渶澶氱瓑寰?绉掞級
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
                message: `Token杩炴帴鎴愬姛: ${token.name}`,
                type: "success",
              });
              connectSuccessCount++;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `Token鐩存帴杩炴帴澶辫触锛屽皾璇曞埛鏂癟oken: ${token.name}`,
                type: "warning",
              });
              
              // 3. 鐩存帴杩炴帴澶辫触锛屽皾璇曞埛鏂癟oken
              const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId);
            
              if (refreshSuccess) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `Token鍒锋柊鎴愬姛: ${token.name}锛屽噯澶囬噸鏂拌繛鎺,
                  type: "info",
                });
                
                // 4. 淇濆瓨褰撳墠閫変腑鐨凾oken ID锛堥伩鍏嶅奖鍝嶇敤鎴峰綋鍓嶉€夋嫨锛?                const currentSelectedTokenId = tokenStore.selectedTokenId;
                
                // 5. 鑾峰彇鏈€鏂扮殑Token淇℃伅
                const updatedToken = tokens.value.find(t => t.id === tokenId);
                if (updatedToken) {
                  // 6. 鍒涘缓WebSocket杩炴帴
                  await tokenStore.createWebSocketConnection(updatedToken.id, updatedToken.token, updatedToken.wsUrl);
                  
                  // 7. 绛夊緟杩炴帴寤虹珛锛堟渶澶氱瓑寰?绉掞級
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
                      message: `Token鍒锋柊鍚庤繛鎺ユ垚鍔? ${token.name}`,
                      type: "success",
                    });
                    connectSuccessCount++;
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `Token鍒锋柊鍚庤繛鎺ヨ秴鏃? ${token.name}`,
                      type: "error",
                    });
                    connectFailCount++;
                  }
                }
                
                // 8. 鎭㈠鐢ㄦ埛涔嬪墠閫変腑鐨凾oken
                if (currentSelectedTokenId) {
                  tokenStore.selectToken(currentSelectedTokenId);
                }
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `Token鍒锋柊澶辫触: ${token.name}`,
                  type: "error",
                });
                connectFailCount++;
              }
            }
          } catch (error) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `澶勭悊Token澶辫触 [${token.name}]: ${error.message}`,
              type: "error",
            });
            connectFailCount++;
          }

          // 娣诲姞鐭殏寤惰繜閬垮厤璇锋眰杩囦簬棰戠箒
          if (i < tokensToConnect.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token澶勭悊瀹屾垚: 鎴愬姛 ${connectSuccessCount}, 澶辫触 ${connectFailCount}`,
          type: "info",
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鎵€鏈塗oken杩炴帴鐘舵€佽壇濂斤紝鏃犻渶澶勭悊`,
          type: "success",
        });
      }
    }

    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // 鏍囪鎵€鏈塗oken涓烘鍦ㄦ墽琛屼换鍔?    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, true);
    });

    // Execute selected tasks sequentially (not in parallel) to avoid connection conflicts
    for (const taskName of activeTasks) {
      if (shouldStop.value) break;

      // 鍏嶈垂鎵泲宸插唴缃湪鏃ュ父浠诲姟鐨?buildActivityTasks 涓紙鍛ㄤ簩/鍥?鍏嚜鍔ㄦ墽琛?绱娊锛夛紝鏃犻渶鐙珛鎵ц
      if (taskName === "gacha_drawreward") {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: 鍏嶈垂鎵泲 (宸插寘鍚湪鏃ュ父浠诲姟涓紝鏃犻渶鐙珛鎵ц)`,
          type: "info",
        });
        continue;
      }

      if (
        ["batchbaoku45", "batchbaoku13"].includes(taskName) &&
        !checkBaokuActivityOpen()  // 浣跨敤鍑芥暟鑰屼笉鏄痗omputed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪瀹濆簱寮€鏀炬椂闂?`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName) &&
        !checkMengjingActivityOpen()  // 浣跨敤鍑芥暟鑰屼笉鏄痗omputed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪姊﹀寮€鏀炬椂闂?`,
          type: "warning",
        });
        continue;
      }

      if (
        ["batchSmartSendCar", "batchClaimCars"].includes(taskName) &&
        !checkCarActivityOpen()  // 浣跨敤鍑芥暟鑰屼笉鏄痗omputed
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪鍙戣溅寮€鏀炬椂闂?`,
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
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪绔炴妧鍦哄紑鏀炬椂闂达紝褰撳墠鏃堕棿:${currentHour}:${currentMinute.toString().padStart(2, '0')}, 寮€鏀炬椂娈?6:00-22:00)`,
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
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪榛戝競鍛ㄥ紑鏀炬椂闂?`,
          type: "warning",
        });
        continue;
      }

      if (
        ["skinChallenge"].includes(taskName) &&
        !["鎷涘嫙鍛?, "榛戝競鍛?].includes(getCurrentActivityWeek.value)
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪鎹㈢毊闂叧寮€鏀炬椂闂?`,
          type: "warning",
        });
        continue;
      }

      // 鍏嶈垂绀煎寘棰嗗彇涓嶈烦杩囷紙鍐呭惈鎴樻帓閲戠爾姣忔棩鍙锛屽悇绀煎寘鍐呴儴鑷鍒ゆ柇娲诲姩鍛ㄦ潯浠讹級

      // 涓€閿疂绠卞懆寮€绠便€佸疂绠辫揪鏍囧鍔辫嚜閫夊ぇ濂栧彧鍏佽鍦ㄥ疂绠卞懆鎵ц
      if (
        ["batchOpenBoxByPoints", "batchClaimBoxWeeklyRewards"].includes(taskName) &&
        !isBoxWeeklyActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (涓嶅湪瀹濈鍛ㄥ紑鏀炬椂闂?`,
          type: "warning",
        });
        continue;
      }

      // 鍔熸硶娈嬪嵎棰嗗彇/璧犻€佸湪鍛ㄤ簲00:00-12:00娈嬪嵎鏇存柊鏈熼棿绂佹鎵ц
      if (
        ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"].includes(taskName) &&
        isLegacyRestricted.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `璺宠繃浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (璧涘鏃?0:00-12:00涓烘畫鍗锋洿鏂版椂闂达紝绂佹鎿嶄綔)`,
          type: "warning",
        });
        continue;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鎵ц浠诲姟: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function dynamically
      // 澶勭悊鍑芥暟鍚嶆槧灏勶紙涓嬪垝绾挎牸寮?-> 椹煎嘲鏍煎紡锛?      let functionName = taskName;
      if (taskName === 'weekly_market_buy') {
        functionName = 'weeklyMarketBuy';
      }
      let taskFunction;
      try {
        taskFunction = eval(functionName);
      } catch (e) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈿狅笍 浠诲姟鍑芥暟 "${functionName}" 涓嶅瓨鍦紙鍙兘宸茶鍒犻櫎锛夛紝璺宠繃鎵ц`,
          type: "warning",
        });
        continue;
      }
      if (typeof taskFunction === "function") {
        // 鏍规嵁鎵规闂寸瓑寰呰缃紝鍒嗘壒鎵ц璐﹀彿
        const maxConcurrent = batchSettings.maxActive || 5;
        // 鍚屾杩炴帴姹犲ぇ灏忥紝纭繚涓庡綋鍓嶈缃竴鑷?        wsPool.setPoolSize(maxConcurrent);
        const totalAccounts = availableTokens.length;
        let batches = [];
        
        // 鍗佹闃庣綏鎸戞垬浣跨敤棰勮鑷甫鐨勯槦闀?闃熷憳锛屼笉闇€瑕佹寜 selectedTokens 鍒嗘壒
        if (taskName === 'batchNightmareChallengePresets') {
          batches = [[]];
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` 鍗佹闃庣綏鎸戞垬浣跨敤棰勮鑷甫璐﹀彿锛岃烦杩?Token 鍒嗘壒锛屽彧鎵ц涓€娆,
            type: "info",
          });
        } else {
          // 灏嗚处鍙峰垎鎵?          for (let i = 0; i < totalAccounts; i += maxConcurrent) {
            batches.push(availableTokens.slice(i, i + maxConcurrent));
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` 鍏?${totalAccounts} 涓处鍙凤紝鍒嗕负 ${batches.length} 鎵规墽琛岋紙姣忔壒${maxConcurrent}涓級`,
            type: "info",
          });
        }
        
        // 閫愭壒鎵ц
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          if (shouldStop.value) break;
          
          const batchTokens = batches[batchIndex];
          const isLastBatch = batchIndex === batches.length - 1;
          
          // 璁剧疆褰撳墠鎵规鐨勮处鍙?          selectedTokens.value = [...batchTokens];
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` 鎵ц绗?${batchIndex + 1}/${batches.length} 鎵硅处鍙?(${batchTokens.length}涓?...`,
            type: "info",
          });
          
          // 鎵ц浠诲姟鍑芥暟锛堝甫瓒呮椂淇濇姢锛岄槻姝㈠崟涓换鍔″崱姝诲鑷存暣涓畾鏃朵换鍔℃寕璧凤級
          // 鉁?BUG淇锛氬崄娈挎寫鎴樺唴閮ㄦ湁2灏忔椂瓒呮椂淇濇姢锛屽灞傝秴鏃堕渶閫傞厤
          const isNightmareTask = taskName === 'batchNightmareChallengePresets';
          const BATCH_TASK_TIMEOUT = isNightmareTask
            ? (150 * 60 * 1000) // 鍗佹鎸戞垬锛?50鍒嗛挓锛?鍐呴儴2灏忔椂瓒呮椂+閲嶈瘯浣欓噺锛?            : ((batchSettings.batchTaskTimeout || 15) * 60 * 1000);
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
              // 鍔╁▉鍟嗗簵澶氶€夎喘涔帮紝浼犻€掗€変腑鐨勫晢鍝両D鍜岃喘涔版鏁?              console.log('[瀹氭椂浠诲姟-鍔╁▉鍟嗗簵] task.legionStoreItems:', task.legionStoreItems);
              const storeConfig = task.legionStoreItems || {};
              const selectedItems = [];
              const buyCounts = {};
              Object.keys(storeConfig).forEach(key => {
                if (storeConfig[key] && storeConfig[key].selected) {
                  selectedItems.push(parseInt(key));
                  buyCounts[parseInt(key)] = storeConfig[key].count;
                }
              });
              console.log('[瀹氭椂浠诲姟-鍔╁▉鍟嗗簵] selectedItems:', selectedItems, 'buyCounts:', buyCounts);
              if (selectedItems.length > 0) {
                await taskFunction(selectedItems, buyCounts);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿狅笍 鍔╁▉鍟嗗簵澶氶€夎喘涔版湭閰嶇疆鍟嗗搧锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchActivityExchange') {
              // 娑堣€楁椿鍔ㄥ厬鎹㈠晢搴楀閫夎喘涔帮紝浼犻€掗€変腑鐨勫晢鍝佸悗缂€鍜岃喘涔版鏁?              const exchangeConfig = task.activityExchangeItems || {};
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
                  message: `鈿狅笍 娑堣€楁椿鍔ㄥ厬鎹㈣喘涔版湭閰嶇疆鍟嗗搧锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_crystal_shop_buy') {
              // 鐩愭櫠鍟嗗簵澶氶€夎喘涔帮紝鏍规嵁浠诲姟閰嶇疆鏇存柊鍟嗗簵閰嶇疆鍚庢墽琛?              const shopConfig = task.saltCrystalShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 鏇存柊 tasksStore 涓殑鐩愭櫠鍟嗗簵閰嶇疆
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
                  message: `鈿狅笍 鐩愭櫠鍟嗗簵鏈厤缃晢鍝侊紝璺宠繃`,
                  type: "warning",
                });
              }
            } else if (taskName === 'salt_ingot_shop_buy') {
              // 鐩愰敪鍟嗗簵澶氶€夎喘涔帮紝鏍规嵁浠诲姟閰嶇疆鏇存柊鍟嗗簵閰嶇疆鍚庢墽琛?              const shopConfig = task.saltIngotShopItems || {};
              const selectedIds = [];
              Object.keys(shopConfig).forEach(key => {
                if (shopConfig[key] && shopConfig[key].selected) {
                  selectedIds.push(parseInt(key));
                }
              });
              if (selectedIds.length > 0) {
                // 鏇存柊 tasksStore 涓殑鐩愰敪鍟嗗簵閰嶇疆
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
                  message: `鈿狅笍 鐩愰敪鍟嗗簵鏈厤缃晢鍝侊紝璺宠繃`,
                  type: "warning",
                });
              }
            } else if (taskName === 'manual_buy') {
              // 榛戝競澶氶€夎喘涔帮紝鏍规嵁浠诲姟閰嶇疆鏇存柊閰嶇疆鍚庢墽琛?              const buyConfig = task.manualBuyItems || {};
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
                // 鏇存柊 batchSettings.manualBuyItems 渚?manual_buy 鍑芥暟璇诲彇
                batchSettings.manualBuyItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿狅笍 榛戝競澶氶€夎喘涔版湭閰嶇疆鍟嗗搧锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'collection_exchange') {
              // 鐝嶅疂闃佸晢搴楄喘涔帮紝浠庝换鍔￠厤缃鍙栭€変腑鐨勫晢鍝?              const buyConfig = task.collectionExchangeItems || {};
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
                // 鏇存柊 batchSettings.collectionExchangeItems 渚?collection_exchange 鍑芥暟璇诲彇
                batchSettings.collectionExchangeItems = selectedItems;
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿狅笍 鐝嶅疂闃佸晢搴楄喘涔版湭閰嶇疆鍟嗗搧锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchClaimBoxWeeklyRewards') {
              // 瀹濈鍛ㄨ嚜閫夊ぇ濂栵紝浼犻€掗€変腑鐨勫鍔遍厤缃?{ rewardIndex: count }
              const rewardConfig = task.boxWeeklyRewards || {5: 1};
              if (rewardConfig && Object.keys(rewardConfig).length > 0) {
                await taskFunction(rewardConfig, true);
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `锔?瀹濈杈炬爣濂栧姳鑷€夊ぇ濂栨湭閰嶇疆濂栧姳锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'weekly_market_buy') {
              // 榛戝競鍛ㄨ喘涔帮紝浼犻€掗€変腑鐨勫晢鍝佺储寮曞垪琛?              console.log('[瀹氭椂浠诲姟-榛戝競鍛ㄨ喘涔癩 task.weeklyMarketItems:', task.weeklyMarketItems);
              const marketConfig = task.weeklyMarketItems || {};
              const selectedItems = [];
              Object.keys(marketConfig).forEach(key => {
                if (marketConfig[key] && marketConfig[key].selected) {
                  selectedItems.push(key);  // goodsIndex 鏄瓧绗︿覆
                }
              });
              console.log('[瀹氭椂浠诲姟-榛戝競鍛ㄨ喘涔癩 selectedItems:', selectedItems);
              if (selectedItems.length > 0) {
                await taskFunction({ selectedItems });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿狅笍 榛戝競鍛ㄨ喘涔版湭閰嶇疆鍟嗗搧锛岃烦杩嘸,
                  type: "warning",
                });
              }
            } else if (taskName === 'batchOpenFragmentPacks') {
              // 纰庣墖绀煎寘澶氶€夊紑鍚紝浼犻€掗€変腑鐨?itemId 鏁扮粍
              const fragmentConfig = task.fragmentPackItems || [];
              console.log('[瀹氭椂浠诲姟-纰庣墖绀煎寘] task.fragmentPackItems:', fragmentConfig);
              await taskFunction({ isScheduledTask: true, selectedItems: fragmentConfig.length > 0 ? fragmentConfig : null });
            } else if (taskName === 'batchSmartSendCar') {
              // 鏅鸿兘鍙戣溅锛屼紶閫掍换鍔＄骇鍙戣溅鏉′欢閰嶇疆
              const smartDeparture = task.smartDeparture;
              if (smartDeparture && smartDeparture.enabled) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `馃殫 浣跨敤浠诲姟绾у彂杞︽潯浠? 閲戠爾鈮?{smartDeparture.goldThreshold} 鎷涘嫙鈮?{smartDeparture.recruitThreshold} 鐧界帀鈮?{smartDeparture.jadeThreshold} 鍒糕墺${smartDeparture.ticketThreshold}`,
                  type: "info",
                });
                await taskFunction(smartDeparture);
              } else {
                await taskFunction();
              }
            } else if (taskName === 'batchNightmareChallengePresets') {
              // 鍗佹闃庣綏鎸戞垬锛屾牴鎹嬀閫夌殑棰勮鎵ц
              const presetIds = task.nightmarePresetIds || [];
              if (presetIds.length > 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿旓笍 鍗佹闃庣綏鎸戞垬锛氭墽琛?${presetIds.length} 涓璁綻,
                  type: "info",
                });
                await batchNightmareChallengePresets();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `鈿狅笍 鍗佹闃庣綏鎸戞垬鏈厤缃璁撅紝璺宠繃`,
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
                reject(new Error(`鎵归噺浠诲姟鎵ц瓒呮椂锛?{BATCH_TASK_TIMEOUT / 60000}鍒嗛挓锛塦)),
                BATCH_TASK_TIMEOUT
              ))
            ]);
            
            // 濡傛灉涓嶆槸鏈€鍚庝竴鎵癸紝涓旇缃簡鎵规闂寸瓑寰咃紝鍒欑瓑寰?            if (!isLastBatch && batchSettings.batchIntervalWait > 0) {
              const waitSeconds = batchSettings.batchIntervalWait;
              const waitMs = waitSeconds * 1000;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `鈴?绗?${batchIndex + 1} 鎵瑰畬鎴愶紝绛夊緟${waitSeconds}绉掑悗鎵ц涓嬩竴鎵?..`,
                type: "info",
              });
              await new Promise(resolve => setTimeout(resolve, waitMs));
            }
          } catch (error) {
            console.error(`鎵ц浠诲姟 ${taskName} 绗?${batchIndex + 1} 鎵瑰け璐?`, error);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `鉂?绗?${batchIndex + 1} 鎵规墽琛屽け璐? ${error.message}`,
              type: "error",
            });

            // 鉁?瓒呮椂鎴栧け璐ユ椂锛屽仠姝㈡墍鏈夊悗鍙板崄娈挎垬鏂楋紙闃叉璧勬簮娉勬紡锛?            if (isNightmareTask && _activeNightmareBattles.length > 0) {
              for (const entry of _activeNightmareBattles) {
                if (entry.battle && (entry.status === 'running' || entry.status === 'waiting_midnight' || entry.status === 'cooling')) {
                  try {
                    entry.battle.stop();
                    addLog({ time: new Date().toLocaleTimeString(), message: `[${entry.preset.name}] 瓒呮椂鍋滄鎴樻枟`, type: 'warning' });
                  } catch {}
                }
              }
            }
            
            // 鍗充娇澶辫触涔熺瓑寰?            if (!isLastBatch && batchSettings.batchIntervalWait > 0) {
              const waitSeconds = batchSettings.batchIntervalWait;
              const waitMs = waitSeconds * 1000;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `鈴?绛夊緟${waitSeconds}绉掑悗缁х画...`,
                type: "warning",
              });
              await new Promise(resolve => setTimeout(resolve, waitMs));
            }
          } finally {
            // 鉁?鍏抽敭淇锛氭棤璁轰换鍔″嚱鏁版垚鍔熸垨澶辫触锛岄兘蹇呴』閲嶇疆 isRunning
            // 鍘熷洜锛氬ぇ閮ㄥ垎浠诲姟鍑芥暟鍐呴儴璁剧疆 isRunning.value = true锛屼絾寮傚父鏃舵病鏈?try/finally 淇濇姢
            // 濡傛灉 isRunning 鍗′綇涓?true锛岃皟搴﹀櫒浼氭案杩滆烦杩囨墍鏈夊畾鏃朵换鍔?            if (isRunning.value) {
              isRunning.value = false;
              currentRunningTokenId.value = null;
            }
            // 鉁?淇锛氭瘡涓瓙浠诲姟瀹屾垚鍚庡埛鏂?scheduledTaskStartTime锛岄槻姝?healthCheck 璇垽瀹氭椂浠诲姟鍗℃
            scheduledTaskStartTime = Date.now();
            lastTaskExecution = Date.now();
          }
        }
        
        // 浠诲姟鎵ц瀹屾垚鍚庯紝濡傛灉涓嶆槸鏈€鍚庝竴涓换鍔★紝鏍规嵁璁剧疆绛夊緟涓€娈垫椂闂村啀鎵ц涓嬩竴涓?        const currentIndex = activeTasks.indexOf(taskName);
        const isLastTask = currentIndex === activeTasks.length - 1;
        
        if (!isLastTask && batchSettings.taskIntervalWait > 0) {
          const waitSeconds = batchSettings.taskIntervalWait;
          const waitMs = waitSeconds * 1000;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈴?绛夊緟${waitSeconds}绉掑悗鎵ц涓嬩竴涓姛鑳?..`,
            type: "info",
          });
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `浠诲姟鍑芥暟涓嶅瓨鍦? ${taskName}`,
          type: "error",
        });
      }
    }

    // 鏍囪鎵€鏈塗oken涓轰换鍔″畬鎴?    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 瀹氭椂浠诲姟鎵ц瀹屾垚: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    // 鏍囪鎵€鏈塗oken涓轰换鍔″畬鎴?    availableTokens.forEach(tokenId => {
      tokenStore.setTokenRunning(tokenId, false);
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 瀹氭椂浠诲姟鎵ц澶辫触: ${error.message} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );
  } finally {
    // 娓呴櫎浠诲姟鎵ц鐘舵€?    isScheduledTaskRunning.value = false;
    currentScheduledTask = null;
    scheduledTaskStartTime = null; // 鉁?娓呴櫎瓒呮椂璁℃椂

    // 鉁?浠诲姟瀹屾垚鍚庯紝鍚屾澶勭悊寰呮墽琛岄槦鍒楋紙涓嶅啀鐢?nextTick锛岄伩鍏嶄笌璋冨害鍣ㄥ厲搴曠珵鎬侊級
    if (pendingTaskQueue.length > 0) {
      // 寰幆娓呯悊宸茶繃鏈熶换鍔★紝鎵惧埌绗竴涓粛鐒舵湁鏁堢殑浠诲姟鎵ц
      while (pendingTaskQueue.length > 0) {
        const nextTask = pendingTaskQueue[0]; // 鍙猵eek锛屼笉鍏坰hift
        const timeCheck = isTaskTimeStillValid(nextTask, 60);

        if (!timeCheck.valid) {
          pendingTaskQueue.shift(); // 绉婚櫎杩囨湡浠诲姟
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈴?璺宠繃宸茶繃鏈熺殑闃熷垪浠诲姟: ${nextTask.name}锛?{timeCheck.reason}锛屽墿浣欓槦鍒? ${pendingTaskQueue.length}锛塦,
            type: "warning",
          });
          continue; // 缁х画妫€鏌ヤ笅涓€涓?        }

        // 鎵惧埌浜嗘椂闂存湁鏁堢殑浠诲姟
        pendingTaskQueue.shift(); // 姝ｅ紡鍑洪槦
        // 鉁?瀹氭椂浠诲姟浠呬笌鍏朵粬瀹氭椂浠诲姟浜掓枼锛屾棩甯镐换鍔℃墽琛屼腑涔熷彲浠ュ惎鍔ㄥ畾鏃朵换鍔?        if (!isScheduledTaskRunning.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈻讹笍 浠庨槦鍒楁墽琛屽畾鏃朵换鍔? ${nextTask.name}锛堝墿浣欓槦鍒? ${pendingTaskQueue.length}锛塦,
            type: "info",
          });
          isScheduledTaskRunning.value = true; // 绔嬪嵆閿佸畾锛岄槻姝㈠厲搴曢€昏緫绔炴€?          currentScheduledTask = nextTask;
          scheduledTaskStartTime = Date.now();
          executeScheduledTask(nextTask).catch(error => {
            console.error(`闃熷垪浠诲姟鎵ц閿欒:`, error);
          }).finally(() => {
            lastTaskExecution = Date.now();
          });
        } else {
          // 鍙︿竴涓畾鏃朵换鍔℃鍦ㄦ墽琛岋紝鏀惧洖闃熷垪绛夊緟
          pendingTaskQueue.unshift(nextTask);
        }
        return; // 宸插鐞嗭紝閫€鍑?      }

      // 闃熷垪宸插叏閮ㄦ竻绌猴紙鍏ㄩ儴杩囨湡锛?      if (pendingTaskQueue.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉁?闃熷垪涓墍鏈変换鍔″潎宸茶繃鏈燂紝宸叉竻绌篳,
          type: "info",
        });
      }
    }

    // 鉁?涓嶅湪 finally 鍧椾腑绔嬪嵆瑙﹀彂鍒锋柊
    // 鏀逛负鐢辫皟搴﹀櫒 10 绉?tick 缁熶竴妫€鏌?shouldRefreshAfterTask 骞跺湪鏃犱换鍔¤繍琛屾椂鍒锋柊
    // 杩欐牱鍙互纭繚鎵€鏈夐槦鍒椾换鍔￠兘琚鐞嗗畬姣曞悗锛屾墠鐪熸鍒锋柊椤甸潰
  }
};

// 娉? boxTypeOptions, fishTypeOptions 宸蹭粠 @/utils/batch 瀵煎叆

const openHelperModal = async (type) => {
  helperType.value = type;
  
  //  涓€閿疂绠卞懆寮€绠变笉鎻愬墠鑾峰彇绉垎锛岄伩鍏嶉噸澶嶈繛鎺?  // batchOpenBoxByPoints 鎵ц鏃朵細鑷姩杩炴帴骞惰幏鍙栫Н鍒?  if (type === 'pointsBox') {
    helperSettings.targetRounds = 1;  // 榛樿鍊?  }
  
  showHelperModal.value = true;
};

// 鎵归噺鍔熸硶娈嬪嵎璧犻€佺浉鍏虫柟娉?const clearRecipientError = () => {
  recipientIdError.value = "";
};

const validateRecipientId = (value) => {
  if (!value || value === "") {
    return true; // 鍏佽涓虹┖锛岀敱鎸夐挳绂佺敤鎺у埗
  }
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    recipientIdError.value = "璇疯緭鍏ユ湁鏁堢殑鏁板瓧ID";
    return false;
  }
  return true;
};

// 澶村儚澶勭悊鏂规硶
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
  // 1. 杈撳叆楠岃瘉
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "璇疯緭鍏ユ帴鏀惰€匢D";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "璇疯緭鍏ユ湁鏁堢殑鏁板瓧ID";
    return;
  }

  // 2. 妫€鏌ラ€変腑璐﹀彿
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "璇峰厛閫夋嫨瑕佹搷浣滅殑瑙掕壊";
    return;
  }

  // 3. 鍒濆鍖栫姸鎬?  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;
  // 閲嶇疆澶村儚鐘舵€?  resetAvatarState();

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 璁板綍寮€濮嬫煡璇?  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 寮€濮嬫煡璇㈡帴鏀惰€呬俊鎭? 浣跨敤璐﹀彿 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 纭繚WebSocket杩炴帴
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `姝ｅ湪寤虹珛WebSocket杩炴帴...`,
      type: "info",
    });

    // 浣跨敤鐜版湁鐨別nsureConnection鍑芥暟锛屽畠宸茬粡鍖呭惈浜嗛噸杩炴満鍒?    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket杩炴帴鎴愬姛`,
      type: "success",
    });

    // 鍙戦€佹煡璇㈠懡浠?    addLog({
      time: new Date().toLocaleTimeString(),
      message: `姝ｅ湪鍙戦€佹煡璇㈠懡浠わ紝鎺ユ敹鑰匢D: ${recipientId}`,
      type: "info",
    });

    // 寤堕暱瓒呮椂鏃堕棿鍒?0绉掞紝纭繚鏈夎冻澶熸椂闂村鐞?    const resp = await tokenStore.sendMessageWithPromise(
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
      message: `鏌ヨ鍛戒护鍙戦€佹垚鍔燂紝姝ｅ湪澶勭悊鍝嶅簲...`,
      type: "info",
    });

    // 澶勭悊鏌ヨ缁撴灉
    console.log("rank_getroleinfo 鍝嶅簲缁撴灉:", resp);

    // 鍏煎涓嶅悓鐨勫搷搴旂粨鏋?    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 鏋勫缓瀹屾暣鐨勮鑹蹭俊鎭紝绉婚櫎绛夌骇鍜孷IP瀛楁
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 娣诲姞澶村儚URL
        avatarUrl:
          resp?.roleInfo?.headImg ||
          roleData?.headImg ||
          roleData?.role?.headImg ||
          "",
        // 鎴樺姏杞崲涓轰嚎涓哄崟浣?        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "浜?,
        // 鎵╁睍鏇村瑙掕壊淇℃伅
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 鏍煎紡鍖栬鑹插悕锛屽鐞嗙壒娈婂瓧绗?      const displayName = recipientInfo.value.name || "鏈煡瑙掕壊";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 鏌ヨ鎴愬姛: 鎵惧埌瑙掕壊 ${displayName} (ID: ${recipientInfo.value.roleId})锛屾垬鍔? ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("鏌ヨ鎴愬姛");
    } else {
      const errorMsg = "鏈壘鍒拌瑙掕壊淇℃伅";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 鏌ヨ澶辫触: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 璇︾粏鐨勯敊璇鐞?    console.error("鏌ヨ鎺ユ敹鑰呬俊鎭け璐?", error);

    let errorMsg = "鏌ヨ澶辫触";
    let logType = "error";

    // 鏍规嵁閿欒绫诲瀷鎻愪緵鏇村弸濂界殑閿欒淇℃伅
    if (error.message.includes("杩炴帴澶辫触")) {
      errorMsg = "WebSocket杩炴帴澶辫触锛岃妫€鏌ョ綉缁滄垨璐﹀彿鐘舵€?;
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("瓒呮椂")
    ) {
      errorMsg = "鏌ヨ瓒呮椂锛岃绋嶅悗閲嶈瘯";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "鍔熸硶绯荤粺鏈紑鍚?;
    } else {
      errorMsg = `鏌ヨ澶辫触: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 璁板綍閿欒鏃ュ織
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 鏄剧ず鐢ㄦ埛鍙嬪ソ鐨勯敊璇彁绀?    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 璁板綍鏌ヨ瀹屾垚
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 鏌ヨ鎿嶄綔瀹屾垚 ===`,
      type: "info",
    });
  }
};

// 閲嶇疆鍔熸硶璧犻€佹ā鎬佹
const resetLegacyGiftModal = () => {
  recipientIdInput.value = '';
  recipientInfo.value = null;
  recipientIdError.value = '';
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("璇峰厛鏌ヨ骞剁‘璁ゆ帴鏀惰€呬俊鎭?);
    return;
  }

  // 妫€鏌ユ槸鍚︽墍鏈夐€変腑璐﹀彿閮芥湁瀵嗙爜閰嶇疆
  if (!hasPasswordForSelectedTokens.value) {
    message.error("璇风‘淇濇墍鏈夐€変腑鐨勮处鍙烽兘宸查厤缃姛娉曡禒閫佸瘑鐮?鍦ㄨ处鍙疯缃垨浠诲姟妯℃澘涓?");
    return;
  }

  // 璋冪敤澧炲己鐗堟壒閲忚禒閫佸姛鑳?  await batchLegacyGiftSendEnhanced();

  // 鍏抽棴妯℃€佹
  showLegacyGiftModal.value = false;
  // 閲嶇疆鎵€鏈夌姸鎬?  resetLegacyGiftModal();
};

const executeHelper = () => {
  if (helperType.value === 'weeklyMarket') {
    // 榛戝競鍛ㄨ喘涔扮壒娈婂鐞?    // 楠岃瘉鏄惁鍦ㄩ粦甯傚懆寮€鏀炬湡闂?    if (!isWeirdTowerActivityOpen.value) {
      message.warning(weirdTowerActivityStatus.value);
      return;
    }
    
    if (!helperSettings.weeklyMarketItems || helperSettings.weeklyMarketItems.length === 0) {
      message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
      return;
    }
    showHelperModal.value = false;
    // 浼犻€掗€変腑鐨勫晢鍝佸垪琛?    weeklyMarketBuy({ selectedItems: [...helperSettings.weeklyMarketItems] });
  } else if (helperType.value === 'cdk') {
    // 鍏戞崲鐮侀鍙?    if (!helperSettings.cdkCode || !helperSettings.cdkCode.trim()) {
      message.warning("璇疯緭鍏ュ厬鎹㈢爜");
      return;
    }
    // 鍚屾鍒癰atchSettings锛堝畾鏃朵换鍔′娇鐢級
    batchSettings.cdkCode = helperSettings.cdkCode.trim();
    showHelperModal.value = false;
    batchClaimCdkReward(false, helperSettings.cdkCode.trim());
  } else if (helperType.value === 'cheer') {
    // 鎸ラ紦鍔╁▉娑堣€?    showHelperModal.value = false;
    batchAutumnUseItem({ value: helperSettings.cheerQty || 0 });
  } else if (helperType.value === 'fragmentPack') {
    // 纰庣墖绀煎寘澶氶€夊紑鍚?    if (!helperSettings.fragmentPackItems || helperSettings.fragmentPackItems.length === 0) {
      message.warning("璇疯嚦灏戦€夋嫨涓€涓鐗囩ぜ鍖?);
      return;
    }
    showHelperModal.value = false;
    batchOpenFragmentPacks({ selectedItems: [...helperSettings.fragmentPackItems] });
  } else {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("娑堣€楁暟閲忓繀椤绘槸10鐨勬暣鏁板€嶏紝鏈€灏忎负10");
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

// 姊﹀璐拱缃戞牸鍒楁暟锛堟墜鏈虹2鍒楋紝妗岄潰绔?鍒楋級
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
  message.success("姊﹀璐拱閰嶇疆宸蹭繚瀛?);
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

// 娉? formationOptions, bossTimesOptions 宸蹭粠 @/utils/batch 瀵煎叆

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      bossFormation: 1,
      nightmareFormation: 1, // 鍗佹闃靛
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
      legacyGiftPassword: '', // 鏂板
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

  // 鑷姩鑾峰彇榛戝競閲囪喘娓呭崟锛堥渶WebSocket宸茶繛鎺ワ級
  const wsStatus = tokenStore.getWebSocketStatus(token.id);
  if (wsStatus === 'connected') {
    tokenStore.sendMessageWithPromise(token.id, 'store_getpurchase', {}, 8000)
      .then((result) => {
        console.log('[閲囪喘娓呭崟] 鍝嶅簲:', JSON.stringify(result).substring(0, 500));
        // 鍏煎澶氱鍝嶅簲缁撴瀯
        const purchaseItems = result?.purchaseItemList
          || result?.store?.purchaseItemList
          || result?.data?.purchaseItemList;
        if (purchaseItems?.length > 0) {
          currentSettings.purchaseList = purchaseItems.map(i => i.itemId);
          // 鍥炲～鎶樻墸
          const discounts = {};
          purchaseItems.forEach(i => { if (i.discount != null) discounts[i.itemId] = i.discount; });
          currentSettings.purchaseDiscounts = initPurchaseDiscounts(discounts);
          // 鍥炲～閲囪喘娆℃暟
          const purchaseCnt = result?.purchaseCnt ?? result?.store?.purchaseCnt;
          if (purchaseCnt != null) currentSettings.purchaseCnt = purchaseCnt;
        } else {
          console.warn('[閲囪喘娓呭崟] 鍝嶅簲涓虹┖鎴栨棤purchaseItemList, keys:', result ? Object.keys(result).join(',') : 'null');
        }
      })
      .catch((e) => {
        console.warn('[閲囪喘娓呭崟] 鑾峰彇澶辫触:', e?.message || e);
      });
  } else {
    console.warn('[閲囪喘娓呭崟] WebSocket鏈繛鎺? 鐘舵€?', wsStatus);
  }
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`宸蹭繚瀛?${currentSettingsTokenName.value} 鐨勮缃甡);
    showSettingsModal.value = false;
  }
};

// Task Template Functions
const openTaskTemplateModal = () => {
  // 鍔犺浇妯℃澘鍒楄〃
  loadTaskTemplates();
  // 閲嶇疆褰撳墠妯℃澘
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

// 璁＄畻寮曠敤鏌愪釜妯℃澘鐨勮处鍙锋暟閲?const getTemplateAccountCount = (templateId) => {
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
  // 鍔犺浇妯℃澘鍒楄〃
  loadTaskTemplates();
  // 閲嶇疆閫夋嫨
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
    message.error("璇烽€夋嫨妯℃澘鍜岃搴旂敤鐨勮处鍙?);
    return;
  }

  // 鎵惧埌閫変腑鐨勬ā鏉?  const templates = loadTaskTemplates();
  const template = templates.find((t) => t.id === selectedTemplateId.value);
  if (!template) {
    message.error("妯℃澘涓嶅瓨鍦?);
    return;
  }

  // 搴旂敤妯℃澘鍒伴€変腑鐨勮处鍙?  let successCount = 0;
  selectedTokensForApply.value.forEach((tokenId) => {
    // 淇濆瓨璐﹀彿璁剧疆鏃跺悓鏃朵繚瀛樻ā鏉縄D
    const accountSettings = {
      ...template.settings,
      templateId: template.id, // 璁板綍妯℃澘ID
    };
    localStorage.setItem(
      `daily-settings:${tokenId}`,
      JSON.stringify(accountSettings),
    );
    successCount++;
  });

  message.success(`宸叉垚鍔熷簲鐢ㄦā鏉垮埌 ${successCount} 涓处鍙穈);
  showApplyTemplateModal.value = false;
};

// Template Manager Functions
const openTemplateManagerModal = () => {
  // 鍔犺浇妯℃澘鍒楄〃
  loadTaskTemplates();
  showTemplateManagerModal.value = true;
};

const openEditTemplateModal = (template) => {
  // 鍔犺浇妯℃澘鏁版嵁鍒板綋鍓嶇紪杈戞ā鏉?  currentTemplateId.value = template.id;
  currentTemplateName.value = template.name;
  Object.assign(currentTemplate, template.settings);
  currentTemplate.purchaseDiscounts = initPurchaseDiscounts(currentTemplate.purchaseDiscounts);
  showTaskTemplateModal.value = true;
};

const updateTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("璇疯緭鍏ユā鏉垮悕绉?);
    return;
  }

  // 鎵惧埌骞舵洿鏂版ā鏉?  const templates = loadTaskTemplates();
  const templateIndex = templates.findIndex(
    (t) => t.id === currentTemplateId.value,
  );
  if (templateIndex === -1) {
    message.error("妯℃澘涓嶅瓨鍦?);
    return;
  }

  // 鏇存柊妯℃澘
  templates[templateIndex] = {
    ...templates[templateIndex],
    name: currentTemplateName.value.trim(),
    settings: {
      ...currentTemplate,
    },
    updatedAt: new Date().toISOString(),
  };

  // 淇濆瓨妯℃澘鍒發ocalStorage
  localStorage.setItem("task-templates", JSON.stringify(templates));

  // 鏇存柊妯℃澘鍒楄〃
  taskTemplates.value = templates;

  // 鉁?鍚屾鏇存柊鎵€鏈夊簲鐢ㄤ簡璇ユā鏉跨殑璐﹀彿璁剧疆
  const templateId = currentTemplateId.value;
  const newSettings = { ...currentTemplate };
  let updatedAccounts = 0;
  
  // 閬嶅巻localStorage锛屾壘鍒版墍鏈夊簲鐢ㄤ簡璇ユā鏉跨殑璐﹀彿
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('daily-settings:')) {
      try {
        const accountSettings = JSON.parse(localStorage.getItem(key));
        // 濡傛灉璇ヨ处鍙蜂娇鐢ㄤ簡褰撳墠妯℃澘锛屽垯鏇存柊鍏惰缃?        if (accountSettings.templateId === templateId) {
          const updatedAccountSettings = {
            ...newSettings,
            templateId: templateId, // 淇濈暀妯℃澘ID
          };
          localStorage.setItem(key, JSON.stringify(updatedAccountSettings));
          updatedAccounts++;
        }
      } catch (error) {
        console.error(`瑙ｆ瀽璐﹀彿璁剧疆澶辫触: ${key}`, error);
      }
    }
  }

  const updateMessage = updatedAccounts > 0 
    ? `宸叉洿鏂版ā鏉?"${templates[templateIndex].name}"锛屽苟鍚屾鍒?${updatedAccounts} 涓处鍙穈
    : `宸叉洿鏂版ā鏉?"${templates[templateIndex].name}"`;
  
  message.success(updateMessage);
  showTaskTemplateModal.value = false;

  // 閲嶇疆缂栬緫鐘舵€?  resetTemplateForm();
};

const deleteTaskTemplate = (templateId) => {
  // 纭鍒犻櫎
  if (confirm("纭畾瑕佸垹闄よ繖涓ā鏉垮悧锛?)) {
    // 鎵惧埌骞跺垹闄ゆā鏉?    const templates = loadTaskTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== templateId);

    // 淇濆瓨妯℃澘鍒發ocalStorage
    localStorage.setItem("task-templates", JSON.stringify(filteredTemplates));

    // 鏇存柊妯℃澘鍒楄〃
    taskTemplates.value = filteredTemplates;

    message.success("妯℃澘宸插垹闄?);
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
    blackMarketStandalonePurchase: false, // 榛戝競鍗曠嫭璐拱锛岄粯璁や笉鍚敤
  });
};

const openAccountTemplateModal = () => {
  // 鍔犺浇璐﹀彿妯℃澘寮曠敤鍏崇郴
  loadAccountTemplateReferences();
  showAccountTemplateModal.value = true;
};

const loadAccountTemplateReferences = () => {
  const templates = loadTaskTemplates();
  const references = [];

  // 閬嶅巻鎵€鏈夎处鍙凤紝鑾峰彇鍏舵ā鏉垮紩鐢?  sortedTokens.value.forEach((token) => {
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
          templateName: template ? template.name : "鏈紩鐢ㄦā鏉?,
        });
      } catch (e) {
        console.error(`瑙ｆ瀽璐﹀彿 ${token.name} 鐨勮缃け璐?`, e);
      }
    } else {
      // 娌℃湁璁剧疆鐨勮处鍙?      references.push({
        tokenId: token.id,
        tokenName: token.name,
        templateId: null,
        templateName: "鏈紩鐢ㄦā鏉?,
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

// 瀵煎嚭璐﹀彿妯℃澘寮曠敤
const exportAccountReferences = () => {
  try {
    isExporting.value = true;
    loadAccountTemplateReferences();
    
    const references = accountTemplateReferences.value;
    
    if (references.length === 0) {
      message.warning("娌℃湁鍙鍑虹殑璐﹀彿妯℃澘寮曠敤");
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

    message.success(`瀵煎嚭鎴愬姛: ${references.length} 涓处鍙锋ā鏉垮紩鐢╜);
  } catch (error) {
    console.error("瀵煎嚭璐﹀彿寮曠敤澶辫触:", error);
    message.error("瀵煎嚭澶辫触: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 瀵煎叆璐﹀彿妯℃澘寮曠敤
const importAccountReferences = async ({ file }) => {
  try {
    isImporting.value = true;
    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 楠岃瘉缁撴瀯
        if (!importData.version || !Array.isArray(importData.references)) {
          message.error("鏃犳晥鐨勮处鍙峰紩鐢ㄦ枃浠舵牸寮?);
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        importData.references.forEach((reference) => {
          if (!reference.tokenId || !reference.tokenName) {
            skippedCount++;
            return;
          }

          // 妫€鏌ヨ处鍙锋槸鍚﹀瓨鍦?          const tokenExists = tokens.value.some(t => t.id === reference.tokenId);
          if (!tokenExists) {
            skippedCount++;
            return;
          }

          // 妫€鏌ユā鏉挎槸鍚﹀瓨鍦?          const templates = loadTaskTemplates();
          const templateExists = !reference.templateId || templates.some(t => t.id === reference.templateId);
          if (!templateExists) {
            skippedCount++;
            return;
          }

          // 淇濆瓨璐﹀彿璁剧疆锛屽寘鍚ā鏉垮紩鐢?          const settingsStr = localStorage.getItem(`daily-settings:${reference.tokenId}`);
          let settings = {};
          if (settingsStr) {
            try {
              settings = JSON.parse(settingsStr);
            } catch (e) {
              console.error(`瑙ｆ瀽璐﹀彿 ${reference.tokenName} 鐨勮缃け璐?`, e);
            }
          }

          // 鏇存柊妯℃澘寮曠敤
          if (reference.templateId) {
            settings.templateId = reference.templateId;
          } else {
            delete settings.templateId;
          }

          // 淇濆瓨鏇存柊鍚庣殑璁剧疆
          localStorage.setItem(
            `daily-settings:${reference.tokenId}`,
            JSON.stringify(settings)
          );

          importedCount++;
        });

        // 閲嶆柊鍔犺浇璐﹀彿妯℃澘寮曠敤
        loadAccountTemplateReferences();

        message.success(
          `瀵煎叆鎴愬姛: ${importedCount} 涓处鍙峰紩鐢? ${skippedCount} 涓烦杩嘸
        );
      } catch (parseError) {
        console.error("瑙ｆ瀽璐﹀彿寮曠敤鏂囦欢澶辫触:", parseError);
        message.error("瑙ｆ瀽璐﹀彿寮曠敤鏂囦欢澶辫触");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("瀵煎叆璐﹀彿寮曠敤澶辫触:", error);
    message.error("瀵煎叆澶辫触: " + error.message);
    isImporting.value = false;
  }
};

const openNewTemplateModal = () => {
  // 閲嶇疆琛ㄥ崟锛屽噯澶囧垱寤烘柊妯℃澘
  resetTemplateForm();
  showTaskTemplateModal.value = true;
};

// 淇敼saveTaskTemplate鍑芥暟锛屾敮鎸佹柊澧炲拰缂栬緫
const saveTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("璇疯緭鍏ユā鏉垮悕绉?);
    return;
  }

  const templates = loadTaskTemplates();

  if (currentTemplateId.value) {
    // 鏇存柊鐜版湁妯℃澘
    updateTaskTemplate();
  } else {
    // 鍒涘缓鏂版ā鏉?    const template = {
      id: Date.now().toString(),
      name: currentTemplateName.value.trim(),
      settings: {
        ...currentTemplate,
      },
      createdAt: new Date().toISOString(),
    };

    // 娣诲姞鏂版ā鏉?    templates.push(template);
    localStorage.setItem("task-templates", JSON.stringify(templates));

    // 鏇存柊妯℃澘鍒楄〃
    taskTemplates.value = templates;

    message.success(`宸蹭繚瀛樻ā鏉?"${template.name}"`);
    showTaskTemplateModal.value = false;

    // 閲嶇疆琛ㄥ崟
    resetTemplateForm();
  }
};

// 鍔犺浇鐘舵€?const isExporting = ref(false);
const isImporting = ref(false);

// 瀵煎嚭浠诲姟妯℃澘
const exportTaskTemplates = () => {
  try {
    isExporting.value = true;
    const templates = loadTaskTemplates();
    
    if (templates.length === 0) {
      message.warning("娌℃湁鍙鍑虹殑浠诲姟妯℃澘");
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

    message.success(`瀵煎嚭鎴愬姛: ${templates.length} 涓换鍔℃ā鏉縛);
  } catch (error) {
    console.error("瀵煎嚭妯℃澘澶辫触:", error);
    message.error("瀵煎嚭澶辫触: " + error.message);
  } finally {
    isExporting.value = false;
  }
};

// 瀵煎叆浠诲姟妯℃澘
const importTaskTemplates = async ({ file }) => {
  try {
    isImporting.value = true;
    // n-upload鐨刢ustom-request涓紝file鏄疷ploadFileInfo瀵硅薄锛屽疄闄匜ile瀵硅薄鍦╢ile.file涓?    const actualFile = file?.file || file;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // 楠岃瘉缁撴瀯
        if (!importData.version || !Array.isArray(importData.templates)) {
          message.error("鏃犳晥鐨勬ā鏉挎枃浠舵牸寮?);
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
            // 鏇存柊鐜版湁妯℃澘
            const index = existingTemplates.findIndex(t => t.id === template.id);
            if (index !== -1) {
              existingTemplates[index] = {
                ...template,
                updatedAt: new Date().toISOString(),
              };
              updatedCount++;
            }
          } else {
            // 娣诲姞鏂版ā鏉?            existingTemplates.push({
              ...template,
              createdAt: template.createdAt || new Date().toISOString(),
            });
            importedCount++;
          }
        });

        // 淇濆瓨鏇存柊鍚庣殑妯℃澘
        localStorage.setItem("task-templates", JSON.stringify(existingTemplates));

        // 鏇存柊妯℃澘鍒楄〃
        taskTemplates.value = existingTemplates;

        message.success(
          `瀵煎叆鎴愬姛: ${importedCount} 涓柊妯℃澘, ${updatedCount} 涓洿鏂版ā鏉? ${skippedCount} 涓烦杩嘸
        );
      } catch (parseError) {
        console.error("瑙ｆ瀽妯℃澘鏂囦欢澶辫触:", parseError);
        message.error("瑙ｆ瀽妯℃澘鏂囦欢澶辫触");
      } finally {
        isImporting.value = false;
      }
    };
    reader.readAsText(actualFile);
  } catch (error) {
    console.error("瀵煎叆妯℃澘澶辫触:", error);
    message.error("瀵煎叆澶辫触: " + error.message);
    isImporting.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const autoScrollLog = ref(true);
const userManuallyDisabledScroll = ref(false); // 璁板綍鐢ㄦ埛鏄惁鎵嬪姩鍏抽棴浜嗚嚜鍔ㄦ粴鍔?const filterErrorsOnly = ref(false);
const errorCount = computed(() => {
  return logs.value.filter((log) => log.type === "error").length;
});

// 鐩戝惉鏃ュ織瀹瑰櫒鐨勬粴鍔ㄤ簨浠?const handleLogScroll = () => {
  if (!logContainer.value) return;
  
  // 濡傛灉鐢ㄦ埛鎵嬪姩鍏抽棴浜嗚嚜鍔ㄦ粴鍔紝涓嶅啀鑷姩寮€鍚?  if (userManuallyDisabledScroll.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const isAtBottom = distanceToBottom < 10; // 璺濈搴曢儴10px浠ュ唴瑙嗕负鍒拌揪搴曢儴
  
  // 濡傛灉婊氬姩鍒板簳閮紝寮€鍚嚜鍔ㄦ粴鍔?  if (isAtBottom && !autoScrollLog.value) {
    autoScrollLog.value = true;
    console.log('[鑷姩婊氬姩] 妫€娴嬪埌婊氬姩鍒板簳閮紝寮€鍚嚜鍔ㄦ粴鍔?);
  }
  // 濡傛灉寰€涓婃粴鍔紙璺濈搴曢儴瓒呰繃10px锛夛紝绔嬪嵆鍏抽棴鑷姩婊氬姩
  else if (!isAtBottom && autoScrollLog.value) {
    autoScrollLog.value = false;
    console.log(`[鑷姩婊氬姩] 妫€娴嬪埌寰€涓婃粴鍔紙璺濈搴曢儴${distanceToBottom.toFixed(0)}px锛夛紝鍏抽棴鑷姩婊氬姩`);
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
  // 濡傛灉鏈夋悳绱㈠叧閿瘝锛屽熀浜庢悳绱㈢粨鏋滃垽鏂?  if (tokenSearchKeyword.value.trim()) {
    return (
      selectedTokens.value.length === sortedTokens.value.length &&
      sortedTokens.value.length > 0 &&
      sortedTokens.value.every((t) => selectedTokens.value.includes(t.id))
    );
  }
  // 娌℃湁鎼滅储鏃讹紝鍩轰簬鎵€鏈夎处鍙峰垽鏂?  return (
    selectedTokens.value.length === tokens.value.length &&
    tokens.value.length > 0
  );
});

const isIndeterminate = computed(() => {
  // 濡傛灉鏈夋悳绱㈠叧閿瘝锛屽熀浜庢悳绱㈢粨鏋滃垽鏂?  if (tokenSearchKeyword.value.trim()) {
    const selectedInSearch = sortedTokens.value.filter((t) =>
      selectedTokens.value.includes(t.id)
    ).length;
    return (
      selectedInSearch > 0 &&
      selectedInSearch < sortedTokens.value.length
    );
  }
  // 娌℃湁鎼滅储鏃讹紝鍩轰簬鎵€鏈夎处鍙峰垽鏂?  return (
    selectedTokens.value.length > 0 &&
    selectedTokens.value.length < tokens.value.length
  );
});

// 妯″潡灞曞紑/鏀惰捣鐘舵€侊紙鎸佷箙鍖栧埌 localStorage锛?const LS_EXPAND_KEY = 'batch_expand_state';
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
const isTokenListExpanded = ref(_initExpand.tokens); // 璐﹀彿鍒楄〃灞曞紑/鏀惰捣鐘舵€?const showSponsorModal = ref(false); // 璧炲姪寮圭獥鏄剧ず鐘舵€?const showTipsModal = ref(false); // 娓╅Θ鎻愮ず寮圭獥鏄剧ず鐘舵€?const showQQGroupModal = ref(false); // QQ缇ゅ脊绐楁樉绀虹姸鎬?const isBatchFunctionsExpanded = ref(_initExpand.functions); // 鎵归噺鍔熻兘鍒楄〃灞曞紑/鏀惰捣鐘舵€?watch(isBatchFunctionsExpanded, saveExpandState);
watch(isTokenListExpanded, saveExpandState);
const isTowerExpandedForAll = ref(false);
const isCarExpandedForAll = ref(false);
const isClimbTowerExpandedForAll = ref(false);
const isWeirdTowerExpandedForAll = ref(false);

// 闃蹭紤鐪犵姸鎬?// 鉁?闃蹭紤鐪犵姸鎬佹寔涔呭寲
const WAKE_LOCK_STORAGE_KEY = 'wakeLockEnabled';

// 浠?localStorage 鍔犺浇闃蹭紤鐪犵姸鎬?const loadWakeLockState = () => {
  try {
    const saved = localStorage.getItem(WAKE_LOCK_STORAGE_KEY);
    return saved === 'true';
  } catch (error) {
    console.error('鍔犺浇闃蹭紤鐪犵姸鎬佸け璐?', error);
    return false;
  }
};

// 淇濆瓨闃蹭紤鐪犵姸鎬佸埌 localStorage
const saveWakeLockState = (enabled) => {
  try {
    localStorage.setItem(WAKE_LOCK_STORAGE_KEY, String(enabled));
  } catch (error) {
    console.error('淇濆瓨闃蹭紤鐪犵姸鎬佸け璐?', error);
  }
};

const isWakeLockEnabled = ref(loadWakeLockState());  // 鉁?浠?localStorage 鍔犺浇
const wakeLockSupported = ref(false);

// 闃蹭紤鐪犲紑鍏冲鐞?const handleWakeLockToggle = async (enabled) => {
  if (enabled) {
    const success = await wakeLockManager.request();
    if (success) {
      message.success('闃蹭紤鐪犲凡寮€鍚?绯荤粺灏嗕繚鎸佸敜閱掔姸鎬?);
      isWakeLockEnabled.value = true;
      saveWakeLockState(true);  // 鉁?淇濆瓨鍒?localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "馃洝锔?闃蹭紤鐪犲凡寮€鍚?,
        type: "success",
      });
    } else {
      message.error('闃蹭紤鐪犲紑鍚け璐?璇锋鏌ョ幆澧冩敮鎸?);
      isWakeLockEnabled.value = false;
      saveWakeLockState(false);  // 鉁?淇濆瓨鍒?localStorage
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "闃蹭紤鐪犲紑鍚け璐?,
        type: "error",
      });
    }
  } else {
    await wakeLockManager.release();
    message.info('闃蹭紤鐪犲凡鍏抽棴');
    isWakeLockEnabled.value = false;
    saveWakeLockState(false);  // 鉁?淇濆瓨鍒?localStorage
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "闃蹭紤鐪犲凡鍏抽棴",
      type: "info",
    });
  }
};

const handleSelectAll = (checked) => {
  if (checked) {
    // 濡傛灉鏈夋悳绱㈠叧閿瘝锛屽彧閫変腑鎼滅储鍑烘潵鐨勮处鍙?    if (tokenSearchKeyword.value.trim()) {
      selectedTokens.value = sortedTokens.value.map((t) => t.id);
    } else {
      // 娌℃湁鎼滅储鏃讹紝閫変腑鎵€鏈夎处鍙?      selectedTokens.value = tokens.value.map((t) => t.id);
    }
  } else {
    selectedTokens.value = [];
  }
};

// 澶勭悊TokenCard閫夋嫨浜嬩欢
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

// 澶勭悊TokenCard杩炴帴鍒囨崲浜嬩欢
const handleToggleConnection = async (tokenId) => {
  const connection = tokenStore.wsConnections[tokenId];
  const isConnected = connection?.status === 'connected';
  const isConnecting = connection?.status === 'connecting';
  
  // 闃叉閲嶅鐐瑰嚮
  if (isConnecting) {
    message.info('杩炴帴姝ｅ湪寤虹珛涓?璇风◢鍊?..');
    return;
  }
  
  if (isConnected) {
    // 鏂紑杩炴帴
    await tokenStore.closeWebSocketConnection(tokenId);
    message.success(`宸叉柇寮€杩炴帴`);
  } else {
    // 寤虹珛杩炴帴
    const token = tokens.value.find(t => t.id === tokenId);
    if (token) {
      try {
        message.loading(`姝ｅ湪杩炴帴: ${token.name}...`);
        
        // 灏濊瘯寤虹珛杩炴帴
        await tokenStore.createWebSocketConnection(tokenId, token.token);
        
        // 绛夊緟杩炴帴鐘舵€佹洿鏂?        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 妫€鏌ヨ繛鎺ョ粨鏋?        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          message.destroyAll();
          message.success(`宸茶繛鎺? ${token.name}`);
          
          // 杩炴帴鎴愬姛鍚庤嚜鍔ㄨ幏鍙栬鑹蹭俊鎭?          tokenStore.sendGetRoleInfo(tokenId);
        } else {
          message.destroyAll();
          if (conn?.status === 'error') {
            message.warning(`杩炴帴澶辫触锛屾鍦ㄥ埛鏂癟oken锛岀◢鍚庨噸杩瀈);
            // error鐘舵€佹椂鑷姩灏濊瘯鍒锋柊Token骞堕噸杩?            try {
              const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
              if (refreshSuccess) {
                message.success(`Token鍒锋柊鎴愬姛, 姝ｅ湪閲嶆柊杩炴帴: ${token.name}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                const reConn = tokenStore.wsConnections[tokenId];
                if (reConn?.status === 'connected') {
                  tokenStore.sendGetRoleInfo(tokenId);
                }
              } else {
                message.error(`Token鍒锋柊澶辫触, 璇锋墜鍔ㄩ噸鏂板鍏? ${token.name}`);
              }
            } catch (refreshError) {
              message.error(`Token鍒锋柊澶辫触: ${refreshError.message || '鏈煡閿欒'}`);
            }
          } else if (conn?.status === 'disconnected') {
            message.warning(`杩炴帴鏈畬鎴愮姸鎬侊細宸插埛鏂癟oken璇烽噸鏂拌繛鎺);
          } else {
            message.warning(`杩炴帴鏈畬鎴? 鐘舵€? ${conn?.status || 'unknown'}`);
          }
        }
      } catch (error) {
        message.destroyAll();
        message.warning(`杩炴帴澶辫触: ${error.message || '鏈煡閿欒'},姝ｅ湪灏濊瘯鍒锋柊Token...`);
        
        // 杩炴帴澶辫触鏃跺皾璇曞埛鏂癟oken
        try {
          const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId, true);
          
          if (refreshSuccess) {
            message.success(`Token鍒锋柊鎴愬姛,姝ｅ湪閲嶆柊杩炴帴: ${token.name}`);
            
            // 绛夊緟閲嶈繛瀹屾垚
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const conn = tokenStore.wsConnections[tokenId];
            if (conn?.status === 'connected') {
              tokenStore.sendGetRoleInfo(tokenId);
            }
          } else {
            message.error(`Token鍒锋柊澶辫触,璇锋墜鍔ㄩ噸鏂板鍏? ${token.name}`);
          }
        } catch (refreshError) {
          message.error(`Token鍒锋柊澶辫触: ${refreshError.message || '鏈煡閿欒'}`);
        }
      }
    }
  }
};

// 鎷栧姩鎺掑簭鐩稿叧 - 鍦ㄧ埗缁勪欢涓淮鎶ゅ叏灞€鐘舵€?const draggedTokenId = ref(null);
const isDragging = ref(false);
const targetTokenId = ref(null); // 褰撳墠榧犳爣涓嬬殑鐩爣鍗＄墖

// 澶勭悊鎷栧姩寮€濮?const handleTokenDragStart = (tokenId) => {
  draggedTokenId.value = tokenId;
  isDragging.value = true;
  targetTokenId.value = null; // 閲嶇疆鐩爣浣嶇疆
};

// 澶勭悊鎷栧姩缁撴潫
const handleTokenDragEnd = (tokenId) => {
  draggedTokenId.value = null;
  isDragging.value = false;
  targetTokenId.value = null;
};

// 澶勭悊鎷栧姩鏌ヨ锛堝瓙缁勪欢鏌ヨ鎷栧姩鐘舵€侊級
const handleTokenDragQuery = (tokenId, callback) => {
  callback(isDragging.value, draggedTokenId.value);
};

// 澶勭悊鏇存柊鐩爣浣嶇疆锛堥紶鏍囪繘鍏ユ柊鍗＄墖鏃讹級
const handleTokenDragUpdateTarget = (tokenId) => {
  targetTokenId.value = tokenId;
};

// 澶勭悊鑾峰彇鐩爣浣嶇疆锛堥紶鏍囨澗寮€鏃讹級
const handleTokenDragGetTarget = (callback) => {
  callback(targetTokenId.value);
};

// 澶勭悊鏀句笅
const handleTokenDrop = async ({ draggedId, targetId }) => {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }
  
  // 鑾峰彇褰撳墠鎺掑簭鍚庣殑token鍒楄〃
  const currentTokens = [...sortedTokens.value];
  
  const draggedIndex = currentTokens.findIndex(t => t.id === draggedId);
  const targetIndex = currentTokens.findIndex(t => t.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }
  
  // 閲嶆柊鎺掑簭
  const [removed] = currentTokens.splice(draggedIndex, 1);
  currentTokens.splice(targetIndex, 0, removed);
  
  // 淇濆瓨鏂扮殑鎺掑簭
  const newTokenOrder = currentTokens.map(t => t.id);
  
  // 鏇存柊tokenOrder鍝嶅簲寮忓彉閲忥紝瑙﹀彂sortedTokens閲嶆柊璁＄畻
  tokenOrder.value = newTokenOrder;
  
  // 淇濆瓨鍒板瓨鍌?  await saveTokenOrder(newTokenOrder);
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `宸茶皟鏁磋处鍙蜂綅缃甡,
    type: 'success'
  });
};

// 淇濆瓨Token鎺掑簭
const saveTokenOrder = async (tokenOrder) => {
  try {
    await storage.set('tokenOrder', tokenOrder);
  } catch (error) {
    console.error('淇濆瓨Token鎺掑簭澶辫触:', error);
  }
};

// 鍔犺浇Token鎺掑簭
const loadTokenOrder = async () => {
  try {
    const savedOrder = await storage.get('tokenOrder');
    return savedOrder || [];
  } catch (error) {
    console.error('鍔犺浇Token鎺掑簭澶辫触:', error);
    return [];
  }
};

// 鍒锋柊閫変腑鐨凾oken
const refreshSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning('璇峰厛閫夋嫨瑕佸埛鏂扮殑璐﹀彿');
    return;
  }

  message.info(`寮€濮嬪埛鏂?${selectedTokens.value.length} 涓猅oken...`);

  let successCount = 0;
  let failCount = 0;

  // 涓茶鍒锋柊锛岄伩鍏嶅悓鏃跺彂璧峰お澶氳姹?  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 鏍囪Token涓烘鍦ㄦ墽琛屼换鍔?      tokenStore.setTokenRunning(tokenId, true);
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `灏濊瘯鍒锋柊Token: ${token.name}`,
        type: "info",
      });

      // 灏濊瘯鍒锋柊Token
      const refreshSuccess = await tokenStore.attemptTokenRefresh(tokenId);
      
      if (refreshSuccess) {
        // 鍒锋柊鎴愬姛锛屾洿鏂版渶鍚庡埛鏂版椂闂?        token.lastRefreshAt = new Date().toISOString();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token鍒锋柊鎴愬姛: ${token.name}`,
          type: "success",
        });
        successCount++;
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `Token鍒锋柊澶辫触: ${token.name}`,
          type: "warning",
        });
        failCount++;
      }
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鍒锋柊Token澶辫触 [${token.name}]: ${error.message}`,
        type: "error",
      });
      failCount++;
    } finally {
      // 鏍囪Token涓轰换鍔″畬鎴?      tokenStore.setTokenRunning(tokenId, false);
    }

    // 娣诲姞鐭殏寤惰繜閬垮厤璇锋眰杩囦簬棰戠箒
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (successCount > 0) {
    message.success(`鎴愬姛鍒锋柊 ${successCount} 涓猅oken`);
  }
  if (failCount > 0) {
    message.error(`${failCount} 涓猅oken鍒锋柊澶辫触`);
  }
};

// 閲嶇疆閫変腑璐﹀彿鐨勬湰鍦扮紦瀛?const resetSelectedTokensCache = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('璇峰厛閫夋嫨瑕侀噸缃殑璐﹀彿');
    return;
  }

  let resetCount = 0;
  
  // 閬嶅巻閫変腑鐨則oken,娓呴櫎localStorage涓殑缂撳瓨
  for (const tokenId of selectedTokens.value) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 娓呴櫎璇oken鐨勬墍鏈夌浉鍏崇紦瀛?      // 鏍规嵁 TokenCard.vue 涓殑瀹為檯瀛樺偍閿悕: tokencard_{id}_status
      const cacheKeys = [
        `tokencard_${tokenId}_status`,  // 鍗＄墖鐘舵€佺紦瀛?      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[閲嶇疆缂撳瓨] 宸叉竻闄? ${key}`);
      });
      
      resetCount++;
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `宸查噸缃紦瀛? ${token.name}`,
        type: "success",
      });
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `閲嶇疆缂撳瓨澶辫触 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  if (resetCount > 0) {
    message.success(`宸查噸缃?${resetCount} 涓处鍙风殑缂撳瓨锛岃鍒锋柊椤甸潰鏌ョ湅鏁堟灉`);
  }
};

// 鍒犻櫎閫変腑鐨勮处鍙凤紙澶嶇敤tokenStore.removeToken閫昏緫锛?const deleteSelectedTokens = async () => {
  if (selectedTokens.value.length === 0) return;

  let deletedCount = 0;
  const failedNames = [];

  for (const tokenId of [...selectedTokens.value]) {
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    try {
      // 璋冪敤tokenStore鐨剅emoveToken锛氭柇寮€WS杩炴帴 + 浠巊ameTokens绉婚櫎 + 鍒犻櫎IndexedDB BIN鏁版嵁
      await tokenStore.removeToken(tokenId);

      // 娓呴櫎璇oken鐨勬棩甯镐换鍔￠厤缃?      localStorage.removeItem(`daily-settings:${tokenId}`);
      // 娓呴櫎鍗＄墖鐘舵€佺紦瀛?      localStorage.removeItem(`tokencard_${tokenId}_status`);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `宸插垹闄よ处鍙? ${token.name}`,
        type: "success",
      });
      deletedCount++;
    } catch (error) {
      console.error(`鍒犻櫎璐﹀彿澶辫触 [${token.name}]:`, error);
      failedNames.push(token.name);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鍒犻櫎璐﹀彿澶辫触 [${token.name}]: ${error.message}`,
        type: "error",
      });
    }
  }

  // 娓呴櫎閫変腑鍒楄〃
  selectedTokens.value = [];

  if (deletedCount > 0) {
    message.success(`宸插垹闄?${deletedCount} 涓处鍙穈);
  }
  if (failedNames.length > 0) {
    message.error(`${failedNames.length} 涓处鍙峰垹闄ゅけ璐? ${failedNames.join(', ')}`);
  }
};

// 娣诲姞Token寮圭獥鐘舵€?const showAddTokenModal = ref(false);
const addTokenImportMethod = ref("manual");

// 鎵撳紑娣诲姞Token寮圭獥锛堟浛浠ｈ烦杞級
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
  if (status === "completed") return "宸插畬鎴?;
  if (status === "failed") return "澶辫触";
  if (status === "running") return "鎵ц涓?;
  if (status === "waiting_retry") return "绛夊緟閲嶈瘯";
  return "绛夊緟涓?;
};

// =====================
// 杩炴帴/鏂紑鐩稿叧鏂规硶
// =====================

/**
 * 杩炴帴閫変腑鐨勮处鍙? */
const connectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("璇峰厛閫夋嫨瑕佽繛鎺ョ殑璐﹀彿");
    return;
  }

  const tokensToConnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return !connection || connection.status !== "connected";
  });

  if (tokensToConnect.length === 0) {
    message.info("閫変腑鐨勮处鍙峰凡鍏ㄩ儴杩炴帴");
    return;
  }

  // 鏄剧ず鍔犺浇鎻愮ず
  const loadingMsg = message.loading(`寮€濮嬭繛鎺?${tokensToConnect.length} 涓处鍙?..`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  // 涓茶杩炴帴锛岄伩鍏嶅悓鏃跺彂璧峰お澶氳姹?  for (const tokenId of tokensToConnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    if (!token) continue;

    try {
      // 鏇存柊鍔犺浇鎻愮ず
      loadingMsg.content = `姝ｅ湪杩炴帴: ${token.name} (${successCount + failCount + 1}/${tokensToConnect.length})`;
      
      await tokenStore.createWebSocketConnection(tokenId, token.token);
      successCount++;

      // 杩炴帴鎴愬姛鍚庤嚜鍔ㄨ幏鍙栬鑹蹭俊鎭?      setTimeout(() => {
        const conn = tokenStore.wsConnections[tokenId];
        if (conn?.status === 'connected') {
          tokenStore.sendGetRoleInfo(tokenId);
        }
      }, 1000);

      // 娣诲姞灏忓欢杩燂紝閬垮厤璇锋眰杩囦簬棰戠箒
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failCount++;
      console.error(`杩炴帴澶辫触 ${token.name}:`, error);
    }
  }
  
  // 鍏抽棴鍔犺浇鎻愮ず
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`鎴愬姛杩炴帴 ${successCount} 涓处鍙凤紝${failCount} 涓处鍙疯繛鎺ュけ璐);
    } else {
      message.success(`鎴愬姛杩炴帴 ${successCount} 涓处鍙穈);
    }
  } else {
    message.error(`鎵€鏈夎处鍙疯繛鎺ュけ璐ワ紝鍏?${failCount} 涓处鍙穈);
  }
};

/**
 * 鏂紑閫変腑鐨勮处鍙? */
const disconnectSelected = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("璇峰厛閫夋嫨瑕佹柇寮€鐨勮处鍙?);
    return;
  }

  const tokensToDisconnect = selectedTokens.value.filter((tokenId) => {
    const connection = tokenStore.wsConnections[tokenId];
    return connection && connection.status === "connected";
  });

  if (tokensToDisconnect.length === 0) {
    message.info("閫変腑鐨勮处鍙锋湭杩炴帴");
    return;
  }

  // 鏄剧ず鍔犺浇鎻愮ず
  const loadingMsg = message.loading(`寮€濮嬫柇寮€ ${tokensToDisconnect.length} 涓处鍙?..`, { duration: 0 });

  let successCount = 0;
  let failCount = 0;

  for (const tokenId of tokensToDisconnect) {
    const token = tokens.value.find((t) => t.id === tokenId);
    try {
      // 鏇存柊鍔犺浇鎻愮ず
      loadingMsg.content = `姝ｅ湪鏂紑: ${token?.name || tokenId} (${successCount + failCount + 1}/${tokensToDisconnect.length})`;
      
      await tokenStore.closeWebSocketConnection(tokenId);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`鏂紑杩炴帴澶辫触 ${tokenId}:`, error);
    }
  }
  
  // 鍏抽棴鍔犺浇鎻愮ず
  loadingMsg.destroy();

  if (successCount > 0) {
    if (failCount > 0) {
      message.success(`宸叉柇寮€ ${successCount} 涓处鍙风殑杩炴帴锛?{failCount} 涓处鍙锋柇寮€澶辫触`);
    } else {
      message.success(`宸叉柇寮€ ${successCount} 涓处鍙风殑杩炴帴`);
    }
  } else {
    message.error(`鎵€鏈夎处鍙锋柇寮€澶辫触锛屽叡 ${failCount} 涓处鍙穈);
  }
};

// =====================
// Token鍒嗙粍绠＄悊鐩稿叧鏂规硶
// =====================

/**
 * 鍒涘缓鏂板垎缁? */
const createNewGroup = () => {
  if (!newGroupName.value.trim()) {
    message.warning("璇疯緭鍏ュ垎缁勫悕绉?);
    return;
  }

  const newGroup = tokenStore.createTokenGroup(newGroupName.value.trim(), newGroupColor.value);
  
  // 娣诲姞閫変腑鐨凾oken鍒版柊鍒嗙粍
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach(tokenId => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("鍒嗙粍鍒涘缓鎴愬姛");
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
 * 鍒犻櫎鍒嗙粍
 */
const deleteGroup = (groupId) => {
  if (confirm("纭畾瑕佸垹闄よ繖涓垎缁勫悧锛熷垎缁勪腑鐨則oken涓嶄細琚垹闄ゃ€?)) {
    tokenStore.deleteTokenGroup(groupId);
    // 浠庢壒閲忓垹闄ら€変腑鍒楄〃涓Щ闄?    const idx = batchDeleteSelectedGroupIds.value.indexOf(groupId);
    if (idx !== -1) batchDeleteSelectedGroupIds.value.splice(idx, 1);
    message.success("鍒嗙粍宸插垹闄?);
  }
};

/**
 * 鍒囨崲鍗曚釜鍒嗙粍鐨勬壒閲忓垹闄ら€変腑鐘舵€? */
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
 * 鍏ㄩ€?鍙栨秷鍏ㄩ€夊垎缁? */
const toggleSelectAllGroups = (checked) => {
  if (checked) {
    batchDeleteSelectedGroupIds.value = tokenGroups.value.map(g => g.id);
  } else {
    batchDeleteSelectedGroupIds.value = [];
  }
};

/**
 * 鎵归噺鍒犻櫎鍒嗙粍
 */
const batchDeleteGroups = () => {
  if (batchDeleteSelectedGroupIds.value.length === 0) return;
  const count = batchDeleteSelectedGroupIds.value.length;
  batchDeleteSelectedGroupIds.value.forEach(groupId => {
    tokenStore.deleteTokenGroup(groupId);
  });
  batchDeleteSelectedGroupIds.value = [];
  message.success(`宸插垹闄?${count} 涓垎缁刞);
};

// 鎵撳紑鍒嗙粍绠＄悊寮圭獥鏃舵竻闄ら€変腑鐘舵€?watch(showGroupManageModal, (val) => {
  if (val) batchDeleteSelectedGroupIds.value = [];
});

/**
 * 淇濆瓨缂栬緫鐨勫垎缁? */
const saveEditGroup = () => {
  if (!editingGroupId.value) return;

  if (!editingGroupName.value.trim()) {
    message.warning("璇疯緭鍏ュ垎缁勫悕绉?);
    return;
  }

  tokenStore.updateTokenGroup(editingGroupId.value, {
    name: editingGroupName.value.trim(),
    color: editingGroupColor.value,
  });

  message.success("鍒嗙粍宸叉洿鏂?);
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 寮€濮嬬紪杈戝垎缁? */
const startEditGroup = (groupId) => {
  const group = tokenGroups.value.find((g) => g.id === groupId);
  if (group) {
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
    editingGroupColor.value = group.color;
  }
};

/**
 * 鍙栨秷缂栬緫鍒嗙粍
 */
const cancelEditGroup = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

// 瀵煎叆瀵煎嚭鍒嗙粍鐩稿叧鍑芥暟
const importFileInput = ref(null);

/**
 * 瀵煎嚭鍒嗙粍
 */
const exportGroups = async () => {
  const result = await tokenStore.exportTokenGroups();
  if (result) {
    message.success("鍒嗙粍瀵煎嚭鎴愬姛");
  } else {
    message.error("鍒嗙粍瀵煎嚭澶辫触");
  }
};

/**
 * 瑙﹀彂瀵煎叆鍒嗙粍鏂囦欢閫夋嫨
 */
const triggerImportGroups = () => {
  if (importFileInput.value) {
    importFileInput.value.click();
  }
};

/**
 * 澶勭悊瀵煎叆鏂囦欢
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
          message.success("鍒嗙粍瀵煎叆鎴愬姛");
        }
      }
    } catch (error) {
      message.error(`瀵煎叆澶辫触: ${error.message}`);
      console.error("鍒嗙粍瀵煎叆澶辫触:", error);
    } finally {
      // 閲嶇疆鏂囦欢杈撳叆
      if (importFileInput.value) {
        importFileInput.value.value = "";
      }
    }
  };
  reader.readAsText(file);
};

/**
 * 鍒囨崲鍒嗙粍閫夋嫨鐘舵€? */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 鏇存柊selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 鍒ゆ柇鍒嗙粍鏄惁琚€変腑
 */
const isGroupSelected = (groupId) => {
  return selectedGroups.value.includes(groupId);
};

/**
 * 鏍规嵁閫変腑鐨勫垎缁勬洿鏂皊electedTokens
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
 * 涓€閿竻闄ゆ墍鏈夊垎缁勯€夋嫨
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

/**
 * 娣诲姞token鍒板垎缁? */
const addTokenToSelectedGroup = (groupId, tokenId) => {
  tokenStore.addTokenToGroup(groupId, tokenId);
  message.success("宸插皢token娣诲姞鍒板垎缁?);
};

/**
 * 浠庡垎缁勭Щ闄oken
 */
const removeTokenFromSelectedGroup = (groupId, tokenId) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  message.success("宸插皢token浠庡垎缁勭Щ闄?);
};

/**
 * 鑾峰彇鍒嗙粍涓湁鏁堢殑token ID鍒楄〃锛堢敤浜庢ā鏉夸腑灞曠ず锛? */
const getValidGroupTokenIds = (groupId) => {
  return tokenStore.getValidGroupTokenIds(groupId);
};

/**
 * 鑾峰彇鍒嗙粍涓殑token鍒楄〃
 */
const getGroupTokenList = (groupId) => {
  const tokenIds = tokenStore.getValidGroupTokenIds(groupId);
  return tokens.value.filter((t) => tokenIds.includes(t.id));
};

// 娉? pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 宸蹭粠 @/utils/batch 瀵煎叆

const addLog = (log) => {
  // 娣诲姞鏃ュ織鏁版嵁鍒版暟缁?  logs.value.push(log);

  // 闄愬埗logs鏁扮粍澶у皬锛岄槻姝㈠唴瀛樺崰鐢ㄨ繃澶?  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }

  // 鍙湁鍦ㄥ惎鐢ㄨ嚜鍔ㄦ粴鍔ㄦ椂鎵嶆墽琛屾粴鍔?  if (autoScrollLog.value && logContainer.value) {
    try {
      // 浣跨敤nextTick纭繚DOM宸叉洿鏂?      nextTick(() => {
        // 妫€鏌ヨ嚜鍔ㄦ粴鍔ㄦ槸鍚︿粛鐒跺惎鐢?        if (logContainer.value && autoScrollLog.value === true) {
          // 婊氬姩鍒板簳閮?          logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
      });
    } catch (error) {
      // 蹇界暐DOM鎿嶄綔閿欒锛岀‘淇濇棩蹇楁暟鎹粛鐒惰璁板綍
      console.warn("Failed to scroll log container:", error);
    }
  }
};

watch(autoScrollLog, (newValue, oldValue) => {
  console.log(`[鑷姩婊氬姩] 鐘舵€佸彉鍖? ${oldValue} -> ${newValue}`);
  
  // 濡傛灉鐢ㄦ埛浠庡紑鍚彉涓哄叧闂紝鏍囪涓虹敤鎴锋墜鍔ㄥ叧闂?  if (oldValue === true && newValue === false) {
    userManuallyDisabledScroll.value = true;
    console.log('[鑷姩婊氬姩] 鐢ㄦ埛鎵嬪姩鍏抽棴鑷姩婊氬姩');
  }
  // 濡傛灉鐢ㄦ埛浠庡叧闂彉涓哄紑鍚紝娓呴櫎鎵嬪姩鍏抽棴鏍囪
  else if (oldValue === false && newValue === true) {
    userManuallyDisabledScroll.value = false;
    console.log('[鑷姩婊氬姩] 鐢ㄦ埛鎵嬪姩寮€鍚嚜鍔ㄦ粴鍔?);
  }
  
  if (newValue && logContainer.value) {
    nextTick(() => {
      try {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
        console.log('[鑷姩婊氬姩] 鍚敤鍚庤嚜鍔ㄦ粴鍔ㄥ埌搴曢儴');
      } catch (error) {
        // 蹇界暐DOM鎿嶄綔閿欒
        console.warn("Failed to scroll log container:", error);
      }
    });
  } else if (!newValue) {
    console.log('[鑷姩婊氬姩] 宸茬鐢紝鍙栨秷鑷姩婊氬姩');
  }
});

// 鐩戝惉filterErrorsOnly鍙樺寲锛岄槻姝㈠湪鍒囨崲杩囨护鏃惰Е鍙戣嚜鍔ㄦ粴鍔?watch(filterErrorsOnly, (newValue, oldValue) => {
  console.log(`[鍙湅閿欒] 鐘舵€佸彉鍖? ${oldValue} -> ${newValue}`);
  // 濡傛灉鑷姩婊氬姩宸茬鐢紝纭繚涓嶄細鍥犱负DOM鏇存柊鑰屾粴鍔?  if (!autoScrollLog.value && logContainer.value) {
    // 淇濆瓨褰撳墠婊氬姩浣嶇疆
    const currentScrollTop = logContainer.value.scrollTop;
    nextTick(() => {
      // 鎭㈠婊氬姩浣嶇疆锛岄槻姝㈣嚜鍔ㄦ粴鍔?      if (logContainer.value && !autoScrollLog.value) {
        logContainer.value.scrollTop = currentScrollTop;
        console.log('[鍙湅閿欒] 鍒囨崲杩囨护鏃朵繚鎸佹粴鍔ㄤ綅缃?);
      }
    });
  }
});

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("娌℃湁鍙鍒剁殑鏃ュ織");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("鏃ュ織宸插鍒跺埌鍓创鏉?);
    })
    .catch((err) => {
      message.error("澶嶅埗鏃ュ織澶辫触: " + err.message);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("鏃ュ織宸叉竻绌?);
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

// ========== 杩炴帴姹犵鐞?==========
// 杩炴帴姹狅細鎺у埗骞跺彂杩炴帴鏁帮紙淇″彿閲忔ā寮忥紝瀹為檯WS鐢熷懡鍛ㄦ湡鐢辫皟鐢ㄦ柟绠＄悊锛?const wsPool = new WebSocketPool({
  poolSize: batchSettings.maxActive,
  connectionInterval: 300,
});

// 鍏煎鎬у璞★細淇濇寔 connectionQueue.active 渚涙棩蹇楁樉绀?const connectionQueue = {
  get active() { return wsPool.activeCount; }
};

const waitForConnectionSlot = async (timeout = 60000) => {
  // 閫氱敤妲戒綅绛夊緟锛堟棤tokenId鏃朵娇鐢ㄩ粯璁ゆ爣璇嗭級
  await wsPool.acquire('_generic_', timeout);
};

const releaseConnectionSlot = () => {
  wsPool.release('_generic_');
};

/**
 * 娴佸紡鎵ц鍣細鏇夸唬 Promise.all锛岀‘淇濆悓鏃跺彧鏈?maxActive 涓换鍔″湪杩愯
 * 褰撲竴涓换鍔″畬鎴愭椂绔嬪嵆鍚姩涓嬩竴涓紝閬垮厤鎵€鏈変换鍔″悓鏃舵帓闃熺瓑寰呰繛鎺ユЫ
 * @param {string[]} tokenIds - Token ID 鍒楄〃
 * @param {Function} processFn - 澶勭悊鍑芥暟 (tokenId) => Promise
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
      .catch(() => {}) // 纭繚涓嶆姏鍑烘湭鎹曡幏鐨勬嫆缁?      .finally(() => {
        running.delete(p);
        completedCount++;
      });
    running.add(p);
  };

  // 鍚姩鍒濆鎵规
  for (let i = 0; i < Math.min(maxConcurrent, queue.length); i++) {
    launchNext();
  }

  // 姣忓綋涓€涓换鍔″畬鎴愶紝鑷姩鍚姩涓嬩竴涓?  while (running.size > 0) {
    await Promise.race([...running]);
    launchNext();
  }

  // 闃插尽鎬ф鏌ワ細纭繚鎵€鏈塗oken閮藉凡澶勭悊
  if (completedCount < tokenIds.length && !shouldStop.value) {
    console.warn(`[runStreaming] 瀹屾垚鏁?${completedCount})灏戜簬鎬绘暟(${tokenIds.length})锛岃ˉ鍏呭鐞嗗墿浣橳oken`);
    // 鎵惧嚭鏈鐞嗙殑Token锛堥€氳繃妫€鏌okenStatus锛?    const remaining = tokenIds.filter(id => {
      const status = tokenStatus.value[id];
      return status === 'waiting' || status === undefined;
    });
    for (const tokenId of remaining) {
      try {
        await processFn(tokenId).catch(() => {});
      } catch (e) {
        console.error(`[runStreaming] 琛ュ厖澶勭悊 ${tokenId} 澶辫触:`, e);
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

      // 鑾峰彇杩炴帴妲戒綅鏉ラ檺鍒跺苟鍙戞暟锛坰kipSlot=true鏃剁敱澶栧眰婊氬姩鎵ц鎺у埗骞跺彂锛?      if (!skipSlot) {
        await waitForConnectionSlot(60000);
      }

      // 妫€鏌ョ幇鏈夎繛鎺ョ姸鎬?      const connection = tokenStore.wsConnections[tokenId];
      if (connection && connection.status === 'connected') {
        return true;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `馃攧 杩炴帴WebSocket: ${latestToken.name} (灏濊瘯 ${retryCount + 1}/${maxRetries})`,
        type: "info",
      });

      // 鍏堝叧闂彲鑳藉瓨鍦ㄧ殑鏃ц繛鎺?      if (connection) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `馃攲 鍏抽棴鏃ц繛鎺? ${latestToken.name}`,
          type: "info",
        });
        tokenStore.closeWebSocketConnection(tokenId);
        // 绛夊緟涓€灏忔鏃堕棿纭繚杩炴帴瀹屽叏鍏抽棴
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 鍒涘缓鏂扮殑WebSocket杩炴帴
      const wsClient = tokenStore.createWebSocketConnection(
        tokenId,
        latestToken.token,
        latestToken.wsUrl,
      );

      if (!wsClient) {
        throw new Error('鍒涘缓WebSocket瀹㈡埛绔け璐?);
      }

      // 绛夊緟杩炴帴寤虹珛
      const connected = await waitForConnection(tokenId);

      if (connected) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉁?WebSocket杩炴帴鎴愬姛: ${latestToken.name}`,
          type: "info",
        });

        // 杩炴帴鎴愬姛鍚庡欢杩?-5绉掞紝纭繚杩炴帴绋冲畾
        const connectionDelay = 3000 + Math.random() * 2000; // 3-5绉掗殢鏈哄欢杩?        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈴憋笍 绛夊緟杩炴帴绋冲畾 (${(connectionDelay / 1000).toFixed(1)}绉?...`,
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
            message: `鍒濆鍖栨暟鎹け璐? ${e.message}`,
            type: "warning",
          });
        }

        return true;
      }

      throw new Error('杩炴帴瓒呮椂');

    } catch (error) {
      lastError = error;
      retryCount++;
      
      // 閲婃斁杩炴帴妲戒綅
      if (!skipSlot) {
        releaseConnectionSlot();
      }
      
      // 鍏抽棴鍙兘瀛樺湪鐨勮繛鎺?      tokenStore.closeWebSocketConnection(tokenId);
      
      if (retryCount < maxRetries) {
        // 闃舵閫€閬匡細绗?娆＄瓑30绉掞紝绗?娆＄瓑1鍒嗛挓锛岀3娆＄瓑3鍒嗛挓
        let waitTime;
        if (retryCount === 1) {
          waitTime = 30000; // 绗竴娆￠噸璇曠瓑寰?0绉?        } else if (retryCount === 2) {
          waitTime = 60000; // 绗簩娆￠噸璇曠瓑寰?鍒嗛挓
        } else {
          waitTime = 180000; // 绗笁娆￠噸璇曠瓑寰?鍒嗛挓
        }
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈿狅笍 杩炴帴澶辫触锛?{waitTime >= 60000 ? (waitTime / 60000) + '鍒嗛挓' : (waitTime / 1000) + '绉?}鍚庨噸璇? ${error.message}`,
          type: "warning",
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 3娆￠噸璇曞叏閮ㄥけ璐ワ紝鐩存帴鍋滄
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉂?杩炴帴澶辫触锛屽凡閲嶈瘯${maxRetries}娆★紝鍋滄浠诲姟: ${error.message}`,
          type: "error",
        });
      }
    }
  }
  
  // 鎵€鏈夐噸璇曢兘澶辫触
  throw new Error(`WebSocket杩炴帴澶辫触: ${lastError?.message || '鏈煡閿欒'}`);
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
  // 寤惰繜閰嶇疆
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 鍔熻兘妯″潡寤惰繜閰嶇疆
  moduleDelays: batchSettings.moduleDelays,
  // 鑾峰彇妯″潡寤惰繜鐨勮緟鍔╁嚱鏁?  getModuleDelay: (moduleName) => {
    const md = batchSettings.moduleDelays;
    if (md) return md[moduleName] || md.default || batchSettings.taskDelay || 1000;
    return batchSettings.taskDelay || 1000;
  },
  // 鍏朵粬鐗瑰畾渚濊禆
  logs,
  logContainer,
  autoScrollLog,
  nextTick,
  shouldSendCar,
  canClaim,
  normalizeCars,
  gradeLabel,
  // 璁剧疆鐩稿叧
  currentSettings,
  helperSettings,
  // 鍔熸硶璧犻€佺浉鍏?  recipientIdInput,
  recipientInfo,
  securityPassword,

  // 绔炴妧鍦虹浉鍏宠緟鍔╁嚱鏁?  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 閰嶇疆鍔犺浇鍑芥暟
  loadSettings,
});

// 鍒濆鍖栦换鍔℃ā鍧?const tasksHangUp = createTasksHangUp(createTaskDeps());
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

// 鎺ㄥ浘鐘舵€佹娴嬩笌妯℃€佹
const showPushMapModal = ref(false);
const isAnyPushRunning = ref(false);
// 鎸佷箙鍖栨帹鍥鹃€変腑璐﹀彿锛堝垏鎹㈤〉闈㈠悗鎭㈠锛?const _savedPushTokens = localStorage.getItem('pushSelectedTokens');
const pushSelectedTokens = ref(_savedPushTokens ? JSON.parse(_savedPushTokens) : []);
// 鐩戝惉鍙樺寲鑷姩鎸佷箙鍖?watch(pushSelectedTokens, (v) => {
  localStorage.setItem('pushSelectedTokens', JSON.stringify(v));
}, { deep: true });
const pushTorchType = ref(0);
// 鍚屾鐏妸绫诲瀷鍒板叏灞€
watch(pushTorchType, (v) => { window._pushTorchType = v; }, { immediate: true });
const pushTorchCount = ref(10);
// 鍚屾鐏妸鏁伴噺鍒板叏灞€
watch(pushTorchCount, (v) => { window._pushTorchCount = v; }, { immediate: true });

// 鎵嬪姩浣跨敤鐏妸
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
const pushLogsCollapsed = ref(false);
let _pushCheckTimer = null;

// 璐﹀彿閫夐」锛堝彧鏄剧ず宸茶繛鎺ョ殑锛?const pushTokenOptions = computed(() => {
  const tkList = tokens.value;
  if (!tkList || !Array.isArray(tkList)) return [];
  return tkList.map(t => {
    const st = tokenStore.getWebSocketStatus(t.id);
    const tag = st === "connected" ? " 鉁? : st === "connecting" ? " 鈴? : " 鈿?;
    return { label: (t.name || t.id) + tag, value: t.id };
  });
});

// 鎵撳紑鎺ㄥ浘妯℃€佹鏃惰嚜鍔ㄦ仮澶嶇姸鎬?watch(showPushMapModal, (v) => {
  if (v) {
    // 鎭㈠姝ｅ湪杩愯鐨勬帹鍥剧姸鎬?    if (window._pt) {
      const runningIds = Object.keys(window._pt).filter(id => window._pt[id] && window._pt[id].running);
      if (runningIds.length > 0) {
        // 鍚堝苟宸茶繍琛岀殑Token鍒伴€変腑鍒楄〃
        const merged = new Set([...pushSelectedTokens.value, ...runningIds]);
        pushSelectedTokens.value = [...merged];
      }
    }
    // 濡傛灉娌℃湁閫変腑涓斿叏灞€鏈夐€変腑Token锛屼娇鐢ㄥ叏灞€鐨?    if (!pushSelectedTokens.value.length && selectedTokens.value?.length) {
      pushSelectedTokens.value = [...selectedTokens.value];
    }
  }
});

// 鎺ㄥ浘鏃ュ織鍥炶皟锛堢敱tasksItem.js鐨刾ushLoop璋冪敤锛?window._pushLog = (msg, type) => {
  pushLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    text: msg,
    type: type || "info",
  });
  if (pushLogs.value.length > 300) pushLogs.value.length = 300;
};

// 鎵撳紑妯℃€佹鍥炶皟
window._openPushModal = () => {
  showPushMapModal.value = true;
};

// 鍒锋柊鍗＄墖鐘舵€?const _refreshPushCards = () => {
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

// 瀹氭椂鍒锋柊鐘舵€?const _startPushCheck = () => {
  if (_pushCheckTimer) return;
  _pushCheckTimer = setInterval(() => {
    if (!window._pt) { isAnyPushRunning.value = false; return; }
    isAnyPushRunning.value = pushSelectedTokens.value.some(id => window._pt[id] && window._pt[id].running);
    if (showPushMapModal.value) _refreshPushCards();
  }, 1500);
};
_startPushCheck();

// 鍏ㄩ儴寮€濮嬶紙閿欏紑鍚姩閬垮厤闄愭祦锛氭瘡涓处鍙烽棿闅?绉?+ 闅忔満寤惰繜锛?const pushStartAll = async () => {
  const ids = pushSelectedTokens.value;
  if (!ids || !ids.length) return;
  if (!window._pt) window._pt = {};
  if (window._bpLoadBossData) await window._bpLoadBossData();

  // 浣跨敤_bpStartOne锛堝唴鍚嚜鍔ㄨ繛鎺ラ€昏緫锛夛紝閿欏紑鍚姩閬垮厤鐬椂骞跺彂
  if (window._bpStartOne) {
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      if (!window._pt || !window._pt[id] || !window._pt[id].running) {
        window._bpStartOne(id);
        // 鍩虹闂撮殧3绉?+ 闅忔満寤惰繜0~2绉掞紝閿欏紑姣忎釜璐﹀彿鐨勬墽琛?        const staggerDelay = 3000 + Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, staggerDelay));
      }
    }
  }
};

// 鍏ㄩ儴鍋滄
const pushStopAll = (stopAll = false) => {
  if (!window._pt) return;
  // stopAll=true 鏃讹紙瀹氭椂瑙﹀彂锛夛細鍋滄鎵€鏈夋鍦ㄨ繍琛岀殑璐﹀彿锛岃€屼笉浠呴檺浜庡凡鍕鹃€夐」
  // stopAll=false 鏃讹紙鎸夐挳鎵嬪姩锛夛細鍙仠姝?pushSelectedTokens 涓殑璐﹀彿
  const ids = stopAll
    ? Object.keys(window._pt).filter(id => window._pt[id]?.running)
    : (pushSelectedTokens.value || []);
  if (!ids.length) return;
  ids.forEach(id => {
    if (window._bpStopOne) window._bpStopOne(id);
    else if (window._pt[id]) window._pt[id].stopFlag = true;
  });
  if (stopAll && ids.length) {
    console.log(`[瀹氭椂鍋滄] 宸插悜 ${ids.length} 涓处鍙峰彂閫佸仠姝㈡寚浠);
  }
};

// ===================== 瀹氭椂鎺у埗妯″潡 =====================
const pushTimerExpanded = ref(false);

// 鏃堕棿鍊硷紙姣鏃堕棿鎴筹紝鍙彇鏃跺垎锛宯-time-picker 杩斿洖褰撳ぉ鐨?ms 鏃堕棿鎴筹級
const pushStartTime = ref(null);
const pushStopTime  = ref(null);

// 瀹氭椂鍣ㄥ彞鏌?const pushStartTimer = ref(null);   // setInterval 鍙ユ焺
const pushStopTimer  = ref(null);

// 鍊掕鏃舵樉绀?const pushTimerCountdown = ref('');
let _pushCountdownInterval = null;

// 鐘舵€侊細idle / running锛堟湁浠绘剰瀹氭椂鍣ㄦ縺娲诲氨鏄?running锛?const pushTimerStatus = computed(() =>
  (pushStartTimer.value || pushStopTimer.value) ? 'running' : 'idle'
);

// 鏃堕棿閫夐」锛堟暣鐐瑰垎閽燂紝姣?0鍒嗛挓涓€妗ｏ級
const pushTimeHours   = Array.from({ length: 24 }, (_, i) => i);
const pushTimeMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** 鎶?n-time-picker 杩斿洖鐨?ms 鏃堕棿鎴宠浆鎴愭湰鍦?HH:mm锛堢敤 Date 鏈湴鏂规硶锛岄伩鍏嶆椂鍖哄亸绉伙級 */
const msToHHMM = (ms) => {
  if (ms == null) return '';
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const pushStartTimeLabel = computed(() => msToHHMM(pushStartTime.value));
const pushStopTimeLabel  = computed(() => msToHHMM(pushStopTime.value));

/** 璁＄畻璺濈鐩爣鏃堕棿杩樻湁澶氬皯 ms锛堝潎鐢ㄦ湰鍦版椂闂村姣旓級 */
const msUntilTarget = (targetMs) => {
  const now = new Date();
  // targetMs 鏄?n-time-picker 杩斿洖鐨勬湰鍦版椂闂存埑锛屽彇鍏舵湰鍦版椂鍒嗙
  const t = new Date(targetMs);
  const targetSec = t.getHours() * 3600 + t.getMinutes() * 60;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let diff = (targetSec - nowSec) * 1000;
  if (diff <= 0) diff += 24 * 3600 * 1000;  // 璺ㄦ棩
  return diff;
};

/** 鏍煎紡鍖栧€掕鏃?*/
const formatCountdown = (ms) => {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2,'0')}s`;
  return `${s}s`;
};

/** 鏇存柊鍊掕鏃舵枃瀛楋紙姣忕鍒锋柊锛屾樉绀烘渶杩戣Е鍙戠殑閭ｄ釜锛?*/
const _updateCountdown = () => {
  const targets = [];
  if (pushStartTimer.value && pushStartTime.value != null)
    targets.push({ label: '寮€濮?, ms: msUntilTarget(pushStartTime.value) });
  if (pushStopTimer.value && pushStopTime.value != null)
    targets.push({ label: '鍋滄', ms: msUntilTarget(pushStopTime.value) });
  if (!targets.length) { pushTimerCountdown.value = ''; return; }
  targets.sort((a, b) => a.ms - b.ms);
  const nearest = targets[0];
  pushTimerCountdown.value = `${nearest.label} ${formatCountdown(nearest.ms)}`;
};

/** 鍚姩/鍙栨秷 寮€濮嬪畾鏃?*/
/** 鍐呴儴锛氭敞鍐屼笅涓€娆″紑濮嬪畾鏃讹紙姣忓ぉ寰幆锛?*/
const _scheduleNextStart = () => {
  if (pushStartTime.value == null) return;
  const delay = msUntilTarget(pushStartTime.value);
  pushStartTimer.value = setTimeout(async () => {
    window.$message?.success(`瀹氭椂瑙﹀彂锛氳嚜鍔ㄥ紑濮嬫帹鍥綻);
    await pushStartAll();
    _scheduleNextStart();   // 寰幆锛氭敞鍐屾槑澶╁悓涓€鏃跺埢
    _updateCountdown();
  }, delay);
};

/** 鍐呴儴锛氭敞鍐屼笅涓€娆″仠姝㈠畾鏃讹紙姣忓ぉ寰幆锛?*/
const _scheduleNextStop = () => {
  if (pushStopTime.value == null) return;
  const delay = msUntilTarget(pushStopTime.value);
  pushStopTimer.value = setTimeout(() => {
    window.$message?.warning(`瀹氭椂瑙﹀彂锛氳嚜鍔ㄥ仠姝㈡帹鍥綻);
    pushStopAll(true);      // 鍋滄鎵€鏈夋鍦ㄨ繍琛岀殑璐﹀彿
    _scheduleNextStop();    // 寰幆锛氭敞鍐屾槑澶╁悓涓€鏃跺埢
    _updateCountdown();
  }, delay);
};

/** 鍚姩/鍙栨秷 寮€濮嬪畾鏃?*/
const togglePushStartTimer = () => {
  if (pushStartTimer.value) {
    clearTimeout(pushStartTimer.value);
    pushStartTimer.value = null;
    window.$message?.info('宸插彇娑堣嚜鍔ㄥ紑濮嬪畾鏃?);
    _updateCountdown();
    return;
  }
  if (pushStartTime.value == null) return;
  _scheduleNextStart();
  const delay = msUntilTarget(pushStartTime.value);
  window.$message?.success(`宸茶缃?${pushStartTimeLabel.value} 姣忓ぉ鑷姩寮€濮嬫帹鍥撅紙${formatCountdown(delay)}鍚庨娆¤Е鍙戯級`);
  _updateCountdown();
};

/** 鍚姩/鍙栨秷 鍋滄瀹氭椂 */
const togglePushStopTimer = () => {
  if (pushStopTimer.value) {
    clearTimeout(pushStopTimer.value);
    pushStopTimer.value = null;
    window.$message?.info('宸插彇娑堣嚜鍔ㄥ仠姝㈠畾鏃?);
    _updateCountdown();
    return;
  }
  if (pushStopTime.value == null) return;
  _scheduleNextStop();
  const delay = msUntilTarget(pushStopTime.value);
  window.$message?.success(`宸茶缃?${pushStopTimeLabel.value} 姣忓ぉ鑷姩鍋滄鎺ㄥ浘锛?{formatCountdown(delay)}鍚庨娆¤Е鍙戯級`);
  _updateCountdown();
};

// 姣忕鍒锋柊鍊掕鏃?_pushCountdownInterval = setInterval(_updateCountdown, 1000);

// 瀹氭椂鍣ㄤ笌寮圭獥鐢熷懡鍛ㄦ湡鏃犲叧锛屽叧闂脊绐楀悗浠嶇户缁€掕锛屽埌鏃惰嚜鍔ㄨЕ鍙戞帹鍥惧紑濮?鍋滄
// ===================== 瀹氭椂鎺у埗妯″潡 END =====================

// 鍏ㄩ€?鍙栨秷鍏ㄩ€?const pushSelectAll = () => {
  const allIds = pushTokenOptions.value.map(o => o.value);
  pushSelectedTokens.value = [...allIds];
};
const pushClearAll = () => {
  pushSelectedTokens.value = [];
};

// 鏍囩寮忚处鍙烽€夋嫨鍣細鎼滅储銆佽繃婊ゃ€佸垏鎹€佹樉绀哄悕
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
const getTokenDisplayName = (tokenId) => {
  const opt = pushTokenOptions.value.find(o => o.value === tokenId);
  return opt ? opt.label.replace(/[鉁呪彸鈿猐/g, '').trim() : tokenId.slice(0, 8);
};

// 鍗曚釜鍒囨崲
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
const { legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, manual_buy, collection_exchange, charge_claimaddup_rewards, collection_claimfreereward, claim_recruit_welfare, claim_weird_tower_all, claim_weird_tower_pass, use_spotted_egg, claim_pet_book, batch_pet_merge, batch_pet_upgrade, gacha_drawreward, store_buy_bronze, store_buy_platinum, store_buy_gold_rod, store_buy_jade, store_buy_selectable, batchCollectionExchange, legion_buy_red_jade, legion_buy_spotted_egg, salt_crystal_shop_buy, saltCrystalShopConfig, salt_ingot_shop_buy, saltIngotShopConfig, star_drawturntable, batch_star_challenge, nightmare_draw_lottery, nightmare_claim_book_reward, pkroom_appoint, claim_guess_coin, legion_buy_store_items, weeklyMarketBuy, weekly_market_free_gift, buy_top_rod_package, buy_super_spirit_shell, batch_mail_claim_and_cleanup } = tasksStore;

// ====== 閲囪喘娓呭崟閰嶇疆 ======
// 閲囪喘娓呭崟鍙€夐」锛堢敤浜庝换鍔℃ā鏉夸腑澶氶€夛級
// goodsId: store_buy 浣跨敤鐨勫晢鍝両D锛堜粠 store_goodslist 鑾峰彇锛?// itemId: 閲囪喘娓呭崟浣跨敤鐨勭墿鍝両D锛堢敤浜?store_setpurchase锛?const purchaseItemOptions = [
  // 瀹濈绫?  { goodsId: 1, itemId: 2002, name: '闈掗摐瀹濈' },
  { goodsId: 2, itemId: 2003, name: '榛勯噾瀹濈' },
  { goodsId: 3, itemId: 2004, name: '閾傞噾瀹濈' },
  // 鏉愭枡绫?  { goodsId: 4, itemId: 1003, name: '杩涢樁鐭? },
  { goodsId: 5, itemId: 1006, name: '绮鹃搧' },
  { goodsId: 6, itemId: 1001, name: '鎷涘嫙浠? },
  // 姝﹀皢纰庣墖绫?  { goodsId: 7, itemId: 3007, name: '闅忔満绾㈠皢纰庣墖' },
  { goodsId: 8, itemId: 3006, name: '闅忔満姗欏皢纰庣墖' },
  { goodsId: 9, itemId: 3005, name: '闅忔満绱皢纰庣墖' },
  // 鐗规畩绫?  { goodsId: 10, itemId: 1016, name: '姊﹂瓏鏅剁煶' },
  // 楸肩绫?  { goodsId: 11, itemId: 1011, name: '鏅€氶奔绔? },
  { goodsId: 12, itemId: 1012, name: '榛勯噾楸肩' },
  // 娲诲姩绫?  { goodsId: 13, itemId: 1030, name: '鍜哥闂ㄧエ' },
  // 鐜夌煶绫?  { goodsId: 14, itemId: 1022, name: '鐧界帀' },
  { goodsId: 15, itemId: 1023, name: '褰╃帀' },
  // 鏉愭枡绫?  { goodsId: 16, itemId: 1026, name: '鎵虫墜' },
];

// 澶氶€夎喘涔?Modal State
const showManualBuyModal = ref(false);
const manualBuyConfig = ref([]);

// 鐝嶅疂闃佸晢搴楄喘涔?Modal State
const showCollectionExchangeModal = ref(false);
const collectionExchangeConfig = ref([]);

// 鐝嶅疂闃佸晢搴楀晢鍝侀€夐」锛坓oodsId/闄愯喘娆℃暟锛?const collectionExchangeItemOptions = [
  { label: "閾傞噾瀹濈", value: 7001, maxCount: 3 },
  { label: "鍐涘洟甯?, value: 4001, maxCount: 2 },
  { label: "鎷涘嫙浠?, value: 5001, maxCount: 1 },
  { label: "涓囪兘绾㈠皢纰庣墖", value: 6001, maxCount: 10 },
];

// 榛戝競澶氶€夎喘涔扮綉鏍煎垪鏁帮紙鎵嬫満绔?鍒楋紝妗岄潰绔?鍒楋級
const gridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

// 瀹氭椂浠诲姟寮圭獥缃戞牸鍒楁暟锛堟墜鏈虹1鍒楋紝妗岄潰绔?鍒楋級
const taskGridCols = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) return 1;
  return 2;
});

const openManualBuyModal = () => {
  // 浠庡凡淇濆瓨鐨勯厤缃仮澶嶅嬀閫夌姸鎬?  const savedItems = batchSettings.manualBuyItems || [];
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
    message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
    return;
  }
  
  // 淇濆瓨閰嶇疆鍒?batchSettings锛屼緵瀹氭椂浠诲姟浣跨敤
  batchSettings.manualBuyItems = selectedItems;
  saveBatchSettings();
  
  showManualBuyModal.value = false;
  store_buy_selectable(selectedItems);
};

const openCollectionExchangeModal = () => {
  // 浠庡凡淇濆瓨鐨勯厤缃仮澶嶅嬀閫夌姸鎬?  const savedItems = batchSettings.collectionExchangeItems || [];
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
    message.warning("璇疯嚦灏戦€夋嫨涓€涓晢鍝?);
    return;
  }
  
  // 淇濆瓨閰嶇疆鍒?batchSettings锛屼緵瀹氭椂浠诲姟浣跨敤
  batchSettings.collectionExchangeItems = selectedItems;
  saveBatchSettings();
  
  showCollectionExchangeModal.value = false;
  batchCollectionExchange(selectedItems);
};

// 閲囪喘娓呭崟 checkbox 鍒囨崲杈呭姪鍑芥暟
const togglePurchaseItem = (arr, discounts, itemId) => {
  const idx = arr.indexOf(itemId);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(itemId);
    // 鍕鹃€夋椂纭繚鎶樻墸鍊煎瓨鍦?    if (!discounts) discounts = {};
    if (discounts[itemId] == null) discounts[itemId] = 10;
  }
};

// 纭繚閲囪喘娓呭崟鎶樻墸鍏ㄩ儴鍒濆鍖栵紙杩斿洖鏂板璞¤Е鍙戝搷搴斿紡鏇存柊锛?const initPurchaseDiscounts = (discounts) => {
  const result = { ...(discounts || {}) };
  purchaseItemOptions.forEach(item => {
    if (result[item.goodsId] == null) result[item.goodsId] = 10;
  });
  return result;
};

// 鑾峰彇鎶樻墸鍊硷紙濮嬬粓杩斿洖鏁板瓧锛岄伩鍏?undefined 瀵艰嚧 n-input-number 鏄剧ず绌虹櫧锛?const getDiscount = (discounts, itemId) => {
  return discounts?.[itemId] ?? 10;
};

// 璁剧疆鎶樻墸鍊硷紙鏄惧紡璧嬪€肩‘淇濆搷搴斿紡鏇存柊锛?const setDiscount = (discounts, itemId, val) => {
  const num = (val != null && val !== '') ? Number(val) : 10;
  discounts[itemId] = Math.max(1, Math.min(10, isNaN(num) ? 10 : num));
};

// 鍚屾閲囪喘娓呭崟鍒版父鎴?const syncPurchaseBusy = ref(false);
const syncPurchaseToGame = async () => {
  const tokenId = currentSettingsTokenId.value;
  if (!tokenId) return;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    message.warning('璇ヨ处鍙稺ebSocket鏈繛鎺ワ紝璇峰厛杩炴帴鍚庡啀鍚屾');
    return;
  }
  const purchaseList = currentSettings.purchaseList || [];
  if (purchaseList.length === 0) {
    message.warning('璇峰厛鍕鹃€夐噰璐晢鍝?);
    return;
  }
  syncPurchaseBusy.value = true;
  try {
    const discounts = currentSettings.purchaseDiscounts || {};
    const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
    const purchaseCnt = currentSettings.purchaseCnt ?? 15;
    await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
    message.success(`閲囪喘娓呭崟宸插悓姝ュ埌娓告垙 (${purchaseItemList.length}椤? 娆℃暟${purchaseCnt})`);
  } catch (e) {
    message.error(`鍚屾澶辫触: ${e.message}`);
  } finally {
    syncPurchaseBusy.value = false;
  }
};

// 鍚屾閲囪喘娓呭崟鍒板嬀閫夌殑璐﹀彿锛堣嚜鍔ㄨ繛鎺ワ級
const batchSyncPurchaseToGame = async () => {
  if (selectedTokens.value.length === 0) return;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const tokenId of selectedTokens.value) {
    if (shouldStop.value) break;
    const token = tokens.value.find(t => t.id === tokenId);
    if (!token) continue;

    // 璇诲彇璇ヨ处鍙风殑鏃ュ父璁剧疆
    let settings = null;
    try {
      const raw = localStorage.getItem(`daily-settings:${tokenId}`);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}

    const purchaseList = settings?.purchaseList || [];
    if (purchaseList.length === 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 鏈厤缃噰璐竻鍗曪紝璺宠繃`, type: "info" });
      skipCount++;
      continue;
    }

    try {
      // 鑷姩杩炴帴
      await ensureConnection(tokenId);
      await new Promise(r => setTimeout(r, 2000));

      const discounts = settings.purchaseDiscounts || {};
      const purchaseItemList = purchaseList.map(id => ({ itemId: id, discount: discounts[id] ?? 10 }));
      const purchaseCnt = settings.purchaseCnt ?? 15;
      await tokenStore.sendMessageWithPromise(tokenId, 'store_setpurchase', { purchaseItemList, purchaseCnt }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲囪喘娓呭崟鍚屾鎴愬姛 (${purchaseItemList.length}椤? 娆℃暟${purchaseCnt})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲囪喘娓呭崟鍚屾澶辫触: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 杩炴帴宸插叧闂?(闃熷垪: ${connectionQueue.active}/${batchSettings.maxActive})`, type: "info" });
    }
  }

  const summary = `鍚屾瀹屾垚: 鎴愬姛${successCount}涓? 璺宠繃${skipCount}涓? 澶辫触${failCount}涓猔;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
};

// ====== 鎵归噺閲囪喘娓呭崟閰嶇疆寮圭獥 ======
const showBatchPurchaseConfigModal = ref(false);
const batchPurchaseList = ref([]);
const batchPurchaseDiscounts = ref({});
const batchPurchaseCnt = ref(15);
const batchPurchaseSyncing = ref(false);

// 鎵撳紑寮圭獥锛氫粠绗竴涓嬀閫夎处鍙疯鍙栫幇鏈夐厤缃綔涓洪粯璁ゅ€?const openBatchPurchaseConfig = () => {
  if (selectedTokens.value.length === 0) {
    message.warning('璇峰厛鍕鹃€夎处鍙?);
    return;
  }
  // 浠庣涓€涓处鍙疯鍙栫幇鏈夐厤缃?  const firstTokenId = selectedTokens.value[0];
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

// 淇濆瓨骞跺悓姝ラ噰璐竻鍗曞埌鎵€鏈夊嬀閫夎处鍙?const applyBatchPurchaseConfig = async () => {
  if (batchPurchaseList.value.length === 0) {
    message.warning('璇峰厛鍕鹃€夎嚦灏戜竴涓噰璐晢鍝?);
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

    // 1. 淇濆瓨鍒拌璐﹀彿鐨?localStorage
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
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 淇濆瓨閲囪喘娓呭崟鍒版湰鍦板け璐? ${e.message}`, type: "warning" });
    }

    // 2. 鑷姩杩炴帴骞跺悓姝ュ埌娓告垙
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
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲囪喘娓呭崟鍚屾鎴愬姛 (${purchaseItemList.length}椤? 娆℃暟${batchPurchaseCnt.value})`, type: "success" });
      successCount++;
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 閲囪喘娓呭崟鍚屾澶辫触: ${e.message}`, type: "error" });
      failCount++;
    } finally {
      tokenStore.closeWebSocketConnection(tokenId);
      releaseConnectionSlot();
    }
  }

  const summary = `閲囪喘娓呭崟鍚屾瀹屾垚: 鎴愬姛${successCount}涓? 澶辫触${failCount}涓猔;
  addLog({ time: new Date().toLocaleTimeString(), message: `=== ${summary} ===`, type: "info" });
  message.success(summary);
  batchPurchaseSyncing.value = false;
};

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyHangup, batchLegacyGiftSendEnhanced, batchLegacyClaimGiftTask } = tasksLegacy;

// ====== 鍗佹闃€缃楁寫鎴橈紙寮圭獥鎵撳紑缁勯槦鐣岄潰锛?======
const showNightmareChallengeModal = ref(false);
const showStarTeamModal = ref(false);
const batchNightmareChallenge = async () => {
  // 褰撴湭鍕鹃€夎处鍙锋椂鐩存帴鎵撳紑寮圭獥锛岀敱鍗佹鍗＄墖鍐呯殑闃熼暱涓嬫媺妗嗛€夋嫨闃熼暱
  if (selectedTokens.value.length === 0) {
    showNightmareChallengeModal.value = true;
    return;
  }
  // 鍕鹃€変簡澶氫釜璐﹀彿鏃舵彁绀哄彧閫変竴涓?  if (selectedTokens.value.length > 1) { message.warning("璇峰彧閫夋嫨涓€涓槦闀挎墽琛?); return; }
  const tokenId = selectedTokens.value[0];
  // 鑷姩杩炴帴
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    tokenStore.selectToken(tokenId, true);
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 30) {
      await new Promise((r) => setTimeout(r, 500)); retries++;
    }
  }
  if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
    message.error("WebSocket杩炴帴澶辫触锛屾棤娉曟墦寮€鍗佹鎸戞垬");
    return;
  }
  // 鏍规嵁璐﹀彿璁剧疆鑷姩鍒囨崲鍗佹闃靛
  try {
    const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      const nmFormation = settings.nightmareFormation;
      if (nmFormation && nmFormation >= 1 && nmFormation <= 6) {
        await tokenStore.sendMessageWithPromise(
          tokenId, 'presetteam_saveteam',
          { teamId: nmFormation }, 8000);
        message.success(`宸插垏鎹㈠埌鍗佹闃靛${nmFormation}`);
      }
    }
  } catch (err) {
    // 鍒囨崲澶辫触涓嶉樆濉烇紝闈欓粯澶勭悊
    console.warn('鍗佹闃靛鍒囨崲澶辫触:', err);
  }
  // 鎵撳紑缁勯槦寮圭獥
  showNightmareChallengeModal.value = true;
};

// ====== 瀹氭椂浠诲姟锛氬崄娈块槑缃楁寫鎴橈紙鏍规嵁鍕鹃€夐璁炬墽琛岋級 ======
const batchNightmareChallengePresets = async (silent) => {
  // silent 鍙傛暟鍏煎瀹氭椂浠诲姟璋冪敤锛屾澶勪笉浣跨敤
  const nmTask = currentScheduledTask;
  const presetIds = nmTask?.nightmarePresetIds || [];
  if (presetIds.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '鍗佹鎸戞垬锛氭湭閰嶇疆棰勮锛岃烦杩?, type: 'warning' });
    return;
  }

  // 鍔犺浇鍏ㄩ儴棰勮
  let allPresets = [];
  try {
    const raw = localStorage.getItem('nightmare-presets');
    allPresets = raw ? JSON.parse(raw) : [];
  } catch { allPresets = []; }

  // 杩囨护鍑洪€変腑鐨勯璁?  const presets = allPresets.filter(p => presetIds.includes(p.id));
  if (presets.length === 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: '鍗佹鎸戞垬锛氶€変腑鐨勯璁句笉瀛樺湪锛岃烦杩?, type: 'warning' });
    return;
  }

  addLog({ time: new Date().toLocaleTimeString(), message: `=== 鍗佹闃庣綏鎸戞垬锛氬紑濮嬫墽琛?${presets.length} 涓璁?===`, type: 'info' });

  // 鏋勫缓闃熷憳浣跨敤璁℃暟锛堢敤浜庡叡浜槦鍛樻娴?+ 寤惰繜鏂繛锛?  const memberUsageCount = new Map(); // tokenId 鈫?浣跨敤璇ラ槦鍛樼殑棰勮鏁伴噺
  const memberLastPresetIndex = new Map(); // tokenId 鈫?鏈€鍚庝娇鐢ㄨ闃熷憳鐨勯璁剧储寮?  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const allIds = [p.captainTokenId, ...(p.memberTokenIds || [])].filter(Boolean);
    for (const tid of allIds) {
      memberUsageCount.set(tid, (memberUsageCount.get(tid) || 0) + 1);
      memberLastPresetIndex.set(tid, idx); // 涓嶆柇鏇存柊锛屾渶缁堝€间负鏈€鍚庝娇鐢ㄧ殑绱㈠紩
    }
  }

  // 妫€娴嬪叡浜槦闀匡紙涓ラ噸鍐茬獊锛?  const captainIds = presets.map(p => p.captainTokenId).filter(Boolean);
  const duplicateCaptains = captainIds.filter((id, i) => captainIds.indexOf(id) !== i);
  if (duplicateCaptains.length > 0) {
    const names = [...new Set(duplicateCaptains)].map(id => tokenStore.gameTokens.find(t => t.id === id)?.name || id.slice(0, 8));
    addLog({ time: new Date().toLocaleTimeString(), message: `鈿狅笍 澶氫釜棰勮浣跨敤鐩稿悓闃熼暱: ${names.join('銆?)}锛屽悗缁璁惧皢鑷姩璺宠繃`, type: 'warning' });
  }

  // 鏀堕泦闇€瑕佽烦杩囩殑閲嶅闃熼暱棰勮绱㈠紩锛堜粎淇濈暀绗竴涓紝璺宠繃鍚庣画锛?  const skipDuplicateCaptainPresets = new Set();
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

  // 妫€娴嬪叡浜槦鍛橈紙鍙兘瀵艰嚧鍓嶉璁炬垬鏂楀紓甯革級
  const sharedMembers = [...memberUsageCount.entries()]
    .filter(([tid, count]) => count > 1 && !duplicateCaptains.includes(tid))
    .map(([tid]) => tokenStore.gameTokens.find(t => t.id === tid)?.name || tid.slice(0, 8));
  if (sharedMembers.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `鈿狅笍 浠ヤ笅闃熷憳琚涓璁惧叡浜? ${sharedMembers.join('銆?)}锛屽姞鍏ユ柊鎴块棿鍚庡彲鑳戒粠鍓嶄竴涓埧闂磋绉婚櫎`, type: 'warning' });
  }

  // 杈撳嚭棰勮姒傝
  for (let idx = 0; idx < presets.length; idx++) {
    const p = presets[idx];
    const capName = tokenStore.gameTokens.find(t => t.id === p.captainTokenId)?.name || '鏈煡';
    const memberNames = (p.memberTokenIds || []).map(mid => tokenStore.gameTokens.find(t => t.id === mid)?.name || mid.slice(0, 8)).join('銆?) || '鏃?;
    const totalCount = (p.captainTokenId ? 1 : 0) + (p.memberTokenIds || []).length;
    addLog({ time: new Date().toLocaleTimeString(), message: `  棰勮${idx + 1}:銆?{p.name || '鏈懡鍚?}銆嶐煈?{capName} 馃懃${totalCount}浜?闃熷憳: ${memberNames})`, type: 'info' });
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const activeBattles = [];
  _activeNightmareBattles = activeBattles; // 鉁?鏆撮湶缁欐ā鍧楃骇锛屼究浜庡灞傝秴鏃朵紶瀵煎仠姝?  const MAX_RETRY = 2; // 姣忎釜棰勮鏈€澶氶噸璇?娆?  const retryCountMap = new Map(); // presetId 鈫?閲嶈瘯娆℃暟

  // ====== 璺ㄦ爣绛鹃〉鍗忚皟鏈哄埗 ======
  const getTabId = () => {
    if (!window.__nightmareTabId) {
      window.__nightmareTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    return window.__nightmareTabId;
  };

  const isPresetRunningInOtherTab = (presetId) => {
    try {
      const key = `nightmare-running-${presetId}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (!data.tabId || !data.timestamp) return false;
      if (Date.now() - data.timestamp > 10 * 60 * 1000) {
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

  // 鍒濆鍖?sessionStorage锛堟竻闄や笂娆＄殑鎵归噺鏁版嵁锛?  try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }

  // ====== 鍗曢璁炬墽琛屽嚱鏁帮紙鍒濆鎵ц鍜岄噸璇曞叡鐢級 ======
  const executeOnePreset = async (preset, label, presetIndex = -1) => {
    const captainTokenId = preset.captainTokenId;
    const captainToken = tokenStore.gameTokens.find(t => t.id === captainTokenId);
    if (!captainToken) {
      addLog({ time: new Date().toLocaleTimeString(), message: `棰勮銆?{preset.name}銆嶉槦闀縏oken涓嶅瓨鍦紝璺宠繃`, type: 'warning' });
      return null;
    }

    // 闃叉璺ㄦ爣绛鹃〉閲嶅鍚姩
    if (isPresetRunningInOtherTab(preset.id)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `棰勮銆?{preset.name}銆嶅湪鍏朵粬鏍囩椤佃繍琛屼腑锛岃烦杩嘸, type: 'warning' });
      return null;
    }

    // 鏍囪涓鸿繍琛屼腑锛堣法鏍囩椤靛崗璋冿級
    markPresetRunning(preset.id);

    addLog({ time: new Date().toLocaleTimeString(), message: `鈻?${label} 闃熼暱: ${captainToken.name}`, type: 'info' });

    // 1. 纭繚闃熼暱杩炴帴
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `杩炴帴闃熼暱 ${captainToken.name}...`, type: 'info' });
      await tokenStore.createWebSocketConnection(captainTokenId, captainToken.token, captainToken.wsUrl || null);
      let retries = 0;
      while (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected' && retries < 30) {
        await delay(1000);
        retries++;
      }
    }
    if (tokenStore.getWebSocketStatus(captainTokenId) !== 'connected') {
      addLog({ time: new Date().toLocaleTimeString(), message: `闃熼暱 ${captainToken.name} 杩炴帴澶辫触锛岃烦杩囬璁綻, type: 'error' });
      return null;
    }

    // 2. 鑾峰彇闃熼暱 roleId
    let captainRoleId = '';
    try {
      const roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId, {});
      captainRoleId = String(roleInfo?.role?.roleId || '');
      if (!captainRoleId) {
        addLog({ time: new Date().toLocaleTimeString(), message: `鑾峰彇闃熼暱 roleId 澶辫触锛岃烦杩囬璁綻, type: 'error' });
        return null;
      }
    } catch (err) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鑾峰彇闃熼暱 roleId 寮傚父: ${err.message || err}锛岃烦杩嘸, type: 'error' });
      return null;
    }

    // 3. 妫€鏌ョ幇鏈夐槦浼嶅拰鎴樻枟鎴块棿
    let teamId = '';
    let hasActiveBattle = false;
    let existingRoomId = null;

    // 3a. 鍏堟鏌ユ槸鍚﹀凡鏈夋椿璺冨悗鍙版垬鏂楋紙闃叉閲嶅鍚姩鍚屼竴闃熼暱鐨勬垬鏂楋級
    const alreadyRunning = activeBattles.find(b =>
      b.preset.captainTokenId === captainTokenId &&
      (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')
    );
    if (alreadyRunning) {
      addLog({ time: new Date().toLocaleTimeString(), message: `闃熼暱 ${captainToken.name} 宸叉湁鍚庡彴鎴樻枟銆?{alreadyRunning.preset.name}銆嶈繍琛屼腑锛岃烦杩嘸, type: 'warning' });
      return null;
    }

    // 3b. 鏌ヨ闃熼暱鏄惁鏈夐槦浼?    let existingTeamId = null;
    try {
      const roleTeamRes = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'matchteam_getroleteaminfo',
        { roleID: Number(captainRoleId) }, 10000
      );
      existingTeamId = roleTeamRes?.teamInfo?.teamId;
    } catch { /* 鏃犻槦浼?*/ }

    // 3c. 鐙珛妫€鏌ユ槸鍚︽湁杩涜涓殑鎴樻枟鎴块棿锛堟棤璁烘槸鍚︽湁闃熶紞锛?    try {
      const nightResp = await tokenStore.sendMessageWithPromise(
        captainTokenId, 'nightmare_getroleinfo',
        { roleId: Number(captainRoleId) }, 10000
      );
      existingRoomId = nightResp?.nightMareData?.roomId
        || nightResp?.nightmareData?.roomId
        || nightResp?.roomId
        || nightResp?.roomid
        || null;
    } catch { /* 娌℃湁鎴樻枟鎴块棿 */ }

    if (existingRoomId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鉁?鍙戠幇杩涜涓殑鎴樻枟 RoomId: ${existingRoomId}锛屾帴绠＄户缁寫鎴榒, type: 'success' });
      teamId = existingTeamId ? String(existingTeamId) : '';
      hasActiveBattle = true;
    } else if (existingTeamId) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鍙戠幇杩囨湡娈嬬暀闃熶紞 TeamId: ${existingTeamId}锛屾鍦ㄨВ鏁?..`, type: 'warning' });
      try {
        await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_dismiss',
          { teamId: Number(existingTeamId) }, 10000
        );
        addLog({ time: new Date().toLocaleTimeString(), message: '娈嬬暀闃熶紞宸茶В鏁?, type: 'success' });
      } catch (dismissErr) {
        const errMsg = dismissErr.message || String(dismissErr);
        if (!errMsg.includes('200020') && !errMsg.includes('6100020')) {
          addLog({ time: new Date().toLocaleTimeString(), message: `瑙ｆ暎澶辫触: ${errMsg}锛岃烦杩嘸, type: 'error' });
          return null;
        }
      }
      await delay(1000);
    }

    // 4. 鍒涘缓鎴块棿锛堝鏋滄病鏈夋椿璺冩垬鏂楋級
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
            setting: { name: '鍗佹鍏堥攱闃?, notice: '', secret: 1, apply: 0, applyList: [] },
            param: 0, custom: {}, extParam: 0,
          }, 10000
        );
        teamId = String(createResp?.teamInfo?.teamId || '');
        if (!teamId) {
          addLog({ time: new Date().toLocaleTimeString(), message: '鍒涘缓鎴块棿澶辫触锛岃烦杩囬璁?, type: 'error' });
          return null;
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `鎴块棿鍒涘缓鎴愬姛 TeamId: ${teamId}`, type: 'success' });
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `鍒涘缓鎴块棿寮傚父: ${err.message || err}锛岃烦杩嘸, type: 'error' });
        return null;
      }
      await delay(3000);
    }

    // 5. 闃熷憳鍔犲叆骞跺噯澶?    const memberTokenIds = (preset.memberTokenIds || []).slice(0, 4)
      .filter(tid => tokenStore.gameTokens.some(t => t.id === tid));

    if (!hasActiveBattle && memberTokenIds.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `闃熷憳鍔犲叆骞跺噯澶?(${memberTokenIds.length}浜?...`, type: 'info' });
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
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 杩炴帴澶辫触锛岃烦杩囪鎴愬憳`, type: 'warning' });
          continue;
        }

        try {
          if (preset.usePresetTeam !== false && preset.teamSlots?.[tid]) {
            const slot = preset.teamSlots[tid];
            try {
              await tokenStore.sendMessageWithPromise(
                tid, 'presetteam_saveteam', { teamId: slot }, 8000
              );
              addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 宸插垏鎹㈠埌闃靛妲戒綅 ${slot}`, type: 'info' });
            } catch { /* 闃靛鍒囨崲澶辫触涓嶉樆濉?*/ }
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
                addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 鍔犲叆鎴块棿澶辫触: ${joinMsg}`, type: 'warning' });
                continue;
              }
            }
          }
          await delay(1000);

          await tokenStore.sendMessageWithPromise(
            tid, 'matchteam_memberprepare', { teamId: Number(teamId) }, 10000
          );
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 鍔犲叆骞跺噯澶囨垚鍔焋, type: 'success' });
        } catch (err) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 鎿嶄綔澶辫触: ${err.message || err}`, type: 'warning' });
        }

        // BUG2淇锛氬叡浜槦鍛樺欢杩熸柇杩?- 濡傛灉鍚庣画棰勮杩橀渶瑕佽闃熷憳锛屼笉鏂紑杩炴帴
        const isSharedMember = memberUsageCount.get(tid) > 1;
        const lastPresetIdx = memberLastPresetIndex.get(tid) ?? -1;
        if (isSharedMember && presetIndex >= 0 && presetIndex < lastPresetIdx) {
          // 鍚庣画棰勮杩橀渶瑕佽闃熷憳锛屼繚鎸佽繛鎺ワ紙閬垮厤浠庡墠棰勮鎴块棿琚Щ闄わ級
          addLog({ time: new Date().toLocaleTimeString(), message: `[${name}] 鍏变韩闃熷憳锛屼繚鎸佽繛鎺ヤ緵鍚庣画棰勮浣跨敤`, type: 'info' });
        } else {
          try { await tokenStore.closeWebSocketConnection(tid); } catch { /* ignore */ }
        }
        await delay(500);
      }
    }

    // 6. 鑾峰彇 RoomId
    addLog({ time: new Date().toLocaleTimeString(), message: '寮€濮嬫垬鏂楋紝鑾峰彇 RoomId...', type: 'info' });
    let roomId = existingRoomId;

    if (!roomId) {
      try {
        const openResp = await tokenStore.sendMessageWithPromise(
          captainTokenId, 'matchteam_openteam',
          { teamId: Number(teamId) }, 10000
        );
        roomId = openResp?.roomId || openResp?.roomid || openResp?.roomInfo?.roomId || null;
      } catch (err) {
        addLog({ time: new Date().toLocaleTimeString(), message: `寮€鍚埧闂村け璐? ${err.message || err}`, type: 'error' });
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
      addLog({ time: new Date().toLocaleTimeString(), message: '鏃犳硶鑾峰彇 RoomId锛岃烦杩囬璁?, type: 'error' });
      return null;
    }

    // 7. 鍚姩鍚庡彴鎴樻枟鏈嶅姟
    addLog({ time: new Date().toLocaleTimeString(), message: `RoomId: ${roomId}锛屽惎鍔ㄥ悗鍙版垬鏂楁湇鍔, type: 'info' });

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
          // 鉁?澶勭悊 teamId 鍙樻洿锛坃reopenRoom 7100020 閲嶈瘯閲嶅缓闃熶紞鍚庯級
          if (info.teamId) battleEntry.teamId = String(info.teamId);
        }
        if (info.status === 'running' && info.currentLevel > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 褰撳墠鎸戞垬绗?{info.currentLevel}鍏砢, type: 'info' });
        }
      },
      onComplete: (result) => {
        const levelInfo = result?.level ? ` (绗?{result.level}鍏?` : '';
        addLog({ time: new Date().toLocaleTimeString(), message: `鉁?棰勮銆?{preset.name}銆嶆寫鎴樺畬鎴?{levelInfo}锛乣, type: 'success' });
        // 娓呴櫎璺ㄦ爣绛鹃〉杩愯鏍囪
        clearPresetRunning(preset.id);
      },
      onError: (err) => {
        addLog({ time: new Date().toLocaleTimeString(), message: `鉂?棰勮銆?{preset.name}銆嶆垬鏂楀紓甯? ${err.message || err}`, type: 'error' });
        // 娓呴櫎璺ㄦ爣绛鹃〉杩愯鏍囪
        clearPresetRunning(preset.id);
      },
    });

    battleEntry.battle = battle;
    activeBattles.push(battleEntry);
    battle.start().catch(err => {
      addLog({ time: new Date().toLocaleTimeString(), message: `[${preset.name}] 鎴樻枟鍚姩寮傚父: ${err.message || err}`, type: 'error' });
      console.error('[鍗佹闃庣綏] battle.start() 鏈崟鑾峰紓甯?', err);
    });

    addLog({ time: new Date().toLocaleTimeString(), message: `鉁?棰勮銆?{preset.name}銆嶅凡鍦ㄥ悗鍙板惎鍔ㄦ垬鏂梎, type: 'success' });

    // BUG1淇锛氭壒閲忔ā寮忕敤鏁扮粍瀛樺偍鎵€鏈夋椿璺冮璁撅紝閬垮厤瑕嗙洊
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
      // 鍚屾椂淇濈暀鏈€鍚庝竴涓崟棰勮璁板綍锛堝吋瀹规棫閫昏緫锛?      sessionStorage.setItem('nightmare-last-battle-preset', JSON.stringify(existing[existing.length - 1]));
    } catch { /* ignore */ }

    return battleEntry;
  };

  // ====== 涓绘墽琛屽惊鐜細閫愪釜鍚姩棰勮 ======
  for (let i = 0; i < presets.length; i++) {
    if (shouldStop.value) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鈴?鏀跺埌鍋滄淇″彿锛屽彇娑堝墿浣?${presets.length - i} 涓璁綻, type: 'warning' });
      break;
    }
    // 鉁?璺宠繃閲嶅闃熼暱鐨勫悗缁璁?    if (skipDuplicateCaptainPresets.has(i)) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鈴?棰勮銆?{presets[i].name}銆嶉槦闀夸笌鍏朵粬棰勮閲嶅锛岃嚜鍔ㄨ烦杩嘸, type: 'warning' });
      continue;
    }
    const preset = presets[i];
    const entry = await executeOnePreset(preset, `鎵ц棰勮銆?{preset.name}銆?${i + 1}/${presets.length})`, i);
    if (!entry) continue;

    // 棰勮闂撮敊寮€寤惰繜锛堥伩鍏嶆湇鍔″櫒鍘嬪姏锛?    if (i < presets.length - 1) {
      const delaySec = nmTask?.nightmarePresetDelay || 10;
      addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟${delaySec}绉掑悗鍚姩涓嬩竴涓璁?..`, type: 'info' });
      await delay(delaySec * 1000);
    }
  }

  // ====== 绛夊緟鎵€鏈夋垬鏂楀畬鎴?+ 澶辫触閲嶈瘯 ======
  if (activeBattles.length > 0) {
    addLog({ time: new Date().toLocaleTimeString(), message: `鈴?绛夊緟 ${activeBattles.length} 涓悗鍙版垬鏂楀畬鎴?..`, type: 'info' });
    const maxWait = 2 * 60 * 60 * 1000; // 2灏忔椂瓒呮椂
    const startTime = Date.now();
    let reportInterval = 0;
    while (Date.now() - startTime < maxWait && !shouldStop.value) {
      // 妫€娴嬪け璐ョ殑棰勮骞惰Е鍙戦噸璇?      const failedBattles = activeBattles.filter(b =>
        b.status === 'failed' && !b._retried
      );
      for (const fb of failedBattles) {
        const currentRetries = retryCountMap.get(fb.preset.id) || 0;
        // 瀹炲姏涓嶈冻/鏃犲彲鐢ㄦ垚鍛樼被澶辫触锛岄噸璇曞彧浼氭氮璐规寫鎴樻鏁帮紝鐩存帴璺宠繃
        if (['retry_limit_reached', 'no_available_members'].includes(fb.failReason)) {
          fb._retried = true;
          addLog({ time: new Date().toLocaleTimeString(), message: `鈴?棰勮銆?{fb.preset.name}銆嶅け璐ュ師鍥?${fb.failReason}锛岄噸璇曟棤娉曡В鍐筹紝涓嶅啀閲嶈瘯`, type: 'warning' });
          continue;
        }
        if (currentRetries < MAX_RETRY) {
          retryCountMap.set(fb.preset.id, currentRetries + 1);
          fb._retried = true; // 鏍囪宸插鐞嗭紝閬垮厤閲嶅閲嶈瘯
          fb.status = 'retrying'; // 鏍囪涓洪噸璇曚腑

          const retryNum = currentRetries + 1;
          addLog({ time: new Date().toLocaleTimeString(), message: `馃攧 棰勮銆?{fb.preset.name}銆嶇${retryNum}娆￠噸璇曪紙澶辫触鍘熷洜: ${fb.failReason || '鏈煡'}锛塦, type: 'warning' });

          // 纭繚鏃ф垬鏂楀凡瀹屽叏瑙ｆ暎锛圢ightmareAutoBattleService 宸插湪澶辫触鏃惰皟鐢?_dismissRoom锛?          await delay(3000);

          // 浠?activeBattles 绉婚櫎鏃ф潯鐩紙閬垮厤閲嶅缁熻鍜?allDone 璇垽锛?          const oldIdx = activeBattles.indexOf(fb);
          if (oldIdx !== -1) activeBattles.splice(oldIdx, 1);

          // 鉁?BUG淇锛氱瓑寰呮棫 NightmareAutoBattleService 鐨?_dismissRoom 瀹屾垚娓呯悊
          // 鏃ф垬鏂楀湪鏍囪 failed 鏃惰皟鐢ㄤ簡 _dismissRoom锛屼絾 finally 鍧椾腑鐨勫紓姝ユ竻鐞嗗彲鑳藉皻鏈畬鎴?          const oldBattle = fb.battle;
          if (oldBattle) {
            let cleanupWait = 0;
            while (!oldBattle._cleanupDone && cleanupWait < 10) {
              await delay(1000);
              cleanupWait++;
            }
            if (cleanupWait > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `绛夊緟鏃ф垬鏂楁竻鐞嗗畬鎴?(${cleanupWait}绉?`, type: 'info' });
            }
          }

          // 閲嶆柊鎵ц瀹屾暣娴佺▼锛氳繛鎺ラ槦闀库啋鍒涘缓鎴块棿鈫掗槦鍛樺姞鍏モ啋鍚姩鎴樻枟
          // 鉁?BUG淇锛氫紶閫?presetIndex 纭繚鍏变韩闃熷憳寤惰繜鏂繛閫昏緫姝ｇ‘锛屼紭鍏堜娇鐢ㄤ繚瀛樼殑鍘熷绱㈠紩
          const retryPresetIndex = presets.findIndex(p => p.id === fb.preset.id);
          const newEntry = await executeOnePreset(
            fb.preset,
            `閲嶈瘯棰勮銆?{fb.preset.name}銆?绗?{retryNum}娆?`,
            fb.originalIndex >= 0 ? fb.originalIndex : retryPresetIndex
          );
          if (newEntry) {
            addLog({ time: new Date().toLocaleTimeString(), message: `鉁?棰勮銆?{fb.preset.name}銆嶉噸璇曞凡鍚姩`, type: 'success' });
            await delay(5000); // 閲嶈瘯鍚庣瓑寰呬竴浼氬啀妫€娴?          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `鉂?棰勮銆?{fb.preset.name}銆嶉噸璇曞惎鍔ㄥけ璐, type: 'error' });
          }
        } else {
          fb._retried = true; // 宸茶揪閲嶈瘯涓婇檺锛屾爣璁伴伩鍏嶉噸澶嶆娴?          addLog({ time: new Date().toLocaleTimeString(), message: `鈿狅笍 棰勮銆?{fb.preset.name}銆嶅凡杈炬渶澶ч噸璇曟鏁?${MAX_RETRY})锛屼笉鍐嶉噸璇昤, type: 'warning' });
        }
      }

      const allDone = activeBattles.every(b =>
        b.status === 'completed' || b.status === 'failed' || b.status === 'stopped'
      );
      if (allDone) break;
      await delay(10000);
      reportInterval++;
      // 姣?0绉掕緭鍑轰竴娆¤繘搴?      if (reportInterval >= 6) {
        reportInterval = 0;
        const running = activeBattles.filter(b => b.status === 'running');
        const done = activeBattles.filter(b => b.status === 'completed');
        const failed = activeBattles.filter(b => b.status === 'failed');
        const retrying = activeBattles.filter(b => b.status === 'retrying');
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        const runningDetail = running.map(b => `銆?{b.preset.name}銆?{b.currentLevel ? `绗?{b.currentLevel}鍏砢 : ''}`).join('銆?);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈴?鍗佹鎸戞垬杩涜涓?(${elapsed}鍒嗛挓) - 杩愯涓? ${runningDetail || '鏃?} | 宸插畬鎴? ${done.length}涓?| 澶辫触: ${failed.length}涓?{retrying.length > 0 ? ` | 閲嶈瘯涓? ${retrying.length}涓猔 : ''}`,
          type: 'info',
        });
      }
    }
    
    // 鏈€缁堟眹鎬?    const completed = activeBattles.filter(b => b.status === 'completed');
    const failed = activeBattles.filter(b => b.status === 'failed');
    const stopped = activeBattles.filter(b => b.status === 'stopped');
    const timeout = Date.now() - startTime >= maxWait;
    const totalElapsed = Math.floor((Date.now() - startTime) / 60000);
    
    addLog({ time: new Date().toLocaleTimeString(), message: `=== 鍗佹闃庣綏鎸戞垬鎵ц瀹屾瘯 (${totalElapsed}鍒嗛挓) ===`, type: 'info' });
    if (completed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鉁?鎴愬姛: ${completed.map(b => `銆?{b.preset.name}銆峘).join('銆?)}`, type: 'success' });
    }
    if (failed.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鉂?澶辫触: ${failed.map(b => `銆?{b.preset.name}銆?{b.failReason ? `(${b.failReason})` : ''}`).join('銆?)}`, type: 'error' });
    }
    if (stopped.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `鈴?宸插仠姝? ${stopped.map(b => `銆?{b.preset.name}銆峘).join('銆?)}`, type: 'warning' });
    }
    if (timeout) {
      const running = activeBattles.filter(b => b.status === 'running');
      addLog({ time: new Date().toLocaleTimeString(), message: `鈿狅笍 瓒呮椂2灏忔椂锛?{running.length}涓璁炬湭瀹屾垚: ${running.map(b => `銆?{b.preset.name}銆峘).join('銆?)}`, type: 'warning' });
    }

    // 娓呯悊 sessionStorage 鎵归噺鎴樻枟鏁版嵁
    try { sessionStorage.removeItem('nightmare-batch-battles'); } catch { /* ignore */ }
    _activeNightmareBattles = []; // 鉁?娓呯悊妯″潡绾у紩鐢?  }
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0) return;

  isRunning.value = true;
  shouldStop.value = false;
  // 鉁?淇锛氭墜鍔ㄦ壒閲忎换鍔″紑濮嬫椂涔熸洿鏂?lastTaskExecution锛岄槻姝?healthCheck 璇垽涓哄崱姝?  lastTaskExecution = Date.now();
  // 浠诲姟寮€濮嬫椂閲嶇疆鐢ㄦ埛鎵嬪姩鍏抽棴鏍囪锛屽厑璁告柊鐨勪换鍔′娇鐢ㄨ嚜鍔ㄦ粴鍔?  userManuallyDisabledScroll.value = false;
  // 涓嶅啀閲嶇疆logs鏁扮粍锛屼繚鐣欎箣鍓嶇殑鏃ュ織
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // 400340閲嶈瘯闃熷垪锛氭敹闆嗙涓€鎵规墽琛屼腑閬囧埌400340閿欒鐨勮处鍙?  const retry400340Tokens = [];
  const MAX_400340_RETRIES = batchSettings.defaultRetryCount || 2;
  const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000;

  // 鍗曡处鍙锋墽琛岃秴鏃朵繚鎶わ紙榛樿10鍒嗛挓锛?  const TOKEN_EXECUTION_TIMEOUT = (batchSettings.taskTimeout || 10) * 60 * 1000;

  // ========== 杩炴帴姹犳粴鍔ㄦ墽琛?==========
  // 鍚屾杩炴帴姹犲ぇ灏忎笌褰撳墠璁剧疆
  wsPool.setPoolSize(batchSettings.maxActive);
  const maxConcurrent = batchSettings.maxActive;
  const tokenQueue = [...selectedTokens.value];
  const activeTokens = new Set();
  const completionMap = new Map(); // tokenId -> Promise

  // 瀹氫箟鍗曚釜Token鎵ц鍑芥暟锛堢敤浜庤繛鎺ユ睜婊氬姩鎵ц锛?  const executeTokenRolling = async (tokenId) => {
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
            message: `=== 寮€濮嬫墽琛? ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 灏濊瘯閲嶈瘯: ${token.name} (绗?{retryCount}娆? ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId, 3, true); // skipSlot=true锛岀敱澶栧眰婊氬姩鎵ц鎺у埗骞跺彂

        // 绛夊緟杩炴帴绋冲畾
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 绛夊緟杩炴帴绋冲畾...`,
          type: "info",
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 妫€鏌ユ椿璺冨害
        addLog({
          time: new Date().toLocaleTimeString(),
          message: ` 姝ｅ湪鑾峰彇娲昏穬搴︿俊鎭?..`,
          type: "info",
        });
        
        try {
          const roleInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000
          );
          
          // 灏濊瘯澶氱鍙兘鐨勮矾寰?          const dailyTask = roleInfo?.role?.dailyTask 
            || roleInfo?.body?.role?.dailyTask
            || roleInfo?.dailyTask
            || roleInfo?.body?.dailyTask;
          
          const activityPoints = dailyTask?.dailyPoint ?? 0;
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `馃搳 ${token.name} 褰撳墠娲昏穬搴? ${activityPoints}/110`,
            type: "info",
          });
          
          // 濡傛灉娲昏穬搴?>= 105锛岃烦杩囨棩甯镐换鍔?          if (activityPoints >= 105) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `鉁?${token.name} 娲昏穬搴﹀凡杈炬爣 ${activityPoints}/110锛屾棤闇€鎵ц鏃ュ父浠诲姟`,
              type: "success",
            });
            success = true;
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 鎵ц瀹屾垚 ===`,
              type: "success",
            });
            continue; // 璺宠繃鍚庣画鐨勪换鍔℃墽琛?          }
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `馃殌 ${token.name} 娲昏穬搴?${activityPoints}锛屽紑濮嬫墽琛屾棩甯镐换鍔?..`,
            type: "info",
          });
        } catch (error) {
          console.error("鑾峰彇娲昏穬搴﹀け璐?", error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈿狅笍 ${token.name} 鑾峰彇娲昏穬搴﹀け璐ワ紝缁х画鎵ц浠诲姟`,
            type: "warning",
          });
        }

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        }, batchSettings);  // 鉁?浼犲叆batchSettings鏀寔楂樼骇閰嶇疆

        // Run tasks
        const runnerResult = await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: (p) => {
            // 姣忎釜token缁存姢鑷繁鐨勮繘搴?          },
        });

        // 妫€鏌ユ槸鍚︽湁400340閿欒锛屽姞鍏ラ噸璇曢槦鍒?        if (runnerResult?.has400340Error) {
          retry400340Tokens.push(tokenId);
          tokenStatus.value[tokenId] = "waiting_retry";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈿狅笍 ${token.name} 閬囧埌400340鏈嶅姟鍣ㄩ敊璇紝宸插姞鍏ラ噸璇曢槦鍒楋紙绛夊緟绗竴鎵瑰畬鎴愬悗閲嶈瘯锛塦,
            type: "warning",
          });
        }

        // 浠诲姟鎵ц瀹屾垚鍚庯紝鍦ㄥ叧闂繛鎺ュ墠鑾峰彇鏈€鏂扮殑娲昏穬搴?        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `馃攧 ${token.name} 姝ｅ湪鑾峰彇鏈€鏂拌鑹蹭俊鎭?..`,
            type: "info",
          });
          
          // 浣跨敤sendGetRoleInfo鑾峰彇鏈€鏂拌鑹蹭俊鎭?          const roleInfoResp = await tokenStore.sendGetRoleInfo(tokenId);
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: ` ${token.name} 鏀跺埌瑙掕壊淇℃伅鍝嶅簲`,
            type: "info",
          });
          
          // 璋冭瘯锛氳緭鍑哄搷搴旂粨鏋?          console.log(`[${token.name}] roleInfoResp:`, roleInfoResp);
          console.log(`[${token.name}] roleInfoResp?.role:`, roleInfoResp?.role);
          console.log(`[${token.name}] roleInfoResp?.role?.dailyTask:`, roleInfoResp?.role?.dailyTask);
          
          // 娑堟伅鐩戝惉鍣ㄤ細鑷姩鏇存柊tokenGameDataMap锛屼絾涓轰簡纭繚锛屾垜浠啀鎵嬪姩鏇存柊涓€娆?          if (roleInfoResp) {
            const roleData = roleInfoResp?.role || roleInfoResp;
            const activityPoints = roleData?.dailyTask?.dailyPoint ?? 0;
            
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `馃搳 ${token.name} 瑙ｆ瀽娲昏穬搴? ${activityPoints}/110`,
              type: "info",
            });
            
            // 鏄惧紡璁剧疆娲昏穬搴﹀埌tokenActivityMap锛岀‘淇濇帓搴忔椂鑳芥纭幏鍙?            tokenStore.setTokenActivity(tokenId, activityPoints);
            
            if (roleData) {
              // 鏇存柊鍒皌okenGameDataMap
              tokenStore.updateTokenGameData(tokenId, { roleInfo: roleInfoResp });
              
              // 楠岃瘉鏇存柊锛堟暟鎹矾寰勶細roleInfo.role.dailyTask.dailyPoint锛?              const cached = tokenStore.getTokenGameData(tokenId);
              const cachedActivity = cached?.roleInfo?.role?.dailyTask?.dailyPoint 
                ?? cached?.roleInfo?.dailyTask?.dailyPoint ?? 0;
              
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `鉁?${token.name} 娲昏穬搴﹀凡缂撳瓨: ${cachedActivity}/110`,
                type: "success",
              });
            }
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `锔?${token.name} 瑙掕壊淇℃伅鍝嶅簲涓虹┖`,
              type: "warning",
            });
          }
        } catch (error) {
          console.error(`鑾峰彇${token.name}鏈€鏂版椿璺冨害澶辫触:`, error);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鉂?${token.name} 鑾峰彇娲昏穬搴﹀け璐? ${error.message}`,
            type: "error",
          });
        }

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 鎵ц瀹屾垚 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鎵ц鍑洪敊: ${error.message}锛岀瓑寰?绉掑悗閲嶈瘯...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 鎵ц澶辫触: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 瀹屾垚鍚庡叧闂繛鎺ワ紙skipSlot妯″紡涓嶉渶瑕侀噴鏀炬Ы浣嶏紝鐢卞灞傛粴鍔ㄥ惊鐜帶鍒讹級
        tokenStore.closeWebSocketConnection(tokenId);
        // 鉁?淇锛氭瘡涓处鍙峰畬鎴愭椂鏇存柊 lastTaskExecution锛屼綔涓哄績璺抽槻姝?healthCheck 璇垽
        lastTaskExecution = Date.now();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 杩炴帴宸插叧闂? (娲昏穬: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  }; // end executeTokenRolling

  // ========== 杩炴帴姹犳粴鍔ㄦ墽琛屽惊鐜?==========
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `馃殌 杩炴帴姹犳粴鍔ㄦ墽琛屽紑濮嬶紝骞跺彂鏁? ${maxConcurrent}锛孴oken鏁? ${tokenQueue.length}`,
    type: "info",
  });

  while (tokenQueue.length > 0 || activeTokens.size > 0) {
    if (shouldStop.value) break;

    // 濉厖鎵ц妲戒綅锛堟渶澶?maxConcurrent 涓級
    while (tokenQueue.length > 0 && activeTokens.size < maxConcurrent) {
      const nextTokenId = tokenQueue.shift();
      activeTokens.add(nextTokenId);

      // 鍚姩鎵ц锛堜笉绛夊緟瀹屾垚锛?      const promise = (async () => {
        try {
          await Promise.race([
            executeTokenRolling(nextTokenId),
            new Promise((_, reject) => setTimeout(() =>
              reject(new Error(`鍗曡处鍙锋墽琛岃秴鏃讹紙${TOKEN_EXECUTION_TIMEOUT / 60000}鍒嗛挓锛塦)),
              TOKEN_EXECUTION_TIMEOUT
            ))
          ]);
        } catch (timeoutErr) {
          const token = tokens.value.find((t) => t.id === nextTokenId);
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈴?${token?.name} ${timeoutErr.message}锛屽己鍒惰烦杩嘸,
            type: "warning",
          });
          tokenStatus.value[nextTokenId] = "failed";
          tokenStore.closeWebSocketConnection(nextTokenId);
          lastTaskExecution = Date.now();
        }
      })();

      completionMap.set(nextTokenId, promise);
    }

    // 绛夊緟鑷冲皯涓€涓畬鎴?    if (activeTokens.size > 0) {
      const activePromises = [...activeTokens].map(id => completionMap.get(id));
      await Promise.race(activePromises);

      // 娓呯悊宸插畬鎴愮殑
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
    message: `鉁?杩炴帴姹犳粴鍔ㄦ墽琛屽畬鎴恅,
    type: "success",
  });

  // 绛夊緟鎵€鏈変换鍔″畬鎴愬悗鍐嶇户缁?  await new Promise((r) => setTimeout(r, 1000));

  // ==================== 400340 閲嶈瘯閫昏緫 ====================
  if (retry400340Tokens.length > 0 && !shouldStop.value) {
    const waitSeconds = RETRY_WAIT_TIME / 1000;
    const waitMinutes = Math.floor(waitSeconds / 60);
    const waitDesc = waitMinutes > 0 ? `${waitMinutes}鍒嗛挓` : `${waitSeconds}绉抈;
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 绗竴鎵规墽琛屽畬鎴愶紝${retry400340Tokens.length} 涓处鍙烽亣鍒?00340鏈嶅姟鍣ㄩ敊璇紝绛夊緟${waitDesc}鍚庨噸璇?===`,
      type: "info",
    });

    for (let retryRound = 0; retryRound < MAX_400340_RETRIES && retry400340Tokens.length > 0 && !shouldStop.value; retryRound++) {
      // 绛夊緟閲嶈瘯寤惰繜
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鈴?绛夊緟${waitDesc}鍚庤繘琛岀${retryRound + 1}娆￠噸璇曪紙${retry400340Tokens.length}涓处鍙凤級...`,
        type: "info",
      });
      await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));

      if (shouldStop.value) break;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n=== 寮€濮?00340閲嶈瘯 绗?{retryRound + 1}/${MAX_400340_RETRIES}娆★紙${retry400340Tokens.length}涓处鍙凤級===`,
        type: "info",
      });

      const stillFailed = [];

      for (let i = 0; i < retry400340Tokens.length; i++) {
        if (shouldStop.value) break;

        const tokenId = retry400340Tokens[i];
        const token = tokens.value.find((t) => t.id === tokenId);
        if (!token) continue;

        // 璐﹀彿闂村欢杩燂紙闈炵涓€涓处鍙锋椂锛?        if (i > 0 && (batchSettings.accountRetryInterval || 0) > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鈴?绛夊緟${batchSettings.accountRetryInterval / 1000}绉掑悗澶勭悊涓嬩竴涓处鍙?..`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, batchSettings.accountRetryInterval || 3000));
        }

        tokenStatus.value[tokenId] = "running";

        try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 閲嶈瘯鎵ц: ${token.name} (绗?{retryRound + 1}娆￠噸璇? ===`,
            type: "info",
          });

          await ensureConnection(tokenId, 3);

          // 绛夊緟杩炴帴绋冲畾
          await new Promise((r) => setTimeout(r, 2000));

          // 鍒涘缓鏂扮殑runner
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
              message: `鈿狅笍 ${token.name} 閲嶈瘯鍚庝粛鏈?00340閿欒`,
              type: "warning",
            });
          } else {
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `鉁?${token.name} 閲嶈瘯鎴愬姛`,
              type: "success",
            });
          }
        } catch (error) {
          stillFailed.push(tokenId);
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `鉂?${token.name} 閲嶈瘯澶辫触: ${error.message}`,
            type: "error",
          });
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot(); // 涓?ensureConnection 涓殑 waitForConnectionSlot 瀵瑰簲
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 杩炴帴宸插叧闂? (娲昏穬: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }

      // 鏇存柊閲嶈瘯闃熷垪
      retry400340Tokens.length = 0;
      retry400340Tokens.push(...stillFailed);

      if (retry400340Tokens.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉁?鎵€鏈?00340閿欒璐﹀彿閲嶈瘯鎴愬姛锛乣,
          type: "success",
        });
      }
    }

    // 鏈€缁堜粛澶辫触鐨勮处鍙?    if (retry400340Tokens.length > 0) {
      for (const tokenId of retry400340Tokens) {
        tokenStatus.value[tokenId] = "failed";
        const token = tokens.value.find((t) => t.id === tokenId);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鉂?${token?.name} 400340閲嶈瘯${MAX_400340_RETRIES}娆″悗浠嶅け璐,
          type: "error",
        });
      }
    }
  }

  // 鏍规嵁娲昏穬搴﹁嚜鍔ㄦ帓搴忚处鍙凤紙鍙湁鎵ц澶氫釜璐﹀彿鏃舵墠鎺掑簭锛?  if (selectedTokens.value.length > 1) {
    await sortByActivityAfterDailyTask();
  } else {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鈩癸笍  鍙墽琛屼簡1涓处鍙凤紝璺宠繃娲昏穬搴︽帓搴廯,
      type: "info",
    });
  }

  isRunning.value = false;
  currentRunningTokenId.value = null;
  
  // 鉁?鏃ュ父浠诲姟缁撴潫鍚庯紝涓诲姩娑堣垂瀹氭椂浠诲姟闃熷垪
  if (pendingTaskQueue.length > 0 && !isScheduledTaskRunning.value) {
    while (pendingTaskQueue.length > 0) {
      const nextTask = pendingTaskQueue[0];
      const timeCheck = isTaskTimeStillValid(nextTask, 60);
      
      if (!timeCheck.valid) {
        pendingTaskQueue.shift();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `鈴?鏃ュ父浠诲姟瀹屾垚鍚庯紝璺宠繃宸茶繃鏈熺殑闃熷垪浠诲姟: ${nextTask.name}锛?{timeCheck.reason}锛塦,
          type: "warning",
        });
        continue;
      }
      
      // 鎵惧埌鏈夋晥浠诲姟锛屽嚭闃熷苟鎵ц
      pendingTaskQueue.shift();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鈻讹笍 鏃ュ父浠诲姟缁撴潫鍚庯紝浠庨槦鍒楁墽琛屽畾鏃朵换鍔? ${nextTask.name}锛堝墿浣欓槦鍒? ${pendingTaskQueue.length}锛塦,
        type: "info",
      });
      isScheduledTaskRunning.value = true;
      currentScheduledTask = nextTask;
      scheduledTaskStartTime = Date.now();
      lastTaskExecution = Date.now();
      executeScheduledTask(nextTask).catch(error => {
        console.error(`鏃ュ父浠诲姟瀹屾垚鍚庨槦鍒椾换鍔℃墽琛岄敊璇?`, error);
      }).finally(() => {
        lastTaskExecution = Date.now();
      });
      break; // 姣忔鍙惎鍔ㄤ竴涓畾鏃朵换鍔?    }
  }
  
  // 妫€鏌ユ槸鍚﹂渶瑕佸湪浠诲姟瀹屾垚鍚庡埛鏂伴〉闈?  // 娉ㄦ剰锛氶渶鍚屾椂纭瀹氭椂浠诲姟鍜岄槦鍒椾腑娌℃湁寰呮墽琛屼换鍔★紝閬垮厤鍒锋柊涓柇
  if (shouldRefreshAfterTask.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
    console.log(`[${new Date().toISOString()}] Task completed, executing postponed page refresh`);
    shouldRefreshAfterTask.value = false; // 閲嶇疆鏍囪
    // 绋嶇瓑鐗囧埢鍐嶅埛鏂帮紝璁╃敤鎴风湅鍒颁换鍔″畬鎴愮殑娑堟伅
    setTimeout(() => {
      // 鉁?浜屾纭锛氶槻姝?1.5 绉掑唴璋冨害鍣ㄥ惎鍔ㄤ簡鏂颁换鍔?      if (!isRunning.value && !isScheduledTaskRunning.value && pendingTaskQueue.length === 0) {
        window.location.reload();
      } else {
        shouldRefreshAfterTask.value = true; // 閲嶆柊鏍囪锛岀瓑寰呬笅娆¤皟搴﹀櫒妫€鏌?        console.log(`[${new Date().toISOString()}] Postponed refresh: new task started during delay`);
      }
    }, 1500);
    return; // 鎻愬墠杩斿洖锛屼笉鏄剧ず鎴愬姛娑堟伅
  }
  
  message.success("鎵归噺浠诲姟鎵ц缁撴潫");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "姝ｅ湪鍋滄...",
    type: "warning",
  });
};

/**
 * 鏃ュ父浠诲姟鎵ц瀹屾垚鍚庯紝鏍规嵁娲昏穬搴﹁嚜鍔ㄦ帓搴忚处鍙? * 浣庢椿璺冨害锛?100锛夌殑璐﹀彿鎺掑埌鍓嶉潰锛岄珮娲昏穬搴︼紙>=100锛夌殑璐﹀彿鎺掑埌鍚庨潰
 * 娉ㄦ剰锛氬彧瀵规湰娆℃墽琛岀殑selectedTokens鎺掑簭锛屼笉褰卞搷鏈墽琛岀殑token椤哄簭
 */
const sortByActivityAfterDailyTask = async () => {
  try {
    // 妫€鏌ヨ处鍙锋暟閲忥紝鍙湁澶氫釜璐﹀彿鎵嶆帓搴?    const executedTokenCount = selectedTokens.value.length;
    if (executedTokenCount <= 1) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `鈩癸笍  鍙墽琛屼簡${executedTokenCount}涓处鍙凤紝鏃犻渶鎺掑簭`,
        type: "info",
      });
      return;
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `\n=== 寮€濮嬫牴鎹椿璺冨害鑷姩鎺掑簭璐﹀彿 (${executedTokenCount}涓处鍙? ===`,
      type: "info",
    });

    // 娲昏穬搴﹂槇鍊硷細100涓哄垎鐣岀嚎锛堟弧鍊?10锛?=105璺宠繃浠诲姟锛?    const ACTIVITY_THRESHOLD = 100;

    // 鑾峰彇鏈鎵ц鐨則oken鐨勬椿璺冨害
    const activityMap = new Map();
    
    for (const tokenId of selectedTokens.value) {
      const token = tokenStore.gameTokens.find(t => t.id === tokenId);
      
      try {
        const activityPoints = tokenStore.getTokenActivity(tokenId);
        activityMap.set(tokenId, activityPoints);
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token?.name || tokenId} 娲昏穬搴? ${activityPoints}/110`,
          type: "info",
        });
      } catch (error) {
        console.error(`鑾峰彇娲昏穬搴﹀け璐?`, error);
        activityMap.set(tokenId, 0);
      }
    }

    // 鍙selectedTokens鎸夋椿璺冨害鎺掑簭
    const sortedExecutedIds = [...selectedTokens.value].sort((a, b) => {
      const activityA = activityMap.get(a) || 0;
      const activityB = activityMap.get(b) || 0;
      
      // 浣庢椿璺冨害(<100)鎺掑墠闈紝楂樻椿璺冨害(>=100)鎺掑悗闈?      const isLowA = activityA < ACTIVITY_THRESHOLD;
      const isLowB = activityB < ACTIVITY_THRESHOLD;
      
      if (isLowA && !isLowB) return -1;
      if (!isLowA && isLowB) return 1;
      
      // 鍚岀粍鍐呮寜娲昏穬搴﹀崌搴忔帓鍒?      return activityA - activityB;
    });

    // 鍚堝苟锛氬凡鎵ц鐨則oken锛堟寜娲昏穬搴︽帓搴忥級+ 鏈墽琛岀殑token锛堜繚鎸佸師椤哄簭锛?    const executedSet = new Set(selectedTokens.value);
    const nonExecutedIds = tokenOrder.value.filter(id => !executedSet.has(id));
    const sortedTokenIds = [...sortedExecutedIds, ...nonExecutedIds];

    // 鏇存柊tokenOrder
    tokenOrder.value = sortedTokenIds;
    
    // 淇濆瓨鍒板瓨鍌?    await saveTokenOrder(sortedTokenIds);

    // 缁熻淇℃伅
    const lowActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) < ACTIVITY_THRESHOLD
    );
    const highActivityTokens = selectedTokens.value.filter(
      id => (activityMap.get(id) || 0) >= ACTIVITY_THRESHOLD
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鉁?娲昏穬搴︽帓搴忓畬鎴恅,
      type: "success",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `馃搳 浣庢椿璺冨害(0-99): ${lowActivityTokens.length}涓处鍙?鈫?鎺掑埌鍓嶉潰`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `馃搳 楂樻椿璺冨害(100-110): ${highActivityTokens.length}涓处鍙?鈫?鎺掑埌鍚庨潰`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 娲昏穬搴︽帓搴忓畬鎴?===`,
      type: "success",
    });
  } catch (error) {
    console.error('娲昏穬搴︽帓搴忓け璐?', error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `鈿狅笍 娲昏穬搴︽帓搴忓け璐? ${error.message}`,
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

/* 瀹氭椂浠诲姟妯″潡鏍峰紡 */
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

/* 鎵嬫満绔搷搴斿紡 - 鑷姩缂╁皬骞舵崲琛?*/
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

  /* 浠诲姟绠＄悊鍜屾椂娈垫帶鍒?- 姣忚2涓?*/
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

  /* 閰嶇疆绠＄悊 - 姣忚2涓?*/
  .button-row-config {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }

  .button-row-config > * {
    min-width: 0 !important;
    width: 100% !important;
  }

  /* 寮哄埗n-upload鍗犳弧瀹瑰櫒瀹藉害 */
  .button-row-config :deep(.n-upload) {
    width: 100% !important;
    display: block !important;
  }

  .button-row-config :deep(.n-upload .n-button) {
    width: 100% !important;
    flex: none !important;
  }

  /* 纭繚n-upload浣跨敤flex甯冨眬涓巒-button涓€鑷?*/
  .button-row-config :deep(.n-upload) {
    flex: 1 !important;
    display: flex !important;
  }

  .button-row-config :deep(.n-upload .n-button) {
    flex: 1 !important;
    width: auto !important;
  }

  /* 寮哄埗瀵煎叆鎸夐挳涓庡鍑烘寜閽搴︿竴鑷?*/
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

  /* 纭繚瀵煎叆鎸夐挳鍦≒C绔篃浣跨敤flex甯冨眬 */
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

  /* 缂╁皬鎸夐挳瀛椾綋鍜屽浘鏍?*/
  .scheduled-tasks-buttons :deep(.n-button) {
    font-size: 12px !important;
    height: 32px !important;
    padding: 0 8px !important;
  }

  .scheduled-tasks-buttons :deep(.n-button .n-button__icon) {
    font-size: 14px !important;
  }

  /* 缂╁皬缁熻鍗＄墖鏁板瓧 */
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

/* 鏌ョ湅浠诲姟鍒楄〃鏍峰紡 */
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

/* 浠诲姟澶撮儴 */
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

/* 浠诲姟鍐呭 */
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

/* 浠诲姟搴曢儴鎿嶄綔 */
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

/* 鍒嗙粍閫夋嫨鍣?*/
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

/* 璐﹀彿鍜屼换鍔″垪琛?*/
.token-list,
.task-list {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e8eaed;
  max-height: 300px;
  overflow-y: auto;
}

/* 浠诲姟閰嶇疆鍗＄墖 */
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

/* 鍟嗗簵鍟嗗搧椤?*/
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

/* 榛戝競澶氶€夎喘涔伴」 */
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

/* 濂栧姳椤?*/
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

/* 涓嶄笂绾挎椂娈?*/
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

/* 鎿嶄綔鎸夐挳 */
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
  /* 鎵归噺鍔熸硶娈嬪嵎璧犻€佹牱寮?*/
  .recipient-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  /* 澶村儚鎮仠鏁堟灉 */
  .avatar-container:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  }

  /* Token鍒嗙粍绠＄悊鏍峰紡 */
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

  /* 鎺掑簭鎸夐挳缁勭Щ鍔ㄧ鑷€傚簲 */
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

    /* 姣忚鏁伴噺鍜屾悳绱㈡鑷€傚簲 */
    :deep(.n-input-number),
    :deep(.n-input) {
      width: 120px !important;
      min-width: 80px;
    }
  }

  /* 璐﹀彿鍒楄〃澶撮儴鎸夐挳绉诲姩绔嚜閫傚簲 */
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

  /* 鍝嶅簲寮忚璁?*/
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

/* 灞曞紑/鏀惰捣鎸夐挳缁勬牱寮?*/
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

/* 鎵嬫満绔搷搴斿紡 */
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

/* 鏆楅粦妯″紡閫傞厤 */
[data-theme="dark"] {
  .batch-daily-tasks-container {
    background: var(--bg-primary);
  }
  
  /* 鍔熻兘鍗＄墖鑳屾櫙 */
  .function-section,
  .token-list-section,
  .log-section {
    background: var(--card-bg) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 鍒嗙粍绠＄悊鍖哄煙 */
  .group-selection-section,
  [style*="background: #f7f8fa"],
  [style*="background:#f7f8fa"] {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 杈撳叆妗嗗拰鎼滅储妗?*/
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
  
  /* 鎸夐挳鏍峰紡浼樺寲 */
  :deep(.n-button) {
    color: var(--text-primary) !important;
  }
  
  :deep(.n-button:not(.n-button--primary):not(.n-button--success):not(.n-button--error):not(.n-button--warning)) {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-medium) !important;
  }
  
  /* 鏍囩椤?*/
  :deep(.n-tabs-tab) {
    color: var(--text-secondary) !important;
  }
  
  :deep(.n-tabs-tab--active) {
    color: var(--primary-color) !important;
  }
  
  :deep(.n-tabs-tab-pane) {
    background: var(--card-bg) !important;
  }
  
  /* 澶嶉€夋 */
  :deep(.n-checkbox__label) {
    color: var(--text-primary) !important;
  }
  
  /* 杩涘害鏉?*/
  :deep(.n-progress) {
    background: var(--bg-tertiary) !important;
  }
  
  /* 鏃ュ織鍖哄煙 */
  .log-content {
    background: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 鏃ュ織瀹瑰櫒 */
  .log-container {
    background: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-light) !important;
  }
  
  /* 鏃ュ織椤?*/
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
  
  /* 鏃ュ織绫诲瀷棰滆壊 */
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
  
  /* 瀹氭椂浠诲姟鍗＄墖 */
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
  
  /* 瀹氭椂浠诲姟鎸夐挳鍖哄煙 */
  .scheduled-tasks-buttons {
    background: var(--card-bg) !important;
  }
  
  .scheduled-tasks-buttons :deep(.n-button) {
    color: var(--text-primary) !important;
  }
  
  /* 瀹氭椂浠诲姟鍒楄〃 */
  .tasks-list {
    background: var(--bg-secondary) !important;
  }
  
  .tasks-list [style*="color: #6b7280"],
  .tasks-list [style*="color:#6b7280"] {
    color: var(--text-tertiary) !important;
  }
  
  /* 浠诲姟椤?*/
  .task-item {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  .task-item:hover {
    background: var(--card-bg-hover) !important;
  }
  
  /* 妯℃€佹 */
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
  
  /* 浠诲姟妯℃澘鍖哄煙 */
  [style*="background: #f0f5ff"],
  [style*="background:#f0f5ff"] {
    background: rgba(22, 119, 255, 0.1) !important;
    border-color: rgba(22, 119, 255, 0.3) !important;
  }
  
  /* 鎺ユ敹鑰呬俊鎭?*/
  .recipient-info {
    background: var(--bg-tertiary) !important;
    border-color: var(--border-light) !important;
  }
  
  /* 鍗＄墖澶撮儴 */
  .card-header {
    color: var(--text-primary) !important;
  }
  
  /* Token鍗＄墖 */
  .token-card {
    background: var(--card-bg) !important;
    border-color: var(--border-light) !important;
  }
  
  .token-card:hover {
    background: var(--card-bg-hover) !important;
  }
}

/* ================= 璁剧疆寮圭獥鍝嶅簲寮忔牱寮?================= */
/* 璁剧疆椤圭綉鏍?- 鑷€傚簲鎹㈣ */
.settings-grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

/* 璁剧疆椤?- 鍝嶅簲寮忓竷灞€ */
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

/* 璁剧疆鏍囩 */
.setting-label-responsive {
  font-size: 13px;
  color: var(--text-secondary, #4b5563);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 杈撳叆妗嗗搷搴斿紡 */
.input-responsive {
  width: 100% !important;
}

/* 绉诲姩绔€傞厤 */
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

/* 骞虫澘绔€傞厤 */
@media (min-width: 769px) and (max-width: 1024px) {
  .settings-grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 妗岄潰绔€傞厤 */
@media (min-width: 1025px) {
  .settings-grid-responsive {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

/* ========== 瀹氭椂浠诲姟寮圭獥鎵嬫満绔紭鍖?========== */
@media (max-width: 600px) {
  /* 鍒嗗尯鍗＄墖鍑忓皯鍐呰竟璺?*/
  .form-section {
    padding: 10px;
    border-radius: 8px;
  }

  /* 鍒嗗尯鏍囬缂╁皬 */
  .section-title {
    font-size: 13px;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }

  /* 鍟嗗簵鍟嗗搧椤圭揣鍑戝寲 */
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

  /* 濂栧姳椤圭揣鍑戝寲 */
  .reward-item {
    padding: 6px 8px;
    min-height: 36px;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* 閰嶇疆鍗＄墖澶撮儴锛氭爣棰樺拰寮€鍏崇旱鍚戞帓鍒?*/
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

  /* 鎿嶄綔鎸夐挳鍏ㄥ */
  .form-actions {
    flex-direction: column;
    gap: 8px;
  }

  .form-actions .n-button {
    width: 100%;
  }

  /* 鍒嗙粍鏍囩绱у噾 */
  .group-tags {
    gap: 6px;
  }

  /* 宸ュ叿鏍忔寜閽揣鍑?*/
  .section-toolbar {
    margin-bottom: 8px;
  }

  /* 涓嶄笂绾挎椂娈电揣鍑?*/
  .offline-time-section {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start !important;
  }

  /* 鍗佹棰勮椤圭揣鍑?*/
  .nightmare-preset-item {
    padding: 6px 0;
  }

  .preset-item-label {
    font-size: 12px;
  }

  /* 鍗曢€夋寜閽粍鎵嬫満绔崲琛?*/
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

  /* 鏃堕棿閫夋嫨鍣ㄥ叏瀹?*/
  .setting-item :deep(.n-time-picker) {
    width: 100% !important;
  }

  /* 杈撳叆妗嗗叏瀹?*/
  .setting-item :deep(.n-input) {
    width: 100% !important;
  }
}

/* ========== 浠诲姟妯℃澘绠＄悊鍣ㄦ牱寮?========== */
.template-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 宸ュ叿鏍?*/
.template-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
}

/* 妯℃澘鍒楄〃瀹瑰櫒 */
.template-list-container {
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
}

/* 妯℃澘缃戞牸甯冨眬 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* 妯℃澘鍗＄墖 */
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

/* 妯℃澘鍗＄墖澶撮儴 */
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

/* 妯℃澘鍗＄墖搴曢儴 */
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

/* 閲囪喘娓呭崟缃戞牸 */
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
/* 缁胯壊寮€鍏虫牱寮忥紙涓庨璁惧崱鐐瑰紑鍏充竴鑷达級 */
:deep(.feature-switch) {
  --n-rail-color-active: #18a058 !important;
  --n-rail-color: #ccc !important;
  min-width: 64px;
}
:deep(.feature-switch .n-switch__rail) {
  min-width: 64px;
}
</style>

<!-- 娣诲姞Token寮圭獥鏍峰紡锛堥潪scoped锛屽洜涓簄-modal琚紶閫佸埌body锛?-->
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

/* 绉诲姩绔€傞厤 */
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

/* 鍗佹棰勮閫夋嫨鍒楄〃 */
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

/* === 鎵归噺鎺ㄥ浘寮圭獥鏍峰紡 === */
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

/* 宸ュ叿鏍?*/
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
/* 鐏妸閫夋嫨鍣細寮规€у搴︼紝鏈€灏?00px鏈€澶?40px */
.push-torch-select {
  flex: 1 1 100px;
  min-width: 100px;
  max-width: 140px;
}
/* 鏁伴噺杈撳叆妗嗗浐瀹氬搴?*/
.push-torch-count {
  width: 74px !important;
  flex-shrink: 0;
}
/* 浣跨敤鐏妸鎸夐挳涓嶆敹缂?*/
.push-torch-btn {
  flex-shrink: 0;
  white-space: nowrap;
}
.push-toolbar-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
/* 鍏ㄩ儴寮€濮?鍏ㄩ儴鍋滄鎸夐挳绛夊 */
.push-action-btn {
  flex: 1 1 auto;
  white-space: nowrap;
}
/* 灏忓睆锛歵orch-group 鍜?toolbar-right 鍚勫崰涓€琛?*/
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

/* 宸查€夎处鍙锋爣绛?*/
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

/* 鏍囩寮忚处鍙烽€夋嫨鍣?*/
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

/* 缁熻鏍?*/
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

/* 瀹氭椂鎺у埗妯″潡 */
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
/* 灏忓睆鑷€傚簲 */
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

/* 鍗＄墖缃戞牸 */
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

/* 鍗曚釜鍗＄墖 */
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

/* 绱у噾澶撮儴 - 鍗曡 */
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
.dot-idle {
  background: #c0c4cc;
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

/* 杩涘害鏉?鍊掕鏃?*/
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

.push-empty {
  text-align: center;
  padding: 32px 0;
  color: #bbb;
  font-size: 13px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e4e7ed;
}

/* 鏃ュ織鍖哄煙 */
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
</style>
