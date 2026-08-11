#!/usr/bin/env node
// 查看应用宝 getCode 实时返回的完整数据
(async () => {
  const r = await fetch('http://127.0.0.1:8000/wxapp/getCode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'owNAX6r5qZdH6omhKvsN0hJA7jF4', app_id: 'wx0840558555a454ed' }),
  });
  const j = await r.json();
  console.log('HTTP 状态:', r.status);
  console.log('完整响应 JSON:');
  console.log(JSON.stringify(j, null, 2));
  const code = j?.data?.result?.code;
  console.log('\ncode =', code || '(未获取到)', '长度 =', code ? code.length : 0);
})().catch((e) => { console.error('异常:', e.message); process.exit(1); });
