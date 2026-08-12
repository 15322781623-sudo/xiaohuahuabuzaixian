/**
 * 云端配置同步工具
 *
 * - 后端：Cloudflare Worker（CARD_KV）/api/cloud/* 接口
 * - 凭据：cloudAuthUser / cloudAuthToken 存 localStorage
 * - 同步范围：localStorage 全量快照（排除易失/设备相关 key）
 */

import { saveBinBackup } from "@/utils/binBackup";
import { useTokenStore } from "@/stores/tokenStore";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

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
  // 90秒超时保护，避免上传大快照时无限转圈
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 90000) : null;
  let resp;
  try {
    resp = await fetch(`${CLOUD_API_BASE}${path}`, { ...options, headers, signal: controller ? controller.signal : undefined });
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new Error("请求超时（90秒），请检查网络或减少账号数量后重试");
    }
    throw new Error("网络连接失败，请检查网络后重试");
  } finally {
    if (timer) clearTimeout(timer);
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

// ==================== BIN 二进制数据（IndexedDB）快照 ====================

const BIN_DB_NAME = "xyzw";
const BIN_DB_VERSION = 1;
const BIN_STORE = "tokens";
const BIN_SNAPSHOT_KEY = "__cloudBinData__";

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const openBinDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(BIN_DB_NAME, BIN_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BIN_STORE)) {
        const store = db.createObjectStore(BIN_STORE, { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** 读取 IndexedDB 中全部 BIN 数据并 base64 化，返回 {id: base64}；20秒超时/异常时降级为空（不阻断上传） */
const collectBinData = async () => {
  const fallback = () => ({});
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 20000));
  const work = (async () => {
    try {
      const db = await openBinDb();
      const records = await new Promise((resolve, reject) => {
        const reqAll = db.transaction(BIN_STORE, "readonly").objectStore(BIN_STORE).getAll();
        reqAll.onsuccess = () => resolve(reqAll.result || []);
        reqAll.onerror = () => reject(reqAll.error);
      });
      db.close();
      const map = {};
      let totalBytes = 0;
      for (const r of records) {
        if (!r || !r.id || !r.data) continue;
        // 单份快照 BIN 总量上限 20MB（gzip 压缩后传输），超出部分跳过并告警
        if (totalBytes + r.data.byteLength > 20 * 1024 * 1024) {
          console.warn(`[云同步] BIN 总量超限，跳过 ${r.id}（及后续），请分批管理账号`);
          break;
        }
        totalBytes += r.data.byteLength;
        map[r.id] = arrayBufferToBase64(r.data);
      }
      console.info(`[云同步] BIN 采集完成：${Object.keys(map).length} 条，共 ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
      // 对比 token 数量，发现差异时告警
      try {
        const tokens = JSON.parse(localStorage.getItem("gameTokens") || "[]");
        if (tokens.length > 0 && Object.keys(map).length !== tokens.length) {
          const diff = tokens.length - Object.keys(map).length;
          console.warn(
            `[云同步] ⚠️ BIN 与 Token 数量不一致：BIN ${Object.keys(map).length} 条 vs Token ${tokens.length} 条（缺少 ${diff} 个 BIN）`
          );
        }
      } catch { /* ignore */ }
      return map;
    } catch (e) {
      console.error("[云同步] 读取本地 BIN 数据失败，本次快照不含 BIN:", e);
      return fallback();
    }
  })();
  const result = await Promise.race([work, timeout]);
  if (result === null) {
    console.warn("[云同步] 读取本地 BIN 数据超时，本次快照不含 BIN");
    return fallback();
  }
  return result;
};

/** 将快照中的 BIN 数据写回 IndexedDB（先清空旧 BIN 再写入，全量覆盖）；15秒超时保护
 *  @returns {{ succeeded: string[], failed: {id:string,reason:string}[] }} */
const restoreBinData = async (map) => {
  const ids = Object.keys(map || {});

  // 无 BIN 数据时仍需清空 IndexedDB，保证全量覆盖语义
  if (!ids.length) {
    try {
      const db = await openBinDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(BIN_STORE, "readwrite");
        const req = tx.objectStore(BIN_STORE).clear();
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("事务中止"));
      });
      db.close();
      console.info("[云同步] BIN 数据为空，已清空 IndexedDB");
    } catch (e) {
      console.error("[云同步] 清空 BIN 失败:", e);
    }
    return { succeeded: [], failed: [] };
  }

  // 预校验：提前解码 base64，避免事务内静默失败导致部分记录丢失
  const decoded = {};
  const failed = [];
  for (const id of ids) {
    try {
      decoded[id] = base64ToArrayBuffer(map[id]);
    } catch (e) {
      failed.push({ id, reason: `base64解码失败: ${e.message}` });
      console.error(`[云同步] BIN 解码失败 [${id}]:`, e.message);
    }
  }

  const validIds = Object.keys(decoded);
  if (!validIds.length) {
    console.error(`[云同步] 所有 ${ids.length} 条 BIN 解码均失败，IndexedDB 保持不变`);
    return { succeeded: [], failed };
  }

  try {
    const db = await openBinDb();
    const work = new Promise((resolve, reject) => {
      const tx = db.transaction(BIN_STORE, "readwrite");
      const store = tx.objectStore(BIN_STORE);

      // 先等 clear 完成，再放入 put 操作，避免顺序错乱
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        const now = new Date();
        for (const id of validIds) {
          store.put({ id, data: decoded[id], createdAt: now, updatedAt: now });
        }
      };
      clearReq.onerror = () => reject(clearReq.error);

      tx.oncomplete = () => resolve(validIds.length);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("事务中止"));
    });

    const timeout = new Promise((resolve) => setTimeout(() => resolve(-1), 15000));
    const n = await Promise.race([work, timeout]);
    db.close();

    if (n === -1) {
      console.error("[云同步] BIN 写回超时，恢复后账号可能无法连接，请重新恢复一次");
      failed.push(...validIds.map((id) => ({ id, reason: "超时" })));
      return { succeeded: [], failed };
    }

    if (failed.length) {
      console.warn(`[云同步] BIN 写回：${validIds.length} 条成功，${failed.length} 条预校验失败`);
    } else {
      console.info(`[云同步] BIN 写回完成：${validIds.length} 条`);
    }

    return { succeeded: validIds, failed };
  } catch (e) {
    console.error("[云同步] BIN 写回事务失败:", e);
    failed.push(...validIds.map((id) => ({ id, reason: `事务失败: ${e.message}` })));
    return { succeeded: [], failed };
  }
};

// ==================== 快照收集/应用 ====================

export const collectSnapshot = async () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || isBlacklistedKey(key)) continue;
    data[key] = localStorage.getItem(key);
  }
  // BIN 二进制数据存于 IndexedDB，需一并纳入快照（否则恢复后 BIN 账号无法连接/刷新）
  const bins = await collectBinData();
  if (Object.keys(bins).length) data[BIN_SNAPSHOT_KEY] = JSON.stringify(bins);
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
  // 注意：BIN 库(xyzw)不在此删除——应用持有其长连接，deleteDatabase 会被阻塞，
  // 导致后续 BIN 写回死锁、页面无法刷新；BIN 库改为在 restoreBinData 中 clear+写回
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
    const names = dbs.length
      ? dbs.map((db) => db.name)
      : ["xyzw_token_db", "__local_res_db__", BIN_DB_NAME];
    await Promise.all(names.filter((n) => n && n !== BIN_DB_NAME).map(deleteDb));
  } catch {
    ["xyzw_token_db", "__local_res_db__"].forEach((n) => deleteDb(n));
  }
  if (auth.username) localStorage.setItem(AUTH_USER_KEY, auth.username);
  if (auth.apiToken) localStorage.setItem(AUTH_TOKEN_KEY, auth.apiToken);
  localStorage.setItem(AUTH_APPROVED_KEY, auth.approved ? "1" : "0");
  if (autoSync !== null) localStorage.setItem(AUTO_SYNC_KEY, autoSync);
  if (deviceName) localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  // BIN 数据写回 IndexedDB（不写入 localStorage）；无 BIN 时也需清空旧 BIN，保证全量覆盖语义
  let binMap = null;
  Object.entries(data || {}).forEach(([key, value]) => {
    if (typeof value !== "string") return;
    if (key === BIN_SNAPSHOT_KEY) {
      try {
        binMap = JSON.parse(value);
      } catch {
        binMap = null;
      }
      return;
    }
    localStorage.setItem(key, value);
  });
  const { succeeded, failed } = await restoreBinData(binMap || {});
  // 恢复后自动补齐 localStorage BIN 备份（兜底保护：即使 IndexedDB 异常，备份仍在）
  if (succeeded.length) {
    const backupPromises = succeeded.map((id) =>
      saveBinBackup(id, base64ToArrayBuffer(binMap[id])).catch(() => {})
    );
    await Promise.allSettled(backupPromises);
    console.info(`[云同步] BIN 备份已补齐：${succeeded.length} 条`);
  }
  if (failed.length) {
    console.error(`[云同步] BIN 恢复失败 ${failed.length} 条:`, failed.map((f) => f.id).join(", "));
  }
  // 将恢复结果写入 sessionStorage（跨 location.reload 保留），
  // 页面重启后在 App.vue 中读取并打印，避免 reload 清空 console 导致日志丢失
  try {
    sessionStorage.setItem(
      "__cloudRestoreResult__",
      JSON.stringify({
        timestamp: new Date().toISOString(),
        totalBin: Object.keys(binMap || {}).length,
        succeeded: succeeded.length,
        failed: failed.length,
        failedDetails: failed.slice(0, 20),
      })
    );
  } catch { /* ignore */ }
  location.reload();
};

// ==================== 上传/下载（多设备快照，按设备名区分） ====================

/** 上传本机快照到指定设备名（默认本机设备名）；支持 CompressionStream 时 gzip 压缩二进制上传
 *  @returns {{ result: object, details: { binCount: number, tokenCount: number, rawBytes: number, compressedBytes: number, compressed: boolean } }} */
export const pushConfig = async (deviceName = getDeviceName()) => {
  const data = await collectSnapshot();
  const jsonStr = JSON.stringify({ data });
  const rawBytes = new TextEncoder().encode(jsonStr).length;
  // 提取快照详情
  let binCount = 0;
  try {
    const binRaw = data[BIN_SNAPSHOT_KEY];
    if (binRaw) binCount = Object.keys(JSON.parse(binRaw)).length;
  } catch { /* ignore */ }
  let tokenCount = 0;
  try {
    tokenCount = (JSON.parse(data["gameTokens"] || "[]")).length;
  } catch { /* ignore */ }

  let options;
  let compressedBytes = rawBytes;
  let compressed = false;
  if (typeof CompressionStream !== "undefined") {
    // gzip 压缩后以二进制上传，大幅缩小含 BIN 快照的传输体积
    const compressedBuf = await gzipCompress(jsonStr);
    compressedBytes = compressedBuf.length;
    compressed = true;
    options = {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream", "X-Cfg-Encoding": "gzip" },
      body: compressedBuf,
    };
  } else {
    options = { method: "PUT", body: jsonStr };
  }

  // APK（Capacitor）环境：CapacitorHttp 拦截 fetch 时对 Uint8Array body 处理异常，
  // 直接使用 CapacitorHttp.put() 以 base64 + dataType:'file' 方式可靠发送二进制数据
  if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    const { apiToken } = getCloudAuth();
    const url = `${CLOUD_API_BASE}/api/cloud/config?device=${encodeURIComponent(deviceName)}`;
    let capResult;
    if (compressed) {
      const base64Compressed = arrayBufferToBase64(options.body.buffer);
      capResult = await CapacitorHttp.put({
        url,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Cfg-Encoding": "gzip",
          Authorization: `Bearer ${apiToken}`,
        },
        data: base64Compressed,
        dataType: "file",
        connectTimeout: 90000,
        readTimeout: 90000,
      });
    } else {
      capResult = await CapacitorHttp.put({
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        data: options.body,
        connectTimeout: 90000,
        readTimeout: 90000,
      });
    }
    const respData = typeof capResult.data === "string" ? JSON.parse(capResult.data) : capResult.data;
    if (capResult.status < 200 || capResult.status >= 300) {
      throw new Error((respData && respData.error) || `请求失败（${capResult.status}）`);
    }
    lastPushedHash = quickHash(jsonStr);
    return { result: respData, details: { binCount, tokenCount, rawBytes, compressedBytes, compressed } };
  }

  const result = await cloudRequest(`/api/cloud/config?device=${encodeURIComponent(deviceName)}`, options);
  lastPushedHash = quickHash(jsonStr);
  return { result, details: { binCount, tokenCount, rawBytes, compressedBytes, compressed } };
};

/** 字符串 → gzip 字节（CompressionStream） */
const gzipCompress = async (str) => {
  const bytes = new TextEncoder().encode(str);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
  collectSnapshot().then((snap) => {
    lastPushedHash = quickHash(JSON.stringify(snap));
  }).catch(() => {});
  autoSyncTimer = setInterval(async () => {
    const snap = await collectSnapshot();
    const hash = quickHash(JSON.stringify(snap));
    if (hash !== lastPushedHash) {
      lastPushedHash = hash; // 先更新避免重复触发
      if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
      pushDebounceTimer = setTimeout(async () => {
        try {
          const { details } = await pushConfig();
          const sizeStr = details.compressed
            ? `${(details.rawBytes / 1024).toFixed(1)}KB → ${(details.compressedBytes / 1024).toFixed(1)}KB(gzip)`
            : `${(details.rawBytes / 1024).toFixed(1)}KB`;
          try {
            useTokenStore().pushGlobalLog(
              `☁️ 自动同步：${details.tokenCount} Token，${details.binCount} BIN，${sizeStr}`,
              "info"
            );
          } catch { /* ignore */ }
        } catch {
          /* 自动同步失败静默，等待下次 */
        }
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
