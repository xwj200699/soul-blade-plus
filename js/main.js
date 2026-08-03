/* Game shell: fixed-timestep loop, screens, combat resolution, rounds. */
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  screen: 'boot', tick: 0,
  fighters: [], projectiles: [],
  ai: [null, null], p2IsAI: true, demo: false,
  mode: 'versus', training: { dummy: 'stand' },
  round: 1, roundTimer: 60, phase: 'intro', phaseT: 0,
  hitstopT: 0, slowmo: 1, slowmoT: 0, slowAcc: 0,
  shakeT: 0, shakeMag: 0, koFlashT: 0, koWinner: null,
  ann: null, superBanner: null,
  titleSel: 0, titleStarted: false, titleIntro: 0, // press-any-key 起始页

  select: { phase: 'char', cursor: 0, p1: null, p2: null, diff: 'normal', diffCursor: 1, vsT: 0 },
  result: null, paused: false, pauseView: 'menu',
  stats: { maxCombo: 0 },
  showHint: true, debug: false,
  stageArt: 'alt', // 'alt' = AI-painted stage (falls back to procedural if missing)
  matchCfg: null,

  hitstop(n) { this.hitstopT = Math.max(this.hitstopT, n); },
  shake(mag, t) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, t); },
  spawnProjectile(f, def) {
    // def.spread: 一次抛出多枚(扇形苦无), 每枚一个 vy; 否则单发
    const vys = def.spread || [0];
    for (const vy of vys) {
      this.projectiles.push(new Projectile(f, def, f.x + f.facing * 70, f.y + def.y, f.facing, vy));
    }
    AudioSys.sfx('projectile');
  },
  hasProjectile(f) { return this.projectiles.some(p => p.owner === f && !p.dead); },
  superFlash(f, def) {
    if (!def.cine) return;
    // short flash: less time for the defender to react-guard on purpose
    this.hitstopT = Math.max(this.hitstopT, 28);
    this.superBanner = { t: 28, f, def };
    AudioSys.sfx('superFlash');
  },
};

function setAnn(text, style, dur, sub = null) { G.ann = { text, style, dur, sub, t: 0 }; }

