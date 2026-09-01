package com.xyzw.webhelper;

import android.content.Context;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

/**
 * Native HTTP bridge — bypasses WebView CORS restrictions and injects wx_mini_1 headers.
 * Maps /api/xxx paths to real game servers using native HttpURLConnection.
 */
public class NativeHttpBridge {
    private final Context appContext;

    public NativeHttpBridge(Context context) {
        this.appContext = context.getApplicationContext();
    }

    /** Proxy POST request with wx_mini_1 header injection */
    @JavascriptInterface
    public String proxyPost(String url, String headersJson, String bodyB64, String contentType) {
        try {
            return doRequest("POST", url, headersJson, bodyB64, contentType, 15000);
        } catch (Exception e) {
            return errorResult(e);
        }
    }

    /** GET request with wx_mini_1 header injection */
    @JavascriptInterface
    public String nativeGet(String url, int timeoutMs) {
        try {
            return doRequest("GET", url, null, null, null, timeoutMs > 0 ? timeoutMs : 15000);
        } catch (Exception e) {
            return errorResult(e);
        }
    }

    private String doRequest(String method, String url, String headersJson,
                             String bodyB64, String contentType, int timeoutMs) throws Exception {
        String realUrl = resolveUrl(url);
        android.util.Log.d("NativeHttpBridge", method + " " + url + " -> " + realUrl);

        URL urlObj = new URL(realUrl);
        HttpURLConnection conn = (HttpURLConnection) urlObj.openConnection();
        conn.setRequestMethod(method.toUpperCase());
        conn.setConnectTimeout(timeoutMs);
        conn.setReadTimeout(timeoutMs);
        conn.setDoInput(true);
        conn.setRequestProperty("Accept-Encoding", "identity");

        // --- wx_mini_1 headers (WeChat PC Mini Program disguise) ---
        applyWxHeaders(conn, realUrl);

        if (contentType != null && !contentType.isEmpty()) {
            conn.setRequestProperty("Content-Type", contentType);
        }

        // Custom headers (override defaults)
        if (headersJson != null && !headersJson.isEmpty() && !headersJson.equals("{}")) {
            try {
                org.json.JSONObject hdrs = new org.json.JSONObject(headersJson);
                java.util.Iterator<String> keys = hdrs.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    conn.setRequestProperty(key, hdrs.getString(key));
                }
            } catch (Exception ignore) {}
        }

        // Write body for POST
        if ("POST".equalsIgnoreCase(method) && bodyB64 != null && !bodyB64.isEmpty()) {
            conn.setDoOutput(true);
            byte[] body = Base64.decode(bodyB64, Base64.DEFAULT);
            conn.getOutputStream().write(body);
            conn.getOutputStream().flush();
        }

        int status = conn.getResponseCode();
        String statusText = conn.getResponseMessage();

