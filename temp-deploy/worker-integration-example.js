/**
 * Worker 集成示例 - 动态代理池
 * 
 * 如何使用这个示例：
 * 1. 将 YOUR_WORKER_URL 替换为你的 Cloudflare Workers 地址
 * 2. 复制 getOptimalProxyList() 函数到你的 main worker.js
 * 3. 用动态代理列表替换 GITHUB_PROXY_LIST 常量
 */

// ==================== 配置 ====================

/** ⚠️ 请替换为你的代理池管理 Worker URL */
const PROXY_MANAGER_URL = 'https://fir-proxy-manager.your-domain.workers.dev';

/**
 * 获取优化后的代理列表（自动选择最快的可用代理）
 */
let _cachedProxies = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

async function getOptimalProxyList(maxCount = 5) {
    const now = Date.now();
    
    // 检查缓存
    if (_cachedProxies && now - _cacheTime < CACHE_TTL) {
        return _cachedProxies.slice(0, maxCount);
    }

    try {
        // 从代理池 API 获取最新列表
        const response = await fetch(`${PROXY_MANAGER_URL}/api/proxy/pool`);
        const data = await response.json();

        if (!data.success || !data.pool.length) {
            console.warn('代理池 API 返回失败，使用默认配置');
            return getDefaultFallbackProxies();
        }

        // 只取可用且延迟最低的代理
        const availableProxies = data.pool
            .filter(p => p.status === 'available')
            .sort((a, b) => a.latency - b.latency)
            .slice(0, maxCount);

        if (availableProxies.length === 0) {
            console.warn('没有可用的代理源，使用默认配置');
            return getDefaultFallbackProxies();
        }

        // 更新缓存
        _cachedProxies = availableProxies;
        _cacheTime = now;

        console.log(`✅ 已加载 ${availableProxies.length} 个最优代理:`);
        availableProxies.forEach((p, i) => {
            console.log(`   #${i + 1} ${p.url} (${p.latency}ms)`);
        });

        return availableProxies.map(p => p.url);
    } catch (e) {
        console.error('获取代理池失败:', e.message);
        return getDefaultFallbackProxies();
    }
}

/**
 * 默认的 fallback 代理列表
 */
function getDefaultFallbackProxies() {
    return [
        'https://ghfast.top/',
        'https://mirror.ghproxy.com/',
        'https://gh-proxy.com/',
    ];
}

/**
 * 测试单个代理的可用性
 */
async function testProxyUrl(proxyUrl, targetUrl = 'https://github.com', timeout = 10000) {
    const start = Date.now();
    
    try {
        const testUrl = proxyUrl + targetUrl;
        
        const response = await fetch(testUrl, {
            method: 'HEAD',
            redirect: 'follow',
            timeout: timeout
        });

        const latency = Date.now() - start;
        
        return {
            success: response.ok,
            url: proxyUrl,
            latency: latency,
            status: response.status,
            message: response.ok ? `延迟 ${latency}ms` : `HTTP ${response.status}`
        };
    } catch (error) {
        return {
            success: false,
            url: proxyUrl,
            error: error.message,
            message: '连接失败'
        };
    }
}

/**
 * 批量测试多个代理（并行执行）
 */
async function batchTestProxies(proxyUrls, targetUrl = 'https://github.com', limit = 10) {
    const results = [];
    
    for (let i = 0; i < Math.min(proxyUrls.length, limit); i++) {
        const result = await testProxyUrl(proxyUrls[i], targetUrl);
        results.push(result);
        
        // 显示进度
        console.log(`[${i + 1}/${Math.min(proxyUrls.length, limit)}] ${result.url}: ${result.message}`);
    }
    
    // 按延迟排序
    results.sort((a, b) => {
        if (!a.success && !b.success) return 0;
        if (!a.success) return 1;
        if (!b.success) return -1;
        return a.latency - b.latency;
    });
    
    return results;
}

// ==================== 使用示例 ====================

