const crypto = require('crypto');

const target = 'c03d692b579f8603c5008886a060c65a';
const ts = '1785134079';
const nonce = '2323110452';
const key1 = 'X#9k$F2@mN7^pL5&jR3!wY1*Z8$Q';
const key2 = 'wgrdg373hy26ww2';
const ver = '1.0.2';
const pbinfo = '50911:1.0.2';
const bid = 'pc_yyb_auth';

const parts = { key1, key2, ts, nonce, ver, pbinfo, bid };
const keys = Object.keys(parts);
let found = false;

// All 2-part combos
for (const a of keys) for (const b of keys) {
  if (a === b) continue;
  const md5 = crypto.createHash('md5').update(parts[a] + parts[b]).digest('hex');
  if (md5 === target) { console.log('FOUND 2-part:', a, '+', b); found = true; }
}

// All 3-part combos
for (const a of keys) for (const b of keys) for (const c of keys) {
  if (a === b || b === c || a === c) continue;
  const md5 = crypto.createHash('md5').update(parts[a] + parts[b] + parts[c]).digest('hex');
  if (md5 === target) { console.log('FOUND 3-part:', a, '+', b, '+', c); found = true; }
}

// 4-part combos
for (const a of keys) for (const b of keys) for (const c of keys) for (const d of keys) {
  if (new Set([a,b,c,d]).size < 4) continue;
  const md5 = crypto.createHash('md5').update(parts[a] + parts[b] + parts[c] + parts[d]).digest('hex');
  if (md5 === target) { console.log('FOUND 4-part:', a, '+', b, '+', c, '+', d); found = true; }
}

// With separators
const seps = ['&', '=', '\n', '|', ':', ',', ';'];
for (const sep of seps) {
  for (const a of keys) for (const b of keys) for (const c of keys) {
    if (new Set([a,b,c]).size < 3) continue;
    const s = parts[a] + sep + parts[b] + sep + parts[c];
    const md5 = crypto.createHash('md5').update(s).digest('hex');
    if (md5 === target) { console.log('FOUND sep=' + JSON.stringify(sep) + ':', a, '+', b, '+', c); found = true; }
  }
}

// Also try HMAC-MD5 (just in case)
for (const k of [key1, key2]) {
  for (const a of keys) for (const b of keys) {
    if (a === b) continue;
    const md5 = crypto.createHmac('md5', k).update(parts[a] + parts[b]).digest('hex');
    if (md5 === target) { console.log('FOUND HMAC-MD5 key=' + k + ':', a, '+', b); found = true; }
  }
  for (const a of keys) for (const b of keys) for (const c of keys) {
    if (new Set([a,b,c]).size < 3) continue;
    const md5 = crypto.createHmac('md5', k).update(parts[a] + parts[b] + parts[c]).digest('hex');
    if (md5 === target) { console.log('FOUND HMAC-MD5 key=' + k + ':', a, '+', b, '+', c); found = true; }
  }
}

if (!found) console.log('NOT FOUND. Target:', target);
