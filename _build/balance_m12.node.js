// M1.2 balance telemetry: 6x6 hard AI round-robin (both sides x REPS).
// Data-only pass: flags lopsided pairs for review.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "C:\\留存\\Game Now\\soul-blade-plus";
const REPS = 5; // per ordered pair -> 10 games per unordered matchup

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
  const ids = ["mack", "kenji", "ayame", "wukong", "houyi", "angela"];
  const wins = {};
  for (const a of ids) { wins[a] = {}; for (const b of ids) wins[a][b] = 0; }
  const totals = {}; for (const a of ids) totals[a] = { w: 0, n: 0 };
  let games = 0;
  const t0 = Date.now();

  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    for (let r = 0; r < REPS; r++) {
      G_(`startMatch('${a}', '${b}', 'hard', true, false, false, true)`);
      let t = 0;
      while (G_("G.screen") === "fight" && t < 60000) { step(200); t += 200; }
      const winner = G_("G.screen === 'result' ? G.result.winner.c.id : null");
      games++;
      if (winner === a) { wins[a][b]++; totals[a].w++; }
      else if (winner === b) { totals[b].w++; }
      totals[a].n++; totals[b].n++;
      if (!winner) console.log(`  !! stuck: ${a} vs ${b} rep${r}`);
    }
  }

  const rows = [], flags = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = ids[i], b = ids[j];
    const aw = wins[a][b] + (REPS - wins[b][a]);
    const n = REPS * 2;
    const wr = aw / n;
    rows.push({ pair: `${a} vs ${b}`, aWins: aw, n, wr: +(wr * 100).toFixed(0) });
    if (wr >= 0.85 || wr <= 0.15) flags.push({ pair: `${a} vs ${b}`, wr: +(wr * 100).toFixed(0), severity: "P1-lopsided" });
    else if (wr >= 0.70 || wr <= 0.30) flags.push({ pair: `${a} vs ${b}`, wr: +(wr * 100).toFixed(0), severity: "watch" });
  }
  const overall = ids.map(a => ({ id: a, winrate: +((totals[a].w / totals[a].n) * 100).toFixed(1) }))
    .sort((x, y) => y.winrate - x.winrate);

  const report = {
    date: new Date().toISOString(), reps: REPS, games,
    elapsedSec: +((Date.now() - t0) / 1000).toFixed(1),
    overall, matchups: rows, flags,
    note: "flag thresholds: >=70% watch, >=85% lopsided(P1)",
  };
  fs.writeFileSync(path.join(ROOT, "_build", "balance_m12.json"), JSON.stringify(report, null, 2));
  console.log(`\n${games} games in ${report.elapsedSec}s`);
  console.log("overall:", overall.map(o => `${o.id} ${o.winrate}%`).join(" | "));
  console.log("flags:", flags.length ? JSON.stringify(flags) : "none");
})();
