<template>
  <MyCard
    class="study"
    :status-class="{ weekly: true, completed: study.isCompleted }"
  >
    <template #icon>
      <img alt="学习图标" src="/icons/1736425783912140.png">
    </template>
    <template #title>
      <h3>咸鱼大冲关</h3>
      <p>每日知识挑战</p>
    </template>
    <template #badge>
      <span>每周任务</span>
    </template>
    <template #default>
      <p class="description">没有什么可以阻挡我求知的欲望！</p>
    </template>
    <template #action>
      <!-- 优先检查 isCompleted -->
      <a-button v-if="study.isCompleted" status="success" :disabled="true">
        ✅ 已完成无需作答
      </a-button>
      <!-- 其次检查 thisWeek -->
      <a-button v-else-if="study.thisWeek" status="success" :disabled="true">
        ✅ 本周已完成
      </a-button>
      <!-- 答题中状态 -->
      <a-button
        v-else-if="study.status == 'starting'"
        status="warning"
        :disabled="true"
      >
        正在获取题库...
      </a-button>
      <a-button
        v-else-if="study.status == 'answering'"
        status="warning"
        :disabled="true"
      >
        答题中...
      </a-button>
      <a-button
        v-else-if="study.status == 'claiming_rewards'"
        status="warning"
        :disabled="true"
      >
        正在领取奖励...
      </a-button>
      <a-button
        v-else-if="study.status == 'completed'"
        status="warning"
        :disabled="true"
      >
        答题完成
      </a-button>
      <!-- 默认显示答题按钮 -->
      <a-button v-else status="primary" @click="startStudy">
        🎯 一键答题
      </a-button>
    </template>
  </MyCard>
</template>

<script setup>
import { computed } from "vue";
import { useMessage } from "naive-ui";
import {
  getQuestionCount,
  preloadQuestions,
} from "@/utils/studyQuestionsFromJSON.js";
import { useTokenStore } from "@/stores/tokenStore";
import { isInCurrentWeek } from "@/utils/base";
import MyCard from "../Common/MyCard.vue";

const tokenStore = useTokenStore();
const message = useMessage();

// ✅ 修复：合并 studyStatus 和 roleInfo.study 数据，避免状态未同步导致显示错误
const study = computed(() => {
  const status = tokenStore.gameData.studyStatus || {};
  // roleInfo 有两种数据结构：body.role（WebSocket handler）或 body（sendGetRoleInfo）
  // 需要兼容两种路径获取 study 数据
  const ri = tokenStore.gameData.roleInfo;
  const roleStudy = ri?.study || ri?.role?.study;

  // 如果 roleInfo 有 study 数据，用它来补充/覆盖完成状态
  if (roleStudy) {
    const maxCorrectNum = roleStudy.maxCorrectNum || 0;
    const beginTime = roleStudy.beginTime || 0;
    const thisWeek = beginTime > 0 ? isInCurrentWeek(beginTime * 1000) : false;
    const isCompleted = maxCorrectNum >= 10 && thisWeek;

    if (isCompleted) {
      return {
        ...status,
        isCompleted: true,
        thisWeek: true,
        maxCorrectNum,
      };
    }
  }

  return status;
});

