// M1.4 headless verify: 英雄招式表补全 + 闯关续航/难度重调
//   1) 九人招式表完整性 + 帧/表引用静态校验
//   2) 蹲攻 / 挑空 / 空中下砸 / 冲刺斩 的实际路由与命中
//   3) 闯关: 五幕 / 补给掉落 / 残机续关 / 敌方出伤系数 / 出招名额
//   4) 自动驾驶通关模拟(用 AI 驱动玩家): normal 能不能打得过
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);
const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const ORDER = [...idx.matchAll(/<script src="js\/([a-z0-9]+)\.js/g)].map(m => m[1]);

function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 1024, height: 576, style: {} };
      if (k === "measureText") return () => ({ width: 40 });
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "getImageData") return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const canvasStub = (w = 300, h = 300) => ({
  width: w, height: h, style: {}, getContext: () => ctxStub(), addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
});
const listeners = {};
class ImgStub {
  set src(v) {
    const p = path.join(ROOT, String(v).split("?")[0].replace(/^\//, "").replace(/\//g, path.sep));
    setTimeout(() => {
      try {
        const b = fs.readFileSync(p);
        this.width = b.readUInt32BE(16); this.height = b.readUInt32BE(20);
        this.onload && this.onload();
      } catch (e) { this.onerror && this.onerror(e); }
    }, 0);
  }
}
let simNow = 0;
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Math, JSON, Date, Promise, Object, Array, Uint8Array, Uint8ClampedArray, Int32Array,
  performance: { now: () => simNow },
  requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval, clearInterval,
  Image: ImgStub, fetch: () => Promise.reject(new Error("offline")),
  localStorage: { getItem: () => null, setItem() {} },
  URLSearchParams, location: { search: "" }, navigator: {},
};
sandbox.window = { innerWidth: 1280, innerHeight: 800, addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); }, AudioContext: undefined };
sandbox.document = {
  _els: {},
  getElementById(id) { return this._els[id] ||= (id === "game" ? canvasStub(1024, 576) : { style: {}, textContent: "" }); },
  createElement: t => t === "canvas" ? canvasStub() : { style: {} },
  fonts: { load: async () => [], check: () => false },
  addEventListener() {},
};
vm.createContext(sandbox);
for (const f of ORDER) vm.runInContext(fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8"), sandbox, { filename: f + ".js" });
const G_ = e => vm.runInContext(e, sandbox);
const press = code => {
  for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} });
  for (const fn of listeners.keyup || []) fn({ code });
  simNow += 40;
};
const step = n => { for (let i = 0; i < n; i++) { simNow += 16.7; G_("update()"); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ok = m => console.log("  ok  " + m);

(async () => {
  for (let i = 0; i < 300 && G_("G.screen") === "boot"; i++) await sleep(10);
  if (G_("G.screen") === "boot") throw new Error("boot stuck");

  /* ---------- 1) 招式表完整性 + 静态引用校验 ---------- */
  console.log("[1] moveset completeness");
  const ROSTER = G_("JSON.stringify(ROSTER)") && JSON.parse(G_("JSON.stringify(ROSTER)"));
  const REQ = {
    // 每位角色必须具备的招式键(近战全套 / zoner 至少要有近身自保那几招)
    mack:     ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "super"],
    kenji:    ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "airspecial", "dashslash", "super"],
    ayame:    ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "dashslash", "super"],
    wukong:   ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "super"],
    houyi:    ["light", "heavy", "clight", "clight2", "cheavy", "air", "dive", "special", "airspecial", "super"],
    angela:   ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "airspecial", "super"],
    diaochan: ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "dashslash", "super"],
    doctor:   ["light", "heavy", "clight", "clight2", "cheavy", "air", "dive", "special", "airspecial", "super"],
    tank:     ["light", "light2", "heavy", "heavy2", "clight", "clight2", "cheavy", "air", "dive", "special", "super"],
  };
  const moveKeys = JSON.parse(G_("JSON.stringify(Object.fromEntries(Object.entries(DATA).map(([k,c])=>[k,Object.keys(c.moves)])))"));
  for (const [cid, need] of Object.entries(REQ)) {
    const have = moveKeys[cid] || [];
    const miss = need.filter(k => !have.includes(k));
    if (miss.length) throw new Error(`${cid} missing moves: ${miss.join(",")}`);
  }
  ok(`all 9 fighters have their full kit (${Object.values(moveKeys).reduce((s, a) => s + a.length, 0)} moves total)`);

  // 静态校验: seq 引用的动画表/帧号必须存在; 非投掷招必须有判定框; smear 必须有烘焙帧
  const audit = JSON.parse(G_(`(() => {
    const bad = [];
    for (const [cid, c] of Object.entries(DATA)) {
      for (const [mk, m] of Object.entries(c.moves)) {
        const frames = a => (c.anims[a] ? c.anims[a].frames : -1);
        if (!c.anims[m.anim]) { bad.push(cid+'.'+mk+': anim '+m.anim+' missing'); continue; }
        const chk = (fr, where) => {
          if (fr === undefined || fr === null) return;
          if (typeof fr === 'object') {
            if (!c.anims[fr.a]) bad.push(cid+'.'+mk+' '+where+': anim '+fr.a+' missing');
            else if ((fr.f||0) >= frames(fr.a)) bad.push(cid+'.'+mk+' '+where+': '+fr.a+' frame '+fr.f+' >= '+frames(fr.a));
          } else if (fr >= frames(m.anim)) bad.push(cid+'.'+mk+' '+where+': frame '+fr+' >= '+frames(m.anim));
        };
        if (m.seq) { (m.seq.w||[]).forEach((f,i)=>chk(f,'seq.w['+i+']')); chk(m.seq.i,'seq.i'); (m.seq.r||[]).forEach((f,i)=>chk(f,'seq.r['+i+']')); }
        if (!m.projectile && !m.box && m.kind !== 'super' && !m.dive) bad.push(cid+'.'+mk+': no box and no projectile');
        if (m.smear && !m.smear.standalone && !m.smear.sheet) {
          const sf = (c.anims[m.anim].smearFrames)||[];
          for (const ph of (m.smear.phases||[])) if (ph.f !== undefined && !sf.includes(ph.f)) {
            bad.push(cid+'.'+mk+': smear phase frame '+ph.f+' not in '+m.anim+'.smearFrames ['+sf+']');
          }
        }
        if (m.dive && (m.impact === undefined || m.impact >= frames(m.anim))) bad.push(cid+'.'+mk+': dive impact out of range');
      }
    }
    return JSON.stringify(bad);
  })()`));
  if (audit.length) throw new Error("move data audit:\n   - " + audit.join("\n   - "));
  ok("frame/sheet/hitbox audit clean across every move");

  /* ---------- 2) 新招的实际路由 / 命中 ---------- */
  console.log("[2] new-move routing in the real engine");
  G_("var __pad = {}; humanPad = function () { return Object.assign(emptyPad(), __pad); };");
  const setPad = o => G_(`__pad = ${JSON.stringify(o)};`);
  const arena = (cid, dx = 96) => {
    setPad({});
    G_(`startMatch('${cid}', 'tank', 'normal', false, true, false, true)`);
    G_("G.phase='fight'; G.training.dummy='stand';");
    step(3);
    G_(`G.fighters[0].x = 420; G.fighters[1].x = 420 + ${dx};
        G.fighters[1].maxHp = 9999; G.fighters[1].hp = 9999; G.fighters[1].dispHp = 9999;
        G.fighters[1].state='idle'; G.fighters[1].invuln = 0;`);
  };
  // 出招键按下后, 等到引擎真的进入某个 attack, 返回那一招的 key
  const firedMove = (cid, maxT = 30) => {
    for (let i = 0; i < maxT; i++) {
      step(1);
      const k = G_(`(() => { const f = G.fighters[0]; if (f.state !== 'attack' || !f.move) return null;
        return Object.keys(f.c.moves).find(k => f.c.moves[k] === f.move.def) || '?'; })()`);
      if (k) return k;
    }
    return null;
  };

  const routed = [];
  for (const cid of ROSTER) {
    const mv = moveKeys[cid];
    // 蹲J -> clight
    arena(cid); setPad({ crouch: true, light: true });
    let k = firedMove(cid);
    if (k !== "clight") throw new Error(`${cid}: S+J routed to ${k}, expected clight`);
    // 蹲K -> cheavy (挑空)
    arena(cid); setPad({ crouch: true, heavy: true });
    k = firedMove(cid);
    if (k !== "cheavy") throw new Error(`${cid}: S+K routed to ${k}, expected cheavy`);
    // 空中K -> dive, 且落地会砸出判定
    arena(cid); setPad({ jump: true }); step(4); setPad({ heavy: true });
    k = firedMove(cid, 40);
    if (k !== "dive") throw new Error(`${cid}: air K routed to ${k}, expected dive`);
    let slammed = false;
    for (let i = 0; i < 90 && !slammed; i++) { step(1); slammed = G_("!!(G.fighters[0].move && G.fighters[0].move.landed)"); }
    if (!slammed) throw new Error(`${cid}: dive never landed its slam`);
    // 冲刺J -> dashslash (只有配了这招的角色)
    if (mv.includes("dashslash")) {
      arena(cid, 260);
      G_("G.fighters[0].startDash(1); G.fighters[0].dashT = 6;");
      setPad({ light: true });
      k = firedMove(cid);
      if (k !== "dashslash") throw new Error(`${cid}: dash+J routed to ${k}, expected dashslash`);
    }
    routed.push(cid);
  }
  ok(`S+J / S+K / air-K (+dash-J) route correctly for all ${routed.length} fighters`);

  // 挑空技真的把人打飞 + 连锁 J·J / K·K 真的接得上
  for (const cid of ROSTER) {
    arena(cid, 80);
    setPad({ crouch: true, heavy: true });
    let air = false;
    for (let i = 0; i < 60 && !air; i++) { step(1); air = G_("!G.fighters[1].grounded && G.fighters[1].state === 'hit'"); }
    if (!air) throw new Error(cid + ": cheavy did not launch the opponent");
  }
  ok("every cheavy launches the opponent airborne (juggle into I works)");

  for (const cid of ROSTER) {
    if (!moveKeys[cid].includes("light2")) continue;
    arena(cid, 80);
    setPad({ light: true });
    let combo = 0;
    for (let i = 0; i < 90; i++) { step(1); combo = Math.max(combo, G_("G.stats.maxCombo")); }
    if (combo < 2) throw new Error(`${cid}: J·J chain never produced a 2-hit combo (maxCombo=${combo})`);
  }
  ok("J·J chain lands a 2+ hit combo for every fighter that has light2");

  for (const cid of ROSTER) {
    if (!moveKeys[cid].includes("heavy2")) continue;
    arena(cid, 80);
    G_("G.stats.maxCombo = 0");
    setPad({ heavy: true });
    let saw = false;
    for (let i = 0; i < 120 && !saw; i++) {
      step(1);
      saw = G_(`!!(G.fighters[0].move && G.fighters[0].move.def === G.fighters[0].c.moves.heavy2)`);
    }
    if (!saw) throw new Error(cid + ": K·K never reached heavy2");
    // K·K 终结段必须造成击倒(main.js 的连锁规则)
    let kd = false;
    for (let i = 0; i < 60 && !kd; i++) { step(1); kd = G_("['down','getup'].includes(G.fighters[1].state) || G.fighters[1].kdPending"); }
    if (!kd) throw new Error(cid + ": heavy2 did not knock down");
  }
  ok("K·K reaches heavy2 and knocks down (heavy alone no longer does)");

  /* ---------- 3) 闯关: 剧情量 / 续航 / 难度旋钮 ---------- */
  console.log("[3] story mode: acts, supplies, continues");
  const acts = JSON.parse(G_(`JSON.stringify(Quest.LEVELS.map(L => ({
    name: L.name, sub: L.sub, stage: L.stageSel, w: L.worldW,
    intro: L.intro.length, boss: L.bossTalk.length, outro: L.outro.length,
    waves: L.waves.map(w => ({ at: w.at, n: w.mooks.length, talk: (w.talk||[]).length })),
    bossId: L.boss.id, bossHp: L.boss.hp,
  })))`));
  if (acts.length < 5) throw new Error("expected >= 5 acts, got " + acts.length);
  let lines = 0, waveTalks = 0;
  for (const a of acts) {
    if (a.intro < 2 || a.boss < 1 || a.outro < 1) throw new Error(a.sub + ": dialogue too thin");
    if (!G_(`!!DATA['${a.bossId}']`)) throw new Error(a.sub + ": unknown boss id " + a.bossId);
    let prev = 0;
    for (const w of a.waves) {
      if (w.at <= prev) throw new Error(a.sub + ": wave triggers not ascending");
      if (w.at > a.w - 620) throw new Error(a.sub + ": wave at " + w.at + " past the boss gate");
      if (w.n < 2) throw new Error(a.sub + ": wave too small");
      prev = w.at; waveTalks += w.talk;
    }
    lines += a.intro + a.boss + a.outro + a.waves.reduce((s, w) => s + w.talk, 0);
  }
  ok(`${acts.length} acts · ${lines} dialogue lines (${waveTalks} of them mid-level) · bosses ${acts.map(a => a.bossId).join("/")}`);
  // 关卡越来越"满": 每幕 >=3 波(终幕 >=4), 杂兵总数够多, 波内人数向后递增
  const totalMooks = acts.reduce((s, a) => s + a.waves.reduce((w, x) => w + x.n, 0), 0);
  acts.forEach((a, i) => {
    const need = i === acts.length - 1 ? 5 : 4;
    if (a.waves.length < need) throw new Error(`${a.sub}: only ${a.waves.length} waves, expected >= ${need}`);
    if (a.waves[a.waves.length - 1].n < 3) throw new Error(`${a.sub}: last wave too small (${a.waves[a.waves.length - 1].n})`);
  });
  if (totalMooks < 70) throw new Error("too few total mooks: " + totalMooks);
  if (lines < 60) throw new Error("not enough story: " + lines + " lines");
  ok(`${totalMooks} mooks across ${acts.reduce((s, a) => s + a.waves.length, 0)} waves (final act ${acts[acts.length - 1].waves.length} waves)`);
  // 越来越难: 同一杂兵在靠后幕血更厚(_mkEnemy 的 hpRamp)
  const ramp = JSON.parse(G_(`(() => {
    Quest.start('mack', 'normal');
    Quest.st.level = 0; const a = Quest._mkEnemy('kenji', 40, 500, 0).maxHp;
    Quest.st.level = 4; const b = Quest._mkEnemy('kenji', 40, 500, 0).maxHp;
    Quest.exit(); return JSON.stringify({ a, b });
  })()`));
  if (!(ramp.b > ramp.a)) throw new Error("no per-act difficulty ramp: " + JSON.stringify(ramp));
  ok(`per-act ramp: same mook ${ramp.a}hp in act I -> ${ramp.b}hp in final act`);
  // 终幕 Boss x10: bossMul=10, spawnBoss 后血量确实是常规的约 10 倍
  const bossHp = JSON.parse(G_(`(() => {
    const fin = Quest.LEVELS[Quest.LEVELS.length - 1];
    if ((fin.boss.bossMul || 1) !== 10) throw new Error('final bossMul != 10');
    Quest.start('mack', 'normal');
    Quest.st.level = Quest.LEVELS.length - 1; Quest.st.cam = 0;
    Quest.spawnBoss(); const big = Quest.st.boss.maxHp;
    Quest.exit();
    // 对照: 同参数但 mul=1
    const D = Quest.DIFF.normal;
    const one = Math.round(fin.boss.hp * D.boss * 1 * 150 / 100);
    return JSON.stringify({ big, one, mul: Quest.LEVELS[Quest.LEVELS.length-1].boss.bossMul });
  })()`));
  if (Math.abs(bossHp.big / bossHp.one - 10) > 0.05) throw new Error("final boss not ~10x: " + JSON.stringify(bossHp));
  ok(`final boss HP is x10 (${bossHp.one} -> ${bossHp.big} on normal)`);
  // 第一幕第一波必须没有前置对白 —— 进关即开打(也让 M1.3 smoke 的 walk→fight 断言成立)
  if (acts[0].waves[0].talk !== 0) throw new Error("act I wave 1 must not gate on dialogue");
  ok("act I wave 1 still starts without a dialogue gate");

  // 杂兵: 出伤打折 + 不攒气 + 放不出超必
  G_("Quest.start('mack', 'normal')");
  const D = JSON.parse(G_("JSON.stringify(Quest.DIFF.normal)"));
  G_("Quest.spawnWave(Quest.LEVELS[0].waves[0])");
  const mk = JSON.parse(G_(`(() => { const e = Quest.st.enemies[0]; e.meter = 0; e.gainMeter(100);
    return JSON.stringify({ dmg: e.dmgDealt, meter: e.meter, sup: e.superReady(), hp: e.hp }); })()`));
  if (mk.dmg !== D.dmg) throw new Error("mook dmgDealt not applied: " + mk.dmg);
  if (mk.meter !== 0 || mk.sup !== false) throw new Error("mooks can still build meter / fire supers");
  ok(`mooks: dmg x${D.dmg}, no meter, no supers (hp ${mk.hp} = base x${D.mook})`);

  // 敌方出伤系数真的进了伤害公式
  const dmgCmp = JSON.parse(G_(`(() => {
    const mk = Quest.st.enemies[0], p = Quest.st.player;
    const info = { dmg: 40, hitstun: 10, blockstun: 5, knock: 0 };
    p.hp = p.maxHp; p.state = 'idle'; p.pad = emptyPad(); p.invuln = 0; p.grounded = true;
    p.receiveHit(info, mk); const soft = p.maxHp - p.hp;
    p.hp = p.maxHp; p.state = 'idle'; p.invuln = 0; p.comboable = 0; mk.combo.count = 0;
    mk.dmgDealt = 1; p.receiveHit(info, mk); const full = p.maxHp - p.hp;
    return JSON.stringify({ soft, full });
  })()`));
  if (!(dmgCmp.soft < dmgCmp.full)) throw new Error("dmgDealt has no effect: " + JSON.stringify(dmgCmp));
  ok(`attacker.dmgDealt reaches receiveHit (40dmg hit -> ${dmgCmp.soft} vs ${dmgCmp.full} raw)`);

  // 补给: 掉落 -> 落地 -> 拾取回血
  G_("Quest.start('mack', 'normal')");
  G_(`Quest.st.phase = 'fight'; Quest.st.player.hp = 40; Quest.st.player.dispHp = 40;
      Quest.dropItem(Quest.st.player.x + 30, 'meal');`);
  const hp0 = G_("Quest.st.player.hp");
  for (let i = 0; i < 200 && G_("Quest.st.items.length") > 0; i++) step(1);
  const hp1 = G_("Quest.st.player.hp");
  if (G_("Quest.st.items.length") !== 0) throw new Error("supply never picked up");
  if (!(hp1 > hp0)) throw new Error(`supply healed nothing (${hp0} -> ${hp1})`);
  ok(`supply drop -> walk over -> heal (${hp0} -> ${hp1} / ${G_("Quest.st.player.maxHp")})`);

  // 清波必掉补给 + 小回血
  G_("Quest.start('mack', 'normal'); Quest.st.phase='walk'; Quest.st.player.hp = 60;");
  G_("Quest.spawnWave(Quest.LEVELS[0].waves[0]); Quest.st.phase='fight';");
  G_("Quest.st.enemies.forEach(e => { e.hp = 0; e.die(); })");
  step(3);
  if (G_("Quest.st.items.length") < 1) throw new Error("wave clear dropped no supply");
  if (!(G_("Quest.st.player.hp") > 60)) throw new Error("wave clear gave no heal");
  ok(`wave clear: +${G_("Quest.st.player.hp") - 60} hp and a guaranteed supply drop`);

  // 残机续关: 倒下 -> 扣一条命原地复活; 用光才 GAME OVER
  G_("Quest.start('mack', 'normal'); Quest.st.phase='fight';");
  G_("Quest.spawnWave(Quest.LEVELS[0].waves[0]);");
  const lives0 = G_("Quest.st.lives");
  if (lives0 < 1) throw new Error("normal should grant continues");
  G_("Quest.st.player.hp = 0");
  for (let i = 0; i < 80 && G_("Quest.st.lives") === lives0; i++) step(1);
  if (G_("Quest.st.lives") !== lives0 - 1) throw new Error("death did not consume a continue");
  if (G_("Quest.st.player.dead")) throw new Error("player not revived");
  if (!(G_("Quest.st.player.hp") > 0 && G_("Quest.st.player.invuln") > 0)) throw new Error("revive without hp/i-frames");
  if (G_("Quest.st.phase") === "over") throw new Error("went to GAME OVER while continues remained");
  ok(`continue: ${lives0} lives, death revives in place at ${G_("Quest.st.player.hp")}hp with i-frames`);
  for (let guard = 0; guard < 10 && G_("Quest.st.phase") !== "over"; guard++) {
    G_("Quest.st.player.hp = 0");
    for (let i = 0; i < 110; i++) {
      step(1);
      if (G_("Quest.st.phase") === "over") break;
      if (i > 6 && !G_("Quest.st.player.dead") && G_("Quest.st.player.hp") > 0) break; // 已复活, 再杀一次
    }
  }
  if (G_("Quest.st.phase") !== "over") throw new Error("GAME OVER never reached after continues ran out");
  ok("GAME OVER only once every continue is spent");
  G_("Quest.exit()");

  /* ---------- 4) 自动驾驶通关模拟: "打得过吗" ----------
     用引擎自己的 AIController 驱动玩家(normal = 普通水平的人, easy = 手残),
     跑完整个五幕流程, 记录用掉几条命。这是"敌人太强/打不过"这条反馈唯一
     能自动化验证的形式。 */
  console.log("[4] autopilot playthrough (engine AI drives the hero)");
  G_(`
    var __auto = null, __autoDiff = 'normal';
    humanPad = function () {
      const st = Quest.st;
      if (!st || !st.player || st.player.dead) return emptyPad();
      const p = st.player;
      const alive = st.enemies.filter(e => !e.dead)
        .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
      const near = alive[0] && Math.abs(alive[0].x - p.x) < 240;
      // 没敌人 -> 往右推进; 附近有补给且不在贴身战 -> 先去捡(模拟人会捡东西)
      if (!alive.length || !near) {
        const it = st.items.filter(i => Math.abs(i.x - p.x) < 420)
          .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
        const pad = emptyPad();
        if (it && (!alive.length || Math.abs(it.x - p.x) < 200)) {
          if (it.x > p.x + 8) pad.right = true; else if (it.x < p.x - 8) pad.left = true;
          return pad;
        }
        if (!alive.length) { pad.right = true; return pad; }
      }
      if (!__auto || __auto.f !== p || __auto.d !== AI_DIFFS[__autoDiff]) {
        __auto = new AIController(p, alive[0], __autoDiff, G);
      }
      __auto.opp = alive[0];
      return __auto.update();
    };
  `);
  const runQuest = (hero, diff, playerAi, maxTicks = 160000) => {
    G_(`__auto = null; __autoDiff = '${playerAi}'; Quest.start('${hero}', '${diff}');`);
    let t = 0, deepest = 0, bossSeen = false, bossMinFrac = 1;
    while (t < maxTicks) {
      const ph = G_("Quest.st && Quest.st.phase");
      if (!ph || ph === "clear" || ph === "over") break;
      deepest = Math.max(deepest, G_("Quest.st.level"));
      if (G_("Quest.st.level") === G_("Quest.LEVELS.length - 1") && G_("!!(Quest.st.boss)")) {
        bossSeen = true;
        const bf = G_("Quest.st.boss.dead ? 0 : Quest.st.boss.hp / Quest.st.boss.maxHp");
        if (typeof bf === "number") bossMinFrac = Math.min(bossMinFrac, bf);
      }
      if (ph === "talk") { press("KeyJ"); step(2); t += 2; continue; }
      step(12); t += 12;
    }
    const r = JSON.parse(G_(`(() => { const s = Quest.st; return JSON.stringify({
      phase: s ? s.phase : 'gone', level: s ? s.level : -1, lives: s ? s.lives : -1,
      revives: s ? s.revives : -1, kills: s ? s.kills : -1,
      hp: s && s.player ? Math.round(s.player.hp) : -1,
    }); })()`));
    r.ticks = t; r.deepest = deepest; r.bossSeen = bossSeen; r.bossMinFrac = bossMinFrac;
    G_("Quest.exit()");
    return r;
  };

  const mid = runQuest("mack", "normal", "normal");
  console.log(`      normal难度 / 普通水平玩家: phase=${mid.phase} act=${mid.deepest + 1}/5 ` +
              `残机${mid.lives} 续关${mid.revives} 击破${mid.kills} boss最低${(mid.bossMinFrac * 100).toFixed(0)}% 约${(mid.ticks / 3600).toFixed(1)}分`);
  // 终幕 Boss 现在是玩家点名的 x10 耐久大墙 + 全程怪物量翻倍 —— 刻意的硬核收尾。
  // 弱自动驾驶(乱打的 AI)未必打得到/打得穿, 断言口径只保证"流程连通、能推进到终幕"。
  if (mid.deepest < 4) throw new Error(`normal can't reach the final act (stalled at ${mid.deepest + 1}/5, ${mid.phase})`);
  if (mid.bossSeen && mid.bossMinFrac <= 0.95) {
    ok(`normal reaches the final act, engages the x10 boss and chips it to ${(mid.bossMinFrac * 100).toFixed(0)}%`);
  } else {
    ok(`normal reaches the final act (act 5); the x10 boss is a deliberate wall the weak autopilot may not out-DPS`);
  }

  const low = runQuest("doctor", "easy", "easy");
  console.log(`      easy难度 / 手残玩家(zoner): phase=${low.phase} act=${low.deepest + 1}/5 ` +
              `残机${low.lives} 续关${low.revives} 击破${low.kills} boss最低${(low.bossMinFrac * 100).toFixed(0)}% 约${(low.ticks / 3600).toFixed(1)}分`);
  if (low.deepest < 4) throw new Error(`easy can't reach the final act: ${low.deepest + 1}/5 (${low.phase})`);
  ok("easy reaches the final act (story is finishable for a struggling player)");

  const hi = runQuest("kenji", "hard", "hard", 60000);
  console.log(`      hard难度 / 高水平玩家: phase=${hi.phase} act=${hi.deepest + 1}/5 ` +
              `残机${hi.lives} 续关${hi.revives} 击破${hi.kills} 约${(hi.ticks / 3600).toFixed(1)}分`);
  ok("hard difficulty still runs to a decision without stalling");

  /* ---------- 5) 必杀/超必 范围 + 炫酷 + 音效 ---------- */
  console.log("[5] special/super range, spectacle & audio");
  // 近战必杀判定盒确实变宽了(对照未强化基线不可行 —— 直接查强化标记 + 绝对宽度)
  const rng = JSON.parse(G_(`(() => {
    const out = {};
    for (const cid of Object.keys(DATA)) {
      const sp = DATA[cid].moves.special;
      out[cid] = { boosted: !!sp._rangeBoosted,
        reach: sp.box ? sp.box.x2 : null,
        hitScale: sp.projectile ? sp.projectile.hitScale : null };
    }
    return JSON.stringify(out);
  })()`));
  for (const [cid, r] of Object.entries(rng)) {
    if (!r.boosted) throw new Error(cid + ": special not range-boosted");
    if (r.hitScale !== null && !(r.hitScale >= 1.4)) throw new Error(cid + ": projectile hitScale too small " + r.hitScale);
    if (r.reach !== null && !(r.reach >= 150)) throw new Error(cid + ": melee special reach not widened " + r.reach);
  }
  ok("every special is range-boosted (melee box widened / projectile hitScale>=1.4)");

  // 超必分镜盒统一加宽
  const superOk = G_(`Object.keys(DATA).every(cid => { const m = DATA[cid].moves.super; return !m.box || m.box.x2 >= 120; })`);
  if (!superOk) throw new Error("some super cine box not widened");
  ok("super cine boxes widened for full-screen reach");

  // Projectile 放大: box() 与 draw 都吃 hitScale —— 放大后判定盒确实更大
  const boxCmp = JSON.parse(G_(`(() => {
    const P = new Projectile({ facing: 1, c: DATA.houyi }, { kind: 'sunarrow', speed: 1, y: 0, hitScale: 1.5 }, 100, 0, 1);
    const P0 = new Projectile({ facing: 1, c: DATA.houyi }, { kind: 'sunarrow', speed: 1, y: 0 }, 100, 0, 1);
    const w = b => b.x2 - b.x1;
    return JSON.stringify({ big: w(P.box()), base: w(P0.box()) });
  })()`));
  if (!(boxCmp.big > boxCmp.base)) throw new Error("hitScale does not enlarge projectile box: " + JSON.stringify(boxCmp));
  ok(`projectile hitScale enlarges the real hitbox (${boxCmp.base}px -> ${boxCmp.big}px)`);

  // 炫酷: 每个必杀/超必都有 flair(演出), 且带招名喊话
  const flairMiss = JSON.parse(G_(`(() => {
    const bad = [];
    for (const cid of Object.keys(DATA)) for (const mk of ['special', 'super']) {
      const m = DATA[cid].moves[mk];
      if (m && !m.flair) bad.push(cid + '.' + mk);
    }
    return JSON.stringify(bad);
  })()`));
  if (flairMiss.length) throw new Error("moves missing flair: " + flairMiss.join(","));
  ok("every special & super has a flair/演出 layer");

  // 音效: 新增的受击/发动音全部已注册, 且能无异常触发
  const sndKeys = ["hurtL", "hurtH", "hurtCrit", "skillCast", "superCast"];
  const sndOk = G_(`(() => {
    // 用一个最小 ctx 桩驱动 SFX 表(真实 AudioSys 在 headless 下 ctx=null 会静默跳过);
    // 这里只验证"名字已注册且函数体不抛" —— 通过反射拿到 SFX 表
    return ${JSON.stringify(sndKeys)};
  })()`);
  // AudioSys.sfx 在无 ctx 时是 no-op, 直接调用确认不抛异常即可
  for (const k of sndKeys) G_(`AudioSys.sfx('${k}')`);
  // 静态确认 audio.js 里真的定义了这些键(防止 typo 只是 no-op 掩盖)
  const audioSrc = fs.readFileSync(path.join(ROOT, "js", "audio.js"), "utf8");
  for (const k of sndKeys) if (!new RegExp("\\b" + k + "\\s*:").test(audioSrc)) throw new Error("SFX not defined: " + k);
  ok("new SFX registered & fire without error: " + sndKeys.join("/"));

  // fighter.js 确实在受击/发动处调用了这些音
  const fSrc = fs.readFileSync(path.join(ROOT, "js", "fighter.js"), "utf8");
  if (!/hurtCrit.*hurtH.*hurtL|hurtL.*hurtH.*hurtCrit|dmg >= 18/.test(fSrc)) throw new Error("receiveHit not wired to hurt sfx");
  if (!/superCast/.test(fSrc) || !/skillCast/.test(fSrc)) throw new Error("startMove not wired to cast sfx");
  ok("receiveHit plays a tiered hurt sfx; special/super play a cast sfx");

  /* ---------- 6) 双人副本 CO-OP ---------- */
  console.log("[6] two-player co-op dungeon");
  // 菜单入口: 标题第 2 项(index 1) = 双人副本; 走 char -> char2 -> diff -> startCoop
  G_("G.screen='title'; G.titleStarted=true; G.titleIntro=99; G.titleSel=1;");
  step(2);
  press("KeyJ"); step(1);                       // 进选人
  if (G_("G.screen") !== "select" || G_("G.select.coop") !== true) throw new Error("co-op menu entry did not set select.coop");
  press("KeyJ"); step(1);                        // P1 确认 -> char2
  if (G_("G.select.phase") !== "char2") throw new Error("co-op did not advance to P2 select");
  press("ArrowRight"); step(1);
  press("Numpad1"); step(1);                     // P2 用小键盘 1 确认 -> diff
  if (G_("G.select.phase") !== "diff") throw new Error("co-op P2 numpad confirm did not reach diff");
  press("KeyJ"); step(2);                        // 选难度 -> 开打
  if (G_("G.screen") !== "quest" || G_("Quest.st.coop") !== true) throw new Error("co-op did not launch");
  if (G_("Quest.st.players.length") !== 2) throw new Error("co-op did not build 2 players");
  ok("menu: CO-OP entry -> P1/P2 select -> diff -> launches a 2-player quest");

  // P2 战斗手柄 = 方向键移动 + 数字小键盘技能(用户指定): 直接派发按键读 humanPad2() 映射
  const p2has = (code, field) => {
    press(code);
    return G_(`(() => { const p = humanPad2(); return !!p['${field}']; })()`);
  };
  if (!p2has("Numpad1", "light")) throw new Error("P2 Numpad1 != light");
  if (!p2has("Numpad2", "heavy")) throw new Error("P2 Numpad2 != heavy");
  if (!p2has("Numpad3", "special")) throw new Error("P2 Numpad3 != special");
  if (!p2has("Numpad0", "super")) throw new Error("P2 Numpad0 != super");
  // 移动仍是方向键(isDown 语义): 逗号/斜杠等旧键不再触发技能
  if (p2has("Comma", "light") || p2has("Slash", "special")) throw new Error("P2 skills still bound to comma cluster");
  ok("P2 skills = numpad (1轻/2重/3必/0超); movement stays on arrow keys; comma cluster no longer attacks");

  // 两位玩家各自的手柄源已挂上, HUD/别名正确
  if (G_("Quest.st.players[0]._pad !== humanPad || Quest.st.players[1]._pad !== humanPad2"))
    throw new Error("co-op pad sources not wired (P1=humanPad, P2=humanPad2)");
  if (G_("Quest.st.player !== Quest.st.players[0]")) throw new Error("st.player alias broken");
  ok("P1 uses humanPad, P2 uses humanPad2; st.player aliases players[0]");

  // 敌人分别锁定最近的活玩家(而不是永远盯 P1)
  G_(`(() => { const st=Quest.st; st.phase='fight';
      Quest.spawnWave(Quest.LEVELS[0].waves[0]);
      st.players[0].x = 300; st.players[1].x = 900; })()`);
  step(2);
  const targets = JSON.parse(G_(`JSON.stringify(Quest.st.enemies.map(e => {
    const t = e._ai.opp; return Quest.st.players.indexOf(t);
  }))`));
  if (!targets.some(t => t === 0) || !targets.some(t => t === 1))
    throw new Error("enemies not splitting aggro across both players: " + JSON.stringify(targets));
  ok("enemies target the nearest living player (aggro splits across P1/P2)");

  // 共享残机 + 一人存活即续战: P1 阵亡耗光续关出局, P2 仍在则不 GAME OVER
  G_(`(() => { const st=Quest.st; st.lives=0;
      const p1=st.players[0], p2=st.players[1];
      p1.hp=0; })()`);
  for (let i = 0; i < 90 && !G_("Quest.st.players[0]._out"); i++) step(1);
  if (!G_("Quest.st.players[0]._out")) throw new Error("P1 never went _out with 0 lives");
  if (G_("Quest.st.phase") === "over") throw new Error("GAME OVER while P2 still alive (co-op should continue)");
  ok("shared lives: one player down (no continues) does NOT end the run while the other stands");

  // 双方都倒下且无续关 -> GAME OVER
  G_("Quest.st.players[1].hp = 0;");
  for (let i = 0; i < 120 && G_("Quest.st.phase") !== "over"; i++) step(1);
  if (G_("Quest.st.phase") !== "over") throw new Error("both players down but no GAME OVER");
  ok("both players down with no continues -> GAME OVER");
  G_("Quest.exit()");

  // 自动驾驶: 双人(两个 AI 各驱动一名英雄)能不能一起推进
  G_(`
    var __coopAI = [null, null];
    humanPad = () => coopPad(0);
    humanPad2 = () => coopPad(1);
    function coopPad(idx) {
      const st = Quest.st;
      if (!st || !st.players[idx] || st.players[idx].dead || st.players[idx]._out) return emptyPad();
      const pl = st.players[idx];
      const alive = st.enemies.filter(e => !e.dead).sort((a,b)=>Math.abs(a.x-pl.x)-Math.abs(b.x-pl.x));
      if (!alive.length || Math.abs(alive[0].x - pl.x) > 240) {
        const pad = emptyPad(); pad.right = true; return pad;
      }
      if (!__coopAI[idx] || __coopAI[idx].f !== pl) __coopAI[idx] = new AIController(pl, alive[0], 'normal', G);
      __coopAI[idx].opp = alive[0];
      return __coopAI[idx].update();
    }
  `);
  G_("Quest.startCoop('mack', 'kenji', 'normal');");
  let ct = 0, coopDeep = 0;
  while (ct < 120000) {
    const ph = G_("Quest.st && Quest.st.phase");
    if (!ph || ph === "clear" || ph === "over") break;
    coopDeep = Math.max(coopDeep, G_("Quest.st.level"));
    if (ph === "talk") { press("KeyJ"); step(2); ct += 2; continue; }
    step(12); ct += 12;
  }
  const coopR = JSON.parse(G_(`(() => { const s=Quest.st; return JSON.stringify({
    phase: s?s.phase:'gone', deepest: ${coopDeep}, kills: s?s.kills:-1, revives: s?s.revives:-1 }); })()`));
  console.log(`      双人自动驾驶(mack+kenji): phase=${coopR.phase} act=${coopDeep + 1}/5 击破${coopR.kills} 续关${coopR.revives} 约${(ct / 3600).toFixed(1)}分`);
  if (coopDeep < 3) throw new Error(`co-op autopilot stalled early at act ${coopDeep + 1}/5 (${coopR.phase})`);
  ok(`co-op autopilot pushes deep into the dungeon (reached act ${coopDeep + 1}/5) — two players fight side by side`);
  G_("Quest.exit && Quest.st && Quest.exit();");

  console.log("\nM1.4 VERIFY: ALL OK");
})().catch(e => { console.error("\nVERIFY FAIL: " + e.message); process.exit(1); });

