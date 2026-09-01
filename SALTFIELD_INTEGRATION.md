# SaltField (盐场创地) 功能完整实现指南

## 📋 **依赖安装**

首先安装必需的后端依赖：

```bash
cd D:\xyzw_web_helper-main
npm.cmd install express cors jsonwebtoken croner sqlite3 uuid ws bon-encoding lz4js xxtea bufferutil utf-8-validate
```

---

## 🗂️ **文件结构**

```
server/
├── index.js                          # Express 主入口（需新建）
└── routes/
│   └── saltField.js                  # ✅ 已创建 - 盐场路由层
└── lib/
    └── legionWar/
        ├── hexUtils.js               # 六边形坐标工具
        ├── legionWarWebSocket.js     # 盐场 WS 客户端
        ├── saltFieldRunner.js        # 单账号执行器
        └── saltFieldService.js       # 多账号管理服务
```

---

## 🔧 **核心代码实现**

### 1. `hexUtils.js` - 六边形坐标系统

```javascript
// server/lib/legionWar/hexUtils.js

/**
 * 偶数列优先的六边形坐标系邻居计算
 */
export const evenQDirs = [
  {q:-1,r:0}, {q:-1,r:-1}, {q:0,r:1}, 
  {q:0,r:-1}, {q:1,r:0}, {q:1,r:-1}
];

export const oddQDirs = [
  {q:-1,r:0}, {q:-1,r:1}, {q:0,r:1}, 
  {q:0,r:-1}, {q:1,r:0}, {q:1,r:1}
];

/**
 * 获取 (x, y) 的 6 个邻居坐标
 * @param {number} x - 列坐标
 * @param {number} y - 行坐标
 */
export function neighbors(x, y) {
  const dirs = (x % 2 === 0) ? evenQDirs : oddQDirs;
  return dirs.map(d => ({ x: x + d.q, y: y + d.r }));
}

/**
 * 在相邻格中随机选择一个存在的格子
 * @param {number} x - 当前列
 * @param {number} y - 当前行  
 * @param {object} buildingData - 服务器返回的建筑表 {"x_y": {...}}
 */
export function pickRandomNeighbor(x, y, buildingData) {
  const cands = neighbors(x, y).filter(n =>
    Object.prototype.hasOwnProperty.call(buildingData, `${n.x}_${n.y}`)
  );
  if (!cands.length) return null;
  return cands[Math.floor(Math.random() * cands.length)];
}

/**
 * 检查时间窗是否在盐场活动时间内
 * @param {Date} now 
 */
export function inSaltWindow(now = new Date()) {
  const isSat = now.getDay() === 6;              // 周六
  const mins = now.getHours() * 60 + now.getMinutes();
  return isSat && mins >= 20 * 60 && mins <= 20 * 60 + 30;  // 20:00-20:30
}
```

---

### 2. `legionWarWebSocket.js` - 盐场专用 WebSocket 客户端

> ⚠️ 此文件需要参考原项目中的 `readable-xyzw-ws.js` 或类似 WS 客户端实现
> 
> 由于篇幅限制，这里提供伪代码框架：

