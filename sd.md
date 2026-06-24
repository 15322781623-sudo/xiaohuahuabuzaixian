伍 ======
onMounted(async () => {
  initCaptainTokenId();
  addLog("正在检查已有队伍状态...");

  try {
    // Step 0: 确保队长已连接
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接到队长账号，初始化失败", "error");
      isInitializing.value = false;
      return;
    }

    // Step 1: 获取 roleInfo，拿到 roleId
    let roleInfo = tokenStore.gameData.roleInfo;
    if (!roleInfo || !roleInfo.role || !roleInfo.role.roleId) {
      addLog("获取角色信息 (role_getroleinfo)...");
      roleInfo = await tokenStore.sendGetRoleInfo(captainTokenId.value, {});
    }
    const roleId = roleInfo?.role?.roleId;
    if (!roleId) {
      addLog("无法获取 roleId，将开始全新组队", "warning");
      isInitializing.value = false;
      return;
    }
    captainRoleId.value = String(roleId);
    addLog(`当前角色 roleId: ${roleId}`);

    // 保存 roleId 到 gameTokens（用于后续按 roleId 精确匹配队员）
    const captainToken = tokenStore.gameTokens.find((t) => t.id === captainTokenId.value);
    if (captainToken && !captainToken.roleId) {
      captainToken.roleId = String(roleId);
      addLog(`队长 roleId 已保存到本地账号`, "success");
    }

    // Step 2: 检查是否已有队伍
    addLog("检查队伍状态 (matchteam_getroleteaminfo)...");
    const roleTeamRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getroleteaminfo",
      { roleID: roleId },
      10000
    );

    const gDMTData = roleTeamRes?.roleMTData?.gDMTData || {};
    const allTeamKeys = Object.keys(gDMTData);

    // 只取纯数字 TeamId（十殿阎罗挑战），忽略 N 开头等其他模块的 TeamId
    const numericTeamKeys = allTeamKeys.filter((k) => /^\d+$/.test(k));
    const ignoredKeys = allTeamKeys.filter((k) => !/^\d+$/.test(k));

    if (ignoredKeys.length > 0) {
      addLog(
        `忽略其他模块队伍: ${ignoredKeys.map((k) => gDMTData[k]?.teamId || k).join(", ")}`,
        "info"
      );
    }

    if (numericTeamKeys.length === 0) {
      addLog("当前无十殿阎罗队伍，可以开始组队");
      isInitializing.value = false;
      return;
    }

    // 取第一个纯数字 teamId
    const existingTeamId = gDMTData[numericTeamKeys[0]]?.teamId;
    if (!existingTeamId) {
      addLog("当前无十殿阎罗队伍，可以开始组队");
      isInitializing.value = false;
      return;
    }

    addLog(`发现已有十殿队伍 TeamId: ${existingTeamId}，正在获取队伍详情...`);

    // Step 3: 获取队伍详细信息
    const teamInfoRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getteaminfo",
      { teamId: existingTeamId },
      10000
    );

    if (!teamInfoRes || !teamInfoRes.teamInfo) {
      addLog("获取队伍详情失败，将开始全新组队", "warning");
      isInitializing.value = false;
      return;
    }

    const teamInfo = teamInfoRes.teamInfo;
    const leaderId = String(teamInfo.leaderId || "");

    addLog(`队伍队长 roleId: ${leaderId}，当前角色 roleId: ${roleId}`);

    // Step 4: 检查当前账号是否为队长
    if (leaderId !== String(roleId)) {
      isNotLeader.value = true;
      actualLeaderName.value = `roleId: ${leaderId}`;
      addLog("⚠️ 当前账号不是队长！请切换到队长账号", "warning");
      isInitializing.value = false;
      return;
    }

    // Step 5: 恢复队伍状态，解析队员信息
    teamId.value = String(existingTeamId);
    const fightRoleBase = teamInfo.fightRoleBase || [];
    teamMembers.value = fightRoleBase;

    // 尝试匹配队员到 gameTokens 并自动选中
    const matchedTokenIds = [];
    for (const member of fightRoleBase) {
      // 跳过队长自身
      if (String(member.roleId) === String(roleId)) continue;
      const memberServerId = String(member.serverId || "");
      const matchedToken = tokenStore.gameTokens.find((t) => {
        const tokenServer = String(t.server || "");
        return t.name === member.name && tokenServer === memberServerId;
      });
      if (matchedToken) {
        matchedTokenIds.push(matchedToken.id);
        addLog(`匹配队员: ${member.name} (roleId: ${member.roleId}) → Token: ${matchedToken.id.slice(0, 8)}`);
      } else {
        addLog(`队员 ${member.name} (serverId: ${member.serverId}) 未匹配到本地账号`, "warning");
      }
    }
    selectedTeammates.value = matchedTokenIds;

    const captainMember = fightRoleBase.find((m) => String(m.roleId) === String(roleId));
    const otherCount = fightRoleBase.length - 1;
    addLog(`队伍已恢复！TeamId: ${teamId.value}，${otherCount > 0 ? `已有 ${otherCount} 名队员` : "暂无队员"}`, "success");
    message.success(`已恢复队伍 TeamId: ${teamId.value}`);
    isInitializing.value = false;
  } catch (err) {
    addLog(`初始化检查失败: ${err.message || err}`, "error");
    addLog("将开始全新组队流程");
    isInitializing.value = false;
  }
});

