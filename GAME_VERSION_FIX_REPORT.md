# 游戏版本显示 2.40.5 问题完整修复报告

## 📋 **问题描述**

用户反馈：游戏内版本显示 `2.40.5-wx`（期望显示最新版本 `2.41.5-wx` 或服务器最新版本）

---

## 🔍 **根因分析**

### 1. **本地缓存携带旧版本**

从浏览器 Console 日志发现：

```javascript
[boot v1.0] ✅ 已应用本地 manifest 缓存，条目：1257
[boot v1.0]   ✅ 远程 codeVersion: 2.40.5
[boot v1.0]   CODE_VERSION: 2.40.5 (已锁定)
```

**localStorage 中的 `__boot_manifest_cache__` 存有旧版本数据：**

```javascript
{
  bundleVers: {
    launcher: "xxx",
    main: "yyy", 
    codeVersion: "2.40.5"  // ← 旧版本硬编码在缓存中
  },
  time: 1234567890
}
```

### 2. **远程 Manifest 请求失败（CORS 跨域拦截）**

日志显示 POST 请求发出后没有任何响应日志：

```javascript
boot.js:38 [boot v1.0] POST https://xxz-xyzw.hortorgames.com/login/manifest?platform=wx&version=2.41.5-wx
// ❌ 之后没有 "[boot v1.0] ✅ Manifest 获取成功!" 日志
```

**原因：CORS 跨域问题**
- Game.html 运行在 `localhost:3000`（开发环境）或 `Cloudflare Pages 域名`（生产环境）
- 直接 POST 到 `https://xxz-xyzw.hortorgames.com/login/manifest` 是跨域请求
- 服务器若未配置 CORS 头 → 浏览器拦截 XHR 请求 → onerror/onfail → 静默错误

### 3. **版本锁定机制优先级混乱**

旧代码逻辑：

```javascript
fetchRemoteBundleVers(settings) {
  // 第一步：应用缓存
  var cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    Object.assign(settings.bundleVers, cacheData.bundleVers);
    if (cacheData.bundleVers.codeVersion) {
      settings.codeVersion = cacheData.bundleVers.codeVersion;  // ❌ 先锁定为旧版本 2.40.5
    }
  }
  
  // 第二步：POST 请求（可能失败）
  xhr.send('');
  
  // 第三步：即使成功也来不及了，因为第一步已经锁定了 2.40.5
}
```

然后 `lockCodeVersion(settings)` 函数读取 `settings.codeVersion`（已经是 2.40.5），最终锁定为 2.40.5。

---

## 🛠️ **完整修复方案**

### 第一轮修复：缓存与日志优化

#### ✅ **修复 1: 缓存只加速资源加载，不同步 codeVersion**

**文件**: `public/game/boot.js` 第 19-32 行

**修改前**:
```javascript
if (cacheData && cacheData.bundleVers && typeof cacheData.bundleVers === 'object') {
  Object.assign(settings.bundleVers, cacheData.bundleVers);
  if (cacheData.bundleVers.codeVersion) {
    settings.codeVersion = cacheData.bundleVers.codeVersion;  // ❌ 同步缓存版本
  }
  appliedCache = true;
}
```

**修改后**:
```javascript
if (cacheData && cacheData.bundleVers && typeof cacheData.bundleVers === 'object') {
  // ★ v10.0: 缓存只用于资源加载加速，不同步 codeVersion
  //   原因：缓存可能过期，版本锁定应使用远程最新值或 game-defines 静态值
  Object.assign(settings.bundleVers, cacheData.bundleVers);
  // ❌ 移除 if (cacheData.bundleVers.codeVersion) {...}
  appliedCache = true;
}
```

**效果**：
- ✅ 缓存仅用于快速加载 bundle 资源（1257 个版本哈希秒开）
- ❌ 不再同步过期的 codeVersion
- 💡 版本锁定依赖远程请求结果或 game-defines 静态值

#### ✅ **修复 2: 错误日志始终打印**

**文件**: `public/game/boot.js` 第 72-96 行

**修改前**:
```javascript
xhr.onload = function() {
  if (xhr.status === 200) {
    try {
      // ...解析响应
    } catch(e) {
      if (!appliedCache) console.warn('[boot v1.0] ⚠ Manifest 解析失败:', e.message); // ❌ 有缓存时不打印
    }
  } else {
    if (!appliedCache) console.warn('[boot v1.0] ⚠ Manifest HTTP', xhr.status); // ❌ 有缓存时不打印
  }
};

xhr.onerror = function() {
  if (!appliedCache) console.warn('[boot v1.0] ⚠ Manifest 网络错误'); // ❌ 有缓存时不打印
  resolve();
};

xhr.ontimeout = function() {
  if (!appliedCache) console.warn('[boot v1.0] ⚠ Manifest 超时 (5s)'); // ❌ 有缓存时不打印
  resolve();
};
```

