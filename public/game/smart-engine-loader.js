// 智能引擎与资源加载器 - 完整 CDN 支持（基于 niaoge 最佳实践）
(function() {
  'use strict';
  
  // ── installRemoteAssetLoader: 将 Cocos bundle 请求路由到 CDN ──
  window.installRemoteAssetLoader = function() {
    if (typeof cc === 'undefined' || !cc.assetManager || !cc.assetManager.downloader) {
      console.warn('[SmartEngineLoader] ❌ Cocos Engine 未加载');
      return;
    }

    var downloader = cc.assetManager.downloader;
    if (downloader.__remoteAssetLoaderInstalled) {
      console.log('[SmartEngineLoader] ✅ 已安装远程加载器，跳过重复安装');
      return;
    }
    downloader.__remoteAssetLoaderInstalled = true;

    var absoluteUrlRE = /^(?:\w+:\/\/|.+\/).+/;
    var encryptedBundleRE = /^https:\/\/xxz-xyzw-res\.hortorgames\.com\/remote\/(?:game|launcher)(?:\/|$)/;
    var originalDownload = downloader.download.bind(downloader);
    var originalDownloaders = downloader._downloaders || {};
    var originalJsonDownloader = originalDownloaders['.json'];
    var originalScriptDownloader = originalDownloaders['.js'];
    var loadedScripts = Object.create(null);

    function toRemoteUrl(url) {
      var converted = window.convertAssets(url);
      if (
        typeof converted === 'string' &&
        converted === url &&
        encryptedBundleRE.test(converted) &&
        (converted.endsWith('.js') || converted.endsWith('.jsc'))
      ) {
        converted = converted.endsWith('.jsc') ? converted : converted + 'c';
      }
      return converted;
    }

    function executeScript(code, url) {
      (0, eval)(code + '\n//# sourceURL=' + url);
    }

    function downloadJson(url, options, onComplete) {
      var finalUrl = toRemoteUrl(url);
      if (originalJsonDownloader) {
        return originalJsonDownloader(finalUrl, options, onComplete);
      }

      fetch(finalUrl, { cache: 'force-cache' })
        .then(function(res) {
          if (!res.ok) {
            throw new Error('download failed: ' + finalUrl + ', status: ' + res.status);
          }
          return res.json();
        })
        .then(function(json) {
          onComplete && onComplete(null, json);
        })
        .catch(function(err) {
          onComplete && onComplete(err);
        });
    }

    function downloadScript(url, options, onComplete) {
      var finalUrl = toRemoteUrl(url);
      if (loadedScripts[finalUrl]) {
        onComplete && onComplete(null);
        return;
      }
      if (encryptedBundleRE.test(finalUrl) && finalUrl.endsWith('.jsc')) {
        window.loadJscAndDecode(finalUrl, function(code) {
          try {
            executeScript(code, finalUrl);
            loadedScripts[finalUrl] = true;
            onComplete && onComplete(null);
          } catch (err) {
            onComplete && onComplete(err);
          }
        }).catch(function(err) {
          onComplete && onComplete(err);
        });
        return;
      }

      if (originalScriptDownloader) {
        return originalScriptDownloader(finalUrl, options, onComplete);
      }

      var script = document.createElement('script');
      script.async = options && options.async;
      script.src = finalUrl;
      script.onload = function() {
        script.parentNode && script.parentNode.removeChild(script);
        loadedScripts[finalUrl] = true;
        onComplete && onComplete(null);
      };
      script.onerror = function() {
        script.parentNode && script.parentNode.removeChild(script);
        onComplete && onComplete(new Error('load script failed: ' + finalUrl));
      };
      document.body.appendChild(script);
    }

    function downloadBundle(url, options, onComplete) {
      var bundleName = cc.path.basename(url);
      var base = absoluteUrlRE.test(url) ? url : 'assets/' + bundleName;
      var remoteBase = toRemoteUrl(base);
      var version = options.version || (downloader.bundleVers && downloader.bundleVers[bundleName]);
      if (!version && bundleName !== cc.AssetManager.BuiltinBundleName.INTERNAL) {
        onComplete && onComplete(new Error('[remoteAssets] missing bundle version: ' + bundleName));
        return;
      }
      var versionPart = version ? version + '.' : '';
      var finished = 0;
      var error = null;
      var config = null;

      function done(err) {
        if (err) {
          error = err;
        }
        finished++;
        if (finished === 2) {
          onComplete && onComplete(error, config);
        }
      }

      downloadJson(base + '/config.' + versionPart + 'json', options, function(err, data) {
        if (err) {
          error = err;
        }
        if (data) {
          data.base = remoteBase + '/';
          config = data;
        }
        done(err);
      });

      downloadScript(base + '/index.' + versionPart + 'js', options, done);
    }

    downloader.download = function(id, url, ext, options, onComplete) {
      return originalDownload(id, toRemoteUrl(url), ext, options, onComplete);
    };

    downloader.register({
      '.js': downloadScript,
      bundle: downloadBundle
    });

    console.log('[SmartEngineLoader] ✅ CDN 资源加载器已注册');
  };

  // ── main.2a00e.js 补丁脚本注入 ──
  window.executeScriptQueue = function() {
    if (typeof window.QueuedScripts === 'undefined') return;
    try {
      console.log('[SmartEngineLoader] 🔧 执行脚本队列:', QueuedScripts.length, '条');
      for (var i = 0; i < QueuedScripts.length; i++) {
        var fn = QueuedScripts[i];
        if (fn) fn();
      }
      QueuedScripts.length = 0; // 清空队列
    } catch(e) {
      console.warn('[SmartEngineLoader] ⚠ 脚本队列执行失败:', e.message);
    }
  };

  // ── 步骤 1: 尝试从 localStorage 读取引擎缓存 ──
  var LOCAL_FILE = 'cocos2d-js-min.a5841.js';
  var CACHE_KEY = '__cocos_engine__' + LOCAL_FILE;

  function loadFromCache() {
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      if (cached && cached.length > 100000) {
        console.log('[SmartEngineLoader] ⚡ 引擎缓存命中 (' + (cached.length/1024).toFixed(0) + 'KB), 跳过网络下载');
        document.write('<script>' + cached + '<\/script>');
        return true;
      }
    } catch(e) {}
    return false;
  }

  // ── 步骤 2: 兜底 - 直接用本地文件加载 ──
  function loadFromLocal(callback) {
    console.log('[SmartEngineLoader] 🔄 使用本地引擎文件:', LOCAL_FILE);
    document.write('<script src="' + LOCAL_FILE + '" charset="utf-8"/><\/script>');
    callback && callback();
  }

  // ── 执行加载流程 ──
  if (!loadFromCache()) {
    loadFromLocal(function() {
      console.log('[SmartEngineLoader] 🎯 引擎加载完成');
    });
  } else {
    console.log('[SmartEngineLoader] ⚡ 直接从缓存注入，无需网络请求');
  }
})();
