#!/usr/bin/env node
// 解析真实上传的 token bin，查看服务器接受的完整结构
const fs = require('fs');
const path = require('path');

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');
  const dir = path.join(__dirname, '..', 'server', 'uploads', 'admin');
  const files = fs.readdirSync(dir).filter((x) => x.endsWith('.bin')).slice(0, 3);
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    console.log('==== file:', f, 'len:', buf.length);
    try {
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const msg = g_utils.parse(ab);
      console.log('msg keys:', Object.keys(msg), '_raw keys:', msg._raw ? Object.keys(msg._raw) : 'null');
      const d = msg._raw;
      const s = JSON.stringify(d, (k, v) => (v instanceof Uint8Array ? '<u8:' + v.length + '>' : v));
      console.log('raw:', s && s.slice(0, 2500));
      let data = null;
      try { data = msg.getData(); } catch (e) { console.log('getData failed:', e.message); }
      const s2 = JSON.stringify(data, (k, v) => (v instanceof Uint8Array ? '<u8:' + v.length + '>' : v));
      console.log('data:', s2 && s2.slice(0, 3000));
      if (data && data.info) {
        console.log('-- info keys:', typeof data.info === 'object' ? Object.keys(data.info).join(',') : typeof data.info,
          '| info.encryptCombUser len:', data.info && data.info.encryptCombUser ? data.info.encryptCombUser.length : 'N/A');
      }
    } catch (e) {
      console.log('parse failed:', e.message);
      console.log(e.stack.split('\n').slice(0, 6).join('\n'));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
