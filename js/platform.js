// Platform layer: saving (localStorage for now; Yandex SDK cloud saves later).
// Everything that talks to the outside world goes through here.

const SAVE_KEY = 'rassvet_save_v1';

const Platform = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },

  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // Storage blocked (private mode) — nothing to clear.
    }
  },
};
