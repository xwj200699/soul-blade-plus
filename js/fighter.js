/* Fighter: state machine, frame-data driven attacks, chain cancels,
   dash / backdash (i-frame dodge), block, knockdown, cinematic supers. */
'use strict';

/* 英雄基础血量。原为写死的 100; 抬到 150 后所有血条/完胜判定/训练回血都按
   f.maxHp 归一化(唯一例外 quest.js 的玩家血条已同步改掉)。角色可用 c.maxHp 覆盖。 */
const BASE_HP = 150;

class Fighter {
  constructor(charId, x, facing, world) {
    this.c = DATA[charId];
    this.world = world;
    this.x = x; this.y = STAGE.ground;
    this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.maxHp = this.c.maxHp || BASE_HP; this.hp = this.maxHp; this.meter = 0;
    this.wins = 0;
    this.state = 'idle'; this.stateT = 0;
    this.anim = { name: 'idle', t: 0, frame: 0, done: false };
    this.move = null;          // active attack {def, t, hasHit, contact, contactT, want, spawned}
    this.rekka = false;        // light->light chain used
    this.rekkaH = false;       // heavy->heavy chain used
    this.altL = false;         // alternate light slash (来回砍)
    this.altCL = false;        // alternate crouch light (蹲J 正手/回手)
    this.altH = false;         // alternate heavy swing
    this.hitstun = 0; this.blockstun = 0; this.guard = 0;
    this.invuln = 0; this.specialCd = 0; this.backdashCd = 0;
    this.lockout = 0;          // landing recovery etc.
    this.kdPending = false;
    this.grounded = true;
    this.dashT = 0; this.dashDir = 0;
    this.combo = { count: 0, timer: 0 };   // as attacker
    this.comboable = 0;                    // as victim: chain window
    this.frozen = 0;
    this.dead = false;
    this.lastHurt = 0;         // world tick of last damage taken (training regen)
    this.superSeq = null;      // cinematic super in progress
    this.flash = 0;            // white flash on hit
    /* 实例级机动系数(M1.4): 走/冲/后撤/空中操控统一乘它。对战恒为 1;
       闯关里只给玩家抬(>1)、给杂兵压(<1) —— 属性表仍是全局唯一真值,
       "只给玩家加成"这件事不污染 DATA。 */
    this.mob = 1;
    /* 实例级体型系数(M1.4): 精灵图与受击框一起缩放。对战恒为 1;
       闯关用它做杂兵变体 —— 小兵 0.86 / 精英 1.16, 同屏辨识度靠体型拉开。 */
    this.sz = 1;
    /* 英雄特性状态(M1.4, 见 roster.js TRAITS): 蓄势 / 闪避强化 / 灼烧 / 轻连段数 */
    this.chargeT = 0; this.charged = false;   // 文杰 蓄勢
    this.dodgeBuff = 0;                       // 翔 残影反擊
    this.burn = 0; this.burnT = 0; this.burnDmg = 0; this.burnSrc = null; // 景英 灼焼
    this.rekkaN = 0;                          // 晓艳 紅梅乱舞(轻连段计数)
    this.projN = 0;                           // 泽轩 過負荷(投射物计数)
    this.pad = emptyPad();
  }

  // ---- animation --------------------------------------------------------
  setAnim(name, restart = false) {
    if (this.anim.name !== name || restart) {
      this.anim = { name, t: 0, frame: 0, done: false };
    }
  }

  updateAnim() {
    if (this.state === 'attack' && this.move) {
      const def = this.move.def;
      const da = this.c.anims[def.anim];
      const impact = def.impact !== undefined ? def.impact : Math.floor(da.frames / 2);
      // seq entries may be numbers (frame of def.anim) or objects
      // {a:'crouch', f:0} referencing a frame of another sheet — this is how
      // crouching attacks start from / return to the baked crouch pose.
      const setFrame = (fr) => {
        if (typeof fr === 'object' && fr !== null) {
          this.anim.name = fr.a; this.anim.frame = fr.f || 0;
        } else {
          this.anim.name = def.anim; this.anim.frame = fr;
        }
      };
      if (def.dive) {
        // hold the windup pose while plunging, land on the slash frame
        this.anim.name = def.anim;
        if (!this.move.landed) this.anim.frame = Math.max(0, impact - 1);
        else this.anim.frame = Math.min(da.frames - 1, impact + Math.floor((this.move.t - this.move.landedT) / 7));
        return;
      }
      // phase-aligned mapping: windup frames sweep through startup, the
      // slash frame lands exactly on the active window, rest is recovery.
      // def.seq allows custom frame paths (return slashes, overhead chops).
      const t = this.move.t;
      const sq = def.seq || {
        w: Array.from({ length: Math.max(0, impact) }, (_, k) => k),
        i: impact,
        r: Array.from({ length: Math.max(0, da.frames - impact - 1) }, (_, k) => impact + 1 + k),
      };
      if (t < def.startup) {
        const arr = sq.w.length ? sq.w : [sq.i];
        setFrame(arr[Math.min(arr.length - 1, Math.floor(t / def.startup * arr.length))]);
      } else if (t < def.startup + def.active) {
        setFrame(sq.i);
      } else {
        const arr = sq.r.length ? sq.r : [sq.i];
        const recT = t - def.startup - def.active;
        const recDur = Math.max(1, def.total - def.startup - def.active);
        setFrame(arr[Math.min(arr.length - 1, Math.floor(recT / recDur * arr.length))]);
      }
      return;
    }
    const d = this.c.anims[this.anim.name];
    this.anim.t++;
    let f = Math.floor(this.anim.t / d.hold);
    if (d.loop) f %= d.frames;
    else if (f >= d.frames) { f = d.frames - 1; this.anim.done = true; }
    this.anim.frame = f;
  }

  // ---- boxes --------------------------------------------------------------
  bodyBox() {
    // M1.1: 每角色可配 + 蹲姿降低受击高度(蹲/蹲斩期间按住下)
    const bb = this.c.body || { w: 30, h: 148, crouchH: 96 };
    const crouched = this.state === 'crouch' ||
      (this.state === 'attack' && this.grounded && this.pad && this.pad.crouch);
    const z = this.sz || 1;
    const h = (crouched ? (bb.crouchH || Math.round(bb.h * 0.65)) : bb.h) * z;
    const w = bb.w * z;
    return { x1: this.x - w, y1: this.y - h, x2: this.x + w, y2: this.y };
  }

  activeBox() {
    if (this.state !== 'attack' || !this.move) return null;
    const d = this.move.def, m = this.move;
    if (m.hasHit) return null;
    const f = this.facing;
    const rel = (x1, x2, y1, y2) => ({
      x1: f > 0 ? this.x + x1 : this.x - x2,
      x2: f > 0 ? this.x + x2 : this.x - x1,
      y1: this.y + y1, y2: this.y + y2,
    });
    if (d.dive) {
      if (!m.landed) return m.t >= d.startup ? rel(-25, 75, -115, 15) : null;
      if (m.t > m.landedT + d.slamActive) return null;
      return d.box ? rel(d.box.x1, d.box.x2, d.box.y1, d.box.y2)                 // 方向性 box
                   : rel(-(d.slamRange || 110), d.slamRange || 110, -80, 5);      // 兜底: 无 box 退回对称 slamRange, 永不崩
    }
    if (!d.box) return null;
    if (m.t < d.startup || m.t >= d.startup + d.active) return null;
    return rel(d.box.x1, d.box.x2, d.box.y1, d.box.y2);
  }

  // ---- helpers -------------------------------------------------------------
  specialReady() { return this.specialCd <= 0 && !this.world.hasProjectile(this); }
  superReady() { return this.meter >= 100; }
  /* 'block' (= blockstun) counts as busy via the state itself; never gate on
     the blockstun counter — a leaked counter once froze the AI permanently */
  busy() { return !['idle', 'walk', 'guard', 'crouch'].includes(this.state); }
  // 浮空追击保护(Eric 2026-07-11): 挑空后空中最多吃 1 次追击, 之后免疫到落地。
  // 各战斗解算器(main.js tryHit / anim-lab miniResolve / howto resolve)的无敌门都要带上
  juggleImmune() { return !this.grounded && this.state === 'hit' && (this.juggleN || 0) >= 1; }
  /* directional guard: holding the direction away from x at this instant */
  holdingAway(fromX) {
    const away = this.x >= fromX ? 1 : -1;
    return away > 0 ? this.pad.right : this.pad.left;
  }
  comboScale(victim) {
    const predicted = victim.comboable > 0 ? this.combo.count + 1 : 1;
    return predicted <= 2 ? 1 : predicted <= 4 ? 0.72 : 0.5;
  }

  /* meterMul: 实例级攒气系数(闯关只给玩家抬) —— 超必来得更勤, 打怪更爽 */
  gainMeter(n) { this.meter = Math.min(100, this.meter + n * (this.meterMul || 1)); }

