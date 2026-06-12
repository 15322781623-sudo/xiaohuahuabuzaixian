import axios from "axios";
import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { enc, lib, MD5 } from "crypto-js";
import { g_utils } from "@/utils/bonProtocol";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

const isCapacitorApp = () => Capacitor.isNativePlatform();

export const getTokenId = (token: string | ArrayBuffer | Uint8Array) => {
  const binHash = MD5(lib.WordArray.create(token)).toString(enc.Hex);
  return binHash;
};

const isTauriApp = () => {
  try {
    return isTauri();
  } catch {
    return false;
  }
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const postArrayBuffer = async (
  url: string,
  arrayBuffer: ArrayBuffer,
  seq: number,
) => {
  if (isTauriApp()) {
    const response = await tauriFetch(`${url}?_seq=${seq}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: arrayBuffer,
      connectTimeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  if (isCapacitorApp()) {
    const base64Data = arrayBufferToBase64(arrayBuffer);
    console.log("CapacitorHttp POST, base64 length:", base64Data.length);

    const response = await CapacitorHttp.post({
      url: `${url}?_seq=${seq}`,
      headers: {
        "Content-Type": "application/octet-stream",
      },
      data: base64Data,
      dataType: 'file',
      responseType: 'arraybuffer',
      connectTimeout: 15000,
      readTimeout: 15000,
    });

    console.log("CapacitorHttp response status:", response.status, "data type:", typeof response.data);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (typeof response.data === 'string') {
      console.log("CapacitorHttp response is base64 string, length:", response.data.length);
      return base64ToArrayBuffer(response.data);
    }

    return response.data as ArrayBuffer;
  }

  const res = await axios.post(url, arrayBuffer, {
    params: {
      _seq: seq,
    },
    headers: {
      "Content-Type": "application/octet-stream",
      "referrerPolicy": "no-referrer",
    },
    responseType: "arraybuffer",
  });

  return res.data;
};

export const transformToken = async (arrayBuffer: ArrayBuffer) => {
  const responseData = await postArrayBuffer(
    "https://xxz-xyzw.hortorgames.com/login/authuser",
    arrayBuffer,
    1,
  );

  console.log("transformToken response type:", responseData?.constructor?.name, "byteLength:", (responseData as any)?.byteLength);

  if (!responseData || (responseData as ArrayBuffer).byteLength === 0) {
    throw new Error("authuser: empty response");
  }

  const msg = g_utils.parse(responseData);
  const data = msg.getData();
  console.log("transformToken data:", data);


  const currentTime = Date.now();
  const sessId = currentTime * 100 + Math.floor(Math.random() * 100);
  const connId = currentTime + Math.floor(Math.random() * 10);

  return JSON.stringify({
    ...data,
    sessId,
    connId,
    isRestore: 0,
  });
};

export const getServerList = async (arrayBuffer: ArrayBuffer) => {
  const responseData = await postArrayBuffer(
    "https://xxz-xyzw.hortorgames.com/login/serverlist",
    arrayBuffer,
    3,
  );

  console.log("serverlist response type:", responseData?.constructor?.name, "byteLength:", (responseData as any)?.byteLength);

  if (!responseData || (responseData as ArrayBuffer).byteLength === 0) {
    console.error("serverlist: empty response");
    return JSON.stringify({});
  }

  const msg = g_utils.parse(responseData);
  const data = msg.getData();
  console.log("serverlist data keys:", data ? Object.keys(data) : "null");
  console.log("serverlist data JSON:", JSON.stringify(data));

  if (!data || !data.roles) {
    console.error("serverlist: invalid data structure", { data });
    return JSON.stringify({});
  }

  return JSON.stringify({
    ...data.roles,
  });
};
