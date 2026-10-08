// Platform layer: Yandex Games SDK (ads, gameplay markers, pause events,
// cloud saves) with a local fallback. Everything that talks to the outside
// world goes through here. No purchases and no external links.

const SAVE_KEY = 'rassvet_save_v1';
const INTERSTITIAL_COOLDOWN = 90 * 1000;   // between full-screen ads
const CLOUD_SAVE_DELAY = 3000;             // debounce for player.setData

const Platform = {
  ysdk: null,
  player: null,
  cache: null,          // save data loaded at start (newest of local / cloud)
  suspended: false,     // game frozen (ad on screen or game_api_pause)
  muted: false,         // sound off for the same reasons
  adShowing: false,
  gameplayOn: false,
  lastAdAt: 0,
  listeners: {},

  on(name, fn) {
    (this.listeners[name] = this.listeners[name] || []).push(fn);
  },

  emit(name, data) {
    (this.listeners[name] || []).forEach(fn => fn(data));
  },

  // ---------- Start-up ----------

  async init() {
    const YaGames = await Promise.race([
      window.__sdkReady || Promise.resolve(null),
      new Promise(r => setTimeout(() => r(null), 4000)),
    ]);
    if (YaGames && YaGames.init) {
      try {
        this.ysdk = await YaGames.init();
        this.ysdk.on && this.ysdk.on('game_api_pause', () => this.suspend('api'));
        this.ysdk.on && this.ysdk.on('game_api_resume', () => this.resume('api'));
        try {
          this.player = await this.ysdk.getPlayer({ scopes: false });
        } catch (e) {
          this.player = null;
        }
      } catch (e) {
        this.ysdk = null;
      }
    }
    await this.loadSaves();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flushCloud();
    });
  },

  get hasSdk() {
    return !!this.ysdk;
  },

  // The game is loaded and ready to play (shown the menu).
  ready() {
    try {
      const api = this.ysdk && this.ysdk.features && this.ysdk.features.LoadingAPI;
      if (api && api.ready) api.ready();
    } catch (e) {
      // SDK hiccup — the game works anyway.
    }
  },

  // Called every frame with "is the player actually playing right now".
  setGameplay(active) {
    if (active === this.gameplayOn) return;
    this.gameplayOn = active;
    try {
      const api = this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI;
      if (api) active ? api.start() : api.stop();
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
    if (this.player && this.player.getData) {
      try {
        const data = await this.player.getData(['save']);
        cloud = data && data.save ? data.save : null;
      } catch (e) {
        cloud = null;
      }
    }
    // Keep the newest of the two.
    const t = s => (s && s.savedAt) || 0;
    this.cache = t(cloud) > t(local) ? cloud : local;
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
    if (this.player) {
      clearTimeout(this.cloudTimer);
      this.cloudTimer = setTimeout(() => this.flushCloud(), CLOUD_SAVE_DELAY);
    }
    return true;
  },

  flushCloud() {
    clearTimeout(this.cloudTimer);
    if (!this.player || !this.cache) return;
    try {
      const p = this.player.setData({ save: this.cache }, true);
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
    if (this.player) {
      try {
        const p = this.player.setData({ save: null }, true);
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  },

  // ---------- Ads ----------

  // Rewarded video. Resolves true only if the reward should be given.
  showRewarded(placement) {
    if (this.adShowing) return Promise.resolve(false);
    this.adShowing = true;
    this.suspend('ad');
    const done = rewarded => {
      this.adShowing = false;
      this.lastAdAt = Date.now();
      this.resume('ad');
      return rewarded;
    };
    if (!this.ysdk) return DemoAd.show('rewarded', placement).then(() => done(true));
    return new Promise(resolve => {
      let rewarded = false;
      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => { rewarded = true; },
            onClose: () => resolve(done(rewarded)),
            onError: () => resolve(done(false)),
          },
        });
      } catch (e) {
        resolve(done(false));
      }
    });
  },

  // Full-screen ad between levels (rate-limited). Always resolves.
  showInterstitial() {
    if (this.adShowing || Date.now() - this.lastAdAt < INTERSTITIAL_COOLDOWN) return Promise.resolve(false);
    this.adShowing = true;
    this.suspend('ad');
    const done = shown => {
      this.adShowing = false;
      this.lastAdAt = Date.now();
      this.resume('ad');
      return shown;
    };
    if (!this.ysdk) return DemoAd.show('interstitial').then(() => done(true));
    return new Promise(resolve => {
      try {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onClose: shown => resolve(done(!!shown)),
            onError: () => resolve(done(false)),
            onOffline: () => resolve(done(false)),
          },
        });
      } catch (e) {
        resolve(done(false));
      }
    });
  },

  // Sticky banner: shown in the menu, hidden in battle.
  banner(show) {
    if (this.bannerOn === show) return;
    this.bannerOn = show;
    if (!this.ysdk || !this.ysdk.adv) return;
    try {
      const p = show ? this.ysdk.adv.showBannerAdv() : this.ysdk.adv.hideBannerAdv();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      // banners may be off for the game in the console
    }
  },
};

// Local stand-in for ads: a 2-second "Демо-реклама" window.
const DemoAd = {
  show(kind, placement) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'demo-ad';
      el.innerHTML = `
        <div class="demo-ad-box">
          <div class="demo-ad-title">Демо-реклама</div>
          <div class="demo-ad-sub">${kind === 'rewarded' ? 'Реклама за награду' : 'Реклама между уровнями'}${placement ? ` · ${placement}` : ''}</div>
          <div class="demo-ad-bar"><i></i></div>
          <div class="demo-ad-note">В Яндекс Играх здесь будет настоящая реклама</div>
        </div>`;
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        resolve();
      }, 2000);
    });
  },
};
