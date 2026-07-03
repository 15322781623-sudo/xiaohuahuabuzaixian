/**
 * BIN 数据本地备份工具
 *
 * 由于 IndexedDB 在某些场景下会被浏览器清理或跨设备缺失，
 * 导入 bin/wxQrcode 时把原始 ArrayBuffer 同时以 base64 形式备份到 localStorage，
 * 作为全量导出和 Token 刷新时的兜底来源。
 */

const BIN_BACKUP_PREFIX = "xyzw-bin-backup:";

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

export const getBinBackupKey = (tokenId) => `${BIN_BACKUP_PREFIX}${tokenId}`;

/**
 * 保存 BIN 数据备份
 */
export const saveBinBackup = (tokenId, arrayBuffer) => {
  if (!tokenId || !arrayBuffer) return false;
  try {
    const base64 = arrayBufferToBase64(arrayBuffer);
    localStorage.setItem(getBinBackupKey(tokenId), base64);
    return true;
  } catch (error) {
    console.error(`[binBackup] 保存备份失败 [${tokenId}]:`, error);
    return false;
  }
};

/**
 * 读取 BIN 数据备份
 */
export const getBinBackup = (tokenId) => {
  if (!tokenId) return null;
  try {
    const base64 = localStorage.getItem(getBinBackupKey(tokenId));
    if (!base64) return null;
    return base64ToArrayBuffer(base64);
  } catch (error) {
    console.error(`[binBackup] 读取备份失败 [${tokenId}]:`, error);
    return null;
  }
};

/**
 * 删除 BIN 数据备份
 */
export const deleteBinBackup = (tokenId) => {
  if (!tokenId) return;
  try {
    localStorage.removeItem(getBinBackupKey(tokenId));
  } catch (error) {
    console.error(`[binBackup] 删除备份失败 [${tokenId}]:`, error);
  }
};

/**
 * 尝试用 tokenId 或 name 读取备份
 */
export const getBinBackupWithFallback = async (tokenId, name) => {
  let backup = getBinBackup(tokenId);
  if (backup) return backup;
  if (name && name !== tokenId) {
    backup = getBinBackup(name);
    if (backup) {
      console.log(`[binBackup] 使用名称找到备份 [${tokenId}] -> [${name}]`);
      // 迁移到 id 键
      saveBinBackup(tokenId, backup);
      deleteBinBackup(name);
    }
  }
  return backup;
};
