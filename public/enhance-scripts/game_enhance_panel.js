(function () {

  'use strict';

  const unsafeWindow = (typeof globalThis !== 'undefined' && globalThis.unsafeWindow)

    ? globalThis.unsafeWindow

    : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));

  

  console.log('[宝箱助手] 无UI版 v1.0 已启动，等待游戏环境...');



  // ==================== 状态变量 ====================

  let __stopRequested = false;

  let __isRunning = false;



  // ==================== 核心工具函数 ====================

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));



  const log = (msg) => {

    console.log('[宝箱助手] ' + msg);

  };



  const tip = (msg) => {

    try {

      unsafeWindow['__require']('TipsManager').SHOW_TIP(msg);

    } catch (_) {}

    log(msg);

  };

  

  // 延迟显示启动提示，等待 tip 函数可用

  setTimeout(() => {

    try {

      tip('🎮 宝箱助手已启动');

    } catch (_) {}

  }, 1000);



  const getGameServices = () => {

    try { return unsafeWindow['__require']('data-index'); } catch (_) { return null; }

  };



  // ==================== 游戏会话就绪检测 ====================

  /**

   * 检测游戏会话是否已完全建立：

   * 1) ROLE.id 存在且为有效数值 ID（非 'default'/空/0）

   * 2) WebSocket 可用且有 sendAsync 方法

   * 3) data-index 服务层已加载

   */

  const isGameSessionReady = () => {

    try {

      // 检查角色数据

      const role = unsafeWindow.ROLE;

      if (!role) return false;

      const id = String(role.id || '');

      if (!id || id === '0' || id === 'default' || id === 'undefined' || id === 'null') return false;

      // 检查 WebSocket 连接

      const ws = unsafeWindow.ws || unsafeWindow.h5websocket?.ws;

      if (!ws || typeof ws.sendAsync !== 'function') return false;

      // 检查游戏服务层

      const GS = getGameServices();

      if (!GS) return false;

      return true;

    } catch (_) { return false; }

  };



  /**

   * 等待游戏会话就绪（轮询，最长 maxWaitMs 毫秒）

   * @returns {Promise<boolean>} true=就绪，false=超时

   */

  const waitForGameReady = (maxWaitMs = 60000) => {

    return new Promise((resolve) => {

      if (isGameSessionReady()) { resolve(true); return; }

      const startTime = Date.now();

      const check = setInterval(() => {

        if (isGameSessionReady()) {

          clearInterval(check);

          resolve(true);

        } else if (Date.now() - startTime > maxWaitMs) {

          clearInterval(check);

          resolve(false);

        }

      }, 1000);

    });

  };







  const getItemStock = (itemId) => {

    try {

      const items = unsafeWindow.ROLE?.items;

      if (!items) return 0;

      if (typeof items.get === 'function') {

        const it = items.get(Number(itemId)) ?? items.get(String(itemId));

        return Number(it?.quantity ?? it?.number ?? it?.count ?? it?.num ?? it?.value ?? 0);

      }

      const it = items[itemId] ?? items[String(itemId)];

      return Number(it?.quantity ?? it?.number ?? it?.count ?? it?.num ?? it?.value ?? 0);

    } catch (_) { return 0; }

  };



  const showTextDialog = (btnRef, text) => {

    try {

      const UI = unsafeWindow['__require']('index-ui');

      const HD = unsafeWindow['__require']('HelpTextDialog');

      const cfg = {};

      cfg[HD.HelpTextDialog.OP_OBJ] = btnRef;

      cfg[HD.HelpTextDialog.OP_CONTENT] = text;

      UI.SHOW_PROXY_OVER(HD.HelpTextDialog, cfg);

    } catch (e) {

      log('弹窗失败: ' + e.message);

    }

  };



  const showConfirm = (content, onYes) => {

    try {

      const UI = unsafeWindow['__require']('index-ui');

      const Dlg = unsafeWindow['__require']('NormalDialog');

      UI.SHOW_SIMPLE_DIALOG(Dlg.NormalDialog, {

        content: content,

        [Dlg.NormalDialog.OP_BUTTON_MODE]: Dlg.NormalButtonMode.TwoButton,

        [Dlg.NormalDialog.OP_BTN_YES_TITLE]: '确定',

        [Dlg.NormalDialog.OP_BTN_NO_TITLE]: '取消',

        hook: function (result) { if (result && onYes) onYes(); }

      });

    } catch (e) {

      log('确认弹窗失败: ' + e.message);

      if (onYes) onYes();

    }

  };





  // ==================== 开箱API ====================

  const tryOpenBox = async (itemId, number) => {

    const GS = getGameServices();

    try {

      if (GS?.ItemService) {

        await GS.ItemService.openBox({ itemId, number });

      } else if (typeof unsafeWindow.sendMsg === 'function') {

        await unsafeWindow.sendMsg('item_openbox', { itemId, number });

      } else {

        throw new Error('缺少环境支持');

      }

      await sleep(200);

      log('开箱成功 itemId=' + itemId + ' x' + number);

      return true;

    } catch (e) {

      log('开箱失败: ' + (e?.message || e));

      return false;

    }

  };



  const batchClaimBoxPointReward = async () => {

    const GS = getGameServices();

    try {

      if (GS?.ItemService) {

        await GS.ItemService.batchClaimBoxPointReward({});

      } else if (typeof unsafeWindow.sendMsg === 'function') {

        await unsafeWindow.sendMsg('item_batchclaimboxpointreward', {});

      }

      log('领取宝箱积分奖励成功');

    } catch (e) {

      log('领取宝箱积分失败: ' + (e?.message || e));

    }

  };



  const claimAllMail = async () => {

    const GS = getGameServices();

    try {

      if (GS?.MailService) {

        await GS.MailService.claimAllAttachment({ category: 0 });

      }

      log('领取邮件成功');

    } catch (e) {

      log('领取邮件失败: ' + (e?.message || e));

    }

  };



  // ==================== 角色ID和存储管理 ====================

  

  // 获取当前角色ID

  const getRoleId = () => {

    try {

      // 尝试从unsafeWindow.ROLE获取

      if (unsafeWindow.ROLE?.id) {

        return String(unsafeWindow.ROLE.id);

      }

      if (unsafeWindow.ROLE?.roleId) {

        return String(unsafeWindow.ROLE.roleId);

      }

      if (unsafeWindow.ROLE?.userId) {

        return String(unsafeWindow.ROLE.userId);

      }

      

      // 尝试从GameServices获取

      const GS = getGameServices();

      if (GS?.RoleService?.roleId) {

        return String(GS.RoleService.roleId);

      }

      if (GS?.RoleService?.id) {

        return String(GS.RoleService.id);

      }

      

      // 如果获取不到，使用默认值

      return 'default';

    } catch (e) {

      return 'default';

    }

  };

  

  // 获取带roleId前缀的localStorage key

  const getStorageKey = (key) => {

    const roleId = getRoleId();

    return `baoxiang_${roleId}_${key}`;

  };

  

  // 保存黑市周商品勾选状态

  const saveBlackmarketCheckboxes = () => {

    try {

      const checkboxes = document.querySelectorAll('.blackmarket-goods-checkbox');

      const checkedIndexes = [];

      checkboxes.forEach(cb => {

        if (cb.checked) {

          checkedIndexes.push(cb.getAttribute('data-goods-index'));

        }

      });

      const storageKey = getStorageKey('blackmarket_checked');

      localStorage.setItem(storageKey, JSON.stringify(checkedIndexes));

    } catch (e) {

      log('[错误] 保存勾选状态失败: ' + (e?.message || e));

    }

  };

  

  // 恢复黑市周商品勾选状态

  const restoreBlackmarketCheckboxes = () => {

    try {

      const storageKey = getStorageKey('blackmarket_checked');

      const saved = localStorage.getItem(storageKey);

      

      if (!saved) {

        return; // 无保存数据

      }

      

      const checkedIndexes = JSON.parse(saved);

      const checkboxes = document.querySelectorAll('.blackmarket-goods-checkbox');

      

      checkboxes.forEach(cb => {

        const index = cb.getAttribute('data-goods-index');

        if (checkedIndexes.includes(index)) {

          cb.checked = true;

        }

      });

      

      const logEl = document.getElementById('bx-log');

      if (logEl) {

        const line = document.createElement('div');

        line.textContent = '[系统] 已恢复黑市周勾选状态，共' + checkedIndexes.length + '个商品';

        logEl.appendChild(line);

      }

    } catch (e) {

      log('[错误] 恢复勾选状态失败: ' + (e?.message || e));

    }

  };



  const claimWeeklyReward = async () => {

    const GS = getGameServices();

    let claimed = 0;

    for (let i = 0; i < 5; i++) {

      try {

        if (GS?.ActivityService) {

          await GS.ActivityService.buyStoreGoods({ activityId: 7, goodsIndex: i, buyNum: 1 });

        } else if (typeof unsafeWindow.sendMsg === 'function') {

          await unsafeWindow.sendMsg('activity_buystoregoods', { activityId: 7, goodsIndex: i, buyNum: 1 });

        }

        claimed++;

        await sleep(200);

      } catch (_) {}

    }

    log('周常奖励领取完成: ' + claimed + '个');

  };



  // ==================== 获取活动进度 ====================

  const pickBoxActivityInfo = (info) => {

    try {

      if (!info) return null;

      let d = null;

      // 优先尝试 key=2（历史实现）

      if (typeof info.get === 'function') {

        d = info.get(2) || info.get('2');

      } else {

        d = info['2'] || info[2];

      }

      // 找不到则遍历寻找包含 rounds/num 的条目

      if (!d) {

        if (typeof info.forEach === 'function') {

          info.forEach((v) => {

            if (!d && v && (v.rounds != null || v.round != null) && (v.num != null || v.points != null)) d = v;

          });

        } else if (typeof info === 'object') {

          for (const k in info) {

            const v = info[k];

            if (v && (v.rounds != null || v.round != null) && (v.num != null || v.points != null)) { d = v; break; }

          }

          if (!d) {

            const keys = Object.keys(info);

            if (keys.length === 1) d = info[keys[0]];

          }

        }

      }

      if (!d) return null;

      return { points: Number(d.num ?? d.points ?? 0), rounds: Number(d.rounds ?? d.round ?? 1) };

    } catch (_) { return null; }

  };



  const getProgressFromServerData = () => {

    try {

      const SD =

        unsafeWindow.SERVER_DATA ||

        unsafeWindow?.__require?.('ServerData')?.SERVER_DATA ||

        unsafeWindow?.__require?.('orange/data/ServerData')?.SERVER_DATA ||

        unsafeWindow?.__require?.('../orange/data/ServerData')?.SERVER_DATA;

      const info = SD?.activity?.myTotalInfo;

      return pickBoxActivityInfo(info);

    } catch (_) { return null; }

  };



  const fetchActivityProgress = async () => {

    try {

      if (typeof unsafeWindow.sendMsg === 'function') {

        const res = await unsafeWindow.sendMsg('activity_get', {});

        const data = typeof res?.getData === 'function' ? res.getData() : res;

        const prog = pickBoxActivityInfo(data?.myTotalInfo);

        if (prog) return prog;

      }

    } catch (_) {}

    try {

      const GS = getGameServices();

      if (GS?.ActivityService) {

        const res = GS.ActivityService.get ? await GS.ActivityService.get({}) :

                    (GS.ActivityService.getActivity ? await GS.ActivityService.getActivity({}) : null);

        const data = typeof res?.getData === 'function' ? res.getData() : res;

        const prog = pickBoxActivityInfo(data?.myTotalInfo);

        if (prog) return prog;

      }

    } catch (_) {}

    return getProgressFromServerData();

  };



  const getBoxPoint = () => {

    try {

      return unsafeWindow.ROLE?.boxPoint || 0;

    } catch (_) { return 0; }

  };



  // ==================== 一键N轮开箱 ====================

  const BOX_POINTS = { 2001: 1, 2002: 10, 2003: 20, 2004: 50 };



  const runRounds = async (roundsToComplete) => {

    if (__isRunning) { tip('⚠️ 任务进行中，请稍候...'); return; }

    __isRunning = true;

    __stopRequested = false;

    tip('🎯 开始一键' + roundsToComplete + '轮宝箱');



    try {

      const prog = await fetchActivityProgress();

      if (!prog) { tip('⚠️ 无法获取活动进度'); return; }



      const startProgress = (prog.rounds - 1) * 8000 + prog.points;

      const currentRoundEnd = (Math.floor(startProgress / 8000) + 1) * 8000;

      const targetProgress = Math.min(32000, currentRoundEnd + (roundsToComplete - 1) * 8000);

      log('起始=' + startProgress + ' 目标=' + targetProgress);



      let loopCount = 0;

      const maxLoops = 500;

      // 青铜优先

      const priority = [2002, 2003, 2004];



      while (loopCount < maxLoops) {

        if (__stopRequested) { tip('⛔ 已停止开箱'); break; }

        loopCount++;



        const curProg = await fetchActivityProgress();

        if (!curProg) { tip('⚠️ 获取进度失败'); break; }

        const currentProgress = (curProg.rounds - 1) * 8000 + curProg.points;



        if (currentProgress >= targetProgress) {

          tip('🎉 已达到目标 ' + targetProgress + ' 积分！');

          break;

        }



        const remain = targetProgress - currentProgress;

        if (loopCount % 10 === 1) {

          tip('进度: ' + currentProgress + '/' + targetProgress + ' (还需' + remain + ')');

        }



        let opened = false;



        // 按优先级开箱

        for (const boxId of priority) {

          if (__stopRequested) break;

          const stock = getItemStock(boxId);

          const pts = BOX_POINTS[boxId];

          if (stock < 10) continue;



          const maxBoxes = Math.floor(remain / pts);

          if (maxBoxes < 10) continue;



          const actual = Math.floor(Math.min(100, maxBoxes, stock) / 10) * 10;

          if (actual < 10) continue;



          const ok = await tryOpenBox(boxId, actual);

          if (ok) {

            opened = true;

            // 检查积分是否需要领取

            const bp = getBoxPoint();

            if (bp >= 100) {

              await batchClaimBoxPointReward();

            }

            await sleep(100);

            break;

          }

        }



        // 高级箱子不够，用木质补齐

        if (!opened && remain > 0) {

          // 先尝试领取积分奖励获取新箱子

          const bp = getBoxPoint();

          if (bp >= 100) {

            await batchClaimBoxPointReward();

            await sleep(300);

            const newBronze = Math.floor(getItemStock(2002) / 10) * 10;

            const newGold = Math.floor(getItemStock(2003) / 10) * 10;

            if (newBronze >= 10 || newGold >= 10) continue;

          }



          const woodStock = getItemStock(2001);

          if (woodStock <= 0) { tip('❌ 所有宝箱用完'); break; }



          const wtake = Math.min(remain, woodStock, 50);

          if (wtake > 0) {

            const ok = await tryOpenBox(2001, wtake);

            if (ok) {

              opened = true;

              await sleep(200);

            }

          }

        }



        if (!opened) {

          tip('⛔ 无法继续开箱（库存不足）');

          break;

        }

      }



      // 完成后领取

      await batchClaimBoxPointReward();

      await claimAllMail();

      tip('✅ 一键' + roundsToComplete + '轮完成！');

    } catch (e) {

      tip('❌ 出错: ' + (e?.message || e));

    } finally {

      __isRunning = false;

    }

  };



  // ==================== 一键开钻石宝箱 ====================

  const openAllDiamondBoxes = async () => {

    if (__isRunning) { tip('⚠️ 任务进行中'); return; }

    __isRunning = true;

    try {

      const stock = getItemStock(2005);

      if (stock <= 0) { tip('❌ 没有钻石宝箱'); return; }

      tip('💎 开启 ' + stock + ' 个钻石宝箱');



      let ok = 0, fail = 0;

      const batches = Math.floor(stock / 10);

      const remainder = stock % 10;



      for (let i = 0; i < batches; i++) {

        if (await tryOpenBox(2005, 10)) ok += 10; else fail += 10;

        await sleep(300);

      }

      if (remainder > 0) {

        if (await tryOpenBox(2005, remainder)) ok += remainder; else fail += remainder;

      }



      await batchClaimBoxPointReward();

      await claimAllMail();

      tip('💎 钻石宝箱完成！成功' + ok + '个，失败' + fail + '个');

    } catch (e) {

      tip('❌ 出错: ' + (e?.message || e));

    } finally {

      __isRunning = false;

    }

  };



  // ==================== 宝箱计算器 ====================

  const BoxCalculator = {

    BOX_CONFIG: { '2001': 1, '2002': 10, '2003': 20, '2004': 50, '2005': 0 },

    STAGES: { values: [10,20,30,40,80,100,70,50,100], boxes: ['青铜','青铜','黄金','铂金','铂金','铂金','黄金','铂金','钻石'] },

    POINTS_MAP: { '青铜': 10, '黄金': 20, '铂金': 50, '钻石': 0 },



    calcRecursive: function (pts, reqPts, boxType, skipPlat, diamonds, totalPts) {

      const { values, boxes } = this.STAGES;

      let idx = boxes.findIndex((b, i) => b === boxType && values[i] === reqPts);

      if (idx === -1) return { error: '档位错误' };

      if (pts < reqPts) return { totalPts, diamonds, info: pts + '/' + reqPts + ' (' + boxType + ')' };



      const cnt = { '青铜':0, '黄金':0, '铂金':0, '钻石':0 };

      let rem = pts;

      while (rem >= values[idx]) { rem -= values[idx]; cnt[boxes[idx]]++; idx = (idx+1) % values.length; }



      const add = cnt['青铜']*10 + cnt['黄金']*20 + (skipPlat ? 0 : cnt['铂金']*50);

      return this.calcRecursive(rem + add, values[idx], boxes[idx], skipPlat, diamonds + cnt['钻石'], totalPts + add);

    },



    calculate: function () {

      const w = getItemStock(2001), b = getItemStock(2002), g = getItemStock(2003), p = getItemStock(2004);

      const bp = getBoxPoint();

      // 领取奖励预估

      const claimTimes = Math.floor(bp / 1000);

      const tb = b + claimTimes*10, tg = g + claimTimes*5, tp = p + claimTimes;



      const pAll = w*1 + tb*10 + tg*20 + tp*50 + bp;

      const pNoWood = tb*10 + tg*20 + tp*50 + bp;

      const pNoPlat = w*1 + tb*10 + tg*20 + bp;



      const r1 = this.calcRecursive(pAll, 10, '青铜', false, 0, 0);

      const r2 = this.calcRecursive(pNoWood, 10, '青铜', false, 0, 0);

      const r3 = this.calcRecursive(pNoPlat, 10, '青铜', true, 0, 0);



      const fmt = (title, base, r) => {

        if (r.error) return title + ': 计算出错';

        const total = base + r.totalPts;

        return title + '\n' +

          '裸分: ' + base.toLocaleString() + '\n' +

          '总分: ' + total.toLocaleString() + '\n' +

          '轮数: ' + (total/8000).toFixed(2) + '轮 (下轮需' + (8000 - total%8000).toLocaleString() + ')\n' +

          '钻石宝箱: ' + r.diamonds + '个\n' +

          r.info;

      };



      let text = '===== 宝箱计算结果 =====\n';

      text += '木质:' + w + ' 青铜:' + tb + ' 黄金:' + tg + ' 铂金:' + tp + ' 积分:' + bp + '\n';

      if (claimTimes > 0) text += '(含领取' + claimTimes + '次奖励预估)\n';

      text += '\n' + fmt('【全开】', pAll, r1);

      text += '\n-----\n' + fmt('【不开木质】', pNoWood, r2);

      text += '\n-----\n' + fmt('【不开铂金】', pNoPlat, r3);

      text += '\n==========';

      return text;

    }

  };



  // ==================== 砸金蛋 ====================

  const trySmashEgg = async () => {

    const GS = getGameServices();

    try {

      const params = { itemId: 6001, number: 1, index: 0 };

      if (GS?.ItemService?.openPack) {

        await GS.ItemService.openPack(params);

      } else if (typeof unsafeWindow.sendMsg === 'function') {

        await unsafeWindow.sendMsg('item_openpack', params);

      }

      await sleep(200);

      return true;

    } catch (e) {

      log('砸蛋失败: ' + (e?.message || e));

      return false;

    }

  };



  const smashAllEggs = async () => {

    if (__isRunning) { tip('⚠️ 任务进行中'); return; }

    __isRunning = true;

    __stopRequested = false;

    try {

      const count = getItemStock(6001);

      if (count <= 0) { tip('❌ 没有金锤'); return; }

      tip('🥚 开始砸蛋 x' + count);



      let ok = 0, fail = 0;

      for (let i = 0; i < count; i++) {

        if (__stopRequested) { tip('⛔ 已停止'); break; }

        if (await trySmashEgg()) ok++; else fail++;

        if ((i+1) % 10 === 0) tip('砸蛋进度: ' + (i+1) + '/' + count);

        await sleep(300);

      }

      await claimAllMail();

      tip('🥚 砸蛋完成！成功' + ok + '次，失败' + fail + '次');

    } catch (e) {

      tip('❌ 出错: ' + (e?.message || e));

    } finally {

      __isRunning = false;

    }

  };



  // ==================== 招募 ====================

  const tryRecruit = async (type, number) => {

    const GS = getGameServices();

    try {

      const params = { byClub: false, recruitNumber: number, recruitType: type };

      if (GS?.HeroService?.recruit) {

        await GS.HeroService.recruit(params);

      } else if (typeof unsafeWindow.sendMsg === 'function') {

        await unsafeWindow.sendMsg('hero_recruit', params);

      }

      await sleep(200);

      return true;

    } catch (e) {

      log('招募失败: ' + (e?.message || e));

      return false;

    }

  };



  const runRecruitRounds = async (rounds) => {

    if (__isRunning) { tip('⚠️ 任务进行中'); return; }

    __isRunning = true;

    __stopRequested = false;

    try {

      const perRound = 400;

      const target = rounds * perRound;

      const tokens = getItemStock(1001);

      if (tokens < target) { tip('❌ 招募令不足: ' + tokens + '/' + target); __isRunning = false; return; }

      tip('🎯 开始' + rounds + '轮招募 (需' + target + '招募令)');



      let done = 0;

      for (let i = 0; i < target; i++) {

        if (__stopRequested) { tip('⛔ 已停止招募'); break; }

        if (await tryRecruit(1, 1)) {

          done++;

          if (done % perRound === 0) {

            tip('🎉 完成第' + (done/perRound) + '轮！领取邮件...');

            await claimAllMail();

          }

          if (done % 50 === 0) tip('招募进度: ' + done + '/' + target);

        }

        await sleep(300);

      }

      await claimAllMail();

      tip('✅ 招募完成！共' + done + '次');

    } catch (e) {

      tip('❌ 出错: ' + (e?.message || e));

    } finally {

      __isRunning = false;

    }

  };



  // ==================== 扫荡 ====================

  const getHighestGenie = () => {

    const names = { 1:'魏国', 2:'蜀国', 3:'吴国', 4:'群雄' };

    let maxLv = 0, maxId = 1;

    

    for (let id = 1; id <= 4; id++) {

      let lv = 0;

      try {

        const g = unsafeWindow.ROLE?.genie;

        if (typeof g?.get === 'function') {

          lv = g.get(id) || 0;

        } else if (g) {

          lv = g[id] || 0;

        }

      } catch (_) {}

      if (lv > maxLv) { maxLv = lv; maxId = id; }

    }

    

    return { id: maxId, level: maxLv, name: names[maxId] };

  };



  const useSweepTickets = async (useCount) => {

    if (__isRunning) { tip('⚠️ 任务进行中'); return; }

    __isRunning = true;

    __stopRequested = false;

    const GS = getGameServices();

    try {

      const tickets = getItemStock(1021);

      if (tickets <= 0) { tip('❌ 没有扫荡券'); __isRunning = false; return; }



      const genie = getHighestGenie();

      if (genie.level === 0) { tip('❌ 所有灯神层数为0'); __isRunning = false; return; }



      // useCount=0或未定义表示使用全部

      const actualCount = (!useCount || useCount <= 0) ? tickets : Math.min(useCount, tickets);

      

      // 注意：扫荡的是"已通关层数+1"，即当前可挑战的最高层

      const sweepLevel = genie.level + 1;

      tip('🎫 扫荡 ' + genie.name + '(第' + sweepLevel + '层) x' + actualCount + ' (剩余' + tickets + '张)');



      const maxPer = 20;

      let remain = actualCount, ok = 0, fail = 0;

      while (remain > 0) {

        if (__stopRequested) { tip('⛔ 已停止'); break; }

        const batch = Math.min(maxPer, remain);

        try {

          if (GS?.GenieService?.sweep) {

            await GS.GenieService.sweep({ genieId: genie.id, sweepCnt: batch });

          } else if (typeof unsafeWindow.sendMsg === 'function') {

            await unsafeWindow.sendMsg('genie_sweep', { genieId: genie.id, sweepCnt: batch });

          }

          ok += batch;

          await sleep(200);

        } catch (_) {

          fail += batch;

        }

        remain -= batch;

      }

      await claimAllMail();

      tip('🎫 扫荡完成！成功' + ok + '张，失败' + fail + '张');

    } catch (e) {

      tip('❌ 出错: ' + (e?.message || e));

    } finally {

      __isRunning = false;

    }

  };



  // ==================== 全局变量：保存宝箱按钮样式 ====================

  let __boxBtnResourceURL = null;



  // ==================== 主动加载宝箱按钮样式 ====================

  const loadBoxButtonStyle = () => {

    try {

      const fgui = unsafeWindow.fgui;

      if (!fgui || !fgui.UIPackage) return;

      

      // 尝试加载 BoxPanel 模块获取按钮样式

      try {

        const BoxPanelModule = unsafeWindow['__require']('BoxPanel');

        if (BoxPanelModule?.BoxPanel) {

          // 创建一个临时实例来获取按钮样式

          const tempPanel = new BoxPanelModule.BoxPanel();

          if (tempPanel.ui?.m_selectedBox?.m_btnOpen) {

            __boxBtnResourceURL = tempPanel.ui.m_selectedBox.m_btnOpen.resourceURL;

            log('✅ 已获取宝箱按钮样式: ' + __boxBtnResourceURL);

            // ★ 安全dispose: 组件无node, 绕过Cocos2d内部cleanup
            if (tempPanel.node && tempPanel.node.isValid) {
              try { tempPanel.dispose(); } catch (_) {}
            }

            return true;

          }

          // ★ 安全dispose: 组件无node
          if (tempPanel.node && tempPanel.node.isValid) {
            try { tempPanel.dispose(); } catch (_) {}
          }

        }

      } catch (_) {}

      

      // 尝试直接从 UI 包获取

      const packages = ['ui_box', 'ui_common'];

      const components = ['BtnOpen', 'BtnNormal1', 'BtnNormal2', 'BtnGreen1'];

      for (const pkg of packages) {

        for (const comp of components) {

          try {

            const btn = fgui.UIPackage.createObject(pkg, comp);

            if (btn && btn.resourceURL) {

              __boxBtnResourceURL = btn.resourceURL;

              log('✅ 已获取按钮样式: ' + pkg + '/' + comp);

              try { btn.dispose(); } catch (_) {}

              return true;

            }

            try { btn.dispose(); } catch (_) {}

          } catch (_) {}

        }

      }

    } catch (e) {

      log('获取按钮样式失败: ' + (e?.message || e));

    }

    return false;

  };



  // ==================== BoxPanel 注入 ====================

  const patchBoxPanel = (PanelClass) => {

    const origShow = PanelClass.prototype.onShow;

    PanelClass.prototype.onShow = function () {

      origShow.apply(this, arguments);

      // 保存宝箱按钮的 resourceURL 供其他界面使用

      try {

        const srcBtn = this.ui?.m_selectedBox?.m_btnOpen;

        if (srcBtn && srcBtn.resourceURL && !__boxBtnResourceURL) {

          __boxBtnResourceURL = srcBtn.resourceURL;

          log('✅ 已保存宝箱按钮样式: ' + __boxBtnResourceURL);

        }

      } catch (_) {}

      

      // 添加可折叠的轮数按钮

      try {

        if (this['_bx_round_btns'] && this['_bx_round_btns'].length === 0) this['_bx_round_btns'] = null;

        if (this['_bx_round_btns'] && this['_bx_round_btns'].length > 0) return;

        const ui = this.ui;

        const parent = ui;

        const fgui = unsafeWindow.fgui;

        const baseX = 84;

        const baseY = 187;



        const buildButtons = () => {

          const srcBtn = ui?.m_selectedBox?.m_btnOpen;

          if (!parent || !srcBtn) return false;

          const qbtn = ui?.m_quesHelp?.m_btnQues;

          const h = qbtn?.height || srcBtn.height || 36;

          const gapY = 8;

          const btnW = 110;

          const diamondIcon = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/d7/d71e9642-4860-4d00-98a6-d0119a61f40b.89530.png';



          const btns = [];

          

          // 创建折叠/展开按钮（使用BtnInfo2）

          const fgui = unsafeWindow.fgui;

          let toggleBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          

          if (!toggleBtn) return false;

          

          // 获取帮助按钮的位置

          const helpBtn = ui?.m_quesHelp;

          let toggleX = 20, toggleY = 100, toggleW = 60, toggleH = h;

          

          if (helpBtn) {

            toggleW = helpBtn.width || 60;

            toggleH = helpBtn.height || h;

            toggleX = helpBtn.x;

            toggleY = helpBtn.y + helpBtn.height + 10;

          }

          

          try { toggleBtn.clearClick(); } catch (_) {}

          try { toggleBtn.setSize(toggleW, toggleH); } catch (_) {}

          try { toggleBtn.setPosition(toggleX, toggleY); } catch (_) {}

          try { toggleBtn.touchable = true; } catch (_) {}

          try { toggleBtn.visible = true; } catch (_) {}

          try { toggleBtn.alpha = 1; } catch (_) {}

          try { toggleBtn.draggable = false; } catch (_) {}

          

          // 在按钮上覆盖宝箱图标，遮住三条横线

          try {

            const loader = new fgui.GLoader();

            loader.name = 'coverIcon';

            const boxIcon = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/0b/0b32202b-3cc2-4479-95da-a3e4d9409e36.b35e7.png';

            loader.url = boxIcon;

            // 图标大小设置为按钮的85%

            const iconSize = Math.min(toggleW, toggleH) * 0.85;

            loader.setSize(iconSize, iconSize);

            // 水平居中，垂直方向往上挪10像素

            const centerX = (toggleW - iconSize) / 2;

            const centerY = (toggleH - iconSize) / 2 - 10;

            loader.setPosition(centerX, centerY);

            try { loader.fill = fgui.LoaderFillType.ScaleFit; } catch (_) {}

            try { loader.shrinkOnly = true; } catch (_) {}

            toggleBtn.addChild(loader);

          } catch (_) {}

          

          // 功能按钮配置

          const btnConfigs = [

            { text: '', width: btnW, icon: diamondIcon, onClick: () => openAllDiamondBoxes() },

            { text: '一轮', width: btnW, onClick: () => runRounds(1) },

            { text: '两轮', width: btnW, onClick: () => runRounds(2) },

            { text: '三轮', width: btnW, onClick: () => runRounds(3) },

            { text: '四轮', width: btnW, onClick: () => runRounds(4) },

            { text: '停止', width: btnW, isRedText: true, onClick: () => {

              if (__isRunning) { 

                __stopRequested = true; 

                tip('⛔ 正在停止中...');

              } else {

                tip('⚠️ 当前没有运行中的任务');

              }

            }}

          ];

          

          // 创建功能按钮（默认隐藏，在原位置展开）

          let curY = baseY;

          for (let i = 0; i < btnConfigs.length; i++) {

            const cfg = btnConfigs[i];

            let newBtn = null;

            if (typeof srcBtn.clone === 'function') {

              newBtn = srcBtn.clone();

            } else if (srcBtn.resourceURL && fgui?.UIPackage?.createObjectFromURL) {

              newBtn = fgui.UIPackage.createObjectFromURL(srcBtn.resourceURL);

            }

            if (!newBtn) continue;



            try { newBtn.clearClick(); } catch (_) {}

            try { newBtn.title = cfg.text; } catch (_) {}

            try { newBtn.setSize(cfg.width, h); } catch (_) {}

            try { newBtn.setPosition(baseX, curY); } catch (_) {}

            try { newBtn.touchable = true; } catch (_) {}

            try { newBtn.visible = false; } catch (_) {} // 默认隐藏

            try { newBtn.alpha = 1; } catch (_) {}

            try { newBtn.draggable = false; } catch (_) {}

            

            // 处理红色文字

            if (cfg.isRedText) {

              try {

                const titleObj = newBtn.getChild('title') || newBtn.getTextField();

                if (titleObj && titleObj.color) {

                  titleObj.color = 0xff0000;

                }

              } catch (_) {}

              try {

                if (newBtn.titleColor !== undefined) {

                  newBtn.titleColor = 0xff0000;

                }

              } catch (_) {}

            }

            

            // 处理图标

            if (cfg.icon) {

              try { newBtn.title = ''; } catch (_) {}

              try { newBtn.icon = cfg.icon; } catch (_) {}

              try {

                const iconChild = newBtn.getChild && (newBtn.getChild('icon') || newBtn.getChild('m_icon'));

                if (iconChild) {

                  if ('icon' in iconChild) iconChild.icon = cfg.icon;

                  else if ('url' in iconChild) iconChild.url = cfg.icon;

                }

              } catch (_) {}

              try {

                if (!newBtn.getChild || !newBtn.getChild('diamondIcon')) {

                  const loader = new fgui.GLoader();

                  loader.name = 'diamondIcon';

                  loader.url = cfg.icon;

                  const pad = 12;

                  const size = Math.min(cfg.width, h) - pad * 2;

                  loader.setSize(size, size);

                  loader.setPosition((cfg.width - size) / 2, (h - size) / 2 - 5);

                  try { loader.fill = fgui.LoaderFillType.ScaleFit; } catch (_) {}

                  try { loader.shrinkOnly = true; } catch (_) {}

                  newBtn.addChild(loader);

                }

              } catch (_) {}

            }

            

            try { newBtn.onClick(cfg.onClick, this); } catch (_) {}

            try { parent.addChild(newBtn); } catch (_) {}

            try { parent.setChildIndex(newBtn, parent.numChildren - 1); } catch (_) {}

            btns.push(newBtn);

            curY += h + gapY;

          }

          

          // 设置折叠/展开逻辑

          let isExpanded = false;

          try {

            toggleBtn.onClick(() => {

              isExpanded = !isExpanded;

              btns.forEach(btn => {

                try { btn.visible = isExpanded; } catch (_) {}

              });

            }, this);

          } catch (_) {}

          

          try { parent.addChild(toggleBtn); } catch (_) {}

          try { parent.setChildIndex(toggleBtn, parent.numChildren - 1); } catch (_) {}

          

          // 保存所有按钮（包括折叠按钮）

          this['_bx_toggle_btn'] = toggleBtn;

          this['_bx_round_btns'] = btns;

          this['_bx_is_expanded'] = false;

          

          return true;

        };



        if (!buildButtons()) {

          if (!this['_bx_round_retry']) {

            this['_bx_round_retry_count'] = 0;

            this['_bx_round_retry'] = setInterval(() => {

              this['_bx_round_retry_count'] = (this['_bx_round_retry_count'] || 0) + 1;

              if (buildButtons() || this['_bx_round_retry_count'] >= 20) {

                try { clearInterval(this['_bx_round_retry']); } catch (_) {}

                this['_bx_round_retry'] = null;

                // no popup on failure

              }

            }, 250);

          }

        }

      } catch (_) {}

      

      // 添加一键领取宝箱积分按钮（在"宝箱王"按钮之后，"宝箱计算器"按钮之前）

      try {

        if (!this['_bx_claim_btn']) {

          const fgui = unsafeWindow.fgui;

          const claimBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (claimBtn) {

            const ui = this.ui;

            const toggleBtn = this['_bx_toggle_btn'];

            const helpBtn = ui?.m_quesHelp;

            

            // 放在"宝箱王"按钮的下面

            if (toggleBtn) {

              claimBtn.setPosition(toggleBtn.x, toggleBtn.y + toggleBtn.height + 10);

            } else if (helpBtn) {

              claimBtn.setPosition(helpBtn.x, helpBtn.y + helpBtn.height + 10);

            } else {

              claimBtn.setPosition(20, 20);

            }

            

            // 隐藏按钮内部的默认图标和文字

            try {

              const titleNames = ['title', 'm_title', 'Title'];

              for (const name of titleNames) {

                const titleChild = claimBtn.getChild(name);

                if (titleChild) titleChild.visible = false;

              }

              

              const iconNames = ['icon', 'm_icon', 'Icon', 'img', 'm_img'];

              for (const name of iconNames) {

                const iconChild = claimBtn.getChild(name);

                if (iconChild) iconChild.visible = false;

              }

              

              if (claimBtn.numChildren) {

                for (let j = 0; j < claimBtn.numChildren; j++) {

                  const child = claimBtn.getChildAt(j);

                  if (child && child.constructor) {

                    const typeName = child.constructor.name;

                    if (typeName === 'GLoader' || typeName === 'GTextField') {

                      child.visible = false;

                    }

                  }

                }

              }

              

              if ('icon' in claimBtn) claimBtn.icon = '';

            } catch (_) {}

            

            // 添加宝箱积分图标

            try {

              const loader = new fgui.GLoader();

              loader.name = 'pointIcon';

              const pointIcon = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/2a/2a14096b-a051-4d32-8aad-d2fa600529a9.23297.png';

              loader.url = pointIcon;

              const iconSize = Math.min(claimBtn.width, claimBtn.height) * 0.75;

              loader.setSize(iconSize, iconSize);

              const centerX = (claimBtn.width - iconSize) / 2 + 3;

              const centerY = (claimBtn.height - iconSize) / 2 - 6.5;

              loader.setPosition(centerX, centerY);

              try { loader.fill = fgui.LoaderFillType.ScaleFree; } catch (_) {}

              claimBtn.addChild(loader);

            } catch (_) {}

            

            claimBtn.onClick(async () => {

              try {

                tip('🎁 正在领取宝箱积分奖励...');

                await batchClaimBoxPointReward();

                tip('✅ 宝箱积分奖励领取完成');

              } catch (e) {

                tip('❌ 领取失败: ' + (e?.message || e));

              }

            }, this);

            ui.addChild(claimBtn);

            this['_bx_claim_btn'] = claimBtn;

          }

        }

      } catch (_) {}

      

      // 添加宝箱计算器按钮（在"一键领取宝箱积分"按钮之后创建）

      try {

        if (!this['_bx_calc_btn']) {

          const fgui = unsafeWindow.fgui;

          const calcBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (calcBtn) {

            const ui = this.ui;

            const claimBtn = this['_bx_claim_btn'];

            const toggleBtn = this['_bx_toggle_btn'];

            const helpBtn = ui?.m_quesHelp;

            

            // 放在"一键领取宝箱积分"按钮的下面

            if (claimBtn) {

              calcBtn.setPosition(claimBtn.x, claimBtn.y + claimBtn.height + 10);

            } else if (toggleBtn) {

              calcBtn.setPosition(toggleBtn.x, toggleBtn.y + toggleBtn.height + 10);

            } else if (helpBtn) {

              calcBtn.setPosition(helpBtn.x, helpBtn.y + helpBtn.height + 10);

            } else {

              calcBtn.setPosition(20, 20);

            }

            

            calcBtn.onClick(() => {

              try {

                const result = BoxCalculator.calculate();

                showTextDialog(this['_bx_calc_btn'], result);

              } catch (e) {

                tip('⚠️ 计算出错: ' + (e?.message || e));

              }

            }, this);

            ui.addChild(calcBtn);

            this['_bx_calc_btn'] = calcBtn;

            this['_bx_calc_btn_size'] = { width: calcBtn.width, height: calcBtn.height };

          }

        }

      } catch (_) {}

    };



    const origHide = PanelClass.prototype.onHide;

    PanelClass.prototype.onHide = function () {

      if (this['_bx_calc_btn']) {

        try { this['_bx_calc_btn'].dispose(); } catch (_) {}

        this['_bx_calc_btn'] = null;

      }

      if (this['_bx_calc_btn_size']) {

        this['_bx_calc_btn_size'] = null;

      }

      if (this['_bx_claim_btn']) {

        try { this['_bx_claim_btn'].dispose(); } catch (_) {}

        this['_bx_claim_btn'] = null;

      }

      if (this['_bx_toggle_btn']) {

        try { this['_bx_toggle_btn'].dispose(); } catch (_) {}

        this['_bx_toggle_btn'] = null;

      }

      if (this['_bx_round_btns']) {

        this['_bx_round_btns'].forEach(b => { try { b.dispose(); } catch (_) {} });

        this['_bx_round_btns'] = null;

      }

      if (this['_bx_round_retry']) {

        try { clearInterval(this['_bx_round_retry']); } catch (_) {}

        this['_bx_round_retry'] = null;

      }

      if (this['_bx_round_retry_count']) {

        this['_bx_round_retry_count'] = null;

      }

      if (this['_bx_is_expanded']) {

        this['_bx_is_expanded'] = null;

      }

      origHide.apply(this, arguments);

    };

    log('✅ 注入 BoxPanel');

    // removed debug tip

  };



  // ==================== BoxWeekGoldEggDialog 注入 ====================

  const patchGoldEggDialog = (DialogClass) => {

    const origShow = DialogClass.prototype.onShown;

    DialogClass.prototype.onShown = function () {

      origShow.apply(this, arguments);

      // TODO: 在此处添加砸蛋 UI 按钮

    };



    const origHide = DialogClass.prototype.onHide;

    DialogClass.prototype.onHide = function () {

      // TODO: 在此处清理砸蛋 UI 按钮

      origHide.apply(this, arguments);

    };

    log('✅ 注入 BoxWeekGoldEggDialog');

  };



  // ==================== GeniePanel 注入 ====================

  const patchGeniePanel = (PanelClass) => {

    const origShow = PanelClass.prototype.onShow;

    PanelClass.prototype.onShow = function () {

      origShow.apply(this, arguments);

      

      // 添加扫荡券按钮

      try {

        if (this['_sweep_btns'] && this['_sweep_btns'].length === 0) this['_sweep_btns'] = null;

        if (this['_sweep_btns'] && this['_sweep_btns'].length > 0) return;

        const ui = this.ui;

        const parent = ui;

        const fgui = unsafeWindow.fgui;



        const buildButtons = () => {

          if (!parent) return false;

          

          // 查找问号按钮，如果没有则使用固定位置

          const helpBtn = ui?.m_quesHelp;

          

          // 按钮放在问号的右边，往下153像素

          const baseX = helpBtn ? (helpBtn.x + helpBtn.width + 10) : 100;

          const baseY = helpBtn ? (helpBtn.y + 153) : 173;

          

          // 尝试从界面找到可以克隆的按钮

          let srcBtn = null;

          try {

            const btnNames = ['m_btnBG2', 'm_btnOne', 'm_btnTen', 'm_btnSweep'];

            for (const name of btnNames) {

              if (ui[name]) {

                srcBtn = ui[name];

                break;

              }

            }

          } catch (_) {}

          

          const h = 32;

          const gapX = 5; // 缩小横向间距，让按钮更紧凑

          const btnW = 90;

          const sweepIcon = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/eb/ebbea2e3-a081-4ca6-97f8-d9b5a97b20d8.d6d2e.png'; // 扫荡券图标



          const btns = [];

          

          // 创建折叠/展开按钮

          let toggleBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (!toggleBtn) {

            return false;

          }

          

          const toggleW = 50;

          const toggleH = h;

          const toggleX = baseX;

          const toggleY = baseY;

          

          try { toggleBtn.clearClick(); } catch (_) {}

          try { toggleBtn.setSize(toggleW, toggleH); } catch (_) {}

          try { toggleBtn.setPosition(toggleX, toggleY); } catch (_) {}

          try { toggleBtn.touchable = true; } catch (_) {}

          try { toggleBtn.visible = true; } catch (_) {}

          try { toggleBtn.alpha = 1; } catch (_) {}

          try { toggleBtn.draggable = false; } catch (_) {}

          

          // 在按钮上覆盖扫荡券图标

          try {

            const loader = new fgui.GLoader();

            loader.name = 'coverIcon';

            loader.url = sweepIcon;

            const iconSize = Math.min(toggleW, toggleH) * 1.5; // 恢复原来的1.5倍大小

            loader.setSize(iconSize, iconSize);

            const centerX = (toggleW - iconSize) / 2 + 5; // 往右移5像素

            const centerY = (toggleH - iconSize) / 2 + 10; // 往下移10像素

            loader.setPosition(centerX, centerY);

            try { loader.fill = fgui.LoaderFillType.ScaleFit; } catch (_) {}

            try { loader.shrinkOnly = true; } catch (_) {}

            toggleBtn.addChild(loader);

          } catch (_) {}

          

          // 功能按钮配置 - 所有按钮使用相同宽度

          const btnConfigs = [

            { label: '10', onClick: () => useSweepTickets(10) },

            { label: '20', onClick: () => useSweepTickets(20) },

            { label: '50', onClick: () => useSweepTickets(50) },

            { label: '100', onClick: () => useSweepTickets(100) },

            { label: '全', onClick: () => useSweepTickets(0) },

            { label: '停', isRedText: true, onClick: () => {

              if (__isRunning) { 

                __stopRequested = true; 

                tip('⛔ 正在停止中...');

              } else {

                tip('⚠️ 当前没有运行中的任务');

              }

            }}

          ];

          

          // 创建功能按钮（默认隐藏，横向排列在折叠按钮右边）

          let curX = toggleX + toggleW + 15; // 增加折叠按钮和第一个按钮的间距，让10按钮往右移

          for (let i = 0; i < btnConfigs.length; i++) {

            const cfg = btnConfigs[i];

            let newBtn = null;

            

            if (srcBtn) {

              try {

                if (typeof srcBtn.clone === 'function') {

                  newBtn = srcBtn.clone();

                } else if (srcBtn.resourceURL && fgui?.UIPackage?.createObjectFromURL) {

                  newBtn = fgui.UIPackage.createObjectFromURL(srcBtn.resourceURL);

                }

              } catch (_) {}

            }

            

            if (!newBtn) {

              newBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

            }

            

            if (!newBtn) continue;



            // 特殊处理：20按钮（索引1）往左移30像素，50按钮（索引2）往左移60像素，100按钮（索引3）往左移90像素，全按钮（索引4）往左移120像素，停按钮（索引5）往左移150像素

            let adjustedX = curX;

            if (i === 1) adjustedX = curX - 30;

            if (i === 2) adjustedX = curX - 60;

            if (i === 3) adjustedX = curX - 90;

            if (i === 4) adjustedX = curX - 120;

            if (i === 5) adjustedX = curX - 150;



            try { newBtn.clearClick(); } catch (_) {}

            try { newBtn.title = ''; } catch (_) {}

            try { newBtn.setSize(btnW, h); } catch (_) {} // 所有按钮使用相同宽度

            try { newBtn.setPosition(adjustedX, toggleY); } catch (_) {} // 使用调整后的X坐标

            try { newBtn.touchable = true; } catch (_) {}

            try { newBtn.visible = false; } catch (_) {} // 默认隐藏

            try { newBtn.alpha = 1; } catch (_) {}

            try { newBtn.draggable = false; } catch (_) {}

            

            log('扫荡按钮[' + cfg.label + '] 位置: x=' + adjustedX + ', y=' + toggleY + ', width=' + btnW);

            

            // 隐藏按钮内部的图标和文字

            try {

              const titleNames = ['title', 'm_title', 'Title'];

              for (const name of titleNames) {

                const titleChild = newBtn.getChild(name);

                if (titleChild) {

                  titleChild.visible = false;

                }

              }

              

              const iconNames = ['icon', 'm_icon', 'Icon', 'img', 'm_img'];

              for (const name of iconNames) {

                const iconChild = newBtn.getChild(name);

                if (iconChild) {

                  iconChild.visible = false;

                }

              }

              

              if (newBtn.numChildren) {

                for (let j = 0; j < newBtn.numChildren; j++) {

                  const child = newBtn.getChildAt(j);

                  if (child && child.constructor) {

                    const typeName = child.constructor.name;

                    if (typeName === 'GLoader' || typeName === 'GTextField') {

                      child.visible = false;

                    }

                  }

                }

              }

              

              if ('icon' in newBtn) {

                newBtn.icon = '';

              }

            } catch (_) {}

            

            // 添加文字标签

            try {

              const textField = new fgui.GTextField();

              textField.name = 'customLabelText';

              textField.text = cfg.label;

              textField.setSize(cfg.width, h);

              // 特殊处理：100按钮（索引3）的文字往左移

              const textX = (i === 3) ? 10 : 20;

              textField.setPosition(textX, 10);

              textField.align = fgui.AlignType.Center;

              textField.verticalAlign = fgui.VertAlignType.Middle;

              textField.fontSize = 24;

              textField.bold = true;

              textField.color = cfg.isRedText ? 0xff0000 : 0x000000;

              textField.visible = true;

              newBtn.addChild(textField);

              try { newBtn.setChildIndex(textField, newBtn.numChildren - 1); } catch (_) {}

            } catch (_) {}

            

            try { newBtn.onClick(cfg.onClick, this); } catch (_) {}

            try { parent.addChild(newBtn); } catch (_) {}

            try { parent.setChildIndex(newBtn, parent.numChildren - 1); } catch (_) {}

            btns.push(newBtn);

            curX += btnW + gapX; // 横向递增X坐标，使用固定宽度

          }

          

          // 设置折叠/展开逻辑（默认收起）

          let isExpanded = false;

          try {

            toggleBtn.onClick(() => {

              isExpanded = !isExpanded;

              btns.forEach(btn => {

                try { btn.visible = isExpanded; } catch (_) {}

              });

            }, this);

          } catch (_) {}

          

          try { parent.addChild(toggleBtn); } catch (_) {}

          try { parent.setChildIndex(toggleBtn, parent.numChildren - 1); } catch (_) {}

          

          this['_sweep_toggle_btn'] = toggleBtn;

          this['_sweep_btns'] = btns;

          

          return true;

        };



        if (!buildButtons()) {

          if (!this['_sweep_retry']) {

            this['_sweep_retry_count'] = 0;

            this['_sweep_retry'] = setInterval(() => {

              this['_sweep_retry_count'] = (this['_sweep_retry_count'] || 0) + 1;

              if (buildButtons() || this['_sweep_retry_count'] >= 20) {

                try { clearInterval(this['_sweep_retry']); } catch (_) {}

                this['_sweep_retry'] = null;

              }

            }, 250);

          }

        }

      } catch (_) {}

    };



    const origHide = PanelClass.prototype.onHide;

    PanelClass.prototype.onHide = function () {

      if (this['_sweep_toggle_btn']) {

        try { this['_sweep_toggle_btn'].dispose(); } catch (_) {}

        this['_sweep_toggle_btn'] = null;

      }

      if (this['_sweep_btns']) {

        this['_sweep_btns'].forEach(b => { try { b.dispose(); } catch (_) {} });

        this['_sweep_btns'] = null;

      }

      if (this['_sweep_retry']) {

        try { clearInterval(this['_sweep_retry']); } catch (_) {}

        this['_sweep_retry'] = null;

      }

      if (this['_sweep_retry_count']) {

        this['_sweep_retry_count'] = null;

      }

      origHide.apply(this, arguments);

    };

    log('✅ 注入 GeniePanel');

  };



  // ==================== HeroRecruitDialog 注入 ====================

  const patchRecruitDialog = (DialogClass) => {

    const origShow = DialogClass.prototype.onShown;

    DialogClass.prototype.onShown = function () {

      origShow.apply(this, arguments);

      

      // 添加可折叠的招募轮数按钮

      try {

        if (this['_recruit_btns'] && this['_recruit_btns'].length === 0) this['_recruit_btns'] = null;

        if (this['_recruit_btns'] && this['_recruit_btns'].length > 0) return;

        const ui = this.ui;

        const parent = ui;

        const fgui = unsafeWindow.fgui;



        const buildButtons = () => {

          if (!parent) return false;

          

          // 查找问号按钮

          const helpBtn = ui?.m_quesHelp;

          if (!helpBtn) return false;

          

          // 尝试从招募界面找到可以克隆的按钮

          let srcBtn = null;

          try {

            // 优先尝试按钮背景，再尝试招募按钮

            const btnNames = ['m_btnBG2', 'm_btnOne', 'm_btnTen'];

            for (const name of btnNames) {

              if (ui[name]) {

                srcBtn = ui[name];

                break;

              }

            }

          } catch (_) {}

          

          const h = 32; // 固定按钮高度为32，比原来小一些

          const gapY = 38; // 按钮间距增加到38

          const btnW = 90; // 按钮宽度从110缩小到90

          const recruitIcon = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/09/093ec74c-c331-4d4f-92a8-d4071d14c5f0.ca272.png'; // 招募令图标



          const btns = [];

          

          // 创建折叠/展开按钮（放在问号按钮下面）

          let toggleBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (!toggleBtn) return false;

          

          const toggleW = 50; // 折叠按钮宽度缩小到50

          const toggleH = h;

          const toggleX = helpBtn.x;

          const toggleY = helpBtn.y + helpBtn.height + 10;

          

          try { toggleBtn.clearClick(); } catch (_) {}

          try { toggleBtn.setSize(toggleW, toggleH); } catch (_) {}

          try { toggleBtn.setPosition(toggleX, toggleY); } catch (_) {}

          try { toggleBtn.touchable = true; } catch (_) {}

          try { toggleBtn.visible = true; } catch (_) {}

          try { toggleBtn.alpha = 1; } catch (_) {}

          try { toggleBtn.draggable = false; } catch (_) {}

          

          // 在按钮上覆盖招募图标

          try {

            const loader = new fgui.GLoader();

            loader.name = 'coverIcon';

            loader.url = recruitIcon;

            const iconSize = Math.min(toggleW, toggleH) * 1.5; // 图标大小设置为按钮的150%

            loader.setSize(iconSize, iconSize);

            const centerX = (toggleW - iconSize) / 2 + 8; // 往右移动8像素

            const centerY = (toggleH - iconSize) / 2 + 11; // 往下移动11像素

            loader.setPosition(centerX, centerY);

            try { loader.fill = fgui.LoaderFillType.ScaleFit; } catch (_) {}

            try { loader.shrinkOnly = true; } catch (_) {}

            toggleBtn.addChild(loader);

          } catch (_) {}

          

          // 功能按钮配置

          const btnConfigs = [

            { text: '一轮', width: btnW, label: '一', onClick: () => runRecruitRounds(1) },

            { text: '两轮', width: btnW, label: '二', onClick: () => runRecruitRounds(2) },

            { text: '三轮', width: btnW, label: '三', onClick: () => runRecruitRounds(3) },

            { text: '四轮', width: btnW, label: '四', onClick: () => runRecruitRounds(4) },

            { text: '停止', width: btnW, label: '停', isRedText: true, onClick: () => {

              if (__isRunning) { 

                __stopRequested = true; 

                tip('⛔ 正在停止中...');

              } else {

                tip('⚠️ 当前没有运行中的任务');

              }

            }}

          ];

          

          // 创建功能按钮（默认显示，在折叠按钮下方展开）

          let curY = toggleY + toggleH + gapY;

          for (let i = 0; i < btnConfigs.length; i++) {

            const cfg = btnConfigs[i];

            let newBtn = null;

            

            // 如果找到了可克隆的按钮，就克隆它

            if (srcBtn) {

              try {

                if (typeof srcBtn.clone === 'function') {

                  newBtn = srcBtn.clone();

                } else if (srcBtn.resourceURL && fgui?.UIPackage?.createObjectFromURL) {

                  newBtn = fgui.UIPackage.createObjectFromURL(srcBtn.resourceURL);

                }

              } catch (_) {}

            }

            

            // 如果克隆失败，使用 BtnInfo2

            if (!newBtn) {

              newBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

            }

            

            if (!newBtn) continue;



            try { newBtn.clearClick(); } catch (_) {}

            try { newBtn.title = ''; } catch (_) {} // 清空默认标题

            try { newBtn.setSize(cfg.width, h); } catch (_) {}

            try { newBtn.setPosition(toggleX, curY); } catch (_) {}

            try { newBtn.touchable = true; } catch (_) {}

            try { newBtn.visible = false; } catch (_) {} // 默认隐藏（收起状态）

            try { newBtn.alpha = 1; } catch (_) {}

            try { newBtn.draggable = false; } catch (_) {}

            

            // 尝试多种方式隐藏按钮内部的图标和文字

            try {

              // 隐藏按钮默认的title文本

              const titleNames = ['title', 'm_title', 'Title'];

              for (const name of titleNames) {

                const titleChild = newBtn.getChild(name);

                if (titleChild) {

                  titleChild.visible = false;

                }

              }

              

              // 方法1: 通过名称查找并隐藏图标

              const iconNames = ['icon', 'm_icon', 'Icon', 'img', 'm_img'];

              for (const name of iconNames) {

                const iconChild = newBtn.getChild(name);

                if (iconChild) {

                  iconChild.visible = false;

                }

              }

              

              // 方法2: 遍历所有子元素，隐藏 GLoader 和 GTextField 类型的元素

              if (newBtn.numChildren) {

                for (let j = 0; j < newBtn.numChildren; j++) {

                  const child = newBtn.getChildAt(j);

                  if (child && child.constructor) {

                    const typeName = child.constructor.name;

                    if (typeName === 'GLoader' || typeName === 'GTextField') {

                      child.visible = false;

                    }

                  }

                }

              }

              

              // 方法3: 设置按钮的 icon 属性为空

              if ('icon' in newBtn) {

                newBtn.icon = '';

              }

            } catch (_) {}

            

            // 在按钮上添加文字标签

            try {

              const textField = new fgui.GTextField();

              textField.name = 'customLabelText';

              textField.text = cfg.label;

              textField.setSize(cfg.width, h);

              textField.setPosition(20, 10); // 往右移动20像素，往下移动10像素

              textField.align = fgui.AlignType.Center;

              textField.verticalAlign = fgui.VertAlignType.Middle;

              textField.fontSize = 24;

              textField.bold = true;

              textField.color = cfg.isRedText ? 0xff0000 : 0x000000;

              textField.visible = true; // 确保可见

              newBtn.addChild(textField);

              // 将文字标签置于最上层

              try { newBtn.setChildIndex(textField, newBtn.numChildren - 1); } catch (_) {}

            } catch (_) {}

            

            try { newBtn.onClick(cfg.onClick, this); } catch (_) {}

            try { parent.addChild(newBtn); } catch (_) {}

            try { parent.setChildIndex(newBtn, parent.numChildren - 1); } catch (_) {}

            btns.push(newBtn);

            curY += h + gapY;

          }

          

          // 设置折叠/展开逻辑（默认展开）

          let isExpanded = true;

          try {

            toggleBtn.onClick(() => {

              isExpanded = !isExpanded;

              btns.forEach(btn => {

                try { btn.visible = isExpanded; } catch (_) {}

              });

            }, this);

          } catch (_) {}

          

          try { parent.addChild(toggleBtn); } catch (_) {}

          try { parent.setChildIndex(toggleBtn, parent.numChildren - 1); } catch (_) {}

          

          this['_recruit_toggle_btn'] = toggleBtn;

          this['_recruit_btns'] = btns;

          

          return true;

        };



        if (!buildButtons()) {

          if (!this['_recruit_retry']) {

            this['_recruit_retry_count'] = 0;

            this['_recruit_retry'] = setInterval(() => {

              this['_recruit_retry_count'] = (this['_recruit_retry_count'] || 0) + 1;

              if (buildButtons() || this['_recruit_retry_count'] >= 20) {

                try { clearInterval(this['_recruit_retry']); } catch (_) {}

                this['_recruit_retry'] = null;

              }

            }, 250);

          }

        }

      } catch (_) {}

    };



    const origHide = DialogClass.prototype.onHide;

    DialogClass.prototype.onHide = function () {

      if (this['_recruit_toggle_btn']) {

        try { this['_recruit_toggle_btn'].dispose(); } catch (_) {}

        this['_recruit_toggle_btn'] = null;

      }

      if (this['_recruit_btns']) {

        this['_recruit_btns'].forEach(b => { try { b.dispose(); } catch (_) {} });

        this['_recruit_btns'] = null;

      }

      if (this['_recruit_retry']) {

        try { clearInterval(this['_recruit_retry']); } catch (_) {}

        this['_recruit_retry'] = null;

      }

      if (this['_recruit_retry_count']) {

        this['_recruit_retry_count'] = null;

      }

      origHide.apply(this, arguments);

    };

    log('✅ 注入 HeroRecruitDialog');

  };



  // ==================== 推图界面注入（尝试多个可能的Panel） ====================

  const patchStagePanel = (PanelClass, panelName) => {

    const origShow = PanelClass.prototype.onShow;

    PanelClass.prototype.onShow = function () {

      origShow.apply(this, arguments);

      

      // 添加领取邮件按钮

      try {

        if (this['_stage_mail_btn']) return; // 已经创建过了

        

        const ui = this.ui;

        const parent = ui;

        const fgui = unsafeWindow.fgui;

        

        const buildMailButton = () => {

          if (!parent || !fgui) return false;

          

          // 创建领取邮件按钮

          const mailBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (!mailBtn) return false;

          

          const btnW = 90;

          const btnH = 32;

          // 按钮位置：屏幕中间偏左上方，更显眼

          const btnX = 100;

          const btnY = 100;

          

          log('尝试创建邮件按钮，位置: x=' + btnX + ', y=' + btnY);

          

          try { mailBtn.clearClick(); } catch (_) {}

          try { mailBtn.setSize(btnW, btnH); } catch (_) {}

          try { mailBtn.setPosition(btnX, btnY); } catch (_) {}

          try { mailBtn.touchable = true; } catch (_) {}

          try { mailBtn.visible = true; } catch (_) {}

          try { mailBtn.alpha = 1; } catch (_) {}

          try { mailBtn.draggable = false; } catch (_) {}

          

          // 隐藏按钮内部的默认图标和文字

          try {

            const titleNames = ['title', 'm_title', 'Title'];

            for (const name of titleNames) {

              const titleChild = mailBtn.getChild(name);

              if (titleChild) titleChild.visible = false;

            }

            

            const iconNames = ['icon', 'm_icon', 'Icon', 'img', 'm_img'];

            for (const name of iconNames) {

              const iconChild = mailBtn.getChild(name);

              if (iconChild) iconChild.visible = false;

            }

            

            if (mailBtn.numChildren) {

              for (let j = 0; j < mailBtn.numChildren; j++) {

                const child = mailBtn.getChildAt(j);

                if (child && child.constructor) {

                  const typeName = child.constructor.name;

                  if (typeName === 'GLoader' || typeName === 'GTextField') {

                    child.visible = false;

                  }

                }

              }

            }

            

            if ('icon' in mailBtn) mailBtn.icon = '';

          } catch (_) {}

          

          // 添加文字标签"邮件"

          try {

            const textField = new fgui.GTextField();

            textField.name = 'mailLabelText';

            textField.text = '邮件';

            textField.setSize(btnW, btnH);

            textField.setPosition(0, 0);

            textField.align = fgui.AlignType.Center;

            textField.verticalAlign = fgui.VertAlignType.Middle;

            textField.fontSize = 24;

            textField.bold = true;

            textField.color = 0x000000;

            textField.visible = true;

            mailBtn.addChild(textField);

            try { mailBtn.setChildIndex(textField, mailBtn.numChildren - 1); } catch (_) {}

          } catch (_) {}

          

          // 设置点击事件：领取邮件

          try {

            mailBtn.onClick(() => {

              claimAllMail();

              tip('📧 已领取所有邮件');

            }, this);

          } catch (_) {}

          

          try { parent.addChild(mailBtn); } catch (_) {}

          try { parent.setChildIndex(mailBtn, parent.numChildren - 1); } catch (_) {}

          

          this['_stage_mail_btn'] = mailBtn;

          log('✅ 在' + panelName + '创建邮件按钮成功');

          tip('✅ 邮件按钮已创建在' + panelName);

          return true;

        };

        

        buildMailButton();

      } catch (_) {}

    };



    const origHide = PanelClass.prototype.onHide;

    PanelClass.prototype.onHide = function () {

      if (this['_stage_mail_btn']) {

        try { this['_stage_mail_btn'].dispose(); } catch (_) {}

        this['_stage_mail_btn'] = null;

      }

      origHide.apply(this, arguments);

    };

    log('✅ 注入 ' + panelName);

  };



  // ==================== MainPanel 注入 ====================

  const patchMainPanel = (PanelClass) => {

    const origShow = PanelClass.prototype.onShow;

    PanelClass.prototype.onShow = function () {

      origShow.apply(this, arguments);

      

      // 添加领取邮件按钮

      try {

        if (this['_main_mail_btn']) return; // 已经创建过了

        

        const ui = this.ui;

        const parent = ui;

        const fgui = unsafeWindow.fgui;

        

        const buildMailButton = () => {

          if (!parent || !fgui) return false;

          

          // 创建领取邮件按钮

          const mailBtn = fgui?.UIPackage?.createObject('ui_common', 'BtnInfo2')?.asButton;

          if (!mailBtn) return false;

          

          const btnW = 120;

          const btnH = 45;

          // 按钮位置：屏幕左侧

          const btnX = 20;

          const btnY = 100;

          

          try { mailBtn.clearClick(); } catch (_) {}

          try { mailBtn.setSize(btnW, btnH); } catch (_) {}

          try { mailBtn.setPosition(btnX, btnY); } catch (_) {}

          try { mailBtn.touchable = true; } catch (_) {}

          try { mailBtn.visible = true; } catch (_) {}

          try { mailBtn.alpha = 1; } catch (_) {}

          try { mailBtn.draggable = false; } catch (_) {}

          

          // 隐藏按钮内部的默认图标和文字

          try {

            const titleNames = ['title', 'm_title', 'Title'];

            for (const name of titleNames) {

              const titleChild = mailBtn.getChild(name);

              if (titleChild) titleChild.visible = false;

            }

            

            const iconNames = ['icon', 'm_icon', 'Icon', 'img', 'm_img'];

            for (const name of iconNames) {

              const iconChild = mailBtn.getChild(name);

              if (iconChild) iconChild.visible = false;

            }

            

            if (mailBtn.numChildren) {

              for (let j = 0; j < mailBtn.numChildren; j++) {

                const child = mailBtn.getChildAt(j);

                if (child && child.constructor) {

                  const typeName = child.constructor.name;

                  if (typeName === 'GLoader' || typeName === 'GTextField') {

                    child.visible = false;

                  }

                }

              }

            }

            

            if ('icon' in mailBtn) mailBtn.icon = '';

          } catch (_) {}

          

          // 添加文字标签"邮件"

          try {

            const textField = new fgui.GTextField();

            textField.name = 'mailLabelText';

            textField.text = '邮件';

            textField.setSize(btnW, btnH);

            textField.setPosition(7, 9);

            textField.align = fgui.AlignType.Center;

            textField.verticalAlign = fgui.VertAlignType.Middle;

            textField.fontSize = 24;

            textField.bold = true;

            textField.color = 0x000000;

            textField.visible = true;

            mailBtn.addChild(textField);

            try { mailBtn.setChildIndex(textField, mailBtn.numChildren - 1); } catch (_) {}

          } catch (_) {}

          

          // 设置点击事件：领取邮件

          try {

            mailBtn.onClick(() => {

              claimAllMail();

              tip('📧 已领取所有邮件');

            }, this);

          } catch (_) {}

          

          try { parent.addChild(mailBtn); } catch (_) {}

          try { parent.setChildIndex(mailBtn, parent.numChildren - 1); } catch (_) {}

          

          this['_main_mail_btn'] = mailBtn;

          return true;

        };

        

        if (!buildMailButton()) {

          // 如果创建失败，延迟重试

          if (!this['_main_mail_retry']) {

            this['_main_mail_retry_count'] = 0;

            this['_main_mail_retry'] = setInterval(() => {

              this['_main_mail_retry_count'] = (this['_main_mail_retry_count'] || 0) + 1;

              if (buildMailButton() || this['_main_mail_retry_count'] >= 20) {

                try { clearInterval(this['_main_mail_retry']); } catch (_) {}

                this['_main_mail_retry'] = null;

              }

            }, 250);

          }

        }

      } catch (_) {}

    };



    const origHide = PanelClass.prototype.onHide;

    PanelClass.prototype.onHide = function () {

      if (this['_main_mail_btn']) {

        try { this['_main_mail_btn'].dispose(); } catch (_) {}

        this['_main_mail_btn'] = null;

      }

      if (this['_main_mail_retry']) {

        try { clearInterval(this['_main_mail_retry']); } catch (_) {}

        this['_main_mail_retry'] = null;

      }

      if (this['_main_mail_retry_count']) {

        this['_main_mail_retry_count'] = null;

      }

      origHide.apply(this, arguments);

    };

    log('✅ 注入 MainPanel');

  };



  // ==================== 黑市周商品购买逻辑 ====================

  

  // 物品ID到名称的映射

  const ITEM_NAMES = {

    // 宝箱类

    2001: '木质宝箱', 2002: '青铜宝箱', 2003: '黄金宝箱', 2004: '铂金宝箱', 2005: '钻石宝箱',

    // 货币类

    1001: '招募令', 1002: '白玉', 1003: '进阶石', 1004: '灵贝', 1005: '银币', 1006: '精铁',

    1007: '钻石', 1008: '体力', 1009: '经验', 1010: '荣誉', 1011: '功勋', 1012: '贡献',

    1013: '积分', 1014: '代币', 1015: '券', 1016: '梦魇晶石', 1017: '精华', 1018: '结晶',

    1019: '宝石', 1020: '魂石', 1021: '扫荡券', 1022: '白玉', 1026: '扳手', 1033: '灵贝',

    // 特殊物品

    2000: '梦魇晶石', 3000: '扳手',

    // 鱼竿类

    3007: '黄金鱼竿', 3008: '普通鱼竿',

    // 碎片类

    4001: '装备碎片', 4002: '武器碎片', 4003: '随机红将碎片',

    // 其他

    6001: '金锤', 6002: '银锤', 6003: '铜锤',

    3001: '经验药水', 3002: '升级石', 3003: '强化石',

    5001: '技能书', 5002: '天赋书'

  };

  

  const getItemName = (itemId) => ITEM_NAMES[itemId] || '物品' + itemId;

  

  // 黑市周商品购买函数

  const buyBlackmarketGoods = async () => {

    const logEl = document.getElementById('bx-log');

    const addLog = (text) => {

      if (logEl) {

        const line = document.createElement('div');

        line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + text;

        logEl.appendChild(line);

        logEl.scrollTop = logEl.scrollHeight;

      }

      log('[黑市购买] ' + text);

    };

    

    try {

      addLog('🛒 开始执行黑市周商品购买...');

      

      // 创建sendMsg函数（使用WebSocket）

      const ws = unsafeWindow.ws || unsafeWindow.h5websocket?.ws;

      

      if (!ws?.sendAsync) {

        addLog('❌ WebSocket未连接，无法购买');

        return;

      }

      

      const sendMsg = async (cmd, params = {}) => {

        const msg = unsafeWindow.g_utils?.bon?.encode

          ? { ack: 0, body: unsafeWindow.g_utils.bon.encode(params), cmd, seq: Date.now(), time: Date.now() }

          : { ack: 0, cmd, params, seq: Date.now(), time: Date.now() };

        const r = await ws.sendAsync(msg);

        if (r?._rawData) return r._rawData;

        if (r?.getData) return r.getData();

        return r;

      };

      

      // 获取所有选中的商品

      const checkboxes = document.querySelectorAll('#bx-goods-list input[type="checkbox"]:checked');

      

      if (checkboxes.length === 0) {

        addLog('⚠️ 请至少选择一个商品');

        return;

      }

      

      let successCount = 0;

      let failCount = 0;

      

      // 遍历所有选中的商品进行购买

      for (const checkbox of checkboxes) {

        const goodsIndex = Number(checkbox.getAttribute('data-goods-index'));

        const goodsName = checkbox.nextElementSibling?.textContent || '商品' + goodsIndex;

        

        // 检查是否是养成补给包（goodsIndex=9），如果是则获取购买次数

        let buyTimes = 1;

        if (goodsIndex === 9) {

          const buyCountSelect = document.getElementById('yangcheng-buy-count');

          if (buyCountSelect) {

            buyTimes = Number(buyCountSelect.value) || 1;

          }

        }

        

        // 循环购买指定次数

        for (let i = 0; i < buyTimes; i++) {

          try {

            if (buyTimes > 1) {

              addLog('🛍️ 正在购买：' + goodsName + '（第' + (i + 1) + '/' + buyTimes + '次）...');

            } else {

              addLog('🛍️ 正在购买：' + goodsName + '...');

            }

            

            // 使用WebSocket发送购买指令

            const result = await sendMsg('activity_buystoregoods', {

              activityId: 9,

              goodsIndex: goodsIndex,

              buyNum: 1

            });

          

          // 如果没有响应，直接抛出错误

          if (!result) {

            throw new Error('服务器无响应');

          }

            

            await sleep(300);

            

            // 根据返回的物品ID和数量识别实际购买的商品

          let actualGoodsName = goodsName;

          try {

            if (result?.reward && Array.isArray(result.reward)) {

              const items = result.reward.map(item => {

                if (item.type === 2 && item.itemId === 0) {

                  return { id: 'diamond', qty: item.value || 0 };

                } else if (item.type === 3 && item.itemId) {

                  return { id: item.itemId, qty: item.value || item.num || item.count || 0 };

                }

                return null;

              }).filter(x => x);

              

              // 根据物品组合识别商品

              const itemStr = items.map(x => x.id + ':' + x.qty).sort().join(',');

              

              if (itemStr === 'diamond:500') {

                actualGoodsName = '黑市福利领取';

              } else if (itemStr === '1001:5,1006:1000') {

                actualGoodsName = '黑市见面礼';

              } else if (itemStr === '1001:10,1003:2000') {

                actualGoodsName = '黑市惊喜礼';

              } else if (itemStr === '1003:6000') {

                actualGoodsName = '初级黑市包';

              } else if (itemStr === '2001:10,2002:10,2003:10,2004:10') {

                actualGoodsName = '中级黑市包';

              } else if (itemStr === '1001:40,4003:50') {

                actualGoodsName = '高级黑市包';

              } else if (itemStr === '3007:30,3008:30') {

                actualGoodsName = '顶级鱼竿包';

              } else if (itemStr === '1022:2000') {

                actualGoodsName = '白玉黑市包';

              } else if (itemStr === '1004:10' || itemStr === '1033:10' || itemStr === '1033:16') {

                actualGoodsName = '灵贝礼包';

              } else if (itemStr === '1016:2000,1026:3000') {

                actualGoodsName = '养成补给包';

              }

            }

          } catch (e) {

            log('[黑市购买] 识别商品失败: ' + e.message);

          }

            

            // 解析奖励信息

            let rewardInfo = '';

            try {

              if (result?.reward) {

                const rewards = [];

                

                // 从reward数组中解析物品

                if (Array.isArray(result.reward)) {

                  result.reward.forEach(item => {

                    // type=2且itemId=0表示金砖

                    if (item.type === 2 && item.itemId === 0) {

                      const quantity = item.value || item.num || item.count || 0;

                      rewards.push('金砖×' + quantity);

                    }

                    // type=3表示普通物品

                    else if (item.type === 3 && item.itemId) {

                      const itemName = getItemName(item.itemId);

                      const quantity = item.value || item.num || item.count || 0;

                      rewards.push(itemName + '×' + quantity);

                    }

                  });

                }

                

                // 解析statistics中的金砖消耗

                if (result.statistics && result.statistics['wa:diamond']) {

                  rewards.push('消耗金砖×' + result.statistics['wa:diamond']);

                }

                

                if (rewards.length > 0) {

                  rewardInfo = ' 获得：' + rewards.join('、');

                }

              }

            } catch (e) {

              log('[黑市购买] 解析奖励失败: ' + e.message);

            }

            

            addLog('✅ ' + actualGoodsName + (buyTimes > 1 ? '（第' + (i + 1) + '次）' : '') + ' 购买成功' + rewardInfo);

            successCount++;

            

            // 购买成功后立即领取邮件

            try {

              addLog('📧 领取邮件中...');

              await claimAllMail();

              addLog('✅ 邮件领取完成');

            } catch (mailErr) {

              addLog('⚠️ 邮件领取失败: ' + (mailErr?.message || mailErr));

            }

          } catch (e) {

            const errorMsg = e?.message || e?.msg || e?.error || String(e);

            const errorCode = e?.code || e?._raw?.code;

            

            // 检查是否是已购买的错误

            if (errorCode === 1100010 || errorMsg.includes('购买数量超上限') || 

                errorMsg.includes('已购买') || errorMsg.includes('已买') || 

                errorMsg.includes('purchased') || errorMsg.includes('bought') || 

                errorMsg.includes('已领取') || errorMsg.includes('claimed')) {

              addLog('⚠️ ' + goodsName + (buyTimes > 1 ? '（第' + (i + 1) + '次）' : '') + ' 购买失败：已购买');

            } else {

              addLog('❌ ' + goodsName + (buyTimes > 1 ? '（第' + (i + 1) + '次）' : '') + ' 购买失败: ' + errorMsg);

            }

            failCount++;

          }

        }

      }

      

      addLog('🎉 购买完成！成功：' + successCount + '个，失败：' + failCount + '个');

    } catch (e) {

      addLog('❌ 执行出错：' + (e?.message || e));

    }

  };



  // ==================== 黑市周UI面板 ====================

  const createBlackMarketPanel = () => {

    // 检查是否已经创建

    if (document.getElementById('bx-blackmarket-panel')) {

      return;

    }

    

    const panel = document.createElement('div');

    panel.id = 'bx-blackmarket-panel';

    panel.style.cssText = `

      position: fixed;

      top: 50%;

      left: 50%;

      transform: translate(-50%, -50%);

      width: min(90vw, 600px);

      max-height: 85vh;

      background: linear-gradient(180deg, rgba(40,10,20,0.95), rgba(30,5,15,0.95));

      border: 1px solid rgba(220,38,38,0.4);

      border-radius: 16px;

      box-shadow: 0 12px 40px rgba(220,38,38,0.4), 0 0 24px rgba(220,38,38,0.2);

      z-index: 99999;

      display: none;

      flex-direction: column;

      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;

      overflow: hidden;

      color: #ffe8e0;

    `;

    

    panel.innerHTML = `

      <div style="padding: 16px 20px; border-bottom: 1px solid rgba(220,38,38,0.3); background: linear-gradient(90deg, rgba(244,63,94,0.06), rgba(124,58,237,0.06)); display: flex; justify-content: space-between; align-items: center;">

        <h3 style="margin: 0; color: #a855f7; font-size: 16px; font-weight: 700; letter-spacing: 0.6px; text-shadow: 0 0 8px rgba(251,191,36,0.12), 0 0 20px rgba(244,63,94,0.06);">🏪 黑市周</h3>

        <button id="bx-close-btn" style="background: rgba(255, 255, 255, 0.1); border: none; color: #fff; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 18px; transition: all 0.2s;">×</button>

      </div>

      

      <!-- 标签页导航 -->

      <div style="display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid rgba(220,38,38,0.2);">

        <button class="bx-tab-btn" data-tab="goods" style="flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: linear-gradient(135deg,rgba(220,38,38,0.5),rgba(124,58,237,0.5)); color: #fff; font-size: 12px; cursor: pointer; transition: all 0.2s; font-weight: 600;">

          🛒 商品列表

        </button>

        <button class="bx-tab-btn" data-tab="log" style="flex: 1; padding: 8px 12px; border: none; border-radius: 8px; background: transparent; color: #ffe8e0; font-size: 12px; cursor: pointer; transition: all 0.2s; font-weight: 600;">

          📋 操作日志

        </button>

      </div>

      

      <div style="padding: 16px; overflow-y: auto; flex: 1;">

        <!-- 商品列表标签页 -->

        <div id="bx-tab-goods" class="bx-tab-content" style="display: block;">

          <div style="margin-bottom: 16px;">

            <div style="font-size: 13px; color: #ffe8e0; margin-bottom: 8px; font-weight: 600;">🛒 黑市商品</div>

            <div id="bx-goods-list" style="display: flex; flex-direction: column; gap: 8px;">

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="0" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">黑市福利领取 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(500金砖)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="1" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">黑市见面礼 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(5招募令+1000精铁)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="2" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">黑市惊喜礼 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(10招募令+2000进阶石)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="3" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">初级黑市包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(6000进阶石)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="4" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">中级黑市包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(宝箱礼包)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="5" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">高级黑市包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(40招募令+50红将碎片)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="6" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">顶级鱼竿包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(30黄金鱼竿+30普通鱼竿)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="7" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">白玉黑市包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(2000白玉)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="8" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0;">灵贝礼包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(10灵贝)</span></span>

              </label>

              <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s;">

                <input type="checkbox" data-goods-index="9" class="blackmarket-goods-checkbox" style="width: 16px; height: 16px; flex-shrink: 0; cursor: pointer;">

                <span style="font-size: 12px; color: #ffe8e0; flex: 1;">养成补给包 <span style="color: rgba(255,255,255,0.5); font-size: 11px;">(2000梦魇晶石+3000扳手)</span></span>

                <select id="yangcheng-buy-count" onclick="event.stopPropagation();" style="width: 90px; padding: 4px 8px; font-size: 11px; background: rgba(40,10,20,0.6); color: #fff; border: 1px solid rgba(220,38,38,0.3); border-radius: 6px; flex-shrink: 0; cursor: pointer;">

                  <option value="1">购买1次</option>

                  <option value="2">购买2次</option>

                  <option value="3">购买3次</option>

                  <option value="4">购买4次</option>

                  <option value="5">购买5次</option>

                  <option value="10">购买10次</option>

                </select>

              </label>

            </div>

          </div>

          

          <button id="bx-buy-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg,rgba(220,38,38,0.5),rgba(124,58,237,0.5)); border: 1px solid rgba(220,38,38,0.5); border-radius: 10px; color: #fff; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s;">

            🛒 一键购买选中商品

          </button>

        </div>

        

        <!-- 操作日志标签页 -->

        <div id="bx-tab-log" class="bx-tab-content" style="display: none;">

          <div style="font-size: 13px; color: #ffe8e0; margin-bottom: 8px; font-weight: 600;">📋 操作日志</div>

          <div id="bx-log" style="max-height: 480px; overflow-y: auto; font-size: 11px; line-height: 1.6; color: rgba(255,255,255,0.6); background: rgba(0,0,0,0.18); border: 1px solid rgba(220,38,38,0.18); border-radius: 8px; padding: 8px; font-family: monospace;">

            <div>[系统] 黑市周功能已就绪</div>

          </div>

        </div>

      </div>

    `;

    

    document.body.appendChild(panel);

    

    // 绑定关闭按钮

    document.getElementById('bx-close-btn').onclick = () => {

      panel.style.display = 'none';

    };

    document.getElementById('bx-close-btn').onmouseenter = function() {

      this.style.background = 'rgba(255, 255, 255, 0.2)';

    };

    document.getElementById('bx-close-btn').onmouseleave = function() {

      this.style.background = 'rgba(255, 255, 255, 0.1)';

    };

    

    // 绑定标签页切换

    const tabBtns = panel.querySelectorAll('.bx-tab-btn');

    const tabContents = panel.querySelectorAll('.bx-tab-content');

    

    tabBtns.forEach(btn => {

      btn.onclick = () => {

        const targetTab = btn.getAttribute('data-tab');

        

        // 更新按钮样式

        tabBtns.forEach(b => {

          if (b === btn) {

            b.style.background = 'linear-gradient(135deg,rgba(220,38,38,0.5),rgba(124,58,237,0.5))';

            b.style.color = '#fff';

          } else {

            b.style.background = 'transparent';

            b.style.color = '#ffe8e0';

          }

        });

        

        // 切换内容显示

        tabContents.forEach(content => {

          if (content.id === 'bx-tab-' + targetTab) {

            content.style.display = 'block';

          } else {

            content.style.display = 'none';

          }

        });

      };

      

      // 添加hover效果

      btn.onmouseenter = function() {

        if (this.style.background === 'transparent') {

          this.style.background = 'rgba(120,40,60,0.5)';

        }

      };

      btn.onmouseleave = function() {

        const targetTab = this.getAttribute('data-tab');

        const isActive = (targetTab === 'goods' && document.getElementById('bx-tab-goods').style.display === 'block') ||

                        (targetTab === 'log' && document.getElementById('bx-tab-log').style.display === 'block');

        if (!isActive) {

          this.style.background = 'transparent';

        }

      };

    });

    

    // 绑定购买按钮

    const buyBtn = document.getElementById('bx-buy-btn');

    buyBtn.onclick = async () => {

      // 切换到日志标签页

      const logTabBtn = panel.querySelector('.bx-tab-btn[data-tab="log"]');

      if (logTabBtn) {

        logTabBtn.click();

      }

      

      // 执行购买

      await buyBlackmarketGoods();

    };

    buyBtn.onmouseenter = function() {

      this.style.background = 'linear-gradient(135deg,rgba(220,38,38,0.7),rgba(124,58,237,0.7))';

      this.style.transform = 'translateY(-2px)';

      this.style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)';

    };

    buyBtn.onmouseleave = function() {

      this.style.background = 'linear-gradient(135deg,rgba(220,38,38,0.5),rgba(124,58,237,0.5))';

      this.style.transform = 'translateY(0)';

      this.style.boxShadow = 'none';

    };

    

    // 绑定所有勾选框的change事件，自动保存状态

    panel.querySelectorAll('.blackmarket-goods-checkbox').forEach(cb => {

      cb.addEventListener('change', () => {

        saveBlackmarketCheckboxes();

      });

    });

    

    // 为所有商品列表项添加hover效果

    panel.querySelectorAll('#bx-goods-list label').forEach(label => {

      label.addEventListener('mouseenter', function() {

        this.style.background = 'rgba(0,0,0,0.35)';

      });

      label.addEventListener('mouseleave', function() {

        this.style.background = 'rgba(0,0,0,0.2)';

      });

    });

    

    // 延迟恢复勾选状态（等待window.ROLE加载）

    const tryRestoreCheckboxes = () => {

      const roleId = getRoleId();

      if (roleId === 'default') {

        // 如果还是default，说明window.ROLE还没加载，继续等待

        setTimeout(tryRestoreCheckboxes, 500);

      } else {

        // roleId获取成功，恢复勾选状态

        restoreBlackmarketCheckboxes();

      }

    };

    setTimeout(tryRestoreCheckboxes, 500);

    

    log('黑市周UI面板已创建');

  };

  

  // 显示黑市周面板

  const showBlackMarketPanel = () => {

    createBlackMarketPanel();

    const panel = document.getElementById('bx-blackmarket-panel');

    if (panel) {

      panel.style.display = 'flex';

      tip('✅ 已打开黑市周面板');

    }

  };

  const patchActivityTimeContainer = (PanelClass) => {

    try {

      log('开始注入 ActivityTimeContainerDialog');

      

      const origShow = PanelClass.prototype.onShow;

      if (origShow) {

        PanelClass.prototype.onShow = function () {

          try {

            origShow.apply(this, arguments);

            this._tryAddMarketButton();

          } catch (e) {

            log('onShow 执行失败: ' + e.message);

          }

        };

        log('✅ 已注入 onShow');

      } else {

        log('⚠️ 没有 onShow 方法');

      }

      

      // 添加按钮创建方法

      PanelClass.prototype._tryAddMarketButton = function() {

        try {

          if (this['_market_ui_btn']) {

            return; // 已经创建过了

          }

          

          const ui = this.ui;

          const parent = ui;

          const fgui = unsafeWindow.fgui;

          

          if (!parent || !fgui) {

            log('parent 或 fgui 不可用');

            return;

          }

          

          // 立即创建按钮 - 使用指定的图标

          try {

            // 创建一个简单的按钮

            const uiBtn = new fgui.GButton();

            uiBtn.name = 'blackMarketBtn';

            

            const btnW = 120;

            const btnH = 150; // 调整高度

            // 按钮位置

            const btnX = 500;

            const btnY = 115;

            

            uiBtn.setSize(btnW, btnH);

            uiBtn.setPosition(btnX, btnY);

            uiBtn.touchable = true;

            uiBtn.visible = true;

            

            // 添加背景

            try {

              const bg = new fgui.GGraph();

              bg.name = 'bg';

              bg.drawRect(btnW, btnH, 2, 0xFF0000, 0xFFFFFF); // 红色边框，白色背景

              bg.alpha = 0.9;

              uiBtn.addChild(bg);

              log('✅ 已添加按钮背景');

            } catch (e) {

              log('❌ 添加背景失败: ' + e.message);

            }

            

            // 添加江湖黑市图标 - 多种方式尝试

            try {

              // 正确的图标URL

              const iconUrl = 'https://xxz-xyzw-res.hortorgames.com/remote/icons/native/2f/2fb2fb45-8723-4e6e-ac9e-fe215ff7175d.f5b58.png';

              

              const loader = new fgui.GLoader();

              loader.name = 'icon';

              loader.url = iconUrl;

              // 图标填满整个按钮

              loader.setSize(btnW, btnH);

              loader.setPosition(0, 0);

              loader.fill = fgui.LoaderFillType.ScaleFree;

              uiBtn.addChild(loader);

              

              log('✅ 已添加江湖黑市图标: ' + iconUrl);

            } catch (e) {

              log('❌ 添加图标失败: ' + e.message);

              

              // 备用：添加文字

              try {

                const textField = new fgui.GTextField();

                textField.text = '江湖\n黑市';

                textField.setSize(btnW, btnH);

                textField.align = fgui.AlignType.Center;

                textField.verticalAlign = fgui.VertAlignType.Middle;

                textField.fontSize = 28;

                textField.bold = true;

                textField.color = 0xFF0000;

                uiBtn.addChild(textField);

              } catch (_) {}

            }

            

            // 添加"黑市助手"文字标签

            try {

              const textField = new fgui.GTextField();

              textField.name = 'labelText';

              textField.text = '黑市助手';

              textField.setSize(btnW, 50);

              textField.setPosition(10, btnH - 15); // 往下移、往右移

              textField.align = fgui.AlignType.Center;

              textField.verticalAlign = fgui.VertAlignType.Middle;

              textField.fontSize = 24; // 继续放大字体

              textField.bold = true;

              // 尝试多种方式设置黑色

              try {

                textField.color = cc.Color.BLACK || cc.color(0, 0, 0) || 0x000000;

              } catch (_) {

                textField.color = 0x000000;

              }

              // 添加描边效果，确保文字可见

              try {

                textField.stroke = 1;

                textField.strokeColor = 0x000000;

              } catch (_) {}

              uiBtn.addChild(textField);

              log('✅ 已添加"黑市助手"文字');

            } catch (e) {

              log('❌ 添加文字失败: ' + e.message);

            }

            

            log('✅ 江湖黑市按钮已创建');

            

            // 设置点击事件

            try {

              uiBtn.onClick(() => {

                showBlackMarketPanel();

              }, this);

            } catch (e) {

              log('设置点击事件失败: ' + e.message);

            }

            

            try { parent.addChild(uiBtn); } catch (e) { log('addChild 失败: ' + e.message); }

            try { parent.setChildIndex(uiBtn, parent.numChildren - 1); } catch (_) {}

            

            this['_market_ui_btn'] = uiBtn;

            log('黑市按钮已添加到 ActivityTimeContainerDialog');

          } catch (e) {

            log('创建按钮失败: ' + e.message);

          }

        } catch (e) {

          log('_tryAddMarketButton 异常: ' + e.message);

        }

      };



      const origHide = PanelClass.prototype.onHide;

      if (origHide) {

        PanelClass.prototype.onHide = function () {

          try {

            if (this['_market_ui_btn']) {

              try { this['_market_ui_btn'].dispose(); } catch (_) {}

              this['_market_ui_btn'] = null;

            }

            origHide.apply(this, arguments);

          } catch (e) {

            log('onHide 执行失败: ' + e.message);

          }

        };

        log('✅ 已注入 onHide');

      }

      

      log('✅ ActivityTimeContainerDialog 注入完成');

    } catch (e) {

      log('❌ patchActivityTimeContainer 失败: ' + e.message);

      tip('❌ 注入失败: ' + e.message);

    }

  };



  // ==================== 主注入循环 ====================

  let boxPanelPatched = false;

  let goldEggPatched = false;

  let geniePanelPatched = false;

  let recruitPatched = false;

  let mainPanelPatched = false;

  let stagePanelPatched = false;

  let activityTimePatched = false;

  let buttonStyleLoaded = false;

  const ENABLE_BOX_PATCH = true; // 启用宝箱界面自定义按钮（招募改动前的样子）

  // removed debug ready tip



  const injectionInterval = setInterval(() => {

    if (typeof unsafeWindow['__require'] !== 'function' || typeof unsafeWindow.fgui !== 'object') return;



    // 尝试加载按钮样式（只执行一次）

    if (!buttonStyleLoaded) {

      buttonStyleLoaded = true;

      setTimeout(() => loadBoxButtonStyle(), 1000);

    }



    if (boxPanelPatched && goldEggPatched && geniePanelPatched && recruitPatched && mainPanelPatched && stagePanelPatched && activityTimePatched) {

      clearInterval(injectionInterval);

      log('🎉 所有模块注入完成！');

      tip('🎉 所有模块注入完成');

      return;

    }



    if (ENABLE_BOX_PATCH && !boxPanelPatched) {

      try {

        const M = unsafeWindow['__require']('BoxPanel');

        if (M?.BoxPanel) { patchBoxPanel(M.BoxPanel); boxPanelPatched = true; }

      } catch (_) {}

    }



    if (!goldEggPatched) {

      try {

        const M = unsafeWindow['__require']('BoxWeekGoldEggDialog');

        if (M?.BoxWeekGoldEggDialog) { patchGoldEggDialog(M.BoxWeekGoldEggDialog); goldEggPatched = true; }

      } catch (_) {}

    }



    if (!geniePanelPatched) {

      try {

        const M = unsafeWindow['__require']('GeniePanel');

        if (M?.GeniePanel) { patchGeniePanel(M.GeniePanel); geniePanelPatched = true; }

      } catch (_) {}

    }



    if (!recruitPatched) {

      try {

        const M = unsafeWindow['__require']('HeroRecruitDialog');

        if (M?.HeroRecruitDialog) { patchRecruitDialog(M.HeroRecruitDialog); recruitPatched = true; }

      } catch (_) {}

    }



    if (!mainPanelPatched) {

      try {

        const M = unsafeWindow['__require']('MainPanel');

        if (M?.MainPanel) { patchMainPanel(M.MainPanel); mainPanelPatched = true; }

      } catch (_) {}

    }



    // 尝试注入推图界面（尝试多个可能的Panel名称）

    if (!stagePanelPatched) {

      const possibleNames = ['StagePanel', 'BattlePanel', 'CampaignPanel', 'LevelPanel', 'MapPanel', 'AdvancedMapPanel', 'NormalMapPanel'];

      for (const name of possibleNames) {

        try {

          const M = unsafeWindow['__require'](name);

          if (M && M[name]) {

            patchStagePanel(M[name], name);

            stagePanelPatched = true;

            log('✅ 找到推图界面: ' + name);

            tip('✅ 找到推图界面: ' + name);

            break;

          }

        } catch (_) {}

      }

    }



    // 注入江湖黑市界面（ActivityTimeContainerDialog）

    if (!activityTimePatched) {

      try {

        const M = unsafeWindow['__require']('ActivityTimeContainerDialog');

        if (M && M.ActivityTimeContainerDialog) {

          patchActivityTimeContainer(M.ActivityTimeContainerDialog);

          activityTimePatched = true;

          tip('✅ 江湖黑市界面已注入');

        }

      } catch (e) {

        log('注入 ActivityTimeContainerDialog 失败: ' + e.message);

      }

    }

  }, 500);



  // ==================== 脚本加载后自动领取黑市周福利和奖励 ====================

  // 使用标记确保只领取一次

  let __hasAutoClaimedBlackmarket = false;

  

  const autoClaimBlackmarketRewards = async () => {

    // 检查是否已经领取过

    if (__hasAutoClaimedBlackmarket) {

      log('[自动领取] 本次游戏会话已经领取过，跳过');

      return;

    }

    

    // 等待游戏会话完全就绪（ROLE.id 有效 + WebSocket 连通 + 服务层加载）

    log('[自动领取] 等待游戏会话就绪...');

    const ready = await waitForGameReady(60000);

    if (!ready) {

      log('[自动领取] 游戏会话未就绪（等待超时60s），跳过自动领取');

      return;

    }

    

    // 会话就绪后再额外等待2秒，确保服务端数据同步完成

    await sleep(2000);

    

    try {

      // 使用游戏内置消息系统（避免直接操作WebSocket导致断线）

      const GS = getGameServices();

      const gameSendMsg = typeof unsafeWindow.sendMsg === 'function' ? unsafeWindow.sendMsg : null;

      if (!GS?.ActivityService && !gameSendMsg) {

        log('[自动领取] 游戏服务未就绪，跳过自动领取');

        return;

      }

      

      const sendMsg = async (cmd, params = {}) => {

        let res;

        if (GS?.ActivityService?.buyStoreGoods && cmd === 'activity_buystoregoods') {

          res = await GS.ActivityService.buyStoreGoods(params);

        } else if (gameSendMsg) {

          res = await gameSendMsg(cmd, params);

        } else {

          throw new Error('缺少环境支持');

        }

        const data = typeof res?.getData === 'function' ? res.getData() : res;

        return data;

      };

      

      log('[自动领取] 开始自动领取黑市周福利和奖励...');

      

      // 领取黑市周福利（activityId=9, goodsIndex=0）

      try {

        await sendMsg('activity_buystoregoods', {

          activityId: 9,

          goodsIndex: 0,

          buyNum: 1

        });

        await sleep(300);

        log('[自动领取] ✅ 黑市周福利领取成功');

        tip('✅ 黑市周福利已自动领取');

      } catch (e) {

        const errorMsg = e?.message || e?.msg || e?.error || String(e);

        if (errorMsg.includes('已领取') || errorMsg.includes('已购买')) {

          log('[自动领取] ⚠️ 黑市周福利已领取');

        } else {

          log('[自动领取] ⚠️ 黑市周福利领取失败: ' + errorMsg);

        }

      }

      

      // 领取黑市周奖励（activityId=5, goodsIndex=0）

      try {

        await sendMsg('activity_buystoregoods', {

          activityId: 5,

          goodsIndex: 0,

          buyNum: 1

        });

        await sleep(300);

        log('[自动领取] ✅ 黑市周奖励领取成功');

        tip('✅ 黑市周奖励已自动领取');

      } catch (e) {

        const errorMsg = e?.message || e?.msg || e?.error || String(e);

        if (errorMsg.includes('已领取') || errorMsg.includes('已购买')) {

          log('[自动领取] ⚠️ 黑市周奖励已领取');

        } else {

          log('[自动领取] ⚠️ 黑市周奖励领取失败: ' + errorMsg);

        }

      }

      

      // 标记已领取

      __hasAutoClaimedBlackmarket = true;

      log('[自动领取] 黑市周自动领取完成，本次游戏会话不再重复领取');

    } catch (e) {

      log('[自动领取] 自动领取出错: ' + (e?.message || e));

    }

  };

  

  // 延迟执行自动领取（内部会等待游戏会话完全就绪后才发送命令）

  setTimeout(() => {

    autoClaimBlackmarketRewards();

  }, 5000);



})();

