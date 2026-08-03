/* SOUL BLADE PLUS · M1.1 select / mode module (full rewrite, no wrapper stacking).
   Owns: stage routing · roster-grid select (char -> [char2] -> stage -> [diff] -> vs)
   · LOCAL VS · single-source mode state (G.p2IsAI) · extended-roster busts.
   Loaded after main.js: overrides updateSelect/updateTitle (function declarations
   are late-bindable) and UI.drawSelect (fade veil re-applied manually). */
'use strict';

/* =====================================================================
   stage routing
   ===================================================================== */
(() => {
  const orig = UI.bgCanvas.bind(UI);
  UI.bgCanvas = function (G) {
    if (G.stageSel >= 1 && G.stageSel < StagePlus.defs.length) { // M1.3: 按 key 泛化(支持第4+舞台)
      StagePlus.ensure();
      return StagePlus.canvases[StagePlus.defs[G.stageSel].key] || orig(G);
    }
    return orig(G);
  };
  const q = new URLSearchParams(location.search);
  if (q.has('stage2')) G.stageSel = parseInt(q.get('stage2'), 10) || 0;
  if (G.stageSel === undefined) G.stageSel = 0;
})();

/* =====================================================================
   extended-roster busts (procedural, baked offline)
   ===================================================================== */
(() => {
  UI.ua = UI.ua || {};
  for (const cid of ['ayame', 'wukong', 'houyi', 'angela', 'diaochan']) {
    for (const kind of ['sel', 'hud']) {
      const img = new Image();
      img.onload = () => { UI.ua[kind + '_' + cid] = img; };
      img.onerror = () => {};
      img.src = `assets/img/portraits/${cid}-${kind}.png`;
    }
  }
})();
UI._selArt = function (cid) {
  if (cid === 'mack') return this.ua.selmack || null;
  if (cid === 'kenji') return this.ua.selkenji || null;
  return this.ua['sel_' + cid] || null;
};

/* =====================================================================
   mode state — single source of truth
   G.p2IsAI: true = CPU/DUMMY 控制 P2; false = 真人 P2 (LOCAL VS)
   进入任何比赛都由 startMatch 包装重置, 退出到标题恢复默认。
   ===================================================================== */
const __origStartMatch = startMatch;
startMatch = function (p1Id, p2Id, diff, demo = false, training = false, localvs = false, fresh = false) {
  const inherit = !fresh && !localvs && !training && !demo &&
    G.matchCfg && G.matchCfg.localvs && G.matchCfg.p1Id === p1Id && G.matchCfg.p2Id === p2Id;
  __origStartMatch(p1Id, p2Id, diff, demo, training);
  const isLocal = (localvs || inherit) && !training && !demo;
  if (isLocal) {
    G.ai[0] = null;
    G.ai[1] = { update: () => humanPad2() };
  }
  G.p2IsAI = !isLocal;                     // 唯一可信源: HUD 标签/输入路由都看它
  G.matchCfg.localvs = isLocal;
};

/* =====================================================================
   title (four entries)
   ===================================================================== */
updateTitle = function () {
  if (!G.titleStarted) {
    if (firstInput) { G.titleStarted = true; G.titleIntro = 0; AudioSys.sfx('menuSel'); }
    return;
  }
  if (G.titleIntro < 30) { G.titleIntro++; return; }
  G.p2IsAI = true;                          // 回到标题即复位模式痕迹
  const go = () => {
    AudioSys.sfx('menuSel');
    // M1.3 五项: 0=STORY 闯关, 1=VS CPU, 2=LOCAL VS, 3=TRAINING, 4=HOWTO
    if (G.titleSel <= 3) {
      G.select = {
        phase: 'char', cursor: 0, cursor2: 0, p1: null, p2: null,
        diff: 'normal', diffCursor: 1, stageCursor: 0, vsT: 0,
        quest: G.titleSel === 0,
        training: G.titleSel === 3,
        localvs: G.titleSel === 2,
      };
      G.screen = 'select';
    } else {
      G.screen = 'controls';
    }
  };
  if (Input.consume('KeyW')) { G.titleSel = (G.titleSel + 4) % 5; AudioSys.sfx('menuMove'); }
  if (Input.consume('KeyS')) { G.titleSel = (G.titleSel + 1) % 5; AudioSys.sfx('menuMove'); }
  if (Input.consume('KeyJ') || Input.consume('Enter')) return go();
  // M1.3 鼠标: 悬停选中(仅鼠标在动时) + 点击确认; 菜单条几何与 drawTitle 一致
  for (let i = 0; i < 5; i++) {
    const by = 338 + i * 38;
    if (Input.hoverActive(322, by, 380, 34) && G.titleSel !== i) { G.titleSel = i; AudioSys.sfx('menuMove'); }
    if (Input.click(322, by, 380, 34)) { G.titleSel = i; return go(); }
  }
};

