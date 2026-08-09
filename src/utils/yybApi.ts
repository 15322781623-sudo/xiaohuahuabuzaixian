/**
 * 应用宝协议服务（yyb-go）API 客户端
 *
 * 对应 yyb_go 项目的 HTTP 接口（默认 http://127.0.0.1:8000）：
 * - POST /qr?as_base64=true        创建扫码会话，返回二维码
 * - GET  /qr/{sid}/poll            轮询扫码状态
 * - POST /qr/{sid}/confirm         确认授权并保存账号
 * - GET  /accounts                 已保存账号列表
 * - POST /accounts/refresh {ref}   刷新账号凭证（静默续期）
 * - POST /wxapp/getCode {ref,app_id} 获取小程序登录 code
 *
 * 响应统一信封：{ code: 0, msg: "success", data: ... }，非 0 为业务错误。
 */
import { isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { hortorLoginWithCode } from "@/utils/hortorLogin";

const isTauri = (() => {
  try {
    return tauriIsTauri();
  } catch {
    return false;
  }
})();

// Tauri 使用原生 HTTP（绕过 CORS）；Web/APK 使用 fetch（APK 由 CapacitorHttp 接管，Web 依赖服务端 CORS）
const requestFetch: typeof window.fetch = isTauri ? tauriFetch : window.fetch.bind(window);

/** 默认服务地址 */
export const YYB_DEFAULT_SERVER = "http://127.0.0.1:8000";
/** Web 生产环境（Pages/worker 无法拉起本地 yyb-go）自动连接的公共代理服务 */
export const YYB_WEB_FALLBACK_SERVER = "https://8000-d4eb5f34f1c67fdd.monkeycode-ai.online";
/** 咸鱼之王 Android APP 微信开放平台 AppID（getCode 默认目标，配对 app-we 通道产出游戏服认可的长凭证） */
export const YYB_DEFAULT_APPID = "wxfb0d5667e5cb1c44";
/** 旧版小游戏 AppID（仅用于 localStorage 迁移识别） */
export const YYB_LEGACY_MINIGAME_APPID = "wx0840558555a454ed";

/** 扫码状态 */
export type YybQrStatus =
  | "pending"      // 等待扫码
  | "scanned"      // 已扫码，待手机确认
  | "authorized"   // 已授权，可 confirm
  | "confirmed"    // 已确认
  | "expired"      // 已过期
  | "cancelled"    // 已取消
  | "unknown";

export interface YybQrCreateResult {
  session_id: string;
  status: YybQrStatus;
  image_url: string;
  image_base64?: string | null;
}

export interface YybQrPollResult {
  status: YybQrStatus;
  errcode?: number | null;
}

export interface YybAccount {
  id: number;
  openid: string;
  uin?: number | null;
  alias?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  status?: string | null;
  last_checked_at?: number | null;
  created_at?: number;
  updated_at?: number;
}

/** 规范化服务地址（去尾部斜杠） */
export const normalizeYybServer = (server: string): string => {
  return (server || "").trim().replace(/\/+$/, "");
};

/**
 * 统一请求封装：解包 {code,msg,data} 信封
 */
const yybRequest = async <T>(
  server: string,
  path: string,
  options: { method?: string; body?: any; timeout?: number } = {},
): Promise<T> => {
  const base = normalizeYybServer(server);
  if (!base) {
    throw new Error("应用宝服务地址未配置");
  }
  const url = base + path;
  const method = options.method || "GET";
  const timeout = options.timeout || 20000;

  const headers: Record<string, string> = { Accept: "application/json" };
  let body: any;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: any;
  if (isTauri) {
    // Tauri 原生 HTTP（无超时参数，由 Promise.race 控制）
    response = await Promise.race([
      requestFetch(url, { method, headers, body }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("请求应用宝服务超时")), timeout)),
    ]);
  } else {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      response = await requestFetch(url, { method, headers, body, signal: controller.signal });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error("请求应用宝服务超时");
      }
      throw new Error("无法连接应用宝服务：" + (e?.message || "网络错误"));
    } finally {
      clearTimeout(timer);
    }
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.msg) msg = errJson.msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const json = await response.json();
  if (json && typeof json.code === "number" && json.code !== 0) {
    throw new Error(json.msg || `服务返回错误码 ${json.code}`);
  }
  return json?.data as T;
};

