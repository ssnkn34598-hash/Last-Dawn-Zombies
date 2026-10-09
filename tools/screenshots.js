#!/usr/bin/env node
// Catalog screenshots (1200×600 PNG) from the real game via Playwright:
//   node tools/screenshots.js  → screenshots/01-menu.png … 05-arsenal.png
// Opens index.html?debug only to set up progress, then turns debug off so no
// debug labels are drawn. Battles are played by a simple kiting bot; frames are
// frozen (Platform.suspend) at the right moment and captured as they are.

const path = require('path');
const fs = require('fs');
let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');
const W = 1200, H = 600;
const LANG = process.argv.includes('--en') ? 'en' : 'ru';
// --only=battle,boss... to retake some shots; --log prints battle state.
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = id => !ONLY.length || ONLY.includes(id);
const LOG = process.argv.includes('--log');

// Mid-game progress: 20 levels done, a few weapons and heroes.
function seed(lang) {
  const d = Progress.data;
  d.unlocked = 21;
  for (let i = 1; i <= 20; i++) d.stars[i] = i % 4 === 0 ? 2 : 3;
  d.coins = 2480;
  d.gold = 64;
  d.weapons = { pistol: 6, smg: 5, shotgun: 4, crossbow: 3, flamer: 2 };
  d.weapon = 'smg';
  d.heroes = { max: 5, lena: 3, boris: 2 };
  d.hero = 'max';
  d.settings.aim = 'auto';
  d.settings.lang = lang;
  d.tutorialOffered = d.tutorialDone = true;
  d.daily.loginClaimed = true;
  d.seenEnemies = Object.keys(ZOMBIES);
  d.seenStories = DISTRICTS.map(x => x.id);
  d.seenWeapons = WEAPONS.map(w => w.id);
  d.bossesBeaten = ['butcher'];
  d.hints = ['boss', 'rage', 'perk', 'lowhp', 'streak', 'menuUpgrade', 'menuHero', 'manual']
    .concat(WEAPONS.map(w => 'weapon_' + w.id));
  d.stats.levels = 20;
  Progress.save();
  I18N.setLang(lang);
  Game.seenEnemies = new Set(d.seenEnemies);
  // Debug was only needed to get here: hide everything debug-only.
  Game.debug = false;
  document.querySelectorAll('.btn.debug').forEach(b => b.remove());
  // Keep full effects quality in the headless browser.
  Quality.track = () => {};
  Fx.maxParticles = Quality.particles[0];
  Render.lowFx = false;
}

// Kiting bot: run from the crowd, stay away from the walls. Auto-aim shoots.
function startBot() {
  clearInterval(window.__bot);
  window.__bot = setInterval(() => {
    const h = Game.hero;
    if (!h || Game.state !== 'play' || window.__botOff) return;
    let vx = 0, vy = 0;
    for (const z of Game.zombies) {
      const dx = h.x - z.x, dy = h.y - z.y, d = Math.hypot(dx, dy) || 1;
      if (d < 320) { const w = (z.boss ? 3 : 1) / (d * d); vx += dx / d * w * 1e4; vy += dy / d * w * 1e4; }
    }
    // Lure mode: lead the crowd past the nearest barrel.
    if (window.__lure) {
      const alive = Game.zombies.filter(z => z.state !== 'dead').length;
      const bs = Game.barrels.filter(b => !b.dead && Math.hypot(b.x - h.x, b.y - h.y) > 90);
      if (alive >= 6 && bs.length) {
        const b = bs.reduce((p, c) => (Math.hypot(c.x - h.x, c.y - h.y) < Math.hypot(p.x - h.x, p.y - h.y) ? c : p));
        const dx = b.x - h.x, dy = b.y - h.y, d = Math.hypot(dx, dy);
        vx += dx / d * 1.2; vy += dy / d * 1.2;
      }
    }
    const a = Game.arena, m = 220;
    if (h.x < m) vx += (m - h.x) / 40; if (h.x > a.w - m) vx -= (h.x - (a.w - m)) / 40;
    if (h.y < m) vy += (m - h.y) / 40; if (h.y > a.h - m) vy -= (h.y - (a.h - m)) / 40;
    // Stuck on an obstacle → sidestep.
    if (window.__last && Math.hypot(h.x - __last.x, h.y - __last.y) < 2 && (vx || vy)) { const t = vx; vx = -vy; vy = t; }
    window.__last = { x: h.x, y: h.y };
    input.keys.clear();
    const len = Math.hypot(vx, vy);
    if (len < 0.05) return;
    if (vx / len > 0.38) input.keys.add('KeyD'); if (vx / len < -0.38) input.keys.add('KeyA');
    if (vy / len > 0.38) input.keys.add('KeyS'); if (vy / len < -0.38) input.keys.add('KeyW');
  }, 60);
}

