/* SOUL BLADE PLUS · stage expansion.
   Two extra procedurally-painted pixel stages, same recipe as Stage.build():
   paint at 256x144, upscale x4 with smoothing off.
   Routing: G.stageSel  0=血暮神社(原版)  1=霓虹都市  2=王者峡谷  -1=随机 */
'use strict';

const StagePlus = {
  canvases: {},
  defs: [
    { id: 0, key: 'shrine', name: '血暮神社', sub: 'SHRINE OF DUSK' },
    { id: 1, key: 'neon',   name: '霓虹都市', sub: 'HIKARI CITY' },
    { id: 2, key: 'vale',   name: '王者峡谷', sub: 'HEROES VALE' },
    { id: 3, key: 'hall',   name: '青铜神殿', sub: 'BRONZE SANCTUM' }, // M1.3: artlib 语言入战斗
  ],

  _mk(painter, seed) {
    const W = 256, H = 144;
    const lo = document.createElement('canvas');
    lo.width = W; lo.height = H;
    const g = lo.getContext('2d');
    let s = seed;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const px = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };
    painter(g, px, rnd, W, H);
    const cv = document.createElement('canvas');
    cv.width = W * 4; cv.height = H * 4;
    const c2 = cv.getContext('2d');
    c2.imageSmoothingEnabled = false;
    c2.drawImage(lo, 0, 0, W * 4, H * 4);
    return cv;
  },

  ensure() {
    if (this.canvases.neon) return;
    this.canvases.neon = this._mk(this._neon, 20260730);
    this.canvases.vale = this._mk(this._vale, 20260731);
    this.canvases.hall = this._mk(this._hall, 20260801);
  },

  /* ---------- 青铜神殿 BRONZE SANCTUM: 兽面墙下的决斗 (M1.3) ---------- */
  _hall(g, px, rnd, W, H) {
    // 殿内暮色(青铜绿黑) + 悬尘微光
    const air = ['#0a100d', '#0c1310', '#0f1713', '#131c17', '#17221b'];
    air.forEach((c, i) => px(0, i * 14, W, 14, c));
    px(0, 70, W, 74, '#1a2620');
    for (let k = 0; k < 30; k++) px(rnd() * W, rnd() * 90, 1, 1, rnd() < .4 ? '#3d6b58' : '#2a4438');
    // 后墙: 巨型兽面浮雕(饕餮) + 云雷纹横带
    px(28, 20, 200, 88, '#16211b');
    px(28, 20, 200, 3, '#24382e');
    for (let x = 34; x < 222; x += 9) { // 雷纹上带
      px(x, 26, 6, 1, '#7a5a22'); px(x, 26, 1, 5, '#7a5a22'); px(x + 3, 29, 3, 1, '#5a4218');
    }
    const cx = 128, cy = 62;
    for (const sgn of [-1, 1]) {   // 兽面双目(鎏金)
      const ex = cx + sgn * 22;
      px(ex - 8, cy - 6, 16, 12, '#1e3028');
      px(ex - 5, cy - 3, 10, 6, '#b98f3e');
      px(ex - 2 + sgn, cy - 2, 3, 3, '#ffe6a0');
      px(ex - 9, cy - 10, 18, 2, '#7a5a22');       // 眉钩
      px(ex + sgn * 8, cy - 14, 2, 5, '#7a5a22');
    }
    px(cx - 2, cy - 10, 4, 26, '#24382e');          // 鼻梁扉棱
    px(cx - 1, cy - 10, 2, 26, '#3d6b58');
    for (const sgn of [-1, 1]) {                     // 獠牙钩
      px(cx + sgn * 14 - 1, cy + 14, 3, 8, '#b98f3e');
      px(cx + sgn * 10 - 1, cy + 20, sgn * 6, 2, '#7a5a22');
    }
    for (let x = 34; x < 222; x += 9) { px(x, 100, 6, 1, '#7a5a22'); px(x + 3, 100, 1, 4, '#5a4218'); }
    // 两侧殿柱 + 底座
    for (const bx of [16, 240]) {
      px(bx - 6, 24, 12, 96, '#1e3028');
      px(bx - 6, 24, 3, 96, '#0f1713');
      px(bx - 4, 30, 8, 3, '#7a5a22'); px(bx - 4, 60, 8, 3, '#7a5a22'); px(bx - 4, 90, 8, 3, '#7a5a22');
      px(bx - 8, 116, 16, 6, '#16211b');
    }
    // 编钟架(左右各三钟, 大小递进)
    for (const bx of [58, 198]) {
      px(bx - 26, 84, 52, 3, '#0d1410');
      px(bx - 24, 87, 3, 34, '#0d1410'); px(bx + 21, 87, 3, 34, '#0d1410');
      for (let k = 0; k < 3; k++) {
        const bs = 7 + k * 3, bxx = bx - 16 + k * 16;
        px(bxx - 1, 87, 2, 3, '#7a5a22');
        g.fillStyle = '#243a2e';
        g.beginPath();
        px(bxx - bs / 2, 90, bs, bs + 5, '#243a2e');
        px(bxx - bs / 2, 90, bs, 2, '#3d6b58');
        px(bxx - 1, 90 + bs + 3, 2, 2, '#b98f3e');
      }
    }
    // 地面: 青铜方砖 + 中央大日纹(朱砂) + 火盆光晕
    px(0, 122, W, 22, '#141d17');
    px(0, 122, W, 2, '#2a4438');
    for (let i = 0; i < 13; i++) px(i * 20 + (i % 2) * 4, 126, 16, 1, '#1e2c23');
    for (let yy = 0; yy < 8; yy++) { // 中央日纹(半嵌地面)
      const half = Math.floor(Math.sqrt(Math.max(0, 64 - (yy * 2.2) * (yy * 2.2)) ) );
      px(cx - half, 128 + yy, half * 2, 1, yy < 2 ? '#8a2a1c' : '#5f1e14');
    }
    // 火盆×2(近景, drawFx 会叠动态焰)
    for (const bx of [34, 222]) {
      px(bx - 7, 112, 14, 8, '#0d1410');
      px(bx - 9, 119, 18, 3, '#0a0f0c');
      px(bx - 4, 108, 8, 5, '#c8452c');
      px(bx - 2, 105, 4, 4, '#ff9a52');
      px(bx - 1, 103, 2, 2, '#ffd9a0');
    }
  },

  /* M1.2 舞台动态覆盖层: 静态底图之上的每帧微动画(对齐神社的氛围密度)
     霓虹都市: 四块招牌按各自相位闪烁 + 水洼同步映光
     王者峡谷: 水晶呼吸光晕 + 双塔眼脉动 */
  drawFx(ctx, G) {
    const t = G.tick;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (G.stageSel === 1) {
      const SIGNS = [ // [x, y, w, h, color, 相位, 水洼x]
        [72, 176, 88, 120, '#e8306a', 0.0, 96],
        [208, 232, 56, 80, '#35e0d8', 1.7, 280],
        [864, 200, 80, 104, '#ffd24a', 3.1, 600],
        [704, 264, 48, 64, '#7d5bff', 4.6, 856],
      ];
      for (const [x, y, w, h, col, ph, puddle] of SIGNS) {
        let a = 0.10 + 0.08 * Math.sin(t * 0.11 + ph);
        if (Math.sin(t * 0.023 + ph * 3.3) > 0.986) a = 0.02; // 偶发熄闪
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = col;
        ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
        ctx.globalAlpha = Math.max(0, a * 0.7); // 水洼映光(与招牌同步)
        ctx.fillRect(puddle - 26, 414, 76, 12);
      }
    } else if (G.stageSel === 2) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.05);
      ctx.globalAlpha = 0.07 + 0.09 * k; // 水晶呼吸
      ctx.fillStyle = '#6ac8ff';
      ctx.beginPath();
      ctx.ellipse(512, 136, 66 + k * 14, 84 + k * 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25 + 0.3 * k;
      ctx.fillStyle = '#d8f2ff';
      ctx.fillRect(508, 92, 8, 88);
      ctx.globalAlpha = 0.22 + 0.26 * Math.sin(t * 0.09 + 1.3); // 塔眼脉动
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(144, 108, 16, 16);
      ctx.fillRect(864, 108, 16, 16);
    } else if (G.stageSel === 3) {
      // 青铜神殿: 火盆风焰(相位摇) + 兽面金目脉动 + 地面日纹微光
      for (const [bx, ph] of [[136, 0], [888, 2.4]]) {
        const fl = Math.sin(t * 0.31 + ph), h = 26 + fl * 8;
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 0.53 + ph);
        ctx.fillStyle = '#ff9a52';
        ctx.fillRect(bx - 8 + fl * 3, 432 - h, 16, h);
        ctx.fillStyle = '#ffd9a0';
        ctx.fillRect(bx - 3 + fl * 4, 432 - h * 0.62, 7, h * 0.5);
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.53 + ph);
        ctx.fillStyle = '#ff7a3c';
        ctx.fillRect(bx - 44, 340, 88, 96);
      }
      const e = 0.24 + 0.22 * Math.sin(t * 0.06); // 兽面金目
      ctx.globalAlpha = e;
      ctx.fillStyle = '#ffe6a0';
      ctx.fillRect(404, 228, 36, 20);
      ctx.fillRect(584, 228, 36, 20);
      ctx.globalAlpha = 0.08 + 0.05 * Math.sin(t * 0.045 + 1); // 日纹地光
      ctx.fillStyle = '#c8452c';
      ctx.fillRect(448, 508, 128, 24);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  /* ---------- 霓虹都市 HIKARI CITY: 雨夜天台对决 ---------- */
  _neon(g, px, rnd, W, H) {
    // night sky gradient bands
    const sky = ['#0a0a18', '#0d0c1e', '#110e26', '#15102e', '#191236'];
    sky.forEach((c, i) => px(0, i * 12, W, 12, c));
    px(0, 60, W, 40, '#1d1440');
    // distant skyline (3 depth layers)
    for (const [top, col, wMin, gap] of [[52, '#141031', 10, 3], [66, '#1b1540', 14, 4], [82, '#251a52', 18, 5]]) {
      let x = -4;
      while (x < W + 8) {
        const bw = wMin + rnd() * 14, bh = 18 + rnd() * (top === 52 ? 34 : 22);
        px(x, top + (82 - top) - bh + 20, bw, bh + 40, col);
        // lit windows
        for (let k = 0; k < bw * bh / 26; k++) {
          if (rnd() < 0.5) continue;
          const wx = x + 1 + rnd() * (bw - 3), wy = top + (82 - top) - bh + 22 + rnd() * (bh - 4);
          px(wx, wy, 1, 1, rnd() < 0.16 ? '#ffd24a' : rnd() < 0.5 ? '#35e0d8' : '#5a5a8a');
        }
        x += bw + gap;
      }
    }
    // giant moon behind towers (electric cyan rim)
    for (let yy = -20; yy <= 20; yy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, 400 - yy * yy)));
      px(198 - half, 34 + yy, half * 2, 1, yy < -14 ? '#2a5a6a' : '#1d3a4e');
    }
    // neon billboards (kanji-ish blocks)
    const signs = [
      [18, 44, 22, 30, '#e8306a', '#ff7aa8'], [52, 58, 14, 20, '#35e0d8', '#b9fff7'],
      [216, 50, 20, 26, '#ffd24a', '#fff2c8'], [176, 66, 12, 16, '#7d5bff', '#c9baff'],
    ];
    for (const [sx, sy, sw, sh, c1, c2] of signs) {
      px(sx, sy, sw, sh, '#0d0b16');
      px(sx + 1, sy + 1, sw - 2, sh - 2, '#141020');
      for (let r = 0; r < 3; r++) {
        px(sx + 3, sy + 3 + r * (sh - 6) / 3, sw - 6, 2, r === 1 ? c2 : c1);
        if (rnd() < .7) px(sx + 3 + rnd() * (sw - 8), sy + 3 + r * (sh - 6) / 3, 2, 2, '#ffffff');
      }
    }
    // rooftop floor (the arena): wet concrete + neon reflections
    px(0, 100, W, 44, '#16121e');
    px(0, 100, W, 2, '#3a2c56');
    for (let i = 0; i < 12; i++) px(i * 22, 102, 1, 42, '#1e1830');   // panel seams
    // puddle reflections
    for (const [rx, rc] of [[24, '#e8306a'], [70, '#35e0d8'], [150, '#ffd24a'], [214, '#7d5bff']]) {
      for (let k = 0; k < 14; k++) {
        if (rnd() < .4) continue;
        px(rx + rnd() * 16 - 8, 104 + k * 2.6, 4 + rnd() * 8, 1, rc + '');
      }
    }
    g.globalAlpha = 0.25;
    for (let k = 0; k < 40; k++) px(rnd() * W, 104 + rnd() * 38, 6, 1, '#4a4062');
    g.globalAlpha = 1;
    // safety rail at back of roof
    px(0, 96, W, 1, '#2c2440');
    for (let x = 4; x < W; x += 10) px(x, 96, 1, 5, '#2c2440');
    // rain streaks
    g.globalAlpha = 0.3;
    for (let k = 0; k < 46; k++) px(rnd() * W, rnd() * 100, 1, 4 + rnd() * 4, '#5a7a9a');
    g.globalAlpha = 1;
  },

  /* ---------- 王者峡谷 HEROES VALE: 高地水晶前的决斗 ---------- */
  _vale(g, px, rnd, W, H) {
    // dawn sky
    const sky = ['#1a2440', '#203052', '#2a4066', '#38547a', '#4a6c8e'];
    sky.forEach((c, i) => px(0, i * 13, W, 13, c));
    // twin peaks
    g.fillStyle = '#243a52';
    for (let x = 0; x < W; x += 2) {
      const h = 22 + Math.sin(x * 0.03 + 2) * 12 + Math.sin(x * 0.011) * 8;
      px(x, 64 - h, 2, h + 10, '#243a52');
    }
    // defence towers (对称双塔)
    const tower = (bx, mirror) => {
      px(bx - 7, 34, 14, 38, '#3a3050');
      px(bx - 9, 32, 18, 4, '#4a3c64');
      px(bx - 5, 26, 10, 8, '#4a3c64');
      px(bx - 2, 20, 4, 7, '#5a4a78');
      px(bx - 2, 28, 4, 4, '#ffd24a');            // 塔眼
      px(bx - 1, 29, 2, 2, '#fff2c8');
      for (let k = 0; k < 5; k++) px(bx - 7 + k * 3, 44 + (k % 2) * 4, 2, 2, '#2c2440');
    };
    tower(38); tower(218);
    // the crystal (水晶) between peaks, floating + glow
    const cx0 = 128, cy0 = 34;
    px(cx0 - 1, cy0 - 12, 2, 24, '#8ad8ff');
    px(cx0 - 4, cy0 - 8, 8, 16, '#4aa8e8');
    px(cx0 - 7, cy0 - 4, 14, 8, '#3a78c8');
    px(cx0 - 2, cy0 - 9, 3, 10, '#d8f2ff');       // 高光
    g.globalAlpha = 0.22;
    px(cx0 - 12, cy0 - 14, 24, 28, '#6ac8ff');
    g.globalAlpha = 1;
    px(cx0 - 10, cy0 + 16, 20, 3, '#2c3a5a');     // 基座
    // river of mist
    g.globalAlpha = 0.5;
    for (let k = 0; k < 26; k++) px(rnd() * W, 66 + rnd() * 10, 10 + rnd() * 18, 2, '#5a7a9a');
    g.globalAlpha = 1;
    // grass field arena
    px(0, 78, W, 66, '#2c4a34');
    px(0, 78, W, 3, '#3a5c40');
    // lane stones
    for (let i = 0; i < 9; i++) px(12 + i * 28, 96 + (i % 2) * 3, 14, 4, '#4a4438');
    // 草丛 (王者标志性)
    const bush = (bx, by, s) => {
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI;
        px(bx + Math.cos(a) * 6 * s - 2, by - Math.sin(a) * 5 * s, 5 * s, 4 * s, '#1e3824');
      }
      px(bx - 5 * s, by - 2, 10 * s, 4, '#24422c');
    };
    bush(30, 118, 1); bush(226, 116, 1); bush(128, 132, 1.3);
    // scattered flowers / pebbles
    for (let k = 0; k < 30; k++) {
      const fx = rnd() * W, fy = 84 + rnd() * 56;
      px(fx, fy, 1, 1, rnd() < .3 ? '#ffd24a' : rnd() < .5 ? '#d8f2ff' : '#3a5c40');
    }
    // buff 图腾 (红蓝)
    px(66, 88, 6, 10, '#5a2430'); px(67, 86, 4, 3, '#e84a5a');
    px(184, 88, 6, 10, '#24305a'); px(185, 86, 4, 3, '#4a8ae8');
  },
};
