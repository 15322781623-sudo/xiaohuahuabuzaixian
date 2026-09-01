# Game Engine Resource Loader Refactoring Plan (naiwa-style)

## 🎯 Objective
Fix texture update issues and align resource loading mechanism with naiwa-release-main project patterns.

## 🔍 Root Cause Analysis

### Current Issues:
1. **Texture Format Lock**: `cc.macro.SUPPORT_TEXTURE_FORMATS` not overridden → ignores remote PNG/WebP textures
2. **CDN Cache Control Missing**: No cache-busting headers for image resources  
3. **Bundle Version Sync**: Local `bundleVers` overrides server manifest → loads stale assets
4. **Missing XXTEA Decryption**: Encrypted `.jsc` files fail silently

### Comparison: naiwa vs Current

| Feature | naiwa-release-main | Current Project | Status |
|---------|-------------------|-----------------|--------|
| Texture Formats Hook | ✅ Yes | ❌ No | 🔴 Critical |
| Bundle Version Cache | ✅ Always fetch | ⚠️ Falls back local | 🟡 Warning |
| XXTEA Decrypter | ✅ Integrated | ❌ Missing | 🔴 Critical |
| CDNCache-Control | ✅ force-cache | ❌ Default | 🟡 Minor |
| Script Decompression | ✅ Pako + LZ4 | ⚠️ Only pakro | 🟡 Partial |

## 🛠️ Refactoring Steps

### Phase 1: Fix Texture Loading (Critical)

#### Modify `public/game/patch.js`
Add texture format override before engine initialization:

```javascript
// === Add at line ~50 after window.__hooked__ flag check ===

(function overrideTextureFormats() {
  // Wait for cc.macro available
  var checkInterval = setInterval(function() {
    if (typeof window.cc !== 'undefined' && window.cc.macro) {
      clearInterval(checkInterval);
      
      // Override SUPPORT_TEXTURE_FORMATS to include WebP & modern formats
      Object.defineProperty(window.cc.macro, 'SUPPORT_TEXTURE_FORMATS', {
        get: function() {
          console.log('[Resource Patch] Using remote texture formats');
          return ['.png', '.jpg', '.jpeg', '.webp', '.pvr', '.ktx', '.astc'];
        },
        set: function() {},
        configurable: true,
        enumerable: true
      });
      
      console.log('[Resource Patch] ✅ Texture format hook installed:', 
                  window.cc.macro.SUPPORT_TEXTURE_FORMATS);
    }
  }, 100);
})();
```

### Phase 2: Enhance CDN Cache Strategy (Critical)

#### Modify `installRemoteAssetLoader` in `public/game/main.2a00e.js`

Update the `downloadJson` function (around line 449):

```javascript
function downloadJson(url, options, onComplete) {
  const finalUrl = toRemoteUrl(url)
  
  // ★ Force refresh: disable cache for all CDN requests
  const urlWithNoCache = finalUrl.includes('?') 
    ? `${finalUrl}&_n=${Date.now()}`
    : `${finalUrl}?_n=${Date.now()}`
  
  // Replace config.json request with no-cache variant
  if (url.endsWith('config.json')) {
    // Use X-Content-Type-Options header to prevent caching
    fetch(urlWithNoCache, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('download failed: ' + finalUrl + ', status: ' + res.status)
        }
        return res.json()
      })
      .then(function (json) {
        onComplete && onComplete(null, json)
      })
      .catch(function (err) {
        console.error('[Resource Patch] Config fetch failed:', err);
        onComplete && onComplete(err)
      })
    return
  }
  
  if (originalJsonDownloader) {
    return originalJsonDownloader(finalUrl, options, onComplete)
  }
  
  // ... rest of existing code
}
```

### Phase 3: Implement XXTEA Decryption (Critical)

#### Add to `public/game/cocos-bundle-patch.js` (from naiwa reference)

Use the minified version already present but verify it's properly called:

```javascript
// Verify XXTEA key constant
const XXTEA_KEY = "0Aed5E79bbEa69f8";  // Should be from settings.js

// Register decoder BEFORE installRemoteAssetLoader
if (typeof cc !== 'undefined' && cc.assetManager) {
  const dl = cc.assetManager.downloader;
  
  // Check if .jsc downloader registered
  if (!dl._downloaders['.jsc']) {
    console.warn('[Resource Patch] ❌ .jsc decrypter not installed!');
    
    // Try to use cocos-bundle-patch.js
    try {
      // Load xxtea-decoder dynamically
      console.log('[Resource Patch] Installing XXTEA decrypter...');
    } catch(e) {
      console.error('[Resource Patch] XXTEA installation failed:', e);
    }
  }
}
```

### Phase 4: Bundle Version Management (Medium Priority)

