/**
 * 车辆类任务
 * 包含: batchSmartSendCar, batchClaimCars, batchCarResearchUpgrade
 */

import { getModuleDelayCompat } from "@/utils/batch/delayManager";

/**
 * 创建车辆类任务执行器
 * @param {object} deps - 依赖项
 * @returns {object} 任务函数集合
 */
export function createTasksCar(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    runStreaming,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
    normalizeCars,
    gradeLabel,
    shouldSendCar,
    canClaim,
    isBigPrize,
    countRacingRefreshTickets,
    getModuleDelay,
  } = deps;

  // 使用集中式延迟管理器（兼容新旧API）
  const _getModuleDelay = (moduleName) => {
    if (getModuleDelay) return getModuleDelay(moduleName);
    return getModuleDelayCompat(moduleName, batchSettings);
  };

  /** 获取命令超时时间 */
  const getTimeout = () => batchSettings.defaultCommandTimeout || 5000;

  // ========== 公共辅助函数 ==========

  /** 发车命令封装 */
  const sendCar = async (tokenId, car) => {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "car_send",
      {
        carId: String(car.id),
        helperId: car.helperId ? String(car.helperId) : 0,
        text: "",
        isUpgrade: false,
      },
      getTimeout(),
    );
    await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
  };

  /** 获取刷新券数量（内部捕获异常，不会抛出） */
  const getRefreshTickets = async (tokenId) => {
    try {
      const roleRes = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, getTimeout());
      return {
        tickets: Number(roleRes?.role?.items?.[35002]?.quantity || 0),
        roleId: roleRes?.role?.roleId ? String(roleRes.role.roleId) : null,
        researchLevel: roleRes?.roleCar?.research?.[1] || 0,
      };
    } catch (_) {
      return { tickets: 0, roleId: null, researchLevel: 0 };
    }
  };

  /** 关闭连接并记录日志 */
  const closeConnection = (tokenId, tokenName) => {
    tokenStore.closeWebSocketConnection(tokenId);
    releaseConnectionSlot();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `${tokenName} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });
  };

  /** 判断是否为可重试错误码 */
  const isRetryableClaimError = (errorMsg) => {
    return errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010");
  };

  /** 从错误消息中提取错误码 */
  const extractErrorCode = (errorMsg) => {
    if (errorMsg.includes("400340")) return "400340";
    if (errorMsg.includes("200750")) return "200750";
    if (errorMsg.includes("11800010")) return "11800010";
    if (errorMsg.includes("12000030")) return "12000030";
    if (errorMsg.includes("12000050")) return "12000050";
    return "unknown";
  };

  // ========== 智能发车 ==========

  const batchSmartSendCar = async (taskSmartDeparture) => {
    if (selectedTokens.value.length === 0) return;

    try {
      isRunning.value = true;
      shouldStop.value = false;
      selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

      // 任务级发车条件覆盖全局设置
      const effectiveCarMinColor = (taskSmartDeparture && taskSmartDeparture.enabled)
        ? (taskSmartDeparture.carMinColor ?? batchSettings.carMinColor)
        : batchSettings.carMinColor;
      const effectiveConditions = (taskSmartDeparture && taskSmartDeparture.enabled) ? {
        gold: taskSmartDeparture.goldThreshold ?? batchSettings.smartDepartureGoldThreshold,
        recruit: taskSmartDeparture.recruitThreshold ?? batchSettings.smartDepartureRecruitThreshold,
        jade: taskSmartDeparture.jadeThreshold ?? batchSettings.smartDepartureJadeThreshold,
        ticket: taskSmartDeparture.ticketThreshold ?? batchSettings.smartDepartureTicketThreshold,
      } : (batchSettings.smartDepartureEnabled !== false ? {
        gold: batchSettings.smartDepartureGoldThreshold,
        recruit: batchSettings.smartDepartureRecruitThreshold,
        jade: batchSettings.smartDepartureJadeThreshold,
        ticket: batchSettings.smartDepartureTicketThreshold,
      } : {});

      // 任务级刷新延迟覆盖全局设置
      const effectiveRefreshDelay = (taskSmartDeparture && taskSmartDeparture.enabled && taskSmartDeparture.refreshDelay != null)
        ? taskSmartDeparture.refreshDelay * 1000
        : _getModuleDelay('default');

      // 任务级“最低品质必须同时满足”覆盖全局设置
      const effectiveRequireMinColor = (taskSmartDeparture && taskSmartDeparture.enabled && taskSmartDeparture.requireMinColorWithConditions != null)
        ? taskSmartDeparture.requireMinColorWithConditions
        : (batchSettings.requireMinColorWithConditions || false);
      
      // 任务级“自定义优先”覆盖全局设置
      const effectiveCustomPriority = (taskSmartDeparture && taskSmartDeparture.enabled && taskSmartDeparture.customPriority != null)
        ? taskSmartDeparture.customPriority
        : (batchSettings.customPriority || false);

      // 任务级"强制用金砖刷新"覆盖全局设置
      const effectiveUseGoldRefresh = (taskSmartDeparture && taskSmartDeparture.enabled && taskSmartDeparture.useGoldRefreshFallback != null)
        ? taskSmartDeparture.useGoldRefreshFallback
        : (batchSettings.useGoldRefreshFallback || false);

      // 400340重试队列：收集第一批执行中遇到400340错误的账号
      const retry400340Tokens = [];
      const MAX_400340_RETRIES = batchSettings.defaultRetryCount ?? 2;
      const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000;

      // 单账号智能发车逻辑（可在重试中复用）
      const executeSmartSendCarForToken = async (tokenId) => {
        const token = tokens.value.find((t) => t.id === tokenId);
        tokenStatus.value[tokenId] = "running";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始智能发车: ${token.name} ===`, type: "info" });
        await ensureConnection(tokenId);

        // 1. 获取车辆信息
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 获取车辆信息...`, type: "info" });
        const res = await tokenStore.sendMessageWithPromise(tokenId, "car_getrolecar", {}, getTimeout());
        const carList = normalizeCars(res?.body ?? res);

        await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

        // 2. 获取刷新券 & 角色ID
        const { tickets: initialTickets, roleId: currentRoleId } = await getRefreshTickets(tokenId);
        let refreshTickets = initialTickets;
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 剩余刷新次数: ${refreshTickets}`, type: "info" });

        await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

        // 3. 获取护卫数据
        const { sortedHelpers, helperUsageMap } = await fetchHelperData(tokenId, token.name, currentRoleId);

        // 3.5 读取该账号单独设置的预设护卫成员
        let tokenHelperPresets = [];
        try {
          const accountSettingsRaw = localStorage.getItem(`daily-settings:${tokenId}`);
          if (accountSettingsRaw) {
            const accountSettings = JSON.parse(accountSettingsRaw);
            if (accountSettings.helperPresets && Array.isArray(accountSettings.helperPresets)) {
              tokenHelperPresets = accountSettings.helperPresets;
            }
          }
        } catch (_) { /* 读取失败则不使用预设 */ }
        if (tokenHelperPresets.length > 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 已配置预设护卫成员(${tokenHelperPresets.length}人)，智能发车将优先使用`, type: "info" });
        }

        // 4. 构建发车条件（使用任务级或全局配置）
        const customConditions = effectiveConditions;

        // 5. 遍历车辆处理（refreshTickets 在循环中实时更新）
        for (const car of carList) {
          if (shouldStop.value) break;
          if (Number(car.sendAt || car.sendat || 0) !== 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 车辆[${gradeLabel(car.color)}]已发车，跳过`, type: "info" });
            continue;
          }

          try {
            // processCarForSmartSend 返回处理后的刷新券数量，用于后续车辆判断
            refreshTickets = await processCarForSmartSend(tokenId, token.name, car, refreshTickets, customConditions, effectiveCarMinColor, effectiveRefreshDelay, effectiveRequireMinColor, effectiveUseGoldRefresh, effectiveCustomPriority, sortedHelpers, helperUsageMap, tokenHelperPresets);
          } catch (carError) {
            const errorMsg = carError.message || "未知错误";
            // 12000030/400340/200750/11800010 错误向上抛出，由批次重试逻辑统一处理
            if (errorMsg.includes("12000030") || errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010")) {
              const errCode = extractErrorCode(errorMsg);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]服务器错误${errCode}，已加入重试队列`,
                type: "warning",
              });
              throw carError;
            }
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]处理失败: ${errorMsg.includes("12000050") ? "发车次数已达上限，跳过执行" : errorMsg}`,
              type: errorMsg.includes("12000050") ? "warning" : "error",
            });
          }

          // 车辆间延迟
          await new Promise((r) => setTimeout(r, _getModuleDelay('default')));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 智能发车完成 ===`, type: "success" });
      };

      // 严格分批执行：每批 maxActive 个账号，一批完成后再执行下一批
      const maxConcurrent = batchSettings.maxActive || 5;
      const allTokenIds = [...selectedTokens.value];
      let batchIndex = 0;

      for (let i = 0; i < allTokenIds.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        batchIndex++;
        const batch = allTokenIds.slice(i, i + maxConcurrent);
        const totalBatches = Math.ceil(allTokenIds.length / maxConcurrent);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n=== 第 ${batchIndex}/${totalBatches} 批（${batch.length} 个账号）===`,
          type: "info",
        });

        await Promise.all(batch.map(async (tokenId) => {
          if (shouldStop.value) return;
          const token = tokens.value.find((t) => t.id === tokenId);

          try {
            await executeSmartSendCarForToken(tokenId);
            // 成功后关闭连接并释放槽位
            closeConnection(tokenId, token.name);
          } catch (error) {
            const errorMsg = error.message || "";
            if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010") || errorMsg.includes("12000030") || errorMsg.includes("请求超时") || errorMsg.includes("timeout")) {
              // 服务器错误/限流/超时，加入重试队列（关闭连接释放槽位，重试时重新连接）
              const isTimeout = errorMsg.includes("请求超时") || errorMsg.includes("timeout");
              closeConnection(tokenId, token.name);
              retry400340Tokens.push(tokenId);
              tokenStatus.value[tokenId] = "waiting_retry";
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⚠️ ${token.name} 遇到${isTimeout ? "请求超时" : extractErrorCode(errorMsg)}错误，已加入重试队列（等待本批完成后重试）`,
                type: "warning",
              });
            } else {
              console.error(error);
              tokenStatus.value[tokenId] = "failed";
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 智能发车失败: ${error.message}`, type: "error" });
              closeConnection(tokenId, token.name);
            }
          }
        }));

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `第 ${batchIndex} 批执行完毕`,
          type: "info",
        });

        // 批次间延迟（非最后一批时）
        if (i + maxConcurrent < allTokenIds.length && !shouldStop.value) {
          const batchWait = _getModuleDelay('car');
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `等待 ${batchWait / 1000} 秒后执行下一批...`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, batchWait));
        }
      }

      // ==================== 400340 重试逻辑 ====================
      if (retry400340Tokens.length > 0 && !shouldStop.value) {
        const waitSeconds = RETRY_WAIT_TIME / 1000;
        const waitMinutes = Math.floor(waitSeconds / 60);
        const waitDesc = waitMinutes > 0 ? `${waitMinutes}分钟` : `${waitSeconds}秒`;

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `\n=== 第一批执行完成，${retry400340Tokens.length} 个账号遇到服务器错误，等待${waitDesc}后重试 ===`,
          type: "info",
        });

        for (let retryRound = 0; retryRound < MAX_400340_RETRIES && retry400340Tokens.length > 0 && !shouldStop.value; retryRound++) {
          // 等待重试延迟
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `⏳ 等待${waitDesc}后进行第${retryRound + 1}次重试（${retry400340Tokens.length}个账号）...`,
            type: "info",
          });
          await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));

          if (shouldStop.value) break;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `\n=== 开始重试 第${retryRound + 1}/${MAX_400340_RETRIES}次（${retry400340Tokens.length}个账号）===`,
            type: "info",
          });

          const stillFailed = [];

          // 重试也分批执行
          for (let i = 0; i < retry400340Tokens.length; i += maxConcurrent) {
            if (shouldStop.value) break;
            const batch = retry400340Tokens.slice(i, i + maxConcurrent);

            await Promise.all(batch.map(async (tokenId) => {
              const token = tokens.value.find((t) => t.id === tokenId);
              if (!token) return;

              try {
                // 重试时先关闭旧连接再重新连接
                closeConnection(tokenId, token.name);
                await executeSmartSendCarForToken(tokenId);
                closeConnection(tokenId, token.name);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `✅ ${token.name} 重试成功`,
                  type: "success",
                });
              } catch (retryError) {
                const errorMsg = retryError.message || "";
                if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010") || errorMsg.includes("12000030") || errorMsg.includes("请求超时") || errorMsg.includes("timeout")) {
                  const isTimeout = errorMsg.includes("请求超时") || errorMsg.includes("timeout");
                  stillFailed.push(tokenId);
                  tokenStatus.value[tokenId] = "waiting_retry";
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `⚠️ ${token.name} 重试仍遇到${isTimeout ? "请求超时" : extractErrorCode(errorMsg)}错误，等待下次重试`,
                    type: "warning",
                  });
                } else {
                  tokenStatus.value[tokenId] = "failed";
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `❌ ${token.name} 重试失败: ${retryError.message}`,
                    type: "error",
                  });
                  closeConnection(tokenId, token.name);
                }
              }
            }));
          }

          retry400340Tokens.length = 0;
          retry400340Tokens.push(...stillFailed);

          if (retry400340Tokens.length === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `✅ 所有错误账号重试成功！`,
              type: "success",
            });
          }
        }

        // 最终仍失败的账号
        if (retry400340Tokens.length > 0) {
          for (const tokenId of retry400340Tokens) {
            tokenStatus.value[tokenId] = "failed";
            const token = tokens.value.find((t) => t.id === tokenId);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `❌ ${token?.name} 重试${MAX_400340_RETRIES}次后仍失败`,
              type: "error",
            });
            closeConnection(tokenId, token?.name || "");
          }
        }
      }

      refreshCompletedTokens();
      message.success("批量智能发车结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /** 获取护卫数据 */
  const fetchHelperData = async (tokenId, tokenName, currentRoleId) => {
    let helperUsageMap = {};
    let sortedHelpers = [];

    try {
      // 获取护卫使用情况
      try {
        const usageRes = await tokenStore.sendMessageWithPromise(tokenId, "car_getmemberhelpingcnt", {}, getTimeout());
        helperUsageMap = usageRes?.body?.memberHelpingCntMap || usageRes?.memberHelpingCntMap || {};
      } catch (e) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取护卫使用次数失败: ${e.message}，将使用空数据`, type: "warning" });
      }

      await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

      // 获取军团成员（带重试）
      let legionRes = null;
      const maxRetries = 2;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          legionRes = await tokenStore.sendMessageWithPromise(tokenId, "legion_getinfo", {}, getTimeout());
          break; // 成功则跳出重试循环
        } catch (e) {
          if (attempt < maxRetries) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取军团信息失败(第${attempt}次)，重试中...`, type: "warning" });
            await new Promise((r) => setTimeout(r, 1000));
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取军团信息失败: ${e.message}，将不带护卫发车`, type: "warning" });
          }
        }
      }

      if (legionRes) {
        const membersMap = legionRes?.body?.info?.members || legionRes?.info?.members || {};

        sortedHelpers = Object.values(membersMap)
          .filter((m) => !currentRoleId || String(m.roleId) !== currentRoleId)
          .map((m) => ({ id: String(m.roleId), name: m.name || m.nickname || String(m.roleId), redQuench: m.custom?.red_quench_cnt || 0 }))
          .sort((a, b) => b.redQuench - a.redQuench);

        const topHelpers = sortedHelpers.slice(0, 5);
        if (topHelpers.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${tokenName} 护卫优先级(前5): ${topHelpers.map((h, i) => `${i + 1}.${h.name}(红粹:${h.redQuench})`).join(", ")}`,
            type: "info",
          });
        }
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取到 ${sortedHelpers.length} 位潜在护卫`, type: "info" });
      }
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取护卫数据失败: ${e.message}，将不带护卫发车`, type: "warning" });
    }

    return { sortedHelpers, helperUsageMap };
  };

  /** 分配护卫 */
  const assignHelper = async (tokenId, tokenName, car, sortedHelpers, helperUsageMap, helperPresets = []) => {
    if (Number(car.color || 0) < 5 || car.helperId) return;
    // 使用本地跟踪的 helperUsageMap，不再重复查询服务器

    if (!sortedHelpers.length) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]需要护卫，但未获取到可用护卫列表`, type: "warning" });
      return;
    }

    // 预设护卫优先：如果配置了预设成员，优先按预设顺序分配
    if (helperPresets && helperPresets.length > 0) {
      const presetHelper = sortedHelpers.find((h) => {
        return helperPresets.includes(h.id) && Number(helperUsageMap[h.id] || 0) < 4;
      });
      if (presetHelper) {
        car.helperId = presetHelper.id;
        helperUsageMap[presetHelper.id] = Number(helperUsageMap[presetHelper.id] || 0) + 1;
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]使用预设护卫: ${presetHelper.name} (已助战: ${helperUsageMap[presetHelper.id]}/4)`, type: "success" });
        return;
      }
      // 预设成员次数已满，回退到自动分配
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 预设护卫次数已满，回退到自动分配`, type: "info" });
    }

    // 原有自动分配逻辑
    const bestHelper = sortedHelpers.find((h) => Number(helperUsageMap[h.id] || 0) < 4);
    if (bestHelper) {
      car.helperId = bestHelper.id;
      helperUsageMap[bestHelper.id] = Number(helperUsageMap[bestHelper.id] || 0) + 1;
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]自动分配护卫: ${bestHelper.name} (已助战: ${helperUsageMap[bestHelper.id]}/4)`, type: "success" });
    } else {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]需要护卫，但所有护卫次数已满`, type: "warning" });
    }
  };

  /** 处理单辆车的智能发车逻辑，返回处理后的最新刷新券数量 */
  const processCarForSmartSend = async (tokenId, tokenName, car, refreshTickets, customConditions, carMinColor, refreshDelay, requireMinColorWithConditions, useGoldRefresh, customPriority, sortedHelpers, helperUsageMap, helperPresets = []) => {
    const effectiveTickets = useGoldRefresh ? 999 : refreshTickets;
    const assignHelperFn = async () => assignHelper(tokenId, tokenName, car, sortedHelpers, helperUsageMap, helperPresets);

    // 检查是否直接满足发车条件
    if (shouldSendCar(car, effectiveTickets, carMinColor, customConditions, useGoldRefresh, requireMinColorWithConditions, customPriority)) {
      await assignHelperFn();
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]满足条件，直接发车`, type: "info" });
      await sendCar(tokenId, car);
      return refreshTickets;
    }

    // 不满足条件，判断是否可以刷新
    const hasFreeRefresh = Number(car.refreshCount ?? 0) === 0;
    // 金砖模式下无视刷新券数量，始终尝试刷新；普通模式下刷新券不足且无免费次数则直接发车
    if (!useGoldRefresh && refreshTickets < 6 && !hasFreeRefresh) {
      await assignHelperFn();
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]刷新券不足(${refreshTickets}张)，保留该车辆，直接发车`, type: "warning" });
      await sendCar(tokenId, car);
      return refreshTickets;
    }

    if (refreshTickets >= 6) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]刷新券充足(${refreshTickets}张)，尝试刷新追求自定义条件`, type: "info" });
    } else {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]有免费刷新次数，尝试刷新`, type: "info" });
    }

    // 刷新循环（金砖模式最多20次，普通模式最多13次）
    let currentTickets = refreshTickets;
    const maxRefreshAttempts = useGoldRefresh ? 20 : 13;
    for (let refreshAttempt = 0; refreshAttempt < maxRefreshAttempts && !shouldStop.value; refreshAttempt++) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]尝试刷新(第${refreshAttempt + 1}次)...`, type: "info" });

      // car_refresh 带 12000030 限流局部重试（对齐旧版 carUtils.js smartSendCar 逻辑）
      const maxRefreshRetry = batchSettings.defaultRetryCount ?? 2;
      const refreshRetryDelay = batchSettings.retryDelay || 60000;
      let refreshResp;
      for (let rr = 0; rr <= maxRefreshRetry; rr++) {
        try {
          refreshResp = await tokenStore.sendMessageWithPromise(tokenId, "car_refresh", { carId: String(car.id) }, getTimeout());
          break;
        } catch (refreshErr) {
          const rm = refreshErr.message || "";
          if (rm.includes("12000030") && rr < maxRefreshRetry) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]刷新被限流(12000030)，等待${refreshRetryDelay / 1000}秒后重试(${rr + 1}/${maxRefreshRetry})...`, type: "warning" });
            await new Promise((r) => setTimeout(r, refreshRetryDelay));
          } else {
            throw refreshErr;
          }
        }
      }
      const data = refreshResp?.car || refreshResp?.body?.car || refreshResp;
      if (data && typeof data === "object") {
        if (data.color != null) car.color = Number(data.color);
        if (data.refreshCount != null) car.refreshCount = Number(data.refreshCount);
        if (data.rewards != null) car.rewards = data.rewards;
      }

      // 本地计算刷新券数量（每次刷新-1，金砖模式不消耗刷新券）
      if (!useGoldRefresh) {
        currentTickets--;
      }

      await new Promise((r) => setTimeout(r, _getModuleDelay('default')));

      // 检查刷新后是否满足条件
      if (shouldSendCar(car, currentTickets, carMinColor, customConditions, useGoldRefresh, requireMinColorWithConditions, customPriority)) {
        await assignHelperFn();
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`, type: "success" });
        // 等待服务端数据同步，防止刷新后立即发车触发12000030限流
        await new Promise((r) => setTimeout(r, refreshDelay));
        await sendCar(tokenId, car);
        return currentTickets;
      }

      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 刷新后: 颜色=${gradeLabel(car.color)}, 刷新券=${currentTickets}，继续刷新...`, type: "info" });

      // 判断是否继续刷新（金砖模式下无视刷新券数量，持续刷新）
      if (!useGoldRefresh && currentTickets < 6 && Number(car.refreshCount ?? 0) !== 0) {
        await assignHelperFn();
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 刷新后车辆[${gradeLabel(car.color)}]刷新券不足(${currentTickets}张)，停止刷新，直接发车`, type: "warning" });
        // 等待服务端数据同步
        await new Promise((r) => setTimeout(r, refreshDelay));
        await sendCar(tokenId, car);
        return currentTickets;
      }

      await new Promise((r) => setTimeout(r, refreshDelay));
    }

    // 刷新次数用尽，强制发车
    await assignHelperFn();
    addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]刷新次数用尽，强制发车`, type: "warning" });
    // 等待服务端数据同步
    await new Promise((r) => setTimeout(r, refreshDelay));
    await sendCar(tokenId, car);
    return currentTickets;
  };

  // ========== 一键收车 ==========

  const batchClaimCars = async () => {
    if (selectedTokens.value.length === 0) return;

    try {
      isRunning.value = true;
      shouldStop.value = false;
      selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

      const retryTasks = [];

      // ✅ 优化 1：共享限流冷却状态（跨账号）
      // 任一账号触发 400340 → 所有账号主动避让，避免并发风暴连锁触发限流
      const sharedCooldown = {
        lastRateLimitTime: 0,
        cooldownMs: 12000, // ✅ 任账号触发限流后 12s 内所有账号主动避让
      };
      const recordRateLimit = () => {
        sharedCooldown.lastRateLimitTime = Date.now();
      };
      const waitForCooldown = async (tokenName) => {
        const elapsed = Date.now() - sharedCooldown.lastRateLimitTime;
        if (elapsed < sharedCooldown.cooldownMs) {
          const waitMs = sharedCooldown.cooldownMs - elapsed;
          addLog({ time: new Date().toLocaleTimeString(), message: `⏱️ ${tokenName} 检测到限流冷却中，主动避让 ${(waitMs / 1000).toFixed(1)}s`, type: "info" });
          await new Promise((r) => setTimeout(r, waitMs));
        }
      };

      // 第一轮：执行所有账号的收车（并发数走外部 batchSettings.maxActive，与智能发车等其他模块一致）
      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value) return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);
        let successCount = 0;
        let failCount = 0;

        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始一键收车: ${token.name} ===`, type: "info" });
          await ensureConnection(tokenId);

          // ✅ 优化 3：发送 car_claim 前先检查共享冷却，避免其他账号刚触发限流时继续踩坑
          await waitForCooldown(token.name);

          const res = await tokenStore.sendMessageWithPromise(tokenId, "car_getrolecar", {}, getTimeout());
          const carList = normalizeCars(res?.body ?? res);

          const claimableCars = carList.filter((car) => canClaim(car));
          if (claimableCars.length === 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 没有可收取的车辆，跳过收车`, type: "info" });
            tokenStatus.value[tokenId] = "completed";
            return;
          }

          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 检测到 ${claimableCars.length} 辆可收取的车辆，开始收车`, type: "info" });

          // ✅ 修复：400340 触发后终止本账号循环，剩余车全部加入重试队列
          let hitRateLimit = false;

          for (const car of carList) {
            if (shouldStop.value) break;
            if (!car.id || !canClaim(car)) continue;

            // ✅ 修复：已触发限流时直接入队，不再发请求加剧服务端压力
            if (hitRateLimit) {
              retryTasks.push({ tokenId, tokenName: token.name, car });
              failCount++;
              continue;
            }

            // ✅ 每辆车请求前再次检查共享冷却（其他账号可能刚触发限流）
            await waitForCooldown(token.name);

            try {
              await tokenStore.sendMessageWithPromise(tokenId, "car_claim", { carId: String(car.id) }, getTimeout());
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车成功: ${gradeLabel(car.color)}`, type: "success" });
              // ✅ 收车间隔统一走 _getModuleDelay('car')（car→battle 分组），受「⚙️ 延迟设置」战斗操作滑块控制
              await new Promise((r) => setTimeout(r, _getModuleDelay('car')));
            } catch (error) {
              const errorMsg = error.message || "";
              if (isRetryableClaimError(errorMsg)) {
                const errCode = extractErrorCode(errorMsg);
                // ✅ 关键修复：400340（限流）触发后终止当前账号循环 + 记录共享冷却
                if (errorMsg.includes("400340")) {
                  recordRateLimit();
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 触发限流 ${errCode}，剩余车辆停止请求并加入重试队列（其他账号冷却 12s）`, type: "warning" });
                  retryTasks.push({ tokenId, tokenName: token.name, car });
                  failCount++;
                  hitRateLimit = true;
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车失败: 服务器错误${errCode}，加入重试队列`, type: "warning" });
                  retryTasks.push({ tokenId, tokenName: token.name, car });
                  failCount++;
                  // ✅ 非限流的可重试错误也加延迟，避免连续请求
                  await new Promise((r) => setTimeout(r, _getModuleDelay('car')));
                }
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车失败: ${errorMsg}`, type: "error" });
                failCount++;
              }
            }
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: successCount === 0 && failCount === 0
              ? `${token.name} 没有可收取的车辆`
              : `${token.name} 收车完成: 成功${successCount}辆，失败${failCount}辆`,
            type: successCount > 0 ? "success" : "info",
          });
          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车异常: ${error.message}`, type: "error" });
        } finally {
          closeConnection(tokenId, token.name);
        }
      });

      // 重试阶段（重试循环内部已对齐智能发车模式：每轮重试前先等待 batchSettings.retryDelay）
      if (retryTasks.length > 0 && !shouldStop.value) {
        await executeRetryRound(retryTasks, sharedCooldown);
      }

      refreshCompletedTokens();
      message.success("批量一键收车结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /** 执行重试轮次（对齐智能发车重试模式：每轮重试前等待 batchSettings.retryDelay） */
  const executeRetryRound = async (retryTasks, sharedCooldown) => {
    const MAX_RETRIES = batchSettings.defaultRetryCount ?? 2;
    const RETRY_WAIT_TIME = batchSettings.retryDelay || 60000; // ✅ 对齐智能发车，默认 60s
    const maxConcurrent = batchSettings.maxActive || 5; // 重试并发数走外部配置（与主流程一致）
    const recordRateLimit = () => { if (sharedCooldown) sharedCooldown.lastRateLimitTime = Date.now(); };
    const waitForCooldown = async (tokenName) => {
      if (!sharedCooldown) return;
      const elapsed = Date.now() - sharedCooldown.lastRateLimitTime;
      if (elapsed < sharedCooldown.cooldownMs) {
        const waitMs = sharedCooldown.cooldownMs - elapsed;
        addLog({ time: new Date().toLocaleTimeString(), message: `⏱️ ${tokenName} 重试冷却中，主动避让 ${(waitMs / 1000).toFixed(1)}s`, type: "info" });
        await new Promise((r) => setTimeout(r, waitMs));
      }
    };
    addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 开始重试 ${retryTasks.length} 个服务器错误的收车任务 ==========`, type: "info" });

    let pendingTasks = [...retryTasks];

    for (let round = 1; round <= MAX_RETRIES && pendingTasks.length > 0 && !shouldStop.value; round++) {
      // ✅ 关键对齐：每轮重试前先等待 RETRY_WAIT_TIME（与智能发车一致）
      const waitSeconds = RETRY_WAIT_TIME / 1000;
      const waitMinutes = Math.floor(waitSeconds / 60);
      const waitDesc = waitMinutes > 0 ? `${waitMinutes}分钟` : `${waitSeconds}秒`;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `\n⏳ 等待${waitDesc}后进行第 ${round}/${MAX_RETRIES} 轮重试（${pendingTasks.length} 个任务）...`,
        type: "info",
      });
      await new Promise((r) => setTimeout(r, RETRY_WAIT_TIME));
      if (shouldStop.value) break;

      addLog({ time: new Date().toLocaleTimeString(), message: `--- 开始重试 第${round}/${MAX_RETRIES}轮，共 ${pendingTasks.length} 个任务 ---`, type: "info" });

      const stillFailed = [];
      let retrySuccess = 0;

      // ✅ 按账号分组，同一账号的多辆车共用连接
      const tasksByToken = new Map();
      for (const task of pendingTasks) {
        if (!tasksByToken.has(task.tokenId)) tasksByToken.set(task.tokenId, []);
        tasksByToken.get(task.tokenId).push(task);
      }
      const tokenGroups = [...tasksByToken.entries()];
      const totalBatches = Math.ceil(tokenGroups.length / maxConcurrent);

      // ✅ 分批并发执行（使用外部 maxActive 设置）
      for (let i = 0; i < tokenGroups.length; i += maxConcurrent) {
        if (shouldStop.value) break;
        const batch = tokenGroups.slice(i, i + maxConcurrent);
        const batchIndex = Math.floor(i / maxConcurrent) + 1;

        if (totalBatches > 1) {
          addLog({ time: new Date().toLocaleTimeString(), message: `--- 重试第 ${batchIndex}/${totalBatches} 批（${batch.length} 个账号）---`, type: "info" });
        }

        await Promise.all(batch.map(async ([tokenId, tasks]) => {
          const tokenName = tasks[0].tokenName;
          try {
            await ensureConnection(tokenId);

            let rateLimited = false; // ✅ 重试时若触发 400340，跳过剩余车辆
            for (const task of tasks) {
              if (shouldStop.value) break;
              // ✅ 已触发限流，直接入队等下一轮，不再请求
              if (rateLimited) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试收车 [${gradeLabel(task.car.color)}]：本账号已触发限流，跳过等下一轮`, type: "info" });
                stillFailed.push(task);
                continue;
              }
              // ✅ 重试也走共享冷却，避免并发账号同时踩限流坑
              await waitForCooldown(tokenName);
              try {
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试收车 [${gradeLabel(task.car.color)}] (第${round}次)...`, type: "info" });
                await tokenStore.sendMessageWithPromise(tokenId, "car_claim", { carId: String(task.car.id) }, getTimeout());
                retrySuccess++;
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试收车成功：${gradeLabel(task.car.color)}`, type: "success" });
                // ✅ 重试收车间隔统一走 _getModuleDelay('car')（car→battle 分组）
                await new Promise((r) => setTimeout(r, _getModuleDelay('car')));
              } catch (error) {
                const errorMsg = error.message || "";
                if (isRetryableClaimError(errorMsg)) {
                  const errCode = extractErrorCode(errorMsg);
                  if (errorMsg.includes("400340")) {
                    recordRateLimit();
                    // ✅ 限流后停止本账号剩余请求，入队下一轮重试
                    addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试触发限流 ${errCode}，剩余车辆等下一轮（其他账号冷却 12s）`, type: "warning" });
                    rateLimited = true;
                  } else {
                    addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试失败：${errCode}错误，等待下次重试`, type: "warning" });
                    // 非限流错误加延迟避免连续请求
                    await new Promise((r) => setTimeout(r, _getModuleDelay('car')));
                  }
                  stillFailed.push(task);
                } else {
                  addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 重试失败：${errorMsg}`, type: "error" });
                }
              }
            }
          } finally {
            closeConnection(tokenId, tokenName);
          }
        }));
      }

      pendingTasks = stillFailed;
      addLog({ time: new Date().toLocaleTimeString(), message: `本轮重试结果: 成功${retrySuccess}个，失败${stillFailed.length}个`, type: "info" });

      if (pendingTasks.length === 0) {
        addLog({ time: new Date().toLocaleTimeString(), message: `✅ 所有错误任务重试成功！`, type: "success" });
      }
    }

    if (pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        const token = tokens.value.find((t) => t.id === task.tokenId);
        addLog({ time: new Date().toLocaleTimeString(), message: `❌ ${token?.name || task.tokenName} 重试${MAX_RETRIES}次后仍失败：${gradeLabel(task.car.color)}`, type: "error" });
      }
      addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 仍有 ${pendingTasks.length} 个任务重试${MAX_RETRIES}次后失败 ==========`, type: "error" });
    } else {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 所有重试错误任务重试成功 ==========`, type: "success" });
    }
  };

  // ========== 升级改装 ==========

  const batchCarResearchUpgrade = async () => {
    if (selectedTokens.value.length === 0) return;
  
    const researchLimits = [
      { researchId: 1, maxLevel: 60, name: "发动机" },
      { researchId: 2, maxLevel: 60, unlockPart: 1, name: "车架" },
      { researchId: 3, maxLevel: 60, unlockPart: 2, name: "悬架系统" },
      { researchId: 4, maxLevel: 60, unlockPart: 3, name: "驾驶雷达" },
    ];
  
    // 从模板获取改装策略（默认为积分优先）
    const carUpgradeStrategy = batchSettings.carUpgradeStrategy || 'score';

    try {
      isRunning.value = true;
      shouldStop.value = false;
      selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value) return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);

        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始升级改装：${token.name} [策略:${carUpgradeStrategy === 'score' ? '积分优先' : '排名优先'}] ===`, type: "info" });
          await ensureConnection(tokenId);
        
          // 获取角色信息以获取积分数据
          const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, getTimeout());
          let currentPoints = 0;
          if (roleInfoRes?.totalPointNum) {
            currentPoints = Number(roleInfoRes.totalPointNum) || 0;
          }
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 当前累计消耗积分：${currentPoints}`, type: "info" });
        
          // 判断是否为赛季最后一天（简单策略：距离 24:00 不足 6 小时）
          const now = new Date();
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          const hoursUntilEnd = (endOfDay - now) / 3600000;
          const isLastDay = hoursUntilEnd < 6;
                  
          // 根据策略选择不同的升级逻辑
          if (carUpgradeStrategy === 'rank') {
            // 排名优先策略：全部升满 60 级
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 启动排名优先策略，车辆全收并逐个部件升至满级 60`, type: "info" });
            for (const research of researchLimits) {
              if (shouldStop.value) break;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 开始升级${research.name}（目标${research.maxLevel}级）`, type: "info" });
              const finalLevel = await upgradeResearch(tokenId, token.name, research);
              if (finalLevel > 0) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${research.name}升级完成，共升到${finalLevel}级`, type: "success" });
              }
            }
          } else {
            // 积分优先策略：冲到 4002，必要时冲刺 5000
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 启动积分优先策略，升级到 4002 分停止（最后${hoursUntilEnd.toFixed(1)}小时结束），若可达 5000 则冲刺`, type: "info" });
            const targetScore = isLastDay && currentPoints >= 4800 ? 5000 : 4002;
            const remainingToTarget = Math.max(0, targetScore - currentPoints);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 目标分数：${targetScore}, 尚缺：${remainingToTarget}`, type: "info" });
            const finalLevel = await scorePriorityUpgrade(tokenId, token.name, researchLimits, currentPoints, targetScore, isLastDay);
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 积分优先策略执行完毕`, type: "success" });
          }

          // 领取改装升级累计奖励（原 catch 静默 + 无奖励时不打印日志，导致看不到操作痕迹，现补充诊断日志）
          try {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 尝试领取改装升级累计奖励...`, type: "info" });
            const rewardRes = await tokenStore.sendMessageWithPromise(tokenId, "car_claimpartconsumereward", {}, getTimeout());
            if (rewardRes?.reward) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ✅ 领取改装升级累计奖励成功`, type: "success" });
            } else if (rewardRes?.error) {
              // 服务端返回的错误码（如无可领奖励、未达成条件等）
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ⚠️ 改装累计奖励未领取: ${rewardRes.error}`, type: "warning" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ℹ️ 改装累计奖励响应无 reward 字段（可能已领完或无需领取）`, type: "info" });
            }
          } catch (e) {
            // ✅ 错误码 200020 在累计奖励场景下意为“未达标”，原提示“重启游戏”与实际语义不符
            const msg = e.message || "";
            if (msg.includes("200020")) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ℹ️ 改装累计奖励还未达标，无法领取`, type: "info" });
            } else {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ❌ 领取改装累计奖励失败: ${msg}`, type: "error" });
            }
          }

          addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 改装升级完成 ===`, type: "success" });
          tokenStatus.value[tokenId] = "completed";
        } catch (error) {
          console.error(error);
          tokenStatus.value[tokenId] = "failed";
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 改装升级失败: ${error.message}`, type: "error" });
        } finally {
          closeConnection(tokenId, token.name);
        }
      });
      refreshCompletedTokens();
      message.success("批量升级改装结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /** 
   * 积分优先升级策略：升级到指定累计消耗分后停止
   * 参数说明:
   * - tokenId: token ID
   * - tokenName: token 名称
   * - researchLimits: 改装项目列表
   * - currentPoints: 当前已消耗积分
   * - targetScore: 目标分数 (4002 或 5000)
   * - isLastDay: 是否最后一天
   * 返回最终等级总和
   */
  const scorePriorityUpgrade = async (tokenId, tokenName, researchLimits, currentPoints, targetScore, isLastDay) => {
    let totalLevelSum = 0;
    
    // 逐个部件循环升级，每次只升一级，然后检查积分
    while (!shouldStop.value && currentPoints < targetScore) {
      let upgradedThisRound = false;
      
      for (const research of researchLimits) {
        if (shouldStop.value || currentPoints >= targetScore) break;
        
        try {
          // 发送升级请求
          await tokenStore.sendMessageWithPromise(tokenId, "car_research", { researchId: research.researchId }, getTimeout());
          
          // 升级成功，累加等级
          const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, getTimeout());
          currentPoints = Number(roleInfoRes?.totalPointNum) || currentPoints;
          totalLevelSum += (research.maxLevel || 60);
          upgradedThisRound = true;
          
          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name} +1 级 (当前积分:${currentPoints}/${targetScore}, 剩余:${Math.max(0, targetScore - currentPoints)})`, type: "success" });
          
          // 等待间隔
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
          
        } catch (error) {
          const msg = error.message || "";
          
          if (msg.includes("200400") || msg.includes("操作太快")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}操作太快，等待 4 秒后重试...`, type: "warning" });
            await new Promise((r) => setTimeout(r, 4000));
            // 重试一次
            try {
              await tokenStore.sendMessageWithPromise(tokenId, "car_research", { researchId: research.researchId }, getTimeout());
              const roleInfoRes = await tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}, getTimeout());
              currentPoints = Number(roleInfoRes?.totalPointNum) || currentPoints;
              totalLevelSum += (research.maxLevel || 60);
              upgradedThisRound = true;
              addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试成功 +1 级 (当前积分:${currentPoints})`, type: "success" });
              await new Promise((r) => setTimeout(r, 3000 + Math.random() * 1000));
            } catch (retryError) {
              if (retryError.message?.includes("200400")) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试仍然太快，等待 6 秒后继续下一个部件...`, type: "warning" });
                await new Promise((r) => setTimeout(r, 6000));
                break; // 跳出该部件，尝试下一个部件
              }
              addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试失败：${retryError.message}`, type: "error" });
              break;
            }
          } else if (msg.includes("已达上限") || msg.includes("数量不足") || msg.includes("12000100")) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}已达等级上限或条件不满足，跳过下一部件`, type: "info" });
            continue; // 尝试下一个部件
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}升级失败：${msg}`, type: "error" });
            break;
          }
        }
      }
      
      // 如果这一轮没有任何部件成功升级，说明所有部件都已满级或频繁触发限速
      if (!upgradedThisRound) {
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 本轮无升级发生（可能已达上限）`, type: "warning" });
        break;
      }
    }
    
    addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 积分优先升级结束，总累计升级 ${totalLevelSum} 级，最终积分：${currentPoints}/${targetScore}`, type: "success" });
    return totalLevelSum;
  };

  /** 升级单个改装项目，返回最终等级 */
  const upgradeResearch = async (tokenId, tokenName, research) => {
    let currentLevel = 0;

    while (currentLevel < research.maxLevel && !shouldStop.value) {
      try {
        await tokenStore.sendMessageWithPromise(tokenId, "car_research", { researchId: research.researchId }, getTimeout());
        currentLevel++;
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}升级到${currentLevel}级`, type: "success" });
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
      } catch (error) {
        const msg = error.message || "";

        if (msg.includes("200400")) {
          // 操作太快，等待后重试
          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}操作太快，等待4秒后重试...`, type: "warning" });
          await new Promise((r) => setTimeout(r, 4000));

          try {
            await tokenStore.sendMessageWithPromise(tokenId, "car_research", { researchId: research.researchId }, getTimeout());
            currentLevel++;
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试成功，升级到${currentLevel}级`, type: "success" });
            await new Promise((r) => setTimeout(r, 3000 + Math.random() * 1000));
          } catch (retryError) {
            if (retryError.message?.includes("200400")) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试仍然太快，等待6秒后继续...`, type: "warning" });
              await new Promise((r) => setTimeout(r, 6000));
              continue;
            }
            addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}重试失败: ${retryError.message}`, type: "error" });
            break;
          }
        } else if (msg.includes("400010") || msg.includes("已达上限") || msg.includes("数量不足") || msg.includes("12000100")) {
          const reason = msg.includes("12000100") ? "未满足升级条件" : "材料不足或已达上限";
          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}达到${currentLevel}级后${reason}，无法继续升级`, type: "info" });
          break;
        } else {
          addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} ${research.name}升级失败: ${msg}`, type: "error" });
          break;
        }
      }
    }

    return currentLevel;
  };

  // ========== 公共：刷新已完成账号的赛车状态 ==========
  const refreshCompletedTokens = () => {
    selectedTokens.value.forEach((tokenId) => {
      if (tokenStatus.value[tokenId] === "completed") {
        tokenStore.refreshGameData(tokenId);
      }
    });
  };

  return {
    batchSmartSendCar,
    batchClaimCars,
    batchCarResearchUpgrade,
  };
}
