#!/usr/bin/env node
/**
 * 应用宝 mini-we 登录报文探测脚本
 * 用法: node scripts/probe-yyb-login.cjs <variant>
 * 每次运行从 yyb-go 取一个全新的 wx.login code，按指定变体请求 hortor 登录并打印完整响应
 */
const fs = require('fs');
const path = require('path');

const YYB = 'http://127.0.0.1:8000';
const APP_ID = 'wx0840558555a454ed';
const HORTOR = 'https://comb-platform.hortorgames.com';

// ---------- 从 hortorLogin.ts 提取 cipherTable ----------
const tsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const m = tsSrc.match(/cipherTable\s*=\s*\n?\s*"([^"]+)"/);
if (!m) { console.error('无法提取 cipherTable'); process.exit(1); }
const cipherTable = m[1];

// ---------- 加密逻辑（与 hortorLogin.ts 一致） ----------
const encodeBase64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const rightSide = (s) => s.substring(Math.floor(s.length / 2));
const leftSide = (s) => s.substring(0, Math.floor(s.length / 2));
const transCode = (str, times) => {
  if (times <= 0) return str;
  if (str.length % 2 !== 0) return null;
  const r = transCode(rightSide(str), times - 1);
  const l = transCode(leftSide(str), times - 1);
  if (!r || !l) return null;
  return r + l;
};
const getCodeKey = (str, step) => {
  const chars = str.split('');
  const out = [];
  const count = Math.floor(str.length / step);
  for (let i = 0; i < count; i++) out.push(chars[i * step]);
  return out.join('');
};
const dealWithString = (src, key, shift) => {
  const v = src.split('');
  const w = key.split('');
  const out = new Array(v.length);
  let idx = w.length >> shift;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    out[i] = String.fromCharCode(v[i].charCodeAt(0) ^ w[idx].charCodeAt(0));
    idx++;
  }
  return out.join('');
};
const encodePayload = (text) => {
  const b64 = encodeBase64(text);
  const shuffled = transCode(cipherTable, 6);
  const key = getCodeKey(shuffled, 3);
  const mid = dealWithString(b64, key, 1);
  return Buffer.from(mid, 'binary').toString('base64');
};

// ---------- 登录变体 ----------
// 真实抓包（爱坤之家逆向文章）：小游戏 query + 应用宝 app-we body
const MINI_QUERY = () =>
  '?gameId=xyzwprod&gameTp=minigame&system=android' +
  '&version=1.91.1-wx&loginTag=code&cryptVersion=1.1.0';

