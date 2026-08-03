# -*- coding: utf-8 -*-
"""Procedural pixel sprite baker for SOUL BLADE PLUS roster.

Outputs LuizMelo-format sheets: horizontal strips of square frames,
frame side = image height (128px). Character ~60px tall, feet at y=100.
Attack smears painted near-pure-white (>=246) so the engine's
Assets.bakeSmears() crescent pipeline picks them up automatically.

Style rules (matching Martial Hero packs):
  - 1px dark outline around the silhouette
  - flat fills + one shade tone + small highlight
  - chunky limbs, big silhouette reads
"""
import math
import os
import sys

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")
FW = 128            # frame square
FEET_Y = 100        # ground line inside frame
CX = 64             # anchor x
OUT = r"C:\留存\Game Now\soul-blade-plus\assets\img"

# ---------------------------------------------------------------- painting


class Frame:
    def __init__(self):
        self.im = Image.new("RGBA", (FW, FW), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    # limb: thick line from p1 to p2
    def limb(self, p1, p2, w, col):
        self.d.line([p1, p2], fill=col, width=w)
        r = w / 2 - 0.5
        for p in (p1, p2):
            self.d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=col)

    def ell(self, box, col, outline=None):
        self.d.ellipse(box, fill=col, outline=outline)

    def poly(self, pts, col, outline=None):
        self.d.polygon(pts, fill=col, outline=outline)

    def rect(self, box, col):
        self.d.rectangle(box, fill=col)

    def arc_smear(self, c, r, a0, a1, w=7, col=(255, 255, 255, 255)):
        """white crescent smear (engine-extractable)"""
        bbox = [c[0] - r, c[1] - r, c[0] + r, c[1] + r]
        self.d.arc(bbox, math.degrees(a0), math.degrees(a1), fill=col, width=w)

    def outline_pass(self, col=(24, 16, 20, 255)):
        """1px dark outline around every opaque region (drawn onto edges)"""
        px = self.im.load()
        w, h = self.im.size
        alpha = [[px[x, y][3] for x in range(w)] for y in range(h)]
        edge = []
        for y in range(h):
            for x in range(w):
                if alpha[y][x] > 40:
                    continue
                n = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and alpha[yy][xx] > 120:
                        n = True
                        break
                if n:
                    edge.append((x, y))
        for x, y in edge:
            px[x, y] = col


def shade(col, k):
    return (max(0, min(255, int(col[0] * k))), max(0, min(255, int(col[1] * k))),
            max(0, min(255, int(col[2] * k))), 255)


# ---------------------------------------------------------------- puppet


