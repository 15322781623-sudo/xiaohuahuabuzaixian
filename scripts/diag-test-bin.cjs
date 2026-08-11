#!/usr/bin/env node
// 用指定 bin 文件请求 serverlist，验证凭证是否仍有效
const fs = require('fs');
const path = require('path');

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js'); // 仅用于解析响应
  const fp = path.resolve(process.argv[2]);
  const u8 = new Uint8Array(fs.readFileSync(fp));
  // bin 文件本身即上线格式（lx 加密的 BON），直接原样发送
  const resp = await fetch('https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3', {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: u8,
  });
  const msg = g_utils.parse(await resp.arrayBuffer());
  const d = msg.getData();
  if (d && d.roles) {
    const roles = Array.isArray(d.roles) ? d.roles : Object.values(d.roles);
    console.log('✅ 凭证有效，角色数:', roles.length);
    for (const r of roles.slice(0, 10)) console.log('  -', JSON.stringify(r).slice(0, 200));
  } else {
    console.log(`❌ 服务器拒绝 code=${msg._raw?.code} error=${msg._raw?.error}`);
  }
})().catch((e) => { console.error('异常:', e.message); process.exit(1); });
