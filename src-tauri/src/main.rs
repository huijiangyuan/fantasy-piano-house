// 奇幻钢琴屋 · 桌面版
//
// 目标：把网页钢琴封成桌面 .app 后，在「系统级」拦截会破坏体验的按键
// （F1–F12、Tab，以及所有 Cmd+ 组合键：Cmd+Q 退出 / Cmd+W 关窗 / Cmd+R 刷新 /
// Cmd+Tab 切换 App / Cmd+Space 聚焦 等），同时把弹琴用的普通字母/数字键放行，
// 让网页继续发声。
//
// 实现：直接用 CoreGraphics 的 CGEventTap，挂在 kCGHIDEventTap（键盘硬件层，
// 比 rdev 的 session 层更低），回调里把要拦截的按键事件类型改成 Null（= 吞掉），
// 放行则返回原事件。这补足了「纯网页 + preventDefault」做不到的系统级快捷键拦截。
//
// 相比 rdev 的两个改进：
//   1) 直接在回调读 CGEventGetFlags 判断 Cmd 组合，无需像 rdev 那样手动维护修饰键状态；
//   2) 当系统因超时被禁用 tap（kCGEventTapDisabledByEventTap）时，在回调里
//      CGEventTapEnable 重新启用，避免“拦截莫名其妙失效”。
//
// 额外保险（借鉴 stretchly 的 strict 思路，用 Tauri 原生事件实现）：
//   1) 禁用窗口“关闭/最小化”按钮（setClosable/setMinimizable(false)）+ 拦截 CloseRequested；
//   2) 拦截任何退出 App 的尝试（RunEvent::ExitRequested），仅管理员 Cmd+Shift+Q 可退出。

use std::sync::mpsc::channel;
use tauri::Manager;

/// 主线程与键盘钩子线程之间的信号。
#[derive(Clone, Copy)]
enum GuardSignal {
    Exit,
}

