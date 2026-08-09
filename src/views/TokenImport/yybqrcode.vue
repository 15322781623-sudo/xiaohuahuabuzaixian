<template>
  <div class="yyb-qrcode-import">
    <!-- 操作按钮 -->
    <div class="form-actions">
      <n-button type="primary" size="large" block :loading="isImporting" @click="handleImport">
        <template #icon>
          <n-icon>
            <CloudUpload />
          </n-icon>
        </template>
        添加Token
      </n-button>

      <n-button block @click="$emit('cancel')" :disabled="isProcessing">
        <template #icon>
          <n-icon>
            <Close />
          </n-icon>
        </template>
        取消
      </n-button>
    </div>

    <!-- 应用宝登录流程说明 -->
    <div class="login-flow-info">
      <h3>应用宝扫码登录流程</h3>
      <ol class="flow-steps">
        <li>确认应用宝协议服务已启动（EXE 版可通过下方开关一键拉起，默认 http://127.0.0.1:8000）</li>
        <li>获取二维码后使用<strong>微信</strong>扫码并确认授权</li>
        <li>系统将获取<strong>该微信下所有角色</strong>的 Token 信息</li>
        <li>授权账号会保存在服务端，<strong>后续无需扫码</strong>即可重新获取 Token</li>
      </ol>
    </div>

    <!-- 应用宝协议服务开关：进入页面自动静默拉起；开关用于手动启停与状态展示 -->
    <div class="yyb-service-switch">
      <div class="yyb-service-switch-row">
        <span class="yyb-service-label">应用宝协议服务</span>
        <n-switch :value="yybServiceOn" :loading="isTogglingService" @update:value="toggleYybService" />
        <n-tag size="small" :type="yybServiceRunning ? 'success' : 'warning'" round>
          {{ yybServiceRunning ? "运行中" : "已停止" }}
        </n-tag>
      </div>
      <div class="yyb-service-hint">
        {{ isTauriEnv ? "服务已内置，进入页面自动启动，开关可手动启停并记忆" : isCapacitorEnv ? "服务已内置于 APK，进入页面自动在本机启动，开关可手动启停" : isPlainWebProd ? "Web 版无法拉起本地服务，自动连接公共代理服务（地址可手动修改）" : "Web 开发版进入页面自动启动服务；也可在电脑上执行 yyb-go.exe -host 0.0.0.0 并填写电脑 IP" }}
      </div>
    </div>

    <!-- 服务配置 -->
    <n-form :model="importForm" label-placement="top" :show-label="true">
      <n-form-item label="应用宝服务地址" :show-label="true">
        <n-input v-model:value="yybServer" placeholder="http://127.0.0.1:8000" @blur="saveYybConfig">
          <template #suffix>
            <n-button text size="tiny" :loading="isCheckingServer" @click="checkServer">
              测试连接
            </n-button>
          </template>
        </n-input>
      </n-form-item>
      <n-form-item label="微信开放平台AppID" :show-label="true">
        <n-input v-model:value="yybAppId" placeholder="wxfb0d5667e5cb1c44" @blur="saveYybConfig" />
      </n-form-item>
    </n-form>

    <!-- 已保存的应用宝账号（免扫码获取Token） -->
    <div v-if="yybAccounts.length > 0" class="yyb-accounts">
      <div class="yyb-accounts-header">
        <span>已保存的应用宝账号（免扫码）</span>
        <n-button text size="tiny" :loading="isLoadingAccounts" @click="loadAccounts">
          刷新
        </n-button>
      </div>
      <div v-for="acc in yybAccounts" :key="acc.openid" class="yyb-account-item">
        <div class="yyb-account-info">
          <strong>{{ acc.nickname || acc.alias || "未命名账号" }}</strong>
          <n-tag size="tiny" :type="acc.status === 'alive' ? 'success' : 'warning'">
            {{ acc.status === "alive" ? "在线" : "待续期" }}
          </n-tag>
          <div class="yyb-account-openid">{{ acc.openid }}</div>
        </div>
        <n-button
          size="small"
          type="primary"
          :loading="loginAccountOpenid === acc.openid"
          @click="loginWithAccount(acc)"
        >
          获取Token
        </n-button>
      </div>
    </div>

    <!-- 凭证被游戏服务器拒绝时的引导提示 -->
    <n-alert v-if="credentialRejected" type="error" title="应用宝渠道无法获取角色数据" :show-icon="true">
      应用宝免扫码登录产出的是小程序短凭证，游戏服务器不接受该凭证（错误码 -10001）。
      请改用「微信扫码」方式导入，扫码后即可正常获取角色列表。
      <div style="margin-top: 8px">
        <n-button size="small" type="primary" @click="switchToWxQrcode">切换到微信扫码</n-button>
      </div>
    </n-alert>

    <!-- 二维码显示区域 -->
    <div class="qrcode-container">
      <div v-if="!qrcodeUrl" class="qr-placeholder" @click="generateQRCode">
        <n-icon size="48" color="var(--text-tertiary)">
          <Scan />
        </n-icon>
        <p>点击获取应用宝登录二维码</p>
      </div>
      <img v-else :src="qrcodeUrl" alt="应用宝登录二维码" class="qr-image" />

      <!-- 状态信息 -->
      <div class="qr-status" :class="statusType">
        {{ statusMessage }}
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <n-button type="primary" block @click="generateQRCode" :loading="isProcessing">
        <template #icon>
          <n-icon>
            <Refresh />
          </n-icon>
        </template>
        {{ qrcodeUrl ? "刷新二维码" : "获取二维码" }}
      </n-button>
    </div>

    <!-- 角色命名格式配置 -->
    <n-form :model="importForm" label-placement="top" :show-label="true" style="margin-top: 16px;">
      <n-form-item label="角色命名格式" :show-label="true">
        <n-input v-model:value="importForm.nameTemplate" placeholder="{name}-{index}-{id}" />
        <template #feedback>
          支持变量: {name}角色名, {id}角色ID, {index}角色序号, {server}区服
        </template>
      </n-form-item>
    </n-form>

    <!-- 服务器角色列表 -->
    <ServerRoleList :data="serverListData" server-column-title="区服ID" max-height="50vh" @add="addSelectedRole"
      @download="handleDownload" />

    <a-list>
      <a-list-item v-for="(role, index) in roleList" :key="index">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <div>
            <strong>角色名称:</strong> {{ role.name || "未命名角色" }}<br />
            <strong>Token:</strong>
            <span style="word-break: break-all">{{ role.token }}</span><br />
            <strong>服务器:</strong> {{ role.server || "未指定" }}<br />
            <strong>角色序号:</strong> {{ role.roleIndex }}
          </div>
          <n-button type="error" size="small" @click="removeRole(index)">
            删除
          </n-button>
        </div>
      </a-list-item>
    </a-list>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, reactive, watch } from "vue";
