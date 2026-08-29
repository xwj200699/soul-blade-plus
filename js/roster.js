/* SOUL BLADE PLUS · roster expansion (loaded right after data.js).
   Adds movesets for the shipped-but-unwired ayame, and three new
   procedurally-baked fighters: wukong / houyi / angela.
   Sprites: assets/img/<id>/ baked by _build/bake_roster.py (128px frames,
   white crescents on attack frames feed the engine's smear pipeline). */
'use strict';

/* ---------- 欣韵 ayame: the hidden kunoichi, kit completed (REACH) ----------
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

/* ---------- 毅 wukong (POWER · 金箍棒) ---------- */
DATA.wukong = {
  id: 'wukong',
  name: 'YI', cn: '毅', title: '斉天大聖', type: 'POWER',
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
    heavy: { // 力劈华山 (K·K 第一段: 不再自带击倒 —— 击倒交给 heavy2, 见文件末 KIT 段)
      kind: 'heavy', name: '力劈華山', anim: 'attack2', total: 36, startup: 13, active: 6, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#ff6b3d', core: '#ffe9c8' },
      dmg: 14, chip: 2, guardDmg: 26, box: { x1: 10, x2: 140, y1: -162, y2: -34 },
      knock: 8.5, hitstun: 27, blockstun: 16, hitstop: 9, shake: 6,
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

/* ---------- 吉川 houyi (RANGE · 射日弓) ---------- */
DATA.houyi = {
  id: 'houyi',
  name: 'JICHUAN', cn: '吉川', title: '射日の弓神', type: 'RANGE',
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
    light: { // 速射箭: 吉川的普攻本体就是远程 —— 抬弓即射, 低伤高频
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

/* ---------- 景英 angela (MAGE · 火焰) ---------- */
DATA.angela = {
  id: 'angela',
  name: 'JINGYING', cn: '景英', title: '烈焰の紅蓮', type: 'MAGE',
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
    heavy: { // 烈焰重击 (K·K 第一段, 击倒交给 heavy2)
      kind: 'heavy', name: '烈焰重撃', anim: 'attack1', total: 33, startup: 12, active: 5, impact: 3,
      seq: { w: [0, 1, 2], i: 3, r: [4] },
      smear: { phases: [{ f: 3, t: 5 }], decay: 2, edge: '#ff6b3d', core: '#ffd8a8' },
      dmg: 12, chip: 2, guardDmg: 20, box: { x1: 10, x2: 122, y1: -154, y2: -40 },
      knock: 8, hitstun: 25, blockstun: 15, hitstop: 8, shake: 5,
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

/* ---------- 文萱 diaochan (DANCE · 双扇舞姬) —— M1.3 ---------- */
DATA.diaochan = {
  id: 'diaochan',
  name: 'WENXUAN', cn: '文萱', title: '月下の舞姫', type: 'DANCE',
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
    heavy: { // 舞袖回旋 (K·K 第一段, 击倒交给 heavy2)
      kind: 'heavy', name: '舞袖回旋', anim: 'attack2', total: 31, startup: 11, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#e2547a', core: '#ffe0e8' },
      dmg: 11, chip: 2, guardDmg: 20, box: { x1: 10, x2: 128, y1: -152, y2: -40 },
      knock: 8, hitstun: 25, blockstun: 15, hitstop: 8, shake: 5,
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

/* ---------- 泽轩 doctor (TECH · 笔电与代码) ----------
   校园电力风双角色之一, 精灵图由 _build/bake_roster3.py 烘焙。
   身份 = zoner: 站远处丢代码包, 近身只有一套横扫, 拳头软但压制线长。 */
DATA.doctor = {
  id: 'doctor',
  name: 'ZEXUAN', cn: '泽轩', title: '算法教授', type: 'TECH',
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

/* ---------- 钰胜 tank (GUARD · 防爆盾与绝缘扳手) ----------
   身份 = 抗打压制: 移动慢、reach 短, 但吃伤害打八折(dmgTaken), 重击与突进都带击倒。 */
DATA.tank = {
  id: 'tank',
  name: 'YUSHENG', cn: '钰胜', title: '绝缘壁垒', type: 'GUARD',
  theme: '#e8622c', theme2: '#f5cc36',
  dir: 'assets/img/tank', fw: 192, native: 1, scale: 1.86,
  anchor: { x: 70, y: 150 },
  body: { w: 34, h: 150, crouchH: 98 },
  walk: 2.6, jumpVy: -14.6, dashVx: 6.0, backdashVx: 5.8,
  dash: { from: 4, to: 18, vx: 5.8 },
  stats: { pow: 4, spd: 2, rng: 2 },
  dmgTaken: 0.8,   // 钰胜本体特性: 受伤 -20%(fighter.js hurt 读取)
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
    heavy: { // 铁壁重砸 (K·K 第一段, 击倒交给 heavy2)
      kind: 'heavy', name: '铁壁重砸', anim: 'attack2', total: 36, startup: 14, active: 6, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, edge: '#e8622c', core: '#ffe0c8' },
      dmg: 13, chip: 3, guardDmg: 24, box: { x1: 6, x2: 122, y1: -150, y2: 4 },
      knock: 8.5, hitstun: 26, blockstun: 17, hitstop: 10, shake: 6,
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

/* ================================================================================
   KIT 补全 (M1.4 · 英雄技能优化)
   原本只有剣二/隼人(mack/kenji)拥有完整招式表, 扩充花名册的七位只有
   J / K / 空J / U / I —— 没有 J·J 连打、没有 K·K 终结、没有蹲攻、没有空中重击,
   打起来"只有两个按钮"。这里按 data.js 的同一套语法把缺口补齐:

     light2   J·J 第二段(altL 自动交替)
     heavy2   K·K 终结段(仅在"K 真命中并连锁"时出现, 击倒由 main.js 的连锁规则给)
     clight   蹲J 低位快攻   clight2 蹲J·J 第二段(altCL 交替)
     cheavy   蹲K 挑空技(noChain + hop, 浮空后可接 I 超必)
     dive     空中 K 俯冲下砸(落地砸判定)
     dashslash 冲刺J 专属突进斩(速度/长枪型)
     airspecial 空中 U(远程型)

   实现约定(与原作者的手感调校保持一致):
   · 蹲攻身体全程用烘焙好的 crouch 帧(seq 里的 {a:'crouch', f:n} 引用), 刀光走
     程序化低位弧线 fx —— 蹲帧上没有画师烘焙的白月牙, 硬套 smear 会失效。
   · 挑空技/俯冲斩在判定窗切回攻击表的月牙帧(i: <smearFrame>), 所以能吃到
     帧同步重染, 与二侍同一条视觉管线。
   · 数值一律写"上调前"的量级(与 data.js 字面量同尺度) —— 文件末尾的
     「全员数值上调」系数会统一乘上去, 想整体调强弱只动那里的 K。
   ================================================================================ */
/* 低位平扫的程序化刀光(蹲攻用): reach 决定弧半径, back=true 反向回扫 */
const _lowFx = (reach, c1, c2, y = -50, back = false) => ({
  x: Math.round(reach * 0.52), y,
  r: Math.round(reach * 0.8), ry: 0.4,
  a0: back ? 0.1 : 2.78, a1: back ? 2.85 : 0.02,
  w: 11, life: 9, color: c1, color2: c2,
});
/* 蹲姿帧路径: 身体全程蹲着(入蹲→出招→回蹲), f 为 crouch 表里的出招帧 */
const _cSeq = (f) => ({ w: [{ a: 'crouch', f: 0 }], i: { a: 'crouch', f }, r: [{ a: 'crouch', f: 0 }] });
/* 挑空技帧路径: 从蹲姿弹起, 判定窗切回攻击表的月牙帧 imp */
const _upSeq = (imp, rec) => ({ w: [{ a: 'crouch', f: 0 }], i: imp, r: [rec] });

/* ================================================================================
   新英雄 晓艳 · 梅晓艳 (M1.4 追加, 玩家点名新增)
   名字拆解 —— 梅: 红梅 / 晓: 破晓的金 / 艳: 明艳的舞。据此定形:
     身份 = 剑舞者(BLOSSOM), 以红梅刀光起舞, 快斩+浮空, 招牌远程「梅吹雪」撒飞花,
     超必「満開・紅梅乱舞」走花瓣舞杀分镜(红梅/晓金配色)。
   精灵图是她专属的一套(不套任何现成角色模板): 由 _build/bake_roster4.py 新画 ——
   专属调色板 + 花簪双丸子头 + 交领旗袍舞衣 + 细剑/剑穗/绢带画笔, 另有第三套
   攻击表 Attack3(沉身低位突刺) 供蹲攻与冲刺斩使用。
   192px 帧 / 命中帧 f4 / attack1·2 烘了白月牙层 -> 引擎实时染成红梅色。
   ================================================================================ */
DATA.xiaoyan = {
  id: 'xiaoyan',
  name: 'XIAOYAN', cn: '晓艳', title: '紅梅の舞姫', type: 'BLOSSOM',
  theme: '#e23a6e', theme2: '#ffcf87',   // 红梅 + 破晓金
  dir: 'assets/img/xiaoyan', fw: 192, native: 1, scale: 1.8, // 专属帧(_build/bake_roster4.py)
  anchor: { x: 70, y: 150 },
  body: { w: 28, h: 146, crouchH: 94 },
  dash: { from: 3, to: 15, vx: 7.4 },
  walk: 3.9, jumpVy: -15.8, dashVx: 8.2, backdashVx: 7.4,
  stats: { pow: 3, spd: 5, rng: 4 },
  quoteWin: '梅开时节，正好落幕。', quoteLose: '这一枝……还没开够呢。',
  portrait: { x: 51, y: 66, w: 38, h: 38 },
  anims: {
    idle:    { file: 'Idle.png',    frames: 6, hold: 8,  loop: true },
    crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true },
    crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true },
    run:     { file: 'Run.png',     frames: 8, hold: 6,  loop: true },
    jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
    fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
    attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false, smearFrames: [4] }, // 斜上横扫(命中帧 f4)
    attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false, smearFrames: [4] }, // 过顶竖劈(命中帧 f4)
    attack3: { file: 'Attack3.png', frames: 7, hold: 5,  loop: false },                    // 沉身低突刺(无月牙)
    hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
    death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
  },
  moves: {
    light: { // 梅斬: 斜上一记红梅横扫, 快
      kind: 'light', anim: 'attack1', total: 21, startup: 5, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#e23a6e', core: '#ffe3ec' },
      dmg: 6, chip: 0, guardDmg: 10, box: { x1: 10, x2: 130, y1: -150, y2: -38 },
      knock: 4.5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    light2: { // 返梅(J·J 第二段): 顺势反手再劈
      kind: 'light', anim: 'attack2', total: 20, startup: 4, active: 5, impact: 4,
      seq: { w: [2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#c92a5a', core: '#ffe3ec' },
      dmg: 7, chip: 0, guardDmg: 10, box: { x1: 10, x2: 130, y1: -158, y2: -32 },
      knock: 5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    heavy: { // 紅梅斬: 过顶竖劈(K·K 第一段)
      kind: 'heavy', name: '紅梅斬', anim: 'attack2', total: 30, startup: 10, active: 6, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
      smear: { phases: [{ f: 4, t: 5 }], decay: 3, rim: 4, echo: { t: 3, dy: 6 }, edge: '#e23a6e', core: '#ffe3ec' },
      dmg: 11, chip: 2, guardDmg: 24, box: { x1: 10, x2: 136, y1: -162, y2: -30 },
      knock: 8, hitstun: 26, blockstun: 15, hitstop: 12, shake: 5,
      meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
    },
    heavy2: { // 落梅(K·K 终结): 前踏一记斜劈, 把人斩落击倒
      kind: 'heavy', name: '落梅', anim: 'attack1', total: 30, startup: 9, active: 6, impact: 4,
      seq: { w: [2, 3], i: 4, r: [5] }, dash: { from: 2, to: 10, vx: 6.4 },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 4, dx: 8 }, edge: '#ff7aa0', core: '#fff0f4' },
      dmg: 11, chip: 2, guardDmg: 24, box: { x1: 10, x2: 142, y1: -166, y2: -28 },
      knock: 9, hitstun: 28, blockstun: 15, hitstop: 13, shake: 6, launch: -10,
      meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
    },
    clight: { // 掃梅(蹲J): 沉身贴地长突刺(专属 Attack3 低架身法)
      kind: 'light', name: '掃梅', anim: 'attack3', total: 20, startup: 5, active: 5, impact: 4,
      seq: { w: [0, 1, 2, 3], i: 4, r: [5, 6] },
      fx: { thrust: true, x: 52, y: -42, color: '#ffe3ec', color2: '#e23a6e' },
      dmg: 4, chip: 0, guardDmg: 9, box: { x1: 14, x2: 146, y1: -62, y2: -4 },
      knock: 3.5, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
      meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
    },
    clight2: { // 掃梅·返(蹲J·J): 略抬半格的回刺
      kind: 'light', name: '掃梅·返', anim: 'attack3', total: 18, startup: 4, active: 4, impact: 4,
      seq: { w: [3], i: 4, r: [5, 6] },
      fx: { thrust: true, x: 52, y: -54, color: '#ffd6e0', color2: '#c92a5a' },
      dmg: 3, chip: 0, guardDmg: 9, box: { x1: 14, x2: 146, y1: -74, y2: -14 },
      knock: 4, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
      meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
    },
    cheavy: { // 昇梅(蹲K): 拔身而起的挑空斩(独立技), 浮空接超必
      kind: 'heavy', name: '昇梅', noChain: true, anim: 'attack1', total: 31,
      startup: 9, active: 6, impact: 4, seq: _upSeq(4, 5), hop: -7.5,
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#e23a6e', core: '#ffe3ec' },
      dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 128, y1: -178, y2: -14 },
      knock: 1.5, hitstun: 25, blockstun: 13, hitstop: 11, shake: 5, kd: true, launch: -16,
      meterHit: 11, sfx: 'whooshH', hitSfx: 'hitH',
    },
    air: { // 空梅斬
      kind: 'light', anim: 'attack1', total: 22, startup: 5, active: 7, impact: 4, air: true,
      smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#ff7aa0', core: '#fff0f4' },
      dmg: 6, chip: 0, guardDmg: 10, box: { x1: 6, x2: 116, y1: -142, y2: -24 },
      knock: 4, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
      meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
    },
    dive: { // 墜梅: 空中 K 斜下俯冲斩
      kind: 'heavy', name: '墜梅', anim: 'attack2', air: true, dive: true, impact: 4,
      startup: 7, diveSpeed: 15.5, diveDrift: 5, recovery: 22, slamActive: 8,
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#c92a5a', core: '#ffe3ec' },
      dmg: 10, chip: 3, guardDmg: 28, box: { x1: 0, x2: 132, y1: -96, y2: 10 },
      knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
      meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
    },
    dashslash: { // 疾梅斬(冲刺J): 借冲刺一记贯穿红梅斩, 速度型招牌
      kind: 'light', name: '疾梅斬', anim: 'attack1', total: 21, startup: 4, active: 6, impact: 4,
      seq: { w: [1], i: 4, r: [5] }, dash: { from: 0, to: 8, vx: 11.5 },
      smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dx: 10 }, edge: '#e23a6e', core: '#ffe3ec' },
      dmg: 8, chip: 1, guardDmg: 14, box: { x1: 8, x2: 138, y1: -146, y2: -34 },
      knock: 7, hitstun: 22, blockstun: 10, hitstop: 7, shake: 3,
      meterHit: 10, sfx: 'whooshH', hitSfx: 'hitH',
    },
    special: { // 梅吹雪: 撒出一朵旋转红梅飞花(中速弹, 招牌远程)
      kind: 'special', name: '梅吹雪', anim: 'attack1', total: 38, startup: 13, active: 1, impact: 4,
      cooldown: 92,
      projectile: { kind: 'plum', trail: 'rgba(226,58,110,0.7)', spread: [0], speed: 8.0,
                    dmg: 10, chip: 3, guardDmg: 18, y: -92,
                    hitstun: 24, blockstun: 13, knock: 4, hitstop: 6, meterHit: 13 },
      dmg: 0, meterHit: 5, sfx: 'projectile', hitSfx: 'hitL',
      flair: { x: 54, y: -92, ring: 16, spark: 11, sparkPow: 6, petals: 18, flash: 0.14, shake: 4,
               text: '梅吹雪!', color: '#ff7aa0', color2: '#e23a6e' },
    },
    super: { // 満開・紅梅乱舞 (花瓣舞杀分镜, 红梅晓金配色)
      kind: 'super', name: '満開・紅梅乱舞', anim: 'attack1', total: 52,
      startup: 13, active: 10, impact: 4, finisher: 'A',
      dmg: 4, chip: 3, guardDmg: 24, box: { x1: 8, x2: 140, y1: -158, y2: -36 },
      knock: 2, hitstun: 20, blockstun: 16, hitstop: 5, shake: 4,
      meterHit: 0, sfx: 'whooshH', hitSfx: 'hitH',
      cine: { hits: 5, interval: 7, dmgPer: 6, final: 14, style: 'fandance' },
      flair: { x: 34, y: -102, converge: 16, ring: 22, spark: 18, sparkPow: 8, petals: 36, rise: 5,
               flash: 0.3, shake: 8, color: '#ff7aa0', color2: '#e23a6e' },
    },
  },
};


/* ---------- 毅 wukong: 金箍棒全套 (POWER · 长棍压制) ---------- */
Object.assign(DATA.wukong.moves, {
  heavy2: { // 翻天棍(K·K 终结): 蹬地前踏一记横扫, 把人抽飞
    kind: 'heavy', name: '翻天棍', anim: 'attack1', total: 34, startup: 10, active: 6, impact: 4,
    seq: { w: [2, 3], i: 4, r: [5] }, dash: { from: 2, to: 11, vx: 5.6 },
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 4, dx: 8 }, edge: '#ff6b3d', core: '#ffe9c8' },
    dmg: 13, chip: 2, guardDmg: 26, box: { x1: 8, x2: 148, y1: -170, y2: -28 },
    knock: 9, hitstun: 28, blockstun: 16, hitstop: 12, shake: 6, launch: -9,
    meterHit: 14, sfx: 'whooshH', hitSfx: 'hitH',
  },
  clight: { // 扫堂棍: 贴地横扫, 起手快
    kind: 'light', anim: 'attack1', total: 22, startup: 6, active: 5, impact: 4,
    seq: _cSeq(2), fx: _lowFx(132, '#fff8e2', '#ffd24a'),
    dmg: 5, chip: 0, guardDmg: 10, box: { x1: 8, x2: 132, y1: -66, y2: -4 },
    knock: 3.5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 回扫棍(蹲J·J 第二段): 同一条棍路反手再来一次
    kind: 'light', anim: 'attack1', total: 20, startup: 5, active: 4, impact: 4,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(132, '#ffe9c8', '#ff9d3d', -46, true),
    dmg: 4, chip: 0, guardDmg: 10, box: { x1: 8, x2: 132, y1: -66, y2: -4 },
    knock: 4, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 齐天棍·昇: 蹲K 挑空(独立技), 浮空后可接超必
    kind: 'heavy', name: '齊天棍・昇', noChain: true, anim: 'attack1', total: 34,
    startup: 10, active: 6, impact: 4, seq: _upSeq(4, 5), hop: -8,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#ffd24a', core: '#fff8e2' },
    dmg: 11, chip: 2, guardDmg: 22, box: { x1: 4, x2: 138, y1: -182, y2: -14 },
    knock: 1.5, hitstun: 26, blockstun: 14, hitstop: 12, shake: 5, kd: true, launch: -15,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 碎地棍: 空中 K 俯冲, 落地一记砸地
    kind: 'heavy', name: '碎地棍', anim: 'attack2', air: true, dive: true, impact: 4,
    startup: 8, diveSpeed: 15, diveDrift: 4.5, recovery: 26, slamActive: 8,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 3, dx: 6 }, edge: '#ff6b3d', core: '#ffe9c8' },
    dmg: 11, chip: 3, guardDmg: 30, box: { x1: 10, x2: 152, y1: -104, y2: 10 },
    knock: 7, hitstun: 28, blockstun: 16, hitstop: 13, shake: 7, kd: true,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
});

/* ---------- 吉川 houyi: 弓神的近身自保 (RANGE) ----------
   他的 J/K/空J 本体全是箭(box:null), 飞行道具不会置 move.contact, 所以连锁
   永远不成立 —— light2/heavy2 挂上去也是死代码。真正缺的是"被贴脸怎么办":
   补一整套蹲攻 + 挑空 + 空中下砸, 全部是有判定框的近战, 让 zoner 有拆招手段。 */
Object.assign(DATA.houyi.moves, {
  clight: { // 弓身横打: 用弓臂贴地一扫
    kind: 'light', name: '弓臂横打', anim: 'attack2', total: 21, startup: 5, active: 5, impact: 3,
    seq: _cSeq(2), fx: _lowFx(114, '#e8f0ff', '#7d9fd0'),
    dmg: 5, chip: 0, guardDmg: 10, box: { x1: 8, x2: 114, y1: -64, y2: -4 },
    knock: 4, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 弓尾回扫
    kind: 'light', anim: 'attack2', total: 19, startup: 4, active: 4, impact: 3,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(114, '#c6d0e0', '#4a6cb0', -44, true),
    dmg: 4, chip: 0, guardDmg: 10, box: { x1: 8, x2: 114, y1: -64, y2: -4 },
    knock: 4.5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 射日撩: 弓身上撩挑空(独立技), 专治跳入
    kind: 'heavy', name: '射日撩', noChain: true, anim: 'attack2', total: 32,
    startup: 9, active: 6, impact: 3, seq: _upSeq(3, 4), hop: -7,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#ffb648', core: '#fff2d8' },
    dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 122, y1: -178, y2: -14 },
    knock: 1.5, hitstun: 26, blockstun: 14, hitstop: 11, shake: 5, kd: true, launch: -15,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 落日踏: 空中 K 俯冲踏击
    kind: 'heavy', name: '落日踏', anim: 'attack2', air: true, dive: true, impact: 3,
    startup: 7, diveSpeed: 15, diveDrift: 5, recovery: 24, slamActive: 8,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#ffb648', core: '#fff2d8' },
    dmg: 10, chip: 3, guardDmg: 28, box: { x1: 6, x2: 132, y1: -98, y2: 10 },
    knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
});

/* ---------- 景英 angela: 烈焰全套 (MAGE · 中距压制) ---------- */
Object.assign(DATA.angela.moves, {
  light2: { // 炎尖二连(J·J 第二段): 同一记杖尖, 抬高半格再补一下
    kind: 'light', anim: 'attack1', total: 20, startup: 5, active: 5, impact: 3,
    seq: { w: [2], i: 3, r: [4] },
    smear: { phases: [{ f: 3, t: 4 }], decay: 2, edge: '#ffb648', core: '#fff2d8' },
    dmg: 7, chip: 0, guardDmg: 9, box: { x1: 10, x2: 120, y1: -160, y2: -50 },
    knock: 5, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  heavy2: { // 炎爆撃(K·K 终结): 上前半步, 把火焰整团轰出去
    kind: 'heavy', name: '炎爆撃', anim: 'attack1', total: 32, startup: 10, active: 6, impact: 3,
    seq: { w: [1, 2], i: 3, r: [4] }, dash: { from: 2, to: 10, vx: 5.2 },
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, rim: 4, echo: { t: 4, dx: 7 }, edge: '#ff4a2e', core: '#ffe0a8' },
    dmg: 12, chip: 2, guardDmg: 22, box: { x1: 8, x2: 132, y1: -164, y2: -30 },
    knock: 9, hitstun: 27, blockstun: 15, hitstop: 12, shake: 6, launch: -9,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
  clight: { // 焰扫: 贴地一道火线
    kind: 'light', anim: 'attack1', total: 21, startup: 5, active: 5, impact: 3,
    seq: _cSeq(2), fx: _lowFx(112, '#ffe9c8', '#ff8428'),
    dmg: 5, chip: 0, guardDmg: 9, box: { x1: 8, x2: 112, y1: -62, y2: -4 },
    knock: 3.5, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 焰扫·返
    kind: 'light', anim: 'attack1', total: 19, startup: 4, active: 4, impact: 3,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(112, '#ffd8a8', '#c94aff', -44, true),
    dmg: 4, chip: 0, guardDmg: 9, box: { x1: 8, x2: 112, y1: -62, y2: -4 },
    knock: 4, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 昇炎: 一柱火焰把人挑上天(独立技)
    kind: 'heavy', name: '昇炎', noChain: true, anim: 'attack1', total: 32,
    startup: 9, active: 6, impact: 3, seq: _upSeq(3, 4), hop: -7,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#ff6b3d', core: '#ffe9c8' },
    dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 118, y1: -176, y2: -14 },
    knock: 1.5, hitstun: 25, blockstun: 13, hitstop: 11, shake: 5, kd: true, launch: -15,
    meterHit: 11, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 流星撞: 裹着火焰砸下来
    kind: 'heavy', name: '流星撞', anim: 'attack1', air: true, dive: true, impact: 3,
    startup: 7, diveSpeed: 14.5, diveDrift: 4.5, recovery: 24, slamActive: 8,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#ff6b3d', core: '#ffd8a8' },
    dmg: 10, chip: 3, guardDmg: 26, box: { x1: 6, x2: 122, y1: -96, y2: 10 },
    knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  airspecial: { // 空中火球: 斜下砸的小火球, 制空压制
    kind: 'special', name: '空中火球', anim: 'attack2', air: true, total: 30,
    startup: 10, active: 1, impact: 4, cooldown: 82,
    projectile: { kind: 'fireball', trail: 'rgba(255,132,40,0.75)', spread: [4], speed: 7.2,
                  dmg: 8, chip: 2, guardDmg: 14, y: -60, launch: -10,
                  hitstun: 22, blockstun: 12, knock: 4, hitstop: 6, meterHit: 11 },
    dmg: 0, meterHit: 4, sfx: 'projectile', hitSfx: 'hitH',
  },
});

/* ---------- 文萱 diaochan: 双扇全套 (DANCE · 速度型) ---------- */
Object.assign(DATA.diaochan.moves, {
  light2: { // 双扇连斩(J·J 第二段): 另一把扇低半格补一刀
    kind: 'light', anim: 'attack2', total: 19, startup: 4, active: 5, impact: 4,
    seq: { w: [3], i: 4, r: [5] },
    smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#e2547a', core: '#ffe0e8' },
    dmg: 7, chip: 0, guardDmg: 9, box: { x1: 10, x2: 124, y1: -140, y2: -34 },
    knock: 5, hitstun: 18, blockstun: 11, hitstop: 5, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  heavy2: { // 旋舞落扇(K·K 终结): 借旋身前踏, 一扇把人抽出去
    kind: 'heavy', name: '旋舞落扇', anim: 'attack1', total: 30, startup: 9, active: 6, impact: 4,
    seq: { w: [2, 3], i: 4, r: [5] }, dash: { from: 2, to: 10, vx: 6.2 },
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 4, dx: 8 }, edge: '#ff9db8', core: '#fff0f4' },
    dmg: 11, chip: 2, guardDmg: 22, box: { x1: 8, x2: 136, y1: -158, y2: -28 },
    knock: 9, hitstun: 27, blockstun: 15, hitstop: 11, shake: 5, launch: -10,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
  clight: { // 裙下扇: 贴地一记扇刃
    kind: 'light', anim: 'attack1', total: 20, startup: 5, active: 5, impact: 4,
    seq: _cSeq(2), fx: _lowFx(118, '#fff0f4', '#e2547a'),
    dmg: 5, chip: 0, guardDmg: 9, box: { x1: 8, x2: 118, y1: -62, y2: -4 },
    knock: 3.5, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 裙下扇·返
    kind: 'light', anim: 'attack1', total: 18, startup: 4, active: 4, impact: 4,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(118, '#ffe0e8', '#ff9db8', -44, true),
    dmg: 4, chip: 0, guardDmg: 9, box: { x1: 8, x2: 118, y1: -62, y2: -4 },
    knock: 4, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 舞踏昇: 旋身腾起的挑空扇(独立技)
    kind: 'heavy', name: '舞踏昇', noChain: true, anim: 'attack1', total: 30,
    startup: 8, active: 6, impact: 4, seq: _upSeq(4, 5), hop: -7.5,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#ff9db8', core: '#fff0f4' },
    dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 124, y1: -178, y2: -14 },
    knock: 1.5, hitstun: 25, blockstun: 13, hitstop: 11, shake: 5, kd: true, launch: -16,
    meterHit: 11, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 花墜: 空中 K 旋身坠地
    kind: 'heavy', name: '花墜', anim: 'attack2', air: true, dive: true, impact: 4,
    startup: 7, diveSpeed: 15, diveDrift: 5, recovery: 22, slamActive: 8,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#e2547a', core: '#ffe0e8' },
    dmg: 10, chip: 2, guardDmg: 26, box: { x1: 6, x2: 126, y1: -96, y2: 10 },
    knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dashslash: { // 疾舞斬(冲刺J): 借冲刺的一记贯穿扇, 速度型招牌
    kind: 'light', name: '疾舞斬', anim: 'attack1', total: 20, startup: 4, active: 6, impact: 4,
    seq: { w: [1], i: 4, r: [5] }, dash: { from: 0, to: 8, vx: 11.5 },
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dx: 10 }, edge: '#ff9db8', core: '#fff0f4' },
    dmg: 8, chip: 1, guardDmg: 13, box: { x1: 8, x2: 124, y1: -142, y2: -34 },
    knock: 7, hitstun: 22, blockstun: 10, hitstop: 7, shake: 3,
    meterHit: 10, sfx: 'whooshH', hitSfx: 'hitH',
  },
});

/* ---------- 泽轩 doctor: 算法教授的近身自保 (TECH · zoner) ----------
   同 houyi: J/K/空J 全是投掷物, 连锁不成立 —— 补的是"被贴脸的出路"。 */
Object.assign(DATA.doctor.moves, {
  clight: { // 低位扫腿: 一脚把贴脸的人踢开
    kind: 'light', name: '扫腿', anim: 'attack1', total: 20, startup: 5, active: 5, impact: 4,
    seq: _cSeq(2), fx: _lowFx(112, '#7fd3ff', '#50a0dc'),
    dmg: 5, chip: 0, guardDmg: 10, box: { x1: 8, x2: 112, y1: -62, y2: -4 },
    knock: 4.5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 扫腿·返
    kind: 'light', anim: 'attack1', total: 18, startup: 4, active: 4, impact: 4,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(112, '#d8f2ff', '#2a66a8', -44, true),
    dmg: 4, chip: 0, guardDmg: 10, box: { x1: 8, x2: 112, y1: -62, y2: -4 },
    knock: 5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 抬机上砸: 笔电当锤往上撩, 挑空(独立技)
    kind: 'heavy', name: '抬机上砸', noChain: true, anim: 'attack1', total: 32,
    startup: 9, active: 6, impact: 4, seq: _upSeq(4, 5), hop: -7,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#7fd3ff', core: '#e8f8ff' },
    dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 118, y1: -178, y2: -14 },
    knock: 1.5, hitstun: 25, blockstun: 13, hitstop: 11, shake: 5, kd: true, launch: -15,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 俯冲部署: 抱着笔电砸下来
    kind: 'heavy', name: '俯冲部署', anim: 'attack2', air: true, dive: true, impact: 4,
    startup: 7, diveSpeed: 15, diveDrift: 5, recovery: 24, slamActive: 8,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#50a0dc', core: '#d8f2ff' },
    dmg: 10, chip: 3, guardDmg: 28, box: { x1: 6, x2: 126, y1: -98, y2: 10 },
    knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
  airspecial: { // 空中热更新: 斜下抛的数据包
    kind: 'special', name: '空中热更新', anim: 'attack2', air: true, total: 28,
    startup: 10, active: 1, impact: 4, cooldown: 76,
    projectile: { kind: 'datapack', trail: 'rgba(127,211,255,0.7)', spread: [4], speed: 8.6,
                  dmg: 8, chip: 2, guardDmg: 13, y: -60, launch: -10,
                  hitstun: 21, blockstun: 11, knock: 3, hitstop: 5, meterHit: 10 },
    dmg: 0, meterHit: 4, sfx: 'projectile', hitSfx: 'hitL',
    flair: { x: 38, y: -60, ring: 10, spark: 7, color: '#7fd3ff', color2: '#2a66a8' },
  },
});

/* ---------- 钰胜 tank: 盾与扳手全套 (GUARD · 抗打压制) ---------- */
Object.assign(DATA.tank.moves, {
  light2: { // 扳手回打(J·J 第二段)
    kind: 'light', anim: 'attack2', total: 22, startup: 5, active: 5, impact: 4,
    seq: { w: [3], i: 4, r: [5] },
    smear: { phases: [{ f: 4, t: 4 }], decay: 2, edge: '#e8622c', core: '#ffe0c8' },
    dmg: 9, chip: 1, guardDmg: 14, box: { x1: 10, x2: 114, y1: -134, y2: -30 },
    knock: 5.5, hitstun: 20, blockstun: 12, hitstop: 6, shake: 3,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  heavy2: { // 盾锤终结(K·K 终结): 整块盾压上去
    kind: 'heavy', name: '盾锤终结', anim: 'attack1', total: 34, startup: 11, active: 6, impact: 4,
    seq: { w: [2, 3], i: 4, r: [5] }, dash: { from: 2, to: 12, vx: 5.0 },
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 4, dx: 7 }, edge: '#f5cc36', core: '#fff4d8' },
    dmg: 13, chip: 3, guardDmg: 28, box: { x1: 6, x2: 128, y1: -156, y2: -20 },
    knock: 9.5, hitstun: 28, blockstun: 17, hitstop: 13, shake: 7, launch: -8,
    meterHit: 14, sfx: 'whooshH', hitSfx: 'hitH',
  },
  clight: { // 低位盾撞: 蹲着把盾往前一顶
    kind: 'light', anim: 'attack1', total: 22, startup: 6, active: 5, impact: 4,
    seq: _cSeq(2), fx: _lowFx(106, '#fff4d8', '#f5cc36'),
    dmg: 6, chip: 1, guardDmg: 12, box: { x1: 8, x2: 106, y1: -66, y2: -2 },
    knock: 4, hitstun: 17, blockstun: 11, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 盾缘刮击
    kind: 'light', anim: 'attack1', total: 20, startup: 5, active: 4, impact: 4,
    seq: _cSeq(3), cullSmear: true, fx: _lowFx(106, '#ffe0c8', '#e8622c', -46, true),
    dmg: 5, chip: 1, guardDmg: 12, box: { x1: 8, x2: 106, y1: -66, y2: -2 },
    knock: 4.5, hitstun: 17, blockstun: 11, hitstop: 5, shake: 2,
    meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 顶盾昇: 盾面上顶挑空(独立技), 对空最硬
    kind: 'heavy', name: '顶盾昇', noChain: true, anim: 'attack1', total: 34,
    startup: 10, active: 7, impact: 4, seq: _upSeq(4, 5), hop: -7,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#f5cc36', core: '#fff4d8' },
    dmg: 11, chip: 2, guardDmg: 24, box: { x1: 2, x2: 114, y1: -180, y2: -12 },
    knock: 1.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true, launch: -14.5,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 重压坠: 带着盾整个人砸下来, 全场最重的下砸
    kind: 'heavy', name: '重压坠', anim: 'attack2', air: true, dive: true, impact: 4,
    startup: 8, diveSpeed: 16, diveDrift: 4, recovery: 28, slamActive: 9,
    smear: { phases: [{ f: 4, t: 5 }], decay: 2, rim: 4, echo: { t: 3, dx: 6 }, edge: '#e8622c', core: '#ffe0c8' },
    dmg: 12, chip: 3, guardDmg: 34, box: { x1: 4, x2: 124, y1: -100, y2: 12 },
    knock: 7.5, hitstun: 28, blockstun: 17, hitstop: 14, shake: 9, kd: true,
    meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
  },
});

