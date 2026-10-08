// Firing and projectiles for every weapon type:
// bullet, bolt, flame, grenade, tesla, plasma, rocket.

const Weapons = {
  projectiles: [],

  reset() {
    this.projectiles.length = 0;
  },

  muzzle(hero, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { x: hero.x + c * 28 - s * 5, y: hero.y + s * 28 + c * 5 };
  },

  // target: zombie (auto aim) or null; aimPoint: world point for grenades
  fire(game, w, angle, target, aimPoint) {
    const h = game.hero;
    const m = this.muzzle(h, angle);

    switch (w.type) {
      case 'bullet': {
        const n = w.pellets || 1;
        for (let i = 0; i < n; i++) {
          const a = angle + (n > 1 ? (i / (n - 1) - 0.5) * w.spread : 0) + (Math.random() - 0.5) * w.spread * (n > 1 ? 0.3 : 1);
          const sp = w.speed * (n > 1 ? 0.85 + Math.random() * 0.3 : 1);
          this.spawn(w, m.x, m.y, a, sp, { radius: 2, pierce: 0 });
        }
        Fx.flash(m.x, m.y, n > 1 ? 30 : 20, 'rgba(255,220,140,1)', 0.06);
        Fx.burst(m.x, m.y, 3, { angle, cone: 0.6, speed: 260, life: 0.12, size: 2, color: '#ffe08a', kind: 'spark' });
        if (n > 1) Fx.addShake(3);
        break;
      }
      case 'bolt':
        this.spawn(w, m.x, m.y, angle, w.speed, { radius: 3, pierce: w.pierce || 0 });
        break;
      case 'flame':
        for (let i = 0; i < 2; i++) {
          const a = angle + (Math.random() - 0.5) * 0.28;
          this.spawn(w, m.x, m.y, a, w.speed * (0.8 + Math.random() * 0.4), { radius: 6, pierce: 99, grow: 1 });
        }
        break;
      case 'grenade': {
        let tx = aimPoint ? aimPoint.x : h.x + Math.cos(angle) * w.range;
        let ty = aimPoint ? aimPoint.y : h.y + Math.sin(angle) * w.range;
        const d = Math.hypot(tx - m.x, ty - m.y);
        if (d > w.range) {
          tx = m.x + (tx - m.x) / d * w.range;
          ty = m.y + (ty - m.y) / d * w.range;
        }
        this.projectiles.push({
          w, type: 'grenade', x: m.x, y: m.y, sx: m.x, sy: m.y, tx, ty,
          t: 0, dur: 0.35 + Math.min(d, w.range) / 900, z: 0, spin: 0,
        });
        Fx.flash(m.x, m.y, 16, 'rgba(200,255,160,1)', 0.06);
        break;
      }
      case 'tesla':
        this.tesla(game, w, m, angle, target);
        break;
      case 'plasma':
        this.spawn(w, m.x, m.y, angle, w.speed, { radius: 9, pierce: w.pierce || 0 });
        Fx.flash(m.x, m.y, 26, 'rgba(200,120,255,1)', 0.08);
        break;
      case 'rocket': {
        const p = this.spawn(w, m.x, m.y, angle, w.speed, { radius: 5, pierce: 0 });
        p.target = target;
        p.life = 3;
        Fx.flash(m.x, m.y, 30, 'rgba(255,160,90,1)', 0.08);
        Fx.addShake(4);
        break;
      }
    }
  },

  spawn(w, x, y, angle, speed, opt) {
    const p = {
      w, type: w.type, x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      life: w.range / speed,
      damage: w.damage,
      radius: opt.radius,
      pierce: opt.pierce,
      grow: opt.grow || 0,
      hit: new Set(),
    };
    p.max = p.life;
    this.projectiles.push(p);
    return p;
  },

  tesla(game, w, m, angle, target) {
    let first = target && target.state === 'alive' ? target : null;
    if (!first) {
      let best = Infinity;
      for (const z of game.zombies) {
        if (z.state !== 'alive') continue;
        const dx = z.x - m.x, dy = z.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d > w.range) continue;
        let da = Math.abs(Math.atan2(dy, dx) - angle);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if (da < 0.45 && d < best) { best = d; first = z; }
      }
    }

    if (!first || Math.hypot(first.x - m.x, first.y - m.y) > w.range + first.r) {
      const end = { x: m.x + Math.cos(angle) * 110, y: m.y + Math.sin(angle) * 110 };
      Fx.arc(this.jagged(m, end), w.color, 0.08);
      return;
    }

    const hit = new Set();
    let from = m, cur = first, dmg = w.damage;
    for (let i = 0; i <= (w.chains || 0) && cur; i++) {
      hit.add(cur);
      Fx.arc(this.jagged(from, cur), w.color);
      Fx.burst(cur.x, cur.y, 4, { speed: 180, life: 0.2, size: 2, color: ['#bff0ff', '#8fd8ff'], kind: 'spark' });
      const ang = Math.atan2(cur.y - from.y, cur.x - from.x);
      game.damageZombie(cur, dmg, { angle: ang, knock: 40, kind: 'tesla' });
      from = cur;
      dmg *= 0.85;
      let next = null, best = w.chainRange;
      for (const z of game.zombies) {
        if (z.state !== 'alive' || hit.has(z)) continue;
        const d = Math.hypot(z.x - from.x, z.y - from.y);
        if (d < best) { best = d; next = z; }
      }
      cur = next;
    }
    Fx.flash(m.x, m.y, 22, 'rgba(160,220,255,1)', 0.08);
  },

  jagged(a, b) {
    const pts = [{ x: a.x, y: a.y }];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const n = Math.max(3, Math.round(len / 22));
    const nx = -dy / (len || 1), ny = dx / (len || 1);
    for (let i = 1; i < n; i++) {
      const t = i / n, off = (Math.random() - 0.5) * 22;
      pts.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
    }
    pts.push({ x: b.x, y: b.y });
    return pts;
  },

  update(game, dt) {
    const list = this.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const alive = p.type === 'grenade' ? this.updateGrenade(game, p, dt) : this.updateShot(game, p, dt);
      if (!alive) {
        list[i] = list[list.length - 1];
        list.pop();
      }
    }
  },

  updateGrenade(game, p, dt) {
    p.t += dt;
    const k = Math.min(1, p.t / p.dur);
    p.x = p.sx + (p.tx - p.sx) * k;
    p.y = p.sy + (p.ty - p.sy) * k;
    p.z = Math.sin(Math.PI * k) * (30 + p.dur * 60);
    p.spin += dt * 14;
    if (k >= 1) {
      game.explode(p.x, p.y, p.w.radius, p.w.damage, 'player');
      return false;
    }
    return true;
  },

  updateShot(game, p, dt) {
    const w = p.w;

    if (p.type === 'rocket') {
      const t = p.target && p.target.state === 'alive' ? p.target : null;
      let sp = Math.hypot(p.vx, p.vy);
      sp = Math.min(950, sp + 1300 * dt);
      if (t) {
        const want = Math.atan2(t.y - p.y, t.x - p.x);
        let diff = want - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
      }
      p.vx = Math.cos(p.angle) * sp;
      p.vy = Math.sin(p.angle) * sp;
      Fx.particle(p.x - p.vx * 0.02, p.y - p.vy * 0.02, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.6, 5, '#5a5450', 'smoke', 2);
      if (Math.random() < 0.6) Fx.particle(p.x, p.y, -p.vx * 0.1, -p.vy * 0.1, 0.12, 4, '#ffb547', 'fire', 4);
    }

    const ox = p.x, oy = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.grow) p.radius = 6 + (1 - p.life / p.max) * 18;

    // Walls and obstacles
    const o = game.obstacleAt(p.x, p.y);
    if (o || game.outsideArena(p.x, p.y)) {
      this.impact(game, p, ox, oy, true);
      return false;
    }

    // Barrels
    for (const b of game.barrels) {
      if (b.dead) continue;
      if (segDist(ox, oy, p.x, p.y, b.x, b.y) < b.r + p.radius) {
        game.damageBarrel(b, p.type === 'flame' ? p.damage * 3 : p.damage);
        if (p.type !== 'flame') {
          this.impact(game, p, p.x, p.y, true);
          return false;
        }
      }
    }

    // Zombies
    for (const z of game.zombies) {
      if (z.state !== 'alive' || p.hit.has(z)) continue;
      if (segDist(ox, oy, p.x, p.y, z.x, z.y) >= z.r + p.radius) continue;
      p.hit.add(z);
      const ang = Math.atan2(p.vy, p.vx);

      if (p.type === 'rocket') {
        game.explode(p.x, p.y, w.radius, p.damage, 'player');
        return false;
      }
      if (p.type === 'plasma') {
        Fx.ring(p.x, p.y, w.radius, '#c46bff', 0.25, 4);
        Fx.burst(p.x, p.y, 8, { speed: 220, life: 0.3, size: 3, color: ['#e2b0ff', '#c46bff'], kind: 'plasma' });
        game.splash(p.x, p.y, w.radius, p.damage * 0.4, z);
      }

      game.damageZombie(z, p.damage, {
        angle: ang,
        knock: w.knock || (p.type === 'flame' ? 5 : 60),
        kind: p.type,
        burn: w.burn,
      });

      if (p.type === 'bolt') p.damage *= 0.85;
      p.pierce--;
      if (p.pierce < 0) {
        if (p.type === 'plasma') this.impact(game, p, p.x, p.y, false);
        return false;
      }
    }

    if (p.life <= 0) {
      if (p.type === 'rocket') game.explode(p.x, p.y, w.radius, p.damage, 'player');
      else if (p.type === 'plasma') this.impact(game, p, p.x, p.y, false);
      return false;
    }
    return true;
  },

  impact(game, p, x, y, wall) {
    switch (p.type) {
      case 'rocket':
        game.explode(x, y, p.w.radius, p.damage, 'player');
        break;
      case 'plasma':
        Fx.ring(x, y, p.w.radius * 0.8, '#c46bff', 0.25, 4);
        Fx.burst(x, y, 10, { speed: 200, life: 0.3, size: 3, color: ['#e2b0ff', '#c46bff'], kind: 'plasma' });
        game.splash(x, y, p.w.radius, p.damage * 0.4, null);
        break;
      case 'flame':
        break;
      default:
        if (wall) Fx.burst(x, y, 4, { angle: Math.atan2(-p.vy, -p.vx), cone: 1.6, speed: 180, life: 0.18, size: 2, color: ['#ffe08a', '#bbb'], kind: 'spark' });
    }
  },
};

// Distance from point (px, py) to segment (ax, ay)–(bx, by).
function segDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}