def draw_humanoid(f, P, S):
    """P: pose dict. S: skin dict (colors + char-specific extras hook).
    Pose keys (all offsets from (CX, FEET_Y), y up = negative):
      hipY, lean (rad), headDx/headDy, lF/rF (foot xy), lK/rK opt knee hints,
      lH/rH (hand xy), weapon fn hook order: behind -> body -> front
    """
    hipY = P.get("hipY", -34)
    lean = P.get("lean", 0.0)
    hip = (CX + P.get("hipDx", 0), FEET_Y + hipY)
    # torso top (neck)
    tl = P.get("torsoLen", 16)
    neck = (hip[0] + math.sin(lean) * tl, hip[1] - math.cos(lean) * tl)
    head_c = (neck[0] + P.get("headDx", 0), neck[1] - 7 + P.get("headDy", 0))

    legW = S.get("legW", 5)
    armW = S.get("armW", 4)

    if S.get("pre"):  # char hook: cape/tail behind body
        S["pre"](f, P, hip, neck, head_c)

    # legs
    for side, foot in (("l", P["lF"]), ("r", P["rF"])):
        fx, fy = CX + foot[0], FEET_Y + foot[1]
        knee = P.get(side + "K")
        if knee:
            kx, ky = CX + knee[0], FEET_Y + knee[1]
        else:  # midpoint with slight forward bend
            kx, ky = (hip[0] + fx) / 2 + 1, (hip[1] + fy) / 2
        col = S["pants"] if side == "l" else shade(S["pants"], .78)
        f.limb(hip, (kx, ky), legW, col)
        f.limb((kx, ky), (fx, fy), legW, col)
        f.ell([fx - 3, fy - 2, fx + 4, fy + 2], S["boot"])

    # torso
    f.limb(hip, neck, S.get("torsoW", 9), S["torso"])
    if S.get("chest"):  # armor plate
        mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
        f.ell([mx - 5, my - 5, mx + 5, my + 4], S["chest"])
    if S.get("belt"):
        f.rect([hip[0] - 5, hip[1] - 2, hip[0] + 5, hip[1] + 1], S["belt"])

    # back arm (drawn before head, darker)
    bh = P.get("rH", (8, -30))
    elbow = P.get("rE")
    hx, hy = CX + bh[0], FEET_Y + bh[1]
    sh = (neck[0] - 2, neck[1] + 3)
    if elbow:
        ex, ey = CX + elbow[0], FEET_Y + elbow[1]
        f.limb(sh, (ex, ey), armW, shade(S["skin"], .72))
        f.limb((ex, ey), (hx, hy), armW, shade(S["skin"], .72))
    else:
        f.limb(sh, (hx, hy), armW, shade(S["skin"], .72))

    # head
    hr = S.get("headR", 6)
    f.ell([head_c[0] - hr, head_c[1] - hr, head_c[0] + hr, head_c[1] + hr], S["skin"])
    if S.get("hair"):
        S["hair"](f, head_c, P)
    # face: single eye pixel (facing right)
    f.rect([head_c[0] + 2, head_c[1] - 1, head_c[0] + 3, head_c[1]], (20, 12, 16, 255))

    if S.get("mid"):  # char hook between body and front arm (weapon behind hand)
        S["mid"](f, P, hip, neck, head_c)

    # front arm
    fh = P.get("lH", (-6, -30))
    elbowF = P.get("lE")
    hx2, hy2 = CX + fh[0], FEET_Y + fh[1]
    sh2 = (neck[0] + 2, neck[1] + 3)
    if elbowF:
        ex, ey = CX + elbowF[0], FEET_Y + elbowF[1]
        f.limb(sh2, (ex, ey), armW, S["skin"])
        f.limb((ex, ey), (hx2, hy2), armW, S["skin"])
    else:
        f.limb(sh2, (hx2, hy2), armW, S["skin"])

    if S.get("post"):  # weapon in front hand
        S["post"](f, P, hip, neck, head_c)


# ---------------------------------------------------------------- wukong skin

GOLD = (232, 178, 42, 255)
GOLD_D = (168, 118, 24, 255)
RED = (200, 54, 40, 255)
FUR = (176, 118, 66, 255)
SKIN_W = (238, 196, 150, 255)


def wk_hair(f, hc, P):
    # fur crown + golden circlet (紧箍)
    f.ell([hc[0] - 7, hc[1] - 8, hc[0] + 7, hc[1] - 1], FUR)
    for dx in (-6, -2, 2, 6):
        f.poly([(hc[0] + dx, hc[1] - 7), (hc[0] + dx + 2, hc[1] - 12), (hc[0] + dx + 3, hc[1] - 7)], FUR)
    f.rect([hc[0] - 6, hc[1] - 7, hc[0] + 6, hc[1] - 6], GOLD)
    # sideburn fur
    f.ell([hc[0] - 8, hc[1] - 3, hc[0] - 4, hc[1] + 3], FUR)


def wk_pre(f, P, hip, neck, hc):
    # tail (curled) + red cape scarf
    t = P.get("t", 0)
    tx = hip[0] - 10
    f.limb((hip[0] - 2, hip[1] + 1), (tx - 4, hip[1] - 6 + math.sin(t * .9) * 2), 3, FUR)
    f.ell([tx - 8, hip[1] - 11 + math.sin(t * .9) * 2, tx - 2, hip[1] - 5 + math.sin(t * .9) * 2], FUR)
    fl = P.get("capeFlow", 2)
    f.poly([(neck[0] - 3, neck[1] + 2), (neck[0] - 12 - fl, neck[1] + 12 + fl),
            (neck[0] - 6, neck[1] + 16 + fl), (neck[0] - 1, neck[1] + 6)], RED)


