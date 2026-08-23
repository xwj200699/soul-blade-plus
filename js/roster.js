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
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
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
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
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
    light: { // 速射箭: 后羿的普攻本体就是远程 —— 抬弓即射, 低伤高频
      kind: 'light', name: '速射箭', anim: 'attack1', total: 20, startup: 5, active: 1, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4, 5] },
      projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.72)', spread: [0], speed: 12,
                    dmg: 5, chip: 1, guardDmg: 8, y: -94,
                    hitstun: 16, blockstun: 9, knock: 2, hitstop: 4, meterHit: 7 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 46, y: -94, spark: 6, sparkPow: 3, color: '#e8f0ff', color2: '#7d9fd0' },
    },
    heavy: { // 落日重箭: 拉满一矢, 命中击倒
      kind: 'heavy', name: '落日重箭', anim: 'attack1', total: 36, startup: 13, active: 1, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4, 5] },
      projectile: { kind: 'sunarrow', trail: 'rgba(255,182,72,0.75)', spread: [0], speed: 10.5,
                    dmg: 12, chip: 3, guardDmg: 20, y: -92, kd: true, launch: -9,
                    hitstun: 26, blockstun: 14, knock: 8, hitstop: 9, meterHit: 14 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 6, sfx: 'projectile', hitSfx: 'hitH',
      flair: { x: 42, y: -92, converge: 8, ring: 12, spark: 10, flash: 0.14, shake: 4,
               color: '#ffb648', color2: '#ff7a2a' },
    },
    air: { // 空中俯射: 斜下压制的一矢
      kind: 'light', name: '俯射', anim: 'attack1', total: 24, startup: 5, active: 1, impact: 3, air: true,
      projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.72)', spread: [4.5], speed: 10,
                    dmg: 6, chip: 1, guardDmg: 9, y: -58, launch: -9,
                    hitstun: 18, blockstun: 10, knock: 2, hitstop: 5, meterHit: 8 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 40, y: -58, spark: 6, sparkPow: 3, color: '#e8f0ff', color2: '#7d9fd0' },
    },
    special: { // 落日·三連: 一次拉弓三矢齐发(上/平/下)
      kind: 'special', name: '落日・三連', anim: 'attack1', total: 38, startup: 15, active: 1, impact: 4,
      cooldown: 78,
      projectile: { kind: 'sunarrow', trail: 'rgba(255,182,72,0.72)', spread: [-3.2, 0, 3.2], speed: 10.5,
                    dmg: 7, chip: 2, guardDmg: 12, y: -92, launch: -9,
                    hitstun: 22, blockstun: 12, knock: 3, hitstop: 6, meterHit: 10 },
      dmg: 0, meterHit: 5, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 44, y: -94, converge: 12, ring: 18, spark: 14, sparkPow: 7, rise: 4,
               flash: 0.2, shake: 5, text: '落日・三連!', color: '#ffb648', color2: '#ff7a2a' },
    },
    airspecial: { // 空中落日箭 (斜下压制)
      kind: 'special', name: '空中落日箭', anim: 'attack1', air: true, total: 28,
      startup: 11, active: 1, impact: 4, cooldown: 55,
      projectile: { kind: 'arrow', trail: 'rgba(198,208,224,0.7)', spread: [3.5], speed: 9,
                    dmg: 9, chip: 2, guardDmg: 12, y: -66,
                    hitstun: 20, blockstun: 11, knock: 2, hitstop: 5, meterHit: 10, launch: -9 },
      dmg: 0, meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 40, y: -66, ring: 10, spark: 8, color: '#ffb648', color2: '#c6d0e0' },
    },
    super: { // 射日·九连 (通用分镜, 银蓝配色)
      kind: 'super', name: '射日・九連', anim: 'attack2', total: 48,
      startup: 12, active: 10, impact: 3, finisher: 'B',
      dmg: 4, chip: 3, guardDmg: 22, box: { x1: 8, x2: 140, y1: -152, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 4, interval: 8, dmgPer: 7, final: 16, style: 'arrowrain' }, // M1: 专属箭雨
      flair: { x: 30, y: -100, converge: 16, ring: 22, shock: 3, spark: 18, sparkPow: 8, pillar: true,
               rise: 5, flash: 0.3, shake: 8, color: '#ffd24a', color2: '#ff7a2a' },
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
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
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
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
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

/* ---------- 电脑博士 doctor (TECH · 笔电与代码) ----------
   校园电力风双角色之一, 精灵图由 _build/bake_roster3.py 烘焙。
   身份 = zoner: 站远处丢代码包, 近身只有一套横扫, 拳头软但压制线长。 */
DATA.doctor = {
  id: 'doctor',
  name: 'DOCTOR', cn: '博士', title: '算法教授', type: 'TECH',
  theme: '#50a0dc', theme2: '#7fd3ff',
  dir: 'assets/img/doctor', fw: 192, native: 1, scale: 1.82,
  anchor: { x: 70, y: 150 },
  body: { w: 28, h: 146, crouchH: 94 },
  walk: 3.3, jumpVy: -15.8, dashVx: 7.0, backdashVx: 7.6,
  dash: { from: 3, to: 15, vx: 6.8 },
  stats: { pow: 2, spd: 4, rng: 5 },
  quoteWin: '实验结论: 你的输入延迟太高了。', quoteLose: '数据……还得再复现一次。',
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
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
    light: { // 代码碎片: 普攻即远程 —— 屏光一闪, 一枚青蓝碎片射出
      kind: 'light', name: '代码碎片', anim: 'attack1', total: 20, startup: 5, active: 1, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      projectile: { kind: 'codeshard', trail: 'rgba(127,211,255,0.7)', spread: [0], speed: 11.5,
                    dmg: 5, chip: 1, guardDmg: 8, y: -96,
                    hitstun: 16, blockstun: 9, knock: 2, hitstop: 4, meterHit: 7 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 44, y: -96, spark: 6, sparkPow: 3, color: '#7fd3ff', color2: '#50a0dc' },
    },
    heavy: { // 编译爆轰: 一整个数据包砸出去, 命中击倒
      kind: 'heavy', name: '编译爆轰', anim: 'attack2', total: 36, startup: 13, active: 1, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      projectile: { kind: 'datapack', trail: 'rgba(80,160,220,0.75)', spread: [0], speed: 8.4,
                    dmg: 12, chip: 3, guardDmg: 20, y: -92, kd: true, launch: -9,
                    hitstun: 26, blockstun: 14, knock: 8, hitstop: 9, meterHit: 14 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 6, sfx: 'projectile', hitSfx: 'hitH',
      flair: { x: 42, y: -92, converge: 8, ring: 14, spark: 10, flash: 0.14, shake: 4,
               color: '#7fd3ff', color2: '#2a66a8' },
    },
    air: { // 空中俯投: 斜下砸一枚碎片
      kind: 'light', name: '俯投', anim: 'attack1', total: 24, startup: 5, active: 1, impact: 4, air: true,
      projectile: { kind: 'codeshard', trail: 'rgba(127,211,255,0.7)', spread: [4.5], speed: 10,
                    dmg: 6, chip: 1, guardDmg: 9, y: -58, launch: -9,
                    hitstun: 18, blockstun: 10, knock: 2, hitstop: 5, meterHit: 8 },
      dmg: 0, chip: 0, box: null,
      knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
      meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 40, y: -58, spark: 6, sparkPow: 3, color: '#7fd3ff', color2: '#50a0dc' },
    },
    special: { // 死循环: 三线程并发, 上中下三枚数据包同时压过去
      kind: 'special', name: '死循环', anim: 'attack2', total: 38, startup: 15, active: 1, impact: 4,
      cooldown: 106,
      projectile: { kind: 'datapack', trail: 'rgba(127,211,255,0.7)', spread: [-3.2, 0, 3.2], speed: 9.0,
                    dmg: 7, chip: 2, guardDmg: 13, y: -92, launch: -10,
                    hitstun: 24, blockstun: 12, knock: 3, hitstop: 6, meterHit: 10 },
      dmg: 0, meterHit: 5, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 46, y: -94, converge: 12, ring: 18, spark: 14, sparkPow: 7, rise: 4,
               flash: 0.2, shake: 5, text: 'while(true)!', color: '#7fd3ff', color2: '#2a66a8' },
    },
    super: { // 蓝屏警告
      kind: 'super', name: '蓝屏警告', anim: 'attack2', total: 50,
      startup: 13, active: 10, impact: 4, finisher: 'B',
      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 138, y1: -152, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 5, interval: 7, dmgPer: 6, final: 13 },
      flair: { x: 34, y: -100, converge: 16, ring: 22, shock: 3, spark: 18, sparkPow: 8,
               beam: 30, beamW: 18, flash: 0.34, flashColor: '#2a66a8', shake: 9,
               text: 'BLUE SCREEN!!', textSize: 18, color: '#7fd3ff', color2: '#2a66a8' },
    },
  },
};

