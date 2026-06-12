/**
 * 功法类任务
 * 包含: batchLegacyClaim, batchLegacyGiftSendEnhanced
 */

/**
 * 功法残卷赠送/接收上限配置 (LegacyGiftConf)
 * 根据VIP等级决定每日赠送上限(giftLegacyMax)和接收上限(receiveLegacyMax)
 * 数据来源: gf.json
 */
const LegacyGiftConf = [
  { vipLevel: 0,  giftDustMax: 0,    receiveDustMax: 0,     giftLegacyMax: 0,    receiveLegacyMax: 25 },
  { vipLevel: 1,  giftDustMax: 0,    receiveDustMax: 1000,  giftLegacyMax: 0,    receiveLegacyMax: 30 },
  { vipLevel: 2,  giftDustMax: 0,    receiveDustMax: 2000,  giftLegacyMax: 0,    receiveLegacyMax: 35 },
  { vipLevel: 3,  giftDustMax: 0,    receiveDustMax: 3000,  giftLegacyMax: 0,    receiveLegacyMax: 40 },
  { vipLevel: 4,  giftDustMax: 0,    receiveDustMax: 4000,  giftLegacyMax: 0,    receiveLegacyMax: 45 },
  { vipLevel: 5,  giftDustMax: 0,    receiveDustMax: 5000,  giftLegacyMax: 500,  receiveLegacyMax: 50 },
  { vipLevel: 6,  giftDustMax: 0,    receiveDustMax: 6000,  giftLegacyMax: 600,  receiveLegacyMax: 50 },
  { vipLevel: 7,  giftDustMax: 0,    receiveDustMax: 7000,  giftLegacyMax: 700,  receiveLegacyMax: 50 },
  { vipLevel: 8,  giftDustMax: 0,    receiveDustMax: 8000,  giftLegacyMax: 800,  receiveLegacyMax: 50 },
  { vipLevel: 9,  giftDustMax: 0,    receiveDustMax: 9000,  giftLegacyMax: 900,  receiveLegacyMax: 50 },
  { vipLevel: 10, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 11, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 12, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 13, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 14, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 15, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 16, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 17, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
  { vipLevel: 18, giftDustMax: 0,    receiveDustMax: 10000, giftLegacyMax: 1000, receiveLegacyMax: 50 },
];

/**
 * 根据VIP等级获取功法残卷赠送上限
 * @param {number} vipLevel - VIP等级
 * @returns {number} 每日赠送上限
 */
function getGiftLegacyMax(vipLevel) {
  const conf = LegacyGiftConf.find(c => c.vipLevel === vipLevel);
  return conf ? conf.giftLegacyMax : 0;
}

/**
 * 根据VIP等级获取功法残卷接收上限
 * @param {number} vipLevel - VIP等级
 * @returns {number} 每日接收上限
 */
function getReceiveLegacyMax(vipLevel) {
  const conf = LegacyGiftConf.find(c => c.vipLevel === vipLevel);
  return conf ? conf.receiveLegacyMax : 25;
}

/**
 * 功法赠送任务奖励配置 (LegacyGiftTaskConf)
 * 完成任务可获得额外的赠送上限加成
 * giftDreamDustReward 数组索引对应 VIP 等级 (0-18)
 * 数据来源: gf.json
 */
const LegacyGiftTaskConf = {
  1: { Id: 1, taskDesc: "通关1次十殿试炼3", giftDreamDustReward: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000] },
  2: { Id: 2, taskDesc: "通关1次十殿试炼5", giftDreamDustReward: [100, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000] },
  3: { Id: 3, taskDesc: "通关1次十殿试炼8", giftDreamDustReward: [120, 240, 480, 720, 960, 1200, 1440, 1680, 1920, 2160, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400] },
  4: { Id: 4, taskDesc: "盐场累计击杀1人", giftDreamDustReward: [30, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 600, 600, 600, 600, 600, 600, 600, 600] },
  5: { Id: 5, taskDesc: "盐场累计击杀10人", giftDreamDustReward: [150, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000] },
};

/**
 * 计算功法残卷赠送总上限（基础VIP上限 + 已完成任务奖励）
 * @param {number} vipLevel - VIP等级
 * @param {object} giftTaskClaim - 已领取的任务记录 { taskId: status }
 * @returns {object} { baseMax, taskBonus, totalMax, taskDetails }
 */
