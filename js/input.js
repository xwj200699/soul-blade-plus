/* Keyboard state + buffered edge presses + double-tap dash detection.
   Presses live in a 180ms buffer instead of being wiped every render frame —
   on 120Hz+ displays render frames outnumber logic ticks, and the old
   clear-per-frame approach ate ~half of all key presses. The buffer also
   gives natural fighting-game input buffering. */
'use strict';

const Input = (() => {
  const down = {};        // held keys
  const pressed = {};     // code -> press timestamp (ms)
  const tapTimes = { KeyA: 0, KeyD: 0, ArrowLeft: 0, ArrowRight: 0 }; // M1: P2 双击
  const dashFlag = { left: 0, right: 0, left2: 0, right2: 0 };   // timestamp of detected double-tap
  const DTAP_MS = 240;
  const BUFFER_MS = 180;

  const GAME_KEYS = new Set([
    'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyU', 'KeyI',
    'KeyM', 'KeyH', 'KeyP', 'KeyR', 'KeyT', 'Escape', 'Enter', 'Space',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Numpad1', 'Numpad2', 'Numpad4', 'Numpad5',            // M1: P2 攻击键
    'BracketLeft', 'BracketRight', 'Semicolon', 'Quote',   // M1: P2 无小键盘备用
    'Comma', 'Period', 'Slash', 'ShiftRight',              // M1.3: P2 笔记本友好簇(紧邻方向键)
  ]);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    const now = performance.now();
    down[e.code] = true;
    pressed[e.code] = now;
    if (e.code === 'KeyA' || e.code === 'KeyD') {
      if (now - tapTimes[e.code] < DTAP_MS) {
        dashFlag[e.code === 'KeyA' ? 'left' : 'right'] = now;
      }
      tapTimes[e.code] = now;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { // M1: P2 双击冲刺
      if (now - tapTimes[e.code] < DTAP_MS) {
        dashFlag[e.code === 'ArrowLeft' ? 'left2' : 'right2'] = now;
      }
      tapTimes[e.code] = now;
    }
  });

  window.addEventListener('keyup', (e) => { down[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(down)) down[k] = false;
  });

  /* ---- M1.3 鼠标层 -------------------------------------------------
     canvas 逻辑坐标(1024x576)换算; hover 实时位 + 点击缓冲(220ms)。
     点击是一次性资源: 任一 UI 热区消费后立即清除, 防跨屏误触。
     hoverActive 仅在鼠标最近 250ms 内移动过才生效 —— 停着的鼠标
     不会跟键盘导航抢光标。 */
  const mouse = { x: -1e4, y: -1e4, cx: 0, cy: 0, ct: 0, mt: 0 };
  const CLICK_MS = 220;
  function _toLogical(e) {
    const cv = document.getElementById('game');
    if (!cv || !cv.getBoundingClientRect) return null;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: (e.clientX - r.left) * 1024 / r.width, y: (e.clientY - r.top) * 576 / r.height };
  }
  window.addEventListener('pointermove', (e) => {
    const p = _toLogical(e);
    if (p) { mouse.x = p.x; mouse.y = p.y; mouse.mt = performance.now(); }
  });
  window.addEventListener('pointerdown', (e) => {
    const p = _toLogical(e);
    if (p) { mouse.x = p.x; mouse.y = p.y; mouse.cx = p.x; mouse.cy = p.y; mouse.ct = performance.now(); }
  });

  function hover(x, y, w, h) {
    return mouse.x >= x && mouse.x < x + w && mouse.y >= y && mouse.y < y + h;
  }
  function hoverActive(x, y, w, h) {
    return performance.now() - mouse.mt < 250 && hover(x, y, w, h);
  }
  function click(x, y, w, h) {
    if (!mouse.ct || performance.now() - mouse.ct > CLICK_MS) return false;
    if (mouse.cx < x || mouse.cx >= x + w || mouse.cy < y || mouse.cy >= y + h) return false;
    mouse.ct = 0; // 消费
    return true;
  }

  function isDown(code) { return !!down[code]; }

  function consume(code) {
    const t = pressed[code];
    if (t === undefined) return false;
    delete pressed[code];
    return performance.now() - t <= BUFFER_MS;
  }

  function consumeDash(dir) {
    const t = dashFlag[dir];
    if (!t) return false;
    dashFlag[dir] = 0;
    return performance.now() - t <= BUFFER_MS;
  }

  /* expire stale entries; called once per render frame */
  function expire() {
    const now = performance.now();
    for (const k of Object.keys(pressed)) {
      if (now - pressed[k] > BUFFER_MS) delete pressed[k];
    }
    if (dashFlag.left && now - dashFlag.left > BUFFER_MS) dashFlag.left = 0;
    if (dashFlag.right && now - dashFlag.right > BUFFER_MS) dashFlag.right = 0;
    if (dashFlag.left2 && now - dashFlag.left2 > BUFFER_MS) dashFlag.left2 = 0;
    if (dashFlag.right2 && now - dashFlag.right2 > BUFFER_MS) dashFlag.right2 = 0;
    if (mouse.ct && now - mouse.ct > CLICK_MS) mouse.ct = 0; // 过期点击
  }

  // clearFrame kept as an alias so any stale-cached caller still works
  return { isDown, consume, consumeDash, expire, clearFrame: expire, hover, hoverActive, click, mouse };
})();

function emptyPad() {
  return {
    left: false, right: false, jump: false, crouch: false,
    light: false, heavy: false, special: false, super: false,
    dashL: false, dashR: false,
  };
}

/* Build the human pad for this tick from raw keyboard state.
   Blocking is directional (hold away from the opponent) — no block button. */
function humanPad() {
  const p = emptyPad();
  p.left = Input.isDown('KeyA');
  p.right = Input.isDown('KeyD');
  p.crouch = Input.isDown('KeyS');
  p.jump = Input.consume('KeyW');
  p.light = Input.consume('KeyJ');
  p.heavy = Input.consume('KeyK');
  p.special = Input.consume('KeyU');
  p.super = Input.consume('KeyI');
  p.dashL = Input.consumeDash('left');
  p.dashR = Input.consumeDash('right');
  return p;
}

/* M1: 玩家二手柄 —— 方向键移动/下蹲, 小键盘 1/2/4/5 = 轻/重/必杀/超必。
   M1.3: 主推笔记本友好簇 , . / 右Shift(紧邻方向键, 无小键盘/NumLock 也能玩);
   [ ] ; ' 旧备用保留。防御同样是拉住远离方向。 */
function humanPad2() {
  const p = emptyPad();
  p.left = Input.isDown('ArrowLeft');
  p.right = Input.isDown('ArrowRight');
  p.crouch = Input.isDown('ArrowDown');
  p.jump = Input.consume('ArrowUp');
  p.light = Input.consume('Numpad1') || Input.consume('Comma') || Input.consume('BracketLeft');
  p.heavy = Input.consume('Numpad2') || Input.consume('Period') || Input.consume('BracketRight');
  p.special = Input.consume('Numpad4') || Input.consume('Slash') || Input.consume('Semicolon');
  p.super = Input.consume('Numpad5') || Input.consume('ShiftRight') || Input.consume('Quote');
  p.dashL = Input.consumeDash('left2');
  p.dashR = Input.consumeDash('right2');
  return p;
}
