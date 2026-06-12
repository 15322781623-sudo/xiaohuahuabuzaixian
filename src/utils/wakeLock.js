/**
 * 跨平台防休眠管理器
 * 支持环境: Web浏览器、Tauri桌面应用、Android APK (Capacitor)
 */

// 环境检测
function getEnvironment() {
  if (typeof window === "undefined")
    return "web";

  // Tauri v2 检测方式
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    console.log("[WakeLock] 检测到Tauri环境");
    return "tauri";
  }

  // Capacitor 检测
  if (window.Capacitor) {
    console.log("[WakeLock] 检测到Capacitor环境");
    return "capacitor";
  }

  // 默认Web
  console.log("[WakeLock] 未检测到特殊环境,使用Web模式");
  return "web";
}

// 统一的WakeLock管理器
class WakeLockManager {
  constructor() {
    this.env = getEnvironment();
    this.isActive = false;
    this.wakeLock = null;
    this.keepAwakeInterval = null;
    this.visibilityHandler = null;

    console.log(`WakeLockManager初始化, 当前环境: ${this.env}`);
  }

  /**
   * 请求防休眠
   */
  async request() {
    if (this.isActive) {
      console.log("防休眠已处于激活状态");
      return true;
    }

    try {
      console.log(`请求防休眠, 环境: ${this.env}`);
      switch (this.env) {
        case "web":
          return await this.requestWebWakeLock();
        case "tauri":
          return await this.requestTauriWakeLock();
        case "capacitor":
          return await this.requestCapacitorWakeLock();
        default:
          console.warn("未知环境类型");
          return false;
      }
    } catch (err) {
      console.error("WakeLock请求失败:", err);
      return false;
    }
  }

  /**
   * 释放防休眠
   */
  async release() {
    if (!this.isActive) {
      console.log("防休眠未激活,无需释放");
      return;
    }

    try {
      console.log(`释放防休眠, 环境: ${this.env}`);
      switch (this.env) {
        case "web":
          await this.releaseWebWakeLock();
          break;
        case "tauri":
          await this.releaseTauriWakeLock();
          break;
        case "capacitor":
          await this.releaseCapacitorWakeLock();
          break;
      }
      this.isActive = false;

      // 移除可见性变化监听
      if (this.visibilityHandler && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", this.visibilityHandler);
        this.visibilityHandler = null;
      }
    } catch (err) {
      console.error("WakeLock释放失败:", err);
    }
  }

  /**
   * Web环境 - Screen Wake Lock API
   */
  async requestWebWakeLock() {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      console.warn("[WakeLock] ❌ 当前浏览器不支持WakeLock API");
      console.warn("[WakeLock] 提示: 请使用Chrome/Edge浏览器,并确保是HTTPS或localhost环境");
      return false;
    }