```javascript
// server/lib/legionWarWebSocket.js
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { encodeBON, decodeBON } from 'bon-encoding';

export class LegionWarWebSocketClient extends EventEmitter {
  constructor({ url, hint, utils }) {
    super();
    this.url = url;
    this.hint = hint;
    this.utils = utils;
    this.ws = null;
    this.seq = 0;
    this.promises = new Map();
    
    this.initCommands();
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.on('open', () => {
      console.log('[LegionWS] Connected');
      this.startHeartbeat();
    });
    
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      this.handleMessage(msg);
    });
    
    this.ws.on('close', () => this.emit('close'));
    this.ws.on('error', (e) => this.emit('error', e));
  }
  
  initCommands() {
    // 注册所有盐场命令
    const commands = [
      'war_ping',
      'war_enterbattlefield',
      'war_teamsetbattleteam',
      'war_setbattleteam',
      'war_startmarch',
      'war_speedup',
      'war_startattackbuilding'
    ];
    
    commands.forEach(cmd => {
      this[cmd] = (params = {}) => this.sendCommand(cmd, params);
    });
  }
  
  sendCommand(cmd, params) {
    const seq = ++this.seq;
    const ack = 0;
    const body = encodeBON(params);
    
    const packet = { cmd, ack, seq, hint: this.hint, time: Date.now(), body };
    
    // 如果有响应期望，存 Promise
    if (params._waitResponse) {
      return new Promise((resolve) => {
        this.promises.set(seq, resolve);
      });
    }
    
    this.ws.send(JSON.stringify(packet));
    return Promise.resolve();
  }
  
  handleMessage(msg) {
    // 解析 BON 编码的 body
    if (msg.body) {
      try {
        msg.decodedBody = decodeBON(msg.body);
      } catch(e) {}
    }
    
    // 匹配响应 Promise
    if (msg.ack !== undefined && this.promises.has(msg.seq)) {
      this.promises.get(msg.seq)(msg);
      this.promises.delete(msg.seq);
    }
    
    // 推送战场状态更新
    if (msg.body?.battlefield) {
      this.emit('battlefieldUpdate', msg.body.battlefield);
    }
    
    this.emit('message', msg);
  }
  
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.war_ping({ battlefieldId: this.hint });
    }, 5000);
  }
  
  disconnect() {
    clearInterval(this.heartbeatTimer);
    this.ws.close();
  }
}
```

---

### 3. `saltFieldRunner.js` - 单账号执行器

```javascript
// server/lib/legionWar/saltFieldRunner.js
import { LegionWarWebSocketClient } from '../legionWarWebSocket.js';
import { pickRandomNeighbor, inSaltWindow } from './hexUtils.js';

export class SaltFieldRunner {
  constructor({ tokenId, token, utils, gm, push }) {
    this.tokenId = tokenId;
    this.token = token;
    this.utils = utils;
    this.gm = gm;
    this.push = push;
    this.ws = null;
    this.stopFlag = false;
    this.running = false;
    this.snapshot = { roles: {}, buildingData: {}, marches: {} };
  }
  
  async start() {
    this.running = true;
    this.stopFlag = false;
    
    try {
      await this.step1_getBattlefield();
      await this.step2_connectWs();
      await this.step3_enterAndSetTeam();
      await this.step4_digLoop();
    } catch(e) {
      console.error(`[SaltFieldRunner ${this.tokenId}] Error:`, e);
      this.pushLog(`错误：${e.message}`, 'error');
    } finally {
      this.running = false;
      this.disconnect();
    }
  }
  
  async step1_getBattlefield() {
    this.pushLog('正在获取盐场入口...');
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const resp = await this.gm.sendMessageWithPromise(
          this.tokenId,
          'legion_getbattlefield',
          {},
          8000
        );
        if (resp.ok && resp.info) {
          this.battlefieldId = resp.info.battlefieldId;
          this.sid = resp.info.sid;
          this.pushLog(`✓ 战场 ID: ${this.battlefieldId}, 服务器:${this.sid}`);
          break;
        }
      } catch(e) {
        lastError = e;
        this.pushLog(`⚠ 第${attempt}次尝试失败: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 2500));
    }
    
    if (!this.battlefieldId) throw new Error(`无法获取战场 (${lastError})`);
  }
  
  async step2_connectWs() {
    this.pushLog('连接盐场 WebSocket...');
    const url = `wss://xxz-xyzw-new.hortorgames.com/agent?p=${encodeURIComponent(this.token)}&e=x&sid2=${this.sid}&lang=chinese&sid2=${this.sid}`;
    this.ws = new LegionWarWebSocketClient({ url, hint: this.battlefieldId, utils: this.utils });
    
    this.ws.on('battlefieldUpdate', (bf) => this.mergeBattlefield(bf));
    this.ws.on('message', (msg) => this.onMessage(msg));
    
    await new Promise((resolve) => {
      this.ws.once('open', resolve);
    });
  }
  
  async step3_enterAndSetTeam() {
    this.pushLog('进入战场并设置吕布战队...');
    const enterResult = await this.ws.war_enterbattlefield({ battlefieldId: this.battlefieldId, useGzip: true });
    if (!enterResult.ok || !enterResult.roleCodeId) throw new Error('入场失败');
    
    this.myCodeId = enterResult.roleCodeId;
    this.pushLog(`进场成功，我的 codeId: ${this.myCodeId}`);
    
    // 设置战队预设
    const setTeamParams = {
      battlefieldId: this.battlefieldId,
      battleTeam: [{ teamId: 1, roleId: Number(this.myCodeId), position: 0 }]
    };
    await this.ws.war_teamsetbattleteam(setTeamParams);
    await this.ws.war_setbattleteam(setTeamParams);
    this.pushLog('✓ 吕布单将布阵完成');
    
    // 等待角色空闲
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const myRole = this.myRole();
      if (myRole && myRole.state === 'idle' && myRole.position) break;
    }
  }
  
  async step4_digLoop() {
    while (!this.stopFlag && inSaltWindow()) {
      const myPos = this.myRole().position;
      if (!myPos) {
        this.pushLog('⚠ 未找到当前位置，跳过此轮');
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      
      const target = pickRandomNeighbor(myPos.x, myPos.y, this.snapshot.buildingData);
      if (!target) {
        this.pushLog('⚠ 无可用相邻格，原地等待');
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      
      this.pushLog(`🎯 目标：[${target.x},${target.y}]`);
      
      // 行军
      await this.ws.war_startmarch({
        battlefieldId: this.battlefieldId,
        target: { x: target.x, y: target.y }
      });
      
      // 等待到达
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 500));
        const pos = this.myRole().position;
        if (pos && pos.x === target.x && pos.y === target.y) break;
      }
      
      // 刨地
      await this.ws.war_startattackbuilding({
        battlefieldId: this.battlefieldId,
        buildingId: `${target.x}_${target.y}`
      });
      this.pushLog(`✅ 成功占领 [${target.x},${target.y}]`);
      
      await new Promise(r => setTimeout(r, 1500));
    }
    this.pushLog('⏹ 创地循环结束（超出时间窗或手动停止）');
  }
  
  mergeBattlefield(increment) {
    if (increment.buildingData) Object.assign(this.snapshot.buildingData, increment.buildingData);
    for (const [k, v] of Object.entries(increment.roles || {})) {
      v === null ? delete this.snapshot.roles[k] : this.snapshot.roles[k] = {...this.snapshot.roles[k], ...v};
    }
  }
  
  myRole() {
    return this.snapshot.roles[this.myCodeId] || {};
  }
  
  onMessage(msg) {
    if (msg.body?.battlefield) this.mergeBattlefield(msg.body.battlefield);
  }
  
  pushLog(msg, type = 'info') {
    this.push?.log('saltfield', this.tokenId, msg, type);
  }
  
  disconnect() {
    this.ws?.disconnect();
  }
  
  stop() {
    this.stopFlag = true;
    this.pushLog('收到停止信号...');
  }
}
```

---

### 4. `saltFieldService.js` - 多账号管理服务

```javascript
// server/lib/legionWar/saltFieldService.js
import { Croner } from 'croner';
import { inSaltWindow } from './hexUtils.js';

