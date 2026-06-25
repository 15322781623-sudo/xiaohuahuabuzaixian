/**
 * WebSocket连接池管理器 - 信号量模式
 * 
 * 核心功能：
 * 1. 限制同时存在的WebSocket连接数量（可配置）
 * 2. 超出限制的Token排队等待
 * 3. 连接释放时自动通知等待队列中的下一个Token
 * 
 * 设计说明：
 * - 本类作为并发控制信号量，不直接管理WebSocket连接的生命周期
 * - WebSocket连接的创建/关闭由调用方（ensureConnection等）负责
 * - 每个acquire必须有对应的release，通常在finally块中完成
 */

export class WebSocketPool {
  constructor(options = {}) {
    // 配置参数
    this.poolSize = options.poolSize || 20
    this.connectionInterval = options.connectionInterval || 0  // 连接间隔时间（ms），0表示不限制

    // 状态
    this.activeCount = 0
    this.isShuttingDown = false
    this.lastConnectionTime = 0

    // 等待队列
    this.waitingQueue = []

    // 统计信息
    this.stats = {
      totalAcquired: 0,
      totalReleased: 0,
      totalWaiting: 0,
      totalFailed: 0,
      maxWaitTime: 0,
      avgWaitTime: 0,
      totalWaitTime: 0
    }
  }

  /**
   * 获取一个可用槽位（信号量 acquire）
   * 如果已达上限则排队等待，直到有槽位释放
   * @param {string} tokenId - Token ID（用于日志追踪）
   * @param {number} timeout - 超时时间（ms），默认60秒
   * @returns {Promise<void>}
   */
  async acquire(tokenId, timeout = 60000) {
    if (this.isShuttingDown) {
      throw new Error('连接池正在关闭，无法获取新连接')
    }

    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const tryAcquire = async () => {
        // 检查是否达到上限
        if (this.activeCount >= this.poolSize) {
          return null // 需要等待
        }

        // 连接间隔控制（避免同时创建太多连接）
        if (this.connectionInterval > 0) {
          const now = Date.now()
          const timeSinceLastConnection = now - this.lastConnectionTime
          if (timeSinceLastConnection < this.connectionInterval) {
            const waitTime = this.connectionInterval - timeSinceLastConnection
            await new Promise(r => setTimeout(r, waitTime))
          }
          this.lastConnectionTime = Date.now()
        }

        this.activeCount++
        this.stats.totalAcquired++

        const waitTime = Date.now() - startTime
        this.stats.totalWaitTime += waitTime
        if (waitTime > this.stats.maxWaitTime) {
          this.stats.maxWaitTime = waitTime
        }
        this.stats.avgWaitTime = this.stats.totalWaitTime / this.stats.totalAcquired

        return true
      }

      // 立即尝试获取
      tryAcquire()
        .then(result => {
          if (result) {
            resolve()
          } else {
            // 达到上限，加入等待队列
            this.waitingQueue.push({
              tokenId,
              resolve,
              reject,
              startTime,
              timeout
            })
            this.stats.totalWaiting++
          }
        })
        .catch(error => {
          this.stats.totalFailed++
          reject(error)
        })
    })
  }

  /**
   * 释放一个槽位（信号量 release）
   * 如果有等待中的任务，自动唤醒下一个
   * @param {string} tokenId - Token ID（用于日志追踪）
   */
  release(tokenId) {
    if (this.activeCount > 0) {
      this.activeCount--
    }
    this.stats.totalReleased++

    // 如果有等待的token，唤醒下一个
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift()

      // 检查超时
      if (Date.now() - waiting.startTime > waiting.timeout) {
        waiting.reject(new Error(`等待连接槽位超时（${waiting.timeout / 1000}秒）`))
        return
      }

      // 尝试唤醒
      this.activeCount++
      this.stats.totalAcquired++

      const waitTime = Date.now() - waiting.startTime
      this.stats.totalWaitTime += waitTime
      if (waitTime > this.stats.maxWaitTime) {
        this.stats.maxWaitTime = waitTime
      }
      this.stats.avgWaitTime = this.stats.totalWaitTime / this.stats.totalAcquired

      waiting.resolve()
    }
  }

  /**
   * 清理连接池，拒绝所有等待中的请求
   */
  async cleanup() {
    this.isShuttingDown = true

    // 拒绝所有等待的任务
    while (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift()
      waiting.reject(new Error('连接池已清理'))
    }

    this.activeCount = 0
    this.isShuttingDown = false
  }

  /**
   * 动态更新连接池大小
   */
  setPoolSize(size) {
    this.poolSize = size
  }

  /**
   * 获取连接池状态
   */
  getStatus() {
    return {
      poolSize: this.poolSize,
      activeConnections: this.activeCount,
      waitingTasks: this.waitingQueue.length,
      stats: {
        ...this.stats,
        maxWaitTime: `${this.stats.maxWaitTime.toFixed(0)}ms`,
        avgWaitTime: `${this.stats.avgWaitTime.toFixed(0)}ms`
      }
    }
  }

  /**
   * 打印连接池状态
   */
  printStatus() {
    const status = this.getStatus()
    console.log(`
[连接池状态]
连接池大小: ${status.poolSize}
活跃连接: ${status.activeConnections}
等待任务: ${status.waitingTasks}
总获取: ${status.stats.totalAcquired} | 总释放: ${status.stats.totalReleased}
总等待: ${status.stats.totalWaiting} | 总失败: ${status.stats.totalFailed}
最大等待: ${status.stats.maxWaitTime} | 平均等待: ${status.stats.avgWaitTime}
`)
  }
}
