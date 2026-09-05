#!/usr/bin/env node
/**
 * JS 混淆加密脚本
 *
 * 两阶段处理：
 *   1. terser  —— 压缩（删死代码、短变量名、去注释）
 *   2. javascript-obfuscator —— 真混淆（字符串抽离加密、自防御、Unicode 转义）
 *
 * 说明：仅 terser 属于压缩而非混淆，产物格式化后仍可直接阅读。
 * 真正的资产在 assets/public/*.js 与 game.html 内联脚本中，必须走第二阶段。
 *
 * 用法：
 *   node scripts/obfuscate-dist.cjs                 # 默认 medium 档
 *   node scripts/obfuscate-dist.cjs --level=low     # 低强度（体积/性能优先）
 *   node scripts/obfuscate-dist.cjs --level=high    # 高强度（防护优先，体积与耗时显著增加）
 *   node scripts/obfuscate-dist.cjs --only=index    # 只处理文件名含指定串的文件（试跑用）
 *   node scripts/obfuscate-dist.cjs --skip-terser   # 跳过 terser 预处理
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

// 跳过的目录（游戏引擎/第三方代码，混淆会破坏）
const SKIP_DIRS = new Set(['game']);
// 跳过的文件名
const SKIP_FILES = ['_worker.js', 'scheduler-worker.js'];
// 跳过的文件名匹配
const SKIP_PATTERNS = [/\.min\./, /cocos2d-js-min/];

// ========== 参数解析 ==========
const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const LEVEL = argOf('level', 'medium');
const ONLY = argOf('only', null);
const SKIP_TERSER = hasFlag('skip-terser');

// ========== 混淆档位 ==========
// 公共基线：这些选项不能开，否则会破坏 Vite ESM 产物或库调用
const BASE_OPTIONS = {
  compact: true,
  // Vite 产物是 ES module，重命名全局标识符会破坏 export/import
  renameGlobals: false,
  // 属性重命名会破坏 DOM API、第三方库的参数对象，风险极高
  renameProperties: false,
  transformObjectKeys: false,
  identifierNamesGenerator: 'hexadecimal',
  simplify: true,
  target: 'browser',
  // 不禁用 console：项目依赖日志排查，且会改变运行时行为
  disableConsoleOutput: false,
  debugProtection: false,
  numbersToExpressions: false,
  log: false,
  // 实测（xyzw/index.js 2.1MB）：
  //   关闭 → +20%，开启 → +111%
  // 中文 UTF-8 占 3 字节，转义成 \uXXXX 后占 6 字节，字符串密集的前端代码体积直接翻倍。
  // 而 stringArray + base64 已能隐藏字符串内容（含中文），故默认关闭以保住体积。
  unicodeEscapeSequence: false,
};

// 实测数据（xyzw/index.js 2136.5 KB 单文件，已含 terser 压缩）：
//   A 仅标识符混淆              +20%
//   B stringArray 30%           +35%
//   C stringArray 30% + base64  +36%   ← 默认档，防护/体积比最优
//   D stringArray 60% + base64  +45%
//   任意档位叠加 unicode 转义   +111%  ← 体积翻倍，已全局关闭
const LEVELS = {
  // 极小：仅标识符混淆 + 自防御
  minimal: {
    stringArray: false,
    selfDefending: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
  },
  // 低：字符串抽离但不加密，无运行时解密开销
  low: {
    stringArray: true,
    stringArrayThreshold: 0.3,
    stringArrayEncoding: [],
    selfDefending: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
  },
  // 中（默认）：字符串全量 base64 加密 + 自防御
  // threshold 取 1.0：实测 0.3/0.6/0.85 时域名、API 路径等仍残留明文，
  // 而这些正是逆向时定位核心逻辑的入口；1.0 相比 0.3 仅多约 12% 体积。
  medium: {
    stringArray: true,
    stringArrayThreshold: 1,
    stringArrayEncoding: ['base64'],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    selfDefending: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
  },
  // 高：叠加控制流平坦化 + 死代码注入，体积与耗时显著增加，需实测确认可接受
  high: {
    stringArray: true,
    stringArrayThreshold: 0.6,
    stringArrayEncoding: ['base64'],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    selfDefending: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.3,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.1,
  },
};

const OBF_OPTIONS = { ...BASE_OPTIONS, ...(LEVELS[LEVEL] || LEVELS.medium) };

// ========== terser 配置 ==========
const terserOptions = {
  compress: {
    passes: 1,
    dead_code: true,
    drop_debugger: true,
  },
  mangle: {
    // 不使用 toplevel，避免破坏 ES module 导出
  },
  output: {
    comments: false,
    ascii_only: true,
    beautify: false,
  },
  nameCache: {},
};

// ========== 工具函数 ==========
const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;
const pct = (before, after) => `${after >= before ? '+' : ''}${(((after - before) / before) * 100).toFixed(1)}%`;

function shouldSkip(fileName) {
  return SKIP_FILES.includes(fileName) || SKIP_PATTERNS.some((p) => p.test(fileName));
}

// 说明：早期版本曾对 >2MB 的文件下调 stringArrayThreshold 以控制体积，
// 但主包（4.6MB）恰是核心资产，降级后域名与 API 路径全部残留明文，
// 实测 threshold 1.0 相比 0.3 仅多约 12% 体积，故统一使用配置值。
function optionsFor() {
  return OBF_OPTIONS;
}

function obfuscateCode(code, options = OBF_OPTIONS) {
  return JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode();
}

/** 混淆单个 JS 文件：terser 压缩 → javascript-obfuscator 混淆 */
async function obfuscateFile(filePath) {
  const fileName = path.basename(filePath);

  if (shouldSkip(fileName)) {
    return { skipped: true, reason: 'Worker/引擎文件' };
  }
  if (ONLY && !fileName.includes(ONLY)) {
    return { skipped: true, reason: '未匹配 --only' };
  }

  try {
    const original = fs.readFileSync(filePath, 'utf-8');
    const originalSize = original.length;

    let code = original;
    // 第一步：terser 压缩
    if (!SKIP_TERSER) {
      const result = await minify(code, terserOptions);
      if (result.code) code = result.code;
    }
    const terserSize = code.length;

    // 第二步：javascript-obfuscator 真混淆
    // 注：旧版在此处做 Unicode 转义，实测使体积翻倍且已被 base64 字符串加密覆盖，已移除
    const t0 = Date.now();
    code = obfuscateCode(code, optionsFor(code));
    const cost = Date.now() - t0;

    code = `/* Obfuscated */ ${code}`;
    // 写入前清除只读属性：源文件若带 ReadOnly，vite 拷贝到 dist 后副本继承只读，
    // writeFileSync 会报 EPERM 导致该文件混淆被跳过
    try { fs.chmodSync(filePath, 0o666); } catch {}
    fs.writeFileSync(filePath, code, 'utf-8');

    return { success: true, originalSize, terserSize, obfuscatedSize: code.length, cost };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * 混淆 HTML 中的内联脚本（game.html 含微信环境伪装等核心逻辑，此前完全明文）。
 * 只处理不带 src 的 <script> 块，避免影响外链的游戏引擎文件。
 */
function obfuscateInlineScripts(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const originalSize = html.length;
  const pattern = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;

  let count = 0;
  let skipped = 0;
  let error = null;
  const t0 = Date.now();

  const out = html.replace(pattern, (match, code) => {
    if (error) return match;
    const body = code.trim();
    if (!body) {
      skipped++;
      return match;
    }
    try {
      const obfuscated = obfuscateCode(body);
      count++;
      return match.replace(code, `\n${obfuscated}\n`);
    } catch (err) {
      error = err.message;
      return match;
    }
  });

  if (error) {
    return { error };
  }

  try { fs.chmodSync(filePath, 0o666); } catch {}
  fs.writeFileSync(filePath, out, 'utf-8');
  return { success: true, count, skipped, originalSize, obfuscatedSize: out.length, cost: Date.now() - t0 };
}

// 递归获取所有 JS 文件（顶层跳过 game/ 等第三方目录）
function getJsFiles(dir, depth = 0) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth === 0 && SKIP_DIRS.has(entry.name)) {
        console.log(`  ⏭  跳过目录: ${entry.name}/（游戏引擎/第三方）`);
        continue;
      }
      files.push(...getJsFiles(fullPath, depth + 1));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ========== 主流程 ==========
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  JS 代码混淆加密   [强度: ${LEVEL}]`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  if (!LEVELS[LEVEL]) {
    console.error(`❌ 未知强度档位: ${LEVEL}（可选 low / medium / high）`);
    process.exit(1);
  }
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`❌ dist 目录不存在: ${DIST_DIR}`);
    process.exit(1);
  }

  const jsFiles = getJsFiles(DIST_DIR);
  console.log(`找到 ${jsFiles.length} 个 JS 文件需要处理\n`);

  let totalOriginal = 0;
  let totalObfuscated = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const file of jsFiles) {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const result = await obfuscateFile(file);

    if (result.success) {
      totalOriginal += result.originalSize;
      totalObfuscated += result.obfuscatedSize;
      successCount++;
      console.log(
        `  ✅ ${rel.padEnd(38)} ${fmt(result.originalSize)} → ${fmt(result.obfuscatedSize)} `
        + `(${pct(result.originalSize, result.obfuscatedSize)}) ${(result.cost / 1000).toFixed(1)}s`,
      );
    } else if (result.skipped) {
      skipCount++;
      if (!ONLY || !result.reason.includes('--only')) {
        console.log(`  ⏭  ${rel.padEnd(38)} 跳过 (${result.reason})`);
      }
    } else {
      errorCount++;
      console.error(`  ❌ ${rel}: ${result.error}`);
    }
  }

  // HTML 内联脚本（game.html 等）
  const htmlFiles = fs
    .readdirSync(DIST_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(DIST_DIR, f));

  let htmlCount = 0;
  let htmlOriginal = 0;
  let htmlObfuscated = 0;

  for (const file of htmlFiles) {
    const result = obfuscateInlineScripts(file);
    if (result.error) {
      errorCount++;
      console.error(`  ❌ ${path.basename(file)} 内联脚本: ${result.error}`);
    } else if (result.count > 0) {
      htmlCount += result.count;
      htmlOriginal += result.originalSize;
      htmlObfuscated += result.obfuscatedSize;
      totalOriginal += result.originalSize;
      totalObfuscated += result.obfuscatedSize;
      console.log(
        `  ✅ ${path.basename(file).padEnd(38)} 内联脚本 ${result.count} 块 `
        + `${fmt(result.originalSize)} → ${fmt(result.obfuscatedSize)} `
        + `(${pct(result.originalSize, result.obfuscatedSize)}) ${(result.cost / 1000).toFixed(1)}s`,
      );
    } else {
      console.log(`  ⏭  ${path.basename(file).padEnd(38)} 无内联脚本（跳过 ${result.skipped} 个空块）`);
    }
  }

  console.log('');
  console.log('━━━ 混淆统计 ━━━');
  console.log(`  JS 成功: ${successCount} 个（跳过 ${skipCount} 个，失败 ${errorCount} 个）`);
  console.log(`  HTML 内联脚本: ${htmlCount} 块`);
  if (totalOriginal > 0) {
    console.log(`  总体积: ${fmt(totalOriginal)} → ${fmt(totalObfuscated)} (${pct(totalOriginal, totalObfuscated)})`);
  }
  console.log('');

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('混淆失败:', err);
  process.exit(1);
});
