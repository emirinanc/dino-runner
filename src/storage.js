// Settings and high score, persisted in localStorage.

const KEYS = {
  settings: 'dino-runner:settings',
  high: 'dino-runner:high',
};

export const DEFAULT_SETTINGS = {
  theme: 'classic',
  lang: null, // UI language; null = browser language
  sound: true,
  zoom: 1,
  dayNightCycle: true,
  speed: 1, // multiplier; the high score only updates at 1
  invincible: false, // practice mode; the high score doesn't update
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
  learning: {
    lang: 'tr', // language numbers are written and spoken in (see src/learn/numbers.js)
    speak: true, // read the score aloud at game over and at every 100 points
    coloredDigits: true, // color score digits by place value (ones, tens, hundreds…)
    maxNumber: 10, // biggest number in the counting / addition game
    voices: {}, // chosen voice per number language: { tr: voiceURI }; missing = best available
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
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    custom: { ...DEFAULT_SETTINGS.custom, ...saved.custom },
    learning: { ...DEFAULT_SETTINGS.learning, ...saved.learning, voices: { ...saved.learning?.voices } },
  };
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
