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

  // view: { w, h } in logical units (h = 540)
  draw(ctx, game, view, input) {
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, view.w, view.h);

    const camX = Math.round(game.camera.x - view.w / 2);
    const camY = Math.round(game.camera.y - view.h / 2);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Only the visible part of the prerendered map.
    const sx = Math.max(0, camX), sy = Math.max(0, camY);
    const sw = Math.min(this.map.width - sx, view.w + 2);
    const sh = Math.min(this.map.height - sy, view.h + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(this.map, sx, sy, sw, sh, sx, sy, sw, sh);

    this.drawHero(ctx, game.hero, game.time);
    ctx.restore();

    this.drawVignette(ctx, view);
    this.drawHud(ctx, game, view);
    this.drawJoystick(ctx, input.joystick);
  },

  drawHero(ctx, h, t) {
    const step = h.moving ? Math.sin(h.walkTime * 12) : 0;

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

    // Legs
    ctx.fillStyle = '#2a2f38';
    ctx.beginPath(); ctx.ellipse(step * 7, -7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-step * 7, 7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Gun
    ctx.fillStyle = '#222';
    ctx.fillRect(6, 3, 22, 5);
    ctx.fillStyle = '#444';
    ctx.fillRect(8, 2, 8, 7);

    // Arms
    ctx.fillStyle = shade(h.color, -0.08);
    ctx.beginPath(); ctx.arc(10, 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -9, 5, 0, Math.PI * 2); ctx.fill();

    // Torso (jacket)
    ctx.fillStyle = h.color;
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

  drawVignette(ctx, view) {
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, view.w * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  },

  drawHud(ctx, game, view) {
    ctx.font = 'bold 16px "Trebuchet MS", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(`Уровень ${game.level} · ${game.district.name}`, 17, 15);
    ctx.fillStyle = game.district.accent;
    ctx.fillText(`Уровень ${game.level} · ${game.district.name}`, 16, 14);
  },

  drawJoystick(ctx, j) {
    if (!j.active) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffcf7a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffb547';
    ctx.beginPath(); ctx.arc(j.x, j.y, j.radius * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};
