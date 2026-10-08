// Tutorial (8 steps on its own arena, guided by Raven) and one-time hints.

const TUTORIAL_STEPS = 8;

// Device- and aim-aware wording.
function tutTouch() {
  return !!Game.touch;
}

function aimHint() {
  if (Game.aimMode === 'auto') return 'Подойди ближе — в режиме «Авто» герой сам целится в ближайшего зомби и стреляет.';
  return tutTouch()
    ? 'Правый джойстик — прицел и огонь: тяни его в сторону зомби.'
    : 'Наведи мышь на зомби и зажми левую кнопку — огонь!';
}

function skillHint(sk) {
  return tutTouch()
    ? `Нажми круглую кнопку справа — навык «${sk.name}».`
    : `Нажми E или пробел — навык «${sk.name}».`;
}

const Tutorial = {
  create() {
    return { step: 0, phase: 'run', doneT: 0, t: 0, marker: null, danger: null, dodged: 0, kills0: 0, perks0: 0, hintOverride: null };
  },

  // Runs every frame while the tutorial arena is active.
  update(game, dt) {
    const tut = game.tutorial;
    tut.t += dt;
    if (tut.phase === 'praise') {
      tut.doneT -= dt;
      if (tut.doneT <= 0) this.begin(game, tut.step + 1);
      return;
    }
    if (tut.phase === 'finish') {
      tut.doneT -= dt;
      if (tut.doneT <= 0) {
        tut.phase = 'idle';
        game.emit('tutorialDone');
      }
      return;
    }
    if (tut.phase === 'idle') return;
    const s = this.steps[tut.step];
    if (s.update && s.update(game, tut, dt)) {
      if (tut.step >= TUTORIAL_STEPS - 1) {
        tut.phase = 'finish';
        tut.doneT = 1.4;
        game.banner('ОБУЧЕНИЕ ПРОЙДЕНО', '#7aff8a', 2, '', true);
        return;
      }
      tut.phase = 'praise';
      tut.doneT = 1.3;
      game.banner(['Отлично!', 'Так держать!', 'Хорошо!', 'Молодец!'][tut.step % 4], '#7aff8a', 1.2);
    }
  },

  begin(game, i) {
    const tut = game.tutorial;
    tut.step = i;
    tut.phase = 'run';
    tut.t = 0;
    tut.marker = null;
    tut.danger = null;
    tut.hintOverride = null;
    tut.kills0 = game.kills;
    tut.perks0 = Object.values(game.perks).reduce((a, b) => a + b, 0);
    const s = this.steps[i];
    if (s.start) s.start(game, tut);
  },

  hint(game) {
    const tut = game.tutorial;
    if (tut.hintOverride) return tut.hintOverride;
    const s = this.steps[tut.step];
    return typeof s.hint === 'function' ? s.hint(game, tut) : s.hint;
  },

  // World point the arrow should point at (or null).
  target(game) {
    const tut = game.tutorial;
    if (tut.phase !== 'run') return null;
    const s = this.steps[tut.step];
    return s.target ? s.target(game, tut) : null;
  },

  spawnAround(game, type, n, dist, angle, spread) {
    const h = game.hero;
    for (let i = 0; i < n; i++) {
      const a = angle + (i - (n - 1) / 2) * spread;
      let x = h.x + Math.cos(a) * dist, y = h.y + Math.sin(a) * dist;
      x = Math.max(BORDER + 40, Math.min(game.arena.w - BORDER - 40, x));
      y = Math.max(BORDER + 40, Math.min(game.arena.h - BORDER - 40, y));
      if (game.obstacleAt(x, y)) { x = h.x - Math.cos(a) * dist * 0.8; y = h.y - Math.sin(a) * dist * 0.8; }
      Zombies.spawn(game, type, x, y);
    }
  },

  // Direction from the hero towards the open middle of the arena.
  openDir(game) {
    const h = game.hero;
    return Math.atan2(game.arena.h / 2 - h.y + 1, game.arena.w / 2 - h.x + 1) + (Math.random() - 0.5) * 0.6;
  },

  nearestZombie(game) {
    return game.nearestZombie(game.hero.x, game.hero.y, 3000);
  },

  steps: [
    // 1. Movement
    {
      hint: () => tutTouch()
        ? 'Привет, я Ворон. Веди пальцем по левой половине экрана — это джойстик. Беги к светящейся точке!'
        : 'Привет, я Ворон. Двигайся клавишами WASD или стрелками. Беги к светящейся точке!',
      start(game, tut) {
        const h = game.hero;
        const a = Tutorial.openDir(game) + 0.8;
        tut.marker = {
          x: Math.max(BORDER + 80, Math.min(game.arena.w - BORDER - 80, h.x + Math.cos(a) * 340)),
          y: Math.max(BORDER + 80, Math.min(game.arena.h - BORDER - 80, h.y + Math.sin(a) * 340)),
        };
        if (game.obstacleAt(tut.marker.x, tut.marker.y)) tut.marker = { x: game.arena.w / 2 + 300, y: game.arena.h / 2 };
      },
      update(game, tut) {
        return Math.hypot(game.hero.x - tut.marker.x, game.hero.y - tut.marker.y) < 42;
      },
      target: (game, tut) => tut.marker,
    },
    // 2. Shooting (aim mode aware)
    {
      hint: () => `${aimHint()} Убей трёх зомби.`,
      start(game) {
        Tutorial.spawnAround(game, 'walker', 3, 330, Tutorial.openDir(game), 0.35);
        for (const z of game.zombies) z.speed *= 0.6;
      },
      update(game, tut) {
        return game.kills - tut.kills0 >= 3 && !game.zombies.length;
      },
      target: game => Tutorial.nearestZombie(game),
    },
    // 3. Loot
    {
      hint: 'Подбери опыт ◆ и монеты ● — просто подойди ближе, они притянутся сами.',
      start(game) {
        const h = game.hero;
        const a0 = Tutorial.openDir(game);
        for (let i = 0; i < 8; i++) {
          const a = a0 + (i - 3.5) * 0.25, d = 200 + (i % 3) * 40;
          const x = Math.max(BORDER + 30, Math.min(game.arena.w - BORDER - 30, h.x + Math.cos(a) * d));
          const y = Math.max(BORDER + 30, Math.min(game.arena.h - BORDER - 30, h.y + Math.sin(a) * d));
          game.pickups.push({ kind: i % 2 ? 'coin' : 'xp', value: i % 2 ? 2 : 1, x, y, vx: 0, vy: 0, life: 999, magnet: false, bob: i });
        }
      },
      update(game) {
        return !game.pickups.some(p => p.kind !== 'medkit');
      },
      target: game => {
        const h = game.hero;
        let best = null, bd = Infinity;
        for (const p of game.pickups) {
          const d = Math.hypot(p.x - h.x, p.y - h.y);
          if (d < bd) { bd = d; best = p; }
        }
        return best;
      },
    },
    // 4. Explosive barrel
    {
      hint: () => Game.aimMode === 'auto'
        ? 'Красная бочка взрывается от выстрела! Встань так, чтобы бочка была между тобой и зомби.'
        : 'Красная бочка взрывается от выстрела! Подожди, пока зомби подойдут к ней, и стреляй в бочку.',
      start(game, tut) {
        const h = game.hero;
        const a = Tutorial.openDir(game);
        const bx = Math.max(BORDER + 60, Math.min(game.arena.w - BORDER - 60, h.x + Math.cos(a) * 230));
        const by = Math.max(BORDER + 60, Math.min(game.arena.h - BORDER - 60, h.y + Math.sin(a) * 230));
        tut.barrel = { x: bx, y: by, r: 15, hp: 25, flash: 0, fuse: -1, dead: false };
        game.barrels.push(tut.barrel);
        Tutorial.spawnAround(game, 'walker', 4, 430, a, 0.18);
        for (const z of game.zombies) z.speed *= 0.55;
      },
      update(game, tut) {
        if (tut.barrel.dead) {
          // Clean up whoever survived the blast.
          if (game.zombies.length) tut.hintOverride = 'Бабах! Добей тех, кто остался.';
          return !game.zombies.length;
        }
        // If all zombies died without the barrel, send more.
        if (!game.zombies.length) Tutorial.spawnAround(game, 'walker', 3, 420, Math.atan2(tut.barrel.y - game.hero.y, tut.barrel.x - game.hero.x), 0.2);
        return false;
      },
      target: (game, tut) => (tut.barrel.dead ? Tutorial.nearestZombie(game) : tut.barrel),
    },
    // 5. Perk
    {
      hint: 'Опыт копится в синей полоске. На новом уровне выбери одно из трёх улучшений — оно действует до конца боя.',
      start(game) {
        const h = game.hero;
        h.xp = 0;
        h.lvl++;
        game.pendingPerks++;
      },
      update(game, tut) {
        return Object.values(game.perks).reduce((a, b) => a + b, 0) > tut.perks0 && game.state === 'play';
      },
    },
    // 6. Hero skill
    {
      hint: game => `${skillHint(game.hero.skill)} Он перезаряжается — следи за кругом на кнопке.`,
      start(game, tut) {
        game.hero.skill.t = 0;
        tut.used = false;
        Tutorial.spawnAround(game, 'walker', 5, 260, Tutorial.openDir(game), 0.22);
        for (const z of game.zombies) z.speed *= 0.5;
      },
      update(game, tut, dt) {
        if (!tut.used && game.hero.skill.t > 0) { tut.used = true; tut.usedT = 0; }
        if (tut.used) tut.usedT += dt;
        return tut.used && tut.usedT > 2;
      },
    },
    // 7. Danger zones
    {
      hint: (game, tut) => `Красный круг — сюда сейчас ударят. Выбеги из него! Увернулся: ${tut.dodged}/3`,
      start(game, tut) {
        // Clear the street so only the red circles matter.
        for (const z of game.zombies) {
          z.state = 'dead';
          Fx.burst(z.x, z.y, 8, { speed: 120, life: 0.5, size: 4, color: ['#3b2f22', '#4a3a28'], kind: 'dirt' });
        }
        tut.dodged = 0;
        tut.nextDanger = 0.6;
      },
      update(game, tut, dt) {
        if (!tut.danger) {
          tut.nextDanger -= dt;
          if (tut.nextDanger <= 0) {
            const h = game.hero;
            tut.danger = { x: h.x, y: h.y, r: 95, t: 1.5, max: 1.5 };
          }
          return tut.dodged >= 3;
        }
        const d = tut.danger;
        d.t -= dt;
        if (d.t <= 0) {
          Fx.explosion(d.x, d.y, d.r);
          const hit = Math.hypot(game.hero.x - d.x, game.hero.y - d.y) < d.r + game.hero.r * 0.5;
          if (hit) {
            game.banner('Не успел! Ещё раз', '#ff7a5a', 1.1);
            game.hero.hurt = 0.3;
          } else {
            tut.dodged++;
          }
          tut.danger = null;
          tut.nextDanger = 0.7;
        }
        return false;
      },
    },
    // 8. Final sweep
    {
      hint: 'Последнее задание: зачисти улицу! Здесь ты бессмертен — смело пробуй всё, чему научился.',
      start(game, tut) {
        for (const z of game.zombies) z.state = 'dead';
        tut.spawned = false;
        tut.queue = ['walker', 'walker', 'runner', 'walker', 'crawler', 'runner', 'walker', 'crawler'];
        tut.spawnT = 0.5;
      },
      update(game, tut, dt) {
        tut.spawnT -= dt;
        if (tut.queue.length && tut.spawnT <= 0) {
          const type = tut.queue.pop();
          const p = game.findSpawnPoint(ZOMBIES[type].radius);
          if (p) Zombies.spawn(game, type, p.x, p.y);
          tut.spawnT = 0.6;
        }
        return !tut.queue.length && !game.zombies.length;
      },
      target: game => Tutorial.nearestZombie(game),
    },
  ],
};