/* =====================================================================
   select flow — char -> char2(localvs) -> stage -> diff(cpu) -> vs
   ===================================================================== */
/* 选人/舞台/难度的共享几何(绘制与鼠标热区同源, 改布局只动这里) */
function _selGridRects() {
  const N = ROSTER.length, TS = 104, GAP = 14;
  const x0 = (1024 - (N * TS + (N - 1) * GAP)) / 2, y0 = 84;
  const r = [];
  for (let i = 0; i < N; i++) r.push({ x: x0 + i * (TS + GAP) - 3, y: y0 - 3, w: TS + 6, h: TS + 6 });
  return r;
}
function _stageCardRects() {
  const M = StagePlus.defs.length + 1;
  const CW = M >= 5 ? 180 : 216, CH = 122, GAP = M >= 5 ? 18 : 22;
  const x0 = (1024 - (M * CW + (M - 1) * GAP)) / 2, y0 = 150;
  const r = [];
  for (let i = 0; i < M; i++) r.push({ x: x0 + i * (CW + GAP), y: y0, w: CW, h: CH });
  return r;
}
function _diffCardRects() {
  const r = [];
  for (let i = 0; i < 3; i++) r.push({ x: 512 + (i - 1) * 250 - 90, y: 240, w: 180, h: 110 });
  return r;
}
const _inR = (fn, rc) => Input[fn](rc.x, rc.y, rc.w, rc.h);

