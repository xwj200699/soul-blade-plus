# -*- coding: utf-8 -*-
"""Roster baker v2 — M1 art pass.

Closes the gap to the LuizMelo cast: 3-tone shading (lit/base/shadow, light
from upper-left), layered armour (pauldrons/chest trim/belt/boots), detailed
heads (monkey muzzle+circlet / archer helm+sun disc / twin-tail witch),
secondary motion (cape/tail/hair), real Crouch frames, and a high-res bust
renderer for select/HUD portraits (320x344 / 84x84).

Output: assets/img/{wukong,houyi,angela}/*.png (128px frames)
        assets/img/portraits/<id>-sel.png (320x344), <id>-hud.png (84x84)
"""
import math
import os
import sys

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")
FW = 192          # M1.1: 128->192, 角色身高不变, 为武器挥击留前向空间(对齐原作帧内比例)
FEET_Y = 150
CX = 70
OUT = r"C:\留存\Game Now\soul-blade-plus\assets\img"


def tone(c, k):
    return (max(0, min(255, int(c[0] * k))), max(0, min(255, int(c[1] * k))),
            max(0, min(255, int(c[2] * k))), 255)


def tri(c):  # (light, base, dark)
    return tone(c, 1.32), c, tone(c, .62)


class F:
    def __init__(self, w=FW, h=FW):
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # shaded capsule limb: dark under-edge, base, lit top-left stripe
    def limb(self, p1, p2, w, col, shade=True):
        L, B, D = tri(col)
        if shade:
            self.d.line([(p1[0] + 1, p1[1] + 1), (p2[0] + 1, p2[1] + 1)], fill=D, width=w)
        self.d.line([p1, p2], fill=B, width=w)
        r = w / 2 - .5
        for p in (p1, p2):
            if shade:
                self.d.ellipse([p[0] - r + 1, p[1] - r + 1, p[0] + r + 1, p[1] + r + 1], fill=D)
            self.d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=B)
        if shade and w >= 4:
            self.d.line([(p1[0] - 1, p1[1] - 1), (p2[0] - 1, p2[1] - 1)], fill=L, width=max(1, w // 3))

    def ell(self, box, col, shade=True):
        L, B, D = tri(col)
        if shade:
            self.d.ellipse([box[0] + 1, box[1] + 1, box[2] + 1, box[3] + 1], fill=D)
        self.d.ellipse(box, fill=B)
        if shade:
            w = box[2] - box[0]
            self.d.ellipse([box[0] + w * .18, box[1] + 1, box[0] + w * .55, box[1] + (box[3] - box[1]) * .4], fill=L)

    def poly(self, pts, col, shade=True):
        L, B, D = tri(col)
        if shade:
            self.d.polygon([(x + 1, y + 1) for x, y in pts], fill=D)
        self.d.polygon(pts, fill=B)

    def rect(self, box, col, lit=False):
        self.d.rectangle(box, fill=col)
        if lit:
            L = tri(col)[0]
            self.d.rectangle([box[0], box[1], box[2], box[1] + 1], fill=L)

    def px(self, x, y, col):
        self.d.point((x, y), fill=col)

    def arc_smear(self, c, r, a0, a1, w=8):
        white = (255, 255, 255, 255)
        self.d.arc([c[0] - r, c[1] - r, c[0] + r, c[1] + r], math.degrees(a0), math.degrees(a1), fill=white, width=w)
        self.d.arc([c[0] - r + 4, c[1] - r + 4, c[0] + r - 4, c[1] + r - 4], math.degrees(a0) + 6, math.degrees(a1) - 6, fill=(252, 252, 250, 235), width=max(2, w - 4))

    def outline(self, col=(22, 14, 18, 255)):
        px = self.im.load()
        w, h = self.im.size
        a = [[px[x, y][3] for x in range(w)] for y in range(h)]
        for y in range(h):
            for x in range(w):
                if a[y][x] > 40:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and a[yy][xx] > 120:
                        px[x, y] = col
                        break


# ================= character part painters =================
# skins hold palettes + head/torso/weapon painters. All coords relative,
# s = scale (1 for frames, ~3 for busts).

WK = {  # 悟空: 红金战甲 + 猴相
    "fur": (150, 96, 52, 255), "furD": (108, 66, 34, 255),
    "skin": (238, 190, 140, 255), "muzzle": (246, 214, 172, 255),
    "gold": (232, 176, 40, 255), "goldD": (170, 118, 22, 255),
    "red": (196, 44, 34, 255), "redD": (140, 26, 20, 255),
    "pants": (172, 58, 38, 255), "boot": (94, 52, 30, 255),
    "staffR": (186, 40, 34, 255),
}
HY = {  # 后羿: 深蓝黑银金 科技神话
    "skin": (232, 186, 142, 255),
    "blue": (58, 88, 152, 255), "blueD": (36, 54, 96, 255),
    "silver": (200, 210, 226, 255), "dark": (34, 36, 52, 255),
    "gold": (226, 178, 66, 255),
    "pants": (44, 52, 84, 255), "boot": (28, 26, 40, 255),
    "hair": (36, 30, 44, 255),
}
DC = {  # 貂蝉: 双环髻舞姬 + 玫红舞裙 + 双扇(火羽)
    "skin": (244, 206, 170, 255),
    "hair": (46, 34, 54, 255), "hairD": (30, 22, 38, 255),
    "dress": (206, 54, 92, 255), "dressD": (146, 32, 62, 255),
    "gold": (232, 186, 74, 255), "goldL": (255, 226, 140, 255),
    "fan": (226, 74, 64, 255), "fanD": (168, 44, 40, 255),
    "feather": (248, 238, 222, 255), "ribbon": (255, 148, 168, 255),
    "boot": (92, 40, 58, 255), "lip": (216, 62, 78, 255),
}

AG = {  # 安琪拉: 橙红双马尾 + 红黑法师裙
    "skin": (244, 204, 164, 255),
    "hair": (226, 96, 44, 255), "hairD": (176, 62, 26, 255),
    "dress": (168, 40, 52, 255), "dressD": (110, 22, 34, 255),
    "black": (44, 30, 40, 255),
    "gold": (232, 186, 74, 255),
    "book": (92, 34, 88, 255), "fire": (255, 138, 40, 255), "fireC": (255, 226, 120, 255),
    "boot": (58, 32, 46, 255),
}


def wk_head(f, c, s=1.0, look=0):
    """monkey head at centre c; look = forward px shift of features"""
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], WK["fur"])                       # fur skull
    f.ell([x - r * .62 + look, y - r * .3, x + r * .95 + look, y + r * .88], WK["muzzle"], shade=False)  # muzzle
    f.d.rectangle([x - r * .95, y - r * .78, x + r * .95, y - r * .3], fill=WK["fur"])   # brow band
    # gold circlet 紧箍
    f.rect([x - r * .98, y - r * .82, x + r * .98, y - r * .55], WK["gold"], lit=True)
    f.px(x - r * .4, y - r * .68, tri(WK["gold"])[0]); f.px(x + r * .4, y - r * .68, tri(WK["gold"])[0])
    # fur crest above circlet + side tufts
    f.ell([x - r * .8, y - r * 1.5, x + r * .8, y - r * .7], WK["fur"])
    f.poly([(x - r * .3, y - r * 1.35), (x, y - r * 1.9), (x + r * .3, y - r * 1.35)], WK["furD"])
    f.ell([x - r * 1.25, y - r * .2, x - r * .55, y + r * .55], WK["furD"])                # sideburn
    # eyes: fierce golden
    ex = x + r * .18 + look
    f.rect([ex - 1 * s, y - r * .18, ex + 1.4 * s, y + r * .1], (250, 214, 60, 255))
    f.px(ex + .6 * s, y - r * .05, (30, 16, 12, 255))
    f.d.line([(ex - 1.4 * s, y - r * .34), (ex + 2 * s, y - r * .22)], fill=(40, 20, 14, 255), width=max(1, int(s)))  # brow
    # nostril + mouth line on muzzle
    f.px(x + r * .78 + look, y + r * .18, (120, 70, 40, 255))
    f.d.line([(x + r * .2 + look, y + r * .55), (x + r * .8 + look, y + r * .5)], fill=(140, 86, 52, 255), width=1)


