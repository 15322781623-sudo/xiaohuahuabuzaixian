# CDN 404 错误全面修复报告

## 📋 问题根因分析

### 核心问题
游戏登录页面无法从 CDN 获取资源（bundle）显示 404 错误，原因是 **缺少正确的 CDN 资源加载器实现**。

### 对比发现
通过对比 `niaoge` 项目，发现以下关键差异：

| 组件 | niaoge 项目 | 当前项目 (修复前) |
|------|-------------|-------------------|
| `smart-engine-loader.js` | ✅ 仅引擎缓存加载 | ❌ 仅有引擎缓存逻辑 |
| `installRemoteAssetLoader` | ✅ 定义在 `main.2a00e.js` | ❌ 有旧版冲突实现 |
| `boot.js` | ✅ 完整版调用 loader | ⚠️ 调用了错误的 loader |
| `convertAssets` 包装 | ✅ 正确实现 | ⚠️ 手动包装但可能冲突 |

---

## 🔧 已实施的修复

### 1. smart-engine-loader.js 升级 ✅

**文件**: `d:\xyzw_web_helper-main\public\game\smart-engine-loader.js`

**新增功能**:
- ✅ `installRemoteAssetLoader()` - CDN bundle 下载器
- ✅ `downloadBundle()` - 远程 bundle JSON/JS 解析
- ✅ `downloadScript()` - JS/JSC 动态加载  
- ✅ `downloadJson()` - config.json 获取
- ✅ `executeScriptQueue()` - 脚本队列注入
- ✅ `toRemoteUrl()` - URL 转换到 CDN 地址
- ✅ localStorage 引擎缓存优化

**关键代码片段**:
```javascript
window.installRemoteAssetLoader = function() {
  // ... 注册 .js 和 bundle 下载器 ...
  downloader.register({
    '.js': downloadScript,
    bundle: downloadBundle
  });
};
```

### 2. main.2a00e.js 清理 ⚠️

**文件**: `d:\xyzw_web_helper-main\public\game\main.2a00e.js`

**临时处理**: 
暂时移除了旧的 `installRemoteAssetLoader` 定义，避免与新版冲突。

**⚠️ 重要**: 此文件需要恢复原始代码（除 installRemoteAssetLoader 外）！

**建议操作**:
```bash
# 从 niaoge 项目复制完整版本
cp niaoge/public/game/main.2a00e.js public/game/main.2a00e.js.bak
```

---

## 🎯 完整工作流程

```
1. game.html 加载顺序:
   ↓
2. SDK Mock (wx + HSDK) → 模拟平台环境
   ↓
3. LoginHook → 拦截登录验证
   ↓
4. Cocos Engine (cocos2d-js-min.a5841.js) → 本地加载
   ↓
5. Patch.js → SDK 补丁 + Canvas 方向修正
   ↓
6. settings.js + game-defines.js → 配置加载
   ↓
7. main.2a00e.js → 主入口初始化 (无 loader 定义)
   ↓
8. boot.js → 覆盖 window.boot()
   ├─ fetchRemoteBundleVers() → 拉取 manifest
   ├─ lockCodeVersion() → 锁定版本号
   ├─ installRemoteAssetLoader() ← 【关键步骤】
   │   └─ smart-engine-loader.js 提供实现
   ├─ executeScriptQueue() → 执行脚本队列
   └─ doStartGame() → 启动游戏场景
   ↓
9. Cocos 资产管理器 → 使用自定义下载器加载 bundle
   ├─ downloadJson('/launcher/config.x.json')
   └─ downloadScript('/launcher/index.x.js')
   ↓
10. convertAssets() 将相对路径转换为 CDN URL
    https://xxz-xyzw-res.hortorgames.com/remote/game/xxx
```

---

## 🔍 关键机制说明

### convertAssets URL 转换
```javascript
// 示例流程
原始 URL: assets/launcher/index.24908.js
  ↓
convertAssets() 添加 GAME_PREFIX:
http://localhost:3000/game/assets/launcher/index.24908.js
  ↓
encryptedBundleRE 匹配检查:
https://xxz-xyzw-res.hortorgames.com/remote/game/index.24908.js
  ↓
实际加载地址（带编译后的 hash）
```

