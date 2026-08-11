package com.xyzw.webhelper;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 注册自定义插件（Capacitor 5+ 要求在 super.onCreate 之前调用，否则桥接已初始化导致注册无效）
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(YybServicePlugin.class);

        super.onCreate(savedInstanceState);
        
        // 获取 WebView 实例
        WebView webView = getBridge().getWebView();
        
        // 注册 NativeHttpBridge — 绕过WebView CORS + wx_mini_1 请求头伪装
        if (webView != null) {
            webView.addJavascriptInterface(new NativeHttpBridge(this), "NativeHttpBridge");
            // 固定 WebView 文字缩放为 100%，不跟随系统字体大小设置
            webView.getSettings().setTextZoom(100);
        }
        
        // 启用 WebView 调试功能
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
