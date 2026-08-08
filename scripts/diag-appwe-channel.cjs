/**
 * 诊断：应用宝 code 走 Android APP 通道（app-we）能否拿到角色
 * 链路：yyb-go getCode(app_id=wxfb0d5667e5cb1c44)
 *      → comb-login(gameId=xyzwapp/gameTp=app/tp=app-we)
 *      → BON+lx 加密 serverlist → 角色列表
 * 对照：参考项目 yyb_loging_fenxi 的 index.html 参数
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const YYB = "http://127.0.0.1:8000";
const APP_APPID = "wxfb0d5667e5cb1c44"; // 参考项目使用的 Android APP 微信开放平台 AppID

function req(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const r = mod.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers: opts.headers || {} },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      },
    );
    r.on("error", reject);
    r.setTimeout(30000, () => { r.destroy(); reject(new Error("timeout")); });
    if (opts.body) r.write(opts.body);
    r.end();
  });
}
const jreq = async (url, opts) => {
  const r = await req(url, opts);
  return { status: r.status, json: JSON.parse(r.body.toString("utf-8")), raw: r.body };
};

// ---------- encodePayload（与 src/utils/hortorLogin.ts 完全一致） ----------
function loadCipherTable() {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "hortorLogin.ts"), "utf-8");
  const m = src.match(/const cipherTable\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("cipherTable 提取失败");
  return m[1];
}
const CIPHER = loadCipherTable();
const b64utf8 = (s) => Buffer.from(s, "utf-8").toString("base64");
const b64bin = (s) => Buffer.from(s, "binary").toString("base64");
function transCode(str, times) {
  if (times <= 0) return str;
  if (str.length % 2 !== 0) return null;
  const right = str.substring(Math.floor(str.length / 2));
  const left = str.substring(0, Math.floor(str.length / 2));
  const tr = transCode(right, times - 1);
  const tl = transCode(left, times - 1);
  if (!tr || !tl) return null;
  return tr + tl;
}
function encodePayload(text) {
  const base64Text = b64utf8(text);
  const shuffled = transCode(CIPHER, 6);
  const chars = shuffled.split("");
  const key = chars.slice(0, Math.floor(shuffled.length / 3) * 3).filter((_, i) => i % 3 === 0).join("");
  const v = base64Text.split("");
  const w = key.split("");
  const out = new Array(v.length);
  let idx = w.length >> 1;
  for (let i = 0; i < v.length; i++) {
    if (idx >= w.length) idx = 0;
    out[i] = String.fromCharCode(v[i].charCodeAt(0) ^ w[idx].charCodeAt(0));
    idx++;
  }
  return b64bin(out.join(""));
}

// ---------- BON/lx 模块（参考项目 bon-crypto-full.js） ----------
function loadBon() {
  const src = fs.readFileSync(path.join(__dirname, "..", "yyb_loging_fenxi - 副本", "bon-crypto-full.js"), "utf-8");
  const factory = new Function(src + "\n;return { at, Mt };");
  return factory();
}

(async () => {
  // [1] 账号
  const acc = await jreq(YYB + "/accounts");
  const ref = acc.json?.data?.[0]?.openid;
  console.log("[1] 账号 ref =", ref, "昵称 =", acc.json?.data?.[0]?.nickname);
  if (!ref) throw new Error("无已保存账号，先扫码");

  // [2] getCode：Android APP appid
  const codeRes = await jreq(YYB + "/wxapp/getCode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref, app_id: APP_APPID }),
  });
  const code = codeRes.json?.data?.result?.code;
  console.log("[2] getCode app_id=" + APP_APPID, "→ code =", code ? code.slice(0, 12) + "...(" + code.length + ")" : "失败 " + JSON.stringify(codeRes.json).slice(0, 200));
  if (!code) throw new Error("getCode 失败");

  // [3] comb-login：app-we 通道（参考项目参数）
  const payload = {
    gameId: "xyzwapp", code, gameTp: "app",
    sysInfo: JSON.stringify({ system: "Android", hortorSDKVersion: "4.0.6-cn", model: "22081212C", brand: "Redmi" }),
    channel: "android", appFrom: "com.tencent.mm", noLogin: "2",
    distinctId: "DID-a38175b7-14ce-4b36-aa89-3e092ea03ea6", state: "hortor",
    packageName: "com.hortor.games.xyzw", tp: "app-we",
    signPrint: "E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13",
  };
  const params = new URLSearchParams({
    gameId: "xyzwapp", timestamp: Date.now().toString(),
    version: "android-4.2.1-cn-release", cryptVersion: "1.1.0",
    gameTp: "app", system: "android",
    deviceUniqueId: "DID-0e782e88-2f3b-4f5b-9020-47f5e5a5a026",
    packageName: "com.hortor.games.xyzw",
  });
  const loginRes = await req("https://comb-platform.hortorgames.com/comb-login-server/api/v1/login?" + params, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8", "User-Agent": "Mozilla/5.0" },
    body: encodePayload(JSON.stringify(payload)),
  });
  const loginJson = JSON.parse(loginRes.body.toString("utf-8"));
  console.log("[3] comb-login errCode =", loginJson?.meta?.errCode, loginJson?.meta?.errMsg || "");
  const combUser = loginJson?.data?.combUser;
  if (!combUser) throw new Error("comb-login 无 combUser: " + loginRes.body.toString().slice(0, 300));
  console.log("    combUser.encryptCombUser 长度 =", (combUser.encryptCombUser || "").length);

  // [4] serverlist：BON + lx
  const { at } = loadBon();
  const platformData = { platform: "hortor", platformExt: "mix", info: combUser, serverId: null, scene: 0, referrerInfo: "" };
  const bin = at.encode(platformData, "lx");
  const slRes = await req("https://xxz-xyzw.hortorgames.com/login/serverlist?_seq=3", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "User-Agent": "Mozilla/5.0" },
    body: Buffer.from(bin),
  });
  console.log("[4] serverlist status =", slRes.status, "byteLength =", slRes.body.length);
  try {
    const parsed = at.parse(new Uint8Array(slRes.body));
    const data = parsed.getData();
    const roles = Object.values(data?.roles || {}).filter((r) => r && typeof r === "object" && r.roleId);
    if (roles.length) {
      console.log("    ✅ 角色数 =", roles.length);
      roles.slice(0, 5).forEach((r) => console.log("      -", r.roleName || r.name, "| lv", r.level, "| 战力", r.power, "| serverId", r.serverId));
    } else {
      console.log("    ❌ 无角色，data keys =", Object.keys(data || {}), "code =", parsed.code, "error =", parsed.error);
      console.log("    raw:", JSON.stringify(data).slice(0, 400));
    }
  } catch (e) {
    console.log("    ❌ 解析失败:", e.message, "raw head:", slRes.body.slice(0, 120).toString("hex"));
  }
})().catch((e) => { console.error("[FATAL]", e.message); process.exit(1); });
