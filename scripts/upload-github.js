#!/usr/bin/env node
/**
 * 通过 https 模块上传 APK 到 GitHub Release
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 获取 Token
let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  try {
    const out = execSync('(echo protocol=https & echo host=github.com) | git credential fill',
      { encoding: 'utf-8', cwd: ROOT, shell: 'cmd.exe' });
    const m = out.match(/password=(.+)/);
    if (m) TOKEN = m[1].trim();
  } catch (e) {}
}
if (!TOKEN) { console.error('无法获取 GitHub Token'); process.exit(1); }

const REPO = '15322781623-sudo/xiaohuahuabuzaixian';
const RELEASE_ID = 344101471;
const APK_PATH = join(ROOT, 'xyzw-helper.apk');
const ASSET_NAME = 'xyzw-helper.apk';

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.setTimeout(300000); // 5分钟
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('📦 上传 APK 到 GitHub Release...\n');

  // 1. 获取 release 信息（通过 api.github.com）
  console.log('获取 Release 信息...');
  const relResp = await httpsRequest({
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${REPO}/releases/${RELEASE_ID}`,
    method: 'GET',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'xyzw-publish-script',
    },
  });
  
  if (relResp.status !== 200) {
    console.error('获取 Release 失败:', relResp.status, relResp.body);
    process.exit(1);
  }
  
  const release = JSON.parse(relResp.body);
  console.log(`✅ Release: ${release.tag_name}`);

  // 2. 删除已有的同名 asset
  const existing = release.assets?.find(a => a.name === ASSET_NAME);
  if (existing) {
    console.log(`🗑️  删除旧资源: ${existing.name}...`);
    const delResp = await httpsRequest({
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${REPO}/releases/assets/${existing.id}`,
      method: 'DELETE',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'xyzw-publish-script',
      },
    });
    if (delResp.status !== 204) {
      console.error('删除旧资源失败:', delResp.status);
      process.exit(1);
    }
    console.log('   ✅ 已删除');
  }

  // 3. 上传新 APK（通过 uploads.github.com）
  const apkBuffer = readFileSync(APK_PATH);
  console.log(`📤 上传 APK (${(apkBuffer.length / 1024 / 1024).toFixed(2)}MB)...`);
  
  const startTime = Date.now();
  const uploadResp = await httpsRequest({
    hostname: 'uploads.github.com',
    port: 443,
    path: `/repos/${REPO}/releases/${RELEASE_ID}/assets?name=${encodeURIComponent(ASSET_NAME)}`,
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkBuffer.length,
      'User-Agent': 'xyzw-publish-script',
    },
  }, apkBuffer);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (uploadResp.status !== 201) {
    console.error(`上传失败: HTTP ${uploadResp.status}`);
    console.error(uploadResp.body);
    process.exit(1);
  }

  const asset = JSON.parse(uploadResp.body);
  console.log(`✅ 上传成功! (${elapsed}s)`);
  console.log(`   文件名: ${asset.name}`);
  console.log(`   大小: ${(asset.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   下载: ${asset.browser_download_url}`);
  console.log(`\n🎉 发布完成!`);
}

main().catch(e => { console.error('发布异常:', e.message); process.exit(1); });
