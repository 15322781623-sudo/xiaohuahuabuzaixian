/**
 * 跨平台存储工具
 * 自动适配浏览器(localStorage)、Tauri(exe)和Capacitor(APK)环境
 */

// 检测运行环境
const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

const isCapacitor = () => {
  return typeof window !== "undefined" && "Capacitor" in window;
};

const isBrowser = () => {
  return !isTauri() && !isCapacitor();
};

/**
 * 统一存储接口
 */
class CrossPlatformStorage {
  /**
   * 保存数据
   * @param {string} key - 存储键名
   * @param {any} value - 存储的值
   */
  async set(key, value) {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);

      if (isTauri()) {
        // Tauri环境:使用localStorage(Tauri支持localStorage)
        localStorage.setItem(key, data);
      } else if (isCapacitor()) {
        // Capacitor环境:使用localStorage(Capacitor也支持)
        localStorage.setItem(key, data);
      } else {
        // 浏览器环境
        localStorage.setItem(key, data);
      }

      return true;
    } catch (error) {
      console.error(`[Storage] Failed to set ${key}:`, error);
      return false;
    }
  }

  /**
   * 获取数据
   * @param {string} key - 存储键名
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值
   */
  async get(key, defaultValue = null) {
    try {
      let data;

      if (isTauri()) {
        data = localStorage.getItem(key);
      } else if (isCapacitor()) {
        data = localStorage.getItem(key);
      } else {
        data = localStorage.getItem(key);
      }

      if (data === null || data === undefined) {
        return defaultValue;
      }

      // 尝试解析JSON
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error(`[Storage] Failed to get ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 删除数据
   * @param {string} key - 存储键名
   */
  async remove(key) {
    try {
      if (isTauri()) {
        localStorage.removeItem(key);
      } else if (isCapacitor()) {
        localStorage.removeItem(key);
      } else {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error(`[Storage] Failed to remove ${key}:`, error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  async clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("[Storage] Failed to clear:", error);
      return false;
    }
  }

  /**
   * 获取环境信息
   */
  getEnvironment() {
    if (isTauri())
      return "tauri";
    if (isCapacitor())
      return "capacitor";
    return "browser";
  }
}

// 导出单例
export const storage = new CrossPlatformStorage();

// 导出便捷方法
export const setStorage = (key, value) => storage.set(key, value);
export const getStorage = (key, defaultValue) => storage.get(key, defaultValue);
export const removeStorage = (key) => storage.remove(key);