// ====== 监听队长切换 ======
watch(captainTokenId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    // 队长账号变化，重置状态
    teamId.value = "";
    teamMembers.value = [];
    selectedTeammates.value = [];
    isNotLeader.value = false;
    actualLeaderName.value = "";
    captainRoleId.value = "";
    pageState.value = "teamBuilding";
    addLog("队长账号已切换，队伍状态已重置");
  }
});

// ====== 队伍信息刷新 ======
const isRefreshing = ref(false);

// 将 fightRoleBase 中的 roleId 写回 gameTokens（建立 roleId → token 的映射）
const saveRoleIdsToTokens = (fightRoleBase) => {
  let savedCount = 0;
  for (const member of fightRoleBase) {
    const memberRoleId = String(member.roleId || "");
    if (!memberRoleId) continue;

    // 已按 roleId 匹配到的，直接更新
    const idx = tokenStore.gameTokens.findIndex(
      (t) => t.roleId && String(t.roleId) === memberRoleId
    );
    if (idx !== -1) continue; // 已有，跳过

    // 尝试按名称+区服匹配，然后写入 roleId
    const memberServerId = String(member.serverId || "");
    const memberNormName = normalizeName(member.name);
    const nameIdx = tokenStore.gameTokens.findIndex((t) => {
      const tokenServer = String(t.server || "");
      const tokenNormName = normalizeName(t.name);
      return tokenNormName && tokenNormName === memberNormName && tokenServer === memberServerId;
    });
    if (nameIdx !== -1) {
      const updated = { ...tokenStore.gameTokens[nameIdx], roleId: memberRoleId };
      // 用 map + 重新赋值，确保触发 useLocalStorage 持久化
      tokenStore.gameTokens = tokenStore.gameTokens.map((t, i) => i === nameIdx ? updated : t);
      savedCount++;
      addLog(`自动保存 roleId: ${member.name} → ${memberRoleId}`, "success");
    }
  }
  if (savedCount > 0) {
    addLog(`共自动保存 ${savedCount} 个队员的 roleId`, "success");
  }
};

const refreshTeamMembers = async () => {
  if (!teamId.value || !captainTokenId.value) return false;
  isRefreshing.value = true;
  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      isRefreshing.value = false;
      return false;
    }
    const teamInfoRes = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getteaminfo",
      { teamId: teamId.value },
      10000
    );
    if (teamInfoRes?.teamInfo?.fightRoleBase) {
      teamMembers.value = teamInfoRes.teamInfo.fightRoleBase;
      addLog(`队伍成员已刷新，共 ${teamMembers.value.length} 人`);
      // 将 roleId 写回 gameTokens
      saveRoleIdsToTokens(teamInfoRes.teamInfo.fightRoleBase);
    } else {
      addLog("刷新队伍成员：无fightRoleBase数据", "warning");
      isRefreshing.value = false;
      return false;
    }
  } catch (err) {
    addLog(`刷新队伍成员失败: ${err.message || err}`, "error");
    isRefreshing.value = false;
    return false;
  }
  isRefreshing.value = false;
  return true;
};

// ====== 核心操作 ======

// 1. 创建房间
const createRoom = async () => {
  if (!captainTokenId.value) {
    message.warning("请先选择队长账号");
    return;
  }

  isCreating.value = true;
  addLog("开始创建房间...");

  try {
    // Step 1: 获取随机队伍列表（获取上次阵容数据）
    addLog("正在获取战斗阵容 (matchteam_getrandteamlist)...");
    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_getrandteamlist",
      { teamCfgId: 1, param: 0, custom: {} },
      10000
    );
    addLog("获取战斗阵容成功", "success");

    // Step 2: 创建组队房间
    addLog("正在创建组队房间 (matchteam_create)...");
    const createResp = await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_create",
      {
        teamCfgId: 1,
        setting: {
          name: "十殿先锋队",
          notice: "",
          secret: 1,
          apply: 0,
          applyList: [],
        },
        param: 0,
        custom: {},
        extParam: 0,
      },
      10000
    );

    if (createResp && createResp.teamInfo && createResp.teamInfo.teamId) {
      teamId.value = String(createResp.teamInfo.teamId);
      // 创建后即有队长信息，更新队员列表
      if (createResp.teamInfo.fightRoleBase && createResp.teamInfo.fightRoleBase.length > 0) {
        teamMembers.value = createResp.teamInfo.fightRoleBase;
      } else {
        // 若响应中无队员信息，则主动拉取
        addLog("创建响应中无队员信息，正在刷新...");
        await refreshTeamMembers();
      }
      addLog(`房间创建成功！TeamId: ${teamId.value}`, "success");
      message.success(`房间创建成功！TeamId: ${teamId.value}`);
    } else {
      addLog(`创建房间响应异常: ${JSON.stringify(createResp)}`, "error");
      message.error("创建房间失败，响应数据异常");
    }
  } catch (err) {
    addLog(`创建房间失败: ${err.message || err}`, "error");
    message.error(`创建房间失败: ${err.message || err}`);
  } finally {
    isCreating.value = false;
  }
};

// 2. 加入房间（对每个队友执行：连接 → 布阵 → 加入 → 断开）
const isJoining = ref(false);

