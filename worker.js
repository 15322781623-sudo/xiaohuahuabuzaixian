
// ==================== 配置 ====================
const GITHUB_REPO = '15322781623-sudo/xiaohuahuabuzaixian';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// GitHub 下载加速代理
const GITHUB_PROXY_LIST = [
  'https://ghfast.top/',
  'https://gh-proxy.com/',
  'https://mirror.ghproxy.com/',
];

// 静态兜底配置（R2 和 GitHub 都失败时使用）
const FALLBACK_CONFIG = {
  latestVersion: "2.13.0",
  versionCode: 21300,
  // R2 直连下载（最快最稳）
  downloadUrl: `https://xyzw-apk-updater.15322781623.workers.dev/api/apk/download`,
  // GitHub 原始链接作为备选
  downloadUrlOriginal: `https://github.com/${GITHUB_REPO}/releases/latest/download/肝王之王.apk`,
  changelog: "v2.13.0: 卡密管理系统上线，批量推图每小时自动刷新状态",
  minVersionCode: 21200,
  forceUpdate: true,
};

// ==================== 卡密系统工具函数 ====================

/**
 * 生成随机卡密
 * 格式：XXXX-XXXX-XXXX-XXXX（16位大写字母数字）
 */
function generateCardKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

/**
 * 从 KV 读取卡密数据
 */
