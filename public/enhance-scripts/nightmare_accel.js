// ==UserScript==
// @name         十殿加速
// @namespace    ermao-local
// @version      1.0.0
// @description  十殿试炼战斗加速（Hook NightmareBattlePanel.DEFAULT_TIMESCALE）+ 可选 UI 全局加速
// @match        *://*/*
// @match        file:///*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  if (window.__ermaoTenPalaceAccelInstalled) return;
  window.__ermaoTenPalaceAccelInstalled = true;

  var TAG = '[十殿加速]';
  var STORAGE_TEN = 'ten_palace_speed';
  var STORAGE_UI = 'ui_speed';
  var POLL_MS = 300;
  var RETRY_MS = 2500;
  var DEFAULT_TEN = 100;
  var MAX_TEN = 200;
  var MAX_UI = 100;

  var uw = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  var state = {
    tenPalace: DEFAULT_TEN,
    uiSpeed: 0,
    panelHooked: false,
    uiApplied: false,
  };

  function log() {
    try {
      var args = [TAG].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    } catch (_) {}
  }

  function readStored(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') {
        var gm = GM_getValue(key, null);
        if (gm !== null && gm !== undefined && gm !== '') {
          var gn = Number(gm);
          if (!isNaN(gn)) return gn;
        }
      }
    } catch (_) {}
    try {
      var raw = localStorage.getItem('ermao_' + key);
      if (raw !== null && raw !== '') {
        var ln = Number(raw);
        if (!isNaN(ln)) return ln;
      }
    } catch (_) {}
    return fallback;
  }

  function writeStored(key, value) {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(key, value);
    } catch (_) {}
    try {
      localStorage.setItem('ermao_' + key, String(value));
    } catch (_) {}
  }

  function formatSpeed(v) {
    if (!v || v <= 0) return '关闭';
    return v + 'x';
  }

  function clampTen(v) {
    v = Math.round(Number(v) || 0);
    if (v < 0) v = 0;
    if (v > MAX_TEN) v = MAX_TEN;
    return v;
  }

  function clampUi(v) {
    v = Math.round(Number(v) || 0);
    if (v < 0) v = 0;
    if (v > MAX_UI) v = MAX_UI;
    return v;
  }

  function loadConfig() {
    state.tenPalace = clampTen(readStored(STORAGE_TEN, DEFAULT_TEN));
    state.uiSpeed = clampUi(readStored(STORAGE_UI, 0));
  }

  function saveConfig() {
    writeStored(STORAGE_TEN, state.tenPalace);
    writeStored(STORAGE_UI, state.uiSpeed);
  }

  function safeRequire(id) {
    if (typeof uw.__require !== 'function') return null;
    try {
      return uw.__require(id);
    } catch (_) {
      return null;
    }
  }

  function resolvePanelClass() {
    var ids = [
      'NightmareBattlePanel',
      'ui/nightmare/NightmareBattlePanel',
      '../ui/nightmare/NightmareBattlePanel',
    ];
    for (var i = 0; i < ids.length; i++) {
      var mod = safeRequire(ids[i]);
      if (!mod) continue;
      var cls = mod.NightmareBattlePanel || mod.default || mod;
      if (cls && typeof cls === 'function' && cls.prototype) return cls;
    }
    return null;
  }

  function lockInstanceTimescale(inst, scale) {
    if (!inst || scale <= 0) return false;
    if (inst.__ermaoTenTimescaleLocked === scale) return true;
    try {
      Object.defineProperty(inst, 'DEFAULT_TIMESCALE', {
        get: function () { return scale; },
        set: function () {},
        configurable: true,
      });
      inst.__ermaoTenTimescaleLocked = scale;
      return true;
    } catch (_) {
      try {
        inst.DEFAULT_TIMESCALE = scale;
        return true;
      } catch (_2) {
        return false;
      }
    }
  }

  function applyClassTimescale(cls) {
    if (!cls || state.tenPalace <= 0) return;
    try { cls.DEFAULT_TIMESCALE = state.tenPalace; } catch (_) {}
    try {
      if (cls.prototype) cls.prototype.DEFAULT_TIMESCALE = state.tenPalace;
    } catch (_) {}
  }

  function injectNightmareHook() {
    if (state.tenPalace <= 0) {
      state.panelHooked = true;
      return true;
    }

    var cls = resolvePanelClass();
    if (!cls || typeof cls.prototype.onShow !== 'function') return false;

    if (cls.prototype.onShow.__ermaoTenPatched) {
      applyClassTimescale(cls);
      state.panelHooked = true;
      return true;
    }

    var originalOnShow = cls.prototype.onShow;
    cls.prototype.onShow = function () {
      var ret = originalOnShow.apply(this, arguments);
      if (this._originalDefaultTimescale === undefined) {
        this._originalDefaultTimescale = this.DEFAULT_TIMESCALE;
      }
      lockInstanceTimescale(this, state.tenPalace);
      return ret;
    };
    cls.prototype.onShow.__ermaoTenPatched = true;

    applyClassTimescale(cls);
    state.panelHooked = true;
    log('NightmareBattlePanel.onShow 已 Hook，倍率=' + state.tenPalace);
    return true;
  }

  function applyUiEngineSpeed() {
    if (!uw.cc || !uw.cc.director || !uw.cc.director.getScheduler()) return false;
    if (state.uiSpeed <= 0) {
      // 关闭 UI 加速时还原全局时间倍率，避免残留加速影响游戏
      uw.cc.director.getScheduler().setTimeScale(1);
      state.uiApplied = false;
      return true;
    }
    uw.cc.director.getScheduler().setTimeScale(state.uiSpeed);
    state.uiApplied = true;
    return true;
  }

  function pollUntil(fn, onDone) {
    if (fn()) {
      if (onDone) onDone(true);
      return;
    }
    var tries = 0;
    var id = setInterval(function () {
      tries++;
      if (fn() || tries > 200) {
        clearInterval(id);
        if (onDone) onDone(!!fn());
      }
    }, POLL_MS);
  }

  function installRequireHook() {
    if (typeof uw.__require !== 'function' || uw.__require.__ermaoTenAccelHooked) return;
    var orig = uw.__require;
    uw.__require = function (id) {
      var mod = orig.apply(this, arguments);
      try {
        var sid = String(id || '');
        if (sid.indexOf('NightmareBattlePanel') >= 0 || (mod && mod.NightmareBattlePanel)) {
          injectNightmareHook();
        }
      } catch (_) {}
      return mod;
    };
    try {
      Object.keys(orig).forEach(function (k) { uw.__require[k] = orig[k]; });
    } catch (_) {}
    uw.__require.__ermaoTenAccelHooked = true;
  }

  function tickInstall() {
    installRequireHook();
    if (state.tenPalace > 0) injectNightmareHook();
    if (state.uiSpeed > 0) applyUiEngineSpeed();
  }

  function applyAll(fromUi) {
    loadConfig();
    state.panelHooked = false;
    tickInstall();
    pollUntil(function () {
      tickInstall();
      var tenOk = state.tenPalace <= 0 || state.panelHooked;
      var uiOk = state.uiSpeed <= 0 || state.uiApplied || applyUiEngineSpeed();
      return tenOk && uiOk;
    });
    if (fromUi) {
      log('已应用 — 十殿=' + formatSpeed(state.tenPalace) + '，UI=' + formatSpeed(state.uiSpeed));
    }
  }

  function injectStyles() {
    var css = [
      '/* 小图标（收起态） */',
      '#__ermao_ten_accel_icon{',
      '  position:fixed;top:72px;right:12px;z-index:2147483647;',
      '  width:28px;height:28px;border-radius:50%;cursor:pointer;',
      '  background:rgba(18,18,24,.85);border:1px solid rgba(255,105,180,.4);',
      '  display:flex;align-items:center;justify-content:center;',
      '  font-size:14px;color:#ff8ec7;user-select:none;',
      '  box-shadow:0 2px 8px rgba(0,0,0,.4);transition:all .2s;',
      '}',
      '#__ermao_ten_accel_icon:hover{background:rgba(255,105,180,.2);border-color:#ff69b4;transform:scale(1.1);}',
      '#__ermao_ten_accel_icon.active{border-color:#ff69b4;box-shadow:0 0 8px rgba(255,105,180,.4);}',
      '/* 弹出面板（展开态） */',
      '#__ermao_ten_accel_popup{',
      '  position:fixed;z-index:2147483646;display:none;',
      '  width:150px;padding:6px 8px;',
      '  background:rgba(18,18,24,.92);border:1px solid rgba(255,105,180,.35);',
      '  border-radius:8px;color:#f5f5f5;font:10px/1.3 -apple-system,sans-serif;',
      '  box-shadow:0 4px 16px rgba(0,0,0,.5);user-select:none;',
      '}',
      '#__ermao_ten_accel_popup.show{display:block;}',
      '#__ermao_ten_accel_popup .__row{margin-top:5px;}',
      '#__ermao_ten_accel_popup .__label{display:flex;justify-content:space-between;margin-bottom:1px;color:#aaa;font-size:10px;}',
      '#__ermao_ten_accel_popup .__val{color:#ff8ec7;font-weight:600;}',
      '#__ermao_ten_accel_popup input[type=range]{width:100%;height:12px;margin:0;accent-color:#ff69b4;}',
      '#__ermao_ten_accel_popup .__hint{margin-top:4px;color:#555;font-size:8px;}',
    ].join('\n');
    try {
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(css);
        return;
      }
    } catch (_) {}
    var s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function createPanel() {
    if (document.getElementById('__ermao_ten_accel_icon')) return;

    injectStyles();
    loadConfig();

    // ── 小图标按钮 ──
    var icon = document.createElement('div');
    icon.id = '__ermao_ten_accel_icon';
    icon.textContent = '⚡';
    icon.title = '十殿加速';

    // ── 弹出面板 ──
    var popup = document.createElement('div');
    popup.id = '__ermao_ten_accel_popup';

    function makeRow(labelText, idPrefix, max, value, onInput) {
      var row = document.createElement('div');
      row.className = '__row';
      var label = document.createElement('div');
      label.className = '__label';
      var left = document.createElement('span');
      left.textContent = labelText;
      var val = document.createElement('span');
      val.className = '__val';
      val.id = idPrefix + '_val';
      val.textContent = formatSpeed(value);
      label.appendChild(left);
      label.appendChild(val);
      var slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = String(max);
      slider.step = '1';
      slider.value = String(value);
      slider.id = idPrefix + '_slider';
      slider.addEventListener('input', function () {
        var n = onInput(Number(slider.value));
        slider.value = String(n);
        val.textContent = formatSpeed(n);
        saveConfig();
        applyAll(true);
      });
      row.appendChild(label);
      row.appendChild(slider);
      return row;
    }

    popup.appendChild(makeRow('十殿', '__ten', MAX_TEN, state.tenPalace, function (v) {
      state.tenPalace = clampTen(v); return state.tenPalace;
    }));
    popup.appendChild(makeRow('UI', '__ui', MAX_UI, state.uiSpeed, function (v) {
      state.uiSpeed = clampUi(v); return state.uiSpeed;
    }));

    var hint = document.createElement('div');
    hint.className = '__hint';
    hint.textContent = '十殿=战斗 UI=全局 0=关';
    popup.appendChild(hint);

    document.documentElement.appendChild(icon);
    document.documentElement.appendChild(popup);

    // ── 展开/收起逻辑 ──
    var isOpen = false;
    function positionPopup() {
      var r = icon.getBoundingClientRect();
      popup.style.top = (r.bottom + 4) + 'px';
      popup.style.right = (window.innerWidth - r.right) + 'px';
    }
    function toggle() {
      isOpen = !isOpen;
      popup.classList.toggle('show', isOpen);
      icon.classList.toggle('active', isOpen);
      if (isOpen) positionPopup();
    }
    icon.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    // 点击外部关闭
    document.addEventListener('click', function (e) {
      if (isOpen && !popup.contains(e.target) && e.target !== icon) {
        isOpen = false;
        popup.classList.remove('show');
        icon.classList.remove('active');
      }
    });

    // ── 图标拖拽 ──
    var dragging = false, moved = false, dx = 0, dy = 0;
    icon.addEventListener('mousedown', function (e) {
      dragging = true; moved = false;
      dx = e.clientX - icon.getBoundingClientRect().left;
      dy = e.clientY - icon.getBoundingClientRect().top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      moved = true;
      icon.style.left = Math.max(0, e.clientX - dx) + 'px';
      icon.style.top = Math.max(0, e.clientY - dy) + 'px';
      icon.style.right = 'auto';
      if (isOpen) positionPopup();
    });
    document.addEventListener('mouseup', function () {
      if (dragging && moved) { dragging = false; return; }
      dragging = false;
    });
    // 拖拽时不触发 click
    icon.addEventListener('click', function (e) {
      if (moved) { e.stopImmediatePropagation(); moved = false; }
    }, true);
  }

  // 对外 API（控制台可调）
  uw.__ermaoApplyTenPalaceSpeed = function (ten, ui) {
    if (ten != null) state.tenPalace = clampTen(ten);
    if (ui != null) state.uiSpeed = clampUi(ui);
    saveConfig();
    applyAll(true);
  };

  uw.__ermaoTenPalaceSpeedStatus = function () {
    return {
      tenPalace: state.tenPalace,
      uiSpeed: state.uiSpeed,
      panelHooked: state.panelHooked,
      uiApplied: state.uiApplied,
    };
  };

  function boot() {
    loadConfig();
    createPanel();
    applyAll(false);
    // 仅在仍有未完成 hook 项时轮询，空闲时零开销，避免常驻空转
    setInterval(function () {
      var idle = (state.tenPalace <= 0 || state.panelHooked) && (state.uiSpeed <= 0 || state.uiApplied);
      if (!idle) tickInstall();
    }, RETRY_MS);
    log('已加载 — 十殿=' + formatSpeed(state.tenPalace) + '，UI=' + formatSpeed(state.uiSpeed));
  }

  if (document.body) {
    boot();
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
})();
