// Server API 封装
// ★ 本地优先：Token 数据从 IndexedDB 读取，无需后端
import { getAllGameTokens } from "@/utils/tokenDb";

export const tokenApi = {
  /**
   * 获取所有游戏 Token 列表
   * @returns {Promise<{ data: { tokens: Array<{ tokenId: string, id: string, name: string, server: string }> } }>}
   */
  async getAll() {
    try {
      const gameTokens = (await getAllGameTokens()) || {};
      const tokens = Object.entries(gameTokens).map(([roleId, t]) => ({
        tokenId: roleId,
        id: roleId,
        name: (t && t.name) || roleId,
        server: (t && t.server) || "",
      }));
      return { data: { tokens } };
    } catch (e) {
      console.warn("[serverApi] 获取 Token 列表失败:", e);
      return { data: { tokens: [] } };
    }
  },
};

export default { tokenApi };