function showErr(e) {
  const el = document.getElementById('err');
  el.style.display = 'block';
  el.textContent = 'ERROR: ' + (e && (e.stack || e.message || e));
}
window.addEventListener('error', ev => showErr(ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => showErr(ev.reason));

// ---- match / round management ------------------------------------------------
function startMatch(p1Id, p2Id, diff, demo = false, training = false) {
  G.matchCfg = { p1Id, p2Id, diff, demo, training };
  G.demo = demo;
  G.mode = training ? 'training' : 'versus';
  G.training.dummy = 'stand';
  const f1 = new Fighter(p1Id, 330, 1, G);
  const f2 = new Fighter(p2Id, 694, -1, G);
  G.fighters = [f1, f2];
  G.ai[1] = new AIController(f2, f1, diff, G);
  G.ai[0] = demo ? new AIController(f1, f2, diff, G) : null;
  G.stats.maxCombo = 0;
  G.round = 1;
  G.paused = false;
  G.screen = 'fight';
  startRound();
  if (training) {
    G.phase = 'fight';
    setAnn('TRAINING', 'fight', 60);
  }
  AudioSys.playBgm('battle');
}

function startRound() {
  const [f1, f2] = G.fighters;
  [[f1, 330, 1], [f2, 694, -1]].forEach(([f, x, face]) => {
    f.hp = f.maxHp; f.dispHp = f.maxHp;
    f.x = x; f.y = STAGE.ground; f.vx = 0; f.vy = 0; f.facing = face;
    f.state = 'idle'; f.stateT = 0; f.dead = false;
    f.move = null; f.superSeq = null; f.rekka = false;
    f.hitstun = 0; f.blockstun = 0; f.guard = 0; f.invuln = 0; f.lockout = 0;
    f.kdPending = false; f.grounded = true; f.frozen = 0; f.flash = 0;
    f.combo = { count: 0, timer: 0 }; f.comboable = 0;
    f.setAnim('idle', true);
  });
  G.projectiles = [];
  Effects.reset();
  G.roundTimer = 60;
  G.phase = 'intro'; G.phaseT = 0;
  G.hitstopT = 0; G.slowmoT = 0; G.slowmo = 1; G.slowAcc = 0;
  G.superBanner = null; G.koWinner = null; G.ann = null;
}

function doKO(dead1, dead2) {
  const [f1, f2] = G.fighters;
  G.phase = 'ko'; G.phaseT = 0;
  if (dead1) f1.die();
  if (dead2) f2.die();
  G.koWinner = dead1 && dead2 ? null : dead1 ? f2 : f1;
  for (const f of [f1, f2]) {
    if (f.dead && f.grounded) { // dramatic fling if they died standing
      f.grounded = false; f.vy = -7;
      f.vx = (G.koWinner ? Math.sign(f.x - G.koWinner.x) || 1 : 1) * 5;
    }
  }
  setAnn('K.O.', 'ko', 120);
  AudioSys.sfx('ko');
  G.koFlashT = 10;
  G.shake(12, 22);
  G.slowmo = 0.3; G.slowmoT = 70; G.slowAcc = 0;
}

function awardRound() {
  const [f1, f2] = G.fighters;
  const w = G.koWinner;
  if (w) {
    w.wins++;
    const perfect = w.hp >= w.maxHp;
    setAnn(`${w.c.name} WINS`, 'banner', 116, perfect ? 'PERFECT!' : null);
    AudioSys.sfx(w === f1 ? 'win' : 'lose');
  } else {
    f1.wins++; f2.wins++;
    setAnn('DOUBLE K.O.', 'banner', 116);
  }
  G.phase = 'roundend'; G.phaseT = 0;
}

function endRoundTimeout() {
  const [f1, f2] = G.fighters;
  const w = f1.hp === f2.hp ? null : (f1.hp > f2.hp ? f1 : f2);
  if (w) {
    w.wins++;
    setAnn('TIME UP', 'banner', 116, `${w.c.name} WINS`);
    AudioSys.sfx(w === f1 ? 'win' : 'lose');
  } else {
    setAnn('TIME UP · DRAW', 'banner', 116);
  }
  G.phase = 'roundend'; G.phaseT = 0;
}

function endMatch(winner) {
  G.result = { winner };
  G.screen = 'result';
  Effects.reset();
  G.projectiles = [];
  AudioSys.playBgm('result');
  AudioSys.sfx(winner === G.fighters[0] ? 'win' : 'lose');
}

// ---- combat resolution ---------------------------------------------------------
function rectsOverlap(a, b) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

/* moveA is snapshotted before resolution: in a same-tick trade the first hit
   nulls the defender's a.move, but their already-active attack still lands. */
function tryHit(a, b, boxA, moveA) {
  if (!boxA || !moveA || b.dead || b.superSeq) return;
  const bb = b.bodyBox();
  if (!rectsOverlap(boxA, bb)) return;

  moveA.hasHit = true;

  // i-frames / off-the-ground: whiff
  if (b.invuln > 0 || b.state === 'down' || b.state === 'getup' || b.juggleImmune()) {
    if (b.state === 'backdash') {
      Effects.text(b.x, b.y - 195, '回避!', '#35e0d8', 16);
      AudioSys.sfx('dodge');
      b.gainMeter(6);
    }
    return;
  }

  moveA.contact = true;
  moveA.contactT = moveA.t;
  const d = moveA.def;
  const px = (Math.max(boxA.x1, bb.x1) + Math.min(boxA.x2, bb.x2)) / 2;
  const py = (Math.max(boxA.y1, bb.y1) + Math.min(boxA.y2, bb.y2)) / 2;
  const preScale = a.comboScale(b);

  // only the SECOND chained heavy (the K·K ender) knocks down — a single
  // chained K must leave the target standing so U / I finishers connect
  const kd = d.kd || (moveA.chained && d.kind === 'heavy' && a.rekkaH);
  // finisher bonus: a chained hit landing as the 3rd+ hit of a combo
  const predicted = b.comboable > 0 ? a.combo.count + 1 : 1;
  const finisher = moveA.chained && predicted >= 3;
  const dmgVal = finisher ? Math.round(d.dmg * 1.3) : d.dmg;

  const res = b.receiveHit({
    dmg: dmgVal, chip: d.chip, guardDmg: d.guardDmg, knock: d.knock, hitstun: d.hitstun,
    blockstun: d.blockstun, kd, launch: d.launch, meterHit: d.meterHit, hitSfx: d.hitSfx,
  }, a);

  moveA.hitLanded = res !== 'block';
  if (res === 'block') {
    // ② 格挡对抗感: 摩擦火花 + 分级卡帧(受阻感) + 震动(打在结界上的实感, 不再像打空)
    Effects.blockSpark(px, py, a.facing, d.kind);
    const bHeavy = d.kind !== 'light';
    G.hitstop(bHeavy ? 11 : 7);   // 冻结时长 = 攻击被挡下的阻尼/顿挫
    G.shake(bHeavy ? 5 : 3, 7);
  } else if (res === 'crush') {
    Effects.impact(px, py, a.facing, { tier: 3, color: a.c.theme2 || '#ffc531' });
    G.hitstop(12);
    G.shake(7, 12);
  } else {
    // 月华式星爆: tier 按招式威力分级(轻1/重2/必杀·超3), 在 hitstop 冻结中演完
    Effects.impact(px, py, a.facing, {
      tier: d.kind === 'light' ? 1 : d.kind === 'heavy' ? 2 : 3,
      color: a.c.theme2 || '#ffc531',
    });
    G.hitstop(d.hitstop || 5);
    if (d.shake) G.shake(d.shake, 8);
    // 重击命中: 受击者脚下扬尘(冲击传到地面的重量感)
    if (d.kind === 'heavy' && res === 'hit' && b.grounded) Effects.dust(b.x, b.y, 8, a.facing);
    // 必杀命中: 冲击环 + 冻结解除后 14 tick 半速 slowmo 收尾(刀劲的余韵)
    if (d.kind === 'special' && res === 'hit') {
      Effects.shockRing(px, py, a.c.theme2 || '#ffc531');
      G.slowmoT = 14; G.slowmo = 0.5; G.slowAcc = 0;
    }
    if (finisher && res === 'hit') {
      Effects.text(px, py - 46, 'BONUS!', '#ffc531', 14);
      G.hitstop(3);
    }
    // cine only if the attacker wasn't themselves interrupted this tick
    if (d.kind === 'super' && d.cine && a.state === 'attack') {
      a.vx = 0;
      a.move = null; // cine anims play on their own timeline from here
      a.superSeq = {
        hits: d.cine.hits, interval: d.cine.interval, dmgPer: d.cine.dmgPer,
        final: d.cine.final, t: 0, done: 0, scale: preScale,
        style: a.cineStyleOverride || d.cine.style || null,
      };
      b.frozen = 2;
    }
  }
}

function resolveCombat() {
  const [f1, f2] = G.fighters;
  const b1 = f1.activeBox(), b2 = f2.activeBox();
  const m1 = f1.move, m2 = f2.move;
  tryHit(f1, f2, b1, m1);
  tryHit(f2, f1, b2, m2);

  for (const pr of G.projectiles) {
    if (pr.dead) continue;
    const t = pr.owner === f1 ? f2 : f1;
    if (t.dead || t.superSeq) continue;
    if (!rectsOverlap(pr.box(), t.bodyBox())) continue;
    if (t.invuln > 0 || t.state === 'down' || t.state === 'getup' || t.juggleImmune()) {
      if (t.state === 'backdash' && !pr.dodged) {
        pr.dodged = true;
        Effects.text(t.x, t.y - 195, '回避!', '#35e0d8', 16);
        AudioSys.sfx('dodge');
        t.gainMeter(6);
      }
      continue;
    }
    const pd = pr.def;
    // proj: 飞行道具命中不消耗浮空追击配额(Eric: 空中点到人后还能贱贱补一刀);
    // launch: 空中被点到会小幅上浮, 给投掷者冲过去补刀的时间
    const res = t.receiveHit({
      dmg: pd.dmg, chip: pd.chip, guardDmg: pd.guardDmg, knock: pd.knock, hitstun: pd.hitstun,
      blockstun: pd.blockstun, meterHit: pd.meterHit, hitSfx: 'hitL', proj: true, launch: pd.launch,
    }, pr.owner);
    pr.dead = true;
    Effects.spark(pr.x, pr.y, Math.sign(pr.vx), res === 'block' ? ['#35b9e0', '#8ad8ff'] : ['#c9baff', '#7d5bff', '#ffffff'], 10, 5);
    G.hitstop(res === 'block' ? 4 : pd.hitstop || 6);
  }
}

function pushApart() {
  const [f1, f2] = G.fighters;
  if (f1.dead || f2.dead) return;
  if (['down', 'getup'].includes(f1.state) || ['down', 'getup'].includes(f2.state)) return;
  if (!f1.grounded || !f2.grounded) return;
  const b1 = f1.bodyBox(), b2 = f2.bodyBox();
  const ox = Math.min(b1.x2, b2.x2) - Math.max(b1.x1, b2.x1);
  if (ox <= 0) return;
  const push = Math.min(3, ox / 2);
  if (f1.x <= f2.x) { f1.x -= push; f2.x += push; }
  else { f1.x += push; f2.x -= push; }
  for (const f of [f1, f2]) f.x = Math.max(STAGE.left, Math.min(STAGE.right, f.x));
}

// ---- per-screen updates -----------------------------------------------------------
function updateTitle() {
  // 起始页: 等首次任意键/点击 → Logo 上升 + 菜单淡入 + BGM 起(unlockAudio 已解锁音频)
  if (!G.titleStarted) {
    if (firstInput) { G.titleStarted = true; G.titleIntro = 0; AudioSys.sfx('menuSel'); }
    return;
  }
  // intro 过场 (~0.5s): 定住导航, 让 Logo 升起+按钮淡入演完, 也顺带吃掉启动键不误触菜单
  if (G.titleIntro < 30) { G.titleIntro++; return; }
  if (Input.consume('KeyW')) { G.titleSel = (G.titleSel + 2) % 3; AudioSys.sfx('menuMove'); }
  if (Input.consume('KeyS')) { G.titleSel = (G.titleSel + 1) % 3; AudioSys.sfx('menuMove'); }
  if (Input.consume('KeyJ') || Input.consume('Enter')) {
    AudioSys.sfx('menuSel');
    if (G.titleSel === 0 || G.titleSel === 1) {
      G.select = {
        phase: 'char', cursor: 0, p1: null, p2: null,
        diff: 'normal', diffCursor: 1, vsT: 0,
        training: G.titleSel === 1,
      };
      G.screen = 'select';
    } else {
      G.screen = 'controls';
    }
  }
}

// How to Play 图鉴(js/howto.js): 真引擎演示台; 旧文字版 drawControls 仅存于暂停 overlay
function updateControls() {
  Howto.update(G);
}

function updateSelect() {
  const s = G.select;
  const ids = ['mack', 'kenji'];
  if (s.phase === 'char') {
    // directional, not toggle: A always selects left card, D always right
    if (Input.consume('KeyA') && s.cursor !== 0) {
      s.cursor = 0;
      AudioSys.sfx('menuMove');
    }
    if (Input.consume('KeyD') && s.cursor !== 1) {
      s.cursor = 1;
      AudioSys.sfx('menuMove');
    }
    if (Input.consume('KeyJ')) {
      s.p1 = ids[s.cursor];
      s.p2 = ids[1 - s.cursor];
      if (s.training) { s.phase = 'vs'; s.vsT = 0; AudioSys.sfx('fight'); }
      else { s.phase = 'diff'; AudioSys.sfx('menuSel'); }
    }
    if (Input.consume('KeyK') || Input.consume('Escape')) { AudioSys.sfx('menuBack'); G.screen = 'title'; }
  } else if (s.phase === 'diff') {
    if (Input.consume('KeyA')) { s.diffCursor = (s.diffCursor + 2) % 3; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyD')) { s.diffCursor = (s.diffCursor + 1) % 3; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyJ')) {
      s.diff = ['easy', 'normal', 'hard'][s.diffCursor];
      s.phase = 'vs'; s.vsT = 0;
      AudioSys.sfx('fight');
    }
    if (Input.consume('KeyK') || Input.consume('Escape')) { s.phase = 'char'; AudioSys.sfx('menuBack'); }
  } else if (s.phase === 'vs') {
    s.vsT++;
    if (s.vsT >= (s.training ? 60 : 100)) startMatch(s.p1, s.p2, s.diff, false, !!s.training);
  }
}