function calculateGiftLegacyTotal(vipLevel, giftTaskClaim = {}) {
  const baseMax = getGiftLegacyMax(vipLevel);
  let taskBonus = 0;
  const taskDetails = [];

  for (const [taskId, taskConf] of Object.entries(LegacyGiftTaskConf)) {
    const claimStatus = giftTaskClaim[taskId];
    // 任务已完成且已领取
    if (claimStatus && claimStatus > 0) {
      const rewardIndex = Math.min(vipLevel, 18);
      const reward = taskConf.giftDreamDustReward[rewardIndex] || 0;
      taskBonus += reward;
      taskDetails.push({
        taskId: Number(taskId),
        desc: taskConf.taskDesc,
        reward,
        claimed: true,
      });
    } else {
      taskDetails.push({
        taskId: Number(taskId),
        desc: taskConf.taskDesc,
        reward: 0,
        claimed: false,
      });
    }
  }

  return {
    baseMax,
    taskBonus,
    totalMax: baseMax + taskBonus,
    taskDetails,
  };
}

/**
 * 创建功法类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksLegacy(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
    recipientIdInput,
    recipientInfo,
    securityPassword,
    delayConfig,
  } = deps;

  /**
   * 批量领取功法残卷
   */
  const batchLegacyClaim = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取功法残卷: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);

        const LegacyClaimHangUpResp = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legacy_claimhangup",
          {},
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 成功领取功法残卷${LegacyClaimHangUpResp.reward[0].value}，共有${LegacyClaimHangUpResp.role.items[37007].quantity}个`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        const errorMsg = error.message || "";

        // 错误码12400160或200020表示未达到开启残卷关卡
        if (errorMsg.includes("12400160") || errorMsg.includes("服务器错误: 12400160")
          || errorMsg.includes("200020") || errorMsg.includes("服务器错误: 200020")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 未达到关卡无法领取 ===`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "failed";
        } else if (errorMsg.includes("12400000") || errorMsg.includes("挂机奖励领取过于频繁")
          || errorMsg.includes("800040") || errorMsg.includes("服务器错误: 800040")) {
          // 错误码12400000或800040表示残卷为0
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 残卷为0无法领取 ===`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "failed";
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 领取功法残卷失败: ${errorMsg}`,
            type: "error",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量领取功法残卷结束");
  };

  /**
   * 批量开启残卷挂机
   */
  const batchLegacyHangup = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始开启残卷挂机: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);

        // 先获取残卷信息
        const legacyInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legacy_getinfo",
          {},
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取残卷信息成功`,
          type: "info",
        });

        // 开启残卷挂机
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "legacy_beginhangup",
          {},
          5000,
        );
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 残卷挂机已开启 ===`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        const errorMsg = error.message || "";

        if (errorMsg.includes("12400160") || errorMsg.includes("200020")) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 未达到关卡无法开启残卷挂机 ===`,
            type: "info",
          });
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 开启残卷挂机失败: ${errorMsg}`,
            type: "error",
          });
        }
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);

    isRunning.value = false;
    currentRunningTokenId.value = null;
    message.success("批量开启残卷挂机结束");
  };

  /**
   * 增强版批量赠送功法残卷（含完善的验证和错误处理）
   */
  const batchLegacyGiftSendEnhanced = async (isScheduledTask = false) => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择要操作的角色");
      return;
    }

    const recipientId = isScheduledTask
      ? batchSettings.receiverId
      : recipientIdInput.value;

    const baseGiftConfig = {
      recipientId: Number(recipientId),
      itemId: 37007,
      serverName: recipientInfo.value?.serverName || "",
      name: recipientInfo.value?.name || "",
    };

    if (!isScheduledTask) {
      if (!baseGiftConfig.recipientId || baseGiftConfig.recipientId <= 0) {
        message.error("请输入有效的接收者ID");
        return;
      }
    }

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const processLegacyGift = async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);

      // 每个账号独立拷贝配置，避免并发覆盖
      const giftConfig = { ...baseGiftConfig, quantity: 0 };

      try {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始赠送功法残卷: ${token.name} ===`,
            type: "info",
          });

          await ensureConnection(tokenId);

          // 获取当前账号的密码：统一从账号独立设置获取（任务模板/账号设置）
          let password;
          try {
            const settingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
            if (settingsRaw) {
              const accountSettings = JSON.parse(settingsRaw);
              if (accountSettings?.legacyGiftPassword) {
                password = accountSettings.legacyGiftPassword;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 使用账号配置的密码 (密码长度: ${password.length})`,
                  type: "info",
                });
              }
            }
          } catch (error) {
            console.error(`读取账号 ${tokenId} 设置失败:`, error);
          }

          if (!password) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 密码未配置，请在账号设置或任务模板中配置功法赠送密码 ===`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }

          const roleInfo = await tokenStore.sendGetRoleInfo(tokenId);
          // 获取实际残卷数量（不截断）
          const actualFragmentCount = roleInfo?.role?.items?.[giftConfig.itemId]?.quantity || 0;
          // 非特权模式下单次最多赠送9999
          const legacyFragmentCount = Math.min(actualFragmentCount, 9999);

          // 根据VIP等级获取基础赠送上限
          const vipLevel = roleInfo?.role?.vip || 0;

          // 检查赛季充值特权：role.statistics["legacy:charge"] 为充值金额（3000=30元），statisticsTime["legacy:charge"] 为赛季开始时间戳
          const legacyCharge = roleInfo?.role?.statistics?.["legacy:charge"] || 0;
          const legacyChargeTime = roleInfo?.role?.statisticsTime?.["legacy:charge"] || 0;
          // 充值金额 >= 3000（30元）且赛季时间戳在本月内，判定为特权开启
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
          const hasLegacyPrivilege = legacyCharge >= 3000 && legacyChargeTime >= monthStart;
          if (hasLegacyPrivilege) {
            const seasonDate = new Date(legacyChargeTime * 1000).toLocaleDateString();
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 本月充值 ${legacyCharge / 100}元（时间: ${seasonDate}），特权开启，赠送无上限`,
              type: "info",
            });
          } else if (legacyCharge >= 3000 && legacyChargeTime > 0 && legacyChargeTime < monthStart) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 充值记录非本月（${new Date(legacyChargeTime * 1000).toLocaleDateString()}），特权未开启`,
              type: "info",
            });
          }

          // 获取功法残卷信息（包含赠送任务状态）
          const legacyInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legacy_getinfo",
            {},
            5000,
          );

          // 解析 roleLegacy 对象
          const roleLegacy = legacyInfo?.roleLegacy || {};

          // 解析已领取的任务记录 giftTaskClaim（数据在 roleLegacy 内）
          const giftTaskClaim = roleLegacy?.giftTaskClaim || legacyInfo?.giftTaskClaim || {};

          // 特权开启时跳过上限计算，使用实际残卷数量
          if (hasLegacyPrivilege) {
            giftConfig.quantity = Math.min(actualFragmentCount, 9999);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 特权模式，无赠送上限，总拥有: ${actualFragmentCount}，本次赠送: ${giftConfig.quantity}`,
              type: "info",
            });
          } else {
            // 无特权：按VIP等级计算上限
            // 计算总赠送上限（基础VIP上限 + 已完成任务奖励）
            const giftLimitInfo = calculateGiftLegacyTotal(vipLevel, giftTaskClaim);
            const giftLegacyMax = giftLimitInfo.totalMax;

            // 获取已赠送数量（字段: sendItemCnt = 累计送出的礼物总数）
            const giftedToday = roleLegacy?.sendItemCnt ?? 0;

            // 计算剩余可赠送数量 = 总上限 - 已赠送
            const remainingGiftLimit = Math.max(0, giftLegacyMax - giftedToday);

            // 调试日志：输出已赠送相关字段
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} sendItemCnt: ${roleLegacy?.sendItemCnt ?? "未定义"}，sendGiftCnt: ${roleLegacy?.sendGiftCnt ?? "未定义"}`,
              type: "info",
            });

            // 输出任务完成情况
            const claimedTasks = giftLimitInfo.taskDetails.filter(t => t.claimed);
            const unclaimedTasks = giftLimitInfo.taskDetails.filter(t => !t.claimed);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} VIP${vipLevel}，基础上限: ${giftLimitInfo.baseMax}，任务加成: ${giftLimitInfo.taskBonus}，总上限: ${giftLegacyMax}，已赠送: ${giftedToday}，剩余可赠: ${remainingGiftLimit}`,
              type: "info",
            });
            if (claimedTasks.length > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 已完成任务(${claimedTasks.length}): ${claimedTasks.map(t => `${t.desc}(+${t.reward})`).join(", ")}`,
                type: "info",
              });
            }
            if (unclaimedTasks.length > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 未完成任务(${unclaimedTasks.length}): ${unclaimedTasks.map(t => t.desc).join(", ")}`,
                type: "info",
              });
            }

            if (legacyFragmentCount === 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== ${token.name} 功法残卷不足，当前拥有: 0 ===`,
                type: "error",
              });
              tokenStatus.value[tokenId] = "failed";
              return;
            }

            // 总上限为0则无法赠送
            if (giftLegacyMax === 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== ${token.name} VIP等级${vipLevel}且无任务加成，赠送上限为0，无法赠送功法残卷 ===`,
                type: "warning",
              });
              tokenStatus.value[tokenId] = "failed";
              return;
            }

            // 根据剩余可赠送上限限制赠送数量，取拥有数量和剩余可赠的较小值
            giftConfig.quantity = Math.min(legacyFragmentCount, remainingGiftLimit);

            // 剩余可赠为0则跳过赠送（不标记为failed，避免触发重试）
            if (remainingGiftLimit === 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== ${token.name} 今日已赠送 ${giftedToday}，达到总上限 ${giftLegacyMax}，无法继续赠送 ===`,
                type: "warning",
              });
              tokenStatus.value[tokenId] = "completed";
              return;
            }

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} VIP${vipLevel}，总上限: ${giftLegacyMax}，已赠送: ${giftedToday}，剩余可赠: ${remainingGiftLimit}，拥有: ${legacyFragmentCount}，实际赠送: ${giftConfig.quantity}`,
              type: "info",
            });
          }

          // 特权模式：检查残卷数量
          if (hasLegacyPrivilege && actualFragmentCount === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 功法残卷不足，当前拥有: 0 ===`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }

          // 查询接收者信息（特权/非特权都需要）
          const rankroleinfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "rank_getroleinfo",
            {
              bottleType: 0,
              includeBottleTeam: false,
              isSearch: false,
              roleId: giftConfig.recipientId,
            },
            5000,
          );
          giftConfig.serverName = rankroleinfo?.roleInfo?.serverName || "";
          giftConfig.name = rankroleinfo?.roleInfo?.name || "";
          if (!rankroleinfo?.roleInfo?.roleId) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 赠送功法残卷失败: 接收者${giftConfig.recipientId}不存在 ===`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始解除安全密码验证 ===`,
            type: "info",
          });

          const commitPasswordResp = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_commitpassword",
            {
              password,
              passwordType: 1,
            },
            5000,
          );

          if (!commitPasswordResp) {
            throw new Error("安全密码验证请求无响应");
          }
          if (!commitPasswordResp.role?.statistics?.["que:wh:tm"]) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} === 密码解除失败,请检查密码是否配置正确 ===`,
              type: "error",
            });
            tokenStatus.value[tokenId] = "failed";
            return;
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 安全密码验证成功 ===`,
            type: "success",
          });

          // 安全校验：确保赠送数量大于0
          if (!giftConfig.quantity || giftConfig.quantity <= 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 赠送数量为0，跳过赠送 ===`,
              type: "warning",
            });
            tokenStatus.value[tokenId] = "completed";
            return;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} === 开始赠送功法残卷${giftConfig.quantity}个,目标:[${giftConfig.serverName}] ID:${giftConfig.recipientId} ${giftConfig.name} ===`,
            type: "info",
          });

          const legacySendGiftResp = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legacy_sendgift",
            {
              itemCnt: giftConfig.quantity,
              legacyUIds: [],
              targetId: giftConfig.recipientId,
            },
            5000,
          );

          if (!legacySendGiftResp) {
            throw new Error("赠送请求无响应");
          }

          let totalGifted = giftConfig.quantity;
          let needsRetry = false;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 成功赠送功法残卷${giftConfig.quantity}个给[${giftConfig.serverName}] ID:${giftConfig.recipientId} ${giftConfig.name} ===`,
            type: "success",
          });

          // 特权模式：循环赠送剩余残卷（每次最多9999）
          if (hasLegacyPrivilege && actualFragmentCount > 9999) {
            let remaining = actualFragmentCount - giftConfig.quantity;
            let batchNum = 1;
            let hitServerLimit = false;
            while (remaining > 0 && !hitServerLimit) {
              batchNum++;
              const batchQty = Math.min(remaining, 9999);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 特权模式第${batchNum}批，剩余: ${remaining}，本次赠送: ${batchQty}`,
                type: "info",
              });

              try {
                const batchResp = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "legacy_sendgift",
                  {
                    itemCnt: batchQty,
                    legacyUIds: [],
                    targetId: giftConfig.recipientId,
                  },
                  5000,
                );

                if (!batchResp) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 第${batchNum}批赠送请求无响应，停止循环`,
                    type: "warning",
                  });
                  break;
                }

                totalGifted += batchQty;
                remaining -= batchQty;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `=== ${token.name} 第${batchNum}批成功赠送${batchQty}个，累计已赠: ${totalGifted} ===`,
                  type: "success",
                });
              } catch (batchError) {
                const batchErrMsg = batchError.message || "";
                // 400312/400340/200020 = 服务器限制或异常，需重试
                if (batchErrMsg.includes("400312") || batchErrMsg.includes("400340") || batchErrMsg.includes("200020")) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 第${batchNum}批触发服务器限制(${batchErrMsg.match(/\d{6,}/)?.[0] || ""})，已赠送${totalGifted}个，标记重试`,
                    type: "warning",
                  });
                  hitServerLimit = true;
                  needsRetry = true;
                } else {
                  // 其他错误：记录并停止循环，保留已成功的批次
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 第${batchNum}批赠送失败: ${batchErrMsg}，已赠送${totalGifted}个，停止循环`,
                    type: "error",
                  });
                  break;
                }
              }

              // 批次间延迟，避免请求过快
              if (remaining > 0 && !hitServerLimit) {
                await new Promise(r => setTimeout(r, 5000));
              }
            }
          }

          await tokenStore.sendMessage(tokenId, "role_getroleinfo");

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 赠送完成，共赠送${totalGifted}个残卷给[${giftConfig.serverName}] ID:${giftConfig.recipientId} ${giftConfig.name} ===`,
            type: "success",
          });

          tokenStatus.value[tokenId] = needsRetry ? "retryable" : "completed";
        } catch (error) {
          console.error(`赠送失败: ${error.message}`);

          let errorMsg = error.message || "未知错误";
          let errorType = "error";

          // 先判断是否可重试（检查原始错误信息）
          const isRetryable = errorMsg.includes("400340") || errorMsg.includes("400312") || errorMsg.includes("200020");

          // 检测特定错误码，优化显示文案
          if (errorMsg.includes("400312") || errorMsg.includes("12400080")) {
            errorMsg = "赠送次数达到服务器每日上限";
            errorType = "warning";
          } else if (errorMsg.includes("400340")) {
            errorMsg = "服务器限制(400340)";
            errorType = "warning";
          } else if (errorMsg.includes("200020")) {
            errorMsg = "服务器异常(200020)";
            errorType = "warning";
          } else if (errorMsg.includes("400010")) {
            errorMsg = "残卷数量不足";
          } else if (errorMsg.includes("200160")) {
            errorMsg = "模块未开启";
          } else if (errorMsg.includes("timeout")) {
            errorMsg = "请求超时";
            errorType = "warning";
          } else if (errorMsg.includes("网络")) {
            errorMsg = "网络错误";
            errorType = "warning";
          }
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 赠送功法残卷失败: ${errorMsg}${isRetryable ? "，待重试" : ""} ===`,
            type: errorType,
          });
          tokenStatus.value[tokenId] = isRetryable ? "retryable" : "failed";
        } finally {
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
    };

    const taskPromises = selectedTokens.value.map((tokenId) => processLegacyGift(tokenId));
    await Promise.all(taskPromises);

    // 第一轮全部完成，检查是否有需要重试的账号
    const retryableIds = selectedTokens.value.filter((id) => tokenStatus.value[id] === "retryable");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 第一轮全部完成，共 ${selectedTokens.value.length} 个账号，需重试: ${retryableIds.length} 个 ===`,
      type: "info",
    });

    // 重试 400340/400312/200020 的账号（第一轮全部完成后统一重试）
    const retryMax = retryableIds.length > 0 ? (batchSettings.defaultRetryCount || 2) : 0;
    const retryWait = batchSettings.retryDelay || 60000;
    let currentRetryIds = retryableIds;
    for (let r = 0; r < retryMax && currentRetryIds.length > 0 && !shouldStop.value; r++) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 等待 ${retryWait / 1000}s 后重试 ${currentRetryIds.length} 个受限账号 (第${r + 1}/${retryMax}轮) ===`,
        type: "warning",
      });
      // 重置状态为 running
      currentRetryIds.forEach((id) => { tokenStatus.value[id] = "running"; });
      await new Promise((resolve) => setTimeout(resolve, retryWait));
      const retryPromises = currentRetryIds.map((tokenId) => processLegacyGift(tokenId));
      await Promise.all(retryPromises);
      currentRetryIds = selectedTokens.value.filter((id) => tokenStatus.value[id] === "retryable");
    }
    // 剩余仍为 retryable 的标记为 failed
    selectedTokens.value.filter((id) => tokenStatus.value[id] === "retryable").forEach((id) => {
      tokenStatus.value[id] = "failed";
    });

    isRunning.value = false;
    currentRunningTokenId.value = null;

    const totalSuccess = selectedTokens.value.filter((id) => tokenStatus.value[id] === "completed").length;
    const totalFailed = selectedTokens.value.filter((id) => tokenStatus.value[id] === "failed").length;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 批量赠送功法残卷完成: 成功 ${totalSuccess} 个，失败 ${totalFailed} 个 ===`,
      type: "success",
    });

    message.success(
      `批量赠送功法残卷结束，成功 ${totalSuccess} 个，失败 ${totalFailed} 个`,
    );
  };

  /**
   * 批量领取残卷赠送奖励
   * 领取功法赠送任务的奖励（任务ID 1-6）
   */
  const batchLegacyClaimGiftTask = async () => {
    if (selectedTokens.value.length === 0)
      return;
    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    // 任务ID列表（1-6）
    const taskIds = [1, 2, 3, 4, 5, 6];

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value)
        return;
      tokenStatus.value[tokenId] = "running";

      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始领取残卷赠送奖励: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const taskId of taskIds) {
          if (shouldStop.value)
            break;

          try {
            const result = await tokenStore.sendMessageWithPromise(
              tokenId,
              "legacy_claimgifttask",
              { id: taskId },
              5000,
            );

            if (result?.roleLegacy) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取任务${taskId}奖励成功`,
                type: "success",
              });
              successCount++;
            } else {
              // 服务器正常响应但无 roleLegacy 字段，视为成功
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取任务${taskId}奖励成功`,
                type: "success",
              });
              successCount++;
            }

            await new Promise((r) => setTimeout(r, delayConfig.action));
          } catch (error) {
            const errorMsg = error.message || "";
            // 错误码700010表示任务未达成完成条件，跳过后续所有任务
            if (errorMsg.includes("700010")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 任务${taskId}未达成完成条件，跳过后续任务`,
                type: "info",
              });
              skipCount++;
              break;
            } else if (errorMsg.includes("12400170")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 任务${taskId}未完成，跳过`,
                type: "info",
              });
              skipCount++;
            } else if (errorMsg.includes("12400180")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 任务${taskId}已领取，跳过`,
                type: "info",
              });
              skipCount++;
            } else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 领取任务${taskId}失败: ${errorMsg}`,
                type: "error",
              });
              failCount++;
            }
          }
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 领取残卷赠送奖励完成: 成功 ${successCount}，跳过 ${skipCount}，失败 ${failCount} ===`,
          type: "success",
        });
        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 领取残卷赠送奖励失败: ${error.message} ===`,
          type: "error",
        });
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);

    isRunning.value = false;
    currentRunningTokenId.value = null;

    const totalSuccess = selectedTokens.value.filter((id) => tokenStatus.value[id] === "completed").length;
    const totalFailed = selectedTokens.value.filter((id) => tokenStatus.value[id] === "failed").length;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 批量领取残卷赠送奖励完成: 成功 ${totalSuccess} 个，失败 ${totalFailed} 个 ===`,
      type: "success",
    });

    message.success(
      `批量领取残卷赠送奖励结束，成功 ${totalSuccess} 个，失败 ${totalFailed} 个`,
    );
  };

  return {
    batchLegacyClaim,
    batchLegacyHangup,
    batchLegacyGiftSendEnhanced,
    batchLegacyClaimGiftTask,
  };
}
