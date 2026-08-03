# -*- coding: utf-8 -*-
"""刀魂PLUS · artlib 自产 UI 资产生成器 —— 「青铜·雷紋」设计体系.

全部资产由本脚本程序化绘制(Pillow), 零外部素材, 零 AI 生成图 —— 项目自有
设计资产库, 与原项目 ui-lab(和风红金/AI绘)在视觉语言上完全区分:

  设计语言: 商周青铜器 —— 青铜绿锈(patina) x 鎏金(gilt) x 朱砂(cinnabar)
  母题: 云雷纹(方折回纹) / 璧环 / 兽面双目 / 星宿点 / 编钟
  质感: 低分辨率手绘 -> 最近邻放大(x2/x4), 与游戏全局像素风一致

文件名沿用 ui.js 装载键(零消费端改动), 结构契约逐条对齐:
  - 通用: 纯色底 #0b1210, 角落 flood-knockout tol38 可整体抠出
  - portrait-frame: 中央全封闭孔(flood 自中心可寻)
  - healthbar-frame: 双轨 + 端帽 + 中央通透填充窗(自动测量)
  - meter-bar: 胶囊按硬编码裁切 x104,y392,w815,h233; 带区 y68..164;
    暗节点 x=191.5/335.5/623; 预留顶部/底部擦除区为空
  - timer-seal: 中央浅色羊皮窗(r>170,g>140,b>90)
  - keycap: 键面区(340..690,330..600)禁用红主导色
  - menu-panel: (452..572,300..452) 与 +220 平移区内容一致(平涂)
  - announce-brush: 深色墨块(供 _inkCentroid 求质心)
  - stage-alt: 刻意不产出 -> 神社回退引擎程序化绘制

用法: python artlib/bake_uilib.py        (全部资产 + preview.png 拼图)
"""
import math
import os
import sys

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\留存\Game Now\soul-blade-plus"
OUT = os.path.join(ROOT, "assets", "uilib")
os.makedirs(OUT, exist_ok=True)

# ---------------- palette 「青铜·雷紋」 ----------------
BG      = (11, 18, 16, 255)      # 深底(knockout 色; 一切实体色须与其 RGB 距 >38)
INK     = (34, 50, 40, 255)      # 铜器阴刻线(距 BG 46 > tol38, 不会被抠掉)
BRONZE_D = (30, 48, 40, 255)     # 青铜深
BRONZE  = (61, 107, 88, 255)     # 青铜绿锈
BRONZE_L = (104, 152, 124, 255)  # 锈浅(受光)
GILT_D  = (122, 90, 34, 255)     # 鎏金暗
GILT    = (185, 143, 62, 255)    # 鎏金
GILT_L  = (232, 200, 106, 255)   # 鎏金高光
CINNA   = (200, 69, 44, 255)     # 朱砂
CINNA_D = (138, 42, 26, 255)     # 朱砂暗
BONE    = (232, 226, 208, 255)   # 玉白/羊皮
ASH     = (90, 104, 116, 255)    # 败色青灰
ASH_D   = (48, 58, 68, 255)

_seed = [20260801]
def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