// ---------- One-time hints (after the tutorial) ----------

const Hints = {
  text: {
    boss: 'Это босс! Красные зоны показывают, куда он ударит, — успей отойти.',
    rage: 'Босс в ярости: бьёт чаще и сильнее. Держи дистанцию!',
    perk: 'Улучшения действуют до конца уровня. Выбирай то, что подходит твоему оружию.',
    lowhp: 'Мало здоровья! Отойди от толпы — аптечки выпадают из зомби.',
    streak: 'Серия ×10! Убивай без пауз — за длинные серии дают звёзды.',
    menuUpgrade: 'Монет хватает на улучшение — загляни в Арсенал.',
    menuHero: 'Золота хватает на нового героя — загляни во вкладку «Герои».',
  },

  seen(id) {
    return Progress.data && Progress.data.hints.includes(id);
  },

  // Shows a Raven hint once per save. In battle it is a toast on the canvas,
  // in the menu a DOM toast.
  trigger(id, text) {
    if (!Progress.data || Game.tutorial || this.seen(id)) return false;
    text = text || this.text[id];
    if (!text) return false;
    Progress.data.hints.push(id);
    Progress.save();
    if (Game.state === 'menu') UI.toast(text);
    else if (Game.hint) Game.hintQueue.push({ text, t: 6, max: 6 });
    else Game.hint = { text, t: 6, max: 6 };
    return true;
  },

  skill(sk) {
    this.trigger('skill', `Навык «${sk.name}» готов! ${tutTouch() ? 'Нажми круглую кнопку справа.' : 'Нажми E или пробел.'}`);
  },

  manual() {
    this.trigger('manual', tutTouch()
      ? 'Ручной прицел: правый джойстик — прицел и огонь. Переключить можно в настройках.'
      : 'Ручной прицел: мышь — прицел, левая кнопка — огонь. Переключить можно в настройках.');
  },
};
