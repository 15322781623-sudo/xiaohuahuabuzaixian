import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
  import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "node:child_process";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 应用宝协议服务 dev 托管插件：
 * Web 版浏览器无法拉起本地进程，改由 dev server（Node）托管 yyb-go 的启停，
 * 前端开关通过 /api/yyb-service/{start|stop|status} 控制（仅 dev 环境生效）
 */
function yybServiceDevPlugin() {
  const yybDir = path.resolve(__dirname, "yyb_go.rar");
  const exePath = path.join(yybDir, "yyb-go.exe");
  let child = null;

  const checkRunning = () =>
    new Promise((resolve) => {
      const req = http.get("http://127.0.0.1:8000/health", { timeout: 1500 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
    });

  return {
    name: "yyb-service-dev",
    configureServer(server) {
      server.middlewares.use("/api/yyb-service", async (req, res, next) => {
        const url = (req.url || "").split("?")[0];
        const send = (obj) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
        };
        if (url === "/status") {
          return send({ ok: true, running: await checkRunning() });
        }
        if (url === "/start") {
          if (await checkRunning()) return send({ ok: true, already: true });
          if (!fs.existsSync(exePath)) return send({ ok: false, error: "yyb-go.exe not found" });
          try {
            const out = fs.openSync(path.join(yybDir, "yyb-go.log"), "a");
            const err = fs.openSync(path.join(yybDir, "yyb-go.err.log"), "a");
            child = spawn(exePath, ["-host", "127.0.0.1", "-port", "8000"], {
              cwd: yybDir,
              stdio: ["ignore", out, err],
              windowsHide: true,
            });
            child.on("exit", () => { child = null; });
            return send({ ok: true });
          } catch (e) {
            return send({ ok: false, error: String(e) });
          }
        }
        if (url === "/stop") {
          // 先走服务自身的优雅停机接口，子进程兼底 kill
          try {
            await new Promise((resolve) => {
              const r = http.request("http://127.0.0.1:8000/shutdown", { method: "POST", timeout: 3000 }, (resp) => { resp.resume(); resp.on("end", resolve); });
              r.on("error", resolve);
              r.on("timeout", () => { r.destroy(); resolve(); });
              r.end();
            });
          } catch { /* ignore */ }
          if (child && child.exitCode === null) {
            child.kill();
            child = null;
          }
          return send({ ok: true });
        }
        next();
      });
    },
  };
}

async function safeImport(moduleName, humanName) {
  try {
    return await import(moduleName);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      console.warn(
        `[vite] Optional dependency "${moduleName}" (${humanName}) not found; continuing without it.`,
      );
      return null;
    }
    throw error;
  }
}

