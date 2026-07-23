// 奇幻钢琴屋 · 桌面版
//
// 目标：把网页钢琴封成桌面 .app 后，在「系统级」拦截会破坏体验的按键
// （F1–F12、Tab、以及所有 Cmd+ 组合键：Cmd+Q 退出 / Cmd+W 关窗 / Cmd+R 刷新 /
// Cmd+Tab 切换 App / Cmd+Space 聚焦 等），同时把弹琴用的普通字母/数字键放行，
// 让网页继续发声。
//
// 实现：rdev::grab 在 macOS 底层使用 CGEventTap，回调返回 None 即吞掉事件，
// 返回 Some(event) 即放行。这补足了「纯网页 + preventDefault」做不到的、
// 浏览器/系统级快捷键拦截。

use rdev::{grab, Event, EventType, Key, Modifiers};
use std::process::Command;
use tauri::Manager;

/// 判断某个按键事件是否需要被系统级拦截（吞掉）。
fn should_block(event: &Event) -> bool {
    match event.event_type {
        EventType::KeyPress(key) => {
            // 1) 所有功能键 F1–F12，无论是否带修饰键，一律拦截。
            matches!(
                key,
                Key::F1
                    | Key::F2
                    | Key::F3
                    | Key::F4
                    | Key::F5
                    | Key::F6
                    | Key::F7
                    | Key::F8
                    | Key::F9
                    | Key::F10
                    | Key::F11
                    | Key::F12
            )
            // 2) Tab：避免键盘焦点逃出应用（网页内的焦点陷阱已处理，这里再兜底）。
            || key == Key::Tab
            // 3) 任何带 Cmd（macOS 的 Meta）的组合键 —— 覆盖 Cmd+Q/W/R/T/N/Space/`
            //    以及 Ctrl+Cmd 组合（登出等）。这是拦截「退出/切应用/刷新」的关键。
            || event.modifiers.contains(Modifiers::META)
            || (event.modifiers.contains(Modifiers::META)
                && event.modifiers.contains(Modifiers::CTRL))
        }
        // 松开键与其它事件一律放行（保证钢琴 keyup 正常、不卡音）。
        _ => false,
    }
}

/// 安装系统级键盘守卫。必须在独立线程运行（grab 会阻塞当前线程的事件循环）。
fn install_keyboard_guard() {
    std::thread::spawn(|| {
        let callback = |event: Event| -> Option<Event> {
            if let EventType::KeyPress(_) = event.event_type {
                if should_block(&event) {
                    return None; // 吞掉：系统不会收到，也不会触发任何快捷键
                }
            }
            Some(event) // 放行给网页钢琴
        };

        if let Err(e) = grab(callback) {
            // 多半是未授予「辅助功能 / 输入监控」权限。提示用户去系统设置开启。
            eprintln!("[奇幻钢琴屋] 键盘钩子启动失败（可能需要系统授权）: {:?}", e);
            let _ = Command::new("open")
                .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
                .spawn();
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 首次启动给个提示窗口说明需要授权（轻量，不依赖额外插件）。
            let window = app.get_webview_window("main").unwrap();
            install_keyboard_guard();
            let _ = window;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
