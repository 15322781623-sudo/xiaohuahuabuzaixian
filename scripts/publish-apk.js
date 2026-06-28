#!/usr/bin/env node
/**
 * APK 版本发布脚本（重构版）
 *
 * 功能：
 * 1. 更新 build.gradle 版本号（verName 自动计算 versionCode）
 * 2. 更新 version.json（本地文件）
 * 3. 更新 worker.js FALLBACK_CONFIG
 * 4. 构建前端资源（pnpm build）
 * 5. 同步 Web 资源到 Android（npx cap sync android）
 * 6. 构建 Android Release APK（Gradle assembleRelease）
 * 7. 上传 APK + version.json 到 Cloudflare R2（--remote）
 * 8. 部署 Worker
 *
 * 用法：
 *   node scripts/publish-apk.js                              # 交互式发布
 *   node scripts/publish-apk.js --version 2.10.2 --yes       # 全自动（不询问）
 *   node scripts/publish-apk.js --changelog "修复XXX" --yes   # 指定更新日志
 *   node scripts/publish-apk.js --skip-build                 # 跳过前端构建
 *   node scripts/publish-apk.js --skip-gradle                # 跳过 APK 构建
 *   node scripts/publish-apk.js --skip-r2                    # 跳过R2上传
 *   node scripts/publish-apk.js --skip-deploy                # 跳过Worker部署
 *   node scripts/publish-apk.js --force-update               # 强制用户更新
 *
 * R2 文件名规范（下划线）：肝王之王_2.10.2.apk
 * Worker 查找 key 保持与此一致（worker.js APK_BUCKET.get用下划线）
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ==================== 命令行参数解析 ====================
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const newVersion    = getArg('version');
const changelog     = getArg('changelog');
const forceUpdateFlag = hasFlag('force-update');
const autoConfirm   = hasFlag('yes') || hasFlag('y');
const skipBuild     = hasFlag('skip-build');    // 跳过 pnpm build + cap sync
const skipGradle    = hasFlag('skip-gradle');   // 跳过 Gradle 构建
const skipR2        = hasFlag('skip-r2');        // 跳过 R2 上传
const skipDeploy    = hasFlag('skip-deploy');   // 跳过 Worker 部署

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

// ==================== 工具函数 ====================

/** 从 verName 计算 versionCode（与 build.gradle 逻辑一致）*/
function calcVersionCode(version) {
  const parts = version.split('.');
  const major = parseInt(parts[0] || 0, 10);
  const minor = parseInt(parts[1] || 0, 10);
  const patch = parseInt(parts[2] || 0, 10);
  return major * 10000 + minor * 100 + patch;
}

/** 读取 build.gradle 中的当前 verName */
function getCurrentVerName() {
  const buildGradle = readFileSync(join(ROOT_DIR, 'android/app/build.gradle'), 'utf-8');
  const m = buildGradle.match(/def\s+verName\s*=\s*"([^"]+)"/);
  return m ? m[1] : '0.0.0';
}