/* ---------- 欣韵 ayame: 长枪补全 (REACH) ----------
   注意: Huntress 素材没有蹲帧(crouch 占位 = Idle), 所以她的蹲攻不引用 crouch 帧,
   而是直接用 attack3 的长突刺身体 + 压低的判定框/枪光 —— 读作"沉身低突", 不会
   出现"站着却是蹲判定"的怪帧。 */
Object.assign(DATA.ayame.moves, {
  clight: { // 低突き: 沉身贴地长刺, 全场最长的低位判定
    kind: 'light', name: '低突き', anim: 'attack3', total: 21, startup: 5, active: 5, impact: 4,
    seq: { w: [0, 1], i: 4, r: [5, 6] },
    fx: { thrust: true, x: 58, y: -46, color: '#eef4ff', color2: '#8fb0ff' },
    dmg: 4, chip: 0, guardDmg: 9, box: { x1: 18, x2: 198, y1: -66, y2: -6 },
    knock: 3.5, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
  },
  clight2: { // 返し突き: 收枪即再刺, 略高一点
    kind: 'light', name: '返し突き', anim: 'attack3', total: 19, startup: 4, active: 4, impact: 4,
    seq: { w: [2], i: 4, r: [5, 6] },
    fx: { thrust: true, x: 58, y: -58, color: '#dfe8ff', color2: '#5b7dff' },
    dmg: 3, chip: 0, guardDmg: 9, box: { x1: 18, x2: 198, y1: -78, y2: -16 },
    knock: 4, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
    meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
  },
  cheavy: { // 月輪撩: 枪尖上撩挑空(独立技)
    kind: 'heavy', name: '月輪撩', noChain: true, anim: 'attack1', total: 31,
    startup: 9, active: 6, impact: 3, seq: { w: [0], i: 3, r: [4] }, hop: -7.5,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, rim: 4, attach: true, edge: '#5b7dff', core: '#e8f0ff' },
    dmg: 10, chip: 2, guardDmg: 22, box: { x1: 4, x2: 168, y1: -186, y2: -14 },
    knock: 1.5, hitstun: 25, blockstun: 13, hitstop: 11, shake: 5, kd: true, launch: -16,
    meterHit: 11, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dive: { // 墜月突: 空中 K 斜下俯冲刺
    kind: 'heavy', name: '墜月突', anim: 'attack2', air: true, dive: true, impact: 3,
    startup: 7, diveSpeed: 15.5, diveDrift: 5, recovery: 24, slamActive: 8,
    smear: { phases: [{ f: 3, t: 5 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#4a63d8', core: '#dfe8ff' },
    dmg: 10, chip: 3, guardDmg: 28, box: { x1: 0, x2: 168, y1: -98, y2: 10 },
    knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 6, kd: true,
    meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
  },
  dashslash: { // 疾走突(冲刺J): 借冲刺把枪整条送出去
    kind: 'light', name: '疾走突', anim: 'attack3', total: 21, startup: 4, active: 6, impact: 4,
    seq: { w: [0], i: 4, r: [5, 6] }, dash: { from: 0, to: 8, vx: 10.5 },
    fx: { thrust: true, x: 66, y: -76, color: '#ffffff', color2: '#8fb0ff' },
    dmg: 8, chip: 1, guardDmg: 14, box: { x1: 16, x2: 208, y1: -108, y2: -46 },
    knock: 7, hitstun: 22, blockstun: 10, hitstop: 7, shake: 3,
    meterHit: 10, sfx: 'whooshH', hitSfx: 'hitH',
  },
});

/* 新招的演出层: 挑空/俯冲/冲刺斩各挂一份轻量 flair(与既有 FLAIR 表同格式) */
for (const [cid, tbl] of Object.entries({
  wukong:   { cheavy: { x: 34, y: -120, ring: 12, spark: 9, sparkPow: 5, rise: 4, color: '#ffd24a', color2: '#ff6b3d' },
              dive:   { x: 26, y: -56, shock: 2, dust: 12, spark: 10, sparkPow: 6, shake: 5, color: '#ffd24a', color2: '#ff6b3d' },
              heavy2: { x: 52, y: -92, dust: 6, spark: 8, sparkPow: 5, shake: 3, color: '#ff6b3d', color2: '#e8b22a' } },
  houyi:    { cheavy: { x: 30, y: -116, ring: 12, spark: 9, rise: 4, color: '#ffb648', color2: '#4a6cb0' },
              dive:   { x: 24, y: -54, dust: 10, spark: 9, shake: 4, color: '#ffb648', color2: '#c6d0e0' } },
  angela:   { cheavy: { x: 30, y: -114, ring: 12, spark: 10, rise: 6, color: '#ff8428', color2: '#c94aff' },
              dive:   { x: 24, y: -54, dust: 10, spark: 9, shake: 4, color: '#ff6b3d', color2: '#864aac' },
              heavy2: { x: 46, y: -90, ring: 10, spark: 9, flash: 0.1, shake: 3, color: '#ff8428', color2: '#ff4a2e' } },
  diaochan: { cheavy: { x: 30, y: -114, ring: 12, spark: 9, petals: 12, rise: 4, color: '#ff9db8', color2: '#e2547a' },
              dive:   { x: 24, y: -54, dust: 10, spark: 9, petals: 10, shake: 4, color: '#ff9db8', color2: '#e2547a' },
              dashslash: { x: 52, y: -88, dust: 8, spark: 8, sparkPow: 4, shake: 3, color: '#ff9db8', color2: '#e2547a' } },
  doctor:   { cheavy: { x: 30, y: -114, ring: 12, spark: 9, rise: 4, color: '#7fd3ff', color2: '#2a66a8' },
              dive:   { x: 24, y: -54, dust: 10, spark: 9, shake: 4, color: '#7fd3ff', color2: '#50a0dc' } },
  tank:     { cheavy: { x: 26, y: -114, ring: 14, spark: 10, sparkPow: 6, rise: 4, color: '#f5cc36', color2: '#e8622c' },
              dive:   { x: 22, y: -50, shock: 3, dust: 16, spark: 12, sparkPow: 7, shake: 7, color: '#f5cc36', color2: '#e8622c' },
              heavy2: { x: 44, y: -86, shock: 2, dust: 10, spark: 9, shake: 5, color: '#f5cc36', color2: '#e8622c' } },
  ayame:    { cheavy: { x: 30, y: -118, ring: 12, spark: 9, rise: 4, color: '#c8d8ff', color2: '#5b7dff' },
              dive:   { x: 24, y: -54, dust: 10, spark: 9, shake: 4, color: '#c8d8ff', color2: '#5b7dff' },
              dashslash: { x: 62, y: -84, dust: 8, spark: 8, shake: 3, color: '#c8d8ff', color2: '#5b7dff' } },
})) {
  const mv = DATA[cid] && DATA[cid].moves;
  if (!mv) continue;
  for (const [k, f] of Object.entries(tbl)) if (mv[k] && !mv[k].flair) mv[k].flair = f;
}


/* ================================================================================
   必杀 / 超必 范围 + 炫酷强化 (M1.4 ·「必杀技范围不够大, 不够炫酷」)
   两件事一起做, 而且都做成"看得见=打得到"(判定盒与视觉同一系数, 不做欺骗性判定):

   A) 范围: 近战必杀的判定框横向拉长、纵向加高; 远程必杀的弹体放大(hitScale,
      Projectile.box/draw 同时读取); 超必分镜的 cine 判定盒统一加宽。
   B) 炫酷: 给每个必杀/超必补/加强一层 flair(冲击环、星屑、光柱、震屏、喊招),
      原本没有 flair 的补上, 已有的适度加料 —— 放技能"有排面"。

   数值写在「全员上调」系数之前, 所以伤害仍会被统一系数抬一档; 这里只动
   range/演出, 不重复调伤害。 */
(() => {
  // 近战必杀: [横向额外 reach, 顶部额外高度, 底部额外下探]
  const MELEE_SPECIAL = {
    mack:  [46, 24, 6], ayame: [40, 20, 6], wukong: [40, 22, 6], tank: [40, 20, 8],
  };
  for (const [cid, [dx, up, dn]] of Object.entries(MELEE_SPECIAL)) {
    const m = DATA[cid] && DATA[cid].moves.special;
    if (!m || !m.box) continue;
    m.box = { x1: m.box.x1, x2: m.box.x2 + dx, y1: m.box.y1 - up, y2: m.box.y2 + dn };
    m._rangeBoosted = true;
  }

  // 远程必杀: 弹体放大系数(判定+画面同步)。airspecial 一并放大, 弹幕更有存在感
  const PROJ_SCALE = {
    kenji: 1.5, houyi: 1.5, angela: 1.7, diaochan: 1.6, doctor: 1.5, xiaoyan: 1.6,
  };
  for (const [cid, s] of Object.entries(PROJ_SCALE)) {
    for (const mk of ['special', 'airspecial']) {
      const m = DATA[cid] && DATA[cid].moves[mk];
      if (m && m.projectile) { m.projectile.hitScale = s; m._rangeBoosted = true; }
    }
  }

  // 超必: 分镜命中盒统一加宽 —— 超必是"全屏大招", 站得稍偏也该扫得到
  for (const c of Object.values(DATA)) {
    const m = c.moves && c.moves.super;
    if (m && m.box) {
      m.box = { x1: Math.min(m.box.x1, -10), x2: m.box.x2 + 48, y1: m.box.y1 - 20, y2: m.box.y2 + 12 };
    }
  }

  // 炫酷层: 必杀/超必没有 flair 的补一份, 已有的不动(尊重原作者调好的排场)
  const FX_SPECIAL = {
    mack:  { x: 62, y: -96, converge: 10, ring: 18, shock: 2, spark: 14, sparkPow: 6, dust: 8, flash: 0.16, shake: 5 },
    kenji: { x: 46, y: -95, ring: 14, spark: 10, sparkPow: 5, flash: 0.12 },
  };
  const genColors = cid => ({ color: DATA[cid].theme2, color2: DATA[cid].theme });
  for (const cid of Object.keys(DATA)) {   // ROSTER 在文件末尾才声明, 这里用 DATA 键
    const mv = DATA[cid].moves;
    // 必杀: 没有 flair 就补一份带招名喊话的中量级演出
    if (mv.special && !mv.special.flair) {
      const base = FX_SPECIAL[cid] || { x: 54, y: -94, converge: 8, ring: 15, spark: 12, sparkPow: 6, dust: 6, flash: 0.14, shake: 4 };
      mv.special.flair = Object.assign({}, base, genColors(cid),
        { text: (mv.special.name || '必殺') + '!' });
    }
    // 超必: 没有 flair 就补一份"大招级"演出(光柱 + 强闪 + 强震 + 大喊)
    if (mv.super && !mv.super.flair) {
      mv.super.flair = Object.assign(
        { x: 36, y: -104, converge: 18, ring: 24, shock: 3, spark: 20, sparkPow: 8,
          pillar: true, rise: 5, flash: 0.32, shake: 9, textSize: 18 },
        genColors(cid), { text: (mv.super.name || '超必殺') + '!!' });
    }
  }
})();


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
const ROSTER = ['mack', 'kenji', 'ayame', 'wukong', 'houyi', 'angela', 'diaochan', 'doctor', 'tank', 'xiaoyan'];
