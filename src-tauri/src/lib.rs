use tauri::Manager;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::process::Child;

mod proxy;

// 应用宝协议服务子进程（随主程序生命周期管理）
static YYB_CHILD: Mutex<Option<Child>> = Mutex::new(None);

// 全局状态: 是否正在阻止休眠
static PREVENTING_SLEEP: AtomicBool = AtomicBool::new(false);

/// 阻止系统休眠
#[tauri::command]
fn prevent_sleep() -> Result<(), String> {
  #[cfg(windows)]
  {
    use winapi::um::winbase::SetThreadExecutionState;
    
    // ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
    const ES_CONTINUOUS: u32 = 0x80000000;
    const ES_SYSTEM_REQUIRED: u32 = 0x00000001;
    const ES_DISPLAY_REQUIRED: u32 = 0x00000002;
    
    let result = unsafe {
      SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED)
    };
    
    if result == 0 {
      return Err("Failed to prevent sleep".to_string());
    }
    
    PREVENTING_SLEEP.store(true, Ordering::SeqCst);
    log::info!("Windows: 防休眠已启用");
    Ok(())
  }
  
  #[cfg(not(windows))]
  {
    PREVENTING_SLEEP.store(true, Ordering::SeqCst);
    log::info!("非Windows平台: 防休眠标记已设置");
    Ok(())
  }
}

/// 允许系统休眠
#[tauri::command]
fn allow_sleep() -> Result<(), String> {
  #[cfg(windows)]
  {
    use winapi::um::winbase::SetThreadExecutionState;
    
    // ES_CONTINUOUS
    const ES_CONTINUOUS: u32 = 0x80000000;
    
    let result = unsafe {
      SetThreadExecutionState(ES_CONTINUOUS)
    };
    
    if result == 0 {
      return Err("Failed to allow sleep".to_string());
    }
    
    PREVENTING_SLEEP.store(false, Ordering::SeqCst);
    log::info!("Windows: 防休眠已关闭");
    Ok(())
  }
  
  #[cfg(not(windows))]
  {
    PREVENTING_SLEEP.store(false, Ordering::SeqCst);
    log::info!("非Windows平台: 防休眠标记已清除");
    Ok(())
  }
}

/// 检测应用宝服务端口是否已被占用（服务已运行）
fn yyb_port_in_use() -> bool {
  use std::net::TcpStream;
  use std::time::Duration;
  "127.0.0.1:8000"
    .parse()
    .ok()
    .map(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok())
    .unwrap_or(false)
}

/// 自启动标记文件路径（%APPDATA%/<identifier>/yyb-autostart）：内容 "1" 自启动 / "0" 不自启动，缺失默认自启动
fn yyb_autostart_path<M: tauri::Manager<tauri::Wry>>(mgr: &M) -> Option<std::path::PathBuf> {
  mgr
    .path()
    .app_data_dir()
    .ok()
    .map(|d| d.join("yyb-autostart"))
}

fn yyb_autostart_enabled<M: tauri::Manager<tauri::Wry>>(mgr: &M) -> bool {
  yyb_autostart_path(mgr)
    .and_then(|p| std::fs::read_to_string(p).ok())
    .map(|s| s.trim() != "0")
    .unwrap_or(true) // 首次运行无标记文件，保持原有默认自启动行为
}

/// 应用宝服务子进程是否存活（仅本程序拉起的服务）
fn yyb_child_alive() -> bool {
  if let Ok(mut guard) = YYB_CHILD.lock() {
    if let Some(child) = guard.as_mut() {
      return matches!(child.try_wait(), Ok(None));
    }
  }
  false
}

