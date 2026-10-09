// Platform layer: one interface for the game, with adapters for Yandex Games,
// VK Games and a local fallback (platform-yandex.js, platform-vk.js,
// platform-local.js). Everything that talks to the outside world goes through
// here. No purchases and no external links.
//
// An adapter implements:
//   name                       'yandex' | 'vk' | 'local'
//   async init(Platform)       → true if this platform is available
//   ready()                    the game has loaded (menu shown)
//   gameplay(active)           the player is / isn't actually playing
//   langHint()                 platform language code or ''
//   async loadCloud()          → saved object or null
//   async saveCloud(data)      store the save in the cloud
//   async clearCloud()
//   rewarded(placement)        → Promise<boolean> (give the reward?)
//   interstitial()             → Promise<boolean>
//   banner(show)
//   socialAvailable(id), social(id) → Promise<boolean>   (optional)

const SAVE_KEY = 'rassvet_save_v1';
const INTERSTITIAL_COOLDOWN = 90 * 1000;   // between full-screen ads
const CLOUD_SAVE_DELAY = 3000;             // debounce for cloud writes

const PlatformAdapters = {};               // filled by the adapter files

const Platform = {
  adapter: null,
  cache: null,          // save data loaded at start (newest of local / cloud)
  suspended: false,     // game frozen (ad on screen, platform pause, app hidden)
  muted: false,         // sound off for the same reasons
  adShowing: false,
  gameplayOn: false,
  bannerOn: undefined,
  lastAdAt: 0,
  listeners: {},
  ysdk: null,           // set by the Yandex adapter (kept for language detection & tests)

  on(name, fn) {
    (this.listeners[name] = this.listeners[name] || []).push(fn);
  },

  emit(name, data) {
    (this.listeners[name] || []).forEach(fn => fn(data));
  },

  // ---------- Start-up ----------

  // Which adapters to try, in order, for the configured platform.
  candidates() {
    const p = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.platform) || 'auto';
    if (p === 'yandex') return ['yandex', 'local'];
    if (p === 'vk') return ['vk', 'local'];
    if (p === 'local') return ['local'];
    // auto: VK launch parameters win, then Yandex, then local.
    return ['vk', 'yandex', 'local'];
  },

  async init() {
    for (const name of this.candidates()) {
      const a = PlatformAdapters[name];
      if (!a) continue;
      let ok = false;
      try {
        ok = await a.init(this);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        this.adapter = a;
        break;
      }
    }
    if (!this.adapter) this.adapter = PlatformAdapters.local;
    await this.loadSaves();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flushCloud();
    });
  },

  get name() {
    return this.adapter ? this.adapter.name : 'local';
  },

  get hasSdk() {
    return this.name !== 'local';
  },

  // Platform language code. Before init only VK knows it (from the URL).
  langHint() {
    try {
      const a = this.adapter || (typeof VK_LAUNCHED !== 'undefined' && VK_LAUNCHED && PlatformAdapters.vk);
      return (a && a.langHint && a.langHint()) || '';
    } catch (e) {
      return '';
    }
  },

  // The game is loaded and ready to play (shown the menu).
  ready() {
    try {
      this.adapter && this.adapter.ready && this.adapter.ready();
    } catch (e) {
      // SDK hiccup — the game works anyway.
    }
  },

  // Called every frame with "is the player actually playing right now".
  setGameplay(active) {
    if (active === this.gameplayOn) return;
    this.gameplayOn = active;
    try {
      this.adapter && this.adapter.gameplay && this.adapter.gameplay(active);
    } catch (e) {
      // ignore
    }
  },

  // ---------- Pause & mute ----------

  suspendReasons: new Set(),

  suspend(reason) {
    this.suspendReasons.add(reason);
    this.suspended = true;
    if (!this.muted) {
      this.muted = true;
      this.emit('mute', true);
    }
    this.emit('suspend', reason);
  },

  resume(reason) {
    this.suspendReasons.delete(reason);
    if (this.suspendReasons.size) return;
    this.suspended = false;
    this.muted = false;
    this.emit('mute', false);
    this.emit('resume', reason);
  },

  // ---------- Saves ----------

  readLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  async loadSaves() {
    const local = this.readLocal();
    let cloud = null;
    try {
      cloud = this.adapter.loadCloud ? await this.adapter.loadCloud() : null;
    } catch (e) {
      cloud = null;
    }
    // Keep the newest of the two.
    const ts = s => (s && s.savedAt) || 0;
    this.cache = ts(cloud) > ts(local) ? cloud : local;
    if (this.cache && this.cache === cloud) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(cloud)); } catch (e) { /* storage blocked */ }
    }
  },

  load() {
    return this.cache || this.readLocal();
  },

  save(data) {
    data.savedAt = Date.now();
    this.cache = data;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage blocked (private mode) — cloud still works.
    }
    if (this.adapter && this.adapter.saveCloud) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = setTimeout(() => this.flushCloud(), CLOUD_SAVE_DELAY);
    }
    return true;
  },

  flushCloud() {
    clearTimeout(this.cloudTimer);
    if (!this.cache || !this.adapter || !this.adapter.saveCloud) return;
    try {
      const p = this.adapter.saveCloud(this.cache);
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      // retry on the next save
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // nothing to clear
    }
    this.cache = null;
    clearTimeout(this.cloudTimer);
    try {
      const p = this.adapter && this.adapter.clearCloud && this.adapter.clearCloud();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      // ignore
    }
  },

  // ---------- Ads ----------

  // Wraps an adapter ad call: freezes and mutes the game while it runs.
  runAd(call) {
    this.adShowing = true;
    this.suspend('ad');
    const done = result => {
      this.adShowing = false;
      this.lastAdAt = Date.now();
      this.resume('ad');
      return result;
    };
    let p;
    try {
      p = Promise.resolve(call());
    } catch (e) {
      p = Promise.resolve(false);
    }
    return p.then(r => done(!!r), () => done(false));
  },

  // Rewarded video. Resolves true only if the reward should be given.
  showRewarded(placement) {
    if (this.adShowing) return Promise.resolve(false);
    return this.runAd(() => this.adapter.rewarded(placement)).then(ok => {
      if (!ok) this.emit('adUnavailable');
      return ok;
    });
  },

  // Full-screen ad between levels (rate-limited). Always resolves.
  showInterstitial() {
    if (this.adShowing || Date.now() - this.lastAdAt < INTERSTITIAL_COOLDOWN) return Promise.resolve(false);
    return this.runAd(() => this.adapter.interstitial());
  },

  // Sticky banner: shown in the menu, hidden in battle.
  banner(show) {
    if (this.bannerOn === show) return;
    this.bannerOn = show;
    try {
      this.adapter && this.adapter.banner && this.adapter.banner(show);
    } catch (e) {
      // banners may be off for the game
    }
  },

  // ---------- Social (VK) ----------

  socialAvailable(id) {
    return !!(this.adapter && this.adapter.socialAvailable && this.adapter.socialAvailable(id));
  },

  social(id) {
    if (!this.socialAvailable(id)) return Promise.resolve(false);
    try {
      return Promise.resolve(this.adapter.social(id)).then(r => !!r, () => false);
    } catch (e) {
      return Promise.resolve(false);
    }
  },
};
