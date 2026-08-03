/* 血刃 CRIMSON EDGE · M1.3 STORY 闯关模式 (恐龙快打式横板推进)
   自包含模式模块: 复用 Fighter / AIController / Effects / Projectile / tryHit,
   自带 多敌同屏战斗解算 + 推进相机 + 波次/Boss + 剧情对话条 + 专属 HUD。
   进入: Quest.start(heroId, diff)  (select2 的 STORY 流程调用)
   世界坐标: 关卡宽 2400-2600px, 相机跟随; STAGE.left/right 在本模式内被
   动态改写为当前活动区(战斗锁定=当前屏), 退出时还原。 */
'use strict';

const Quest = {
  st: null,
  _stageOrig: { left: STAGE.left, right: STAGE.right },

  DIFF: {
    easy:   { mook: 0.8,  boss: 0.85, ai: 'easy',   bossAi: 'normal', heal: 0.6 },
    normal: { mook: 1.0,  boss: 1.0,  ai: 'easy',   bossAi: 'normal', heal: 0.45 },
    hard:   { mook: 1.25, boss: 1.15, ai: 'normal', bossAi: 'hard',   heal: 0.35 },
  },

  LEVELS: [
    {
      name: '第一幕 · 血暮神社', sub: 'ACT I', stageSel: 0, worldW: 2400,
      intro: [['？？？', '神社的樱花……被血染红了。'],
              ['旅人', '血刃现世，群邪蠢动。先从这里的影武者问起。']],
      bossTalk: [['隼人·真影', '想寻血刃？先胜过我手中之刃。']],
      outro: [['旅人', '「血刃在都市霓虹的深处。」——他倒下前如是说。']],
      waves: [
        { at: 780, mooks: [['kenji', 40], ['kenji', 40]] },
        { at: 1560, mooks: [['kenji', 40], ['ayame', 44], ['kenji', 40]] },
      ],
      boss: { id: 'kenji', hp: 150, name: '隼人·真影' },
    },
    {
      name: '第二幕 · 霓虹都市', sub: 'ACT II', stageSel: 1, worldW: 2400,
      intro: [['旅人', '雨夜的天台。杀气藏在霓虹灯影之间。']],
      bossTalk: [['夜叉·綾', '再往前一步，就把命留下。']],
      outro: [['旅人', '夜叉低语：「青铜神殿……血刃归座之地。」']],
      waves: [
        { at: 740, mooks: [['ayame', 42], ['ayame', 42]] },
        { at: 1540, mooks: [['ayame', 42], ['houyi', 46], ['ayame', 42]] },
      ],
      boss: { id: 'ayame', hp: 150, name: '夜叉·綾' },
    },
    {
      name: '终幕 · 青铜神殿', sub: 'FINAL ACT', stageSel: 3, worldW: 2600,
      intro: [['旅人', '兽面之下，血刃悬于王座。'],
              ['？？？', '想拔刃者——先问过大聖！']],
      bossTalk: [['大聖·悟空', '俺这棒下，从无全身而退之人！']],
      outro: [['旅人', '血刃归鞘。传说，就此收笔。']],
      waves: [
        { at: 700, mooks: [['wukong', 46], ['houyi', 44]] },
        { at: 1400, mooks: [['angela', 44], ['houyi', 44], ['wukong', 46]] },
        { at: 2000, mooks: [['ayame', 42], ['kenji', 42]] },
      ],
      boss: { id: 'wukong', hp: 170, name: '大聖·悟空' },
    },
  ],

  MOOK_TINTS: ['brightness(0.62) saturate(0.45)', 'brightness(0.56) saturate(0.5) hue-rotate(40deg)',
               'brightness(0.6) saturate(0.4) hue-rotate(-45deg)'],

  /* ---------------- lifecycle ---------------- */
  start(heroId, diff) {
    this.st = {
      heroId, diff: diff || 'normal',
      level: 0, phase: 'talk', talkQ: [], talkNext: 'walk',
      cam: 0, waveIdx: 0, wavesDone: false, arenaLock: null,
      enemies: [], boss: null, player: null, dummy: null,
      kills: 0, t0: G.tick, over: false, paused: false,
      fade: 24, // 开幕淡入
    };
    G.p2IsAI = true;
    G.mode = 'quest';
    G.fighters = [];
    G.projectiles = [];
    Effects.reset();
    this.loadLevel(0);
    G.screen = 'quest';
    AudioSys.playBgm('battle');
  },

  loadLevel(i) {
    const st = this.st, L = this.LEVELS[i];
    st.level = i;
    G.stageSel = L.stageSel;
    st.cam = 0;
    st.waveIdx = 0;
    st.wavesDone = false;
    st.arenaLock = null;
    st.enemies = [];
    st.boss = null;
    st.phase = 'talk';
    st.talkQ = L.intro.slice();
    st.talkNext = 'walk';
    st.fade = 24;
    G.projectiles = [];
    Effects.reset();
    STAGE.left = 50; STAGE.right = L.worldW - 50;
    const keepHp = st.player ? st.player.hp : null;
    const keepMeter = st.player ? st.player.meter : 0;
    st.player = new Fighter(st.heroId, 220, 1, G);
    // 过关回血(按难度)而非全恢复 —— 保留闯关资源压力
    if (keepHp !== null) {
      const D = this.DIFF[st.diff];
      st.player.hp = Math.min(100, Math.round(keepHp + 100 * D.heal));
      st.player.meter = keepMeter;
    }
    st.player.dispHp = st.player.hp;
    // 影子陪练(不更新不绘制): 无敌人时给 player.update(opp) 一个稳定视线锚
    st.dummy = new Fighter('mack', L.worldW + 600, -1, G);
    st.dummy.frozen = 9e9;
    G.fighters = [st.player]; // 供引擎内部引用(如 Effects 文本挂靠)
    setAnn(L.sub + ' — ' + L.name.split('·')[1].trim(), 'round', 90);
  },

  exit(toTitle = true) {
    STAGE.left = this._stageOrig.left;
    STAGE.right = this._stageOrig.right;
    G.mode = 'versus';
    G.fighters = [];
    G.projectiles = [];
    Effects.reset();
    this.st = null;
    if (toTitle) { G.screen = 'title'; AudioSys.playBgm('select'); }
  },

  /* ---------------- spawning ---------------- */
  _mkEnemy(id, hp, x, tintIdx) {
    const D = this.DIFF[this.st.diff];
    const f = new Fighter(id, x, x > this.st.player.x ? -1 : 1, G);
    f.maxHp = f.hp = Math.round(hp * D.mook);
    f.dispHp = f.hp;
    f.isMook = true;
    f.tint = this.MOOK_TINTS[tintIdx % this.MOOK_TINTS.length];
    f._ai = new AIController(f, this.st.player, D.ai, G);
    f._deadT = 0;
    return f;
  },

  spawnWave(w) {
    const st = this.st;
    const cam = st.cam;
    st.arenaLock = { left: cam + 46, right: cam + 978 };
    STAGE.left = st.arenaLock.left; STAGE.right = st.arenaLock.right;
    w.mooks.forEach(([id, hp], k) => {
      // 左右交替入场, 靠屏缘
      const side = k % 2 === 0 ? 1 : -1;
      const x = side > 0 ? cam + 940 - k * 26 : cam + 84 + k * 26;
      st.enemies.push(this._mkEnemy(id, hp, x, k));
    });
    setAnn(`WAVE ${st.waveIdx + 1}`, 'round', 56);
    AudioSys.sfx('round');
  },

  spawnBoss() {
    const st = this.st, L = this.LEVELS[st.level], D = this.DIFF[st.diff];
    const cam = st.cam;
    st.arenaLock = { left: cam + 46, right: cam + 978 };
    STAGE.left = st.arenaLock.left; STAGE.right = st.arenaLock.right;
    const b = new Fighter(L.boss.id, cam + 880, -1, G);
    b.maxHp = b.hp = Math.round(L.boss.hp * D.boss);
    b.dispHp = b.hp;
    b.isBoss = true;
    b.bossName = L.boss.name;
    b._ai = new AIController(b, st.player, D.bossAi, G);
    b._deadT = 0;
    st.boss = b;
    st.enemies.push(b);
    setAnn('BOSS', 'ko', 70, L.boss.name);
    AudioSys.sfx('superFlash');
  },

  /* ---------------- per-tick update ---------------- */
  update() {
    const st = this.st;
    if (!st) return;
    const L = this.LEVELS[st.level];

    // 暂停(ESC): 简版 —— J/点击恢复, ESC 再按退出到标题
    if (Input.consume('Escape') || Input.consume('KeyP')) {
      if (!st.paused) { st.paused = true; AudioSys.sfx('menuSel'); }
      else { this.exit(); AudioSys.sfx('menuBack'); return; }
    }
    if (st.paused) {
      if (Input.consume('KeyJ') || Input.click(0, 0, 1024, 576)) { st.paused = false; AudioSys.sfx('menuSel'); }
      return;
    }
    if (st.fade > 0) st.fade--;

    // 对话/结算类冻结相
    if (st.phase === 'talk' || st.phase === 'clear' || st.phase === 'over') {
      Effects.update();
      if (st.phase === 'talk') {
        if (Input.consume('KeyJ') || Input.consume('Enter') || Input.click(0, 0, 1024, 576)) {
          st.talkQ.shift();
          AudioSys.sfx('menuMove');
          if (!st.talkQ.length) {
            st.phase = st.talkNext;
            if (st.talkNext === 'bossfight') this.spawnBoss();
            if (st.talkNext === 'nextlevel') {
              if (st.level + 1 >= this.LEVELS.length) { st.phase = 'clear'; AudioSys.playBgm('result'); AudioSys.sfx('win'); }
              else this.loadLevel(st.level + 1);
            }
          }
        }
      } else if (st.phase === 'over') {
        if (Input.consume('KeyJ') || Input.click(0, 0, 1024, 576)) { // 重试本关
          const hid = st.heroId, df = st.diff, lv = st.level, kills = st.kills;
          st.player = null;
          this.loadLevel(lv);
          st.kills = kills;
          st.phase = 'talk';
          AudioSys.sfx('menuSel');
        } else if (Input.consume('KeyK')) { this.exit(); }
      } else if (st.phase === 'clear') {
        if (Input.consume('KeyJ') || Input.consume('Escape') || Input.click(0, 0, 1024, 576)) this.exit();
      }
      return;
    }

    // announcements / hitstop / slowmo (与 updateFight 同规)
    if (G.ann) { G.ann.t++; if (G.ann.t >= G.ann.dur) G.ann = null; }
    if (G.superBanner) { G.superBanner.t--; if (G.superBanner.t <= 0) G.superBanner = null; }
    if (G.hitstopT > 0) { G.hitstopT--; Effects.update(0.35); return; }
    if (G.slowmoT > 0) {
      G.slowmoT--;
      if (G.slowmoT <= 0) G.slowmo = 1;
      G.slowAcc += G.slowmo;
      if (G.slowAcc < 1) { Effects.update(G.slowmo); return; }
      G.slowAcc -= 1;
    }

    const p = st.player;
    const alive = st.enemies.filter(e => !e.dead);

    // ---- 阶段推进 ----
    if (st.phase === 'walk') {
      // 解锁横向边界(全世界), 相机跟随
      STAGE.left = 50; STAGE.right = L.worldW - 50;
      const nextWave = L.waves[st.waveIdx];
      if (nextWave && p.x >= nextWave.at) {
        st.phase = 'fight';
        this.spawnWave(nextWave);
        return; // 本 tick 结束: 防止下方清场判定用到 spawn 前的 alive 快照
      } else if (!nextWave && !st.wavesDone) {
        st.wavesDone = true;
      }
      if (st.wavesDone && p.x >= L.worldW - 620 && !st.boss) {
        // Boss 前哨: 锁屏 + boss 对白
        st.cam = Math.max(0, Math.min(L.worldW - 1024, L.worldW - 1024));
        st.phase = 'talk';
        st.talkQ = L.bossTalk.slice();
        st.talkNext = 'bossfight';
        return;
      }
    }
    if (st.phase === 'fight' || st.phase === 'bossfight') {
      // 清场判定必须用实时存活数(不能用 tick 开头的 alive 快照 —— 曾致
      // spawn 同 tick 被误判清场, 波次锁场失效、敌人漏进走图相围杀玩家)
      const nowAlive = st.enemies.filter(e => !e.dead);
      if (st.enemies.length > 0 && !nowAlive.length) {
        // 波次/Boss 清空
        if (st.boss && st.boss.dead) {
          st.phase = 'talk';
          st.talkQ = L.outro.slice();
          st.talkNext = 'nextlevel';
          st.arenaLock = null;
          return;
        }
        st.waveIdx++;
        st.arenaLock = null;
        st.phase = 'walk';
        Effects.text(p.x, p.y - 210, 'GO ➤', '#ffe27a', 18);
        AudioSys.sfx('menuSel');
      }
    }

    // ---- pads ----
    p.pad = humanPad();
    // 敌人: 最近 2 名可攻击, 其余只走位(围而不殴 —— 恐龙快打式喘息)
    const ranked = alive.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    for (const e of alive) {
      e.pad = e._ai.update();
      if (ranked.indexOf(e) > 1) {
        e.pad.light = e.pad.heavy = e.pad.special = e.pad.super = false;
      }
      // 玩家超杀演出中: 全场敌人定身(cine 不被围殴打断)
      if (p.superSeq) { e.pad = emptyPad(); e.frozen = Math.max(e.frozen, 2); }
    }

    // ---- updates ----
    const focus = ranked[0] || st.dummy;
    p.update(focus);
    for (const e of alive) e.update(p);

    // 死亡敌人余尸计时(死亡动画演完后移除)
    for (const e of st.enemies) {
      if (e.dead) {
        e._deadT++;
        if (e._deadT === 1) {
          st.kills++;
          Effects.spark(e.x, e.y - 90, 0, ['#ffd24a', '#ffffff', '#c8452c'], 12, 5);
          p.gainMeter(8);
        }
        if (e._deadT < 56) e.update(p); // 死亡动画推进
      }
    }
    st.enemies = st.enemies.filter(e => !e.dead || e._deadT < 56 || e.isBoss);

    // ---- 推挤(玩家 vs 敌 + 敌 vs 敌) ----
    const bodies = [p, ...alive];
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      this._pushPair(bodies[i], bodies[j]);
    }

    // ---- 战斗解算(玩家 ↔ 每个敌人) ----
    const pBox = p.activeBox(), pMove = p.move;
    for (const e of alive) {
      const eBox = e.activeBox(), eMove = e.move;
      tryHit(p, e, pBox, pMove);
      tryHit(e, p, eBox, eMove);
    }
    // KO 判定(1v1 引擎由 doKO 负责, 闯关自管): 击倒抛飞 + 星爆
    for (const e of alive) {
      if (e.hp <= 0 && !e.dead) {
        e.die();
        if (e.grounded) { e.grounded = false; e.vy = -8; e.vx = (Math.sign(e.x - p.x) || 1) * 6; }
        Effects.impact(e.x, e.y - 100, Math.sign(e.x - p.x) || 1, { tier: 3, color: '#ffd24a' });
        G.hitstop(e.isBoss ? 16 : 7);
        G.shake(e.isBoss ? 12 : 5, 10);
        AudioSys.sfx(e.isBoss ? 'ko' : 'hitH');
        if (e.isBoss) { G.slowmoT = 20; G.slowmo = 0.38; G.slowAcc = 0; Effects.flashFrame({ alpha: 0.4, t: 3 }); }
      }
    }
    if (p.hp <= 0 && !p.dead) {
      p.die();
      if (p.grounded) { p.grounded = false; p.vy = -8; p.vx = -4; }
      st.overT = 0;
      AudioSys.sfx('ko');
    }
    if (p.dead) {
      st.overT = (st.overT || 0) + 1;
      if (st.overT > 52 && st.phase !== 'over') { st.phase = 'over'; Effects.flashFrame({ alpha: 0.4, t: 3 }); }
    }
    for (const pr of G.projectiles) {
      if (pr.dead) continue;
      const targets = pr.owner === p ? alive : [p];
      for (const t of targets) {
        if (t.dead || t.superSeq) continue;
        if (!rectsOverlap(pr.box(), t.bodyBox())) continue;
        if (t.invuln > 0 || t.state === 'down' || t.state === 'getup' || t.juggleImmune()) continue;
        const pd = pr.def;
        t.receiveHit({
          dmg: pd.dmg, chip: pd.chip, guardDmg: pd.guardDmg, knock: pd.knock, hitstun: pd.hitstun,
          blockstun: pd.blockstun, meterHit: pd.meterHit, hitSfx: 'hitL', proj: true, launch: pd.launch,
        }, pr.owner);
        pr.dead = true;
        Effects.spark(pr.x, pr.y, Math.sign(pr.vx), ['#c9baff', '#7d5bff', '#ffffff'], 10, 5);
        G.hitstop(pd.hitstop || 6);
        break;
      }
    }
    for (const pr of G.projectiles) pr.update();
    G.projectiles = G.projectiles.filter(x => !x.dead);

    Effects.update();

    // 舞台环境粒子(与对战同款, 世界坐标下仍成立: 只在可视窗附近撒)
    this._ambient(L);

    // ---- 相机 ----
    if (st.arenaLock) st.cam = st.arenaLock.left - 46;
    else st.cam = Math.max(0, Math.min(L.worldW - 1024, p.x - 430));

  },

  _pushPair(a, b) {
    if (a.dead || b.dead) return;
    if (['down', 'getup'].includes(a.state) || ['down', 'getup'].includes(b.state)) return;
    if (!a.grounded || !b.grounded) return;
    const b1 = a.bodyBox(), b2 = b.bodyBox();
    const ox = Math.min(b1.x2, b2.x2) - Math.max(b1.x1, b2.x1);
    if (ox <= 0) return;
    const push = Math.min(3, ox / 2);
    if (a.x <= b.x) { a.x -= push; b.x += push; } else { a.x += push; b.x -= push; }
    for (const f of [a, b]) f.x = Math.max(STAGE.left, Math.min(STAGE.right, f.x));
  },

  _ambient(L) {
    const st = this.st, cam = st.cam;
    if (L.stageSel === 0 && G.tick % 26 === 0) {
      Effects.parts.push({ x: cam + Math.random() * 1024, y: -6, vx: 0.4, vy: 0.6, life: 900, maxLife: 900, size: 2, color: Math.random() < 0.5 ? '#c98a9e' : '#a86a80', grav: 0 });
    } else if (L.stageSel === 1 && G.tick % 3 === 0) {
      Effects.parts.push({ x: cam + Math.random() * 1120 - 60, y: -10, vx: -1.7, vy: 11, life: 60, maxLife: 60, w: 2, h: 12, color: '#54718e', grav: 0 });
    } else if (L.stageSel === 3 && G.tick % 12 === 0) {
      const side = Math.random() < 0.5 ? cam + 136 : cam + 888;
      Effects.parts.push({ x: side + (Math.random() - 0.5) * 30, y: 424, vx: 0, vy: -1.1, life: 60, maxLife: 60, size: 1, color: '#ffb056', grav: 0, sway: 0.7, ph: Math.random() * 6.28 });
    }
  },

  /* ---------------- draw ---------------- */
  draw(ctx) {
    const st = this.st;
    if (!st) return;
    const L = this.LEVELS[st.level];
    const cam = Math.round(st.cam);

    // 背景(远景静止) + 舞台动态层
    ctx.drawImage(UI.bgCanvas(G), 0, 0);
    if (typeof StagePlus !== 'undefined' && StagePlus.drawFx) StagePlus.drawFx(ctx, G);
    ctx.fillStyle = 'rgba(7,8,12,0.22)';
    ctx.fillRect(0, 0, 1024, 576);
    // 地面推进刻度(滚动条纹 —— 前进感的来源)
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let wx = Math.floor(cam / 160) * 160; wx < cam + 1184; wx += 160) {
      ctx.fillRect(wx - cam, 486, 44, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 476, 1024, 4);

    // 世界层(相机平移): 角色/投射物/特效
    ctx.save();
    ctx.translate(-cam, 0);
    const flashes = Effects.flashes;
    Effects.flashes = []; // 全屏闪帧移出世界层, 相机下坐标才正确
    const drawF = f => {
      if (f.tint) { ctx.save(); ctx.filter = f.tint; f.draw(ctx); ctx.restore(); }
      else f.draw(ctx);
    };
    // 敌人(远->近) -> 玩家(最上)
    for (const e of st.enemies) if (!e.dead || e._deadT < 56) drawF(e);
    drawF(st.player);
    for (const pr of G.projectiles) pr.draw(ctx);
    Effects.draw(ctx);
    ctx.restore();
    Effects.flashes = flashes;
    for (const fl of Effects.flashes) { // 屏幕层补画闪帧
      ctx.globalAlpha = fl.alpha * (fl.t > fl.t0 / 2 ? 1 : 0.5);
      ctx.fillStyle = fl.color;
      ctx.fillRect(0, 0, 1024, 576);
    }
    ctx.globalAlpha = 1;

    this._hud(ctx, L);
    UI.drawSuperBanner(ctx, G);
    UI.drawAnnounce(ctx, G);

    // GO 指示(walk 相 + 无敌人)
    if (st.phase === 'walk' && G.tick % 50 < 34) {
      UI.pixText(ctx, '進め ➤➤', 940, 300, { size: 18, align: 'center', color: '#ffe27a', outline: true });
    }

    // 对话条 / 结算 / 阵亡
    if (st.phase === 'talk' && st.talkQ.length) this._dialog(ctx, st.talkQ[0]);
    if (st.phase === 'over') this._overlay(ctx, 'GAME OVER', '#e8306a', 'J / 点击 重试本关 · K 回标题');
    if (st.phase === 'clear') this._clear(ctx);
    if (st.paused) this._overlay(ctx, '一時停止', '#ffe27a', 'J / 点击 继续 · ESC 退出闯关');

    if (st.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${st.fade / 24})`;
      ctx.fillRect(0, 0, 1024, 576);
    }
  },

  _hud(ctx, L) {
    const st = this.st, p = st.player;
    // 玩家条(左上): 名 + HP + 气
    ctx.fillStyle = 'rgba(10,14,12,0.78)';
    ctx.fillRect(14, 12, 304, 64);
    ctx.fillStyle = '#3d6b58';
    ctx.fillRect(14, 12, 304, 2);
    UI.pixText(ctx, `${p.c.name} · ${p.c.cn}`, 26, 32, { size: 11, color: '#ffe27a' });
    const hpw = 270;
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, 40, hpw, 12);
    p.dispHp += (Math.max(0, p.hp) - p.dispHp) * 0.2;
    ctx.fillStyle = p.hp > 30 ? '#e8b24e' : '#e8306a';
    ctx.fillRect(26, 40, hpw * Math.max(0, p.dispHp) / 100, 12);
    ctx.strokeStyle = '#b98f3e'; ctx.lineWidth = 1; ctx.strokeRect(26.5, 40.5, hpw - 1, 11);
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, 56, hpw, 7);
    ctx.fillStyle = p.meter >= 100 ? '#c8452c' : '#b98f3e';
    ctx.fillRect(26, 56, hpw * p.meter / 100, 7);
    if (p.meter >= 100 && G.tick % 30 < 18) UI.pixText(ctx, '超必殺 READY', 26, 74, { size: 8, color: '#ff9a52' });
    // 关卡/波次(右上)
    UI.pixText(ctx, L.name, 1010, 28, { size: 12, align: 'right', color: '#d9a441' });
    const wavesN = L.waves.length;
    const label = st.boss ? 'BOSS' : (st.phase === 'fight' ? `WAVE ${st.waveIdx + 1}/${wavesN}` : `前进 ${Math.min(100, Math.round(st.player.x / (L.worldW - 620) * 100))}%`);
    UI.pixText(ctx, label + ` · 击破 ${st.kills}`, 1010, 48, { size: 10, align: 'right', color: '#9aa3bd' });
    // Boss 血条(顶中)
    const b = st.boss;
    if (b && !b.dead) {
      const bw = 430;
      ctx.fillStyle = 'rgba(10,8,10,0.82)';
      ctx.fillRect(512 - bw / 2 - 8, 10, bw + 16, 34);
      UI.pixText(ctx, b.bossName, 512, 24, { size: 10, align: 'center', color: '#ff9db8' });
      ctx.fillStyle = '#241418'; ctx.fillRect(512 - bw / 2, 28, bw, 10);
      b.dispHp += (Math.max(0, b.hp) - b.dispHp) * 0.16;
      ctx.fillStyle = '#c8452c';
      ctx.fillRect(512 - bw / 2, 28, bw * Math.max(0, b.dispHp) / b.maxHp, 10);
      ctx.strokeStyle = '#8a2a1c'; ctx.strokeRect(512 - bw / 2 + 0.5, 28.5, bw - 1, 9);
    }
    // 底部键位提示
    ctx.fillStyle = 'rgba(10,8,6,0.7)';
    ctx.fillRect(0, 552, 1024, 24);
    UI.pixText(ctx, 'WASD移动 · J轻 K重 U必杀 I超必 · 后拉防御 · ESC暂停', 512, 568, { size: 10, align: 'center', color: '#c9bfa8' });
  },

  _dialog(ctx, line) {
    const [who, text] = line;
    ctx.fillStyle = 'rgba(8,12,10,0.9)';
    ctx.fillRect(72, 434, 880, 96);
    ctx.fillStyle = '#3d6b58';
    ctx.fillRect(72, 434, 880, 2);
    ctx.fillRect(72, 528, 880, 2);
    ctx.fillStyle = '#b98f3e';
    ctx.fillRect(72, 434, 3, 96);
    // 名牌
    ctx.fillStyle = '#1e3028';
    ctx.fillRect(92, 420, 150, 28);
    ctx.fillStyle = '#b98f3e';
    ctx.fillRect(92, 420, 150, 2);
    UI.pixText(ctx, who, 167, 440, { size: 12, align: 'center', color: '#ffe27a' });
    UI.pixText(ctx, text, 112, 486, { size: 13, color: '#e8e2d0' });
    if (G.tick % 40 < 26) UI.pixText(ctx, '▼ J / 点击 继续', 932, 518, { size: 9, align: 'right', color: '#8a9a8f' });
  },

  _overlay(ctx, big, color, hint) {
    ctx.fillStyle = 'rgba(6,8,7,0.72)';
    ctx.fillRect(0, 0, 1024, 576);
    UI.pixText(ctx, big, 512, 260, { size: 42, align: 'center', color, outline: true, spacing: 4 });
    UI.pixText(ctx, hint, 512, 320, { size: 12, align: 'center', color: '#c9bfa8' });
  },

  _clear(ctx) {
    const st = this.st;
    ctx.fillStyle = 'rgba(6,8,7,0.82)';
    ctx.fillRect(0, 0, 1024, 576);
    if (UI.ua.reswin) { ctx.globalAlpha = 0.4; ctx.drawImage(UI.ua.reswin, 0, 0, 1024, 576); ctx.globalAlpha = 1; }
    UI.pixText(ctx, '血刃归鞘', 512, 200, { size: 40, align: 'center', color: '#ffe27a', outline: true, spacing: 6 });
    UI.pixText(ctx, 'STORY CLEAR', 512, 244, { size: 16, align: 'center', color: '#d9a441', spacing: 6 });
    const mins = ((G.tick - st.t0) / 3600).toFixed(1);
    UI.pixText(ctx, `英雄: ${st.player.c.cn} · 击破: ${st.kills} · 用时: ${mins} 分`, 512, 300, { size: 13, align: 'center', color: '#e8e2d0' });
    UI.pixText(ctx, `难度: ${st.diff.toUpperCase()}`, 512, 326, { size: 11, align: 'center', color: '#9aa3bd' });
    if (G.tick % 40 < 26) UI.pixText(ctx, 'J / 点击 · 返回标题', 512, 420, { size: 12, align: 'center', color: '#ffe27a' });
  },
};
