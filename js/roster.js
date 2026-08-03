/* SOUL BLADE PLUS · roster expansion (loaded right after data.js).
   Adds movesets for the shipped-but-unwired ayame, and three new
   procedurally-baked fighters: wukong / houyi / angela.
   Sprites: assets/img/<id>/ baked by _build/bake_roster.py (128px frames,
   white crescents on attack frames feed the engine's smear pipeline). */
'use strict';

/* ---------- 綾 ayame: the hidden kunoichi, kit completed (REACH) ----------
   原作者已写好 light/light2/heavy/heavy2/special 且手感经过调校 —— 全部保留,
   只补齐让她能上场的缺口: air(空对空) 与 super(超必杀)。 */
(() => {
  const c = DATA.ayame;
  if (!c) return;
  c.dash = c.dash || { from: 3, to: 14, vx: 9 };
  c.body = c.body || { w: 30, h: 150, crouchH: 100 }; // M1.1
  c.moves = c.moves || {};
  if (!c.moves.air) {
    c.moves.air = {
      kind: 'light', anim: 'attack1', total: 24, startup: 6, active: 8, impact: 3, air: true,
      smear: { phases: [{ f: 3, t: 4 }], decay: 2, edge: '#c8d8ff', core: '#ffffff' },
      dmg: 7, chip: 0, guardDmg: 10, box: { x1: 6, x2: 170, y1: -170, y2: -30 },
      knock: 4, hitstun: 20, blockstun: 12, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    };
  }
  if (!c.moves.super) {
    c.moves.super = { // 月下残光 (通用月华连斩分镜)
      kind: 'super', name: '月下残光', anim: 'attack1', total: 52,
      startup: 14, active: 10, impact: 3, finisher: 'C',
      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 10, x2: 210, y1: -184, y2: -44 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 4, interval: 10, dmgPer: 5, final: 12 },
    };
  }
})();

/* ---------- 孙悟空 wukong (POWER · 金箍棒) ---------- */
DATA.wukong = {
  id: 'wukong',
  name: 'WUKONG', cn: '悟空', title: '斉天大聖', type: 'POWER',
  theme: '#e8b22a', theme2: '#ff6b3d',
  dir: 'assets/img/wukong', fw: 192, native: 1, scale: 1.78, // M1.1: 屏显~148px 对齐原三人
  anchor: { x: 70, y: 150 },
  body: { w: 30, h: 148, crouchH: 96 },
  walk: 3.2, jumpVy: -16.5, dashVx: 7.8, backdashVx: 6.6,
  dash: { from: 3, to: 18, vx: 7.2 },
  stats: { pow: 5, spd: 4, rng: 4 },
  quoteWin: '俺老孙的棒子，可还合口味？', quoteLose: '啧……且待俺再来！',
  portrait: { x: 40, y: 28, w: 48, h: 48 },
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 8,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 6,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false, smearFrames: [4] },
    attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false, smearFrames: [4] },
    attack3: { file: 'Attack3.png', frames: 7, hold: 5,  loop: false },
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 快棒横扫
      kind: 'light', anim: 'attack1', total: 23, startup: 6, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#ffd24a', core: '#fff8e2' },
      dmg: 7, chip: 0, guardDmg: 11, box: { x1: 12, x2: 138, y1: -150, y2: -44 }, // M1.1 同步缩放
      knock: 4.5, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
    },
    light2: { // 抡棒劈砸
      kind: 'light', anim: 'attack2', total: 24, startup: 6, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#ff9d3d', core: '#fff2d8' },
      dmg: 8, chip: 0, guardDmg: 12, box: { x1: 10, x2: 132, y1: -158, y2: -36 },
      knock: 5, hitstun: 20, blockstun: 12, hitstop: 6, shake: 3,
      meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 力劈华山 (击倒)
      kind: 'heavy', name: '力劈華山', anim: 'attack2', total: 36, startup: 13, active: 6, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#ff6b3d', core: '#ffe9c8' },
      dmg: 14, chip: 2, guardDmg: 26, box: { x1: 10, x2: 140, y1: -162, y2: -34 },
      knock: 8.5, hitstun: 27, blockstun: 16, hitstop: 9, shake: 6, kd: true,
      meterHit: 14, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: {
      kind: 'light', anim: 'attack1', total: 24, startup: 6, active: 8, impact: 4, air: true,
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#ffd24a', core: '#fff8e2' },
      dmg: 7, chip: 0, guardDmg: 10, box: { x1: 8, x2: 116, y1: -138, y2: -24 },
      knock: 4, hitstun: 20, blockstun: 12, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    special: { // 如意神棍: 棒子伸长的超远突刺 (全游戏最长单点)
      kind: 'special', name: '如意神棍', anim: 'attack3', total: 44, startup: 14, active: 6, impact: 3,
      cooldown: 96,
      fx: { x: 135, y: -88, r: 40, ry: 0.24, a0: 0.5, a1: -0.5, w: 8, life: 10, color: '#fff2d8', color2: '#e8b22a' },
      dmg: 13, chip: 3, guardDmg: 24, box: { x1: 30, x2: 235, y1: -128, y2: -52 },
      knock: 9, hitstun: 26, blockstun: 15, hitstop: 10, shake: 6, kd: true,
      meterHit: 16, sfx: 'whooshH', hitSfx: 'hitS',
    },
    super: { // 大聖乱舞 (通用交替连斩, 火金配色)
      kind: 'super', name: '大聖乱舞', anim: 'attack1', total: 50,
      startup: 13, active: 10, impact: 4, finisher: 'A',
      dmg: 5, chip: 3, guardDmg: 26, box: { x1: 10, x2: 145, y1: -155, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 4, interval: 9, dmgPer: 7, final: 15, style: 'staff' }, // M1: 专属三段棍法
      // (M1.1) box 同步缩放见下行
    },
  },
};