class SaltFieldService {
  constructor({ gm, push, db }) {
    this.runners = new Map();
    this.gm = gm;
    this.push = push;
    this.db = db;
    this.KV_KEY = 'saltfield-enabled-tokens';
    
    this.scheduleTasks();
  }
  
  scheduleTasks() {
    // 每周六 17:30 自动报名
    new Croner('30 17 * * 6', { timezone: 'Asia/Shanghai' }, async () => {
      console.log('[SaltField] 开始自动报名...');
      await this.runSignup();
    });
    
    // 每周六 20:00 批量创地
    new Croner('0 20 * * 6', { timezone: 'Asia/Shanghai' }, async () => {
      console.log('[SaltField] 开始批量创地...');
      await this.runScheduled();
    });
  }
  
  async start(tokenId, userId, tokenName = '') {
    if (this.runners.has(tokenId)) {
      return { ok: false, msg: '该账号已在运行中' };
    }
    
    if (!inSaltWindow()) {
      return { ok: false, msg: '当前不在盐场活动时间窗内' };
    }
    
    const token = await this.db.getToken(tokenId);
    if (!token) return { ok: false, msg: 'Token 不存在' };
    
    const runner = new SaltFieldRunner({
      tokenId,
      token: token.token,
      gm: this.gm,
      push: this.push,
      utils: this.gm.utils
    });
    
    this.runners.set(tokenId, runner);
    runner.start().catch(console.error);
    
    return { ok: true, msg: `已开始创地：${tokenName || tokenId}` };
  }
  
