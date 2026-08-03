'use strict';
/* HOW TO PLAY 图鉴 (Eric 拍板 V2): 左列招式分组列表 + 右侧真引擎演示台。
   沙盒整体移植自 anim-lab.html(stub world + 脚本手柄 + miniResolve 精简解算),
   resolve() 与 main.js tryHit 是精简同步关系 —— tryHit 改动需同步此处与 anim-lab。
   data.js / fighter.js 零改动, 战斗逻辑不受影响。
   操作: W/S 选招 · A/D 切角色 · J 重播 · K/ESC 返回 */
const Howto = (() => {

  // ---- stub world (the API surface Fighter needs) — same shape as anim-lab --
  const W = {
    tick: 0, hitstopT: 0, projectiles: [], stats: { maxCombo: 0 },
    slowmoT: 0, slowmo: 1, slowAcc: 0,
    training: { dummy: 'stand' }, mode: 'lab', banner: null,
    hitstop(n) { this.hitstopT = Math.max(this.hitstopT, n); },
    shake() {},
    spawnProjectile(f, def) { // 与 main.js 同步: spread=[vy] 每枚一个纵速(直线=[0])
      for (const vy of (def.spread || [0])) {
        this.projectiles.push(new Projectile(f, def, f.x + f.facing * 70, f.y + def.y, f.facing, vy));
      }
    },
    hasProjectile(f) { return this.projectiles.some(p => p.owner === f && !p.dead); },
    superFlash(f, def) { if (def.cine) { this.hitstopT = Math.max(this.hitstopT, 28); this.banner = { t: 28, def }; } },
  };

  // ---- move catalog: rows shown in the left list, per character -------------
  // h = group header; mv = data.js move key (for the stats line);
  // chain/hold/air/dash = demo script (anim-lab semantics); def = defense demo
  function catalog(cid) {
    const M = DATA[cid].moves;
    // jp 一律用正规日文字形/术语(軽=新字体, しゃがみ/浮かせ/派生/転倒/崩し=格斗游戏惯用语),
    // 不混中文写法(蹲/輕/挑空/破防 是中文系用词, Eric 2026-07-11 指出后统一)
    const rows = [
      { h: 'BASICS · 基本' },
      { key: 'move',   en: 'WALK & JUMP', jp: '移動·跳躍', keys: ['A', 'D', '/', 'W'],
        tip: 'W JUMPS, EVEN MID-DASH' },
      { key: 'crouch', en: 'CROUCH', jp: 'しゃがみ', keys: ['S'],
        tip: 'LOW STANCE - HAS ITS OWN ATTACKS' },
      { key: 'dash',   en: 'DASH / BACKDASH', jp: '疾走·後退', keys: ['D', 'D', '/', 'A', 'A'],
        dist: 760, tip: 'DOUBLE-TAP TOWARD / AWAY' },
      { h: 'NORMALS · 斬撃' },
      { key: 'lJ', en: 'LIGHT SLASH', jp: '軽斬', keys: ['J'], mv: 'light', chain: ['light'],
        tip: 'FAST POKE' },
      { key: 'hK', en: 'HEAVY SLASH', jp: '重斬', keys: ['K'], mv: 'heavy', chain: ['heavy'],
        tip: 'SLOW BUT HEAVY' },
      { key: 'cJ', en: 'CROUCH LIGHT', jp: 'しゃがみ軽', keys: ['S', '+', 'J'], mv: 'clight',
        chain: ['light', 'light'], hold: 'crouch', tip: 'LOW JAB - MASHABLE' },
      { key: 'cK', en: 'CROUCH HEAVY', jp: 'しゃがみ重·浮かせ', keys: ['S', '+', 'K'], mv: 'cheavy',
        chain: ['heavy'], hold: 'crouch', tip: 'LAUNCHES THE ENEMY UPWARD' },
      { key: 'airJ', en: 'AIR LIGHT', jp: '空中軽斬', keys: ['W', '>', 'J'], chain: ['light'], air: true,
        tip: 'JUMP-IN POKE' },
      { key: 'dive', en: 'AIR HEAVY / DIVE', jp: M.dive.name, keys: ['W', '>', 'K'], mv: 'dive',
        chain: ['heavy'], air: true, tip: 'PLUNGING SLAM' },
      // SPECIALS 在 COMBOS 之前(Eric 2026-07-11: 连招要用到 U/I, 先教单发)
      { h: 'SPECIALS · 必殺' },
      // 隼人的 U 是飞行道具 —— 木桩放远(dist), 否则手里剑刚出手就命中, 看不出飞行轨迹
      { key: 'U', en: 'SPECIAL', jp: M.special.name, keys: ['U'], mv: 'special', chain: ['special'],
        dist: cid === 'kenji' ? 760 : undefined, tip: 'HAS A COOLDOWN' },
    ];
    if (M.airspecial) rows.push({ key: 'airU', en: 'AIR SPECIAL', jp: M.airspecial.name,
      keys: ['W', '>', 'U'], mv: 'airspecial', chain: ['special'], air: true, dist: 660, bJump: true,
      tip: 'AIR-TO-AIR SHURIKEN' }); // bJump: 木桩也起跳, 演示空对空命中(Eric)
    if (M.dashslash) rows.push({ key: 'dashJ', en: 'DASH SLASH', jp: M.dashslash.name,
      keys: ['D', 'D', '>', 'J'], mv: 'dashslash', chain: ['light'], dash: true, tip: 'SLASH OUT OF THE DASH' });
    rows.push(
      { key: 'I', en: 'SUPER', jp: M.super.name, keys: ['I'], mv: 'super', chain: ['super'], meter: 100,
        tip: 'NEEDS FULL 気 METER' },
      { h: 'COMBOS · 連携' },
      { key: 'JJ', en: 'J·J', jp: '派生', keys: ['J', 'J'], chain: ['light', 'light'],
        tip: 'THE 2ND SLASH DIFFERS' },
      { key: 'KK', en: 'K·K', jp: '二段·転倒', keys: ['K', 'K'], chain: ['heavy', 'heavy'],
        tip: '2ND K KNOCKS DOWN' },
      { key: 'JJKK', en: 'J·J·K·K', jp: '基本連携', keys: ['J', 'J', 'K', 'K'],
        chain: ['light', 'light', 'heavy', 'heavy'], tip: 'BREAD & BUTTER COMBO' },
      { key: 'JJKU', en: 'J·J·K·U', jp: '連携→特殊', keys: ['J', 'J', 'K', 'U'],
        chain: ['light', 'light', 'heavy', 'special'], tip: 'END THE CHAIN WITH SPECIAL' },
      { key: 'JJKI', en: 'J·J·K·I', jp: '連携→超必殺', keys: ['J', 'J', 'K', 'I'],
        chain: ['light', 'light', 'heavy', 'super'], meter: 100, tip: 'END THE CHAIN WITH SUPER' },
      { h: 'DEFENSE · 防御' },
      { key: 'guard', en: 'GUARD', jp: '方向防御', keys: ['A', '/', 'D'], def: 'guard',
        tip: 'HOLD AWAY AT THE MOMENT OF IMPACT' },
      // input 不写死按键序列(KKK 怪): 任意攻击被防都积累, 用「連打」表意(Eric)
      { key: 'crush', en: 'GUARD CRUSH', jp: '防御崩し', keys: ['J', '/', 'K', '連打'], def: 'crush',
        tip: 'BLOCKED HITS FILL THE GAUGE - BREAK IT' },
    );
    return rows;
  }

  // ---- sandbox state ---------------------------------------------------------
  let A = null, B = null;               // demo actor / dummy (guard demos swap roles)
  let charId = 'mack', sel = 1, scroll = 0, inited = false;
  let phase = 'run', restT = 0, chainIdx = 0, pressCd = 0, airPressed = false, bJumped = false, crushPunish = false;
  let rows = catalog('mack');

  function row() { return rows[sel]; }

  function resetScene() {
    const other = charId === 'kenji' ? 'mack' : 'kenji';
    A = new Fighter(charId, 380, 1, W);
    // 默认 500 = anim-lab 实证的触及间距(连锁窗口才能开); 飞行道具/位移演示用 r.dist 拉远
    B = new Fighter(other, row().dist || 500, -1, W);

    const r = row();
    A.meter = r.meter || 0;
    if (r.def === 'crush') B.guard = 55; // 演示: 护条预置只剩一点, 两下即破(Eric 2026-07-11)
    W.projectiles = []; W.hitstopT = 0; W.banner = null;
    W.slowmoT = 0; W.slowmo = 1; W.slowAcc = 0;
    W.tick = 0; W.stats.maxCombo = 0;
    Effects.reset();
    phase = 'run'; chainIdx = 0; pressCd = 0; airPressed = false; bJumped = false; crushPunish = false; restT = 0;
  }

  // ---- demo drivers ----------------------------------------------------------
  // chain rows: anim-lab 的通用脚本手柄(在 actor 就绪的瞬间按下一个键)
  function chainPad(actor, r) {
    const p = emptyPad();
    if (r.hold === 'crouch') p.crouch = true;
    if (phase !== 'run') return p;
    if (r.air && !airPressed && actor.state === 'idle') { p.jump = true; airPressed = true; return p; }
    if (r.dash) { // 疾駆斬: 先冲刺, dash 数 tick 后按攻击
      if (actor.state === 'idle' && chainIdx === 0) { p.dashR = true; return p; }
      if (actor.state === 'dash' && actor.dashT > 5 && chainIdx === 0) { p.light = true; chainIdx++; return p; }
      return p;
    }
    pressCd--;
    const readyGround = chainIdx === 0 ? actor.state === 'idle' || actor.state === 'crouch'
                                       : (actor.move && actor.move.contact);
    const readyAir = !actor.grounded && actor.vy > -9 && !actor.move;
    const ready = r.air ? readyAir : readyGround;
    if (chainIdx < r.chain.length && ready && pressCd <= 0) {
      p[r.chain[chainIdx]] = true;
      chainIdx++; pressCd = 3;
    }
    return p;
  }

  // basics rows: 时间轴小剧本(移动/下蹲/冲刺)
  function basicsPad(r) {
    const p = emptyPad(), t = W.tick;
    if (r.key === 'move') {
      if (t < 38) p.left = true;          // 先离开木桩方向, 避免走进它怀里
      else if (t < 76) p.right = true;
      else if (t === 82) p.jump = true;
      if (t > 130 && A.grounded) { phase = 'rest'; }
    } else if (r.key === 'crouch') {
      if (t < 50) p.crouch = true;
      if (t > 78) phase = 'rest';
    } else if (r.key === 'dash') {
      if (t === 12) p.dashR = true;
      if (t === 58) p.dashL = true;
      if (t > 106 && A.grounded && A.state === 'idle') phase = 'rest';
    }
    return p;
  }

  // defense rows。远离方向只在对方出招期间按住(像真实玩家反应), 否则会一直后退走出演示区;
  // 攻方在间距被格挡击退拉开后要走近再打, 否则后续攻击全落空(破防永远看不到 —— 踩过的坑)
  function defensePads(r) {
    const pa = emptyPad(), pb = emptyPad();
    const gap = B.x - A.x;
    if (r.def === 'guard') {
      // 教格挡: 木桩 B 进攻两次, 玩家角色 A 在命中瞬间按住远离方向
      pa.left = !!(B.move || B.superSeq);
      if (phase === 'run') {
        pressCd--;
        if (B.state === 'idle') {
          if (chainIdx < 2 && gap > 135) pb.left = true;               // 被击退后走近再打
          else if (chainIdx < 2 && pressCd <= 0) { pb[chainIdx ? 'heavy' : 'light'] = true; chainIdx++; pressCd = 14; }
          else if (chainIdx >= 2 && !B.move) phase = 'rest';
        }
      }
    } else {
      // 教破防(Eric 定版): 木桩护条预置 55(resetScene) → 两记重击即破; 破防
      // 僵直后玩家角色顺势追打三连 —— 完整展示"破防 = 白吃一套"
      pb.right = !crushPunish && !!(A.move || A.superSeq);
      if (phase === 'run') {
        pressCd--;
        if (!crushPunish && B.hitstun > 40) { crushPunish = true; chainIdx = 0; pressCd = 4; }
        if (crushPunish) {
          const chain = ['light', 'light', 'heavy'];
          const ready = chainIdx === 0 ? ['idle', 'walk'].includes(A.state)
                                       : (A.move && A.move.contact);
          if (!A.move && gap > 140 && chainIdx < 3) pa.right = true;   // 破防击退后走近
          else if (chainIdx < 3 && ready && pressCd <= 0) { pa[chain[chainIdx]] = true; chainIdx++; pressCd = 3; }
          else if (chainIdx >= 3 && !A.move && A.state === 'idle') { phase = 'rest'; restT = 0; }
        } else if (A.state === 'idle') {
          if (gap > 135) pa.right = true;
          else if (pressCd <= 0 && chainIdx < 10) { pa.heavy = true; chainIdx++; pressCd = 6; }
        }
      }
    }
    return [pa, pb];
  }

  // ---- combat resolution (anim-lab miniResolve, 双向化; 与 main.js tryHit 同步) --
  function rectsOverlap(a, b) { return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1; }
  function resolve(att, def) {
    const boxA = att.activeBox(), mA = att.move;
    if (boxA && mA && !def.dead && !def.superSeq && rectsOverlap(boxA, def.bodyBox())) {
      if (!(def.invuln > 0 || def.state === 'down' || def.state === 'getup' || def.juggleImmune())) {
        mA.hasHit = true; mA.contact = true; mA.contactT = mA.t; mA.hitLanded = true;
        const d = mA.def;
        const kd = d.kd || (mA.chained && d.kind === 'heavy' && att.rekkaH);
        const predicted = def.comboable > 0 ? att.combo.count + 1 : 1;
        const finisher = mA.chained && predicted >= 3;
        const bb = def.bodyBox();
        const px = (Math.max(boxA.x1, bb.x1) + Math.min(boxA.x2, bb.x2)) / 2;
        const py = (Math.max(boxA.y1, bb.y1) + Math.min(boxA.y2, bb.y2)) / 2;
        const preScale = att.comboScale(def);
        const res = def.receiveHit({
          dmg: finisher ? Math.round(d.dmg * 1.3) : d.dmg, chip: d.chip, guardDmg: d.guardDmg,
          knock: d.knock, hitstun: d.hitstun, blockstun: d.blockstun, kd, launch: d.launch, meterHit: d.meterHit, hitSfx: d.hitSfx,
        }, att);
        if (res === 'hit') {
          Effects.impact(px, py, att.facing, {
            tier: d.kind === 'light' ? 1 : d.kind === 'heavy' ? 2 : 3,
            color: att.c.theme2 || '#ffc531',
          });
          W.hitstop(d.hitstop || 5);
          if (d.kind === 'heavy' && def.grounded) Effects.dust(def.x, def.y, 8, att.facing);
          if (d.kind === 'special') {
            Effects.shockRing(px, py, att.c.theme2 || '#ffc531');
            W.slowmoT = 14; W.slowmo = 0.5; W.slowAcc = 0;
          }
          if (d.kind === 'super' && d.cine && att.state === 'attack') {
            att.vx = 0; att.move = null;
            att.superSeq = { hits: d.cine.hits, interval: d.cine.interval, dmgPer: d.cine.dmgPer, final: d.cine.final, t: 0, done: 0, scale: preScale, style: d.cine.style || null };
            def.frozen = 2;
          }
        } else { W.hitstop(3); } // block/crush: fighter 自带結界/破防演出
      } else { mA.hasHit = true; }
    }
    for (const pr of W.projectiles) {
      if (pr.dead || def.dead || pr.owner !== att) continue;
      if (rectsOverlap(pr.box(), def.bodyBox()) && !(def.invuln > 0 || ['down', 'getup'].includes(def.state) || def.juggleImmune())) {
        const pd = pr.def;
        def.receiveHit({ dmg: pd.dmg, chip: pd.chip, guardDmg: pd.guardDmg, knock: pd.knock, hitstun: pd.hitstun, blockstun: pd.blockstun, meterHit: pd.meterHit, hitSfx: 'hitL', proj: true, launch: pd.launch }, pr.owner);
        pr.dead = true;
        Effects.spark(pr.x, pr.y, Math.sign(pr.vx), ['#c9baff', '#7d5bff', '#ffffff'], 10, 5);
        W.hitstop(pd.hitstop || 6);
      }
    }
  }

  // ---- one engine tick (same skeleton as anim-lab step) ----------------------
  function step() {
    const r = row();
    if (r.h) return;
    if (W.hitstopT > 0) { W.hitstopT--; if (W.banner) W.banner.t--; Effects.update(0.35); return; }
    if (W.slowmoT > 0) {
      W.slowmoT--;
      if (W.slowmoT <= 0) W.slowmo = 1;
      W.slowAcc += W.slowmo;
      if (W.slowAcc < 1) { Effects.update(W.slowmo); return; }
      W.slowAcc -= 1;
    }
    W.tick++;
    if (r.def) { const [pa, pb] = defensePads(r); A.pad = pa; B.pad = pb; }
    else if (r.chain) {
      A.pad = chainPad(A, r);
      const pb = emptyPad();
      // bJump 行(空中手裏剣): 手里剑出手瞬间木桩起跳, 演示空对空命中
      if (r.bJump && !bJumped && phase === 'run' && B.grounded && W.projectiles.length > 0) {
        pb.jump = true; bJumped = true;
      }
      B.pad = pb;
    }
    else { A.pad = basicsPad(r); B.pad = emptyPad(); }
    A.update(B);
    B.update(A);
    for (const pr of W.projectiles) pr.update();
    W.projectiles = W.projectiles.filter(p => !p.dead);
    resolve(A, B);
    if (r.def) resolve(B, A);
    Effects.update(1);
    // loop: after the action settles, hold a beat then replay
    if (r.chain && phase === 'run') {
      const done = chainIdx >= r.chain.length && !A.move && !A.superSeq &&
                   ['idle', 'crouch'].includes(A.state) && ['idle', 'down', 'getup'].includes(B.state) &&
                   W.projectiles.length === 0;
      if (done) { phase = 'rest'; restT = 0; }
    }
    if (phase === 'rest' && ++restT > 80) resetScene();
  }

  // ---- input + tick (called from main.js update when screen==='controls') ----
  function moveSel(dir) {
    let i = sel;
    do { i = (i + dir + rows.length) % rows.length; } while (rows[i].h);
    sel = i;
    AudioSys.sfx('menuMove');
    resetScene();
  }

  // lazy init + debug params: ?howchar=mack|kenji & ?howsel=N (row index, for screenshots)
  function ensure() {
    if (inited) return;
    const q = new URLSearchParams(location.search);
    if (q.get('howchar') && DATA[q.get('howchar')]) charId = q.get('howchar');
    rows = catalog(charId);
    const hs = parseInt(q.get('howsel'), 10);
    if (!isNaN(hs) && rows[hs] && !rows[hs].h) sel = hs;
    resetScene();
    inited = true;
  }

  // overlay=true: 从暂停菜单进入(mid-fight) —— 退出回暂停菜单而非标题
  function update(G, overlay) {
    ensure();
    const switchChar = () => {
      charId = charId === 'mack' ? 'kenji' : 'mack';
      const k = row().key;
      rows = catalog(charId);
      const same = rows.findIndex(r => r.key === k);
      sel = same >= 0 ? same : 1;
      AudioSys.sfx('menuMove');
      resetScene();
    };
    const back = () => {
      AudioSys.sfx('menuBack');
      Effects.reset(); // 演示残留特效清场(暂停场景: 战斗的瞬时粒子一并清掉, 可接受)
      if (overlay) G.pauseView = 'menu';  // 暂停里进来的: 回暂停菜单
      else G.screen = 'title';
    };
    if (Input.consume('KeyW') || Input.consume('ArrowUp')) moveSel(-1);
    if (Input.consume('KeyS') || Input.consume('ArrowDown')) moveSel(1);
    if (Input.consume('KeyA') || Input.consume('KeyD') ||
        Input.consume('ArrowLeft') || Input.consume('ArrowRight')) switchChar();
    if (Input.consume('KeyJ')) { AudioSys.sfx('menuSel'); resetScene(); }
    if (Input.consume('KeyK') || Input.consume('Escape')) return back();
    // M1.3 鼠标: 列表行点选 / 角色页签 / 演示台重播 / 左上标题区返回
    if (Input.click(0, 0, 220, 56)) return back();
    for (let i = 0; i < 2; i++) {
      if (Input.click(640 + i * 180, 9, 168, 38)) {
        const want = i === 0 ? 'mack' : 'kenji';
        if (want !== charId) switchChar();
      }
    }
    const visN = Math.floor((LIST.h - 16) / LH);
    for (let i = scroll; i < Math.min(rows.length, scroll + visN + 1); i++) {
      if (rows[i].h) continue;
      const y = LIST.y + 12 + (i - scroll) * LH;
      if (Input.click(LIST.x + 4, y - 2, LIST.w - 8, LH)) {
        if (sel !== i) { sel = i; AudioSys.sfx('menuMove'); }
        resetScene();
      }
    }
    if (Input.click(STG.x, STG.y, STG.w, STG.h)) { AudioSys.sfx('menuSel'); resetScene(); }
    step();
  }

  // ---- render -----------------------------------------------------------------
  const LIST = { x: 26, y: 72, w: 304, h: 462 };
  const STG  = { x: 352, y: 72, w: 646, h: 314 };
  const INFO = { x: 352, y: 398, w: 646, h: 136 };
  const LH = 22; // list line height

  function draw(ctx, G) {
    ensure();
    ctx.drawImage(UI.bgCanvas(G), 0, 0);
    ctx.fillStyle = 'rgba(7,8,12,0.88)'; ctx.fillRect(0, 0, 1024, 576);

    // top band: title + char tabs
    ctx.fillStyle = 'rgba(20,12,9,0.9)'; ctx.fillRect(0, 0, 1024, 56);
    ctx.fillStyle = '#6a4a24'; ctx.fillRect(0, 54, 1024, 2);
    UI.pixText(ctx, '心得', 40, 38, { size: 22, color: '#ffe27a', outline: true });
    UI.pixText(ctx, 'HOW TO PLAY', 106, 36, { size: 11, color: '#9a8f78', spacing: 3 });
    for (let i = 0; i < 2; i++) {
      const cid = i === 0 ? 'mack' : 'kenji';
      const on = cid === charId;
      const tx = 640 + i * 180, tw = 168;
      // 装饰框与标题页菜单按钮同款(UI.nine + 选中提亮), 无素材时回退线框
      if (UI.ua.panel) {
        if (on) { ctx.save(); ctx.filter = 'brightness(1.45) saturate(1.1)'; }
        UI.nine(ctx, UI.ua.panel, tx, 9, tw, 38, 0.13);
        if (on) { ctx.restore(); ctx.fillStyle = 'rgba(255,197,49,0.1)'; ctx.fillRect(tx + 5, 14, tw - 10, 28); }
      } else {
        ctx.fillStyle = on ? '#241610' : '#14100e';
        ctx.fillRect(tx, 9, tw, 38);
        ctx.strokeStyle = on ? '#d9a441' : '#6a4a24'; ctx.lineWidth = 2;
        ctx.strokeRect(tx + 1, 10, tw - 2, 36);
      }
      const face = cid === 'mack' ? UI.ua.hudmack : UI.ua.hudkenji;
      if (face) ctx.drawImage(face, tx + 4, 13, 30, 30);
      UI.pixText(ctx, DATA[cid].name, tx + 42, 27, { size: 10, color: on ? '#ffe27a' : '#8a7a5f' });
      UI.pixText(ctx, DATA[cid].cn, tx + 42, 43, { size: 12, color: on ? '#d9a441' : '#6a5a3f' });
      if (on && G.tick % 40 < 26) {
        ctx.strokeStyle = 'rgba(255,226,122,0.5)'; ctx.strokeRect(tx - 1, 8, tw + 2, 40);
      }
    }
    UI.pixText(ctx, 'A / D', 585, 33, { size: 9, color: '#5d6784', align: 'right' });

    // left: move list (scrolls, selected row always visible)
    if (UI.ua.panel) {
      ctx.fillStyle = 'rgba(16,10,8,0.7)'; ctx.fillRect(LIST.x, LIST.y, LIST.w, LIST.h);
      UI.nine(ctx, UI.ua.panel, LIST.x, LIST.y, LIST.w, LIST.h, 0.24);
    } else {
      ctx.fillStyle = 'rgba(16,10,8,0.94)'; ctx.fillRect(LIST.x, LIST.y, LIST.w, LIST.h);
      ctx.strokeStyle = '#6a4a24'; ctx.lineWidth = 2;
      ctx.strokeRect(LIST.x + 1, LIST.y + 1, LIST.w - 2, LIST.h - 2);
    }
    const visN = Math.floor((LIST.h - 16) / LH);
    if (sel < scroll + 1) scroll = Math.max(0, sel - 1);
    if (sel > scroll + visN - 2) scroll = Math.min(rows.length - visN, sel - visN + 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(LIST.x, LIST.y, LIST.w, LIST.h); ctx.clip();
    for (let i = scroll; i < Math.min(rows.length, scroll + visN + 1); i++) {
      const r = rows[i], y = LIST.y + 12 + (i - scroll) * LH;
      if (r.h) {
        UI.pixTextMixed(ctx, r.h, LIST.x + 14, y + 14, { size: 10, color: '#8a6a2f' });
        ctx.fillStyle = 'rgba(138,106,47,0.35)';
        ctx.fillRect(LIST.x + 14, y + 18, LIST.w - 28, 1);
      } else {
        if (i === sel) {
          ctx.fillStyle = 'rgba(217,164,65,0.14)';
          ctx.fillRect(LIST.x + 4, y - 2, LIST.w - 8, LH);
          ctx.fillStyle = '#d9a441'; ctx.fillRect(LIST.x + 4, y - 2, 3, LH);
          if (G.tick % 30 < 22) UI.pixText(ctx, '▶', LIST.x + 12, y + 13, { size: 9, color: '#ffc531' });
        }
        UI.pixText(ctx, r.en, LIST.x + 26, y + 13, { size: 10, color: i === sel ? '#ffe27a' : '#b3a68d', maxW: 164 });
        UI.pixText(ctx, r.jp, LIST.x + LIST.w - 14, y + 14, { size: 11, align: 'right', color: i === sel ? '#d9a441' : '#8a7a5f', maxW: 100 });
      }
    }
    ctx.restore();
    // scroll arrows
    if (scroll > 0) UI.pixText(ctx, '▲', LIST.x + LIST.w / 2, LIST.y + 10, { size: 8, align: 'center', color: '#8a6a2f' });
    if (scroll + visN < rows.length) UI.pixText(ctx, '▼', LIST.x + LIST.w / 2, LIST.y + LIST.h - 4, { size: 8, align: 'center', color: '#8a6a2f' });

    // right: demo stage (real engine viewport)
    // M1.2: ua.stage(原AI绘) 已撤 → 回退程序化神社 Stage.canvas, 再退纯色
    const r = row();
    const stageArt = (UI.ua.stage && UI.ua.stage.cv) || (typeof Stage !== 'undefined' && Stage.canvas) || null;
    if (stageArt) {
      ctx.drawImage(stageArt, 0, 0, 1024, 576, STG.x, STG.y, STG.w, STG.h);
      ctx.fillStyle = 'rgba(7,8,12,0.45)'; ctx.fillRect(STG.x, STG.y, STG.w, STG.h);
    } else {
      ctx.fillStyle = '#150d0b'; ctx.fillRect(STG.x, STG.y, STG.w, STG.h);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(STG.x, STG.y, STG.w, STG.h); ctx.clip();
    const groundY = STG.y + STG.h - 26;
    if (A && A.superSeq) { ctx.fillStyle = 'rgba(10,6,20,0.52)'; ctx.fillRect(STG.x, STG.y, STG.w, STG.h); }
    ctx.fillStyle = 'rgba(217,164,65,0.3)'; ctx.fillRect(STG.x, groundY, STG.w, 2);
    if (A && B) {
      // 镜头对准双方初始间距的中点(拉远的演示自动跟着移)
      const camX = (380 + (r.dist || 500)) / 2 + 30;
      ctx.translate(STG.x + STG.w / 2 - camX, groundY - STAGE.ground);
      Effects.drawGhosts(ctx);
      B.draw(ctx);
      A.draw(ctx);
      for (const pr of W.projectiles) pr.draw(ctx);
      Effects.draw(ctx);
      // 防御演示: 格挡方头顶挂护条(黄) —— guard 行是玩家自己, crush 行是被压制的木桩
      if (r.def) {
        const D = r.def === 'guard' ? A : B;
        const gx = D.x - 34, gy = D.y - 196;
        ctx.fillStyle = 'rgba(10,6,5,0.8)'; ctx.fillRect(gx, gy, 68, 8);
        ctx.fillStyle = '#ffc531'; ctx.fillRect(gx + 1, gy + 1, 66 * Math.min(1, D.guard / 100), 6);
        ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 1; ctx.strokeRect(gx + 0.5, gy + 0.5, 67, 7);
        UI.pixText(ctx, 'GUARD', gx, gy - 5, { size: 7, color: '#9a8f78' });
      }
      // defense demo: flash the away-direction key over the defender the moment
      // the dummy commits to an attack (Eric 的"出招瞬间提示")
      if (r.def && B.move && B.move.def && B.move.t < (B.move.def.startup || 6) + 4) {
        // 演示场景里防守方在左、敌在右 → 远离方向就是 A 键(实际按键, 不用箭头避免歧义)
        const bx = A.x - 14, by = A.y - 236;
        ctx.save(); ctx.globalAlpha = G.tick % 10 < 6 ? 1 : 0.25;
        UI.keycap(ctx, bx - 30, by, 40, 'A');
        UI.pixText(ctx, 'ガード!', bx + 22, by + 26, { size: 14, color: '#ffe27a', outline: true });
        ctx.restore();
      }
    }
    ctx.restore();
    // 演示台只描装饰边(evenodd 抠掉中心, 不盖住引擎画面); 框与 LIST/INFO
    // 一样精确贴矩形 — 三大框的外沿必须对齐(Eric)
    if (UI.ua.panel) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(STG.x, STG.y, STG.w, STG.h);
      ctx.rect(STG.x + 12, STG.y + 12, STG.w - 24, STG.h - 24);
      ctx.clip('evenodd');
      UI.nine(ctx, UI.ua.panel, STG.x, STG.y, STG.w, STG.h, 0.13);
      ctx.restore();
    } else {
      ctx.strokeStyle = '#6a4a24'; ctx.lineWidth = 2;
      ctx.strokeRect(STG.x + 1, STG.y + 1, STG.w - 2, STG.h - 2);
    }
    // super banner (same as anim-lab)
    if (W.banner && W.banner.t > 0) {
      ctx.fillStyle = `rgba(5,6,12,${Math.min(0.55, W.banner.t / 20)})`;
      ctx.fillRect(STG.x, STG.y, STG.w, STG.h);
      UI.pixText(ctx, W.banner.def.name, STG.x + STG.w / 2, STG.y + 140, { size: 22, align: 'center', color: '#ffe27a', outline: true });
    }
    UI.pixTextMixed(ctx, r.en + (r.jp ? ' · ' + r.jp : ''), STG.x + 14, STG.y + 24, { size: 12, color: '#ffe27a', outline: true });
    UI.pixText(ctx, 'AUTO LOOP', STG.x + STG.w - 14, STG.y + 24, { size: 8, align: 'right', color: '#5d6784' });

    // bottom: input keys + tip + stats
    if (UI.ua.panel) {
      ctx.fillStyle = 'rgba(16,10,8,0.7)'; ctx.fillRect(INFO.x, INFO.y, INFO.w, INFO.h);
      UI.nine(ctx, UI.ua.panel, INFO.x, INFO.y, INFO.w, INFO.h, 0.24);
    } else {
      ctx.fillStyle = 'rgba(16,10,8,0.94)'; ctx.fillRect(INFO.x, INFO.y, INFO.w, INFO.h);
      ctx.strokeStyle = '#6a4a24'; ctx.strokeRect(INFO.x + 1, INFO.y + 1, INFO.w - 2, INFO.h - 2);
    }
    UI.pixText(ctx, 'INPUT', INFO.x + 18, INFO.y + 34, { size: 9, color: '#8a6a2f' });
    let kx = INFO.x + 84;
    for (const tok of r.keys || []) {
      if (tok.length === 1 && tok !== '/' && tok !== '>' && tok !== '+') {
        UI.keycap(ctx, kx, INFO.y + 12, 38, tok);
        kx += 46;
      } else {
        UI.pixText(ctx, tok === '>' ? '→' : tok, kx + 8, INFO.y + 38, { size: 13, color: '#9a8f78' });
        kx += 30;
      }
    }
    // 数值行(DMG/STARTUP/GUARD DMG)已删 —— 帧数据对新手是认知负担(Eric 2026-07-11),
    // 进阶查询走 anim-lab
    UI.pixTextMixed(ctx, r.tip || '', INFO.x + 18, INFO.y + 90, { size: 11, color: '#d9a441' });

    // footer
    ctx.fillStyle = 'rgba(10,6,5,0.7)'; ctx.fillRect(0, 546, 1024, 30);
    UI.pixText(ctx, 'W/S CHOOSE · A/D CHARACTER · J REPLAY · K BACK', 512, 566, {
      size: 10, align: 'center', color: G.tick % 40 < 25 ? '#8892ad' : '#5d6784',
    });
    UI._fade(ctx, G);
  }

  return { update, draw };
})();
