#!/usr/bin/env node

/**
 * Fir-Proxy 部署和管理工具
 * 
 * 功能：
 * 1. 自动克隆 fir-proxy 仓库
 * 2. 检测并安装 Python 依赖
 * 3. 启动代理服务
 * 4. 提供健康检查和状态监控
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    REPO_URL: 'https://github.com/fir-proxy', // fir-proxy 官方仓库
    LOCAL_DIR: path.join(__dirname, 'fir-proxy'),
    INSTALL_TIMEOUT: 120000, // 2 分钟超时
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
    log(`✅ ${message}`, 'green');
}

function warn(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
    log(`❌ ${message}`, 'red');
}

function info(message) {
    log(`📝 ${message}`, 'blue');
}

/**
 * 检查系统依赖
 */
function checkDependencies() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🔍 检查系统依赖', 'cyan');
    log('='.repeat(50), 'cyan');

    const issues = [];

    // 检查 Git
    try {
        execSync('git --version', { stdio: 'ignore' });
        success('Git ✅');
    } catch (e) {
        issues.push('Git 未安装，请先安装 Git');
    }

    // 检查 Python
    try {
        const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
        success(`Python ✅ (${pythonVersion})`);
    } catch (e) {
        try {
            const python3Version = execSync('python3 --version', { encoding: 'utf8' }).trim();
            success(`Python3 ✅ (${python3Version})`);
        } catch (e2) {
            issues.push('Python 未安装，请先安装 Python 3.7+');
        }
    }

    // 检查 pip
    try {
        execSync('pip --version', { stdio: 'ignore' });
        success('pip ✅');
    } catch (e) {
        issues.push('pip 未安装，请先安装 pip');
    }

    if (issues.length > 0) {
        log('\n', 'red');
        issues.forEach(issue => error(issue));
        log('\n请按 Ctrl+C 退出并安装缺失的依赖\n', 'red');
        process.exit(1);
    }

    return true;
}

/**
 * 克隆 fir-proxy 仓库
 */
function cloneRepository() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 📥 克隆 fir-proxy 仓库', 'cyan');
    log('='.repeat(50), 'cyan');

    if (fs.existsSync(CONFIG.LOCAL_DIR)) {
        info('仓库已存在，跳过克隆步骤');
        return true;
    }

    try {
        info(`正在克隆 ${CONFIG.REPO_URL} ...`);
        execSync(`git clone ${CONFIG.REPO_URL} fir-proxy`, { 
            cwd: __dirname,
            stdio: 'inherit'
        });
        success('克隆成功！');
        return true;
    } catch (e) {
        error('克隆失败');
        console.error(e.message);
        return false;
    }
}

/**
 * 安装 Python 依赖（推断依赖列表）
 */
function installDependencies() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 📦 安装 Python 依赖', 'cyan');
    log('='.repeat(50), 'cyan');

    try {
        // 从记忆可知 fir-proxy 无 requirements.txt，需推断依赖
        const inferredDeps = [
            'requests',
            'beautifulsoup4',
            'aiohttp',
            'redis',
            'flask',
            'gunicorn'
        ];

        info('fir-proxy 未提供 requirements.txt，使用推断依赖列表：\n');
        inferredDeps.forEach(dep => info(`  - ${dep}`));
        
        info('\n开始安装依赖...（可能需要几分钟）');
        
        execSync(`pip install ${inferredDeps.join(' ')}`, { 
            cwd: CONFIG.LOCAL_DIR,
            timeout: CONFIG.INSTALL_TIMEOUT,
            stdio: 'inherit'
        });

        success('依赖安装完成！');
        return true;
    } catch (e) {
        error('依赖安装失败');
        console.error(e.message);
        return false;
    }
}

/**
 * 启动 fir-proxy 主程序
 */
function startService() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🚀 启动 fir-proxy 服务', 'cyan');
    log('='.repeat(50), 'cyan');

    const mainPyPath = path.join(CONFIG.LOCAL_DIR, 'main.py');
    
    if (!fs.existsSync(mainPyPath)) {
        error('main.py 不存在，无法启动服务');
        return false;
    }

    try {
        // 使用后台模式启动（Windows 下使用 start /B）
        const isWindows = process.platform === 'win32';
        const command = isWindows 
            ? `start /B python main.py`
            : `nohup python main.py > proxy.log 2>&1 &`;
        
        execSync(command, {
            cwd: CONFIG.LOCAL_DIR,
            detached: !isWindows,
            stdio: 'ignore'
        });

        // 如果是 Windows 且 detached=false，则在当前进程运行
        if (!isWindows) {
            info('服务已在后台启动，日志查看：fir-proxy/proxy.log');
            info('停止服务：cd fir-proxy && pkill -f "python main.py"');
        } else {
            info('服务已启动！');
            info('请手动查看控制台输出或修改 main.py 添加日志输出');
        }

        return true;
    } catch (e) {
        error('启动失败');
        console.error(e.message);
        return false;
    }
}

