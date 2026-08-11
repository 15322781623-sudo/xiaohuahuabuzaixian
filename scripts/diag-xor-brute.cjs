#!/usr/bin/env node
// 破解 comb-login XOR 密钥相位：对 key 的不同起始偏移做暴力测试
// 判据：XOR 解密后的 payload 前 N 字节都是合法 base64 字符
const YYB = 'http://127.0.0.1:8000';

const fs = require('fs');
const path = require('path');
// 从 hortorLogin.ts 提取 cipherTable，保证与前端完全一致
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'hortorLogin.ts'), 'utf8');
const m = src.match(/cipherTable =\s*"([^"]+)"/);
if (!m) { console.log('未找到 cipherTable'); process.exit(1); }
const cipherTable = m[1];
console.log('cipherTable 长度:', cipherTable.length);

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const transCode = (str, times) => {
  if (times <= 0) return str;
  const half = Math.floor(str.length / 2);
  return transCode(str.substring(half), times - 1) + transCode(str.substring(0, half), times - 1);
};
const isB64 = (c) => /[A-Za-z0-9+/=]/.test(c);

(async () => {
  const r = await fetch(YYB + '/wxapp/getCode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'owNAX6r5qZdH6omhKvsN0hJA7jF4', app_id: 'wx0840558555a454ed' }),
  });
  const code = (await r.json())?.data?.result?.code;
  if (!code) { console.log('getCode 失败'); process.exit(1); }
  console.log('code =', code);

  const payload = JSON.stringify({
    gameId: 'xyzwprod', code, gameTp: 'minigame', version: '1.91.1-wx',
    sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
    channel: 'hortor', appFrom: 'com.tencent.mm', noLogin: '2',
    distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
    packageName: 'com.hortor.games.xyzw', tp: 'mini-we',
    signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
  });
  const plain = b64(payload); // 服务端 XOR 解密后期望得到的内容

  // 生成不同 (times, step) 的 key
  const urlBase = 'https://comb-platform.hortorgames.com/comb-login-server/api/v1/login?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0';
  const H = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
    Accept: '*/*', 'Content-Type': 'text/plain; charset=utf-8',
    Origin: 'https://open.weixin.qq.com', Referer: 'https://open.weixin.qq.com/',
  };

  const encrypt = (key, startIdx) => {
    const out = new Array(plain.length);
    let idx = startIdx;
    for (let i = 0; i < plain.length; i++) {
      if (idx >= key.length) idx = 0;
      out[i] = String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(idx));
      idx++;
    }
    return out.join('');
  };

  const candidates = [];
  for (const times of [6]) {
    for (const step of [3]) {
      const shuffled = transCode(cipherTable, times);
      const chars = shuffled.split('');
      const count = Math.floor(shuffled.length / step);
      const key = [];
      for (let i = 0; i < count; i++) key.push(chars[i * step]);
      candidates.push({ label: `t${times}s${step}`, key: key.join('') });
    }
  }

  for (const c of candidates) {
    // 偏移搜索：0..key.length，步长1；先用前16字节快速筛
    let hits = [];
    for (let off = 0; off < c.key.length; off += 1) {
      let ok = true;
      for (let i = 0; i < Math.min(16, plain.length); i++) {
        const cc = plain.charCodeAt(i) ^ c.key.charCodeAt((off + i) % c.key.length);
        if (!isB64(String.fromCharCode(cc))) { ok = false; break; }
      }
      if (ok) hits.push(off);
    }
    console.log(`key=${c.label} len=${c.key.length} 前16字节全合法base64的偏移数=${hits.length}`, hits.slice(0, 20).join(','));
    // 对命中的偏移实测服务端
    for (const off of hits.slice(0, 3)) {
      const body = encrypt(c.key, off);
      const resp = await fetch(urlBase, { method: 'POST', headers: H, body });
      const json = await resp.json().catch(() => null);
      const meta = json?.meta;
      console.log(`  offset=${off} => errCode=${meta?.errCode} msg=${meta?.errMsg} combUser=${!!json?.data?.combUser}`);
      if (json?.data?.combUser) {
        console.log('✅✅ 破解成功 offset=', off);
        process.exit(0);
      }
    }
  }
  console.log('暴力搜索结束，未找到可用偏移');
})().catch((e) => { console.error(e); process.exit(1); });
