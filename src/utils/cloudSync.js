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
const ENC_KEY_STORAGE = "cloudEncKey"; // ✅ 加密密钥存储位置

/** 快照黑名单：易失状态/设备相关/凭据自身 */
const SNAPSHOT_BLACKLIST = new Set([
  "activeConnections",
  "yybServerUrl",
  AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
  AUTH_APPROVED_KEY,
  DEVICE_NAME_KEY,
  ENC_KEY_STORAGE, // ✅ 加密密钥本地专用，不应上传
]);
const SNAPSHOT_BLACKLIST_PREFIX = ["ws_connection_"];

const isBlacklistedKey = (key) =>
  SNAPSHOT_BLACKLIST.has(key) || SNAPSHOT_BLACKLIST_PREFIX.some((p) => key.startsWith(p));

/** 轻量哈希（djb2，用于自动同步变更检测） */
const quickHash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return String(h);
};

/** 安全哈希（SHA-256 取前 8 位，减少碰撞风险） */
const secureHash = async (str) => {
  try {
    const enc = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    const hashArr = new Uint8Array(hash);
    return Array.from(hashArr).slice(0, 8).join('');
  } catch {
    // 降级：如果 crypto 不可用，使用快速哈希
    return quickHash(str);
  }
};

/** 排序 JSON 对象，确保序列化顺序一致 */
const sortJsonStringify = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return JSON.stringify(obj);
  const sortedKeys = Object.keys(obj).sort();
  const orderedObj = {};
  for (const key of sortedKeys) orderedObj[key] = obj[key];
  return JSON.stringify(orderedObj);
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
  localStorage.removeItem(ENC_KEY_STORAGE);
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
  try { await saveEncKey(password, username); } catch { /* 加密密钥派生失败不影响登录 */ }
  return result;
};

export const cloudLogin = async (username, password) => {
  const result = await cloudRequest("/api/cloud/login", {
    method: "POST",
    noAuth: true,
    body: JSON.stringify({ username, password }),
  });
  saveCloudAuth(result.username, result.apiToken, !!result.approved);
  try { await saveEncKey(password, username); } catch { /* 加密密钥派生失败不影响登录 */ }
  return result;
};

export const cloudLogout = () => {
  clearCloudAuth();
};

