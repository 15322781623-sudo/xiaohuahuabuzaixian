// ==UserScript==
// @name         武将升级独立助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  独立的武将升级辅助脚本，支持目标等级与目标速度智能调整，自动防止跨阶溢出
// @author       咸鱼玩家
// @match        *://*/*
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';
    var unsafeWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    class HeroUpgradeHelper {
        constructor() {
            this.version = '1.0.0';
            this.panel = null;
            this.heroUpgradeSelectedId = null;
            this.heroUpgradeShouldStop = false;
            this.heroUpgradeMode = 'level'; // 'level' | 'speed'

            // 进阶等级配置表
            this.LEVEL_ORDER_MAP = [
                { level: 100, order: 1 },
                { level: 200, order: 2 },
                { level: 300, order: 3 },
                { level: 500, order: 4 },
                { level: 700, order: 5 },
                { level: 900, order: 6 },
                { level: 1100, order: 7 },
                { level: 1300, order: 8 },
                { level: 1500, order: 9 },
                { level: 1800, order: 10 },
                { level: 2100, order: 11 },
                { level: 2400, order: 12 },
                { level: 2800, order: 13 },
                { level: 3200, order: 14 },
                { level: 3600, order: 15 },
                { level: 4000, order: 16 },
                { level: 4500, order: 17 },
                { level: 5000, order: 18 },
                { level: 5500, order: 19 },
            ];

            this.heroOptionsList = [];
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.injectUI());
            } else {
                this.injectUI();
            }
            this.startInjection();
        }

        // 英雄字典配置
        get HERO_DICT() {
            return {
                101: { name: "司马懿", type: "魏国" },
                102: { name: "郭嘉", type: "魏国" },
                103: { name: "关羽", type: "蜀国" },
                104: { name: "诸葛亮", type: "蜀国" },
                105: { name: "周瑜", type: "吴国" },
                106: { name: "太史慈", type: "吴国" },
                107: { name: "吕布", type: "群雄" },
                108: { name: "华佗", type: "群雄" },
                109: { name: "甄姬", type: "魏国" },
                110: { name: "黄月英", type: "蜀国" },
                111: { name: "孙策", type: "吴国" },
                112: { name: "贾诩", type: "群雄" },
                113: { name: "曹仁", type: "魏国" },
                114: { name: "姜维", type: "蜀国" },
                115: { name: "孙坚", type: "吴国" },
                116: { name: "公孙瓒", type: "群雄" },
                117: { name: "典韦", type: "魏国" },
                118: { name: "赵云", type: "蜀国" },
                119: { name: "大乔", type: "吴国" },
                120: { name: "张角", type: "群雄" },
                121: { name: "红鲁肃", type: "吴国" },
                201: { name: "徐晃", type: "魏国" },
                202: { name: "荀彧", type: "魏国" },
                203: { name: "小典韦", type: "魏国" },
                204: { name: "张飞", type: "蜀国" },
                205: { name: "小赵云", type: "蜀国" },
                206: { name: "庞统", type: "蜀国" },
                207: { name: "鲁肃", type: "吴国" },
                208: { name: "陆逊", type: "吴国" },
                209: { name: "甘宁", type: "吴国" },
                210: { name: "貂蝉", type: "群雄" },
                211: { name: "董卓", type: "群雄" },
                212: { name: "小张角", type: "群雄" },
                213: { name: "张辽", type: "魏国" },
                214: { name: "夏侯惇", type: "魏国" },
                215: { name: "许褚", type: "魏国" },
                216: { name: "夏侯渊", type: "魏国" },
                217: { name: "魏延", type: "蜀国" },
                218: { name: "黄忠", type: "蜀国" },
                219: { name: "马超", type: "蜀国" },
                220: { name: "马岱", type: "蜀国" },
                221: { name: "吕蒙", type: "吴国" },
                222: { name: "黄盖", type: "吴国" },
                223: { name: "蔡文姬", type: "魏国" },
                224: { name: "小乔", type: "吴国" },
                225: { name: "袁绍", type: "群雄" },
                226: { name: "华雄", type: "群雄" },
                227: { name: "颜良", type: "群雄" },
                228: { name: "文丑", type: "群雄" },
                301: { name: "周泰", type: "吴国" },
                302: { name: "许攸", type: "魏国" },
                303: { name: "于禁", type: "魏国" },
                304: { name: "张星彩", type: "蜀国" },
                305: { name: "关银屏", type: "蜀国" },
                306: { name: "关平", type: "蜀国" },
                307: { name: "程普", type: "吴国" },
                308: { name: "张昭", type: "吴国" },
                309: { name: "陆绩", type: "吴国" },
                310: { name: "吕玲绮", type: "群雄" },
                311: { name: "潘凤", type: "群雄" },
                312: { name: "邢道荣", type: "群雄" },
                313: { name: "祝融夫人", type: "群雄" },
                314: { name: "孟获", type: "群雄" }
            };
        }

        // 获取英雄字典获取名称的实现
        getHeroName(heroId) {
            // 优先查静态配置字典
            if (this.HERO_DICT[heroId] && this.HERO_DICT[heroId].name) {
                return this.HERO_DICT[heroId].name;
            }

            // 兜底查游戏内数据
            try {
                const dataIndex = unsafeWindow.__require("data-index");
                if (dataIndex && dataIndex.Config_hero_hero && dataIndex.Config_hero_hero.get(heroId)) {
                    return dataIndex.Config_hero_hero.get(heroId).name || `武将${heroId}`;
                }
            } catch (e) {
                // Ignore error
            }

            return `武将${heroId}`;
        }

        // 显示提示
        showTip(message, type = 'info') {
            try {
                if (typeof unsafeWindow.__require === 'function') {
                    const TipsManager = unsafeWindow.__require('TipsManager');
                    if (TipsManager && typeof TipsManager.SHOW_TIP === 'function') {
                        TipsManager.SHOW_TIP(message);
                        return;
                    }
                }
                console.log(`[武将升级助手] ${message}`);
            } catch (e) {
                console.log(`[武将升级助手] ${message}`);
            }
        }

        // 判断升级是否会跨越进阶门槛
        judgeLevelUpgrade(level, upgradeNum, order) {
            for (const item of this.LEVEL_ORDER_MAP) {
                if (order !== item.order && level <= item.level && item.level < (level + upgradeNum)) {
                    return item.level;
                }
            }
            return false;
        }

        // 判断是否可以进阶
        canOrderUpgrade(level, order) {
            for (const item of this.LEVEL_ORDER_MAP) {
                if (item.order === order + 1) {
                    return level >= item.level;
                }
            }
            return false;
        }

        getFromMap(map, key) {
            if (typeof map.get === 'function') return map.get(key);
            if (map[key] !== undefined) return map[key];
            return map[String(key)] || null;
        }

        getMapKeys(map) {
            if (typeof map.keys === 'function') {
                const keys = [];
                for (const k of map.keys()) keys.push(k);
                return keys;
            }
            return Object.keys(map);
        }

        // 刷新列表
        refreshHeroUpgradeData() {
            const selectEl = document.getElementById('hero-up-select');
            if (!selectEl) return;

            try {
                const ServerData = unsafeWindow.__require('ServerData');
                if (!ServerData || !ServerData.ROLE || !ServerData.ROLE.heroes) {
                    this.showTip('游戏数据未就绪', 'warning');
                    return;
                }

                const heroes = ServerData.ROLE.heroes;
                const heroKeys = this.getMapKeys(heroes);

                this.heroOptionsList = heroKeys
                    .map(key => this.getFromMap(heroes, key))
                    .filter(hero => hero && hero.level <= 6000) // 允许满级，因为可能会降级调速
                    .map(hero => {
                        const slot = hero.battleTeamSlot !== undefined ? hero.battleTeamSlot : hero.slot;
                        const isOnBattle = slot !== undefined && slot !== null && slot !== -1;
                        // 重新包装对象防止污染原始引用
                        return { originObj: hero, heroId: hero.heroId, level: hero.level || 0, isOnBattle: isOnBattle };
                    })
                    .sort((a, b) => {
                        if (a.isOnBattle && !b.isOnBattle) return -1;
                        if (!a.isOnBattle && b.isOnBattle) return 1;
                        return b.level - a.level;
                    })
                    .map(hero => {
                        const name = this.getHeroName(hero.heroId);
                        const displayPrefix = hero.isOnBattle ? '【上阵】' : '';
                        return { heroId: hero.heroId, name: displayPrefix + name, level: hero.level };
                    });

                selectEl.innerHTML = '<option value="">请选择要升级的武将...</option>';
                this.heroOptionsList.forEach(hero => {
                    const option = document.createElement('option');
                    option.value = hero.heroId;
                    option.textContent = `${hero.name} (当前: ${hero.level}级)`;
                    selectEl.appendChild(option);
                });

                document.getElementById('hero-up-info').style.display = 'none';
                this.heroUpgradeSelectedId = null;
            } catch (e) {
                console.error(e);
            }
        }

        // 选择武将
        selectHeroForUpgrade(heroId) {
            const infoEl = document.getElementById('hero-up-info');
            if (!heroId) {
                infoEl.style.display = 'none';
                this.heroUpgradeSelectedId = null;
                return;
            }

            this.heroUpgradeSelectedId = parseInt(heroId);
            const ServerData = unsafeWindow.__require('ServerData');
            const heroData = this.getFromMap(ServerData.ROLE.heroes, this.heroUpgradeSelectedId);

            if (!heroData) {
                infoEl.style.display = 'none';
                return;
            }

            infoEl.style.display = 'block';
            this.updateDisplay(heroData);
        }

        updateDisplay(heroData) {
            document.getElementById('hero-up-level').textContent = `${heroData.level || 0}/6000`;
            document.getElementById('hero-up-attack').textContent = heroData.attack || 0;
            document.getElementById('hero-up-speed').textContent = heroData.speed || 0;
            this.updateOrderButtonState(heroData);
        }

        updateOrderButtonState(heroData) {
            const orderBtn = document.getElementById('hero-up-order-btn');
            const tipEl = document.getElementById('hero-up-tip');
            if (!orderBtn || !tipEl || !heroData) return;

            const level = heroData.level || 0;
            const order = heroData.order || 0;
            const canOrder = this.canOrderUpgrade(level, order);

            orderBtn.disabled = !canOrder;

            if (level >= 6000) {
                tipEl.textContent = '武将已满级';
                tipEl.style.color = '#34c759';
            } else if (canOrder) {
                tipEl.textContent = `当前${level}级已可进阶`;
                tipEl.style.color = '#ff9500';
            } else {
                const nextOrderLevel = this.LEVEL_ORDER_MAP.find(item => item.order > order);
                tipEl.textContent = nextOrderLevel ? `下一进阶等级: ${nextOrderLevel.level}级` : '已达最高阶';
                tipEl.style.color = '#6b7280';
            }
        }

        switchUpgradeMode(mode) {
            this.heroUpgradeMode = mode;
            const isLevel = mode === 'level';
            document.getElementById('hero-up-level-row').style.display = isLevel ? 'block' : 'none';
            document.getElementById('hero-up-speed-row').style.display = isLevel ? 'none' : 'block';
            document.getElementById('hero-up-mode-level').classList.toggle('active', isLevel);
            document.getElementById('hero-up-mode-speed').classList.toggle('active', !isLevel);
        }

        updateUpgradeButtons(running) {
            document.getElementById('hero-up-auto-btn').disabled = running;
            document.getElementById('hero-up-stop-btn').style.display = running ? 'flex' : 'none';
        }

        stopHeroUpgrade() {
            this.heroUpgradeShouldStop = true;
            this.showTip('正在停止升级...', 'info');
        }

        async doHeroUpgradeOrder() {
            if (!this.heroUpgradeSelectedId) return;
            const ServerData = unsafeWindow.__require('ServerData');
            const dataIndex = unsafeWindow.__require("data-index");
            const HeroService = dataIndex.HeroService;

            const heroData = this.getFromMap(ServerData.ROLE.heroes, this.heroUpgradeSelectedId);
            if (!heroData) return;

            if (!this.canOrderUpgrade(heroData.level || 0, heroData.order || 0)) return;

            try {
                document.getElementById('hero-up-order-btn').disabled = true;
                const result = await HeroService.heroUpgradeOrder({ heroId: this.heroUpgradeSelectedId });

                if (result && result.code === 0) {
                    this.showTip('进阶成功', 'success');
                    // 等待数据同步
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const freshData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, this.heroUpgradeSelectedId);
                    if (freshData) this.updateDisplay(freshData);
                } else {
                    this.showTip(`进阶失败: ${result?.error || result?.msg || '未知错误'}`, 'error');
                }
            } catch (e) {
                this.showTip(`进阶异常: ${e.message}`, 'error');
            } finally {
                const freshData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, this.heroUpgradeSelectedId);
                if (freshData) this.updateOrderButtonState(freshData);
            }
        }

        async doHeroAutoUpgradeByMode() {
            if (this.heroUpgradeMode === 'speed') {
                await this.doHeroUpgradeToSpeed();
            } else {
                await this.doHeroAutoUpgradeToLevel();
            }
        }

        async doHeroAutoUpgradeToLevel() {
            const heroId = this.heroUpgradeSelectedId;
            const targetLevel = parseInt(document.getElementById('hero-up-target-level').value, 10);

            if (!heroId) {
                this.showTip('请先选择武将', 'warning');
                return;
            }

            const ServerData = unsafeWindow.__require('ServerData');
            const dataIndex = unsafeWindow.__require("data-index");
            const HeroService = dataIndex.HeroService;
            let heroData = this.getFromMap(ServerData.ROLE.heroes, heroId);

            if (!heroData) return;

            let currentLevel = heroData.level || 0;
            if (!targetLevel) {
                this.showTip('请输入目标等级', 'warning');
                return;
            }

            this.heroUpgradeShouldStop = false;
            this.updateUpgradeButtons(true);

            try {
                // 如果当前等级过了目标等级，先下阵、重生并上阵
                if (currentLevel > targetLevel) {
                    this.showTip('等级已超标，正在执行重生流程...', 'info');

                    const currentSlot = heroData.battleTeamSlot !== undefined ? heroData.battleTeamSlot : heroData.slot;
                    const isOnBattle = currentSlot !== undefined && currentSlot !== null && currentSlot !== -1;

                    // 保存鱼灵信息，重生后恢复
                    const savedArtifactId = heroData.artifactId || 0;
                    const savedPearlId = heroData.pearlId || 0;

                    if (isOnBattle) {
                        this.showTip('下阵武将...', 'info');
                        if (typeof HeroService.sendGoBackBattle === 'function') {
                            await HeroService.sendGoBackBattle(currentSlot);
                        } else if (typeof HeroService.goBackBattle === 'function') {
                            await HeroService.goBackBattle({ slot: currentSlot });
                        }
                        await new Promise(r => setTimeout(r, 600));
                    }

                    this.showTip('重生武将...', 'info');
                    await HeroService.rebirth({ heroId: heroId });
                    await new Promise(r => setTimeout(r, 600));

                    if (isOnBattle) {
                        this.showTip('重新上阵...', 'info');
                        if (typeof HeroService.goIntoBattle === 'function') {
                            await HeroService.goIntoBattle({ slot: currentSlot, heroId: heroId });
                        }
                        await new Promise(r => setTimeout(r, 600));
                    }

                    // 恢复鱼灵
                    if (savedArtifactId > 0 && savedPearlId > 0) {
                        this.showTip('恢复鱼灵装备...', 'info');
                        try {
                            const ArtifactService = dataIndex.ArtifactService;
                            await ArtifactService.load({ heroId: heroId, itemId: savedArtifactId, targetHeroId: -1, pearlId: savedPearlId });
                            await new Promise(r => setTimeout(r, 400));
                        } catch (e) {
                            console.warn('[武将升级助手] 恢复鱼灵失败:', e);
                            this.showTip('鱼灵恢复失败，请手动装备', 'warning');
                        }
                    }

                    heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);
                    currentLevel = heroData.level || 0;
                    this.updateDisplay(heroData);
                    this.showTip('重生完毕，开始自动升级...', 'info');
                } else if (currentLevel === targetLevel) {
                    this.showTip('已达到目标等级', 'success');
                    return;
                }

                let currentOrd = heroData.order || 0;
                const standardLevels = [50, 10, 5, 1];
                let noProgressCount = 0;

                while (currentLevel < targetLevel && !this.heroUpgradeShouldStop) {
                    let progressed = false;

                    if (this.canOrderUpgrade(currentLevel, currentOrd)) {
                        const orderResult = await HeroService.heroUpgradeOrder({ heroId });
                        if (orderResult && (orderResult.code === 0 || !orderResult.error)) {
                            await new Promise(resolve => setTimeout(resolve, 400));
                            const prevLevel = currentLevel;
                            const prevOrd = currentOrd;
                            heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);
                            currentLevel = heroData.level || 0;
                            currentOrd = heroData.order || 0;
                            this.updateDisplay(heroData);
                            progressed = currentLevel !== prevLevel || currentOrd !== prevOrd;
                        } else {
                            throw new Error(orderResult?.error || '进阶失败');
                        }
                    } else {
                        const remaining = targetLevel - currentLevel;
                        let useLevel = 1;

                        for (const stdLevel of standardLevels) {
                            if (stdLevel <= remaining) {
                                const judgement = this.judgeLevelUpgrade(currentLevel, stdLevel, currentOrd);
                                if (judgement === false) {
                                    useLevel = stdLevel;
                                    break;
                                }
                            }
                        }

                        const result = await HeroService.heroUpgradeLevel({ heroId, upgradeNum: useLevel });
                        if (result && (result.code === 0 || !result.error)) {
                            await new Promise(resolve => setTimeout(resolve, 400));
                            const prevLevel = currentLevel;
                            heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);
                            currentLevel = heroData.level || 0;
                            currentOrd = heroData.order || 0;
                            this.updateDisplay(heroData);
                            progressed = currentLevel !== prevLevel;

                            // 显示升级进度提示 (防止过于频繁可以优化一下，这里用简单的反馈)
                            if (currentLevel % 50 === 0 || currentLevel === targetLevel) {
                                this.showTip(`升级进度: ${currentLevel}/${targetLevel}`, 'info');
                            }
                        } else {
                            throw new Error(result?.error || '升级失败，可能金币不足');
                        }
                    }

                    // 无进展护栏：连续多次升级后等级/阶数均无变化，说明资源不足或异常，停止防止死循环
                    if (!progressed) {
                        noProgressCount++;
                        if (noProgressCount >= 3) {
                            throw new Error('连续多次无进展，可能资源不足，已停止');
                        }
                    } else {
                        noProgressCount = 0;
                    }
                }

                this.showTip(this.heroUpgradeShouldStop ? '升级已停止' : '自动升级完成', 'success');
            } catch (e) {
                this.showTip(`升级中断: ${e.message}`, 'error');
            } finally {
                this.heroUpgradeShouldStop = false;
                this.updateUpgradeButtons(false);
            }
        }

        async doHeroUpgradeToSpeed() {
            const heroId = this.heroUpgradeSelectedId;
            const targetSpeed = parseInt(document.getElementById('hero-up-target-speed').value, 10);

            if (!heroId) {
                this.showTip('请先选择武将', 'warning');
                return;
            }

            const ServerData = unsafeWindow.__require('ServerData');
            const dataIndex = unsafeWindow.__require("data-index");
            const HeroService = dataIndex.HeroService;
            let heroData = this.getFromMap(ServerData.ROLE.heroes, heroId);

            if (!heroData) return;

            let curSpeed = heroData.speed || 0;
            if (!targetSpeed) {
                this.showTip('请输入目标速度', 'warning');
                return;
            }

            this.heroUpgradeShouldStop = false;
            this.updateUpgradeButtons(true);

            try {
                let curLevel = heroData.level || 0;

                // 如果当前速度已经超过目标速度，必须先重生
                if (curSpeed > targetSpeed) {
                    this.showTip('当前速度已超标，正在执行重生流程...', 'info');

                    const currentSlot = heroData.battleTeamSlot !== undefined ? heroData.battleTeamSlot : heroData.slot;
                    const isOnBattle = currentSlot !== undefined && currentSlot !== null && currentSlot !== -1;

                    // 保存鱼灵信息，重生后恢复
                    const savedArtifactId = heroData.artifactId || 0;
                    const savedPearlId = heroData.pearlId || 0;

                    if (isOnBattle) {
                        this.showTip('下阵武将...', 'info');
                        if (typeof HeroService.sendGoBackBattle === 'function') {
                            await HeroService.sendGoBackBattle(currentSlot);
                        } else if (typeof HeroService.goBackBattle === 'function') {
                            await HeroService.goBackBattle({ slot: currentSlot });
                        }
                        await new Promise(r => setTimeout(r, 600));
                    }

                    this.showTip('重生武将...', 'info');
                    await HeroService.rebirth({ heroId: heroId });
                    await new Promise(r => setTimeout(r, 600));

                    if (isOnBattle) {
                        this.showTip('重新上阵...', 'info');
                        if (typeof HeroService.goIntoBattle === 'function') {
                            await HeroService.goIntoBattle({ slot: currentSlot, heroId: heroId });
                        }
                        await new Promise(r => setTimeout(r, 600));
                    }

                    // 恢复鱼灵
                    if (savedArtifactId > 0 && savedPearlId > 0) {
                        this.showTip('恢复鱼灵装备...', 'info');
                        try {
                            const ArtifactService = dataIndex.ArtifactService;
                            await ArtifactService.load({ heroId: heroId, itemId: savedArtifactId, targetHeroId: -1, pearlId: savedPearlId });
                            await new Promise(r => setTimeout(r, 400));
                        } catch (e) {
                            console.warn('[武将升级助手] 恢复鱼灵失败:', e);
                            this.showTip('鱼灵恢复失败，请手动装备', 'warning');
                        }
                    }

                    heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);
                    curLevel = heroData.level || 0;
                    curSpeed = heroData.speed || 0;
                    this.updateDisplay(heroData);
                    this.showTip('重生完毕，开始自动调节速度...', 'info');
                } else if (curSpeed === targetSpeed) {
                    this.showTip('已达到目标速度', 'success');
                    return;
                } else if (curLevel >= 6000) {
                    this.showTip('武将已满级', 'warning');
                    return;
                }

                const SAFETY_FACTOR = 1.3;
                const STEP_SIZES = [50, 10, 5, 1];
                const MAX_HISTORY_LENGTH = 20;
                let speedHistory = [];
                let avgSpeedPerLevel = 0;
                let isFirstUpgrade = true;

                let curOrder = heroData.order || 0;

                while (curSpeed < targetSpeed && curLevel < 6000 && !this.heroUpgradeShouldStop) {
                    if (this.canOrderUpgrade(curLevel, curOrder)) {
                        const orderResult = await HeroService.heroUpgradeOrder({ heroId });
                        if (orderResult && (orderResult.code === 0 || !orderResult.error)) {
                            await new Promise(resolve => setTimeout(resolve, 400));
                            heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);
                            curLevel = heroData.level || 0;
                            curOrder = heroData.order || 0;
                            curSpeed = heroData.speed || 0;
                            this.updateDisplay(heroData);
                            continue;
                        } else {
                            throw new Error(orderResult?.error || '进阶失败');
                        }
                    }

                    const remainingSpeed = targetSpeed - curSpeed;
                    let step = 1;

                    if (isFirstUpgrade) {
                        step = 1;
                    } else if (avgSpeedPerLevel > 0) {
                        for (const s of STEP_SIZES) {
                            const estimatedGain = s * avgSpeedPerLevel * SAFETY_FACTOR;
                            const wouldCrossOrder = this.judgeLevelUpgrade(curLevel, s, curOrder) !== false;
                            if (estimatedGain <= remainingSpeed && !wouldCrossOrder) {
                                step = s;
                                break;
                            }
                        }
                    } else {
                        for (const s of [10, 5, 1]) {
                            const wouldCrossOrder = this.judgeLevelUpgrade(curLevel, s, curOrder) !== false;
                            if (!wouldCrossOrder) {
                                if (s === 10 && remainingSpeed > 500) { step = 10; break; }
                                if (s === 5 && remainingSpeed > 100) { step = 5; break; }
                                if (s === 1) { step = 1; break; }
                            }
                        }
                    }

                    const prevSpeed = curSpeed;
                    const result = await HeroService.heroUpgradeLevel({ heroId, upgradeNum: step });

                    if (result && (result.code === 0 || !result.error)) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                        heroData = this.getFromMap(unsafeWindow.__require('ServerData').ROLE.heroes, heroId);

                        curLevel = heroData.level || 0;
                        curOrder = heroData.order || 0;
                        const newSpeed = heroData.speed || 0;

                        isFirstUpgrade = false;

                        if (newSpeed > prevSpeed) {
                            const speedGain = newSpeed - prevSpeed;
                            curSpeed = newSpeed;
                            if (step > 0) {
                                speedHistory.push({ levels: step, gain: speedGain });
                                if (speedHistory.length > MAX_HISTORY_LENGTH) {
                                    speedHistory = speedHistory.slice(-MAX_HISTORY_LENGTH);
                                }
                                const levelUpRecords = speedHistory.filter(h => h.levels > 0);
                                if (levelUpRecords.length > 0) {
                                    avgSpeedPerLevel = levelUpRecords.reduce((sum, h) => sum + h.gain / h.levels, 0) / levelUpRecords.length;
                                }
                            }
                        }
                        this.updateDisplay(heroData);
                        this.showTip(`调速进度: 速度 ${curSpeed}/${targetSpeed}`, 'info');
                    } else {
                        throw new Error(result?.error || '升级失败');
                    }
                }

                const finalMsg = curSpeed >= targetSpeed ? `达到/超出目标速度 ${curSpeed} (等级${curLevel})` : `已满级`;
                this.showTip(this.heroUpgradeShouldStop ? '升级已停止' : finalMsg, 'success');
            } catch (e) {
                this.showTip(`按速升级中断: ${e.message}`, 'error');
            } finally {
                this.heroUpgradeShouldStop = false;
                this.updateUpgradeButtons(false);
            }
        }

        injectUI() {
            const style = document.createElement('style');
            style.textContent = `
                .hu-root {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    z-index: 99999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .hu-toggle {
                    width: 50px;
                    height: 50px;
                    border-radius: 25px;
                    background: #ff9500;
                    color: white;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    cursor: pointer;
                    user-select: none;
                }
                .hu-panel {
                    display: none;
                    position: absolute;
                    bottom: 60px;
                    right: 0;
                    width: 300px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    padding: 20px;
                    color: #000;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .hu-panel.open {
                    display: block;
                }
                .hu-header {
                    font-size: 15px;
                    font-weight: 600;
                    margin-bottom: 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    letter-spacing: -0.5px;
                }
                .hu-header-actions {
                    display: flex;
                    gap: 8px;
                }
                .hu-icon-btn {
                    background: rgba(120, 120, 128, 0.16);
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #000;
                    transition: all 0.2s;
                }
                .hu-icon-btn:hover { background: rgba(120, 120, 128, 0.24); }
                .hu-icon-btn:active { transform: scale(0.95); }
                .hu-icon-btn svg { width: 14px; height: 14px; fill: currentColor; }
                
                .hu-select {
                    width: 100%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    border: none;
                    background: rgba(120, 120, 128, 0.12);
                    font-size: 13px;
                    color: #000;
                    margin-bottom: 16px;
                    outline: none;
                    appearance: none;
                    -webkit-appearance: none;
                    cursor: pointer;
                }
                .hu-info {
                    background: rgba(0, 122, 255, 0.08);
                    color: #007AFF;
                    padding: 12px 16px;
                    border-radius: 12px;
                    margin-bottom: 16px;
                    font-size: 13px;
                    line-height: 1.6;
                }
                .hu-info p { margin: 6px 0; display:flex; justify-content:space-between; align-items: center;}
                .hu-tabs {
                    display: flex;
                    margin-bottom: 16px;
                    background: rgba(120, 120, 128, 0.12);
                    border-radius: 10px;
                    padding: 2px;
                }
                .hu-tab {
                    flex: 1;
                    text-align: center;
                    padding: 8px 0;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: 8px;
                    color: rgba(60, 60, 67, 0.6);
                    transition: all 0.2s;
                }
                .hu-tab.active {
                    background: white;
                    color: #000;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04);
                }
                .hu-row { margin-bottom: 16px; }
                .hu-input {
                    width: 100%;
                    padding: 12px 14px;
                    border: none;
                    background: rgba(120, 120, 128, 0.12);
                    border-radius: 12px;
                    font-size: 13px;
                    color: #000;
                    box-sizing: border-box;
                    outline: none;
                    transition: background 0.2s;
                }
                .hu-input:focus { background: rgba(120, 120, 128, 0.16); }
                .hu-btn {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 12px;
                    background: #007aff;
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .hu-btn:hover { opacity: 0.9; }
                .hu-btn:active { transform: scale(0.97); }
                .hu-btn:disabled { background: #d1d1d6; color: #fff; cursor: not-allowed; opacity: 1; transform: none; }
                .hu-btn-order { background: rgba(52, 199, 89, 1); width: auto; padding: 6px 12px; border-radius: 8px; font-size: 12px; }
                .hu-btn-auto { background: rgba(52, 199, 89, 1); margin-top: 8px; }
                .hu-btn-stop { background: #ff3b30; display: none; margin-top: 8px; }
                .hu-tip { font-size: 11px; text-align: right; opacity: 0.8;}
            `;
            document.head.appendChild(style);

            const root = document.createElement('div');
            root.className = 'hu-root';

            root.innerHTML = `
                <div class="hu-toggle" id="hu-toggle">武将<br>升级</div>
                <div class="hu-panel" id="hu-panel">
                    <div class="hu-header">
                        <span>武将升级助手</span>
                        <div class="hu-header-actions">
                            <button class="hu-icon-btn" id="hu-refresh" title="刷新数据">
                                <svg viewBox="0 0 1024 1024"><path d="M582.4 864H170.666667c-6.4 0-10.666667-4.266667-10.666667-10.666667V170.666667c0-6.4 4.266667-10.666667 10.666667-10.666667h309.333333V320c0 40.533333 34.133333 74.666667 74.666667 74.666667h160v38.4c0 17.066667 14.933333 32 32 32s32-14.933333 32-32V298.666667c0-8.533333-4.266667-17.066667-8.533334-23.466667l-170.666666-170.666667c-6.4-6.4-14.933333-8.533333-23.466667-8.533333H170.666667C130.133333 96 96 130.133333 96 170.666667v682.666666c0 40.533333 34.133333 74.666667 74.666667 74.666667h411.733333c17.066667 0 32-14.933333 32-32s-14.933333-32-32-32z m132.266667-550.4v17.066667H554.666667c-6.4 0-10.666667-4.266667-10.666667-10.666667V160h19.2l151.466667 153.6z"></path><path d="M866.133333 669.866667l-106.666666-106.666667c-12.8-12.8-32-12.8-44.8 0s-12.8 32 0 44.8l51.2 51.2H512c-17.066667 0-32 14.933333-32 32S494.933333 725.333333 512 725.333333h253.866667l-51.2 51.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466666 8.533334s17.066667-2.133333 23.466667-8.533334l106.666667-106.666666c8.533333-10.666667 8.533333-32-2.133334-44.8z"></path></svg>
                            </button>
                            <button class="hu-icon-btn" id="hu-close" title="关闭">
                                <svg viewBox="0 0 1024 1024"><path d="M556.8 512L832 236.8c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0L512 467.2l-275.2-277.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l275.2 277.333333-277.333333 275.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333L512 556.8 787.2 832c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466666-8.533333c12.8-12.8 12.8-32 0-44.8L556.8 512z"></path></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div style="position: relative;">
                        <select class="hu-select" id="hero-up-select">
                            <option value="">请选择要升级的武将...</option>
                        </select>
                        <div style="position: absolute; right: 14px; top: 14px; pointer-events: none;">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>
                    
                    <div class="hu-info" id="hero-up-info" style="display:none;">
                        <p><span>等级：</span><strong id="hero-up-level" style="color:#000;">-</strong></p>
                        <p><span>攻击：</span><strong id="hero-up-attack" style="color:#000;">-</strong></p>
                        <p><span>速度：</span><strong id="hero-up-speed" style="color:#000;">-</strong></p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid rgba(0,122,255,0.1);">
                            <div class="hu-tip" id="hero-up-tip">已达最高阶</div>
                            <button class="hu-btn hu-btn-order" id="hero-up-order-btn">手动进阶</button>
                        </div>
                    </div>
                    
                    <div class="hu-tabs">
                        <div class="hu-tab active" id="hero-up-mode-level">目标等级</div>
                        <div class="hu-tab" id="hero-up-mode-speed">目标速度</div>
                    </div>
                    
                    <div class="hu-row" id="hero-up-level-row">
                        <input type="number" class="hu-input" id="hero-up-target-level" placeholder="输入目标等级 (如: 4000)" />
                    </div>
                    <div class="hu-row" id="hero-up-speed-row" style="display:none;">
                        <input type="number" class="hu-input" id="hero-up-target-speed" placeholder="输入目标速度" />
                    </div>
                    
                    <button class="hu-btn hu-btn-auto" id="hero-up-auto-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3v18l15-9L5 3z"/></svg>
                        开始自动升级
                    </button>
                    <button class="hu-btn hu-btn-stop" id="hero-up-stop-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
                        停止升级
                    </button>
                </div>
            `;
            document.body.appendChild(root);
            this.panel = root;

            this.bindEvents();
        }

        bindEvents() {
            document.getElementById('hu-toggle').addEventListener('click', () => {
                const panel = document.getElementById('hu-panel');
                panel.classList.toggle('open');
                if (panel.classList.contains('open') && this.heroOptionsList.length === 0) {
                    this.refreshHeroUpgradeData();
                }
            });
            
            document.getElementById('hu-close').addEventListener('click', () => {
                const panel = document.getElementById('hu-panel');
                if (panel) panel.classList.remove('open');
            });

            document.getElementById('hu-refresh').addEventListener('click', () => this.refreshHeroUpgradeData());
            document.getElementById('hero-up-select').addEventListener('change', (e) => this.selectHeroForUpgrade(e.target.value));

            document.getElementById('hero-up-mode-level').addEventListener('click', () => this.switchUpgradeMode('level'));
            document.getElementById('hero-up-mode-speed').addEventListener('click', () => this.switchUpgradeMode('speed'));

            document.getElementById('hero-up-order-btn').addEventListener('click', () => this.doHeroUpgradeOrder());
            document.getElementById('hero-up-auto-btn').addEventListener('click', () => this.doHeroAutoUpgradeByMode());
            document.getElementById('hero-up-stop-btn').addEventListener('click', () => this.stopHeroUpgrade());
        }

        // ========== FairyGUI 按钮注入（咸将面板） ==========

        startInjection() {
            let checkCount = 0;
            const maxChecks = 120;

            const injectionInterval = setInterval(() => {
                checkCount++;

                if (checkCount >= maxChecks) {
                    clearInterval(injectionInterval);
                    console.error('[武将升级助手] 注入超时，回退到HTML按钮');
                    // 超时则显示HTML浮动按钮兜底
                    const toggle = document.getElementById('hu-toggle');
                    if (toggle) toggle.style.display = 'flex';
                    return;
                }

                if (typeof unsafeWindow.__require !== 'function' ||
                    typeof unsafeWindow.fgui !== 'object') {
                    return;
                }

                if (this.tryInject()) {
                    clearInterval(injectionInterval);
                    console.log('[武将升级助手] FairyGUI按钮注入成功');
                }
            }, 500);
        }

        tryInject() {
            try {
                const HeroListPanelModule = unsafeWindow.__require('HeroListPanel');
                if (!HeroListPanelModule || !HeroListPanelModule.HeroListPanel) {
                    return false;
                }

                this.injectCustomButton(HeroListPanelModule.HeroListPanel);
                return true;
            } catch (error) {
                console.error('[武将升级助手] 注入失败:', error);
                return false;
            }
        }

        injectCustomButton(PanelClass) {
            const self = this;
            const originalOnShow = PanelClass.prototype.onShow;

            PanelClass.prototype.onShow = function () {
                originalOnShow.apply(this, arguments);

                if (!this._heroUpgradeBtn) {
                    try {
                        this._addHeroUpgradeButton(self);
                    } catch (error) {
                        console.error('[武将升级助手] 创建按钮失败:', error);
                    }
                }
            };

            PanelClass.prototype._addHeroUpgradeButton = function (helper) {
                // 创建 BtnInfo2 按钮（三横杠样式）
                const customButton = unsafeWindow.fgui.UIPackage.createObject('ui_common', 'BtnInfo2');
                if (!customButton) {
                    console.error('[武将升级助手] 创建BtnInfo2按钮失败');
                    return;
                }

                const btn = customButton.asButton;

                // 定位：在"咸将"标题文字右侧(即用户给出的红色方框区域)
                // 不要用 setSize（会破坏原始三条横杠图标的布局），改用 setScale 调整大小
                btn.setScale(0.8, 0.8);

                // 以 m_lord（主公区域）的顶部为参照，往上偏移到标题行
                if (this.ui.m_lord) {
                    btn.setPosition(110, this.ui.m_lord.y - 75);
                } else {
                    btn.setPosition(110, 8);
                }

                // 保留按钮自带的三条横杠图标 (n0)，不再隐藏，也不再添加额外文字标签

                // 点击事件 - 切换 HTML 面板显示
                btn.onClick(() => {
                    console.log('[武将升级助手] 打开升级面板');
                    const panel = document.getElementById('hu-panel');
                    if (panel) {
                        panel.classList.toggle('open');
                        if (panel.classList.contains('open') && helper.heroOptionsList.length === 0) {
                            helper.refreshHeroUpgradeData();
                        }
                    }
                });

                this.ui.addChild(btn);
                this._heroUpgradeBtn = btn;
            };

            // onHide 时清理
            const originalOnHide = PanelClass.prototype.onHide;
            PanelClass.prototype.onHide = function () {
                if (this._heroUpgradeBtn) {
                    this._heroUpgradeBtn.dispose();
                    this._heroUpgradeBtn = null;
                }
                // 关闭面板时也隐藏 HTML 面板
                const panel = document.getElementById('hu-panel');
                if (panel) panel.classList.remove('open');

                originalOnHide.apply(this, arguments);
            };
        }
    }

    new HeroUpgradeHelper();
})();
