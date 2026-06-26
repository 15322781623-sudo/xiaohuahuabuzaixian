/**
 * 车辆相关工具函数
 */

// 四小时毫秒数
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * 标准化车辆数据
 * @param {object} raw - 原始车辆数据
 * @returns {Array} - 标准化后的车辆列表
 */
export const normalizeCars = (raw) => {
  const r = raw || {};
  const body = r.body || r;
  const roleCar = body.roleCar || body.rolecar || {};

  // 优先从 roleCar.carDataMap 解析（id -> info）
  const carMap = roleCar.carDataMap || roleCar.cardatamap;
  if (carMap && typeof carMap === "object") {
    return Object.entries(carMap).map(([id, info], idx) => ({
      key: idx,
      id,
      ...(info || {}),
    }));
  }

  // 兜底
  let arr
    = body.cars || body.list || body.data || body.carList || body.vehicles || [];
  if (!Array.isArray(arr) && typeof arr === "object" && arr !== null)
    arr = Object.values(arr);
  if (Array.isArray(body) && arr.length === 0)
    arr = body;
  return (Array.isArray(arr) ? arr : [])
    .filter((it) => it && it.id) // 过滤掉无效数据
    .map((it, idx) => ({
      key: idx,
      ...it,
    }));
};

/**
 * 获取品质标签
 * @param {number} color - 颜色等级
 * @returns {string} - 品质标签
 */
export const gradeLabel = (color) => {
  const map = {
    1: "绿·普通",
    2: "蓝·稀有",
    3: "紫·史诗",
    4: "橙·传说",
    5: "红·神话",
    6: "金·传奇",
  };
  return map[color] || "未知";
};

/**
 * 大奖配置
 */
const bigPrizes = [
  { type: 3, itemId: 3201, value: 10 },
  { type: 3, itemId: 1001, value: 10 },
  { type: 3, itemId: 1022, value: 2000 },
  { type: 2, itemId: 0, value: 2000 },
  { type: 3, itemId: 1023, value: 5 },
  { type: 3, itemId: 1022, value: 2500 },
  { type: 3, itemId: 1001, value: 12 },
];

/**
 * 判断是否是大奖
 * @param {Array} rewards - 奖励列表
 * @returns {boolean} - 是否是大奖
 */
export const isBigPrize = (rewards) => {
  if (!Array.isArray(rewards))
    return false;
  return bigPrizes.some((p) =>
    rewards.find(
      (r) =>
        r.type === p.type
        && r.itemId === p.itemId
        && Number(r.value || 0) >= p.value,
    ),
  );
};

/**
 * 计算赛车刷新票数量
 * @param {Array} rewards - 奖励列表
 * @returns {number} - 刷新票数量
 */
export const countRacingRefreshTickets = (rewards) => {
  if (!Array.isArray(rewards))
    return 0;
  return rewards.reduce(
    (acc, r) =>
      acc + (r.type === 3 && r.itemId === 35002 ? Number(r.value || 0) : 0),
    0,
  );
};

/**
 * 检查奖励是否满足自定义条件
 * @param {Array} rewards - 奖励列表
 * @param {object} conditions - 自定义条件 { gold, recruit, jade, ticket }
 * @returns {boolean} - 是否满足条件
 */
const checkRewardConditions = (rewards, conditions) => {
  if (!Array.isArray(rewards) || !conditions)
    return false;
  const { gold, recruit, jade, ticket } = conditions;

  // 如果没有设置任何条件，直接返回false
  if (!gold && !recruit && !jade && !ticket)
    return false;

  let goldCount = 0;
  let recruitCount = 0;
  let jadeCount = 0;
  let ticketCount = 0;

  rewards.forEach((r) => {
    const val = Number(r.value || r.num || r.quantity || r.count || 0);
    const type = Number(r.type || 0);
    const itemId = Number(r.itemId || 0);

    // Gold Bricks: type 2 (itemId 0 usually)
    if (type === 2) {
      goldCount += val;
    }
    // Recruit Orders: itemId 1001
    if (itemId === 1001) {
      recruitCount += val;
    }
    // White Jade: itemId 1022
    if (itemId === 1022) {
      jadeCount += val;
    }
    // Refresh Ticket: itemId 35002
    if (itemId === 35002) {
      ticketCount += val;
    }
  });

  // 满足任意一个设置了阈值的条件即可
  if (gold > 0 && goldCount >= gold)
    return true;
  if (recruit > 0 && recruitCount >= recruit)
    return true;
  if (jade > 0 && jadeCount >= jade)
    return true;
  if (ticket > 0 && ticketCount >= ticket)
    return true;
  return false;
};

