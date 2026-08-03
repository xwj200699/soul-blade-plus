/* 刀魂PLUS M1.1 — real-browser acceptance runner.
   puppeteer-core + system Edge (new headless = real Chromium render pipeline).
   Rules per M1.1 Prompt:
   - Opens the FINAL single-file HTML (发布/刀魂PLUS-M1.1-修复版.html) via file://
   - All game input goes through REAL keyboard events (CDP Input domain).
   - page.evaluate is READ-ONLY: state sync + assertions, never injects logic.
   - Screenshots saved to 文档/刀魂PLUS-M1.1-测试截图/ as evidence.
   - Collects every console error/warning + pageerror + failed request. */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('C:\\留存\\Game Now\\MOBA\\Fable 5 MAX\\node_modules\\puppeteer-core');

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const HTML = 'C:\\留存\\Game Now\\soul-blade-plus\\发布\\血刃-M1.2-优化版.html';
const OUT = 'C:\\留存\\Game Now\\soul-blade-plus\\文档\\血刃-M1.2-测试截图';

const results = [];
const consoleLog = [];
let curStep = 'init';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function note(ok, name, detail = '') {
  results.push({ step: curStep, check: name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'} · [${curStep}] ${name}${detail ? ' — ' + detail : ''}`);
}

/* ---------- page plumbing ---------- */
function hookLogs(page) {
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning') {
      consoleLog.push({ step: curStep, type: t, text: m.text().slice(0, 400) });
    }
  });
  page.on('pageerror', e => consoleLog.push({ step: curStep, type: 'pageerror', text: String(e).slice(0, 400) }));
  page.on('requestfailed', r => consoleLog.push({
    step: curStep, type: 'requestfailed',
    text: r.url().slice(0, 160) + ' :: ' + ((r.failure() || {}).errorText || '?'),
  }));
}

async function newGamePage(browser, query = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  hookLogs(page);
  await page.goto(pathToFileURL(HTML).href + query, { waitUntil: 'load', timeout: 120000 });
  return page;
}

/* read-only state probe */
const S = expr => `(() => { try { return (${expr}); } catch (e) { return '__ERR__:' + e.message; } })()`;
const st = (page, expr) => page.evaluate(S(expr));

async function waitState(page, expr, desc, timeout = 10000) {
  const t0 = Date.now();
  for (;;) {
    const v = await st(page, expr);
    if (v === true) return;
    if (Date.now() - t0 > timeout) throw new Error(`timeout: ${desc} (last=${JSON.stringify(v)})`);
    await sleep(120);
  }
}

async function tap(page, code, hold = 45, after = 140) {
  await page.keyboard.down(code);
  await sleep(hold);
  await page.keyboard.up(code);
  await sleep(after);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('  · shot ' + name);
}

/* ---------- game-flow helpers (real input only) ---------- */
async function wake(page) {
  await waitState(page, "typeof G !== 'undefined' && G.screen === 'title'", 'boot → title', 90000);
  await tap(page, 'Space', 40, 250); // press-any-key gate + audio unlock
  await waitState(page, 'G.titleStarted === true && G.titleIntro >= 30', 'title intro done', 6000);
  await sleep(400);
}

async function menuTo(page, idx) {
  const cur = await st(page, 'G.titleSel');
  const n = (((idx - cur) % 4) + 4) % 4;
  for (let i = 0; i < n; i++) await tap(page, 'KeyS');
  const now = await st(page, 'G.titleSel');
  if (now !== idx) throw new Error(`titleSel ${now} != ${idx}`);
}

async function ensureTitle(page) {
  for (let i = 0; i < 7; i++) {
    if ((await st(page, "G.screen === 'title'")) === true) return;
    await tap(page, 'Escape', 45, 320);
  }
  await waitState(page, "G.screen === 'title'", 'recover to title', 3000);
}

/* P1 walk-then-strike cycles: mashing nonstop keeps the fighter in attack
   recovery forever and he never re-closes knockback gaps — so walk in while
   far, strike when near (a human does exactly this). */
