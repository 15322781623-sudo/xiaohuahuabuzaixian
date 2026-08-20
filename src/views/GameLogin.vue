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
        <!-- 顶部统计 + 操作 -->
        <div class="panel-header-card">
          <div class="stat-row">
            <div class="mini-stat">
              <span class="mini-label">已选</span>
              <span class="mini-val text-blue">{{ selectedTokenIds.length }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="mini-stat">
              <span class="mini-label">已登录</span>
              <span class="mini-val text-green">{{ iframeList.length }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="mini-stat">
              <span class="mini-label">总数</span>
              <span class="mini-val">{{ tokenStore.gameTokens.length }}</span>
            </div>
          </div>
          <div class="action-bar">
            <n-button-group size="small">
              <n-button @click="selectAll" :type="isAllSelected ? 'primary' : 'default'" ghost size="small">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </n-button>
              <n-button @click="selectInverse" ghost size="small">反选</n-button>
            </n-button-group>
            <n-button type="success" size="small" :disabled="selectedTokenIds.length === 0 || isBatchOpening" :loading="isBatchOpening" @click="batchLogin">
              🎮 登录({{ selectedTokenIds.length }})
            </n-button>
            <div class="action-bar-secondary">
              <n-button type="error" size="small" :disabled="iframeList.length === 0" @click="exitAll" quaternary>
                ✖ 退出
              </n-button>
              <n-button type="warning" size="small" :disabled="selectedTokenIds.length === 0" @click="batchDeleteTokens" quaternary>
                🗑
              </n-button>
              <n-button size="small" type="primary" @click="goAddToken" quaternary>
                ➕
              </n-button>
            </div>
          </div>
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
          <!-- 分组信息 -->
          <template v-if="syncEnabled">
            <span v-if="syncGroupStats.length > 0" class="sync-groups-info">
              <span v-for="g in syncGroupStats" :key="g.color" class="sync-group-chip">
                <span class="sync-group-dot" :style="{ background: g.color }"></span>
                <span :style="{ color: g.color }">{{ g.name }}</span>
                <span style="color:#888;">{{ g.count }}</span>
                <span v-if="g.masterName" :style="{ color: g.color }" title="主窗口">⚑{{ g.masterName }}</span>
              </span>
            </span>
            <span v-if="syncUngroupedCount > 0" class="sync-ungrouped">
              <span style="color:#888;">未分组 {{ syncUngroupedCount }}</span>
            </span>
            <span v-if="syncGroupStats.length === 0 && syncUngroupedCount > 0" style="font-size:10px;color:#888;">
              {{ iframeList.length }}个窗口全局同步
            </span>
          </template>
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

        <!-- 本地资源管理 -->
        <div class="script-section">
          <div class="script-header" @click="localResCollapsed = !localResCollapsed" style="cursor:pointer;">
            <span style="font-size:12px;font-weight:500;">📦 本地资源管理<span v-if="localRes.enabled && localRes.count" style="color:#18a058;"> ({{ localRes.count }}项)</span></span>
            <span style="font-size:10px;color:#aaa;">{{ localResCollapsed ? '▶' : '▼' }}</span>
          </div>
          <div v-show="!localResCollapsed" style="padding:6px 12px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <n-switch :value="localRes.enabled" size="small" @update:value="toggleLocalRes" />
              <span style="font-size:11px;">启用后优先加载本地资源</span>
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              <n-input :value="localRes.fileName" placeholder="未选择资源文件 (.asar)" size="tiny" readonly style="flex:1;" />
              <n-button size="tiny" @click="pickLocalResFile">设置</n-button>
              <n-button size="tiny" @click="clearLocalRes">清空</n-button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:11px;color:#888;">贴图模式</span>
              <n-radio-group :value="localRes.mode" size="small" @update:value="setLocalResMode">
                <n-radio value="default">默认</n-radio>
                <n-radio value="dds">DDS</n-radio>
              </n-radio-group>
            </div>
            <div style="font-size:10px;color:#888;">{{ localRes.statusText }}</div>
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
              <span style="font-size: 10px; color: #999;">{{ tokenListCollapsed ? '▼' : '▲' }}</span>
            </div>
          </div>
          <div v-show="!tokenListCollapsed" class="token-section-body">
          <!-- 分组管理栏 -->
          <div class="group-toolbar">
            <div class="group-chips">
              <div
                class="group-chip"
                :class="{ 'is-active': !activeGroupId }"
                @click="activeGroupId = null"
              >全部</div>
              <div
                v-for="group in loginGroups"
                :key="group.id"
                class="group-chip"
                :class="{ 'is-active': activeGroupId === group.id, 'is-drag-over': dragOverGroupId === group.id }"
                :style="{
                  borderColor: group.color,
                  backgroundColor: dragOverGroupId === group.id ? group.color : (activeGroupId === group.id ? group.color : 'transparent'),
                  color: (activeGroupId === group.id || dragOverGroupId === group.id) ? '#fff' : group.color,
                }"
                @click="selectGroup(group.id)"
                @dblclick.stop="renameGroup(group.id)"
                @contextmenu.prevent="deleteGroup(group.id)"
                @dragover.prevent.stop="dragOverGroupId = group.id"
                @dragleave="dragOverGroupId = null"
                @drop.prevent.stop="onGroupDrop($event, group.id)"
                :title="`${group.name} (${getGroupTokenCount(group.id)}个账号) - 拖拽账号到此分组 / 双击重命名 / 右键删除分组`"
              >{{ group.name }}({{ getGroupTokenCount(group.id) }})</div>
              <div class="group-chip group-add-btn" @click.stop="showNewGroupInput = !showNewGroupInput" title="新建分组">+ 新分组</div>
              <div class="group-chip group-io-btn" @click.stop="exportLoginGroups" title="导出所有分组配置">📤</div>
              <div class="group-chip group-io-btn" @click.stop="triggerImportGroups" title="导入分组配置">📥</div>
              <input ref="importGroupInputRef" type="file" accept=".json,.aiking" style="display:none" @change="importLoginGroups" />
            </div>
            <!-- 新建分组输入 -->
            <div v-if="showNewGroupInput" class="group-new-input">
              <input
                v-model="newGroupName"
                placeholder="分组名称"
                class="group-input-field"
                @keyup.enter="createNewGroup"
                @click.stop
              />
              <div class="group-color-picker">
                <span
                  v-for="c in GROUP_PRESET_COLORS"
                  :key="c"
                  class="group-color-dot"
                  :class="{ 'is-selected': newGroupColor === c }"
                  :style="{ background: c }"
                  @click.stop="newGroupColor = c"
                ></span>
              </div>
              <n-button size="tiny" type="primary" @click="createNewGroup">创建</n-button>
              <n-button size="tiny" quaternary @click="showNewGroupInput = false">取消</n-button>
            </div>
            <!-- 分组操作栏 -->
            <div v-if="activeGroupId" class="group-actions">
              <n-button size="tiny" text @click="selectAllInGroup(activeGroupId)">全选</n-button>
              <n-button size="tiny" type="primary" text @click="assignSelectedToGroup(activeGroupId)">➕ 分配</n-button>
              <n-button size="tiny" type="warning" text @click="removeSelectedFromGroup(activeGroupId)">➖ 移除</n-button>
              <n-button size="tiny" type="error" text @click="deleteGroup(activeGroupId)">🗑 删除</n-button>
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
                  <span v-for="g in getLoginTokenGroups(token.id)" :key="g.id" class="token-group-dot" :style="{ background: g.color }" :title="g.name"></span>
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
                  <n-button size="tiny" type="error" text @click.stop="deleteSingleToken(token.id)" title="删除此账号">🗑</n-button>
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
              <div class="cell-header" :class="{ 'cell-grouped-header': getTokenGroup(item.tokenId) }" :style="getTokenGroup(item.tokenId) ? { borderLeft: `3px solid ${getTokenGroup(item.tokenId)}` } : {}">
                <span class="cell-name">{{ item.name }}<span v-if="getTokenGroup(item.tokenId)" class="cell-group-tag" :style="{ color: getTokenGroup(item.tokenId) }">{{ getTokenGroupName(item.tokenId) }}</span></span>
                <div class="cell-actions">
                  <!-- 分组按钮: 登录分组自动着色，仅未分组的token可手动切换颜色，右键取消手动分组 -->
                  <span
                    v-if="iframeList.length > 1"
                    class="cell-btn cell-group-btn"
                    :class="{ 'has-group': getTokenGroup(item.tokenId), 'is-auto-group': isTokenInLoginGroup(item.tokenId) }"
                    :style="getTokenGroup(item.tokenId) ? { color: getTokenGroup(item.tokenId), textShadow: `0 0 6px ${getTokenGroup(item.tokenId)}88` } : {}"
                    :title="isTokenInLoginGroup(item.tokenId) ? `登录分组：${getTokenGroupName(item.tokenId)}` : (getTokenGroup(item.tokenId) ? `${getTokenGroupName(item.tokenId)}色分组 - 点击切换颜色，右键移除` : '点击分配分组颜色')"
                    @click.stop="!isTokenInLoginGroup(item.tokenId) && cycleSyncGroup(item.tokenId)"
                    @contextmenu.prevent="!isTokenInLoginGroup(item.tokenId) && clearSyncGroup(item.tokenId)">●</span>
                  <!-- 主窗口按钮: 设为当前分组的master（同步开启时显示） -->
                  <span
                    v-if="iframeList.length > 1 && syncEnabled"
                    :class="['cell-btn', 'cell-master-btn', { 'is-master': isTokenMaster(item.tokenId) }]"
                    :style="isTokenMaster(item.tokenId) && getTokenGroup(item.tokenId) ? { color: getTokenGroup(item.tokenId), textShadow: `0 0 6px ${getTokenGroup(item.tokenId)}99` } : {}"
                    :title="isTokenMaster(item.tokenId) ? '取消主窗口' : '设为主窗口（仅该窗口操作同步到同组窗口）'"
                    @click.stop="setSyncMaster(item.tokenId)">⚑</span>
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

    <!-- 添加Token弹窗 -->
    <n-modal
      v-model:show="showAddTokenModal"
      preset="card"
      :bordered="false"
      style="width: 92%; max-width: 680px; max-height: 85vh;"
      content-style="overflow-y: auto; max-height: calc(85vh - 60px); padding: 0 20px 20px;"
      header-style="padding: 16px 20px 12px; border-bottom: 1px solid rgba(0,0,0,0.06);"
    >
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 15px;">添加游戏Token</span>
          <n-radio-group size="small" v-model:value="addTokenImportMethod">
            <n-radio-button value="wxQrcode">微信扫码</n-radio-button>
            <n-radio-button value="bin">BIN多角色</n-radio-button>
            <n-radio-button value="singlebin">BIN单角色</n-radio-button>
            <n-radio-button value="manual">手动输入</n-radio-button>
            <n-radio-button value="url">URL获取</n-radio-button>
          </n-radio-group>
        </div>
      </template>
      <ManualTokenForm
        v-if="addTokenImportMethod === 'manual'"
        @cancel="showAddTokenModal = false"
        @ok="showAddTokenModal = false"
      />
      <UrlTokenForm
        v-if="addTokenImportMethod === 'url'"
        @cancel="showAddTokenModal = false"
        @ok="showAddTokenModal = false"
      />
      <WxQrcodeForm
        v-if="addTokenImportMethod === 'wxQrcode'"
        @cancel="showAddTokenModal = false"
        @ok="showAddTokenModal = false"
      />
      <BinTokenForm
        v-if="addTokenImportMethod === 'bin'"
        @cancel="showAddTokenModal = false"
        @ok="showAddTokenModal = false"
      />
      <SingleBinTokenForm
        v-if="addTokenImportMethod === 'singlebin'"
        @cancel="showAddTokenModal = false"
        @ok="showAddTokenModal = false"
      />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useTokenStore, gameTokens } from '@/stores/tokenStore';
