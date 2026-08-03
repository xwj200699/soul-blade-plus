/* 视频抽帧器: 浏览器 <video> seek + canvas 截帧, 输出 PNG 序列 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('C:\\留存\\Game Now\\MOBA\\Fable 5 MAX\\node_modules\\puppeteer-core');
const SRC = 'C:\\留存\\Game Now\\soul-blade-plus\\video.mp4';
const OUTDIR = 'C:\\留存\\Game Now\\soul-blade-plus\\_build\\_frames';
const N = 16; // 抽帧数

(async () => {
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  // file:// 视频在 about:blank 会被 URL safety check 拦, 需同源 file:// 宿主页
  const HOST = path.join(path.dirname(SRC), '_frame_host.html');
  fs.writeFileSync(HOST, '<!doctype html><body></body>');
  await page.goto(pathToFileURL(HOST).href);
  const info = await page.evaluate(src => new Promise((res, rej) => {
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.src = src;
    v.oncanplaythrough = () => res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight });
    v.onerror = () => rej(new Error('video load error: ' + (v.error && v.error.message)));
    document.body.appendChild(v);
    window.__v = v;
    setTimeout(() => res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight, note: 'canplay timeout' }), 15000);
  }), pathToFileURL(SRC).href);
  console.log('video:', JSON.stringify(info));
  for (let i = 0; i < N; i++) {
    const t = info.dur * (i + 0.5) / N;
    const b64 = await page.evaluate(tt => new Promise(res => {
      const v = window.__v;
      const grab = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = v.videoWidth; cv.height = v.videoHeight;
          cv.getContext('2d').drawImage(v, 0, 0);
          res(cv.toDataURL('image/png').split(',')[1]);
        } catch (e) { res('ERR:' + e.message); }
      };
      let done = false;
      v.onseeked = () => { if (!done) { done = true; setTimeout(grab, 80); } };
      v.currentTime = tt;
      setTimeout(() => { if (!done) { done = true; grab(); } }, 5000); // seek 卡死兜底: 抓当前帧
    }), t);
    if (String(b64).startsWith('ERR:')) { console.log('frame', i, 'grab error:', b64.slice(4, 120)); continue; }
    const f = path.join(OUTDIR, `f${String(i).padStart(2, '0')}_${t.toFixed(1)}s.png`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log('frame', i, t.toFixed(1) + 's');
  }
  await browser.close();
  fs.unlinkSync(HOST);
  console.log('DONE ->', OUTDIR);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
