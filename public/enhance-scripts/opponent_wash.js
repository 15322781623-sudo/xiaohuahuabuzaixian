// ==UserScript==
// @name         对手洗练（自动查询+历史记录）
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  自动拦截roleId并查询洗练，支持历史记录标签页，保留原有核心UI
// @author       助手
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 状态管理（新增角色名称关联、标签页状态）
    const state = {
        // 原状态保留
        seq: 1,
        isWaitingForResponse: false,
        battleData: null,
        position: { x: 10, y: 10 },
        isCollapsed: true,
        originalSendAsync: null,
        isMonitoring: true,
        hasUnreadData: false,
        // RoleID拦截相关状态（无UI，仅逻辑）
        interceptedRoleId: null,
        interceptedRoleName: null, // 新增：拦截到的角色名称
        roleIdHistory: [], // 格式：{roleId, roleName, time, source}
        isRoleIdMonitoring: true, // 监控开关（默认开启）
        interceptCount: 0,
        // 标签页状态
        activeTab: 'wash', // wash=查询洗炼，history=历史查询
        // 虚拟滚动相关
        visibleStart: 0,
        visibleCount: 5,
        itemHeight: 40 // 每个历史记录项的高度（像素）
    };

    // 唯一前缀（避免样式冲突）
    const PREFIX = 'opponent-wash-';

    // 英雄ID对照表
    const heroMap = {
        '101': '司马懿', '102': '郭嘉', '103': '关羽', '104': '诸葛亮', '105': '周瑜',
        '106': '太史慈', '107': '吕布', '108': '华佗', '109': '甄姬', '110': '黄月英',
        '111': '孙策', '112': '贾诩', '113': '曹仁', '114': '姜维', '115': '孙坚',
        '116': '公孙瓒', '117': '典韦', '118': '赵云', '119': '大乔', '120': '张角',
        '201': '徐晃', '202': '荀彧', '203': '橙典韦', '204': '张飞', '205': '橙赵云',
        '206': '庞统', '207': '鲁肃', '208': '陆逊', '209': '甘宁', '210': '貂蝉',
        '211': '董卓', '212': '橙张角', '213': '张辽', '214': '夏侯惇', '215': '许诸',
        '216': '夏侯渊', '217': '魏延', '218': '黄忠', '219': '马超', '220': '马岱',
        '221': '吕蒙', '222': '黄盖', '223': '蔡文姬', '224': '小乔', '225': '袁绍',
        '226': '华雄', '227': '颜良', '228': '文丑', '301': '周泰', '302': '许攸',
        '303': '于禁', '304': '张星彩', '305': '关银屏', '306': '关平', '307': '程普',
        '308': '张昭', '309': '陆绩', '310': '吕玲绮', '311': '潘凤', '312': '邢道荣',
        '313': '祝融夫人', '314': '孟获'
    };

    // 属性对照表
    const attributeMap = {
        'attack': '攻击力', 'hp': '生命值', 'speed': '速度', '51': '破甲', '52': '破甲抵抗',
        '53': '精准', '54': '格挡', '56': '减伤', '57': '暴击', '58': '暴击抵抗',
        '59': '爆伤', '60': '爆伤抵抗', '61': '技能伤害', '62': '技能减伤', '63': '免控',
        '64': '控制命中', '65': '眩晕免疫', '66': '冰冻免疫', '67': '沉默免疫', '68': '流血免疫',
        '69': '中毒免疫', '70': '灼烧免疫', '80': '灼烧命中', '101': 'VIP增减伤', '226': '战士抵抗',
        '227': '肉盾抵抗', '228': '辅助抵抗', '229': '法师抵抗', '230': '刺客抵抗', '231': '射手抵抗',
        '301': '怒气速率', '5': '阵营光环+徽章',
        '1033007': '碎盾', '1033008': '冥想', '1033009': '定心', '1033010': '冰清',
        '1033011': '攻心', '1033012': '强权', '1033013': '盾击', '1033014': '合力',
        '1033015': '仁心', '1033016': '游龙', '1033017': '回元'
    };

    // 鱼珠属性标识
    const PEARL_ATTR_PREFIX = '1033';
    
    // 鱼灵映射表
    const fishMapping = {
        "1101": "黄金锦鲤",
        "1102": "利刃",
        "1103": "惊涛",
        "1104": "骇浪",
        "1105": "星驰",
        "1106": "同心",
        "1108": "协力♂",
        "1109": "协力♀",
        "1110": "月光",
        "1111": "铁血♂",
        "1112": "铁血♀",
        "1113": "丹心♂",
        "1114": "丹心♀",
        "1115": "巨灵",
        "1116": "剑胆♂",
        "1117": "剑胆♀",
        "1118": "璇玑"
    };

    // 支持的战斗指令
    const SUPPORTED_BATTLE_CMDS = ['fight_startpvp', 'fight_startareaarena'];
    // 要拦截的RoleID相关指令
    const ROLEID_INTERCEPT_CMDS = ['rank_getroleinfo', 'rank_get_role_info'];

    // ===== IndexedDB 配置 =====
    const DB_NAME = 'OpponentWashDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'roleIds';
    let db = null;

    // ===== IndexedDB 数据库操作 =====
    // 初始化数据库
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('[对手洗练] 数据库打开失败', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                db = request.result;
                console.log('[对手洗练] 数据库连接成功');
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                db = event.target.result;
                
                // 创建对象存储（如果不存在）
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    
                    // 创建索引
                    objectStore.createIndex('roleId', 'roleId', { unique: false });
                    objectStore.createIndex('roleName', 'roleName', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('source', 'source', { unique: false });
                    
                    console.log('[对手洗练] 数据库对象存储创建成功');
                }
            };
        });
    }

    // 保存RoleID到数据库
    async function saveRoleIdToDB(data) {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // 添加时间戳和其他必要字段
            const record = {
                ...data,
                timestamp: Date.now(),
                createTime: new Date().toLocaleString('zh-CN')
            };
            
            const request = objectStore.add(record);
            
            request.onsuccess = () => {
                console.log('[对手洗练] RoleID保存成功:', data.roleId);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('[对手洗练] RoleID保存失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 从数据库获取所有RoleID记录
    async function getAllRoleIdsFromDB(limit = 100) {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const index = objectStore.index('timestamp');
            
            const results = [];
            let count = 0;
            
            // 按时间戳降序获取（最新的在前）
            const request = index.openCursor(null, 'prev');
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    console.log(`[对手洗练] 从数据库加载了 ${results.length} 条记录`);
                    resolve(results);
                }
            };
            
            request.onerror = () => {
                console.error('[对手洗练] 获取记录失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 检查RoleID是否最近存在（去重用）
    async function isRoleIdRecentlyStored(roleId, timeWindowMs = 600000) {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const index = objectStore.index('roleId');
            
            const request = index.openCursor(IDBKeyRange.only(roleId), 'prev');
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    const timeDiff = Date.now() - record.timestamp;
                    if (timeDiff < timeWindowMs) {
                        resolve(true);
                    } else {
                        cursor.continue();
                    }
                } else {
                    resolve(false);
                }
            };
            
            request.onerror = () => {
                console.error('[对手洗练] 检查重复失败:', request.error);
                resolve(false); // 出错时默认不重复
            };
        });
    }

    // 清空数据库
    async function clearDB() {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.clear();
            
            request.onsuccess = () => {
                console.log('[对手洗练] 数据库已清空');
                resolve();
            };
            
            request.onerror = () => {
                console.error('[对手洗练] 清空数据库失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 删除指定记录
    async function deleteRoleIdFromDB(id) {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.delete(id);
            
            request.onsuccess = () => {
                console.log('[对手洗练] 记录删除成功:', id);
                resolve();
            };
            
            request.onerror = () => {
                console.error('[对手洗练] 删除记录失败:', request.error);
                reject(request.error);
            };
        });
    }

    // 获取数据库统计信息
    async function getDBStats() {
        if (!db) await initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const countRequest = objectStore.count();
            
            countRequest.onsuccess = () => {
                resolve({
                    totalCount: countRequest.result,
                    dbName: DB_NAME,
                    storeName: STORE_NAME
                });
            };
            
            countRequest.onerror = () => {
                console.error('[对手洗练] 获取统计信息失败:', countRequest.error);
                reject(countRequest.error);
            };
        });
    }

    // ===== 提示框功能（保留，用于操作反馈） =====
    function showTip(text, type = 'info') {
        document.querySelectorAll(`.${PREFIX}tip`).forEach(t => t.remove());
        
        const tip = document.createElement('div');
        tip.className = `${PREFIX}tip`;
        tip.textContent = text;
        
        const colors = {
            info: '#4A90E2',
            success: '#51CF66',
            error: '#FF6B6B',
            warning: '#FFD93D'
        };
        const bg = colors[type] || colors.info;
        
        tip.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bg};
            color: white;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            z-index: ${99999 + 1};
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            animation: ${PREFIX}slideIn 0.3s ease;
        `;
        
        if (!document.getElementById(`${PREFIX}animations`)) {
            const style = document.createElement('style');
            style.id = `${PREFIX}animations`;
            style.textContent = `
                @keyframes ${PREFIX}slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(tip);
        
        setTimeout(() => {
            tip.style.opacity = '0';
            tip.style.transform = 'translateX(100%)';
            setTimeout(() => tip.remove(), 300);
        }, 3000);
    }

    // ===== 处理拦截到的RoleID（新增名称关联+自动查询+IndexedDB存储） =====
    async function handleInterceptedRoleId(roleId, source, roleName = '未知名称') {
        if (!roleId || roleId === -1 || !state.isRoleIdMonitoring) return;
        
        // 更新状态
        state.interceptedRoleId = roleId;
        state.interceptedRoleName = decodeURIComponent(roleName) || '未知名称';
        state.interceptCount++;
        
        // 检查数据库中是否最近已存在（10分钟内）
        const isRecentlyStored = await isRoleIdRecentlyStored(roleId, 600000);
        if (isRecentlyStored) {
            console.log(`[对手洗练] RoleID ${roleId} 最近已记录，但仍然自动查询`);
            // 不跳过，只不保存到数据库
        } else {
            // 保存到IndexedDB
            try {
                await saveRoleIdToDB({
                    roleId: roleId,
                    roleName: state.interceptedRoleName,
                    source: source,
                    power: state.battleData?.rightTeam?.power || 0,
                    headImg: state.battleData?.rightTeam?.headImg || ''
                });
                // 更新数据库统计
                updateDBStatsDisplay();
            } catch (error) {
                console.error('[对手洗练] 保存到数据库失败:', error);
            }
        }
        
        // 添加到内存历史记录（不设置上限）
        state.roleIdHistory.unshift({
            roleId: roleId,
            roleName: state.interceptedRoleName,
            time: new Date().toLocaleString('zh-CN'),
            source: source
        });
        
        // 自动填充到输入框
        fillRoleIdToInput(roleId);
        
        // 更新历史记录标签页
        updateHistoryTab();
        
        // 自动触发查询（如果当前没有正在进行的请求）
        if (!state.isWaitingForResponse) {
            setTimeout(() => {
                sendChallenge(true); // true表示自动查询
            }, 500); // 延迟500ms，避免接口冲突
        }
        
        // 显示提示
        showTip(`✅ 拦截到角色: ${state.interceptedRoleName} (ID: ${roleId})，已保存到数据库`, 'success');
    }

    // ===== 填充RoleID到输入框 =====
    function fillRoleIdToInput(roleId) {
        const targetInput = document.getElementById(`${PREFIX}target-id`);
        if (targetInput) {
            targetInput.value = roleId;
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // 等待游戏加载完成
    async function waitForGameReady() {
        console.log('[对手洗练] 等待游戏加载完成...');
        
        // 初始化数据库
        try {
            await initDB();
            await loadHistoryFromDB();
        } catch (error) {
            console.error('[对手洗练] 数据库初始化失败:', error);
        }
        
        const checkInterval = setInterval(() => {
            if (window.ws && typeof window.ws.sendAsync === 'function') {
                clearInterval(checkInterval);
                console.log('[对手洗练] 游戏加载完成！');
                createChallengeUI();
                setupWebsocketMonitoring();
                updateDBStatsDisplay();
            }
        }, 500);
        
        // 30秒超时保护
        setTimeout(() => {
            clearInterval(checkInterval);
            console.log('[对手洗练] 超时，停止等待游戏加载');
        }, 30000);
    }

    // ===== 整合WebSocket监控（战斗数据+RoleID拦截，新增名称提取） =====
    let monitoringRetries = 0;
    const MONITORING_MAX_RETRIES = 30;
    function setupWebsocketMonitoring() {
        const gameWS = window.ws || (window.h5websocket && window.h5websocket.ws);
        if (!gameWS || typeof gameWS.sendAsync !== 'function') {
            monitoringRetries++;
            if (monitoringRetries <= MONITORING_MAX_RETRIES) {
                console.log(`[对手洗练] 无法设置WebSocket监控（${monitoringRetries}/${MONITORING_MAX_RETRIES}），1秒后重试...`);
                setTimeout(setupWebsocketMonitoring, 1000);
            } else {
                console.warn('[对手洗练] WebSocket监控设置失败次数过多（30次），停止重试');
            }
            return;
        }
        
        if (!state.originalSendAsync) {
            state.originalSendAsync = gameWS.sendAsync;
            console.log('[对手洗练] WebSocket已就绪，开始监控战斗指令和RoleID');
            
            // 替换sendAsync方法
            gameWS.sendAsync = async (data) => {
                const response = await state.originalSendAsync.call(gameWS, data);
                const cmdLower = (data.cmd || '').toLowerCase();
                
                // 处理RoleID拦截
                if (ROLEID_INTERCEPT_CMDS.includes(cmdLower)) {
                    console.log('[对手洗练] 🎯 拦截到RoleID相关命令:', data.cmd);
                    
                    // 提取角色名称（从请求或响应中）
                    let roleName = '未知名称';
                    // 从请求提取
                    if (data.body && data.body.roleName) {
                        roleName = data.body.roleName;
                    }
                    // 从响应提取（多路径）
                    if (response && response._rawData) {
                        const responseData = response._rawData;
                        const namePaths = [
                            responseData.body?.roleInfo?.name,
                            responseData.body?.bottle?.name,
                            responseData.body?.name,
                            responseData.roleInfo?.name,
                            responseData.bottle?.name,
                            responseData.name
                        ];
                        for (const name of namePaths) {
                            if (name) {
                                roleName = name;
                                break;
                            }
                        }
                    }
                    
                    // 提取RoleID（请求+响应）
                    // 1. 从请求提取
                    if (data.body && data.body.roleId) {
                        handleInterceptedRoleId(data.body.roleId, '请求', roleName);
                    }
                    
                    // 2. 从响应提取
                    if (response && response._rawData) {
                        const responseData = response._rawData;
                        const possiblePaths = [
                            responseData.body?.bottle?.roleId,
                            responseData.body?.roleInfo?.roleId,
                            responseData.body?.roleId,
                            responseData.bottle?.roleId,
                            responseData.roleInfo?.roleId,
                            responseData.roleId
                        ];
                        
                        for (const roleId of possiblePaths) {
                            if (roleId && roleId !== -1) {
                                handleInterceptedRoleId(roleId, '响应', roleName);
                                break;
                            }
                        }
                    }
                }
                
                // 处理战斗数据捕获（原逻辑）
                if (SUPPORTED_BATTLE_CMDS.includes(cmdLower) && state.isMonitoring) {
                    console.log('[对手洗练] 捕获到战斗指令，解析对手数据...');
                }
                
                return response;
            };
        }
    }

    // 发送命令（原逻辑保留）
    async function sendCommand(cmd, params) {
        if (!window.ws || !window.ws.sendAsync) {
            throw new Error('WebSocket连接不可用');
        }
        const message = {
            ack: 0, cmd: cmd, params: params, seq: state.seq++, time: Date.now()
        };
        return await window.ws.sendAsync(message);
    }

    // 折叠/展开切换（重构版）
    function toggleCollapse() {
        const assistant = document.getElementById(`${PREFIX}assistant`);
        const toggleBtn = document.getElementById(`${PREFIX}toggle`);
        const collapsedIcon = document.getElementById(`${PREFIX}collapsed-icon`);
        if (!assistant) return;

        state.isCollapsed = !state.isCollapsed;
        assistant.classList.toggle(`${PREFIX}collapsed`);

        if (state.isCollapsed) {
            // 最小化状态
            if (toggleBtn) toggleBtn.innerHTML = state.hasUnreadData ? '🔓' : '🔒';
            if (collapsedIcon) {
                collapsedIcon.innerHTML = state.hasUnreadData ? '🔓' : '🔒';
                if (state.hasUnreadData) {
                    collapsedIcon.classList.add(`${PREFIX}has-unread`);
                } else {
                    collapsedIcon.classList.remove(`${PREFIX}has-unread`);
                }
            }
        } else {
            // 展开状态
            if (toggleBtn) toggleBtn.innerHTML = '📋';
            assistant.style.left = state.position.x + 'px';
            assistant.style.top = state.position.y + 'px';
            if (state.hasUnreadData && state.battleData) {
                processBattleData();
                state.hasUnreadData = false;
                updateUnreadIndicator();
            }
        }
    }

    // 更新未读数据指示器
    function updateUnreadIndicator() {
        const toggleBtn = document.getElementById(`${PREFIX}toggle`);
        const collapsedIcon = document.getElementById(`${PREFIX}collapsed-icon`);
        if (!state.isCollapsed) return;
        
        if (toggleBtn) toggleBtn.innerHTML = state.hasUnreadData ? '🔓' : '🔒';
        if (collapsedIcon) {
            collapsedIcon.innerHTML = state.hasUnreadData ? '🔓' : '🔒';
            if (state.hasUnreadData) {
                collapsedIcon.classList.add(`${PREFIX}has-unread`);
            } else {
                collapsedIcon.classList.remove(`${PREFIX}has-unread`);
            }
        }
    }

    // ===== 优化：UI调整（标签页+缩小输入框+监控开关） =====
    function createChallengeUI() {
        const style = document.createElement('style');
        style.textContent = `
            /* 原有样式保留，优化输入框和标签页样式 */
            .${PREFIX}switch {
                position: relative; display: inline-block; width: 40px; height: 20px;
            }
            .${PREFIX}switch input { opacity: 0; width: 0; height: 0; }
            .${PREFIX}slider {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc; transition: .4s; border-radius: 20px;
            }
            .${PREFIX}slider:before {
                position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px;
                background-color: white; transition: .4s; border-radius: 50%;
            }
            input:checked + .${PREFIX}slider { background-color: #407BFF; }
            input:focus + .${PREFIX}slider { box-shadow: 0 0 1px #407BFF; }
            input:checked + .${PREFIX}slider:before { transform: translateX(20px); }

            #${PREFIX}assistant {
                position: fixed; top: ${state.position.y}px; left: ${state.position.x}px;
                width: auto; min-width: 300px; max-width: 90vw; background: #ffffff;
                height: auto; max-height: none;
                border: 1px solid #d1d5db; border-radius: 6px;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
                z-index: 99999 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: visible; transition: all 0.2s ease;
                cursor: default; user-select: none;
                max-height: 90vh; overflow-y: auto;
                font-size: 12px; /* 全局字体大小调大 */
            }

            /* 移除响应式布局，统一使用紧凑样式 */
            .${PREFIX}content { padding: 12px; }
            .${PREFIX}hero-selector { gap: 4px; }
            .${PREFIX}hero-item { padding: 3px 4px; flex: 1 0 calc(20% - 4px); }
            .${PREFIX}hero-item .${PREFIX}hero-name { font-size: 9px; }
            .${PREFIX}hero-item .${PREFIX}hero-position { font-size: 7px; }
            .${PREFIX}hero-stats { font-size: 12px; gap: 5px; }

            /* 最小化状态 - 独立的图标容器 */
            #${PREFIX}assistant.${PREFIX}collapsed {
                all: unset !important; /* 重置所有样式 */
                position: fixed !important;
                width: 14px !important;
                height: 14px !important;
                top: 10px !important;
                left: 10px !important;
                z-index: 99999 !important;
                cursor: pointer !important;
                user-select: none !important;
            }
            
            /* 最小化图标 */
            .${PREFIX}collapsed-icon {
                display: none;
                width: 14px;
                height: 14px;
                border-radius: 3px;
                background: #6b7280;
                color: white;
                font-size: 11px;
                line-height: 14px;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                transition: all 0.2s ease;
            }
            
            .${PREFIX}collapsed-icon:hover {
                background: #4b5563;
                transform: scale(1.1);
            }
            
            .${PREFIX}collapsed-icon.${PREFIX}has-unread {
                background: #3b82f6;
            }
            
            .${PREFIX}collapsed-icon.${PREFIX}has-unread:hover {
                background: #2563eb;
            }
            
            #${PREFIX}assistant.${PREFIX}collapsed .${PREFIX}collapsed-icon {
                display: block !important;
            }
            
            /* 展开状态下隐藏所有内容 */
            #${PREFIX}assistant.${PREFIX}collapsed .${PREFIX}header,
            #${PREFIX}assistant.${PREFIX}collapsed .${PREFIX}content {
                display: none !important;
            }

            .${PREFIX}header {
                padding: 6px 10px; background: #6b7280; color: white;
                display: flex; justify-content: space-between; align-items: center;
                user-select: none; height: 24px;
            }

            .${PREFIX}title { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; }

            .${PREFIX}icon {
                font-size: 12px; line-height: 1;
                display: flex; align-items: center; justify-content: center;
            }

            .${PREFIX}controls-minimal { display: flex; align-items: center; gap: 4px; }
            #${PREFIX}assistant.${PREFIX}collapsed .${PREFIX}controls-minimal { display: none; }

            #${PREFIX}toggle {
                width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
                border: none; background: transparent; color: white; cursor: pointer;
                font-size: 14px; padding: 0; margin: 0; line-height: 1;
            }
            #${PREFIX}toggle:hover { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }

            .${PREFIX}content {
                padding: 10px; transition: all 0.2s ease;
                overflow: visible; height: auto;
            }
            #${PREFIX}assistant.${PREFIX}collapsed .${PREFIX}content { max-height: 0; padding: 0; }

            .${PREFIX}section { margin-bottom: 10px; }
            .${PREFIX}section:last-child { margin-bottom: 0; }

            /* 输入框布局 */
            .${PREFIX}input-group { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
            .${PREFIX}target-id-wrapper { flex: 1; min-width: 120px; }
            .${PREFIX}input {
                width: 100%; padding: 6px 8px; border: 1px solid #d1d5db;
                border-radius: 4px; font-size: 12px; outline: none;
                transition: border-color 0.2s;
            }
            .${PREFIX}input:focus { border-color: #3b82f6; }

            .${PREFIX}btn {
                padding: 6px 12px; border: none; border-radius: 4px;
                font-size: 12px; font-weight: 600; cursor: pointer;
                transition: all 0.2s; display: inline-flex; align-items: center;
                justify-content: center; gap: 4px;
            }
            .${PREFIX}btn.${PREFIX}primary { background: #3b82f6; color: white; }
            .${PREFIX}btn.${PREFIX}primary:hover { background: #2563eb; }
            .${PREFIX}btn.${PREFIX}primary:active { background: #1d4ed8; }
            .${PREFIX}btn:disabled { opacity: 0.5; cursor: not-allowed; }

            /* 监控开关样式 */
            .${PREFIX}monitor-switch-wrapper {
                display: flex; align-items: center; gap: 6px;
                color: #374151; font-size: 12px;
                flex-shrink: 0;
            }
            .${PREFIX}monitor-label { font-weight: 500; font-size: 11px; }

            /* 标签页样式 */
            .${PREFIX}tabs {
                display: flex; 
                border-bottom: 1px solid #e2e8f0; 
                margin-bottom: 8px;
                padding-left: 6px;
                justify-content: center;
            }
            .${PREFIX}tab {
                padding: 6px 16px; cursor: pointer; font-size: 12px; font-weight: 600;
                color: #64748b; border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            .${PREFIX}tab:hover { color: #3b82f6; }
            .${PREFIX}tab.${PREFIX}active {
                color: #3b82f6; border-bottom-color: #3b82f6;
            }
            .${PREFIX}tab-content { display: none; }
            .${PREFIX}tab-content.${PREFIX}active { display: block; }

            /* 历史记录样式 */
            .${PREFIX}history-panel {
                background: #f8fafc; 
                border-radius: 6px; 
                padding: 8px;
                height: 250px;
                overflow-y: auto;
                position: relative;
            }
            .${PREFIX}virtual-scroll-container {
                position: relative;
                width: 100%;
            }
            .${PREFIX}virtual-scroll-spacer {
                position: absolute;
                top: 0;
                left: 0;
                width: 1px;
                pointer-events: none;
            }
            .${PREFIX}virtual-scroll-viewport {
                position: relative;
                width: 100%;
            }
            .${PREFIX}history-item {
                display: flex; justify-content: space-between; align-items: center;
                padding: 6px 8px; margin: 3px 0;
                background: white; border-radius: 4px; border: 1px solid #e2e8f0;
                cursor: pointer; transition: all 0.2s;
                box-sizing: border-box;
                position: absolute; /* 虚拟滚动需要 */
                left: 0;
                right: 0;
            }
            .${PREFIX}history-item-left {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .${PREFIX}history-checkbox {
                width: 14px;
                height: 14px;
                cursor: pointer;
            }
            .${PREFIX}history-item-content {
                flex: 1;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .${PREFIX}history-delete {
                padding: 3px 8px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .${PREFIX}history-delete:hover {
                background: #dc2626;
            }
            .${PREFIX}history-name {
                font-size: 11px; font-weight: 600; color: #1e40af;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                max-width: 120px;
            }
            .${PREFIX}history-id {
                font-size: 11px; color: #64748b; margin-left: 5px;
            }
            .${PREFIX}history-meta {
                display: flex; align-items: center; gap: 6px;
                font-size: 10px; color: #94a3b8;
            }
            .${PREFIX}no-history {
                color: #94a3b8; font-size: 12px; text-align: center;
                padding: 20px;
            }
            .${PREFIX}history-actions {
                display: flex; gap: 4px; margin-bottom: 6px;
                justify-content: center;
                flex-wrap: wrap;
            }
            .${PREFIX}btn-sm {
                padding: 4px 10px; font-size: 11px;
            }
            .${PREFIX}db-stats {
                padding: 3px 8px;
                background: #eff6ff;
                border-radius: 4px;
                margin-bottom: 6px;
                text-align: center;
                font-size: 10px;
            }
            .${PREFIX}btn-secondary {
                background: #6b7280; color: white;
            }
            .${PREFIX}btn-secondary:hover {
                background: #4b5563;
            }

            /* 战斗面板样式 */
            .${PREFIX}battle-panel {
                background: #f8fafc; border-radius: 6px;
                padding: 8px; height: auto; max-height: none;
                overflow: visible;
            }
            .${PREFIX}player-info {
                display: flex; align-items: center; margin-bottom: 6px;
                padding: 4px 6px; background: #f8fafc; border-radius: 4px;
                border: 1px solid #e2e8f0;
            }
            .${PREFIX}player-header {
                display: flex; align-items: center; gap: 5px;
                width: 100%; justify-content: flex-start;
            }
            .${PREFIX}player-avatar {
                width: 32px; height: 32px; border-radius: 50%;
                border: 1px solid #e2e8f0;
            }
            .${PREFIX}player-name {
                font-size: 11px; font-weight: 600; color: #1e40af;
                white-space: nowrap;
            }
            .${PREFIX}player-id { font-size: 11px; color: #64748b; }

            .${PREFIX}hero-selector {
                display: flex; gap: 3px; margin-bottom: 6px;
                overflow: hidden; padding-bottom: 2px;
                flex-wrap: wrap; justify-content: space-between;
            }
            .${PREFIX}hero-item {
                background: white; border-radius: 3px; padding: 2px 4px;
                border: 1px solid #e2e8f0; cursor: pointer;
                transition: all 0.2s ease; text-align: center;
                flex: 1 0 calc(20% - 3px); min-width: 0; box-sizing: border-box;
            }
            .${PREFIX}hero-item:hover { border-color: #93c5fd; background: #eff6ff; }
            .${PREFIX}hero-item.${PREFIX}selected {
                border-color: #3b82f6; background: #dbeafe;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
            }

            .${PREFIX}hero-details {
                background: white; border-radius: 4px; padding: 8px;
                border: 1px solid #e2e8f0; height: auto; overflow: visible;
                width: 100%; box-sizing: border-box;
            }
            .${PREFIX}hero-item .${PREFIX}hero-name {
                font-size: 10px; font-weight: 600; color: #374151;
                margin-bottom: 1px; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
            }
            .${PREFIX}hero-item .${PREFIX}hero-position {
                font-size: 8px; color: #64748b;
            }
            .${PREFIX}hero-stats {
                display: grid; grid-template-columns: repeat(2, 1fr);
                gap: 6px; font-size: 11px; color: #374151;
                margin-bottom: 8px;
            }
            /* 鱼灵和鱼珠作为属性行显示 */
            .${PREFIX}fish-stat,
            .${PREFIX}pearl-stat {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1px 0 !important;
                line-height: 1.1 !important;
            }
            .${PREFIX}fish-stat-name,
            .${PREFIX}pearl-stat-name {
                font-weight: 600;
                font-size: 12px;
                color: #374151;
            }
            .${PREFIX}fish-stat-value,
            .${PREFIX}pearl-stat-value {
                font-weight: 700;
                color: #1e40af;
                font-size: 12px;
                text-align: right;
            }
            .${PREFIX}hero-stat {
                display: flex; justify-content: space-between; align-items: center;
                padding: 1px 0 !important; line-height: 1.1 !important;
            }
            .${PREFIX}hero-stat-name { font-weight: 600; }
            .${PREFIX}hero-stat-value {
                font-weight: 700; color: #1e40af; font-size: 12px;
            }

            /* 滚动条样式 */
            .${PREFIX}battle-panel::-webkit-scrollbar,
            .${PREFIX}history-panel::-webkit-scrollbar { width: 3px; }
            .${PREFIX}battle-panel::-webkit-scrollbar-track,
            .${PREFIX}history-panel::-webkit-scrollbar-track { background: #f1f5f9; }
            .${PREFIX}battle-panel::-webkit-scrollbar-thumb,
            .${PREFIX}history-panel::-webkit-scrollbar-thumb {
                background: #cbd5e1; border-radius: 1.5px;
            }
            .${PREFIX}battle-panel::-webkit-scrollbar-thumb:hover,
            .${PREFIX}history-panel::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `;
        document.head.appendChild(style);

        // 创建界面（核心调整：标签页+缩小输入框+监控开关）
        const assistant = document.createElement('div');
        assistant.id = `${PREFIX}assistant`;
        assistant.className = '';
        assistant.innerHTML = `
            <div class="${PREFIX}collapsed-icon" id="${PREFIX}collapsed-icon">🔒</div>
            <div class="${PREFIX}header">
                <div class="${PREFIX}title">
                    <span class="${PREFIX}icon">📋</span>
                    <span>对手洗练（自动查询）</span>
                </div>
                <div class="${PREFIX}controls-minimal">
                    <button id="${PREFIX}toggle" title="折叠/展开（有新数据时显示🔓）" style="width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">
                        🔒
                    </button>
                </div>
            </div>
            <div class="${PREFIX}content">
                <!-- 输入区域 -->
                <div class="${PREFIX}section" style="margin-bottom: 10px;">
                    <div class="${PREFIX}input-group">
                        <div class="${PREFIX}target-id-wrapper">
                            <input type="number" class="${PREFIX}input" id="${PREFIX}target-id" placeholder="输入ID" />
                        </div>
                        <button class="${PREFIX}btn ${PREFIX}primary" id="${PREFIX}send-challenge">
                            获取洗炼
                        </button>
                        <!-- 监控开关 -->
                        <label class="${PREFIX}monitor-switch-wrapper">
                            <span class="${PREFIX}monitor-label">监控</span>
                            <label class="${PREFIX}switch">
                                <input type="checkbox" id="${PREFIX}roleid-monitor-switch" checked>
                                <span class="${PREFIX}slider"></span>
                            </label>
                        </label>
                    </div>
                    <div id="${PREFIX}player-info-container" style="display: none;">
                        <div class="${PREFIX}player-info" id="${PREFIX}player-info">
                            <!-- 玩家信息将在这里显示 -->
                        </div>
                    </div>
                </div>

                <!-- 新增标签页 -->
                <div class="${PREFIX}tabs">
                    <div class="${PREFIX}tab ${PREFIX}active" data-tab="wash">查询洗炼</div>
                    <div class="${PREFIX}tab" data-tab="history">历史查询</div>
                </div>

                <!-- 标签页内容：查询洗炼（原内容） -->
                <div class="${PREFIX}tab-content ${PREFIX}active" id="${PREFIX}wash-tab" style="height: auto; overflow: visible;">
                    <div class="${PREFIX}battle-panel" id="${PREFIX}battle-panel">
                        <div class="${PREFIX}hero-selector" id="${PREFIX}hero-selector">
                            <!-- 武将选择器 -->
                        </div>
                        <div class="${PREFIX}hero-details" id="${PREFIX}hero-details">
                            <!-- 选中武将的详细属性 -->
                        </div>
                    </div>
                </div>

                <!-- 标签页内容：历史查询 -->
                <div class="${PREFIX}tab-content" id="${PREFIX}history-tab">
                    <div class="${PREFIX}db-stats" id="${PREFIX}db-stats">
                        <span style="font-size: 11px; color: #64748b;">数据库记录：<span id="${PREFIX}db-count">0</span> 条</span>
                    </div>
                    <div class="${PREFIX}history-actions">
                        <button class="${PREFIX}btn ${PREFIX}btn-secondary btn-sm" id="${PREFIX}export-db">
                            导出数据
                        </button>
                        <button class="${PREFIX}btn ${PREFIX}btn-secondary btn-sm" id="${PREFIX}import-db">
                            导入数据
                        </button>
                        <button class="${PREFIX}btn ${PREFIX}btn-secondary btn-sm" id="${PREFIX}batch-delete" style="background: #ef4444;">
                            批量删除
                        </button>
                        <button class="${PREFIX}btn ${PREFIX}btn-secondary btn-sm" id="${PREFIX}clear-history">
                            清空历史
                        </button>
                    </div>
                    <div class="${PREFIX}history-panel" id="${PREFIX}history-panel">
                        <div class="${PREFIX}no-history">正在加载历史记录...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(assistant);
        setupEventListeners();

        // 初始化状态
        if (state.isCollapsed) {
            assistant.classList.add(`${PREFIX}collapsed`);
            const toggleBtn = document.getElementById(`${PREFIX}toggle`);
            const collapsedIcon = document.getElementById(`${PREFIX}collapsed-icon`);
            if (toggleBtn) toggleBtn.innerHTML = '🔒';
            if (collapsedIcon) {
                collapsedIcon.innerHTML = '🔒';
            }
        }
        // 初始化历史记录标签页
        updateHistoryTab();
    }

    // ===== 优化：事件监听（新增标签页切换+历史记录点击） =====
    function setupEventListeners() {
        const assistant = document.getElementById(`${PREFIX}assistant`);
        if (!assistant) return;

        // 原有事件保留
        assistant.addEventListener('click', (e) => {
            const target = e.target;
            
            // 如果是最小化状态，点击图标展开
            if (state.isCollapsed && (target.id === `${PREFIX}collapsed-icon` || target.closest(`#${PREFIX}collapsed-icon`))) {
                e.stopPropagation();
                toggleCollapse();
                return;
            }

            // 折叠/展开按钮
            if (target.id === `${PREFIX}toggle` || target.closest(`#${PREFIX}toggle`)) {
                e.stopPropagation();
                toggleCollapse();
            }

            // 标题栏点击
            else if (target.closest(`.${PREFIX}header`) && !target.closest(`#${PREFIX}toggle`)) {
                e.stopPropagation();
                toggleCollapse();
            }

            // 获取洗练按钮
            else if (target.closest(`#${PREFIX}send-challenge`)) {
                e.stopPropagation();
                sendChallenge(false); // false表示手动查询
            }

            // 武将选择项
            else if (target.closest(`.${PREFIX}hero-item`)) {
                e.stopPropagation();
                const heroItem = target.closest(`.${PREFIX}hero-item`);
                const position = heroItem.dataset.position;
                const heroes = state.battleData?.rightTeam?.team || {};
                const heroData = heroes[position];
                if (heroData) {
                    document.querySelectorAll(`.${PREFIX}hero-item`).forEach(item => {
                        item.classList.remove(`${PREFIX}selected`);
                    });
                    heroItem.classList.add(`${PREFIX}selected`);
                    showHeroDetails(heroData, position);
                }
            }

            // ===== 新增事件 =====
            // 标签页切换
            else if (target.closest(`.${PREFIX}tab`)) {
                e.stopPropagation();
                const tab = target.closest(`.${PREFIX}tab`);
                const tabName = tab.dataset.tab;
                // 切换标签激活状态
                document.querySelectorAll(`.${PREFIX}tab`).forEach(t => t.classList.remove(`${PREFIX}active`));
                document.querySelectorAll(`.${PREFIX}tab-content`).forEach(c => c.classList.remove(`${PREFIX}active`));
                tab.classList.add(`${PREFIX}active`);
                document.getElementById(`${PREFIX}${tabName}-tab`).classList.add(`${PREFIX}active`);
                state.activeTab = tabName;
            }

            // 历史记录项点击（填充ID并查询）
            else if (target.closest(`.${PREFIX}history-item-content`)) {
                e.stopPropagation();
                const historyItem = target.closest(`.${PREFIX}history-item`);
                const roleId = historyItem.dataset.roleid;
                const roleName = historyItem.dataset.rolename;
                if (roleId) {
                    fillRoleIdToInput(roleId);
                    // 切换到查询洗炼标签页
                    document.querySelectorAll(`.${PREFIX}tab`).forEach(t => t.classList.remove(`${PREFIX}active`));
                    document.querySelectorAll(`.${PREFIX}tab-content`).forEach(c => c.classList.remove(`${PREFIX}active`));
                    document.querySelector(`.${PREFIX}tab[data-tab="wash"]`).classList.add(`${PREFIX}active`);
                    document.getElementById(`${PREFIX}wash-tab`).classList.add(`${PREFIX}active`);
                    state.activeTab = 'wash';
                    // 触发查询
                    sendChallenge(false);
                    showTip(`已选择角色: ${roleName} (ID: ${roleId})`, 'success');
                }
            }
            
            // 单个删除按钮
            else if (target.classList.contains(`${PREFIX}history-delete`)) {
                e.stopPropagation();
                const roleId = target.dataset.roleid;
                const index = parseInt(target.dataset.index);
                if (confirm(`确定要删除该记录吗？`)) {
                    deleteSingleHistory(roleId, index);
                }
            }
            
            // 批量删除按钮
            else if (target.closest(`#${PREFIX}batch-delete`)) {
                e.stopPropagation();
                const checkboxes = document.querySelectorAll(`.${PREFIX}history-checkbox:checked`);
                if (checkboxes.length === 0) {
                    showTip('请先选择要删除的记录', 'warning');
                    return;
                }
                if (confirm(`确定要删除选中的 ${checkboxes.length} 条记录吗？`)) {
                    batchDeleteHistory(checkboxes);
                }
            }

            // 清空历史记录
            else if (target.closest(`#${PREFIX}clear-history`)) {
                e.stopPropagation();
                if (confirm('确定要清空所有历史记录吗？此操作将同时清空数据库。')) {
                    state.visibleStart = 0; // 重置滚动位置
                    clearAllHistory();
                }
            }
            
            // 导出数据库
            else if (target.closest(`#${PREFIX}export-db`)) {
                e.stopPropagation();
                exportDBData();
            }
            
            // 导入数据库
            else if (target.closest(`#${PREFIX}import-db`)) {
                e.stopPropagation();
                importDBData();
            }
        });

        // 监控开关切换
        const monitorSwitch = document.getElementById(`${PREFIX}roleid-monitor-switch`);
        if (monitorSwitch) {
            monitorSwitch.addEventListener('change', (e) => {
                state.isRoleIdMonitoring = e.target.checked;
                if (state.isRoleIdMonitoring) {
                    showTip('RoleID自动监控已开启', 'success');
                } else {
                    showTip('RoleID自动监控已关闭', 'warning');
                }
            });
        }

        // 回车键触发
        const targetIdInput = document.getElementById(`${PREFIX}target-id`);
        if (targetIdInput) {
            targetIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    sendChallenge(false);
                }
            });
        }
    }

    // ===== 新增：更新历史记录标签页（带虚拟滚动） =====
    async function updateHistoryTab() {
        const historyPanel = document.getElementById(`${PREFIX}history-panel`);
        if (!historyPanel) return;

        if (state.roleIdHistory.length > 0) {
            const totalHeight = state.roleIdHistory.length * state.itemHeight;
            
            historyPanel.innerHTML = `
                <div class="${PREFIX}virtual-scroll-container">
                    <div class="${PREFIX}virtual-scroll-spacer" style="height: ${totalHeight}px;"></div>
                    <div class="${PREFIX}virtual-scroll-viewport" id="${PREFIX}viewport">
                        <!-- 动态渲染的内容 -->
                    </div>
                </div>
            `;
            
            // 初始渲染可见项
            renderVisibleItems();
            
            // 设置滚动监听
            historyPanel.onscroll = handleHistoryScroll;
        } else {
            historyPanel.innerHTML = `<div class="${PREFIX}no-history">暂无查询记录</div>`;
            historyPanel.onscroll = null;
        }
        
        // 同步更新数据库统计
        updateDBStatsDisplay();
    }
    
    // 处理历史记录滚动
    function handleHistoryScroll(e) {
        const panel = e.target;
        const scrollTop = panel.scrollTop;
        const newStart = Math.floor(scrollTop / state.itemHeight);
        
        if (newStart !== state.visibleStart) {
            state.visibleStart = newStart;
            renderVisibleItems();
        }
    }
    
    // 渲染可见的历史记录项
    function renderVisibleItems() {
        const viewport = document.getElementById(`${PREFIX}viewport`);
        if (!viewport) return;
        
        const start = state.visibleStart;
        const end = Math.min(start + state.visibleCount + 2, state.roleIdHistory.length); // 多渲染2个以避免闪烁
        const visibleItems = state.roleIdHistory.slice(start, end);
        
        let html = '';
        visibleItems.forEach((item, index) => {
            const actualIndex = start + index;
            const top = actualIndex * state.itemHeight;
            html += `
                <div class="${PREFIX}history-item" 
                     data-roleid="${item.roleId}" 
                     data-rolename="${item.roleName}"
                     data-index="${actualIndex}"
                     style="position: absolute; top: ${top}px; left: 0; right: 0; height: ${state.itemHeight}px;">
                    <div class="${PREFIX}history-item-left">
                        <input type="checkbox" class="${PREFIX}history-checkbox" data-roleid="${item.roleId}" />
                        <div class="${PREFIX}history-item-content">
                            <div style="display: flex; align-items: center;">
                                <span class="${PREFIX}history-name">${item.roleName}</span>
                                <span class="${PREFIX}history-id">ID: ${item.roleId}</span>
                            </div>
                        </div>
                    </div>
                    <button class="${PREFIX}history-delete" data-roleid="${item.roleId}" data-index="${actualIndex}">删除</button>
                </div>
            `;
        });
        
        viewport.innerHTML = html;
    }

    // 发送挑战请求（优化：区分自动/手动查询）
    async function sendChallenge(isAuto) {
        if (state.isWaitingForResponse) {
            console.log('[对手洗练] 正在等待响应，请稍候...');
            if (!isAuto) showTip('正在等待响应，请稍候', 'warning');
            return;
        }

        const targetIdInput = document.getElementById(`${PREFIX}target-id`);
        const targetIdValue = targetIdInput.value.trim();
        const targetId = parseInt(targetIdValue);

        if (!targetIdValue || isNaN(targetId)) {
            console.log('[对手洗练] 请输入有效的目标ID');
            if (!isAuto) showTip('请输入有效的目标ID', 'error');
            return;
        }

        try {
            state.isWaitingForResponse = true;
            console.log(`[对手洗练] 正在获取ID:${targetId}的洗练数据...`);

            const response = await sendCommand('role_gettargetteam', { 
                cCMonsterId: 0, 
                targetId: targetId, 
                teamType: 17 
            });
            
            console.log('[对手洗练] 完整响应数据:', response);
            
            if (!response) {
                console.log('[对手洗练] 获取洗练数据失败，响应为空');
                if (!isAuto) showTip('获取洗练数据失败，响应为空', 'error');
                state.isWaitingForResponse = false;
                return;
            }

            const teamInfo = response?.body?.teamInfo || response?.teamInfo || response?._rawData?.teamInfo || response?.rawData?.teamInfo;
            console.log('[对手洗练] 解析到的teamInfo:', teamInfo);
            
            if (!teamInfo) {
                console.log('[对手洗练] 响应中未找到teamInfo数据');
                if (!isAuto) showTip('未找到对手数据，请重试', 'error');
                state.isWaitingForResponse = false;
                return;
            }

            // 更新战斗数据，关联角色名称
            state.battleData = {
                rightTeam: {
                    name: teamInfo.name || state.interceptedRoleName || '未知玩家',
                    power: teamInfo.power || 0,
                    team: teamInfo.team || {},
                    roleId: teamInfo.roleId || targetId,
                    headImg: teamInfo.headImg
                }
            };
            
            // 处理战斗数据并切换到查询洗炼标签页
            processBattleData();
            if (state.activeTab !== 'wash') {
                document.querySelectorAll(`.${PREFIX}tab`).forEach(t => t.classList.remove(`${PREFIX}active`));
                document.querySelectorAll(`.${PREFIX}tab-content`).forEach(c => c.classList.remove(`${PREFIX}active`));
                document.querySelector(`.${PREFIX}tab[data-tab="wash"]`).classList.add(`${PREFIX}active`);
                document.getElementById(`${PREFIX}wash-tab`).classList.add(`${PREFIX}active`);
                state.activeTab = 'wash';
            }

            if (state.isCollapsed) {
                toggleCollapse();
            }

            state.isWaitingForResponse = false;

        } catch (error) {
            console.log(`[对手洗练] 获取洗练数据失败: ${error.message}`);
            if (!isAuto) showTip(`获取失败: ${error.message}`, 'error');
            state.isWaitingForResponse = false;
        }
    }

    // 处理战斗数据（原逻辑保留）
    function processBattleData() {
        if (!state.battleData) return;

        const heroSelector = document.getElementById(`${PREFIX}hero-selector`);
        const heroDetails = document.getElementById(`${PREFIX}hero-details`);
        const battlePanel = document.getElementById(`${PREFIX}battle-panel`);
        const playerInfoContainer = document.getElementById(`${PREFIX}player-info-container`);
        const playerInfoElement = document.getElementById(`${PREFIX}player-info`);

        heroSelector.innerHTML = '';
        heroDetails.innerHTML = '';

        const rightTeam = state.battleData.rightTeam;
        if (!rightTeam) return;

        // 显示玩家信息（含名称和ID）
        playerInfoElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="${PREFIX}player-header">
                    <img class="${PREFIX}player-avatar" src="${rightTeam.headImg || ''}" alt="头像">
                    <div class="${PREFIX}player-name">${decodeURIComponent(rightTeam.name || '未知玩家')}</div>
                    <div class="${PREFIX}player-id">ID: ${rightTeam.roleId || ''}</div>
                </div>
                <div style="color: #10b981; font-size: 12px; white-space: nowrap;">获取洗练数据成功</div>
            </div>
        `;
        playerInfoContainer.style.display = 'block';

        // 创建英雄选择器
        const heroes = [];
        for (let i = 0; i < 5; i++) {
            const heroData = rightTeam.team[i.toString()];
            if (heroData && heroData.id) {
                heroes.push({ data: heroData, position: i });
            }
        }

        // 添加英雄选择按钮
        heroes.forEach(({ data, position }) => {
            const heroItem = document.createElement('div');
            heroItem.className = `${PREFIX}hero-item`;
            heroItem.dataset.position = position;
            heroItem.innerHTML = `
                <div class="${PREFIX}hero-name">${heroMap[data.id.toString()] || `未知英雄 (${data.id})`}</div>
                <div class="${PREFIX}hero-position">${position + 1}号位</div>
            `;
            heroSelector.appendChild(heroItem);
        });

        // 默认选中第一个英雄
        if (heroes.length > 0) {
            const firstHero = heroSelector.querySelector(`.${PREFIX}hero-item`);
            firstHero.classList.add(`${PREFIX}selected`);
            showHeroDetails(heroes[0].data, heroes[0].position);
        }

        // 显示战斗面板
        battlePanel.style.display = 'block';
    }

    // 显示英雄详细属性（原逻辑保留）
    function showHeroDetails(heroData, position) {
        const heroDetails = document.getElementById(`${PREFIX}hero-details`);
        heroDetails.innerHTML = '';

        const statsElement = document.createElement('div');
        statsElement.className = `${PREFIX}hero-stats`;

        const heroAttributes = heroData.attribute || {};
        
        // 普通属性列表
        const normalAttributeKeys = [
            'attack', 'hp', 'speed', '56', '51', '52', '53', '54',
            '57', '58', '59', '60', '61', '62', '63', '64',
            '65', '66', '67', '68', '70', '80', '69', '301',
            '226', '227', '228', '229', '230', '231', '101', '5'
        ].filter(key => attributeMap.hasOwnProperty(key));

        // 渲染普通属性
        normalAttributeKeys.forEach(key => {
            let value;
            let displayValue;

            if (key === 'attack') {
                value = heroData.attack || 0;
                displayValue = (value / 100000000).toFixed(3) + '亿';
            } else if (key === 'hp') {
                value = heroData.hp || 0;
                displayValue = (value / 100000000).toFixed(3) + '亿';
            } else if (key === 'speed') {
                value = heroData.speed || 0;
                displayValue = value.toString();
            } else {
                value = heroAttributes[key] || 0;
                displayValue = (value * 100).toFixed(1) + '%';
            }

            const statItem = document.createElement('div');
            statItem.className = `${PREFIX}hero-stat`;
            statItem.innerHTML = `
                <span class="${PREFIX}hero-stat-name">${attributeMap[key]}</span>
                <span class="${PREFIX}hero-stat-value">${displayValue}</span>
            `;
            statsElement.appendChild(statItem);
        });

        // 添加鱼灵作为一个属性行
        const heroSkills = heroData.skill || [];
        let fishInfo = '无';
        
        // 解析鱼灵数据
        for (const skillId of heroSkills) {
            const skillIdStr = skillId.toString();
            // 检查是否为鱼灵ID（以11或12开头，长度至少5位）
            if (skillIdStr.length >= 5 && (skillIdStr.startsWith('11') || skillIdStr.startsWith('12'))) {
                // 只取前5位进行匹配
                const first5Digits = skillIdStr.substring(0, 5);
                const fishId = first5Digits.substring(0, 4); // 前4位是鱼的ID
                const starLevel = parseInt(first5Digits.charAt(4)); // 第5位是星级
                const fishName = fishMapping[fishId];
                if (fishName) {
                    fishInfo = `${starLevel}星${fishName}`;
                    break;
                }
            }
        }
        
        // 添加鱼灵行
        const fishStatItem = document.createElement('div');
        fishStatItem.className = `${PREFIX}fish-stat`;
        fishStatItem.innerHTML = `
            <span class="${PREFIX}fish-stat-name">鱼灵</span>
            <span class="${PREFIX}fish-stat-value">${fishInfo}</span>
        `;
        statsElement.appendChild(fishStatItem);
        
        // 解析鱼珠数据
        const ownedPearls = [];
        heroSkills.forEach(skillId => {
            const skillIdStr = skillId.toString();
            if (skillIdStr.startsWith(PEARL_ATTR_PREFIX) && attributeMap[skillIdStr]) {
                ownedPearls.push(attributeMap[skillIdStr]);
            }
        });
        
        const pearlInfo = ownedPearls.length > 0 ? ownedPearls.join('、') : '无';
        
        // 添加鱼珠行
        const pearlStatItem = document.createElement('div');
        pearlStatItem.className = `${PREFIX}pearl-stat`;
        pearlStatItem.innerHTML = `
            <span class="${PREFIX}pearl-stat-name">鱼珠</span>
            <span class="${PREFIX}pearl-stat-value">${pearlInfo}</span>
        `;
        statsElement.appendChild(pearlStatItem);
        
        heroDetails.appendChild(statsElement);
    }

    // 格式化数字（原逻辑保留）
    function formatNumber(num) {
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }

    // ===== 数据库相关辅助函数 =====
    // 从数据库加载历史记录
    async function loadHistoryFromDB() {
        try {
            const records = await getAllRoleIdsFromDB(1000); // 加载最近1000条
            state.roleIdHistory = records.map(record => ({
                roleId: record.roleId,
                roleName: record.roleName,
                time: record.createTime || new Date(record.timestamp).toLocaleString('zh-CN'),
                source: record.source || '数据库'
            }));
            console.log(`[对手洗练] 从数据库加载了 ${state.roleIdHistory.length} 条历史记录`);
        } catch (error) {
            console.error('[对手洗练] 加载历史记录失败:', error);
        }
    }

    // 更新数据库统计显示
    async function updateDBStatsDisplay() {
        try {
            const stats = await getDBStats();
            const countElement = document.getElementById(`${PREFIX}db-count`);
            if (countElement) {
                countElement.textContent = stats.totalCount;
            }
        } catch (error) {
            console.error('[对手洗练] 更新统计信息失败:', error);
        }
    }

    // 清空所有历史
    async function clearAllHistory() {
        try {
            await clearDB();
            state.roleIdHistory = [];
            updateHistoryTab();
            updateDBStatsDisplay();
            showTip('所有历史记录已清空', 'info');
        } catch (error) {
            console.error('[对手洗练] 清空失败:', error);
            showTip('清空失败，请重试', 'error');
        }
    }

    // 导出数据库数据
    async function exportDBData() {
        try {
            const records = await getAllRoleIdsFromDB(10000); // 导出所有记录
            const dataStr = JSON.stringify(records, null, 2);
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `opponent_wash_data_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showTip(`导出成功，共 ${records.length} 条记录`, 'success');
        } catch (error) {
            console.error('[对手洗练] 导出失败:', error);
            showTip('导出失败，请重试', 'error');
        }
    }

    // 导入数据库数据
    function importDBData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const records = JSON.parse(text);
                
                if (!Array.isArray(records)) {
                    throw new Error('无效的数据格式');
                }
                
                let successCount = 0;
                for (const record of records) {
                    if (record.roleId && record.roleName) {
                        try {
                            await saveRoleIdToDB({
                                roleId: record.roleId,
                                roleName: record.roleName,
                                source: record.source || '导入',
                                power: record.power || 0,
                                headImg: record.headImg || ''
                            });
                            successCount++;
                        } catch (err) {
                            console.warn(`导入记录失败: ${record.roleId}`, err);
                        }
                    }
                }
                
                // 重新加载历史
                await loadHistoryFromDB();
                updateHistoryTab();
                updateDBStatsDisplay();
                
                showTip(`导入成功，共 ${successCount} 条记录`, 'success');
            } catch (error) {
                console.error('[对手洗练] 导入失败:', error);
                showTip('导入失败，请检查文件格式', 'error');
            }
        };
        input.click();
    }

    // 删除单个历史记录
    async function deleteSingleHistory(roleId, index) {
        try {
            // 从数据库删除
            await deleteRoleIdFromDB(roleId);
            // 从内存删除
            state.roleIdHistory.splice(index, 1);
            // 更新显示
            updateHistoryTab();
            updateDBStatsDisplay();
            showTip('删除成功', 'success');
        } catch (error) {
            console.error('[对手洗炼] 删除失败:', error);
            showTip('删除失败，请重试', 'error');
        }
    }
    
    // 批量删除历史记录
    async function batchDeleteHistory(checkboxes) {
        try {
            const roleIds = Array.from(checkboxes).map(cb => cb.dataset.roleid);
            let successCount = 0;
            
            // 从数据库批量删除
            for (const roleId of roleIds) {
                try {
                    await deleteRoleIdFromDB(roleId);
                    successCount++;
                } catch (err) {
                    console.warn(`删除记录失败: ${roleId}`, err);
                }
            }
            
            // 从内存中移除
            state.roleIdHistory = state.roleIdHistory.filter(item => !roleIds.includes(item.roleId.toString()));
            
            // 重置滚动位置
            state.visibleStart = 0;
            
            // 更新显示
            updateHistoryTab();
            updateDBStatsDisplay();
            
            showTip(`成功删除 ${successCount} 条记录`, 'success');
        } catch (error) {
            console.error('[对手洗炼] 批量删除失败:', error);
            showTip('批量删除失败，请重试', 'error');
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForGameReady);
    } else {
        waitForGameReady();
    }
})();