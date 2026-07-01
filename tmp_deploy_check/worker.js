var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var GITHUB_REPO = "15322781623-sudo/xiaohuahuabuzaixian";
var GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
var GITHUB_PROXY_LIST = [
  "https://ghfast.top/",
  "https://gh-proxy.com/",
  "https://mirror.ghproxy.com/"
];
var FALLBACK_CONFIG = {
  latestVersion: "2.13.0",
  versionCode: 21300,
  // R2 直连下载（最快最稳）
  downloadUrl: `https://xyzw-apk-updater.15322781623.workers.dev/api/apk/download`,
  // GitHub 原始链接作为备选
  downloadUrlOriginal: `https://github.com/${GITHUB_REPO}/releases/latest/download/\u809D\u738B\u4E4B\u738B.apk`,
  changelog: "v2.13.0: \u5361\u5BC6\u7BA1\u7406\u7CFB\u7EDF\u4E0A\u7EBF\uFF0C\u6279\u91CF\u63A8\u56FE\u6BCF\u5C0F\u65F6\u81EA\u52A8\u5237\u65B0\u72B6\u6001",
  minVersionCode: 21200,
  forceUpdate: true
};
function generateCardKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join("-");
}
__name(generateCardKey, "generateCardKey");
async function getCard(kv, cardKey) {
  if (!kv) return null;
  try {
    const raw = await kv.get(`card:${cardKey}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("[\u5361\u5BC6] \u8BFB\u53D6\u5931\u8D25:", e.message);
    return null;
  }
}
__name(getCard, "getCard");
async function saveCard(kv, cardKey, data) {
  if (!kv) throw new Error("CARD_KV \u672A\u7ED1\u5B9A");
  await kv.put(`card:${cardKey}`, JSON.stringify(data));
}
__name(saveCard, "saveCard");
function verifyAdminPassword(password, env) {
  const adminPassword = env.CARD_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("[\u5361\u5BC6] \u672A\u914D\u7F6E CARD_ADMIN_PASSWORD");
    return false;
  }
  return password === adminPassword;
}
__name(verifyAdminPassword, "verifyAdminPassword");
async function verifyDeviceActivated(kv, cardKey, deviceId) {
  if (!cardKey || !deviceId) return false;
  const card = await getCard(kv, cardKey);
  if (!card || card.status !== "activated") return false;
  return card.deviceId === deviceId;
}
__name(verifyDeviceActivated, "verifyDeviceActivated");
var _cachedVersionInfo = null;
var _cacheTime = 0;
var CACHE_TTL = 5 * 60 * 1e3;
async function getVersionFromR2(env) {
  if (!env.APK_BUCKET) return null;
  try {
    const obj = await env.APK_BUCKET.get("version.json");
    if (!obj) return null;
    const data = await obj.json();
    console.log("[\u7248\u672C] R2 \u8FD4\u56DE:", data.latestVersion);
    return {
      ...data,
      downloadUrl: data.downloadUrl || FALLBACK_CONFIG.downloadUrl,
      downloadUrlOriginal: data.downloadUrlOriginal || FALLBACK_CONFIG.downloadUrlOriginal,
      source: "r2"
    };
  } catch (e) {
    console.error("[\u7248\u672C] R2 \u8BFB\u53D6\u5931\u8D25:", e.message);
    return null;
  }
}
__name(getVersionFromR2, "getVersionFromR2");
async function getVersionFromGitHub(env) {
  try {
    const headers = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "xyzw-apk-updater-worker"
    };
    if (env?.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${env.GITHUB_TOKEN}`;
    }
    const resp = await fetch(GITHUB_API, { headers });
    if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`);
    const release = await resp.json();
    const tagName = release.tag_name || "";
    const versionName = tagName.replace(/^v/, "");
    const parts = versionName.split(".").map(Number);
    const versionCode = (parts[0] || 0) * 1e4 + (parts[1] || 0) * 100 + (parts[2] || 0);
    const apkAsset = release.assets?.find((a) => a.name.endsWith(".apk"));
    const downloadUrl = apkAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/download/${tagName}/\u809D\u738B\u4E4B\u738B.apk`;
    let changelog = release.body || "";
    changelog = changelog.replace(/^##\s+.*\n?/, "").trim() || versionName;
    console.log("[\u7248\u672C] GitHub \u8FD4\u56DE:", versionName);
    return {
      latestVersion: versionName,
      versionCode,
      downloadUrl: GITHUB_PROXY_LIST[0] + downloadUrl,
      downloadUrlOriginal: downloadUrl,
      changelog,
      minVersionCode: FALLBACK_CONFIG.minVersionCode,
      forceUpdate: FALLBACK_CONFIG.forceUpdate,
      source: "github",
      publishedAt: release.published_at
    };
  } catch (e) {
    console.error("[\u7248\u672C] GitHub API \u5931\u8D25:", e.message);
    return null;
  }
}
__name(getVersionFromGitHub, "getVersionFromGitHub");
async function getVersionInfo(env) {
  if (_cachedVersionInfo && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedVersionInfo;
  }
  let info = await getVersionFromR2(env);
  if (!info) {
    info = await getVersionFromGitHub(env);
  }
  if (!info) {
    info = { ...FALLBACK_CONFIG, source: "fallback" };
    console.log("[\u7248\u672C] \u4F7F\u7528\u515C\u5E95\u914D\u7F6E:", info.latestVersion);
  }
  _cachedVersionInfo = info;
  _cacheTime = Date.now();
  return info;
}
__name(getVersionInfo, "getVersionInfo");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, X-Admin-Password, X-Device-Id, X-Card-Key"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/api/apk/version") {
      const versionInfo = await getVersionInfo(env);
      return new Response(JSON.stringify({
        ...versionInfo,
        checkTime: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/apk/latest") {
      const versionInfo = await getVersionInfo(env);
      const originalUrl = versionInfo.downloadUrlOriginal || versionInfo.downloadUrl;
      const downloadSources = [];
      downloadSources.push({
        url: `${url.origin}/api/apk/download`,
        name: "Cloudflare R2",
        priority: 1
      });
      GITHUB_PROXY_LIST.forEach((proxy2, i) => {
        downloadSources.push({
          url: proxy2 + originalUrl,
          name: proxy2.replace("https://", "").replace("/", ""),
          priority: i + 2
        });
      });
      downloadSources.push({
        url: originalUrl,
        name: "GitHub \u76F4\u8FDE",
        priority: 99
      });
      return new Response(JSON.stringify({
        // 首选下载链接（R2）
        downloadUrl: `${url.origin}/api/apk/download`,
        // 原始 GitHub 链接
        originalUrl,
        // Worker 代理链接（兼容旧版）
        workerProxyUrl: `${url.origin}/api/apk/download`,
        // 所有下载源（供客户端测速选择）
        proxyUrls: downloadSources,
        // R2 可用标记
        r2Available: !!env.APK_BUCKET,
        version: versionInfo.latestVersion,
        versionCode: versionInfo.versionCode
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/apk/download" || url.pathname.startsWith("/download/")) {
      const versionInfo = await getVersionInfo(env);
      try {
        if (env.APK_BUCKET) {
          const apkFile = await env.APK_BUCKET.get(`\u809D\u738B\u4E4B\u738B_${versionInfo.latestVersion}.apk`);
          if (apkFile) {
            const headers2 = new Headers(corsHeaders);
            headers2.set("Content-Type", "application/vnd.android.package-archive");
            headers2.set("Content-Disposition", `attachment; filename="\u809D\u738B\u4E4B\u738B_${versionInfo.latestVersion}.apk"`);
            headers2.set("Accept-Ranges", "bytes");
            headers2.set("Cache-Control", "public, max-age=3600");
            headers2.set("CDN-Cache-Control", "public, max-age=86400");
            return new Response(apkFile.body, { headers: headers2 });
          }
        }
        const downloadUrl = versionInfo.downloadUrl || versionInfo.downloadUrlOriginal;
        console.log("[APK\u4E0B\u8F7D] \u4F7F\u7528\u94FE\u63A5:", downloadUrl);
        const githubHeaders = {
          "Accept": "application/octet-stream",
          "User-Agent": "xyzw-apk-updater-worker"
        };
        if (downloadUrl.includes("github.com") && env?.GITHUB_TOKEN) {
          githubHeaders["Authorization"] = `token ${env.GITHUB_TOKEN}`;
        }
        const githubResp = await fetch(downloadUrl, {
          headers: githubHeaders,
          redirect: "follow"
        });
        if (!githubResp.ok) {
          throw new Error(`GitHub download returned ${githubResp.status}`);
        }
        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", "application/vnd.android.package-archive");
        headers.set("Content-Disposition", `attachment; filename="\u809D\u738B\u4E4B\u738B-${versionInfo.latestVersion}.apk"`);
        headers.set("Content-Length", githubResp.headers.get("Content-Length") || "");
        return new Response(githubResp.body, {
          status: 200,
          headers
        });
      } catch (e) {
        console.error("APK \u4E0B\u8F7D\u4EE3\u7406\u5931\u8D25:", e.message);
        return new Response(JSON.stringify({
          error: "APK\u4E0B\u8F7D\u5931\u8D25: " + e.message,
          version: versionInfo.latestVersion
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    const cardKv = env.CARD_KV;
    const cardJson = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }), "cardJson");
    if (url.pathname === "/api/card/check" && request.method === "POST") {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || "").toUpperCase().trim();
        if (!normalizedKey || !deviceId) {
          return cardJson({ success: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" }, 400);
        }
        const card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: "\u5361\u5BC6\u4E0D\u5B58\u5728" }, 404);
        }
        if (card.status !== "activated") {
          return cardJson({ success: false, error: "\u5361\u5BC6\u672A\u6FC0\u6D3B" }, 400);
        }
        if (card.deviceId !== deviceId) {
          return cardJson({ success: false, error: "\u8BBE\u5907\u4E0D\u5339\u914D" }, 403);
        }
        return cardJson({ success: true, cardKey: normalizedKey, activatedAt: card.activatedAt });
      } catch (e) {
        console.error("[\u5361\u5BC6/check] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/verify" && request.method === "POST") {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || "").toUpperCase().trim();
        if (!normalizedKey || !deviceId) {
          return cardJson({ success: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" }, 400);
        }
        let card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: "\u5361\u5BC6\u4E0D\u5B58\u5728" }, 404);
        }
        if (card.status === "activated") {
          if (card.deviceId === deviceId) {
            return cardJson({ success: true, message: "\u5361\u5BC6\u5DF2\u6FC0\u6D3B\uFF08\u5F53\u524D\u8BBE\u5907\uFF09", activatedAt: card.activatedAt });
          }
          return cardJson({ success: false, error: "\u5361\u5BC6\u5DF2\u7ED1\u5B9A\u5176\u4ED6\u8BBE\u5907\uFF0C\u8BF7\u5148\u91CD\u7F6E" }, 403);
        }
        card.status = "activated";
        card.deviceId = deviceId;
        card.activatedAt = (/* @__PURE__ */ new Date()).toISOString();
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: "\u6FC0\u6D3B\u6210\u529F", activatedAt: card.activatedAt });
      } catch (e) {
        console.error("[\u5361\u5BC6/verify] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/reset" && request.method === "POST") {
      try {
        const { cardKey, deviceId } = await request.json();
        const normalizedKey = (cardKey || "").toUpperCase().trim();
        if (!normalizedKey) {
          return cardJson({ success: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" }, 400);
        }
        const card = await getCard(cardKv, normalizedKey);
        if (!card) {
          return cardJson({ success: false, error: "\u5361\u5BC6\u4E0D\u5B58\u5728" }, 404);
        }
        card.status = "unused";
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: "\u5361\u5BC6\u5DF2\u91CD\u7F6E", resetCount: card.resetCount });
      } catch (e) {
        console.error("[\u5361\u5BC6/reset] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/list" && request.method === "GET") {
      try {
        const adminPassword = request.headers.get("X-Admin-Password");
        const deviceId = request.headers.get("X-Device-Id");
        const currentCardKey = (request.headers.get("X-Card-Key") || "").toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF" }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: "\u5F53\u524D\u8BBE\u5907\u672A\u6FC0\u6D3B\u6216\u65E0\u6743\u9650" }, 403);
        }
        const list = await cardKv.list({ prefix: "card:" });
        const cards = [];
        for (const key of list.keys) {
          const raw = await cardKv.get(key.name);
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            cards.push({
              cardKey: key.name.replace(/^card:/, ""),
              status: data.status || "unused",
              createdAt: data.createdAt || null,
              deviceId: data.deviceId || null,
              activatedAt: data.activatedAt || null,
              resetCount: data.resetCount || 0,
              lastResetAt: data.lastResetAt || null
            });
          } catch {
          }
        }
        return cardJson({ success: true, cards });
      } catch (e) {
        console.error("[\u5361\u5BC6/list] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/generate" && request.method === "POST") {
      try {
        const adminPassword = request.headers.get("X-Admin-Password");
        const deviceId = request.headers.get("X-Device-Id");
        const currentCardKey = (request.headers.get("X-Card-Key") || "").toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF" }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: "\u5F53\u524D\u8BBE\u5907\u672A\u6FC0\u6D3B\u6216\u65E0\u6743\u9650" }, 403);
        }
        const { count = 1 } = await request.json();
        const generateCount = Math.min(Math.max(parseInt(count) || 1, 1), 100);
        const keys = [];
        for (let i = 0; i < generateCount; i++) {
          let key = generateCardKey();
          let existing = await getCard(cardKv, key);
          let attempts = 0;
          while (existing && attempts < 10) {
            key = generateCardKey();
            existing = await getCard(cardKv, key);
            attempts++;
          }
          const value = {
            status: "unused",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            resetCount: 0,
            deviceId: null,
            activatedAt: null,
            lastResetAt: null
          };
          await saveCard(cardKv, key, value);
          keys.push(key);
        }
        return cardJson({ success: true, keys, count: keys.length });
      } catch (e) {
        console.error("[\u5361\u5BC6/generate] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/delete" && request.method === "POST") {
      try {
        const adminPassword = request.headers.get("X-Admin-Password");
        const deviceId = request.headers.get("X-Device-Id");
        const currentCardKey = (request.headers.get("X-Card-Key") || "").toUpperCase().trim();
        if (!verifyAdminPassword(adminPassword, env)) {
          return cardJson({ success: false, error: "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF" }, 403);
        }
        if (!await verifyDeviceActivated(cardKv, currentCardKey, deviceId)) {
          return cardJson({ success: false, error: "\u5F53\u524D\u8BBE\u5907\u672A\u6FC0\u6D3B\u6216\u65E0\u6743\u9650" }, 403);
        }
        const { targetCardKey, action = "reset" } = await request.json();
        const normalizedTarget = (targetCardKey || "").toUpperCase().trim();
        if (!normalizedTarget) {
          return cardJson({ success: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" }, 400);
        }
        if (action === "delete") {
          await cardKv.delete(`card:${normalizedTarget}`);
          return cardJson({ success: true, message: "\u5361\u5BC6\u5DF2\u5220\u9664" });
        }
        const card = await getCard(cardKv, normalizedTarget);
        if (!card) {
          return cardJson({ success: false, error: "\u5361\u5BC6\u4E0D\u5B58\u5728" }, 404);
        }
        card.status = "unused";
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedTarget, card);
        return cardJson({ success: true, message: "\u5361\u5BC6\u5DF2\u91CD\u7F6E", resetCount: card.resetCount });
      } catch (e) {
        console.error("[\u5361\u5BC6/delete] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    if (url.pathname === "/api/card/self-reset" && request.method === "POST") {
      try {
        const { cardKey } = await request.json();
        const normalizedKey = (cardKey || "").toUpperCase().trim();
        if (!normalizedKey) return cardJson({ success: false, error: "\u7F3A\u5C11\u5361\u5BC6" }, 400);
        const card = await getCard(cardKv, normalizedKey);
        if (!card) return cardJson({ success: false, error: "\u5361\u5BC6\u4E0D\u5B58\u5728" }, 404);
        if (card.status !== "activated") return cardJson({ success: false, error: "\u5361\u5BC6\u672A\u6FC0\u6D3B\uFF0C\u65E0\u9700\u91CD\u7F6E" }, 400);
        card.status = "unused";
        card.deviceId = null;
        card.activatedAt = null;
        card.lastResetAt = (/* @__PURE__ */ new Date()).toISOString();
        card.resetCount = (card.resetCount || 0) + 1;
        await saveCard(cardKv, normalizedKey, card);
        return cardJson({ success: true, message: "\u5361\u5BC6\u5DF2\u91CD\u7F6E", resetCount: card.resetCount });
      } catch (e) {
        console.error("[\u5361\u5BC6/self-reset] \u9519\u8BEF:", e.message);
        return cardJson({ success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF" }, 500);
      }
    }
    const proxies = [
      {
        prefix: "/api/weixin-long",
        target: "https://long.open.weixin.qq.com",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
          "Accept": "*/*",
          "Referer": "https://open.weixin.qq.com/"
        }
      },
      {
        prefix: "/api/weixin",
        target: "https://open.weixin.qq.com",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 7.0; Mi-4c Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043632 Safari/537.36 MicroMessenger/6.6.1.1220(0x26060135) NetType/WIFI Language/zh_CN",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Referer": "https://open.weixin.qq.com/"
        }
      },
      {
        prefix: "/api/hortor",
        target: "https://comb-platform.hortorgames.com",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 12; 23117RK66C Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Mobile Safari/537.36",
          "Accept": "*/*",
          "Host": "comb-platform.hortorgames.com",
          "Connection": "keep-alive",
          "Content-Type": "text/plain; charset=utf-8",
          "Origin": "https://open.weixin.qq.com",
          "Referer": "https://open.weixin.qq.com/"
        }
      }
    ].sort((a, b) => b.prefix.length - a.prefix.length);
    const proxy = proxies.find((p) => url.pathname.startsWith(p.prefix));
    if (proxy) {
      const targetUrl = new URL(proxy.target);
      targetUrl.pathname = url.pathname.replace(proxy.prefix, "") || "/";
      targetUrl.search = url.search;
      const newHeaders = new Headers(request.headers);
      Object.entries(proxy.headers).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      if (proxy.headers.Host) {
        newHeaders.set("Host", proxy.headers.Host);
      }
      const newRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "follow"
      });
      try {
        const response = await fetch(newRequest);
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