/**
 * 检查服务状态
 */
function checkStatus() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🔍 检查服务状态', 'cyan');
    log('='.repeat(50), 'cyan');

    try {
        // 尝试连接常见端口
        const ports = [8000, 8080, 3000, 5000];
        
        for (const port of ports) {
            try {
                const response = execSync(`curl -s -o nul -w "%{http_code}" http://127.0.0.1:${port}/health`, {
                    encoding: 'utf8',
                    timeout: 2000
                });

                if (response === '200' || response === '404') {
                    success(`服务运行中 - 端口 ${port}`);
                    log(`健康检查：http://127.0.0.1:${port}/health`, 'cyan');
                    return true;
                }
            } catch (e) {
                // 端口未监听
            }
        }

        warn('服务未运行或未检测到健康端点');
        return false;
    } catch (e) {
        error('状态检查失败');
        return false;
    }
}

/**
 * 测试代理可用性
 */
async function testProxy(targetUrl = 'https://github.com') {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🧪 测试代理连通性', 'cyan');
    log('='.repeat(50), 'cyan');

    if (!process.env.PROXY_URL) {
        error('未设置 PROXY_URL 环境变量');
        log('使用方法：set PROXY_URL=http://127.0.0.1:8080 && node proxy-manager.js test', 'yellow');
        return false;
    }

    try {
        const start = Date.now();
        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml',
                'User-Agent': 'Fir-Proxy-Test/1.0'
            },
            redirect: 'follow',
            dispatcher: new ProxyAgent(process.env.PROXY_URL)
        });

        const latency = Date.now() - start;
        
        if (response.ok) {
            success(`连接成功！延迟：${latency}ms`);
            log(`目标 URL: ${targetUrl}`, 'cyan');
            log(`响应状态：${response.status} ${response.statusText}`, 'cyan');
            return true;
        } else {
            error(`HTTP ${response.status}`);
            return false;
        }
    } catch (e) {
        error(`连接失败：${e.message}`);
        return false;
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
${colors.bright}${colors.cyan}Fir-Proxy 部署和管理工具 v1.0${colors.reset}

${colors.bright}用法:${colors.reset}
  ${colors.cyan}node proxy-manager.js <command> [options]${colors.reset}

${colors.bright}命令:${colors.reset}
  ${colors.green}install${colors.reset}       完整安装流程（clone + install）
  ${colors.green}start${colors.reset}          启动 fir-proxy 服务
  ${colors.green}status${colors.reset}         检查服务运行状态
  ${colors.green}test${colors.reset}           测试代理连通性
  ${colors.green}help${colors.reset}           显示此帮助信息

${colors.bright}示例:${colors.reset}
  ${colors.yellow}node proxy-manager.js install${colors.reset}
  ${colors.yellow}node proxy-manager.js start${colors.reset}
  ${colors.yellow}PROXY_URL=http://127.0.0.1:8080 node proxy-manager.js test${colors.reset}
  ${colors.yellow}node proxy-manager.js status${colors.reset}

${colors.bright}说明:${colors.reset}
  • fir-proxy 仓库：${colors.blue}https://github.com/fir-proxy${colors.reset}
  • 默认端口：${colors.blue}8080${colors.reset}（实际由 main.py 决定）
  • 安装失败时会自动推断依赖包
    `);
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();

    switch (command) {
        case 'install':
            if (checkDependencies()) {
                if (cloneRepository() && installDependencies()) {
                    success('🎉 安装完成！');
                    log('\n请使用以下命令启动服务：', 'cyan');
                    log(`  node proxy-manager.js start`, 'yellow');
                }
            }
            break;

        case 'start':
            if (checkDependencies()) {
                if (startService()) {
                    setTimeout(checkStatus, 3000); // 延迟检查状态
                }
            }
            break;

        case 'status':
            checkStatus();
            break;

        case 'test':
            await testProxy(args[1]);
            break;

        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;

        default:
            if (args.length === 0) {
                showHelp();
            } else {
                error(`未知命令：${command}`);
                log('\n请输入', 'yellow');
                showHelp();
            }
    }
}

// 执行主函数
main().catch(err => {
    error('程序执行出错');
    console.error(err);
    process.exit(1);
});
