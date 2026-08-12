# 微信扫码登录角色获取流程

## 概述

微信扫码登录采用 **OAuth 扫码 → Hortor 登录 → 服务器角色列表 → 选服生成 Token** 的链路，支持 Web / Tauri / APK 三端。

---

## 1. 二维码获取

**请求**: `GET https://open.weixin.qq.com/connect/app/qrconnect`

| 参数 | 值 |
|---|---|
| `appid` | `wxfb0d5667e5cb1c44` |
| `bundleid` | `com.hortor.games.xyzw` |
| `scope` | `snsapi_base,snsapi_userinfo,snsapi_friend,snsapi_message` |
| `state` | `weixin` |

**伪装头**: `WECHAT_HEADERS`（Mi-4c Android 7.0 + MicroMessenger UA）

**解析**: 返回 HTML → 提取 `<img class="auth_qrcode">` 的 `src` → 解析出 `uuid`（路径最后一段）

```javascript
// wxqrcode.vue - tryGetWeixinQR()
const doc = new DOMParser().parseFromString(html, "text/html");
let qrUrl = doc.querySelector("img.auth_qrcode")?.src;
const uuidPart = qrUrl.split("/").pop();
qrcodeUUID = uuidPart.split("?")[0];  // 轮询时使用
```

---

## 2. 扫码状态轮询

**请求**: `GET https://long.open.weixin.qq.com/connect/l/qrconnect?uuid=<UUID>&f=url&_=<ts>`

**伪装头**: `WECHAT_LONG_HEADERS`

**轮询间隔**: 1 秒，超时 300 秒后自动刷新（最多 1 次）

**响应码含义**:

| `window.wx_errcode` | 含义 | 处理 |
|---|---|---|
| `405` | 用户已扫码确认 | 提取 `code`，进入登录流程 |
| `408` | 长轮询正常等待 | 忽略，继续轮询 |
| 其他/超时 | 二维码过期 | 自动刷新二维码 |

**提取 code**:
```javascript
// 正则匹配重定向 URL 中的 code 参数
const codeMatch = text.match(/wx_redirecturl='[^']*code=([a-zA-Z0-9]+)/);
const code = codeMatch[1];
```

---

## 3. Hortor 登录（code → combUser → BIN）

### 3.1 构造登录报文

```json
{
  "gameId": "xyzwapp",
  "code": "<微信OAuth code>",
  "gameTp": "app",
  "sysInfo": "{\"system\":\"Android\",\"hortorSDKVersion\":\"4.0.6-cn\",\"model\":\"22081212C\",\"brand\":\"Redmi\"}",
  "channel": "android",
  "appFrom": "com.tencent.mm",
  "noLogin": "2",
  "distinctId": "DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6",
  "state": "hortor",
  "packageName": "com.hortor.games.xyzw",
  "tp": "app-we",
  "signPrint": "E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13"
}
```

### 3.2 加密编码

```
JSON 文本 → encodePayload() → POST body
```

`encodePayload` 分三层：
1. **Base64** 编码原始 JSON
2. **CipherTable 混淆**（13200 字符密钥表，6 轮洗牌 + step=3 采样得到密钥）
3. **XOR 加密**（密钥字符与文本字符逐位异或，shift=1）
4. 结果再做一次 **Base64** → 最终 payload

### 3.3 发送登录请求

**请求**: `POST https://comb-platform.hortorgames.com/comb-login-server/api/v1/login`

| 参数 | 值 |
|---|---|
| `gameId` | `xyzwapp` |
| `timestamp` | `Date.now()` |
| `version` | `android-4.2.1-cn-release` |
| `cryptVersion` | `1.1.0` |
| `gameTp` | `app` |
| `system` | `android` |
| `deviceUniqueId` | `DID-0e782e88-...` |
| `packageName` | `com.hortorgames.xyzw` |

**伪装头**: `HORTOR_HEADERS`（Android 12 23117RK66C, Origin/Referer 均为 `open.weixin.qq.com`）

### 3.4 响应解析

```json
{
  "meta": { "errCode": 0 },
  "data": { "combUser": { ... } }
}
```

`combUser` → 游戏加密模块 `__require("13").encMsg()` → **BIN 二进制数据**

---

## 4. 角色列表获取

### 4.1 请求服务器角色列表

**请求**: `POST https://xxz-xyzw.hortorgames.com/login/serverlist`（BON 协议, seq=3）

