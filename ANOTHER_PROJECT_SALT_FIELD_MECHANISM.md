# 🔐 另一个项目的盐场创地服务端伪装请求机制详解

## 📊 核心差异对比

### 主项目（当前）vs 另一个项目

| 特性 | 主项目 | 另一个项目 |
|------|--------|------------|
| **执行方式** | ✅ 纯前端定时执行 | ✅ 服务端管理 + 定时触发 |
| **WebSocket 连接** | 浏览器内建立 | 服务端 Node.js 建立 |
| **请求来源** | 客户端直接发送 | 服务器端伪装发送 |
| **IP 地址** | 客户端 IP | 服务器 IP |
| **并发控制** | 浏览器限制 | 服务器可控 |
| **后台运行** | ❌ 关闭网页即停止 | ✅ 7x24 小时运行 |
| **用户隔离** | localStorage | 多用户数据库隔离 |
| **定时触发** | 浏览器 Cron | 服务端 Cron 精确控制 |

---

## 🏗️ 另一个项目的完整架构

### 1. **服务端组件**

#### 📁 `server/lib/legionWar/saltFieldService.js`

**职责**: 盐场创地的服务层管理

```javascript
class SaltFieldService {
  constructor(gameManager, pushService, db) {
    this.gm = gameManager;           // 游戏会话管理
    this.push = pushService;         // 推送服务
    this.db = db;                    // 数据库
    this.runners = new Map();        // tokenId -> Runner
  }
  
  // 启动单个账号创地
  async start(tokenId, userId, tokenName) {
    // 1. 检查是否正在运行
    const exist = this.runners.get(tokenId);
    if (exist && exist.running) return { ok: false, msg: '该账号盐场创地已在运行' };
    
    // 2. 确保已连接（连接池管理）
    let status = this.gm.getConnectionStatus(tokenId);
    if (status !== 'connected') {
      await this.gm.connectWithRetry(tokenId, userId || '', 3);
      await sleep(2000);
    }
    
    // 3. 创建 Runner 实例（使用游戏管理器提供的工具）
    const runner = new SaltFieldRunner({
      gameManager: this.gm,
      tokenId,
      tokenName,
      userId,
      addLog: (entry) => { try { this.push.log('saltfield', entry.type || 'info', entry.message); } catch {} },
      isInWindow: () => inSaltWindow(),
    });
    
    this.runners.set(tokenId, runner);
    runner.start().catch((e) => this._log('error', `${tokenName || tokenId} 异常：${e.message}`));
    return { ok: true, msg: '已启动盐场创地' };
  }
  
  // 定时批量创地入口
  async runScheduled() {
    if (!inSaltWindow()) return;
    this._log('info', '盐场时间窗到达，开始批量创地');
    
    const users = this.db.getAllUsers ? this.db.getAllUsers() : [];
    const userList = users.length ? users : [{ id: '' }];
    
    for (const u of userList) {
      const tokenIds = this.getEnabledTokens(u.id);
      for (const tokenId of tokenIds) {
        const tk = this.db.getToken(tokenId, u.id || '');
        await this.start(tokenId, u.id, tk?.name);
        await sleep(1500); // 控制并发节奏，避免同 IP 大量连接
      }
    }
  }
  
  // 盐场报名（定时任务）
  async runSignup() {
    // 对所有勾选的账号调用 legion_signup
    for (const tokenId of tokenIds) {
      await this.gm.sendMessageWithPromise(tokenId, 'legion_signup', {}, 8000);
    }
  }
}
```

**关键优势**:
- ✅ 使用 `gameManager` 统一管理所有 WebSocket 连接
- ✅ 自动维护连接池和会话状态
- ✅ 支持多用户隔离（按 userId 存储配置）
- ✅ 可调度式（Cron 精确控制执行时间）
- ✅ 跨进程持久化（Runner 对象在服务端存活）

---

#### 📁 `server/lib/legionWar/saltFieldRunner.js`

**职责**: 单账号的刨地逻辑执行器