import { Scan, Refresh, Close, CloudUpload } from "@vicons/ionicons5";
import { NIcon, NTag, useMessage, NButton, NForm, NFormItem, NInput, NAlert, NSwitch } from "naive-ui";
import { invoke, isTauri as tauriIsTauri } from "@tauri-apps/api/core";
import { Capacitor } from "@capacitor/core";
import { getTokenId, transformToken, getServerList } from "@/utils/token";
import useIndexedDB from "@/hooks/useIndexedDB";
import { saveBinBackup } from "@/utils/binBackup";
import { g_utils } from "@/utils/bonProtocol";
import { useTokenStore } from "@/stores/tokenStore";
import { downloadFile } from "@/utils/imageExport";
import {
  YYB_DEFAULT_SERVER,
  YYB_WEB_FALLBACK_SERVER,
  YYB_DEFAULT_APPID,
  YYB_LEGACY_MINIGAME_APPID,
  yybCreateQr,
  yybPollQr,
  yybConfirmQr,
  yybListAccounts,
  yybLoginForBin,
  yybHealth,
  yybShutdown,
  type YybAccount,
} from "@/utils/yybApi";

const tokenStore = useTokenStore();
const { storeArrayBuffer } = useIndexedDB();
const message = useMessage();

const isImporting = ref(false);
const importForm = reactive({
  name: "",
  server: "",
  wsUrl: "",
  nameTemplate: "{name}-{index}-{id}",
});

// 定义事件
const emit = defineEmits(["cancel", "ok", "switch-wx"]);

