# CDN 404 错误 v2.50.7 - Manifest 拉取失败深度排查

## 🚨 最新错误日志分析

### 核心错误
```javascript
[boot v2.0] ❌ MAIN bundle 加载失败: {}
[boot v2.0]   err.message: download failed: https://xxz-xyzw-res.hortorgames.com/remote/launcher/index.dd530.jsc, status: 404
[boot v2.0]   main 版本号：dd530
[boot v2.0]   server: http://localhost:3000/game/assets/
```

---

## 🔍 问题根源确认

### 当前脚本加载顺序
```html
<!-- game.html -->
<script src="game/main.2a00e.js">       ← 定义了 installRemoteAssetLoader + boot ( Niaoge 版本 )
</script>
<script src="game/boot.js">              ← 覆盖 window.boot() + window.preBoot()
</script>
```

### Manifest 拉取逻辑检查

#### ✅ boot.js 中的 fetchRemoteBundleVers() (v9.2)
**位置**: `public/game/boot.js` Line 13-110

```javascript
function fetchRemoteBundleVers(settings) {
    // 1. 尝试从 localStorage 读取缓存
    var cached = localStorage.getItem('__boot_manifest_cache__');
    
    // 2. POST /api/manifest?platform=wx&version=2.41.5-wx
    var manifestUrl = `/api/manifest?platform=wx&version=${currentVersion}`;
    console.log('[boot v1.0] POST', manifestUrl);  // ← 应该看到此日志
    
    xhr.open('POST', manifestUrl, true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var data = JSON.parse(xhr.responseText);
            var bv = body && body.bundleVers;
            
            // 3. 合并到 settings.bundleVers
            Object.assign(settings.bundleVers, bv);
            
            console.log('[boot v1.0] ✅ Manifest 获取成功!');  // ← 应该看到此日志
        }
    };
}
```

#### ✅ vite.config.js 中的代理配置
**位置**: `vite.config.js` Line 258-263

```javascript
"/api/manifest": {
  target: "https://xxz-xyzw.hortorgames.com",
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/manifest/, "/login/manifest"),
  secure: true,
},
```

---

## ❓ 问题诊断

### 现象分析

根据日志输出：
```
main 版本号：dd530          ← settings.bundleVers.main 未更新
server: http://localhost:3000/game/assets/  ← 本地资源路径
download failed: .../launcher/index.dd530.jsc → 404
```

**推断结论**：
1. ❌ **fetchRemoteBundleVers() 未被调用** 或
2. ❌ **Manifest 拉取请求失败** 或  
3. ❌ **拉取成功但未合并到 settings.bundleVers**

---

## 🛠️ 修复方案

### 方案 1: 强制刷新 localStorage 缓存（推荐）

在浏览器控制台执行以下命令：

```javascript
// 1. 清除旧缓存
localStorage.removeItem('__boot_manifest_cache__');

// 2. 启用强制远程模式
localStorage.setItem('__force_remote_manifest', 'true');

// 3. 刷新页面
location.reload();
```

**预期结果**：
- ✅ 应该看到 `[boot v1.0] 🔄 强制跳过本地缓存，准备拉取远程 manifest`
- ✅ 应该看到 `[boot v1.0] POST /api/manifest?platform=wx&version=2.41.5-wx`
- ✅ 应该看到 `[boot v1.0] ✅ Manifest 获取成功！`
- ✅ main 版本号应变为服务器返回的最新 hash

---

### 方案 2: 手动检查网络请求

1. **打开浏览器 DevTools** → Network 标签
2. **过滤**：输入 `manifest`
3. **刷新页面**
4. **查找**：
   - ✅ `POST /api/manifest` → 状态 200
   - ❌ `POST /api/manifest` → 状态 404/500
   - ❌ `POST /api/manifest` → 无请求

如果**没有请求** → 说明 `fetchRemoteBundleVers()` 未被调用
如果**请求失败** → 查看响应体错误信息

---

### 方案 3: 添加调试日志

修改 `public/game/boot.js` Line 443，在 `window.boot` 函数开头增加详细日志：

```javascript
window.boot = async function () {
  var settings = window._CCSettings;
  if (!settings) {
    console.error('[boot v2.0] ❌ _CCSettings 未定义!');
    return;
  }

  console.log('[boot v2.0 DEBUG] 启动前 settings.bundleVers.main:', settings.bundleVers.main);
  console.log('[boot v2.0 DEBUG] 启动前 settings.bundleVers 条目数:', Object.keys(settings.bundleVers || {}).length);

  // 1) Manifest
  await fetchRemoteBundleVers(settings);

  console.log('[boot v2.0 DEBUG] Manifest 拉取后 settings.bundleVers.main:', settings.bundleVers.main);
  console.log('[boot v2.0 DEBUG] Manifest 拉取后 settings.bundleVers 条目数:', Object.keys(settings.bundleVers || {}).length);
  
  // ... 后续代码不变
};
```