/* ---------- 后羿 houyi (RANGE · 射日弓) ---------- */
DATA.houyi = {
  id: 'houyi',
  name: 'HOUYI', cn: '后羿', title: '射日の弓神', type: 'RANGE',
  theme: '#4a6cb0', theme2: '#c6d0e0',
  dir: 'assets/img/houyi', fw: 192, native: 1, scale: 1.85,
  anchor: { x: 70, y: 150 },
  body: { w: 30, h: 146, crouchH: 94 },
  walk: 3.4, jumpVy: -15.5, dashVx: 7.0, backdashVx: 7.0,
  dash: { from: 3, to: 16, vx: 6.8 },
  stats: { pow: 3, spd: 4, rng: 5 },
  quoteWin: '九日尚可落，何况是你。', quoteLose: '这一箭……竟脱了靶。',
  portrait: { x: 40, y: 28, w: 48, h: 48 },
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 8,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 6,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false },
    attack2: { file: 'Attack2.png', frames: 5, hold: 6,  loop: false, smearFrames: [3] },
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 弓身横扫 (近身自卫)
      kind: 'light', anim: 'attack2', total: 22, startup: 6, active: 5, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4] },
      smear: { phases: [{ f: 3, t: 4 }], decay: 2, edge: '#c6d0e0', core: '#ffffff' },
      dmg: 7, chip: 0, guardDmg: 9, box: { x1: 10, x2: 124, y1: -146, y2: -42 },
      knock: 5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 弦月回身 (击退拉开距离, 后羿的求生技)
      kind: 'heavy', name: '弦月回身', anim: 'attack2', total: 32, startup: 10, active: 6, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4] },
      smear: { phases: [{ f: 3, t: 5 }], decay: 2, edge: '#7d9fd0', core: '#ffffff' },
      dmg: 11, chip: 1, guardDmg: 18, box: { x1: 8, x2: 128, y1: -152, y2: -36 },
      knock: 10, hitstun: 24, blockstun: 14, hitstop: 7, shake: 4, kd: true,
      meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: {
      kind: 'light', anim: 'attack2', total: 22, startup: 5, active: 7, impact: 3, air: true,
      dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 110, y1: -140, y2: -24 },
      knock: 4, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    special: { // 落日箭: 主力远程 (单发直线)
      kind: 'special', name: '落日箭', anim: 'attack1', total: 34, startup: 15, active: 1, impact: 4,
      cooldown: 55,
      projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [0], speed: 9.5,
                    dmg: 10, chip: 2, guardDmg: 14, y: -92,
                    hitstun: 22, blockstun: 12, knock: 3, hitstop: 6, meterHit: 15 },
      dmg: 0, meterHit: 6, sfx: 'projectile', hitSfx: 'hitL',
    },
    airspecial: { // 空中落日箭 (斜下压制)
      kind: 'special', name: '空中落日箭', anim: 'attack1', air: true, total: 28,
      startup: 11, active: 1, impact: 4, cooldown: 55,
      projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [3.5], speed: 9,
                    dmg: 9, chip: 2, guardDmg: 12, y: -66,
                    hitstun: 20, blockstun: 11, knock: 2, hitstop: 5, meterHit: 10, launch: -9 },
      dmg: 0, meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
    },
    super: { // 射日·九连 (通用分镜, 银蓝配色)
      kind: 'super', name: '射日・九連', anim: 'attack2', total: 48,
      startup: 12, active: 10, impact: 3, finisher: 'B',
      dmg: 4, chip: 3, guardDmg: 22, box: { x1: 8, x2: 140, y1: -152, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 4, interval: 8, dmgPer: 7, final: 16, style: 'arrowrain' }, // M1: 专属箭雨
    },
  },
};

