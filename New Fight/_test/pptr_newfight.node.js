/* New Fight M2 · 真实浏览器验收
   覆盖: 标题3项菜单 / ARCADE五人梯队(真实打进NEXT) / VS机制专项
   (蹲跳冲刺/防御减伤/连段/气槽/必杀投射物) / TRAINING(木桩回血/出招表/超必杀) */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('C:\\留存\\Game Now\\MOBA\\Fable 5 MAX\\node_modules\\puppeteer-core');
const HTML = 'C:\\留存\\Game Now\\soul-blade-plus\\New Fight\\index.html';
const SHOTS = 'C:\\留存\\Game Now\\soul-blade-plus\\New Fight\\_test\\shots';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = e => `(() => { try { return (${e}); } catch (err) { return '__E__' + err.message; } })()`;
let pass = 0, fail = 0;
const note = (ok, name, extra) => { console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' | ' + extra : '')); ok ? pass++ : fail++; };

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const cons = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) cons.push(m.type() + ':' + m.text()); });
  page.on('pageerror', e => cons.push('pageerror:' + String(e).slice(0, 200)));
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  const st = e => page.evaluate(S(e));
  const tap = async (c, hold = 40, after = 120) => { await page.keyboard.down(c); await sleep(hold); await page.keyboard.up(c); await sleep(after); };
  const shot = async name => { await page.screenshot({ path: path.join(SHOTS, name + '.png') }); console.log('  shot', name); };
  const waitS = async (expr, desc, ms = 10000) => {
    const t0 = Date.now();
    for (;;) {
      if ((await st(expr)) === true) return true;
      if (Date.now() - t0 > ms) { console.log('  !! timeout', desc, 'last=', JSON.stringify(await st(expr))); return false; }
      await sleep(90);
    }
  };
  /* 逼近+攻击一轮 (P1) */
  const brawl = async () => {
    const gap = await st('Fight.F.p[1].x - Fight.F.p[0].x');
    if (Math.abs(gap) > 85) { const d = gap > 0 ? 'KeyD' : 'KeyA'; await page.keyboard.down(d); await sleep(Math.min(380, Math.abs(gap) * 2)); await page.keyboard.up(d); }
    await tap(Math.random() < 0.3 ? 'KeyK' : 'KeyJ', 35, 110);
  };
  /* 等待回到 play 相 (round/go/ko 过场自动等) */
  const waitPlay = async () => waitS("Fight.F.phase === 'play'", 'play相', 15000);

  /* ============ 1. 标题 (三项菜单) ============ */
  note(await waitS("typeof G !== 'undefined' && G.screen === 'title'", 'boot'), '加载与标题');
  await sleep(1800); await shot('01-标题');
  await tap('KeyS'); await tap('KeyS');
  note((await st('G.titleSel')) === 2, '菜单三项循环到 TRAINING', 'sel=' + (await st('G.titleSel')));
  await tap('KeyS');
  note((await st('G.titleSel')) === 0, '菜单回绕到 ARCADE');

  /* ============ 2. ARCADE 五人梯队 ============ */
  await tap('KeyJ');
  note(await waitS("G.screen === 'select'", 'sel'), '进入选人');
  await sleep(400);
  await tap('KeyJ');   // 1P 确认 mack(0)
  note(await waitS("G.screen === 'fight'", 'arc fight', 9000), 'CPU 跑马灯选完进战斗');
  note((await st('Fight.F.ladder !== null && Fight.F.ladder.order.length === 5')) === true, '五人梯队已组装', 'tiers=' + (await st('Fight.F.ladder && Fight.F.ladder.tiers.join()')));
  note((await st("Fight.F.p[1].aiTier === 'easy'")) === true, '首战 AI 档=easy');
  await shot('02-ARCADE-ROUND1');
  await waitS("Fight.F.phase === 'play'", 'play', 6000);
  /* 真实打赢两回合到 NEXT 插幕 */
  const tA = Date.now();
  let sawNext = false;
  while (Date.now() - tA < 180000) {
    const ph = await st('Fight.F.phase');
    if (ph === 'next') { sawNext = true; break; }
    if (ph === 'gameover') break;
    if (ph === 'play') await brawl(); else await sleep(250);
  }
  note(sawNext, 'STAGE1 真实获胜→NEXT 插幕', 'phase=' + (await st('Fight.F.phase')));
  await sleep(400); await shot('03-ARCADE-NEXT插幕');
  note(await waitS('Fight.F.ladder && Fight.F.ladder.idx === 1', 'stage2', 8000), '梯队推进到 STAGE2');
  note((await st("Fight.F.p[1].aiTier === 'easy'")) === true, 'STAGE2 AI 档正确(easy)');
  await waitS("Fight.F.phase === 'round' || Fight.F.phase === 'play'", 's2 round', 6000);
  await shot('04-ARCADE-STAGE2');
  await tap('Escape');
  note(await waitS("G.screen === 'title'", 'esc1'), 'ESC 退出梯队回标题');

  /* ============ 3. VS 机制专项 ============ */
  await tap('KeyS'); await tap('KeyJ');   // VS MODE
  note(await waitS("G.screen === 'select'", 'vs sel'), 'VS 进选人');
  await tap('KeyJ'); await tap('Comma');  // p1=mack(0) p2=ayame(1)
  note(await waitS("G.screen === 'fight' && Fight.F.ladder === null", 'vs fight', 8000), 'VS 进战斗(无梯队)');
  await waitS("Fight.F.phase === 'play'", 'vs play', 6000);
  /* 下蹲 */
  await page.keyboard.down('KeyS'); await sleep(220);
  note((await st("Fight.F.p[0].st === 'crouch'")) === true, '下蹲状态机');
  await page.keyboard.up('KeyS');
  /* 跳跃 */
  await tap('KeyW', 40, 60);
  let sawAir = false;
  for (let i = 0; i < 12; i++) { if ((await st('Fight.F.p[0].y < -10')) === true) { sawAir = true; break; } await sleep(60); }
  note(sawAir, '跳跃离地');
  await sleep(900);
  /* 冲刺 (双击D) */
  await tap('KeyD', 30, 50); await page.keyboard.down('KeyD'); await sleep(30);
  let sawDash = false;
  for (let i = 0; i < 8; i++) { if ((await st("Fight.F.p[0].st === 'dash'")) === true) { sawDash = true; break; } await sleep(40); }
  await page.keyboard.up('KeyD');
  note(sawDash, '双击冲刺');
  /* 防御(先测, 避免血量提前打空): P2 按住后方向, P1 轻击 → block 且不掉血 */
  await waitPlay();
  const hp2a = await st('Fight.F.p[1].hp');
  await page.keyboard.down('ArrowRight');   // P2 在右侧, 面朝左, 后=右
  let sawBlock = false;
  for (let r = 0; r < 12 && !sawBlock; r++) {
    if ((await st("Fight.F.phase !== 'play'")) === true) { await waitPlay(); }
    const gap = await st('Fight.F.p[1].x - Fight.F.p[0].x');
    if (Math.abs(gap) > 80) { const d = gap > 0 ? 'KeyD' : 'KeyA'; await page.keyboard.down(d); await sleep(Math.min(300, Math.abs(gap) * 2)); await page.keyboard.up(d); }
    await page.keyboard.down('KeyJ'); await sleep(35); await page.keyboard.up('KeyJ');
    for (let i = 0; i < 8; i++) { if ((await st("Fight.F.p[1].st === 'block'")) === true) { sawBlock = true; break; } await sleep(40); }
  }
  const hp2b = await st('Fight.F.p[1].hp');
  await page.keyboard.up('ArrowRight');
  note(sawBlock, '后拉防御成立(block 状态)');
  note(hp2b === hp2a, '防御普通攻击零掉血', `${hp2a}->${hp2b}`);
  await shot('05-VS-防御');
  /* 命中 → 气槽 */
  const t3 = Date.now();
  let sawHit = false;
  while (Date.now() - t3 < 30000) {
    if ((await st('Fight.F.p[1].hp < 100 && Fight.F.p[1].hp > 0')) === true) { sawHit = true; break; }
    if ((await st("Fight.F.phase !== 'play'")) === true) { await waitPlay(); continue; }
    await brawl();
  }
  note(sawHit, 'P1 真实命中');
  note((await st('Fight.F.p[0].meter > 0')) === true, '攻击积气', 'meter=' + (await st('Math.round(Fight.F.p[0].meter)')));
  /* 连段: 轻击命中取消重击 */
  let sawCombo = false;
  for (let r = 0; r < 14 && !sawCombo; r++) {
    if ((await st("Fight.F.phase !== 'play'")) === true) { await waitPlay(); continue; }
    const gap = await st('Fight.F.p[1].x - Fight.F.p[0].x');
    if (Math.abs(gap) > 80) { const d = gap > 0 ? 'KeyD' : 'KeyA'; await page.keyboard.down(d); await sleep(Math.min(360, Math.abs(gap) * 2)); await page.keyboard.up(d); }
    await page.keyboard.down('KeyJ'); await sleep(35); await page.keyboard.up('KeyJ');
    await sleep(120);                       // 轻击命中窗口内
    await page.keyboard.down('KeyK'); await sleep(35); await page.keyboard.up('KeyK');
    for (let i = 0; i < 10; i++) { if ((await st('Fight.F.p[0].combo >= 2')) === true) { sawCombo = true; break; } await sleep(50); }
    await sleep(450);
  }
  note(sawCombo, '连段取消(轻→重, combo>=2)');
  await shot('06-VS-连段');
  /* 必杀投射物 (mack 剑波) */
  await tap('KeyU', 40, 100);
  let sawProj = false;
  for (let i = 0; i < 14; i++) { if ((await st('Fight.F.projs.length > 0')) === true) { sawProj = true; await shot('07-VS-剑波投射物'); break; } await sleep(60); }
  note(sawProj, '必杀U生成投射物(斩月剑波)');
  await tap('Escape');
  note(await waitS("G.screen === 'title'", 'esc2'), 'VS ESC 回标题');

  /* ============ 4. TRAINING 训练场 + 超必杀 ============ */
  await tap('KeyS'); await tap('KeyS'); await tap('KeyJ');   // TRAINING
  note(await waitS("G.screen === 'select'", 'tr sel'), 'TRAINING 进选人');
  await tap('KeyS'); await tap('KeyJ');       // 1P = kuro? p1 从0: S→2(kuro) 确认
  await sleep(300);
  await tap('KeyD'); await tap('KeyJ');       // 木桩: 光标继续 WASD → 确认
  note(await waitS("G.screen === 'fight' && Fight.F.training === true", 'tr fight', 8000), '训练场启动(木桩模式)');
  await waitS("Fight.F.phase === 'play'", 'tr play', 6000);
  await tap('KeyH', 40, 200);
  note((await st('Fight.F.showMoves === true')) === true, 'H 打开出招表');
  await shot('08-训练-出招表');
  await tap('KeyH', 40, 200);
  /* 木桩回血 */
  const tHit = Date.now();
  while (Date.now() - tHit < 15000) { if ((await st('Fight.F.p[1].hp < 100')) === true) break; await brawl(); }
  const hpDrop = await st('Fight.F.p[1].hp');
  await sleep(2600);                          // 90帧脱战后回血
  const hpRegen = await st('Fight.F.p[1].hp');
  note(hpDrop < 100 && hpRegen > hpDrop, '木桩脱战回血', `${hpDrop}->${hpRegen}`);
  /* 攒气到 MAX → 超必杀 */
  const t4 = Date.now();
  while (Date.now() - t4 < 90000) {
    if ((await st('Fight.F.p[0].meter >= 100')) === true) break;
    if ((await st("Fight.F.phase !== 'play'")) === true) { await sleep(400); continue; }
    await brawl();
  }
  note((await st('Fight.F.p[0].meter >= 100')) === true, '气槽攒满 MAX', 'meter=' + (await st('Math.round(Fight.F.p[0].meter)')));
  /* 释放超必杀: 等 P1 回到自由态再按 I, 最多重试 6 次 */
  let sawSuper = false, hpBeforeSuper = 100;
  for (let r = 0; r < 6 && !sawSuper; r++) {
    await waitS("Fight.F.phase === 'play' && ['idle','walk'].includes(Fight.F.p[0].st)", 'p1 idle', 6000);
    hpBeforeSuper = await st('Fight.F.p[1].hp');
    await tap('KeyI', 40, 80);
    for (let i = 0; i < 16; i++) { if ((await st('Fight.F.superFx !== null')) === true) { sawSuper = true; break; } await sleep(60); }
  }
  note(sawSuper, '超必杀释放(superFx 时间轴)');
  await sleep(500); await shot('09-训练-超必杀演出');
  await waitS('Fight.F.superFx === null', 'super end', 6000);
  const hpAfterSuper = await st('Fight.F.p[1].hp');
  note(hpAfterSuper < hpBeforeSuper, '超必杀真实伤害', `${hpBeforeSuper}->${hpAfterSuper}`);
  note((await st('Fight.F.p[0].meter < 100')) === true, '超必杀清空气槽');
  await shot('10-训练-超杀后');
  await tap('Escape');
  note(await waitS("G.screen === 'title'", 'esc3'), '训练场 ESC 回标题');

  note(cons.length === 0, 'console 零异常', cons.slice(0, 3).join(' ; '));
  console.log(`==== DONE: ${pass} pass / ${fail} fail ====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('RUNNER FAIL:', e.message); process.exit(2); });
