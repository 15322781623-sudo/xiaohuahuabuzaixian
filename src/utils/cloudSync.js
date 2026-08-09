/**
 * 云端配置同步工具
 *
 * - 后端：Cloudflare Worker（CARD_KV）/api/cloud/* 接口
 * - 凭据：cloudAuthUser / cloudAuthToken 存 localStorage
 * - 同步范围：localStorage 全量快照（排除易失/设备相关 key）
 */

export const CLOUD_API_BASE = "https://apk.xiaohuaxyzw.top";

const AUTH_USER_KEY = "cloudAuthUser";
const AUTH_TOKEN_KEY = "cloudAuthToken";
const AUTH_APPROVED_KEY = "cloudAuthApproved";
const AUTO_SYNC_KEY = "cloudAutoSync";
const DEVICE_NAME_KEY = "cloudDeviceName";

/** 快照黑名单：易失状态/设备相关/凭据自身 */
const SNAPSHOT_BLACKLIST = new Set([
  "activeConnections",
  "yybServerUrl",
  AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
  AUTH_APPROVED_KEY,
  DEVICE_NAME_KEY,
]);
const SNAPSHOT_BLACKLIST_PREFIX = ["ws_connection_"];

const isBlacklistedKey = (key) =>
  SNAPSHOT_BLACKLIST.has(key) || SNAPSHOT_BLACKLIST_PREFIX.some((p) => key.startsWith(p));

/** 轻量哈希（djb2），用于自动同步变更检测 */
const quickHash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return String(h);
};

// ==================== 凭据管理 ====================

export const getCloudAuth = () => ({
  username: localStorage.getItem(AUTH_USER_KEY) || "",
  apiToken: localStorage.getItem(AUTH_TOKEN_KEY) || "",
  approved: localStorage.getItem(AUTH_APPROVED_KEY) === "1",
});

export const isCloudLoggedIn = () => !!getCloudAuth().apiToken;

export const isCloudApproved = () => getCloudAuth().approved;

const saveCloudAuth = (username, apiToken, approved) => {
  localStorage.setItem(AUTH_USER_KEY, username);
  localStorage.setItem(AUTH_TOKEN_KEY, apiToken);
  localStorage.setItem(AUTH_APPROVED_KEY, approved ? "1" : "0");
};

export const clearCloudAuth = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_APPROVED_KEY);
  stopAutoSync();
};

// ==================== 设备名（多设备快照命名） ====================

/** 首次使用时按平台生成默认设备名 */
const genDefaultDeviceName = () => {
  const ua = navigator.userAgent || "";
  let base = "设备";
  if (/Android/i.test(ua)) base = "安卓设备";
  else if (/iPhone|iPad|iPod/i.test(ua)) base = "苹果设备";
  else if (/Windows|Macintosh|Linux/i.test(ua)) base = "电脑设备";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
};

export const getDeviceName = () => {
  const saved = localStorage.getItem(DEVICE_NAME_KEY);
  if (saved) return saved;
  const name = genDefaultDeviceName();
  localStorage.setItem(DEVICE_NAME_KEY, name);
  return name;
};

export const setDeviceName = (name) => {
  const n = String(name || "").trim();
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_-]{1,20}$/.test(n)) {
    throw new Error("设备名需为1-20位（中文/字母/数字/_/-）");
  }
  if (n === "默认配置" || n === "default") {
    throw new Error("该设备名为保留名称，请换一个");
  }
  localStorage.setItem(DEVICE_NAME_KEY, n);
  return n;
};

// ==================== API 封装 ====================

