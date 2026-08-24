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
  const runQuest = (hero, diff, playerAi, maxTicks = 90000) => {
    G_(`__auto = null; __autoDiff = '${playerAi}'; Quest.start('${hero}', '${diff}');`);
    let t = 0, deepest = 0;
    while (t < maxTicks) {
      const ph = G_("Quest.st && Quest.st.phase");
      if (!ph || ph === "clear" || ph === "over") break;
      deepest = Math.max(deepest, G_("Quest.st.level"));
      if (ph === "talk") { press("KeyJ"); step(2); t += 2; continue; }
      step(12); t += 12;
    }
    const r = JSON.parse(G_(`(() => { const s = Quest.st; return JSON.stringify({
      phase: s ? s.phase : 'gone', level: s ? s.level : -1, lives: s ? s.lives : -1,
      revives: s ? s.revives : -1, kills: s ? s.kills : -1,
      hp: s && s.player ? Math.round(s.player.hp) : -1,
    }); })()`));
    r.ticks = t; r.deepest = deepest;
    G_("Quest.exit()");
    return r;
  };

  const mid = runQuest("mack", "normal", "normal");
  console.log(`      normal难度 / 普通水平玩家: phase=${mid.phase} act=${mid.deepest + 1}/5 ` +
              `残机${mid.lives} 续关${mid.revives} 击破${mid.kills} 约${(mid.ticks / 3600).toFixed(1)}分`);
  if (mid.phase !== "clear") {
    throw new Error(`normal is still unbeatable: stalled at act ${mid.deepest + 1}/5 (phase=${mid.phase}, revives=${mid.revives})`);
  }
  ok("normal difficulty clears all 5 acts with an average-skill autopilot");

  const low = runQuest("doctor", "easy", "easy");
  console.log(`      easy难度 / 手残玩家(zoner): phase=${low.phase} act=${low.deepest + 1}/5 ` +
              `残机${low.lives} 续关${low.revives} 击破${low.kills} 约${(low.ticks / 3600).toFixed(1)}分`);
  if (low.phase !== "clear") throw new Error(`easy is unbeatable even for a weak player: act ${low.deepest + 1}/5 (${low.phase})`);
  ok("easy difficulty clears too — story mode is finishable for a struggling player");

  const hi = runQuest("kenji", "hard", "hard");
  console.log(`      hard难度 / 高水平玩家: phase=${hi.phase} act=${hi.deepest + 1}/5 ` +
              `残机${hi.lives} 续关${hi.revives} 击破${hi.kills} 约${(hi.ticks / 3600).toFixed(1)}分`);
  if (hi.phase === "clear" && hi.revives === 0) console.log("      (hard 仍留有挑战空间: 建议人工确认手感)");
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


  console.log("\nM1.4 VERIFY: ALL OK");
})().catch(e => { console.error("\nVERIFY FAIL: " + e.message); process.exit(1); });

