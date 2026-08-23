// M1.3 headless smoke: full M1.2 suite (retargeted to 5-item title menu)
// + diaochan(7th) full-kit + hall stage ambience + P2 comma-cluster keys
// + mouse-click layer + quest-mode wave assertions.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);   // 仓库根(原先硬编码作者机路径, 换机即挂)
const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const ORDER = [...idx.matchAll(/<script src="js\/([a-z0-9]+)\.js/g)].map(m => m[1]);

/* ---------- 0) uilib static audit: every ui.js-referenced file exists ---------- */
{
  const uisrc = fs.readFileSync(path.join(ROOT, "js", "ui.js"), "utf8");
  const refs = new Set();
  for (const m of uisrc.matchAll(/_procSimple\('([^']+)'/g)) refs.add(m[1]);
  for (const m of uisrc.matchAll(/_procHole\('([^']+)'/g)) refs.add(m[1]);
  for (const m of uisrc.matchAll(/_loadImg\('([^']+)'\)/g)) refs.add(m[1]);
  for (const m of uisrc.matchAll(/_procTitleBg\('([^']+)'/g)) refs.add(m[1]);
  for (const m of uisrc.matchAll(/TE_FILES = \{[\s\S]*?\}/g)) for (const mm of m[0].matchAll(/'([a-z0-9-]+\.png)'/g)) refs.add(mm[1]);
  refs.delete("stage-alt.png"); // 刻意不产出: ua.stage=null -> 程序化神社回退
  // 调试变体(仅 ?te= 可达)不再提供 —— 允许缺席但要记录
  const optional = new Set(["title-kanban.png", "title-gunsen.png", "title-torii.png", "announce-brush-slim.png"]);
  const missing = [], optMissing = [];
  for (const f of refs) {
    if (!fs.existsSync(path.join(ROOT, "assets", "uilib", f))) {
      (optional.has(f) ? optMissing : missing).push(f);
    }
  }
  console.log(`uilib audit: ${refs.size} refs, required missing = ${missing.length}, optional(debug) missing = ${optMissing.length}`);
  if (missing.length) throw new Error("uilib missing: " + missing.join(", "));
}

const drawCalls = [];
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 1024, height: 576, style: {} };
      if (k === "measureText") return () => ({ width: 40 });
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "getImageData") return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
      if (k === "fillText" || k === "strokeText") return (s, x, y) => drawCalls.push({ s: String(s), x, y });
      if (k === "drawImage") return (...a) => drawCalls.push({ img: true, n: a.length });
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const canvasStub = (w = 300, h = 300) => ({
  width: w, height: h, style: {}, getContext: () => ctxStub(), addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }), // M1.3 鼠标层
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

(async () => {
  for (let i = 0; i < 200 && G_("G.screen") === "boot"; i++) await sleep(10);
  console.log("boot ->", G_("G.screen"));

  /* 1) sizes / crouch box (九人: M1.3 七人 + 校园电力风 doctor/tank) */
  if (G_("ROSTER.length") !== 9 || G_("ROSTER[6]") !== "diaochan" ||
      G_("ROSTER[7]") !== "doctor" || G_("ROSTER[8]") !== "tank") throw new Error("roster != 9 (diaochan/doctor/tank)");
  const visH = { mack: 150, kenji: 145, ayame: 150, wukong: Math.round(83 * G_("DATA.wukong.scale")), houyi: Math.round(79 * G_("DATA.houyi.scale")), angela: Math.round(77 * G_("DATA.angela.scale")), diaochan: Math.round(80 * G_("DATA.diaochan.scale")), doctor: Math.round(84 * G_("DATA.doctor.scale")), tank: Math.round(81 * G_("DATA.tank.scale")) };
  const hs = Object.values(visH);
  const spread = (Math.max(...hs) - Math.min(...hs)) / Math.max(...hs);
  console.log("display heights (9) spread:", (spread * 100).toFixed(1) + "%");
  if (spread > 0.10) throw new Error("size spread > 10%");
  G_("startMatch('wukong', 'mack', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'");
  step(4);
  const standH = G_("(() => { const b = G.fighters[0].bodyBox(); return b.y2 - b.y1; })()");
  G_("G.fighters[0].state = 'crouch'");
  const crouchH = G_("(() => { const b = G.fighters[0].bodyBox(); return b.y2 - b.y1; })()");
  if (!(crouchH < standH * 0.75)) throw new Error("crouch box not lowered");
  G_("G.fighters[0].state = 'idle'");
  console.log("crouch box OK", standH, "/", crouchH);

  /* 2) char2 + mode isolation (M1.3: 五项菜单, LOCAL VS=2 / VS CPU=1; P2 逗号簇确认) */
  G_("G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 2;");
  press("KeyJ"); step(1);
  press("KeyJ"); step(1);
  if (G_("G.select.phase") !== "char2") throw new Error("no char2 phase");
  press("ArrowRight"); step(1);
  press("Comma"); step(1);              // M1.3: 笔记本簇确认
  if (G_("G.select.phase") !== "stage") throw new Error("P2 comma confirm failed");
  press("KeyJ"); step(1); step(110);
  if (G_("G.screen") !== "fight" || G_("G.p2IsAI") !== false) throw new Error("localvs broken");
  // P2 逗号轻击可用
  G_("G.phase = 'fight'");
  G_("G.fighters[1].x = G.fighters[0].x + 80;");
  press("Comma"); step(3);
  if (G_("G.fighters[1].state") !== "attack" && G_("G.fighters[1].move === null")) {
    // 允许 startup 已过: 只要不是从未响应
    if (G_("G.fighters[1].anim.name").indexOf("attack") < 0) throw new Error("P2 comma attack not registered");
  }
  console.log("P2 comma-cluster OK");
  G_("G.paused = false; G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 1;");
  step(2);
  press("KeyJ"); step(1); press("KeyJ"); step(1); press("KeyJ"); step(1); press("KeyJ"); step(1); step(110);
  if (G_("G.screen") !== "fight" || G_("G.p2IsAI") !== true || !G_("G.ai[1] && G.ai[1].plan !== undefined")) throw new Error("mode pollution");
  console.log("char2 + mode isolation OK (5-item menu)");

  /* 2.5) 鼠标层: 标题点击 STORY 条 -> quest 选人; 点击网格第7格(貂蝉)选中 */
  G_("G.paused = false; G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 4;");
  step(2);
  const clickAt = (x, y) => {
    for (const fn of listeners.pointerdown || []) fn({ clientX: x, clientY: y });
    simNow += 30;
  };
  clickAt(512, 338 + 17); step(2);      // STORY 条中心
  if (G_("G.screen") !== "select" || G_("G.select.quest") !== true) throw new Error("mouse title click failed");
  const rc7 = G_("(() => { const r = _selGridRects()[6]; return JSON.stringify({ x: r.x + r.w / 2, y: r.y + r.h / 2 }); })()");
  const p7 = JSON.parse(rc7);
  clickAt(p7.x, p7.y); step(2);         // 直接点貂蝉 -> confirm 进难度
  if (G_("G.select.phase") !== "diff" || G_("G.select.p1") !== "diaochan") throw new Error("mouse grid click failed: " + G_("G.select.phase") + "/" + G_("G.select.p1"));
  console.log("mouse layer OK (title bar + grid tile -> diaochan/diff)");
  G_("G.screen = 'title';"); step(1);

  /* 3) super redesigns: FX primitives actually fire + damage lands (M1.3 +貂蝉) */
  const superFx = [
    ["wukong", "staff", () => G_("Effects.pillars.length") > 0, "pillar(落地重砸)"],
    ["houyi", "arrowrain", () => G_("Effects.skyArrows.length") > 0, "skyArrows(箭雨)"],
    ["angela", "flame", () => G_("Effects.beams.length") > 0, "beam(激光)"],
    ["diaochan", "fandance", () => G_("Effects.parts.some(p => p.petal)") === true, "petals(花舞)"],
  ];
  for (const [cid, style, probe, what] of superFx) {
    G_(`startMatch('${cid}', 'kenji', 'normal', false, true, false, true)`);
    G_("G.phase = 'fight'");
    step(4);
    G_("G.fighters[0].meter = 100; G.fighters[0].x = 470; G.fighters[1].x = 560; G.fighters[1].hp = 100; G.fighters[1].pad = null; G.fighters[1].state='idle'; G.fighters[1].hitstun = 0; G.fighters[1].invuln = 0;");
    G_("G.fighters[0].startMove('super')");
    let fxSeen = false, seqSeen = false;
    for (let i = 0; i < 40 && G_("!!G.fighters[0].superSeq || !G.fighters[0].move") === false; i++) step(1);
    for (let i = 0; i < 110; i++) {
      step(1);
      if (G_("!!G.fighters[0].superSeq")) seqSeen = true;
      if (probe()) fxSeen = true;
      if (seqSeen && fxSeen && !G_("!!G.fighters[0].superSeq")) break;
    }
    step(30);
    const hp = G_("G.fighters[1].hp"), maxHp = G_("G.fighters[1].maxHp");
    if (!seqSeen) throw new Error(cid + " superSeq never started");
    if (!fxSeen) throw new Error(cid + " super missing FX: " + what);
    // 门槛按比例(BASE_HP 可调), 不写死血量
    if (hp > maxHp * 0.7) throw new Error(cid + " super damage too low: " + hp + "/" + maxHp);
    console.log(`${cid} super v2 OK -> hp ${hp}/${maxHp}, fx ${what}`);
  }

  /* 4) per-stage ambience isolation (M1.3 +青铜神殿) */
  const amb = [];
  for (const [sel, probe, what] of [
    [0, "Effects.parts.some(p => p.color === '#c98a9e' || p.color === '#a86a80')", "petals"],
    [1, "Effects.parts.some(p => p.w === 2 && p.h >= 11)", "rain"],
    [2, "Effects.parts.some(p => p.sway && (p.color === '#8ad8ff' || p.color === '#d8f2ff' || p.color === '#ffd24a'))", "motes"],
    [3, "Effects.parts.some(p => p.color === '#ffb056' || p.color === '#ff7a3c')", "embers"],
  ]) {
    G_("startMatch('mack', 'kenji', 'easy', true, false, false, true)");
    G_(`G.stageSel = ${sel}; G.phase = 'fight'`);
    G_("Effects.reset()");
    step(140);
    const ok = G_(probe);
    const petalLeak = sel !== 0 && G_("Effects.parts.some(p => p.color === '#c98a9e' || p.color === '#a86a80')");
    if (!ok) throw new Error("stage " + sel + " ambience missing: " + what);
    if (petalLeak) throw new Error("stage " + sel + " petal leak!");
    amb.push(what);
  }
  console.log("stage ambience OK:", amb.join("/"));

  /* 5) fair-AI fields + hard match completes (回归, 含貂蝉对局) */
  for (const f of ["ai", "data"]) {
    const src = fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8");
    if (/cheatRead\s*:|readP\s*:|meterRegen\s*:/.test(src)) throw new Error("cheat field in " + f);
  }
  G_("startMatch('diaochan', 'houyi', 'hard', true, false, false, true)");
  let t = 0;
  while (G_("G.screen") === "fight" && t < 40000) { step(120); t += 120; }
  if (G_("G.screen") !== "result") throw new Error("hard match stuck");
  console.log("hard AI match completes:", G_("G.result.winner.c.id"));

  /* 6) quest mode: talk -> walk -> wave spawn -> mook KO -> 回 walk (快断言) */
  G_("Quest.start('wukong', 'normal')");
  if (G_("G.screen") !== "quest") throw new Error("quest start failed");
  for (let i = 0; i < 12 && G_("Quest.st.phase") === "talk"; i++) { press("KeyJ"); step(2); }
  if (G_("Quest.st.phase") !== "walk") throw new Error("quest no walk");
  for (const fn of listeners.keydown || []) fn({ code: "KeyD", repeat: false, preventDefault() {} });
  let g = 0;
  while (G_("Quest.st.phase") === "walk" && g++ < 600) step(4);
  for (const fn of listeners.keyup || []) fn({ code: "KeyD" });
  if (G_("Quest.st.phase") !== "fight" || G_("Quest.st.enemies.length") < 2) {
    throw new Error(`quest wave not spawned (phase=${G_("Quest.st.phase")} px=${Math.round(G_("Quest.st.player.x"))} paused=${G_("Quest.st.paused")} en=${G_("Quest.st.enemies.length")})`);
  }
  const arenaLocked = G_("STAGE.right - STAGE.left") < 1000;
  if (!arenaLocked) throw new Error("quest arena not locked");
  G_("Quest.st.enemies.forEach(e => e.hp = 1)");
  let f2 = 0;
  while (G_("Quest.st.phase") === "fight" && f2++ < 600) {
    G_("(() => { const p = Quest.st.player, es = Quest.st.enemies.filter(e => !e.dead); if (es.length) { p.x = es[0].x - 60; p.facing = 1; } })()");
    press("KeyJ"); step(5);
    G_("Quest.st.enemies.forEach(e => { if (!e.dead) e.hp = Math.min(e.hp, 1); })");
  }
  if (G_("Quest.st.phase") !== "walk") throw new Error("quest wave not cleared, phase=" + G_("Quest.st.phase"));
  if (G_("Quest.st.kills") < 2) throw new Error("quest kills not counted");
  G_("Quest.exit()");
  if (G_("STAGE.left") !== 60 || G_("STAGE.right") !== 964) throw new Error("STAGE not restored after quest");
  console.log("quest smoke OK (wave spawn/KO/arena-lock/exit-restore)");

  console.log("\nM1.3 SMOKE: ALL OK");
})().catch(e => { console.error("SMOKE FAIL:", e.message); process.exit(1); });