  /* ---- 英雄特性 (M1.4, 声明在 roster.js TRAITS) --------------------------
     tickTraits: 每帧维护"蓄势"与"灼烧"两个持续态。
     traitDmgMul: 出手瞬间的伤害系数(间合/蓄势/闪避强化 三者可叠)。
     onTraitHit: 命中后的挂载效果(目前只有灼烧)。 */
  tickTraits() {
    const T = this.c.trait;
    // 灼烧(景英): 分段扣血, 每段冒一簇火屑; 永不致死(留 1 血, 击杀交给正面命中)
    if (this.burn > 0) {
      this.burnT--;
      if (this.burnT <= 0) {
        this.burn--;
        this.burnT = this.burnEvery || 22;
        const d = Math.max(1, Math.round(this.burnDmg));
        this.hp = Math.max(1, this.hp - d);
        this.lastHurt = this.world.tick;
        this.flash = Math.max(this.flash, 3);
        Effects.text(this.x, this.y - 168, String(d), '#ff8428', 11);
        Effects.rise(this.x, this.y - 20, '#ff8428', 3);
        if (this.burnSrc && this.burnSrc !== this) this.burnSrc.gainMeter(3);
      }
    }
    if (!T) return;
    // 蓄势(文杰): 站定不动累积, 蓄满后下一记重击暴击必倒; 一动就散
    if (T.charge) {
      const still = this.grounded && (this.state === 'idle' || this.state === 'crouch') &&
                    !this.pad.left && !this.pad.right && !this.pad.jump &&
                    !this.pad.light && !this.pad.heavy && !this.pad.special && !this.pad.super;
      if (still) {
        this.chargeT++;
        if (this.chargeT >= T.charge.t && !this.charged) {
          this.charged = true;
          Effects.ring(this.x, this.y - 88, this.c.theme2 || '#ffd24a', 14);
          AudioSys.sfx('menuSel');
        }
      } else if (this.state !== 'attack') {
        this.chargeT = 0; this.charged = false;
      }
      if (this.charged && this.world.tick % 6 === 0) Effects.rise(this.x, this.y, this.c.theme2 || '#ffd24a', 2);
    }
  }

  traitDmgMul(victim, info) {
    const T = this.c.trait;
    let k = 1;
    if (this.dodgeBuff > 0 && T && T.dodgeBuff) k *= T.dodgeBuff.dmg;   // 翔: 闪避后反击
    if (T && T.rangeDmg) {                                              // 欣韵: 越远越痛
      const R = T.rangeDmg;
      const d = Math.abs(this.x - victim.x);
      const u = Math.max(0, Math.min(1, (d - R.min) / Math.max(1, R.max - R.min)));
      k *= 1 + R.bonus * u;
    }
    if (this.charged && T && T.charge && info && info.kind === 'heavy') { // 文杰: 蓄势一刀
      k *= T.charge.dmg;
      this.charged = false; this.chargeT = 0;
      Effects.flashFrame({ alpha: 0.22, t: 2 });
      Effects.text(this.x, this.y - 214, '蓄勢一刀!', this.c.theme2 || '#ffd24a', 15);
      this.world.shake(7, 10);
      info.kd = true;                                                    // 蓄满的重击必定击倒
    }
    return k;
  }

  onTraitHit(victim, info) {
    const T = this.c.trait;
    if (T && T.burn && victim && !victim.dead) {                         // 景英: 灼焼
      victim.burn = T.burn.ticks;
      victim.burnT = T.burn.every;
      victim.burnEvery = T.burn.every;
      victim.burnDmg = T.burn.dmg;
      victim.burnSrc = this;
      Effects.rise(victim.x, victim.y - 30, '#ff8428', 4);
    }
  }

  // ---- attack start / chain -------------------------------------------------
  startMove(key, chained = false) {
    // 蹲J 变招只在连锁内交替 —— 单发蹲J 必须永远是正手削足(否则会"起身"打返扫)
    if (!chained) this.altCL = false;
    // crouching variants: S held at the moment of the press
    if (this.pad.crouch && this.grounded && (key === 'light' || key === 'heavy') &&
        this.c.moves['c' + key]) {
      key = 'c' + key;
      // 蹲J·J 连打变招: 正手削足 -> 回手返扫(镜像刀光), 来回砍成一套动作
      if (key === 'clight' && this.c.moves.clight2) {
        if (this.altCL) key = 'clight2';
        this.altCL = !this.altCL;
      }
    } else if (key === 'light' && this.c.moves.light2) {
      if (this.altL) key = 'light2';
      this.altL = !this.altL;
    } else if (key === 'heavy' && this.c.moves.heavy2) {
      // 回升斩只在"真连招"时出现: 连锁 + 前一下 K 真命中(被防/单发/隔久 = 永远下劈)
      if (chained && this.rekkaH && this._chainHit) key = 'heavy2';
    }
    const def = this.c.moves[key];
    if (!def) return;
    if (def.kind === 'super') {
      if (!this.superReady()) return;
      this.meter = 0;
      this.world.superFlash(this, def);
      AudioSys.sfx('superCast');   // 超必发动喊话层(M1.4): 与 superFlash 叠成"起手"
      // 聚气 burst: embers gather into the body during the super flash
      // (the flash freezes the world, so these drift inward in slow motion)
      Effects.converge(this.x, this.y - 85, [this.c.theme, this.c.theme2, '#ffffff'], 42, 110);
    }
    if (def.kind === 'special') { this.specialCd = def.cooldown || 0; AudioSys.sfx('skillCast'); }
    if (def.invuln) this.invuln = Math.max(this.invuln, def.invuln);
    if (!chained) { this.rekka = false; this.rekkaH = false; this.rekkaN = 0; }
    this.state = 'attack';
    this.move = { def, t: 0, chained, hasHit: false, contact: false, contactT: 0, want: null, spawned: false, sfxDone: false, landed: false, landedT: 0 };
    this.setAnim(def.anim, true);
    // attacks inherit momentum: walking/dashing attacks step in, air attacks keep their arc
    if (!def.air && !def.dash) this.vx *= 0.6;
  }

  chainLegal(cur, nextKey) {
    const next = this.c.moves[nextKey];
    if (!next || cur.air) return false;
    if (cur.noChain) return false;                       // 蹲K: 独立技,不可取消出
    if (this.pad.crouch && nextKey === 'heavy') return false; // 也不可被连入
    if (nextKey === 'special' && !this.specialReady()) return false;
    if (nextKey === 'super' && !this.superReady()) return false;
    if (CHAIN_RANK[next.kind] > CHAIN_RANK[cur.kind]) return true;
    // rekkaMax: 轻击可连打段数(默认 1 -> J·J 两段; 晓艳 3 -> 四段)
    if (cur.kind === 'light' && next.kind === 'light' &&
        this.rekkaN < ((this.c.trait && this.c.trait.rekkaMax) || 1)) return true;
    if (cur.kind === 'heavy' && next.kind === 'heavy' && !this.rekkaH) return true;
    return false;
  }

  // ---- main update ------------------------------------------------------------
  update(opp) {
    if (this.frozen > 0) { this.frozen--; return; }

    if (this.invuln > 0) this.invuln--;
    if (this.specialCd > 0) this.specialCd--;
    if (this.backdashCd > 0) this.backdashCd--;
    if (this.comboable > 0) this.comboable--;
    if (this.flash > 0) this.flash--;
    if (this.lockout > 0) this.lockout--;
    if (this.dodgeBuff > 0) this.dodgeBuff--;
    this.tickTraits();
    if (this.combo.timer > 0) { this.combo.timer--; if (this.combo.timer <= 0) this.combo.count = 0; }
    // guard gauge recovers slowly, and only after a beat with no blocks —
    // sustained pressure keeps the crush threat alive
    if (this.guard > 0 && this.blockstun <= 0 && this.world.tick - (this.lastBlockT || 0) > 55) {
      this.guard = Math.max(0, this.guard - 0.14);
    }

    if (this.dead) {
      if (this.grounded) this.vx *= 0.8; // body settles instead of sliding away
      this.applyPhysics();
      this.updateAnim();
      return;
    }

    if (this.superSeq) { this.runSuperSeq(opp); this.applyPhysics(); this.updateAnim(); return; }

    switch (this.state) {
      case 'idle': case 'walk': case 'guard': this.groundedLogic(opp); break;
      case 'crouch': this.crouchLogic(opp); break;
      case 'block': this.blockLogic(opp); break;
      case 'jump': case 'fall': this.airLogic(opp); break;
      case 'dash': this.dashLogic(); break;
      case 'backdash': this.backdashLogic(); break;
      case 'attack': this.attackLogic(opp); break;
      case 'hit': this.hitLogic(); break;
      case 'down': this.downLogic(); break;
      case 'getup': this.getupLogic(); break;
    }

    this.applyPhysics();
    this.pickAnim();
    this.updateAnim();

    // full-meter aura
    if (this.meter >= 100 && this.world.tick % 7 === 0) {
      Effects.rise(this.x, this.y, this.c.theme2, 1);
    }
  }