/** 健康检查 */
export const yybHealth = async (server: string): Promise<boolean> => {
  try {
    const data = await yybRequest<{ ok: boolean }>(server, "/health", { timeout: 5000 });
    return !!data?.ok;
  } catch {
    return false;
  }
};

/** 远程停机：让服务自行优雅退出（Web/APK 无法杀外部进程，依赖此接口） */
export const yybShutdown = async (server: string): Promise<boolean> => {
  try {
    const data = await yybRequest<{ ok: boolean }>(server, "/shutdown", { method: "POST", timeout: 5000 });
    return !!data?.ok;
  } catch {
    return false;
  }
};

/** 创建扫码会话（as_base64=true 直接返回二维码 data URI） */
export const yybCreateQr = async (server: string): Promise<YybQrCreateResult> => {
  // 服务端生成二维码约需数秒，放宽超时
  return yybRequest<YybQrCreateResult>(server, "/qr?as_base64=true", { method: "POST", timeout: 60000 });
};

/** 轮询扫码状态 */
export const yybPollQr = async (server: string, sessionId: string): Promise<YybQrPollResult> => {
  return yybRequest<YybQrPollResult>(server, `/qr/${sessionId}/poll`, { timeout: 30000 });
};

/** 确认已授权的会话，保存账号 */
export const yybConfirmQr = async (server: string, sessionId: string): Promise<YybAccount> => {
  // confirm 内部会抓取 login_buffer 与用户资料，耗时较长
  return yybRequest<YybAccount>(server, `/qr/${sessionId}/confirm`, { method: "POST", timeout: 60000 });
};

/** 已保存账号列表 */
export const yybListAccounts = async (server: string): Promise<YybAccount[]> => {
  const data = await yybRequest<YybAccount[]>(server, "/accounts", { timeout: 15000 });
  return Array.isArray(data) ? data : [];
};

/** 刷新账号凭证（触发应用宝 MSDK 静默续期） */
export const yybRefreshAccount = async (server: string, ref: string): Promise<any> => {
  return yybRequest<any>(server, "/accounts/refresh", { method: "POST", body: { ref }, timeout: 60000 });
};

/** 获取小程序登录 code（内部会自动续期过期凭证） */
export const yybGetCode = async (server: string, ref: string, appId: string): Promise<string> => {
  const data = await yybRequest<{ openid: string; result: { code?: string; errMsg?: string } }>(
    server,
    "/wxapp/getCode",
    { method: "POST", body: { ref, app_id: appId }, timeout: 60000 },
  );
  const code = data?.result?.code;
  // 控制台展示 getCode 返回数据，便于排查链路
  console.log("[yyb getCode] 完整响应:", JSON.stringify(data));
  console.log("[yyb getCode] code =", code || "(未获取到)", "长度 =", code ? code.length : 0);
  if (!code) {
    throw new Error("getCode 未返回 code：" + (data?.result?.errMsg || "未知原因"));
  }
  return code;
};

/**
 * 应用宝账号一键换取游戏 bin 数据：
 * getCode 获取登录 code → hortor 登录 → 游戏加密模块生成 bin
 */
export const yybLoginForBin = async (server: string, ref: string, appId: string): Promise<Uint8Array> => {
  const code = await yybGetCode(server, ref, appId);
  // 应用宝 getCode 以 Android APP 的微信开放平台 appid 取码，必须走 app-we 通道，
  // 游戏服务器只认可该通道的长凭证 combUser（mini-we 短凭证会被 -10001 拒绝）
  return hortorLoginWithCode(code, "app-we");
};