function updateResult() {
  // M1.3 鼠标热区: 与底部提示行 'J REMATCH · K CHARACTER · ESC TITLE'(y530 居中)对应
  const mRematch = Input.click(300, 506, 190, 42);
  const mChar = Input.click(495, 506, 205, 42);
  const mTitle = Input.click(705, 506, 180, 42);
  if (Input.consume('KeyJ') || Input.consume('KeyR') || mRematch) {
    AudioSys.sfx('menuSel');
    const c = G.matchCfg;
    startMatch(c.p1Id, c.p2Id, c.diff, c.demo, c.training);
  } else if (Input.consume('KeyK') || mChar) {
    AudioSys.sfx('menuBack');
    G.select = { phase: 'char', cursor: 0, p1: null, p2: null, diff: 'normal', diffCursor: 1, vsT: 0 };
    G.screen = 'select';
  } else if (Input.consume('Escape') || mTitle) {
    AudioSys.sfx('menuBack');
    G.screen = 'title';
  }
}

function updateFight() {
  // pause handling
  if (Input.consume('Escape') || Input.consume('KeyP')) {
    if (!G.paused) { G.paused = true; G.pauseView = 'menu'; AudioSys.sfx('menuSel'); }
    else if (G.pauseView === 'keys') { G.pauseView = 'menu'; }
    else { // quit to title
      G.paused = false;
      G.screen = 'title';
      AudioSys.playBgm('select');
      AudioSys.sfx('menuBack');
      return;
    }
  }
  if (G.paused) {
    if (G.pauseView === 'menu') {
      // M1.3 鼠标: 暂停三行热区(drawPause rows y262/306/350, 键帽x396 标签到~660)
      const mResume = Input.click(388, 256, 286, 40);
      const mKeys = Input.click(388, 300, 286, 40);
      const mQuit = Input.click(388, 344, 286, 40);
      if (Input.consume('KeyJ') || mResume) { G.paused = false; AudioSys.sfx('menuSel'); }
      else if (Input.consume('KeyK') || mKeys) { G.pauseView = 'keys'; AudioSys.sfx('menuMove'); }
      else if (mQuit) {
        G.paused = false;
        G.screen = 'title';
        AudioSys.playBgm('select');
        AudioSys.sfx('menuBack');
        return;
      }
    } else {
      // 暂停里的 How to Play = 完整新图鉴(旧文字版已废, Eric 2026-07-11);
      // overlay 模式下 K/ESC 由 Howto 内部路由回暂停菜单
      Howto.update(G, true);
    }
    return;
  }
  if (Input.consume('KeyH')) G.showHint = !G.showHint;

  // training-only controls
  if (G.mode === 'training') {
    if (Input.consume('KeyT')) {
      const modes = ['stand', 'guard', 'cpu'];
      const i = modes.indexOf(G.training.dummy);
      G.training.dummy = modes[(i + 1) % 3];
      const names = { stand: 'STAND', guard: 'AUTO-GUARD', cpu: 'CPU' };
      Effects.text(512, 200, `DUMMY: ${names[G.training.dummy]}`, '#ffe27a', 16);
      AudioSys.sfx('menuSel');
    }
    if (Input.consume('KeyR')) {
      const [f1, f2] = G.fighters;
      [[f1, 330, 1], [f2, 694, -1]].forEach(([f, x, face]) => {
        f.x = x; f.y = STAGE.ground; f.vx = 0; f.vy = 0; f.facing = face;
        f.hp = f.maxHp; f.dispHp = f.maxHp; f.guard = 0; f.meter = 100;
        f.state = 'idle'; f.move = null; f.superSeq = null;
        f.hitstun = 0; f.blockstun = 0; f.invuln = 0; f.lockout = 0;
        f.kdPending = false; f.grounded = true; f.frozen = 0;
        f.combo = { count: 0, timer: 0 }; f.comboable = 0;
        f.setAnim('idle', true);
      });
      G.projectiles = [];
      Effects.reset();
      AudioSys.sfx('menuMove');
    }
  }

  if (G.ann) { G.ann.t++; if (G.ann.t >= G.ann.dur) G.ann = null; }
  if (G.superBanner) { G.superBanner.t--; if (G.superBanner.t <= 0) G.superBanner = null; }

  if (G.hitstopT > 0) { G.hitstopT--; Effects.update(0.35); return; }

  if (G.slowmoT > 0) {
    G.slowmoT--;
    if (G.slowmoT <= 0) { G.slowmo = 1; }
    G.slowAcc += G.slowmo;
    if (G.slowAcc < 1) { Effects.update(G.slowmo); return; }
    G.slowAcc -= 1;
  }

  const [f1, f2] = G.fighters;

  // phase sequencing
  if (G.phase === 'intro') {
    G.phaseT++;
    if (G.phaseT === 1) {
      setAnn(`ROUND ${G.round}`, 'round', 64, (f1.wins === 1 && f2.wins === 1) ? 'FINAL ROUND' : null);
      AudioSys.sfx('round');
    }
    if (G.phaseT === 70) { setAnn('FIGHT!', 'fight', 36); AudioSys.sfx('fight'); }
    if (G.phaseT >= 88) G.phase = 'fight';
  } else if (G.phase === 'ko') {
    G.phaseT++;
    if (G.phaseT >= 150) awardRound();
  } else if (G.phase === 'roundend') {
    G.phaseT++;
    if (G.phaseT >= 118) {
      if (f1.wins >= 2 && f2.wins >= 2) { f1.wins = 1; f2.wins = 1; G.round++; startRound(); }
      else if (f1.wins >= 2 || f2.wins >= 2) endMatch(f1.wins >= 2 ? f1 : f2);
      else { G.round++; startRound(); }
      return;
    }
  }

  // pads
  const locked = G.phase !== 'fight';
  f1.pad = locked ? emptyPad() : (G.ai[0] ? G.ai[0].update() : humanPad());
  if (locked) {
    f2.pad = emptyPad();
  } else if (G.mode === 'training' && G.training.dummy !== 'cpu') {
    const p = emptyPad();
    if (G.training.dummy === 'guard') {
      // reactive perfect-guard: hold away only while threatened, else stand
      const threatened = f1.state === 'attack' || G.projectiles.length > 0;
      if (threatened) { if (f1.x >= f2.x) p.left = true; else p.right = true; }
    }
    f2.pad = p;
  } else {
    f2.pad = G.ai[1].update();
  }

  f1.update(f2);
  f2.update(f1);
  pushApart();

  // M1.2 分舞台环境粒子(修复: 樱瓣曾漏进霓虹都市/王者峡谷)
  if (G.stageSel === 1) {
    if (G.tick % 3 === 0) { // 霓虹雨丝: 斜落长条
      Effects.parts.push({
        x: Math.random() * 1120 - 60, y: -10,
        vx: -1.7, vy: 10.5 + Math.random() * 3.5,
        life: 62, maxLife: 62, w: 2, h: 11 + Math.random() * 5,
        color: Math.random() < 0.25 ? '#7a9cc0' : '#54718e', grav: 0,
      });
    }
    if (G.tick % 34 === 0) { // 地面溅起的雨雾泡
      Effects.parts.push({
        x: Math.random() * 1024, y: 468 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.4, vy: -0.35,
        life: 24, maxLife: 24, size: 2, color: '#6f8cab', grav: 0,
      });
    }
  } else if (G.stageSel === 2) {
    if (G.tick % 16 === 0) { // 峡谷水晶光尘: 缓浮蓝白光点
      Effects.parts.push({
        x: Math.random() * 1024, y: 470 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.35 - Math.random() * 0.45,
        life: 150, maxLife: 150, size: Math.random() < 0.3 ? 3 : 2,
        color: Math.random() < 0.4 ? '#8ad8ff' : '#d8f2ff',
        grav: 0, sway: 0.5, ph: Math.random() * 6.28,
      });
    }
    if (G.tick % 90 === 0) { // 偶发灵萤(金)
      Effects.parts.push({
        x: 200 + Math.random() * 624, y: 300 + Math.random() * 160,
        vx: (Math.random() - 0.5) * 0.5, vy: -0.2,
        life: 120, maxLife: 120, size: 2, color: '#ffd24a',
        grav: 0, sway: 0.8, ph: Math.random() * 6.28,
      });
    }
  } else if (G.stageSel === 3) {
    if (G.tick % 11 === 0) { // 青铜神殿: 火盆金烬上浮(自两侧火盆)
      const side = Math.random() < 0.5 ? 136 : 888;
      Effects.parts.push({
        x: side + (Math.random() - 0.5) * 30, y: 420 + Math.random() * 16,
        vx: (Math.random() - 0.5) * 0.5, vy: -0.9 - Math.random() * 0.8,
        life: 66, maxLife: 66, size: Math.random() < 0.3 ? 2 : 1,
        color: Math.random() < 0.5 ? '#ffb056' : '#ff7a3c',
        grav: 0, sway: 0.7, ph: Math.random() * 6.28,
      });
    }
    if (G.tick % 70 === 0) { // 殿内悬尘(青铜绿微光)
      Effects.parts.push({
        x: Math.random() * 1024, y: 120 + Math.random() * 220,
        vx: 0.15, vy: -0.1,
        life: 160, maxLife: 160, size: 1, color: '#7fae94',
        grav: 0, sway: 0.4, ph: Math.random() * 6.28,
      });
    }
  } else if (G.tick % 26 === 0) { // 神社: 落樱(原版行为, 仅此舞台)
    Effects.parts.push({
      x: Math.random() * 1024, y: -6,
      vx: 0.35 + Math.random() * 0.5, vy: 0.55 + Math.random() * 0.5,
      life: 900, maxLife: 900, size: 2,
      color: Math.random() < 0.5 ? '#c98a9e' : '#a86a80', grav: 0,
    });
  }

  for (const pr of G.projectiles) pr.update();
  G.projectiles = G.projectiles.filter(p => !p.dead);

  if (G.phase === 'fight') resolveCombat();
  Effects.update();

  if (G.mode === 'training') {
    // debug: ?pose=<moveKey> auto-repeats a move for visual inspection
    if (G.poseTest && f1.state === 'idle' && G.tick % 40 === 0) f1.startMove(G.poseTest);
    // infinite meter for the PLAYER only — a dummy with free meter just
    // spams supers forever; the dummy builds meter naturally
    f1.meter = 100;
    for (const f of G.fighters) {
      if (f.hp < f.maxHp && G.tick - (f.lastHurt || 0) > 100 &&
          ['idle', 'walk', 'guard'].includes(f.state) && f.comboable <= 0) {
        f.hp = f.maxHp;
        f.dispHp = f.maxHp;
        f.guard = 0;
      }
    }
    return; // no timer, no KO
  }

  // round timer
  if (G.phase === 'fight') {
    const prev = Math.ceil(G.roundTimer);
    G.roundTimer -= 1 / 60;
    const cur = Math.ceil(G.roundTimer);
    if (cur !== prev && cur <= 10 && cur > 0) AudioSys.sfx('beep');
    if (G.roundTimer <= 0) { endRoundTimeout(); return; }
  }

  // KO check
  if (G.phase === 'fight') {
    const d1 = f1.hp <= 0, d2 = f2.hp <= 0;
    if (d1 || d2) doKO(d1, d2);
  }
}