/* ---------- 安琪拉 angela (MAGE · 火焰) ---------- */
DATA.angela = {
  id: 'angela',
  name: 'ANGELA', cn: '安琪拉', title: '烈焰の紅蓮', type: 'MAGE',
  theme: '#864aac', theme2: '#ff8428',
  dir: 'assets/img/angela', fw: 192, native: 1, scale: 1.9,
  anchor: { x: 70, y: 150 },
  body: { w: 28, h: 144, crouchH: 92 },
  walk: 3.0, jumpVy: -15, dashVx: 6.6, backdashVx: 6.8,
  dash: { from: 3, to: 15, vx: 6.4 },
  stats: { pow: 4, spd: 3, rng: 5 },
  quoteWin: '火花，是最美的谢幕。', quoteLose: '呜……魔法书借你看一晚啦。',
  portrait: { x: 40, y: 28, w: 48, h: 48 },
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 8,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 7,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 5, hold: 5,  loop: false, smearFrames: [3] },
    attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false },
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 法杖敲头
      kind: 'light', anim: 'attack1', total: 22, startup: 6, active: 5, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4] },
      smear: { phases: [{ f: 3, t: 4 }], decay: 2, edge: '#ff8428', core: '#ffe9c8' },
      dmg: 6, chip: 0, guardDmg: 9, box: { x1: 10, x2: 118, y1: -148, y2: -44 },
      knock: 4.5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 烈焰重击 (击倒)
      kind: 'heavy', name: '烈焰重撃', anim: 'attack1', total: 33, startup: 12, active: 5, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4] },
      smear: { phases: [{ f: 3, t: 5 }], decay: 2, edge: '#ff6b3d', core: '#ffd8a8' },
      dmg: 12, chip: 2, guardDmg: 20, box: { x1: 10, x2: 122, y1: -154, y2: -40 },
      knock: 8, hitstun: 25, blockstun: 15, hitstop: 8, shake: 5, kd: true,
      meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: {
      kind: 'light', anim: 'attack1', total: 23, startup: 6, active: 7, impact: 3, air: true,
      dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 106, y1: -136, y2: -26 },
      knock: 4, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    special: { // 火球术: 慢速大弹 (压制走位)
      kind: 'special', name: '火球術', anim: 'attack2', total: 38, startup: 17, active: 1, impact: 4,
      cooldown: 70,
      projectile: { kind: 'fireball', trail: 'rgba(255,132,40,0.75)', spread: [0], speed: 6.2,
                    dmg: 11, chip: 3, guardDmg: 18, y: -88,
                    hitstun: 24, blockstun: 14, knock: 5, hitstop: 7, meterHit: 14 },
      dmg: 0, meterHit: 5, sfx: 'projectile', hitSfx: 'hitH',
    },
    super: { // 炽热光辉 (通用分镜, 紫焰配色)
      kind: 'super', name: '熾熱光輝', anim: 'attack1', total: 50,
      startup: 14, active: 10, impact: 3, finisher: 'A',
      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 134, y1: -152, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 5, interval: 7, dmgPer: 6, final: 14, style: 'flame' }, // M1: 专属火焰法阵
    },
  },
};