const joinRoom = async () => {
  if (!teamId.value) {
    message.warning("请先创建房间");
    return;
  }
  if (selectedTeammates.value.length === 0) {
    message.warning("请先选择队友");
    return;
  }

  isJoining.value = true;
  addLog(`开始加入房间，共 ${selectedTeammates.value.length} 名队友...`);

  for (const tid of selectedTeammates.value) {
    const token = tokenStore.gameTokens.find((t) => t.id === tid);
    const name = token ? token.name : tid.slice(0, 8);
    addLog(`[${name}] 开始加入流程...`);

    const success = await connectAndDo(tid, name, async (tokenId) => {
      // 获取阵容
      addLog(`[${name}] 获取阵容 (matchteam_getrandteamlist)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_getrandteamlist",
        { teamCfgId: 1, param: 0, custom: {} },
        10000
      );

      // 加入房间
      addLog(`[${name}] 加入房间 (matchteam_join)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_join",
        { teamId: Number(teamId.value) },
        10000
      );
    });

    if (success) {
      addLog(`[${name}] 加入房间成功！`, "success");
    }

    // 加入完成后断开队员连接
    if (tokenStore.getWebSocketStatus(tid) === "connected") {
      await disconnectTeammate(tid);
    }

    await delay(500); // 每个队友间隔
  }

  addLog("所有队友加入流程完成（队员已断开）", "success");
  // 刷新队伍成员列表
  await refreshTeamMembers();
  isJoining.value = false;
};

// 2b. 加入房间并准备（流程：连接 → 布阵 → 加入 → 准备 → 断开）
const isJoiningAndReady = ref(false);

const joinAndReady = async () => {
  if (!teamId.value) {
    message.warning("请先创建房间");
    return;
  }
  if (selectedTeammates.value.length === 0) {
    message.warning("请先选择队友");
    return;
  }

  isJoiningAndReady.value = true;
  addLog(`开始"加入房间并准备"，共 ${selectedTeammates.value.length} 名队友...`);

  for (const tid of selectedTeammates.value) {
    const token = tokenStore.gameTokens.find((t) => t.id === tid);
    const name = token ? token.name : tid.slice(0, 8);
    addLog(`[${name}] 开始加入并准备流程...`);

    const success = await connectAndDo(tid, name, async (tokenId) => {
      // 1. 布阵（获取阵容）
      addLog(`[${name}] 获取阵容 (matchteam_getrandteamlist)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_getrandteamlist",
        { teamCfgId: 1, param: 0, custom: {} },
        10000
      );

      // 2. 加入房间
      addLog(`[${name}] 加入房间 (matchteam_join)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_join",
        { teamId: Number(teamId.value) },
        10000
      );

      // 2.5 等待服务端处理加入请求（避免准备时服务端尚未完成加入导致 7100110 错误）
      addLog(`[${name}] 等待1秒后准备...`);
      await delay(1000);

      // 3. 准备
      addLog(`[${name}] 准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_memberprepare",
        { teamId: Number(teamId.value) },
        10000
      );
    });

    if (success) {
      addLog(`[${name}] 加入并准备成功！`, "success");
    }

    // 完成后断开队员连接
    if (tokenStore.getWebSocketStatus(tid) === "connected") {
      await disconnectTeammate(tid);
    }

    await delay(500); // 每个队友间隔
  }

  addLog("所有队友加入并准备流程完成（队员已断开）", "success");

  // 恢复队长连接并刷新组队信息
  if (captainTokenId.value) {
    const captainStatus = tokenStore.getWebSocketStatus(captainTokenId.value);
    if (captainStatus !== "connected") {
      addLog("恢复队长连接...");
      const captainToken = tokenStore.gameTokens.find((t) => t.id === captainTokenId.value);
      if (captainToken) {
        tokenStore.createWebSocketConnection(captainTokenId.value, captainToken.token, captainToken.wsUrl || null);
        let retries = 0;
        while (tokenStore.getWebSocketStatus(captainTokenId.value) !== "connected" && retries < 20) {
          await delay(500);
          retries++;
        }
        addLog("队长连接已恢复", "success");
      }
    }
  }
  await refreshTeamMembers();
  isJoiningAndReady.value = false;
};

// 3. 准备选中队员（在队员信息区域中勾选的队员）
const prepareSelected = async () => {
  if (!teamId.value) {
    message.warning("请先创建房间");
    return;
  }

  if (selectedMemberRoleIds.value.length === 0) {
    message.warning("请先选择要准备的队员");
    return;
  }

  isPreparing.value = true;

  // 根据选中的 roleId 找到对应的 matchedTokenId
  const selectedTokens = [];
  for (const roleId of selectedMemberRoleIds.value) {
    const member = teamMembersWithTokens.value.find(
      (m) => String(m.roleId) === String(roleId)
    );
    if (member && member.matchedTokenId) {
      selectedTokens.push({
        roleId: member.roleId,
        tokenId: member.matchedTokenId,
        name: member.name,
      });
    } else {
      addLog(`队员 ${member?.name || roleId} 未匹配到本地账号，跳过`, "warning");
    }
  }

  if (selectedTokens.length === 0) {
    addLog("没有可准备的队员（未匹配到本地账号）", "warning");
    isPreparing.value = false;
    return;
  }

  addLog(`开始准备选中队员，共 ${selectedTokens.length} 人...`);

  // 单线模式执行准备
  for (const item of selectedTokens) {
    const success = await connectAndDo(item.tokenId, item.name, async (tokenId) => {
      addLog(`[${item.name}] 发送准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_memberprepare",
        { teamId: Number(teamId.value) },
        10000
      );
    });

    if (success) {
      addLog(`[${item.name}] 准备就绪！`, "success");
    }

    // 准备完成后断开队员连接
    if (tokenStore.getWebSocketStatus(item.tokenId) === "connected") {
      await disconnectTeammate(item.tokenId);
    }

    await delay(300);
  }

  addLog("准备选中队员流程完成", "success");
  await refreshTeamMembers();
  
  // 清空选择
  selectedMemberRoleIds.value = [];
  
  isPreparing.value = false;
};