// ---- drawing -----------------------------------------------------------------------
function drawFight() {
  ctx.save();
  let ox = 0, oy = 0;
  if (G.shakeT > 0) {
    G.shakeT--;
    ox = (Math.random() * 2 - 1) * G.shakeMag;
    oy = (Math.random() * 2 - 1) * G.shakeMag * 0.6;
    if (G.shakeT <= 0) G.shakeMag = 0;
  }
  ctx.translate(ox, oy);

  ctx.drawImage(UI.bgCanvas(G), 0, 0);
  if (typeof StagePlus !== 'undefined' && StagePlus.drawFx) StagePlus.drawFx(ctx, G); // M1.2 舞台动态层
  ctx.fillStyle = 'rgba(7,8,12,0.22)';
  ctx.fillRect(0, 0, 1024, 576);

  // 超杀演出: 背景压暗 + 按演出风格调色 + 径向速度线(M1.2 强化)
  const cineF = G.fighters.find(f => f.superSeq);
  if (cineF) {
    const st = cineF.superSeq.style;
    const TINT = {
      staff: ['rgba(26,15,2,0.62)', '#ffd24a'],       // 悟空: 暖金
      arrowrain: ['rgba(6,10,26,0.62)', '#ffd24a'],   // 后羿: 夜空金
      flame: ['rgba(22,4,26,0.62)', '#c94aff'],       // 安琪拉: 品红
      fandance: ['rgba(26,6,16,0.62)', '#ff9db8'],    // 貂蝉: 樱粉
    }[st] || ['rgba(10,6,20,0.58)', '#ffffff'];
    ctx.fillStyle = TINT[0];
    ctx.fillRect(0, 0, 1024, 576);
    // 径向速度线: 自画面边缘压向受击者, 中心留净空; 随 tick 缓旋
    const foe = G.fighters.find(f => f !== cineF) || cineF;
    const fx = Math.max(220, Math.min(804, foe.x)), fy = 250;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = TINT[1];
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + G.tick * 0.012 + (i % 2) * 0.11;
      const r1 = 560 + (i % 3) * 40, r2 = 330 + (i % 4) * 22;
      ctx.globalAlpha = 0.05 + 0.05 * Math.sin(G.tick * 0.31 + i * 1.7);
      ctx.beginPath();
      ctx.moveTo(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1 * 0.62);
      ctx.lineTo(fx + Math.cos(a) * r2, fy + Math.sin(a) * r2 * 0.62);
      ctx.stroke();
    }
    ctx.restore();
  }

  Effects.drawGhosts(ctx);

  const [f1, f2] = G.fighters;
  const f1Active = f1.state === 'attack' || f1.superSeq;
  const f2Active = f2.state === 'attack' || f2.superSeq;
  const order = f1Active && !f2Active ? [f2, f1] : f2Active && !f1Active ? [f1, f2] : [f2, f1];
  for (const f of order) f.draw(ctx);

  for (const pr of G.projectiles) pr.draw(ctx);
  Effects.draw(ctx);

  if (G.debug) {
    for (const f of G.fighters) {
      const bb = f.bodyBox();
      ctx.strokeStyle = 'rgba(60,255,120,0.8)'; ctx.lineWidth = 1;
      ctx.strokeRect(bb.x1, bb.y1, bb.x2 - bb.x1, bb.y2 - bb.y1);
      const ab = f.activeBox();
      if (ab) { ctx.strokeStyle = 'rgba(255,60,60,0.9)'; ctx.strokeRect(ab.x1, ab.y1, ab.x2 - ab.x1, ab.y2 - ab.y1); }
    }
  }
  ctx.restore();

  UI.drawHUD(ctx, G);
  UI.drawSuperBanner(ctx, G);
  UI.drawAnnounce(ctx, G);

  if (G.koFlashT > 0) {
    G.koFlashT--;
    ctx.fillStyle = `rgba(255,255,255,${(G.koFlashT / 10) * 0.75})`;
    ctx.fillRect(0, 0, 1024, 576);
  }
  if (G.paused) UI.drawPause(ctx, G);
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 1024, 576);
  switch (G.screen) {
    case 'boot': UI.drawLoading(ctx, G, bootProgress); break;
    case 'title': UI.drawTitle(ctx, G); break;
    case 'controls': Howto.draw(ctx, G); break;
    case 'select': UI.drawSelect(ctx, G); break;
    case 'result': UI.drawResult(ctx, G); break;
    case 'fight': drawFight(); break;
    case 'quest': Quest.draw(ctx); break; // M1.3 闯关
  }
}

