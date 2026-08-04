#!/usr/bin/env node

/**
 * 代理池一键部署脚本
 * 
 * 自动检测并安装 Cloudflare Wrangler CLI，然后部署代理池服务
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function info(message) {
    log(`📝 ${message}`, 'cyan');
}

function warn(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
    log(`❌ ${message}`, 'red');
}

/**
 * 检查 Node.js 版本
 */
function checkNodeVersion() {
    try {
        const version = execSync('node --version', { encoding: 'utf8' }).trim();
        info(`检测到 Node.js: ${version}`);
        
        const majorVersion = parseInt(version.match(/\d+/)[0]);
        if (majorVersion < 14) {
            warn(`建议 Node.js >= 14.0.0，当前版本可能不兼容`);
        } else {
            success(`Node.js 版本满足要求`);
        }
        return true;
    } catch (e) {
        error('未检测到 Node.js，请先安装');
        process.exit(1);
    }
}

/**
 * 检查或安装 Wrangler CLI
 */
function ensureWrangler() {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🔧 检查 Wrangler CLI', 'cyan');
    log('='.repeat(50), 'cyan');

    try {
        // 检查是否已全局安装
        execSync('wrangler --version', { stdio: 'ignore' });
        success('Wrangler 已安装');
        return true;
    } catch (e) {
        info('Wrangler 未全局安装，尝试本地安装...');
        
        try {
            execSync('npm list -g wrangler', { stdio: 'ignore' });
            success('Wrangler 已全局安装（通过 npx）');
            return true;
        } catch (e2) {
            warn('将使用 npx 方式运行 Wrangler，无需全局安装');
            return false;
        }
    }
}

/**
 * 部署到 Cloudflare Pages
 */
function deployToPages(projectName) {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🚀 部署到 Cloudflare Pages', 'cyan');
    log('='.repeat(50), 'cyan');

    // 准备项目结构（pages 需要完整的项目目录）
    const tempDir = path.join(__dirname, 'temp-deploy');
    
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // 复制必要文件
    const filesToCopy = ['worker-integration-example.js'];
    for (const file of filesToCopy) {
        const src = path.join(__dirname, file);
        const dest = path.join(tempDir, file);
        
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            info(`已复制 ${file}`);
        }
    }

    // 创建 package.json（如果不存在）
    const packageJsonPath = path.join(tempDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        const packageJson = {
            name: 'fir-proxy-manager',
            version: '1.0.0',
            private: true,
            scripts: {
                deploy: 'wrangler pages deploy .',
                dev: 'wrangler pages dev .'
            },
            devDependencies: {
                '@cloudflare/workers-types': '^4.20240114.0',
                wrangler: '^3.0.0'
            }
        };
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        info('已创建 package.json');
    }

    // 执行部署
    try {
        info(`正在部署到 ${projectName} ...`);
        
        // 使用 npx 运行部署命令
        execSync(`npx --yes wrangler pages deploy "${tempDir}" --project-name="${projectName}" --commit-date=${Date.now()}`, {
            cwd: tempDir,
            stdio: 'inherit',
            env: {
                ...process.env,
                // 尝试从用户环境获取认证信息
                WRANGLER_LOG: 'info',
            }
        });

        success('部署成功！');
        
        // 清理临时目录
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            // 忽略清理错误
        }
        
        return true;
    } catch (e) {
        error('部署失败');
        console.error(e.message);
        return false;
    }
}

/**
 * 部署到 Cloudflare Workers
 */