// 4. 全部准备（对所有未准备的队员执行准备）
const prepareAll = async () => {
  if (!teamId.value) {
    message.warning("请先创建房间");
    return;
  }

  isPreparing.value = true;
  addLog("全部准备：先刷新队伍信息，获取队员 roleId...");

  // Step 1: 先调 matchteam_getteaminfo 拿最新 fightRoleBase（含 roleId）
  const refreshed = await refreshTeamMembers();
  if (!refreshed) {
    addLog("刷新队伍信息失败，无法继续", "error");
    isPreparing.value = false;
    return;
  }

  // Step 2: 从 teamMembers（已更新）中取非队长且未准备的队员
  const unpreparedMembers = teamMembers.value.filter(
    (m, idx) => idx !== 0 && m.prepared !== 1
  );
  
  if (unpreparedMembers.length === 0) {
    addLog("所有队员已准备就绪", "success");
    isPreparing.value = false;
    return;
  }

  addLog(`开始全部准备，共 ${unpreparedMembers.length} 名未准备队员...`);

  // Step 3: 根据队员的 matchedTokenId 来执行准备
  const selectedTokens = [];
  for (const member of unpreparedMembers) {
    const matchedMember = teamMembersWithTokens.value.find(
      (m) => String(m.roleId) === String(member.roleId)
    );
    if (matchedMember && matchedMember.matchedTokenId) {
      selectedTokens.push({
        roleId: member.roleId,
        tokenId: matchedMember.matchedTokenId,
        name: member.name,
      });
    } else {
      addLog(`队员 ${member.name} (roleId: ${member.roleId}) 未匹配到本地账号，跳过`, "warning");
    }
  }

  if (selectedTokens.length === 0) {
    addLog("没有可准备的队员（未匹配到本地账号）", "warning");
    isPreparing.value = false;
    return;
  }

  // Step 4: 单线模式执行准备
  for (const item of selectedTokens) {
    const success = await connectAndDo(item.tokenId, item.name, async (tokenId) => {
      addLog(`[${item.name}] 发送准备 (matchteam_memberprepare)...`);
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "matchteam_memberprepare",
        { teamId: Number(teamId.value) },
        10000
      );
    });

    if (success) {
      addLog(`[${item.name}] 准备就绪！`, "success");
    }

    // 准备完成后断开队员连接
    if (tokenStore.getWebSocketStatus(item.tokenId) === "connected") {
      await disconnectTeammate(item.tokenId);
    }

    await delay(300);
  }

  addLog("全部准备流程完成", "success");
  await refreshTeamMembers();
  isPreparing.value = false;
};

// 4. 开始战斗
const isStarting = ref(false);

const startBattle = async (presetId = null) => {
  if (!teamId.value || !captainTokenId.value) {
    message.warning("请先创建房间");
    return;
  }

  isStarting.value = true;
  addLog("开始战斗 (matchteam_openteam)...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接队长账号", "error");
      isStarting.value = false;
      return;
    }

    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_openteam",
      { teamId: Number(teamId.value) },
      10000
    );
    addLog("战斗开始成功！", "success");
    message.success("战斗开始成功！");
    pageState.value = "fighting";

    // 获取 roomId（matchteam_openteam 后战斗房间需要一定时间创建，带重试机制）
    let roomId = null;
    const maxRetries = 10;
    const retryInterval = 3000; // 每次间隔3秒

    if (captainRoleId.value) {
      addLog("正在获取战斗 RoomId...", "info");

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const resp = await tokenStore.sendMessageWithPromise(
            captainTokenId.value,
            "nightmare_getroleinfo",
            { roleId: Number(captainRoleId.value) },
            10000
          );
          roomId = resp?.nightMareData?.roomId;
          if (roomId) {
            addLog(`获取到 RoomId: ${roomId}`, "success");
            break;
          } else {
            addLog(`RoomId 尚未生成，等待3秒后重试 (${attempt}/${maxRetries})...`, "warning");
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, retryInterval));
            }
          }
        } catch (err) {
          addLog(
            `获取 RoomId 失败 (${attempt}/${maxRetries}): ${err.message || String(err)}，等待3秒后重试...`,
            "warning"
          );
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, retryInterval));
          }
        }
      }

      if (!roomId) {
        addLog("RoomId 获取失败（已重试），战斗页面将自行尝试获取", "warning");
      }
    } else {
      addLog("captainRoleId 为空，跳过 RoomId 预获取", "warning");
    }

    // 战斗开始成功后跳转到战斗页面
    router.push({
      name: "NightmareBattle",
      query: {
        teamId: teamId.value,
        captainTokenId: captainTokenId.value,
        ...(roomId ? { roomId: String(roomId) } : {}),
        ...(presetId ? { presetId } : {}),
      },
    });
  } catch (err) {
    const errMsg = err.message || String(err);
    addLog(`开始战斗失败: ${errMsg}`, "error");
    message.warning("请确认全队准备就绪");
  } finally {
    isStarting.value = false;
  }
};

