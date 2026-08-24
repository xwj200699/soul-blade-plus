/* Stage constants + full character data: animations, frame data, movesets.
   Sprites: LuizMelo "Martial Hero" & "Martial Hero 2" (itch.io, free license).
   Move timing is in 60fps ticks. Hitboxes are relative to the fighter anchor
   (feet center), x extends along facing direction. */
'use strict';

const STAGE = { w: 1024, h: 576, ground: 480, left: 60, right: 964 };

/* 外部 fx 素材表(LuizMelo Martial Hero 3, CC0): 只取刀光 smear 层做新笔迹,
   身体帧不用(服装不同)。帧为正方形, 边长=图高(126), 像素密度与主角色一致。
   A1 竖劈月牙 / A2 大回旋巨弧(留给必杀·新角色) / A3 贴身小旋斩 */
const FX_SHEETS = {
  mh3a1: { file: 'assets/img/mh3/Attack1.png', frames: 7, smearFrames: [4, 5] },
  mh3a2: { file: 'assets/img/mh3/Attack2.png', frames: 6, smearFrames: [3, 4] },
  mh3a3: { file: 'assets/img/mh3/Attack3.png', frames: 9, smearFrames: [6, 7] },
  // 离线修复的干净月牙(assets/img/fxcres): 豁口边界插值补齐+闭运算,
  // 逐张人工验收过 —— standalone 招式一律用这些, 不再用带身体咬痕的原始帧
  ka1: { file: 'assets/img/fxcres/kenji-a1.png', frames: 1, smearFrames: [0] },
  ka2: { file: 'assets/img/fxcres/kenji-a2.png', frames: 1, smearFrames: [0] },
  ma2: { file: 'assets/img/fxcres/mack-a2.png', frames: 2, smearFrames: [0, 1] },
};

const CHAIN_RANK = { light: 1, heavy: 2, special: 3, super: 4 };

