// Yandex Games adapter: SDK from /sdk.js (loaded in index.html), ads,
// gameplay markers, game_api_pause / resume, cloud saves in player data.

PlatformAdapters.yandex = {
  name: 'yandex',
  ysdk: null,
  player: null,

  async init(P) {
    const YaGames = await Promise.race([
      window.__sdkReady || Promise.resolve(null),
      new Promise(r => setTimeout(() => r(null), 4000)),
    ]);
    if (!YaGames || !YaGames.init) return false;
    const ysdk = await YaGames.init();
    this.ysdk = ysdk;
    P.ysdk = ysdk;
    ysdk.on && ysdk.on('game_api_pause', () => P.suspend('api'));
    ysdk.on && ysdk.on('game_api_resume', () => P.resume('api'));
    try {
      this.player = await ysdk.getPlayer({ scopes: false });
    } catch (e) {
      this.player = null;
    }
    return true;
  },

  langHint() {
    const env = this.ysdk && this.ysdk.environment;
    return (env && env.i18n && env.i18n.lang) || '';
  },

  ready() {
    const api = this.ysdk.features && this.ysdk.features.LoadingAPI;
    if (api && api.ready) api.ready();
  },

  gameplay(active) {
    const api = this.ysdk.features && this.ysdk.features.GameplayAPI;
    if (api) active ? api.start() : api.stop();
  },

  async loadCloud() {
    if (!this.player || !this.player.getData) return null;
    const data = await this.player.getData(['save']);
    return data && data.save ? data.save : null;
  },

  saveCloud(data) {
    if (!this.player) return null;
    return this.player.setData({ save: data }, true);
  },

  clearCloud() {
    if (!this.player) return null;
    return this.player.setData({ save: null }, true);
  },

  rewarded() {
    return new Promise(resolve => {
      let rewarded = false;
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: () => { rewarded = true; },
          onClose: () => resolve(rewarded),
          onError: () => resolve(false),
        },
      });
    });
  },

  interstitial() {
    return new Promise(resolve => {
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: shown => resolve(!!shown),
          onError: () => resolve(false),
          onOffline: () => resolve(false),
        },
      });
    });
  },

  banner(show) {
    if (!this.ysdk.adv) return;
    const p = show ? this.ysdk.adv.showBannerAdv() : this.ysdk.adv.hideBannerAdv();
    if (p && p.catch) p.catch(() => {});
  },
};