/**
 * 判断是否应该发车
 * @param {object} car - 车辆对象
 * @param {number} tickets - 刷新票数量
 * @param {number} minColor - 最小颜色等级
 * @param {object} customConditions - 自定义条件 { gold, recruit, jade, ticket }
 * @param {boolean} useGoldRefreshFallback - 是否启用金砖刷新保底
 * @param {boolean} requireMinColorWithConditions - 满足自定义条件时是否还必须满足最低品质
 * @returns {boolean} - 是否应该发车
 */
export const shouldSendCar = (car, tickets, minColor = 4, customConditions = {}, useGoldRefreshFallback = false, requireMinColorWithConditions = false) => {
  const color = Number(car?.color || 0);
  const rewards = Array.isArray(car?.rewards) ? car.rewards : [];

  // 检查是否设置了自定义条件
  const hasConditions = (customConditions.gold > 0 || customConditions.recruit > 0
    || customConditions.jade > 0 || customConditions.ticket > 0);

  // 检查自定义条件是否满足
  const customConditionsMet = checkRewardConditions(rewards, customConditions);

  // 第一优先级: 自定义条件
  if (hasConditions) {
    // 如果满足自定义条件
    if (customConditionsMet) {
      // 如果开启"最低品质必须同时满足"，则还需颜色达标
      if (requireMinColorWithConditions) {
        return color >= minColor;
      }
      // 否则直接发车（无视颜色）
      return true;
    }

    // 不满足自定义条件,需要继续刷新追求自定义条件
    // 严格模式: 必须达到保底颜色才考虑发车
    if (useGoldRefreshFallback) {
      if (color < minColor)
        return false;
      // 颜色达标但自定义条件不满足,不发车,继续刷新
      return false;
    }

    // 普通模式: 不满足自定义条件时,不发车,应该继续刷新
    // 除非刷新券不足,否则不应该降级到只看颜色
    return false;
  }

  // 没有设置自定义条件,使用默认判断逻辑 (只看颜色/刷新券/大奖)
  const racingTickets = countRacingRefreshTickets(rewards);
  if (tickets >= 6) {
    return (
      color >= minColor
      && (color >= 5 || racingTickets >= 4 || isBigPrize(rewards))
    );
  }
  return color >= minColor || racingTickets >= 2 || isBigPrize(rewards);
};

/**
 * 判断是否可以收取
 * @param {object} car - 车辆对象
 * @returns {boolean} - 是否可以收取
 */
export const canClaim = (car) => {
  const t = Number(car?.sendAt || 0);
  if (!t)
    return false;
  const tsMs = t < 1e12 ? t * 1000 : t;
  return Date.now() - tsMs >= FOUR_HOURS_MS;
};

/**
 * 创建车辆操作管理器
 * @param {object} options - 配置选项
 * @param {object} options.tokenStore - Token存储
 * @param {object} options.connectionManager - 连接管理器
 * @param {object} options.batchSettings - 批量设置
 * @param {function} options.addLog - 日志添加函数
 * @returns {object} - 车辆操作管理器对象
 */