  stop(tokenId) {
    const runner = this.runners.get(tokenId);
    if (runner) {
      runner.stop();
      return { ok: true };
    }
    return { ok: false, msg: '账号未运行' };
  }
  
  getAllStatus() {
    const statusMap = {};
    this.runners.forEach((runner, tokenId) => {
      statusMap[tokenId] = {
        running: runner.running,
        status: runner.running ? 'running' : 'stopped',
        lastMsg: runner.lastMsg || ''
      };
    });
    return statusMap;
  }
  
  async runSignup() {
    const users = await this.db.getAllUsers();
    for (const user of users) {
      const enabledIds = await this.getEnabledTokens(user.user_id);
      for (const tokenId of enabledIds) {
        await this.gm.sendMessageWithPromise(tokenId, 'legion_signup', {}, 8000);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  async runScheduled() {
    if (!inSaltWindow()) return;
    
    const users = await this.db.getAllUsers();
    for (const user of users) {
      const enabledIds = await this.getEnabledTokens(user.user_id);
      for (const tokenId of enabledIds) {
        const token = await this.db.getToken(tokenId);
        if (token) {
          await this.start(tokenId, user.user_id, token.name);
          await new Promise(r => setTimeout(r, 1500)); // 防同 IP 风控
        }
      }
    }
  }
  
  async getEnabledTokens(userId) {
    const data = await this.db.getKV(this.KV_KEY, userId);
    return Array.isArray(data) ? data : [];
  }
  
  async setEnabledTokens(userId, tokenIds) {
    await this.db.setKV(this.KV_KEY, tokenIds, userId);
    return { ok: true, tokenIds };
  }
}

export default SaltFieldService;
```

---

### 5. `server/index.js` - Express 主入口

> ⚠️ **重要**: 如果您当前的项目是纯前端，需要先确认是否已有 Express 后端
> 
> 如果没有，这是最简化的示例：

```javascript
// server/index.js (简化版示例)
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import saltFieldRoutes from './routes/saltField.js';

const app = express();
app.use(cors());
app.use(express.json());

// JWT 中间件（根据实际情况修改）
app.use((req, res, next) => {
  req.userId = 1; // 临时假设为用户 1
  next();
});

// 注册盐场路由
app.use('/api/salt-field', saltFieldRoutes);

// TODO: 添加 GameManager、DB 等服务初始化
// const saltFieldService = new SaltFieldService({ gm, push, db });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Server] SaltField API 运行在 http://localhost:${PORT}`);
});
```

---

## 🚀 **部署步骤**

### 1. 安装依赖

```bash
npm.cmd install express cors jsonwebtoken croner sqlite3 uuid ws
```

### 2. 启动服务

```bash
# 开发模式
node server/index.js

# 生产模式
pm2 start server/index.js --name "xyzw-saltfield"
```

### 3. 配置 CNode 环境变量

```bash
# .env
JWT_SECRET=your-secret-key-here
PORT=3001
```

---

## 🎨 **前端集成方式**

您已经有两个选择：

### 方案 A: 直接在浏览器访问盐场页面

在 `src/views/App.vue` 或导航菜单中添加盐场路由：

```vue
<Route path="/salt-field" name="SaltField" component={() => import('@/views/SaltField.vue')} />
```

### 方案 B: 集成到现有登录页增强脚本

如果不想新增页面，可以在登录页的增强脚本中通过弹窗形式实现。

---

## ⚠️ **注意事项**

1. **后端依赖**: 此功能需要独立的 Node.js 服务器进程
2. **数据库**: SQLite 用于存储 kv 数据（参与账号列表）
3. **定时任务**: Croner 库负责每周末的自动触发
4. **WebSocket**: 使用独立域名的盐场 WS 连接 (`wss://xxz-xyzw-new...`)
5. **CORS**: 前端需要跨域调用后端 API

---

## 🔄 **下一步工作**

1. 确认项目中是否有 Express 后端服务
2. 如果是纯前端项目，需要新建一个 server 目录和 index.js
3. 根据实际环境调整 DB、GameManager 等服务的实现
4. 测试 WebSocket 连接的稳定性
5. 配置定时任务的时区（Asia/Shanghai）
