// ==UserScript==
// @name         断线重连 + 保活
// @description  监控游戏WebSocket连接状态，断线自动重连(刷新iframe)，防止长时间挂机断线
// @version      1.0.0
// ==/UserScript==
;(function() {
    'use strict';

    var TAG = '[断线重连]';
    var GAME_WS_RE = /hortorgames\.com\/agent/i;

    // ── 状态 ──
    var gameWs = null;           // 当前游戏主线WS
    var wsUrl = null;            // 连接URL(用于重连参考)
    var connected = false;       // 当前是否已连接
    var disconnectedAt = 0;      // 断线时间戳
    var reconnectTimer = null;   // 自动重连定时器
    var healthTimer = null;      // 保活定时器
    var lastMessageAt = 0;       // 最后收到消息时间
    var reconnectCount = 0;      // 重连次数
    var MAX_AUTO_RECONNECT = 3;  // 最大自动重连次数
    var RECONNECT_DELAY = 8000;  // 断线后等待8秒再重连
    var HEALTH_INTERVAL = 30000; // 30秒保活检查
    var IDLE_THRESHOLD = 120000; // 120秒无消息视为可疑

    // ── 1. Hook WebSocket ──
    var _OrigWS = window.WebSocket;
    if (!_OrigWS || _OrigWS.__reconnect_hooked) {
        console.log(TAG, '已安装过，跳过');
        return;
    }

    function WrappedWebSocket(url, protocols) {
        var ws = protocols ? new _OrigWS(url, protocols) : new _OrigWS(url);

        if (typeof url === 'string' && GAME_WS_RE.test(url)) {
            gameWs = ws;
            wsUrl = url;
            connected = false;
            lastMessageAt = Date.now();

            ws.addEventListener('open', function() {
                connected = true;
                disconnectedAt = 0;
                lastMessageAt = Date.now();
                reconnectCount = 0;
                console.log(TAG, '✅ 游戏连接已建立');
                updateIndicator('connected');
                notifyParent('ws_connected', {});
                startHealthCheck();
            });

            ws.addEventListener('message', function() {
                lastMessageAt = Date.now();
            });

            ws.addEventListener('close', function(e) {
                connected = false;
                disconnectedAt = Date.now();
                console.log(TAG, '❌ 连接断开 code=' + e.code + ' reason=' + (e.reason || '无'));
                updateIndicator('disconnected');
                notifyParent('ws_disconnected', { code: e.code, reason: e.reason });
                stopHealthCheck();
                scheduleReconnect();
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
    WrappedWebSocket.__reconnect_hooked = true;
    WrappedWebSocket.__original = _OrigWS;

    try { window.WebSocket = WrappedWebSocket; } catch(e) {}
    console.log(TAG, 'WebSocket Hook 已安装');

    // ── 2. 自动重连 ──
    function scheduleReconnect() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (reconnectCount >= MAX_AUTO_RECONNECT) {
            console.warn(TAG, '已达最大自动重连次数(' + MAX_AUTO_RECONNECT + ')，停止重连');
            updateIndicator('failed');
            notifyParent('ws_reconnect_failed', { count: reconnectCount });
            return;
        }

        console.log(TAG, '将在 ' + (RECONNECT_DELAY / 1000) + ' 秒后尝试重连 (第' + (reconnectCount + 1) + '次)');
        updateIndicator('reconnecting');

        reconnectTimer = setTimeout(function() {
            reconnectCount++;
            console.log(TAG, '🔄 发起重连 #' + reconnectCount + '...');
            notifyParent('ws_reconnecting', { count: reconnectCount });

            // 策略: 刷新整个页面重新登录（最可靠）
            // 通过 postMessage 通知父窗口执行 refreshSingle
            notifyParent('ws_request_refresh', { count: reconnectCount });
        }, RECONNECT_DELAY);
    }

    // ── 3. 保活检查 ──
    function startHealthCheck() {
        stopHealthCheck();
        healthTimer = setInterval(function() {
            if (!gameWs || gameWs.readyState !== WebSocket.OPEN) return;

            var idle = Date.now() - lastMessageAt;
            if (idle > IDLE_THRESHOLD) {
                console.log(TAG, '⚠️ ' + Math.round(idle / 1000) + '秒无消息，连接可能已断开');
                // 尝试发送一个极小的二进制帧作为探测(0字节)
                // 如果连接已断开，这会触发 onerror → onclose
                try {
                    // 发送一个最小的 BON 心跳包: {cmd:"ping", seq:0}
                    // 使用简单 JSON 文本帧，不干扰 BON 二进制协议
                    gameWs.send(JSON.stringify({ cmd: 'heartbeat', seq: 0, time: Date.now() }));
                    lastMessageAt = Date.now(); // 重置计时器(发送也算活动)
                } catch(e) {
                    console.warn(TAG, '心跳发送失败:', e.message);
                    // 连接可能已断开，等 close 事件处理
                }
            }

            // 向父窗口报告状态
            notifyParent('ws_health', {
                connected: connected,
                readyState: gameWs ? gameWs.readyState : -1,
                idleSeconds: Math.round(idle / 1000),
                reconnectCount: reconnectCount
            });
        }, HEALTH_INTERVAL);
    }

    function stopHealthCheck() {
        if (healthTimer) { clearInterval(healthTimer); healthTimer = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    }

    // ── 4. 父窗口通信 ──
    function notifyParent(type, data) {
        if (window.parent === window) return; // 独立窗口模式
        try {
            window.parent.postMessage({
                type: 'WS_STATUS',
                wsType: type,
                tokenId: window._gameTokenId || '',
                data: data
            }, '*');
        } catch(e) {}
    }

    // 监听父窗口指令
    window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;

        // 父窗口健康检查 ping
        if (e.data.type === 'WS_HEALTH_PING') {
            notifyParent('ws_health_pong', {
                connected: connected,
                readyState: gameWs ? gameWs.readyState : -1,
                lastMessageAt: lastMessageAt,
                reconnectCount: reconnectCount
            });
            return;
        }

        // 父窗口指令: 立即刷新
        if (e.data.type === 'WS_FORCE_REFRESH') {
            console.log(TAG, '收到父窗口强制刷新指令');
            window.location.reload();
            return;
        }
    });

    // ── 5. 连接状态指示器 ──
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
                // 3秒后隐藏
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

    // ── 6. 兜底: 从全局对象扫描已有WS ──
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
                lastMessageAt = Date.now();
                console.log(TAG, '兜底扫描到已有连接:', wsUrl);
                updateIndicator('connected');
                startHealthCheck();
                return;
            }
        }
    }

    // 延迟扫描（等游戏WS建立）
    setTimeout(scanExistingWs, 5000);
    setTimeout(scanExistingWs, 15000);

    // ── 7. 页面卸载清理 ──
    window.addEventListener('beforeunload', function() {
        stopHealthCheck();
    });

    console.log(TAG, '已就绪 (最大重连' + MAX_AUTO_RECONNECT + '次, 保活间隔' + (HEALTH_INTERVAL/1000) + 's)');
})();
