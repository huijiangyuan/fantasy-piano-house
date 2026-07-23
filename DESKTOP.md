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
├── Cargo.toml          # Rust 依赖（tauri + rdev）
├── build.rs
├── tauri.conf.json     # 窗口/打包/权限描述配置
└── src/main.rs         # 键盘守卫（CGEventTap 封装）
DESKTOP.md              # 本文件
```

## 说明

- 本分支（`feat/desktop-kiosk`）与网页版（`main`，部署到 GitHub Pages）并存：
  `npm run build` 仍产出 GitHub Pages 用的 `dist/`（base 为 `/fantasy-piano-house/`），
  `npm run build:tauri` 产出 Tauri 用的 `dist/`（base 为 `/`）。
- 本工程在沙箱内无法运行 GUI / 授权，代码需在你的 Mac 上 `npm run tauri dev` 实测验证。