class F:
    """lo-res frame -> nearest upscale"""
    def __init__(self, w, h, scale=4, bg=BG):
        self.w, self.h, self.s = w, h, scale
        self.im = Image.new("RGBA", (w, h), bg)
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, w, h, c):
        x0, y0 = int(math.floor(x)), int(math.floor(y))
        x1 = max(x0, int(math.floor(x + w)) - 1)
        y1 = max(y0, int(math.floor(y + h)) - 1)
        self.d.rectangle([x0, y0, x1, y1], fill=c)

    def save(self, name, final_size=None):
        hi = self.im.resize((self.w * self.s, self.h * self.s), Image.NEAREST)
        if final_size and hi.size != tuple(final_size):
            base = Image.new("RGBA", tuple(final_size), BG)
            base.paste(hi, ((final_size[0] - hi.width) // 2, (final_size[1] - hi.height) // 2))
            hi = base
        hi.save(os.path.join(OUT, name))
        print(f"  {name}  {hi.width}x{hi.height}")
        return hi


# ---------------- shared motifs ----------------
def meander(f, x, y, w, h, c, step=6, lw=1):
    """云雷纹横带: 方折回纹, 单元 step px"""
    n = int(w // step)
    for i in range(n):
        bx = x + i * step
        # 每单元: 外框开口方回字
        f.px(bx, y, step - 2, lw, c)                      # top
        f.px(bx, y, lw, h, c)                             # left
        f.px(bx, y + h - lw, step - 2, lw, c)             # bottom
        f.px(bx + step - 2 - lw, y, lw, h * 0.55, c)      # right upper
        f.px(bx + 2, y + 2, lw, h - 4, c)                 # inner hook
        f.px(bx + 2, y + h // 2, step - 5, lw, c)


def taotie_eyes(f, cx, cy, s, gilt=GILT_L):
    """兽面双目: 一对外凸圆目 + 眉钩 —— 青铜器的凝视"""
    for sgn in (-1, 1):
        ex = cx + sgn * s * 1.6
        f.d.ellipse([ex - s, cy - s * 0.8, ex + s, cy + s * 0.8], fill=BRONZE_D, outline=INK)
        f.d.ellipse([ex - s * 0.45, cy - s * 0.45, ex + s * 0.45, cy + s * 0.45], fill=gilt)
        f.px(ex - s * 0.15 + sgn, cy - s * 0.2, max(1, s * 0.25), max(1, s * 0.25), (255, 246, 220, 255))
        # 眉钩(雷纹折)
        f.px(ex - s, cy - s * 1.3, s * 2, 1, gilt)
        f.px(ex + sgn * s, cy - s * 1.3, 1, s * 0.5, gilt)


def bronze_field(f, x, y, w, h, base=BRONZE_D, fleck=BRONZE, density=0.06):
    """青铜底面: 平涂 + 锈斑点"""
    f.px(x, y, w, h, base)
    n = int(w * h * density)
    for _ in range(n):
        fx, fy = x + rnd() * (w - 2), y + rnd() * (h - 2)
        f.px(fx, fy, 1 + int(rnd() * 2), 1, fleck if rnd() < 0.8 else GILT_D)


def star_dots(f, x, y, w, h, n, c=(214, 226, 232, 255)):
    for _ in range(n):
        sx, sy = x + rnd() * w, y + rnd() * h
        f.px(sx, sy, 1, 1, c)
        if rnd() < 0.18:
            f.px(sx - 1, sy, 3, 1, (c[0], c[1], c[2], 120))
            f.px(sx, sy - 1, 1, 3, (c[0], c[1], c[2], 120))


# =====================================================================
# 1. 标题徽记 title-zangetsu (璧·雷紋徽) + title-emblem (小徽)
# =====================================================================
def bake_title_emblem(name, compact=False):
    f = F(256, 256, 4)
    cx, cy = 128, 128
    R = 78 if not compact else 82
    blade_up = 26 if not compact else 12   # 刃身伸出环外量(compact 收短防出界)
    # 璧环: 三重(鎏金缘 - 青铜身 - 鎏金内缘), 环身刻雷纹
    for r, c in [(R + 8, GILT_D), (R + 5, GILT), (R, BRONZE), (R - 16, BRONZE_D)]:
        f.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    f.d.ellipse([cx - (R - 22), cy - (R - 22), cx + (R - 22), cy + (R - 22)], fill=BG)  # 璧孔
    f.d.ellipse([cx - (R - 20), cy - (R - 20), cx + (R - 20), cy + (R - 20)], outline=GILT_L, width=2)
    # 环身雷纹: 八段方折回纹弧(取代钟表刻度感)
    for k in range(8):
        a0 = k * math.pi / 4 + 0.14
        rr = R - 9
        prev = None
        for j in range(7):
            a = a0 + j * 0.075
            r_j = rr + (3 if j % 2 else -3)
            p = (cx + math.cos(a) * r_j, cy + math.sin(a) * r_j)
            if prev:
                f.d.line([*prev, *p], fill=GILT_D if k % 2 else GILT, width=2)
            prev = p
    # 中央竖刀: 玉白刃 + 鎏金格(嵌兽面双目) + 缠柄 + 朱砂穗
    f.px(cx - 3, cy - R - blade_up, 6, R + blade_up + 4, BONE)
    f.px(cx - 1, cy - R - blade_up, 2, R + blade_up + 4, (255, 252, 240, 255))
    f.px(cx + 1, cy - R - blade_up + 4, 1, R + blade_up - 4, (196, 188, 168, 255))  # 刃脊阴影
    f.d.polygon([(cx - 3, cy - R - blade_up - 8), (cx + 3, cy - R - blade_up - 8),
                 (cx, cy - R - blade_up - 17)], fill=BONE)  # 刃尖
    f.px(cx - 13, cy + 4, 26, 9, GILT)     # 格(加宽)
    f.px(cx - 13, cy + 4, 26, 2, GILT_L)
    for sgn in (-1, 1):                    # 格上兽面双目(嵌入而非浮空)
        f.px(cx + sgn * 7 - 2, cy + 7, 4, 4, CINNA)
        f.px(cx + sgn * 7 - 1, cy + 8, 2, 2, (255, 240, 220, 255))
    f.px(cx - 4, cy + 13, 8, 34, GILT_D)   # 柄
    for yy in range(5):
        f.px(cx - 4, cy + 15 + yy * 6, 8, 2, BRONZE_D)
    f.px(cx - 6, cy + 47, 12, 6, GILT)     # 首
    f.px(cx - 1, cy + 53, 2, 9, CINNA)     # 朱砂穗
    f.px(cx - 4, cy + 58, 3, 6, CINNA_D)
    f.px(cx + 2, cy + 58, 3, 6, CINNA_D)
    # 左右云雷翼(加厚对称钩)
    for sgn in (-1, 1):
        bx = cx + sgn * (R + 24)
        f.px(bx - 8, cy - 3, 16, 4, GILT)
        f.px(bx + sgn * 5 - 2, cy - 13, 4, 11, GILT)
        f.px(bx + sgn * 5 - 2 - sgn * 6, cy - 13, sgn * 7, 3, GILT_L)
        f.px(bx - sgn * 7 - 2, cy + 1, 4, 10, GILT_D)
        f.px(bx - sgn * 7 - 2 + sgn * 4, cy + 8, sgn * 6, 3, GILT_D)
    # 朱砂玺(徽记落款, 右下)
    f.d.ellipse([cx + R - 6, cy + R - 12, cx + R + 8, cy + R + 2], fill=CINNA)
    f.px(cx + R - 2, cy + R - 8, 6, 6, CINNA_D)
    f.save(name)


# =====================================================================
# 2. VS 徽章 vs-emblem-v2: 方鼎牌 + 交叉 棍x弓
# =====================================================================
def bake_vs():
    f = F(256, 256, 4)
    cx, cy = 128, 126
    # 方鼎形牌: 上宽下略窄 + 双耳 + 三足暗示
    f.d.polygon([(cx - 74, cy - 62), (cx + 74, cy - 62), (cx + 64, cy + 66), (cx - 64, cy + 66)], fill=BRONZE)
    f.d.polygon([(cx - 70, cy - 58), (cx + 70, cy - 58), (cx + 61, cy + 62), (cx - 61, cy + 62)], fill=BRONZE_D)
    for sgn in (-1, 1):  # 双耳
        f.px(cx + sgn * 58 - 7, cy - 76, 14, 18, BRONZE)
        f.px(cx + sgn * 58 - 4, cy - 72, 8, 10, BG)
    meander(f, cx - 62, cy - 54, 124, 8, GILT, step=8)
    meander(f, cx - 56, cy + 48, 112, 8, GILT_D, step=8)
    # 交叉兵器: 金箍棒(左下->右上, 粗体) x 神弓(右下->左上)
    a = -0.62
    for t in range(-72, 73, 2):  # 棍身(7px 粗 + 高光棱线)
        x, y = cx + math.cos(a) * t, cy + math.sin(a) * t
        f.px(x - 3, y - 3, 7, 7, CINNA if abs(t) < 52 else GILT)
        f.px(x - 3, y - 3, 7, 2, (232, 116, 84, 255) if abs(t) < 52 else GILT_L)
    for t in (-60, 60):  # 金箍(双环)
        x, y = cx + math.cos(a) * t, cy + math.sin(a) * t
        f.px(x - 5, y - 5, 10, 10, GILT_L)
        f.px(x - 3, y - 3, 6, 6, GILT)
    # 弓: 弧 + 弦 + 搭箭
    bow_a0, bow_a1 = math.pi * 0.62, math.pi * 1.38
    for k in range(40):
        u = k / 39
        aa = bow_a0 + (bow_a1 - bow_a0) * u
        x, y = cx + math.cos(aa) * 62, cy + math.sin(aa) * 62
        f.px(x - 2, y - 2, 4, 4, GILT if 0.12 < u < 0.88 else GILT_L)
    x1, y1 = cx + math.cos(bow_a0) * 62, cy + math.sin(bow_a0) * 62
    x2, y2 = cx + math.cos(bow_a1) * 62, cy + math.sin(bow_a1) * 62
    f.d.line([x1, y1, x2, y2], fill=(206, 216, 226, 255), width=2)  # 弦
    f.d.line([cx + 34, cy, cx - 52, cy], fill=BONE, width=3)        # 箭杆
    f.d.polygon([(cx - 52, cy - 5), (cx - 64, cy), (cx - 52, cy + 5)], fill=GILT_L)  # 箭簇
    # 中央朱砂圆芯 + 兽目
    f.d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=CINNA, outline=GILT_L, width=2)
    f.px(cx - 5, cy - 5, 4, 4, (255, 240, 220, 255))
    taotie_eyes(f, cx, cy - 34, 5)
    f.save("vs-emblem-v2.png")


# =====================================================================
# 3. 三漆带 band2-cut / band-win / band-lose (1024x198, x2)
# =====================================================================
def bake_band(name, mode):
    """通栏漆带 1024x198. 几何契约: 消费端按 cy - bh*0.32 贴带 —— 题字中心
    必须落在带高 32% 处(lo y≈31.7), 羊皮芯据此定位 lo y14..50."""
    f = F(512, 99, 2)
    main = {"ann": BRONZE_D, "win": (64, 46, 18, 255), "lose": ASH_D}[mode]
    edge = {"ann": GILT, "win": GILT_L, "lose": ASH}[mode]
    deco = {"ann": BRONZE, "win": GILT, "lose": (66, 78, 92, 255)}[mode]
    # 带身(全幅, 低噪) + 上下轨
    bronze_field(f, 0, 4, 512, 88, main, deco, 0.015)
    for y in (4, 88):
        f.px(0, y, 512, 3, edge)
        f.px(0, y + (3 if y == 4 else -1), 512, 1, GILT_D if mode != "lose" else ASH_D)
    # 下部装饰区: 雷纹紧贴题字芯下缘(y56), 再往下留净空给 勝利/MAX COMBO 副文字行
    meander(f, 6, 56, 500, 7, deco, step=10)
    if mode == "win":
        star_dots(f, 30, 54, 452, 18, 20, (255, 232, 160, 200))
    if mode == "lose":
        for _ in range(16):  # 落雨(芯下区)
            rx, ry = rnd() * 512, 52 + rnd() * 32
            f.px(rx, ry, 1, 3 + rnd() * 4, (120, 136, 150, 160))
    # 两端流苏结(垂穗挂在芯行两侧)
    for sx in (24, 488):
        f.d.ellipse([sx - 9, 22, sx + 9, 42], fill=deco, outline=edge)
        f.px(sx - 2, 7, 4, 16, edge)
        for k in range(3):
            f.px(sx - 6 + k * 5, 42, 3, 22 + (k % 2) * 8, edge if k == 1 else deco)
            f.px(sx - 6 + k * 5, 62 + (k % 2) * 8, 3, 3, GILT_L if mode == "win" else edge)
    # 羊皮题字芯: 中心 lo y=31.7(带高 32%), 高 36 -> y14..50
    pw = 128 if mode == "ann" else 110
    pc = {"ann": (232, 226, 208, 255), "win": (240, 228, 196, 255), "lose": (214, 218, 222, 255)}[mode]
    pd = {"ann": (196, 188, 168, 255), "win": (206, 188, 150, 255), "lose": (176, 182, 190, 255)}[mode]
    cx = 256
    f.px(cx - pw, 14, pw * 2, 36, pc)
    f.px(cx - pw, 14, pw * 2, 3, (250, 246, 234, 255))
    f.px(cx - pw, 47, pw * 2, 3, pd)
    f.px(cx - pw, 14, 3, 36, pd)
    f.px(cx + pw - 3, 14, 3, 36, pd)
    for sx in (cx - pw + 7, cx + pw - 10):   # 匾钉(芯行中线)
        f.px(sx, 30, 4, 4, edge)
    f.save(name)


# =====================================================================
# 4. 结算背景 result-win / result-lose (1024x576, x4)
# =====================================================================
def bake_result(name, win):
    f = F(256, 144, 4)
    if win:
        sky = [(26, 20, 8), (34, 26, 10), (46, 34, 12), (60, 44, 16), (74, 54, 20)]
        for i, c in enumerate(sky):
            f.px(0, i * 29, 256, 29, (*c, 255))
        # 鎏金大日 + 放射
        cx, cy, R = 128, 66, 34
        for k in range(28):
            a = k * math.pi / 14 + 0.11
            L = 120 + (k % 3) * 26
            x2, y2 = cx + math.cos(a) * L, cy + math.sin(a) * L * 0.72
            f.d.line([cx, cy, x2, y2], fill=(96, 70, 26, 255), width=2)
        f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GILT, outline=GILT_L, width=2)
        f.d.ellipse([cx - R + 8, cy - R + 8, cx + R - 12, cy + R - 12], fill=GILT_L)
        star_dots(f, 0, 0, 256, 60, 40, (255, 236, 170, 220))
        ground, gd = (52, 40, 16, 255), (36, 28, 12, 255)
    else:
        sky = [(10, 12, 18), (13, 16, 24), (17, 21, 30), (22, 27, 38), (28, 34, 46)]
        for i, c in enumerate(sky):
            f.px(0, i * 29, 256, 29, (*c, 255))
        cx, cy, R = 128, 60, 26  # 灰月
        f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(150, 160, 170, 255), outline=(190, 198, 206, 255))
        f.d.ellipse([cx - 10, cy - 8, cx + 2, cy + 4], fill=(122, 132, 142, 255))
        for _ in range(70):  # 冷雨
            rx, ry = rnd() * 256, rnd() * 120
            f.px(rx, ry, 1, 5 + rnd() * 5, (86, 100, 114, 150))
        ground, gd = (24, 30, 38, 255), (16, 20, 27, 255)
    # 青铜山峦剪影 + 前景台地
    for layer, (top, col) in enumerate([(84, BRONZE_D), (100, INK)]):
        for x in range(0, 256, 2):
            h = 14 + math.sin(x * 0.045 + layer * 2.2) * 9 + math.sin(x * 0.013 + layer) * 7
            f.px(x, top - h, 2, h + 60, col)
    f.px(0, 118, 256, 26, ground)
    f.px(0, 118, 256, 2, gd)
    for i in range(10):
        f.px(i * 26, 122 + (i % 2) * 3, 12, 2, gd)
    # 两侧编钟剪影(胜利鎏金/失败暗铁)
    bell = GILT_D if win else ASH_D
    for bx in (26, 230):
        f.px(bx - 9, 92, 18, 4, bell)
        f.d.polygon([(bx - 8, 96), (bx + 8, 96), (bx + 6, 116), (bx - 6, 116)], fill=bell)
        f.px(bx - 2, 88, 4, 5, bell)
    f.save(name)


# =====================================================================
# 5. 公告墨块 announce-brush (供 _inkCentroid)
# =====================================================================
def bake_announce():
    f = F(256, 256, 4)
    cx, cy = 128, 128
    # 青铜墨云: 多椭圆叠成横向牌形墨块 + 金缘残点
    for k in range(26):
        a = rnd() * math.pi * 2
        rr = 30 + rnd() * 60
        ex, ey = cx + math.cos(a) * rr * 1.5, cy + math.sin(a) * rr * 0.45
        r = 22 + rnd() * 26
        f.d.ellipse([ex - r * 1.5, ey - r * 0.62, ex + r * 1.5, ey + r * 0.62], fill=(20, 30, 26, 255))
    f.d.ellipse([cx - 108, cy - 40, cx + 108, cy + 40], fill=INK)
    meander(f, cx - 92, cy - 30, 184, 6, (44, 66, 56, 255), step=8)
    meander(f, cx - 92, cy + 24, 184, 6, (44, 66, 56, 255), step=8)
    for _ in range(30):  # 金缘飞沫
        a = rnd() * math.pi * 2
        rr = 95 + rnd() * 34
        f.px(cx + math.cos(a) * rr * 1.25, cy + math.sin(a) * rr * 0.5, 1 + int(rnd() * 2), 1, GILT if rnd() < 0.7 else GILT_L)
    f.save("announce-brush.png")


# =====================================================================
# 6. 光标 cursor-fan -> 鎏金玦
# =====================================================================
def bake_cursor():
    f = F(256, 256, 4)
    cx, cy, R = 128, 128, 56
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GILT)
    f.d.ellipse([cx - R + 10, cy - R + 10, cx + R - 10, cy + R - 10], fill=BG)
    # 玦口(右侧开口) + 指向楔
    f.d.polygon([(cx + R - 26, cy - 13), (cx + R + 12, cy - 20), (cx + R + 12, cy + 20), (cx + R - 26, cy + 13)], fill=BG)
    f.d.polygon([(cx + R - 4, cy - 8), (cx + R + 18, cy), (cx + R - 4, cy + 8)], fill=CINNA)
    for k in range(10):  # 环身刻痕
        a = 0.6 + k * (math.pi * 1.5) / 10
        x1, y1 = cx + math.cos(a) * (R - 9), cy + math.sin(a) * (R - 9)
        f.px(x1 - 1, y1 - 1, 3, 3, GILT_L if k % 2 else GILT_D)
    f.save("cursor-fan.png")


