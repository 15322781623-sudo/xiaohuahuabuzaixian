/**
 * APK 更新检查逻辑测试脚本
 * 模拟 useApkUpdate.js 中的版本比较逻辑
 */

// 模拟版本数据
const testCases = [
  {
    name: '2.24.0 -> 2.25.0 (应该提示更新)',
    localVersion: { versionName: '2.24.0', versionCode: 22400 },
    serverInfo: {
      latestVersion: '2.25.0',
      versionCode: 22500,
      minVersionCode: 21500,
      forceUpdate: false,
    },
    expected: true,
  },
  {
    name: '2.25.0 -> 2.25.0 (不应提示更新)',
    localVersion: { versionName: '2.25.0', versionCode: 22500 },
    serverInfo: {
      latestVersion: '2.25.0',
      versionCode: 22500,
      minVersionCode: 21500,
      forceUpdate: false,
    },
    expected: false,
  },
  {
    name: '2.18.0 -> 2.25.0 (应该提示更新)',
    localVersion: { versionName: '2.18.0', versionCode: 21800 },
    serverInfo: {
      latestVersion: '2.25.0',
      versionCode: 22500,
      minVersionCode: 21500,
      forceUpdate: false,
    },
    expected: true,
  },
  {
    name: '2.14.0 -> 2.25.0 (低于最低版本，应该强制更新)',
    localVersion: { versionName: '2.14.0', versionCode: 21400 },
    serverInfo: {
      latestVersion: '2.25.0',
      versionCode: 22500,
      minVersionCode: 21500,
      forceUpdate: false,
    },
    expected: true,
  },
];

console.log('=== APK 更新检查逻辑测试 ===\n');

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  
  const { localVersion, serverInfo, expected } = testCase;
  
  // 模拟版本比较逻辑（来自 useApkUpdate.js 第 106-110 行）
  const serverCode = Number(serverInfo.versionCode) || 0;
  const localCode = localVersion.versionCode;
  const isBelowMinVersion = serverCode > 0 && localCode < (serverInfo.minVersionCode || 0);
  const hasNewerVersion = serverCode > localCode;
  
  const shouldUpdate = hasNewerVersion || isBelowMinVersion;
  
  console.log(`  本地版本: ${localVersion.versionName} (code: ${localCode})`);
  console.log(`  服务器版本: ${serverInfo.latestVersion} (code: ${serverCode})`);
  console.log(`  hasNewerVersion: ${hasNewerVersion}`);
  console.log(`  isBelowMinVersion: ${isBelowMinVersion}`);
  console.log(`  应该更新: ${shouldUpdate}`);
  console.log(`  预期结果: ${expected}`);
  
  if (shouldUpdate === expected) {
    console.log(`  ✅ 测试通过\n`);
  } else {
    console.log(`  ❌ 测试失败\n`);
    allPassed = false;
  }
});

// 测试跳过版本逻辑
console.log('测试 5: 用户已跳过版本');
const skipVersion = '2.25.0';
const serverInfo = { latestVersion: '2.25.0', forceUpdate: false };
const shouldSkip = skipVersion === serverInfo.latestVersion && !serverInfo.forceUpdate;
console.log(`  skipVersion: ${skipVersion}`);
console.log(`  serverInfo.latestVersion: ${serverInfo.latestVersion}`);
console.log(`  应该跳过: ${shouldSkip}`);
if (shouldSkip) {
  console.log(`  ✅ 测试通过\n`);
} else {
  console.log(`  ❌ 测试失败\n`);
  allPassed = false;
}

console.log('=== 测试总结 ===');
if (allPassed) {
  console.log('✅ 所有测试通过！版本比较逻辑正常。');
} else {
  console.log(' 有测试失败，请检查版本比较逻辑。');
}
