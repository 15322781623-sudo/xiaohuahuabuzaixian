// ==UserScript==
// @name         战斗飘字数值亿化助手
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  战斗飘字数值格式化（<1万显示原数字，>=1万显示"X万"，>=1亿显示"X亿"），并根据伤害类型显示不同颜色，增加深棕色描边和阴影效果，使用HYDianHeiW字体，修复大乔流离伤害显示问题
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
//
// 说明：
// - 飘字：hook FlyDamage/FlyCrit 等 m_number.text 及 CompFlyEffect.floatString，格式化为"X亿"。
// - 颜色：根据伤害类型设置不同颜色（暴击红色、治疗绿色、毒紫色等）。
// - 描边：深棕色描边，宽度4px。
// - 阴影：深棕色阴影，偏移(4, -4)，模糊度4px。
// - 字体：使用 HYDianHeiW（汉仪典黑）字体，使用游戏默认字体大小。
// - 门伤：UI_FlyDamageSkew 和 UI_FlyCritSkew 显示"门伤"前缀（打门/宝箱伤害）。
// - 流离：修复大乔流离技能触发时显示"i"看不清的问题，改为显示"流离"。
// - 若游戏更新导致模块名变化，本脚本可能需要同步更新。

(function () {
  "use strict";

  // ===== 通用工具 =====

  function log(msg, type = "info") {
    const prefix = "[战斗飘字亿化助手]";
    try {
      const colors = {
        info: "color:#60a5fa;",
        success: "color:#4ade80;",
        error: "color:#f87171;",
        warning: "color:#fbbf24;",
      };
      console.log(`%c${prefix} ${msg}`, colors[type] || "color:#aaa;");
    } catch {
      console.log(prefix, msg);
    }
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // 游戏飘字类型与数组下标对应（与 game 里 ["FlyDamage","FlyTreatment","FlyCrit",...] 一致）
  const DAMAGE_TYPE_LABELS = [
    "",      // 0: 普通伤害 - 不显示标签，保持简洁
    "+",     // 1: 治疗（保留 +）
    "\u66b4\u51fb",   // 2: 暴击
    "\u683c\u6321",   // 3: 格挡
    "\u6d41\u8840",   // 4: 流血
    "\u6bd2",        // 5: 毒
    "\u707c\u70e7",   // 6: 灼烧
    "\u6050",        // 7: 恐
    "\u540c\u5fc3",   // 8: 同心
    "\u534f\u529b",   // 9: 协力（原"援助"）
    "\u94c1\u8840",   // 10: 铁血
    "\u9752\u56ca",   // 11: 青囊
    "\u4ec1\u5fb7",   // 12: 仁德
    "\u7384\u673a",   // 13: 玄机
    "\u5251\u80c6",   // 14: 剑胆（原"简旦"）
    "\u95e8\u4f24",   // 15: 门伤（打门/宝箱普通伤害倾斜）
    "\u95e8\u4f24",   // 16: 门伤（打门/宝箱暴击伤害倾斜）
  ];

  // 飘字颜色配置 - 根据伤害类型设置不同颜色
  // 使用 cc.color(r, g, b, a) 格式
  const DAMAGE_TYPE_COLORS = [
    cc.color(254, 245, 175, 255),   // 0: 普通伤害 - 浅黄色
    cc.color(0, 255, 0, 255),       // 1: 治疗 - 绿色
    cc.color(255, 0, 0, 255),       // 2: 暴击 - 红色
    cc.color(255, 200, 0, 255),     // 3: 格挡 - 金黄色
    cc.color(139, 0, 0, 255),       // 4: 流血 - 深红色
    cc.color(128, 0, 128, 255),     // 5: 毒 - 紫色
    cc.color(255, 140, 0, 255),     // 6: 灼烧 - 橙色
    cc.color(75, 0, 130, 255),      // 7: 恐 - 靛蓝色
    cc.color(255, 165, 0, 255),     // 8: 同心 - 橙色
    cc.color(255, 200, 0, 255),     // 9: 协力 - 金黄色
    cc.color(178, 34, 34, 255),     // 10: 铁血 - 耐火砖红
    cc.color(0, 206, 209, 255),     // 11: 青囊 - 青色
    cc.color(255, 192, 203, 255),   // 12: 仁德 - 粉色
    cc.color(138, 43, 226, 255),    // 13: 玄机 - 蓝紫色
    cc.color(255, 69, 0, 255),      // 14: 剑胆 - 红橙色
    cc.color(0, 191, 255, 255),     // 15: 流离（普通伤害倾斜）- 深天蓝
    cc.color(255, 20, 147, 255),    // 16: 流离（暴击倾斜）- 深粉色
  ];

  // 描边和阴影配置
  const STROKE_CONFIG = {
    width: 3,                           // 描边宽度 3px
    color: cc.color(0, 0, 0, 255),  // 黑色描边（RGB： 0, 0, 0, 255）
  };

  const SHADOW_CONFIG = {
    offset: cc.v2(4, -4),               // 阴影偏移 4px
    color: cc.color(101, 67, 33, 180),  // 深棕色阴影 (RGB: 101, 67, 33)
    blur: 4,                            // 模糊度 4px
  };

  // 字体配置
  const FONT_CONFIG = {
    name: "HYDianHeiW",             // 汉仪典黑字体
  };

  // 格式化为"X亿"；若传入 damageType（CompFlyEffect.type），则用中文前缀区分暴击/格挡/流血等
  function formatToYi(raw, damageType) {
    if (raw == null) return "0";
    const original = String(raw).trim();
    // 如果已经是"X万"或"X亿"格式，不再二次处理
    if (original.endsWith("\u4ebf") || original.endsWith("\u4e07")) return original;

    // 处理游戏特殊标记："i"表示0伤害（大乔流离转移），"s"前缀表示特殊伤害
    let specialMark = "";
    let processedRaw = original;
    
    if (original === "i") {
      // "i" 是游戏内表示0伤害的标记（如大乔流离转移的伤害）
      return "\u6d41\u79bb"; // 显示"流离"
    } else if (original.startsWith("s")) {
      specialMark = "s";
      processedRaw = original.substring(1);
    }

    const m = processedRaw.match(/^([^\d\-\.]*)([\+\-]?)([\d\.]+)$/);
    if (!m) return original;

    let prefix = (m[1] || "") + (m[2] || "");
    const numStr = m[3];
    const num = Number(numStr);
    if (!isFinite(num)) return prefix + numStr;
    
    // 如果数值为0，返回0
    if (num === 0) return prefix + "0";

    const absNum = Math.abs(num);
    let suffix = "";
    
    // < 1万：显示原数字（如 1, 999）
    if (absNum < 10000) {
      suffix = String(Math.floor(absNum));
    }
    // >= 1万 且 < 1亿：显示"X万"（如 599万）
    else if (absNum < 1e8) {
      const wanUnits = Math.floor(absNum / 10000);
      suffix = String(wanUnits) + "\u4e07"; // "万"
    }
    // >= 1亿：根据数值大小保留不同小数位
    else {
      const yiValue = absNum / 1e8;
      if (yiValue < 10) {
        // 1亿-10亿：保留2位小数
        suffix = yiValue.toFixed(2) + "\u4ebf";
      } else if (yiValue < 100) {
        // 10亿-100亿：保留1位小数
        suffix = yiValue.toFixed(1) + "\u4ebf";
      } else {
        // 100亿以上：显示整数
        suffix = Math.floor(yiValue) + "\u4ebf";
      }
    }
    
    // 若已知伤害类型，用中文标签替代前缀（如"暴击"、"格挡"等）
    // 修复：即使是小数值（如大乔流离的1点伤害），也显示中文标签
    if (typeof damageType === "number" && damageType >= 0 && damageType < DAMAGE_TYPE_LABELS.length) {
      const label = DAMAGE_TYPE_LABELS[damageType];
      if (label !== undefined && label !== "") {
        // 对于小数值（<1万），也强制显示中文标签，避免"1"看不清
        return label + suffix;
      }
    }
    
    return prefix + suffix;
  }

  // 根据伤害类型获取颜色
  function getColorByDamageType(damageType) {
    if (typeof damageType === "number" && damageType >= 0 && damageType < DAMAGE_TYPE_COLORS.length) {
      return DAMAGE_TYPE_COLORS[damageType];
    }
    return cc.color(255, 255, 255, 255); // 默认白色
  }

  // 设置文本样式（颜色、描边、阴影、字体）
  function setTextStyle(textField, damageType) {
    if (!textField) return;
    
    try {
      // 设置字体
      if (typeof textField.font !== "undefined") {
        textField.font = FONT_CONFIG.name;
      }
      
      // 设置颜色
      if (textField.color && typeof textField.color.set === "function") {
        textField.color = getColorByDamageType(damageType);
      }
      
      // 设置描边（stroke）
      if (typeof textField.stroke !== "undefined") {
        textField.stroke = STROKE_CONFIG.width;
        if (textField.strokeColor && typeof textField.strokeColor.set === "function") {
          textField.strokeColor = STROKE_CONFIG.color;
        }
      }
      
      // 设置阴影
      if (typeof textField.shadowOffset !== "undefined") {
        textField.shadowOffset = SHADOW_CONFIG.offset;
        if (textField.shadowColor && typeof textField.shadowColor.set === "function") {
          textField.shadowColor = SHADOW_CONFIG.color;
        }
      }
    } catch (e) {
      // 忽略样式设置错误
    }
  }

  // 在某个 fgui 文本对象上 hook text 属性/方法
  function hookTextFieldToYi(textField, damageType) {
    if (!textField || textField.__yiHooked) return;

    try {
      // 优先尝试通过属性描述符 hook text 访问器
      let proto = textField;
      let desc = null;
      while (proto && !desc) {
        proto = Object.getPrototypeOf(proto);
        if (!proto) break;
        desc = Object.getOwnPropertyDescriptor(proto, "text");
      }

      if (desc && typeof desc.set === "function") {
        const origGet = desc.get;
        const origSet = desc.set;

        Object.defineProperty(textField, "text", {
          configurable: true,
          enumerable: true,
          get: function () {
            return origGet ? origGet.call(this) : this._text;
          },
          set: function (v) {
            const formatted = formatToYi(v, damageType);
            origSet.call(this, formatted);
            // 设置样式（颜色、描边、阴影）
            setTextStyle(this, damageType);
          },
        });

        textField.__yiHooked = true;
        return;
      }

      // 兼容：某些版本可能是 setText
      if (typeof textField.setText === "function") {
        const orig = textField.setText;
        textField.setText = function (v) {
          const formatted = formatToYi(v, damageType);
          orig.call(this, formatted);
          // 设置样式（颜色、描边、阴影）
          setTextStyle(this, damageType);
        };
        textField.__yiHooked = true;
        return;
      }
    } catch (e) {
      log("hookTextFieldToYi 出错: " + e, "error");
    }
  }

  // ===== 血量（xxxHP）格式化：仅处理以 HP 结尾的文本 =====
  function formatHpText(raw) {
    if (raw == null) return raw;
    const s = String(raw);
    const t = s.trim();
    if (!/HP$/i.test(t)) return s;
    // 去掉末尾 HP，只保留数值（以及可能的前缀文本），并按万/亿规则格式化
    const withoutHp = t.replace(/\s*HP$/i, "");
    return formatToYi(withoutHp);
  }

  function tryPatchHpTextGlobal() {
    const fgui = window.fgui || window.fairygui;
    const GTextField = fgui && fgui.GTextField;
    if (!GTextField || !GTextField.prototype) return false;
    if (GTextField.prototype.__hpFmtPatched) return false;

    // 找到 text 访问器
    let proto = GTextField.prototype;
    let desc = null;
    while (proto && !desc) {
      desc = Object.getOwnPropertyDescriptor(proto, "text");
      proto = Object.getPrototypeOf(proto);
    }

    if (desc && typeof desc.set === "function") {
      const origGet = desc.get;
      const origSet = desc.set;
      Object.defineProperty(GTextField.prototype, "text", {
        configurable: true,
        enumerable: true,
        get: function () {
          return origGet ? origGet.call(this) : this._text;
        },
        set: function (v) {
          let out = v;
          try {
            if (typeof v === "string" && /HP$/i.test(v.trim())) out = formatHpText(v);
          } catch (_) {}
          origSet.call(this, out);
        },
      });
      GTextField.prototype.__hpFmtPatched = true;
      return true;
    }

    // 兼容：某些版本可能只有 setText
    if (typeof GTextField.prototype.setText === "function") {
      const orig = GTextField.prototype.setText;
      GTextField.prototype.setText = function (v) {
        let out = v;
        try {
          if (typeof v === "string" && /HP$/i.test(v.trim())) out = formatHpText(v);
        } catch (_) {}
        return orig.call(this, out);
      };
      GTextField.prototype.__hpFmtPatched = true;
      return true;
    }

    return false;
  }

  // ===== 针对战斗飘字 UI 的 hook =====

  const FLY_UI_MODULE_NAMES = [
    "UI_FlyDamage",
    "UI_FlyDamageSkew",
    "UI_FlyCrit",
    "UI_FlyCritSkew",
    "UI_FlyBlock",
    "UI_FlyTreatment",
    "UI_FlyBleed",
    "UI_FlyPoison",
    "UI_FlyBurn",
    "UI_FlyTerrifying",
    "UI_FlyTongxin",
    "UI_FlyHelp",
    "UI_FlyTieXue",
    "UI_FlyQingNang",
    "UI_FlyRende",
    "UI_FlyXuanJi",
    "UI_FlyJianDan",
  ];

  // 根据模块名获取对应的伤害类型
  function getDamageTypeByModuleName(moduleName) {
    const typeMap = {
      "UI_FlyDamage": 0,
      "UI_FlyDamageSkew": 15,       // 流离（普通伤害倾斜）
      "UI_FlyTreatment": 1,
      "UI_FlyCrit": 2,
      "UI_FlyCritSkew": 16,         // 流离（暴击倾斜）
      "UI_FlyBlock": 3,
      "UI_FlyBleed": 4,
      "UI_FlyPoison": 5,
      "UI_FlyBurn": 6,
      "UI_FlyTerrifying": 7,
      "UI_FlyTongxin": 8,
      "UI_FlyHelp": 9,
      "UI_FlyTieXue": 10,
      "UI_FlyQingNang": 11,
      "UI_FlyRende": 12,
      "UI_FlyXuanJi": 13,
      "UI_FlyJianDan": 14,
    };
    return typeMap[moduleName] !== undefined ? typeMap[moduleName] : 0;
  }

  function tryPatchFlyUiModule(requireFn, moduleName) {
    let mod;
    try {
      mod = requireFn(moduleName);
    } catch {
      return false;
    }
    if (!mod) return false;

    const Cls = mod.default || mod[Object.keys(mod)[0]];
    if (!Cls || !Cls.prototype) return false;
    
    // 如果已经patch过，直接返回
    if (Cls.prototype.__yiPatched) return false;

    const damageType = getDamageTypeByModuleName(moduleName);

    const origOnConstruct = Cls.prototype.onConstruct;
    Cls.prototype.onConstruct = function () {
      if (typeof origOnConstruct === "function") {
        origOnConstruct.call(this);
      }
      // 大部分 FlyXXX UI 都有 m_number 字段；对局战力用 m_power.text = Number.abridge(power) 能显示"亿"，
      // 飘字 m_number 若用位图字体会吃字，这里强制改成默认字体（font = ""）以支持"亿"
      try {
        const tf = this.m_number || this.m_num || this.m_value;
        if (tf) {
          try {
            if (typeof tf.font !== "undefined") tf.font = FONT_CONFIG.name;
            if (typeof tf.asTextField !== "undefined" && tf.asTextField) tf.asTextField.font = FONT_CONFIG.name;
          } catch (_) {}
          hookTextFieldToYi(tf, damageType);
          // 直接设置样式（颜色、描边、阴影）
          setTextStyle(tf, damageType);
        }
      } catch (e) {
        log(`[${moduleName}] onConstruct hook 出错: ` + e, "error");
      }
    };

    Cls.prototype.__yiPatched = true;
    return true;
  }


  // ===== 启动入口（参考"鲨鱼之王扩展"轮询注入方式） =====

  window.battleFlyYiTimer = setInterval(() => {
    try {
      const requireFn =
        (window.__require && typeof window.__require === "function" && window.__require) ||
        (window.require && typeof window.require === "function" && window.require) ||
        null;

      if (!requireFn) {
        return;
      }

      // 用于决定何时停止轮询和记录已patch的模块
      window.__battleYiState = window.__battleYiState || { 
        compPatched: false, 
        hpPatched: false,
        patchedModules: new Set(),
        loggedSummary: false
      };
      
      let newPatchCount = 0;
      
      for (const name of FLY_UI_MODULE_NAMES) {
        try {
          if (!window.__battleYiState.patchedModules.has(name)) {
            if (tryPatchFlyUiModule(requireFn, name)) {
              window.__battleYiState.patchedModules.add(name);
              newPatchCount++;
            }
          }
        } catch (e) {
          // 单个模块失败不影响其他模块
        }
      }

      // 额外：直接在 CompFlyEffect 上 hook floatString，确保所有战斗飘字都走亿化
      try {
        const compMod = requireFn("comp-fly-effect");
        const CompFlyEffect = compMod && (compMod.CompFlyEffect || compMod.default);
        if (CompFlyEffect && !CompFlyEffect.__yiPatched) {
          const rawKey = "__yi_rawFloatString";
          const showKey = "__yi_showFloatString";
          Object.defineProperty(CompFlyEffect.prototype, "floatString", {
            configurable: true,
            enumerable: true,
            get() {
              return (this && this[showKey]) || (this && this[rawKey]) || "";
            },
            set(v) {
              if (!this) return;
              this[rawKey] = v;
              // 确保传入的 v 是字符串，并传递正确的 damageType
              const damageType = (typeof this.type === "number") ? this.type : 0;
              this[showKey] = formatToYi(String(v), damageType);
            },
          });
          CompFlyEffect.__yiPatched = true;
          window.__battleYiState.compPatched = true;
          newPatchCount++;
        } else if (CompFlyEffect && CompFlyEffect.__yiPatched) {
          window.__battleYiState.compPatched = true;
        }
      } catch (e) {
        // comp-fly-effect 不存在也没关系
      }

      // Hook SystemEffect.onEntityAdded 来设置飘字样式
      try {
        if (!window.__systemEffectPatched) {
          const systemEffectMod = requireFn("system-effect");
          const SystemEffect = systemEffectMod && (systemEffectMod.SystemEffect || systemEffectMod.default);
          if (SystemEffect && SystemEffect.prototype && SystemEffect.prototype.onEntityAdded) {
            const origOnEntityAdded = SystemEffect.prototype.onEntityAdded;
            SystemEffect.prototype.onEntityAdded = function(entity, group) {
              // 调用原始方法
              origOnEntityAdded.call(this, entity, group);
              
              // 获取 CompFlyEffect 组（通常是第一个）
              const matchers = this.getMatchers ? this.getMatchers() : [];
              if (matchers.length > 0 && group === matchers[0]) {
                try {
                  const compFlyEffect = entity.getComponent(requireFn("comp-fly-effect").CompFlyEffect);
                  if (compFlyEffect && compFlyEffect.display && compFlyEffect.display.ui) {
                    const ui = compFlyEffect.display.ui;
                    if (ui.m_number) {
                      // 设置样式（颜色、描边、阴影）
                      setTextStyle(ui.m_number, compFlyEffect.type);
                    }
                  }
                } catch (e) {
                  // 忽略错误
                }
              }
            };
            window.__systemEffectPatched = true;
            newPatchCount++;
          }
        }
      } catch (e) {
        // system-effect 不存在也没关系
      }

      try {
        if (!window.__battleYiState.hpPatched && tryPatchHpTextGlobal()) {
          newPatchCount++;
        }
        // 只要 patch 过一次，就认为完成
        if ((window.fgui || window.fairygui) && (window.fgui || window.fairygui).GTextField && (window.fgui || window.fairygui).GTextField.prototype.__hpFmtPatched) {
          window.__battleYiState.hpPatched = true;
        }
      } catch (_) {}

      // CompFlyEffect + HP 都打上补丁后，就可以停止轮询
      if (window.__battleYiState.compPatched && window.__battleYiState.hpPatched) {
        clearInterval(window.battleFlyYiTimer);
        window.battleFlyYiTimer = null;
        
        // 只输出一次总结日志
        if (!window.__battleYiState.loggedSummary) {
          const totalModules = window.__battleYiState.patchedModules.size;
          log(`战斗飘字亿化助手已启用（已patch ${totalModules} 个飘字模块）`, "success");
          window.__battleYiState.loggedSummary = true;
        }
      }
    } catch (err) {
      // 出错时打印日志，但不清掉定时器，方便后续重试
      log("轮询注入出错: " + err, "error");
    }
  }, 100);

  log("战斗飘字亿化助手已注入，等待游戏加载...", "info");
})();