// ---------- 环境检测（需在配置初始化前，决定默认服务地址） ----------
const isTauriEnv = (() => {
  try {
    return tauriIsTauri();
  } catch {
    return false;
  }
})();
// APK 环境：服务二进制已内置（Java 插件 YybService 托管本机进程）
const isCapacitorEnv = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();
// 纯 Web 生产环境（Pages/worker 无法拉起本地 exe）：默认连接公共代理服务
const isPlainWebProd = !isTauriEnv && !isCapacitorEnv && !import.meta.env.DEV;

// 应用宝服务配置（持久化到 localStorage）
const yybServer = ref(localStorage.getItem("yybServerUrl") || (isPlainWebProd ? YYB_WEB_FALLBACK_SERVER : YYB_DEFAULT_SERVER));
const yybAppId = ref((() => {
  const stored = localStorage.getItem("yybAppId");
  // 旧版小游戏 appid 产出的短凭证被游戏服拒绝（-10001），迁移到 app-we 通道的 APP appid
  if (!stored || stored === YYB_LEGACY_MINIGAME_APPID) return YYB_DEFAULT_APPID;
  return stored;
})());
const isCheckingServer = ref(false);
const isLoadingAccounts = ref(false);
const yybAccounts = ref<YybAccount[]>([]);
const loginAccountOpenid = ref<string | null>(null);

const saveYybConfig = () => {
  localStorage.setItem("yybServerUrl", yybServer.value.trim());
  localStorage.setItem("yybAppId", yybAppId.value.trim());
};

// ---------- 应用宝协议服务开关（Tauri 桌面版） ----------
const yybServiceOn = ref(false);
const yybServiceRunning = ref(false);
const isTogglingService = ref(false);

/** 查询服务运行状态并同步开关：Tauri 用原生命令，Web/APK 用健康检查 */
const refreshYybServiceStatus = async () => {
  try {
    if (isTauriEnv) {
      const status = await invoke<{ running: boolean; managed: boolean }>("yyb_service_status");
      yybServiceRunning.value = !!status?.running;
      const autostart = await invoke<boolean>("get_yyb_autostart");
      yybServiceOn.value = !!status?.running || !!autostart;
    } else {
      // Web/APK：服务由外部运行，开关状态直接反映健康检查结果
      yybServiceRunning.value = await yybHealth(yybServer.value);
      yybServiceOn.value = yybServiceRunning.value;
    }
  } catch (e) {
    console.warn("查询应用宝服务状态失败", e);
  }
};

/**
 * 静默自动拉起服务（默认直接可连接，无需手动开关）：
 * - Tauri EXE：invoke 原生命令启动内置托管的 yyb-go.exe
 * - APK：通过原生插件 YybService 拉起内置服务（本机 127.0.0.1:8000）
 * - Web dev：通过 dev server 托管接口 spawn yyb-go.exe
 * - 生产 Web：无托管能力，静默跳过（依赖外部服务）
 * @returns 服务是否已就绪
 */
const autoEnsureYybService = async (): Promise<boolean> => {
  let ok = await yybHealth(yybServer.value);
  if (ok) return true;
  try {
    if (isCapacitorEnv) {
      const started = await tryStartBuiltinYyb();
      if (!started) return false;
      // 内置服务监听本机，配置的地址不可达时切回本机默认地址
      if (!(await yybHealth(yybServer.value))) {
        yybServer.value = YYB_DEFAULT_SERVER;
        saveYybConfig();
      }
    } else if (isTauriEnv) {
      const r = await invoke<string>("start_yyb_service_cmd");
      if (r === "not-found") return false;
    } else {
      const started = await tryDevServerStartYyb();
      if (!started) {
        // 生产 Web 无托管拉起能力（worker 无法启动 yyb-go.exe）：公共代理服务可达时自动切换
        if (!(await yybHealth(YYB_WEB_FALLBACK_SERVER))) return false;
        yybServer.value = YYB_WEB_FALLBACK_SERVER;
        saveYybConfig();
        return true;
      }
    }
  } catch {
    return false;
  }
  // 等服务端口就绪（最多 5 秒）
  for (let i = 0; i < 10 && !ok; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    ok = await yybHealth(yybServer.value);
  }
  return ok;
};

