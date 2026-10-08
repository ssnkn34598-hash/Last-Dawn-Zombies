// Game state: arena, obstacles, hero, combat, pickups, camera. No drawing here.

const BORDER = 48;          // barricade thickness along the arena edge
const HERO_RADIUS = 16;
const STREAK_TIME = 3;      // seconds between kills before a streak resets
const STREAK_MILESTONES = { 5: 'Неплохо!', 10: 'Мясорубка!', 20: 'Неудержимый!', 35: 'Зачистка!', 50: 'Легенда района!', 100: 'Последний рассвет!' };

// Small seeded RNG so a level always gets the same layout.
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OBSTACLE_KINDS = [
  { kind: 'car',      shape: 'rect',   w: 120, h: 58 },
  { kind: 'dumpster', shape: 'rect',   w: 76,  h: 46 },
  { kind: 'crates',   shape: 'rect',   w: 64,  h: 64 },
  { kind: 'blocks',   shape: 'rect',   w: 110, h: 34 },
  { kind: 'tires',    shape: 'circle', r: 30 },
  { kind: 'tree',     shape: 'circle', r: 36 },
];

function halfSize(o) {
  return o.shape === 'rect' ? [o.w / 2, o.h / 2] : [o.r, o.r];
}

function generateObstacles(arena, rng) {
  const count = 6 + Math.floor(rng() * 7); // 6..12
  const list = [];
  const cx = arena.w / 2, cy = arena.h / 2;
  let attempts = 0;

  while (list.length < count && attempts < 500) {
    attempts++;
    const proto = OBSTACLE_KINDS[Math.floor(rng() * OBSTACLE_KINDS.length)];
    const o = { kind: proto.kind, shape: proto.shape, seed: rng() };
    if (o.shape === 'rect') {
      const vertical = rng() < 0.4;
      o.w = vertical ? proto.h : proto.w;
      o.h = vertical ? proto.w : proto.h;
    } else {
      o.r = proto.r;
    }
    const [halfW, halfH] = halfSize(o);
    const margin = BORDER + 60;
    o.x = margin + halfW + rng() * (arena.w - 2 * (margin + halfW));
    o.y = margin + halfH + rng() * (arena.h - 2 * (margin + halfH));

    // Keep the spawn point in the centre free.
    if (Math.abs(o.x - cx) < 140 + halfW && Math.abs(o.y - cy) < 140 + halfH) continue;

    // Leave walkable gaps between obstacles.
    const gap = 70;
    const clash = list.some(p => {
      const [pw, ph] = halfSize(p);
      return Math.abs(p.x - o.x) < pw + halfW + gap && Math.abs(p.y - o.y) < ph + halfH + gap;
    });
    if (clash) continue;

    list.push(o);
  }
  return list;
}

// Push a circle (x, y, r) out of an obstacle. Returns the corrected position.
function resolveCircle(x, y, r, o) {
  if (o.shape === 'circle') {
    const dx = x - o.x, dy = y - o.y;
    const d = Math.hypot(dx, dy);
    const min = r + o.r;
    if (d < min) {
      if (d < 0.0001) return { x: x + min, y };
      return { x: o.x + (dx / d) * min, y: o.y + (dy / d) * min };
    }
    return { x, y };
  }

  const left = o.x - o.w / 2, right = o.x + o.w / 2;
  const top = o.y - o.h / 2, bottom = o.y + o.h / 2;
  const nx = Math.max(left, Math.min(x, right));
  const ny = Math.max(top, Math.min(y, bottom));
  const dx = x - nx, dy = y - ny;
  const d2 = dx * dx + dy * dy;

  if (d2 > 0) {
    if (d2 >= r * r) return { x, y };
    const d = Math.sqrt(d2);
    return { x: nx + (dx / d) * r, y: ny + (dy / d) * r };
  }

  // Centre is inside the rectangle: push out along the shortest axis.
  const pushL = x - left + r, pushR = right - x + r;
  const pushT = y - top + r, pushB = bottom - y + r;
  const m = Math.min(pushL, pushR, pushT, pushB);
  if (m === pushL) return { x: left - r, y };
  if (m === pushR) return { x: right + r, y };
  if (m === pushT) return { x, y: top - r };
  return { x, y: bottom + r };
}

