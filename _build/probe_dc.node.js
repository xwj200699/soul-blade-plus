// quick probe: diaochan end-to-end (assets load, moves, fandance super, hard match)
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = "C:\\留存\\Game Now\\soul-blade-plus";
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
const canvasStub = (w = 300, h = 300) => ({ width: w, height: h, style: {}, getContext: () => ctxStub(), addEventListener() {} });
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
sandbox.window = { innerWidth: 1280, innerHeight: 800, addEventListener() {}, AudioContext: undefined };
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
const step = n => { for (let i = 0; i < n; i++) { simNow += 16.7; G_("update()"); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < 300 && G_("G.screen") === "boot"; i++) await sleep(10);
  console.log("roster:", G_("ROSTER.length"), "| dc frames idle:", G_("(Assets.img('diaochan:idle')||{}).width"));
  // fandance super
  G_("startMatch('diaochan', 'kenji', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'");
  step(4);
  G_("G.fighters[0].meter = 100; G.fighters[0].x = 470; G.fighters[1].x = 560; G.fighters[1].hp = 100; G.fighters[1].pad = null; G.fighters[1].state='idle'; G.fighters[1].hitstun = 0; G.fighters[1].invuln = 0;");
  G_("G.fighters[0].startMove('super')");
  let seq = false;
  for (let i = 0; i < 130; i++) { step(1); if (G_("!!G.fighters[0].superSeq")) seq = true; }
  step(30);
  console.log("fandance:", seq, "| kenji hp:", G_("G.fighters[1].hp"));
  if (!seq || G_("G.fighters[1].hp") > 70) throw new Error("fandance broken");
  // featherfan projectile
  G_("startMatch('diaochan', 'mack', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'");
  step(4);
  G_("G.fighters[1].pad = null; G.fighters[1].x = 700; G.fighters[0].x = 330;");
  G_("G.fighters[0].startMove('special')");
  step(20);
  const nProj = G_("G.projectiles.length");
  step(60);
  console.log("featherfan spawned:", nProj, "| mack hp:", G_("G.fighters[1].hp"));
  if (nProj < 1) throw new Error("featherfan not spawned");
  // hard match completes
  G_("startMatch('diaochan', 'wukong', 'hard', true, false, false, true)");
  let t = 0;
  while (G_("G.screen") === "fight" && t < 40000) { step(200); t += 200; }
  console.log("hard match:", G_("G.screen"), "winner:", G_("G.result && G.result.winner.c.id"));
  if (G_("G.screen") !== "result") throw new Error("dc hard match stuck");
  console.log("DC PROBE: ALL OK");
})().catch(e => { console.error("DC FAIL:", e.message); process.exit(1); });