export function createCarManager({ tokenStore, connectionManager, batchSettings, addLog, getModuleDelay }) {
  const { ensureConnection, closeConnection } = connectionManager;

  // 模块延迟辅助函数
  const _getModuleDelay = getModuleDelay || ((moduleName) => {
    const md = batchSettings.moduleDelays;
    if (md) return md[moduleName] || md.default || batchSettings.taskDelay || 1000;
    return batchSettings.taskDelay || 1000;
  });

  /**
   * 智能发车
   * @param {string} tokenId - Token ID
   * @param {object} token - Token对象
   * @param {Array} tokens - Tokens列表
   * @param {object} tokenStatus - Token状态对象
   * @param {object} shouldStop - 停止标志ref
   */
  const smartSendCar = async (tokenId, token, tokens, tokenStatus, shouldStop) => {
    // 从设置中读取延迟和超时配置
    const cmdTimeout = batchSettings.defaultCommandTimeout || 5000;
    const actionDelay = _getModuleDelay('default');
    const refreshDelay = batchSettings.refreshDelay || 2000;
    const commandDelay = _getModuleDelay('default');
    const maxRetryCount = batchSettings.defaultRetryCount ?? 2;
    const retryDelayMs = batchSettings.retryDelay || 60000;

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始智能发车: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId, tokens);

      // 1. Fetch Car Info
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 获取车辆信息...`,
        type: "info",
      });
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "car_getrolecar",
        {},
        cmdTimeout,
      );
      const carList = normalizeCars(res?.body ?? res);

      await new Promise((r) => setTimeout(r, commandDelay));

      // 2. Fetch Tickets
      let refreshTickets = 0;
      try {
        const roleRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          cmdTimeout,
        );
        const qty = roleRes?.role?.items?.[35002]?.quantity;
        refreshTickets = Number(qty || 0);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 剩余刷新次数: ${refreshTickets}`,
          type: "info",
        });
      } catch (_) {}

      // 3. Process Cars
      for (const car of carList) {
        if (shouldStop.value)
          break;

        if (Number(car.sendAt || car.sendat || 0) !== 0) {
          addLog({ time: new Date().toLocaleTimeString(), message: `${token.name} 车辆[${gradeLabel(car.color)}]已发车，跳过`, type: "info" });
          continue;
        }

        try {
          // Check if we should send immediately
          // 当启用金砖保底时，强制使用高票数的判断逻辑（严格模式），避免因票数不足而提前发车
          const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;

          const customConditions = batchSettings.smartDepartureEnabled !== false ? {
            gold: batchSettings.smartDepartureGoldThreshold,
            recruit: batchSettings.smartDepartureRecruitThreshold,
            jade: batchSettings.smartDepartureJadeThreshold,
            ticket: batchSettings.smartDepartureTicketThreshold,
          } : {};

          // 判断是否满足自定义条件
          const hasConditions = customConditions.gold > 0 || customConditions.recruit > 0
            || customConditions.jade > 0 || customConditions.ticket > 0;

          if (shouldSendCar(car, effectiveTickets, batchSettings.carMinColor, customConditions, batchSettings.useGoldRefreshFallback, batchSettings.requireMinColorWithConditions)) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]满足条件，直接发车`,
              type: "info",
            });
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_send",
              {
                carId: String(car.id),
                helperId: 0,
                text: "",
                isUpgrade: false,
              },
              cmdTimeout,
            );
            await new Promise((r) => setTimeout(r, actionDelay));
            continue;
          }

          // 不满足条件，判断是否需要刷新
          let shouldRefresh = false;
          const free = Number(car.refreshCount ?? 0) === 0;

          // 策略1: 刷新券充足(≥6)，积极刷新追求自定义条件
          if (refreshTickets >= 6) {
            shouldRefresh = true;
            if (hasConditions) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]刷新券充足(${refreshTickets}张)，尝试刷新追求自定义条件`,
                type: "info",
              });
            }
          }
          // 策略2: 有免费刷新次数，使用免费刷新
          else if (free) {
            shouldRefresh = true;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]有免费刷新次数，尝试刷新`,
              type: "info",
            });
          }
          // 策略3: 刷新券不足(<6)，保留有刷新券的车辆，不消耗刷新券
          else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]刷新券不足(${refreshTickets}张)，保留该车辆，直接发车`,
              type: "warning",
            });
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_send",
              {
                carId: String(car.id),
                helperId: 0,
                text: "",
                isUpgrade: false,
              },
              cmdTimeout,
            );
            await new Promise((r) => setTimeout(r, actionDelay));
            continue;
          }

          // 刷新循环（最多13次）
          let refreshAttempt = 0;
          while (shouldRefresh && !shouldStop.value && refreshAttempt < 13) {
            refreshAttempt++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]尝试刷新(第${refreshAttempt}次)...`,
              type: "info",
            });

            // 12000030限流重试
            let rateRetryCount = 0;
            let refreshResp;
            while (rateRetryCount <= maxRetryCount) {
              try {
                refreshResp = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_refresh",
                  { carId: String(car.id) },
                  cmdTimeout,
                );
                break;
              } catch (rateErr) {
                const rateMsg = rateErr.message || "";
                if (rateMsg.includes("12000030") && rateRetryCount < maxRetryCount) {
                  rateRetryCount++;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 车辆[${gradeLabel(car.color)}]刷新被限流(12000030)，等待${retryDelayMs / 1000}秒后重试(${rateRetryCount}/${maxRetryCount})...`,
                    type: "warning",
                  });
                  await new Promise((r) => setTimeout(r, retryDelayMs));
                } else {
                  throw rateErr;
                }
              }
            }

            const data = refreshResp?.car || refreshResp?.body?.car || refreshResp;

            // Update local car info
            if (data && typeof data === "object") {
              if (data.color != null)
                car.color = Number(data.color);
              if (data.refreshCount != null)
                car.refreshCount = Number(data.refreshCount);
              if (data.rewards != null)
                car.rewards = data.rewards;
            }

            await new Promise((r) => setTimeout(r, commandDelay));

            // 更新刷新券数量
            try {
              const roleRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "role_getroleinfo",
                {},
                cmdTimeout,
              );
              refreshTickets = Number(
                roleRes?.role?.items?.[35002]?.quantity || 0,
              );
            } catch (_) {}

            // 检查是否满足条件
            const conditionsMet = shouldSendCar(car, refreshTickets, batchSettings.carMinColor, customConditions, batchSettings.useGoldRefreshFallback, batchSettings.requireMinColorWithConditions);

            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 刷新后检查结果: conditionsMet=${conditionsMet}, 车辆颜色=${gradeLabel(car.color)}, 刷新券=${refreshTickets}`,
              type: conditionsMet ? "success" : "info",
            });

            if (conditionsMet) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`,
                type: "success",
              });
              // 等待服务端数据同步，防止刷新后立即发车触发12000030限流
              await new Promise((r) => setTimeout(r, refreshDelay));
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_send",
                {
                  carId: String(car.id),
                  helperId: 0,
                  text: "",
                  isUpgrade: false,
                },
                cmdTimeout,
              );
              await new Promise((r) => setTimeout(r, actionDelay));
              break;
            }

            // 判断是否继续刷新
            const freeNow = Number(car.refreshCount ?? 0) === 0;

            // 策略1: 刷新券充足(≥6)，继续刷新
            if (refreshTickets >= 6) {
              shouldRefresh = true;
            }
            // 策略2: 有免费刷新次数，继续刷新
            else if (freeNow) {
              shouldRefresh = true;
            }
            // 策略3: 刷新券不足，停止刷新，发车
            else {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]刷新券不足(${refreshTickets}张)，停止刷新，直接发车`,
                type: "warning",
              });
              // 等待服务端数据同步
              await new Promise((r) => setTimeout(r, refreshDelay));
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_send",
                {
                  carId: String(car.id),
                  helperId: 0,
                  text: "",
                  isUpgrade: false,
                },
                cmdTimeout,
              );
              await new Promise((r) => setTimeout(r, actionDelay));
              break;
            }

            await new Promise((r) => setTimeout(r, refreshDelay));
          }

          // 刷新次数用尽，强制发车
          if (refreshAttempt >= 13 && shouldRefresh && !shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]刷新次数用尽(13次)，强制发车`,
              type: "warning",
            });
            // 等待服务端数据同步
            await new Promise((r) => setTimeout(r, refreshDelay));
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_send",
              {
                carId: String(car.id),
                helperId: 0,
                text: "",
                isUpgrade: false,
              },
              cmdTimeout,
            );
            await new Promise((r) => setTimeout(r, actionDelay));
          }
        } catch (carError) {
          let errorMsg = carError.message || "未知错误";
          let errorType = "error";

          // 处理发车次数上限错误
          if (errorMsg.includes("12000050")) {
            errorMsg = "发车次数已达上限，跳过执行";
            errorType = "warning";
          }
          // 处理发车限流错误
          else if (errorMsg.includes("12000030")) {
            errorMsg = "发车被限流(12000030)，请稍后重试";
            errorType = "warning";
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 车辆[${gradeLabel(car.color)}]处理失败: ${errorMsg}`,
            type: errorType,
          });
        }

        // 车辆间延迟
        await new Promise((r) => setTimeout(r, commandDelay));
      }

      tokenStatus[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 智能发车完成 ===`,
        type: "success",
      });

      // 刷新赛车状态
      tokenStore.refreshGameData(tokenId);
    } catch (error) {
      console.error(error);
      tokenStatus[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 智能发车失败: ${error.message}`,
        type: "error",
      });
    } finally {
      closeConnection(tokenId, token.name);
    }
  };

  /**
   * 一键收车
   * @param {string} tokenId - Token ID
   * @param {object} token - Token对象
   * @param {Array} tokens - Tokens列表
   * @param {object} tokenStatus - Token状态对象
   * @param {object} shouldStop - 停止标志ref
   * @param {Array} CarresearchItem - 车辆研究配置
   */
  const claimCars = async (tokenId, token, tokens, tokenStatus, shouldStop, CarresearchItem) => {
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 开始一键收车: ${token.name} ===`,
        type: "info",
      });

      await ensureConnection(tokenId, tokens);

      // 1. Fetch Car Info
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 获取车辆信息...`,
        type: "info",
      });
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "car_getrolecar",
        {},
        20000, // 增加超时时间到20秒
      );
      const carList = normalizeCars(res?.body ?? res);
      let refreshlevel = res?.roleCar?.research?.[1] || 0;

      // 2. Claim Cars
      let claimedCount = 0;
      for (const car of carList) {
        if (shouldStop.value)
          break;

        // 校验车辆ID是否存在，防止发送空指令
        if (!car.id) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 车辆数据异常(id为空)，跳过`,
            type: "warning",
          });
          continue;
        }

        if (canClaim(car)) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_claim",
              { carId: String(car.id) },
              15000, // 增加超时时间到15秒
            );
            claimedCount++;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 收车成功: ${gradeLabel(car.color)}`,
              type: "success",
            });
            const roleRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            let refreshpieces = Number(
              roleRes?.role?.items?.[35009]?.quantity || 0,
            );
            while (
              refreshlevel < CarresearchItem.length
              && refreshpieces >= CarresearchItem[refreshlevel]
              && !shouldStop.value
            ) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_research",
                  { researchId: 1 },
                  5000,
                );
                refreshlevel++;

                // 更新refreshpieces数量
                const updatedRoleRes = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "role_getroleinfo",
                  {},
                  5000,
                );
                refreshpieces = Number(
                  updatedRoleRes?.role?.items?.[35009]?.quantity || 0,
                );

                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 执行车辆改装升级，当前等级: ${refreshlevel}`,
                  type: "success",
                });

                await new Promise((r) => setTimeout(r, 300));
              } catch (e) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆改装升级失败: ${e.message}`,
                  type: "error",
                });
                break; // 升级失败时跳出循环
              }
            }

            // 尝试领取改装升级累计奖励
            try {
              const rewardRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_claimpartconsumereward",
                {},
                5000,
              );
              if (rewardRes && rewardRes.reward) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 领取改装升级累计奖励成功`,
                  type: "success",
                });
              }
            } catch (e) {
              // 忽略错误
            }
          } catch (e) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 收车失败: ${e.message}`,
              type: "warning",
            });
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (claimedCount === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 没有可收取的车辆`,
          type: "info",
        });
      }

      tokenStatus[tokenId] = "completed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${token.name} 收车完成，共收取 ${claimedCount} 辆 ===`,
        type: "success",
      });

      // 刷新赛车状态
      tokenStore.refreshGameData(tokenId);
    } catch (error) {
      console.error(error);
      tokenStatus[tokenId] = "failed";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token.name} 收车失败: ${error.message}`,
        type: "error",
      });
    } finally {
      closeConnection(tokenId, token.name);
    }
  };

  return {
    smartSendCar,
    claimCars,
  };
}