const Game = {
  level: 1,
  config: null,
  arena: null,
  obstacles: [],
  barrels: [],
  zombies: [],
  pickups: [],
  hero: null,
  camera: { x: 0, y: 0 },
  time: 0,
  aimMode: 'auto',        // 'auto' | 'manual'
  target: null,           // current auto-aim target
  aimPoint: null,         // world point of the manual cursor
  streak: { count: 0, timer: 0, best: 0 },
  banners: [],
  debugSpawn: true,       // temporary: endless mix of every zombie type
  spawnTimer: 0,
  kills: 0,

  start(level) {
    this.level = level;
    this.config = levelConfig(level);
    this.arena = { w: this.config.arena.w, h: this.config.arena.h };
    this.district = this.config.district;

    const rng = makeRng(level * 7919 + 17);
    this.obstacles = generateObstacles(this.arena, rng);
    this.barrels = this.placeBarrels(this.config.barrels || 4, rng);
    this.zombies = [];
    this.pickups = [];
    this.banners = [];
    this.streak = { count: 0, timer: 0, best: 0 };
    this.kills = 0;
    this.spawnTimer = 1;
    Fx.reset();
    Weapons.reset();
    Zombies.reset();

    const heroData = HEROES.max;
    this.hero = {
      name: heroData.name,
      x: this.arena.w / 2,
      y: this.arena.h / 2,
      vx: 0, vy: 0,
      r: HERO_RADIUS,
      speed: heroData.speed,
      hp: heroData.hp,
      maxHp: heroData.hp,
      color: heroData.color,
      magnet: heroData.magnet || 100,
      facing: 0,
      aiming: false,
      moving: false,
      walkTime: 0,
      weapon: 0,
      cooldown: 0,
      recoil: 0,
      hurt: 0,
      invuln: 0,
      xp: 0,
      coins: 0,
    };

    this.camera.x = this.hero.x;
    this.camera.y = this.hero.y;
    this.time = 0;
  },

  placeBarrels(count, rng) {
    const list = [];
    const a = this.arena;
    for (let tries = 0; list.length < count && tries < 300; tries++) {
      const x = BORDER + 60 + rng() * (a.w - 2 * (BORDER + 60));
      const y = BORDER + 60 + rng() * (a.h - 2 * (BORDER + 60));
      if (Math.hypot(x - a.w / 2, y - a.h / 2) < 200) continue;
      if (this.obstacles.some(o => { const [hw, hh] = halfSize(o); return Math.abs(o.x - x) < hw + 50 && Math.abs(o.y - y) < hh + 50; })) continue;
      if (list.some(b => Math.hypot(b.x - x, b.y - y) < 160)) continue;
      list.push({ x, y, r: 15, hp: 25, flash: 0, fuse: -1, dead: false });
    }
    return list;
  },

  get weapon() {
    return WEAPONS[this.hero.weapon];
  },

  setWeapon(i) {
    if (i < 0 || i >= WEAPONS.length) return;
    this.hero.weapon = i;
    this.hero.cooldown = 0;
    this.banner(WEAPONS[i].name, '#ffcf7a', 1);
  },

  toggleAim() {
    this.aimMode = this.aimMode === 'auto' ? 'manual' : 'auto';
    this.banner(this.aimMode === 'auto' ? 'Прицел: АВТО' : 'Прицел: РУЧНОЙ', '#8fd8ff', 1);
  },

  banner(text, color, life = 1.6, sub = '') {
    this.banners = this.banners.filter(b => b.text !== text);
    this.banners.push({ text, sub, color, life, max: life });
    if (this.banners.length > 3) this.banners.shift();
  },

  // ---------- Geometry helpers ----------

  obstacleAt(x, y) {
    for (const o of this.obstacles) {
      if (o.shape === 'rect') {
        if (Math.abs(x - o.x) <= o.w / 2 && Math.abs(y - o.y) <= o.h / 2) return o;
      } else if (Math.hypot(x - o.x, y - o.y) <= o.r) {
        return o;
      }
    }
    return null;
  },

  outsideArena(x, y) {
    return x < BORDER || y < BORDER || x > this.arena.w - BORDER || y > this.arena.h - BORDER;
  },

  collideCircle(e) {
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        const p = resolveCircle(e.x, e.y, e.r, o);
        e.x = p.x;
        e.y = p.y;
      }
      for (const b of this.barrels) {
        if (b.dead) continue;
        const p = resolveCircle(e.x, e.y, e.r, { shape: 'circle', x: b.x, y: b.y, r: b.r });
        e.x = p.x;
        e.y = p.y;
      }
    }
    e.x = Math.max(BORDER + e.r, Math.min(this.arena.w - BORDER - e.r, e.x));
    e.y = Math.max(BORDER + e.r, Math.min(this.arena.h - BORDER - e.r, e.y));
  },

  nearestZombie(x, y, maxDist) {
    let best = null, bd = maxDist;
    for (const z of this.zombies) {
      if (z.state !== 'alive') continue;
      const d = Math.hypot(z.x - x, z.y - y) - z.r;
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  },

  // ---------- Update ----------

  // controls: { move: {x,y}, pointer: {x,y}|null (screen, logical),
  //             stick: {x,y}|null (aim stick, 0..1), firing: bool }
  update(dt, controls, view) {
    this.time += dt;
    const h = this.hero;

    this.updateHero(dt, controls.move);
    this.updateAim(dt, controls, view);

    Weapons.update(this, dt);
    Zombies.update(this, dt);
    this.zombies = this.zombies.filter(z => z.state !== 'dead');
    this.updateBarrels(dt);
    this.updatePickups(dt);
    this.updateStreak(dt);
    if (this.debugSpawn) this.updateDebugSpawn(dt);
    Fx.update(dt);

    for (let i = this.banners.length - 1; i >= 0; i--) {
      this.banners[i].life -= dt;
      if (this.banners[i].life <= 0) this.banners.splice(i, 1);
    }

    h.hurt = Math.max(0, h.hurt - dt);
    h.invuln = Math.max(0, h.invuln - dt);
    h.recoil = Math.max(0, h.recoil - dt * 8);

    this.updateCamera(dt, view);
  },

  updateHero(dt, move) {
    const h = this.hero;
    const len = Math.hypot(move.x, move.y);
    h.moving = len > 0.05;
    const px = h.x, py = h.y;
    if (h.moving) {
      h.x += move.x * h.speed * dt;
      h.y += move.y * h.speed * dt;
      h.walkTime += dt * (0.5 + len);
    }
    this.collideCircle(h);
    h.vx = (h.x - px) / dt;
    h.vy = (h.y - py) / dt;
    if (h.moving && !h.aiming) h.facing = Math.atan2(move.y, move.x);
  },

  updateAim(dt, controls, view) {
    const h = this.hero;
    const w = this.weapon;
    let angle = null, target = null, aimPoint = null, firing = false;

    if (this.aimMode === 'auto') {
      target = this.nearestZombie(h.x, h.y, w.range + 60);
      if (target) {
        angle = Math.atan2(target.y - h.y, target.x - h.x);
        aimPoint = { x: target.x, y: target.y };
        firing = Math.hypot(target.x - h.x, target.y - h.y) - target.r <= w.range;
      }
      this.aimPoint = null;
    } else {
      if (controls.stick) {
        const m = Math.hypot(controls.stick.x, controls.stick.y);
        if (m > 0.15) {
          angle = Math.atan2(controls.stick.y, controls.stick.x);
          const d = Math.max(80, m * w.range);
          aimPoint = { x: h.x + Math.cos(angle) * d, y: h.y + Math.sin(angle) * d };
        }
        firing = m > 0.35;
        this.aimPoint = null;
      } else if (controls.pointer) {
        const camX = this.camera.x - view.w / 2, camY = this.camera.y - view.h / 2;
        aimPoint = { x: controls.pointer.x + camX, y: controls.pointer.y + camY };
        angle = Math.atan2(aimPoint.y - h.y, aimPoint.x - h.x);
        firing = controls.firing;
        this.aimPoint = aimPoint;
      }
    }

    this.target = target;
    h.aiming = angle !== null;
    if (h.aiming) h.facing = angle;

    h.cooldown -= dt;
    if (firing && angle !== null) {
      let shots = 0;
      while (h.cooldown <= 0 && shots < 4) {
        Weapons.fire(this, w, angle, target, aimPoint);
        h.cooldown += 1 / w.rate;
        h.recoil = 1;
        shots++;
      }
    } else if (h.cooldown < 0) {
      h.cooldown = 0;
    }
  },

  // ---------- Damage ----------

  damageZombie(z, amount, opt = {}) {
    if (z.state !== 'alive') return;
    const kind = opt.kind || 'bullet';
    let dmg = amount;
    let armored = false;
    if (z.def.armor && kind !== 'explosion' && kind !== 'burn' && kind !== 'tesla') {
      dmg *= 1 - z.def.armor;
      armored = true;
    }
    const crit = (kind === 'bullet' || kind === 'bolt' || kind === 'plasma') && Math.random() < 0.08;
    if (crit) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));

    z.hp -= dmg;
    z.flash = 0.1;

    if (opt.burn) z.burn = { dps: opt.burn.dps, t: opt.burn.time, acc: z.burn ? z.burn.acc : 0 };

    if (opt.knock && opt.angle !== undefined) {
      z.kx += Math.cos(opt.angle) * opt.knock / z.mass;
      z.ky += Math.sin(opt.angle) * opt.knock / z.mass;
    }

    // Damage numbers (fire is summed up so it doesn't spam).
    if (kind === 'flame' || kind === 'burn') {
      z.numAcc = (z.numAcc || 0) + dmg;
      if (!z.numT || this.time > z.numT) {
        Fx.text(z.x, z.y - z.r - 6, z.numAcc, '#ff9a4a', 14);
        z.numAcc = 0;
        z.numT = this.time + 0.3;
      }
    } else {
      Fx.text(z.x, z.y - z.r - 6, crit ? dmg + '!' : dmg, crit ? '#ffd23a' : armored ? '#9fb3c8' : '#ffffff', crit ? 21 : 15);
    }

    if (armored) {
      Fx.burst(z.x, z.y, 3, { angle: opt.angle + Math.PI, cone: 1.4, speed: 200, life: 0.15, size: 2, color: '#e8e8e8', kind: 'spark' });
    }
    if (kind !== 'flame' && kind !== 'burn') {
      Fx.blood(z.x, z.y, opt.angle !== undefined ? opt.angle : Math.random() * 6.28, armored ? 2 : 5);
    }

    if (z.hp <= 0) this.killZombie(z, opt);
  },

  killZombie(z, opt = {}) {
    if (z.state === 'dead') return;
    z.state = 'dead';
    const angle = opt.angle !== undefined ? opt.angle : Math.random() * Math.PI * 2;

    if (z.def.behavior === 'explode') {
      Fx.burst(z.x, z.y, 24, { speed: 320, life: 0.6, size: 5, color: ['#9bb34a', '#7a8a3a', '#5a1a14'], kind: 'acid', drag: 4 });
      Render.splat(z.x, z.y, z.def.blastRadius * 0.4, '#4a5a1f', 0.4);
      this.explode(z.x, z.y, z.def.blastRadius, z.def.blastDamage * 2, 'zombie', z.def.blastDamage);
    } else {
      Fx.blood(z.x, z.y, angle, 14);
      Fx.burst(z.x, z.y, 6, { angle, cone: 2, speed: 220, life: 0.5, size: 5, color: ['#5c0b0b', z.def.color], kind: 'gore', drag: 5 });
      Render.splat(z.x, z.y, z.r * 1.3, '#6e0f0f', 0.75);
    }

    if (opt.kind === 'self') return; // bloater blew itself up — no reward

    this.kills++;
    this.drop(z);

    const s = this.streak;
    s.count++;
    s.timer = STREAK_TIME;
    s.best = Math.max(s.best, s.count);
    if (STREAK_MILESTONES[s.count]) {
      this.banner(`СЕРИЯ ×${s.count}`, '#ff7a3a', 1.8, STREAK_MILESTONES[s.count]);
      Fx.addShake(4);
    }
  },

  drop(z) {
    const spray = (kind, value) => {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
      this.pickups.push({ kind, value, x: z.x, y: z.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: DROPS.lifetime, magnet: false, bob: Math.random() * 6 });
    };
    spray('xp', z.def.xp);
    if (Math.random() < z.def.coin) spray('coin', z.def.xp >= 5 ? 3 : 1);
    if (Math.random() < DROPS.medkitChance) spray('medkit', DROPS.medkitHeal);
  },

  // Area damage. heroDamage > 0 only for hazards (barrels, bloaters).
  explode(x, y, radius, damage, source, heroDamage = 0) {
    Fx.explosion(x, y, radius);
    for (const z of this.zombies) {
      if (z.state !== 'alive') continue;
      const d = Math.hypot(z.x - x, z.y - y);
      if (d > radius + z.r) continue;
      const fall = 1 - 0.5 * Math.min(1, d / radius);
      this.damageZombie(z, damage * fall, { angle: Math.atan2(z.y - y, z.x - x), knock: 320 * fall, kind: 'explosion' });
    }
    for (const b of this.barrels) {
      if (!b.dead && b.fuse < 0 && Math.hypot(b.x - x, b.y - y) < radius + b.r) b.fuse = 0.12 + Math.random() * 0.1;
    }
    const h = this.hero;
    if (heroDamage > 0) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < radius + h.r) this.hurtHero(Math.round(heroDamage * (1 - 0.5 * d / radius)), { x, y });
    }
  },

  splash(x, y, radius, damage, except) {
    for (const z of this.zombies) {
      if (z === except || z.state !== 'alive') continue;
      if (Math.hypot(z.x - x, z.y - y) < radius + z.r) this.damageZombie(z, damage, { kind: 'plasma-splash' });
    }
  },

  damageBarrel(b, amount) {
    if (b.dead) return;
    b.hp -= amount;
    b.flash = 0.08;
    Fx.burst(b.x, b.y, 2, { speed: 140, life: 0.15, size: 2, color: '#ffe08a', kind: 'spark' });
    if (b.hp <= 0 && b.fuse < 0) b.fuse = 0.05;
  },

  updateBarrels(dt) {
    for (const b of this.barrels) {
      if (b.dead) continue;
      b.flash = Math.max(0, b.flash - dt);
      if (b.fuse >= 0) {
        b.fuse -= dt;
        if (b.fuse <= 0) {
          b.dead = true;
          this.explode(b.x, b.y, 125, 90, 'barrel', 28);
        }
      }
    }
  },

  hurtHero(dmg, src) {
    const h = this.hero;
    if (h.invuln > 0) return;
    h.hp -= dmg;
    h.hurt = 0.35;
    h.invuln = 0.2;
    Fx.text(h.x, h.y - 26, '-' + dmg, '#ff4a4a', 18);
    Fx.blood(h.x, h.y, src ? Math.atan2(h.y - src.y, h.x - src.x) : 0, 6);
    Fx.addShake(5);
    if (src) {
      const a = Math.atan2(h.y - src.y, h.x - src.x);
      h.x += Math.cos(a) * 10;
      h.y += Math.sin(a) * 10;
      this.collideCircle(h);
    }
    if (h.hp <= 0) {
      // Temporary until defeat screen (step 3): revive with a shockwave.
      h.hp = h.maxHp;
      h.invuln = 2;
      this.banner('ВТОРОЕ ДЫХАНИЕ', '#ff5a4a', 2, 'поражение появится на шаге 3');
      Fx.ring(h.x, h.y, 220, '#ff7a5a', 0.5, 8);
      for (const z of this.zombies) {
        if (z.state !== 'alive') continue;
        const d = Math.hypot(z.x - h.x, z.y - h.y);
        if (d < 220) {
          const a = Math.atan2(z.y - h.y, z.x - h.x);
          z.kx += Math.cos(a) * 600 / z.mass;
          z.ky += Math.sin(a) * 600 / z.mass;
        }
      }
      this.streak.count = 0;
    }
  },

  // ---------- Pickups ----------

  updatePickups(dt) {
    const h = this.hero;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.bob += dt * 5;
      const dx = h.x - p.x, dy = h.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const wanted = p.kind !== 'medkit' || h.hp < h.maxHp;

      if (wanted && d < h.magnet) p.magnet = true;
      if (p.magnet && wanted) {
        const sp = Math.min(800, 200 + (h.magnet - Math.min(d, h.magnet)) * 6 + (p.pull = (p.pull || 0) + dt * 600));
        p.vx = dx / d * sp;
        p.vy = dy / d * sp;
      } else {
        const k = Math.exp(-5 * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.magnet) {
        p.x = Math.max(BORDER + 6, Math.min(this.arena.w - BORDER - 6, p.x));
        p.y = Math.max(BORDER + 6, Math.min(this.arena.h - BORDER - 6, p.y));
      }

      if (wanted && d < h.r + 8) {
        if (p.kind === 'xp') {
          h.xp += p.value;
        } else if (p.kind === 'coin') {
          h.coins += p.value;
          Fx.text(h.x, h.y - 30, '+' + p.value, '#ffd23a', 13);
        } else if (p.kind === 'medkit') {
          const heal = Math.min(p.value, h.maxHp - h.hp);
          h.hp += heal;
          Fx.text(h.x, h.y - 30, '+' + heal, '#5aff7a', 18);
          Fx.ring(h.x, h.y, 40, '#5aff7a', 0.3, 3);
        }
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.pickups.splice(i, 1);
    }
  },

  updateStreak(dt) {
    const s = this.streak;
    if (s.count > 0) {
      s.timer -= dt;
      if (s.timer <= 0) s.count = 0;
    }
  },

  // ---------- Temporary test spawner ----------

  updateDebugSpawn(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 0.45;
    if (this.zombies.length >= 30) return;

    const types = Object.keys(ZOMBIES);
    // Walkers are the most common, the rest share evenly.
    const type = Math.random() < 0.3 ? types[0] : types[1 + Math.floor(Math.random() * (types.length - 1))];
    const p = this.findSpawnPoint(ZOMBIES[type].radius);
    if (p) Zombies.spawn(this, type, p.x, p.y);
  },

  findSpawnPoint(r) {
    const h = this.hero, a = this.arena;
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 260 + Math.random() * 320;
      const x = h.x + Math.cos(ang) * d, y = h.y + Math.sin(ang) * d;
      if (x < BORDER + r + 10 || y < BORDER + r + 10 || x > a.w - BORDER - r - 10 || y > a.h - BORDER - r - 10) continue;
      const blocked = this.obstacles.some(o => { const [hw, hh] = halfSize(o); return Math.abs(o.x - x) < hw + r + 6 && Math.abs(o.y - y) < hh + r + 6; })
        || this.barrels.some(b => !b.dead && Math.hypot(b.x - x, b.y - y) < b.r + r + 10);
      if (!blocked) return { x, y };
    }
    return null;
  },

  // ---------- Camera ----------

  updateCamera(dt, view) {
    const k = 1 - Math.exp(-dt * 8);
    this.camera.x += (this.hero.x - this.camera.x) * k;
    this.camera.y += (this.hero.y - this.camera.y) * k;
    this.clampCamera(view);
  },

  clampCamera(view) {
    const halfW = view.w / 2, halfH = view.h / 2;
    const a = this.arena;
    this.camera.x = a.w <= view.w ? a.w / 2 : Math.max(halfW, Math.min(a.w - halfW, this.camera.x));
    this.camera.y = a.h <= view.h ? a.h / 2 : Math.max(halfH, Math.min(a.h - halfH, this.camera.y));
  },
};
