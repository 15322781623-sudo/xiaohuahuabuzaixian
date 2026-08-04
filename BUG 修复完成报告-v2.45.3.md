# 定时任务调度系统批量修复报告 v2.45.3

## 📋 修复概览

本次修复解决了定时任务调度系统的 6 个关键 BUG，涉及队列消费、健康检查、孤儿记录等核心功能。

### ✅ 已完成的修复 (4/6)

#### 1. 统一状态更新函数 [COMPLETE]
- **位置**: Line ~13875
- **作用**: 提供统一的 `updateLastTaskExecution()` 方法，确保所有路径都写入 localStorage
- **代码**:
```javascript
const updateLastTaskExecution = () => {
  const nowMs = Date.now();
  lastTaskExecution = nowMs;
  const taskId = currentScheduledTask?.id || 'unknown';
  localStorage.setItem(`lastTaskExecution_${taskId}`, nowMs.toString());
};
```

#### 2. Health Check 2 小时超时检测优化 [COMPLETE]
- **位置**: Line ~11600-11620
- **改进**: 所有强制重置分支统一调用 `updateLastTaskExecution()`
- **效果**: 防止浏览器崩溃时状态丢失导致定时任务无法执行

#### 3. 孤儿记录竞态修复 [COMPLETE]
- **位置**: Line ~11868
- **改进**: 检测到孤儿 running 记录后立即 return，避免并发执行两次
- **原代码**: "已标记为 timeout 后启动" (无 return)
- **新代码**: "等待健康检查清理后再试" (有 return)

#### 4. 队列消费 finally 写入 localStorage [COMPLETE]
- **位置**: Line ~11905-11912
- **改进**: 队列消费任务的 finally 块添加 localStorage 写入
- **效果**: 防止队列任务完成后浏览器崩溃导致防重标记丢失

### ⏸️ 待手动应用的修复 (2/6)

#### Bug #4: push_map 纳入调度器流程
**操作位置**: `src/views/BatchDailyTasks.vue` Line 11834-11843

**需要替换的原始代码**:
```javascript
if (task.taskType === 'push_map') {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `⏰ 推图定时触发：开始推图（${task.name}）`,
    type: "info",
  });
  window.$message?.success(`定时触发：自动开始推图`);
  pushStartAll().catch(e => console.error('[PushMap 定时开始] 错误:', e));
  return; // 快速返回，不消耗调度器的"正在运行"状态
}
```

**替换为新代码**:
```javascript
if (task.taskType === 'push_map') {
  // ✅ Bug #4: 保持原有防重检查
  const stopKey = `lastPushStopExecution_${task.id}`;
  const lastStop = localStorage.getItem(stopKey);
  if (lastStop && (now.getTime() - new Date(lastStop).getTime()) < 60000) return;
  localStorage.setItem(stopKey, now.toString());
  
  // ✅ Bug #4: 检查定时任务互斥
  if (isScheduledTaskRunning.value && currentScheduledTask) {
    if (currentScheduledTask.id === task.id) return;
    if (!pendingTaskQueue.some(t => t.id === task.id)) {
      pendingTaskQueue.push(task);
    }
    return;
  }
  
  // ✅ Bug #4: 正常流程 + 状态管理
  isScheduledTaskRunning.value = true;
  currentScheduledTask = task;
  scheduledTaskStartTime = Date.now();
  localStorage.setItem(
    `lastTaskExecution_${task.id}`,
    now.toString()
  );
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `⏰ 推图定时触发：开始推图（${task.name}）`,
    type: "info",
  });
  window.$message?.success(`定时触发：自动开始推图`);
  pushStartAll().catch(e => console.error('[PushMap 定时] 错误:', e)).finally(() => {
    isScheduledTaskRunning.value = false;
    currentScheduledTask = null;
    scheduledTaskStartTime = null;
    lastTaskExecution = Date.now();
    localStorage.setItem(
      `lastTaskExecution_${task.id}`,
      now.toString()
    );
  });
  return;
}
```