  groundedLogic(opp) {
    this.facing = opp.x >= this.x ? 1 : -1;
    const p = this.pad;
    if (this.lockout > 0) { this.vx = 0; this.state = 'idle'; return; }

    if (p.super && this.superReady()) return this.startMove('super');
    if (p.special && this.specialReady()) return this.startMove('special');
    if (p.heavy) return this.startMove('heavy');
    if (p.light) return this.startMove('light');

    if (p.dashL || p.dashR) {
      const dir = p.dashR ? 1 : -1;
      if (dir === this.facing) return this.startDash(dir);
      if (this.backdashCd <= 0) return this.startBackdash(dir);
    }

    if (p.jump) {
      return this.doJump((p.right ? 1 : p.left ? -1 : 0) * this.c.walk * 1.15 * this.mob);
    }

    if (p.crouch) { this.state = 'crouch'; this.crouchT = 0; this.vx = 0; return; }

    const mx = (p.right ? 1 : 0) + (p.left ? -1 : 0);
    // proximity guard stance: holding back while the opponent is attacking
    // nearby primes the guard pose (actual block resolves on impact)
    const threat = opp.state === 'attack' && Math.abs(opp.x - this.x) < 340;
    if (threat && mx !== 0 && mx === -this.facing) {
      this.state = 'guard';
      this.vx = mx * this.c.walk * 0.45 * this.mob;
      return;
    }
    this.vx = mx * this.c.walk * this.mob;
    this.state = mx !== 0 ? 'walk' : 'idle';
  }

  /* crouch stance: locked in place; J/K become low attacks (mapped in
     startMove), U/I/W behave as normal */
  crouchLogic(opp) {
    this.facing = opp.x >= this.x ? 1 : -1;
    this.vx = 0;
    this.crouchT = (this.crouchT || 0) + 1;
    const p = this.pad;
    if (p.super && this.superReady()) return this.startMove('super');
    if (p.special && this.specialReady()) return this.startMove('special');
    if (p.heavy) return this.startMove('heavy');   // -> cheavy via startMove
    if (p.light) return this.startMove('light');   // -> clight via startMove
    if (p.jump) return this.doJump(0);
    if (!p.crouch) this.state = 'idle';
  }

  /* blockstun after a successful directional block */
  blockLogic(opp) {
    this.vx *= 0.8;
    if (this.blockstun > 0) { this.blockstun--; return; }
    this.state = 'idle';
  }

  airLogic(opp) {
    const p = this.pad;
    if (!this.move) {
      // 空中必杀(忍者空投): 有 airspecial 定义且可用 -> 空中苦无; 否则常规
      if (p.special && this.c.moves.airspecial && this.specialReady()) return this.startMove('airspecial');
      if (p.heavy) return this.startMove('dive');
      if (p.light) return this.startMove('air');
    }
    // real air control: steer toward held direction, capped just above walk speed
    // (M1.4 灵活性: 加速 0.55->0.75、上限 1.15->1.3x 走速 —— 空中不再像在水里划)
    const mx = (p.right ? 1 : 0) + (p.left ? -1 : 0);
    this.vx += mx * 0.75 * this.mob;
    const cap = this.c.walk * 1.3 * this.mob;
    this.vx = Math.max(-cap, Math.min(cap, this.vx));
    this.state = this.vy < 0 ? 'jump' : 'fall';
  }

  doJump(vx) {
    this.vy = this.c.jumpVy;
    this.grounded = false;
    this.vx = vx;
    this.state = 'jump';
    Effects.dust(this.x, this.y, 5);
    AudioSys.sfx('jump');
  }

  startDash(dir) {
    this.state = 'dash'; this.dashT = 0; this.dashDir = dir;
    Effects.dust(this.x, this.y, 7, -dir);
    AudioSys.sfx('dash');
  }

  startBackdash(dir) {
    this.state = 'backdash'; this.dashT = 0; this.dashDir = dir;
    this.invuln = 13;           // dodge i-frames
    this.backdashCd = 32;       // M1.4 灵活性: 42->32, 闪避可用得更勤
    Effects.dust(this.x, this.y, 7, -dir);
    AudioSys.sfx('dodge');
  }

  dashLogic() {
    this.dashT++;
    this.vx = this.dashDir * (this.c.dashVx || 9) * this.mob;
    if (this.dashT % 3 === 0) Effects.ghost(this.spriteParams());
    const p = this.pad;
    // dash-jump: leap carrying dash momentum
    if (p.jump) return this.doJump(this.dashDir * 8);
    // dash can cancel into attacks after a few ticks (M1.4 灵活性: 5->3, 冲刺斩出得更快)
    if (this.dashT > 3) {
      if (p.super && this.superReady()) return this.startMove('super');
      if (p.special && this.specialReady()) return this.startMove('special');
      if (p.heavy) return this.startMove('heavy');
      // dash+J: 有 dashslash 定义 -> 专属冲刺斩(奔り斬, 忍者突进); 否则常规轻击
      if (p.light) return this.startMove(this.c.moves.dashslash ? 'dashslash' : 'light');
    }
    if (this.dashT >= 20) { this.state = 'idle'; this.vx = 0; }
  }

  backdashLogic() {
    this.dashT++;
    this.vx = this.dashDir * (this.c.backdashVx || 7.5) * this.mob;
    if (this.dashT % 3 === 0) Effects.ghost(this.spriteParams());
    if (this.pad.jump) return this.doJump(this.dashDir * 6); // hop-back
    if (this.dashT >= 17) { this.state = 'idle'; this.vx = 0; }
  }

  attackLogic(opp) {
    const m = this.move;
    if (!m) { this.state = 'idle'; return; }
    m.t++;

    const d = m.def;
    // swing sound just before active frames (兜底: 招式没写 sfx 也不许无声出刀)
    if (!m.sfxDone && m.t >= Math.max(1, d.startup - 3)) {
      AudioSys.sfx(d.sfx || (d.kind === 'light' ? 'whooshL' : 'whooshH'));
      m.sfxDone = true;
    }
    // super act 1 聚气: inward ember stream while charging
    if (d.kind === 'super' && m.t < d.startup && m.t % 2 === 0) {
      Effects.converge(this.x, this.y - 85, [this.c.theme, this.c.theme2, '#ffffff'], 4, 74);
    }
    // 小跳升: crouching rising slash springs off the ground on its first
    // active tick — height is expressed physically, not by rotating the sprite
    if (d.hop && m.t === d.startup && this.grounded) {
      this.vy = d.hop;
      this.grounded = false;
      Effects.dust(this.x, this.y, 6);
    }
    // 刀光: 优先素材月牙重染(smear, 对齐由构造保证); 无烘焙层时回退程序化弧线
    // legacyFx 仅供 anim-lab 新旧对照, 游戏本体永不设置; dive 的 smear 在落地时触发
    if (m.t === d.startup && !d.dive) {
      // cullSmear: 连锁第二刀出手瞬间清掉前一刀残迹(两刀不糊)
      if (d.cullSmear) Effects.smears = Effects.smears.filter(s => s.owner !== this);
      // smearAlt: 同招多方案(蹲J·J 三版本), lab 用 cjjVariant 切换预览
      const sdef = (this.cjjVariant && d.smearAlt && d.smearAlt[this.cjjVariant]) || d.smear;
      const smeared = sdef && !this.legacyFx ? Effects.smearFx(this, sdef) : false;
      const fxDef = d.fx;
      if (!smeared && fxDef) {
        const list = Array.isArray(fxDef) ? fxDef : [fxDef];
        for (const e of list) {
          if (e.thrust) Effects.thrust(this.x + this.facing * (e.x || 48), this.y + (e.y || -40), this.facing, e);
          else Effects.slash(this.x + this.facing * (e.x || 48), this.y + (e.y || -100), this.facing, e);
        }
      }
    }
    // 招式演出层(数据驱动 d.flair): fx 只在没有烘焙月牙时才画, 所以必杀/超必的
    // 排场必须走这条独立钩子 —— 与 smear 叠加, 不抢它的位
    if (d.flair && m.t === d.startup + (d.flair.delay || 0)) this.playFlair(d.flair);
    // 俯冲斩速度感: 下坠期间密集残影拖尾(影·墜滅)
    if (d.dive && !m.landed && m.t >= d.startup && m.t % 2 === 0) {
      Effects.ghost(this.spriteParams());
    }
    // forward motion (dash specials / supers)
    if (d.dash && m.t >= d.dash.from && m.t <= d.dash.to) {
      this.vx = this.facing * d.dash.vx;
      // super act 2 突进: denser afterimages + horizontal speed lines
      if (m.t % (d.kind === 'super' ? 2 : 3) === 0) Effects.ghost(this.spriteParams());
      if (d.kind === 'super') {
        Effects.parts.push({
          x: this.x - this.facing * (8 + Math.random() * 52),
          y: this.y - 28 - Math.random() * 112,
          vx: -this.facing * (5 + Math.random() * 4), vy: 0,
          life: 5 + Math.random() * 4, maxLife: 9,
          size: 2, w: 12 + Math.floor(Math.random() * 12), h: 2,
          color: Math.random() < 0.5 ? this.c.theme2 : '#ffffff',
          grav: 0,
        });
      }
    } else if (!d.air) {
      this.vx *= 0.9;
    }
    // dive attack: plunge down-forward, slam on landing
    if (d.dive) {
      if (!m.landed) {
        if (m.t >= d.startup) {
          this.vy = Math.max(this.vy, d.diveSpeed);
          this.vx = this.facing * d.diveDrift;
          if (m.t % 3 === 0) Effects.ghost(this.spriteParams());
        }
      } else if (m.t >= m.landedT + d.recovery) {
        this.move = null;
        this.state = 'idle';
        this.rekka = false;
        return;
      }
    }
    // kenji teleport super: 内爆 at the vanish point, 外爆 at the arrival
    if (d.teleport && m.t === d.teleport.at) {
      Effects.converge(this.x, this.y - 90, ['#7d5bff', '#35e0d8', '#c9baff'], 16, 52);
      Effects.spark(this.x, this.y - 90, 0, ['#7d5bff', '#ffffff'], 6, 3);
      const side = opp.x >= this.x ? 1 : -1;
      this.x = Math.max(STAGE.left, Math.min(STAGE.right, opp.x + side * d.teleport.offset));
      this.facing = opp.x >= this.x ? 1 : -1;
      this.invuln = Math.max(this.invuln, d.teleport.invuln);
      Effects.ring(this.x, this.y - 90, '#c9baff', 14);
      Effects.spark(this.x, this.y - 90, 0, ['#7d5bff', '#35e0d8', '#ffffff'], 12, 5);
      AudioSys.sfx('tele');
    }
    // projectile spawn
    if (d.projectile && m.t === d.startup && !m.spawned) {
      m.spawned = true;
      this.world.spawnProjectile(this, d.projectile);
    }

    // buffer chain input
    const p = this.pad;
    if (p.super) m.want = 'super';
    else if (p.special) m.want = 'special';
    else if (p.heavy) m.want = 'heavy';
    else if (p.light) m.want = 'light';

    // execute chain on contact within the cancel window
    if (m.want && m.contact && m.t <= m.contactT + 18 && this.grounded && this.chainLegal(d, m.want)) {
      const nextKind = this.c.moves[m.want].kind;
      if (d.kind === 'light' && nextKind === 'light') { this.rekka = true; this.rekkaN++; }
      if (d.kind === 'heavy' && nextKind === 'heavy') this.rekkaH = true;
      this._chainHit = m.hitLanded === true;  // 连锁来源是否真命中(变招路由用)
      const key = m.want;
      this.move = null;
      return this.startMove(key, true);
    }

    if (!d.dive && m.t >= d.total) {
      this.move = null;
      this.state = this.grounded ? 'idle' : 'fall';
      this.rekka = false;
      this.rekkaH = false;
      this.rekkaN = 0;
    }
  }

