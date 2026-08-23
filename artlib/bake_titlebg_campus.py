# -*- coding: utf-8 -*-
"""标题底图烘焙: 校园夜雷照片 -> 像素化 titlebg-campus.png (1024x576).

源图 开始界面.png 仅 384x167, 直接拉伸到 1024x576 会发虚且与全局像素风冲突。
管线对齐 bake_uilib.py 的「低分辨率 -> 最近邻放大」原则:

  中心裁 16:9 -> LANCZOS 降到 256x144 -> 提对比/饱和 -> 24 色自适应量化
  -> NEAREST x4 放大到 1024x576 -> 顶部压暗渐变(留标题字位) + 四角暗角

用法: python artlib/bake_titlebg_campus.py

注意: 源图 开始界面.png 是学校的真实宣传照, 按仓库既有原则(见 _build/_frames-README.md)
不入版本库 —— 仓库里只有本脚本的产物 assets/uilib/titlebg-campus.png。要重跑烘焙,
把照片按同名放到仓库根目录。
"""
import os
import sys

from PIL import Image, ImageEnhance

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "开始界面.png")
OUT = os.path.join(ROOT, "assets", "uilib", "titlebg-campus.png")

LOW_W, LOW_H = 256, 144          # 像素网格; x4 = 1024x576
COLORS = 24                      # 与 uilib 的有限色板气质一致

im = Image.open(SRC).convert("RGB")
sw, sh = im.size

# 中心裁到 16:9(校园主楼在正中, 裁掉两侧配楼不伤主体)
want_w = round(sh * 16 / 9)
if want_w <= sw:
    x0 = (sw - want_w) // 2
    im = im.crop((x0, 0, x0 + want_w, sh))
else:
    want_h = round(sw * 9 / 16)
    y0 = (sh - want_h) // 2
    im = im.crop((0, y0, sw, y0 + want_h))

low = im.resize((LOW_W, LOW_H), Image.LANCZOS)
low = ImageEnhance.Contrast(low).enhance(1.22)     # 原片偏灰, 量化前先拉开明暗
low = ImageEnhance.Color(low).enhance(1.30)        # 电力蓝的冷调抬起来
low = ImageEnhance.Brightness(low).enhance(1.06)
low = low.quantize(colors=COLORS, method=Image.MAXCOVERAGE, dither=Image.NONE)

big = low.convert("RGB").resize((1024, 576), Image.NEAREST)

# 顶部压暗: 标题字标与徽记落在 0..340, 需要一块干净的暗场
px = big.load()
for y in range(576):
    top = max(0.0, 1.0 - y / 300.0) * 0.42        # 顶部 -42% 亮度, 300px 处归零
    for x in range(1024):
        # 四角暗角(横向), 越靠边越暗, 中央不动
        edge = max(0.0, abs(x - 512) / 512.0 - 0.45) / 0.55 * 0.30
        k = 1.0 - top - edge
        if k >= 0.999:
            continue
        r, g, b = px[x, y]
        px[x, y] = (int(r * k), int(g * k), int(b * k))

big.convert("RGBA").save(OUT)
print("titlebg-campus.png", big.size, "<-", os.path.basename(SRC), (sw, sh),
      f"grid {LOW_W}x{LOW_H} x4, {COLORS} colors")
