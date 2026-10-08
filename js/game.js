// Game state: arena, obstacles, hero, camera. No rendering here.

const BORDER = 48;          // barricade thickness along the arena edge
const HERO_RADIUS = 16;

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
    const halfW = o.shape === 'rect' ? o.w / 2 : o.r;
    const halfH = o.shape === 'rect' ? o.h / 2 : o.r;
    const margin = BORDER + 60;
    o.x = margin + halfW + rng() * (arena.w - 2 * (margin + halfW));
    o.y = margin + halfH + rng() * (arena.h - 2 * (margin + halfH));

    // Keep the spawn point in the centre free.
    if (Math.abs(o.x - cx) < 140 + halfW && Math.abs(o.y - cy) < 140 + halfH) continue;

    // Leave walkable gaps between obstacles.
    const gap = 70;
    const clash = list.some(p => {
      const pw = p.shape === 'rect' ? p.w / 2 : p.r;
      const ph = p.shape === 'rect' ? p.h / 2 : p.r;
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
  hero: null,
  camera: { x: 0, y: 0 },
  time: 0,

  start(level) {
    this.level = level;
    this.config = levelConfig(level);
    this.arena = { w: this.config.arena.w, h: this.config.arena.h };
    this.district = this.config.district;

    const rng = makeRng(level * 7919 + 17);
    this.obstacles = generateObstacles(this.arena, rng);

    const heroData = HEROES.max;
    this.hero = {
      name: heroData.name,
      x: this.arena.w / 2,
      y: this.arena.h / 2,
      r: HERO_RADIUS,
      speed: heroData.speed,
      hp: heroData.hp,
      maxHp: heroData.hp,
      color: heroData.color,
      facing: 0,       // radians
      moving: false,
      walkTime: 0,
    };

    this.camera.x = this.hero.x;
    this.camera.y = this.hero.y;
    this.time = 0;
  },

  // move: { x, y } with length 0..1
  update(dt, move, view) {
    this.time += dt;
    const h = this.hero;

    const len = Math.hypot(move.x, move.y);
    h.moving = len > 0.05;
    if (h.moving) {
      h.x += move.x * h.speed * dt;
      h.y += move.y * h.speed * dt;
      h.facing = Math.atan2(move.y, move.x);
      h.walkTime += dt * (0.5 + len);
    }

    // Two passes so corners between neighbouring obstacles settle.
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        const p = resolveCircle(h.x, h.y, h.r, o);
        h.x = p.x;
        h.y = p.y;
      }
    }

    h.x = Math.max(BORDER + h.r, Math.min(this.arena.w - BORDER - h.r, h.x));
    h.y = Math.max(BORDER + h.r, Math.min(this.arena.h - BORDER - h.r, h.y));

    this.updateCamera(dt, view);
  },

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
