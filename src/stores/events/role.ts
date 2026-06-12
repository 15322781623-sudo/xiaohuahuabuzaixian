import type { EVM, XyzwSession } from ".";
import { gameLogger } from "@/utils/logger";
import { useTokenStore } from "../tokenStore";

// 处理加钟/时钟相关事件，触发获取角色信息以更新状态
export const RolePlugin = ({
  onSome,
  $emit,
}: EVM) => {
  onSome(["role_getroleinforesp", "role_getroleinfo"], (data: XyzwSession) => {
    gameLogger.verbose(`收到角色信息事件: ${data.tokenId}`, data);
    const { body, tokenId } = data;
    gameLogger.debug("role_getroleinforesp body结构:", JSON.stringify(body, null, 2).substring(0, 500));
    data.gameData.value.roleInfo = body;
    data.gameData.value.lastUpdated = new Date().toISOString();

    // 只在答题相关操作或初始连接时触发I-study事件更新答题状态
    // 检查触发来源命令
    const sourceCmd = data.cmd || "";
    const isStudyRelated = sourceCmd.includes("study");

    // 检查是否是初始连接（roleInfo为空或刚开始连接）
    const wasRoleInfoEmpty = !data.gameData.value.roleInfo
      || Object.keys(data.gameData.value.roleInfo).length === 0;

    if (body.role?.study?.maxCorrectNum !== undefined) {
      gameLogger.info(`答题数据 - maxCorrectNum: ${body.role.study.maxCorrectNum}, beginTime: ${body.role.study.beginTime}`);

      // 只有在以下情况才触发I-study事件：
      // 1. 答题相关命令（study_startgame等）
      // 2. 初始连接时（roleInfo为空）
      if (isStudyRelated || wasRoleInfoEmpty) {
        $emit.emit("I-study", data);
        gameLogger.verbose(`触发I-study事件 - 原因: ${isStudyRelated ? "答题操作" : "初始连接"}`);
      } else {
        // 其他功能按钮触发时，只更新数据，不触发答题状态更新事件
        gameLogger.verbose(`非答题操作（来源: ${sourceCmd}），跳过I-study事件触发`);
      }
    } else {
      gameLogger.warn("未找到答题数据 body.role.study");
    }

    // 从角色信息中提取游戏名称和服务器信息，并更新到token列表
    const tokenStore = useTokenStore();
    const token = tokenStore.gameTokens.find((t) => t.id === tokenId);
    if (token) {
      // 优先使用serverName字段获取服务器信息
      const server
        = body?.role?.serverName
          || body?.serverName
          || body?.role?.server
          || body?.server;

      // 只有当服务器信息实际发生变化时才更新，避免循环触发
      if (server && server !== token.server) {
        // 更新token信息
        tokenStore.updateToken(tokenId, {
          server,
        });

        gameLogger.verbose(`已更新Token ${tokenId} 的服务器信息`, { server });
      }
    }
  });
};
