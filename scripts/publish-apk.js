#!/usr/bin/env node
/**
 * APK 版本发布脚本
 * 
 * 功能：
 * 1. 构建 Android Release APK
 * 2. 更新 Worker 中的版本配置
 * 3. 上传 APK 到 Cloudflare R2（可选）
 * 4. 部署 Worker
 * 
 * 用法：
 *   node scripts/publish-apk.js                    # 交互式发布
 *   node scripts/publish-apk.js --version 1.1.0    # 指定版本号
 *   node scripts/publish-apk.js --changelog "修复XXX" # 指定更新日志
 *   node scripts/publish-apk.js --repo user/repo   # 指定GitHub仓库（自动生成下载链接）
 *   node scripts/publish-apk.js --skip-r2          # 跳过R2上传
 *   node scripts/publish-apk.js --skip-deploy      # 跳过Worker部署
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// 解析命令行参数
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const newVersion = getArg('version');
const changelog = getArg('changelog');
const githubRepo = getArg('repo');  // GitHub仓库: 用户名/仓库名
const newVersionCode = getArg('versionCode');
const forceUpdateFlag = hasFlag('force-update');
const autoConfirm = hasFlag('yes') || hasFlag('y');
const skipR2 = hasFlag('skip-r2');
const skipDeploy = hasFlag('skip-deploy');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  console.log('=== XYZW APK 版本发布工具 ===\n');

  // 1. 确定版本号
  let version = newVersion;
  if (!version) {
    // 读取 build.gradle 中的当前版本
    const buildGradle = readFileSync(join(ROOT_DIR, 'android/app/build.gradle'), 'utf-8');
    const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
    const currentCode = versionCodeMatch ? Number(versionCodeMatch[1]) : 1;
    const newCode = currentCode + 1;
    
    version = await ask(`请输入新版本号 (当前 versionCode: ${currentCode}, 建议: 1.${newCode}.0): `);
    if (!version) {
      version = `1.${newCode}.0`;
      console.log(`使用默认版本号: ${version}`);
    }
  }

  const versionCode = newVersionCode || await ask(`请输入 versionCode (数字): `);
  if (!versionCode || isNaN(Number(versionCode))) {
    console.error('versionCode 必须是数字');
    process.exit(1);
  }

  // 2. 更新日志
  let log = changelog;
  if (!log) {
    log = await ask('请输入更新日志: ');
    if (!log) log = '版本更新';
  }

  const forceUpdate = forceUpdateFlag || autoConfirm || (await ask('是否强制更新？(y/N): ')).toLowerCase() === 'y';

  console.log(`\n📋 发布信息:`);
  console.log(`   版本: ${version}`);
  console.log(`   versionCode: ${versionCode}`);
  console.log(`   更新日志: ${log}`);
  console.log(`   强制更新: ${forceUpdate ? '是' : '否'}`);
  console.log(`   跳过R2: ${skipR2 ? '是' : '否'}`);
  console.log(`   跳过部署: ${skipDeploy ? '是' : '否'}`);

  const confirm = autoConfirm ? 'y' : await ask('\n确认发布? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消');
    rl.close();
    process.exit(0);
  }

  // 3. 更新所有版本号相关文件
  console.log('\n📝 更新版本号...');
  
  // 3.1 更新 build.gradle
  const buildGradlePath = join(ROOT_DIR, 'android/app/build.gradle');
  let buildGradle = readFileSync(buildGradlePath, 'utf-8');
  buildGradle = buildGradle.replace(/def verName = "[^"]*"/, `def verName = "${version}"`);
  writeFileSync(buildGradlePath, buildGradle);
  console.log(`   ✅ build.gradle → ${version}`);
  
  // 3.2 更新 package.json
  const packageJsonPath = join(ROOT_DIR, 'package.json');
  let packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`   ✅ package.json → ${version}`);
  
  // 3.3 更新 tauri.conf.json
  const tauriConfPath = join(ROOT_DIR, 'src-tauri/tauri.conf.json');
  let tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
  tauriConf.version = version;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`   ✅ tauri.conf.json → ${version}`);
  
  // 3.4 更新 version.json
  const versionJsonPath = join(ROOT_DIR, 'version.json');
  let versionJson = JSON.parse(readFileSync(versionJsonPath, 'utf-8'));
  versionJson.latestVersion = version;
  versionJson.versionCode = Number(versionCode);
  versionJson.changelog = `v${version}: ${log}`;
  versionJson.minVersionCode = Number(versionCode) - 100; // 允许降级100个版本
  writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n');
  console.log(`   ✅ version.json → ${version} (code: ${versionCode})`);

  // 4. 更新 Worker 版本配置
  console.log('\n 更新 Worker 版本配置...');
  const workerPath = join(ROOT_DIR, 'worker.js');
  let workerCode = readFileSync(workerPath, 'utf-8');
  workerCode = workerCode.replace(
    /latestVersion:\s*"[^"]*"/,
    `latestVersion: "${version}"`
  );
  workerCode = workerCode.replace(
    /versionCode:\s*\d+/,
    `versionCode: ${versionCode}`
  );
  workerCode = workerCode.replace(
    /changelog:\s*"[^"]*"/,
    `changelog: "v${version}: ${log.replace(/"/g, '\\"')}"`
  );
  workerCode = workerCode.replace(
    /minVersionCode:\s*\d+/,
    `minVersionCode: ${Number(versionCode) - 100}`
  );
  workerCode = workerCode.replace(
    /forceUpdate:\s*(true|false)/,
    `forceUpdate: ${forceUpdate}`
  );
  
  // 如果指定了 --repo，更新下载链接为 GitHub Releases 地址
  if (githubRepo) {
    const downloadUrl = `https://github.com/${githubRepo}/releases/download/v${version}/肝王之王.apk`;
    workerCode = workerCode.replace(
      /downloadUrl:\s*"[^"]*"/,
      `downloadUrl: "${downloadUrl}"`
    );
    console.log(`   📦 GitHub Releases 下载链接: ${downloadUrl}`);
  }
  
  writeFileSync(workerPath, workerCode);
  console.log(`   ✅ Worker 版本配置已更新`);
  
  // 4.1 更新 changelogStore.js
  console.log('\n 更新 changelogStore.js...');
  const changelogStorePath = join(ROOT_DIR, 'src/stores/changelogStore.js');
  let changelogStore = readFileSync(changelogStorePath, 'utf-8');
  
  // 检查是否已有该版本的更新日志
  const versionRegex = new RegExp(`version:\\s*"v${version.replace(/\./g, '\\.')}",`);
  if (!versionRegex.test(changelogStore)) {
    // 添加新的更新日志条目
    const today = new Date().toISOString().split('T')[0];
    const newChangelogEntry = `    {
      version: "v${version}",
      date: "${today}",
      type: "minor",
      title: "${log}",
      features: [
        "${log}",
      ],
    },`;
    
    // 在第一个 changelog 条目之前插入
    changelogStore = changelogStore.replace(
      /const changelogs = ref\(\[\n/,
      `const changelogs = ref([\n${newChangelogEntry}\n`
    );
    writeFileSync(changelogStorePath, changelogStore);
    console.log(`   ✅ changelogStore.js 已添加 v${version} 更新日志`);
  } else {
    console.log(`   ⚠️ changelogStore.js 中已存在 v${version} 的更新日志，跳过`);
  }

  // 5. 同步前端代码到 Android 项目
  console.log('\n🔄 同步前端代码到 Android 项目...');
  try {
    execSync('npx cap sync android', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    console.log('   ✅ Capacitor 同步完成');
  } catch (e) {
    console.error('   ❌ Capacitor 同步失败:', e.message);
    if (!autoConfirm) {
      const cont = await ask('是否继续构建? (y/N): ');
      if (cont.toLowerCase() !== 'y') {
        console.log('已取消');
        process.exit(1);
      }
    }
  }

  // 6. 构建 APK
  console.log('\n🔨 构建 Android Release APK...');
  try {
    execSync('cd android && .\\gradlew.bat assembleRelease', {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    const apkPath = join(ROOT_DIR, `android/app/build/outputs/apk/release/app-release.apk`);
    if (existsSync(apkPath)) {
      console.log(`   ✅ APK 构建成功: ${apkPath}`);
    } else {
      console.warn('   ⚠️ APK 文件未找到，请检查构建输出');
    }
  } catch (e) {
    console.error('   ❌ APK 构建失败:', e.message);
    rl.close();
    process.exit(1);
  }

  // 6. 上传到 R2（如果配置了）
  if (!skipR2) {
    console.log('\n📤 上传 APK 到 Cloudflare R2...');
    const apkFileName = `肝王之王-${version}.apk`;
    const apkPath = join(ROOT_DIR, `android/app/build/outputs/apk/release/肝王之王_${version}.apk`);
    
    if (existsSync(apkPath)) {
      try {
        // 使用 wrangler 上传到 R2
        execSync(`npx wrangler r2 object put apk-bucket/${apkFileName} --file="${apkPath}" --config wrangler.worker.toml`, {
          stdio: 'inherit',
          cwd: ROOT_DIR,
        });
        console.log(`   ✅ 已上传: ${apkFileName}`);
      } catch (e) {
        console.warn('   ⚠️ R2 上传失败（可能未配置 R2 存储桶）:', e.message);
        console.log('   提示: 运行 npx wrangler r2 bucket create apk-bucket 创建存储桶');
      }
    }
  }

  // 7. 部署 Worker
  if (!skipDeploy) {
    console.log('\n 部署 Worker...');
    try {
      execSync('npx wrangler deploy --config wrangler.worker.toml', {
        stdio: 'inherit',
        cwd: ROOT_DIR,
      });
      console.log('   ✅ Worker 部署成功');
    } catch (e) {
      console.error('    Worker 部署失败:', e.message);
    }
  }

  console.log('\n 发布完成！');
  console.log(`   版本: ${version} (code: ${versionCode})`);
  console.log(`   更新日志: ${log}`);
  
  rl.close();
}

main().catch((err) => {
  console.error('发布失败:', err);
  rl.close();
  process.exit(1);
});
