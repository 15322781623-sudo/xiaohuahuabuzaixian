#!/usr/bin/env node
/**
 * serverlist 全链路实测：mini-we 登录 → 构造 bin → 请求 serverlist → 打印响应
 * 用法: node scripts/probe-serverlist.cjs
 */
const fs = require('fs');
const path = require('path');

const YYB = 'http://127.0.0.1:8000';
const APP_ID = 'wx0840558555a454ed';
const HORTOR = 'https://comb-platform.hortorgames.com';
const XXZ = 'https://xxz-xyzw.hortorgames.com';

// ---------- 从 hortorLogin.ts 提取 cipherTable ----------
const tsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const m = tsSrc.match(/cipherTable\s*=\s*\n?\s*"([^"]+)"/);
if (!m) { console.error('无法提取 cipherTable'); process.exit(1); }
const cipherTable = m[1];

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

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  const accResp = await (await fetch(YYB + '/accounts')).json();
  const acc = accResp.data?.[0];
  if (!acc) { console.error('无已保存账号'); process.exit(1); }

  const freshCode = async () => {
    const r = await (await fetch(YYB + '/wxapp/getCode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: acc.openid, app_id: APP_ID }),
    })).json();
    return r.data?.result?.code;
  };

  const SIGNPRINT = 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13';

  // 登录变体：[完整 body, query]
  const baseQuery = '?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0';
  const loginVariants = {
    // mini-we 基线（已知登录成功，combUser 短）
    L1: [ { gameId: 'xyzwprod', gameTp: 'minigame', tp: 'mini-we', channel: 'hortor', version: '1.91.1-wx',
        appFrom: 'com.tencent.mm', noLogin: '2', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
        signPrint: SIGNPRINT },
      baseQuery ],
    // 不同 version，看 hortor 是否按版本下发完整 combUser
    L9: [ { gameId: 'xyzwprod', gameTp: 'minigame', tp: 'mini-we', channel: 'hortor', version: '1.96.3-wx',
        appFrom: 'com.tencent.mm', noLogin: '2', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
        signPrint: SIGNPRINT },
      '?gameId=xyzwprod&gameTp=minigame&system=android&version=1.96.3-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0' ],
    L10: [ { gameId: 'xyzwprod', gameTp: 'minigame', tp: 'mini-we', channel: 'hortor', version: '2.29.2-wx',
        appFrom: 'com.tencent.mm', noLogin: '2', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
        signPrint: SIGNPRINT },
      '?gameId=xyzwprod&gameTp=minigame&system=android&version=2.29.2-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0' ],
    // M1: 去掉 noLogin/appFrom，看是否不再下发降级 token
    M1: [ { gameId: 'xyzwprod', gameTp: 'minigame', tp: 'mini-we', channel: 'hortor', version: '1.91.1-wx',
        distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor', signPrint: SIGNPRINT,
        deviceUniqueId: 'ck42mn8i' },
      baseQuery ],
    // M2: 抓包全字段 + mini-we
    M2: [ { gameId: 'xyzwprod', gameTp: 'minigame', tp: 'mini-we', channel: 'hortor', version: '1.91.1-wx',
        mac: '02:00:00:00:00:00', idfa: '', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
        deviceUniqueId: 'ck42mn8i', signPrint: SIGNPRINT, appFrom: 'com.tencent.mm', isScan: false },
      baseQuery ],
  };

  const only = process.argv[2];
  for (const [lname, [over, query]] of Object.entries(loginVariants)) {
    if (only && only !== lname) continue;
    if (!only && lname !== 'M1') continue; // 默认只跑 M1（token 内容与变体无关）
    const code = await freshCode();
    if (!code) { console.error('getCode 失败'); continue; }
    const payload = { gameId: 'xyzwprod', code, gameTp: 'minigame', version: '1.91.1-wx',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor', packageName: 'com.hortor.games.xyzw', tp: 'mini-we', ...over };
    const lr = await (await fetch(HORTOR + '/comb-login-server/api/v1/login' + query, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/' },
      body: encodePayload(JSON.stringify(payload)),
    })).json();
    if (lr.meta?.errCode !== 0) { console.log(`[${lname}] 登录失败:`, lr.meta?.errCode, lr.meta?.errMsg); continue; }
    console.log(`[${lname}] 登录响应全量:`, JSON.stringify(lr.data).slice(0, 3000));
    const cu = lr.data.combUser;
    const env = lr.data.envCombSdkInfo;
    console.log(`[${lname}] 登录成功 encLen=${(cu.encryptCombUser || '').length} env=${env ? env.loginTp + '/' + env.channel + '/' + env.alias : 'null'}`);

    // bin 变体：仅标准结构
    const binVariants = {
      B1: { platform: 'hortor', platformExt: 'mix', info: cu, serverId: 0, scene: 0, referrerInfo: '' },
      // B7: 应用宝渠道通道 hortor/qq（服务器已确认接受该平台组合）
      B7: { platform: 'hortor', platformExt: 'qq', info: cu, serverId: 0, scene: 0, referrerInfo: '' },
    };
    for (const [bname, binData] of Object.entries(binVariants)) {
      const buf = Buffer.from(g_utils.encode(binData, 'lx'));
      // 同时测 serverlist 与 authuser
      for (const [ep, seq] of [['serverlist', 3], ['authuser', 1]]) {
        const resp = await fetch(XXZ + '/login/' + ep + '?_seq=' + seq, {
          method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(buf),
        });
        const ab = await resp.arrayBuffer();
        let msg = null;
        try { msg = g_utils.parse(ab); } catch (e) { console.log(`[${lname}/${bname}/${ep}] parse失败: ${e.message} bytes=${ab.byteLength}`); continue; }
        const data = msg.getData();
        if (data && (data.roles || data.roleToken)) {
          console.log(`[${lname}/${bname}/${ep}] 成功!`, JSON.stringify(data).slice(0, 1500));
        } else {
          console.log(`[${lname}/${bname}/${ep}] 失败: code=${msg._raw?.code} error=${msg._raw?.error} raw=${JSON.stringify(msg._raw).slice(0, 300)}`);
        }
      }
    }
  }
})().catch((e) => { console.error('[probe] 异常:', e); process.exit(1); });
