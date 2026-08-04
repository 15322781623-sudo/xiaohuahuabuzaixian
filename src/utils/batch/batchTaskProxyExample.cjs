/**
 * 批量任务代理池集成示例
 * 
 * 功能：
 * 1. 在批量任务执行时使用代理轮换
 * 2. 自动失败重试，切换到下一个代理
 * 3. 代理质量评分和智能选择
 * 4. 并发控制，避免代理过载
 */

const proxyManager = require('../proxyManager.cjs');

// ==================== 批量任务代理池 ====================

class BatchTaskProxyPool {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 5; // 最大并发数
        this.retryCount = options.retryCount || 3; // 失败重试次数
        this.proxyTimeout = options.proxyTimeout || 10000; // 代理超时（毫秒）
        
        this.proxies = [];
        this.currentIndex = 0;
        this.proxyScores = new Map(); // 代理质量评分
    }
    
    /**
     * 初始化代理池
     */
    async init() {
        console.log('[批量任务代理池] 正在初始化...');
        
        // 加载代理（不测试，直接使用，提高速度）
        const result = await proxyManager.getOptimalProxies('local', false);
        
        this.proxies = [
            ...result.http.map(p => ({ type: 'http', url: p })),
            ...result.socks5.map(p => ({ type: 'socks5', url: p })),
        ];
        
        console.log(`[批量任务代理池] 加载了 ${this.proxies.length} 个代理`);
        console.log(`  - HTTP: ${result.http.length} 个`);
        console.log(`  - SOCKS5: ${result.socks5.length} 个`);
        
        if (this.proxies.length === 0) {
            console.warn('[批量任务代理池] 没有可用代理，将使用直连模式');
        }
    }
    
    /**
     * 获取下一个代理（轮换）
     */
    getNextProxy() {
        if (this.proxies.length === 0) {
            return null; // 无代理，使用直连
        }
        
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        
        return proxy;
    }
    
    /**
     * 记录代理使用结果（用于质量评分）
     */
    recordProxyResult(proxy, success, latency) {
        const key = `${proxy.type}:${proxy.url}`;
        
        if (!this.proxyScores.has(key)) {
            this.proxyScores.set(key, {
                successCount: 0,
                failCount: 0,
                totalLatency: 0,
            });
        }
        
        const score = this.proxyScores.get(key);
        
        if (success) {
            score.successCount++;
            score.totalLatency += latency;
        } else {
            score.failCount++;
        }
    }
    
    /**
     * 获取最佳代理（基于历史评分）
     */
    getBestProxy(topN = 5) {
        if (this.proxies.length === 0) return [];
        
        // 按评分排序
        const sorted = this.proxies
            .map(proxy => {
                const key = `${proxy.type}:${proxy.url}`;
                const score = this.proxyScores.get(key) || {
                    successCount: 0,
                    failCount: 0,
                    totalLatency: 0,
                };
                
                const successRate = score.successCount / (score.successCount + score.failCount + 1);
                const avgLatency = score.successCount > 0 
                    ? score.totalLatency / score.successCount 
                    : Infinity;
                
                return {
                    proxy,
                    successRate,
                    avgLatency,
                    score: successRate * 100 - (avgLatency === Infinity ? 1000 : avgLatency / 100),
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, topN)
            .map(item => item.proxy);
        
        return sorted;
    }
    
    /**
     * 执行单个任务（带代理重试）
     */
    async executeTaskWithProxy(taskFn, taskId) {
        let lastError = null;
        
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            const proxy = this.getNextProxy();
            
            if (!proxy) {
                // 无代理，直接执行
                console.log(`[任务 ${taskId}] 无代理，使用直连 (尝试 ${attempt + 1}/${this.retryCount})`);
                
                try {
                    const startTime = Date.now();
                    const result = await taskFn(null);
                    const latency = Date.now() - startTime;
                    
                    console.log(`[任务 ${taskId}] ✅ 直连成功 (${latency}ms)`);
                    return { success: true, result, proxy: null, latency };
                } catch (error) {
                    lastError = error;
                    console.warn(`[任务 ${taskId}] ❌ 直连失败: ${error.message}`);
                    continue;
                }
            }
            
            console.log(`[任务 ${taskId}] 使用 ${proxy.type} 代理: ${proxy.url} (尝试 ${attempt + 1}/${this.retryCount})`);
            
            try {
                const startTime = Date.now();
                const result = await taskFn(proxy);
                const latency = Date.now() - startTime;
                
                // 记录成功
                this.recordProxyResult(proxy, true, latency);
                
                console.log(`[任务 ${taskId}] ✅ 代理成功 (${latency}ms)`);
                return { success: true, result, proxy, latency };
                
            } catch (error) {
                lastError = error;
                
                // 记录失败
                this.recordProxyResult(proxy, false, 0);
                
                console.warn(`[任务 ${taskId}] ❌ 代理失败: ${error.message}`);
                console.log(`[任务 ${taskId}] 切换到下一个代理...`);
            }
        }
        
        // 所有尝试都失败
        console.error(`[任务 ${taskId}] ❌ 所有尝试都失败`);
        return { success: false, error: lastError, proxy: null };
    }
    
    /**
     * 批量执行任务（带并发控制）
     */
    async executeBatch(tasks) {
        console.log(`\n[批量任务] 开始执行 ${tasks.length} 个任务，并发数: ${this.maxConcurrent}\n`);
        
        const results = [];
        
        // 分批执行
        for (let i = 0; i < tasks.length; i += this.maxConcurrent) {
            const batch = tasks.slice(i, i + this.maxConcurrent);
            
            console.log(`\n[批量任务] 执行第 ${i + 1}-${Math.min(i + this.maxConcurrent, tasks.length)} 个任务\n`);
            
            const promises = batch.map((task, idx) => 
                this.executeTaskWithProxy(task.fn, task.id || `task-${i + idx + 1}`)
            );
            
            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            
            // 统计
            const successCount = batchResults.filter(r => r.success).length;
            console.log(`\n[批量任务] 批次完成: ${successCount}/${batch.length} 成功\n`);
        }
        
        // 最终统计
        const totalSuccess = results.filter(r => r.success).length;
        const totalFail = results.length - totalSuccess;
        
        console.log(`\n[批量任务] ========== 执行完成 ==========`);
        console.log(`总计: ${results.length} 个任务`);
        console.log(`成功: ${totalSuccess} 个`);
        console.log(`失败: ${totalFail} 个`);
        console.log(`成功率: ${((totalSuccess / results.length) * 100).toFixed(2)}%`);
        console.log(`====================================\n`);
        
        return results;
    }
}