/** 修改密码（验证旧密码，成功后 apiToken 不变、无需重新登录） */
export const cloudChangePassword = async (oldPassword, newPassword) => {
  const result = await cloudRequest("/api/cloud/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  // 密码变更后重新派生加密密钥；旧密码加密的云端快照需重新上传后才能恢复
  try { await saveEncKey(newPassword, getCloudAuth().username); } catch { /* ignore */ }
  return result;
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

// ==================== 快照加密（AES-GCM-256，密钥由账号密码 PBKDF2 派生） ====================
// 云端仅存密文；密钥仅存本机 localStorage，不上传，保证作者/服务端无法读取用户配置

const ENC_PREFIX = "ENC1:";

/** 密码 → AES-GCM-256 密钥（PBKDF2-SHA256，盐含用户名，跨设备同密码可复现） */
const deriveEncKey = async (password, username) => {
  const salt = new TextEncoder().encode("xyzw-cloud-v1:" + String(username || "").toLowerCase());
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/** 派生并本地保存加密密钥（登录/注册/改密成功后调用） */
const saveEncKey = async (password, username) => {
  try {
    const key = await deriveEncKey(password, username);
    const raw = await crypto.subtle.exportKey("raw", key);
    localStorage.setItem(ENC_KEY_STORAGE, arrayBufferToBase64(raw));
  } catch (e) {
    console.error("[云同步] 加密密钥派生失败:", e);
    throw new Error("当前浏览器不支持加密存储，请升级浏览器或使用其他设备");
  }
};

/** 读取本机加密密钥；未派生过（老用户未重新登录）则返回 null，回退旧版明文路径 */
const getEncKey = async () => {
  const b64 = localStorage.getItem(ENC_KEY_STORAGE);
  if (!b64 || typeof crypto === "undefined" || !crypto.subtle) return null;
  try {
    return await crypto.subtle.importKey("raw", base64ToArrayBuffer(b64), { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  } catch {
    return null;
  }
};

/** AES-GCM 加密字节 → "ENC1:<base64(iv+ciphertext)>" */
const encryptBytes = async (key, bytes) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return ENC_PREFIX + arrayBufferToBase64(out.buffer);
};

/** "ENC1:<base64>" → 解密字节 */
const decryptBytes = async (key, encStr) => {
  const raw = base64ToArrayBuffer(String(encStr).slice(ENC_PREFIX.length));
  const iv = new Uint8Array(raw.slice(0, 12));
  const ct = new Uint8Array(raw.slice(12));
  return await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
};

/** 解密快照文本（解密后若为 gzip 魔数则先解压），供 pullConfig 自动恢复使用 */
const decryptSnapshotText = async (encStr) => {
  const key = await getEncKey();
  if (!key) throw new Error("本地缺少加密密钥，请重新登录云端账号后再恢复");
  let bytes = await decryptBytes(key, encStr);
  const u8 = new Uint8Array(bytes);
  if (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
    bytes = await new Response(stream).arrayBuffer();
  }
  return new TextDecoder().decode(bytes);
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

/** 读取 IndexedDB 中全部 BIN 数据并 base64 化，返回 {id: base64}；20 秒超时/异常时降级为空（不阻断上传） */
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
        if (!r || !r.id || !r.data) {
          console.warn(`[云同步] 跳过无效 BIN 记录:`, r?.id);
          continue;
        }
        // ✅ 类型校验：确保 data 是 ArrayBuffer
        if (!(r.data instanceof ArrayBuffer)) {
          console.error(`[云同步] 跳过年份 BIN 格式 [${r.id}]:`, r.data);
          continue;
        }
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
    // ✅ 步骤 1：先清空 IndexedDB（使用独立事务）
    await new Promise((resolve, reject) => {
      const db = openBinDb();
      const tx = db.then(db => db.transaction(BIN_STORE, "readwrite"));
      tx.then(tx => {
        const store = tx.objectStore(BIN_STORE);
        const clearReq = store.clear();
        clearReq.onsuccess = () => resolve();
        clearReq.onerror = () => reject(clearReq.error);
        clearReq.onabort = () => reject(new Error("clear 事务中止"));
      });
    });

    // ✅ 步骤 2：重新开启事务写入（避免与 clear 混在同一事务）
    const db = await openBinDb();
    const work = new Promise((resolve, reject) => {
      const tx = db.transaction(BIN_STORE, "readwrite");
      const store = tx.objectStore(BIN_STORE);
      const now = new Date();

      for (const id of validIds) {
        try {
          const putReq = store.put({ id, data: decoded[id], createdAt: now, updatedAt: now });
          putReq.onerror = () => {
            console.error(`[云同步] BIN 写入失败 [${id}]:`, putReq.error);
          };
        } catch (e) {
          console.error(`[云同步] BIN 写入异常 [${id}]:`, e);
        }
      }

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
/** 上传云端配置（每个账号最多 10 个快照） */
export const pushConfig = async (deviceName = getDeviceName()) => {
  console.info("[云同步] 开始上传配置...");
  
  // ✅ 检查已上传的配置数量
  const configList = await fetchConfigList();
  if (!Array.isArray(configList)) {
    console.error("[云同步] 获取配置列表失败，跳过数量检查");
  } else {
    const myConfigs = configList.filter(c => c.name === deviceName);  // ✅ 字段名是 name 不是 device
    if (myConfigs.length >= 10) {
      throw new Error(`每个账号最多允许上传 10 个配置快照，当前已有 ${myConfigs.length} 个，请先删除旧配置后再试`);
    }
  }

  console.info("[云同步] 正在收集本地快照...");
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

  console.info(`[云同步] 待上传原始数据：${(rawBytes / 1024 / 1024).toFixed(2)} MB（Token: ${tokenCount}, BIN: ${binCount}）`);

  let options;
  let compressedBytes = rawBytes;
  let compressed = false;
  let encrypted = false;
  const encKey = await getEncKey();
  if (encKey) {
    // ✅ 加密上传：gzip 压缩 → AES-GCM 加密 → base64 封装为 JSON 文本（云端仅存密文）
    console.info("[云同步] 使用加密模式，正在进行安全处理...");
    let plainBytes = new TextEncoder().encode(jsonStr);
    if (typeof CompressionStream !== "undefined") {
      console.info("[云同步] 正在 gzip 压缩...");
      plainBytes = await gzipCompress(jsonStr);
      compressedBytes = plainBytes.length;
      compressed = true;
      console.info(`[云同步] 压缩完成， ${(compressedBytes / rawBytes * 100).toFixed(0)}% （${((rawBytes - compressedBytes) / 1024 / 1024).toFixed(2)} MB → ${(compressedBytes / 1024 / 1024).toFixed(2)} MB）`);
    }
    console.info("[云同步] 正在进行 AES-GCM-256 加密...");
    const encStr = await encryptBytes(encKey, plainBytes);
    encrypted = true;
    options = { method: "PUT", body: JSON.stringify({ data: { __enc: encStr } }) };
  } else if (typeof CompressionStream !== "undefined") {
    // 旧版回退：gzip 压缩后以二进制上传（未重新登录派生密钥时的兼容路径）
    console.info("[云同步] 使用非加密模式，正在进行 gzip 压缩...");
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
  // 直接使用 CapacitorHttp.put() 以 base64 + dataType:'file' 方式可靠发送二进制数据（密文 JSON 无需此路径）
  if (!encrypted && typeof Capacitor !== "undefined" && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    const { apiToken } = getCloudAuth();
    const url = `${CLOUD_API_BASE}/api/cloud/config?device=${encodeURIComponent(deviceName)}`;
    console.info(`[云同步] 正在上传至云端（APK 环境）...`);
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

  console.info("[云同步] 正在上传至云端...");
  const result = await cloudRequest(`/api/cloud/config?device=${encodeURIComponent(deviceName)}`, options);
  lastPushedHash = quickHash(jsonStr);
  return { result, details: { binCount, tokenCount, rawBytes, compressedBytes, compressed, encrypted } };
};

/** 字符串 → gzip 字节（CompressionStream） */
const gzipCompress = async (str) => {
  const bytes = new TextEncoder().encode(str);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** 下载指定设备名的快照；不传设备名时返回最近更新的一份。加密快照（data.__enc）自动解密，旧版明文快照原样返回 */
export const pullConfig = async (deviceName) => {
  const query = deviceName ? `?device=${encodeURIComponent(deviceName)}` : "";
  console.info(`[云同步] 正在从云端下载配置${deviceName ? `（设备：${deviceName}）` : "（最近版本）"}...`);
  
  const result = await cloudRequest(`/api/cloud/config${query}`, { method: "GET" });
  
  if (result && result.data && typeof result.data === "object" && typeof result.data.__enc === "string") {
    console.info("[云同步] 检测到加密快照，正在解密...");
    try {
      result.data = JSON.parse(await decryptSnapshotText(result.data.__enc));
      console.info("[云同步] 解密完成");
    } catch (e) {
      throw new Error("快照解密失败：请使用上传该配置时的账号密码重新登录后重试");
    }
  } else {
    console.info("[云同步] 使用非加密模式或旧版格式");
  }
  
  return result;
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

/** 登录后启动：每 5 小时比对快照哈希，变化则防抖 1 小时自动上传 */
export const startAutoSync = () => {
  if (autoSyncTimer || !isCloudLoggedIn() || !isAutoSyncEnabled() || !isCloudApproved()) return;
  // ✅ 排序后哈希，避免属性顺序影响
  collectSnapshot().then(async (snap) => {
    try {
      lastPushedHash = await secureHash(sortJsonStringify(snap));
    } catch {
      lastPushedHash = quickHash(JSON.stringify(snap));
    }
  }).catch(() => {});
  autoSyncTimer = setInterval(async () => {
    const snap = await collectSnapshot();
    let hash;
    try {
      hash = await secureHash(sortJsonStringify(snap));
    } catch {
      hash = quickHash(JSON.stringify(snap));
    }
    if (hash !== lastPushedHash) {
      lastPushedHash = hash; // 先更新避免重复触发
      if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
      pushDebounceTimer = setTimeout(async () => {
        try {
          const key = await getEncKey();
          if (!key) {
            console.warn("[云同步] 本地缺少加密密钥，本次自动上传已跳过（请重新登录云端账号以启用加密）");
            return;
          }
          const { details } = await pushConfig();
          const sizeStr = details.encrypted
            ? `${(details.rawBytes / 1024).toFixed(1)}KB → ${(details.compressedBytes / 1024).toFixed(1)}KB(AES 加密${details.compressed ? "+gzip" : ""})`
            : details.compressed
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
      }, 60 * 60 * 1000); // 1 小时防抖
    }
  }, 5 * 60 * 60 * 1000); // 5 小时检测一次
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
  // ✅ 重置哈希，避免下次启动时误判
  lastPushedHash = "";
};

/** 应用启动时调用：已登录且开启自动同步则启动 */
export const initCloudSync = () => {
  if (isCloudLoggedIn() && isAutoSyncEnabled()) startAutoSync();
};