// 测试：打开战斗页面（使用 mock 数据调试 UI）
const openTestBattle = () => {
  router.push({
    name: "NightmareBattle",
    query: {
      teamId: teamId.value || "14970667",
      captainTokenId: captainTokenId.value || "",
      test: "true",
    },
  });
};

// 5. 解散房间
const isDismissing = ref(false);

const dismissRoom = async () => {
  if (!teamId.value || !captainTokenId.value) {
    message.warning("没有可解散的房间");
    return;
  }

  isDismissing.value = true;
  addLog("解散房间 (matchteam_dismiss)...");

  try {
    const connected = await ensureCaptainConnected();
    if (!connected) {
      addLog("无法连接队长账号", "error");
      isDismissing.value = false;
      return;
    }

    await tokenStore.sendMessageWithPromise(
      captainTokenId.value,
      "matchteam_dismiss",
      { teamId: Number(teamId.value) },
      10000
    );
    addLog("房间已解散", "success");
    message.success("房间已解散");
    // 重置状态
    teamId.value = "";
    teamMembers.value = [];
    selectedTeammates.value = [];
    pageState.value = "teamBuilding";
  } catch (err) {
    addLog(`解散失败: ${err.message || err}`, "error");
  } finally {
    isDismissing.value = false;
  }
};

// ====== 预设执行：一键挑战 ======
const onPresetExecute = async (preset) => {
  // 关闭预设列表弹窗，以便观察组队页面日志
  presetRef.value?.close();

  message.info(`开始执行预设「${preset.name}」...`);
  addLog(`一键挑战：使用预设「${preset.name}」`, "info");

  // 临时保存当前选择
  const savedCaptain = captainTokenId.value;
  const savedTeammates = [...selectedTeammates.value];
  const savedSelectedMembers = [...selectedMemberRoleIds.value];

  try {
    // Step 1: 设置预设的队长和队员
    captainTokenId.value = preset.captainTokenId || savedCaptain;
    selectedTeammates.value = [...(preset.memberTokenIds || [])].slice(0, 4);

    addLog(`预设队长为：${getTokenName(captainTokenId.value)}`, "info");
    addLog(`预设队员：${selectedTeammates.value.map(t => getTokenName(t)).join(", ")}`, "info");

    // Step 2: 如果没有房间，先创建
    if (!teamId.value) {
      addLog("预设执行：创建房间...", "info");
      await createRoom();
      await delay(1500);
    }

    // Step 3: 队员加入并准备
    if (selectedTeammates.value.length > 0) {
      addLog("预设执行：队员加入并准备...", "info");
      await joinAndReady();
    }

    // Step 4: 开始战斗（传递 presetId）
    addLog("预设执行：开始战斗...", "info");
    await startBattle(preset.id);

  } catch (err) {
    addLog(`预设执行失败: ${err.message || err}`, "error");
    message.error(`预设执行失败: ${err.message || err}`);
    // 恢复原来状态
    captainTokenId.value = savedCaptain;
    selectedTeammates.value = savedTeammates;
    selectedMemberRoleIds.value = savedSelectedMembers;
  }
};

// 辅助：获取 token 名称
const getTokenName = (tokenId) => {
  if (!tokenId) return "未知";
  const t = tokenStore.gameTokens.find((t) => t.id === tokenId);
  return t ? t.name : tokenId.slice(0, 8);
};

