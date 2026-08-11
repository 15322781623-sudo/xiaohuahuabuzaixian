#!/usr/bin/env node
// 对照实验：真实长token bin 分别以 platformExt=mix / qq 请求 serverlist
// 若 qq 也成功 → 服务器不强绑渠道，qq 渠道同样可用长凭证
// 若 qq 失败 → 渠道与凭证绑定，qq 需要专属 MSDK 凭证
(async () => {
  const fs = require('fs');
  const path = require('path');
  const { g_utils } = await import('../src/utils/bonProtocol.js');
  const dir = path.join(__dirname, '..', 'server', 'uploads', 'admin');
  const f = fs.readdirSync(dir).filter((x) => x.endsWith('.bin'))[0];
  const buf = fs.readFileSync(path.join(dir, f));
  const msg = g_utils.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  let data = msg.getData();
  if (!data) data = { ...msg._raw };
  console.log('原始 platformExt =', data.platformExt, ' serverId =', data.serverId);

  for (const ext of [data.platformExt, 'qq']) {
    const patched = { ...data, platformExt: ext };
    const out = Buffer.from(g_utils.encode(patched, 'lx'));
    const resp = await fetch('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(out),
    });
    const ab = await resp.arrayBuffer();
    try {
      const m = g_utils.parse(ab);
      const d = m.getData();
      if (d && d.roles) {
        const n = Array.isArray(d.roles) ? d.roles.length : Object.keys(d.roles).length;
        console.log(`platformExt=${ext} => 成功 roles=${n}`);
      } else {
        console.log(`platformExt=${ext} => 失败 code=${m._raw?.code} error=${m._raw?.error}`);
      }
    } catch (e) {
      console.log(`platformExt=${ext} => parse失败 ${e.message}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