updateSelect = function () {
  const s = G.select;
  if (s.cursor === undefined) s.cursor = 0;
  if (s.cursor2 === undefined) s.cursor2 = 0;
  if (s.stageCursor === undefined) s.stageCursor = 0;
  if (s.diffCursor === undefined) s.diffCursor = 1;
  const N = ROSTER.length;

  if (s.phase === 'char') {
    const confirm = () => {
      s.p1 = ROSTER[s.cursor];
      AudioSys.sfx('menuSel');
      if (s.quest) { s.phase = 'diff'; }    // M1.3 闯关: 选角后直接选难度
      else if (s.localvs) { s.phase = 'char2'; s.cursor2 = (s.cursor + 1) % N; }
      else {
        const pool = ROSTER.filter(id => id !== s.p1);
        s.p2 = pool[Math.floor(Math.random() * pool.length)];
        s.phase = 'stage';
      }
    };
    if (Input.consume('KeyA')) { s.cursor = (s.cursor + N - 1) % N; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyD')) { s.cursor = (s.cursor + 1) % N; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyJ') || Input.consume('Enter')) return confirm();
    _selGridRects().forEach((rc, i) => {  // M1.3 鼠标
      if (_inR('hoverActive', rc) && s.cursor !== i) { s.cursor = i; AudioSys.sfx('menuMove'); }
      if (_inR('click', rc)) { s.cursor = i; confirm(); }
    });
    if (Input.consume('KeyK') || Input.consume('Escape')) { AudioSys.sfx('menuBack'); G.screen = 'title'; }
  } else if (s.phase === 'char2') {
    const confirm2 = () => {
      s.p2 = ROSTER[s.cursor2];             // 允许与 P1 同角色(镜像内战)
      s.phase = 'stage';
      AudioSys.sfx('menuSel');
    };
    // P2 光标: 方向键(P2 本尊) + A/D(帮选) 都可
    if (Input.consume('ArrowLeft') || Input.consume('KeyA')) { s.cursor2 = (s.cursor2 + N - 1) % N; AudioSys.sfx('menuMove'); }
    if (Input.consume('ArrowRight') || Input.consume('KeyD')) { s.cursor2 = (s.cursor2 + 1) % N; AudioSys.sfx('menuMove'); }
    if (Input.consume('Numpad1') || Input.consume('Comma') || Input.consume('BracketLeft') || Input.consume('KeyJ') || Input.consume('Enter')) return confirm2();
    _selGridRects().forEach((rc, i) => {  // M1.3 鼠标
      if (_inR('hoverActive', rc) && s.cursor2 !== i) { s.cursor2 = i; AudioSys.sfx('menuMove'); }
      if (_inR('click', rc)) { s.cursor2 = i; confirm2(); }
    });
    if (Input.consume('Numpad2') || Input.consume('Period') || Input.consume('BracketRight') || Input.consume('KeyK') || Input.consume('Escape')) {
      s.phase = 'char'; s.cursor = ROSTER.indexOf(s.p1);
      AudioSys.sfx('menuBack');
    }
  } else if (s.phase === 'stage') {
    const M = StagePlus.defs.length + 1;
    const confirmStage = () => {
      G.stageSel = s.stageCursor < StagePlus.defs.length ? s.stageCursor
        : Math.floor(Math.random() * StagePlus.defs.length);
      AudioSys.sfx(s.training || s.localvs ? 'fight' : 'menuSel');
      if (s.training || s.localvs) { s.phase = 'vs'; s.vsT = 0; }
      else s.phase = 'diff';
    };
    if (Input.consume('KeyA') || Input.consume('ArrowLeft')) { s.stageCursor = (s.stageCursor + M - 1) % M; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyD') || Input.consume('ArrowRight')) { s.stageCursor = (s.stageCursor + 1) % M; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyJ') || Input.consume('Enter') || Input.consume('Numpad1') || Input.consume('Comma')) return confirmStage();
    _stageCardRects().forEach((rc, i) => {  // M1.3 鼠标
      if (_inR('hoverActive', rc) && s.stageCursor !== i) { s.stageCursor = i; AudioSys.sfx('menuMove'); }
      if (_inR('click', rc)) { s.stageCursor = i; confirmStage(); }
    });
    if (Input.consume('KeyK') || Input.consume('Escape')) {
      AudioSys.sfx('menuBack');
      if (s.localvs) { s.phase = 'char2'; s.cursor2 = ROSTER.indexOf(s.p2 || s.p1); }
      else s.phase = 'char';
    }
  } else if (s.phase === 'diff') {
    const confirmDiff = () => {
      s.diff = ['easy', 'normal', 'hard'][s.diffCursor];
      if (s.quest) { AudioSys.sfx('fight'); Quest.start(s.p1, s.diff); return; } // M1.3 闯关入口
      s.phase = 'vs'; s.vsT = 0;
      AudioSys.sfx('fight');
    };
    if (Input.consume('KeyA') || Input.consume('ArrowLeft')) { s.diffCursor = (s.diffCursor + 2) % 3; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyD') || Input.consume('ArrowRight')) { s.diffCursor = (s.diffCursor + 1) % 3; AudioSys.sfx('menuMove'); }
    if (Input.consume('KeyJ') || Input.consume('Enter')) return confirmDiff();
    _diffCardRects().forEach((rc, i) => {  // M1.3 鼠标
      if (_inR('hoverActive', rc) && s.diffCursor !== i) { s.diffCursor = i; AudioSys.sfx('menuMove'); }
      if (_inR('click', rc)) { s.diffCursor = i; confirmDiff(); }
    });
    if (Input.consume('KeyK') || Input.consume('Escape')) { s.phase = s.quest ? 'char' : 'stage'; AudioSys.sfx('menuBack'); }
  } else if (s.phase === 'vs') {
    s.vsT++;
    if (s.vsT >= (s.training ? 60 : 100)) {
      startMatch(s.p1, s.p2 || s.p1, s.diff, false, !!s.training, !!s.localvs, true);
    }
  }
};

