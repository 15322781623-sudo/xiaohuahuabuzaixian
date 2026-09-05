/**
 * 游戏增强配置与代码缓存（共享模块）
 * GameLogin.vue 和 TokenCard.vue 共用
 */

// ── localStorage Key ──
export const ENHANCE_KEY = '__game_enhancements__';
export const ENHANCE_CODES_KEY = '__game_enhance_codes__';
export const SCRIPTS_KEY = '__game_scripts__';

// ── 面板增强器依赖 ──
export const PANEL_ENHANCER_FILE = 'enhance-scripts/panel_enhancer.js';
export const PANEL_ENHANCER_DEPS = ['heroLevelUp', 'opponentWash', 'petMerge', 'gameEnhancePanel'];

// ── 默认启用（十殿加速默认关闭，需要时手动开启）──
export const DEFAULT_ENABLED = new Set(['skipPopup', 'skipAd', 'perfOpt', 'battleFlyYi', 'autoReconnect']);

// ── 增强功能列表 ──
export const ENHANCEMENTS = [
  // 基础增强（内联代码）
  { key: 'skipPopup', name: '跳过弹窗', desc: '自动关闭弹窗/公告/确认框', group: '基础' },
  { key: 'skipAd', name: '广告跳过', desc: '拦截激励视频，直接获得奖励', group: '基础' },
  { key: 'skipChest', name: '跳过宝箱', desc: '批量开宝箱跳过动画', group: '基础' },
  { key: 'redRefineSkip', name: '红淬跳过', desc: '跳过红色淬炼确认弹窗', group: '基础' },
  { key: 'heroAttrs', name: '属性增强', desc: '显示洗练等特殊战斗属性', file: 'enhance-scripts/hero_attrs_enhance.js', group: '基础' },
  { key: 'arenaReport', name: '战报增强', desc: '点击头像查看对手信息', group: '基础' },
  { key: 'perfOpt', name: '性能优化', desc: '30fps/禁粒子/锁定帧率/减装饰动画', group: '基础' },
  { key: 'disableSound', name: '关闭声音', desc: '自动关闭音乐/音效/震动/点击特效', group: '基础' },
  { key: 'disablePowerSave', name: '关闭省电', desc: '自动选择永不进入省电模式', group: '基础' },
  { key: 'autoReconnect', name: '自动重连', desc: '断线自动重连+保活，失败后刷新页面', file: 'enhance-scripts/auto_reconnect.js', group: '基础' },
  // 文件型增强（按需加载）
  { key: 'battleFlyYi', name: '战斗飘字', desc: '飘字亿化+颜色+描边+阴影+轮询优化', file: 'enhance-scripts/battle_fly_yi.js', group: '战斗' },
  { key: 'nightmareAccel', name: '十殿加速', desc: '十殿战斗加速+UI全局加速(可调)', file: 'enhance-scripts/nightmare_accel.js', group: '十殿' },
  { key: 'nightmareEnhance', name: '十殿增强', desc: '倒计时+自动解散+领奖+抽奖', file: 'enhance-scripts/nightmare_enhance.js', group: '十殿' },
  { key: 'evoTowerMerge', name: '怪异塔合成', desc: '一键合成+自动抽合+领奖', file: 'enhance-scripts/evo_tower_merge.js', group: '战斗' },
  { key: 'simulateBattle', name: '模拟对战', desc: '战斗模拟与数据分析', file: 'enhance-scripts/simulate_battle.js', group: '战斗' },
  { key: 'infiniteFormation', name: '无限阵容', desc: '阵容配置与管理增强', file: 'enhance-scripts/infinite_formation.js', group: '战斗' },
  { key: 'avatarSwap', name: '更换头像', desc: '修复H5环境更换头像功能', file: 'enhance-scripts/avatar_headimg_fix.js', group: '辅助' },
  { key: 'skinSwitch', name: '皮肤切换', desc: '武将皮肤切换功能', file: 'enhance-scripts/skin_switch.js', group: '辅助' },
  { key: 'fourSaintUpgrade', name: '四圣升级', desc: '四圣自动升级按钮', file: 'enhance-scripts/four_saint_upgrade.js', group: '升级' },
  { key: 'heroLevelUp', name: '武将升级', desc: '目标等级/速度智能升级', file: 'enhance-scripts/hero_level_up.js', group: '升级' },
  { key: 'quenchAccel', name: '洗炼加速', desc: '淬炼动画2.34x加速', file: 'enhance-scripts/quench_accel.js', group: '洗炼' },
  { key: 'quenchPanel', name: '洗炼面板', desc: '洗炼增强面板功能', file: 'enhance-scripts/quench_panel.js', group: '洗炼' },
  { key: 'saltedFishAnalysis', name: '咸鱼分析', desc: '数据分析与统计工具', file: 'enhance-scripts/salted_fish.js', group: '辅助' },
  { key: 'saltFieldZoom', name: '盐场视距', desc: '盐场无限视距缩放', file: 'enhance-scripts/salt_field_zoom.js', group: '辅助' },
  { key: 'gameEnhancePanel', name: '增强面板', desc: '游戏内增强浮动面板', file: 'enhance-scripts/game_enhance_panel.js', group: '辅助' },
  { key: 'achievementReward', name: '成就奖励', desc: '自动领取成就奖励', file: 'enhance-scripts/achievement_reward.js', group: '辅助' },
  { key: 'petMerge', name: '宠物合成', desc: '游戏内宠物合成增强', file: 'enhance-scripts/pet_merge.js', group: '升级' },
  { key: 'itemUse', name: '道具使用', desc: '批量使用道具/宝箱', file: 'enhance-scripts/item_use.js', group: '辅助' },
  { key: 'opponentWash', name: '对手洗练', desc: '自动查询对手洗练+历史记录', file: 'enhance-scripts/opponent_wash.js', group: '洗炼' },
  { key: 'starUpgrade', name: '升星助手', desc: '武将/图鉴/鱼灵自动升星', file: 'enhance-scripts/star_upgrade.js', group: '升级' },
];