    try {
      console.log("[WakeLock] 请求Web Screen WakeLock...");
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.isActive = true;
      console.log("[WakeLock] ✅ Web WakeLock已成功启用");
      console.log("[WakeLock] 锁状态:", this.wakeLock.released ? "已释放" : "活跃中");

      // 监听WakeLock释放事件
      this.wakeLock.addEventListener("release", () => {
        console.log("[WakeLock] ⚠️ Web WakeLock已被系统释放");
      });

      // 监听页面可见性变化,重新请求WakeLock
      if (typeof document !== "undefined") {
        this.visibilityHandler = async () => {
          if (document.visibilityState === "visible" && this.isActive) {
            try {
              console.log("[WakeLock] 页面变为可见,重新请求WakeLock...");
              this.wakeLock = await navigator.wakeLock.request("screen");
              console.log("[WakeLock] ✅ 重新请求WakeLock成功");
            } catch (err) {
              console.error("[WakeLock] ❌ 重新请求WakeLock失败:", err.message);
            }
          } else if (document.visibilityState === "hidden") {
            console.log("[WakeLock] ⚠️ 页面隐藏,WakeLock可能失效");
          }
        };
        document.addEventListener("visibilitychange", this.visibilityHandler);
      }

      return true;
    } catch (err) {
      console.error("[WakeLock] ❌ Web WakeLock请求失败:", err.message);
      console.error("[WakeLock] 错误名称:", err.name);

      if (err.name === "NotAllowedError") {
        console.error("[WakeLock] 权限被拒绝,请确保:");
        console.error("[WakeLock]   1. 使用HTTPS或localhost");
        console.error("[WakeLock]   2. 用户有交互操作(点击页面)");
      } else if (err.name === "NotSupportedError") {
        console.error("[WakeLock] 浏览器不支持WakeLock API");
      }

      return false;
    }
  }

  async releaseWebWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log("Web WakeLock已释放");
    }
  }

  /**
   * Tauri环境 - 使用定时心跳保持唤醒
   */
  async requestTauriWakeLock() {
    try {
      console.log("[WakeLock] 开始加载Tauri invoke模块...");
      const { invoke } = await import("@tauri-apps/api/core");
      console.log("[WakeLock] Tauri invoke模块加载成功");

      // 尝试调用Tauri原生命令
      try {
        console.log("[WakeLock] 调用 prevent_sleep 命令...");
        await invoke("prevent_sleep");
        console.log("[WakeLock] ✅ Tauri原生防休眠命令已成功启用");
      } catch (e) {
        console.error("[WakeLock] ❌ Tauri原生命令调用失败:", e.message);
        console.warn("[WakeLock] 降级使用心跳方案...");
        // 降级方案: 使用定时心跳保持唤醒
        this.keepAwakeInterval = setInterval(async () => {
          try {
            // 发送一个轻量请求保持系统活跃
            await invoke("prevent_sleep").catch(() => {});
          } catch (e) {
            // 静默处理错误
          }
        }, 30000); // 每30秒执行一次
        console.log("[WakeLock] 心跳方案已启动(每30秒)");
      }

      this.isActive = true;
      console.log("[WakeLock] ✅ Tauri防休眠状态: 已激活");
      return true;
    } catch (err) {
      console.error("[WakeLock] ❌ Tauri WakeLock完全失败:", err.message);
      console.error("[WakeLock] 错误堆栈:", err.stack);
      return false;
    }
  }

  async releaseTauriWakeLock() {
    if (this.keepAwakeInterval) {
      clearInterval(this.keepAwakeInterval);
      this.keepAwakeInterval = null;
      console.log("Tauri防休眠心跳已停止");
    }

    // 尝试调用Tauri释放命令
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("allow_sleep").catch(() => {});
    } catch (e) {
      // 静默处理错误
    }
  }

  /**
   * Android Capacitor环境
   */
  async requestCapacitorWakeLock() {
    try {
      // 动态加载Capacitor KeepAwake插件
      // 使用字符串拼接避免Vite静态分析
      const moduleName = "@capacitor-community/keep-awake";
      let KeepAwake;

      try {
        // 使用Function避免Vite构建时报错
        const module = await new Function(`return import('${moduleName}')`)();
        KeepAwake = module.KeepAwake;
      } catch (importError) {
        console.warn("Capacitor KeepAwake插件未安装,降级使用Web WakeLock API");
        // 降级到Web方案
        return await this.requestWebWakeLock();
      }

      await KeepAwake.keepAwake();
      this.isActive = true;
      console.log("Android KeepAwake已启用");
      return true;
    } catch (err) {
      console.error("Android KeepAwake失败:", err);
      // 再次尝试降级到Web方案
      return await this.requestWebWakeLock();
    }
  }

  async releaseCapacitorWakeLock() {
    try {
      // 动态加载Capacitor KeepAwake插件
      const moduleName = "@capacitor-community/keep-awake";
      let KeepAwake;

      try {
        // 使用Function避免Vite构建时报错
        const module = await new Function(`return import('${moduleName}')`)();
        KeepAwake = module.KeepAwake;
      } catch (importError) {
        // 插件未安装,尝试使用Web方案释放
        await this.releaseWebWakeLock();
        return;
      }

      await KeepAwake.allowSleep();
      console.log("Android KeepAwake已释放");
    } catch (err) {
      console.error("释放Android KeepAwake失败:", err);
      // 尝试使用Web方案释放
      await this.releaseWebWakeLock();
    }
  }

  /**
   * 检查当前环境是否支持防休眠
   */
  isSupported() {
    switch (this.env) {
      case "web":
        return typeof navigator !== "undefined" && "wakeLock" in navigator;
      case "tauri":
        return true; // Tauri始终支持(降级方案)
      case "capacitor":
        // Android环境: 优先检查Capacitor插件,其次检查Web WakeLock API
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
          return true; // Web API可用
        }
        return true; // 假设有Capacitor插件或可以降级
      default:
        return false;
    }
  }

  /**
   * 获取当前环境信息
   */
  getEnvironmentInfo() {
    const envNames = {
      web: "Web浏览器",
      tauri: "Tauri桌面应用",
      capacitor: "Android APK",
    };
    return {
      env: this.env,
      envName: envNames[this.env] || "未知环境",
      supported: this.isSupported(),
    };
  }
}

// 导出单例
export const wakeLockManager = new WakeLockManager();
