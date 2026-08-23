# -*- coding: utf-8 -*-
"""刀魂PLUS · artlib 自产 UI 资产生成器 —— 「电力·蓝金」设计体系.

全部资产由本脚本程序化绘制(Pillow), 零外部素材, 零 AI 生成图 —— 项目自有
设计资产库, 与原项目 ui-lab(和风红金/AI绘)在视觉语言上完全区分:

  设计语言: 重庆电力高等专科学校 —— 电力蓝(electric blue) x 鎏金(gilt) x 警示红
  母题: 电流锯齿纹 / 六边形绝缘子 / 闪电 / 高压线塔 / 星点
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
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # 仓库根, 直接就地烘焙
OUT = os.path.join(ROOT, "assets", "uilib")
os.makedirs(OUT, exist_ok=True)

# ---------------- palette 「电力·蓝金」 ----------------
BG      = (10, 26, 42, 255)      # 深空蓝（knockout 色；距一切实体色 >38）
INK     = (30, 50, 70, 255)      # 深灰蓝（距 BG 44 > tol38，保留）
BLUE_D  = (26, 58, 100, 255)     # 电力深蓝
BLUE    = (42, 102, 168, 255)    # 电力蓝
BLUE_L  = (80, 160, 220, 255)    # 亮蓝
GOLD_D  = (200, 160, 40, 255)    # 暗金
GOLD    = (240, 200, 60, 255)    # 鎏金
GOLD_L  = (255, 230, 120, 255)   # 亮金
RED     = (220, 60, 60, 255)     # 警示红
RED_D   = (160, 40, 40, 255)     # 暗红
WHITE   = (240, 245, 250, 255)   # 玉白
ASH     = (150, 170, 190, 255)   # 灰
ASH_D   = (80, 100, 120, 255)    # 深灰

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
    """电流锯齿纹：代替云雷纹，以方波锯齿表现电流"""
    n = int(w // step)
    for i in range(n):
        bx = x + i * step
        f.px(bx, y, step//2, lw, c)
        f.px(bx + step//2, y, lw, h, c)
        f.px(bx + step//2, y + h - lw, step//2, lw, c)
        f.px(bx + step - lw, y + h - lw, lw, -h, c)


def hex_insignia(f, cx, cy, s, fill_color=BLUE, outline_color=GOLD):
    """六边形绝缘子/塔基符号——代替兽面双目"""
    for sgn in (-1, 1):
        ex = cx + sgn * s * 1.8
        pts = []
        for k in range(6):
            a = math.pi/6 + k * math.pi/3
            px = ex + s * 0.9 * math.cos(a)
            py = cy + s * 0.7 * math.sin(a)
            pts.append((px, py))
        f.d.polygon(pts, fill=fill_color, outline=outline_color)
        f.d.ellipse([ex - s*0.3, cy - s*0.3, ex + s*0.3, cy + s*0.3], fill=GOLD_L)


def electric_field(f, x, y, w, h, base=BLUE_D, fleck=BLUE, density=0.06):
    """电力蓝底面：平涂 + 亮蓝星点"""
    f.px(x, y, w, h, base)
    n = int(w * h * density)
    for _ in range(n):
        fx, fy = x + rnd() * (w - 2), y + rnd() * (h - 2)
        f.px(fx, fy, 1 + int(rnd() * 2), 1, fleck if rnd() < 0.8 else GOLD_D)


def star_dots(f, x, y, w, h, n, c=(214, 226, 232, 255)):
    for _ in range(n):
        sx, sy = x + rnd() * w, y + rnd() * h
        f.px(sx, sy, 1, 1, c)
        if rnd() < 0.18:
            f.px(sx - 1, sy, 3, 1, (c[0], c[1], c[2], 120))
            f.px(sx, sy - 1, 1, 3, (c[0], c[1], c[2], 120))


def draw_lightning(f, x1, y1, x2, y2, color=GOLD_L, width=2):
    """绘制闪电折线"""
    dx = x2 - x1
    dy = y2 - y1
    pts = [(x1, y1)]
    for k in range(1, 5):
        t = k / 5.0
        ox = dx * t + (rnd() - 0.5) * 12
        oy = dy * t + (rnd() - 0.5) * 12
        pts.append((x1 + ox, y1 + oy))
    pts.append((x2, y2))
    for i in range(len(pts)-1):
        f.d.line([pts[i], pts[i+1]], fill=color, width=width)


# =====================================================================
# 1. 标题徽记 title-zangetsu (电力璧·闪电徽) + title-emblem (小徽)
# =====================================================================
def bake_title_emblem(name, compact=False):
    f = F(256, 256, 4)
    cx, cy = 128, 128
    R = 78 if not compact else 82
    for r, c in [(R + 8, GOLD_D), (R + 5, GOLD), (R, BLUE), (R - 16, BLUE_D)]:
        f.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    f.d.ellipse([cx - (R - 22), cy - (R - 22), cx + (R - 22), cy + (R - 22)], fill=BG)
    f.d.ellipse([cx - (R - 20), cy - (R - 20), cx + (R - 20), cy + (R - 20)], outline=GOLD_L, width=2)
    for k in range(8):
        a0 = k * math.pi / 4 + 0.14
        rr = R - 9
        prev = None
        for j in range(7):
            a = a0 + j * 0.075
            r_j = rr + (3 if j % 2 else -3)
            p = (cx + math.cos(a) * r_j, cy + math.sin(a) * r_j)
            if prev:
                f.d.line([*prev, *p], fill=GOLD_D if k % 2 else GOLD, width=2)
            prev = p
    draw_lightning(f, cx, cy - R - 18, cx, cy + R + 4, color=WHITE, width=4)
    draw_lightning(f, cx, cy - R - 18, cx, cy + R + 4, color=GOLD_L, width=1)
    for sgn in (-1, 1):
        hex_insignia(f, cx + sgn * (R - 12), cy - 12, 6, fill_color=BLUE_L, outline_color=GOLD)
        hex_insignia(f, cx + sgn * (R - 12), cy + 12, 6, fill_color=BLUE_L, outline_color=GOLD)
    f.d.ellipse([cx + R - 6, cy + R - 12, cx + R + 8, cy + R + 2], fill=RED)
    f.px(cx + R - 2, cy + R - 8, 6, 6, RED_D)
    f.save(name)


# =====================================================================
# 2. VS 徽章 vs-emblem-v2: 高压塔 + 闪电交叉
# =====================================================================
def bake_vs():
    f = F(256, 256, 4)
    cx, cy = 128, 126
    pts = []
    for k in range(6):
        a = math.pi/6 + k * math.pi/3
        r = 66
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    f.d.polygon(pts, fill=BLUE, outline=GOLD, width=3)
    f.d.line([cx, cy - 66, cx, cy + 66], fill=GOLD, width=4)
    f.d.line([cx - 30, cy - 46, cx + 30, cy - 46], fill=GOLD, width=3)
    f.d.line([cx - 24, cy - 24, cx + 24, cy - 24], fill=GOLD, width=3)
    draw_lightning(f, cx - 40, cy + 40, cx + 40, cy - 40, color=WHITE, width=3)
    draw_lightning(f, cx + 40, cy + 40, cx - 40, cy - 40, color=WHITE, width=3)
    f.d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=RED, outline=GOLD_L, width=2)
    f.px(cx - 5, cy - 5, 4, 4, WHITE)
    f.save("vs-emblem-v2.png")


# =====================================================================
# 3. 三漆带 band2-cut / band-win / band-lose (1024x198, x2)
# =====================================================================
def bake_band(name, mode):
    f = F(512, 99, 2)
    main = {"ann": BLUE_D, "win": (40, 70, 140, 255), "lose": ASH_D}[mode]
    edge = {"ann": GOLD, "win": GOLD_L, "lose": ASH}[mode]
    deco = {"ann": BLUE, "win": GOLD, "lose": (100, 120, 140, 255)}[mode]
    electric_field(f, 0, 4, 512, 88, main, deco, 0.015)
    for y in (4, 88):
        f.px(0, y, 512, 3, edge)
        f.px(0, y + (3 if y == 4 else -1), 512, 1, GOLD_D if mode != "lose" else ASH_D)
    meander(f, 6, 56, 500, 7, deco, step=10)
    if mode == "win":
        star_dots(f, 30, 54, 452, 18, 20, (255, 232, 160, 200))
    if mode == "lose":
        for _ in range(16):
            rx, ry = rnd() * 512, 52 + rnd() * 32
            f.px(rx, ry, 1, 3 + rnd() * 4, (120, 136, 150, 160))
    for sx in (24, 488):
        f.d.ellipse([sx - 9, 22, sx + 9, 42], fill=deco, outline=edge)
        f.px(sx - 2, 7, 4, 16, edge)
        for k in range(3):
            f.px(sx - 6 + k * 5, 42, 3, 22 + (k % 2) * 8, edge if k == 1 else deco)
            f.px(sx - 6 + k * 5, 62 + (k % 2) * 8, 3, 3, GOLD_L if mode == "win" else edge)
    pw = 128 if mode == "ann" else 110
    pc = {"ann": WHITE, "win": (240, 228, 196, 255), "lose": (214, 218, 222, 255)}[mode]
    pd = {"ann": (196, 188, 168, 255), "win": (206, 188, 150, 255), "lose": (176, 182, 190, 255)}[mode]
    cx = 256
    f.px(cx - pw, 14, pw * 2, 36, pc)
    f.px(cx - pw, 14, pw * 2, 3, (250, 246, 234, 255))
    f.px(cx - pw, 47, pw * 2, 3, pd)
    f.px(cx - pw, 14, 3, 36, pd)
    f.px(cx + pw - 3, 14, 3, 36, pd)
    for sx in (cx - pw + 7, cx + pw - 10):
        f.px(sx, 30, 4, 4, edge)
    f.save(name)


# =====================================================================
# 4. 结算背景 result-win / result-lose (1024x576, x4)
# =====================================================================
def bake_result(name, win):
    f = F(256, 144, 4)
    if win:
        sky = [(8, 20, 38), (12, 30, 50), (18, 42, 64), (26, 56, 80), (38, 72, 98)]
        for i, c in enumerate(sky):
            f.px(0, i * 29, 256, 29, (*c, 255))
        cx, cy, R = 128, 66, 34
        for k in range(28):
            a = k * math.pi / 14 + 0.11
            L = 120 + (k % 3) * 26
            x2, y2 = cx + math.cos(a) * L, cy + math.sin(a) * L * 0.72
            f.d.line([cx, cy, x2, y2], fill=(200, 160, 40, 180), width=2)
        f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GOLD, outline=GOLD_L, width=2)
        f.d.ellipse([cx - R + 8, cy - R + 8, cx + R - 12, cy + R - 12], fill=GOLD_L)
        star_dots(f, 0, 0, 256, 60, 40, (255, 236, 170, 220))
        ground, gd = (42, 60, 80, 255), (30, 44, 60, 255)
    else:
        sky = [(6, 12, 20), (8, 16, 28), (12, 22, 38), (16, 30, 50), (22, 40, 64)]
        for i, c in enumerate(sky):
            f.px(0, i * 29, 256, 29, (*c, 255))
        cx, cy, R = 128, 60, 26
        f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=ASH, outline=ASH_D)
        f.d.ellipse([cx - 10, cy - 8, cx + 2, cy + 4], fill=ASH_D)
        for _ in range(70):
            rx, ry = rnd() * 256, rnd() * 120
            f.px(rx, ry, 1, 5 + rnd() * 5, (86, 100, 114, 150))
        ground, gd = (24, 30, 38, 255), (16, 20, 27, 255)
    for layer, (top, col) in enumerate([(84, BLUE_D), (100, INK)]):
        for x in range(0, 256, 2):
            h = 14 + math.sin(x * 0.045 + layer * 2.2) * 9 + math.sin(x * 0.013 + layer) * 7
            f.px(x, top - h, 2, h + 60, col)
    f.px(0, 118, 256, 26, ground)
    f.px(0, 118, 256, 2, gd)
    for i in range(10):
        f.px(i * 26, 122 + (i % 2) * 3, 12, 2, gd)
    for bx in (26, 230):
        f.px(bx - 9, 92, 18, 4, GOLD_D if win else ASH_D)
        f.d.polygon([(bx - 8, 96), (bx + 8, 96), (bx + 6, 116), (bx - 6, 116)], fill=GOLD_D if win else ASH_D)
        f.px(bx - 2, 88, 4, 5, GOLD_D if win else ASH_D)
    f.save(name)


# =====================================================================
# 5. 公告墨块 announce-brush (供 _inkCentroid)
# =====================================================================
def bake_announce():
    f = F(256, 256, 4)
    cx, cy = 128, 128
    for k in range(26):
        a = rnd() * math.pi * 2
        rr = 30 + rnd() * 60
        ex, ey = cx + math.cos(a) * rr * 1.5, cy + math.sin(a) * rr * 0.45
        r = 22 + rnd() * 26
        f.d.ellipse([ex - r * 1.5, ey - r * 0.62, ex + r * 1.5, ey + r * 0.62], fill=(20, 30, 50, 255))
    f.d.ellipse([cx - 108, cy - 40, cx + 108, cy + 40], fill=INK)
    meander(f, cx - 92, cy - 30, 184, 6, (44, 66, 90, 255), step=8)
    meander(f, cx - 92, cy + 24, 184, 6, (44, 66, 90, 255), step=8)
    for _ in range(30):
        a = rnd() * math.pi * 2
        rr = 95 + rnd() * 34
        f.px(cx + math.cos(a) * rr * 1.25, cy + math.sin(a) * rr * 0.5, 1 + int(rnd() * 2), 1, GOLD if rnd() < 0.7 else GOLD_L)
    f.save("announce-brush.png")


# =====================================================================
# 6. 光标 cursor-fan -> 金玦
# =====================================================================
def bake_cursor():
    f = F(256, 256, 4)
    cx, cy, R = 128, 128, 56
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GOLD)
    f.d.ellipse([cx - R + 10, cy - R + 10, cx + R - 10, cy + R - 10], fill=BG)
    f.d.polygon([(cx + R - 26, cy - 13), (cx + R + 12, cy - 20), (cx + R + 12, cy + 20), (cx + R - 26, cy + 13)], fill=BG)
    f.d.polygon([(cx + R - 4, cy - 8), (cx + R + 18, cy), (cx + R - 4, cy + 8)], fill=RED)
    for k in range(10):
        a = 0.6 + k * (math.pi * 1.5) / 10
        x1, y1 = cx + math.cos(a) * (R - 9), cy + math.sin(a) * (R - 9)
        f.px(x1 - 1, y1 - 1, 3, 3, GOLD_L if k % 2 else GOLD_D)
    f.save("cursor-fan.png")


# =====================================================================
# 7. 铭牌 nameplate
# =====================================================================
def bake_nameplate():
    f = F(256, 256, 4)
    x, y, w, h = 24, 104, 212, 46
    f.px(x, y, w, h, BLUE_D)
    f.px(x, y, w, 3, BLUE_L)
    f.px(x, y + h - 3, w, 3, INK)
    meander(f, x + 26, y + 4, w - 34, 6, BLUE, step=8)
    f.px(x + 26, y + h - 10, w - 34, 2, BLUE)
    f.d.ellipse([x - 14, y + 6, x + 20, y + h - 6], fill=GOLD, outline=GOLD_D)
    f.d.ellipse([x - 5, y + 15, x + 11, y + h - 15], fill=BG)
    f.px(x - 2, y + h - 4, 3, 12, GOLD_D)
    f.px(x + 4, y + h - 2, 3, 9, GOLD)
    f.save("nameplate.png")


# =====================================================================
# 8. 胜场徽 pip-mon
# =====================================================================
def bake_pip():
    f = F(256, 256, 4)
    cx, cy, R = 128, 128, 62
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GOLD, outline=GOLD_D, width=4)
    f.d.ellipse([cx - R + 12, cy - R + 12, cx + R - 12, cy + R - 12], fill=RED)
    f.px(cx - 16, cy - 16, 32, 32, BG)
    f.d.rectangle([cx - 20, cy - 20, cx + 20, cy + 20], outline=GOLD_L, width=3)
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        f.px(cx + math.cos(ang) * (R - 22) - 2, cy + math.sin(ang) * (R - 22) - 2, 5, 5, GOLD_L)
    f.save("pip-mon.png")


# =====================================================================
# 9. 连击溅射 combo-splash
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
                    fill=(30, 50, 80, 255))
    f.d.ellipse([cx - 58, cy - 50, cx + 58, cy + 50], fill=BLUE_D)
    for _ in range(26):
        a = rnd() * math.pi * 2
        L = 60 + rnd() * 52
        x2, y2 = cx + math.cos(a) * L, cy + math.sin(a) * L * 0.82
        f.d.line([cx + math.cos(a) * 40, cy + math.sin(a) * 34, x2, y2],
                 fill=(30, 50, 80, 255), width=2 + int(rnd() * 3))
        f.px(x2, y2, 2, 2, GOLD if rnd() < 0.5 else BLUE)
    for _ in range(22):
        a = rnd() * math.pi * 2
        rr = 20 + rnd() * 70
        f.px(cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8, 2, 2, GOLD_L if rnd() < 0.5 else GOLD)
    f.save("combo-splash.png")


# =====================================================================
# 10. 头像框 portrait-frame
# =====================================================================
def bake_portrait_frame():
    f = F(256, 256, 4)
    x, y, w, h = 48, 44, 160, 168
    bw = 18
    f.px(x, y, w, h, BLUE)
    f.px(x + 3, y + 3, w - 6, h - 6, BLUE_D)
    f.px(x + bw, y + bw, w - bw * 2, h - bw * 2, BG)
    meander(f, x + 4, y + 5, w - 8, 7, GOLD_D, step=8)
    meander(f, x + 4, y + h - 12, w - 8, 7, GOLD_D, step=8)
    for cxx, cyy in ((x, y), (x + w - 12, y), (x, y + h - 12), (x + w - 12, y + h - 12)):
        f.px(cxx, cyy, 12, 12, GOLD)
        f.px(cxx + 3, cyy + 3, 6, 6, GOLD_L)
    for sgn, ex in ((-1, x - 6), (1, x + w - 6)):
        f.px(ex, y + h // 2 - 14, 12, 28, GOLD_D)
        f.px(ex + 3, y + h // 2 - 8, 6, 16, BG)
    f.save("portrait-frame.png")


# =====================================================================
# 11. 血条框 healthbar-frame
# =====================================================================
def bake_hpframe():
    f = F(256, 256, 4)
    x, y, w, h = 40, 112, 176, 32
    rail = 5
    f.px(x, y, w, rail, GOLD)
    f.px(x, y, w, 2, GOLD_L)
    f.px(x, y + h - rail, w, rail, GOLD_D)
    for ex, sgn in ((x - 18, 1), (x + w + 2, -1)):
        f.px(ex, y - 4, 16, h + 8, BLUE)
        f.px(ex + 3, y - 1, 10, h + 2, BLUE_D)
        f.px(ex + (10 if sgn > 0 else 3), y + 8, 4, 4, GOLD_L)
        f.px(ex + (10 if sgn > 0 else 3), y + h - 12, 4, 4, GOLD_L)
        f.px(ex + (-6 if sgn > 0 else 16), y + 6, 6, 3, GOLD_D)
        f.px(ex + (-6 if sgn > 0 else 16), y + h - 9, 6, 3, GOLD_D)
    f.save("healthbar-frame.png")


# =====================================================================
# 12. 气力槽 meter-bar (坐标契约复刻, 配色改为电力蓝)
# =====================================================================
def bake_meter():
    im = Image.new("RGBA", (1024, 1024), BG)
    d = ImageDraw.Draw(im)
    Cx, Cy = 104, 392
    bx1, bx2 = Cx + 56, Cx + 755
    by1, by2 = Cy + 68, Cy + 164
    dark = (30, 50, 70, 255)
    d.rectangle([bx1 - 26, by1 - 22, bx2 + 26, by1 - 4], fill=dark)
    d.rectangle([bx1 - 26, by2 + 4, bx2 + 26, by2 + 22], fill=dark)
    d.rectangle([bx1 - 34, by1 - 22, bx1 - 8, by2 + 22], fill=dark)
    d.rectangle([bx2 + 8, by1 - 22, bx2 + 34, by2 + 22], fill=dark)
    for ex in (bx1 - 28, bx2 + 14):
        d.rectangle([ex, by1 + 6, ex + 14, by1 + 20], fill=(52, 70, 90, 255))
        d.rectangle([ex + 4, by1 + 10, ex + 10, by1 + 16], fill=(80, 110, 140, 255))
    seg_marks = [191.5, 335.5, 623.0]
    for x in range(bx1, bx2 + 1):
        u = (x - bx1) / (bx2 - bx1)
        for y in range(by1, by2 + 1):
            v = (y - by1) / (by2 - by1)
            arc = 1 - abs(v - 0.42) * 1.15
            lum = int(80 + 130 * max(0, arc) - 30 * abs(math.sin(u * 3.3)))
            r = int(20 + 0.4 * (lum - 80))
            g = int(60 + 0.8 * (lum - 80))
            b = int(140 + 0.5 * (lum - 80))
            d.point((x, y), fill=(max(0,min(255,r)), max(0,min(255,g)), max(0,min(255,b)), 255))
    for kx in seg_marks:
        ax = Cx + kx
        d.rectangle([ax - 7, by1 - 8, ax + 7, by2 + 8], fill=dark)
        d.line([ax - 7, by1 + 8, ax + 7, by1 + 20], fill=(60, 80, 100, 255), width=3)
        d.line([ax - 7, by2 - 20, ax + 7, by2 - 8], fill=(60, 80, 100, 255), width=3)
    im.save(os.path.join(OUT, "meter-bar.png"))
    print("  meter-bar.png  1024x1024 (坐标契约)")


# =====================================================================
# 13. 计时印 timer-seal
# =====================================================================
def bake_seal():
    f = F(256, 256, 4)
    x, y, w, h = 70, 64, 116, 128
    f.px(x, y, w, h, BLUE)
    f.px(x + 4, y + 4, w - 8, h - 8, BLUE_D)
    for cxx, cyy in ((x - 4, y - 4), (x + w - 10, y - 4), (x - 4, y + h - 10), (x + w - 10, y + h - 10)):
        f.px(cxx, cyy, 14, 14, GOLD)
        f.px(cxx + 4, cyy + 4, 6, 6, GOLD_D)
    f.px(x + w // 2 - 12, y - 16, 24, 14, GOLD)
    f.px(x + w // 2 - 5, y - 24, 10, 9, GOLD_D)
    f.px(x + 16, y + 22, w - 32, h - 44, WHITE)
    f.px(x + 16, y + 22, w - 32, 3, (250, 246, 232, 255))
    f.px(x + 16, y + h - 25, w - 32, 3, (206, 198, 178, 255))
    meander(f, x + 8, y + 8, w - 16, 6, GOLD_D, step=8)
    meander(f, x + 8, y + h - 14, w - 16, 6, GOLD_D, step=8)
    f.save("timer-seal.png")


# =====================================================================
# 14. 键帽 keycap
# =====================================================================
def bake_keycap():
    f = F(256, 256, 4)
    x, y, w, h = 62, 62, 132, 132
    f.px(x + 6, y + 10, w, h, INK)
    f.px(x, y, w, h, BLUE)
    f.px(x, y, w, 5, BLUE_L)
    f.px(x, y + h - 6, w, 6, BLUE_D)
    f.px(x + 10, y + 10, w - 20, h - 26, (50, 70, 100, 255))
    f.px(x + 10, y + 10, w - 20, 3, (72, 92, 120, 255))
    for cxx, cyy in ((x + 2, y + 2), (x + w - 8, y + 2), (x + 2, y + h - 9), (x + w - 8, y + h - 9)):
        f.px(cxx, cyy, 7, 7, GOLD)
    f.save("keycap.png")


# =====================================================================
# 15. 菜单面板 menu-panel
# =====================================================================
def bake_panel():
    f = F(256, 256, 4)
    x, y, w, h = 22, 30, 212, 196
    f.px(x, y, w, h, (30, 50, 70, 255))
    f.px(x, y, w, 3, BLUE)
    f.px(x, y + h - 3, w, 3, BLUE)
    f.px(x, y, 3, h, BLUE)
    f.px(x + w - 3, y, 3, h, BLUE)
    f.px(x + 1, y + 1, w - 2, 1, GOLD_D)
    f.px(x + 1, y + h - 2, w - 2, 1, GOLD_D)
    f.px(x + 1, y + 1, 1, h - 2, GOLD_D)
    f.px(x + w - 2, y + 1, 1, h - 2, GOLD_D)
    for cxx, cyy in ((x - 3, y - 3), (x + w - 11, y - 3), (x - 3, y + h - 11), (x + w - 11, y + h - 11)):
        f.px(cxx, cyy, 14, 14, GOLD)
        f.px(cxx + 4, cyy + 4, 6, 6, GOLD_D)
    f.save("menu-panel.png")


# =====================================================================
# 16/17. 标题背景 titlebg-gate / titlebg-moon (电力夜景)
# =====================================================================
def _eave(f, x0, x1, y, tip=4, th=4, col=INK, under=None):
    f.px(x0, y, x1 - x0, th, col)
    for k in range(tip):
        f.px(x0 - 1 - k, y - 1 - k, 2, th, col)
        f.px(x1 - 1 + k, y - 1 - k, 2, th, col)
    if under:
        f.px(x0 + 2, y + th, x1 - x0 - 4, 1, under)


def bake_titlebg_gate():
    f = F(256, 256, 4)
    sky = [(6, 12, 22), (10, 18, 30), (16, 26, 40), (22, 36, 52), (30, 48, 66)]
    for i, c in enumerate(sky):
        f.px(0, i * 26, 256, 26, (*c, 255))
    star_dots(f, 0, 30, 256, 46, 34)
    cx, cy, R = 128, 86, 46
    for yy in range(-R, R + 1):
        half = int(math.sqrt(R * R - yy * yy))
        if half <= 0:
            continue
        band = (30, 60, 100, 255) if (yy % 9 in (0, 1) and yy > -R // 2) else BLUE
        if yy > R - 8:
            band = BLUE_D
        f.px(cx - half, cy + yy, half * 2, 1, band)
    for yy in range(-R, -R + 4):
        half = int(math.sqrt(max(0, R * R - yy * yy)))
        f.px(cx - half, cy + yy, half * 2, 1, (100, 180, 255, 255))
    for bx, by, s in ((84, 58, 2), (100, 52, 3), (166, 62, 2), (178, 70, 2), (152, 48, 2)):
        f.px(bx - s, by, s, 1, INK)
        f.px(bx + 1, by, s, 1, INK)
        f.px(bx - s - 1, by - 1, 1, 1, INK)
        f.px(bx + s, by - 1, 1, 1, INK)
    for x in range(0, 256, 2):
        h = 10 + math.sin(x * 0.035 + 1.2) * 6 + math.sin(x * 0.012) * 4
        f.px(x, 104 - h, 2, h + 10, (17, 25, 35, 255))
    for tx in (28, 228):
        f.px(tx - 9, 74, 18, 108, BLUE_D)
        f.px(tx - 9, 74, 3, 108, (24, 40, 60, 255))
        for k in range(4):
            f.px(tx - 2, 84 + k * 22, 4, 5, GOLD_D)
            f.px(tx - 1, 85 + k * 22, 2, 3, GOLD_L)
        _eave(f, tx - 16, tx + 16, 100, tip=3, th=4, col=INK, under=(12, 18, 25, 255))
        _eave(f, tx - 13, tx + 13, 78, tip=3, th=4, col=INK, under=(12, 18, 25, 255))
        f.px(tx - 7, 70, 14, 4, INK)
        f.px(tx - 1, 66, 2, 4, GOLD)
    gx0, gx1 = 74, 182
    ridge_y = 92
    f.px(gx0 + 14, ridge_y, gx1 - gx0 - 28, 4, INK)
    for sgn, ex in ((-1, gx0 + 12), (1, gx1 - 14)):
        f.px(ex, ridge_y - 4, 3, 6, INK)
        f.px(ex + (1 if sgn < 0 else -1), ridge_y - 6, 2, 3, GOLD_D)
    _eave(f, gx0, gx1, ridge_y + 6, tip=5, th=6, col=INK, under=(10, 16, 25, 255))
    for x in range(gx0 + 6, gx1 - 6, 7):
        f.px(x, ridge_y + 13, 3, 3, GOLD_D if (x // 7) % 2 else BLUE)
    f.px(gx0 + 8, ridge_y + 18, gx1 - gx0 - 16, 12, BLUE_D)
    meander(f, gx0 + 12, ridge_y + 20, gx1 - gx0 - 24, 8, GOLD_D, step=9)
    f.px(gx0 + 8, ridge_y + 30, gx1 - gx0 - 16, 52, (22, 34, 48, 255))
    for px_ in (gx0 + 12, gx0 + 34, gx1 - 38, gx1 - 16):
        f.px(px_, ridge_y + 30, 5, 52, BLUE)
        f.px(px_, ridge_y + 30, 2, 52, BLUE_L)
        f.px(px_ - 1, ridge_y + 78, 7, 4, BLUE_D)
    hex_insignia(f, 128, ridge_y + 38, 6)
    f.px(116, ridge_y + 48, 24, 34, RED_D)
    f.px(117, ridge_y + 48, 10, 34, RED)
    for ky in range(3):
        for kx in range(3):
            f.px(118 + kx * 7, ridge_y + 52 + ky * 9, 2, 2, GOLD)
    f.px(126, ridge_y + 64, 4, 4, GOLD_L)
    f.px(0, 172, 256, 84, (15, 21, 28, 255))
    f.px(0, 172, 256, 2, (40, 56, 76, 255))
    f.px(96, 168, 64, 4, (26, 38, 50, 255))
    f.px(104, 164, 48, 4, (22, 32, 42, 255))
    for x in range(4, 252, 18):
        f.px(x, 176, 4, 10, (24, 35, 45, 255))
        f.px(x + 1, 174, 2, 2, GOLD_D)
    for bx in (62, 194):
        f.px(bx - 7, 164, 14, 11, INK)
        f.px(bx - 9, 174, 18, 3, (10, 15, 20, 255))
        f.px(bx - 4, 159, 8, 6, RED)
        f.px(bx - 2, 156, 4, 4, (255, 170, 90, 255))
        f.px(bx - 1, 154, 2, 2, (255, 224, 150, 255))
    f.save("titlebg-gate.png")


def bake_titlebg_moon():
    f = F(256, 256, 4)
    for i in range(8):
        c = (6 + i * 2, 10 + i * 2, 18 + i * 2, 255)
        f.px(0, i * 20, 256, 20, c)
    f.px(0, 160, 256, 96, (18, 24, 34, 255))
    star_dots(f, 0, 6, 256, 120, 90)
    for gx, gy in ((44, 30), (150, 22), (208, 52), (92, 58)):
        pts = [(gx, gy)]
        for k in range(3):
            pts.append((pts[-1][0] + 8 + rnd() * 12, pts[-1][1] + (rnd() * 12 - 6)))
        for k in range(len(pts) - 1):
            f.d.line([*pts[k], *pts[k + 1]], fill=(70, 84, 100, 255), width=1)
        for p in pts:
            f.px(p[0] - 1, p[1] - 1, 2, 2, (222, 232, 238, 255))
    cx, cy, R = 52, 34, 18
    f.d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=GOLD_D)
    f.d.ellipse([cx - R + 5, cy - R + 5, cx + R - 5, cy + R - 5], fill=(10, 14, 20, 255))
    f.d.ellipse([cx - R + 7, cy - R + 3, cx + R - 3, cy + R - 7], fill=(16, 22, 28, 255))
    for bx, bw, bh in ((30, 34, 40), (96, 26, 30), (150, 30, 24), (216, 36, 46)):
        f.px(bx - bw // 2, 160 - bh, bw, bh + 96, (17, 23, 30, 255))
        f.px(bx - bw // 2 - 4, 160 - bh - 4, bw + 8, 5, (26, 34, 42, 255))
        for k in range(int(bh / 9)):
            f.px(bx - bw // 2 + 4, 160 - bh + 6 + k * 9, 3, 3, (52, 66, 80, 255))
    f.px(0, 208, 256, 48, (13, 18, 22, 255))
    f.px(0, 208, 256, 2, (38, 52, 66, 255))
    for x in range(6, 256, 24):
        f.px(x, 210, 3, 46, (24, 33, 42, 255))
    f.save("titlebg-moon.png")


# =====================================================================
# 17.5 「电专」字标 title-logo (330x150, 透明底)
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
    ss = box * px_block
    font, _ = _load_cn_font(int(ss * 0.96))
    m = Image.new("L", (ss, ss), 0)
    d = ImageDraw.Draw(m)
    bb = d.textbbox((0, 0), ch, font=font)
    d.text(((ss - bb[2] - bb[0]) / 2, (ss - bb[3] - bb[1]) / 2), ch, fill=255, font=font)
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
    # ---------- 修改处：文字改为“电专” ----------
    for ch, cx in (("电", 109), ("专", 221)):
        mk = _char_mask(ch, CB)
        masks.append((mk, cx - CB // 2, (H - CB) // 2))
    # -----------------------------------------
    def gash(mk, x0, y0, gx, gy):
        mp = mk.load()
        moved = Image.new("L", mk.size, 0)
        mv = moved.load()
        for y in range(mk.size[1]):
            for x in range(mk.size[0]):
                if not mp[x, y]:
                    continue
                d = (x + x0 - gx) * 0.62 + (y + y0 - gy) * 1.0
                if -2 <= d <= 2:
                    mp[x, y] = 0
                elif d > 2:
                    mv[x, y] = 255
                    mp[x, y] = 0
        mk.paste(moved.transform(mk.size, Image.AFFINE, (1, 0, -3, 0, 1, 2)), (0, 0),
                 moved.transform(mk.size, Image.AFFINE, (1, 0, -3, 0, 1, 2)))
        return mk
    masks = [(gash(mk, ox, oy, ox + CB * (0.62 if i == 0 else 0.42), oy + CB * 0.52), ox, oy)
             for i, (mk, ox, oy) in enumerate(masks)]
    BONE_C = (240, 245, 250)
    RIM = (146, 150, 160)
    TOP = (255, 255, 255)
    INKC = (22, 30, 40)
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
    snap = im.copy()
    sp = snap.load()
    for y in range(H):
        for x in range(W):
            if sp[x, y][3]:
                continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and sp[x + dx, y + dy][3] > 0
                   for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                px[x, y] = (*INKC, 255)
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 306, 16, 22, 128
    n_seg = 90
    for k in range(n_seg):
        u = k / (n_seg - 1)
        sx = x0 + (x1 - x0) * u
        sy = y0 + (y1 - y0) * u - math.sin(u * math.pi) * 7
        w_ = max(1, round(5 * (1 - u) + 1))
        d.ellipse([sx - w_, sy - w_ * 0.7, sx + w_, sy + w_ * 0.7], fill=(220, 60, 60, 255))
    for k in range(n_seg):
        u = k / (n_seg - 1)
        sx = x0 + (x1 - x0) * u
        sy = y0 + (y1 - y0) * u - math.sin(u * math.pi) * 7 - 1
        if u < 0.75:
            d.ellipse([sx - 1, sy - 1, sx + 1, sy + 1], fill=(255, 236, 214, 235))
    _s = [20260808]
    def r2():
        _s[0] = (_s[0] * 1103515245 + 12345) & 0x7FFFFFFF
        return _s[0] / 0x7FFFFFFF
    for k in range(4):
        u = 0.18 + r2() * 0.6
        dx, dy = int(x0 + (x1 - x0) * u), int(y0 + (y1 - y0) * u)
        for j in range(2 + int(r2() * 4)):
            im.putpixel((min(W - 1, dx), min(H - 1, dy + 3 + j)), (172, 48, 30, 255))
        im.putpixel((min(W - 1, dx), min(H - 1, dy + 6 + int(r2() * 5))), (220, 60, 60, 255))
    im.save(os.path.join(OUT, "title-logo.png"))
    print("  title-logo.png  330x150 (电专字标)")


# =====================================================================
# 18. favicon
# =====================================================================
def bake_favicon():
    f = F(32, 32, 2)
    f.d.ellipse([3, 3, 28, 28], fill=GOLD)
    f.d.ellipse([8, 8, 23, 23], fill=BLUE_D)
    f.d.ellipse([12, 12, 19, 19], fill=BG)
    draw_lightning(f, 16, 2, 16, 28, color=WHITE, width=2)
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
    print("baking uilib –「电力·蓝金」…")
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