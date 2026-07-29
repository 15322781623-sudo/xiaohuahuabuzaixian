// 本地资源优先加载 (DDS 贴图) — 注入到 game.html 运行
// 依赖父页面(GameLogin.vue)注入到本窗口的:
//   window.__localResProvider = { has(uuid), read(uuid)=>Promise<ArrayBuffer>, count }
//   window.__localResConfig   = { enabled: boolean, mode: 'default'|'dds' }
// 原理: 包装 cc.assetManager.downloader.download，命中本地 asar 索引的贴图请求
//       读取 DDS(DXT1/DXT5) → 软解码为 RGBA → PNG blob URL → 交回原始下载管线
//       任何异常均回退网络下载，不影响游戏正常运行
(function () {
  'use strict';
  if (window.__localResDdsInstalled) return;
  window.__localResDdsInstalled = true;
  var TAG = '[本地资源]';
  var IMG_EXT = { '.png': 1, '.jpg': 1, '.jpeg': 1, '.webp': 1 };
  // 匹配 Cocos native 资源 URL: .../native/xx/<uuid>.<hash>.<ext>
  var NATIVE_RE = /\/native\/[0-9a-zA-Z]{2}\/([^./]+)\.[^/]*$/;
  var urlCache = Object.create(null); // uuid → blob URL（会话级缓存，命中复用免重复解码）
  var hitCount = 0;

  // ---- DXT1/DXT5 (BC1/BC3) 软解码 ----
  function c565(v, pal, i) {
    var r = (v >> 11) & 31, g = (v >> 5) & 63, b = v & 31;
    pal[i] = (r << 3) | (r >> 2);
    pal[i + 1] = (g << 2) | (g >> 4);
    pal[i + 2] = (b << 3) | (b >> 2);
  }

  function decodeDXT(u8, off, w, h, dxt5) {
    var out = new Uint8ClampedArray(w * h * 4);
    var bw = (w + 3) >> 2, bh = (h + 3) >> 2;
    var pal = new Uint8Array(16);   // 4色 RGBA 调色板
    var aPal = new Uint8Array(8);   // DXT5 alpha 调色板
    var aVals = new Uint8Array(16); // 当前块 16 像素 alpha
    var p = off, k, bits, nbits, bytePos, vi;
    for (var by = 0; by < bh; by++) {
      for (var bx = 0; bx < bw; bx++) {
        if (dxt5) {
          var a0 = u8[p], a1 = u8[p + 1];
          aPal[0] = a0; aPal[1] = a1;
          if (a0 > a1) {
            for (k = 1; k < 7; k++) aPal[k + 1] = ((7 - k) * a0 + k * a1 + 3) / 7 | 0;
          } else {
            for (k = 1; k < 5; k++) aPal[k + 1] = ((5 - k) * a0 + k * a1 + 2) / 5 | 0;
            aPal[6] = 0; aPal[7] = 255;
          }
          // 48bit 索引，3bit/像素，小端逐字节取位
          bits = 0; nbits = 0; bytePos = p + 2;
          for (vi = 0; vi < 16; vi++) {
            while (nbits < 3) { bits |= u8[bytePos++] << nbits; nbits += 8; }
            aVals[vi] = aPal[bits & 7];
            bits >>>= 3; nbits -= 3;
          }
          p += 8;
        }
        var c0 = u8[p] | (u8[p + 1] << 8), c1 = u8[p + 2] | (u8[p + 3] << 8);
        c565(c0, pal, 0); c565(c1, pal, 4);
        pal[3] = 255; pal[7] = 255; pal[11] = 255; pal[15] = 255;
        if (!dxt5 && c0 <= c1) {
          // DXT1 3色+透明模式
          pal[8] = (pal[0] + pal[4]) >> 1; pal[9] = (pal[1] + pal[5]) >> 1; pal[10] = (pal[2] + pal[6]) >> 1;
          pal[12] = 0; pal[13] = 0; pal[14] = 0; pal[15] = 0;
        } else {
          pal[8] = (2 * pal[0] + pal[4] + 1) / 3 | 0; pal[9] = (2 * pal[1] + pal[5] + 1) / 3 | 0; pal[10] = (2 * pal[2] + pal[6] + 1) / 3 | 0;
          pal[12] = (pal[0] + 2 * pal[4] + 1) / 3 | 0; pal[13] = (pal[1] + 2 * pal[5] + 1) / 3 | 0; pal[14] = (pal[2] + 2 * pal[6] + 1) / 3 | 0;
        }
        var idxBits = (u8[p + 4] | (u8[p + 5] << 8) | (u8[p + 6] << 16) | (u8[p + 7] << 24)) >>> 0;
        p += 8;
        for (var py = 0; py < 4; py++) {
          var y = (by << 2) + py;
          if (y >= h) continue;
          for (var px = 0; px < 4; px++) {
            var x = (bx << 2) + px;
            if (x >= w) continue;
            var ti = (py << 2) + px;
            var ci = (idxBits >>> (ti << 1)) & 3;
            var o = (y * w + x) << 2;
            out[o] = pal[ci * 4];
            out[o + 1] = pal[ci * 4 + 1];
            out[o + 2] = pal[ci * 4 + 2];
            out[o + 3] = dxt5 ? aVals[ti] : pal[ci * 4 + 3];
          }
        }
      }
    }
    return out;
  }

  function decodeDDS(buffer) {
    var u8 = new Uint8Array(buffer);
    if (u8.length < 128 || u8[0] !== 0x44 || u8[1] !== 0x44 || u8[2] !== 0x53 || u8[3] !== 0x20) {
      throw new Error('非DDS文件');
    }
    var dv = new DataView(buffer);
    var h = dv.getUint32(12, true), w = dv.getUint32(16, true);
    var fourCC = String.fromCharCode(u8[84], u8[85], u8[86], u8[87]);
    if (fourCC !== 'DXT5' && fourCC !== 'DXT1') throw new Error('不支持的DDS格式: ' + fourCC);
    var rgba = decodeDXT(u8, 128, w, h, fourCC === 'DXT5');
    return { width: w, height: h, rgba: rgba };
  }

  // DDS → PNG blob URL（交回原始下载管线，缓存/重试/解析行为与网络资源一致）
  function ddsToBlobUrl(buffer) {
    return new Promise(function (resolve, reject) {
      try {
        var img = decodeDDS(buffer);
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').putImageData(new ImageData(img.rgba, img.width, img.height), 0, 0);
        canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error('toBlob失败'));
          resolve(URL.createObjectURL(blob));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    });
  }

  function install() {
    var provider = window.__localResProvider;
    if (!provider) return false;
    if (typeof cc === 'undefined' || !cc.assetManager || !cc.assetManager.downloader) return false;
    var dl = cc.assetManager.downloader;
    if (dl.__localResDdsHooked) return true;
    dl.__localResDdsHooked = true;
    var orig = dl.download.bind(dl);
    dl.download = function (id, url, ext, options, onComplete) {
      try {
        var cfg = window.__localResConfig || {};
        if (cfg.enabled && cfg.mode === 'dds' && IMG_EXT[ext] && typeof url === 'string') {
          var m = NATIVE_RE.exec(url);
          var uuid = m && m[1];
          if (uuid && provider.has(uuid)) {
            var cached = urlCache[uuid];
            if (cached) return orig(id, cached, ext, options, onComplete);
            provider.read(uuid)
              .then(ddsToBlobUrl)
              .then(function (blobUrl) {
                urlCache[uuid] = blobUrl;
                hitCount++;
                if (hitCount <= 3 || hitCount % 500 === 0) console.log(TAG, '✅ 本地贴图命中 x' + hitCount);
                orig(id, blobUrl, ext, options, onComplete);
              })
              .catch(function (e) {
                console.warn(TAG, '本地贴图加载失败, 回退网络:', uuid, e && e.message);
                orig(id, url, ext, options, onComplete);
              });
            return;
          }
        }
      } catch (e) { /* 任何异常回退原始下载 */ }
      return orig(id, url, ext, options, onComplete);
    };
    console.log(TAG, '✅ DDS 本地贴图拦截已安装, 索引条目:', provider.count || 0);
    return true;
  }

  // 引擎与 provider 可能晚于脚本就绪，轮询安装（最长 2 分钟）
  if (!install()) {
    var tries = 0;
    var timer = setInterval(function () {
      if (install() || ++tries > 240) clearInterval(timer);
    }, 500);
  }
})();
