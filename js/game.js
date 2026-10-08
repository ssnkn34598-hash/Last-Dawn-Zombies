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

// Nika's turret fires this.
const TURRET_GUN = { id: 'turret', type: 'bullet', damage: 12, rate: 6, range: 420, speed: 900, spread: 0.05, color: '#ffe08a' };

const SAW_RADIUS = 72;
const SAW_SIZE = 13;
const WAVE_BREAK = 2.5;

// Ending timeline (seconds since the ending started).
const ENDING_TITLE_AT = 1;
const ENDING_LINES_AT = 3.5;
const ENDING_LINE_STEP = 2.6;
const ENDING_CREDITS_AT = ENDING_LINES_AT + ENDING.lines.length * ENDING_LINE_STEP + 1.5;
const ENDING_CREDITS_END = ENDING_CREDITS_AT + 14;

function baseStats() {
  return { damage: 1, rate: 1, speed: 1, magnet: 1, regen: 0, extra: 0, pierce: 0, crit: 0, saws: 0, ice: 0, fire: 0, boom: 0 };
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
  // intro (new enemy card) | play | perk | victory | defeat
  state: 'play',
  debug: false,
  aimMode: 'auto',        // 'auto' | 'manual'
  target: null,           // current auto-aim target
  aimPoint: null,         // world point of the manual cursor
  streak: { count: 0, timer: 0, best: 0 },
  banners: [],
  kills: 0,

  // Waves
  waveIndex: 0,
  waveQueue: [],
  waveTimer: 0,
  waveBreak: 0,
  victoryDelay: -1,

  // Level stats for the star goals
  levelTime: 0,
  hitsTaken: 0,

  // Perks
  perks: {},
  pendingPerks: 0,
  perkChoices: [],
  sawAngle: 0,

  result: null,
  stateTime: 0,

  // Tutorial run (null in normal levels) and the current Raven hint toast.
  tutorial: null,
  hint: null,
  hintQueue: [],
  touch: false,

  // Bosses
  boss: null,
  bossPending: -1,
  darkness: 0,
  darknessTarget: 0,
  fog: false,
  finalWon: false,
  seenEnemies: new Set(),

  start(level) {
    this.level = Math.max(1, Math.min(100, level));
    this.config = levelConfig(this.level);
    this.arena = { w: this.config.arena.w, h: this.config.arena.h };
    this.district = this.config.district;

    const rng = makeRng(this.level * 7919 + 17);
    this.obstacles = generateObstacles(this.arena, rng);
    this.barrels = this.placeBarrels(this.config.barrels || 4, rng);
    this.zombies = [];
    this.pickups = [];
    this.banners = [];
    this.streak = { count: 0, timer: 0, best: 0 };
    this.kills = 0;
    this.levelTime = 0;
    this.hitsTaken = 0;
    this.perks = {};
    this.pendingPerks = 0;
    this.perkChoices = [];
    this.waveIndex = -1;
    this.waveQueue = [];
    this.waveBreak = 0;
    this.victoryDelay = -1;
    this.result = null;
    this.target = null;
    this.tutorial = null;
    this.hint = null;
    this.hintQueue = [];
    this.boss = null;
    this.bossPending = -1;
    this.darkness = 0;
    this.darknessTarget = 0;
    this.fog = false;
    this.finalWon = false;
    Fx.reset();
    Weapons.reset();
    Zombies.reset();
    Bosses.reset();

    const prevWeapon = this.hero ? this.hero.weapon : -1;
    this.hero = this.makeHero();
    if (this.debug && prevWeapon >= 0) this.hero.weapon = prevWeapon;
    this.turrets = [];
    this.strikes = [];
    this.buffs = [];

    this.camera.x = this.hero.x;
    this.camera.y = this.hero.y;
    this.time = 0;

    Render.buildMap(this);

    // The "new enemy" card shows once (kept only for this session until saves exist).
    const fresh = this.config.newEnemy;
    if (fresh && !this.seenEnemies.has(fresh)) {
      this.seenEnemies.add(fresh);
      this.setState('intro');
    } else {
      this.beginPlay();
    }

    // One-time hints for a weapon used for the first time and for manual aim.
    if (typeof Hints !== 'undefined') {
      const w = this.weapon;
      if (w.id !== 'pistol') Hints.trigger('weapon_' + w.id, `Новое оружие: ${w.name}. ${w.desc}`);
      if (this.aimMode === 'manual') Hints.manual();
    }
  },

  // Separate small arena for the tutorial; the hero cannot die there.
  startTutorial() {
    const district = DISTRICTS[0];
    this.level = 0;
    this.config = {
      level: 0, district, arena: { w: 1500, h: 1000 }, barrels: 0, waves: [], total: 0,
      newEnemy: null, boss: null, mods: { hp: 1, speed: 1, damage: 1 }, stars: [], reward: 0,
    };
    this.arena = { w: 1500, h: 1000 };
    this.district = district;
    const rng = makeRng(4242);
    this.obstacles = generateObstacles(this.arena, rng).slice(0, 7);
    this.barrels = [];
    this.zombies = [];
    this.pickups = [];
    this.banners = [];
    this.streak = { count: 0, timer: 0, best: 0 };
    this.kills = 0;
    this.levelTime = 0;
    this.hitsTaken = 0;
    this.perks = {};
    this.pendingPerks = 0;
    this.perkChoices = [];
    this.waveIndex = -1;
    this.waveQueue = [];
    this.waveBreak = 0;
    this.victoryDelay = -1;
    this.result = null;
    this.target = null;
    this.hint = null;
    this.boss = null;
    this.bossPending = -1;
    this.darkness = this.darknessTarget = 0;
    this.fog = false;
    this.finalWon = false;
    Fx.reset();
    Weapons.reset();
    Zombies.reset();
    Bosses.reset();
    this.hero = this.makeHero();
    this.turrets = [];
    this.strikes = [];
    this.buffs = [];
    this.camera.x = this.hero.x;
    this.camera.y = this.hero.y;
    this.time = 0;
    Render.buildMap(this);
    this.tutorial = Tutorial.create();
    this.setState('play');
    Tutorial.begin(this, 0);
  },

  setState(s) {
    this.state = s;
    this.stateTime = 0;
    if (s === 'intro') this.emit('enemySeen', this.config.newEnemy);
  },

  // UI listens to game events (victory, defeat, enemySeen) through hooks.
  hooks: {},
  emit(name, data) {
    if (this.hooks[name]) this.hooks[name](data);
  },

  // Hero, weapon and their upgrade levels; set by the menu before a level starts.
  loadout: { hero: 'max', heroLevel: 1, weapon: 'pistol', weaponLevel: 1 },

  makeHero() {
    const lo = this.loadout;
    const def = HEROES[lo.hero] || HEROES.max;
    const hp = Math.round(def.hp * (1 + ECONOMY.heroHpPerLevel * (lo.heroLevel - 1)));
    const stats = baseStats();
    stats.damage = 1 + ECONOMY.weaponDamagePerLevel * (lo.weaponLevel - 1);
    stats.rate = 1 + ECONOMY.weaponRatePerLevel * (lo.weaponLevel - 1);
    return {
      id: lo.hero,
      name: def.name,
      x: this.arena.w / 2,
      y: this.arena.h / 2,
      vx: 0, vy: 0,
      r: HERO_RADIUS,
      speed: def.speed,
      hp,
      maxHp: hp,
      color: def.color,
      hat: def.hat,
      magnet: def.magnet || 100,
      stats,
      skill: {
        id: def.skill.id,
        name: def.skill.name,
        cd: def.skill.cd,
        t: 2,
        power: 1 + ECONOMY.heroSkillPerLevel * (lo.heroLevel - 1),
      },
      facing: 0,
      aiming: false,
      moving: false,
      walkTime: 0,
      weapon: Math.max(0, WEAPONS.findIndex(w => w.id === lo.weapon)),
      cooldown: 0,
      recoil: 0,
      hurt: 0,
      invuln: 0,
      dash: null,
      frenzy: 0,
      lvl: 1,
      xp: 0,
      coins: 0,
      dead: false,
    };
  },

  pause() {
    if (this.state !== 'play') return;
    this.setState('paused');
    this.emit('pause');
  },

  resume() {
    if (this.state === 'paused') this.setState('play');
  },

  beginPlay() {
    this.setState('play');
    this.startWave(0);
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

  banner(text, color, life = 1.6, sub = '', big = false) {
    this.banners = this.banners.filter(b => b.text !== text);
    this.banners.push({ text, sub, color, life, max: life, big });
    if (this.banners.length > 3) this.banners.shift();
  },

  // Buttons on overlays and HUD (from mouse, touch or keyboard).
  press(name) {
    switch (name) {
      case 'start':
        if (this.state === 'intro') this.beginPlay();
        break;
      case 'perk0': case 'perk1': case 'perk2':
        if (this.state === 'perk') this.choosePerk(Number(name.slice(4)));
        break;
      case 'aim':
        if (this.debug) this.toggleAim();
        break;
      case 'pause':
        this.pause();
        break;
      case 'skill':
        this.useSkill();
        break;
      case 'skipTutorial':
        if (this.tutorial && this.state === 'play') {
          this.setState('paused');
          this.emit('tutorialSkip');
        }
        break;
      case 'skip':
        if (this.state === 'ending') this.stateTime = Math.max(this.stateTime, ENDING_CREDITS_END);
        break;
      case 'endnext':
        if (this.state === 'ending' && this.stateTime > ENDING_CREDITS_END) this.win();
        break;
      case 'weapon':
        if (this.debug) this.setWeapon((this.hero.weapon + 1) % WEAPONS.length);
        break;
    }
  },

  // Debug (K): hurt the boss by 30%, or clear the current wave.
  debugSkip() {
    if (this.state !== 'play') return;
    if (this.boss && this.boss.state === 'alive') {
      this.damageZombie(this.boss, this.boss.maxHp * 0.3, { kind: 'explosion' });
      return;
    }
    this.waveQueue = [];
    for (const z of this.zombies) if (!z.boss) z.state = 'dead';
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
    this.stateTime += dt;

    this.darkness += (this.darknessTarget - this.darkness) * Math.min(1, dt * 1.5);

    if (this.state === 'menu') {
      this.updateMenu(dt, view);
      return;
    }

    if (this.state !== 'play') {
      // Overlays freeze the fight; let effects settle behind them.
      if (this.state === 'victory' || this.state === 'defeat') Fx.update(dt);
      this.updateBanners(dt);
      this.updateCamera(dt, view);
      return;
    }

    const h = this.hero;
    this.levelTime += dt;

    this.updateHero(dt, controls.move);
    this.updateAim(dt, controls, view);
    this.updateSaws(dt);
    this.updateSkills(dt);

    Weapons.update(this, dt);
    Zombies.update(this, dt);
    Bosses.updateHazards(this, dt);
    this.zombies = this.zombies.filter(z => z.state !== 'dead');
    this.updateBarrels(dt);
    this.updatePickups(dt);
    this.updateStreak(dt);
    if (this.tutorial) Tutorial.update(this, dt);
    else this.updateWaves(dt);
    if (this.hint) {
      this.hint.t -= dt;
      if (this.hint.t <= 0) this.hint = this.hintQueue.shift() || null;
    }
    Fx.update(dt);
    this.updateBanners(dt);

    h.hurt = Math.max(0, h.hurt - dt);
    h.invuln = Math.max(0, h.invuln - dt);
    h.recoil = Math.max(0, h.recoil - dt * 8);
    if (h.stats.regen > 0 && h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + h.stats.regen * dt);

    if (this.state === 'play' && this.pendingPerks > 0) this.openPerks();

    this.updateCamera(dt, view);
  },

  updateBanners(dt) {
    for (let i = this.banners.length - 1; i >= 0; i--) {
      this.banners[i].life -= dt;
      if (this.banners[i].life <= 0) this.banners.splice(i, 1);
    }
  },

  updateHero(dt, move) {
    const h = this.hero;
    const len = Math.hypot(move.x, move.y);
    h.moving = len > 0.05;
    const px = h.x, py = h.y;
    if (h.moving) {
      const sp = h.speed * h.stats.speed;
      h.x += move.x * sp * dt;
      h.y += move.y * sp * dt;
      h.walkTime += dt * (0.5 + len) * h.stats.speed;
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
        h.cooldown += 1 / (w.rate * h.stats.rate);
        h.recoil = 1;
        shots++;
      }
    } else if (h.cooldown < 0) {
      h.cooldown = 0;
    }
  },

  // ---------- Waves ----------

  startWave(i) {
    const wave = this.config.waves[i];
    this.waveIndex = i;
    const queue = [];
    for (const [type, n] of Object.entries(wave.zombies)) for (let k = 0; k < n; k++) queue.push(type);
    for (let k = queue.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [queue[k], queue[j]] = [queue[j], queue[k]];
    }
    this.waveQueue = queue;
    this.waveTimer = wave.boss ? 4 : 1;
    const total = this.config.waves.length;
    const last = i === total - 1;
    const sub = wave.boss ? 'Идёт босс!' : last ? 'Последняя волна!' : '';
    this.banner(`ВОЛНА ${i + 1}/${total}`, last ? '#ff5a4a' : '#ffcf7a', 2.2, sub, true);
    if (wave.boss) this.bossPending = 2.2;
  },

  get wave() {
    return this.config.waves[this.waveIndex];
  },

  get remaining() {
    return this.waveQueue.length + this.zombies.length + (this.bossPending >= 0 ? 1 : 0);
  },

  updateWaves(dt) {
    if (this.victoryDelay >= 0) {
      this.victoryDelay -= dt;
      if (this.victoryDelay < 0) {
        if (this.finalWon) this.setState('ending');
        else this.win();
      }
      return;
    }

    if (this.bossPending >= 0) {
      this.bossPending -= dt;
      if (this.bossPending < 0) {
        const def = BOSSES[this.wave.boss];
        const p = this.findSpawnPoint(def.radius + 20) || { x: this.arena.w / 2, y: BORDER + 120 };
        Bosses.spawn(this, this.wave.boss, p.x, p.y);
      }
    }

    if (this.waveBreak > 0) {
      this.waveBreak -= dt;
      if (this.waveBreak <= 0) this.startWave(this.waveIndex + 1);
      return;
    }

    const wave = this.wave;
    this.waveTimer -= dt;
    if (this.waveQueue.length && this.waveTimer <= 0 && this.zombies.length < wave.maxAlive) {
      const type = this.waveQueue[this.waveQueue.length - 1];
      const p = this.findSpawnPoint(ZOMBIES[type].radius);
      if (p) {
        this.waveQueue.pop();
        Zombies.spawn(this, type, p.x, p.y);
        this.waveTimer = wave.interval * (0.7 + Math.random() * 0.6);
      }
    }

    if (!this.waveQueue.length && !this.zombies.length && this.bossPending < 0) {
      if (this.waveIndex >= this.config.waves.length - 1) {
        // Pull all loot in before the victory screen.
        this.victoryDelay = this.finalWon ? 3 : 1.4;
        for (const p of this.pickups) p.magnet = true;
        this.banner('РАЙОН ЗАЧИЩЕН', '#7aff8a', 1.6, '', true);
      } else {
        this.waveBreak = WAVE_BREAK;
        this.banner('Волна отбита', '#a8e08a', 1.4, 'передышка');
      }
    }
  },

  findSpawnPoint(r) {
    const h = this.hero, a = this.arena;
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 260 + Math.random() * 340;
      const x = h.x + Math.cos(ang) * d, y = h.y + Math.sin(ang) * d;
      if (x < BORDER + r + 10 || y < BORDER + r + 10 || x > a.w - BORDER - r - 10 || y > a.h - BORDER - r - 10) continue;
      const blocked = this.obstacles.some(o => { const [hw, hh] = halfSize(o); return Math.abs(o.x - x) < hw + r + 6 && Math.abs(o.y - y) < hh + r + 6; })
        || this.barrels.some(b => !b.dead && Math.hypot(b.x - x, b.y - y) < b.r + r + 10);
      if (!blocked) return { x, y };
    }
    return null;
  },

  // ---------- Stars ----------

  // Live state of every star goal: ok (met so far) | fail (lost) | pending.
  starGoals() {
    if (this.tutorial) return [];
    const h = this.hero;
    const done = this.state === 'victory';
    const list = [{ text: 'Победить', state: done ? 'ok' : this.state === 'defeat' ? 'fail' : 'pending', progress: '' }];
    for (const g of this.config.stars) {
      const v = g.value;
      let state, progress;
      switch (g.type) {
        case 'hp': {
          const pct = Math.max(0, Math.round(h.hp / h.maxHp * 100));
          state = pct >= v ? 'ok' : done ? 'fail' : 'pending';
          progress = pct + '%';
          break;
        }
        case 'time': {
          const t = Math.floor(this.levelTime);
          state = t <= v ? 'ok' : 'fail';
          progress = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
          break;
        }
        case 'streak':
          state = this.streak.best >= v ? 'ok' : done ? 'fail' : 'pending';
          progress = `${Math.min(this.streak.best, v)}/${v}`;
          break;
        case 'hits':
          state = this.hitsTaken <= v ? 'ok' : 'fail';
          progress = `${this.hitsTaken}/${v}`;
          break;
      }
      if (this.state === 'defeat') state = 'fail';
      list.push({ text: STAR_GOALS[g.type].text(v), state, progress });
    }
    return list;
  },

  win() {
    // starGoals() counts the level as won only once state is victory.
    this.setState('victory');
    const final = this.starGoals();
    const stars = final.filter(g => g.state === 'ok').length;
    const bonus = this.config.reward + stars * 10;
    this.result = {
      goals: final,
      stars,
      coins: this.hero.coins,
      bonus,
      kills: this.kills,
      time: this.levelTime,
      best: this.streak.best,
      level: this.level,
      boss: this.config.boss,
    };
    this.emit('victory', this.result);
  },

  lose() {
    const h = this.hero;
    h.dead = true;
    h.hp = 0;
    Fx.blood(h.x, h.y, 0, 30);
    Render.splat(h.x, h.y, 24, '#6e0f0f', 0.8);
    this.setState('defeat');
    this.result = {
      goals: this.starGoals(),
      stars: 0,
      coins: Math.floor(h.coins / 2),
      kills: this.kills,
      wave: this.waveIndex + 1,
      waves: this.config.waves.length,
      level: this.level,
      best: this.streak.best,
    };
    this.emit('defeat', this.result);
  },

  // ---------- Hero skills ----------

  useSkill() {
    const h = this.hero, sk = h.skill;
    if (this.state !== 'play' || h.dead || sk.t > 0) return;
    sk.t = sk.cd;
    const p = sk.power;
    const f = h.facing;

    switch (sk.id) {
      case 'grenade': {
        const t = this.target || this.nearestZombie(h.x, h.y, 520);
        const tx = t ? t.x : h.x + Math.cos(f) * 260, ty = t ? t.y : h.y + Math.sin(f) * 260;
        Weapons.projectiles.push({
          w: { radius: 135, color: '#ffcf7a' }, type: 'grenade', x: h.x, y: h.y, sx: h.x, sy: h.y, tx, ty,
          t: 0, dur: 0.55, z: 0, spin: 0, damage: 160 * p,
        });
        break;
      }
      case 'heal': {
        const heal = Math.min(h.maxHp - h.hp, Math.round(h.maxHp * 0.4 * p));
        h.hp += heal;
        Fx.text(h.x, h.y - 30, '+' + heal, '#5aff7a', 20);
        Fx.ring(h.x, h.y, 90, '#5aff7a', 0.5, 6);
        h.stats.regen += 3;
        this.buffs.push({ t: 5, end: () => { h.stats.regen -= 3; } });
        break;
      }
      case 'dash': {
        const m = Math.hypot(h.vx, h.vy) > 20 ? Math.atan2(h.vy, h.vx) : f;
        h.dash = { t: 0.3, vx: Math.cos(m) * 950, vy: Math.sin(m) * 950, hit: new Set(), dmg: 70 * p };
        h.invuln = Math.max(h.invuln, 0.45);
        Fx.ring(h.x, h.y, 50, '#ffcf7a', 0.3, 5);
        break;
      }
      case 'turret':
        this.turrets.push({ x: h.x + Math.cos(f) * 34, y: h.y + Math.sin(f) * 34, t: 10, cd: 0.4, a: f, dmg: 12 * p });
        Fx.burst(h.x + Math.cos(f) * 34, h.y + Math.sin(f) * 34, 10, { speed: 140, life: 0.4, size: 3, color: '#e0c040', kind: 'spark' });
        break;
      case 'airstrike': {
        const c = this.target || this.nearestZombie(h.x, h.y, 500) || h;
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 70 + Math.random() * 190;
          this.strikes.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, t: 0.8 + i * 0.17, max: 0.8 + i * 0.17, r: 95, dmg: 110 * p });
        }
        this.banner('АВИАУДАР', '#ff7a3a', 1.2);
        break;
      }
      case 'freeze':
        for (const z of this.zombies) {
          if (z.state !== 'alive' || Math.hypot(z.x - h.x, z.y - h.y) > 340) continue;
          z.slow = 3 * p;
          z.slowMul = z.boss ? 0.5 : 0.04;
          Fx.burst(z.x, z.y, 4, { speed: 80, life: 0.5, size: 3, color: '#bff0ff', kind: 'spark' });
        }
        Fx.ring(h.x, h.y, 340, '#9fe6ff', 0.6, 8);
        Fx.flash(h.x, h.y, 200, 'rgba(160,230,255,1)', 0.25);
        break;
      case 'frenzy':
        h.stats.damage += 0.5 * p;
        h.stats.rate += 0.5;
        h.frenzy = 6;
        this.buffs.push({ t: 6, end: () => { h.stats.damage -= 0.5 * p; h.stats.rate -= 0.5; } });
        Fx.ring(h.x, h.y, 70, '#ff5a3a', 0.4, 6);
        break;
    }
  },

  updateSkills(dt) {
    const h = this.hero;
    const wasCharging = h.skill.t > 0;
    h.skill.t = Math.max(0, h.skill.t - dt);
    if (wasCharging && h.skill.t === 0 && typeof Hints !== 'undefined') Hints.skill(h.skill);
    h.frenzy = Math.max(0, h.frenzy - dt);

    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.t -= dt;
      if (b.t <= 0) { b.end(); this.buffs.splice(i, 1); }
    }

    if (h.dash) {
      const d = h.dash;
      h.x += d.vx * dt;
      h.y += d.vy * dt;
      this.collideCircle(h);
      Fx.particle(h.x, h.y, -d.vx * 0.1, -d.vy * 0.1, 0.3, 8, '#5a4a3a', 'smoke', 3);
      for (const z of this.zombies) {
        if (z.state !== 'alive' || d.hit.has(z) || Math.hypot(z.x - h.x, z.y - h.y) > z.r + h.r + 10) continue;
        d.hit.add(z);
        this.damageZombie(z, d.dmg, { angle: Math.atan2(d.vy, d.vx), knock: 520, kind: 'dash' });
      }
      d.t -= dt;
      if (d.t <= 0) h.dash = null;
    }

    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.t -= dt;
      t.cd -= dt;
      const z = this.nearestZombie(t.x, t.y, 420);
      if (z) {
        t.a = Math.atan2(z.y - t.y, z.x - t.x);
        if (t.cd <= 0) {
          t.cd = 0.17;
          const p = Weapons.spawn(TURRET_GUN, t.x + Math.cos(t.a) * 16, t.y + Math.sin(t.a) * 16, t.a + (Math.random() - 0.5) * 0.06, TURRET_GUN.speed, { radius: 2, pierce: 0 });
          p.damage = t.dmg;
          Fx.flash(t.x + Math.cos(t.a) * 18, t.y + Math.sin(t.a) * 18, 14, 'rgba(255,220,140,1)', 0.05);
        }
      }
      if (t.t <= 0) {
        Fx.burst(t.x, t.y, 10, { speed: 160, life: 0.4, size: 3, color: ['#e0c040', '#888'], kind: 'spark' });
        this.turrets.splice(i, 1);
      }
    }

    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.explode(s.x, s.y, s.r, s.dmg, 'player');
        this.strikes.splice(i, 1);
      }
    }
  },

  // ---------- Menu background: a district at night with wandering zombies ----------

  startMenuScene(level) {
    this.level = Math.max(1, Math.min(100, level));
    this.config = levelConfig(this.level);
    this.arena = { w: this.config.arena.w, h: this.config.arena.h };
    this.district = this.config.district;
    const rng = makeRng(this.level * 7919 + 17);
    this.obstacles = generateObstacles(this.arena, rng);
    this.barrels = this.placeBarrels(this.config.barrels || 4, rng);
    this.zombies = [];
    this.pickups = [];
    this.banners = [];
    this.tutorial = null;
    this.hint = null;
    this.hintQueue = [];
    this.boss = null;
    this.bossPending = -1;
    this.darkness = this.darknessTarget = 0;
    this.fog = false;
    this.turrets = [];
    this.strikes = [];
    this.buffs = [];
    Fx.reset();
    Weapons.reset();
    Zombies.reset();
    Bosses.reset();
    this.hero = this.makeHero();
    this.hero.dead = true; // not drawn
    this.time = 0;
    Render.buildMap(this);
    this.setState('menu');
    this.menuSpawn = 0;
    for (let i = 0; i < 12; i++) this.spawnMenuZombie(true);
  },

  spawnMenuZombie(instant) {
    const types = Object.keys(ZOMBIES).filter(t => ZOMBIES[t].unlock <= Math.max(this.level, 6));
    const type = types[Math.floor(Math.random() * types.length)];
    const a = this.arena, r = ZOMBIES[type].radius;
    for (let i = 0; i < 20; i++) {
      const x = BORDER + 40 + Math.random() * (a.w - 2 * BORDER - 80);
      const y = BORDER + 40 + Math.random() * (a.h - 2 * BORDER - 80);
      if (this.obstacleAt(x, y)) continue;
      const z = Zombies.spawn(this, type, x, y);
      if (instant) { z.state = 'alive'; z.riseT = RISE_TIME; }
      return;
    }
  },

  updateMenu(dt, view) {
    this.time += dt;
    const a = this.arena;
    for (const z of this.zombies) {
      if (z.state === 'rising') {
        z.riseT += dt;
        if (z.riseT >= RISE_TIME) z.state = 'alive';
        continue;
      }
      if (!z.wp || Math.hypot(z.wp.x - z.x, z.wp.y - z.y) < 20 || Math.random() < dt * 0.1) {
        z.wp = { x: BORDER + 40 + Math.random() * (a.w - 2 * BORDER - 80), y: BORDER + 40 + Math.random() * (a.h - 2 * BORDER - 80) };
      }
      const dx = z.wp.x - z.x, dy = z.wp.y - z.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(z.speed, 70) * 0.6;
      z.x += dx / d * sp * dt;
      z.y += dy / d * sp * dt;
      z.facing = Math.atan2(dy, dx);
      z.walk += dt * sp / 25;
      this.collideCircle(z);
    }
    Zombies.separate(this.zombies);

    // Keep the street alive: now and then one more digs out, the oldest leaves.
    this.menuSpawn -= dt;
    if (this.menuSpawn <= 0) {
      this.menuSpawn = 4 + Math.random() * 3;
      if (this.zombies.length >= 16) this.zombies.shift();
      this.spawnMenuZombie(false);
    }
    Fx.update(dt);

    // Slow drifting camera.
    const t = this.time;
    this.camera.x = a.w / 2 + Math.cos(t * 0.05) * a.w * 0.28;
    this.camera.y = a.h / 2 + Math.sin(t * 0.07) * a.h * 0.25;
    this.clampCamera(view);
  },

  // ---------- Perks ----------

  addXp(v) {
    const h = this.hero;
    if (this.tutorial) {
      // Level-ups in the tutorial happen only on the perk step.
      h.xp = Math.min(h.xp + v, xpToLevel(h.lvl) - 1);
      return;
    }
    h.xp += v;
    while (h.xp >= xpToLevel(h.lvl)) {
      h.xp -= xpToLevel(h.lvl);
      h.lvl++;
      this.pendingPerks++;
      Fx.ring(h.x, h.y, 70, '#5ad8ff', 0.5, 5);
    }
  },

  openPerks() {
    const pool = PERKS.filter(p => (this.perks[p.id] || 0) < p.max);
    if (!pool.length) {
      this.pendingPerks = 0;
      return;
    }
    const choices = [];
    while (choices.length < 3 && pool.length) {
      choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    this.perkChoices = choices;
    this.setState('perk');
    if (typeof Hints !== 'undefined') Hints.trigger('perk');
  },

  choosePerk(i) {
    const perk = this.perkChoices[i];
    if (!perk || this.stateTime < 0.25) return;
    this.applyPerk(perk.id);
    this.pendingPerks--;
    this.perkChoices = [];
    this.setState('play');
    this.hero.invuln = Math.max(this.hero.invuln, 0.6);
    this.banner(perk.name, perk.color, 1.4);
  },

  applyPerk(id) {
    const h = this.hero, s = h.stats;
    this.perks[id] = (this.perks[id] || 0) + 1;
    switch (id) {
      case 'damage':    s.damage += 0.2; break;
      case 'firerate':  s.rate += 0.15; break;
      case 'speed':     s.speed += 0.12; break;
      case 'maxhp':     h.maxHp += 25; h.hp = Math.min(h.maxHp, h.hp + 50); break;
      case 'magnet':    s.magnet += 0.6; break;
      case 'regen':     s.regen += 1.5; break;
      case 'multishot': s.extra += 1; break;
      case 'pierce':    s.pierce += 1; break;
      case 'crit':      s.crit += 0.1; break;
      case 'saw':       s.saws += 1; break;
      case 'ice':       s.ice += 1; break;
      case 'fire':      s.fire += 1; break;
      case 'boom':      s.boom += 1; break;
    }
  },

  sawPositions() {
    const n = this.hero.stats.saws, out = [];
    for (let i = 0; i < n; i++) {
      const a = this.sawAngle + i * Math.PI * 2 / n;
      out.push({ x: this.hero.x + Math.cos(a) * SAW_RADIUS, y: this.hero.y + Math.sin(a) * SAW_RADIUS, a });
    }
    return out;
  },

  updateSaws(dt) {
    const s = this.hero.stats;
    if (!s.saws) return;
    this.sawAngle += dt * 4.2;
    for (const p of this.sawPositions()) {
      for (const z of this.zombies) {
        if (z.state !== 'alive' || (z.sawCd && z.sawCd > this.time)) continue;
        if (Math.hypot(z.x - p.x, z.y - p.y) > z.r + SAW_SIZE) continue;
        z.sawCd = this.time + 0.3;
        const ang = Math.atan2(z.y - this.hero.y, z.x - this.hero.x);
        this.damageZombie(z, 14 * s.damage, { angle: ang, knock: 120, kind: 'saw' });
        Fx.burst(p.x, p.y, 3, { angle: p.a + Math.PI / 2, cone: 0.8, speed: 220, life: 0.15, size: 2, color: '#ffe08a', kind: 'spark' });
      }
      for (const b of this.barrels) {
        if (!b.dead && Math.hypot(b.x - p.x, b.y - p.y) < b.r + SAW_SIZE) this.damageBarrel(b, 10);
      }
    }
  },

  // ---------- Damage ----------

  damageZombie(z, amount, opt = {}) {
    if (z.state !== 'alive') return;
    const kind = opt.kind || 'bullet';
    const st = this.hero.stats;
    const direct = kind === 'bullet' || kind === 'bolt' || kind === 'plasma' || kind === 'tesla';
    let dmg = amount;
    let armored = false;
    if (z.def.armor && kind !== 'explosion' && kind !== 'burn' && kind !== 'tesla') {
      dmg *= 1 - z.def.armor;
      armored = true;
    }
    const crit = (kind === 'bullet' || kind === 'bolt' || kind === 'plasma' || kind === 'saw') && Math.random() < 0.08 + st.crit;
    if (crit) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));

    z.hp -= dmg;
    z.flash = 0.1;

    if (opt.burn) z.burn = { dps: opt.burn.dps, t: opt.burn.time, acc: z.burn ? z.burn.acc : 0 };

    // Ice / incendiary perks ride on direct hits.
    if (direct && st.ice) {
      z.slow = 1.5 + st.ice * 0.5;
      z.slowMul = 1 - Math.min(0.7, 0.3 + st.ice * 0.12) * (z.boss ? 0.4 : 1);
    }
    if (direct && st.fire) {
      const dps = 4 + st.fire * 4;
      if (!z.burn || z.burn.dps < dps) z.burn = { dps, t: 2.5, acc: z.burn ? z.burn.acc : 0 };
      else z.burn.t = Math.max(z.burn.t, 2.5);
    }

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
    if (z.boss && Bosses.onLethal(this, z)) return;
    z.state = 'dead';
    if (z.boss) Bosses.onDeath(this, z);
    const angle = opt.angle !== undefined ? opt.angle : Math.random() * Math.PI * 2;

    if (z.def.behavior === 'explode') {
      Fx.burst(z.x, z.y, 24, { speed: 320, life: 0.6, size: 5, color: ['#9bb34a', '#7a8a3a', '#5a1a14'], kind: 'acid', drag: 4 });
      Render.splat(z.x, z.y, z.def.blastRadius * 0.4, '#4a5a1f', 0.4);
      const heroDmg = Math.round(z.def.blastDamage * z.dmgMul);
      this.explode(z.x, z.y, z.def.blastRadius, heroDmg * 2, 'zombie', heroDmg);
    } else {
      Fx.blood(z.x, z.y, angle, 14);
      Fx.burst(z.x, z.y, 6, { angle, cone: 2, speed: 220, life: 0.5, size: 5, color: ['#5c0b0b', z.def.color], kind: 'gore', drag: 5 });
      Render.splat(z.x, z.y, z.r * 1.3, '#6e0f0f', 0.75);
    }

    if (opt.kind === 'self') return; // bloater blew itself up — no reward

    this.kills++;
    this.drop(z);

    const boom = this.hero.stats.boom;
    if (boom && opt.kind !== 'perk-boom' && Math.random() < 0.2 * boom) {
      Fx.explosion(z.x, z.y, 70);
      for (const o of this.zombies) {
        if (o.state === 'alive' && Math.hypot(o.x - z.x, o.y - z.y) < 70 + o.r) {
          this.damageZombie(o, 25 * this.hero.stats.damage, { angle: Math.atan2(o.y - z.y, o.x - z.x), knock: 200, kind: 'perk-boom' });
        }
      }
    }

    const s = this.streak;
    s.count++;
    s.timer = STREAK_TIME;
    s.best = Math.max(s.best, s.count);
    if (STREAK_MILESTONES[s.count]) {
      this.banner(`СЕРИЯ ×${s.count}`, '#ff7a3a', 1.8, STREAK_MILESTONES[s.count]);
      Fx.addShake(4);
      if (s.count === 10 && typeof Hints !== 'undefined') Hints.trigger('streak');
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
    if (h.invuln > 0 || h.dead || this.state !== 'play') return;
    if (this.tutorial) {
      // Immortal in the tutorial: just a flinch.
      h.hurt = 0.25;
      h.invuln = 0.3;
      return;
    }
    h.hp -= dmg;
    h.hurt = 0.35;
    h.invuln = 0.2;
    this.hitsTaken++;
    Fx.text(h.x, h.y - 26, '-' + dmg, '#ff4a4a', 18);
    Fx.blood(h.x, h.y, src ? Math.atan2(h.y - src.y, h.x - src.x) : 0, 6);
    Fx.addShake(5);
    if (src) {
      const a = Math.atan2(h.y - src.y, h.x - src.x);
      h.x += Math.cos(a) * 10;
      h.y += Math.sin(a) * 10;
      this.collideCircle(h);
    }
    if (h.hp <= 0) this.lose();
    else if (h.hp < h.maxHp * 0.35 && typeof Hints !== 'undefined') Hints.trigger('lowhp');
  },

  // ---------- Pickups ----------

  updatePickups(dt) {
    const h = this.hero;
    const magnet = h.magnet * h.stats.magnet;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.life -= dt;
      p.bob += dt * 5;
      const dx = h.x - p.x, dy = h.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const wanted = p.kind !== 'medkit' || h.hp < h.maxHp;

      if (wanted && d < magnet) p.magnet = true;
      if (p.magnet && wanted) {
        p.pull = (p.pull || 0) + dt * 600;
        const sp = Math.min(900, 200 + (magnet - Math.min(d, magnet)) * 6 + p.pull);
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
          this.addXp(p.value);
        } else if (p.kind === 'coin') {
          h.coins += p.value;
          Fx.text(h.x, h.y - 30, '+' + p.value, '#ffd23a', 13);
        } else if (p.kind === 'medkit') {
          const heal = Math.min(p.value, h.maxHp - h.hp);
          h.hp += heal;
          Fx.text(h.x, h.y - 30, '+' + Math.round(heal), '#5aff7a', 18);
          Fx.ring(h.x, h.y, 40, '#5aff7a', 0.3, 3);
        }
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0 && !p.magnet) this.pickups.splice(i, 1);
    }
  },

  updateStreak(dt) {
    const s = this.streak;
    if (s.count > 0) {
      s.timer -= dt;
      if (s.timer <= 0) s.count = 0;
    }
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