**请求体**: BIN 二进制（BON 编码）

**响应**: BON 解码后得到
```json
{
  "roles": {
    "<serverId>": {
      "name": "角色名",
      "roleId": 123456,
      "serverId": 1010027,
      "power": 5000000,
      "level": 6000,
      ...
    }
  }
}
```

### 4.2 角色排序

按 `power`（战力）降序排列，高战力角色在前。

```javascript
// wxqrcode.vue - saveAccount()
const parsedList = JSON.parse(listStr);
serverListData.value = Object.values(parsedList)
  .sort((a, b) => b.power - a.power);
```

---

## 5. 角色选择 & Token 生成

用户从角色列表中选择一个角色后触发 `addSelectedRole(roleInfo)`。

### 5.1 设置 serverId → 重新编码 BIN

```javascript
const newData = { ...originalBinData };
newData.serverId = roleInfo.serverId;
const newBinBuffer = g_utils.encode(newData);  // BON 编码
```

### 5.2 生成 Token ID

```javascript
getTokenId(binBuffer)  // → MD5 hash of binary → 32 位 hex 字符串
```

### 5.3 transformToken（获取 roleToken）

**请求**: `POST https://xxz-xyzw.hortorgames.com/login/authuser`（BON 协议, seq=1）

**请求体**: 设定了 `serverId` 的 BIN 二进制

**响应**: BON 解码 → `{ roleToken, openId, uid, ... }`

最终 Token 结构：
```json
{
  "roleToken": "...",
  "openId": "...",
  "uid": "...",
  "sessId": "<timestamp * 100 + random>",
  "connId": "<timestamp + random>",
  "isRestore": 0
}
```

### 5.4 服务器编号计算

```
sid = roleInfo.serverId
if sid >= 2000000:  roleIndex = 2;  sid -= 2000000
else if sid >= 1000000:  roleIndex = 1;  sid -= 1000000
serverNum = sid - 27
```

### 5.5 命名模板

默认模板 `{name}-{index}-{id}`，支持变量：

| 变量 | 含义 | 示例值 |
|---|---|---|
| `{name}` | 角色名 | 张三 |
| `{index}` | 角色序号（0/1/2） | 0 |
| `{id}` | 角色 ID | 123456 |
| `{server}` | 服务器 | 6859服 |

---

## 6. Token 持久化

### 6.1 三层存储

| 层级 | 存储位置 | 内容 |
|---|---|---|
| Token Store | `localStorage` (`gameTokens`) | Token 元数据（id/name/server/roleToken/wsUrl） |
| IndexedDB | `tokenBin` 数据库 | BIN 二进制（ArrayBuffer） |
| BIN Backup | `localStorage` (`bin_backup_<id>`) | 兜底备份（Base64 编码） |

### 6.2 导入逻辑

```javascript
// wxqrcode.vue - handleImport()
roleList.forEach(role => {
  const existing = tokenStore.gameTokens.find(t => t.id === role.id);
  if (existing) {
    tokenStore.updateToken(role.id, role);   // 更新已有
  } else {
    tokenStore.addToken(role);                // 新增
  }
});
```

---

## 7. 三端适配

| 环境 | 请求方式 | 代理路径 | 伪装头来源 |
|---|---|---|---|
| Web 浏览器 | XHR → `/api/*` 代理 | `_worker.js` 覆盖 | Worker 层 |
| Tauri (EXE) | `@tauri-apps/plugin-http` 直连 | 无 | 客户端 `spoofedHeaders.ts` |
| Capacitor (APK) | `CapacitorHttp` 原生 HTTP / XHR 走代理 | `/api/*` 代理 | 混合（serverlist/authuser 用 CapacitorHttp 直连） |

---

## 8. 关键文件

| 文件 | 职责 |
|---|---|
| `src/views/TokenImport/wxqrcode.vue` | 微信扫码 UI + 全流程编排 |
| `src/utils/hortorLogin.ts` | Hortor 登录可复用模块（供应用宝扫码复用） |
| `src/utils/token.ts` | `transformToken()` / `getServerList()` / `getTokenId()` |
| `src/utils/spoofedHeaders.ts` | 伪装头统一配置 |
| `src/utils/bonProtocol.js` | BON 协议编解码（`g_utils.parse/encode`） |
| `_worker.js` | Cloudflare Worker 反向代理 + 请求头伪装 |
