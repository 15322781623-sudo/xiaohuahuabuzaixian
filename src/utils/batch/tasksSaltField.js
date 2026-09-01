/**
 * 盐场刨地 - 纯前端定时任务（兼容批量日常页面）
 * 使用方式：在定时任务中勾选"盐场刨地"，每周六 20:00 自动执行
 */

import { getModuleDelayCompat } from "@/utils/batch/delayManager";
import { g_utils } from "@/utils/bonProtocol.js";

/**
 * 角色状态判断（参考自动盐场.js）
 */
function isIdle(role) {
  return !!role && (role.state === 'idle' || role.svrState === 'idle');
}

function isMarching(role) {
  return !!role && (role.state === 'march' || role.serverData?.state === 'march');
}

function isFighting(role) {
  return !!role && (role.state === 'combat' || Number(role.battleId) > 0);
}

function isDead(role) {
  return !!role && (role.state === 'die' || role.state === 'resurrect' || role.isDead === true);
}

function canAct(role) {
  return !!role && isIdle(role) && !isDead(role) && !isMarching(role) && !isFighting(role);
}

/**
 * 创建盐场专用 WebSocket 客户端
 * ✅ 功能点 2,3,4,5,6: 心跳、超时、BON 编码、响应匹配、发送队列
 */
class SaltFieldWSClient {
  constructor(token, sid, battlefieldId) {
    this.battlefieldId = battlefieldId;
    this.token = token;
    this.utils = g_utils;
    this.enc = this.utils?.getEnc ? this.utils.getEnc('auto') : null;
    
    // ✅ 功能 6: 发送队列（50ms 批量发送）
    this.sendQueue = [];
    this.sendQueueTimer = null;
    
    // ✅ 功能 2: 心跳机制
    this.heartbeatTimer = null;
    this.heartbeatInterval = 5000; // 每 5 秒
    
    this.socket = null;
    this.ack = 0;
    this.seq = 0;
    this.connected = false;
    
    // ✅ 功能 3,5: Promise + resp 字段匹配
    this.promises = Object.create(null);
    
    // 消息监听回调
    this.messageListener = null;
    this.onDisconnect = null;
    this.onError = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const url = `wss://xxz-xyzw-new.hortorgames.com/agent`
        + `?p=${encodeURIComponent(this.token)}`
        + `&e=x&sid2=${this.battlefieldId}&lang=chinese&sid2=${this.battlefieldId}`;

      this.socket = new WebSocket(url);
      let connected = false;

      this.socket.onopen = () => {
        connected = true;
        this.connected = true;
        this._setupHeartbeat();
        this._processQueueLoop();
        console.log('[SaltField] 连接成功');
        if (this.onConnect) this.onConnect();
        resolve(this);
      };

      this.socket.onerror = (err) => {
        console.error('[SaltField] 连接错误:', err);
        if (!connected) reject(new Error('盐场 WS 连接失败'));
        if (this.onError) this.onError(err);
      };

      this.socket.onclose = (evt) => {
        console.log('[SaltField] 连接关闭:', evt.code, evt.reason);
        this.connected = false;
        this._clearTimers();
        if (this.onDisconnect) this.onDisconnect(evt);
      };

      this.socket.onmessage = (event) => {
        this._handleMessage(event);
      };

      // 10 秒超时保护
      setTimeout(() => {
        if (!connected) {
          this.disconnect();
          reject(new Error('盐场 WS 连接超时'));
        }
      }, 10000);
    });
  }

  _handleMessage(event) {
    try {
      let packet;
      if (typeof event.data === 'string') {
        packet = JSON.parse(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        packet = this.utils?.parse 
          ? this.utils.parse(event.data, 'auto')
          : new TextDecoder().decode(event.data);
      }

      const actualPacket = packet._raw || packet;
      const incomingSeq = typeof actualPacket?.seq === 'number' ? actualPacket.seq : undefined;
      if (typeof incomingSeq === 'number' && incomingSeq >= 0) this.ack = incomingSeq;

      // BON 解码
      if (actualPacket.body && this._shouldDecodeBody(actualPacket.body)) {
        try {
          if (this.utils?.bon?.decode) {
            const bodyBytes = this._convertToUint8Array(actualPacket.body);
            if (bodyBytes) {
              const decodedBody = this.utils.bon.decode(bodyBytes);
              packet.decodedBody = decodedBody;
              if (packet._raw) packet._raw.decodedBody = decodedBody;
            }
          }
        } catch (e) {}
      }

      // 消息监听
      if (this.messageListener) this.messageListener(packet);

      // ✅ 功能 3,5: Promise 响应匹配优先使用 resp 字段
      if (packet.resp !== undefined && this.promises[packet.resp]) {
        const promiseData = this.promises[packet.resp];
        delete this.promises[packet.resp];
        const responseBody = packet.rawData !== undefined ? packet.rawData
          : packet.decodedBody !== undefined ? packet.decodedBody
          : packet.body;
        if (packet.code === 0 || packet.code === undefined) {
          promiseData.resolve(responseBody || packet);
        } else {
          promiseData.reject(new Error(`服务器错误：${packet.code}`));
        }
      } else {
        // 兼容旧的 cmd 名称映射
        this._handleLegacyResponse(packet);
      }
    } catch (e) {
      console.error('[SaltField] 消息处理失败:', e.message);
    }
  }

  _handleLegacyResponse(packet) {
    const cmd = packet?.cmd;
    if (!cmd) return;
    const respCmdKey = typeof cmd === 'string' ? cmd.toLowerCase() : cmd;

    // ✅ 功能 5: 命令响应映射表
    const responseToCommandMap = {
      'war_enterbattlefieldresp': 'war_enterbattlefield',
      'war_teamsetbattleteamresp': 'war_teamsetbattleteam',
      'war_setbattleteamresp': 'war_setbattleteam',
      'war_startmarchresp': 'war_startmarch',
      'war_startattackbuildingresp': 'war_startattackbuilding',
    };

    const originalCmds = responseToCommandMap[respCmdKey];
    if (!originalCmds) return;

    for (const [requestId, promiseData] of Object.entries(this.promises)) {
      if (promiseData.originalCmd === originalCmds) {
        delete this.promises[requestId];
        const responseBody = packet.rawData !== undefined ? packet.rawData
          : packet.decodedBody !== undefined ? packet.decodedBody
          : packet.body;
        if (packet.code === 0 || packet.code === undefined) {
          promiseData.resolve(responseBody || packet);
        } else {
          promiseData.reject(new Error(`服务器错误：${packet.code}`));
        }
        break;
      }
    }
  }

  _shouldDecodeBody(body) {
    if (!body) return false;
    if (body instanceof Uint8Array || Array.isArray(body)) return true;
    if (typeof body === 'object' && body.constructor === Object) {
      const keys = Object.keys(body);
      return keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));
    }
    return false;
  }

  _convertToUint8Array(body) {
    if (!body) return null;
    if (body instanceof Uint8Array) return body;
    if (Array.isArray(body)) return new Uint8Array(body);
    if (typeof body === 'object' && body.constructor === Object) {
      const keys = Object.keys(body).map(k => parseInt(k)).sort((a, b) => a - b);
      if (keys.length > 0) {
        const maxIndex = Math.max(...keys);
        const arr = new Array(maxIndex + 1).fill(0);
        for (const [key, value] of Object.entries(body)) {
          const index = parseInt(key);
          if (!isNaN(index) && typeof value === 'number') arr[index] = value;
        }
        return new Uint8Array(arr);
      }
    }
    return null;
  }

  async sendWithPromise(cmd, params = {}, timeoutMs = 8000) {
    // ✅ 功能 3: 超时保护
    return new Promise((resolve, reject) => {
      if (!this.connected && !this.socket) {
        return reject(new Error('盐场 WS 连接已关闭'));
      }
      
      const requestSeq = ++this.seq;
      this.promises[requestSeq] = { resolve, reject, originalCmd: cmd };

      const timer = setTimeout(() => {
        delete this.promises[requestSeq];
        reject(new Error(`请求超时：${cmd} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.send(cmd, params, { seq: requestSeq, onSent: () => {
        // 发送成功后不清除定时器，等待响应或超时
      }});
    });
  }

  send(cmd, params = {}, options = {}) {
    const assignedSeq = options.seq !== undefined ? options.seq : (++this.seq);
    const task = {
      cmd,
      params,
      seq: assignedSeq,
      hint: this.battlefieldId,
      sleep: options.sleep || 0,
      onSent: options.onSent
    };
    this.sendQueue.push(task);
  }

  // ✅ 功能 6: 50ms 定时批量发送
  _processQueueLoop() {
    if (this.sendQueueTimer) clearInterval(this.sendQueueTimer);
    this.sendQueueTimer = setInterval(() => {
      if (!this.sendQueue.length || !this.connected || !this.socket) return;
      
      const task = this.sendQueue.shift();
      if (!task) return;

      try {
        const raw = {
          cmd: task.cmd,
          ack: this.ack,
          seq: task.seq,
          hint: task.hint,
          time: Date.now(),
          body: { ...task.params, battlefieldId: this.battlefieldId }
        };

        // ✅ 功能 4: BON 编码发送
        let bin;
        if (this.utils?.encode && this.enc) {
          bin = this.utils.encode(raw, this.enc);
        } else {
          bin = JSON.stringify(raw);
        }

        this.socket.send(bin);
      } catch (error) {
        console.error(`[SaltField] 发送失败：${task.cmd}`, error.message);
      }
    }, 50);
  }

  // ✅ 功能 2: 心跳机制
  _setupHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    // 延迟 3 秒后首发
    setTimeout(() => {
      if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
        this.send('heart_beat', {}, { respKey: 'war_ping' });
      }
    }, 3000);

    // 每 5 秒一次
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.socket?.readyState === WebSocket.OPEN) {
        this.send('heart_beat', {}, { respKey: 'war_ping' });
      }
    }, this.heartbeatInterval);
  }

  _clearTimers() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.sendQueueTimer) { clearInterval(this.sendQueueTimer); this.sendQueueTimer = null; }
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
    this.connected = false;
    this._clearTimers();
  }
}

/**
 * 战场快照合并
 */
function mergeBattlefield(snapshot, bf) {
  if (!bf || typeof bf !== 'object') return;
  if (bf.buildingData && typeof bf.buildingData === 'object') {
    Object.assign(snapshot.buildingData, bf.buildingData);
  }
  if (bf.roles && typeof bf.roles === 'object') {
    for (const [k, v] of Object.entries(bf.roles)) {
      if (v === null) { delete snapshot.roles[k]; }
      else { snapshot.roles[k] = { ...(snapshot.roles[k] || {}), ...v }; }
    }
  }
  if (bf.marches && typeof bf.marches === 'object') {
    for (const [k, v] of Object.entries(bf.marches)) {
      if (v === null) { delete snapshot.marches[k]; }
      else { snapshot.marches[k] = v; }
    }
  }
}

/**
 * 六边形坐标邻居计算
 */
function hexNeighbors(x, y) {
  const evenDirs = [{q:-1,r:0},{q:-1,r:-1},{q:0,r:1},{q:0,r:-1},{q:1,r:0},{q:1,r:-1}];
  const oddDirs  = [{q:-1,r:0},{q:-1,r:1},{q:0,r:1},{q:0,r:-1},{q:1,r:0},{q:1,r:1}];
  const dirs = (x % 2 === 0) ? evenDirs : oddDirs;
  return dirs.map(d => ({ x: x + d.q, y: y + d.r }));
}

/**
 * 检查是否在盐场活动时间窗内
 */
export function inSaltFieldWindow() {
  const now = new Date();
  const day = now.getDay(); // 6 = 周六
  const mins = now.getHours() * 60 + now.getMinutes();
  return day === 6 && mins >= 20 * 60 && mins < 21 * 60; // 20:00-21:00
}

/**
 * 创建盐场刨地任务
 * @param {object} deps - 依赖注入
 */
export function createTasksSaltField(deps) {
  const {
    tokenStore,
    addLog,
    tokenStatus,
    selectedTokens,
    isRunning,
    shouldStop,
    batchSettings,
    safeDelay,
    getModuleDelay,
    ensureConnection,
  } = deps;

  // 使用集中式延迟管理器
  const _getModuleDelay = (moduleName) => {
    if (getModuleDelay) return getModuleDelay(moduleName);
    return getModuleDelayCompat(moduleName, batchSettings);
  };

  /**
   * ✅ 功能点 1: 带连接检查的命令调用
   */
  const callWithRetry = async (tokenId, command, params, options = {}) => {
    const {
      timeout = batchSettings.defaultCommandTimeout || 5000,
      retries = batchSettings.defaultRetryCount !== undefined ? batchSettings.defaultRetryCount : 2,
      noRetryErrors = ["400000", "200020", "3100080", "3100030"],
    } = options;

    // ✅ 先确保账号已连接（复用统一连接管理，自动处理连接池/重连/并发限制）
    const client = tokenStore.getWebSocketClient(tokenId);
    if (!client || !client.connected) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenStore.gameTokens.find(t => t.id === tokenId)?.name || tokenId} 未连接，正在建立...`, type: "warning" });
      if (typeof ensureConnection === 'function') {
        // 盐场时间窗短(20:00-21:00)，重试1次即可，避免30s+退避耗尽时间窗
        await ensureConnection(tokenId, 1);
      } else {
        await tokenStore.createWebSocketConnection(tokenId);
      }
      await safeDelay(2000);
    }

    let lastError;
    for (let i = 0; i <= retries; i++) {
      if (shouldStop.value) throw new Error("用户取消操作");
      try {
        const result = await tokenStore.sendMessageWithPromise(tokenId, command, params, timeout);
        return result;
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || "";
        if (noRetryErrors.some(code => errorMessage.includes(code))) {
          throw err;
        }
        throw err;
      }
    }
    throw lastError;
  };

  /**
   * 六边形地图 - 随机选择相邻存在的格子
   */
  function pickRandomNeighbor(x, y, buildingData) {
    const cands = hexNeighbors(x, y).filter(n => {
      const key = `${n.x}_${n.y}`;
      return Object.prototype.hasOwnProperty.call(buildingData, key);
    });
    if (!cands.length) return null;
    return cands[Math.floor(Math.random() * cands.length)];
  }

  /**
   * 建立盐场专用 WebSocket 连接
   */
  function createSaltFieldWS(token, sid, battlefieldId) {
    return new Promise((resolve, reject) => {
      const url = `wss://xxz-xyzw-new.hortorgames.com/agent`
        + `?p=${encodeURIComponent(token)}`
        + `&e=x&sid2=${sid}&lang=chinese&sid2=${sid}`;

      const ws = new WebSocket(url);
      let connected = false;
      let seq = 0;
      const pending = new Map();
      const onMessageCallbacks = [];

      ws.onopen = () => {
        connected = true;
        resolve({ ws, sendCommand, onMessage, close });
      };

      ws.onerror = () => {
        if (!connected) reject(new Error('盐场WS连接失败'));
      };

      ws.onclose = () => {
        connected = false;
      };

      ws.onmessage = (event) => {
        try {
          let data = event.data;
          if (data instanceof ArrayBuffer) {
            data = new TextDecoder().decode(data);
          }
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { /* passthrough */ }
          }
          const msg = data;

          if (msg.ack !== undefined && pending.has(msg.seq)) {
            pending.get(msg.seq)(msg);
            pending.delete(msg.seq);
          }

          if (msg.body && msg.body.battlefield) {
            onMessageCallbacks.forEach(cb => cb(msg.body.battlefield));
          }
        } catch(e) { /* ignore parse errors */ }
      };

      function onMessage(cb) { onMessageCallbacks.push(cb); }

      function sendCommand(cmd, params = {}) {
        const currentSeq = ++seq;
        const body = { ...params, battlefieldId };

        const packet = JSON.stringify({
          cmd, ack: 0, seq: currentSeq,
          hint: battlefieldId,
          time: Date.now(),
          body
        });

        return new Promise((resolve) => {
          pending.set(currentSeq, resolve);
          ws.send(packet);
        });
      }

      function close() {
        ws.close();
      }
    });
  }

  /**
   * 盐场刨地 - 单账号执行
   */
  const saltFieldDigForToken = async (tokenId, token, opts = {}) => {
    // 支持页面手动开始：独立停止控制(stopRef) + 跳过活动窗口限制(skipWindowCheck)
    const stopFlag = opts.stopRef || shouldStop;
    const skipWindowCheck = opts.skipWindowCheck === true;
    const name = token.name || tokenId.slice(0, 8);
    addLog({ time: new Date().toLocaleTimeString(), message: `=== ⛏️ 盐场刨地：${name} ===`, type: "info" });

    let wsClient = null;
    try {
      // 阶段1: 获取盐场入口
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 获取盐场入口...`, type: "info" });
      let sid, battlefieldId;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const resp = await callWithRetry(tokenId, "legion_getbattlefield", {}, {
            retries: 0,
            noRetryErrors: [],
          });
          if (resp && resp.info) {
            sid = resp.info.sid;
            battlefieldId = resp.info.battlefieldId;
            addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 战场ID: ${battlefieldId}, 服务器: ${sid}`, type: "success" });
            break;
          }
        } catch(e) {
          if (attempt >= 4) throw new Error(`获取战场失败(第${attempt}次): ${e.message}`);
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 第${attempt}次尝试失败: ${e.message}`, type: "warning" });
          await safeDelay(2500);
        }
      }

      if (!sid || !battlefieldId) throw new Error('无法获取盐场入口');

      // 阶段 3: 连接盐场 WS
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 连接盐场服务器...`, type: "info" });
      wsClient = new SaltFieldWSClient(token.token, sid, battlefieldId);
      await wsClient.init();
      const { sendWithPromise, battlefieldId: bfId } = wsClient;

      const snapshot = { roles: {}, buildingData: {}, marches: {} };
      let myCodeId = null;

      wsClient.messageListener = (packet) => {
        if (packet.body?.battlefield) {
          mergeBattlefield(snapshot, packet.body.battlefield);
        }
      };

      // 阶段 4: 进场
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 进入战场...`, type: "info" });
      const enterResult = await sendWithPromise("war_enterbattlefield", { useGzip: true }, 10000);
      if (enterResult.body?.battlefield) {
        mergeBattlefield(snapshot, enterResult.body.battlefield);
      }
      if (enterResult.body && enterResult.body.roleCodeId) {
        myCodeId = String(enterResult.body.roleCodeId);
        addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 进场成功, codeId: ${myCodeId}`, type: "success" });
      } else {
        throw new Error('进场失败：未获取到 roleCodeId');
      }

      // ✅ 布阵：使用预设阵容（支持多队）
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 布阵：使用预设阵容...`, type: "info" });
      let targetFormation = 1;
      try {
        const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          if (settings.saltFieldPeachFormation != null && settings.saltFieldPeachFormation >= 1 && settings.saltFieldPeachFormation <= 6) {
            targetFormation = settings.saltFieldPeachFormation;
          }
        }
      } catch(e) {}
      
      await sendWithPromise("war_teamsetbattleteam", { teamId: targetFormation }, 8000);
      await safeDelay(800);
      await sendWithPromise("war_setbattleteam", { teamId: targetFormation }, 8000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 预设阵容${targetFormation}布阵完成`, type: "success" });

      // 等待角色就绪（含状态检测）
      for (let i = 0; i < 20; i++) {
        await safeDelay(500);
        const myRole = snapshot.roles[myCodeId];
        if (myRole && canAct(myRole)) break;
        if (stopFlag.value) break;
      }
      
      // ✅ 阶段 5: 刨地循环（锁敌机制 + 目标优先级 + 死亡检测）
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🔄 开始刨地循环...`, type: "info" });
      let digCount = 0;
      const maxDigs = 100; // 最多 100 次
      
      // 读取用户配置的目标优先级和锁敌 ID
      let targetPriority = 'saltPanFirst'; // saltPanFirst / nearest / enemyFirst
      let lockedRoleId = null; // 锁定的敌人 roleCodeId
      try {
        const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          if (['saltPanFirst', 'nearest', 'enemyFirst'].includes(settings.saltFieldTargetPriority)) {
            targetPriority = settings.saltFieldTargetPriority;
          }
          if (settings.saltFieldLockedRoleId) {
            lockedRoleId = settings.saltFieldLockedRoleId;
          }
        }
      } catch(e) {}
      
      while (!stopFlag.value && (skipWindowCheck || inSaltFieldWindow()) && digCount < maxDigs) {
        const myRole = snapshot.roles[myCodeId];
              
        // ✅ 检查角色是否死亡（自动等待复活）
        if (myRole && isDead(myRole)) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 检测到角色死亡，等待复活...`, type: "warning" });
          for (let i = 0; i < 60; i++) { // 最多等 30 秒
            await safeDelay(500);
            const updatedRole = snapshot.roles[myCodeId];
            if (updatedRole && canAct(updatedRole)) break;
            if (stopFlag.value) break;
          }
          if (!canAct(snapshot.roles[myCodeId])) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${name} ❌ 角色无法复活，终止任务`, type: "error" });
            return false;
          }
        }
              
        if (!myRole || !myRole.position) {
          await safeDelay(1500);
          continue;
        }
      
        // ✅ 目标选择（锁敌优先 → 按优先级选择）
        let target = null;
              
        // 1. 如果锁定敌人，尝试攻击锁定的目标
        if (lockedRoleId) {
          const lockedRole = snapshot.roles[lockedRoleId];
          if (lockedRole && lockedRole.position) {
            const lx = lockedRole.position.x;
            const ly = lockedRole.position.y;
            const neighbors = hexNeighbors(myRole.position.x, myRole.position.y);
            const isNeighbor = neighbors.some(n => n.x === lx && n.y === ly);
            if (isNeighbor) {
              target = { x: lx, y: ly }; // 锁定目标在相邻格
              addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🔒 锁敌：[${lx},${ly}]`, type: "info" });
            }
          }
        }
              
        // 2. 未锁定或不在相邻，按优先级选择
        if (!target) {
          const neighbors = hexNeighbors(myRole.position.x, myRole.position.y);
          const validCands = neighbors.filter(n => Object.prototype.hasOwnProperty.call(snapshot.buildingData, `${n.x}_${n.y}`));
                
          if (validCands.length > 0) {
            if (targetPriority === 'saltPanFirst') {
              // 优先盐田（假设类型在 buildingData 中有标记）
              const saltPans = validCands.filter(n => snapshot.buildingData[`${n.x}_${n.y}`]?.type === 'SaltPan');
              target = saltPans.length > 0 ? saltPans[0] : validCands[0];
            } else if (targetPriority === 'nearest') {
              // 最近邻居（当前已是最邻）
              target = validCands[0];
            } else if (targetPriority === 'enemyFirst') {
              // 优先敌方建筑
              const enemies = validCands.filter(n => {
                const b = snapshot.buildingData[`${n.x}_${n.y}`];
                return !b.isOur && !b.isHome;
              });
              target = enemies.length > 0 ? enemies[0] : validCands[0];
            }
          }
        }
              
        if (!target) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 无可用相邻格，原地等待`, type: "warning" });
          await safeDelay(1500);
          continue;
        }
      
        digCount++;
        addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🎯 目标：[${target.x},${target.y}] (${digCount}/${maxDigs})`, type: "info" });
      
        // ✅ 行军失败重试
        try {
          await sendWithPromise("war_startmarch", { battlefieldId: bfId, target }, 8000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🏃 行军 -> [${target.x},${target.y}]`, type: "info" });
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ❌ 行军失败：${e.message}`, type: "warning" });
          await safeDelay(1500);
          continue;
        }
      
        // ✅ 到达判定含 idle 状态
        let arrived = false;
        for (let i = 0; i < 40 && !stopFlag.value; i++) {
          const m = snapshot.roles[myCodeId];
          if (m && m.state === 'idle' && m.position && 
              m.position.x === target.x && m.position.y === target.y) {
            arrived = true;
            break;
          }
          await safeDelay(500);
        }
      
        if (!arrived) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 行军超时，重试`, type: "warning" });
          continue;
        }
      
        if (stopFlag.value) break;
      
        // ✅ 刨地失败仅警告继续循环
        try {
          await sendWithPromise("war_startattackbuilding", { 
            battlefieldId: bfId, 
            buildingId: `${target.x}_${target.y}` 
          }, 8000);
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 占领 [${target.x},${target.y}]`, type: "success" });
        } catch (e) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 刨地失败：${e.message}`, type: "warning" });
        }
      
        await safeDelay(1500);
        if (stopFlag.value) break;
      }

      wsClient.disconnect();
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⏹ 刨地结束 (${digCount}次)`, type: "info" });
      return true;

    } catch (e) {
      if (wsClient) wsClient.disconnect();
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} ❌ 刨地失败: ${e.message}`, type: "error" });
      return false;
    }
  };

  /**
   * 批量盐场刨地（并行执行，所有账号同时在线刨地）
   */
  const batchSaltFieldDig = async () => {
    if (selectedTokens.value.length === 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: "⚠️ 盐场刨地：未选择任何账号，请先在账号列表中勾选要执行的账号", type: "warning" });
      return;
    }

    if (!inSaltFieldWindow()) {
      addLog({ time: new Date().toLocaleTimeString(), message: "⚠️ 当前不在盐场活动时间窗内（每周六 20:00-21:00）", type: "warning" });
      return;
    }

    try {
      isRunning.value = true;
      shouldStop.value = false;

      selectedTokens.value.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      // 并行启动所有账号，每个错开 1.5 秒避免同时冲击服务器
      const tasks = selectedTokens.value.map(async (id, index) => {
        // 错开启动
        if (index > 0) await safeDelay(1500 * index);
        if (shouldStop.value) return;

        const token = tokenStore.gameTokens.find(t => t.id === id);
        if (!token) {
          tokenStatus.value[id] = "failed";
          return;
        }

        tokenStatus.value[id] = "running";
        const success = await saltFieldDigForToken(id, token);
        tokenStatus.value[id] = success ? "completed" : "failed";
      });

      await Promise.all(tasks);
    } finally {
      isRunning.value = false;
    }
  };

  return { batchSaltFieldDig, saltFieldDigForToken, inSaltFieldWindow };
}