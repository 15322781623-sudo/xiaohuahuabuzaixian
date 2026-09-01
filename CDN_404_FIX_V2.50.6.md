# CDN 404 错误 v2.50.6 - Manifest 拉取失败问题

## 📋 最新错误日志分析

### 核心错误
```
GET https://xxz-xyzw-res.hortorgames.com/remote/launcher/index.dd530.jsc → 404 (Not Found)
```

**关键发现**: 使用旧的本地 version hash (`dd530`) 而非服务器返回的最新版本

---

## 🔍 根本原因分析

### 当前脚本加载流程

```html
<!-- game.html 加载顺序 -->
<script src="game/main.2a00e.js"></script>  ← 定义了 installRemoteAssetLoader + boot
<script src="game/boot.js"></script>        ← 覆盖 window.boot()
```

### Manifest 拉取逻辑冲突

#### main.2a00e.js 中的实现 ( Niaoge 版本 )
```javascript
window.loadRemoteBundleVers = async function () {
  const manifestUrl = `https://xxz-xyzw.hortorgames.com/login/manifest?platform=hortor&version=0.32.0-android`
  const settingsRes = await fetch(manifestUrl, {...})
  
  const settingsTxt = await settingsRes.text()
  const settingsObj = JSON.parse(settingsTxt)
  const bundleVers = window.parseRemoteBundleVers(settingsObj)
  Object.assign(window._CCSettings.bundleVers, bundleVers)  // ← 直接覆盖
}
```

**问题**: 
- ❌ 直接访问 HTTPS API，可能被 CORS 拦截
- ❌ 不通过代理，浏览器可能失败

#### boot.js 中的实现 (主项目改进版)
```javascript
function fetchRemoteBundleVers(settings) {
  var manifestUrl = `/api/manifest?platform=wx&version=${currentVersion}`;
  console.log('[boot v1.0] POST', manifestUrl);
  
  xhr.open('POST', manifestUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.send('');
}
```

**优势**:
- ✅ 同源代理，避免 CORS
- ✅ 支持 dev/prod 环境切换
- ✅ 带本地缓存机制

---

## ⚠️ 严重问题

### 两个 boot() 函数定义冲突

| 文件 | 函数 | 用途 | 状态 |
|------|------|------|------|
| main.2a00e.js | window.boot | 直接从 NiaoGe 复制 | **被覆盖** ✗ |
| boot.js | window.boot | 主项目 v10.x 改进版 | **实际执行** ✓ |

**执行顺序**:
```javascript
// main.2a00e.js 先定义
window.boot = async function() {
  await window.loadRemoteBundleVers();  // 方法 A: 直连 API
  window.installRemoteAssetLoader();
  // ...
};

// boot.js 后加载并覆盖
(function() {
  window.boot = async function() {
    await fetchRemoteBundleVers(settings);  // 方法 B: 代理模式
    // ...
  };
})();
```

**结论**: 应该使用 boot.js 的版本，理论上没问题。

---

## 🔧 排查步骤

### 1. 检查 Manifest 是否成功获取

打开浏览器控制台，查看日志：
```javascript
// 期望看到
[boot v1.0] POST /api/manifest?platform=wx&version=2.41.5-wx
[boot v1.0] ✅ Manifest 获取成功!
[boot v2.0] 🔥 深度预热开始：拉取 manifest + 加载 bundle...
```

**如果没有看到**,说明 Manifest 拉取失败，使用旧版本 `dd530`

### 2. 检查 localStorage 缓存

```javascript
console.log(localStorage.getItem('__boot_manifest_cache__'));
```

如果缓存中包含 `launcher: "dd530"`，即使新 manifest 成功也会优先使用缓存！

### 3. 测试强制刷新 Manifest

在控制台执行：
```javascript
localStorage.setItem('__force_remote_manifest', 'true');
location.reload(true);
```

这将跳过缓存，强制拉取最新 manifest。

---

## 🛠️ 修复方案

### 方案 1: 清理本地缓存 ✅ 推荐

```javascript
// 在浏览器控制台执行
localStorage.clear();  // 或只清理特定 key
sessionStorage.clear();
location.reload(true);
```

### 方案 2: 强制刷新 Manifest

```javascript
// 在控制台执行后刷新
localStorage.setItem('__force_remote_manifest', 'true');
location.reload(true);
```

### 方案 3: 修改代码禁用缓存 ⚠️

**boot.js** 中修改缓存逻辑：
```javascript
// 注释掉缓存恢复代码
/*
if (!FORCE_REMOTE) {
  Object.assign(settings.bundleVers, cacheData.bundleVers);
  appliedCache = true;
}
*/

// 或直接在 settings.js 中更新版本号
```

---

## 📝 临时解决方案

### 快速测试步骤

1. **打开开发者工具** (F12)
2. **切换到 Console 标签**
3. **执行清理命令**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
4. **强制刷新页面**:
   ```
   Ctrl + F5 (Windows)
   Cmd + Shift + R (Mac)
   ```
5. **查看 Network 面板**:
   - 确认 `/api/manifest` 请求是否成功 (200 OK)
   - 确认返回的 bundleVers 中 launcher 版本是什么
   - 确认后续 CDN 请求是否使用新版本号

---

## ✅ 预期结果

### 成功的场景
1. ✅ `/api/manifest` → 200 OK
2. ✅ `[boot v1.0] ✅ Manifest 获取成功!`
3. ✅ `[remoteAssets] 远程版本已拉取 {launcher: 'abc123', ...}`
4. ✅ `launcher/config.abc123.json` → 200 (from CDN)
5. ✅ `launcher/index.abc123.jsc` → 200 (from CDN)

### 失败的场景（当前）
1. ❌ `/api/manifest` → 404/网络错误
2. ❌ 没有 Manifest 成功日志
3. ❌ `launcher/config.dd530.json` → 404
4. ❌ `launcher/index.dd530.jsc` → 404 (当前错误)

---

## 📊 诊断清单

| 检查项 | 预期 | 当前 | 状态 |
|--------|------|------|------|
| 控制台日志有 Manifest 请求吗？ | YES | 待检查 | ⏳ |
| localStorage 有旧缓存吗？ | 可能有 | 待检查 | ⏳ |
| /api/manifest 返回 200 吗？ | YES | 待检查 | ⏳ |
| launcher 版本号正确吗？ | > dd530 | dd530 ✗ | ❌ |

---

**最后更新**: 2026-08-29 23:57  
**修复版本**: v2.50.6  
**状态**: ⏳ 等待用户执行诊断命令验证
