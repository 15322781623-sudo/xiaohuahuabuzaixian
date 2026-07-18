#!/usr/bin/env node
/**
 * JS 混淆加密脚本 - 使用 terser 进行代码混淆
 * 用于 APK 打包前对 dist/ 目录下的 JS 文件进行深度混淆
 *
 * 用法：
 *   node scripts/obfuscate-dist.js
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// 跳过的目录（游戏引擎/第三方代码，混淆会破坏）
const SKIP_DIRS = new Set(['game']);
// 跳过的文件名
const SKIP_FILES = ['_worker.js', 'scheduler-worker.js'];
// 跳过的文件名匹配
const SKIP_PATTERNS = [/\.min\./, /cocos2d-js-min/];

// 混淆配置 - 安全的 terser 混淆（不破坏 Vite ES module 导出）
const terserOptions = {
  compress: {
    passes: 1,           // 单轮压缩
    dead_code: true,     // 移除死代码
    drop_debugger: true, // 移除 debugger
  },
  mangle: {
    // 不使用 toplevel，避免破坏 ES module 导出
  },
  output: {
    comments: false,     // 移除注释
    ascii_only: true,    // 非ASCII字符转义
    beautify: false,     // 不美化
  },
  nameCache: {},         // 缓存变量名映射
};

// 字符串加密：将字符串转为 Unicode 转义
function encryptStrings(code) {
  // 将中文和特殊字符转为 Unicode 转义序列
  return code.replace(/[^\x00-\x7F]/g, (char) => {
    return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
  });
}

// 混淆单个 JS 文件
async function obfuscateFile(filePath) {
  const fileName = path.basename(filePath);
  
  // 检查文件名是否应跳过
  if (SKIP_FILES.includes(fileName) || SKIP_PATTERNS.some(p => p.test(fileName))) {
    return { skipped: true, reason: 'Worker/引擎文件' };
  }

  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    const originalSize = code.length;

    // 第一步: terser 混淆
    const result = await minify(code, terserOptions);
    if (!result.code) {
      return { skipped: true, reason: 'terser 无输出' };
    }

    // 第二步: 字符串加密
    let obfuscatedCode = encryptStrings(result.code);

    // 第三步: 添加混淆标记头
    const header = '/* Obfuscated */ ';
    obfuscatedCode = header + obfuscatedCode;

    fs.writeFileSync(filePath, obfuscatedCode, 'utf-8');
    
    return {
      success: true,
      originalSize,
      obfuscatedSize: obfuscatedCode.length,
      ratio: ((1 - obfuscatedCode.length / originalSize) * 100).toFixed(1)
    };
  } catch (err) {
    return { error: err.message };
  }
}

// 递归获取所有 JS 文件
function getJsFiles(dir, depth = 0) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过指定目录
      if (depth === 0 && SKIP_DIRS.has(entry.name)) {
        console.log(`  ⏭ 跳过目录: ${entry.name}/（游戏引擎）`);
        continue;
      }
      files.push(...getJsFiles(fullPath, depth + 1));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// 主函数
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  JS 代码混淆加密                      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ dist 目录不存在: ${DIST_DIR}`);
    process.exit(1);
  }

  const jsFiles = getJsFiles(DIST_DIR);
  console.log(`找到 ${jsFiles.length} 个 JS 文件需要处理`);

  let totalOriginal = 0;
  let totalObfuscated = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const file of jsFiles) {
    const fileName = path.relative(path.join(__dirname, '..'), file);
    const result = await obfuscateFile(file);

    if (result.success) {
      totalOriginal += result.originalSize;
      totalObfuscated += result.obfuscatedSize;
      successCount++;
      console.log(`  ✅ ${fileName}: ${result.ratio}% 压缩`);
    } else if (result.skipped) {
      skipCount++;
      console.log(`  ⏭ ${fileName}: 跳过 (${result.reason})`);
    } else {
      errorCount++;
      console.error(`  ❌ ${fileName}: ${result.error}`);
    }
  }

  console.log('');
  console.log('━━━ 混淆统计 ━━━');
  console.log(`  成功: ${successCount} 个文件`);
  console.log(`  跳过: ${skipCount} 个文件`);
  console.log(`  失败: ${errorCount} 个文件`);
  if (totalOriginal > 0) {
    const totalRatio = ((1 - totalObfuscated / totalOriginal) * 100).toFixed(1);
    const sizeMB = (totalObfuscated / 1024 / 1024).toFixed(2);
    console.log(`  总压缩率: ${totalRatio}%`);
    console.log(`  混淆后总大小: ${sizeMB} MB`);
  }
  console.log('');
}

main().catch(err => {
  console.error('混淆失败:', err);
  process.exit(1);
});
