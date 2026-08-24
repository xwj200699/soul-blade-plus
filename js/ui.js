/* All 2D UI drawing: text/panels, KOF-style HUD, title / controls /
   character-select / result screens, announcements. */
'use strict';

const UI = {
  portraits: {},
  ua: {}, // processed 和风 UI assets; any key may be null → programmatic fallback
  UILIB_V: 10, // assets/uilib 资产版本; 重烘焙后 +1, 否则浏览器吃旧缓存(同名文件)

  // ---- primitives ---------------------------------------------------------
  _font(size) { return `${size}px PressStart, FusionPixelJA, FusionPixel, monospace`; },

  textW(ctx, str, size, spacing = 0) {
    ctx.font = this._font(size);
    return ctx.measureText(str).width + spacing * Math.max(0, str.length - 1);
  },

  // EN+汉字混排修正(Eric 2026-07-11): PressStart 大写把字号占满, 同字号的
  // FusionPixel 汉字显小一圈且基线下沉 —— 按 CJK 段拆开, 汉字段放大 jpBump 号、
  // 上提 jpLift px, 整体再按 align 对齐。凡是一串里同时有英文和汉字的都用它
  _cjkRe: /[⺀-鿿぀-ヿ豈-﫿　-〿々〆ー]/,
  pixTextMixed(ctx, str, x, y, opts = {}) {
    const { size = 16, align = 'left', jpBump = 2, jpLift = 2 } = opts;
    const runs = String(str).split(/([⺀-鿿぀-ヿ豈-﫿　-〿々〆ー]+)/).filter(s => s);
    if (runs.length < 2) return this.pixText(ctx, str, x, y, opts); // 纯英文/纯汉字: 原路
    const wOf = (s) => this.textW(ctx, s, this._cjkRe.test(s) ? size + jpBump : size);
    const total = runs.reduce((a, s) => a + wOf(s), 0);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const s of runs) {
      const jp = this._cjkRe.test(s);
      this.pixText(ctx, s, cx, y - (jp ? jpLift : 0),
        { ...opts, size: jp ? size + jpBump : size, align: 'left', spacing: 0, maxW: 0 });
      cx += wOf(s);
    }
  },

  pixText(ctx, str, x, y, opts = {}) {
    const {
      color = '#f4f1e8', align = 'left', baseline = 'alphabetic',
      outline = false, outlineColor = '#0d0f16', shadow = 0,
      shadowColor = 'rgba(0,0,0,0.65)', spacing = 0, maxW = 0,
    } = opts;
    let size = opts.size || 16;
    ctx.font = this._font(size);
    // shrink-to-fit: copy must never overflow its slot (pixel fonts run wide)
    if (maxW > 0) {
      while (size > 9 && ctx.measureText(str).width + spacing * Math.max(0, str.length - 1) > maxW) {
        size--;
        ctx.font = this._font(size);
      }
    }
    ctx.textBaseline = baseline;

    const drawOne = (s, dx, dy, fill) => {
      ctx.fillStyle = fill;
      ctx.fillText(s, dx, dy);
    };

    if (spacing > 0) {
      ctx.textAlign = 'left';
      const widths = [...str].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (str.length - 1);
      let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
      [...str].forEach((ch, i) => {
        if (shadow) drawOne(ch, cx + shadow, y + shadow, shadowColor);
        if (outline) for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2],[-2,2],[2,-2]]) drawOne(ch, cx + ox, y + oy, outlineColor);
        drawOne(ch, cx, y, color);
        cx += widths[i] + spacing;
      });
      return;
    }

    ctx.textAlign = align;
    if (shadow) drawOne(str, x + shadow, y + shadow, shadowColor);
    if (outline) for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,2],[-2,2],[2,-2]]) drawOne(str, x + ox, y + oy, outlineColor);
    drawOne(str, x, y, color);
  },

  panel(ctx, x, y, w, h, opts = {}) {
    // lacquered wood panel with gold trim — 和风
    const { fill = 'rgba(22,17,13,0.94)', border = '#8a6a2f', accent = null, shadowOff = 5 } = opts;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + shadowOff, y + shadowOff, w, h);
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = border;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (accent) {
      ctx.fillStyle = accent;
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#8a6a2f';
      ctx.fillRect(x, y + 4, w, 1);
    }
    // pixel corner notches
    ctx.fillStyle = '#07080c';
    ctx.fillRect(x - 5, y - 5, 4, 4);
    ctx.fillRect(x + w + 1, y - 5, 4, 4);
    ctx.fillRect(x - 5, y + h + 1, 4, 4);
    ctx.fillRect(x + w + 1, y + h + 1, 4, 4);
  },

  keycap(ctx, x, y, w, label) {
    const A = this.ua.keycap;
    if (!A) {
      ctx.fillStyle = '#0d0f16';
      ctx.fillRect(x + 3, y + 3, w, 34);
      ctx.fillStyle = '#4a5470';
      ctx.fillRect(x, y, w, 34);
      ctx.fillStyle = '#1c2130';
      ctx.fillRect(x + 2, y + 2, w - 4, 30);
      ctx.fillStyle = '#2a3145';
      ctx.fillRect(x + 2, y + 2, w - 4, 5);
      this.pixText(ctx, label, x + w / 2, y + 24, { size: 13, align: 'center', color: '#ffe27a' });
      return;
    }
    const H = 40, s = H / A.h, natW = A.w * s;
    if (w <= natW + 4) {
      // square-ish: uniform scale, centered in the requested slot
      ctx.drawImage(A.cv, x + (w - natW) / 2, y, natW, H);
    } else {
      // wide: 3-slice through the clean lacquer band between the rim corners
      const lw = Math.round(A.w * 0.21 * s), rw = Math.round(A.w * 0.195 * s);
      ctx.drawImage(A.cv, 0, 0, A.w * 0.21, A.h, x, y, lw, H);
      ctx.drawImage(A.cv, A.w * 0.805, 0, A.w * 0.195, A.h, x + w - rw, y, rw, H);
      ctx.drawImage(A.cv, A.w * 0.21, 0, A.w * 0.595, A.h, x + lw, y, w - lw - rw, H);
    }
    this.pixText(ctx, label, x + w / 2, y + Math.round(H * 0.42) + 5, { size: 13, align: 'center', color: '#ffe27a' });
  },

  // chosen fight backdrop: AI-painted alt stage or the procedural one
  bgCanvas(G) {
    return (G.stageArt === 'alt' && this.ua.stage) ? this.ua.stage.cv : Stage.canvas;
  },

  statBar(ctx, x, y, label, val, theme) {
    this.pixText(ctx, label, x, y + 10, { size: 12, color: '#9aa3bd' });
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < val ? theme : '#252b3d';
      ctx.fillRect(x + 52 + i * 22, y, 16, 12);
    }
  },

  drawCharPreview(ctx, cid, x, y, scale, tick, anim = 'idle', faceRight = true) {
    const c = DATA[cid];
    const a = c.anims[anim];
    const img = Assets.img(`${cid}:${anim}`);
    if (!img) return;
    const fw = c.fw || 200; // 帧边长: 主角色200 / Huntress 150 / 烘焙新角色128
    const frame = Math.floor(tick / a.hold) % a.frames;
    const flip = (c.native === 1) !== faceRight;
    ctx.save();
    if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(img, frame * fw, 0, fw, fw,
      x - c.anchor.x * scale, y - c.anchor.y * scale, fw * scale, fw * scale);
    ctx.restore();
  },

  // size-matched select/result bust (320x344, faces pre-aligned). Draws head+
  // shoulders into (rx,ry,rw,rh) clipped; falls back to the sprite preview.
  // zoom > 1 scales around the window center (hover feedback).
  drawBust(ctx, cid, rx, ry, rw, rh, dim, zoom = 1) {
    const art = cid === 'kenji' ? this.ua.selkenji : cid === 'mack' ? this.ua.selmack : (this.ua['sel_' + cid] || null); // M1: 扩展名册专属半身像
    if (!art) { this.drawCharPreview(ctx, cid, rx + rw / 2, ry + rh + 40, 2.25, 0, 'idle', cid === 'mack'); return; }
    const s = rw / 320 * zoom;          // fit width; art is 320 wide
    const ox = (320 * s - rw) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    if (dim) ctx.filter = 'brightness(0.66) saturate(0.85)';
    ctx.drawImage(art, rx - ox, ry - ox * 344 / 320, 320 * s, 344 * s);
    ctx.restore();
  },

  makePortraits() {
    for (const cid of Object.keys(DATA)) {
      const c = DATA[cid];
      const img = Assets.img(`${cid}:idle`);
      const FWp = c.fw || 200; // 帧边长自适应(烘焙新角色128)
      // auto face-crop: find the character bbox in idle frame 0, then zoom a
      // square onto the head (top of the bbox) so the face FILLS the portrait.
      // file:// 污染画布时 getImageData 会抛错 -> 回退 data.js 手标 portrait 框
      let sx, sy, side;
      try {
        const mc = document.createElement('canvas');
        mc.width = FWp; mc.height = FWp;
        const mg = mc.getContext('2d');
        mg.drawImage(img, 0, 0, FWp, FWp, 0, 0, FWp, FWp);
        const data = mg.getImageData(0, 0, FWp, FWp).data;
        let bx1 = FWp, by1 = FWp, bx2 = 0, by2 = 0;
        for (let yy = 0; yy < FWp; yy++) for (let xx = 0; xx < FWp; xx++) {
          if (data[(yy * FWp + xx) * 4 + 3] > 40) {
            if (xx < bx1) bx1 = xx; if (xx > bx2) bx2 = xx;
            if (yy < by1) by1 = yy; if (yy > by2) by2 = yy;
          }
        }
        const H = by2 - by1;
        side = Math.max(26, Math.round(H * 0.42));
        const cxm = (bx1 + bx2) / 2, cym = by1 + H * 0.2;
        sx = Math.round(cxm - side / 2); sy = Math.round(cym - side / 2);
      } catch (e) {
        const P = c.portrait || { x: FWp * 0.3, y: FWp * 0.2, w: FWp * 0.35, h: FWp * 0.35 };
        sx = P.x; sy = P.y; side = Math.max(P.w, P.h);
      }

      const cv = document.createElement('canvas');
      cv.width = 84; cv.height = 84;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#1b1410';
      g.fillRect(0, 0, 84, 84);
      g.drawImage(img, sx, sy, side, side, 0, 0, 84, 84);
      this.portraits[cid] = cv;
    }
  },

  // ---- fight HUD -----------------------------------------------------------
  drawHUD(ctx, G) {
    const [f1, f2] = G.fighters;
    // ?guarddemo=1 (debug): P1 pinned in primed guard; P2 loops the block
    // impact every 48 ticks — a live showreel of the seal animation
    // (with &freeze= it stays a single frame for screenshots)
    if (this.guardDemo && f1 && f2) {
      f1.state = 'guard';
      const c = G.tick % 48;
      if (c < 15) { f2.state = 'block'; f2.blockstun = 14 - c; }
      else f2.state = 'guard';
    }

    // smooth "recent damage" ghost values
    for (const f of G.fighters) {
      if (f.dispHp === undefined) f.dispHp = f.hp;
      f.dispHp += (f.hp - f.dispHp) * 0.06;
      if (f.dispHp < f.hp) f.dispHp = f.hp;
    }

    // bars start clear of the portrait frames' gold overhang (was colliding)
    this.healthBar(ctx, G, f1, 136, 470, false);
    this.healthBar(ctx, G, f2, 554, 888, true);
    this.guardBar(ctx, G, f1, 136, 470, false);
    this.guardBar(ctx, G, f2, 554, 888, true);

    // portraits: gold-corner lacquer frame asset (tassel mirrored to the
    // outside); face art = square crops of the select busts, sprite-crop fallback
    const P = this.ua.portrait;
    // face crop framing set by Eric in the layout editor (88-unit space)
    const HUD_CROP = { mack: { x: -2.7, y: -12.3, w: 110.3 }, kenji: { x: 7, y: -5.7, w: 99.3 } };
    for (const [f, px, mir] of [[f1, 12, true], [f2, 924, false]]) {
      const shakeX = f.flash > 0 ? (Math.random() * 4 - 2) : 0;
      const face = (f.c.id === 'kenji' ? this.ua.hudkenji : f.c.id === 'mack' ? this.ua.hudmack : null) || this.ua['hud_' + f.c.id] || this.portraits[f.c.id];
      const selArt = f.c.id === 'kenji' ? this.ua.selkenji : f.c.id === 'mack' ? this.ua.selmack : null;
      const HC = HUD_CROP[f.c.id];
      if (P) {
        const s = 86 / P.inner.w;
        ctx.fillStyle = '#141110';
        ctx.fillRect(px + shakeX, 10, 88, 88);
        if (selArt) {
          ctx.save();
          ctx.filter = 'brightness(1.2) saturate(1.08)'; // HUD 头像提亮, 比选人页更醒目
          ctx.beginPath(); ctx.rect(px + 2 + shakeX, 12, 84, 84); ctx.clip();
          ctx.drawImage(selArt, px + shakeX + HC.x, 10 + HC.y, HC.w, HC.w * 344 / 320);
          ctx.restore();
        } else {
          ctx.save(); ctx.filter = 'brightness(1.2) saturate(1.08)';
          ctx.drawImage(face, px + 2 + shakeX, 12, 84, 84);
          ctx.restore();
        }
        ctx.save();
        if (mir) {
          const cm = px + 44 + shakeX;
          ctx.translate(cm, 0); ctx.scale(-1, 1); ctx.translate(-cm, 0);
        }
        ctx.drawImage(P.cv, px + 1 + shakeX - P.inner.x * s, 11 - P.inner.y * s, P.w * s, P.h * s);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(px - 4 + shakeX, 6, 96, 96);
        ctx.fillStyle = '#8a6a2f';
        ctx.fillRect(px - 2 + shakeX, 8, 92, 92);
        ctx.fillStyle = f.c.theme;
        ctx.fillRect(px + shakeX, 10, 88, 88);
        ctx.drawImage(face, px + 2 + shakeX, 12, 84, 84);
      }
    }

    // names (right one pulled clear of the hp-frame end-scroll ornament)
    this.pixTextMixed(ctx, `${f1.c.name} · ${f1.c.cn}`, 138, 70, { size: 12, color: '#efe6d5', outline: true });
    this.pixTextMixed(ctx, `${f2.c.name} · ${f2.c.cn}`, 862, 70, { size: 12, color: '#efe6d5', align: 'right', outline: true });
    { // M1.1: 阵营标签单一来源 G.p2IsAI / G.mode
      const tag = G.mode === 'training' ? 'DUMMY' : (G.p2IsAI ? 'CPU' : 'P2');
      this.pixText(ctx, tag, 862, 86, { size: 9, color: tag === 'P2' ? '#7ecbff' : '#9a8f78', align: 'right' });
      this.pixText(ctx, 'P1', 162, 86, { size: 9, color: '#ffe27a' });
    }

    // round pips
    for (let i = 0; i < 2; i++) {
      this.pip(ctx, 452 - i * 22, 78, f1.wins > i, f1.c.theme);
      this.pip(ctx, 572 + i * 22, 78, f2.wins > i, f2.c.theme);
    }

    // timer: carved vermillion hanko seal, ink digits on the parchment center
    const SL = this.ua.seal;
    if (SL) {
      const size = 92, ss = size / SL.w;
      ctx.drawImage(SL.cv, 512 - size / 2, 2, size, SL.h * ss);
      const dcy = 2 + (SL.inner.y + SL.inner.h / 2) * ss;
      if (G.mode === 'training') {
        this.pixText(ctx, '--', 512, dcy + 9, { size: 20, align: 'center', color: '#7a231a' });
      } else {
        const tsec = Math.max(0, Math.ceil(G.roundTimer));
        const urgent = tsec <= 10;
        const pulse = urgent && G.tick % 30 < 15;
        this.pixText(ctx, String(tsec).padStart(2, '0'), 512, dcy + (pulse ? 11 : 9), {
          size: pulse ? 24 : 20, align: 'center', color: urgent ? '#c22a20' : '#5f2015',
        });
        if (urgent) { // last-10s red edge pulse
          ctx.globalAlpha = 0.10 + 0.08 * Math.sin(G.tick * 0.3);
          ctx.fillStyle = '#c22a20';
          ctx.fillRect(0, 0, 1024, 5); ctx.fillRect(0, 571, 1024, 5);
          ctx.fillRect(0, 0, 5, 576); ctx.fillRect(1019, 0, 5, 576);
          ctx.globalAlpha = 1;
        }
      }
    } else {
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(478, 12, 68, 54);
      ctx.fillStyle = '#b32b20';
      ctx.fillRect(481, 15, 62, 48);
      ctx.fillStyle = '#d64533';
      ctx.fillRect(483, 17, 58, 4);
      if (G.mode === 'training') {
        this.pixText(ctx, '--', 512, 52, { size: 30, align: 'center', color: '#f4ead6', outline: true });
      } else {
        const tsec = Math.max(0, Math.ceil(G.roundTimer));
        const urgent = tsec <= 10;
        const pulse = urgent && G.tick % 30 < 15;
        this.pixText(ctx, String(tsec).padStart(2, '0'), 512, 52, {
          size: pulse ? 34 : 30, align: 'center', color: urgent ? '#ffe27a' : '#f4ead6', outline: true,
        });
      }
    }

    // power meters
    this.meterBar(ctx, G, f1, 24, false);
    this.meterBar(ctx, G, f2, 700, true);

    // combo counters — attacker's side, upper-mid screen near the fighters so
    // they sit in the player's sightline (moved off the bar row per review)
    this.comboCounter(ctx, G, f1, 240, false);
    this.comboCounter(ctx, G, f2, 784, true);

    // training info bar / key hint bar — auto-sized strips stacked ABOVE the
    // meter labels (y<510) so the bottom rows can never collide or clip
    const strip = (cy, text, color) => {
      const tw = Math.min(this.textW(ctx, text, 12), 940);
      const w = tw + 36, bx = 512 - w / 2;
      ctx.fillStyle = 'rgba(10,8,6,0.8)';
      ctx.fillRect(bx, cy, w, 24);
      ctx.fillStyle = 'rgba(217,164,65,0.5)';
      ctx.fillRect(bx, cy, w, 1);
      ctx.fillRect(bx, cy + 23, w, 1);
      this.pixText(ctx, text, 512, cy + 17, { size: 12, align: 'center', color, maxW: tw });
    };
    if (G.mode === 'training') {
      const names = { stand: 'STAND', guard: 'AUTO-GUARD', cpu: 'CPU' };
      strip(G.showHint ? 442 : 468,
        `TRAINING · T DUMMY: ${names[G.training.dummy]} · R RESET · ∞ 気 · AUTO HEAL · ESC EXIT`, '#ffe27a');
    }
    if (G.showHint) {
      // M1.3: LOCAL VS 双人时上下两条分别给 P1/P2 键位(此前只有 P1, P2 无从知晓按什么)
      if (G.p2IsAI === false) {
        strip(442, 'P1  J LIGHT · K HEAVY · S CROUCH · U SPECIAL · I SUPER · BACK = GUARD', '#ffe27a');
        strip(468, 'P2  , LIGHT · . HEAVY · ↓ CROUCH · / SPECIAL · R-SHIFT SUPER (或小键盘1/2/4/5)', '#7ecbff');
      } else {
        strip(468, 'J LIGHT · K HEAVY · S CROUCH · U SPECIAL · I SUPER · BACK = GUARD · H HIDE', '#c9bfa8');
      }
    }
  },

  healthBar(ctx, G, f, xa, xb, mirror) {
    const A = this.ua.hpframe;
    if (A) {
      // asset frame: fills painted inside the frame's open window, frame on top
      const w = xb - xa, h = 22, y = 24;
      ctx.fillStyle = '#241d18';
      ctx.fillRect(xa, y, w, h);
      const gw = Math.max(0, w * f.dispHp / f.maxHp);
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(mirror ? xb - gw : xa, y, gw, h);
      const hw = Math.max(0, w * f.hp / f.maxHp);
      const low = f.hp <= f.maxHp * 0.2;   // 危险血线按比例, 不写死 30
      ctx.fillStyle = low ? (G.tick % 20 < 10 ? '#ff4a3d' : '#c22a20') : f.c.theme;
      ctx.fillRect(mirror ? xb - hw : xa, y, hw, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(xa, y + 2, w, 2);
      if (!mirror) ctx.drawImage(A.cv, xa - A.fill.x, y - A.fill.y);
      else {
        ctx.save(); ctx.scale(-1, 1);
        ctx.drawImage(A.cv, -(xb + A.fill.x), y - A.fill.y);
        ctx.restore();
      }
      return;
    }
    const w = xb - xa, h = 22, y = 24, skew = 14;
    const quad = (x1, x2, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (!mirror) {
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.lineTo(x2 - (x2 === xb ? skew : 0), y + h);
        ctx.lineTo(x1, y + h);
      } else {
        ctx.moveTo(x1, y); ctx.lineTo(x2, y);
        ctx.lineTo(x2, y + h);
        ctx.lineTo(x1 + (x1 === xa ? skew : 0), y + h);
      }
      ctx.closePath(); ctx.fill();
    };
    // lacquer frame with a gold hairline
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(xa - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(xa - 4, y - 4, w + 8, 2);
    quad(xa, xb, '#241d18');
    // ghost (recent damage)
    const gw = Math.max(0, w * f.dispHp / f.maxHp);
    if (!mirror) quad(xa, xa + gw, '#e8e4d8');
    else quad(xb - gw, xb, '#e8e4d8');
    // actual hp
    const hw = Math.max(0, w * f.hp / f.maxHp);
    const low = f.hp <= f.maxHp * 0.2;   // 危险血线按比例, 不写死 30
    const col = low ? (G.tick % 20 < 10 ? '#ff4a3d' : '#c22a20') : f.c.theme;
    if (!mirror) quad(xa, xa + hw, col);
    else quad(xb - hw, xb, col);
    // shine line
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(xa, y + 2, w, 3);
  },

  guardBar(ctx, G, f, xa, xb, mirror) {
    if (f.guard <= 1) return;
    // 定版(Eric 2026-07-11): 回到 HUD 顶栏 y90(名字/CPU 标签下方净空带, 不与
    // 文字重叠); 头顶版被否 —— 会误读成血条且离角色太近分散注意力。
    // 常驻小字 GUARD 标签标明身份, 快破防(≥65)时整体转红闪 + 感叹号
    const w = (xb - xa) * 0.6, y = this.ua.hpframe ? 90 : 84, h = 5;
    const bx = mirror ? xb - w : xa;
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(bx - 1, y - 1, w + 2, h + 2);
    const gw = w * Math.min(1, f.guard / 100);
    const hot = f.guard >= 65;
    ctx.fillStyle = hot ? (G.tick % 12 < 6 ? '#ff4a3d' : '#ffc531') : '#c9a24b';
    ctx.fillRect(mirror ? bx + w - gw : bx, y, gw, h);
    this.pixText(ctx, hot ? 'GUARD!' : 'GUARD', mirror ? bx - 8 : bx + w + 8, y + 6, {
      size: 8, align: mirror ? 'right' : 'left',
      color: hot ? (G.tick % 12 < 6 ? '#ff4a3d' : '#ffc531') : '#8a7a5f',
    });
  },

  pip(ctx, x, y, won, theme) {
    if (!won) {
      // unwon round = hollow ring (a dimmed crest read as already filled)
      ctx.fillStyle = 'rgba(10,8,6,0.6)';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(217,164,65,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    const M = this.ua.pipmon;
    if (M) {
      const d = 22, mw = d, mh = d * M.h / M.w;
      ctx.drawImage(M.cv, x - mw / 2, y - mh / 2, mw, mh);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = won ? theme : '#252b3d';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.restore();
  },

  meterBar(ctx, G, f, x, mirror) {
    const A = this.ua.meter;
    const isFull = f.meter >= 100;
    if (A) {
      // bamboo capsule asset: dark husk base + gold/vermillion lit overlay
      const y = 538, frac = Math.max(0, Math.min(1, f.meter / 100));
      const dx = x - A.fill.x, dy = y - A.fill.y;
      ctx.save();
      if (mirror) {
        const cm = x + A.fill.w / 2;
        ctx.translate(cm, 0); ctx.scale(-1, 1); ctx.translate(-cm, 0);
      }
      ctx.drawImage(A.empty, dx, dy);
      if (frac > 0.01) {
        const lit = isFull ? (G.tick % 14 < 7 ? A.gold : A.hot) : A.gold;
        ctx.beginPath();
        ctx.rect(x - 2, dy, A.fill.w * frac + 2, A.h);
        ctx.clip();
        ctx.drawImage(lit, dx, dy);
      }
      ctx.restore();
      const lx = mirror ? x + A.fill.w : x, la = mirror ? 'right' : 'left';
      this.pixTextMixed(ctx, isFull ? 'MAX! 超必殺 READY' : '気 POWER', lx, dy - 4, {
        size: 10, align: la, color: isFull ? '#ffe27a' : '#9a8f78',
      });
      return;
    }
    // bamboo-segment power gauge, lacquer + gold
    const w = 300, h = 15, y = 540;
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = '#8a6a2f';
    ctx.fillRect(x - 3, y - 3, w + 6, 2);
    ctx.fillStyle = '#241d18';
    ctx.fillRect(x, y, w, h);
    const mw = w * f.meter / 100;
    const full = f.meter >= 100;
    const col = full ? (G.tick % 14 < 7 ? '#ffe27a' : '#d64533') : '#d9a441';
    ctx.fillStyle = col;
    if (!mirror) ctx.fillRect(x, y, mw, h);
    else ctx.fillRect(x + w - mw, y, mw, h);
    // bamboo notches
    ctx.fillStyle = '#0c0a09';
    for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i - 1, y, 2, h);
    const lx = mirror ? x + w : x, la = mirror ? 'right' : 'left';
    this.pixTextMixed(ctx, full ? 'MAX! 超必殺 READY' : '気 POWER', lx, y - 7, {
      size: 10, align: la, color: full ? '#ffe27a' : '#9a8f78',
    });
  },

  comboCounter(ctx, G, f, x, mirror) {
    if (f.combo.count < 2 || f.combo.timer <= 0) { f.comboShown = 0; return; }
    if (f.comboShown !== f.combo.count) { f.comboShown = f.combo.count; f.comboPop = 10; }
    if (f.comboPop > 0) f.comboPop -= 0.5;
    const scale = 1 + (f.comboPop > 0 ? f.comboPop / 10 * 0.5 : 0);
    ctx.save();
    ctx.translate(x, 185); // upper-mid, just above the fighters' heads
    ctx.scale(scale, scale);
    const SP = this.ua.combofx;
    if (SP) { // vermillion ink splash behind the count
      const d = 96, dir = mirror ? -1 : 1;
      ctx.drawImage(SP.cv, dir * 18 - d / 2, -16 - d / 2, d, d * SP.h / SP.w);
    }
    this.pixText(ctx, String(f.combo.count), 0, 0, { size: 38, align: mirror ? 'right' : 'left', color: '#ffe27a', outline: true, shadow: 4 });
    this.pixText(ctx, 'HITS', mirror ? 2 : -2, 21, { size: 13, align: mirror ? 'right' : 'left', color: '#ff9c3d', outline: true });
    ctx.restore();
  },

  // alpha-weighted vertical centroid of the ink mass → cyFrac, so text can be
  // anchored on where the ink actually is (the brush art is bottom-heavy)
  _inkCentroid(t) {
    const g = t.cv.getContext('2d');
    const d = g.getImageData(0, 0, t.w, t.h).data;
    let sum = 0, n = 0;
    for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
      if (d[(y * t.w + x) * 4 + 3] > 60) { sum += y; n++; }
    }
    t.cyFrac = n ? sum / n / t.h : 0.5;
    return t;
  },

  // sumi ink brush-stroke swash behind announcement text (no-op without the
  // asset); cy = where the ink centroid lands — pass the text's visual center
  inkStroke(ctx, cx, cy, w) {
    const R = this.ua.announce;
    if (!R) return;
    const h = w * R.h / R.w;
    ctx.drawImage(R.cv, cx - w / 2, cy - h * (R.cyFrac || 0.5), w, h);
  },

  // announcement backdrop, style-switchable (?ann=): 'ink'/'ink2' brush swash,
  // 'band' cinematic full-width lacquer band, 'plaque' wooden board,
  // DEFAULT 'band2' full-bleed plaque w/ tassels (2026-07-11 Eric 拍板).
  // Returns true when text should switch to ink-on-parchment colors.
  annBack(ctx, cx, cy, w, mainSize) {
    if (this.ann === 'band2' && this.ua.band2) {
      const B2 = this.ua.band2;
      const bh = 1024 * B2.height / B2.width;
      // 0.32 = parchment-center fraction of band2-cut.png (band_refine.py metric)
      ctx.drawImage(B2, 0, cy - bh * 0.32, 1024, bh);
      return true;
    }
    if (this.ann === 'band' || this.ann === 'band2') {
      const h = mainSize + 44;
      ctx.fillStyle = 'rgba(10,7,6,0.9)';
      ctx.fillRect(0, cy - h / 2, 1024, h);
      // double gold frame + inner vermillion hairline
      ctx.fillStyle = '#8a6a2f';
      ctx.fillRect(0, cy - h / 2, 1024, 2);
      ctx.fillRect(0, cy + h / 2 - 2, 1024, 2);
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(0, cy - h / 2 + 4, 1024, 1);
      ctx.fillRect(0, cy + h / 2 - 5, 1024, 1);
      ctx.fillStyle = 'rgba(179,43,32,0.85)';
      ctx.fillRect(0, cy - h / 2 + 7, 1024, 1);
      ctx.fillRect(0, cy + h / 2 - 8, 1024, 1);
      // kamon medallions flanking the text, diamond accents trailing out
      const M = this.ua.pipmon;
      const mx = w / 2 + 24;
      for (const dir of [-1, 1]) {
        if (M) {
          const d = 34, mh = d * M.h / M.w;
          ctx.drawImage(M.cv, cx + dir * mx - d / 2, cy - mh / 2, d, mh);
        }
        ctx.fillStyle = '#8a6a2f';
        for (let i = 1; i <= 3; i++) {
          const s2 = 5 - i;
          ctx.save();
          ctx.translate(cx + dir * (mx + 26 + i * 24), cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-s2, -s2, s2 * 2, s2 * 2);
          ctx.restore();
        }
      }
      return;
    }
    if (this.ann === 'plaque') {
      const h = mainSize + 46;
      if (this.ua.panel) this.nine(ctx, this.ua.panel, cx - w / 2, cy - h / 2, w, h, 0.22);
      else this.panel(ctx, cx - w / 2, cy - h / 2, w, h, { accent: '#ffc531' });
      return;
    }
    this.inkStroke(ctx, cx, cy, w);
  },

  // ---- announcements --------------------------------------------------------
  // 屏幕切换墨色淡入 (拍板 D): a veil of sumi ink lifts over ~18 ticks on every
  // screen change. Applied by the wrappers at the bottom of this file so it
  // always draws on top; a tick jump (ff fast-forward) suppresses it so
  // ?ff=&freeze= screenshots stay clean.
  _fade(ctx, G) {
    const jumped = this._fadeTick !== undefined && G.tick - this._fadeTick > 2;
    if (G.screen !== this._fadeScr) {
      // boot→title is seamless: same page, the load bar swaps to PRESS ANY KEY
      this._fadeEnd = (this._fadeScr === undefined || this._fadeScr === 'boot' || jumped) ? 0 : G.tick + 18;
      this._fadeScr = G.screen;
    }
    this._fadeTick = G.tick;
    const left = (this._fadeEnd || 0) - G.tick;
    if (left > 0 && left <= 18) {
      ctx.fillStyle = `rgba(6,4,3,${((left / 18) * 0.95).toFixed(3)})`;
      ctx.fillRect(0, 0, 1024, 576);
    }
  },

  drawAnnounce(ctx, G) {
    const a = G.ann;
    if (!a) return;
    const cx = 512, cy = 250;
    const fadeIn = Math.min(1, a.t / 8);
    const life = a.dur - a.t;
    const fadeOut = Math.min(1, life / 10);
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);

    if (a.style === 'ko') {
      const sx = cx + (Math.random() * 8 - 4), sy = cy + (Math.random() * 8 - 4);
      const sc = 1 + Math.max(0, (8 - a.t)) * 0.18;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(sc, sc);
      this.pixText(ctx, a.text, 0, 20, { size: 88, align: 'center', color: '#ff4a3d', outline: true, shadow: 8 });
      ctx.restore();
    } else if (a.style === 'fight') {
      const sc = 1 + Math.max(0, (6 - a.t)) * 0.25;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      this.pixText(ctx, a.text, 0, 15, { size: 56, align: 'center', color: '#ff9c3d', outline: true, shadow: 6 });
      ctx.restore();
    } else if (a.style === 'round') {
      const slide = Math.max(0, 10 - a.t) * 16;
      // band center = cy-12; baseline = center + 0.42em so text sits dead center
      const ink = this.annBack(ctx, cx, cy - 12, 560, 34);
      this.pixText(ctx, a.text, cx - slide, cy + 2, ink
        ? { size: 34, align: 'center', color: '#2a1b10' }
        : { size: 34, align: 'center', color: '#f4f1e8', outline: true, shadow: 5 });
      // ink mode: sub drops below the band's bottom rail (parchment fits one line)
      if (a.sub) this.pixText(ctx, a.sub, cx + slide, cy + (ink ? 62 : 40), { size: 15, align: 'center', color: '#ffc531', outline: true });
    } else { // banner
      const ink = this.annBack(ctx, cx, cy - 10, 640, 30);
      this.pixText(ctx, a.text, cx, cy + 3, ink
        ? { size: 30, align: 'center', color: '#2a1b10' }
        : { size: 30, align: 'center', color: '#f4f1e8', outline: true, shadow: 5 });
      if (a.sub) this.pixText(ctx, a.sub, cx, cy + (ink ? 64 : 42), { size: 16, align: 'center', color: '#ffc531', outline: true });
    }
    ctx.globalAlpha = 1;
  },

  drawSuperBanner(ctx, G) {
    const sb = G.superBanner;
    if (!sb || sb.t <= 0) return;
    ctx.fillStyle = `rgba(5,6,12,${Math.min(0.66, sb.t / 20)})`;
    ctx.fillRect(0, 0, 1024, 576);
    // speed lines
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 10; i++) {
      const ly = (i * 63 + sb.t * 41) % 576;
      ctx.fillRect(0, ly, 1024, 2);
    }
    const f = sb.f;
    const slide = Math.max(0, sb.t - 16) * 26 * (f === G.fighters[0] ? -1 : 1);
    ctx.fillStyle = 'rgba(13,15,22,0.9)';
    ctx.fillRect(0, 220, 1024, 110);
    ctx.fillStyle = f.c.theme;
    ctx.fillRect(0, 220, 1024, 4);
    ctx.fillRect(0, 326, 1024, 4);
    this.pixText(ctx, sb.def.name, 512 + slide, 288, { size: 46, align: 'center', color: '#ffe27a', outline: true, shadow: 6 });
    this.pixTextMixed(ctx, `${f.c.cn} · ${f.c.name}  超必殺`, 512 + slide, 318, { size: 15, align: 'center', color: '#aab3cc' });
  },

  // ---- title ------------------------------------------------------------------
  // brush-font glyph (KouzanBrush) baked to a pixelated sprite: rendered at
  // half size then 2x nearest-neighbor — brush strokes with pixel grain.
  // Tinted variants are cached; 'grad' = parchment→gold vertical gradient.
  _brushGlyph(ch, size, fill) {
    this._glyphCache = this._glyphCache || {};
    const key = ch + '|' + size + '|' + fill;
    if (this._glyphCache[key]) return this._glyphCache[key];
    const half = Math.ceil(size / 2), pad = Math.ceil(half * 0.35), S = half + pad * 2;
    const [scv, sg] = this._cv(S, S);
    sg.imageSmoothingEnabled = true;
    sg.font = `${half}px KouzanBrush, FusionPixelJA, FusionPixel, monospace`;
    sg.textAlign = 'center';
    sg.textBaseline = 'middle';
    sg.fillStyle = '#ffffff';
    sg.fillText(ch, S / 2, S / 2);
    sg.globalCompositeOperation = 'source-in';
    if (fill === 'grad') {
      const gr = sg.createLinearGradient(0, S * 0.12, 0, S * 0.88);
      gr.addColorStop(0, '#f8f0dc');
      gr.addColorStop(0.5, '#eedfb6');
      gr.addColorStop(1, '#d9a441');
      sg.fillStyle = gr;
    } else {
      sg.fillStyle = fill;
    }
    sg.fillRect(0, 0, S, S);
    const [cv, g] = this._cv(S * 2, S * 2);
    g.drawImage(scv, 0, 0, S, S, 0, 0, S * 2, S * 2);
    return (this._glyphCache[key] = { cv, w: S * 2, h: S * 2 });
  },

  // logo-grade kanji: brush glyph + slight rotation; gold style adds heavy
  // lacquer outline + deep-red drop (raw pixel font reads flat at logo size)
  _logoKanji(ctx, ch, x, cy, size, rot, style) {
    ctx.save();
    ctx.translate(x, cy);
    ctx.rotate(rot);
    const body = this._brushGlyph(ch, size, style === 'ink' ? '#241610' : 'grad');
    const ox = -body.w / 2, oy = -body.h / 2;
    if (style === 'ink') {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this._brushGlyph(ch, size, '#140a06').cv, ox + 3, oy + 3);
      ctx.globalAlpha = 1;
    } else {
      const dark = this._brushGlyph(ch, size, '#150e0b');
      const red = this._brushGlyph(ch, size, '#5a100c');
      ctx.globalAlpha = 0.9;
      ctx.drawImage(red.cv, ox + 6, oy + 7);
      ctx.globalAlpha = 1;
      for (const [dx2, dy2] of [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, 3], [-3, 3], [3, -3]]) ctx.drawImage(dark.cv, ox + dx2, oy + dy2);
    }
    ctx.drawImage(body.cv, ox, oy);
    ctx.restore();
  },

  // 标题菜单项几何(六项紧排): drawTitle 绘制 + select2 鼠标热区 + smoke 断言 同源。
  titleItemRect(i) { return { x: 322, y: 318 + i * 35, w: 380, h: 30 }; },

  // loadingP (0..1): boot mode — same page, load bar in the PRESS ANY KEY slot
  drawTitle(ctx, G, loadingP) {
    const V = this.variant || {};
    // 加载态守门(Eric: 加载页与标题页必须像素级一致, 唯一区别=多一根进度条):
    // 三件套(毛笔字体/城门背景/纹章)未全部就绪前只画暗底+进度条, 绝不画降级
    // 版 logo(程序化红日+像素字)。字体也必须查 —— _brushGlyph 会把错字形永久缓存
    if (loadingP !== undefined &&
        !(this.ua.tbg && this.ua.temblem && document.fonts.check('90px KouzanBrush'))) {
      const bg0 = ctx.createLinearGradient(0, 0, 0, 576);
      bg0.addColorStop(0, '#16283c'); bg0.addColorStop(0.55, '#0b1626'); bg0.addColorStop(1, '#050a11');
      ctx.fillStyle = bg0; ctx.fillRect(0, 0, 1024, 576);
      this._loadBar(ctx, G, loadingP);
      return;
    }
    const bgCv = (V.tbg && this.ua.tbg) ? this.ua.tbg.cv : this.bgCanvas(G);
    if (bgCv) {
      ctx.drawImage(bgCv, 0, 0);
    } else {
      // boot: campus art not decoded yet — storm-blue stand-in until it lands
      const bg = ctx.createLinearGradient(0, 0, 0, 576);
      bg.addColorStop(0, '#16283c'); bg.addColorStop(0.55, '#0b1626'); bg.addColorStop(1, '#050a11');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 576);
    }
    ctx.fillStyle = `rgba(7,8,12,${(V.tbg && this.ua.tbg) ? 0.38 : 0.78})`;
    ctx.fillRect(0, 0, 1024, 576);

    // drifting sparks instead of floating idle sprites (they had no ground to
    // stand on over the campus backdrop and read as pasted-in)
    if (!this._embers) {
      this._embers = Array.from({ length: 22 }, () => ({
        x: Math.random() * 1024, y: Math.random() * 576,
        s: 1 + Math.random() * 2.3, v: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.28,
      }));
    }
    for (const e of this._embers) {
      const ex = e.x + Math.sin(G.tick * 0.008 + e.ph) * 34;
      let ey = (e.y - G.tick * e.v) % 576;
      if (ey < 0) ey += 576;
      ctx.globalAlpha = 0.42 + 0.26 * Math.sin(G.tick * 0.05 + e.ph);
      ctx.fillStyle = e.s > 2 ? '#7fd3ff' : '#e8f4ff';
      ctx.fillRect(ex, ey, e.s, e.s);
    }
    ctx.globalAlpha = 1;

    // press-any-key 起始页: 未开始时 Logo 略偏下, 首键后随 intro 归位; 菜单同步淡入
    // 起始位下沉量压到 22px: 校园底图的校名招牌在 y≈278-310, 标题块必须整体留在其上方
    const _ip = G.titleStarted ? Math.min(1, (G.titleIntro || 0) / 30) : 0;
    const _ease = 1 - Math.pow(1 - _ip, 3); // easeOutCubic
    const logoDY = (1 - _ease) * 22;
    const menuA = G.titleStarted ? Math.max(0, Math.min(1, (_ip - 0.4) / 0.6)) : 0;
    ctx.save();
    const bob = Math.sin(G.tick * 0.04) * 4;
    ctx.translate(0, bob + logoDY);
    if (V.te && this.ua.temblem) {
      // title-design preview (?te=...): alt emblem + placeholder name 刀魂;
      // pos = per-kanji [x-frac of W, y-frac of H (char center)]
      const A = this.ua.temblem;
      const KANJI = '电专'; // 校园换皮: 字标 = 重庆电专(title-logo.png 到位时用资产)
      const L = {
        kanban:   { W: 340, y0: 30, pos: [[0.305, 0.60], [0.715, 0.60]], size: 118, color: '#241610', outline: false },
        gunsen:   { W: 350, y0: 22, pos: [[0.365, 0.25], [0.635, 0.25]], size: 106, color: '#241610', outline: false },
        zangetsu: { W: 224, y0: 14, pos: [[0.33, 0.47], [0.67, 0.47]], size: 88, color: '#f4ead6', outline: true },
        torii:    { W: 350, y0: 24, pos: [[0.36, 0.33], [0.64, 0.33]], size: 112, color: '#f4ead6', outline: true },
      }[V.te];
      const W = L.W, H = W * A.h / A.w, x0 = 512 - W / 2;
      ctx.drawImage(A.cv, x0, L.y0, W, H);
      if (this.ua.logo) {
        // M1.2: 血刃定制字标(artlib 烘焙: 楷骨像素笔触+刀痕斩口+贯穿血痕),
        // 与徽记同宽对位, 字心落在原 KANJI 锚点行
        const LG = this.ua.logo, lw = W, lh = W * LG.h / LG.w;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(LG.cv, x0, L.y0 + H * 0.47 - lh / 2, lw, lh);
      } else {
        L.pos.forEach(([fx, fy], i) => {
          const sz = i === 0 ? L.size * 1.05 : L.size * 0.95;
          const dy = i === 0 ? -L.size * 0.05 : L.size * 0.06;
          const rot = i === 0 ? -0.045 : 0.04;
          this._logoKanji(ctx, KANJI[i], x0 + W * fx, L.y0 + H * fy + dy, sz, rot,
            L.outline ? 'gold' : 'ink');
        });
      }
      // occasional gold glint sweeping the logo (拍板 E · B3): a 4-point star
      // sparkles somewhere on the emblem every ~1.5s
      const gcyc = Math.floor(G.tick / 90), gt = G.tick % 90;
      if (gt < 26) {
        const r1 = Math.abs(Math.sin(gcyc * 127.1)) % 1, r2 = Math.abs(Math.sin(gcyc * 311.7)) % 1;
        const gx = x0 + W * (0.2 + 0.6 * r1), gy = L.y0 + H * (0.18 + 0.5 * r2);
        const p = Math.sin((gt / 26) * Math.PI), s = p * 9;
        ctx.globalAlpha = p * 0.9;
        ctx.fillStyle = '#ffe27a';
        ctx.fillRect(gx - s, gy - 1, s * 2, 2);
        ctx.fillRect(gx - 1, gy - s, 2, s * 2);
        ctx.globalAlpha = 1;
      }
      // subY 上限 240: 起始页 logo 下沉 22 + 呼吸 4 之后仍须留在校名招牌(y≈278)之上
      const subY = Math.min(L.y0 + H + 22, 240);
      // M1.2: 副标衬条 —— 与标题背景建筑细节隔离, 保证任何底图上可读
      ctx.fillStyle = 'rgba(6,12,20,0.74)';
      ctx.fillRect(512 - 190, subY - 16, 380, 22);
      ctx.fillStyle = '#2a66a8';
      ctx.fillRect(512 - 190, subY - 16, 380, 1);
      ctx.fillRect(512 - 190, subY + 5, 380, 1);
      this.pixText(ctx, 'ELECTRIC POWER COLLEGE', 512, subY, { size: 14, align: 'center', color: '#f0c83c', outline: true, spacing: 5 });
    } else {
      // 降级层(file:// 直开 canvas 被污染 -> 抠底资产全为 null): 程序化蓝金电力圆徽。
      // 整块压在 y<252, 起始页下沉 22 后仍不压住底图校名招牌(y≈278-310)
      const TE = this.ua.title;
      if (TE) {
        const TW = 212, TH = TW * TE.h / TE.w;
        ctx.drawImage(TE.cv, 512 - TW / 2, 112 - TH / 2, TW, TH);
      } else {
        for (const [r, col] of [[96, '#c8a028'], [90, '#1a3a64'], [84, '#2a66a8']]) {
          ctx.fillStyle = col;
          for (let yy = -r; yy <= r; yy += 4) {
            const half = Math.floor(Math.sqrt(r * r - yy * yy) / 4) * 4;
            ctx.fillRect(512 - half, 112 + yy, half * 2, 4);
          }
        }
      }
      // title-logo.png 不走抠底管线, file:// 也能拿到 —— 优先画真字标
      if (this.ua.logo) {
        const LG = this.ua.logo, lw = 240, lh = lw * LG.h / LG.w;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(LG.cv, 512 - lw / 2, 112 - lh / 2, lw, lh);
      } else {
        this.pixText(ctx, '电专', 512, 142, { size: 72, align: 'center', color: '#f4f8ff', outline: true, shadow: 6 });
      }
      this.pixText(ctx, 'ELECTRIC POWER COLLEGE', 512, 224, { size: 14, align: 'center', color: '#f0c83c', outline: true, spacing: 5 });
      this.pixText(ctx, '- 群英 PIXEL FIGHTING -', 512, 246, { size: 9, align: 'center', color: '#9aa3bd', spacing: 4 });
    }
    ctx.restore();

    // boot: the PRESS ANY KEY slot shows the load bar; on completion the bar
    // is replaced in place by PRESS ANY KEY (seamless — same page)
    if (loadingP !== undefined) {
      this._loadBar(ctx, G, loadingP);
      return;
    }
    // 起始页: 未开始时用脉动的 PRESS ANY KEY 占位(菜单尚未出现)
    if (!G.titleStarted) {
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(G.tick * 0.055));
      ctx.save(); ctx.globalAlpha = pulse;
      this.pixText(ctx, 'PRESS ANY KEY', 512, 515, { size: 20, align: 'center', color: '#ffe27a', outline: true, spacing: 4 });
      this.pixText(ctx, '何かキーを押して', 512, 543, { size: 13, align: 'center', color: '#d9a441' });
      ctx.restore();
      return;
    }
    ctx.save(); ctx.globalAlpha = menuA; // 菜单随 intro 淡入

    // menu: lacquered wood boards with a folding-fan cursor
    // bilingual menu per language policy: EN primary + JP kanji accent
    const items = [['STORY', '物語'], ['CO-OP 副本', '双人'], ['VS CPU', '決闘'], ['LOCAL VS', '対戦'], ['TRAINING', '修行'], ['HOW TO PLAY', '心得']]; // M1.4: 双人副本
    const MP = this.ua.panel, FAN = this.ua.cursor;
    items.forEach((it, i) => {
      const sel = G.titleSel === i;
      const rc = UI.titleItemRect(i);
      const bx = rc.x, by = rc.y, bw = rc.w, bh = rc.h; // 六项紧排(几何与鼠标热区同源)
      if (MP) {
        if (sel) { ctx.save(); ctx.filter = 'brightness(1.5) saturate(1.15)'; }
        this.nine(ctx, MP, bx, by, bw, bh, 0.13);
        if (sel) {
          ctx.restore();
          ctx.fillStyle = 'rgba(255,197,49,0.12)';
          ctx.fillRect(bx + 5, by + 5, bw - 10, bh - 10);
        }
      } else if (sel) {
        ctx.fillStyle = 'rgba(255,197,49,0.14)';
        ctx.fillRect(bx + 10, by + 2, bw - 20, bh - 4);
      }
      if (sel && G.tick % 30 < 22) {
        if (FAN) {
          const fw = 46, fh = fw * FAN.h / FAN.w;
          ctx.drawImage(FAN.cv, bx - fw - 10, by + bh / 2 - fh / 2, fw, fh);
          ctx.save(); ctx.scale(-1, 1);
          ctx.drawImage(FAN.cv, -(bx + bw + fw + 10), by + bh / 2 - fh / 2, fw, fh);
          ctx.restore();
        } else {
          this.pixText(ctx, '▶', bx + 30, by + bh / 2 + 6, { size: 16, color: '#ffc531' });
        }
      }
      // EN + JP drawn as one optically centered line, baseline-middle so both
      // scripts sit dead center of the board regardless of font metrics
      const [en, jp] = it;
      const enW = this.textW(ctx, en, 16), jpW = this.textW(ctx, jp, 16);
      const gap = 14, total = enW + gap + jpW;
      const cyRow = by + bh / 2 + 1;
      this.pixText(ctx, en, 512 - total / 2, cyRow, {
        size: 16, baseline: 'middle', color: sel ? '#ffe27a' : (MP ? '#b3a68d' : '#9aa3bd'), outline: sel,
      });
      // FusionPixel kanji hang lower in the em than PressStart caps — lift 3px
      this.pixText(ctx, jp, 512 - total / 2 + enW + gap, cyRow - 3, {
        size: 16, baseline: 'middle', color: sel ? '#ffc531' : '#8a6a2f', outline: sel,
      });
    });

    const descs = ['剧情闯关 · 五幕推进 · 小兵与关底 BOSS', '双人同屏闯副本 · P1键盘 P2方向键+右手簇 · 共享残机', '挑战电脑 · 三局两胜', '同屏双人对决 · P1键盘左侧 P2方向键+右手簇', '木桩修行 · 无限气 · 自动回血', '完整键位与系统图鉴'];
    this.pixText(ctx, descs[G.titleSel] || '', 512, 532, { size: 10, align: 'center', color: '#9a8f78' });
    this.pixText(ctx, 'W/S SELECT · J OK · M MUTE', 512, 552, { size: 12, align: 'center', color: '#5d6784' });
    ctx.restore(); // 结束菜单淡入 alpha
  },

  // ---- controls / tutorial ------------------------------------------------------
  drawControls(ctx, G, asOverlay = false) {
    if (!asOverlay) {
      ctx.drawImage(this.bgCanvas(G), 0, 0);
      ctx.fillStyle = 'rgba(7,8,12,0.86)';
      ctx.fillRect(0, 0, 1024, 576);
    } else {
      ctx.fillStyle = 'rgba(7,8,12,0.82)';
      ctx.fillRect(0, 0, 1024, 576);
    }
    if (this.ua.panel) this.nine(ctx, this.ua.panel, 62, 40, 900, 496, 0.28);
    else this.panel(ctx, 62, 40, 900, 496, { accent: '#ffc531' });
    // bilingual screen title: JP kanji emphasized, EN beneath (global pattern)
    this.pixText(ctx, '心得', 512, 80, { size: 26, align: 'center', color: '#ffe27a', outline: true });
    this.pixText(ctx, 'HOW TO PLAY', 512, 100, { size: 11, align: 'center', color: '#9a8f78', spacing: 4 });

    // two columns with hard width budgets: col1 desc 252..516, col2 desc 700..934;
    // every line carries maxW so nothing can collide with keycaps or the panel edge
    const rows = [
      ['A D', 'MOVE · BACK = GUARD', 'W', 'JUMP (OK MID-DASH)'],
      ['J', 'LIGHT · ALT SLASHES', 'K', 'HEAVY · AIR = DIVE'],
      ['S', 'CROUCH · J LOW / K UP', 'U I', 'SPECIAL / SUPER'],
      ['A A / D D', 'DASH / BACKDASH', 'ESC', 'PAUSE'],
    ];
    let y = 116;
    for (const [k1, d1, k2, d2] of rows) {
      this.keycap(ctx, 100, y, Math.max(44, k1.length * 13 + 18), k1);
      this.pixText(ctx, d1, 252, y + 26, { size: 12, color: '#efe6d5', maxW: 264 });
      this.keycap(ctx, 548, y, Math.max(44, k2.length * 13 + 18), k2);
      this.pixText(ctx, d2, 700, y + 26, { size: 12, color: '#efe6d5', maxW: 234 });
      y += 46;
    }

    // combo route
    y = 312;
    this.pixTextMixed(ctx, 'COMBO · 連携', 100, y + 20, { size: 15, color: '#ffc531' });
    const route = ['J', 'J', 'K', 'K', 'U', 'I'];
    let rx = 300;
    route.forEach((k, i) => {
      this.keycap(ctx, rx, y - 4, 44, k);
      if (i < route.length - 1) this.pixText(ctx, '→', rx + 52, y + 22, { size: 16, color: '#8892ad' });
      rx += 74;
    });

    // combo + guard essentials (Eric: 原来 4 行太多太乱 → 精简成 2 行, 只留核心)
    ctx.fillStyle = 'rgba(217,164,65,0.1)';
    ctx.fillRect(100, 362, 824, 32);
    this.pixText(ctx, 'J-J-K-K CHAIN · 2ND K = KNOCKDOWN · 3+ HITS = x1.3 · U/I = ALL FIGHTERS', 512, 383, {
      size: 13, align: 'center', color: '#d9a441', maxW: 800,
    });
    this.pixText(ctx, 'GUARD = HOLD AWAY AT IMPACT · FILL GAUGE → GUARD CRUSH', 512, 428, {
      size: 12, align: 'center', color: '#ff9c3d', maxW: 820,
    });

    this.pixText(ctx, asOverlay ? 'J / K  BACK' : 'J  BACK TO TITLE · M MUTE · H HIDE HINTS', 512, 522, {
      size: 14, align: 'center', color: G.tick % 40 < 25 ? '#ffe27a' : '#8892ad', maxW: 820,
    });
  },

  // ---- character select ------------------------------------------------------------
  drawSelect(ctx, G) {
    // ?selbg=moon preview: calm moonlit courtyard distinct from the fight dusk
    const selBg = this.selbg && this.ua.selmoon;
    ctx.drawImage(selBg ? this.ua.selmoon.cv : this.bgCanvas(G), 0, 0);
    ctx.fillStyle = `rgba(7,8,12,${selBg ? 0.45 : 0.84})`;
    ctx.fillRect(0, 0, 1024, 576);

    const s = G.select;

    if (s.phase === 'vs') {
      // VS splash: crossed-katana emblem
      const t = s.vsT;
      const off = Math.max(0, 20 - t) * 18;
      ctx.fillStyle = 'rgba(13,15,22,0.9)';
      ctx.fillRect(0, 150, 1024, 280);
      ctx.fillStyle = '#8a6a2f';
      ctx.fillRect(0, 150, 1024, 2);
      ctx.fillRect(0, 428, 1024, 2);
      // speed lines pull the standoff tension (the diagonal divider bar was
      // cut per review — it read as a stray line behind the emblem)
      ctx.save();
      ctx.globalAlpha = Math.min(1, t / 12) * 0.6;
      ctx.fillStyle = '#8a6a2f';
      for (let i = 0; i < 8; i++) {
        const lw = 110 + ((i * 47) % 130), ly = 172 + i * 32;
        ctx.fillRect(i % 2 ? 1024 - lw : 0, ly, lw, 2);
      }
      ctx.restore();
      // matched busts instead of tiny floor-less idle sprites
      this.drawBust(ctx, s.p1, 118 - off, 158, 264, 232, false, 1);
      this.drawBust(ctx, s.p2, 686 + off, 158, 264, 232, false, 1); // 右立绘再外移, 加大与徽章间距
      this.pixTextMixed(ctx, `${DATA[s.p1].name} · ${DATA[s.p1].cn}`, 250 - off, 480, { size: 20, align: 'center', color: DATA[s.p1].theme, outline: true });
      this.pixTextMixed(ctx, `${DATA[s.p2].name} · ${DATA[s.p2].cn}`, 818 + off, 480, { size: 20, align: 'center', color: DATA[s.p2].theme, outline: true });
      const vsScale = 1 + Math.max(0, 12 - t) * 0.3;
      const VE = this.ua.vs;
      ctx.save(); ctx.translate(512, 290); ctx.scale(vsScale, vsScale);
      if (VE) {
        const W = 236, H = W * VE.h / VE.w;
        ctx.drawImage(VE.cv, -W / 2, -H / 2, W, H);
        this.pixText(ctx, 'VS', 0, 30, { size: 44, align: 'center', color: '#ffc531', outline: true, shadow: 5 });
      } else {
        this.pixText(ctx, 'VS', 0, 34, { size: 72, align: 'center', color: '#ffc531', outline: true, shadow: 6 });
      }
      ctx.restore();
      if (s.training) {
        this.pixText(ctx, 'TRAINING', 512, 530, { size: 15, align: 'center', color: '#9aa3bd' });
      } else {
        // EN 与汉字分开绘制并整体对中: 两种字体基线不齐(FusionPixel 汉字比
        // PressStart 大写沉 ~3px), 混在一串里会错位(Eric 2026-07-11)
        const en = `${AI_DIFFS[s.diff].en} · `, jp = AI_DIFFS[s.diff].label;
        const enW = this.textW(ctx, en, 15), jpW = this.textW(ctx, jp, 15);
        const x0 = 512 - (enW + jpW) / 2;
        this.pixText(ctx, en, x0, 530, { size: 15, color: '#9aa3bd' });
        this.pixText(ctx, jp, x0 + enW, 527, { size: 15, color: '#9aa3bd' });
      }
      return;
    }

    this.pixText(ctx, '選べ、己の剣', 512, 66, { size: 28, align: 'center', color: '#f4ead6', outline: true, shadow: 4 });
    this.pixText(ctx, 'CHOOSE YOUR FIGHTER', 512, 92, { size: 11, align: 'center', color: '#8892ad', spacing: 4 });

    const ids = ['mack', 'kenji'];
    ids.forEach((cid, i) => {
      const c = DATA[cid];
      const x = i === 0 ? 152 : 552;
      const hovered = s.phase === 'char' && s.cursor === i;
      const chosen = s.p1 === cid;
      if (this.ua.panel) {
        if (!hovered && !chosen) { ctx.save(); ctx.filter = 'brightness(0.72)'; }
        this.nine(ctx, this.ua.panel, x, 116, 320, 330, 0.26);
        if (!hovered && !chosen) ctx.restore();
      } else {
        this.panel(ctx, x, 116, 320, 330, {
          border: hovered || chosen ? c.theme : '#3a4157',
          accent: c.theme,
          fill: hovered ? 'rgba(22,26,40,0.95)' : 'rgba(16,19,28,0.92)',
        });
      }
      // bust exactly where Eric placed it in the layout editor (R12): the art
      // pops over the panel frame; nameplate strip is drawn ON TOP of the
      // chest afterwards, so name/type sit on the plate's dark backing
      const B = { mack: { x: 188, y: 89, w: 300 }, kenji: { x: 609, y: 111, w: 262 } }[cid];
      const art = cid === 'kenji' ? this.ua.selkenji : cid === 'mack' ? this.ua.selmack : (this.ua['sel_' + cid] || null); // M1: 扩展名册专属半身像
      if (art) {
        ctx.save();
        if (!(hovered || chosen)) ctx.filter = 'brightness(0.72) saturate(0.9)';
        const z = hovered ? 1.03 : 1, bw = B.w * z, bh = bw * 344 / 320;
        ctx.drawImage(art, B.x - (bw - B.w) / 2, B.y - (bh - B.w * 344 / 320) / 2, bw, bh);
        ctx.restore();
      } else {
        this.drawCharPreview(ctx, cid, x + 160, 344, 2.25, 0, 'idle', cid === 'mack');
      }
      // nameplate near the panel foot: name + TYPE both inside the plate's
      // clear area (knot ornament owns its left ~38px), POW/SPD below the panel
      // POW/SPD inside the frame on a slim lacquer strip above the plate
      ctx.fillStyle = 'rgba(10,7,6,0.72)';
      ctx.fillRect(x + 16, 352, 288, 22);
      ctx.fillStyle = 'rgba(217,164,65,0.45)';
      ctx.fillRect(x + 16, 352, 288, 1);
      ctx.fillRect(x + 16, 373, 288, 1);
      const mini = (mx, label, val) => {
        this.pixText(ctx, label, mx, 368, { size: 9, color: '#9a8f78', spacing: 1 });
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i < val ? c.theme : 'rgba(37,43,61,0.9)';
          ctx.fillRect(mx + 34 + i * 16, 357, 12, 8);
        }
      };
      mini(x + 30, 'POW', c.stats.pow);
      mini(x + 168, 'SPD', c.stats.spd);
      const NP = this.ua.nameplate;
      const plateW = 220, plateH = NP ? plateW * NP.h / NP.w : 60;
      const plateY = 376, plateCy = plateY + plateH / 2;
      if (NP) ctx.drawImage(NP.cv, x + 50, plateY, plateW, plateH);
      // name + TYPE centered in the plate's clear span (knot left, tip right)
      // 名: EN + · + 汉字 分段绘制, 都 baseline:middle 居中不贴边; 汉字比拉丁下沉→上抬 2px 对齐
      const nmCol = hovered || chosen ? c.theme : '#c9bfa8';
      const w1 = this.textW(ctx, c.name, 14), wd = this.textW(ctx, '·', 14), w2 = this.textW(ctx, c.cn, 14);
      const gp = 7, totW = w1 + gp + wd + gp + w2, sx = x + 170 - totW / 2, ny = plateCy - 6;
      this.pixText(ctx, c.name, sx, ny, { size: 14, baseline: 'middle', color: nmCol, outline: true });
      this.pixText(ctx, '·', sx + w1 + gp, ny - 1, { size: 14, baseline: 'middle', color: nmCol });
      this.pixText(ctx, c.cn, sx + w1 + gp + wd + gp, ny - 2, { size: 14, baseline: 'middle', color: nmCol, outline: true });
      this.pixText(ctx, `${c.type} TYPE`, x + 170, plateCy + 16, { size: 9, align: 'center', color: '#9a8f78', spacing: 2, maxW: 140 });
      if (hovered && G.tick % 30 < 20) {
        this.pixText(ctx, '▼', x + 160, 80, { size: 16, align: 'center', color: '#ffc531' });
      }
      if (chosen && s.phase !== 'char') {
        this.pixText(ctx, '1P', x + 18, 146, { size: 14, color: '#ffe27a', outline: true });
      }
    });

    if (s.phase === 'char') {
      this.pixText(ctx, 'A/D SELECT · J OK · K BACK', 512, 500, { size: 12, align: 'center', color: '#9a8f78', spacing: 1 });
      const other = s.cursor === 0 ? 'kenji' : 'mack';
      this.pixText(ctx, s.training ? `DUMMY: ${DATA[other].name}` : `CPU: ${DATA[other].name}`,
        512, 478, { size: 12, align: 'center', color: '#5d6784' });
    } else if (s.phase === 'diff') {
      this.pixTextMixed(ctx, 'DIFFICULTY · 難易度', 512, 478, { size: 15, align: 'center', color: '#ffc531', outline: true });
      const keys = ['easy', 'normal', 'hard'];
      keys.forEach((k, i) => {
        const dd = AI_DIFFS[k];
        const sel = s.diffCursor === i;
        const bx = 262 + i * 180;
        if (this.ua.panel) {
          if (sel) { ctx.save(); ctx.filter = 'brightness(1.5) saturate(1.15)'; }
          this.nine(ctx, this.ua.panel, bx, 490, 160, 40, 0.13);
          if (sel) {
            ctx.restore();
            ctx.fillStyle = 'rgba(255,197,49,0.12)';
            ctx.fillRect(bx + 5, 495, 150, 30);
          }
        } else {
          ctx.fillStyle = sel ? 'rgba(255,197,49,0.16)' : 'rgba(16,19,28,0.8)';
          ctx.fillRect(bx, 490, 160, 40);
          ctx.fillStyle = sel ? '#ffc531' : '#3a4157';
          ctx.fillRect(bx, 490, 160, 3);
        }
        this.pixText(ctx, `${dd.label} ${dd.en}`, bx + 80, 516, {
          size: 13, align: 'center', color: sel ? '#ffe27a' : (this.ua.panel ? '#b3a68d' : '#9aa3bd'),
        });
      });
      const dd = AI_DIFFS[keys[s.diffCursor]];
      this.pixText(ctx, dd.desc + '   (A/D SELECT · J FIGHT · K BACK)', 512, 552, { size: 12, align: 'center', color: '#9a8f78' });
    }
  },

  // ---- result -----------------------------------------------------------------------
  drawResult(ctx, G) {
    const r = G.result;
    const winner = r.winner;
    const playerWon = winner === G.fighters[0];

    // victory quotes in Japanese-flavored English (UI-layer table; data.js untouched)
    const QUOTES_EN = {
      mack: 'The blade... returns to its sheath.',
      kenji: '...Too slow.',
    };

    // winner bust per the layout editor (Eric placed hayato; kenji derived by
    // matching the displayed eye-line and face center: same anchors, own scale)
    const RW = { mack: { x: 392, y: 199, w: 266 }, kenji: { x: 409, y: 212, w: 232 } }[winner.c.id] || { x: 392, y: 199, w: 266 }; // M1: 新角色用 mack 版式
    const wart = winner.c.id === 'kenji' ? this.ua.selkenji : winner.c.id === 'mack' ? this.ua.selmack : (this.ua['sel_' + winner.c.id] || null);

    // 2026-07-11 R6 换皮 (静态稿拍板后实装): full-bleed sun/moon backdrop,
    // 现网 layout 不动 — 标题改画在通栏匾额上(胜=朱漆金穗/败=藍染銀月,
    // 与回合公告匾同字体同字号), 其余元素(勝利/敗北·MAX COMBO·居中立绘·
    // 台词框·按键行)与旧版像素级同位。素材缺任何一件则整体回退旧画法。
    const BG = playerWon ? this.ua.reswin : this.ua.reslose;
    const TB = playerWon ? this.ua.bandwin : this.ua.bandlose;
    if (BG && TB) {
      ctx.drawImage(BG, 0, 0, 1024, 576);
      if (wart) ctx.drawImage(wart, RW.x, RW.y, RW.w, RW.w * 344 / 320);
      else this.drawBust(ctx, winner.c.id, 384, 246, 256, 190, false);
      const bh = 1024 * TB.height / TB.width;
      ctx.drawImage(TB, 0, 114 - bh * 0.32, 1024, bh); // parchment center 114
      this.pixText(ctx, playerWon ? 'VICTORY' : 'DEFEAT', 512, 128, { // 114 + 0.42em
        size: 34, align: 'center', color: playerWon ? '#2a1b10' : '#1a2028', spacing: 4,
      });
      this.pixText(ctx, playerWon ? '勝利' : '敗北', 512, 194, { size: 22, align: 'center', color: '#f4f1e8', outline: true });
      this.pixText(ctx, `MAX COMBO: ${G.stats.maxCombo} ${G.stats.maxCombo === 1 ? 'HIT' : 'HITS'}`, 512, 220, { size: 13, align: 'center', color: '#c9d2e8', outline: true });
      const quote2 = `${winner.c.name}: "${QUOTES_EN[winner.c.id] || winner.c.quoteWin}"`;
      // 11 = 最长台词(剣二)不触发 maxW 缩放的字号 → 两个角色的台词字号统一
      const qw2 = Math.ceil(this.textW(ctx, quote2, 11)) + 44;
      if (this.ua.panel) this.nine(ctx, this.ua.panel, 512 - qw2 / 2, 428, qw2, 62, 0.14);
      else this.panel(ctx, 512 - qw2 / 2, 428, qw2, 62, { accent: winner.c.theme });
      this.pixText(ctx, quote2, 512, 464, { size: 11, align: 'center', color: '#dfe4f2' });
      this.pixText(ctx, 'J REMATCH · K CHARACTER · ESC TITLE', 512, 530, {
        size: 14, align: 'center', color: G.tick % 40 < 25 ? '#ffe27a' : '#8892ad',
      });
      return;
    }

    ctx.drawImage(this.bgCanvas(G), 0, 0);
    ctx.fillStyle = 'rgba(7,8,12,0.82)';
    ctx.fillRect(0, 0, 1024, 576);

    if (wart) ctx.drawImage(wart, RW.x, RW.y, RW.w, RW.w * 344 / 320);
    else this.drawBust(ctx, winner.c.id, 384, 246, 256, 190, false);

    const RB = this.ua.announce;
    if (RB) this.annBack(ctx, 512, 114, 640, 46); // band center 114
    this.pixText(ctx, playerWon ? 'VICTORY' : 'DEFEAT', 512, 133, { // 114 + 0.42em
      size: 46, align: 'center', color: playerWon ? '#ffc531' : '#f4ead6', outline: true, shadow: 6, spacing: 6,
    });
    this.pixText(ctx, playerWon ? '勝利' : '敗北', 512, RB ? 194 : 172, { size: 22, align: 'center', color: '#f4f1e8', outline: true }); // 下移 176->194: 不压顶部彩带下边框(Eric)

    const quote = `${winner.c.name}: "${QUOTES_EN[winner.c.id] || winner.c.quoteWin}"`;
    // box hugs the text (long quotes shrank past pixText's size floor and overflowed a fixed box)
    const qw = Math.min(560, Math.ceil(this.textW(ctx, quote, 13)) + 44);
    if (this.ua.panel) this.nine(ctx, this.ua.panel, 512 - qw / 2, 428, qw, 62, 0.14);
    else this.panel(ctx, 512 - qw / 2, 428, qw, 62, { accent: winner.c.theme });
    this.pixText(ctx, quote, 512, 465, {
      size: 13, align: 'center', color: '#dfe4f2', maxW: qw - 44,
    });

    this.pixText(ctx, `MAX COMBO: ${G.stats.maxCombo} ${G.stats.maxCombo === 1 ? 'HIT' : 'HITS'}`, 512, RB ? 220 : 218, { size: 13, align: 'center', color: '#9aa3bd' });

    this.pixText(ctx, 'J REMATCH · K CHARACTER · ESC TITLE', 512, 530, {
      size: 14, align: 'center', color: G.tick % 40 < 25 ? '#ffe27a' : '#8892ad',
    });
  },

  // ---- pause ------------------------------------------------------------------------
  drawPause(ctx, G) {
    if (G.pauseView === 'keys') { Howto.draw(ctx, G); return; } // 新图鉴(旧文字版仅存 git)
    ctx.fillStyle = 'rgba(7,8,12,0.7)';
    ctx.fillRect(0, 0, 1024, 576);
    if (this.ua.panel) this.nine(ctx, this.ua.panel, 352, 178, 320, 220, 0.2);
    else this.panel(ctx, 352, 178, 320, 220, { accent: '#ffc531' });
    // bilingual screen title: JP kanji emphasized, EN beneath (global pattern)
    this.pixText(ctx, '一時停止', 512, 226, { size: 22, align: 'center', color: '#ffe27a', outline: true });
    this.pixText(ctx, 'PAUSED', 512, 246, { size: 10, align: 'center', color: '#9a8f78', spacing: 4 });
    const rows = [['J', 'RESUME'], ['K', 'HOW TO PLAY'], ['ESC', 'QUIT TO TITLE']];
    let ry = 262;
    for (const [k, label] of rows) {
      this.keycap(ctx, 396, ry, Math.max(38, k.length * 13 + 16), k);
      this.pixText(ctx, label, 458, ry + 25, { size: 13, color: '#dfe4f2', maxW: 190 });
      ry += 44;
    }
  },

  // ==== 和风 asset pipeline ===================================================
  // Gemini-generated 1024px source art in assets/ui-lab/ is processed at boot:
  // background knockout (flood fill from borders / from center for hollow
  // frames), alpha-bbox trim, inner-window metrics, and pre-composed
  // display-size canvases for the HUD bars. Every step is fail-safe: a broken
  // asset leaves ua[key] = null and the programmatic drawing takes over.
  async loadAssets(onProgress) {
    const jobs = {
      portrait: () => this._procHole('portrait-frame.png'),
      hpframe:  () => this._procHpFrame(),
      meter:    () => this._procMeter(),
      panel:    () => this._procPanel(),
      keycap:   () => this._procKeycap(),
      seal:     () => this._procSeal(),
      title:    () => this._procSimple('title-emblem.png'),
      logo:     () => this._loadImg('title-logo.png').then(i => ({ cv: i, w: i.width, h: i.height })), // M1.2 血刃定制字标
      vs:       () => this._procSimple('vs-emblem-v2.png'),
      stage:    () => this._procStage(),
      announce: () => this._procSimple('announce-brush.png').then(t => this._inkCentroid(t)),
      // 2026-07-11 R6 换皮: full-bleed plaque bands (公告黑金/胜朱漆/败藍染,
      // band_refine.py 像素化烘焙) + result sun/moon backdrops
      band2:    () => this._loadImg('band2-cut.png'),
      bandwin:  () => this._loadImg('band-win.png'),
      bandlose: () => this._loadImg('band-lose.png'),
      reswin:   () => this._loadImg('result-win.png'),
      reslose:  () => this._loadImg('result-lose.png'),
      cursor:   () => this._procSimple('cursor-fan.png'),
      // size-matched character-select busts (pre-composed transparent, 320x344)
      selmack:  () => this._loadImg('portrait-hayato-sel.png'),
      selkenji: () => this._loadImg('portrait-kenji-sel.png'),
      // square face crops of the same busts for the battle HUD (168px → 84)
      hudmack:  () => this._loadImg('portrait-hayato-hud.png'),
      hudkenji: () => this._loadImg('portrait-kenji-hud.png'),
      pipmon:   () => this._procSimple('pip-mon.png'),           // round-win crest
      combofx:  () => this._procSimple('combo-splash.png'),      // combo backdrop
      nameplate:() => this._procSimple('nameplate.png'),         // name bar (knot on left)
    };
    // title design: DEFAULT = 电专 emblem × 校园夜雷 bg × brush 电专 wordmark.
    // URL overrides: ?te=kanban|gunsen|zangetsu|torii & ?tbg=campus|moon|gate & ?tk=off
    const q = new URLSearchParams(location.search);
    const TE_FILES = {
      kanban: ['title-kanban.png', 38], gunsen: ['title-gunsen.png', 38],
      zangetsu: ['title-zangetsu.png', 38], torii: ['title-torii.png', 24],
    };
    // campus 是 1024x576 直出成品(artlib/bake_titlebg_campus.py), top=0 即整幅
    const TBG_FILES = { campus: ['titlebg-campus.png', 0], moon: ['titlebg-moon.png', 40], gate: ['titlebg-gate.png', 150] };
    const te = TE_FILES[q.get('te')] ? q.get('te') : 'zangetsu';
    const tbg = TBG_FILES[q.get('tbg')] ? q.get('tbg') : 'campus';
    this.variant = { te, tbg };
    jobs.temblem = () => this._procSimple(...TE_FILES[te]);
    jobs.tbg = () => this._procTitleBg(...TBG_FILES[tbg]);
    // logo brush font must be ready before the first frame bakes glyph sprites
    jobs.brushfont = async () => {
      await Promise.race([document.fonts.load('90px KouzanBrush'), new Promise(r => setTimeout(r, 2500))]);
      return true;
    };
    // announcement backdrop: DEFAULT = band2 full-bleed plaque w/ tassels
    // (2026-07-11 Eric 拍板 R6); ?ann=band 切回旧漆带, ink/plaque/ink2 备选
    this.ann = ['ink', 'plaque', 'ink2', 'band'].includes(q.get('ann')) ? q.get('ann') : 'band2';
    if (this.ann === 'ink2') jobs.announce = () => this._procSimple('announce-brush-slim.png').then(t => this._inkCentroid(t));
    this.guardDemo = q.has('guarddemo'); // debug: freeze-frame the guard crescents
    // select screen uses the moonlit courtyard by default (拍板 C); ?selbg=dusk reverts
    this.selbg = q.get('selbg') !== 'dusk';
    if (this.selbg) jobs.selmoon = () => this._procTitleBg('titlebg-moon.png', 40);

    // ?loaddelay=N — debug: pause N ms per asset so the loading screen can be
    // watched/reviewed (it flashes by on a fast/cached machine). 0 in normal use.
    const loadDelay = Math.max(0, Math.min(600, parseInt(q.get('loaddelay'), 10) || 0));
    // the loading screen IS the title page — fetch its three ingredients first
    // so the boot screen becomes the real page as early as possible, then
    // stream the REST CONCURRENTLY: the old serial `await` paid one full
    // network round-trip per asset (~30×RTT ≈ 一分钟 on high-latency VPN links)
    // M1.3: logo 提入优先队列且先于 temblem —— 修复标题短暂闪现字体回退版
    // 字标的问题(drawTitle 以 temblem 就绪为门槛, logo 若后到会先画 _logoKanji)
    const pr = k => { const i = ['brushfont', 'tbg', 'logo', 'temblem'].indexOf(k); return i < 0 ? 9 : i; };
    const entries = Object.entries(jobs).sort((a, b) => pr(a[0]) - pr(b[0]));
    let done = 0;
    const runJob = async ([k, fn]) => {
      try { this.ua[k] = await fn(); }
      catch (e) { console.warn('UI asset "' + k + '" failed, using fallback:', e); this.ua[k] = null; }
      if (loadDelay) await new Promise(r => setTimeout(r, loadDelay));
      done++;
      if (onProgress) onProgress(done / entries.length); // drives the loading bar
    };
    for (const e of entries.slice(0, 4)) await runJob(e); // title quartet, in order
    await Promise.all(entries.slice(4).map(runJob));      // everything else at once
  },

  // boot/loading screen — literally the press-any-key title page (same bg,
  // embers, emblem, brush 刀魂) with a load bar in the PRESS ANY KEY slot.
  // main.js starts the render loop before assets resolve; drawTitle degrades
  // gracefully (gradient bg / fallback logo) until its own art lands, which
  // loadAssets fetches first.
  drawLoading(ctx, G, progress) {
    this.drawTitle(ctx, G, Math.max(0, Math.min(1, progress || 0)));
  },

  // lacquer load bar, sitting where PRESS ANY KEY will appear
  _loadBar(ctx, G, p) {
    const bw = 340, bh = 12, bx = 512 - bw / 2, by = 506;
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(G.tick * 0.055));
    ctx.save(); ctx.globalAlpha = pulse;
    this.pixText(ctx, 'NOW LOADING', bx, by - 10, { size: 11, color: '#d9a441', spacing: 3 });
    ctx.restore();
    this.pixText(ctx, Math.round(p * 100) + '%', bx + bw, by - 10, { size: 11, align: 'right', color: '#ffe27a' });
    ctx.fillStyle = '#050a11'; ctx.fillRect(bx, by, bw, bh);
    const fw = Math.round(bw * p);
    if (fw > 0) {
      const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      fg.addColorStop(0, '#1a3a64'); fg.addColorStop(0.6, '#2a66a8'); fg.addColorStop(1, '#f0c83c');
      ctx.fillStyle = fg; ctx.fillRect(bx, by, fw, bh);
      ctx.fillStyle = 'rgba(255,231,138,0.95)'; ctx.fillRect(bx + Math.max(0, fw - 2), by, 2, bh); // leading glint
    }
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  },

  // square scene art → 1024x576 band starting at source row `top`
  async _procTitleBg(file, top) {
    const img = await this._loadImg(file);
    const [cv, g] = this._cv(1024, 576);
    const sw = img.width, sh = Math.round(sw * 576 / 1024);
    g.drawImage(img, 0, Math.min(top, img.height - sh), sw, sh, 0, 0, 1024, 576);
    return { cv, w: 1024, h: 576 };
  },

  _loadImg(file) {
    // M1.2: UI 资产整体切换到自产资产库 assets/uilib(artlib/bake_uilib.py 生成,
    // 「电力·蓝金」体系) —— 原 ui-lab(AI 绘)不再被引用, 构建不再打包
    // UILIB_V: 资产同名重烘焙(青铜红金 -> 电力蓝金)后浏览器仍吃旧缓存, 必须带版本号。
    // file:// 下查询串会被当成路径的一部分导致 404, 所以只在 http(s) 加
    const qv = (typeof location !== 'undefined' && location.protocol === 'file:') ? '' : '?v=' + UI.UILIB_V;
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      const tryPng = () => {   // webp 未命中时回退同名 png(相对路径), 双保险
        const i2 = new Image();
        i2.onload = () => res(i2);
        i2.onerror = () => rej(new Error('missing ' + file));
        i2.src = 'assets/uilib/' + file + qv;
      };
      i.onload = () => res(i);
      i.onerror = tryPng;
      i.src = '/assets/uilib/' + file.replace(/\.png$/, '.webp') + qv;
    });
  },

  _cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  },

  _srcData(img, crop) {
    const r = crop || { x: 0, y: 0, w: img.width, h: img.height };
    const [cv, g] = this._cv(r.w, r.h);
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return { cv, g, id: g.getImageData(0, 0, r.w, r.h), w: r.w, h: r.h };
  },

  _cornerBg(id, w, h) {
    const d = id.data; let r = 0, g = 0, b = 0, n = 0;
    for (const [cx, cy] of [[0, 0], [w - 8, 0], [0, h - 8], [w - 8, h - 8]]) {
      for (let y = cy; y < cy + 8; y++) for (let x = cx; x < cx + 8; x++) {
        const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    }
    return [r / n, g / n, b / n];
  },

  _borderSeeds(w, h) {
    const s = [];
    for (let x = 0; x < w; x += 3) s.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y += 3) s.push([0, y], [w - 1, y]);
    return s;
  },

  // flood-erase (alpha=0) pixels color-connected to seeds; returns erased bbox
  _flood(id, w, h, seeds, bg, tol) {
    const d = id.data, t2 = tol * tol;
    const seen = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const ok = i => {
      const j = i * 4, dr = d[j] - bg[0], dg = d[j + 1] - bg[1], db = d[j + 2] - bg[2];
      return dr * dr + dg * dg + db * db < t2;
    };
    for (const [sx, sy] of seeds) {
      const i = sy * w + sx;
      if (!seen[i] && ok(i)) { seen[i] = 1; q[qt++] = i; }
    }
    let x1 = w, y1 = h, x2 = -1, y2 = -1;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i - x) / w;
      d[i * 4 + 3] = 0;
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y;
      if (x > 0 && !seen[i - 1] && ok(i - 1)) { seen[i - 1] = 1; q[qt++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && ok(i + 1)) { seen[i + 1] = 1; q[qt++] = i + 1; }
      if (y > 0 && !seen[i - w] && ok(i - w)) { seen[i - w] = 1; q[qt++] = i - w; }
      if (y < h - 1 && !seen[i + w] && ok(i + w)) { seen[i + w] = 1; q[qt++] = i + w; }
    }
    return x2 < 0 ? null : { x1, y1, x2, y2 };
  },

  _alphaBBox(id, w, h) {
    const d = id.data;
    let x1 = w, y1 = h, x2 = -1, y2 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (d[(row + x) * 4 + 3] > 8) {
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
    }
    if (x2 < 0) throw new Error('asset fully transparent after knockout');
    return { x1, y1, x2, y2 };
  },

  // write id back into dat.cv, crop to alpha bbox → {cv,w,h,ox,oy}
  _trim(dat) {
    dat.g.putImageData(dat.id, 0, 0);
    const b = this._alphaBBox(dat.id, dat.w, dat.h);
    const [cv, g] = this._cv(b.x2 - b.x1 + 1, b.y2 - b.y1 + 1);
    g.drawImage(dat.cv, -b.x1, -b.y1);
    return { cv, w: cv.width, h: cv.height, ox: b.x1, oy: b.y1 };
  },

  _eraseRect(id, w, x, y, rw, rh) {
    const d = id.data;
    for (let yy = y; yy < y + rh; yy++)
      for (let xx = x; xx < x + rw; xx++) d[(yy * w + xx) * 4 + 3] = 0;
  },

  // plain asset: knockout outer bg + trim
  async _procSimple(file, tol = 38) {
    const img = await this._loadImg(file);
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, tol);
    return this._trim(dat);
  },

  // hollow frame: knockout outer bg AND enclosed center hole; record hole rect
  async _procHole(file, tol = 38) {
    const img = await this._loadImg(file);
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, tol);
    const ob = this._alphaBBox(dat.id, dat.w, dat.h);
    const hole = this._flood(dat.id, dat.w, dat.h,
      [[Math.round((ob.x1 + ob.x2) / 2), Math.round((ob.y1 + ob.y2) / 2)]], bg, tol);
    if (!hole) throw new Error('no center hole found in ' + file);
    const t = this._trim(dat);
    t.inner = { x: hole.x1 - t.ox, y: hole.y1 - t.oy, w: hole.x2 - hole.x1 + 1, h: hole.y2 - hole.y1 + 1 };
    return t;
  },

  // health bar: open frame (rails + end scrolls) → pre-composed display canvas.
  // The fill window (transparent run between the rails / between the caps) maps
  // exactly onto the 354x22 HP fill used by drawHUD.
  async _procHpFrame() {
    const img = await this._loadImg('healthbar-frame.png');
    const dat = this._srcData(img);
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    const t = this._trim(dat);
    const g = t.cv.getContext('2d');
    const id = g.getImageData(0, 0, t.w, t.h);
    const a = (x, y) => id.data[(y * t.w + x) * 4 + 3] > 8;
    // fill window: transparent run through the frame center
    const cy = Math.round(t.h / 2), cx = Math.round(t.w / 2);
    let fx1 = cx, fx2 = cx, fy1 = cy, fy2 = cy;
    while (fx1 > 0 && !a(fx1 - 1, cy)) fx1--;
    while (fx2 < t.w - 1 && !a(fx2 + 1, cy)) fx2++;
    while (fy1 > 0 && !a(cx, fy1 - 1)) fy1--;
    while (fy2 < t.h - 1 && !a(cx, fy2 + 1)) fy2++;
    if (fx2 - fx1 < t.w * 0.5 || fy2 - fy1 < 20) throw new Error('hp frame window detect failed');
    const FW = 354, FH = 22; // display fill size (must match drawHUD bars)
    const s = FH / (fy2 - fy1 + 1);
    const capL = fx1, capR = t.w - fx2 - 1;
    const W = Math.round(FW + (capL + capR) * s), H = Math.round(t.h * s);
    const [cv, c] = this._cv(W, H);
    const cut = 70; // slice a bit inside the fill so end art keeps its aspect
    const lw = Math.round((capL + cut) * s), rw = Math.round((capR + cut) * s);
    c.drawImage(t.cv, 0, 0, capL + cut, t.h, 0, 0, lw, H);
    c.drawImage(t.cv, fx2 - cut, 0, capR + cut + 1, t.h, W - rw, 0, rw, H);
    c.drawImage(t.cv, capL + cut, 0, fx2 - cut - capL - cut, t.h, lw, 0, W - lw - rw, H);
    return { cv, w: W, h: H, fill: { x: Math.round(capL * s), y: Math.round(fy1 * s), w: FW, h: FH } };
  },

  // power meter: bamboo capsule cropped out of the ornamental sheet, three
  // recolored variants (empty husk / gold charge / vermillion MAX) composed at
  // display size with tiled bamboo segments.
  async _procMeter() {
    const img = await this._loadImg('meter-bar.png');
    const C = { x: 104, y: 392, w: 815, h: 233 };      // capsule crop (measured)
    const dat = this._srcData(img, C);
    this._eraseRect(dat.id, dat.w, 236, 0, 351, 20);   // sun disc overlap (top)
    this._eraseRect(dat.id, dat.w, 91, 209, 634, 24);  // banner overlap (bottom)
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    dat.g.putImageData(dat.id, 0, 0);
    const bb = this._alphaBBox(dat.id, dat.w, dat.h);
    // measured features in crop coords → trimmed coords
    const knot0 = 191.5 - bb.x1, knot1 = 335.5 - bb.x1, knot3 = 623 - bb.x1;
    const band = { x1: 56 - bb.x1, x2: 755 - bb.x1, y1: 68 - bb.y1, y2: 164 - bb.y1 };
    const tw = bb.x2 - bb.x1 + 1, th = bb.y2 - bb.y1 + 1;
    const variant = (mode) => {
      const [vc, vg] = this._cv(tw, th);
      vg.drawImage(dat.cv, -bb.x1, -bb.y1);
      const vid = vg.getImageData(0, 0, tw, th), d = vid.data;
      for (let y = Math.max(0, band.y1); y <= Math.min(th - 1, band.y2); y++) {
        for (let x = Math.max(0, band.x1); x <= Math.min(tw - 1, band.x2); x++) {
          const i = (y * tw + x) * 4;
          if (d[i + 3] < 8) continue;
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (lum <= 55) continue; // keep dark knots / track
          if (mode === 'empty') { d[i] *= 0.30; d[i + 1] *= 0.30; d[i + 2] *= 0.30; }
          else {
            const tt = Math.max(0, Math.min(1, (lum - 45) / 170));
            const ramp = mode === 'gold'
              ? [107 + 148 * tt, 74 + 152 * tt, 26 + 96 * tt]
              : [122 + 133 * tt, 20 + 130 * tt, 16 + 44 * tt];
            d[i] = ramp[0]; d[i + 1] = ramp[1]; d[i + 2] = ramp[2];
          }
        }
      }
      vg.putImageData(vid, 0, 0);
      return vc;
    };
    // compose display-size: end caps at native scale, 12 tiled bamboo segments
    const FW = 300, FH = 34;                            // fill width / frame height
    const s = FH / th;
    const leftW = knot0 * s, rightW = (tw - knot3) * s;
    const fillL = (knot0 - band.x1) * s, fillR = (band.x2 - knot3) * s;
    const midW = FW - fillL - fillR;
    const N = 12, tileW = midW / N, tileSrcW = knot1 - knot0;
    const W = Math.round(leftW + midW + rightW), H = FH;
    const compose = (srcCv) => {
      const [cv, c] = this._cv(W, H);
      c.drawImage(srcCv, 0, 0, knot0, th, 0, 0, leftW, H);
      for (let i = 0; i < N; i++)
        c.drawImage(srcCv, knot0, 0, tileSrcW, th, leftW + i * tileW, 0, tileW + 0.5, H);
      c.drawImage(srcCv, knot3, 0, tw - knot3, th, leftW + midW, 0, rightW, H);
      return cv;
    };
    return {
      empty: compose(variant('empty')), gold: compose(variant('gold')), hot: compose(variant('hot')),
      w: W, h: H,
      fill: { x: band.x1 * s, y: band.y1 * s, w: FW, h: (band.y2 - band.y1 + 1) * s },
    };
  },

  // menu board: erase the hanging rope knot (clone clean board columns over it)
  async _procPanel() {
    const img = await this._loadImg('menu-panel.png');
    const dat = this._srcData(img);
    const d = dat.id.data;
    for (let y = 300; y <= 452; y++) {
      for (let x = 452; x <= 572; x++) {
        const i = (y * dat.w + x) * 4, j = (y * dat.w + x + 220) * 4;
        d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; d[i + 3] = d[j + 3];
      }
    }
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 38);
    return this._trim(dat);
  },

  async _procKeycap() {
    const img = await this._loadImg('keycap.png');
    const dat = this._srcData(img);
    const d = dat.id.data;
    // erase the red petal decorations on the key face (noise under labels)
    for (let y = 330; y <= 600; y++) {
      for (let x = 340; x <= 690; x++) {
        const i = (y * dat.w + x) * 4;
        if (d[i] > 100 && d[i] > d[i + 1] * 1.6 && d[i] > d[i + 2] * 1.6) {
          d[i] = 50; d[i + 1] = 41; d[i + 2] = 43;
        }
      }
    }
    const bg = this._cornerBg(dat.id, dat.w, dat.h);
    this._flood(dat.id, dat.w, dat.h, this._borderSeeds(dat.w, dat.h), bg, 34);
    return this._trim(dat);
  },

  async _procSeal() {
    const t = await this._procSimple('timer-seal.png');
    // parchment window: light-pixel bbox scanned inside the central region
    const g = t.cv.getContext('2d');
    const id = g.getImageData(0, 0, t.w, t.h), d = id.data;
    let x1 = t.w, y1 = t.h, x2 = -1, y2 = -1;
    for (let y = Math.round(t.h * 0.2); y < t.h * 0.8; y++) {
      for (let x = Math.round(t.w * 0.2); x < t.w * 0.8; x++) {
        const i = (y * t.w + x) * 4;
        if (d[i + 3] > 8 && d[i] > 170 && d[i + 1] > 140 && d[i + 2] > 90) {
          if (x < x1) x1 = x; if (x > x2) x2 = x;
          if (y < y1) y1 = y; if (y > y2) y2 = y;
        }
      }
    }
    if (x2 < 0) throw new Error('seal parchment not found');
    t.inner = { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
    return t;
  },

  // alt stage: crop the letterboxed painting, land its ground line on y=480,
  // extend the sky upward with a gradient + stars
  async _procStage() {
    const img = await this._loadImg('stage-alt.png');
    const C = { x: 102, y: 340, w: 815, h: 347 }, groundRel = 268; // measured
    const s = 1024 / C.w;
    const top = Math.round(480 - groundRel * s);
    const [cv, g] = this._cv(1024, 576);
    // sky: sample content top rows
    const sd = this._srcData(img, { x: C.x, y: C.y, w: C.w, h: 4 });
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < sd.id.data.length; i += 16) { r += sd.id.data[i]; gg += sd.id.data[i + 1]; b += sd.id.data[i + 2]; n++; }
    r /= n; gg /= n; b /= n;
    const grad = g.createLinearGradient(0, 0, 0, top + 6);
    grad.addColorStop(0, `rgb(${Math.round(r * 0.30)},${Math.round(gg * 0.30)},${Math.round(b * 0.34)})`);
    grad.addColorStop(1, `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, top + 6);
    let seed = 20260704;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 48; i++) {
      g.fillStyle = rnd() < 0.3 ? 'rgba(216,182,166,0.8)' : 'rgba(150,110,100,0.7)';
      g.fillRect(Math.round(rnd() * 1024), Math.round(rnd() * top * 0.82), 2, 2);
    }
    g.drawImage(img, C.x, C.y, C.w, C.h, 0, top, Math.round(C.w * s), Math.round(C.h * s));
    return { cv, w: 1024, h: 576 };
  },

  // 9-slice with tiled edges/center: corners keep aspect at borderScale
  nine(ctx, A, x, y, w, h, bs = 0.16, inset = 56) {
    const iw = inset * bs;
    const tile = (sx, sy, sw, sh, dx, dy, dw, dh) => {
      if (dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0) return;
      const tw = sw * bs, th = sh * bs;
      for (let ty = dy; ty < dy + dh - 0.01; ty += th) {
        for (let tx = dx; tx < dx + dw - 0.01; tx += tw) {
          const cw = Math.min(tw, dx + dw - tx), ch = Math.min(th, dy + dh - ty);
          ctx.drawImage(A.cv, sx, sy, cw / bs, ch / bs, tx, ty, cw, ch);
        }
      }
    };
    const sw = A.w, sh = A.h, mI = inset + 12; // center patch margin
    // corners
    ctx.drawImage(A.cv, 0, 0, inset, inset, x, y, iw, iw);
    ctx.drawImage(A.cv, sw - inset, 0, inset, inset, x + w - iw, y, iw, iw);
    ctx.drawImage(A.cv, 0, sh - inset, inset, inset, x, y + h - iw, iw, iw);
    ctx.drawImage(A.cv, sw - inset, sh - inset, inset, inset, x + w - iw, y + h - iw, iw, iw);
    // edges
    tile(inset, 0, sw - 2 * inset, inset, x + iw, y, w - 2 * iw, iw);
    tile(inset, sh - inset, sw - 2 * inset, inset, x + iw, y + h - iw, w - 2 * iw, iw);
    tile(0, inset, inset, sh - 2 * inset, x, y + iw, iw, h - 2 * iw);
    tile(sw - inset, inset, inset, sh - 2 * inset, x + w - iw, y + iw, iw, h - 2 * iw);
    // center
    tile(mI, mI, sw - 2 * mI, sh - 2 * mI, x + iw, y + iw, w - 2 * iw, h - 2 * iw);
  },
};

// per-screen entry points wrapped so the ink-fade veil (UI._fade) always
// draws last — main.js dispatch stays untouched. drawAnnounce is the last
// unconditional UI call of the fight frame.
for (const fn of ['drawTitle', 'drawControls', 'drawSelect', 'drawResult', 'drawAnnounce']) {
  const orig = UI[fn];
  UI[fn] = function (...args) { orig.apply(this, args); this._fade(args[0], args[1]); };
}
