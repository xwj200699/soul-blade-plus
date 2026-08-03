# artlib · 刀魂PLUS 自产美术资产库

本目录是项目的**独立美术资产单元**：全部 UI 视觉资产由 `bake_uilib.py` 程序化生成（Pillow），
角色胸像由 `_build/bake_roster2.py` 生成——**零外部素材、零 AI 生成图、零对原项目
ui-lab 素材的引用**。自 M1.2 起，游戏 UI 层不再打包任何原项目（soul-blade.pages.dev）
的美术资产，本 fork 拥有独立的视觉身份。

## 设计语言 ——「青铜·雷紋」体系

刻意与原项目的「和风·朱漆金」（红金漆器 + 和纸 + 毛笔）区分，取材中国商周青铜器：

| 维度 | 定稿 |
| --- | --- |
| 主色 | 青铜绿锈 `#3d6b58` / 深铜 `#1e3028` |
| 贵金属 | 鎏金 `#b98f3e` / 金高光 `#e8c86a`（替代原项目的漆金） |
| 强调色 | 朱砂 `#c8452c`（印玺/穗/指向元素专用） |
| 底色 | 玄底 `#0b1210`（兼 knockout 抠图色） |
| 母题 | 云雷纹（方折回纹）· 璧环 · 兽面双目(饕餮) · 星宿连线 · 编钟 · 玦 |
| 质感 | 低分辨率手绘 → 最近邻放大 x2/x4，与游戏像素风一致 |

标志物：**璧环贯刀**（标题徽记）、**方鼎交兵**（VS 徽章）、**鎏金玦**（菜单光标/环月）、
**铜钱徽**（胜场记点）、**青铜观星台**（选人页夜景）。

## 资产清单（assets/uilib/，文件名与 ui.js 装载键兼容）

| 文件 | 用途 | 结构契约 |
| --- | --- | --- |
| title-zangetsu / title-emblem.png | 标题徽记（大/紧凑） | corner-knockout |
| titlebg-gate.png | 标题背景·青铜大殿 | 1024², 消费带 top=150 |
| titlebg-moon.png | 选人背景·星宿夜台 | 1024², 消费带 top=40 |
| vs-emblem-v2.png | VS 徽章·方鼎交兵(棍×弓) | corner-knockout |
| band2-cut / band-win / band-lose.png | 公告/胜/败 通栏铜带 | 1024×198 直读 |
| result-win / result-lose.png | 结算背景（鎏金大日/冷雨灰月） | 1024×576 直读 |
| announce-brush.png | 公告墨块 | `_inkCentroid` 求质心 |
| cursor-fan.png | 菜单光标·鎏金玦 | corner-knockout |
| nameplate.png | 名条·左玦结铜牌 | corner-knockout |
| pip-mon.png | 胜场徽·铜钱 | corner-knockout |
| combo-splash.png | 连击溅射·锈绿墨爆+金箔 | corner-knockout |
| portrait-frame.png | 头像框 | 闭合中孔（`_procHole`） |
| healthbar-frame.png | 血条框 | 开放中央填充窗自动测量 |
| meter-bar.png | 气力槽 | 硬编码裁切 x104,y392,w815,h233；带区 y68-164；节点 191.5/335.5/623 |
| timer-seal.png | 计时印 | 中央浅色羊皮窗（r>170,g>140,b>90） |
| keycap.png | 键帽 | 键面区无红主导色 |
| menu-panel.png | 暂停/菜单面板 | (452..572,300..452) 与 +220 区平涂一致 |
| portrait-hayato-sel/-hud.png | mack「剣二」胸像（赤笠剑客） | 320×344 / 336² |
| portrait-kenji-sel/-hud.png | kenji「隼人」胸像（赤鬼面忍） | 320×344 / 336² |
| favicon.png | 页签图标·迷你璧徽 | 64² |
| （不产出 stage-alt.png） | 神社回退引擎程序化绘制 | ua.stage=null 自动回退 |

## 再生成

```
python artlib/bake_uilib.py                    # 全部 UI 资产 + preview.png 拼图
python _build/bake_roster2.py uilib_busts      # mack/kenji 胸像
```

生成确定性：伪随机数种子固定（20260801），同版本脚本输出逐字节可复现。

## 授权与来源声明

- 本目录全部产出为**本项目原创程序化绘制**，可自由用于本项目任何用途；
- 角色战斗精灵（mack/kenji/ayame 的 LuizMelo 素材）为 itch.io 免费授权的**第三方合法素材**，
  不属于本库范畴，来源声明见项目根 README；
- 字体（PressStart/FusionPixel/KouzanBrush）为第三方授权字体，非本库范畴；
- BGM（原项目 Lyria 生成曲）自产化列入 M1.3 待办。