/** 执行命令（带错误处理） */
function run(cmd, label, opts = {}) {
  console.log(`\n⏳ ${label}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT_DIR, ...opts });
    console.log(`   ✅ ${label} 完成`);
    return true;
  } catch (e) {
    console.error(`   ❌ ${label} 失败:`, e.message);
    return false;
  }
}

// ==================== 主流程 ====================
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     XYZW APK 版本发布工具 (重构版)    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // ---------- 1. 确定版本号 ----------
  let version = newVersion;
  if (!version) {
    const current = getCurrentVerName();
    const suggested = (() => {
      const parts = current.split('.');
      parts[2] = String(parseInt(parts[2] || 0, 10) + 1);
      return parts.join('.');
    })();
    version = await ask(`请输入新版本号 (当前: ${current}，建议: ${suggested}): `);
    if (!version) {
      version = suggested;
      console.log(`使用建议版本号: ${version}`);
    }
  }

  // 验证版本号格式
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`❌ 版本号格式错误: ${version}（应为 x.y.z）`);
    rl.close();
    process.exit(1);
  }

  const versionCode = calcVersionCode(version);

  // ---------- 2. 更新日志 ----------
  let log = changelog;
  if (!log) {
    log = await ask('请输入更新日志: ');
    if (!log) log = `v${version}: 版本更新`;
  }
  // 确保带版本前缀
  if (!log.startsWith('v')) log = `v${version}: ${log}`;

  // ---------- 3. 强制更新 ----------
  const forceUpdate = forceUpdateFlag ||
    (!autoConfirm && (await ask('是否强制更新? (y/N): ')).toLowerCase() === 'y');

  // ---------- 确认 ----------
  console.log(`\n📋 发布信息:`);
  console.log(`   版本:        ${version}`);
  console.log(`   versionCode: ${versionCode}`);
  console.log(`   更新日志:    ${log}`);
  console.log(`   强制更新:    ${forceUpdate ? '是' : '否'}`);
  console.log(`   跳过前端构建: ${skipBuild ? '是' : '否'}`);
  console.log(`   跳过APK构建: ${skipGradle ? '是' : '否'}`);
  console.log(`   跳过R2上传:  ${skipR2 ? '是' : '否'}`);
  console.log(`   跳过Worker:  ${skipDeploy ? '是' : '否'}`);

  const confirm = autoConfirm ? 'y' : await ask('\n确认发布? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消');
    rl.close();
    process.exit(0);
  }

  // ==================== 更新配置文件 ====================

  // ---------- 4. 更新 build.gradle ----------
  console.log('\n📝 更新 build.gradle...');
  const buildGradlePath = join(ROOT_DIR, 'android/app/build.gradle');
  let buildGradle = readFileSync(buildGradlePath, 'utf-8');
  buildGradle = buildGradle.replace(
    /def\s+verName\s*=\s*"[^"]*"/,
    `def verName = "${version}"`
  );
  writeFileSync(buildGradlePath, buildGradle);
  console.log(`   ✅ verName → ${version}（versionCode 自动计算为 ${versionCode}）`);

  // ---------- 5. 更新 version.json ----------
  console.log('\n📝 更新 version.json...');
  const versionJsonPath = join(ROOT_DIR, 'version.json');
  const versionJson = {
    latestVersion: version,
    versionCode,
    downloadUrl: 'https://xyzw-apk-updater.15322781623.workers.dev/api/apk/download',
    downloadUrlOriginal: 'https://xyzw-apk-updater.15322781623.workers.dev/api/apk/download',
    changelog: log,
    minVersionCode: 10107,
    forceUpdate,
  };
  writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));
  console.log(`   ✅ version.json 已更新`);

  // ---------- 6. 更新 worker.js FALLBACK_CONFIG ----------
  console.log('\n📝 更新 worker.js FALLBACK_CONFIG...');
  const workerPath = join(ROOT_DIR, 'worker.js');
  let workerCode = readFileSync(workerPath, 'utf-8');
  workerCode = workerCode.replace(/latestVersion:\s*"[^"]*"/, `latestVersion: "${version}"`);
  workerCode = workerCode.replace(/versionCode:\s*\d+/, `versionCode: ${versionCode}`);
  workerCode = workerCode.replace(/changelog:\s*"[^"]*"/, `changelog: "${log.replace(/"/g, '\\"')}"`);
  workerCode = workerCode.replace(/minVersionCode:\s*\d+/, `minVersionCode: ${versionCode}`);
  workerCode = workerCode.replace(/forceUpdate:\s*(true|false)/, `forceUpdate: ${forceUpdate}`);
  writeFileSync(workerPath, workerCode);
  console.log(`   ✅ worker.js FALLBACK_CONFIG 已更新`);

  // ==================== 构建流程 ====================

  // ---------- 7. 前端构建 + cap sync ----------
  if (!skipBuild) {
    const buildOk = run('pnpm build', '前端资源构建 (pnpm build)');
    if (!buildOk) {
      console.error('❌ 前端构建失败，终止发布');
      rl.close();
      process.exit(1);
    }
    const syncOk = run('npx cap sync android', 'Capacitor 同步 (cap sync android)');
    if (!syncOk) {
      console.error('❌ Cap sync 失败，终止发布');
      rl.close();
      process.exit(1);
    }
  } else {
    console.log('\n⏭️  跳过前端构建（--skip-build）');
  }

  // ---------- 8. 构建 Android Release APK ----------
  if (!skipGradle) {
    const gradleOk = run(
      'cd android && .\\gradlew.bat assembleRelease --no-daemon',
      'Gradle assembleRelease 构建 APK'
    );
    if (!gradleOk) {
      console.error('❌ APK 构建失败，终止发布');
      rl.close();
      process.exit(1);
    }

    // 检查产物
    const apkSrc = join(ROOT_DIR, 'android/app/build/outputs/apk/release/app-release.apk');
    const apkDest = join(ROOT_DIR, `android/app/build/outputs/apk/release/肝王之王_${version}.apk`);
    if (existsSync(apkSrc)) {
      copyFileSync(apkSrc, apkDest);
      console.log(`   ✅ APK 已复制为: 肝王之王_${version}.apk`);
      // 同时更新根目录的 apk 文件（方便直接分发）
      const apkRoot = join(ROOT_DIR, 'xyzw-helper.apk');
      copyFileSync(apkSrc, apkRoot);
      console.log(`   ✅ 同时更新根目录 xyzw-helper.apk`);
    } else {
      console.warn(`   ⚠️ app-release.apk 未找到，请检查 Gradle 构建输出`);
    }
  } else {
    console.log('\n⏭️  跳过 APK 构建（--skip-gradle）');
  }

  // ==================== 分发流程 ====================

  // ---------- 9. 上传到 R2 ----------
  if (!skipR2) {
    const apkName = `肝王之王_${version}.apk`;  // ✅ 下划线（与 worker.js APK_BUCKET.get 一致）
    const apkPath = join(ROOT_DIR, `android/app/build/outputs/apk/release/${apkName}`);
    const versionJsonPath2 = join(ROOT_DIR, 'version.json');

    console.log('\n📤 上传到 Cloudflare R2...');

    if (existsSync(apkPath)) {
      // 上传 APK（下划线命名，与 Worker 查找 key 一致）
      const r2ApkOk = run(
        `npx wrangler r2 object put "apk-bucket/${apkName}" --file="${apkPath}" --remote --config wrangler.worker.toml`,
        `上传 APK → R2: ${apkName}`
      );
      if (!r2ApkOk) {
        console.warn('   ⚠️ APK 上传失败，可继续后续步骤');
      }
    } else {
      console.warn(`   ⚠️ 未找到 APK 文件: ${apkPath}，跳过上传`);
    }

    // 上传 version.json（前端 App 查询版本信息的来源）
    run(
      `npx wrangler r2 object put "apk-bucket/version.json" --file="${versionJsonPath2}" --remote --config wrangler.worker.toml`,
      `上传 version.json → R2`
    );
  } else {
    console.log('\n⏭️  跳过 R2 上传（--skip-r2）');
  }

  // ---------- 10. 部署 Worker ----------
  if (!skipDeploy) {
    run(
      'npx wrangler deploy --config wrangler.worker.toml',
      '部署 Cloudflare Worker'
    );
  } else {
    console.log('\n⏭️  跳过 Worker 部署（--skip-deploy）');
  }

  // ==================== 完成 ====================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           🎉 发布完成！               ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`   版本:     ${version} (versionCode: ${versionCode})`);
  console.log(`   更新日志: ${log}`);
  console.log(`   R2 APK:  肝王之王_${version}.apk（下划线，与Worker一致）`);
  console.log(`\n   验证地址: https://xyzw-apk-updater.15322781623.workers.dev/api/apk/version`);

  rl.close();
}

main().catch((err) => {
  console.error('❌ 发布失败:', err);
  rl.close();
  process.exit(1);
});