  hitLogic() {
    this.vx *= 0.88;
    if (this.grounded) {
      if (this.kdPending) return this.knockdown();
      this.hitstun--;
      if (this.hitstun <= 0) this.state = 'idle';
    }
    // airborne: wait for landing (applyPhysics handles the fall)
  }

  knockdown() {
    this.kdPending = false;
    this.juggleN = 0;
    this.state = 'down'; this.stateT = 52;
    this.setAnim('death', true);
    Effects.dust(this.x, this.y, 10);
    this.world.shake(4, 10);
    AudioSys.sfx('land');
  }

  downLogic() {
    this.vx *= 0.8;
    this.stateT--;
    if (this.stateT <= 0) {
      this.state = 'getup'; this.stateT = 16;
      this.invuln = 42;
      AudioSys.sfx('getup');
    }
  }
  getupLogic() {
    this.stateT--;
    if (this.stateT <= 0) this.state = 'idle';
  }

  // cinematic super: victim is held, scripted hits land on a timer
  runSuperSeq(opp) {
    const s = this.superSeq;
    s.t++;
    opp.frozen = 2;
    opp.state = 'hit'; opp.hitstun = 12; opp.setAnim('hit');
    opp.grounded = true; opp.y = STAGE.ground; opp.vy = 0; opp.vx = 0;

    // 超杀演出编排分流(剑二三方案, lab 可切换预览; 未指定走通用月华式)
    if (s.style === 'iai') return this.runCineIai(opp, s);
    if (s.style === 'clones') return this.runCineClones(opp, s);
    if (s.style === 'rain') return this.runCineRain(opp, s);
    if (s.style === 'staff') return this.runCineStaff(opp, s);          // M1 悟空·大聖乱舞
    if (s.style === 'arrowrain') return this.runCineArrowRain(opp, s);  // M1 后羿·射日
    if (s.style === 'flame') return this.runCineFlame(opp, s);          // M1 安琪拉·熾熱光輝
    if (s.style === 'fandance') return this.runCineFandance(opp, s);    // M1.3 貂蝉·花舞乱影
  
    if (s.t % s.interval === 0 && s.done < s.hits) {
      s.done++;
      const dmg = Math.max(1, Math.round(s.dmgPer * s.scale));
      opp.hp = Math.max(0, opp.hp - dmg);
      opp.lastHurt = this.world.tick;
      opp.flash = 5;
      opp.setAnim('hit', true);
      this.combo.count++; this.combo.timer = 60;
      this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, this.combo.count);
      AudioSys.sfx('hurtH');   // 演出每一拍的受击层(M1.4)
      // restart the anim ON its slash frame so every cine hit reads as a cut
      this.setAnim(s.done % 2 === 0 ? 'attack1' : 'attack2', true);
      const sImp = this.c.moves.super.impact !== undefined ? this.c.moves.super.impact : 2;
      this.anim.t = this.c.anims[this.anim.name].hold * sImp;
      // act 3 演出: 每段 cine 用画师月牙 smear 交替开斩(attack1 撩/attack2 扫),
      // 主题色轮换 + 全屏白闪一瞬 + 大星爆 —— 月华式爽快
      // 基底重染走 draw() 的帧同步覆盖(cineSmear), 这里只补出刀闪白动效
      let smeared = false;
      const cineBank = Assets.smears[`${this.c.id}:${this.anim.name}`];
      if (!this.legacyFx && cineBank && Object.keys(cineBank.frames).length) {
        this.cineSmear = {
          edge: s.done % 2 === 0 ? this.c.theme : this.c.theme2,
          core: '#fff6e8', rim: 4,
        };
        smeared = Effects.smearFx(this, {
          phases: [{ t: 4 }], decay: 0,
          edge: this.cineSmear.edge,
        }, this.anim.name);
      }
      if (!smeared) {
        const cutA = [[-2.5, 0.45], [0.7, -2.55], [-1.15, 1.0]][(s.done - 1) % 3];
        Effects.slash(opp.x - this.facing * 8, opp.y - 96, this.facing, {
          r: 130, a0: cutA[0], a1: cutA[1], w: 20, life: 13, grow: 2.2, sweep: 0.34,
          color: s.done % 2 === 0 ? '#ffffff' : (this.c.id === 'mack' ? '#ffe27a' : '#b9fff7'),
          color2: s.done % 2 === 0 ? this.c.theme2 : this.c.theme,
        });
      }
      Effects.impact(opp.x, opp.y - 100, this.facing, { tier: 3, color: this.c.theme2 });
      Effects.flashFrame({ alpha: 0.26, t: 2 });
      this.world.hitstop(6);
      this.world.shake(5, 6);
      AudioSys.sfx('hitH');
    }

