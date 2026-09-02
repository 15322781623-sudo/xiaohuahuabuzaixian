// ==UserScript==
// @name         自动重连（引擎级）
// @description  参考游戏引擎 WebSocketClient 自动重连逻辑：断线后在页面内自动恢复连接，无需刷新页面；已合并原「断线重连」脚本全部能力（保活检测+刷新兜底）
// @version      1.1.2
// ==/UserScript==
;(function() {
    'use strict';

    var TAG = '[自动重连]';
    var GAME_WS_RE = /hortorgames\.com\/agent/i;

    // ── 配置 ──
    var MAX_SOFT_RECONNECT = 3;    // 页面内软重连上限，超过则转刷新页面
    var RECONNECT_DELAY = 0;       // 断线后软重连延时(ms)：0=断线立即重连
    var RECONNECT_COOLDOWN = 10000; // 软重连冷却(ms)，防止引擎自愈期间重复触发
    var STATE_POLL_INTERVAL = 2000; // 引擎连接状态轮询间隔(ms)
    var HEALTH_INTERVAL = 15000;   // 保活检查间隔(ms)
    var IDLE_THRESHOLD = 15000;    // 15秒无消息视为连接挂起(引擎心跳5s/超时10s，此处给冗余)

    // ── 引擎连接状态枚举（hortorgames WebSocketClient）──
    // 0=Idle 1=Connecting 2=Running 3=Reconnecting 4=Error
    var STATE_NAMES = ['Idle', 'Connecting', 'Running', 'Reconnecting', 'Error'];

    // ── 状态 ──
    var gameWs = null;             // 原生 WebSocket（引擎创建，Hook 捕获）
    var wsUrl = null;              // 连接 URL(参考)
    var engineWs = null;           // 引擎 WebSocketClient 实例 (window.ws)
    var connected = false;
    var wasConnectedOnce = false;
    var lastMessageAt = 0;
    var lastEngineState = -1;
    var lastReconnectAttemptAt = 0;
    var reconnectCount = 0;        // 总重连次数
    var softReconnectCount = 0;    // 页面内软重连次数
    var reconnectTimer = null;     // 软重连定时器
    var healthTimer = null;        // 保活定时器
    var stateTimer = null;         // 状态轮询定时器

    // 标记：兼容旧版缓存的「断线重连」脚本（ws_reconnect.js 已合并入本脚本），
    // 旧缓存中若残留该脚本，检测到标记后自动降级，避免重复 Hook/重复刷新
    window.__autoReconnectActive = true;

    // ══════════════════════════════════════════
    //  1. 引擎状态检测（可用时优先，不可用返回 -1）
    // ══════════════════════════════════════════
    function getEngineState() {
        var client = window.ws;
        if (client && typeof client.connectionState === 'number') {
            engineWs = client;
            return client.connectionState;
        }
        // 兼容 WebSocketClient 内部持有原生 ws 的形态
        if (client && client._ws && typeof client._ws.readyState === 'number') {
            engineWs = client;
            var rs = client._ws.readyState;
            return rs === 1 ? 2 : (rs === 3 ? 0 : rs); // OPEN→Running, CLOSED→Idle
        }
        engineWs = client || null;
        return -1;
    }

    // 引擎级软重连：用引擎自身的恢复机制重建连接（对应引擎 autoRecover 逻辑）
    function engineSoftReconnect() {
        if (!engineWs) return false;
        try {
            var opts = engineWs.connectOptions;
            var canConnect = opts && typeof opts === 'object' && (opts.url || opts.token);
            var cur = getEngineState();

            // connect() 要求状态为 Idle；Error/Reconnecting 下先 reset() 复位
            if (cur !== 0 && typeof engineWs.reset === 'function') {
                engineWs.reset();
            }
            if (typeof engineWs.connect === 'function' && canConnect) {
                engineWs.connect(opts);
                console.log(TAG, '✅ 已通过引擎恢复机制重建连接 (第' + (softReconnectCount + 1) + '次)');
                return true;
            }
            // 引擎无 connect 能力：触发引擎自身的重连状态机
            if (typeof engineWs.interrupt === 'function') {
                engineWs.interrupt();
                console.log(TAG, '✅ 已触发引擎自动重连状态机 (第' + (softReconnectCount + 1) + '次)');
                return true;
            }
        } catch(e) {
            console.warn(TAG, '引擎软重连失败:', e.message);
        }
        return false;
    }

    // ── 软重连流程（统一入口，带引擎状态判定 + 冷却防抖）──
    function trySoftReconnect(reason) {
        var st = getEngineState();
        if (st === 2) { connected = true; return; }  // 引擎已连接，无需干预
        if (st === 3) return;                         // 引擎正在自愈重连，不干预
        if (!wasConnectedOnce) return;                // 从未连接成功过，交给游戏自身流程
        if (reconnectTimer) return;                   // 已有排队的软重连

        // 冷却防抖：短时间内不重复触发
        var now = Date.now();
        if (now - lastReconnectAttemptAt < RECONNECT_COOLDOWN) return;
        lastReconnectAttemptAt = now;

        softReconnectCount++;
        reconnectCount++;
        console.log(TAG, '🔄 [' + reason + '] 页面内自动重连 第' + softReconnectCount + '/' + MAX_SOFT_RECONNECT + '次');
        updateIndicator('reconnecting');
        notifyParent('ws_reconnecting', { count: reconnectCount });

        if (softReconnectCount > MAX_SOFT_RECONNECT) {
            console.warn(TAG, '页面内重连已达上限，转为刷新页面');
            updateIndicator('failed');
            notifyParent('ws_reconnect_failed', { count: reconnectCount });
            requestPageRefresh();
            return;
        }

        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            var ok = engineSoftReconnect();
            if (!ok) {
                // 引擎恢复不可用 → 关闭旧连接让引擎 onclose 触发其自动重连；无连接则刷新兜底
                try {
                    if (gameWs && gameWs.readyState === WebSocket.OPEN) {
                        gameWs.close(4000, 'auto-reconnect');
                        console.log(TAG, '已关闭旧连接以触发引擎重连');
                    } else {
                        requestPageRefresh();
                    }
                } catch(e) {
                    requestPageRefresh();
                }
            }
        }, RECONNECT_DELAY);
    }

    // ══════════════════════════════════════════
    //  2. 引擎连接状态轮询（辅助检测：引擎 Error/Idle 卡死时接管）
    // ══════════════════════════════════════════
    function startStateMonitor() {
        stopStateMonitor();
        stateTimer = setInterval(function() {
            var st = getEngineState();
            if (st === -1) {
                // 引擎状态不可用：仅当 WS 已断开且非冷却期时触发软重连
                if (!connected && wasConnectedOnce && !reconnectTimer) trySoftReconnect('引擎状态未知');
                return;
            }
            if (st === lastEngineState) {
                // 状态未变：Error 状态持续卡死时继续软重连（引擎不恢复则外部干预）
                if (st === 4 && wasConnectedOnce && !reconnectTimer) trySoftReconnect('引擎Error卡死');
                return;
            }
            lastEngineState = st;
            console.log(TAG, '引擎连接状态 →', STATE_NAMES[st] || ('未知' + st));

            switch(st) {
                case 2: // Running
                    wasConnectedOnce = true;
                    connected = true;
                    softReconnectCount = 0;
                    reconnectCount = 0;
                    lastMessageAt = Date.now();
                    updateIndicator('connected');
                    notifyParent('ws_connected', {});
                    startHealthCheck();
                    break;
                case 3: // Reconnecting（引擎自己在重连，不干预）
                    connected = false;
                    updateIndicator('reconnecting');
                    break;
                case 4: // Error（引擎已放弃，脚本接管）
                    connected = false;
                    updateIndicator('disconnected');
                    notifyParent('ws_disconnected', { code: -1, reason: 'engine-error' });
                    stopHealthCheck();
                    if (wasConnectedOnce) trySoftReconnect('引擎连接错误');
                    break;
                case 0: // Idle
                    connected = false;
                    if (wasConnectedOnce && !reconnectTimer) trySoftReconnect('引擎空闲');
                    break;
            }
        }, STATE_POLL_INTERVAL);
    }

    // ══════════════════════════════════════════
    //  3. 保活检测（对应引擎 heartbeatTimeout 判定）
    // ══════════════════════════════════════════
    function startHealthCheck() {
        stopHealthCheck();
        healthTimer = setInterval(function() {
            var st = getEngineState();
            if (st !== 2 && !(st === -1 && connected)) return;
            var idle = Date.now() - lastMessageAt;
            if (idle > IDLE_THRESHOLD) {
                console.log(TAG, '⚠️ ' + Math.round(idle / 1000) + '秒无消息，连接疑似挂起，触发引擎重连');
                try {
                    if (engineWs && typeof engineWs.interrupt === 'function') {
                        engineWs.interrupt(); // 引擎自动进入 Reconnecting 重连
                    } else if (gameWs && gameWs.readyState === WebSocket.OPEN) {
                        gameWs.close(4000, 'idle-probe'); // 触发引擎 onclose → 自动重连
                    }
                } catch(e) {}
                lastMessageAt = Date.now();
            }
            notifyParent('ws_health', {
                connected: connected,
                readyState: st,
                idleSeconds: Math.round(idle / 1000),
                reconnectCount: reconnectCount
            });
        }, HEALTH_INTERVAL);
    }

    function stopHealthCheck() {
        if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
    }
    function stopStateMonitor() {
        if (stateTimer) { clearInterval(stateTimer); stateTimer = null; }
    }

    // ══════════════════════════════════════════
    //  4. Hook WebSocket（主触发源：记录连接 + 消息活性 + 断线感知）
    // ══════════════════════════════════════════
    var _OrigWS = window.WebSocket;
    if (_OrigWS && !_OrigWS.__auto_reconnect_hooked) {
        function WrappedWebSocket(url, protocols) {
            var ws = protocols ? new _OrigWS(url, protocols) : new _OrigWS(url);

            if (typeof url === 'string' && GAME_WS_RE.test(url)) {
                gameWs = ws;
                wsUrl = url;
                connected = false;
                lastMessageAt = Date.now();

                ws.addEventListener('open', function() {
                    connected = true;
                    lastMessageAt = Date.now();
                });
                ws.addEventListener('message', function() {
                    lastMessageAt = Date.now();
                });
                ws.addEventListener('close', function(e) {
                    connected = false;
                    lastMessageAt = 0;
                    console.log(TAG, '❌ 连接断开 code=' + e.code + ' reason=' + (e.reason || '无'));
                    updateIndicator('disconnected');
                    notifyParent('ws_disconnected', { code: e.code, reason: e.reason });
                    // 统一交给 trySoftReconnect 判定（引擎自愈中则不干预，冷却防抖）
                    trySoftReconnect('连接断开');
                });
                ws.addEventListener('error', function(e) {
                    console.warn(TAG, '⚠️ 连接错误:', e && (e.message || e.type));
                    notifyParent('ws_error', { error: e && (e.message || e.type) });
                });
            }

            return ws;
        }
        WrappedWebSocket.prototype = _OrigWS.prototype;
        WrappedWebSocket.CONNECTING = _OrigWS.CONNECTING;
        WrappedWebSocket.OPEN = _OrigWS.OPEN;
        WrappedWebSocket.CLOSING = _OrigWS.CLOSING;
        WrappedWebSocket.CLOSED = _OrigWS.CLOSED;
        WrappedWebSocket.__auto_reconnect_hooked = true;
        WrappedWebSocket.__original = _OrigWS;
        try { window.WebSocket = WrappedWebSocket; } catch(e) {}
        console.log(TAG, 'WebSocket Hook 已安装');
    }

    // ══════════════════════════════════════════
    //  5. 父窗口通信
    // ══════════════════════════════════════════
    function notifyParent(type, data) {
        if (window.parent === window) return; // 独立窗口模式
        try {
            window.parent.postMessage({
                type: 'WS_STATUS',
                wsType: type,
                tokenId: window._gameTokenId || '',
                data: data || {}
            }, '*');
        } catch(e) {}
    }

    window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'WS_HEALTH_PING') {
            notifyParent('ws_health_pong', {
                connected: connected,
                readyState: getEngineState(),
                lastMessageAt: lastMessageAt,
                reconnectCount: reconnectCount
            });
            return;
        }
        if (e.data.type === 'WS_FORCE_REFRESH') {
            console.log(TAG, '收到父窗口强制刷新指令');
            window.location.reload();
            return;
        }
    });

    // ── 兜底：刷新页面（通知父窗口执行 refreshSingle）──
    function requestPageRefresh() {
        notifyParent('ws_request_refresh', { count: reconnectCount });
    }

    // ══════════════════════════════════════════
    //  6. 连接状态指示器
    // ══════════════════════════════════════════
    var indicator = null;
    var indicatorText = null;

    function createIndicator() {
        if (indicator) return;
        indicator = document.createElement('div');
        indicator.id = '__ws_indicator';
        indicator.style.cssText = 'position:fixed;top:4px;right:4px;z-index:99999;font-size:10px;' +
            'padding:2px 6px;border-radius:4px;color:#fff;pointer-events:none;opacity:0.7;' +
            'font-family:monospace;transition:all 0.3s;';
        indicatorText = document.createElement('span');
        indicator.appendChild(indicatorText);
        document.body.appendChild(indicator);
    }

    function updateIndicator(state) {
        if (!indicator) {
            try { createIndicator(); } catch(e) { return; }
        }
        if (!indicator) return;

        switch(state) {
            case 'connected':
                indicator.style.background = 'rgba(74,222,128,0.3)';
                indicator.style.color = '#4ade80';
                indicatorText.textContent = '● 已连接';
                setTimeout(function() { if(indicator) indicator.style.opacity = '0.3'; }, 3000);
                break;
            case 'disconnected':
                indicator.style.background = 'rgba(255,77,79,0.4)';
                indicator.style.color = '#ff4d4f';
                indicator.style.opacity = '1';
                indicatorText.textContent = '● 已断开';
                break;
            case 'reconnecting':
                indicator.style.background = 'rgba(250,173,19,0.4)';
                indicator.style.color = '#faad13';
                indicator.style.opacity = '1';
                indicatorText.textContent = '◌ 重连中...';
                break;
            case 'failed':
                indicator.style.background = 'rgba(255,77,79,0.6)';
                indicator.style.color = '#ff4d4f';
                indicator.style.opacity = '1';
                indicatorText.textContent = '✕ 重连失败';
                break;
        }
    }

    // ══════════════════════════════════════════
    //  7. 兜底：从全局对象扫描已有 WS
    // ══════════════════════════════════════════
    function scanExistingWs() {
        var w = window;
        var candidates = [
            w.ws, w.h5websocket && w.h5websocket.ws, w.h5websocket,
            w.gameWs, w.WebSocketClient && w.WebSocketClient.ws, w.WebSocketClient
        ];
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            if (!c) continue;
            var raw = c._ws || c.socket || c;
            if (raw && raw.url && GAME_WS_RE.test(raw.url) && raw.readyState === 1) {
                gameWs = raw;
                wsUrl = raw.url;
                connected = true;
                wasConnectedOnce = true;
                lastMessageAt = Date.now();
                console.log(TAG, '兜底扫描到已有连接:', wsUrl);
                updateIndicator('connected');
                startHealthCheck();
                return;
            }
        }
    }

    setTimeout(scanExistingWs, 5000);
    setTimeout(scanExistingWs, 15000);

    // ══════════════════════════════════════════
    //  8. 启动
    // ══════════════════════════════════════════
    startStateMonitor();
    window.addEventListener('beforeunload', function() {
        stopHealthCheck();
        stopStateMonitor();
    });

    console.log(TAG, '已就绪 (页面内重连上限' + MAX_SOFT_RECONNECT + '次, 冷却' + (RECONNECT_COOLDOWN/1000) + 's, 超限转刷新页面)');
})();