const DATA = {
  mack: {
    id: 'mack',
    name: 'WENJIE', cn: '文杰', title: '豪剣の侍', type: 'POWER',
    theme: '#ff4a3d', theme2: '#ffc531',
    dir: 'assets/img/mack', native: 1, scale: 2.75,
    anchor: { x: 98, y: 122 },
    walk: 3.0, jumpVy: -16, dashVx: 7.6, backdashVx: 6.5, // 平衡: 冲刺 9->8->7.2->7.6(7.2 配合隼人手长buff过矫, 镜像反超38%后捞回半格); Hayato 走默认 9/7.5
    stats: { pow: 5, spd: 3, rng: 5 },
    quoteWin: '刀は、鞘に戻った。', quoteLose: '……見事だ。もう一度！',
    portrait: { x: 64, y: 40, w: 68, h: 68 },
    anims: {
      idle:    { file: 'Idle.png',    frames: 8, hold: 7,  loop: true },
      crouch:  { file: 'Crouch.png',  frames: 8, hold: 8,  loop: true }, // 分段压缩烘焙,保留呼吸动画
      crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true }, // 入蹲过渡(半程)
      run:     { file: 'Run.png',     frames: 8, hold: 6,  loop: true },
      jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
      fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
      attack1: { file: 'Attack1.png', frames: 6, hold: 5,  loop: false, smearFrames: [4, 5] }, // 画师烘焙月牙所在帧
      attack2: { file: 'Attack2.png', frames: 6, hold: 6,  loop: false, smearFrames: [4, 5] },
      hit:     { file: 'TakeHit.png', frames: 4, hold: 5,  loop: false },
      death:   { file: 'Death.png',   frames: 6, hold: 7,  loop: false },
    },
    moves: {
      /* seq = custom frame path: w(indup) -> i(mpact, held on active) -> r(ecovery) */
      light: { // 正手斩: 抬刀 -> 月牙斩 -> 收势 · 素材月牙重染(月华式 smear)
        kind: 'light', anim: 'attack1', total: 24, startup: 6, active: 6, impact: 4, // 平衡 2026-07-11: 7->6, 拉平第一下竞速(隼人 light 6t; 其速度身份在 light2 4t/短收招/走速)
        seq: { w: [0, 1, 2, 3], i: 4, r: [5] },
        smear: { phases: [{ f: 4, t: 4 }, { f: 5, t: 3 }], decay: 2, edge: '#ffd24a', core: '#fff8e2' },
        fx: { x: 103, y: -101, r: 116, ry: 0.6, a0: 2.3, a1: -2.35, w: 13, life: 11, color: '#fff6d8', color2: '#ffd24a' },
        dmg: 6, chip: 0, guardDmg: 11, box: { x1: 15, x2: 208, y1: -175, y2: -40 },
        knock: 4.5, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
        meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
      },
      light2: { // 低位快扫(J·J 第二段): 高斩接低扫,来回变线 · smear 深金
        kind: 'light', anim: 'attack2', total: 21, startup: 5, active: 5, impact: 4,
        seq: { w: [3], i: 4, r: [5] },
        smear: { phases: [{ f: 4, t: 4 }, { f: 5, t: 3 }], decay: 2, edge: '#e8a83c', core: '#fff2c8' },
        fx: { x: 113, y: -142, r: 120, ry: 0.82, a0: 2.75, a1: 0.05, w: 12, life: 10, color: '#fff2c8', color2: '#e8a83c' },
        dmg: 7, chip: 0, guardDmg: 11, box: { x1: 15, x2: 208, y1: -160, y2: -30 },
        knock: 5, hitstun: 19, blockstun: 11, hitstop: 5, shake: 2,
        meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
      },
      heavy: { // 低位横扫 · 素材月牙重染(重击深金) + 月华级冻结
        kind: 'heavy', anim: 'attack2', total: 32, startup: 11, active: 6, impact: 4,
        seq: { w: [0, 1, 2, 3], i: 4, r: [5, 0] },
        smear: { phases: [{ f: 4, t: 5 }, { f: 5, t: 4 }], decay: 2, rim: 4, echo: { t: 3, dx: 6 }, edge: '#ffb32e', core: '#fff3cf' },
        fx: { x: 113, y: -142, r: 126, ry: 0.82, a0: 2.75, a1: 0.05, w: 20, life: 13, grow: 0.6, color: '#fff3cf', color2: '#ffc531' },
        dmg: 10, chip: 2, guardDmg: 28, box: { x1: 15, x2: 208, y1: -185, y2: -35 }, // 平衡: 11->10(Eric: 剑二伤害偏高)
        knock: 8, hitstun: 26, blockstun: 15, hitstop: 13, shake: 5,
        meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
      },
      heavy2: { // 大月牙终结斩(K·K 第二段): 蹬地前踏补足击退距离 · smear 红金终结
        kind: 'heavy', anim: 'attack1', total: 30, startup: 9, active: 6, impact: 4,
        seq: { w: [2, 3], i: 4, r: [5, 0] }, dash: { from: 2, to: 10, vx: 6.5 },
        smear: { phases: [{ f: 4, t: 5 }, { f: 5, t: 4 }], decay: 2, rim: 4, echo: { t: 4, dx: 8 }, edge: '#ff5a35', core: '#ffe27a' },
        fx: { x: 103, y: -101, r: 126, ry: 0.6, a0: 2.3, a1: -2.35, w: 22, life: 14, grow: 0.8, color: '#ffe27a', color2: '#ff4a3d' },
        dmg: 10, chip: 2, guardDmg: 28, box: { x1: 15, x2: 208, y1: -190, y2: -35 }, // 平衡: 12->11->10(2026-07-11 Eric: 剣二一波半血过强, 只动这一个旋钮)
        knock: 9, hitstun: 28, blockstun: 15, hitstop: 14, shake: 6,
        meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
      },
      clight: { // 蹲斩·削足: 身体全程蹲姿(合成), 刀光低位平扫作独立基底 —— 蹲着快速出刀
        kind: 'light', anim: 'attack2', total: 22, startup: 6, active: 5, impact: 4,
        seq: { w: [{ a: 'crouch', f: 0 }], i: { a: 'crouch', f: 2 }, r: [{ a: 'crouch', f: 0 }] },
        smear: { standalone: true, sheet: 'fx:ma2', phases: [{ f: 0, t: 4 }, { f: 1, t: 3 }], decay: 2, dy: 26, squashY: 0.8, edge: '#ffc531', core: '#fff2c8' },
        fx: { x: 100, y: -70, r: 110, ry: 0.42, a0: 2.75, a1: 0.05, w: 12, life: 10, color: '#fff2c8', color2: '#ffc531' },
        dmg: 5, chip: 0, guardDmg: 10, box: { x1: 10, x2: 208, y1: -70, y2: -5 },
        knock: 3.5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      clight2: { // 蹲斩·返し(蹲J·J 第二段): 全程蹲姿合成, 三个刀光方案由 smearAlt 切换
        kind: 'light', anim: 'attack2', total: 20, startup: 5, active: 4, impact: 4,
        seq: { w: [{ a: 'crouch', f: 0 }], i: { a: 'crouch', f: 3 }, r: [{ a: 'crouch', f: 0 }] },
        // 第二刀 = 与第一刀同一笔迹(attack2 低扫, 同 dy/squash), 只差一个微小角度 ——
        // "很快做两次同样的动作"。两版角度供拍板(smearAlt[2]=B版)。
        // (历史: 镜像/缩小/细线/MH3借笔迹 四路都被否, 定位就是快速二连同刀)
        cullSmear: true,
        // 定版(Eric 拍板 A): 同刀微抬角(-7°), 第二刀收势略向上挑
        smear: { standalone: true, sheet: 'fx:ma2', phases: [{ f: 0, t: 4 }, { f: 1, t: 3 }], decay: 2, dy: 26, squashY: 0.8, rot: -0.12, edge: '#ffc531', core: '#fff2c8' },
        dmg: 4, chip: 0, guardDmg: 10, box: { x1: 10, x2: 208, y1: -70, y2: -5 },
        knock: 4, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      cheavy: { // 蹲升·月轮: 独立挑空技,不参与连锁 · smear 红金升弧(余波上飘)
        kind: 'heavy', noChain: true, anim: 'attack1', total: 34, startup: 10, active: 6, impact: 4,
        seq: { w: [{ a: 'crouch', f: 0 }], i: 4, r: [5] }, hop: -8,
        smear: { phases: [{ f: 4, t: 5 }, { f: 5, t: 4 }], decay: 2, rim: 4, echo: { t: 4, dx: 8 }, attach: true, edge: '#ff5a3d', core: '#ffe27a' },
        fx: { x: 103, y: -101, r: 120, ry: 0.6, a0: 2.3, a1: -2.35, w: 18, life: 14, rise: -1.2, color: '#ffe27a', color2: '#ff5a3d' },
        dmg: 9, chip: 2, guardDmg: 22, box: { x1: 5, x2: 208, y1: -195, y2: -20 }, // 平衡: 10->9
        // launch -13(原-10): 挑空要能接超必 —— 收招~20tick+超必前摇8 → 需浮空≥30tick(Eric 2026-07-11)
        knock: 1.5, hitstun: 26, blockstun: 14, hitstop: 13, shake: 5, kd: true, launch: -15, // knock 5->1.5 垂直上打; -16 太高(Eric)->-15: 接I窗口 ~3tick(实测 -14 只剩完美帧)
        meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
      },
      air: {
        kind: 'light', anim: 'attack1', total: 24, startup: 6, active: 8, impact: 4, air: true,
        smear: { phases: [{ f: 4, t: 4 }, { f: 5, t: 3 }], decay: 2, attach: true, edge: '#ffd24a', core: '#fff6d8' },
        fx: { x: 103, y: -101, r: 110, ry: 0.6, a0: 2.3, a1: -2.35, w: 13, life: 10, color: '#fff6d8', color2: '#ffd24a' },
        dmg: 6, chip: 0, guardDmg: 12, box: { x1: -1, x2: 155, y1: -182, y2: 10 },
        knock: 4, hitstun: 20, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 9, sfx: 'whooshL', hitSfx: 'hitL',
      },
      dive: {
        kind: 'heavy', name: '断地斬', anim: 'attack2', air: true, dive: true, impact: 4,
        startup: 8, diveSpeed: 15, diveDrift: 4.5, recovery: 26, slamActive: 8,
        smear: { phases: [{ f: 4, t: 5 }, { f: 5, t: 4 }], decay: 2, rim: 4, echo: { t: 3, dx: 5 }, edge: '#ffb32e', core: '#fff3cf' },
        dmg: 10, chip: 3, guardDmg: 32, box: { x1: 17, x2: 220, y1: -126, y2: 10 }, // 落地砸判定(方向性, 朝前); 平衡: 11->10
        knock: 7, hitstun: 28, blockstun: 16, hitstop: 13, shake: 7, kd: true,
        meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
      },
      special: { // 突进残影 + 追身红月牙 · smear 红金刃风(attach 追身) + 命中冲击环/slowmo
        kind: 'special', name: '月牙·疾斬', anim: 'attack2', total: 44,
        startup: 10, active: 10, impact: 4, cooldown: 195, // 平衡: 110->130->195(Eric: U 冷却 x1.5); 降低最强中距突进斩复用频率, 伤害不变
        smear: { phases: [{ f: 4, t: 6 }, { f: 5, t: 5 }], decay: 3, rim: 4, gale: 1.06, echo: { t: 4, dx: 10 }, attach: true, edge: '#ff4a3d', core: '#ffe27a' },
        fx: { x: 113, y: -142, r: 124, ry: 0.82, a0: 2.75, a1: 0.05, w: 20, life: 13, vx: 7, color: '#ffe27a', color2: '#d64533' },
        dmg: 11, chip: 5, guardDmg: 38, box: { x1: 0, x2: 208, y1: -152, y2: -9 }, // 平衡: dmg 13->11; 削护 46->38(隐藏破防怪, 2026-07-11)
        // 突进斩命中要把人斩飞: knock 加重 + launch 抬高(接线后生效)
        knock: 16, hitstun: 30, blockstun: 18, hitstop: 16, shake: 7, kd: true, launch: -9,
        dash: { from: 4, to: 20, vx: 6.25 },
        meterHit: 16, sfx: 'special', hitSfx: 'hitH',
      },
      super: { // 三幕: 聚气红光 -> 残影突进 -> 红金交替连斩·花瓣终结 (cine smear 在 runSuperSeq)
        kind: 'super', name: '満開·連獄斬', anim: 'attack1', total: 58, cost: 100,
        startup: 8, active: 16, impact: 4, invuln: 16,
        smear: { phases: [{ f: 4, t: 6 }, { f: 5, t: 5 }], decay: 3, rim: 4, gale: 1.06, echo: { t: 4, dx: 12 }, attach: true, edge: '#ff4a3d', core: '#fff1c0' },
        fx: { x: 103, y: -101, r: 130, ry: 0.6, a0: 2.3, a1: -2.35, w: 22, life: 14, vx: 9, color: '#fff1c0', color2: '#ff4a3d' },
        dmg: 0, chip: 9, guardDmg: 65, box: { x1: 0, x2: 208, y1: -190, y2: -25 },
        knock: 4, hitstun: 24, blockstun: 24, hitstop: 8, shake: 6, kd: true,
        dash: { from: 2, to: 22, vx: 8 },
        cine: { hits: 4, interval: 10, dmgPer: 5, final: 10 },
        meterHit: 0, sfx: 'special', hitSfx: 'hitH',
      },
    },
  },

  kenji: {
    id: 'kenji',
    name: 'XIANG', cn: '翔', title: '疾影の忍', type: 'SPEED',
    theme: '#7d5bff', theme2: '#35e0d8',
    dir: 'assets/img/kenji', native: -1, scale: 2.75,
    anchor: { x: 100, y: 126 },
    walk: 4.3, jumpVy: -16.5, // 微加强: 4.2->4.3
    stats: { pow: 3, spd: 5, rng: 4 },
    quoteWin: '遅すぎる。', quoteLose: '影が……消える……',
    portrait: { x: 78, y: 50, w: 46, h: 46 },
    anims: {
      idle:    { file: 'Idle.png',    frames: 4, hold: 9,  loop: true },
      crouch:  { file: 'Crouch.png',  frames: 4, hold: 9,  loop: true }, // 分段压缩烘焙,保留呼吸动画
      crouchin:{ file: 'CrouchIn.png',frames: 1, hold: 5,  loop: true }, // 入蹲过渡(半程)
      run:     { file: 'Run.png',     frames: 8, hold: 5,  loop: true },
      jump:    { file: 'Jump.png',    frames: 2, hold: 10, loop: true },
      fall:    { file: 'Fall.png',    frames: 2, hold: 10, loop: true },
      attack1: { file: 'Attack1.png', frames: 4, hold: 5,  loop: false, smearFrames: [1] }, // 大月牙在 f1(共用)
      attack2: { file: 'Attack2.png', frames: 4, hold: 6,  loop: false, smearFrames: [1] },
      hit:     { file: 'TakeHit.png', frames: 3, hold: 6,  loop: false },
      death:   { file: 'Death.png',   frames: 7, hold: 7,  loop: false },
    },
    moves: {
      light: { // 拔刀快斩: 一帧起手立刻出刀(速度型标志) · smear 细锐青白·单相位速斩
        kind: 'light', anim: 'attack1', total: 20, startup: 6, active: 5, impact: 1,
        seq: { w: [0], i: 1, r: [2, 3] },
        smear: { phases: [{ f: 1, t: 3 }], decay: 1, edge: '#66e8dc', core: '#eafffd' },
        fx: { x: 110, y: -75, r: 110, ry: 0.61, a0: -2.3, a1: 2.3, w: 11, life: 9, color: '#eafffd', color2: '#66e8dc' },
        dmg: 5, chip: 0, guardDmg: 10, box: { x1: 12, x2: 194, y1: -165, y2: -40 },
        knock: 4, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      light2: { // 逆袈裟回斩(J·J 第二段): 起手举刀(f2 竖刀, Eric 定) → 回斩
        kind: 'light', anim: 'attack1', total: 18, startup: 4, active: 5, impact: 1,
        seq: { w: [2], i: 3, r: [3] },
        smear: { standalone: true, sheet: 'fx:ka1', cullPrev: true, phases: [{ f: 0, t: 4 }], decay: 2, dy: -4, scale: 0.94, rot: -0.1, edge: '#35e0d8', core: '#ddfffa' },
        dmg: 6, chip: 0, guardDmg: 10, box: { x1: 12, x2: 194, y1: -165, y2: -40 },
        knock: 4.5, hitstun: 17, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      heavy: { // 重击「举刀下劈」: 抬刀过头 -> 大弧斩落 · 紫下劈弧
        kind: 'heavy', anim: 'attack2', total: 28, startup: 9, active: 5, impact: 1,
        seq: { w: [2, 3], i: 1, r: [0, { a: 'crouchin', f: 0 }] }, // 评审③: 弓步->半起身桥接, 消除收招硬切
        smear: { phases: [{ f: 1, t: 4 }], decay: 2, echo: { t: 3, dy: 7 }, edge: '#7d5bff', core: '#efe8ff' },
        fx: { x: 118, y: -118, r: 118, ry: 0.75, a0: -2.5, a1: 2.5, w: 17, life: 12, color: '#efe8ff', color2: '#7d5bff' },
        dmg: 9, chip: 2, guardDmg: 20, box: { x1: 12, x2: 202, y1: -175, y2: -35 },
        knock: 7.5, hitstun: 24, blockstun: 14, hitstop: 10, shake: 4,
        meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
      },
      heavy2: { // 回升斩(K·K 第二段): 低位前突撩起 · 紫青升弧(与下劈相反)
        kind: 'heavy', anim: 'attack2', total: 29, startup: 8, active: 5, impact: 1,
        seq: { w: [0], i: 3, r: [3] }, dash: { from: 2, to: 9, vx: 7 }, // 身体 f3 举刀, 随前突移动
        // F模式改(Eric: 重击第二下更有力): 同下劈月牙, 放大1.14+微转角, attach 随突进
        smear: { standalone: true, sheet: 'fx:ka2', attach: true, phases: [{ f: 0, t: 5 }], decay: 2, dy: -14, scale: 1.14, rot: -0.12, edge: '#8f6fff', core: '#c8fff5' },
        dmg: 11, chip: 2, guardDmg: 20, box: { x1: 12, x2: 202, y1: -180, y2: -35 }, // 平衡 2026-07-11: dmg 10->11; 手长 200->206->202(206 让隼人镜像 1.38x 反超, 回收一半)
        // launch -9(默认-7.5): 连锁击倒后多浮 ~3tick — 隼人超必 startup 16(瞬身居合)远慢于
        // 剣二的 8, K·K→I 的有效衔接窗被吃掉大半(Eric 2026-07-11: 判定间隙比剣二短得多)
        knock: 8.5, hitstun: 26, blockstun: 14, hitstop: 11, shake: 5, launch: -10.5, // 实测 -9 仍差 3tick, -10.5 与剣二窗口对齐(~7tick)
        meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
      },
      clight: { // 蹲刺·穿膝: 全程蹲姿(评审①), 低位刺击交给贴地 fx 表达
        kind: 'light', anim: 'attack1', total: 18, startup: 5, active: 4, impact: 1,
        // 起手举刀(f2 竖刀, Eric 定) → 落蹲横扫
        seq: { w: [2], i: { a: 'crouch', f: 3 }, r: [{ a: 'crouch', f: 0 }] },
        smear: { standalone: true, sheet: 'fx:ka1', phases: [{ f: 0, t: 4 }], decay: 2, dy: 30, squashY: 0.42, scale: 0.86, edge: '#5ce8da', core: '#eafffd' },
        dmg: 4, chip: 0, guardDmg: 9, box: { x1: 10, x2: 192, y1: -88, y2: -5 },
        knock: 3.5, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
        meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
      },
      clight2: { // 蹲刺·返し(蹲J·J 第二段): 同笔迹微抬角+略深青, 高品质"同刀微变"(隼人定版同模式)
        kind: 'light', anim: 'attack1', total: 17, startup: 4, active: 4, impact: 1,
        seq: { w: [{ a: 'crouch', f: 0 }], i: { a: 'crouch', f: 3 }, r: [{ a: 'crouch', f: 0 }] },
        cullSmear: true,
        smear: { standalone: true, sheet: 'fx:ka1', phases: [{ f: 0, t: 4 }], decay: 2, dy: 24, squashY: 0.46, scale: 0.82, rot: -0.13, edge: '#35c8bc', core: '#d6fff8' },
        dmg: 3, chip: 0, guardDmg: 9, box: { x1: 10, x2: 192, y1: -88, y2: -5 },
        knock: 4, hitstun: 16, blockstun: 9, hitstop: 4, shake: 2,
        meterHit: 7, sfx: 'whooshL', hitSfx: 'hitL',
      },
      cheavy: { // 蹲撩·逆风: 独立挑空技,不参与连锁 · 青升弧
        kind: 'heavy', noChain: true, anim: 'attack2', total: 28, startup: 8, active: 5, impact: 1, // total 30->28: 接超必收招提前, 保留被防-2的可惩罚性(2026-07-11)
        seq: { w: [{ a: 'crouch', f: 0 }], i: 3, r: [3] }, hop: -7, // 身体 f3 举刀, 随小跳弹起
        // 升斩=KK第二下同源月牙(Eric: 保持一致), 只比 heavy2(1.14) 大一丢丢 + attach 随弹起
        smear: { standalone: true, sheet: 'fx:ka2', attach: true, phases: [{ f: 0, t: 6 }], decay: 2, dy: -18, scale: 1.16, rot: -0.18, edge: '#35e0d8', core: '#d6fff8' },
        dmg: 9, chip: 2, guardDmg: 20, box: { x1: 5, x2: 205, y1: -190, y2: -20 },
        // launch -15(原-12.5): 隼人超必前摇 16, 挑空接 I 需要更高浮空(Eric 2026-07-11)
        knock: 1.5, hitstun: 24, blockstun: 13, hitstop: 10, shake: 5, kd: true, launch: -16.5, // knock 5->1.5 同上; -17 太高(Eric)->-16.5 + total 28: 接I窗口 ~3tick 与剣二一致(实测 -16 只有 2tick)
        meterHit: 11, sfx: 'whooshH', hitSfx: 'hitH',
      },
      air: {
        kind: 'light', anim: 'attack1', total: 20, startup: 5, active: 7, impact: 1, air: true,
        smear: { phases: [{ f: 1, t: 3 }], decay: 1, attach: true, edge: '#66e8dc', core: '#eafffd' },
        fx: { x: 110, y: -75, r: 104, ry: 0.61, a0: -2.3, a1: 2.3, w: 12, life: 9, color: '#eafffd', color2: '#66e8dc' },
        dmg: 5, chip: 0, guardDmg: 11, box: { x1: 8, x2: 145, y1: -140, y2: 10 },
        knock: 4, hitstun: 18, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      dive: {
        kind: 'heavy', name: '影·墜滅', anim: 'attack2', air: true, dive: true, impact: 2,
        startup: 7, diveSpeed: 16, diveDrift: 5, recovery: 22, slamActive: 8, slamRange: 110,
        // Eric 定版: 倾身抡劈下砸 —— 俯冲期直接显示 f1 斩帧(impact:2 → 俯冲帧=f1),
        // 身体带 dive 前倾角, 月牙帧同步重染妖紫随身而落; 落地卡帧 12
        smear: { phases: [{ f: 1, t: 5 }], decay: 2, echo: { t: 3, dy: 8 }, edge: '#7d5bff', core: '#efe8ff' },
        dmg: 9, chip: 2, guardDmg: 28, box: { x1: -25, x2: 202, y1: -95, y2: 10 },
        knock: 6.5, hitstun: 26, blockstun: 15, hitstop: 12, shake: 7, kd: true,
        meterHit: 12, sfx: 'whooshH', hitSfx: 'hitH',
      },
      special: { // 影·手裏剣: 单发旋转手里剑(Eric 定版: 最贴合日本忍者, 苦无导弹感被否)
        kind: 'special', name: '影·手裏剣', anim: 'attack1', total: 30,
        startup: 11, active: 4, impact: 3, cooldown: 130, // 冷却史: 120->100->150->130(2026-07-11 平衡: zoning 身份)
        seq: { w: [0], i: 3, r: [3] }, // 投掷用 f3 收势帧, 避开 f1 刀光月牙
        fx: { lean: true, x: 40, y: -95, r: 26, ry: 0.9, a0: -0.6, a1: 0.4, w: 4, life: 5, sweep: 0.7, color: '#eafffd', color2: '#7d5bff' },
        dmg: 0, chip: 0, box: null,
        knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
        projectile: { speed: 9.5, dmg: 9, chip: 3, guardDmg: 16, y: -95, hitstun: 26, blockstun: 12, knock: 2, hitstop: 6, meterHit: 12, launch: -10 }, // 平衡: dmg 9、hitstun 26(确认接超必)、空中被点上浮 -10
        meterHit: 0, sfx: 'projectile', hitSfx: 'hitL',
      },
      airspecial: { // 空中手裏剣(空中+U): 滞空平掷(直线), 制空/对空压制
        kind: 'special', name: '空中手裏剣', anim: 'attack1', air: true, total: 26,
        startup: 6, active: 4, impact: 3, cooldown: 120, // 微加强 80, 后 Eric: U 冷却 x1.5 -> 120(空中U)
        seq: { w: [0], i: 3, r: [3] },
        fx: { lean: true, x: 34, y: -60, r: 22, ry: 0.9, a0: -0.5, a1: 0.5, w: 4, life: 5, sweep: 0.7, color: '#eafffd', color2: '#7d5bff' },
        dmg: 0, chip: 0, box: null,
        knock: 0, hitstun: 0, blockstun: 0, hitstop: 0, shake: 0,
        // spread=[vy], vy 正=向下。原斜下掷 [5], Eric 2026-07-11 改直线 [0]; y=-60 从空中腰位出手
        projectile: { spread: [0], speed: 8.5, dmg: 7, chip: 2, guardDmg: 14, y: -60, hitstun: 22, blockstun: 11, knock: 2, hitstop: 5, meterHit: 10, launch: -10 }, // 空中被点上浮 -10, 可被补 1 刀
        meterHit: 0, sfx: 'projectile', hitSfx: 'hitL',
      },
      dashslash: { // 疾駆斬(dash+J): 借冲刺前突的横斩, 重残影拖尾 —— 疾影突进
        kind: 'light', name: '疾駆斬', anim: 'attack1', total: 20, startup: 4, active: 6, impact: 1,
        seq: { w: [0], i: 1, r: [2, 3] }, dash: { from: 0, to: 8, vx: 12.5 },
        // 身体 f1 弓步斩 + 帧同步重染月牙(真笔迹, 与基础轻击同法); 冲刺+密集残影
        smear: { phases: [{ f: 1, t: 5 }], decay: 2, echo: { t: 3, dx: 10 }, edge: '#35e0d8', core: '#eafffd' },
        dmg: 8, chip: 1, guardDmg: 14, box: { x1: 10, x2: 192, y1: -145, y2: -40 }, // 微加强: 7->8; reach 175->192(Eric 实验室标注)
        // blockstun 12->10: 修 on-block +2(4帧起手+175reach 的招不该防后仍有利)
        knock: 7, hitstun: 22, blockstun: 10, hitstop: 7, shake: 3, kd: false,
        meterHit: 10, sfx: 'whooshH', hitSfx: 'hitH',
      },
      super: { // 三幕: 紫气聚身 -> 瞬身内爆/外爆 -> 紫青交替连斩 · 終B 月輪爆
        kind: 'super', name: '残影·居合斬', anim: 'attack2', total: 54, cost: 100,
        startup: 16, active: 12, impact: 1, invuln: 0, finisher: 'B',
        seq: { w: [2, 3], i: 1, r: [0] }, // 瞬移后前摇=举刀过顶(Eric: 抡在头上)
        smear: { phases: [{ f: 1, t: 4 }], decay: 2, gale: 1.06, attach: true, edge: '#7d5bff', core: '#efe8ff' },
        fx: { x: 118, y: -118, r: 124, ry: 0.75, a0: 2.5, a1: -2.5, w: 19, life: 13, color: '#efe8ff', color2: '#7d5bff' },
        dmg: 0, chip: 9, guardDmg: 65, box: { x1: 0, x2: 192, y1: -180, y2: -25 },
        knock: 4, hitstun: 24, blockstun: 24, hitstop: 8, shake: 6, kd: true,
        teleport: { at: 6, offset: 92, invuln: 26 },
        cine: { hits: 4, interval: 11, dmgPer: 5, final: 13, style: 'clones' }, // Eric 定版: 残影分身; 2026-07-11 重分配 3x7+12→4x5+13(总33不变, 每个视觉节拍都掉血, 爆炸仍最高)
        meterHit: 0, sfx: 'tele', hitSfx: 'hitH',
      },
    },
  },

  /* ── 第三角色原型(方案一): Huntress 换体 → 月槍の巫 欣韵(XINYUN) ──────────
     LuizMelo Huntress (CC0), kunoichi 靛蓝调色。fw=150(外部体), scale 3.4。
     差异化核心 = 长枪: 轻击长突刺(reach 远/程序化 thrust 线), 重击过头弧斩
     (Attack1/2 f3 自带白月牙 → 重染系统)。突刺 vs 挥斩 = 与二侍完全不同的手感。
     原型阶段: 无蹲攻/超杀(crouch 占位 idle), 供 anim-lab 预览 J/JJ/K/KK/U。 */
  ayame: {
    id: 'ayame',
    name: 'XINYUN', cn: '欣韵', title: '月槍の巫', type: 'REACH',
    theme: '#5b7dff', theme2: '#c8d8ff',
    dir: 'assets/img/huntress', fw: 150, native: 1, scale: 3.4,
    anchor: { x: 76, y: 96 },
    walk: 3.6, jumpVy: -15.5,
    stats: { pow: 4, spd: 4, rng: 5 },
    quoteWin: '月は、槍の先に。', quoteLose: '間合いを……読めなんだ。',
    portrait: { x: 56, y: 44, w: 52, h: 52 },
    anims: {
      idle:    { file: 'Idle_kunoichi.png',    frames: 8, hold: 7,  loop: true },
      crouch:  { file: 'Idle_kunoichi.png',    frames: 8, hold: 8,  loop: true },  // 原型占位: 无蹲帧
      crouchin:{ file: 'Idle_kunoichi.png',    frames: 1, hold: 5,  loop: true },
      run:     { file: 'Run_kunoichi.png',     frames: 8, hold: 6,  loop: true },
      jump:    { file: 'Jump_kunoichi.png',    frames: 2, hold: 10, loop: true },
      fall:    { file: 'Fall_kunoichi.png',    frames: 2, hold: 10, loop: true },
      attack1: { file: 'Attack1_kunoichi.png', frames: 5, hold: 5,  loop: false, smearFrames: [3] }, // 过头弧斩(白月牙 f3)
      attack2: { file: 'Attack2_kunoichi.png', frames: 5, hold: 6,  loop: false, smearFrames: [3] }, // 过头劈斩(白月牙 f3)
      attack3: { file: 'Attack3_kunoichi.png', frames: 7, hold: 5,  loop: false },                    // 长突刺(无月牙)
      hit:     { file: 'Take hit_kunoichi.png',frames: 3, hold: 5,  loop: false },
      death:   { file: 'Death_kunoichi.png',   frames: 8, hold: 7,  loop: false },
    },
    moves: {
      light: { // 突き: 长枪直刺, reach 极远, 招牌轻攻击 · 程序化月白突刺线
        kind: 'light', anim: 'attack3', total: 22, startup: 6, active: 5, impact: 4,
        seq: { w: [0, 1], i: 4, r: [5, 6] },
        fx: { thrust: true, x: 60, y: -74, color: '#eef4ff', color2: '#8fb0ff' },
        dmg: 5, chip: 0, guardDmg: 10, box: { x1: 20, x2: 205, y1: -95, y2: -55 }, // 超长判定=枪 reach
        knock: 4, hitstun: 18, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      light2: { // 二の槍: 收枪再补一刺, 略高 · 突刺线
        kind: 'light', anim: 'attack3', total: 20, startup: 5, active: 5, impact: 4,
        seq: { w: [2], i: 4, r: [5, 6] },
        fx: { thrust: true, x: 60, y: -88, color: '#eef4ff', color2: '#8fb0ff' },
        dmg: 6, chip: 0, guardDmg: 10, box: { x1: 20, x2: 205, y1: -110, y2: -68 },
        knock: 5, hitstun: 18, blockstun: 10, hitstop: 5, shake: 2,
        meterHit: 8, sfx: 'whooshL', hitSfx: 'hitL',
      },
      heavy: { // 月輪斬: 过头大弧斩(白月牙重染) · reach 中但伤害高
        kind: 'heavy', anim: 'attack1', total: 30, startup: 10, active: 6, impact: 3,
        seq: { w: [0, 1, 2], i: 3, r: [4] },
        smear: { phases: [{ f: 3, t: 5 }], decay: 3, rim: 4, echo: { t: 3, dy: 6 }, edge: '#5b7dff', core: '#dfe8ff' },
        dmg: 11, chip: 2, guardDmg: 26, box: { x1: 10, x2: 170, y1: -180, y2: -30 },
        knock: 8, hitstun: 26, blockstun: 15, hitstop: 13, shake: 5,
        meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
      },
      heavy2: { // 落月: 过头劈斩落地(K·K 第二段, 白月牙) · 击倒
        kind: 'heavy', anim: 'attack2', total: 32, startup: 9, active: 6, impact: 3,
        seq: { w: [0, 1, 2], i: 3, r: [4] },
        smear: { phases: [{ f: 3, t: 5 }], decay: 3, rim: 4, echo: { t: 4, dy: 8 }, edge: '#4a63d8', core: '#dfe8ff' },
        dmg: 12, chip: 2, guardDmg: 26, box: { x1: 10, x2: 165, y1: -185, y2: -25 },
        knock: 9, hitstun: 28, blockstun: 15, hitstop: 14, shake: 6, kd: true, launch: -9,
        meterHit: 13, sfx: 'whooshH', hitSfx: 'hitH',
      },
      special: { // 疾風突: 前突长刺, 借冲刺补足位移 · 突刺线 + 冲击环
        kind: 'special', name: '疾風突', anim: 'attack3', total: 40,
        startup: 9, active: 8, impact: 4, cooldown: 110,
        seq: { w: [0, 1], i: 4, r: [5, 6] },
        fx: { thrust: true, x: 60, y: -78, color: '#ffffff', color2: '#8fb0ff' },
        dash: { from: 3, to: 14, vx: 9 },
        dmg: 13, chip: 4, guardDmg: 42, box: { x1: 20, x2: 220, y1: -100, y2: -55 },
        knock: 14, hitstun: 30, blockstun: 18, hitstop: 16, shake: 7, kd: true, launch: -8,
        meterHit: 16, sfx: 'special', hitSfx: 'hitH',
      },
    },
  },
};

const AI_DIFFS = {
  easy: {
    label: '易', en: 'EASY', desc: 'Slow reactions, rarely guards',
    reactMin: 28, reactMax: 48, aggression: 0.38, blockChance: 0.12,
    dodgeChance: 0.05, comboFollow: 0.25, superUse: 0.25, jumpiness: 0.1, // 2026-07-11 再放软(Eric: 简单=正常打也能赢)
  },
  normal: {
    label: '中', en: 'NORMAL', desc: 'Balanced offense and defense',
    reactMin: 12, reactMax: 20, aggression: 0.76, blockChance: 0.56,
    dodgeChance: 0.26, comboFollow: 0.75, superUse: 0.7, jumpiness: 0.16,
  },
  hard: {
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
};