```javascript
export class SaltFieldRunner {
  constructor({ gameManager, tokenId, tokenName, userId, addLog, isInWindow }) {
    this.gm = gameManager;              // 游戏管理器 - 提供 WS 客户端
    this.tokenId = tokenId;
    this.tokenName = tokenName || tokenId;
    this._userId = userId || '';
    this.isInWindow = isInWindow || (() => true); // 时间窗判断
    
    this.ws = null;                      // 盐场专用 WS 连接
    this.battlefieldId = null;
    this.myCodeId = null;
    this.snapshot = { roles: {}, buildingData: {}, marches: {} };
    this.running = false;
    this.stopFlag = false;
    this.status = 'idle';
    this.lastMsg = '';
  }
  
  async start() {
    // 1. 获取盐场入口（通过 gameManager 的主服连接）
    const bfResp = await this.gm.sendMessageWithPromise(this.tokenId, 'legion_getbattlefield', {}, 8000);
    const info = pick(bfResp, 'info');
    this.battlefieldId = info.battlefieldId;
    
    // 2. 获取 Token 和 g_utils
    const token = this.gm.getActualToken(this.tokenId);
    const utils = this.gm.getGUtils();
    
    // 3. 连接盐场专用 WebSocket
    const url = 'wss://xxz-xyzw-new.hortorgames.com/agent'
      + `?p=${encodeURIComponent(token)}`
      + `&e=x&sid2=${info.sid}&lang=chinese&sid2=${info.sid}`;
    
    this.ws = new LegionWarWebSocketClient({
      url,
      utils: utils,
      hint: this.battlefieldId,
      heartbeatMs: 5000,
    });
    
    // 4. 进场、布阵、创地循环...
  }
}
```

**关键特点**:
- ✅ 通过 `gameManager` 获取真实的 Token 和 g_utils
- ✅ 独立的盐场 WS 连接（不影响主服连接）
- ✅ 维护完整的战场快照（roles/buildingData/marches）
- ✅ 完整的生命周期管理（start/stop/status）

---

#### 📁 `server/lib/legionWarWebSocket.js`

**职责**: 盐场专用的 WebSocket 客户端实现

```javascript
export class LegionWarWebSocketClient {
  constructor({ url, utils, hint, heartbeatMs = 5000 }) {
    this.url = url;
    this.utils = utils;
    this.enc = this.utils?.getEnc ? this.utils.getEnc('auto') : undefined;
    this.hint = hint; // 用于区分不同的战场
    
    // 命令注册表（盐场专用命令）
    this.registry = registerLegionWarCommands(new LegionWarCommandRegistry(this.utils, this.enc, this.hint));
    
    this.socket = null;
    this.ack = 0;
    this.seq = 0;
    this.sendQueue = [];
    this.promises = Object.create(null);
  }
  
  // 发送命令并等待响应
  async sendWithPromise(cmd, params = {}, timeoutMs = 8000) {
    const requestId = ++this.seq;
    this.promises[requestId] = { resolve, reject, originalCmd: cmd };
    
    const packet = {
      cmd: cmd,
      ack: this.ack,
      seq: requestId,
      hint: this.hint,
      time: Date.now(),
      body: { ...params, battlefieldId: this.hint }
    };
    
    // BON 编码发送
    const bin = this.utils.encode(packet, this.enc);
    this.socket.send(bin);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        delete this.promises[requestId];
        reject(new Error(`请求超时：${cmd}`));
      }, timeoutMs);
    });
  }
  
  // 消息监听
  setMessageListener(listener) {
    this.messageListener = listener;
  }
}
```

**关键机制**:
- ✅ 独立的命令注册表（war_enterbattlefield / war_teamsetbattleteam / war_startmarch 等）
- ✅ BON 协议编码/解码
- ✅ 消息队列和 Promise 匹配机制
- ✅ 心跳保持连接

---

### 2. **路由层**

#### 📁 `server/routes/saltField.js`

**职责**: RESTful API 路由处理

```javascript
export function saltFieldRoutes(saltFieldService) {
  const r = Router();
  
  // 启动单个账号创地
  r.post('/start', async (req, res) => {
    const { tokenId, tokenName } = req.body;
    if (!tokenId) return res.status(400).json({ error: 'tokenId required' });
    
    try {
      const result = await saltFieldService.start(tokenId, req.userId, tokenName);
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, msg: e.message });
    }
  });
  
  // 停止
  r.post('/stop', (req, res) => {
    const { tokenId } = req.body;
    res.json(saltFieldService.stop(tokenId));
  });
  
  // 全部状态
  r.get('/status', (_req, res) => {
    res.json(saltFieldService.getAllStatus());
  });
  
  // 获取参与账号列表
  r.get('/enabled', (req, res) => {
    res.json({ tokenIds: saltFieldService.getEnabledTokens(req.userId) });
  });
  
  // 设置参与账号列表
  r.post('/enabled', (req, res) => {
    const { tokenIds } = req.body;
    const list = saltFieldService.setEnabledTokens(req.userId, tokenIds);
    res.json({ ok: true, tokenIds: list });
  });
  
  return r;
}
```

