#!/usr/bin/env node
// 通过 dev server 的 /api/hortor 代理验证真实前端的 mini-we 登录请求
(async () => {
  const r = await fetch('http://127.0.0.1:8000/wxapp/getCode', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'owNAX6r5qZdH6omhKvsN0hJA7jF4', app_id: 'wx0840558555a454ed' }),
  });
  const j = await r.json();
  const code = j?.data?.result?.code;
  console.log('code =', code);
  if (!code) process.exit(1);

  const payload = {
    gameId: 'xyzwprod', code, gameTp: 'minigame', version: '1.91.1-wx',
    sysInfo: '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
    channel: 'hortor', appFrom: 'com.tencent.mm', noLogin: '2',
    distinctId: 'DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6', state: 'hortor',
    packageName: 'com.hortor.games.xyzw', tp: 'mini-we',
    signPrint: 'E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13',
  };
  // 测试1：直接发 base64（不加密），看服务端反应
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const url = 'http://localhost:3000/api/hortor/comb-login-server/api/v1/login?gameId=xyzwprod&gameTp=minigame&system=android&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0';
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: b64 });
  console.log('裸base64 =>', resp.status, (await resp.text()).slice(0, 300));
})().catch((e) => { console.error(e); process.exit(1); });
