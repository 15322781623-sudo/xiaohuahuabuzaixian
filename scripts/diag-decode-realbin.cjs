#!/usr/bin/env node
/**
 * 解码真实 mix bin，查看其内部结构（info 字段形态、platform/platformExt 等），
 * 用于对比应用宝 mini-we 构造的 bin，寻找可转换的逻辑。
 * 注意：凭证内容只打印前若干字符，不输出完整值。
 */
const fs = require('fs');
const path = require('path');

(async () => {
  const { g_utils } = await import('../src/utils/bonProtocol.js');

  const argFile = process.argv[2];
  let files;
  if (argFile) {
    files = [path.resolve(argFile)];
  } else {
    const dir = path.join(__dirname, '..', 'server', 'uploads', 'admin');
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.bin')).slice(0, 3).map((f) => path.join(dir, f));
  }

  for (const fp of files) {
    const f = path.basename(fp);
    const u8 = new Uint8Array(fs.readFileSync(fp));
    console.log('\n=====', f, '原始字节:', u8.length);
    let decoded = null;
    try {
      const enc = g_utils.getEnc('auto');
      decoded = g_utils.bon.decode(enc.decrypt(u8));
      console.log('(解密后解码成功)');
    } catch (e) {
      try { decoded = g_utils.bon.decode(u8); console.log('(直接解码成功)'); }
      catch (e2) { console.log('解码失败:', e.message, '/', e2.message); continue; }
    }
    if (!decoded || typeof decoded !== 'object') { console.log('解码结果非对象:', typeof decoded); continue; }
    console.log('顶层 keys:', Object.keys(decoded).join(', '));
    for (const [k, v] of Object.entries(decoded)) {
      if (k === 'info') {
        const s = typeof v === 'string' ? v : JSON.stringify(v);
        console.log(`  info 类型=${typeof v} 长度=${s.length} 预览=${s.slice(0, 120)}...`);
        if (typeof v === 'object' && v) console.log('  info keys:', Object.keys(v).join(', '));
      } else {
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        console.log(`  ${k} = ${s.slice(0, 120)}`);
      }
    }
  }
})().catch((e) => { console.error('异常:', e); process.exit(1); });
