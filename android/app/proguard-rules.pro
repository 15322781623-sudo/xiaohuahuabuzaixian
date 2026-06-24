# ====== Capacitor 核心保护 ======
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# ====== WebView 与 JS 桥接保护 ======
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ====== AndroidX 保护 ======
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ====== 混淆配置 ======
# 启用混淆（重命名类名、方法名、字段名）
-optimizationpasses 5
-dontusemixedcaseclassnames

# 保留行号用于崩溃日志（但隐藏源文件名）
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# 保留枚举
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# 保留 Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# 保留 Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ====== 移除日志（Release 包移除调试日志） ======
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ====== 通用保护 ======
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe
-dontwarn java.lang.invoke.**
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
