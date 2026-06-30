/**
 * Node.js ESM 自定义 loader hook
 * 解决 Vite 项目中无扩展名导入在 Node.js ESM 下的兼容问题
 * 同时处理 JSON 导入所需的 import attributes
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  // 处理 JSON 导入：自动添加 import attributes
  if (specifier.endsWith('.json')) {
    try {
      return await nextResolve(specifier, {
        ...context,
        importAttributes: { ...context.importAttributes, type: 'json' },
      });
    } catch {
      return nextResolve(specifier, context);
    }
  }

  // 对相对路径且无扩展名的导入，尝试添加 .js
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[a-zA-Z0-9]+$/.test(specifier)
  ) {
    try {
      return await nextResolve(specifier + '.js', context);
    } catch {
      // fallback
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // 为 JSON 文件设置正确的格式
  if (url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf-8');
    return {
      format: 'json',
      source,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
