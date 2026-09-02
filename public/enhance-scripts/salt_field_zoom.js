// === Salt-field view tools (unified) ===
// Scope: LegionWar (传统盐场) + LegionPayload (月战)
// Features: infinite vision (去迷雾), map zoom (缩放/全图), auto CACHE by scale
// Standalone: 仅导入本文件即可，自动适配 iframe 游戏窗口与盐场调试油猴脚本模拟的盐场
(function() {
  'use strict';

  var VERSION = '2026-06-12.unified-v48';
  var SALT_SCALE_NAME = 'saltFieldViewScaleComp';
  var SCALE_HOST_NAME = 'saltFieldViewScaleHost';
  var SCALE_RESET_BTN_NAME = 'btnResetScale';
  var SCALE_UI_GAP_ABOVE = 6;
  var SCALE_UI_OFFSET_Y = 0;
  var SCALE_UI_RESET_GAP = 12;
  var SCALE_UI_SLIDER_OFFSET_Y = 12;
  var SCALE_UI_BTN_W = 56;
  var SCALE_UI_BTN_H = 56;
  var SCALE_UI_SLOT_H = 144;
  var SCALE_UI_SLIDER_OFFSET_X = 8;
  var SCALE_UI_GRIP_OFFSET_X = -5;
  var nativeScaleMetrics = null;
  if (window.__saltFieldView && window.__saltFieldView.version === VERSION) return;
  var MIN_SCALE = 0.12;
  var MAX_SCALE = 2.5;
  var SCALE_STEP = 0.05;
  var DEFAULT_SCALE = 0.78;
  var MIN_CACHE = 2;
  var MAX_CACHE = 50;
  var SCALE_STORAGE_KEY = 'salt_visual_zoom_scale_v16';
  var PANEL_POS_STORAGE_KEY = 'salt_view_panel_pos';
  var PANEL_MIN_STORAGE_KEY = 'salt_view_panel_minimized';

  var patched = false;
  var attempts = 0;
  var maxAttempts = 120;
  var retryDelay = 500;
  var scale = readScale();
  var panel = null;
  var panelBody = null;
  var panelHeader = null;
  var panelMinBtn = null;
  var panelMinimized = readPanelMinimized();
  var scaleLabel = null;
  var statusDot = null;
  var inputInstalled = false;
  var requireWindow = null;
  var trackedSourceMaps = [];
  var trackedMapScenes = [];
  var lastDebug = {};
  var refreshTimer = null;
  var gameScaleComp = null;
  var scaleSlider = null;
  var scaleBtnAdd = null;
  var scaleBtnSub = null;
  var scaleBtnReset = null;
  var sliderSyncLock = false;
  var nativeScaleHooked = false;
  var SLIDER_MIN = 1;
  var SLIDER_MAX = 100;
  var SLIDER_MID = (SLIDER_MIN + SLIDER_MAX) / 2;
  var SLIDER_UI_STEP = 2;
  var PINCH_MIN_DISTANCE = 20;
  var ZOOM_COMMIT_DELAY = 120;
  var pinchState = null;
  var zoomRafId = 0;
  var zoomPendingScale = null;
  var zoomPendingFocus = null;
  var zoomCommitTimer = 0;
  var cachedZoomCtx = null;
  var cachedZoomCtxAt = 0;
  var canvasRectCache = null;
  var canvasRectCacheAt = 0;
  var grootWatchTimer = null;
  var grootReadyQueue = [];
  var grootReadyFired = false;
  var maintIntervalId = null;

  function whenGRootReady(fn) {
    if (!fn) return;
    if (grootReadyFired || isGRootReady()) {
      grootReadyFired = true;
      try { fn(); } catch (e) {}
      return;
    }
    grootReadyQueue.push(fn);
    startGRootWatch();
  }

  function startGRootWatch() {
    if (grootWatchTimer) return;
    var watchAttempts = 0;
    grootWatchTimer = setInterval(function() {
      watchAttempts++;
      if (!isGRootReady()) {
        if (watchAttempts > 300) {
          clearInterval(grootWatchTimer);
          grootWatchTimer = null;
          grootReadyQueue = [];
        }
        return;
      }
      clearInterval(grootWatchTimer);
      grootWatchTimer = null;
      grootReadyFired = true;
      var queue = grootReadyQueue.slice();
      grootReadyQueue = [];
      for (var i = 0; i < queue.length; i++) {
        try { queue[i](); } catch (e) {}
      }
    }, 200);
  }

  function startMaintenanceInterval() {
    if (maintIntervalId) return;
    // 空闲时低频轮询（8s），盐场活跃或有缩放 UI 时高频（1.5s），减少无谓空转
    function tick() {
      var active = isSaltFieldActive();
      var hasUi = !!(getLegionWarPanelProxy() || hasZoomableMap());
      if (active) refreshVisionOnly();
      if (hasUi) {
        ensureGameScaleUI();
        repositionScaleComp();
      }
      maintIntervalId = setTimeout(tick, (active || hasUi) ? 1500 : 8000);
    }
    tick();
  }

  function bootUiAfterGRoot() {
    whenGRootReady(function() {
      removeOrphanScaleUI();
      ensureGameScaleUI();
      startMaintenanceInterval();
    });
  }

  function isSaltFieldActive() {
    try {
      var lw = getModuleByTypeName('LEGION_WAR');
      if (lw && lw._isInWar && lw.sourceMap) return true;
      var lp = getModuleByTypeName('LEGION_PAYLOAD');
      if (lp && lp.lPWarData && lp.lPWarData.sourceMap && lp.lPWarData.battlefield) return true;
    } catch (e) {}
    return false;
  }

  function isSaltFieldSourceMap(sourceMap) {
    if (!sourceMap || typeof sourceMap.getModule !== 'function') return false;
    try {
      var mod = sourceMap.getModule();
      if (!mod) return false;
      var lw = getModuleByTypeName('LEGION_WAR');
      if (mod === lw) {
        return lw.sourceMap === sourceMap || resolveSourceMap(lw.sourceMap) === sourceMap;
      }
      var lp = getModuleByTypeName('LEGION_PAYLOAD');
      if (mod === lp && lp.lPWarData && lp.lPWarData.sourceMap === sourceMap) return true;
    } catch (e) {}
    return false;
  }

  function isProxyVisible(proxy) {
    if (!proxy) return false;
    if (proxy.isShow) return true;
    return !!(proxy.ui && proxy.ui.parent);
  }

  function getFgui() {
    var gw = getGameWindow();
    return gw && gw.fgui ? gw.fgui : null;
  }

  /** 安全读取 GRoot.inst（未 create 时 getter 会抛错） */
  function safeGetGRootInst(fgui) {
    if (!fgui || !fgui.GRoot) return null;
    try {
      var inst = fgui.GRoot.inst;
      if (!inst) return null;
      if (inst.node == null) return null;
      return inst;
    } catch (e) {
      return null;
    }
  }

  function isGRootReady(fgui) {
    return !!safeGetGRootInst(fgui || getFgui());
  }

  function getFguiRoot() {
    return safeGetGRootInst(getFgui());
  }

  function getMapNodePosition(mapNode) {
    if (!mapNode) return { x: 0, y: 0 };
    if (typeof mapNode.getPosition === 'function') {
      var pos = mapNode.getPosition();
      return { x: pos.x, y: pos.y };
    }
    return { x: Number(mapNode.x || 0), y: Number(mapNode.y || 0) };
  }

  function getMapCurrentScale(sourceMap, mapComp) {
    if (sourceMap) {
      var saved = sourceMap.__saltFieldViewScale;
      if (saved > 0) return saved;
      if (sourceMap._mapScale > 0) return sourceMap._mapScale;
      try {
        var live = Number(sourceMap.mapScale);
        if (live > 0) return live;
      } catch (e) {}
    }
    if (mapComp && mapComp.scaleX > 0) return mapComp.scaleX;
    return scale > 0 ? scale : DEFAULT_SCALE;
  }

  function syncSourceMapScale(sourceMap, mapComp, nextScale) {
    if (!sourceMap) return;
    sourceMap.__saltFieldViewScale = nextScale;
    try { sourceMap._mapScale = nextScale; } catch (e) {}
    sourceMap.mapContainer = mapComp;
  }

  /** 以指定屏幕焦点（默认视口中心）缩放地图 */
  function applyScaleWithViewportFocus(mapComp, mapNode, sourceMap, oldScale, newScale, proxy, focusViewport, focusPoint, zoomOptions) {
    if (!mapComp || !mapNode) return false;
    if (!(oldScale > 0)) oldScale = getMapCurrentScale(sourceMap, mapComp);
    zoomOptions = zoomOptions || {};
    newScale = zoomOptions.skipRound
      ? clamp(newScale, MIN_SCALE, MAX_SCALE)
      : clamp(roundScale(newScale), MIN_SCALE, MAX_SCALE);
    syncSourceMapScale(sourceMap, mapComp, newScale);
    mapComp.setScale(newScale, newScale);
    if (zoomOptions.skipRound) {
      mapComp.scaleX = newScale;
      mapComp.scaleY = newScale;
    }
    if (focusViewport !== false && Math.abs(oldScale - newScale) > 0.001) {
      var root = getFguiRoot();
      if (root) {
        var centerX = focusPoint && isFinite(focusPoint.x) ? focusPoint.x : root.width / 2;
        var centerY = focusPoint && isFinite(focusPoint.y) ? focusPoint.y : root.height / 2;
        var nodePos = getMapNodePosition(mapNode);
        var mapFocusX = (centerX - nodePos.x) / oldScale;
        var mapFocusY = (centerY + nodePos.y) / oldScale;
        mapNode.setPosition(centerX - mapFocusX * newScale, -(centerY - mapFocusY * newScale));
      }
    }
    if (proxy && typeof proxy._fixScope === 'function') proxy._fixScope();
    return true;
  }

  function getCanvasRect(targetWindow) {
    var now = Date.now();
    if (canvasRectCache && canvasRectCache.window === targetWindow && now - canvasRectCacheAt < 800) {
      return canvasRectCache.rect;
    }
    var doc = (targetWindow || window).document;
    var canvas = null;
    try { canvas = doc.querySelector('canvas'); } catch (e) {}
    if (!canvas) {
      try { canvas = doc.getElementById('GameCanvas'); } catch (e2) {}
    }
    var rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    canvasRectCache = { window: targetWindow, rect: rect };
    canvasRectCacheAt = now;
    return rect;
  }

  function clientToRootCoords(clientX, clientY, targetWindow) {
    var root = getFguiRoot();
    if (!root) return null;
    var rect = getCanvasRect(targetWindow || window);
    if (rect && rect.width > 0 && rect.height > 0) {
      return {
        x: (clientX - rect.left) * (root.width / rect.width),
        y: (clientY - rect.top) * (root.height / rect.height)
      };
    }
    return { x: root.width / 2, y: root.height / 2 };
  }

  function touchDistance(t0, t1) {
    var dx = t0.clientX - t1.clientX;
    var dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function touchMidpoint(t0, t1, targetWindow) {
    return clientToRootCoords((t0.clientX + t1.clientX) / 2, (t0.clientY + t1.clientY) / 2, targetWindow);
  }

  function invalidateZoomContext() {
    cachedZoomCtx = null;
    cachedZoomCtxAt = 0;
  }

  function getZoomContext() {
    var empty = { indexUi: null, lp: null, lpMap: null, ms: null, msMap: null, sm: null };
    if (!isGRootReady()) return empty;
    var now = Date.now();
    if (cachedZoomCtx && now - cachedZoomCtxAt < 3000) return cachedZoomCtx;
    var ctx = empty;
    var indexUi = safeRequire('index-ui');
    if (!indexUi || typeof indexUi.GET_PROXY !== 'function') {
      cachedZoomCtx = ctx;
      cachedZoomCtxAt = now;
      return ctx;
    }
    ctx.indexUi = indexUi;
    try {
      var lpMod = safeRequire('LPMapPanel');
      if (lpMod && lpMod.LPMapPanel) {
        var lp = indexUi.GET_PROXY(lpMod.LPMapPanel);
        var lpMap = lp && lp.ui && lp.ui.m_map;
        if (lpMap && lpMap.node && isProxyVisible(lp)) {
          ctx.lp = lp;
          ctx.lpMap = lpMap;
        }
      }
    } catch (e) {}
    try {
      var msMod = safeRequire('MapScene');
      if (msMod && msMod.MapScene) {
        var ms = indexUi.GET_PROXY(msMod.MapScene);
        var msMap = ms && ms.ui && ms.ui.m_map;
        if (msMap && msMap.node && isProxyVisible(ms)) {
          ctx.ms = ms;
          ctx.msMap = msMap;
          ctx.sm = resolveSourceMap(ms.sourceMap);
          if (!ctx.sm && ms.getModule) {
            try { ctx.sm = resolveSourceMap(ms.getModule().sourceMap); } catch (e2) {}
          }
        }
      }
    } catch (e) {}
    cachedZoomCtx = ctx;
    cachedZoomCtxAt = now;
    return ctx;
  }

  function flushContinuousZoom() {
    zoomRafId = 0;
    if (zoomPendingScale == null) return;
    var nextScale = zoomPendingScale;
    var focusPoint = zoomPendingFocus;
    zoomPendingScale = null;
    zoomPendingFocus = null;
    var oldScale = scale;
    scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    applyZoomNow(oldScale, true, focusPoint, { skipUpdateMap: true, skipRound: true });
    syncScaleUiFast();
  }

  function getLiveScale() {
    return zoomPendingScale != null ? zoomPendingScale : scale;
  }

  function scheduleContinuousZoom(nextScale, focusPoint) {
    zoomPendingScale = nextScale;
    zoomPendingFocus = focusPoint || zoomPendingFocus;
    if (!zoomRafId) {
      var raf = (getGameWindow() || window).requestAnimationFrame || window.requestAnimationFrame;
      zoomRafId = raf.call(getGameWindow() || window, flushContinuousZoom);
    }
  }

  function cancelContinuousZoomFrame() {
    if (!zoomRafId) return;
    var cancel = (getGameWindow() || window).cancelAnimationFrame || window.cancelAnimationFrame;
    cancel.call(getGameWindow() || window, zoomRafId);
    zoomRafId = 0;
  }

  function commitContinuousZoom(focusPoint) {
    if (zoomCommitTimer) {
      clearTimeout(zoomCommitTimer);
      zoomCommitTimer = 0;
    }
    if (zoomPendingScale != null) {
      flushContinuousZoom();
    } else {
      cancelContinuousZoomFrame();
    }
    var oldScale = scale;
    scale = roundScale(scale);
    saveScale();
    syncScaleUi();
    var ok = applyZoomNow(oldScale, true, focusPoint, { skipRound: true });
    if (!ok) emitGameMapScale(scale);
    if (isSaltFieldActive()) refreshVisionOnly();
    lastDebug.scale = scale;
    return scale;
  }

  function scheduleZoomCommit(focusPoint) {
    if (zoomCommitTimer) clearTimeout(zoomCommitTimer);
    zoomCommitTimer = setTimeout(function() {
      zoomCommitTimer = 0;
      commitContinuousZoom(focusPoint);
    }, ZOOM_COMMIT_DELAY);
  }

  function resetPinchState(save) {
    if (!pinchState) return;
    var focusPoint = pinchState.focusPoint;
    pinchState = null;
    if (save) commitContinuousZoom(focusPoint);
    else cancelContinuousZoomFrame();
  }

  function scaleToSliderValue(nextScale) {
    nextScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (nextScale <= DEFAULT_SCALE) {
      var lowRange = DEFAULT_SCALE - MIN_SCALE;
      if (!(lowRange > 0)) return SLIDER_MIN;
      var tLow = (nextScale - MIN_SCALE) / lowRange;
      return clamp(Math.round(SLIDER_MIN + tLow * (SLIDER_MID - SLIDER_MIN)), SLIDER_MIN, SLIDER_MAX);
    }
    var highRange = MAX_SCALE - DEFAULT_SCALE;
    if (!(highRange > 0)) return SLIDER_MAX;
    var tHigh = (nextScale - DEFAULT_SCALE) / highRange;
    return clamp(Math.round(SLIDER_MID + tHigh * (SLIDER_MAX - SLIDER_MID)), SLIDER_MIN, SLIDER_MAX);
  }

  function sliderValueToScale(value) {
    value = clamp(Number(value), SLIDER_MIN, SLIDER_MAX);
    if (value <= SLIDER_MID) {
      var lowSpan = SLIDER_MID - SLIDER_MIN;
      if (!(lowSpan > 0)) return roundScale(MIN_SCALE);
      var tLow = (value - SLIDER_MIN) / lowSpan;
      return roundScale(MIN_SCALE + tLow * (DEFAULT_SCALE - MIN_SCALE));
    }
    var highSpan = SLIDER_MAX - SLIDER_MID;
    if (!(highSpan > 0)) return roundScale(MAX_SCALE);
    var tHigh = (value - SLIDER_MID) / highSpan;
    return roundScale(DEFAULT_SCALE + tHigh * (MAX_SCALE - DEFAULT_SCALE));
  }

  function formatScalePercent(nextScale) {
    return Math.round(nextScale * 1000) / 10 + '%';
  }

  function hideSliderTitle(slider) {
    if (!slider || typeof slider.getChild !== 'function') return;
    var title = slider.getChild('title');
    if (!title) return;
    title.visible = false;
    title.touchable = false;
    title.alpha = 0;
  }

  function captureNativeScaleMetrics(comp) {
    if (nativeScaleMetrics || !comp) return nativeScaleMetrics;
    try {
      var btnAdd = comp.m_btnAdd;
      var btnSub = comp.m_btnSub;
      var slider = comp.m_slider;
      nativeScaleMetrics = {
        btnW: btnAdd ? Number(btnAdd.width || 56) : 56,
        btnH: btnAdd ? Number(btnAdd.height || 56) : 56,
        slotH: slider && btnAdd && btnSub ? Math.max(80, Number(btnSub.y || 0) - Number(btnAdd.y || 0) - Number(btnAdd.height || 56)) : 152,
        compW: Number(comp.width || 56),
        compH: Number(comp.height || 264)
      };
    } catch (e) {}
    return nativeScaleMetrics;
  }

  function getScaleLayoutMetrics(comp) {
    captureNativeScaleMetrics(comp);
    return {
      btnW: SCALE_UI_BTN_W,
      btnH: SCALE_UI_BTN_H,
      slotH: SCALE_UI_SLOT_H
    };
  }

  function isObCompHostVisible(ui) {
    if (!ui || !ui.m_OBComp) return false;
    try {
      return ui.m_OBComp.visible !== false && ui.m_OBComp.alpha > 0.01;
    } catch (e) {}
    return false;
  }

  function isScaleCompOnObComp(comp, ui) {
    return !!(comp && ui && ui.m_OBComp && comp.parent === ui.m_OBComp);
  }

  function configureSliderInteraction(slider) {
    if (!slider) return;
    hideSliderTitle(slider);
    try { slider.changeOnClick = true; } catch (e) {}
    try { slider.canDrag = true; } catch (e) {}
    try { slider.wholeNumbers = true; } catch (e) {}
    hookSliderGripAlign(slider);
  }

  function isSliderAxisRotated(slider) {
    var rot = Math.abs(Number(slider && slider.rotation || 0) % 360);
    return rot === 90 || rot === 270;
  }

  function alignSliderGrip(slider) {
    if (!slider || typeof slider.getChild !== 'function') return;
    var grip = slider.getChild('grip');
    if (!grip) return;
    var offset = SCALE_UI_GRIP_OFFSET_X;
    if (isSliderAxisRotated(slider)) {
      var sh = Number(slider.height || 0);
      var gh = Number(grip.height || 0);
      if (sh > 0) grip.y = Math.round((sh - gh) / 2) + offset;
    } else {
      var sw = Number(slider.width || 0);
      var gw = Number(grip.width || 0);
      if (sw > 0) grip.x = Math.round((sw - gw) / 2) + offset;
    }
  }

  function hookSliderGripAlign(slider) {
    if (!slider || slider.__saltGripAlignWrapped) return;
    slider.__saltGripAlignWrapped = true;
    if (typeof slider.update === 'function') {
      var originalUpdate = slider.update.bind(slider);
      slider.update = function() {
        originalUpdate();
        alignSliderGrip(slider);
      };
    }
    if (typeof slider.handleSizeChanged === 'function') {
      var originalHandleSizeChanged = slider.handleSizeChanged.bind(slider);
      slider.handleSizeChanged = function() {
        originalHandleSizeChanged();
        alignSliderGrip(slider);
      };
    }
  }

  function syncScaleUi() {
    sliderSyncLock = true;
    try {
      if (scaleSlider) {
        var sliderValue = scaleToSliderValue(scale);
        if (scaleSlider.tagName === 'INPUT') scaleSlider.value = String(sliderValue);
        else scaleSlider.value = sliderValue;
        hideSliderTitle(scaleSlider);
        if (typeof scaleSlider.update === 'function') scaleSlider.update();
        alignSliderGrip(scaleSlider);
      }
      if (scaleLabel) scaleLabel.textContent = formatScalePercent(scale);
    } catch (e) {}
    sliderSyncLock = false;
  }

  function syncScaleUiFast() {
    sliderSyncLock = true;
    try {
      if (scaleSlider) {
        var sliderValue = scaleToSliderValue(scale);
        if (scaleSlider.tagName === 'INPUT') scaleSlider.value = String(sliderValue);
        else scaleSlider.value = sliderValue;
      }
      if (scaleLabel) scaleLabel.textContent = formatScalePercent(scale);
    } catch (e) {}
    sliderSyncLock = false;
  }

  function onScaleSliderChanged() {
    if (sliderSyncLock || !scaleSlider) return;
    var oldScale = scale;
    var next = sliderValueToScale(scaleSlider.value);
    scale = clamp(next, MIN_SCALE, MAX_SCALE);
    saveScale();
    alignSliderGrip(scaleSlider);
    syncScaleUi();
    if (!applyZoomNow(oldScale, true)) emitGameMapScale(scale);
    if (isSaltFieldActive()) refreshVisionOnly();
    lastDebug.scale = scale;
  }

  function getLegionWarPanelProxy() {
    if (!isGRootReady()) return null;
    var indexUi = safeRequire('index-ui');
    var panelMod = safeRequire('LegionWarPanel');
    if (!indexUi || typeof indexUi.GET_PROXY !== 'function' || !panelMod || !panelMod.LegionWarPanel) return null;
    try { return indexUi.GET_PROXY(panelMod.LegionWarPanel); } catch (e) { return null; }
  }

  function getNativeScaleComp() {
    var panel = getLegionWarPanelProxy();
    if (!panel || !panel.ui || !panel.ui.m_OBComp) return null;
    return panel.ui.m_OBComp.m_scaleComp || null;
  }

  function getScaleUiRoot(comp) {
    if (!comp || !comp.parent) return comp;
    return comp.parent.name === SCALE_HOST_NAME ? comp.parent : comp;
  }

  function getRightColumnButtonMetrics(ui) {
    var col = ui && ui.m_rightBtns;
    if (!col) return null;
    var ref = null;
    var names = ['btnHelp', 'btnRank', 'btnReport', 'btnDeploy'];
    var i;
    for (i = 0; i < names.length; i++) {
      try {
        var named = col.getChild(names[i]);
        if (named && named.visible !== false) {
          ref = named;
          break;
        }
      } catch (e) {}
    }
    if (!ref) {
      for (i = 0; i < col.numChildren; i++) {
        try {
          var child = col.getChildAt(i);
          if (child && child.visible !== false) {
            ref = child;
            break;
          }
        } catch (e2) {}
      }
    }
    if (!ref) return null;
    try {
      var panel = col.parent || ui;
      var gpt = ref.localToGlobal(0, 0);
      var lpt = panel.globalToLocal(gpt.x, gpt.y);
      return {
        width: Number(ref.width || SCALE_UI_BTN_W),
        height: Number(ref.height || SCALE_UI_BTN_H),
        localX: Math.round(lpt.x),
        localTopY: Math.round(lpt.y)
      };
    } catch (e3) {}
    return null;
  }

  function getShowButtonMetrics(ui) {
    var btn = ui && ui.m_btnShow;
    if (!btn || btn.visible === false) return null;
    try {
      var panel = ui;
      var gpt = btn.localToGlobal(0, 0);
      var lpt = panel.globalToLocal(gpt.x, gpt.y);
      return {
        width: Number(btn.width || SCALE_UI_BTN_W),
        height: Number(btn.height || SCALE_UI_BTN_H),
        localX: Math.round(lpt.x),
        localTopY: Math.round(lpt.y)
      };
    } catch (e) {}
    return null;
  }

  function getResetButtonMetrics(ui) {
    return getShowButtonMetrics(ui) || getRightColumnButtonMetrics(ui) || {
      width: SCALE_UI_BTN_W,
      height: SCALE_UI_BTN_H,
      localX: 0,
      localTopY: 0
    };
  }

  function getScaleAnchorTopY(ui, metrics) {
    var panel = ui;
    try {
      if (ui.m_btnShow && ui.m_btnShow.visible !== false) {
        var showPt = ui.m_btnShow.localToGlobal(0, 0);
        return Math.round(panel.globalToLocal(showPt.x, showPt.y).y);
      }
    } catch (e) {}
    try {
      if (ui.m_rightBtns) {
        var colPt = ui.m_rightBtns.localToGlobal(0, 0);
        return Math.round(panel.globalToLocal(colPt.x, colPt.y).y);
      }
    } catch (e2) {}
    return metrics ? metrics.localTopY : 0;
  }

  function placeScaleHostLayer(ui, host) {
    if (!ui || !host || typeof ui.getChildIndex !== 'function' || typeof ui.setChildIndex !== 'function') return;
    var anchor = null;
    if (ui.m_btnShow && ui.m_btnShow.visible !== false) anchor = ui.m_btnShow;
    else if (ui.m_rightBtns) anchor = ui.m_rightBtns;
    if (!anchor) return;
    try {
      var idx = ui.getChildIndex(anchor);
      if (idx >= 0) ui.setChildIndex(host, idx);
    } catch (e) {}
  }

  function getScaleColumnMetrics(ui) {
    var metrics = getRightColumnButtonMetrics(ui);
    if (metrics) return metrics;
    return {
      width: SCALE_UI_BTN_W,
      height: SCALE_UI_BTN_H,
      localX: 0,
      localTopY: 0
    };
  }

  function setScaleResetBtnLabel(btn) {
    if (!btn) return;
    try {
      if (typeof btn.title !== 'undefined') btn.title = '恢复';
      if (btn.getChild) {
        var title = btn.getChild('title');
        if (title) title.text = '恢复';
      }
      if (btn.m_title) btn.m_title.text = '恢复';
      if (btn.m_redPoint) btn.m_redPoint.visible = false;
    } catch (e) {}
  }

  function ensureScaleResetBtn(ui, host) {
    if (!host) return null;
    var btn = null;
    try { btn = host.getChild(SCALE_RESET_BTN_NAME); } catch (e) {}
    if (!btn) {
      var ref = ui && ui.m_btnShow && ui.m_btnShow.visible !== false ? ui.m_btnShow : null;
      if (!ref && ui && ui.m_rightBtns) ref = ui.m_rightBtns.getChild('btnHelp');
      if (ref && typeof ref.clone === 'function') {
        try { btn = ref.clone(); } catch (e2) {}
      }
      if (!btn && ref && ref.resourceURL) {
        try { btn = getFgui().UIPackage.createObjectFromURL(ref.resourceURL); } catch (e3) {}
      }
      if (btn) {
        btn.name = SCALE_RESET_BTN_NAME;
        host.addChild(btn);
      }
    }
    if (btn) {
      var resetMetrics = getResetButtonMetrics(ui);
      try {
        btn.setSize(resetMetrics.width, resetMetrics.height);
      } catch (e4) {}
      setScaleResetBtnLabel(btn);
      btn.visible = true;
      btn.alpha = 1;
      btn.touchable = true;
    }
    scaleBtnReset = btn;
    return btn;
  }

  function layoutScaleHost(host, comp, ui) {
    if (!host || !comp) return;
    var colMetrics = getScaleColumnMetrics(ui);
    var resetMetrics = getResetButtonMetrics(ui);
    var hostW = colMetrics.width;
    var resetW = resetMetrics.width;
    var resetH = resetMetrics.height;
    var resetBtn = scaleBtnReset;
    try { if (!resetBtn) resetBtn = host.getChild(SCALE_RESET_BTN_NAME); } catch (e) {}
    try {
      var compW = Number(comp.width || SCALE_UI_BTN_W);
      var compH = Number(comp.height || (SCALE_UI_BTN_H + SCALE_UI_SLOT_H + SCALE_UI_BTN_H));
      var compX = Math.round((hostW - compW) / 2);
      var compY = SCALE_UI_SLIDER_OFFSET_Y;
      comp.setPosition(compX, compY);
      if (resetBtn) {
        resetBtn.setSize(resetW, resetH);
        resetBtn.setPosition(Math.round((hostW - resetW) / 2), compY + compH + SCALE_UI_RESET_GAP);
        host.setSize(hostW, compY + compH + SCALE_UI_RESET_GAP + resetH);
      } else {
        host.setSize(hostW, compY + compH);
      }
    } catch (e2) {}
  }

  function ensureScaleHost(ui, comp) {
    var fgui = getFgui();
    if (!ui || !comp || !fgui || !isGRootReady(fgui)) return comp;
    var host = null;
    try { host = ui.getChild(SCALE_HOST_NAME); } catch (e) {}
    if (!host) {
      host = new fgui.GComponent();
      host.name = SCALE_HOST_NAME;
      ui.addChild(host);
    }
    if (comp.parent !== host) {
      try {
        comp.removeFromParent();
        host.addChildAt(comp, 0);
      } catch (e2) {}
    }
    comp.name = SALT_SCALE_NAME;
    ensureScaleResetBtn(ui, host);
    layoutScaleHost(host, comp, ui);
    return host;
  }

  function bindScaleResetBtn() {
    var btn = scaleBtnReset;
    if (!btn) return;
    try {
      if (typeof btn.clearClick === 'function') btn.clearClick();
      if (typeof btn.onClick === 'function') {
        btn.onClick(function() {
          resetAll();
        });
      }
    } catch (e) {}
  }

  function removeOrphanScaleUI() {
    if (!isGRootReady()) return;
    var panel = getLegionWarPanelProxy();
    var ui = panel && panel.ui;
    var fgui = getFgui();
    if (ui) {
      try {
        var orphanHost = ui.getChild(SCALE_HOST_NAME);
        if (orphanHost && !orphanHost.getChild(SALT_SCALE_NAME)) {
          if (typeof orphanHost.dispose === 'function') orphanHost.dispose();
          else if (typeof orphanHost.removeFromParent === 'function') orphanHost.removeFromParent();
        }
      } catch (e0) {}
    }
    if (fgui) {
      var root = safeGetGRootInst(fgui);
      if (root) {
        try {
          var onRoot = root.getChild(SALT_SCALE_NAME);
          if (onRoot) {
            if (ui && onRoot.m_slider) ensureScaleCompPlacement(ui, onRoot);
            else if (typeof onRoot.dispose === 'function') onRoot.dispose();
            else if (typeof onRoot.removeFromParent === 'function') onRoot.removeFromParent();
          }
        } catch (e) {}
      }
    }
    try {
      var dom = document.getElementById('salt-field-view-scale');
      if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    } catch (e2) {}
  }

  function restoreScaleCompInObComp(ui, comp) {
    if (!ui || !ui.m_OBComp || !comp) return comp;
    try {
      if (comp.parent !== ui.m_OBComp) {
        comp.removeFromParent();
        ui.m_OBComp.addChild(comp);
      }
      comp.name = 'scaleComp';
      comp.visible = true;
      comp.alpha = 1;
      comp.touchable = true;
      if (comp.m_slider) configureSliderInteraction(comp.m_slider);
    } catch (e) {}
    return comp;
  }

  function ensureScaleCompPlacement(ui, comp) {
    if (!ui || !comp) return comp;
    captureNativeScaleMetrics(comp);
    return mountScaleCompOnPanel(ui, comp);
  }

  function isObCompScaleVisible(ui) {
    if (!ui || !ui.m_OBComp || !ui.m_OBComp.m_scaleComp) return false;
    var ob = ui.m_OBComp;
    var comp = ob.m_scaleComp;
    try {
      if (!ob.visible || ob.alpha <= 0.01 || !comp.visible || comp.alpha <= 0.01) return false;
      var fgui = getFgui();
      if (!fgui || !isGRootReady(fgui)) return false;
      var root = safeGetGRootInst(fgui);
      if (!root) return false;
      var pt = comp.localToGlobal(comp.width / 2, comp.height / 2);
      return pt.x >= 0 && pt.y >= 0 && pt.x <= root.width && pt.y <= root.height;
    } catch (e) {}
    return false;
  }

  function mountScaleCompOnPanel(ui, comp) {
    if (!ui || !comp) return comp;
    try {
      var host = ensureScaleHost(ui, comp);
      host.visible = true;
      host.alpha = 1;
      host.touchable = true;
      if (typeof ui.setChildIndex === 'function') placeScaleHostLayer(ui, host);
    } catch (e) {}
    fixVerticalScaleLayout(comp, true, ui);
    layoutScaleHost(getScaleUiRoot(comp), comp, ui);
    placeScaleCompAboveRightBtns(ui, getScaleUiRoot(comp));
    bindScaleResetBtn();
    return comp;
  }

  function needsVerticalLayoutFix(comp) {
    if (!comp || !comp.m_btnAdd || !comp.m_btnSub || !comp.m_slider) return false;
    if (comp.width > comp.height * 1.15) return true;
    return Math.abs(comp.m_btnAdd.y - comp.m_btnSub.y) < 8;
  }

  function clearFguiRelations(obj) {
    if (!obj) return;
    try {
      if (obj.relations && typeof obj.relations.clearAll === 'function') obj.relations.clearAll();
    } catch (e) {}
  }

  function layoutSliderVertical(slider, hostW, topOffset, slotH) {
    if (!slider) return false;
    try {
      var barV = slider.getChild ? slider.getChild('bar_v') : null;
      var barH = slider.getChild ? slider.getChild('bar') : null;
      var grip = slider.getChild ? slider.getChild('grip') : null;
      var trackH = Math.max(80, slotH);
      var trackW = Math.max(36, hostW - 6);
      var centerX = Math.round(hostW / 2) + SCALE_UI_SLIDER_OFFSET_X;
      var posY = topOffset;

      if (barH) {
        barH.visible = false;
        barH.alpha = 0;
        barH.touchable = false;
      }
      if (barV) {
        barV.visible = false;
        barV.alpha = 0;
        barV.touchable = false;
      }

      if (barV) {
        try {
          slider.kn = null;
          slider.Gh = barV;
        } catch (e) {}
        slider.rotation = 0;
        slider.setScale(1, 1);
        try { slider.setPivot(0.5, 0, true); } catch (e2) {
          try { slider.pivotX = 0.5; slider.pivotY = 0; } catch (e3) {}
        }
        slider.setSize(trackW, trackH);
        slider.setPosition(centerX, topOffset);
        try { slider.Th = true; } catch (e4) {}
      } else {
        try {
          slider.kn = barH || null;
          slider.Gh = null;
        } catch (e5) {}
        slider.setSize(Math.max(80, trackH - 6), trackW);
        try { slider.setPivot(0.5, 0.5, true); } catch (e6) {
          try { slider.pivotX = 0.5; slider.pivotY = 0.5; } catch (e7) {}
        }
        slider.rotation = -90;
        try { slider.Th = false; } catch (e8) {}
        slider.setScale(1, 1);
        posY = Math.round(topOffset + trackH / 2);
        slider.setPosition(centerX, posY);
      }

      configureSliderInteraction(slider);

      if (grip) {
        grip.rotation = 0;
        grip.setScale(1, 1);
        grip.visible = true;
        grip.touchable = true;
      }

      if (typeof slider.handleSizeChanged === 'function') slider.handleSizeChanged();
      if (typeof slider.update === 'function') slider.update();
      alignSliderGrip(slider);
      return true;
    } catch (e9) {}
    return false;
  }

  function configureSliderForHost(slider) {
    if (!slider) return false;
    return configureSliderVertical(slider);
  }

  function configureSliderVertical(slider) {
    if (!slider) return false;
    var host = slider.parent;
    var hostW = host ? Number(host.width || 56) : 56;
    var btnH = host && host.m_btnAdd ? Number(host.m_btnAdd.height || 56) : 56;
    var slotH = host ? Math.max(100, Number(host.height || 0) - btnH * 2) : 152;
    return layoutSliderVertical(slider, hostW, btnH, slotH);
  }

  function getRightColumnAnchorPoint(ui) {
    if (!ui) return null;
    var refs = [ui.m_btnShow, ui.m_rightBtns];
    var bestY = Infinity;
    var bestX = 0;
    var found = false;
    for (var i = 0; i < refs.length; i++) {
      var node = refs[i];
      if (!node || node.visible === false) continue;
      try {
        var pt = node.localToGlobal(node.width / 2, 0);
        if (pt.y < bestY) {
          bestY = pt.y;
          bestX = pt.x;
          found = true;
        }
      } catch (e) {}
    }
    if (!found && ui.m_rightBtns) {
      try {
        var fallback = ui.m_rightBtns.localToGlobal(ui.m_rightBtns.width / 2, 0);
        bestY = fallback.y;
        bestX = fallback.x;
        found = true;
      } catch (e2) {}
    }
    return found ? { x: bestX, y: bestY } : null;
  }

  function placeScaleCompAboveRightBtns(ui, scaleRoot) {
    if (!ui || !scaleRoot) return;
    var metrics = getRightColumnButtonMetrics(ui);
    if (!metrics) {
      var anchorPt = getRightColumnAnchorPoint(ui);
      if (!anchorPt) return;
      var fgui = getFgui();
      var root = fgui && safeGetGRootInst(fgui);
      var parent = scaleRoot.parent || ui;
      var globalX = anchorPt.x - scaleRoot.width / 2;
      var globalY = anchorPt.y - scaleRoot.height - SCALE_UI_GAP_ABOVE + SCALE_UI_OFFSET_Y;
      if (root) globalY = Math.max(72, globalY);
      var local = parent.globalToLocal(globalX, globalY);
      scaleRoot.setPosition(Math.round(local.x), Math.round(local.y));
      return;
    }
    var anchorTopY = getScaleAnchorTopY(ui, metrics);
    var localX = metrics.localX;
    var localY = anchorTopY - scaleRoot.height - SCALE_UI_GAP_ABOVE + SCALE_UI_OFFSET_Y;
    if (localY < 72) localY = 72;
    scaleRoot.setPosition(Math.round(localX), Math.round(localY));
  }

  function createScaleCompInstance() {
    var fgui = getFgui();
    if (!fgui || !isGRootReady(fgui)) return null;
    var comp = null;
    try {
      var mod = safeRequire('UI_LeagueWarScaleComp');
      var Clz = mod && (mod.default || mod);
      if (Clz && typeof Clz.createInstance === 'function') comp = Clz.createInstance();
    } catch (e) {}
    if (!comp) {
      try { comp = fgui.UIPackage.createObject('ui_legionWar', 'LeagueWarScaleComp'); } catch (e2) {}
    }
    return comp && comp.m_slider ? comp : null;
  }

  function fixVerticalScaleLayout(comp, force) {
    if (!comp || !comp.m_slider) return;
    if (!force && !needsVerticalLayoutFix(comp)) return;
    var metrics = getScaleLayoutMetrics(comp);
    var btnAdd = comp.m_btnAdd;
    var btnSub = comp.m_btnSub;
    var slider = comp.m_slider;
    var bw = metrics.btnW;
    var bh = metrics.btnH;
    var slotH = metrics.slotH;
    var totalH = bh + slotH + bh;
    try {
      clearFguiRelations(comp);
      clearFguiRelations(btnAdd);
      clearFguiRelations(btnSub);
      clearFguiRelations(slider);
      comp.setSize(bw, totalH);
      comp.rotation = 0;
      comp.setScale(1, 1);
      if (btnAdd) {
        btnAdd.setSize(bw, bh);
        btnAdd.setPosition(0, 0);
        btnAdd.rotation = 0;
        btnAdd.visible = true;
      }
      if (btnSub) {
        btnSub.setSize(bw, bh);
        btnSub.setPosition(0, bh + slotH);
        btnSub.rotation = 0;
        btnSub.visible = true;
      }
      layoutSliderVertical(slider, bw, bh, slotH);
    } catch (e) {}
  }

  function showNativeScaleHost(ui) {
    if (!ui || !ui.m_OBComp) return null;
    var ob = ui.m_OBComp;
    try {
      ob.visible = true;
      if (ob.m_selectComp) ob.m_selectComp.visible = false;
      if (ob.m_scaleComp) ob.m_scaleComp.visible = true;
      if (typeof ui.setChildIndex === 'function') ui.setChildIndex(ob, ui.numChildren - 1);
    } catch (e) {}
    return ob.m_scaleComp || null;
  }

  function repositionScaleComp() {
    if (!isGRootReady()) return;
    if (!gameScaleComp) return;
    var panel = getLegionWarPanelProxy();
    if (!panel || !panel.ui || !isProxyVisible(panel)) {
      try { gameScaleComp.visible = false; } catch (e) {}
      try {
        var hiddenHost = getScaleUiRoot(gameScaleComp);
        if (hiddenHost && hiddenHost !== gameScaleComp) hiddenHost.visible = false;
      } catch (e1) {}
      return;
    }
    var ui = panel.ui;
    if (!ui.m_rightBtns) return;
    try {
      var host = ensureScaleHost(ui, gameScaleComp);
      if (host.parent !== ui) mountScaleCompOnPanel(ui, gameScaleComp);
      fixVerticalScaleLayout(gameScaleComp, true, ui);
      layoutScaleHost(host, gameScaleComp, ui);
      placeScaleCompAboveRightBtns(ui, host);
      gameScaleComp.visible = true;
      gameScaleComp.alpha = 1;
      gameScaleComp.touchable = true;
      host.visible = true;
      host.alpha = 1;
      host.touchable = true;
      if (gameScaleComp.m_slider) configureSliderForHost(gameScaleComp.m_slider);
      bindScaleResetBtn();
      placeScaleHostLayer(ui, host);
    } catch (e2) {}
  }

  function ensureNativeScaleVisible() {
    repositionScaleComp();
    return !!gameScaleComp;
  }

  function obtainGameScaleComp() {
    var panel = getLegionWarPanelProxy();
    if (!panel || !panel.ui || !isProxyVisible(panel)) return null;

    var ui = panel.ui;
    var comp = null;

    try { comp = ui.getChild(SALT_SCALE_NAME); } catch (e) {}

    if (!comp || !comp.m_slider) {
      if (ui.m_OBComp && ui.m_OBComp.m_scaleComp && ui.m_OBComp.m_scaleComp.m_slider) {
        comp = ui.m_OBComp.m_scaleComp;
      }
    }

    if (!comp || !comp.m_slider) comp = createScaleCompInstance();
    if (!comp) return null;

    return ensureScaleCompPlacement(ui, comp);
  }

  function emitGameMapScale(nextScale) {
    if (!isGRootReady()) return false;
    var indexUi = safeRequire('index-ui');
    var msMod = safeRequire('MapScene');
    if (!indexUi || !msMod || !msMod.MapScene) return false;
    var ms = null;
    try { ms = indexUi.GET_PROXY(msMod.MapScene); } catch (e) { return false; }
    if (!ms || !isProxyVisible(ms)) return false;

    var sigMod = safeRequire('LegionWarSignal');
    var sig = sigMod && sigMod.LegionWarSignal && sigMod.LegionWarSignal.MapScaleUpdate;
    if (!sig) return false;
    try {
      if (typeof sig.emit === 'function') { sig.emit(nextScale); return true; }
      if (typeof sig.dispatch === 'function') { sig.dispatch(nextScale); return true; }
    } catch (e) {}
    return false;
  }

  function bindNativeScaleComp(comp) {
    var fgui = getFgui();
    if (!comp || !fgui || !comp.m_slider) return false;

    var slider = comp.m_slider;
    var btnAdd = comp.m_btnAdd;
    var btnSub = comp.m_btnSub;

    gameScaleComp = comp;
    scaleSlider = slider;
    scaleBtnAdd = btnAdd;
    scaleBtnSub = btnSub;

    slider.min = SLIDER_MIN;
    slider.max = SLIDER_MAX;
    slider.value = scaleToSliderValue(scale);
    configureSliderForHost(slider);

    slider.off(fgui.Event.STATUS_CHANGED, onScaleSliderChanged, null);
    slider.on(fgui.Event.STATUS_CHANGED, onScaleSliderChanged, null);

    if (btnAdd && typeof btnAdd.clearClick === 'function') btnAdd.clearClick();
    if (btnSub && typeof btnSub.clearClick === 'function') btnSub.clearClick();

    if (btnAdd && typeof btnAdd.onClick === 'function') {
      btnAdd.onClick(function() {
        setScale(scale + SCALE_STEP);
      });
    }
    if (btnSub && typeof btnSub.onClick === 'function') {
      btnSub.onClick(function() {
        setScale(scale - SCALE_STEP);
      });
    }

    nativeScaleHooked = true;
    var panelProxy = getLegionWarPanelProxy();
    var panelUi = panelProxy && panelProxy.ui;
    var onPanel = !!(panelUi && getScaleUiRoot(comp).parent === panelUi);
    fixVerticalScaleLayout(comp, onPanel, panelUi);
    layoutScaleHost(getScaleUiRoot(comp), comp, panelUi);
    bindScaleResetBtn();
    repositionScaleComp();
    syncScaleUi();
    return true;
  }

  function ensureGameScaleUI() {
    if (!isGRootReady()) return false;
    removeOrphanScaleUI();
    if (!hasZoomableMap() && !getLegionWarPanelProxy()) return false;
    var comp = obtainGameScaleComp();
    if (!comp) return false;
    if (gameScaleComp === comp && nativeScaleHooked) {
      repositionScaleComp();
      syncScaleUi();
      return true;
    }
    return bindNativeScaleComp(comp);
  }

  function hookNativeScaleUI() {
    var ok = ensureGameScaleUI();
    setTimeout(function() {
      repositionScaleComp();
      syncScaleUi();
    }, 120);
    setTimeout(repositionScaleComp, 600);
    return ok;
  }

  function scheduleRefreshAll() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(function() {
      refreshTimer = null;
      refreshVisionOnly();
    }, 300);
  }

  function hasZoomableMap() {
    if (!isGRootReady()) return false;
    var indexUi = safeRequire('index-ui');
    if (!indexUi || typeof indexUi.GET_PROXY !== 'function') return false;
    try {
      var lpMod = safeRequire('LPMapPanel');
      if (lpMod && lpMod.LPMapPanel) {
        var lp = indexUi.GET_PROXY(lpMod.LPMapPanel);
        if (lp && lp.ui && lp.ui.m_map && isProxyVisible(lp)) return true;
      }
    } catch (e) {}
    try {
      var msMod = safeRequire('MapScene');
      if (msMod && msMod.MapScene) {
        var ms = indexUi.GET_PROXY(msMod.MapScene);
        if (ms && ms.ui && ms.ui.m_map && isProxyVisible(ms)) return true;
      }
    } catch (e) {}
    return false;
  }

  /** 直接缩放当前可见的盐场/月战地图，默认以当前视口中心为焦点 */
  function applyZoomNow(oldScale, focusViewport, focusPoint, zoomOptions) {
    if (!isGRootReady()) return false;
    if (oldScale == null || !(oldScale > 0)) oldScale = scale;
    if (focusViewport === undefined) focusViewport = true;
    zoomOptions = zoomOptions || {};
    var ok = false;
    var ctx = getZoomContext();
    if (!ctx.indexUi) return false;

    try {
      if (ctx.lp && ctx.lpMap) {
        var lpOldScale = getMapCurrentScale(ctx.lp._sourceMap, ctx.lpMap);
        if (!(lpOldScale > 0)) lpOldScale = oldScale;
        applyScaleWithViewportFocus(ctx.lpMap, ctx.lpMap.node, ctx.lp._sourceMap, lpOldScale, scale, ctx.lp, focusViewport, focusPoint, zoomOptions);
        if (!zoomOptions.skipUpdateMap && typeof ctx.lp._updateMap === 'function') ctx.lp._updateMap();
        ok = true;
      }
    } catch (e) {}

    try {
      if (ctx.ms && ctx.msMap) {
        var msOldScale = getMapCurrentScale(ctx.sm, ctx.msMap);
        if (!(msOldScale > 0)) msOldScale = oldScale;
        applyScaleWithViewportFocus(ctx.msMap, ctx.msMap.node, ctx.sm, msOldScale, scale, ctx.ms, focusViewport, focusPoint, zoomOptions);
        if (!zoomOptions.skipUpdateMap && typeof ctx.ms._updateMap === 'function') ctx.ms._updateMap();
        ok = true;
      }
    } catch (e) {}

    return ok;
  }

  function refreshVisionOnly() {
    if (!isSaltFieldActive()) return;
    var payloadSourceMap = getPayloadSourceMap();
    var legionWarContext = getLegionWarContext();
    var i;
    if (payloadSourceMap) {
      trackSourceMap(payloadSourceMap);
      bumpCache(payloadSourceMap);
      showRenderedTiles(payloadSourceMap);
    }
    if (legionWarContext && legionWarContext.sourceMap) {
      trackSourceMap(legionWarContext.sourceMap);
      bumpCache(legionWarContext.sourceMap);
      showRenderedTiles(legionWarContext.sourceMap);
    }
    for (i = 0; i < trackedSourceMaps.length; i++) {
      bumpCache(trackedSourceMaps[i]);
      showRenderedTiles(trackedSourceMaps[i]);
    }
    dispatchLightRefresh();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundScale(value) {
    return clamp(Math.round(value / SCALE_STEP) * SCALE_STEP, MIN_SCALE, MAX_SCALE);
  }

  function readScale() {
    try {
      var saved = Number(localStorage.getItem(SCALE_STORAGE_KEY));
      if (isFinite(saved)) return clamp(roundScale(saved), MIN_SCALE, MAX_SCALE);
    } catch (e) {}
    return DEFAULT_SCALE;
  }

  function saveScale() {
    try { localStorage.setItem(SCALE_STORAGE_KEY, String(scale)); } catch (e) {}
  }

  function getVisibleTileSpan(sourceMap) {
    if (!sourceMap || !sourceMap.mapContainer) return 0;
    try {
      var targetWindow = getGameWindow() || window;
      var targetFgui = targetWindow.fgui || window.fgui;
      if (!targetFgui) return 0;
      var root = safeGetGRootInst(targetFgui);
      if (!root) return 0;
      var container = sourceMap.mapContainer;
      var map = sourceMap.map || sourceMap;
      var pos2vec = sourceMap.pos2vec;
      if (typeof pos2vec !== 'function' && map && typeof map.pos2vec === 'function') {
        pos2vec = map.pos2vec.bind(map);
      }
      if (typeof pos2vec !== 'function') return 0;
      var o = container.globalToLocal(0, 0);
      var n = container.globalToLocal(root.width, root.height);
      var lu = pos2vec(o.x, o.y);
      var rd = pos2vec(n.x, n.y);
      return Math.max(Math.abs(rd.x - lu.x) + 1, Math.abs(rd.y - lu.y) + 1);
    } catch (e) {
      return 0;
    }
  }

  function getAutoCache(sourceMap) {
    var span = sourceMap ? getVisibleTileSpan(sourceMap) : 0;
    var cache;
    if (span > 0) {
      cache = Math.round(span * 0.12 + 2);
    } else {
      cache = Math.round(6 / Math.max(scale, MIN_SCALE));
    }
    return clamp(cache, MIN_CACHE, MAX_CACHE);
  }

  function readPanelMinimized() {
    try { return localStorage.getItem(PANEL_MIN_STORAGE_KEY) === '1'; } catch (e) {}
    return false;
  }

  function savePanelMinimized() {
    try { localStorage.setItem(PANEL_MIN_STORAGE_KEY, panelMinimized ? '1' : '0'); } catch (e) {}
  }

  function readPanelPos() {
    try {
      var raw = localStorage.getItem(PANEL_POS_STORAGE_KEY);
      if (!raw) return null;
      var pos = JSON.parse(raw);
      if (pos && isFinite(pos.left) && isFinite(pos.top)) return pos;
    } catch (e) {}
    return null;
  }

  function savePanelPos() {
    if (!panel) return;
    try {
      localStorage.setItem(PANEL_POS_STORAGE_KEY, JSON.stringify({
        left: panel.offsetLeft,
        top: panel.offsetTop
      }));
    } catch (e) {}
  }

  function applyPanelPos(pos) {
    if (!panel) return;
    var maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth - 4);
    var maxTop = Math.max(0, window.innerHeight - panel.offsetHeight - 4);
    panel.style.left = clamp(pos.left, 0, maxLeft) + 'px';
    panel.style.top = clamp(pos.top, 0, maxTop) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function setPanelMinimized(minimized) {
    panelMinimized = !!minimized;
    savePanelMinimized();
    ensureNativeScaleVisible();
  }

  function togglePanelMinimized() {
    setPanelMinimized(!panelMinimized);
  }

  function installPanelDrag(handle) {
    if (!handle || handle.__saltFieldViewDragInstalled) return;
    handle.__saltFieldViewDragInstalled = true;
    handle.style.cursor = 'move';

    var dragging = false;
    var startX = 0;
    var startY = 0;
    var originLeft = 0;
    var originTop = 0;

    function onMove(event) {
      if (!dragging || !panel) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      applyPanelPos({ left: originLeft + dx, top: originTop + dy });
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      savePanelPos();
    }

    handle.addEventListener('mousedown', function(event) {
      if (event.button !== 0 || !panel) return;
      if (event.target && event.target.tagName === 'BUTTON') return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = panel.offsetLeft;
      originTop = panel.offsetTop;
      event.preventDefault();
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
    }, true);

    handle.addEventListener('dblclick', function(event) {
      if (event.target && event.target.tagName === 'BUTTON') return;
      togglePanelMinimized();
    }, true);
  }

  function getGameWindow(forceScan) {
    if (!forceScan && requireWindow && typeof requireWindow.__require === 'function') return requireWindow;
    if (typeof window.__require === 'function') {
      requireWindow = window;
      return requireWindow;
    }
    try {
      var frames = document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        var contentWindow = frames[i].contentWindow;
        if (contentWindow && typeof contentWindow.__require === 'function') {
          requireWindow = contentWindow;
          return requireWindow;
        }
      }
    } catch (e) {}
    requireWindow = null;
    return null;
  }

  function resolveSourceMap(raw) {
    if (!raw) return null;
    if (typeof raw.updateMap === 'function' && raw.CACHE != null) return raw;
    return raw.sourceMap || raw._sourceMap || null;
  }

  function safeRequire(name) {
    var targetWindow = getGameWindow();
    if (!targetWindow) return null;
    try { return targetWindow.__require(name); } catch (e) { return null; }
  }

  function trackSourceMap(sourceMap) {
    if (!sourceMap) return;
    if (trackedSourceMaps.indexOf(sourceMap) < 0) trackedSourceMaps.push(sourceMap);
    sourceMap.__saltFieldViewCache = getAutoCache(sourceMap);
    sourceMap.__saltFieldViewScale = scale;
  }

  function trackMapScene(mapScene) {
    if (!mapScene) return;
    if (trackedMapScenes.indexOf(mapScene) < 0) trackedMapScenes.push(mapScene);
  }

  function bumpCache(sourceMap) {
    if (!sourceMap) return;
    var cache = getAutoCache(sourceMap);
    sourceMap.CACHE = cache;
    sourceMap.__saltFieldViewCache = cache;
  }

  function showRenderedTiles(sourceMap) {
    try {
      if (!sourceMap) return;
      var layerMap = sourceMap._layerMap;
      if (!layerMap || typeof layerMap.forEach !== 'function') return;
      layerMap.forEach(function(layer) {
        if (!layer) return;
        for (var x = 0; x < layer.length; x++) {
          var col = layer[x];
          if (!col) continue;
          for (var y = 0; y < col.length; y++) {
            var tile = col[y];
            var ui = tile && (tile.inst && tile.inst.ui || tile.comp);
            if (ui) ui.alpha = 1;
          }
        }
      });
    } catch (e) {}
  }

  function dispatchLightRefresh() {
    var signalModule = safeRequire('LPSignal');
    var refreshLight = signalModule && signalModule.LPSignal && signalModule.LPSignal.RefreshLight;
    if (refreshLight && typeof refreshLight.dispatch === 'function') {
      try { refreshLight.dispatch(); } catch (e) {}
    }
  }

  function getModuleByTypeName(typeName) {
    var configs = safeRequire('Configs');
    var moduleManager = safeRequire('ModuleManager');
    var moduleType = configs && configs.ModuleType && configs.ModuleType[typeName];
    var getModule = moduleManager && moduleManager.GET_MODULE;
    return moduleType != null && typeof getModule === 'function' ? getModule(moduleType) : null;
  }

  function getPayloadSourceMap() {
    var module = getModuleByTypeName('LEGION_PAYLOAD');
    return module ? module.sourceMap || module.lPWarData && module.lPWarData.sourceMap || null : null;
  }

  function getLegionWarContext() {
    if (!isGRootReady()) return null;
    var module = getModuleByTypeName('LEGION_WAR');
    var sourceMap = resolveSourceMap(module && module.sourceMap);
    if (!module || !sourceMap) {
      lastDebug.legionWar = 'no module/sourceMap';
      return null;
    }
    trackSourceMap(sourceMap);
    var mapScene = null;
    var indexUi = safeRequire('index-ui');
    var mapSceneModule = safeRequire('MapScene');
    try {
      if (indexUi && typeof indexUi.GET_PROXY === 'function' && mapSceneModule && mapSceneModule.MapScene) {
        mapScene = indexUi.GET_PROXY(mapSceneModule.MapScene);
      }
    } catch (e) {}
    if (mapScene) trackMapScene(mapScene);
    if (mapScene && mapScene.ui && mapScene.ui.m_map) sourceMap.mapContainer = mapScene.ui.m_map;
    return { module: module, sourceMap: sourceMap, mapScene: mapScene };
  }

  function setScale(nextScale, options) {
    options = options || {};
    if (options.continuous) {
      scheduleContinuousZoom(nextScale, options.focusPoint);
      scheduleZoomCommit(options.focusPoint);
      return scale;
    }
    var oldScale = scale;
    scale = clamp(roundScale(nextScale), MIN_SCALE, MAX_SCALE);
    saveScale();
    syncScaleUi();
    var focusViewport = options.focusViewport !== false;
    var ok = applyZoomNow(oldScale, focusViewport, options.focusPoint);
    if (!ok) ok = emitGameMapScale(scale);
    if (isSaltFieldActive()) refreshVisionOnly();
    updatePanel(ok);
    lastDebug.scale = scale;
    return scale;
  }

  function resetAll() {
    setScale(DEFAULT_SCALE);
  }

  function computeFullMapScale(sourceMap) {
    var targetWindow = getGameWindow() || window;
    var targetFgui = targetWindow.fgui || window.fgui;
    if (!sourceMap || !targetFgui) return MIN_SCALE;
    var root = safeGetGRootInst(targetFgui);
    if (!root) return MIN_SCALE;
    var map = sourceMap.map;
    var width = map && (map.width || sourceMap.width) || sourceMap.width || 0;
    var height = map && (map.height || sourceMap.height) || sourceMap.height || 0;
    if (!(width > 0 && height > 0)) return MIN_SCALE;
    var fit = Math.min(root.width / width, root.height / height) * 0.96;
    return clamp(roundScale(fit), MIN_SCALE, MAX_SCALE);
  }

  function refreshAll() {
    var ok = applyZoomNow();
    refreshVisionOnly();
    lastDebug.scale = scale;
    updatePanel(ok);
    return ok;
  }

  function fitFullMap() {
    var legionWarContext = getLegionWarContext();
    var payloadSourceMap = getPayloadSourceMap();
    var sourceMap = legionWarContext && legionWarContext.sourceMap || payloadSourceMap;
    if (!sourceMap) return null;
    var next = computeFullMapScale(sourceMap);
    setScale(next, { focusViewport: false });
    return next;
  }

  function patchLegionPayloadViewData(ViewDataProto) {
    if (!ViewDataProto || ViewDataProto.__saltFieldViewPatched) return;
    ViewDataProto.isPositionVisible = function() { return true; };
    ViewDataProto.__saltFieldViewPatched = true;
  }

  function patchLegionPayloadTile(TileProto) {
    if (!TileProto || TileProto.__saltFieldViewPatched) return;
    try {
      Object.defineProperty(TileProto, 'isView', {
        get: function() { return true; },
        configurable: true
      });
    } catch (e) {}
    if (typeof TileProto.refreshLight === 'function' && !TileProto.__saltFieldViewRefreshWrapped) {
      var originalRefreshLight = TileProto.refreshLight;
      TileProto.refreshLight = function() {
        this._isView = true;
        return originalRefreshLight.apply(this, arguments);
      };
      TileProto.__saltFieldViewRefreshWrapped = true;
    }
    TileProto.__saltFieldViewPatched = true;
  }

  function patchLegionPayloadSourceMap(SourceMapProto) {
    if (!SourceMapProto || SourceMapProto.__saltFieldViewPatched) return;

    SourceMapProto.getIsView = function() { return true; };

    try {
      Object.defineProperty(SourceMapProto, 'mapScale', {
        get: function() {
          return this.__saltFieldViewScale != null ? this.__saltFieldViewScale : scale;
        },
        set: function(value) {
          var next = Number(value);
          if (!isFinite(next) || next <= 0) next = scale;
          next = clamp(roundScale(next), MIN_SCALE, MAX_SCALE);
          scale = next;
          saveScale();
          this.__saltFieldViewScale = next;
          if (this.mapContainer && typeof this.mapContainer.setScale === 'function') {
            this.mapContainer.setScale(next, next);
          }
        },
        configurable: true
      });
    } catch (e) {}

    wrapLifecycle(SourceMapProto, 'initialize', function(original, args, self) {
      if (!isSaltFieldSourceMap(self)) return original.apply(self, args);
      bumpCache(self);
      trackSourceMap(self);
      var result = original.apply(self, args);
      bumpCache(self);
      if (self._mapScale != null && isFinite(self._mapScale) && self._mapScale > 0) {
        scale = clamp(roundScale(self._mapScale), MIN_SCALE, MAX_SCALE);
        saveScale();
      }
      self.__saltFieldViewScale = scale;
      return result;
    }, '__saltFieldViewInitWrapped');

    wrapLifecycle(SourceMapProto, 'updateMap', function(original, args, self) {
      if (!isSaltFieldSourceMap(self)) return original.apply(self, args);
      bumpCache(self);
      trackSourceMap(self);
      return original.apply(self, args);
    }, '__saltFieldViewUpdateWrapped');

    SourceMapProto.__saltFieldViewPatched = true;
  }

  function patchTiledSourceMap(SourceMapProto) {
    if (!SourceMapProto || SourceMapProto.__saltFieldViewPatched) return;

    var originalNeedShow = SourceMapProto.needShow;
    SourceMapProto.needShow = function() {
      if (isSaltFieldSourceMap(this)) return true;
      if (typeof originalNeedShow === 'function') return originalNeedShow.apply(this, arguments);
      return true;
    };

    wrapLifecycle(SourceMapProto, 'initialize', function(original, args, self) {
      if (!isSaltFieldSourceMap(self)) return original.apply(self, args);
      bumpCache(self);
      trackSourceMap(self);
      var result = original.apply(self, args);
      bumpCache(self);
      showRenderedTiles(self);
      if (self._mapScale != null && isFinite(self._mapScale) && self._mapScale > 0) {
        scale = clamp(roundScale(self._mapScale), MIN_SCALE, MAX_SCALE);
        saveScale();
      }
      self.__saltFieldViewScale = scale;
      return result;
    }, '__saltFieldViewTiledInitWrapped');

    wrapLifecycle(SourceMapProto, 'updateMap', function(original, args, self) {
      if (!isSaltFieldSourceMap(self)) return original.apply(self, args);
      bumpCache(self);
      trackSourceMap(self);
      var result = original.apply(self, args);
      showRenderedTiles(self);
      return result;
    }, '__saltFieldViewTiledUpdateWrapped');

    SourceMapProto.__saltFieldViewPatched = true;
  }

  function patchMapScaleProto(SourceMapProto) {
    if (!SourceMapProto || SourceMapProto.__saltFieldViewMapScalePatched) return;
    var originalDescriptor = null;
    try { originalDescriptor = Object.getOwnPropertyDescriptor(SourceMapProto, 'mapScale'); } catch (e) {}
    try {
      Object.defineProperty(SourceMapProto, 'mapScale', {
        get: function() {
          if (this.__saltFieldViewScale && isSaltFieldSourceMap(this)) return this.__saltFieldViewScale;
          if (originalDescriptor && typeof originalDescriptor.get === 'function') {
            return originalDescriptor.get.call(this);
          }
          return this._mapScale || DEFAULT_SCALE;
        },
        set: function(value) {
          if (!isSaltFieldSourceMap(this)) {
            if (originalDescriptor && typeof originalDescriptor.set === 'function') {
              originalDescriptor.set.call(this, value);
            } else {
              this._mapScale = value;
            }
            return;
          }
          var next = Number(value);
          if (!isFinite(next) || next <= 0) next = scale;
          next = clamp(roundScale(next), MIN_SCALE, MAX_SCALE);
          scale = next;
          saveScale();
          this.__saltFieldViewScale = next;
          if (originalDescriptor && typeof originalDescriptor.set === 'function') {
            try { originalDescriptor.set.call(this, next); } catch (e) {}
          } else {
            this._mapScale = next;
          }
          if (this.mapContainer && typeof this.mapContainer.setScale === 'function') {
            this.mapContainer.setScale(next, next);
          }
        },
        configurable: true
      });
    } catch (e) {}
    SourceMapProto.__saltFieldViewMapScalePatched = true;
  }

  function patchLegionWarPanel(LegionWarPanelProto) {
    if (!LegionWarPanelProto || LegionWarPanelProto.__saltFieldViewOnShowWrapped) return;
    if (typeof LegionWarPanelProto.onShow === 'function') {
      var originalOnShow = LegionWarPanelProto.onShow;
      LegionWarPanelProto.onShow = function() {
        var result = originalOnShow.apply(this, arguments);
        whenGRootReady(function() {
          hookNativeScaleUI();
          applyZoomNow();
          scheduleRefreshAll();
        });
        return result;
      };
      LegionWarPanelProto.__saltFieldViewOnShowWrapped = true;
    }
  }

  function patchLeagueWarObComp(ObCompProto) {
    if (!ObCompProto || ObCompProto.__saltFieldViewOnShowWrapped) return;
    if (typeof ObCompProto.onShow === 'function') {
      var originalOnShow = ObCompProto.onShow;
      ObCompProto.onShow = function() {
        var result = originalOnShow.apply(this, arguments);
        whenGRootReady(function() { hookNativeScaleUI(); });
        return result;
      };
      ObCompProto.__saltFieldViewOnShowWrapped = true;
    }
  }

  function patchMapScene(MapSceneProto) {
    if (!MapSceneProto || MapSceneProto.__saltFieldViewPatched) return;

    if (typeof MapSceneProto.onShow === 'function' && !MapSceneProto.__saltFieldViewOnShowWrapped) {
      var originalOnShow = MapSceneProto.onShow;
      MapSceneProto.onShow = function() {
        var result = originalOnShow.apply(this, arguments);
        var self = this;
        whenGRootReady(function() {
          trackMapScene(self);
          invalidateZoomContext();
          applyZoomNow(getMapCurrentScale(self.sourceMap, self.ui && self.ui.m_map), false);
          hookNativeScaleUI();
          scheduleRefreshAll();
        });
        return result;
      };
      MapSceneProto.__saltFieldViewOnShowWrapped = true;
    }

    if (typeof MapSceneProto._updateMap === 'function' && !MapSceneProto.__saltFieldViewUpdateMapWrapped) {
      var originalUpdateMap = MapSceneProto._updateMap;
      MapSceneProto._updateMap = function() {
        try {
          if (isSaltFieldActive()) {
            var sourceMap = this.sourceMap || this.getModule && this.getModule().sourceMap;
            if (sourceMap) bumpCache(sourceMap);
          }
        } catch (e) {}
        return originalUpdateMap.apply(this, arguments);
      };
      MapSceneProto.__saltFieldViewUpdateMapWrapped = true;
    }

    if (typeof MapSceneProto._updateScale === 'function' && !MapSceneProto.__saltFieldViewUpdateScaleWrapped) {
      var originalUpdateScale = MapSceneProto._updateScale;
      MapSceneProto._updateScale = function(nextScale) {
        var sourceMap = this.sourceMap;
        if (!sourceMap && this.getModule) {
          try { sourceMap = this.getModule().sourceMap; } catch (e) {}
        }
        var mapComp = this.ui && this.ui.m_map;
        if (!sourceMap || !mapComp || !mapComp.node) {
          return originalUpdateScale.apply(this, arguments);
        }
        var oldScale = getMapCurrentScale(sourceMap, mapComp);
        var targetScale = nextScale > 0 ? nextScale : oldScale;
        applyScaleWithViewportFocus(mapComp, mapComp.node, sourceMap, oldScale, targetScale, this, true);
        scale = clamp(roundScale(targetScale), MIN_SCALE, MAX_SCALE);
        saveScale();
        syncScaleUi();
      };
      MapSceneProto.__saltFieldViewUpdateScaleWrapped = true;
    }

    MapSceneProto.__saltFieldViewPatched = true;
  }

  function patchLPMapPanel(LPMapPanelProto) {
    if (!LPMapPanelProto || LPMapPanelProto.__saltFieldViewPatched) return;

    if (typeof LPMapPanelProto._updateMap === 'function' && !LPMapPanelProto.__saltFieldViewUpdateMapWrapped) {
      var originalUpdateMap = LPMapPanelProto._updateMap;
      LPMapPanelProto._updateMap = function() {
        try {
          if (this._sourceMap) {
            trackSourceMap(this._sourceMap);
            bumpCache(this._sourceMap);
            this._sourceMap.mapContainer = this.ui && this.ui.m_map;
          }
        } catch (e) {}
        return originalUpdateMap.apply(this, arguments);
      };
      LPMapPanelProto.__saltFieldViewUpdateMapWrapped = true;
    }

    if (typeof LPMapPanelProto.onShow === 'function' && !LPMapPanelProto.__saltFieldViewOnShowWrapped) {
      var originalOnShow = LPMapPanelProto.onShow;
      LPMapPanelProto.onShow = function() {
        var result = originalOnShow.apply(this, arguments);
        whenGRootReady(function() {
          invalidateZoomContext();
          applyZoomNow(scale, false);
          hookNativeScaleUI();
          scheduleRefreshAll();
        });
        return result;
      };
      LPMapPanelProto.__saltFieldViewOnShowWrapped = true;
    }

    if (typeof LPMapPanelProto._updateScale === 'function' && !LPMapPanelProto.__saltFieldViewUpdateScaleWrapped) {
      var originalLpUpdateScale = LPMapPanelProto._updateScale;
      LPMapPanelProto._updateScale = function(nextScale) {
        var sourceMap = this._sourceMap;
        var mapComp = this.ui && this.ui.m_map;
        if (!sourceMap || !mapComp || !mapComp.node) {
          return originalLpUpdateScale.apply(this, arguments);
        }
        var oldScale = getMapCurrentScale(sourceMap, mapComp);
        var targetScale = nextScale > 0 ? nextScale : oldScale;
        applyScaleWithViewportFocus(mapComp, mapComp.node, sourceMap, oldScale, targetScale, this, true);
        scale = clamp(roundScale(targetScale), MIN_SCALE, MAX_SCALE);
        saveScale();
        syncScaleUi();
      };
      LPMapPanelProto.__saltFieldViewUpdateScaleWrapped = true;
    }

    LPMapPanelProto.__saltFieldViewPatched = true;
  }

  function wrapLifecycle(proto, methodName, handler, flag) {
    if (typeof proto[methodName] !== 'function' || proto[flag]) return;
    var original = proto[methodName];
    proto[methodName] = function() {
      return handler(original, arguments, this);
    };
    proto[flag] = true;
  }

  function patchModuleIfPresent(moduleName, exportName, patcher) {
    var module = safeRequire(moduleName);
    var target = module && module[exportName];
    if (target && target.prototype) {
      patcher(target.prototype);
      return true;
    }
    return false;
  }

  function patchLegionWarModule() {
    var module = safeRequire('LegionWarModule');
    var proto = module && module.LegionWarModule && module.LegionWarModule.prototype;
    if (!proto || proto.__saltFieldViewCreateWrapped || typeof proto.createSourceMap !== 'function') return false;
    var originalCreateSourceMap = proto.createSourceMap;
    proto.createSourceMap = function() {
      var created = originalCreateSourceMap.apply(this, arguments);
      var self = this;
      whenGRootReady(function() {
        var sourceMap = resolveSourceMap(created) || resolveSourceMap(self.sourceMap);
        if (sourceMap) {
          trackSourceMap(sourceMap);
          bumpCache(sourceMap);
          showRenderedTiles(sourceMap);
        }
        applyZoomNow();
        scheduleRefreshAll();
      });
      return created;
    };
    proto.__saltFieldViewCreateWrapped = true;
    return true;
  }

  function applyAllPatches() {
    patchModuleIfPresent('LegionPayloadSourceMap', 'LegionPayloadSourceMap', patchLegionPayloadSourceMap);
    var lpSourceMapModule = safeRequire('LegionPayloadSourceMap');
    if (lpSourceMapModule && lpSourceMapModule.LPViewData) {
      patchLegionPayloadViewData(lpSourceMapModule.LPViewData.prototype);
    }
    patchModuleIfPresent('LPTile', 'LPTile', patchLegionPayloadTile);
    patchModuleIfPresent('SourceMap', 'SourceMap', patchTiledSourceMap);
    patchModuleIfPresent('SourceMap', 'SourceMap', patchMapScaleProto);
    patchModuleIfPresent('LeagueSourceMap', 'LeagueSourceMap', patchTiledSourceMap);
    patchModuleIfPresent('LeagueSourceMap', 'LeagueSourceMap', patchMapScaleProto);
    patchModuleIfPresent('ELeagueSourceMap', 'ELeagueSourceMap', patchTiledSourceMap);
    patchModuleIfPresent('ELeagueSourceMap', 'ELeagueSourceMap', patchMapScaleProto);
    patchModuleIfPresent('MapScene', 'MapScene', patchMapScene);
    patchModuleIfPresent('LPMapPanel', 'LPMapPanel', patchLPMapPanel);
    patchModuleIfPresent('LegionWarPanel', 'LegionWarPanel', patchLegionWarPanel);
    patchModuleIfPresent('LeagueWarObComp', 'LeagueWarObComp', patchLeagueWarObComp);
    patchLegionWarModule();
  }

  function isCorePatched() {
    var sourceMapModule = safeRequire('SourceMap');
    var mapSceneModule = safeRequire('MapScene');
    var sourceMapOk = !!(sourceMapModule && sourceMapModule.SourceMap && sourceMapModule.SourceMap.prototype.__saltFieldViewPatched);
    var mapSceneOk = !!(mapSceneModule && mapSceneModule.MapScene && mapSceneModule.MapScene.prototype.__saltFieldViewPatched);
    return sourceMapOk && mapSceneOk;
  }

  function updatePanel(active) {
    if (!isGRootReady()) return;
    syncScaleUi();
    ensureGameScaleUI();
    repositionScaleComp();
    if (gameScaleComp) gameScaleComp.alpha = active ? 1 : 0.78;
    lastDebug.nativeScale = !!gameScaleComp;
  }

  function installPinchGestureOn(targetWindow) {
    if (!targetWindow || targetWindow.__saltFieldViewPinchInstalled) return;
    targetWindow.__saltFieldViewPinchInstalled = true;

    function onPinchTouchStart(event) {
      if (!hasZoomableMap() || !event.touches || event.touches.length !== 2) return;
      var t0 = event.touches[0];
      var t1 = event.touches[1];
      var dist = touchDistance(t0, t1);
      if (!(dist >= PINCH_MIN_DISTANCE)) return;
      var mid = touchMidpoint(t0, t1, targetWindow);
      if (!mid) return;
      pinchState = {
        startDistance: dist,
        baseScale: scale,
        focusPoint: mid,
        window: targetWindow
      };
      event.preventDefault();
    }

    function onPinchTouchMove(event) {
      if (!pinchState || pinchState.window !== targetWindow) return;
      if (!hasZoomableMap()) {
        resetPinchState(false);
        return;
      }
      if (!event.touches || event.touches.length !== 2) return;
      var t0 = event.touches[0];
      var t1 = event.touches[1];
      var dist = touchDistance(t0, t1);
      if (!(dist >= PINCH_MIN_DISTANCE) || !(pinchState.startDistance > 0)) return;
      var mid = touchMidpoint(t0, t1, targetWindow) || pinchState.focusPoint;
      var nextScale = pinchState.baseScale * (dist / pinchState.startDistance);
      scheduleContinuousZoom(nextScale, mid);
      event.preventDefault();
    }

    function onPinchTouchEnd(event) {
      if (!pinchState || pinchState.window !== targetWindow) return;
      if (!event.touches || event.touches.length < 2) resetPinchState(true);
    }

    var touchOpts = { capture: true, passive: false };
    var touchTarget = targetWindow.document || targetWindow;
    touchTarget.addEventListener('touchstart', onPinchTouchStart, touchOpts);
    touchTarget.addEventListener('touchmove', onPinchTouchMove, touchOpts);
    touchTarget.addEventListener('touchend', onPinchTouchEnd, touchOpts);
    touchTarget.addEventListener('touchcancel', onPinchTouchEnd, touchOpts);
  }

  function installInputOn(targetWindow) {
    if (!targetWindow || targetWindow.__saltFieldViewInputInstalled) return;
    targetWindow.__saltFieldViewInputInstalled = true;
    targetWindow.addEventListener('keydown', function(event) {
      if (event.altKey && (event.key === 'v' || event.key === 'V')) {
        event.preventDefault();
        togglePanelMinimized();
        return;
      }
      if (!hasZoomableMap()) return;
      if (event.key === '=' || event.key === '+') { event.preventDefault(); setScale(scale + SCALE_STEP); }
      else if (event.key === '-' || event.key === '_') { event.preventDefault(); setScale(scale - SCALE_STEP); }
      else if (event.key === '0') { event.preventDefault(); resetAll(); }
    }, true);
    targetWindow.addEventListener('wheel', function(event) {
      if (!hasZoomableMap()) return;
      event.preventDefault();
      var focusPoint = clientToRootCoords(event.clientX, event.clientY, targetWindow);
      var liveScale = getLiveScale();
      var nextScale = event.ctrlKey
        ? liveScale * Math.exp(-event.deltaY * 0.01)
        : liveScale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
      setScale(nextScale, { continuous: true, focusPoint: focusPoint });
    }, { capture: true, passive: false });
    installPinchGestureOn(targetWindow);
  }

  function installInput() {
    if (inputInstalled) return;
    inputInstalled = true;
    installInputOn(window);
    var gameWindow = getGameWindow();
    if (gameWindow && gameWindow !== window) installInputOn(gameWindow);
  }

  function publishApi(targetWindow) {
    var api = {
      version: VERSION,
      setScale: setScale,
      getScale: function() { return scale; },
      getCache: function(sourceMap) { return getAutoCache(sourceMap); },
      refresh: refreshAll,
      reset: resetAll,
      fitFullMap: fitFullMap,
      togglePanel: togglePanelMinimized,
      setPanelMinimized: setPanelMinimized,
      debug: function() { refreshAll(); return lastDebug; }
    };
    targetWindow.__saltFieldView = api;
    targetWindow.__infiniteVision = api;
    targetWindow.__saltVisualZoom = {
      version: VERSION,
      setScale: setScale,
      refresh: refreshAll,
      debug: api.debug
    };
    window.__saltFieldView = api;
    window.__infiniteVision = api;
    window.__saltVisualZoom = targetWindow.__saltVisualZoom;
  }

  function tryPatch() {
    if (patched) return;
    attempts++;
    if (attempts > maxAttempts) return;
    if (!getGameWindow()) {
      setTimeout(tryPatch, retryDelay);
      return;
    }

    applyAllPatches();

    if (!isCorePatched()) {
      setTimeout(tryPatch, retryDelay);
      return;
    }

    installInput();
    publishApi(getGameWindow() || window);
    bootUiAfterGRoot();
    console.log('[SaltFieldView] enabled', VERSION, 'scale=', scale, 'grootWait=', !grootReadyFired);
    patched = true;
  }

  setTimeout(tryPatch, 3000);
})();
