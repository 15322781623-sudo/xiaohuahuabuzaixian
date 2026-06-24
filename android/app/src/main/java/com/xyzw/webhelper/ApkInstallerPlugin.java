package com.xyzw.webhelper;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * APK 安装插件
 * 通过 FileProvider 和 Intent 触发系统安装器安装APK
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        String filePath = call.getString("filePath");

        if (filePath == null || filePath.isEmpty()) {
            call.reject("文件路径不能为空");
            return;
        }

        try {
            File apkFile;

            // 处理不同的文件路径格式
            if (filePath.startsWith("content://") || filePath.startsWith("file://")) {
                // URI 格式，直接使用
                Uri apkUri = Uri.parse(filePath);
                installApk(apkUri);
                call.resolve();
                return;
            } else if (filePath.startsWith("/")) {
                // 绝对路径
                apkFile = new File(filePath);
            } else {
                // 相对路径，从外部存储目录查找
                File externalDir = getActivity().getExternalFilesDir(null);
                if (externalDir == null) {
                    externalDir = getActivity().getFilesDir();
                }
                apkFile = new File(externalDir, filePath);
            }

            if (!apkFile.exists()) {
                call.reject("APK文件不存在: " + apkFile.getAbsolutePath());
                return;
            }

            // 使用 FileProvider 获取 URI
            Uri apkUri = FileProvider.getUriForFile(
                getActivity(),
                getActivity().getPackageName() + ".fileprovider",
                apkFile
            );

            installApk(apkUri);
            call.resolve();

        } catch (Exception e) {
            call.reject("安装失败: " + e.getMessage());
        }
    }

    /**
     * 触发系统安装器
     */
    private void installApk(Uri apkUri) {
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // Android 8.0+ 需要允许安装未知来源应用
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getActivity().getPackageManager()
                .canRequestPackageInstalls();
            if (!canInstall) {
                // 引导用户开启安装权限
                Intent settingsIntent = new Intent(
                    android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getActivity().getPackageName())
                );
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(settingsIntent);
            }
        }

        getActivity().startActivity(installIntent);
    }

    /**
     * 获取当前APK版本信息
     */
    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            String versionName = getActivity().getPackageManager()
                .getPackageInfo(getActivity().getPackageName(), 0).versionName;
            long versionCode;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = getActivity().getPackageManager()
                    .getPackageInfo(getActivity().getPackageName(), 0).getLongVersionCode();
            } else {
                versionCode = getActivity().getPackageManager()
                    .getPackageInfo(getActivity().getPackageName(), 0).versionCode;
            }

            JSObject result = new JSObject();
            result.put("versionName", versionName);
            result.put("versionCode", versionCode);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("获取版本信息失败: " + e.getMessage());
        }
    }
}