function deployToWorker(projectName) {
    log('\n' + '='.repeat(50), 'cyan');
    log(' 🚀 部署到 Cloudflare Workers', 'cyan');
    log('='.repeat(50), 'cyan');

    try {
        info('正在初始化 Wrangler 配置（首次）...');
        
        // 初始化 Wrangler 项目
        const initCmd = `npx --yes wrangler init ${projectName} --type=javascript --site --compatibility-flag=workers_site`;
        
        console.log(`运行命令：${initCmd}`);
        console.log('请按提示登录 Cloudflare 账号...');
        
        execSync(initCmd, {
            stdio: 'inherit'
        });

        // 复制 worker 代码到正确位置
        const siteDir = `.wrangler/site/${projectName}`;
        const sourceFile = path.join(__dirname, 'proxy-manager.js');
        const destFile = path.join(siteDir, 'index.html'); // 或者 index.js
        
        if (fs.existsSync(sourceFile)) {
            // 如果是 Worker 模式，应该放在根目录
            const rootDest = path.join(__dirname, `${projectName}.js`);
            fs.copyFileSync(sourceFile, rootDest);
            info(`已复制 worker 代码到 ${projectName}.js`);
            
            // 更新 wrangler.toml
            const wranglerConfigPath = path.join(__dirname, 'wrangler.toml');
            let wranglerConfig = `[env.production]
name = "${projectName}"
main = "${projectName}.js"
compatibility_date = "2024-01-01"`;
            
            fs.writeFileSync(wranglerConfigPath, wranglerConfig);
            info('已创建 wrangler.toml 配置');
        }

        // 部署
        info('开始部署到 Cloudflare...');
        execSync(`npx --yes wrangler deploy --env production`, {
            cwd: __dirname,
            stdio: 'inherit'
        });

        success('部署成功！');
        
        // 尝试显示部署 URL
        try {
            const config = fs.readFileSync('.wrangler/state/v3/deployments/config.json', 'utf8');
            const configData = JSON.parse(config);
            const url = configData.custom_domain || `https://${projectName}.onworkers.dev`;
            
            log(`\n你的代理服务已部署在:`);
            log(url, 'bright');
            log(`\n管理面板地址：${url}/`, 'cyan');
            log(`API 文档：${url}/api/proxy/pool`, 'cyan');
            
        } catch (e) {
            warn('无法自动读取部署 URL，请查看上面的日志');
        }
        
        return true;
    } catch (e) {
        error('部署失败');
        console.error(e.message);
        return false;
    }
}

/**
 * 部署向导
 */
async function runDeploymentWizard() {
    const inquirer = require('inquirer');
    
    const questions = [{
        type: 'list',
        name: 'target',
        message: '选择部署目标平台:',
        choices: [
            { name: 'Cloudflare Pages (推荐)', value: 'pages' },
            { name: 'Cloudflare Workers', value: 'worker' }
        ],
        default: 0
    }, {
        type: 'input',
        name: 'projectName',
        message: '项目名称（默认：fir-proxy-manager）:',
        default: 'fir-proxy-manager'
    }];

    try {
        const answers = await inquirer.prompt(questions);
        return answers;
    } catch (e) {
        warn('inquirer 未安装，使用默认配置');
        return { target: 'pages', projectName: 'fir-proxy-manager' };
    }
}

/**
 * 主函数
 */
function main() {
    log('\n' + '█'.repeat(60), 'cyan');
    log('░░░░░░░░░░░░ Fir-Proxy 代理池一键部署工具 ░░░░░░░░░░', 'cyan');
    log('█'.repeat(60), 'cyan');
    
    // 基础环境检查
    checkNodeVersion();
    ensureWrangler();

    // 显示部署选项
    log('\n📋 可用部署方式：');
    log('   1. Cloudflare Pages（推荐，适合静态内容 + API）');
    log('   2. Cloudflare Workers（轻量级，纯 API 服务）');
    log('\n请输入数字选择，或直接按回车使用默认方式');

    // 简单的命令行参数支持
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Fir-Proxy 一键部署脚本

用法：
  node deploy.js                    交互模式
  node deploy.js pages              部署到 Pages
  node deploy.js worker             部署到 Workers  
  node deploy.js help               显示帮助

环境变量：
  PROJECT_NAME                      自定义项目名称
         `);
        return;
    }

    let deploymentType = 'pages';
    let projectName = 'fir-proxy-manager';

    if (args.length > 0) {
        if (args[0] === 'pages') deploymentType = 'pages';
        else if (args[0] === 'worker') deploymentType = 'worker';
        else if (args[0] === 'worker') deploymentType = 'worker';
    }

    // 从环境变量获取项目名称
    if (process.env.PROJECT_NAME) {
        projectName = process.env.PROJECT_NAME;
    }

    info(`选择部署方式：${deploymentType.toUpperCase()}`);
    info(`项目名称：${projectName}`);

    // 执行部署
    switch (deploymentType) {
        case 'pages':
            deployToPages(projectName);
            break;

        case 'worker':
            deployToWorker(projectName);
            break;

        default:
            error(`未知部署方式：${deploymentType}`);
    }

    log('\n' + '='.repeat(60), 'cyan');
    success('部署流程结束！');
    log('请查看上面的日志获取部署后的访问地址', 'cyan');
    log('='.repeat(60), 'cyan');
}

// 执行主函数
main().catch(err => {
    error('部署工具执行出错');
    console.error(err);
    process.exit(1);
});
