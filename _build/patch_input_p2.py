# -*- coding: utf-8 -*-
"""M1: player-2 keys (arrows + numpad, bracket/semicolon backup) + P2 dash taps."""
import io
import sys

sys.stdout.reconfigure(encoding="utf-8")
P = r"C:\留存\Game Now\soul-blade-plus\js\input.js"
c = io.open(P, encoding="utf-8").read()
if "humanPad2" in c:
    print("already patched")
    sys.exit()

c = c.replace(
    "const tapTimes = { KeyA: 0, KeyD: 0 };\n  const dashFlag = { left: 0, right: 0 };",
    "const tapTimes = { KeyA: 0, KeyD: 0, ArrowLeft: 0, ArrowRight: 0 }; // M1: P2 双击\n"
    "  const dashFlag = { left: 0, right: 0, left2: 0, right2: 0 };"
)
c = c.replace(
    "    'KeyM', 'KeyH', 'KeyP', 'KeyR', 'KeyT', 'Escape', 'Enter', 'Space',\n"
    "    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',",
    "    'KeyM', 'KeyH', 'KeyP', 'KeyR', 'KeyT', 'Escape', 'Enter', 'Space',\n"
    "    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',\n"
    "    'Numpad1', 'Numpad2', 'Numpad4', 'Numpad5',            // M1: P2 攻击键\n"
    "    'BracketLeft', 'BracketRight', 'Semicolon', 'Quote',   // M1: P2 无小键盘备用",
)
c = c.replace(
    "    if (e.code === 'KeyA' || e.code === 'KeyD') {\n"
    "      if (now - tapTimes[e.code] < DTAP_MS) {\n"
    "        dashFlag[e.code === 'KeyA' ? 'left' : 'right'] = now;\n"
    "      }\n"
    "      tapTimes[e.code] = now;\n"
    "    }",
    "    if (e.code === 'KeyA' || e.code === 'KeyD') {\n"
    "      if (now - tapTimes[e.code] < DTAP_MS) {\n"
    "        dashFlag[e.code === 'KeyA' ? 'left' : 'right'] = now;\n"
    "      }\n"
    "      tapTimes[e.code] = now;\n"
    "    }\n"
    "    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { // M1: P2 双击冲刺\n"
    "      if (now - tapTimes[e.code] < DTAP_MS) {\n"
    "        dashFlag[e.code === 'ArrowLeft' ? 'left2' : 'right2'] = now;\n"
    "      }\n"
    "      tapTimes[e.code] = now;\n"
    "    }",
)
c = c.replace(
    "    if (dashFlag.left && now - dashFlag.left > BUFFER_MS) dashFlag.left = 0;\n"
    "    if (dashFlag.right && now - dashFlag.right > BUFFER_MS) dashFlag.right = 0;",
    "    if (dashFlag.left && now - dashFlag.left > BUFFER_MS) dashFlag.left = 0;\n"
    "    if (dashFlag.right && now - dashFlag.right > BUFFER_MS) dashFlag.right = 0;\n"
    "    if (dashFlag.left2 && now - dashFlag.left2 > BUFFER_MS) dashFlag.left2 = 0;\n"
    "    if (dashFlag.right2 && now - dashFlag.right2 > BUFFER_MS) dashFlag.right2 = 0;",
)
c += """
/* M1: 玩家二手柄 —— 方向键移动/下蹲, 小键盘 1/2/4/5 = 轻/重/必杀/超必
   (无小键盘备用: [ ] ; ')。防御同样是拉住远离方向。 */
function humanPad2() {
  const p = emptyPad();
  p.left = Input.isDown('ArrowLeft');
  p.right = Input.isDown('ArrowRight');
  p.crouch = Input.isDown('ArrowDown');
  p.jump = Input.consume('ArrowUp');
  p.light = Input.consume('Numpad1') || Input.consume('BracketLeft');
  p.heavy = Input.consume('Numpad2') || Input.consume('BracketRight');
  p.special = Input.consume('Numpad4') || Input.consume('Semicolon');
  p.super = Input.consume('Numpad5') || Input.consume('Quote');
  p.dashL = Input.consumeDash('left2');
  p.dashR = Input.consumeDash('right2');
  return p;
}
"""
io.open(P, "w", encoding="utf-8").write(c)
for marker in ["humanPad2", "left2", "Numpad1", "BracketLeft"]:
    assert marker in c
print("input.js P2 patched")