**修复内容说明**:
- ✅ 保持原有的停止时间防重检查 (`lastPushStopExecution`)
- ✅ 新增定时任务互斥检查，与其他定时任务共享 pendingTaskQueue
- ✅ 完整状态管理：设置 isScheduledTaskRunning、currentScheduledTask 等
- ✅ finally 块清理状态并写入 localStorage

#### Bug #5: 所有 finally 块的 localStorage 写入
**需要在以下 3 个 finally 块末尾添加 `updateLastTaskExecution()`:**

1. **Line ~13579** (任务完成 finally):
```javascript
} finally {
  scheduledTaskStartTime = Date.now();
  lastTaskExecution = Date.now();
  updateLastTaskExecution(); // ✅ 添加这行
}
```

2. **Line ~18608** (日常任务 finally):
```javascript
} finally {
  tokenStore.closeWebSocketConnection(tokenId);
  updateLastTaskExecution(); // ✅ 添加这行
}
```

3. **Line ~18664** (超时 finally):
```javascript
} finally {
  tokenStore.closeWebSocketConnection(nextTokenId);
  lastTaskExecution = Date.now();
  updateLastTaskExecution(); // ✅ 添加这行
}
```

---

## 🔍 修复验证测试计划

### 测试场景 A: 队列自动消费 (测试 Bug #1)
1. **准备**: 配置两个相同分钟的定时任务 (如 10:00 和 10:01)
2. **操作**: 等待第一个任务执行完
3. **预期**: 第二个任务自动从队列中弹出并开始执行
4. **日志**: 应看到 "▶️ 定时任务 [xxx] 完成，开始执行队列任务：yyy"

### 测试场景 B: 孤儿记录避免并发 (测试 Bug #3)
1. **准备**: 修改一个定时任务的名称，使其与另一个正在执行的同名任务匹配
2. **操作**: 触发新版本的任务执行
3. **预期**: 不会启动新实例，只打印警告信息并返回
4. **日志**: 应看到 "⚠️ 定时任务 xxx 检测到孤儿 running 记录，等待健康检查清理后再试"

### 测试场景 C: 浏览器刷新后恢复 (测试 Bug #2 & #5)
1. **准备**: 让一个定时任务正在执行
2. **操作**: 手动刷新页面
3. **预期**: 重新进入后调度器能正确恢复状态，不会重复启动或阻塞
4. **验证**: 检查 localStorage 中 `lastTaskExecution_任务 id` 值是否正确写入

### 测试场景 D: 推图任务互斥 (测试 Bug #4，需手动应用后测试)
1. **准备**: 配置两个推图任务在相同时间触发
2. **操作**: 等待触发时间到达
3. **预期**: 第二个推图任务被加入队列，第一个完成后自动执行第二个
4. **日志**: 应看到推图任务加入了 pendingTaskQueue

---

## 📝 后续建议

1. **立即测试**: 先测试已完成的 4 项修复
2. **手动补全**: 应用 Bug #4 和剩余的 finally 块修复
3. **更新 Changelog**: 在 `changelogStore.js` 中添加 v2.45.3 版本记录
4. **监控日志**: 部署后关注生产环境日志，特别是 "定时任务调度服务" 相关日志

---

## 🛠️ 技术细节

### 核心修复原理

**队列消费死锁的根源**:
- scheduler tick 每次启动任务时会写入 localStorage
- 但队列消费时的 finally 块没有再次写入
- 导致如果第二个任务的 cron 表达式与第一个相同，会被防重检查拦截

**Health Check 三层递进式**:
- 层 1: 30 秒假启动 → 可能是依赖验证失败早退 → 建议刷新页面
- 层 2: 3 分钟常规 → 运行时间长但可能正常 → 警告级别
- 层 3: 5 分钟兜底 → 真实卡死 → 强制清理

**孤儿记录竞态的成因**:
- 旧实例被 stale 检测标记为 timeout
- 但物理连接还在后台运行
- 新实例也启动 → 同一任务并发执行两次
- 修复：检测到孤儿直接 return，等待 5 分钟后 healthCheck 再次检查

---

**修复版本**: v2.45.3  
**修复日期**: 2026-07-31  
**影响范围**: 定时任务调度系统核心逻辑  
**风险等级**: 低 (仅修复边界情况，不影响正常流程)
