// Daily systems: 7-day login, 3 daily tasks, challenge of the day, chests.
// Days follow the player's local time; ?debug can shift the day.

const DAY_MS = 24 * 60 * 60 * 1000;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const Daily = {
  get d() {
    return Progress.data;
  },

  now() {
    return Date.now() + (this.d.dayShift || 0) * DAY_MS;
  },

  key(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  },

  today() {
    return this.key(new Date(this.now()));
  },

  yesterday() {
    const t = new Date(this.now());
    return this.key(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1));
  },

  // Milliseconds until local midnight.
  msToNextDay() {
    const t = new Date(this.now());
    return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).getTime() - t.getTime();
  },

  // Rolls the daily state over when the local date changed. Returns true on a new day.
  check() {
    const dd = this.d.daily;
    const today = this.today();
    if (dd.day === today) return false;
    dd.streak = dd.day === this.yesterday() ? (dd.streak % DAILY_LOGIN.length) + 1 : 1;
    dd.day = today;
    dd.loginClaimed = false;
    dd.bonusClaimed = false;
    dd.challengeDone = false;
    dd.tasks = this.makeTasks(today);
    const ch = this.makeChallenge(today);
    dd.challengeLevel = ch.level;
    dd.challengeMods = ch.mods;
    Progress.save();
    return true;
  },

  makeTasks(day) {
    const rng = makeRng(hashStr('tasks' + day));
    const pool = DAILY_TASKS.slice();
    const out = [];
    while (out.length < 3) {
      const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const goal = t.goals[Math.floor(rng() * t.goals.length)];
      out.push({ id: t.id, goal, progress: 0, claimed: false });
    }
    return out;
  },

  makeChallenge(day) {
    const rng = makeRng(hashStr('challenge' + day));
    const pool = CHALLENGE_MODS.map(m => m.id);
    const mods = [];
    while (mods.length < 2) mods.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    let level = Math.max(3, Math.min(99, this.d.unlocked - 1));
    if (level % 10 === 0) level--;
    return { level, mods };
  },

  // ---------- Login ----------

  loginAvailable() {
    return !this.d.daily.loginClaimed;
  },

  claimLogin() {
    const dd = this.d.daily;
    if (dd.loginClaimed) return null;
    const r = DAILY_LOGIN[dd.streak - 1];
    dd.loginClaimed = true;
    let loot = null;
    if (r.chest) loot = this.giveLoot(this.rollLoot('small'));
    else this.give(r);
    Progress.save();
    return loot || r;
  },

  give(r) {
    this.d.coins += r.coins || 0;
    this.d.gold += r.gold || 0;
  },

  // ---------- Tasks ----------

  taskDef(t) {
    return DAILY_TASKS.find(x => x.id === t.id);
  },

  // Game events feed task progress. Saved together with the level result.
  track(stat, n = 1) {
    const dd = this.d && this.d.daily;
    if (!dd || !dd.tasks || Game.tutorial) return;
    for (const t of dd.tasks) {
      const def = this.taskDef(t);
      if (def.stat !== stat || t.claimed) continue;
      t.progress = def.max ? Math.max(t.progress, n) : Math.min(t.goal, t.progress + n);
      t.progress = Math.min(t.goal, t.progress);
    }
  },

  claimTask(i) {
    const t = this.d.daily.tasks[i];
    if (!t || t.claimed || t.progress < t.goal) return false;
    t.claimed = true;
    this.give(this.taskDef(t).reward);
    Progress.save();
    return true;
  },

  bonusReady() {
    const dd = this.d.daily;
    return !dd.bonusClaimed && dd.tasks.every(t => t.claimed);
  },

  claimBonus() {
    if (!this.bonusReady()) return false;
    this.d.daily.bonusClaimed = true;
    this.give(DAILY_BONUS);
    Progress.save();
    return true;
  },

  // ---------- Challenge ----------

  challengeMods() {
    return this.d.daily.challengeMods.map(id => CHALLENGE_MODS.find(m => m.id === id));
  },

  // Level config with the day's modifiers applied.
  challengeConfig() {
    const level = this.d.daily.challengeLevel;
    const cfg = levelConfig(level);
    cfg.flags = {};
    cfg.challenge = true;
    for (const id of this.d.daily.challengeMods) {
      switch (id) {
        case 'fast': cfg.mods.speed *= 1.35; break;
        case 'tough': cfg.mods.hp *= 1.6; break;
        case 'horde':
          for (const w of cfg.waves) {
            for (const k of Object.keys(w.zombies)) w.zombies[k] = Math.ceil(w.zombies[k] * 1.5);
            w.maxAlive += 6;
          }
          break;
        case 'glass': cfg.flags.heroHp = 0.5; cfg.flags.heroDmg = 1.5; break;
        case 'night': cfg.flags.darkness = 0.55; break;
        case 'fog': cfg.flags.fog = true; break;
        case 'nomed': cfg.flags.noMedkit = true; break;
        case 'explosive': cfg.flags.boom = 0.25; cfg.barrels += 6; break;
        case 'runners':
          for (const w of cfg.waves) {
            if (w.zombies.walker) {
              w.zombies.runner = (w.zombies.runner || 0) + w.zombies.walker;
              delete w.zombies.walker;
            }
          }
          break;
        case 'noperks': cfg.flags.noPerks = true; break;
        case 'goldrush': cfg.flags.coinMul = 2; break;
      }
    }
    cfg.total = cfg.waves.reduce((s, w) => s + Object.values(w.zombies).reduce((a, b) => a + b, 0), 0);
    return cfg;
  },

  completeChallenge() {
    const dd = this.d.daily;
    if (dd.challengeDone) return null;
    dd.challengeDone = true;
    this.give(CHALLENGE_REWARD);
    this.track('challenge', 1);
    Progress.save();
    return CHALLENGE_REWARD;
  },

  // ---------- Chests ----------

  freeChestLeft() {
    return Math.max(0, (this.d.chests.freeAt || 0) - this.now());
  },

  starChestsReady() {
    return Math.floor(Progress.totalStars / STAR_CHEST_EVERY) - this.d.chests.starOpened;
  },

  starChestProgress() {
    return Progress.totalStars % STAR_CHEST_EVERY;
  },

  rollLoot(kind) {
    const u = this.d.unlocked;
    const big = kind === 'star';
    const coins = Math.round((big ? 250 : 80) + Math.random() * (big ? 250 : 120) + u * (big ? 8 : 4));
    const gold = Math.random() < (big ? 0.8 : 0.35) ? (big ? 4 : 1) + Math.floor(Math.random() * (big ? 6 : 4)) : 0;
    return { coins: Math.round(coins / 10) * 10, gold };
  },

  giveLoot(loot) {
    this.give(loot);
    return loot;
  },

  openFreeChest() {
    if (this.freeChestLeft() > 0) return null;
    this.d.chests.freeAt = this.now() + FREE_CHEST_HOURS * 60 * 60 * 1000;
    const loot = this.giveLoot(this.rollLoot('free'));
    Progress.save();
    return loot;
  },

  openStarChest() {
    if (this.starChestsReady() <= 0) return null;
    this.d.chests.starOpened++;
    const loot = this.giveLoot(this.rollLoot('star'));
    Progress.save();
    return loot;
  },

  // ---------- Red dots ----------

  rewardsWaiting() {
    const dd = this.d.daily;
    return dd.tasks.some(t => !t.claimed && t.progress >= t.goal)
      || this.bonusReady()
      || this.freeChestLeft() <= 0
      || this.starChestsReady() > 0
      || QUESTS.some(q => !this.d.claimed.includes(q.id) && Progress.stat(q.stat) >= q.goal);
  },
};

function formatTime(ms) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}