/** APK 环境：通过原生插件 YybService 拉起内置应用宝服务（Java 托管进程，失败时抛错透传真实原因） */
const tryStartBuiltinYyb = async (): Promise<boolean> => {
  const YybService = Capacitor.registerPlugin<{ start(): Promise<{ running: boolean }> }>("YybService");
  const r = await YybService.start();
  return !!r?.running;
};

/** Web dev 环境：通过 dev server 托管接口拉起应用宝服务（生产环境/APK 无此端点会静默失败） */
const tryDevServerStartYyb = async (): Promise<boolean> => {
  try {
    const res = await fetch("/api/yyb-service/start", { method: "POST" });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json?.ok;
  } catch {
    return false;
  }
};

/** 开关切换：EXE 启停服务并持久化自启动；Web 优先 dev 托管拉起；APK 检测引导 */
const toggleYybService = async (on: boolean) => {
  isTogglingService.value = true;
  yybServiceOn.value = on;
  try {
    if (isTauriEnv) {
      await invoke("set_yyb_autostart", { enabled: on });
      if (on) {
        const r = await invoke<string>("start_yyb_service_cmd");
        if (r === "not-found") {
          message.error("未找到 yyb-go.exe，无法启动应用宝服务");
        } else {
          message.success(r === "already-running" ? "应用宝服务已在运行" : "应用宝服务已启动");
        }
      } else {
        const r = await invoke<string>("stop_yyb_service_cmd");
        if (r === "not-managed") {
          // 非本程序拉起的服务：改用远程停机接口
          const ok = await yybShutdown(yybServer.value);
          if (ok) {
            message.success("应用宝服务已停止");
          } else {
            message.warning("无法停止服务，请确认服务地址正确或手动关闭");
          }
        } else {
          message.success("应用宝服务已停止");
        }
      }
      // 稍等片刻等服务端口释放再刷新状态
      await new Promise((resolve) => setTimeout(resolve, 800));
    } else {
      // Web/APK：无法杀外部进程，开启=检测连接，关闭=调用 /shutdown 让服务自行退出
      saveYybConfig();
      if (on) {
        if (isCapacitorEnv) {
          // APK：启停内置服务进程
          let started = false;
          try {
            started = await tryStartBuiltinYyb();
          } catch (err: any) {
            yybServiceRunning.value = false;
            yybServiceOn.value = false;
            message.error("启动内置应用宝服务失败：" + (err?.message || err));
            return;
          }
          yybServiceRunning.value = started;
          yybServiceOn.value = started;
          if (started) {
            message.success("应用宝服务已启动（本机内置）");
            loadAccounts();
          } else {
            message.error("启动内置应用宝服务失败（服务未在5秒内就绪）");
          }
          return;
        }
        let ok = await yybHealth(yybServer.value);
        if (!ok) {
          // 服务未运行：Web dev 环境尝试由 dev server 直接拉起（免手动启动）
          const started = await tryDevServerStartYyb();
          if (started) {
            for (let i = 0; i < 10 && !ok; i++) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              ok = await yybHealth(yybServer.value);
            }
          }
        }
        yybServiceRunning.value = ok;
        yybServiceOn.value = ok;
        if (ok) {
          message.success("应用宝服务已就绪");
          loadAccounts();
        } else {
          message.error("无法连接应用宝服务，请先在电脑上启动：cd yyb_go.rar 后执行 yyb-go.exe -host 0.0.0.0");
        }
      } else {
        const ok = await yybShutdown(yybServer.value);
        if (isCapacitorEnv) {
          // APK：内置服务由 Java 插件托管，额外销毁进程确保彻底停止
          try {
            await (Capacitor.registerPlugin<{ stop(): Promise<{ stopped: boolean }> }>("YybService")).stop();
          } catch { /* ignore */ }
        }
        if (!ok) {
          message.warning("停机请求未成功，请确认服务地址正确且服务正在运行");
        }
        // 等服务端口释放后再确认状态，避免误报
        await new Promise((resolve) => setTimeout(resolve, 800));
        const stillRunning = await yybHealth(yybServer.value);
        yybServiceRunning.value = stillRunning;
        yybServiceOn.value = stillRunning;
        if (!stillRunning) {
          message.success(ok ? "应用宝服务已停止" : "应用宝服务未在运行");
        } else {
          message.error("服务仍在运行，停机未生效（需 yyb-go 新版本支持 /shutdown）");
        }
      }
      return;
    }
    await refreshYybServiceStatus();
  } catch (e: any) {
    message.error("应用宝服务操作失败：" + (e?.message || e));
    await refreshYybServiceStatus();
  } finally {
    isTogglingService.value = false;
  }
};

