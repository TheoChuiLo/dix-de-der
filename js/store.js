// localStorage persistence: current game, past games and preferences.

const STORAGE_KEY = 'dix-de-der:v1';

const defaults = () => ({
  current: null,
  history: [],
  prefs: { wakeLock: true, lastSetup: null },
});

export function loadData() {
  const data = defaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      data.current = saved.current ?? null;
      data.history = Array.isArray(saved.history) ? saved.history : [];
      data.prefs = { ...data.prefs, ...saved.prefs };
    }
  } catch {
    // Corrupted or unavailable storage: start fresh.
  }
  return data;
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): the game still works in memory.
  }
}
