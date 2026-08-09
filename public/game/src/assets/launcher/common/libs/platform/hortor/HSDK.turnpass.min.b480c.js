// HSDK.turnpass 最小化 mock - 肝王之王 APK
// 原始文件是反外挂验证码系统，APK环境下无需此功能
window.HSDK = window.HSDK || {};
window.HSDK.turnpass = window.HSDK.turnpass || {};
window.HSDK.turnpass.init = function() {};
window.HSDK.turnpass.show = function() {};
window.HSDK.turnpass.hide = function() {};
window.HSDK.turnpass.verify = function(cb) { if (cb) cb(true); };
console.log('[HSDK.turnpass] mock 已加载');