</script>
```

### 3.3 样式（SCSS）

> 完整样式约 350 行 SCSS，包含 `.nightmare-challenge-container`, `.captain-section`, `.teammate-section`, `.team-members-section`, `.action-section`, `.fighting-section`, `.log-section` 等。详见源文件 `components/cards/NightmareChallengeCard.vue` 第 1389-1743 行。

---

## 4. 预设系统 - NightmarePreset.vue

**文件：`components/cards/NightmarePreset.vue`（完整代码 655 行）**

> 此组件实现一键挑战预设的创建、编辑、删除和执行。  
> 核心功能：
> - 预设列表 CRUD（存储于 localStorage `nightmare-presets`）
> - 8关出战优先级配置（点击交换位置）
> - 每关恢复设置（checkbox）
> - 套用第1关配置到全部关卡
> - Boss 名称映射：`{ 1: "秦广王", 2: "楚江王", 3: "宋帝王", 4: "五官王", 5: "阎罗王", 6: "卞城王", 7: "泰山王", 8: "都市王" }`

> 完整代码详见源文件 `components/cards/NightmarePreset.vue`。

---

## 5. 星级挑战 - StarChallengeCard.vue

**文件：`components/cards/StarChallengeCard.vue`（完整代码 1886 行）**

> 此组件实现十殿星级挑战的完整功能：
> - 进度刷新（`nmext_getinfo`）
> - 8关关卡网格 UI（星数、挑战次数、奖励领取状态）
> - 单关挑战 / 一键挑战
> - 罗盘抽奖（`nmext_drawturntable`）
> - 领取星章（`nmext_claimstarreward`）
> - 功德簿星数统计
> - battleTeam 数据结构测试面板
> - 阵容选择（预设阵容 / 主线阵容槽）
> - localStorage 同步（与批量日常页面共享数据）

> 核心指令流程：
> 1. `presetteam_typegetinfo` ×2 → 获取阵容
> 2. `presetteam_typecalcpowerbyteam` ×2 → 计算战力
> 3. `presetteam_typesetteam` ×2 → 设置阵容
> 4. `presetteam_typecalcpowerbyteam` ×4 → 重新计算
> 5. `nmext_startboss` ×2 → 挑战Boss

> 完整代码详见源文件 `components/cards/StarChallengeCard.vue`。

---

## 6. 战斗页面 - NightmareBattle.vue

**文件：`views/NightmareBattle.vue`（完整代码 1513 行）**

> 此页面实现十殿阎罗挑战的实时战斗界面：
> - Boss/怪物信息展示（HP条、怒气条）
> - 5人战斗成员展示（武将HP/怒气、出战/恢复按钮）
> - 战斗流程倒计时（10秒战斗中 + 18秒冷却）
> - 出战指令：`nightmare_fight`
> - 战斗结束：`nightmare_leadercomplete`
> - 恢复指令：`nightmare_restore`
> - 刷新数据：`nightmare_getroominfo`
> - 获取RoomId：`nightmare_getroleinfo`
> - 一键挑战自动出战模式（预设优先级）
> - 测试模式（使用抓包快照数据模拟）
> - 通关检测与自动返回

### Boss 最大HP参考数据

```js
const BOSS_MAX_HP = {
  1: { boss: 225300000000, minion: 75120000000 },   // 秦广王 2253亿, 小怪 751.2亿
  2: { boss: 247900000000, minion: 82640000000 },   // 楚江王 2479亿, 小怪 826.4亿
  3: { boss: 272700000000, minion: 0 },              // 宋帝王 2727亿
  4: { boss: 299900000000, minion: 0 },              // 五官王 2999亿
  5: { boss: 329900000000, minion: 300500000000 },   // 阎罗王 3299亿, 小怪 3005亿
  6: { boss: 300, minion: 0 },                       // 卞城王 300（实际血量）
  7: { boss: 751200000000, minion: 0 },              // 泰山王 7512亿
  8: { boss: 788800000000, minion: 0 },              // 都市王 7888亿
};
```

> 完整代码（模板+脚本+样式）详见源文件 `views/NightmareBattle.vue`。

---

## 7. Mock数据与映射 - nightmareBattleMock.js

**文件：`utils/nightmareBattleMock.js`（完整代码 179 行）**

```js
/**
 * 十殿阎罗挑战 - 战斗页面 Mock 数据 & 字典
 * 数据来源：真实十殿战斗抓包数据
 */
import captureData from "./nightmareBattleMockData.json";

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
  if (captureHeroNames[id]) return captureHeroNames[id];
  return heroNameDict[id] || `武将#${heroId}`;
}

// ====== 从真实抓包数据中提取的武将名称 ======
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
          const bossName = bossDict[Number(level)]?.name || `第${level}关Boss`;
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
  if (monsterNameDict[id]) return monsterNameDict[id];
  return `怪物#${monsterId}`;
}

// ====== 从抓包数据提取模拟数据 ======

export function getInitialRoomInfo() {
  return captureData.initialRoomInfo;
}

export function getCaptureRoomId() {
  return captureData._meta?.captureRoomId || captureData.roomId || "28314045";
}

export function getFightSnapshotCount() {
  return captureData.fightSnapshots?.length || 0;
}

export function getFightSnapshot(fightIndex) {
  const snapshots = captureData.fightSnapshots || [];
  if (fightIndex < 0 || fightIndex >= snapshots.length) return null;
  return snapshots[fightIndex].roomInfo || null;
}

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
```

---

## 8. 批量任务 - tasksNightmare.js

**文件：`utils/batch/tasksNightmare.js`（完整代码 305 行）**

```js
/**
 * 十殿类任务
 * 包含: batchStarChallenge
 */