# =====================================================================
# 7. 铭牌 nameplate: 左结青铜条牌
# =====================================================================
def bake_nameplate():
    f = F(256, 256, 4)
    x, y, w, h = 24, 104, 212, 46
    f.px(x, y, w, h, BRONZE_D)
    f.px(x, y, w, 3, BRONZE_L)
    f.px(x, y + h - 3, w, 3, INK)
    meander(f, x + 26, y + 4, w - 34, 6, BRONZE, step=8)
    f.px(x + 26, y + h - 10, w - 34, 2, BRONZE)
    # 左端玦结
    f.d.ellipse([x - 14, y + 6, x + 20, y + h - 6], fill=GILT, outline=GILT_D)
    f.d.ellipse([x - 5, y + 15, x + 11, y + h - 15], fill=BG)
    f.px(x - 2, y + h - 4, 3, 12, GILT_D)
    f.px(x + 4, y + h - 2, 3, 9, GILT)
    f.save("nameplate.png")


# =====================================================================
# 8. 胜场徽 pip-mon: 铜钱徽
# =====================================================================
def bake_pip():
    f = F(256, 256, 4)
    cx, cy, R = 128, 128, 62
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GILT, outline=GILT_D, width=4)
    f.d.ellipse([cx - R + 12, cy - R + 12, cx + R - 12, cy + R - 12], fill=CINNA)
    f.px(cx - 16, cy - 16, 32, 32, BG)  # 方孔
    f.d.rectangle([cx - 20, cy - 20, cx + 20, cy + 20], outline=GILT_L, width=3)
    for a in range(4):  # 四向雷点
        ang = a * math.pi / 2 + math.pi / 4
        f.px(cx + math.cos(ang) * (R - 22) - 2, cy + math.sin(ang) * (R - 22) - 2, 5, 5, GILT_L)
    f.save("pip-mon.png")


