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
 *   node build-apk.cjs --skip-yyb       # 跳过应用宝服务 Go 交叉编译
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

// 应用宝协议服务（yyb-go）Android 交叉编译配置
// arm64-v8a 用 GOOS=android；其余 ABI 的 android 目标强制要求 cgo，
// 改用 GOOS=linux 编译纯 Go 静态二进制（Android 为 Linux 内核，可直接运行）
const YYB_GO_SRC_DIR = path.join(ROOT_DIR, 'yyb_go.rar');
const YYB_GO_ABIS = [
  { abi: 'arm64-v8a', goos: 'android', goarch: 'arm64' },
  { abi: 'armeabi-v7a', goos: 'linux', goarch: 'arm', goarm: '7' },
  { abi: 'x86_64', goos: 'linux', goarch: 'amd64' },
];
const yybSoPath = (abi) => path.join(ANDROID_DIR, 'app', 'src', 'main', 'jniLibs', abi, 'libyybgo.so');
const GO_TOOL_DIR = path.join(ROOT_DIR, '.tools', 'go');

// Cloudflare R2 配置
const R2_BUCKET = 'xyzw-apk';
const WORKER_NAME = 'xyzw-apk-updater';

// ✅ Node.js 22 PATH 提前设置（Capacitor CLI 和 wrangler 均要求 Node >= 22）
const node22Path = 'C:\\node22\\node-v22.16.0-win-x64';
const originalPath = process.env.PATH;
process.env.PATH = `${node22Path};${originalPath}`;

// ========== 参数解析 ==========
const args = process.argv.slice(2);
const BUILD_DEBUG = args.includes('--debug');
const SKIP_FRONTEND = args.includes('--skip-build');
const CLEAN_CACHE = args.includes('--clean');
const SKIP_UPLOAD = args.includes('--skip-upload');
const SKIP_YYB = args.includes('--skip-yyb');
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

/**
 * 手动将 dist 同步到 android/app/src/main/assets/public（等价于 cap copy 的 web 资源部分）。
 *
 * 仅作为 cap sync 失败时的降级方案：cap sync 的 update 阶段会整目录重建
 * capacitor-cordova-android-plugins，在受批量删除保护的环境下会被拦截而失败。
 * 插件列表未变化时，原生侧配置（capacitor.settings.gradle / capacitor.build.gradle）
 * 已是最新，只需同步 web 资源即可安全打包。
 */
const syncWebAssetsManually = () => {
  const src = path.join(ROOT_DIR, 'dist');
  const dest = path.join(ANDROID_DIR, 'app', 'src', 'main', 'assets', 'public');

  if (!fs.existsSync(path.join(src, 'index.html'))) {
    log('dist 不存在，无法手动同步（请先完成前端构建）', 'error');
    return false;
  }

  try {
    fs.rmSync(dest, { recursive: true, force: true });
  } catch (e) {
    // 删除被拦截时退化为覆盖写入，仅残留少量旧文件，不影响功能
    log(`清空 assets/public 失败，改为覆盖写入: ${e.message}`, 'warn');
  }

  try {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  } catch (e) {
    log(`手动同步失败: ${e.message}`, 'error');
    return false;
  }

  log('手动同步 web 资源完成（dist → assets/public）', 'success');
  return true;
};

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

// ========== 应用宝协议服务（yyb-go）Android 交叉编译 ==========
/** 取 yyb-go 源码（.go/.mod/.sum）中最新文件修改时间，用于增量判断 */
const newestYybSourceMtime = () => {
  let newest = 0;
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        // resource 为运行数据（db/头像等），不参与编译产物判断
        if (e.name === 'vendor' || e.name === 'node_modules' || e.name === 'resource') continue;
        walk(full);
      } else if (/\.(go|mod|sum)$/.test(e.name)) {
        const mt = fs.statSync(full).mtimeMs;
        if (mt > newest) newest = mt;
      }
    }
  };
  walk(YYB_GO_SRC_DIR);
  return newest;
};

/**
 * 交叉编译 yyb-go 到 Android 多ABI（产物 libyybgo.so 放入 jniLibs/<abi>）。
 * 非致命：单个 ABI 编译失败不阻断其他 ABI；工具链缺失时沿用已有 .so。
 * @returns {boolean} 构建完成后 jniLibs 是否存在至少一个可用的 libyybgo.so
 */
