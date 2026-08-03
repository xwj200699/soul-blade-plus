# -*- coding: utf-8 -*-
"""M1.1 core patches:
  A) roster.js  — new-char fw/scale/anchor for 192px frames @ ~148px display,
                  all hitboxes rescaled to match, per-char body config
  B) fighter.js — bodyBox per-char + crouch height reduction
  C) ui.js      — title menu spacing (4 items, no overlap) + single-source HUD tag
"""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
R = r"C:\留存\Game Now\soul-blade-plus\js"


def patch(path, pairs, tag):
    p = f"{R}\\{path}"
    c = io.open(p, encoding="utf-8").read()
    miss = []
    for old, new in pairs:
        if old in c:
            c = c.replace(old, new, 1)
        else:
            miss.append(old[:60])
    io.open(p, "w", encoding="utf-8").write(c)
    status = "OK" if not miss else "MISS: " + " | ".join(miss)
    print(f"{tag}: {status}")
    return not miss


ok = True

# ---------- A) roster.js ----------
ok &= patch("roster.js", [
    # wukong header
    ("dir: 'assets/img/wukong', fw: 128, native: 1, scale: 2.9,\n  anchor: { x: 64, y: 100 },",
     "dir: 'assets/img/wukong', fw: 192, native: 1, scale: 1.78, // M1.1: 屏显~148px 对齐原三人\n  anchor: { x: 70, y: 150 },\n  body: { w: 30, h: 148, crouchH: 96 },"),
    # wukong boxes
    ("dmg: 6, chip: 0, guardDmg: 11, box: { x1: 14, x2: 190, y1: -160, y2: -48 },",
     "dmg: 6, chip: 0, guardDmg: 11, box: { x1: 12, x2: 138, y1: -150, y2: -44 }, // M1.1 同步缩放"),
    ("dmg: 7, chip: 0, guardDmg: 12, box: { x1: 12, x2: 178, y1: -196, y2: -40 },",
     "dmg: 7, chip: 0, guardDmg: 12, box: { x1: 10, x2: 132, y1: -158, y2: -36 },"),
    ("dmg: 12, chip: 2, guardDmg: 26, box: { x1: 10, x2: 186, y1: -200, y2: -36 },",
     "dmg: 12, chip: 2, guardDmg: 26, box: { x1: 10, x2: 140, y1: -162, y2: -34 },"),
    ("dmg: 7, chip: 0, guardDmg: 10, box: { x1: 8, x2: 160, y1: -150, y2: -26 },",
     "dmg: 7, chip: 0, guardDmg: 10, box: { x1: 8, x2: 116, y1: -138, y2: -24 },"),
    ("fx: { x: 190, y: -96, r: 46, ry: 0.24, a0: 0.5, a1: -0.5, w: 9, life: 10, color: '#fff2d8', color2: '#e8b22a' },\n      dmg: 11, chip: 3, guardDmg: 24, box: { x1: 36, x2: 330, y1: -140, y2: -60 },",
     "fx: { x: 135, y: -88, r: 40, ry: 0.24, a0: 0.5, a1: -0.5, w: 8, life: 10, color: '#fff2d8', color2: '#e8b22a' },\n      dmg: 11, chip: 3, guardDmg: 24, box: { x1: 30, x2: 235, y1: -128, y2: -52 },"),
    ("knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,\n      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',\n      cine: { hits: 4, interval: 9, dmgPer: 6, final: 13, style: 'staff' }, // M1: 专属三段棍法",
     "knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,\n      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',\n      cine: { hits: 4, interval: 9, dmgPer: 6, final: 13, style: 'staff' }, // M1: 专属三段棍法\n      // (M1.1) box 同步缩放见下行"),
    ("kind: 'super', name: '大聖乱舞', anim: 'attack1', total: 50,\n      startup: 13, active: 10, impact: 4, finisher: 'A',\n      dmg: 5, chip: 3, guardDmg: 26, box: { x1: 10, x2: 200, y1: -180, y2: -40 },",
     "kind: 'super', name: '大聖乱舞', anim: 'attack1', total: 50,\n      startup: 13, active: 10, impact: 4, finisher: 'A',\n      dmg: 5, chip: 3, guardDmg: 26, box: { x1: 10, x2: 145, y1: -155, y2: -36 },"),
    # houyi header
    ("dir: 'assets/img/houyi', fw: 128, native: 1, scale: 2.85,\n  anchor: { x: 64, y: 100 },",
     "dir: 'assets/img/houyi', fw: 192, native: 1, scale: 1.85,\n  anchor: { x: 70, y: 150 },\n  body: { w: 30, h: 146, crouchH: 94 },"),
    ("dmg: 5, chip: 0, guardDmg: 9, box: { x1: 12, x2: 168, y1: -170, y2: -46 },",
     "dmg: 5, chip: 0, guardDmg: 9, box: { x1: 10, x2: 124, y1: -146, y2: -42 },"),
    ("dmg: 9, chip: 1, guardDmg: 18, box: { x1: 8, x2: 172, y1: -180, y2: -40 },",
     "dmg: 9, chip: 1, guardDmg: 18, box: { x1: 8, x2: 128, y1: -152, y2: -36 },"),
    ("dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 150, y1: -160, y2: -26 },",
     "dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 110, y1: -140, y2: -24 },"),
    ("projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [0], speed: 9.5,\n                    dmg: 8, chip: 2, guardDmg: 14, y: -96,",
     "projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [0], speed: 9.5,\n                    dmg: 8, chip: 2, guardDmg: 14, y: -92,"),
    ("projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [3.5], speed: 9,\n                    dmg: 7, chip: 2, guardDmg: 12, y: -70,",
     "projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [3.5], speed: 9,\n                    dmg: 7, chip: 2, guardDmg: 12, y: -66,"),
    ("kind: 'super', name: '射日・九連', anim: 'attack2', total: 48,\n      startup: 12, active: 10, impact: 3, finisher: 'B',\n      dmg: 4, chip: 3, guardDmg: 22, box: { x1: 8, x2: 190, y1: -180, y2: -40 },",
     "kind: 'super', name: '射日・九連', anim: 'attack2', total: 48,\n      startup: 12, active: 10, impact: 3, finisher: 'B',\n      dmg: 4, chip: 3, guardDmg: 22, box: { x1: 8, x2: 140, y1: -152, y2: -36 },"),
    # angela header
    ("dir: 'assets/img/angela', fw: 128, native: 1, scale: 2.85,\n  anchor: { x: 64, y: 100 },",
     "dir: 'assets/img/angela', fw: 192, native: 1, scale: 1.9,\n  anchor: { x: 70, y: 150 },\n  body: { w: 28, h: 144, crouchH: 92 },"),
    ("dmg: 5, chip: 0, guardDmg: 9, box: { x1: 12, x2: 158, y1: -176, y2: -50 },",
     "dmg: 5, chip: 0, guardDmg: 9, box: { x1: 10, x2: 118, y1: -148, y2: -44 },"),
    ("dmg: 10, chip: 2, guardDmg: 20, box: { x1: 10, x2: 164, y1: -184, y2: -44 },",
     "dmg: 10, chip: 2, guardDmg: 20, box: { x1: 10, x2: 122, y1: -154, y2: -40 },"),
    ("dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 144, y1: -156, y2: -28 },",
     "dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 106, y1: -136, y2: -26 },"),
    ("projectile: { kind: 'fireball', trail: 'rgba(255,132,40,0.75)', spread: [0], speed: 6.2,\n                    dmg: 10, chip: 3, guardDmg: 18, y: -92,",
     "projectile: { kind: 'fireball', trail: 'rgba(255,132,40,0.75)', spread: [0], speed: 6.2,\n                    dmg: 10, chip: 3, guardDmg: 18, y: -88,"),
    ("kind: 'super', name: '熾熱光輝', anim: 'attack1', total: 50,\n      startup: 14, active: 10, impact: 3, finisher: 'A',\n      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 180, y1: -180, y2: -40 },",
     "kind: 'super', name: '熾熱光輝', anim: 'attack1', total: 50,\n      startup: 14, active: 10, impact: 3, finisher: 'A',\n      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 134, y1: -152, y2: -36 },"),
    # ayame body config (kit completion block)
    ("  const c = DATA.ayame;\n  if (!c) return;\n  c.dash = c.dash || { from: 3, to: 14, vx: 9 };",
     "  const c = DATA.ayame;\n  if (!c) return;\n  c.dash = c.dash || { from: 3, to: 14, vx: 9 };\n  c.body = c.body || { w: 30, h: 150, crouchH: 100 }; // M1.1"),
], "roster.js")