// ── waitForModule 辅助函数 ──
const WFM_HELPER = `if(!window._wfm){window._wfm=function(n,cb){var c=setInterval(function(){try{if(typeof window.__require!=='function')return;var m=window.__require(n);if(m&&typeof m==='object'&&Object.keys(m).length>0){clearInterval(c);cb(m);}}catch(e){}},500);setTimeout(function(){clearInterval(c);},60000);};}`;

// ── 内联注入代码 ──
export const ENHANCE_CODE = {
  skipPopup: `(function(){${WFM_HELPER}window._wfm('FirstFaceToPlayerManager',function(m){var mgr=m.FirstFaceToPlayerManager?m.FirstFaceToPlayerManager:m;if(mgr&&mgr.instance){mgr.instance.setActive=function(){};console.log('[\\u8df3\\u8fc7\\u5f39\\u7a97] FirstFaceToPlayerManager\\u5df2\\u5c4f\\u853d');}else{console.warn('[\\u8df3\\u8fc7\\u5f39\\u7a97] instance\\u672a\\u627e\\u5230');}});})();`,
  skipAd: `(function(){var c=setInterval(function(){if(!window.wx)return;clearInterval(c);wx.createRewardedVideoAd=function(){var a={};a.load=function(){return Promise.resolve();};a.show=function(){setTimeout(function(){if(a._cb)a._cb({isEnded:true});},200);return Promise.resolve();};a.onClose=function(cb){a._cb=cb;};a.offClose=a.onError=a.offError=a.onLoad=a.offLoad=a.destroy=function(){return Promise.resolve();};return a;};if(window.HSDK)HSDK.showRewardVideoAd=function(o){if(o&&o.success)setTimeout(function(){o.success({isEnded:true});},200);};console.log('[广告跳过]已加载');},500);})();`,
  skipChest: `(function(){${WFM_HELPER}window._wfm('BoxPanel',function(m){if(m&&m.BoxPanel&&m.BoxPanel.prototype){var origOpen=m.BoxPanel.prototype._onOpenBox;m.BoxPanel.prototype._onOpenBox=function(){if(!window._skipBoxAnim)return origOpen.apply(this,arguments);var boxList=this.boxList;var idx=this._currentIndex;if(idx<0||idx>=boxList.length)return;var boxItem=boxList[idx];var itemId=boxItem.id;if(!window.ROLE)return;var qty=window.ROLE.getItemQuantity(itemId);if(qty===0)return;this._removeCoinAnim&&this._removeCoinAnim();var Configs=window.__require('Configs');var ModuleManager=window.__require('ModuleManager');var boxModule=ModuleManager.GET_MODULE(Configs.ModuleType.BOX);var openNum=boxModule.getOpenBoxNum(boxItem,qty);var LanguageExt=window.__require('LanguageExt');var TipsManager=window.__require('TipsManager');boxModule.sendOpenBox(itemId,openNum).then(function(rewards){if(rewards){boxModule.syncBoxPoint&&boxModule.syncBoxPoint();var cfg=Configs.ItemConf.getById(itemId);var name=cfg?LanguageExt.GET_CONTENT(cfg.name):'\\u5b9d\\u7bb1';TipsManager.SHOW_TIP('\\u5f00\\u542f '+openNum+' \\u4e2a'+name);}});};window._skipBoxAnim=true;console.log('[\\u5b9d\\u7bb1\\u8df3\\u8fc7]BoxPanel\\u5df2hook');}});})();`,
  redRefineSkip: `(function(){${WFM_HELPER}window._wfm('QuenchStageUpDialog',function(m){if(m&&m.QuenchStageUpDialog&&m.QuenchStageUpDialog.prototype){var orig=m.QuenchStageUpDialog.prototype._checkQuenchConfirm;m.QuenchStageUpDialog.prototype._checkQuenchConfirm=function(){if(this.isSkipRed)return false;return orig.apply(this,arguments);};console.log('[\\u7ea2\\u6dec\\u8df3\\u8fc7]_checkQuenchConfirm\\u5df2hook');}});})();`,
  arenaReport: `(function(){${WFM_HELPER}window._wfm('ArenaRecordDialog',function(m){if(m&&m.ArenaRecordDialog&&m.ArenaRecordDialog.prototype){var orig=m.ArenaRecordDialog.prototype._refreshSingleListItem;m.ArenaRecordDialog.prototype._refreshSingleListItem=function(e,t){var result=orig.call(this,e,t);var recordData=this.recordList&&this.recordList[e];if(recordData&&t.m_headIcon){var RankModule=window.__require('RankModule');t.m_headIcon.clearClick();t.m_headIcon.onClick(function(){RankModule.SHOW_ROLE_INFO(recordData.oppositeId);});}return result;};console.log('[\\u6218\\u62a5\\u589e\\u5f3a]ArenaRecordDialog\\u5df2hook');}});})();`,
  perfOpt: `(function(){var c=setInterval(function(){if(!window.cc||!cc.director)return;clearInterval(c);if(cc.game)cc.game.frameRate=30;if(cc.ParticleSystem){var op=cc.ParticleSystem.prototype.onLoad;if(op)cc.ParticleSystem.prototype.onLoad=function(){if(this.node)this.node.active=false;return op.apply(this,arguments);};}if(window.wx&&window.wx.vibrateShort)window.wx.vibrateShort=function(){};function lockFps(){try{if(cc.game&&cc.game.frameRate>30)cc.game.frameRate=30;}catch(e){}}if(cc.director.on)cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){setTimeout(lockFps,500);});console.log('[性能优化]30fps/禁粒子/锁定帧率');},500);})();`,
  disableSound: `(function(){var c=setInterval(function(){if(!window.cc||!cc.find)return;clearInterval(c);function muteAll(){try{var s=cc.director.getScene();if(!s)return;var labels=s.getComponentsInChildren? s.getComponentsInChildren(cc.Label):[];var audioKeys=['音乐','音效','震动','点击特效'];var clicked=0;labels.forEach(function(lb){var txt=(lb.string||'').trim();var nd=lb.node;if(!nd||!nd.active)return;if(audioKeys.indexOf(txt)!==-1){var p=nd.parent;if(!p)return;var btns=p.getComponentsInChildren? p.getComponentsInChildren(cc.Button):[];for(var i=0;i<btns.length;i++){var b=btns[i];if(!b||!b.node||!b.node.active)continue;var btnLabels=b.node.getComponentsInChildren? b.node.getComponentsInChildren(cc.Label):[];for(var j=0;j<btnLabels.length;j++){var bt=(btnLabels[j].string||'').trim();if(bt==='开启'){try{b._emitClickEvents&&b._emitClickEvents();console.log('[关闭声音]已关闭:',txt);clicked++;}catch(e){}break;}}}}});if(clicked>0)console.log('[关闭声音]已关闭'+clicked+'项');var ae=cc.audioEngine;if(ae){ae.setMusicVolume&&ae.setMusicVolume(0);ae.setEffectsVolume&&ae.setEffectsVolume(0);}cc.game&&cc.game.frameRate&&(cc.game.frameRate=Math.max(cc.game.frameRate,30));}catch(e){console.warn('[关闭声音]异常:',e);}}muteAll();cc.director.on&&cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){setTimeout(muteAll,1000);});console.log('[关闭声音]已加载');},500);})();`,
  disablePowerSave: `(function(){var c=setInterval(function(){if(!window.cc||!cc.find)return;clearInterval(c);function disablePS(){try{var s=cc.director.getScene();if(!s)return;var labels=s.getComponentsInChildren? s.getComponentsInChildren(cc.Label):[];var clicked=false;labels.forEach(function(lb){var txt=(lb.string||'').trim();if(txt==='永不'){var nd=lb.node;if(!nd||!nd.active)return;var p=nd.parent;var tog=p?p.getComponent? p.getComponent(cc.Toggle):null:null;if(tog){try{tog.isChecked=true;tog._emitToggleEvents&&tog._emitToggleEvents();console.log('[关闭省电]已选择永不');clicked=true;}catch(e){}}if(!clicked){var allTogs=s.getComponentsInChildren? s.getComponentsInChildren(cc.Toggle):[];for(var i=0;i<allTogs.length;i++){var t=allTogs[i];var tLabels=t.node.getComponentsInChildren? t.node.getComponentsInChildren(cc.Label):[];for(var j=0;j<tLabels.length;j++){if((tLabels[j].string||'').trim()==='永不'){try{t.isChecked=true;t._emitToggleEvents&&t._emitToggleEvents();console.log('[关闭省电]已选择永不');clicked=true;}catch(e){}break;}}if(clicked)break;}}}});if(!clicked)console.log('[关闭省电]未找到永不选项，将在下次场景切换重试');if(window.__GAME_SPEED__){var cur=window.__GAME_SPEED__.get();if(cur<1){window.__GAME_SPEED__.set(1);console.log('[关闭省电]恢复速度1x');}}}catch(e){console.warn('[关闭省电]异常:',e);}}disablePS();cc.director.on&&cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function(){setTimeout(disablePS,1000);});console.log('[关闭省电]已加载');},500);})();`,
};

