package com.xyzw.webhelper;

import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.RandomAccessFile;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * 应用宝协议服务（yyb-go）内置托管插件。
 *
 * 服务二进制以 libyybgo.so 形式随 APK 分发（jniLibs 多ABI），
 * 安装后位于应用 nativeLibraryDir（Android 10+ 仅允许执行该目录下的原生代码）。
 * 本插件负责按需拉起/停止本地服务进程（127.0.0.1:8000），
 * 前端直接访问本机服务，无需局域网 PC 服务。
 */
@CapacitorPlugin(name = "YybService")
public class YybServicePlugin extends Plugin {

    private static final String TAG = "YybService";
    private static final int PORT = 8000;

    private Process process;

    /** 探测端口，判断服务是否已在运行 */
    private boolean portInUse() {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("127.0.0.1", PORT), 800);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** 设备支持的ABI列表（用于错误提示） */
    private String deviceAbis() {
        return String.join(",", Build.SUPPORTED_ABIS);
    }

    /** 读取服务日志末尾，便于前端展示启动失败的真实原因 */
    private String readLogTail(File logFile, int maxChars) {
        try (RandomAccessFile raf = new RandomAccessFile(logFile, "r")) {
            long len = raf.length();
            if (len == 0) return "";
            long start = Math.max(0, len - maxChars);
            raf.seek(start);
            byte[] buf = new byte[(int) (len - start)];
            raf.readFully(buf);
            return new String(buf).trim();
        } catch (Exception e) {
            return "";
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            if (portInUse()) {
                ret.put("running", true);
                ret.put("alreadyRunning", true);
                call.resolve(ret);
                return;
            }
            synchronized (this) {
                if (process != null && process.isAlive()) {
                    ret.put("running", true);
                    ret.put("alreadyRunning", true);
                    call.resolve(ret);
                    return;
                }
                String bin = getContext().getApplicationInfo().nativeLibraryDir + "/libyybgo.so";
                File binFile = new File(bin);
                if (!binFile.exists()) {
                    call.reject("未找到内置应用宝服务二进制：" + bin
                            + "（设备ABI：" + deviceAbis() + "，APK未包含对应架构的服务）");
                    return;
                }
                // 确保可执行权限（部分设备提取后可能丢失x位）
                if (!binFile.canExecute()) {
                    binFile.setExecutable(true);
                }
                File resDir = new File(getContext().getFilesDir(), "yyb-resource");
                if (!resDir.exists() && !resDir.mkdirs()) {
                    call.reject("无法创建服务数据目录：" + resDir.getAbsolutePath());
                    return;
                }
                File logFile = new File(getContext().getFilesDir(), "yyb-go.log");
                ProcessBuilder pb = new ProcessBuilder(
                        bin,
                        "-host", "127.0.0.1",
                        "-port", String.valueOf(PORT),
                        "-resource-root", resDir.getAbsolutePath());
                pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile));
                pb.redirectError(ProcessBuilder.Redirect.appendTo(logFile));
                process = pb.start();
                // 等待服务就绪（最多 5 秒）
                boolean ready = false;
                for (int i = 0; i < 25; i++) {
                    if (portInUse()) {
                        ready = true;
                        break;
                    }
                    Thread.sleep(200);
                }
                ret.put("running", ready);
                ret.put("alreadyRunning", false);
                if (!ready) {
                    String tail = readLogTail(logFile, 500);
                    Log.w(TAG, "服务进程已启动但健康检查未就绪 " + tail);
                    call.reject("内置服务5秒内未就绪（设备ABI：" + deviceAbis() + "）"
                            + (tail.isEmpty() ? "" : "，日志：" + tail));
                    return;
                }
            }
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "启动应用宝服务失败", e);
            call.reject("启动应用宝服务失败：" + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        synchronized (this) {
            if (process != null) {
                process.destroy();
                process = null;
            }
        }
        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        boolean alive;
        synchronized (this) {
            alive = process != null && process.isAlive();
        }
        ret.put("running", alive || portInUse());
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (this) {
            if (process != null) {
                process.destroy();
                process = null;
            }
        }
    }
}
