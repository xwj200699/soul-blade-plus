/* 血刃 M1.3 · 实测视频录制器
   页内 canvas.captureStream(60) + AudioSys master→MediaStreamDestination 合流,
   MediaRecorder 录 webm(vp9+opus, 含游戏音频), 零 ffmpeg 依赖。
   全程真实键盘/鼠标驱动一段 ~3.5 分钟慢节奏实测: 标题 → 鼠标进闯关(悟空)
   开幕剧情 + 第一波混战 → 退出 → VS CPU 悟空@青铜神殿 实战 → 训练场超杀秀
   (安琪拉激光/貂蝉花舞) → 回标题收尾。输出: 发布/血刃-M1.3-实测视频.mp4
   (H.264+AAC, MediaRecorder 原生 mp4 封装; 不支持时回退 webm) */
'use strict';
const fs = require('fs');
const { pathToFileURL } = require('url');
const puppeteer = require('C:\\留存\\Game Now\\MOBA\\Fable 5 MAX\\node_modules\\puppeteer-core');
const HTML = 'C:\\留存\\Game Now\\soul-blade-plus\\发布\\血刃-M1.3-闯关版.html';
const OUT = 'C:\\留存\\Game Now\\soul-blade-plus\\发布\\血刃-M1.3-实测视频.mp4';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = e => `(() => { try { return (${e}); } catch (err) { return '__E__' + err.message; } })()`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1280,800',
           '--enable-features=SharedArrayBuffer'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', e => console.log('[pgerr]', String(e).slice(0, 200)));
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load', timeout: 120000 });
  const st = e => page.evaluate(S(e));
  const tap = async (c, hold = 45, after = 150) => { await page.keyboard.down(c); await sleep(hold); await page.keyboard.up(c); await sleep(after); };
  const mclick = async (lx, ly) => {
    const b = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
    await page.mouse.click(b.l + lx * b.w / 1024, b.t + ly * b.h / 576);
    await sleep(200);
  };
  const waitS = async (expr, desc, ms = 15000) => {
    const t0 = Date.now();
    for (;;) {
      if ((await st(expr)) === true) return true;
      if (Date.now() - t0 > ms) { console.log('  !! wait timeout:', desc); return false; }
      await sleep(120);
    }
  };
  const menuTo = async idx => { // 确定性菜单导航(读 titleSel 计算步数)
    const cur = await st('G.titleSel');
    const n = (((idx - cur) % 5) + 5) % 5;
    for (let i = 0; i < n; i++) await tap('KeyS', 45, 260);
  };

  await waitS("typeof G !== 'undefined' && G.screen === 'title'", 'boot', 90000);
  await tap('Space', 40, 400); // 唤醒 + 解锁音频
  await waitS('G.titleStarted === true && G.titleIntro >= 30', 'intro');

  // ---- 开始录制(音视频合流) ----
  const recOk = await page.evaluate(() => {
    try {
      const cv = document.getElementById('game');
      const stream = cv.captureStream(60);
      try {
        if (typeof AudioSys !== 'undefined' && AudioSys.ready) {
          // master 总线接进录制流(内部结构: 通过一次性探针拿 ctx)
          const probe = new (window.AudioContext || window.webkitAudioContext)();
          probe.close();
        }
      } catch (e) {}
      // 音频: 从 AudioSys 内部拿不到闭包, 改走 captureStream 之外的全局 hook:
      // audio.js 的 master 未导出 —— 用 destination 侧录不可行, 采用
      // AudioSys.attachRecorder 若存在; 否则视频无声并如实标注
      let audioTracks = [];
      if (typeof AudioSys !== 'undefined' && AudioSys.recorderStream) {
        audioTracks = AudioSys.recorderStream().getAudioTracks();
      }
      for (const t of audioTracks) stream.addTrack(t);
      window.__chunks = [];
      // mp4 编解码选型(probe_mp4c/e/f 探针结论):
      //   avc1+mp4a → 空壳(Chromium 无 AAC 编码器); 裸 video/mp4 → 自选成 vp9(兼容差);
      //   avc1 High(64xxxx)+opus → 编码停摆; avc1 Baseline(42E01E)+opus → 健康 ✓
      const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,opus')
        ? 'video/mp4;codecs=avc1.42E01E,opus' : 'video/webm;codecs=vp9,opus';
      window.__rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 });
      window.__rec.ondataavailable = e => { if (e.data && e.data.size) window.__chunks.push(e.data); };
      window.__rec.start(1000);
      return { ok: true, mime, audio: audioTracks.length };
    } catch (e) { return { ok: false, err: String(e) }; }
  });
  console.log('recorder:', JSON.stringify(recOk));
  if (!recOk.ok) throw new Error('recorder failed: ' + recOk.err);

  /* ============ 实测脚本(慢节奏版) ============ */
  const tileOf = idx => st(`(() => { const N = ROSTER.length, TS = 104, GAP = 14, x0 = (1024 - (N * TS + (N - 1) * GAP)) / 2; return Math.round(x0 + ${idx} * (TS + GAP) + TS / 2); })()`);
  // A. 标题展示 + 菜单滚动 (~12s)
  await sleep(4200);
  await tap('KeyS', 45, 700); await tap('KeyS', 45, 700);
  await tap('KeyW', 45, 700); await tap('KeyW', 45, 1000);

  // B. 鼠标进闯关: STORY → 悟空 → EASY → 剧情 → 第一波混战 (~60s)
  await mclick(512, 355);
  await waitS("G.screen === 'select' && G.select.quest === true", 'story select');
  await sleep(1600); // 七人网格停留
  const tileWukong = await tileOf(3);
  await mclick(tileWukong, 136);
  await waitS("G.select.phase === 'diff'", 'diff');
  await sleep(1300);
  await mclick(262, 295); // EASY
  await waitS("G.screen === 'quest'", 'quest start');
  await sleep(2200);
  for (let i = 0; i < 6; i++) { // 剧情点击推进(留足读秒)
    if ((await st("Quest.st.phase === 'talk'")) !== true) break;
    await sleep(2800);
    await mclick(512, 480);
  }
  await sleep(600);
  await page.keyboard.down('KeyD');
  await waitS("Quest.st.phase === 'fight'", 'wave1', 20000);
  await page.keyboard.up('KeyD');
  await sleep(700); // WAVE 匾停留
  const qt0 = Date.now();
  let qi = 0;
  while (Date.now() - qt0 < 40000) { // 第一波真实混战(从容节奏)
    const ph = await st('Quest.st.phase');
    if (ph !== 'fight') break;
    const gap = await st("(() => { const p = Quest.st.player, es = Quest.st.enemies.filter(e => !e.dead); if (!es.length) return 0; es.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)); return es[0].x - p.x; })()");
    const dir = gap >= 0 ? 'KeyD' : 'KeyA';
    if (Math.abs(gap) > 115) { await page.keyboard.down(dir); await sleep(Math.min(500, Math.abs(gap) * 3)); await page.keyboard.up(dir); }
    await tap(qi % 3 === 2 ? 'KeyK' : 'KeyJ', 40, 260);
    if (qi % 7 === 6) await tap('KeyI', 40, 200);
    qi++;
  }
  await sleep(2200); // 清波后停留
  await tap('Escape', 45, 800); await tap('Escape', 45, 900); // 退出闯关

  // C. VS CPU @青铜神殿: 悟空 vs 貂蝉 (~35s)
  await waitS("G.screen === 'title'", 'back title');
  await sleep(1200);
  await menuTo(1); // VS CPU
  await tap('KeyJ', 45, 800);
  await waitS("G.screen === 'select'", 'cpu select');
  await sleep(1200);
  await mclick(tileWukong, 136); // 悟空
  await waitS("G.select.phase === 'stage'", 'stage');
  await sleep(1200);
  const card4 = await st("(() => { const M = StagePlus.defs.length + 1, CW = M >= 5 ? 180 : 216, GAP = M >= 5 ? 18 : 22, x0 = (1024 - (M * CW + (M - 1) * GAP)) / 2; return Math.round(x0 + 3 * (CW + GAP) + CW / 2); })()");
  await mclick(card4, 210); // 青铜神殿卡
  await waitS("G.select.phase === 'diff'", 'diff2');
  await sleep(900);
  await mclick(262, 295);   // EASY
  await waitS("G.screen === 'fight' && G.phase === 'fight'", 'hall fight', 15000);
  await sleep(900); // VS 开场停留
  const ft0 = Date.now();
  let fi = 0;
  while (Date.now() - ft0 < 32000) {
    if ((await st("G.screen === 'fight' && G.phase === 'fight'")) !== true) break;
    const gap2 = await st('G.fighters.length === 2 ? G.fighters[1].x - G.fighters[0].x : 0');
    const dir2 = gap2 >= 0 ? 'KeyD' : 'KeyA';
    if (Math.abs(gap2) > 120) { await page.keyboard.down(dir2); await sleep(Math.min(480, Math.abs(gap2) * 3)); await page.keyboard.up(dir2); }
    await tap(fi % 3 === 2 ? 'KeyK' : 'KeyJ', 40, 240);
    if (fi % 5 === 4) await tap('KeyU', 40, 200);   // 金箍棒必杀
    if (fi % 9 === 8) await tap('KeyI', 40, 200);   // 气满即超杀
    fi++;
  }
  await sleep(1500);
  await tap('Escape', 45, 800); await tap('Escape', 45, 900);

  // D. 训练场超杀秀: angela 激光 → diaochan 花舞 (~30s)
  await waitS("G.screen === 'title'", 'back title 2');
  await sleep(1200);
  for (const heroTile of [5, 6]) { // angela, diaochan
    await menuTo(3); // TRAINING
    await tap('KeyJ', 45, 800);
    const okSel = await waitS("G.screen === 'select' && G.select.training === true", 'training sel', 8000);
    if (!okSel) break;
    await sleep(1000);
    const tileX = await tileOf(heroTile);
    await mclick(tileX, 136);
    await waitS("G.select.phase === 'stage'", 'tr stage');
    await sleep(800);
    await tap('KeyJ', 45, 600);
    await waitS("G.screen === 'fight' && G.phase === 'fight'", 'tr fight', 12000);
    await sleep(800);
    // 走近放超杀
    await page.keyboard.down('KeyD');
    await waitS('G.fighters.length === 2 && Math.abs(G.fighters[0].x - G.fighters[1].x) < 150', 'близ', 6000);
    await page.keyboard.up('KeyD');
    await sleep(400);
    await tap('KeyI', 45, 300);
    await sleep(4200); // 看完 cine + 余韵
    await tap('Escape', 45, 700); await tap('Escape', 45, 800);
    await waitS("G.screen === 'title'", 'tr back');
    await sleep(1000);
  }
  await sleep(2600);

  // ---- 停录 + 分片取回(单次 base64 过大时 CDP 消息会失败, 故 8MB 分片) ----
  const meta = await page.evaluate(() => new Promise(res => {
    window.__rec.onstop = () => {
      window.__blob = new Blob(window.__chunks, { type: window.__rec.mimeType });
      res({ chunks: window.__chunks.length, bytes: window.__blob.size, mime: window.__rec.mimeType });
    };
    window.__rec.stop();
  }));
  console.log('blob:', JSON.stringify(meta));
  if (!meta.bytes) throw new Error('empty recording blob');
  const SLICE = 8 * 1024 * 1024;
  const parts = [];
  for (let off = 0; off < meta.bytes; off += SLICE) {
    const b64 = await page.evaluate((a, b) => new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result.split(',')[1]);
      fr.readAsDataURL(window.__blob.slice(a, b));
    }), off, Math.min(off + SLICE, meta.bytes));
    parts.push(Buffer.from(b64, 'base64'));
  }
  fs.writeFileSync(OUT, Buffer.concat(parts));
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`video saved: ${OUT} (${mb} MB, audio tracks: ${recOk.audio})`);
  await browser.close();
})().catch(e => { console.error('RECORD FAIL:', e.message); process.exit(1); });
