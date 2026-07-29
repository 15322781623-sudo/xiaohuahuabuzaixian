// 排查脚本：验证游戏服务器 WS 握手是否按 Origin 拒绝（APK WebView Origin 为 https://localhost）
const https = require('https');
const crypto = require('crypto');

const HOST = 'xxz-xyzw.hortorgames.com';
const PATH = '/agent?p=test&e=x&lang=chinese';

function tryHandshake(origin) {
  return new Promise((resolve) => {
    const key = crypto.randomBytes(16).toString('base64');
    const headers = {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': key,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/70.0.3538.110 Mobile Safari/537.36',
    };
    if (origin) headers['Origin'] = origin;

    const req = https.request({ host: HOST, path: PATH, headers, timeout: 10000 });
    req.on('upgrade', (res) => {
      resolve({ origin: origin || '(无Origin)', result: `✅ 101 握手成功 (server: ${res.headers.server || '?'})` });
      res.socket.destroy();
    });
    req.on('response', (res) => {
      resolve({ origin: origin || '(无Origin)', result: `❌ HTTP ${res.statusCode} ${res.statusMessage}` });
      res.destroy();
    });
    req.on('timeout', () => { req.destroy(); resolve({ origin: origin || '(无Origin)', result: '❌ 超时(10s无响应)' }); });
    req.on('error', (e) => resolve({ origin: origin || '(无Origin)', result: `❌ 错误: ${e.message}` }));
    req.end();
  });
}

(async () => {
  const origins = [
    null,
    'https://localhost',        // Capacitor APK WebView 默认 Origin
    'http://localhost',         // cleartext 场景
    'capacitor://localhost',    // iOS/旧版 scheme
    'https://xxz-xyzw.hortorgames.com', // 官方同源
  ];
  for (const o of origins) {
    const r = await tryHandshake(o);
    console.log(`${String(r.origin).padEnd(36)} => ${r.result}`);
  }
})();
