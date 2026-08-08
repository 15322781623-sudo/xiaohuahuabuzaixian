#!/usr/bin/env node

/**
 * Tauri EXE 构建脚本
 * 支持自动化构建、版本同步、日志输出
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`),
};

// 解析命令行参数
const args = process.argv.slice(2);
const isDebug = args.includes('--debug');
const isClean = args.includes('--clean');
const skipBuild = args.includes('--skip-build');
const noYyb = args.includes('--no-yyb');

// 版本信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const version = packageJson.version;

log.info(`开始构建 EXE 版本: v${version}`);
log.info(`构建模式: ${isDebug ? 'Debug' : 'Release'}`);

// 清理函数
function cleanBuild() {
  log.step('清理构建目录...');
  
  const dirsToClean = [
    'src-tauri/target/release',
    'src-tauri/target/debug',
    'dist'
  ];
  
  dirsToClean.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log.info(`已清理: ${dir}`);
    }
  });
}

// 检查 Rust 工具链
function checkRustToolchain() {
  log.step('检查 Rust 工具链...');
  
  try {
    execSync('cargo --version', { stdio: 'pipe' });
    log.success('Rust 工具链已安装');
  } catch (error) {
    log.error('未找到 Rust 工具链，请先安装: https://rustup.rs/');
    process.exit(1);
  }
  
  try {
    execSync('rustc --version', { stdio: 'pipe' });
    log.success('Rust 编译器已安装');
  } catch (error) {
    log.error('Rust 编译器未正确配置');
    process.exit(1);
  }
}

// 构建前端
function buildFrontend() {
  if (skipBuild) {
    log.warn('跳过前端构建 (--skip-build)');
    return;
  }
  
  log.step('构建前端资源...');
  
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: __dirname
    });
    log.success('前端构建完成');
  } catch (error) {
    log.error('前端构建失败');
    process.exit(1);
  }
}

// 确保应用宝协议服务 (yyb-go.exe) 存在，缺失时尝试用便携 Go 构建
// 返回 true 表示随包分发；--no-yyb 或无 Go 工具链时返回 false（打不含服务的包）
function ensureYybService() {
  log.step('检查应用宝协议服务 (yyb-go)...');
  
  if (noYyb) {
    log.warn('按 --no-yyb 参数跳过应用宝服务打包');
    return false;
  }
  
  const yybDir = path.join(__dirname, 'yyb_go.rar');
  const yybExe = path.join(yybDir, 'yyb-go.exe');
  if (fs.existsSync(yybExe)) {
    log.success('yyb-go.exe 已存在，将随 EXE 一同分发');
    return true;
  }
  
  const goBin = path.join(__dirname, '.tools', 'go', 'bin', 'go.exe');
  if (!fs.existsSync(goBin)) {
    log.warn('未找到 yyb-go.exe 且无便携 Go 工具链（.tools/go），本次打包不包含应用宝服务');
    log.warn('如需包含：先运行 powershell -File .tools/build-yyb.ps1 构建服务');
    return false;
  }
  
  log.info('正在构建 yyb-go...');
  try {
    execSync(`"${goBin}" build -o yyb-go.exe ./cmd/yyb-go`, {
      cwd: yybDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        GOCACHE: path.join(__dirname, '.tools', 'gocache'),
        GOPATH: path.join(__dirname, '.tools', 'gopath'),
        GOPROXY: 'https://goproxy.cn,direct',
      },
    });
    log.success('yyb-go 构建完成');
    return true;
  } catch (error) {
    log.error('yyb-go 构建失败，可使用 --no-yyb 跳过');
    process.exit(1);
  }
}

// 构建 Tauri EXE
function buildTauri(withYyb) {
  log.step('开始构建 Tauri EXE...');
  
  let buildCmd = isDebug ? 'tauri build --debug' : 'tauri build';
  
  // 不打包应用宝服务时，用配置覆盖清空 resources（避免 tauri 因文件缺失报错）
  if (!withYyb) {
    const overridePath = path.join(__dirname, '.tools', 'tauri-no-yyb.json');
    fs.mkdirSync(path.dirname(overridePath), { recursive: true });
    fs.writeFileSync(overridePath, JSON.stringify({ bundle: { resources: [] } }));
    buildCmd += ` --config "${overridePath}"`;
  }
  
  try {
    execSync(buildCmd, {
      stdio: 'inherit',
      cwd: __dirname
    });
    log.success('Tauri EXE 构建完成');
  } catch (error) {
    log.error('Tauri EXE 构建失败');
    process.exit(1);
  }
}

// 复制 yyb-go.exe 到 EXE 产物同目录（直接运行 target/release 主程序时能被自动启动逻辑找到）
function copyYybNextToExe(withYyb) {
  if (!withYyb) return;
  const buildType = isDebug ? 'debug' : 'release';
  const src = path.join(__dirname, 'yyb_go.rar', 'yyb-go.exe');
  const dest = path.join(__dirname, 'src-tauri', 'target', buildType, 'yyb-go.exe');
  try {
    fs.copyFileSync(src, dest);
    log.success(`yyb-go.exe 已复制到 ${dest}`);
  } catch (e) {
    log.warn(`复制 yyb-go.exe 到产物目录失败: ${e.message}`);
  }
}

// 获取构建产物路径
function getBuildOutputPath() {
  const buildType = isDebug ? 'debug' : 'release';
  const exePath = path.join(__dirname, `src-tauri/target/${buildType}/肝王之王.exe`);
  const installerPath = path.join(__dirname, `src-tauri/target/release/bundle/nsis/肝王之王_${version}_x64-setup.exe`);
  
  return {
    exe: exePath,
    installer: installerPath
  };
}

// 显示构建结果
function showBuildResult() {
  const outputPath = getBuildOutputPath();
  
  log.step('构建结果:');
  console.log('\n' + '='.repeat(60));
  log.success('EXE 构建成功!');
  console.log('='.repeat(60));
  
  if (fs.existsSync(outputPath.exe)) {
    const stats = fs.statSync(outputPath.exe);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    log.info(`可执行文件: ${outputPath.exe}`);
    log.info(`文件大小: ${sizeMB} MB`);
  }
  
  if (fs.existsSync(outputPath.installer)) {
    const stats = fs.statSync(outputPath.installer);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    log.info(`安装程序: ${outputPath.installer}`);
    log.info(`文件大小: ${sizeMB} MB`);
  }
  
  console.log('='.repeat(60) + '\n');
}

// 主流程
async function main() {
  const startTime = Date.now();
  
  try {
    // 清理（如果需要）
    if (isClean) {
      cleanBuild();
    }
    
    // 检查环境
    checkRustToolchain();
    
    // 构建前端
    buildFrontend();
    
    // 确保应用宝服务可用
    const withYyb = ensureYybService();
    
    // 构建 Tauri
    buildTauri(withYyb);
    
    // 复制应用宝服务到产物目录
    copyYybNextToExe(withYyb);
    
    // 显示结果
    showBuildResult();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    log.success(`总耗时: ${duration} 秒`);
    
  } catch (error) {
    log.error(`构建过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 运行主流程
main();