def wk_staff(f, P, hip, neck, hc):
    """金箍棒: gold-tipped rod through the front hand along P['staffA'], len P['staffL']"""
    a = P.get("staffA")
    if a is None:
        return
    L = P.get("staffL", 26)
    back = P.get("staffBack", .45)
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    x1, y1 = hx - math.cos(a) * L * back, hy + math.sin(a) * L * back
    x2, y2 = hx + math.cos(a) * L * (1 - back) * 2, hy - math.sin(a) * L * (1 - back) * 2
    f.limb((x1, y1), (x2, y2), 4, (188, 44, 38, 255))       # red shaft
    for (ex, ey) in ((x1, y1), (x2, y2)):
        dxn, dyn = (x2 - x1), (y2 - y1)
        n = math.hypot(dxn, dyn) or 1
        ux, uy = dxn / n, dyn / n
        f.limb((ex - ux * 2, ey - uy * 2), (ex + ux * 2, ey + uy * 2), 5, GOLD)


WUKONG_SKIN = {
    "skin": SKIN_W, "pants": (168, 62, 40, 255), "boot": (70, 40, 30, 255),
    "torso": GOLD, "chest": GOLD_D, "belt": (120, 30, 26, 255),
    "hair": wk_hair, "pre": wk_pre, "post": wk_staff,
    "legW": 5, "armW": 4, "torsoW": 9, "headR": 6,
}

# ---------------------------------------------------------------- houyi skin

HY_BLUE = (74, 108, 176, 255)
HY_SILVER = (198, 208, 224, 255)


def hy_hair(f, hc, P):
    f.ell([hc[0] - 7, hc[1] - 9, hc[0] + 6, hc[1] - 1], (40, 34, 48, 255))
    f.poly([(hc[0] - 2, hc[1] - 9), (hc[0] + 1, hc[1] - 16), (hc[0] + 4, hc[1] - 9)], (40, 34, 48, 255))
    f.rect([hc[0] - 6, hc[1] - 6, hc[0] + 6, hc[1] - 5], HY_SILVER)


def hy_pre(f, P, hip, neck, hc):
    # quiver on back
    f.limb((neck[0] - 5, neck[1] + 6), (neck[0] - 9, neck[1] + 16), 5, (92, 62, 40, 255))
    for dx in (-9, -7, -5):
        f.limb((neck[0] + dx, neck[1] + 4), (neck[0] + dx + 1, neck[1] + 1), 1, HY_SILVER)


def hy_bow(f, P, hip, neck, hc):
    a = P.get("bowA")
    if a is None:
        return
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    R = 14
    # bow arc perpendicular-ish to aim
    bbox = [hx - R, hy - R, hx + R, hy + R]
    base = math.degrees(a)
    f.d.arc(bbox, base - 64, base + 64, fill=GOLD, width=3)
    # string
    p1 = (hx + math.cos(a - 1.1) * R, hy + math.sin(a - 1.1) * R)
    p2 = (hx + math.cos(a + 1.1) * R, hy + math.sin(a + 1.1) * R)
    pull = P.get("pull", 0)
    mid = (hx - math.cos(a) * pull, hy - math.sin(a) * pull)
    f.d.line([p1, mid], fill=HY_SILVER, width=1)
    f.d.line([mid, p2], fill=HY_SILVER, width=1)
    if P.get("arrow"):
        f.limb((mid[0], mid[1]), (mid[0] + math.cos(a) * 15, mid[1] + math.sin(a) * 15), 2, HY_SILVER)


HOUYI_SKIN = {
    "skin": (232, 188, 146, 255), "pants": (52, 62, 92, 255), "boot": (36, 30, 40, 255),
    "torso": HY_BLUE, "chest": (58, 84, 140, 255), "belt": GOLD_D,
    "hair": hy_hair, "pre": hy_pre, "post": hy_bow,
    "legW": 4, "armW": 4, "torsoW": 8, "headR": 6,
}