async function p1CloseGap(page, maxMs = 1100, near = 115) {
  const gap = await st(page, 'G.fighters.length === 2 ? G.fighters[1].x - G.fighters[0].x : 0');
  const dir = gap >= 0 ? 'KeyD' : 'KeyA';
  if (Math.abs(gap) <= near) return;
  await page.keyboard.down(dir);
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const g2 = await st(page, 'G.fighters.length === 2 ? Math.abs(G.fighters[1].x - G.fighters[0].x) : 0');
    if (g2 <= near) break;
    await sleep(60);
  }
  await page.keyboard.up(dir);
}

async function p1Burst(page, ms) {
  const end = Date.now() + ms;
  let i = 0;
  while (Date.now() < end) {
    await p1CloseGap(page);
    await tap(page, i % 3 === 2 ? 'KeyK' : 'KeyJ', 35, 120);
    i++;
  }
}

/* both players prove real simultaneous input in clean alternating windows:
   converge together, then P2-only attacks (P1 stands unguarded), then P1-only
   attacks (P2 stands unguarded), then a live trade for the screenshot frame.
   Mashing both at once just lets the faster startup stuff the other forever. */
async function duoExchange(page) {
  await page.keyboard.down('KeyD');       // P1 →
  await page.keyboard.down('ArrowLeft');  // P2 ←
  await sleep(1400);                      // converge (both move simultaneously)
  await page.keyboard.up('KeyD');
  let end = Date.now() + 1800;            // P2 window: P1 stands unguarded
  while (Date.now() < end) await tap(page, 'Numpad1', 35, 130);
  await page.keyboard.up('ArrowLeft');
  end = Date.now() + 2600;                // P1 window: walk in + strike
  while (Date.now() < end) {
    await p1CloseGap(page, 900);
    await tap(page, 'KeyJ', 35, 130);
  }
  end = Date.now() + 1100;                // live trade for the screenshot
  while (Date.now() < end) { await tap(page, 'KeyJ', 35, 50); await tap(page, 'Numpad1', 35, 50); }
}

/* P1 grinds an idle human P2 down two rounds until the result screen.
   Mostly light-chain pressure: lights don't knock down, so no down/getup
   i-frame downtime; supers fire whenever meter allows. */
async function grindToResult(page, timeoutMs = 300000) {
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < timeoutMs) {
    const snap = await st(page, "G.screen + ':' + G.phase");
    if (typeof snap === 'string' && snap.startsWith('result')) return true;
    // hands off outside live rounds: a J buffered into the 180ms input buffer
    // at match end would land on the result screen and instantly rematch
    if (snap !== 'fight:fight') { await sleep(220); continue; }
    await p1CloseGap(page);
    await tap(page, i % 4 === 3 ? 'KeyK' : 'KeyJ', 35, 100);
    if (i % 6 === 5) await tap(page, 'KeyI', 35, 55); // super when meter allows
    i++;
  }
  return false;
}

async function approach(page, dist, ms) {
  await p1CloseGap(page, ms, dist);
  await sleep(140);
}

/* M1.2: trigger a super (training = infinite P1 meter) and take a TRIPLE shot
   of the redesigned cine: ①启动(架势/蓄力) ②中段(2+ hits, 光束/箭雨/棍舞全开)
   ③终结(崩飞+爆发余韵). All via real keyboard; evaluate() read-only. */
async function fireSuper(page, base) {
  let seen = false;
  for (let attempt = 0; attempt < 3 && !seen; attempt++) {
    await approach(page, attempt === 0 ? 130 : 100, 5000);
    await tap(page, 'KeyI', 40, 40);
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      if ((await st(page, '!!(G.fighters[0] && G.fighters[0].superSeq)')) === true) { seen = true; break; }
      if ((await st(page, "G.fighters[0].state === 'idle' && !G.fighters[0].move")) === true &&
          Date.now() - t0 > 1200) break; // whiffed & recovered — retry closer
      await sleep(40);
    }
  }
  if (seen) {
    await shot(page, base + '-1启动');
    const t1 = Date.now();
    while (Date.now() - t1 < 2500) {
      const done = await st(page, 'G.fighters[0].superSeq ? G.fighters[0].superSeq.done : 99');
      if (done === 99 || done >= 2) break; // mid-spectacle
      await sleep(40);
    }
    await shot(page, base + '-2中段');
    const t2 = Date.now();
    while (Date.now() - t2 < 3200) {
      if ((await st(page, '!G.fighters[0].superSeq')) === true) break;
      await sleep(40);
    }
    await sleep(200); // 崩飞中 + 终结特效余韵
    await shot(page, base + '-3终结');
  }
  const dmg = await st(page, 'G.fighters[1].maxHp - G.fighters[1].hp');
  return { seen, dmg };
}

