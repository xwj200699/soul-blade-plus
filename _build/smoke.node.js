// SOUL BLADE PLUS headless smoke: boots the REAL engine with DOM/Canvas/Image
// stubs, then drives update() directly. Verifies roster, moves, stages, select
// flow, and full AI-vs-AI matches for every new character.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "C:\\留存\\Game Now\\soul-blade-plus";
const ORDER = ["audio", "input", "data", "roster", "sprites", "fighter", "ai", "ui", "howto", "stages", "main", "select2"];

/* ---------- stubs ---------- */
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === "canvas") return { width: 1024, height: 576, style: {} };
      if (k === "measureText") return () => ({ width: 40 });
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => ({ addColorStop() {} });
      if (k === "getImageData") return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}
function canvasStub(w = 300, h = 300) {
  return { width: w, height: h, style: {}, getContext: () => ctxStub(), addEventListener() {}, toDataURL: () => "" };
}
const listeners = {};
class ImgStub {
  constructor() { this.width = 0; this.height = 0; }
  set src(v) {
    const p = path.join(ROOT, String(v).split("?")[0].replace(/\//g, path.sep));
    setTimeout(() => {
      try {
        const b = fs.readFileSync(p);
        this.width = b.readUInt32BE(16);
        this.height = b.readUInt32BE(20);
        this.onload && this.onload();
      } catch (e) { this.onerror && this.onerror(e); }
    }, 0);
  }
}
let simNow = 0;
const sandbox = {
  console, Math, JSON, Date, Promise, Uint8Array, Int32Array, Uint8ClampedArray, Object, Array,
  performance: { now: () => simNow },
  requestAnimationFrame() {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  Image: ImgStub,
  fetch: () => Promise.reject(new Error("offline")),
  localStorage: { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } },
  URLSearchParams,
  location: { search: "" },
  navigator: {},
};
sandbox.window = {
  innerWidth: 1280, innerHeight: 800,
  addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
  AudioContext: undefined, webkitAudioContext: undefined,
};
sandbox.document = {
  _els: {},
  getElementById(id) { return this._els[id] ||= (id === "game" ? canvasStub(1024, 576) : { style: {}, textContent: "", appendChild() {} }); },
  createElement: t => t === "canvas" ? canvasStub() : { style: {} },
  fonts: { load: async () => [], check: () => false },
  addEventListener() {},
};
vm.createContext(sandbox);
for (const f of ORDER) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8"), sandbox, { filename: f + ".js" });
}
const G_ = expr => vm.runInContext(expr, sandbox);
function pressKey(code) {
  for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} });
  simNow += 40;
}
function step(n) { for (let i = 0; i < n; i++) { simNow += 16.7; G_("update()"); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* wait for boot (async asset chain with stub images) */
  for (let i = 0; i < 200 && G_("G.screen") === "boot"; i++) await sleep(10);
  console.log("boot ->", G_("G.screen"));
  if (G_("G.screen") === "boot") throw new Error("boot stuck");

  /* 1) roster present */
  const ids = G_("Object.keys(DATA).join(',')");
  console.log("DATA chars:", ids);
  for (const id of ["mack", "kenji", "ayame", "wukong", "houyi", "angela"])
    if (!ids.includes(id)) throw new Error("missing " + id);
  if (G_("ROSTER.length") !== 6) throw new Error("roster size");
  for (const id of ["ayame", "wukong", "houyi", "angela"]) {
    const m = G_(`Object.keys(DATA.${id}.moves).join(',')`);
    if (!m.includes("light") || !m.includes("super")) throw new Error(id + " moves incomplete: " + m);
  }
  console.log("roster + movesets OK");

  /* 2) sprite sheets actually load & frame counts match data */
  for (const id of ["wukong", "houyi", "angela"]) {
    const bad = G_(`(() => {
      const c = DATA.${id}; const out = [];
      for (const [an, a] of Object.entries(c.anims)) {
        const img = Assets.img(c.id + ':' + an);
        if (!img) { out.push(an + ':MISSING'); continue; }
        const frames = img.width / (c.fw || 200);
        if (frames < a.frames) out.push(an + ':' + frames + '<' + a.frames);
      }
      return out.join(',');
    })()`);
    if (bad) throw new Error(id + " sheet problems: " + bad);
  }
  console.log("baked sheets load + frame counts OK");

  /* 3) stages */
  G_("StagePlus.ensure()");
  if (!G_("!!StagePlus.canvases.neon") || !G_("!!StagePlus.canvases.vale")) throw new Error("stages missing");
  G_("G.stageSel = 1");
  const isNeon = G_("UI.bgCanvas(G) === StagePlus.canvases.neon");
  G_("G.stageSel = 0");
  const isOrig = G_("UI.bgCanvas(G) !== StagePlus.canvases.neon");
  console.log("stage routing:", isNeon && isOrig ? "OK" : "FAIL");
  if (!(isNeon && isOrig)) throw new Error("stage routing");

  /* 4) select flow end-to-end via synthetic keys */
  G_(`G.screen = 'select'; G.select = { phase: 'char', cursor: 0, vsT: 0 };`);
  pressKey("KeyD"); step(1); pressKey("KeyD"); step(1); pressKey("KeyD"); step(1); // cursor -> 3 (wukong)
  pressKey("KeyJ"); step(1);
  if (G_("G.select.phase") !== "stage") throw new Error("select: no stage phase");
  pressKey("KeyD"); step(1); // stage 1 neon
  pressKey("KeyJ"); step(1);
  if (G_("G.select.phase") !== "diff") throw new Error("select: no diff phase");
  pressKey("KeyJ"); step(1);
  if (G_("G.select.phase") !== "vs") throw new Error("select: no vs phase");
  step(110); // vs splash -> startMatch
  console.log("select flow -> screen:", G_("G.screen"), "| p1:", G_("G.fighters[0].c.id"), "| stage:", G_("G.stageSel"));
  if (G_("G.screen") !== "fight" || G_("G.fighters[0].c.id") !== "wukong") throw new Error("select flow failed");

  /* 5) per-char move sanity: special connects / spawns projectile */
  function freshMatch(p1, p2) {
    G_(`startMatch('${p1}', '${p2}', 'normal', false, true)`); // training: dummy stands
    G_("G.phase = 'fight'");
    step(4);
  }
  // wukong 如意神棍: long-reach special hits from 300px
  freshMatch("wukong", "mack");
  G_("G.fighters[0].x = 330; G.fighters[1].x = 630; G.fighters[1].hp = 100;");
  G_("G.fighters[0].startMove('special')");
  step(30);
  const wkHit = G_("G.fighters[1].hp");
  console.log("wukong 如意神棍 (300px poke): opp hp 100 ->", wkHit);
  if (wkHit >= 100) throw new Error("wukong special whiffed");
  // houyi arrow projectile
  freshMatch("houyi", "mack");
  G_("G.fighters[0].x = 200; G.fighters[1].x = 800; G.fighters[1].hp = 100;");
  G_("G.fighters[0].startMove('special')");
  step(16);
  const arrows = G_("G.projectiles.length");
  step(70);
  const hyHit = G_("G.fighters[1].hp");
  console.log("houyi 落日箭: projectiles in flight =", arrows, "| opp hp ->", hyHit);
  if (arrows < 1 || hyHit >= 100) throw new Error("houyi projectile failed");
  // angela fireball
  freshMatch("angela", "kenji");
  G_("G.fighters[0].x = 250; G.fighters[1].x = 700; G.fighters[1].hp = 100;");
  G_("G.fighters[0].startMove('special')");
  step(110);
  const agHit = G_("G.fighters[1].hp");
  console.log("angela 火球術: opp hp ->", agHit);
  if (agHit >= 100) throw new Error("angela fireball failed");
  // ayame 影縫い dash-pierce
  freshMatch("ayame", "mack");
  G_("G.fighters[0].x = 380; G.fighters[1].x = 620; G.fighters[1].hp = 100;");
  G_("G.fighters[0].startMove('special')");
  step(34);
  const ayHit = G_("G.fighters[1].hp");
  console.log("ayame 影縫い: opp hp ->", ayHit);
  if (ayHit >= 100) throw new Error("ayame special failed");
  // wukong super cine (meter full, point blank)
  freshMatch("wukong", "kenji");
  G_("G.fighters[0].meter = 100; G.fighters[0].x = 470; G.fighters[1].x = 560; G.fighters[1].hp = 100;");
  G_("G.fighters[0].startMove('super')");
  step(150);
  const wkSuper = G_("G.fighters[1].hp");
  console.log("wukong 大聖乱舞 super: opp hp ->", wkSuper, "| maxCombo:", G_("G.stats.maxCombo"));
  if (wkSuper > 70) throw new Error("super dealt too little");

  /* 6) full AI-vs-AI matches (demo mode): every new char fights, match completes */
  const pairs = [["wukong", "kenji"], ["houyi", "mack"], ["angela", "ayame"], ["ayame", "wukong"]];
  for (const [a, b] of pairs) {
    G_(`startMatch('${a}', '${b}', 'hard', true, false)`);
    let ticks = 0;
    while (G_("G.screen") === "fight" && ticks < 40000) { step(120); ticks += 120; }
    if (G_("G.screen") !== "result") throw new Error("match stuck: " + a + " vs " + b);
    console.log(`AI ${a} vs ${b}: winner=${G_("G.result ? G.result.winner.c.id : G.koWinner ? G.koWinner.c.id : '?'")} ticks=${ticks} maxCombo=${G_("G.stats.maxCombo")}`);
  }

  console.log("\nNODE SMOKE: ALL OK");
})().catch(e => { console.error("SMOKE FAIL:", e.message); process.exit(1); });
