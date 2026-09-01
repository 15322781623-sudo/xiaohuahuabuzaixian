package com.xyzw.webhelper;

import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 设备唯一标识插件：返回系统 ANDROID_ID。
 *
 * 卡密激活按设备绑定，要求"清除 WebView 数据后仍保持不变"，
 * 因此不能使用浏览器指纹（清数据即失效、且每次重装都不同）。
 * ANDROID_ID 在同一签名 + 同一用户下保持稳定，满足绑定需求。
 */
@CapacitorPlugin(name = "DeviceId")
public class DeviceIdPlugin extends Plugin {

    private static final String TAG = "DeviceId";

    @PluginMethod
    public void getDeviceId(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            String androidId = Settings.Secure.getString(
                    getContext().getContentResolver(),
                    Settings.Secure.ANDROID_ID);
            // 极少数定制系统返回 null，交由前端降级为浏览器指纹
            if (androidId == null || androidId.isEmpty()) {
                call.reject("ANDROID_ID 不可用");
                return;
            }
            // 与浏览器指纹保持同一格式（大写）
            ret.put("deviceId", androidId.toUpperCase());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "获取 ANDROID_ID 失败", e);
            call.reject("获取设备ID失败：" + e.getMessage());
        }
    }
}
