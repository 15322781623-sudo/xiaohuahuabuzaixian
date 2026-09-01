# 游戏引擎资源加载器重构 - 使用说明

## 🎯 问题描述

**原问题**: 游戏引擎无法获取最新的贴图数据（texture update issues）

**根本原因**:
1. ✅ `cc.macro.SUPPORT_TEXTURE_FORMATS` 未 override → 忽略 WebP/KTX/ASTC 等新格式
2. ✅ CDN 缓存策略不当 → config.json 请求被浏览器缓存导致版本不同步
3. ✅ Manifest 本地缓存机制 → 覆盖服务器最新 bundleVers
4. ❌ XXTEA 解密支持不完整 → 加密的 `.jsc` 脚本加载失败

## ✨ 解决方案概述

基于 `naiwa-release-main` 项目的最佳实践进行了以下改进：

### 1️⃣ 纹理格式钩子 (Texture Format Hook)

**位置**: `public/game/patch.js` (+30 lines)

```javascript
// Override cc.macro.SUPPORT_TEXTURE_FORMATS getter
Object.defineProperty(window.cc.macro, 'SUPPORT_TEXTURE_FORMATS', {
    get: function() {
        return ['.png', '.jpg', '.jpeg', '.webp', '.pvr', '.ktx', '.astc'];
    },
    // ...
});
```

**效果**:
- ✅ 自动识别 WebP、KTX、ASTC 等现代纹理格式
- ✅ 防止外部代码 override
- ✅ 控制台输出日志确认安装成功

---

### 2️⃣ CDN 强制刷新控制 (Force Refresh)

**位置**: 
- `public/game/boot.js` (+15 lines)
- `public/game/main.2a00e.js` (+23 lines)

#### boot.js: Manifest 远程刷新模式

启用方式：
```javascript
localStorage.setItem('__force_remote_manifest', 'true');
```

或运行时设置：
```javascript
window.PATCH_FORCE_MANIFEST_REFRESH = true;
```

**行为**:
- ✅ 跳过本地 manifest 缓存
- ✅ 强制从服务器拉取最新 `bundleVers`
- ✅ 合并配置时强制使用远程版本

#### main.2a00e.js: 下载器缓存策略

```javascript
const fetchOptions = {
  cache: 'no-cache',
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// 为 URL 添加时间戳参数
if (forceRefresh || isConfigRequest) {
  urlWithNoCache = `${finalUrl}?_n=${Date.now()}`;
}
```

**效果**:
- ✅ 彻底绕过浏览器缓存
- ✅ Bundle config.json 每次请求都带 timestamp
- ✅ Texture updates 立即可见

---

### 3️⃣ 资源调试工具 (Resource Debug Utility)

**新文件**: `public/game/resource-debug.js` (+223 lines)

#### 功能特性

1. **Bundle 加载追踪**
   ```javascript
   console.log('[ResourceDebug] 📦 Loading bundle:', {name, version, ...});
   console.log('[ResourceDebug] ✅ Bundle loaded successfully:');
   ```

2. **纹理下载监控**
   ```javascript
   console.log('[ResourceDebug] 🖼️ Downloading texture:', {url, format});
   console.log('[ResourceDebug] 🖼️ Texture downloaded complete:');
   ```

3. **Manifest 版本对比**
   ```javascript
   ResourceDebug.check(); // 手动触发检查
   ```

4. **一键开关控制**
   ```javascript
   ResourceDebug.enable();  // 启用调试
   ResourceDebug.disable(); // 禁用调试
   ResourceDebug.forceRefresh(); // 开启强制刷新模式
   ```

#### 使用方法

**步骤 1: 启用调试**
```javascript
// 在浏览器 Console 执行
localStorage.setItem('__resource_debug', 'true');
location.reload();
```

**步骤 2: 查看日志**
```
[ResourceDebug] AssetManager bundler hooked
[ResourceDebug] Texture downloader hooked
[ResourceDebug] 🖼️ Current texture formats: .png, .jpg, .jpeg, .webp, .pvr, .ktx, .astc
[ResourceDebug] Supported: WebP ✅
[ResourceDebug] Supported: KTX ✅
```

**步骤 3: 验证修复**
```javascript
// 检查是否识别新格式
console.log('WebP Support:', cc.macro.SUPPORT_TEXTURE_FORMATS.includes('.webp')); // true

// 查看 Bundle 版本是否同步
ResourceDebug.check(); // 打印对比结果
```

---

## 🔧 配置选项

### Force Remote Mode（强制远程模式）

用于测试新资源部署后的即时生效性。

#### 方法 1: localStorage 持久化
```javascript
localStorage.setItem('__force_remote_manifest', 'true');
```
⚠️ 重启后仍然有效，除非调用 `ResourceDebug.clearForceRefresh()`

#### 方法 2: 临时标记
```html
<script>
  window.PATCH_FORCE_MANIFEST_REFRESH = true;
</script>
```
⚡ 仅限当前页面有效

#### 关闭永久刷新模式
```javascript
localStorage.removeItem('__force_remote_manifest');
```

---

## 📊 问题排查流程

### Case 1: 贴图不更新

**症状**: 修改了 `assets/textures/player.png`，服务器已上传，但游戏中还是旧图

**排查步骤**:

1. 启用 debug 模式
   ```javascript
   localStorage.setItem('__resource_debug', 'true');
   location.reload();
   ```

2. 检查 Console 日志
   ```
   [Patch v10.2] ✅ Texture format hook installed successfully
   [ResourceDebug] 🖼️ Current texture formats: ...
   ```

