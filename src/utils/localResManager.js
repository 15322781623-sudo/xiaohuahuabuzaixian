/**
 * 本地资源管理器 — 读取 Electron asar 资源包（如 dds.2.36.8.asar）
 * 浏览器端惰性读取：仅解析头部目录建立 uuid 索引，按需 File.slice 读取单个条目
 * 文件句柄通过 File System Access API 持久化到 IndexedDB（下次免重选）
 */

const DB_NAME = '__local_res_db__';
const STORE = 'handles';
const HANDLE_KEY = 'asarHandle';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbOp(mode, fn) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));
}

const idbGet = key => idbOp('readonly', s => s.get(key));
const idbSet = (key, val) => idbOp('readwrite', s => s.put(val, key));
const idbDel = key => idbOp('readwrite', s => s.delete(key));

/** 弹出文件选择器选择 asar 文件，成功后持久化句柄 */
export async function pickAsarFile() {
  if (window.showOpenFilePicker) {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'asar 资源包', accept: { 'application/octet-stream': ['.asar'] } }]
    });
    try { await idbSet(HANDLE_KEY, handle); } catch (e) { /* 句柄不可持久化时忽略 */ }
    return handle.getFile();
  }
  // 回退: input[type=file]（无法持久化，仅本次会话有效）
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asar';
    input.onchange = () => input.files && input.files[0] ? resolve(input.files[0]) : reject(new Error('未选择文件'));
    input.click();
  });
}

/**
 * 尝试从 IndexedDB 恢复上次选择的 asar 文件
 * @returns {Promise<{file?: File, needPermission?: boolean}|null>}
 */
export async function restoreAsarFile() {
  if (!window.showOpenFilePicker) return null;
  let handle;
  try { handle = await idbGet(HANDLE_KEY); } catch (e) { return null; }
  if (!handle) return null;
  try {
    const perm = await handle.queryPermission({ mode: 'read' });
    if (perm === 'granted') return { file: await handle.getFile() };
    return { needPermission: true };
  } catch (e) {
    return null;
  }
}

/** 有存储句柄时，请求授权并返回文件（需用户手势内调用），失败返回 null */
export async function requestStoredAsarFile() {
  if (!window.showOpenFilePicker) return null;
  let handle;
  try { handle = await idbGet(HANDLE_KEY); } catch (e) { return null; }
  if (!handle) return null;
  try {
    const perm = await handle.requestPermission({ mode: 'read' });
    if (perm === 'granted') return await handle.getFile();
  } catch (e) {}
  return null;
}

/** 清除持久化的文件句柄 */
export function clearAsarHandle() {
  return idbDel(HANDLE_KEY).catch(() => {});
}

/**
 * 解析 asar 头部目录，建立 uuid → {offset, size} 索引
 * asar 格式: 16字节pickle头(u32LE@4=headerPickleSize, u32LE@12=jsonLen) + 头部JSON + 文件数据区
 * 数据区基址 = 8 + headerPickleSize；条目 offset 相对基址
 */
export async function parseAsarIndex(file) {
  const head = new DataView(await file.slice(0, 16).arrayBuffer());
  const headerPickleSize = head.getUint32(4, true);
  const jsonLen = head.getUint32(12, true);
  if (!jsonLen || jsonLen > 64 * 1024 * 1024) throw new Error('无效的 asar 头部');
  const headerText = await file.slice(16, 16 + jsonLen).text();
  const header = JSON.parse(headerText);
  const dataOffset = 8 + headerPickleSize;
  const index = new Map();
  (function walk(node) {
    const files = node.files || {};
    for (const name in files) {
      const child = files[name];
      if (child.files) { walk(child); continue; }
      if (child.offset === undefined) continue;
      // 文件名形如 uuid.hash.dds，索引键取首个点号前的 uuid
      const dot = name.indexOf('.');
      const uuid = dot > 0 ? name.slice(0, dot) : name;
      index.set(uuid, { offset: Number(child.offset), size: child.size });
    }
  })(header);
  return { index, dataOffset, count: index.size };
}
