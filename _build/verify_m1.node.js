// M1 P0 verify: every asset path the engine actually requests must resolve
// through the built file's own resolveEmbeddedAsset — zero fallback.
const fs = require("fs");
const vm = require("vm");

const P = "C:\\留存\\Game Now\\soul-blade-plus\\发布\\刀魂PLUS-M1-优化版.html";
const src = fs.readFileSync(P, "utf8");
console.log("file:", (fs.statSync(P).size / 1048576).toFixed(1), "MB");

const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const b of blocks) new vm.Script(b.replace(/<\\\/script>/g, "</script>"));
console.log("script blocks parse OK:", blocks.length);

// build sandbox with the real map + real resolver from the artifact
const sandbox = { window: { ASSETS_B64: {} }, Object, console, URL, location: { href: "file:///C:/x/game.html" }, decodeURIComponent, setTimeout };
vm.createContext(sandbox);
for (const b of blocks) {
  if (b.includes("Object.assign(window.ASSETS_B64")) vm.runInContext(b, sandbox);
  if (b.includes("resolveEmbeddedAsset = function")) {
    vm.runInContext(b.slice(0, b.indexOf("const __NativeImage")), sandbox); // resolver only
  }
}
const R = u => vm.runInContext(`window.resolveEmbeddedAsset(${JSON.stringify(u)})`, sandbox);
const keys = Object.keys(sandbox.window.ASSETS_B64);
console.log("embedded assets:", keys.length);

// 1) the exact request shapes the engine makes
const uiJs = fs.readFileSync("C:\\留存\\Game Now\\soul-blade-plus\\js\\ui.js", "utf8");
const uiFiles = [...new Set([...uiJs.matchAll(/'([a-z0-9\-]+\.png)'/g)].map(m => m[1]))]
  .filter(f => !["title-kanban.png", "title-gunsen.png", "title-torii.png", "announce-brush-slim.png"].includes(f));
let miss = [];
for (const f of uiFiles) {
  const req = "/assets/ui-lab/" + f.replace(/\.png$/, ".webp"); // real _loadImg shape
  if (!R(req)) miss.push(req);
}
console.log(`ui-lab webp requests: ${uiFiles.length}, unresolved: ${miss.length}`, miss.slice(0, 4));
if (miss.length) throw new Error("ui-lab misses");

// 2) sprite sheets from DATA + roster
const dataJs = fs.readFileSync("C:\\留存\\Game Now\\soul-blade-plus\\js\\data.js", "utf8")
  + fs.readFileSync("C:\\留存\\Game Now\\soul-blade-plus\\js\\roster.js", "utf8");
const chars = [...dataJs.matchAll(/dir:\s*'([^']+)'[\s\S]*?anims:\s*\{([\s\S]*?)\n\s{4}\}/g)];
let sheetN = 0; miss = [];
for (const [, dir, block] of chars) {
  for (const m of block.matchAll(/file:\s*'([^']+)'/g)) {
    sheetN++;
    if (!R(`${dir}/${m[1]}`)) miss.push(`${dir}/${m[1]}`);
  }
}
console.log(`sprite sheets: ${sheetN}, unresolved: ${miss.length}`, miss.slice(0, 4));
if (miss.length) throw new Error("sheet misses");

// 3) fx sheets + bgm + fonts + bg
for (const p of ["assets/img/mh3/Attack1.png", "assets/img/fxcres/kenji-a1.png",
  "assets/audio/bgm/battle-1.mp3", "assets/audio/bgm/select-3.mp3", "assets/audio/bgm/result-1.mp3",
  "assets/img/background.png", "assets/img/shop.png"]) {
  if (!R(p)) throw new Error("miss: " + p);
}
console.log("fx/bgm/bg resolve OK");

// 4) resolver edge cases per spec
const edge = [
  ["/assets/ui-lab/portrait-kenji-sel.webp", true],
  ["assets/ui-lab/portrait-kenji-sel.png", true],          // png->webp fallback
  ["http://localhost/assets/ui-lab/keycap.webp?v=9#x", true],
  ["./assets/img/mack/Idle.png", true],
  ["/assets/ui-lab/title-kanban.webp", false],             // dropped debug variant
  ["https://evil.example/steal.png", false],
];
for (const [u, want] of edge) {
  const got = !!R(u);
  if (got !== want) throw new Error(`edge case ${u}: got ${got}`);
}
console.log("resolver edge cases OK");

// 5) no ui-lab png double-embedding (size discipline)
const pngUi = keys.filter(k => k.startsWith("assets/ui-lab/") && k.endsWith(".png"));
if (pngUi.length) throw new Error("ui-lab png embedded: " + pngUi.length);
console.log("no double-embedded ui-lab png · webp count:", keys.filter(k => k.endsWith(".webp")).length);

console.log("\nM1 P0 VERIFY: ALL OK");
