# 🎹 奇幻钢琴屋 (Fantasy Piano House)

一款可爱且充满互动的网页端创意钢琴应用，让你在浏览器中也能体验弹奏的乐趣！本项目完全运行在客户端，无需繁琐的安装，点开即玩。

## 🌟 功能特色 (Features)

* **三种游玩模式 (Three Play Modes):**
  * 🎹 **自由弹奏 (Free Play):** 尽情发挥创意，自由弹奏你喜欢的旋律。
  * 🎵 **学习名曲 (Learn Songs):** 跟着掉落的音符提示，学习弹奏内置的经典曲目（如《小星星》、《两只老虎》、《欢乐颂》等）。
  * 🎧 **DJ 模式 (DJ Mode):** 摇身一变成为 DJ，使用键盘触发动感鼓点、贝斯和合成器音效，体验电音派对！
* **🐰 可爱吉祥物 (Interactive Mascot):** 伴随你弹奏的可爱小兔子，会根据你的弹奏状态做出各种逗趣的反应和表情。
* **✨ 丰富的视觉特效 (Visual Effects):** 每次正确的弹奏都会触发绚丽的粒子特效，并且内置连击（Combo）系统，让弹奏更有节奏感。
* **🔊 纯净的音频体验 (Web Audio API):** 底层采用原生的 Web Audio API 实时合成音频，包含清脆的钢琴声以及 DJ 模式下的多种定制音色。

## 🛠️ 技术栈 (Tech Stack)

* **核心框架:** React 18 + TypeScript
* **构建工具:** Vite
* **样式框架:** Tailwind CSS
* **动画库:** Framer Motion / `motion/react`
* **图标库:** Lucide React
* **音频处理:**原生 Web Audio API

## 🎮 游玩指南 (How to Play)

* **桌面端:**
  * **白键:** 使用键盘上的 `A`, `S`, `D`, `F`, `G`, `H`, `J`, `K`, `L`, `;`, `'` 等键。
  * **黑键:** 使用 `W`, `E`, `T`, `Y`, `U`, `O`, `P` 等键。
  * 在 **DJ 模式** 下，任何按键都会触发独特的电音和打击乐音效！
* **退出游戏:** 按 `ESC` 键或点击右上角的退出按钮。

## 🚀 本地运行 (Local Development)

如果你想在本地运行或修改该项目，请按照以下步骤操作：

1. 克隆仓库:
   ```bash
   git clone https://github.com/huijiangyuan/fantasy-piano-house.git
   ```
2. 进入项目目录:
   ```bash
   cd fantasy-piano-house
   ```
3. 安装依赖:
   ```bash
   npm install
   ```
4. 启动开发服务器:
   ```bash
   npm run dev
   ```
5. 构建生产版本:
   ```bash
   npm run build
   ```

## 🌐 部署 (Deployment)

本项目已配置了 GitHub Actions (`.github/workflows/deploy.yml`)，当你将代码推送到 `main` 分支时，项目会自动构建并部署到 [GitHub Pages](https://pages.github.com/)。

---
*Made with ❤️ by AI Studio*
