// Entry point: canvas scaling, input, rotate screen, main loop.

const LOGICAL_H = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const view = { w: 960, h: LOGICAL_H, scale: 1 };

const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ?debug enables test keys; ?debug&level=N starts at level N.
const params = new URLSearchParams(location.search);
Game.debug = params.has('debug');
const startLevel = Game.debug && params.get('level') ? Number(params.get('level')) || 1 : 1;

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

function makeStick(color) {
  return { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, radius: 60, color };
}

const input = {
  touch: isTouch,
  keys: new Set(),
  joystick: makeStick('#ffb547'),   // left: movement
  aimStick: makeStick('#ff6a4a'),   // right: manual aim + fire
  pointer: null,                    // mouse position, logical screen coords
  mouseDown: false,

  stickValue(j) {
    const dx = j.x - j.ox, dy = j.y - j.oy;
    const d = Math.hypot(dx, dy);
    if (d < j.radius * 0.12) return { x: 0, y: 0 };
    const m = Math.min(1, d / j.radius);
    return { x: (dx / d) * m, y: (dy / d) * m };
  },

  move() {
    if (this.joystick.active) return this.stickValue(this.joystick);
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    return len ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  },

  controls() {
    return {
      move: this.move(),
      stick: this.aimStick.active ? this.stickValue(this.aimStick) : null,
      pointer: this.pointer,
      firing: this.mouseDown,
    };
  },
};

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

window.addEventListener('keydown', e => {
  if (MOVE_KEYS.includes(e.code)) {
    input.keys.add(e.code);
    e.preventDefault();
    return;
  }
  if (e.repeat) return;
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (digit) {
    const n = Number(digit[1]);
    if (Game.state === 'perk') {
      if (n >= 1 && n <= 3) Game.press('perk' + (n - 1));
    } else if (Game.debug) {
      // Debug only: 1–9, 0 — weapons.
      Game.setWeapon(n === 0 ? 9 : n - 1);
    }
  } else if (e.code === 'KeyM') {
    // Until the aim setting lands in the settings menu.
    Game.toggleAim();
  } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
    if (Game.state === 'intro') Game.press('start');
    else if (Game.state === 'victory') Game.press(Game.level < 100 ? 'next' : 'retry');
    else if (Game.state === 'defeat') Game.press('retry');
    if (Game.state !== 'play' || e.code === 'Space') e.preventDefault();
  } else if (e.code === 'KeyR') {
    Game.press('retry');
  }
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', () => {
  input.keys.clear();
  input.mouseDown = false;
  input.joystick.active = false;
  input.aimStick.active = false;
});

// Screen → logical coordinates
function toLogical(t) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (t.clientX - rect.left) / rect.width * view.w,
    y: (t.clientY - rect.top) / rect.height * view.h,
  };
}

// Mouse (PC manual aim)
canvas.addEventListener('mousemove', e => { input.pointer = toLogical(e); });
canvas.addEventListener('mousedown', e => {
  input.pointer = toLogical(e);
  if (e.button !== 0) return;
  const btn = hitButton(input.pointer);
  if (btn) { Game.press(btn); return; }
  if (Game.state === 'play') input.mouseDown = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) input.mouseDown = false; });
canvas.addEventListener('mouseleave', () => { input.pointer = null; });

function hitButton(p) {
  for (const [name, b] of Object.entries(Render.buttons)) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return name;
  }
  return null;
}

function startStick(j, t, p) {
  j.active = true;
  j.id = t.identifier;
  j.ox = j.x = p.x;
  j.oy = j.y = p.y;
}

// Floating joysticks: left half moves, right half aims (manual mode only).
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  input.pointer = null;
  for (const t of e.changedTouches) {
    const p = toLogical(t);
    const btn = hitButton(p);
    if (btn) { Game.press(btn); continue; }
    if (Game.state !== 'play') continue;

    if (p.x < view.w / 2) {
      if (!input.joystick.active) startStick(input.joystick, t, p);
    } else if (Game.aimMode === 'manual' && !input.aimStick.active) {
      startStick(input.aimStick, t, p);
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    for (const j of [input.joystick, input.aimStick]) {
      if (!j.active || t.identifier !== j.id) continue;
      const p = toLogical(t);
      const dx = p.x - j.ox, dy = p.y - j.oy;
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
  }
}, { passive: false });

function endTouch(e) {
  for (const t of e.changedTouches) {
    for (const j of [input.joystick, input.aimStick]) {
      if (t.identifier === j.id) {
        j.active = false;
        j.id = null;
      }
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
    Game.update(dt, input.controls(), view);
  }

  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  Render.draw(ctx, Game, view, input);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));

resize();
Game.start(startLevel);
Game.clampCamera(view);
canvas.style.cursor = 'crosshair';
requestAnimationFrame(t => { last = t; frame(t); });
