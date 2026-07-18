// ==UserScript==
// @name         挤号-断主线
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  抓取 App 内当前账号主线 WebSocket 的 roleToken，用同一 roleToken 开一条新连接（新 sessId/connId、isRestore=0），让游戏服务端按"重复登录"踢掉 App 那条主线，
// @author       小羔羊
// @match        *://*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==
;(function () {
    'use strict';

    var unsafeWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    var TAG = '[挤号]';

    // 主线 WS 形如 wss://xxz-xyzw.hortorgames.com/agent?p=...
    var GAME_WS_RE = /hortorgames\.com\/agent/i;
    var trackedSockets = new Set();
    var lastGameWsUrl = null;     // 用于解析 roleToken
    var OriginalWS = null;        // 未被包装的 WebSocket 构造器

    function isGameWsUrl(url) {
        return typeof url === 'string' && GAME_WS_RE.test(url);
    }

    function trackSocket(ws, url) {
        try {
            trackedSockets.add(ws);
            lastGameWsUrl = url;
            var rm = function () { trackedSockets.delete(ws); };
            ws.addEventListener('close', rm);
            ws.addEventListener('error', rm);
            console.log(TAG, '已追踪游戏 WS:', url);
        } catch (e) { /* ignore */ }
    }

    // ========== 1. 早 Hook：抓取游戏主线 WebSocket（拿 URL/roleToken）==========
    function hookWebSocket() {
        var Original = unsafeWindow.WebSocket;
        if (!Original || Original.__yunqi_kicker_hooked) {
            OriginalWS = Original && (Original.__original || Original);
            return;
        }
        OriginalWS = Original;

        function Wrapped(url, protocols) {
            var ws = protocols ? new Original(url, protocols) : new Original(url);
            if (isGameWsUrl(url)) trackSocket(ws, url);
            return ws;
        }
        Wrapped.prototype = Original.prototype;
        Wrapped.CONNECTING = Original.CONNECTING;
        Wrapped.OPEN = Original.OPEN;
        Wrapped.CLOSING = Original.CLOSING;
        Wrapped.CLOSED = Original.CLOSED;
        Wrapped.__yunqi_kicker_hooked = true;
        Wrapped.__original = Original;
        try { unsafeWindow.WebSocket = Wrapped; }
        catch (e) { window.WebSocket = Wrapped; }
        console.log(TAG, 'WebSocket Hook 已安装');
    }
    hookWebSocket();

    // ========== 2. 兜底：从常见全局对象里扫当前 WS（拿 URL）==========
    function collectFromGlobal() {
        var w = unsafeWindow;
        var found = [];
        var cands = [
            w.ws,
            w.h5websocket && w.h5websocket.ws,
            w.h5websocket,
            w.gameWs,
            w.WebSocketClient && w.WebSocketClient.ws,
            w.WebSocketClient
        ];
        cands.forEach(function (c) {
            if (!c) return;
            if (typeof c.close === 'function' && typeof c.readyState === 'number') {
                found.push(c);
            }
            if (c._ws && typeof c._ws.close === 'function') found.push(c._ws);
            if (c.socket && typeof c.socket.close === 'function') found.push(c.socket);
        });
        return found;
    }

    function pickCurrentWsUrl() {
        if (lastGameWsUrl) return lastGameWsUrl;
        var url = null;
        trackedSockets.forEach(function (ws) {
            if (!url && ws && ws.url && isGameWsUrl(ws.url)) url = ws.url;
        });
        if (url) return url;
        var wss = collectFromGlobal();
        for (var i = 0; i < wss.length; i++) {
            var u = wss[i] && wss[i].url;
            if (u && isGameWsUrl(u)) return u;
        }
        return null;
    }

    function parsePFromUrl(url) {
        try {
            var m = url.match(/[?&]p=([^&#]+)/);
            if (!m) return null;
            return JSON.parse(decodeURIComponent(m[1]));
        } catch (e) { return null; }
    }

    // ========== 3. 挤号：用同一 roleToken 新开 WS，让服务端踢掉旧的 ==========
    function kickByRelogin() {
        var url = pickCurrentWsUrl();
        if (!url) return { ok: false, reason: '未找到当前主线连接（请进游戏后再试）' };
        var p = parsePFromUrl(url);
        if (!p || !p.roleToken) return { ok: false, reason: '主线 URL 没解析到 roleToken' };

        var newP = {
            roleToken: p.roleToken,
            sessId: Date.now() * 1000 + Math.floor(Math.random() * 1000),
            connId: Date.now(),
            isRestore: 0
        };
        var base = url.split('?')[0];
        var newUrl = base + '?p=' + encodeURIComponent(JSON.stringify(newP)) + '&e=x&lang=chinese';

        // 用未被包装的原生 WebSocket，避免再被自身 hook 干扰
        var Ctor = OriginalWS || unsafeWindow.WebSocket;
        var ws;
        try {
            ws = new Ctor(newUrl);
        } catch (e) {
            return { ok: false, reason: '新建 WS 失败：' + e.message };
        }
        try { ws.binaryType = 'arraybuffer'; } catch (e) {}

        var summary = { ok: true, opened: false, closedCode: null, closedReason: '' };
        ws.addEventListener('open', function () {
            summary.opened = true;
            console.log(TAG, '挤号 WS 已连上，3s 后主动断开（服务端会先把 App 旧连接踢掉）');
            setTimeout(function () { try { ws.close(1000, 'kick-done'); } catch (e) {} }, 3000);
        });
        ws.addEventListener('close', function (e) {
            summary.closedCode = e && e.code;
            summary.closedReason = (e && e.reason) || '';
            console.log(TAG, '挤号 WS 关闭', summary.closedCode, summary.closedReason);
        });
        ws.addEventListener('error', function (e) {
            console.warn(TAG, '挤号 WS 错误', e && (e.message || e.type));
        });

        // 同时立即把当前游戏 WS 也 close 一次，加速本端释放（服务端那边的踢号也会跟上）
        trackedSockets.forEach(function (oldWs) {
            try {
                if (oldWs !== ws && oldWs.readyState <= 1) oldWs.close(4001, 'kicked-by-relogin');
            } catch (e) {}
        });

        console.log(TAG, '已发起挤号', { roleTokenTail: String(p.roleToken).slice(-8), newConnId: newP.connId });
        return summary;
    }
    unsafeWindow.__yunqi_kickSelf = kickByRelogin;

    console.log(TAG, '已就绪：原生菜单或控制台调用 window.__yunqi_kickSelf() 触发挤号');
})();
