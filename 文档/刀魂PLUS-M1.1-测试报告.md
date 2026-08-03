# 刀魂PLUS · M1.1 修复版 · 测试报告

**结论：通过**（P0 全部闭环；24/24 检查项 PASS；console 异常 0；证据截图 19 张）

---

## 1. 测试环境（真实浏览器）

| 项 | 值 |
| --- | --- |
| 被测物 | `发布/刀魂PLUS-M1.1-修复版.html`（20,876,223 字节 ≈ 19.9 MB，file:// 直开） |
| 浏览器 | Microsoft Edge **150.0.4078.105**（系统安装版 msedge.exe，new headless 模式 = 真实 Chromium 渲染管线与事件管线） |
| 驱动 | puppeteer-core 23.11.1 + Node v22.13.1 |
| 输入方式 | **全部经 CDP 真实键盘事件**（keyboard.down/up 触发页面原生 keydown/keyup）；`page.evaluate` 仅只读取状态做同步与断言，**未注入任何游戏逻辑** |
| 运行时间戳 | 2026-08-01T07:07:35Z（`_pptr_report.json`.env.date） |
| 主循环实测 | tick 110→156 / 700ms ≈ 60fps（requestAnimationFrame 真实驱动） |
| 证据 | `文档/刀魂PLUS-M1.1-测试截图/`（19 张 PNG + `_pptr_report.json` 全量结果） |

说明：headless(new) 使用与有头 Edge 相同的浏览器二进制、渲染器与输入管线，仅无窗口；所有截图为浏览器真实渲染帧。runner 脚本 `_build/pptr_m11.node.js` 可复跑。

## 2. 测试矩阵逐项

| # | 项目 | 操作（真实按键） | 结果 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | 启动→标题 | file:// 打开，Space 唤起 | PASS（boot→title，60fps） | 01 |
| 2 | 标题四菜单 | W/S 循环导航，S×4 回位 | PASS，四项+提示无重叠 | 01 |
| 3 | VS CPU 选角 | J 进入，D×2 移光标到綾 | PASS，六人网格+大立绘+信息卡 | 02 |
| 4 | 舞台选择 | D 选霓虹都市，J 确认 | PASS，3 舞台+随机卡 | 03 |
| 5 | 难度选择（仅 CPU 线） | J 确认 NORMAL | PASS | 04 |
| 6 | VS 页（CPU） | 自动过场 | PASS，单主体构图，CPU·NORMAL 标 | 05 |
| 7 | VS CPU 实战 | 走近+J/K 连击 3.5s | PASS，`p2IsAI=true`，`G.ai[1].plan` 存在（真 AI） | 06 |
| 8 | 暂停/恢复 | ESC 暂停，J 恢复 | PASS，J 不串成攻击；ESC×2 退回标题 | 07 |
| 9 | LOCAL VS P1 选角 | S→J，D×3 选悟空，J | PASS | — |
| 10 | **char2 P2 选角（P0-1）** | 方向键×3 移 P2 光标，小键盘1 确认 | PASS，P2 SELECT 标头/青色独立光标/1P 角标；`cursor2` 独立 | 08 |
| 11 | VS 页（LOCAL VS） | 选王者峡谷，自动过场 | PASS，P1/P2 徽标 | 09 |
| 12 | **双人同时输入** | P1 按住 D 同时 P2 按住 ← 会合；分窗口互殴+同帧对拍 | PASS，双方均掉血 dmg=[36,28]，`p2IsAI=false` | 10 |
| 13 | 双人打满两胜到结算 | 真实连打（轻链+超杀）打完 2 回合 | PASS，winner=wukong，结算页胜利立绘+台词+MAX COMBO | 11 |
| 14 | 训练模式 | 选安琪拉进训练场 | PASS，HUD 右侧 DUMMY 标 | 13 |
| 15 | 安琪拉超杀（训练∞气） | 走近按 I | PASS，火焰法阵 cine 触发，木人掉 24 HP | 12 |
| 16 | HOW TO PLAY | 菜单第4项进入，S 导航，K 返回 | PASS，底部 P1/P2/通用键位条（不透明底） | 14/15 |
| 17 | **模式互污回归** | LOCAL VS 全流程后 → 标题 → VS CPU 再开一局 | PASS，`p2IsAI=true ∧ localvs=false ∧ ai[1].plan≠undefined` | 16 |
| 18 | 六人尺寸统一（P0-2） | mack vs ayame、houyi vs kenji、wukong vs hayato 实战同框 | PASS，屏显目视等高（数据 146-150px，spread 3.3%） | 10/17/18 |
| 19 | 悟空超杀 | ?fight&training 走近按 I | PASS，三段棍法 cine，3HITS，dmg=23 | 19 |
| 20 | 后羿超杀 | 同上 | PASS，射日箭雨 cine，dmg=22 | 20 |
| 21 | console/pageerror/请求失败 | 全程监听（6 个页面会话） | PASS，**0 条**（error/warning/pageerror/requestfailed 均无；资源零 fallback 告警） |  — |
| 22 | 页面 ERROR 覆盖层 | `#err` display 检查 | PASS，未出现 | — |

