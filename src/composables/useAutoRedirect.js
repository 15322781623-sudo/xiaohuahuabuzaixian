/**
 * 自动跳转到批量日常页面（各页面独立开关，倒计时可自定义）
 *
 * 配置持久化到 localStorage：
 * - autoRedirectEnabled:home / autoRedirectEnabled:tokens / autoRedirectEnabled:dashboard
 *   "1" 开启 / "0" 关闭；未设置时使用各页面默认值（首页开启，其余关闭）
 * - autoRedirectSeconds: 倒计时秒数（10-3600，默认 120，各页面共用）
 */
import { ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";

export const AUTO_REDIRECT_SECONDS_KEY = "autoRedirectSeconds";
export const DEFAULT_AUTO_REDIRECT_SECONDS = 120;

/** 页面开关列表：key=页面标识，defaultEnabled=未设置时的默认值 */
export const AUTO_REDIRECT_PAGES = [
  { key: "home", label: "首页", defaultEnabled: true },
  { key: "tokens", label: "Token管理", defaultEnabled: false },
  { key: "dashboard", label: "控制台", defaultEnabled: false },
];

export const isPageRedirectEnabled = (pageKey) => {
  const page = AUTO_REDIRECT_PAGES.find((p) => p.key === pageKey);
  const v = localStorage.getItem(`autoRedirectEnabled:${pageKey}`);
  if (v === null) return page ? page.defaultEnabled : false;
  return v === "1";
};

export const setPageRedirectEnabled = (pageKey, on) => {
  localStorage.setItem(`autoRedirectEnabled:${pageKey}`, on ? "1" : "0");
};

export const getAutoRedirectSeconds = () => {
  let seconds = parseInt(localStorage.getItem(AUTO_REDIRECT_SECONDS_KEY), 10);
  if (!Number.isFinite(seconds) || seconds < 10) seconds = DEFAULT_AUTO_REDIRECT_SECONDS;
  if (seconds > 3600) seconds = 3600;
  return seconds;
};

export const setAutoRedirectSeconds = (seconds) => {
  localStorage.setItem(AUTO_REDIRECT_SECONDS_KEY, String(seconds || DEFAULT_AUTO_REDIRECT_SECONDS));
};

/** 设置面板状态（导航栏/Token管理页/个人设置 三处入口共用） */
export const useAutoRedirectSettings = () => {
  const pageStates = ref(
    AUTO_REDIRECT_PAGES.map((p) => ({ ...p, enabled: isPageRedirectEnabled(p.key) })),
  );
  const seconds = ref(getAutoRedirectSeconds());

  const togglePage = (key, on) => {
    setPageRedirectEnabled(key, on);
    const item = pageStates.value.find((p) => p.key === key);
    if (item) item.enabled = on;
  };

  const saveSeconds = (v) => {
    seconds.value = v;
    setAutoRedirectSeconds(v);
  };

  return { pageStates, seconds, togglePage, saveSeconds };
};

/** 页面侧调用：useAutoRedirect("home" | "tokens" | "dashboard") */
export const useAutoRedirect = (pageKey) => {
  const router = useRouter();
  const message = useMessage();
  const countdown = ref(0);
  let autoRedirectTimer = null;
  let countdownTimer = null;

  const clearTimers = () => {
    if (autoRedirectTimer) {
      clearTimeout(autoRedirectTimer);
      autoRedirectTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  /** 页面挂载时调用：该页面开关关闭时不启动 */
  const startAutoRedirect = () => {
    if (!isPageRedirectEnabled(pageKey)) return;
    const seconds = getAutoRedirectSeconds();
    countdown.value = seconds;
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);
    autoRedirectTimer = setTimeout(() => {
      router.push("/admin/batch-daily-tasks");
    }, seconds * 1000);
  };

  /** 手动取消本次跳转 */
  const cancelAutoRedirect = () => {
    clearTimers();
    countdown.value = 0;
    message.info("已取消自动跳转");
  };

  onUnmounted(clearTimers);

  return { countdown, startAutoRedirect, cancelAutoRedirect };
};
