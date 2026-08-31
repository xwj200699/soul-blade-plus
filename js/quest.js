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
    easy:   { mook: 0.62, boss: 0.6,  ai: 'easy',   bossAi: 'easy',   dmg: 0.5,  bossDmg: 0.62,
              mookMob: 0.80, bossMob: 0.90,
              attackers: 1, rest: 46, lives: 7, drop: 0.65, waveHeal: 0.24, heal: 0.8 },
    normal: { mook: 0.92, boss: 0.85, ai: 'normal', bossAi: 'normal', dmg: 0.78, bossDmg: 0.88,
              mookMob: 0.88, bossMob: 0.95,
              attackers: 2, rest: 24, lives: 3, drop: 0.42, waveHeal: 0.13, heal: 0.58 },
    hard:   { mook: 1.28, boss: 1.15, ai: 'hard',   bossAi: 'hard',   dmg: 1.0,  bossDmg: 1.05,
              mookMob: 0.92, bossMob: 1.0,
              attackers: 3, rest: 15, lives: 3, drop: 0.3,  waveHeal: 0.09, heal: 0.42 },
  },

  /* ---------------- 玩家侧加成 (M1.4 ·「只给玩家加成, 打怪要爽」) ----------------
     全部挂在玩家 Fighter 实例上, 一个字节都不动 DATA —— 所以对战/训练的平衡不变,
     只有闯关里的主角变强, 杂兵反而被压慢一点(DIFF.mookMob)。
       mob    机动系数(走/冲/后撤/空中操控)
       dmg    出伤系数(fighter.receiveHit 读 attacker.dmgDealt)
       meter  攒气系数(fighter.gainMeter 读 meterMul) —— 超必来得勤
       splash 超必演出期间对"非镜头目标"的溅射伤害比例(超必变成清场技) */
  PLAYER: { mob: 1.22, dmg: 1.45, meter: 1.6, splash: 0.5 },

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
      name: '第一幕 · 校门与中心广场', sub: 'ACT I', stageSel: 0, worldW: 2980,
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
        { at: 640, mooks: [['kenji', 34], ['kenji', 34], ['kenji', 34]] },
        { at: 1180, talk: [['你', '第二波？看来他们不只是来砸箱子的。']],
          mooks: [['kenji', 36], ['ayame', 38], ['kenji', 36]] },
        { at: 1720, talk: [['同学', '广场喷泉那边又冲上来一群！'], ['你', '都让他们上。挡在这儿，一个都别想过去。']],
          mooks: [['kenji', 36], ['ayame', 40], ['kenji', 36], ['ayame', 40]] },
        { at: 2260, talk: [['同学', '这是最后一批了吧……？'], ['你', '不管是不是，先清干净。']],
          mooks: [['ayame', 40], ['kenji', 38], ['ayame', 40], ['kenji', 38]] },
      ],
      boss: { id: 'kenji', hp: 120, name: '破门先锋' },
    },
    {
      name: '第二幕 · 实训楼机房', sub: 'ACT II', stageSel: 1, worldW: 2980,
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
        { at: 640, mooks: [['ayame', 36], ['doctor', 40], ['ayame', 36]] },
        { at: 1180, talk: [['你', '他们在往机柜后面拉线——想把机房的电引到别处去。']],
          mooks: [['ayame', 38], ['doctor', 42], ['houyi', 42]] },
        { at: 1720, talk: [['值班老师', '机柜区被占了！四个人守着主交换机！'], ['你', '交换机我来抢。你带同学撤到安全出口。']],
          mooks: [['ayame', 38], ['houyi', 42], ['doctor', 42], ['ayame', 38]] },
        { at: 2260, talk: [['你', '灯管后面还藏着人——想偷袭？']],
          mooks: [['doctor', 42], ['houyi', 44], ['ayame', 40], ['doctor', 42]] },
      ],
      boss: { id: 'ayame', hp: 128, name: '影袭·夜刃' },
    },
    {
      name: '第三幕 · 风雨连廊与运动场', sub: 'ACT III', stageSel: 2, worldW: 3000,
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
        { at: 640, mooks: [['diaochan', 38], ['kenji', 38], ['diaochan', 38]] },
        { at: 1160, talk: [['你', '雨越大他们越往柜子上爬——上级线路不能让他们摸到。']],
          mooks: [['diaochan', 40], ['angela', 42], ['kenji', 38], ['angela', 42]] },
        { at: 1720, talk: [['保安', '看台那边又翻进来一队！'], ['你', '连廊窄，正好卡住他们。来多少挡多少。']],
          mooks: [['diaochan', 40], ['angela', 42], ['kenji', 38], ['ayame', 40]] },
        { at: 2280, talk: [['保安', '他们把最后的人都压上来了！'], ['你', '压上来更好——省得我一个个去找。']],
          mooks: [['angela', 42], ['diaochan', 40], ['kenji', 40], ['ayame', 42]] },
      ],
      boss: { id: 'diaochan', hp: 138, name: '电缆窃贼·舞影' },
    },


    {
      name: '第四幕 · 地下变电所', sub: 'ACT IV', stageSel: 1, worldW: 3000,
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
        { at: 640, mooks: [['tank', 42], ['doctor', 40], ['tank', 42]] },
        { at: 1160, talk: [['你', '水里打，脚下滑，他们反而更嚣张。']],
          mooks: [['tank', 44], ['houyi', 42], ['doctor', 40], ['houyi', 42]] },
        { at: 1720, talk: [['电工班长', '闸门前堆了一排！全是硬骨头！'], ['你', '越靠近总闸人越多——说明我没走错。全上吧。']],
          mooks: [['tank', 44], ['angela', 42], ['houyi', 42], ['doctor', 40]] },
        { at: 2280, talk: [['电工班长', '他们把守闸的都调过来了！'], ['你', '守到这一步，我更要过去。']],
          mooks: [['tank', 46], ['angela', 44], ['doctor', 42], ['tank', 46]] },
      ],
      boss: { id: 'tank', hp: 148, name: '配电室监工·铁闸' },
    },
    {
      name: '终幕 · 主楼穹顶变电中枢', sub: 'FINAL ACT', stageSel: 3, worldW: 3300,
      intro: [['你', '穹顶之下，全校的总闸被人握在手里。'],
              ['？？？', '想合闸？先从我这一棍下过去！'],
              ['你', '一路打上来，就是为了这最后一只手柄。'],
              ['你', '一夜的黑，到这里为止。']],
      bossTalk: [['断电者·首谋', '这一夜的黑暗，我说了才算！'],
                 ['断电者·首谋', '我把全校的电、全部的人，都压在这一层了。'],
                 ['断电者·首谋', '想合闸？先耗光你身上最后一格力气！'],
                 ['你', '你说了不算。开关，在我手上。']],
      outro: [['你', '总闸合上。灯，一层一层亮回来了。'],
              ['你', '雨还在下，但整座楼都醒了过来。'],
              ['广播', '各位师生，全校供电已恢复。今晚的自习，照常。']],
      waves: [
        { at: 600, mooks: [['wukong', 40], ['houyi', 40], ['wukong', 40]] },
        { at: 1080, talk: [['你', '他把人全押在这儿了——总闸就在他背后。']],
          mooks: [['angela', 40], ['houyi', 40], ['wukong', 42], ['angela', 40]] },
        { at: 1560, talk: [['断电者·首谋', '再上一批！别让他碰到总闸！']],
          mooks: [['diaochan', 40], ['tank', 44], ['kenji', 38], ['diaochan', 40]] },
        { at: 2080, talk: [['断电者·首谋', '把守卫全放出来——踏平他！']],
          mooks: [['tank', 46], ['angela', 42], ['houyi', 42], ['wukong', 42]] },
        { at: 2560, talk: [['你', '最后一圈。合闸的手，只需要腾出一只。']],
          mooks: [['wukong', 42], ['diaochan', 42], ['tank', 46], ['ayame', 42]] },
      ],
      // 终幕 Boss 血量 x10(玩家指定): 真正的耐久大墙, 由 spawnBoss 的 bossMul 生效
      boss: { id: 'wukong', hp: 168, name: '断电者·首谋', bossMul: 10 },
    },



  ],

  MOOK_TINTS: ['brightness(0.62) saturate(0.45)', 'brightness(0.56) saturate(0.5) hue-rotate(40deg)',
               'brightness(0.6) saturate(0.4) hue-rotate(-45deg)'],

  /* 杂兵变体 (M1.4): 77 个杂兵全是换色的英雄, 同屏辨识度太差。用体型 + 数值
     拉开三种读法 —— 小兵一碰就倒但跑得快、精英厚得要磨、常规居中。
     体型走 Fighter.sz(实例级, 精灵图与受击框一起缩放), 不动 DATA。 */
  VARIANTS: {
    small:  { sz: 0.86, hp: 0.66, dmg: 0.85, mob: 1.18, tint: 'brightness(0.72) saturate(0.35)' },
    normal: { sz: 1.00, hp: 1.00, dmg: 1.00, mob: 1.00, tint: null },
    elite:  { sz: 1.16, hp: 1.75, dmg: 1.12, mob: 0.90, tint: 'brightness(0.52) saturate(0.85) hue-rotate(-14deg)' },
  },

  /* ---------------- lifecycle ---------------- */
  start(heroId, diff) { return this._begin([heroId], diff); },
  // 双人副本: 两位英雄同屏共闯剧情关(P1 键盘左侧 / P2 方向键+右手簇), 共享残机池。
  startCoop(hero1, hero2, diff) { return this._begin([hero1, hero2], diff); },

  _begin(heroIds, diff) {
    const D = this.DIFF[diff] || this.DIFF.normal;
    this.st = {
      heroIds: heroIds.slice(), heroId: heroIds[0], coop: heroIds.length > 1,
      diff: diff || 'normal',
      level: 0, phase: 'talk', talkQ: [], talkNext: 'walk', talkT: 0,
      cam: 0, waveIdx: 0, wavesDone: false, arenaLock: null,
      enemies: [], boss: null, player: null, players: [], dummy: null,
      items: [], saidWave: {},
      lives: D.lives, livesMax: D.lives, revives: 0,
      kills: 0, t0: G.tick, over: false, paused: false, pauseView: 'menu',
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

  /* 存活玩家(未 dead 且未彻底出局) / 领头(最靠右)玩家 / 离敌人最近的活玩家 */
  _living() { return this.st.players.filter(pl => !pl.dead && !pl._out); },
  _lead() {
    const live = this._living();
    return (live.length ? live : this.st.players).reduce((a, b) => (b.x > a.x ? b : a));
  },
  _nearestPlayer(e) {
    const live = this._living();
    const pool = live.length ? live : this.st.players;
    return pool.reduce((a, b) => (Math.abs(b.x - e.x) < Math.abs(a.x - e.x) ? b : a));
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
    // 过关回血(按难度)而非全恢复 —— 保留闯关资源压力。
    // (原实现 clamp 到 100, 但 BASE_HP 早已是 150 —— 过第一关反而被削到 100 血,
    //  这是"越打越没续航"的主因之一, M1.4 修正为按 maxHp 归一)
    const D = this.DIFF[st.diff];
    const prev = st.players.slice();
    st.players = st.heroIds.map((hid, k) => {
      const f = new Fighter(hid, 220 + k * 64, 1, G);
      const old = prev[k];
      if (old) {
        f.hp = Math.min(f.maxHp, Math.round(Math.max(old.hp, f.maxHp * 0.35) + f.maxHp * D.heal));
        f.meter = Math.min(100, (old.meter || 0) + 25); // 过关补一截气, 下一关有牌可打
      }
      f.dispHp = f.hp;
      f._pad = k === 0 ? humanPad : humanPad2;   // 各自的手柄源
      f._pnum = k + 1;
      // 玩家侧加成(见 PLAYER): 更灵活 / 打得更痛 / 攒气更快
      f.mob = this.PLAYER.mob;
      f.dmgDealt = this.PLAYER.dmg;
      f.meterMul = this.PLAYER.meter;
      return f;
    });
    st.player = st.players[0]; // 主玩家别名(相机/主 HUD/环境粒子 仍以其为锚)
    // 影子陪练(不更新不绘制): 无敌人时给 player.update(opp) 一个稳定视线锚
    st.dummy = new Fighter('mack', L.worldW + 600, -1, G);
    st.dummy.frozen = 9e9;
    G.fighters = st.players.slice(); // 供引擎内部引用(如 Effects 文本挂靠)
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
  _mkEnemy(id, hp, x, tintIdx, variant = 'normal') {
    const D = this.DIFF[this.st.diff];
    const V = this.VARIANTS[variant] || this.VARIANTS.normal;
    const f = new Fighter(id, x, x > this.st.player.x ? -1 : 1, G);
    // 关卡递进(越来越难): 每往后一幕, 杂兵血量与出伤各加一档 ——
    // 第一幕基准, 终幕 ≈ +32% 血 / +16% 伤, 越接近总闸的敌人越硬。
    const lvl = this.st.level;
    const hpRamp = 1 + lvl * 0.08;
    const dmgRamp = 1 + lvl * 0.04;
    f.maxHp = f.hp = Math.max(6, Math.round(hp * D.mook * hpRamp * V.hp));
    f.dispHp = f.hp;
    f.isMook = true;
    f.variant = variant;
    f.elite = variant === 'elite';
    f.sz = V.sz;                                    // 体型(精灵图+受击框)
    f.dmgDealt = D.dmg * dmgRamp * V.dmg;           // 杂兵出伤系数(fighter.receiveHit 读取)
    f.mob = D.mookMob * V.mob;                      // 杂兵机动被压慢一点 —— 加成只给玩家
    f.gainMeter = () => {};        // 杂兵不攒气 —— 小兵放超必是"打不过"的隐形元凶
    f.superReady = () => false;
    f.tint = V.tint || this.MOOK_TINTS[tintIdx % this.MOOK_TINTS.length];
    f._ai = new AIController(f, this.st.player, D.ai, G);
    f._deadT = 0;
    f._rest = 20;                  // 入场先站一拍, 不能落地即抡
    return f;
  },

  /* 变体轮盘: 越靠后的幕精英越多, 小兵占比同步下降 —— 后期一波里既有硬骨头
     也有杂鱼, 打起来有层次。第一幕第一波全部常规(开局不给意外)。 */
  _rollVariant(waveIdx) {
    const lvl = this.st.level;
    if (lvl === 0 && waveIdx === 0) return 'normal';
    const elite = Math.min(0.34, 0.08 + lvl * 0.06);
    const small = Math.max(0.12, 0.34 - lvl * 0.05);
    const r = Math.random();
    if (r < elite) return 'elite';
    if (r < elite + small) return 'small';
    return 'normal';
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
      st.enemies.push(this._mkEnemy(id, hp, x, k, this._rollVariant(st.waveIdx)));
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
    // 关底血量随英雄基础血同比抬高, 否则英雄血/伤都涨了之后 Boss 一轮就没。
    // L.boss.bossMul: 关卡指定的额外血量倍率(终幕 x10 = 耐久大墙, 玩家点名要求)。
    b.maxHp = b.hp = Math.round(L.boss.hp * D.boss * (L.boss.bossMul || 1) * BASE_HP / 100);
    b.dispHp = b.hp;
    b.isBoss = true;
    b.mob = D.bossMob;
    b.bossMul = L.boss.bossMul || 1;   // HUD 据此显示"耐久型"警示 + 分段血条
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
    const st = this.st;
    for (const it of st.items) {
      it.t++;
      if (!it.landed) {
        it.vy += 0.55;
        it.y += it.vy;
        if (it.y >= STAGE.ground - 22) { it.y = STAGE.ground - 22; it.landed = true; it.vy = 0; Effects.dust(it.x, STAGE.ground, 4); }
      }
      if (it.t > it.life) { it.dead = true; continue; }
      // 任一活玩家身体碰到即拾取(双人: 谁碰到谁吃)
      for (const pl of this._living()) {
        const bb = pl.bodyBox();
        if (it.x > bb.x1 - 18 && it.x < bb.x2 + 18 && it.y > bb.y1 - 10 && it.y < bb.y2 + 26) {
          this._pickUp(it, pl);
          it.dead = true;
          break;
        }
      }
    }
    st.items = st.items.filter(x => !x.dead);
  },

  _pickUp(it, p) {
    const D = this.ITEMS[it.kind];
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
  _revive(p) {
    const st = this.st;
    p = p || st.player;
    p._out = false;
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
    p._overT = 0;
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

    // 暂停(ESC/P): 菜单式 —— 继续 / 重打本关 / 键位 / 退出。键位页里 ESC/K 先回菜单。
    if (Input.consume('Escape') || Input.consume('KeyP')) {
      if (!st.paused) { st.paused = true; st.pauseView = 'menu'; AudioSys.sfx('menuSel'); }
      else if (st.pauseView === 'keys') { st.pauseView = 'menu'; AudioSys.sfx('menuBack'); }
      else { this.exit(); AudioSys.sfx('menuBack'); return; }
    }
    if (st.paused) {
      if (st.pauseView === 'keys') {
        if (Input.consume('KeyK') || Input.consume('KeyJ') || Input.click(0, 0, 1024, 576)) {
          st.pauseView = 'menu'; AudioSys.sfx('menuBack');
        }
        return;
      }
      const rows = this._pauseRows();
      const hit = i => Input.click(rows[i].x, rows[i].y, rows[i].w, rows[i].h);
      if (Input.consume('KeyJ') || hit(0)) { st.paused = false; AudioSys.sfx('menuSel'); return; }
      if (Input.consume('KeyR') || hit(1)) {          // 重打本关(残机复位, 击破数保留)
        const df = st.diff, lv = st.level, kills = st.kills;
        st.paused = false;
        st.players = [];
        this.loadLevel(lv);
        st.kills = kills;
        st.lives = this.DIFF[df].lives;
        st.phase = 'talk';
        AudioSys.sfx('menuSel');
        return;
      }
      if (Input.consume('KeyK') || hit(2)) { st.pauseView = 'keys'; AudioSys.sfx('menuMove'); return; }
      if (hit(3)) { this.exit(); AudioSys.sfx('menuBack'); return; }
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
          const df = st.diff, lv = st.level, kills = st.kills;
          st.players = [];              // loadLevel 会按 heroIds 重建全部玩家
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
    const lead = this._lead();   // 领头玩家(推进/触发以他为准)

    // ---- 阶段推进 ----
    if (st.phase === 'walk') {
      // 解锁横向边界(全世界), 相机跟随
      STAGE.left = 50; STAGE.right = L.worldW - 50;
      const nextWave = L.waves[st.waveIdx];
      if (nextWave && lead.x >= nextWave.at) {
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
      if (st.wavesDone && lead.x >= L.worldW - 620 && !st.boss) {
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
        // 清波奖励(续航): 每位存活玩家小回血 + 场上必掉一份补给。
        // 双人: 顺手把已出局(残机耗尽倒下)的队友原地扶起半血 —— 并肩作战的温情
        const D = this.DIFF[st.diff];
        for (const pl of st.players) {
          if (pl._out) { this._revive(pl); pl.hp = Math.round(pl.maxHp * 0.4); pl.dispHp = pl.hp; continue; }
          if (pl.dead) continue;
          const heal = Math.min(pl.maxHp - pl.hp, Math.round(pl.maxHp * D.waveHeal));
          if (heal > 0) { pl.hp += heal; Effects.text(pl.x, pl.y - 220, `+${heal}`, '#8ae06a', 13); }
          pl.gainMeter(14);
        }
        Effects.text(lead.x, lead.y - 240, 'WAVE CLEAR', '#8ae06a', 15);
        this.dropItem(Math.max(STAGE.left + 40, Math.min(STAGE.right - 40, lead.x + 150)),
                      p.hp < p.maxHp * 0.6 ? 'meal' : 'batt');
        if (st.coop) this.dropItem(Math.max(STAGE.left + 40, Math.min(STAGE.right - 40, lead.x - 150)), 'batt');
        st.waveIdx++;
        st.arenaLock = null;
        st.phase = 'walk';
        Effects.text(lead.x, lead.y - 210, 'GO ➤', '#ffe27a', 18);
        AudioSys.sfx('menuSel');
      }
    }

    // ---- pads (每位玩家各自的手柄源) ----
    const anySuper = st.players.some(pl => pl.superSeq);
    for (const pl of st.players) pl.pad = (pl.dead || pl._out) ? emptyPad() : pl._pad();
    // 敌人出招名额(M1.4 难度阀门): 同屏最多 D.attackers 个可以出招, 且背对目标
    // 最多只允许 1 个 —— 防止玩家被前后夹击。双人时名额稍宽(见 spawnWave 的加成)。
    const D = this.DIFF[st.diff];
    const ranked = alive.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    let atkSlots = D.attackers + (st.coop ? 1 : 0), backSlots = st.coop ? 2 : 1;
    for (const e of ranked) {
      e._ai.opp = this._nearestPlayer(e);   // 敌人各自盯最近的活玩家
      e.pad = e._ai.update();
      // 一套打完强制歇招: 敌人不会无缝续压, 玩家有反打窗口
      if (e._prevMove && !e.move) e._rest = D.rest;
      e._prevMove = e.move;
      if (e._rest > 0) e._rest--;
      const tgt = e._ai.opp;
      const behind = (Math.sign(e.x - tgt.x) || 1) !== tgt.facing;
      let may = e._rest <= 0;
      if (!e.isBoss) {                              // Boss 不占名额, 永远可以打
        may = may && atkSlots > 0 && (!behind || backSlots > 0);
        if (may) { atkSlots--; if (behind) backSlots--; }
      }
      if (!may) e.pad.light = e.pad.heavy = e.pad.special = e.pad.super = false;
      // 任一玩家超杀演出中: 全场敌人定身(cine 不被围殴打断)
      if (anySuper) { e.pad = emptyPad(); e.frozen = Math.max(e.frozen, 2); }
    }

    // ---- updates ----
    for (const pl of st.players) {
      if (pl._out) continue;                 // 彻底出局的队友: 保持倒地, 不再更新
      const focus = alive.slice().sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x))[0] || st.dummy;
      pl._focus = focus;                     // 超必分镜锁定的那一个(溅射要排除它)
      pl.update(focus);
    }
    for (const e of alive) e.update(e._ai.opp || p);

    // 超必 = 清场技(爽度层): 分镜只咬住镜头目标一个人, 这里给场上其余敌人补溅射,
    // 打完一套超必周围一圈跟着炸 —— 「越爽越好」最直接的一刀
    for (const pl of st.players) {
      if (!pl.superSeq) continue;
      pl._splashT = (pl._splashT || 0) + 1;
      if (pl._splashT % 9) continue;
      for (const e of alive) {
        if (e === pl._focus || e.dead) continue;
        if (Math.abs(e.x - pl.x) > 420) continue;
        const dmg = Math.max(2, Math.round((pl.c.moves.super.cine ? pl.c.moves.super.cine.dmgPer : 8)
                                          * this.PLAYER.splash * (pl.dmgDealt || 1)));
        e.hp = Math.max(0, e.hp - dmg);
        e.flash = 5;
        e.lastHurt = G.tick;
        Effects.impact(e.x, e.y - 96, Math.sign(e.x - pl.x) || 1, { tier: 2, color: pl.c.theme2 });
        Effects.text(e.x, e.y - 150 - (e._dmgStack = ((e._dmgStack || 0) + 1) % 3) * 16,
                     String(dmg), '#ffd0a0', 12);
      }
    }

    // 耐久 Boss(bossMul>1)续航: 超长战里没有杂兵掉补给, 玩家会打到弹尽粮绝。
    // 每隔一段时间(血越低越勤)在场上补一份补给, 让"打大墙"是持久战而非饿死战。
    if (st.phase === 'bossfight' && st.boss && !st.boss.dead && (st.boss.bossMul || 1) > 1) {
      st._bossSupplyT = (st._bossSupplyT || 0) + 1;
      const hurt = this._living().reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), this._living()[0] || p);
      const lowFrac = hurt.hp / hurt.maxHp;
      const period = lowFrac < 0.4 ? 300 : 560; // 低血 5s 一份, 否则 ~9s
      if (st._bossSupplyT >= period && st.items.length === 0) {
        st._bossSupplyT = 0;
        const side = hurt.x < (STAGE.left + STAGE.right) / 2 ? 1 : -1;
        const dx = Math.max(STAGE.left + 40, Math.min(STAGE.right - 40, hurt.x + side * 210));
        this.dropItem(dx, lowFrac < 0.5 ? 'meal' : 'batt');
        Effects.text(dx, STAGE.ground - 190, '补给空投', '#8ae06a', 12);
      }
    }

    // 死亡敌人余尸计时(死亡动画演完后移除)
    for (const e of st.enemies) {
      if (e.dead) {
        e._deadT++;
        if (e._deadT === 1) {
          st.kills++;
          Effects.spark(e.x, e.y - 90, 0, ['#ffd24a', '#ffffff', '#c8452c'], 12, 5);
          for (const pl of this._living()) pl.gainMeter(8);
          if (!e.isBoss) this._rollDrop(e.x);   // 杂兵掉补给(续航来源)
          // 连杀爽度: 30tick 内连续击破 -> 横幅 + 慢镜 + 重震, 一波带走的快感
          if (!e.isBoss) {
            if (G.tick - (st.killT || -99) > 30) st.killRun = 0;
            st.killRun = (st.killRun || 0) + 1;
            st.killT = G.tick;
            if (st.killRun >= 2) {
              const NAME = ['', '', 'DOUBLE', 'TRIPLE', 'QUAD', 'PENTA'];
              Effects.text(e.x, e.y - 200, `${NAME[Math.min(5, st.killRun)]} K.O.!`, '#ff9db8', 18);
              Effects.shockRing(e.x, e.y - 40, '#ffd24a');
              Effects.flashFrame({ alpha: 0.2 + Math.min(4, st.killRun) * 0.04, t: 3 });
              G.hitstop(8 + st.killRun * 2);
              G.shake(8 + st.killRun, 12);
              G.slowmoT = 14; G.slowmo = 0.45; G.slowAcc = 0;
              AudioSys.sfx('superFlash');
            }
          }
        }
        if (e._deadT < 56) e.update(e._ai.opp || p); // 死亡动画推进
      }
    }
    st.enemies = st.enemies.filter(e => !e.dead || e._deadT < 56 || e.isBoss);

    // ---- 推挤(玩家 vs 敌 + 敌 vs 敌 + 玩家 vs 玩家) ----
    const bodies = [...this._living(), ...alive];
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      this._pushPair(bodies[i], bodies[j]);
    }

    // ---- 战斗解算(每位玩家 ↔ 每个敌人) ----
    // 打怪爽度层: 记下每次真实掉血, 就地飘伤害数字 + 累计连击 —— 反馈直接可见
    for (const pl of this._living()) {
      const plBox = pl.activeBox(), plMove = pl.move;
      for (const e of alive) {
        const hp0 = e.hp;
        tryHit(pl, e, plBox, plMove);
        const dealt = Math.round(hp0 - e.hp);
        if (dealt > 0) this._juiceHit(pl, e, dealt);
        tryHit(e, pl, e.activeBox(), e.move);
      }
    }
    // KO 判定(1v1 引擎由 doKO 负责, 闯关自管): 击倒抛飞 + 星爆
    for (const e of alive) {
      if (e.hp <= 0 && !e.dead) {
        const np = this._nearestPlayer(e);
        e.die();
        if (e.grounded) { e.grounded = false; e.vy = -8; e.vx = (Math.sign(e.x - np.x) || 1) * 6; }
        Effects.impact(e.x, e.y - 100, Math.sign(e.x - np.x) || 1, { tier: 3, color: '#ffd24a' });
        G.hitstop(e.isBoss ? 16 : 7);
        G.shake(e.isBoss ? 12 : 5, 10);
        AudioSys.sfx(e.isBoss ? 'ko' : 'hitH');
        if (e.isBoss) { G.slowmoT = 20; G.slowmo = 0.38; G.slowAcc = 0; Effects.flashFrame({ alpha: 0.4, t: 3 }); }
      }
    }
    // 玩家阵亡 / 续关: 共享残机池, 倒下者原地满血复活; 残机用尽则永久出局,
    // 全员出局才 GAME OVER(双人下只要有一人还站着就能继续)
    for (const pl of st.players) {
      if (pl._out) continue;
      if (pl.hp <= 0 && !pl.dead) {
        pl.die();
        if (pl.grounded) { pl.grounded = false; pl.vy = -8; pl.vx = -4; }
        pl._overT = 0;
        AudioSys.sfx('ko');
      }
      if (pl.dead) {
        pl._overT = (pl._overT || 0) + 1;
        if (pl._overT > 52) {
          if (st.lives > 0) { st.lives--; st.revives++; this._revive(pl); }
          else { pl._out = true; }
        }
      }
    }
    if (st.players.every(pl => pl._out) && st.phase !== 'over') {
      st.phase = 'over'; Effects.flashFrame({ alpha: 0.4, t: 3 });
    }
    for (const pr of G.projectiles) {
      if (pr.dead) continue;
      // 玩家的投射物打敌人; 敌人的投射物打所有活玩家
      const mine = st.players.includes(pr.owner);
      const targets = mine ? alive : this._living();
      for (const t of targets) {
        if (t.dead || t.superSeq) continue;
        if (pr.hitList && pr.hitList.includes(t)) continue;   // 贯穿: 同一目标只吃一次
        if (!rectsOverlap(pr.box(), t.bodyBox())) continue;
        if (t.invuln > 0 || t.state === 'down' || t.state === 'getup' || t.juggleImmune()) continue;
        const pd = pr.def;
        const hp0 = t.hp;
        t.receiveHit({
          dmg: Math.max(1, Math.round(pd.dmg * (pr.dmgMul || 1))), chip: pd.chip, guardDmg: pd.guardDmg,
          knock: pd.knock, hitstun: pd.hitstun,
          blockstun: pd.blockstun, meterHit: pd.meterHit, hitSfx: 'hitL', proj: true, launch: pd.launch,
        }, pr.owner);
        if (mine && t.hp < hp0) this._juiceHit(pr.owner, t, Math.round(hp0 - t.hp));
        pr.consume(t);                                       // 贯穿则继续飞, 否则消失
        Effects.spark(pr.x, pr.y, Math.sign(pr.vx), ['#c9baff', '#7d5bff', '#ffffff'], 10, 5);
        G.hitstop(pd.hitstop || 6);
        if (pr.dead) break;
      }
    }
    for (const pr of G.projectiles) pr.update();
    G.projectiles = G.projectiles.filter(x => !x.dead);

    this._updateItems();
    Effects.update();

    // 舞台环境粒子(与对战同款, 世界坐标下仍成立: 只在可视窗附近撒)
    this._ambient(L);

    // ---- 相机 ----
    // 单人: 跟主玩家; 双人: 跟两人中点。锁场时贴 arenaLock。
    if (st.arenaLock) {
      st.cam = st.arenaLock.left - 46;
    } else {
      const live = this._living();
      const anchor = st.coop && live.length
        ? live.reduce((s, pl) => s + pl.x, 0) / live.length
        : p.x;
      st.cam = Math.max(0, Math.min(L.worldW - 1024, anchor - 430));
      // 双人走图相牵引: 两人不能拉开超过一屏(否则一人跑出画面)
      if (st.coop && live.length === 2) {
        for (const pl of live) pl.x = Math.max(st.cam + 40, Math.min(st.cam + 984, pl.x));
      }
    }

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
    // 残影层(M1.4 修): 冲刺/俯冲/超必突进的 afterimage 与分身跑位都在这一层,
    // 闯关此前漏调 drawGhosts, 所有残影特效在剧情模式里是隐形的(对战模式一直有)
    Effects.drawGhosts(ctx);
    // 敌人(远->近) -> 玩家(最上)
    this._drawItems(ctx);
    for (const e of st.enemies) {
      if (e.dead && e._deadT >= 56) continue;
      drawF(e);
      if (e.elite && !e.dead) this._drawEliteMark(ctx, e);
    }
    // 双人: 靠后(x 小)的先画, 领头压在上面; 出局倒地的队友也照常画出身形
    for (const pl of st.players.slice().sort((a, b) => a.x - b.x)) {
      drawF(pl);
      if (st.coop) this._drawPlayerTag(ctx, pl);
    }
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
    if (st.paused) this._drawPause(ctx);

    if (st.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${st.fade / 24})`;
      ctx.fillRect(0, 0, 1024, 576);
    }
  },

  /* 掉落补给的像素小图标: 饮料罐 / 盒饭 / 电池, 落地后上下浮动 + 光晕呼吸 */
  /* 双人: 玩家头顶的 P1/P2 小标(区分谁是谁), 出局时显示 KO */
  _drawPlayerTag(ctx, pl) {
    const col = pl._pnum === 1 ? '#ffe27a' : '#7ecbff';
    const top = pl.y - (pl.c.body ? pl.c.body.h : 148) - 16;
    if (pl._out) {
      UI.pixText(ctx, 'K.O.', pl.x, top, { size: 10, align: 'center', color: '#e8306a', outline: true });
      return;
    }
    UI.pixText(ctx, 'P' + pl._pnum, pl.x, top, { size: 9, align: 'center', color: col, outline: true });
  },

  /* 精英杂兵头顶的双角标记 + 脚下暗环 —— 体型之外再给一个一眼能读的信号 */
  _drawEliteMark(ctx, e) {
    const bb = e.bodyBox();
    const y = bb.y1 - 12, x = e.x;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.tick * 0.12);
    ctx.strokeStyle = '#ff6b3d'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, STAGE.ground + 5, 22 * (e.sz || 1), 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ff6b3d';
    for (const sgn of [-1, 1]) {                 // 双角
      ctx.beginPath();
      ctx.moveTo(x + sgn * 3, y + 8);
      ctx.lineTo(x + sgn * 9, y);
      ctx.lineTo(x + sgn * 5, y + 9);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(x - 1.5, y + 3, 3, 3);
  },

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

  /* 单条玩家状态条(名/血/气); 双人时两条上下叠放, 各自配色 */
  _playerBar(ctx, p, y, accent) {
    ctx.fillStyle = 'rgba(10,14,12,0.78)';
    ctx.fillRect(14, y, 304, 52);
    ctx.fillStyle = accent;
    ctx.fillRect(14, y, 304, 2);
    const tag = this.st.coop ? `P${p._pnum} ` : '';
    UI.pixText(ctx, `${tag}${p.c.name} · ${p.c.cn}` + (p._out ? '  [K.O.]' : ''), 26, y + 18, { size: 11, color: p._out ? '#e8306a' : accent });
    const hpw = 270;
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, y + 26, hpw, 12);
    p.dispHp += (Math.max(0, p.hp) - p.dispHp) * 0.2;
    ctx.fillStyle = p.hp > p.maxHp * 0.2 ? '#e8b24e' : '#e8306a';
    ctx.fillRect(26, y + 26, hpw * Math.max(0, p.dispHp) / p.maxHp, 12);
    ctx.strokeStyle = '#b98f3e'; ctx.lineWidth = 1; ctx.strokeRect(26.5, y + 26.5, hpw - 1, 11);
    UI.pixText(ctx, `${Math.max(0, Math.round(p.hp))}/${p.maxHp}`, 296, y + 36, { size: 8, align: 'right', color: '#2a1c12' });
    ctx.fillStyle = '#241d18'; ctx.fillRect(26, y + 42, hpw, 6);
    ctx.fillStyle = p.meter >= 100 ? '#c8452c' : '#b98f3e';
    ctx.fillRect(26, y + 42, hpw * p.meter / 100, 6);
    if (p.meter >= 100 && G.tick % 30 < 18) UI.pixText(ctx, '超必 READY', 300, y + 20, { size: 8, align: 'right', color: '#ff9a52' });
  },

  /* ---------------- 打怪爽度层 (M1.4) ----------------
     每一次真实掉血都给出可读的反馈: 伤害数字往上飘 + 连击数累计 + 阶段性喝彩,
     连击越长字越大越亮。数字用堆叠偏移防止同帧多个数字重叠成一团。 */
  _juiceHit(pl, e, dealt) {
    const st = this.st;
    e._dmgStack = ((e._dmgStack || 0) + 1) % 4;
    const big = dealt >= 26;
    Effects.text(e.x + (Math.random() - 0.5) * 14, e.y - 132 - e._dmgStack * 17,
                 String(dealt), big ? '#ffd24a' : '#fff2d8', big ? 16 : 13);
    // 连击: 1.1s 内的连续命中算一串(每位玩家各自计数)
    if (G.tick - (pl._hitT || -99) > 66) pl._hits = 0;
    pl._hits = (pl._hits || 0) + 1;
    pl._hitT = G.tick;
    st.combo = { n: pl._hits, t: G.tick, who: pl._pnum || 1 };
    st.best = Math.max(st.best || 0, pl._hits);
    // 里程碑喝彩 + 额外顿帧/震屏, 越打越响
    const CHEER = { 5: ['NICE!', '#8ae06a'], 10: ['GREAT!!', '#7fd3ff'],
                    15: ['AMAZING!!', '#ffd24a'], 20: ['UNREAL!!!', '#ff9db8'] };
    const c = CHEER[pl._hits];
    if (c) {
      Effects.text(pl.x, pl.y - 226, `${pl._hits} HIT ${c[0]}`, c[1], 17);
      Effects.ring(pl.x, pl.y - 90, c[1], 14);
      G.hitstop(4);
      G.shake(4, 8);
      AudioSys.sfx('menuSel');
    }
  },

  _hud(ctx, L) {
    const st = this.st;
    // 玩家状态条: P1 左上; 双人时 P2 叠在其下
    this._playerBar(ctx, st.players[0], 12, '#ffe27a');
    if (st.coop && st.players[1]) this._playerBar(ctx, st.players[1], 68, '#7ecbff');
    // 共享残机(续关次数): 一颗一格, 用光(全员倒下)才 GAME OVER
    const ly = st.coop ? 126 : 70;
    UI.pixText(ctx, '残機', 26, ly + 8, { size: 9, color: '#8a9a8f' });
    for (let i = 0; i < st.livesMax; i++) {
      const lx = 58 + i * 13, on = i < st.lives;
      ctx.fillStyle = on ? '#e8306a' : '#2a2028';
      ctx.fillRect(lx, ly, 9, 9);
      ctx.fillStyle = on ? '#ff9db8' : '#3a303a';
      ctx.fillRect(lx, ly, 9, 2);
    }
    // 关卡/波次(右上)
    UI.pixText(ctx, L.name, 1010, 28, { size: 12, align: 'right', color: '#d9a441' });
    const wavesN = L.waves.length;
    const label = st.boss ? 'BOSS' : (st.phase === 'fight' ? `WAVE ${st.waveIdx + 1}/${wavesN}` : `前进 ${Math.min(100, Math.round(this._lead().x / (L.worldW - 620) * 100))}%`);
    UI.pixText(ctx, `${L.sub} ${st.level + 1}/${this.LEVELS.length} · ` + label + ` · 击破 ${st.kills}`,
      1010, 48, { size: 10, align: 'right', color: '#9aa3bd' });
    // 连击计数(右侧中段): 命中后 1.1s 内保持显示, 数字随连击数变大变亮 —— 爽度可视化
    if (st.combo && G.tick - st.combo.t < 66 && st.combo.n >= 2) {
      const n = st.combo.n, age = (G.tick - st.combo.t) / 66;
      const pop = 1 + Math.max(0, .35 - (G.tick - st.combo.t) * .05);
      const col = n >= 20 ? '#ff9db8' : n >= 15 ? '#ffd24a' : n >= 10 ? '#7fd3ff' : n >= 5 ? '#8ae06a' : '#e8e2d0';
      ctx.save();
      ctx.globalAlpha = 1 - age * .35;
      UI.pixText(ctx, String(n), 990, 132, { size: Math.round((22 + Math.min(14, n)) * pop), align: 'right', color: col, outline: true });
      UI.pixText(ctx, 'HIT', 990, 152, { size: 11, align: 'right', color: col });
      if (st.combo.who === 2) UI.pixText(ctx, 'P2', 990, 168, { size: 9, align: 'right', color: '#7ecbff' });
      ctx.restore();
    }
    // Boss 血条(顶中)
    const b = st.boss;
    if (b && !b.dead) {
      const bw = 430, mul = b.bossMul || 1;
      ctx.fillStyle = 'rgba(10,8,10,0.82)';
      ctx.fillRect(512 - bw / 2 - 8, 10, bw + 16, mul > 1 ? 42 : 34);
      UI.pixText(ctx, b.bossName + (mul > 1 ? ' · 耐久型' : ''), 512, 24, { size: 10, align: 'center', color: '#ff9db8' });
      ctx.fillStyle = '#241418'; ctx.fillRect(512 - bw / 2, 28, bw, 10);
      b.dispHp += (Math.max(0, b.hp) - b.dispHp) * 0.16;
      const frac = Math.max(0, b.dispHp) / b.maxHp;
      // 耐久 Boss: 血条底层显示剩余"节"数(每节=总血/mul), 顶层是当前节的细腻进度;
      // 一节打空一次全屏微闪的进度感, 让 x10 的长条不至于像挤牙膏
      if (mul > 1) {
        const seg = 1 / mul, litSeg = Math.ceil(frac / seg - 1e-6);
        // 底层: 剩余整节(暗金格)
        for (let i = 0; i < mul; i++) {
          const on = i < litSeg;
          ctx.fillStyle = on ? '#7a3a12' : '#1a1008';
          ctx.fillRect(512 - bw / 2 + i * (bw / mul) + 1, 28, bw / mul - 2, 10);
        }
        // 顶层: 当前节内的精细血量(亮红), 叠在最上一节
        const within = (frac - (litSeg - 1) * seg) / seg; // 0..1 当前节剩余
        const segW = bw / mul;
        ctx.fillStyle = '#e8452c';
        ctx.fillRect(512 - bw / 2, 28, (litSeg - 1) * segW + segW * Math.max(0, Math.min(1, within)), 10);
        UI.pixText(ctx, `${litSeg}/${mul} 节 · ${Math.max(0, Math.round(b.hp))}`, 512, 48, { size: 8, align: 'center', color: '#ffd0a0' });
      } else {
        ctx.fillStyle = '#c8452c';
        ctx.fillRect(512 - bw / 2, 28, bw * frac, 10);
      }
      ctx.strokeStyle = '#8a2a1c'; ctx.strokeRect(512 - bw / 2 + 0.5, 28.5, bw - 1, 9);
    }
    // 底部键位提示(双人时补 P2 键位)
    ctx.fillStyle = 'rgba(10,8,6,0.7)';
    ctx.fillRect(0, 552, 1024, 24);
    if (st.coop) {
      UI.pixText(ctx, 'P1 WASD·J轻K重U必I超  |  P2 方向键·小键盘1轻 2重 3必 0超  ·  后拉防御 · ESC暂停',
        512, 568, { size: 9, align: 'center', color: '#c9bfa8' });
    } else {
      UI.pixText(ctx, 'WASD移动 · J轻 K重 U必杀 I超必 · S+J/K 蹲攻 · 双击A/D冲刺 · 后拉防御 · ESC暂停', 512, 568, { size: 10, align: 'center', color: '#c9bfa8' });
    }
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

  /* 暂停菜单四行的几何(绘制与鼠标热区同源) */
  _pauseRows() {
    const r = [];
    for (let i = 0; i < 4; i++) r.push({ x: 342, y: 248 + i * 46, w: 340, h: 38 });
    return r;
  },

  _drawPause(ctx) {
    const st = this.st;
    ctx.fillStyle = 'rgba(6,8,7,0.78)';
    ctx.fillRect(0, 0, 1024, 576);
    if (st.pauseView === 'keys') {
      UI.pixText(ctx, '键位', 512, 120, { size: 30, align: 'center', color: '#ffe27a', outline: true, spacing: 4 });
      const L = [
        ['P1', '#ffe27a', 'WASD 移动 · 双击 A/D 冲刺 · S+J/K 蹲攻'],
        ['', '#ffe27a', 'J 轻击 · K 重击 · U 必杀 · I 超必 · 后拉方向 = 防御'],
        ['P2', '#7ecbff', '方向键 移动 · 双击 ←/→ 冲刺 · ↓+技能 蹲攻'],
        ['', '#7ecbff', '小键盘 1 轻 · 2 重 · 3 必杀 · 0 超必 (需开 NumLock)'],
        ['通用', '#c9bfa8', 'ESC/P 暂停 · M 静音 · -/= 音乐 · 9/0 音效'],
      ];
      L.forEach(([tag, col, txt], i) => {
        const y = 190 + i * 40;
        if (tag) UI.pixText(ctx, tag, 250, y, { size: 13, color: col });
        UI.pixText(ctx, txt, 300, y, { size: 11, color: '#e8e2d0' });
      });
      if (G.tick % 40 < 26) UI.pixText(ctx, 'K / ESC / 点击 返回', 512, 470, { size: 12, align: 'center', color: '#8a9a8f' });
      return;
    }
    UI.pixText(ctx, '一時停止', 512, 190, { size: 34, align: 'center', color: '#ffe27a', outline: true, spacing: 4 });
    const rows = this._pauseRows();
    const items = [['J', '继续', '#ffe27a'], ['R', '重打本关', '#ff9db8'],
                   ['K', '键位说明', '#7ecbff'], ['ESC', '退出闯关', '#c9bfa8']];
    items.forEach(([key, label, col], i) => {
      const rc = rows[i];
      const hot = Input.hover(rc.x, rc.y, rc.w, rc.h);
      ctx.fillStyle = hot ? 'rgba(255,226,122,0.14)' : 'rgba(16,20,18,0.82)';
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.fillStyle = col;
      ctx.fillRect(rc.x, rc.y, 3, rc.h);
      UI.pixText(ctx, key, rc.x + 26, rc.y + 25, { size: 13, color: col });
      UI.pixText(ctx, label, rc.x + 108, rc.y + 25, { size: 14, color: hot ? '#fff' : '#e8e2d0' });
    });
    UI.pixText(ctx, `${this.LEVELS[st.level].sub} · 残机 ${st.lives}/${st.livesMax} · 击破 ${st.kills}`,
      512, 460, { size: 11, align: 'center', color: '#9aa3bd' });
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
    const heroes = st.players.map(pl => pl.c.cn).join(' & ');
    UI.pixText(ctx, `${st.coop ? '双人' : '英雄'}: ${heroes} · 击破: ${st.kills} · 用时: ${mins} 分`, 512, 300, { size: 13, align: 'center', color: '#e8e2d0' });
    UI.pixText(ctx, `难度: ${st.diff.toUpperCase()} · 全 ${this.LEVELS.length} 幕 · 续关: ${st.revives}`,
      512, 326, { size: 11, align: 'center', color: '#9aa3bd' });
    UI.pixText(ctx, `最高连击: ${st.best || 0} HIT`, 512, 350,
      { size: 12, align: 'center', color: (st.best || 0) >= 20 ? '#ff9db8' : (st.best || 0) >= 10 ? '#ffd24a' : '#8ae06a' });
    if (st.revives === 0) UI.pixText(ctx, 'NO CONTINUE — 一命通关！', 512, 376, { size: 12, align: 'center', color: '#ffb648' });
    if (G.tick % 40 < 26) UI.pixText(ctx, 'J / 点击 · 返回标题', 512, 420, { size: 12, align: 'center', color: '#ffe27a' });
  },
};
