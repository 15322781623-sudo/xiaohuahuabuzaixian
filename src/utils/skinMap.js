/**
 * 英雄皮肤ID映射表
 * skinId → { heroId, name } 以及 heroId → skinId[] 的双向映射
 */

/**
 * 皮肤字典：skinId → { heroId, name }
 * heroId: 对应英雄ID（101-121为橙将，201-228为紫将，301-314为红将）
 * name: 皮肤中文名称
 */
export const SKIN_DICT = {
  // ===== 司马懿 101 =====
  1009: { heroId: 101, name: "战神·司马懿" },
  10101: { heroId: 101, name: "机甲·司马懿" },
  10102: { heroId: 101, name: "沙滩派对·司马懿" },
  10103: { heroId: 101, name: "龙王·司马懿" },
  10108: { heroId: 101, name: "耀·龙王·司马懿" },
  10109: { heroId: 101, name: "玄武·司马懿" },
  10111: { heroId: 101, name: "山河锦绣·司马懿" },
  2001: { heroId: 101, name: "侠客·司马懿" },

  // ===== 郭嘉 102 =====
  1012: { heroId: 102, name: "战神·郭嘉" },
  10201: { heroId: 102, name: "机甲·郭嘉" },
  10202: { heroId: 102, name: "修理工·郭嘉" },
  10206: { heroId: 102, name: "镇元大仙·郭嘉" },
  10207: { heroId: 102, name: "「鱼」音绕梁·郭嘉" },
  2004: { heroId: 102, name: "侠客·郭嘉" },

  // ===== 关羽 103 =====
  1003: { heroId: 103, name: "战神·关羽" },
  10301: { heroId: 103, name: "机甲·关羽" },
  10302: { heroId: 103, name: "托塔天王·关羽" },
  10304: { heroId: 103, name: "狙神·关羽" },
  10307: { heroId: 103, name: "耀·托塔天王·关羽" },
  10308: { heroId: 103, name: "青龙·关羽" },
  10313: { heroId: 103, name: "山河锦绣·关羽" },
  2016: { heroId: 103, name: "墨家·关羽" },

  // ===== 诸葛亮 104 =====
  1014: { heroId: 104, name: "战神·诸葛亮" },
  10401: { heroId: 104, name: "机甲·诸葛亮" },
  10402: { heroId: 104, name: "乘风·诸葛亮" },
  10403: { heroId: 104, name: "玄奘·诸葛亮" },
  10404: { heroId: 104, name: "食神·诸葛亮" },
  10408: { heroId: 104, name: "青龙·诸葛亮" },
  10409: { heroId: 104, name: "白无常·诸葛亮" },
  2013: { heroId: 104, name: "墨家·诸葛亮" },

  // ===== 周瑜 105 =====
  1013: { heroId: 105, name: "战神·周瑜" },
  10501: { heroId: 105, name: "机甲·周瑜" },
  10502: { heroId: 105, name: "破浪·周瑜" },
  10503: { heroId: 105, name: "太上老君·周瑜" },
  10504: { heroId: 105, name: "替身·周瑜" },
  10508: { heroId: 105, name: "朱雀·周瑜" },
  10509: { heroId: 105, name: "耀·太上老君·周瑜" },
  2005: { heroId: 105, name: "风水师·周瑜" },

  // ===== 太史慈 106 =====
  1002: { heroId: 106, name: "战神·太史慈" },
  10601: { heroId: 106, name: "机甲·太史慈" },
  10602: { heroId: 106, name: "大法官·太史慈" },
  10603: { heroId: 106, name: "哪吒·太史慈" },
  10606: { heroId: 106, name: "风水师·太史慈" },
  10607: { heroId: 106, name: "朱雀·太史慈" },

  // ===== 吕布 107 =====
  1008: { heroId: 107, name: "战神·吕布" },
  10701: { heroId: 107, name: "机甲·吕布" },
  10702: { heroId: 107, name: "齐天大圣·吕布" },
  10703: { heroId: 107, name: "恶龙·吕布" },
  10704: { heroId: 107, name: "耀·齐天大圣·吕布" },
  10707: { heroId: 107, name: "摇摇虎·吕布" },
  10708: { heroId: 107, name: "至尊宝·吕布" },
  10711: { heroId: 107, name: "白虎·吕布" },
  10712: { heroId: 107, name: "天穹主宰·吕布" },
  10713: { heroId: 107, name: "天穹主宰(贰)·吕布" },
  10714: { heroId: 107, name: "天穹主宰(叁)·吕布" },
  2012: { heroId: 107, name: "炼器师·吕布" },

  // ===== 华佗 108 =====
  1010: { heroId: 108, name: "战神·华佗" },
  10801: { heroId: 108, name: "机甲·华佗" },
  10802: { heroId: 108, name: "神医·华佗" },
  10805: { heroId: 108, name: "南极仙翁·华佗" },
  10807: { heroId: 108, name: "青囊绘塾·华佗" },
  2009: { heroId: 108, name: "炼器师·华佗" },

  // ===== 甄姬 109 =====
  1007: { heroId: 109, name: "战神·甄姬" },
  10901: { heroId: 109, name: "机甲·甄姬" },
  10902: { heroId: 109, name: "兔女郎·甄姬" },
  10903: { heroId: 109, name: "广寒仙子·甄姬" },
  10908: { heroId: 109, name: "紫霞·甄姬" },
  10909: { heroId: 109, name: "玄武·甄姬" },
  2002: { heroId: 109, name: "侠客·甄姬" },

  // ===== 黄月英 110 =====
  1011: { heroId: 110, name: "战神·黄月英" },
  11001: { heroId: 110, name: "机甲·黄月英" },
  11002: { heroId: 110, name: "猫女·黄月英" },
  11005: { heroId: 110, name: "西梁女王·黄月英" },
  11006: { heroId: 110, name: "金牌教师·黄月英" },
  11009: { heroId: 110, name: "黑无常·黄月英" },
  2014: { heroId: 110, name: "墨家·黄月英" },

  // ===== 孙策 111 =====
  11101: { heroId: 111, name: "机甲·孙策" },
  11102: { heroId: 111, name: "牛魔王·孙策" },
  11103: { heroId: 111, name: "战神·孙策" },
  11104: { heroId: 111, name: "童年时光·孙策" },
  11107: { heroId: 111, name: "扬帆起航·孙策" },
  11108: { heroId: 111, name: "朱雀·孙策" },
  2006: { heroId: 111, name: "风水师·孙策" },

  // ===== 贾诩 112 =====
  11201: { heroId: 112, name: "机甲·贾诩" },
  11202: { heroId: 112, name: "小丑·贾诩" },
  11203: { heroId: 112, name: "战神·贾诩" },
  11204: { heroId: 112, name: "阎王·贾诩" },
  11208: { heroId: 112, name: "白虎·贾诩" },
  2011: { heroId: 112, name: "炼器师·贾诩" },

  // ===== 曹仁 113 =====
  1004: { heroId: 113, name: "战神·曹仁" },
  11301: { heroId: 113, name: "机甲·曹仁" },
  11302: { heroId: 113, name: "天蓬元帅·曹仁" },
  11304: { heroId: 113, name: "7仔·曹仁" },
  11307: { heroId: 113, name: "玄武·曹仁" },
  11308: { heroId: 113, name: "夜游神·曹仁" },
  2003: { heroId: 113, name: "侠客·曹仁" },

  // ===== 姜维 114 =====
  1001: { heroId: 114, name: "战神·姜维" },
  11401: { heroId: 114, name: "机甲·姜维" },
  11402: { heroId: 114, name: "裁判·姜维" },
  11403: { heroId: 114, name: "二郎真君·姜维" },
  11406: { heroId: 114, name: "唐伯虎·姜维" },
  11408: { heroId: 114, name: "耀·二郎真君·姜维" },
  11409: { heroId: 114, name: "青龙·姜维" },
  11411: { heroId: 114, name: "阴律司·姜维" },
  2015: { heroId: 114, name: "墨家·姜维" },

  // ===== 孙坚 115 =====
  1006: { heroId: 115, name: "战神·孙坚" },
  11501: { heroId: 115, name: "机甲·孙坚" },
  11502: { heroId: 115, name: "掌勺·孙坚" },
  11504: { heroId: 115, name: "卷帘大将·孙坚" },
  2007: { heroId: 115, name: "风水师·孙坚" },

  // ===== 公孙瓒 116 =====
  1005: { heroId: 116, name: "战神·公孙瓒" },
  11601: { heroId: 116, name: "机甲·公孙瓒" },
  11602: { heroId: 116, name: "马戏·公孙瓒" },
  11604: { heroId: 116, name: "白龙·公孙瓒" },
  11605: { heroId: 116, name: "中投靓仔·公孙瓒" },
  11608: { heroId: 116, name: "白虎·公孙瓒" },
  2010: { heroId: 116, name: "炼器师·公孙瓒" },

  // ===== 典韦 117 =====
  11703: { heroId: 117, name: "机甲·典韦" },
  11704: { heroId: 117, name: "观星者·典韦" },
  11705: { heroId: 117, name: "巨灵神·典韦" },
  11706: { heroId: 117, name: "侠客·典韦" },
  11707: { heroId: 117, name: "玄武·典韦" },

  // ===== 赵云 118 =====
  11803: { heroId: 118, name: "机甲·赵云" },
  11804: { heroId: 118, name: "敖丙·赵云" },
  11805: { heroId: 118, name: "观星者·赵云" },
  11806: { heroId: 118, name: "翎枪戏影·赵云" },
  11807: { heroId: 118, name: "墨家·赵云" },
  11808: { heroId: 118, name: "青龙·赵云" },

  // ===== 大乔 119 =====
  11903: { heroId: 119, name: "机甲·大乔" },
  11904: { heroId: 119, name: "铁扇公主·大乔" },
  11905: { heroId: 119, name: "西域蝶舞·大乔" },
  11906: { heroId: 119, name: "风水师·大乔" },
  3001: { heroId: 119, name: "观星者·大乔" },

  // ===== 张角 120 =====
  12003: { heroId: 120, name: "机甲·张角" },
  12004: { heroId: 120, name: "观星者·张角" },
  12005: { heroId: 120, name: "太乙真人·张角" },
  12006: { heroId: 120, name: "白虎·张角" },
  12007: { heroId: 120, name: "炼器师·张角" },

  // ===== 鲁肃 121 =====
  12103: { heroId: 121, name: "机甲·鲁肃" },
  12104: { heroId: 121, name: "朱雀·鲁肃" },
  12105: { heroId: 121, name: "财神·鲁肃" },
};

