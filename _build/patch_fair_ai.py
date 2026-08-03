# -*- coding: utf-8 -*-
"""M1 fair-AI patch: remove input-reading + resource cheats, add human-like
reaction delay to the visible-startup path."""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
AI = r"C:\留存\Game Now\soul-blade-plus\js\ai.js"
DATA = r"C:\留存\Game Now\soul-blade-plus\js\data.js"

ai = io.open(AI, encoding="utf-8").read()

if "d.cheatRead" not in ai:
    print("ai.js already patched, skipping")
else:
    start = ai.index("// ---- 鬼·读指令(cheatRead)")
    end = ai.index("// enemy attack winding up close by", start)
    replacement = """// ---- M1 公平化: 读指令层已删除(原为同帧读键 + 92% 读取率 +
    // SNK式气槽回充 + 镖CD加速)。高难强度改由下方「可见前摇反应」承担:
    // 看到对手进入攻击前摇后, 经 d.reactMin~reactMax 帧的反应延迟才决策。
    // 贴身计时是合法的距离观察, 保留(不再附带资源作弊)。
    if (aiKit(this.f).projSpecial) {
      this.closeT = dist < 185 ? (this.closeT || 0) + 1 : 0;
    }

    """
    ai = ai[:start] + replacement + ai[end:]

    old_cond = "if (o.state === 'attack' && o.move && o.move.t <= o.move.def.startup + 3 && dist < 300 && f.grounded) {"
    assert old_cond in ai
    new_cond = """// M1: 人类式反应 —— 首见该次挥击时采样 reactMin~reactMax 帧延迟, 到点才允许防反
    if (o.state === 'attack' && o.move && !o.move.def.air) {
      if (this._threatMove !== o.move) {
        this._threatMove = o.move;
        this._threatT = Math.round(d.reactMin + Math.random() * (d.reactMax - d.reactMin));
      }
      if (this._threatT > 0) this._threatT--;
    } else { this._threatMove = null; }
    if (o.state === 'attack' && o.move && this._threatMove === o.move && this._threatT <= 0 &&
        o.move.t <= o.move.def.startup + o.move.def.active + 4 && dist < 300 && f.grounded) {"""
    ai = ai.replace(old_cond, new_cond, 1)

    mstart = ai.index("// ---- 鬼·读指令: 对手按键的同一 tick 就决策")
    mend = ai.index("// --- execute current plan", mstart)
    assert "cheatRead(f, o, d, dist, toward) {" in ai[mstart:mend]
    ai = ai[:mstart] + "// (M1) cheatRead 方法已整体移除 —— AI 不再读取对手输入设备状态\n\n  " + ai[mend:]

    n = ai.count("d.cheatRead")
    ai = ai.replace("d.cheatRead && o.guard > 55", "d.punishBlock && o.guard > 55")
    ai = ai.replace("aiKit(f).projSpecial && d.cheatRead &&", "aiKit(f).projSpecial && d.punishBlock &&")
    ai = ai.replace("(d.cheatRead ? 1 : 0.55)", "(d.punishBlock ? 0.85 : 0.55)")
    ai = ai.replace("(d.cheatRead ? 0.85 : 0.55)", "(d.punishBlock ? 0.8 : 0.55)")
    ai = ai.replace("(d.cheatRead ? 0.8 : 0.5)", "(d.punishBlock ? 0.75 : 0.5)")
    ai = ai.replace("if (d.cheatRead) {", "if (d.punishBlock) {")
    ai = ai.replace("!d.cheatRead", "!d.punishBlock")
    assert ai.count("d.cheatRead") == 0, "cheatRead refs remain"
    io.open(AI, "w", encoding="utf-8").write(ai)
    print(f"ai.js patched ({n} cheat refs neutralised)")

# ---- 5) data.js hard tier: honest numbers ----
d = io.open(DATA, encoding="utf-8").read()
old_hard = d[d.index("hard: {"):d.index("};", d.index("hard: {")) ]
new_hard = """hard: {
    // M1 公平化: 原"同帧读键 + 92% 读取率 + 气槽自动回充"的隐藏机制整体移除。
    // 困难 = 5-9 帧可见前摇反应 + 高纪律(确反/压起身/追击), 允许犯错,
    // 无资源作弊、无输入读取 —— "理解系统且执行稳定", 而非"知道你按了什么"。
    label: '難', en: 'HARD', desc: 'Sharp reactions, punishes mistakes',
    reactMin: 5, reactMax: 9, aggression: 0.92, blockChance: 0.85,
    dodgeChance: 0.4, comboFollow: 0.95, superUse: 0.95, jumpiness: 0.3,
    punishBlock: 1.0,   // 防住/看到收招硬直 -> 反打整套连招
    okizeme: 0.9,       // 压起身 meaty
    chase: 1.0,         // 追后撤冲刺贴上
    bait: 0,
    launcher: 0.25,     // 主动蹲重挑空起手(接浮空超必)
    superJuggle: 0.9,   // 抓浮空接超必
    pressureSuper: 0.7, // 被压制且有气 -> 无敌超必拆招
  },
"""
d = d.replace(old_hard, new_hard, 1)
assert "cheatRead:" not in d and "readP:" not in d and "meterRegen:" not in d
io.open(DATA, "w", encoding="utf-8").write(d)
print("data.js hard tier rewritten (no cheatRead/readP/meterRegen)")
print("PATCH OK")
