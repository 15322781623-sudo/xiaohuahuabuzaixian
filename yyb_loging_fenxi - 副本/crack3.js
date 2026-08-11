const crypto = require('crypto');

const target = '7de1ffc3c69c843ca9e4b6f18010ffc0';
const ts = '1785134498593';       // 毫秒时间戳
const nonce = '5646';              // 短 nonce
const bid = 'pc_yyb_auth';
const key1 = 'X#9k$F2@mN7^pL5&jR3!wY1*Z8$Q';
const key2 = 'wgrdg373hy26ww2';
const body = '{"extInfo":{"listI":{"user_type":{"value":[0]}},"listS":{"access_token":{"value":["1_9dPy6Cfwli15O0mH-EiZu_obDs0n1nzCFlXJunJUy3XQUbPQU7SOvferFtmWkQnIhC8BrhM9hjqPlhug-MT842ozf54-V7_EA5zQtJXGuY91jVcWR1i0cNk"]},"unionid":{"value":["owNAX6nu2JWQgq-jDNV93OYME1oc"]},"user_id":{"value":["owNAX6nu2JWQgq-jDNV93OYME1oc"]}}}}';
const accessToken = '1_9dPy6Cfwli15O0mH-EiZu_obDs0n1nzCFlXJunJUy3XQUbPQU7SOvferFtmWkQnIhC8BrhM9hjqPlhug-MT842ozf54-V7_EA5zQtJXGuY91jVcWR1i0cNk';
const openid = 'owNAX6nu2JWQgq-jDNV93OYME1oc';

const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
const bodySha256 = crypto.createHash('sha256').update(body).digest('hex');

const parts = { key1, key2, bid, ts, nonce, body, bodyMd5, accessToken, openid };
const partNames = Object.keys(parts);
const seps = ['', '&', '\n', '|'];

let found = false;

// MD5 with 2-5 parts
function tryCombo(names, sep, algo, keyName) {
  const str = names.map(n => parts[n]).join(sep);
  let hash;
  if (algo === 'md5') hash = crypto.createHash('md5').update(str).digest('hex');
  else if (algo === 'sha256') hash = crypto.createHash('sha256').update(str).digest('hex');
  else if (algo === 'hmac-md5') hash = crypto.createHmac('md5', parts[keyName]).update(str).digest('hex');
  else if (algo === 'hmac-sha256') hash = crypto.createHmac('sha256', parts[keyName]).update(str).digest('hex');
  return hash === target;
}

for (const sep of seps) {
  for (const a of partNames) {
    // 1-part
    for (const algo of ['md5', 'sha256']) {
      if (tryCombo([a], sep, algo)) { console.log(`FOUND ${algo} 1-part: ${a}`); found = true; }
    }
    for (const b of partNames) {
      if (b === a) continue;
      // 2-part
      for (const algo of ['md5', 'sha256']) {
        if (tryCombo([a, b], sep, algo)) { console.log(`FOUND ${algo} 2-part sep=${JSON.stringify(sep)}: ${a}+${b}`); found = true; }
      }
      // HMAC 2-part
      for (const k of ['key1', 'key2']) {
        if (a === k || b === k) continue;
        for (const algo of ['hmac-md5', 'hmac-sha256']) {
          if (tryCombo([a, b], sep, algo, k)) { console.log(`FOUND ${algo} key=${k} 2-part sep=${JSON.stringify(sep)}: ${a}+${b}`); found = true; }
        }
      }
      for (const c of partNames) {
        if (c === a || c === b) continue;
        // 3-part
        for (const algo of ['md5', 'sha256']) {
          if (tryCombo([a, b, c], sep, algo)) { console.log(`FOUND ${algo} 3-part sep=${JSON.stringify(sep)}: ${a}+${b}+${c}`); found = true; }
        }
        for (const k of ['key1', 'key2']) {
          if (a === k || b === k || c === k) continue;
          for (const algo of ['hmac-md5', 'hmac-sha256']) {
            if (tryCombo([a, b, c], sep, algo, k)) { console.log(`FOUND ${algo} key=${k} 3-part sep=${JSON.stringify(sep)}: ${a}+${b}+${c}`); found = true; }
          }
        }
        for (const d of partNames) {
          if (d === a || d === b || d === c) continue;
          // 4-part
          for (const algo of ['md5']) {
            if (tryCombo([a, b, c, d], sep, algo)) { console.log(`FOUND ${algo} 4-part sep=${JSON.stringify(sep)}: ${a}+${b}+${c}+${d}`); found = true; }
          }
          for (const k of ['key1', 'key2']) {
            if (a === k || b === k || c === k || d === k) continue;
            for (const algo of ['hmac-md5']) {
              if (tryCombo([a, b, c, d], sep, algo, k)) { console.log(`FOUND ${algo} key=${k} 4-part sep=${JSON.stringify(sep)}: ${a}+${b}+${c}+${d}`); found = true; }
            }
          }
        }
      }
    }
  }
}

if (!found) console.log('NOT FOUND. Target:', target);