/* =====================================================================
   drawing
   ===================================================================== */
UI.drawSelect = function (ctx, G) {
  const s = G.select;
  const bg = (this.selbg && this.ua.selmoon) ? this.ua.selmoon.cv : this.bgCanvas(G);
  ctx.drawImage(bg, 0, 0);
  ctx.fillStyle = 'rgba(7,8,12,0.62)';
  ctx.fillRect(0, 0, 1024, 576);
  if (s.phase === 'char' || s.phase === 'char2') this._drawCharGrid(ctx, G, s);
  else if (s.phase === 'stage') this._drawStageSel(ctx, G, s);
  else if (s.phase === 'diff') this._drawDiffSel(ctx, G, s);
  else if (s.phase === 'vs') this._drawVs(ctx, G, s);
  if (this._fade) this._fade(ctx, G);   // ui.js 尾部墨渍转场由覆写剥离, 手动补回
};

UI._drawCharGrid = function (ctx, G, s) {
  const p2turn = s.phase === 'char2';
  const cursor = p2turn ? s.cursor2 : s.cursor;
  // 标头: 谁在选 (P1 金 / P2 青)
  if (s.localvs) {
    this.pixText(ctx, p2turn ? 'P2 SELECT' : 'P1 SELECT', 512, 40,
      { size: 20, align: 'center', color: p2turn ? '#7ecbff' : '#ffe27a' });
    this.pixText(ctx, p2turn ? '方向键 选择 · 小键盘1 / , 确认 · 小键盘2 / . 返回' : 'A/D 选择 · J 确认 · K 返回标题',
      512, 66, { size: 10, align: 'center', color: '#9aa3bd' });
    if (s.p1) this.pixText(ctx, `P1 ✓ ${DATA[s.p1].cn}`, 92, 40, { size: 11, color: '#ffe27a' });
  } else {
    const head = s.quest ? '選べ、物語の主役' : s.training ? '選べ、修行の相手' : '選べ、お前の魂';
    this.pixText(ctx, head, 512, 40, { size: 20, align: 'center', color: '#ffe27a' });
    this.pixText(ctx, 'A/D 选择 · J 确认 · K 返回', 512, 66, { size: 10, align: 'center', color: '#9aa3bd' });
  }

  // 六人网格
  const N = ROSTER.length, TS = 104, GAP = 14;
  const x0 = (1024 - (N * TS + (N - 1) * GAP)) / 2, y0 = 84;
  for (let i = 0; i < N; i++) {
    const cid = ROSTER[i], c = DATA[cid];
    const x = x0 + i * (TS + GAP), on = i === cursor;
    ctx.fillStyle = on ? '#2a2340' : '#151220';
    ctx.fillRect(x - 3, y0 - 3, TS + 6, TS + 6);
    ctx.fillStyle = on ? c.theme : '#252b3d';
    ctx.fillRect(x - 3, y0 - 3, TS + 6, 3);
    const face = this.portraits[cid];
    if (face) {
      ctx.save();
      if (!on) ctx.filter = 'brightness(0.62) saturate(0.8)';
      ctx.drawImage(face, x, y0, TS, TS);
      ctx.restore();
    }
    if (on) {
      const p = 2 + Math.sin(G.tick / 6) * 2;
      ctx.strokeStyle = p2turn ? '#7ecbff' : (c.theme2 || '#ffe27a');
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 3 - p, y0 - 3 - p, TS + 6 + p * 2, TS + 6 + p * 2);
    }
    if (s.localvs && s.p1 === cid) {        // P1 已锁定角标
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(x, y0, 26, 14);
      this.pixText(ctx, '1P', x + 13, y0 + 11, { size: 8, align: 'center', color: '#1b1410' });
    }
    this.pixText(ctx, c.cn, x + TS / 2, y0 + TS + 18, { size: 12, align: 'center', color: on ? (p2turn ? '#7ecbff' : '#ffe27a') : '#8892ad' });
  }

  // 悬停角色: 左立绘 + 右信息卡
  const cid = ROSTER[cursor], c = DATA[cid];
  const art = this._selArt(cid);
  if (art) {
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(art, 96, 252, 224, 241);
    ctx.restore();
  } else {
    this.drawCharPreview(ctx, cid, 208, 486, 1.7, G.tick, 'idle', true);
  }
  const cx0 = 404, cy0 = 258;
  ctx.fillStyle = 'rgba(13,11,22,0.85)';
  ctx.fillRect(cx0, cy0, 524, 236);
  ctx.fillStyle = p2turn ? '#7ecbff' : c.theme;
  ctx.fillRect(cx0, cy0, 4, 236);
  this.pixText(ctx, c.name, cx0 + 26, cy0 + 40, { size: 22, color: '#fff' });
  this.pixText(ctx, `${c.cn} · ${c.title}`, cx0 + 26, cy0 + 68, { size: 13, color: c.theme2 });
  this.pixText(ctx, `TYPE: ${c.type}`, cx0 + 26, cy0 + 94, { size: 10, color: '#9aa3bd' });
  this.statBar(ctx, cx0 + 26, cy0 + 112, '力', c.stats.pow, c.theme);
  this.statBar(ctx, cx0 + 26, cy0 + 134, '速', c.stats.spd, c.theme);
  this.statBar(ctx, cx0 + 26, cy0 + 156, '距', c.stats.rng, c.theme);
  const spName = c.moves && c.moves.special && c.moves.special.name ? c.moves.special.name : '—';
  const supName = c.moves && c.moves.super && c.moves.super.name ? c.moves.super.name : '—';
  this.pixText(ctx, `必殺: ${spName}`, cx0 + 26, cy0 + 192, { size: 12, color: '#ffe27a' });
  this.pixText(ctx, `超必: ${supName}`, cx0 + 26, cy0 + 214, { size: 12, color: '#ff9d5c' });
  // 动态动作预览(小窗, 与立绘分区不重叠)
  this.drawCharPreview(ctx, cid, cx0 + 448, cy0 + 190, 1.15, G.tick, 'run', true);
};

