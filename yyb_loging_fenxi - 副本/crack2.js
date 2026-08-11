const crypto = require('crypto');

// 两组已知的响应签名数据
const samples = [
  { sig: 'c03d692b579f8603c5008886a060c65a', ts: '1785134079', nonce: '2323110452', pbinfo: '50911:1.0.2' },
  { sig: 'af48bdac9d64b4acbddb7d49d388b68b', ts: '1785134499', nonce: '3244168390', pbinfo: '50911:1.1.5' },
];

const key1 = 'X#9k$F2@mN7^pL5&jR3!wY1*Z8$Q';
const key2 = 'wgrdg373hy26ww2';
const bid = 'pc_yyb_auth';

// 所有可能的参数
const params = { key1, key2, bid };
// 动态加入每个样本的 ts, nonce, pbinfo

// 尝试所有 2-4 部分组合
const parts = ['key1', 'key2', 'bid', 'ts', 'nonce', 'pbinfo'];
const seps = ['', '&', '=', '\n', '|', ':', ',', ';'];

let found = false;

for (const sep of seps) {
  for (const a of parts) {
    for (const b of parts) {
      if (a === b) continue;
      // 2-part
      const test = (vals) => sep ? [vals[a], vals[b]].join(sep) : vals[a] + vals[b];
      const allMatch = samples.every(s => {
        const vals = { ...params, ts: s.ts, nonce: s.nonce, pbinfo: s.pbinfo };
        return crypto.createHash('md5').update(test(vals)).digest('hex') === s.sig;
      });
      if (allMatch) {
        console.log('FOUND MD5 2-part sep=' + JSON.stringify(sep) + ': ' + a + ' + ' + b);
        found = true;
      }

      for (const c of parts) {
        if (c === a || c === b) continue;
        // 3-part
        const test3 = (vals) => sep ? [vals[a], vals[b], vals[c]].join(sep) : vals[a] + vals[b] + vals[c];
        const allMatch3 = samples.every(s => {
          const vals = { ...params, ts: s.ts, nonce: s.nonce, pbinfo: s.pbinfo };
          return crypto.createHash('md5').update(test3(vals)).digest('hex') === s.sig;
        });
        if (allMatch3) {
          console.log('FOUND MD5 3-part sep=' + JSON.stringify(sep) + ': ' + a + ' + ' + b + ' + ' + c);
          found = true;
        }

        for (const d of parts) {
          if (d === a || d === b || d === c) continue;
          // 4-part
          const test4 = (vals) => sep ? [vals[a], vals[b], vals[c], vals[d]].join(sep) : vals[a] + vals[b] + vals[c] + vals[d];
          const allMatch4 = samples.every(s => {
            const vals = { ...params, ts: s.ts, nonce: s.nonce, pbinfo: s.pbinfo };
            return crypto.createHash('md5').update(test4(vals)).digest('hex') === s.sig;
          });
          if (allMatch4) {
            console.log('FOUND MD5 4-part sep=' + JSON.stringify(sep) + ': ' + a + ' + ' + b + ' + ' + c + ' + ' + d);
            found = true;
          }
        }
      }
    }
  }
}

// 也尝试 HMAC-MD5 和 HMAC-SHA256
for (const k of ['key1', 'key2']) {
  for (const sep of seps) {
    for (const a of parts) {
      if (a === k) continue;
      for (const b of parts) {
        if (b === k || b === a) continue;
        const test = (vals) => sep ? [vals[a], vals[b]].join(sep) : vals[a] + vals[b];
        for (const algo of ['md5', 'sha256']) {
          const allMatch = samples.every(s => {
            const vals = { ...params, ts: s.ts, nonce: s.nonce, pbinfo: s.pbinfo };
            return crypto.createHmac(algo, vals[k]).update(test(vals)).digest('hex') === s.sig;
          });
          if (allMatch) {
            console.log('FOUND HMAC-' + algo + ' key=' + k + ' sep=' + JSON.stringify(sep) + ': ' + a + ' + ' + b);
            found = true;
          }
        }

        for (const c of parts) {
          if (c === k || c === a || c === b) continue;
          const test3 = (vals) => sep ? [vals[a], vals[b], vals[c]].join(sep) : vals[a] + vals[b] + vals[c];
          for (const algo of ['md5', 'sha256']) {
            const allMatch = samples.every(s => {
              const vals = { ...params, ts: s.ts, nonce: s.nonce, pbinfo: s.pbinfo };
              return crypto.createHmac(algo, vals[k]).update(test3(vals)).digest('hex') === s.sig;
            });
            if (allMatch) {
              console.log('FOUND HMAC-' + algo + ' key=' + k + ' sep=' + JSON.stringify(sep) + ': ' + a + ' + ' + b + ' + ' + c);
              found = true;
            }
          }
        }
      }
    }
  }
}

if (!found) {
  console.log('NOT FOUND with 2 samples');
  console.log('Sample 1:', samples[0]);
  console.log('Sample 2:', samples[1]);
}
