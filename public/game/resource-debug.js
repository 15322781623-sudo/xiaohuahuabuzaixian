/**
 * Resource Debug Utility -naiwa style debugging
 * 
 * Usage:
 * 1. Enable: localStorage.setItem('__resource_debug', 'true')
 * 2. Reload game page
 * 3. Check console for detailed resource loading logs
 */

(function() {
  'use strict';
  
  const DEBUG_ENABLED = () => localStorage.getItem('__resource_debug') === 'true';
  const TAG = '[ResourceDebug]';
  
  /**
   * Wrap AssetManager loadBundle to track bundle downloads
   */
  function wrapBundleLoading() {
    if (typeof cc === 'undefined' || !cc.AssetManager) {
      return;
    }
    
    if (cc.AssetManager.__wrapped__) {
      return; // Already wrapped
    }
    cc.AssetManager.__wrapped__ = true;
    
    const origLoadBundle = cc.AssetManager.loadBundle.bind(cc.AssetManager);
    
    cc.AssetManager.loadBundle = function(bundleName, callback) {
      if (DEBUG_ENABLED()) {
        const startTime = Date.now();
        
        // Log start
        console.log(TAG, `📦 Loading bundle:`, {
          name: bundleName,
          version: this.bundleVers?.[bundleName],
          timestamp: new Date().toISOString()
        });
        
        // Wrap success callback
        const successCb = (err, bundle) => {
          const duration = Date.now() - startTime;
          
          if (err) {
            console.error(TAG, `❌ Bundle load FAILED:`, {
              name: bundleName,
              error: err.message,
              stack: err.stack,
              duration_ms: duration
            });
          } else {
            console.log(TAG, `✅ Bundle loaded successfully:`, {
              name: bundleName,
              duration_ms: duration,
              sceneCount: bundle.getSceneInfo ? bundle.getSceneInfo().length : 'N/A',
              size: bundle.size || 'Unknown'
            });
          }
          
          callback(err, bundle);
        };
        
        return origLoadBundle.call(this, bundleName, successCb);
      }
      
      return origLoadBundle.call(this, bundleName, callback);
    };
    
    console.log(TAG, 'AssetManager bundler hooked');
  }
  
  /**
   * Wrap downloadFile to track texture/image downloads
   */
  function wrapDownloadFile() {
    if (typeof cc === 'undefined' || !cc.assetManager || !cc.assetManager.downloader) {
      return;
    }
    
    const downloader = cc.assetManager.downloader;
    if (downloader._downloadFileWrapped) {
      return; // Already wrapped
    }
    downloader._downloadFileWrapped = true;
    
    const origDownloadFile = downloader.downloadFile.bind(downloader);
    
    downloader.downloadFile = function(url, options, onProgress) {
      if (DEBUG_ENABLED() && /\.(png|jpg|jpeg|webp|ktx|astc|pvr)$/.test(url)) {
        const ext = url.split('.').pop().toLowerCase();
        console.log(TAG, `🖼️ Downloading texture:`, {
          url: url.substring(0, 100) + '...',
          format: ext,
          timestamp: new Date().toISOString()
        });
        
        const originalCallback = onProgress;
        onProgress = (percentage, completed, total) => {
          if (originalCallback) originalCallback(percentage, completed, total);
          
          if (completed >= total) {
            console.log(TAG, `🖼️ Texture downloaded complete:`, {
              url: url.substring(0, 80) + '...',
              format: ext,
              size_bytes: Math.round((percentage / total) * 1000),
              duration_ms: Date.now() % 1000
            });
          }
        };
      }
      
      return origDownloadFile(url, options, onProgress);
    };
    
    console.log(TAG, 'Texture downloader hooked');
  }
  
  /**
   * Monitor CC.macro.SUPPORT_TEXTURE_FORMATS
   */
  function monitorTextureFormats() {
    if (typeof window.cc === 'undefined' || !window.cc.macro) {
      setTimeout(monitorTextureFormats, 200);
      return;
    }
    
    const formats = window.cc.macro.SUPPORT_TEXTURE_FORMATS;
    console.log(TAG, `🖼️ Current texture formats:`, formats.join(', '));
    console.log(TAG, `Supported: ${formats.includes('webp') ? 'WebP ✅' : 'WebP ❌'}`);
    console.log(TAG, `Supported: ${formats.includes('ktx') ? 'KTX ✅' : 'KTX ❌'}`);
  }
  
  /**
   * Check manifest version consistency
   */
  async function checkManifestVersion() {
    if (!DEBUG_ENABLED()) return;
    
    try {
      const xhr = new XMLHttpRequest();
      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', '/api/manifest?platform=wx&version=2.43.3-wx', false);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = reject;
        xhr.timeout = 5000;
        xhr.send('');
      });
      
      const data = JSON.parse(response);
      const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      const remoteVers = body.bundleVers;
      
      if (remoteVers && window._CCSettings?.bundleVers) {
        console.log(TAG, `📊 Manifest Version Comparison:`);
        
        let staleBundles = [];
        for (const key in remoteVers) {
          const localVer = window._CCSettings.bundleVers[key];
          if (localVer !== remoteVers[key]) {
            staleBundles.push({
              bundle: key,
              local: localVer || 'MISSING',
              remote: remoteVers[key]
            });
            console.warn(TAG, `⚠️ ${key} has different versions!`, {
              local: localVer,
              remote: remoteVers[key]
            });
          }
        }
        
        if (staleBundles.length > 0) {
          console.log(TAG, `Stale bundles found: ${staleBundles.length}`, staleBundles);
        } else {
          console.log(TAG, `✅ All bundle versions are current`);
        }
      }
    } catch (err) {
      console.warn(TAG, 'Failed to check manifest:', err);
    }
  }
  
  /**
   * Public API
   */
  window.ResourceDebug = {
    enable: () => {
      localStorage.setItem('__resource_debug', 'true');
      console.log(TAG, 'Resource debug enabled - reload game');
    },
    disable: () => {
      localStorage.removeItem('__resource_debug');
      console.log(TAG, 'Resource debug disabled');
    },
    forceRefresh: () => {
      localStorage.setItem('__force_remote_manifest', 'true');
      console.log(TAG, 'Force refresh mode enabled - reload game');
    },
    clearForceRefresh: () => {
      localStorage.removeItem('__force_remote_manifest');
      console.log(TAG, 'Force refresh mode cleared');
    },
    check: checkManifestVersion
  };
  
  // Auto-initialize when engine ready
  setInterval(() => {
    if (DEBUG_ENABLED()) {
      wrapBundleLoading();
      wrapDownloadFile();
      
      if (typeof window.cc !== 'undefined' && window.cc.macro) {
        monitorTextureFormats();
        checkManifestVersion();
      }
    }
  }, 200);
  
  console.log(TAG, 'Resource debug utilities initialized');
})();