/**
 * 示例 1: 在 GitHub Releases API 调用中使用动态代理
 */
async function fetchGitHubReleaseWithProxy(repoOwner, repoName) {
    const proxies = await getOptimalProxyList(3);
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
    
    console.log(`🔄 获取 releases 数据，将尝试 ${proxies.length} 个代理...`);
    
    // 依次尝试每个代理
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const testUrl = proxy + apiUrl;
        
        try {
            console.log(`   尝试代理 #${i + 1}: ${proxy.replace('https://', '')}`);
            
            const response = await fetch(testUrl, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'xyzw-helper-worker'
                },
                timeout: 15000
            });

            if (response.ok) {
                const data = await response.json();
                
                console.log(`✅ 成功！使用的代理：${proxy}`);
                console.log(`   Tag: ${data.tag_name}`);
                console.log(`   Published: ${data.published_at}`);
                
                return data;
            } else {
                console.warn(`❌ 代理 #${i + 1} 返回 HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn(`⚠️  代理 #${i + 1} 请求失败：${error.message}`);
            continue;
        }
    }
    
    throw new Error(`所有 ${proxies.length} 个代理均失败，无法获取 releases 数据`);
}

/**
 * 示例 2: APK 下载时使用智能代理降级
 */
async function downloadApkWithSmartFallback(fileUrl, env) {
    // 优先级 1: R2 存储桶（最快最稳）
    if (env.APK_BUCKET) {
        console.log('📦 使用 R2 直连下载');
        try {
            const apkFile = await env.APK_BUCKET.get('肝王之王.apk');
            return new Response(apkFile.body, {
                headers: {
                    'Content-Type': 'application/vnd.android.package-archive',
                    'Content-Disposition': 'attachment; filename="肝王之王.apk"'
                }
            });
        } catch (e) {
            console.error('R2 下载失败:', e.message);
        }
    }

    // 优先级 2: 代理下载
    console.log('🔄 使用代理下载');
    const proxies = await getOptimalProxyList(3);
    
    for (let i = 0; i < proxies.length; i++) {
        const proxy = proxies[i];
        const testUrl = proxy + fileUrl;
        
        try {
            console.log(`   尝试代理 #${i + 1}: ${proxy.replace('https://', '')}`);
            
            const response = await fetch(testUrl, {
                redirect: 'follow',
                timeout: 60000
            });

            if (response.ok) {
                console.log(`✅ 代理下载成功！`);
                
                const body = await response.text();
                return new Response(body, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } else {
                console.warn(`   ❌ 代理 #${i + 1} 返回 ${response.status}`);
            }
        } catch (e) {
            console.warn(`   ⚠️  代理 #${i + 1} 失败：${e.message}`);
            continue;
        }
    }

    // 全部失败
    throw new Error(`所有代理下载失败，原始 URL: ${fileUrl}`);
}

/**
 * 示例 3: 定期健康检查和缓存刷新
 */
async function startHealthCheckWorker() {
    const CHECK_INTERVAL = 10 * 60 * 1000; // 10 分钟
    
    async function healthCheckLoop() {
        try {
            const proxies = await getOptimalProxyList(10);
            
            console.log('\n========== 代理健康检查 ==========');
            proxies.forEach((p, i) => {
                console.log(`#${i + 1} ${p}`);
            });
            
            console.log('=================================\n');
            
        } catch (error) {
            console.error('健康检查失败:', error.message);
        }
        
        // 循环执行
        setTimeout(healthCheckLoop, CHECK_INTERVAL);
    }
    
    // 启动第一个检查周期
    setTimeout(healthCheckLoop, 1000);
}

// ==================== 导出供其他模块使用 ====================

export {
    // 核心工具函数
    getOptimalProxyList,
    testProxyUrl,
    batchTestProxies,
    
    // 辅助函数
    getOptimalProxyList,
    
    // 使用示例（可选）
    fetchGitHubReleaseWithProxy,
    downloadApkWithSmartFallback,
    startHealthCheckWorker,
};
