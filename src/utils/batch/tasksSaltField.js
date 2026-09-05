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
    this.sid = sid; // 服务器ID：URL 中 sid2 参数（不是 battlefieldId）
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
        + `&e=x&sid2=${this.sid}&lang=chinese&sid2=${this.sid}`;

      this.socket = new WebSocket(url);
      // ★ 关键：必须按 ArrayBuffer 接收二进制消息，否则默认 binaryType='blob'
      //   服务器回包会变成 Blob，导致解析不到 packet（Cannot read '_raw'）
      this.socket.binaryType = 'arraybuffer';
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
        packet = this._parseBinary(event.data);
      } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        // Blob 兜底（设置 binaryType='arraybuffer' 后一般不会走到，防御旧/异常环境）
        event.data.arrayBuffer().then((buffer) => {
          try {
            this._processPacket(this._parseBinary(buffer));
          } catch (e2) {
            console.error('[SaltField] 消息处理失败:', e2.message);
          }
        }).catch((err) => {
          console.error('[SaltField] Blob 读取失败:', err?.message);
        });
        return;
      } else {
        console.warn('[SaltField] 未知消息类型:', typeof event.data);
        return;
      }
      this._processPacket(packet);
    } catch (e) {
      console.error('[SaltField] 消息处理失败:', e.message);
    }
  }

  /** 二进制消息解密解析（对齐 bonProtocol g_utils.parse） */
  _parseBinary(buffer) {
    return this.utils?.parse
      ? this.utils.parse(buffer, 'auto')
      : new TextDecoder().decode(buffer);
  }

  /** 统一处理解析后的消息包 */
  _processPacket(packet) {
    if (!packet) return; // 防御：解析不出内容时直接忽略

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
        // ★ 盐场协议与主服不同：每条命令 body 需先 BON 编码为字节数组，
        //   再整体 utils.encode(raw) 加密封包（对齐 server/lib/legionWar 与
        //   xyzwLegionWarWebSocket 的实现，否则服务端解析不出命令体，
        //   war_enterbattlefield 等会无响应/超时）。
        //   注意：心跳 war_ping 除外，走 _sendHeartbeat()，body 为普通对象。
        const bodyParams = { ...task.params, battlefieldId: this.battlefieldId };
        const bodyEncoded = this.utils?.bon?.encode
          ? this.utils.bon.encode(bodyParams)
          : bodyParams;
        const raw = {
          cmd: task.cmd,
          ack: this.ack,
          seq: task.seq,
          hint: task.hint,
          time: Date.now(),
          body: bodyEncoded
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

  // ✅ 功能 2: 心跳机制（盐场协议：cmd=war_ping, seq=0, body={ battlefieldId }）
  _sendHeartbeat() {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;
    const raw = {
      cmd: 'war_ping',
      ack: this.ack,
      seq: 0,
      hint: this.battlefieldId,
      time: Date.now(),
      body: { battlefieldId: this.battlefieldId }
    };
    try {
      const bin = this.utils?.encode && this.enc
        ? this.utils.encode(raw, this.enc)
        : JSON.stringify(raw);
      this.socket.send(bin);
    } catch (e) {
      console.error('[SaltField] 心跳发送失败:', e.message);
    }
  }

  _setupHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    // 延迟 3 秒后首发
    this.heartbeatDelayTimer = setTimeout(() => this._sendHeartbeat(), 3000);
    // 每 5 秒一次
    this.heartbeatTimer = setInterval(() => this._sendHeartbeat(), this.heartbeatInterval);
  }

  _clearTimers() {
    if (this.heartbeatDelayTimer) { clearTimeout(this.heartbeatDelayTimer); this.heartbeatDelayTimer = null; }
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
 * 从响应/推送里取字段，兼容多层结构。
 * 盐场响应经 BON 解码后，业务数据可能位于 packet 顶层（rawData/decodedBody），
 * 或继续嵌套在 rawData/decodedBody/body/data 内，统一用本函数提取。
 */
function pickField(obj, name) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[name] !== undefined) return obj[name];
  for (const k of ['rawData', '_rawData', 'decodedBody', 'body', 'data']) {
    const child = obj[k];
    if (child && typeof child === 'object' && child[name] !== undefined) return child[name];
  }
  return undefined;
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
        // 明确不可重试的错误直接抛出，其余按 retries 次数重试
        if (noRetryErrors.some(code => errorMessage.includes(code))) throw err;
        if (i >= retries) throw err;
        await safeDelay(1000); // 简单退避后重试
      }
    }
    throw lastError;
  };

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
      // ★ 不能直接解构方法调用：ESM 严格模式下 this 丢失会抛
      //   "Cannot read properties of undefined (reading 'connected')"
      const sendWithPromise = (...args) => wsClient.sendWithPromise(...args);

      const snapshot = { roles: {}, buildingData: {}, marches: {} };
      let myCodeId = null;

      wsClient.messageListener = (packet) => {
        const bf = pickField(packet, 'battlefield');
        if (bf) mergeBattlefield(snapshot, bf);
      };

      // 阶段 4: 进场（连接建立后稍等，确保服务端就绪，参照 server 端 SaltFieldRunner 等 5s）
      await safeDelay(5000);
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 进入战场...`, type: "info" });
      const enterResult = await sendWithPromise("war_enterbattlefield", { useGzip: true }, 10000);
      // 响应经 BON 解码后 battlefield/roleCodeId 可能位于顶层，或 rawData/decodedBody/body 内
      const enterBf = pickField(enterResult, 'battlefield');
      if (enterBf) mergeBattlefield(snapshot, enterBf);
      myCodeId = String(pickField(enterResult, 'roleCodeId') ?? '');
      if (!myCodeId) {
        throw new Error('进场失败：未获取到 roleCodeId');
      }
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 进场成功, codeId: ${myCodeId}`, type: "success" });

      // 主动拉取一次战场全量：buildingData 全量地图由 war_getbattlefieldinfo 下发，
      // 刨地目标选择依赖它判断"相邻格真实存在"（服务器推送的只是变化部分）
      wsClient.send('war_getbattlefieldinfo', {});

      // ✅ 布阵：默认跟随账号当前出战阵容；若账号配置了"盐场蟠桃阵容"(1-6)则使用指定预设队
      // 盐场布阵协议参数为 battleTeam（槽位→武将 heroId），需先从主服读取预设队武将明细再布阵（对齐服务端实现）
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 布阵准备：读取账号阵容...`, type: "info" });
      let targetFormation = 0; // 0 = 跟随当前出战阵容
      try {
        const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          const v = Number(settings.saltFieldPeachFormation);
          if (v >= 1 && v <= 6) targetFormation = v;
        }
      } catch(e) {}

      // 从主服读取账号预设队数据（presetteam_getinfo 返回服务器实时数据：useTeamId=当前出战阵容编号）
      let battleTeam = null;     // 布阵武将 {槽位: heroId}
      let formationDesc = '';   // 布阵来源描述
      let useTeamId = null;
      let presetTeamMap = null;
      try {
        const ptResp = await callWithRetry(tokenId, "presetteam_getinfo", {}, {
          retries: 1,
          noRetryErrors: [],
          timeout: 8000,
        });
        const pinfo = pickField(ptResp, 'presetTeamInfo') || {};
        useTeamId = Number(pinfo.useTeamId) || 1;
        const inner = pinfo.presetTeamInfo;
        presetTeamMap = (inner && typeof inner === 'object' && !Array.isArray(inner))
          ? inner
          : (typeof pinfo === 'object' && !Array.isArray(pinfo) ? pinfo : null);
      } catch (e) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 读取主服预设阵容失败：${e.message}`, type: "warning" });
      }

      // 目标队：配置了 1-6 用指定队，否则跟随账号当前出战阵容（useTeamId）
      const selectedTeamId = targetFormation >= 1 ? targetFormation : useTeamId;
      const teamData = presetTeamMap ? (presetTeamMap[String(selectedTeamId)] || null) : null;
      if (teamData && teamData.teamInfo && typeof teamData.teamInfo === 'object') {
        const bt = {};
        for (const [slot, hero] of Object.entries(teamData.teamInfo)) {
          if (hero && hero.heroId != null) bt[slot] = hero.heroId;
        }
        if (Object.keys(bt).length > 0) {
          battleTeam = bt;
          formationDesc = targetFormation >= 1
            ? `盐场配置预设阵容${targetFormation}`
            : `当前出战阵容#${useTeamId}（跟随当前）`;
        }
      }

      if (!battleTeam) {
        // 预设读取失败 / 目标队为空 → 回退吕布单将（服务端 SaltFieldRunner 同款），保证能出城刨地
        battleTeam = { '0': 107 };
        const reason = presetTeamMap
          ? (targetFormation >= 1 ? `预设阵容${targetFormation}无有效武将` : `当前阵容#${useTeamId}无有效武将`)
          : '预设阵容读取失败';
        formationDesc = formationDesc || `${reason}，自动回退吕布单将`;
      }

      addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🛡 布阵：${formationDesc}（${Object.values(battleTeam).length}人）`, type: "info" });
      await sendWithPromise("war_teamsetbattleteam", { battleTeam }, 8000);
      await safeDelay(800);
      const setResp = await sendWithPromise("war_setbattleteam", { battleTeam }, 8000);
      const setBf = pickField(setResp, 'battlefield');
      if (setBf) mergeBattlefield(snapshot, setBf);
      addLog({ time: new Date().toLocaleTimeString(), message: `${name} ✅ 布阵完成`, type: "success" });

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
      let noTargetCount = 0; // 连续无可用相邻格计数，超阈值重新拉取全量地图
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
          noTargetCount++;
          if (noTargetCount % 3 === 1) {
            // 全量地图可能未就绪，重新拉取一次
            wsClient.send('war_getbattlefieldinfo', {});
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${name} ⚠ 无可用相邻格，原地等待`, type: "warning" });
          await safeDelay(1500);
          continue;
        }
      
        digCount++;
        addLog({ time: new Date().toLocaleTimeString(), message: `${name} 🎯 目标：[${target.x},${target.y}] (${digCount}/${maxDigs})`, type: "info" });
      
        // ✅ 行军失败重试
        try {
          await sendWithPromise("war_startmarch", { battlefieldId, target }, 8000);
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
            battlefieldId, 
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