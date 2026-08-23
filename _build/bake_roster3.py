# -*- coding: utf-8 -*-
"""Roster baker v3 —— 校园电力风双角色: 电脑博士 doctor / 肉盾 tank.

复用 bake_roster2 的整套管线(三色调 limb/ell/poly 上色、pose 表、smear、
outline、320x344 立绘 + 84x84 HUD 头像), 只新增两套 skin(调色板 + 头/躯干/
武器画笔) 与两套攻击 pose, 因此与既有七人是同一手绘质感、同一帧规格。

配色对齐 artlib「电力·蓝金」体系(见 artlib/bake_uilib.py):
  doctor  白大褂 x 电力蓝衬衫 x 金框护目镜 x 青蓝屏光
  tank    安全帽黄 x 绝缘橙工装 x 钢灰防爆盾 x 蓝金盾徽

输出: assets/img/{doctor,tank}/*.png (192px 帧)
      assets/img/portraits/{doctor,tank}-{sel,hud}.png

用法: python _build/bake_roster3.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bake_roster2 as R  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R.OUT = os.path.join(REPO, "assets", "img")

CX, FEET_Y = R.CX, R.FEET_Y
tone, tri, lerp = R.tone, R.tri, R.lerp


def plate(f, c, ang, length, thick, col):
    """以 c 为中心, 沿 ang 长 length、厚 thick 的实心板(三色调) —— 盾面/机身/屏幕共用"""
    ux, uy = math.cos(ang), -math.sin(ang)
    px_, py_ = math.cos(ang + math.pi / 2), -math.sin(ang + math.pi / 2)
    hl, ht = length / 2, thick / 2
    f.poly([(c[0] + ux * hl + px_ * ht, c[1] + uy * hl + py_ * ht),
            (c[0] + ux * hl - px_ * ht, c[1] + uy * hl - py_ * ht),
            (c[0] - ux * hl - px_ * ht, c[1] - uy * hl - py_ * ht),
            (c[0] - ux * hl + px_ * ht, c[1] - uy * hl + py_ * ht)], col)

DR = {  # 电脑博士: 白大褂 + 电力蓝 + 金框镜 + 屏光青
    "skin": (242, 208, 172, 255),
    "hair": (48, 44, 60, 255), "hairD": (30, 28, 42, 255),
    "coat": (238, 244, 250, 255), "coatD": (186, 200, 216, 255),
    "shirt": (42, 102, 168, 255), "shirtD": (26, 58, 100, 255),
    "gold": (240, 200, 60, 255), "goldL": (255, 230, 120, 255),
    "lens": (126, 211, 255, 255), "screen": (80, 190, 250, 255),
    "metal": (162, 176, 192, 255), "metalD": (92, 104, 122, 255),
    "pants": (46, 60, 88, 255), "boot": (32, 38, 54, 255),
    "red": (220, 60, 60, 255),
}
TK = {  # 肉盾: 安全帽黄 + 绝缘橙工装 + 钢灰防爆盾
    "skin": (232, 190, 150, 255),
    "hat": (245, 204, 54, 255), "hatD": (188, 148, 24, 255),
    "suit": (222, 96, 44, 255), "suitD": (158, 58, 26, 255),
    "steel": (176, 190, 206, 255), "steelD": (104, 120, 140, 255),
    "blue": (42, 102, 168, 255), "blueL": (80, 160, 220, 255),
    "gold": (240, 200, 60, 255),
    "tape": (232, 240, 248, 255),   # 工装反光条
    "strap": (58, 50, 46, 255),
    "boot": (52, 44, 40, 255),
}


# ---------------- 电脑博士 doctor ----------------
def dr_head(f, c, s=1.0, look=0):
    """乱翘短发 + 金框护目镜(青蓝反光) + 短须"""
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], DR["skin"])
    f.ell([x - r * 1.05, y - r * 1.22, x + r * 1.0, y - r * .12], DR["hair"])          # 发盖
    f.poly([(x - r * .25, y - r * 1.1), (x - r * .95, y - r * 1.95),
            (x + r * .2, y - r * 1.3)], DR["hairD"])                                   # 呆毛
    f.ell([x - r * 1.22, y - r * .3, x - r * .55, y + r * .45], DR["hairD"])           # 鬓角
    # 金框护目镜: 横梁 + 双镜片(前片带高光)
    gy = y - r * .02
    f.d.line([(x - r * 1.0, gy - r * .22), (x + r * 1.1 + look, gy - r * .26)],
             fill=DR["gold"], width=max(1, int(s)))
    for lx in (x - r * .78, x + r * .12 + look):
        f.rect([lx, gy - r * .16, lx + r * .62, gy + r * .36], DR["lens"])
        f.d.line([(lx, gy + r * .36), (lx + r * .62, gy + r * .36)], fill=DR["gold"], width=max(1, int(s)))
    f.px(x + r * .3 + look, gy + r * .02, (255, 255, 255, 255))                        # 镜面反光
    f.d.line([(x + r * .1 + look, y + r * .62), (x + r * .7 + look, y + r * .58)],
             fill=(150, 104, 78, 255), width=1)                                        # 嘴
    f.px(x + r * .35 + look, y + r * .82, DR["hairD"])                                 # 下巴短须


def dr_torso(f, hip, neck, ph=0):
    """白大褂罩电力蓝衬衫: 前襟 + 蓝领 + 口袋笔 + 下摆随步幅摆"""
    f.limb(hip, neck, 10, DR["coat"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    f.d.line([(neck[0], neck[1] + 2), (hip[0], hip[1] - 2)], fill=DR["coatD"], width=1)   # 前襟缝
    f.poly([(neck[0] - 4, neck[1] + 1), (neck[0] + 4, neck[1] + 1),
            (neck[0], neck[1] + 8)], DR["shirt"])                                        # V 领衬衫
    f.rect([mx - 4, my + 2, mx - 1, my + 6], DR["coatD"])                                # 胸袋
    f.px(mx - 3, my + 1, DR["gold"]); f.px(mx - 2, my + 1, DR["red"])                    # 口袋双笔
    sw = math.sin(ph) * 3                                                                # 下摆
    f.poly([(hip[0] - 5, hip[1] - 4), (hip[0] + 5, hip[1] - 4),
            (hip[0] + 8 + sw, hip[1] + 9), (hip[0] - 8 + sw * .5, hip[1] + 9)], DR["coat"])
    f.d.line([(hip[0] - 7 + sw * .5, hip[1] + 8), (hip[0] + 7 + sw, hip[1] + 8)],
             fill=DR["coatD"], width=2)
    f.rect([hip[0] - 5, hip[1] - 3, hip[0] + 5, hip[1] - 1], DR["shirtD"])               # 腰带


def dr_laptop(f, P):
    """前手笔电(lapA = 机身朝向, 屏幕相对机身固定张开) + 后手激光笔 + 施法全息板"""
    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    a = P.get("lapA", .55)
    bc = (hx + math.cos(a) * 8, hy - math.sin(a) * 8)                      # 机身中心
    plate(f, bc, a, 17, 4, DR["metal"])                                    # 键盘面
    f.d.line([(bc[0] - math.cos(a) * 6, bc[1] + math.sin(a) * 6),
              (bc[0] + math.cos(a) * 6, bc[1] - math.sin(a) * 6)],
             fill=DR["metalD"], width=1)                                   # 键区刻线
    hinge = (hx + math.cos(a) * 16, hy - math.sin(a) * 16)
    sa = a + 1.30
    sc = (hinge[0] + math.cos(sa) * 7, hinge[1] - math.sin(sa) * 7)        # 屏幕中心
    plate(f, sc, sa, 15, 5, DR["metalD"])                                  # 屏壳
    plate(f, sc, sa, 11, 3, DR["screen"])                                  # 屏光
    f.px(sc[0], sc[1], DR["lens"])
    if P.get("holo"):
        # 施法: 屏前三条青蓝全息代码条
        for k in range(3):
            ox = bc[0] + math.cos(a) * (10 + k * 5)
            oy = bc[1] - math.sin(a) * (10 + k * 5) - 5 + k * 4
            f.d.line([(ox, oy), (ox + 8 - k * 2, oy)],
                     fill=DR["lens"] if k % 2 else DR["screen"], width=1)
    rx, ry = CX + P["rH"][0], FEET_Y + P["rH"][1]                          # 后手激光笔
    f.limb((rx - 2, ry + 2), (rx + 4, ry - 4), 2, DR["metalD"])
    f.px(rx + 4, ry - 4, DR["red"])


# ---------------- 肉盾 tank ----------------
def tk_head(f, c, s=1.0, look=0):
    """安全帽 + 帽檐阴影 + 咬牙硬汉相 + 下颌绑带"""
    x, y = c
    r = 7.5 * s
    f.ell([x - r, y - r, x + r, y + r], TK["skin"])
    f.ell([x - r * 1.08, y - r * 1.48, x + r * 1.08, y - r * .22], TK["hat"])           # 帽体
    f.rect([x - r * .18, y - r * 1.5, x + r * .18, y - r * .5], TK["hatD"])             # 帽脊
    f.poly([(x - r * 1.34, y - r * .48), (x + r * 1.5 + look, y - r * .54),
            (x + r * 1.3 + look, y - r * .12), (x - r * 1.18, y - r * .06)], TK["hatD"])  # 帽檐
    f.rect([x - r * .92, y - r * .06, x + r * 1.02 + look, y + r * .1],
           tone(TK["skin"], .68))                                                       # 檐下阴影
    ex = x + r * .28 + look
    f.rect([ex - 1.4 * s, y + r * .1, ex + 1.4 * s, y + r * .34], (250, 250, 252, 255))  # 眼白
    f.px(ex + .5 * s, y + r * .2, (36, 30, 34, 255))
    f.d.line([(x - r * .55, y + r * .04), (ex + 1.8 * s, y + r * .02)],
             fill=(84, 58, 44, 255), width=max(1, int(s)))                              # 粗眉
    f.d.line([(x + r * .05 + look, y + r * .66), (x + r * .78 + look, y + r * .62)],
             fill=(132, 78, 62, 255), width=max(1, int(s)))                             # 咬牙
    f.d.line([(x - r * .95, y - r * .02), (x - r * .42, y + r * .88)],
             fill=TK["strap"], width=max(1, int(s)))                                    # 下颌绑带


def tk_torso(f, hip, neck, ph=0):
    """厚实绝缘橙工装: 双反光条 + 钢灰护肩 + 金扣宽腰带"""
    f.limb(hip, neck, 15, TK["suit"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    for dy in (-3, 1):                                                                   # 反光条
        f.d.line([(mx - 7, my + dy), (mx + 7, my + dy)], fill=TK["tape"], width=1)
    f.poly([(neck[0] - 7, neck[1] + 1), (neck[0] + 7, neck[1] + 1),
            (neck[0] + 5, neck[1] + 6), (neck[0] - 5, neck[1] + 6)], TK["suitD"])        # 领口
    for sgn in (-1, 1):                                                                  # 护肩
        f.ell([neck[0] + sgn * 8 - 5, neck[1] + 1, neck[0] + sgn * 8 + 5, neck[1] + 8],
              TK["steel"])
    f.rect([hip[0] - 8, hip[1] - 4, hip[0] + 8, hip[1] + 1], TK["suitD"])                # 腰带
    f.rect([hip[0] - 2, hip[1] - 4, hip[0] + 2, hip[1] + 1], TK["gold"], lit=True)       # 金扣


def rot(pts, ang, c):
    """局部点集绕原点旋转 ang(屏幕系, y 向下) 后平移到 c"""
    ca, sa = math.cos(ang), math.sin(ang)
    return [(c[0] + x * ca - y * sa, c[1] + x * sa + y * ca) for x, y in pts]


def tk_gear(f, P):
    """后手绝缘扳手(wrA) 先画 -> 前手防爆盾压在最前.

    盾用 3/4 视角的鸢形轮廓(不是正对镜头的薄边), 否则侧视图里只剩一条竖线,
    读不出"盾"。shA = 盾体前倾角, shD = 盾心相对手心的前伸量, shH = 盾高。
    """
    wa = P.get("wrA", -1.45)
    rx, ry = CX + P["rH"][0], FEET_Y + P["rH"][1]
    wx, wy = rx + math.cos(wa) * 14, ry - math.sin(wa) * 14
    f.limb((rx, ry), (wx, wy), 4, TK["blue"])                                # 绝缘握柄
    f.d.line([(rx, ry), (wx, wy)], fill=TK["blueL"], width=1)
    f.ell([wx - 3.5, wy - 3.5, wx + 3.5, wy + 3.5], TK["steel"])             # 扳手开口头
    f.px(wx + math.cos(wa) * 2, wy - math.sin(wa) * 2, TK["steelD"])

    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    tilt = P.get("shA", .0)
    H = P.get("shH", 28)
    D = P.get("shD", 6)
    k = H / 28.0
    c = (hx + math.cos(tilt) * D, hy + math.sin(tilt) * D)
    face = [(-7, -13), (7, -13), (8, -2), (6, 9), (0, 15), (-6, 9), (-8, -2)]
    pts = rot([(x * k, y * k) for x, y in face], tilt, c)
    f.poly(pts, TK["steel"])
    for i in range(len(pts)):                                                # 深色包边
        f.d.line([pts[i], pts[(i + 1) % len(pts)]], fill=TK["steelD"], width=1)
    band = [(-3, -11), (3, -11), (3, 9), (0, 12), (-3, 9)]
    f.poly(rot([(x * k, y * k) for x, y in band], tilt, c), TK["blue"])      # 蓝带
    br = 3.2 * k
    f.ell([c[0] - br, c[1] - br, c[0] + br, c[1] + br], TK["gold"])          # 金盾徽
    f.px(c[0], c[1], TK["blueL"])
    for p in rot([(x * k, y * k) for x, y in ((-5.5, -10), (5.5, -10), (-4.5, 7), (4.5, 7))], tilt, c):
        f.px(p[0], p[1], TK["gold"])                                         # 铆钉


# ---------------- 注册进 bake_roster2 的管线 ----------------
R.SKINS["doctor"] = {
    "pal": DR, "head": dr_head, "torso": dr_torso, "weapon": dr_laptop, "extras": None,
    "skinC": DR["skin"], "pantsC": DR["pants"], "bootC": DR["boot"], "legW": 5, "armW": 4,
}
R.SKINS["tank"] = {
    "pal": TK, "head": tk_head, "torso": tk_torso, "weapon": tk_gear, "extras": None,
    "skinC": TK["skin"], "pantsC": TK["suitD"], "bootC": TK["boot"], "legW": 7, "armW": 6,
}

HOLDS = {
    "doctor": {"lapA": .55, "holo": 0, "lH": (7, -33), "rH": (10, -31)},
    "tank": {"shA": .0, "shD": 7, "shH": 28, "wrA": -1.45, "lH": (11, -34), "rH": (5, -30)},
}
_hold0 = R.hold


def hold(cid):
    return dict(HOLDS[cid]) if cid in HOLDS else _hold0(cid)


R.hold = hold      # wrapf/common_anims 通过模块全局取用, 覆盖即生效

_shoulders0 = R._bust_shoulders


def _bust_shoulders(f, cid, hx, neck_y):
    """立绘肩胸块(320x344, 下缘被画框裁掉) —— 两位新角色的招牌轮廓"""
    B = 344
    if cid == "doctor":
        f.poly([(hx - 116, B), (hx - 74, neck_y + 4), (hx + 74, neck_y + 4), (hx + 116, B)], DR["coat"])
        f.poly([(hx - 116, B), (hx - 90, neck_y + 52), (hx - 28, B)], DR["coatD"])           # 大褂垂影
        f.poly([(hx - 38, neck_y + 6), (hx + 38, neck_y + 6), (hx, neck_y + 96)], DR["shirt"])  # 蓝衬衫 V 领
        f.poly([(hx - 8, neck_y + 40), (hx + 8, neck_y + 40), (hx + 5, B), (hx - 5, B)], DR["shirtD"])  # 领带
        f.poly([(hx - 74, neck_y + 4), (hx - 24, neck_y + 10), (hx - 52, B)], DR["coat"])    # 左翻领
        f.poly([(hx + 74, neck_y + 4), (hx + 24, neck_y + 10), (hx + 52, B)], DR["coat"])    # 右翻领
        f.rect([hx + 46, neck_y + 96, hx + 84, neck_y + 128], DR["lens"])                    # 工牌
        f.d.line([(hx + 30, neck_y + 20), (hx + 64, neck_y + 96)], fill=DR["metalD"], width=5)  # 挂绳
        f.px(hx - 60, neck_y + 74, DR["gold"])
    elif cid == "tank":
        f.poly([(hx - 132, B), (hx - 84, neck_y + 2), (hx + 84, neck_y + 2), (hx + 132, B)], TK["suit"])
        f.poly([(hx - 132, B), (hx - 100, neck_y + 54), (hx - 34, B)], TK["suitD"])
        for yy in (neck_y + 74, neck_y + 112):                                               # 双反光条
            f.d.line([(hx - 96, yy), (hx + 96, yy)], fill=TK["tape"], width=7)
        f.poly([(hx - 46, neck_y + 2), (hx + 46, neck_y + 2), (hx + 34, neck_y + 46),
                (hx - 34, neck_y + 46)], TK["suitD"])                                        # 领口
        for sgn in (-1, 1):                                                                  # 钢护肩
            sx = hx + sgn * 100
            f.ell([sx - 44, neck_y - 8, sx + 44, neck_y + 60], TK["steel"])
            f.d.arc([sx - 36, neck_y - 2, sx + 36, neck_y + 52], 180, 360, fill=TK["steelD"], width=4)
        f.rect([hx + 84, neck_y + 30, hx + 118, B], TK["steel"])                             # 盾缘入画
        f.rect([hx + 92, neck_y + 30, hx + 100, B], TK["blue"])
    else:
        _shoulders0(f, cid, hx, neck_y)


R._bust_shoulders = _bust_shoulders


# ---------------- 攻击 pose (帧 0-3 蓄 / 4 命中 / 5 收, 对齐 seq 契约) ----------------
def doctor_anims():
    A = R.common_anims("doctor")
    atk1 = []
    for i in range(6):  # 键盘横扫: 后引笔电 -> 横抽
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": lerp(-.18, .08, t), "lF": (-7, 0), "rF": (8, 0),
                 "lH": (lerp(-2, 4, t), lerp(-38, -33, t)), "lapA": lerp(2.4, 1.7, t)}
        elif i == 4:
            p = {"hipY": -37, "lean": .34, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (12, -32), "lapA": .0, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .2, "lF": (-8, 0), "rF": (9, 0),
                 "lH": (9, -30), "lapA": -.3}
        atk1.append(R.wrapf("doctor", p, i))
    atk2 = []
    for i in range(6):  # 代码洪流: 举屏起全息 -> 推屏泄流
        if i <= 3:
            t = i / 3
            p = {"hipY": -38 - t, "lean": lerp(-.08, -.26, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(4, -3, t), lerp(-34, -43, t)), "lapA": lerp(1.2, 2.5, t), "holo": 1}
        elif i == 4:
            p = {"hipY": -36, "lean": .40, "lF": (-10, 0), "rF": (12, 0),
                 "lH": (13, -32), "lapA": .1, "holo": 1, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .22, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (10, -30), "lapA": -.2}
        atk2.append(R.wrapf("doctor", p, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A


def tank_anims():
    A = R.common_anims("tank")
    atk1 = []
    for i in range(6):  # 盾击: 侧收贴身 -> 正面直推撞出
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": lerp(-.20, .05, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(-4, 6, t), lerp(-35, -33, t)),
                 "shA": lerp(-.5, -.1, t), "shD": lerp(3, 7, t), "shH": 28}
        elif i == 4:
            p = {"hipY": -37, "lean": .30, "lF": (-11, 0), "rF": (13, 0),
                 "lH": (17, -33), "shA": .34, "shD": 12, "shH": 31, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .16, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (12, -33), "shA": .1, "shD": 7, "shH": 28}
        atk1.append(R.wrapf("tank", p, i))
    atk2 = []
    for i in range(6):  # 扳手重砸: 过顶蓄势 -> 下砸(击倒), 盾侧收护身
        if i <= 3:
            t = i / 3
            p = {"hipY": -40 - t * 1.5, "lean": lerp(-.10, -.34, t), "lF": (-8, 0), "rF": (9, 0),
                 "rH": (lerp(8, 10, t), lerp(-34, -50, t)), "wrA": lerp(.8, 1.5, t),
                 "shA": -.35, "shD": 5, "shH": 26}
        elif i == 4:
            p = {"hipY": -34, "lean": .42, "lF": (-11, 0), "rF": (12, 0),
                 "rH": (14, -32), "wrA": -.70, "shA": -.2, "shD": 5, "shH": 26, "smear": "v"}
        else:
            p = {"hipY": -37, "lean": .22, "lF": (-10, 0), "rF": (10, 0),
                 "rH": (12, -31), "wrA": -.2, "shA": -.25, "shD": 5, "shH": 26}
        atk2.append(R.wrapf("tank", p, i))
    A["Attack1"], A["Attack2"] = atk1, atk2
    return A


if __name__ == "__main__":
    os.makedirs(os.path.join(R.OUT, "portraits"), exist_ok=True)
    allok = True
    for cid, b in (("doctor", doctor_anims), ("tank", tank_anims)):
        st = R.bake(cid, b())
        print(f"== {cid}: {st}")
        allok &= R.qa(cid, st.keys())
        R.bake_bust(cid)
        print(f"  bust: {cid}-sel.png 320x344 + {cid}-hud.png 84x84")
    print("\nQA:", "ALL OK" if allok else "ISSUES — see !! lines")