/**
 * 英雄 → 皮肤列表映射（从 SKIN_DICT 自动生成）
 * heroId → [{ skinId, name }]
 */
export const HERO_SKIN_MAP = {};
for (const [skinId, info] of Object.entries(SKIN_DICT)) {
  const id = Number(skinId);
  if (!HERO_SKIN_MAP[info.heroId]) {
    HERO_SKIN_MAP[info.heroId] = [];
  }
  HERO_SKIN_MAP[info.heroId].push({ skinId: id, name: info.name });
}

/**
 * 根据皮肤ID获取皮肤信息
 * @param {number} skinId 皮肤ID
 * @returns {{ heroId: number, name: string } | null}
 */
export function getSkinInfo(skinId) {
  return SKIN_DICT[skinId] || null;
}

/**
 * 根据皮肤ID获取皮肤名称
 * @param {number} skinId 皮肤ID
 * @returns {string} 皮肤名称，未找到返回 "未知皮肤(skinId)"
 */
export function getSkinName(skinId) {
  return SKIN_DICT[skinId]?.name || `未知皮肤(${skinId})`;
}

/**
 * 根据英雄ID获取该英雄所有皮肤
 * @param {number} heroId 英雄ID
 * @returns {Array<{ skinId: number, name: string }>}
 */
export function getHeroSkins(heroId) {
  return HERO_SKIN_MAP[heroId] || [];
}

/**
 * 获取所有有皮肤的英雄ID列表
 * @returns {number[]}
 */
export function getHeroesWithSkins() {
  return Object.keys(HERO_SKIN_MAP).map(Number).sort((a, b) => a - b);
}
