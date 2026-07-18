// ==UserScript==
// @name         英雄属性增强显示
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  增强英雄属性提示框，显示所有属性数据
// @author       非酋
// @match        *://*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        checkInterval: 1000,
        maxRetries: 30
    };

    let gameReady = false;
    let checkTimer = null;
    let originalOnShow = null;
    let originalSeasonOnShow = null;

    function init() {
        waitForGameReady();
    }

    function waitForGameReady() {
        let retries = 0;
        checkTimer = setInterval(() => {
            const ready = isGameReady();
            
            if (ready) {
                gameReady = true;
                clearInterval(checkTimer);
                injectHooks();
            } else {
                retries++;
                if (retries > CONFIG.maxRetries * 10) {
                    clearInterval(checkTimer);
                }
            }
        }, CONFIG.checkInterval);
    }

    function isGameReady() {
        try {
            if (typeof window.__require !== 'function') {
                return false;
            }

            try {
                const HeroAttributeToolTip = window.__require("HeroAttributeToolTip");
                if (!HeroAttributeToolTip) return false;

                return true;
            } catch (e) {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    function injectHooks() {
        try {
            const HeroAttributeToolTip = window.__require("HeroAttributeToolTip");
            if (!HeroAttributeToolTip) {
                return;
            }

            const prototype = HeroAttributeToolTip.HeroAttributeToolTip.prototype;
            const seasonPrototype = HeroAttributeToolTip.SeasonHeroAttributeToolTip.prototype;

            if (prototype && prototype.onShow) {
                originalOnShow = prototype.onShow;
                prototype.onShow = enhancedOnShow;
            }

            if (seasonPrototype && seasonPrototype.onShow) {
                originalSeasonOnShow = seasonPrototype.onShow;
                seasonPrototype.onShow = enhancedOnShow;
            }
        } catch (e) {
        }
    }

    function enhancedOnShow() {
        const self = this;
        const ui = this.ui;
        const model = this.model;
        const heroId = model.get(this.constructor.OP_HERO_ID, 0);
        const hero = this.role.getHeroById(heroId);

        if (hero) {
            try {
                const ConstantConf = window.__require("Configs").ConstantConf;
                const LanguageExtModule = window.__require("LanguageExt");

                const basicAttrs = ConstantConf.config.basicBattleAttribute || [];
                const specialAttrs = ConstantConf.config.specialBattleAttribute || [];
                
                const allAttrKeys = new Set([...basicAttrs, ...specialAttrs]);
                
                if (hero.attribute && typeof hero.attribute.forEach === 'function') {
                    hero.attribute.forEach((value, key) => {
                        allAttrKeys.add(key);
                    });
                }

                const allAttrArray = Array.from(allAttrKeys);

                const basicAttrKeys = [5, 7, 6, 8];
                const specialAttrKeys = allAttrArray.filter(key => !basicAttrKeys.includes(key));

                ui.m_attr.numItems = basicAttrKeys.length;
                ui.m_advanceAttr.numItems = specialAttrKeys.length;

                for (let i = 0; i < basicAttrKeys.length; i++) {
                    const key = basicAttrKeys[i];
                    const item = ui.m_attr.getChildAt(i);
                    
                    if (!item) {
                        continue;
                    }

                    const attrName = LanguageExtModule.LanguageExt.getAttributeName(key);
                    let attrValue = '';

                    switch (key) {
                        case 5:
                            attrValue = hero.calculateAttack;
                            break;
                        case 7:
                            attrValue = hero.calculateDefense;
                            break;
                        case 6:
                            attrValue = hero.calculateSpeed;
                            break;
                        case 8:
                            attrValue = hero.calculateHp;
                            break;
                    }

                    if (item.m_attrName && item.m_value) {
                        item.m_attrName.text = attrName;
                        item.m_value.text = String(attrValue);
                        item.m_state.selectedPage = "base";
                    }
                }

                for (let i = 0; i < specialAttrKeys.length; i++) {
                    const key = specialAttrKeys[i];
                    const item = ui.m_advanceAttr.getChildAt(i);
                    
                    if (!item) {
                        continue;
                    }

                    let attrName = LanguageExtModule.LanguageExt.getAttributeName(key);
                    
                    if (key === 303) {
                        attrName = "定心";
                    }
                    
                    let rawValue = hero.attribute ? hero.attribute.get(key) : 0;
                    
                    if (rawValue === undefined || rawValue === null) {
                        rawValue = 0;
                    }
                    
                    let attrValue;
                    if (key === 9) {
                        attrValue = String(Math.round(rawValue));
                    } else {
                        attrValue = ((Math.round(10000 * rawValue)) / 100).toFixed(1) + '%';
                    }

                    if (item.m_attrName && item.m_value) {
                        item.m_attrName.text = attrName;
                        item.m_value.text = String(attrValue);
                        item.m_state.selectedPage = "advance";
                    }
                }

                ui.onceClick(this.close, this);

            } catch (e) {
                if (originalOnShow) {
                    originalOnShow.call(self);
                }
            }
        }
    }

    function restoreOriginal() {
        try {
            const HeroAttributeToolTip = window.__require("HeroAttributeToolTip");
            if (HeroAttributeToolTip) {
                const prototype = HeroAttributeToolTip.HeroAttributeToolTip.prototype;
                const seasonPrototype = HeroAttributeToolTip.SeasonHeroAttributeToolTip.prototype;

                if (prototype && originalOnShow) {
                    prototype.onShow = originalOnShow;
                    console.log('[英雄属性增强] 已恢复 HeroAttributeToolTip.onShow');
                }

                if (seasonPrototype && originalSeasonOnShow) {
                    seasonPrototype.onShow = originalSeasonOnShow;
                    console.log('[英雄属性增强] 已恢复 SeasonHeroAttributeToolTip.onShow');
                }
            }
        } catch (e) {
            console.error('[英雄属性增强] 恢复原始方法失败:', e);
        }
    }

    window.heroAttributeEnhancer = {
        restore: restoreOriginal,
        status: function() {
            return {
                gameReady: gameReady,
                hooked: originalOnShow !== null
            };
        }
    };

    init();
})();
