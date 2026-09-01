# 🎮 游戏引擎与登录请求头分析报告

## 📊 项目来源
`D:\xyzw_web_helper-main\naiwa-release-main\naiwa-release-main\app\src\main\java\com\sharkking\assistant\core\InjectScripts.kt`

---

## 🔍 核心发现

### 1. **游戏引擎**：Cocos2d-x / Cocos Creator
**证据**：
```javascript
// L395: 容器 ID 识别
if (el.id === 'Cocos2dGameContainer' || el.id === 'GameCanvas') return;

// L468-470: Cocos2D 触摸事件监听
// Cocos2D 监听 canvas 上的 touch 事件，需要创建合法 Touch 对象

// L514-516: 游戏帧率 API
cc.game.setFrameRate($fps);
```

---

## 🌐 登录流程分析

### 2. **登录服务器域名**
```
hortorgames.com/login/authuser    # 用户认证
hortorgames.com/login/serverlist  # 服务器列表
```

### 3. **登录请求拦截机制**（L11-37）
奶蛙助手使用 XHR 拦截器来替换登录请求的 POST Body：

```javascript
var _open = XMLHttpRequest.prototype.open;
var _send = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(m, u){
    this._m = m; 
    this._u = u;
    // ✅ 匹配登录接口
    this._isTarget = (m === 'POST' &&
        /hortorgames\.com\/login\/(authuser|serverlist)/.test(u));
};

XMLHttpRequest.prototype.send = function(b){
    if (this._isTarget && window.__activeBinHex) {
        console.log('[奶蛙] 拦截 XHR:', this._u);
        var hex = window.__activeBinHex;
        // ✅ 将 bin 数据转换为二进制发送
        var arr = new Uint8Array(hex.length / 2);
        for (var i = 0; i < arr.length; i++) {
            arr[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return _send.call(this, arr.buffer);
    }
};
```

---

## 🔑 关键结论

### **登录请求特征**：
1. **请求方法**：`POST`
2. **目标 URL**：
   - `https://xxz-xyzw-new.hortorgames.com/login/authuser`
   - `https://xxz-xyzw-new.hortorgames.com/login/serverlist`
3. **请求体格式**：**十六进制编码的二进制数据（bin 文件）**
4. **身份验证**：通过替换 POST body 中的 bin 数据完成认证

---

## ⚠️ 当前项目问题诊断

### **现有登录实现缺失的关键点**：

你的前端项目目前的问题：
1. ❌ **没有处理 bin 数据的十六进制编码转换**
2. ❌ **没有拦截/修改 POST 请求的原始 binary body**
3. ❌ **可能直接发送 JSON 而非二进制数据**

---

## 💡 修复方案

### **方案 A：纯前端 Token 登录（推荐）**
基于现有的 tokenStore.ts 实现，模拟登录流程：

```typescript
// src/utils/gameLogin.js
export async function gameLogin(binData, sid) {
  // binData: Buffer | ArrayBuffer | 十六进制字符串
  
  // 1. 转为十六进制字符串（如果尚未转换）
  let hexStr;
  if (typeof binData === 'string' && binData.match(/^[0-9a-fA-F]+$/)) {
    hexStr = binData; // 已经是 hex
  } else {
    // 转换为 hex 字符串
    const bytes = binData instanceof Uint8Array ? binData : new Uint8Array(binData);
    hexStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // 2. 发送 POST 请求（注意：需要后端支持二进制或 hex 传输）
  const response = await fetch(`https://xxz-xyzw-new.hortorgames.com/login/authuser`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream', // ⚠️ 不是 JSON！
    },
    body: typeof binData === 'string' && binData.match(/^[0-9a-fA-F]+$/) 
      ? hexToUint8Array(hexStr)  // hex → Uint8Array
      : binData,
  });
  
  return response.json();
}

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
```

---

### **方案 B：WebSocket 直连（已实现）**
盐场模块已经实现了正确的 WebSocket 方式：

```javascript
// tasksSaltField.js L67-69
const url = `wss://xxz-xyzw-new.hortorgames.com/agent`
  + `?p=${encodeURIComponent(token)}  // ✅ 直接使用 Base64 token
  + `&e=x&sid2=${sid}&lang=chinese`;
```

✅ **建议**：统一采用这种方式，避免处理复杂的二进制登录请求！

---

## 📋 待办任务

### **立即行动**：
1. ✅ 检查现有 login.js 是否使用正确的 Content-Type
2. ⚠️ 如果是 JSON 格式，改为二进制传输
3. ⚠️ 添加 bin 数据的十六进制转换逻辑

### **长期优化**：
1. 🔄 统一所有游戏模块使用 `tokenStore.getWebSocketClient()` 方式
2. 🔄 删除旧的 HTTP 登录 API，全部转向 WebSocket
3. 🔄 参考 saltFieldWSClient 实现通用 WS Client

---

## 🎯 关键技术参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 游戏引擎 | Cocos2d-x / Cocos Creator | 基于容器 ID 和 cc.game API |
| 登录域名 | xxz-xyzw-new.hortorgames.com | 游戏新服服务器 |
| 登录接口 | /login/authuser | 用户认证 |
| 服务器接口 | /login/serverlist | 获取服务器列表 |
| 请求方法 | POST | 二进制数据上传 |
| 请求体类型 | application/octet-stream | 二进制流，非 JSON |
| 身份凭证 | Bin 文件（十六进制编码） | 用于身份验证 |
| WebSocket | wss://xxz-xyzw-new.hortorgames.com/agent | 游戏内通信 |

---

## 📚 参考资料

- InjectScripts.kt L11-37: XHR 拦截器实现
- tasksSaltField.js L67-69: 正确的 WS URL 构造方式
- 本项目 tokenStore.ts: Token 管理逻辑
