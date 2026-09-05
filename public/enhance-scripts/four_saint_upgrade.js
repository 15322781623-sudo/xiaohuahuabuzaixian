// ==UserScript==
// @name 四圣自动升级
// @version 7.6.1
// @run-at document-end
// @description 四圣自动升级按钮
// ==/UserScript==
//
// v7.6.1：错误UI修复
//
(function () {
    'use strict';

    const TAG = '[XingChi][四圣自动升级]';

    // ★★★ 可在此调整按钮相对于锚点的偏移量 ★★★
    const OFFSET = {
        x: -10,   // 水平偏移：正数向右，负数向左（当前为向左 4px）
        y: -12   // 垂直偏移：正数向下，负数向上（当前为向上 12px）
    };

    const state = {
        running: false,
        loopTimer: null,
        scanTimer: null,
        targetBreakBtn: null,
        fguiAutoBtn: null,
        anchorBtn: null,
        lastQuench: null,
        lastOrder: null,
        wsHooked: false,
        inflight: false,
        lastInteractedHeroId: null,
        lastInteractedAt: 0,
        lastInteractedCmd: '',
        currentSendingCmd: ''
    };

    function log(...args) { console.log(TAG, ...args); }
    function warn(...args) { console.warn(TAG, ...args); }

    function tip(msg) {
        try {
            const T = window.__require && window.__require('TipsManager');
            if (T && T.SHOW_TIP) { T.SHOW_TIP(msg); return; }
        } catch (_) {}
        log(msg);
    }

    // ─── FGUI 工具 ───
    function extractOwnText(obj) {
        if (!obj) return '';
        const pieces = [];
        try { if (typeof obj.title === 'string' && obj.title) pieces.push(obj.title); } catch (_) {}
        try { if (typeof obj.text === 'string' && obj.text && obj.text !== obj.title) pieces.push(obj.text); } catch (_) {}
        try {
            if (obj.numChildren && typeof obj.getChildAt === 'function' && obj.numChildren <= 8) {
                for (let i = 0; i < obj.numChildren; i++) {
                    const c = obj.getChildAt(i);
                    if (!c || c.numChildren) continue;
                    try { if (typeof c.title === 'string' && c.title) pieces.push(c.title); } catch (_) {}
                    try { if (typeof c.text === 'string' && c.text) pieces.push(c.text); } catch (_) {}
                }
            }
        } catch (_) {}
        return pieces.join('|');
    }

    function isGButton(obj) {
        if (!obj) return false;
        try {
            if (obj.asButton === obj) return true;
            if (obj.constructor && /Button/i.test(obj.constructor.name)) return true;
        } catch (_) {}
        return false;
    }

    function isReasonableSize(obj, minW = 20, minH = 20, maxW = 400, maxH = 200) {
        try {
            const w = obj.width || 0, h = obj.height || 0;
            return w >= minW && w <= maxW && h >= minH && h <= maxH;
        } catch (_) { return false; }
    }

    function btnMatchesKeywords(obj, keywords) {
        const txt = extractOwnText(obj).toLowerCase();
        return keywords.some(k => txt.includes(k.toLowerCase()));
    }

    function findButtonInContainer(container, keywords, depth = 0, sizeCheck = true) {
        if (!container || depth > 12) return null;
        try {
            if (container.visible === false) return null;
            if (isGButton(container) && (!sizeCheck || isReasonableSize(container, 15, 15, 400, 200)) && btnMatchesKeywords(container, keywords))
                return container;
            if (container.numChildren && typeof container.getChildAt === 'function') {
                for (let i = 0; i < container.numChildren; i++) {
                    const found = findButtonInContainer(container.getChildAt(i), keywords, depth + 1, sizeCheck);
                    if (found) return found;
                }
            }
        } catch (_) {}
        return null;
    }

    const UPGRADE_KW = ['突破', '共鸣', 'breakthrough'];
    const CONVERT_KW = ['四圣转换', 'saint'];

    function findUpgradeBtnInGRoot() {
        try {
            const fgui = window.fgui;
            if (!fgui || !fgui.GRoot) return null;
            const groot = (typeof fgui.GRoot.inst === 'function') ? fgui.GRoot.inst() : fgui.GRoot.inst;
            if (!groot) return null;
            const btn = findButtonInContainer(groot, UPGRADE_KW);
            if (!btn) return null;
            let cur = btn;
            for (let i = 0; i < 16 && cur; i++) {
                if (cur.visible === false) return null;
                cur = cur.parent;
            }
            return btn;
        } catch (_) { return null; }
    }

    function findConvertBtnInGRoot() {
        try {
            const fgui = window.fgui;
            if (!fgui || !fgui.GRoot) return null;
            const groot = (typeof fgui.GRoot.inst === 'function') ? fgui.GRoot.inst() : fgui.GRoot.inst;
            if (!groot) return null;
            return findButtonInContainer(groot, CONVERT_KW);
        } catch (_) { return null; }
    }

    // 检测按钮父链是否位于四圣面板内
    function isInsideFourSaintPanel(btn) {
        let cur = btn;
        for (let i = 0; i < 16 && cur; i++) {
            const cn = (cur.constructor && cur.constructor.name) || '';
            const nm = cur.name || '';
            if (/HolyBeast|FourSaint|SaintBeast/i.test(nm)) return true;
            if (/HolyBeast|FourSaint|SaintBeast/i.test(cn)) return true;
            cur = cur.parent;
        }
        return false;
    }

    // 锚点按钮：四圣转换 → 共鸣/突破
    function getAnchorBtn() {
        const convert = findConvertBtnInGRoot();
        if (convert && isInsideFourSaintPanel(convert)) return convert;
        const upgrade = findUpgradeBtnInGRoot();
        if (upgrade && isInsideFourSaintPanel(upgrade)) return upgrade;
        return null;
    }

    // ─── heroId 提取 ───
    function isHeroIdValidFourSaint(heroId) {
        try {
            const ROLE = window.ROLE;
            if (!ROLE || !ROLE.heroes) return false;
            let h = null;
            if (typeof ROLE.heroes.get === 'function') h = ROLE.heroes.get(heroId);
            else if (typeof ROLE.getHeroById === 'function') h = ROLE.getHeroById(heroId);
            else h = ROLE.heroes[heroId];
            return h && h.hB;
        } catch (_) { return false; }
    }

    function tryHookWsSendAsync() {
        if (state.wsHooked) return true;
        try {
            const ws = window.ws;
            if (!ws || typeof ws.sendAsync !== 'function') return false;
            if (ws.sendAsync.__xcGuardianHooked) { state.wsHooked = true; return true; }
            const orig = ws.sendAsync.bind(ws);
            ws.sendAsync = function (msg) {
                try {
                    if (msg && msg.params && typeof msg.params.heroId === 'number' &&
                        msg.params.heroId >= 100 && msg.params.heroId <= 9999) {
                        if (!state.running || msg.cmd !== state.currentSendingCmd) {
                            state.lastInteractedHeroId = msg.params.heroId;
                            state.lastInteractedAt = Date.now();
                            state.lastInteractedCmd = msg.cmd;
                        }
                    }
                    if (msg && (msg.cmd === 'hb_quench' || msg.cmd === 'hb_upgradeorder')) {
                        // 仅记录用户手动发送的快照，避免自动循环覆盖学习样本
                        if (!state.running || msg.cmd !== state.currentSendingCmd) {
                            const snap = { cmd: msg.cmd, params: Object.assign({}, msg.params || {}) };
                            if (msg.cmd === 'hb_quench')      state.lastQuench = snap;
                            else                               state.lastOrder  = snap;
                        }
                    }
                } catch (_) {}
                return orig(msg);
            };
            ws.sendAsync.__xcGuardianHooked = true;
            state.wsHooked = true;
            log('ws hook 成功');
            return true;
        } catch (_) { return false; }
    }

    function extractHeroIdFromAncestors(btn) {
        const KEYS = ['heroId', '_heroId', 'hero_id', 'heroID', 'heroid', 'curHeroId', 'currentHeroId', 'selectedHeroId', 'saintId', 'hbHeroId', 'beastId', 'guardianId', 'fourSaintId'];
        const NEST = ['data', '_data', 'hero', '_hero', 'viewData', 'model', '_model', '_view', 'ctrl', 'controller', '_ctrl', 'config', '_config'];
        function tryKey(obj, k) {
            try { const v = obj[k]; if (typeof v === 'number' && v >= 100 && v <= 9999) return v; } catch (_) {}
            return null;
        }
        let node = btn && btn.parent;
        for (let lv = 0; lv < 12 && node; lv++) {
            for (const k of KEYS) {
                const hit = tryKey(node, k);
                if (hit && /hero|saint|beast|hb/i.test(k)) return hit;
            }
            for (const nk of NEST) {
                try {
                    const sub = node[nk];
                    if (sub) for (const k of KEYS) {
                        const sv = tryKey(sub, k);
                        if (sv && /hero|saint|beast|hb/i.test(k)) return sv;
                    }
                } catch (_) {}
            }
            node = node.parent;
        }
        return null;
    }

    function pickCommandForButton(btn) {
        const txt = extractOwnText(btn).toLowerCase();
        const cmd = txt.includes('突破') ? 'hb_upgradeorder' : 'hb_quench';

        // 优先复用最近一次用户手动触发的同 cmd 快照（含完整 params：part/order/cnt 等）
        const snap = (cmd === 'hb_upgradeorder') ? state.lastOrder : state.lastQuench;
        if (snap && snap.params && typeof snap.params.heroId === 'number'
            && Date.now() - state.lastInteractedAt < 5 * 60 * 1000
            && isHeroIdValidFourSaint(snap.params.heroId)) {
            return { cmd: snap.cmd, params: Object.assign({}, snap.params) };
        }

        // 没有学习过：退化为仅 heroId（多数情况下服务端会拒绝，提示用户先手动点一次）
        let heroId = null;
        if (state.lastInteractedHeroId && Date.now() - state.lastInteractedAt < 5 * 60 * 1000
            && isHeroIdValidFourSaint(state.lastInteractedHeroId)) {
            heroId = state.lastInteractedHeroId;
        }
        if (!heroId) {
            const anc = extractHeroIdFromAncestors(btn);
            if (anc && isHeroIdValidFourSaint(anc)) heroId = anc;
        }
        return heroId ? { cmd, params: { heroId } } : null;
    }

    // ─── 协议发送 / 升级循环 ───
    function sendUpgradeCmd(cmdRecord) {
        const ws = window.ws;
        if (!ws || typeof ws.sendAsync !== 'function') return Promise.reject(new Error('ws 不可用'));
        return ws.sendAsync({ ack: 0, cmd: cmdRecord.cmd, params: cmdRecord.params, seq: Date.now(), time: Date.now() });
    }

    function updateBtnTitle() {
        const btn = state.fguiAutoBtn;
        if (!btn) return;
        try {
            const t = state.running ? '停止升级' : '自动升级';
            btn.title = t;
            if (btn.asButton) btn.asButton.title = t;
        } catch (_) {}
    }

    function stopAuto(reason) {
        if (!state.running) return;
        state.running = false;
        if (state.loopTimer) { clearInterval(state.loopTimer); state.loopTimer = null; }
        state.inflight = false;
        updateBtnTitle();
        tip('已停止' + (reason ? '：' + reason : ''));
    }

    function startAuto() {
        if (state.running) return;
        const btn = findUpgradeBtnInGRoot();
        if (!btn) { tip('请先打开四圣界面'); return; }
        state.targetBreakBtn = btn;

        const record = pickCommandForButton(btn);
        if (!record) {
            tip('无法识别当前英雄，请手动点击一次“共鸣”或“突破”');
            return;
        }
        log('开始自动升级', record.cmd, record.params.heroId);
        state.running = true;
        state.inflight = false;
        updateBtnTitle();
        tip('开始自动升级');

        let sentCount = 0;
        const startTs = Date.now();
        state.loopTimer = setInterval(() => {
            if (!state.running) return;
            if (Date.now() - startTs > 10 * 60 * 1000) { stopAuto('超时'); return; }
            if (state.inflight) return;

            let curBtn = state.targetBreakBtn;
            if (!curBtn || (typeof curBtn.isDisposed !== 'undefined' && curBtn.isDisposed)) {
                curBtn = findUpgradeBtnInGRoot();
                if (!curBtn) { stopAuto('离开四圣界面'); return; }
                state.targetBreakBtn = curBtn;
            }
            const rec = pickCommandForButton(curBtn);
            if (!rec) { stopAuto('无法确定英雄'); return; }

            state.inflight = true;
            state.currentSendingCmd = rec.cmd;
            sendUpgradeCmd(rec).then(resp => {
                state.inflight = false;
                sentCount++;
                if (resp && resp.code !== 0 && resp.code !== undefined && resp.code !== null) {
                    stopAuto('服务端拒绝 code=' + resp.code);
                }
            }).catch(e => {
                state.inflight = false;
                stopAuto('发送异常: ' + (e && e.message || e));
            });
        }, 200);
    }

    // ─── UI 注入（使用 OFFSET 控制位置） ───
    function calcRelativePosition(anchorBtn, autoBtn) {
        if (!anchorBtn || !anchorBtn.parent) return { x: 0, y: 0 };
        const ax = anchorBtn.x || 0;
        const ay = anchorBtn.y || 0;
        const aw = anchorBtn.width || 85;
        const bw = autoBtn?.width || 62;
        const bh = autoBtn?.height || 68;
        // 水平：锚点右侧 + 自定义偏移（可正可负）
        const x = ax + aw + OFFSET.x;
        // 垂直：按钮底部紧贴锚点顶部 + 自定义偏移（负数为向上）
        const y = ay - bh + OFFSET.y;
        return { x, y: Math.max(y, 0) };
    }

    function ensureFguiAutoBtn() {
        const anchor = getAnchorBtn();
        if (!anchor || !anchor.parent) {
            if (state.fguiAutoBtn) removeFguiAutoBtn();
            return;
        }

        const parent = anchor.parent;

        if (state.fguiAutoBtn && state.anchorBtn === anchor && state.fguiAutoBtn.parent === parent) {
            updateBtnTitle();
            const pos = calcRelativePosition(anchor, state.fguiAutoBtn);
            forceSetPosition(state.fguiAutoBtn, pos.x, pos.y);
            return;
        }

        removeFguiAutoBtn();

        const fgui = window.fgui;
        if (!fgui) return;

        let autoBtn = null;
        try {
            if (fgui.UIPackage && typeof fgui.UIPackage.createObject === 'function') {
                const obj = fgui.UIPackage.createObject('ui_common', 'BtnInfo2');
                if (obj) autoBtn = obj.asButton || obj;
            }
        } catch (_) {}
        if (!autoBtn) {
            try { if (fgui.GButton) autoBtn = new fgui.GButton(); } catch (_) {}
        }
        if (!autoBtn) return;

        if (!autoBtn.width) autoBtn.width = 62;
        if (!autoBtn.height) autoBtn.height = 68;
        autoBtn.title = state.running ? '停止升级' : '自动升级';
        if (autoBtn.asButton) autoBtn.asButton.title = autoBtn.title;

        autoBtn.onClick(() => {
            if (state.running) stopAuto('手动停止');
            else startAuto();
        });

        try {
            parent.addChild(autoBtn);
            if (autoBtn.relations && typeof autoBtn.relations.clear === 'function') {
                autoBtn.relations.clear();
            }
            const pos = calcRelativePosition(anchor, autoBtn);
            forceSetPosition(autoBtn, pos.x, pos.y);
        } catch (e) {
            warn('addChild 失败:', e.message);
            return;
        }

        state.fguiAutoBtn = autoBtn;
        state.anchorBtn = anchor;
        log('按钮已注入, 坐标', autoBtn.x, autoBtn.y);
    }

    function forceSetPosition(btn, x, y) {
        try {
            if (btn.relations && typeof btn.relations.clear === 'function') {
                btn.relations.clear();
            }
        } catch (_) {}
        try {
            btn.setXY(x, y);
        } catch (_) {
            try { btn.x = x; btn.y = y; } catch (_) {}
        }
    }

    function removeFguiAutoBtn() {
        if (state.fguiAutoBtn) {
            try { state.fguiAutoBtn.dispose(); } catch (_) {}
            state.fguiAutoBtn = null;
            state.anchorBtn = null;
        }
    }

    // ─── 主循环 ───
    function tick() {
        try {
            const anchor = getAnchorBtn();
            if (anchor) {
                ensureFguiAutoBtn();
            } else {
                if (state.fguiAutoBtn) removeFguiAutoBtn();
                if (state.running) stopAuto('离开四圣界面');
            }
        } catch (_) {}
    }

    function bootstrap() {
        if (state.scanTimer) return;
        state.scanTimer = setInterval(tick, 800);
        setTimeout(tick, 300);
        let tries = 0;
        const hookTimer = setInterval(() => {
            if (tryHookWsSendAsync() || ++tries > 120) clearInterval(hookTimer);
        }, 500);
        log('四圣自动升级脚本已启动');
    }

    try {
        bootstrap();
    } catch (e) {
        console.error(TAG + ' 初始化失败:', e);
    }
})();