蹲姿碰撞盒（148→96，P0-2 子项）在无头回归 `_build/smoke_m11.node.js` 断言通过（真实浏览器矩阵未重复覆盖该数值项）。

## 3. 截图对照表（`文档/刀魂PLUS-M1.1-测试截图/`）

| 文件 | 画面 | 关键验证点 |
| --- | --- | --- |
| 01-标题-四菜单 | 标题 | VS CPU / LOCAL VS / TRAINING / HOW TO PLAY 四项无重叠 |
| 02-选人-P1六人网格 | 选角 | 六人头像网格 + 綾大胸像（重构后）+ 数据卡 |
| 03-舞台选择 | 舞台 | 血暮神社/霓虹都市/王者峡谷/随机 |
| 04-难度选择 | 难度 | EASY/NORMAL/HARD |
| 05-VS页-CPU | VS | 单主体、CPU·NORMAL 标、绫/悟空新胸像 |
| 06-战斗-VSCPU-ayame | 对战 | HUD：P1 vs **CPU** 标签 |
| 07-暂停菜单 | 暂停 | RESUME / HOW TO PLAY / QUIT |
| 08-选人-P2网格-LOCALVS | char2 | **P2 SELECT**、P2 青色光标、P1 已锁 1P 角标 |
| 09-VS页-LOCALVS | VS | P1/P2 徽标、悟空新胸像 |
| 10-战斗-双人LOCALVS | 对战 | HUD：P1 vs **P2**，双方 HITS 连击数同屏 |
| 11-结算 | 结算 | VICTORY、胜者新胸像、台词、MAX COMBO |
| 12-训练-angela超杀 | 超杀 | 火焰法阵 cine、3 HITS |
| 13-训练模式-DUMMY | 训练 | HUD：**DUMMY** 标签、TRAINING 提示条 |
| 14-HOWTO-P1P2键位 | 图鉴 | 底部 P1/P2/通用键位条 |
| 15-HOWTO-列表导航 | 图鉴 | 列表导航 + 真引擎演示台 |
| 16-模式切换-CPU回归 | 对战 | LOCAL VS 之后 CPU 标签/真 AI 回归 |
| 17-战斗-mack-vs-ayame | 对战 | 尺寸同框对照 |
| 18-战斗-houyi-vs-kenji | 对战 | 尺寸同框对照 |
| 19-超杀-wukong | 超杀 | 三段棍法腾空段、3 HITS |
| 20-超杀-houyi箭雨 | 超杀 | 箭雨 cine |

## 4. 无头回归（辅助，非验收依据）

`node _build/smoke_m11.node.js`：ALL OK —— 六人屏显高度 spread 3.3%、蹲盒 148/96、char2 绘制断言、小键盘确认、模式互污断言、作弊字段（cheatRead/readP/meterRegen）静态扫描为零、三超杀命中扣血、hard AI 对局完走（4080 tick 出胜者）。

## 5. 测试期间发现并处置的问题

| 问题 | 类型 | 处置 |
| --- | --- | --- |
| 扩展名册胸像「空框小人」（02/05/09 首轮截图暴露） | **游戏资产缺陷（P1）** | 重写 `bake_bust` 肩上构图，重烘 8 张，重构建后复验通过 |
| HOWTO 键位条透出旧页脚 | 游戏 UI 小缺陷 | 底带改不透明，复验通过 |
| runner：双人互殴双方同时连打时快手永远打断慢手，wukong 侧 0 伤害 | 测试器编排缺陷 | 改为「会合→P2 窗口→P1 窗口→对拍」分窗编排 |
| runner：结算瞬间 180ms 输入缓冲里的 J 被结算页吃成 REMATCH，对局无限重开 | 测试器编排缺陷 | 非 `fight:fight` 阶段一律停手等待 |

后两项为测试脚本问题而非游戏缺陷，记录以保证「180s 超时」历史日志可解释；最终 run（`_build/pptr_run5.log`）24/24 通过。

## 6. 已知限制（与改动说明一致）

场景动态元素密度（P2）、Gamepad（本轮禁止）、程序化帧动画与手绘的质感差距（已收敛未消除）、超杀背景压暗偏浅。均不构成 P0/P1 阻塞。

## 7. 验收门槛对照

| 门槛 | 判定 |
| --- | --- |
| P0-1 char2 可见可用可返回 | ✅ 截图 08 + 流程断言 |
| P0-2 六人尺寸/锚点/碰撞盒统一 | ✅ 截图 10/17/18 + 数值断言 |
| P1 菜单/模式单源/VS页/后三名视觉/HOWTO | ✅ 全部有截图证据 |
| 真实浏览器 + 真实按键 + 截图证据 | ✅ Edge 150 · CDP 键盘 · 19 张 |
| console 零异常 | ✅ 0 条 |
| 不覆盖 M0/M1 | ✅ 独立产物 |

**总判定：M1.1 通过验收。**