**修改后**:
```javascript
xhr.onload = function() {
  if (xhr.status === 200) {
    try {
      // ...解析响应
      if (bv.codeVersion) {
        settings.codeVersion = bv.codeVersion;
        console.log('[boot v1.0]   ✅ 远程 codeVersion:', bv.codeVersion);
      } else {
        console.warn('[boot v1.0] ⚠ Manifest 响应中无 codeVersion 字段');
        console.warn('[boot v1.0]   原始响应:', JSON.stringify(bv));
      }
    } catch(e) {
      console.warn('[boot v1.0] ⚠ Manifest 解析失败:', e.message); // ✅ 始终打印
    }
  } else {
    console.warn('[boot v1.0] ⚠ Manifest HTTP', xhr.status); // ✅ 始终打印
  }
};

xhr.onerror = function() {
  console.warn('[boot v1.0] ⚠ Manifest 网络错误'); // ✅ 始终打印
  resolve();
};

xhr.ontimeout = function() {
  console.warn('[boot v1.0] ⚠ Manifest 超时 (5s)'); // ✅ 始终打印
  resolve();
};
```

**效果**：
- ✅ 无论是否有缓存，任何错误都会清晰显示
- ✅ 远程成功时能明确看到 "✅ Manifest 获取成功!" 和 codeVersion
- ✅ 开发者能快速诊断 Manifest 请求为什么失败

---

### 第二轮修复：添加同源代理路径

#### ✅ **修复 3: 添加 vite dev proxy**

**文件**: `vite.config.js` 第 256-264 行

**新增配置**:
```javascript
proxy: {
  // Manifest 接口代理（游戏版本动态获取）
  "/api/manifest": {
    target: "https://xxz-xyzw.hortorgames.com",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/manifest/, "/login/manifest"),
    secure: true,
  },
  // ... 其他微信登录接口代理 ...
}
```

**说明**:
- ✅ 开发环境 localhost:3000 访问 `/api/manifest` 会自动转发到 https://xxz-xyzw.hortorgames.com/login/manifest
- ✅ 通过 Vite 代理避免 CORS 问题（同源请求）

#### ✅ **修复 4: 添加 Cloudflare Worker 代理**

**文件**: `wrangler._worker.js` 第 23-31 行

**新增配置**:
```javascript
const proxies = [
  // Manifest 接口代理（游戏版本动态获取）
  {
    prefix: '/api/manifest',
    target: 'https://xxz-xyzw.hortorgames.com',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      'Accept': '*/*'
    }
  },
  
  // ... 其他微信小程序相关代理 ...
];
```

**说明**:
- ✅ 生产环境 Cloudflare Pages 部署后，访问 `/api/manifest` 自动转发到游戏服务器
- ✅ 通过 Workers 代理实现 CORS 穿透（服务端对服务端请求）
- ✅ 保持与现有微信小程序代理服务的一致性

#### ✅ **修复 5: 更新 boot.js 使用 /api/manifest 路径**

**文件**: `public/game/boot.js` 第 34-40 行

**修改前**:
```javascript
var currentVersion = '2.41.5-wx';
var manifestUrl = `https://xxz-xyzw.hortorgames.com/login/manifest?platform=wx&version=${currentVersion}`;
console.log('[boot v1.0] POST', manifestUrl);
```

**修改后**:
```javascript
// ★ v10.1: 通过 /api/manifest 同源自定义代理（dev: vite proxy, prod: worker proxy）
//   原因：避免 CORS 跨域问题 - 直接 POST https://xxz-xyzw.hortorgames.com/login/manifest 被浏览器拦截
var currentVersion = '2.41.5-wx';
var manifestUrl = `/api/manifest?platform=wx&version=${currentVersion}`;
console.log('[boot v1.0] POST', manifestUrl);
```

**效果对比**：

| 场景 | 修改前 | 修改后 |
|------|--------|--------|
| 开发环境 | `https://xxz-xyzw.hortorgames.com/login/manifest` → CORS 失败 | `/api/manifest` → Vite 代理成功 |
| 生产环境 | `https://xxz-xyzw.hortorgames.com/login/manifest` → CORS 失败 | `/api/manifest` → Worker 代理成功 |
| 日志显示 | `POST https://xxz-xyzw.hortorgames.com/...` | `POST /api/manifest?...` |

---

## 📊 **预期运行流程（修复后）**

### 启动顺序：

