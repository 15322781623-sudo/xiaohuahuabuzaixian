#!/usr/bin/env node
/**
 * 最后一组判别：hortor SDK userId / sign 作为 info 的多种形态 + comb-platform token 端点探测
 */
const XXZ = 'https://xxz-xyzw.hortorgames.com';
const HORTOR = 'https://comb-platform.hortorgames.com';

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  const userId = 'oIRDe5cBB13C5rTyrdTt4NbBmKyY';
  const uniqueId = 'fd92463043553be2fde7a649af211ee9';

  const tryServerList = async (name, binData) => {
    const buf = Buffer.from(g_utils.encode(binData, 'lx'));
    try {
      const resp = await fetch(XXZ + '/login/serverlist?_seq=3', {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(buf),
      });
      const msg = g_utils.parse(await resp.arrayBuffer());
      const d = msg.getData();
      if (d && d.roles) console.log(`[${name}] ✅✅✅ 成功!`, JSON.stringify(d).slice(0, 500));
      else console.log(`[${name}] ❌ code=${msg._raw?.code} error=${msg._raw?.error}`);
    } catch (e) { console.log(`[${name}] 异常:`, e.message); }
  };

  const W = (info) => ({ platform: 'hortor', platformExt: 'mix', info, serverId: null, scene: 0, referrerInfo: '' });

  // userId 各种形态
  await tryServerList('U1 userId字符串', W(userId));
  await tryServerList('U2 {userId}', W({ userId }));
  await tryServerList('U3 {uid,uniqueId}', W({ uid: userId, uniqueId }));
  await tryServerList('U4 platform=hortor ext=h5 {userId}', { platform: 'hortor', platformExt: 'h5', info: { userId }, serverId: null, scene: 0, referrerInfo: '' });

  // comb-platform 是否有 token 相关端点（探测，返回什么都打印）
  const probePaths = [
    '/comb-login-server/api/v1/token',
    '/comb-login-server/api/v1/tokenLogin',
    '/comb-login-server/api/v1/user/token',
    '/comb-login-server/api/v1/login/token',
  ];
  for (const p of probePaths) {
    try {
      const r = await fetch(HORTOR + p + '?gameId=xyzwprod&gameTp=minigame', {
        method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: JSON.stringify({ userId }),
      });
      console.log(`[探测 ${p}] HTTP ${r.status} =>`, (await r.text()).slice(0, 200));
    } catch (e) { console.log(`[探测 ${p}] 异常:`, e.message); }
  }
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
