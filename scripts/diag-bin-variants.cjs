#!/usr/bin/env node
/**
 * 剩余可行路线判别测试：同一个 mini-we combUser，尝试不同的 bin 结构与请求头，
 * 看游戏服务器是否接受其中某种组合。
 */
const YYB = 'http://127.0.0.1:8000';
const APP_ID = 'wx0840558555a454ed';
const HORTOR = 'https://comb-platform.hortorgames.com';
const XXZ = 'https://xxz-xyzw.hortorgames.com';

const fs = require('fs');
const path = require('path');
const tsSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const cipherTable = tsSrc.match(/cipherTable =\s*"([^"]+)"/)[1];

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
const encodePayload = (text) => {
  const mid = dealWithString(b64(text), getCodeKey(transCode(cipherTable, 6), 3), 1);
  return Buffer.from(mid, 'latin1').toString('base64');
};

// wx_mini_1 伪装头（微信PC小程序环境）
const WX_MINI_HEADERS = {
  'Content-Type': 'application/octet-stream',
  Origin: 'https://servicewechat.com',
  Referer: 'https://servicewechat.com/wx0840558555a454ed/331/page-frame.html',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) MiniLifeApp/3.9.11 Chrome/98.0.4758.102 MiniProgramEnv/Windows XWEB/19823 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI Language/zh_CN miniProgram/wx0840558555a454ed',
  xweb_xhr: '1',
};
const PLAIN_HEADERS = { 'Content-Type': 'application/octet-stream' };

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  const accResp = await (await fetch(YYB + '/accounts')).json();
  const acc = accResp.data?.[0];
  if (!acc) { console.error('无账号'); process.exit(1); }

  // 1. getCode → comb-login（mini-we 基线）
  const codeResp = await (await fetch(YYB + '/wxapp/getCode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: acc.openid, app_id: APP_ID }),
  })).json();
  const code = codeResp.data?.result?.code;
  if (!code) { console.error('getCode 失败'); process.exit(1); }
  console.log('[0] code =', code);

  const lr = await (await fetch(HORTOR + '/comb-login-server/api/v1/login?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/' },
    body: encodePayload(JSON.stringify({
      gameId: 'xyzwprod', code, gameTp: 'minigame', version: '1.91.1-wx',
      sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
      channel: 'hortor', appFrom: 'com.tencent.mm', noLogin: '2',
      distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
      packageName: 'com.hortor.games.xyzw', tp: 'mini-we',
      signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
    })),
  })).json();
  if (lr.meta?.errCode !== 0) { console.error('comb-login 失败:', JSON.stringify(lr.meta)); process.exit(1); }
  const cu = lr.data.combUser;
  const sdkInfo = lr.data.combSdkInfo;
  const env = lr.data.envCombSdkInfo;
  console.log('[1] combUser:', JSON.stringify(cu));
  console.log('[1] combSdkInfo:', String(JSON.stringify(sdkInfo)).slice(0, 400));
  console.log('[1] envCombSdkInfo:', String(JSON.stringify(env)).slice(0, 400));

  // 2. bin 变体
  const variants = {
    // 基线（已知 -10001，作对照）
    V0_mix_plain: [{ platform: 'hortor', platformExt: 'mix', info: cu, serverId: null, scene: 0, referrerInfo: '' }, PLAIN_HEADERS],
    // 微信小游戏伪装头
    V1_mix_wxhdr: [{ platform: 'hortor', platformExt: 'mix', info: cu, serverId: null, scene: 0, referrerInfo: '' }, WX_MINI_HEADERS],
    // 小游戏场景值
    V2_scene1089: [{ platform: 'hortor', platformExt: 'mix', info: cu, serverId: null, scene: 1089, referrerInfo: '' }, WX_MINI_HEADERS],
    // h5web 平台扩展
    V3_h5web: [{ platform: 'hortor', platformExt: 'h5web', info: cu, serverId: null, scene: 0, referrerInfo: '' }, WX_MINI_HEADERS],
    // info 合并 combSdkInfo / envCombSdkInfo
    V4_withsdk: [{ platform: 'hortor', platformExt: 'mix', info: { ...cu, combSdkInfo: sdkInfo, envCombSdkInfo: env }, serverId: null, scene: 0, referrerInfo: '' }, WX_MINI_HEADERS],
    // info 为 JSON 字符串
    V5_infostr: [{ platform: 'hortor', platformExt: 'mix', info: JSON.stringify(cu), serverId: null, scene: 0, referrerInfo: '' }, WX_MINI_HEADERS],
    // referrerInfo 带场景
    V6_referrer: [{ platform: 'hortor', platformExt: 'mix', info: cu, serverId: null, scene: 1089, referrerInfo: '{"appId":"wx0840558555a454ed","scene":1089}' }, WX_MINI_HEADERS],
    // qq 平台组合 + 伪装头
    V7_qq_wxhdr: [{ platform: 'hortor', platformExt: 'qq', info: cu, serverId: null, scene: 0, referrerInfo: '' }, WX_MINI_HEADERS],
  };

  for (const [name, [binData, headers]] of Object.entries(variants)) {
    const buf = Buffer.from(g_utils.encode(binData, 'lx'));
    try {
      const resp = await fetch(XXZ + '/login/serverlist?_seq=3', {
        method: 'POST', headers, body: new Uint8Array(buf),
      });
      const ab = await resp.arrayBuffer();
      const msg = g_utils.parse(ab);
      const d = msg.getData();
      if (d && d.roles) {
        console.log(`[${name}] ✅✅✅ 成功!`, JSON.stringify(d).slice(0, 800));
      } else {
        console.log(`[${name}] ❌ code=${msg._raw?.code} error=${msg._raw?.error}`);
      }
    } catch (e) {
      console.log(`[${name}] 异常:`, e.message);
    }
  }
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
