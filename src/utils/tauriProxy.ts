import { invoke } from "@tauri-apps/api/core";
import { getName } from "@tauri-apps/api/app";

interface ProxyRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

let isTauriEnv: boolean | null = null;

export async function isRunningInTauri(): Promise<boolean> {
  if (isTauriEnv !== null) {
    return isTauriEnv;
  }

  try {
    // 使用Tauri官方API检测环境
    await getName();
    isTauriEnv = true;
    return true;
  } catch {
    isTauriEnv = false;
    return false;
  }
}

export async function proxyHttpRequest(request: ProxyRequest): Promise<ProxyResponse> {
  return await invoke<ProxyResponse>("proxy_http_request", { request });
}

export async function httpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; responseText: string }> {
  if (await isRunningInTauri()) {
    console.log("[tauriProxy] 使用Tauri代理 GET:", url);
    try {
      const response = await proxyHttpRequest({
        url,
        method: "GET",
        headers,
      });
      return {
        status: response.status,
        responseText: response.body,
      };
    } catch (error) {
      console.error("[tauriProxy] Tauri代理失败，降级到XHR:", error);
      // 降级到XHR
    }
  }

  console.log("[tauriProxy] 使用原生XHR GET:", url);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 15000;
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.onload = () => resolve({ status: xhr.status, responseText: xhr.responseText });
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.ontimeout = () => reject(new Error("请求超时"));
    xhr.send();
  });
}

export async function httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<{ status: number; responseText: string }> {
  if (await isRunningInTauri()) {
    console.log("[tauriProxy] 使用Tauri代理 POST:", url);
    try {
      const response = await proxyHttpRequest({
        url,
        method: "POST",
        headers,
        body,
      });
      return {
        status: response.status,
        responseText: response.body,
      };
    } catch (error) {
      console.error("[tauriProxy] Tauri代理失败，降级到XHR:", error);
      // 降级到XHR
    }
  }

  console.log("[tauriProxy] 使用原生XHR POST:", url);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = 15000;
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.onload = () => resolve({ status: xhr.status, responseText: xhr.responseText });
    xhr.onerror = () => reject(new Error("登录失败"));
    xhr.ontimeout = () => reject(new Error("登录超时"));
    xhr.send(body);
  });
}
