#!/usr/bin/env node
// 判别测试：用假 code 测 app-we 与 mini-we 通道
// 若返回「code无效」类错误 → 解密通过（加密表有效）
// 若返回「解密错误」 → 加密表/参数失效
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const cipherTable = src.match(/cipherTable =\s*"([^"]+)"/)[1];
console.log('cipherTable 长度:', cipherTable.length, '偶数:', cipherTable.length % 2 === 0);

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
const encrypt = (text) => {
  const base64Text = b64(text);
  const key = getCodeKey(transCode(cipherTable, 6), 3);
  const v = base64Text.split(''), w = key.split(''), out = new Array(v.length);
  let idx = w.length >> 1;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    out[i] = String.fromCharCode(v[i].charCodeAt(0) ^ w[idx].charCodeAt(0));
    idx++;
  }
  return out.join('');
};

const H = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
  Accept: '*/*', 'Content-Type': 'text/plain; charset=utf-8',
  Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/',
};
const BASE = 'https://comb-platform.hortorgames.com/comb-login-server/api/v1/login';

(async () => {
  const tests = [
    ['app-we(假code)', {
      payload: { gameId: 'xyzwapp', code: 'FAKECODE123', gameTp: 'app', sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}', channel: 'android', appFrom: 'com.tencent.mm', noLogin: '2', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor', packageName: 'com.hortor.games.xyzw', tp: 'app-we', signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13' },
      url: BASE + '?gameId=xyzwapp&timestamp=' + Date.now() + '&version=android-4.2.1-cn-release&cryptVersion=1.1.0&gameTp=app&system=android&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026&packageName=com.hortorgames.xyzw',
    }],
    ['mini-we(假code)', {
      payload: { gameId: 'xyzwprod', code: 'FAKECODE123', gameTp: 'minigame', version: '1.91.1-wx', sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}', channel: 'hortor', appFrom: 'com.tencent.mm', noLogin: '2', distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor', packageName: 'com.hortor.games.xyzw', tp: 'mini-we', signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13' },
      url: BASE + '?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0',
    }],
  ];
  for (const [name, t] of tests) {
    const body = encrypt(JSON.stringify(t.payload));
    const resp = await fetch(t.url, { method: 'POST', headers: H, body });
    const text = await resp.text();
    console.log(`[${name}] HTTP ${resp.status} =>`, text.slice(0, 260));
  }
})().catch((e) => { console.error(e); process.exit(1); });
