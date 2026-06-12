/**
 * 配置适配器
 * 将用户自定义设置应用到各个任务模块
 */

import { DELAY_CONFIG, RETRY_CONFIG, TIMEOUT_CONFIG } from "./constants.js";

/**
 * 获取超时配置
 * @param {object} userSettings - 用户自定义设置(batchSettings)
 * @returns {object} 应用了用户设置后的超时配置
 */
export const getTimeoutConfig = (userSettings = {}) => {
  return {
    DEFAULT_COMMAND: userSettings.defaultCommandTimeout || TIMEOUT_CONFIG.DEFAULT_COMMAND,
    TOWER_FIGHT: userSettings.battleCommandTimeout || TIMEOUT_CONFIG.TOWER_FIGHT,
    ROLE_INFO: TIMEOUT_CONFIG.ROLE_INFO,
    CONNECTION: userSettings.connectionTimeout || TIMEOUT_CONFIG.CONNECTION,
    SHORT_OPERATION: TIMEOUT_CONFIG.SHORT_OPERATION,
  };
};

/**
 * 获取重试配置
 * @param {object} userSettings - 用户自定义设置(batchSettings)
 * @returns {object} 应用了用户设置后的重试配置
 */
export const getRetryConfig = (userSettings = {}) => {
  return {
    DEFAULT_COUNT: userSettings.defaultRetryCount !== undefined
      ? userSettings.defaultRetryCount
      : RETRY_CONFIG.DEFAULT_COUNT,
    MAX_COUNT: RETRY_CONFIG.MAX_COUNT,
    DEFAULT_DELAY: userSettings.retryDelay || RETRY_CONFIG.DEFAULT_DELAY,
    ACCOUNT_INTERVAL: userSettings.accountRetryInterval || RETRY_CONFIG.ACCOUNT_INTERVAL,
    EXPONENTIAL_BASE: RETRY_CONFIG.EXPONENTIAL_BASE,
  };
};

/**
 * 获取延迟配置
 * @param {object} userSettings - 用户自定义设置(batchSettings)
 * @returns {object} 应用了用户设置后的延迟配置
 */
export const getDelayConfig = (userSettings = {}) => {
  return {
    COMMAND: userSettings.commandDelay || DELAY_CONFIG.COMMAND,
    TASK: userSettings.taskDelay || DELAY_CONFIG.TASK,
    ACTION: userSettings.actionDelay || DELAY_CONFIG.ACTION,
    BATTLE: userSettings.battleDelay || DELAY_CONFIG.BATTLE,
    REFRESH: userSettings.refreshDelay || DELAY_CONFIG.REFRESH,
    LONG: userSettings.longDelay || DELAY_CONFIG.LONG,
  };
};

/**
 * 获取完整配置
 * @param {object} userSettings - 用户自定义设置(batchSettings)
 * @returns {object} 完整配置对象
 */
export const getFullConfig = (userSettings = {}) => {
  return {
    timeout: getTimeoutConfig(userSettings),
    retry: getRetryConfig(userSettings),
    delay: getDelayConfig(userSettings),
  };
};

/**
 * 生成配置说明文本
 * @param {object} userSettings - 用户自定义设置
 * @returns {string} 配置说明
 */
export const getConfigDescription = (userSettings = {}) => {
  const config = getFullConfig(userSettings);

  return `
配置信息:
- 超时设置:
  • 默认命令: ${config.timeout.DEFAULT_COMMAND}ms
  • 战斗命令: ${config.timeout.TOWER_FIGHT}ms
  • 连接超时: ${config.timeout.CONNECTION}ms

- 重试设置:
  • 重试次数: ${config.retry.DEFAULT_COUNT}次
  • 重试延迟: ${config.retry.DEFAULT_DELAY}ms
  • 账号间隔: ${config.retry.ACCOUNT_INTERVAL}ms

- 延迟设置:
  • 命令延迟: ${config.delay.COMMAND}ms
  • 任务延迟: ${config.delay.TASK}ms
  • 战斗延迟: ${config.delay.BATTLE}ms
  `.trim();
};

export default {
  getTimeoutConfig,
  getRetryConfig,
  getDelayConfig,
  getFullConfig,
  getConfigDescription,
};
