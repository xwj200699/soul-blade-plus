/* AI opponent: plans an action every few ticks (reaction time scales with
   difficulty), reacts to threats, follows up combos, spends meter. */
'use strict';

/* roster-generalisation: behaviour keys derived from the kit, not the id.
   meleeSpecial = mack-style rushing/point-blank special;
   projSpecial  = kenji-style throw; longArm = extra reach on normals. */
function aiKit(f) {
  const sp = f.c.moves.special || {};
  return {
    meleeSpecial: !sp.projectile && !!sp.box,
    projSpecial: !!sp.projectile,
    airProj: !!f.c.moves.airspecial,
    dashSlash: !!f.c.moves.dashslash,
    longArm: (f.c.moves.heavy && f.c.moves.heavy.box && f.c.moves.heavy.box.x2 >= 220) || f.c.id === 'mack',
  };
}
class AIController {
  constructor(fighter, opp, diffKey, world) {
    this.f = fighter;
    this.opp = opp;
    this.d = AI_DIFFS[diffKey];
    this.world = world;
    this.plan = 'idle';
    this.planT = 10;
    this.fired = false;       // one-shot button already pressed this plan
    this.chainFired = false;
    this.cornerDefends = 0;   // consecutive defensive plans while pinned
  }

  update() {
    const p = emptyPad();
    const f = this.f, o = this.opp, d = this.d;
    if (f.dead || o.dead) return p;

    const dist = Math.abs(o.x - f.x);
    const toward = o.x >= f.x ? 1 : -1;

    // --- combo follow-up: ride the FULL chain, one press per NEW hit -----
    // 旧逻辑每套只追 1 下(chainFired 布尔) -> AI 只打 2hit、伤害低、被格挡后随手反打就赢。
    // 现在每次"新命中"(move 对象变了)都续下一段, 打满 J-J-K-K 击倒 / 接必杀(Eric: 更善进攻)。
    if (f.state === 'attack' && f.move && f.move.contact) {
      const step = this.chainStep || 0;
      if (this.chainMove !== f.move && step < 3 && Math.random() < d.comboFollow) {
        this.chainMove = f.move;             // 本次命中的续招已排, 不重复按
        this.chainStep = step + 1;
        // 被防住(contact 但没真命中): 超必绝不砸进格挡里(白给); 三成止损收手降低被反打。
        // 鬼级读表: 对手护条已高 -> 绝不收手, 压满这套就破防
        const blocked = !f.move.hitLanded;
        if (blocked && Math.random() < (d.punishBlock && o.guard > 55 ? 0 : 0.3)) return p;
        const cur = f.move.def.kind;
        if (!blocked && f.superReady() && step >= 1 && Math.random() < d.superUse) p.super = true;
        else if (cur === 'light') { if (Math.random() < 0.4) p.light = true; else p.heavy = true; } // J→J→K
        else if (cur === 'heavy') {                        // K→K 回升斩(击倒), 或 mack 接必杀
          if (Math.random() < 0.7) p.heavy = true;
          else if (aiKit(f).meleeSpecial && f.specialReady()) p.special = true;
        }
      }
      return p;
    }
    if (f.state !== 'attack') { this.chainStep = 0; this.chainMove = null; }

    // busy states: nothing to decide
    if (f.busy() && f.state !== 'walk') return p;

    // --- threat reactions (checked every tick, gated by chance) ----------
    const cornered = toward > 0 ? f.x <= STAGE.left + 14 : f.x >= STAGE.right - 14;
    if (!cornered) this.cornerDefends = 0;

    // 乱拳流画像 v2: 只看连锁会漏掉空挥(连锁要 contact, 走近乱砍阶段检测不到,
    // 实测 gate 全部失效) —— 直接量出招频率: 每个新招 +1, 每 30tick 衰减 30%。
    // 稳态: 每 25tick 一刀 ≈ 4.0, 正常试探节奏 ≈ 1.7, 阈值 2.8 分割。
    // 依据: 乱拳串是无缝 blockstring 且一套 JJKK 削护 113>100 —— "挡"喂破防、
    // "冲进去惩罚"撞下一刀, 正解是闪/跳/无敌超必拆招
    if (o.move && this._oPrevMove !== o.move) this.oPace = (this.oPace || 0) + 1;
    this._oPrevMove = o.move;
    if (this.world.tick % 30 === 0) this.oPace = (this.oPace || 0) * 0.7;
    if (o.move && o.move.chained && this._oPrevChain !== o.move) { this.oChains = (this.oChains || 0) + 1; this._oPrevChain = o.move; }
    if (this.world.tick % 60 === 0 && (this.oChains || 0) > 0) this.oChains--;
    this.isMasher = (d.punishBlock || 0) > 0 && ((this.oPace || 0) >= 2.8 || (this.oChains || 0) >= 3);

    // ---- M1 公平化: 读指令层已删除(原 cheatRead 同帧读键 + readP 0.92 +
    // SNK式气槽回充 + 镖CD加速)。高难强度改由下方「可见前摇反应」承担:
    // 看到对手进入攻击前摇后, 经 d.reactMin~reactMax 帧的反应延迟才决策。
    // 贴身计时是合法的距离观察, 保留(不再附带资源作弊)。
    if (aiKit(this.f).projSpecial) {
      this.closeT = dist < 185 ? (this.closeT || 0) + 1 : 0;
    }

    // enemy attack winding up close by -> block or dodge — but a pinned AI
    // must not turtle forever: after two defensive plans in the corner it
    // forces an escape (leap over the attacker or swing back)
    // M1: 人类式反应 —— 首见该次挥击时采样 reactMin~reactMax 帧延迟, 到点才允许防反
    if (o.state === 'attack' && o.move && !o.move.def.air) {
      if (this._threatMove !== o.move) {
        this._threatMove = o.move;
        this._threatT = Math.round(d.reactMin + Math.random() * (d.reactMax - d.reactMin));
      }
      if (this._threatT > 0) this._threatT--;
    } else { this._threatMove = null; }
    if (o.state === 'attack' && o.move && this._threatMove === o.move && this._threatT <= 0 &&
        o.move.t <= o.move.def.startup + o.move.def.active + 4 && dist < 300 && f.grounded) {
      const r = Math.random();
      const guardHigh = f.guard >= (d.punishBlock ? 45 : 65); // hard 提前止损(挡满一套必破防)
      const masher = this.isMasher;
      const dodgeP = masher ? 0.75 : d.dodgeChance; // 对乱拳流闪避优先
      if (cornered && this.cornerDefends >= 2) {
        this.cornerDefends = 0;
        if (Math.random() < 0.55) this.setPlan('jumpIn', 40);
        else this.setPlan(Math.random() < 0.5 ? 'attackL' : 'attackH', 12);
      } else if ((r < dodgeP || (guardHigh && r < dodgeP + d.blockChance)) &&
                 f.backdashCd <= 0 && !cornered) {
        this.setPlan('backdash', 6);
      } else if (r < dodgeP + d.blockChance && !guardHigh && this.plan !== 'block') {
        // (曾试过"后撤冷却时跳出乱拳串" —— 贴脸起跳上升段就在对面刀框高度里,
        //  实测跳跃中挨打 40+ 次成第一死因, 已删; 近身只信后撤 i-frame 和格挡)
        // don't re-arm an existing block plan every tick — planT must run
        // down so think() (and its corner-escape branch) gets a turn
        this.setPlan('block', (o.move.def.total || 40) - o.move.t + 6);
        if (cornered) this.cornerDefends++;
      }
    }
    // 对手放大招 -> 高概率架起来(Eric: 我放必杀它也有概率防掉); block 执行会随传送翻转朝向
    if (o.state === 'attack' && o.move && o.move.def.kind === 'super' &&
        dist < 340 && f.grounded && !f.busy() && Math.random() < d.blockChance) {
      this.setPlan('block', 48);
    }
    // opponent jumping in -> crouching rising slash (anti-air)
    if (!o.grounded && o.y < STAGE.ground - 40 && dist < 230 && f.grounded &&
        Math.random() < d.aggression * 0.2) { // 反空近乎必中(Eric: 最高难度)
      this.setPlan('antiair', 12);
    }
    // 惩罚落空: 对手攻击已过判定且没打中(你 whiff 了)、就在近处 -> 瞬移冲进反打(Eric: 更善进攻)。
    // 乱拳流除外: 他每 4tick 一刀, whiff 是饵, 冲进去正好撞下一刀(解剖: 60% 挨打死在冲刺路上)
    if (o.state === 'attack' && o.move && !o.move.contact &&
        o.move.t > o.move.def.startup + (o.move.def.active || 3) &&
        dist < 300 && f.grounded && !f.busy() && f.backdashCd >= 0 &&
        !this.isMasher &&
        Math.random() < d.aggression * 0.7) {
      this.setPlan('dashIn', 12);
    }
    // 读冲刺: 对手正朝我冲进近距 -> 抢先迎击/格挡(专治玩家用前冲进场; 困难更常触发)
    if (o.state === 'dash' && o.vx !== 0 && Math.sign(o.vx) === Math.sign(f.x - o.x) &&
        dist < 215 && f.grounded && !f.busy() && Math.random() < d.aggression * 0.7) {
      this.setPlan(Math.random() < 0.45 ? 'attackL' : 'block', 10);
    }
    // 惩罚收招硬直(hard): 对方招式已 contact(被我防住/打空)进入收招且够得着
    // -> 立刻轻击起手反打, comboFollow 会自动连完整套+接超必。这是人类"防住就反杀"
    // 节奏的镜像 —— 没有它, 玩家的连招起手对 AI 是零风险的
    if ((d.punishBlock || 0) > 0 && o.state === 'attack' && o.move && o.move.contact &&
        o.move.t > o.move.def.startup + (o.move.def.active || 3) + 2 &&
        f.grounded && !f.busy() && Math.random() < d.punishBlock) {
      // 游击手(hard 隼人): 对手硬直是最安全的脱身窗口 —— 一半用来跑(重开镖局),
      // 一半用来反打。被贴身压制时 think() 层根本轮不到执行(计划槽被读键反应
      // 刷满), 所以"过近就拉开"必须挂在这个反应钩子上(Eric 2026-07-11)
      if (aiKit(f).projSpecial && d.punishBlock && dist < 230 &&
          ((this.closeT || 0) > 90 || Math.random() < (f.specialReady() ? 0.5 : 0.25))) {
        this.closeT = 0;
        if (f.backdashCd <= 0 && !cornered) this.setPlan('backdash', 6);
        else this.setPlan('jumpAway', 30);
      }
      // 反打距离按自己手长来(隼人比剣二短 25px, 用统一 210 会 whiff 送人头)
      else if (dist < (aiKit(f).longArm ? 205 : 180)) this.setPlan('attackL', 8);
      else if (dist < 330 && !this.isMasher) this.setPlan('dashIn', 10); // 乱拳局不冲
    }
    // 追后撤(hard): 对手 backdash 拉开 -> 立即冲刺贴上, 落在他后撤收招硬直上
    if ((d.chase || 0) > 0 && o.state === 'backdash' && f.grounded && !f.busy() &&
        dist < 340 && Math.random() < d.chase) {
      this.setPlan('dashIn', 12);
    }
    // 起身防御(hard): 自己刚起身、对方贴脸压制(meaty) -> 先架住
    if (f.state === 'getup') this.wakeGuard = 14;
    else if ((this.wakeGuard || 0) > 0) {
      this.wakeGuard--;
      if ((d.punishBlock || 0) > 0 && o.state === 'attack' && o.move && dist < 240 &&
          f.grounded && !f.busy() && Math.random() < d.blockChance) {
        this.setPlan('block', 12);
      }
    }
    // 反压制超必(hard): 被贴脸压制且有气 -> 无敌帧超必拆招(mack invuln 16 /
    // kenji 瞬身), 引擎里唯一能"从防守翻盘"的选项, 专打乱拳串。
    // 不等护条磨高(等到 32 时离破防只差一套) —— 对攻击中的敌人有气就敢放
    this.revCd = Math.max(0, (this.revCd || 0) - 1);
    if ((d.pressureSuper || 0) > 0 && this.revCd <= 0 && f.superReady() && f.grounded &&
        !f.busy() && (f.guard > 8 || this.isMasher) && dist < 240 && o.state === 'attack') {
      if (Math.random() < d.pressureSuper + 0.15) this.setPlan('super', 4);
      this.revCd = 16;
    }
    // 抓浮空(hard): 对手被挑空/击飞还在空中 -> 接超必(与人类同一套 cK→I 浮空连段)。
    // 必须先算"落地还剩几 tick"再出手 —— 隼人超必前摇 16, 盲按大概率放空白给
    // (实测教训: 不算落地时间时 hard-隼人 1:6 输给 normal)
    if ((d.superJuggle || 0) > 0 && o.state === 'hit' && !o.grounded && f.grounded &&
        !f.busy() && f.superReady() && dist < 330 && Math.random() < d.superJuggle) {
      const h = Math.max(0, STAGE.ground - o.y);
      const tLand = (-o.vy + Math.sqrt(o.vy * o.vy + 3.2 * h)) / 0.8; // 0.8=重力
      if (tLand > f.c.moves.super.startup + 5) this.setPlan('super', 4);
    }
    // ---- 隼人专属打法(2026-07-11 Eric: AI 得会用我们给隼人加的新玩法) --------
    if (aiKit(f).airProj && f.grounded && !f.busy()) {
      // 飞镖命中确认: 对手在硬直而我们离得远(≥220 说明不是近战打的, 是镖) ->
      // 有气接瞬身超必(hitstun 26 足够 teleport 前摇 16), 没气就冲进去补刀
      if (o.hitstun > 8 && dist > 220) {
        if (f.superReady() && o.hitstun > 16 && Math.random() < d.superUse * (d.punishBlock ? 0.85 : 0.55)) {
          this.setPlan('super', 4);
        } else if (Math.random() < d.aggression * (d.punishBlock ? 0.8 : 0.55)) {
          this.setPlan('dashIn', 14); // 贱贱补一刀(dashIn 贴近自动出招)
        }
      }
      // 空中被镖点到的敌人(浮空 hit) -> 冲过去补刀(飞行道具不占浮空配额)
      else if (o.state === 'hit' && !o.grounded && dist > 200 &&
               Math.random() < d.aggression * (d.punishBlock ? 0.75 : 0.5)) {
        this.setPlan('dashIn', 14);
      }
    }
    // incoming projectile -> jump or block
    for (const pr of this.world.projectiles) {
      if (pr.owner !== f && Math.abs(pr.x - f.x) < 250 && Math.sign(pr.vx) === Math.sign(f.x - pr.x)) {
        const r = Math.random();
        if (r < 0.5) this.setPlan('jump', 8);
        else if (r < 0.5 + d.blockChance) this.setPlan('block', 30);
        break;
      }
    }

    // self-healing guardrail: no plan may persist beyond 90 ticks, no matter
    // what keeps re-arming it — guarantees the AI can never truly stall
    this.planAge = (this.planAge || 0) + 1;
    if (--this.planT <= 0 || this.planAge > 90) this.think(dist, toward);

    return this.execute(p, f, o, d, dist, toward);
  }