# ---------------------------------------------------------------- angela skin

AG_PURPLE = (134, 74, 172, 255)
AG_FIRE = (255, 132, 40, 255)


def ag_hair(f, hc, P):
    # twin tails
    f.ell([hc[0] - 8, hc[1] - 9, hc[0] + 8, hc[1]], (226, 176, 78, 255))
    t = P.get("t", 0)
    for s in (-1, 1):
        f.limb((hc[0] + s * 7, hc[1] - 2), (hc[0] + s * 11, hc[1] + 8 + math.sin(t + s) * 1.5), 4, (226, 176, 78, 255))


def ag_pre(f, P, hip, neck, hc):
    # robe skirt (triangle)
    f.poly([(hip[0] - 2, hip[1] - 6), (hip[0] + 2, hip[1] - 6),
            (hip[0] + 9, hip[1] + 12), (hip[0] - 9, hip[1] + 12)], AG_PURPLE)


def ag_staff(f, P, hip, neck, hc):
    a = P.get("staffA")
    if a is None:
        return
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    x2, y2 = hx + math.cos(a) * 20, hy - math.sin(a) * 20
    f.limb((hx - math.cos(a) * 8, hy + math.sin(a) * 8), (x2, y2), 3, (98, 60, 44, 255))
    f.ell([x2 - 4, y2 - 4, x2 + 4, y2 + 4], AG_FIRE)
    f.ell([x2 - 2, y2 - 2, x2 + 2, y2 + 2], (255, 224, 120, 255))
    if P.get("cast"):
        for k in range(3):
            ang = P.get("t", 0) * 2 + k * 2.1
            f.ell([x2 + math.cos(ang) * 7 - 1, y2 + math.sin(ang) * 7 - 1,
                   x2 + math.cos(ang) * 7 + 1, y2 + math.sin(ang) * 7 + 1], AG_FIRE)


ANGELA_SKIN = {
    "skin": (240, 200, 160, 255), "pants": (108, 56, 140, 255), "boot": (60, 34, 76, 255),
    "torso": AG_PURPLE, "chest": None, "belt": GOLD,
    "hair": ag_hair, "pre": ag_pre, "post": ag_staff,
    "legW": 4, "armW": 3, "torsoW": 7, "headR": 7,
}

# ---------------------------------------------------------------- pose tables


def lerp(a, b, t):
    return a + (b - a) * t


def poses_common(char):
    """generic anims; weapon params injected per char via wrap()"""
    idle_hold = {"wukong": {"staffA": 1.35, "staffL": 26, "staffBack": .62, "lH": (5, -26)},
                 "houyi": {"bowA": -0.06, "pull": 0, "lH": (7, -30)},
                 "angela": {"staffA": 1.2, "lH": (5, -27)}}[char]

    def wrap(p, i=0):
        q = dict(idle_hold)
        q.update(p)
        q["t"] = i * .8
        return q

    A = {}
    # idle 6: breathing bob
    A["Idle"] = [wrap({"hipY": -34 + (0 if i % 3 else 1), "rH": (9, -29 + (i % 2)),
                       "lF": (-6, 0), "rF": (7, 0), "capeFlow": 1 + (i % 3)}, i) for i in range(6)]
    # run 8
    run = []
    for i in range(8):
        ph = i / 8 * 2 * math.pi
        run.append(wrap({
            "hipY": -33 - abs(math.sin(ph)) * 2, "lean": .30,
            "lF": (math.sin(ph) * 10, min(0, -math.cos(ph) * 4)),
            "rF": (math.sin(ph + math.pi) * 10, min(0, -math.cos(ph + math.pi) * 4)),
            "lH": (idle_hold.get("lH", (5, -26))[0] + math.sin(ph + math.pi) * 3, -27),
            "rH": (9 + math.sin(ph) * 5, -28),
            "capeFlow": 4,
        }, i))
    A["Run"] = run
    A["Jump"] = [wrap({"hipY": -38, "lean": -.1, "lF": (-4, -7), "rF": (7, -3), "capeFlow": 3}, i) for i in range(2)]
    A["Fall"] = [wrap({"hipY": -36, "lean": .12, "lF": (-5, -2), "rF": (6, -5), "capeFlow": 5}, i) for i in range(2)]
    A["TakeHit"] = [wrap({"hipY": -32 + i, "lean": -.34 - i * .06, "headDx": -2,
                          "lF": (-8, 0), "rF": (5, 0), "lH": (-9, -30 + i), "rH": (11, -26)}, i) for i in range(4)]
    death = []
    for i in range(7):
        t = i / 6
        death.append(wrap({
            "hipY": lerp(-32, -6, t), "lean": lerp(-.4, -1.5, t),
            "lF": (lerp(-8, -20, t), 0), "rF": (lerp(5, -8, t), 0),
            "lH": (lerp(-8, -26, t), lerp(-28, -4, t)), "rH": (lerp(10, -14, t), lerp(-26, -2, t)),
            "headDy": lerp(0, 2, t), "capeFlow": 0, "staffA": None, "bowA": None,
        }, i))
    A["Death"] = death
    return A, wrap


