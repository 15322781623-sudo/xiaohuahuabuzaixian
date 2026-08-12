/**
 * 伪装 HTTP 头配置
 *
 * 源自 Cloudflare Worker (_worker.js) 的代理伪装方案：
 * 每个目标端点模拟一台特定 Android 设备的微信/浏览器请求，
 * 使后端服务器认为请求来自真实移动客户端，避免被风控拦截。
 *
 * 使用场景：
 * - Tauri / Capacitor(APK) 原生 HTTP 直连（无 Worker 代理，需客户端自行伪装）
 * - Web 浏览器走 /api/* 代理时由 _worker.js 覆盖头，客户端不必重复设置
 */
export interface SpoofedEndpoint {
  /** 代理路径前缀（如 /api/weixin） */
  prefix: string;
  /** 直连目标 URL */
  target: string;
  /** 请求头 */
  headers: Record<string, string>;
}

/**
 * 所有伪装端点配置（与 _worker.js proxies 数组保持同步）
 */
export const SPOOFED_ENDPOINTS: SpoofedEndpoint[] = [
  {
    prefix: "/api/weixin",
    target: "https://open.weixin.qq.com",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://open.weixin.qq.com/",
    },
  },
  {
    prefix: "/api/weixin-long",
    target: "https://long.open.weixin.qq.com",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
      Accept: "*/*",
      Referer: "https://open.weixin.qq.com/",
    },
  },
  {
    prefix: "/api/ucenter",
    target: "https://ucenter-app-server.hortorgames.com",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; 22081212C Build/SKQ1.220303.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/136.0.7103.60 Mobile Safari/537.36",
      Accept: "*/*",
      Host: "ucenter-app-server.hortorgames.com",
      Connection: "keep-alive",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
  {
    prefix: "/api/hortor",
    target: "https://comb-platform.hortorgames.com",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36",
      Accept: "*/*",
      Host: "comb-platform.hortorgames.com",
      Connection: "keep-alive",
      "Content-Type": "text/plain; charset=utf-8",
      Origin: "https://open.weixin.qq.com",
      Referer: "https://open.weixin.qq.com/",
    },
  },
];

/** 按前缀查找伪装端点配置 */
export const getSpoofedEndpoint = (prefix: string): SpoofedEndpoint | undefined =>
  SPOOFED_ENDPOINTS.find((e) => e.prefix === prefix);

/** 获取伪装头（用于原生直连时设置请求头） */
export const getSpoofedHeaders = (prefix: string): Record<string, string> =>
  getSpoofedEndpoint(prefix)?.headers ?? {};

// ─── 便捷常量（向后兼容旧代码的命名） ───

/** 微信 OAuth 伪装头（/api/weixin） */
export const WECHAT_HEADERS = getSpoofedHeaders("/api/weixin");

/** 微信长轮询伪装头（/api/weixin-long） */
export const WECHAT_LONG_HEADERS = getSpoofedHeaders("/api/weixin-long");

/** 游戏用户中心伪装头（/api/ucenter） */
export const UCENTER_HEADERS = getSpoofedHeaders("/api/ucenter");

/** Hortor 平台伪装头（/api/hortor） */
export const HORTOR_HEADERS = getSpoofedHeaders("/api/hortor");