    const finished = s.done >= s.hits && s.t >= s.hits * s.interval + 14;
    if (finished || opp.hp <= 0) {
      // final launcher
      const dmg = Math.max(1, Math.round(s.final * s.scale));
      opp.hp = Math.max(0, opp.hp - dmg);
      opp.frozen = 0;
      opp.state = 'hit'; opp.setAnim('hit', true);
      // 终结崩飞: 超杀收尾要把人打得又高又远(vx 有 0.88/tick 摩擦衰减, 要给足)
      opp.grounded = false; opp.vy = -12; opp.vx = this.facing * 18;
      opp.kdPending = true;
      this.combo.count++; this.combo.timer = 90;
      this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, this.combo.count);
      // 终结一击: 最大星爆 + 全屏过曝白闪 + 月华级长冻结, 再叠终结变体
      // (A 桜吹雪 / B 月輪爆 / C 斬鉄十字, 纯视觉, finisherOverride 供 lab 预览)
      Effects.impact(opp.x, opp.y - 110, this.facing, { tier: 4, color: this.c.theme2 });
      Effects.flashFrame({ alpha: 0.5, t: 3 });
      const variant = this.finisherOverride || this.c.moves.super.finisher || 'A';
      Effects.superFinale(variant, opp.x, opp.y, this);
      // 前快后慢(Eric): 终结爆发一律配重 slowmo 余韵(桜吹雪落樱在慢镜中飘)
      this.world.slowmoT = variant === 'B' ? 16 : 20;
      this.world.slowmo = variant === 'B' ? 0.4 : 0.38;
      this.world.slowAcc = 0;
      this.world.hitstop(18);
      this.world.shake(variant === 'B' ? 13 : 11, 16);
      AudioSys.sfx('hitH');
      AudioSys.sfx('hurtCrit');   // 终结一击的受击层(M1.4)
      this.superSeq = null; this.cineSmear = null;
      this.state = 'idle'; this.move = null;
      this.setAnim('idle', true);
    }
  }

  /* 通用: 演出内的一次伤害记账(与通用 cine 每 hit 完全一致的数额/连击计数) */
  cineDamageTick(opp, s) {
    s.done++;
    const dmg = Math.max(1, Math.round(s.dmgPer * s.scale));
    opp.hp = Math.max(0, opp.hp - dmg);
    opp.lastHurt = this.world.tick;
    opp.flash = 5;
    opp.setAnim('hit', true);
    AudioSys.sfx('hurtH');   // 演出每一拍都让被打的人出声(M1.4)
    this.combo.count++; this.combo.timer = 60;
    this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, this.combo.count);
  }

  /* 通用: 演出终结(伤害数额与通用路径一致, 视觉可由调用方叠加) */
  cineFinish(opp, launchVy = -12, launchVx = 18) {
    const s = this.superSeq;
    const dmg = Math.max(1, Math.round(s.final * s.scale));
    opp.hp = Math.max(0, opp.hp - dmg);
    opp.frozen = 0;
    opp.state = 'hit'; opp.setAnim('hit', true);
    opp.grounded = false; opp.vy = launchVy; opp.vx = this.facing * launchVx;
    opp.kdPending = true;
    this.combo.count++; this.combo.timer = 90;
    this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, this.combo.count);
    AudioSys.sfx('hurtCrit');   // 专属分镜的终结受击层(M1.4)
    this.superSeq = null; this.cineSmear = null;
    this.state = 'idle'; this.move = null;
    this.setAnim('idle', true);
  }

  /* 方案① 影縫い·居合: 瞬身背后纳刀 → 八道斩线无声浮现 → 一拍寂静 →
     全部伤害一齐爆发。居合"先斩后觉", 与隼人的狂暴突进两极。 */
  runCineIai(opp, s) {
    if (s.t === 1) {
      // 瞬身到对手身后, 纳刀姿(idle 首帧定住)
      this.x = opp.x + this.facing * 96;
      this.facing = -this.facing;
      this.setAnim('idle', true);
      Effects.ring(this.x, this.y - 90, '#c9baff', 12);
      AudioSys.sfx('tele');
    }
    this.anim.frame = 0; this.anim.t = 0;    // 纳刀静止
    // t4..25: 八道斩线逐条浮现(伤害此刻不结算 —— 居合的"先斩后觉")
    if (s.t >= 4 && s.t <= 25 && (s.t - 4) % 3 === 0) {
      const i = (s.t - 4) / 3;
      const angs = [-0.5, 0.6, -1.1, 1.3, 0.1, -1.7, 0.9, -0.2];
      Effects.cutLine(opp.x + (i % 3 - 1) * 9, opp.y - 96 + ((i * 37) % 60) - 30,
        angs[i % 8], 96 + (i % 3) * 22, '#b9fff7');
      AudioSys.sfx('whooshL');
    }
    // t26..27: 三段伤害记账(静止中无声结算, 视觉仍无动静 —— 蓄)
    if (s.t === 26) { this.cineDamageTick(opp, s); this.cineDamageTick(opp, s); this.cineDamageTick(opp, s); }
    // t28..36: 一拍寂静
    // t37: 爆发 —— 全部斩线碎裂 + 终结
    if (s.t === 37) {
      Effects.burstCutLines();
      Effects.impact(opp.x, opp.y - 100, -this.facing, { tier: 4, color: this.c.theme2 });
      Effects.flashFrame({ alpha: 0.55, t: 3 });
      Effects.shockRing(opp.x, opp.y - 60, this.c.theme2);
      this.world.hitstop(14);
      this.world.shake(12, 14);
      this.world.slowmoT = 14; this.world.slowmo = 0.4; this.world.slowAcc = 0;
      AudioSys.sfx('hitH');
      // 崩飞方向: 朝剑二背对的方向(他已换边)
      this.cineFinish(opp, -12, -18);
    }
  }

  /* 定版超杀 残影分身 v3(Eric 分镜定稿, 三方案共享骨架):
     ① 瞬身敌后 → 完整重击(举刀过顶 → 抡下, 全程动作帧)
     ② 背刺 smear 消退后, 对侧 ghost 清晰淡入登场(专属拍, 不被遮挡)
     ③ 三回合双向交叉(前两回合有伤害, 第三回合双人同拍对穿纯声势);
        方案差异在交叉的动作组合(A一横一竖 / B雁行错拍 / C上下挟撃)
     ④ ghost 优雅消散(淡出+升华残光) → 居合斩线 → 一齐爆发(炸离剑二)
     smear 物理一致性: 谁挥刀月牙在谁位置, 动作对应月牙, 朝向=挥刀方向。 */
  runCineClones(opp, s) {
    const self = this;
    // 演出期间连击窗口保活(v3 节奏放慢后, 波与爆发间隔可超过 60tick 计时器)
    if (this.combo.count > 0) this.combo.timer = Math.max(this.combo.timer, 30);
    const V = this.cineVarOverride || (this.c.moves.super.cine && this.c.moves.super.cine.variant) || 'A';
    const W = 16;                                    // 单回合冲刺时长(放慢)
    const w = [30, 56, 82];                          // 三回合起点
    const ghostAt = 20, linesAt = w[2] + W + 12, burstAt = linesAt + 36; // 线24t+静场12t

    // ── ① 瞬身敌后 + 完整重击: 举刀(f2→f3) → 抡下(f1 斩+月牙) ──
    if (s.t === 1) {
      // 记住发动时自己在敌人哪一侧: 三回合交叉的方向以此为基准, 演出结束
      // 回到原侧(旧版方向写死 -1/+1/-1, 无论从哪边放最后都落在敌人左边 — Eric 报的 bug)
      s.side = Math.sign(this.x - opp.x) || -this.facing;
      this.x = opp.x + this.facing * 84;
      this.facing = -this.facing;
      Effects.ring(this.x, this.y - 90, '#c9baff', 12);
      Effects.dust(this.x, this.y, 6);
      AudioSys.sfx('tele');
      this.cineSmear = null;
    }
    if (s.t >= 2 && s.t <= 15) {                     // 完整挥击脚本
      // 注意: updateAnim 在本函数之后运行并按 anim.t 重算帧 —— 必须写计时器
      // 而非帧号, 否则脚本帧被覆盖(曾致"举刀"根本没显示)
      const fr = s.t <= 6 ? 2 : s.t <= 11 ? 3 : 1;   // 举刀→过顶→抡下
      this.anim.name = 'attack2';
      this.anim.t = fr * this.c.anims.attack2.hold;
      this.anim.frame = fr;
      if (s.t === 12) {                              // 斩落瞬间
        this.cineSmear = { edge: '#7d5bff', core: '#efe8ff', rim: 2 };
        this.cineDamageTick(opp, s);                 // 第 1 段
        Effects.impact(opp.x, opp.y - 96, this.facing, { tier: 3, color: '#7d5bff' });
        this.world.hitstop(7); this.world.shake(5, 6);
        Effects.flashFrame({ alpha: 0.3, t: 2 }); // 背刺闪屏(Eric: 隼人超必要有一闪一闪的冲击感)
        AudioSys.sfx('hitH');
      }
    }
    if (s.t === 16) this.cineSmear = null;

    // ── ② ghost 登场拍(背刺 smear 已消退, 画面干净; 面向敌人) ──
    if (s.t === ghostAt) {
      s.gside = -this.facing;                        // ghost 在剑二对侧
      const gx = opp.x - this.facing * 170;
      Effects.cloneRun(this, 'idle', gx, gx + 1, opp.y, w[0] - ghostAt + 2, null,
        { fadeIn: 6, face: Math.sign(opp.x - gx) || 1 });
      Effects.ring(gx, opp.y - 90, '#7d5bff', 10);
      AudioSys.sfx('tele');
    }

    // ── ③ 三回合交叉(方案差异) ──
    w.forEach((wStart, wi) => {
      // 注意: 超必 move 阶段已瞬身到敌后, s.side 是瞬身后的侧 —— 取反才是玩家发动侧
      const dir = (wi % 2 === 0 ? -1 : 1) * (s.side || -1); // 本体交替方向(末回合落回玩家发动侧)
      if (s.t === wStart) {
        s.run = { from: opp.x - dir * 190, to: opp.x + dir * 190, dir, t0: wStart };
        this.x = s.run.from; this.facing = dir;
        this.setAnim('attack1', true); this.anim.frame = 0;
        this.cineSmear = null;
        // ghost 的反向穿越: 方案决定动作/轨迹/时机
        const gDelay = V === 'B' ? 8 : 0;            // B: 雁行错半拍
        const gAnim = V === 'A' ? 'attack2' : 'attack1'; // A: ghost 用下劈(一横一竖)
        const gY0 = V === 'C' ? opp.y - 150 : opp.y; // C: ghost 从高处俯冲
        s.gq = s.gq || [];
        s.gq.push({ at: wStart + gDelay, dir, gAnim, gY0, wi });
      }
      // 本体连续冲刺 + 中点挥刀(横斩, 月牙原位帧同步)
      if (s.run && s.run.t0 === wStart && s.t > wStart && s.t <= wStart + W) {
        const u = (s.t - wStart) / W;
        this.x = s.run.from + (s.run.to - s.run.from) * u;
        if (s.t % 2 === 0) Effects.ghost(this.spriteParams());
        if (s.t === wStart + (W >> 1)) {
          this.setAnim('attack1', true);
          this.cineSmear = { edge: '#35e0d8', core: '#eafffd', rim: 2 };
          s.hold = { name: 'attack1', frame: 1, until: s.t + 4 };
          // 三回合全部结算(2026-07-11 Eric: 第三回合有命中音却不掉血像 bug ——
          // 伤害重分配为 4x5+13, 每个视觉节拍都对应血条一跳, 总量 33 不变)
          this.cineDamageTick(opp, s);
          Effects.impact(opp.x, opp.y - 96, dir, { tier: 3, color: '#7d5bff' });
          this.world.hitstop(5); this.world.shake(4, 5);
          Effects.flashFrame({ alpha: 0.26, t: 2 }); // 每回合交叉命中都闪一下
          AudioSys.sfx('hitH');
        }
      }
    });
    // ghost 穿越队列(支持错拍)
    if (s.gq) {
      for (const g of s.gq.filter(g => g.at === s.t)) {
        Effects.cloneRun(this, g.gAnim, opp.x + g.dir * 190, opp.x - g.dir * 190, g.gY0, W, () => {
          const sheet = g.gAnim === 'attack2' ? 'fx:ka2' : 'fx:ka1';
          Effects.smearFx(self, {
            standalone: true, sheet, phases: [{ f: 0, t: 3 }], decay: 1,
            atX: opp.x - g.dir * 14, atY: opp.y, dir: -g.dir, scale: 0.88,
            dy: g.gAnim === 'attack2' ? -12 : 0,
            edge: '#35e0d8', core: '#d6fff8',
          }, g.gAnim);
          Effects.flashFrame({ alpha: 0.14, t: 2 }); // ghost 穿越微闪(叠出频闪节奏)
        }, { y1: opp.y });
        AudioSys.sfx('dash');
      }
    }
    // 斩帧保持(写计时器, 防 updateAnim 覆盖)
    if (s.hold && s.t <= s.hold.until) {
      this.anim.name = s.hold.name;
      this.anim.t = s.hold.frame * this.c.anims[s.hold.name].hold;
      this.anim.frame = s.hold.frame;
    }

    // ── ④ ghost 显眼消散 → 居合斩线(放慢) → 长静场 → 爆发(炸离剑二) ──
    // 节奏设计(Eric): 前段快, 收尾慢 —— 斩线一条条来, 静场拉长, 爆发带重slowmo
    if (s.t === w[2] + W + 4) {
      const gx = opp.x - s.run.dir * 150;
      // 消散加强: 静立残影缓慢淡出 + 双层升华残光 + 柔环 + 瞬身音
      Effects.cloneRun(this, 'idle', gx, gx + 1, opp.y, 4, null,
        { fadeIn: 0, face: Math.sign(opp.x - gx) || 1 });
      Effects.rise(gx, opp.y - 10, '#c9baff', 10);
      Effects.rise(gx, opp.y - 45, '#7d5bff', 8);
      Effects.rise(gx, opp.y - 85, '#eafffd', 6);
      Effects.ring(gx, opp.y - 65, '#c9baff', 14);
      AudioSys.sfx('tele');
      this.setAnim('idle', true); this.cineSmear = null;
      this.facing = Math.sign(opp.x - this.x) || 1;  // 面向对手(爆炸方向基准)
    }
    // 斩线: 每 4 tick 一条(慢, 每条都读得清)
    if (s.t >= linesAt && s.t < linesAt + 24 && (s.t - linesAt) % 4 === 0) {
      const i = (s.t - linesAt) / 4;
      const angs = [-0.6, 0.7, -1.2, 1.4, 0.1, -1.8];
      Effects.cutLine(opp.x + (i % 3 - 1) * 8, opp.y - 92 + ((i * 41) % 54) - 27,
        angs[i % 6], 92 + (i % 3) * 20, '#c9baff');
      AudioSys.sfx('whooshL');
    }
    // 静场一拍半, 然后爆发(重 slowmo 收尾)
    if (s.t >= burstAt) {
      Effects.burstCutLines();
      Effects.impact(opp.x, opp.y - 100, this.facing, { tier: 4, color: this.c.theme2 });
      Effects.shockRing(opp.x, opp.y - 60, this.c.theme2);
      Effects.flashFrame({ alpha: 0.55, t: 3 });
      this.world.hitstop(18);
      this.world.shake(13, 16);
      this.world.slowmoT = 22; this.world.slowmo = 0.35; this.world.slowAcc = 0;
      AudioSys.sfx('hitH');
      // 爆炸方向 = 炸离剑二(facing 已在消散拍指向对手)
      this.cineFinish(opp, -13, 16);
    }
  }

  /* 方案③ 手裏剣·封殺陣: 后跃撒镖钉住对手 → 突进终结 */
  runCineRain(opp, s) {
    if (s.t === 1) {
      this.x = opp.x - this.facing * 250;   // 后跃拉开
      this.setAnim('jump', true);
      Effects.dust(this.x, this.y, 8);
      AudioSys.sfx('jump');
    }
    if (s.t < 30) { this.anim.name = 'jump'; this.anim.frame = 0; }
    // 三波手里剑: 从剑二上方弧线飞向对手, 到达即钉住+结算
    if (s.t % s.interval === 4 && s.done < s.hits) {
      const i = s.done;
      const self = this;
      Effects.pinStar(this.x + this.facing * 20, this.y - 130 - i * 14,
        opp.x + (i - 1) * 10, opp.y - 70 - ((i * 43) % 50), 9, () => {
          self.cineDamageTick(opp, s);
          Effects.spark(opp.x, opp.y - 90, self.facing, ['#c9baff', '#7d5bff'], 6, 4);
          self.world.hitstop(4);
          AudioSys.sfx('hitL');
        });
      AudioSys.sfx('projectile');
    }
    // 终结: 突进穿过被钉住的对手, 镖齐爆
    if (s.done >= s.hits && s.t >= s.hits * s.interval + 18) {
      const from = this.x;
      this.x = opp.x + this.facing * 110;   // 瞬身穿过
      Effects.cloneRun(this, 'attack1', from, this.x, this.y, 8, null);
      Effects.smearFx(this, { standalone: true, sheet: 'fx:ka1', phases: [{ f: 0, t: 4 }], decay: 2, dx: opp.x - this.x, dy: -6, edge: '#35e0d8', core: '#eafffd' }, 'attack1');
      Effects.burstPinStars();
      Effects.impact(opp.x, opp.y - 100, this.facing, { tier: 4, color: this.c.theme2 });
      Effects.flashFrame({ alpha: 0.5, t: 3 });
      this.world.hitstop(15);
      this.world.shake(11, 14);
      AudioSys.sfx('hitH');
      this.cineFinish(opp, -12, 16);
    }
  }

  /* 数据驱动的招式演出(d.flair): 一组可选开关, 让每个角色的必杀/超必有专属排场。
     全部字段可选, 缺省用角色 theme 配色; 坐标以出招者为原点、按朝向镜像。
       x/y 演出中心偏移 · delay 相对 startup 的触发延迟
       converge 聚气粒子数 · ring 冲击环点数 · shock 地面激波环数
       spark 星屑数(sparkPow 力度) · pillar 冲天光柱 · beam 横贯光束
       stars/cut 收束已有钉星/刀线 · dust 尘暴 · rise 上升光屑 · petals 花瓣爆
       flash 全屏闪 alpha · shake 震屏 · text 招式喊话 · sfx 额外音效 */
  playFlair(F) {
    const dir = this.facing;
    const cx = this.x + dir * (F.x !== undefined ? F.x : 60);
    const cy = this.y + (F.y !== undefined ? F.y : -95);
    const c1 = F.color || this.c.theme2 || '#ffe27a';
    const c2 = F.color2 || this.c.theme || '#ffffff';
    if (F.converge) Effects.converge(this.x, this.y - 90, [c1, c2, '#ffffff'], F.converge, F.convergeR || 78);
    if (F.ring) Effects.ring(cx, cy, c1, F.ring === true ? 16 : F.ring);
    if (F.shock) for (let i = 0; i < F.shock; i++) Effects.shockRing(cx + dir * i * 30, this.y, c1, i * 4);
    if (F.spark) Effects.spark(cx, cy, dir, [c1, c2, '#ffffff'], F.spark, F.sparkPow || 6);
    if (F.pillar) Effects.pillar(cx, this.y, c1);
    if (F.beam) Effects.beam(this.x + dir * 44, cy, dir, { core: '#ffffff', edge: c1, glow: c2, life: F.beam === true ? 26 : F.beam, maxW: F.beamW || 16 });
    if (F.stars) Effects.burstPinStars();
    if (F.cut) Effects.burstCutLines();
    if (F.dust) Effects.dust(this.x, this.y, F.dust, dir);
    if (F.rise) Effects.rise(this.x, this.y, c1, F.rise);
    if (F.petals) Effects.petalBurst(cx, cy, F.petals);
    if (F.flash) Effects.flashFrame({ alpha: F.flash, t: F.flashT || 3, color: F.flashColor || '#ffffff' });
    if (F.shake) this.world.shake(F.shake, F.shakeT || 10);
    if (F.text) Effects.text(this.x, this.y - (F.textY || 200), F.text, c1, F.textSize || 15);
    if (F.sfx) AudioSys.sfx(F.sfx);
  }

  // ---- receiving hits -----------------------------------------------------
  /* returns 'block' | 'crush' | 'hit' */
  receiveHit(info, attacker) {
    const dir = attacker.x >= this.x ? -1 : 1; // knock direction (away from attacker)
    // KOF-style directional guard: you block only if, at the moment of impact,
    // you are grounded in a neutral state AND holding away from the attacker.
    // Committed actions (attacks/dashes/jumps) can't guard; cross-ups flip
    // which direction counts as "away".
    const blocking = this.grounded && !info.unblockable &&
                     ['idle', 'walk', 'guard', 'block'].includes(this.state) &&
                     this.holdingAway(attacker.x);

    /* 霸体(毅·不退の棍): 重击前摇窗口内硬吃一下 —— 掉血但不进硬直/不被击退,
       换来一次强行换招的机会。超必打破霸体(否则无敌等级失衡)。 */
    const AR = this.c.trait && this.c.trait.armor;
    if (AR && !blocking && info.kind !== 'super' && this.state === 'attack' &&
        this.move && this.move.def.armor && this.move.t < this.move.def.startup) {
      const dmg = Math.max(1, Math.round(info.dmg * AR.dmgTaken * (this.c.dmgTaken || 1) *
                                         (attacker.dmgDealt || 1)));
      this.hp = Math.max(1, this.hp - dmg);   // 霸体不会被这一下打死
      this.lastHurt = this.world.tick;
      this.flash = 4;
      this.gainMeter(AR.meter);
      Effects.text(this.x, this.y - 205, 'ARMOR', '#ffd24a', 13);
      Effects.spark(this.x, this.y - 90, -Math.sign(attacker.x - this.x) || 1, ['#ffd24a', '#fff2d8'], 7, 4);
      AudioSys.sfx('block');
      this.world.hitstop(5);
      return 'armor';
    }

    if (blocking) {
      this.facing = attacker.x >= this.x ? 1 : -1;
      this.state = 'block';
      this.lastBlockT = this.world.tick;
      // trait.guardMul(钰胜·不動如山 = 0.5): 护条积累系数, <1 极难被破防
      this.guard += (info.guardDmg || 8) * 1.45 * ((this.c.trait && this.c.trait.guardMul) || 1);
      if (this.guard >= 100) return this.guardCrush(dir);
      const chip = Math.round((info.chip || 0) * (attacker.dmgDealt || 1));
      if (chip > 0) { this.hp = Math.max(1, this.hp - chip); this.lastHurt = this.world.tick; } // chip never KOs
      this.blockstun = info.blockstun || 10;
      this.vx = dir * Math.max(3, (info.knock || 4) * 0.6);
      attacker.vx = -dir * Math.min(5, 3 + (info.knock || 4) * 0.35); // 攻方被结界弹回的阻尼
      this.gainMeter(3);
      attacker.gainMeter(4);
      AudioSys.sfx('block');
      return 'block';
    }

    const wasAir = !this.grounded; // 在挑空 pop 之前采样: 本次是否空中受击
    const scale = attacker.comboScale(this);
    // c.dmgTaken: 角色级减伤系数(肉盾 0.8) —— maxHp 保持 100, HUD/完胜判定不受影响
    // attacker.dmgDealt: 实例级出伤系数(闯关杂兵 <1) —— 对战不设, 只有 Quest 会挂
    const dmg = Math.max(1, Math.round(info.dmg * scale * (this.c.dmgTaken || 1) *
                                       (attacker.dmgDealt || 1) * attacker.traitDmgMul(this, info)));
    this.hp = Math.max(0, this.hp - dmg);
    this.lastHurt = this.world.tick;
    this.flash = 6;
    this.blockstun = 0; // getting hit out of block must not leak blockstun
    this.hitstun = info.hitstun || 16;
    this.vx = dir * (info.knock || 4);
    this.state = 'hit';
    this.move = null;
    this.setAnim('hit', true);
    // 浮空追击计数: 空中吃的第 1 下允许, 之后 juggleImmune() 免疫到落地。
    // 飞行道具(info.proj)不占配额 —— 空中被飞镖点到后仍可被近身补 1 刀(Eric);
    // 配额用尽后飞镖同样被 juggleImmune 挡住, 上限依旧是"落地前多挨 1 次近身击"
    this.juggleN = !wasAir ? 0 : (this.juggleN || 0) + (info.proj ? 0 : 1);

    if (info.kd || !this.grounded) {
      this.grounded = false;
      this.vy = Math.min(this.vy, info.launch || -7.5); // launchers pop higher
      this.kdPending = true;
    }

    // combo bookkeeping
    if (this.comboable > 0) attacker.combo.count++;
    else attacker.combo.count = 1;
    attacker.combo.timer = 60;
    this.comboable = this.hitstun + 22;
    this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, attacker.combo.count);

    this.gainMeter(Math.round(dmg * 0.7));
    attacker.gainMeter(info.meterHit || 8);
    attacker.onTraitHit(this, info);
    AudioSys.sfx(info.hitSfx || 'hitL');
    // 受击层(M1.4): 打击点之外, 挨打的一方按伤害分档出一声闷响 —— 「被击打要有音效」
    AudioSys.sfx(dmg >= 18 ? 'hurtCrit' : dmg >= 9 ? 'hurtH' : 'hurtL');
    return 'hit';
  }

  guardCrush(dir) {
    this.guard = 0;
    this.blockstun = 0;
    this.state = 'hit';
    this.move = null;
    this.hitstun = 55;
    this.comboable = 70;
    this.flash = 8;
    this.vx = dir * 5;
    this.setAnim('hit', true);
    Effects.text(this.x, this.y - 205, 'GUARD CRUSH!', '#ffc531', 15);
    AudioSys.sfx('crush');
    return 'crush';
  }

  die() {
    this.dead = true;
    this.hp = 0;
    this.superSeq = null; this.cineSmear = null;
    this.move = null;
    this.frozen = 0;
    this.state = 'dead';
    this.setAnim('death', true);
  }

  // ---- physics -------------------------------------------------------------
  applyPhysics() {
    if (!this.grounded) {
      this.vy += 0.8;
      this.y += this.vy;
      if (this.y >= STAGE.ground) {
        this.y = STAGE.ground;
        this.grounded = true;
        this.vy = 0;
        Effects.dust(this.x, this.y, 5);
        if (this.dead) { /* body settles */ }
        else if (this.state === 'hit' && this.kdPending) this.knockdown();
        else if (this.state === 'attack' && this.move && this.move.def.dive && !this.move.landed) {
          // ground slam impact — 斩击帧落在着地瞬间, smear 也在此时炸开
          this.move.landed = true;
          this.move.landedT = this.move.t;
          this.vx = 0;
          if (this.move.def.smear && !this.legacyFx) Effects.smearFx(this, this.move.def.smear);
          Effects.dust(this.x, this.y, 14);
          Effects.ring(this.x, this.y - 8, '#ffd27a');
          this.world.shake(8, 12);
          AudioSys.sfx('slam');
        }
        else if (this.state === 'attack' && this.move && this.move.def.air) {
          this.move = null; this.state = 'idle'; this.lockout = 5;   // M1.4 灵活性: 8->5
          AudioSys.sfx('land');
        } else if (this.state === 'jump' || this.state === 'fall') {
          this.state = 'idle'; this.lockout = 3;                     // M1.4 灵活性: 5->3
          AudioSys.sfx('land');
        }
      }
    }
    this.x += this.vx;
    if (this.x < STAGE.left) { this.x = STAGE.left; if (this.state !== 'hit') this.vx = 0; }
    if (this.x > STAGE.right) { this.x = STAGE.right; if (this.state !== 'hit') this.vx = 0; }
  }

  pickAnim() {
    switch (this.state) {
      case 'idle': this.setAnim('idle'); break;
      case 'walk': this.setAnim('run'); break;
      case 'guard': case 'block': this.setAnim('idle'); break;
      case 'crouch': this.setAnim(this.crouchT < 5 ? 'crouchin' : 'crouch'); break;
      case 'jump': this.setAnim('jump'); break;
      case 'fall': this.setAnim('fall'); break;
      case 'dash': this.setAnim('run'); break;
      case 'backdash': this.setAnim(this.dashT < 9 ? 'jump' : 'fall'); break; // 后跳: 起跳姿→落姿
      case 'hit': this.setAnim('hit'); break;
      case 'down': break;   // death anim set on knockdown
      case 'getup': this.setAnim('idle'); break;
      case 'attack': break; // set on startMove
    }
  }

  // ---- drawing ---------------------------------------------------------------
  spriteParams() {
    const c = this.c;
    const s = c.scale * (this.sz || 1);   // sz: 实例级体型(闯关杂兵变体)
    let yOff = 0;
    // yOff only applies to frames of the attack sheet itself — referenced
    // crouch frames (seq objects) are already baked at the right height
    if (this.state === 'attack' && this.move && this.move.def.yOff &&
        this.anim.name === this.move.def.anim) yOff = this.move.def.yOff;
    // backdash 视觉后跳弧线(KOF 式): 面朝敌人向后小跳。纯视觉 —— y/判定框不动,
    // 且 backdash 前 13 tick 无敌, 贴地判定与空中形象的观感差异可忽略
    if (this.state === 'backdash') yOff -= 30 * Math.sin(Math.PI * Math.min(1, this.dashT / 17));
    const fw = c.fw || 200; // 帧边长: 主角色 200, 外部体(Huntress)150
    return {
      img: Assets.img(`${c.id}:${this.anim.name}`),
      sx: this.anim.frame * fw, fw,
      dx: this.x - c.anchor.x * s,
      dy: this.y - c.anchor.y * s + yOff,
      dw: fw * s, dh: fw * s,
      flip: this.facing !== c.native,
      mirrorX: this.x,
    };
  }

  draw(ctx) {
    // ground shadow
    const air = Math.max(0, STAGE.ground - this.y);
    const sw = Math.max(24, 54 - air * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, STAGE.ground + 6, sw, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const p = this.spriteParams();
    if (!p.img) return;
    ctx.save();
    if (p.flip) {
      ctx.translate(p.mirrorX, 0); ctx.scale(-1, 1); ctx.translate(-p.mirrorX, 0);
    }
    // nose-down tilt while plunging
    const diving = this.state === 'attack' && this.move && this.move.def.dive &&
                   !this.move.landed && this.move.t >= this.move.def.startup;
    if (diving) {
      const pivotY = this.y - 80;
      ctx.translate(this.x, pivotY);
      // inside the mirror transform rotation flips visually — compensate so
      // "nose-down" reads the same whichever way the fighter faces
      ctx.rotate(0.32 * (p.flip ? -1 : 1));
      ctx.translate(-this.x, -pivotY);
    }
    // blade-path tilt (kept only for the crouch stab): applies only while the
    // shown frame is from the attack sheet — referenced crouch frames must
    // never rotate
    if (this.state === 'attack' && this.move && this.move.def.tilt &&
        this.anim.name === this.move.def.anim) {
      const mdef = this.move.def;
      const pivotY = this.y - 78;
      ctx.translate(this.x, pivotY);
      ctx.rotate(mdef.tilt * (p.flip ? -1 : 1)); // keep blade direction facing-consistent
      ctx.translate(-this.x, -pivotY);
    }
    const blink = (this.state === 'getup' || (this.state === 'backdash' && this.invuln > 0)) &&
                  (this.world.tick % 6 < 3);
    if (blink) ctx.globalAlpha = 0.45;
    if (this.flash > 0) ctx.filter = 'brightness(2.4) saturate(0.4)';
    ctx.drawImage(p.img, p.sx, 0, p.fw, p.fw, p.dx, p.dy, p.dw, p.dh);
    ctx.filter = 'none';
    // 帧同步月牙重染: 画师烘焙在攻击帧里的白月牙, 实时染成招式主题色盖回
    // 原位(同帧同变换, 俯冲旋转/倾角自动继承)。绝不擦原图 —— 月牙压身帧
    // 擦除会咬穿身体(踩过坑)
    const sm = this.legacyFx ? null
      : (this.state === 'attack' && this.move && this.move.def.smear &&
         this.anim.name === this.move.def.anim) ? this.move.def.smear
      : (this.superSeq && this.cineSmear) ? this.cineSmear : null;
    if (sm) {
      const key = `${this.c.id}:${this.anim.name}`;
      const bank = Assets.smears[key];
      if (bank && bank.frames[this.anim.frame]) {
        const fs = bank.fs;
        const edge = Assets.tinted(key, this.anim.frame, 'edge', sm.edge);
        const core = Assets.tinted(key, this.anim.frame, `core${sm.rim || 2}`, sm.core);
        ctx.save();
        if (sm.mirror) {
          // 回手招: 原位先垫暗色盖掉素材白月牙(读作上一刀的暗残影),
          // 再绕月牙自身质心镜像画亮刀 —— 刀光留在身前, 只反弧向
          const dim = Assets.tinted(key, this.anim.frame, 'edge', sm.dim || '#69431c');
          if (dim) ctx.drawImage(dim, 0, 0, fs, fs, p.dx, p.dy, p.dw, p.dh);
          const cx = p.dx + bank.frames[this.anim.frame].cx * (p.dw / fs);
          ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0);
        }
        if (edge) ctx.drawImage(edge, 0, 0, fs, fs, p.dx, p.dy, p.dw, p.dh);
        if (core) ctx.drawImage(core, 0, 0, fs, fs, p.dx, p.dy, p.dw, p.dh);
        ctx.restore();
      }
    }
    // super act 1 聚气: pulsing additive body glow in the character's theme
    if (this.state === 'attack' && this.move && this.move.def.kind === 'super' &&
        this.move.t <= this.move.def.startup + 2) {
      const hue = this.c.id === 'kenji' ? '215deg' : '-22deg';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 + 0.24 * Math.sin(this.world.tick * 0.55);
      ctx.filter = `sepia(1) saturate(4.5) hue-rotate(${hue}) brightness(1.15) blur(2px)`;
      ctx.drawImage(p.img, p.sx, 0, p.fw, p.fw, p.dx, p.dy, p.dw, p.dh);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 朱印結界 guard seal (Eric's pick, no kanji): rotating vermillion seal
    // ring floating before the fighter — dashed outer ring + counter-rotating
    // inner ring + diamond core. On block impact the seal flares gold and
    // throws a pulse ring, radial shards and drifting petals.
    if (this.state === 'guard' || this.state === 'block') {
      const strong = this.state === 'block';
      const t = this.world.tick;
      const it = strong ? Math.max(0, 14 - this.blockstun) : -1;   // impact age
      const flare = strong ? Math.max(0, 1 - it / 12) : 0;
      // primed alpha kept high — vermillion camouflages into the red dusk sky
      const A = strong ? 0.6 + flare * 0.4 : 0.46 + 0.12 * Math.sin(t * 0.11);
      const R = 38 + flare * 6;
      const col = flare > 0.6 ? '#fff3d0' : flare > 0 ? '#ffd76a' : '#e05a3a';
      ctx.save();
      ctx.translate(this.x + this.facing * 26, this.y - 78);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);        // inner glow
      g.addColorStop(0, `rgba(194,53,39,${(0.10 * A + flare * 0.12).toFixed(3)})`);
      g.addColorStop(1, 'rgba(194,53,39,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
      ctx.rotate(t * (0.02 + flare * 0.06) * this.facing);         // outer ring
      ctx.strokeStyle = col; ctx.lineWidth = 2.5 + flare * 1.5; ctx.globalAlpha = A;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath(); ctx.arc(0, 0, R, i * 0.7854 + 0.08, i * 0.7854 + 0.58); ctx.stroke();
      }
      ctx.rotate(-t * 0.065 * this.facing);                        // inner ring
      ctx.strokeStyle = flare > 0 ? col : '#d9a441';               // gold vs red sky
      ctx.globalAlpha = A * 0.8; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, R - 7, 0, 7); ctx.stroke();
      for (let i = 0; i < 4; i++) {                                // tick marks
        const a = i * 1.5708;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (R - 11), Math.sin(a) * (R - 11));
        ctx.lineTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4));
        ctx.stroke();
      }
      ctx.rotate(t * 0.055 * this.facing + 0.7854);                // diamond core
      ctx.globalAlpha = Math.min(1, A + 0.15); ctx.lineWidth = 1.5;
      ctx.strokeRect(-5.5, -5.5, 11, 11);
      ctx.fillStyle = col; ctx.fillRect(-1.5, -1.5, 3, 3);
      ctx.restore();
      if (strong && it >= 0 && it < 20) {                          // impact burst
        const p = it / 20;
        const cx = this.x + this.facing * 26, cy = this.y - 78;
        ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, R + p * 34, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) {                              // shards
          const a = i * 0.7854 + 0.3, r1 = R + 2 + p * 40;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (r1 - 7), cy + Math.sin(a) * (r1 - 7));
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {                              // petals
          const a = 1.8 + i * 0.75, r = 14 + p * 46;
          ctx.globalAlpha = (1 - p) * 0.85;
          ctx.fillStyle = i % 2 ? '#e8a0b4' : '#ffd7c9';
          ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r + p * p * 22, 3, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
}