/**
 * 创建十殿类任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksNightmare(deps) {
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
    currentSettings,
    loadSettings,
  } = deps;

  /**
   * 批量十殿星级挑战（一键挑战）
   * 逻辑：
   * - 从第1关顺序执行到第8关
   * - 某关次数已满（5次）则跳过
   * - 挑战成功且获得至少1星 → 继续下一关
   * - 挑战失败 / 0星 / 无阵容 / 异常 → 该账号终止
   */
  const batchStarChallenge = async () => {
    if (selectedTokens.value.length === 0) return;

    isRunning.value = true;
    shouldStop.value = false;

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const CMD_DELAY = 500;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const sendCmd = async (tokenId, cmd, params, timeout = 5000) => {
      return tokenStore.sendMessageWithPromise(tokenId, cmd, params, timeout).catch((e) => {
        return { __error: e.message || '' };
      });
    };

    const sendCmdRepeat = async (tokenId, cmd, params, times, delayMs = 300, timeout = 5000) => {
      const results = [];
      for (let i = 0; i < times; i++) {
        const res = await sendCmd(tokenId, cmd, params, timeout);
        results.push(res);
        if (i < times - 1) await sleep(delayMs);
      }
      return results;
    };

    const buildBattleTeam = (typeRes, typ) => {
      // 扁平方案 {pos: heroId}
      if (typeRes) {
        const bodyObj = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
        const typeData = bodyObj[String(typ)] || bodyObj[typ];
        const teamInfo = typeData?.teamInfo;
        if (teamInfo && Object.keys(teamInfo).length > 0) {
          const battleTeam = {};
          for (const [slot, hero] of Object.entries(teamInfo)) {
            if (hero?.heroId) {
              battleTeam[slot] = hero.heroId;
            }
          }
          if (Object.keys(battleTeam).length > 0) {
            return { battleTeam, hasNoTeam: false };
          }
        }
      }
      return { battleTeam: {}, hasNoTeam: true };
    };

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;

      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始 十殿星级挑战，一键挑战: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 先获取 nmext_getinfo（进入界面 + 获取挑战次数）
        const nmextInfo = await tokenStore.sendMessageWithPromise(tokenId, 'nmext_getinfo', {}, 5000).catch(() => null);

        // 解析 starFightCntMap：{ "1": 3, "2": 5, ... }
        const nmextData = nmextInfo?.roleNMExt || nmextInfo?.body?.roleNMExt || nmextInfo;
        const fightCntMap = nmextData?.starFightCntMap || {};

        // 解析 starBossCompleteMap：已有星数
        const completeMap = nmextData?.starBossCompleteMap || {};
        const starsMap = {};
        for (const [lv, stars] of Object.entries(completeMap)) {
          starsMap[lv] = Object.values(stars).filter(Boolean).length;
        }

        for (let level = 1; level <= 8; level++) {
          if (shouldStop.value) break;

          // 次数已满，跳过
          const usedCount = fightCntMap[String(level)] || fightCntMap[level] || 0;
          if (usedCount >= 5) continue;

          const typ = 100 + level;

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `== 关卡 ${level} 挑战开始 ==`,
            type: "info",
          });

          // 步骤 1: typegetinfo ×2
          const typeResArr = await sendCmdRepeat(tokenId, 'presetteam_typegetinfo', { types: [typ] }, 2, CMD_DELAY);
          const typeRes = typeResArr.find(r => r && !r.__error) || null;
          await sleep(CMD_DELAY);

          // 构造 battleTeam
          const { battleTeam, hasNoTeam } = buildBattleTeam(typeRes, typ);
          if (hasNoTeam) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `== 关卡 ${level} 挑战结束，请先在游戏内设置预设阵容 ==`,
              type: "error",
            });
            break;
          }

          // 提取 lordWeaponId
          let lordWeaponId = 0;
          if (typeRes) {
            const body = typeRes.presetTeamMap || typeRes.body?.presetTeamMap || typeRes;
            const typeData = body[String(typ)] || body[typ];
            if (typeData?.weapon?.weaponId !== undefined) {
              lordWeaponId = typeData.weapon.weaponId;
            }
          }

          // 步骤 2: calcpower ×2
          await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
          await sleep(CMD_DELAY);

          // 步骤 3: typesetteam ×2
          const setTeamResArr = await sendCmdRepeat(tokenId, 'presetteam_typesetteam', { typ, battleTeam, lordWeaponId }, 2, CMD_DELAY);
          await sleep(CMD_DELAY);

          // 从 typesetteam 响应中重新获取数据
          let updatedBattleTeam = battleTeam;
          let updatedWeaponId = lordWeaponId;
          for (const setRes of setTeamResArr) {
            if (setRes && !setRes.__error) {
              const setBody = setRes.presetTeamMap || setRes.body?.presetTeamMap || setRes;
              const setTypeData = setBody[String(typ)] || setBody[typ];
              if (setTypeData?.teamInfo) {
                const newTeam = {};
                for (const [slot, hero] of Object.entries(setTypeData.teamInfo)) {
                  if (hero?.heroId) newTeam[slot] = hero.heroId;
                }
                if (Object.keys(newTeam).length > 0) updatedBattleTeam = newTeam;
              }
              if (setTypeData?.weapon?.weaponId !== undefined) {
                updatedWeaponId = setTypeData.weapon.weaponId;
              }
            }
          }

          // 步骤 4: calcpower ×4
          await sendCmdRepeat(tokenId, 'presetteam_typecalcpowerbyteam', { typ, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId }, 4, CMD_DELAY);
          await sleep(CMD_DELAY);

          // 步骤 5: startboss ×2
          const bossResults = await sendCmdRepeat(
            tokenId, 'nmext_startboss',
            { bossId: level, battleTeam: updatedBattleTeam, lordWeaponId: updatedWeaponId, presetTeamType: typ },
            2, CMD_DELAY, 8000
          );

          const bossRes = bossResults.find(r => r && !r.__error) || null;

          if (!bossRes) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `== 关卡 ${level} 挑战无响应 ==`,
              type: "warning",
            });
            break;
          }

          // 解析结果
          const body = bossRes.body || bossRes || {};
          const result = body.result || body;
          const isWin = result.isWin ?? result.iswin ?? result.win;

          if (!isWin) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `== 关卡 ${level} 挑战失败 ==`,
              type: "error",
            });
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `第${level}关挑战失败，请游戏内检查阵容后重试。`,
              type: "error",
            });
            break;
          }

          // 成功，解析星数
          const bossCompleteMap = result.starBossCompleteMap || body.starBossCompleteMap
            || bossRes.roleNMExt?.starBossCompleteMap || body.roleNMExt?.starBossCompleteMap;
          let starCount = 0;
          if (bossCompleteMap) {
            const lvData = bossCompleteMap[String(level)] || bossCompleteMap[level];
            if (lvData) {
              starCount = Object.values(lvData).filter(Boolean).length;
            }
          }

          if (starCount > 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `== 关卡 ${level} 挑战成功，获得${starCount}星 ==`,
              type: "success",
            });

            // 更新本地 starsMap 和 fightCntMap
            starsMap[level] = Math.max(starsMap[level] || 0, starCount);
            fightCntMap[level] = usedCount + 1;
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `== 关卡 ${level} 挑战成功，获得0星 ==`,
              type: "warning",
            });
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `第${level}关挑战失败，请游戏内检查阵容后重试。`,
              type: "error",
            });
            break;
          }

          if (level === 8) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `星级挑战，一键挑战完成。`,
              type: "success",
            });
          }

          await sleep(CMD_DELAY);
        }

        tokenStatus.value[tokenId] = "completed";
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 十殿星级挑战失败: ${error.message}`,
          type: "error",
        });
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
    message.success("批量十殿星级挑战结束");
  };

  return {
    batchStarChallenge,
  };
}
```