/// 启动应用宝协议服务（yyb-go）：
/// 优先使用主程序同目录的 yyb-go.exe（安装包分发），数据目录放在 app_data 下保证可写。
/// 返回 "started" / "already-running" / "not-found" / "error"
fn do_start_yyb_service<M: tauri::Manager<tauri::Wry>>(mgr: &M) -> &'static str {
  if yyb_port_in_use() {
    log::info!("应用宝服务已在运行 (127.0.0.1:8000)，跳过启动");
    return "already-running";
  }

  let exe_dir = match std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.to_path_buf())) {
    Some(d) => d,
    None => {
      log::warn!("无法获取主程序目录，无法启动应用宝服务");
      return "error";
    }
  };

  let mut exe_path = exe_dir.join("yyb-go.exe");
  if !exe_path.exists() {
    // 兼容不同打包布局：安装目录平铺/子目录、Tauri resource_dir 平铺/子目录
    let mut candidates: Vec<std::path::PathBuf> = vec![exe_dir.join("yyb_go.rar").join("yyb-go.exe")];
    if let Ok(rd) = mgr.path().resource_dir() {
      candidates.push(rd.join("yyb-go.exe"));
      candidates.push(rd.join("yyb_go.rar").join("yyb-go.exe"));
    }
    for c in candidates {
      if c.exists() {
        exe_path = c;
        break;
      }
    }
  }
  if !exe_path.exists() {
    // 开发调试可用环境变量指定路径
    if let Ok(custom) = std::env::var("YYB_GO_EXE") {
      let p = std::path::PathBuf::from(custom);
      if p.exists() {
        exe_path = p;
      }
    }
  }
  if !exe_path.exists() {
    log::info!("未找到 yyb-go.exe，应用宝服务未随包分发，无法启动");
    return "not-found";
  }

  // 数据目录必须可写（安装目录通常只读）：%APPDATA%/com.xyzw.tokenmanager/yyb-resource
  let res_dir = mgr
    .path()
    .app_data_dir()
    .map(|d| d.join("yyb-resource"))
    .unwrap_or_else(|_| exe_dir.join("yyb-resource"));
  if let Err(e) = std::fs::create_dir_all(&res_dir) {
    log::warn!("创建应用宝服务数据目录失败: {}", e);
    return "error";
  }

  let mut cmd = std::process::Command::new(&exe_path);
  cmd
    .arg("-host").arg("127.0.0.1")
    .arg("-port").arg("8000")
    .arg("-resource-root").arg(&res_dir)
    .current_dir(&res_dir)
    .stdin(std::process::Stdio::null())
    .stdout(std::process::Stdio::null())
    .stderr(std::process::Stdio::null());
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
  }

  match cmd.spawn() {
    Ok(child) => {
      log::info!("应用宝服务已启动 (pid {}): {}", child.id(), exe_path.display());
      if let Ok(mut guard) = YYB_CHILD.lock() {
        *guard = Some(child);
      }
      "started"
    }
    Err(e) => {
      log::warn!("应用宝服务启动失败: {}", e);
      "error"
    }
  }
}

/// 停止应用宝服务（仅能停止本程序拉起的子进程；退出时也会调用）
fn stop_yyb_service() {
  if let Ok(mut guard) = YYB_CHILD.lock() {
    if let Some(mut child) = guard.take() {
      let _ = child.kill();
      let _ = child.wait();
      log::info!("应用宝服务已停止");
    }
  }
}

/// 手动启动应用宝协议服务（前端开关控制）
#[tauri::command]
fn start_yyb_service_cmd(app: tauri::AppHandle) -> Result<String, String> {
  let r = do_start_yyb_service(&app);
  if r == "error" {
    Err("应用宝服务启动失败".to_string())
  } else {
    Ok(r.to_string())
  }
}

/// 停止应用宝协议服务（仅本程序拉起的实例）
#[tauri::command]
fn stop_yyb_service_cmd() -> Result<String, String> {
  let managed = yyb_child_alive();
  stop_yyb_service();
  Ok(if managed { "stopped".to_string() } else { "not-managed".to_string() })
}

/// 应用宝服务状态：running=端口可达；managed=本程序拉起的子进程存活
#[tauri::command]
fn yyb_service_status() -> std::collections::HashMap<String, bool> {
  let mut m = std::collections::HashMap::new();
  m.insert("running".to_string(), yyb_port_in_use());
  m.insert("managed".to_string(), yyb_child_alive());
  m
}

/// 设置应用宝服务随主程序自启动（开关持久化到 app_data 标记文件）
#[tauri::command]
fn set_yyb_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
  let path = yyb_autostart_path(&app).ok_or("无法获取应用数据目录")?;
  if let Some(parent) = path.parent() {
    let _ = std::fs::create_dir_all(parent);
  }
  std::fs::write(&path, if enabled { "1" } else { "0" })
    .map_err(|e| format!("写入自启动标记失败: {}", e))
}