UI._drawStageSel = function (ctx, G, s) {
  StagePlus.ensure();
  this.pixText(ctx, '戦いの舞台', 512, 44, { size: 20, align: 'center', color: '#ffe27a' });
  this.pixText(ctx, 'STAGE SELECT', 512, 68, { size: 10, align: 'center', color: '#9aa3bd' });
  const cards = [...StagePlus.defs, { id: -1, name: '？？？', sub: 'RANDOM' }];
  const rects = _stageCardRects();   // M1.3: 与鼠标热区同源几何(卡数自适应)
  cards.forEach((d, i) => {
    const rc = rects[i], x = rc.x, y0 = rc.y, CW = rc.w, CH = rc.h;
    const on = i === s.stageCursor;
    ctx.fillStyle = on ? '#2a2340' : '#151220';
    ctx.fillRect(x - 4, y0 - 4, CW + 8, CH + 8);
    let thumb = null;
    if (d.id === 0) thumb = (G.stageArt === 'alt' && this.ua.stage) ? this.ua.stage.cv : Stage.canvas;
    else if (d.id >= 1) thumb = StagePlus.canvases[d.key];
    if (thumb) {
      ctx.save();
      if (!on) ctx.filter = 'brightness(0.55) saturate(0.8)';
      ctx.drawImage(thumb, 0, 0, thumb.width, thumb.height, x, y0, CW, CH);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0d0b16';
      ctx.fillRect(x, y0, CW, CH);
      this.pixText(ctx, '?', x + CW / 2, y0 + CH / 2 + 10, { size: 42, align: 'center', color: '#3a3454' });
    }
    if (on) {
      const p = 2 + Math.sin(G.tick / 6) * 2;
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3;
      ctx.strokeRect(x - 4 - p, y0 - 4 - p, CW + 8 + p * 2, CH + 8 + p * 2);
    }
    this.pixText(ctx, d.name, x + CW / 2, y0 + CH + 26, { size: 13, align: 'center', color: on ? '#ffe27a' : '#8892ad' });
    this.pixText(ctx, d.sub, x + CW / 2, y0 + CH + 44, { size: 8, align: 'center', color: '#5a6280' });
  });
  // 已就位阵容
  if (s.p1) this.pixText(ctx, `P1: ${DATA[s.p1].cn}`, 200, 480, { size: 12, color: '#ffe27a', align: 'center' });
  if (s.localvs && s.p2) this.pixText(ctx, `P2: ${DATA[s.p2].cn}`, 824, 480, { size: 12, color: '#7ecbff', align: 'center' });
  this.pixText(ctx, 'A/D 選択 · J 決定 · K 戻る', 512, 548, { size: 10, align: 'center', color: '#8892ad' });
};

