// 奇幻钢琴屋 · 桌面版
//
// 目标：把网页钢琴封成桌面 .app 后，在「系统级」拦截会破坏体验的按键
// （F1–F12、Tab、以及所有 Cmd+ 组合键：Cmd+Q 退出 / Cmd+W 关窗 / Cmd+R 刷新 /
// Cmd+Tab 切换 App / Cmd+Space 聚焦 等），同时把弹琴用的普通字母/数字键放行，
// 让网页继续发声。
//
// 实现：rdev 0.5 的 unstable_grab feature 在 macOS 底层使用 CGEventTap，
// 回调返回 None 即吞掉事件，返回 Some(event) 即放行。这补足了
// 「纯网页 + preventDefault」做不到的、浏览器/系统级快捷键拦截。
//
// 注意：rdev 0.5 的 Event 不含 modifiers 字段，修饰键状态需在本回调里手动跟踪。
//
// 额外保险（借鉴 stretchly 的 strict 思路，用 Tauri 原生事件实现）：
//   1) 用户点关闭/最小化按钮 → 拦截 CloseRequested，窗口关不掉；
//   2) 任何退出 App 的尝试（红绿灯关闭、菜单 Quit 等）→ 拦截 ExitRequested；
//   3) 管理员可用 Cmd+Shift+Q 主动退出（该组合在钩子里放行并触发退出）。

use rdev::{grab, Event, EventType, Key};
use std::cell::Cell;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::Sender;
use std::sync::Arc;
use tauri::Manager;

/// 管理员专属退出组合键：Cmd + Shift + Q。
/// 所有带 Cmd 的组合默认被吞，唯独这个放行并在主线程触发退出，
/// 让大人能在需要时关闭程序，而小孩乱按 Cmd+Q/W 等都无效。
const ADMIN_EXIT_KEY: Key = Key::KeyQ;

/// 手动维护的修饰键状态（rdev 0.5 的 Event 不含 modifiers 字段，需自行跟踪）。
#[derive(Clone, Copy, Default)]
struct ModState {
    meta: bool,
    shift: bool,
    ctrl: bool,
    alt: bool,
}

/// 判断某个按键（结合当前修饰键状态）是否需要被系统级拦截（吞掉）。
fn should_block(key: Key, mods: ModState) -> bool {
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
    // 3) 任何带 Cmd（macOS 的 Meta）的组合键 —— 覆盖 Cmd+Q/W/R/T/N/Space 等。
    || mods.meta
    || (mods.meta && mods.ctrl)
}

/// 主线程与键盘钩子线程之间的信号。
enum GuardSignal {
    Exit,
}

/// 安装系统级键盘守卫。必须在独立线程运行（grab 会阻塞当前线程的事件循环）。
fn install_keyboard_guard(tx: Sender<GuardSignal>, admin_exit: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        // 修饰键状态在回调内手动维护（用 Cell 满足 grab 对 Fn 而非 FnMut 的要求）。
        let mods = Cell::new(ModState::default());
        let callback = move |event: Event| -> Option<Event> {
            match event.event_type {
                EventType::KeyPress(key) => {
                    // 取出当前修饰键状态并原地更新。
                    let mut m = mods.get();
                    match key {
                        Key::MetaLeft | Key::MetaRight => m.meta = true,
                        Key::ShiftLeft | Key::ShiftRight => m.shift = true,
                        Key::ControlLeft | Key::ControlRight => m.ctrl = true,
                        Key::Alt => m.alt = true,
                        _ => {}
                    }
                    // 管理员退出组合：吞掉事件（不让系统做默认动作），通知主线程退出。
                    if key == ADMIN_EXIT_KEY && m.meta && m.shift {
                        admin_exit.store(true, Ordering::SeqCst);
                        let _ = tx.send(GuardSignal::Exit);
                        mods.set(m);
                        return None;
                    }
                    if should_block(key, m) {
                        mods.set(m);
                        return None; // 吞掉：系统不会收到，也不会触发任何快捷键
                    }
                    mods.set(m);
                    Some(event) // 放行给网页钢琴
                }
                EventType::KeyRelease(key) => {
                    // 松开修饰键时回落状态。
                    let mut m = mods.get();
                    match key {
                        Key::MetaLeft | Key::MetaRight => m.meta = false,
                        Key::ShiftLeft | Key::ShiftRight => m.shift = false,
                        Key::ControlLeft | Key::ControlRight => m.ctrl = false,
                        Key::Alt => m.alt = false,
                        _ => {}
                    }
                    mods.set(m);
                    Some(event)
                }
                // 其它事件（鼠标等）一律放行。
                _ => Some(event),
            }
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
    // 管理员退出标志：钩子线程置位，RunEvent 据此放行真正的退出。
    let admin_exit = Arc::new(AtomicBool::new(false));
    let admin_exit_for_run = admin_exit.clone();

    tauri::Builder::default()
        .setup(move |app| {
            // 信号通道：键盘钩子检测到管理员退出键时通知主线程。
            let (tx, rx) = std::sync::mpsc::channel::<GuardSignal>();
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if rx.recv().is_ok() {
                    app_handle.exit(0);
                }
            });

            let window = app.get_webview_window("main").unwrap();
            // 安装系统级键盘守卫（吞 F/Tab/Cmd+，放行字母与 Cmd+Shift+Q）。
            install_keyboard_guard(tx, admin_exit.clone());
            let _ = window;
            Ok(())
        })
        // 保险 1：拦截关闭/最小化窗口，防止误触退出界面。
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        // 保险 2：拦截任何退出 App 的尝试；管理员 Cmd+Shift+Q 已置标志，放行。
        .run(move |_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if !admin_exit_for_run.load(Ordering::SeqCst) {
                    api.prevent_exit();
                }
            }
        });
}