/* ---------- 肉盾 tank (GUARD · 防爆盾与绝缘扳手) ----------
   身份 = 抗打压制: 移动慢、reach 短, 但吃伤害打八折(dmgTaken), 重击与突进都带击倒。 */
DATA.tank = {
  id: 'tank',
  name: 'IRONWALL', cn: '肉盾', title: '绝缘壁垒', type: 'GUARD',
  theme: '#e8622c', theme2: '#f5cc36',
  dir: 'assets/img/tank', fw: 192, native: 1, scale: 1.86,
  anchor: { x: 70, y: 150 },
  body: { w: 34, h: 150, crouchH: 98 },
  walk: 2.6, jumpVy: -14.6, dashVx: 6.0, backdashVx: 5.8,
  dash: { from: 4, to: 18, vx: 5.8 },
  stats: { pow: 4, spd: 2, rng: 2 },
  dmgTaken: 0.8,   // 肉盾本体特性: 受伤 -20%(fighter.js hurt 读取)
  quoteWin: '安全第一。你违规操作了。', quoteLose: '这盾……得报修了。',
  portrait: { x: 51, y: 66, w: 38, h: 38 }, // 192px 骨架的头部方框(file:// 抠图失败时的回退框)
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 9,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 10, loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 7,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false, smearFrames: [4] },
    attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false, smearFrames: [4] },
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 盾击
      kind: 'light', anim: 'attack1', total: 23, startup: 6, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#f5cc36', core: '#fff4d8' },
      dmg: 8, chip: 1, guardDmg: 14, box: { x1: 12, x2: 112, y1: -140, y2: -40 },
      knock: 5, hitstun: 19, blockstun: 12, hitstop: 6, shake: 3,
      meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 铁壁重砸 (击倒)
      kind: 'heavy', name: '铁壁重砸', anim: 'attack2', total: 36, startup: 14, active: 6, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#e8622c', core: '#ffe0c8' },
      dmg: 13, chip: 3, guardDmg: 24, box: { x1: 6, x2: 122, y1: -150, y2: 4 },
      knock: 8.5, hitstun: 26, blockstun: 17, hitstop: 10, shake: 6, kd: true,
      meterHit: 14, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: {
      kind: 'light', anim: 'attack1', total: 24, startup: 6, active: 7, impact: 4, air: true,
      dmg: 8, chip: 0, guardDmg: 12, box: { x1: 6, x2: 104, y1: -134, y2: -20 },
      knock: 4.5, hitstun: 20, blockstun: 12, hitstop: 6, shake: 3,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    special: { // 铁壁突进: 推盾平推(带位移, 击倒)
      kind: 'special', name: '铁壁突进', anim: 'attack1', total: 34,
      startup: 8, active: 8, impact: 4, cooldown: 120,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] }, dash: { from: 6, to: 16, vx: 10.5 },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dx: 9 }, edge: '#f5cc36', core: '#fff4d8' },
      dmg: 11, chip: 2, guardDmg: 26, box: { x1: 8, x2: 126, y1: -146, y2: -30 },
      knock: 8, hitstun: 24, blockstun: 14, hitstop: 9, shake: 6, kd: true,
      meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
    },
    super: { // 高压过载
      kind: 'super', name: '高压过载', anim: 'attack2', total: 52,
      startup: 14, active: 10, impact: 4, finisher: 'C',
      dmg: 4, chip: 3, guardDmg: 26, box: { x1: 4, x2: 126, y1: -152, y2: 4 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 6, shake: 5,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 4, interval: 10, dmgPer: 6, final: 15 },
    },
  },
};

