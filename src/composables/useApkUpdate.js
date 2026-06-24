import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

/**
 * APK 自动更新检查 composable
 * 通过 Cloudflare Worker 检查最新版本并下载安装
 */

// Worker 地址（与 Pages 同域名）
const WORKER_BASE = '';

// 本地存储的当前APK版本
const APK_VERSION_KEY = 'apk_current_version';
const APK_VERSION_CODE_KEY = 'apk_current_version_code';
const SKIP_VERSION_KEY = 'apk_skip_version';

// 默认当前版本（与 android/app/build.gradle 的 versionCode/versionName 同步）
const DEFAULT_VERSION_NAME = '1.0.0';
const DEFAULT_VERSION_CODE = 1;

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

      if (serverCode > localCode) {
        updateInfo.value = {
          ...serverInfo,
          localVersion: localVersion.versionName,
          forceUpdate: serverInfo.forceUpdate || serverCode < (serverInfo.minVersionCode || 0),
        };

        if (!silent) {
          return { hasUpdate: true, info: updateInfo.value };
        }
        return { hasUpdate: true, info: updateInfo.value };
      }

      isChecking.value = false;
      return { hasUpdate: false, reason: '已是最新版本' };
    } catch (error) {
      downloadError.value = error.message || '检查更新失败';
      isChecking.value = false;
      if (!silent) {
        return { hasUpdate: false, reason: '检查更新失败', error: error.message };
      }
      return { hasUpdate: false, reason: '检查更新失败' };
    }
  };

  /**
   * 下载并安装APK
   */
  const downloadAndInstall = async () => {
    if (!updateInfo.value) return;

    isDownloading.value = true;
    downloadProgress.value = 0;
    downloadError.value = '';

    try {
      const apkFileName = `xyzw-helper-${updateInfo.value.latestVersion}.apk`;

      // 使用 CapacitorHttp 下载 APK（支持进度监听）
      const response = await CapacitorHttp.get({
        url: `${WORKER_BASE}${updateInfo.value.downloadUrl}`,
        responseType: 'blob',
        headers: { 'Content-Type': 'application/vnd.android.package-archive' },
      });

      // 通过原生插件安装APK
      // 使用 Capacitor 的 Filesystem 写入文件，然后通过 Intent 安装
      const blob = response.data;
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      // 调用原生安装方法
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const filePath = await Filesystem.writeFile({
        path: apkFileName,
        data: base64Data,
        directory: Directory.External,
        recursive: true,
      });

      // 通过自定义原生插件触发安装
      // 使用 window.Capacitor 调用原生方法
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ApkInstaller) {
        await window.Capacitor.Plugins.ApkInstaller.install({
          filePath: filePath.uri,
        });
      } else {
        // 降级方案：通过 WebView 的 Intent 打开文件
        downloadApkViaIntent(filePath.uri, apkFileName);
      }

      downloadProgress.value = 100;
      isDownloading.value = false;

      // 更新本地版本记录
      localStorage.setItem(APK_VERSION_KEY, updateInfo.value.latestVersion);
      localStorage.setItem(APK_VERSION_CODE_KEY, String(updateInfo.value.versionCode));
      // 清除跳过记录
      localStorage.removeItem(SKIP_VERSION_KEY);
    } catch (error) {
      downloadError.value = error.message || '下载安装失败';
      isDownloading.value = false;
    }
  };

  /**
   * 通过 Intent 下载并安装APK（降级方案）
   */
  const downloadApkViaIntent = (fileUri, fileName) => {
    try {
      // 使用 Android 的下载管理器
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ApkInstaller) {
        window.Capacitor.Plugins.ApkInstaller.install({ filePath: fileUri });
      }
    } catch (e) {
      downloadError.value = '安装失败，请手动安装';
    }
  };

  /**
   * ArrayBuffer 转 Base64
   */
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
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
