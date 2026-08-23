// probe: 校园电力风双角色 doctor / tank 端到端
// (精灵图装载 / datapack 飞行道具 / 超必 cine / 肉盾 dmgTaken 减伤 / hard AI 打完)
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
  console.log("roster:", G_("ROSTER.length"),
              "| doctor idle sheet:", G_("(Assets.img('doctor:idle')||{}).width"),
              "| tank idle sheet:", G_("(Assets.img('tank:idle')||{}).width"));
  if (!G_("(Assets.img('doctor:idle')||{}).width") || !G_("(Assets.img('tank:idle')||{}).width")) {
    throw new Error("new roster sheets not loaded");
  }

  /* 1) 博士·死循环: datapack 飞行道具生成并命中 */
  G_("startMatch('doctor', 'mack', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'"); step(4);
  G_("G.fighters[1].pad = null; G.fighters[1].x = 700; G.fighters[0].x = 330;");
  G_("G.fighters[0].startMove('special')");
  step(20);
  const nProj = G_("G.projectiles.length");
  const pk = G_("G.projectiles[0] && G.projectiles[0].kind");
  step(60);
  console.log("datapack spawned:", nProj, "kind:", pk, "| mack hp:", G_("G.fighters[1].hp"));
  if (nProj < 1 || pk !== "datapack") throw new Error("datapack not spawned");
  if (G_("G.fighters[1].hp >= G.fighters[1].maxHp")) throw new Error("datapack dealt no damage");

  /* 2) 博士·蓝屏警告: 通用 cine 跑完并掉血 */
  G_("startMatch('doctor', 'kenji', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'"); step(4);
  G_("G.fighters[0].meter = 100; G.fighters[0].x = 470; G.fighters[1].x = 560; G.fighters[1].pad = null; G.fighters[1].state='idle'; G.fighters[1].hitstun = 0; G.fighters[1].invuln = 0;");
  G_("G.fighters[0].startMove('super')");
  let seq = false;
  for (let i = 0; i < 130; i++) { step(1); if (G_("!!G.fighters[0].superSeq")) seq = true; }
  step(30);
  console.log("doctor super:", seq, "| kenji hp:", G_("G.fighters[1].hp"));
  if (!seq || G_("G.fighters[1].hp > G.fighters[1].maxHp * 0.7")) throw new Error("doctor super broken");

  /* 3) 肉盾 dmgTaken: 同一招打 tank 应比打 mack 少掉血 */
  const takeSame = (victim) => {
    G_(`startMatch('kenji', '${victim}', 'normal', false, true, false, true)`);
    G_("G.phase = 'fight'"); step(4);
    G_("G.fighters[0].pad = emptyPad(); G.fighters[1].pad = emptyPad();");
    G_("G.fighters[1].hp = G.fighters[1].maxHp; G.fighters[1].guard = 0; G.fighters[1].state = 'idle'; G.fighters[1].hitstun = 0;");
    G_("G.fighters[1].receiveHit({ dmg: 20, hitstun: 10, knock: 2, guardDmg: 0 }, G.fighters[0])");
    return G_("G.fighters[1].hp");
  };
  const hpMack = takeSame("mack"), hpTank = takeSame("tank");
  console.log("dmg20 -> mack hp:", hpMack, "| tank hp:", hpTank, "(dmgTaken 0.8)");
  if (!(hpTank > hpMack)) throw new Error("tank dmgTaken not applied");

  /* 4) 肉盾·铁壁突进: 带位移的击倒特殊技 */
  G_("startMatch('tank', 'mack', 'normal', false, true, false, true)");
  G_("G.phase = 'fight'"); step(4);
  G_("G.fighters[1].pad = null; G.fighters[0].x = 420; G.fighters[1].x = 520; G.fighters[1].hp = G.fighters[1].maxHp; G.fighters[1].state='idle'; G.fighters[1].hitstun = 0;");
  const x0 = G_("G.fighters[0].x");
  G_("G.fighters[0].startMove('special')");
  step(30);
  console.log("tank charge: dx =", (G_("G.fighters[0].x") - x0).toFixed(1), "| mack hp:", G_("G.fighters[1].hp"));
  if (G_("G.fighters[1].hp >= G.fighters[1].maxHp")) throw new Error("tank charge dealt no damage");

  /* 5) 全员招式演出冒烟: 每个角色把 moves 里每一招都放一次, playFlair 不许抛 */
  const allMoves = G_("JSON.stringify(ROSTER.map(id => [id, Object.keys(DATA[id].moves)]))");
  for (const [cid, keys] of JSON.parse(allMoves)) {
    G_(`startMatch('${cid}', 'mack', 'normal', false, true, false, true)`);
    G_("G.phase = 'fight'"); step(4);
    G_("G.fighters[1].x = G.fighters[0].x + 120; G.fighters[1].hp = G.fighters[1].maxHp;");
    for (const k of keys) {
      G_("G.fighters[0].meter = 100; G.fighters[0].state = 'idle'; G.fighters[0].move = null; G.fighters[0].hitstun = 0; G.fighters[0].specialCd = 0;");
      if (G_(`!!DATA['${cid}'].moves['${k}'].air`)) G_("G.fighters[0].grounded = false; G.fighters[0].y = STAGE.ground - 60;");
      G_(`G.fighters[0].startMove('${k}')`);
      step(60);
    }
    console.log(`flair ok: ${cid} (${keys.length} moves)`);
  }

  /* 6) hard AI 双向打完(两名新角色都能进结算) */
  for (const [a, b] of [["doctor", "tank"], ["tank", "houyi"]]) {
    G_(`startMatch('${a}', '${b}', 'hard', true, false, false, true)`);
    let t = 0;
    while (G_("G.screen") === "fight" && t < 40000) { step(200); t += 200; }
    console.log(`hard ${a} vs ${b}:`, G_("G.screen"), "winner:", G_("G.result && G.result.winner.c.id"));
    if (G_("G.screen") !== "result") throw new Error(`${a} vs ${b} hard match stuck`);
  }
  console.log("CAMPUS PROBE: ALL OK");
})();
