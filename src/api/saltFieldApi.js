// SaltField (盐场刨地) API 封装
export const saltFieldApi = {
  /**
   * 启动单账号刨地
   * @param {string} tokenId - Token ID
   * @param {string} tokenName - Token 名称（可选）
   */
  async start(tokenId, tokenName) {
    const response = await fetch('/api/salt-field/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, tokenName })
    });
    return response.json();
  },

  /**
   * 停止单账号刨地
   * @param {string} tokenId - Token ID
   */
  async stop(tokenId) {
    const response = await fetch('/api/salt-field/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId })
    });
    return response.json();
  },

  /**
   * 获取所有账号运行状态
   */
  async statusAll() {
    const response = await fetch('/api/salt-field/status');
    const data = await response.json();
    return { ok: true, statusMap: data || {} };
  },

  /**
   * 获取当前用户勾选的参与账号列表
   */
  async getEnabled() {
    const response = await fetch('/api/salt-field/enabled');
    const data = await response.json();
    return { ok: true, tokenIds: data.tokenIds || [] };
  },

  /**
   * 保存当前用户的参与账号列表
   * @param {string[]} tokenIds - Token ID 列表
   */
  async setEnabled(tokenIds) {
    const response = await fetch('/api/salt-field/enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIds })
    });
    return response.json();
  }
};
