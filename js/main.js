// Entry point: canvas scaling, input, rotate screen, main loop.

const LOGICAL_H = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const view = { w: 960, h: LOGICAL_H, scale: 1 };

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function resize() {
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  view.scale = canvas.height / LOGICAL_H;
  view.w = canvas.width / view.scale;
  view.h = LOGICAL_H;

  const portrait = isTouch && cssH > cssW;
  document.body.classList.toggle('portrait', portrait);
  view.paused = portrait;

  if (Game.hero) Game.clampCamera(view);
}

// ---------- Input ----------

const input = {
  keys: new Set(),
  joystick: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, radius: 60 },

  move() {
    const j = this.joystick;
    if (j.active) {
      const dx = j.x - j.ox, dy = j.y - j.oy;
      const d = Math.hypot(dx, dy);
      if (d < j.radius * 0.12) return { x: 0, y: 0 };
      const m = Math.min(1, d / j.radius);
      return { x: (dx / d) * m, y: (dy / d) * m };
    }
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    return len ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  },
};

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

window.addEventListener('keydown', e => {
  if (MOVE_KEYS.includes(e.code)) {
    input.keys.add(e.code);
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', () => {
  input.keys.clear();
  input.joystick.active = false;
});

// Touch → logical coordinates
function toLogical(t) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (t.clientX - rect.left) / rect.width * view.w,
    y: (t.clientY - rect.top) / rect.height * view.h,
  };
}

// Floating joystick: appears where the left half of the screen is touched.
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const j = input.joystick;
  for (const t of e.changedTouches) {
    const p = toLogical(t);
    if (!j.active && p.x < view.w / 2) {
      j.active = true;
      j.id = t.identifier;
      j.ox = j.x = p.x;
      j.oy = j.y = p.y;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const j = input.joystick;
  for (const t of e.changedTouches) {
    if (t.identifier !== j.id) continue;
    const p = toLogical(t);
    let dx = p.x - j.ox, dy = p.y - j.oy;
    const d = Math.hypot(dx, dy);
    // Drag the base along when the finger goes past the edge.
    if (d > j.radius) {
      const over = d - j.radius;
      j.ox += (dx / d) * over;
      j.oy += (dy / d) * over;
    }
    j.x = p.x;
    j.y = p.y;
  }
}, { passive: false });

function endTouch(e) {
  const j = input.joystick;
  for (const t of e.changedTouches) {
    if (t.identifier === j.id) {
      j.active = false;
      j.id = null;
    }
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);

// Block page scroll / zoom gestures on mobile.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Loop ----------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (!view.paused) {
    Game.update(dt, input.move(), view);
  }

  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  Render.draw(ctx, Game, view, input);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));

resize();
Game.start(1);
Render.buildMap(Game);
Game.clampCamera(view);
requestAnimationFrame(t => { last = t; frame(t); });
