// resource-patch.js - 强制所有 bundle 从 CDN 加载
// ★ v3.0: Cocos Bundle Patch - 直接拦截 cc.assetManager.loadBundle 和 downloadFile
//   不受 convertAssets 包装逻辑影响，优先于 installRemoteAssetLoader
// 借鉴 aiwa-release/naiwa-release 经验实现
(function() {
  'use strict';
  
  console.log('[ResourcePatch] 安装 Bundle Patch...');
  
  const CDN_BASE = "https://xxz-xyzw-res.hortorgames.com/remote/";
  
  // ★ 等待 cc 对象就绪
  if (!window.cc) {
    Object.defineProperty(window, 'cc', {
      configurable: true,
      set: function(ccObj) {
        installBundlePatch(ccObj);
        Object.defineProperty(window, 'cc', {
          configurable: true,
          writable: true,
          value: ccObj
        });
      }
    });
  } else {
    setTimeout(function() { installBundlePatch(window.cc); }, 100);
  }
  
  function installBundlePatch(cc) {
    // 等待 assetManager 就绪
    setTimeout(function() {
      if (!cc.assetManager) {
        console.warn('[ResourcePatch] AssetManager not ready, retrying...');
        return installBundlePatch(cc);
      }
      
      console.log('[ResourcePatch] CC AssetManager detected, patching...');
      
      var am = cc.assetManager;
      var origLoadBundle = am.loadBundle.bind(am);
      
      // ★ 包装 loadBundle - 强制所有 bundles 从 CDN 加载（排除 internal/main）
      am.loadBundle = function(bundleName, callback, userObject) {
        if (typeof bundleName === 'string' && 
            !bundleName.startsWith('http') && 
            !['internal', 'main'].includes(bundleName)) {
          
          // ★ 强制使用 CDN 路径（internal 除外！）
          var cdnUrl = CDN_BASE + bundleName;
          console.log('[ResourcePatch] Converting bundle:', bundleName, '→', cdnUrl);
          
          // 传递版本信息
          var options = null;
          if (am.bundleVers && am.bundleVers[bundleName]) {
            options = {version: am.bundleVers[bundleName]};
          }
          
          origLoadBundle(cdnUrl, callback, userObject);
        } else {
          // 其他情况（如 internal/main bundle）使用原始本地逻辑
          console.log('[ResourcePatch] Keeping bundle local:', bundleName);
          origLoadBundle(bundleName, callback, userObject);
        }
      };
      
      // ★ 同时包装 downloadFile - 处理文件级下载
      var origDownload = am.downloader.download.bind(am.downloader);
      am.downloader.download = function(id, url, ext, options, onComplete) {
        if (typeof url === 'string' && url.startsWith('assets/')) {
          url = CDN_BASE + url.slice(7); // assets/ -> remote/
          console.log('[ResourcePatch] Converting file:', id, url);
        }
        origDownload(id, url, ext, options, onComplete);
      };
      
      console.log('[ResourcePatch] ✅ Bundle patch installed successfully!');
      console.log('[ResourcePatch] ✓ Internal bundle preserved - will use local assets/internal/...');
      console.log('[ResourcePatch] ✓ All remote bundles will load from CDN');
    }, 200);
  }
})();
