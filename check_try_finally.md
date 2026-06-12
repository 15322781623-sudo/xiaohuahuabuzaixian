# 任务函数 try-finally 检查报告

## 检查结果

### ✅ 已修复的文件
- tasksHangUp.js (5个函数) - 已全部添加外层 try-finally

### ❌ 需要修复的文件

#### tasksItem.js (15个函数)
1. batchHeroUpgrade - 缺少外层 try-finally
2. batchBookUpgrade - 缺少外层 try-finally
3. batchClaimStarRewards - 缺少外层 try-finally
4. batchClaimPeachTasks - 缺少外层 try-finally
5. batchGenieSweep - 缺少外层 try-finally
6. batchOpenBox - 缺少外层 try-finally
7. batchOpenBoxByPoints - 缺少外层 try-finally
8. batchOpenFragmentPacks - 缺少外层 try-finally
9. batchOpenDiamondBox - 缺少外层 try-finally
10. batchClaimBoxWeeklyRewards - 缺少外层 try-finally
11. batchClaimBoxPointReward - 缺少外层 try-finally
12. batchFish - 缺少外层 try-finally
13. batchRecruit - 缺少外层 try-finally
14. heroFourSaintsUpgrade - 缺少外层 try-finally

#### tasksArena.js (3个函数)
1. batcharenafight - 缺少外层 try-finally
2. batchTopUpFish - 缺少外层 try-finally
3. batchTopUpArena - 缺少外层 try-finally

#### tasksDungeon.js (4个函数)
1. batchbaoku13 - 缺少外层 try-finally
2. batchbaoku45 - 缺少外层 try-finally
3. batchmengjing - 缺少外层 try-finally
4. batchBuyDreamItems - 缺少外层 try-finally

#### tasksCar.js (3个函数)
1. batchSmartSendCar - 已修复（有 try-finally）
2. batchClaimCars - 已修复（有 try-finally）
3. batchCarResearchUpgrade - 需要检查

#### tasksTower.js (需要检查)
- climbTower
- climbWeirdTower
- batchClaimFreeEnergy
- skinChallenge
- batchUseItems
- batchMergeItems

#### tasksStore.js (需要检查)
多个商店相关函数

#### tasksBottle.js (需要检查)
- resetBottles
- batchlingguanzi

#### tasksLegacy.js (需要检查)
- batchLegacyClaim
- batchLegacyGiftSendEnhanced

## 修复优先级
1.  高优先级：正在使用的功能（收菜、发车、竞技场等）
2. 🟡 中优先级：常用功能
3.  低优先级：不常用功能