def bake_wukong():
    A, wrap = poses_common("wukong")
    # Attack1: 抡棒横扫 (6f) — windup 0-3, impact 4 (white crescent), recover 5
    atk1 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            p = wrap({"hipY": -34, "lean": lerp(-.15, .1, t),
                      "lF": (-7, 0), "rF": (8, 0),
                      "lH": (lerp(-2, 2, t), lerp(-36, -30, t)),
                      "staffA": lerp(2.4, 1.9, t), "staffL": 27, "staffBack": .3}, i)
        elif i == 4:
            p = wrap({"hipY": -33, "lean": .34, "lF": (-9, 0), "rF": (10, 0),
                      "lH": (10, -28), "staffA": .04, "staffL": 30, "staffBack": .18, "smear": "h"}, i)
        else:
            p = wrap({"hipY": -34, "lean": .2, "lF": (-8, 0), "rF": (9, 0),
                      "lH": (8, -26), "staffA": -.3, "staffL": 27, "staffBack": .25}, i)
        atk1.append(p)
    # Attack2: 举火烧天劈砸 (6f) — impact 4 vertical crescent
    atk2 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            p = wrap({"hipY": -35, "lean": lerp(-.2, -.05, t), "lF": (-6, 0), "rF": (8, 0),
                      "lH": (lerp(0, 3, t), lerp(-34, -44, t)),
                      "staffA": lerp(1.9, 1.5, t), "staffL": 28, "staffBack": .2}, i)
        elif i == 4:
            p = wrap({"hipY": -31, "lean": .42, "lF": (-8, 0), "rF": (11, 0),
                      "lH": (9, -20), "staffA": -.9, "staffL": 30, "staffBack": .15, "smear": "v"}, i)
        else:
            p = wrap({"hipY": -32, "lean": .3, "lF": (-8, 0), "rF": (10, 0),
                      "lH": (8, -18), "staffA": -1.0, "staffL": 28, "staffBack": .2}, i)
        atk2.append(p)
    # Attack3: 如意伸长突刺 (7f) — staff stretches to huge length
    atk3 = []
    for i in range(7):
        if i <= 2:
            t = i / 2
            p = wrap({"hipY": -34, "lean": lerp(-.1, .05, t), "lF": (-7, 0), "rF": (8, 0),
                      "lH": (lerp(2, -2, t), -30), "staffA": lerp(1.7, .0, t), "staffL": 24, "staffBack": .5}, i)
        elif i in (3, 4):
            L = 46 if i == 3 else 58
            p = wrap({"hipY": -33, "lean": .38, "lF": (-10, 0), "rF": (12, 0),
                      "lH": (12, -30), "staffA": 0.0, "staffL": L, "staffBack": .06}, i)
        else:
            p = wrap({"hipY": -34, "lean": .18, "lF": (-8, 0), "rF": (9, 0),
                      "lH": (6, -29), "staffA": 0.0, "staffL": 30 - (i - 5) * 6, "staffBack": .2}, i)
        atk3.append(p)
    A["Attack1"], A["Attack2"], A["Attack3"] = atk1, atk2, atk3
    return A, WUKONG_SKIN