3. 确认服务器版本已变更
   ```bash
   curl https://xxz-xyzw-res.hortorgames.com/remote/game/config.xxx.json | jq .base
   ```

4. 强制刷新 manifest
   ```javascript
   localStorage.setItem('__force_remote_manifest', 'true');
   location.reload();
   ```

5. 查看具体哪些 bundle 版本变了
   ```javascript
   ResourceDebug.check();
   ```

6. 手动清除所有缓存
   ```javascript
   localStorage.clear();
   indexedDB.deleteDatabase('my-game-db-name'); // Replace with actual DB name
   location.reload();
   ```

---

### Case 2: 加载加密的 .jsc 文件失败

**症状**: Console 显示 `XXTEA decrypt failed` 或相关错误

**可能原因**:
- XXTEA key 不匹配
- Pako 库未加载或版本过旧
- File corrupted during upload

**解决方法**:
1. 确认 `settings.js` 中 `encrypted` 标志已设置
2. 检查 `cocos-bundle-patch.js` 已正确引入
3. 验证 `window.pako` 存在且可用
4. 使用 Network tab 确认 `.jsc` 文件大小正常（非空）

---

### Case 3: Bundle 版本一直不更新

**症状**: 多次部署新版本，但 bundleVers 始终是旧值

**排查步骤**:

1. 检查服务器响应
   ```javascript
   fetch('/api/manifest?platform=wx&version=2.41.5-wx')
     .then(r => r.json())
     .then(d => console.log('Server bundleVers:', d.body.bundleVers));
   ```

2. 对比本地存储的值
   ```javascript
   JSON.parse(localStorage.getItem('__boot_manifest_cache__')).bundleVers
   ```

3. 如果服务器和新值一致，检查是否命中了 fallback 逻辑
   ```
   [boot v1.0] ⚠ Manifest 无有效 bundleVers，使用本地版本
   ```

4. 启用 force refresh 后重试
   ```javascript
   localStorage.removeItem('__boot_manifest_cache__');
   localStorage.setItem('__force_remote_manifest', 'true');
   location.reload();
   ```

---

## 🚀 生产部署建议

### Standard Flow（标准流程）

1. **开发环境**: Always enable force refresh for testing
   ```javascript
   // dev/index.html add-in header
   <script>window.PATCH_FORCE_MANIFEST_REFRESH = true;</script>
   ```

2. **预发布**: Default mode (use local cache)
   - No configuration changes needed

3. **生产环境**:
   ```javascript
   // Enable once per deployment
   // Run in browser console AFTER deployment
   ResourceDebug.forceRefresh();
   
   // Or wait for natural cache expiry
   ```

### Monitoring Checklist

- [ ] Check Console logs after deployment: `[ResourceDebug]` entries visible
- [ ] Verify new texture formats detected: `WebP ✅`, `KTX ✅`
- [ ] Confirm manifest updated: `[boot v1.0] Manifest updated` message shown
- [ ] Monitor network timing: Config requests should not be cached (no 304 responses)

---

## 🔗 相关文件清单

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `public/game/patch.js` | Texture format hook | +30 |
| `public/game/boot.js` | Manifest cache control | +15 |
| `public/game/main.2a00e.js` | CDN cache strategy | +23 |
| `public/game/resource-debug.js` | New debug utility | +223 (new) |
| `public/game.html` | Add debug script | +4 |
| `REFACTORY_RESOURCE_LOADER.md` | Original design doc | Created |

---

## 📝 Reference Implementation Comparison

### naiwa-release-main Patterns Used

✅ `overrideTextureFormats()` - Hook cc.macro getter
✅ `wrapBundleLoading()` - Debug wrapper pattern
✅ `downloadJson(url, fetchOptions)` - Cache control via headers
✅ `FORCE_REMOTE_FLAG` - Runtime mode toggle

### Our Additional Features

✨ Auto-detect & log texture format support status
✨ Bundle version diff visualization
✨ One-click debug toggles (`ResourceDebug.enable/disable`)
✨ Persistent force refresh mode (via localStorage)

---

## 🛑 Troubleshooting Tips

**Q: Console 没有显示 `[Patch v10.2] ✅ Texture format hook installed`**

A: 可能是顺序问题。确保:
1. `patch.js` 在 Cocos 引擎加载之前执行
2. `window.cc` 和 `window.cc.macro` 已经定义时钩子才被调用
3. 尝试硬刷新 (`Ctrl+Shift+R`)

---

**Q: 强制刷新模式下速度反而变慢了？**

A: 这是正常的。每次都要重新拉取 manifest + 所有 bundle versions。
建议使用场景:
- 测试新资源部署
- 排查缓存问题
- 紧急热修复后立即生效

---

**Q: Debug 工具泄漏内存吗？**

A: 不会。该工具仅通过重写函数包装器实现，不影响垃圾回收。
可安全关闭: `ResourceDebug.disable()`

---

## 📞 技术支持

遇到问题？

1. 启用 debug 模式并复制完整 Console 日志
2. 运行 `ResourceDebug.check()` 查看 version comparison
3. 检查 Network tab 中 `/api/manifest` 请求是否正常
4. 对照此文档的 "问题排查流程" 逐一验证

---

## 🔄 Changelog

- **v10.2** (2026-08-28): Initial refactoring implementation
  - ✅ Texture format hook added
  - ✅ Force remote manifest mode added
  - ✅ Enhanced CDN cache control added
  - ✅ Resource debug utilities created
  - ✅ Documentation written