**关键设计**:
- ✅ 路径 `/api/salt-field/*` 独立于其他接口
- ✅ 使用 `authMiddleware` 进行身份验证
- ✅ 多用户数据隔离（基于 `req.userId`）

---

### 3. **主入口集成**

#### 📁 `server/index.js`

**职责**: 服务初始化、定时任务注册、路由挂载

```javascript
// 初始化服务
const saltFieldService = new SaltFieldService(gameManager, pushService, db);

// 挂载路由
app.use('/api/salt-field', authMiddleware, saltFieldRoutes(saltFieldService));

// 定时任务注册
try {
  // 每周六 20:00 触发（北京时间）
  new Cron('0 20 * * 6', { timezone: 'Asia/Shanghai' }, () => {
    saltFieldService.runScheduled().catch((e) => console.error('[盐场定时] 失败:', e.message));
  });
  
  // 每周六 17:30 报名
  new Cron('30 17 * * 6', { timezone: 'Asia/Shanghai' }, () => {
    saltFieldService.runSignup().catch((e) => console.error('[盐场报名] 失败:', e.message));
  });
  
  console.log('[盐场] 定时已注册：报名周六 17:30 / 刨地周六 20:00');
} catch (e) {
  console.error('[盐场] 定时注册失败:', e.message);
}
```

**关键优势**:
- ✅ Cron 表达式精确控制执行时间
- ✅ 时区设置正确（Asia/Shanghai）
- ✅ 错误处理完善
- ✅ 启动时自动注册

---

## 🔍 请求伪装的关键点

### 为什么能绕过检测？

1. **IP 地址是服务器的**
   - 客户端访问 → 服务器 IP
   - 另一个项目：WebSocket 由 Node.js 发起 → 服务器 IP
   - 主项目：WebSocket 由浏览器发起 → 客户端 IP

2. **User-Agent 可以伪装**
   - 服务端可以设置任意 UA（包括 Android/iOS/PC）
   - 浏览器 UA 固定为 Chrome/Firefox 等

3. **请求头完整性**
   - 服务端可设置 Origin、Referer、X-Requested-With 等
   - 浏览器 CORS 限制某些头部无法修改

4. **SSL/TLS 指纹**
   - Node.js 可使用特定库生成与移动端一致的 TLS 指纹
   - 浏览器 TLS 指纹容易被识别

5. **时序特征**
   - 服务端可以模拟人类的点击间隔（随机延迟）
   - 浏览器的自动化行为更容易被识别

---

## 🎯 主项目如何借鉴？

### 方案 A: 添加后端服务（推荐）

**优点**:
- ✅ 完全复刻另一个项目的能力
- ✅ 真正的后台运行（关闭网页仍执行）
- ✅ 完美的请求伪装
- ✅ 支持多用户隔离
- ✅ 精细化的并发控制

**缺点**:
- ⚠️ 需要部署和维护后端服务
- ⚠️ 增加运维成本
- ⚠️ 需要处理认证、授权、权限等问题

---

### 方案 B: 纯前端改进（当前）

**已经在做的**:
- ✅ 角色死亡检测
- ✅ 最大次数限制
- ✅ 目标选择策略
- ✅ 锁敌功能
- ✅ 预设阵容配置

**还能做的改进**:
- ⚡ 优化执行逻辑（减少卡顿）
- ⚡ 增强错误处理
- ⚡ 改善用户体验
- ⚡ 添加更多配置选项

---

## 📝 实施建议

### 短期目标（1-2 周）
1. ✅ **已完成**: 补齐缺失的功能（死亡检测、目标选择、锁敌等）
2. ⬜ 在账号设置页面添加 UI 控件
3. ⬜ 测试各种场景下的稳定性

### 中期目标（1-2 个月）
1. ⬜ 评估是否需要后端服务
2. ⬜ 如果只是个人使用，继续优化前端
3. ⬜ 如果有多个用户需求，考虑后端方案

### 长期规划（3-6 个月）
1. ⬜ 根据用户反馈决定是否开发后端
2. ⬜ 如果需要后端，参考另一个项目的架构
3. ⬜ 逐步迁移核心功能到服务端

---

## 💡 总结

另一个项目的成功关键在于：
1. **服务端管理**: 所有操作通过 Node.js 服务发出
2. **独立连接**: 盐场专用 WebSocket 不影响主服
3. **完整快照**: 维护完整的战场状态
4. **精确定时**: Cron 控制执行时机
5. **用户隔离**: 多租户数据安全隔离

主项目当前的纯前端方案更适合：
- 个人使用场景
- 临时性需求
- 快速开发和部署
- 降低运维成本

两种方案各有优劣，可根据实际需求灵活选择或组合使用！
