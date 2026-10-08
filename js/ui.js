// Menu, progress and windows. The menu is DOM on top of the game canvas;
// behind it the canvas shows a night district with wandering zombies.

// ---------- Progress (saved through Platform) ----------

const Progress = {
  data: null,

  defaults() {
    return {
      v: 1,
      coins: ECONOMY.startCoins,
      gold: 0,
      stars: new Array(101).fill(0),
      unlocked: 1,
      weapons: { pistol: 1 },
      weapon: 'pistol',
      heroes: { max: 1 },
      hero: 'max',
      settings: { aim: 'auto', sound: true },
      seenEnemies: [],
      tutorialDone: false,
      tutorialOffered: false,
      hints: [],
      seenStories: [],
      seenWeapons: ['pistol'],
      bossesBeaten: [],
      claimed: [],
      stats: { kills: 0, levels: 0, bosses: 0, bestStreak: 0, upgrades: 0 },
    };
  },

  load() {
    const d = this.defaults();
    const saved = Platform.load();
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(d)) {
        if (saved[k] === undefined) continue;
        if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = Object.assign(d[k], saved[k]);
        else d[k] = saved[k];
      }
      if (!Array.isArray(d.stars) || d.stars.length < 101) d.stars = new Array(101).fill(0).map((v, i) => (saved.stars && saved.stars[i]) || 0);
    }
    this.data = d;
  },

  save() {
    Platform.save(this.data);
  },

  reset() {
    Platform.clear();
    this.load();
  },

  get totalStars() {
    return this.data.stars.reduce((a, b) => a + b, 0);
  },

  districtStars(d) {
    let s = 0;
    for (let n = d.levels[0]; n <= d.levels[1]; n++) s += this.data.stars[n];
    return s;
  },

  stat(name) {
    if (name === 'stars') return this.totalStars;
    if (name === 'heroes') return Object.keys(this.data.heroes).length;
    return this.data.stats[name] || 0;
  },

  weaponOpen(w) {
    return w.unlock <= this.data.unlocked;
  },

  weaponLevel(id) {
    return this.data.weapons[id] || 1;
  },

  loadout() {
    const d = this.data;
    return {
      hero: d.hero,
      heroLevel: d.heroes[d.hero] || 1,
      weapon: d.weapon,
      weaponLevel: this.weaponLevel(d.weapon),
    };
  },

  recordWin(r) {
    const d = this.data;
    const prev = d.stars[r.level] || 0;
    d.stars[r.level] = Math.max(prev, r.stars);
    let gold = 0;
    if (r.boss && !d.bossesBeaten.includes(r.boss)) {
      d.bossesBeaten.push(r.boss);
      gold += ECONOMY.bossGold;
      d.stats.bosses++;
    }
    if (r.stars === 3 && prev < 3) gold += ECONOMY.threeStarGold;
    const coins = r.coins + r.bonus;
    d.coins += coins;
    d.gold += gold;
    if (prev === 0) d.stats.levels++;
    d.stats.kills += r.kills;
    d.stats.bestStreak = Math.max(d.stats.bestStreak, r.best || 0);

    const before = d.unlocked;
    if (r.level >= d.unlocked) d.unlocked = Math.min(100, r.level + 1);
    let newWeapon = null;
    if (d.unlocked > before) {
      newWeapon = WEAPONS.find(w => w.unlock > before && w.unlock <= d.unlocked && !d.seenWeapons.includes(w.id)) || null;
      if (newWeapon) {
        d.seenWeapons.push(newWeapon.id);
        d.weapons[newWeapon.id] = d.weapons[newWeapon.id] || 1;
      }
    }
    this.save();
    return { coins, gold, newWeapon, prevStars: prev };
  },

  recordDefeat(r) {
    const d = this.data;
    d.coins += r.coins;
    d.stats.kills += r.kills;
    d.stats.bestStreak = Math.max(d.stats.bestStreak, r.best || 0);
    this.save();
  },

  upgradeWeapon(id) {
    const lvl = this.weaponLevel(id);
    const cost = ECONOMY.weaponCost(lvl);
    if (lvl >= ECONOMY.weaponMaxLevel || this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.data.weapons[id] = lvl + 1;
    this.data.stats.upgrades++;
    this.save();
    return true;
  },

  upgradeHero(id) {
    const lvl = this.data.heroes[id];
    if (!lvl) return false;
    const cost = ECONOMY.heroCost(lvl);
    if (lvl >= ECONOMY.heroMaxLevel || this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.data.heroes[id] = lvl + 1;
    this.save();
    return true;
  },

  buyHero(id) {
    const h = HEROES[id];
    if (this.data.heroes[id] || this.data.gold < h.gold) return false;
    this.data.gold -= h.gold;
    this.data.heroes[id] = 1;
    this.data.hero = id;
    this.save();
    return true;
  },

  claimQuest(q) {
    if (this.data.claimed.includes(q.id) || this.stat(q.stat) < q.goal) return false;
    this.data.claimed.push(q.id);
    this.data.coins += q.reward.coins || 0;
    this.data.gold += q.reward.gold || 0;
    this.save();
    return true;
  },
};

// ---------- UI ----------

const TABS = [
  { id: 'battle',  name: 'Бой',     icon: '⚔' },
  { id: 'map',     name: 'Карта',   icon: '⌂' },
  { id: 'arsenal', name: 'Арсенал', icon: '⌖' },
  { id: 'heroes',  name: 'Герои',   icon: '☺' },
  { id: 'quests',  name: 'Задания', icon: '✓' },
];

const WEAPON_TYPE_NAMES = {
  bullet: 'Пули', bolt: 'Болты', flame: 'Огонь', grenade: 'Гранаты', tesla: 'Молния', plasma: 'Плазма', rocket: 'Ракеты',
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function districtOf(level) {
  return DISTRICTS.find(d => level >= d.levels[0] && level <= d.levels[1]) || DISTRICTS[DISTRICTS.length - 1];
}

function bossAt(level) {
  return Object.keys(BOSSES).find(id => BOSSES[id].level === level) || null;
}

const UI = {
  tab: 'battle',
  modals: [],

  init() {
    Progress.load();
    Game.aimMode = Progress.data.settings.aim;
    Game.seenEnemies = new Set(Progress.data.seenEnemies);

    Game.hooks.victory = r => this.onVictory(r);
    Game.hooks.defeat = r => this.onDefeat(r);
    Game.hooks.pause = () => this.showPause();
    Game.hooks.tutorialDone = () => this.onTutorialDone();
    Game.hooks.tutorialSkip = () => this.confirm('Пропустить обучение?', 'Его можно пройти позже: Настройки → «Пройти обучение».', () => {
      Progress.data.tutorialOffered = true;
      Progress.save();
      this.showMenu();
    }, () => Game.resume());
    Game.hooks.enemySeen = type => {
      if (type && !Progress.data.seenEnemies.includes(type)) {
        Progress.data.seenEnemies.push(type);
        Progress.save();
      }
    };

    this.root = document.getElementById('ui');
    this.root.innerHTML = `
      <div id="menu" class="hidden">
        <header class="topbar">
          <div class="logo">Последний <span>рассвет</span></div>
          <div class="wallet">
            <div class="chip coins" title="Монеты"><b>●</b><span data-bind="coins"></span></div>
            <div class="chip gold" title="Золото"><b>◆</b><span data-bind="gold"></span></div>
            <div class="chip stars" title="Звёзды"><b>★</b><span data-bind="stars"></span></div>
            <button class="icon-btn" data-action="sound" title="Звук"><span data-bind="sound"></span></button>
            <button class="icon-btn" data-action="settings" title="Настройки">⚙</button>
          </div>
        </header>
        <main class="content" id="tab-content"></main>
        <nav class="tabbar">
          ${TABS.map(t => `<button class="tab" data-tab="${t.id}"><i>${t.icon}</i><span>${t.name}</span></button>`).join('')}
        </nav>
      </div>
      <div id="toast" class="toast hidden"><canvas class="raven" data-raven="1"></canvas><span></span></div>
      <div id="modals"></div>`;
    this.menu = document.getElementById('menu');
    this.content = document.getElementById('tab-content');
    this.modalLayer = document.getElementById('modals');

    this.root.addEventListener('click', e => this.onClick(e));
    window.addEventListener('keydown', e => {
      if (!this.modals.length) return;
      const top = this.modals[this.modals.length - 1];
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (top.onEscape) top.onEscape();
        e.stopImmediatePropagation();
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        // Enter presses the main button of the top window.
        const btn = top.el.querySelector('.btn.primary');
        if (btn) btn.click();
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  },

  // ---------- Menu ----------

  showMenu(tab) {
    this.closeAllModals();
    if (tab) this.tab = tab;
    Game.startMenuScene(Progress.data.unlocked);
    this.menu.classList.remove('hidden');
    this.render();
    if (!Progress.data.tutorialOffered) this.showTutorialOffer();
    else this.menuHints();
  },

  // One-time hints in the menu when something new can be bought.
  menuHints() {
    const d = Progress.data;
    const lvl = Progress.weaponLevel(d.weapon);
    if (lvl < ECONOMY.weaponMaxLevel && d.coins >= ECONOMY.weaponCost(lvl)) Hints.trigger('menuUpgrade');
    else if (Object.entries(HEROES).some(([id, h]) => !d.heroes[id] && d.gold >= h.gold)) Hints.trigger('menuHero');
  },

  toast(text) {
    const el = document.getElementById('toast');
    el.querySelector('span').textContent = text;
    el.classList.remove('hidden');
    this.paintCanvases(el);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 5500);
  },

  // ---------- Tutorial ----------

  showTutorialOffer() {
    const m = this.modal({
      cls: 'tutorial-offer',
      html: `
        <canvas class="raven big" data-raven="1"></canvas>
        <h2>Привет, я Ворон</h2>
        <p>Город захватили мертвецы. Я покажу, как здесь выжить: 8 коротких шагов, пара минут.</p>
        <p class="hint">За обучение — награда: ● ${ECONOMY.tutorialReward.coins} и ◆ ${ECONOMY.tutorialReward.gold}.</p>
        <div class="buttons">
          <button class="btn" data-action="skip">Пропустить</button>
          <button class="btn primary" data-action="learn">Пройти обучение</button>
        </div>`,
    });
    const mark = () => { Progress.data.tutorialOffered = true; Progress.save(); };
    m.actions.skip = () => { mark(); this.closeModal(m); };
    m.actions.learn = () => { mark(); this.startTutorial(); };
  },

  startTutorial() {
    this.closeAllModals();
    this.hideMenu();
    Game.loadout = Progress.loadout();
    Game.aimMode = Progress.data.settings.aim;
    Game.startTutorial();
  },

  onTutorialDone() {
    const d = Progress.data;
    const first = !d.tutorialDone;
    const r = ECONOMY.tutorialReward;
    d.tutorialDone = true;
    d.tutorialOffered = true;
    if (first) {
      d.coins += r.coins;
      d.gold += r.gold;
    }
    Progress.save();
    Game.setState('paused');
    const m = this.modal({
      cls: 'tutorial-offer',
      html: `
        <canvas class="raven big" data-raven="1"></canvas>
        <h2>Обучение пройдено!</h2>
        <p>Теперь ты готов. Дальше — Окраина и первые волны. Я буду подсказывать по пути.</p>
        ${first ? `<div class="rewards"><span class="coins">● +${r.coins}</span><span class="gold">◆ +${r.gold}</span></div>` : '<p class="hint">Награда уже получена раньше.</p>'}
        <div class="buttons"><button class="btn primary" data-action="ok">В бой!</button></div>`,
    });
    m.actions.ok = () => this.showMenu('battle');
  },

  hideMenu() {
    this.menu.classList.add('hidden');
    document.getElementById('toast').classList.add('hidden');
  },

  render() {
    const d = Progress.data;
    this.bind('coins', d.coins);
    this.bind('gold', d.gold);
    this.bind('stars', `${Progress.totalStars}/300`);
    this.bind('sound', d.settings.sound ? '♪' : '✕');
    this.menu.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this.tab));
    const fn = { battle: 'renderBattle', map: 'renderMap', arsenal: 'renderArsenal', heroes: 'renderHeroes', quests: 'renderQuests' }[this.tab];
    this.content.className = 'content tab-' + this.tab;
    this[fn]();
  },

  bind(name, value) {
    this.root.querySelectorAll(`[data-bind="${name}"]`).forEach(el => { el.textContent = value; });
  },

  renderBattle() {
    const d = Progress.data;
    const level = d.unlocked;
    const dist = districtOf(level);
    const boss = bossAt(level);
    const w = WEAPONS.find(x => x.id === d.weapon);
    const h = HEROES[d.hero];
    const nextWeapon = WEAPONS.find(x => x.unlock > level);
    const nextBoss = Object.values(BOSSES).find(b => b.level >= level);
    this.content.innerHTML = `
      <section class="battle">
        <div class="battle-hero card">
          <canvas class="portrait big" data-hero="${d.hero}"></canvas>
          <div class="hero-name">${esc(h.name)} <small>ур. ${d.heroes[d.hero]}</small></div>
          <div class="hero-skill">${esc(h.skill.name)}</div>
        </div>
        <div class="battle-main card glow">
          <div class="district" style="--acc:${dist.accent}">${esc(dist.name)}</div>
          <div class="level-title">Уровень ${level}</div>
          ${boss ? `<div class="boss-badge">☠ Босс: ${esc(BOSSES[boss].name)}</div>` : `<div class="sub">★ ${Progress.districtStars(dist)} / ${(dist.levels[1] - dist.levels[0] + 1) * 3} в районе</div>`}
          <button class="btn primary huge" data-action="play" data-level="${level}">ИГРАТЬ</button>
          <div class="loadout">
            <button class="mini" data-tab="arsenal"><canvas class="weapon-icon" data-weapon="${w.id}"></canvas><span>${esc(w.name)} <small>ур. ${Progress.weaponLevel(w.id)}</small></span></button>
          </div>
        </div>
        <div class="battle-side card">
          <div class="side-title">Впереди</div>
          ${nextWeapon ? `<div class="teaser"><canvas class="weapon-icon" data-weapon="${nextWeapon.id}"></canvas><div><b>${esc(nextWeapon.name)}</b><small>откроется на ур. ${nextWeapon.unlock}</small></div></div>` : ''}
          ${nextBoss ? `<div class="teaser boss"><i>☠</i><div><b>${esc(nextBoss.name)}</b><small>уровень ${nextBoss.level}</small></div></div>` : ''}
          <div class="teaser"><i>✓</i><div><b>Задания</b><small>${QUESTS.filter(q => !d.claimed.includes(q.id) && Progress.stat(q.stat) >= q.goal).length} готово к награде</small></div></div>
        </div>
      </section>`;
    this.paintCanvases();
  },

  renderMap() {
    const d = Progress.data;
    const html = DISTRICTS.map(dist => {
      const [a, b] = dist.levels;
      const nodes = [];
      for (let n = a; n <= b; n++) {
        const i = n - a;
        const locked = n > d.unlocked;
        const cur = n === d.unlocked;
        const boss = bossAt(n);
        const st = d.stars[n];
        nodes.push(`
          <button class="node ${locked ? 'locked' : ''} ${cur ? 'current' : ''} ${boss ? 'boss' : ''} ${i % 2 ? 'low' : 'high'}"
                  data-action="${locked ? '' : 'play'}" data-level="${n}" style="--acc:${dist.accent}">
            ${boss ? '<i class="skull">☠</i>' : ''}
            <span class="num">${n}</span>
            <span class="node-stars">${[0, 1, 2].map(k => `<em class="${k < st ? 'on' : ''}">★</em>`).join('')}</span>
          </button>`);
      }
      const open = a <= d.unlocked;
      return `
        <div class="district-block ${open ? '' : 'closed'}" style="--acc:${dist.accent}">
          <div class="district-head">
            <b>${esc(dist.name)}</b>
            <small>Уровни ${a}–${b} · ★ ${Progress.districtStars(dist)}/${(b - a + 1) * 3}</small>
          </div>
          <div class="nodes">${nodes.join('')}</div>
        </div>`;
    }).join('');
    this.content.innerHTML = `<div class="map-scroll" id="map-scroll">${html}</div>`;
    const cur = this.content.querySelector('.node.current');
    const sc = document.getElementById('map-scroll');
    if (cur && sc) sc.scrollLeft = Math.max(0, cur.offsetLeft - sc.clientWidth / 2 + 30);
  },

  renderArsenal() {
    const d = Progress.data;
    const maxDmg = Math.max(...WEAPONS.map(w => w.damage * (w.pellets || 1) * w.rate));
    const cards = WEAPONS.map(w => {
      const open = Progress.weaponOpen(w);
      const lvl = Progress.weaponLevel(w.id);
      const cost = ECONOMY.weaponCost(lvl);
      const max = lvl >= ECONOMY.weaponMaxLevel;
      const mul = 1 + ECONOMY.weaponDamagePerLevel * (lvl - 1);
      const dps = w.damage * (w.pellets || 1) * w.rate * mul;
      const eq = d.weapon === w.id;
      const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, Math.round(v * 100))}%"></i></div></div>`;
      return `
        <div class="card item ${open ? '' : 'locked'} ${eq ? 'equipped' : ''}" style="--acc:${w.color}">
          <div class="item-head"><b>${esc(w.name)}</b><small>${WEAPON_TYPE_NAMES[w.type]}</small></div>
          <canvas class="weapon-art" data-weapon="${w.id}"></canvas>
          ${open ? `
            <div class="item-level">Ур. ${lvl}/${ECONOMY.weaponMaxLevel}</div>
            ${bar('Урон', dps / maxDmg)}
            ${bar('Темп', w.rate / 20)}
            ${bar('Дальность', w.range / 560)}
            <div class="item-desc">${esc(w.desc)}</div>
            <div class="item-actions">
              ${eq ? '<span class="tag">В руках</span>' : `<button class="btn" data-action="equip" data-id="${w.id}">Взять</button>`}
              ${max ? '<span class="tag">Макс.</span>' : `<button class="btn primary ${d.coins < cost ? 'disabled' : ''}" data-action="upgrade-weapon" data-id="${w.id}">▲ ● ${cost}</button>`}
            </div>` : `
            <div class="item-desc">${esc(w.desc)}</div>
            <div class="lock-note">Откроется на уровне ${w.unlock}</div>`}
        </div>`;
    }).join('');
    this.content.innerHTML = `<div class="hscroll">${cards}</div>`;
    this.paintCanvases();
  },

  renderHeroes() {
    const d = Progress.data;
    const cards = Object.entries(HEROES).map(([id, h]) => {
      const owned = d.heroes[id];
      const sel = d.hero === id;
      const lvl = owned || 1;
      const cost = ECONOMY.heroCost(lvl);
      const max = lvl >= ECONOMY.heroMaxLevel;
      const hp = Math.round(h.hp * (1 + ECONOMY.heroHpPerLevel * (lvl - 1)));
      const power = Math.round((ECONOMY.heroSkillPerLevel * (lvl - 1)) * 100);
      return `
        <div class="card item hero ${owned ? '' : 'locked'} ${sel ? 'equipped' : ''}" style="--acc:${h.color}">
          <div class="item-head"><b>${esc(h.name)}</b><small>${esc(h.role)}</small></div>
          <canvas class="portrait" data-hero="${id}"></canvas>
          <div class="skill-box"><b>${Render.skillIcon[h.skill.id]} ${esc(h.skill.name)}</b><small>${esc(h.skill.desc)}</small></div>
          <div class="hero-stats"><span>♥ ${hp}</span><span>➤ ${h.speed}</span><span>⟳ ${h.skill.cd}с</span>${power ? `<span>+${power}%</span>` : ''}</div>
          <div class="item-actions">
            ${owned ? `
              ${sel ? '<span class="tag">Выбран</span>' : `<button class="btn" data-action="select-hero" data-id="${id}">Выбрать</button>`}
              ${max ? '<span class="tag">Макс.</span>' : `<button class="btn primary ${d.coins < cost ? 'disabled' : ''}" data-action="upgrade-hero" data-id="${id}">▲ ● ${cost}</button>`}
              <small class="lvl">ур. ${lvl}</small>` : `
              <button class="btn gold ${d.gold < h.gold ? 'disabled' : ''}" data-action="buy-hero" data-id="${id}">Открыть ◆ ${h.gold}</button>`}
          </div>
        </div>`;
    }).join('');
    this.content.innerHTML = `<div class="hscroll">${cards}</div>`;
    this.paintCanvases();
  },

  renderQuests() {
    const d = Progress.data;
    const sorted = QUESTS.slice().sort((a, b) => {
      const sa = d.claimed.includes(a.id) ? 2 : Progress.stat(a.stat) >= a.goal ? 0 : 1;
      const sb = d.claimed.includes(b.id) ? 2 : Progress.stat(b.stat) >= b.goal ? 0 : 1;
      return sa - sb;
    });
    const rows = sorted.map(q => {
      const v = Math.min(q.goal, Progress.stat(q.stat));
      const done = v >= q.goal;
      const claimed = d.claimed.includes(q.id);
      const reward = [q.reward.coins ? `● ${q.reward.coins}` : '', q.reward.gold ? `◆ ${q.reward.gold}` : ''].filter(Boolean).join(' ');
      return `
        <div class="quest ${claimed ? 'claimed' : done ? 'ready' : ''}">
          <div class="q-text"><b>${esc(q.text)}</b>
            <div class="bar"><i style="width:${Math.round(v / q.goal * 100)}%"></i></div>
            <small>${v} / ${q.goal}</small>
          </div>
          <div class="q-reward">${reward}</div>
          ${claimed ? '<span class="tag">Получено</span>' : `<button class="btn ${done ? 'primary' : 'disabled'}" data-action="claim" data-id="${q.id}">Забрать</button>`}
        </div>`;
    }).join('');
    this.content.innerHTML = `<div class="vscroll quests">${rows}</div>`;
  },

  // Canvas portraits need layout first.
  paintCanvases(root = this.root) {
    requestAnimationFrame(() => {
      root.querySelectorAll('canvas[data-hero]').forEach(c => Render.portraitHero(c, c.dataset.hero));
      root.querySelectorAll('canvas[data-weapon]').forEach(c => Render.portraitWeapon(c, WEAPONS.find(w => w.id === c.dataset.weapon)));
      root.querySelectorAll('canvas[data-raven]').forEach(c => Render.portraitRaven(c));
      root.querySelectorAll('canvas[data-story]').forEach(c => Render.storyArt(c, DISTRICTS.find(d => d.id === c.dataset.story)));
    });
  },

  // ---------- Clicks ----------

  onClick(e) {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn && this.menu.contains(tabBtn)) {
      this.tab = tabBtn.dataset.tab;
      this.render();
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el || !el.dataset.action || el.classList.contains('disabled')) return;
    const id = el.dataset.id;
    const d = Progress.data;
    switch (el.dataset.action) {
      case 'play':
        this.play(Number(el.dataset.level));
        break;
      case 'sound':
        d.settings.sound = !d.settings.sound;
        Progress.save();
        this.render();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'equip':
        d.weapon = id;
        Progress.save();
        this.render();
        break;
      case 'upgrade-weapon':
        if (Progress.upgradeWeapon(id)) this.render();
        break;
      case 'select-hero':
        d.hero = id;
        Progress.save();
        this.render();
        break;
      case 'upgrade-hero':
        if (Progress.upgradeHero(id)) this.render();
        break;
      case 'buy-hero':
        if (Progress.buyHero(id)) {
          this.render();
          this.showNewHero(id);
        }
        break;
      case 'claim':
        if (Progress.claimQuest(QUESTS.find(q => q.id === id))) this.render();
        break;
      default: {
        // Modal buttons
        const top = this.modals[this.modals.length - 1];
        if (top && top.actions && top.actions[el.dataset.action]) top.actions[el.dataset.action]();
      }
    }
  },

  // ---------- Starting levels ----------

  play(level) {
    level = Math.max(1, Math.min(level, Progress.data.unlocked, 100));
    const dist = districtOf(level);
    const d = Progress.data;
    if (level === dist.levels[0] && !d.seenStories.includes(dist.id)) {
      d.seenStories.push(dist.id);
      Progress.save();
      this.showStory(dist, () => this.startLevel(level));
      return;
    }
    this.startLevel(level);
  },

  startLevel(level) {
    this.closeAllModals();
    this.hideMenu();
    Game.loadout = Progress.loadout();
    Game.aimMode = Progress.data.settings.aim;
    Game.start(level);
  },

  // ---------- Windows ----------

  modal({ cls = '', html, actions = {}, onEscape = null }) {
    const el = document.createElement('div');
    el.className = 'modal-wrap';
    el.innerHTML = `<div class="modal ${cls}">${html}</div>`;
    this.modalLayer.appendChild(el);
    const m = { el, actions, onEscape };
    this.modals.push(m);
    this.modalLayer.classList.add('active');
    this.paintCanvases(el);
    return m;
  },

  closeModal(m) {
    const i = this.modals.indexOf(m);
    if (i >= 0) this.modals.splice(i, 1);
    m.el.remove();
    if (!this.modals.length) this.modalLayer.classList.remove('active');
  },

  closeAllModals() {
    while (this.modals.length) this.closeModal(this.modals[this.modals.length - 1]);
  },

  aimSwitch() {
    const a = Progress.data.settings.aim;
    return `
      <div class="setting">
        <span>Прицел</span>
        <div class="segmented">
          <button class="${a === 'auto' ? 'on' : ''}" data-action="aim-auto">Авто</button>
          <button class="${a === 'manual' ? 'on' : ''}" data-action="aim-manual">Ручной</button>
        </div>
      </div>
      <p class="hint">${a === 'auto' ? 'Герой сам целится в ближайшего зомби и стреляет.' : ('ontouchstart' in window ? 'Правый джойстик — прицел и огонь.' : 'Мышь — прицел, левая кнопка — огонь.')}</p>`;
  },

  setAim(mode, rerender) {
    Progress.data.settings.aim = mode;
    Progress.save();
    Game.aimMode = mode;
    rerender();
  },

  showSettings() {
    const m = this.modal({
      cls: 'settings',
      html: this.settingsHtml(),
      onEscape: () => this.closeModal(m),
    });
    const re = () => { m.el.querySelector('.modal').innerHTML = this.settingsHtml(); };
    Object.assign(m.actions, {
      'aim-auto': () => this.setAim('auto', re),
      'aim-manual': () => this.setAim('manual', re),
      'toggle-sound': () => { Progress.data.settings.sound = !Progress.data.settings.sound; Progress.save(); re(); this.render(); },
      'reset': () => this.confirm('Сбросить весь прогресс?', 'Монеты, звёзды, оружие и герои пропадут.', () => {
        Progress.reset();
        Game.aimMode = Progress.data.settings.aim;
        Game.seenEnemies = new Set();
        this.closeAllModals();
        this.showMenu('battle');
      }),
      'tutorial': () => this.startTutorial(),
      'close': () => this.closeModal(m),
    });
  },

  settingsHtml() {
    const s = Progress.data.settings;
    return `
      <h2>Настройки</h2>
      ${this.aimSwitch()}
      <div class="setting">
        <span>Звук</span>
        <div class="segmented">
          <button class="${s.sound ? 'on' : ''}" data-action="toggle-sound">${s.sound ? 'Вкл' : 'Выкл'}</button>
        </div>
      </div>
      <div class="buttons">
        <button class="btn" data-action="tutorial">Пройти обучение</button>
        <button class="btn danger" data-action="reset">Сбросить прогресс</button>
        <button class="btn primary" data-action="close">Готово</button>
      </div>`;
  },

  confirm(title, text, yes, no) {
    const cancel = () => { this.closeModal(m); if (no) no(); };
    const m = this.modal({
      cls: 'confirm',
      html: `<h2>${esc(title)}</h2><p>${esc(text)}</p>
        <div class="buttons"><button class="btn" data-action="no">Отмена</button><button class="btn danger" data-action="yes">Да</button></div>`,
      onEscape: cancel,
    });
    m.actions.no = cancel;
    m.actions.yes = () => { this.closeModal(m); yes(); };
  },

  showPause() {
    const m = this.modal({
      cls: 'pause',
      html: this.pauseHtml(),
      onEscape: () => resume(),
    });
    const resume = () => { this.closeModal(m); Game.resume(); };
    const re = () => { m.el.querySelector('.modal').innerHTML = this.pauseHtml(); };
    Object.assign(m.actions, {
      resume,
      retry: () => (Game.tutorial ? this.startTutorial() : this.startLevel(Game.level)),
      menu: () => this.showMenu(),
      'aim-auto': () => this.setAim('auto', re),
      'aim-manual': () => this.setAim('manual', re),
    });
  },

  pauseHtml() {
    const dist = Game.district;
    const where = Game.tutorial
      ? `Обучение · шаг ${Game.tutorial.step + 1}/${TUTORIAL_STEPS}`
      : `Уровень ${Game.level} · ${esc(dist.name)} · волна ${Game.waveIndex + 1}/${Game.config.waves.length}`;
    return `
      <h2>Пауза</h2>
      <p class="sub">${where}</p>
      ${this.aimSwitch()}
      <div class="buttons col">
        <button class="btn primary big" data-action="resume">Продолжить</button>
        <div class="row">
          <button class="btn" data-action="retry">Заново</button>
          <button class="btn" data-action="menu">В меню</button>
        </div>
      </div>`;
  },

  onVictory(r) {
    const rew = Progress.recordWin(r);
    const goals = r.goals.map(g => `
      <li class="${g.state === 'ok' ? 'ok' : 'fail'}"><i>${g.state === 'ok' ? '✔' : '✘'}</i><span>${esc(g.text)}</span><small>${esc(g.progress || '')}</small></li>`).join('');
    const mm = Math.floor(r.time / 60), ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    const last = r.level >= 100;
    const m = this.modal({
      cls: 'result victory',
      html: `
        <h2>ПОБЕДА!</h2>
        <p class="sub">Уровень ${r.level} · ${esc(districtOf(r.level).name)}</p>
        <div class="big-stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.45}s">★</span>`).join('')}</div>
        <ul class="goals">${goals}</ul>
        <div class="result-stats">☠ ${r.kills} · ⏱ ${mm}:${ss} · серия ×${r.best}</div>
        <div class="rewards"><span class="coins">● +${rew.coins}</span>${rew.gold ? `<span class="gold">◆ +${rew.gold}</span>` : ''}</div>
        <div class="buttons">
          <button class="btn" data-action="menu">В меню</button>
          <button class="btn" data-action="retry">Заново</button>
          ${last ? '' : '<button class="btn primary" data-action="next">Дальше</button>'}
        </div>`,
    });
    const after = then => () => {
      this.closeModal(m);
      if (rew.newWeapon) this.showNewWeapon(rew.newWeapon, then);
      else then();
    };
    Object.assign(m.actions, {
      menu: after(() => this.showMenu()),
      retry: after(() => this.startLevel(r.level)),
      next: after(() => this.play(r.level + 1)),
    });
  },

  onDefeat(r) {
    Progress.recordDefeat(r);
    const m = this.modal({
      cls: 'result defeat',
      html: `
        <h2>ТЫ ПОГИБ</h2>
        <p class="sub">Уровень ${r.level} · дошёл до волны ${r.wave}/${r.waves}</p>
        <div class="result-stats">☠ ${r.kills}</div>
        <div class="rewards"><span class="coins">● +${r.coins}</span><small>половина собранного</small></div>
        <p class="hint">Улучши оружие в Арсенале или попробуй другого героя.</p>
        <div class="buttons">
          <button class="btn" data-action="menu">В меню</button>
          <button class="btn" data-action="arsenal">Арсенал</button>
          <button class="btn primary" data-action="retry">Заново</button>
        </div>`,
    });
    Object.assign(m.actions, {
      menu: () => this.showMenu(),
      arsenal: () => this.showMenu('arsenal'),
      retry: () => this.startLevel(r.level),
    });
  },

  showNewWeapon(w, then) {
    const m = this.modal({
      cls: 'reveal',
      html: `
        <div class="ribbon">НОВОЕ ОРУЖИЕ</div>
        <canvas class="weapon-art big" data-weapon="${w.id}"></canvas>
        <h2 style="color:${w.color}">${esc(w.name)}</h2>
        <p>${esc(w.desc)}</p>
        <div class="buttons">
          <button class="btn" data-action="later">Позже</button>
          <button class="btn primary" data-action="take">Взять в бой</button>
        </div>`,
    });
    Object.assign(m.actions, {
      later: () => { this.closeModal(m); then(); },
      take: () => { Progress.data.weapon = w.id; Progress.save(); this.closeModal(m); then(); },
    });
  },

  showNewHero(id) {
    const h = HEROES[id];
    const m = this.modal({
      cls: 'reveal',
      html: `
        <div class="ribbon">НОВЫЙ ГЕРОЙ</div>
        <canvas class="portrait big" data-hero="${id}"></canvas>
        <h2>${esc(h.name)} <small>${esc(h.role)}</small></h2>
        <p><b>${Render.skillIcon[h.skill.id]} ${esc(h.skill.name)}</b> — ${esc(h.skill.desc)}</p>
        <div class="buttons"><button class="btn primary" data-action="ok">В отряд!</button></div>`,
      onEscape: () => this.closeModal(m),
    });
    m.actions.ok = () => this.closeModal(m);
  },

  showStory(dist, then) {
    const i = DISTRICTS.indexOf(dist);
    const m = this.modal({
      cls: 'story',
      html: `
        <canvas class="story-art" data-story="${dist.id}"></canvas>
        <div class="story-text">
          <div class="ribbon">Район ${i + 1} из ${DISTRICTS.length}</div>
          <h2 style="color:${dist.accent}">${esc(dist.name)}</h2>
          <p>${esc(dist.story)}</p>
          <div class="buttons"><button class="btn primary" data-action="go">Вперёд</button></div>
        </div>`,
    });
    m.actions.go = () => { this.closeModal(m); then(); };
  },
};
