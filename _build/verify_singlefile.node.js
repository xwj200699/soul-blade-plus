// Verify the single-file build: script blocks parse, asset map complete,
// every engine-referenced asset path resolvable, shim present.
const fs = require("fs");
const vm = require("vm");

const P = "C:\\留存\\Game Now\\soul-blade-plus\\发布\\刀魂PLUS-M0-单文件版.html";
const src = fs.readFileSync(P, "utf8");
console.log("size:", (src.length / 1048576).toFixed(1), "MB chars");

const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log("script blocks:", blocks.length);

// 1) all blocks must parse (game code has the </script> escape applied)
let mapBlocks = 0, gameBlocks = 0;
for (const b of blocks) {
  new vm.Script(b.replace(/<\\\/script>/g, "</script>")); // throws on syntax error
  if (b.includes("Object.assign(window.ASSETS_B64")) mapBlocks++;
  if (b.includes("===== js/")) gameBlocks++;
}
console.log("syntax OK · asset-map chunks:", mapBlocks, "· game modules:", gameBlocks);
if (gameBlocks !== 12) throw new Error("game module count " + gameBlocks);

// 2) reconstruct the asset map and check coverage
const sandbox = { window: { ASSETS_B64: {} }, Object };
vm.createContext(sandbox);
for (const b of blocks) if (b.includes("ASSETS_B64")) {
  if (b.includes("Object.assign")) vm.runInContext(b, sandbox);
}
const keys = Object.keys(sandbox.window.ASSETS_B64);
console.log("asset keys:", keys.length);
if (keys.length < 95) throw new Error("asset map too small");
let badVal = 0;
for (const k of keys) if (!sandbox.window.ASSETS_B64[k].startsWith("data:")) badVal++;
if (badVal) throw new Error(badVal + " non-data values");

// 3) every path the engine references must be in the map
const need = [];
for (const f of ["data", "roster", "ui", "audio", "sprites"]) {
  const js = fs.readFileSync(`C:\\留存\\Game Now\\soul-blade-plus\\js\\${f}.js`, "utf8");
  for (const m of js.matchAll(/assets\/[A-Za-z0-9_\-./ ]+?\.(png|mp3|ttf|woff2)/g)) need.push(m[0]);
  // dir-based sheets: DATA anims combine c.dir + file — handled below
}
const dataJs = fs.readFileSync("C:\\留存\\Game Now\\soul-blade-plus\\js\\data.js", "utf8") +
  fs.readFileSync("C:\\留存\\Game Now\\soul-blade-plus\\js\\roster.js", "utf8");
const dirs = [...dataJs.matchAll(/dir:\s*'([^']+)'/g)].map(m => m[1]);
const files = [...dataJs.matchAll(/file:\s*'([^']+\.png)'/g)].map(m => m[1]).filter(f => !f.startsWith("assets/"));
for (const d of dirs) for (const f of files) need.push(`${d}/${f}`);   // superset; filter to existing keys below
const keySet = new Set(keys);
const missing = [...new Set(need)].filter(p => !keySet.has(p) &&
  // dir×file cross-product creates combos that don't belong to that char — only flag if NO dir has it
  !dirs.some(d => keySet.has(`${d}/${p.split("/").pop()}`)));
console.log("referenced-asset coverage: missing =", missing.length, missing.slice(0, 5));
if (missing.length) throw new Error("missing assets in map");

// 4) shim + ui-lab loads (ui.js references bare filenames joined with assets/ui-lab/)
if (!src.includes("window.Image = function Image()")) throw new Error("Image shim missing");
if (!src.includes("window.fetch = function")) throw new Error("fetch shim missing");
const uilab = keys.filter(k => k.startsWith("assets/ui-lab/"));
console.log("ui-lab assets in map:", uilab.length);
if (uilab.length < 30) throw new Error("ui-lab incomplete");

// 5) css fonts inlined
const cssSeg = src.slice(src.indexOf("<style>"), src.indexOf("</style>"));
if (/url\((?!data:)/.test(cssSeg)) throw new Error("css has non-inlined urls");
console.log("css fonts inlined OK");

console.log("\nSINGLE-FILE VERIFY: ALL OK");
