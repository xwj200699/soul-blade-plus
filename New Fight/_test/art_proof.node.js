/* 美术校样: 六人 x 全姿态 图鉴网格截图 (快速目检迭代用) */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('C:\\留存\\Game Now\\MOBA\\Fable 5 MAX\\node_modules\\puppeteer-core');
const HTML = 'C:\\留存\\Game Now\\soul-blade-plus\\New Fight\\index.html';
const OUT = 'C:\\留存\\Game Now\\soul-blade-plus\\New Fight\\_test\\shots\\art_proof.png';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  await sleep(800);
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; }); // 停主循环
  await sleep(120);
  const ok = await page.evaluate(() => {
    try {
      const g = CX;
      g.fillStyle = '#3a2a3f'; g.fillRect(0, 0, 1024, 576);
      const poses = ['idle0', 'idle1', 'walk0', 'atk', 'atk2', 'hurt', 'block', 'crouch', 'win', 'ko'];
      g.imageSmoothingEnabled = false;
      CHARS.forEach((c, r) => {
        const bank = Baker.bank[c.id];
        g.fillStyle = '#ffe9a8'; g.font = 'bold 13px sans-serif'; g.textAlign = 'left';
        g.fillText(c.en, 6, 30 + r * 94);
        poses.forEach((p, i) => {
          let img;
          if (p === 'idle0') img = bank.idle[0]; else if (p === 'idle1') img = bank.idle[1];
          else if (p === 'walk0') img = bank.walk[0]; else img = bank[p];
          g.drawImage(img, 90 + i * 92, 4 + r * 94, 77, 90);
        });
        g.drawImage(bank.chip, 1024 - 52, 8 + r * 94, 44, 37);
      });
      g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif';
      ['idle0', 'idle1', 'walk', 'atk', 'atk2', 'hurt', 'block', 'crouch', 'win', 'ko'].forEach((p, i) => g.fillText(p, 96 + i * 92, 570));
      window.__artProof = true;   // 冻结主循环重绘
      const loop = () => { if (window.__artProof) requestAnimationFrame(loop); };
      return true;
    } catch (e) { return 'ERR:' + e.message; }
  });
  /* 停掉主循环覆盖 (直接覆盖 frame 无法, 截图前再画一次) */
  await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
  await page.evaluate(() => {
    const g = CX;
    g.fillStyle = '#3a2a3f'; g.fillRect(0, 0, 1024, 576);
    const poses = ['idle0', 'idle1', 'walk0', 'atk', 'atk2', 'hurt', 'block', 'crouch', 'win', 'ko'];
    g.imageSmoothingEnabled = false;
    CHARS.forEach((c, r) => {
      const bank = Baker.bank[c.id];
      g.fillStyle = '#ffe9a8'; g.font = 'bold 13px sans-serif'; g.textAlign = 'left';
      g.fillText(c.en, 6, 30 + r * 94);
      poses.forEach((p, i) => {
        let img;
        if (p === 'idle0') img = bank.idle[0]; else if (p === 'idle1') img = bank.idle[1];
        else if (p === 'walk0') img = bank.walk[0]; else img = bank[p];
        g.drawImage(img, 90 + i * 92, 4 + r * 94, 77, 90);
      });
      g.drawImage(bank.chip, 1024 - 52, 8 + r * 94, 44, 37);
    });
  });
  await page.screenshot({ path: OUT });
  console.log('proof ok:', ok, '| pageerrors:', errs.length ? errs.join(' ; ') : 0);
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
