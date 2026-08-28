/* Asset loading, particles / floating text / afterimages, projectiles. */
'use strict';

const Assets = {
  images: {},
  smears: {},     // `${cid}:${aname}` -> { frameIdx: { edge, core } } 画师月牙剥离层
  _tintCache: new Map(),

  load() {
    const list = [
      ['bg', 'assets/img/background.png'],
      ['shop', 'assets/img/shop.png'],
    ];
    for (const cid of Object.keys(DATA)) {
      const c = DATA[cid];
      for (const [aname, a] of Object.entries(c.anims)) {
        list.push([`${cid}:${aname}`, `${c.dir}/${a.file}`]);
      }
    }
    if (typeof FX_SHEETS !== 'undefined') {
      for (const [name, s] of Object.entries(FX_SHEETS)) list.push([`fx:${name}`, s.file]);
    }
    return Promise.all(list.map(([key, src]) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { Assets.images[key] = img; res(); };
      img.onerror = () => rej(new Error('failed to load ' + src));
      img.src = src;
    }))).then(() => Assets.bakeSmears());
  },
  img(key) { return Assets.images[key]; },

  /* 月牙提取: 素材作者把刀光 smear 直接画进了攻击帧(近纯白像素), 且部分帧
     月牙压在身体前面 —— 因此绝不能从原图上擦除(会把身体咬穿, 踩过坑),
     只提取月牙层供"帧同步重染覆盖"用: 角色绘制时把当前帧的月牙实时染成
     招式主题色, 盖在原图之上。对齐由构造保证: 同一批像素、同一变换。 */
  bakeSmears() {
    for (const cid of Object.keys(DATA)) {
      const c = DATA[cid];
      for (const [aname, a] of Object.entries(c.anims)) {
        if (a.smearFrames && a.smearFrames.length) Assets._bakeSheet(`${cid}:${aname}`, a.smearFrames);
      }
    }
    // 外部 fx 表(MH3 等): 帧为正方形, 边长=图高, 像素密度与主角色一致
    if (typeof FX_SHEETS !== 'undefined') {
      for (const [name, s] of Object.entries(FX_SHEETS)) Assets._bakeSheet(`fx:${name}`, s.smearFrames);
    }
  },

  /* 单表烘焙: 提取 smearFrames 各帧的月牙层 -> Assets.smears[key] = {fs, frames}
     file:// 下 getImageData 会因 canvas 污染抛 SecurityError —— 捕获后跳过,
     引擎自动走旧 fx 兜底(单文件版用 data: URL 不受影响) */
  _bakeSheet(key, smearFrames) {
    try { this.__bakeSheetInner(key, smearFrames); }
    catch (e) { console.warn('smear bake skipped (' + key + '):', e && e.name); }
  },
  __bakeSheetInner(key, smearFrames) {
    const img = Assets.images[key];
    if (!img) return;
    const W = img.width, H = img.height, fs = H; // 帧边长 = 图高(126/200 通吃)
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const gc = cv.getContext('2d');
    gc.drawImage(img, 0, 0);
    const px = gc.getImageData(0, 0, W, H).data;
    const frames = {};
    for (const f of smearFrames) {
      const comp = Assets._crescentMask(px, W, f * fs, Math.min((f + 1) * fs, W), H);
      if (!comp || comp.count < 60) continue; // 太小视为无月牙,走旧 fx 兜底
      const edge = document.createElement('canvas');
      edge.width = fs; edge.height = fs;
      const ed = edge.getContext('2d').createImageData(fs, fs);
      for (let i = 0; i < comp.mask.length; i++) {
        if (!comp.mask[i]) continue;
        const lx = i % fs, ly = (i / fs) | 0;
        const si = (ly * W + f * fs + lx) * 4;
        const di = i * 4;
        ed.data[di] = px[si]; ed.data[di + 1] = px[si + 1];
        ed.data[di + 2] = px[si + 2]; ed.data[di + 3] = px[si + 3];
      }
      edge.getContext('2d').putImageData(ed, 0, 0);
      // 月牙质心(帧内坐标): 镜像绕 cx 翻转 / 缩放挤压绕质心锚定
      let sx = 0, sy = 0, sn = 0;
      for (let i = 0; i < comp.mask.length; i++) {
        if (comp.mask[i]) { sx += i % fs; sy += (i / fs) | 0; sn++; }
      }
      // 闭合版(standalone 专用): 画师把身体画在月牙前面, 掩码有身体形状的
      // 咬痕 —— 原位显示时身体正好盖住, 平移/翻转使用就露"缺口"。闭运算补洞。
      const edgeC = Assets._close(edge, 4);
      // 两档内芯腐蚀: rim=2 细色边(轻·快), rim=4 厚色边(重·豪)
      frames[f] = {
        edge, core2: Assets._erode(edge, 2), core4: Assets._erode(edge, 4),
        edgeC, core2C: Assets._erode(edgeC, 2), core4C: Assets._erode(edgeC, 4),
        cx: sx / sn, cy: sy / sn,
      };
    }
    if (Object.keys(frames).length) Assets.smears[key] = { fs, frames };
  },

  /* 形态学闭运算(膨胀 n 再腐蚀 n): 补掉月牙被身体咬出的洞, 外轮廓基本不变。
     新长出的像素 alpha=255(重染只看 alpha, 颜色无所谓) */
  _close(canvas, n) {
    const S = canvas.width;
    let a = canvas.getContext('2d').getImageData(0, 0, S, S).data.slice();
    const pass = (src, grow) => {
      const out = src.slice();
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        const i = (y * S + x) * 4 + 3;
        const nb = src[i - 4] || src[i + 4] || src[i - S * 4] || src[i + S * 4];
        if (grow ? (!src[i] && nb) : (src[i] && !(src[i - 4] && src[i + 4] && src[i - S * 4] && src[i + S * 4]))) {
          if (grow) { out[i] = 255; out[i - 3] = 255; out[i - 2] = 255; out[i - 1] = 255; }
          else out[i] = 0;
        }
      }
      return out;
    };
    for (let k = 0; k < n; k++) a = pass(a, true);
    for (let k = 0; k < n; k++) a = pass(a, false);
    const out = document.createElement('canvas');
    out.width = S; out.height = S;
    const od = out.getContext('2d').createImageData(S, S);
    od.data.set(a);
    out.getContext('2d').putImageData(od, 0, 0);
    return out;
  },

  /* 帧内近纯白掩码的最大 4-连通域(排除刀身/衣物上的零散白点) */
  _crescentMask(px, W, x0, x1, H) {
    const w = x1 - x0;
    const isW = new Uint8Array(w * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * W + x0 + x) * 4;
        if (px[i] >= 240 && px[i + 1] >= 240 && px[i + 2] >= 235 && px[i + 3] >= 200) isW[y * w + x] = 1;
      }
    }
    const lab = new Int32Array(w * H);
    let best = null, cur = 0;
    const qx = new Int32Array(w * H), qy = new Int32Array(w * H);
    for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < w; sx++) {
      const si = sy * w + sx;
      if (!isW[si] || lab[si]) continue;
      cur++; let head = 0, tail = 0, count = 0;
      qx[tail] = sx; qy[tail++] = sy; lab[si] = cur;
      const members = [];
      while (head < tail) {
        const x = qx[head], y = qy[head++]; count++;
        members.push(y * w + x);
        if (x > 0 && isW[y * w + x - 1] && !lab[y * w + x - 1]) { lab[y * w + x - 1] = cur; qx[tail] = x - 1; qy[tail++] = y; }
        if (x < w - 1 && isW[y * w + x + 1] && !lab[y * w + x + 1]) { lab[y * w + x + 1] = cur; qx[tail] = x + 1; qy[tail++] = y; }
        if (y > 0 && isW[(y - 1) * w + x] && !lab[(y - 1) * w + x]) { lab[(y - 1) * w + x] = cur; qx[tail] = x; qy[tail++] = y - 1; }
        if (y < H - 1 && isW[(y + 1) * w + x] && !lab[(y + 1) * w + x]) { lab[(y + 1) * w + x] = cur; qx[tail] = x; qy[tail++] = y + 1; }
      }
      if (!best || count > best.count) best = { count, members };
    }
    if (!best) return null;
    const mask = new Uint8Array(w * H);
    for (const m of best.members) mask[m] = 1;
    return { mask, count: best.count };
  },

  /* 腐蚀 n 圈得到内芯层(smear 双色: 边缘主题色 + 灼亮内芯) */
  _erode(canvas, n) {
    const S = canvas.width;
    const g = canvas.getContext('2d');
    let a = g.getImageData(0, 0, S, S).data.slice();
    for (let it = 0; it < n; it++) {
      const b = a.slice();
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        const i = (y * S + x) * 4 + 3;
        if (a[i] && (!a[i - 4] || !a[i + 4] || !a[i - S * 4] || !a[i + S * 4])) b[i] = 0;
      }
      a = b;
    }
    const out = document.createElement('canvas');
    out.width = S; out.height = S;
    const od = out.getContext('2d').createImageData(S, S);
    od.data.set(a);
    out.getContext('2d').putImageData(od, 0, 0);
    return out;
  },

  /* 重染缓存: 白月牙 -> 招式主题色(source-in 保 alpha, 剪影不变) */
  tinted(key, f, layer, color) {
    const ck = `${key}:${f}:${layer}:${color}`;
    let cv = Assets._tintCache.get(ck);
    if (cv) return cv;
    const bank = Assets.smears[key];
    if (!bank || !bank.frames[f]) return null;
    const S = bank.fs;
    cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    g.drawImage(bank.frames[f][layer], 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, S, S);
    Assets._tintCache.set(ck, cv);
    return cv;
  },
};

