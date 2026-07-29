/**
 * 通用面板增强器
 * 为文件型增强脚本创建的 DOM 浮动面板统一提供：
 *  1. 拖动转移（鼠标 + 触屏，Pointer Events，带 6px 阈值不影响点击）
 *  2. 视口自适应（手机/电脑宽高钳制，窗口缩放/横竖屏旋转时自动收回屏内）
 *  3. 位置记忆（localStorage，下次打开恢复上次拖放位置）
 * 由 GameLogin 在启用相关增强时自动前置注入，无需手动开启
 */
(function () {
  'use strict';
  if (window.__panelEnhancerInstalled) return;
  window.__panelEnhancerInstalled = true;

  var POS_KEY = '__enhance_panel_pos__';
  var EDGE = 24;          // 拖出屏幕时保留的最小可见边距
  var DRAG_THRESHOLD = 6; // 超过该位移才认定为拖动（不影响正常点击）

  // 已知缺少拖动/自适应能力的增强脚本面板
  // drag: 是否加拖动(默认true)  clamp: 是否钳制宽高(默认false)
  // skipClass: 含该类名时跳过拖动  remember: 是否记忆位置(默认true)
  var TARGETS = [
    { sel: '#starHelperPanel', clamp: true },                                   // 升星助手主面板
    { sel: '#starHelperToggleBtn' },                                            // 升星助手悬浮按钮
    { sel: '.hu-root' },                                                        // 武将升级悬浮组
    { sel: '.hu-panel', drag: false, clamp: true },                             // 武将升级面板(仅钳制宽高)
    { sel: '#opponent-wash-assistant', clamp: true, skipClass: 'opponent-wash-collapsed' }, // 对手洗练助手
    { sel: '#bx-blackmarket-panel' }                                            // 增强面板-黑市弹窗(自带宽高自适应)
  ];

  function loadPos() {
    try { return JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function savePos(sel, x, y) {
    try {
      var all = loadPos();
      all[sel] = { x: Math.round(x), y: Math.round(y) };
      localStorage.setItem(POS_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function setImp(el, prop, val) { el.style.setProperty(prop, val, 'important'); }

  // 固定到 left/top 定位（清除 right/bottom/transform 居中，确保拖动坐标生效）
  function pinTo(el, x, y) {
    setImp(el, 'left', Math.round(x) + 'px');
    setImp(el, 'top', Math.round(y) + 'px');
    setImp(el, 'right', 'auto');
    setImp(el, 'bottom', 'auto');
    setImp(el, 'transform', 'none');
    setImp(el, 'margin', '0');
  }

  // 坐标钳制：保证面板至少留 EDGE 边距可见，顶部不允许拖出
  function clampXY(el, x, y) {
    var w = el.offsetWidth || 50;
    return {
      x: Math.min(Math.max(x, EDGE - w), window.innerWidth - EDGE),
      y: Math.min(Math.max(y, 0), window.innerHeight - EDGE)
    };
  }

  // 宽高自适应钳制（手机端防溢出）
  function clampSize(el) {
    setImp(el, 'max-width', '94vw');
    setImp(el, 'max-height', '86vh');
    setImp(el, 'box-sizing', 'border-box');
    setImp(el, 'overflow-y', 'auto');
  }

  function makeDraggable(el, cfg) {
    var dragging = false, moved = false;
    var startX = 0, startY = 0, baseX = 0, baseY = 0, savedTransition = '';

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (cfg.skipClass && el.classList.contains(cfg.skipClass)) return;
      var t = e.target;
      // 交互控件上不启动拖动
      if (t.closest && t.closest('input,select,textarea,button,a,label,[contenteditable="true"]')) return;
      // 触屏在可滚动子区域内保留滚动手势
      if (e.pointerType === 'touch') {
        var n = t;
        while (n && n !== el) {
          if (n.scrollHeight > n.clientHeight + 4) return;
          n = n.parentElement;
        }
      }
      var rect = el.getBoundingClientRect();
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      baseX = rect.left; baseY = rect.top;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (!moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        moved = true;
        savedTransition = el.style.transition;
        setImp(el, 'transition', 'none');
      }
      e.preventDefault();
      var p = clampXY(el, baseX + dx, baseY + dy);
      pinTo(el, p.x, p.y);
    });

    // 拖动期间阻止浏览器触摸滚动手势接管
    el.addEventListener('touchmove', function (e) {
      if (dragging && e.cancelable) e.preventDefault();
    }, { passive: false });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) {
        moved = false;
        if (savedTransition) el.style.transition = savedTransition;
        else el.style.removeProperty('transition');
        var rect = el.getBoundingClientRect();
        if (cfg.remember !== false) savePos(cfg.sel, rect.left, rect.top);
        // 拖动结束后拦截一次点击，避免误触发面板内按钮
        el.addEventListener('click', function (ev) {
          ev.stopPropagation(); ev.preventDefault();
        }, { capture: true, once: true });
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    if (!el.style.cursor) el.style.cursor = 'move';
  }

  var savedPositions = loadPos();

  function enhance(el, cfg) {
    if (el.__peDone) return;
    el.__peDone = true;
    if (cfg.clamp) clampSize(el);
    if (cfg.drag === false) return;
    makeDraggable(el, cfg);
    // 恢复上次拖放位置
    var p = cfg.remember !== false && savedPositions[cfg.sel];
    if (p) {
      var c = clampXY(el, p.x, p.y);
      pinTo(el, c.x, c.y);
    }
  }

  function scan() {
    for (var i = 0; i < TARGETS.length; i++) {
      var nodes = document.querySelectorAll(TARGETS[i].sel);
      for (var j = 0; j < nodes.length; j++) enhance(nodes[j], TARGETS[i]);
    }
  }

  // 视口变化时把已拖动/钳制过的面板收回屏内
  function reclamp() {
    for (var i = 0; i < TARGETS.length; i++) {
      var cfg = TARGETS[i];
      var nodes = document.querySelectorAll(cfg.sel);
      for (var j = 0; j < nodes.length; j++) {
        var el = nodes[j];
        if (!el.__peDone) continue;
        if (cfg.clamp) clampSize(el);
        if (el.style.left && el.style.top) {
          var r = el.getBoundingClientRect();
          var c = clampXY(el, r.left, r.top);
          if (c.x !== r.left || c.y !== r.top) pinTo(el, c.x, c.y);
        }
      }
    }
  }

  // 面板多为脚本延迟创建：观察器 + 前2分钟轮询兜底
  try {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
  scan();
  var tick = setInterval(scan, 2000);
  setTimeout(function () { clearInterval(tick); }, 120000);

  window.addEventListener('resize', reclamp);
  window.addEventListener('orientationchange', function () { setTimeout(reclamp, 300); });

  console.log('[面板增强器] 已启用：拖动转移 + 宽高自适应 + 位置记忆');
})();
