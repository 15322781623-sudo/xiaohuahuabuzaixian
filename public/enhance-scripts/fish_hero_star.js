// ==UserScript==
// @name         咸鱼之王 - 升星助手 & 鱼灵升星
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  一键武将升星、一键图鉴升级、领取图鉴奖励、一键鱼灵升星
// @author       CC助手提取版
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    if (typeof unsafeWindow === 'undefined') {
        var unsafeWindow = window;
    }

    const config = {
        ui: {
            zIndex: 99999,
            baseWidth: 280,
        },
        position: {
            toggleBtn: { top: 100, right: 15 },
            panel: { top: 150, right: 15 }
        }
    };

    // ========== 辅助函数 ==========
    function showTip(text, type = 'info') {
        document.querySelectorAll('.star-tip').forEach(t => t.remove());
        const tip = document.createElement('div');
        tip.className = 'star-tip';
        tip.textContent = text;
        let bg = '#5b83b8';
        if (type === 'success') bg = '#10b981';
        if (type === 'error') bg = '#ef4444';
        if (type === 'warning') bg = '#f59e0b';
        tip.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: ${bg}; color: white; padding: 8px 16px; border-radius: 12px;
            font-size: 12px; z-index: ${config.ui.zIndex + 1}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            white-space: nowrap; opacity: 0; transition: opacity 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        document.body.appendChild(tip);
        requestAnimationFrame(() => { tip.style.opacity = '1'; });
        setTimeout(() => { tip.style.opacity = '0'; setTimeout(() => tip.remove(), 300); }, 2500);
        try {
            var win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
            if (win.__require) {
                var TipsManager = win.__require('TipsManager');
                if (TipsManager && TipsManager.SHOW_TIP) TipsManager.SHOW_TIP(text);
            }
        } catch(e) {}
    }

    const showToast = (() => {
        let toastElement = null;
        return (message, type = "info", duration = 2000) => {
            if (!toastElement) {
                toastElement = document.createElement("div");
                toastElement.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9);
                    padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 500;
                    color: white; z-index: 999999; pointer-events: none; opacity: 0; transition: all 0.3s ease;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                document.body.appendChild(toastElement);
            }
            const bgMap = { info: '#5b83b8', success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
            toastElement.textContent = message;
            toastElement.style.background = bgMap[type] || bgMap.info;
            toastElement.style.opacity = '1';
            toastElement.style.transform = 'translate(-50%, -50%) scale(1)';
            setTimeout(() => {
                toastElement.style.opacity = '0';
                toastElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
            }, duration);
            try {
                var win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
                if (win.__require) {
                    var TipsManager = win.__require('TipsManager');
                    if (TipsManager && TipsManager.SHOW_TIP) TipsManager.SHOW_TIP(message);
                }
            } catch(e) {}
        };
    })();

    function logMessage(content, type = 'info') {
        const logContainer = document.getElementById('starLogContainer');
        if (!logContainer) return;
        const logItem = document.createElement('div');
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        logItem.textContent = `[${time}] ${content}`;
        let color = '#1E293B';
        if (type === 'success') color = '#10b981';
        if (type === 'error') color = '#ef4444';
        if (type === 'warning') color = '#f59e0b';
        logItem.style.cssText = `margin: 2px 0; padding: 2px 4px; border-radius: 4px; color: ${color}; font-size: 10px; line-height: 1.3; word-wrap: break-word;`;
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function createButton(text, onClick, isPrimary = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 5px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3);
            font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ${isPrimary ? `background: linear-gradient(135deg, #5b83b8, #ffd4ea); color: white; box-shadow: 0 4px 12px rgba(91, 131, 184, 0.25);` : `background: rgba(255,255,255,0.12); color: #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.04); border:1px solid rgba(255,255,255,0.3);`}
        `;
        btn.addEventListener('mouseover', () => { btn.style.transform = 'translateY(-1px)'; if (isPrimary) btn.style.boxShadow = '0 6px 16px rgba(91, 131, 184, 0.35)'; else btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; });
        btn.addEventListener('mouseout', () => { btn.style.transform = 'translateY(0)'; if (isPrimary) btn.style.boxShadow = '0 4px 12px rgba(91, 131, 184, 0.25)'; else btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'; });
        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
        return btn;
    }

    function createCollapsibleSection(title, contentBuilder, defaultExpanded = false) {
        const section = document.createElement('div');
        section.style.cssText = `width:100%;margin-bottom:4px;border-radius:14px;overflow:hidden;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.05),inset 0 1px 0 rgba(255,255,255,0.15);`;
        const header = document.createElement('div');
        header.style.cssText = `display:flex;align-items:center;justify-content:center;gap:4px;padding:5px 8px;background:rgba(255,255,255,0.03);cursor:pointer;user-select:none;position:relative;border-bottom:1px solid rgba(255,255,255,0.12);`;
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleSpan.style.cssText = `font-size:11px;font-weight:700;color:#4338ca;letter-spacing:0.5px;`;
        header.appendChild(titleSpan);
        const arrow = document.createElement('span');
        arrow.textContent = '▼';
        arrow.style.cssText = `font-size:8px;color:#4338ca;transition:transform 0.15s ease;display:inline-block;`;
        header.appendChild(arrow);
        const body = document.createElement('div');
        body.style.cssText = 'padding:6px 8px;display:' + (defaultExpanded ? 'block' : 'none') + ';background:rgba(255,255,255,0.03);';
        contentBuilder(body);
        let isCollapsed = !defaultExpanded;
        header.addEventListener('click', () => {
            isCollapsed = !isCollapsed;
            body.style.display = isCollapsed ? 'none' : 'block';
            arrow.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
        });
        section.appendChild(header);
        section.appendChild(body);
        return section;
    }

    const findGameWebSocket = () => {
        const candidates = [
            window.ws,
            window.h5websocket && window.h5websocket.ws,
            window.h5websocket,
            window.gameWs,
            window.WebSocketClient,
            window._ws,
            window.gameSocket
        ];
        for (const ws of candidates) {
            if (ws && (ws.sendAsync || ws.send)) return ws;
        }
        return null;
    };

    const sendGameCommand = async (cmd, params = {}, skipBon = false, customAck = undefined) => {
        const ws = findGameWebSocket();
        if (!ws) {
            showToast("游戏连接失败，请刷新页面重试", "error");
            throw new Error("游戏WebSocket未连接");
        }
        const requestData = {
            ack: customAck !== undefined ? customAck : 0,
            cmd: cmd,
            params: params,
            seq: Date.now(),
            time: Date.now()
        };
        if (!skipBon && window.g_utils && window.g_utils.bon && window.g_utils.bon.encode) {
            requestData.body = window.g_utils.bon.encode(params);
            delete requestData.params;
        }
        try {
            if (ws.sendAsync) {
                const response = await ws.sendAsync(requestData);
                const rawData = (response && response._rawData) || (response && response.getData && response.getData()) || (response && response.body) || response;
                if (rawData && typeof rawData === 'object') {
                    if (response && response.code !== undefined) {
                        rawData._code = response.code;
                    } else if (rawData.code !== undefined) {
                        rawData._code = rawData.code;
                    } else if (rawData.success === false || rawData.error) {
                        // 无状态码但带失败标记的响应，统一标记为失败，避免上层盲发
                        rawData._code = -1;
                    }
                }
                return rawData;
            } else if (ws.send) {
                ws.send(JSON.stringify(requestData));
                return { success: true, message: "命令已发送" };
            }
        } catch (error) {
            console.error("[升星助手] 发送命令失败:", error);
            throw error;
        }
        throw new Error("WebSocket不支持发送消息");
    };

    // ========== 构建 UI ==========
    let _panelBuilt = false;
    let _panelVisible = false;
    let mainPanel = null;

    function buildPanel() {
        if (_panelBuilt) return;
        _panelBuilt = true;

        const panel = document.createElement('div');
        panel.id = 'starHelperPanel';
        panel.style.cssText = `
            position: fixed; top: ${config.position.panel.top}px; right: ${config.position.panel.right}px;
            width: ${config.ui.baseWidth}px; max-height: 80vh; overflow-y: auto;
            background: rgba(235, 240, 255, 0.92); backdrop-filter: blur(16px) saturate(160%);
            border-radius: 16px; border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: ${config.ui.zIndex};
            padding: 12px; display: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        // 标题
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
        const title = document.createElement('h3');
        title.textContent = '升星助手 v1.0';
        title.style.cssText = 'margin:0;color:#312e81;font-size:14px;font-weight:700;';
        header.appendChild(title);
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'cursor:pointer;font-size:16px;color:#94A3B8;padding:2px 6px;border-radius:6px;user-select:none;';
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#ef4444'; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#94A3B8'; });
        closeBtn.addEventListener('click', () => { panel.style.display = 'none'; _panelVisible = false; });
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

        // ===== 升星助手 =====
        const starCollapse = createCollapsibleSection('升星助手', (body) => {
            const starDelayRow = document.createElement('div');
            starDelayRow.style.cssText = `display:flex;gap:4px;margin-bottom:6px;align-items:center;`;
            const starDelayLabel = document.createElement('span');
            starDelayLabel.textContent = '延迟(ms):';
            starDelayLabel.style.cssText = `font-size:10px;color:#64748B;white-space:nowrap;`;
            const starDelayInput = document.createElement('input');
            starDelayInput.type = 'number'; starDelayInput.value = '300';
            starDelayInput.style.cssText = `flex:1;padding:4px 6px;border-radius:4px;border:1px solid #E2E8F0;background:#FFFFFF;color:#0f172a;font-size:10px;`;
            starDelayRow.appendChild(starDelayLabel); starDelayRow.appendChild(starDelayInput);
            body.appendChild(starDelayRow);

            const starProgressBar = document.createElement('div');
            starProgressBar.style.cssText = `width:100%;height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden;margin-bottom:4px;`;
            const starProgressFill = document.createElement('div');
            starProgressFill.style.cssText = `height:100%;width:0%;background:#10b981;border-radius:3px;transition:width 0.3s ease;`;
            starProgressBar.appendChild(starProgressFill); body.appendChild(starProgressBar);
            const starProgressText = document.createElement('div');
            starProgressText.style.cssText = `font-size:10px;color:#64748B;margin-bottom:6px;text-align:center;min-height:14px;`;
            body.appendChild(starProgressText);

            const starBtnRow1 = document.createElement('div');
            starBtnRow1.style.cssText = `display:flex;gap:4px;margin-bottom:4px;`;
            const starStopFlag = { value: false };

            const starUpgradeBtn = createButton('一键升星', async () => {
                const delay = parseInt(starDelayInput.value) || 300;
                starUpgradeBtn.disabled = true; starBookBtn.disabled = true; starClaimBtn.disabled = true; starStopBtn.disabled = false;
                starStopFlag.value = false;
                const heroIds = [];
                for (let i = 101; i <= 120; i++) heroIds.push(i);
                for (let i = 201; i <= 228; i++) heroIds.push(i);
                for (let i = 301; i <= 314; i++) heroIds.push(i);
                const totalOps = heroIds.length * 10;
                let currentOp = 0;
                const updateProgress = () => {
                    currentOp++;
                    starProgressFill.style.width = Math.min(100, Math.round((currentOp / totalOps) * 100)) + '%';
                    starProgressText.textContent = `升星: ${currentOp}/${totalOps}`;
                };
                try {
                    for (const hid of heroIds) {
                        if (starStopFlag.value) break;
                        for (let s = 0; s < 10; s++) {
                            if (starStopFlag.value) break;
                            try {
                                const res = await sendGameCommand('hero_heroupgradestar', { heroId: hid });
                                if (res && res._code !== undefined && res._code !== 0) break;
                                updateProgress();
                                await new Promise(r => setTimeout(r, delay));
                            } catch (e) { break; }
                        }
                    }
                    if (starStopFlag.value) { logMessage('一键升星已停止', 'warning'); showTip('已停止', 'warning'); }
                    else { logMessage('一键升星完成!', 'success'); showTip('升星完成!', 'success'); }
                } catch (e) { logMessage(`一键升星异常: ${e.message}`, 'error'); showTip('升星出错', 'error'); }
                starUpgradeBtn.disabled = false; starBookBtn.disabled = false; starClaimBtn.disabled = false; starStopBtn.disabled = true;
            }, true);
            starUpgradeBtn.style.flex = '1';

            const starBookBtn = createButton('一键图鉴升级', async () => {
                const delay = parseInt(starDelayInput.value) || 300;
                starUpgradeBtn.disabled = true; starBookBtn.disabled = true; starClaimBtn.disabled = true; starStopBtn.disabled = false;
                starStopFlag.value = false;
                const heroIds = [];
                for (let i = 101; i <= 120; i++) heroIds.push(i);
                for (let i = 201; i <= 228; i++) heroIds.push(i);
                for (let i = 301; i <= 314; i++) heroIds.push(i);
                const totalOps = heroIds.length; let currentOp = 0;
                const updateProgress = () => {
                    currentOp++;
                    starProgressFill.style.width = Math.min(100, Math.round((currentOp / totalOps) * 100)) + '%';
                    starProgressText.textContent = `图鉴升级: ${currentOp}/${totalOps}`;
                };
                try {
                    for (const hid of heroIds) {
                        if (starStopFlag.value) break;
                        for (let s = 0; s < 10; s++) {
                            if (starStopFlag.value) break;
                            try {
                                const res = await sendGameCommand('book_upgrade', { heroId: hid });
                                if (res && res._code !== undefined && res._code !== 0) break;
                                updateProgress();
                                await new Promise(r => setTimeout(r, delay));
                            } catch (e) { break; }
                        }
                    }
                    if (starStopFlag.value) { logMessage('一键图鉴升级已停止', 'warning'); showTip('已停止', 'warning'); }
                    else { logMessage('一键图鉴升级完成!', 'success'); showTip('图鉴升级完成!', 'success'); }
                } catch (e) { logMessage(`一键图鉴升级异常: ${e.message}`, 'error'); showTip('图鉴升级出错', 'error'); }
                starUpgradeBtn.disabled = false; starBookBtn.disabled = false; starClaimBtn.disabled = false; starStopBtn.disabled = true;
            }, true);
            starBookBtn.style.flex = '1';

            const starClaimBtn = createButton('领取图鉴奖励', async () => {
                starClaimBtn.disabled = true;
                try {
                    for (let i = 1; i <= 10; i++) {
                        try {
                            const res = await sendGameCommand('book_claimpointreward', {});
                            if (res && res._code !== undefined && res._code !== 0) break;
                        } catch (e) { break; }
                        await new Promise(r => setTimeout(r, 200));
                    }
                    logMessage('图鉴奖励已领取', 'success'); showTip('奖励已领取!', 'success');
                } catch (e) { logMessage(`领取图鉴奖励失败: ${e.message}`, 'error'); showTip('领取失败', 'error'); }
                starClaimBtn.disabled = false;
            }, true);
            starClaimBtn.style.flex = '1';

            starBtnRow1.appendChild(starUpgradeBtn); starBtnRow1.appendChild(starBookBtn); starBtnRow1.appendChild(starClaimBtn);
            body.appendChild(starBtnRow1);

            const starStopBtn = createButton('停止', () => { starStopFlag.value = true; }, false);
            starStopBtn.style.cssText += `width:100%;background:#ef4444;border-radius:10px;color:#FFFFFF;border:none;`;
            starStopBtn.disabled = true;
            body.appendChild(starStopBtn);
        }, false);
        container.appendChild(starCollapse);

        // ===== 鱼灵升星 =====
        const fishStarCollapse = createCollapsibleSection('鱼灵升星', (body) => {
            const fishStarDesc = document.createElement('div');
            fishStarDesc.style.cssText = `background:rgba(91,131,184,0.08);padding:3px 6px;border-radius:6px;margin-bottom:4px;font-size:9px;color:#64748B;line-height:1.3;`;
            fishStarDesc.textContent = '选择品质后一键升星5遍';
            body.appendChild(fishStarDesc);

            const fishSelectRow = document.createElement('div');
            fishSelectRow.style.cssText = `display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;`;
            const fishTypes = [
                { id: 'blue', name: '蓝鱼', color: '#3b82f6', ids: [1601, 1602, 1603, 1604] },
                { id: 'purple', name: '紫鱼', color: '#8b5cf6', ids: [1501, 1502, 1503, 1504, 1505, 1506] },
                { id: 'orange', name: '橙鱼', color: '#f97316', ids: [1401, 1402, 1403, 1405, 1406, 1407, 1408, 1409, 1410, 1411, 1412] },
                { id: 'red', name: '红鱼', color: '#ef4444', ids: [1301, 1302, 1303, 1304, 1305] },
                { id: 'gold', name: '金鱼', color: '#eab308', ids: [1101,1102,1103,1104,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,1117,1118,1119,1120,1121,1122,1123] },
                { id: 'dragon', name: '龙鱼', color: '#ec4899', ids: [1201,1202,1203,1204,1205,1206,1207,1208,1209,1210,1211,1212,1213,1214,1215,1216,1217,1218,1219,1220,1221] }
            ];
            const fishCheckboxes = {};
            fishTypes.forEach(type => {
                const label = document.createElement('label');
                label.style.cssText = `display:flex;align-items:center;gap:2px;font-size:9px;color:${type.color};cursor:pointer;padding:2px 4px;background:rgba(0,0,0,0.03);border-radius:4px;`;
                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.checked = true;
                fishCheckboxes[type.id] = cb;
                label.appendChild(cb);
                label.appendChild(document.createTextNode(type.name));
                fishSelectRow.appendChild(label);
            });
            body.appendChild(fishSelectRow);

            const fishDelayRow = document.createElement('div');
            fishDelayRow.style.cssText = `display:flex;gap:4px;margin-bottom:6px;align-items:center;`;
            const fishDelayLabel = document.createElement('span');
            fishDelayLabel.textContent = '延迟(ms):';
            fishDelayLabel.style.cssText = `font-size:10px;color:#64748B;white-space:nowrap;`;
            const fishDelayInput = document.createElement('input');
            fishDelayInput.type = 'number'; fishDelayInput.value = '300';
            fishDelayInput.style.cssText = `flex:1;padding:4px 6px;border-radius:4px;border:1px solid #E2E8F0;background:#FFFFFF;color:#0f172a;font-size:10px;`;
            fishDelayRow.appendChild(fishDelayLabel); fishDelayRow.appendChild(fishDelayInput);
            body.appendChild(fishDelayRow);

            const fishProgressBar = document.createElement('div');
            fishProgressBar.style.cssText = `width:100%;height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden;margin-bottom:4px;`;
            const fishProgressFill = document.createElement('div');
            fishProgressFill.style.cssText = `height:100%;width:0%;background:#f59e0b;border-radius:3px;transition:width 0.3s ease;`;
            fishProgressBar.appendChild(fishProgressFill); body.appendChild(fishProgressBar);
            const fishProgressText = document.createElement('div');
            fishProgressText.style.cssText = `font-size:10px;color:#64748B;margin-bottom:6px;text-align:center;min-height:14px;`;
            body.appendChild(fishProgressText);

            const fishStopFlag = { value: false };
            const fishBtnRow = document.createElement('div');
            fishBtnRow.style.cssText = `display:flex;gap:4px;`;

            const fishUpgradeBtn = createButton('一键鱼灵升星', async () => {
                const delay = parseInt(fishDelayInput.value) || 300;
                const fishIds = [];
                fishTypes.forEach(type => { if (fishCheckboxes[type.id].checked) fishIds.push(...type.ids); });
                if (fishIds.length === 0) { showTip('请至少选择一种品质', 'error'); return; }
                fishUpgradeBtn.disabled = true; fishStopBtn.disabled = false; fishStopFlag.value = false;
                const totalOps = fishIds.length * 5; let currentOp = 0;
                const updateProgress = () => {
                    currentOp++;
                    fishProgressFill.style.width = Math.min(100, Math.round((currentOp / totalOps) * 100)) + '%';
                    fishProgressText.textContent = `鱼灵升星: ${currentOp}/${totalOps}`;
                };
                try {
                    for (const fishId of fishIds) {
                        if (fishStopFlag.value) break;
                        for (let star = 1; star <= 5; star++) {
                            if (fishStopFlag.value) break;
                            try {
                                const itemId = parseInt(fishId + '' + star);
                                const res = await sendGameCommand('artifact_upgradestar', { heroId: -1, itemId: itemId });
                                if (res && res._code !== undefined && res._code !== 0) {
                                    logMessage(`鱼灵 ${itemId} 升星失败${res.message ? ': ' + res.message : ''}，已跳过该鱼`, 'error');
                                    break;
                                }
                                updateProgress();
                                await new Promise(r => setTimeout(r, delay));
                            } catch (e) {
                                logMessage(`鱼灵 ${itemId} 升星异常: ${e.message}`, 'error');
                                break;
                            }
                        }
                    }
                    if (fishStopFlag.value) { logMessage('鱼灵升星已停止', 'warning'); showTip('已停止', 'warning'); }
                    else { logMessage('鱼灵升星完成!', 'success'); showTip('升星完成!', 'success'); }
                } catch (e) { logMessage(`鱼灵升星异常: ${e.message}`, 'error'); showTip('升星出错', 'error'); }
                fishUpgradeBtn.disabled = false; fishStopBtn.disabled = true;
                fishProgressFill.style.width = '0%'; fishProgressText.textContent = '';
            }, true);
            fishUpgradeBtn.style.flex = '1';
            fishBtnRow.appendChild(fishUpgradeBtn);

            const fishStopBtn = createButton('停止', () => { fishStopFlag.value = true; }, false);
            fishStopBtn.style.cssText += `flex:1;background:#ef4444;border-radius:10px;color:#FFFFFF;border:none;`;
            fishStopBtn.disabled = true;
            fishBtnRow.appendChild(fishStopBtn);
            body.appendChild(fishBtnRow);
        }, false);
        container.appendChild(fishStarCollapse);

        panel.appendChild(container);

        // 日志区域
        const logTitle = document.createElement('div');
        logTitle.textContent = '操作日志';
        logTitle.style.cssText = 'font-size:10px;color:#64748B;margin-top:8px;margin-bottom:4px;font-weight:600;';
        panel.appendChild(logTitle);
        const logContainer = document.createElement('div');
        logContainer.id = 'starLogContainer';
        logContainer.style.cssText = `
            max-height: 120px; overflow-y: auto; background: rgba(255,255,255,0.5);
            border-radius: 8px; padding: 4px 6px; border: 1px solid #E2E8F0;
            font-family: 'SF Mono', 'Consolas', monospace;
        `;
        panel.appendChild(logContainer);

        document.body.appendChild(panel);
        mainPanel = panel;
    }

    // ========== 悬浮按钮 ==========
    function createToggleBtn() {
        const btn = document.createElement('div');
        btn.id = 'starHelperToggleBtn';
        btn.style.cssText = `
            position: fixed; top: ${config.position.toggleBtn.top}px; right: ${config.position.toggleBtn.right}px;
            width: 44px; height: 44px; border-radius: 12px; cursor: pointer; z-index: ${config.ui.zIndex};
            background: linear-gradient(135deg, #5b83b8, #ffd4ea);
            box-shadow: 0 4px 12px rgba(91,131,184,0.3);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s ease;
        `;
        btn.innerHTML = '<span style="font-size:18px;color:white;font-weight:bold;">⭐</span>';
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.1)'; });
        btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
        btn.addEventListener('click', () => {
            if (!mainPanel) buildPanel();
            _panelVisible = !_panelVisible;
            mainPanel.style.display = _panelVisible ? 'block' : 'none';
        });
        document.body.appendChild(btn);
    }

    // ========== 初始化 ==========
    function waitForGameReady() {
        return typeof window.__require === 'function' && !!document.body;
    }

    function init() {
        if (!waitForGameReady()) {
            setTimeout(init, 1000);
            return;
        }
        createToggleBtn();
        console.log('[升星助手] 已加载');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
