/**
 * Hortor 登录工具（code -> combUser -> bin）
 *
 * 从 wxqrcode.vue 中提取的可复用逻辑：
 * 1. 使用 encodePayload 加密登录 JSON
 * 2. POST 到 comb-platform.hortorgames.com 换取 combUser
 * 3. 通过游戏加密模块 __require("13") 生成 bin 数据
 *
 * 供应用宝扫码（yybqrcode.vue）等新的导入方式复用。
 */
import { isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Capacitor } from "@capacitor/core";
import { HORTOR_HEADERS as SPOOFED_HORTOR_HEADERS } from "@/utils/spoofedHeaders";

// 检测运行环境
const isTauri = (() => {
  try {
    return tauriIsTauri();
  } catch {
    return false;
  }
})();

const isCapacitor = Capacitor.isNativePlatform();

// Tauri / APK 直连（原生 HTTP，无 CORS 限制），Web 走 /api/hortor 代理
const useDirectRequest = isTauri || isCapacitor;

const requestFetch: typeof window.fetch = isTauri ? tauriFetch : window.fetch.bind(window);

// hortor 直连伪装头（与 _worker.js /api/hortor 保持一致）
const HORTOR_HEADERS = SPOOFED_HORTOR_HEADERS;

/**
 * 将登录JSON文本编码成最终payload
 */
const encodePayload = (text: string): string | null => {
  // 注意：这个超长字符串必须和原脚本里的一模一样！
  const cipherTable =
    "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";

  const xorShift = 1;
  const shuffleTimes = 6;
  const step = 3;

  const mid = codeBase64(text, cipherTable, shuffleTimes, step, xorShift);
  const final = mid ? encodeBase64(mid) : null;
  return final;
};

const codeBase64 = (text: string, cipherTable: string, shuffleTimes: number, step: number, xorShift: number): string | null => {
  const base64Text = encodeBase64(text);
  if (cipherTable) {
    const shuffled = transCode(cipherTable, shuffleTimes);
    const key = getCodeKey(shuffled, step);
    return dealWithString(base64Text, key, xorShift);
  }
  return null;
};

const encodeBase64 = (text: string): string | null => {
  if (!text) return null;
  return btoa(unescape(encodeURIComponent(text)));
};

const transCode = (str: string, times: number): string | null => {
  if (times <= 0) return str;
  if (str.length % 2 !== 0) return null;

  const right = rightSide(str);
  const left = leftSide(str);
  if (!right || !left) return null;
  const transRight = transCode(right, times - 1);
  const transLeft = transCode(left, times - 1);
  if (!transRight || !transLeft) return null;
  return transRight + transLeft;
};

const rightSide = (str: string): string | null => {
  if (str.length % 2 !== 0) return null;
  return str.substring(Math.floor(str.length / 2));
};

const leftSide = (str: string): string | null => {
  if (str.length % 2 !== 0) return null;
  return str.substring(0, Math.floor(str.length / 2));
};

const getCodeKey = (str: string | null, step: number): string => {
  if (!str) return "";
  const chars = str.split("");
  const result = [];
  const count = Math.floor(str.length / step);
  for (let i = 0; i < count; i++) {
    result.push(chars[i * step]);
  }
  return result.join("");
};

const dealWithString = (src: string | null, key: string, shift: number): string | null => {
  if (!src || !key) return null;

  const v = src.split("");
  const w = key.split("");
  const out = new Array(v.length);

  let idx = w.length >> shift;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    const vChar = v[i];
    const wChar = w[idx];
    if (vChar && wChar) {
      out[i] = String.fromCharCode(vChar.charCodeAt(0) ^ wChar.charCodeAt(0));
    }
    idx++;
  }
  return out.join("");
};

/**
 * 登录通道类型：
 * - app-we：微信开放平台 OAuth code（扫码登录，gameId xyzwapp）
 * - mini-we：小程序 wx.login code（应用宝免扫码登录，gameId xyzwprod）
 */
export type HortorLoginType = "app-we" | "mini-we";

/**
 * 请求Hortor登录接口（微信code -> combUser），并用游戏加密模块生成bin
 * @param code 微信登录 code（扫码授权或 wx.login 获取）
 * @param loginType 登录通道，默认 app-we；应用宝账号必须传 mini-we
 * @returns bin 二进制数据（Uint8Array）
 */