const buildYybGoForAndroid = () => {
  const srcMtime = newestYybSourceMtime();
  const goExe = path.join(GO_TOOL_DIR, 'bin', process.platform === 'win32' ? 'go.exe' : 'go');
  const toolchainOk = fs.existsSync(goExe) && fs.existsSync(YYB_GO_SRC_DIR);

  let builtOrExisting = 0;
  for (const t of YYB_GO_ABIS) {
    const soPath = yybSoPath(t.abi);
    // 增量判断：.so 比源码新则跳过，节省构建时间
    if (fs.existsSync(soPath) && fs.statSync(soPath).mtimeMs >= srcMtime) {
      const sizeMB = (fs.statSync(soPath).size / 1024 / 1024).toFixed(1);
      log(`libyybgo.so [${t.abi}] 已是最新 (${sizeMB} MB)，跳过编译`, 'success');
      builtOrExisting++;
      continue;
    }
    if (!toolchainOk) {
      if (fs.existsSync(soPath)) {
        log(`Go 工具链或源码缺失，沿用已有 libyybgo.so [${t.abi}]`, 'warn');
        builtOrExisting++;
      } else {
        log(`Go 工具链/源码缺失，[${t.abi}] 无内置服务`, 'warn');
      }
      continue;
    }

    log(`交叉编译应用宝协议服务 (yyb-go) [${t.abi}] (GOOS=${t.goos} GOARCH=${t.goarch}) ...`, 'info');
    fs.mkdirSync(path.dirname(soPath), { recursive: true });

    const env = { ...process.env };
    env.GOROOT = GO_TOOL_DIR;
    env.GOCACHE = path.join(ROOT_DIR, '.tools', 'gocache');
    env.GOPATH = path.join(ROOT_DIR, '.tools', 'gopath');
    env.GOPROXY = 'https://goproxy.cn,direct';
    env.CGO_ENABLED = '0';
    env.GOOS = t.goos;
    env.GOARCH = t.goarch;
    if (t.goarm) env.GOARM = t.goarm; else delete env.GOARM;
    const goBinDir = path.join(GO_TOOL_DIR, 'bin');
    env.PATH = `${goBinDir};${env.PATH}`;
    env.Path = env.PATH;

    try {
      execSync(`"${goExe}" build -ldflags "-s -w" -o "${soPath}" ./cmd/yyb-go`, {
        stdio: 'inherit',
        cwd: YYB_GO_SRC_DIR,
        env,
      });
      const sizeMB = (fs.statSync(soPath).size / 1024 / 1024).toFixed(1);
      log(`libyybgo.so [${t.abi}] 交叉编译完成 (${sizeMB} MB)`, 'success');
      builtOrExisting++;
    } catch (error) {
      if (fs.existsSync(soPath)) {
        log(`[${t.abi}] 交叉编译失败，沿用已有 libyybgo.so (${error.message})`, 'warn');
        builtOrExisting++;
      } else {
        log(`[${t.abi}] 交叉编译失败且无已有 libyybgo.so: ${error.message}`, 'error');
      }
    }
  }

  if (builtOrExisting === 0) {
    log('所有 ABI 均无可用 libyybgo.so，APK 将不内置应用宝服务', 'warn');
    return false;
  }
  log(`应用宝服务内置完成：${builtOrExisting}/${YYB_GO_ABIS.length} 个 ABI`, 'success');
  return true;
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
      log('Capacitor 同步失败，尝试降级为手动同步 web 资源...', 'warn');
      if (!syncWebAssetsManually()) {
        throw new Error('Capacitor 同步失败，且手动同步 web 资源失败');
      }
    } else {
      log('Capacitor 同步完成', 'success');
    }

    // 步骤 4.5: 应用宝协议服务（yyb-go）Android 交叉编译（多ABI，非致命）
    logStep('4.5', '应用宝协议服务 Android 交叉编译 (arm64-v8a/armeabi-v7a/x86_64)');
    if (SKIP_YYB) {
      log('跳过应用宝服务交叉编译 (--skip-yyb)', 'warn');
    } else {
      buildYybGoForAndroid();
    }

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

      // Node 22 PATH 已在脚本顶部设置，wrangler 要求 Node >= 22

      try {
        // 8.1 上传 APK 文件到 R2（使用英文文件名避免编码问题）
        const r2ApkKey = `xyzw_helper_${version}.apk`;
        log(`上传 APK 到 R2: ${r2ApkKey} ...`, 'info');
        execSync(`${wranglerCmd} r2 object put "${R2_BUCKET}/${r2ApkKey}" --file "${destPath}" --remote`, {
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
        execSync(`${wranglerCmd} r2 object put "${R2_BUCKET}/version.json" --file "${tempVersionJson}" --remote`, {
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

