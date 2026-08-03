// M1 headless smoke — real engine, all M1 systems:
// fair AI (source + match), signature supers, LOCAL VS pads, portraits, crouch sheets.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "C:\\留存\\Game Now\\soul-blade-plus";
const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const ORDER = [...idx.matchAll(/<script src="js\/([a-z0-9]+)\.js/g)].map(m => m[1]);
console.log("modules:", ORDER.join(","));

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
  Image: ImgStub,
  fetch: () => Promise.reject(new Error("offline")),
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
const press = code => {  // 真实"点按" = keydown + keyup (否则合成按键会永久按住)
  for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} });
  for (const fn of listeners.keyup || []) fn({ code });
  simNow += 40;
};
const hold = code => { for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} }); };
const release = code => { for (const fn of listeners.keyup || []) fn({ code }); };
const step = n => { for (let i = 0; i < n; i++) { simNow += 16.7; G_("update()"); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < 200 && G_("G.screen") === "boot"; i++) await sleep(10);
  if (G_("G.screen") === "boot") throw new Error("boot stuck");
  console.log("boot ->", G_("G.screen"));

  /* 1) fair AI: source-level (no input reading fields anywhere) */
  for (const f of ["ai", "data"]) {
    const src = fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8");
    if (/cheatRead\s*:|readP\s*:|meterRegen\s*:/.test(src)) throw new Error("cheat field in " + f);
    if (/o\.pad\.(light|heavy|special|super|jump)\b/.test(src)) throw new Error("input read in " + f);
  }
  const hard = G_("JSON.stringify([AI_DIFFS.hard.reactMin, AI_DIFFS.hard.reactMax])");
  console.log("fair AI OK · hard react window:", hard);
  if (hard !== "[5,9]") throw new Error("hard react window wrong");

  /* 2) crouch sheets baked + all sheets frame counts */
  for (const id of ["wukong", "houyi", "angela"]) {
    const bad = G_(`(() => {
      const c = DATA.${id}; const out = [];
      for (const [an, a] of Object.entries(c.anims)) {
        const img = Assets.img(c.id + ':' + an);
        if (!img) { out.push(an + ':MISSING'); continue; }
        if (img.width / (c.fw || 200) < a.frames) out.push(an + ':short');
      }
      return out.join(',');
    })()`);
    if (bad) throw new Error(id + " sheets: " + bad);
    if (G_(`DATA.${id}.anims.crouch.file`) !== "Crouch.png") throw new Error(id + " crouch not wired");
  }
  console.log("sheets + real crouch frames OK");

  /* 3) portraits loaded into UI.ua */
  await sleep(80);
  const ports = G_(`['ayame','wukong','houyi','angela'].map(c => (UI.ua['sel_'+c]?1:0)+(UI.ua['hud_'+c]?1:0)).join(',')`);
  console.log("extended busts loaded (sel+hud per char):", ports);
  if (ports !== "2,2,2,2") throw new Error("portraits missing: " + ports);

  /* 4) signature supers: each style branch runs to completion */
  const superCases = [["wukong", "staff", 60], ["houyi", "arrowrain", 66], ["angela", "flame", 70]];
  for (const [cid, style, dur] of superCases) {
    G_(`startMatch('${cid}', 'mack', 'normal', false, true, false, true)`);
    G_("G.phase = 'fight'");
    step(4);
    G_(`(() => {
      const [a, b] = G.fighters;
      a.meter = 100; a.x = 470; b.x = 560; b.hp = 100; b.state = 'idle'; b.move = null; b.hitstun = 0; b.invuln = 0; b.guard = 0; b.pad = null;
      a.state = 'idle'; a.move = null;
      a.startMove('super');
    })()`);
    step(6);
    const styleGot = G_("G.fighters[0].move ? (G.fighters[0].move.def.cine||{}).style : 'none'");
    if (styleGot !== style) throw new Error(cid + " super style " + styleGot);
    step(dur + 90);
    const hp = G_("G.fighters[1].hp"), seq = G_("!!G.fighters[0].superSeq"), grounded = G_("G.fighters[0].grounded");
    console.log(`${cid} super '${style}': opp hp -> ${hp} · seq cleared=${!seq} · self grounded=${grounded}`);
    if (hp > 70 || seq || !grounded) throw new Error(cid + " super misbehaved");
  }

  /* 5) LOCAL VS: full flow via synthetic keys, then both human pads work */
  G_("G.screen = 'title'; G.titleStarted = true; G.titleIntro = 99; G.titleSel = 0;");
  press("KeyS"); step(1);                     // -> LOCAL VS
  press("KeyJ"); step(1);
  if (G_("G.select && G.select.localvs") !== true) throw new Error("localvs select not entered");
  press("KeyD"); step(1); press("KeyJ"); step(1);      // P1 = kenji(隼人)? cursor1
  if (G_("G.select.phase") !== "char2") throw new Error("no P2 phase");
  press("ArrowRight"); step(1); press("Numpad1"); step(1); // P2 pick via P2 keys
  if (G_("G.select.phase") !== "stage") throw new Error("no stage phase after P2");
  press("KeyJ"); step(1);                     // stage 0
  step(110);                                  // vs splash -> match
  if (G_("G.screen") !== "fight") throw new Error("localvs match not started");
  if (G_("G.matchCfg.localvs") !== true) throw new Error("localvs flag lost");
  if (G_("G.ai[0] !== null")) throw new Error("P1 should be human");
  G_("G.phase = 'fight'");
  // P2 attacks with numpad; P1 stands: expect P1 hp drop
  G_("G.fighters[0].x = 470; G.fighters[1].x = 560; G.fighters[0].hp = 100;");
  press("Numpad1"); step(14);
  const p1hp = G_("G.fighters[0].hp");
  // P2 walks with arrows
  hold("ArrowLeft"); step(20); release("ArrowLeft");
  const p2x = G_("G.fighters[1].x");
  console.log(`localvs OK · P2 attack -> P1 hp ${p1hp} · P2 walked to x=${Math.round(p2x)}`);
  if (p1hp >= 100) throw new Error("P2 attack did not connect");
  if (p2x >= 560) throw new Error("P2 arrows did not move");

  /* 6) fair-AI hard match still completes (no cheat fields at runtime) */
  G_("startMatch('wukong', 'kenji', 'hard', true, false, false, true)");
  let ticks = 0;
  while (G_("G.screen") === "fight" && ticks < 40000) { step(120); ticks += 120; }
  if (G_("G.screen") !== "result") throw new Error("hard AI match stuck");
  console.log(`hard AI-vs-AI completes: winner=${G_("G.result.winner.c.id")} ticks=${ticks} maxCombo=${G_("G.stats.maxCombo")}`);

  /* 7) CPU flow regression (non-localvs select) */
  G_("G.screen = 'title'; G.titleSel = 0; G.select = null;");
  press("KeyJ"); step(1);
  press("KeyJ"); step(1); // pick char -> stage
  if (G_("G.select.phase") !== "stage") throw new Error("cpu flow broken");
  press("KeyJ"); step(1);
  if (G_("G.select.phase") !== "diff") throw new Error("cpu diff missing");
  press("KeyJ"); step(1); step(110);
  if (G_("G.screen") !== "fight" || G_("G.matchCfg.localvs") !== false) throw new Error("cpu match wrong mode");
  console.log("CPU flow regression OK");

  console.log("\nM1 SMOKE: ALL OK");
})().catch(e => { console.error("SMOKE FAIL:", e.message); process.exit(1); });
