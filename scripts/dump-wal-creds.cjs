#!/usr/bin/env node
// 从 SQLite WAL 文件中暴力提取 wechat_accounts 行（无依赖）
// SQLite 页大小默认 4096，记录为 varint 格式；直接按字符串特征搜索并解析行
const fs = require('fs');
const path = require('path');

const walPath = path.join(__dirname, '..', 'yyb_go.rar', 'resource', 'db', 'yyb.db-wal');
const buf = fs.readFileSync(walPath);
console.log('WAL size:', buf.length);

// 找所有包含 openid 特征的记录：'owNAX' 或 'login_buffer' 表头
// 直接扫描所有 "owN" 开头的 openid 串
const found = new Set();
for (let i = 0; i < buf.length - 8; i++) {
  if (buf[i] === 0x6f && buf[i + 1] === 0x77 && buf[i + 2] === 0x4e) { // "owN"
    // openid 长度约 28，前面一个字节是 serial type (len*2+13 或类似)
    const lenByte = buf[i - 1];
    if (lenByte < 100) {
      const strLen = (lenByte - 13) / 2;
      if (strLen >= 20 && strLen <= 40 && Number.isInteger(strLen)) {
        const openid = buf.slice(i, i + strLen).toString('utf8');
        if (/^owN[A-Za-z0-9_-]+$/.test(openid)) found.add(openid);
      }
    }
  }
}
console.log('openid 候选:', [...found]);

// 提取每个 openid 周围的记录：向前回溯找到记录头（header 开始处），向后读到合理长度
// 简化：直接以 openid 位置为中心，dump 前后 4KB 的可打印文本区段，供人工观察结构
for (const openid of found) {
  const idx = buf.indexOf(openid);
  console.log('\n===== openid =', openid, ' at offset', idx, '=====');
  const start = Math.max(0, idx - 512);
  const end = Math.min(buf.length, idx + 8192);
  const seg = buf.slice(start, end);
  // 打印可打印 ASCII 段（长度>=8）
  let cur = '';
  let off = start;
  const parts = [];
  for (let j = 0; j < seg.length; j++) {
    const c = seg[j];
    if ((c >= 0x20 && c < 0x7f) || c === 0x0a) {
      cur += String.fromCharCode(c);
    } else {
      if (cur.length >= 8) parts.push({ at: start + j - cur.length, len: cur.length, text: cur.slice(0, 400) });
      cur = '';
    }
  }
  if (cur.length >= 8) parts.push({ at: start + seg.length - cur.length, len: cur.length, text: cur.slice(0, 400) });
  for (const p of parts) console.log(`[${p.at} len=${p.len}] ${p.text}`);
}
