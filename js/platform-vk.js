// VK Games adapter: VK Bridge (js/vendor/vk-bridge.min.js), native ads,
// banner, cloud saves in VK Storage, pause on VKWebAppViewHide, language
// from vk_language and the social actions (invite, share, community...).

const VK_PARAMS = new URLSearchParams(location.search);
// VK passes signed launch parameters (vk_app_id, vk_platform, vk_language...).
const VK_LAUNCHED = VK_PARAMS.has('vk_app_id') || VK_PARAMS.has('vk_platform');
const VK_CHUNK_BYTES = 4000;            // VK Storage: value ≤ 4096 bytes
const VK_META_KEY = 's_meta';

// VKWebAppInit right away, before the rest of the game loads.
const VK_INIT = (() => {
  const wanted = typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.platform === 'vk';
  if (!window.vkBridge || !(VK_LAUNCHED || wanted)) return Promise.resolve(false);
  return window.vkBridge.send('VKWebAppInit').then(() => true, () => false);
})();

PlatformAdapters.vk = {
  name: 'vk',
  bridge: null,
  supported: {},
  homeScreen: false,
  writing: null,        // cloud write in progress
  pending: null,        // newest save waiting for the current write to finish
  slot: 'a',            // storage slot holding the current save

  async init(P) {
    const bridge = window.vkBridge;
    if (!bridge) return false;
    const inited = await Promise.race([VK_INIT, new Promise(r => setTimeout(() => r(false), 3000))]);
    if (!inited && !VK_LAUNCHED) return false;
    this.bridge = bridge;

    bridge.subscribe(e => {
      const type = e && e.detail && e.detail.type;
      if (type === 'VKWebAppViewHide') {
        // App minimised or the user switched away: pause, mute, save.
        P.emit('hide');
        P.suspend('vk');
        P.flushCloud();
      } else if (type === 'VKWebAppViewRestore') {
        P.resume('vk');
      }
    });

    await this.checkSupport();
    // Preload ads so they are ready by the first offer.
    this.checkAd('reward');
    this.checkAd('interstitial');
    return true;
  },

  send(method, params) {
    return this.bridge.send(method, params);
  },

  async checkSupport() {
    const methods = ['VKWebAppShowInviteBox', 'VKWebAppShare', 'VKWebAppShowWallPostBox', 'VKWebAppJoinGroup',
      'VKWebAppAddToFavorites', 'VKWebAppAddToHomeScreen', 'VKWebAppAllowNotifications'];
    await Promise.all(methods.map(async m => {
      try {
        this.supported[m] = this.bridge.supportsAsync ? await this.bridge.supportsAsync(m) : true;
      } catch (e) {
        this.supported[m] = false;
      }
    }));
    // A client that doesn't report its methods: offer the basic ones anyway
    // (a failed call just returns false).
    if (!methods.some(m => this.supported[m])) {
      ['VKWebAppShowInviteBox', 'VKWebAppShare', 'VKWebAppShowWallPostBox', 'VKWebAppAddToFavorites'].forEach(m => { this.supported[m] = true; });
    }
    if (this.supported.VKWebAppAddToHomeScreen) {
      try {
        const info = await Promise.race([
          this.send('VKWebAppAddToHomeScreenInfo'),
          new Promise((_, rej) => setTimeout(rej, 1500)),
        ]);
        this.homeScreen = !!(info && info.is_feature_supported && !info.is_added_to_home_screen);
      } catch (e) {
        this.homeScreen = false;
      }
    }
  },

  langHint() {
    // vk_language: ru, uk, ua, be, kz, en, ...
    const code = (VK_PARAMS.get('vk_language') || '').toLowerCase();
    return { ua: 'uk', kz: 'kk' }[code] || code;
  },

  appId() {
    return (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.vkAppId) || Number(VK_PARAMS.get('vk_app_id')) || 0;
  },

  appLink() {
    return 'https://vk.com/app' + this.appId();
  },

  // ---------- Ads ----------

  checkAd(format) {
    return this.send('VKWebAppCheckNativeAds', { ad_format: format })
      .then(d => !!(d && d.result), () => false);
  },

  async showAd(format) {
    if (!(await this.checkAd(format))) return false;
    let shown = false;
    try {
      const d = await this.send('VKWebAppShowNativeAds', { ad_format: format });
      shown = !!(d && d.result);
    } catch (e) {
      shown = false;
    }
    this.checkAd(format);   // preload the next one
    return shown;
  },

  rewarded() {
    return this.showAd('reward');
  },

  interstitial() {
    return this.showAd('interstitial');
  },

  banner(show) {
    const p = show
      ? this.send('VKWebAppShowBannerAd', { banner_location: 'bottom', layout_type: 'resize' })
      : this.send('VKWebAppHideBannerAd');
    if (p && p.catch) p.catch(() => {});
  },

  // ---------- Cloud saves (VK Storage) ----------
  // The save is JSON split into chunks of ≤ VK_CHUNK_BYTES bytes under keys
  // s_<slot>_<i>. Two slots take turns: chunks go to the free slot first and
  // only then s_meta switches to it, so a cut-off write never breaks the save.

  async loadCloud() {
    const meta = await this.getKeys([VK_META_KEY]);
    let m = null;
    try {
      m = meta[VK_META_KEY] ? JSON.parse(meta[VK_META_KEY]) : null;
    } catch (e) {
      m = null;
    }
    if (!m || !m.n || !/^[ab]$/.test(m.slot)) return null;
    this.slot = m.slot;
    const keys = [];
    for (let i = 0; i < m.n; i++) keys.push(`s_${m.slot}_${i}`);
    const got = await this.getKeys(keys);
    const json = keys.map(k => got[k] || '').join('');
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;   // damaged — keep the local save
    }
  },

  async getKeys(keys) {
    const out = {};
    // VK Storage reads at most 1000 keys per call; we use far fewer.
    const d = await this.send('VKWebAppStorageGet', { keys });
    (d && d.keys || []).forEach(k => { out[k.key] = k.value; });
    return out;
  },

  setKey(key, value) {
    return this.send('VKWebAppStorageSet', { key, value });
  },

  // Splits a string into pieces of at most maxBytes UTF-8 bytes.
  chunk(str, maxBytes) {
    const parts = [];
    let cur = '', bytes = 0;
    for (const ch of str) {
      const c = ch.codePointAt(0);
      const b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (bytes + b > maxBytes) {
        parts.push(cur);
        cur = '';
        bytes = 0;
      }
      cur += ch;
      bytes += b;
    }
    if (cur || !parts.length) parts.push(cur);
    return parts;
  },

  saveCloud(data) {
    this.pending = { json: JSON.stringify(data), savedAt: data.savedAt || 0 };
    if (!this.writing) {
      this.writing = this.drain().finally(() => { this.writing = null; });
    }
    return this.writing;
  },

  // Writes saves one after another; only the newest waiting one is written.
  async drain() {
    while (this.pending !== null) {
      const { json, savedAt } = this.pending;
      this.pending = null;
      const parts = this.chunk(json, VK_CHUNK_BYTES);
      const slot = this.slot === 'a' ? 'b' : 'a';
      for (let i = 0; i < parts.length; i++) await this.setKey(`s_${slot}_${i}`, parts[i]);
      await this.setKey(VK_META_KEY, JSON.stringify({ slot, n: parts.length, savedAt }));
      this.slot = slot;
    }
  },

  clearCloud() {
    this.pending = null;
    return this.setKey(VK_META_KEY, '');
  },

  // ---------- Social ----------

  socialAvailable(id) {
    const s = this.supported;
    switch (id) {
      case 'invite': return !!s.VKWebAppShowInviteBox;
      case 'share': return !!s.VKWebAppShare;
      case 'wall': return !!s.VKWebAppShowWallPostBox && !!this.appId();
      case 'group': return !!s.VKWebAppJoinGroup && !!(typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.vkGroupId);
      case 'favorites': return !!s.VKWebAppAddToFavorites;
      case 'home': return this.homeScreen;
      case 'notify': return !!s.VKWebAppAllowNotifications;
      default: return false;
    }
  },

  async social(id) {
    switch (id) {
      case 'invite': {
        const d = await this.send('VKWebAppShowInviteBox');
        return !!(d && d.success !== false);
      }
      case 'share': {
        const params = this.appId() ? { link: this.appLink() } : {};
        await this.send('VKWebAppShare', params);
        return true;
      }
      case 'wall': {
        const d = await this.send('VKWebAppShowWallPostBox', { message: t('vk.wallText'), attachments: this.appLink() });
        return !!(d && d.post_id);
      }
      case 'group': {
        const d = await this.send('VKWebAppJoinGroup', { group_id: Number(GAME_CONFIG.vkGroupId) });
        return !!(d && d.result);
      }
      case 'favorites': {
        const d = await this.send('VKWebAppAddToFavorites');
        return !!(d && d.result);
      }
      case 'home': {
        const d = await this.send('VKWebAppAddToHomeScreen');
        if (d && d.result) this.homeScreen = false;
        return !!(d && d.result);
      }
      case 'notify': {
        const d = await this.send('VKWebAppAllowNotifications');
        return !!(d && d.result);
      }
      default:
        return false;
    }
  },
};