UI._drawDiffSel = function (ctx, G, s) {
  this.pixText(ctx, '心得の程は？', 512, 120, { size: 22, align: 'center', color: '#ffe27a' });
  [['EASY', '見習い'], ['NORMAL', '侍'], ['HARD', '鬼神']].forEach(([en, jp], i) => {
    const x = 512 + (i - 1) * 250, on = s.diffCursor === i;
    ctx.fillStyle = on ? '#2a2340' : '#151220';
    ctx.fillRect(x - 90, 240, 180, 110);
    if (on) {
      const p = 2 + Math.sin(G.tick / 6) * 2;
      ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3;
      ctx.strokeRect(x - 90 - p, 240 - p, 180 + p * 2, 110 + p * 2);
    }
    this.pixText(ctx, en, x, 290, { size: 16, align: 'center', color: on ? '#ffe27a' : '#8892ad' });
    this.pixText(ctx, jp, x, 322, { size: 12, align: 'center', color: on ? '#fff' : '#5a6280' });
  });
  this.pixText(ctx, 'A/D 選択 · J 決定 · K 戻る', 512, 548, { size: 10, align: 'center', color: '#8892ad' });
};

/* VS: 单一主体构图 —— 左右立绘 + 中央 VS + 底部信息, 无 sprite 叠画 */
UI._drawVs = function (ctx, G, s) {
  const k = Math.min(1, s.vsT / 18);
  const c1 = DATA[s.p1], c2 = DATA[s.p2 || s.p1];
  ctx.fillStyle = 'rgba(14,11,24,0.88)';
  ctx.fillRect(0, 96, 1024, 384);
  ctx.fillStyle = c1.theme; ctx.fillRect(0, 96, 1024 * k / 2, 5);
  ctx.fillStyle = c2.theme; ctx.fillRect(1024 - 1024 * k / 2, 475, 1024 * k / 2, 5);
  const lx = -260 + 420 * k, rx = 1284 - 420 * k;
  // 左 P1
  const a1 = this._selArt(s.p1);
  if (a1) ctx.drawImage(a1, lx - 110, 132, 244, 262);
  else this.drawCharPreview(ctx, s.p1, lx + 10, 392, 1.7, G.tick, 'idle', true);
  this.pixText(ctx, c1.name, lx + 12, 432, { size: 18, align: 'center', color: c1.theme2 });
  this.pixText(ctx, `${c1.cn} · ${c1.title}`, lx + 12, 456, { size: 10, align: 'center', color: '#9aa3bd' });
  if (s.localvs) this.pixText(ctx, 'P1', lx + 12, 122, { size: 12, align: 'center', color: '#ffe27a' });
  // 右 P2 / 木人
  if (s.training) {
    this.pixText(ctx, '木人', rx - 12, 300, { size: 26, align: 'center', color: '#8892ad' });
    this.pixText(ctx, 'TRAINING DUMMY', rx - 12, 432, { size: 11, align: 'center', color: '#5a6280' });
  } else {
    const a2 = this._selArt(s.p2);
    if (a2) {
      ctx.save();
      // M1.2: 自产胸像满幅无边距, 镜像锚点内收避免溢出右缘
      ctx.translate(rx + 50, 0); ctx.scale(-1, 1);
      ctx.drawImage(a2, -110, 132, 244, 262);
      ctx.restore();
    } else this.drawCharPreview(ctx, s.p2, rx - 10, 392, 1.7, G.tick + 30, 'idle', false);
    this.pixText(ctx, c2.name, rx - 34, 432, { size: 18, align: 'center', color: c2.theme2 });
    this.pixText(ctx, `${c2.cn} · ${c2.title}`, rx - 34, 456, { size: 10, align: 'center', color: '#9aa3bd' });
    this.pixText(ctx, s.localvs ? 'P2' : `CPU · ${(AI_DIFFS[s.diff] || {}).en || ''}`, rx - 34, 122, { size: 12, align: 'center', color: s.localvs ? '#7ecbff' : '#9a8f78' });
  }
  // 中央 VS 徽章
  const vsA = this.ua.vs;
  if (vsA && vsA.cv) {
    const w = 168 + Math.sin(G.tick / 5) * 4, h = w * vsA.h / vsA.w;
    ctx.drawImage(vsA.cv, 512 - w / 2, 288 - h / 2, w, h);
  } else {
    this.pixText(ctx, 'VS', 512, 300, { size: 56, align: 'center', color: '#e8306a' });
  }
  const stName = StagePlus.defs[G.stageSel] ? StagePlus.defs[G.stageSel].name : '';
  this.pixText(ctx, `舞台: ${stName}`, 512, 540, { size: 11, align: 'center', color: '#8892ad' });
};

