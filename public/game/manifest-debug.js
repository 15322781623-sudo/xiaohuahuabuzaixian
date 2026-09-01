// 在浏览器 Console 中运行此脚本

async function debugManifestAPI() {
    console.log('═══════════════════════════════════════════');
    console.log('   🧪 Manifest API 调试工具 v1.0');
    console.log('═══════════════════════════════════════════\n');
    
    const version = '2.43.3-wx';
    const url = '/api/manifest';
    
    try {
        console.log(`📡 请求 URL: ${url}?platform=wx&version=${version}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: JSON.stringify({ platform: 'wx', version })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const text = await response.text();
        console.log('\n📦 原始响应:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error('\n❌ 响应不是有效的 JSON!');
            console.error('错误:', e.message);
            return;
        }
        
        console.log('\n🔍 完整响应对象:', JSON.stringify(data, null, 2));
        
        // 尝试不同的解析路径
        let body = data.body;
        let bv;
        
        if (typeof body === 'string') {
            console.log('\n💡 body 是字符串，尝试解析...');
            try {
                body = JSON.parse(body);
                console.log('✅ 解析成功:', JSON.stringify(body).substring(0, 200));
            } catch(e) {
                console.warn('⚠ 解析失败:', e.message);
                body = null;
            }
        } else if (body === undefined) {
            console.warn('⚠ body 字段不存在，直接使用顶层数据');
        }
        
        if (body && body.bundleVers !== undefined) {
            console.log('\n🎯 body.bundleVers 存在');
            bv = body.bundleVers;
            
            if (typeof bv === 'string') {
                console.log('\n💡 bundleVers 是字符串，尝试解析...');
                try {
                    bv = JSON.parse(bv);
                    console.log('✅ 解析成功！条目数:', Object.keys(bv).length);
                } catch(e) {
                    console.warn('⚠ 解析失败:', e.message);
                    bv = null;
                }
            } else if (bv && typeof bv === 'object') {
                console.log('✅ bundleVers 已是对象，条目数:', Object.keys(bv).length);
            }
        } else {
            console.warn('\n❌ body.bundleVers 不存在');
            console.warn('可用字段:', Object.keys(body || {}));
        }
        
        console.log('\n\n═══════════════════════════════════════════');
        if (bv && typeof bv === 'object') {
            console.log('✅ 成功获取 bundleVers!');
            console.log('\n主要 bundles:');
            console.log('  main:', bv.main);
            console.log('  launcher:', bv.launcher);
            console.log('  game:', bv.game);
            console.log('  internal:', bv.internal);
            console.log('\ncodeVersion:', bv.codeVersion || '未设置');
        } else {
            console.log('❌ 未能获取有效的 bundleVers');
            console.log('请检查上面的调试信息');
        }
        console.log('═══════════════════════════════════════════\n');
        
        // 缓存到 localStorage（下次启动使用）
        if (bv && typeof bv === 'object') {
            try {
                localStorage.setItem('__boot_manifest_cache__', JSON.stringify({
                    bundleVers: bv,
                    time: Date.now()
                }));
                console.log('✅ 已缓存到 localStorage');
            } catch(e) {
                console.warn('⚠ 缓存失败:', e.message);
            }
        }
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        throw error;
    }
}

console.log('═══════════════════════════════════════════');
console.log('   🧪 Manifest API 调试工具 v1.0');
console.log('═══════════════════════════════════════════\n');
debugManifestAPI();
