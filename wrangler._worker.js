// Cloudflare Workers 代理配置 - 支持微信小程序和蟠桃园活动
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

    // Proxy configuration - 按优先级排序（最长的前缀优先）
    const proxies = [
      // ★ 微信小程序服务域名（蟠桃园等活动的核心需求）
      {
        prefix: '/api/wechat',
        target: 'https://servicewechat.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.3(0x18000303) NetType/WIFI Language/zh_CN',
          'Accept': '*/*',
          'Referer': 'https://servicewechat.com/',
          'Host': 'servicewechat.com',
          'X-WeApp': 'xyzw'
        }
      },
      
      // ★ wx_mini_1 特定域名
      {
        prefix: '/api/wxmini',
        target: 'https://appservice.qq.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 22081212C Build/SKQ1.220303.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 MQQBrowser/12.0 Safari/537.36 MicroMessenger/8.0.3(0x28000219) Process/tools WeChatIMK/1.5.0 HWHWX/12.0 Language/zh_CN ABI/arm64',
          'Accept': 'application/json',
          'Referer': 'https://appservice.qq.com/'
        }
      },
      
      // 微信开放平台（原始配置保留）
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
      
      // 游戏后台服务
      {
        prefix: '/api/ucenter',
        target: 'https://ucenter-app-server.hortorgames.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; 22081212C Build/SKQ1.220303.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/136.0.7103.60 Mobile Safari/537.36',
          'Accept': '*/*',
          'Host': 'ucenter-app-server.hortorgames.com',
          'Connection': 'keep-alive',
          'Content-Type': 'application/json; charset=utf-8'
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
    ];

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

      // Special handling for Host header
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
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Default response for non-proxy paths
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