# =====================================================================
# 9. 连击溅射 combo-splash: 锈绿墨爆 + 金箔
# =====================================================================
def bake_combo():
    f = F(256, 256, 4)
    cx, cy = 128, 128
    for k in range(20):
        a = rnd() * math.pi * 2
        rr = rnd() * 52
        r = 16 + rnd() * 30
        f.d.ellipse([cx + math.cos(a) * rr - r, cy + math.sin(a) * rr * 0.8 - r * 0.8,
                     cx + math.cos(a) * rr + r, cy + math.sin(a) * rr * 0.8 + r * 0.8],
                    fill=(30, 50, 40, 255))
    f.d.ellipse([cx - 58, cy - 50, cx + 58, cy + 50], fill=BRONZE_D)
    for _ in range(26):  # 飞溅枝条
        a = rnd() * math.pi * 2
        L = 60 + rnd() * 52
        x2, y2 = cx + math.cos(a) * L, cy + math.sin(a) * L * 0.82
        f.d.line([cx + math.cos(a) * 40, cy + math.sin(a) * 34, x2, y2],
                 fill=(30, 50, 40, 255), width=2 + int(rnd() * 3))
        f.px(x2, y2, 2, 2, GILT if rnd() < 0.5 else BRONZE)
    for _ in range(22):  # 金箔
        a = rnd() * math.pi * 2
        rr = 20 + rnd() * 70
        f.px(cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8, 2, 2, GILT_L if rnd() < 0.5 else GILT)
    f.save("combo-splash.png")


