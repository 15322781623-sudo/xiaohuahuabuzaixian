/**
 * 咸鱼之王微信授权登录 - 代理服务器
 * 使用 MicroMessenger UA 模拟微信内置浏览器，获取二维码+UUID，轮询扫码状态
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 4567;
const WECHAT_UA = 'Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN';
const YYB_HMAC_KEY = 'X#9k$F2@mN7^pL5&jR3!wY1*Z8$Q';

// session store: uuid -> cookies
const sessions = {};

function httpReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const hdrs = {
      'User-Agent': WECHAT_UA,
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      ...opts.headers
    };
    if (opts.cookie) hdrs['Cookie'] = opts.cookie;

    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search, method: opts.method || 'GET', headers: hdrs
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const sc = res.headers['set-cookie'];
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: sc ? (Array.isArray(sc) ? sc : [sc]) : [],
          body: opts.binary ? buf : buf.toString('utf-8')
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ============================================================
// 微信二维码 + 轮询
// ============================================================

async function getQR() {
  // 应用宝授权二维码：获取 login_buffer + refreshtoken（永久登录）
  const redirectUri = encodeURIComponent('https://yybadaccess.3g.qq.com/pc_yyb/pcyyb_oauth?login_type=WX');
  const url = 'https://open.weixin.qq.com/connect/qrconnect'
    + '?appid=wxd44977328b36e647'
    + '&redirect_uri=' + redirectUri
    + '&response_type=code'
    + '&scope=snsapi_login,snsapi_runtime_pcsdk'
    + '&state=web'
    + '&fast_login=1'
    + '&self_redirect=true';

  console.log('[QR] Fetching YYB QR page...');
  const r = await httpReq(url, { headers: { 'Referer': 'https://open.weixin.qq.com/' } });

  // YYB 页面 UUID 提取：多种模式匹配
  let uuid = null;
  const patterns = [
    /\/connect\/qrcode\/([a-zA-Z0-9_-]+)/,        // src="/connect/qrcode/xxx"
    /uuid=([a-zA-Z0-9_-]+)/,                       // uuid=xxx in JS
    /uuid\s*:\s*"([^"]+)"/,                         // uuid: "xxx" (app/qrconnect 格式)
  ];
  for (const p of patterns) {
    const m = r.body.match(p);
    if (m) { uuid = m[1]; break; }
  }

  // 获取二维码图片并转为 base64 data URI
  let qrImage = null;
  if (uuid) {
    const imgUrl = 'https://open.weixin.qq.com/connect/qrcode/' + uuid;
    try {
      const imgRes = await httpReq(imgUrl, { headers: { 'Referer': 'https://open.weixin.qq.com/' }, binary: true });
      qrImage = 'data:image/png;base64,' + imgRes.body.toString('base64');
    } catch (e) {
      qrImage = imgUrl;
    }
  }

  const cookie = r.cookies.map(c => c.split(';')[0]).join('; ');
  console.log('[QR] UUID:', uuid, 'cookie:', cookie.substring(0, 40));

  if (uuid) {
    sessions[uuid] = cookie;
    return { success: true, uuid, qrImage };
  }
  return { success: false, error: 'no uuid' };
}

async function doPoll(uuid) {
  const cookie = sessions[uuid] || '';
  const url = `https://long.open.weixin.qq.com/connect/l/qrconnect?uuid=${uuid}&f=url&_=${Date.now()}`;
  const r = await httpReq(url, {
    headers: { 'Referer': 'https://open.weixin.qq.com/' },
    cookie
  });

  const b = r.body;
  let status = 'pending', code = null, nick = '';
  if (b.includes('window.wx_errcode=405')) {
    // 405 = 扫码确认成功
    const cm = b.match(/wx_redirecturl='[^']*code=([a-zA-Z0-9]+)/);
    if (cm) code = cm[1];
    const nm = b.match(/window\.wx_nickname\s*=\s*['"]([^'"]+)['"]/);
    if (nm) nick = nm[1];
    status = 'confirmed';
    delete sessions[uuid];
  }
  // 408 = 长轮询超时（等待扫码中），继续轮询
  // 无 errcode 或其他值也视为 pending
  return { status, wxCode: code, nickname: nick };
}

// ============================================================
// yybadaccess API：OAuth code → login_buffer + tokens
// ============================================================

async function exchangeCodeForLoginBuffer(code) {
  // Step 1: 调用 pcyyb_oauth（用 MicroMessenger UA，和 .so 中一致）
  console.log('[YYB] Step 1: OAuth callback (MicroMessenger UA)...');
  const oauthUrl = 'https://yybadaccess.3g.qq.com/pc_yyb/pcyyb_oauth?login_type=WX&code=' + code + '&state=web';
  const oauthRes = await httpReq(oauthUrl, {
    headers: {
      'User-Agent': WECHAT_UA,
      'Accept': 'text/html,application/json',
      'Referer': 'https://open.weixin.qq.com/'
    }
  });

  // 打印完整响应头
  console.log('[YYB] OAuth status:', oauthRes.status);
  console.log('[YYB] OAuth headers:', JSON.stringify(oauthRes.headers || {}, null, 2));
  console.log('[YYB] OAuth ALL cookies:', JSON.stringify(oauthRes.cookies));

  // 解析 cookies
  const cookieMap = {};
  oauthRes.cookies.forEach(c => {
    const kv = c.split(';')[0].split('=');
    if (kv.length >= 2) cookieMap[kv[0].trim()] = kv.slice(1).join('=').trim();
  });
  console.log('[YYB] Cookies:', Object.keys(cookieMap).join(', '));

  // 解析 OAuth 响应体，提取 listS
  let oauthData = {};
  try { oauthData = JSON.parse(oauthRes.body); } catch {}
  console.log('[YYB] OAuth response:', JSON.stringify(oauthData).substring(0, 300));

  // listS 可能在响应体、cookies 中，或需要从 accesstoken 构造
  const listS = oauthData.listS || oauthData.list_s
    || oauthData.user_info?.listS || oauthData.ext_info?.listS
    || cookieMap.list_s || cookieMap.listS || '';
  console.log('[YYB] listS:', listS ? listS.substring(0, 40) + '...' : 'NOT FOUND');

  // 从 OAuth 响应头提取信息
  const oauthNonce = (oauthRes.headers['ual-access-nonce'] || '').toString();
  const oauthTimestamp = (oauthRes.headers['ual-access-timestamp'] || '').toString();
  console.log('[YYB] OAuth nonce:', oauthNonce, 'timestamp:', oauthTimestamp);

  // ★ 签名破解成功！★
  // signature = MD5(requestBody + timestamp + "wgrdg373hy26ww2" + nonce)
  // 请求体格式: {"extInfo":{"listI":{"user_type":{"value":[0]}},"listS":{"access_token":{"value":[...]}, "unionid":{"value":[...]}, "user_id":{"value":[...]}}}}
  const SIGN_KEY = 'wgrdg373hy26ww2';
  const ts = Date.now().toString();
  const nonce = Math.floor(Math.random() * 10000).toString();

  // 构建请求体（与抓包一致）
  const reqBody = JSON.stringify({
    extInfo: {
      listI: { user_type: { value: [0] } },
      listS: {
        access_token: { value: [cookieMap.accesstoken || ''] },
        unionid: { value: [cookieMap.openid || ''] },
        user_id: { value: [cookieMap.openid || ''] }
      }
    }
  });

  // 签名 = MD5(body + timestamp + key + nonce)
  const signature = crypto.createHash('md5').update(reqBody + ts + SIGN_KEY + nonce).digest('hex');
  console.log('[YYB] Signature:', signature, 'ts:', ts, 'nonce:', nonce);

  const allCookies = Object.entries(cookieMap).map(([k,v]) => k + '=' + v).join('; ');

  // 调用 pcyyb_get_wx_login_buffer_auth
  console.log('[YYB] Step 2: Get login_buffer...');
  let bufferResult = null;
  try {
    const bufferRes = await httpReq('https://yybadaccess.3g.qq.com/pc_yyb_auth/pcyyb_get_wx_login_buffer_auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ual-access-businessid': 'pc_yyb_auth',
        'ual-access-timestamp': ts,
        'ual-access-nonce': nonce,
        'ual-access-signature': signature,
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      },
      body: reqBody
    });

    console.log('[YYB] Buffer response:', bufferRes.status, bufferRes.body.substring(0, 300));

    if (bufferRes.status === 200) {
      try { bufferResult = JSON.parse(bufferRes.body); } catch { bufferResult = { raw: bufferRes.body }; }
    } else {
      bufferResult = { error: 'status ' + bufferRes.status, body: bufferRes.body.substring(0, 300) };
    }
  } catch (e) {
    bufferResult = { error: e.message };
  }

  return {
    cookies: cookieMap,
    listS: listS,
    oauthResponse: oauthData,
    oauthHeaders: oauthRes.headers || {},
    oauthAllCookies: oauthRes.cookies,
    bufferResponse: bufferResult || { error: 'all attempts failed' },
    hasTokens: !!(cookieMap.accesstoken || cookieMap.refreshtoken || listS)
  };
}

// 用 refreshtoken 刷新获取 login_buffer
async function refreshLoginBuffer(cred) {
  console.log('[YYB] Refresh: calling pcyyb_refresh_token_auth...');

  // 尝试 refresh endpoint
  const refreshUrl = 'https://yybadaccess.3g.qq.com/pc_yyb_auth/pcyyb_refresh_token_auth';
  const cookieStr = `openid=${cred.openid}; accesstoken=${cred.accesstoken}; refreshtoken=${cred.refreshtoken}; logintype=WX; appid=wxd44977328b36e647`;

  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  // 尝试多种签名方式
  const signAttempts = [
    { key: YYB_HMAC_KEY, msg: 'pc_yyb_auth' + timestamp + nonce },
    { key: 'wgrdg373hy26ww2', msg: 'pc_yyb_auth' + timestamp + nonce },
    { key: YYB_HMAC_KEY, msg: timestamp + nonce },
    { key: 'wgrdg373hy26ww2', msg: timestamp + nonce },
  ];

  const reqBody = JSON.stringify({
    openid: cred.openid,
    accesstoken: cred.accesstoken,
    refreshtoken: cred.refreshtoken
  });

  for (let i = 0; i < signAttempts.length; i++) {
    const sig = crypto.createHmac('sha256', signAttempts[i].key).update(signAttempts[i].msg).digest('hex');
    console.log('[YYB] Refresh attempt ' + (i+1) + '...');

    try {
      const res = await httpReq(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ual-Access-Businessid': 'pc_yyb_auth',
          'Ual-Access-Timestamp': timestamp,
          'Ual-Access-Signature': sig,
          'Ual-Access-Nonce': nonce,
          'Ual-Access-Guid': 'web',
          'Ual-Access-Access-Token': cred.accesstoken,
          'Ual-Access-Openid': cred.openid,
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: reqBody
      });

      console.log('[YYB] Refresh attempt ' + (i+1) + ':', res.status, res.body.substring(0, 200));

      if (res.status === 200) {
        let result;
        try { result = JSON.parse(res.body); } catch { result = { raw: res.body }; }
        return { success: true, attempt: i+1, result };
      }
    } catch (e) {
      console.log('[YYB] Refresh attempt ' + (i+1) + ' error:', e.message);
    }
  }

  // 也尝试不带签名的 refresh
  console.log('[YYB] Refresh: trying without signature...');
  try {
    const res = await httpReq(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ual-Access-Access-Token': cred.accesstoken,
        'Ual-Access-Openid': cred.openid,
        'Cookie': cookieStr,
      },
      body: reqBody
    });
    console.log('[YYB] Refresh no-sig:', res.status, res.body.substring(0, 200));
    if (res.status === 200) {
      let result; try { result = JSON.parse(res.body); } catch { result = { raw: res.body }; }
      return { success: true, attempt: 'no-sig', result };
    }
  } catch (e) {}

  // 尝试另一个 refresh URL
  console.log('[YYB] Refresh: trying /refreshToken...');
  try {
    const res = await httpReq('https://yybadaccess.3g.qq.com/refreshToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieStr,
      },
      body: JSON.stringify({ refreshtoken: cred.refreshtoken, openid: cred.openid })
    });
    console.log('[YYB] /refreshToken:', res.status, res.body.substring(0, 200));
    if (res.status === 200) {
      let result; try { result = JSON.parse(res.body); } catch { result = { raw: res.body }; }
      return { success: true, attempt: '/refreshToken', result };
    }
  } catch (e) {}

  // 尝试 getUserInfo 验证 tokens 是否有效
  console.log('[YYB] Trying getUserInfo...');
  try {
    const res = await httpReq('https://yybadaccess.3g.qq.com/pc_yyb/pcyyb_get_user_info', {
      method: 'GET',
      headers: {
        'Cookie': cookieStr,
        'Ual-Access-Access-Token': cred.accesstoken,
        'Ual-Access-Openid': cred.openid,
      }
    });
    console.log('[YYB] getUserInfo:', res.status, res.body.substring(0, 200));
    return {
      success: false,
      userInfo: { status: res.status, body: res.body.substring(0, 500) },
      error: 'refresh failed but tokens may be valid'
    };
  } catch (e) {
    return { success: false, error: 'all refresh attempts failed: ' + e.message };
  }
}

// ============================================================
// Server
// ============================================================

const MIME = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    if (u.pathname === '/api/wechat/qr' && req.method === 'GET') {
      const r = await getQR();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r));
      return;
    }
    if (u.pathname === '/api/wechat/poll' && req.method === 'GET') {
      const uuid = u.searchParams.get('uuid');
      if (!uuid) { res.writeHead(400); res.end('{"error":"no uuid"}'); return; }
      const r = await doPoll(uuid);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r));
      return;
    }
    if (u.pathname === '/api/comb-login' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        try {
          const { url, body: reqBody, headers } = JSON.parse(Buffer.concat(chunks).toString());
          // body 已经是加密后的字符串，直接转发
          const r = await httpReq(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers },
            body: reqBody
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: r.status, body: Buffer.from(r.body, 'utf-8').toString('base64') }));
        } catch (e) {
          res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // ---- API: yybadaccess 换取 login_buffer ----
    if (u.pathname === '/api/yyb/exchange' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        try {
          const { code } = JSON.parse(Buffer.concat(chunks).toString());
          const result = await exchangeCodeForLoginBuffer(code);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // ---- API: 刷新 login_buffer ----
    if (u.pathname === '/api/yyb/refresh' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        try {
          const cred = JSON.parse(Buffer.concat(chunks).toString());
          const result = await refreshLoginBuffer(cred);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // ---- API: serverlist 代理（角色列表） ----
    if (u.pathname === '/api/serverlist' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', async () => {
        try {
          const { body: b64 } = JSON.parse(Buffer.concat(chunks).toString());
          const binaryBody = Buffer.from(b64, 'base64');
          const result = await httpReq('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'User-Agent': 'Mozilla/5.0'
            },
            body: binaryBody,
            binary: true
          });
          // 返回二进制响应的 base64
          const respB64 = result.body.toString('base64');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: result.status, body: respB64 }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    let fp = u.pathname === '/' ? '/index.html' : u.pathname;
    fp = path.join(__dirname, fp);
    if (!fp.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(fp)] || 'text/plain',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(fs.readFileSync(fp));
    } else { res.writeHead(404); res.end(); }
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
