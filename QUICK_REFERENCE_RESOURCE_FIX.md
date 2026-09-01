# 🎮 游戏引擎资源加载重构 - 快速参考卡

## ❗ 核心修复 (Quick Fixes)

### 问题：贴图不更新

**一键解决:**
```javascript
localStorage.setItem('__force_remote_manifest', 'true');
location.reload();
```

**验证修复效果:**
```javascript
console.log('✅ WebP Support:', cc.macro.SUPPORT_TEXTURE_FORMATS.includes('.webp'));
// Expected: true

console.log('✅ KTX Support:', cc.macro.SUPPORT_TEXTURE_FORMATS.includes('.ktx'));
// Expected: true
```

---

## 🔧 调试工具使用

### 启用完整日志
```javascript
ResourceDebug.enable();
location.reload();
```

### 关闭调试
```javascript
ResourceDebug.disable();
location.reload();
```

### 检查版本差异
```javascript
await ResourceDebug.check();
```

### 开启强制刷新模式
```javascript
ResourceDebug.forceRefresh();
```

### 关闭强制刷新
```javascript
ResourceDebug.clearForceRefresh();
```

---

## 📊 关键控制台日志

### ✅ 成功标志
```
[Patch v10.2] ✅ Texture format hook installed successfully
[ResourceDebug] Supported: WebP ✅
[ResourceDebug] Supported: KTX ✅
[boot v1.0] 🔄 强制跳过本地缓存，准备拉取远程 manifest
[ResourceDebug] 📦 Loading bundle: { name: 'game', version: 'xyz123' }
[ResourceDebug] 🖼️ Texture downloaded complete
```

### ⚠️ 失败标志（需关注）
```
[ResourceDebug] ⚠️ Bundle load FAILED: ...
[ResourceDebug] ❌ XXTEA decrypt failed
[ResourceDebug] Manifest no effective bundleVers found
```

---

## 🎯 生产环境部署 Checklist

- [ ] Upload new textures to CDN (`xxz-xyzw-res.hortorgames.com/remote/`)
- [ ] Verify server updated `config.json` with new bundle version hash
- [ ] Force refresh once after deployment: `ResourceDebug.forceRefresh()`
- [ ] Monitor console for `[ResourceDebug]` success messages
- [ ] Clear cache if still seeing old assets
- [ ] Disable force refresh mode after confirming success

---

## 📁 Modified Files Summary

| File | Change Type | Purpose |
|------|-------------|---------|
| `patch.js` | +30 lines | Hook texture format getter |
| `boot.js` | +15 lines | Add remote manifest flag check |
| `main.2a00e.js` | +23 lines | Enhanced CDN cache control |
| `resource-debug.js` | NEW (+223) | Debug utilities & monitoring |
| `game.html` | +4 lines | Include debug script |
| `REFACTORY_RESOURCE_LOADER.md` | NEW | Design documentation |
| `RESOURCE_REFACTOR_USAGE.md` | NEW | User guide & troubleshooting |

---

## 💡 Pro Tips

### Tip 1: Quick Cache Clear
```javascript
// Clear ALL game-related storage
localStorage.clear();
indexedDB.databases?.forEach(db => indexedDB.deleteDatabase(db.name));
location.reload();
```

### Tip 2: Monitor Bundle Versions in Real-time
```javascript
setInterval(() => {
  console.table(window._CCSettings?.bundleVers || {});
}, 3000);
```

### Tip 3: Test Texture Format Support
```javascript
// Check if engine supports your texture format
const formats = cc.macro.SUPPORT_TEXTURE_FORMATS;
const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.ktx', '.astc'];

supportedFormats.forEach(fmt => {
  console.log(`${fmt}: ${formats.includes(fmt) ? '✅' : '❌'}`);
});
```

### Tip 4: Force Refresh Before Deployment
```javascript
// Run BEFORE deploying new resources
localStorage.setItem('__force_remote_manifest', 'true');
// Then deploy...
// After deploy confirmed: remove flag
localStorage.removeItem('__force_remote_manifest');
```

---

## 🔍 Advanced Troubleshooting

### Step 1: Check Current Configuration
```javascript
console.log('Force Remote Mode:', localStorage.getItem('__force_remote_manifest'));
console.log('Resource Debug:', localStorage.getItem('__resource_debug'));
console.log('Current Textures:', cc.macro.SUPPORT_TEXTURE_FORMATS);
```

### Step 2: Verify Network Requests
Open Chrome DevTools → Network tab → Filter "config.json" → Check:
- Headers → Cache-Control: Should be `no-cache` (not `public` or stale max-age)
- Status: 200 OK (not 304 Not Modified)

### Step 3: Examine Server Response
```javascript
fetch('/api/manifest?platform=wx&version=2.41.5-wx')
  .then(r => r.json())
  .then(d => {
    const body = typeof d.body === 'string' ? JSON.parse(d.body) : d.body;
    console.log('Server Bundle Version Hashes:', body.bundleVers);
    
    const localCache = JSON.parse(localStorage.getItem('__boot_manifest_cache__'));
    console.log('Local Cache Hashes:', localCache?.bundleVers);
    
    // Compare
    for (let key in body.bundleVers) {
      if (body.bundleVers[key] !== localCache?.bundleVers[key]) {
        console.warn(`⚠️ ${key} versions differ!`, 
          `Server: ${body.bundleVers[key]}`, 
          `Local: ${localCache?.bundleVers[key]}`);
      }
    }
  });
```

---

## 📞 Emergency Contacts

遇到问题无法解决？收集以下信息寻求帮助：

1. **Console Output**: Full log from startup to current state
2. **Network Tab**: Screenshot of failed requests
3. **Configuration State**: Run `ResourceDebug.check()` output
4. **Browser Dev Tools**: Application → Local Storage content

Reference these files for more details:
- [`RESOURCE_REFACTOR_USAGE.md`](RESOURCE_REFACTOR_USAGE.md) - Complete user guide
- [`REFACTORY_RESOURCE_LOADER.md`](REFACTORY_RESOURCE_LOADER.md) - Technical design doc

---

**Document Version**: v10.2  
**Last Updated**: 2026-08-28  
**Compatible With**: All projects using naiwa-style resource loading