/* ---------- 招式演出表 flair ----------
   houyi/doctor 的 flair 写在各自定义里(同文件); 这张表只挂 data.js 里的四位
   原生角色 + 本文件里剩下的几位, 集中一处方便对比强弱、统一配色。
   已有专属分镜的超必(wukong/houyi/angela/diaochan)不再加 text —— supers.js
   的 cine 自己会喊招名, 重复两行字会互相压。 */
const FLAIR = {
  mack: {
    special: { x: 62, y: -96, converge: 10, ring: 18, shock: 2, spark: 12, sparkPow: 6, dust: 8,
               flash: 0.16, shake: 5, text: '月牙・疾斬!', color: '#ffc531', color2: '#ff4a3d' },
    dive: { x: 30, y: -70, converge: 6, ring: 12, spark: 8, color: '#ffc531', color2: '#ff4a3d' },
    super: { x: 40, y: -104, converge: 18, ring: 24, shock: 3, spark: 20, sparkPow: 8, pillar: true,
             petals: 30, rise: 5, flash: 0.32, shake: 9, text: '満開・連獄斬!!', textSize: 18,
             color: '#ffc531', color2: '#ff4a3d' },
  },
  kenji: {
    special: { x: 46, y: -95, ring: 12, spark: 9, sparkPow: 5, flash: 0.12,
               text: '影・手裏剣!', color: '#35e0d8', color2: '#7d5bff' },
    airspecial: { x: 40, y: -62, ring: 10, spark: 7, color: '#35e0d8', color2: '#7d5bff' },
    dashslash: { x: 56, y: -92, dust: 8, spark: 8, sparkPow: 4, shake: 3,
                 color: '#35e0d8', color2: '#7d5bff' },
    dive: { x: 28, y: -66, ring: 12, spark: 8, color: '#7d5bff', color2: '#35e0d8' },
    super: { x: 36, y: -104, converge: 18, ring: 24, shock: 3, spark: 20, sparkPow: 8, stars: true,
             cut: 1, rise: 4, flash: 0.34, shake: 9, text: '残影・居合斬!!', textSize: 18,
             color: '#c9baff', color2: '#7d5bff' },
  },
  ayame: {
    special: { x: 70, y: -96, ring: 14, spark: 10, sparkPow: 6, dust: 6, flash: 0.14, shake: 4,
               text: '疾風突!', color: '#c8d8ff', color2: '#5b7dff' },
    super: { x: 38, y: -102, converge: 16, ring: 22, shock: 2, spark: 18, sparkPow: 8, pillar: true,
             rise: 4, flash: 0.3, shake: 8, text: '月下残光!!', textSize: 18,
             color: '#c8d8ff', color2: '#5b7dff' },
  },
  wukong: {
    heavy: { x: 52, y: -92, dust: 8, spark: 8, sparkPow: 5, shake: 3, color: '#ff6b3d', color2: '#e8b22a' },
    special: { x: 96, y: -92, shock: 3, dust: 12, spark: 14, sparkPow: 7, ring: 16, flash: 0.18,
               shake: 6, text: '如意・神棍!', color: '#ffd24a', color2: '#ff6b3d' },
    super: { x: 34, y: -104, converge: 18, ring: 22, shock: 2, spark: 18, sparkPow: 8, rise: 6,
             flash: 0.28, shake: 8, color: '#ffd24a', color2: '#ff6b3d' },
  },
  angela: {
    special: { x: 54, y: -94, converge: 10, ring: 16, spark: 12, sparkPow: 6, rise: 4, flash: 0.16,
               shake: 4, text: '火球術!', color: '#ff8428', color2: '#864aac' },
    super: { x: 34, y: -104, converge: 18, ring: 22, spark: 18, sparkPow: 8, pillar: true, rise: 6,
             flash: 0.3, shake: 8, color: '#ff8428', color2: '#c94aff' },
  },
  diaochan: {
    special: { x: 52, y: -92, ring: 16, spark: 11, sparkPow: 6, petals: 18, flash: 0.14, shake: 4,
               text: '火羽扇!', color: '#ff9db8', color2: '#e2547a' },
    super: { x: 34, y: -102, converge: 16, ring: 22, spark: 18, sparkPow: 8, petals: 34, rise: 5,
             flash: 0.28, shake: 8, color: '#ff9db8', color2: '#e2547a' },
  },
  tank: {
    heavy: { x: 40, y: -60, shock: 2, dust: 12, spark: 10, sparkPow: 6, shake: 5,
             color: '#f5cc36', color2: '#e8622c' },
    special: { x: 58, y: -90, shock: 3, dust: 14, spark: 14, sparkPow: 7, ring: 16, flash: 0.18,
               shake: 7, text: '铁壁突进!', color: '#f5cc36', color2: '#e8622c' },
    super: { x: 34, y: -100, converge: 16, ring: 24, shock: 4, spark: 20, sparkPow: 9, pillar: true,
             beam: 26, beamW: 14, rise: 5, flash: 0.34, flashColor: '#f5cc36', shake: 10,
             text: '高压过载!!', textSize: 18, color: '#f5cc36', color2: '#e8622c' },
  },
};
for (const [cid, tbl] of Object.entries(FLAIR)) {
  const mv = DATA[cid] && DATA[cid].moves;
  if (!mv) continue;
  for (const [k, f] of Object.entries(tbl)) if (mv[k]) mv[k].flair = f;
}

