// Theme registry. A theme is just data: colors for each palette key used by
// the art, a sky, which background decorations to show, which obstacles to
// spawn and which accessories the dino wears. See README.md → "Adding a theme".
//
// Any color you don't set is derived from `fg` / `bg` (see deriveColors).

export const THEMES = {
  classic: {
    name: 'Classic',
    icon: '🦖',
    sky: '#f7f7f7',
    colors: { bg: '#f7f7f7', fg: '#535353', cloud: '#cfcfcf' },
    decor: { clouds: 1 },
    nightTheme: 'night', // fades into this theme every CONFIG.night.every points
    page: { bg: '#ffffff', fg: '#535353' },
  },

  night: {
    name: 'Night',
    icon: '🌙',
    sky: '#202124',
    colors: { bg: '#202124', fg: '#dadce0', cloud: '#5f6368', star: '#f1f3f4', moon: '#f1f3f4' },
    decor: { clouds: 1, stars: 1, moon: 1 },
    page: { bg: '#18191b', fg: '#dadce0' },
  },

  color: {
    name: 'Color',
    icon: '🌈',
    sky: { gradient: ['#7cc4fa', '#e3f4ff'] },
    colors: {
      bg: '#e3f4ff', fg: '#2b4a2f',
      body: '#3fa34d', belly: '#d8f5b0', accent: '#f08c00', eye: '#ffffff', pupil: '#1b1b1b', mouth: '#7a2e2e',
      obstacle: '#2f9e44', obstacleAccent: '#1b6e2c', flower: '#f783ac',
      bird: '#7048e8', birdEye: '#ffffff',
      ground: '#8d6e63', groundDetail: '#6d4c41', groundFill: '#e9d3a8',
      cloud: '#ffffff', cloudFill: '#ffffff', sun: '#ffd43b', text: '#1c3d5a',
    },
    decor: { clouds: 1, sun: 1 },
    page: { bg: '#f1f9ff', fg: '#1c3d5a', accent: '#2f9e44' },
  },

  hero: {
    name: 'Hero',
    icon: '🦸',
    sky: { gradient: ['#0b1020', '#2a3350'] },
    colors: {
      bg: '#1a2035', fg: '#cbd5e1',
      body: '#8f9bb3', belly: '#d7dde8', accent: '#facc15', eye: '#ffffff', pupil: '#111827', mouth: '#111827',
      mask: '#111827', cape: '#1f2937', capeLining: '#facc15',
      obstacle: '#94a3b8', obstacleAccent: '#64748b', bird: '#facc15', birdEye: '#111827',
      ground: '#cbd5e1', groundDetail: '#64748b', groundFill: '#141a2b',
      skyline: '#0e1424', window: '#fde68a', cloud: '#3b4566', moon: '#fef3c7', star: '#e2e8f0',
    },
    decor: { skyline: 1, moon: 1, stars: 1, clouds: 1 },
    accessories: ['cape', 'mask'],
    page: { bg: '#0f1424', fg: '#e2e8f0', accent: '#facc15' },
  },

  jester: {
    name: 'Jester',
    icon: '🃏',
    sky: { gradient: ['#2b1036', '#5b2163'] },
    colors: {
      bg: '#3d1748', fg: '#e9d5ff',
      body: '#eeeef2', belly: '#ffffff', accent: '#22c55e', eye: '#ffffff', pupil: '#14532d', mouth: '#dc2626',
      hat1: '#7c3aed', hat2: '#16a34a', bell: '#facc15',
      obstacle: '#84cc16', obstacleAccent: '#3f6212', flower: '#facc15',
      bird: '#facc15', birdEye: '#3d1748',
      ground: '#c084fc', groundDetail: '#7e22ce', groundFill: '#240b2e',
      cloud: '#7e3a8f', cloudFill: '#5b2163', star: '#f5d0fe', text: '#f5d0fe',
    },
    decor: { clouds: 1, stars: 1 },
    accessories: ['jesterHat'],
    page: { bg: '#1f0a27', fg: '#f5d0fe', accent: '#22c55e' },
  },

  dina: {
    name: 'Dina',
    icon: '🎀',
    sky: '#fff0f6',
    colors: {
      bg: '#fff0f6', fg: '#a3496f',
      body: '#f06595', belly: '#ffdeeb', accent: '#c2255c', eye: '#ffffff', pupil: '#5c1a33', mouth: '#ffffff',
      bow: '#be4bdb', bowKnot: '#862e9c',
      obstacle: '#a3496f', obstacleAccent: '#7d2e50', flower: '#ffd43b',
      cloud: '#fcc2d7',
    },
    decor: { clouds: 1 },
    accessories: ['bow'],
    page: { bg: '#fff5f9', fg: '#a3496f', accent: '#f06595' },
  },

  halloween: {
    name: 'Halloween',
    icon: '🎃',
    sky: { gradient: ['#07060f', '#2a1846'] },
    colors: {
      bg: '#1a1030', fg: '#cbd5e1',
      body: '#f1f5f9', belly: '#ffffff', accent: '#e2e8f0', eye: '#0f0a1a', pupil: '#0f0a1a', mouth: '#0f0a1a',
      pumpkin: '#f97316', stem: '#65a30d', pumpkinFace: '#fde047',
      stone: '#6b7280', engrave: '#374151',
      bat: '#c084fc', batEye: '#fde047',
      ground: '#9ca3af', groundDetail: '#4b5563', groundFill: '#0f0a1a',
      cloud: '#3b2a5a', moon: '#fde68a', star: '#e9d5ff', text: '#fdba74',
    },
    decor: { clouds: 1, stars: 1, moon: 1 },
    dinoAlpha: 0.85, // a ghost!
    obstacles: { ground: ['pumpkinSmall', 'pumpkinLarge', 'tombstone'], air: ['bat'] },
    page: { bg: '#0f0a1a', fg: '#fdba74', accent: '#f97316' },
  },
};

