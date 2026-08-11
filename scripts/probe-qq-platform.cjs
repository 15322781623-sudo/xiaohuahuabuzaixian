#!/usr/bin/env node
/**
 * 探测游戏服务器对 platformExt="qq"（应用宝/QQ渠道）的接受度
 * 用假凭证测试：若返回 -10001（凭证校验失败）说明渠道被认识并进入了凭证校验；
 * 若返回 -10000（平台未知）说明渠道不被接受。
 */
(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');
  const XXZ = 'https://xxz-xyzw.hortorgames.com';

  const fakeInfo = { encryptCombUser: 'AAAA', sign: 'BBBB', timestamp: Date.now() };
  const variants = {
    // 基线：hortor/mix（已知 -10001）
    P1: { platform: 'hortor', platformExt: 'mix', info: fakeInfo, serverId: 0, scene: 0, referrerInfo: '' },
    // 应用宝渠道假设1：hortor/qq
    P2: { platform: 'hortor', platformExt: 'qq', info: fakeInfo, serverId: 0, scene: 0, referrerInfo: '' },
    // 应用宝渠道假设2：platform=qq
    P3: { platform: 'qq', platformExt: 'qq', info: fakeInfo, serverId: 0, scene: 0, referrerInfo: '' },
    // 应用宝渠道假设3：platform=tencent
    P4: { platform: 'tencent', platformExt: 'qq', info: fakeInfo, serverId: 0, scene: 0, referrerInfo: '' },
    // 应用宝渠道假设4：platform=yyb
    P5: { platform: 'yyb', platformExt: 'qq', info: fakeInfo, serverId: 0, scene: 0, referrerInfo: '' },
    // MSDK 风格：info 直接放 accessToken 字段
    P6: { platform: 'hortor', platformExt: 'qq', info: { accessToken: 'fake', openId: 'fake', payToken: 'fake' }, serverId: 0, scene: 0, referrerInfo: '' },
  };

  for (const [name, data] of Object.entries(variants)) {
    const buf = Buffer.from(g_utils.encode(data, 'lx'));
    const resp = await fetch(XXZ + '/login/serverlist?_seq=3', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(buf),
    });
    const ab = await resp.arrayBuffer();
    try {
      const msg = g_utils.parse(ab);
      const d = msg.getData();
      if (d && d.roles) {
        console.log(`[${name}] 意外成功 roles`, JSON.stringify(d).slice(0, 200));
      } else {
        console.log(`[${name}] code=${msg._raw?.code} error=${msg._raw?.error}`);
      }
    } catch (e) {
      console.log(`[${name}] parse失败: ${e.message} bytes=${ab.byteLength}`);
    }
  }
})().catch((e) => { console.error('[probe-qq] 异常:', e); process.exit(1); });
