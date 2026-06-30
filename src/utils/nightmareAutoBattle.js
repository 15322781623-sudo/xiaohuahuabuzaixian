/**
 * 十殿阎罗后台自动战斗服务
 * 从 NightmareBattle.vue 提取的无头战斗循环，支持后台执行 + 凌晨卡点第8关
 */
import { getMonsterName, getHeroName } from './nightmareBattleMock';

// 各关卡参考满血量
const BOSS_MAX_HP = {
  1: { boss: 225300000000, minion: 75120000000 },
  2: { boss: 247900000000, minion: 82640000000 },
  3: { boss: 272700000000, minion: 0 },
  4: { boss: 299900000000, minion: 0 },
  5: { boss: 329900000000, minion: 300500000000 },
  6: { boss: 300, minion: 0 },
  7: { boss: 751200000000, minion: 0 },
  8: { boss: 788800000000, minion: 0 },
};

const BOSS_NAME = {
  1: '秦广王', 2: '楚江王', 3: '宋帝王', 4: '五官王',
  5: '阎罗王', 6: '卞城王', 7: '泰山王', 8: '都市王',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class NightmareAutoBattleService {
  /**
   * @param {Object} opts
   * @param {string} opts.captainTokenId - 队长 tokenId
   * @param {string|number} opts.roomId - 战斗房间 ID
   * @param {string|number} opts.teamId - 组队 teamId（用于 matchteam_dismiss）
   * @param {Object} opts.presetData - 预设数据 { name, levelConfig, waitLevel8, ... }
   * @param {string} opts.captainRoleId - 队长 roleId
   * @param {Object} opts.tokenStore - Pinia tokenStore
   * @param {Array} [opts.activeBattles] - 活跃战斗列表引用（用于解散队伍时检查共享）
   * @param {Function} opts.onLog - 日志回调 (msg, type)
   * @param {Function} opts.onStatusChange - 状态变更回调 ({ status, currentLevel, ... })
   * @param {Function} opts.onComplete - 完成回调 ({ level, presetName })
   * @param {Function} opts.onError - 错误回调 (error)
   */
  constructor(opts) {
    this._captainTokenId = opts.captainTokenId;
    this._roomId = opts.roomId;
    this._teamId = opts.teamId;
    this._presetData = opts.presetData || {};
    this._captainRoleId = opts.captainRoleId;
    this._tokenStore = opts.tokenStore;
    this._activeBattles = opts.activeBattles || null;
    this._onLog = opts.onLog || (() => {});
    this._onStatusChange = opts.onStatusChange || (() => {});
    this._onComplete = opts.onComplete || (() => {});
    this._onError = opts.onError || (() => {});

    this._stopped = false;
    this._status = 'idle';
    this._currentLevel = 0;
    this._monsters = [];
    this._members = [];
    this._attackRecords = {}; // { [level]: [roleId1, roleId2] }
    this._isCompleted = false;
    this._startTime = Date.now();
    this._MAX_BATTLE_TIME = 2 * 60 * 60 * 1000; // 2小时超时（不含等待）
    this._waitStartTime = null;
    this._level8FirstEntry = false; // 卡点第8关标记
    this._consecutiveFightFails = 0; // 连续出战失败计数
    this._lastFailRoleId = null;     // 上次出战失败的成员 roleId
    this._cleanupDone = false;       // 清理标记，防止重复遣散
    this._preMidnightReconnectDone = false; // 23:59重连标记，防止分钟内重复执行
    this._reopenRetryCount = 0;      // 房间重建重试次数，最多1次

    // 解析预设队伍成员 roleId 列表（用于队长变更检测）
    this._presetMemberRoleIds = [];
    const memberTokenIds = (this._presetData?.memberTokenIds || []);
    for (const tid of memberTokenIds) {
      const token = this._tokenStore.gameTokens.find(t => t.id === tid);
      if (token?.roleId) {
        this._presetMemberRoleIds.push(String(token.roleId));
      }
    }
    // 队长也视为预设成员
    if (this._captainRoleId && !this._presetMemberRoleIds.includes(String(this._captainRoleId))) {
      this._presetMemberRoleIds.push(String(this._captainRoleId));
    }
  }

  getStatus() { return this._status; }
  getCurrentLevel() { return this._currentLevel; }
  getRoomId() { return this._roomId; }
  getTeamId() { return this._teamId; }
  getBossHp() {
    const boss = this._monsters.find(m => m.isBoss);
    if (!boss || !boss.maxHp) return null;
    return { curHp: boss.curHp, maxHp: boss.maxHp, name: boss.name };
  }

  /** 重绑定回调（组件 remount 后调用） */
  rebindCallbacks(callbacks) {
    if (callbacks.onLog) this._onLog = callbacks.onLog;
    if (callbacks.onStatusChange) this._onStatusChange = callbacks.onStatusChange;
    if (callbacks.onComplete) this._onComplete = callbacks.onComplete;
    if (callbacks.onError) this._onError = callbacks.onError;
  }

  stop() {
    this._stopped = true;
    this._status = 'stopped';
    this._onLog('后台战斗已手动停止', 'warning');
    this._onStatusChange({ status: 'stopped', presetName: this._presetData?.name });
  }

  /** 重连队长并继续战斗循环 */
  async resume() {
    if (this._status !== 'stopped' && this._status !== 'failed') {
      this._onLog('当前状态无需继续', 'info');
      return;
    }
    this._stopped = false;
    this._status = 'running';
    // 仅在周日且第8关时才重置卡点标记，避免周一resume后误触发等待
    const now = new Date();
    if (now.getDay() === 0 && this._currentLevel === 8) {
      this._level8FirstEntry = false;
    }
    this._startTime = Date.now();    // 重置超时计时
    this._cleanupDone = false;       // 重置清理标记
    this._onLog(`继续战斗：${this._presetData?.name || '未知预设'} Room: ${this._roomId}`, 'info');
    this._onStatusChange({ status: 'running', currentLevel: this._currentLevel, presetName: this._presetData?.name });

    try {
      // 重新获取房间信息
      const ok = await this._fetchRoomInfo();
      if (!ok) {
        this._onLog('获取房间信息失败，无法继续', 'error');
        this._status = 'failed';
        this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'room_info_failed' });
        return;
      }
      if (this._stopped) return;
      await sleep(2000);
      if (this._stopped) return;
      // 继续战斗循环
      await this._battleLoop();
    } catch (err) {
      if (!this._stopped) {
        this._status = 'failed';
        this._onLog(`继续战斗异常：${err.message || err}`, 'error');
        this._onError(err);
        this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, error: err.message });
      }
    } finally {
      if (!this._stopped && !this._cleanupDone) {
        this._cleanupDone = true;
        await this._dismissRoom(this._activeBattles);
      }
    }
  }

  async start() {
    this._status = 'running';
    this._onLog(`后台战斗启动：${this._presetData?.name || '未知预设'} Room: ${this._roomId}`, 'info');
    this._onStatusChange({ status: 'running', currentLevel: 0, presetName: this._presetData?.name });

    try {
      // 首次获取房间信息
      await this._fetchRoomInfo();
      if (this._stopped) return;

      // 等待3秒后首轮自动出战
      await sleep(3000);
      if (this._stopped) return;

      // 主战斗循环
      await this._battleLoop();
    } catch (err) {
      if (!this._stopped) {
        this._status = 'failed';
        this._onLog(`后台战斗异常：${err.message || err}`, 'error');
        this._onError(err);
        this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, error: err.message });
      }
    } finally {
      // 统一清理：确保战斗结束后一定解散队伍（_dismissRoom 内部已处理重复调用和错误码）
      if (!this._stopped && !this._cleanupDone) {
        this._cleanupDone = true;
        await this._dismissRoom(this._activeBattles);
      }
    }
  }

  // ====== 主战斗循环 ======
  async _battleLoop() {
    while (!this._stopped && !this._isCompleted) {
      // 超时保护
      if (Date.now() - this._startTime > this._MAX_BATTLE_TIME && this._status !== 'waiting_midnight') {
        this._onLog('后台战斗超时（2小时），自动停止并解散房间', 'warning');
        this._status = 'failed';
        await this._dismissRoom(this._activeBattles);
        this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'timeout' });
        break;
      }

      // 战斗前检查是否需要卡点等待（重新进入/续战时，若已在第8关且周日，先等待）
      if (this._shouldWaitForMidnight()) {
        await this._waitForMidnight();
        if (this._stopped) return;
        // 等待结束后确保队长连接（长时间等待可能导致断连）
        const reconnected = await this._ensureCaptainConnection();
        if (!reconnected) {
          this._onLog('队长重连失败，无法继续第8关', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reconnect_failed' });
          this._onError({ message: '凌晨卡点等待后队长重连失败', reason: 'reconnect_failed' });
          return;
        }
        await this._fetchRoomInfo();
        continue;
      }

      // 自动选择出战成员
      const result = this._getAutoAttacker();
      if (!result) {
        // 第1-7关全员出战但未通关：仅遣散战斗房间，保留队伍，重建重试（最多1次）
        if (this._currentLevel > 0 && this._currentLevel < 8) {
          const prevLevel = this._currentLevel;
          if (this._reopenRetryCount >= 1) {
            this._onLog(`第${this._currentLevel}关已重试1次仍未通关，结束挑战`, 'error');
            this._status = 'failed';
            this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'retry_limit_reached' });
            this._onError({ message: `第${this._currentLevel}关重试次数已达上限`, reason: 'retry_limit_reached' });
            return;
          }
          this._onLog(`第${this._currentLevel}关全员出战均未通过，遣散战斗房间重建重试...`, 'warning');
          // 防御性刷新：确认关卡确实未推进（防止服务器延迟导致误判）
          try {
            await this._fetchRoomInfo();
            if (this._currentLevel > prevLevel) {
              this._onLog(`关卡已推进到第${this._currentLevel}关，跳过重建`, 'info');
              continue;
            }
          } catch (e) {
            // 刷新失败，继续原有重建逻辑
          }
          // 仅遣散战斗房间（不解散队伍）
          try {
            await this._tokenStore.sendMessageWithPromise(
              this._captainTokenId, 'nightmare_dismiss',
              { roomId: Number(this._roomId) }, 10000
            );
            this._onLog('战斗房间已遣散（队伍保留）', 'success');
          } catch (err) {
            this._onLog(`遣散战斗房间失败: ${err.message || err}`, 'warning');
          }
          // 清空当前关卡出战记录，允许成员重新出战
          this._attackRecords[this._currentLevel] = [];
          // 重置成员阵亡状态
          this._members.forEach(m => { m.isAllHeroesDead = false; });
          await sleep(3000);
          if (this._stopped) return;
          // 重新开启战斗房间
          const newRoomId = await this._reopenRoom();
          if (!newRoomId) {
            this._onLog('重建房间失败，无法继续重试', 'error');
            this._status = 'failed';
            this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reopen_failed' });
            this._onError({ message: '重建房间失败', reason: 'reopen_failed' });
            return;
          }
          this._roomId = newRoomId;
          this._reopenRetryCount++;
          this._onLog(`重建房间成功，新 RoomId: ${newRoomId}`, 'success');
          await sleep(3000);
          if (this._stopped) return;
          await this._fetchRoomInfo();
          continue;
        }

        // 第8关：区分"全员阵亡"和"全员已出战但BOSS存活"
        if (this._currentLevel === 8) {
          if (this._isAllMembersDead()) {
            // 全员阵亡 → 失败
            this._onLog('❌ 第8关全员阵亡，直接结束并解散房间', 'error');
            await this._dismissRoom(this._activeBattles);
            this._status = 'failed';
            this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'level8_all_dead' });
            this._onError({ message: '第8关全员阵亡', reason: 'level8_all_dead' });
            return;
          }
          if (this._reopenRetryCount >= 1) {
            this._onLog('第8关已重试1次仍未击杀BOSS，结束挑战', 'error');
            this._status = 'failed';
            this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'retry_limit_reached' });
            this._onError({ message: '第8关重试次数已达上限', reason: 'retry_limit_reached' });
            return;
          }
          // 全员已出战但BOSS未击杀（部分存活但无可用成员）→ 清空记录重试
          this._onLog('第8关全员已出战但BOSS未击杀，遣散战斗房间重建重试...', 'warning');
          try {
            await this._tokenStore.sendMessageWithPromise(
              this._captainTokenId, 'nightmare_dismiss',
              { roomId: Number(this._roomId) }, 10000
            );
            this._onLog('战斗房间已遣散（队伍保留）', 'success');
          } catch (err) {
            this._onLog(`遣散战斗房间失败: ${err.message || err}`, 'warning');
          }
          this._attackRecords[8] = [];
          this._members.forEach(m => { m.isAllHeroesDead = false; });
          await sleep(3000);
          if (this._stopped) return;
          const newRoomId8 = await this._reopenRoom();
          if (!newRoomId8) {
            this._onLog('重建房间失败，无法继续重试', 'error');
            this._status = 'failed';
            this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reopen_failed' });
            this._onError({ message: '重建房间失败', reason: 'reopen_failed' });
            return;
          }
          this._roomId = newRoomId8;
          this._reopenRetryCount++;
          this._onLog(`重建房间成功，新 RoomId: ${newRoomId8}`, 'success');
          await sleep(3000);
          if (this._stopped) return;
          await this._fetchRoomInfo();
          continue;
        }

        // currentLevel 为 0 或 > 8（异常情况）
        this._onLog('无可用出战成员，结束战斗并解散队伍', 'warning');
        await this._dismissRoom(this._activeBattles);
        this._status = 'completed';
        this._onStatusChange({ status: 'completed', presetName: this._presetData?.name });
        this._onComplete({ level: this._currentLevel, reason: 'no_available_members' });
        return;
      }
      const { member: attacker, entry: attackerEntry } = result;

      // 检查恢复
      if (this._shouldAutoRecover(attacker, attackerEntry)) {
        this._onLog(`自动恢复 ${attacker.name}`, 'info');
        await this._memberRecover(attacker);
        await sleep(1000);
      }

      // 检查满怒
      if (this._shouldAutoFullRage(attacker, attackerEntry)) {
        this._onLog(`自动满怒 ${attacker.name}`, 'info');
        await this._memberFullRage(attacker);
        await sleep(1000);
      }

      // 出战
      const fightOk = await this._fight(attacker);
      if (fightOk === 'already_fought') {
        // 6100070: 已出战，直接换下一个成员
        this._consecutiveFightFails = 0;
        this._lastFailRoleId = null;
        continue;
      }
      if (!fightOk) {
        // 追踪连续失败：同一成员连续失败2次则标记为已出战并跳过
        const failRoleId = String(attacker.roleId);
        if (this._lastFailRoleId === failRoleId) {
          this._consecutiveFightFails++;
        } else {
          this._consecutiveFightFails = 1;
          this._lastFailRoleId = failRoleId;
        }
        if (this._consecutiveFightFails >= 2) {
          this._onLog(`${attacker.name} 连续出战失败${this._consecutiveFightFails}次，标记为已出战并跳过`, 'warning');
          if (!this._attackRecords[this._currentLevel]) this._attackRecords[this._currentLevel] = [];
          if (!this._attackRecords[this._currentLevel].includes(failRoleId)) {
            this._attackRecords[this._currentLevel].push(failRoleId);
          }
          this._consecutiveFightFails = 0;
          this._lastFailRoleId = null;
          continue;
        }
        this._onLog(`${attacker.name} 出战失败，等待5秒后重试`, 'error');
        await sleep(5000);
        // 先验证房间是否仍然有效
        const roomOk = await this._fetchRoomInfo();
        if (!roomOk) {
          this._onLog('房间已失效或不存在，无法继续战斗', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'room_invalid' });
          this._onError({ message: '出战失败后房间已失效', reason: 'room_invalid' });
          return;
        }
        // 检查连接状态，必要时重连
        const connOk = await this._ensureCaptainConnection();
        if (!connOk) {
          this._onLog('队长重连失败，无法继续战斗', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reconnect_failed' });
          this._onError({ message: '出战失败后重连失败', reason: 'reconnect_failed' });
          return;
        }
        continue;
      }

      // 出战成功，重置连续失败计数
      this._consecutiveFightFails = 0;
      this._lastFailRoleId = null;

      // 10秒战斗倒计时
      this._onLog(`⏱ 战斗进行中 10秒...`, 'info');
      await sleep(10000);
      if (this._stopped) return;

      // leadercomplete 结算
      const completeOk = await this._leaderComplete();
      if (!completeOk) {
        this._onLog('leadercomplete 失败，等待5秒后重试', 'error');
        await sleep(5000);
        // 先验证房间是否仍然有效
        const roomOk = await this._fetchRoomInfo();
        if (!roomOk) {
          this._onLog('房间已失效或不存在（可能已被服务器回收），无法继续战斗', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'room_invalid' });
          this._onError({ message: 'leadercomplete失败后房间已失效', reason: 'room_invalid' });
          return;
        }
        // 房间有效，检查连接状态
        const connOk = await this._ensureCaptainConnection();
        if (!connOk) {
          this._onLog('队长重连失败，无法继续战斗', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reconnect_failed' });
          this._onError({ message: 'leadercomplete失败后重连失败', reason: 'reconnect_failed' });
          return;
        }
        continue;
      }

      // 刷新房间信息
      await this._fetchRoomInfo();
      if (this._stopped) return;

      // 检查通关
      const completed = this._checkCompletion();
      if (completed) {
        this._isCompleted = true;
        this._onLog(`🎉 十殿阎罗挑战通关！`, 'success');
        await this._dismissRoom(this._activeBattles);
        this._status = 'completed';
        this._onComplete({ level: 8, presetName: this._presetData?.name });
        this._onStatusChange({ status: 'completed', presetName: this._presetData?.name });
        return;
      }

      // 检查第8关全员阵亡 → 直接结束并解散
      if (this._currentLevel === 8 && this._isAllMembersDead()) {
        this._onLog('❌ 第8关全员阵亡，直接结束并解散房间', 'error');
        await this._dismissRoom(this._activeBattles);
        this._status = 'failed';
        this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'level8_all_dead' });
        this._onError({ message: '第8关全员阵亡', reason: 'level8_all_dead' });
        return;
      }

      // 检查是否需要卡点等待（第7关刚打完，周日，waitLevel8开启）
      if (this._shouldWaitForMidnight()) {
        await this._waitForMidnight();
        if (this._stopped) return;
        // 等待结束后确保队长连接（长时间等待可能导致断连）
        const reconnected = await this._ensureCaptainConnection();
        if (!reconnected) {
          this._onLog('队长重连失败，无法继续第8关', 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'reconnect_failed' });
          this._onError({ message: '凌晨卡点等待后队长重连失败', reason: 'reconnect_failed' });
          return;
        }
        // 等待结束后刷新房间信息
        await this._fetchRoomInfo();
        continue;
      }

      // 18秒冷却
      this._status = 'cooling';
      this._onStatusChange({ status: 'cooling', currentLevel: this._currentLevel });
      this._onLog(`⏱ 冷却 18秒...`, 'info');
      await sleep(18000);
      if (this._stopped) return;

      this._status = 'running';
    }
  }

  // ====== 确保队长连接 ======
  async _ensureCaptainConnection() {
    const status = this._tokenStore.getWebSocketStatus(this._captainTokenId);
    if (status === 'connected') return true;

    this._onLog(`队长连接已断开（状态: ${status}），正在重新连接...`, 'warning');
    const captainToken = this._tokenStore.gameTokens.find(t => t.id === this._captainTokenId);
    if (!captainToken) {
      this._onLog('队长 Token 未找到，无法重连', 'error');
      return false;
    }

    this._tokenStore.createWebSocketConnection(
      this._captainTokenId, captainToken.token, captainToken.wsUrl || null
    );

    // 等待连接就绪（最多30秒）
    let retries = 0;
    while (this._tokenStore.getWebSocketStatus(this._captainTokenId) !== 'connected' && retries < 30) {
      await sleep(1000);
      retries++;
      if (this._stopped) return false;
    }

    if (this._tokenStore.getWebSocketStatus(this._captainTokenId) !== 'connected') {
      this._onLog('队长重连超时（30秒），无法继续战斗', 'error');
      return false;
    }

    this._onLog('队长重连成功', 'success');
    // 重连后等待2秒让连接稳定
    await sleep(2000);
    return true;
  }

  // ====== 强制断开重连队长（等待期间专用） ======
  async _forceReconnectCaptain() {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 1. 主动断开旧连接（createWebSocketConnection 内部会先关闭现有连接）
        const captainToken = this._tokenStore.gameTokens.find(t => t.id === this._captainTokenId);
        if (!captainToken) {
          this._onLog('队长 Token 未找到，无法重连', 'error');
          return false;
        }

        this._onLog(`🔄 强制重连队长 (第${attempt}/${MAX_RETRIES}次)...`, 'info');

        // 2. 创建新连接（createWebSocketConnection 内部自动关闭旧连接）
        this._tokenStore.createWebSocketConnection(
          this._captainTokenId, captainToken.token, captainToken.wsUrl || null
        );

        // 3. 轮询等待连接就绪（最多30秒）
        let retries = 0;
        while (this._tokenStore.getWebSocketStatus(this._captainTokenId) !== 'connected' && retries < 30) {
          await sleep(1000);
          retries++;
          if (this._stopped) return false;
        }

        if (this._tokenStore.getWebSocketStatus(this._captainTokenId) === 'connected') {
          this._onLog(`✅ 队长强制重连成功 (第${attempt}次)`, 'success');
          await sleep(2000); // 稳定连接
          return true;
        }

        this._onLog(`❌ 队长重连超时 (第${attempt}/${MAX_RETRIES}次)`, 'warning');
      } catch (err) {
        this._onLog(`❌ 队长重连异常 (第${attempt}次): ${err.message || err}`, 'error');
      }

      // 重试前等待5秒
      if (attempt < MAX_RETRIES) {
        await sleep(5000);
        if (this._stopped) return false;
      }
    }

    this._onLog('❌ 队长强制重连全部失败（3次），连接不可用', 'error');
    return false;
  }

  // ====== 获取房间信息 ======
  async _fetchRoomInfo() {
    try {
      const resp = await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'nightmare_getroominfo',
        { roomId: this._roomId }, 10000
      );
      const roomInfo = resp?.roomInfo || resp?.body?.roomInfo || resp;
      const captainRoleId = resp?.captainRoleId || this._captainRoleId || '';

      // 队长变更检测（不更新 this._captainRoleId，保持原始预设队长用于后续纠正）
      const serverCaptainRoleId = String(captainRoleId || '');
      if (serverCaptainRoleId && serverCaptainRoleId !== String(this._captainRoleId)) {
        this._onLog(`⚠️ 服务端队长变更: 预设=${this._captainRoleId} → 服务端=${serverCaptainRoleId}`, 'warning');
        // 检查新队长是否在预设成员列表中
        if (this._presetMemberRoleIds.length > 0 && !this._presetMemberRoleIds.includes(serverCaptainRoleId)) {
          this._onLog(`🚨 严重异常: 服务端队长 ${serverCaptainRoleId} 不在预设成员列表中！预设成员: [${this._presetMemberRoleIds.join(', ')}]`, 'error');
        }
      }

      this._parseRoomInfo(roomInfo, serverCaptainRoleId || this._captainRoleId);
      return true;
    } catch (err) {
      this._onLog(`获取房间信息失败: ${err.message || err}`, 'error');
      return false;
    }
  }

  // ====== 解析房间信息 ======
  _parseRoomInfo(roomInfo, serverCaptainRoleId) {
    if (!roomInfo) return;

    const prevLevel = this._currentLevel;
    this._currentLevel = roomInfo.curMonsterCfgId || 0;

    // 关卡推进时重置重建重试计数
    if (this._currentLevel !== prevLevel && this._currentLevel > 0) {
      this._reopenRetryCount = 0;
      if (prevLevel > 0) {
        this._onLog(`关卡推进: 第${prevLevel}关 → 第${this._currentLevel}关，重置重试计数`, 'info');
      }
    }

    // 解析怪物
    const monsterTeamInfo = roomInfo.monsterTeamInfo || {};
    const curLevel = String(this._currentLevel);
    const levelMonsterInfo = monsterTeamInfo[curLevel];
    const monsterTeam = levelMonsterInfo?.monsterTeam?.team || {};
    const curMonsterData = levelMonsterInfo?.curMonsterData || {};

    if (Object.keys(monsterTeam).length > 0) {
      const refData = BOSS_MAX_HP[Number(curLevel)] || { boss: 0, minion: 0 };
      const parsedMonsters = [];
      for (const [slotKey, data] of Object.entries(monsterTeam)) {
        if (!data) continue;
        const isBoss = String(data.id).length <= 6;
        const monsterId = String(data.id);
        const cd = curMonsterData[monsterId] || {};
        const refMaxHp = isBoss ? refData.boss : refData.minion;
        const maxHp = refMaxHp > 0 ? refMaxHp : (data.hp || 0);
        const curHp = cd.curHp != null ? cd.curHp : maxHp;
        parsedMonsters.push({
          id: data.id, name: getMonsterName(data.id),
          maxHp, curHp: Number(curHp), isBoss,
        });
      }
      this._monsters = parsedMonsters;
    } else {
      this._monsters = [];
    }

    // 上报状态（含 BOSS 血量）
    const bossHp = this.getBossHp();
    this._onStatusChange({ status: this._status, currentLevel: this._currentLevel, bossHp });

    // 解析成员
    const fightRoleBase = roomInfo.fightRoleBase || {};
    const playerTeamInfo = roomInfo.playerTeamInfo || {};
    const parsedMembers = [];
    const frbEntries = Array.isArray(fightRoleBase)
      ? fightRoleBase.map((m) => [String(m.roleId), m])
      : Object.entries(fightRoleBase);

    for (const [roleId, roleData] of frbEntries) {
      if (!roleData) continue;
      const team = roleData.battleData?.team || {};
      const curHeroData = playerTeamInfo[roleId]?.curHeroData || {};

      const heroes = [];
      for (let i = 0; i < 5; i++) {
        const heroData = team[String(i)];
        if (heroData && heroData.id) {
          const heroIdStr = String(heroData.id);
          const curData = curHeroData[heroIdStr] || curHeroData[heroData.id] || {};
          const fullHp = heroData.hp || 0;
          const curHpVal = curData.curHp != null ? curData.curHp : fullHp;
          heroes.push({
            id: heroData.id, name: getHeroName(heroData.id),
            curHp: Number(curHpVal), isAlive: Number(curHpVal) > 0,
          });
        }
      }

      const isAllHeroesDead = heroes.length > 0 && heroes.every(h => !h.isAlive);
      parsedMembers.push({
        roleId: String(roleId),
        name: roleData.name || String(roleId),
        heroes, isAllHeroesDead,
        isCaptain: String(roleId) === String(serverCaptainRoleId),
      });
    }

    // 仅在服务器返回了有效成员数据时更新（避免临时空响应导致陈旧成员被清除）
    if (parsedMembers.length > 0) {
      this._members = parsedMembers;
    } else if (this._members.length > 0) {
      this._onLog('房间信息中无成员数据，保留上次成员列表', 'warning');
    }
  }

  // ====== 选人出战（对应 getAutoAttacker） ======
  _getAutoAttacker() {
    const priority = this._presetData?.levelConfig?.[this._currentLevel]?.priority || [];
    const foughtList = this._attackRecords[this._currentLevel] || [];
  
    // 调试日志：显示预设出战顺序和当前成员
    const memberNames = this._members.map(m => `${m.name}${m.isAllHeroesDead ? '(亡)' : ''}`).join(', ');
    this._onLog(`第${this._currentLevel}关 预设顺序${priority.length}人, 已出战${foughtList.length}人, 成员[${memberNames}]`, 'info');
  
    for (const entry of priority) {
      let roleId = this._resolveRoleId(entry);
      let member = this._members.find(m => String(m.roleId) === roleId);
      if (!member) {
        const nameResolved = this._resolveRoleIdByName(entry);
        if (nameResolved) {
          roleId = nameResolved;
          member = this._members.find(m => String(m.roleId) === roleId);
        }
      }
      if (!member) {
        this._onLog(`成员 ${entry.slice(0, 8)} 未匹配到（roleId: ${roleId}）`, 'warning');
        continue;
      }
      if (foughtList.includes(roleId)) {
        this._onLog(`${member.name} 已出战过，跳过`, 'info');
        continue;
      }
      if (member.isAllHeroesDead) {
        this._onLog(`${member.name} 全部阵亡，跳过`, 'warning');
        continue;
      }
      this._onLog(`选中出战: ${member.name} (roleId: ${roleId})`, 'success');
      return { member, entry };
    }
  
    // 兆底：找任何未出战的活人
    for (const member of this._members) {
      if (!member.isAllHeroesDead && !foughtList.includes(String(member.roleId))) {
        this._onLog(`使用兆底出战: ${member.name}`, 'info');
        return { member, entry: null };
      }
    }
    return null;
  }

  _resolveRoleId(entry) {
    const token = this._tokenStore.gameTokens.find(t => t.id === entry);
    if (token?.roleId) return String(token.roleId);
    return String(entry);
  }

  _resolveRoleIdByName(entry) {
    const token = this._tokenStore.gameTokens.find(t => t.id === entry);
    if (!token?.name) return null;
    const member = this._members.find(m => m.name === token.name);
    return member ? String(member.roleId) : null;
  }

  _getConfigValue(configMap, member, priorityEntry) {
    if (!configMap) return false;
    if (priorityEntry && configMap[priorityEntry]) return true;
    if (member.roleId && configMap[String(member.roleId)]) return true;
    return false;
  }

  _shouldAutoRecover(member, priorityEntry) {
    const configMap = this._presetData?.levelConfig?.[this._currentLevel]?.recovery;
    return this._getConfigValue(configMap, member, priorityEntry);
  }

  _shouldAutoFullRage(member, priorityEntry) {
    const configMap = this._presetData?.levelConfig?.[this._currentLevel]?.fullRage;
    return this._getConfigValue(configMap, member, priorityEntry);
  }

  // ====== 出战 ======
  async _fight(member) {
    if (member.isAllHeroesDead) {
      this._onLog(`${member.name} 武将全部阵亡，无法出战`, 'warning');
      return false;
    }
    this._status = 'fighting';
    this._onLog(`${member.name} 出战！（第${this._currentLevel}关 ${BOSS_NAME[this._currentLevel] || ''}）`, 'info');
    try {
      await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'nightmare_fight',
        { roomId: this._roomId, roleId: Number(member.roleId) }, 10000
      );
      // 记录已出战
      if (!this._attackRecords[this._currentLevel]) this._attackRecords[this._currentLevel] = [];
      this._attackRecords[this._currentLevel].push(String(member.roleId));
      return true;
    } catch (err) {
      const errMsg = err.message || String(err);
      // 6100070: 成员已出战，标记为已出战并跳过，自动切换下一个成员
      if (errMsg.includes('6100070')) {
        this._onLog(`${member.name} 已出战过（6100070），标记并跳过`, 'warning');
        if (!this._attackRecords[this._currentLevel]) this._attackRecords[this._currentLevel] = [];
        if (!this._attackRecords[this._currentLevel].includes(String(member.roleId))) {
          this._attackRecords[this._currentLevel].push(String(member.roleId));
        }
        return 'already_fought';
      }
      // 7100020: 成员已在此房间/房间状态异常，视为已出战
      if (errMsg.includes('7100020')) {
        this._onLog(`${member.name} 已在此房间（7100020），标记并跳过`, 'warning');
        if (!this._attackRecords[this._currentLevel]) this._attackRecords[this._currentLevel] = [];
        if (!this._attackRecords[this._currentLevel].includes(String(member.roleId))) {
          this._attackRecords[this._currentLevel].push(String(member.roleId));
        }
        return 'already_fought';
      }
      // 7100140: 限流中，等待恢复
      if (errMsg.includes('7100140')) {
        this._onLog(`${member.name} 出战失败，限流中，等待恢复即可`, 'warning');
        return false;
      }
      this._onLog(`出战失败: ${errMsg}`, 'error');
      return false;
    }
  }

  // ====== leadercomplete 结算 ======
  async _leaderComplete() {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this._tokenStore.sendMessageWithPromise(
          this._captainTokenId, 'nightmare_leadercomplete',
          { roomId: this._roomId }, 10000
        );
        return true;
      } catch (err) {
        if (attempt < 3) await sleep(2000);
      }
    }
    return false;
  }

  // ====== 恢复 ======
  async _memberRecover(member) {
    try {
      await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'nightmare_restore',
        { roomId: this._roomId, roleId: Number(member.roleId) }, 10000
      );
      await this._fetchRoomInfo();
    } catch (err) {
      this._onLog(`恢复指令失败: ${err.message || err}`, 'warning');
    }
  }

  // ====== 满怒 ======
  async _memberFullRage(member) {
    try {
      await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'nightmare_fullrage',
        { roomId: this._roomId, targetRoleId: Number(member.roleId) }, 10000
      );
      await this._fetchRoomInfo();
    } catch (err) {
      this._onLog(`满怒指令失败: ${err.message || err}`, 'warning');
    }
  }

  // ====== 检查通关 ======
  _checkCompletion() {
    const allMonstersDead = this._monsters.length > 0 && this._monsters.every(m => m.curHp <= 0);
    const isLevel8Cleared = this._currentLevel === 8 && allMonstersDead;
    return this._currentLevel > 8 || isLevel8Cleared;
  }

  // ====== 检查全员阵亡 ======
  _isAllMembersDead() {
    return this._members.length > 0 && this._members.every(m => m.isAllHeroesDead);
  }

  // ====== 重新开启战斗房间（保留队伍） ======
  async _reopenRoom() {
    try {
      const openResp = await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'matchteam_openteam',
        { teamId: Number(this._teamId) }, 10000
      );
      let roomId = openResp?.roomId || openResp?.roomid || openResp?.roomInfo?.roomId || null;
      if (roomId) return String(roomId);
      this._onLog(`[debug] _reopenRoom: 无法从响应中提取 roomId，原始响应: ${JSON.stringify(openResp || null)}`, 'warning');

      // 轮询 nightmare_getroleinfo 获取新 roomId
      for (let attempt = 1; attempt <= 5; attempt++) {
        await sleep(3000);
        try {
          const resp = await this._tokenStore.sendMessageWithPromise(
            this._captainTokenId, 'nightmare_getroleinfo',
            { roleId: Number(this._captainRoleId) }, 10000
          );
          roomId = resp?.nightMareData?.roomId
            || resp?.nightmareData?.roomId
            || resp?.roomId || null;
          if (roomId) return String(roomId);
          this._onLog(`[debug] _reopenRoom: nightmare_getroleinfo 响应中无 roomId，原始: ${JSON.stringify(resp || null).substring(0, 200)}`, 'warning');
          this._onLog(`新 RoomId 尚未生成，重试 (${attempt}/5)...`, 'warning');
        } catch { /* ignore */ }
      }
      return null;
    } catch (err) {
      const errMsg = err.message || String(err);
      // 7100020: 服务器残留队伍或房间状态异常
      if (errMsg.includes('7100020')) {
        this._onLog('开启房间失败(7100020)，尝试刷新房间状态...', 'warning');
        try {
          const roomOk = await this._fetchRoomInfo();
          if (roomOk && this._roomId) {
            this._onLog(`刷新后房间仍有效 RoomId: ${this._roomId}，跳过重建`, 'success');
            return String(this._roomId);
          }
        } catch (e) {
          /* ignore */
        }
        // 不再解散当前队伍并创建空队伍：重建后队员会全部丢失，导致
        // “无可用出战成员”立即再次失败。让外层重试机制重新走完整流程。
        this._onLog('刷新后无有效房间，不再重建空队伍，结束本次挑战', 'error');
        return null;
      }
      this._onLog(`重新开启房间失败: ${errMsg}`, 'error');
      return null;
    }
  }

  // ====== 遣散房间 + 解散队伍 ======
  async _dismissRoom(activeBattles = null) {
    // 防止重复遣散（_battleLoop 内部和 finally 都可能调用）
    if (this._cleanupDone) return;
    this._cleanupDone = true;
    try {
      await this._tokenStore.sendMessageWithPromise(
        this._captainTokenId, 'nightmare_dismiss',
        { roomId: Number(this._roomId) }, 10000
      );
      this._onLog('战斗房间已遣散', 'success');
    } catch (err) {
      const errMsg = err.message || String(err);
      // 6100020: 房间已不存在或无法解散
      // 6100010: 房间状态异常/已被服务器清理（通关后常见）
      if (errMsg.includes('6100020') || errMsg.includes('6100010')) {
        this._onLog('战斗房间已不存在或已清理，跳过遣散', 'info');
      } else {
        this._onLog(`遣散房间失败: ${errMsg}`, 'warning');
      }
    }
    // 遣散房间后解散组队（matchteam）
    if (this._teamId) {
      // 检查是否有其他活跃战斗共享同一队伍
      let teamShared = false;
      if (activeBattles && Array.isArray(activeBattles)) {
        teamShared = activeBattles.some(b =>
          b && b !== this && b.teamId === this._teamId &&
          (b.status === 'running' || b.status === 'cooling' || b.status === 'waiting_midnight')
        );
      }
      if (teamShared) {
        this._onLog(`队伍 ${this._teamId} 被其他战斗共享，跳过解散`, 'info');
      } else {
        try {
          await this._tokenStore.sendMessageWithPromise(
            this._captainTokenId, 'matchteam_dismiss',
            { teamId: Number(this._teamId) }, 10000
          );
          this._onLog('组队已解散', 'success');
        } catch (err) {
          this._onLog(`解散组队失败: ${err.message || err}`, 'warning');
        }
      }
    }
  }

  // ====== 卡点判断：是否需要等待到周一00:00 ======
  _shouldWaitForMidnight() {
    if (!this._presetData?.waitLevel8) return false;
    // 第7关刚打完（currentLevel即将变为8），且当前是周日
    if (this._currentLevel === 7) return false; // 还在第7关内，未通关
    if (this._currentLevel !== 8) return false; // 非第8关
    const now = new Date();
    if (now.getDay() !== 0) return false; // 非周日
    // 第一次到达第8关时触发等待
    if (!this._level8FirstEntry) {
      this._level8FirstEntry = true;
      return true;
    }
    return false; // 已经触发过等待（或等待已结束），不再重复触发
  }

  // ====== 等待到周一00:00 ======
  async _waitForMidnight() {
    this._status = 'waiting_midnight';
    this._waitStartTime = Date.now();
    this._onStatusChange({ status: 'waiting_midnight', currentLevel: this._currentLevel });
    this._onLog(`第7关完成，等待周一00:01后继续挑战第8关...`, 'info');

    while (!this._stopped) {
      const now = new Date();
      const day = now.getDay(); // 0=周日, 1=周一
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // 只保留：周一 00:01 自动开始第8关
      if (day === 1 && (hours > 0 || minutes >= 1)) break;

      // 非周日（周二~周六）且非周一00:01：不等待，直接继续
      if (day !== 0 && day !== 1) break;

      // 计算距周一00:01剩余时间
      const target = day === 0
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 5)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 5);
      const msToTarget = target - now;
      this._onLog(`⏳ 距周一00:01还剩 ${Math.max(0, Math.ceil(msToTarget / 60000))} 分钟`, 'info');

      // 23:59 主动断开重连（仅执行一次）
      if (hours === 23 && minutes >= 59 && !this._preMidnightReconnectDone) {
        this._onLog('⏰ 23:59 主动断开重连队长...', 'info');
        const reconnected = await this._forceReconnectCaptain();
        if (reconnected) {
          await this._fetchRoomInfo();
          this._onLog('✅ 23:59 重连完成，等待00:01执行', 'success');
        }
        this._preMidnightReconnectDone = true;
      }

      // 心跳保活（静默模式，失败不中断等待）
      try {
        await this._tokenStore.sendMessageWithPromise(
          this._captainTokenId, 'nightmare_getroominfo',
          { roomId: this._roomId }, 10000
        );
      } catch { /* 心跳失败不中断等待 */ }

      // 每30秒检查一次
      for (let i = 0; i < 30 && !this._stopped; i++) {
        await sleep(1000);
      }
    }

    if (!this._stopped) {
      this._onLog(`已到周一00:01，开始第8关挑战！`, 'success');
      this._status = 'running';
      this._waitStartTime = null;
    }
  }
}
