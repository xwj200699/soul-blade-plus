/* 电专 ELECTRIC POWER COLLEGE · STORY 闯关模式 (恐龙快打式横板推进)
   剧情线: 雷雨夜校园被入侵 —— 校门 -> 实训楼机房 -> 主楼穹顶变电中枢, 合闸复电。
   自包含模式模块: 复用 Fighter / AIController / Effects / Projectile / tryHit,
   自带 多敌同屏战斗解算 + 推进相机 + 波次/Boss + 剧情对话条 + 专属 HUD。
   进入: Quest.start(heroId, diff)  (select2 的 STORY 流程调用)
   世界坐标: 关卡宽 2400-2600px, 相机跟随; STAGE.left/right 在本模式内被
   动态改写为当前活动区(战斗锁定=当前屏), 退出时还原。 */
'use strict';

const Quest = {
  st: null,
  _stageOrig: { left: STAGE.left, right: STAGE.right },

  /* 难度旋钮 (M1.4 重调 —— 原版 normal 实测"打不过": 一关 5 杂兵 + Boss 225血,
     全程零补给, 玩家 150 血一路硬吃)。现在每档都同时动四件事:
       mook/boss   血量系数
       dmg/bossDmg 敌方出伤系数(fighter.receiveHit 读 attacker.dmgDealt)
       attackers   同屏最多几个敌人可以出招(其余只走位围着 —— 恐龙快打式喘息)
       rest        敌人一套打完的强制歇招 tick
       lives       续关次数(残机): 倒下后原地复活, 不用重打整关
       drop/heal   杂兵掉补给概率 / 清波与过关的回血比例 */
  DIFF: {
    easy:   { mook: 0.62, boss: 0.6,  ai: 'easy',   bossAi: 'easy',   dmg: 0.48, bossDmg: 0.6,
              attackers: 1, rest: 50, lives: 6, drop: 0.65, waveHeal: 0.24, heal: 0.8 },
    normal: { mook: 0.85, boss: 0.78, ai: 'easy',   bossAi: 'normal', dmg: 0.7,  bossDmg: 0.8,
              attackers: 2, rest: 30, lives: 2, drop: 0.45, waveHeal: 0.14, heal: 0.6 },
    hard:   { mook: 1.15, boss: 1.05, ai: 'normal', bossAi: 'hard',   dmg: 0.95, bossDmg: 1.0,
              attackers: 2, rest: 12, lives: 1, drop: 0.28, waveHeal: 0.08, heal: 0.4 },
  },

  /* 补给道具: 清波必掉一个, 杂兵按 D.drop 概率掉 —— 闯关"续航"的来源 */
  ITEMS: {
    drink: { name: '能量饮料', hp: 0.20, c1: '#ffb648', c2: '#ff7a2a' },
    meal:  { name: '食堂盒饭', hp: 0.42, c1: '#8ae06a', c2: '#2f7a3a' },
    batt:  { name: '备用电池', meter: 50, c1: '#7fd3ff', c2: '#2a66a8' },
  },

  /* 五幕剧情线(M1.4: 原三幕扩到五幕, 每幕补齐 开场/波次间/关底/收场 四段对白)。
     wave.talk 为可选的"波次前对白" —— 只挂在第二波之后, 第一幕第一波保持直进,
     免得刚进关就被一段字挡住(也让 headless smoke 的 walk→fight 断言继续成立)。 */
  LEVELS: [
    {
      name: '第一幕 · 校门与中心广场', sub: 'ACT I', stageSel: 0, worldW: 2600,
      intro: [['广播', '警报——外部人员强行破门，全体师生就近避险！'],
              ['你', '雷雨夜，变电所警报全红。校门这一段，交给我。'],
              ['同学', '他们一进来就砸配电箱……说要把全校的电「接管」！'],
              ['同学', '保安拦了一次，被推倒在传达室门口了！'],
              ['你', '那就先把他们从校门赶回去。这里我顶着。']],
      bossTalk: [['破门先锋', '这所学校的电，从今晚起归我们调度。'],
                 ['破门先锋', '识相的就让开，我懒得对学生动手。'],
                 ['你', '调度权在总闸上。你连校门都还没过。']],
      outro: [['你', '他倒下前咬着牙：「机房……才是我们要的东西。」'],
              ['你', '机房。全校的数据和备用电源都在那儿。']],
      waves: [
        { at: 680, mooks: [['kenji', 34], ['kenji', 34]] },
        { at: 1300, talk: [['你', '第二波？看来他们不只是来砸箱子的。']],
          mooks: [['kenji', 36], ['ayame', 38], ['kenji', 36]] },
        { at: 1920, talk: [['同学', '广场喷泉那边又冲上来一群！'], ['你', '都让他们上。挡在这儿，一个都别想过去。']],
          mooks: [['kenji', 36], ['ayame', 40], ['kenji', 36]] },
      ],
      boss: { id: 'kenji', hp: 120, name: '破门先锋' },
    },
    {
      name: '第二幕 · 实训楼机房', sub: 'ACT II', stageSel: 1, worldW: 2600,
      intro: [['你', '机房的灯全灭了，只剩机柜指示灯在雨声里一格一格闪。'],
              ['值班老师', '备用电源被人切了！再断十分钟，这学期的实训数据全没。'],
              ['值班老师', '他们分了两拨，一拨拆线，一拨守在走廊尽头。'],
              ['你', '十分钟。够了——先清走廊。']],
      bossTalk: [['影袭·夜刃', '再往前一步，全校的数据跟你一起断电。'],
                 ['影袭·夜刃', '我在暗处，你在灯下。你看得见我出手吗？'],
                 ['你', '那就别让我往前——你拦得住吗？']],
      outro: [['你', '她最后只说了半句：「上面……还有人在等合闸。」'],
              ['你', '上面。风雨连廊，然后是运动场。']],
      waves: [
        { at: 680, mooks: [['ayame', 36], ['doctor', 40]] },
        { at: 1300, talk: [['你', '他们在往机柜后面拉线——想把机房的电引到别处去。']],
          mooks: [['ayame', 38], ['doctor', 42], ['houyi', 42]] },
        { at: 1920, talk: [['值班老师', '机柜区被占了！三个人守着主交换机！'], ['你', '交换机我来抢。你带同学撤到安全出口。']],
          mooks: [['ayame', 38], ['houyi', 42], ['doctor', 42]] },
      ],
      boss: { id: 'ayame', hp: 128, name: '影袭·夜刃' },
    },
    {
      name: '第三幕 · 风雨连廊与运动场', sub: 'ACT III', stageSel: 2, worldW: 2650,
      intro: [['你', '连廊的雨横着打进来，灯管一路炸到运动场。'],
              ['保安', '运动场的配电柜被围了！那是主楼的上一级线路！'],
              ['保安', '他们人比刚才多一倍，看装束是外头调来的老手。'],
              ['你', '上一级——那就是通往总闸的路。人多，正好一起收拾。']],
      bossTalk: [['电缆窃贼·舞影', '这条线，我先接走一半。你不会介意吧？'],
                 ['电缆窃贼·舞影', '看我扇子，别看线——这可是舞台。'],
                 ['你', '我很介意。放下钳子。']],
      outro: [['你', '配电柜锁回去了。灯管一节一节，又亮回一段。'],
              ['你', '再往下——地下变电所。水声，越来越大了。']],
      waves: [
        { at: 680, mooks: [['diaochan', 38], ['kenji', 38]] },
        { at: 1280, talk: [['你', '雨越大他们越往柜子上爬——上级线路不能让他们摸到。']],
          mooks: [['diaochan', 40], ['angela', 42], ['kenji', 38]] },
        { at: 1900, talk: [['保安', '看台那边又翻进来四个！'], ['你', '连廊窄，正好卡住他们。来多少挡多少。']],
          mooks: [['diaochan', 40], ['angela', 42], ['kenji', 38], ['ayame', 40]] },
      ],
      boss: { id: 'diaochan', hp: 138, name: '电缆窃贼·舞影' },
    },

    {
      name: '第四幕 · 地下变电所', sub: 'ACT IV', stageSel: 1, worldW: 2650,
      intro: [['你', '地下室的水已经到脚踝，母排上还挂着人为搭的短接线。'],
              ['电工班长', '别碰红色那根！他们把互锁全拆了，现在合闸就是短路。'],
              ['电工班长', '这帮人是冲着主变来的——一层比一层难缠，你小心。'],
              ['你', '互锁我来装回去。掩护交给我，你盯着水位。']],
      bossTalk: [['配电室监工·铁闸', '这道门后面是全校的命。你带钥匙了吗？'],
                 ['配电室监工·铁闸', '我这身盾，专门用来磨人。你有的是力气吗？'],
                 ['你', '不用钥匙。我拆门。']],
      outro: [['你', '互锁复位，水泵起转，水位开始往下走。'],
              ['你', '只剩最后一段——主楼穹顶。灯还差最后一口气。']],
      waves: [
        { at: 680, mooks: [['tank', 42], ['doctor', 40]] },
        { at: 1280, talk: [['你', '水里打，脚下滑，他们反而更嚣张。']],
          mooks: [['tank', 44], ['houyi', 42], ['doctor', 40]] },
        { at: 1900, talk: [['电工班长', '闸门前堆了四个！全是硬骨头！'], ['你', '越靠近总闸人越多——说明我没走错。全上吧。']],
          mooks: [['tank', 44], ['angela', 42], ['houyi', 42], ['doctor', 40]] },
      ],
      boss: { id: 'tank', hp: 148, name: '配电室监工·铁闸' },
    },
    {
      name: '终幕 · 主楼穹顶变电中枢', sub: 'FINAL ACT', stageSel: 3, worldW: 3200,
      intro: [['你', '穹顶之下，全校的总闸被人握在手里。'],
              ['？？？', '想合闸？先从我这一棍下过去！'],
              ['你', '一路打上来，就是为了这最后一只手柄。'],
              ['你', '一夜的黑，到这里为止。']],
      bossTalk: [['断电者·首谋', '这一夜的黑暗，我说了才算！'],
                 ['断电者·首谋', '我把所有人都压在这层了——你过不去。'],
                 ['你', '你说了不算。开关，在我手上。']],
      outro: [['你', '总闸合上。灯，一层一层亮回来了。'],
              ['你', '雨还在下，但整座楼都醒了过来。'],
              ['广播', '各位师生，全校供电已恢复。今晚的自习，照常。']],
      waves: [
        { at: 700, mooks: [['wukong', 40], ['houyi', 40]] },
        { at: 1240, talk: [['你', '他把人全押在这儿了——总闸就在他背后。']],
          mooks: [['angela', 40], ['houyi', 40], ['wukong', 42]] },
        { at: 1860, talk: [['断电者·首谋', '再上一批！别让他碰到总闸！']],
          mooks: [['diaochan', 40], ['tank', 44], ['kenji', 38]] },
        { at: 2480, talk: [['你', '最后一圈。合闸的手，只需要腾出一只。']],
          mooks: [['wukong', 42], ['diaochan', 40], ['tank', 44], ['ayame', 40]] },
      ],
      boss: { id: 'wukong', hp: 168, name: '断电者·首谋' },
    },


  ],

  MOOK_TINTS: ['brightness(0.62) saturate(0.45)', 'brightness(0.56) saturate(0.5) hue-rotate(40deg)',
               'brightness(0.6) saturate(0.4) hue-rotate(-45deg)'],

  /* ---------------- lifecycle ---------------- */
  start(heroId, diff) {
    const D = this.DIFF[diff] || this.DIFF.normal;
    this.st = {
      heroId, diff: diff || 'normal',
      level: 0, phase: 'talk', talkQ: [], talkNext: 'walk', talkT: 0,
      cam: 0, waveIdx: 0, wavesDone: false, arenaLock: null,
      enemies: [], boss: null, player: null, dummy: null,
      items: [], saidWave: {},
      lives: D.lives, livesMax: D.lives, revives: 0,
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
    st.items = [];
    st.saidWave = {};
    st.boss = null;
    st.phase = 'talk';
    st.talkQ = L.intro.slice();
    st.talkT = 0;
    st.talkNext = 'walk';
    st.fade = 24;
    G.projectiles = [];
    Effects.reset();
    STAGE.left = 50; STAGE.right = L.worldW - 50;
    const keepHp = st.player ? st.player.hp : null;
    const keepMeter = st.player ? st.player.meter : 0;
    st.player = new Fighter(st.heroId, 220, 1, G);
    // 过关回血(按难度)而非全恢复 —— 保留闯关资源压力。
    // (原实现 clamp 到 100, 但 BASE_HP 早已是 150 —— 过第一关反而被削到 100 血,
    //  这是"越打越没续航"的主因之一, M1.4 修正为按 maxHp 归一)
    if (keepHp !== null) {
      const D = this.DIFF[st.diff];
      st.player.hp = Math.min(st.player.maxHp, Math.round(keepHp + st.player.maxHp * D.heal));
      st.player.meter = Math.min(100, keepMeter + 25); // 过关补一截气, 下一关开局有牌可打
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
    // 关卡递进(越来越难): 每往后一幕, 杂兵血量与出伤各加一档 ——
    // 第一幕基准, 终幕 ≈ +32% 血 / +16% 伤, 越接近总闸的敌人越硬。
    const lvl = this.st.level;
    const hpRamp = 1 + lvl * 0.08;
    const dmgRamp = 1 + lvl * 0.04;
    f.maxHp = f.hp = Math.round(hp * D.mook * hpRamp);
    f.dispHp = f.hp;
    f.isMook = true;
    f.dmgDealt = D.dmg * dmgRamp; // 杂兵出伤系数(fighter.receiveHit 读取)
    f.gainMeter = () => {};        // 杂兵不攒气 —— 小兵放超必是"打不过"的隐形元凶
    f.superReady = () => false;
    f.tint = this.MOOK_TINTS[tintIdx % this.MOOK_TINTS.length];
    f._ai = new AIController(f, this.st.player, D.ai, G);
    f._deadT = 0;
    f._rest = 20;                  // 入场先站一拍, 不能落地即抡
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
    // 关底血量随英雄基础血同比抬高, 否则英雄血/伤都涨了之后 Boss 一轮就没
    b.maxHp = b.hp = Math.round(L.boss.hp * D.boss * BASE_HP / 100);
    b.dispHp = b.hp;
    b.isBoss = true;
    b.dmgDealt = D.bossDmg;
    b.bossName = L.boss.name;
    b._ai = new AIController(b, st.player, D.bossAi, G);
    b._deadT = 0;
    b._rest = 30;
    st.boss = b;
    st.enemies.push(b);
    setAnn('BOSS', 'ko', 70, L.boss.name);
    AudioSys.sfx('superFlash');
  },

  /* ---------------- 补给道具(续航) ----------------
     恐龙快打式的"打箱子出烤鸡": 杂兵按概率掉、每清一波必掉一个。落地后原地
     发光待取, 玩家身体碰到即生效 —— 这是闯关模式唯一的回血/回气来源。 */
  dropItem(x, kind) {
    this.st.items.push({
      x, y: STAGE.ground - 130, vy: -5.5, kind, t: 0, life: 1500, landed: false,
    });
  },

  _rollDrop(x) {
    const st = this.st, D = this.DIFF[st.diff];
    if (Math.random() >= D.drop) return;
    const p = st.player;
    // 缺血就给血, 血够就给气 —— 掉落跟着需求走, 不做无用功
    const kind = p.hp < p.maxHp * 0.75 ? 'drink' : (Math.random() < 0.6 ? 'batt' : 'drink');
    this.dropItem(x, kind);
  },

  _updateItems() {
    const st = this.st, p = st.player;
    for (const it of st.items) {
      it.t++;
      if (!it.landed) {
        it.vy += 0.55;
        it.y += it.vy;
        if (it.y >= STAGE.ground - 22) { it.y = STAGE.ground - 22; it.landed = true; it.vy = 0; Effects.dust(it.x, STAGE.ground, 4); }
      }
      if (it.t > it.life) { it.dead = true; continue; }
      if (p.dead) continue;
      const bb = p.bodyBox();
      if (it.x > bb.x1 - 18 && it.x < bb.x2 + 18 && it.y > bb.y1 - 10 && it.y < bb.y2 + 26) {
        this._pickUp(it);
        it.dead = true;
      }
    }
    st.items = st.items.filter(x => !x.dead);
  },

  _pickUp(it) {
    const st = this.st, p = st.player, D = this.ITEMS[it.kind];
    if (D.hp) {
      const gain = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * D.hp));
      p.hp += gain;
      Effects.text(p.x, p.y - 200, `+${gain} 体力`, D.c1, 14);
    }
    if (D.meter) {
      p.gainMeter(D.meter);
      Effects.text(p.x, p.y - 200, `+${D.meter} 气`, D.c1, 14);
    }
    Effects.ring(it.x, it.y, D.c1, 12);
    Effects.rise(it.x, it.y + 18, D.c2, 5);
    AudioSys.sfx('menuSel');
  },

  /* 原地续关: 站起来、半血、两秒无敌, 顺手把贴身的敌人弹开 —— 免得"复活即被围死" */
  _revive() {
    const st = this.st, p = st.player;
    p.dead = false;
    p.hp = Math.round(p.maxHp * 0.62);
    p.dispHp = p.hp;
    p.state = 'idle'; p.move = null; p.superSeq = null; p.cineSmear = null;
    p.hitstun = 0; p.blockstun = 0; p.guard = 0; p.kdPending = false;
    p.grounded = true; p.y = STAGE.ground; p.vx = 0; p.vy = 0;
    p.frozen = 0; p.flash = 0; p.juggleN = 0;
    p.combo = { count: 0, timer: 0 }; p.comboable = 0;
    p.invuln = 130;
    p.meter = Math.max(p.meter, 40);
    p.setAnim('idle', true);
    st.overT = 0;
    for (const e of st.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - p.x) < 200) {
        e.x = Math.max(STAGE.left, Math.min(STAGE.right, p.x + (Math.sign(e.x - p.x) || 1) * 240));
      }
      e.frozen = Math.max(e.frozen, 34);
      e._rest = Math.max(e._rest || 0, 40);
    }
    setAnn('CONTINUE', 'ko', 66, `残机 ${st.lives}`);
    Effects.ring(p.x, p.y - 80, '#ffe27a', 18);
    Effects.rise(p.x, p.y, '#ffe27a', 8);
    Effects.flashFrame({ alpha: 0.35, t: 3 });
    G.shake(8, 12);
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
        st.talkT++;
        if (Input.consume('KeyJ') || Input.consume('Enter') || Input.click(0, 0, 1024, 576)) {
          st.talkQ.shift();
          st.talkT = 0;
          AudioSys.sfx('menuMove');
          if (!st.talkQ.length) {
            st.phase = st.talkNext;
            if (st.talkNext === 'bossfight') this.spawnBoss();
            if (st.talkNext === 'wavefight') {  // 波次前对白结束 -> 立刻开战
              st.phase = 'fight';
              this.spawnWave(L.waves[st.waveIdx]);
            }
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
          st.lives = this.DIFF[df].lives;   // 重打本关: 续关次数一并复位
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
        // 波次前对白(可选): 先说完再开打 —— 剧情不再只挤在开场/关底两头
        const key = st.level + ':' + st.waveIdx;
        if (nextWave.talk && !st.saidWave[key]) {
          st.saidWave[key] = true;
          st.phase = 'talk';
          st.talkQ = nextWave.talk.slice();
          st.talkT = 0;
          st.talkNext = 'wavefight';
          return;
        }
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
        st.talkT = 0;
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
          st.talkT = 0;
          st.talkNext = 'nextlevel';
          st.arenaLock = null;
          return;
        }
        // 清波奖励(续航): 小回血 + 必掉一份补给, 让下一段路有牌可打
        const D = this.DIFF[st.diff];
        const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * D.waveHeal));
        if (heal > 0) { p.hp += heal; Effects.text(p.x, p.y - 220, `WAVE CLEAR +${heal}`, '#8ae06a', 14); }
        p.gainMeter(14);
        this.dropItem(Math.max(STAGE.left + 40, Math.min(STAGE.right - 40, p.x + 150)),
                      p.hp < p.maxHp * 0.6 ? 'meal' : 'batt');
        st.waveIdx++;
        st.arenaLock = null;
        st.phase = 'walk';
        Effects.text(p.x, p.y - 210, 'GO ➤', '#ffe27a', 18);
        AudioSys.sfx('menuSel');
      }
    }

    // ---- pads ----
    p.pad = humanPad();
    // 敌人出招名额(M1.4 难度阀门): 同屏最多 D.attackers 个可以出招, 且背后
    // 最多只允许 1 个 —— 原实现"最近两名随时开火"会从前后同时抡, 玩家只能
    // 朝一个方向格挡, 三明治必死。其余人只走位围着(恐龙快打式喘息)。
    const D = this.DIFF[st.diff];
    const ranked = alive.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    let atkSlots = D.attackers, backSlots = 1;
    for (const e of ranked) {
      e.pad = e._ai.update();
      // 一套打完强制歇招: 敌人不会无缝续压, 玩家有反打窗口
      if (e._prevMove && !e.move) e._rest = D.rest;
      e._prevMove = e.move;
      if (e._rest > 0) e._rest--;
      const behind = (Math.sign(e.x - p.x) || 1) !== p.facing;
      let may = e._rest <= 0;
      if (!e.isBoss) {                              // Boss 不占名额, 永远可以打
        may = may && atkSlots > 0 && (!behind || backSlots > 0);
        if (may) { atkSlots--; if (behind) backSlots--; }
      }
      if (!may) e.pad.light = e.pad.heavy = e.pad.special = e.pad.super = false;
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
          if (!e.isBoss) this._rollDrop(e.x);   // 杂兵掉补给(续航来源)
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
      // 续关(残机): 还有次数就原地站起来接着打, 不用把整关从头再走一遍 ——
      // 这是"剧情推不下去"的直接解药; 用光了才 GAME OVER
      if (st.overT > 52 && st.phase !== 'over') {
        if (st.lives > 0) { st.lives--; st.revives++; this._revive(); }
        else { st.phase = 'over'; Effects.flashFrame({ alpha: 0.4, t: 3 }); }
      }
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

    this._updateItems();
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
    this._drawItems(ctx);
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
    if (st.phase === 'over') this._overlay(ctx, 'GAME OVER', '#e8306a', '残機用尽 · J / 点击 重试本关(残机重置) · K 回标题');
    if (st.phase === 'clear') this._clear(ctx);
    if (st.paused) this._overlay(ctx, '一時停止', '#ffe27a', 'J / 点击 继续 · ESC 退出闯关');

    if (st.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${st.fade / 24})`;
      ctx.fillRect(0, 0, 1024, 576);
    }
  },

  /* 掉落补给的像素小图标: 饮料罐 / 盒饭 / 电池, 落地后上下浮动 + 光晕呼吸 */
  _drawItems(ctx) {
    const st = this.st;
    for (const it of st.items) {
      const D = this.ITEMS[it.kind];
      const bob = it.landed ? Math.sin(it.t * 0.13) * 3 : 0;
      const x = Math.round(it.x), y = Math.round(it.y + bob);
      const fade = it.t > it.life - 120 ? (Math.floor(it.t / 4) % 2 ? 0.3 : 1) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      // 地面投影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x, STAGE.ground + 4, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // 光晕
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (0.16 + 0.1 * Math.sin(it.t * 0.16));
      ctx.fillStyle = D.c1;
      ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade;
      if (it.kind === 'batt') {                 // 电池: 竖罐 + 正极小帽 + 电量条
        ctx.fillStyle = '#0d1420'; ctx.fillRect(x - 6, y - 11, 12, 22);
        ctx.fillStyle = D.c2; ctx.fillRect(x - 5, y - 10, 10, 20);
        ctx.fillStyle = D.c1; ctx.fillRect(x - 3, y - 14, 6, 3);
        ctx.fillRect(x - 3, y - 6, 6, 3); ctx.fillRect(x - 3, y, 6, 3); ctx.fillRect(x - 3, y + 6, 6, 3);
      } else if (it.kind === 'meal') {          // 盒饭: 扁盒 + 盖沿 + 两格菜
        ctx.fillStyle = '#0d1a10'; ctx.fillRect(x - 12, y - 8, 24, 17);
        ctx.fillStyle = D.c2; ctx.fillRect(x - 11, y - 7, 22, 15);
        ctx.fillStyle = D.c1; ctx.fillRect(x - 11, y - 10, 22, 4);
        ctx.fillStyle = '#fff2c8'; ctx.fillRect(x - 8, y - 3, 7, 7);
        ctx.fillStyle = '#ff9d5c'; ctx.fillRect(x + 1, y - 3, 7, 7);
      } else {                                  // 饮料: 易拉罐 + 拉环 + 高光
        ctx.fillStyle = '#1a1008'; ctx.fillRect(x - 7, y - 11, 14, 22);
        ctx.fillStyle = D.c2; ctx.fillRect(x - 6, y - 10, 12, 20);
        ctx.fillStyle = D.c1; ctx.fillRect(x - 6, y - 4, 12, 7);
        ctx.fillStyle = '#d8dde8'; ctx.fillRect(x - 6, y - 12, 12, 3);
        ctx.fillStyle = '#fff8e2'; ctx.fillRect(x - 4, y - 9, 2, 17);
      }
      ctx.restore();
    }
  },

  _hud(ctx, L) {
    const st = this.st, p = st.player;
    // 玩家条(左上): 名 + HP + 气 + 残机
    ctx.fillStyle = 'rgba(10,14,12,0.78)';
    ctx.fillRect(14, 12, 304, 82);
    ctx.fillStyle = '#3d6b58';
    ctx.fillRect(14, 12, 304, 2);
    UI.pixText(ctx, `${p.c.name} · ${p.c.cn}`, 26, 32, { size: 11, color: '#ffe27a' });
    const hpw = 270;
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, 40, hpw, 12);
    p.dispHp += (Math.max(0, p.hp) - p.dispHp) * 0.2;
    ctx.fillStyle = p.hp > p.maxHp * 0.2 ? '#e8b24e' : '#e8306a';
    ctx.fillRect(26, 40, hpw * Math.max(0, p.dispHp) / p.maxHp, 12);
    ctx.strokeStyle = '#b98f3e'; ctx.lineWidth = 1; ctx.strokeRect(26.5, 40.5, hpw - 1, 11);
    UI.pixText(ctx, `${Math.max(0, Math.round(p.hp))}/${p.maxHp}`, 296, 50, { size: 8, align: 'right', color: '#2a1c12' });
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, 56, hpw, 7);
    ctx.fillStyle = p.meter >= 100 ? '#c8452c' : '#b98f3e';
    ctx.fillRect(26, 56, hpw * p.meter / 100, 7);
    // 残机(续关次数): 一颗一格, 用光才 GAME OVER
    UI.pixText(ctx, '残機', 26, 78, { size: 9, color: '#8a9a8f' });
    for (let i = 0; i < st.livesMax; i++) {
      const lx = 58 + i * 13, on = i < st.lives;
      ctx.fillStyle = on ? '#e8306a' : '#2a2028';
      ctx.fillRect(lx, 70, 9, 9);
      ctx.fillStyle = on ? '#ff9db8' : '#3a303a';
      ctx.fillRect(lx, 70, 9, 2);
    }
    if (p.meter >= 100 && G.tick % 30 < 18) UI.pixText(ctx, '超必殺 READY', 190, 78, { size: 8, color: '#ff9a52' });
    // 关卡/波次(右上)
    UI.pixText(ctx, L.name, 1010, 28, { size: 12, align: 'right', color: '#d9a441' });
    const wavesN = L.waves.length;
    const label = st.boss ? 'BOSS' : (st.phase === 'fight' ? `WAVE ${st.waveIdx + 1}/${wavesN}` : `前进 ${Math.min(100, Math.round(st.player.x / (L.worldW - 620) * 100))}%`);
    UI.pixText(ctx, `${L.sub} ${st.level + 1}/${this.LEVELS.length} · ` + label + ` · 击破 ${st.kills}`,
      1010, 48, { size: 10, align: 'right', color: '#9aa3bd' });
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
    UI.pixText(ctx, 'WASD移动 · J轻 K重 U必杀 I超必 · S+J/K 蹲攻 · 双击A/D冲刺 · 后拉防御 · ESC暂停', 512, 568, { size: 10, align: 'center', color: '#c9bfa8' });
  },

  _dialog(ctx, line) {
    const st = this.st;
    const [who, text] = line;
    ctx.fillStyle = 'rgba(8,12,10,0.9)';
    ctx.fillRect(72, 434, 880, 96);
    ctx.fillStyle = '#3d6b58';
    ctx.fillRect(72, 434, 880, 2);
    ctx.fillRect(72, 528, 880, 2);
    ctx.fillStyle = '#b98f3e';
    ctx.fillRect(72, 434, 3, 96);
    // 名牌(说话人配色: 「你」= 金, 其余 = 敌/旁白青)
    const isHero = who === '你';
    ctx.fillStyle = '#1e3028';
    ctx.fillRect(92, 420, 158, 28);
    ctx.fillStyle = isHero ? '#b98f3e' : '#3d6b58';
    ctx.fillRect(92, 420, 158, 2);
    UI.pixText(ctx, who, 171, 440, { size: 12, align: 'center', color: isHero ? '#ffe27a' : '#8ad8ff' });
    // 逐字显示(纯演出: 按 J 永远直接翻页, 不需要先等打完)
    const shown = text.slice(0, Math.max(1, Math.floor((st.talkT || 0) / 1.5)));
    UI.pixText(ctx, shown, 112, 486, { size: 13, color: '#e8e2d0' });
    // 剩余行数指示 —— 让人知道这段还有多长
    if (st.talkQ.length > 1) {
      UI.pixText(ctx, `· ${st.talkQ.length - 1} `, 932, 458, { size: 9, align: 'right', color: '#5f6d63' });
    }
    if (shown.length >= text.length && G.tick % 40 < 26) {
      UI.pixText(ctx, '▼ J / 点击 继续', 932, 518, { size: 9, align: 'right', color: '#8a9a8f' });
    }
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
    UI.pixText(ctx, '全校复电', 512, 200, { size: 40, align: 'center', color: '#ffe27a', outline: true, spacing: 6 });
    UI.pixText(ctx, 'STORY CLEAR', 512, 244, { size: 16, align: 'center', color: '#d9a441', spacing: 6 });
    const mins = ((G.tick - st.t0) / 3600).toFixed(1);
    UI.pixText(ctx, `英雄: ${st.player.c.cn} · 击破: ${st.kills} · 用时: ${mins} 分`, 512, 300, { size: 13, align: 'center', color: '#e8e2d0' });
    UI.pixText(ctx, `难度: ${st.diff.toUpperCase()} · 全 ${this.LEVELS.length} 幕 · 续关: ${st.revives}`,
      512, 326, { size: 11, align: 'center', color: '#9aa3bd' });
    if (st.revives === 0) UI.pixText(ctx, 'NO CONTINUE — 一命通关！', 512, 354, { size: 12, align: 'center', color: '#ffb648' });
    if (G.tick % 40 < 26) UI.pixText(ctx, 'J / 点击 · 返回标题', 512, 420, { size: 12, align: 'center', color: '#ffe27a' });
  },
};