# =====================================================================
# 10. 头像框 portrait-frame: 封闭中孔青铜方框
# =====================================================================
def bake_portrait_frame():
    f = F(256, 256, 4)
    x, y, w, h = 48, 44, 160, 168
    bw = 18
    f.px(x, y, w, h, BRONZE)          # 外体
    f.px(x + 3, y + 3, w - 6, h - 6, BRONZE_D)
    f.px(x + bw, y + bw, w - bw * 2, h - bw * 2, BG)  # 封闭孔
    # 框身雷纹 + 四角金饰
    meander(f, x + 4, y + 5, w - 8, 7, GILT_D, step=8)
    meander(f, x + 4, y + h - 12, w - 8, 7, GILT_D, step=8)
    for cxx, cyy in ((x, y), (x + w - 12, y), (x, y + h - 12), (x + w - 12, y + h - 12)):
        f.px(cxx, cyy, 12, 12, GILT)
        f.px(cxx + 3, cyy + 3, 6, 6, GILT_L)
    for sgn, ex in ((-1, x - 6), (1, x + w - 6)):  # 两侧小耳
        f.px(ex, y + h // 2 - 14, 12, 28, GILT_D)
        f.px(ex + 3, y + h // 2 - 8, 6, 16, BG)
    f.save("portrait-frame.png")


# =====================================================================
# 11. 血条框 healthbar-frame: 双轨+端帽+通透窗(自动测量契约)
# =====================================================================
def bake_hpframe():
    f = F(256, 256, 4)
    # 开放式框(契约): 双轨横贯 + 两端兽首帽与轨间留 2px 通气缝 ——
    # knockout 后中央填充窗与外界连通, _procHpFrame 自动测量才能生效
    x, y, w, h = 40, 112, 176, 32
    rail = 5
    f.px(x, y, w, rail, GILT)                    # 上轨
    f.px(x, y, w, 2, GILT_L)
    f.px(x, y + h - rail, w, rail, GILT_D)       # 下轨
    for ex, sgn in ((x - 18, 1), (x + w + 2, -1)):  # 端帽(与轨脱开 2px)
        f.px(ex, y - 4, 16, h + 8, BRONZE)
        f.px(ex + 3, y - 1, 10, h + 2, BRONZE_D)
        f.px(ex + (10 if sgn > 0 else 3), y + 8, 4, 4, GILT_L)   # 目
        f.px(ex + (10 if sgn > 0 else 3), y + h - 12, 4, 4, GILT_L)
        f.px(ex + (-6 if sgn > 0 else 16), y + 6, 6, 3, GILT_D)  # 耳钩(朝外)
        f.px(ex + (-6 if sgn > 0 else 16), y + h - 9, 6, 3, GILT_D)
    f.save("healthbar-frame.png")


# =====================================================================
# 12. 气力槽 meter-bar: 坐标契约复刻(青铜管重皮)
# =====================================================================
def bake_meter():
    im = Image.new("RGBA", (1024, 1024), BG)
    d = ImageDraw.Draw(im)
    # 胶囊放在裁切区 C{x:104,y:392,w:815,h:233} 内; 以下均为全图绝对坐标
    Cx, Cy = 104, 392
    # 预留擦除区(顶 y..+20 / 底 209..233)完全留空
    # 带区(in-crop y68..164 -> abs y460..556), 节点 in-crop x191.5/335.5/623
    bx1, bx2 = Cx + 56, Cx + 755          # 带区横向
    by1, by2 = Cy + 68, Cy + 164
    # 管体外轨(暗, lum<=55 保留; 距 BG 47 > tol38 不被抠): 上下轨 + 端头
    dark = (40, 46, 40, 255)              # lum≈42 -> 保留为暗结构
    d.rectangle([bx1 - 26, by1 - 22, bx2 + 26, by1 - 4], fill=dark)
    d.rectangle([bx1 - 26, by2 + 4, bx2 + 26, by2 + 22], fill=dark)
    d.rectangle([bx1 - 34, by1 - 22, bx1 - 8, by2 + 22], fill=dark)   # 左端头
    d.rectangle([bx2 + 8, by1 - 22, bx2 + 34, by2 + 22], fill=dark)
    # 端头金目(暗底上的小亮饰, 在带区外, 不参与重染)
    for ex in (bx1 - 28, bx2 + 14):
        d.rectangle([ex, by1 + 6, ex + 14, by1 + 20], fill=(52, 58, 50, 255))
        d.rectangle([ex + 4, by1 + 10, ex + 10, by1 + 16], fill=(64, 70, 58, 255))
    # 带区填充(亮, lum>55 参与变体重染): 中性浅铜 + 段内弧面明暗
    seg_marks = [191.5, 335.5, 623.0]     # in-crop 节点中心
    for x in range(bx1, bx2 + 1):
        u = (x - bx1) / (bx2 - bx1)
        for y in range(by1, by2 + 1):
            v = (y - by1) / (by2 - by1)
            arc = 1 - abs(v - 0.42) * 1.15          # 管面弧光
            lum = int(120 + 92 * max(0, arc) - 26 * abs(math.sin(u * 3.3)))
            d.point((x, y), fill=(lum, lum - 6, max(0, lum - 22), 255))
    # 暗节点(分段): lum<=55 保留 —— 竖带 + 绑绳斜纹
    for kx in seg_marks:
        ax = Cx + kx
        d.rectangle([ax - 7, by1 - 8, ax + 7, by2 + 8], fill=dark)
        d.line([ax - 7, by1 + 8, ax + 7, by1 + 20], fill=(50, 56, 48, 255), width=3)
        d.line([ax - 7, by2 - 20, ax + 7, by2 - 8], fill=(50, 56, 48, 255), width=3)
    im.save(os.path.join(OUT, "meter-bar.png"))
    print("  meter-bar.png  1024x1024 (坐标契约)")


# =====================================================================
# 13. 计时印 timer-seal: 青铜方印 + 羊皮窗
# =====================================================================
def bake_seal():
    f = F(256, 256, 4)
    x, y, w, h = 70, 64, 116, 128
    f.px(x, y, w, h, BRONZE)
    f.px(x + 4, y + 4, w - 8, h - 8, BRONZE_D)
    for cxx, cyy in ((x - 4, y - 4), (x + w - 10, y - 4), (x - 4, y + h - 10), (x + w - 10, y + h - 10)):
        f.px(cxx, cyy, 14, 14, GILT)
        f.px(cxx + 4, cyy + 4, 6, 6, GILT_D)
    f.px(x + w // 2 - 12, y - 16, 24, 14, GILT)   # 印钮
    f.px(x + w // 2 - 5, y - 24, 10, 9, GILT_D)
    # 羊皮窗(契约: r>170,g>140,b>90 的浅区)
    f.px(x + 16, y + 22, w - 32, h - 44, BONE)
    f.px(x + 16, y + 22, w - 32, 3, (250, 246, 232, 255))
    f.px(x + 16, y + h - 25, w - 32, 3, (206, 198, 178, 255))
    meander(f, x + 8, y + 8, w - 16, 6, GILT_D, step=8)
    meander(f, x + 8, y + h - 14, w - 16, 6, GILT_D, step=8)
    f.save("timer-seal.png")


# =====================================================================
# 14. 键帽 keycap: 青铜键(面区无红)
# =====================================================================
def bake_keycap():
    f = F(256, 256, 4)
    x, y, w, h = 62, 62, 132, 132
    f.px(x + 6, y + 10, w, h, INK)            # 投影
    f.px(x, y, w, h, BRONZE)
    f.px(x, y, w, 5, BRONZE_L)
    f.px(x, y + h - 6, w, 6, BRONZE_D)
    f.px(x + 10, y + 10, w - 20, h - 26, (50, 41, 43, 255))  # 键面(中性暗, 供刻字)
    f.px(x + 10, y + 10, w - 20, 3, (72, 62, 62, 255))
    for cxx, cyy in ((x + 2, y + 2), (x + w - 8, y + 2), (x + 2, y + h - 9), (x + w - 8, y + h - 9)):
        f.px(cxx, cyy, 7, 7, GILT)
    f.save("keycap.png")


# =====================================================================
# 15. 菜单面板 menu-panel: 青铜大牌(中带平涂契约)
# =====================================================================
def bake_panel():
    # 九宫格拉伸安全: 均匀边框 + 平涂芯, 无中部横竖装饰(标题菜单条/暂停面板/
    # 台词框共用, 任意宽高切片下都干净)
    f = F(256, 256, 4)
    x, y, w, h = 22, 30, 212, 196
    f.px(x, y, w, h, (26, 40, 34, 255))                # 芯: 全平涂
    f.px(x, y, w, 3, BRONZE)                           # 四缘: 铜线内衬
    f.px(x, y + h - 3, w, 3, BRONZE)
    f.px(x, y, 3, h, BRONZE)
    f.px(x + w - 3, y, 3, h, BRONZE)
    f.px(x + 1, y + 1, w - 2, 1, GILT_D)               # 金内描
    f.px(x + 1, y + h - 2, w - 2, 1, GILT_D)
    f.px(x + 1, y + 1, 1, h - 2, GILT_D)
    f.px(x + w - 2, y + 1, 1, h - 2, GILT_D)
    for cxx, cyy in ((x - 3, y - 3), (x + w - 11, y - 3), (x - 3, y + h - 11), (x + w - 11, y + h - 11)):
        f.px(cxx, cyy, 14, 14, GILT)                   # 四角铜钉
        f.px(cxx + 4, cyy + 4, 6, 6, GILT_D)
    f.save("menu-panel.png")


# =====================================================================
# 16/17. 标题背景 titlebg-gate(青铜大殿) / titlebg-moon(星宿夜台)
#   契约: 1024x1024, 消费带 = 顶部 rows top..top+576 (gate top=150, moon top=40)
# =====================================================================
def _eave(f, x0, x1, y, tip=4, th=4, col=INK, under=None):
    """翘角屋檐: 主檐板 + 两端阶梯上翘檐角 + 檐下阴影线"""
    f.px(x0, y, x1 - x0, th, col)
    for k in range(tip):  # 檐角逐级上翘外挑
        f.px(x0 - 1 - k, y - 1 - k, 2, th, col)
        f.px(x1 - 1 + k, y - 1 - k, 2, th, col)
    if under:
        f.px(x0 + 2, y + th, x1 - x0 - 4, 1, under)


def bake_titlebg_gate():
    """标题封面·血刃: 巨幅红日 + 中央庑殿顶青铜大殿 + 左右双阙楼(两重翘檐)
    —— 内容密度对齐原版屋檐构图, 视觉语言换成青铜/朱砂. 可见带 lo rows 37..181"""
    f = F(256, 256, 4)
    # 暮空(青铜夜) + 星
    sky = [(10, 14, 13), (13, 18, 16), (17, 24, 21), (23, 31, 26), (30, 40, 32)]
    for i, c in enumerate(sky):
        f.px(0, i * 26, 256, 26, (*c, 255))
    star_dots(f, 0, 30, 256, 46, 34)
    # 巨幅红日(压在建筑群后): 朱砂盘 + 横切暗带 + 顶弧微光
    cx, cy, R = 128, 86, 46
    for yy in range(-R, R + 1):
        half = int(math.sqrt(R * R - yy * yy))
        if half <= 0:
            continue
        band = (138, 42, 26, 255) if (yy % 9 in (0, 1) and yy > -R // 2) else CINNA
        if yy > R - 8:
            band = CINNA_D
        f.px(cx - half, cy + yy, half * 2, 1, band)
    for yy in range(-R, -R + 4):  # 顶缘微光
        half = int(math.sqrt(max(0, R * R - yy * yy)))
        f.px(cx - half, cy + yy, half * 2, 1, (224, 96, 60, 255))
    # 归鸟(远近两群)
    for bx, by, s in ((84, 58, 2), (100, 52, 3), (166, 62, 2), (178, 70, 2), (152, 48, 2)):
        f.px(bx - s, by, s, 1, INK)
        f.px(bx + 1, by, s, 1, INK)
        f.px(bx - s - 1, by - 1, 1, 1, INK)
        f.px(bx + s, by - 1, 1, 1, INK)
    # 远山脊
    for x in range(0, 256, 2):
        h = 10 + math.sin(x * 0.035 + 1.2) * 6 + math.sin(x * 0.012) * 4
        f.px(x, 104 - h, 2, h + 10, (17, 25, 21, 255))
    # ---- 左右阙楼(两重翘檐塔, 框住构图) ----
    for tx in (28, 228):
        f.px(tx - 9, 74, 18, 108, BRONZE_D)          # 塔身
        f.px(tx - 9, 74, 3, 108, (24, 38, 31, 255))  # 身侧影
        for k in range(4):                            # 金窗
            f.px(tx - 2, 84 + k * 22, 4, 5, GILT_D)
            f.px(tx - 1, 85 + k * 22, 2, 3, (255, 214, 120, 255))
        _eave(f, tx - 16, tx + 16, 100, tip=3, th=4, col=INK, under=(12, 18, 15, 255))   # 下檐
        _eave(f, tx - 13, tx + 13, 78, tip=3, th=4, col=INK, under=(12, 18, 15, 255))    # 上檐
        f.px(tx - 7, 70, 14, 4, INK)                  # 顶盖
        f.px(tx - 1, 66, 2, 4, GILT)                  # 顶刹
        # 檐角风铎
        for sgn in (-1, 1):
            f.px(tx + sgn * 15, 104, 1, 4, GILT_D)
            f.px(tx + sgn * 15 - 1, 108, 3, 3, GILT)
    # ---- 中央大殿(主体): 庑殿顶 + 斗拱 + 雷纹楣 + 兽面 + 朱门 ----
    gx0, gx1 = 74, 182
    ridge_y = 92
    f.px(gx0 + 14, ridge_y, gx1 - gx0 - 28, 4, INK)               # 正脊
    for sgn, ex in ((-1, gx0 + 12), (1, gx1 - 14)):               # 鸱吻(脊端上钩)
        f.px(ex, ridge_y - 4, 3, 6, INK)
        f.px(ex + (1 if sgn < 0 else -1), ridge_y - 6, 2, 3, GILT_D)
    # 主檐(大翘角) + 檐下斗拱点阵
    _eave(f, gx0, gx1, ridge_y + 6, tip=5, th=6, col=INK, under=(10, 16, 13, 255))
    for x in range(gx0 + 6, gx1 - 6, 7):
        f.px(x, ridge_y + 13, 3, 3, GILT_D if (x // 7) % 2 else BRONZE)
    # 檐角垂脊兽 + 风铎
    for sgn, ex in ((-1, gx0 - 4), (1, gx1 + 2)):
        f.px(ex, ridge_y + 1, 3, 3, GILT_D)
        f.px(ex + 1, ridge_y + 16, 1, 5, GILT_D)
        f.px(ex, ridge_y + 21, 3, 3, GILT)
    # 楣: 云雷纹横带
    f.px(gx0 + 8, ridge_y + 18, gx1 - gx0 - 16, 12, BRONZE_D)
    meander(f, gx0 + 12, ridge_y + 20, gx1 - gx0 - 24, 8, GILT_D, step=9)
    # 殿身 + 柱
    f.px(gx0 + 8, ridge_y + 30, gx1 - gx0 - 16, 52, (22, 34, 28, 255))
    for px_ in (gx0 + 12, gx0 + 34, gx1 - 38, gx1 - 16):
        f.px(px_, ridge_y + 30, 5, 52, BRONZE)
        f.px(px_, ridge_y + 30, 2, 52, BRONZE_L)
        f.px(px_ - 1, ridge_y + 78, 7, 4, BRONZE_D)   # 柱础
    # 兽面(缩小居中, 门上方)
    taotie_eyes(f, 128, ridge_y + 38, 5)
    # 朱漆大门 + 门钉 + 铺首
    f.px(116, ridge_y + 48, 24, 34, CINNA_D)
    f.px(117, ridge_y + 48, 10, 34, CINNA)
    for ky in range(3):
        for kx in range(3):
            f.px(118 + kx * 7, ridge_y + 52 + ky * 9, 2, 2, GILT)
    f.px(126, ridge_y + 64, 4, 4, GILT_L)             # 铺首
    # ---- 前景祭台 + 雷纹栏 + 火盆 ----
    f.px(0, 172, 256, 84, (15, 21, 18, 255))
    f.px(0, 172, 256, 2, (40, 56, 46, 255))
    f.px(96, 168, 64, 4, (26, 38, 32, 255))           # 台阶
    f.px(104, 164, 48, 4, (22, 32, 27, 255))
    for x in range(4, 252, 18):                        # 栏柱
        f.px(x, 176, 4, 10, (24, 35, 29, 255))
        f.px(x + 1, 174, 2, 2, GILT_D)
    for bx in (62, 194):                               # 火盆(近景, 微光)
        f.px(bx - 7, 164, 14, 11, INK)
        f.px(bx - 9, 174, 18, 3, (10, 15, 12, 255))
        f.px(bx - 4, 159, 8, 6, CINNA)
        f.px(bx - 2, 156, 4, 4, (255, 170, 90, 255))
        f.px(bx - 1, 154, 2, 2, (255, 224, 150, 255))
    f.save("titlebg-gate.png")


def bake_titlebg_moon():
    f = F(256, 256, 4)
    # 可见带 lo rows 10..154 —— 星宿夜空 + 青铜观星台(选人页背景, 偏净)
    for i in range(8):
        c = (8 + i * 2, 12 + i * 2, 14 + i * 2, 255)
        f.px(0, i * 20, 256, 20, c)
    f.px(0, 160, 256, 96, (22, 28, 30, 255))
    star_dots(f, 0, 6, 256, 120, 90)
    # 二十八宿连线(几组星官)
    for gx, gy in ((44, 30), (150, 22), (208, 52), (92, 58)):
        pts = [(gx, gy)]
        for k in range(3):
            pts.append((pts[-1][0] + 8 + rnd() * 12, pts[-1][1] + (rnd() * 12 - 6)))
        for k in range(len(pts) - 1):
            f.d.line([*pts[k], *pts[k + 1]], fill=(70, 84, 92, 255), width=1)
        for p in pts:
            f.px(p[0] - 1, p[1] - 1, 2, 2, (222, 232, 238, 255))
    # 鎏金环月(玦月 —— 呼应光标): 置于左上净空区, 暗调不与前景 UI 打架
    cx, cy, R = 52, 34, 18
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GILT_D)
    f.d.ellipse([cx - R + 5, cy - R + 5, cx + R - 5, cy + R - 5], fill=(10, 14, 16, 255))
    f.d.ellipse([cx - R + 7, cy - R + 3, cx + R - 3, cy + R - 7], fill=(16, 22, 24, 255))
    # 远景观星台群
    for bx, bw, bh in ((30, 34, 40), (96, 26, 30), (150, 30, 24), (216, 36, 46)):
        f.px(bx - bw // 2, 160 - bh, bw, bh + 96, (17, 23, 26, 255))
        f.px(bx - bw // 2 - 4, 160 - bh - 4, bw + 8, 5, (26, 34, 37, 255))
        for k in range(int(bh / 9)):
            f.px(bx - bw // 2 + 4, 160 - bh + 6 + k * 9, 3, 3, (52, 66, 60, 255))
    # 前景青铜栏(select 网格坐落其上)
    f.px(0, 208, 256, 48, (13, 18, 17, 255))
    f.px(0, 208, 256, 2, (38, 52, 44, 255))
    for x in range(6, 256, 24):
        f.px(x, 210, 3, 46, (24, 33, 29, 255))
    f.save("titlebg-moon.png")


# =====================================================================
# 17.5 「血刃」定制字标 title-logo (330x150, 透明底, 直读不抠图)
#   设计: 楷书骨架 -> 像素化笔触 -> 玉白骨+阴刻缘+顶光 -> 刀痕斩口(错位)
#         + 贯穿血痕(朱砂线+滴血) —— "被刃劈开的字"
# =====================================================================
def _load_cn_font(size):
    from PIL import ImageFont
    for fn in ("STXINGKA.TTF", "STKAITI.TTF", "simkai.ttf", "SIMLI.TTF", "msyhbd.ttc", "simhei.ttf"):
        p = os.path.join(r"C:\Windows\Fonts", fn)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size), fn
            except Exception:
                continue
    return None, None


def _char_mask(ch, box, px_block=4):
    """字形骨架 -> 像素化 alpha mask (box x box)"""
    ss = box * px_block
    font, _ = _load_cn_font(int(ss * 0.96))
    m = Image.new("L", (ss, ss), 0)
    d = ImageDraw.Draw(m)
    bb = d.textbbox((0, 0), ch, font=font)
    d.text(((ss - bb[2] - bb[0]) / 2, (ss - bb[3] - bb[1]) / 2), ch, fill=255, font=font)
    # 像素化 + 加粗: 低阈值二值化后再膨胀 1px(行楷细锋在像素下太瘦)
    lo = m.resize((box, box), Image.BILINEAR).point(lambda v: 255 if v > 64 else 0)
    fat = lo.copy()
    lp, fp = lo.load(), fat.load()
    for y in range(box):
        for x in range(box):
            if lp[x, y]:
                continue
            if any(0 <= x + dx < box and 0 <= y + dy < box and lp[x + dx, y + dy]
                   for dx, dy in ((-1, 0), (1, 0), (0, 1))):
                fp[x, y] = 255
    return fat


def bake_logo():
    W, H, CB = 330, 150, 132
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    masks = []
    for ch, cx in (("血", 109), ("刃", 221)):
        mk = _char_mask(ch, CB)
        masks.append((mk, cx - CB // 2, (H - CB) // 2))
    # 刀痕斩口: 每字一道 -32° 斩线(把笔画切开 3px), 下半错位下沉 2px
    def gash(mk, x0, y0, gx, gy):
        mp = mk.load()
        moved = Image.new("L", mk.size, 0)
        mv = moved.load()
        for y in range(mk.size[1]):
            for x in range(mk.size[0]):
                if not mp[x, y]:
                    continue
                d = (x + x0 - gx) * 0.62 + (y + y0 - gy) * 1.0  # 斩线法向距离
                if -2 <= d <= 2:
                    mp[x, y] = 0            # 切开
                elif d > 2:
                    mv[x, y] = 255          # 下半片(待错位)
                    mp[x, y] = 0
        mk.paste(moved.transform(mk.size, Image.AFFINE, (1, 0, -3, 0, 1, 2)), (0, 0),
                 moved.transform(mk.size, Image.AFFINE, (1, 0, -3, 0, 1, 2)))
        return mk
    masks = [(gash(mk, ox, oy, ox + CB * (0.62 if i == 0 else 0.42), oy + CB * 0.52), ox, oy)
             for i, (mk, ox, oy) in enumerate(masks)]
    # 着色: 玉白骨 + 阴刻缘 + 顶光
    BONE_C = (238, 232, 214); RIM = (146, 134, 108); TOP = (255, 252, 242); INKC = (22, 16, 14)
    for mk, ox, oy in masks:
        mp = mk.load()
        w, h = mk.size
        a = lambda x, y: 0 <= x < w and 0 <= y < h and mp[x, y] > 0
        for y in range(h):
            for x in range(w):
                if not a(x, y):
                    continue
                edge = not (a(x - 1, y) and a(x + 1, y) and a(x, y - 1) and a(x, y + 1))
                c = RIM if edge else (TOP if not a(x, y - 2) else BONE_C)
                px[ox + x, oy + y] = (*c, 255)
    # 阴刻外描边(1px)
    snap = im.copy(); sp = snap.load()
    for y in range(H):
        for x in range(W):
            if sp[x, y][3]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and sp[x + dx, y + dy][3] > 0
                   for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                px[x, y] = (*INKC, 255)
    # 贯穿血痕: 锥形刀光(尾宽头尖, 微弧) + 亮芯, 尾端滴血
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 306, 16, 22, 128
    n_seg = 90
    for k in range(n_seg):
        u = k / (n_seg - 1)
        sx = x0 + (x1 - x0) * u
        sy = y0 + (y1 - y0) * u - math.sin(u * math.pi) * 7   # 微弧
        w_ = max(1, round(5 * (1 - u) + 1))                    # 锥形: 起端宽 -> 尖尾
        d.ellipse([sx - w_, sy - w_ * 0.7, sx + w_, sy + w_ * 0.7], fill=(200, 69, 44, 255))
    for k in range(n_seg):  # 亮芯(偏上)
        u = k / (n_seg - 1)
        sx = x0 + (x1 - x0) * u
        sy = y0 + (y1 - y0) * u - math.sin(u * math.pi) * 7 - 1
        if u < 0.75:
            d.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(255, 236, 214, 235))
    _s = [20260808]
    def r2():
        _s[0] = (_s[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return _s[0] / 0x7FFFFFFF
    for k in range(4):  # 滴血
        u = 0.18 + r2() * 0.6
        dx, dy = int(x0 + (x1 - x0) * u), int(y0 + (y1 - y0) * u)
        for j in range(2 + int(r2() * 4)):
            im.putpixel((min(W - 1, dx), min(H - 1, dy + 3 + j)), (172, 48, 30, 255))
        im.putpixel((min(W - 1, dx), min(H - 1, dy + 6 + int(r2() * 5))), (200, 69, 44, 255))
    im.save(os.path.join(OUT, "title-logo.png"))
    print("  title-logo.png  330x150 (血刃字标)")


# =====================================================================
# 18. favicon: 迷你璧徽
# =====================================================================
def bake_favicon():
    f = F(32, 32, 2)
    f.d.ellipse([3, 3, 28, 28], fill=GILT)
    f.d.ellipse([8, 8, 23, 23], fill=BRONZE_D)
    f.d.ellipse([12, 12, 19, 19], fill=BG)
    f.px(15, 1, 2, 13, BONE)
    f.px(13, 20, 6, 3, GILT_L)
    f.save("favicon.png")


# =====================================================================
# preview 拼图
# =====================================================================
def preview():
    files = sorted(fn for fn in os.listdir(OUT) if fn.endswith(".png"))
    cols = 5
    cell = 210
    rows = (len(files) + cols - 1) // cols
    board = Image.new("RGB", (cols * cell, rows * cell + 16), (14, 14, 18))
    from PIL import ImageDraw as _ID
    bd = _ID.Draw(board)
    for i, fn in enumerate(files):
        im = Image.open(os.path.join(OUT, fn)).convert("RGBA")
        im.thumbnail((cell - 14, cell - 26), Image.NEAREST)
        px, py = (i % cols) * cell, (i // cols) * cell
        board.paste(im, (px + (cell - im.width) // 2, py + (cell - 22 - im.height) // 2), im)
        bd.text((px + 6, py + cell - 18), fn, fill=(180, 190, 200))
    board.save(os.path.join(ROOT, "artlib", "preview.png"))
    print(f"preview: artlib/preview.png ({len(files)} assets)")


if __name__ == "__main__":
    print("baking uilib –「青铜·雷紋」…")
    bake_title_emblem("title-zangetsu.png")
    bake_title_emblem("title-emblem.png", compact=True)
    bake_logo()
    bake_vs()
    bake_band("band2-cut.png", "ann")
    bake_band("band-win.png", "win")
    bake_band("band-lose.png", "lose")
    bake_result("result-win.png", True)
    bake_result("result-lose.png", False)
    bake_announce()
    bake_cursor()
    bake_nameplate()
    bake_pip()
    bake_combo()
    bake_portrait_frame()
    bake_hpframe()
    bake_meter()
    bake_seal()
    bake_keycap()
    bake_panel()
    bake_titlebg_gate()
    bake_titlebg_moon()
    bake_favicon()
    preview()
    print("done.")
