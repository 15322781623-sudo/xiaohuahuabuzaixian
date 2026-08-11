#!/usr/bin/env node
// 用真实上传的 bin 原样请求 serverlist，验证 token 是否仍被服务器接受
const fs = require('fs');
const path = require('path');

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');
  const dir = path.join(__dirname, '..', 'server', 'uploads', 'admin');
  const files = fs.readdirSync(dir).filter((x) => x.endsWith('.bin')).slice(0, 3);
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    // 原样发送（不改 seq）
    const resp = await fetch('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(buf),
    });
    const ab = await resp.arrayBuffer();
    let out = '';
    try {
      const m = g_utils.parse(ab);
      const d = m.getData();
      if (d && d.roles) {
        const n = Array.isArray(d.roles) ? d.roles.length : Object.keys(d.roles).length;
        out = `成功 roles=${n}`;
      } else {
        out = `code=${m._raw?.code} error=${m._raw?.error}`;
      }
    } catch (e) { out = 'parse失败 ' + e.message; }
    console.log(f, '=>', out);
  }
})().catch((e) => { console.error(e); process.exit(1); });
