#!/usr/bin/env node
/**
 * 创建新 GitHub Release 并上传 APK
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('请设置 GITHUB_TOKEN 环境变量'); process.exit(1); }

const REPO = '15322781623-sudo/xiaohuahuabuzaixian';
const TAG = process.argv[2] || 'v1.1.3';
const APK_PATH = join(ROOT, 'xyzw-helper.apk');
const ASSET_NAME = 'xyzw-helper.apk';

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.setTimeout(300000);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`📦 创建 Release ${TAG} 并上传 APK...\n`);

  // 1. 创建 Release
  console.log('创建 GitHub Release...');
  const createBody = JSON.stringify({
    tag_name: TAG,
    name: TAG,
    body: `## ${TAG}\n- APK自动更新功能上线\n- Worker接入GitHub Releases API\n- 修复定时十殿阎罗挑战BUG\n- 优化APK更新逻辑`,
    draft: false,
    prerelease: false,
  });

  const createResp = await httpsRequest({
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO}/releases`,
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(createBody),
      'User-Agent': 'xyzw-publish',
    },
  }, createBody);

  if (createResp.status !== 201) {
    console.error('创建 Release 失败:', createResp.status, createResp.body);
    process.exit(1);
  }

  const release = JSON.parse(createResp.body);
  console.log(`✅ Release 创建成功! ID: ${release.id}`);

  // 2. 上传 APK
  const apkBuffer = readFileSync(APK_PATH);
  console.log(`📤 上传 APK (${(apkBuffer.length / 1024 / 1024).toFixed(2)}MB)...`);

  const startTime = Date.now();
  const uploadResp = await httpsRequest({
    hostname: 'uploads.github.com',
    port: 443,
    path: `/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(ASSET_NAME)}`,
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkBuffer.length,
      'User-Agent': 'xyzw-publish',
    },
  }, apkBuffer);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (uploadResp.status !== 201) {
    console.error(`上传失败: HTTP ${uploadResp.status}`, uploadResp.body);
    process.exit(1);
  }

  const asset = JSON.parse(uploadResp.body);
  console.log(`✅ 上传成功! (${elapsed}s)`);
  console.log(`   下载: ${asset.browser_download_url}`);
  console.log(`\n🎉 Release ${TAG} 发布完成!`);
}

main().catch(e => { console.error('异常:', e.message); process.exit(1); });