/* Procedural 和风 stage: painted pixel-by-pixel at 256x144 with a seeded RNG,
   upscaled 4x. Dusk sky, red sun, pagoda & torii silhouettes, lanterns.
   The ground plane lands exactly on STAGE.ground (y=480 -> lowres y=120). */
const Stage = {
  canvas: null,

  build() {
    const W = 256, H = 144;
    const cv = document.createElement('canvas');
    cv.width = W * 4; cv.height = H * 4;
    const lo = document.createElement('canvas');
    lo.width = W; lo.height = H;
    const g = lo.getContext('2d');
    let seed = 20260704;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };

    // dusk sky bands
    const sky = ['#131022', '#181329', '#1e1630', '#261a38', '#31203f', '#3d2643', '#4a2c44'];
    sky.forEach((c, i) => px(0, i * 14, W, 14, c));
    // stars
    for (let i = 0; i < 34; i++) px(rnd() * W, rnd() * 52, 1, 1, rnd() < 0.3 ? '#cdbfd8' : '#7a6a90');
    // huge red sun, slightly left
    const sx = 96, sy = 66, sr = 34;
    for (let yy = -sr; yy <= sr; yy++) {
      const half = Math.floor(Math.sqrt(sr * sr - yy * yy));
      px(sx - half, sy + yy, half * 2, 1, yy < -sr + 6 ? '#a8241c' : '#c1272d');
    }
    px(sx - sr, sy - 2, sr * 2, 1, '#d64533'); // glint band
    // far mountains
    g.fillStyle = '#241a33';
    for (let x = 0; x < W; x += 2) {
      const h = 16 + Math.sin(x * 0.045) * 7 + Math.sin(x * 0.013) * 9;
      px(x, 96 - h, 2, h + 6, '#241a33');
    }
    // pagoda silhouette (right)
    const pag = (bx, by, s) => {
      for (let i = 0; i < 4; i++) {
        const w = (34 - i * 7) * s, y = by - i * 11 * s;
        px(bx - w / 2, y - 4 * s, w, 4 * s, '#171126');
        px(bx - w / 2 - 3 * s, y - 5 * s, w + 6 * s, 2 * s, '#171126');
        px(bx - (w - 8 * s) / 2, y - 11 * s, w - 8 * s, 7 * s, '#131022');
      }
      px(bx - 1, by - 50 * s, 2, 6 * s, '#171126');
    };
    pag(214, 100, 1);
    // torii gate silhouette (left-mid)
    const tor = (bx, by, s) => {
      px(bx - 16 * s, by - 26 * s, 3 * s, 26 * s, '#2b1420');
      px(bx + 13 * s, by - 26 * s, 3 * s, 26 * s, '#2b1420');
      px(bx - 22 * s, by - 30 * s, 44 * s, 4 * s, '#2b1420');
      px(bx - 25 * s, by - 32 * s, 50 * s, 2 * s, '#38181f');
      px(bx - 13 * s, by - 22 * s, 26 * s, 2 * s, '#2b1420');
    };
    tor(42, 106, 1);
    // near tree silhouettes
    g.fillStyle = '#0f0c1c';
    for (const tx of [8, 244]) {
      px(tx - 3, 40, 6, 66, '#0f0c1c');
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2, rr = 8 + rnd() * 20;
        px(tx + Math.cos(a) * rr - 4, 48 + Math.sin(a) * rr * 0.5 - 3, 8 + rnd() * 6, 5 + rnd() * 4, '#0f0c1c');
      }
    }
    // roofline strip with lanterns
    px(120, 88, 90, 3, '#171126');
    for (const lx of [132, 158, 184]) {
      px(lx, 91, 1, 4, '#171126');
      px(lx - 2, 95, 5, 6, '#8a3d1e');
      px(lx - 1, 96, 3, 4, '#e08a3c');
      px(lx, 97, 1, 2, '#ffd27a');
    }
    // ground: packed dirt, top edge exactly at y=120 (=480 in game)
    px(0, 118, W, 2, '#3d2b3a');       // dusk rim light on the ground edge
    px(0, 120, W, 24, '#241812');
    for (let i = 0; i < 260; i++) {
      const gy = 120 + rnd() * 24;
      px(rnd() * W, gy, 1 + rnd() * 3, 1, rnd() < 0.5 ? '#2a1c15' : '#1d130e');
    }
    px(0, 120, W, 1, '#171008');
    // sparse pebbles
    for (let i = 0; i < 14; i++) px(rnd() * W, 121 + rnd() * 20, 2, 1, '#3a2a20');

    const gc = cv.getContext('2d');
    gc.imageSmoothingEnabled = false;
    gc.drawImage(lo, 0, 0, W * 4, H * 4);
    this.canvas = cv;
  },
};

