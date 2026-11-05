// All pixel art lives here as plain text grids, so it can be edited by hand.
//
// Each character is one art pixel and maps to a palette key (CHAR_COLORS) that
// the active theme fills in. '.' is transparent. Rows in a grid may have
// different lengths; they are padded on the right with transparency.
//
// Open tools/gallery.html in the browser to see every sprite in every theme.

export const CHAR_COLORS = {
  // dino
  X: 'body', b: 'belly', S: 'accent', w: 'eye', p: 'pupil', m: 'mouth',
  // obstacles
  O: 'obstacle', o: 'obstacleAccent', f: 'flower',
  B: 'bird', e: 'birdEye',
  P: 'pumpkin', n: 'stem', F: 'pumpkinFace',
  T: 'stone', E: 'engrave',
  A: 'bat', a: 'batEye',
  // scenery
  c: 'cloud', k: 'cloudFill',
  M: 'moon', s: 'star', U: 'sun',
  G: 'ground', d: 'groundDetail',
  L: 'skyline', W: 'window',
  // accessories
  R: 'bow', r: 'bowKnot',
  Q: 'cape', q: 'capeLining',
  K: 'mask',
  J: 'hat1', H: 'hat2', y: 'bell',
};

/** Pads rows to equal width and records the size. */
export function grid(rows, name = '') {
  const w = Math.max(...rows.map((r) => r.length));
  if (rows.some((r) => r.length !== w) && name) {
    console.debug(`[art] "${name}" has uneven rows; padding to ${w}`);
  }
  return { rows: rows.map((r) => r.padEnd(w, '.')), w, h: rows.length };
}

// The dino characters are in characters.js.

// --- Accessories ------------------------------------------------------------
// Drawn on top of (or behind) the dino, at 2 game pixels per art pixel. Each
// character places them (see `anchors` in characters.js). `onlyOnBody` paints
// only over body pixels (so a mask doesn't cover the eye). Accessories never
// affect collisions.

export const ACCESSORIES = {
  bow: {
    layer: 'front',
    frames: [grid([
      'RR.RR',
      'RRrRR',
      'RR.RR',
    ])],
  },
  mask: {
    layer: 'front',
    onlyOnBody: true,
    frames: [grid(['KKKKKKKKKKKKKK', 'KKKKKKKKKKKKKK', 'KKKKKKKKKKKKKK'])],
  },
  cape: {
    layer: 'back',
    frames: [
      grid([
        '.........QQQQ',
        '.......QQQQQq',
        '.....QQQQQQqq',
        '...QQQQQQQqq.',
        '.QQQQQQQQqq..',
        'QQQQQQQQqq...',
        'QQQQQQQqq....',
        '.QQQQQqq.....',
        '..QQQqq......',
        '...Qq........',
      ]),
      grid([
        '.........QQQQ',
        '.......QQQQQq',
        '....QQQQQQQqq',
        '..QQQQQQQQqq.',
        'QQQQQQQQQqq..',
        '.QQQQQQQqq...',
        '..QQQQQqq....',
        '..QQQQqq.....',
        '...QQqq......',
        '....q........',
      ]),
    ],
  },
  jesterHat: {
    layer: 'front',
    frames: [grid([
      'y.........y',
      'JJ...y...HH',
      '.JJ..H..HH.',
      '..JJJHHHH..',
      '.JJJJJHHHHH',
    ])],
  },
};

// --- Obstacles --------------------------------------------------------------

const CACTUS_SMALL = [
  '....ff....',
  '...OOOO...',
  '...OOOO...',
  '...OOOO.O.',
  '.O.OOoO.OO',
  'OO.OOOO.OO',
  'OO.OOOO.OO',
  'OO.OOOOOOO',
  'OO.OOOOOO.',
  'OOOOOOO...',
  '.OOOOOO...',
  '...OOOO...',
  '...OOOO...',
  '...OOOo...',
  '...OOOO...',
  '...OoOO...',
  '...OOOO...',
  '...OOOO...',
];

const CACTUS_LARGE = [
  '.....ffff.....',
  '.....OOOO.....',
  '....OOOOOO....',
  '....OOoOOO....',
  '....OOOOOO..O.',
  '....OOOOOO.OOO',
  '.O..OOOOoO.OOO',
  'OOO.OOOOOO.OOO',
  'OOO.OOOOOO.OOO',
  'OOO.OOoOOO.OOO',
  'OOO.OOOOOOOOOO',
  'OOO.OOOOOOOOO.',
  'OOOOOOOOOOOO..',
  '.OOOOOOOOO....',
  '....OOOOOO....',
  '....OOOOoO....',
  '....OOOOOO....',
  '....OOOOOO....',
  '....OoOOOO....',
  '....OOOOOO....',
  '....OOOOOO....',
  '....OOOOoO....',
  '....OOOOOO....',
  '....OOOOOO....',
  '....OOOOOO....',
];

const BIRD_UP = [
  '.......BB',
  '.......BBB',
  '.......BBBB',
  '...BB..BBBBB',
  '..BeBB.BBBBBB',
  'BBBBBBBBBBBBBBBB',
  '....BBBBBBBBBBBBBBB',
  '.....BBBBBBBBBBBBB',
  '......BBBBBBBBB',
  '', '', '', '',
];

const BIRD_DOWN = [
  '', '', '',
  '...BB',
  '..BeBB',
  'BBBBBBBBBBBBBBBB',
  '....BBBBBBBBBBBBBBB',
  '.....BBBBBBBBBBBBB',
  '.......BBBBBB',
  '.......BBBBB',
  '.......BBBB',
  '.......BBB',
  '.......BB',
];

