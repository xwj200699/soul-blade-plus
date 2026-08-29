# -*- coding: utf-8 -*-
"""Roster baker v4 —— 新英雄 晓艳 / 梅晓艳 (BLOSSOM · 红梅剑舞).

完全新画的一套 192px 帧, 不复用任何现有角色的模板:
  · 专属调色板(红梅 + 破晓金 + 墨紫发)
  · 花簪双丸子头(侧插五瓣红梅) —— 与貂蝉的双环髻、安琪拉的双马尾都不同的头型
  · 交领旗袍舞衣 + 金腰封 + 开衩摆(随步幅摆动)
  · 细剑 + 红梅剑穗(前手) / 绢带流苏(后手) —— 全新武器画笔
  · 额外第三套攻击 Attack3(沉身低位突刺), 供蹲攻/冲刺斩使用

复用的只有 bake_roster2 的"骨架管线"(三色调 limb/ell/poly 上色、腿臂布局、
outline、立绘裁切), 与 doctor/tank 复用同一管线是同一个道理 —— 画笔与配色
全是新的。

输出: assets/img/xiaoyan/*.png (192px 帧)
      assets/img/portraits/xiaoyan-{sel,hud}.png
用法: python _build/bake_roster4.py
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

XY = {  # 梅晓艳: 红梅衣 + 破晓金 + 墨紫发 + 霜银剑
    "skin": (246, 212, 178, 255),
    "hair": (44, 30, 52, 255), "hairD": (28, 18, 36, 255), "hairL": (96, 62, 104, 255),
    "dress": (226, 58, 110, 255), "dressD": (152, 30, 70, 255),
    "inner": (255, 236, 242, 255),                 # 内衬/领缘(梅白)
    "gold": (255, 207, 135, 255), "goldD": (198, 142, 62, 255),
    "silver": (226, 234, 246, 255), "silverD": (140, 154, 178, 255),
    "petal": (255, 138, 172, 255), "petalL": (255, 214, 224, 255),
    "sash": (255, 176, 196, 255),                  # 绢带
    "boot": (86, 32, 56, 255),
    "lip": (214, 54, 84, 255),
    "eye": (60, 26, 44, 255),
}

def _blossom(f, x, y, r, pc, cc, gold):
    """五瓣红梅: 花瓣绕心一周 + 金花蕊(头饰/剑穗/花瓣爆共用的招牌图形)。
    半径很小时关掉三色调高光 —— F.ell 的高光子框在 <3px 的椭圆上会退化成负高度。"""
    sh = r >= 6
    for k in range(5):
        a = k * (2 * math.pi / 5) - math.pi / 2
        px_, py_ = x + math.cos(a) * r * .78, y + math.sin(a) * r * .78
        f.ell([px_ - r * .52, py_ - r * .52, px_ + r * .52, py_ + r * .52], pc, shade=sh)
    f.ell([x - r * .34, y - r * .34, x + r * .34, y + r * .34], gold, shade=sh)
    f.px(x, y, cc)


def xy_head(f, c, s=1.0, look=0):
    """花簪双丸子头: 圆脸 + 齐刘海 + 左右高丸子 + 侧插红梅 + 明亮杏眼"""
    x, y = c
    r = 7.5 * s
    # 双丸子(高位, 左右各一) —— 先画, 让发盖压在前面
    for sgn in (-1, 1):
        bx, by = x + sgn * r * .92, y - r * 1.42
        f.ell([bx - r * .58, by - r * .58, bx + r * .58, by + r * .58], XY["hair"])
        f.d.arc([bx - r * .5, by - r * .5, bx + r * .5, by + r * .5], 200, 340,
                fill=XY["hairL"], width=max(1, int(s)))                       # 丸子高光缕
    f.ell([x - r, y - r, x + r, y + r], XY["skin"])                            # 脸
    f.ell([x - r * 1.06, y - r * 1.26, x + r * 1.06, y - r * .04], XY["hair"])  # 发盖
    f.poly([(x - r * 1.02, y - r * .5), (x + r * .34 + look, y - r * .62),
            (x + r * .1 + look, y - r * .08), (x - r * .96, y - r * .06)],
           XY["hairD"])                                                        # 齐刘海(斜分)
    for sgn in (-1, 1):                                                        # 鬓发垂缕
        f.limb((x + sgn * r * 1.02, y - r * .5), (x + sgn * r * 1.14, y + r * .78),
               max(1, int(2 * s)), XY["hair"])
    _blossom(f, x - r * 1.1, y - r * 1.12, r * .5, XY["petal"], XY["petalL"], XY["gold"])  # 侧簪红梅
    # 面部: 杏眼(眼白+瞳+金瞳芒) / 细眉 / 小口
    ex = x + r * .3 + look
    f.rect([ex - 1.5 * s, y + r * .06, ex + 1.6 * s, y + r * .34], (252, 250, 252, 255))
    f.px(ex + .4 * s, y + r * .2, XY["eye"])
    f.px(ex + 1.2 * s, y + r * .12, XY["gold"])
    f.rect([x - r * .62, y + r * .1, x - r * .28, y + r * .3], (252, 250, 252, 255))
    f.px(x - r * .48, y + r * .22, XY["eye"])
    f.d.line([(x - r * .72, y - r * .04), (x - r * .2, y - r * .1)], fill=XY["hairD"], width=1)
    f.d.line([(x + r * .02 + look, y - r * .1), (ex + 1.9 * s, y - r * .16)],
             fill=XY["hairD"], width=1)
    f.d.line([(x + r * .06 + look, y + r * .66), (x + r * .56 + look, y + r * .64)],
             fill=XY["lip"], width=max(1, int(s)))
    f.px(x + r * .78 + look, y + r * .42, tone(XY["skin"], .86))               # 腮影


def xy_ribbon(f, c, t):
    """脑后双绢带: 随 t 波动的两条飘带(posthair, 画在头之后)。
    起点压到 x-1.5r 之外 —— 立绘按头半径放大到 60px 时, 起点若贴脸就会横穿面部。"""
    x, y = c
    r = 7.5
    for k, (amp, ph, col) in enumerate(((3.4, 0.0, XY["sash"]), (2.6, 1.7, XY["petalL"]))):
        pts = []
        for i in range(5):
            u = i / 4
            pts.append((x - r * 1.5 - u * r * 2.1 + math.sin(t * .5 + ph + u * 2.6) * amp * .35,
                        y + r * (.1 + k * .3) + u * r * 1.5 + math.sin(t * .6 + ph + u * 3.1) * amp))
        for i in range(len(pts) - 1):
            f.d.line([pts[i], pts[i + 1]], fill=col, width=2 if k == 0 else 1)
        f.px(pts[-1][0], pts[-1][1], XY["gold"])


def xy_torso(f, hip, neck, ph=0):
    """交领旗袍舞衣: 梅白领缘交叉 + 金腰封 + 高开衩裙摆(随步幅摆) + 胸前梅纹"""
    f.limb(hip, neck, 11, XY["dress"])
    mx, my = (hip[0] + neck[0]) / 2, (hip[1] + neck[1]) / 2
    # 交领: 两条梅白领缘斜交于胸口
    f.poly([(neck[0] - 5, neck[1] + 1), (neck[0] + 1, neck[1] + 2),
            (mx + 1, my + 3), (mx - 4, my + 2)], XY["inner"])
    f.poly([(neck[0] + 5, neck[1] + 1), (neck[0] - 1, neck[1] + 2),
            (mx - 1, my + 3), (mx + 4, my + 2)], XY["petalL"])
    f.d.line([(neck[0] - 5, neck[1] + 1), (mx + 1, my + 3)], fill=XY["dressD"], width=1)
    _blossom(f, mx + 2.5, my + 5.5, 2.4, XY["petal"], XY["inner"], XY["gold"])   # 胸前梅纹
    # 裙摆: 前后开衩两片, 随 ph 摆
    sw = math.sin(ph) * 3.4
    f.poly([(hip[0] - 5, hip[1] - 3), (hip[0] + 5, hip[1] - 3),
            (hip[0] + 9 + sw, hip[1] + 11), (hip[0] + 1 + sw * .7, hip[1] + 8)], XY["dress"])
    f.poly([(hip[0] - 5, hip[1] - 3), (hip[0] + 1, hip[1] - 3),
            (hip[0] - 1 + sw * .5, hip[1] + 8), (hip[0] - 9 + sw * .3, hip[1] + 10)], XY["dressD"])
    f.d.line([(hip[0] - 8 + sw * .3, hip[1] + 9), (hip[0] + 8 + sw, hip[1] + 10)],
             fill=XY["inner"], width=1)                                          # 摆缘梅白牙线
    # 金腰封 + 束结
    f.rect([hip[0] - 6, hip[1] - 4, hip[0] + 6, hip[1] - 0.5], XY["gold"], lit=True)
    f.px(hip[0] + 1, hip[1] - 2, XY["goldD"])
    f.d.line([(hip[0] + 5, hip[1] - 2), (hip[0] + 8 + sw * .4, hip[1] + 5)],
             fill=XY["sash"], width=2)                                           # 腰侧绢带尾


def xy_sword(f, P):
    """后手绢带流苏 -> 前手细剑(swordA 剑身角 / swordL 长) + 红梅剑穗; bloom=撒花瓣"""
    rx, ry = CX + P["rH"][0], FEET_Y + P["rH"][1]
    sa = P.get("silkA", 2.5)
    pts = [(rx, ry)]
    for i in range(1, 5):                                        # 绢带: 四节波动流苏
        u = i / 4
        pts.append((rx + math.cos(sa) * 13 * u,
                    ry - math.sin(sa) * 13 * u + math.sin(P.get("t", 0) * .7 + u * 3.2) * 3 * u))
    for i in range(len(pts) - 1):
        f.d.line([pts[i], pts[i + 1]], fill=XY["sash"] if i % 2 == 0 else XY["petalL"], width=2)
    f.px(pts[-1][0], pts[-1][1], XY["gold"])

    hx, hy = CX + P["lH"][0], FEET_Y + P["lH"][1]
    a = P.get("swordA", 1.15)
    L = P.get("swordL", 30)
    ux, uy = math.cos(a), -math.sin(a)
    tip = (hx + ux * L, hy + uy * L)
    grip = (hx - ux * 5, hy - uy * 5)
    f.limb(grip, (hx - ux * 1.5, hy - uy * 1.5), 3, XY["dressD"])                # 剑柄
    f.d.line([(hx - ux * 3.2 - uy * 3, hy - uy * 3.2 + ux * 3),
              (hx - ux * 3.2 + uy * 3, hy - uy * 3.2 - ux * 3)],
             fill=XY["gold"], width=2)                                           # 剑格
    f.limb((hx + ux * 2, hy + uy * 2), tip, 3, XY["silver"])                     # 剑脊
    f.d.line([(hx + ux * 2, hy + uy * 2), tip], fill=(255, 255, 255, 255), width=1)  # 刃锋高光
    f.px(tip[0], tip[1], XY["petalL"])
    # 剑穗: 自剑格垂下的红梅结
    tsx, tsy = hx - ux * 4, hy - uy * 4
    f.d.line([(tsx, tsy), (tsx - 1, tsy + 7)], fill=XY["petal"], width=2)
    _blossom(f, tsx - 1, tsy + 9, 2.2, XY["petal"], XY["petalL"], XY["gold"])
    if P.get("bloom"):                                                           # 挥剑撒花
        for k in range(4):
            u = .35 + k * .22
            bx = hx + ux * L * u - uy * (5 + k * 3)
            by = hy + uy * L * u + ux * (5 + k * 3)
            _blossom(f, bx, by, 2.0 + (k % 2) * .8, XY["petal"], XY["petalL"], XY["gold"])


# ---------------- 注册进 bake_roster2 的管线 ----------------
R.SKINS["xiaoyan"] = {
    "pal": XY, "head": xy_head, "torso": xy_torso, "weapon": xy_sword, "extras": None,
    "skinC": XY["skin"], "pantsC": XY["dressD"], "bootC": XY["boot"],
    "legW": 4, "armW": 4, "posthair": xy_ribbon,
}

HOLDS = {"xiaoyan": {"swordA": 1.15, "swordL": 30, "silkA": 2.5, "bloom": 0,
                     "lH": (6, -31), "rH": (9, -30)}}
_hold0 = R.hold


def hold(cid):
    return dict(HOLDS[cid]) if cid in HOLDS else _hold0(cid)


R.hold = hold      # wrapf/common_anims 通过模块全局取用, 覆盖即生效

_shoulders0 = R._bust_shoulders


def _bust_shoulders(f, cid, hx, neck_y):
    """立绘肩胸(320x344): 红梅舞衣交领 + 金腰封入画 + 肩后绢带 + 胸前梅纹"""
    if cid != "xiaoyan":
        return _shoulders0(f, cid, hx, neck_y)
    B = 344
    for sgn in (-1, 1):                                                   # 肩后绢带(先画, 被衣压住)
        f.poly([(hx + sgn * 86, neck_y + 10), (hx + sgn * 132, neck_y + 92),
                (hx + sgn * 104, B), (hx + sgn * 62, neck_y + 60)], XY["sash"])
    f.poly([(hx - 112, B), (hx - 74, neck_y + 4), (hx + 74, neck_y + 4), (hx + 112, B)], XY["dress"])
    f.poly([(hx - 112, B), (hx - 86, neck_y + 52), (hx - 26, B)], XY["dressD"])       # 衣褶垂影
    f.poly([(hx - 70, neck_y + 4), (hx + 6, neck_y + 12), (hx + 30, B), (hx - 46, B)], XY["inner"])
    f.poly([(hx + 70, neck_y + 4), (hx - 6, neck_y + 12), (hx - 30, B), (hx + 46, B)], XY["petalL"])
    f.d.line([(hx - 70, neck_y + 4), (hx + 30, B)], fill=XY["dressD"], width=4)      # 交领缝
    for sgn in (-1, 1):                                                   # 袖肩(布料梯形, 不是裸圆球)
        sx = hx + sgn * 78
        f.poly([(sx - sgn * 26, neck_y + 4), (sx + sgn * 30, neck_y + 26),
                (sx + sgn * 34, neck_y + 86), (sx - sgn * 20, neck_y + 70)], XY["dress"])
        f.poly([(sx + sgn * 30, neck_y + 26), (sx + sgn * 34, neck_y + 86),
                (sx + sgn * 16, neck_y + 78)], XY["dressD"])                          # 袖口暗面
        f.d.line([(sx - sgn * 22, neck_y + 66), (sx + sgn * 32, neck_y + 82)],
                 fill=XY["inner"], width=4)                                            # 袖缘梅白
    f.rect([hx - 96, B - 54, hx + 96, B - 18], XY["gold"], lit=True)                 # 金腰封入画
    f.rect([hx - 12, B - 54, hx + 12, B - 18], XY["goldD"])
    _blossom(f, hx + 34, neck_y + 96, 26, XY["petal"], XY["inner"], XY["gold"])       # 胸前大梅纹
    _blossom(f, hx - 62, B - 92, 17, XY["petal"], XY["inner"], XY["gold"])


R._bust_shoulders = _bust_shoulders


# ---------------- 攻击 pose (帧 0-3 蓄 / 4 命中 / 5 收, 对齐 seq 契约) ----------------
def xiaoyan_anims():
    A = R.common_anims("xiaoyan")
    # Attack1 梅斬: 反手后引 -> 斜上横扫(撒花), 收势剑尖朝前
    atk1 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            p = {"hipY": -38, "lean": lerp(-.22, .06, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(-5, 5, t), lerp(-34, -37, t)),
                 "swordA": lerp(2.55, 1.55, t), "swordL": 30, "silkA": lerp(2.9, 2.3, t)}
        elif i == 4:
            p = {"hipY": -37, "lean": .34, "lF": (-10, 0), "rF": (11, 0),
                 "lH": (14, -34), "swordA": .16, "swordL": 33, "bloom": 1,
                 "silkA": 1.9, "smear": "h"}
        else:
            p = {"hipY": -38, "lean": .2, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (11, -32), "swordA": -.12, "swordL": 30, "silkA": 2.2}
        atk1.append(R.wrapf("xiaoyan", p, i))
    # Attack2 紅梅斬: 过顶举剑 -> 竖劈落地(撒花), 裙摆随之压低
    atk2 = []
    for i in range(6):
        if i <= 3:
            t = i / 3
            p = {"hipY": -39 - t * 1.5, "lean": lerp(-.10, -.32, t), "lF": (-8, 0), "rF": (9, 0),
                 "lH": (lerp(3, 8, t), lerp(-36, -50, t)),
                 "swordA": lerp(1.1, 1.9, t), "swordL": 31, "silkA": lerp(2.6, 3.0, t)}
        elif i == 4:
            p = {"hipY": -34, "lean": .42, "lF": (-11, 0), "rF": (12, 0),
                 "lH": (15, -31), "swordA": -.72, "swordL": 34, "bloom": 1,
                 "silkA": 2.0, "smear": "v"}
        else:
            p = {"hipY": -37, "lean": .24, "lF": (-10, 0), "rF": (10, 0),
                 "lH": (12, -30), "swordA": -.28, "swordL": 31, "silkA": 2.3}
        atk2.append(R.wrapf("xiaoyan", p, i))
    # Attack3 掃梅: 沉身低架 -> 贴地长突刺 -> 收剑起身(7 帧, 命中帧 = f4)
    atk3 = []
    for i in range(7):
        if i <= 3:
            t = i / 3
            p = {"hipY": lerp(-36, -28, t), "torsoLen": lerp(17, 14, t),
                 "lean": lerp(-.16, .30, t),
                 "lF": (lerp(-8, -13, t), 0), "rF": (lerp(9, 13, t), 0),
                 "lH": (lerp(-2, 6, t), lerp(-30, -22, t)),
                 "swordA": lerp(1.5, .35, t), "swordL": 29, "silkA": 2.8}
        elif i == 4:
            p = {"hipY": -26, "torsoLen": 13, "lean": .46, "lF": (-15, 0), "rF": (16, 0),
                 "lH": (17, -20), "swordA": -.05, "swordL": 36, "bloom": 1, "silkA": 2.4}
        elif i == 5:
            p = {"hipY": -28, "torsoLen": 14, "lean": .34, "lF": (-13, 0), "rF": (13, 0),
                 "lH": (13, -22), "swordA": .1, "swordL": 32, "silkA": 2.6}
        else:
            p = {"hipY": -34, "torsoLen": 16, "lean": .16, "lF": (-9, 0), "rF": (10, 0),
                 "lH": (8, -28), "swordA": .5, "swordL": 30, "silkA": 2.7}
        atk3.append(R.wrapf("xiaoyan", p, i))
    A["Attack1"], A["Attack2"], A["Attack3"] = atk1, atk2, atk3
    return A


if __name__ == "__main__":
    os.makedirs(os.path.join(R.OUT, "portraits"), exist_ok=True)
    st = R.bake("xiaoyan", xiaoyan_anims())
    print(f"== xiaoyan: {st}")
    ok = R.qa("xiaoyan", st.keys())
    R.bake_bust("xiaoyan")
    print("  bust: xiaoyan-sel.png 320x344 + xiaoyan-hud.png 84x84")
    print("\nQA:", "ALL OK" if ok else "ISSUES — see !! lines")