/* =================================================================== */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const EDGE = EDGE_CANDIDATES.find(p => fs.existsSync(p));
  if (!EDGE) throw new Error('Edge not found');
  const htmlSize = fs.statSync(HTML).size;
  console.log(`html: ${HTML} (${(htmlSize / 1048576).toFixed(1)} MB)`);
  console.log(`edge: ${EDGE}`);

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true, // new headless: real Chromium rendering + real input pipeline
    args: [
      '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb',
      '--autoplay-policy=no-user-gesture-required', '--window-size=1280,800',
    ],
  });
  const env = {
    browser: await browser.version(),
    node: process.version,
    date: new Date().toISOString(),
    html: path.basename(HTML),
    htmlBytes: htmlSize,
    input: 'CDP real keyboard events only; evaluate() read-only',
  };
  console.log('browser:', env.browser);

  try {
    /* ================= PAGE A: full menu-driven flows ================= */
    const page = await newGamePage(browser);

    curStep = '01-标题';
    await wake(page);
    const t1 = await st(page, 'G.tick');
    await sleep(700);
    const t2 = await st(page, 'G.tick');
    note(t2 > t1 + 20, '真实浏览器主循环运行', `tick ${t1} → ${t2}`);
    if (!(t2 > t1 + 20)) throw new Error('rAF stalled in headless — abort');
    await shot(page, '01-标题-四菜单');
    for (let i = 0; i < 4; i++) await tap(page, 'KeyS');
    note((await st(page, 'G.titleSel')) === 0, '标题菜单四项循环导航', 'S×4 回到 0');

    /* ---- VS CPU full flow ---- */
    curStep = '02-VSCPU选角';
    await menuTo(page, 0);
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'select' && G.select.phase === 'char' && !G.select.localvs", 'cpu char select');
    await tap(page, 'KeyD'); await tap(page, 'KeyD'); // → ayame
    note((await st(page, "ROSTER[G.select.cursor] === 'ayame'")) === true, 'P1 光标移动', 'cursor→ayame');
    note((await st(page, 'ROSTER.length === 6')) === true, '花名册 6 人', '');
    await sleep(300);
    await shot(page, '02-选人-P1六人网格');
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'stage'", 'stage phase');
    curStep = '03-舞台选择';
    await tap(page, 'KeyD'); // → 霓虹都市
    await sleep(250);
    await shot(page, '03-舞台选择');
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'diff'", 'diff phase (CPU only)');
    curStep = '04-难度选择';
    await sleep(200);
    await shot(page, '04-难度选择');
    await tap(page, 'KeyJ'); // NORMAL
    await waitState(page, "G.select.phase === 'vs'", 'vs splash');
    curStep = '05-VS页CPU';
    await sleep(650);
    await shot(page, '05-VS页-CPU');
    await waitState(page, "G.screen === 'fight'", 'fight starts', 9000);
    await waitState(page, "G.phase === 'fight'", 'round intro done', 9000);
    curStep = '06-VSCPU战斗';
    note((await st(page, 'G.p2IsAI === true && G.matchCfg.localvs === false')) === true, 'VSCPU 模式标志', 'p2IsAI=true');
    note((await st(page, "G.ai[1] && typeof G.ai[1].plan !== 'undefined'")) === true, 'CPU 挂真 AI 控制器', '');
    await p1Burst(page, 3500);
    await shot(page, '06-战斗-VSCPU-ayame');
    curStep = '07-暂停';
    await tap(page, 'Escape', 45, 380);
    note((await st(page, 'G.paused === true')) === true, '暂停进入', '');
    await shot(page, '07-暂停菜单');
    await tap(page, 'KeyJ', 45, 380);
    note((await st(page, 'G.paused === false')) === true, '暂停恢复(J 不串成攻击)', '');
    await tap(page, 'Escape', 45, 380);
    await tap(page, 'Escape', 45, 420);
    await waitState(page, "G.screen === 'title'", 'quit to title');

    /* ---- LOCAL VS full flow ---- */
    curStep = '08-LOCALVS-P2选角';
    await menuTo(page, 1);
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'select' && G.select.phase === 'char' && G.select.localvs === true", 'localvs char');
    await tap(page, 'KeyD'); await tap(page, 'KeyD'); await tap(page, 'KeyD'); // → wukong
    note((await st(page, "ROSTER[G.select.cursor] === 'wukong'")) === true, 'P1 选中 wukong', '');
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'char2'", 'char2 phase reachable');
    await tap(page, 'ArrowLeft'); await tap(page, 'ArrowLeft'); await tap(page, 'ArrowLeft'); // 4→1 kenji
    const c2 = await st(page, 'G.select.cursor2');
    note((await st(page, "ROSTER[G.select.cursor2] === 'kenji'")) === true, 'P2 独立光标(方向键)', 'cursor2=' + c2);
    await sleep(300);
    await shot(page, '08-选人-P2网格-LOCALVS');
    await tap(page, 'Numpad1');
    await waitState(page, "G.select.phase === 'stage'", 'P2 numpad confirm → stage');
    note(true, 'P2 小键盘1 确认', '');
    await tap(page, 'KeyD'); await tap(page, 'KeyD'); // → 王者峡谷
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'vs'", 'localvs skips diff → vs');
    curStep = '09-VS页LOCALVS';
    await sleep(650);
    await shot(page, '09-VS页-LOCALVS');
    await waitState(page, "G.screen === 'fight'", 'localvs fight', 9000);
    await waitState(page, "G.phase === 'fight'", 'round live', 9000);
    curStep = '10-双人战斗';
    note((await st(page, 'G.p2IsAI === false && G.matchCfg.localvs === true')) === true, 'LOCALVS 单源模式标志', 'p2IsAI=false');
    await duoExchange(page);
    const dmg = await st(page, 'G.fighters.map(f => Math.round(f.maxHp - f.hp))');
    note(Array.isArray(dmg) && dmg[0] > 0 && dmg[1] > 0, '双人同时输入均造成伤害', 'dmg=' + JSON.stringify(dmg));
    await shot(page, '10-战斗-双人LOCALVS');
    curStep = '11-双人打到结算';
    const gotResult = await grindToResult(page);
    note(gotResult, 'LOCALVS 两胜制打满到结算', gotResult ? 'winner=' + (await st(page, 'G.result.winner.c.id')) : 'timeout 300s');
    if (gotResult) { await sleep(450); await shot(page, '11-结算'); }
    await tap(page, 'Escape', 45, 420);
    await ensureTitle(page);

    /* ---- TRAINING + angela super ---- */
    curStep = '12-训练模式';
    await menuTo(page, 2);
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'select' && G.select.training === true", 'training select');
    await tap(page, 'KeyA'); // wrap 0 → 5 angela
    note((await st(page, "ROSTER[G.select.cursor] === 'angela'")) === true, '选人 A 键回绕到 angela', '');
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'stage'", 'training stage');
    await tap(page, 'KeyJ'); // 神社
    await waitState(page, "G.screen === 'fight' && G.mode === 'training'", 'training fight', 9000);
    await waitState(page, "G.phase === 'fight'", 'training live', 6000);
    const sup1 = await fireSuper(page, '12-超杀-angela激光');
    note(sup1.seen && sup1.dmg > 0, 'angela 奥特曼式激光放射(三连拍)', 'dummy lost ' + sup1.dmg + ' hp');
    await sleep(2600); // cine finishes
    await shot(page, '13-训练模式-DUMMY');
    note((await st(page, "G.mode === 'training'")) === true, '训练模式 HUD DUMMY 标签(见截图)', '');
    await tap(page, 'Escape', 45, 380);
    await tap(page, 'Escape', 45, 420);
    await ensureTitle(page);

    /* ---- HOW TO PLAY ---- */
    curStep = '14-HOWTO';
    await menuTo(page, 3);
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'controls'", 'howto screen');
    await sleep(900);
    await shot(page, '14-HOWTO-P1P2键位');
    await tap(page, 'KeyS'); await tap(page, 'KeyS');
    await sleep(700);
    await shot(page, '15-HOWTO-列表导航');
    await tap(page, 'KeyK', 45, 380);
    await waitState(page, "G.screen === 'title'", 'howto → title');
    note(true, 'HOWTO 进入/导航/K返回', '');

    /* ---- mode isolation after LOCAL VS ---- */
    curStep = '16-模式隔离';
    await menuTo(page, 0);
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'select' && !G.select.localvs", 'cpu select again');
    await tap(page, 'KeyJ'); // mack
    await waitState(page, "G.select.phase === 'stage'", 'stage');
    await tap(page, 'KeyJ');
    await waitState(page, "G.select.phase === 'diff'", 'diff');
    await tap(page, 'KeyJ');
    await waitState(page, "G.screen === 'fight'", 'cpu fight', 9000);
    await waitState(page, "G.phase === 'fight'", 'cpu live', 9000);
    const iso = await st(page, "G.p2IsAI === true && G.matchCfg.localvs === false && G.ai[1] && typeof G.ai[1].plan !== 'undefined'");
    note(iso === true, 'LOCALVS→标题→VSCPU 无模式污染', 'p2IsAI=true, 真AI');
    await sleep(600);
    await shot(page, '16-模式切换-CPU回归');
    await tap(page, 'Escape', 45, 380);
    await tap(page, 'Escape', 45, 420);
    await ensureTitle(page);
    note((await st(page, "document.getElementById('err').style.display !== 'block'")) === true, '全程无 ERROR 覆盖层', '');
    await page.close();

    /* ================= quick pages: six-char coverage + supers ================= */
    curStep = '17-mack对ayame';
    let p = await newGamePage(browser, '?fight&p1=mack&p2=ayame&ai=easy&ff=100');
    await waitState(p, "typeof G !== 'undefined' && G.screen === 'fight' && G.phase === 'fight'", 'quick fight A', 60000);
    await p1Burst(p, 2600);
    await shot(p, '17-战斗-mack-vs-ayame');
    note(true, 'mack vs ayame 实战', '');
    await p.close();

    curStep = '18-houyi对kenji';
    p = await newGamePage(browser, '?fight&p1=houyi&p2=kenji&ai=easy&ff=100');
    await waitState(p, "typeof G !== 'undefined' && G.screen === 'fight' && G.phase === 'fight'", 'quick fight B', 60000);
    await p1Burst(p, 2600);
    await shot(p, '18-战斗-houyi-vs-kenji');
    note(true, 'houyi vs kenji 实战', '');
    await p.close();

    curStep = '19-wukong超杀';
    p = await newGamePage(browser, '?fight&training&p1=wukong&p2=mack&ff=100');
    await waitState(p, "typeof G !== 'undefined' && G.screen === 'fight' && G.phase === 'fight'", 'training wukong', 60000);
    const sup2 = await fireSuper(p, '19-超杀-wukong棍舞');
    note(sup2.seen && sup2.dmg > 0, 'wukong 大聖乱舞 v2(三连拍)', 'dmg=' + sup2.dmg);
    await p.close();

    curStep = '20-houyi超杀';
    p = await newGamePage(browser, '?fight&training&p1=houyi&p2=mack&ff=100');
    await waitState(p, "typeof G !== 'undefined' && G.screen === 'fight' && G.phase === 'fight'", 'training houyi', 60000);
    const sup3 = await fireSuper(p, '20-超杀-houyi箭雨');
    note(sup3.seen && sup3.dmg > 0, 'houyi 真·漫天箭雨 v2(三连拍)', 'dmg=' + sup3.dmg);
    await p.close();
  } catch (e) {
    note(false, 'RUNNER ABORT', e.message);
    console.error(e.stack || e);
  } finally {
    const failed = results.filter(r => !r.ok);
    const report = { env, pass: results.length - failed.length, fail: failed.length, results, consoleLog };
    fs.writeFileSync(path.join(OUT, '_pptr_report.json'), JSON.stringify(report, null, 2));
    console.log(`\n==== DONE: ${report.pass} pass / ${report.fail} fail · console entries: ${consoleLog.length} ====`);
    for (const c of consoleLog.slice(0, 30)) console.log(`  [console:${c.type}] (${c.step}) ${c.text}`);
    await browser.close();
    process.exit(failed.length ? 1 : 0);
  }
})();
