# ⛏️ 盐场刨地功能修复建议

## 📋 缺失功能清单

### 🔴 高优先级缺失

#### 1. 角色死亡检测与自动复活等待
**问题**: 当前实现无死亡检测，角色死亡后可能永久卡住
**影响**: 刨地过程中如果角色死亡，任务会失败但无明显提示

**修复方案**:
```javascript
// 在刨地循环前添加死亡检查
function isDead(role) {
  return !!role && (role.state === 'die' || role.state === 'resurrect' || role.isDead === true);
}

function canAct(role) {
  return !!role && isIdle(role) && !isDead(role) && !isMarching(role) && !isFighting(role);
}

// 在循环内每步都检查
if (myRole && isDead(myRole)) {
  addLog({ time, message: `${name} ⚠ 检测到角色死亡，等待复活...`, type: "warning" });
  for (let i = 0; i < 60; i++) { // 最多等 30 秒
    await safeDelay(500);
    const updatedRole = snapshot.roles[myCodeId];
    if (updatedRole && canAct(updatedRole)) break;
    if (shouldStop.value) break;
  }
  if (!canAct(snapshot.roles[myCodeId])) {
    addLog({ time, message: `${name} ❌ 角色无法复活，终止任务`, type: "error" });
    return false;
  }
}
```

---

### 🟡 中优先级缺失

#### 2. 目标选择策略配置
**问题**: 当前纯随机选择相邻格，效率低下

**修复方案**:
```javascript
// 从账号设置读取目标优先级
let targetPriority = 'saltPanFirst'; // saltPanFirst / nearest / enemyFirst
try {
  const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
  if (settingsRaw) {
    const settings = JSON.parse(settingsRaw);
    if (['saltPanFirst', 'nearest', 'enemyFirst'].includes(settings.saltFieldTargetPriority)) {
      targetPriority = settings.saltFieldTargetPriority;
    }
  }
} catch(e) {}

// 在目标选择处应用策略
if (!target) {
  const neighbors = hexNeighbors(myRole.position.x, myRole.position.y);
  const validCands = neighbors.filter(n => Object.prototype.hasOwnProperty.call(snapshot.buildingData, `${n.x}_${n.y}`));
  
  if (validCands.length > 0) {
    if (targetPriority === 'saltPanFirst') {
      // 优先盐田
      const saltPans = validCands.filter(n => snapshot.buildingData[`${n.x}_${n.y}`]?.type === 'SaltPan');
      target = saltPans.length > 0 ? saltPans[0] : validCands[0];
    } else if (targetPriority === 'enemyFirst') {
      // 优先敌方建筑
      const enemies = validCands.filter(n => {
        const b = snapshot.buildingData[`${n.x}_${n.y}`];
        return !b.isOur && !b.isHome;
      });
      target = enemies.length > 0 ? enemies[0] : validCands[0];
    } else {
      // nearest - 最近邻居（默认就是第一个）
      target = validCands[0];
    }
  }
}
```

#### 3. 锁敌功能
**问题**: 无法固定攻击某个特定敌人

**修复方案**:
```javascript
// 从账号设置读取锁定的敌人 ID
let lockedRoleId = null;
try {
  const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
  if (settingsRaw) {
    const settings = JSON.parse(settingsRaw);
    if (settings.saltFieldLockedRoleId) {
      lockedRoleId = settings.saltFieldLockedRoleId;
    }
  }
} catch(e) {}

// 在目标选择前检查锁敌
if (lockedRoleId) {
  const lockedRole = snapshot.roles[lockedRoleId];
  if (lockedRole && lockedRole.position) {
    const lx = lockedRole.position.x;
    const ly = lockedRole.position.y;
    const neighbors = hexNeighbors(myRole.position.x, myRole.position.y);
    const isNeighbor = neighbors.some(n => n.x === lx && n.y === ly);
    
    if (isNeighbor) {
      target = { x: lx, y: ly };
      addLog({ time, message: `${name} 🔒 锁敌：[${lx},${ly}]`, type: "info" });
    }
  }
}
```

---

### 🟢 低优先级缺失

#### 4. 预设阵容选择配置
**问题**: 硬编码吕布单将，用户无法自定义

**修复方案**:
```javascript
// 读取用户配置的预设阵容（1-6 号）
let targetFormation = 1;
try {
  const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
  if (settingsRaw) {
    const settings = JSON.parse(settingsRaw);
    if (settings.saltFieldPeachFormation != null && 
        settings.saltFieldPeachFormation >= 1 && 
        settings.saltFieldPeachFormation <= 6) {
      targetFormation = settings.saltFieldPeachFormation;
    }
  }
} catch(e) {}

// 使用配置的阵容布阵
await sendWithPromise("war_teamsetbattleteam", { teamId: targetFormation }, 8000);
await safeDelay(800);
await sendWithPromise("war_setbattleteam", { teamId: targetFormation }, 8000);
addLog({ time, message: `${name} ✅ 预设阵容${targetFormation}布阵完成`, type: "success" });
```

#### 5. 最大刨地次数限制
**问题**: 仅依赖 30 分钟时间窗，可能刨地过多（超过 100 次）或过少

**修复方案**:
```javascript
const maxDigs = 100; // 最多 100 次
while (!shouldStop.value && inSaltFieldWindow() && digCount < maxDigs) {
  // 现有逻辑...
}

addLog({ time, message: `${name} ⏹ 创地结束 (${digCount}次)`, type: "info" });
```

---

## 🎯 实施建议

### 第一阶段（立即实施）
1. ✅ 角色死亡检测与自动复活等待
2. ✅ 最大刨地次数限制（防止过度消耗）

### 第二阶段（功能增强）
1. ✅ 目标选择策略配置（增加 UI 选项）
2. ✅ 锁敌功能（增加 UI 选项，显示锁定的敌人 ID）

### 第三阶段（用户体验）
1. ✅ 预设阵容选择配置（在账号设置中添加 dropdown）
2. ✅ 完善日志输出（记录每个策略的选择结果）

---

## 📝 UI 增强建议

在**账号设置页面**添加以下选项：

```javascript
{
  // 盐场刨地配置区域
  saltFieldSettings: {
    saltFieldPeachFormation: 1,           // 预设阵容 (1-6)
    saltFieldTargetPriority: 'saltPanFirst', // 目标优先级
    saltFieldLockedRoleId: null,          // 锁定的敌人 ID
  }
}
```

在**任务设置面板**添加：
- ☑️ 启用死亡自动复活等待
- ⏱️ 最大等待复活时间：30 秒
- 🎯 目标优先级：[下拉] 优先盐田 / 最近 / 优先敌方
- 🔒 锁敌模式：[开关] [输入框] 输入敌人 CodeId

---

## ✨ 预期效果

修复完成后：
- ✅ 角色死亡自动处理，无需人工干预
- ✅ 可选择最优路径策略（盐田优先/敌方优先/最近）
- ✅ 可手动锁定特定敌人集中攻击
- ✅ 可使用任意预设阵容（不仅仅是吕布单将）
- ✅ 刨地次数可控，避免过度执行
