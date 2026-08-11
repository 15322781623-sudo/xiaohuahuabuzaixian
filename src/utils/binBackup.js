/**
 * BIN 数据本地备份工具（增强版）
 *
 * 存储层级（按读取优先级）：
 *   1. IndexedDB (xyzw/tokens)           — 主存储，浏览器可能清理
 *   2. localStorage gzip 压缩备份        — 节省空间，优先使用
 *   3. localStorage 原始 base64 备份     — 旧格式兼容回退
 *   4. 云端配置快照（cloudSync）           — 跨设备恢复
 *
 * 自愈机制：
 *   - 导入/刷新时同步写 IndexedDB + localStorage 压缩备份
 *   - Token 刷新时 IndexedDB 命中自动补齐 localStorage 备份
 *   - 应用启动时运行 verifyAllBinBackups() 查漏补缺
 */

const BIN_BACKUP_PREFIX = "xyzw-bin-backup:";
const BIN_BACKUP_Z_PREFIX = "xyzw-bin-backup-z:"; // gzip 压缩格式

// ==================== 编解码工具 ====================

export const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

export const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// ==================== gzip 压缩/解压 ====================

const supportsCompression = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

/** ArrayBuffer → gzip 压缩后 → ArrayBuffer */
const gzipCompress = async (buffer) => {
  const stream = new Blob([buffer]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(stream).arrayBuffer();
  return compressed;
};

/** gzip ArrayBuffer → 解压后 → ArrayBuffer */
const gzipDecompress = async (buffer) => {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
  const decompressed = await new Response(stream).arrayBuffer();
  return decompressed;
};

/** 获取压缩备份 key */
const getCompressedKey = (tokenId) => `${BIN_BACKUP_Z_PREFIX}${tokenId}`;

// ==================== 键工具 ====================

export const getBinBackupKey = (tokenId) => `${BIN_BACKUP_PREFIX}${tokenId}`;

// ==================== 保存 ====================

/**
 * 保存 BIN 数据到 localStorage 备份
 * 优先使用 gzip 压缩减小体积（通常压缩率 60-80%），
 * 压缩不可用时回退原始 base64。
 * 
 * @returns {boolean} 是否保存成功
 */
export const saveBinBackup = async (tokenId, arrayBuffer) => {
  if (!tokenId || !arrayBuffer) return false;

  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  const key = getBinBackupKey(tokenId);
  const compKey = getCompressedKey(tokenId);

  // 策略 1：gzip 压缩存储（首选，节省 60-80% 空间）
  if (supportsCompression()) {
    try {
      const compressed = await gzipCompress(arrayBuffer);
      const base64 = arrayBufferToBase64(compressed);
      localStorage.setItem(compKey, base64);
      // 成功后清理旧的未压缩备份（迁移完成）
      try { localStorage.removeItem(key); } catch {}
      console.debug(`[binBackup] ✅ 压缩备份成功 [${tokenId}]: ${sizeMB}MB → ${(compressed.byteLength / 1024).toFixed(1)}KB (${base64.length} 字符)`);
      return true;
    } catch (error) {
      console.warn(`[binBackup] 压缩备份失败 [${tokenId}], 回退原始格式:`, error.message);
    }
  }

  // 策略 2：原始 base64 存储（兼容旧环境）
  try {
    const base64 = arrayBufferToBase64(arrayBuffer);
    const estimatedKB = (base64.length / 1024).toFixed(1);
    if (base64.length > 3 * 1024 * 1024) {
      console.warn(`[binBackup] ⚠️ BIN 备份较大 [${tokenId}]: ${estimatedKB}KB, 建议使用支持压缩的浏览器以节省空间`);
    }
    localStorage.setItem(key, base64);
    console.debug(`[binBackup] ✅ 原始备份成功 [${tokenId}]: ${estimatedKB}KB`);
    return true;
  } catch (error) {
    console.error(`[binBackup] ❌ 保存备份失败 [${tokenId}] (${sizeMB}MB):`, error.message);
    return false;
  }
};

// ==================== 读取 ====================

/**
 * 读取 BIN 数据备份（按 key 精确查找）
 * 优先读压缩格式，再回退原始格式。
 */
export const getBinBackup = async (tokenId) => {
  if (!tokenId) return null;
  const key = getBinBackupKey(tokenId);
  const compKey = getCompressedKey(tokenId);

  // 优先读取压缩格式
  if (supportsCompression()) {
    try {
      const compB64 = localStorage.getItem(compKey);
      if (compB64) {
        const compressed = base64ToArrayBuffer(compB64);
        const decompressed = await gzipDecompress(compressed);
        return decompressed;
      }
    } catch (error) {
      console.warn(`[binBackup] 解压备份失败 [${tokenId}], 尝试原始格式:`, error.message);
      // 损坏的压缩数据 → 清理 → 回退
      try { localStorage.removeItem(compKey); } catch {}
    }
  }

  // 回退读取原始格式
  try {
    const base64 = localStorage.getItem(key);
    if (!base64) return null;
    return base64ToArrayBuffer(base64);
  } catch (error) {
    console.error(`[binBackup] 读取原始备份失败 [${tokenId}]:`, error);
    return null;
  }
};

/**
 * 尝试用 tokenId 或 name 读取备份（三级回退：压缩 → 原始 id → 原始 name）
 */
export const getBinBackupWithFallback = async (tokenId, name) => {
  let backup = await getBinBackup(tokenId);
  if (backup) return backup;
  if (name && name !== tokenId) {
    backup = await getBinBackup(name);
    if (backup) {
      console.log(`[binBackup] 使用名称找到备份 [${tokenId}] -> [${name}]`);
      // 迁移到 id 键（压缩格式）
      await saveBinBackup(tokenId, backup);
      deleteBinBackup(name);
      return backup;
    }
  }
  console.warn(`[binBackup] 未找到 BIN 备份 [${tokenId}], 名称 [${name || "-"}], 所有存储层级均已用尽`);
  return null;
};

// ==================== 删除 ====================

export const deleteBinBackup = (tokenId) => {
  if (!tokenId) return;
  try {
    localStorage.removeItem(getBinBackupKey(tokenId));
    localStorage.removeItem(getCompressedKey(tokenId));
  } catch {
    // ignore
  }
};

// ==================== 启动完整性校验 & 自愈 ====================

/**
 * 读取 IndexedDB 中所有 BIN 记录的 ID 列表
 * 需要外部传入 IDB 读取函数以避免循环依赖
 */
const getBinIdsFromIndexedDB = async () => {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("xyzw", 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("tokens")) {
          req.result.createObjectStore("tokens", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction("tokens", "readonly");
      const req = tx.objectStore("tokens").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.filter(r => r && r.id && r.data).map(r => ({ id: r.id, data: r.data }));
  } catch {
    return [];
  }
};

/**
 * 集中收集 localStorage 中的所有备份 key（压缩+原始）
 */
const getAllBackupKeys = () => {
  const keys = { compressed: new Set(), raw: new Set() };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(BIN_BACKUP_Z_PREFIX)) {
      keys.compressed.add(k.slice(BIN_BACKUP_Z_PREFIX.length));
    } else if (k && k.startsWith(BIN_BACKUP_PREFIX)) {
      keys.raw.add(k.slice(BIN_BACKUP_PREFIX.length));
    }
  }
  return keys;
};