def wk_torso(f, hip, neck, ph=0):
    """red-gold armour: chest plate + trim, pauldrons, belt, tassets"""
    f.limb(hip, neck, 12, WK["red"])                                   # under-tunic
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.ell([mx - 6.5, my - 7, mx + 6.5, my + 3], WK["gold"])            # chest plate
    f.d.arc([mx - 6, my - 6, mx + 6, my + 3], 20, 160, fill=WK["goldD"], width=1)
    f.px(mx, my - 2, (255, 240, 190, 255))                             # gem glint
    for sgn in (-1, 1):                                                # pauldrons
        sx = neck[0] + sgn * 6
        f.ell([sx - 4.5, neck[1] - 1, sx + 4.5, neck[1] + 6], WK["gold"])
    f.rect([hip[0] - 6, hip[1] - 3, hip[0] + 6, hip[1]], WK["goldD"], lit=True)  # belt
    f.px(hip[0], hip[1] - 2, (255, 240, 190, 255))                     # buckle
    for sgn in (-1, 1):                                                # tassets
        f.poly([(hip[0] + sgn * 2, hip[1]), (hip[0] + sgn * 8, hip[1] + 1), (hip[0] + sgn * 6, hip[1] + 7)], WK["red"])


def wk_staff(f, P):
    a, L = P.get("staffA"), P.get("staffL", 30)
    if a is None:
        return
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    back = P.get("staffBack", .45)
    x1, y1 = hx - math.cos(a) * L * back, hy + math.sin(a) * L * back
    x2, y2 = hx + math.cos(a) * L * (1 - back) * 2, hy - math.sin(a) * L * (1 - back) * 2
    f.limb((x1, y1), (x2, y2), 5, WK["staffR"])  # M1.1: 棍身加粗
    n = math.hypot(x2 - x1, y2 - y1) or 1
    ux, uy = (x2 - x1) / n, (y2 - y1) / n
    for (ex, ey) in ((x1, y1), (x2, y2)):                              # gold ferrules
        f.limb((ex - ux * 3, ey - uy * 3), (ex + ux * 3, ey + uy * 3), 6, WK["gold"])
    f.d.line([(x1 + ux * n * .3, y1 + uy * n * .3 - 1), (x1 + ux * n * .7, y1 + uy * n * .7 - 1)],
             fill=tri(WK["staffR"])[0], width=1)                       # shaft glint


def wk_extras(f, P, hip, neck):
    t = P.get("t", 0)
    # tail (S-curve, animated)
    sw = math.sin(t * .9) * 3
    pts = [(hip[0] - 4, hip[1] + 1)]
    for k in range(1, 5):
        pts.append((hip[0] - 6 - k * 4, hip[1] - k * 3 + math.sin(t * .9 + k) * 2.4))
    for i in range(len(pts) - 1):
        f.limb(pts[i], pts[i + 1], max(2, 4 - i), WK["fur"], shade=(i < 2))
    f.ell([pts[-1][0] - 2.5, pts[-1][1] - 4.5, pts[-1][0] + 2.5, pts[-1][1] + .5], WK["furD"])
    # cape (behind torso, flows opposite motion)
    fl = P.get("capeFlow", 2)
    f.poly([(neck[0] - 4, neck[1] + 2), (neck[0] - 13 - fl, neck[1] + 13 + fl * 1.4),
            (neck[0] - 8 - fl * .6, neck[1] + 22 + fl), (neck[0] - 1, neck[1] + 8)], WK["red"])
    f.poly([(neck[0] - 4, neck[1] + 2), (neck[0] - 9 - fl * .8, neck[1] + 10 + fl),
            (neck[0] - 5, neck[1] + 12)], WK["redD"])


def hy_head(f, c, s=1.0, look=0):
    x, y = c
    r = 7 * s
    f.ell([x - r, y - r, x + r, y + r], HY["skin"])
    # dark hair swept back + silver-gold helm crest with sun disc
    f.ell([x - r, y - r * 1.15, x + r * .5, y - r * .1], HY["hair"])
    f.poly([(x - r * .9, y - r * .7), (x - r * 1.6, y - r * 1.5), (x - r * .2, y - r * 1.05)], HY["hair"])
    f.rect([x - r, y - r * .72, x + r * .9, y - r * .42], HY["silver"], lit=True)          # helm band
    f.ell([x + r * .55, y - r * 1.35, x + r * 1.25, y - r * .65], HY["gold"])              # sun disc
    f.px(x + r * .9, y - r, (255, 244, 200, 255))
    ex = x + r * .3 + look
    f.rect([ex - 1 * s, y - r * .15, ex + 1 * s, y + r * .12], (240, 244, 255, 255))       # eye
    f.px(ex + .5 * s, y, (30, 24, 40, 255))
    f.d.line([(ex - 1.6 * s, y - r * .32), (ex + 1.6 * s, y - r * .3)], fill=(30, 24, 40, 255), width=1)
    f.d.line([(x + r * .1 + look, y + r * .5), (x + r * .6 + look, y + r * .48)], fill=(150, 110, 90, 255), width=1)


def hy_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 11, HY["blue"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.poly([(mx - 5, my - 6), (mx + 5, my - 6), (mx + 4, my + 3), (mx - 4, my + 3)], HY["dark"])  # cuirass
    f.d.line([(mx - 4, my - 2), (mx + 4, my - 2)], fill=HY["silver"], width=1)                    # tech line
    f.px(mx, my, HY["gold"])
    for sgn in (-1, 1):
        sx = neck[0] + sgn * 5.5
        f.ell([sx - 4, neck[1] - 1, sx + 4, neck[1] + 5], HY["silver"])                           # pauldrons
    f.rect([hip[0] - 5.5, hip[1] - 3, hip[0] + 5.5, hip[1]], HY["dark"], lit=True)
    f.px(hip[0], hip[1] - 2, HY["gold"])
    # quiver over right shoulder
    f.limb((neck[0] - 6, neck[1] + 4), (neck[0] - 10, neck[1] + 15), 5, (86, 58, 38, 255))
    for dx in (-11, -9, -7):
        f.d.line([(neck[0] + dx, neck[1] + 2), (neck[0] + dx + 1, neck[1] - 2)], fill=HY["silver"], width=1)
        f.px(neck[0] + dx + 1, neck[1] - 3, HY["gold"])


def hy_bow(f, P):
    a = P.get("bowA")
    if a is None:
        return
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    R = 19  # M1.1: 弓加大
    # recurve limbs: two arcs + gold tips + wrapped grip
    f.d.arc([hx - R, hy - R, hx + R, hy + R], math.degrees(a) - 62, math.degrees(a) - 10, fill=HY["gold"], width=3)
    f.d.arc([hx - R, hy - R, hx + R, hy + R], math.degrees(a) + 10, math.degrees(a) + 62, fill=HY["gold"], width=3)
    f.d.arc([hx - R + 2, hy - R + 2, hx + R - 2, hy + R - 2], math.degrees(a) - 58, math.degrees(a) + 58, fill=HY["dark"], width=2)
    f.limb((hx - 2, hy - 2), (hx + 2, hy + 2), 4, (120, 82, 52, 255), shade=False)  # grip
    p1 = (hx + math.cos(a - 1.05) * R, hy + math.sin(a - 1.05) * R)
    p2 = (hx + math.cos(a + 1.05) * R, hy + math.sin(a + 1.05) * R)
    pull = P.get("pull", 0)
    mid = (hx - math.cos(a) * pull, hy - math.sin(a) * pull)
    f.d.line([p1, mid], fill=HY["silver"], width=1)
    f.d.line([mid, p2], fill=HY["silver"], width=1)
    if P.get("arrow"):
        tip = (mid[0] + math.cos(a) * 17, mid[1] + math.sin(a) * 17)
        f.d.line([mid, tip], fill=HY["silver"], width=2)
        f.poly([(tip[0], tip[1] - 1.5), (tip[0] + math.cos(a) * 4, tip[1] + math.sin(a) * 4), (tip[0], tip[1] + 1.5)], HY["gold"], shade=False)


def ag_head(f, c, s=1.0, look=0):
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], AG["skin"])
    # orange-red hair: fringe + crown + witch hat hint (headband w/ rune)
    f.ell([x - r * 1.05, y - r * 1.2, x + r * 1.05, y - r * .05], AG["hair"])
    f.poly([(x - r, y - r * .1), (x - r * .55, y + r * .5), (x - r * .25, y - r * .2)], AG["hair"])  # side fringe
    f.rect([x - r * .9, y - r * .95, x + r * .9, y - r * .7], AG["black"], lit=False)
    f.px(x, y - r * .82, AG["gold"])                                     # rune
    ex = x + r * .25 + look
    f.rect([ex - 1.2 * s, y - r * .1, ex + 1.2 * s, y + r * .2], (255, 255, 255, 255))
    f.px(ex + .4 * s, y + r * .05, (150, 40, 90, 255))                   # magenta pupil
    f.d.line([(ex - 1.6 * s, y - r * .28), (ex + 1.6 * s, y - r * .3)], fill=AG["hairD"], width=1)
    f.d.line([(x + r * .1 + look, y + r * .52), (x + r * .5 + look, y + r * .5)], fill=(180, 110, 90, 255), width=1)
    # blush
    f.px(x - r * .25, y + r * .3, (250, 160, 140, 255))


