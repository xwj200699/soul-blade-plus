/* WebAudio synth: all SFX + chiptune BGM are generated, no audio assets. */
'use strict';

const AudioSys = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  let muted = false;
  // BGM = real instrumental mp3s (Lyria-generated), one per scene, routed through bgmBus.
  const BGM_SRC = {
    select: 'assets/audio/bgm/select-3.mp3',  // 丙 幽冷 — 菜单/标题/选人 共用此曲
    battle: 'assets/audio/bgm/battle-1.mp3',  // 甲 幽玄 (丙 battle-3 = 候补)
    result: 'assets/audio/bgm/result-1.mp3',  // 结算 = 余韵 LINGERING (Eric 选定)
  };
  const bgmTrk = {}, bgmBuf = {}; let curBgm = null, bgmInit = false;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0.5; bgmBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      initBgm();
      initSamples();
      if (ctx.state === 'suspended') ctx.resume(); // WKWebView 新建 ctx 默认挂起, 手势内立即 resume
      return true;
    } catch (e) { ctx = null; return false; }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.6;
    return muted;
  }

  // --- primitive voices -------------------------------------------------
  function tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0, curve = 2.5, atk = 0, bus = null } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    if (atk > 0) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + atk); } // 起音渐入去爆音
    else g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur * curve / 2.5);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', delay = 0, slide = 0, atk = 0, bus = null } = {}) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const g = ctx.createGain();
    if (atk > 0) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + atk); } // 起音渐入去爆音
    else g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // 轻/重击 组合方案 (Eric A/B: URL ?sfx=A|B|C) — 强化轻击打击感 + 调整轻重平衡
  let sfxVariant = 'A';
  const HIT_VARIANTS = {
    A: { // 厚重: 轻击加实体低频+脆瞬态(比原来强很多), 重击很闷; 轻重差距明显
      hitL: () => { tone(260, 0.10, { type: 'triangle', vol: 0.42, slide: -140, atk: 0.002 }); tone(110, 0.12, { type: 'sine', vol: 0.32, slide: -45, atk: 0.002 }); noise(0.05, { freq: 3000, type: 'highpass', vol: 0.24, atk: 0.001 }); },
      hitH: () => { tone(120, 0.22, { type: 'sine', vol: 0.58, slide: -75, atk: 0.002 }); tone(205, 0.13, { type: 'triangle', vol: 0.34, slide: -110, atk: 0.002 }); noise(0.12, { freq: 2000, q: 0.7, type: 'bandpass', vol: 0.34, slide: -1200, atk: 0.001 }); },
    },
    B: { // 猛: 轻击更冲更响, 重击更巨(加 sub 低频); 整体更大, 差距保持
      hitL: () => { tone(300, 0.10, { type: 'triangle', vol: 0.46, slide: -160, atk: 0.002 }); tone(120, 0.13, { type: 'sine', vol: 0.36, slide: -55, atk: 0.002 }); noise(0.06, { freq: 3400, type: 'highpass', vol: 0.28, slide: -600, atk: 0.001 }); },
      hitH: () => { tone(104, 0.24, { type: 'sine', vol: 0.64, slide: -60, atk: 0.002 }); tone(200, 0.13, { type: 'triangle', vol: 0.36, slide: -95, atk: 0.002 }); noise(0.13, { freq: 1800, q: 0.7, type: 'bandpass', vol: 0.40, slide: -1100, atk: 0.001 }); tone(60, 0.16, { type: 'sine', vol: 0.30, slide: -18, atk: 0.003 }); },
    },
    C: { // 均衡: 轻重接近、都扎实, 差距小(轻击几乎和重击一样有肉)
      hitL: () => { tone(240, 0.11, { type: 'triangle', vol: 0.44, slide: -120, atk: 0.002 }); tone(125, 0.14, { type: 'sine', vol: 0.40, slide: -50, atk: 0.002 }); noise(0.06, { freq: 2800, type: 'highpass', vol: 0.24, atk: 0.001 }); },
      hitH: () => { tone(120, 0.18, { type: 'sine', vol: 0.50, slide: -60, atk: 0.002 }); tone(210, 0.12, { type: 'triangle', vol: 0.32, slide: -100, atk: 0.002 }); noise(0.10, { freq: 2200, q: 0.7, type: 'bandpass', vol: 0.30, slide: -1200, atk: 0.001 }); },
    },
  };

  // 格挡 3 备选 — Eric 选定 1 (刃鸣); 都明确表达"格挡/兵刃相接", 质感差异化
  let blockVariant = 1;
  const BLOCK_VARIANTS = {
    1: () => { // 刃鸣 CLASH: 明亮金属对击 + 金属余鸣 + 低频撞击 + 火花
      tone(1050, 0.13, { type: 'triangle', vol: 0.42, slide: -240, atk: 0.001 });
      tone(1580, 0.10, { type: 'sine', vol: 0.26, slide: -360, atk: 0.001 });
      tone(300, 0.09, { type: 'sine', vol: 0.34, slide: -90, atk: 0.001 });
      noise(0.06, { freq: 5200, type: 'highpass', vol: 0.30, slide: -1800, atk: 0.001 });
    },
    2: () => { // 盾震 GUARD: 低沉厚实的"当"闷响, 像硬挡吃下冲击, 金属味收敛
      tone(220, 0.14, { type: 'sine', vol: 0.50, slide: -90, atk: 0.001 });
      tone(140, 0.12, { type: 'triangle', vol: 0.34, slide: -50, atk: 0.001 });
      tone(760, 0.06, { type: 'triangle', vol: 0.16, slide: -160, atk: 0.001 });
      noise(0.07, { freq: 1400, type: 'lowpass', vol: 0.26, slide: -600, atk: 0.001 });
    },
    3: () => { // 結界 WARD: 金属 clang + 高频结晶余鸣(呼应朱印結界), 清亮带一丝法术感
      tone(1200, 0.14, { type: 'triangle', vol: 0.36, slide: -260, atk: 0.001 });
      tone(1800, 0.14, { type: 'sine', vol: 0.20, slide: -120, atk: 0.002 });
      tone(2400, 0.12, { type: 'sine', vol: 0.12, slide: -200, atk: 0.003 });
      tone(360, 0.08, { type: 'sine', vol: 0.24, slide: -90, atk: 0.001 });
      noise(0.05, { freq: 6000, type: 'highpass', vol: 0.20, slide: -2000, atk: 0.001 });
    },
  };

  // --- named SFX ---------------------------------------------------------
  const SFX = {
    menuMove:  () => tone(620, 0.06, { vol: 0.18 }),
    menuSel:   () => { tone(700, 0.07, { vol: 0.2 }); tone(1180, 0.1, { vol: 0.18, delay: 0.06 }); },
    menuBack:  () => tone(420, 0.08, { vol: 0.16, slide: -180 }),
    // 升级版(2026-07-08): 保留原街机打击音色, 层叠+起音渐入去糊, 更脆更有冲击。改动限于战斗手感相关音
    jump:      () => { tone(300, 0.13, { type: 'sine', vol: 0.2, slide: 360, atk: 0.004, curve: 2.2 }); noise(0.05, { freq: 2600, type: 'highpass', vol: 0.06, slide: 900, atk: 0.003 }); },
    land:      () => { noise(0.1, { freq: 480, type: 'lowpass', vol: 0.2, slide: -180, atk: 0.003 }); tone(110, 0.09, { type: 'sine', vol: 0.15, slide: -30, atk: 0.003 }); },
    dash:      () => noise(0.13, { freq: 1600, vol: 0.2, slide: -900 }),
    whooshL:   () => { noise(0.10, { freq: 3000, q: 1.2, type: 'bandpass', vol: 0.16, slide: -1900, atk: 0.004 }); noise(0.08, { freq: 1400, q: 0.8, type: 'bandpass', vol: 0.12, slide: -700, atk: 0.003 }); },
    whooshH:   () => { noise(0.18, { freq: 1600, q: 0.9, type: 'bandpass', vol: 0.20, slide: -1100, atk: 0.005 }); noise(0.14, { freq: 600, q: 0.7, type: 'lowpass', vol: 0.16, slide: -300, atk: 0.005 }); tone(150, 0.12, { type: 'sine', vol: 0.10, slide: -70, atk: 0.004 }); },
    hitL:      () => HIT_VARIANTS[sfxVariant].hitL(),
    hitH:      () => HIT_VARIANTS[sfxVariant].hitH(),
    /* ---- M1.4 受击层 ----------------------------------------------------
       原本"打中"只有一个打击点音(hitL/hitH), 挨打的一方是没有声音的。这里补
       一层受击音: 身体闷响 + 短促吐气, 由 fighter.receiveHit 在挨打侧按伤害
       分档播放, 与打击点叠在同一帧 —— 打人和被打各有各的反馈。 */
    hurtL:     () => { tone(178, 0.09, { type: 'sine', vol: 0.24, slide: -66, atk: 0.002 });
                       noise(0.07, { freq: 900, q: 0.7, type: 'bandpass', vol: 0.18, slide: -480, atk: 0.002 }); },
    hurtH:     () => { tone(128, 0.16, { type: 'sine', vol: 0.32, slide: -52, atk: 0.002 });
                       noise(0.13, { freq: 640, q: 0.6, type: 'bandpass', vol: 0.26, slide: -360, atk: 0.002 });
                       tone(318, 0.08, { type: 'triangle', vol: 0.15, slide: -150, atk: 0.002 }); },
    hurtCrit:  () => { tone(104, 0.24, { type: 'sine', vol: 0.42, slide: -40, atk: 0.002 });
                       noise(0.2, { freq: 520, q: 0.6, type: 'bandpass', vol: 0.32, slide: -300, atk: 0.002 });
                       tone(240, 0.12, { type: 'triangle', vol: 0.2, slide: -130, delay: 0.02, atk: 0.002 });
                       noise(0.09, { freq: 3800, type: 'highpass', vol: 0.16, slide: -1600, atk: 0.001 }); },
    /* ---- M1.4 技能发动层 ------------------------------------------------
       必杀/超必按下去的那一瞬间要"喊出来": 起手风鸣 + 上行泛音。原来只有
       挥刀的 whoosh, 放技能和普攻在听觉上分不出来。 */
    skillCast: () => { tone(176, 0.26, { type: 'sawtooth', vol: 0.24, slide: 520, atk: 0.006 });
                       noise(0.2, { freq: 800, q: 1.1, type: 'bandpass', vol: 0.16, slide: 1500, atk: 0.01 });
                       tone(1180, 0.1, { type: 'sine', vol: 0.14, delay: 0.16 }); },
    superCast: () => { tone(58, 0.5, { type: 'sine', vol: 0.44, slide: 74, atk: 0.004, curve: 1.6 });
                       noise(0.32, { freq: 1200, q: 0.8, type: 'bandpass', vol: 0.2, slide: 2000, atk: 0.02 });
                       [523, 784, 1046].forEach((f, i) => tone(f, 0.14, { vol: 0.2, delay: 0.08 + i * 0.08 })); },
    block:     () => BLOCK_VARIANTS[blockVariant](),
    special:   () => { tone(210, 0.2, { type: 'sawtooth', vol: 0.26, slide: 700 }); noise(0.18, { freq: 900, vol: 0.16, slide: 1400 }); },
    projectile:() => tone(320, 0.14, { vol: 0.22, slide: -160 }),
    tele:      () => tone(1250, 0.18, { type: 'sine', vol: 0.24, slide: -1050 }),
    superFlash:() => { tone(75, 0.5, { type: 'sawtooth', vol: 0.3, slide: 560 }); noise(0.5, { freq: 400, vol: 0.2, slide: 2400 }); },
    dodge:     () => noise(0.12, { freq: 2600, vol: 0.2, slide: -1800 }),
    slam:      () => { tone(72, 0.26, { type: 'sine', vol: 0.5, slide: -32 }); noise(0.22, { freq: 520, type: 'lowpass', vol: 0.4 }); },
    crush:     () => { noise(0.3, { freq: 3200, vol: 0.34, slide: -2400 }); tone(880, 0.26, { vol: 0.2, slide: -620 }); tone(1320, 0.18, { vol: 0.14, delay: 0.04, slide: -800 }); },
    ko:        () => { tone(150, 0.7, { type: 'sine', vol: 0.5, slide: -110 }); noise(0.55, { freq: 700, type: 'lowpass', vol: 0.4 }); },
    round:     () => { tone(392, 0.12, { vol: 0.2 }); tone(523, 0.12, { vol: 0.2, delay: 0.1 }); tone(659, 0.2, { vol: 0.22, delay: 0.2 }); },
    fight:     () => { tone(523, 0.1, { vol: 0.24 }); tone(784, 0.24, { vol: 0.26, delay: 0.08 }); },
    beep:      () => tone(1050, 0.07, { vol: 0.18 }),
    getup:     () => noise(0.08, { freq: 800, type: 'lowpass', vol: 0.16 }),
    win:       () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.2, delay: i * 0.12 })); },
    lose:      () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.2, delay: i * 0.14 })); },

    // ---- M1.2 三新角色超杀专属音效(全合成) ----------------------------
    // 悟空: 战鼓起手 stinger / 棍击厚重木石感 / 落地重砸崩裂
    superWukong: () => {
      tone(98, 0.22, { type: 'sine', vol: 0.5, slide: -30, atk: 0.002 });
      noise(0.16, { freq: 500, type: 'lowpass', vol: 0.34, slide: -220, atk: 0.002 });
      [392, 523, 784].forEach((f, i) => tone(f, 0.09, { vol: 0.22, delay: 0.10 + i * 0.07 }));
    },
    staffHit: () => {
      tone(190, 0.11, { type: 'triangle', vol: 0.44, slide: -95, atk: 0.002 });
      tone(88, 0.14, { type: 'sine', vol: 0.36, slide: -30, atk: 0.002 });
      noise(0.07, { freq: 1500, type: 'lowpass', vol: 0.3, slide: -600, atk: 0.001 });
    },
    staffSlam: () => {
      tone(58, 0.4, { type: 'sine', vol: 0.62, slide: -22, atk: 0.002 });
      noise(0.34, { freq: 360, type: 'lowpass', vol: 0.48, slide: -160, atk: 0.002 });
      noise(0.12, { freq: 2600, type: 'highpass', vol: 0.24, slide: -1400, atk: 0.001 });
      tone(150, 0.16, { type: 'triangle', vol: 0.26, slide: -70, delay: 0.03 });
    },
    // 后羿: 拉弓蓄力吱鸣 stinger / 放箭破空 / 光箭命中 / 太阳箭轰鸣
    superHouyi: () => {
      noise(0.5, { freq: 620, q: 3, type: 'bandpass', vol: 0.26, slide: 900, atk: 0.03 });
      tone(1568, 0.12, { type: 'sine', vol: 0.16, delay: 0.22 });
      tone(2093, 0.16, { type: 'sine', vol: 0.14, delay: 0.34 });
    },
    arrowLoose: () => {
      tone(880, 0.06, { vol: 0.2, slide: -480, atk: 0.001 });
      noise(0.09, { freq: 3200, type: 'highpass', vol: 0.22, slide: -1600, atk: 0.001 });
    },
    arrowHit: () => {
      tone(500, 0.07, { type: 'triangle', vol: 0.3, slide: -280, atk: 0.001 });
      noise(0.05, { freq: 2800, type: 'highpass', vol: 0.18, slide: -900, atk: 0.001 });
    },
    sunArrow: () => {
      noise(0.3, { freq: 900, q: 0.8, type: 'bandpass', vol: 0.34, slide: 2200, atk: 0.004 });
      tone(72, 0.42, { type: 'sine', vol: 0.56, slide: -24, delay: 0.05, atk: 0.002 });
      tone(1046, 0.2, { vol: 0.2, delay: 0.08, slide: -300 });
      noise(0.28, { freq: 480, type: 'lowpass', vol: 0.4, delay: 0.06, atk: 0.002 });
    },
    // 安琪拉: 充能上行尖鸣 stinger / 光束持续体 / 照射灼击 / 终段爆发
    superAngela: () => {
      tone(300, 0.55, { type: 'sine', vol: 0.28, slide: 1150, atk: 0.02, curve: 1.6 });
      noise(0.4, { freq: 2400, q: 2, type: 'bandpass', vol: 0.14, slide: 2600, atk: 0.03 });
      tone(2093, 0.1, { type: 'sine', vol: 0.12, delay: 0.42 });
    },
    beamFire: () => {
      tone(96, 0.85, { type: 'sawtooth', vol: 0.32, slide: 26, atk: 0.01, curve: 1.5 });
      tone(192, 0.8, { type: 'sawtooth', vol: 0.18, slide: 40, delay: 0.02, atk: 0.01, curve: 1.5 });
      noise(0.8, { freq: 4800, type: 'highpass', vol: 0.15, slide: 800, atk: 0.02 });
    },
    beamHit: () => {
      tone(1350, 0.05, { vol: 0.18, slide: -320, atk: 0.001 });
      noise(0.04, { freq: 4200, type: 'highpass', vol: 0.14, atk: 0.001 });
    },
    beamBurst: () => {
      tone(92, 0.32, { type: 'sine', vol: 0.55, slide: -40, atk: 0.002 });
      noise(0.36, { freq: 850, type: 'lowpass', vol: 0.42, slide: -400, atk: 0.002 });
      tone(660, 0.2, { vol: 0.22, delay: 0.05, slide: -380 });
      noise(0.14, { freq: 5200, type: 'highpass', vol: 0.18, delay: 0.03, slide: -2000 });
    },
    // 貂蝉: 花舞起手铃音 stinger / 幻舞扇斩切音 / 终结花雨爆散
    superDiaochan: () => {
      [1046, 1318, 1568].forEach((f, i) => tone(f, 0.12, { type: 'sine', vol: 0.18, delay: i * 0.07 }));
      noise(0.3, { freq: 2600, q: 1.4, type: 'bandpass', vol: 0.18, slide: 1400, atk: 0.02 });
      tone(160, 0.2, { type: 'sine', vol: 0.3, slide: -50, atk: 0.003 });
    },
    fanHit: () => {
      noise(0.07, { freq: 3600, type: 'highpass', vol: 0.26, slide: -1800, atk: 0.001 });
      tone(720, 0.07, { type: 'triangle', vol: 0.26, slide: -320, atk: 0.001 });
      tone(140, 0.09, { type: 'sine', vol: 0.2, slide: -40, atk: 0.002 });
    },
    fanFinale: () => {
      tone(96, 0.3, { type: 'sine', vol: 0.5, slide: -36, atk: 0.002 });
      noise(0.3, { freq: 1000, type: 'lowpass', vol: 0.36, slide: -420, atk: 0.002 });
      [1568, 2093].forEach((f, i) => tone(f, 0.16, { type: 'sine', vol: 0.14, delay: 0.06 + i * 0.08 }));
      noise(0.16, { freq: 5600, type: 'highpass', vol: 0.16, delay: 0.04, slide: -2200 });
    },
  };

  function sfx(name) { if (ctx && !muted && SFX[name]) SFX[name](); }

  /* ================= 角色专属采样音效 (M1.4) =================
     素材放在 音效/<中文名>/ 下, 按按键命名 —— j/k/u/i 对应 轻/重/必杀/超必,
     「大招起手」对应超必发动那一下。这里只做"有采样就用采样, 没有就退回合成音":
     · 路径含中文, fetch 前必须 encodeURI
     · file:// 下 fetch 会失败(与 BGM 同一限制) -> 静默回退到合成音, 不报错不静音
     · 走 sfxBus, 所以音效音量键(9/0)与静音(M)照常生效 */
  const CHAR_SFX = {
    mack: {                                    // 文杰(玩家提供的实录音效)
      light: '音效/文杰/j.mp3',
      heavy: '音效/文杰/k.mp3',
      special: '音效/文杰/u.mp3',
      super: '音效/文杰/i.mp3',
      superCast: '音效/文杰/大招起手.mp3',
      vol: 0.9,
    },
  };
  const smpBuf = {};            // 'mack:heavy' -> AudioBuffer
  let smpInit = false;

  function initSamples() {
    if (smpInit || !ctx) return;
    smpInit = true;
    for (const [cid, tbl] of Object.entries(CHAR_SFX)) {
      for (const [key, src] of Object.entries(tbl)) {
        if (key === 'vol') continue;
        fetch(encodeURI(src))
          .then(r => r.arrayBuffer())
          .then(a => ctx.decodeAudioData(a))
          .then(buf => { smpBuf[cid + ':' + key] = buf; })
          .catch(() => { /* file:// 或缺文件: 保持回退到合成音 */ });
      }
    }
  }

  function hasSample(cid, key) { return !!smpBuf[cid + ':' + key]; }

  /* 播放角色采样; 返回是否真的播了(没播的话调用方去放合成音) */
  function moveSfx(cid, key) {
    const buf = smpBuf[cid + ':' + key];
    if (!ctx || muted || !buf) return false;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = (CHAR_SFX[cid] && CHAR_SFX[cid].vol) || 0.9;
    src.buffer = buf;
    src.connect(g); g.connect(sfxBus);
    src.start(ctx.currentTime);
    return true;
  }

  // --- BGM: real instrumental mp3s decoded to AudioBuffers and looped SAMPLE-ACCURATELY.
  //     HTMLAudio's .loop has an audible seek-gap at the wrap (Eric heard the "断"), so each
  //     track loops forever via an AudioBufferSourceNode(loop=true) on its own gain; scene
  //     changes only crossfade the gains (position kept, no restart pop). loopStart/loopEnd
  //     auto-trim the mp3 encoder's head/tail near-silence so the wrap has zero dead air. ---
  const BGM_FADE = 0.9; // seconds — crossfade / 淡入淡出

  // trim leading/trailing near-silence (mp3 padding) → clean loop wrap; fall back to full buffer
  function computeLoop(buf) {
    const thr = 0.004, ch = buf.getChannelData(0), n = ch.length, sr = buf.sampleRate;
    let s = 0, e = n - 1;
    while (s < n && Math.abs(ch[s]) < thr) s++;
    while (e > s && Math.abs(ch[e]) < thr) e--;
    const loopStart = Math.max(0, s / sr - 0.005);
    const loopEnd = Math.min(buf.duration, (e + 1) / sr + 0.02);
    return (loopEnd > loopStart + 0.5) ? { loopStart, loopEnd } : { loopStart: 0, loopEnd: buf.duration };
  }

  // smooth gain ramp, continuing from the current (possibly mid-ramp) value
  function fadeTo(track, target, when) {
    // playBgm 被主循环每帧调用(60/s×全轨道): 目标没变就必须跳过, 否则每秒
    // ~540 次 cancel+set+ramp 持续抽打音频线程(2026-07-11 声画不同步排查)
    if (track.target === target) return;
    track.target = target;
    const g = track.gain.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(g.value, when);
    g.linearRampToValueAtTime(target, when + BGM_FADE);
  }

  // start a track's looping source (idempotent). Sources are one-shot, so we keep them
  // running forever (muted when off-scene) — position kept, no restart pop, gapless wrap.
  function startSource(name) {
    const t = bgmTrk[name];
    if (!t || t.src || !bgmBuf[name]) return;
    const src = ctx.createBufferSource();
    src.buffer = bgmBuf[name];
    src.loop = true;
    src.loopStart = t.loop.loopStart;
    src.loopEnd = t.loop.loopEnd;
    src.connect(t.gain);
    src.start(0, t.loop.loopStart);
    t.src = src;
  }

  function initBgm() {
    if (bgmInit || !ctx) return;
    bgmInit = true;
    for (const name in BGM_SRC) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(bgmBus);
      bgmTrk[name] = { gain, src: null, loop: { loopStart: 0, loopEnd: 0 } };
      fetch(BGM_SRC[name])
        .then(r => r.arrayBuffer())
        .then(a => ctx.decodeAudioData(a))
        .then(buf => {
          bgmBuf[name] = buf;
          bgmTrk[name].loop = computeLoop(buf);
          startSource(name);                                    // loops forever, silent…
          if (name === curBgm) fadeTo(bgmTrk[name], 1, ctx.currentTime); // …unless it's the live scene
        })
        .catch(e => console.warn('BGM decode failed:', name, e));
    }
  }

  /* ================= Boss 曲(合成) =================
     仓库里只有 select/battle/result 三首 mp3, 没有 Boss 曲, 而 ×10 耐久 Boss 要
     打好几分钟 —— 同一段 battle 循环会腻。这里用现成的 tone/noise 合成一首
     16 步循环的 Boss 曲(全部走 bgmBus, 音乐音量与静音照常生效), 不新增音频资源。
     编排: 四踩底鼓 + 反拍军鼓 + 十六分闭镲 + 推进贝斯 + A 小调五声琶音,
     两小节一循环, 第二小节降到 F 制造压迫。lookahead 调度: 每 120ms 把未来
     350ms 内的步子排进 WebAudio 时间轴, 停止只需 clearInterval(尾音自然收)。 */
  const BOSS_BPM = 138, BOSS_STEP = 60 / BOSS_BPM / 4;
  const BASS = [110.0, 87.31];                       // A2 / F2 (两小节轮换)
  const ARP = [440.0, 329.63, 261.63, 329.63];       // A4 E4 C4 E4
  let bossTimer = null, bossStep = 0, bossNext = 0;

  function bossSchedule(step, at) {
    const bar = (step >> 4) & 1;                     // 0/1 小节
    const i = step & 15;
    const root = BASS[bar];
    const B = bgmBus;
    if (i % 2 === 0) {                               // 贝斯: 八分推进 + 小节末上行
      const f = i === 14 ? root * 1.5 : root;
      tone(f, BOSS_STEP * 1.7, { type: 'sawtooth', vol: 0.16, slide: -6, atk: 0.004, delay: at, bus: B });
      tone(f / 2, BOSS_STEP * 1.7, { type: 'sine', vol: 0.13, atk: 0.006, delay: at, bus: B });
    }
    if (i === 0 || i === 4 || i === 8 || i === 12) {  // 底鼓
      tone(58, 0.16, { type: 'sine', vol: 0.3, slide: -18, atk: 0.002, delay: at, bus: B });
      noise(0.07, { freq: 320, type: 'lowpass', vol: 0.16, atk: 0.002, delay: at, bus: B });
    }
    if (i === 6 || i === 14) {                       // 军鼓(反拍)
      noise(0.09, { freq: 2200, type: 'highpass', vol: 0.13, slide: -900, atk: 0.001, delay: at, bus: B });
    }
    noise(0.03, { freq: 7000, type: 'highpass', vol: i % 2 ? 0.035 : 0.06, atk: 0.001, delay: at, bus: B });
    if (i % 2 === 1) {                               // 琶音(十六分反拍, 亮线)
      const f = ARP[(step >> 1) % ARP.length] * (bar ? 0.94 : 1);
      tone(f, BOSS_STEP * 1.1, { type: 'square', vol: 0.055, atk: 0.003, delay: at, bus: B });
    }
    if (i === 15) {                                  // 小节收尾: 一记低频扫弦
      noise(0.18, { freq: 900, q: 0.8, type: 'bandpass', vol: 0.07, slide: -600, atk: 0.01, delay: at, bus: B });
    }
  }

  function bossPump() {
    if (!ctx || bossTimer === null) return;
    const ahead = ctx.currentTime + 0.35;
    let guard = 0;
    while (bossNext < ahead && guard++ < 64) {
      bossSchedule(bossStep % 32, Math.max(0, bossNext - ctx.currentTime));
      bossStep++;
      bossNext += BOSS_STEP;
    }
  }

  function startBoss() {
    if (!ctx || bossTimer !== null) return;           // 幂等: playBgm 每帧都被调
    bossStep = 0;
    bossNext = ctx.currentTime + 0.08;
    bossTimer = setInterval(bossPump, 120);
    bossPump();
  }

  function stopBoss() {
    if (bossTimer === null) return;
    clearInterval(bossTimer);
    bossTimer = null;
  }

  function playBgm(name) {
    if (name === 'boss') {          // Boss 曲是合成的, 不在 BGM_SRC 里
      curBgm = 'boss';
      if (!ctx) return;
      initBgm();
      const now = ctx.currentTime;
      for (const k in bgmTrk) if (bgmTrk[k].src) fadeTo(bgmTrk[k], 0, now); // mp3 全部淡出
      startBoss();
      return;
    }
    if (!BGM_SRC[name]) return;
    stopBoss();
    curBgm = name;
    if (!ctx) return;                     // remembered; ensure() → initBgm() → decode applies it
    initBgm();
    const now = ctx.currentTime;
    for (const k in bgmTrk) if (bgmTrk[k].src) fadeTo(bgmTrk[k], k === name ? 1 : 0, now); // gain-only crossfade
  }

  function stopBgm() {
    curBgm = null;
    stopBoss();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const k in bgmTrk) if (bgmTrk[k].src) fadeTo(bgmTrk[k], 0, now);
  }

  return {
    ensure, sfx, playBgm, stopBgm, toggleMute,
    moveSfx, hasSample,          // M1.4 角色专属采样(文杰 j/k/u/i/大招起手)
    // M1.3: 实测视频录制 —— master 总线旁路成 MediaStream(附加输出, 正常出声不受影响)
    recorderStream() {
      if (!ctx || !master) return (typeof MediaStream !== 'undefined') ? new MediaStream() : null;
      if (!this._recDest) { this._recDest = ctx.createMediaStreamDestination(); master.connect(this._recDest); }
      return this._recDest.stream;
    },
    // M1: 独立音量控制(0..1), 返回当前值供 HUD 提示
    nudgeBgm(dv) { if (!bgmBus) return 0; bgmBus.gain.value = Math.max(0, Math.min(1, bgmBus.gain.value + dv)); return bgmBus.gain.value; },
    nudgeSfx(dv) { if (!sfxBus) return 0; sfxBus.gain.value = Math.max(0, Math.min(1, sfxBus.gain.value + dv)); return sfxBus.gain.value; },
    setVariant(v) { if (HIT_VARIANTS[v]) sfxVariant = v; }, // 切换轻/重击组合 A/B/C
    setBlockVariant(n) { if (BLOCK_VARIANTS[n]) blockVariant = n; }, // 切换格挡 1/2/3
    get sfxVariant() { return sfxVariant; }, get blockVariant() { return blockVariant; },
    get muted() { return muted; }, get ready() { return !!ctx; },
  };
})();
