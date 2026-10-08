// Drawing. The district map (ground, roads, barricades, obstacles) is
// rendered once into an offscreen canvas; each frame only blits it.

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const Render = {
  map: null,

  buildMap(game) {
    const { w, h } = game.arena;
    const d = game.district;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const rng = makeRng(game.level * 104729 + 3);

    // Ground
    ctx.fillStyle = d.ground;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.25 + rng() * 0.35;
      ctx.fillStyle = rng() < 0.6 ? d.groundAlt : shade(d.ground, -0.04);
      const r = 20 + rng() * 70;
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, r, r * (0.4 + rng() * 0.6), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawRoads(ctx, w, h, d, rng);
    this.drawDecals(ctx, w, h, d, rng);
    this.drawBarricades(ctx, w, h, d, rng);
    for (const o of game.obstacles) this.drawObstacle(ctx, o, d);

    this.map = c;
  },

  drawRoads(ctx, w, h, d, rng) {
    const roadW = 150;
    const ry = h * (0.35 + rng() * 0.3);
    const rx = w * (0.3 + rng() * 0.4);

    // Sidewalks
    ctx.fillStyle = shade(d.road, 0.08);
    ctx.fillRect(0, ry - roadW / 2 - 16, w, roadW + 32);
    ctx.fillRect(rx - roadW / 2 - 16, 0, roadW + 32, h);

    // Asphalt
    ctx.fillStyle = d.road;
    ctx.fillRect(0, ry - roadW / 2, w, roadW);
    ctx.fillRect(rx - roadW / 2, 0, roadW, h);

    // Asphalt grain
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rng() < 0.5 ? shade(d.road, 0.05) : shade(d.road, -0.04);
      const horiz = rng() < 0.5;
      const x = horiz ? rng() * w : rx - roadW / 2 + rng() * roadW;
      const y = horiz ? ry - roadW / 2 + rng() * roadW : rng() * h;
      ctx.fillRect(x, y, 2, 2);
    }

    // Dashed centre lines (skip the crossing)
    ctx.strokeStyle = d.line;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 5;
    ctx.setLineDash([36, 30]);
    ctx.beginPath();
    ctx.moveTo(0, ry); ctx.lineTo(rx - roadW / 2 - 10, ry);
    ctx.moveTo(rx + roadW / 2 + 10, ry); ctx.lineTo(w, ry);
    ctx.moveTo(rx, 0); ctx.lineTo(rx, ry - roadW / 2 - 10);
    ctx.moveTo(rx, ry + roadW / 2 + 10); ctx.lineTo(rx, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zebra crossing
    ctx.fillStyle = '#d8d2c0';
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(rx + roadW / 2 + 14, ry - roadW / 2 + 10 + i * 23, 40, 12);
      ctx.fillRect(rx - roadW / 2 + 10 + i * 23, ry - roadW / 2 - 54, 12, 40);
    }
    ctx.globalAlpha = 1;

    // Kerb lines
    ctx.strokeStyle = shade(d.road, 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, ry - roadW / 2); ctx.lineTo(w, ry - roadW / 2);
    ctx.moveTo(0, ry + roadW / 2); ctx.lineTo(w, ry + roadW / 2);
    ctx.moveTo(rx - roadW / 2, 0); ctx.lineTo(rx - roadW / 2, h);
    ctx.moveTo(rx + roadW / 2, 0); ctx.lineTo(rx + roadW / 2, h);
    ctx.stroke();
  },

  drawDecals(ctx, w, h, d, rng) {
    // Cracks
    ctx.strokeStyle = shade(d.ground, -0.1);
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      let x = rng() * w, y = rng() * h, a = rng() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        a += (rng() - 0.5) * 1.2;
        x += Math.cos(a) * (10 + rng() * 18);
        y += Math.sin(a) * (10 + rng() * 18);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Puddles
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(20, 30, 40, 0.45)';
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, 24 + rng() * 40, 12 + rng() * 18, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Debris: stones, papers, cans
    for (let i = 0; i < 180; i++) {
      const x = rng() * w, y = rng() * h;
      const t = rng();
      if (t < 0.6) {
        ctx.fillStyle = shade(d.debris, (rng() - 0.5) * 0.15);
        ctx.beginPath();
        ctx.arc(x, y, 2 + rng() * 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (t < 0.85) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rng() * Math.PI);
        ctx.fillStyle = 'rgba(210, 200, 175, 0.35)';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.restore();
      } else {
        ctx.fillStyle = d.accent;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 5, 3);
        ctx.globalAlpha = 1;
      }
    }

    // Manholes
    for (let i = 0; i < 4; i++) {
      const x = 100 + rng() * (w - 200), y = 100 + rng() * (h - 200);
      ctx.fillStyle = '#1b1c1e';
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3b3e';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
    }
  },

  drawBarricades(ctx, w, h, d, rng) {
    const B = BORDER;
    // Dark strip outside the playable zone
    ctx.fillStyle = shade(d.ground, -0.12);
    ctx.fillRect(0, 0, w, B);
    ctx.fillRect(0, h - B, w, B);
    ctx.fillRect(0, 0, B, h);
    ctx.fillRect(w - B, 0, B, h);

    const segment = (x, y, len, horiz) => {
      const kind = rng();
      ctx.save();
      ctx.translate(x, y);
      if (!horiz) ctx.rotate(Math.PI / 2);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(2, -B / 2 + 6, len, B - 4);
      if (kind < 0.45) {
        // Wooden planks
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = shade(d.barricade, (rng() - 0.5) * 0.1);
          ctx.fillRect(0, -B / 2 + 4 + i * 13, len, 11);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(0, -B / 2 + 13 + i * 13, len, 2);
        }
        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(6, -B / 2 + 8, 3, 3);
        ctx.fillRect(len - 9, -B / 2 + 8, 3, 3);
      } else if (kind < 0.75) {
        // Sandbags
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < len / 22; i++) {
            ctx.fillStyle = shade('#8b7a55', (rng() - 0.5) * 0.12);
            ctx.beginPath();
            ctx.ellipse(11 + i * 22 + row * 11 - 5, -B / 2 + 13 + row * 18, 12, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      } else {
        // Concrete block with hazard stripes
        ctx.fillStyle = '#76736b';
        ctx.fillRect(0, -B / 2 + 4, len, B - 8);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, -6, len, 12);
        ctx.clip();
        for (let sx = -12; sx < len + 12; sx += 16) {
          ctx.fillStyle = d.accent;
          ctx.beginPath();
          ctx.moveTo(sx, -6); ctx.lineTo(sx + 8, -6); ctx.lineTo(sx + 20, 6); ctx.lineTo(sx + 12, 6);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, -B / 2 + 4, len, 3);
      }
      ctx.restore();
    };

    const seg = 96;
    for (let x = 0; x < w; x += seg) {
      segment(x, B / 2, Math.min(seg - 4, w - x), true);
      segment(x, h - B / 2, Math.min(seg - 4, w - x), true);
    }
    for (let y = B; y < h - B; y += seg) {
      const len = Math.min(seg - 4, h - B - y);
      segment(B / 2, y, len, false);
      segment(w - B / 2, y, len, false);
    }
  },

  drawObstacle(ctx, o, d) {
    ctx.save();
    ctx.translate(o.x, o.y);

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    if (o.shape === 'rect') {
      ctx.fillRect(-o.w / 2 + 6, -o.h / 2 + 8, o.w, o.h);
    } else {
      ctx.beginPath(); ctx.arc(6, 8, o.r, 0, Math.PI * 2); ctx.fill();
    }

    const vertical = o.shape === 'rect' && o.h > o.w;
    if (vertical) ctx.rotate(Math.PI / 2);
    const W = vertical ? o.h : o.w;
    const H = vertical ? o.w : o.h;

    switch (o.kind) {
      case 'car': {
        const colors = ['#7a2b25', '#2d4a6b', '#4f5a3a', '#6b6b6b', '#8a6a2a'];
        const body = colors[Math.floor(o.seed * colors.length)];
        ctx.fillStyle = shade(body, -0.1);
        this.roundRect(ctx, -W / 2, -H / 2, W, H, 12); ctx.fill();
        ctx.fillStyle = body;
        this.roundRect(ctx, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 10); ctx.fill();
        // Windows
        ctx.fillStyle = '#1b2530';
        this.roundRect(ctx, -W * 0.18, -H / 2 + 7, W * 0.42, H - 14, 6); ctx.fill();
        ctx.fillStyle = shade(body, 0.08);
        ctx.fillRect(-W * 0.1, -H / 2 + 10, W * 0.26, H - 20);
        // Broken glass glint
        ctx.strokeStyle = 'rgba(200,220,240,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-W * 0.15, -H / 2 + 9); ctx.lineTo(-W * 0.05, 0); ctx.lineTo(-W * 0.12, H / 2 - 9);
        ctx.stroke();
        // Headlights
        ctx.fillStyle = '#d9c99a';
        ctx.fillRect(W / 2 - 6, -H / 2 + 6, 4, 9);
        ctx.fillRect(W / 2 - 6, H / 2 - 15, 4, 9);
        ctx.fillStyle = '#5a1a16';
        ctx.fillRect(-W / 2 + 2, -H / 2 + 6, 4, 9);
        ctx.fillRect(-W / 2 + 2, H / 2 - 15, 4, 9);
        break;
      }
      case 'dumpster': {
        ctx.fillStyle = '#2f5a3a';
        ctx.fillRect(-W / 2, -H / 2, W, H);
        ctx.fillStyle = '#3b6e48';
        ctx.fillRect(-W / 2 + 3, -H / 2 + 3, W / 2 - 4, H - 6);
        ctx.fillStyle = '#356442';
        ctx.fillRect(1, -H / 2 + 3, W / 2 - 4, H - 6);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-1, -H / 2, 2, H);
        // Overflowing trash
        ctx.fillStyle = '#5a5246';
        ctx.beginPath(); ctx.arc(W / 2 - 8, H / 2 - 4, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ccc4b0';
        ctx.fillRect(W / 2 - 4, -H / 2 + 5, 8, 6);
        break;
      }
      case 'crates': {
        const s = W / 2;
        const box = (x, y, sz, tone) => {
          ctx.fillStyle = shade('#8a6337', tone);
          ctx.fillRect(x, y, sz, sz);
          ctx.strokeStyle = shade('#8a6337', -0.18);
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, sz - 2, sz - 2);
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + sz - 2, y + sz - 2);
          ctx.moveTo(x + sz - 2, y + 2); ctx.lineTo(x + 2, y + sz - 2);
          ctx.stroke();
        };
        box(-s, -s, s, 0);
        box(0, -s, s, -0.05);
        box(-s, 0, s, -0.03);
        box(0, 0, s, 0.04);
        break;
      }
      case 'blocks': {
        const n = Math.max(2, Math.round(W / 36));
        const bw = W / n;
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = shade('#7d7a72', (i % 2 ? -0.04 : 0.02));
          ctx.fillRect(-W / 2 + i * bw + 1, -H / 2, bw - 2, H);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(-W / 2 + i * bw + 1, -H / 2, bw - 2, 3);
        }
        ctx.fillStyle = d.accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-W / 2, -3, W, 6);
        ctx.globalAlpha = 1;
        break;
      }
      case 'tires': {
        const spots = [[-10, -8], [11, -6], [0, 11]];
        for (const [tx, ty] of spots) {
          ctx.fillStyle = '#1a1a1a';
          ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2c2c2c';
          ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0d0d0d';
          ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'tree': {
        ctx.fillStyle = '#3b2a1a';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        const leaf = shade(d.groundAlt, -0.02);
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2 + o.seed * 6;
          ctx.fillStyle = shade(leaf, (i % 3 - 1) * 0.04);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * o.r * 0.45, Math.sin(a) * o.r * 0.45, o.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.arc(-o.r * 0.25, -o.r * 0.25, o.r * 0.45, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
    ctx.restore();
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // ---------- Permanent decals painted into the map ----------

  splat(x, y, r, color, alpha = 0.7) {
    if (!this.map) return;
    const c = this.map.getContext('2d');
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    const drops = r > 6 ? 5 : 2;
    for (let i = 0; i < drops; i++) {
      const a = Math.random() * Math.PI * 2, d = r * (0.6 + Math.random() * 0.9);
      c.beginPath();
      c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.15 + Math.random() * 0.3), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  },

  scorch(x, y, r) {
    if (!this.map) return;
    const c = this.map.getContext('2d');
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(10,8,6,0.65)');
    g.addColorStop(0.6, 'rgba(20,16,12,0.35)');
    g.addColorStop(1, 'rgba(20,16,12,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  },

  // Cracked ground where a zombie dug itself out.
  crack(x, y, r) {
    if (!this.map) return;
    const c = this.map.getContext('2d');
    c.fillStyle = 'rgba(30,22,14,0.55)';
    c.beginPath();
    c.ellipse(x, y + 3, r * 1.2, r * 0.8, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(15,10,6,0.6)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      let a = Math.random() * Math.PI * 2, px = x, py = y;
      c.beginPath();
      c.moveTo(px, py);
      for (let s = 0; s < 3; s++) {
        a += (Math.random() - 0.5) * 0.8;
        px += Math.cos(a) * r * 0.6;
        py += Math.sin(a) * r * 0.6;
        c.lineTo(px, py);
      }
      c.stroke();
    }
  },

  // ---------- Frame ----------

  // view: { w, h } in logical units (h = 540)
  draw(ctx, game, view, input) {
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, view.w, view.h);
    this.buttons = {};

    const shake = Fx.shake;
    const camX = Math.round(game.camera.x - view.w / 2 + (Math.random() - 0.5) * shake);
    const camY = Math.round(game.camera.y - view.h / 2 + (Math.random() - 0.5) * shake);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Only the visible part of the prerendered map.
    const sx = Math.max(0, camX), sy = Math.max(0, camY);
    const sw = Math.min(this.map.width - sx, view.w + 2);
    const sh = Math.min(this.map.height - sy, view.h + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(this.map, sx, sy, sw, sh, sx, sy, sw, sh);

    const vis = (x, y, m = 60) => x > camX - m && x < camX + view.w + m && y > camY - m && y < camY + view.h + m;

    for (const p of game.pickups) if (vis(p.x, p.y)) this.drawPickup(ctx, p);
    for (const b of game.barrels) if (!b.dead && vis(b.x, b.y)) this.drawBarrel(ctx, b, game.time);
    for (const z of game.zombies) if (vis(z.x, z.y)) this.drawZombie(ctx, z, game.time);
    this.drawTargetMarker(ctx, game);
    if (!game.hero.dead) this.drawHero(ctx, game.hero, game);
    this.drawSaws(ctx, game);
    this.drawProjectiles(ctx);
    this.drawFx(ctx);

    ctx.restore();

    this.drawVignette(ctx, view, game.hero);
    this.drawHud(ctx, game, view, input);
    if (game.state === 'play') {
      this.drawJoystick(ctx, input.joystick);
      this.drawJoystick(ctx, input.aimStick);
      if (game.aimMode === 'manual' && input.pointer && !input.aimStick.active) this.drawCrosshair(ctx, input.pointer.x, input.pointer.y, game);
    }
    this.drawOverlay(ctx, game, view, input);
  },

  drawSaws(ctx, game) {
    if (!game.hero.stats.saws || game.hero.dead) return;
    for (const p of game.sawPositions()) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(3, 4, SAW_SIZE, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(game.time * 18);
      ctx.fillStyle = '#c8d0d8';
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, r = i % 2 ? SAW_SIZE - 3 : SAW_SIZE + 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a848e';
      ctx.beginPath(); ctx.arc(0, 0, SAW_SIZE * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2e33';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  // ---------- Entities ----------

  drawHero(ctx, h, game) {
    const step = h.moving ? Math.sin(h.walkTime * 12) : 0;
    if (h.invuln > 0.3 && Math.floor(game.time * 20) % 2) return;

    ctx.save();
    ctx.translate(h.x, h.y);

    // Lantern light on the ground
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.16)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(3, 6, h.r + 2, h.r * 0.75, 0, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(h.facing);
    const hurt = h.hurt > 0.2;

    // Legs
    ctx.fillStyle = '#2a2f38';
    ctx.beginPath(); ctx.ellipse(step * 7, -7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-step * 7, 7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Gun (length depends on the weapon)
    const w = WEAPONS[h.weapon];
    const len = { pistol: 16, smg: 22, shotgun: 26, crossbow: 22, flamer: 26, launcher: 26, tesla: 22, plasma: 24, rocket: 30, minigun: 28 }[w.id] || 22;
    const back = h.recoil * 4;
    ctx.fillStyle = '#222';
    ctx.fillRect(6 - back, 2, len, w.type === 'rocket' || w.type === 'grenade' ? 8 : 6);
    ctx.fillStyle = '#444';
    ctx.fillRect(8 - back, 1, 9, 8);
    ctx.fillStyle = w.color;
    ctx.fillRect(4 + len - back, 3, 3, 4);
    if (w.id === 'crossbow') {
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20 - back, -6); ctx.quadraticCurveTo(24 - back, 5, 20 - back, 16); ctx.stroke();
    }

    // Arms
    ctx.fillStyle = hurt ? '#ff6a6a' : shade(h.color, -0.08);
    ctx.beginPath(); ctx.arc(10 - back, 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7 - back, -7, 5, 0, Math.PI * 2); ctx.fill();

    // Torso (jacket)
    ctx.fillStyle = hurt ? '#ff6a6a' : h.color;
    ctx.beginPath(); ctx.ellipse(-1, 0, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(h.color, -0.2);
    ctx.lineWidth = 2;
    ctx.stroke();
    // Backpack
    ctx.fillStyle = '#5a4a32';
    this.roundRect(ctx, -14, -8, 8, 16, 3); ctx.fill();

    // Head
    ctx.fillStyle = '#d6a77a';
    ctx.beginPath(); ctx.arc(2, 0, 8, 0, Math.PI * 2); ctx.fill();
    // Cap
    ctx.fillStyle = '#1f2a1f';
    ctx.beginPath(); ctx.arc(1, 0, 8, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
    ctx.fillRect(5, -5, 6, 10);

    ctx.restore();
  },

  drawZombie(ctx, z, t) {
    const def = z.def;
    const r = z.r;
    let scale = 1, alpha = 1, dy = 0;

    if (z.state === 'rising') {
      const k = Math.min(1, z.riseT / RISE_TIME);
      // Hole and dirt mound
      ctx.fillStyle = 'rgba(15,10,6,' + (0.8 * (1 - k * 0.5)) + ')';
      ctx.beginPath(); ctx.ellipse(z.x, z.y + 4, r * 1.25, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3a28';
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + z.walk;
        ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * r * 1.2, z.y + 4 + Math.sin(a) * r * 0.8, 4 + (i % 2) * 2, 0, Math.PI * 2); ctx.fill();
      }
      scale = 0.35 + 0.65 * k;
      alpha = 0.25 + 0.75 * k;
      dy = (1 - k) * 8;
      // Grasping hand pokes out first
      if (k < 0.45) {
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(z.x + Math.sin(t * 20) * 2, z.y - k * 20, 4, 0, Math.PI * 2); ctx.fill();
        return;
      }
    }

    const flash = z.flash > 0;
    const col = c => (flash ? '#ffffff' : c);
    const skin = col(def.color), shirt = col(def.shirt);
    const step = Math.sin(z.walk * 2.2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(z.x, z.y + dy);

    // Leap telegraph: dashed red line to the landing spot.
    if (z.mode === 'windup') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,60,60,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(z.lx - z.x, z.ly - z.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(z.lx - z.x, z.ly - z.y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const air = z.mode === 'leap' ? 8 : 0;
    ctx.beginPath(); ctx.ellipse(3 + air, 5 + air, r * 1.05 * scale, r * 0.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
    if (air) ctx.translate(0, -air);

    if (z.haste > 0) {
      ctx.strokeStyle = 'rgba(214,160,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.rotate(z.facing);
    ctx.scale(scale, scale);

    switch (def.behavior === 'chase' ? z.type : def.behavior) {
      case 'lunge': { // crawler: no legs, long body, arms far forward
        ctx.fillStyle = 'rgba(60,10,10,0.5)';
        ctx.fillRect(-r * 1.8, -3, r, 6);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.ellipse(r * 0.9 + step * 4, -r * 0.55, r * 0.55, 3.5, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.9 - step * 4, r * 0.55, r * 0.55, 3.5, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.ellipse(-r * 0.3, 0, r * 1.05, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        this.zombieHead(ctx, r * 0.55, 0, r * 0.45, skin, flash);
        break;
      }
      case 'brute': {
        this.zombieLegs(ctx, r * 0.6, step, shirt);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.ellipse(r * 0.5, -r * 0.75, r * 0.5, r * 0.28, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.75, r * 0.5, r * 0.28, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.ellipse(-2, 0, r * 0.62, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col(shade(def.color, -0.05));
        ctx.beginPath(); ctx.ellipse(-2, 0, r * 0.4, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        this.zombieHead(ctx, r * 0.15, 0, r * 0.32, skin, flash);
        break;
      }
      case 'explode': { // bloater: swollen body with pustules, blinks before bursting
        const pulse = 1 + Math.sin(t * 5 + z.walk) * 0.05 + (z.fuse >= 0 ? 0.12 : 0);
        this.zombieArms(ctx, r * 0.6, step, skin);
        ctx.fillStyle = z.fuse >= 0 && Math.floor(t * 16) % 2 ? '#ff5a3a' : shirt;
        ctx.beginPath(); ctx.arc(-2, 0, r * 0.9 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col('#c9c25a');
        for (const [px, py, pr] of [[-6, -8, 4], [4, 7, 5], [-10, 6, 3], [6, -6, 3]]) {
          ctx.beginPath(); ctx.arc(px * pulse, py * pulse, pr, 0, Math.PI * 2); ctx.fill();
        }
        this.zombieHead(ctx, r * 0.55, 0, r * 0.38, skin, flash);
        break;
      }
      case 'ranged': { // spitter: green throat sac
        this.zombieLegs(ctx, r * 0.55, step, shirt);
        this.zombieArms(ctx, r * 0.55, step * 0.5, skin);
        this.zombieTorso(ctx, r, shirt);
        const sac = 1 + (z.spitAnim > 0 ? 0.4 : Math.max(0, 0.3 - z.timer * 0.15));
        ctx.fillStyle = col('#9bd34a');
        ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.32 * sac, 0, Math.PI * 2); ctx.fill();
        this.zombieHead(ctx, r * 0.25, 0, r * 0.42, skin, flash);
        break;
      }
      case 'scream': { // screamer: long hair, gaping mouth
        this.zombieLegs(ctx, r * 0.55, step, shirt);
        this.zombieArms(ctx, r * 0.5, step, skin);
        this.zombieTorso(ctx, r, shirt);
        ctx.fillStyle = col('#2a2420');
        ctx.beginPath(); ctx.ellipse(-r * 0.25, 0, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        const hs = z.screaming ? 1.25 : 1;
        this.zombieHead(ctx, r * 0.3, 0, r * 0.42 * hs, skin, flash);
        ctx.fillStyle = '#1a0606';
        ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.12 * hs, r * 0.2 * hs, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'armored': { // riot helmet and vest
        this.zombieLegs(ctx, r * 0.55, step, '#1e242e');
        this.zombieArms(ctx, r * 0.6, step, skin);
        this.zombieTorso(ctx, r, shirt);
        ctx.fillStyle = col('#3d4756');
        this.roundRect(ctx, -r * 0.45, -r * 0.6, r * 0.7, r * 1.2, 4); ctx.fill();
        ctx.fillStyle = col('#20262f');
        ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = flash ? '#fff' : 'rgba(140,180,210,0.6)';
        ctx.fillRect(r * 0.42, -r * 0.32, r * 0.18, r * 0.64);
        break;
      }
      case 'leap': { // jumper: wide crouched legs
        const crouch = z.mode === 'windup' ? 1.3 : 1;
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.8 * crouch, 6, 4, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.8 * crouch, 6, 4, -0.6, 0, Math.PI * 2); ctx.fill();
        this.zombieArms(ctx, r * 0.7, step, skin);
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.ellipse(-2, 0, r * 0.65, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        this.zombieHead(ctx, r * 0.35, 0, r * 0.45, skin, flash);
        break;
      }
      case 'runner': {
        this.zombieLegs(ctx, r * 0.6, step * 1.4, shirt);
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.ellipse(-step * 5, -r * 0.75, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(step * 5, r * 0.75, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shirt;
        ctx.beginPath(); ctx.ellipse(-1, 0, r * 0.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        this.zombieHead(ctx, r * 0.3, 0, r * 0.48, skin, flash);
        break;
      }
      default: { // walker
        this.zombieLegs(ctx, r * 0.55, step, shirt);
        this.zombieArms(ctx, r * 0.6, step, skin);
        this.zombieTorso(ctx, r, shirt);
        // Torn shirt
        ctx.fillStyle = col(shade(def.shirt, -0.1));
        ctx.fillRect(-r * 0.4, -r * 0.2, r * 0.3, r * 0.4);
        this.zombieHead(ctx, r * 0.25, 0, r * 0.45, skin, flash);
      }
    }

    ctx.restore();

    // Frozen by ice bullets
    if (z.slow > 0 && z.state === 'alive') {
      ctx.fillStyle = 'rgba(150,220,255,0.28)';
      ctx.beginPath(); ctx.arc(z.x, z.y, r + 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,240,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Health bar
    if (z.state === 'alive' && z.hp < z.maxHp) {
      const bw = Math.max(24, r * 2), bx = z.x - bw / 2, by = z.y - r - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = z.def.armor ? '#9fb3c8' : '#d8423a';
      ctx.fillRect(bx, by, bw * Math.max(0, z.hp / z.maxHp), 3);
    }
  },

  zombieLegs(ctx, s, step, color) {
    ctx.fillStyle = shade(color.startsWith('#') ? color : '#333333', -0.1);
    ctx.beginPath(); ctx.ellipse(step * 6, -s, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-step * 6, s, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  },

  zombieArms(ctx, s, step, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(s + 4 + step * 2, -s, s * 0.75, 3.5, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s + 4 - step * 2, s, s * 0.75, 3.5, -0.1, 0, Math.PI * 2); ctx.fill();
  },

  zombieTorso(ctx, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(-2, 0, r * 0.62, r * 0.88, 0, 0, Math.PI * 2); ctx.fill();
  },

  zombieHead(ctx, x, y, r, skin, flash) {
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (!flash) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff3a2a';
    ctx.fillRect(x + r * 0.45, y - r * 0.45, 2.5, 2.5);
    ctx.fillRect(x + r * 0.45, y + r * 0.25, 2.5, 2.5);
  },

  drawBarrel(ctx, b, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(4, 5, b.r, 0, Math.PI * 2); ctx.fill();
    const hot = b.flash > 0 || (b.fuse >= 0 && Math.floor(t * 30) % 2);
    ctx.fillStyle = hot ? '#ffffff' : '#a8281e';
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6a140e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, b.r - 4, 0, Math.PI * 2); ctx.stroke();
    // Hazard triangle
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-1, -3, 2, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawPickup(ctx, p) {
    if (p.life < 3 && Math.floor(p.life * 8) % 2) return;
    const bob = Math.sin(p.bob) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.kind === 'xp') {
      const s = 4 + Math.min(4, p.value);
      ctx.fillStyle = 'rgba(90,220,255,0.25)';
      ctx.beginPath(); ctx.arc(0, 0, s + 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.value >= 4 ? '#7affc8' : '#5ad8ff';
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-1, -s * 0.6, 2, s * 0.5);
    } else if (p.kind === 'coin') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(1, 6 - bob, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98a1a';
      ctx.beginPath(); ctx.arc(0, 0, p.value > 1 ? 8 : 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath(); ctx.arc(-0.5, -0.5, p.value > 1 ? 6 : 4.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(-2, -3, 2, 3);
    } else {
      ctx.fillStyle = 'rgba(90,255,122,0.25)';
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2f2f2';
      this.roundRect(ctx, -10, -8, 20, 16, 3); ctx.fill();
      ctx.fillStyle = '#d8302a';
      ctx.fillRect(-2.5, -6, 5, 12);
      ctx.fillRect(-6, -2.5, 12, 5);
    }
    ctx.restore();
  },

  drawTargetMarker(ctx, game) {
    const z = game.target;
    if (!z || z.state !== 'alive') return;
    const r = z.r + 8, a = game.time * 3;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(a);
    ctx.strokeStyle = 'rgba(255,90,60,0.85)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.1);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawProjectiles(ctx) {
    for (const p of Weapons.projectiles) {
      const w = p.w;
      switch (p.type) {
        case 'bullet': {
          ctx.strokeStyle = w.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          break;
        }
        case 'bolt': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.strokeStyle = '#a07a4a';
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.fillStyle = w.color;
          ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(-21, -3, 4, 6);
          ctx.restore();
          break;
        }
        case 'flame': {
          const k = p.life / p.max;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, k * 1.5) * 0.55;
          ctx.fillStyle = k > 0.6 ? '#ffd27a' : k > 0.3 ? '#ff8a2a' : '#c43a1a';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'grenade': {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.save();
          ctx.translate(p.x, p.y - p.z);
          ctx.rotate(p.spin);
          ctx.fillStyle = '#4f6a2e';
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = w.color;
          ctx.fillRect(-1, -6, 3, 3);
          ctx.restore();
          break;
        }
        case 'plasma': {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(196,107,255,0.35)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = w.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'rocket': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = '#ffb547';
          ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-18 - Math.random() * 8, 0); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#5a5e52';
          ctx.fillRect(-9, -3.5, 16, 7);
          ctx.fillStyle = w.color;
          ctx.beginPath(); ctx.moveTo(7, -3.5); ctx.lineTo(13, 0); ctx.lineTo(7, 3.5); ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }
      }
    }

    for (const s of Zombies.spits) {
      ctx.fillStyle = 'rgba(155,211,74,0.3)';
      ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9bd34a';
      ctx.beginPath(); ctx.arc(s.x, s.y, 5.5, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawFx(ctx) {
    // Particles: normal ones first, glowing ones additively.
    for (const p of Fx.particles) {
      if (p.kind === 'fire' || p.kind === 'spark' || p.kind === 'plasma') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = p.kind === 'smoke' ? k * 0.45 : Math.min(1, k * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of Fx.flashes) {
      const k = f.life / f.max;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      g.addColorStop(0, f.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = k;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of Fx.particles) {
      if (p.kind !== 'fire' && p.kind !== 'spark' && p.kind !== 'plasma') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const a of Fx.arcs) {
      const k = a.life / a.max;
      ctx.globalAlpha = k;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 7;
      ctx.globalAlpha = k * 0.35;
      this.polyline(ctx, a.points);
      ctx.globalAlpha = k;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      this.polyline(ctx, a.points);
    }
    ctx.restore();

    for (const r of Fx.rings) {
      const k = r.life / r.max;
      ctx.globalAlpha = k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * k + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius * (1 - k * 0.7), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of Fx.texts) {
      const k = t.life / t.max;
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `bold ${t.size}px "Trebuchet MS", Arial, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  },

  polyline(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  },

  // ---------- Screen space ----------

  drawVignette(ctx, view, hero) {
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, view.w * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);

    if (hero.hurt > 0) {
      const r = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.3, view.w / 2, view.h / 2, view.w * 0.65);
      r.addColorStop(0, 'rgba(200,0,0,0)');
      r.addColorStop(1, `rgba(200,0,0,${hero.hurt * 1.2})`);
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  },

  hudText(ctx, text, x, y, color, size = 16, align = 'left') {
    ctx.font = `bold ${size}px "Trebuchet MS", Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  },

  // Tappable areas (logical coords) registered while drawing; main.js hit-tests them.
  buttons: {},

  button(ctx, name, x, y, w, h, label, color, primary = false) {
    this.buttons[name] = { x, y, w, h };
    ctx.fillStyle = primary ? color : 'rgba(20,18,16,0.85)';
    this.roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (primary) {
      ctx.font = `bold ${Math.min(22, h * 0.45)}px "Trebuchet MS", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1a1208';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    } else {
      this.hudText(ctx, label, x + w / 2, y + h / 2 + 1, color, Math.min(22, h * 0.45), 'center');
    }
  },

  wrapText(ctx, text, x, y, maxW, lineH, color, size, align = 'left') {
    ctx.font = `bold ${size}px "Trebuchet MS", Arial, sans-serif`;
    const words = text.split(' ');
    let line = '', lines = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => this.hudText(ctx, l, x, y + i * lineH, color, size, align));
    return lines.length;
  },

  starShape(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  },

  drawHud(ctx, game, view, input) {
    const h = game.hero;
    const play = game.state === 'play';

    // ---- Left: health, XP level, coins ----
    const bx = 16, by = 14, bw = 220, bh = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 6); ctx.fill();
    const k = Math.max(0, h.hp / h.maxHp);
    ctx.fillStyle = k > 0.5 ? '#4ec95a' : k > 0.25 ? '#e0b030' : '#e0402e';
    if (k > 0) { this.roundRect(ctx, bx, by, Math.max(6, bw * k), bh, 5); ctx.fill(); }
    this.hudText(ctx, `${Math.ceil(h.hp)} / ${h.maxHp}`, bx + bw / 2, by + bh / 2 + 1, '#fff', 13, 'center');

    const xy = by + bh + 8;
    const need = xpToLevel(h.lvl);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.roundRect(ctx, bx - 2, xy - 2, bw + 4, 12, 5); ctx.fill();
    ctx.fillStyle = '#5ad8ff';
    this.roundRect(ctx, bx, xy, Math.max(4, bw * Math.min(1, h.xp / need)), 8, 4); ctx.fill();
    this.hudText(ctx, `УР. ${h.lvl}`, bx + bw + 10, xy + 4, '#5ad8ff', 14);

    this.hudText(ctx, `● ${h.coins}`, bx, xy + 28, '#ffd23a', 17);
    this.hudText(ctx, `☠ ${game.kills}`, bx + 90, xy + 28, '#d8d0c0', 17);
    this.hudText(ctx, `Уровень ${game.level} · ${game.district.name}`, bx, xy + 52, game.district.accent, 13);

    // Perks taken (bottom-left)
    let px = bx + 14;
    for (const perk of PERKS) {
      const n = game.perks[perk.id];
      if (!n) continue;
      const py = view.h - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = perk.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.hudText(ctx, perk.icon, px, py + 1, perk.color, 14, 'center');
      if (n > 1) this.hudText(ctx, n, px + 11, py - 11, '#fff', 11, 'center');
      px += 34;
    }

    // ---- Centre: wave, remaining, streak ----
    const cx = view.w / 2;
    const waves = game.config.waves.length;
    if (game.waveIndex >= 0) {
      this.hudText(ctx, `ВОЛНА ${game.waveIndex + 1}/${waves}`, cx, 22, '#ffcf7a', 20, 'center');
      const sub = game.waveBreak > 0
        ? `Следующая волна через ${Math.ceil(game.waveBreak)}`
        : `Осталось зомби: ${game.remaining}`;
      this.hudText(ctx, sub, cx, 44, '#d8ccb0', 13, 'center');
    }
    const s = game.streak;
    if (s.count >= 2) {
      this.hudText(ctx, `СЕРИЯ ×${s.count}`, cx, 70, '#ff8a4a', 20, 'center');
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx - 50, 84, 100, 4);
      ctx.fillStyle = '#ff8a4a';
      ctx.fillRect(cx - 50, 84, 100 * (s.timer / STREAK_TIME), 4);
    }

    // ---- Right: live star goals, aim mode, weapon ----
    const pw = 260, rx = view.w - 16 - pw;
    const goals = game.starGoals();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    this.roundRect(ctx, rx, 12, pw, goals.length * 22 + 10, 8); ctx.fill();
    goals.forEach((g, i) => {
      const y = 28 + i * 22;
      this.starShape(ctx, rx + 16, y, 8);
      if (g.state === 'ok') { ctx.fillStyle = '#ffd23a'; ctx.fill(); }
      else if (g.state === 'fail') { ctx.fillStyle = '#5a3a3a'; ctx.fill(); }
      else { ctx.strokeStyle = '#a89878'; ctx.lineWidth = 1.5; ctx.stroke(); }
      const col = g.state === 'fail' ? '#8a6a6a' : g.state === 'ok' ? '#f3e3c0' : '#c8b898';
      this.hudText(ctx, g.text, rx + 30, y + 1, col, 13);
      if (g.progress) this.hudText(ctx, g.progress, rx + pw - 10, y + 1, col, 13, 'right');
    });

    const ay = 12 + goals.length * 22 + 18;
    if (play) this.buttons.aim = { x: rx, y: ay, w: pw, h: 30 };
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundRect(ctx, rx, ay, pw, 30, 8); ctx.fill();
    const auto = game.aimMode === 'auto';
    this.hudText(ctx, auto ? 'Прицел: АВТО' : 'Прицел: РУЧНОЙ', rx + 12, ay + 16, auto ? '#8fd8ff' : '#ffb547', 14);
    if (!input.touch) this.hudText(ctx, 'M', rx + pw - 12, ay + 16, 'rgba(255,255,255,0.5)', 13, 'right');

    const w = game.weapon;
    const wy = ay + 38;
    if (play && game.debug) this.buttons.weapon = { x: rx, y: wy, w: pw, h: 30 };
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundRect(ctx, rx, wy, pw, 30, 8); ctx.fill();
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.hudText(ctx, game.debug ? `${(h.weapon + 1) % 10}  ${w.name}` : w.name, rx + 12, wy + 16, w.color, 15);
    const cd = Math.max(0, Math.min(1, h.cooldown * w.rate * h.stats.rate));
    if (cd > 0 && w.rate < 2) {
      ctx.fillStyle = w.color;
      ctx.fillRect(rx + 8, wy + 25, (pw - 16) * (1 - cd), 3);
    }

    // ---- Banners ----
    let y = view.h * 0.3;
    for (const b of game.banners) {
      const t = b.life / b.max;
      ctx.globalAlpha = Math.min(1, t * 4, (1 - t) * 10 + 0.2);
      const size = b.big ? 40 + (1 - Math.min(1, (1 - t) * 8)) * 16 : 28;
      this.hudText(ctx, b.text, view.w / 2, y, b.color, size, 'center');
      if (b.sub) this.hudText(ctx, b.sub, view.w / 2, y + size * 0.8, '#f3e3c0', 15, 'center');
      y += (b.sub ? 30 : 0) + size + 12;
    }
    ctx.globalAlpha = 1;

    if (game.debug) {
      const hint = input.touch
        ? 'debug: тап по оружию — следующее'
        : 'debug: 1–9, 0 — оружие · M — прицел';
      this.hudText(ctx, hint, view.w / 2, view.h - 14, 'rgba(243,227,192,0.55)', 12, 'center');
    }
    ctx.textAlign = 'left';
  },

  // ---------- Overlays: new enemy, perk choice, victory, defeat ----------

  drawOverlay(ctx, game, view, input) {
    if (game.state === 'play') return;
    const t = game.stateTime;
    ctx.fillStyle = `rgba(5,6,10,${Math.min(0.72, t * 3)})`;
    ctx.fillRect(0, 0, view.w, view.h);
    const appear = Math.min(1, t * 5);
    ctx.save();
    ctx.globalAlpha = appear;
    const cx = view.w / 2;
    switch (game.state) {
      case 'intro': this.drawIntro(ctx, game, view, cx, input); break;
      case 'perk': this.drawPerks(ctx, game, view, cx, input); break;
      case 'victory': this.drawVictory(ctx, game, view, cx, input); break;
      case 'defeat': this.drawDefeat(ctx, game, view, cx, input); break;
    }
    ctx.restore();
  },

  panel(ctx, x, y, w, h, border) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#24201a');
    g.addColorStop(1, '#14120f');
    ctx.fillStyle = g;
    this.roundRect(ctx, x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  drawIntro(ctx, game, view, cx, input) {
    const type = game.config.newEnemy;
    const def = ZOMBIES[type];
    const w = 560, h = 330, x = cx - w / 2, y = (view.h - h) / 2;
    this.panel(ctx, x, y, w, h, '#ff5a4a');
    this.hudText(ctx, 'НОВЫЙ ВРАГ', cx, y + 34, '#ff5a4a', 28, 'center');
    this.hudText(ctx, `Уровень ${game.level} · ${game.district.name}`, cx, y + 62, '#a89878', 13, 'center');

    // Portrait
    const px = x + 120, py = y + 160;
    const glow = ctx.createRadialGradient(px, py, 10, px, py, 90);
    glow.addColorStop(0, 'rgba(255,90,74,0.25)');
    glow.addColorStop(1, 'rgba(255,90,74,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(px, py, 90, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(px, py);
    const sc = 64 / Math.max(def.radius, 14) * 1.1;
    ctx.scale(sc, sc);
    this.drawZombie(ctx, {
      def, type, x: 0, y: 0, r: def.radius, state: 'alive', flash: 0, walk: game.time * 3,
      facing: Math.PI / 2, haste: 0, mode: 'run', timer: 1, hp: 1, maxHp: 1, slow: 0, fuse: -1,
    }, game.time);
    ctx.restore();

    const tx = x + 240;
    this.hudText(ctx, def.name, tx, y + 108, '#ffcf7a', 30);
    this.wrapText(ctx, def.desc, tx, y + 146, w - 270, 22, '#e8dcc0', 16);
    const stat = `Здоровье ${def.hp} · Скорость ${def.speed} · Урон ${def.damage}`;
    this.hudText(ctx, stat, tx, y + 230, '#a89878', 12);

    this.button(ctx, 'start', cx - 100, y + h - 66, 200, 48, 'В БОЙ', '#ffb547', true);
    if (!input.touch) this.hudText(ctx, 'Enter', cx + 112, y + h - 42, 'rgba(255,255,255,0.4)', 12);
  },

  drawPerks(ctx, game, view, cx, input) {
    this.hudText(ctx, `УРОВЕНЬ ${game.hero.lvl}!`, cx, view.h * 0.14, '#5ad8ff', 34, 'center');
    this.hudText(ctx, 'Выбери улучшение', cx, view.h * 0.14 + 34, '#e8dcc0', 16, 'center');
    const n = game.perkChoices.length;
    const cw = Math.min(240, (view.w - 60) / 3 - 16), ch = 270, gap = 18;
    const total = n * cw + (n - 1) * gap;
    const y = view.h * 0.14 + 64;
    game.perkChoices.forEach((perk, i) => {
      const x = cx - total / 2 + i * (cw + gap);
      const lift = Math.max(0, 1 - game.stateTime * 4 + i * 0.25) * 40;
      const yy = y + lift;
      this.buttons['perk' + i] = { x, y: yy, w: cw, h: ch };
      this.panel(ctx, x, yy, cw, ch, perk.color);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(x + cw / 2, yy + 58, 36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = perk.color;
      ctx.lineWidth = 3;
      ctx.stroke();
      this.hudText(ctx, perk.icon, x + cw / 2, yy + 60, perk.color, 34, 'center');
      const lines = this.wrapText(ctx, perk.name, x + cw / 2, yy + 118, cw - 20, 22, '#ffcf7a', 19, 'center');
      this.wrapText(ctx, perk.desc, x + cw / 2, yy + 124 + lines * 22, cw - 24, 19, '#e8dcc0', 14, 'center');
      // Stack pips
      const have = game.perks[perk.id] || 0;
      for (let k = 0; k < perk.max; k++) {
        const pxx = x + cw / 2 + (k - (perk.max - 1) / 2) * 16;
        ctx.fillStyle = k < have ? perk.color : k === have ? '#ffffff' : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(pxx, yy + ch - 40, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (!input.touch) this.hudText(ctx, String(i + 1), x + cw / 2, yy + ch - 16, 'rgba(255,255,255,0.45)', 13, 'center');
    });
  },

  drawVictory(ctx, game, view, cx, input) {
    const r = game.result;
    const w = 560, h = 400, x = cx - w / 2, y = (view.h - h) / 2;
    this.panel(ctx, x, y, w, h, '#ffd23a');
    this.hudText(ctx, 'ПОБЕДА!', cx, y + 36, '#ffd23a', 34, 'center');
    this.hudText(ctx, `Уровень ${game.level} · ${game.district.name}`, cx, y + 66, '#a89878', 13, 'center');

    // Stars pop in one by one.
    for (let i = 0; i < 3; i++) {
      const sx = cx + (i - 1) * 86, sy = y + 120 + (i === 1 ? -10 : 0);
      const t0 = 0.45 + i * 0.45;
      const on = i < r.stars && game.stateTime > t0;
      const pop = on ? Math.min(1, (game.stateTime - t0) * 5) : 1;
      const sc = on ? 1 + Math.sin(pop * Math.PI) * 0.35 : 1;
      this.starShape(ctx, sx, sy, 34 * sc);
      ctx.fillStyle = on ? '#ffd23a' : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = on ? '#fff3b0' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    r.goals.forEach((g, i) => {
      const gy = y + 182 + i * 24;
      const ok = g.state === 'ok';
      this.hudText(ctx, ok ? '✔' : '✘', x + 90, gy, ok ? '#7aff8a' : '#ff6a5a', 16, 'center');
      this.hudText(ctx, g.text, x + 108, gy, ok ? '#f3e3c0' : '#8a7a6a', 15);
      if (g.progress) this.hudText(ctx, g.progress, x + w - 90, gy, ok ? '#f3e3c0' : '#8a7a6a', 15, 'right');
    });

    const mm = Math.floor(r.time / 60), ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    this.hudText(ctx, `☠ ${r.kills}   ⏱ ${mm}:${ss}   Лучшая серия ×${r.best}`, cx, y + 266, '#c8b898', 14, 'center');
    this.hudText(ctx, `● ${r.coins} + ${r.bonus} награда`, cx, y + 292, '#ffd23a', 18, 'center');

    const by = y + h - 70;
    this.button(ctx, 'retry', cx - 190, by, 170, 48, 'ЗАНОВО', '#c8b898');
    if (game.level < 100) {
      this.button(ctx, 'next', cx + 20, by, 170, 48, 'ДАЛЬШЕ', '#ffb547', true);
      if (!input.touch) this.hudText(ctx, 'Enter', cx + 200, by + 25, 'rgba(255,255,255,0.4)', 12);
    } else {
      this.hudText(ctx, 'Город спасён!', cx + 105, by + 25, '#ffd23a', 18, 'center');
    }
  },

  drawDefeat(ctx, game, view, cx, input) {
    const r = game.result;
    const w = 480, h = 290, x = cx - w / 2, y = (view.h - h) / 2;
    this.panel(ctx, x, y, w, h, '#e0402e');
    this.hudText(ctx, 'ТЫ ПОГИБ', cx, y + 42, '#ff5a4a', 36, 'center');
    this.hudText(ctx, `Уровень ${game.level} · ${game.district.name}`, cx, y + 74, '#a89878', 13, 'center');
    this.hudText(ctx, `Дошёл до волны ${r.wave}/${r.waves}`, cx, y + 118, '#f3e3c0', 18, 'center');
    this.hudText(ctx, `☠ ${r.kills}`, cx, y + 148, '#c8b898', 16, 'center');
    this.hudText(ctx, `● ${r.coins} (половина собранного)`, cx, y + 176, '#ffd23a', 16, 'center');
    this.button(ctx, 'retry', cx - 100, y + h - 70, 200, 48, 'ЗАНОВО', '#ffb547', true);
    if (!input.touch) this.hudText(ctx, 'Enter', cx + 112, y + h - 45, 'rgba(255,255,255,0.4)', 12);
  },

  drawCrosshair(ctx, x, y, game) {
    const w = game.weapon;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    this.crossLines(ctx);
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2;
    this.crossLines(ctx);
    ctx.restore();
  },

  crossLines(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.moveTo(-16, 0); ctx.lineTo(-6, 0);
    ctx.moveTo(16, 0); ctx.lineTo(6, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, -6);
    ctx.moveTo(0, 16); ctx.lineTo(0, 6);
    ctx.stroke();
  },

  drawJoystick(ctx, j) {
    if (!j || !j.active) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = j.color || '#ffcf7a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = j.color || '#ffb547';
    ctx.beginPath(); ctx.arc(j.x, j.y, j.radius * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};