export const hortorLoginWithCode = async (
  code: string,
  loginType: HortorLoginType = "app-we",
): Promise<Uint8Array> => {
  const isMini = loginType === "mini-we";

  // mini-we（微信小游戏）与 app-we（APP 微信登录）的报文参数完全不同：
  // mini-we 必须用 gameId=xyzwprod/gameTp=minigame/channel=hortor，
  // 且 body 必须携带 version 字段，否则 hortor 重定向校验报「参数错误」
  const payload = isMini
    ? {
        gameId: "xyzwprod",
        code,
        gameTp: "minigame",
        version: "1.91.1-wx",
        sysInfo:
          '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
        channel: "hortor",
        appFrom: "com.tencent.mm",
        noLogin: "2",
        distinctId: "DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6",
        state: "hortor",
        packageName: "com.hortor.games.xyzw",
        tp: "mini-we",
        signPrint: "E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13",
      }
    : {
        gameId: "xyzwapp",
        code,
        gameTp: "app",
        sysInfo:
          '{"system":"Android","hortorSDKVersion":"4.0.6-cn","model":"22081212C","brand":"Redmi"}',
        channel: "android",
        appFrom: "com.tencent.mm",
        noLogin: "2",
        distinctId: "DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6",
        state: "hortor",
        packageName: "com.hortor.games.xyzw",
        tp: "app-we",
        signPrint: "E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13",
      };

  const rawJson = JSON.stringify(payload);
  const encoded = encodePayload(rawJson);

  if (!encoded) {
    throw new Error("编码失败，无法生成登录请求");
  }

  const loginPath = isMini
    ? "/comb-login-server/api/v1/login" +
      "?gameId=xyzwprod&gameTp=minigame&system=android" +
      "&version=1.91.1-wx&deviceUniqueId=ck42mn8i&loginTag=code&cryptVersion=1.1.0"
    : "/comb-login-server/api/v1/login" +
      "?gameId=xyzwapp" +
      "&timestamp=" +
      Date.now() +
      "&version=android-4.2.1-cn-release" +
      "&cryptVersion=1.1.0" +
      "&gameTp=app&system=android" +
      "&deviceUniqueId=DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026" +
      "&packageName=com.hortorgames.xyzw";

  const directLoginUrl = "https://comb-platform.hortorgames.com" + loginPath;
  const loginUrl = useDirectRequest
    ? directLoginUrl
    : "/api/hortor" + loginPath;

  let json: any;
  if (useDirectRequest) {
    // Tauri / Capacitor(APK)：原生 HTTP 直连
    const response = await requestFetch(loginUrl, {
      method: "POST",
      headers: HORTOR_HEADERS,
      body: encoded,
    });

    if (!response.ok) {
      throw new Error("HTTP 状态码：" + response.status);
    }

    json = await response.json();
  } else {
    // Web 浏览器：通过 /api/hortor 代理
    const res = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", loginUrl, true);
      xhr.timeout = 15000;
      xhr.setRequestHeader("Accept", "*/*");
      xhr.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
      xhr.onload = () => resolve(xhr);
      xhr.onerror = () => reject(new Error("登录失败"));
      xhr.ontimeout = () => reject(new Error("登录超时"));
      xhr.send(encoded);
    });

    if (res.status !== 200) {
      throw new Error("HTTP 状态码：" + res.status);
    }

    json = JSON.parse(res.responseText);
  }

  if (json.meta?.errCode !== 0) {
    throw new Error("登录失败：" + (json.meta?.errMsg || "未知错误"));
  }

  const combUser = json.data?.combUser;
  if (!combUser) {
    throw new Error("登录响应结构异常");
  }

  const dm = (window as any).__require?.("13");
  if (!dm?.encMsg || !dm?.lz4XorEncode) {
    throw new Error("游戏加密模块未加载，不能生成bin");
  }

  const encryptedBuffer = dm.encMsg(
    {
      platform: "hortor",
      platformExt: "mix",
      info: combUser,
      serverId: null,
      scene: 0,
      referrerInfo: "",
    },
    { decrypt: dm.lz4XorDecode, encrypt: dm.lz4XorEncode },
  );

  return new Uint8Array(encryptedBuffer);
};
