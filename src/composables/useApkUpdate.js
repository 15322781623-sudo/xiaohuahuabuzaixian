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

// 下载限制相关 localStorage key
const APK_DOWNLOAD_COUNT_KEY = 'apk_download_count';
const APK_LAST_DOWNLOAD_TIME_KEY = 'apk_last_download_time';
const APK_SESSION_DISMISSED_KEY = 'apk_session_dismissed';

// 下载限制配置
const MAX_DAILY_DOWNLOADS = 3;       // 每日最大下载次数
const DOWNLOAD_COOLDOWN_MS = 30 * 60 * 1000; // 下载冷却期 30分钟

// GitHub 加速镜像列表（中国用户常用）
const GITHUB_MIRRORS = [
  'https://gh.llkk.cc/',
  'https://github.moeyy.xyz/',
  'https://ghfast.top/',
];

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
   * 获取本地 APK 版本信息
   * 优先使用构建时注入的版本号（确保与 APK 实际版本一致）
   */
  const getLocalVersion = () => {
    try {
      // ✅ 优先使用构建时注入的版本号（来自 build.gradle，通过 Vite define 注入）
      // 这样确保版本号与 APK 实际版本一致，不受 localStorage 旧值影响
      const versionName = DEFAULT_VERSION_NAME;
      const versionCode = DEFAULT_VERSION_CODE;
        
      // 同步到 localStorage（供其他地方读取）
      localStorage.setItem(APK_VERSION_KEY, versionName);
      localStorage.setItem(APK_VERSION_CODE_KEY, String(versionCode));
        
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
   * 检查下载频率限制
   * @returns {{ allowed: boolean, reason?: string }}
   */
  const checkDownloadLimit = () => {
    // 1. 检查每日下载次数
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const countData = JSON.parse(localStorage.getItem(APK_DOWNLOAD_COUNT_KEY) || '{}');
      if (countData.date === today && countData.count >= MAX_DAILY_DOWNLOADS) {
        console.log(`[APK更新] 今日下载次数已达上限(${countData.count}/${MAX_DAILY_DOWNLOADS})`);
        return { allowed: false, reason: `今日下载次数已用完(${countData.count}/${MAX_DAILY_DOWNLOADS})，请明天再试` };
      }
    } catch (e) {
      console.warn('[APK更新] 读取下载次数失败:', e);
    }

    // 2. 检查下载冷却期
    try {
      const lastDownloadTime = Number(localStorage.getItem(APK_LAST_DOWNLOAD_TIME_KEY)) || 0;
      const elapsed = Date.now() - lastDownloadTime;
      if (lastDownloadTime > 0 && elapsed < DOWNLOAD_COOLDOWN_MS) {
        const remainMin = Math.ceil((DOWNLOAD_COOLDOWN_MS - elapsed) / 60000);
        console.log(`[APK更新] 下载冷却中，剩余${remainMin}分钟`);
        return { allowed: false, reason: `下载冷却中，请${remainMin}分钟后再试` };
      }
    } catch (e) {
      console.warn('[APK更新] 读取上次下载时间失败:', e);
    }

    return { allowed: true };
  };

  /**
   * 记录一次下载尝试
   */
  const recordDownloadAttempt = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const countData = JSON.parse(localStorage.getItem(APK_DOWNLOAD_COUNT_KEY) || '{}');
      const newCount = countData.date === today ? countData.count + 1 : 1;
      localStorage.setItem(APK_DOWNLOAD_COUNT_KEY, JSON.stringify({ date: today, count: newCount }));
      localStorage.setItem(APK_LAST_DOWNLOAD_TIME_KEY, String(Date.now()));
      console.log(`[APK更新] 已记录下载尝试，今日第${newCount}次`);
    } catch (e) {
      console.warn('[APK更新] 记录下载尝试失败:', e);
    }
  };

  /**
   * 构建候选下载URL列表
   */
  const buildCandidateUrls = (downloadInfo) => {
    const urls = [];

    // 1. R2 Worker代理URL（默认首选）
    const r2Url = downloadInfo.downloadUrl || `${WORKER_BASE}/api/apk/download`;
    urls.push({ url: r2Url, label: 'R2直连' });

    // 2. GitHub原始Release URL
    const githubUrl = downloadInfo.downloadUrlOriginal || updateInfo.value?.downloadUrlOriginal;
    if (githubUrl) {
      urls.push({ url: githubUrl, label: 'GitHub原始' });

      // 3. 各个GitHub镜像加速URL
      for (const mirror of GITHUB_MIRRORS) {
        const mirrorUrl = mirror + githubUrl;
        urls.push({ url: mirrorUrl, label: `镜像(${mirror.replace(/https?:\/\//, '').replace(/\//, '')})` });
      }
    }

    console.log(`[APK更新] 构建${urls.length}个候选URL`);
    return urls;
  };

  /**
   * 并发测速选择最快下载源
   */
  const selectFastestUrl = async (candidates) => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].url;

    console.log(`[APK更新] 开始并发测速 ${candidates.length} 个源...`);

    // 并发测速，超时3秒
    const results = await Promise.all(
      candidates.map(c => testDownloadSpeed(c.url, 3000))
    );

    // 筛选可用源并按响应时间排序
    const available = results
      .filter(r => r.ok)
      .sort((a, b) => a.elapsed - b.elapsed);

    if (available.length > 0) {
      console.log(`[APK更新] 最快源: ${available[0].url.substring(0, 60)} (${available[0].elapsed}ms)`);
      return available[0].url;
    }

    // 全部失败，回退到R2
    console.warn('[APK更新] 所有源测速失败，回退到R2直连');
    return candidates[0].url;
  };

  /**
   * 下载并安装APK（多源测速选择最快，含下载频率限制）
   */
  const downloadAndInstall = async () => {
    if (!updateInfo.value) return;
    // 防止重复下载
    if (isDownloading.value) return;

    // 下载频率限制检查
    const limitCheck = checkDownloadLimit();
    if (!limitCheck.allowed) {
      downloadError.value = limitCheck.reason;
      console.log(`[APK更新] 下载被限制: ${limitCheck.reason}`);
      return;
    }

    isDownloading.value = true;
    downloadProgress.value = 0;
    downloadError.value = '';

    try {
      // 获取下载信息
      const versionResp = await fetch(`${WORKER_BASE}/api/apk/latest`);
      const downloadInfo = await versionResp.json();

      downloadProgress.value = 10;

      // 构建候选URL列表
      const candidateUrls = buildCandidateUrls(downloadInfo);
      downloadProgress.value = 20;

      // 并发测速选择最快源
      const bestUrl = await selectFastestUrl(candidateUrls);
      downloadProgress.value = 50;

      console.log(`[APK更新] 选择最快源: ${bestUrl}`);

      // 使用系统浏览器下载
      const downloadSuccess = window.open(bestUrl, '_system');

      downloadProgress.value = 100;
      isDownloading.value = false;

      // 记录下载次数
      recordDownloadAttempt();

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
        recordDownloadAttempt();
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
   * 记录本次会话已关闭更新对话框（非"跳过版本"）
   */
  const dismissUpdate = () => {
    try {
      sessionStorage.setItem(APK_SESSION_DISMISSED_KEY, '1');
      console.log('[APK更新] 本次会话已标记为已关闭对话框');
    } catch (e) {
      console.warn('[APK更新] 设置session dismissed失败:', e);
    }
  };

  /**
   * 检查是否可以显示更新对话框
   * 如果本次会话已经关闭过对话框（非跳过版本），则不再弹出
   */
  const canShowUpdate = () => {
    try {
      const dismissed = sessionStorage.getItem(APK_SESSION_DISMISSED_KEY);
      if (dismissed === '1') {
        console.log('[APK更新] 本次会话已关闭过对话框，不再弹出');
        return false;
      }
      return true;
    } catch (e) {
      return true;
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
    dismissUpdate,
    canShowUpdate,
    setLocalVersion,
    getLocalVersion,
  };
}