import { useMessage } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';
import useIndexedDB from '@/hooks/useIndexedDB';
import { getBinBackupWithFallback } from '@/utils/binBackup';
import { g_utils } from '@/utils/bonProtocol';
import ManualTokenForm from '@/views/TokenImport/manual.vue';
import UrlTokenForm from '@/views/TokenImport/url.vue';
import BinTokenForm from '@/views/TokenImport/bin.vue';
import SingleBinTokenForm from '@/views/TokenImport/singlebin.vue';
import WxQrcodeForm from '@/views/TokenImport/wxqrcode.vue';
import { pickAsarFile, restoreAsarFile, requestStoredAsarFile, clearAsarHandle, parseAsarIndex } from '@/utils/localResManager';
import { ENHANCE_KEY, ENHANCE_CODES_KEY, SCRIPTS_KEY, ENHANCEMENTS, ENHANCE_CODE, DEFAULT_ENABLED, PANEL_ENHANCER_FILE, PANEL_ENHANCER_DEPS, loadScriptFile, buildAndCacheEnhanceCodes } from '@/utils/gameEnhanceConfig';
import { getKV, setKV } from '@/utils/tokenDb';

const message = useMessage();
const tokenStore = useTokenStore();
const router = useRouter();
const route = useRoute();
const { getArrayBuffer, storeArrayBuffer } = useIndexedDB();

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

const tokenListCollapsed = ref(false);

// ── 分组管理（独立于批量日常的tokenGroups，游戏登录页专用） ──
const loginGroups = ref(JSON.parse(localStorage.getItem('loginGroups') || '[]'));
function saveLoginGroups() {
  localStorage.setItem('loginGroups', JSON.stringify(loginGroups.value));
}
function getLoginGroupTokenIds(groupId) {
  const group = loginGroups.value.find(g => g.id === groupId);
  if (!group) return [];
  const validIds = new Set(gameTokens.value.map(t => t.id));
  return group.tokenIds.filter(id => validIds.has(id));
}
function getLoginTokenGroups(tokenId) {
  return loginGroups.value.filter(g => g.tokenIds.includes(tokenId));
}
const activeGroupId = ref(null);        // 当前选中的分组ID（null=显示全部）
const newGroupName = ref('');             // 新建分组名称
const newGroupColor = ref('#1677ff');     // 新建分组颜色
const showNewGroupInput = ref(false);     // 是否显示新建分组输入框
const GROUP_PRESET_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#faad14'];

