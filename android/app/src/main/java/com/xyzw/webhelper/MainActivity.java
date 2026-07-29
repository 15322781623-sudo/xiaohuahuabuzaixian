package com.xyzw.webhelper;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 注册自定义插件
        registerPlugin(ApkInstallerPlugin.class);
        
        // 启用 WebView 调试功能
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 固定 WebView 文字缩放为 100%，不跟随系统字体大小设置
        // 否则系统大字体会导致页面文字被放大、布局错乱（标题竖排、按钮重叠）
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setTextZoom(100);
        }
    }
}
