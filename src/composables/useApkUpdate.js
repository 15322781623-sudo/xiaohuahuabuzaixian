import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

/**
 * APK 自动更新检查 composable
 * 通过 Cloudflare Worker 检查最新版本并下载安装
 */

// Worker 地址（Cloudflare Worker 部署地址）
const WORKER_BASE = 'https://apk.xiaohuaxyzw.top';

// 本地存储的当前APK版本
const APK_VERSION_KEY = 'apk_current_version';
const APK_VERSION_CODE_KEY = 'apk_current_version_code';
const SKIP_VERSION_KEY = 'apk_skip_version';

// 默认当前版本（构建时由 Vite 从 build.gradle 自动注入，无需手动同步）
// 开发环境回退值（dev server 不经过构建）
const DEFAULT_VERSION_NAME = typeof __APK_VERSION_NAME__ !== 'undefined' ? __APK_VERSION_NAME__ : '1.1.3';
const DEFAULT_VERSION_CODE = typeof __APK_VERSION_CODE__ !== 'undefined' ? __APK_VERSION_CODE__ : 10103;

export function useApkUpdate() {
  const isChecking = ref(false);
  const updateInfo = ref(null);
  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const downloadError = ref('');

  /**
   * 获取本地APK版本信息
   */
  const getLocalVersion = () => {
    try {
      const versionName = localStorage.getItem(APK_VERSION_KEY) || DEFAULT_VERSION_NAME;
      const versionCode = Number(localStorage.getItem(APK_VERSION_CODE_KEY)) || DEFAULT_VERSION_CODE;
      return { versionName, versionCode };
    } catch {
      return { versionName: DEFAULT_VERSION_NAME, versionCode: DEFAULT_VERSION_CODE };
    }
  };

  /**
   * 检查是否有新版本
   */
  const checkUpdate = async (silent = false) => {
    // 仅在 Android 平台执行
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      if (!silent) {
        return { hasUpdate: false, reason: '非Android平台' };
      }
      return { hasUpdate: false };
    }

    isChecking.value = true;
    downloadError.value = '';

    try {
      const response = await CapacitorHttp.get({
        url: `${WORKER_BASE}/api/apk/version`,
        headers: { 'Content-Type': 'application/json' },
      });

      const serverInfo = typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;

      const localVersion = getLocalVersion();
      const skipVersion = localStorage.getItem(SKIP_VERSION_KEY);

      // 如果用户已跳过此版本，不提示（除非强制更新）
      if (skipVersion === serverInfo.latestVersion && !serverInfo.forceUpdate) {
        isChecking.value = false;
        return { hasUpdate: false, reason: '用户已跳过此版本' };
      }

      // 版本比较
      const serverCode = Number(serverInfo.versionCode) || 0;
      const localCode = localVersion.versionCode;
      const isBelowMinVersion = serverCode > 0 && localCode < (serverInfo.minVersionCode || 0);
      const hasNewerVersion = serverCode > localCode;

      if (hasNewerVersion || isBelowMinVersion) {
        updateInfo.value = {
          ...serverInfo,
          localVersion: localVersion.versionName,
          forceUpdate: serverInfo.forceUpdate || isBelowMinVersion,
        };

        console.log(`[APK更新] 发现更新: local=${localCode}, server=${serverCode}, force=${updateInfo.value.forceUpdate}`);
        return { hasUpdate: true, info: updateInfo.value };
      }

      isChecking.value = false;
      console.log(`[APK更新] 已是最新版本: local=${localCode}, server=${serverCode}`);
      return { hasUpdate: false, reason: '已是最新版本' };
    } catch (error) {
      console.error('[APK更新] 检查更新失败:', error.message, error.stack);
      downloadError.value = error.message || '检查更新失败';
      isChecking.value = false;
      if (!silent) {
        return { hasUpdate: false, reason: '检查更新失败', error: error.message };
      }
      return { hasUpdate: false, reason: '检查更新失败' };
    }
  };

  /**
   * 测试下载链接速度（发送 HEAD 请求测量响应时间）
   */
  const testDownloadSpeed = async (url, timeout = 5000) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
        
      // 使用 GET + range 请求测试连接速度（比 HEAD 更可靠）
      const resp = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timer);
        
      const elapsed = Date.now() - start;
      const ok = resp.ok || resp.status === 301 || resp.status === 302;
      console.log(`[APK测速] ${url.substring(0, 50)}... → ${elapsed}ms (${ok ? 'OK' : resp.status})`);
      return { url, elapsed, ok };
    } catch {
      const elapsed = Date.now() - start;
      console.log(`[APK测速] ${url.substring(0, 50)}... → 失败(${elapsed}ms)`);
      return { url, elapsed: 99999, ok: false };
    }
  };
  
  /**
   * 下载并安装APK（优先R2直连，失败回退Worker代理）
   */
  const downloadAndInstall = async () => {
    if (!updateInfo.value) return;
    // 防止重复下载
    if (isDownloading.value) return;
  
    isDownloading.value = true;
    downloadProgress.value = 0;
    downloadError.value = '';
  
    try {
      // 获取下载信息
      const versionResp = await fetch(`${WORKER_BASE}/api/apk/latest`);
      const downloadInfo = await versionResp.json();
        
      downloadProgress.value = 10;
  
      // 优先使用 R2 直连下载（Worker代理即R2源）
      const r2Url = downloadInfo.downloadUrl || `${WORKER_BASE}/api/apk/download`;
      console.log(`[APK更新] 使用R2下载: ${r2Url}`);
  
      downloadProgress.value = 50;
  
      // 使用系统浏览器下载
      const downloadSuccess = window.open(r2Url, '_system');
  
      downloadProgress.value = 100;
      isDownloading.value = false;
  
      if (downloadSuccess) {
        console.log('[APK更新] 已打开浏览器下载');
      } else {
        console.warn('[APK更新] 打开浏览器下载失败');
        downloadError.value = '打开浏览器下载失败';
      }
    } catch (error) {
      console.error('[APK更新] 下载失败:', error.message);
      isDownloading.value = false;
      // 最终回退：使用原始链接
      try {
        const fallbackUrl = updateInfo.value.downloadUrlOriginal
          || updateInfo.value.downloadUrl
          || `${WORKER_BASE}/api/apk/download`;
        window.open(fallbackUrl, '_system');
        console.log('[APK更新] 使用回退链接:', fallbackUrl);
      } catch (e) {
        downloadError.value = error.message || '下载失败';
        console.error('[APK更新] 回退下载也失败:', e);
      }
    }
  };

  /**
   * 跳过当前版本（不再提示）
   */
  const skipUpdate = () => {
    if (updateInfo.value) {
      localStorage.setItem(SKIP_VERSION_KEY, updateInfo.value.latestVersion);
      updateInfo.value = null;
    }
  };

  /**
   * 设置当前APK版本（手动设置，用于首次安装后记录）
   */
  const setLocalVersion = (versionName, versionCode) => {
    localStorage.setItem(APK_VERSION_KEY, versionName);
    localStorage.setItem(APK_VERSION_CODE_KEY, String(versionCode));
  };

  return {
    isChecking,
    updateInfo,
    isDownloading,
    downloadProgress,
    downloadError,
    checkUpdate,
    downloadAndInstall,
    skipUpdate,
    setLocalVersion,
    getLocalVersion,
  };
}
