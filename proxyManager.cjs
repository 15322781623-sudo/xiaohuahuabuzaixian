/**
 * Fir-Proxy 代理池集成工具
 * 
 * 功能：
 * 1. 从本地 fir-proxy 读取代理列表
 * 2. 从 Cloudflare Worker 获取动态代理
 * 3. 自动测试代理可用性
 * 4. 提供统一的代理获取接口
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    // fir-proxy 本地安装路径
    LOCAL_PROXY_DIR: path.join(__dirname, 'fir-proxy', 'fir-proxy - 1.2'),
    
    // Cloudflare Worker URL（如果已部署）
    WORKER_URL: process.env.PROXY_WORKER_URL || 'https://fir-proxy-manager.your-domain.workers.dev',
    
    // 代理缓存时间（毫秒）
    CACHE_TTL: 5 * 60 * 1000, // 5 分钟
    
    // 最大代理数量
    MAX_PROXIES: 10,
};

// 缓存
let proxyCache = {
    http: [],
    socks5: [],
    timestamp: 0,
};

/**
 * 从本地 fir-proxy 读取代理列表
 */
function loadLocalProxies() {
    try {
        const httpFile = path.join(CONFIG.LOCAL_PROXY_DIR, 'http.txt');
        const socks5File = path.join(CONFIG.LOCAL_PROXY_DIR, 'git.txt'); // SOCKS5 代理
        
        let httpProxies = [];
        let socks5Proxies = [];
        
        // 读取 HTTP 代理
        if (fs.existsSync(httpFile)) {
            const content = fs.readFileSync(httpFile, 'utf-8');
            httpProxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(line));
        }
        
        // 读取 SOCKS5 代理
        if (fs.existsSync(socks5File)) {
            const content = fs.readFileSync(socks5File, 'utf-8');
            socks5Proxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(line));
        }
        
        console.log(`[代理池] 从本地加载了 ${httpProxies.length} 个 HTTP 代理，${socks5Proxies.length} 个 SOCKS5 代理`);
        
        return {
            http: httpProxies.slice(0, CONFIG.MAX_PROXIES),
            socks5: socks5Proxies.slice(0, CONFIG.MAX_PROXIES),
        };
    } catch (error) {
        console.error('[代理池] 读取本地代理失败:', error.message);
        return { http: [], socks5: [] };
    }
}

/**
 * 测试单个代理的可用性
 */
async function testProxy(proxyUrl, timeout = 5000) {
    const https = require('https');
    const http = require('http');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const { HttpProxyAgent } = require('http-proxy-agent');
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const options = {
            timeout: timeout,
            agent: proxyUrl.startsWith('socks5://') 
                ? new SocksProxyAgent(proxyUrl)
                : new HttpsProxyAgent(proxyUrl),
        };
        
        const req = https.get('https://www.google.com', options, (res) => {
            const latency = Date.now() - startTime;
            resolve({
                success: res.statusCode === 200,
                proxy: proxyUrl,
                latency: latency,
                statusCode: res.statusCode,
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                proxy: proxyUrl,
                error: error.message,
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                proxy: proxyUrl,
                error: 'Timeout',
            });
        });
    });
}

/**
 * 批量测试代理并返回可用的代理（按延迟排序）
 */
async function testProxiesBatch(proxies, maxTests = 10, timeout = 5000) {
    const testPromises = proxies.slice(0, maxTests).map(proxy => 
        testProxy(proxy.startsWith('http') ? proxy : `http://${proxy}`, timeout)
    );
    
    const results = await Promise.all(testPromises);
    
    return results
        .filter(r => r.success)
        .sort((a, b) => a.latency - b.latency)
        .map(r => r.proxy);
}

/**
 * 从 Cloudflare Worker 获取动态代理
 */
async function fetchWorkerProxies() {
    try {
        const response = await fetch(`${CONFIG.WORKER_URL}/api/proxy/pool`);
        const data = await response.json();
        
        if (!data.success || !data.pool.length) {
            console.warn('[代理池] Worker API 返回失败');
            return [];
        }
        
        // 提取可用的代理 URL
        const proxies = data.pool
            .filter(p => p.status === 'available')
            .sort((a, b) => a.latency - b.latency)
            .slice(0, CONFIG.MAX_PROXIES)
            .map(p => p.url);
        
        console.log(`[代理池] 从 Worker 获取了 ${proxies.length} 个代理`);
        return proxies;
    } catch (error) {
        console.error('[代理池] 从 Worker 获取代理失败:', error.message);
        return [];
    }
}