function update() {
  if (G.freezeAll) return;
  G.tick++;
  if (Input.consume('KeyM')) {
    const m = AudioSys.toggleMute();
    Effects.text(90, 520, m ? 'MUTED' : 'SOUND ON', '#8892ad', 12);
  }
  switch (G.screen) {
    case 'title': updateTitle(); break;
    case 'controls': updateControls(); break;
    case 'select': updateSelect(); break;
    case 'result': updateResult(); break;
    case 'fight': updateFight(); break;
    case 'quest': Quest.update(); break; // M1.3 闯关
  }
}

// ---- boot ---------------------------------------------------------------------------
function applyUrlParams() {
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) G.debug = true;
  if (q.get('stage')) G.stageArt = q.get('stage'); // ?stage=proc|alt
  if (q.get('pose')) G.poseTest = q.get('pose');
  const scr = q.get('screen');
  if (scr && ['title', 'controls', 'select'].includes(scr)) G.screen = scr;
  if (q.has('fight')) {
    startMatch(
      q.get('p1') || 'mack',
      q.get('p2') || (q.get('p1') === 'kenji' ? 'mack' : 'kenji'),
      q.get('ai') || 'normal',
      q.has('demo'),
      q.has('training'),
    );
  }
  if (q.has('quest')) { // M1.3 调试: ?quest=mack&qdiff=normal 直入闯关
    Quest.start(DATA[q.get('quest')] ? q.get('quest') : 'mack', q.get('qdiff') || 'normal');
  }
  // debug fast-forward: simulate N ticks synchronously (headless verification)
  const ff = parseInt(q.get('ff') || '0', 10);
  for (let i = 0; i < ff; i++) update();
  if (q.has('pause') && G.screen === 'fight') { G.paused = true; G.pauseView = 'menu'; } // debug
  if (q.get('screen') === 'select' && q.has('vs')) { // debug: jump into VS splash
    G.select = { phase: 'vs', cursor: 0, p1: q.get('p1') || 'mack', p2: q.get('p2') || 'kenji',
                 diff: 'normal', diffCursor: 1, vsT: parseInt(q.get('vs'), 10) || 20, training: false };
  }
  if (q.has('freeze')) G.freezeAll = true; // exact-frame screenshots (debug)
  // debug state hooks for visual verification
  if (q.has('pause') && G.screen === 'fight') { G.paused = true; G.pauseView = q.get('pause') === 'keys' ? 'keys' : 'menu'; }
  if (q.has('result') && G.screen === 'fight') endMatch(G.fighters[q.get('result') === '2' ? 1 : 0]);
  const sp = q.get('selphase');
  if (sp && G.screen === 'select') {
    G.select.p1 = 'mack'; G.select.p2 = 'kenji';
    if (sp === 'diff') G.select.phase = 'diff';
    if (sp === 'vs') { G.select.phase = 'vs'; G.select.vsT = 0; }
  }
}

