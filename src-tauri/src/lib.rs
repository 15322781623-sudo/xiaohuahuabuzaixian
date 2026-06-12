use tauri::Manager;
use std::sync::atomic::{AtomicBool, Ordering};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![prevent_sleep, allow_sleep])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