// ── 脚本文件加载器 ──
const _scriptFileCache = new Map();

/**
 * 旧配置迁移
 * - wsReconnect 已合并入 autoReconnect：旧配置开启而新键关闭时强制启用，并移除旧键
 * - autoCleanBackpack 增强已下线：移除残留键，避免用户勾选状态悬空
 */
export function migrateEnhancementConfig(state) {
  if (!state || typeof state !== 'object') return state;
  if ('wsReconnect' in state) {
    if (state.wsReconnect === true && state.autoReconnect === false) {
      state.autoReconnect = true;
    }
    delete state.wsReconnect;
  }
  if ('autoCleanBackpack' in state) {
    delete state.autoCleanBackpack;
  }
  return state;
}

export async function loadScriptFile(filePath) {
  if (_scriptFileCache.has(filePath)) return _scriptFileCache.get(filePath);
  try {
    const resp = await fetch('/' + filePath);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const code = await resp.text();
    _scriptFileCache.set(filePath, code);
    return code;
  } catch(e) {
    console.warn('[增强] 加载脚本失败:', filePath, e.message);
    return null;
  }
}

// ── 收集启用增强的代码并缓存到 localStorage ──
export async function buildAndCacheEnhanceCodes(enhancementState, userScripts = []) {
  // 旧配置迁移：断线重连已合并入自动重连
  migrateEnhancementConfig(enhancementState);

  const needPanelEnhancer = () => PANEL_ENHANCER_DEPS.some(k => enhancementState[k]);
  const codes = [];

  if (needPanelEnhancer()) {
    const code = await loadScriptFile(PANEL_ENHANCER_FILE);
    if (code) codes.push({ name: '面板增强器', code });
  }

  for (const enh of ENHANCEMENTS) {
    if (!enhancementState[enh.key]) continue;
    if (enh.file) {
      const code = await loadScriptFile(enh.file);
      if (code) codes.push({ name: enh.name, code });
    } else if (ENHANCE_CODE[enh.key]) {
      codes.push({ name: enh.name, code: ENHANCE_CODE[enh.key] });
    }
  }

  // 用户自定义脚本
  const enabledScripts = (userScripts || []).filter(s => s.enabled);
  enabledScripts.forEach(s => codes.push({ name: s.name, code: s.code }));

  try {
    localStorage.setItem(ENHANCE_CODES_KEY, JSON.stringify(codes));
  } catch(e) {
    console.warn('[增强] 缓存代码失败:', e.message);
  }
  return codes;
}

/**
 * 确保增强代码已缓存（供 TokenCard.vue 等非 GameLogin 页面调用）
 * 如果 __game_enhance_codes__ 已存在则跳过
 */
export async function ensureEnhanceCodesCached() {
  try {
    const existing = localStorage.getItem(ENHANCE_CODES_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 旧缓存中若含已合并的「断线重连」代码，则重建为合并后的缓存
        const hasLegacy = parsed.some(c => c && c.name === '断线重连');
        if (!hasLegacy) return; // 已有缓存且无过期条目
      }
    }
  } catch(e) {}

  // 读取增强配置
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(ENHANCE_KEY) || '{}');
  } catch(e) {}
  // 旧配置迁移：断线重连已合并入自动重连
  migrateEnhancementConfig(state);
  // 填充默认值
  ENHANCEMENTS.forEach(e => { if (state[e.key] === undefined) state[e.key] = DEFAULT_ENABLED.has(e.key); });

  // 读取用户脚本
  let scripts = [];
  try {
    const raw = localStorage.getItem(SCRIPTS_KEY);
    if (raw) scripts = JSON.parse(raw);
  } catch(e) {}

  await buildAndCacheEnhanceCodes(state, scripts);
}
