# Manifest API 诊断指南

## 🧪 快速诊断步骤

### 步骤 1: 在浏览器 Console 中运行诊断脚本

将以下代码复制到游戏页面对应的 Console 中运行：

```javascript
async function testManifest() {
    try {
        const res = await fetch('https://xxz-xyzw.hortorgames.com/login/manifest', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({platform: 'wx', version: '2.41.5-wx'})
        });
        
        const data = await res.json();
        const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        const bv = typeof body.bundleVers === 'string' ? JSON.parse(body.bundleVers) : body.bundleVers;
        
        console.log('=== 诊断结果 ===');
        console.log('当前 GAME_VERSION:', GAME_VERSION);
        console.log('当前 CODE_VERSION:', CODE_VERSION);
        console.log('服务器 codeVersion:', bv?.codeVersion || '❌ 不存在');
        console.log('原始响应:', JSON.stringify(bv, null, 2));
        
        if (!bv?.codeVersion) {
            console.warn('\n⚠️  Manifest 响应中没有 codeVersion 字段！');
            console.warn('这是导致版本不更新的根本原因！');
        }
    } catch (e) {
        console.error('❌ 测试失败:', e.message);
    }
}

testManifest();
```

### 预期结果

✅ **正常情况：**
```
当前 GAME_VERSION: 2.42.0-wx
当前 CODE_VERSION: 2.42.0
服务器 codeVersion: 2.42.0
```

❌ **异常情况分析：**
```
当前 GAME_VERSION: 2.40.5-wx
当前 CODE_VERSION: 2.40.5
服务器 codeVersion: undefined  ← 这里应该是重点！
原始响应: { "launcher": "xxx", "main": "yyy" }  ← 没有 codeVersion
```

---

## 🔧 解决方案

### 方案 A: 服务端修复 (推荐)

**联系服务器管理员在 manifest 响应中添加 codeVersion:**

```json
{
  "body": {
    "bundleVers": {
      "launcher": "abc123",
      "main": "def456",
      "codeVersion": "2.42.0"  // ← 必须添加这个字段
    }
  }
}
```

### 方案 B: 前端兜底 (临时)

**修改 boot.js 中的默认版本:**

编辑 `public/game/boot.js` 第 35 行:
```javascript
var currentVersion = '2.42.0-wx';  // 改为您想要的最新版本
```

然后重新部署到 Cloudflare Pages。

### 方案 C: 强制覆盖版本

**修改 lockCodeVersion 函数:**

编辑 `public/game/boot.js` 第 97-147 行附近，在函数开头添加：

```javascript
function lockCodeVersion(settings) {
    // ★ 临时：强制指定版本（用于测试）
    // settings.codeVersion = '2.42.0';  // 取消注释即可强制使用此版本
    
    var ver = settings.codeVersion || ...
```

---

## 📝 完整检查清单

- [ ] 访问 https://xxz-xyzw.hortorgames.com 确认服务正常
- [ ] 运行上述诊断脚本，查看 server codeVersion 值
- [ ] 如果为 undefined，联系服务端添加该字段
- [ ] 检查 Cloudflare Workers 是否拦截了 manifest 请求
- [ ] 清除浏览器缓存后重新测试
- [ ] 在 game.html Console 中查看 `[boot v1.0] POST` 日志

---

## 🎯 常见问题

### Q: 为什么 Manifest 没有 codeVersion？
A: 服务端配置问题。旧的 manifest 配置可能只包含 bundle 版本哈希，不包含全局代码版本。需要在 `/login/manifest` 接口的响应体中添加此字段。

### Q: 可以直接修改 game-defines.js 吗？
A: 可以，但这只是静态兜底值。每次启动都会先被设置为 2.41.5-wx，然后在 boot() 中尝试更新。如果 Manifest 成功但没 codeVersion，就会保持 2.41.5-wx。

### Q: 是否需要重启浏览器？
A: 是的！修改任何 JS 文件后，需要 Ctrl+Shift+R（强制刷新）或清除缓存才能生效。

### Q: APK/Web 版版本不一致怎么办？
A: 分别修改对应的 `game-defines.js`文件。APK 版的位于`android/app/src/main/assets/public/game/`目录。

---

## 📞 技术支持

如需进一步帮助，请提供以下信息：

1. Console 完整输出（搜索 `[boot v1.0]`）
2. Manifest API 响应（JSON）
3. 当前 GAME_VERSION 和 CODE_VERSION 的值
