/* SOUL BLADE PLUS · M1 signature super choreographies.
   Loaded after fighter.js; adds three cine styles to Fighter.prototype:
     'staff'     悟空·大聖乱舞  腾空连棍 -> 高空压制 -> 落地重砸(裂纹+金环)
     'arrowrain' 后羿·射日      蓄力后撤 -> 光箭锁定+箭雨 -> 巨型太阳箭
     'flame'     安琪拉·熾熱光輝 魔法书展开 -> 地面法阵 -> 烈焰洪流 -> 紫红爆炸
   Damage bookkeeping goes through cineDamageTick (same combo/HP semantics as
   the stock cine). The victim hold is inherited from runSuperSeq's preamble. */
'use strict';

(() => {
  const FP = Fighter.prototype;

  /* shared ender: launcher + finale dressing, mirrors the generic finish */
  FP._cineFinish = function (opp, s, o = {}) {
    const dmg = Math.max(1, Math.round(s.final * s.scale));
    opp.hp = Math.max(0, opp.hp - dmg);
    opp.frozen = 0;
    opp.state = 'hit'; opp.setAnim('hit', true);
    opp.grounded = false;
    opp.vy = o.vy !== undefined ? o.vy : -12;
    opp.vx = this.facing * (o.vx !== undefined ? o.vx : 16);
    opp.kdPending = true;
    this.combo.count++; this.combo.timer = 90;
    this.world.stats.maxCombo = Math.max(this.world.stats.maxCombo, this.combo.count);
    Effects.impact(opp.x, opp.y - 110, this.facing, { tier: 4, color: o.color || this.c.theme2 });
    Effects.flashFrame({ alpha: o.flash !== undefined ? o.flash : 0.5, t: 3 });
    this.world.slowmoT = 20; this.world.slowmo = 0.38; this.world.slowAcc = 0;
    this.world.hitstop(o.hitstop !== undefined ? o.hitstop : 18);
    this.world.shake(o.shake !== undefined ? o.shake : 12, 16);
    AudioSys.sfx('hitH');
    // restore self
    this.superSeq = null; this.cineSmear = null;
    this.y = STAGE.ground; this.grounded = true; this.vy = 0;
    this.state = 'idle'; this.move = null;
    this.setAnim('idle', true);
  };

  /* ================= 悟空 · 大聖乱舞 v2 (style: 'staff') =================
     M1.2 强反馈重编排(伤害节奏不变: 4 tick + 终结):
     A t1     战鼓 stinger + 冲步贴身(尘暴)
     B t10/20/30 腾空三连棍 —— 每击一道巨型金棍弧光(r120+, 递增)+星爆+棍击闷响
     C t38    高空封顶: 大弧光下劈 + 白闪 + 双侧尘柱
     D t44-50 高跃蓄势(金光汇聚 + '如意·崩!')
     E t52    落地重砸: 金色光柱 + 三连冲击环 + 地裂弧线 + 尘暴 + staffSlam */
  FP.runCineStaff = function (opp, s) {
    const t = s.t;
    if (t === 1) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.x = opp.x - this.facing * 96;
      Effects.dust(this.x, STAGE.ground, 12, this.facing);
      Effects.dust(this.x - this.facing * 40, STAGE.ground, 8, -this.facing);
      Effects.text(this.x, this.y - 210, '大聖乱舞!', '#ffd24a', 18);
      AudioSys.sfx('superWukong');
    }
    // 腾空段: 悬到对手头侧
    if (t >= 4 && t <= 42) {
      this.grounded = false; this.vy = 0;
      const k = Math.min(1, (t - 4) / 8);
      this.y = STAGE.ground - 62 * k - Math.sin(t * .32) * 6;
      this.x = opp.x - this.facing * (70 - 14 * k);
    }
    if (t === 10 || t === 20 || t === 30) {
      const n = t / 10; // 1..3 递增强度
      this.setAnim(n % 2 ? 'attack1' : 'attack2', true);
      this.anim.t = this.c.anims.attack1.hold * 4; this.anim.frame = 4;
      this.cineDamageTick(opp, s);
      // 巨型金棍弧光: 每击换向, 半径与厚度递增 —— "如意棒巨化"的主视觉
      const swing = [[-2.4, 0.5], [0.6, -2.5], [-1.2, 1.1]][n - 1];
      Effects.slash(opp.x - this.facing * 6, opp.y - 96, this.facing, {
        r: 116 + n * 12, a0: swing[0], a1: swing[1], w: 20 + n * 3,
        life: 13, grow: 2.0, sweep: 0.4, color: '#fff6d8', color2: '#ffd24a',
      });
      Effects.slash(opp.x - this.facing * 6, opp.y - 96, this.facing, {
        r: 88 + n * 10, a0: swing[0] * 0.9, a1: swing[1] * 0.9, w: 8,
        life: 9, grow: 1.2, sweep: 0.5, color: '#ffffff', color2: '#ff9d3d',
      });
      Effects.impact(opp.x, opp.y - 100 - n * 8, this.facing, { tier: n === 3 ? 3 : 2, color: '#ffd24a' });
      Effects.spark(opp.x, opp.y - 90, this.facing, ['#ffd24a', '#fff2d8', '#ff6b3d'], 12, 6);
      this.world.hitstop(5); this.world.shake(4 + n, 6);
      AudioSys.sfx('staffHit');
    }
    if (t === 38) { // 高空封顶: 第四段
      this.setAnim('attack2', true);
      this.anim.t = this.c.anims.attack2.hold * 4; this.anim.frame = 4;
      this.cineDamageTick(opp, s);
      Effects.slash(opp.x, opp.y - 120, this.facing, {
        r: 150, a0: -2.2, a1: -0.9, w: 26, life: 14, grow: 2.4, sweep: 0.35,
        color: '#fff6d8', color2: '#ff9d3d',
      });
      Effects.impact(opp.x, opp.y - 130, this.facing, { tier: 3, color: '#ff9d3d' });
      Effects.flashFrame({ alpha: 0.3, t: 2 });
      Effects.dust(opp.x - 40, STAGE.ground, 10, -1);
      Effects.dust(opp.x + 40, STAGE.ground, 10, 1);
      this.world.hitstop(8); this.world.shake(7, 9);
      AudioSys.sfx('staffHit'); AudioSys.sfx('whooshH');
    }
    if (t === 44) { // 高跃蓄势
      this.x = opp.x - this.facing * 54;
      this.y = STAGE.ground - 150;
      Effects.converge(this.x, this.y - 40, ['#ffd24a', '#fff6d8', '#ffffff'], 26, 90);
      Effects.text(this.x, this.y - 90, '如意·崩!', '#ffd24a', 18);
      AudioSys.sfx('whooshL');
    }
    if (t >= 45 && t < 52) { // 俯冲
      this.grounded = false; this.vy = 0;
      this.y = STAGE.ground - 150 + (t - 44) * 21;
    }
    if (t === 52) { // 落地重砸
      this.y = STAGE.ground; this.grounded = true;
      this.setAnim('attack2', true);
      this.anim.t = this.c.anims.attack2.hold * 4; this.anim.frame = 4;
      Effects.pillar(opp.x, STAGE.ground, '#ffd24a');
      Effects.dust(opp.x - 34, STAGE.ground, 16, -1);
      Effects.dust(opp.x + 34, STAGE.ground, 16, 1);
      Effects.dust(opp.x, STAGE.ground, 12, 0);
      // 地面裂纹: 低角度金色劈线自砸点向两侧铺开
      for (const sgn of [-1, 1]) {
        Effects.slash(opp.x + sgn * 52, STAGE.ground - 8, sgn, {
          r: 108, a0: sgn > 0 ? 0.16 : Math.PI - 0.16, a1: sgn > 0 ? -0.1 : Math.PI + 0.1,
          w: 11, life: 20, grow: 1.7, color: '#ffd24a', color2: '#a86a1c',
        });
      }
      Effects.shockRing(opp.x, STAGE.ground - 40, '#ffd24a');
      Effects.shockRing(opp.x, STAGE.ground - 40, '#ff9d3d', 3);
      Effects.shockRing(opp.x, STAGE.ground - 40, '#ffffff', 6);
      AudioSys.sfx('staffSlam');
      this._cineFinish(opp, s, { vy: -14, vx: 16, color: '#ffd24a', shake: 16, hitstop: 20 });
    }
  };

  /* ================= 后羿 · 射日 v2 (style: 'arrowrain') =================
     M1.2 真·漫天箭雨(伤害节奏不变: 4 tick + 终结):
     A t1-16  后撤拉满弓蓄力(弓鸣 stinger + 金芒上升)
     B t18/26/34/42 四波齐射 —— 每波 4 支光箭自天顶坠落(3 支洗地+1 支锁定),
              锁定箭 7 tick 后命中(t25/33/41/49 伤害 tick)
     C t54    '落日!' 大蓄力汇聚
     D t60    巨型太阳箭: 横贯光束 + 冲击环 -> t62 终结崩飞 */
  FP.runCineArrowRain = function (opp, s) {
    const t = s.t;
    if (t === 1) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.x = Math.max(STAGE.left + 20, Math.min(STAGE.right - 20, opp.x - this.facing * 330));
      this.setAnim('attack1', true);
      this.anim.t = this.c.anims.attack1.hold * 2; this.anim.frame = 2; // 拉弓帧
      Effects.converge(this.x + this.facing * 30, this.y - 96, ['#ffd24a', '#c6d0e0', '#ffffff'], 30, 90);
      Effects.text(this.x, this.y - 200, '射日!', '#ffd24a', 18);
      AudioSys.sfx('superHouyi');
    }
    if (t >= 4 && t <= 16 && t % 4 === 0) {
      Effects.rise(this.x + this.facing * 20, this.y - 60, '#ffd24a', 2);
    }
    if (t === 18 || t === 26 || t === 34 || t === 42) { // 四波齐射
      this.setAnim('attack1', true);
      this.anim.t = this.c.anims.attack1.hold * 4; this.anim.frame = 4; // 放箭帧
      // 仰射向天的出膛闪
      Effects.spark(this.x + this.facing * 26, this.y - 110, this.facing, ['#ffd24a', '#ffffff'], 6, 5);
      AudioSys.sfx('arrowLoose');
      // 3 支洗地箭: 天顶坠落, 落点散布在对手周身, 钉地扬尘
      for (let k = 0; k < 3; k++) {
        const lx = opp.x + (Math.random() * 150 - 75);
        Effects.skyArrow(lx - this.facing * (70 + Math.random() * 70), -26 - Math.random() * 34,
          lx, STAGE.ground - 4, {
            dur: 6 + Math.random() * 3,
            onHit: a => Effects.dust(a.x1, STAGE.ground, 4, 0),
          });
      }
      // 1 支锁定箭: 直取对手胸口, 7 tick 后到达(与伤害 tick 对齐)
      Effects.skyArrow(opp.x - this.facing * 120, -30, opp.x, opp.y - 90, { dur: 7, color: '#fff6d8' });
    }
    if (t === 25 || t === 33 || t === 41 || t === 49) { // 锁定箭命中
      const n = (t - 25) / 8; // 0..3
      this.cineDamageTick(opp, s);
      Effects.impact(opp.x, opp.y - 88 - n * 6, this.facing, { tier: 2, color: '#ffd24a' });
      Effects.spark(opp.x, opp.y - 90, this.facing, ['#ffd24a', '#ffffff'], 9, 6);
      this.world.hitstop(4); this.world.shake(3, 5);
      AudioSys.sfx('arrowHit');
    }
    if (t === 54) { // 大蓄力
      Effects.converge(this.x + this.facing * 26, this.y - 100, ['#ff9d3d', '#ffd24a', '#ffffff'], 40, 130);
      Effects.text(this.x, this.y - 210, '落日!', '#ff9d3d', 18);
      Effects.flashFrame({ alpha: 0.2, t: 2 });
    }
    if (t === 60) { // 太阳箭: 横贯光束
      this.setAnim('attack1', true);
      this.anim.t = this.c.anims.attack1.hold * 4; this.anim.frame = 4;
      Effects.beam(this.x + this.facing * 34, opp.y - 96, this.facing, {
        core: '#fff6d8', edge: '#ffd24a', glow: '#ff9d3d',
        life: 18, maxW: 15, targetX: opp.x,
      });
      Effects.shockRing(opp.x, opp.y - 96, '#ffd24a');
      Effects.ring(opp.x, opp.y - 96, '#ff9d3d', 22);
      AudioSys.sfx('sunArrow');
    }
    if (t === 62) {
      this._cineFinish(opp, s, { vy: -10, vx: 20, color: '#ffd24a', flash: 0.55, shake: 13 });
    }
  };

  /* ================= 安琪拉 · 熾熱光輝 v2 (style: 'flame') =================
     M1.2 奥特曼式激光放射(伤害节奏不变: 5 tick + 终结):
     A t1-12  双腕十字架势充能(上行尖鸣 stinger + 品红/白 汇聚 + 腕间光珠)
     B t14    光束发射: 全屏横贯巨型光束(白芯+品红边缘+橙晕+行进能量环+末端爆闪)
     C t18-42 持续照射五段灼击(t18/24/30/36/42), 架势全程定格
     D t50    光束收束, 能量内爆汇聚
     E t54    品红大爆发: 光柱+双冲击环 -> 终结崩飞 */
  FP.runCineFlame = function (opp, s) {
    const t = s.t;
    const bx = () => this.x + this.facing * 46, by = () => this.y - 96;
    if (t === 1) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.setAnim('attack2', true);
      this.anim.t = this.c.anims.attack2.hold * 2; this.anim.frame = 2; // 咏唱帧(双腕架势)
      Effects.converge(bx(), by(), ['#c94aff', '#ffffff', '#ff8428'], 36, 110);
      Effects.text(this.x, this.y - 200, '光線·全開!', '#c94aff', 17);
      AudioSys.sfx('superAngela');
    }
    if (t >= 4 && t <= 12 && t % 4 === 0) { // 腕间光珠膨胀
      Effects.converge(bx(), by(), ['#c94aff', '#ffffff'], 14, 60);
      Effects.spark(bx(), by(), this.facing, ['#c94aff', '#ffffff'], 5, 3);
    }
    if (t === 14) { // 光束发射
      this.setAnim('attack2', true);
      this.anim.t = this.c.anims.attack2.hold * 4; this.anim.frame = 4; // 放射帧
      Effects.beam(bx(), by(), this.facing, {
        core: '#ffffff', edge: '#c94aff', glow: '#ff8428',
        life: 34, maxW: 22, targetX: opp.x,
      });
      Effects.flashFrame({ alpha: 0.35, t: 3 });
      this.world.shake(5, 8);
      AudioSys.sfx('beamFire');
    }
    if (t > 14 && t <= 48) { // 架势定格(放射中)
      this.anim.t = this.c.anims.attack2.hold * 4; this.anim.frame = 4;
    }
    if (t >= 18 && t <= 42 && (t - 18) % 6 === 0) { // 五段灼击 18,24,30,36,42
      const n = (t - 18) / 6;
      this.cineDamageTick(opp, s);
      Effects.impact(opp.x, opp.y - 92, this.facing, { tier: 2, color: n % 2 ? '#ffffff' : '#c94aff' });
      Effects.spark(opp.x, opp.y - 90, this.facing, ['#c94aff', '#ffffff', '#ff8428'], 8, 5);
      this.world.hitstop(2); this.world.shake(3, 4);
      AudioSys.sfx('beamHit');
    }
    if (t === 50) { // 收束内爆
      Effects.converge(opp.x, opp.y - 92, ['#c94aff', '#ffffff', '#ff8428'], 30, 90);
      Effects.flashFrame({ alpha: 0.2, t: 2 });
    }
    if (t === 54) { // 品红大爆发
      Effects.pillar(opp.x, STAGE.ground, '#c94aff');
      Effects.shockRing(opp.x, opp.y - 90, '#c94aff');
      Effects.shockRing(opp.x, opp.y - 90, '#ff8428', 4);
      Effects.ring(opp.x, opp.y - 96, '#ffe27a', 24);
      Effects.dust(opp.x, STAGE.ground, 12, 0);
      AudioSys.sfx('beamBurst');
      this._cineFinish(opp, s, { vy: -12, vx: 15, color: '#c94aff', flash: 0.55, shake: 13 });
    }
  };

  /* ================= 貂蝉 · 花舞乱影 (style: 'fandance') · M1.3 =================
     A t1     '花舞·乱影!' + 花瓣起手 stinger
     B t8-36  五段幻舞扇斩(t8/15/22/29/36): 每段瞬身换位到对手另一侧,
              残影 + 粉白扇弧交叉 + 花瓣迸散
     C t42    合围收势(花瓣汇聚)
     D t48    终结: 双巨扇 X 交叉斩 + 花瓣雨崩飞 */
  FP.runCineFandance = function (opp, s) {
    const t = s.t;
    if (t === 1) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.x = opp.x - this.facing * 88;
      Effects.petals(this.x, this.y - 120, 12);
      Effects.text(this.x, this.y - 200, '花舞・乱影!', '#ff9db8', 17);
      AudioSys.sfx('superDiaochan');
    }
    if (t >= 8 && t <= 36 && (t - 8) % 7 === 0) { // 五段幻舞
      const n = (t - 8) / 7; // 0..4
      const side = n % 2 === 0 ? 1 : -1;
      // 瞬身换位: 舞步绕到另一侧(残影表现换位轨迹)
      this.x = opp.x + side * 62 * -this.facing;
      this.facing = opp.x >= this.x ? 1 : -1;
      this.setAnim(n % 2 ? 'attack2' : 'attack1', true);
      this.anim.t = this.c.anims.attack1.hold * 4; this.anim.frame = 4;
      this.cineDamageTick(opp, s);
      const cut = [[-2.3, 0.4], [0.5, -2.4], [-1.1, 1.0], [0.9, -2.0], [-2.5, 0.2]][n];
      Effects.slash(opp.x - this.facing * 4, opp.y - 96, this.facing, {
        r: 104 + n * 6, a0: cut[0], a1: cut[1], w: 16, life: 11, grow: 1.6, sweep: 0.45,
        color: '#fff0f4', color2: '#ff9db8',
      });
      Effects.impact(opp.x, opp.y - 96, this.facing, { tier: 2, color: '#ff9db8' });
      Effects.petals(opp.x, opp.y - 110, 6);
      this.world.hitstop(4); this.world.shake(4, 5);
      AudioSys.sfx('fanHit');
    }
    if (t === 42) { // 合围收势
      Effects.converge(opp.x, opp.y - 96, ['#ff9db8', '#ffffff', '#e2547a'], 30, 100);
      Effects.flashFrame({ alpha: 0.2, t: 2 });
    }
    if (t === 48) { // 双巨扇 X 交叉斩终结
      this.x = opp.x - this.facing * 60;
      this.setAnim('attack2', true);
      this.anim.t = this.c.anims.attack2.hold * 4; this.anim.frame = 4;
      for (const [a0, a1] of [[-2.5, 0.5], [0.6, -2.6]]) {
        Effects.slash(opp.x, opp.y - 96, this.facing, {
          r: 138, a0, a1, w: 22, life: 15, grow: 2.2, sweep: 0.35,
          color: '#ffffff', color2: '#ff9db8',
        });
      }
      Effects.petalBurst(opp.x, opp.y - 90, 30);
      Effects.petalRain(opp.x, opp.y, 24);
      Effects.shockRing(opp.x, opp.y - 90, '#ff9db8');
      Effects.shockRing(opp.x, opp.y - 90, '#ffffff', 4);
      AudioSys.sfx('fanFinale');
      this._cineFinish(opp, s, { vy: -12, vx: 16, color: '#ff9db8', flash: 0.5, shake: 13 });
    }
  };
})();
