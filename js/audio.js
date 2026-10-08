// Synthesised sound effects (WebAudio, no files). The context starts on the
// first touch / key press; sound is off when the menu button says so, during
// ads and platform pauses, and while the tab is hidden.

const Sfx = {
  ctx: null,
  master: null,
  noiseBuf: null,
  enabled: true,      // player's setting (menu button)
  platformMuted: false,
  last: {},           // per-sound throttle timestamps
  flameNode: null,

  // Called once; real start happens on the first user gesture.
  init() {
    const unlock = () => {
      this.start();
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('touchstart', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', () => this.applyVolume());
    if (typeof Platform !== 'undefined') {
      Platform.on('mute', m => { this.platformMuted = m; this.applyVolume(); });
    }
  },

  start() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        // A compressor keeps many overlapping sounds from clipping.
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 6;
        this.master.disconnect();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.applyVolume();
    } catch (e) {
      this.ctx = null;
    }
  },

  setEnabled(on) {
    this.enabled = on;
    this.applyVolume();
  },

  get audible() {
    return this.ctx && this.enabled && !this.platformMuted && !document.hidden;
  },

  applyVolume() {
    if (!this.ctx) return;
    const v = this.audible ? 0.55 : 0;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
    if (!this.audible) this.flame(false);
  },

  // Allow a sound at most once per `ms` milliseconds.
  ok(key, ms) {
    if (!this.audible) return false;
    const now = performance.now();
    if (now - (this.last[key] || 0) < ms) return false;
    this.last[key] = now;
    return true;
  },

  // ---------- Building blocks ----------

  env(gain, t, a, d, peak) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  },

  tone(freq, dur, { type = 'sine', vol = 0.3, to = null, delay = 0, attack = 0.005 } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    this.env(g, t, attack, dur, vol);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  },

  noise(dur, { freq = 1200, q = 0.8, type = 'lowpass', vol = 0.3, to = null, delay = 0, attack = 0.003 } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, attack, dur, vol);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + dur + 0.05);
  },

  // ---------- Game sounds ----------

  shot(w) {
    if (!this.ok('shot_' + w.id, w.rate > 10 ? 55 : 30)) return;
    const r = 0.92 + Math.random() * 0.16;
    switch (w.type) {
      case 'bullet':
        if (w.pellets) {
          this.noise(0.22, { freq: 2600, to: 300, vol: 0.5 });
          this.tone(110 * r, 0.16, { type: 'triangle', vol: 0.35, to: 45 });
        } else {
          const heavy = w.id === 'pistol' ? 1 : 0.7;
          this.noise(0.07 + heavy * 0.04, { freq: 3400 * r, to: 600, vol: 0.28 * heavy + 0.12 });
          this.tone(170 * r, 0.07, { type: 'square', vol: 0.08, to: 70 });
        }
        break;
      case 'bolt':
        this.tone(420 * r, 0.16, { type: 'triangle', vol: 0.3, to: 120 });
        this.noise(0.06, { freq: 5000, type: 'highpass', vol: 0.12 });
        break;
      case 'grenade':
        this.tone(140 * r, 0.14, { type: 'sine', vol: 0.45, to: 60 });
        this.noise(0.1, { freq: 900, vol: 0.2 });
        break;
      case 'tesla':
        // Crackling zap: a few detuned sawtooth bursts.
        for (let i = 0; i < 3; i++) {
          this.tone((900 + Math.random() * 900) * r, 0.05, { type: 'sawtooth', vol: 0.09, to: 200 + Math.random() * 300, delay: i * 0.025 });
        }
        this.noise(0.12, { freq: 6000, type: 'highpass', vol: 0.12 });
        break;
      case 'plasma':
        this.tone(300 * r, 0.18, { type: 'sine', vol: 0.3, to: 1400 });
        this.tone(600 * r, 0.12, { type: 'triangle', vol: 0.08, to: 2400 });
        break;
      case 'rocket':
        this.noise(0.5, { freq: 400, to: 2400, type: 'bandpass', q: 1.5, vol: 0.4 });
        this.tone(90, 0.2, { type: 'triangle', vol: 0.3, to: 50 });
        break;
      case 'flame':
        break; // continuous loop, see flame()
    }
  },

  // Looped hiss while the flamethrower fires.
  flame(on) {
    if (on && this.audible && !this.flameNode) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.32, c.currentTime + 0.08);
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.flameNode = { src, g, f };
    } else if (!on && this.flameNode) {
      const { src, g } = this.flameNode;
      const t = this.ctx.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.05);
      src.stop(t + 0.3);
      this.flameNode = null;
    } else if (on && this.flameNode) {
      // Flicker
      this.flameNode.f.frequency.setTargetAtTime(700 + Math.random() * 600, this.ctx.currentTime, 0.05);
    }
  },

  hit() {
    if (!this.ok('hit', 45)) return;
    this.noise(0.04, { freq: 1800 + Math.random() * 800, type: 'bandpass', q: 2, vol: 0.12 });
  },

  zombieDie(big) {
    if (!this.ok('die', 60)) return;
    const r = 0.85 + Math.random() * 0.3;
    this.noise(big ? 0.35 : 0.2, { freq: 900 * r, to: 150, vol: big ? 0.35 : 0.22 });
    this.tone((big ? 90 : 160) * r, big ? 0.3 : 0.18, { type: 'sawtooth', vol: 0.08, to: 50 });
  },

  explosion(size = 100) {
    if (!this.ok('boom', 70)) return;
    const k = Math.min(1.4, size / 110);
    this.noise(0.6 + k * 0.3, { freq: 1600, to: 80, vol: 0.55 * k + 0.15, attack: 0.002 });
    this.tone(70, 0.5 + k * 0.2, { type: 'sine', vol: 0.55, to: 30 });
  },

  coin() {
    if (!this.ok('coin', 40)) return;
    this.tone(1320, 0.06, { type: 'square', vol: 0.06 });
    this.tone(1980, 0.12, { type: 'square', vol: 0.05, delay: 0.05 });
  },

  xp() {
    if (!this.ok('xp', 35)) return;
    // Pitch climbs while orbs are collected in a row.
    const now = performance.now();
    this.xpStep = now - (this.xpAt || 0) < 400 ? Math.min(12, (this.xpStep || 0) + 1) : 0;
    this.xpAt = now;
    this.tone(660 * Math.pow(2, this.xpStep / 12), 0.07, { type: 'sine', vol: 0.12 });
  },

  levelUp() {
    if (!this.ok('lvl', 300)) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { type: 'triangle', vol: 0.18, delay: i * 0.07 }));
  },

  hurt() {
    if (!this.ok('hurt', 120)) return;
    this.tone(140, 0.18, { type: 'square', vol: 0.18, to: 70 });
    this.noise(0.12, { freq: 700, vol: 0.25 });
  },

  bossRoar() {
    if (!this.ok('roar', 800)) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 1.3);
    lfo.frequency.value = 9;
    lg.gain.value = 12;
    lfo.connect(lg).connect(o.frequency);
    f.type = 'lowpass';
    f.frequency.value = 700;
    this.env(g, t, 0.12, 1.3, 0.45);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); lfo.start(t);
    o.stop(t + 1.6); lfo.stop(t + 1.6);
    this.noise(1.2, { freq: 500, to: 150, vol: 0.25, attack: 0.1 });
  },

  skill() {
    if (!this.ok('skill', 200)) return;
    this.tone(330, 0.25, { type: 'triangle', vol: 0.2, to: 990 });
  },

  victory() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.5 : 0.16, { type: 'triangle', vol: 0.2, delay: i * 0.12 }));
  },

  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, i === 3 ? 0.7 : 0.25, { type: 'sawtooth', vol: 0.1, delay: i * 0.22 }));
  },

  click() {
    if (!this.ok('click', 40)) return;
    this.tone(880, 0.03, { type: 'square', vol: 0.06, to: 660 });
  },
};

// Safe wrapper: game code calls sfx('name', args) without caring whether audio started.
function sfx(name, ...args) {
  if (Sfx.ctx && Sfx[name]) {
    try {
      Sfx[name](...args);
    } catch (e) {
      // Never let a sound break the game.
    }
  }
}
