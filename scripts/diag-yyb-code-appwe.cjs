#!/usr/bin/env node
/**
 * 把应用宝 getCode 拿到的 code 走 app-we（微信扫码）通道送 comb-login，
 * 成功后构造 bin → serverlist → authuser，验证能否获取角色/Token。
 */
const YYB = 'http://127.0.0.1:8000';
const APPID = 'wx0840558555a454ed';

// ===== 三层加密（base64 -> XOR -> base64），与 hortorLogin.ts 一致 =====
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const cipherTable = src.match(/cipherTable =\s*"([^"]+)"/)[1];

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const transCode = (str, times) => {
  if (times <= 0) return str;
  const half = Math.floor(str.length / 2);
  return transCode(str.substring(half), times - 1) + transCode(str.substring(0, half), times - 1);
};
const getCodeKey = (str, step) => {
  const out = [];
  for (let i = 0; i < Math.floor(str.length / step); i++) out.push(str[i * step]);
  return out.join('');
};
const dealWithString = (srcStr, key, shift) => {
  const v = srcStr.split(''), w = key.split(''), out = new Array(v.length);
  let idx = w.length >> shift;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    out[i] = String.fromCharCode(v[i].charCodeAt(0) ^ w[idx].charCodeAt(0));
    idx++;
  }
  return out.join('');
};
const encodePayload = (text) => {
  const mid = dealWithString(b64(text), getCodeKey(transCode(cipherTable, 6), 3), 1);
  return Buffer.from(mid, 'latin1').toString('base64');
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
  Accept: '*/*', 'Content-Type': 'text/plain; charset=utf-8',
  Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/',
};

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  // 1. 取新鲜 code
  const r = await (await fetch(YYB + '/wxapp/getCode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'owNAX6r5qZdH6omhKvsN0hJA7jF4', app_id: APPID }),
  })).json();
  const code = r?.data?.result?.code;
  if (!code) { console.log('❌ getCode 失败:', JSON.stringify(r).slice(0, 200)); process.exit(1); }
  console.log('[1] code =', code);

  // 2. app-we 通道 comb-login（报文与 hortorLogin.ts 的 app-we 分支完全一致）
  const payload = {
    gameId: 'xyzwapp', code, gameTp: 'app',
    sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
    channel: 'android', appFrom: 'com.tencent.mm', noLogin: '2',
    distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
    packageName: 'com.hortor.games.xyzw', tp: 'app-we',
    signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
  };
  const url = 'https://comb-platform.hortorgames.com/comb-login-server/api/v1/login' +
    '?gameId=xyzwapp&timestamp=' + Date.now() +
    '&version=android-4.2.1-cn-release&cryptVersion=1.1.0' +
    '&gameTp=app&system=android&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026' +
    '&packageName=com.hortorgames.xyzw';
  const resp = await fetch(url, { method: 'POST', headers: HEADERS, body: encodePayload(JSON.stringify(payload)) });
  const json = await resp.json();
  console.log('[2] app-we comb-login meta:', JSON.stringify(json.meta));
  if (json.meta?.errCode !== 0) {
    console.log('❌ app-we 通道拒绝该 code（符合预期：wx.login code 属于小游戏 appid，无法在开放平台通道换取凭证）');
    process.exit(1);
  }
  const combUser = json.data?.combUser;
  console.log('[2] ✅ combUser:', String(JSON.stringify(combUser)).slice(0, 300));

  // 3. bin → serverlist
  const binData = { platform: 'hortor', platformExt: 'mix', info: combUser, serverId: null, scene: 0, referrerInfo: '' };
  const binBuf = Buffer.from(g_utils.encode(binData, 'lx'));
  const slResp = await fetch('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(binBuf),
  });
  const m = g_utils.parse(await slResp.arrayBuffer());
  const d = m.getData();
  if (d && d.roles) {
    const roles = Array.isArray(d.roles) ? d.roles : Object.values(d.roles);
    console.log('[3] ✅ 角色数:', roles.length);
    for (const role of roles.slice(0, 5)) console.log('   -', JSON.stringify(role).slice(0, 160));
  } else {
    console.log(`[3] ❌ 服务器拒绝 code=${m._raw?.code} error=${m._raw?.error}`);
  }
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