/* =====================================================================
   HOW TO PLAY: 顶部补 P1/P2 完整键位条 (原图鉴演示台保留)
   ===================================================================== */
(() => {
  if (typeof Howto === 'undefined' || !Howto.draw) return;
  const orig = Howto.draw.bind(Howto);
  Howto.draw = function (ctx, G) {
    orig(ctx, G);
    ctx.fillStyle = '#0a0910'; // opaque: the engine's own footer hint sits under this band
    ctx.fillRect(0, 540, 1024, 36);
    ctx.fillStyle = '#252b3d';
    ctx.fillRect(0, 540, 1024, 1);
    UI.pixText(ctx, 'P1  WASD移动 · 双击AD冲刺 · J轻 K重 U必杀 I超必', 258, 556, { size: 9, align: 'center', color: '#ffe27a' });
    UI.pixText(ctx, 'P2  方向键移动 · ,轻 .重 /必杀 右Shift超必 (或小键盘1/2/4/5)', 766, 556, { size: 9, align: 'center', color: '#7ecbff' });
    UI.pixText(ctx, '通用  ESC/P暂停 · M静音 · -/=音乐 9/0音效', 512, 570, { size: 8, align: 'center', color: '#8892ad' });
  };
})();

/* =====================================================================
   misc: 失焦暂停 + 音量快捷键
   ===================================================================== */
window.addEventListener('blur', () => {
  if (G.screen === 'fight' && !G.paused) { G.paused = true; G.pauseView = 'menu'; }
});
window.addEventListener('keydown', e => {
  if (!AudioSys.ready) return;
  let msg = null;
  if (e.code === 'Minus') msg = `音乐 ${Math.round(AudioSys.nudgeBgm(-0.1) * 100)}%`;
  else if (e.code === 'Equal') msg = `音乐 ${Math.round(AudioSys.nudgeBgm(+0.1) * 100)}%`;
  else if (e.code === 'Digit9') msg = `音效 ${Math.round(AudioSys.nudgeSfx(-0.1) * 100)}%`;
  else if (e.code === 'Digit0') msg = `音效 ${Math.round(AudioSys.nudgeSfx(+0.1) * 100)}%`;
  if (msg && typeof Effects !== 'undefined') {
    Effects.text(90, 544, msg, '#8892ad', 12);
    if (e.code === 'Digit9' || e.code === 'Digit0') AudioSys.sfx('menuMove');
  }
});
