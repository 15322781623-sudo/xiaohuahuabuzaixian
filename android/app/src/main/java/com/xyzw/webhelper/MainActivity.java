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
        registerPlugin(DeviceIdPlugin.class);

        super.onCreate(savedInstanceState);
        
        // 获取 WebView 实例
        WebView webView = getBridge().getWebView();
        
        // 注册 NativeHttpBridge — 绕过WebView CORS + wx_mini_1 请求头伪装
        if (webView != null) {
            webView.addJavascriptInterface(new NativeHttpBridge(this), "NativeHttpBridge");
            // 固定 WebView 文字缩放为 100%，不跟随系统字体大小设置
            webView.getSettings().setTextZoom(100);
        }
        
        // 仅 Debug 包开启 WebView 调试：Release 包开启会导致任意人通过 adb inspect 前端逻辑与数据
        // AGP 8 默认关闭 BuildConfig 生成，改用 manifest 的 debuggable 标志判断
        boolean debuggable = (getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
