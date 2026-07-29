import { reactive, ref, computed, onBeforeUnmount } from 'vue';

/**
 * 游戏窗口管理器（单例）
 * 管理通过 window.open 打开的独立游戏窗口，提供：
 * - 窗口注册/移除/状态追踪
 * - 全部刷新 / 单个刷新
 * - 操作同步（点击/滑动转发 + 分组）
 * - 多窗口自动对齐排列
 */

// ── 单例状态（模块级，跨组件共享） ──
const gameWindows = reactive(new Map()); // tokenId -> { win, name, group, openedAt }
const syncEnabled = ref(false);
const syncGroups = reactive({}); // tokenId -> groupColor
const syncMasterMap = reactive({}); // groupKey -> masterTokenId
let messageListenerAttached = false;

// 分组颜色池
const GROUP_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
let colorIndex = 0;

// ── 内部工具 ──
function isWinAlive(win) {
  try { return win && !win.closed; } catch { return false; }
}

function cleanupDeadWindows() {
  for (const [tokenId, info] of gameWindows) {
    if (!isWinAlive(info.win)) {
      gameWindows.delete(tokenId);
      delete syncGroups[tokenId];
    }
  }
}

function postToWindow(win, data) {
  try {
    if (isWinAlive(win)) {
      win.postMessage(data, '*');
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

// ── 同步事件处理 ──
function onMessage(e) {
  if (!e.data || e.data.type !== 'GAME_INPUT_EVENT' || !syncEnabled.value) return;

  const sourceTokenId = e.data.tokenId;
  const evData = e.data.event;
  if (!evData || !sourceTokenId) return;
  if (!gameWindows.has(sourceTokenId)) return;

  // 分组逻辑
  const sourceGroup = syncGroups[sourceTokenId] || null;
  const sourceGroupKey = sourceGroup || '__ungrouped__';

  // 如果分组设了 master，只有 master 的事件才转发
  const sourceMaster = syncMasterMap[sourceGroupKey];
  if (sourceMaster && sourceTokenId !== sourceMaster) return;

  // 转发到同组其他窗口
  let count = 0;
  for (const [tokenId, info] of gameWindows) {
    if (tokenId === sourceTokenId) continue;
    const targetGroup = syncGroups[tokenId] || null;
    if (targetGroup !== sourceGroup) continue;
    // 确保目标窗口在上层显示
    try { info.win.focus(); } catch { /* ignore */ }
    if (postToWindow(info.win, { type: 'INPUT_EVENT', event: evData })) {
      count++;
    }
  }
}

function attachMessageListener() {
  if (messageListenerAttached) return;
  window.addEventListener('message', onMessage);
  messageListenerAttached = true;
}

// ── 公开 API ──
export function useGameWindowManager() {
  attachMessageListener();

  const windowCount = computed(() => gameWindows.size);
  const windowList = computed(() => {
    cleanupDeadWindows();
    return [...gameWindows.entries()].map(([tokenId, info]) => ({
      tokenId,
      name: info.name,
      group: info.group || syncGroups[tokenId] || null,
      openedAt: info.openedAt,
    }));
  });

  const syncGroupStats = computed(() => {
    const groups = {};
    for (const [tokenId] of gameWindows) {
      const g = syncGroups[tokenId];
      if (!g) continue;
      if (!groups[g]) groups[g] = { color: g, count: 0, masterName: '' };
      groups[g].count++;
      const masterId = syncMasterMap[g];
      if (masterId === tokenId) {
        groups[g].masterName = gameWindows.get(tokenId)?.name || '';
      }
    }
    return Object.values(groups);
  });

  const syncUngroupedCount = computed(() => {
    let count = 0;
    for (const [tokenId] of gameWindows) {
      if (!syncGroups[tokenId]) count++;
    }
    return count;
  });

  /** 注册一个已打开的游戏窗口 */
  function registerWindow(tokenId, name, win) {
    if (!tokenId || !win) return;
    // 如果同一账号已有窗口，先关闭旧的
    const existing = gameWindows.get(tokenId);
    if (existing && isWinAlive(existing.win)) {
      try { existing.win.close(); } catch { /* ignore */ }
    }
    gameWindows.set(tokenId, { win, name, group: null, openedAt: Date.now() });
    // 确保新窗口置顶
    try { win.focus(); } catch { /* ignore */ }
  }

  /** 移除窗口（可选关闭） */
  function removeWindow(tokenId, close = true) {
    const info = gameWindows.get(tokenId);
    if (!info) return;
    if (close && isWinAlive(info.win)) {
      try { info.win.close(); } catch { /* ignore */ }
    }
    gameWindows.delete(tokenId);
    delete syncGroups[tokenId];
    // 清理 master 引用
    for (const key of Object.keys(syncMasterMap)) {
      if (syncMasterMap[key] === tokenId) delete syncMasterMap[key];
    }
  }

  /** 刷新单个窗口 */
  function refreshSingle(tokenId) {
    const info = gameWindows.get(tokenId);
    if (!info) return;
    try { info.win.focus(); } catch { /* ignore */ }
    postToWindow(info.win, {
      type: 'INJECT_SCRIPT',
      name: '刷新重登',
      code: 'location.reload()',
    });
  }

  /** 刷新所有窗口 */
  function refreshAll() {
    cleanupDeadWindows();
    for (const [tokenId] of gameWindows) {
      refreshSingle(tokenId);
    }
  }

  /** 关闭所有窗口 */
  function closeAll() {
    for (const [tokenId] of [...gameWindows]) {
      removeWindow(tokenId, true);
    }
  }

  /** 开启/关闭同步 */
  function toggleSync(val) {
    syncEnabled.value = val;
    cleanupDeadWindows();
    for (const [, info] of gameWindows) {
      postToWindow(info.win, {
        type: 'INJECT_SCRIPT',
        name: 'sync-toggle',
        code: `window._syncEnabled = ${val};`,
      });
    }
  }

  // ── 自适应排列常量（与 GameLogin.vue 保持一致）──
  const GAME_ASPECT_RATIO = 9 / 16; // 游戏竖屏宽高比
  const MIN_CELL_WIDTH = 180;
  const MIN_IFRAME_HEIGHT = 240;
  const CELL_HEADER_H = 28;  // 窗口标题栏/工具栏预留
  const BROWSER_CHROME_H = 32; // 浏览器标题栏+边框高度
  const GRID_GAP = 4;
  const SCROLLBAR_W = 20;

  /** 自适应列数计算（宽高双约束，与 GameLogin.vue 同算法） */
  function calcAutoCols(count, availW, availH) {
    if (count <= 0) return 1;
    if (count === 1) return 1;
    const maxCols = Math.min(count, 12);
    let bestCols = 1;
    let bestScore = -Infinity;

    for (let cols = 1; cols <= maxCols; cols++) {
      const cellW = (availW - (cols + 1) * GRID_GAP - SCROLLBAR_W) / cols;
      const rows = Math.ceil(count / cols);
      const cellH = (availH - (rows + 1) * GRID_GAP) / rows - CELL_HEADER_H - BROWSER_CHROME_H;

      if (cellW < MIN_CELL_WIDTH) continue;
      if (cellH < MIN_IFRAME_HEIGHT) continue;

      const idealW = cellH * GAME_ASPECT_RATIO;
      const ratioMatch = Math.min(cellW / idealW, idealW / cellW);
      const lastRowItems = count - (rows - 1) * cols;
      const fillRatio = lastRowItems / cols;
      const areaUsage = (count * cellW * (cellH + CELL_HEADER_H + BROWSER_CHROME_H)) / (availW * availH);
      const score = ratioMatch * 0.4 + fillRatio * 0.3 + areaUsage * 0.3;
      if (score > bestScore) { bestScore = score; bestCols = cols; }
    }
    if (bestScore === -Infinity) {
      bestCols = Math.max(1, Math.min(count, Math.floor((availW - SCROLLBAR_W) / (MIN_CELL_WIDTH + GRID_GAP))));
    }
    return bestCols;
  }

  /** 自动排列所有窗口（自适应宽高，与游戏登录页网格一致） */
  function arrangeWindows() {
    cleanupDeadWindows();
    const wins = [...gameWindows.values()].filter(i => isWinAlive(i.win));
    const n = wins.length;
    if (n === 0) return;

    const availW = screen.availWidth;
    const availH = screen.availHeight;
    const cols = calcAutoCols(n, availW, availH);
    const rows = Math.ceil(n / cols);

    // 计算 cell 尺寸（含窗口边框）
    const cellW = Math.floor((availW - (cols + 1) * GRID_GAP - SCROLLBAR_W) / cols);
    const cellIframeH = Math.floor((availH - (rows + 1) * GRID_GAP) / rows - CELL_HEADER_H - BROWSER_CHROME_H);

    // 按游戏比例约束
    const idealW = cellIframeH * GAME_ASPECT_RATIO;
    const finalIframeW = Math.max(MIN_CELL_WIDTH, Math.min(cellW, idealW));
    const finalIframeH = Math.max(MIN_IFRAME_HEIGHT, Math.floor(finalIframeW / GAME_ASPECT_RATIO));
    const finalWinW = Math.floor(finalIframeW);
    const finalWinH = Math.floor(finalIframeH + CELL_HEADER_H + BROWSER_CHROME_H);

    // 计算居中偏移
    const totalW = finalWinW * cols + (cols + 1) * GRID_GAP;
    const totalH = finalWinH * rows + (rows + 1) * GRID_GAP;
    const offsetX = Math.max(0, Math.floor((availW - totalW) / 2));
    const offsetY = Math.max(0, Math.floor((availH - totalH) / 2));

    wins.forEach((info, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = offsetX + col * (finalWinW + GRID_GAP) + GRID_GAP;
      const y = offsetY + row * (finalWinH + GRID_GAP) + GRID_GAP;
      try {
        info.win.moveTo(x, y);
        info.win.resizeTo(finalWinW, finalWinH);
        info.win.focus(); // 排列后置顶
      } catch { /* ignore */ }
    });
  }

  /** 设置窗口分组 */
  function setGroup(tokenId, group) {
    if (group) {
      syncGroups[tokenId] = group;
    } else {
      delete syncGroups[tokenId];
    }
  }

  /** 循环切换分组颜色 */
  function cycleGroup(tokenId) {
    const current = syncGroups[tokenId];
    const idx = current ? GROUP_COLORS.indexOf(current) : -1;
    const nextIdx = (idx + 1) % (GROUP_COLORS.length + 1); // +1 包含"无分组"
    if (nextIdx === GROUP_COLORS.length) {
      delete syncGroups[tokenId]; // 无分组
    } else {
      syncGroups[tokenId] = GROUP_COLORS[nextIdx];
    }
  }

  /** 设置分组主窗口 */
  function setMaster(groupKey, tokenId) {
    if (syncMasterMap[groupKey] === tokenId) {
      delete syncMasterMap[groupKey];
    } else {
      syncMasterMap[groupKey] = tokenId;
    }
  }

  return {
    gameWindows,
    syncEnabled,
    syncGroups,
    syncMasterMap,
    windowCount,
    windowList,
    syncGroupStats,
    syncUngroupedCount,
    registerWindow,
    removeWindow,
    refreshSingle,
    refreshAll,
    closeAll,
    toggleSync,
    arrangeWindows,
    setGroup,
    cycleGroup,
    setMaster,
    GROUP_COLORS,
  };
}