#[cfg(target_os = "macos")]
mod keyboard_guard {
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSAutoreleasePool;
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGEventType, EventField};
    use std::os::raw::c_void;
    use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};
    use std::sync::mpsc::Sender;
    use std::sync::OnceLock;
    use tauri::AppHandle;

    // ===== 以下裸 FFI 与 rdev 0.5.3 完全一致（ABI 稳定）=====
    pub type CFMachPortRef = *const c_void;
    pub type CFIndex = u64;
    pub type CFAllocatorRef = id;
    pub type CFRunLoopSourceRef = id;
    pub type CFRunLoopRef = id;
    pub type CFRunLoopMode = id;
    pub type CGEventTapProxy = id;
    pub type CGEventRef = CGEvent;
    pub type CGEventTapPlacement = u32;

    #[allow(non_upper_case_globals)]
    pub const kCGHeadInsertEventTap: u32 = 0;

    #[allow(non_upper_case_globals)]
    #[repr(u32)]
    pub enum CGEventTapOption {
        Default = 0,
        ListenOnly = 1,
    }

    pub type CGEventMask = u64;

    #[link(name = "Cocoa", kind = "framework")]
    extern "C" {
        pub fn CGEventTapCreate(
            tap: CGEventTapLocation,
            place: CGEventTapPlacement,
            options: CGEventTapOption,
            eventsOfInterest: CGEventMask,
            callback: QCallback,
            user_info: id,
        ) -> CFMachPortRef;
        pub fn CFMachPortCreateRunLoopSource(
            allocator: CFAllocatorRef,
            tap: CFMachPortRef,
            order: CFIndex,
        ) -> CFRunLoopSourceRef;
        pub fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: CFRunLoopMode);
        pub fn CFRunLoopGetCurrent() -> CFRunLoopRef;
        pub fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
        pub fn CFRunLoopRun();
        pub static kCFRunLoopCommonModes: CFRunLoopMode;
    }

    pub type QCallback = unsafe extern "C" fn(
        proxy: CGEventTapProxy,
        _type: CGEventType,
        cg_event: CGEventRef,
        user_info: *mut c_void,
    ) -> CGEventRef;

    // macOS 键码
    const KEYCODE_Q: u32 = 12;
    const KEYCODE_TAB: u32 = 48;
    const FN_KEYCODES: [u32; 12] = [122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111];

    // 管理员专属退出组合：Cmd + Shift + Q。
    static ADMIN_EXIT: AtomicBool = AtomicBool::new(false);
    static EXIT_SENDER: OnceLock<Sender<crate::GuardSignal>> = OnceLock::new();
    // tap 句柄：创建后保存，回调里被系统禁用时用来重新启用（CGEventTapCreate 的
    // user_info 无法在创建时引用自身，故用原子指针保存）。
    static TAP_HANDLE: AtomicPtr<c_void> = AtomicPtr::new(std::ptr::null_mut());

    pub fn set_exit_sender(tx: Sender<crate::GuardSignal>) {
        let _ = EXIT_SENDER.set(tx);
    }

    pub fn admin_exit_requested() -> bool {
        ADMIN_EXIT.load(Ordering::SeqCst)
    }

    /// 判断某个按键（结合当前修饰键 flags）是否需要被系统级拦截（吞掉）。
    fn should_block(code: u32, flags: CGEventFlags) -> bool {
        if FN_KEYCODES.contains(&code) {
            return true; // F1–F12 无论是否带修饰键，一律拦截
        }
        if code == KEYCODE_TAB {
            return true; // Tab：避免键盘焦点逃出应用
        }
        if flags.intersects(CGEventFlags::CGEventFlagCommand) {
            return true; // 任何带 Cmd 的组合键（覆盖 Cmd+Q/W/R/T/N/Space 等）
        }
        false
    }

    unsafe extern "C" fn raw_callback(
        _proxy: CGEventTapProxy,
        event_type: CGEventType,
        cg_event: CGEventRef,
        _user_info: *mut c_void,
    ) -> CGEventRef {
        // tap 被系统临时禁用（超时/用户操作）→ 立刻重新启用，避免拦截静默失效。
        // 覆盖 Apple 的 kCGEventTapDisabledByEventTap(21) 与 core-graphics 的
        // TapDisabledByTimeout(0xFFFFFFFE)/TapDisabledByUserInput(0xFFFFFFFF)。
        let et = event_type as u32;
        if et == 21 || et == 0xFFFFFFFE || et == 0xFFFFFFFF {
            let handle = TAP_HANDLE.load(Ordering::SeqCst);
            if !handle.is_null() {
                CGEventTapEnable(handle as CFMachPortRef, true);
            }
            return cg_event;
        }

        // 只处理按下事件；松开/修饰键变化一律放行。
        if let CGEventType::KeyDown = event_type {
            let code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u32;
            let flags = cg_event.get_flags();

            // 管理员退出：吞掉事件（不让系统做默认动作），通知主线程退出。
            if code == KEYCODE_Q
                && flags.intersects(CGEventFlags::CGEventFlagCommand)
                && flags.intersects(CGEventFlags::CGEventFlagShift)
            {
                ADMIN_EXIT.store(true, Ordering::SeqCst);
                if let Some(tx) = EXIT_SENDER.get() {
                    let _ = tx.send(crate::GuardSignal::Exit);
                }
                cg_event.set_type(CGEventType::Null);
                return cg_event;
            }

            if should_block(code, flags) {
                cg_event.set_type(CGEventType::Null);
                return cg_event;
            }
        }

        cg_event
    }

    /// 安装系统级键盘守卫。必须在独立线程运行（CFRunLoopRun 会阻塞当前线程）。
    pub fn install(app: AppHandle) {
        std::thread::spawn(move || unsafe {
            let _pool = NSAutoreleasePool::new(nil);
            let tap = CGEventTapCreate(
                CGEventTapLocation::HID,
                kCGHeadInsertEventTap,
                CGEventTapOption::Default,
                !0u64, // 监听全部事件，确保能收到“tap 被禁用”通知
                raw_callback,
                std::ptr::null_mut(),
            );
            if tap.is_null() {
                // 多半是未授予「输入监控」权限。在主线程打开对应设置页。
                let _ = app.run_on_main_thread(move || {
                    let _ = std::process::Command::new("open").arg(
                        "x-apple.systempreferences:com.apple.preference.security?Privacy_InputMonitoring",
                    ).spawn();
                });
                eprintln!("[奇幻钢琴屋] 键盘守卫启动失败：请授予「输入监控」权限后重启 App");
                return;
            }

            let _loop = CFMachPortCreateRunLoopSource(nil, tap, 0);
            if _loop.is_null() {
                eprintln!("[奇幻钢琴屋] 键盘守卫运行循环创建失败");
                return;
            }
            let current_loop = CFRunLoopGetCurrent();
            CFRunLoopAddSource(current_loop, _loop, kCFRunLoopCommonModes);
            CGEventTapEnable(tap, true);
            TAP_HANDLE.store(tap as *mut c_void, Ordering::SeqCst); // 供回调被禁用时重新启用
            CFRunLoopRun();
        });
    }
}

#[cfg(not(target_os = "macos"))]
mod keyboard_guard {
    use tauri::AppHandle;
    use std::sync::mpsc::Sender;
    use crate::GuardSignal;
    pub fn set_exit_sender(_: Sender<GuardSignal>) {}
    pub fn admin_exit_requested() -> bool {
        false
    }
    pub fn install(_: AppHandle) {}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .setup(move |app| {
            // 信号通道：键盘钩子检测到管理员退出键时通知主线程。
            let (tx, rx) = channel::<GuardSignal>();
            keyboard_guard::set_exit_sender(tx);
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if rx.recv().is_ok() {
                    app_handle.exit(0);
                }
            });

            // 禁用“关闭 / 最小化”按钮（红 X、黄 - 直接变灰不可点），红绿灯只剩绿色缩放。
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_closable(false);
                let _ = window.set_minimizable(false);
            }

            // 安装系统级键盘守卫（吞 F/Tab/Cmd+，放行字母与 Cmd+Shift+Q）。
            keyboard_guard::install(app.handle().clone());
            Ok(())
        })
        // 保险 1：兜底拦截关闭请求（按钮已禁用，这里防程序化关闭）。
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
                if !keyboard_guard::admin_exit_requested() {
                    api.prevent_exit();
                }
            }
        });
}