def bake_houyi():
    A, wrap = poses_common("houyi")
    # Attack1: 拉弓速射 6f — draw 0-3 (pull grows), release 4 (arrow gone, string snap), recover 5
    atk1 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            atk1.append(wrap({"hipY": -34, "lean": .1, "lF": (-8, 0), "rF": (8, 0),
                              "lH": (11, -32), "rH": (lerp(8, -2, t), -32), "rE": (2, -34),
                              "bowA": 0.0, "pull": lerp(1, 8, t), "arrow": True}, i))
        elif i == 4:
            atk1.append(wrap({"hipY": -34, "lean": .16, "lF": (-8, 0), "rF": (8, 0),
                              "lH": (12, -32), "rH": (2, -33), "bowA": 0.0, "pull": 0}, i))
        else:
            atk1.append(wrap({"hipY": -34, "lean": .08, "lF": (-7, 0), "rF": (8, 0),
                              "lH": (10, -31), "bowA": .1, "pull": 0}, i))
    # Attack2: 弓身横扫(近身) 5f — impact 3 white crescent
    atk2 = []
    for i in range(5):
        if i <= 2:
            t = i / 2
            atk2.append(wrap({"hipY": -34, "lean": lerp(-.15, .05, t), "lF": (-7, 0), "rF": (8, 0),
                              "lH": (lerp(-4, 0, t), -34), "bowA": lerp(1.8, 1.2, t)}, i))
        elif i == 3:
            atk2.append(wrap({"hipY": -33, "lean": .3, "lF": (-9, 0), "rF": (10, 0),
                              "lH": (10, -28), "bowA": -.2, "smear": "h"}, i))
        else:
            atk2.append(wrap({"hipY": -34, "lean": .18, "lF": (-8, 0), "rF": (9, 0),
                              "lH": (8, -27), "bowA": -.4}, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A, HOUYI_SKIN


def bake_angela():
    A, wrap = poses_common("angela")
    # Attack1: 法杖敲击 5f — impact 3
    atk1 = []
    for i in range(5):
        if i <= 2:
            t = i / 2
            atk1.append(wrap({"hipY": -34, "lean": lerp(-.1, .05, t), "lF": (-6, 0), "rF": (7, 0),
                              "lH": (lerp(1, 3, t), lerp(-30, -38, t)), "staffA": lerp(1.6, 1.1, t)}, i))
        elif i == 3:
            atk1.append(wrap({"hipY": -33, "lean": .3, "lF": (-8, 0), "rF": (9, 0),
                              "lH": (10, -26), "staffA": -.5, "smear": "v"}, i))
        else:
            atk1.append(wrap({"hipY": -34, "lean": .2, "lF": (-7, 0), "rF": (8, 0),
                              "lH": (8, -25), "staffA": -.7}, i))
    # Attack2: 火球咏唱 6f — orb charges, cast forward on 4
    atk2 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            atk2.append(wrap({"hipY": -34 - t, "lean": -.08, "lF": (-6, 0), "rF": (7, 0),
                              "lH": (lerp(3, 6, t), -32), "staffA": lerp(1.3, .5, t), "cast": True}, i))
        elif i == 4:
            atk2.append(wrap({"hipY": -33, "lean": .28, "lF": (-8, 0), "rF": (10, 0),
                              "lH": (11, -30), "staffA": .05, "cast": True}, i))
        else:
            atk2.append(wrap({"hipY": -34, "lean": .15, "lF": (-7, 0), "rF": (8, 0),
                              "lH": (9, -29), "staffA": .2}, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A, ANGELA_SKIN


# ---------------------------------------------------------------- rendering


def render_frame(pose, skin):
    f = Frame()
    draw_humanoid(f, pose, skin)
    # smear AFTER body so crescent sits on top (engine extracts + re-tints it)
    sm = pose.get("smear")
    if sm == "h":
        f.arc_smear((CX + 16, FEET_Y - 30), 26, -1.25, 1.05, w=8)
        f.arc_smear((CX + 16, FEET_Y - 30), 20, -1.0, .85, w=4)
    elif sm == "v":
        f.arc_smear((CX + 14, FEET_Y - 26), 27, -2.3, -.45, w=8)
        f.arc_smear((CX + 14, FEET_Y - 26), 21, -2.1, -.6, w=4)
    f.outline_pass()
    return f.im


def bake_char(name, builder):
    A, skin = builder()
    os.makedirs(f"{OUT}\\{name}", exist_ok=True)
    stats = {}
    for aname, frames in A.items():
        sheet = Image.new("RGBA", (FW * len(frames), FW), (0, 0, 0, 0))
        for i, p in enumerate(frames):
            sheet.paste(render_frame(p, skin), (i * FW, 0))
        path = f"{OUT}\\{name}\\{aname}.png"
        sheet.save(path)
        stats[aname] = len(frames)
    return stats


# ---------------------------------------------------------------- QA


def qa_char(name, anims):
    """heuristics: char height, motion, whiteness on smear frames"""
    print(f"\n== QA {name} ==")
    ok = True
    for aname in anims:
        im = Image.open(f"{OUT}\\{name}\\{aname}.png")
        n = im.width // FW
        hs, diffs, whites = [], [], []
        prev = None
        for i in range(n):
            fr = im.crop((i * FW, 0, (i + 1) * FW, FW))
            a = fr.getchannel("A")
            bbox = a.getbbox()
            if bbox:
                hs.append(bbox[3] - bbox[1])
            px = list(fr.getdata())
            whites.append(sum(1 for p in px if p[0] >= 246 and p[1] >= 246 and p[2] >= 246 and p[3] > 200))
            cur = a.tobytes()
            if prev is not None:
                diffs.append(sum(1 for x, y in zip(cur, prev) if (x > 120) != (y > 120)))
            prev = cur
        hmin, hmax = min(hs), max(hs)
        moving = (min(diffs) if diffs else 1) > 6 or len(set(diffs)) > 1
        cap = 104 if aname.startswith("Attack") else 92
        print(f"  {aname:8s} frames={n} charH={hmin}-{hmax} maxWhite={max(whites)} motion={'yes' if moving else 'NO'}")
        if not (30 <= hmax <= cap):
            ok = False
            print(f"    !! height out of range")
    return ok


def ascii_preview(name, aname, idx, size=40):
    im = Image.open(f"{OUT}\\{name}\\{aname}.png")
    fr = im.crop((idx * FW, 0, (idx + 1) * FW, FW)).resize((size, size // 2))
    px = fr.load()
    rows = []
    for y in range(size // 2):
        row = ""
        for x in range(size):
            p = px[x, y]
            if p[3] < 40:
                row += " "
            elif p[0] >= 246 and p[1] >= 246 and p[2] >= 246:
                row += "*"   # smear
            elif p[3] > 40 and max(p[0], p[1], p[2]) < 60:
                row += "#"   # outline
            else:
                row += "o"
        rows.append(row)
    print(f"\n--- {name}/{aname}[{idx}] ---")
    for r in rows:
        print(r)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "wukong"
    builders = {"wukong": bake_wukong, "houyi": bake_houyi, "angela": bake_angela}
    if which == "all":
        for nm, b in builders.items():
            st = bake_char(nm, b)
            print(nm, st)
            qa_char(nm, st.keys())
    else:
        st = bake_char(which, builders[which])
        print(which, st)
        qa_char(which, st.keys())
        ascii_preview(which, "Idle", 0)
        ascii_preview(which, "Attack1", 4 if which == "wukong" else 3)
        ascii_preview(which, "Attack3" if which == "wukong" else "Attack2", 4 if which == "wukong" else 3)