**刷新页面后应该看到**：
```
[boot v2.0 DEBUG] 启动前 settings.bundleVers.main: dd530
[boot v2.0 DEBUG] 启动前 settings.bundleVers 条目数：XXXX
[boot v1.0] POST /api/manifest...
[boot v1.0] ✅ Manifest 获取成功！
[boot v2.0 DEBUG] Manifest 拉取后 settings.bundleVers.main: NEW_HASH
[boot v2.0 DEBUG] Manifest 拉取后 settings.bundleVers 条目数：YYYY
```

---

## 🔎 完整诊断步骤

### Step 1: 清除缓存 + 强制远程
```javascript
localStorage.clear();  // 或者只清除 __boot_manifest_cache__
location.reload();
```

### Step 2: 观察控制台日志
**期望看到的日志序列**：
```
[boot v9.2] 启动逻辑初始化...
[boot v2.0] 🔥 深度预热开始：拉取 manifest + 加载 bundle...
[boot v1.0] POST /api/manifest?platform=wx&version=2.41.5-wx
[boot v1.0] ✅ Manifest 获取成功! (缓存：首次)
[boot v1.0]   条目：XXX → YYY
[boot v2.0] ✅ CDN 资源加载器已安装
```

**如果出现错误**：
```
[boot v1.0] ⚠ Manifest HTTP 404/500     ← 网络问题
[boot v1.0] ⚠ Manifest 解析失败          ← JSON 格式错误
[boot v1.0] ⚠ Manifest 无有效 bundleVers  ← API 响应异常
```

### Step 3: 检查 Network 面板
- ✅ POST `/api/manifest` → Status 200
- ✅ Response Body 包含 `bundleVers` 对象
- ❌ POST `/api/manifest` → 无请求 → boot.js 未执行

### Step 4: 验证 main 版本号
```javascript
console.log(window._CCSettings?.bundleVers?.main);
// 期望：不再是 dd530，而是类似 a1b2c3d (新的 hash)
```

---

## 📊 可能的问题场景

| 场景 | 原因 | 解决方案 |
|------|------|----------|
| 1. 缓存导致 | localStorage 中的旧 manifest 未更新 | 清除缓存 + `__force_remote_manifest=true` |
| 2. CORS 拦截 | 直接请求远程域名被浏览器阻止 | ✅ 已配置 Vite proxy，无需额外操作 |
| 3. API 故障 | `/login/manifest` 接口返回异常 | 检查 Network 响应体 |
| 4. boot.js 未加载 | game.html 中脚本顺序错误 | 确保 boot.js 在 main.2a00e.js 之后 |
| 5. Fetch 超时 | 网络延迟 > 5s | 延长 timeout 或使用缓存兜底 |

---

## ✅ 验证标准

修复成功后应满足以下条件：

1. ✅ 控制台无 404 错误
2. ✅ main 版本号 ≠ `dd530`
3. ✅ Network 面板中无红色请求
4. ✅ `[boot v1.0] ✅ Manifest 获取成功！` 日志存在
5. ✅ launcher/*.jsc 文件能正常从 CDN 加载

---

## 🚀 临时应急方案

如果远程 API 暂时不可用，可以：

1. **使用本地静态 manifest**：
   ```bash
   # 从 niaoge 项目复制一个旧的但有效的 manifest
   cp niaoge/public/game/manifest-backup.json public/game/manifest-local.json
   ```

2. **修改 boot.js 使用本地文件**：
   ```javascript
   // 替换 fetchRemoteBundleVers 中的 URL
   var manifestUrl = '/game/manifest-local.json';
   ```

3. **锁定已知可用的版本 hash**：
   ```javascript
   // 在 settings.js 中手动设置所有 bundle 的已知版本
   main: "xxx123"  // 替换 dd530
   ```

---

## 📞 下一步行动

请用户按以下步骤测试并反馈：

1. 打开浏览器控制台 (F12)
2. 执行 `localStorage.clear()`
3. 执行 `localStorage.setItem('__force_remote_manifest', 'true')`
4. 刷新页面 (F5)
5. **截图控制台日志** 和 **Network 面板** 的 `/api/manifest` 请求
6. 报告是否仍然出现 `main: dd530` → 404

我将根据反馈继续深入排查！
