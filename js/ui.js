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
      daily: { day: '', streak: 0, loginClaimed: false, tasks: [], bonusClaimed: false, challengeDone: false, challengeLevel: 3, challengeMods: [] },
      chests: { freeAt: 0, starOpened: 0 },
      dayShift: 0,
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

const AD_COINS_COOLDOWN = 5 * 60 * 1000;

const TABS = [
  { id: 'battle',  icon: '⚔' },
  { id: 'map',     icon: '⌂' },
  { id: 'arsenal', icon: '⌖' },
  { id: 'heroes',  icon: '☺' },
  { id: 'quests',  icon: '✓' },
];


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
    I18N.setLang(I18N.detect(Progress.data.settings.lang));
    Sfx.setEnabled(Progress.data.settings.sound);
    Daily.check();
    setInterval(() => this.tick(), 1000);
    Game.aimMode = Progress.data.settings.aim;
    Game.seenEnemies = new Set(Progress.data.seenEnemies);

    Game.hooks.victory = r => this.onVictory(r);
    Game.hooks.defeat = r => this.onDefeat(r);
    Game.hooks.pause = () => this.showPause();
    Game.hooks.rerollAd = () => Platform.showRewarded(t('ad.perks')).then(ok => {
      if (ok) Game.rerollPerks();
    });
    Game.hooks.tutorialDone = () => this.onTutorialDone();
    Game.hooks.tutorialSkip = () => this.confirm(t('tut.skipTitle'), t('tut.skipText'), () => {
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
          <div class="logo" data-i18n-html="logo"></div>
          <div class="wallet">
            <div class="chip coins" data-i18n-title="chip.coins"><b>●</b><span data-bind="coins"></span></div>
            <div class="chip gold" data-i18n-title="chip.gold"><b>◆</b><span data-bind="gold"></span></div>
            <div class="chip stars" data-i18n-title="chip.stars"><b>★</b><span data-bind="stars"></span></div>
            ${Game.debug ? '<button class="btn small debug" data-action="shift-day" data-i18n="debug.shiftDay"></button>' : ''}
            <button class="icon-btn" data-action="sound" data-i18n-title="btn.sound"><span data-bind="sound"></span></button>
            <button class="icon-btn" data-action="settings" data-i18n-title="btn.settings">⚙</button>
          </div>
        </header>
        <main class="content" id="tab-content"></main>
        <nav class="tabbar">
          ${TABS.map(tab => `<button class="tab" data-tab="${tab.id}"><i>${tab.icon}</i><span data-i18n="tab.${tab.id}"></span></button>`).join('')}
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
    Platform.banner(true);
    this.render();
    Progress.save();
    if (!Progress.data.tutorialOffered) this.showTutorialOffer();
    else if (Daily.loginAvailable()) this.showLogin();
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
        <h2>${t('tut.offerTitle')}</h2>
        <p>${t('tut.offerText')}</p>
        <p class="hint">${t('tut.offerReward', ECONOMY.tutorialReward)}</p>
        <div class="buttons">
          <button class="btn" data-action="skip">${t('tut.skip')}</button>
          <button class="btn primary" data-action="learn">${t('tut.learn')}</button>
        </div>`,
    });
    const mark = () => { Progress.data.tutorialOffered = true; Progress.save(); };
    m.actions.skip = () => {
      mark();
      this.closeModal(m);
      if (Daily.loginAvailable()) this.showLogin();
    };
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
        <h2>${t('tut.doneTitle')}</h2>
        <p>${t('tut.doneText')}</p>
        ${first ? `<div class="rewards"><span class="coins">● +${r.coins}</span><span class="gold">◆ +${r.gold}</span></div>` : `<p class="hint">${t('tut.doneAlready')}</p>`}
        <div class="buttons"><button class="btn primary" data-action="ok">${t('tut.doneGo')}</button></div>`,
    });
    m.actions.ok = () => this.showMenu('battle');
  },

  hideMenu() {
    this.menu.classList.add('hidden');
    Platform.banner(false);
    document.getElementById('toast').classList.add('hidden');
  },

  // Static shell texts (tabs, titles) follow the current language.
  translateShell() {
    this.root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    this.root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    this.root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  },

  render() {
    const d = Progress.data;
    this.translateShell();
    this.bind('coins', d.coins);
    this.bind('gold', d.gold);
    this.bind('stars', `${Progress.totalStars}/300`);
    this.bind('sound', d.settings.sound ? '♪' : '✕');
    this.menu.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this.tab));
    const fn = { battle: 'renderBattle', map: 'renderMap', arsenal: 'renderArsenal', heroes: 'renderHeroes', quests: 'renderQuests' }[this.tab];
    this.content.className = 'content tab-' + this.tab;
    this[fn]();
    this.updateDots();
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
          <div class="hero-name">${esc(L(h.name))} <small>${t('lvl.short', { n: d.heroes[d.hero] })}</small></div>
          <div class="hero-skill">${esc(L(h.skill.name))}</div>
        </div>
        <div class="battle-main card glow">
          <div class="district" style="--acc:${dist.accent}">${esc(L(dist.name))}</div>
          <div class="level-title">${t('level', { n: level })}</div>
          ${boss ? `<div class="boss-badge">${t('battle.boss', { name: esc(L(BOSSES[boss].name)) })}</div>` : `<div class="sub">${t('battle.districtStars', { have: Progress.districtStars(dist), total: (dist.levels[1] - dist.levels[0] + 1) * 3 })}</div>`}
          <button class="btn primary huge" data-action="play" data-level="${level}">${t('battle.play')}</button>
          <div class="loadout">
            <button class="mini" data-tab="arsenal"><canvas class="weapon-icon" data-weapon="${w.id}"></canvas><span>${esc(L(w.name))} <small>${t('lvl.short', { n: Progress.weaponLevel(w.id) })}</small></span></button>
          </div>
        </div>
        <div class="battle-side card">
          <div class="side-title">${t('battle.ahead')}</div>
          ${nextWeapon ? `<div class="teaser"><canvas class="weapon-icon" data-weapon="${nextWeapon.id}"></canvas><div><b>${esc(L(nextWeapon.name))}</b><small>${t('battle.unlocksAt', { n: nextWeapon.unlock })}</small></div></div>` : ''}
          ${nextBoss ? `<div class="teaser boss"><i>☠</i><div><b>${esc(L(nextBoss.name))}</b><small>${t('level', { n: nextBoss.level })}</small></div></div>` : ''}
          ${this.adCoinsTeaser()}
          <button class="teaser" data-tab="quests"><i>✓</i><div><b>${t('battle.dailyTasks')}</b><small>${d.daily.tasks.filter(x => x.claimed).length}/3 · ${t(Daily.rewardsWaiting() ? 'battle.rewardsWaiting' : 'battle.challengeWaits')}</small></div></button>
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
            <b>${esc(L(dist.name))}</b>
            <small>${t('map.levels', { a, b, have: Progress.districtStars(dist), total: (b - a + 1) * 3 })}</small>
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
          <div class="item-head"><b>${esc(L(w.name))}</b><small>${t('wtype.' + w.type)}</small></div>
          <canvas class="weapon-art" data-weapon="${w.id}"></canvas>
          ${open ? `
            <div class="item-level">${t('arsenal.level', { n: lvl, max: ECONOMY.weaponMaxLevel })}</div>
            ${bar(t('arsenal.damage'), dps / maxDmg)}
            ${bar(t('arsenal.rate'), w.rate / 20)}
            ${bar(t('arsenal.range'), w.range / 560)}
            <div class="item-desc">${esc(L(w.desc))}</div>
            <div class="item-actions">
              ${eq ? `<span class="tag">${t('arsenal.inHands')}</span>` : `<button class="btn" data-action="equip" data-id="${w.id}">${t('arsenal.equip')}</button>`}
              ${max ? `<span class="tag">${t('max')}</span>` : `<button class="btn primary ${d.coins < cost ? 'disabled' : ''}" data-action="upgrade-weapon" data-id="${w.id}">▲ ● ${cost}</button>`}
            </div>` : `
            <div class="item-desc">${esc(L(w.desc))}</div>
            <div class="lock-note">${t('arsenal.unlocksAt', { n: w.unlock })}</div>`}
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
          <div class="item-head"><b>${esc(L(h.name))}</b><small>${esc(L(h.role))}</small></div>
          <canvas class="portrait" data-hero="${id}"></canvas>
          <div class="skill-box"><b>${Render.skillIcon[h.skill.id]} ${esc(L(h.skill.name))}</b><small>${esc(L(h.skill.desc))}</small></div>
          <div class="hero-stats"><span>♥ ${hp}</span><span>➤ ${h.speed}</span><span>⟳ ${t('heroes.cdSec', { n: h.skill.cd })}</span>${power ? `<span>+${power}%</span>` : ''}</div>
          <div class="item-actions">
            ${owned ? `
              ${sel ? `<span class="tag">${t('heroes.selected')}</span>` : `<button class="btn" data-action="select-hero" data-id="${id}">${t('heroes.select')}</button>`}
              ${max ? `<span class="tag">${t('max')}</span>` : `<button class="btn primary ${d.coins < cost ? 'disabled' : ''}" data-action="upgrade-hero" data-id="${id}">▲ ● ${cost}</button>`}
              <small class="lvl">${t('lvl.short', { n: lvl })}</small>` : `
              <button class="btn gold ${d.gold < h.gold ? 'disabled' : ''}" data-action="buy-hero" data-id="${id}">${t('heroes.unlock', { n: h.gold })}</button>`}
          </div>
        </div>`;
    }).join('');
    this.content.innerHTML = `<div class="hscroll">${cards}</div>`;
    this.paintCanvases();
  },

  renderQuests() {
    const d = Progress.data;
    const dd = d.daily;
    const rewardText = r => [r.coins ? `● ${r.coins}` : '', r.gold ? `◆ ${r.gold}` : ''].filter(Boolean).join(' ');

    // Daily tasks
    const tasks = dd.tasks.map((task, i) => {
      const def = Daily.taskDef(task);
      const done = task.progress >= task.goal;
      return `
        <div class="dtask ${task.claimed ? 'claimed' : done ? 'ready' : ''}">
          <div class="dt-text"><b>${esc(L(def.text, { n: task.goal }))}</b>
            <div class="bar"><i style="width:${Math.round(task.progress / task.goal * 100)}%"></i></div>
          </div>
          ${task.claimed ? '<span class="tag">✓</span>' : done
            ? `<button class="btn primary small" data-action="claim-task" data-id="${i}">${rewardText(def.reward)}</button>`
            : `<small class="dt-num">${task.progress}/${task.goal}<br>${rewardText(def.reward)}</small>`}
        </div>`;
    }).join('');
    const bonusReady = Daily.bonusReady();
    const bonus = `
      <div class="dtask bonus ${dd.bonusClaimed ? 'claimed' : bonusReady ? 'ready' : ''}">
        <div class="dt-text"><b>${t('daily.allThree')}</b><small>${dd.tasks.filter(x => x.claimed).length}/3</small></div>
        ${dd.bonusClaimed ? '<span class="tag">✓</span>' : `<button class="btn ${bonusReady ? 'primary' : 'disabled'} small" data-action="claim-bonus">${rewardText(DAILY_BONUS)}</button>`}
      </div>`;

    // Challenge of the day
    const mods = Daily.challengeMods().map(m => `<div class="mod" style="--acc:${m.color}"><b>${esc(L(m.name))}</b><small>${esc(L(m.desc))}</small></div>`).join('');

    // Chests
    const freeLeft = Daily.freeChestLeft();
    const starReady = Daily.starChestsReady();
    const starProg = Daily.starChestProgress();

    // Permanent quests
    const sorted = QUESTS.slice().sort((a, b) => {
      const sa = d.claimed.includes(a.id) ? 2 : Progress.stat(a.stat) >= a.goal ? 0 : 1;
      const sb = d.claimed.includes(b.id) ? 2 : Progress.stat(b.stat) >= b.goal ? 0 : 1;
      return sa - sb;
    });
    const quests = sorted.map(q => {
      const v = Math.min(q.goal, Progress.stat(q.stat));
      const done = v >= q.goal;
      const claimed = d.claimed.includes(q.id);
      return `
        <div class="dtask ${claimed ? 'claimed' : done ? 'ready' : ''}">
          <div class="dt-text"><b>${esc(L(q.text))}</b>
            <div class="bar"><i style="width:${Math.round(v / q.goal * 100)}%"></i></div>
          </div>
          ${claimed ? '<span class="tag">✓</span>' : done
            ? `<button class="btn primary small" data-action="claim" data-id="${q.id}">${rewardText(q.reward)}</button>`
            : `<small class="dt-num">${v}/${q.goal}<br>${rewardText(q.reward)}</small>`}
        </div>`;
    }).join('');

    this.content.innerHTML = `
      <div class="hscroll daily">
        <div class="card dcard">
          <div class="dhead"><b>${t('daily.tasks')}</b><small>${t('daily.newIn', { time: `<span data-bind="day-left">${formatTime(Daily.msToNextDay())}</span>` })}</small></div>
          <div class="dlist">${tasks}${bonus}</div>
        </div>
        <div class="card dcard challenge">
          <div class="dhead"><b>${t('daily.challenge')}</b><small>${t('level', { n: dd.challengeLevel })}</small></div>
          <div class="mods">${mods}</div>
          <div class="ch-reward">${t('daily.reward')} <b>${rewardText(CHALLENGE_REWARD)}</b></div>
          ${dd.challengeDone
            ? `<div class="tag big">${t('daily.challengeDone')}</div>`
            : `<button class="btn primary" data-action="challenge">${t('daily.challengeStart')}</button>`}
        </div>
        <div class="card dcard chests">
          <div class="dhead"><b>${t('daily.chests')}</b></div>
          <div class="chest-row ${freeLeft <= 0 ? 'ready' : ''}">
            <div class="chest-ico free"><i></i></div>
            <div class="chest-info"><b>${t('daily.freeChest')}</b><small>${freeLeft <= 0 ? t('ready') : t('in', { time: `<span data-bind="chest-left">${formatTime(freeLeft)}</span>` })}</small></div>
            ${freeLeft <= 0
              ? `<button class="btn primary small" data-action="free-chest">${t('open')}</button>`
              : `<button class="btn ad small" data-action="free-chest-ad">${t('daily.chestNow')}</button>`}
          </div>
          <div class="chest-row ${starReady > 0 ? 'ready' : ''}">
            <div class="chest-ico star"><i></i></div>
            <div class="chest-info"><b>${t('daily.starChest')} ${starReady > 1 ? `×${starReady}` : ''}</b>
              <div class="bar"><i style="width:${starReady > 0 ? 100 : Math.round(starProg / STAR_CHEST_EVERY * 100)}%"></i></div>
              <small>${starReady > 0 ? t('ready') : `★ ${starProg}/${STAR_CHEST_EVERY}`}</small></div>
            <button class="btn ${starReady > 0 ? 'primary' : 'disabled'} small" data-action="star-chest">${t('open')}</button>
          </div>
          <small class="note">${t('daily.chestNote', { stars: STAR_CHEST_EVERY, hours: FREE_CHEST_HOURS })}</small>
        </div>
        <div class="card dcard achievements">
          <div class="dhead"><b>${t('daily.achievements')}</b></div>
          <div class="dlist vscroll">${quests}</div>
        </div>
      </div>`;
  },

  adCoinsAmount() {
    return Math.round((60 + Progress.data.unlocked * 6) / 10) * 10;
  },

  adCoinsTeaser() {
    const left = (Progress.data.adCoinsAt || 0) - Date.now();
    return left > 0
      ? `<div class="teaser"><i>●</i><div><b>${t('battle.adCoins')}</b><small>${t('in', { time: `<span data-bind="adcoins-left">${formatTime(left)}</span>` })}</small></div></div>`
      : `<button class="teaser ad" data-action="ad-coins"><i>▶</i><div><b>● +${this.adCoinsAmount()}</b><small>${t('battle.adCoinsSub')}</small></div></button>`;
  },

  // ---------- Daily windows ----------

  showLogin() {
    const dd = Progress.data.daily;
    const cards = DAILY_LOGIN.map((r, i) => {
      const day = i + 1;
      const state = day < dd.streak ? 'past' : day === dd.streak ? 'today' : 'future';
      const what = r.chest
        ? `<div class="lg-ico chest-ico free"><i></i></div><small>${t('login.chest')}</small>`
        : `<div class="lg-ico">${r.gold ? '◆' : '●'}</div><small>${[r.coins ? `● ${r.coins}` : '', r.gold ? `◆ ${r.gold}` : ''].filter(Boolean).join(' ')}</small>`;
      return `<div class="lg-day ${state} ${r.gold ? 'gold' : ''}"><b>${t('login.day', { n: day })}</b>${what}${state === 'past' ? '<em>✓</em>' : ''}</div>`;
    }).join('');
    const m = this.modal({
      cls: 'login',
      html: `
        <h2>${t('login.title')}</h2>
        <p class="sub">${dd.streak > 1 ? t('login.streak', { n: dd.streak }) : t('login.first')} ${t('login.reset')}</p>
        <div class="lg-row">${cards}</div>
        <div class="buttons">
          <button class="btn ad big" data-action="take2">${t('login.double')}</button>
          <button class="btn primary big" data-action="take">${t('take')}</button>
        </div>`,
    });
    const take = double => {
      const got = Daily.claimLogin();
      if (got && double) {
        Daily.give(got);
        Progress.save();
      }
      this.closeModal(m);
      this.render();
      const shown = got && double ? { coins: (got.coins || 0) * 2, gold: (got.gold || 0) * 2 } : got;
      if (got && (DAILY_LOGIN[dd.streak - 1].chest || double)) this.showChest(t(double ? 'chest.dailyDouble' : 'chest.daily'), shown);
      else this.menuHints();
    };
    m.actions.take = () => take(false);
    m.actions.take2 = () => Platform.showRewarded(t('ad.dailyDouble')).then(ok => take(ok));
  },

  showChest(title, loot) {
    const m = this.modal({
      cls: 'chest-open',
      html: `
        <h2>${esc(title)}</h2>
        <div class="chest-big"><div class="lid"></div><div class="box"></div><div class="burst"></div></div>
        <div class="loot">
          ${loot.coins ? `<span class="coins">● +${loot.coins}</span>` : ''}
          ${loot.gold ? `<span class="gold">◆ +${loot.gold}</span>` : ''}
        </div>
        <div class="buttons"><button class="btn primary" data-action="ok">${t('take')}</button></div>`,
      onEscape: () => close(),
    });
    const close = () => { this.closeModal(m); this.render(); };
    m.actions.ok = close;
  },

  playChallenge() {
    this.closeAllModals();
    this.hideMenu();
    Game.loadout = Progress.loadout();
    Game.aimMode = Progress.data.settings.aim;
    Game.start(Progress.data.daily.challengeLevel, { config: Daily.challengeConfig() });
  },

  // Every second while the menu is open: timers, day change, red dots.
  tick() {
    if (!Progress.data) return;
    const newDay = Daily.check();
    if (this.menu.classList.contains('hidden')) return;
    if (newDay) {
      this.render();
      if (Progress.data.tutorialOffered && !this.modals.length && Daily.loginAvailable()) this.showLogin();
      return;
    }
    this.bind('day-left', formatTime(Daily.msToNextDay()));
    const adLeft = (Progress.data.adCoinsAt || 0) - Date.now();
    if (adLeft > 0) this.bind('adcoins-left', formatTime(adLeft));
    else if (this.lastAdLeft > 0 && this.tab === 'battle') this.render();
    this.lastAdLeft = adLeft;
    const left = Daily.freeChestLeft();
    if (left > 0) this.bind('chest-left', formatTime(left));
    const dot = Daily.rewardsWaiting();
    if (dot !== this.lastDot || (left <= 0 && this.lastLeft > 0)) this.render();
    this.lastLeft = left;
  },

  updateDots() {
    const dot = Daily.rewardsWaiting();
    this.lastDot = dot;
    this.menu.querySelectorAll('.tab').forEach(b => {
      const show = b.dataset.tab === 'quests' && dot;
      let el = b.querySelector('.dot');
      if (show && !el) { el = document.createElement('span'); el.className = 'dot'; b.appendChild(el); }
      if (!show && el) el.remove();
    });
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
    if (e.target.closest('button')) sfx('click');
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
        Sfx.setEnabled(d.settings.sound);
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
      case 'claim-task':
        if (Daily.claimTask(Number(id))) this.render();
        break;
      case 'claim-bonus':
        if (Daily.claimBonus()) this.render();
        break;
      case 'challenge':
        this.playChallenge();
        break;
      case 'free-chest': {
        const loot = Daily.openFreeChest();
        if (loot) this.showChest(t('chest.free'), loot);
        break;
      }
      case 'free-chest-ad':
        Platform.showRewarded(t('ad.chest')).then(ok => {
          if (!ok) return;
          d.chests.freeAt = 0;
          const loot = Daily.openFreeChest();
          if (loot) this.showChest(t('chest.free'), loot);
        });
        break;
      case 'ad-coins':
        if (Date.now() < (d.adCoinsAt || 0)) break;
        Platform.showRewarded(t('ad.coins')).then(ok => {
          if (!ok) return;
          const amount = this.adCoinsAmount();
          d.coins += amount;
          d.adCoinsAt = Date.now() + AD_COINS_COOLDOWN;
          Progress.save();
          this.showChest(t('chest.adCoins'), { coins: amount });
        });
        break;
      case 'star-chest': {
        const loot = Daily.openStarChest();
        if (loot) this.showChest(t('chest.star'), loot);
        break;
      }
      case 'shift-day':
        // Debug: move the clock one day forward to test the daily rollover.
        d.dayShift = (d.dayShift || 0) + 1;
        Progress.save();
        this.closeAllModals();
        Daily.check();
        this.render();
        if (Daily.loginAvailable()) this.showLogin();
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
    document.getElementById('toast').classList.add('hidden');
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
        <span>${t('settings.aim')}</span>
        <div class="segmented">
          <button class="${a === 'auto' ? 'on' : ''}" data-action="aim-auto">${t('settings.aimAuto')}</button>
          <button class="${a === 'manual' ? 'on' : ''}" data-action="aim-manual">${t('settings.aimManual')}</button>
        </div>
      </div>
      <p class="hint">${t(a === 'auto' ? 'settings.aimAutoHint' : ('ontouchstart' in window ? 'settings.aimTouchHint' : 'settings.aimMouseHint'))}</p>`;
  },

  setLang(lang, rerender) {
    Progress.data.settings.lang = lang;
    Progress.save();
    I18N.setLang(lang);
    rerender();
    this.render();
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
      'toggle-sound': () => { Progress.data.settings.sound = !Progress.data.settings.sound; Sfx.setEnabled(Progress.data.settings.sound); Progress.save(); re(); this.render(); },
      'lang-ru': () => this.setLang('ru', re),
      'lang-en': () => this.setLang('en', re),
      'reset': () => this.confirm(t('settings.resetTitle'), t('settings.resetText'), () => {
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
      <h2>${t('settings.title')}</h2>
      ${this.aimSwitch()}
      <div class="setting">
        <span>${t('settings.sound')}</span>
        <div class="segmented">
          <button class="${s.sound ? 'on' : ''}" data-action="toggle-sound">${t(s.sound ? 'settings.on' : 'settings.off')}</button>
        </div>
      </div>
      <div class="setting">
        <span>${t('settings.lang')}</span>
        <div class="segmented">
          <button class="${I18N.lang === 'ru' ? 'on' : ''}" data-action="lang-ru">Русский</button>
          <button class="${I18N.lang === 'en' ? 'on' : ''}" data-action="lang-en">English</button>
        </div>
      </div>
      <div class="buttons">
        <button class="btn" data-action="tutorial">${t('settings.tutorial')}</button>
        <button class="btn danger" data-action="reset">${t('settings.reset')}</button>
        <button class="btn primary" data-action="close">${t('done')}</button>
      </div>`;
  },

  confirm(title, text, yes, no) {
    const cancel = () => { this.closeModal(m); if (no) no(); };
    const m = this.modal({
      cls: 'confirm',
      html: `<h2>${esc(title)}</h2><p>${esc(text)}</p>
        <div class="buttons"><button class="btn" data-action="no">${t('cancel')}</button><button class="btn danger" data-action="yes">${t('yes')}</button></div>`,
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
      retry: () => (Game.tutorial ? this.startTutorial() : Game.config.challenge ? this.playChallenge() : this.startLevel(Game.level)),
      menu: () => this.showMenu(),
      'aim-auto': () => this.setAim('auto', re),
      'aim-manual': () => this.setAim('manual', re),
    });
  },

  pauseHtml() {
    const dist = Game.district;
    const where = Game.tutorial
      ? t('pause.tutorial', { n: Game.tutorial.step + 1, total: TUTORIAL_STEPS })
      : t('pause.level', { n: Game.level, district: esc(L(dist.name)), w: Game.waveIndex + 1, waves: Game.config.waves.length });
    return `
      <h2>${t('pause.title')}</h2>
      <p class="sub">${where}</p>
      ${this.aimSwitch()}
      <div class="buttons col">
        <button class="btn primary big" data-action="resume">${t('resume')}</button>
        <div class="row">
          <button class="btn" data-action="retry">${t('retry')}</button>
          <button class="btn" data-action="menu">${t('menu')}</button>
        </div>
      </div>`;
  },

  onVictory(r) {
    let rew;
    if (r.challenge) {
      // The challenge doesn't touch the map: coins + the daily reward.
      const d = Progress.data;
      d.coins += r.coins + r.bonus;
      d.stats.kills += r.kills;
      d.stats.bestStreak = Math.max(d.stats.bestStreak, r.best || 0);
      const ch = Daily.completeChallenge();
      rew = { coins: r.coins + r.bonus + (ch ? ch.coins : 0), gold: ch ? ch.gold : 0, newWeapon: null };
    } else {
      rew = Progress.recordWin(r);
    }
    Daily.track('wins', 1);
    Daily.track('stars', r.stars);
    Progress.save();
    const goals = r.goals.map(g => `
      <li class="${g.state === 'ok' ? 'ok' : 'fail'}"><i>${g.state === 'ok' ? '✔' : '✘'}</i><span>${esc(g.text)}</span><small>${esc(g.progress || '')}</small></li>`).join('');
    const mm = Math.floor(r.time / 60), ss = String(Math.floor(r.time % 60)).padStart(2, '0');
    const last = r.level >= 100;
    const m = this.modal({
      cls: 'result victory',
      html: `
        <h2>${t(r.challenge ? 'win.challenge' : 'win.title')}</h2>
        <p class="sub">${r.challenge ? t('win.challengeSub') : t('level', { n: r.level })} · ${esc(L(districtOf(r.level).name))}</p>
        <div class="big-stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.45}s">★</span>`).join('')}</div>
        <ul class="goals">${goals}</ul>
        <div class="result-stats">${t('win.stats', { kills: r.kills, time: `${mm}:${ss}`, best: r.best })}</div>
        <div class="rewards"><span class="coins" data-ref="coins">● +${rew.coins}</span>${rew.gold ? `<span class="gold">◆ +${rew.gold}</span>` : ''}</div>
        ${rew.coins > 0 ? `<div class="buttons ad-row"><button class="btn ad" data-action="double">${t('win.double')}</button></div>` : ''}
        <div class="buttons">
          <button class="btn" data-action="menu">${t('menu')}</button>
          <button class="btn" data-action="retry">${t('retry')}</button>
          ${last || r.challenge ? '' : `<button class="btn primary" data-action="next">${t('next')}</button>`}
        </div>`,
    });
    const after = then => () => {
      this.closeModal(m);
      if (rew.newWeapon) this.showNewWeapon(rew.newWeapon, then);
      else then();
    };
    Object.assign(m.actions, {
      double: () => Platform.showRewarded(t('ad.double')).then(ok => {
        if (!ok) return;
        Progress.data.coins += rew.coins;
        Progress.save();
        m.el.querySelector('[data-ref="coins"]').textContent = `● +${rew.coins * 2}`;
        const btn = m.el.querySelector('[data-action="double"]');
        if (btn) btn.remove();
      }),
      menu: after(() => this.showMenu()),
      retry: after(() => this.betweenLevels(r.level, () => (r.challenge ? this.playChallenge() : this.startLevel(r.level)))),
      next: after(() => this.betweenLevels(r.level, () => this.play(r.level + 1))),
    });
  },

  onDefeat(r) {
    // The result is recorded only when the player leaves this window:
    // a second chance or "keep all coins" can still change it.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      Progress.recordDefeat(r);
    };
    const m = this.modal({
      cls: 'result defeat',
      html: `
        <h2>${t('lose.title')}</h2>
        <p class="sub">${r.challenge ? t('win.challengeSub') : t('level', { n: r.level })} · ${t('lose.wave', { w: r.wave, waves: r.waves })}</p>
        <div class="result-stats">☠ ${r.kills}</div>
        <div class="rewards"><span class="coins" data-ref="coins">● +${r.coins}</span><small data-ref="coins-note">${t('lose.half')}</small></div>
        <div class="buttons ad-row">
          ${r.canRevive ? `<button class="btn ad" data-action="revive">${t('lose.revive')}</button>` : ''}
          ${r.allCoins > r.coins ? `<button class="btn ad" data-action="keep">${t('lose.keep', { n: r.allCoins })}</button>` : ''}
        </div>
        <div class="buttons">
          <button class="btn" data-action="menu">${t('menu')}</button>
          <button class="btn" data-action="arsenal">${t('lose.arsenal')}</button>
          <button class="btn primary" data-action="retry">${t('retry')}</button>
        </div>`,
    });
    const q = sel => m.el.querySelector(sel);
    Object.assign(m.actions, {
      revive: () => Platform.showRewarded(t('ad.revive')).then(ok => {
        if (!ok || Game.state !== 'defeat') return;
        this.closeModal(m);
        Game.revive();
      }),
      keep: () => Platform.showRewarded(t('ad.keep')).then(ok => {
        if (!ok) return;
        r.coins = r.allCoins;
        q('[data-ref="coins"]').textContent = `● +${r.coins}`;
        q('[data-ref="coins-note"]').textContent = t('lose.kept');
        const btn = q('[data-action="keep"]');
        if (btn) btn.remove();
      }),
      menu: () => { settle(); this.showMenu(); },
      arsenal: () => { settle(); this.showMenu('arsenal'); },
      retry: () => {
        settle();
        this.betweenLevels(r.level, () => (r.challenge ? this.playChallenge() : this.startLevel(r.level)));
      },
    });
  },

  // Full-screen ad between levels (not in the first levels, rate-limited).
  betweenLevels(level, then) {
    if (level < 3) return then();
    Platform.showInterstitial().then(() => then());
  },

  showNewWeapon(w, then) {
    const m = this.modal({
      cls: 'reveal',
      html: `
        <div class="ribbon">${t('reveal.weapon')}</div>
        <canvas class="weapon-art big" data-weapon="${w.id}"></canvas>
        <h2 style="color:${w.color}">${esc(L(w.name))}</h2>
        <p>${esc(L(w.desc))}</p>
        <div class="buttons">
          <button class="btn" data-action="later">${t('later')}</button>
          <button class="btn primary" data-action="take">${t('reveal.takeWeapon')}</button>
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
        <div class="ribbon">${t('reveal.hero')}</div>
        <canvas class="portrait big" data-hero="${id}"></canvas>
        <h2>${esc(L(h.name))} <small>${esc(L(h.role))}</small></h2>
        <p><b>${Render.skillIcon[h.skill.id]} ${esc(L(h.skill.name))}</b> — ${esc(L(h.skill.desc))}</p>
        <div class="buttons"><button class="btn primary" data-action="ok">${t('reveal.joinSquad')}</button></div>`,
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
          <div class="ribbon">${t('story.district', { n: i + 1, total: DISTRICTS.length })}</div>
          <h2 style="color:${dist.accent}">${esc(L(dist.name))}</h2>
          <p>${esc(L(dist.story))}</p>
          <div class="buttons"><button class="btn primary" data-action="go">${t('story.go')}</button></div>
        </div>`,
    });
    m.actions.go = () => { this.closeModal(m); then(); };
  },
};
