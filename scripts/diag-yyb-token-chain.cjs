#!/usr/bin/env node
/**
 * 应用宝「获取Token」全链路逐环节排查
 * 1. /accounts            账号列表
 * 2. /wxapp/getCode       获取小程序 code
 * 3. comb-platform login  code → combUser（复刻 hortorLogin.ts 的 encodePayload）
 * 4. serverlist           bin → 角色列表
 * 5. authuser             bin → roleToken
 */
const crypto = require('crypto');

const YYB = 'http://127.0.0.1:8000';
const APPID = 'wx0840558555a454ed';

// ===== 复刻 hortorLogin.ts 的加密 =====
const cipherTable =
  "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";

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
const dealWithString = (src, key, shift) => {
  const v = src.split(''), w = key.split(''), out = new Array(v.length);
  let idx = w.length >> shift;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    out[i] = String.fromCharCode(v[i].charCodeAt(0) ^ w[idx].charCodeAt(0));
    idx++;
  }
  return out.join('');
};
// 完整三层：base64 -> XOR -> 再一次 base64（对应 hortorLogin.ts 的 encodeBase64(mid)）
// 注意：XOR 输出是 0-255 字节串，必须按 latin1/binary 方式转 base64
const encodePayload = (text) => {
  const mid = dealWithString(b64(text), getCodeKey(transCode(cipherTable, 6), 3), 1);
  return Buffer.from(mid, 'latin1').toString('base64');
};

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  // 环节0：服务健康
  try {
    const h = await (await fetch(YYB + '/health', { signal: AbortSignal.timeout(3000) })).json();
    console.log('[0] 服务健康:', JSON.stringify(h));
  } catch (e) {
    console.log('[0] ❌ 服务不可达:', e.message);
    process.exit(1);
  }

  // 环节1：账号列表
  const accResp = await (await fetch(YYB + '/accounts')).json();
  const accounts = accResp.data || [];
  console.log('[1] 账号数量:', accounts.length, accounts.map((a) => `${a.nickname}(${a.status})`).join(','));
  if (!accounts.length) {
    console.log('❌ 没有已保存账号，无法免扫码获取Token');
    process.exit(1);
  }
  const ref = accounts[0].openid;

  // 环节2：getCode
  let code;
  try {
    const r = await (await fetch(YYB + '/wxapp/getCode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, app_id: APPID }),
    })).json();
    console.log('[2] getCode 响应:', JSON.stringify(r).slice(0, 300));
    code = r?.data?.result?.code;
    if (!code) { console.log('❌ getCode 失败'); process.exit(1); }
    console.log('[2] ✅ code长度:', code.length);
  } catch (e) {
    console.log('[2] ❌ getCode 异常:', e.message);
    process.exit(1);
  }

  // 环节3：comb-platform login（mini-we）
  const payload = {
    gameId: 'xyzwprod', code, gameTp: 'minigame', version: '1.91.1-wx',
    sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
    channel: 'hortor', appFrom: 'com.tencent.mm', noLogin: '2',
    distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
    packageName: 'com.hortor.games.xyzw', tp: 'mini-we',
    signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
  };
  const encoded = encodePayload(JSON.stringify(payload));
  const loginUrl = 'https://comb-platform.hortorgames.com/comb-login-server/api/v1/login' +
    '?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0';
  let combUser;
  try {
    const resp = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
        Accept: '*/*', 'Content-Type': 'text/plain; charset=utf-8',
        Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/',
      },
      body: encoded,
    });
    const json = await resp.json();
    console.log('[3] comb-login meta:', JSON.stringify(json.meta), 'data keys:', json.data ? Object.keys(json.data) : null);
    if (json.meta?.errCode !== 0) { console.log('❌ comb-login 失败'); process.exit(1); }
    combUser = json.data?.combUser;
    if (!combUser) { console.log('❌ 响应无 combUser, data=', JSON.stringify(json.data).slice(0, 300)); process.exit(1); }
    console.log('[3] ✅ combUser 类型:', typeof combUser, '内容:', String(JSON.stringify(combUser)).slice(0, 300));
  } catch (e) {
    console.log('[3] ❌ comb-login 异常:', e.message);
    process.exit(1);
  }

  // 环节4：构造 bin → serverlist
  const binData = { platform: 'hortor', platformExt: 'mix', info: combUser, serverId: null, scene: 0, referrerInfo: '' };
  const binBuf = Buffer.from(g_utils.encode(binData, 'lx'));
  console.log('[4] bin 大小:', binBuf.length);
  try {
    const resp = await fetch('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(binBuf),
    });
    const ab = await resp.arrayBuffer();
    console.log('[4] serverlist 响应字节:', ab.byteLength);
    const m = g_utils.parse(ab);
    const d = m.getData();
    if (d && d.roles) {
      const n = Array.isArray(d.roles) ? d.roles.length : Object.keys(d.roles).length;
      console.log('[4] ✅ 角色数:', n);
    } else {
      console.log(`[4] ❌ 服务器拒绝 code=${m._raw?.code} error=${m._raw?.error}`);
    }
  } catch (e) {
    console.log('[4] ❌ serverlist 异常:', e.message);
  }

  // 环节5：authuser（带 serverId）
  try {
    const authData = { ...binData, serverId: 6562 };
    const authBuf = Buffer.from(g_utils.encode(authData, 'lx'));
    const resp = await fetch('https://xxz-xyzw.hortorgames.com/login/authuser?_seq=1', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(authBuf),
    });
    const ab = await resp.arrayBuffer();
    console.log('[5] authuser 响应字节:', ab.byteLength);
    const m = g_utils.parse(ab);
    const d = m.getData();
    if (d && d.roleToken) {
      console.log('[5] ✅ roleToken 长度:', String(d.roleToken).length);
    } else {
      console.log(`[5] ❌ 服务器拒绝 code=${m._raw?.code} error=${m._raw?.error} data=${String(JSON.stringify(d)).slice(0, 120)}`);
    }
  } catch (e) {
    console.log('[5] ❌ authuser 异常:', e.message);
  }
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