async function getCard(kv, cardKey) {
  if (!kv) return null;
  try {
    const raw = await kv.get(`card:${cardKey}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[卡密] 读取失败:', e.message);
    return null;
  }
}

/**
 * 保存卡密数据到 KV
 */
async function saveCard(kv, cardKey, data) {
  if (!kv) throw new Error('CARD_KV 未绑定');
  await kv.put(`card:${cardKey}`, JSON.stringify(data));
}

/**
 * 验证管理员密码
 */
function verifyAdminPassword(password, env) {
  const adminPassword = env.CARD_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[卡密] 未配置 CARD_ADMIN_PASSWORD');
    return false;
  }
  return password === adminPassword;
}

/**
 * 验证当前设备是否已激活（用于管理员接口）
 */
async function verifyDeviceActivated(kv, cardKey, deviceId) {
  if (!cardKey || !deviceId) return false;
  const card = await getCard(kv, cardKey);
  if (!card || card.status !== 'activated') return false;
  return card.deviceId === deviceId;
}

// 缓存
let _cachedVersionInfo = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从 R2 获取版本信息（优先）
 * R2 中存储 version.json 文件，包含版本元数据
 */
async function getVersionFromR2(env) {
  if (!env.APK_BUCKET) return null;
  
  try {
    const obj = await env.APK_BUCKET.get('version.json');
    if (!obj) return null;
    
    const data = await obj.json();
    console.log('[版本] R2 返回:', data.latestVersion);
    return {
      ...data,
      downloadUrl: data.downloadUrl || FALLBACK_CONFIG.downloadUrl,
      downloadUrlOriginal: data.downloadUrlOriginal || FALLBACK_CONFIG.downloadUrlOriginal,
      source: 'r2',
    };
  } catch (e) {
    console.error('[版本] R2 读取失败:', e.message);
    return null;
  }
}

/**
 * 从 GitHub Releases API 获取版本信息（备选）
 */
async function getVersionFromGitHub(env) {
  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'xyzw-apk-updater-worker',
    };
    if (env?.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${env.GITHUB_TOKEN}`;
    }
    const resp = await fetch(GITHUB_API, { headers });
    if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`);

    const release = await resp.json();
    const tagName = release.tag_name || '';
    const versionName = tagName.replace(/^v/, '');
    const parts = versionName.split('.').map(Number);
    const versionCode = (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);

    const apkAsset = release.assets?.find(a => a.name.endsWith('.apk'));
    const downloadUrl = apkAsset?.browser_download_url
      || `https://github.com/${GITHUB_REPO}/releases/download/${tagName}/肝王之王.apk`;

    let changelog = release.body || '';
    changelog = changelog.replace(/^##\s+.*\n?/, '').trim() || versionName;

    console.log('[版本] GitHub 返回:', versionName);
    return {
      latestVersion: versionName,
      versionCode,
      downloadUrl: GITHUB_PROXY_LIST[0] + downloadUrl,
      downloadUrlOriginal: downloadUrl,
      changelog,
      minVersionCode: FALLBACK_CONFIG.minVersionCode,
      forceUpdate: FALLBACK_CONFIG.forceUpdate,
      source: 'github',
      publishedAt: release.published_at,
    };
  } catch (e) {
    console.error('[版本] GitHub API 失败:', e.message);
    return null;
  }
}

/**
 * 获取最新版本信息（R2 优先 → GitHub 备选 → 兜底配置）
 */
async function getVersionInfo(env) {
  // 检查缓存
  if (_cachedVersionInfo && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedVersionInfo;
  }

  // 1. 优先从 R2 获取
  let info = await getVersionFromR2(env);
  
  // 2. R2 失败则从 GitHub 获取
  if (!info) {
    info = await getVersionFromGitHub(env);
  }
  
  // 3. 都失败则使用兜底配置
  if (!info) {
    info = { ...FALLBACK_CONFIG, source: 'fallback' };
    console.log('[版本] 使用兜底配置:', info.latestVersion);
  }

  // 缓存
  _cachedVersionInfo = info;
  _cacheTime = Date.now();
  
  return info;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Admin-Password, X-Device-Id, X-Card-Key',
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ==================== APK 版本管理接口 ====================
    
    // 获取最新版本信息（R2 优先 → GitHub 备选 → 兜底配置）
    if (url.pathname === '/api/apk/version') {
      const versionInfo = await getVersionInfo(env);
      return new Response(JSON.stringify({
        ...versionInfo,
        checkTime: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // APK 下载重定向（返回多个下载源，R2 优先）
    if (url.pathname === '/api/apk/latest') {
      const versionInfo = await getVersionInfo(env);
      const originalUrl = versionInfo.downloadUrlOriginal || versionInfo.downloadUrl;
      
      // 构建下载源列表（R2 最优先）
      const downloadSources = [];
      
      // R2 直连（Cloudflare CDN，最快最稳）
      downloadSources.push({
        url: `${url.origin}/api/apk/download`,
        name: 'Cloudflare R2',
        priority: 1,
      });
      
      // GitHub 加速代理
      GITHUB_PROXY_LIST.forEach((proxy, i) => {
        downloadSources.push({
          url: proxy + originalUrl,
          name: proxy.replace('https://', '').replace('/', ''),
          priority: i + 2,
        });
      });
      
      // GitHub 原始链接（最后备选）
      downloadSources.push({
        url: originalUrl,
        name: 'GitHub 直连',
        priority: 99,
      });
      
      return new Response(JSON.stringify({
        // 首选下载链接（R2）
        downloadUrl: `${url.origin}/api/apk/download`,
        // 原始 GitHub 链接
        originalUrl: originalUrl,
        // Worker 代理链接（兼容旧版）
        workerProxyUrl: `${url.origin}/api/apk/download`,
        // 所有下载源（供客户端测速选择）
        proxyUrls: downloadSources,
        // R2 可用标记
        r2Available: !!env.APK_BUCKET,
        version: versionInfo.latestVersion,
        versionCode: versionInfo.versionCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // APK 下载（R2 优先，GitHub 备选）
    if (url.pathname === '/api/apk/download' || url.pathname.startsWith('/download/')) {
      const versionInfo = await getVersionInfo(env);
      
      try {
        // 优先从 R2 存储桶获取
        if (env.APK_BUCKET) {
          const apkFile = await env.APK_BUCKET.get(`肝王之王_${versionInfo.latestVersion}.apk`);
          if (apkFile) {
            const headers = new Headers(corsHeaders);
            headers.set('Content-Type', 'application/vnd.android.package-archive');
            headers.set('Content-Disposition', `attachment; filename="肝王之王_${versionInfo.latestVersion}.apk"`);
            // 支持 Range 请求（断点续传）
            headers.set('Accept-Ranges', 'bytes');
            // 缓存 1 小时（同一版本不会变化）
            headers.set('Cache-Control', 'public, max-age=3600');
            // CDN 边缘缓存
            headers.set('CDN-Cache-Control', 'public, max-age=86400');
            return new Response(apkFile.body, { headers });
          }
        }

        // R2 没有则从 GitHub 代理下载（优先使用加速链接）
        const downloadUrl = versionInfo.downloadUrl || versionInfo.downloadUrlOriginal;
        console.log('[APK下载] 使用链接:', downloadUrl);

        const githubHeaders = {
          'Accept': 'application/octet-stream',
          'User-Agent': 'xyzw-apk-updater-worker',
        };
        // 只有直连 GitHub 时才需要 Token 认证
        if (downloadUrl.includes('github.com') && env?.GITHUB_TOKEN) {
          githubHeaders['Authorization'] = `token ${env.GITHUB_TOKEN}`;
        }

        const githubResp = await fetch(downloadUrl, {
          headers: githubHeaders,
          redirect: 'follow',
        });

        if (!githubResp.ok) {
          throw new Error(`GitHub download returned ${githubResp.status}`);
        }

        // 流式转发 APK 文件
        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', 'application/vnd.android.package-archive');
        headers.set('Content-Disposition', `attachment; filename="肝王之王-${versionInfo.latestVersion}.apk"`);
        headers.set('Content-Length', githubResp.headers.get('Content-Length') || '');

        return new Response(githubResp.body, {
          status: 200,
          headers,
        });
      } catch (e) {
        console.error('APK 下载代理失败:', e.message);
        return new Response(JSON.stringify({ 
          error: 'APK下载失败: ' + e.message,
          version: versionInfo.latestVersion 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ==================== 卡密激活/管理系统 ====================

    const cardKv = env.CARD_KV;

    // 统一返回辅助函数
    const cardJson = (data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // 检查卡密状态（设备是否匹配）
    if (url.pathname === '/api/card/check' && request.method === 'POST') {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || '').toUpperCase().trim();
        if (!normalizedKey || !deviceId) {
          return cardJson({ success: false, error: '参数不完整' }, 400);
        }
        const card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: '卡密不存在' }, 404);
        }
        if (card.status !== 'activated') {
          return cardJson({ success: false, error: '卡密未激活' }, 400);
        }
        if (card.deviceId !== deviceId) {
          return cardJson({ success: false, error: '设备不匹配' }, 403);
        }
        return cardJson({ success: true, cardKey: normalizedKey, activatedAt: card.activatedAt });
      } catch (e) {
        console.error('[卡密/check] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 激活/验证卡密
    if (url.pathname === '/api/card/verify' && request.method === 'POST') {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || '').toUpperCase().trim();
        if (!normalizedKey || !deviceId) {
          return cardJson({ success: false, error: '参数不完整' }, 400);
        }
        let card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: '卡密不存在' }, 404);
        }
        if (card.status === 'activated') {
          if (card.deviceId === deviceId) {
            return cardJson({ success: true, message: '卡密已激活（当前设备）', activatedAt: card.activatedAt });
          }
          return cardJson({ success: false, error: '卡密已绑定其他设备，请先重置' }, 403);
        }
        // 激活：unused -> activated
        card.status = 'activated';
        card.deviceId = deviceId;
        card.activatedAt = new Date().toISOString();
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: '激活成功', activatedAt: card.activatedAt });
      } catch (e) {
        console.error('[卡密/verify] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 自助重置卡密
    if (url.pathname === '/api/card/reset' && request.method === 'POST') {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || '').toUpperCase().trim();
        if (!normalizedKey) {
          return cardJson({ success: false, error: '参数不完整' }, 400);
        }
        const card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: '卡密不存在' }, 404);
        }
        card.status = 'unused';
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = new Date().toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: '卡密已重置', resetCount: card.resetCount });
      } catch (e) {
        console.error('[卡密/reset] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 管理员：列出所有卡密
    if (url.pathname === '/api/card/list' && request.method === 'GET') {
      try {
        const adminPassword = request.headers.get('X-Admin-Password');
        const deviceId = request.headers.get('X-Device-Id');
        const currentCardKey = (request.headers.get('X-Card-Key') || '').toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: '管理员密码错误' }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: '当前设备未激活或无权限' }, 403);
        }
        const list = await cardKv.list({ prefix: 'card:' });
        const cards = [];
        for (const key of list.keys) {
          const raw = await cardKv.get(key.name);
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            cards.push({
              cardKey: key.name.replace(/^card:/, ''),
              status: data.status || 'unused',
              createdAt: data.createdAt || null,
              deviceId: data.deviceId || null,
              activatedAt: data.activatedAt || null,
              resetCount: data.resetCount || 0,
              lastResetAt: data.lastResetAt || null,
            });
          } catch {
            // 忽略损坏数据
          }
        }
        return cardJson({ success: true, cards });
      } catch (e) {
        console.error('[卡密/list] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 管理员：批量生成卡密
    if (url.pathname === '/api/card/generate' && request.method === 'POST') {
      try {
        const adminPassword = request.headers.get('X-Admin-Password');
        const deviceId = request.headers.get('X-Device-Id');
        const currentCardKey = (request.headers.get('X-Card-Key') || '').toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: '管理员密码错误' }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: '当前设备未激活或无权限' }, 403);
        }
        const { count = 1 } = await request.json();
        const generateCount = Math.min(Math.max(parseInt(count) || 1, 1), 100);
        const keys = [];
        for (let i = 0; i < generateCount; i++) {
          let key = generateCardKey();
          let existing = await getCard(cardKv, key);
          let attempts = 0;
          while (existing && attempts < 10) {
            key = generateCardKey();
            existing = await getCard(cardKv, key);
            attempts++;
          }
          const value = {
            status: 'unused',
            createdAt: new Date().toISOString(),
            resetCount: 0,
            deviceId: null,
            activatedAt: null,
            lastResetAt: null,
          };
          await saveCard(cardKv, key, value);
          keys.push(key);
        }
        return cardJson({ success: true, keys, count: keys.length });
      } catch (e) {
        console.error('[卡密/generate] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 管理员：重置/删除卡密
    if (url.pathname === '/api/card/delete' && request.method === 'POST') {
      try {
        const adminPassword = request.headers.get('X-Admin-Password');
        const deviceId = request.headers.get('X-Device-Id');
        const currentCardKey = (request.headers.get('X-Card-Key') || '').toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: '管理员密码错误' }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: '当前设备未激活或无权限' }, 403);
        }
        const { targetCardKey, action = 'reset' } = await request.json();
        const normalizedTarget = (targetCardKey || '').toUpperCase().trim();
        if (!normalizedTarget) {
          return cardJson({ success: false, error: '参数不完整' }, 400);
        }
        if (action === 'delete') {
          await cardKv.delete(`card:${normalizedTarget}`);
          return cardJson({ success: true, message: '卡密已删除' });
        }
        // 重置
        const card = await getCard(cardKv, normalizedTarget);
        if (!card) {
          return cardJson({ success: false, error: '卡密不存在' }, 404);
        }
        card.status = 'unused';
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = new Date().toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedTarget, card);
        return cardJson({ success: true, message: '卡密已重置', resetCount: card.resetCount });
      } catch (e) {
        console.error('[卡密/delete] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
      }
    }

    // 自助重置卡密（用户无需管理员密码，只需卡密即可重置）
    if (url.pathname === '/api/card/self-reset' && request.method === 'POST') {
      try {
        const { cardKey } = await request.json();
        const normalizedKey = (cardKey || '').toUpperCase().trim();
        if (!normalizedKey) return cardJson({ success: false, error: '缺少卡密' }, 400);

        const card = await getCard(cardKv, normalizedKey);
        if (!card) return cardJson({ success: false, error: '卡密不存在' }, 404);
        if (card.status !== 'activated') return cardJson({ success: false, error: '卡密未激活，无需重置' }, 400);

        card.status = 'unused';
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = new Date().toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: '卡密已重置', resetCount: card.resetCount });
      } catch (e) {
        console.error('[卡密/self-reset] 错误:', e.message);
        return cardJson({ success: false, error: '服务器错误' }, 500);
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
