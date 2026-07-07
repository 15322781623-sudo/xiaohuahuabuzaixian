#!/usr/bin/env node
/**
 * APK 上传到 R2 Storage（使用 Cloudflare API）
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ========== 工具函数 ==========
const log = (msg, type = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${new Date().toLocaleTimeString()}]${colors.reset} ${msg}`);
};

// ========== 配置 ==========
const VERSION = '2.21.0';
const APK_FILE = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', `肝王之王_${VERSION}.apk`);
const R2_BUCKET = 'apk-bucket';
const R2_KEY = '肝王之王_2.21.0.apk';

log(`\n===== 开始上传 APK 到 R2 =====`, 'info');

// ========== 验证 APK 文件 ==========
log('\n📍 步骤 1: 验证 APK 文件', 'info');
if (!fs.existsSync(APK_FILE)) {
  throw new Error(`APK 文件不存在：${APK_FILE}`);
}

const apkStats = fs.statSync(APK_FILE);
log(`✅ APK 文件大小：${(apkStats.size / 1024 / 1024).toFixed(2)} MB`, 'success');

// ========== 上传到 R2 ==========
log('\n📍 步骤 2: 使用 Cloudflare Worker 上传到 R2', 'info');

try {
  // 首先检查是否安装了 wrangler
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    log('✅ Wrangler CLI 已安装', 'success');
  } catch (e) {
    throw new Error('请先安装 Wrangler CLI: npm install -g wrangler');
  }

  // 登录 Cloudflare
  log('正在检查 Cloudflare 登录状态...', 'info');
  
  // 使用 wrangler r2 object put 命令上传（注意参数顺序）
  const command = `wrangler r2 object put "apk-bucket/肝王之王_2.21.0.apk" --file "${APK_FILE}" --remote`;
  
  log(`执行命令：${command}`, 'warn');
  
  execSync(command, { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CF_API_TOKEN || ''
    }
  });
  
  log(`✅ APK 已成功上传到 R2`, 'success');
  log(`R2 URL: https://cdn.xyzw.com/${R2_KEY}`, 'info');
  
} catch (error) {
  log('\n❌ 自动上传失败', 'error');
  log('请手动执行以下步骤:', 'warn');
  log('1. 安装 Wrangler CLI: npm install -g wrangler', 'info');
  log('2. 登录 Cloudflare: wrangler login', 'info');
  log(`3. 上传 APK: ${command}`, 'info');
  
  process.exit(1);
}