// 响应式数据
const qrcodeUrl = ref<string | null>(null);
const qrSessionId = ref<string | null>(null);
const isProcessing = ref(false);
const statusMessage = ref("点击获取应用宝登录二维码");
const statusType = ref("info");
const isScanning = ref(false);
const scanInterval = ref<any>(null);
const timeout = 180000; // 180秒超时（与服务端 ScanTimeout 一致）
const startTime = ref<number | null>(null);
const remainSeconds = ref(0);

const serverListData = ref<any[]>([]);
const currentBinData = ref<ArrayBuffer | null>(null);
const binDecodedResult = ref("");
const originalBinData = ref<any>(null);
const roleList = ref<
  Array<{
    id: string;
    name: string;
    roleId: string;
    token: string;
    server: string;
    roleIndex?: number;
    wsUrl: string;
    importMethod: 'yybQrcode';
    yybOpenid?: string;
    yybServer?: string;
    yybAppId?: string;
  }>
>([]);

// 当前登录使用的应用宝账号 openid（写入角色，用于后续免扫码续期）
const currentYybOpenid = ref<string>("");

// 凭证被游戏服务器拒绝（应用宝小程序短凭证无法通过服务器校验）
const credentialRejected = ref(false);

const switchToWxQrcode = () => {
  emit("switch-wx");
};

const removeRole = (index: number) => {
  roleList.value.splice(index, 1);
};

/**
 * 测试服务连接
 */
const checkServer = async () => {
  saveYybConfig();
  isCheckingServer.value = true;
  try {
    const ok = await yybHealth(yybServer.value);
    if (ok) {
      message.success("应用宝服务连接正常");
      loadAccounts();
    } else {
      message.error("无法连接应用宝服务，请确认服务已启动");
    }
  } finally {
    isCheckingServer.value = false;
  }
};

/**
 * 加载已保存的应用宝账号
 */
const loadAccounts = async () => {
  if (!yybServer.value.trim()) return;
  isLoadingAccounts.value = true;
  try {
    yybAccounts.value = await yybListAccounts(yybServer.value);
  } catch (e: any) {
    console.warn("加载应用宝账号列表失败", e);
    yybAccounts.value = [];
  } finally {
    isLoadingAccounts.value = false;
  }
};

/**
 * 使用已保存账号免扫码获取 Token
 */
const loginWithAccount = async (acc: YybAccount) => {
  loginAccountOpenid.value = acc.openid;
  isProcessing.value = true;
  credentialRejected.value = false;
  try {
    updateStatus(`正在通过账号 ${acc.nickname || acc.openid} 获取登录凭证...`, "info");
    const bin = await yybLoginForBin(yybServer.value, acc.openid, yybAppId.value.trim());
    currentYybOpenid.value = acc.openid;
    updateStatus("登录凭证获取成功，正在获取角色列表...", "info");
    await saveAccount(bin.buffer as ArrayBuffer, acc.nickname || "");
  } catch (e: any) {
    console.error("应用宝账号登录失败", e);
    message.error("登录失败: " + (e?.message || "未知错误"));
    updateStatus("登录失败：" + (e?.message || "未知错误"), "error");
  } finally {
    loginAccountOpenid.value = null;
    isProcessing.value = false;
  }
};

/**
 * 生成应用宝登录二维码
 */
const generateQRCode = async () => {
  try {
    isProcessing.value = true;
    updateStatus("正在获取二维码...", "info");
    saveYybConfig();
    resetQRCode();

    const result = await yybCreateQr(yybServer.value);
    if (!result?.session_id) {
      throw new Error("服务未返回扫码会话");
    }
    qrSessionId.value = result.session_id;
    qrcodeUrl.value = result.image_base64 || null;

    if (!qrcodeUrl.value) {
      throw new Error("服务未返回二维码图片");
    }

    updateStatus("请使用微信扫码登录", "success");
    startScanMonitoring();
  } catch (error: any) {
    updateStatus("二维码获取失败：" + (error?.message || "未知错误"), "error");
    console.error("获取应用宝二维码失败", error);
  } finally {
    isProcessing.value = false;
  }
};

