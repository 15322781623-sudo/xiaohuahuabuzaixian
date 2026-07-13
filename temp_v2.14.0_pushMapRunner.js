/**
 * 鍏变韩鎺ㄥ浘閫昏緫妯″潡
 * 鎻愪緵缁熶竴鐨勬帹鍥惧惊鐜€佺伀鎶婄郴缁熴€佽嚜鍔ㄩ噸杩炵瓑鍔熻兘
 * 渚?TokenCard锛堝崟鍗℃帹鍥撅級鍜?BatchDailyTasks锛堟壒閲忔帹鍥撅級鍏辩敤
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * 鍒涘缓鎺ㄥ浘鎵ц鍣? * @param {object} deps - 渚濊禆椤? * @param {object} deps.tokenStore - Token绠＄悊store
 * @param {function} deps.getTokens - 鑾峰彇tokens鏁扮粍鐨勫嚱鏁? * @param {function} deps.addLog - 鏃ュ織鍥炶皟 (logEntry) => void
 * @param {function|object} [deps.shouldStop] - 鍋滄鏍囧織锛坮ef鎴杇etter锛夛紝鎵归噺鎺ㄥ浘鐢? * @param {object} [deps.tokenStatus] - 璐﹀彿鐘舵€佹槧灏勶紙鎵归噺鎺ㄥ浘鐢級
 */