const startStudy = async () => {
  // 1. 基础检查
  if (!tokenStore.selectedToken) {
    message.warning("⚠️ 请先选择Token");
    return;
  }

  // 2. 检查本地状态（第一道防线）
  if (study.value.isCompleted || study.value.thisWeek) {
    message.success("✅ 本周答题已完成，无需重复作答！");
    return;
  }

  if (study.value.status != "" && study.value.status != "idel") {
    message.warning("⚠️ 答题进行中，请勿重复操作");
    return;
  }

  console.log("开始答题", study.value);
  study.value.status = "starting";

  try {
    // 3. 获取服务器最新数据（第二道防线）
    message.info(" 正在检查答题状态...");
    const tokenId = tokenStore.selectedToken.id;
    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      10000,
    );

    // 4. 安全获取数据
    const maxCorrectNum = roleInfo?.body?.role?.study?.maxCorrectNum ?? 0;
    const beginTime = roleInfo?.body?.role?.study?.beginTime ?? 0;

    // 5. 严格判断：必须 maxCorrectNum >= 10 且 beginTime 有效
    const { isInCurrentWeek } = await import("@/utils/base.ts");
    const isStudyCompleted = maxCorrectNum >= 10 && beginTime > 0 && isInCurrentWeek(beginTime * 1000);

    // 6. 如果服务器数据显示已完成
    if (isStudyCompleted) {
      message.success(`✅ 本周答题已完成（正确数: ${maxCorrectNum}/10），无需重复作答！`);
      study.value.status = "";

      // 更新全局状态
      tokenStore.gameData.studyStatus = {
        ...tokenStore.gameData.studyStatus,
        thisWeek: true,
        isCompleted: true,
        maxCorrectNum,
        beginTime,
      };

      return;
    }

    message.info(`📊 当前正确数: ${maxCorrectNum}/10，准备开始答题...`);

    // 7. 预加载题库
    await preloadQuestions();
    const questionCount = await getQuestionCount();
    message.info(` 题库加载完成，共 ${questionCount} 道题目`);

    study.value.status = "answering";
    message.info(`🚀 开始一键答题...`);

    // 8. 更新答题状态
    tokenStore.gameData.studyStatus = {
      ...tokenStore.gameData.studyStatus,
      isAnswering: true,
      questionCount: 0,
      answeredCount: 0,
      status: "answering",
      timestamp: Date.now(),
    };

    // 9. 发送开始答题命令
    tokenStore.sendMessage(tokenId, "study_startgame");

    // 10. 设置90秒超时
    const timeoutTimer = setTimeout(() => {
      const currentStatus = tokenStore.gameData.studyStatus;
      if (currentStatus.status === "answering" || currentStatus.status === "starting") {
        tokenStore.gameData.studyStatus = {
          ...currentStatus,
          isAnswering: false,
          questionCount: 0,
          answeredCount: 0,
          status: "",
          timestamp: null,
        };
        study.value.status = "";
        message.warning("⏱️ 答题超时（90秒），已自动重置状态");
      }
    }, 90000);

    // 11. 监听答题完成事件
    const checkCompletion = setInterval(() => {
      const status = tokenStore.gameData.studyStatus;

      if (status.status === "completed") {
        clearInterval(checkCompletion);
        clearTimeout(timeoutTimer);
        study.value.status = "";
        message.success("✅ 答题完成，奖励已领取！");
      } else if (status.status === "failed") {
        clearInterval(checkCompletion);
        clearTimeout(timeoutTimer);
        study.value.status = "";
        message.error(" 答题失败，请重试");
      }
    }, 1000);
  } catch (error) {
    console.error("启动答题失败:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    // 错误码 3100080 通常表示答题次数已用完或答题未开启
    if (errorMsg.includes("3100080")) {
      message.warning(`⚠️ 答题次数已用完或功能未开启 (错误码: 3100080)`);
      message.info(`ℹ️ 该任务视为已完成，不影响整体任务统计`);

      // 更新状态为完成
      study.value.status = "";
      tokenStore.gameData.studyStatus = {
        ...tokenStore.gameData.studyStatus,
        isAnswering: false,
        questionCount: 0,
        answeredCount: 0,
        status: "",
        timestamp: null,
        isCompleted: true,
        thisWeek: true,
      };
    } else {
      message.error(`启动答题失败: ${errorMsg}`);

      // 重置状态
      study.value.status = "";
      tokenStore.gameData.studyStatus = {
        isAnswering: false,
        questionCount: 0,
        answeredCount: 0,
        status: "",
        timestamp: null,
      };
    }
  }
};
</script>
