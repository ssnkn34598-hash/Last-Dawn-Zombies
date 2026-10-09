// Local adapter: no platform SDK (file://, localhost, any other hosting).
// Saves stay in localStorage, ads are a 2-second demo window.

// Local stand-in for ads: a 2-second "demo ad" window.
const DemoAd = {
  show(kind, placement) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.className = 'demo-ad';
      el.innerHTML = `
        <div class="demo-ad-box">
          <div class="demo-ad-title">${t('ad.demo')}</div>
          <div class="demo-ad-sub">${t(kind === 'rewarded' ? 'ad.rewarded' : 'ad.interstitial')}${placement ? ` · ${placement}` : ''}</div>
          <div class="demo-ad-bar"><i></i></div>
          <div class="demo-ad-note">${t('ad.note')}</div>
        </div>`;
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        resolve();
      }, 2000);
    });
  },
};

PlatformAdapters.local = {
  name: 'local',

  async init() {
    return true;
  },

  langHint() {
    return '';
  },

  rewarded(placement) {
    return DemoAd.show('rewarded', placement).then(() => true);
  },

  interstitial() {
    return DemoAd.show('interstitial').then(() => true);
  },
};