/**
 * 开始轮询扫码状态
 */
const startScanMonitoring = () => {
  if (isScanning.value) return;

  isScanning.value = true;
  startTime.value = Date.now();
  remainSeconds.value = Math.ceil(timeout / 1000);

  scanInterval.value = setInterval(() => {
    if (startTime.value) {
      const elapsed = Date.now() - startTime.value;
      remainSeconds.value = Math.max(0, Math.ceil((timeout - elapsed) / 1000));
    }
    checkScanStatus();
  }, 2000);
};

/**
 * 检查扫码状态
 */
const checkScanStatus = async () => {
  if (!qrSessionId.value || !startTime.value || isProcessing.value) return;

  const elapsed = Date.now() - startTime.value;
  if (elapsed > timeout) {
    stopScanMonitoring();
    updateStatus("二维码已过期，请点击刷新二维码", "error");
    return;
  }

  try {
    const result = await yybPollQr(yybServer.value, qrSessionId.value);
    switch (result.status) {
      case "pending":
        if (remainSeconds.value % 10 <= 1 && remainSeconds.value > 0) {
          updateStatus(`请使用微信扫码登录 (${remainSeconds.value}秒)`, "success");
        }
        break;
      case "scanned":
        updateStatus("已扫码，请在手机上确认授权", "success");
        break;
      case "authorized":
        stopScanMonitoring();
        await handleAuthorized();
        break;
      case "expired":
        stopScanMonitoring();
        updateStatus("二维码已过期，请点击刷新二维码", "error");
        break;
      case "cancelled":
        stopScanMonitoring();
        updateStatus("已取消授权，请重新扫码", "error");
        break;
      default:
        break;
    }
  } catch (err: any) {
    // 会话被清理（404）时停止轮询
    if (String(err?.message || "").includes("404") || String(err?.message || "").includes("not found")) {
      stopScanMonitoring();
      updateStatus("扫码会话已失效，请重新获取二维码", "error");
      return;
    }
    console.warn("扫码状态检查失败", err);
  }
};

/**
 * 授权成功：确认会话保存账号 → 换取登录 code → 登录游戏
 */
const handleAuthorized = async () => {
  try {
    isProcessing.value = true;
    credentialRejected.value = false;
    updateStatus("授权成功，正在保存账号...", "success");

    const account = await yybConfirmQr(yybServer.value, qrSessionId.value!);
    const openid = account?.openid;
    if (!openid) {
      throw new Error("服务未返回账号 openid");
    }
    currentYybOpenid.value = openid;

    const nickname = account.nickname || "";
    updateStatus(`账号已保存（${nickname || openid}），正在登录游戏...`, "success");

    const bin = await yybLoginForBin(yybServer.value, openid, yybAppId.value.trim());
    updateStatus("登录凭证获取成功，正在获取角色列表...", "info");
    await saveAccount(bin.buffer as ArrayBuffer, nickname);

    // 刷新账号列表（新账号已入库）
    loadAccounts();
  } catch (err: any) {
    updateStatus("处理失败：" + (err?.message || "未知错误"), "error");
    console.error("应用宝扫码处理失败:", err);
  } finally {
    isProcessing.value = false;
  }
};

/**
 * 停止扫码监控
 */
const stopScanMonitoring = () => {
  isScanning.value = false;
  if (scanInterval.value) {
    clearInterval(scanInterval.value);
    scanInterval.value = null;
  }
};

/**
 * 保存账号（解析 bin 获取角色列表）
 */