/**
 * 启动时运行：确保所有 IndexedDB 中的 BIN 在 localStorage 都有备份
 * - 缺失备份 → 从 IndexedDB 读取并创建备份
 * - 旧格式备份 → 迁移到压缩格式
 * - 孤儿备份（IndexedDB 已删但备份还在）→ 清理
 *
 * @param {Array} gameTokens - 所有游戏 token 列表 [{ id, name }]
 * @returns {{ repaired: number, total: number, totalSizeMB: string }}
 */
export const verifyAllBinBackups = async (gameTokens = []) => {
  const stats = { repaired: 0, skipped: 0, total: 0, totalSizeKB: 0 };
  const backupKeys = getAllBackupKeys();
  const allBackupIds = new Set([...backupKeys.compressed, ...backupKeys.raw]);

  // 1. 从 IndexedDB 读取所有 BIN 记录
  const idbRecords = await getBinIdsFromIndexedDB();
  const idbIds = new Set(idbRecords.map(r => r.id));

  console.info(`[binBackup] 启动校验: IndexedDB ${idbRecords.length} 条, localStorage 备份 ${allBackupIds.size} 条`);

  // 2. 收集需要备份的目标：IndexedDB 中有 + gameTokens 中存在的
  const tokenIdSet = new Set(gameTokens.map(t => t.id));
  const needsBackup = idbRecords.filter(r => tokenIdSet.has(r.id));

  stats.total = needsBackup.length;

  // 3. 查漏补缺：缺失备份的从 IndexedDB 补齐
  for (const { id, data } of needsBackup) {
    const hasBackup = backupKeys.compressed.has(id) || backupKeys.raw.has(id);
    if (hasBackup) {
      stats.skipped++;
      // 旧格式迁移到压缩格式（后台静默）
      if (backupKeys.raw.has(id) && !backupKeys.compressed.has(id) && supportsCompression()) {
        try {
          await saveBinBackup(id, data);
          stats.repaired++;
        } catch {}
      }
    } else {
      // 缺失备份 → 创建
      const ok = await saveBinBackup(id, data);
      if (ok) stats.repaired++;
      if (!ok) console.warn(`[binBackup] ⚠️ 无法创建备份 [${id}], 该 BIN 恢复依赖云端同步或手动重新导入`);
    }
  }

  // 4. 清理孤儿备份：备份的 tokenId 已不在 IndexedDB 且不在 gameTokens 中
  for (const bid of allBackupIds) {
    if (!idbIds.has(bid) && !tokenIdSet.has(bid)) {
      try {
        localStorage.removeItem(getBinBackupKey(bid));
        localStorage.removeItem(getCompressedKey(bid));
        console.debug(`[binBackup] 清理孤儿备份 [${bid}]`);
      } catch {}
    }
  }

  // 5. 统计备份总大小
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(BIN_BACKUP_PREFIX) || k.startsWith(BIN_BACKUP_Z_PREFIX))) {
      totalBytes += (localStorage.getItem(k) || "").length * 2; // UTF-16
    }
  }
  stats.totalSizeKB = (totalBytes / 1024).toFixed(1);

  if (stats.repaired > 0) {
    console.info(`[binBackup] 🔧 自愈完成: 修复 ${stats.repaired}/${stats.total} 个备份 (${stats.totalSizeKB}KB)`);
  }
  return stats;
};

/**
 * 获取备份状态摘要（供 UI 展示）
 */
export const getBinBackupSummary = () => {
  const keys = getAllBackupKeys();
  const allIds = new Set([...keys.compressed, ...keys.raw]);
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(BIN_BACKUP_PREFIX) || k.startsWith(BIN_BACKUP_Z_PREFIX))) {
      totalBytes += (localStorage.getItem(k) || "").length * 2;
    }
  }
  return {
    count: allIds.size,
    compressedCount: keys.compressed.size,
    rawCount: keys.raw.size,
    totalSizeKB: (totalBytes / 1024).toFixed(1),
    totalSizeMB: (totalBytes / 1024 / 1024).toFixed(2),
  };
};
