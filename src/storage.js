// Settings, high score and local leaderboards, persisted in localStorage.

const KEYS = {
  settings: 'dino-runner:settings',
  scores: 'dino-runner:scores',
  high: 'dino-runner:high',
};

export const DEFAULT_SETTINGS = {
  theme: 'classic',
  lang: null, // null = browser language
  nickname: '',
  sound: true,
  zoom: 1,
  dayNightCycle: true,
  speed: 1, // multiplier; scores aren't recorded unless it's 1
  invincible: false, // practice mode; scores aren't recorded
  custom: {
    bgMode: 'theme', // 'theme' | 'color' | 'image'
    sky: '#f7f7f7', // used when bgMode is 'color'
    image: null, // data: URL of an uploaded background image, used when bgMode is 'image'
    imageMode: 'cover', // 'cover' | 'tile' | 'stretch'
    imageScroll: true, // parallax-scroll the image with the game
    imageOpacity: 1,
    dino: null, // '#rrggbb' overrides
    obstacle: null,
    ground: null,
  },
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // private mode or quota exceeded (e.g. a huge background image)
  }
}

export function loadSettings() {
  const saved = read(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...saved, custom: { ...DEFAULT_SETTINGS.custom, ...saved.custom } };
}

export function saveSettings(settings) {
  return write(KEYS.settings, settings);
}

export function loadHighScore() {
  return Number(read(KEYS.high, 0)) || 0;
}

export function saveHighScore(score) {
  write(KEYS.high, score);
}

const today = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

export function recordScore(name, score) {
  if (score <= 0) return;
  const scores = read(KEYS.scores, []);
  scores.push({ name: name || 'Anonymous', score, date: today() });
  scores.sort((a, b) => b.score - a.score);
  // keep the all-time best plus everything from today
  const kept = scores.filter((s, i) => i < 50 || s.date === today());
  write(KEYS.scores, kept.slice(0, 500));
}

export function topScores(limit = 5) {
  const scores = read(KEYS.scores, []);
  return {
    today: scores.filter((s) => s.date === today()).slice(0, limit),
    allTime: scores.slice(0, limit),
  };
}

export function clearScores() {
  write(KEYS.scores, []);
  write(KEYS.high, 0);
}