# ---------- B) fighter.js bodyBox ----------
ok &= patch("fighter.js", [
    ("bodyBox() { return { x1: this.x - 30, y1: this.y - 148, x2: this.x + 30, y2: this.y }; }",
     """bodyBox() {
    // M1.1: 每角色可配 + 蹲姿降低受击高度(蹲/蹲斩期间按住下)
    const bb = this.c.body || { w: 30, h: 148, crouchH: 96 };
    const crouched = this.state === 'crouch' ||
      (this.state === 'attack' && this.grounded && this.pad && this.pad.crouch);
    const h = crouched ? (bb.crouchH || Math.round(bb.h * 0.65)) : bb.h;
    return { x1: this.x - bb.w, y1: this.y - h, x2: this.x + bb.w, y2: this.y };
  }"""),
], "fighter.js")

# ---------- C) ui.js title layout + HUD tag ----------
ok &= patch("ui.js", [
    ("      const bx = 322, by = 381 + i * 42, bw = 380, bh = 36;",
     "      const bx = 322, by = 354 + i * 40, bw = 380, bh = 36; // M1.1: 四项上移防与底部提示重叠"),
    ("      } else if (sel) {\n        ctx.fillStyle = 'rgba(255,197,49,0.14)';\n        ctx.fillRect(332, 384 + i * 42, 360, 32);",
     "      } else if (sel) {\n        ctx.fillStyle = 'rgba(255,197,49,0.14)';\n        ctx.fillRect(332, 357 + i * 40, 360, 32);"),
    ("this.pixText(ctx, 'W/S SELECT · J OK · M MUTE', 512, 520, { size: 12, align: 'center', color: '#5d6784' });",
     """const descs = ['挑战电脑 · 三局两胜', '同屏双人对决 · P1键盘左侧 P2方向键+小键盘', '木桩修行 · 无限气 · 自动回血', '完整键位与系统图鉴'];
    this.pixText(ctx, descs[G.titleSel] || '', 512, 528, { size: 10, align: 'center', color: '#9a8f78' });
    this.pixText(ctx, 'W/S SELECT · J OK · M MUTE', 512, 552, { size: 12, align: 'center', color: '#5d6784' });"""),
    ("if (G.p2IsAI) this.pixText(ctx, 'CPU', 862, 86, { size: 9, color: '#9a8f78', align: 'right' });",
     """{ // M1.1: 阵营标签单一来源 G.p2IsAI / G.mode
      const tag = G.mode === 'training' ? 'DUMMY' : (G.p2IsAI ? 'CPU' : 'P2');
      this.pixText(ctx, tag, 862, 86, { size: 9, color: tag === 'P2' ? '#7ecbff' : '#9a8f78', align: 'right' });
      this.pixText(ctx, 'P1', 162, 86, { size: 9, color: '#ffe27a' });
    }"""),
], "ui.js")

print("\nALL:", "OK" if ok else "SOME ANCHORS MISSED")
sys.exit(0 if ok else 1)