/**
 * 获取优化后的代理列表（统一接口）
 * 
 * @param {string} source - 代理来源：'local' | 'worker' | 'auto'
 * @param {boolean} testAvailability - 是否测试代理可用性
 * @returns {Promise<{http: string[], socks5: string[]}>}
 */
async function getOptimalProxies(source = 'auto', testAvailability = true) {
    // 检查缓存
    const now = Date.now();
    if (proxyCache.http.length > 0 && now - proxyCache.timestamp < CONFIG.CACHE_TTL) {
        console.log('[代理池] 使用缓存的代理列表');
        return { http: proxyCache.http, socks5: proxyCache.socks5 };
    }
    
    let httpProxies = [];
    let socks5Proxies = [];
    
    // 1. 尝试从本地加载
    if (source === 'local' || source === 'auto') {
        const localProxies = loadLocalProxies();
        httpProxies = localProxies.http;
        socks5Proxies = localProxies.socks5;
    }
    
    // 2. 如果本地没有或失败，尝试从 Worker 获取
    if (source === 'worker' || (source === 'auto' && httpProxies.length === 0)) {
        const workerProxies = await fetchWorkerProxies();
        // Worker 返回的是加速代理 URL，不是普通代理
        // 这里需要区分用途
    }
    
    // 3. 测试代理可用性（可选）
    if (testAvailability && httpProxies.length > 0) {
        console.log('[代理池] 正在测试代理可用性...');
        httpProxies = await testProxiesBatch(httpProxies, 5);
        socks5Proxies = await testProxiesBatch(socks5Proxies, 5);
        console.log(`[代理池] 测试完成，可用代理：HTTP ${httpProxies.length} 个，SOCKS5 ${socks5Proxies.length} 个`);
    }
    
    // 更新缓存
    proxyCache = {
        http: httpProxies,
        socks5: socks5Proxies,
        timestamp: now,
    };
    
    return { http: httpProxies, socks5: socks5Proxies };
}

/**
 * 随机选择一个代理
 */
function getRandomProxy(proxies) {
    if (!proxies || proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

/**
 * 获取最佳代理（延迟最低）
 */
function getBestProxy(proxies) {
    if (!proxies || proxies.length === 0) return null;
    return proxies[0]; // 已经按延迟排序
}

// ==================== 导出 API ====================

module.exports = {
    // 核心功能
    getOptimalProxies,
    loadLocalProxies,
    testProxy,
    testProxiesBatch,
    
    // 辅助函数
    getRandomProxy,
    getBestProxy,
    
    // 配置
    CONFIG,
};

// ==================== CLI 模式（直接运行测试） ====================

if (require.main === module) {
    (async () => {
        console.log('=== Fir-Proxy 代理池测试 ===\n');
        
        // 1. 加载本地代理
        console.log('1. 读取本地代理...');
        const localProxies = loadLocalProxies();
        console.log(`   HTTP: ${localProxies.http.length} 个`);
        console.log(`   SOCKS5: ${localProxies.socks5.length} 个`);
        
        // 2. 测试代理（前 5 个）
        console.log('\n2. 测试前 5 个 HTTP 代理...');
        const testedHttp = await testProxiesBatch(localProxies.http, 5);
        console.log(`   可用：${testedHttp.length} 个`);
        testedHttp.forEach((proxy, i) => {
            console.log(`   ${i + 1}. ${proxy}`);
        });
        
        // 3. 测试 SOCKS5 代理
        console.log('\n3. 测试前 5 个 SOCKS5 代理...');
        const testedSocks5 = await testProxiesBatch(localProxies.socks5, 5);
        console.log(`   可用：${testedSocks5.length} 个`);
        testedSocks5.forEach((proxy, i) => {
            console.log(`   ${i + 1}. ${proxy}`);
        });
        
        console.log('\n=== 测试完成 ===');
    })();
}