---

## 9. 批量日常页面集成 - BatchDailyTasks.vue

**文件：`views/BatchDailyTasks.vue`（节选）**

### 9.1 模板 - 十殿 Tab

```html
<n-tab-pane name="nightmare" tab="十殿">
    <n-space>
        <n-button size="small"
                  type="warning"
                  @click="batchNightmareChallenge"
                  :disabled="isRunning || selectedTokens.length === 0">
            十殿阎罗挑战
        </n-button>
        <n-button size="small"
                  @click="batchStarChallenge"
                  :disabled="isRunning || selectedTokens.length === 0">
            一键十殿星级挑战
        </n-button>
        <n-button size="small"
                  @click="batchNightmareLottery"
                  :disabled="isRunning || selectedTokens.length === 0">
            一键十殿抽奖
        </n-button>
    </n-space>
</n-tab-pane>
```

### 9.2 脚本 - 任务初始化与十殿挑战跳转

```js
const tasksNightmare = createTasksNightmare(createTaskDeps());
const { batchStarChallenge } = tasksNightmare;

// ====== 十殿阎罗挑战 ======
const batchNightmareChallenge = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号作为队长");
    return;
  }
  if (selectedTokens.value.length > 1) {
    message.warning("请只选择一个队长执行");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const status = tokenStore.getWebSocketStatus(tokenId);

  // 自动连接
  if (status !== "connected") {
    message.info("正在建立连接...");
    tokenStore.selectToken(tokenId, true);

    // 轮询等待连接建立（最多30次，每次500ms = 15秒）
    let retries = 0;
    while (tokenStore.getWebSocketStatus(tokenId) !== "connected" && retries < 30) {
      await new Promise((r) => setTimeout(r, 500));
      retries++;
    }

    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
      message.error("连接建立失败，请检查网络后重试");
      return;
    }
    message.success("连接建立成功");
  }

  // 跳转到游戏功能页面，并携带自动打开十殿挑战的参数
  router.push({
    path: "/admin/game-features",
    query: { openNightmare: "true", tokenId: tokenId },
  });
};
```

---

## WebSocket 指令汇总

| 指令 | 用途 | 参数 |
|------|------|------|
| `nightmare_getroleinfo` | 获取角色十殿信息（roomId） | `{ roleId }` |
| `nightmare_getroominfo` | 获取战斗房间实时数据 | `{ roomId }` |
| `nightmare_fight` | 成员出战 | `{ roomId, roleId }` |
| `nightmare_leadercomplete` | 战斗结束确认 | `{ roomId }` |
| `nightmare_restore` | 恢复成员 | `{ roomId, roleId }` |
| `matchteam_getroleteaminfo` | 获取角色队伍信息 | `{ roleID }` |
| `matchteam_getteaminfo` | 获取队伍详情 | `{ teamId }` |
| `matchteam_getrandteamlist` | 获取随机队伍列表 | `{ teamCfgId, param, custom }` |
| `matchteam_create` | 创建组队房间 | `{ teamCfgId, setting, param, custom, extParam }` |
| `matchteam_join` | 加入房间 | `{ teamId }` |
| `matchteam_memberprepare` | 成员准备 | `{ teamId }` |
| `matchteam_openteam` | 开始战斗 | `{ teamId }` |
| `matchteam_dismiss` | 解散房间 | `{ teamId }` |
| `nmext_getinfo` | 获取星级挑战进度 | `{}` |
| `nmext_startboss` | 星级挑战Boss | `{ bossId, battleTeam, lordWeaponId, presetTeamType }` |
| `nmext_drawturntable` | 罗盘抽奖 | `{ itemId }` |
| `nmext_claimstarreward` | 领取星级奖励 | `{ level }` |
| `presetteam_typegetinfo` | 获取预设阵容类型信息 | `{ types: [typ] }` |
| `presetteam_typecalcpowerbyteam` | 计算阵容战力 | `{ typ, battleTeam, lordWeaponId }` |
| `presetteam_typesetteam` | 设置预设阵容 | `{ typ, battleTeam, lordWeaponId }` |
| `presetteam_getinfo` | 获取主线阵容槽信息 | `{}` |
| `presetteam_saveteam` | 切换阵容槽 | `{ teamId }` |
| `hero_calcpowerbyteam` | 计算主线阵容战力 | `{ battleTeam, lordWeaponId }` |
| `role_getroleinfo` | 获取角色信息 | `{}` |
