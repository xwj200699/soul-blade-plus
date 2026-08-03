# 血刃 CRIMSON EDGE · 群英乱斗

[![Play](https://img.shields.io/badge/▶_在线试玩-血刃_M1.3-c9182b?style=for-the-badge)](https://evans777max.github.io/soul-blade-plus/发布/血刃-M1.3-闯关版.html)
[![NewFight](https://img.shields.io/badge/▶_在线试玩-New_Fight_Q版-ff6b9d?style=for-the-badge)](https://evans777max.github.io/soul-blade-plus/New%20Fight/)

![Version](https://img.shields.io/badge/version-M1.3_闯关版-e8b23a)
![NewFight](https://img.shields.io/badge/分支-New_Fight_M2-ff9dbe)
![HTML5](https://img.shields.io/badge/HTML5-单文件离线-e34f26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-零依赖-f7df1e?logo=javascript&logoColor=black)
![Canvas](https://img.shields.io/badge/Canvas_2D-程序化像素美术-59d96e)
![WebAudio](https://img.shields.io/badge/WebAudio-运行时合成音频-7fd3ff)
![Verified](https://img.shields.io/badge/真实浏览器验收-37%2F37_·_33%2F33_PASS-2ea44f)
![License](https://img.shields.io/badge/用途-学习研究_·_非商用-8a4ae0)

单文件像素格斗游戏。始于对 [soul-blade.pages.dev](https://soul-blade.pages.dev) 引擎的学习性深化改造（非商用）；自 **M1.2 起更名「血刃」并完成视觉资产全面自产化**——UI 层不再包含上游项目的任何美术资产，拥有独立设计身份（青铜·雷紋体系，见 `artlib/README.md`）。

## 🎮 在线试玩

| 版本 | 链接 |
|---|---|
| **血刃 M1.3 闯关版**（单文件成品，推荐） | [立即游玩](https://evans777max.github.io/soul-blade-plus/发布/血刃-M1.3-闯关版.html) |
| 血刃 开发版（多文件最新源码） | [立即游玩](https://evans777max.github.io/soul-blade-plus/) |
| **New Fight Q版格斗**（玩偶画风分支·M2） | [立即游玩](https://evans777max.github.io/soul-blade-plus/New%20Fight/) |

> 键鼠双通。P1: WASD + J轻 K重 U必杀 I超必；详细键位见下文。

## 目录结构

```
发布/     成品（双击即玩）: 血刃-M1.3-闯关版.html(最新) · 血刃-M1.3-实测视频.mp4 ·
          血刃-M1.2 · 刀魂PLUS-M1.1/M1/M0(历史版本) · 对应zip
文档/     各里程碑 Prompt · 改动说明 · 测试报告 · 血刃-M1.3-测试截图/(真实浏览器证据)
artlib/   独立美术资产库单元: bake_uilib.py 生成器 + 设计规范 README + preview.png
js/ css/ assets/ index.html   多文件源码版（开发迭代用; assets/uilib=自产 UI 资产）
_build/   构建与验证管线（烘焙器/打包器/无头冒烟/平衡遥测/Puppeteer 验收/录像 runner）
```

## 玩法

**双击 `发布\血刃-M1.3-闯关版.html` 即玩**（4.7MB，全部素材内联，离线零依赖）。
M1.3 要点：**STORY 闯关模式**（恐龙快打式三幕剧情线：横板推进+多敌同屏+波次小兵+
关底 Boss+对话条+通关结算）、新角色**貂蝉**（双扇舞姬·火羽扇·花舞乱影超杀，七人
花名册）、新舞台**青铜神殿**、**全 UI 鼠标操作**（键鼠双通）、LOCAL VS P2 笔记本
键位簇（`, . / 右Shift`）与战中双人键位提示、标题字标闪现修复；附**实测视频**
`发布/血刃-M1.3-实测视频.mp4`（真实键鼠驱动录制，H.264 含游戏音频）。
已通过 Edge 150 真实浏览器全矩阵验收（见 文档/血刃-M1.3-测试报告.md）。

模式：STORY 闯关 / VS CPU / LOCAL VS 双人 / TRAINING / HOW TO PLAY。
P2 键位：方向键移动 + `,`轻 `.`重 `/`必杀 `右Shift`超必（或小键盘 1/2/4/5）。

多文件版（`index.html` + js/ + assets/）供开发迭代用：file:// 直开会因浏览器 canvas 污染策略降级（月牙/头像回退），完整体验需本地起 HTTP（如 `python -m http.server`）。引擎已加防御：file:// 直开也能进游戏，不会黑屏。

键位：P1 = A/D 移动 · W 跳 · S 蹲 · 双击 A/D 冲刺 · J 轻 K 重 · U 必杀 · I 超必杀（气满）；P2（LOCAL VS）= 方向键 + 小键盘 1/2/4/5（备用 `[ ] ; '`）；ESC/P 暂停 · M 静音 · -/= 音乐音量 · 9/0 音效音量。

## 本次深化内容（相对原版）

| 模块 | 内容 |
|---|---|
| 花名册 2→6 | 解锁隐藏角色 **綾**（补齐 air/超必杀，原调校招式全保留）；新增 **孙悟空**（如意神棍 330px 超长突刺）、**后羿**（落日箭 zoner + 空中箭）、**安琪拉**（火球法师） |
| 选人 | 大乱斗式 6 人网格选人（头像自动裁脸 + 实时动画预览 + 力/速/距战力条 + 必杀表） |
| 场景 | 3 个可选舞台：血暮神社（原版）/ **霓虹都市**（雨夜天台）/ **王者峡谷**（水晶高地），均为程序化像素绘制 + 随机选项 |
| 引擎适配 | AI 行为按"招式能力"泛化（不再按角色 id 硬编码）；帧宽 128/150/200 自适应；投射物新增箭矢/火球画法 |

新增文件：`js/roster.js` `js/stages.js` `js/select2.js` `_build/bake_roster.py` `_build/smoke.node.js`。原文件仅做最小适配补丁（ui.js 立绘回退链 / ai.js 能力泛化 / sprites.js 投射物画法）。

## 素材来源与授权（M1.2 更新）

- **引擎代码**：fork 自 soul-blade.pages.dev（学习用途，README 全程声明）；
- **UI 美术（自 M1.2）**：全部为本项目 `artlib/` 程序化自产（青铜·雷紋体系，27 件，
  含血刃字标/封面/漆带/mack·kenji 胸像等），**构建不再包含上游 ui-lab 任何文件**；
- **角色战斗精灵**：mack/kenji/ayame = LuizMelo "Martial Hero"/"Huntress"（itch.io
  免费授权，合法第三方素材，保留）；wukong/houyi/angela = 本项目 `_build/bake_roster2.py`
  程序化烘焙（公有领域神话人物的原创重建，不含任何官方资产）；
- **音频**：全部 SFX 为 WebAudio 运行时合成（零素材）；BGM 3 首暂沿用上游 Lyria
  生成曲——**上游媒体资产的唯一残留**，自产化列入 M1.3 待办；
- **字体**：PressStart 2P（OFL）/ 缝合怪像素字体 FusionPixel（OFL）/ 衡山毛筆フォント（免费授权）；
- 本项目为**学习与技术研究用途，非商用**。若上游或第三方素材权利方认为存在不当使用，
  请提 issue，将立即处理/移除。

## 验证与再生成

- **真实浏览器验收（M1.2）**：`node _build/pptr_m12.node.js` —— puppeteer-core 驱动系统 Edge 打开最终单文件，全程真实键盘事件走完整矩阵（四菜单/双人选角/双人对战到结算/三超杀三连拍/HOWTO/模式互污回归），截图到 `文档/血刃-M1.2-测试截图/` 并输出 `_pptr_report.json`
- **无头冒烟**：`node _build/smoke_m12.node.js`（uilib 资产零缺失审计/尺寸/蹲盒/char2/模式互污/三超杀 FX 断言/分舞台粒子/hard 对局）；历史套件 smoke_m11/smoke 保留
- **平衡遥测**：`node _build/balance_m12.node.js`（6×6 hard 双向 150 局 → `_build/balance_m12.json`）
- **重建单文件**：`python _build/build_m12.py`
- **再生成美术**：`python artlib/bake_uilib.py`（27 件 UI 资产+preview 拼图）；`python _build/bake_roster2.py all` / `ayame_bust` / `uilib_busts`（角色帧与六人胸像）
- 调试钩子：`index.html?fight&p1=wukong&p2=houyi&ai=hard`、`?pose=special&fight&p1=wukong&training`、`?stage2=1`

## GitHub 同步

远端：`https://github.com/evans777max/soul-blade-plus`（public，`origin/main`）。
**公开仓库红线：第三方参考素材、内网信息、个人信息一律不入仓。**

**约定：每个里程碑（或任何一轮实质改动）验收通过后，立即同步：**

```powershell
cd "C:\留存\Game Now\soul-blade-plus"
git add -A
git commit -m "M1.x: 一句话说明本轮改动"
git push
```

- 提交信息用中文，前缀标里程碑（如 `M1.4:` / `NewFight-M2:` / `文档:`）；
- 大于 100MB 的产物（超长实测视频等）不入仓，放本地或改用 Git LFS；
- `.gitignore` 已排除临时抽帧/校样/日志类可再生文件。