  // (M1) cheatRead 方法已整体移除 —— AI 不再读取对手输入设备状态

  // --- execute current plan ---------------------------------------------------
  execute(p, f, o, d, dist, toward) {
    switch (this.plan) {
      case 'approach': if (toward > 0) p.right = true; else p.left = true; break;
      case 'retreat': if (toward > 0) p.left = true; else p.right = true; break;
      case 'dashIn':
        if (!this.fired) { this.fired = true; if (toward > 0) p.dashR = true; else p.dashL = true; }
        // 瞬移贴身即出招(dash-cancel): kenji 的 dash+J = dashslash 突进斩(Eric: 擅用 AA/DD)
        else if (f.state === 'dash' && f.dashT > 5 && dist < (aiKit(f).longArm ? 180 : 165)) {
          if (Math.random() < 0.55) p.light = true; else p.heavy = true;
        }
        break;
      case 'backdash':
        if (!this.fired) { this.fired = true; if (toward > 0) p.dashL = true; else p.dashR = true; }
        break;
      case 'jump': if (!this.fired) { this.fired = true; p.jump = true; } break;
      case 'jumpAway': // 后跳脱身(hard 隼人): 向后跃出, 下落段距离拉开后甩空镖封追击
        if (!this.fired) { this.fired = true; p.jump = true; }
        if (toward > 0) p.left = true; else p.right = true;
        if (!f.grounded && f.vy > -7 && dist > 170 && f.specialReady() && Math.random() < 0.5) {
          p.special = true;
        }
        break;
      case 'jumpIn':
        if (!this.fired) { this.fired = true; p.jump = true; }
        if (toward > 0) p.right = true; else p.left = true;
        if (!f.grounded && dist < 200 && Math.abs(o.y - f.y) < 200) {
          if (Math.random() < 0.35) p.heavy = true; // dive slam
          else p.light = true;
        } else if (aiKit(f).airProj && !f.grounded && dist >= 200 && f.vy > -6 &&
                   f.specialReady() && Math.random() < 0.3) {
          p.special = true; // 空中手裏剣: 跳入途中距离还远 -> 直线空镖压制
        }
        break;
      case 'attackL': case 'attackH':
        if (!this.fired) {
          // 挥刀纪律(hard): 对方已在前摇/判定中, 此刻按键=对拼送头 -> 改为架住,
          // 防住后 punishBlock 反应会接管反打。没有这一条, aggression 0.99 让
          // blockChance 0.98 永远兑现不了(一直 busy 在挥刀, 威胁反应轮不到执行)。
          // 反龟阀门: 连续两次转防后强制出手 —— 乱拳流永远在出招, 无阀门时纪律
          // 会让 AI 变成纯龟壳被磨破防(实测 0:27 血洗的首恶)
          if ((d.punishBlock || 0) > 0 && o.state === 'attack' && o.move &&
              o.move.t < o.move.def.startup + (o.move.def.active || 3) && dist < 260 &&
              (this.swingBlocks || 0) < 2) {
            this.swingBlocks = (this.swingBlocks || 0) + 1;
            this.setPlan('block', 14);
            if (toward > 0) p.left = true; else p.right = true;
            break;
          }
          this.swingBlocks = 0;
          this.fired = true;
          if (this.plan === 'attackL') p.light = true; else p.heavy = true;
        }
        break;
      case 'special': if (!this.fired) { this.fired = true; p.special = true; } break;
      case 'super': if (!this.fired) { this.fired = true; p.super = true; } break;
      case 'block': if (toward > 0) p.left = true; else p.right = true; break; // hold away = directional guard
      case 'antiair':
        p.crouch = true;
        if (!this.fired) { this.fired = true; p.heavy = true; }
        break;
      case 'idle': default: break;
    }
    return p;
  }