const Effects = {
  parts: [], texts: [], ghosts: [], slashes: [], smears: [], impacts: [], shocks: [], flashes: [], pillars: [], crossCuts: [], cutLines: [], cloneRuns: [], pinStars: [], beams: [], skyArrows: [],

  reset() {
    this.parts = []; this.texts = []; this.ghosts = []; this.slashes = [];
    this.smears = []; this.impacts = []; this.shocks = []; this.flashes = [];
    this.pillars = []; this.crossCuts = []; this.cutLines = []; this.cloneRuns = []; this.pinStars = [];
    this.beams = []; this.skyArrows = [];
  },

  /* ── 超杀演出专用 ────────────────────────────────────────────────
     cutLine  影縫い·居合: 无声浮现的细斩线, 停驻等待, burst 时碎裂
     cloneRun 残影分身: 暗影分身横穿画面(拖残影), 到中点触发回调
     pinStar  手裏剣封殺: 弧线飞向目标的小手里剑, 到达后钉住旋转减速 */
  cutLine(x, y, ang, len, color) {
    this.cutLines.push({ x, y, ang, len, color, t: 0, burst: false });
  },
  burstCutLines() {
    for (const l of this.cutLines) {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5;
        this.parts.push({
          x: l.x + Math.cos(l.ang) * l.len * u, y: l.y + Math.sin(l.ang) * l.len * u,
          vx: Math.cos(l.ang + Math.PI / 2) * (2 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1),
          vy: -1 - Math.random() * 2,
          life: 12 + Math.random() * 8, maxLife: 20,
          size: 2 + Math.floor(Math.random() * 2), color: l.color, grav: 0.15,
        });
      }
    }
    this.cutLines = [];
  },
  /* opts: y1(垂直轨迹终点, 俯冲ghost用) / fadeIn(现身淡入拍数) / face(朝向覆盖±1)
     翻转规则: 显示朝向(默认=运动方向) ≠ 角色素材原生朝向时翻转
     (剑二 native=-1 素材面朝左 —— 曾因"向左跑就翻"的错误通用逻辑背对敌人) */
  cloneRun(fighter, animName, x0, x1, y, dur, onMid, opts = {}) {
    const mvDir = Math.sign(x1 - x0) || 1;
    const face = opts.face !== undefined ? opts.face : mvDir;
    this.cloneRuns.push({
      sheet: `${fighter.c.id}:${animName}`, fs: fighter.c.fw || 200, sc: fighter.c.scale,
      anchorX: fighter.c.anchor.x, anchorY: fighter.c.anchor.y,
      x0, x1, y, y1: opts.y1 !== undefined ? opts.y1 : y,
      fadeIn: opts.fadeIn || 0,
      t: 0, dur, onMid, midFired: false, flip: face !== fighter.c.native,
    });
  },
  pinStar(x0, y0, x1, y1, dur, onHit) {
    this.pinStars.push({ x0, y0, x1, y1, t: 0, dur, onHit, hitFired: false, pinned: false, spin: 0 });
  },
  burstPinStars() {
    for (const p of this.pinStars) {
      this.spark(p.x1, p.y1, 0, ['#c9baff', '#7d5bff', '#ffffff'], 6, 4);
    }
    this.pinStars = [];
  },

  /* 月华式 smear 动效层: 基底重染由 fighter.draw 帧同步覆盖完成(见
     fighter.drawSmearOverlay), 这里只负责 additive 动效 —— 出刀闪白(首2tick)
     / 刃风 gale(招内) / 收势余波 echo(偏移残影)。世界坐标在出招瞬间快照,
     attach 时跟随角色。 */
  /* animKey: 演出期(superSeq)move 已置空, 由调用方指明当前攻击表。
     sdef.standalone: 蹲姿合成招 —— 身体帧全程蹲姿(表内无月牙), 刀光作为
     独立基底逐相位绘制, 可用 dx/dy/squashY/scale 调低位平扫的形态。 */
  smearFx(fighter, sdef, animKey) {
    // sdef.sheet 是完整库键(如 'fx:mh3a3'); 未指定时用角色自己的攻击表
    const key = sdef.sheet || `${fighter.c.id}:${animKey || fighter.move.def.anim}`;
    const bank = Assets.smears[key];
    if (!bank) return false;
    // 动效用月牙主帧(最大的那帧)做画笔; standalone 走闭合版(无身体咬痕)
    const frames = Object.keys(bank.frames).map(Number).sort((a, b) => a - b);
    const edge = Assets.tinted(key, frames[0], sdef.standalone ? 'edgeC' : 'edge', sdef.edge);
    if (!edge) return false;
    const bankCx = bank.frames[frames[0]].cx; // 镜像动效的翻转轴(月牙质心)
    const bankCy = bank.frames[frames[0]].cy;
    const fs = bank.fs;
    // cullPrev: 连锁第二刀开始时清掉前一刀残迹(节奏空拍, 两刀不糊在一起)
    if (sdef.cullPrev) this.smears = this.smears.filter(x => x.owner !== fighter);
    let phaseImgs = null;
    if (sdef.standalone) {
      phaseImgs = [];
      // standalone 用闭合版(edgeC/coreNC): 补掉身体咬痕, 平移/翻转不露缺口
      const coreLayer = `core${sdef.rim || 2}C`;
      for (const ph of sdef.phases) {
        const f = ph.f !== undefined ? ph.f : frames[0];
        if (!bank.frames[f]) continue;
        phaseImgs.push({
          edge: Assets.tinted(key, f, 'edgeC', sdef.edge),
          core: Assets.tinted(key, f, coreLayer, sdef.core),
          t: ph.t,
        });
      }
      if (!phaseImgs.length) return false;
    }
    // 变换显式按攻击表计算(不用 spriteParams 瞬时状态 —— 出生 tick 时
    // anim 可能还停在 seq 引用的蹲姿帧, 会丢 yOff)。
    // 外部 fx 表(fs≠200)无角色锚点: 水平居中角色、底边贴脚, 再靠 dx/dy 微调。
    // atX/atY: 绝对世界坐标锚定(演出用 —— 月牙钉在"挥刀的那个身影"的位置,
    // 物理一致性); dir: 朝向覆盖(ghost 的挥向≠本体朝向时用)
    const c = fighter.c, sc = c.scale;
    const yOff = (fighter.move && fighter.move.def.yOff) || 0;
    const dw = fs * sc, dh = fs * sc;
    const ax = sdef.atX !== undefined ? sdef.atX : fighter.x;
    const ay = sdef.atY !== undefined ? sdef.atY : fighter.y;
    const baseX = fs === 200 ? ax - c.anchor.x * sc : ax - dw / 2;
    const baseY = fs === 200 ? ay - c.anchor.y * sc + yOff : ay - dh;
    const tPhases = sdef.phases.reduce((s, x) => s + x.t, 0);
    const decay = sdef.decay !== undefined ? sdef.decay : 2;
    const echo = sdef.echo || null;
    this.smears.push({
      dx: baseX, dy: baseY, dw, dh, fs,
      flip: (sdef.dir !== undefined ? sdef.dir : fighter.facing) !== c.native, mirrorX: ax,
      edge, t: 0, tPhases, decayEnd: tPhases + decay, echo,
      gale: sdef.gale || 0, // 必杀刃风: 放大 additive 重影 (1.06 = +6%)
      mirror: !!sdef.mirror, flipY: !!sdef.flipY, bankCx, bankCy, owner: fighter,
      standalone: phaseImgs, ox: sdef.dx || 0, oy: sdef.dy || 0,
      squashY: sdef.squashY || 1, scale: sdef.scale || 1,
      rot: sdef.rot || 0, wipe: sdef.wipe || 0, // wipe: 前 N tick 沿刀路渐进擦入
      f: sdef.attach ? fighter : null, x0: fighter.x, y0: fighter.y,
      total: tPhases + decay + (echo ? echo.t : 0),
    });
    return true;
  },

  /* 必杀命中冲击环: 三档量化扩张的像素八角环(贴地椭圆)。delay 为延后起爆 tick */
  shockRing(x, y, color, delay = 0) {
    this.shocks.push({ x: Math.round(x / 2) * 2, y: Math.round(y / 2) * 2, color, t: -delay });
  },

  /* 光柱: 爆心冲天的立柱(白芯+主题色包边), 三档收窄 —— 月輪爆的骨架 */
  pillar(x, baseY, color) {
    this.pillars.push({ x: Math.round(x / 2) * 2, baseY, color, t: 0 });
  },

  /* M1.2 横贯光束(奥特曼式/太阳箭): 白芯+主题色边缘+外晕, 三层矩形沿朝向
     打穿屏幕。起束 4tick 展宽 -> 持续期宽度脉动+行进能量环 -> 尾段收束。
     o: core/edge/glow 三色 / life / maxW 芯峰宽 / targetX 末端爆闪锚点(可选) */
  beam(x, y, dir, o = {}) {
    this.beams.push({
      x, y, dir: dir >= 0 ? 1 : -1, t: 0,
      life: o.life || 30, maxW: o.maxW || 18,
      core: o.core || '#ffffff', edge: o.edge || '#c94aff', glow: o.glow || '#ff8428',
      targetX: o.targetX, seed: Math.random() * 6.28,
    });
  },

  /* M1.2 天降光箭(射日箭雨): (x0,y0)->(x1,y1) 直线飞行 dur tick, 抵达时迸
     火花+短暂钉地余像。o.onHit 落点回调 / o.color 箭体色 */
  skyArrow(x0, y0, x1, y1, o = {}) {
    this.skyArrows.push({
      x0, y0, x1, y1, t: 0, dur: o.dur || 7,
      color: o.color || '#ffd24a', onHit: o.onHit || null, hitFired: false,
    });
  },

  /* 斬鉄十字: 两道放大的画师月牙旋转成 X 交叉斩, 燃烧后碎成花瓣 */
  crossCut(x, y, key, frame, color) {
    const img = Assets.tinted(key, frame, 'edge', color);
    const hot = Assets.tinted(key, frame, 'edge', '#ff5a3d');
    if (!img) return;
    this.crossCuts.push({ x, y, img, hot, t: 0, burst: false });
  },

  /* 超杀终结三变体(纯视觉, 伤害/时序不变):
     A 桜吹雪·衝 — 花瓣放射爆发 + 双冲击环 + 粉色余光
     B 月輪·爆   — 聚爆内吸 -> 三环连爆 + 冲天光柱, 花瓣作余韵飘落
     C 斬鉄·十字 — 巨型月牙 X 交叉斩, 燃烧后碎成花瓣 */
  superFinale(variant, x, y, f) {
    const th = f.c.theme, th2 = f.c.theme2;
    if (variant === 'B') {
      this.converge(x, y - 90, [th, th2, '#ffffff'], 16, 110);
      this.shockRing(x, y - 60, th2, 0);
      this.shockRing(x, y - 60, '#ffffff', 3);
      this.shockRing(x, y - 60, th, 6);
      this.pillar(x, y, th2);
      // 余韵按角色分语: 隼人=樱瓣落, 剑二=残影余烬升(冷)
      if (f.c.id === 'mack') this.petals(x, y - 40, 18);
      else { this.rise(x, y - 30, th2, 6); this.rise(x, y - 60, '#c8fff5', 5); }
    } else if (variant === 'C') {
      const key = `${f.c.id}:attack1`;
      const bank = Assets.smears[key];
      if (bank) {
        const fr = Object.keys(bank).map(Number).sort((a, b) => a - b)[0];
        this.crossCut(x, y - 100, key, fr, th2);
      }
      this.flashes.push({ color: th, alpha: 0.2, t: 5, t0: 5 });
      this.petalBurst(x, y - 90, 22);
    } else { // 'A' 桜吹雪·衝: 爆发一瞬 + 爆点缓落花瓣雨(余韵主角)
      this.petalBurst(x, y - 80, 26);
      this.petalRain(x, y, 30);
      this.shockRing(x, y - 60, th2, 0);
      this.shockRing(x, y - 60, '#ffb7c9', 3);
      this.flashes.push({ color: '#ffb7c9', alpha: 0.18, t: 6, t0: 6 });
    }
  },

  /* 全屏白闪帧(超杀斩击的过曝一瞬), 阶梯衰减 */
  flashFrame(o = {}) {
    this.flashes.push({ color: o.color || '#ffffff', alpha: o.alpha || 0.3, t: o.t || 2, t0: o.t || 2 });
  },

  /* 月华式命中星爆: 三阶段 —— 白闪光球(0-2) -> 锯齿星芒(2-7) -> 碎星/喷溅。
     hitstop 冻结中以 0.35 倍速演完, 重量感来自这里。
     tier 1轻/2重/3必杀/4超杀终结 —— 碎星数量·尺寸、喷溅长条、细长线芒
     全部按档位递进, 层级感的主要来源。 */
  impact(x, y, dir, o = {}) {
    const tier = o.tier || 1;
    const r = o.r || [22, 34, 42, 50][tier - 1];
    const jag = [];
    for (let i = 0; i < 8; i++) jag.push(0.75 + Math.random() * 0.5); // 每根星芒长度抖动
    this.impacts.push({
      x: Math.round(x / 2) * 2, y: Math.round(y / 2) * 2, dir, r, tier,
      color: o.color || '#ffc531', t: 0,
      rot: Math.random() * Math.PI / 4, jag, shardsDone: false,
      // 细长线芒(tier3+): 命中一瞬向四周射出的 1-2px 长线, 抖出"锐"感
      rays: [0, 0, 7, 11][tier - 1],
      rayA: Math.random() * Math.PI,
    });
  },

  /* 程序化刀光: 像素方块沿月牙弧铺开。前缘在生命前段扫过(sweep), 之后整体
     渐隐; 半径随时间微扩。角度约定: 0=正前, -PI/2=正上, dir 翻转左右。
     opts: r 半径 / a0,a1 起止角 / w 最大厚度 / life / color 内芯 color2 外缘
           grow 每“年龄”半径扩张 / rise 弧心垂直漂移 / vx 弧心沿朝向漂移 / sweep 扫过占比 */
  slash(x, y, dir, o = {}) {
    const life = o.life || 12;
    this.slashes.push({
      x, y, dir: dir >= 0 ? 1 : -1,
      r: o.r || 60,
      a0: o.a0 !== undefined ? o.a0 : -1.8,
      a1: o.a1 !== undefined ? o.a1 : 0.5,
      width: o.w || 10,
      color: o.color || '#ffffff', color2: o.color2 || '#ffe27a',
      grow: o.grow !== undefined ? o.grow : 0.8,
      rise: o.rise || 0, vx: o.vx || 0,
      sweep: o.sweep || 0.4, ry: o.ry || 1, // ry<1 压扁成贴地平弧
      lean: !!o.lean, // 精益: 无 additive 白芯 bloom, 清一色细锐弧(速度型忍者)
      life, maxLife: life,
    });
  },

  /* 格挡摩擦火花: 刀刃磨在防线上的对抗感 —— 沿竖直防线迸出的青白磨擦屑
     + 接触点白芯闪。轻/重分级数量与力度(格挡不再像打空)。 */
  blockSpark(x, y, dir, kind = 'light') {
    const heavy = kind !== 'light';
    const n = heavy ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const up = Math.random() < 0.5 ? -1 : 1;
      this.parts.push({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 20,
        vx: -dir * (2 + Math.random() * 3.2),              // 屑向攻方反弹(磨出来的)
        vy: up * (1.4 + Math.random() * 2.6) - 0.6,
        life: 9 + Math.random() * 7, maxLife: 16,
        w: Math.round(5 + Math.random() * 6), h: 2,        // 短磨擦条
        color: Math.random() < 0.4 ? '#ffe08a' : '#bff0fa', // 金屑(呼应朱印結界闪光) + 钢蓝
        grav: 0.12,
      });
    }
    this.parts.push({
      x, y, vx: 0, vy: 0, life: 4, maxLife: 4,
      size: heavy ? 9 : 6, color: '#ffffff', grav: 0,       // 接触闪光加大
    });
  },

  /* 突刺: 直线快刺的刀线(亮芯长条 + 两侧薄流线), 轨迹最清晰的轻攻击视觉 */
  thrust(x, y, dir, o = {}) {
    const core = o.color2 || '#ffd24a', lite = o.color || '#fff6d8';
    this.parts.push({
      x: x + dir * 12, y,
      vx: dir * 8.5, vy: 0,
      life: 7, maxLife: 7, w: 30, h: 3, color: lite, grav: 0,
    });
    for (const oy of [-4, 4]) {
      this.parts.push({
        x: x + dir * 4, y: y + oy,
        vx: dir * 7, vy: 0,
        life: 6, maxLife: 6, w: 18, h: 2, color: core, grav: 0,
      });
    }
    this.spark(x + dir * 46, y, dir, [lite, core], 3, 2.5);
  },

  /* 聚气: 粒子从周围一圈向 (x,y) 汇聚, 到点即灭 (超杀起手/忍者内爆) */
  converge(x, y, colors, n = 8, r = 70) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = r * (0.55 + Math.random() * 0.75);
      const life = 9 + Math.random() * 10;
      this.parts.push({
        x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.85,
        vx: -Math.cos(a) * rr / life, vy: -Math.sin(a) * rr * 0.85 / life,
        life, maxLife: life,
        size: 2 + Math.floor(Math.random() * 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 0,
      });
    }
  },

  /* 花瓣: 粉白花瓣片, 4 向翻转姿态轮换(翻滚感), 左右摇摆着飘落。
     petal:true 的粒子走专属绘制(不是方块) */
  petals(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 190, y: y - Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.4, vy: 0.45 + Math.random() * 0.7,
        life: 52 + Math.random() * 38, maxLife: 90,
        size: 3, petal: true,
        color: Math.random() < 0.6 ? '#ffb7c9' : '#ffd9df',
        grav: 0, sway: 0.9 + Math.random() * 0.6, ph: Math.random() * 6.28,
      });
    }
  },

  /* 花瓣爆发: 从爆心呈放射状炸开的花瓣(快慢两波), 冲出去再飘落 —— 桜吹雪 */
  petalBurst(x, y, n = 36) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const fast = i < n * 0.45;
      const sp = fast ? 7 + Math.random() * 5 : 2.5 + Math.random() * 3;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 1.5,
        life: 40 + Math.random() * 36, maxLife: 76,
        size: 3, petal: true,
        color: fast ? '#ffd9df' : (Math.random() < 0.5 ? '#ffb7c9' : '#fff3ee'),
        grav: 0.08, drag: 0.93, sway: 0.7 + Math.random() * 0.6, ph: Math.random() * 6.28,
      });
    }
  },

  /* 花瓣雨: 爆心正上方缓缓飘落的大瓣樱吹雪 —— 终结后的余韵主角, 慢而显眼 */
  petalRain(x, y, n = 30) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 150,
        y: y - 90 - Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.22 + Math.random() * 0.2,       // 比普通 petals 更慢(Eric: 落樱再慢一点)
        life: 90 + Math.random() * 60, maxLife: 150,
        size: 3, petal: true, big: true,      // 大瓣, 更显眼
        color: Math.random() < 0.55 ? '#ffb7c9' : '#ffd9df',
        grav: 0, sway: 1.1 + Math.random() * 0.7, ph: Math.random() * 6.28,
      });
    }
  },

  spark(x, y, dir, colors, n = 12, pow = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.3 + Math.random()) * pow;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp + dir * pow * 0.6,
        vy: Math.sin(a) * sp - 1.5,
        life: 14 + Math.random() * 12, maxLife: 26,
        size: 2 + Math.floor(Math.random() * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        grav: 0.18,
      });
    }
  },

  dust(x, y, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 8,
        vx: (Math.random() - 0.5) * 2 + dir * (1 + Math.random() * 2),
        vy: -(0.4 + Math.random() * 1.4),
        life: 16 + Math.random() * 10, maxLife: 26,
        size: 3 + Math.floor(Math.random() * 3),
        color: 'rgba(210,200,180,0.7)',
        grav: 0.02,
      });
    }
  },

  rise(x, y, color, n = 3) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 56, y: y - Math.random() * 130,
        vx: 0, vy: -(0.8 + Math.random() * 1.6),
        life: 20 + Math.random() * 14, maxLife: 34,
        size: 2 + Math.floor(Math.random() * 3),
        color, grav: 0,
      });
    }
  },

  ring(x, y, color, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * 6.5,
        vy: Math.sin(a) * 2.2 - 0.6,
        life: 15 + Math.random() * 7, maxLife: 22,
        size: 3 + Math.floor(Math.random() * 2),
        color, grav: 0.05,
      });
    }
  },

  text(x, y, str, color = '#ffe27a', size = 14) {
    this.texts.push({ x, y, str, color, size, life: 46, vy: -0.9 });
  },

  ghost(params) {
    this.ghosts.push({ ...params, life: 14 });
  },

  update(rate = 1) {
    for (const p of this.parts) {
      p.x += p.vx * rate; p.y += p.vy * rate;
      if (p.sway) p.x += Math.sin((p.maxLife - p.life) * 0.11 + p.ph) * p.sway * rate;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; } // 爆发花瓣: 冲出去减速再飘
      p.vy += p.grav * rate; p.life -= rate;
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.y += t.vy * rate; t.life -= rate; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const g of this.ghosts) g.life -= rate;
    this.ghosts = this.ghosts.filter(g => g.life > 0);
    for (const s of this.slashes) {
      s.x += s.vx * s.dir * rate; s.y += s.rise * rate; s.life -= rate;
    }
    this.slashes = this.slashes.filter(s => s.life > 0);
    for (const s of this.smears) s.t += rate;
    this.smears = this.smears.filter(s => s.t < s.total);
    for (const im of this.impacts) {
      im.t += rate;
      // 第三阶段入口: 一次性迸出碎星+喷溅, 数量/尺寸/速度按 tier 递进
      if (!im.shardsDone && im.t >= 6.5) {
        im.shardsDone = true;
        const nShard = [6, 14, 24, 34][im.tier - 1];
        const nStreak = [0, 4, 7, 12][im.tier - 1];
        const pow = [1, 1.4, 1.8, 2.2][im.tier - 1];
        for (let i = 0; i < nShard; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (2 + Math.random() * (im.r / 6)) * pow;
          // 碎星: tier2+ 混入 4-6px 大块星屑(带更强重力, 坠得快)
          const big = im.tier >= 2 && Math.random() < 0.3;
          this.parts.push({
            x: im.x, y: im.y,
            vx: Math.cos(a) * sp + im.dir * (2 + im.r / 12),
            vy: Math.sin(a) * sp * 0.8 - 1.6 * pow,
            life: 10 + Math.random() * 10, maxLife: 20,
            size: big ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2),
            color: Math.random() < 0.5 ? '#ffffff' : im.color,
            grav: big ? 0.34 : 0.2,
          });
        }
        // 喷溅: 沿挥砍方向 ±35° 的长条速度线(parts 的 w/h 长条粒子)
        for (let i = 0; i < nStreak; i++) {
          const a = (Math.random() - 0.5) * 1.2;
          const sp = (5 + Math.random() * 5) * pow;
          this.parts.push({
            x: im.x, y: im.y - 4 + Math.random() * 8,
            vx: Math.cos(a) * sp * im.dir, vy: Math.sin(a) * sp * 0.6,
            life: 7 + Math.random() * 6, maxLife: 13,
            w: Math.round(8 + Math.random() * 9 * pow), h: 2,
            color: Math.random() < 0.4 ? '#ffffff' : im.color,
            grav: 0.05,
          });
        }
      }
    }
    this.impacts = this.impacts.filter(im => im.t < 10);
    for (const sh of this.shocks) sh.t += rate;
    this.shocks = this.shocks.filter(sh => sh.t < 9);
    for (const fl of this.flashes) fl.t -= rate;
    this.flashes = this.flashes.filter(fl => fl.t > 0);
    for (const pl of this.pillars) pl.t += rate;
    this.pillars = this.pillars.filter(pl => pl.t < 10);
    for (const b of this.beams) b.t += rate;
    this.beams = this.beams.filter(b => b.t < b.life);
    for (const a of this.skyArrows) {
      a.t += rate;
      if (!a.hitFired && a.t >= a.dur) {
        a.hitFired = true;
        this.spark(a.x1, a.y1, 0, ['#ffd24a', '#fff6d8', '#ffffff'], 7, 4);
        if (a.onHit) a.onHit(a);
      }
    }
    this.skyArrows = this.skyArrows.filter(a => a.t < a.dur + 12);
    for (const cc of this.crossCuts) {
      cc.t += rate;
      if (!cc.burst && cc.t >= 5.5) { // 燃烧尽头: X 碎成沿对角线飞散的花瓣
        cc.burst = true;
        for (let i = 0; i < 16; i++) {
          const diag = (Math.random() < 0.5 ? 1 : -1);
          const a = diag * (Math.PI / 4) + (Math.random() - 0.5) * 0.5 + (Math.random() < 0.5 ? Math.PI : 0);
          const sp = 4 + Math.random() * 4;
          this.parts.push({
            x: cc.x, y: cc.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8,
            life: 34 + Math.random() * 26, maxLife: 60,
            size: 3, petal: true,
            color: Math.random() < 0.5 ? '#ffb7c9' : '#ffd9df',
            grav: 0.1, drag: 0.94, sway: 0.8, ph: Math.random() * 6.28,
          });
        }
      }
    }
    this.crossCuts = this.crossCuts.filter(cc => cc.t < 8);
    for (const l of this.cutLines) l.t += rate;   // 斩线常驻, burst 时统一清
    for (const c of this.cloneRuns) {
      c.t += rate;
      if (!c.midFired && c.t >= c.dur * 0.5) { c.midFired = true; if (c.onMid) c.onMid(); }
    }
    this.cloneRuns = this.cloneRuns.filter(c => c.t < c.dur + 6);
    for (const p of this.pinStars) {
      if (!p.pinned) {
        p.t += rate;
        if (p.t >= p.dur) { p.pinned = true; if (!p.hitFired) { p.hitFired = true; if (p.onHit) p.onHit(); } }
      }
      p.spin += p.pinned ? 0.08 : 0.5;
    }
  },

  drawGhosts(ctx) {
    for (const g of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = 0.32 * (g.life / 14);
      if (g.flip) {
        ctx.translate(g.mirrorX, 0); ctx.scale(-1, 1); ctx.translate(-g.mirrorX, 0);
      }
      ctx.drawImage(g.img, g.sx, 0, 200, 200, g.dx, g.dy, g.dw, g.dh);
      ctx.restore();
    }
  },

  drawSlashes(ctx) {
    if (!this.slashes.length) return;
    ctx.save();
    for (const s of this.slashes) {
      const age = 1 - s.life / s.maxLife;                 // 0..1
      const head = Math.min(1, age / s.sweep);            // 前缘扫过进度
      const fade = age < s.sweep ? 1 : 1 - (age - s.sweep) / (1 - s.sweep);
      const r = s.r + s.grow * age * s.maxLife;
      const span = s.a1 - s.a0;
      const steps = Math.max(10, Math.round(Math.abs(span) * r / 4));
      const seg = [];
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        if (u > head) break;
        const trail = Math.max(0, 1 - (head - u) * 1.7);  // 尾迹拖影
        const alpha = (0.18 + 0.82 * trail) * fade;
        if (alpha <= 0.03) continue;
        seg.push({ u, ang: s.a0 + span * u, alpha });
      }
      // pass 1 外缘主题色 (source-over: 叠加不烧白, 月牙轮廓干净)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = s.color2;
      for (const g of seg) {
        const w = Math.max(2, Math.round(s.width * Math.pow(Math.sin(g.u * Math.PI), 0.65)));
        const px = Math.round((s.x + Math.cos(g.ang) * r * s.dir) / 2) * 2;
        const py = Math.round((s.y + Math.sin(g.ang) * r * s.ry) / 2) * 2;
        ctx.globalAlpha = Math.min(1, g.alpha) * 0.8;
        ctx.fillRect(px - (w >> 1) - 1, py - (w >> 1) - 1, w + 2, w + 2);
      }
      // pass 2 内芯亮色
      // lean(速度型忍者): source-over 细芯, 不 additive 烧白 —— 清一色细锐弧;
      // 默认(豪剑): lighter 灼热刃芯, 富冲击白芒
      ctx.globalCompositeOperation = s.lean ? 'source-over' : 'lighter';
      ctx.fillStyle = s.color;
      for (const g of seg) {
        const w = Math.max(2, Math.round(s.width * Math.pow(Math.sin(g.u * Math.PI), 0.65)));
        const wi = Math.max(1, Math.round(w * (s.lean ? 0.34 : 0.42)));
        const ix = Math.round((s.x + Math.cos(g.ang) * (r - w * 0.3) * s.dir) / 2) * 2;
        const iy = Math.round((s.y + Math.sin(g.ang) * (r - w * 0.3) * s.ry) / 2) * 2;
        ctx.globalAlpha = Math.min(1, g.alpha) * (s.lean ? 0.9 : 0.55);
        ctx.fillRect(ix - (wi >> 1), iy - (wi >> 1), wi, wi);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawSmears(ctx) {
    for (const s of this.smears) {
      // attach: 跟随角色当前位置(突进类); 静态则留在斩击发生处(月华行为)
      const ddx = s.f ? s.f.x - s.x0 : 0;
      const ddy = s.f ? s.f.y - s.y0 : 0;
      const dx = s.dx + ddx, dy = s.dy + ddy, mx = s.mirrorX + ddx;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (s.flip) {
        ctx.translate(mx, 0); ctx.scale(-1, 1); ctx.translate(-mx, 0);
      }
      if (s.mirror) { // 回手招: 动效与基底重染同步, 绕月牙质心镜像
        const cx = dx + s.ox + s.bankCx * (s.dw / s.fs);
        ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0);
      }
      if (s.flipY) { // 上挑招: 垂直翻转月牙(下劈笔迹→上挑), 绕月牙质心Y, 物理正确
        const cyf = dy + s.oy + s.bankCy * (s.dh / s.fs);
        ctx.translate(0, cyf); ctx.scale(1, -1); ctx.translate(0, -cyf);
      }
      // 统一几何: standalone 的下沉/挤压/缩放对所有层生效(基底+闪白+余波+刃风),
      // 绕月牙质心锚定, 质心位置不动; 非 standalone 时退化为原始 dx/dy/dw/dh
      const cxW = s.bankCx * (s.dw / s.fs), cyW = s.bankCy * (s.dh / s.fs);
      const gw = s.dw * s.scale, gh = s.dh * s.squashY * s.scale;
      const gx = dx + s.ox + cxW * (1 - s.scale);
      const gy = dy + s.oy + cyW * (1 - s.squashY * s.scale);
      // standalone 基底: 蹲姿合成招的刀光本体(逐相位, 阶梯透明度)
      if (s.standalone) {
        let t = s.t, ph = null;
        for (const p of s.standalone) { if (t < p.t) { ph = p; break; } t -= p.t; }
        if (ph || s.t < s.decayEnd) {
          const use = ph || s.standalone[s.standalone.length - 1];
          ctx.save();
          if (s.rot) { // 轻微转角(第二刀的角度变化), 绕月牙质心
            const px = dx + s.ox + cxW, py = dy + s.oy + cyW;
            ctx.translate(px, py); ctx.rotate(s.rot); ctx.translate(-px, -py);
          }
          if (s.wipe && s.t < s.wipe) { // 斩击擦入: 沿刀路 3 步量化"画出来"
            const frac = (Math.floor(s.t) + 1) / (s.wipe + 1);
            ctx.beginPath();
            ctx.rect(gx, gy, gw * frac, gh);
            ctx.clip();
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = ph ? 1 : 0.35;
          if (use.edge) ctx.drawImage(use.edge, 0, 0, s.fs, s.fs, gx, gy, gw, gh);
          if (ph && use.core) ctx.drawImage(use.core, 0, 0, s.fs, s.fs, gx, gy, gw, gh);
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'lighter'; // 以下为 additive 动效
      // 收势余波: 沿出刀方向偏移的 edge 残影(flip 变换内 +x 恒为面朝方向)
      if (s.t >= s.decayEnd && s.echo) {
        ctx.globalAlpha = 0.22;
        ctx.drawImage(s.edge, 0, 0, s.fs, s.fs, gx + (s.echo.dx || 0), gy + (s.echo.dy || 0), gw, gh);
      }
      // 必杀刃风: 招内持续的放大重影, 刀势外溢
      if (s.t < s.tPhases && s.gale) {
        const g = s.gale;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(s.edge, 0, 0, s.fs, s.fs,
          gx - gw * (g - 1) / 2, gy - gh * (g - 1) / 2, gw * g, gh * g);
      }
      // 出刀首 2 tick: 过曝闪白(斩击的"炸开"感)
      if (s.t < 2) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(s.edge, 0, 0, s.fs, s.fs, gx, gy, gw, gh);
      }
      ctx.restore();
    }
  },

  /* 横贯光束: 外晕/边缘/白芯/过曝热线四层, 宽度脉动 + 行进能量环 + 枪口
     星芒 + 末端爆闪。像素量化(2px 网格)贴合全局像素质感。 */
  drawBeams(ctx) {
    if (!this.beams.length) return;
    const px2 = v => Math.round(v / 2) * 2;
    ctx.save();
    for (const b of this.beams) {
      // 展宽 4tick -> 持续 -> 末 6tick 收束
      const kIn = Math.min(1, b.t / 4);
      const kOut = Math.min(1, Math.max(0, (b.life - b.t) / 6));
      const w = Math.max(2, b.maxW * kIn * kOut * (1 + 0.1 * Math.sin(b.t * 1.9 + b.seed)));
      const x0 = b.x, x1 = b.dir > 0 ? 1064 : -40;
      const bx = Math.min(x0, x1), bw = Math.abs(x1 - x0);
      const y = b.y + Math.sin(b.t * 2.3 + b.seed) * 1.2;
      // 外晕(加色) / 边缘 / 白芯 / 热线
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.20 * kOut;
      ctx.fillStyle = b.glow;
      ctx.fillRect(px2(bx), px2(y - w * 1.6), bw, px2(w * 3.2) || 2);
      ctx.globalAlpha = 0.62 * kOut;
      ctx.fillStyle = b.edge;
      ctx.fillRect(px2(bx), px2(y - w * 0.95), bw, px2(w * 1.9) || 2);
      ctx.globalAlpha = 0.96 * kOut;
      ctx.fillStyle = b.core;
      ctx.fillRect(px2(bx), px2(y - w * 0.5), bw, px2(w) || 2);
      ctx.globalAlpha = 0.9 * kOut;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px2(bx), px2(y - w * 0.16), bw, Math.max(2, px2(w * 0.32)));
      // 行进能量环: 三道竖椭圆环沿束身滑行
      ctx.globalAlpha = 0.55 * kOut;
      ctx.fillStyle = b.edge;
      for (let i = 0; i < 3; i++) {
        const u = ((b.t * 30 + i * 140) % (bw + 60)) - 30;
        const rx = b.dir > 0 ? x0 + u : x0 - u;
        if (rx < bx - 10 || rx > bx + bw + 10) continue;
        const rh = w * 1.7, n = 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          ctx.fillRect(px2(rx + Math.cos(a) * w * 0.5) - 1, px2(y + Math.sin(a) * rh) - 1, 3, 3);
        }
      }
      // 枪口星芒(发射端)
      ctx.globalAlpha = 0.85 * kOut;
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 6; k++) {
        const a = b.seed + b.t * 0.5 + k * Math.PI / 3;
        const L = w * (1.5 + 0.5 * Math.sin(b.t * 2 + k));
        ctx.fillRect(px2(x0 + Math.cos(a) * L) - 2, px2(y + Math.sin(a) * L) - 2, 4, 4);
      }
      // 末端爆闪(命中锚点): 随机半径白闪球
      if (b.targetX !== undefined) {
        const R = w * (1.1 + Math.random() * 0.5);
        ctx.globalAlpha = 0.75 * kOut;
        for (let ry = -R; ry <= R; ry += 4) {
          const half = Math.sqrt(Math.max(0, R * R - ry * ry));
          ctx.fillRect(px2(b.targetX - half), px2(y + ry), px2(half * 2) || 2, 4);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  /* 天降光箭: 亮头+渐隐尾迹的斜线; 抵达后短暂钉地余像淡出 */
  drawSkyArrows(ctx) {
    if (!this.skyArrows.length) return;
    ctx.save();
    for (const a of this.skyArrows) {
      const u = Math.min(1, a.t / a.dur);
      const x = a.x0 + (a.x1 - a.x0) * u, y = a.y0 + (a.y1 - a.y0) * u;
      const n = Math.hypot(a.x1 - a.x0, a.y1 - a.y0) || 1;
      const ux = (a.x1 - a.x0) / n, uy = (a.y1 - a.y0) / n;
      if (!a.hitFired) {
        ctx.globalCompositeOperation = 'lighter';
        // 尾迹三段渐隐
        for (let k = 0; k < 3; k++) {
          ctx.globalAlpha = 0.5 - k * 0.14;
          ctx.fillStyle = a.color;
          const tx = x - ux * (14 + k * 12), ty = y - uy * (14 + k * 12);
          ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
        }
        // 箭体亮线 + 白头
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = a.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - ux * 22, y - uy * 22); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
      } else {
        // 钉地余像: 短杆直立渐隐
        const fade = Math.max(0, 1 - (a.t - a.dur) / 12);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.6 * fade;
        ctx.strokeStyle = a.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x1 - ux * 16, a.y1 - uy * 16); ctx.lineTo(a.x1, a.y1); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawPillars(ctx) {
    for (const pl of this.pillars) {
      const stage = pl.t < 3 ? 0 : pl.t < 6 ? 1 : 2;
      const w = [12, 7, 3][stage];
      const top = [80, 30, 10][stage];
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = [0.85, 0.55, 0.3][stage];
      ctx.fillStyle = pl.color;
      ctx.fillRect(pl.x - (w >> 1) - 2, top, w + 4, pl.baseY - top);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pl.x - (w >> 2), top, Math.max(2, w >> 1), pl.baseY - top);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  },

  drawCrossCuts(ctx) {
    for (const cc of this.crossCuts) {
      const S = 1.6, half = 100 * S * 2.75 / 2; // 放大月牙, 以爆心为轴
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter';
      const drawArm = (rot, alpha, img) => {
        ctx.save();
        ctx.translate(cc.x, cc.y);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, 0, 0, 200, 200, -half, -half, half * 2, half * 2);
        ctx.restore();
      };
      if (cc.t < 2) drawArm(-0.6, 1, cc.img);
      else if (cc.t < 4) { drawArm(-0.6, 0.8, cc.img); drawArm(0.6, 1, cc.img); }
      else { drawArm(-0.6, 0.45, cc.hot); drawArm(0.6, 0.45, cc.hot); } // 燃烧余烬
      ctx.restore();
    }
  },

  drawCutLines(ctx) {
    for (const l of this.cutLines) {
      // 浮现: 前3tick 从中心向两端擦出; 之后常驻微闪
      const grow = Math.min(1, (l.t + 1) / 3);
      const hl = l.len * grow / 2;
      const dx = Math.cos(l.ang), dy = Math.sin(l.ang);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const shimmer = 0.75 + 0.25 * Math.sin(l.t * 0.9);
      ctx.strokeStyle = l.color; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 * shimmer;
      ctx.beginPath(); ctx.moveTo(l.x - dx * hl, l.y - dy * hl); ctx.lineTo(l.x + dx * hl, l.y + dy * hl); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9 * shimmer;
      ctx.beginPath(); ctx.moveTo(l.x - dx * hl, l.y - dy * hl); ctx.lineTo(l.x + dx * hl, l.y + dy * hl); ctx.stroke();
      ctx.restore();
    }
  },

  drawCloneRuns(ctx) {
    for (const c of this.cloneRuns) {
      const img = Assets.img(c.sheet);
      if (!img) continue;
      const u = Math.min(1, c.t / c.dur);
      const x = c.x0 + (c.x1 - c.x0) * u;
      const y = c.y + (c.y1 - c.y) * u;
      // 攻击帧序: 前半程 f0(奔), 中段 f1(斩), 后段 f2/f3(收)
      const f = u < 0.35 ? 0 : u < 0.6 ? 1 : u < 0.8 ? 2 : 3;
      const dw = c.fs * c.sc, dh = c.fs * c.sc;
      const dx = x - c.anchorX * c.sc, dy = y - c.anchorY * c.sc;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (c.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      // 暗影分身: 压暗+紫化(滤镜), 半透; fadeIn 优雅登场 / 结束缓退场
      let alpha = 0.82;
      if (c.fadeIn && c.t < c.fadeIn) alpha = 0.82 * (c.t / c.fadeIn);
      if (c.t > c.dur) alpha = 0.5 * Math.max(0, 1 - (c.t - c.dur) / 6);
      ctx.globalAlpha = alpha;
      ctx.filter = 'brightness(0.4) sepia(1) hue-rotate(215deg) saturate(3.2)';
      ctx.drawImage(img, f * c.fs, 0, c.fs, c.fs, dx, dy, dw, dh);
      ctx.filter = 'none';
      ctx.restore();
    }
  },

  drawPinStars(ctx) {
    for (const p of this.pinStars) {
      let x, y;
      if (p.pinned) { x = p.x1; y = p.y1; }
      else {
        const u = p.t / p.dur;
        x = p.x0 + (p.x1 - p.x0) * u;
        y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * 46; // 弧线飞行
      }
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(p.spin);
      ctx.fillStyle = p.pinned ? '#9f8fdf' : '#c9baff';
      ctx.fillRect(-9, -2, 18, 4);
      ctx.fillRect(-2, -9, 4, 18);
      ctx.fillStyle = '#35e0d8';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  },

  drawShocks(ctx) {
    for (const sh of this.shocks) {
      if (sh.t < 0) continue; // 延时起爆
      const stage = sh.t < 3 ? 0 : sh.t < 6 ? 1 : 2;
      const r = [18, 36, 54][stage];
      ctx.globalAlpha = [0.8, 0.5, 0.25][stage];
      ctx.fillStyle = sh.color;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = Math.round((sh.x + Math.cos(a) * r) / 2) * 2;
        const py = Math.round((sh.y + Math.sin(a) * r * 0.55) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }
    ctx.globalAlpha = 1;
  },

  drawImpacts(ctx) {
    for (const im of this.impacts) {
      const px2 = v => Math.round(v / 2) * 2;
      ctx.save();
      if (im.t < 2) {
        // 阶段一: 实心白闪光球(锯齿圆, 逐行矩形)
        ctx.fillStyle = '#ffffff';
        const R = im.r * 0.72;
        for (let ry = -R; ry <= R; ry += 4) {
          const half = Math.sqrt(Math.max(0, R * R - ry * ry)) * (0.85 + Math.random() * 0.3);
          ctx.fillRect(px2(im.x - half), px2(im.y + ry), px2(half * 2) || 2, 4);
        }
      } else {
        // 阶段二: 八向锯齿星芒, 白芯 + 主题色外段; 阶梯透明度
        ctx.globalAlpha = im.t < 4.5 ? 0.9 : 0.55;
        for (let k = 0; k < 8; k++) {
          const a = im.rot + k * Math.PI / 4;
          const len = im.r * 1.5 * im.jag[k] * (im.t < 4.5 ? 1 : 1.15);
          const steps = Math.max(3, Math.round(len / 7));
          for (let s = 0; s < steps; s++) {
            const u = s / steps;
            const sz = Math.max(2, Math.round(7 * (1 - u * 0.8)));
            ctx.fillStyle = u < 0.4 ? '#ffffff' : im.color;
            ctx.fillRect(px2(im.x + Math.cos(a) * len * u) - (sz >> 1), px2(im.y + Math.sin(a) * len * u * 0.9) - (sz >> 1), sz, sz);
          }
        }
        if (im.t < 4.5) { // 星芒期残留白芯
          ctx.fillStyle = '#ffffff';
          const cr = Math.max(4, Math.round(im.r * 0.3));
          ctx.fillRect(px2(im.x) - cr, px2(im.y) - cr, cr * 2, cr * 2);
        }
        // 细长线芒(tier3+): 1-2px 阶梯点线向外放射, 只闪 t<4.5 的锐利一瞬
        if (im.rays && im.t < 4.5) {
          ctx.globalAlpha = im.t < 3 ? 0.85 : 0.4;
          for (let k = 0; k < im.rays; k++) {
            const a = im.rayA + (k / im.rays) * Math.PI * 2;
            const len = im.r * (1.9 + im.jag[k % 8] * 0.6);
            ctx.fillStyle = k % 2 === 0 ? '#ffffff' : im.color;
            for (let d = im.r * 0.8; d < len; d += 5) {
              ctx.fillRect(px2(im.x + Math.cos(a) * d), px2(im.y + Math.sin(a) * d * 0.9), 2, 2);
            }
          }
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  draw(ctx) {
    this.drawSmears(ctx);
    this.drawSlashes(ctx);
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife * 1.6));
      ctx.fillStyle = p.color;
      if (p.petal) {
        // 花瓣: 4 向姿态轮换的瓣片(平躺/斜倾/立起/反斜), 翻滚下落
        // big(花瓣雨大瓣, ~1.5x)慢速轮换姿态, 更显眼
        const px = Math.round(p.x), py = Math.round(p.y);
        const S = p.big ? 1.5 : 1;
        const o = Math.floor((p.maxLife - p.life) / (p.big ? 7 : 5) + p.ph) % 4;
        const r = (x, y, w, h) => ctx.fillRect(Math.round(px + x * S), Math.round(py + y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)));
        if (o === 0) {          // 平躺: 宽瓣 + 深色瓣尖
          r(-3, -1, 6, 2);
          r(-1, -2, 3, 1);
          ctx.fillStyle = '#e88aa0'; r(2, -1, 1.4, 1.4);
        } else if (o === 1) {   // 斜倾
          r(-2, -2, 3, 2);
          r(0, 0, 3, 2);
          ctx.fillStyle = '#e88aa0'; r(2, 1, 1.4, 1.4);
        } else if (o === 2) {   // 立起(侧视变窄)
          r(-1, -3, 2, 6);
        } else {                // 反斜
          r(0, -2, 3, 2);
          r(-2, 0, 3, 2);
          ctx.fillStyle = '#e88aa0'; r(-2, 1, 1.4, 1.4);
        }
      } else if (p.w) { // 长条粒子(速度线)
        ctx.fillRect(Math.round(p.x - p.w / 2), Math.round(p.y - p.h / 2), p.w, p.h);
      } else {
        const s = p.size;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
    }
    ctx.globalAlpha = 1;
    this.drawBeams(ctx);
    this.drawSkyArrows(ctx);
    this.drawCloneRuns(ctx);
    this.drawCutLines(ctx);
    this.drawPinStars(ctx);
    this.drawPillars(ctx);
    this.drawCrossCuts(ctx);
    this.drawShocks(ctx);
    this.drawImpacts(ctx);
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 20));
      UI.pixText(ctx, t.str, t.x, t.y, { size: t.size, color: t.color, align: 'center', outline: true });
    }
    // 全屏白闪帧(最顶层, 阶梯衰减)
    for (const fl of this.flashes) {
      ctx.globalAlpha = fl.alpha * (fl.t > fl.t0 / 2 ? 1 : 0.5);
      ctx.fillStyle = fl.color;
      ctx.fillRect(0, 0, STAGE.w, STAGE.h);
    }
    ctx.globalAlpha = 1;
  },
};

/* Kenji's shadow shuriken. Drawn procedurally (spinning pixel blades + glow). */
class Projectile {
  constructor(owner, def, x, y, dir, vy = 0) {
    this.owner = owner; this.def = def;
    this.x = x; this.y = y; this.dir = dir;
    this.vx = def.speed * dir; this.vy = vy;
    this.kind = def.kind || 'shuriken';       // shuriken(四芒星) / kunai(苦无匕)
    // M1.4「必杀范围不够大」: 远程必杀的弹体统一放大 —— 判定盒与画面同一个系数,
    // 所以看起来变大就是真的变大(def.hitScale 由 roster.js 的范围强化段统一挂)
    this.hs = def.hitScale || 1;
    this.trail = def.trail || 'rgba(125,91,255,0.75)';
    this.t = 0; this.dead = false;
  }

  update() {
    this.x += this.vx; this.y += this.vy; this.t++;
    // M1.3: 边界随 STAGE.left/right 动态(闯关模式世界坐标 >1024; 对战模式数值不变)
    if (this.x < STAGE.left - 100 || this.x > STAGE.right + 100 || this.y < -20 || this.y > STAGE.ground + 20) this.dead = true;
    if (this.t % 2 === 0) {
      Effects.parts.push({
        x: this.x - this.dir * 10, y: this.y + (Math.random() - 0.5) * 10,
        vx: -this.dir * 0.6, vy: (Math.random() - 0.5) * 0.6,
        life: 12, maxLife: 12, size: this.kind === 'kunai' ? 2 : 3, color: this.trail, grav: 0,
      });
    }
  }

  box() {
    const s = this.hs;
    if (this.kind === 'kunai' || this.kind === 'codeshard') {
      return { x1: this.x - 12 * s, y1: this.y - 10 * s, x2: this.x + 12 * s, y2: this.y + 10 * s };
    }
    if (this.kind === 'sunarrow') {
      return { x1: this.x - 20 * s, y1: this.y - 16 * s, x2: this.x + 20 * s, y2: this.y + 16 * s };
    }
    return { x1: this.x - 16 * s, y1: this.y - 14 * s, x2: this.x + 16 * s, y2: this.y + 14 * s };
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (this.hs !== 1) ctx.scale(this.hs, this.hs); // M1.4: 弹体整体放大(与判定盒同系数)
    if (this.kind === 'kunai') {
      // 苦无: 沿飞行方向的匕首(菱形刃+柄+环), 不旋转 —— 直刺感。放大 1.5x 更清晰
      const a = Math.atan2(this.vy, this.vx * this.dir);
      ctx.rotate(a);
      ctx.scale(this.dir * 1.5, 1.5);
      ctx.fillStyle = 'rgba(53,224,216,0.3)';
      ctx.fillRect(-14, -5, 30, 10);                 // 拖影辉光
      ctx.fillStyle = '#eafffd';                     // 菱形刃尖(最亮)
      ctx.fillRect(8, -1, 10, 2);
      ctx.fillStyle = '#d6fff8';                     // 菱形刃身
      ctx.fillRect(3, -2, 8, 4);
      ctx.fillRect(5, -3, 4, 6);
      ctx.fillStyle = '#8fd8d0';                     // 柄
      ctx.fillRect(-10, -1, 13, 2);
      ctx.fillStyle = '#7d5bff';                     // 尾环
      ctx.fillRect(-14, -3, 5, 6);
      ctx.fillStyle = '#c9baff';
      ctx.fillRect(-13, -2, 2, 4);
    } else if (this.kind === 'arrow') {
      // 后羿·落日箭: 银蓝流线箭矢, 沿飞行方向, 不旋转
      const a = Math.atan2(this.vy, this.vx * this.dir);
      ctx.rotate(a);
      ctx.scale(this.dir * 1.5, 1.5);
      ctx.fillStyle = 'rgba(198,208,224,0.28)';
      ctx.fillRect(-16, -4, 32, 8);                  // 拖影
      ctx.fillStyle = '#ffffff';                     // 箭簇
      ctx.fillRect(10, -1, 8, 2);
      ctx.fillRect(8, -2, 4, 4);
      ctx.fillStyle = '#c6d0e0';                     // 箭杆
      ctx.fillRect(-10, -1, 20, 2);
      ctx.fillStyle = '#4a6cb0';                     // 尾羽
      ctx.fillRect(-14, -3, 5, 2);
      ctx.fillRect(-14, 1, 5, 2);
      ctx.fillRect(-16, -1, 4, 2);
    } else if (this.kind === 'fireball') {
      // 安琪拉·火球: 脉动火核 + 外焰, 缓慢自旋
      const pul = 1 + Math.sin(this.t * 0.5) * 0.14;
      ctx.rotate(this.t * 0.2);
      ctx.scale(pul, pul);
      ctx.fillStyle = 'rgba(255,132,40,0.3)';
      ctx.fillRect(-15, -15, 30, 30);                // 热浪
      ctx.fillStyle = '#ff8428';
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillRect(-6, -10, 12, 20);
      ctx.fillStyle = '#ffc531';
      ctx.fillRect(-6, -4, 12, 8);
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = '#fff2d8';                     // 白热核
      ctx.fillRect(-3, -2, 6, 4);
      ctx.fillRect(-2, -3, 4, 6);
    } else if (this.kind === 'featherfan') {
      // 貂蝉·火羽扇: 三叶飞扇(赤扇面+羽白缘+金扇钉), 陀螺式自旋
      ctx.rotate(this.t * 0.55 * this.dir);
      ctx.fillStyle = 'rgba(255,143,179,0.26)';
      ctx.fillRect(-14, -14, 28, 28);               // 花瓣尾光
      for (let k = 0; k < 3; k++) {
        ctx.rotate(Math.PI * 2 / 3);
        ctx.fillStyle = '#e24a40';
        ctx.fillRect(-2, -13, 4, 10);
        ctx.fillRect(-4, -11, 8, 6);
        ctx.fillStyle = '#f8eede';
        ctx.fillRect(-3, -14, 6, 2);
      }
      ctx.fillStyle = '#e8ba4a';                    // 金扇钉
      ctx.fillRect(-2, -2, 4, 4);
    } else if (this.kind === 'datapack') {
      // 博士·死循环: 青蓝代码包, 扫描线随飞行滚动, 不自旋(读作"数据块")
      ctx.scale(this.dir, 1);
      ctx.fillStyle = 'rgba(127,211,255,0.24)';
      ctx.fillRect(-16, -11, 32, 22);               // 辉光场
      ctx.fillStyle = '#1b3a5c';                    // 包体底
      ctx.fillRect(-9, -8, 18, 16);
      ctx.fillStyle = '#50a0dc';                    // 边框
      ctx.fillRect(-9, -8, 18, 2); ctx.fillRect(-9, 6, 18, 2);
      ctx.fillRect(-9, -8, 2, 16); ctx.fillRect(7, -8, 2, 16);
      ctx.fillStyle = '#7fd3ff';                    // 滚动扫描线(代码行)
      for (let k = 0; k < 3; k++) {
        const yy = -5 + ((k * 4 + Math.floor(this.t * 0.6)) % 11);
        ctx.fillRect(-6, yy, 4 + (k % 2) * 6, 1);
      }
      ctx.fillStyle = '#eaf8ff';                    // 前缘白热
      ctx.fillRect(9, -4, 3, 8);
    } else if (this.kind === 'sunarrow') {
      // 后羿·落日重箭: 金红焰箭 —— 日轮箭簇 + 拉长焰尾, 沿飞行方向不自旋
      const a = Math.atan2(this.vy, this.vx * this.dir);
      ctx.rotate(a);
      ctx.scale(this.dir * 1.8, 1.8);
      const pul = 1 + Math.sin(this.t * 0.45) * 0.12;
      ctx.fillStyle = 'rgba(255,122,42,0.26)';
      ctx.fillRect(-22, -7 * pul, 42, 14 * pul);     // 热浪
      ctx.fillStyle = '#ff7a2a';                     // 焰尾
      ctx.fillRect(-20, -2, 14, 4);
      ctx.fillRect(-16, -4, 8, 8);
      ctx.fillStyle = '#ffb648';                     // 箭杆
      ctx.fillRect(-10, -1, 20, 2);
      ctx.fillStyle = '#ffd24a';                     // 日轮(箭簇后的圆盘)
      ctx.fillRect(2, -5, 8, 10);
      ctx.fillRect(0, -3, 12, 6);
      ctx.fillStyle = '#ffffff';                     // 白热箭簇
      ctx.fillRect(11, -1, 8, 2);
      ctx.fillRect(9, -2, 4, 4);
      ctx.fillStyle = '#fff2d8';
      ctx.fillRect(4, -2, 4, 4);
    } else if (this.kind === 'codeshard') {
      // 博士·代码碎片: 青蓝棱片, 高速自旋 + 白芯
      ctx.rotate(this.t * 0.5 * this.dir);
      ctx.fillStyle = 'rgba(127,211,255,0.24)';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#2a66a8';
      ctx.fillRect(-7, -2, 14, 4);
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillStyle = '#50a0dc';
      ctx.fillRect(-5, -1, 10, 2);
      ctx.fillRect(-1, -5, 2, 10);
      ctx.fillStyle = '#eaf8ff';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (this.kind === 'plum') {
      // 小艳·梅吹雪: 一朵旋转的五瓣红梅 + 拖尾落瓣, 慢速自旋(读作"飞花")
      ctx.rotate(this.t * 0.32 * this.dir);
      ctx.fillStyle = 'rgba(226,58,110,0.24)';
      ctx.fillRect(-14, -14, 28, 28);                // 花光晕
      for (let k = 0; k < 5; k++) {                  // 五瓣
        ctx.rotate(Math.PI * 2 / 5);
        ctx.fillStyle = '#e23a6e';
        ctx.fillRect(-3, -12, 6, 9);
        ctx.fillRect(-5, -10, 10, 5);
        ctx.fillStyle = '#ffd6e0';                   // 瓣尖高光
        ctx.fillRect(-2, -12, 4, 2);
      }
      ctx.fillStyle = '#ffcf87';                     // 花蕊(晓金)
      ctx.fillRect(-2, -2, 4, 4);
    } else {
      ctx.fillStyle = 'rgba(125,91,255,0.25)';
      ctx.fillRect(-14, -14, 28, 28);
      ctx.rotate(this.t * 0.45);
      ctx.fillStyle = '#c9baff';
      ctx.fillRect(-13, -3, 26, 6);
      ctx.fillRect(-3, -13, 6, 26);
      ctx.fillStyle = '#35e0d8';
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  }
}