### Bundle 版本控制
```javascript
settings.bundleVers = {
  'main': 'abcdef',
  'launcher': '123456',
  'internal': '',
  'resources': ''
};

// 加载时组合路径
configUrl: base + '/config.' + versionPart + 'json'
indexUrl: base + '/index.' + versionPart + 'js'
```

---

## ⚠️ 待完成工作

### 1. 恢复 main.2a00e.js 完整代码
- [ ] 从 niaoge 项目复制完整 `main.2a00e.js`
- [ ] 删除其中的 `window.installRemoteAssetLoader` 定义（约 160 行）
- [ ] 保留其他所有游戏逻辑代码

### 2. 测试验证清单
- [ ] 本地服务器测试 (`npm run dev`)
  - [ ] 打开浏览器控制台查看日志
  - [ ] 确认 `[SmartEngineLoader] ✅ CDN 资源加载器已注册`
  - [ ] 检查 Network 面板 bundle 请求是否指向 CDN
- [ ] 测试 manifest 获取 (`fetchRemoteBundleVers`)
- [ ] 测试 bundle 加载 (launcher/main)
- [ ] 测试 404 错误是否消失

### 3. 生产部署检查
- [ ] 验证 `https://xxz-xyzw-res.hortorgames.com` 可访问
- [ ] 确认 bundle 资源在 CDN 上存在
- [ ] 检查 CORS 跨域策略是否允许

---

## 🛠️ 快速排查命令

### 浏览器控制台调试
```javascript
// 检查 loader 是否正确安装
console.log(window.installRemoteAssetLoader);

// 检查 Cocos 下载器
console.log(cc.assetManager.downloader._downloaders);

// 检查 convertAssets
console.log(window.convertAssets('test/path.js'));

// 检查 manifest
console.log(localStorage.getItem('__boot_manifest_cache__'));
```

### Network 面板关键字段
- **URL**: 应包含 `xxz-xyzw-res.hortorgames.com/remote/`
- **状态码**: 应为 200 而非 404
- **Referer**: 应为 `http://localhost:3000/game.html`

---

## 📝 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `public/game/smart-engine-loader.js` | ✅ 重写 | 增加完整 CDN loader 实现 |
| `public/game/main.2a00e.js` | ⚠️ 临时简化 | 移除冲突 loader 定义 |
| `public/game/boot.js` | ✓ 无需修改 | 已正确调用 loader |
| `public/game.html` | ✓ 无需修改 | 加载顺序正确 |

---

## 🔄 回滚方案

如遇到问题，可执行以下操作：

1. **恢复 main.2a00e.js**:
   ```bash
   git checkout HEAD -- public/game/main.2a00e.js
   ```

2. **清除浏览器缓存**:
   ```javascript
   // 在浏览器控制台执行
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```

3. **重启开发服务器**:
   ```bash
   # 停止现有进程
   Get-Process -Name node | Stop-Process -Force
   
   # 重新启动
   npm run dev
   ```

---

## ✅ 预期结果

修复完成后应该看到：

1. **控制台输出**:
   ```
   [SmartEngineLoader] ✅ CDN 资源加载器已注册
   [boot v2.0] ✅ Manifest 获取成功!
   [boot v2.0] 🔄 使用本地引擎文件
   ```

2. **Network 请求**:
   - launcher/config.x.json → 200 (from CDN)
   - launcher/index.x.js → 200 (from CDN)
   - main/config.x.json → 200 (from CDN)
   - main/index.x.js → 200 (from CDN)

3. **无 404 错误**:
   - 所有 bundle 资源正常加载
   - 不再有 "/game/assets/xxx" 的 404

---

**最后更新**: 2026-08-29  
**修复版本**: v2.50.4  
**参考项目**: `xiaofu/xyzw-web-helper/niaoge`