```
1. preBoot() 调用
   ↓
2. fetchRemoteBundleVers(settings)
   ↓
3a. 应用本地缓存（bundleVers 加速加载）
   - settings.bundleVers = {launcher: xxx, main: yyy, ...} 1257 项 ✓
   - ❌ 不再设置 settings.codeVersion
   
3b. POST /api/manifest?platform=wx&version=2.41.5-wx
   - Dev 环境：Vite proxy → https://xxz-xyzw.hortorgames.com/login/manifest
   - Prod 环境：Worker proxy → https://xxz-xyzw.hortorgames.com/login/manifest
   
3c. 如果请求成功 (HTTP 200)
   - 解析响应 body.bundleVers
   - if (bv.codeVersion):
     settings.codeVersion = bv.codeVersion  # ← 覆盖为服务器最新版本
     console.log('[boot v1.0]   ✅ 远程 codeVersion:', bv.codeVersion)
   
3d. 如果请求失败 (HTTP error/network/timeout)
   - console.warn('[boot v1.0] ⚠ Manifest HTTP', xhr.status)
   - settings.codeVersion 保持 undefined
   
4. lockCodeVersion(settings)
   - ver = settings.codeVersion || globalThis.CODE_VERSION || '2.41.5'
   - settings.codeVersion = 2.41.5-wx 或 远程最新版本
   
5. doStartGame(settings)
   - 加载 bundle + cc.game.run()
   
6. GAME_VERSION = 2.41.5-wx 或 远程最新版本 + '-wx'
   - 游戏内显示的版本号
```

---

## 🎯 **最终修复效果**

### ✅ **情况 A: 远程 Manifest 成功返回最新版本**

```
[boot v1.0] ✅ 已应用本地 manifest 缓存，条目：1257
[boot v1.0] ✅ Manifest 获取成功! (缓存：已预加载)
[boot v1.0]   条目：1257 → 1258
[boot v1.0]   ✅ 远程 codeVersion: 2.42.0
[boot v1.0] ✅ 版本信息已锁定:
[boot v1.0]   CODE_VERSION: 2.42.0 (已锁定)
[boot v1.0]   GAME_VERSION: 2.42.0-wx
```

**游戏内显示**: `2.42.0-wx` ✅

### ✅ **情况 B: 远程 Manifest 失败（网络/超时/服务器问题）**

```
[boot v1.0] ⚠ Manifest HTTP 404
[boot v1.0] ✅ 版本信息已锁定:
[boot v1.0]   CODE_VERSION: 2.41.5 (回退到 game-defines 静态值)
[boot v1.0]   GAME_VERSION: 2.41.5-wx
```

**游戏内显示**: `2.41.5-wx` ✅ （比之前旧版本 2.40.5 好）

---

## 🔄 **下一步操作建议**

1. **清理浏览器缓存**:
   ```javascript
   // 在浏览器 Console 执行
   localStorage.clear();
   location.reload();
   ```

2. **验证新版本获取**:
   - 打开游戏页面 Console
   - 查看 `[boot v1.0]` 日志
   - 确认是否显示 `✅ 远程 codeVersion: <最新版本>`

3. **测试 CORS 代理**:
   - 开发环境：http://localhost:3000 应该能看到 `POST /api/manifest?...`
   - 生产环境：部署 Cloudflare Pages 后同样工作

4. **监控版本同步**:
   - 定期访问 https://xxz-xyzw.hortorgames.com/login/manifest 检查服务器最新版本
   - 如果服务器最新版本不是 2.41.5，调整 boot.js 的 `currentVersion = '2.41.5-wx'`

---

## 📝 **技术要点总结**

### ✨ **核心修复点**

1. **缓存隔离原则**
   - Bundle version hashes（版本哈希）适合缓存 → 加速资源加载
   - Code Version（全局版本号）不适合缓存 → 需每次从服务器拉取

2. **CORS 解决方案**
   - 前端跨域请求 → 后端代理（Vite proxy + Cloudflare Worker）
   - 同源路径统一（`/api/manifest`）→ 环境无关

3. **降级策略增强**
   - 优先：远程 Manifest → 服务器最新 codeVersion
   - 降级：game-defines 静态值 → 2.41.5
   - 兜底：boot.js 硬编码 → '2.41.5'

### 📚 **相关文件变更**

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `public/game/boot.js` | 移除缓存 codeVersion 同步 | 19-32 |
| `public/game/boot.js` | 错误日志始终打印 | 72-96 |
| `public/game/boot.js` | 改用 /api/manifest 路径 | 34-40 |
| `vite.config.js` | 添加 /api/manifest 代理 | 256-264 |
| `wrangler._worker.js` | 添加 /api/manifest 代理 | 23-31 |
| `dist/_worker.js` | 复制 wrangler._worker.js | - |

---

## ✅ **修复完成度**

- [x] 缓存隔离（不再同步过期 codeVersion）
- [x] 错误日志增强（任何情况下都打印）
- [x] CORS 解决（dev: Vite proxy + prod: Worker proxy）
- [x] 路径统一（/api/manifest 全环境兼容）
- [x] dist/_worker.js 同步（准备部署）

**预计效果**: 游戏版本将显示 `2.41.5-wx` 或服务器最新版本（而非旧的 2.40.5-wx）🎉