const cloudRequest = async (path, options = {}) => {
  const { apiToken } = getCloudAuth();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (apiToken && !options.noAuth) headers.Authorization = `Bearer ${apiToken}`;
  let resp;
  try {
    resp = await fetch(`${CLOUD_API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error("网络连接失败，请检查网络后重试");
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `请求失败（${resp.status}）`);
  }
  return data;
};

export const cloudRegister = async (username, password) => {
  const result = await cloudRequest("/api/cloud/register", {
    method: "POST",
    noAuth: true,
    body: JSON.stringify({ username, password }),
  });
  saveCloudAuth(result.username, result.apiToken, !!result.approved);
  return result;
};

export const cloudLogin = async (username, password) => {
  const result = await cloudRequest("/api/cloud/login", {
    method: "POST",
    noAuth: true,
    body: JSON.stringify({ username, password }),
  });
  saveCloudAuth(result.username, result.apiToken, !!result.approved);
  return result;
};

export const cloudLogout = () => {
  clearCloudAuth();
};

/** 修改密码（验证旧密码，成功后 apiToken 不变、无需重新登录） */
export const cloudChangePassword = async (oldPassword, newPassword) => {
  return await cloudRequest("/api/cloud/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
};

// ==================== 快照收集/应用 ====================

export const collectSnapshot = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || isBlacklistedKey(key)) continue;
    data[key] = localStorage.getItem(key);
  }
  return data;
};

/** 应用云端快照：清空本地（localStorage/sessionStorage/IndexedDB）后写入（保留凭据），然后刷新页面
 *  @param {string} [adoptDeviceName] 恢复后本机设备名切换为该名称（不传则保留当前设备名）
 */
export const applySnapshot = async (data, adoptDeviceName) => {
  const auth = getCloudAuth();
  const autoSync = localStorage.getItem(AUTO_SYNC_KEY);
  const deviceName = adoptDeviceName || localStorage.getItem(DEVICE_NAME_KEY);
  localStorage.clear();
  try {
    sessionStorage.clear();
  } catch { /* ignore */ }
  // 清除 IndexedDB（token/本地资源等旧数据），防止恢复后旧配置残留
  const deleteDb = (name) =>
    new Promise((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(name);
        const timer = setTimeout(resolve, 1000); // 被阻塞时超时放行，不卡住刷新
        req.onsuccess = req.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      } catch {
        resolve();
      }
    });
  try {
    const dbs = (await indexedDB.databases?.()) || [];
    if (dbs.length) {
      await Promise.all(dbs.map((db) => deleteDb(db.name)));
    } else {
      await Promise.all(["xyzw_token_db", "__local_res_db__", "xyzw"].map(deleteDb));
    }
  } catch {
    ["xyzw_token_db", "__local_res_db__", "xyzw"].forEach((n) => deleteDb(n));
  }
  if (auth.username) localStorage.setItem(AUTH_USER_KEY, auth.username);
  if (auth.apiToken) localStorage.setItem(AUTH_TOKEN_KEY, auth.apiToken);
  localStorage.setItem(AUTH_APPROVED_KEY, auth.approved ? "1" : "0");
  if (autoSync !== null) localStorage.setItem(AUTO_SYNC_KEY, autoSync);
  if (deviceName) localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  Object.entries(data || {}).forEach(([key, value]) => {
    if (typeof value === "string") localStorage.setItem(key, value);
  });
  location.reload();
};

// ==================== 上传/下载（多设备快照，按设备名区分） ====================

/** 上传本机快照到指定设备名（默认本机设备名） */
export const pushConfig = async (deviceName = getDeviceName()) => {
  const data = collectSnapshot();
  const result = await cloudRequest(`/api/cloud/config?device=${encodeURIComponent(deviceName)}`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  lastPushedHash = quickHash(JSON.stringify(data));
  return result;
};

/** 下载指定设备名的快照；不传设备名时返回最近更新的一份 */
export const pullConfig = async (deviceName) => {
  const query = deviceName ? `?device=${encodeURIComponent(deviceName)}` : "";
  return await cloudRequest(`/api/cloud/config${query}`, { method: "GET" });
};

/** 获取云端全部设备快照列表 [{name, updatedAt, size, legacy}] */
export const fetchConfigList = async () => {
  const result = await cloudRequest("/api/cloud/config-list", { method: "GET" });
  return result.configs || [];
};

/** 删除指定设备名的云端快照 */
export const deleteCloudConfig = async (deviceName) => {
  return await cloudRequest(`/api/cloud/config?device=${encodeURIComponent(deviceName)}`, {
    method: "DELETE",
  });
};

// ==================== 自动同步 ====================

export const isAutoSyncEnabled = () => localStorage.getItem(AUTO_SYNC_KEY) === "1";

export const setAutoSyncEnabled = (on) => {
  localStorage.setItem(AUTO_SYNC_KEY, on ? "1" : "0");
  if (on) startAutoSync();
  else stopAutoSync();
};

let autoSyncTimer = null;
let pushDebounceTimer = null;
let lastPushedHash = "";

/** 登录后启动：每5小时比对快照哈希，变化则防抖1小时自动上传 */
export const startAutoSync = () => {
  if (autoSyncTimer || !isCloudLoggedIn() || !isAutoSyncEnabled() || !isCloudApproved()) return;
  lastPushedHash = quickHash(JSON.stringify(collectSnapshot()));
  autoSyncTimer = setInterval(() => {
    const hash = quickHash(JSON.stringify(collectSnapshot()));
    if (hash !== lastPushedHash) {
      lastPushedHash = hash; // 先更新避免重复触发
      if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
      pushDebounceTimer = setTimeout(() => {
        pushConfig().catch(() => {
          /* 自动同步失败静默，等待下次 */
        });
      }, 60 * 60 * 1000); // 1小时防抖
    }
  }, 5 * 60 * 60 * 1000); // 5小时检测一次
};

export const stopAutoSync = () => {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
};

/** 应用启动时调用：已登录且开启自动同步则启动 */
export const initCloudSync = () => {
  if (isCloudLoggedIn() && isAutoSyncEnabled()) startAutoSync();
};
