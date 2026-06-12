import { isInCurrentWeek, sleep } from "@/utils/base";
import { gameLogger } from "@/utils/logger";
import { findAnswer } from "@/utils/studyQuestionsFromJSON";
import { useTokenStore } from "../tokenStore";
import type { EVM, XyzwSession } from ".";

export const StudyPlugin = ({
  onSome,
  $emit,
}: EVM) => {
  onSome(["study", "studyresp", "study_startgame", "study_startgameresp"], async (data: XyzwSession) => {
    gameLogger.verbose(`收到学习答题事件: ${data.tokenId}`, data);
    const { body, gameData, client, tokenId } = data;
    if (!body) {
      return;
    }

    gameLogger.info("开始处理学习答题响应");
    // 获取题目列表和学习ID
    const questionList = body.questionList;
    const studyId = body.role?.study?.id;

    // 获取tokenStore实例
    const tokenStore = useTokenStore();

    // 如果没有题目列表，说明本周已完成或答题未开启
    if (!questionList || !Array.isArray(questionList) || questionList.length === 0) {
      gameLogger.info("未找到题目列表，可能本周已完成");

      // 更新状态为完成
      const completedStatus = {
        isAnswering: false,
        questionCount: 0,
        answeredCount: 0,
        status: "completed",
        timestamp: Date.now(),
        thisWeek: true,
        isCompleted: true,
        maxCorrectNum: body.role?.study?.maxCorrectNum || 0,
      };

      gameData.value.studyStatus = completedStatus;
      tokenStore.updateTokenGameData(tokenId, { studyStatus: completedStatus });

      // ✅ 同步更新 roleInfo 中的 study 数据，避免缓存延迟导致状态不一致
      if (body.role?.study) {
        const currentGameData = tokenStore.getTokenGameData(tokenId);
        if (currentGameData?.roleInfo?.role?.study) {
          tokenStore.updateTokenGameData(tokenId, {
            roleInfo: {
              ...currentGameData.roleInfo,
              role: {
                ...currentGameData.roleInfo.role,
                study: body.role.study,
              },
            },
          });
        }
      }

      gameLogger.info(`已将答题状态标记为完成: ${tokenId}`);
      return;
    }

    if (!studyId) {
      gameLogger.error("未找到学习ID");
      return;
    }
    gameLogger.info(`找到 ${questionList.length} 道题目，学习ID: ${studyId}`);

    // 更新答题状态（同时更新全局和token特定的游戏数据）
    const updatedStatus = {
      isAnswering: true,
      questionCount: questionList.length,
      answeredCount: 0,
      status: "answering",
      timestamp: Date.now(),
    };

    gameData.value.studyStatus = updatedStatus;
    tokenStore.updateTokenGameData(tokenId, { studyStatus: updatedStatus });

    try {
      // 遍历题目并回答
      for (let i = 0; i < questionList.length; i++) {
        const question = questionList[i];
        const questionText = question.question;
        const questionId = question.id;

        gameLogger.debug(`题目 ${i + 1}/${questionList.length}: ${questionText.substring(0, 30)}...`);

        // 查找答案（异步）
        let answer = await findAnswer(questionText);

        if (answer === null) {
          answer = 1;
          gameLogger.warn(`题目 ${i + 1} 未找到匹配答案，使用默认答案: ${answer}`);
        } else {
          gameLogger.debug(`题目 ${i + 1} 找到答案: ${answer}`);
        }

        // 发送答案
        try {
          client?.send("study_answer", {
            id: studyId,
            option: [answer],
            questionId: [questionId],
          });
          gameLogger.verbose(`已提交题目 ${i + 1} 的答案: ${answer}`);
        } catch (error) {
          gameLogger.error(`提交答案失败 (题目 ${i + 1}):`, error);
          // 等待1秒后重试
          await sleep(1000);
          try {
            client?.send("study_answer", {
              id: studyId,
              option: [answer],
              questionId: [questionId],
            });
            gameLogger.verbose(`重试成功，已提交题目 ${i + 1} 的答案`);
          } catch (retryError) {
            gameLogger.error(`重试失败 (题目 ${i + 1}):`, retryError);
          }
        }

        // 更新已回答题目数量
        gameData.value.studyStatus.answeredCount = i + 1;
        tokenStore.updateTokenGameData(tokenId, {
          studyStatus: {
            ...gameData.value.studyStatus,
            answeredCount: i + 1,
          },
        });

        gameLogger.info(`答题进度: ${i + 1}/${questionList.length}`);

        // 添加短暂延迟，避免请求过快（300-500ms随机）
        if (i < questionList.length - 1) {
          const delay = 300 + Math.floor(Math.random() * 200);
          await sleep(delay);
        }
      }

      gameLogger.info(`所有题目已回答完毕，等待2秒后验证答题进度`);
      // 延迟2000ms后验证答题进度
      await sleep(2000);

      // 验证答题进度：从服务器获取实际的答题进度
      try {
        gameLogger.info("正在验证答题进度...");
        const tokenStore = useTokenStore();
        const roleInfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "role_getroleinfo",
          {},
          10000,
        );

        // 尝试多种可能的路径获取 study 数据
        const studyData = roleInfo?.body?.role?.study
          || roleInfo?.body?.study
          || roleInfo?.role?.study
          || roleInfo?.study;

        const serverMaxCorrectNum = studyData?.maxCorrectNum ?? 0;

        gameLogger.info(`服务器答题进度: ${serverMaxCorrectNum}/10`);

        // 如果答题未完成（maxCorrectNum < 10），标记为需要重试
        if (serverMaxCorrectNum < 10) {
          gameLogger.warn(`答题未完成！服务器进度: ${serverMaxCorrectNum}/10，标记为需要重试`);

          const failedStatus = {
            isAnswering: false,
            questionCount: questionList.length,
            answeredCount: serverMaxCorrectNum,
            status: "failed_need_retry",
            timestamp: Date.now(),
            error: `答题未完成，服务器进度: ${serverMaxCorrectNum}/10`,
            maxCorrectNum: serverMaxCorrectNum,
          };

          gameData.value.studyStatus = failedStatus;
          tokenStore.updateTokenGameData(tokenId, { studyStatus: failedStatus });

          // 不触发领取奖励，直接返回
          return;
        }

        gameLogger.info("答题进度验证通过，开始领取奖励");
      } catch (verifyError) {
        gameLogger.error("验证答题进度失败:", verifyError);
        // 验证失败时，尝试刷新游戏数据后再次验证
        try {
          gameLogger.info("尝试刷新游戏数据后再次验证...");
          const tokenStore = useTokenStore();

          // 检查连接状态
          const wsStatus = tokenStore.getWebSocketStatus(tokenId);
          if (wsStatus !== "connected") {
            gameLogger.warn("WebSocket未连接，无法验证答题进度");

            const failedStatus = {
              isAnswering: false,
              questionCount: questionList.length,
              answeredCount: gameData.value.studyStatus.answeredCount,
              status: "failed_need_retry",
              timestamp: Date.now(),
              error: "WebSocket未连接，无法验证答题进度",
            };

            gameData.value.studyStatus = failedStatus;
            tokenStore.updateTokenGameData(tokenId, { studyStatus: failedStatus });
            return;
          }

          // 刷新游戏数据（自动重连）
          gameLogger.info("正在刷新游戏数据...");
          await tokenStore.refreshGameData(tokenId);
          await sleep(2000); // 等待数据刷新

          // 再次验证
          const roleInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000,
          );

          const studyData = roleInfo?.body?.role?.study
            || roleInfo?.body?.study
            || roleInfo?.role?.study
            || roleInfo?.study;

          const serverMaxCorrectNum = studyData?.maxCorrectNum ?? 0;

          if (serverMaxCorrectNum < 10) {
            gameLogger.warn(`刷新数据后答题仍未完成！服务器进度: ${serverMaxCorrectNum}/10`);

            const failedStatus = {
              isAnswering: false,
              questionCount: questionList.length,
              answeredCount: serverMaxCorrectNum,
              status: "failed_need_retry",
              timestamp: Date.now(),
              error: `答题未完成，服务器进度: ${serverMaxCorrectNum}/10`,
              maxCorrectNum: serverMaxCorrectNum,
            };

            gameData.value.studyStatus = failedStatus;
            tokenStore.updateTokenGameData(tokenId, { studyStatus: failedStatus });
            return;
          }

          gameLogger.info("刷新数据后答题进度验证通过，开始领取奖励");
        } catch (retryError: any) {
          gameLogger.error("刷新数据后验证仍然失败:", retryError);
          // 重试失败，标记为需要重试
          const failedStatus = {
            isAnswering: false,
            questionCount: questionList.length,
            answeredCount: gameData.value.studyStatus.answeredCount,
            status: "failed_need_retry",
            timestamp: Date.now(),
            error: `验证答题进度失败: ${retryError?.message || String(retryError)}`,
          };

          gameData.value.studyStatus = failedStatus;
          tokenStore.updateTokenGameData(tokenId, { studyStatus: failedStatus });
          return;
        }
      }

      // 答题进度验证通过，触发领取奖励
      $emit.emit("I-study-week-forward", data);
    } catch (error) {
      gameLogger.error("处理学习答题响应失败:", error);

      // 发生错误时也要更新状态
      const errorStatus = {
        isAnswering: false,
        questionCount: questionList.length,
        answeredCount: gameData.value.studyStatus.answeredCount,
        status: "failed",
        timestamp: Date.now(),
        error: (error as Error)?.message || String(error),
      };

      gameData.value.studyStatus = errorStatus;
      tokenStore.updateTokenGameData(tokenId, { studyStatus: errorStatus });
    }
  });
  //
  onSome(["I-study"], (data: XyzwSession) => {
    const { body, gameData, tokenId } = data;

    // 安全获取数据
    const maxCorrectNum = body?.role?.study?.maxCorrectNum ?? 0;
    const beginTime = body?.role?.study?.beginTime ?? 0;

    // 更严格的判断：必须 maxCorrectNum >= 10 且 beginTime 有效
    const isStudyCompleted = maxCorrectNum >= 10 && beginTime > 0 && isInCurrentWeek(beginTime * 1000);

    // 更新答题完成状态
    if (!gameData.value.studyStatus) {
      gameData.value.studyStatus = {};
    }

    gameData.value.studyStatus.thisWeek = isStudyCompleted;
    gameData.value.studyStatus.isCompleted = isStudyCompleted;
    gameData.value.studyStatus.maxCorrectNum = maxCorrectNum;
    gameData.value.studyStatus.beginTime = beginTime;

    gameLogger.info(`答题状态更新: maxCorrectNum=${maxCorrectNum}, beginTime=${beginTime}, 完成状态=${isStudyCompleted}`);

    // 同步更新到token特定的游戏数据
    const tokenStore = useTokenStore();
    tokenStore.updateTokenGameData(tokenId, {
      studyStatus: {
        thisWeek: isStudyCompleted,
        isCompleted: isStudyCompleted,
        maxCorrectNum,
        beginTime,
      },
    });
  });
  //
  onSome(["I-study-week-forward"], async (data: XyzwSession) => {
    gameLogger.info("开始领取答题奖励");
    const { gameData, client, tokenId } = data;
    // 获取tokenStore实例
    const tokenStore = useTokenStore();
    // 更新状态为正在领取奖励
    gameData.value.studyStatus.status = "claiming_rewards";
    tokenStore.updateTokenGameData(tokenId, {
      studyStatus: { ...gameData.value.studyStatus },
    });
    // 领取所有等级的奖励 (1-10)
    for (let rewardId = 1; rewardId <= 10; rewardId++) {
      try {
        client?.send("study_claimreward", {
          rewardId,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
        gameLogger.verbose(`已发送奖励领取请求: rewardId=${rewardId}`);
      } catch (error) {
        gameLogger.error(`发送奖励领取请求失败 (rewardId=${rewardId}):`, error);
      }
    }

    gameLogger.info("一键答题完成！已尝试领取所有奖励");

    // 领取奖励后，重新获取角色信息以更新 maxCorrectNum
    try {
      gameLogger.info("正在获取最新角色信息以更新答题状态...");
      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
        10000,
      );

      // 尝试多种可能的路径获取 study 数据
      const studyData = roleInfo?.body?.role?.study
        || roleInfo?.body?.study
        || roleInfo?.role?.study
        || roleInfo?.study;

      const maxCorrectNum = studyData?.maxCorrectNum ?? 0;
      const beginTime = studyData?.beginTime ?? 0;

      gameLogger.info(`答题状态已更新 - maxCorrectNum: ${maxCorrectNum}, beginTime: ${beginTime}`);

      // 更新状态为完成，并保存最新的 maxCorrectNum
      const completedStatus = {
        isAnswering: false,
        questionCount: gameData.value.studyStatus.questionCount || 10,
        answeredCount: gameData.value.studyStatus.answeredCount || 10,
        status: "completed",
        timestamp: Date.now(),
        thisWeek: true,
        isCompleted: true,
        maxCorrectNum,
        beginTime,
      };

      gameData.value.studyStatus = completedStatus;
      tokenStore.updateTokenGameData(tokenId, { studyStatus: completedStatus });

      // ✅ 同步更新 roleInfo 中的 study 数据，确保 TokenCard 显示状态与实际一致
      if (studyData) {
        const currentGameData = tokenStore.getTokenGameData(tokenId);
        if (currentGameData?.roleInfo?.role?.study) {
          tokenStore.updateTokenGameData(tokenId, {
            roleInfo: {
              ...currentGameData.roleInfo,
              role: {
                ...currentGameData.roleInfo.role,
                study: studyData,
              },
            },
          });
        }
      }

      gameLogger.info("答题状态已同步到游戏数据");
    } catch (error) {
      gameLogger.error("获取最新角色信息失败:", error);
      // 即使获取失败，也标记为完成
      gameData.value.studyStatus.status = "completed";
      gameData.value.studyStatus.thisWeek = true;
      gameData.value.studyStatus.isCompleted = true;
      tokenStore.updateTokenGameData(tokenId, {
        studyStatus: { ...gameData.value.studyStatus },
      });
    }

    // 保留完成状态3秒,让界面有足够时间更新显示
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // ✅ 重置状态时保留关键完成信息,确保账号卡片显示正确
    const resetStatus = {
      isAnswering: false,
      questionCount: 0,
      answeredCount: 0,
      status: "",
      timestamp: null,
      // 保留完成状态信息
      isCompleted: true,
      maxCorrectNum: gameData.value.studyStatus.maxCorrectNum || 10,
      thisWeek: true,
    };

    gameData.value.studyStatus = resetStatus;
    tokenStore.updateTokenGameData(tokenId, { studyStatus: resetStatus });

    // 1秒后更新游戏数据
    try {
      // client?.send('role_getroleinfo', {})
      client?.debounceSend("role_getroleinfo", {});
      gameLogger.debug("已请求更新角色信息");
    } catch (error) {
      gameLogger.error("请求角色信息更新失败:", error);
    }
  });
};
