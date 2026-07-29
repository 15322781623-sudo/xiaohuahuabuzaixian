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
    this._MAX_BATTLE_TIME = 2 * 60 * 60 * 1000; // 2 小时超时（不含等待）
    this._waitStartTime = null;
    this._level8FirstEntry = false; // 卡点第 8 关标记
    this._cleanupDone = false;       // 清理标记，防止重复遣散
    this._preMidnightReconnectDone = false; // 23:59 重连标记，防止分钟内重复执行
    this._reopenRetryCount = 0;      // 房间重建重试次数，最多 1 次
    this._recoverUsed = 0;           // 本轮已使用的恢复次数（全队共享：开局1次，通关第4/6殿各+1）
    this._recoverCounts = {};        // { roleId: 恢复次数 } 用于 UI 展示恢复效果
    this._restoreRecoverState();     // ✅ 页面刷新/重连后按 roomId 恢复已用次数，避免 UI 显示归零

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
  
  // ✅ 获取成员信息（用于 UI 显示）
  getMembers() {
    return this._members.map(m => ({
      name: m.name,
      roleId: m.roleId,
      isAllHeroesDead: m.isAllHeroesDead,
      isCaptain: m.isCaptain,
      heroes: m.heroes || [], // ✅ 新增：武将列表，用于显示恢复状态
      recoverCount: this._recoverCounts[String(m.roleId)] || 0, // ✅ 本轮已恢复次数（效果显示）
    }));
  }

  // ✅ 全队共享恢复次数：开局1次，通关第4殿（伍官王）+1，通关第6殿（卞城王）+1
  getRecoverInfo() {
    let total = 1;
    if (this._currentLevel > 4) total += 1;
    if (this._currentLevel > 6) total += 1;
    return { used: this._recoverUsed, total, left: Math.max(0, total - this._recoverUsed) };
  }

  // ✅ 恢复次数持久化（按 roomId）：页面刷新/重连接管同一房间后不丢失已用次数
  _persistRecoverState() {
    try {
      localStorage.setItem(`nightmare-recover-${this._roomId}`, JSON.stringify({
        used: this._recoverUsed,
        counts: this._recoverCounts,
        timestamp: Date.now(),
      }));
    } catch { /* ignore */ }
  }

  _restoreRecoverState() {
    try {
      const raw = localStorage.getItem(`nightmare-recover-${this._roomId}`);
      if (!raw) return;
      const data = JSON.parse(raw);
      // 超过24小时视为过期（含卡点等到周一的最长场景）
      if (!data.timestamp || Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(`nightmare-recover-${this._roomId}`);
        return;
      }
      this._recoverUsed = data.used || 0;
      this._recoverCounts = data.counts || {};
    } catch { /* ignore */ }
  }

  _clearRecoverState() {
    try { localStorage.removeItem(`nightmare-recover-${this._roomId}`); } catch { /* ignore */ }
  }
  
  // ✅ 获取当前关卡的出战记录
  getAttackRecords() {
    return this._attackRecords[this._currentLevel] || [];
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

      // ✅ 修复：重连继续前也检查成员状态，自动恢复全部阵亡的成员
      if (this._members.length > 0 && this._isAllMembersDead()) {
        this._onLog('重连后检测到全员阵亡，自动恢复中...', 'warning');
        for (const member of this._members) {
          try {
            await this._tokenStore.sendMessageWithPromise(
              this._captainTokenId, 'nightmare_restore',
              { roomId: Number(this._roomId), roleId: Number(member.roleId) }, 10000
            );
            this._recoverUsed++;
            this._recoverCounts[String(member.roleId)] = (this._recoverCounts[String(member.roleId)] || 0) + 1;
            this._persistRecoverState();
            this._onLog(`已恢复 ${member.name}`, 'success');
          } catch (e) {
            this._onLog(`恢复 ${member.name} 失败: ${e.message || e}`, 'warning');
          }
        }
        await sleep(1000);
        await this._fetchRoomInfo();
      }

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

      // ✅ 修复：战斗开始前检查成员状态，自动恢复全部阵亡的成员
      // 解决接管已有房间时成员武将死亡未恢复导致“无出战成员”的问题
      if (this._members.length > 0 && this._isAllMembersDead()) {
        this._onLog('战斗开始前检测到全员阵亡，自动恢复中...', 'warning');
        for (const member of this._members) {
          try {
            await this._tokenStore.sendMessageWithPromise(
              this._captainTokenId, 'nightmare_restore',
              { roomId: Number(this._roomId), roleId: Number(member.roleId) }, 10000
            );
            this._recoverUsed++;
            this._recoverCounts[String(member.roleId)] = (this._recoverCounts[String(member.roleId)] || 0) + 1;
            this._persistRecoverState();
            this._onLog(`已恢复 ${member.name}`, 'success');
          } catch (e) {
            this._onLog(`恢复 ${member.name} 失败: ${e.message || e}`, 'warning');
          }
        }
        await sleep(1000);
        await this._fetchRoomInfo();
      }

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
        // ✅ 修复：超时后必须触发 onError，否则 handleBattleError 不执行，UI 条目永远不清除
        this._onError({ message: '后台战斗超时（2小时）', reason: 'timeout' });
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

      // ✅ 修复：循环顶部先检查是否已通关（重连继续时房间可能已在第8关之后），避免在已通关房间错误出战
      if (this._checkCompletion()) {
        this._isCompleted = true;
        this._onLog(`🎉 十殿阎罗挑战通关！`, 'success');
        await this._dismissRoom(this._activeBattles);
        this._status = 'completed';
        this._onComplete({ level: 8, presetName: this._presetData?.name });
        this._onStatusChange({ status: 'completed', presetName: this._presetData?.name });
        return;
      }

      // 自动选择出战成员
      const result = this._getAutoAttacker();
      if (!result) {
        // ✅ 详细诊断：为什么返回 null
        const totalMembers = this._members.length;
        const deadMembers = this._members.filter(m => m.isAllHeroesDead).length;
        const aliveMembers = totalMembers - deadMembers;
        const foughtCount = this._attackRecords[this._currentLevel]?.length || 0;
              
        this._onLog(`️ 无可用出战成员诊断：总成员${totalMembers}人，阵亡${deadMembers}人，存活${aliveMembers}人，已出战${foughtCount}人`, 'warning');
              
        // 第 1-7 关全员出战但未通关：直接结束挑战（不重试，避免消耗枕头）
        if (this._currentLevel > 0 && this._currentLevel < 8) {
          // ✅ 检查是否真的有成员出战过
          if (foughtCount === 0 && aliveMembers > 0) {
            // 没有任何成员出战过，但还有活人 → 可能是预设配置问题或匹配问题
            this._onLog(`第${this._currentLevel}关无成员出战但有${aliveMembers}个存活成员，检查预设配置...`, 'error');
                  
            // 检查预设出战顺序
            const priority = this._presetData?.levelConfig?.[this._currentLevel]?.priority || [];
            if (priority.length === 0) {
              this._onLog(`第${this._currentLevel}关预设出战顺序为空，请检查配置！`, 'error');
            } else {
              this._onLog(`第${this._currentLevel}关预设顺序${priority.length}人，但都未匹配到成员`, 'error');
            }
                  
            // 等待 10 秒后重试，不要立即解散
            this._onLog(`等待 10 秒后重新检查...`, 'warning');
            await sleep(10000);
            await this._fetchRoomInfo();
            continue;
          }
                
          this._onLog(`第${this._currentLevel}关全员出战均未通过（已出战${foughtCount}人），结束挑战`, 'error');
          this._status = 'failed';
          this._onStatusChange({ status: 'failed', presetName: this._presetData?.name, reason: 'all_members_fought' });
          this._onError({ message: `第${this._currentLevel}关全员出战均未通过`, reason: 'all_members_fought' });
          return;
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
          this._recoverAttempts?.clear(); // 重建房间后允许重新尝试恢复
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
          this._persistRecoverState(); // 房间重建后按新 roomId 续存恢复次数
          this._reopenRetryCount++;
          this._onLog(`重建房间成功，新 RoomId: ${newRoomId8}`, 'success');
          await sleep(3000);
          if (this._stopped) return;
          await this._fetchRoomInfo();
          continue;
        }

        // currentLevel 为 0 或 > 8（异常情况）
        // ✅ 使用前面已声明的变量进行诊断
        this._onLog(`️ 异常情况无可用出战成员：currentLevel=${this._currentLevel}，总成员${totalMembers}人，阵亡${deadMembers}人，存活${aliveMembers}人，已出战${foughtCount}人`, 'warning');
        
        if (foughtCount === 0 && aliveMembers > 0) {
          // 没有任何成员出战过，但还有活人 → 可能是配置问题
          this._onLog(`存活${aliveMembers}人但未出战，等待 10 秒后重试...`, 'warning');
          await sleep(10000);
          await this._fetchRoomInfo();
          continue;
        }
        
        this._onLog('无可用出战成员，结束战斗并解散队伍', 'warning');
        await this._dismissRoom(this._activeBattles);
        this._status = 'completed';
        this._onStatusChange({ status: 'completed', presetName: this._presetData?.name });
        this._onComplete({ level: this._currentLevel, reason: 'no_available_members' });
        return;
      }
      const { member: attacker, entry: attackerEntry, forceRecover } = result;

      // 检查恢复（forceRecover：自动恢复兜底选中的阵亡成员，无需预设配置也要恢复）
      if (forceRecover || this._shouldAutoRecover(attacker, attackerEntry)) {
        this._onLog(`自动恢复 ${attacker.name}`, 'info');
        const recoverOk = await this._memberRecover(attacker);
        await sleep(1000);
        // 恢复后 _members 已刷新为新对象，同步最新阵亡状态到当前引用，避免旧标记拦截出战
        const refreshed = this._members.find(m => String(m.roleId) === String(attacker.roleId));
        if (refreshed) attacker.isAllHeroesDead = refreshed.isAllHeroesDead;
        // ✅ 修复：恢复指令已成功但房间信息仍显示阵亡（数据延迟）时放行出战，由服务器最终校验
        if (recoverOk && attacker.isAllHeroesDead) {
          this._onLog(`${attacker.name} 恢复指令已成功但房间信息仍显示阵亡，尝试直接出战`, 'warning');
          attacker.isAllHeroesDead = false;
        }
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
        continue;
      }
      if (!fightOk) {
        // ✅ 出战失败：不再强制标记为已出战，避免误判
        this._onLog(`${attacker.name} 出战失败，等待 5 秒后重试`, 'error');
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

      // 出战成功
      
      // 1 秒战斗倒计时
      this._onLog(`⏱ 战斗进行中 1 秒...`, 'info');
      await sleep(1000);
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

      // 15秒冷却
      this._status = 'cooling';
      this._onStatusChange({ status: 'cooling', currentLevel: this._currentLevel });
      this._onLog(`⏱ 冷却 15秒...`, 'info');
      await sleep(15000);
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
    const nextLevel = roomInfo.curMonsterCfgId || 0;
    // ✅ 修复：战斗中途收到缺少关卡数据的异常响应（如空响应回退），保留当前关卡状态，
    // 避免 _currentLevel 被重置为 0 导致错误出战或误判完成
    if (nextLevel === 0 && prevLevel > 0) {
      this._onLog('房间信息缺少关卡数据，保留当前关卡状态', 'warning');
      return;
    }
    this._currentLevel = nextLevel;

    // 关卡推进时重置重建重试计数
    if (this._currentLevel !== prevLevel && this._currentLevel > 0) {
      this._reopenRetryCount = 0;
      
      // ✅ 关键修复：关卡推进时清理上一关的出战记录
      if (prevLevel > 0 && this._attackRecords[prevLevel]) {
        this._onLog(`清理第${prevLevel}关出战记录: ${this._attackRecords[prevLevel].join(', ')}`, 'info');
        // 注意：不清理 _attackRecords[prevLevel]，因为可能需要查看历史记录
        // 但确保当前关卡的记录是干净的
      }
      
      // ✅ 确保当前关卡的出战记录是干净的
      if (!this._attackRecords[this._currentLevel]) {
        this._attackRecords[this._currentLevel] = [];
        this._onLog(`初始化第${this._currentLevel}关出战记录为空`, 'info');
      }
      
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

    // ✅ 修复：在成员解析完成后再上报状态，确保 UI 获取到最新的成员和武将恢复数据
    const bossHp = this.getBossHp();
    this._onStatusChange({ status: this._status, currentLevel: this._currentLevel, bossHp });
  }

  // ====== 选人出战（对应 getAutoAttacker） ======
  _getAutoAttacker() {
    const priority = this._presetData?.levelConfig?.[this._currentLevel]?.priority || [];
    const foughtList = this._attackRecords[this._currentLevel] || [];
    
    // 调试日志：显示预设出战顺序和当前成员
    const memberNames = this._members.map(m => `${m.name}${m.isAllHeroesDead ? '(亡)' : ''}`).join(', ');
    this._onLog(`第${this._currentLevel}关 预设顺序${priority.length}人，已出战${foughtList.length}人，成员[${memberNames}]`, 'info');
      
    // ✅ 详细调试：显示每个成员的状态
    this._members.forEach(m => {
      const isFought = foughtList.includes(String(m.roleId));
      this._onLog(`  成员：${m.name} (roleId: ${m.roleId}) - 阵亡:${m.isAllHeroesDead ? '是' : '否'}, 已出战:${isFought ? '是' : '否'}`, 'info');
    });
    
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
        // ✅ 修复：阵亡但本关配置了恢复的成员不能跳过，选中后主循环会先恢复再出战（每关每人只尝试一次，防恢复失败死循环）
        const recoverKey = `${this._currentLevel}:${roleId}`;
        if (this._shouldAutoRecover(member, entry) && !(this._recoverAttempts = this._recoverAttempts || new Set()).has(recoverKey)) {
          this._recoverAttempts.add(recoverKey);
          this._onLog(`${member.name} 全部阵亡，但本关配置了恢复，选中并先恢复`, 'info');
          return { member, entry };
        }
        this._onLog(`${member.name} 全部阵亡，跳过`, 'warning');
        continue;
      }
      this._onLog(`选中出战：${member.name} (roleId: ${roleId})`, 'success');
      return { member, entry };
    }
    
    // 兆底：找任何未出战的活人
    for (const member of this._members) {
      if (foughtList.includes(String(member.roleId))) continue;
      if (member.isAllHeroesDead) {
        // ✅ 修复：阵亡但本关配置了恢复的成员，兆底路径同样先恢复再出战
        const recoverKey = `${this._currentLevel}:${String(member.roleId)}`;
        if (this._shouldAutoRecover(member, null) && !(this._recoverAttempts = this._recoverAttempts || new Set()).has(recoverKey)) {
          this._recoverAttempts.add(recoverKey);
          this._onLog(`${member.name} 全部阵亡，但本关配置了恢复，选中并先恢复（兆底）`, 'info');
          return { member, entry: null };
        }
        continue;
      }
      this._onLog(`使用兆底出战：${member.name}`, 'info');
      return { member, entry: null };
    }

    // ✅ 自动恢复兜底：本关所有存活成员都已出战但未通关时，无需预设配置，
    // 自动恢复此前关卡阵亡且本关未出战的成员继续挑战（每关每人只尝试一次，防死循环）
    for (const member of this._members) {
      if (foughtList.includes(String(member.roleId))) continue;
      if (!member.isAllHeroesDead) continue;
      const recoverKey = `${this._currentLevel}:${String(member.roleId)}`;
      if ((this._recoverAttempts = this._recoverAttempts || new Set()).has(recoverKey)) continue;
      this._recoverAttempts.add(recoverKey);
      this._onLog(`自动恢复兜底：${member.name} 此前阵亡且本关未出战，恢复后继续挑战`, 'info');
      return { member, entry: null, forceRecover: true };
    }

    // ✅ 详细日志：为什么返回 null
    const deadMembers = this._members.filter(m => m.isAllHeroesDead).map(m => m.name).join(', ');
    const foughtMembers = this._members.filter(m => foughtList.includes(String(m.roleId))).map(m => m.name).join(', ');
    this._onLog(`️ 无可用出战成员：阵亡[${deadMembers || '无'}]，已出战[${foughtMembers || '无'}]`, 'warning');
        
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
    // ✅ 修复：配置以 tokenId 为键，成员通过兆底路径选中（priorityEntry 为空）时反查 tokenId
    const token = this._tokenStore.gameTokens.find(
      t => (t.roleId && String(t.roleId) === String(member.roleId)) || t.name === member.name
    );
    if (token && configMap[token.id]) return true;
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
        { roomId: Number(this._roomId), roleId: Number(member.roleId) }, 10000
      );
      // ✅ 恢复成功：记录共享次数消耗和成员恢复效果
      this._recoverUsed++;
      this._recoverCounts[String(member.roleId)] = (this._recoverCounts[String(member.roleId)] || 0) + 1;
      this._persistRecoverState();
      const info = this.getRecoverInfo();
      this._onLog(`${member.name} 恢复指令成功（剩余恢复次数 ${info.left}/${info.total}）`, 'success');
      // ✅ 修复：先等服务器应用恢复结果再拉取房间信息，避免拿到陈旧的阵亡状态
      await sleep(1500);
      await this._fetchRoomInfo();
      // 若仍显示阵亡，可能是房间数据延迟，再重试拉取一次
      const check = this._members.find(m => String(m.roleId) === String(member.roleId));
      if (check?.isAllHeroesDead) {
        await sleep(2000);
        await this._fetchRoomInfo();
      }
      return true;
    } catch (err) {
      this._onLog(`恢复指令失败: ${err.message || err}`, 'warning');
      return false;
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
      // ✅ BUG修复：返回数字类型（原先返回 String，重建后 nightmare_fight/getroominfo 等会把字符串 roomId 发给服务器，与其他 Number(this._roomId) 调用口径不一致）
      if (roomId) return Number(roomId);
      this._onLog(`[debug] _reopenRoom: 无法从响应中提取 roomId，原始响应：${JSON.stringify(openResp || null)}`, 'warning');
        
      // ✅ 不再轮询重试，直接返回 null
      this._onLog('新 RoomId 尚未生成，结束挑战', 'error');
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
            return Number(this._roomId);
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
    this._clearRecoverState(); // 房间遣散后恢复次数记录不再有效，清理持久化数据
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
      // ✅ 修复：activeBattles 数组元素是包装对象 { preset, battle, status, ... }
      // 需要通过 b.battle 访问 NightmareAutoBattleService 实例
      let teamShared = false;
      if (activeBattles && Array.isArray(activeBattles)) {
        // ✅ 修复：teamId 可能存在 string/number 混用，统一转字符串比较，避免共享队伍误解散
        teamShared = activeBattles.some(b =>
          b && b.battle !== this &&
          String(b.battle?._teamId ?? b.battle?.getTeamId?.() ?? '') === String(this._teamId) &&
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
      // ✅ 修复：重置超时计时器，避免等待时间计入2小时超时导致第8关立即超时
      this._startTime = Date.now();
    }
  }
}