function desiredBgm() {
  switch (G.screen) {
    case 'fight': return 'battle';
    case 'quest': return Quest.st && Quest.st.phase === 'clear' ? 'result' : 'battle'; // M1.3
    case 'result': return 'result';
    default: return 'select'; // 菜单/标题/选人/说明 共用 select 主题
  }
}

let firstInput = false; // 起始页「按任意键」: 首次用户手势(键/点/触)置真
function unlockAudio() {
  firstInput = true;
  if (AudioSys.ensure()) AudioSys.playBgm(desiredBgm());
}
// 浏览器自动播放策略要求先有一次用户手势 — 监听所有可能的最早交互, 尽早解锁
['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(ev =>
  window.addEventListener(ev, unlockAudio));

let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 16.667) { update(); acc -= 16.667; }
  if (AudioSys.ready) AudioSys.playBgm(desiredBgm()); // BGM 每帧跟随当前画面, 进入即自动 crossfade
  draw();
  (Input.expire || Input.clearFrame)(); // tolerate a stale-cached input.js
  requestAnimationFrame(loop);
}

let bootProgress = 0; // 0..1 across the whole load; drives the loading-screen bar

(async function boot() {
  // start the render loop NOW so the loading screen shows immediately instead of
  // a black canvas while assets stream in (G.screen is 'boot' until title).
  last = performance.now();
  requestAnimationFrame(loop);
  // ?loadhold=<0-100> — debug: freeze on the (fully loaded) loading screen at N%
  const _hold = new URLSearchParams(location.search).get('loadhold');
  const _holdP = _hold === null ? null : Math.max(0, Math.min(1, (parseInt(_hold, 10) || 60) / 100));
  try {
    // UI art first — the loading screen upgrades to the real title page as soon
    // as its own ingredients (brush font + gate bg + emblem, fetched first) land
    await UI.loadAssets(p => { bootProgress = _holdP !== null ? _holdP : p * 0.85; });
    if (_holdP !== null) return; // debug: stay on the loading screen
    await Assets.load();
    bootProgress = 0.92;
    try {
      await Promise.race([
        Promise.all([document.fonts.load('16px PressStart'), document.fonts.load('16px FusionPixel'), document.fonts.load('16px FusionPixelJA')]),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    } catch (e) { /* fonts are cosmetic */ }
    Stage.build();
    UI.makePortraits();
    applyUrlParams();
    bootProgress = 1;
    if (G.screen === 'boot') G.screen = 'title';
  } catch (e) {
    showErr(e);
  }
})();
