// Bosses: spawning, attack patterns with honest telegraphs, rage at 50%,
// the three-phase final boss, and boss hazards (shots, acid globs, pools).
//
// Attacks: charge | radial | spiral | spawn | slam | cone | teleport | pools.
// Every attack has a windup during which its danger zone is drawn (render.js).

const BOSS_RISE = 1.8;
const BOSS_SHOT_SPEED = 230;

const Bosses = {
  shots: [],
  globs: [],
  pools: [],

  reset() {
    this.shots.length = 0;
    this.globs.length = 0;
    this.pools.length = 0;
  },

  spawn(game, id, x, y) {
    const src = BOSSES[id];
    const def = Object.assign({}, src, { behavior: 'boss', xp: 30, coin: 1 });
    const z = {
      type: 'boss', id, boss: true, def, x, y,
      r: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      damage: def.damage,
      dmgMul: 1,
      mass: 30,
      state: 'rising',
      riseT: 0,
      riseDur: BOSS_RISE,
      flash: 0,
      kx: 0, ky: 0,
      burn: null,
      haste: 0,
      slow: 0,
      slowMul: 1,
      facing: Math.atan2(game.hero.y - y, game.hero.x - x),
      walk: 0,
      side: 1,
      mode: 'run',
      fuse: -1,
      timer: 1.6,          // until the first attack
      atk: null,
      last: null,
      rage: false,
      phase: 0,
      phases: def.phases || 1,
      contactCd: 0,
      air: 0,
      alpha: 1,
      say: { text: def.phrase, t: 4 },
    };
    game.zombies.push(z);
    game.boss = z;
    game.banner(def.name, '#ff5a4a', 3.4, `«${def.phrase}»`, true);
    Fx.burst(x, y, 30, { speed: 220, life: 0.9, size: 6, color: ['#3b2f22', '#4a3a28', '#2a2118'], kind: 'dirt' });
    Render.crack(x, y, z.r * 1.6);
    Fx.addShake(10);
    if (def.darkness) game.darknessTarget = def.darkness[0];
    return z;
  },

  attacks(z) {
    return z.phases > 1 ? z.def.phaseAttacks[z.phase] : z.def.attacks;
  },

  // ---------- Per-frame ----------

  update(game, z, dt) {
    const h = game.hero;
    z.flash = Math.max(0, z.flash - dt);
    z.slow = Math.max(0, z.slow - dt);
    z.contactCd = Math.max(0, z.contactCd - dt);
    if (z.say.t > 0) z.say.t -= dt;

    if (z.state === 'phasing') {
      // Between final-boss phases: untouchable, pulsing.
      z.phaseT -= dt;
      z.alpha = 0.5 + Math.sin(game.time * 20) * 0.3;
      if (z.phaseT <= 0) {
        z.state = 'alive';
        z.alpha = 1;
      }
      return;
    }

    if (z.burn) {
      z.burn.t -= dt;
      z.burn.acc += z.burn.dps * dt;
      if (z.burn.acc >= 6) {
        const a = z.burn.acc;
        z.burn.acc = 0;
        game.damageZombie(z, a, { kind: 'burn' });
      }
      if (z.burn && z.burn.t <= 0) z.burn = null;
      if (z.state !== 'alive' && z.state !== 'hidden') return;
    }

    if (!z.rage && z.phases === 1 && z.hp <= z.maxHp * 0.5) this.enrage(game, z, z.def.ragePhrase);

    const dx = h.x - z.x, dy = h.y - z.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (z.atk) {
      this.updateAttack(game, z, dt);
    } else {
      const sp = z.speed * (z.rage ? 1.3 : 1) * (z.slow > 0 ? z.slowMul : 1);
      if (dist > z.r + 90) {
        z.x += dx / dist * sp * dt;
        z.y += dy / dist * sp * dt;
        z.walk += dt * sp / 30;
      }
      z.facing = Math.atan2(dy, dx);
      z.timer -= dt;
      if (z.timer <= 0) this.startAttack(game, z);
    }

    z.x += z.kx * dt;
    z.y += z.ky * dt;
    const k = Math.exp(-8 * dt);
    z.kx *= k;
    z.ky *= k;
    if (z.state === 'alive' && !(z.atk && z.atk.type === 'slam' && z.atk.stage === 'windup')) game.collideCircle(z);

    // Touching the boss hurts.
    if (z.state === 'alive' && z.air < 5 && Math.hypot(h.x - z.x, h.y - z.y) < z.r + h.r + 2 && z.contactCd <= 0) {
      z.contactCd = 1;
      game.hurtHero(Math.round(z.damage * 0.6), z);
    }
  },

  enrage(game, z, phrase) {
    z.rage = true;
    z.say = { text: phrase, t: 3 };
    game.banner('ЯРОСТЬ!', '#ff3a2a', 2.2, `«${phrase}»`, true);
    Fx.ring(z.x, z.y, 160, '#ff3a2a', 0.6, 8);
    Fx.addShake(8);
  },

  // ---------- Attacks ----------

  startAttack(game, z) {
    const list = this.attacks(z);
    let type = list[Math.floor(Math.random() * list.length)];
    if (type === z.last && list.length > 1) type = list[(list.indexOf(type) + 1) % list.length];
    z.last = type;

    const h = game.hero;
    const wm = z.rage ? 0.8 : 1;
    const toHero = Math.atan2(h.y - z.y, h.x - z.x);
    const atk = { type, stage: 'windup' };
    let windup = 0.8;

    switch (type) {
      case 'charge':
        windup = 0.95 * wm;
        atk.a = toHero;
        atk.len = this.laneLength(game, z, atk.a, z.rage ? 760 : 620);
        atk.width = z.r * 2;
        break;
      case 'radial':
        windup = 0.75 * wm;
        atk.count = z.rage ? 24 : 16;
        atk.a0 = Math.random() * Math.PI * 2;
        break;
      case 'spiral':
        windup = 0.6 * wm;
        atk.arms = z.rage ? 3 : 2;
        atk.dir = Math.random() < 0.5 ? 1 : -1;
        atk.a0 = toHero;
        break;
      case 'spawn': {
        windup = 1.0 * wm;
        atk.points = [];
        const n = z.rage ? 5 : 3;
        for (let i = 0; i < 20 && atk.points.length < n; i++) {
          const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 140;
          const x = z.x + Math.cos(a) * d, y = z.y + Math.sin(a) * d;
          if (!game.outsideArena(x - 20, y - 20) && !game.outsideArena(x + 20, y + 20) && !game.obstacleAt(x, y)) atk.points.push({ x, y });
        }
        break;
      }
      case 'slam': {
        windup = 1.05 * wm;
        const pad = BORDER + z.r;
        atk.fx = z.x; atk.fy = z.y;
        atk.tx = Math.max(pad, Math.min(game.arena.w - pad, h.x));
        atk.ty = Math.max(pad, Math.min(game.arena.h - pad, h.y));
        atk.radius = z.rage ? 150 : 125;
        break;
      }
      case 'cone':
        windup = 0.85 * wm;
        atk.a = toHero;
        atk.half = z.rage ? 0.62 : 0.5;
        atk.len = 330;
        break;
      case 'teleport': {
        windup = 0.55;
        const p = this.teleportPoint(game, z);
        atk.tx = p.x; atk.ty = p.y;
        break;
      }
      case 'pools': {
        windup = 0.65 * wm;
        const n = z.rage ? 6 : 4;
        atk.targets = [{ x: h.x, y: h.y }];
        for (let i = 1; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 150;
          atk.targets.push({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d });
        }
        break;
      }
    }

    atk.t = atk.total = windup;
    z.atk = atk;
  },

  updateAttack(game, z, dt) {
    const atk = z.atk;
    const h = game.hero;
    atk.t -= dt;

    if (atk.stage === 'windup') {
      if (atk.type === 'slam') {
        // Airborne arc to the marked landing spot.
        const k = 1 - Math.max(0, atk.t) / atk.total;
        const e = k * k * (3 - 2 * k);
        z.x = atk.fx + (atk.tx - atk.fx) * e;
        z.y = atk.fy + (atk.ty - atk.fy) * e;
        z.air = Math.sin(Math.PI * k) * 90;
      } else if (atk.type === 'teleport') {
        z.alpha = Math.max(0, atk.t / atk.total);
      } else if (atk.type !== 'charge') {
        z.facing = Math.atan2(h.y - z.y, h.x - z.x);
      }
      if (atk.type === 'charge' || atk.type === 'cone') z.facing = atk.a;
      if (atk.t > 0) return;
      this.release(game, z, atk);
      return;
    }

    if (atk.stage === 'dash') {
      const step = (z.rage ? 900 : 760) * dt;
      atk.done += step;
      z.x += Math.cos(atk.a) * step;
      z.y += Math.sin(atk.a) * step;
      z.walk += dt * 20;
      if (!atk.hit && Math.hypot(h.x - z.x, h.y - z.y) < z.r + h.r + 4) {
        atk.hit = true;
        game.hurtHero(Math.round(z.damage * 1.2), z);
        const a = atk.a;
        h.x += Math.cos(a) * 30 - Math.sin(a) * 20;
        h.y += Math.sin(a) * 30 + Math.cos(a) * 20;
        game.collideCircle(h);
      }
      if (Math.random() < 0.6) Fx.particle(z.x, z.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.5, 6, '#3b2f22', 'dirt');
      const px = z.x, py = z.y;
      game.collideCircle(z);
      const blocked = Math.hypot(z.x - px, z.y - py) > 1;
      if (blocked || atk.done >= atk.len) {
        if (blocked) {
          Fx.addShake(9);
          Fx.burst(z.x + Math.cos(atk.a) * z.r, z.y + Math.sin(atk.a) * z.r, 14, { speed: 260, life: 0.5, size: 4, color: ['#8a7a6a', '#5a4a3a'], kind: 'dirt' });
        }
        this.recover(z, blocked ? 1.0 : 0.6);
      }
      return;
    }

    if (atk.stage === 'spiral') {
      atk.emit -= dt;
      while (atk.emit <= 0) {
        atk.emit += z.rage ? 0.075 : 0.095;
        for (let i = 0; i < atk.arms; i++) {
          this.shoot(z, atk.a0 + i * Math.PI * 2 / atk.arms, 200, '#d66bff');
        }
        atk.a0 += 0.3 * atk.dir;
      }
      if (atk.t <= 0) this.recover(z, 0.5);
      return;
    }

    if (atk.stage === 'gone') {
      if (atk.t <= 0) {
        z.x = atk.tx;
        z.y = atk.ty;
        z.state = 'alive';
        z.alpha = 1;
        game.collideCircle(z);
        Fx.ring(z.x, z.y, 90, '#c46bff', 0.4, 6);
        const n = z.rage ? 14 : 10;
        for (let i = 0; i < n; i++) this.shoot(z, i / n * Math.PI * 2, BOSS_SHOT_SPEED * 0.85, '#c46bff');
        this.recover(z, 0.45);
      }
      return;
    }

    if (atk.stage === 'recover' && atk.t <= 0) {
      z.atk = null;
      const fast = z.phases > 1 && z.phase === 2;
      z.timer = (fast ? 0.8 : z.rage ? 1.1 : 1.7) + Math.random() * 0.6;
    }
  },

  // Windup over: the attack happens.
  release(game, z, atk) {
    const h = game.hero;
    switch (atk.type) {
      case 'charge':
        atk.stage = 'dash';
        atk.done = 0;
        atk.t = 5;
        z.say.t = Math.min(z.say.t, 0);
        break;
      case 'radial':
        for (let i = 0; i < atk.count; i++) this.shoot(z, atk.a0 + i / atk.count * Math.PI * 2, BOSS_SHOT_SPEED, '#ff6a4a');
        if (z.rage) {
          // Second ring offset by half a step, slightly slower.
          for (let i = 0; i < atk.count; i++) this.shoot(z, atk.a0 + (i + 0.5) / atk.count * Math.PI * 2, BOSS_SHOT_SPEED * 0.7, '#ff9a4a');
        }
        Fx.ring(z.x, z.y, z.r + 40, '#ff6a4a', 0.3, 5);
        this.recover(z, 0.5);
        break;
      case 'spiral':
        atk.stage = 'spiral';
        atk.t = 2.4;
        atk.emit = 0;
        break;
      case 'spawn':
        for (const p of atk.points) {
          if (game.zombies.length < 36) Zombies.spawn(game, z.def.minion, p.x, p.y);
        }
        this.recover(z, 0.5);
        break;
      case 'slam': {
        z.air = 0;
        z.x = atk.tx; z.y = atk.ty;
        Fx.ring(z.x, z.y, atk.radius, '#ffcf7a', 0.45, 10);
        Fx.burst(z.x, z.y, 26, { speed: 380, life: 0.6, size: 5, color: ['#3b2f22', '#5a4a3a', '#8a7a6a'], kind: 'dirt' });
        Render.crack(z.x, z.y, atk.radius * 0.5);
        Fx.addShake(14);
        if (Math.hypot(h.x - z.x, h.y - z.y) < atk.radius + h.r) game.hurtHero(Math.round(z.damage * 1.3), z);
        // Shockwave also flings zombies around.
        for (const o of game.zombies) {
          if (o === z || o.state !== 'alive') continue;
          const d = Math.hypot(o.x - z.x, o.y - z.y);
          if (d < atk.radius) { o.kx += (o.x - z.x) / (d || 1) * 300; o.ky += (o.y - z.y) / (d || 1) * 300; }
        }
        if (z.rage) for (let i = 0; i < 8; i++) this.shoot(z, i / 8 * Math.PI * 2, BOSS_SHOT_SPEED * 0.8, '#ffcf7a');
        this.recover(z, 0.7);
        break;
      }
      case 'cone': {
        for (let i = 0; i < 46; i++) {
          const a = atk.a + (Math.random() - 0.5) * atk.half * 2;
          const sp = 300 + Math.random() * 420;
          Fx.particle(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, Math.cos(a) * sp, Math.sin(a) * sp, 0.55, 7, Math.random() < 0.5 ? '#9bd34a' : '#c8e85a', 'acid', 1.5);
        }
        const d = Math.hypot(h.x - z.x, h.y - z.y);
        let da = Math.abs(Math.atan2(h.y - z.y, h.x - z.x) - atk.a);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if (d < atk.len + h.r && da < atk.half) game.hurtHero(Math.round(z.damage * 1.1), z);
        Fx.addShake(5);
        this.recover(z, 0.55);
        break;
      }
      case 'teleport':
        z.state = 'hidden';
        z.alpha = 0;
        atk.stage = 'gone';
        atk.t = 0.75;
        Fx.burst(z.x, z.y, 16, { speed: 200, life: 0.5, size: 4, color: ['#c46bff', '#6a2a8a'], kind: 'plasma' });
        break;
      case 'pools':
        for (const t of atk.targets) {
          this.globs.push({ sx: z.x, sy: z.y, x: z.x, y: z.y, tx: t.x, ty: t.y, t: 0, dur: 0.95, z: 0, damage: Math.max(4, Math.round(z.damage * 0.25)) });
        }
        this.recover(z, 0.4);
        break;
    }
  },

  recover(z, t) {
    z.atk.stage = 'recover';
    z.atk.t = t;
  },

  laneLength(game, z, a, max) {
    let d = 0;
    while (d < max) {
      const x = z.x + Math.cos(a) * (d + z.r), y = z.y + Math.sin(a) * (d + z.r);
      if (game.obstacleAt(x, y) || game.outsideArena(x, y)) break;
      d += 10;
    }
    return Math.max(60, d);
  },

  teleportPoint(game, z) {
    const h = game.hero;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = 200 + Math.random() * 120;
      const x = h.x + Math.cos(a) * d, y = h.y + Math.sin(a) * d;
      const pad = z.r + 10;
      if (x < BORDER + pad || y < BORDER + pad || x > game.arena.w - BORDER - pad || y > game.arena.h - BORDER - pad) continue;
      if (game.obstacles.some(o => { const [hw, hh] = halfSize(o); return Math.abs(o.x - x) < hw + pad && Math.abs(o.y - y) < hh + pad; })) continue;
      return { x, y };
    }
    return { x: z.x, y: z.y };
  },

  shoot(z, a, speed, color) {
    this.shots.push({
      x: z.x + Math.cos(a) * z.r * 0.8, y: z.y + Math.sin(a) * z.r * 0.8,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: 8, life: 4, color,
      damage: Math.max(5, Math.round(z.damage * 0.45)),
    });
  },

  // ---------- Hazards ----------

  updateHazards(game, dt) {
    const h = game.hero;

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      let done = s.life <= 0 || game.obstacleAt(s.x, s.y) || game.outsideArena(s.x, s.y);
      if (!done && Math.hypot(s.x - h.x, s.y - h.y) < s.r + h.r - 2) {
        game.hurtHero(s.damage, { x: s.x - s.vx, y: s.y - s.vy });
        done = true;
      }
      if (done) {
        Fx.burst(s.x, s.y, 4, { speed: 120, life: 0.25, size: 3, color: s.color, kind: 'spark' });
        this.shots.splice(i, 1);
      }
    }

    for (let i = this.globs.length - 1; i >= 0; i--) {
      const g = this.globs[i];
      g.t += dt;
      const k = Math.min(1, g.t / g.dur);
      g.x = g.sx + (g.tx - g.sx) * k;
      g.y = g.sy + (g.ty - g.sy) * k;
      g.z = Math.sin(Math.PI * k) * 120;
      if (k >= 1) {
        this.pools.push({ x: g.tx, y: g.ty, r: 58, life: 5.5, max: 5.5, tick: 0, damage: g.damage });
        Fx.burst(g.tx, g.ty, 12, { speed: 160, life: 0.4, size: 4, color: ['#9bd34a', '#6f9a2a'], kind: 'acid' });
        this.globs.splice(i, 1);
      }
    }

    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i];
      p.life -= dt;
      p.tick -= dt;
      if (p.tick <= 0 && Math.hypot(h.x - p.x, h.y - p.y) < p.r + h.r * 0.5) {
        p.tick = 0.5;
        game.hurtHero(p.damage, null);
      }
      if (Math.random() < dt * 6) Fx.particle(p.x + (Math.random() - 0.5) * p.r * 1.4, p.y + (Math.random() - 0.5) * p.r * 1.4, 0, -20, 0.5, 3, '#b8e85a', 'acid', 1);
      if (p.life <= 0) {
        Render.splat(p.x, p.y, p.r * 0.7, '#4a5a1f', 0.35);
        this.pools.splice(i, 1);
      }
    }
  },

  // ---------- Death / phases ----------

  // Returns true when the boss survives (final boss moves to its next phase).
  onLethal(game, z) {
    if (z.phases > 1 && z.phase < z.phases - 1) {
      z.phase++;
      z.hp = z.maxHp;
      z.state = 'phasing';
      z.phaseT = 2.6;
      z.atk = null;
      z.air = 0;
      z.alpha = 1;
      z.timer = 1.4;
      z.burn = null;
      const phrase = z.def.phasePhrases[z.phase - 1];
      z.say = { text: phrase, t: 3.5 };
      game.banner(`ФАЗА ${z.phase + 1}/${z.phases}`, '#ff3a2a', 2.8, `«${phrase}»`, true);
      Fx.ring(z.x, z.y, 260, '#ff3a2a', 0.7, 10);
      Fx.addShake(16);
      this.shots.length = 0;
      if (z.phase === z.phases - 1) z.rage = true;
      if (z.def.darkness) game.darknessTarget = z.def.darkness[z.phase];
      game.fog = z.phase >= 2;
      // Push the hero away so the next phase starts fair.
      const h = game.hero, a = Math.atan2(h.y - z.y, h.x - z.x);
      h.x += Math.cos(a) * 60;
      h.y += Math.sin(a) * 60;
      game.collideCircle(h);
      return true;
    }
    return false;
  },

  // Boss is dead for real: clear the arena.
  onDeath(game, z) {
    game.boss = null;
    this.reset();
    Fx.explosion(z.x, z.y, 160);
    Fx.burst(z.x, z.y, 60, { speed: 420, life: 0.9, size: 6, color: ['#8a1414', '#5c0b0b', z.def.color], kind: 'blood', drag: 3 });
    Render.splat(z.x, z.y, z.r * 1.8, '#6e0f0f', 0.8);
    Fx.addShake(18);
    // Minions collapse with their master.
    for (const o of game.zombies) {
      if (o === z || (o.state !== 'alive' && o.state !== 'rising')) continue;
      o.state = 'dead';
      Fx.blood(o.x, o.y, Math.random() * 6.28, 10);
      Render.splat(o.x, o.y, o.r, '#6e0f0f', 0.6);
    }
    game.waveQueue = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 200;
      game.pickups.push({ kind: 'coin', value: 3, x: z.x, y: z.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: DROPS.lifetime, magnet: false, bob: Math.random() * 6 });
    }
    game.banner('БОСС ПОВЕРЖЕН!', '#ffd23a', 2.6, z.def.name, true);
    if (z.phases > 1) game.finalWon = true;
  },
};