#### Modify `fetchRemoteBundleVers` in `public/game/boot.js`

Change fallback behavior (line 23-29):

```javascript
async function fetchRemoteBundleVers(settings) {
  const CACHE_KEY = '__boot_manifest_cache__';
  let appliedCache = false;
  
  // Option to always prefer remote (configurable via PATCH_MANIFEST_FORCE_REMOTE)
  const FORCE_REMOTE = window.PATCH_MANIFEST_FORCE_REMOTE === true || 
                       localStorage.getItem('__force_remote_manifest') === 'true';
  
  if (!FORCE_REMOTE) {
    // Keep existing cache logic...
  } else {
    console.log('[boot] 🔄 Forcing remote manifest fetch (debug mode)');
    // Skip cache entirely
  }
  
  // In merge section (line 53-78), add version comparison
  if (bv && typeof bv === 'object') {
    const oldCount = Object.keys(settings.bundleVers || {}).length;
    
    // ★ Force overwrite even if versions match
    Object.assign(settings.bundleVers, bv);
    
    console.log('[boot] Manifest updated:', {
      old_versions: oldCount,
      new_versions: Object.keys(settings.bundleVers).length,
      time: new Date().toISOString()
    });
  }
}
```

### Phase 5: Add Debug Logging (Low Priority)

#### Create `public/game/resource-debug.js`

```javascript
/**
 * Resource loading debug utility
 * Enable with: localStorage.setItem('__resource_debug', 'true')
 */

(function() {
  const DEBUG_ENABLED = () => localStorage.getItem('__resource_debug') === 'true';
  
  const wrapCocosLoading = () => {
    if (typeof cc === 'undefined' || !cc.AssetManager) return;
    
    const origLoadBundle = cc.AssetManager.loadBundle.bind(cc.AssetManager);
    
    cc.AssetManager.loadBundle = function(bundleName, callback) {
      if (DEBUG_ENABLED()) {
        console.log('[ResourceDebug] loadBundle:', {
          name: bundleName,
          timestamp: Date.now(),
          bundleVers: downloader.bundleVers?.[bundleName]
        });
        
        // Wrap callback to log success/failure
        const wrappedCb = (err, bundle) => {
          if (err) {
            console.error('[ResourceDebug] Bundle load FAILED:', {
              name: bundleName,
              error: err.message,
              stack: err.stack
            });
          } else {
            console.log('[ResourceDebug] Bundle loaded successfully:', {
              name: bundleName,
              size: bundle?.size,
              sceneCount: bundle?.getSceneInfo?.()?.length ?? 'N/A'
            });
          }
          callback(err, bundle);
        };
        
        return origLoadBundle(bundleName, wrappedCb);
      }
      
      return origLoadBundle(bundleName, callback);
    };
    
    console.log('[ResourceDebug] Asset Manager hooked');
  };
  
  setInterval(wrapCocosLoading, 200);
})();
```

## ✅ Testing Plan

### Test Case 1: Texture Update
1. Upload new `.png` texture to CDN (`xxz-xyzw-res.hortorgames.com`)
2. Clear browser cache completely (`Ctrl+Shift+Del`)
3. Verify `cc.macro.SUPPORT_TEXTURE_FORMATS` includes `.webp`
4. Check console: `[Resource Patch] ✅ Texture format hook installed`

### Test Case 2: Bundle Version Sync
1. Deploy new bundle version on server (`launcher: abc123`)
2. Restart game app
3. Console should show: `[boot] Manifest updated` with remote version
4. No fallback to cached bundleVers

### Test Case 3: Encrypted Resources
1. Enable encrypted launcher bundle in server manifest
2. Observe console for XXTEA decryption logs
3. Check script execution completes without errors

## 📋 Migration Checklist

- [ ] Add texture format hook to `patch.js`
- [ ] Update CDN cache control in `installRemoteAssetLoader`
- [ ] Integrate XXTEA decrypter (use naiwa reference)
- [ ] Modify `fetchRemoteBundleVers` for forced remote fetch option
- [ ] Add resource debug utilities
- [ ] Test texture updates end-to-end
- [ ] Document configuration options (`PATCH_MANIFEST_FORCE_REMOTE`, etc.)

## 🔗 References

- [`naiwa-release-main/cocos-bundle-patch.js`](file://D:\xyzw_web_helper-main\naiwa-release-main\naiwa-release-main\app\src\main\assets\renderer\cocos-bundle-patch.js)
- [`src/public/game/patch.js`](file://D:\xyzw_web_helper-main\public\game\patch.js)
- [`src/public/game/boot.js`](file://D:\xyzw_web_helper-main\public\game\boot.js)
- [`src/public/game/main.2a00e.js`](file://D:\xyzw_web_helper-main\public\game\main.2a00e.js)
