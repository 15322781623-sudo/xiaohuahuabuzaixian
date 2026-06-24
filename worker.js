
// APK 版本管理配置（更新APK时修改此处）
// downloadUrl 支持两种模式：
//   1. 外部链接模式（推荐）：直接指向 GitHub Releases 等下载地址
//   2. R2模式："/api/apk/download" — 从 Cloudflare R2 存储桶下载（需启用R2）
const APK_VERSION_CONFIG = {
  latestVersion: "1.1.0",
  versionCode: 2,
  // 外部下载链接（GitHub Releases格式：https://github.com/用户名/仓库名/releases/download/v版本号/文件名.apk）
  downloadUrl: "https://github.com/15322781623-sudo/xyzw-web-helper/releases/latest/download/xyzw-helper.apk",
  changelog: "初始版本发布",
  minVersionCode: 1,  // 低于此版本强制更新
  forceUpdate: false,  // 是否强制更新
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ==================== APK 版本管理接口 ====================
    
    // 获取最新版本信息
    if (url.pathname === '/api/apk/version') {
      const versionInfo = {
        ...APK_VERSION_CONFIG,
        checkTime: new Date().toISOString(),
      };
      return new Response(JSON.stringify(versionInfo), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // APK 下载（外部链接重定向或 R2 存储桶）
    if (url.pathname === '/api/apk/download') {
      const dlUrl = APK_VERSION_CONFIG.downloadUrl;
      
      // 外部链接模式：直接重定向到 GitHub Releases 等外部地址
      if (dlUrl.startsWith('http://') || dlUrl.startsWith('https://')) {
        return Response.redirect(dlUrl, 302);
      }
      
      // R2 模式：从 Cloudflare R2 存储桶获取
      try {
        if (env.APK_BUCKET) {
          const apkFile = await env.APK_BUCKET.get(`xyzw-helper-${APK_VERSION_CONFIG.latestVersion}.apk`);
          if (apkFile) {
            const headers = new Headers(corsHeaders);
            headers.set('Content-Type', 'application/vnd.android.package-archive');
            headers.set('Content-Disposition', `attachment; filename="xyzw-helper-${APK_VERSION_CONFIG.latestVersion}.apk"`);
            return new Response(apkFile.body, { headers });
          }
        }
        
        return new Response(JSON.stringify({ 
          error: 'APK文件暂未上传，请联系开发者',
          version: APK_VERSION_CONFIG.latestVersion 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ==================== 原有代理逻辑 ====================

    // Proxy configuration
    const proxies = [
      {
        prefix: '/api/weixin-long',
        target: 'https://long.open.weixin.qq.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN',
          'Accept': '*/*',
          'Referer': 'https://open.weixin.qq.com/'
        }
      },
      {
        prefix: '/api/weixin',
        target: 'https://open.weixin.qq.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Referer': 'https://open.weixin.qq.com/'
        }
      },
      {
        prefix: '/api/hortor',
        target: 'https://comb-platform.hortorgames.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36',
          'Accept': '*/*',
          'Host': 'comb-platform.hortorgames.com',
          'Connection': 'keep-alive',
          'Content-Type': 'text/plain; charset=utf-8',
          'Origin': 'https://open.weixin.qq.com',
          'Referer': 'https://open.weixin.qq.com/'
        }
      }
    ].sort((a, b) => b.prefix.length - a.prefix.length); // Sort by length descending to match longest prefix first

    // Find matching proxy
    const proxy = proxies.find(p => url.pathname.startsWith(p.prefix));

    if (proxy) {
      // Construct new URL
      const targetUrl = new URL(proxy.target);
      targetUrl.pathname = url.pathname.replace(proxy.prefix, '') || '/';
      targetUrl.search = url.search;

      // Prepare request headers
      const newHeaders = new Headers(request.headers);
      
      // Override headers based on proxy config
      Object.entries(proxy.headers).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      // Special handling for Host header (Cloudflare might override it, but good to set intention)
      if (proxy.headers.Host) {
        newHeaders.set('Host', proxy.headers.Host);
      }

      // Create new request
      const newRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'follow'
      });

      try {
        const response = await fetch(newRequest);
        
        // Re-create response to add CORS headers
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        
        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Serve static assets (Cloudflare Pages)
    // If env.ASSETS is available (e.g. in Cloudflare Pages Functions), use it to fetch static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Default response for non-proxy paths
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
