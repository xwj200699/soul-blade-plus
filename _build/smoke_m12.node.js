// M1.2 headless smoke: full M1.1 suite + super-redesign FX assertions
// + per-stage ambience isolation + uilib static resolution audit.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "C:\\留存\\Game Now\\soul-blade-plus";
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
const canvasStub = (w = 300, h = 300) => ({ width: w, height: h, style: {}, getContext: () => ctxStub(), addEventListener() {} });
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

  /* 1) sizes / crouch box (M1.1 回归) */
  const visH = { mack: 150, kenji: 145, ayame: 150, wukong: Math.round(83 * G_("DATA.wukong.scale")), houyi: Math.round(79 * G_("DATA.houyi.scale")), angela: Math.round(77 * G_("DATA.angela.scale")) };
  const hs = Object.values(visH);
  const spread = (Math.max(...hs) - Math.min(...hs)) / Math.max(...hs);
  console.log("display heights spread:", (spread * 100).toFixed(1) + "%");
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

  /* 2) char2 + mode isolation (M1.1 回归, 精简断言) */
  G_("G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 1;");
  press("KeyJ"); step(1);
  press("KeyJ"); step(1);
  if (G_("G.select.phase") !== "char2") throw new Error("no char2 phase");
  press("ArrowRight"); step(1);
  press("Numpad1"); step(1);
  if (G_("G.select.phase") !== "stage") throw new Error("P2 confirm failed");
  press("KeyJ"); step(1); step(110);
  if (G_("G.screen") !== "fight" || G_("G.p2IsAI") !== false) throw new Error("localvs broken");
  G_("G.paused = false; G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 0;");
  step(2);
  press("KeyJ"); step(1); press("KeyJ"); step(1); press("KeyJ"); step(1); press("KeyJ"); step(1); step(110);
  if (G_("G.screen") !== "fight" || G_("G.p2IsAI") !== true || !G_("G.ai[1] && G.ai[1].plan !== undefined")) throw new Error("mode pollution");
  console.log("char2 + mode isolation OK");

  /* 3) M1.2 super redesigns: FX primitives actually fire + damage lands */
  const superFx = [
    ["wukong", "staff", () => G_("Effects.pillars.length") > 0, "pillar(落地重砸)"],
    ["houyi", "arrowrain", () => G_("Effects.skyArrows.length") > 0, "skyArrows(箭雨)"],
    ["angela", "flame", () => G_("Effects.beams.length") > 0, "beam(激光)"],
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
    const hp = G_("G.fighters[1].hp");
    if (!seqSeen) throw new Error(cid + " superSeq never started");
    if (!fxSeen) throw new Error(cid + " super missing FX: " + what);
    if (hp > 70) throw new Error(cid + " super damage too low: " + hp);
    console.log(`${cid} super v2 OK -> hp ${hp}, fx ${what}`);
  }

  /* 4) per-stage ambience isolation */
  const amb = [];
  for (const [sel, probe, what] of [
    [0, "Effects.parts.some(p => p.color === '#c98a9e' || p.color === '#a86a80')", "petals"],
    [1, "Effects.parts.some(p => p.w === 2 && p.h >= 11)", "rain"],
    [2, "Effects.parts.some(p => p.sway && (p.color === '#8ad8ff' || p.color === '#d8f2ff' || p.color === '#ffd24a'))", "motes"],
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

  /* 5) fair-AI fields + hard match completes (回归) */
  for (const f of ["ai", "data"]) {
    const src = fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8");
    if (/cheatRead\s*:|readP\s*:|meterRegen\s*:/.test(src)) throw new Error("cheat field in " + f);
  }
  G_("startMatch('houyi', 'angela', 'hard', true, false, false, true)");
  let t = 0;
  while (G_("G.screen") === "fight" && t < 40000) { step(120); t += 120; }
  if (G_("G.screen") !== "result") throw new Error("hard match stuck");
  console.log("hard AI match completes:", G_("G.result.winner.c.id"));

  console.log("\nM1.2 SMOKE: ALL OK");
})().catch(e => { console.error("SMOKE FAIL:", e.message); process.exit(1); });