export default defineConfig(async () => {
  let basicSsl;
  try {
    ({ default: basicSsl } = await import("@vitejs/plugin-basic-ssl"));
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }
    console.warn(
      "[vite] '@vitejs/plugin-basic-ssl' not found, starting without HTTPS support.",
    );
  }

  const routerModule = await safeImport(
    "unplugin-vue-router/vite",
    "file-based routing",
  );
  const autoImportModule = await safeImport(
    "unplugin-auto-import/vite",
    "auto-imports",
  );
  const componentsModule = await safeImport(
    "unplugin-vue-components/vite",
    "component auto-registration",
  );
  const componentsResolversModule = componentsModule
    ? await safeImport(
        "unplugin-vue-components/resolvers",
        "component resolvers",
      )
    : null;
  const unoCssModule = await safeImport("unocss/vite", "UnoCSS");
  const vueDevToolsModule = await safeImport(
    "vite-plugin-vue-devtools",
    "Vue DevTools",
  );
  const vueI18nModule = await safeImport(
    "@intlify/unplugin-vue-i18n/vite",
    "Vue I18n pre-compiler",
  );

  const routerPlugin = routerModule?.default?.({
    routesFolder: "src/views",
    logs: true,
    exclude: ["**/components/**", "**/test**.vue", "**/**Modal.vue"],
    importMode: "async",
    dts: "src/typed-router.d.ts",
  });

  const autoImportPlugin = autoImportModule?.default?.({
    imports: ["vue", "vue-router", "vue-i18n"],
    dts: "src/auto-imports.d.ts",
  });

  const { ArcoResolver } = componentsResolversModule ?? {};
  const componentsPlugin = componentsModule?.default?.({
    dirs: ["src/components"],
    resolvers: ArcoResolver
      ? [
          ArcoResolver({
            importStyle: false,
          }),
        ]
      : [],
  });

  const unoCssPlugin = unoCssModule?.default?.();
  const vueDevToolsPlugin = vueDevToolsModule?.default?.();
  const vueI18nPlugin = vueI18nModule?.default?.({
    module: "vue-i18n",
    include: path.resolve(__dirname, "./src/locales/**"),
  });

  const plugins = [
    yybServiceDevPlugin(),
    routerPlugin && { ...routerPlugin, enforce: "pre" },
    vue(),
    vueDevToolsPlugin,
    basicSsl && basicSsl(),
    unoCssPlugin,
    autoImportPlugin,
    componentsPlugin,
    vueI18nPlugin,
    {
      name: "copy-worker",
      closeBundle() {
        try {
          const src = path.resolve(__dirname, "worker.js");
          // Cloudflare Pages Advanced Mode expects _worker.js
          const dest = path.resolve(__dirname, "dist/_worker.js");
          if (fs.existsSync(src)) {
            if (!fs.existsSync(path.dirname(dest))) {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
            }
            fs.copyFileSync(src, dest);
            console.log("\n[copy-worker] worker.js copied to dist/_worker.js");
          } else {
            console.warn("\n[copy-worker] worker.js not found at " + src);
          }
        } catch (e) {
          console.error("\n[copy-worker] Error copying worker.js:", e);
        }
      },
    },
  ].filter(Boolean);

  // ✅ 从 package.json 自动读取 APK 版本号（单一数据源），构建时注入到全局变量
  let apkVersionName = '1.0.0';
  let apkVersionCode = 1;
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
    apkVersionName = pkgJson.version || '1.0.0';
    const parts = apkVersionName.split('.').map(Number);
    apkVersionCode = (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
    console.log(`[vite] APK版本: ${apkVersionName} (code: ${apkVersionCode})`);
  } catch (e) {
    console.warn('[vite] 无法读取 package.json，使用默认版本号');
  }

  return {
    plugins,
    // ✅ 构建时注入 APK 版本号，useApkUpdate.js 中可直接使用
    define: {
      __APK_VERSION_NAME__: JSON.stringify(apkVersionName),
      __APK_VERSION_CODE__: JSON.stringify(apkVersionCode),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@views": path.resolve(__dirname, "src/views"),
        "@assets": path.resolve(__dirname, "src/assets"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@api": path.resolve(__dirname, "src/api"),
        "@stores": path.resolve(__dirname, "src/stores"),
      },
    },
    build: {
      target: 'es2017',
      minify: 'terser',
      terserOptions: {
        compress: {
          // drop_console: true,   // 移除 console.log - ❌ 临时禁用以调试版本号注入
          drop_debugger: true,  // 移除 debugger
          // pure_funcs: ['console.log', 'console.info'], // 额外清除
          passes: 2,            // 多轮压缩优化
        },
        mangle: {
          toplevel: true,       // 混淆顶层变量名
          safari10: true,
        },
        output: {
          comments: false,      // 移除注释
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      host: true,
      proxy: {
        // 微信登录接口代理
        "/api/weixin": {
          target: "https://open.weixin.qq.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/weixin/, ""),
          secure: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            Referer: "https://open.weixin.qq.com/",
          },
        },
        // 微信扫码状态轮询代理
        "/api/weixin-long": {
          target: "https://long.open.weixin.qq.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/weixin-long/, ""),
          secure: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
            Accept: "*/*",
            Referer: "https://open.weixin.qq.com/",
          },
        },
        // Hortor登录接口代理
        "/api/hortor": {
          target: "https://comb-platform.hortorgames.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hortor/, ""),
          secure: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36",
            Accept: "*/*",
            Host: "comb-platform.hortorgames.com",
            Connection: "keep-alive",
            "Content-Type": "text/plain; charset=utf-8",
            Origin: "https://open.weixin.qq.com",
            Referer: "https://open.weixin.qq.com/",
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/variables.scss" as vars;',
        },
      },
    },
  };
});
