#!/usr/bin/env node

/**
 * 应用宝协议服务（yyb-go）dev 模式自动拉起
 * - 服务已在运行：直接跳过
 * - 存在 yyb-go.exe：后台静默启动（日志写入 yyb_go.rar/yyb-go.log）
 * - 未构建：打印提示，不阻塞 dev 启动
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const yybDir = path.join(__dirname, '..', 'yyb_go.rar');
const exePath = path.join(yybDir, 'yyb-go.exe');
const logPath = path.join(yybDir, 'yyb-go.log');

function healthOk() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port: 8000, path: '/health', timeout: 1500 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

(async () => {
  if (await healthOk()) {
    console.log('[yyb] 应用宝服务已在运行 (127.0.0.1:8000)');
    return;
  }

  if (!fs.existsSync(exePath)) {
    console.log('[yyb] 未找到 yyb-go.exe，跳过自动启动');
    console.log('[yyb] 构建方法: powershell -ExecutionPolicy Bypass -File .tools/build-yyb.ps1');
    return;
  }

  try {
    const out = fs.openSync(logPath, 'a');
    const child = spawn(exePath, ['-host', '127.0.0.1', '-port', '8000'], {
      cwd: yybDir,
      detached: true,
      stdio: ['ignore', out, out],
      windowsHide: true,
    });
    child.unref();

    // 等待服务就绪（最多 5 秒）
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await healthOk()) {
        console.log('[yyb] 应用宝服务已自动启动 (127.0.0.1:8000)');
        return;
      }
    }
    console.log('[yyb] 应用宝服务启动中，日志: ' + logPath);
  } catch (e) {
    console.log('[yyb] 应用宝服务启动失败: ' + (e && e.message));
  }
})();
