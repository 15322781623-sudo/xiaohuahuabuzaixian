/**
 * 设备指纹生成工具
 * 优先级：Tauri 机器码 > Capacitor ANDROID_ID > 浏览器指纹
 */

const STORAGE_KEY = 'xyzw_device_id';

// 会话级激活缓存，避免同一页面生命周期内反复弹窗验证
let sessionActivated = false;
let sessionChecked = false;

/**
 * 检测是否在 Tauri 环境中
 */
function isTauri() {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

/**
 * 检测是否在 Capacitor (APK) 环境中
 */
function isCapacitor() {
  return typeof window !== 'undefined'
    && window.Capacitor !== undefined
    && window.Capacitor.isNativePlatform();
}

/**
 * 通过 Capacitor 原生插件获取 Android ANDROID_ID
 */
async function getCapacitorDeviceId() {
  if (!isCapacitor()) return null;
  try {
    const result = await window.Capacitor.Plugins.DeviceId.getDeviceId();
    return result.deviceId || null;
  } catch (e) {
    console.warn('[设备指纹] Capacitor 设备ID获取失败:', e.message);
    return null;
  }
}

/**
 * 通过 Tauri 获取机器唯一标识（MAC地址 + 硬盘序列号）
 * 即使清除浏览器数据也不会变化
 */
async function getTauriMachineId() {
  if (!isTauri()) return null;
  try {
    const { invoke } = window.__TAURI__.core;
    const machineId = await invoke('get_machine_id');
    return machineId;
  } catch (e) {
    console.warn('[设备指纹] Tauri 机器码获取失败:', e.message);
    return null;
  }
}

/**
 * 简单哈希字符串（djb2 算法）
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 获取 Canvas 指纹（轻量版，只取部分特征）
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no_canvas';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('xyzw_helper', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('xyzw_helper', 4, 17);

    const dataUrl = canvas.toDataURL();
    return hashString(dataUrl);
  } catch {
    return 'no_canvas';
  }
}

/**
 * 收集浏览器特征
 */
function collectFeatures() {
  return [
    navigator.userAgent || '',
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth || 24}`,
    navigator.language || '',
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency || '0',
    getCanvasFingerprint(),
  ].join('|');
}

/**
 * 生成或获取设备 ID
 * Tauri 环境：使用机器码（MAC+硬盘序列号），清除浏览器数据不影响
 * 浏览器环境：使用浏览器特征指纹
 */
export async function getDeviceId() {
  // 优先返回已存储的设备 ID
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  // Tauri 环境：使用机器码（MAC+硬盘序列号）
  if (isTauri()) {
    const machineId = await getTauriMachineId();
    if (machineId) {
      localStorage.setItem(STORAGE_KEY, machineId);
      return machineId;
    }
  }

  // Capacitor (APK) 环境：使用 ANDROID_ID
  if (isCapacitor()) {
    const androidId = await getCapacitorDeviceId();
    if (androidId) {
      localStorage.setItem(STORAGE_KEY, androidId);
      return androidId;
    }
  }

  // 浏览器环境：生成浏览器特征指纹
  const features = collectFeatures();
  const part1 = hashString(features);
  const part2 = hashString(features + Date.now().toString());
  const deviceId = `${part1}-${part2}`.toUpperCase();

  localStorage.setItem(STORAGE_KEY, deviceId);
  return deviceId;
}

/**
 * 检查当前设备是否已激活（需向服务器校验设备指纹）
 */
export async function isActivated() {
  try {
    console.log('[设备激活] 开始检查激活状态...');
    
    // 会话级缓存：本页面生命周期内已验证通过，不再重复请求
    if (sessionActivated) {
      console.log('[设备激活] 使用会话缓存，已激活');
      return true;
    }

    const data = JSON.parse(localStorage.getItem('xyzw_activated') || 'null');
    console.log('[设备激活] 本地激活记录:', data ? '有' : '无');
    
    // 本地没有激活记录，直接返回 false
    if (!data?.activated || !data.cardKey) {
      console.log('[设备激活] 本地无激活记录，需要输入卡密');
      return false;
    }

    console.log('[设备激活] 本地有激活记录，向服务器校验...');
    // 本地有激活记录 → 向服务器校验设备指纹是否匹配
    const deviceId = await getDeviceId();
    const WORKER_BASE = 'https://apk.xiaohuaxyzw.top';

    try {
      const resp = await fetch(`${WORKER_BASE}/api/card/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardKey: data.cardKey, deviceId }),
      });
      const result = await resp.json();
      console.log('[设备激活] 服务器响应:', result);
      
      if (!result.success) {
        // 设备不匹配：清除本地记录并弹窗
        if (result.error?.includes('设备不匹配')) {
          console.warn('[设备激活] 设备不匹配，清除本地激活记录');
          localStorage.removeItem('xyzw_activated');
          sessionActivated = false;
          sessionChecked = false;
          return false;
        }
        // 卡密未激活：清除本地记录并弹窗
        if (result.error?.includes('未激活')) {
          console.warn('[设备激活] 卡密未激活，清除本地激活记录');
          localStorage.removeItem('xyzw_activated');
          sessionActivated = false;
          sessionChecked = false;
          return false;
        }
        // 其他服务端错误：保留本地记录，允许使用
        console.warn('[设备激活] 服务端返回其他错误，保留本地激活记录:', result.error);
        sessionActivated = true;
        sessionChecked = true;
        return true;
      }
      // 服务器验证通过
      console.log('[设备激活] 服务器验证通过');
      sessionActivated = true;
      sessionChecked = true;
      return true;
    } catch (error) {
      // 网络错误时回退到本地检查，避免断网无法使用
      console.warn('[设备激活] 网络错误，使用本地激活记录:', error.message || error);
      sessionActivated = true;
      sessionChecked = true;
      return true;
    }
  } catch (e) {
    console.error('[设备激活] 检查失败:', e);
    return false;
  }
}

/**
 * 保存激活状态
 */
export async function saveActivation(cardKey) {
  const deviceId = await getDeviceId();
  const data = {
    activated: true,
    cardKey: cardKey.toUpperCase().trim(),
    deviceId,
    activatedAt: new Date().toISOString(),
  };
  localStorage.setItem('xyzw_activated', JSON.stringify(data));
  sessionActivated = true;
  sessionChecked = true;
}

/**
 * 清除激活状态（用于调试或重新激活）
 */
export function clearActivation() {
  localStorage.removeItem('xyzw_activated');
  sessionActivated = false;
  sessionChecked = false;
}

/**
 * 重置会话级激活缓存（用于重新校验）
 */
export function resetActivationSessionCache() {
  sessionActivated = false;
  sessionChecked = false;
}
