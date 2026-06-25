/**
 * 车辆类任务
 * 包含: batchSmartSendCar, batchClaimCars, batchCarResearchUpgrade
 */

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
    delayConfig,
  } = deps;

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
    await new Promise((r) => setTimeout(r, delayConfig.action));
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

  /** 仅获取刷新券数量（轻量调用） */
  const getTicketCount = async (tokenId) => {
    return (await getRefreshTickets(tokenId)).tickets;
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
        : delayConfig.refresh;

      // 任务级"最低品质必须同时满足"覆盖全局设置
      const effectiveRequireMinColor = (taskSmartDeparture && taskSmartDeparture.enabled && taskSmartDeparture.requireMinColorWithConditions != null)
        ? taskSmartDeparture.requireMinColorWithConditions
        : (batchSettings.requireMinColorWithConditions || false);

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

        await new Promise((r) => setTimeout(r, delayConfig.command));

        // 2. 获取刷新券 & 角色ID
        const { tickets: initialTickets, roleId: currentRoleId } = await getRefreshTickets(tokenId);
        let refreshTickets = initialTickets;
        addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 剩余刷新次数: ${refreshTickets}`, type: "info" });

        await new Promise((r) => setTimeout(r, delayConfig.command));

        // 3. 获取护卫数据
        const { sortedHelpers, helperUsageMap, updateHelperUsage } = await fetchHelperData(tokenId, token.name, currentRoleId);

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
            refreshTickets = await processCarForSmartSend(tokenId, token.name, car, refreshTickets, customConditions, effectiveCarMinColor, effectiveRefreshDelay, effectiveRequireMinColor, sortedHelpers, helperUsageMap, updateHelperUsage);
          } catch (carError) {
            const errorMsg = carError.message || "未知错误";
            // 12000030限流错误向上抛出，由批次重试逻辑统一处理
            if (errorMsg.includes("12000030")) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]发车被限流(12000030)，已加入重试队列`,
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
          await new Promise((r) => setTimeout(r, delayConfig.command));
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({ time: new Date().toLocaleTimeString(), message: `=== ${token.name} 智能发车完成 ===`, type: "success" });
      };

      // 第一批：并行执行所有账号
      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value) return;
        const token = tokens.value.find((t) => t.id === tokenId);

        try {
          await executeSmartSendCarForToken(tokenId);
          // 成功后关闭连接并释放槽位
          closeConnection(tokenId, token.name);
        } catch (error) {
          const errorMsg = error.message || "";
          if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010") || errorMsg.includes("12000030")) {
            // 服务器错误/限流，加入重试队列（关闭连接释放槽位，重试时重新连接）
            closeConnection(tokenId, token.name);
            retry400340Tokens.push(tokenId);
            tokenStatus.value[tokenId] = "waiting_retry";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `⚠️ ${token.name} 遇到${extractErrorCode(errorMsg)}错误，已加入重试队列（等待第一批完成后重试）`,
              type: "warning",
            });
          } else {
            console.error(error);
            tokenStatus.value[tokenId] = "failed";
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 智能发车失败: ${error.message}`, type: "error" });
            closeConnection(tokenId, token.name);
          }
        }
      });

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

          for (let i = 0; i < retry400340Tokens.length; i++) {
            if (shouldStop.value) break;

            const tokenId = retry400340Tokens[i];
            const token = tokens.value.find((t) => t.id === tokenId);
            if (!token) continue;

            // 账号间延迟（非第一个账号时）
            if (i > 0 && (batchSettings.accountRetryInterval || 0) > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `⏳ 等待${batchSettings.accountRetryInterval / 1000}秒后处理下一个账号...`,
                type: "info",
              });
              await new Promise((r) => setTimeout(r, batchSettings.accountRetryInterval || 3000));
            }

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
              if (errorMsg.includes("400340") || errorMsg.includes("200750") || errorMsg.includes("11800010") || errorMsg.includes("12000030")) {
                stillFailed.push(tokenId);
                tokenStatus.value[tokenId] = "waiting_retry";
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `⚠️ ${token.name} 重试仍遇到${extractErrorCode(errorMsg)}错误，等待下次重试`,
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

    const updateHelperUsage = async () => {
      try {
        const usageRes = await tokenStore.sendMessageWithPromise(tokenId, "car_getmemberhelpingcnt", {}, getTimeout());
        helperUsageMap = usageRes?.body?.memberHelpingCntMap || usageRes?.memberHelpingCntMap || {};
      } catch (_) {}
    };

    try {
      await updateHelperUsage();
      await new Promise((r) => setTimeout(r, delayConfig.command));
      const legionRes = await tokenStore.sendMessageWithPromise(tokenId, "legion_getinfo", {}, getTimeout());
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
    } catch (e) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 获取护卫数据失败: ${e.message}，将不带护卫发车`, type: "warning" });
    }

    return { sortedHelpers, helperUsageMap, updateHelperUsage };
  };

  /** 分配护卫 */
  const assignHelper = async (tokenId, tokenName, car, sortedHelpers, helperUsageMap, updateHelperUsage) => {
    if (Number(car.color || 0) < 5 || car.helperId) return;
    await updateHelperUsage();
    await new Promise((r) => setTimeout(r, delayConfig.command));

    if (!sortedHelpers.length) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]需要护卫，但未获取到可用护卫列表`, type: "warning" });
      return;
    }

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
  const processCarForSmartSend = async (tokenId, tokenName, car, refreshTickets, customConditions, carMinColor, refreshDelay, requireMinColorWithConditions, sortedHelpers, helperUsageMap, updateHelperUsage) => {
    const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
    const assignHelperFn = async () => assignHelper(tokenId, tokenName, car, sortedHelpers, helperUsageMap, updateHelperUsage);

    // 检查是否直接满足发车条件
    if (shouldSendCar(car, effectiveTickets, carMinColor, customConditions, batchSettings.useGoldRefreshFallback, requireMinColorWithConditions)) {
      await assignHelperFn();
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]满足条件，直接发车`, type: "info" });
      await sendCar(tokenId, car);
      return refreshTickets;
    }

    // 不满足条件，判断是否可以刷新
    const hasFreeRefresh = Number(car.refreshCount ?? 0) === 0;
    if (refreshTickets < 6 && !hasFreeRefresh) {
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

    // 刷新循环（最多13次）
    let currentTickets = refreshTickets;
    for (let refreshAttempt = 0; refreshAttempt < 13 && !shouldStop.value; refreshAttempt++) {
      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 车辆[${gradeLabel(car.color)}]尝试刷新(第${refreshAttempt + 1}次)...`, type: "info" });

      const resp = await tokenStore.sendMessageWithPromise(tokenId, "car_refresh", { carId: String(car.id) }, getTimeout());
      const data = resp?.car || resp?.body?.car || resp;
      if (data && typeof data === "object") {
        if (data.color != null) car.color = Number(data.color);
        if (data.refreshCount != null) car.refreshCount = Number(data.refreshCount);
        if (data.rewards != null) car.rewards = data.rewards;
      }

      await new Promise((r) => setTimeout(r, delayConfig.command));

      // 更新刷新券
      currentTickets = await getTicketCount(tokenId);

      // 检查刷新后是否满足条件
      if (shouldSendCar(car, currentTickets, carMinColor, customConditions, batchSettings.useGoldRefreshFallback, requireMinColorWithConditions)) {
        await assignHelperFn();
        addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`, type: "success" });
        // 等待服务端数据同步，防止刷新后立即发车触发12000030限流
        await new Promise((r) => setTimeout(r, refreshDelay));
        await sendCar(tokenId, car);
        return currentTickets;
      }

      addLog({ time: new Date().toLocaleTimeString(), message: `${tokenName} 刷新后: 颜色=${gradeLabel(car.color)}, 刷新券=${currentTickets}，继续刷新...`, type: "info" });

      // 判断是否继续刷新
      if (currentTickets < 6 && Number(car.refreshCount ?? 0) !== 0) {
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

      // 第一轮：执行所有账号的收车
      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value) return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);
        let successCount = 0;
        let failCount = 0;

        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始一键收车: ${token.name} ===`, type: "info" });
          await ensureConnection(tokenId);

          const res = await tokenStore.sendMessageWithPromise(tokenId, "car_getrolecar", {}, getTimeout());
          const carList = normalizeCars(res?.body ?? res);

          const claimableCars = carList.filter((car) => canClaim(car));
          if (claimableCars.length === 0) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 没有可收取的车辆，跳过收车`, type: "info" });
            tokenStatus.value[tokenId] = "completed";
            return;
          }

          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 检测到 ${claimableCars.length} 辆可收取的车辆，开始收车`, type: "info" });

          for (const car of carList) {
            if (shouldStop.value) break;
            if (!car.id || !canClaim(car)) continue;

            try {
              await tokenStore.sendMessageWithPromise(tokenId, "car_claim", { carId: String(car.id) }, getTimeout());
              successCount++;
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车成功: ${gradeLabel(car.color)}`, type: "success" });
              await new Promise((r) => setTimeout(r, delayConfig.action));
            } catch (error) {
              const errorMsg = error.message || "";
              if (isRetryableClaimError(errorMsg)) {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车失败: 服务器错误${extractErrorCode(errorMsg)}，加入重试队列`, type: "warning" });
                retryTasks.push({ tokenId, tokenName: token.name, car });
              } else {
                addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 收车失败: ${errorMsg}`, type: "error" });
              }
              failCount++;
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

      // 重试阶段
      if (retryTasks.length > 0 && !shouldStop.value) {
        await executeRetryRound(retryTasks);
      }

      refreshCompletedTokens();
      message.success("批量一键收车结束");
    } finally {
      isRunning.value = false;
      currentRunningTokenId.value = null;
    }
  };

  /** 执行重试轮次 */
  const executeRetryRound = async (retryTasks) => {
    const maxRetries = batchSettings.defaultRetryCount ?? 2;
    addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 开始重试 ${retryTasks.length} 个服务器错误的收车任务 ==========`, type: "info" });

    let pendingTasks = [...retryTasks];

    for (let round = 1; round <= maxRetries && pendingTasks.length > 0 && !shouldStop.value; round++) {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n--- 第 ${round}/${maxRetries} 轮重试，共 ${pendingTasks.length} 个任务 ---`, type: "info" });

      const stillFailed = [];
      let retrySuccess = 0;

      for (const task of pendingTasks) {
        if (shouldStop.value) break;
        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `${task.tokenName} 重试收车 [${gradeLabel(task.car.color)}] (第${round}次)...`, type: "info" });
          await ensureConnection(task.tokenId);
          await tokenStore.sendMessageWithPromise(task.tokenId, "car_claim", { carId: String(task.car.id) }, getTimeout());
          retrySuccess++;
          addLog({ time: new Date().toLocaleTimeString(), message: `${task.tokenName} 重试收车成功: ${gradeLabel(task.car.color)}`, type: "success" });
          await new Promise((r) => setTimeout(r, delayConfig.action));
        } catch (error) {
          const errorMsg = error.message || "";
          if (isRetryableClaimError(errorMsg)) {
            addLog({ time: new Date().toLocaleTimeString(), message: `${task.tokenName} 重试失败: ${extractErrorCode(errorMsg)}错误，等待下次重试`, type: "warning" });
            stillFailed.push(task);
          } else {
            addLog({ time: new Date().toLocaleTimeString(), message: `${task.tokenName} 重试失败: ${errorMsg}`, type: "error" });
          }
        } finally {
          tokenStore.closeWebSocketConnection(task.tokenId);
          releaseConnectionSlot();
        }
      }

      pendingTasks = stillFailed;
      addLog({ time: new Date().toLocaleTimeString(), message: `本轮重试结果: 成功${retrySuccess}个，失败${stillFailed.length}个`, type: "info" });

      if (pendingTasks.length > 0 && round < maxRetries) {
        const retryDelay = batchSettings.retryDelay || 60000;
        addLog({ time: new Date().toLocaleTimeString(), message: `⏱️ 等待${retryDelay / 1000}秒后进行第 ${round + 1} 轮重试...`, type: "info" });
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }

    if (pendingTasks.length > 0) {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 仍有 ${pendingTasks.length} 个任务重试${maxRetries}次后失败 ==========`, type: "error" });
    } else {
      addLog({ time: new Date().toLocaleTimeString(), message: `\n========== 所有重试错误任务重试成功 ==========`, type: "success" });
    }
  };

  // ========== 升级改装 ==========

  const batchCarResearchUpgrade = async () => {
    if (selectedTokens.value.length === 0) return;

    const researchLimits = [
      { researchId: 1, maxLevel: 36, name: "改装1" },
      { researchId: 2, maxLevel: 34, name: "改装2" },
      { researchId: 3, maxLevel: 2, name: "改装3" },
    ];

    try {
      isRunning.value = true;
      shouldStop.value = false;
      selectedTokens.value.forEach((id) => { tokenStatus.value[id] = "waiting"; });

      await runStreaming(selectedTokens.value, async (tokenId) => {
        if (shouldStop.value) return;
        tokenStatus.value[tokenId] = "running";
        const token = tokens.value.find((t) => t.id === tokenId);

        try {
          addLog({ time: new Date().toLocaleTimeString(), message: `=== 开始升级改装: ${token.name} ===`, type: "info" });
          await ensureConnection(tokenId);

          for (const research of researchLimits) {
            if (shouldStop.value) break;
            addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 开始升级${research.name}（目标${research.maxLevel}级）`, type: "info" });

            const finalLevel = await upgradeResearch(tokenId, token.name, research);

            if (finalLevel > 0) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} ${research.name}升级完成，共升到${finalLevel}级`, type: "success" });
            }
          }

          // 领取改装升级累计奖励
          try {
            const rewardRes = await tokenStore.sendMessageWithPromise(tokenId, "car_claimpartconsumereward", {}, getTimeout());
            if (rewardRes?.reward) {
              addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 领取改装升级累计奖励成功`, type: "success" });
            }
          } catch (_) {}

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
