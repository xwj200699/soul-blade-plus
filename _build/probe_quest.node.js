// quest-mode logic probe: talk -> walk -> wave -> KO -> boss -> outro -> next level -> clear
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
const step = n => { for (let i = 0; i < n; i++) { simNow += 16.7; G_("update()"); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const press = code => {
  for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} });
  for (const fn of listeners.keyup || []) fn({ code });
  simNow += 40;
};
const keyDown = code => { for (const fn of listeners.keydown || []) fn({ code, repeat: false, preventDefault() {} }); };
const keyUp = code => { for (const fn of listeners.keyup || []) fn({ code }); };

(async () => {
  for (let i = 0; i < 300 && G_("G.screen") === "boot"; i++) await sleep(10);
  G_("Quest.start('wukong', 'normal')");
  if (G_("G.screen") !== "quest") throw new Error("quest not started");
  const phase = () => G_("Quest.st.phase");
  const talkThrough = () => { for (let i = 0; i < 12 && phase() === "talk"; i++) { press("KeyJ"); step(2); } };

  for (let level = 0; level < 3; level++) {
    console.log(`-- level ${level}: ${G_("Quest.LEVELS[Quest.st.level].name")}`);
    talkThrough();
    if (phase() !== "walk") throw new Error("no walk after intro, phase=" + phase());
    let guard = 0;
    keyDown("KeyD");
    while (guard++ < 3000) {
      step(6);
      const ph = phase();
      if (guard % 400 === 0) console.log(`   [dbg] g=${guard} ph=${ph} px=${Math.round(G_("Quest.st.player.x"))} wave=${G_("Quest.st.waveIdx")} enemies=${G_("Quest.st.enemies.length")} wd=${G_("Quest.st.wavesDone")} boss=${G_("!!Quest.st.boss")} L=${G_("Quest.st.level")}`);
      if (ph === "over") { // 阵亡 -> 重试本关(顺带覆盖 retry 路径)
        console.log("   [dbg] player died -> retry level");
        press("KeyJ"); step(4);
        talkThrough();
        keyDown("KeyD");
        continue;
      }
      G_("Quest.st.player.hp = Math.max(Quest.st.player.hp, 60)"); // 逻辑探针: 防围殴死循环
      if (ph === "fight" || ph === "bossfight") {
        keyUp("KeyD");
        // 无头速胜: 直接压血(逻辑探针, 验证波次/KO/推进链, 不测手感)
        G_("Quest.st.enemies.forEach(e => { if (!e.dead) e.hp = 1; })");
        // 玩家贴脸挥拳直至清场
        let f = 0;
        while ((phase() === "fight" || phase() === "bossfight") && f++ < 900) {
          G_("(() => { const p = Quest.st.player, es = Quest.st.enemies.filter(e => !e.dead); if (es.length) { p.x = Math.max(STAGE.left + 10, es[0].x - 60); p.facing = es[0].x >= p.x ? 1 : -1; } })()");
          press("KeyJ");
          step(6);
          G_("Quest.st.enemies.forEach(e => { if (!e.dead) e.hp = Math.min(e.hp, 1); })");
        }
        if (f >= 900) throw new Error("fight stuck at level " + level);
        keyDown("KeyD");
      }
      if (ph === "talk") {
        keyUp("KeyD");
        const isBossTalk = G_("Quest.st.talkNext") === "bossfight";
        talkThrough();
        if (isBossTalk) { keyDown("KeyD"); continue; }
        break; // outro -> nextlevel/clear handled
      }
      if (ph === "clear") break;
    }
    keyUp("KeyD");
    if (guard >= 3000) throw new Error("level walk stuck " + level);
    if (phase() === "clear") break;
  }
  if (phase() !== "clear") throw new Error("no clear, phase=" + phase());
  console.log("kills:", G_("Quest.st.kills"), "| player hp:", G_("Quest.st.player.hp"));
  press("KeyJ"); step(2);
  if (G_("G.screen") !== "title") throw new Error("clear -> title failed");
  console.log("STAGE restored:", G_("STAGE.left"), G_("STAGE.right"));
  if (G_("STAGE.left") !== 60 || G_("STAGE.right") !== 964) throw new Error("STAGE not restored");
  // 回归: 闯关后正常对战不受污染
  G_("startMatch('mack', 'kenji', 'normal', true, false, false, true)");
  let t = 0;
  while (G_("G.screen") === "fight" && t < 40000) { step(200); t += 200; }
  if (G_("G.screen") !== "result") throw new Error("post-quest match broken");
  console.log("post-quest 1v1 OK, winner:", G_("G.result.winner.c.id"));
  console.log("QUEST PROBE: ALL OK");
})().catch(e => { console.error("QUEST FAIL:", e.message); process.exit(1); });
