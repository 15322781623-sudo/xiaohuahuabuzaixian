#!/usr/bin/env node
/**
 * APK 一键构建脚本
 * 版本号唯一数据源：package.json
 * 流程：停止Java进程 → 清理缓存 → 前端构建 → Capacitor同步 → Gradle打包 → 输出APK
 *
 * 用法：
 *   node build-apk.cjs                  # 完整构建 + 上传 R2（Release）
 *   node build-apk.cjs --debug          # 构建 Debug 版本
 *   node build-apk.cjs --skip-build     # 跳过前端构建（仅打包）
 *   node build-apk.cjs --skip-upload    # 跳过 R2 上传
 *   node build-apk.cjs --clean          # 清理 Gradle 缓存后构建
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const ROOT_DIR = __dirname;
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const APK_OUTPUT_DIR = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const VERSION_JSON_PATH = path.join(ROOT_DIR, 'version.json');

// Cloudflare R2 配置
const R2_BUCKET = 'xyzw-apk';
const WORKER_NAME = 'xyzw-apk-updater';

// ========== 参数解析 ==========
const args = process.argv.slice(2);
const BUILD_DEBUG = args.includes('--debug');
const SKIP_FRONTEND = args.includes('--skip-build');
const CLEAN_CACHE = args.includes('--clean');
const SKIP_UPLOAD = args.includes('--skip-upload');
const BUILD_TYPE = BUILD_DEBUG ? 'debug' : 'release';

// ========== 工具函数 ==========
const colors = {
  info: '\x1b[36m',
  success: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

const log = (msg, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[type]}[${timestamp}]${colors.reset} ${msg}`);
};

const logStep = (num, title) => {
  console.log('');
  log(`━━━ 步骤 ${num}: ${title} ━━━`, 'info');
};

const exec = (cmd, options = {}) => {
  const cwd = options.cwd || ROOT_DIR;
  log(`${colors.dim}> ${cmd}${colors.reset}`, 'dim');
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd,
    });
    return true;
  } catch (error) {
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deleteDir = (dir) => {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    log(`跳过删除: ${dir}`, 'warn');
  }
};

// ========== 读取版本号 ==========
const getVersion = () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  const version = pkg.version || '1.0.0';
  const parts = version.split('.').map(Number);
  const versionCode = (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  return { version, versionCode };
};

// ========== 主流程 ==========
const main = async () => {
  const startTime = Date.now();
  const { version, versionCode } = getVersion();

  // 设置正确的 JDK 路径
  process.env.JAVA_HOME = 'C:\\jdk21\\jdk-21.0.8+9';

  console.log('');
  log('╔══════════════════════════════════════╗', 'info');
  log(`║  APK 一键构建  v${version} (${versionCode})`, 'info');
  log(`║  模式: ${BUILD_TYPE.toUpperCase()}${SKIP_FRONTEND ? ' (跳过前端构建)' : ''}${CLEAN_CACHE ? ' (清理缓存)' : ''}`, 'info');
  log('╚══════════════════════════════════════╝', 'info');

  try {
    // 步骤 1: 停止 Java 进程
    logStep(1, '停止 Java 进程');
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM java.exe 2>nul', { shell: true });
      } else {
        execSync('pkill -9 java 2>/dev/null', { shell: true });
      }
      await sleep(1500);
      log('Java 进程已停止', 'success');
    } catch {
      log('无运行中的 Java 进程', 'success');
    }

    // 步骤 2: 清理 Android build 目录
    logStep(2, '清理 Android build 目录');
    deleteDir(path.join(ANDROID_DIR, 'app', 'build'));
    deleteDir(path.join(ANDROID_DIR, 'build'));
    log('Android build 目录已清理', 'success');

    // 步骤 2.5: 可选 - 清理 Gradle 全局缓存
    if (CLEAN_CACHE) {
      log('清理 Gradle 全局缓存...', 'warn');
      const gradleCache = path.join(process.env.USERPROFILE || process.env.HOME, '.gradle', 'caches');
      deleteDir(gradleCache);
      log('Gradle 全局缓存已清理', 'success');
    }

    // 步骤 3: 前端构建
    if (!SKIP_FRONTEND) {
      logStep(3, '前端构建 (npm run build)');
      if (!exec('npm run build')) {
        throw new Error('前端构建失败');
      }
      log('前端构建完成', 'success');
    } else {
      logStep(3, '跳过前端构建 (--skip-build)');
    }

    // 步骤 3.5: JS 代码混淆加密
    logStep('3.5', 'JS 代码混淆加密');
    if (!exec('node scripts/obfuscate-dist.cjs')) {
      log('代码混淆失败，继续构建（使用未混淆代码）', 'warn');
    } else {
      log('代码混淆完成', 'success');
    }

    // 步骤 4: Capacitor 同步
    logStep(4, '同步 Capacitor (npx cap sync android)');
    if (!exec('npx cap sync android')) {
      throw new Error('Capacitor 同步失败');
    }
    log('Capacitor 同步完成', 'success');

    // 步骤 5: Gradle 构建 APK
    logStep(5, `Gradle 构建 ${BUILD_TYPE.toUpperCase()} APK`);
    log('构建可能需要 3-5 分钟，请耐心等待...', 'warn');

    const gradleTask = BUILD_DEBUG ? 'assembleDebug' : 'assembleRelease';
    const gradleCmd = process.platform === 'win32'
      ? `gradlew.bat ${gradleTask}`
      : `./gradlew ${gradleTask}`;

    if (!exec(gradleCmd, { cwd: ANDROID_DIR })) {
      throw new Error('Gradle 构建失败');
    }

    // 步骤 6: 检查输出
    logStep(6, '检查 APK 输出');
    const outputDir = path.join(APK_OUTPUT_DIR, BUILD_TYPE);
    let apkFile = null;

    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.apk'));
      if (files.length > 0) {
        apkFile = path.join(outputDir, files[0]);
      }
    }

    if (!apkFile) {
      throw new Error('APK 生成失败，未找到输出文件');
    }

    const fileStats = fs.statSync(apkFile);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    log(`APK 文件: ${path.basename(apkFile)}`, 'success');
    log(`文件大小: ${fileSizeMB} MB`, 'success');
    log(`构建耗时: ${elapsed}s`, 'success');

    // 步骤 6.5: APK 签名（已取消 - 无开发者证书）
    logStep(6.5, 'APK 签名（已跳过）');
    log('未使用开发者证书，跳过 APK 签名', 'warn');

    // 步骤 7: 复制 APK 到项目根目录
    logStep(7, '复制 APK 到项目根目录');
    const apkName = `肝王之王_${version}.apk`;
    const destPath = path.join(ROOT_DIR, apkName);
    fs.copyFileSync(apkFile, destPath);
    log(`已复制: ${apkName}`, 'success');

    // 步骤 8: 上传到 Cloudflare R2（自动更新）
    if (SKIP_UPLOAD) {
      logStep(8, '跳过 R2 上传 (--skip-upload)');
    } else {
      logStep(8, '上传到 Cloudflare R2');
      const wranglerBin = path.join(ROOT_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
      const wranglerCmd = `node "${wranglerBin}"`;

      // 设置 Node 22 路径（wrangler 要求 Node >= 22）
      const node22Path = 'C:\\node22\\node-v22.16.0-win-x64';
      const originalPath = process.env.PATH;
      process.env.PATH = `${node22Path};${originalPath}`;

      try {
        // 8.1 上传 APK 文件到 R2（使用英文文件名避免编码问题）
        const r2ApkKey = `xyzw_helper_${version}.apk`;
        log(`上传 APK 到 R2: ${r2ApkKey} ...`, 'info');
        execSync(`${wranglerCmd} r2 object put "${R2_BUCKET}/${r2ApkKey}" --file "${destPath}"`, {
          stdio: 'inherit',
          cwd: ROOT_DIR,
        });
        log(`APK 已上传到 R2: ${r2ApkKey}`, 'success');

        // 8.2 生成并上传 version.json
        const versionJson = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf-8'));
        versionJson.latestVersion = version;
        versionJson.versionCode = versionCode;

        const versionJsonStr = JSON.stringify(versionJson, null, 2);
        const tempVersionJson = path.join(ROOT_DIR, '.tmp_version_r2.json');
        fs.writeFileSync(tempVersionJson, versionJsonStr, 'utf-8');

        log(`上传 version.json 到 R2 (版本: ${version}) ...`, 'info');
        execSync(`${wranglerCmd} r2 object put "${R2_BUCKET}/version.json" --file "${tempVersionJson}"`, {
          stdio: 'inherit',
          cwd: ROOT_DIR,
        });
        log(`version.json 已上传到 R2`, 'success');

        // 清理临时文件
        fs.unlinkSync(tempVersionJson);
      } catch (uploadError) {
        log(`R2 上传失败: ${uploadError.message}`, 'warn');
        log('APK 已本地构建成功，可手动上传到 R2', 'warn');
      } finally {
        // 恢复 PATH
        process.env.PATH = originalPath;
      }
    }

    // 总结
    console.log('');
    log('╔══════════════════════════════════════╗', 'success');
    log('║           构建完成!                  ║', 'success');
    log(`║  版本: v${version} (${versionCode})`, 'success');
    log(`║  文件: ${apkName}`, 'success');
    log(`║  大小: ${fileSizeMB} MB`, 'success');
    log(`║  耗时: ${elapsed}s`, 'success');
    log('╚══════════════════════════════════════╝', 'success');
    console.log('');

  } catch (error) {
    log(`构建失败: ${error.message}`, 'error');
    process.exit(1);
  }
};

main();

