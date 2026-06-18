/**
 * 十殿阎罗挑战 - 战斗页面 Mock 数据 & 字典
 * 数据来源：真实十殿战斗抓包数据
 */
import captureData from "./nightmareBattleMockData.json";
import { HERO_DICT } from "./HeroList";

// ====== Boss ID → 名称字典（十殿阎罗 1~8 关） ======
export const bossDict = {
  1: { id: 1, name: "秦广王" },
  2: { id: 2, name: "楚江王" },
  3: { id: 3, name: "宋帝王" },
  4: { id: 4, name: "五官王" },
  5: { id: 5, name: "阎罗王" },
  6: { id: 6, name: "卞城王" },
  7: { id: 7, name: "泰山王" },
  8: { id: 8, name: "都市王" },
};

export function getBossName(level) {
  const boss = bossDict[level];
  return boss ? boss.name : `第${level}关Boss`;
}

// ====== 武将 ID → 名称字典 ======
// 使用全局 HERO_DICT 统一映射，避免本地硬编码与实际不一致
const heroNameDict = {
  107: "吕布", 108: "赵云", 109: "关羽", 110: "诸葛亮", 111: "曹操",
  112: "貂蝉", 113: "周瑜", 114: "司马懿", 115: "张飞", 116: "黄月英",
  117: "孙尚香", 118: "大乔", 119: "小乔", 120: "孙策", 121: "孙权",
  122: "刘备", 123: "太史慈", 124: "甘宁", 125: "吕蒙", 126: "陆逊",
  127: "郭嘉", 128: "贾诩", 129: "许褚", 130: "典韦", 131: "夏侯惇",
  140: "华佗", 141: "左慈", 142: "于吉", 143: "南华老仙",
};
export function getHeroName(heroId) {
  const id = Number(heroId);
  // 优先使用全局 HERO_DICT（项目中所有模块统一使用的武将字典）
  if (HERO_DICT[id]?.name) return HERO_DICT[id].name;
  // 兼容从抓包数据构建的映射
  if (captureHeroNames[id]) return captureHeroNames[id];
  return `武将#${heroId}`;
}

// ====== 从真实抓包数据中提取的武将名称（ID来自battleData.team） ======
// 在实际数据中，武将的 name 字段不在 battleData 中，需要额外映射
// 这里动态构建：从 captureData 的所有 roomInfo 中收集武将 ID
const captureHeroNames = {};

function buildHeroNamesFromCapture() {
  if (Object.keys(captureHeroNames).length > 0) return;
  
  const allRoomInfos = [];
  if (captureData.initialRoomInfo) allRoomInfos.push(captureData.initialRoomInfo);
  if (captureData.fightSnapshots) {
    captureData.fightSnapshots.forEach(s => {
      if (s.roomInfo) allRoomInfos.push(s.roomInfo);
    });
  }

  for (const ri of allRoomInfos) {
    const frb = ri.fightRoleBase || [];
    if (Array.isArray(frb)) {
      for (const member of frb) {
        const team = member.battleData?.team || {};
        for (const key of Object.keys(team)) {
          const hero = team[key];
          if (hero && hero.id && !captureHeroNames[hero.id]) {
            captureHeroNames[hero.id] = `武将${hero.id}`;
          }
        }
      }
    }
  }
}

// 初始化武将名称映射
buildHeroNamesFromCapture();

// ====== 怪物 ID → 名称字典 ======
const monsterNameDict = {};

function buildMonsterNamesFromCapture() {
  const allRoomInfos = [];
  if (captureData.initialRoomInfo) allRoomInfos.push(captureData.initialRoomInfo);
  if (captureData.fightSnapshots) {
    captureData.fightSnapshots.forEach(s => {
      if (s.roomInfo) allRoomInfos.push(s.roomInfo);
    });
  }

  for (const ri of allRoomInfos) {
    const mti = ri.monsterTeamInfo || {};
    for (const [level, info] of Object.entries(mti)) {
      const team = info.monsterTeam?.team || {};
      for (const [slotKey, monster] of Object.entries(team)) {
        const id = monster.id;
        if (id && !monsterNameDict[id]) {
          // 根据关卡编号生成名称
          const bossName = bossDict[Number(level)]?.name || `第${level}关Boss`;
          // 第一个怪物槽位通常是 BOSS
          const isFirst = parseInt(slotKey) === Math.min(...Object.keys(team).map(Number));
          monsterNameDict[id] = isFirst ? bossName : `${bossName}喽啰${slotKey}`;
        }
      }
    }
  }
}

buildMonsterNamesFromCapture();

export function getMonsterName(monsterId) {
  const id = Number(monsterId);
  // 精确匹配（从抓包数据构建的字典）
  if (monsterNameDict[id]) return monsterNameDict[id];
  // 动态推断：Boss ID = 1000X (5位), 喽啰 ID = 1000X0Y (7位)
  const idStr = String(id);
  if (idStr.length === 5 && idStr.startsWith("1000")) {
    const level = Number(idStr[4]);
    const bossName = bossDict[level]?.name;
    if (bossName) return bossName;
  }
  if (idStr.length === 7 && idStr.startsWith("1000")) {
    const level = Number(idStr[4]);
    const minionNum = idStr.slice(6);
    const bossName = bossDict[level]?.name;
    if (bossName) return `${bossName}喽啰${minionNum}`;
  }
  return `怪物#${monsterId}`;
}

// ====== 从抓包数据提取模拟数据 ======

/**
 * 获取初始房间信息（第一关，未出战前）
 */
export function getInitialRoomInfo() {
  return captureData.initialRoomInfo;
}

/**
 * 获取房间 ID
 */
export function getCaptureRoomId() {
  return captureData._meta?.captureRoomId || captureData.roomId || "28314045";
}

/**
 * 获取战斗快照总数
 */
export function getFightSnapshotCount() {
  return captureData.fightSnapshots?.length || 0;
}

/**
 * 根据出战序号获取对应的 roomInfo（模拟第 n 次出战后刷新）
 * @param {number} fightIndex - 出战序号（0-based）
 * @returns {object|null} roomInfo 数据
 */
export function getFightSnapshot(fightIndex) {
  const snapshots = captureData.fightSnapshots || [];
  if (fightIndex < 0 || fightIndex >= snapshots.length) return null;
  return snapshots[fightIndex].roomInfo || null;
}

/**
 * 根据出战序号获取出战 roleId
 */
export function getFightRoleId(fightIndex) {
  const snapshots = captureData.fightSnapshots || [];
  if (fightIndex < 0 || fightIndex >= snapshots.length) return null;
  return snapshots[fightIndex].roleId;
}

// ====== 战斗流程信息 ======
export const mockBattleMeta = {
  roomId: captureData._meta?.captureRoomId || "28314045",
  totalFights: captureData.fightSnapshots?.length || 0,
  fightSequence: captureData.fightSequence || [],
};

// ====== 兼容旧版（非测试模式） ======
export const mockGetRoleInfoResp = {
  nightMareData: {
    roomId: captureData._meta?.captureRoomId || "28314045",
  },
};

export const mockRoomInfoData = {
  roomInfo: captureData.initialRoomInfo || {},
};

export const mockBattleData = {
  teamId: "15127159",
  remainingTime: 150,
};
