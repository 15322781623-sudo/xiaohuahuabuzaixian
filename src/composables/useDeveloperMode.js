/**
 * 开发者模式 — 加载 eruda 移动端控制台，用于查看日志/网络/存储等调试数据
 *
 * 用法：
 *   import { initDeveloperMode, useDeveloperMode } from '@/composables/useDeveloperMode'
 *   const { isDevMode, toggleDevMode } = useDeveloperMode()
 *
 * 启动时调用 initDeveloperMode() 自动恢复上次开关状态。
 */

import { ref, watch } from 'vue';

const DEV_MODE_KEY = 'developerMode';
const ERUDA_CDN = 'https://cdn.jsdelivr.net/npm/eruda';

const isDevMode = ref(localStorage.getItem(DEV_MODE_KEY) === '1');
let erudaLoaded = false;

/** 加载 eruda 脚本并初始化 */
const loadEruda = async () => {
  if (erudaLoaded || window.eruda) return;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = ERUDA_CDN;
    script.onload = () => {
      window.eruda.init({
        tool: ['console', 'elements', 'network', 'resources', 'sources', 'info'],
        useShadowDom: true,
      });
      erudaLoaded = true;
      resolve();
    };
    script.onerror = () => {
      console.warn('[开发者模式] eruda 加载失败，请检查网络');
      resolve();
    };
    document.head.appendChild(script);
  });
};

/** 显示 eruda 面板 */
const showEruda = () => {
  if (window.eruda) window.eruda.show();
};

/** 隐藏 eruda 面板 */
const hideEruda = () => {
  if (window.eruda) window.eruda.hide();
};

/** 销毁 eruda 实例 */
const destroyEruda = () => {
  if (window.eruda) {
    window.eruda.destroy();
    erudaLoaded = false;
  }
};

// 监听开关变化，自动加载/销毁 eruda
watch(isDevMode, async (on) => {
  localStorage.setItem(DEV_MODE_KEY, on ? '1' : '0');
  if (on) {
    await loadEruda();
    showEruda();
  } else {
    destroyEruda();
  }
});

/** 启动时调用：恢复上次开关状态 */
export const initDeveloperMode = () => {
  if (isDevMode.value) {
    loadEruda();
  }
};

/** 组合式函数 */
export const useDeveloperMode = () => {
  const toggleDevMode = () => {
    isDevMode.value = !isDevMode.value;
  };

  return {
    isDevMode,
    toggleDevMode,
  };
};