/* ---------- 全员数值上调 ----------
   集中做系数, 而不是散改每个招式的字面量: data.js 里那套手感调校仍是唯一真值,
   这里只统一抬一档伤害/破防/气收益, 想回退或再调只改 K。
   与 fighter.js 的 BASE_HP(150) 配套 —— 血和伤一起涨, 回合长度大体不变但数字更重。 */
(() => {
  const K = { dmg: 1.6, chip: 1.5, guardDmg: 1.4, meterHit: 1.2 };
  const bump = (m) => {
    if (!m) return;
    for (const k of Object.keys(K)) {
      if (typeof m[k] === 'number' && m[k] > 0) m[k] = Math.max(1, Math.round(m[k] * K[k]));
    }
    if (m.projectile) bump(m.projectile);
    if (m.cine) {
      if (m.cine.dmgPer) m.cine.dmgPer = Math.max(1, Math.round(m.cine.dmgPer * K.dmg));
      if (m.cine.final) m.cine.final = Math.max(1, Math.round(m.cine.final * K.dmg));
    }
  };
  for (const c of Object.values(DATA)) for (const m of Object.values(c.moves || {})) bump(m);
})();

/* ---------- roster list (select screen + AI use this) ---------- */
const ROSTER = ['mack', 'kenji', 'ayame', 'wukong', 'houyi', 'angela', 'diaochan', 'doctor', 'tank'];