/* ---------- 貂蝉 diaochan (DANCE · 双扇舞姬) —— M1.3 ---------- */
DATA.diaochan = {
  id: 'diaochan',
  name: 'DIAOCHAN', cn: '貂蝉', title: '月下の舞姫', type: 'DANCE',
  theme: '#e2547a', theme2: '#ff9db8',
  dir: 'assets/img/diaochan', fw: 192, native: 1, scale: 1.85,
  anchor: { x: 70, y: 150 },
  body: { w: 28, h: 145, crouchH: 93 },
  walk: 3.6, jumpVy: -15.5, dashVx: 7.2, backdashVx: 7.4,
  dash: { from: 3, to: 15, vx: 7.0 },
  stats: { pow: 3, spd: 5, rng: 4 },
  quoteWin: '这支舞，只为胜利而作。', quoteLose: '裙摆……乱了呢。',
  portrait: { x: 40, y: 28, w: 48, h: 48 },
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 8,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 6,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false, smearFrames: [4] },
    attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false, smearFrames: [4] },
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 扇刃斩
      kind: 'light', anim: 'attack1', total: 21, startup: 5, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#ff9db8', core: '#fff0f4' },
      dmg: 6, chip: 0, guardDmg: 9, box: { x1: 10, x2: 122, y1: -148, y2: -42 },
      knock: 4.5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 舞袖回旋 (击倒)
      kind: 'heavy', name: '舞袖回旋', anim: 'attack2', total: 31, startup: 11, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#e2547a', core: '#ffe0e8' },
      dmg: 11, chip: 2, guardDmg: 20, box: { x1: 10, x2: 128, y1: -152, y2: -40 },
      knock: 8, hitstun: 25, blockstun: 15, hitstop: 8, shake: 5, kd: true,
      meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: {
      kind: 'light', anim: 'attack1', total: 22, startup: 5, active: 7, impact: 4, air: true,
      dmg: 6, chip: 0, guardDmg: 9, box: { x1: 6, x2: 108, y1: -138, y2: -26 },
      knock: 4, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    special: { // 火羽扇: 旋转飞扇(中速弹)
      kind: 'special', name: '火羽扇', anim: 'attack2', total: 36, startup: 15, active: 1, impact: 4,
      cooldown: 62,
      projectile: { kind: 'featherfan', trail: 'rgba(255,143,179,0.7)', spread: [0], speed: 8.2,
                    dmg: 9, chip: 2, guardDmg: 16, y: -90,
                    hitstun: 22, blockstun: 13, knock: 4, hitstop: 6, meterHit: 12 },
      dmg: 0, meterHit: 5, sfx: 'projectile', hitSfx: 'hitL',
    },
    super: { // 花舞乱影
      kind: 'super', name: '花舞・乱影', anim: 'attack1', total: 50,
      startup: 13, active: 10, impact: 4, finisher: 'A',
      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 132, y1: -152, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 5, interval: 7, dmgPer: 6, final: 14, style: 'fandance' }, // M1.3 专属舞杀
    },
  },
};

/* ---------- roster list (select screen + AI use this) ---------- */
const ROSTER = ['mack', 'kenji', 'ayame', 'wukong', 'houyi', 'angela', 'diaochan'];