export function createPushMapRunner(deps) {
  const { tokenStore, getTokens, addLog, shouldStop, tokenStatus } = deps;

  // 鍒ゆ柇鏄惁搴旇鍋滄
  const isShouldStop = () => {
    if (!shouldStop) return false;
    if (typeof shouldStop === 'function') return shouldStop();
    // ref
    return shouldStop.value === true;
  };

  // 鏃ュ織鍥炶皟
  const log = (msg, type) => {
    addLog({ time: new Date().toLocaleTimeString(), message: msg, type: type || "info" });
    if (typeof window._pushLog === "function") window._pushLog(msg, type || "info");
  };

  // 鑾峰彇璐﹀彿鍚嶇О
  const getTokenName = (tid) => {
    const tokens = getTokens();
    const tk = tokens.find(x => x.id === tid);
    return tk ? tk.name || tid : tid;
  };

  // 鑾峰彇Boss鍚嶇О
  const getBoss = (lvl) => {
    if (!window._bossMap) return "";
    const b = window._bossMap[String(lvl)];
    return b ? b.chinese : "";
  };

  // 鍔犺浇Boss鏁版嵁
  const loadBossData = async () => {
    if (window._bossMap && Object.keys(window._bossMap).length > 0) return window._bossMap;
    try {
      const resp = await fetch("/boss_level_mapping_fixed.json");
      if (resp.ok) {
        window._bossMap = await resp.json();
        log(`[鎺ㄥ浘] Boss鏁版嵁鍔犺浇: ${Object.keys(window._bossMap).length}鏉);
      }
    } catch (e) {
      log(`[鎺ㄥ浘] Boss鏁版嵁鍔犺浇澶辫触`, "warning");
      if (!window._bossMap) window._bossMap = {};
    }
    return window._bossMap;
  };

  // 浣跨敤鐏妸
  const useTorch = async (tokenId) => {
    const ti = window._pushTorchType || 0;
    if (!ti) return;
    const count = window._pushTorchCount || 10;
    const nm = getTokenName(tokenId);
    const torchNm = ti === 1008 ? "鏈ㄦ潗" : ti === 1009 ? "闈掗摐" : "鎴樼";
    log(`[${nm}] 浣跨敤${torchNm}鐏妸 x${count}...`);
    let ok = 0;
    for (let i = 0; i < count; i++) {
      try {
        await tokenStore.sendMessageWithPromise(tokenId, "item_consume", { itemId: ti, quantity: 1 }, 5000);
        ok++;
        await sleep(500);
      } catch (e) {
        log(`[${nm}] 鐏妸绗?{i + 1}娆″け璐? ${e.message}`, "error");
        break;
      }
    }
    if (window._pt[tokenId]) {
      window._pt[tokenId].torchAt = Date.now();
      window._pt[tokenId].torchDur = (ti === 1008 ? 600 : ti === 1009 ? 1200 : 1800) * ok;
    }
    const mins = Math.round((ti === 1008 ? 10 : ti === 1009 ? 20 : 30) * ok);
    log(`[${nm}] ${torchNm}鐏妸宸叉縺娲?${ok}涓?绾?{mins}鍒嗛挓)`, "success");
  };

  // 鑷姩閲嶈繛锛堟寔缁噸璇曠洿鍒版垚鍔熸垨鎵嬪姩鍋滄锛?  const reconnect = async (tokenId, pushState) => {
    const nm = getTokenName(tokenId);
    const tokens = getTokens();
    let attempt = 0;
    while (!pushState.stopFlag && !isShouldStop()) {
      attempt++;
      log(`[${nm}] 灏濊瘯閲嶈繛 (绗?{attempt}娆?...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl);
          // 绛夊緟杩炴帴寤虹珛锛堟渶澶?0绉掞級
          for (let w = 0; w < 20; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        }
      } catch (e) { }
      if (tokenStore.getWebSocketStatus(tokenId) === "connected") {
        log(`[${nm}] 閲嶈繛鎴愬姛 (绗?{attempt}娆″皾璇?`, "success");
        await sleep(2000);
        return true;
      }
      // 閲嶈繛闂撮殧锛氬墠3娆?绉掞紝涔嬪悗姣?娆″鍔?绉掞紝鏈€闀?0绉?      const waitSec = Math.min(30, attempt <= 3 ? 5 : (Math.floor(attempt / 5) + 1) * 5);
      log(`[${nm}] 閲嶈繛鏈垚鍔燂紝${waitSec}绉掑悗閲嶈瘯...`, "warning");
      await sleep(waitSec * 1000);
    }
    log(`[${nm}] 閲嶈繛宸插仠姝?(${attempt}娆″皾璇?`, "error");
    return false;
  };

  // 鎺ㄥ浘涓诲惊鐜?  const pushLoop = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    window._pt[tokenId] = {
      running: true, stopFlag: false, level: 0, wins: 0, losses: 0,
      retries: 0, countdown: 0, totalTime: 0, battles: 0, torchAt: 0, torchDur: 0,
      lastStatusRefresh: 0, // 涓婃鍒锋柊鐘舵€佺殑鏃堕棿鎴?    };
    const st = window._pt[tokenId];
    const nm = getTokenName(tokenId);
    if (tokenStatus) tokenStatus.value[tokenId] = "running";
    log(`[${nm}] 寮€濮嬫帹鍥綻, "success");

    // 浣跨敤鐏妸锛堝鏋滈€夋嫨浜嗭級
    if (window._pushTorchType) {
      await useTorch(tokenId);
    }

    // 鍒濆鍖栨垬鏂楃増鏈紙鎺ㄥ浘蹇呴渶锛?    try {
      const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
      if (initRes?.battleData?.version) {
        tokenStore.setBattleVersion(initRes.battleData.version);
        log(`[${nm}] 鎴樻枟鐗堟湰鍒濆鍖栧畬鎴恅, "success");
      }
    } catch (e) {
      log(`[${nm}] 鎴樻枟鐗堟湰鍒濆鍖栧け璐ワ紝缁х画灏濊瘯鎺ㄥ浘`, "warning");
    }

    // 璁板綍鍒濆鍒锋柊鏃堕棿
    st.lastStatusRefresh = Date.now();

    try {
      while (!st.stopFlag && !isShouldStop()) {
        // 姣忓皬鏃惰嚜鍔ㄥ埛鏂扮姸鎬侊紙涓嶅奖鍝嶆甯告帹鍥撅級
        const STATUS_REFRESH_INTERVAL = 60 * 60 * 1000; // 1灏忔椂
        const timeSinceLastRefresh = Date.now() - st.lastStatusRefresh;
        if (timeSinceLastRefresh >= STATUS_REFRESH_INTERVAL) {
          log(`[${nm}] 瀹氭椂鍒锋柊鐘舵€侊紙宸茶繍琛?{Math.floor(timeSinceLastRefresh / 60000)}鍒嗛挓锛塦, "info");
          try {
            // 鍒锋柊瑙掕壊淇℃伅
            const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
            if (ri && ri.role) {
              st.level = ri.role.levelId || 0;
              log(`[${nm}] 鐘舵€佸埛鏂板畬鎴愶紝褰撳墠鍏冲崱: ${st.level}`, "success");
            }
            // 鍙戦€佸績璺充繚鎸佽繛鎺?            tokenStore.sendMessage(tokenId, "heart_beat");
          } catch (e) {
            log(`[${nm}] 鐘舵€佸埛鏂板け璐? ${e.message}`, "warning");
          }
          st.lastStatusRefresh = Date.now();
        }

        // 妫€鏌ヨ繛鎺ョ姸鎬侊紝鏂嚎鏃惰嚜鍔ㄩ噸杩?        if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
          log(`[${nm}] 杩炴帴鏂紑锛屾寔缁噸杩炰腑...`, "warning");
          const reconnected = await reconnect(tokenId, st);
          if (!reconnected) {
            log(`[${nm}] 閲嶈繛琚腑姝紝鍋滄鎺ㄥ浘`, "error");
            break;
          }
          // 閲嶈繛鎴愬姛鍚庨噸鏂板垵濮嬪寲鎴樻枟鐗堟湰
          try {
            const initRes = await tokenStore.sendMessageWithPromise(tokenId, "fight_startlevel", {}, 8000);
            if (initRes?.battleData?.version) {
              tokenStore.setBattleVersion(initRes.battleData.version);
              log(`[${nm}] 鎴樻枟鐗堟湰閲嶆柊鍒濆鍖栧畬鎴恅, "success");
            }
          } catch (e) { }
          // 閲嶈繛鎴愬姛鍚庨噸缃埛鏂拌鏃跺櫒
          st.lastStatusRefresh = Date.now();
        }

        // 鑾峰彇鍏冲崱淇℃伅
        try {
          const ri = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 10000);
          if (ri && ri.role) st.level = ri.role.levelId || 0;
        } catch (e) { }
        const bossNm = getBoss(st.level);
        log(`[${nm}] 鍏冲崱: ${st.level}${bossNm ? " Boss: " + bossNm : ""}`);

        // 璁＄畻鎴樻枟鏃堕棿
        let battleTime = 300;
        try {
          const cr = await tokenStore.sendMessageWithPromise(tokenId, "fight_calcleveltime", {}, 15000);
          if (cr && !cr.code) {
            const bt = cr.battleTime || (cr.body && cr.body.battleTime);
            if (bt != null) { battleTime = Number(bt); if (battleTime <= 0) battleTime = 300; }
          }
          log(`[${nm}] 鎴樻枟闇€ ${battleTime} 绉抈, "success");
        } catch (e) {
          log(`[${nm}] 鑾峰彇鎴樻枟鏃堕棿澶辫触`, "warning");
        }
        if (st.stopFlag || isShouldStop()) break;
        st.totalTime = battleTime;
        st.countdown = battleTime;

        // 鍊掕鏃剁瓑寰?        const t0 = Date.now();
        let hb = 0;
        let lastLogSec = -1;
        while (st.countdown > 0 && !st.stopFlag && !isShouldStop()) {
          await sleep(1000);
          st.countdown = Math.max(0, Math.ceil(battleTime - (Date.now() - t0) / 1000));
          hb++;
          // 姣?0绉掕緭鍑轰竴娆″墿浣欐椂闂?          const curLogSec = Math.floor(st.countdown / 10) * 10;
          if (curLogSec !== lastLogSec && st.countdown > 0) {
            lastLogSec = curLogSec;
            const mm = Math.floor(st.countdown / 60);
            const ss = String(Math.floor(st.countdown % 60)).padStart(2, '0');
            log(`[${nm}] 鈴?鎴樻枟鍓╀綑 ${mm}:${ss}`, "info");
          }
          if (hb % 25 === 0) {
            try {
              tokenStore.sendMessage(tokenId, "heart_beat");
            } catch (e) {
              if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
                log(`[${nm}] 鍊掕鏃朵腑蹇冭烦澶辫触锛屽皾璇曢噸杩?..`, "warning");
                await reconnect(tokenId, st);
              }
            }
          }
        }
        if (st.stopFlag || isShouldStop()) break;

        // 鑾峰彇鎴樻枟缁撴灉锛堝甫閲嶈瘯锛?        log(`[${nm}] 鑾峰彇鎴樻枟缁撴灉...`);
        let fightResultRetrieved = false;
        for (let fightRetry = 0; fightRetry < 2 && !fightResultRetrieved; fightRetry++) {
          try {
            const fr = await tokenStore.sendMessageWithPromise(tokenId, "fight_level", {}, 15000);
            // 澶氳矾寰勮В鏋愭垬鏂楃粨鏋?            const bd = (fr && fr.body) || fr || {};
            const win = bd.success === true || bd.isWin === true || bd.result === 1 || bd.win === true;
            // 澶氳矾寰勮幏鍙栨柊鍏冲崱
            const nl = bd.currLevel || bd.nextLevel || bd.level || bd.newLevel || st.level;
            st.battles++;
            if (win) {
              st.wins++; st.retries = 0; st.level = nl;
              log(`[${nm}] 鉁?鑳滃埄! 鍏冲崱 ${nl}`, "success");
            } else {
              st.losses++; st.retries = (st.retries || 0) + 1;
              const failReason = bd.errorCode || bd.reason || '';
              log(`[${nm}] 鉂?澶辫触 (杩炵画${st.retries}娆?${failReason ? ': ' + failReason : ''}`, "error");
              if (st.retries >= 5) {
                log(`[${nm}] 杩炵画澶辫触${st.retries}娆★紝鏆傚仠30绉抈, "warning");
                await sleep(30000);
              } else {
                await sleep(10000);
              }
            }
            fightResultRetrieved = true;
            // 鍒锋柊瑙掕壊鏁版嵁
            try { await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, 8000); } catch (e) { }
          } catch (e) {
            const errMsg = e.message || '';
            // 杩炴帴鐩稿叧閿欒锛屽皾璇曢噸杩?            if (errMsg.includes('瓒呮椂') || errMsg.includes('鏂紑') || errMsg.includes('connection') || errMsg.includes('not connected')) {
              log(`[${nm}] 鑾峰彇缁撴灉澶辫触(杩炴帴闂): ${errMsg}锛屽皾璇曢噸杩?..`, "warning");
              await reconnect(tokenId, st);
              fightResultRetrieved = true;
            } else if (fightRetry < 1) {
              log(`[${nm}] 鑾峰彇缁撴灉澶辫触锛岄噸璇曚腑...`, "warning");
              await sleep(3000);
            } else {
              st.losses++; st.battles++; st.retries = (st.retries || 0) + 1;
              log(`[${nm}] 鑾峰彇缁撴灉澶辫触: ${errMsg}`, "error");
              await sleep(10000);
            }
          }
        }

        // 鐏妸缁湡妫€鏌?        if (window._pushTorchType && st.torchAt && !st.stopFlag) {
          const elapsed = (Date.now() - st.torchAt) / 1000;
          if (elapsed >= st.torchDur) {
            log(`[${nm}] 鐏妸宸茶繃鏈燂紝缁敤...`, "warning");
            await useTorch(tokenId);
          }
        }

        if (!st.stopFlag && !isShouldStop()) await sleep(2000);
      }
    } catch (e) {
      log(`[${nm}] 鎺ㄥ浘寮傚父: ${e.message}`, "error");
    } finally {
      st.running = false; st.countdown = 0;
      if (tokenStatus) tokenStatus.value[tokenId] = "completed";
      log(`[${nm}] 鎺ㄥ浘宸插仠姝?(${st.wins}鑳?${st.losses}璐?`, "warning");
    }
  };

  // 鍚姩鍗曚釜Token鎺ㄥ浘锛堝甫鑷姩杩炴帴锛?  // 杩斿洖鍚庤繛鎺ラ樁娈靛凡瀹屾垚锛宲ushLoop鍦ㄥ悗鍙拌繍琛?  const startOne = async (tokenId) => {
    if (!window._pt) window._pt = {};
    if (window._pt[tokenId] && window._pt[tokenId].running) return;
    // 鑷姩杩炴帴鏈繛鎺ョ殑Token
    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
      const nm = getTokenName(tokenId);
      const tokens = getTokens();
      log(`[${nm}] 鏈繛鎺ワ紝姝ｅ湪鑷姩杩炴帴...`, "info");
      try {
        const tk = tokens.find(x => x.id === tokenId);
        if (tk) {
          const result = await tokenStore.createWebSocketConnection(tokenId, tk.token, tk.wsUrl);
          if (!result) {
            log(`[${nm}] 杩炴帴琚烦杩囷紙鍙兘姝ｅ湪杩炴帴涓級锛岀瓑寰呯幇鏈夎繛鎺?..`, "warning");
          }
          // 绛夊緟杩炴帴寤虹珛锛堟渶澶?5绉掞級
          for (let w = 0; w < 30; w++) {
            await sleep(500);
            if (tokenStore.getWebSocketStatus(tokenId) === "connected") break;
          }
        } else {
          log(`[${nm}] 鏈壘鍒拌处鍙蜂俊鎭紝鏃犳硶杩炴帴`, "error");
        }
      } catch (e) {
        log(`[${nm}] 杩炴帴寮傚父: ${e.message}`, "error");
      }
      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        log(`[${nm}] 杩炴帴澶辫触锛屾帹鍥惧皢灏濊瘯鍚庡彴閲嶈繛...`, "warning");
      } else {
        log(`[${nm}] 杩炴帴鎴愬姛`, "success");
      }
    }
    // pushLoop鍦ㄥ悗鍙拌繍琛岋紝涓峚wait
    pushLoop(tokenId);
  };

  // 鍋滄鍗曚釜Token鎺ㄥ浘
  const stopOne = (tokenId) => {
    if (window._pt && window._pt[tokenId]) window._pt[tokenId].stopFlag = true;
  };

  return {
    pushLoop,
    startOne,
    stopOne,
    loadBossData,
    useTorch,
    reconnect,
    getBoss,
    sleep,
  };
}
