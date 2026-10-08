// Short-lived visual effects: particles, damage numbers, rings, arcs, shake.
// Only state + update here; drawing lives in render.js.

const MAX_PARTICLES = 700; // default; lowered by adaptive quality on slow devices
const MAX_TEXTS = 90;

const Fx = {
  maxParticles: MAX_PARTICLES,
  particles: [],
  texts: [],
  rings: [],
  arcs: [],
  flashes: [],
  shake: 0,

  reset() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.arcs.length = 0;
    this.flashes.length = 0;
    this.shake = 0;
  },

  // kind: blood | spark | smoke | fire | dirt | gore | acid | plasma
  particle(x, y, vx, vy, life, size, color, kind, drag = 3) {
    if (this.particles.length >= this.maxParticles) {
      // Drop an older particle without shifting the whole array.
      this.particles[Math.floor(Math.random() * this.particles.length)] = this.particles[this.particles.length - 1];
      this.particles.pop();
    }
    this.particles.push({ x, y, vx, vy, life, max: life, size, color, kind, drag });
  },

  burst(x, y, count, opt) {
    for (let i = 0; i < count; i++) {
      const a = opt.angle !== undefined
        ? opt.angle + (Math.random() - 0.5) * (opt.cone || Math.PI * 2)
        : Math.random() * Math.PI * 2;
      const sp = opt.speed * (0.3 + Math.random() * 0.9);
      this.particle(
        x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        opt.life * (0.6 + Math.random() * 0.6),
        opt.size * (0.6 + Math.random() * 0.8),
        Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : opt.color,
        opt.kind, opt.drag
      );
    }
  },

  blood(x, y, angle, amount, color = '#8a1414') {
    this.burst(x, y, amount, { angle, cone: 1.4, speed: 260, life: 0.45, size: 3, color: [color, '#5c0b0b', '#a51d1d'], kind: 'blood', drag: 5 });
  },

  // Brass casing thrown to the right of the shooting direction.
  shell(x, y, angle) {
    const side = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const sp = 110 + Math.random() * 90;
    this.particle(x, y, Math.cos(side) * sp, Math.sin(side) * sp, 0.55, 2.4, '#e0b040', 'shell', 5);
    const p = this.particles[this.particles.length - 1];
    p.rot = Math.random() * 6.28;
    p.vr = (Math.random() - 0.5) * 30;
  },

  text(x, y, text, color = '#fff', size = 16) {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({ x: x + (Math.random() - 0.5) * 14, y, vy: -70, text: String(text), color, size, life: 0.8, max: 0.8 });
  },

  ring(x, y, radius, color, life = 0.35, width = 6) {
    this.rings.push({ x, y, radius, color, life, max: life, width });
  },

  flash(x, y, radius, color, life = 0.12) {
    this.flashes.push({ x, y, radius, color, life, max: life });
  },

  arc(points, color, life = 0.14) {
    this.arcs.push({ points, color, life, max: life });
  },

  explosion(x, y, radius) {
    this.flash(x, y, radius * 1.1, 'rgba(255,200,110,1)', 0.18);
    this.ring(x, y, radius, '#ffcf7a', 0.4, 8);
    // A second, faster white shockwave ring.
    this.ring(x, y, radius * 1.35, 'rgba(255,255,255,0.9)', 0.22, 3);
    this.burst(x, y, 26, { speed: radius * 3, life: 0.5, size: 6, color: ['#ffb547', '#ff7a2a', '#ffe08a'], kind: 'fire', drag: 4 });
    this.burst(x, y, 14, { speed: radius * 1.4, life: 1.1, size: 12, color: ['#3a3633', '#4a4440', '#2a2724'], kind: 'smoke', drag: 2 });
    this.burst(x, y, 10, { speed: radius * 3.5, life: 0.6, size: 3, color: '#2a2622', kind: 'dirt', drag: 3 });
    Render.scorch(x, y, radius * 0.7);
    this.addShake(Math.min(14, radius / 10));
  },

  addShake(v) {
    this.shake = Math.min(18, Math.max(this.shake, v));
  },

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 40);

    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.kind === 'blood' && Math.random() < 0.22) Render.splat(p.x, p.y, p.size * 0.9, p.color, 0.7);
        if (p.kind === 'shell' && Math.random() < 0.5) Render.shellDecal(p.x, p.y, p.rot);
        if (p.kind === 'acid' && Math.random() < 0.12) Render.splat(p.x, p.y, p.size * 0.8, '#5f7a2a', 0.35);
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'smoke') p.size += dt * 14;
      else if (p.kind === 'shell') p.rot += p.vr * dt;
    }

    for (const list of [this.texts, this.rings, this.arcs, this.flashes]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        e.life -= dt;
        if (e.life <= 0) { list.splice(i, 1); continue; }
        if (e.vy !== undefined) { e.y += e.vy * dt; e.vy *= Math.exp(-2.5 * dt); }
      }
    }
  },
};