export const DEFAULT_OBSTACLES = { ground: ['cactusSmall', 'cactusLarge'], air: ['bird'] };

export function getTheme(id) {
  return THEMES[id] ?? THEMES.classic;
}

/** Fills in every palette key from a theme's partial color list. */
export function deriveColors(c) {
  const bg = c.bg ?? '#f7f7f7';
  const fg = c.fg ?? '#535353';
  const body = c.body ?? fg;
  const obstacle = c.obstacle ?? fg;
  const ground = c.ground ?? fg;
  const derived = {
    bg, fg, body,
    belly: body, accent: body, eye: bg, pupil: body, mouth: bg,
    obstacle, obstacleAccent: obstacle, flower: obstacle,
    bird: obstacle, birdEye: bg,
    pumpkin: obstacle, stem: obstacle, pumpkinFace: bg,
    stone: obstacle, engrave: bg,
    bat: obstacle, batEye: bg,
    ground, groundDetail: ground, groundFill: null,
    cloud: fg, cloudFill: null,
    text: fg, star: fg, moon: fg, sun: fg,
    skyline: fg, window: bg,
    bow: '#f06595', bowKnot: '#c2255c',
    cape: fg, capeLining: fg, mask: fg,
    hat1: fg, hat2: fg, bell: fg,
  };
  for (const [k, v] of Object.entries(c)) if (v !== undefined) derived[k] = v;
  return derived;
}

/** Applies the player's custom colors (from the Customize panel) to a theme. */
function layer(theme, custom) {
  const c = { ...theme.colors };
  if (custom.dino) c.body = custom.dino;
  if (custom.obstacle) {
    for (const k of ['obstacle', 'bird', 'pumpkin', 'stone', 'bat']) c[k] = custom.obstacle;
  }
  if (custom.ground) c.ground = c.groundDetail = custom.ground;
  if (custom.sky) c.text = isLight(custom.sky) ? '#3b3b3b' : '#f1f3f4'; // keep the score readable
  const colors = deriveColors(c);
  return {
    colors,
    sky: custom.sky ?? theme.sky ?? colors.bg,
    decor: { clouds: 0, stars: 0, moon: 0, sun: 0, skyline: 0, ...theme.decor },
    page: {
      bg: theme.page?.bg ?? colors.bg,
      fg: theme.page?.fg ?? colors.text,
      accent: theme.page?.accent ?? colors.body,
    },
  };
}

// --- color mixing (for the day → night fade) --------------------------------

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isLight(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

export function mixColor(a, b, t) {
  if (t <= 0 || a === b) return a;
  if (t >= 1) return b;
  if (!a || !b || !a.startsWith('#') || !b.startsWith('#')) return t < 0.5 ? a : b;
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const mixed = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function skyStops(sky) {
  return typeof sky === 'string' ? [sky, sky] : sky.gradient;
}

function mixLayers(a, b, t) {
  const colors = {};
  for (const k of Object.keys(a.colors)) colors[k] = mixColor(a.colors[k], b.colors[k], t);
  const decor = {};
  for (const k of Object.keys(a.decor)) decor[k] = a.decor[k] + (b.decor[k] - a.decor[k]) * t;
  const [a0, a1] = skyStops(a.sky);
  const [b0, b1] = skyStops(b.sky);
  const page = {};
  for (const k of Object.keys(a.page)) page[k] = mixColor(a.page[k], b.page[k], t);
  return { colors, decor, page, sky: { gradient: [mixColor(a0, b0, t), mixColor(a1, b1, t)] } };
}

/**
 * Everything the renderer needs for one frame.
 * @param {string} themeId
 * @param {number} nightT 0 = day, 1 = fully faded into the theme's nightTheme
 * @param {object} custom the `custom` block from settings
 */
export function buildPalette(themeId, nightT, custom = {}) {
  const theme = getTheme(themeId);
  let result = layer(theme, custom);
  if (nightT > 0 && theme.nightTheme) {
    result = mixLayers(result, layer(getTheme(theme.nightTheme), custom), nightT);
  }
  return {
    ...result,
    accessories: theme.accessories ?? [],
    dinoAlpha: theme.dinoAlpha ?? 1,
    obstacles: { ...DEFAULT_OBSTACLES, ...theme.obstacles },
    image: custom.image ?? theme.image ?? null,
    imageMode: custom.imageMode ?? theme.imageMode ?? 'cover',
    imageScroll: custom.imageScroll ?? theme.imageScroll ?? true,
    imageOpacity: custom.imageOpacity ?? theme.imageOpacity ?? 1,
  };
}
