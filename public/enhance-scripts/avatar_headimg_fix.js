// ==UserScript==
// @name 头像更换兼容补丁
// @run-at document-end
// @featureKey avatar_headimg_fix
// @description 修复 H5 环境下游戏自带更换头像入口的版本拦截与图库选择桥接
// ==/UserScript==

(function () {
    if (window.__xingchiAvatarHeadImgFixInstalled) return;
    window.__xingchiAvatarHeadImgFixInstalled = true;

    var PATCH_INTERVAL_MS = 500;
    var MAX_PATCH_ATTEMPTS = 120;
    var attempts = 0;
    var originalModuleGetClientVersion = null;

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[AvatarHeadImgFix]');
            console.log.apply(console, args);
        } catch (_) {}
    }

    function getRequire() {
        return typeof window.__require === 'function' ? window.__require : null;
    }

    function getModule(name) {
        try {
            var req = getRequire();
            return req ? req(name) : null;
        } catch (_) {
            return null;
        }
    }

    function resolveClientVersion() {
        try {
            if (originalModuleGetClientVersion) {
                var v = originalModuleGetClientVersion();
                if (v && typeof v.then === 'function') return v;
                if (v) return String(v);
            }
        } catch (_) {}
        var candidates = [
            window.GAME_VERSION,
            window.gameVersion,
            window.__GAME_VERSION__,
            window.__gameVersion
        ];
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i]) return String(candidates[i]);
        }
        return '';
    }

    function patchVersionBridge() {
        var pm = getModule('PlatformManager');
        if (!originalModuleGetClientVersion && pm && typeof pm.getClientVersion === 'function') {
            originalModuleGetClientVersion = function () { return pm.getClientVersion(); };
        }

        var instance = pm && pm.PlatformManager && pm.PlatformManager.instance;
        if (instance) {
            instance.getClientVersion = function () { return Promise.resolve(resolveClientVersion()); };
        }
    }

    function patchPlayerInfoDialog() {
        var module = getModule('PlayerInfoDialog');
        if (!module) return false;

        var patched = false;
        ['PlayerInfoDialog', 'PlayerInfoTopDialog'].forEach(function (key) {
            var proto = module[key] && module[key].prototype;
            if (!proto || typeof proto._isNeedUpgrade !== 'function') return;
            if (proto._isNeedUpgrade.__xingchiAvatarPatched) {
                patched = true;
                return;
            }
            var original = proto._isNeedUpgrade;
            proto._isNeedUpgrade = function () { return false; };
            proto._isNeedUpgrade.__xingchiAvatarPatched = true;
            proto.__xingchiAvatarOriginalIsNeedUpgrade = original;
            patched = true;
        });
        return patched;
    }

    function makeSquareBase64(img, size) {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        var width = img.naturalWidth || img.width;
        var height = img.naturalHeight || img.height;
        var side = Math.min(width, height);
        var sx = Math.max(0, (width - side) / 2);
        var sy = Math.max(0, (height - side) / 2);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', 0.86).split(',')[1] || '';
    }

    function chooseImage(sizes) {
        return new Promise(function (resolve, reject) {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
            document.body.appendChild(input);

            input.onchange = function () {
                var file = input.files && input.files[0];
                clearTimeout(cleanupTimer);
                try { document.body.removeChild(input); } catch (_) {}
                if (!file) {
                    reject('no file');
                    return;
                }

                var reader = new FileReader();
                reader.onload = function () {
                    var img = new Image();
                    img.onload = function () {
                        try {
                            var firstSize = sizes && sizes[0] ? sizes[0] : 512;
                            var secondSize = sizes && sizes[1] ? sizes[1] : 98;
                            resolve({ base64s: [makeSquareBase64(img, firstSize), makeSquareBase64(img, secondSize)] });
                        } catch (e) {
                            reject(e && e.message ? e.message : e);
                        }
                    };
                    img.onerror = function () { reject('image load fail'); };
                    img.src = reader.result;
                };
                reader.onerror = function () { reject('read fail'); };
                reader.readAsDataURL(file);
            };

            // 用户取消文件选择时 onchange 不触发，input 会残留 DOM；监听 cancel 事件并设置兜底定时清理
            var cleanupTimer = setTimeout(function () {
                try { document.body.removeChild(input); } catch (_) {}
            }, 120000);
            input.addEventListener('cancel', function () {
                clearTimeout(cleanupTimer);
                try { document.body.removeChild(input); } catch (_) {}
                reject('cancel');
            });

            input.click();
        });
    }

    function patchChooseImage() {
        var pm = getModule('PlatformManager');
        var instance = pm && pm.PlatformManager && pm.PlatformManager.instance;
        if (!instance) return false;
        if (instance.chooseImage && instance.chooseImage.__xingchiAvatarPatched) return true;
        instance.chooseImage = function (sizes) { return chooseImage(sizes); };
        instance.chooseImage.__xingchiAvatarPatched = true;
        instance.readImgFile = function () { return Promise.resolve(''); };
        return true;
    }

    function applyPatch() {
        attempts++;
        patchVersionBridge();
        var dialogReady = patchPlayerInfoDialog();
        var pickerReady = patchChooseImage();
        if (dialogReady && pickerReady) {
            log('ready');
            return;
        }
        if (attempts < MAX_PATCH_ATTEMPTS) setTimeout(applyPatch, PATCH_INTERVAL_MS);
    }

    setTimeout(applyPatch, 8000);
})();