const saveAccount = async (arrBuf: ArrayBuffer, nickname = "") => {
  const bin = new Uint8Array(arrBuf);
  currentBinData.value = bin.buffer;

  try {
    const listStr = await getServerList(bin.buffer);
    const parsedList = JSON.parse(listStr);
    if (parsedList && typeof parsedList === 'object') {
      serverListData.value = Object.values(parsedList).sort((a: any, b: any) => b.power - a.power);
    } else {
      serverListData.value = [];
    }
    if (serverListData.value.length === 0) {
      message.warning("该账号下没有可用角色");
      updateStatus("登录成功，但该账号下没有可用角色", "error");
    } else {
      message.success("获取服务器角色列表成功，请选择角色添加");
      updateStatus("登录成功，请选择角色添加", "success");
    }
  } catch (err: any) {
    console.error("Failed to get server list", err);
    serverListData.value = [];
    const errMsg = String(err?.message || "未知错误");
    // 游戏服务器拒绝凭证（如 -10001）：应用宝渠道产出的是小程序短凭证，
    // 游戏服务器只接受微信开放平台扫码（app-we）产出的长凭证，需引导用户改用微信扫码
    if (/\u9519\u8bef\u7801 -10001|\u62d2\u7edd\u8be5\u767b\u5f55\u51ed\u8bc1/.test(errMsg)) {
      credentialRejected.value = true;
      message.error("应用宝渠道获取的凭证被游戏服务器拒绝，请改用「微信扫码」导入", { duration: 6000 });
      updateStatus("应用宝渠道无法获取角色数据（登录凭证校验失败）", "error");
    } else {
      message.warning("获取服务器角色列表失败：" + errMsg);
      updateStatus("获取角色列表失败：" + errMsg, "error");
    }
  }

  // 尝试解析 bin 文件内容
  try {
    const binMsg = g_utils.parse(bin.buffer);
    let binData = binMsg.getData();
    if (!binData && (binMsg as any)._raw) {
      binData = { ...(binMsg as any)._raw };
    }
    binDecodedResult.value = JSON.stringify(binData, null, 2);
    originalBinData.value = binData;
  } catch (err: any) {
    console.error("Bin文件解析失败", err);
    binDecodedResult.value = "Bin文件解析失败: " + (err.message || err);
  }
};

const handleDownload = (roleInfo: any) => {
  if (!originalBinData.value) {
    message.error("Bin数据丢失，请重新扫码");
    return;
  }
  try {
    const newData = { ...originalBinData.value };
    newData.serverId = roleInfo.serverId;
    const newBinBuffer = g_utils.encode(newData) as ArrayBuffer;

    let sid = Number(roleInfo.serverId);
    let roleIndex = 0;

    if (sid >= 2000000) {
      roleIndex = 2;
      sid -= 2000000;
    } else if (sid >= 1000000) {
      roleIndex = 1;
      sid -= 1000000;
    }

    const serverNum = sid - 27;
    const fileName = `bin-${serverNum}服-${roleIndex}-${roleInfo.roleId}-${roleInfo.name}.bin`;

    downloadBinFile(fileName, newBinBuffer);
    message.success(`已开始下载: ${fileName}`);
  } catch (e: any) {
    console.error("下载失败", e);
    message.error("下载失败: " + e.message);
  }
};

const addSelectedRole = async (roleInfo: any) => {
  if (!originalBinData.value) {
    message.error("Bin数据丢失，请重新登录");
    return;
  }

  try {
    const newData = { ...originalBinData.value };
    newData.serverId = roleInfo.serverId;
    const newBinBuffer = g_utils.encode(newData) as ArrayBuffer;
    const tokenId = getTokenId(newBinBuffer);
    const roleToken = await transformToken(newBinBuffer);
    const roleName = roleInfo.name || `角色_${roleInfo.roleId}`;

    // 刷新indexDB数据库token数据 (保存原始bin)
    storeArrayBuffer(tokenId, newBinBuffer);

    // 同时备份到 localStorage，防止 IndexedDB 被清理后无法导出/刷新
    saveBinBackup(tokenId, newBinBuffer);

    let sid = Number(roleInfo.serverId);
    let roleIndex = 0;
    if (sid >= 2000000) {
      roleIndex = 2;
      sid -= 2000000;
    } else if (sid >= 1000000) {
      roleIndex = 1;
      sid -= 1000000;
    }
    const serverNum = sid - 27;

    const template = importForm.nameTemplate || "{name}-{index}-{id}";
    const finalName = template
      .replace(/{name}/g, () => roleName)
      .replace(/{index}/g, () => String(roleIndex))
      .replace(/{id}/g, () => String(roleInfo.roleId))
      .replace(/{server}/g, () => `${serverNum}服`);

    const exists = roleList.value.some(
      (r) => r.roleId === roleInfo.roleId && r.name === finalName
    );

    if (exists) {
      message.warning(`角色 ${finalName} 已在待添加列表中`);
      return;
    }

    roleList.value.push({
      id: tokenId,
      roleId: roleInfo.roleId,
      token: roleToken,
      name: finalName,
      server: `${serverNum}服`,
      roleIndex: roleIndex,
      wsUrl: importForm.wsUrl || "",
      importMethod: "yybQrcode",
      yybOpenid: currentYybOpenid.value || undefined,
      yybServer: yybServer.value.trim() || undefined,
      yybAppId: yybAppId.value.trim() || undefined,
    });

    message.success(`已添加角色: ${finalName}`);
  } catch (e: any) {
    console.error("添加角色失败", e);
    message.error("添加角色失败: " + e.message);
  }
};