/// 读取应用宝服务自启动开关（缺失默认 true）
#[tauri::command]
fn get_yyb_autostart(app: tauri::AppHandle) -> bool {
  yyb_autostart_enabled(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .setup(|app| {
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;

      // 只在调试模式下打开开发者工具
      #[cfg(debug_assertions)]
      if let Some(window) = app.get_webview_window("main") {
        window.open_devtools();
      }

      // 应用宝协议服务：按自启动开关决定是否随主程序拉起（开关由前端 set_yyb_autostart 持久化）
      if yyb_autostart_enabled(app.handle()) {
        do_start_yyb_service(app.handle());
      } else {
        log::info!("应用宝服务自启动已关闭，跳过自动启动");
      }

      // ★ wx_mini_1 方案 B: 启动 Rust 本地代理，补齐 Origin/Referer/UA
      proxy::start_proxy_server();

      // ★ 注入 JS Hook：XHR/fetch/WebSocket 重定向到本地代理
      if let Some(window) = app.get_webview_window("main") {
        let script = format!(r#"
(function() {{
    'use strict';
    if (window.__WX_PROXY_INJECTED__) return;
    window.__WX_PROXY_INJECTED__ = true;

    var PROXY_HTTP = 'http://127.0.0.1:{port}/proxy';
    var PROXY_WS   = 'ws://127.0.0.1:{port}/ws';

    function isGameDomain(url) {{
        if (!url) return false;
        var s = String(url);
        return s.indexOf('hortorgames.com') !== -1 ||
               s.indexOf('servicewechat.com') !== -1;
    }}

    // ── Hook XMLHttpRequest ──
    var OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {{
        var xhr = new OrigXHR();
        var origOpen = xhr.open;
        xhr.open = function(method, url, async, user, password) {{
            this.__wx_url = url;
            this.__wx_method = method;
            this.__wx_is_game = isGameDomain(url);
            if (this.__wx_is_game) url = PROXY_HTTP;
            return origOpen.call(this, method, url, async, user, password);
        }};
        var origSetHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(name, value) {{
            var lower = String(name).toLowerCase();
            if (lower === 'origin' || lower === 'referer' || lower === 'user-agent' ||
                lower === 'xweb_xhr' || lower === 'x-requested-with') return;
            return origSetHeader.apply(this, arguments);
        }};
        var origSend = xhr.send;
        xhr.send = function(body) {{
            if (this.__wx_is_game) {{
                try {{
                    origSetHeader.call(this, 'X-Target-Url', this.__wx_url);
                    origSetHeader.call(this, 'X-Target-Method', this.__wx_method);
                }} catch(e) {{}}
            }}
            return origSend.apply(this, arguments);
        }};
        return xhr;
    }};
    window.XMLHttpRequest.prototype = OrigXHR.prototype;

    // ── Hook fetch ──
    var origFetch = window.fetch;
    window.fetch = function(input, init) {{
        var url = typeof input === 'string' ? input : (input && input.url);
        if (isGameDomain(url)) {{
            init = init || {{}};
            init.headers = init.headers || {{}};
            if (init.headers instanceof Headers) {{
                init.headers.set('X-Target-Url', url);
                init.headers.set('X-Target-Method', (init.method || 'GET').toUpperCase());
                init.headers.delete('Origin');
                init.headers.delete('Referer');
                init.headers.delete('User-Agent');
            }} else {{
                init.headers['X-Target-Url'] = url;
                init.headers['X-Target-Method'] = (init.method || 'GET').toUpperCase();
                delete init.headers['Origin'];
                delete init.headers['Referer'];
                delete init.headers['User-Agent'];
            }}
            input = PROXY_HTTP;
        }}
        return origFetch.call(this, input, init);
    }};

    // ── Hook WebSocket（已禁用，WS 直连游戏服务器）──
    // var OrigWS = window.WebSocket;
    // window.WebSocket = function(url, protocols) {{
    //     if (isGameDomain(url)) {{
    //         url = PROXY_WS + '?target=' + encodeURIComponent(url);
    //     }}
    //     return protocols ? new OrigWS(url, protocols) : new OrigWS(url);
    // }};
    // window.WebSocket.prototype = OrigWS.prototype;

    console.log('[wx_proxy] XHR/fetch 已重定向到本地代理 :{port}（WS 直连）');
}})();
"#, port = proxy::PROXY_PORT);
        let _ = window.eval(&script);
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      prevent_sleep,
      allow_sleep,
      start_yyb_service_cmd,
      stop_yyb_service_cmd,
      yyb_service_status,
      set_yyb_autostart,
      get_yyb_autostart
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|_app_handle, event| {
    if let tauri::RunEvent::Exit = event {
      stop_yyb_service();
    }
  });
}