async function startLevel(page, level, weapon, weaponLevel) {
  await page.evaluate(([level, weapon, weaponLevel]) => {
    if (weaponLevel) Progress.data.weapons[weapon] = weaponLevel;
    window.__botOff = false;
    Game.aimMode = 'auto';
    input.pointer = null;
    input.mouseDown = false;
    Progress.data.weapon = weapon;
    UI.closeAllModals();
    UI.startLevel(level);
    if (Game.state === 'intro') Game.beginPlay();
    Game.hero.hp = Game.hero.maxHp;
  }, [level, weapon, weaponLevel]);
}

const freeze = page => page.evaluate(() => Platform.suspend('shot'));
const unfreeze = page => page.evaluate(() => { Platform.resume('shot'); });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.waitForTimeout(120);
  await page.screenshot({ path: file, type: 'png' });
  console.log('saved', path.relative(ROOT, file));
}

// Polls fn in the page until it returns truthy or time runs out.
async function until(page, fn, arg, timeout) {
  const end = Date.now() + timeout;
  let next = 0;
  while (Date.now() < end) {
    if (LOG && Date.now() > next) {
      next = Date.now() + 3000;
      console.log(await page.evaluate(() => {
        const h = Game.hero, cam = Game.camera;
        const near = Game.barrels.filter(b => !b.dead).map(b => Game.zombies.filter(z => z.state !== 'dead' && Math.hypot(z.x - b.x, z.y - b.y) < 120).length + '/' + Math.round(Math.hypot(h.x - b.x, h.y - b.y)));
        return [Game.state, Math.round(Game.time) + 's', 'alive ' + Game.zombies.filter(z => z.state !== 'dead').length, 'hp ' + Math.round(h.hp), 'barrels ' + near.join(' ')].join(' | ');
      }));
    }
    const r = await page.evaluate(fn, arg);
    if (r) return r;
    if (await page.evaluate(() => Game.state === 'defeat' || Game.state === 'victory')) return null;
    await page.waitForTimeout(100);
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto('file://' + path.join(ROOT, 'index.html') + '?debug');
  await page.waitForFunction(() => typeof UI !== 'undefined' && UI.menu);
  await page.evaluate(seed, LANG);
  await page.evaluate(startBot);

  // 1) Main menu with the hero.
  if (want('menu')) await page.evaluate(() => { UI.closeAllModals(); UI.showMenu('battle'); UI.closeAllModals(); document.getElementById('toast').classList.add('hidden'); });
  if (want('menu')) {
    await page.waitForTimeout(2500);
    await shot(page, '01-menu.png');
  }

  // 2) Battle on level 15 (its waves come in big packs): crowd, shots, a barrel
  // blowing up. A low-level rifle so the crowd has time to gather.
  let done = false;
  for (let attempt = 0; attempt < 8 && !done && want('battle'); attempt++) {
    await startLevel(page, 15, 'smg', 1);
    await page.evaluate(() => {
      window.__boom = 0;
      if (!Game.__explodeWrapped) {
        const orig = Game.explode.bind(Game);
        Game.explode = (...a) => { if (a[4] === 'barrel') window.__boom = performance.now(); return orig(...a); };
        Game.__explodeWrapped = true;
      }
    });
    // Wait for a barrel on screen with a crowd around it, then shoot it.
    const target = await until(page, () => {
      if (Game.state === 'perk') Game.choosePerk(0);
      if (Game.state !== 'play') return null;
      const h = Game.hero, cam = Game.camera;
      const alive = Game.zombies.filter(z => z.state !== 'dead').length;
      if (alive < 8) return null;
      for (let i = 0; i < Game.barrels.length; i++) {
        const b = Game.barrels[i];
        if (b.dead) continue;
        const sx = b.x - cam.x + view.w / 2, sy = b.y - cam.y + view.h / 2;
        if (sx < 140 || sx > view.w - 140 || sy < 110 || sy > view.h - 90) continue;
        const near = Game.zombies.filter(z => z.state !== 'dead' && Math.hypot(z.x - b.x, z.y - b.y) < 125).length;
        const d = Math.hypot(h.x - b.x, h.y - b.y);
        if (near >= 2 && d > 140 && d < Game.weapon.range - 20) return i + 1;
      }
      return null;
    }, null, 90000);
    if (target === null) continue;
    await page.evaluate(i => {
      const b = Game.barrels[i - 1];
      Game.aimMode = 'manual';
      window.__aimAt = () => { input.pointer = { x: b.x - Game.camera.x + view.w / 2, y: b.y - Game.camera.y + view.h / 2 }; };
      window.__aimTimer = setInterval(__aimAt, 16);
      __aimAt();
      input.mouseDown = true;
    }, target);
    const boom = await until(page, () => window.__boom && performance.now() - window.__boom > 90, null, 4000);
    if (boom) {
      await freeze(page);
      await page.evaluate(() => { clearInterval(window.__aimTimer); input.mouseDown = false; input.pointer = null; });
      await shot(page, '02-battle.png');
      done = true;
    }
    await page.evaluate(() => { clearInterval(window.__aimTimer); input.mouseDown = false; input.pointer = null; Game.aimMode = 'auto'; });
    await unfreeze(page);
  }
  if (!done && want('battle')) errors.push('battle shot not taken');
  await page.evaluate(() => { Progress.data.weapons.smg = 5; });

  // 3) Boss fight on level 20 (Fire Chief): health bar and a ring of shots.
  done = false;
  for (let attempt = 0; attempt < 6 && !done && want('boss'); attempt++) {
    await startLevel(page, 20, 'crossbow');
    await until(page, () => {
      if (Game.state === 'perk') Game.choosePerk(0);
      if (Game.boss) return true;
      // Skip the regular waves (the same as clearing them, faster).
      if (Game.state === 'play' && Game.time > 1.5 && Game.bossPending < 0) Game.debugSkip();
      return false;
    }, null, 60000);
    const ok = await until(page, () => {
      if (Game.state === 'perk') Game.choosePerk(0);
      const b = Game.boss;
      if (!b || Game.state !== 'play') return false;
      const hpShare = b.hp / b.maxHp;
      const onScreen = Math.abs(b.x - Game.camera.x) < view.w / 2 - 220 && Math.abs(b.y - Game.camera.y) < view.h / 2 - 110;
      // Shots already flying away from the boss and still on screen.
      const shots = Bosses.shots.filter(s => Math.hypot(s.x - b.x, s.y - b.y) > b.r + 60
        && Math.abs(s.x - Game.camera.x) < view.w / 2 - 20 && Math.abs(s.y - Game.camera.y) < view.h / 2 - 20).length;
      return hpShare < 0.85 && onScreen && shots >= 7;
    }, null, 60000);
    if (ok) {
      await freeze(page);
      await shot(page, '03-boss.png');
      done = true;
    }
    await unfreeze(page);
  }
  if (!done && want('boss')) errors.push('boss shot not taken');

  // 4) Perk choice: play level 12 until the hero levels up.
  done = false;
  for (let attempt = 0; attempt < 4 && !done && want('perks'); attempt++) {
    await startLevel(page, 12, 'shotgun');
    const ok = await until(page, () => Game.state === 'perk' && Game.stateTime > 0.6, null, 60000);
    if (ok) {
      await shot(page, '04-perks.png');
      done = true;
    }
  }
  if (!done && want('perks')) errors.push('perk shot not taken');

  // 5) Arsenal.
  if (want('arsenal')) await page.evaluate(() => {
    window.__botOff = true;
    Progress.data.weapon = 'smg';
    UI.closeAllModals();
    UI.showMenu('arsenal');
    UI.closeAllModals();
    document.getElementById('toast').classList.add('hidden');
  });
  if (want('arsenal')) {
    await page.waitForTimeout(1500);
    await shot(page, '05-arsenal.png');
  }

  await browser.close();
  if (errors.length) {
    console.error('errors:', errors);
    process.exit(1);
  }
})();