// ==================== 使用示例 ====================

/**
 * 示例 1: 批量下载文件
 */
async function example1_BatchDownload() {
    const pool = new BatchTaskProxyPool({
        maxConcurrent: 3,
        retryCount: 3,
    });
    
    await pool.init();
    
    // 定义下载任务
    const tasks = [
        {
            id: 'download-1',
            fn: async (proxy) => {
                // 在这里实现下载逻辑
                console.log(`下载文件 1，代理: ${proxy ? proxy.url : '直连'}`);
                
                // 模拟下载
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                return { downloaded: true };
            }
        },
        {
            id: 'download-2',
            fn: async (proxy) => {
                console.log(`下载文件 2，代理: ${proxy ? proxy.url : '直连'}`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                return { downloaded: true };
            }
        },
        {
            id: 'download-3',
            fn: async (proxy) => {
                console.log(`下载文件 3，代理: ${proxy ? proxy.url : '直连'}`);
                await new Promise(resolve => setTimeout(resolve, 800));
                return { downloaded: true };
            }
        },
    ];
    
    const results = await pool.executeBatch(tasks);
    
    // 处理结果
    results.forEach(result => {
        if (result.success) {
            console.log(`✅ 任务成功，延迟: ${result.latency}ms`);
        } else {
            console.log(`❌ 任务失败: ${result.error.message}`);
        }
    });
}

/**
 * 示例 2: 批量 API 请求
 */
async function example2_BatchAPI() {
    const pool = new BatchTaskProxyPool({
        maxConcurrent: 5,
        retryCount: 3,
    });
    
    await pool.init();
    
    const apiUrls = [
        'https://api.example.com/users',
        'https://api.example.com/posts',
        'https://api.example.com/comments',
    ];
    
    const tasks = apiUrls.map((url, index) => ({
        id: `api-${index + 1}`,
        fn: async (proxy) => {
            // 使用代理发起 API 请求
            console.log(`请求 API: ${url}，代理: ${proxy ? proxy.url : '直连'}`);
            
            // 模拟请求
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return { data: `Response from ${url}` };
        }
    }));
    
    const results = await pool.executeBatch(tasks);
    
    console.log('\n最佳代理（基于历史评分）:');
    pool.getBestProxy(3).forEach((proxy, i) => {
        console.log(`  ${i + 1}. ${proxy.type}: ${proxy.url}`);
    });
}

/**
 * 示例 3: 集成到 Vue 组件
 */
function example3_VueIntegration() {
    return {
        // 在 Vue 组件中使用
        setup() {
            const proxyPool = new BatchTaskProxyPool({
                maxConcurrent: 5,
                retryCount: 3,
            });
            
            async function executeBatchDailyTasks(tasks) {
                await proxyPool.init();
                return await proxyPool.executeBatch(tasks);
            }
            
            return {
                executeBatchDailyTasks,
            };
        }
    };
}

// ==================== 导出 ====================

module.exports = {
    BatchTaskProxyPool,
    example1_BatchDownload,
    example2_BatchAPI,
    example3_VueIntegration,
};

// ==================== CLI 测试模式 ====================

if (require.main === module) {
    (async () => {
        console.log('=== 批量任务代理池测试 ===\n');
        
        // 运行示例 1
        console.log('运行示例 1: 批量下载...\n');
        await example1_BatchDownload();
        
        console.log('\n\n运行示例 2: 批量 API 请求...\n');
        await example2_BatchAPI();
        
        console.log('\n=== 测试完成 ===');
    })();
}
