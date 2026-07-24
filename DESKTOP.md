# 奇幻钢琴屋 · 桌面版（Tauri）构建指南

把网页钢琴封装成 macOS 桌面 `.app`，并在**系统级**拦截会破坏体验的按键：
F1–F12、Tab，以及所有 `Cmd+` 组合键（Cmd+Q 退出 / Cmd+W 关窗 / Cmd+R 刷新 /
Cmd+Tab 切 App / Cmd+Space 聚焦 等）。弹琴用的普通字母/数字键正常放行给网页发声。

底层用 [`rdev`](https://crates.io/crates/rdev)（macOS 即 `CGEventTap`），
`grab()` 回调返回 `None` 即「吞掉」该事件，返回 `Some(event)` 即放行。

> 网页端原有的 `preventDefault` + 焦点陷阱 + 音频恢复守卫仍然保留，
> 桌面封装是它们的「系统级补强」，二者叠加。

## 前置依赖（在你的 Mac 上准备）

1. **Rust 工具链**：`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. **Xcode Command Line Tools**：`xcode-select --install`
3. **Node 18+**（用于前端与 Tauri CLI）

## 构建 / 运行

```bash
# 1) 生成各尺寸图标（首次必做，会写入 src-tauri/icons/）
npx tauri icon public/favicon.svg

# 2) 安装依赖（含 @tauri-apps/cli）
npm install

# 3) 开发模式（热更新，会启动 .app 窗口）
npm run tauri dev

# 4) 打包成正式 .app / dmg
npm run tauri build
```

## 首次运行必须授权（关键）

桌面程序要拦截系统级按键，需要 macOS 授予两项权限：

- **系统设置 → 隐私与安全性 → 辅助功能**：允许「奇幻钢琴屋」
- **系统设置 → 隐私与安全性 → 输入监控**：允许「奇幻钢琴屋」

若未授权，键盘钩子会启动失败（终端会打印提示，并自动打开辅助功能设置页）。
授权后**重启一次 App** 即可生效。

## 仍然拦不住的按键（系统安全边界，任何普通 App 都拦不住）

- macOS：`Cmd+Tab`（切换 App）、`Cmd+Space`（聚焦搜索）、`Ctrl+F2`（菜单栏），
  以及「安全输入」场景（密码框聚焦、FileVault 锁屏时）会绕过钩子。
- 如需真正「锁死成单应用」，请用 **macOS 单应用模式（Single App Mode，需 Apple Configurator / MDM 监管设备）或引导式访问** 作为兜底。
- Windows：`Ctrl+Alt+Del`、`Win+L` 同理保留。

## 退出保险（借鉴 stretchly 的 strict 思路）

纯靠 rdev 吞键还不够——用户仍能从红绿灯按钮 / 菜单 Quit 关掉窗口。
因此又叠了 Tauri 原生事件的**三道保险**（见 `src-tauri/src/main.rs`）：

1. **防关窗**：`on_window_event` 拦截 `CloseRequested` → `api.prevent_close()`，点关闭/最小化按钮没反应。
2. **防退出 App**：`run()` 里拦截 `RunEvent::ExitRequested` → `api.prevent_exit()`，任何退出尝试都被拦下（前提是 `admin_exit` 标志未置位）。
3. **管理员专属退出键**：`Cmd + Shift + Q`。所有带 `Cmd` 的组合默认被吞，唯独这个放行
   并在钩子里通知主线程 `app_handle.exit(0)`；同时置位 `admin_exit` 标志让 `ExitRequested` 放行，
   让大人能随时关程序，小孩乱按 `Cmd+Q/W/Tab/F1–F12` 全部无效。

> stretchly 本身是「全屏盖屏（`setKiosk` + `setClosable(false)`），不抓键盘事件流」，
> 仅在 strict 模式挡 `close` 与 `before-quit`。我们走的是「rdev 抓键 + Tauri 原生事件兜底」双轨，
> 比 stretchly 更彻底（能吞掉 Cmd+Tab 之外的大部分系统键），但同样拦不住 macOS 系统保留键（见下）。

## 构建踩坑与版本约束（实测有效组合）

> 下面这些是沙箱内反复踩出来的坑，直接照抄版本即可，别随意升级。

- **rdev 版本**：只能用 `0.5.3`（`features = ["unstable_grab"]`）。
  `grab()` 需要 `unstable_grab` feature 才暴露；crates.io 上没有 `0.20` 之类的新版本，别照网上旧文写。
- **rdev 0.5 的 `Event` 没有 `modifiers` 字段**（只有 `time` / `name` / `event_type`），
  修饰键状态要在回调里用 `Cell<ModState>` 手动维护；否则闭包会变成 `FnMut` 触发
  `E0525`（`grab` 要求 `Fn`），编译不过。
- **`tauri.conf.json` 的 macOS 权限字段**：`tauri-build` 2.6.3 不认识旧式 `bundle.macOS.info`，
  要用 `infoPlist: "Info.plist"` 指向独立 plist 文件（已新建 `src-tauri/Info.plist`，
  内含 `NSAppleEventsUsageDescription` 与 `NSInputMonitoringUsageDescription` 中文授权文案）。
- **Tauri 2.11 已移除 `set_menu_bar_visible`**：别照旧教程调这个方法，会 `E0599`；
  菜单 Quit 已被 `ExitRequested` 拦截 + rdev 吞 `Cmd+Q` 双保险兜住，删掉不影响目标。
- **DMG 打包**：Tauri 默认 `bundle_dmg.sh` 用 `osascript`（Finder GUI 脚本）摆窗口，
  **无头/沙箱环境跑不起来**。改用纯 `hdiutil` 手工生成即可：

  ```bash
  cd src-tauri/target/release/bundle/macos
  hdiutil create -volname "奇幻钢琴屋" \
    -srcfolder "奇幻钢琴屋.app" \
    -format UDZO \
    "../dmg/奇幻钢琴屋_1.1.0_aarch64.dmg"
  ```

  本地有 GUI 时直接 `npm run tauri build` 会一并产出 `.app` 与 `.dmg`。

## 拦截规则（`src-tauri/src/main.rs`）

| 按键 | 处理 |
|------|------|
| F1–F12 | 吞掉（无论是否带修饰键） |
| Tab | 吞掉（焦点不逃出 App） |
| 任意 `Cmd+` 组合（含 `Ctrl+Cmd`） | 吞掉 |
| 普通字母 / 数字 / 空格 / Esc | 放行给网页钢琴 |

> `Esc` 故意放行：网页内用它从「游戏中」退回「开始页」；App 本身无法被键盘关闭（Cmd+Q 已被吞掉），符合儿童 kiosk 预期。

## 目录结构

```
src-tauri/
├── Cargo.toml          # Rust 依赖（tauri ^2 + rdev 0.5.3/unstable_grab）
├── Cargo.lock          # 锁定依赖（已提交）
├── build.rs
├── tauri.conf.json     # 窗口/打包配置，macOS 指向 infoPlist
├── Info.plist          # 独立权限描述（辅助功能/输入监控文案）
├── icons/              # npx tauri icon 生成的各尺寸图标
└── src/main.rs         # 键盘守卫 + 三道退出保险（CGEventTap 封装）
DESKTOP.md              # 本文件
```

## 说明

- 本分支（`feat/desktop-kiosk`）与网页版（`main`，部署到 GitHub Pages）并存：
  `npm run build` 仍产出 GitHub Pages 用的 `dist/`（base 为 `/fantasy-piano-house/`），
  `npm run build:tauri` 产出 Tauri 用的 `dist/`（base 为 `/`）。
- 本工程在沙箱内无法运行 GUI / 授权，代码需在你的 Mac 上 `npm run tauri dev` 实测验证。
