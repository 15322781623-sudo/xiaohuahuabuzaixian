// ==UserScript==
// @name         淬炼/洗炼加速
// @version      5.0
// @description  Hook QuenchStageUpDialog.onShow，锁定 spine 动画 timeScale 为 2.34x，
//               仅加速视觉动画不影响协议速率，避免"操作过快"服务端检测
// ==/UserScript==

(function() {
  'use strict';

  // 权限检查：仅永久卡和赞助版年卡可使用洗炼加速
  if (window.__yunqi_quenchAllowed === false) {
    console.log('[淬炼加速] 当前卡密类型无洗炼加速权限，跳过');
    return;
  }

  var TAG = '[淬炼加速]';
  var SPEED = 2.34;

  /**
   * Hook spine 特效的 timeScale，使淬炼/洗炼动画加速播放
   * 通过 Object.defineProperty 锁定 timeScale，阻止游戏逻辑重置速度
   */
  function hookSpineTimeScale(spineEffect) {
    if (!spineEffect) return;
    try {
      // 等待 spine 资源加载完成后再覆写 timeScale
      if (spineEffect.onLoadComplete && typeof spineEffect.onLoadComplete.addOnce === 'function') {
        spineEffect.onLoadComplete.addOnce(function() {
          applyTimeScale(spineEffect);
        });
      }
      // 如果 content 已经存在，直接覆写（spine 可能已加载）
      if (spineEffect.content) {
        applyTimeScale(spineEffect);
      }
    } catch(e) {
      console.warn(TAG + ' hookSpineTimeScale error:', e.message);
    }
  }

  /**
   * 用 Object.defineProperty 锁定 spine 动画的 timeScale
   * getter 始终返回加速值，setter 被拦截（阻止游戏重置）
   */
  function applyTimeScale(spineEffect) {
    try {
      var target = spineEffect.content;
      if (!target) return;
      if (target.__quenchTimeScaleLocked) return;

      Object.defineProperty(target, 'timeScale', {
        get: function() { return SPEED; },
        set: function(value) { /* 阻止游戏重置 timeScale */ },
        configurable: true
      });
      target.__quenchTimeScaleLocked = true;
      console.log(TAG + ' spine timeScale 已锁定为 ' + SPEED + 'x');
    } catch(e) {
      console.warn(TAG + ' applyTimeScale error:', e.message);
    }
  }

  /**
   * 尝试安装 Hook：
   * 找到 QuenchStageUpDialog 模块 → patch onShow 方法
   * → 弹窗打开时遍历所有 m_item 槽位的 spine 特效并加速
   */
  function tryInstall() {
    if (typeof window.__require !== 'function') return false;
    try {
      var mod = window.__require('QuenchStageUpDialog');
      if (!mod || !mod.QuenchStageUpDialog) return false;
      var Dialog = mod.QuenchStageUpDialog;
      if (Dialog.prototype.__quenchAccelPatched) return true;

      var origShow = Dialog.prototype.onShow;
      Dialog.prototype.onShow = function() {
        if (origShow) origShow.apply(this, arguments);
        try {
          var ui = this.ui;
          if (!ui) return;
          // 遍历所有可能的 m_item 槽位，hook spine 动画
          for (var i = 0; i < 10; i++) {
            var item = ui['m_item' + i];
            if (item && item.m_spineEffect) {
              hookSpineTimeScale(item.m_spineEffect);
            }
          }
        } catch(e) {
          console.warn(TAG + ' onShow hook error:', e.message);
        }
      };

      Dialog.prototype.__quenchAccelPatched = true;
      console.log(TAG + ' ✅ QuenchStageUpDialog 已 Hook，动画速度 ' + SPEED + 'x');
      return true;
    } catch(e) {
      // 模块尚未加载
      return false;
    }
  }

  // 轮询安装（等待游戏模块加载）
  var attempts = 0;
  var timer = setInterval(function() {
    attempts++;
    if (tryInstall()) {
      clearInterval(timer);
      return;
    }
    if (attempts > 60) {
      // 30 秒快轮询未命中后，降频继续尝试，避免模块晚加载时永久失效
      clearInterval(timer);
      var slowTimer = setInterval(function() {
        if (tryInstall()) {
          clearInterval(slowTimer);
        }
      }, 5000);
    }
  }, 500);

  console.log(TAG + ' 已注入，等待游戏加载...');
})();
