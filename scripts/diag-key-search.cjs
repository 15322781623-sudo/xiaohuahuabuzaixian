#!/usr/bin/env node
// 已知前4字节 crib 攻击：搜索 (times, step, shift) 使派生密钥前4字节全部吻合
// p[i] = base64('{"gameId":"xyzwprod"...')[i]
// c[i] = 上一次真实请求密文[i]
// 要求: k[i] = p[i]^c[i] 全部命中（i=0..3）
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

// 真实密文（浏览器实测，前8字节 charCode）与对应明文 payload 前缀
const knownCipher = [47, 48, 115, 35, 15, 49, 91, 84];
// 明文 payload 开头固定部分（JSON key 顺序与 hortorLogin.ts 一致）
const plainPrefix = b64('{"gameId":"xyzwprod","code":"');

console.log('plainPrefix 前10字符:', plainPrefix.slice(0, 10).split('').map((c) => c.charCodeAt(0)).join(','));
const targetKeys = knownCipher.map((cc, i) => String.fromCharCode(plainPrefix.charCodeAt(i) ^ cc));
console.log('目标密钥前8字节:', targetKeys.map((c) => c.charCodeAt(0)).join(','), JSON.stringify(targetKeys));

const results = [];
for (let times = 0; times <= 10; times++) {
  const shuffled = transCode(cipherTable, times);
  for (let step = 1; step <= 8; step++) {
    const count = Math.floor(shuffled.length / step);
    const key = [];
    for (let i = 0; i < count; i++) key.push(shuffled[i * step]);
    const keyStr = key.join('');
    if (keyStr.length < 2) continue;
    for (let shift = 0; shift <= 4; shift++) {
      const start = keyStr.length >> shift;
      if (start + 8 > keyStr.length + 8) { /* wrap ok */ }
      let ok = true;
      for (let i = 0; i < 8; i++) {
        const k = keyStr[(start + i) % keyStr.length];
        if (k !== targetKeys[i]) { ok = false; break; }
      }
      if (ok) results.push({ times, step, shift, start, keyLen: keyStr.length });
    }
  }
}
console.log('命中组合数:', results.length);
for (const r of results.slice(0, 20)) console.log(JSON.stringify(r));