const PUMPKIN_SMALL = [
  '.....n.....',
  '....nn.....',
  '..PPPPPPP..',
  '.PPPPPPPPP.',
  'PPFPPPPPFPP',
  'PPFFPPPFFPP',
  'PPPPPPPPPPP',
  'PPFPFPFPFPP',
  'PPPFFFFFPPP',
  '.PPPPPPPPP.',
];

const PUMPKIN_LARGE = [
  '.......nn......',
  '......nn.......',
  '...PPPPPPPPP...',
  '..PPPPPPPPPPP..',
  '.PPPPPPPPPPPPP.',
  'PPPFFPPPPPFFPPP',
  'PPPFFFPPPFFFPPP',
  'PPPPPPPPPPPPPPP',
  'PPPPPPPFPPPPPPP',
  'PPFPPPPPPPPPFPP',
  'PPPFFPFPFPFFPPP',
  '.PPPFFFFFFFPPP.',
  '..PPPPPPPPPPP..',
];

const TOMBSTONE = [
  '...TTTT...',
  '.TTTTTTTT.',
  'TTTTTTTTTT',
  'TTTTEETTTT',
  'TTTEEEETTT',
  'TTTTEETTTT',
  'TTTTEETTTT',
  'TTTTTTTTTT',
  'TTETTTTETT',
  'TTTTTTTTTT',
  'TTTTTETTTT',
  'TTTTTTTTTT',
  'TETTTTTTTT',
  'TTTTTTTTET',
  'TTTTTTTTTT',
  'TTTTTTTTTT',
];

const BAT_UP = [
  'A..............A',
  'AA............AA',
  'AAA..A....A..AAA',
  'AAAA.AAAAAA.AAAA',
  '.AAAAAaAAaAAAAA.',
  '..AAAAAAAAAAAA..',
  '......AAAA......',
  '................',
];

const BAT_DOWN = [
  '................',
  '................',
  '.....A....A.....',
  '.....AAAAAA.....',
  '..AAAAaAAaAAAA..',
  '.AAAAAAAAAAAAAA.',
  'AAA...AAAA...AAA',
  'A..............A',
];

// --- Scenery ----------------------------------------------------------------

const CLOUD = [
  '...........cccc.........',
  '.........cckkkkcc.......',
  '....cccccckkkkkkkc......',
  '...ckkkkkkkkkkkkkkccc...',
  '.cckkkkkkkkkkkkkkkkkkcc.',
  'ckkkkkkkkkkkkkkkkkkkkkkc',
  'cccccccccccccccccccccccc',
];

const STAR = ['.s.', 'sss', '.s.'];
const STAR_SMALL = ['s'];

/** Deterministic RNG so generated art is the same on every load. */
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function disc(r, ch, cut) {
  const size = r * 2 + 1;
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const inside = (x - r) ** 2 + (y - r) ** 2 <= r * r + r * 0.6;
      const cutout = cut && (x - r - cut.dx) ** 2 + (y - r - cut.dy) ** 2 <= cut.r ** 2;
      row += inside && !cutout ? ch : '.';
    }
    rows.push(row);
  }
  return rows;
}

/** A scrolling strip of ground: a line with occasional bumps and pebbles. */
function groundTile(width = 300) {
  const rnd = seeded(7);
  const rows = Array.from({ length: 5 }, () => Array(width).fill('.'));
  rows[1].fill('G');
  for (let x = 4; x < width - 10; x++) {
    if (rnd() < 0.02) {
      const len = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < len; i++) rows[0][x + i] = 'G';
      for (let i = 1; i < len - 1; i++) rows[1][x + i] = '.';
      x += len + 6;
    }
  }
  for (let r = 2; r < 5; r++) {
    for (let x = 0; x < width; x++) {
      if (rnd() < 0.035 - r * 0.005) {
        rows[r][x] = 'd';
        if (rnd() < 0.4 && x + 1 < width) rows[r][x + 1] = 'd';
      }
    }
  }
  return rows.map((r) => r.join(''));
}

/** City silhouette with lit windows, used by themes with `decor.skyline`. */
function skylineTile(width = 300, height = 32) {
  const rnd = seeded(42);
  const rows = Array.from({ length: height }, () => Array(width).fill('.'));
  let x = 0;
  while (x < width) {
    const w = 10 + Math.floor(rnd() * 14);
    const h = 8 + Math.floor(rnd() * (height - 8));
    for (let bx = x; bx < Math.min(x + w, width); bx++) {
      for (let y = height - h; y < height; y++) {
        const lit = (bx - x) % 3 === 1 && (y - (height - h)) % 3 === 2 && rnd() < 0.4;
        rows[y][bx] = lit ? 'W' : 'L';
      }
    }
    x += w + Math.floor(rnd() * 3);
  }
  return rows.map((r) => r.join(''));
}

export const ART = {
  cactusSmall: grid(CACTUS_SMALL, 'cactusSmall'),
  cactusLarge: grid(CACTUS_LARGE, 'cactusLarge'),
  birdUp: grid(BIRD_UP, 'birdUp'),
  birdDown: grid(BIRD_DOWN, 'birdDown'),
  pumpkinSmall: grid(PUMPKIN_SMALL, 'pumpkinSmall'),
  pumpkinLarge: grid(PUMPKIN_LARGE, 'pumpkinLarge'),
  tombstone: grid(TOMBSTONE, 'tombstone'),
  batUp: grid(BAT_UP, 'batUp'),
  batDown: grid(BAT_DOWN, 'batDown'),
  cloud: grid(CLOUD, 'cloud'),
  star: grid(STAR),
  starSmall: grid(STAR_SMALL),
  moon: grid(disc(7, 'M', { dx: 4, dy: -3, r: 6 })),
  sun: grid(disc(9, 'U')),
  ground: grid(groundTile()),
  skyline: grid(skylineTile()),
};
