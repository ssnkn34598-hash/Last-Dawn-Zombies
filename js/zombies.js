// Zombie spawning (rising from the ground) and per-type behaviour:
// chase, lunge, ranged (spit), explode, scream, leap.

const RISE_TIME = 0.9;

const Zombies = {
  spits: [],

  reset() {
    this.spits.length = 0;
  },

  spawn(game, type, x, y) {
    const def = ZOMBIES[type];
    const z = {
      type, def, x, y,
      r: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      mass: def.mass || 1,
      state: 'rising',
      riseT: 0,
      flash: 0,
      attackCd: 0,
      kx: 0, ky: 0,          // knockback velocity
      burn: null,
      haste: 0,
      facing: Math.atan2(game.hero.y - y, game.hero.x - x),
      walk: Math.random() * 10,
      side: Math.random() < 0.5 ? -1 : 1,
      detour: 0,
      stuck: 0,
      timer: Math.random() * 1.5, // staggers spit / scream / leap
      mode: 'run',
      fuse: -1,
    };
    game.zombies.push(z);
    Fx.burst(x, y, 12, { speed: 120, life: 0.6, size: 4, color: ['#3b2f22', '#4a3a28', '#2a2118'], kind: 'dirt' });
    Render.crack(x, y, z.r);
    return z;
  },

  update(game, dt) {
    const h = game.hero;
    const zs = game.zombies;

    for (const z of zs) {
      if (z.state === 'rising') {
        z.riseT += dt;
        if (Math.random() < dt * 14) {
          Fx.particle(z.x + (Math.random() - 0.5) * z.r * 2, z.y + (Math.random() - 0.5) * z.r, (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.4, 3, '#3b2f22', 'dirt');
        }
        if (z.riseT >= RISE_TIME) z.state = 'alive';
        continue;
      }
      if (z.state !== 'alive') continue;

      z.flash = Math.max(0, z.flash - dt);
      z.attackCd = Math.max(0, z.attackCd - dt);
      z.haste = Math.max(0, z.haste - dt);
      z.timer -= dt;
      if (z.spitAnim > 0) z.spitAnim -= dt;

      if (z.burn) {
        z.burn.t -= dt;
        z.burn.acc += z.burn.dps * dt;
        if (z.burn.acc >= 4) {
          game.damageZombie(z, z.burn.acc, { kind: 'burn', quiet: false });
          z.burn && (z.burn.acc = 0);
        }
        if (Math.random() < dt * 20) {
          Fx.particle(z.x + (Math.random() - 0.5) * z.r, z.y + (Math.random() - 0.5) * z.r, 0, -50, 0.35, 4, Math.random() < 0.5 ? '#ff8a2a' : '#ffcf5a', 'fire', 1);
        }
        if (z.burn && z.burn.t <= 0) z.burn = null;
        if (z.state !== 'alive') continue;
      }

      const dx = h.x - z.x, dy = h.y - z.y;
      const dist = Math.hypot(dx, dy) || 1;
      let dirX = dx / dist, dirY = dy / dist;
      let speed = z.def.speed * (z.haste > 0 ? 1.6 : 1);

      switch (z.def.behavior) {
        case 'lunge':
          if (dist < z.def.lungeRange) speed *= z.def.lungeMul;
          break;

        case 'ranged':
          if (dist < z.def.keepDist - 40) { dirX = -dirX; dirY = -dirY; }
          else if (dist < z.def.keepDist + 40) {
            const tx = -dirY * z.side, ty = dirX * z.side;
            dirX = tx; dirY = ty; speed *= 0.6;
          }
          if (z.timer <= 0 && dist < z.def.keepDist + 160) {
            z.timer = z.def.spitEvery;
            this.spit(z, h);
          }
          break;

        case 'scream':
          if (dist < 170) speed = 0;
          if (z.timer <= 0 && dist < 420) {
            z.timer = z.def.screamEvery;
            z.screaming = 0.5;
            Fx.ring(z.x, z.y, z.def.screamRadius, '#d6a0ff', 0.6, 4);
            Fx.ring(z.x, z.y, z.def.screamRadius * 0.6, '#d6a0ff', 0.45, 3);
            Fx.text(z.x, z.y - z.r - 10, 'А-А-А!', '#e2c0ff', 14);
            for (const o of zs) {
              if (o !== z && o.state === 'alive' && Math.hypot(o.x - z.x, o.y - z.y) < z.def.screamRadius) o.haste = 3;
            }
          }
          if (z.screaming) z.screaming = Math.max(0, z.screaming - dt);
          break;

        case 'leap':
          if (z.mode === 'run') {
            const [lo, hi] = z.def.leapRange;
            if (z.timer <= 0 && dist > lo && dist < hi) {
              z.mode = 'windup';
              z.modeT = 0.55;
            }
          } else if (z.mode === 'windup') {
            speed = 0;
            z.lx = h.x; z.ly = h.y;
            z.modeT -= dt;
            if (z.modeT <= 0) {
              const ld = Math.hypot(z.lx - z.x, z.ly - z.y) || 1;
              z.mode = 'leap';
              z.modeT = 0.32;
              z.lvx = (z.lx - z.x) / ld * Math.min(1100, ld / 0.32 + 60);
              z.lvy = (z.ly - z.y) / ld * Math.min(1100, ld / 0.32 + 60);
              Fx.burst(z.x, z.y, 6, { speed: 100, life: 0.4, size: 3, color: '#3b2f22', kind: 'dirt' });
            }
          } else if (z.mode === 'leap') {
            z.modeT -= dt;
            speed = 0;
            z.x += z.lvx * dt;
            z.y += z.lvy * dt;
            if (z.modeT <= 0) {
              z.mode = 'run';
              z.timer = z.def.leapEvery;
              Fx.burst(z.x, z.y, 8, { speed: 140, life: 0.4, size: 3, color: '#3b2f22', kind: 'dirt' });
            }
          }
          break;

        case 'explode':
          if (z.fuse >= 0) {
            z.fuse -= dt;
            speed *= 0.3;
            if (z.fuse <= 0) {
              game.killZombie(z, { angle: 0, kind: 'self' });
              continue;
            }
          }
          break;
      }

      // Walk around obstacles when stuck.
      if (z.detour > 0) {
        z.detour -= dt;
        const tx = -dirY * z.side, ty = dirX * z.side;
        dirX = dirX * 0.3 + tx * 0.95;
        dirY = dirY * 0.3 + ty * 0.95;
        const l = Math.hypot(dirX, dirY) || 1;
        dirX /= l; dirY /= l;
      }

      const px = z.x, py = z.y;
      z.x += (dirX * speed + z.kx) * dt;
      z.y += (dirY * speed + z.ky) * dt;
      const kd = Math.exp(-8 * dt);
      z.kx *= kd;
      z.ky *= kd;

      if (speed > 0) {
        z.facing = Math.atan2(dirY, dirX);
        z.walk += dt * speed / 25;
      } else {
        z.facing = Math.atan2(dy, dx);
      }

      game.collideCircle(z);

      // Stuck detection (moved much less than intended).
      const moved = Math.hypot(z.x - px, z.y - py);
      if (speed > 0 && z.mode !== 'leap' && moved < speed * dt * 0.35) {
        z.stuck += dt;
        if (z.stuck > 0.25 && z.detour <= 0) {
          z.detour = 0.7;
          z.stuck = 0;
          if (Math.random() < 0.3) z.side = -z.side;
        }
      } else {
        z.stuck = Math.max(0, z.stuck - dt);
      }

      // Melee
      if (dist < z.r + h.r + 4) {
        if (z.def.behavior === 'explode') {
          if (z.fuse < 0) z.fuse = 0.6;
        } else if (z.attackCd <= 0) {
          z.attackCd = 1;
          game.hurtHero(z.def.damage, z);
        }
      }
    }

    this.separate(zs);
    this.updateSpits(game, dt);
  },

  separate(zs) {
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      if (a.state !== 'alive') continue;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j];
        if (b.state !== 'alive') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d);
        const wa = b.mass / (a.mass + b.mass), wb = a.mass / (a.mass + b.mass);
        a.x -= dx / d * push * wa;
        a.y -= dy / d * push * wa;
        b.x += dx / d * push * wb;
        b.y += dy / d * push * wb;
      }
    }
  },

  spit(z, h) {
    // Lead the target a little.
    const lead = 0.35;
    const tx = h.x + (h.vx || 0) * lead, ty = h.y + (h.vy || 0) * lead;
    const a = Math.atan2(ty - z.y, tx - z.x);
    const sp = 300;
    this.spits.push({ x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.6, damage: z.def.spitDamage });
    z.spitAnim = 0.25;
    Fx.burst(z.x, z.y, 4, { angle: a, cone: 0.6, speed: 120, life: 0.25, size: 3, color: '#9bd34a', kind: 'acid' });
  },

  updateSpits(game, dt) {
    const h = game.hero;
    const s = this.spits;
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (Math.random() < dt * 30) Fx.particle(p.x, p.y, 0, 0, 0.3, 3, '#7fb43a', 'acid', 1);
      let done = p.life <= 0 || game.obstacleAt(p.x, p.y) || game.outsideArena(p.x, p.y);
      if (!done && Math.hypot(p.x - h.x, p.y - h.y) < h.r + 6) {
        game.hurtHero(p.damage, null);
        done = true;
      }
      if (done) {
        Fx.burst(p.x, p.y, 8, { speed: 120, life: 0.35, size: 3, color: ['#9bd34a', '#6f9a2a'], kind: 'acid' });
        Render.splat(p.x, p.y, 8, '#5f7a2a', 0.4);
        s.splice(i, 1);
      }
    }
  },
};