const variants = {
  // K: J 但 body 只保留 version（去掉 gameVersion），验证最小必要字段
  K: {
    payload: (code) => ({
      gameId: 'xyzwprod',
      code,
      gameTp: 'minigame',
      version: '1.91.1-wx',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'com.hortor.games.xyzw',
      tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: () =>
      '?gameId=xyzwprod&gameTp=minigame&system=android' +
      '&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0',
  },
  // J: mini-we body 补齐 version/gameVersion 字段
  J: {
    payload: (code) => ({
      gameId: 'xyzwprod',
      code,
      gameTp: 'minigame',
      version: '1.91.1-wx',
      gameVersion: '1.91.1-wx',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'com.hortor.games.xyzw',
      tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: () =>
      '?gameId=xyzwprod&gameTp=minigame&system=android' +
      '&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0',
  },
  // H: 抓包原始 query（loginTag=code）+ mini-we body（gameId 一致）
  H: {
    payload: (code) => ({
      gameId: 'xyzwprod',
      code,
      gameTp: 'minigame',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'com.hortor.games.xyzw',
      tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: MINI_QUERY,
  },
  // I: H + 短 deviceUniqueId（抓包里是 ck42mn8i）
  I: {
    payload: (code) => variants.H.payload(code),
    query: () =>
      '?gameId=xyzwprod&gameTp=minigame&system=android' +
      '&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0',
  },
  // F: A 的完整 query + 真实抓包 body（定位 10001 与 10011 的差异来源）
  F: {
    payload: (code) => ({
      mac: '02:00:00:00:00:00',
      tp: 'app-we',
      isScan: true,
      gameId: 'xyzwapp',
      channel: 'AppStore',
      version: '0.21.0',
      idfa: '00000000-0000-0000-0000-000000000000',
      distinctId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
      packageName: 'com.hortor.games.xyzw',
      code,
      gameTp: 'app',
      sysInfo: '{\n  "system" : "iOS",\n  "brand" : "Apple",\n  "model" : "iPhone12,8",\n  "hortorSdkVersion" : "1.7.11"\n}',
      deviceUniqueId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
    }),
    query: () =>
      '?gameId=xyzwprod&timestamp=' + Date.now() +
      '&version=1.91.1-wx&cryptVersion=1.1.0' +
      '&gameTp=minigame&system=android' +
      '&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026' +
      '&packageName=com.hortorgames.xyzw',
  },
  // G: 抓包 query + 抓包 body，但补齐 timestamp/deviceUniqueId/packageName
  G: {
    payload: (code) => variants.D.payload(code),
    query: () =>
      '?gameId=xyzwprod&gameTp=minigame&system=android' +
      '&version=1.91.1-wx&loginTag=code&cryptVersion=1.1.0' +
      '&timestamp=' + Date.now() +
      '&deviceUniqueId=6AC8F932-2FF9-401E-863F-9CD0582F6C12' +
      '&packageName=com.hortor.games.xyzw',
  },
  // D: 真实抓包格式 —— 小游戏 query + AppStore/app-we body（字段与抓包完全一致）
  D: {
    payload: (code) => ({
      mac: '02:00:00:00:00:00',
      tp: 'app-we',
      isScan: true,
      gameId: 'xyzwapp',
      channel: 'AppStore',
      version: '0.21.0',
      idfa: '00000000-0000-0000-0000-000000000000',
      distinctId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
      packageName: 'com.hortor.games.xyzw',
      code,
      gameTp: 'app',
      sysInfo: '{\n  "system" : "iOS",\n  "brand" : "Apple",\n  "model" : "iPhone12,8",\n  "hortorSdkVersion" : "1.7.11"\n}',
      deviceUniqueId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
    }),
    query: MINI_QUERY,
  },
  // E: 小游戏 query + 简化 app-we body
  E: {
    payload: (code) => ({
      gameId: 'xyzwapp',
      code,
      gameTp: 'app',
      sysInfo: '{"system":"iOS","hortorSdkVersion":"1.7.11","model":"iPhone12,8","brand":"Apple"}',
      channel: 'AppStore',
      distinctId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
      packageName: 'com.hortor.games.xyzw',
      tp: 'app-we',
      isScan: true,
      deviceUniqueId: '6AC8F932-2FF9-401E-863F-9CD0582F6C12',
    }),
    query: MINI_QUERY,
  },
  // A: mini-we 小游戏通道（gameId xyzwprod / gameTp minigame / channel hortor）
  A: {
    payload: (code) => ({
      gameId: 'xyzwprod',
      code,
      gameTp: 'minigame',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'com.hortor.games.xyzw',
      tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: () =>
      '?gameId=xyzwprod&timestamp=' + Date.now() +
      '&version=android-4.2.1-cn-release&cryptVersion=1.1.0' +
      '&gameTp=minigame&system=android' +
      '&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026' +
      '&packageName=com.hortorgames.xyzw',
  },
  // B: mini-we，但 query 与 payload 均用 minigame 系统参数
  B: {
    payload: (code) => ({
      gameId: 'xyzwprod',
      code,
      gameTp: 'minigame',
      sysInfo: '{"system":"minigame","hortorSDKVersion":"4.0.6-cn"}',
      channel: 'hortor',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'wx0840558555a454ed',
      tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: () =>
      '?gameId=xyzwprod&timestamp=' + Date.now() +
      '&version=minigame-4.2.1-cn-release&cryptVersion=1.1.0' +
      '&gameTp=minigame&system=minigame' +
      '&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026' +
      '&packageName=wx0840558555a454ed',
  },
  // C: 对照组 - 现有 app-we（复现用户报错）
  C: {
    payload: (code) => ({
      gameId: 'xyzwapp',
      code,
      gameTp: 'app',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'android',
      appFrom: 'com.tencent.mm',
      noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6',
      state: 'hortor',
      packageName: 'com.hortor.games.xyzw',
      tp: 'app-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    }),
    query: () =>
      '?gameId=xyzwapp&timestamp=' + Date.now() +
      '&version=android-4.2.1-cn-release&cryptVersion=1.1.0' +
      '&gameTp=app&system=android' +
      '&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026' +
      '&packageName=com.hortorgames.xyzw',
  },
};

(async () => {
  const variant = process.argv[2] || 'A';
  const v = variants[variant];
  if (!v) { console.error('未知变体: ' + variant + '，可选: ' + Object.keys(variants).join(',')); process.exit(1); }

  // 1. 取账号
  const accResp = await (await fetch(YYB + '/accounts')).json();
  const acc = accResp.data?.[0];
  if (!acc) { console.error('无已保存账号'); process.exit(1); }
  console.log('[probe] 账号:', acc.openid, acc.status);

  // 2. 取全新 code
  const codeResp = await (await fetch(YYB + '/wxapp/getCode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: acc.openid, app_id: APP_ID }),
  })).json();
  const code = codeResp.data?.result?.code;
  if (!code) { console.error('[probe] getCode 失败:', JSON.stringify(codeResp)); process.exit(1); }
  console.log('[probe] code:', code.slice(0, 12) + '...');

  // 3. hortor 登录
  const payloadObj = v.payload(code);
  const encoded = encodePayload(JSON.stringify(payloadObj));
  const url = HORTOR + '/comb-login-server/api/v1/login' + v.query();
  console.log('[probe] URL:', url);
  console.log('[probe] payload:', JSON.stringify(payloadObj));

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
      'Accept': '*/*',
      'Content-Type': 'text/plain; charset=utf-8',
      'Origin': 'https://open.weixin.qq.com',
      'Referer': 'https://open.weixin.qq.com/',
    },
    body: encoded,
  });
  const text = await resp.text();
  console.log('[probe] HTTP', resp.status);
  try {
    console.log('[probe] 响应:', JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log('[probe] 响应(原文):', text.slice(0, 2000));
  }
})().catch((e) => { console.error('[probe] 异常:', e); process.exit(1); });