  setPlan(plan, ticks) {
    this.plan = plan;
    // clamp: a NaN or huge duration would freeze the AI forever
    this.planT = Number.isFinite(ticks) ? Math.min(70, Math.max(2, ticks)) : 20;
    this.planAge = 0;
    this.fired = false;
  }

  think(dist, toward) {
    const f = this.f, o = this.opp, d = this.d;
    const react = () => d.reactMin + Math.random() * (d.reactMax - d.reactMin);
    const r = Math.random();

    // back to the wall: retreating/turtling just walks into the clamp and
    // looks frozen — fight or escape instead
    const cornered = toward > 0 ? f.x <= STAGE.left + 14 : f.x >= STAGE.right - 14;
    if (cornered && dist < 300 && !['down', 'getup'].includes(o.state)) {
      if (r < 0.4) this.setPlan(Math.random() < 0.6 ? 'attackL' : 'attackH', react());
      else if (r < 0.62) this.setPlan('jumpIn', 40);          // leap over to escape
      else if (r < 0.78) this.setPlan(this.isMasher ? 'jumpIn' : 'dashIn', this.isMasher ? 40 : 10); // 乱拳局跳出去不冲
      else if (f.superReady() && r < 0.9) this.setPlan('super', 6);
      else this.setPlan(Math.random() < 0.5 ? 'attackL' : 'jumpIn', react());
      return;
    }

    // opponent knocked down: hard 压起身(贴到间合, 起身收尾瞬间 meaty —— 攻击对
    // getup 无敌帧无效, 必须掐 stateT 让 active 帧正落在起身后第一帧); 其余难度退避
    if (o.state === 'down' || o.state === 'getup') {
      if (Math.random() < (d.okizeme || 0)) {
        if (dist > 165) this.setPlan('approach', 5);
        else if (o.state === 'getup' && o.stateT <= 11) {
          // 轻击为主: 被防也基本安全; 重击 meaty 三成(伤害/削护上限)
          this.setPlan(Math.random() < 0.3 ? 'attackH' : 'attackL', 8);
        } else this.setPlan('idle', 3); // 已就位: 短平快重估, 等起身窗口
      } else if (dist < 170 && !cornered) this.setPlan('retreat', react() + 8);
      else this.setPlan('idle', react());
      return;
    }

    // 鬼级(cheatRead)进攻纪律: 只在"保证安全"的窗口出手 —— 对手硬直/收招中
    // 才攻击, 其余时间保持自由身。读指令需要 free 才能反应; 之前 aggression 1.0
    // 让它永远在挥刀, 读入形同虚设(解剖: blocks=0, 死因全是冲刺/跳/挥刀被反)
    if (d.punishBlock) {
      // "安全窗口"必须排除已 contact 的招 —— 命中/被防的招能连锁取消, 冲进去
      // 撞的是取消窗不是硬直; 只有挥空的收招(无法取消)和硬直才是真窗口
      const oCommitted = o.hitstun > 0 || o.blockstun > 0 ||
        (o.move && !o.move.contact && o.move.t > o.move.def.startup + (o.move.def.active || 3));
      if (f.superReady() && dist < 340 && o.hitstun > 6) {
        this.setPlan('super', 6); return;
      }
      const cheatRange = dist < (aiKit(f).longArm ? 175 : 150);
      if (cheatRange) {
        if (oCommitted) {
          this.calm = 0;
          // 游击手: 对手硬直=最安全的脱身窗口。镖在手 55%(贴身超时必) 撤出重开
          // 镖局, 后撤在冷却就后跳(下落甩空镖封追击), 只有剩下的概率才换近身连段
          if (aiKit(f).projSpecial &&
              ((this.closeT || 0) > 90 || Math.random() < (f.specialReady() ? 0.55 : 0.3))) {
            this.closeT = 0;
            if (f.backdashCd <= 0 && !cornered) this.setPlan('backdash', 6);
            else this.setPlan('jumpAway', 30);
            return;
          }
          const roll = Math.random();
          if (roll < (d.launcher || 0) && o.grounded) this.setPlan('antiair', 12);
          else this.setPlan(roll < 0.7 ? 'attackL' : 'attackH', 4);
        } else if (aiKit(f).projSpecial && !cornered && Math.random() < 0.6) {
          // 游击手(Eric 2026-07-11): 近身占不到便宜就撤出, 重开距离回到镖局
          this.closeT = 0;
          if (f.backdashCd <= 0) this.setPlan('backdash', 6);
          else this.setPlan('jumpAway', 30);
        } else {
          // 冷场阀门: 双读指令 AI 会互等对方先出手(镜像实测僵持 3500+ tick)。
          // 连续几拍无事发生就强制开火; 人类对手常按键, calm 基本攒不起来
          this.calm = (this.calm || 0) + 1;
          if (this.calm > 5 && o.state !== 'attack') {
            this.calm = 0;
            this.setPlan(Math.random() < 0.6 ? 'attackL' : 'antiair', 6);
          } else this.setPlan('idle', 3); // 蓄势: 读入负责防御与反打的触发
        }
        return;
      }
      // 隼人(hard)=远近交替的游击手(Eric 2026-07-11): 镖好了找距离丢、镖冷却就
      // 放风筝(走速 4.3 徒步拉开, 剣二 3.0 追不上, 逼他冲刺撞读冲刺反应)、
      // 确认命中/对手硬直才冲进去收割 —— 中远距离绝不无脑贴脸
      const nearWall = toward > 0 ? f.x <= STAGE.left + 80 : f.x >= STAGE.right - 80;
      if (aiKit(f).projSpecial && dist < 330) {
        if (f.specialReady() && o.grounded && o.state !== 'attack' && Math.random() < 0.75) {
          this.setPlan('special', 6); return;
        }
        if (oCommitted && Math.random() < 0.8) { this.setPlan('dashIn', 10); return; }
        if (!f.specialReady() && !nearWall && o.state !== 'attack' && Math.random() < 0.65) {
          this.setPlan('retreat', 10); return; // 镖在冷却: 拉开等下一发
        }
        this.setPlan(o.state !== 'attack' && Math.random() < 0.35 ? 'approach' : 'idle', 5);
        return;
      }
      if (dist < 330) {
        if (oCommitted && Math.random() < 0.8) this.setPlan('dashIn', 10);
        else if (o.state !== 'attack') this.setPlan('approach', 5);
        else this.setPlan('idle', 4);
        return;
      }
      if (aiKit(this.f).projSpecial) {
        if (f.specialReady() && r < 0.8) { this.setPlan('special', 6); return; }
        this.setPlan(Math.random() < 0.4 ? 'approach' : 'idle', 8); // 远距守株: 让他自己走进镖程
        return;
      }
      this.setPlan('approach', 6);
      return;
    }

    // super when it will connect
    if (f.superReady() && r < d.superUse && dist < 380 && o.state !== 'block') {
      this.setPlan('super', 6);
      return;
    }

    const inRange = dist < (aiKit(f).longArm ? 175 : 150);

    if (inRange) {
      // 乱拳局(hard)近身: 后撤(带 i-frame)是唯一安全位移 —— 拉开距离重置节奏。
      // 鬼级不退: 读指令逐键化解, 正面压
      if (this.isMasher && !d.punishBlock && f.backdashCd <= 0 && Math.random() < 0.35) {
        this.setPlan('backdash', 6);
        return;
      }
      // 逗引(hard): 偶尔半步后撤钓对方出招落空, 落空惩罚反应会自动收割
      if (Math.random() < (d.bait || 0)) { this.setPlan('retreat', 9); return; }
      if (r < d.aggression) {
        const roll = Math.random();
        // 主动挑空起手(hard): 蹲重打上天接浮空超必 —— 仅贴脸且对方非出招中
        // (蹲重 noChain 被防-2/-4, 距离远或对方正在挥刀时起手就是送)
        const inPointBlank = dist < (aiKit(f).longArm ? 150 : 128);
        if (roll < (d.launcher || 0) && o.grounded && o.state !== 'attack' && inPointBlank) {
          this.setPlan('antiair', 12);
        } else this.setPlan(roll < 0.62 + (d.launcher || 0) ? 'attackL' : 'attackH', react());
      } else if (r < d.aggression + 0.15) {
        this.setPlan('backdash', 8);
      } else if (r < d.aggression + 0.15 + d.blockChance * 0.4 && f.guard < 65) {
        this.setPlan('block', 26);
      } else {
        this.setPlan('retreat', react());
      }
      return;
    }

    // 乱拳局(hard)中远距离: 不再往刀山里冲 —— 隼人飞镖 zoning / 跳入砸头 /
    // 站在间合边缘让威胁反应工作(他走进来挥空, 由闪避+反压制超必收割)
    const masherFar = this.isMasher && !d.punishBlock; // 鬼级不守株待兔, 正面压
    if (masherFar && dist < 330) {
      if (aiKit(f).projSpecial && f.specialReady() && r < 0.5) this.setPlan('special', 6);
      else if (dist > 230 && r < 0.6) this.setPlan('jumpIn', 40); // 只从远处起跳(近跳=上升段挨刀)
      else this.setPlan('idle', 10); // 守株待兔: 反应层负责闪/防/拆
      return;
    }

    if (dist < 330) { // mid range
      if (aiKit(f).meleeSpecial && f.specialReady() && r < 0.3) this.setPlan('special', 6);
      // 隼人中距离 zoning: 对手非出招中就丢镖(命中确认反应会接管后续追打/超必)
      else if (aiKit(f).projSpecial && f.specialReady() && o.state !== 'attack' && r < 0.35) this.setPlan('special', 6);
      else if (r < d.jumpiness) this.setPlan('jumpIn', 40);
      else if (r < d.aggression) this.setPlan(Math.random() < 0.7 ? 'dashIn' : 'approach', react() + 8); // 多用冲刺瞬移(Eric)
      // 少原地站桩(Eric: 会移动) — 大多数时候仍向前压
      else this.setPlan(Math.random() < 0.82 ? 'approach' : 'idle', react());
      return;
    }

    // far range —— 多靠冲刺瞬移拉近(Eric: 擅用 AA/DD), 少走路
    if (aiKit(f).projSpecial && f.specialReady() && r < (masherFar ? 0.75 : 0.4)) this.setPlan('special', 6);
    else if (!masherFar && r < 0.6) this.setPlan('dashIn', 12);
    else this.setPlan('approach', react() + 10);
  }
}