function createNewGroup() {
  const name = newGroupName.value.trim();
  if (!name) { message.warning('请输入分组名称'); return; }
  loginGroups.value.push({
    id: `lg_${Date.now()}${Math.random().toString(36).slice(2)}`,
    name,
    color: newGroupColor.value,
    tokenIds: [],
  });
  saveLoginGroups();
  addLog(`➕ 新建分组: ${name}`, 'success');
  newGroupName.value = '';
  showNewGroupInput.value = false;
}
function selectGroup(groupId) {
  activeGroupId.value = activeGroupId.value === groupId ? null : groupId;
}
function assignSelectedToGroup(groupId) {
  if (selectedTokenIds.value.length === 0) { message.warning('请先勾选账号'); return; }
  const group = loginGroups.value.find(g => g.id === groupId);
  if (!group) return;
  let count = 0;
  selectedTokenIds.value.forEach(tid => {
    if (!group.tokenIds.includes(tid)) {
      group.tokenIds.push(tid);
      count++;
    }
  });
  saveLoginGroups();
  addLog(`📁 已将 ${count} 个账号分配到「${group.name}」`, 'success');
}
function removeSelectedFromGroup(groupId) {
  if (selectedTokenIds.value.length === 0) { message.warning('请先勾选账号'); return; }
  const group = loginGroups.value.find(g => g.id === groupId);
  if (!group) return;
  const before = group.tokenIds.length;
  group.tokenIds = group.tokenIds.filter(id => !selectedTokenIds.value.includes(id));
  const count = before - group.tokenIds.length;
  saveLoginGroups();
  addLog(`📁 已从「${group.name}」移除 ${count} 个账号`, 'info');
}
function renameGroup(groupId) {
  const group = loginGroups.value.find(g => g.id === groupId);
  if (!group) return;
  const newName = prompt('重命名分组', group.name);
  if (newName && newName.trim() && newName.trim() !== group.name) {
    group.name = newName.trim();
    saveLoginGroups();
    addLog(`✏️ 分组已重命名为「${group.name}」`, 'info');
  }
}
function deleteGroup(groupId) {
  const idx = loginGroups.value.findIndex(g => g.id === groupId);
  if (idx === -1) return;
  const name = loginGroups.value[idx].name;
  loginGroups.value.splice(idx, 1);
  saveLoginGroups();
  if (activeGroupId.value === groupId) activeGroupId.value = null;
  addLog(`🗑️ 已删除分组「${name}」`, 'info');
}
function getGroupTokenCount(groupId) {
  return getLoginGroupTokenIds(groupId).length;
}
function selectAllInGroup(groupId) {
  selectedTokenIds.value = [...getLoginGroupTokenIds(groupId)];
}
// 导出分组配置（混淆加密）
const importGroupInputRef = ref(null);
const _LG_KEY = 'xyzw_login_groups_2026'; // XOR密钥
function _lgXor(data) {
  const key = _LG_KEY;
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key.charCodeAt(i % key.length);
  }
  return out;
}
function _lgEncrypt(jsonStr) {
  const raw = new TextEncoder().encode(jsonStr);
  const xored = _lgXor(raw);
  // 添加魔数头 0x41 0x4B ('AK') + base64
  const header = new Uint8Array([0x41, 0x4B]);
  const combined = new Uint8Array(header.length + xored.length);
  combined.set(header);
  combined.set(xored, header.length);
  // 分块转换避免栈溢出
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < combined.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, combined.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
function _lgDecrypt(b64Str) {
  const raw = Uint8Array.from(atob(b64Str), c => c.charCodeAt(0));
  // 检查魔数头
  if (raw[0] !== 0x41 || raw[1] !== 0x4B) throw new Error('无效加密文件');
  const xored = raw.slice(2);
  const decrypted = _lgXor(xored);
  return new TextDecoder().decode(decrypted);
}
async function exportLoginGroups() {
  // 导出全部账号数据 + IndexedDB中的BIN数据
  const tokenMap = {};
  for (const t of tokenStore.gameTokens) {
    const tokenData = { ...t };
    // 读取BIN数据（ArrayBuffer -> base64）
    try {
      let binData = await getArrayBuffer(t.id);
      if (!binData) binData = await getArrayBuffer(t.name);
      if (!binData) binData = await getBinBackupWithFallback(t.id, t.name); // 兜底：localStorage 备份
      if (binData) {
        const bytes = new Uint8Array(binData);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        tokenData._binBase64 = btoa(binary);
      }
    } catch { /* 无BIN数据则跳过 */ }
    tokenMap[t.id] = tokenData;
  }
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    loginGroups: loginGroups.value,
    tokens: tokenMap,
  };
  const encrypted = _lgEncrypt(JSON.stringify(data));
  const blob = new Blob([encrypted], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `group-${Date.now()}.aiking`;
  a.click();
  URL.revokeObjectURL(url);
  const tokenCount = Object.keys(tokenMap).length;
  addLog(`📤 已导出 ${loginGroups.value.length} 个分组 + ${tokenCount} 个账号（加密）`, 'success');
}
function triggerImportGroups() {
  importGroupInputRef.value?.click();
}
async function importLoginGroups(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const content = ev.target.result;
      let parsed;
      // 尝试解密（加密格式）
      if (file.name.endsWith('.aiking') || !content.trim().startsWith('{') && !content.trim().startsWith('[')) {
        try {
          const jsonStr = _lgDecrypt(content.trim());
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error('文件解密失败或格式无效');
        }
      } else {
        parsed = JSON.parse(content);
      }
      // 解析数据
      const groups = parsed.loginGroups || (Array.isArray(parsed) ? parsed : []);
      const tokenMap = parsed.tokens || {};
      if (!Array.isArray(groups)) throw new Error('格式错误');
      // 先导入账号数据 + BIN数据
      let tokensAdded = 0;
      for (const [tid, tData] of Object.entries(tokenMap)) {
        const exists = tokenStore.gameTokens.find(t => t.id === tid);
        if (!exists && tData.token) {
          tokenStore.addToken({
            id: tData.id || tid,
            name: tData.name || '未命名',
            token: tData.token,
            wsUrl: tData.wsUrl || null,
            server: tData.server || '',
            remark: tData.remark || '',
            importMethod: tData.importMethod || 'manual',
          });
          tokensAdded++;
        }
        // 恢复BIN数据到IndexedDB
        if (tData._binBase64) {
          try {
            const binary = atob(tData._binBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            await storeArrayBuffer(tid, bytes.buffer);
          } catch { /* BIN恢复失败跳过 */ }
        }
      }
      // 再导入分组
      let added = 0;
      groups.forEach(g => {
        if (!g.name || !g.id) return;
        const existing = loginGroups.value.find(eg => eg.id === g.id);
        if (existing) {
          const newIds = (g.tokenIds || []).filter(id => !existing.tokenIds.includes(id));
          existing.tokenIds.push(...newIds);
        } else {
          loginGroups.value.push({
            id: g.id,
            name: g.name,
            color: g.color || '#1677ff',
            tokenIds: g.tokenIds || [],
          });
          added++;
        }
      });
      saveLoginGroups();
      addLog(`📥 导入 ${added} 个新分组 + ${tokensAdded} 个新账号`, 'success');
    } catch (err) {
      addLog(`❗ 导入失败: ${err.message}`, 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}
const isBatchOpening = ref(false);
const openingTokenId = ref(null);
const logs = ref([]);
const logCollapsed = ref(false);

// ── 脚本管理 ──
const scripts = ref([]);
const scriptCollapsed = ref(false);
const showScriptModal = ref(false);
const editingScriptId = ref(null);
const scriptForm = reactive({ name: '', code: '' });
const fileInputRef = ref(null);

// ── 游戏增强功能 ──
// ★ ENHANCE_KEY / ENHANCEMENTS / ENHANCE_CODE 等已从 gameEnhanceConfig.js 导入

// ★ WFM_HELPER / ENHANCE_CODE 已从 gameEnhanceConfig.js 导入

// 增强功能开关状态
const enhancementState = reactive({});
try {
  const saved = JSON.parse(localStorage.getItem(ENHANCE_KEY) || '{}');
  Object.assign(enhancementState, saved);
} catch(e) {}
// 默认启用的增强功能（首次使用时自动开启）
// ★ DEFAULT_ENABLED 已从 gameEnhanceConfig.js 导入
// 确保所有功能都有默认值
ENHANCEMENTS.forEach(e => { if (enhancementState[e.key] === undefined) enhancementState[e.key] = DEFAULT_ENABLED.has(e.key); });

// ★ DEFAULT_ENABLED / ENHANCE_CODES_KEY / PANEL_ENHANCER_FILE / PANEL_ENHANCER_DEPS 已导入

// 通用面板增强器：为下列文件型增强的 DOM 面板统一提供拖动转移 + 手机/电脑宽高自适应
// ★ PANEL 常量已导入
const needPanelEnhancer = () => PANEL_ENHANCER_DEPS.some(k => enhancementState[k]);

function saveEnhancements() {
  localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancementState));
  // ★ 同步缓存增强代码到 localStorage，供 game.html 独立窗口自注入
  cacheEnhanceCodes();
}

// 收集所有已启用增强的代码并缓存（调用共享模块）
async function cacheEnhanceCodes() {
  await buildAndCacheEnhanceCodes(enhancementState, scripts.value);
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

// ── 本地资源管理（asar 贴图优先加载）──
const LOCAL_RES_CONFIG_KEY = '__local_res_config__';
const LOCAL_RES_FILE = 'enhance-scripts/local_res_dds.js';
const localResCollapsed = ref(true);
const localRes = reactive({ enabled: false, mode: 'dds', fileName: '', count: 0, needPermission: false, statusText: '未选择资源文件' });
try {
  const savedRes = JSON.parse(localStorage.getItem(LOCAL_RES_CONFIG_KEY) || '{}');
  if (typeof savedRes.enabled === 'boolean') localRes.enabled = savedRes.enabled;
  if (savedRes.mode === 'default' || savedRes.mode === 'dds') localRes.mode = savedRes.mode;
} catch(e) {}
let _localResFile = null;      // asar File 对象（惰性 slice 读取，不整体载入内存）
let _localResIndex = null;     // uuid → {offset, size}
let _localResDataOffset = 0;   // asar 数据区基址

// 提供给 game.html 注入脚本的资源读取器（同源 iframe 直接引用）
const localResProvider = {
  get count() { return localRes.count; },
  has(uuid) { return !!(_localResIndex && _localResIndex.has(uuid)); },
  read(uuid) {
    const entry = _localResIndex && _localResIndex.get(uuid);
    if (!entry || !_localResFile) return Promise.reject(new Error('资源不存在: ' + uuid));
    return _localResFile.slice(_localResDataOffset + entry.offset, _localResDataOffset + entry.offset + entry.size).arrayBuffer();
  }
};

function saveLocalResConfig() {
  localStorage.setItem(LOCAL_RES_CONFIG_KEY, JSON.stringify({ enabled: localRes.enabled, mode: localRes.mode }));
}

function updateLocalResStatus() {
  if (!_localResIndex) {
    localRes.statusText = localRes.needPermission ? '需重新授权，点击「设置」恢复上次文件' : '未选择资源文件';
  } else if (!localRes.enabled) {
    localRes.statusText = `已就绪未启用: ${localRes.fileName} (${localRes.count} 项)`;
  } else if (localRes.mode === 'dds') {
    localRes.statusText = `DDS: 使用 ${localRes.fileName} 加载 (${localRes.count} 项贴图)`;
  } else {
    localRes.statusText = `默认模式: 不替换贴图 (${localRes.fileName} 已就绪)`;
  }
}

async function applyLocalResFile(file) {
  localRes.statusText = '正在解析资源索引...';
  const { index, dataOffset, count } = await parseAsarIndex(file);
  _localResFile = file;
  _localResIndex = index;
  _localResDataOffset = dataOffset;
  localRes.fileName = file.name;
  localRes.count = count;
  localRes.needPermission = false;
}

// 同步启用状态/贴图模式到所有已打开的游戏窗口
function broadcastLocalResConfig() {
  iframeList.value.forEach(f => {
    const el = iframeRefs[f.tokenId];
    if (!el || !el.contentWindow) return;
    try {
      el.contentWindow.__localResProvider = localResProvider;
      el.contentWindow.__localResConfig = { enabled: localRes.enabled, mode: localRes.mode };
    } catch(e) {}
  });
}

// 向已打开的游戏窗口补注入本地资源脚本（开启开关时）
async function injectLocalResScript() {
  const code = await loadScriptFile(LOCAL_RES_FILE);
  if (!code) return;
  iframeList.value.forEach(f => {
    const el = iframeRefs[f.tokenId];
    if (!el || !el.contentWindow) return;
    try { el.contentWindow.postMessage({ type: 'INJECT_SCRIPT', name: '本地资源', code }, '*'); } catch(e) {}
  });
}

function toggleLocalRes(v) {
  localRes.enabled = v;
  saveLocalResConfig();
  updateLocalResStatus();
  broadcastLocalResConfig();
  if (v) injectLocalResScript();
}

function setLocalResMode(v) {
  localRes.mode = v;
  saveLocalResConfig();
  updateLocalResStatus();
  broadcastLocalResConfig();
}

async function pickLocalResFile() {
  try {
    // 已有持久化句柄时优先恢复授权，免重选文件
    let file = localRes.needPermission ? await requestStoredAsarFile() : null;
    if (!file) file = await pickAsarFile();
    await applyLocalResFile(file);
    updateLocalResStatus();
    broadcastLocalResConfig();
    if (localRes.enabled) injectLocalResScript();
    addLog(`📦 本地资源已加载: ${file.name} (${localRes.count} 项)`, 'success');
  } catch (e) {
    if (e && e.name === 'AbortError') return; // 用户取消选择
    localRes.statusText = '❗ 加载失败: ' + e.message;
    addLog(`❗ 本地资源加载失败: ${e.message}`, 'error');
  }
}

function clearLocalRes() {
  _localResFile = null;
  _localResIndex = null;
  _localResDataOffset = 0;
  localRes.fileName = '';
  localRes.count = 0;
  localRes.needPermission = false;
  clearAsarHandle();
  updateLocalResStatus();
  broadcastLocalResConfig();
}

// 启动时尝试恢复上次选择的 asar 文件（已授权则静默恢复）
async function initLocalRes() {
  try {
    const restored = await restoreAsarFile();
    if (restored && restored.file) {
      await applyLocalResFile(restored.file);
    } else if (restored && restored.needPermission) {
      localRes.needPermission = true;
    }
  } catch(e) {
    console.warn('[本地资源] 恢复失败:', e.message);
  }
  updateLocalResStatus();
  broadcastLocalResConfig();
}
initLocalRes();

// ★ loadScriptFile 已从 gameEnhanceConfig.js 导入

// 从 IndexedDB 加载用户自定义脚本（localStorage 空间不足时自动迁移）
(async () => {
  try {
    // 优先从 IndexedDB 加载
    const idbData = await getKV(SCRIPTS_KEY);
    if (idbData) {
      scripts.value = idbData;
      console.log('[JS脚本] 从 IndexedDB 加载成功，共', scripts.value.length, '个');
      return;
    }
    // 回退：尝试 localStorage（兼容旧数据）
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (raw) {
      const parsedData = JSON.parse(raw);
      scripts.value = parsedData;
      console.log('[JS脚本] 从 localStorage 加载成功，共', parsedData.length, '个，正在迁移到 IndexedDB...');
      // 迁移到 IndexedDB（使用纯对象，避免 Vue Proxy 导致 DataCloneError）
      await setKV(SCRIPTS_KEY, parsedData);
      console.log('[JS脚本] 迁移到 IndexedDB 完成');
    }
  } catch(e) {
    console.error('[JS脚本] 加载失败:', e);
  }
})();

async function saveScriptsToStorage() {
  try {
    // 将 Vue 响应式代理转为纯对象，避免 IndexedDB DataCloneError
    const plainData = JSON.parse(JSON.stringify(scripts.value));
    await setKV(SCRIPTS_KEY, plainData);
    console.log('[JS脚本] 保存到 IndexedDB 成功，共', plainData.length, '个');
  } catch (e) {
    console.error('[JS脚本] 保存失败:', e);
    message.error('脚本保存失败：' + (e.message || '存储异常'));
  }
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
  const script = scripts.value.find(s => s.id === id);
  if (script && !confirm(`确定删除脚本「${script.name}」？`)) return;
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
  // 面板增强器前置注入（拖动 + 宽高自适应）
  if (needPanelEnhancer()) {
    fileLoads.push(loadScriptFile(PANEL_ENHANCER_FILE).then(code => {
      if (code) codes.unshift({ name: '面板增强器', code });
    }));
  }
  // 本地资源优先加载（asar DDS 贴图）
  if (localRes.enabled) {
    try {
      el.contentWindow.__localResProvider = localResProvider;
      el.contentWindow.__localResConfig = { enabled: localRes.enabled, mode: localRes.mode };
    } catch(e) {}
    fileLoads.push(loadScriptFile(LOCAL_RES_FILE).then(code => {
      if (code) codes.push({ name: '本地资源', code });
    }));
  }
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
  // 恢复同步状态（iframe刷新后_syncEnabled被重置）
  if (syncEnabled.value) {
    const group = getTokenGroup(tokenId);
    const groupKey = group || '__ungrouped__';
    const master = syncMasterMap[groupKey];
    const shouldEnable = !master || tokenId === master;
    try { el.contentWindow._syncEnabled = shouldEnable; } catch(e) {}
  }
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
const dragOverGroupId = ref(null); // 拖拽悬停的分组ID
let dragEnterCount = 0;

function onDragStart(e, token) {
  dragTokenId.value = token.id;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', token.id);
}
function onDragEnd() {
  dragTokenId.value = null;
  isDragOver.value = false;
  dragOverGroupId.value = null;
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
// 拖拽账号到分组chip上 -> 添加到该分组
function onGroupDrop(e, groupId) {
  dragOverGroupId.value = null;
  const tokenId = e.dataTransfer.getData('text/plain') || dragTokenId.value;
  if (!tokenId) return;
  const group = loginGroups.value.find(g => g.id === groupId);
  if (!group) return;
  const token = tokenStore.gameTokens.find(t => t.id === tokenId);
  if (!token) return;
  if (group.tokenIds.includes(tokenId)) {
    addLog(`ℹ️ ${token.name} 已在「${group.name}」中`, 'info');
    return;
  }
  group.tokenIds.push(tokenId);
  saveLoginGroups();
  addLog(`📁 ${token.name} 已拖入「${group.name}」`, 'success');
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

// ── 同步控制（分组多主控） ──
const syncEnabled = ref(false);
const syncGroupMap = reactive({});   // tokenId -> groupColor (null=无分组，与所有无分组窗口互相同步)
const syncMasterMap = reactive({});  // groupColor -> masterTokenId (null=组内任意窗口均可触发)

const GROUP_COLORS = ['#8B5CF6', '#F97316', '#3B82F6', '#10B981', '#EF4444', '#EC4899'];
const GROUP_NAMES = ['紫', '橙', '蓝', '绿', '红', '粉'];

// 获取token所属的登录分组（优先）或手动同步分组
function getTokenGroup(tokenId) {
  // 优先：检查是否属于登录分组
  const loginGroup = loginGroups.value.find(g => g.tokenIds.includes(tokenId));
  if (loginGroup && loginGroup.color) return loginGroup.color;
  // 兜底：手动同步分组
  return syncGroupMap[tokenId] || null;
}
function getTokenGroupName(tokenId) {
  // 优先：返回登录分组名称
  const loginGroup = loginGroups.value.find(g => g.tokenIds.includes(tokenId));
  if (loginGroup) return loginGroup.name;
  // 兜底：手动分组颜色名
  const color = syncGroupMap[tokenId];
  if (!color) return '';
  const idx = GROUP_COLORS.indexOf(color);
  return idx >= 0 ? GROUP_NAMES[idx] : '';
}
// 判断token的分组是否来自登录分组（不可手动修改）
function isTokenInLoginGroup(tokenId) {
  return loginGroups.value.some(g => g.tokenIds.includes(tokenId));
}
function getTokenGroupIndex(tokenId) {
  const color = syncGroupMap[tokenId];
  if (!color) return -1;
  return GROUP_COLORS.indexOf(color);
}
// 获取分组统计: [{ color, name, count, masterName }]
const syncGroupStats = computed(() => {
  const map = {};
  iframeList.value.forEach(item => {
    const color = getTokenGroup(item.tokenId);
    if (color) {
      if (!map[color]) {
        map[color] = { color, name: getTokenGroupName(item.tokenId) || '?', count: 0, masterName: '' };
      }
      map[color].count++;
    }
  });
  Object.entries(syncMasterMap).forEach(([color, masterId]) => {
    if (map[color] && masterId) {
      const m = iframeList.value.find(i => i.tokenId === masterId);
      if (m) map[color].masterName = m.name;
    }
  });
  return Object.values(map);
});
// 未分组的窗口数
const syncUngroupedCount = computed(() =>
  iframeList.value.filter(i => !getTokenGroup(i.tokenId)).length
);

// 点击 ● 循环切换分组颜色
function cycleSyncGroup(tokenId) {
  const current = syncGroupMap[tokenId] || null;
  if (current) {
    delete syncGroupMap[tokenId];
    // 如果该分组的master是此token，清除master
    if (syncMasterMap[current] === tokenId) delete syncMasterMap[current];
  }
  const oldColor = current;
  const idx = oldColor ? GROUP_COLORS.indexOf(oldColor) : -1;
  const nextIdx = (idx + 1) % GROUP_COLORS.length;
  syncGroupMap[tokenId] = GROUP_COLORS[nextIdx];
  const item = iframeList.value.find(i => i.tokenId === tokenId);
  addLog(`🎨 ${item?.name || '?'}: 分配到${GROUP_NAMES[nextIdx]}色分组`, 'info');
  // 刷新_syncEnabled
  if (syncEnabled.value) updateAllSyncEnabled();
}
// 右键取消分组
function clearSyncGroup(tokenId) {
  const color = syncGroupMap[tokenId];
  if (!color) return;
  delete syncGroupMap[tokenId];
  if (syncMasterMap[color] === tokenId) delete syncMasterMap[color];
  const item = iframeList.value.find(i => i.tokenId === tokenId);
  addLog(`🎨 ${item?.name || '?'}: 移除分组`, 'info');
  if (syncEnabled.value) updateAllSyncEnabled();
}

// 设为主窗口（当前窗口所属分组的master）
function setSyncMaster(tokenId) {
  const group = getTokenGroup(tokenId); // 可能为null(未分组)
  const groupKey = group || '__ungrouped__';
  if (syncMasterMap[groupKey] === tokenId) {
    // 取消master
    delete syncMasterMap[groupKey];
    const item = iframeList.value.find(i => i.tokenId === tokenId);
    const gName = group ? `${getTokenGroupName(tokenId)}色分组` : '全局';
    addLog(`📡 ${item?.name || '?'}: 取消${gName}主窗口`, 'info');
  } else {
    syncMasterMap[groupKey] = tokenId;
    const item = iframeList.value.find(i => i.tokenId === tokenId);
    const gName = group ? `${getTokenGroupName(tokenId)}色分组` : '全局';
    addLog(`📡 ${item?.name || '?'}: 设为${gName}主窗口，仅该窗口操作同步到同组`, 'success');
  }
  if (syncEnabled.value) updateAllSyncEnabled();
}

// 判断某token是否为所在分组的master
function isTokenMaster(tokenId) {
  const group = getTokenGroup(tokenId);
  const groupKey = group || '__ungrouped__';
  return syncMasterMap[groupKey] === tokenId;
}

// 统一更新所有iframe的_syncEnabled
function updateAllSyncEnabled() {
  if (!syncEnabled.value) return;
  iframeList.value.forEach(item => {
    const el = iframeRefs[item.tokenId];
    if (el && el.contentWindow) {
      const group = getTokenGroup(item.tokenId);
      const groupKey = group || '__ungrouped__';
      const master = syncMasterMap[groupKey];
      // 如果分组有master，只有master开启同步；无master则全组开启
      const shouldEnable = !master || item.tokenId === master;
      try { el.contentWindow._syncEnabled = shouldEnable; } catch(e) {}
    }
  });
}

function onSyncToggle(val) {
  syncEnabled.value = val;
  if (val) {
    updateAllSyncEnabled();
    let okCount = 0;
    iframeList.value.forEach(item => {
      const el = iframeRefs[item.tokenId];
      if (el && el.contentWindow) {
        try { if (el.contentWindow._syncEnabled) okCount++; } catch(e) {}
      }
    });
    const groupCount = syncGroupStats.value.length;
    const info = groupCount > 0
      ? `，${groupCount}个分组，${syncUngroupedCount.value}个未分组`
      : `，${iframeList.value.length}个窗口全局同步`;
    addLog(`📡 操作同步已开启 (${iframeList.value.length}个窗口${info})`, okCount > 0 ? 'success' : 'error');
  } else {
    iframeList.value.forEach(item => {
      const el = iframeRefs[item.tokenId];
      if (el && el.contentWindow) {
        try { el.contentWindow._syncEnabled = false; } catch(e) {}
      }
    });
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
      state.refreshCount = 0; // 连接成功后重置父窗口刷新计数
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
      // 注意：iframe 内的 count 在刷新后会归零，必须由父窗口累计计数防止无限刷新循环
      state.refreshCount = (state.refreshCount || 0) + 1;
      if (state.refreshCount <= 3) {
        addLog(`🔄 ${name}: 触发自动重连刷新 (第${state.refreshCount}次)...`, 'info');
        refreshSingle(tokenId);
      } else {
        addLog(`⛔ ${name}: 自动刷新已达3次上限，停止自动刷新，请手动处理`, 'warning');
        state.status = 'failed';
      }
      break;
    case 'ws_health':
    case 'ws_health_pong':
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

  // ── 操作同步（分组内转发） ──
  if (e.data.type !== 'GAME_INPUT_EVENT' || !syncEnabled.value) return;
  const sourceTokenId = e.data.tokenId;
  const sourceGroup = getTokenGroup(sourceTokenId) || null;
  const sourceGroupKey = sourceGroup || '__ungrouped__';
  // 如果分组设了master，只有master的事件才转发
  const sourceMaster = syncMasterMap[sourceGroupKey];
  if (sourceMaster && sourceTokenId !== sourceMaster) return;
  const evData = e.data.event;
  if (!evData) return;

  let count = 0;
  iframeList.value.forEach(item => {
    if (item.tokenId === sourceTokenId) return;
    // 只转发到同分组的窗口
    const targetGroup = getTokenGroup(item.tokenId) || null;
    if (targetGroup !== sourceGroup) return;
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
    const gName = sourceGroup ? getTokenGroupName(sourceTokenId) : '';
    addLog(`👆 ${src?.name || '?'} → ${count}个${gName ? gName+'色' : ''}窗口 (${evData.eventType})`, 'info');
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
  // 分组筛选
  if (activeGroupId.value) {
    const groupIds = getLoginGroupTokenIds(activeGroupId.value);
    tokens = tokens.filter(t => groupIds.includes(t.id));
  }
  // 搜索筛选
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
  if (!binData) binData = await getBinBackupWithFallback(token.id, token.name); // 兜底：localStorage 备份（云端恢复后 IndexedDB 可能为空）
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

  // 断开助手 WebSocket，避免与游戏内连接冲突导致顶号
  const wsStatus = tokenStore.getWebSocketStatus(token.id);
  if (wsStatus === "connected" || wsStatus === "connecting") {
    tokenStore.closeWebSocketConnection(token.id);
    addLog(`🔌 ${token.name}: 已断开助手连接，切换到游戏界面`, "info");
  }

  // APK 环境窗口数限制警告
  if (isApk() && iframeList.value.length >= APK_MAX_WINDOWS) {
    addLog(`⚠ APK 环境已开启 ${iframeList.value.length} 个窗口，继续开启可能导致内存不足崩溃`, 'warning');
    message.warning(`APK 环境建议不超过 ${APK_MAX_WINDOWS} 个游戏窗口，当前已有 ${iframeList.value.length} 个`);
  }

  const loginData = await decodeBinForToken(token);
  const loginKey = `__game_login_${token.id}__`;
  localStorage.setItem(loginKey, JSON.stringify(loginData));

  // ★ 支持微信小程序环境（蟠桃园等特殊活动）
  const gameUrl = `${window.location.origin}/game.html?token=${encodeURIComponent(token.id)}&platformExt=${encodeURIComponent(loginData.platformExt || 'mix')}`;
  
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
  // 清理分组状态
  Object.keys(syncGroupMap).forEach(k => delete syncGroupMap[k]);
  Object.keys(syncMasterMap).forEach(k => delete syncMasterMap[k]);
  // 清理 iframe 引用与重连状态，避免残留内存
  Object.keys(iframeRefs).forEach(k => delete iframeRefs[k]);
  Object.keys(wsReconnectState).forEach(k => delete wsReconnectState[k]);
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
  // 清理分组状态（含登录分组颜色对应的主控，getTokenGroup 优先返回登录分组色）
  const effectiveGroup = getTokenGroup(tokenId);
  if (effectiveGroup && syncMasterMap[effectiveGroup] === tokenId) delete syncMasterMap[effectiveGroup];
  const group = syncGroupMap[tokenId];
  if (group) {
    if (syncMasterMap[group] === tokenId) delete syncMasterMap[group];
    delete syncGroupMap[tokenId];
  }
  if (syncMasterMap['__ungrouped__'] === tokenId) delete syncMasterMap['__ungrouped__'];
  // 清理 iframe 引用与重连状态，避免残留
  delete iframeRefs[tokenId];
  delete wsReconnectState[tokenId];
  iframeList.value.splice(idx, 1);
  tokenStatusMap.value.set(tokenId, 'closed');
  tokenStatusMap.value = new Map(tokenStatusMap.value);
  addLog(`✖ ${name}: 已退出`, 'info');
}

// ── 删除账号 ──
function deleteSingleToken(tokenId) {
  const token = tokenStore.gameTokens.find(t => t.id === tokenId);
  if (!token) return;
  if (!confirm(`确定删除账号「${token.name}」？删除后不可恢复`)) return;
  // 如果已登录，先退出
  if (hasIframe(tokenId)) exitSingle(tokenId);
  // 从所有 loginGroups 中移除
  loginGroups.value.forEach(g => {
    g.tokenIds = g.tokenIds.filter(id => id !== tokenId);
  });
  saveLoginGroups();
  // 从勾选列表移除
  selectedTokenIds.value = selectedTokenIds.value.filter(id => id !== tokenId);
  // 清理状态残留
  tokenStatusMap.value.delete(tokenId);
  tokenStatusMap.value = new Map(tokenStatusMap.value);
  // 从 store 删除
  tokenStore.removeToken(tokenId);
  addLog(`🗑 已删除: ${token.name}`, 'info');
}
function batchDeleteTokens() {
  const ids = [...selectedTokenIds.value];
  if (ids.length === 0) return;
  const names = ids.map(id => tokenStore.gameTokens.find(t => t.id === id)?.name).filter(Boolean);
  if (!confirm(`确定删除 ${ids.length} 个账号？\n${names.join(', ')}`)) return;
  ids.forEach(id => {
    if (hasIframe(id)) exitSingle(id);
    loginGroups.value.forEach(g => {
      g.tokenIds = g.tokenIds.filter(tid => tid !== id);
    });
    tokenStore.removeToken(id);
  });
  saveLoginGroups();
  selectedTokenIds.value = [];
  addLog(`🗑 已批量删除 ${ids.length} 个账号`, 'info');
  message.success(`已删除 ${ids.length} 个账号`);
}
// ── 添加Token弹窗 ──
const showAddTokenModal = ref(false);
const addTokenImportMethod = ref('singlebin');
function goAddToken() {
  showAddTokenModal.value = true;
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
  width: 4px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8ecf0;
  flex-shrink: 0;
  transition: background 0.15s;
  z-index: 10;
}
.resize-handle:hover,
.resize-handle:active {
  background: #5b6ef5;
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
  min-width: 260px;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e8ecf0;
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
  background: #5b6ef5;
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
  background: #f0f4ff;
  color: #5b6ef5;
}
.split-layout.panel-collapsed .right-panel {
  flex: 1;
}

.panel-header-card {
  background: #fff;
  border-radius: 0;
  border-bottom: 1px solid #e8ecf0;
  padding: 10px 12px 8px;
  flex-shrink: 0;
}
.stat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 8px;
}
.mini-stat {
  flex: 1;
  text-align: center;
  padding: 2px 0;
}
.mini-label { display: block; font-size: 10px; color: #999; letter-spacing: 0.5px; text-transform: uppercase; }
.mini-val { display: block; font-size: 20px; font-weight: 700; color: #333; line-height: 1.3; }
.text-blue { color: #5b6ef5; }
.text-green { color: #34c759; }
.stat-divider {
  width: 1px;
  height: 28px;
  background: #e8ecf0;
  flex-shrink: 0;
}

.action-bar {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  align-items: center;
}
.action-bar :deep(.n-button) {
  font-size: 11px;
  border-radius: 6px;
}
.action-bar-secondary {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: auto;
}

/* 日志 */
.log-area {
  margin: 0;
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  overflow: hidden;
  flex-shrink: 0;
}
.log-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 12px; background: #fafafa; border-bottom: 1px solid #eee;
  font-size: 11px; font-weight: 500;
}
.log-list { max-height: 90px; overflow-y: auto; padding: 2px 0; }
.log-item { padding: 2px 12px; font-size: 11px; line-height: 1.7; color: #555; }
.log-time { color: #aaa; margin-right: 4px; font-family: monospace; }
.log-success { color: #34c759; }
.log-error { color: #ef4444; }
.log-warning { color: #f59e0b; }
.log-info { color: #5b6ef5; }

/* 账号列表 */
.token-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  border-top: 1px solid #e8ecf0;
}
.token-section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px 6px;
  flex-shrink: 0;
  background: #fff;
}
.token-section-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: #f8f9fb;
}
/* 分组管理栏 */
.group-toolbar {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  background: #fff;
}
.group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}
.group-chip {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1.5px solid #ddd;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}
.group-chip:hover { opacity: 0.85; transform: translateY(-1px); }
.group-chip.is-drag-over {
  opacity: 1;
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  border-style: solid !important;
}
.group-chip.is-active { font-weight: 600; }
.group-io-btn { font-size: 12px; padding: 3px 8px; opacity: 0.65; }
.group-io-btn:hover { opacity: 1; }
.group-chip:not(.is-active):not(.group-add-btn) { background: transparent; }
.group-add-btn {
  border-style: dashed;
  border-color: #bbb;
  color: #888;
}
.group-add-btn:hover { border-color: #5b6ef5; color: #5b6ef5; }
.group-new-input {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0 2px;
  flex-wrap: wrap;
}
.group-input-field {
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  width: 110px;
  outline: none;
  transition: border-color 0.2s;
}
.group-input-field:focus { border-color: #5b6ef5; box-shadow: 0 0 0 2px rgba(91,110,245,0.1); }
.group-color-picker {
  display: flex;
  gap: 4px;
  align-items: center;
}
.group-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.group-color-dot:hover { transform: scale(1.2); }
.group-color-dot.is-selected { border-color: #333; box-shadow: 0 0 4px rgba(0,0,0,0.3); }
.group-actions {
  display: flex;
  gap: 6px;
  padding: 5px 0 0;
  align-items: center;
  flex-wrap: wrap;
}
/* token分组色点 */
.token-group-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  gap: 3px;
  min-height: 0;
  padding: 6px 8px;
}
.token-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  background: #fff;
  transition: all 0.15s;
  flex-shrink: 0;
  min-height: 40px;
}
.token-item:hover {
  border-color: #c5cce0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.token-opened { border-color: #34c759; background: #f0fdf4; }
.token-dragging { opacity: 0.4; border-color: #f59e0b; }
.drag-handle {
  display: inline-block;
  color: #ccc;
  font-size: 10px;
  margin-right: 4px;
  cursor: grab;
}
.token-item:active .drag-handle { cursor: grabbing; }
.token-name {
  font-size: 12px; font-weight: 500; color: #333;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;
}
.token-meta { display: flex; gap: 6px; font-size: 10px; align-items: center; flex-shrink: 0; }
.token-server { color: #999; background: #f0f1f5; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
.token-status { font-size: 10px; font-weight: 500; }
.status-opened { color: #34c759; }
.status-opening { color: #f59e0b; }
.status-idle { color: #bbb; }
.token-actions { display: flex; gap: 3px; margin-left: auto; flex-shrink: 0; }

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
.cell-master-btn { color: #666; font-size: 11px; }
.cell-master-btn:hover { background: rgba(255,180,0,0.15); color: #ffb400; }
.cell-master-btn.is-master { color: #ffb400; text-shadow: 0 0 6px rgba(255,180,0,0.6); }
/* 分组按钮 */
.cell-group-btn { font-size: 13px; color: #555; padding: 0 2px; cursor: pointer; transition: all 0.2s; }
.cell-group-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.3); }
.cell-group-btn.has-group { text-shadow: 0 0 4px currentColor; }
.cell-group-btn.is-auto-group { cursor: default; opacity: 0.9; }
.cell-group-btn.is-auto-group:hover { transform: scale(1.1); background: transparent; }
/* 分组header样式 */
.cell-grouped-header { border-left-width: 3px; border-left-style: solid; }
/* 分组标签 */
.cell-group-tag { font-size: 9px; margin-left: 4px; font-weight: 600; opacity: 0.8; }
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
    border-right: none;
    border-bottom: 1px solid #e8ecf0;
  }
  .right-panel {
    flex: 1;
    min-height: 0;
  }
  .resize-handle { display: none; }
  .panel-header-card {
    padding: 6px 10px 5px;
  }
  .mini-val { font-size: 15px; }
  .mini-label { font-size: 9px; }
  .stat-divider { height: 20px; }
  .stat-row { margin-bottom: 6px; }
  .action-bar {
    gap: 4px;
  }
  .action-bar :deep(.n-button) {
    font-size: 10px;
    height: 28px;
    padding: 0 8px;
    border-radius: 6px;
  }
  .action-bar :deep(.n-button-group .n-button) {
    padding: 0 10px;
  }
  .action-bar-secondary {
    gap: 0;
    margin-left: auto;
  }
  .action-bar-secondary :deep(.n-button) {
    font-size: 13px;
    padding: 0 6px;
    min-width: 32px;
  }
  /* 移动端分组工具栏优化 */
  .group-toolbar {
    padding: 6px 8px;
  }
  .group-chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: 3px;
    gap: 6px;
  }
  .group-chips::-webkit-scrollbar { display: none; }
  .group-chip {
    padding: 4px 12px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    flex-shrink: 0;
    border-radius: 14px;
  }
  .group-io-btn {
    min-height: 28px;
    padding: 4px 10px;
    font-size: 13px;
  }
  .group-actions {
    padding: 4px 0 0;
    gap: 4px;
  }
  .group-actions :deep(.n-button) {
    font-size: 11px;
    padding: 0 6px;
    height: 26px;
  }
  .group-new-input {
    padding: 6px 0 2px;
    gap: 5px;
  }
  .group-input-field {
    width: 100px;
    font-size: 13px;
    height: 28px;
  }
  .group-color-dot {
    width: 20px;
    height: 20px;
  }
  /* 移动端同步栏紧凑化 */
  .sync-bar {
    padding: 4px 8px;
    gap: 5px;
    flex-wrap: wrap;
  }
  .sync-label { font-size: 10px; }
  .sync-status { font-size: 10px; }
  .sync-groups-info { gap: 4px; }
  .sync-group-chip {
    font-size: 9px;
    padding: 1px 5px;
  }
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
    max-height: 180px;
  }
  /* 移动端日志区缩小 */
  .log-list {
    max-height: 50px;
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
  /* 移动端账号卡片 */
  .token-name {
    max-width: 100px;
    font-size: 12px;
  }
  .token-scroll {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 4px 6px;
    gap: 3px;
  }
  .token-item {
    padding: 6px 8px;
    min-height: 38px;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    border-radius: 8px;
  }
  .token-meta {
    gap: 4px;
  }
  .token-server {
    font-size: 9px;
    padding: 1px 5px;
  }
  .token-actions :deep(.n-button) {
    font-size: 11px;
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
  /* 脚本区域紧凑 */
  .script-header {
    padding: 5px 10px;
  }
  .script-item {
    padding: 4px 10px;
  }
  /* token区域头部 */
  .token-section-header {
    padding: 6px 10px 5px;
  }
  .token-section-body {
    background: #f8f9fb;
  }
}

/* 同步控制栏 */
.sync-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid #e8ecf0;
  background: #f0f4ff;
  flex-shrink: 0;
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
.sync-on { color: #34c759; }
.sync-off { color: #bbb; }
/* 同步分组信息 */
.sync-groups-info {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.sync-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(91,110,245,0.08);
}
.sync-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.sync-ungrouped {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(0,0,0,0.03);
}

/* 脚本管理 */
.script-section {
  border-bottom: 1px solid #e8ecf0;
}
.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #fff;
}
.script-list {
  max-height: 150px;
  overflow-y: auto;
}
.script-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 12px;
  border-top: 1px solid #f0f0f0;
}
.script-item:hover { background: #f8f9fb; }
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
  border-bottom: 1px solid #e8ecf0;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
  color: #5b6ef5;
}
.mobile-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 20%;
  width: 60%;
  height: 2px;
  background: #5b6ef5;
  border-radius: 1px;
}
.mobile-tab-badge {
  display: inline-block;
  font-size: 10px;
  background: #5b6ef5;
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
    min-height: 44px;
  }
  .token-item:active {
    background: #f0f4ff;
    border-color: #5b6ef5;
  }
  .drag-handle {
    font-size: 14px;
    color: #aaa;
  }
  .group-chip {
    min-height: 32px;
    padding: 5px 14px;
    font-size: 13px;
  }
  .group-io-btn {
    min-height: 32px;
    padding: 5px 12px;
  }
  .group-actions :deep(.n-button) {
    min-height: 32px;
    padding: 0 10px;
    font-size: 12px;
  }
  .action-bar :deep(.n-button) {
    min-height: 34px;
  }
  .action-bar-secondary :deep(.n-button) {
    min-height: 34px;
    min-width: 36px;
  }
}

/* 平板断点 */
@media (min-width: 769px) and (max-width: 1024px) {
  .left-panel {
    min-width: 240px;
  }
  .token-name {
    max-width: 100px;
  }
}
</style>