const handleImport = async () => {
  if (roleList.value.length === 0) {
    message.error("请先扫码或选择已保存账号登录");
    return;
  }
  roleList.value.forEach((role) => {
    const gameToken = tokenStore.gameTokens.find((t) => t.id === role.id);
    if (gameToken) {
      tokenStore.updateToken(gameToken.id, {
        ...role,
      });
    } else {
      tokenStore.addToken({
        ...role,
      });
    }
  });
  message.success("Token添加成功");
  roleList.value = [];
  emit("ok");
};

const downloadBinFile = async (fileName: string, bin: ArrayBuffer | Uint8Array) => {
  const blob = new Blob([new Uint8Array(bin)], {
    type: "application/octet-stream",
  });
  await downloadFile(blob, fileName);
};

/**
 * 更新状态信息
 */
const updateStatus = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  statusMessage.value = msg;
  statusType.value = type;
};

/**
 * 重置二维码状态
 */
const resetQRCode = () => {
  stopScanMonitoring();
  qrSessionId.value = null;
  qrcodeUrl.value = null;
  updateStatus("点击获取应用宝登录二维码", "info");
};

// 服务地址变化时清空账号列表
watch(yybServer, () => {
  yybAccounts.value = [];
});

// 生命周期
onMounted(async () => {
  // 默认直接连接：进入页面自动静默拉起服务（EXE 内置托管 / Web dev 托管），无需手动操作
  const ready = await autoEnsureYybService();
  await refreshYybServiceStatus();
  // 服务就绪后自动加载已保存账号
  if (ready) {
    loadAccounts();
  }
});

onUnmounted(() => {
  stopScanMonitoring();
});
</script>

<style scoped lang="scss">
.yyb-qrcode-import {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
}

.login-flow-info {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);

  h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
    font-size: var(--font-size-md);
  }

  .flow-steps {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);

    li {
      margin-bottom: var(--spacing-xs);
      font-size: var(--font-size-sm);
    }
  }
}

.yyb-service-switch {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);

  .yyb-service-switch-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    .yyb-service-label {
      color: var(--text-primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
    }
  }

  .yyb-service-hint {
    margin-top: var(--spacing-xs);
    color: var(--text-tertiary);
    font-size: var(--font-size-xs, 12px);
  }
}

.yyb-accounts {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);

  .yyb-accounts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .yyb-account-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) 0;

    .yyb-account-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      flex-wrap: wrap;
      min-width: 0;

      .yyb-account-openid {
        width: 100%;
        font-size: var(--font-size-xs);
        color: var(--text-tertiary);
        word-break: break-all;
      }
    }
  }
}

.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl) 0;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  border: 2px dashed var(--border-light);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all var(--transition-normal);
  background: var(--bg-tertiary);

  &:hover {
    border-color: var(--primary-color);
    background: rgba(102, 126, 234, 0.05);
  }

  p {
    margin: var(--spacing-sm) 0 0 0;
    color: var(--text-tertiary);
    font-size: var(--font-size-sm);
  }
}

.qr-image {
  width: 200px;
  height: 200px;
  border: 2px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-small);
  }
}

.qr-status {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: center;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--border-radius-small);

  &.info {
    color: var(--text-secondary);
    background: var(--bg-tertiary);
  }

  &.success {
    color: var(--success-color);
    background: rgba(16, 185, 129, 0.1);
  }

  &.error {
    color: var(--error-color);
    background: rgba(239, 68, 68, 0.1);
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}
</style>