        InputStream input;
        try {
            input = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
        } catch (Exception e) {
            input = conn.getErrorStream();
        }
        if (input == null) input = new java.io.ByteArrayInputStream(new byte[0]);

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = input.read(buf)) != -1) {
            bos.write(buf, 0, n);
        }
        input.close();
        byte[] respBytes = bos.toByteArray();
        String respB64 = Base64.encodeToString(respBytes, Base64.NO_WRAP);

        String respText;
        try {
            respText = new String(respBytes, "UTF-8");
        } catch (Exception e) {
            respText = Base64.encodeToString(respBytes, Base64.NO_WRAP);
        }

        org.json.JSONObject respHeaders = new org.json.JSONObject();
        Map<String, List<String>> headerFields = conn.getHeaderFields();
        if (headerFields != null) {
            for (Map.Entry<String, List<String>> entry : headerFields.entrySet()) {
                String key = entry.getKey();
                if (key != null && entry.getValue() != null && !entry.getValue().isEmpty()) {
                    respHeaders.put(key, entry.getValue().get(0));
                }
            }
        }

        conn.disconnect();

        org.json.JSONObject result = new org.json.JSONObject();
        result.put("status", status);
        result.put("statusText", statusText != null ? statusText : "");
        result.put("headers", respHeaders);
        result.put("bodyBase64", respB64);
        result.put("text", respText);

        android.util.Log.d("NativeHttpBridge",
            "Response: " + status + " bodyLen=" + respBytes.length);
        return result.toString();
    }

    // ============================================================
    //  wx_mini_1 strategy: WeChat PC Mini Program header disguise
    //  Aligned with packet capture of real WeChat mini program traffic
    // ============================================================
    private static final String wxUA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/132.0.0.0 Safari/537.36 " +
        "MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI " +
        "MiniProgramEnv/Windows " +
        "WindowsWechat/WMPF WindowsWechat(0x63090a13) " +
        "UnifiedPCWindowsWechat(0xf2541937) XWEB/19823";

    private void applyWxHeaders(HttpURLConnection conn, String url) {
        conn.setRequestProperty("Accept", "*/*");

        if (url.contains("open.weixin.qq.com")) {
            conn.setRequestProperty("User-Agent", wxUA);
            conn.setRequestProperty("Referer", "https://open.weixin.qq.com/");
        } else if (url.contains("comb-platform.hortorgames.com")) {
            conn.setRequestProperty("User-Agent", wxUA);
            conn.setRequestProperty("Host", "comb-platform.hortorgames.com");
            conn.setRequestProperty("Connection", "keep-alive");
            conn.setRequestProperty("Origin", "https://open.weixin.qq.com");
            conn.setRequestProperty("Referer", "https://open.weixin.qq.com/");
        } else if (url.contains("ucenter-app-server.hortorgames.com")) {
            conn.setRequestProperty("User-Agent", wxUA);
            conn.setRequestProperty("Origin", "https://servicewechat.com");
            conn.setRequestProperty("Referer",
                "https://servicewechat.com/wx0840558555a454ed/331/page-frame.html");
            conn.setRequestProperty("X-Requested-With", "XMLHttpRequest");
            conn.setRequestProperty("xweb_xhr", "1");
        } else if (url.contains("service-battle.hortorgames.com")) {
            try {
                java.net.URL u = new java.net.URL(url);
                String scheme = u.getProtocol();
                String host = u.getHost();
                String origin = scheme + "://" + host;
                conn.setRequestProperty("User-Agent", wxUA);
                conn.setRequestProperty("Origin", origin);
                conn.setRequestProperty("Referer", origin + "/");
                conn.setRequestProperty("xweb_xhr", "1");
            } catch (Exception e) {
                conn.setRequestProperty("User-Agent", wxUA);
            }
        } else if (url.contains("hortorgames.com")) {
            conn.setRequestProperty("User-Agent", wxUA);
            conn.setRequestProperty("Origin", "https://servicewechat.com");
            conn.setRequestProperty("Referer",
                "https://servicewechat.com/wx0840558555a454ed/331/page-frame.html");
            conn.setRequestProperty("X-Requested-With", "XMLHttpRequest");
            conn.setRequestProperty("xweb_xhr", "1");
        } else {
            conn.setRequestProperty("User-Agent", wxUA);
        }
    }

    private String errorResult(Exception e) {
        try {
            org.json.JSONObject result = new org.json.JSONObject();
            result.put("status", 0);
            result.put("statusText", "Network Error");
            result.put("headers", new org.json.JSONObject());
            result.put("bodyBase64", "");
            result.put("text", "");
            result.put("error", e.getMessage() != null ? e.getMessage() : "unknown");
            android.util.Log.e("NativeHttpBridge", "Error", e);
            return result.toString();
        } catch (Exception e2) {
            return "{\"status\":0,\"error\":\"json error\"}";
        }
    }

    /**
     * Map /api/{service}/xxx paths to their real server URLs.
     *
     *   /api/weixin/...  -> https://open.weixin.qq.com/...
     *   /api/hortor/...  -> https://comb-platform.hortorgames.com/...
     *   /api/xxz/...     -> https://xxz-xyzw.hortorgames.com/...
     *   /api/ucenter/... -> https://ucenter-app-server.hortorgames.com/... (与 _worker.js 保持一致)
     */
    private String resolveUrl(String url) {
        if (url == null) return url;
        if (url.startsWith("/api/weixin/")) {
            return "https://open.weixin.qq.com" + url.substring("/api/weixin".length());
        }
        if (url.startsWith("/api/hortor/")) {
            return "https://comb-platform.hortorgames.com" + url.substring("/api/hortor".length());
        }
        if (url.startsWith("/api/xxz/")) {
            return "https://xxz-xyzw.hortorgames.com" + url.substring("/api/xxz".length());
        }
        if (url.startsWith("/api/ucenter/")) {
            return "https://ucenter-app-server.hortorgames.com" + url.substring("/api/ucenter".length());
        }
        return url;
    }
}