def ag_twin_tails(f, c, t):
    x, y = c
    r = 7.5
    for sgn in (-1, 1):
        base = (x + sgn * r * .95, y - r * .15)
        pts = [base]
        for k in range(1, 4):
            pts.append((base[0] + sgn * (1.5 + k * .8), base[1] + k * 4.2 + math.sin(t + sgn + k * .7) * 1.8))
        for i in range(len(pts) - 1):
            f.limb(pts[i], pts[i + 1], 4 - i, AG["hair"] if i % 2 == 0 else AG["hairD"], shade=(i == 0))


def ag_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 9, AG["dress"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.rect([mx - 3, my - 5, mx + 3, my + 3], AG["black"])                # corset
    for yy in (-3, 0):
        f.px(mx, my + yy, AG["gold"])                                    # buttons
    f.ell([neck[0] - 5, neck[1] - 1, neck[0] + 5, neck[1] + 4], AG["dress"])  # puff shoulders
    # flared skirt with dark hem
    f.poly([(hip[0] - 4, hip[1] - 4), (hip[0] + 4, hip[1] - 4),
            (hip[0] + 10, hip[1] + 9), (hip[0] - 10, hip[1] + 9)], AG["dress"])
    f.d.line([(hip[0] - 10, hip[1] + 9), (hip[0] + 10, hip[1] + 9)], fill=AG["dressD"], width=2)
    f.px(hip[0] - 6, hip[1] + 6, AG["gold"]); f.px(hip[0] + 5, hip[1] + 4, AG["gold"])  # runes


def ag_book(f, P):
    a = P.get("staffA")
    if a is None:
        return
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    # floating grimoire near the hand, tilted
    bx, by = hx + math.cos(a) * 6, hy - math.sin(a) * 6
    f.poly([(bx - 6, by - 4), (bx + 6, by - 6), (bx + 7, by + 4), (bx - 5, by + 6)], AG["book"])
    f.d.line([(bx - 5, by - 3), (bx + 5, by - 5)], fill=(180, 120, 200, 255), width=1)
    f.px(bx + 1, by, AG["fireC"])                                        # glowing rune
    if P.get("cast"):
        t = P.get("t", 0)
        for k in range(4):
            ang = t * 2.2 + k * 1.57
            f.px(bx + math.cos(ang) * 9, by + math.sin(ang) * 9 - 2, AG["fire"])
        f.ell([bx + 8, by - 6, bx + 15, by + 1], AG["fire"], shade=False)
        f.ell([bx + 10, by - 4, bx + 13, by - 1], AG["fireC"], shade=False)


def dc_head(f, c, s=1.0, look=0):
    """貂蝉: 双环髻 + 金步摇 + 点绛唇"""
    x, y = c
    r = 7.2 * s
    f.ell([x - r, y - r, x + r, y + r], DC["skin"])
    # 刘海 + 鬓发
    f.ell([x - r * 1.02, y - r * 1.12, x + r * 1.02, y - r * .05], DC["hair"])
    f.poly([(x - r * .95, y - r * .3), (x - r * 1.15, y + r * .75), (x - r * .6, y + r * .5), (x - r * .62, y - r * .05)], DC["hair"])
    # 双环髻(左右对称环)
    for sgn in (-1, 1):
        bx = x + sgn * r * .85
        f.ell([bx - r * .42, y - r * 1.55, bx + r * .42, y - r * .75], DC["hair"])
        f.ell([bx - r * .18, y - r * 1.32, bx + r * .18, y - r * .98], DC["hairD"], shade=False)
    # 金步摇(右鬓垂饰)
    f.px(x + r * .85, y - r * .78, DC["gold"])
    f.d.line([(x + r * .95, y - r * .7), (x + r * 1.1, y - r * .1)], fill=DC["gold"], width=1)
    f.px(x + r * 1.05, y - r * .05, DC["goldL"])
    # 眉眼(柔) + 点绛唇 + 腮红
    ex = x + r * .3 + look
    f.rect([ex - 1.2 * s, y - r * .08, ex + 1.2 * s, y + r * .16], (250, 250, 255, 255))
    f.px(ex + .4 * s, y + r * .04, (72, 46, 80, 255))
    f.d.line([(ex - 1.5 * s, y - r * .3), (ex + 1.5 * s, y - r * .34)], fill=DC["hairD"], width=1)
    f.px(x + r * .3 + look, y + r * .58, DC["lip"])
    f.px(x - r * .3, y + r * .34, (250, 168, 150, 255))


def dc_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 8, DC["dress"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.rect([mx - 3, my - 4, mx + 3, my + 3], DC["dressD"])          # 束腰
    f.px(mx, my - 1, DC["gold"])
    f.ell([neck[0] - 4, neck[1] - 1, neck[0] + 4, neck[1] + 3], DC["skin"])  # 露肩
    # 舞裙(下摆开衩摆动)
    sw = math.sin(ph) * 3
    f.poly([(hip[0] - 4, hip[1] - 4), (hip[0] + 4, hip[1] - 4),
            (hip[0] + 9 + sw, hip[1] + 8), (hip[0] - 9 + sw * .5, hip[1] + 8)], DC["dress"])
    f.d.line([(hip[0] - 8 + sw * .5, hip[1] + 7), (hip[0] + 8 + sw, hip[1] + 7)], fill=DC["dressD"], width=2)
    f.px(hip[0] + 4, hip[1] + 4, DC["gold"])


def dc_ribbon(f, c, t):
    """腰后飘带(次级运动)"""
    x, y = c
    base = (x - 5, y + 26)
    pts = [base]
    for k in range(1, 4):
        pts.append((base[0] - 4 - k * 4, base[1] - k * 2 + math.sin(t * .9 + k * 1.1) * 3))
    for i in range(len(pts) - 1):
        f.limb(pts[i], pts[i + 1], max(1, 3 - i), DC["ribbon"], shade=(i == 0))


def dc_fans(f, P):
    """双扇: 前手扇(fanA 展开角) + 背手收扇; fanA None 时双收"""
    a = P.get("fanA")
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    if a is not None:
        # 展开扇: 7 根扇骨 + 扇面弧 + 羽缘
        spread = P.get("fanSpread", 1.1)      # 扇张角(rad)
        R = P.get("fanR", 16)
        for k in range(7):
            aa = a - spread / 2 + spread * k / 6
            x2, y2 = hx + math.cos(aa) * R, hy - math.sin(aa) * R
            f.d.line([(hx, hy), (x2, y2)], fill=DC["fanD"] if k % 2 else DC["fan"], width=2)
        # 扇面外缘(羽白)
        prev = None
        for k in range(13):
            aa = a - spread / 2 + spread * k / 12
            p = (hx + math.cos(aa) * (R + 2), hy - math.sin(aa) * (R + 2))
            if prev:
                f.d.line([prev, p], fill=DC["feather"], width=2)
            prev = p
        f.px(hx, hy - 1, DC["gold"])          # 扇钉
    # 背手收扇(短棒)
    rx, ry = CX + P["rH"][0], FEET_Y + P["rH"][1]
    f.limb((rx - 2, ry + 2), (rx + 4, ry - 6), 3, DC["fanD"])
    f.px(rx + 3, ry - 6, DC["feather"])


SKINS = {
    "wukong": {"pal": WK, "head": wk_head, "torso": wk_torso, "weapon": wk_staff, "extras": wk_extras,
               "skinC": WK["skin"], "pantsC": WK["pants"], "bootC": WK["boot"], "legW": 6, "armW": 5},
    "diaochan": {"pal": DC, "head": dc_head, "torso": dc_torso, "weapon": dc_fans, "extras": None,
                 "skinC": DC["skin"], "pantsC": DC["dressD"], "bootC": DC["boot"], "legW": 4, "armW": 4,
                 "posthair": dc_ribbon},
    "houyi": {"pal": HY, "head": hy_head, "torso": hy_torso, "weapon": hy_bow, "extras": None,
              "skinC": HY["skin"], "pantsC": HY["pants"], "bootC": HY["boot"], "legW": 5, "armW": 4},
    "angela": {"pal": AG, "head": ag_head, "torso": ag_torso, "weapon": ag_book, "extras": None,
               "skinC": AG["skin"], "pantsC": AG["boot"], "bootC": AG["boot"], "legW": 4, "armW": 4,
               "posthair": ag_twin_tails},
}


def draw_char(f, cid, P):
    S = SKINS[cid]
    hipY = P.get("hipY", -38)
    lean = P.get("lean", 0.0)
    hip = (CX + P.get("hipDx", 0), FEET_Y + hipY)
    tl = P.get("torsoLen", 17)
    neck = (hip[0] + math.sin(lean) * tl, hip[1] - math.cos(lean) * tl)
    hc = (neck[0] + P.get("headDx", 0), neck[1] - 8 + P.get("headDy", 0))

    if S.get("extras"):
        S["extras"](f, P, hip, neck)

    # legs (knee bend toward travel)
    for side, foot in (("l", P["lF"]), ("r", P["rF"])):
        fx, fy = CX + foot[0], FEET_Y + foot[1]
        knee = P.get(side + "K")
        kx, ky = (CX + knee[0], FEET_Y + knee[1]) if knee else ((hip[0] + fx) / 2 + 1.5, (hip[1] + fy) / 2)
        col = S["pantsC"] if side == "l" else tone(S["pantsC"], .74)
        f.limb(hip, (kx, ky), S["legW"], col)
        f.limb((kx, ky), (fx, fy), S["legW"] - 1, col)
        # boot with sole
        f.ell([fx - 3.5, fy - 3, fx + 4.5, fy + 2], S["bootC"])
        f.d.line([(fx - 3, fy + 2), (fx + 4, fy + 2)], fill=tone(S["bootC"], .55), width=1)

    # back arm
    bh = P.get("rH", (9, -32))
    hx, hy = CX + bh[0], FEET_Y + bh[1]
    sh = (neck[0] - 2, neck[1] + 3)
    e = P.get("rE")
    darkskin = tone(S["skinC"], .7)
    if e:
        ex, ey = CX + e[0], FEET_Y + e[1]
        f.limb(sh, (ex, ey), S["armW"], darkskin)
        f.limb((ex, ey), (hx, hy), S["armW"] - 1, darkskin)
    else:
        f.limb(sh, (hx, hy), S["armW"], darkskin)

    # torso + head
    S["torso"](f, hip, neck, P.get("t", 0))
    S["head"](f, hc, 1.0, P.get("look", 1))
    if S.get("posthair"):
        S["posthair"](f, hc, P.get("t", 0))

    # front arm
    fh = P.get("lH", (-6, -32))
    hx2, hy2 = CX + fh[0], FEET_Y + fh[1]
    sh2 = (neck[0] + 2, neck[1] + 3)
    e2 = P.get("lE")
    if e2:
        ex, ey = CX + e2[0], FEET_Y + e2[1]
        f.limb(sh2, (ex, ey), S["armW"], S["skinC"])
        f.limb((ex, ey), (hx2, hy2), S["armW"] - 1, S["skinC"])
    else:
        f.limb(sh2, (hx2, hy2), S["armW"], S["skinC"])
    f.ell([hx2 - 2.5, hy2 - 2.5, hx2 + 2.5, hy2 + 2.5], S["skinC"], shade=False)  # fist

    S["weapon"](f, P)


# ================= pose tables (richer than v1) =================
def lerp(a, b, t):
    return a + (b - a) * t


def hold(cid):
    return {
        "wukong": {"staffA": 1.30, "staffL": 30, "staffBack": .6, "lH": (6, -30), "rH": (10, -31)},
        "houyi": {"bowA": -0.05, "pull": 0, "lH": (9, -33), "rH": (11, -30)},
        "angela": {"staffA": 1.05, "lH": (7, -30), "rH": (9, -30)},
        "diaochan": {"fanA": 1.15, "fanR": 14, "fanSpread": 1.0, "lH": (6, -31), "rH": (9, -30)},
    }[cid]


def wrapf(cid, p, i=0):
    q = dict(hold(cid))
    q.update(p)
    q["t"] = q.get("t", i * .8)
    return q


def common_anims(cid):
    A = {}
    A["Idle"] = [wrapf(cid, {"hipY": -38 + (i % 3 == 2), "lF": (-7, 0), "rF": (8, 0),
                             "capeFlow": 1.5 + (i % 3), "t": i * .9}, i) for i in range(6)]
    run = []
    for i in range(8):
        ph = i / 8 * 2 * math.pi
        run.append(wrapf(cid, {
            "hipY": -37 - abs(math.sin(ph)) * 2.5, "lean": .30,
            "lF": (math.sin(ph) * 11, min(0, -math.cos(ph) * 5)),
            "rF": (math.sin(ph + math.pi) * 11, min(0, -math.cos(ph + math.pi) * 5)),
            "lH": (hold(cid)["lH"][0] + math.sin(ph + math.pi) * 4, -30),
            "rH": (10 + math.sin(ph) * 6, -30),
            "capeFlow": 4.5, "t": i * .8,
        }, i))
    A["Run"] = run
    A["Jump"] = [wrapf(cid, {"hipY": -42, "lean": -.12, "lF": (-5, -8), "rF": (8, -4), "capeFlow": 3}, i) for i in range(2)]
    A["Fall"] = [wrapf(cid, {"hipY": -40, "lean": .14, "lF": (-6, -3), "rF": (7, -6), "capeFlow": 5.5}, i) for i in range(2)]
    A["Crouch"] = [wrapf(cid, {"hipY": -24, "torsoLen": 13, "lean": .16, "lF": (-9, 0), "rF": (9, 0),
                               "lH": (4, -22), "rH": (8, -22), "capeFlow": .5, "t": i}, i) for i in range(4)]
    A["CrouchIn"] = [wrapf(cid, {"hipY": -30, "torsoLen": 15, "lean": .1, "lF": (-8, 0), "rF": (8, 0),
                                 "lH": (5, -26), "rH": (9, -26)}, 0)]
    A["TakeHit"] = [wrapf(cid, {"hipY": -36 + i, "lean": -.36 - i * .05, "headDx": -2,
                                "lF": (-9, 0), "rF": (6, 0), "lH": (-10, -32 + i), "rH": (12, -28),
                                "look": -1}, i) for i in range(4)]
    death = []
    for i in range(7):
        t = i / 6
        death.append(wrapf(cid, {
            "hipY": lerp(-36, -7, t), "lean": lerp(-.4, -1.52, t),
            "lF": (lerp(-9, -22, t), 0), "rF": (lerp(6, -9, t), 0),
            "lH": (lerp(-9, -28, t), lerp(-30, -5, t)), "rH": (lerp(11, -15, t), lerp(-28, -3, t)),
            "headDy": lerp(0, 2, t), "capeFlow": 0,
            "staffA": None, "bowA": None,
        }, i))
    A["Death"] = death
    return A


def wukong_anims():
    A = common_anims("wukong")
    atk1 = []
    for i in range(6):  # 快棒横扫
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": lerp(-.18, .1, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(-1, 3, t), lerp(-40, -33, t)), "staffA": lerp(2.5, 1.9, t), "staffL": 31, "staffBack": .3}
        elif i == 4:
            p = {"hipY": -37, "lean": .36, "lF": (-10, 0), "rF": (11, 0),
                 "lH": (11, -31), "staffA": .02, "staffL": 34, "staffBack": .16, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .22, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (9, -29), "staffA": -.35, "staffL": 31, "staffBack": .25}
        atk1.append(wrapf("wukong", p, i))
    atk2 = []
    for i in range(6):  # 蓄力砸击
        if i <= 3:
            t = i / 3
            p = {"hipY": -39, "lean": lerp(-.22, -.06, t), "lF": (-7, 0), "rF": (9, 0),
                 "lH": (lerp(1, 4, t), lerp(-38, -48, t)), "staffA": lerp(1.9, 1.55, t), "staffL": 32, "staffBack": .18}
        elif i == 4:
            p = {"hipY": -34, "lean": .45, "lF": (-9, 0), "rF": (12, 0),
                 "lH": (10, -22), "staffA": -.95, "staffL": 34, "staffBack": .13, "smear": "v"}
        else:
            p = {"hipY": -35, "lean": .32, "lF": (-9, 0), "rF": (11, 0),
                 "lH": (9, -20), "staffA": -1.05, "staffL": 31, "staffBack": .2}
        atk2.append(wrapf("wukong", p, i))
    atk3 = []
    for i in range(7):  # 如意神棍伸长
        if i <= 2:
            t = i / 2
            p = {"hipY": -38, "lean": lerp(-.12, .06, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(3, -2, t), -33), "staffA": lerp(1.7, 0, t), "staffL": 27, "staffBack": .5}
        elif i in (3, 4):
            p = {"hipY": -37, "lean": .4, "lF": (-11, 0), "rF": (13, 0),
                 "lH": (13, -33), "staffA": 0.0, "staffL": 50 if i == 3 else 62, "staffBack": .05}
        else:
            p = {"hipY": -38, "lean": .2, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (7, -32), "staffA": 0.0, "staffL": 33 - (i - 5) * 5, "staffBack": .2}
        atk3.append(wrapf("wukong", p, i))
    A["Attack1"], A["Attack2"], A["Attack3"] = atk1, atk2, atk3
    return A


def houyi_anims():
    A = common_anims("houyi")
    atk1 = []
    for i in range(6):  # 拉弓速射
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": .12, "lF": (-9, 0), "rF": (9, 0),
                 "lH": (12, -35), "rH": (lerp(9, -2, t), -35), "rE": (3, -37),
                 "bowA": 0.0, "pull": lerp(1, 9, t), "arrow": True}
        elif i == 4:
            p = {"hipY": -38, "lean": .18, "lF": (-9, 0), "rF": (9, 0),
                 "lH": (13, -35), "rH": (3, -36), "bowA": 0.0, "pull": 0}
        else:
            p = {"hipY": -38, "lean": .1, "lF": (-8, 0), "rF": (9, 0),
                 "lH": (11, -34), "bowA": .1, "pull": 0}
        atk1.append(wrapf("houyi", p, i))
    atk2 = []
    for i in range(5):  # 弓身横扫
        if i <= 2:
            t = i / 2
            p = {"hipY": -38, "lean": lerp(-.16, .06, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(-5, 1, t), -37), "bowA": lerp(1.9, 1.25, t)}
        elif i == 3:
            p = {"hipY": -37, "lean": .32, "lF": (-10, 0), "rF": (11, 0),
                 "lH": (11, -31), "bowA": -.25, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .2, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (9, -30), "bowA": -.45}
        atk2.append(wrapf("houyi", p, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A


def angela_anims():
    A = common_anims("angela")
    atk1 = []
    for i in range(5):  # 魔法书敲击
        if i <= 2:
            t = i / 2
            p = {"hipY": -38, "lean": lerp(-.12, .06, t), "lF": (-7, 0), "rF": (8, 0),
                 "lH": (lerp(2, 4, t), lerp(-33, -41, t)), "staffA": lerp(1.5, 1.05, t)}
        elif i == 3:
            p = {"hipY": -37, "lean": .32, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (11, -29), "staffA": -.55, "smear": "v"}
        else:
            p = {"hipY": -38, "lean": .22, "lF": (-8, 0), "rF": (9, 0),
                 "lH": (9, -28), "staffA": -.75}
        atk1.append(wrapf("angela", p, i))
    atk2 = []
    for i in range(6):  # 火球咏唱
        if i <= 3:
            t = i / 3
            p = {"hipY": -38 - t, "lean": -.1, "lF": (-7, 0), "rF": (8, 0),
                 "lH": (lerp(4, 7, t), -34), "staffA": lerp(1.25, .45, t), "cast": True}
        elif i == 4:
            p = {"hipY": -37, "lean": .3, "lF": (-9, 0), "rF": (11, 0),
                 "lH": (12, -32), "staffA": .02, "cast": True}
        else:
            p = {"hipY": -38, "lean": .16, "lF": (-8, 0), "rF": (9, 0),
                 "lH": (10, -31), "staffA": .2}
        atk2.append(wrapf("angela", p, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A


def diaochan_anims():
    A = common_anims("diaochan")
    atk1 = []
    for i in range(6):  # 扇刃连斩: 后引 -> 横扫
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": lerp(-.16, .08, t), "lF": (-7, 0), "rF": (8, 0),
                 "lH": (lerp(-2, 3, t), lerp(-36, -33, t)),
                 "fanA": lerp(2.5, 1.8, t), "fanR": 15, "fanSpread": lerp(.5, 1.0, t)}
        elif i == 4:
            p = {"hipY": -37, "lean": .34, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (11, -31), "fanA": .05, "fanR": 17, "fanSpread": 1.35, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .2, "lF": (-8, 0), "rF": (9, 0),
                 "lH": (9, -30), "fanA": -.3, "fanR": 15, "fanSpread": 1.0}
        atk1.append(wrapf("diaochan", p, i))
    atk2 = []
    for i in range(6):  # 舞袖回旋/火羽扇: 拧身蓄势 -> 大开扇挥出
        if i <= 3:
            t = i / 3
            p = {"hipY": -38 - t, "lean": lerp(-.1, -.24, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(3, -4, t), lerp(-34, -40, t)),
                 "fanA": lerp(1.4, 2.7, t), "fanR": 16, "fanSpread": lerp(1.0, .4, t), "cast": True}
        elif i == 4:
            p = {"hipY": -36, "lean": .4, "lF": (-10, 0), "rF": (12, 0),
                 "lH": (12, -30), "fanA": -.15, "fanR": 19, "fanSpread": 1.5, "smear": "h", "cast": True}
        else:
            p = {"hipY": -38, "lean": .24, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (10, -29), "fanA": -.4, "fanR": 16, "fanSpread": 1.1}
        atk2.append(wrapf("diaochan", p, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A


# ================= render & QA =================
def render(cid, pose):
    f = F()
    draw_char(f, cid, pose)
    sm = pose.get("smear")
    if sm == "h":
        f.arc_smear((CX + 18, FEET_Y - 33), 30, -1.25, 1.05, w=9)
    elif sm == "v":
        f.arc_smear((CX + 16, FEET_Y - 28), 30, -2.3, -.45, w=9)
    f.outline()
    return f.im


def bake(cid, anims):
    os.makedirs(f"{OUT}\\{cid}", exist_ok=True)
    stats = {}
    for an, frames in anims.items():
        sheet = Image.new("RGBA", (FW * len(frames), FW), (0, 0, 0, 0))
        for i, p in enumerate(frames):
            sheet.paste(render(cid, p), (i * FW, 0))
        sheet.save(f"{OUT}\\{cid}\\{an}.png")
        stats[an] = len(frames)
    return stats


def qa(cid, anims):
    ok = True
    for an in anims:
        im = Image.open(f"{OUT}\\{cid}\\{an}.png")
        n = im.width // FW
        hs, whites, colors = [], [], set()
        for i in range(n):
            fr = im.crop((i * FW, 0, (i + 1) * FW, FW))
            bbox = fr.getchannel("A").getbbox()
            if bbox:
                hs.append(bbox[3] - bbox[1])
            data = fr.getdata()
            whites.append(sum(1 for p in data if p[0] >= 246 and p[1] >= 246 and p[2] >= 246 and p[3] > 200))
            for p in data:
                if p[3] > 200:
                    colors.add(p[:3])
        cap = 120 if an.startswith("Attack") else 96  # M1.1: 192帧含挥过头顶的武器+刀光
        hmax = max(hs)
        stat = f"  {an:9s} n={n} H={min(hs)}-{hmax} colors={len(colors)} smearPx={max(whites)}"
        if not (46 <= hmax <= cap):
            stat += "  !! height"
            ok = False
        if len(colors) < 8:
            stat += "  !! too flat"
            ok = False
        print(stat)
    return ok


# ================= busts (select 320x344 / hud 84x84) =================
# M1.1: true shoulder-up busts matching the hand-drawn ui-lab framing —
# head ~120px in the upper-centre, shoulder mass flaring to the frame edges,
# chest bottom-cropped by the canvas. (Old version drew a small full-body
# chibi floating in the frame → looked broken next to mack/kenji.)

def _bust_shoulders(f, cid, hx, neck_y):
    """wide signature shoulder/chest mass, bottom-cropped by the frame"""
    B = 344
    if cid == "wukong":
        f.poly([(hx - 118, B), (hx - 76, neck_y + 6), (hx + 76, neck_y + 6), (hx + 118, B)], WK["red"])
        f.poly([(hx - 118, B), (hx - 92, neck_y + 52), (hx - 30, B)], WK["redD"])          # cape shade
        f.ell([hx - 46, neck_y + 42, hx + 46, B + 30], WK["gold"])                          # chest plate
        f.d.arc([hx - 40, neck_y + 48, hx + 40, B + 20], 200, 340, fill=WK["goldD"], width=4)
        f.px(hx, neck_y + 74, (255, 240, 190, 255))                                         # gem glint
        for sgn in (-1, 1):                                                                 # pauldrons
            sx = hx + sgn * 92
            f.ell([sx - 42, neck_y - 6, sx + 42, neck_y + 62], WK["gold"])
            f.d.arc([sx - 36, neck_y, sx + 36, neck_y + 56], 180, 360, fill=WK["goldD"], width=3)
    elif cid == "houyi":
        f.poly([(hx - 112, B), (hx - 72, neck_y + 4), (hx + 72, neck_y + 4), (hx + 112, B)], HY["blue"])
        f.poly([(hx - 112, B), (hx - 86, neck_y + 50), (hx - 26, B)], HY["blueD"])
        f.poly([(hx - 44, neck_y + 44), (hx + 44, neck_y + 44), (hx + 36, B), (hx - 36, B)], HY["dark"])  # cuirass
        f.d.line([(hx - 36, neck_y + 72), (hx + 36, neck_y + 72)], fill=HY["silver"], width=3)            # tech line
        f.px(hx, neck_y + 84, HY["gold"])
        # quiver strap across the chest
        f.d.line([(hx - 60, neck_y + 30), (hx + 44, B - 6)], fill=(86, 58, 38, 255), width=9)
        for sgn in (-1, 1):
            sx = hx + sgn * 86
            f.ell([sx - 38, neck_y - 4, sx + 38, neck_y + 56], HY["silver"])
            f.d.arc([sx - 32, neck_y + 2, sx + 32, neck_y + 50], 180, 360, fill=(150, 160, 178, 255), width=3)
    elif cid == "angela":
        f.poly([(hx - 104, B), (hx - 66, neck_y + 8), (hx + 66, neck_y + 8), (hx + 104, B)], AG["dress"])
        f.poly([(hx - 104, B), (hx - 80, neck_y + 52), (hx - 24, B)], AG["dressD"])
        for sgn in (-1, 1):                                                                 # puff shoulders
            sx = hx + sgn * 78
            f.ell([sx - 36, neck_y - 2, sx + 36, neck_y + 58], AG["dress"])
            f.d.arc([sx - 30, neck_y + 4, sx + 30, neck_y + 52], 180, 360, fill=AG["dressD"], width=3)
        f.poly([(hx - 30, neck_y + 46), (hx + 30, neck_y + 46), (hx + 26, B), (hx - 26, B)], AG["black"])  # corset
        for k in range(3):
            f.px(hx, neck_y + 62 + k * 26, AG["gold"])
        f.d.line([(hx - 30, neck_y + 46), (hx - 26, B)], fill=AG["gold"], width=2)
        f.d.line([(hx + 30, neck_y + 46), (hx + 26, B)], fill=AG["gold"], width=2)
    elif cid == "mack":  # 剣二: 白胴衣 + 绯围巾垂布 + 肩后刀柄
        f.poly([(hx - 110, B), (hx - 72, neck_y + 4), (hx + 72, neck_y + 4), (hx + 110, B)], MK["gi"])
        f.poly([(hx - 110, B), (hx - 84, neck_y + 50), (hx - 26, B)], MK["giD"])
        f.d.line([(hx - 10, neck_y + 44), (hx - 26, B)], fill=MK["giD"], width=4)   # 交领线
        f.d.line([(hx + 46, neck_y + 18), (hx + 96, neck_y - 34)], fill=(60, 48, 52, 255), width=9)  # 刀柄
        f.rect([hx + 86, neck_y - 46, hx + 104, neck_y - 32], (150, 128, 88, 255))  # 柄头
        f.d.line([(hx + 52, neck_y + 14), (hx + 66, neck_y + 2)], fill=(210, 178, 120, 255), width=3)  # 缠绳高光
        # 绯围巾: 环颈 + 左肩垂布双层
        f.poly([(hx - 62, neck_y + 2), (hx + 62, neck_y + 2), (hx + 44, neck_y + 42), (hx - 44, neck_y + 42)], MK["scarf"])
        f.poly([(hx - 58, neck_y + 30), (hx - 20, neck_y + 34), (hx - 44, B), (hx - 78, B)], MK["scarf"])
        f.poly([(hx - 48, neck_y + 36), (hx - 26, neck_y + 38), (hx - 42, B)], MK["scarfD"])
        f.d.line([(hx - 52, neck_y + 22), (hx + 52, neck_y + 22)], fill=MK["scarfD"], width=3)
    elif cid == "kenji":  # 隼人: 藍胴着 + 黑革护肩 + 斜背带
        f.poly([(hx - 108, B), (hx - 70, neck_y + 4), (hx + 70, neck_y + 4), (hx + 108, B)], KJ["garb"])
        f.poly([(hx - 108, B), (hx - 82, neck_y + 50), (hx - 26, B)], KJ["garbD"])
        f.d.line([(hx - 58, neck_y + 24), (hx + 46, B)], fill=(36, 32, 40, 255), width=8)  # 斜背带
        f.rect([hx - 8, neck_y + 56, hx + 8, neck_y + 68], KJ["gold"], lit=True)     # 带扣
        for sgn in (-1, 1):  # 革护肩(叠片)
            sx = hx + sgn * 84
            f.ell([sx - 36, neck_y - 2, sx + 36, neck_y + 54], (44, 40, 50, 255))
            f.d.arc([sx - 30, neck_y + 6, sx + 30, neck_y + 48], 180, 360, fill=(70, 64, 78, 255), width=4)
            f.d.arc([sx - 24, neck_y + 16, sx + 24, neck_y + 52], 180, 360, fill=(58, 52, 64, 255), width=3)
        f.poly([(hx - 46, neck_y + 2), (hx + 46, neck_y + 2), (hx + 34, neck_y + 34), (hx - 34, neck_y + 34)], KJ["garbD"])  # 交领
        f.d.line([(hx - 34, neck_y + 6), (hx + 20, neck_y + 30)], fill=KJ["garb"], width=3)
    elif cid == "diaochan":  # 貂蝉: 露肩玫红舞衣 + 金链 + 肩侧纱带
        f.poly([(hx - 96, B), (hx - 60, neck_y + 22), (hx + 60, neck_y + 22), (hx + 96, B)], DC["dress"])
        f.poly([(hx - 96, B), (hx - 74, neck_y + 58), (hx - 22, B)], DC["dressD"])
        f.d.line([(hx - 56, neck_y + 30), (hx + 56, neck_y + 30)], fill=DC["dressD"], width=3)  # 衣缘
        f.d.line([(hx - 44, neck_y + 40), (hx + 44, neck_y + 40)], fill=DC["gold"], width=2)    # 金链
        f.px(hx, neck_y + 44, DC["goldL"])
        for sgn in (-1, 1):  # 裸肩(圆润) + 纱带垂
            sx = hx + sgn * 70
            f.ell([sx - 26, neck_y + 6, sx + 26, neck_y + 50], DC["skin"])
            f.poly([(sx + sgn * 12, neck_y + 34), (sx + sgn * 34, B), (sx + sgn * 2, B)], DC["ribbon"])
    else:  # ayame: dark kunoichi cloak + blue scarf drape + silver strap
        f.poly([(hx - 108, B), (hx - 70, neck_y + 4), (hx + 70, neck_y + 4), (hx + 108, B)], AY["dark"])
        f.poly([(hx - 108, B), (hx - 82, neck_y + 50), (hx - 26, B)], tone(AY["dark"], .72))
        f.d.line([(hx - 62, neck_y + 26), (hx + 46, B)], fill=AY["silver"], width=6)        # strap
        f.d.line([(hx + 62, neck_y + 26), (hx - 46, B)], fill=AY["silver"], width=6)
        f.poly([(hx - 58, neck_y + 2), (hx + 58, neck_y + 2), (hx + 40, neck_y + 44), (hx - 40, neck_y + 44)], AY["blue"])  # scarf drape
        f.d.line([(hx - 48, neck_y + 30), (hx + 48, neck_y + 30)], fill=tone(AY["blue"], .74), width=3)


def bake_bust(cid, out_sel=None, out_hud=None, hud_size=84):
    big = F(320, 344)
    S = SKINS[cid]
    hx, hy = 152.0, 138.0                 # head centre
    r_unit = 7.0 if cid == "houyi" else 7.5
    sh = 60.0 / r_unit                    # head proxy scale → head radius ≈ 60px
    neck_y = 218.0
    big.limb((hx, hy + 40), (hx, neck_y + 14), 40, S["skinC"])  # neck under everything
    _bust_shoulders(big, cid, hx, neck_y)                       # garment covers collar
    hp = _scale_proxy(big, sh)
    S["head"](hp, (hx / sh, hy / sh), 1.0, 1)
    if S.get("posthair"):
        S["posthair"](hp, (hx / sh, hy / sh), 0)
    big.outline()
    big.im.save(out_sel or f"{OUT}\\portraits\\{cid}-sel.png")
    hud = big.im.crop((64, 30, 248, 214)).resize((hud_size, hud_size), Image.NEAREST)
    hud.save(out_hud or f"{OUT}\\portraits\\{cid}-hud.png")


class _scale_proxy:
    """proxy that scales painter coords up by s onto a big frame"""
    def __init__(self, f, s):
        self.f, self.s = f, s
        self.d = _scale_draw(f.d, s)

    def ell(self, box, col, shade=True):
        self.f.ell([v * self.s for v in box], col, shade)

    def poly(self, pts, col, shade=True):
        self.f.poly([(x * self.s, y * self.s) for x, y in pts], col, shade)

    def rect(self, box, col, lit=False):
        self.f.rect([v * self.s for v in box], col, lit)

    def px(self, x, y, col):
        s = self.s
        self.f.d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=col)

    def limb(self, p1, p2, w, col, shade=True):
        self.f.limb((p1[0] * self.s, p1[1] * self.s), (p2[0] * self.s, p2[1] * self.s), int(w * self.s), col, shade)


class _scale_draw:
    def __init__(self, d, s):
        self._d, self._s = d, s

    def line(self, pts, fill=None, width=1):
        s = self._s
        self._d.line([(x * s, y * s) for x, y in pts], fill=fill, width=max(1, int(width * s)))

    def arc(self, box, a0, a1, fill=None, width=1):
        s = self._s
        self._d.arc([v * s for v in box], a0, a1, fill=fill, width=max(1, int(width * s)))

    def rectangle(self, box, fill=None):
        s = self._s
        self._d.rectangle([v * s for v in box], fill=fill)

    def point(self, p, fill=None):
        s = self._s
        self._d.rectangle([p[0] * s, p[1] * s, p[0] * s + s - 1, p[1] * s + s - 1], fill=fill)

    def polygon(self, pts, fill=None):
        s = self._s
        self._d.polygon([(x * s, y * s) for x, y in pts], fill=fill)

    def ellipse(self, box, fill=None, outline=None):
        s = self._s
        self._d.ellipse([v * s for v in box], fill=fill, outline=outline)


if __name__ == "__main__":
    os.makedirs(f"{OUT}\\portraits", exist_ok=True)
    builders = {"wukong": wukong_anims, "houyi": houyi_anims, "angela": angela_anims,
                "diaochan": diaochan_anims}
    allok = True
    for cid, b in builders.items():
        st = bake(cid, b())
        print(f"== {cid}: {st}")
        allok &= qa(cid, st.keys())
        bake_bust(cid)
        print(f"  bust: {cid}-sel.png 320x344 + {cid}-hud.png 84x84")
    print("\nQA:", "ALL OK" if allok else "ISSUES — see !! lines")


# ================= ayame bust (gameplay sprites stay Huntress) =================
AY = {
    "skin": (238, 202, 168, 255),
    "hair": (52, 44, 72, 255), "hairD": (34, 28, 50, 255),
    "blue": (90, 122, 200, 255), "silver": (206, 216, 236, 255),
    "dark": (40, 38, 58, 255),
}


def ay_head(f, c, s=1.0, look=0):
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], AY["skin"])
    # long dark ponytail + moon hairpin + half-mask scarf
    f.ell([x - r * 1.05, y - r * 1.15, x + r * .9, y - r * .05], AY["hair"])
    f.poly([(x - r * .7, y - r * .6), (x - r * 1.9, y + r * 1.6), (x - r * 1.1, y + r * 1.8), (x - r * .3, y - r * .1)], AY["hair"])
    f.poly([(x - r * .75, y - r * .5), (x - r * 1.5, y + r * 1.2), (x - r * 1.1, y + r * 1.3)], AY["hairD"])
    f.ell([x + r * .35, y - r * 1.3, x + r * .95, y - r * .75], AY["silver"])  # 月簪
    f.px(x + r * .65, y - r * 1.02, (255, 255, 255, 255))
    ex = x + r * .25 + look
    f.rect([ex - 1.2 * s, y - r * .12, ex + 1.2 * s, y + r * .14], (240, 244, 255, 255))
    f.px(ex + .4 * s, y, (60, 60, 120, 255))
    f.d.line([(ex - 1.6 * s, y - r * .3), (ex + 1.6 * s, y - r * .32)], fill=AY["hairD"], width=1)
    # 下半脸围巾
    f.poly([(x - r * .5, y + r * .35), (x + r * .95, y + r * .3), (x + r * .7, y + r * .95), (x - r * .6, y + r * .8)], AY["blue"])


def ay_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 10, AY["dark"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.d.line([(mx - 4, my - 5), (mx + 4, my + 2)], fill=AY["silver"], width=1)  # 束带
    f.d.line([(mx + 4, my - 5), (mx - 4, my + 2)], fill=AY["silver"], width=1)
    f.ell([neck[0] - 5, neck[1] - 1, neck[0] + 5, neck[1] + 4], AY["blue"])     # 披巾
    f.rect([hip[0] - 5, hip[1] - 3, hip[0] + 5, hip[1]], AY["blue"], lit=True)


SKINS["ayame"] = {"pal": AY, "head": ay_head, "torso": ay_torso, "weapon": lambda f, P: None,
                  "extras": None, "skinC": AY["skin"], "pantsC": AY["dark"], "bootC": AY["dark"],
                  "legW": 4, "armW": 4}

if __name__ == "__main__" and (len(sys.argv) > 1 and sys.argv[1] == "ayame_bust"):
    os.makedirs(f"{OUT}\\portraits", exist_ok=True)
    bake_bust("ayame")
    print("ayame bust done")


# ============ M1.2 uilib: mack/kenji 自产胸像(去 ui-lab 手绘依赖) ============
# 与既有四人同构图模板; 输出沿用 ui.js 装载文件名(portrait-hayato-* = mack 视觉,
# portrait-kenji-* = kenji 视觉 —— 原项目文件名与角色 id 的历史错位, 保持兼容)
MK = {  # mack「剣二」: 斗笠剑客 —— 赤笠/白胴衣/绯围巾
    "skin": (238, 198, 160, 255), "hair": (54, 40, 44, 255),
    "kasa": (156, 52, 40, 255), "kasaD": (104, 32, 26, 255),
    "scarf": (188, 44, 48, 255), "scarfD": (134, 28, 34, 255),
    "gi": (214, 204, 186, 255), "giD": (164, 154, 136, 255),
}
KJ = {  # kenji「隼人」: 鬼面忍 —— 赤鬼面/藍胴着/黑发髻
    "skin": (224, 184, 150, 255), "hair": (30, 26, 32, 255),
    "mask": (198, 58, 44, 255), "maskD": (142, 34, 26, 255),
    "gold": (224, 170, 66, 255), "bone": (240, 234, 220, 255),
    "garb": (76, 96, 170, 255), "garbD": (50, 64, 114, 255),
}


def mk_head(f, c, s=1.0, look=0):
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], MK["skin"])
    # 鬓发 + 后髻
    f.poly([(x - r, y - r * .2), (x - r * 1.15, y + r * .9), (x - r * .55, y + r * .6), (x - r * .6, y - r * .1)], MK["hair"])
    f.ell([x - r * .95, y - r * .75, x + r * .3, y - r * .05], MK["hair"])
    # 斗笠: 宽檐斜面锥 + 顶结 + 檐下阴影
    f.poly([(x - r * 1.75, y - r * .55), (x + r * 1.75, y - r * .55), (x + r * .35, y - r * 1.75), (x - r * .35, y - r * 1.75)], MK["kasa"])
    f.poly([(x - r * 1.75, y - r * .55), (x + r * 1.75, y - r * .55), (x + r * 1.45, y - r * .3), (x - r * 1.45, y - r * .3)], MK["kasaD"])
    f.d.line([(x - r * .3, y - r * 1.05), (x + r * .5, y - r * 1.35)], fill=(206, 96, 70, 255), width=max(1, int(s)))  # 笠面高光
    f.px(x, y - r * 1.82, MK["kasaD"])   # 顶结
    # 眼: 沉静细目 + 眉
    ex = x + r * .3 + look
    f.rect([ex - 1.3 * s, y - r * .06, ex + 1.3 * s, y + r * .18], (244, 246, 250, 255))
    f.px(ex + .5 * s, y + r * .06, (48, 42, 60, 255))
    f.d.line([(ex - 1.7 * s, y - r * .26), (ex + 1.7 * s, y - r * .24)], fill=MK["hair"], width=max(1, int(s)))
    f.d.line([(x + r * .15 + look, y + r * .55), (x + r * .62 + look, y + r * .52)], fill=(170, 120, 96, 255), width=1)
    # 颊侧笠绳
    f.d.line([(x - r * 1.05, y - r * .4), (x - r * .55, y + r * .75)], fill=MK["scarfD"], width=1)
    f.d.line([(x + r * 1.05, y - r * .4), (x + r * .62, y + r * .78)], fill=MK["scarfD"], width=1)


def mk_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 10, MK["gi"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.d.line([(mx - 4, my - 6), (mx + 3, my + 4)], fill=MK["giD"], width=1)   # 衣襟
    f.ell([neck[0] - 5, neck[1] - 2, neck[0] + 5, neck[1] + 4], MK["scarf"])  # 围巾
    f.rect([hip[0] - 5, hip[1] - 3, hip[0] + 5, hip[1]], MK["scarfD"], lit=True)


def kj_head(f, c, s=1.0, look=0):
    x, y = c
    r = 7.5 * s
    # 乱发冠 + 高髻
    f.ell([x - r * 1.1, y - r * 1.25, x + r * 1.1, y + r * .3], KJ["hair"])
    f.poly([(x - r * .2, y - r * 1.2), (x + r * .15, y - r * 1.95), (x + r * .55, y - r * 1.3)], KJ["hair"])
    f.px(x + r * .18, y - r * 1.5, KJ["gold"])  # 髻环
    for sgn in (-1, 1):  # 鬓角乱束
        f.poly([(x + sgn * r * .9, y - r * .3), (x + sgn * r * 1.45, y + r * .7), (x + sgn * r * .7, y + r * .5)], KJ["hair"])
    # 鬼面: 赤面 + 金目 + 白獠牙 + 眉弓
    f.ell([x - r * .92, y - r * .68, x + r * .92, y + r * .95], KJ["mask"])
    f.poly([(x - r * .8, y + r * .3), (x + r * .8, y + r * .3), (x + r * .5, y + r * .95), (x - r * .5, y + r * .95)], KJ["maskD"])
    for sgn in (-1, 1):
        ex = x + sgn * r * .42 + look * .4
        f.rect([ex - 1.4 * s, y - r * .22, ex + 1.4 * s, y + r * .08], KJ["gold"])
        f.px(ex + .3 * s, y - r * .06, (40, 20, 14, 255))
        f.d.line([(ex - 1.8 * s, y - r * .45), (ex + 1.8 * s, y - r * .38)], fill=(66, 24, 18, 255), width=max(1, int(s)))
    for k in range(4):  # 獠牙列
        tx = x - r * .5 + k * r * .34
        f.poly([(tx, y + r * .42), (tx + r * .16, y + r * .42), (tx + r * .08, y + r * .78 if k % 2 == 0 else y + r * .62)], KJ["bone"])
    f.px(x - r * .02, y - r * .5, KJ["gold"])  # 眉心金点


def kj_torso(f, hip, neck, ph=0):
    f.limb(hip, neck, 10, KJ["garb"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.d.line([(mx - 4, my - 6), (mx + 4, my + 3)], fill=KJ["garbD"], width=2)  # 交领
    f.d.line([(mx + 4, my - 6), (mx - 4, my + 3)], fill=KJ["garbD"], width=1)
    f.rect([hip[0] - 5, hip[1] - 3, hip[0] + 5, hip[1]], (36, 32, 40, 255), lit=True)


SKINS["mack"] = {"pal": MK, "head": mk_head, "torso": mk_torso, "weapon": lambda f, P: None,
                 "extras": None, "skinC": MK["skin"], "pantsC": MK["giD"], "bootC": MK["hair"],
                 "legW": 5, "armW": 4}
SKINS["kenji"] = {"pal": KJ, "head": kj_head, "torso": kj_torso, "weapon": lambda f, P: None,
                  "extras": None, "skinC": KJ["skin"], "pantsC": KJ["garbD"], "bootC": KJ["hair"],
                  "legW": 5, "armW": 4}

if __name__ == "__main__" and (len(sys.argv) > 1 and sys.argv[1] == "uilib_busts"):
    UILIB = r"C:\留存\Game Now\soul-blade-plus\assets\uilib"
    os.makedirs(UILIB, exist_ok=True)
    # 文件名兼容 ui.js: hayato 文件 = mack 视觉(历史错位保持)
    bake_bust("mack", os.path.join(UILIB, "portrait-hayato-sel.png"),
              os.path.join(UILIB, "portrait-hayato-hud.png"), hud_size=336)
    bake_bust("kenji", os.path.join(UILIB, "portrait-kenji-sel.png"),
              os.path.join(UILIB, "portrait-kenji-hud.png"), hud_size=336)
    print("uilib busts done (mack/kenji)")
