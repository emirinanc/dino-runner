// Playable characters, drawn as text grids like the rest of the art (see
// CHAR_COLORS in art.js: X body, b belly, S accent, w eye, p pupil, m mouth).
//
// A character has a standing and a ducking pose. Frames are built from the
// pose's body ("top") plus legs, and the eye is swapped for blinking and
// crashing. Each character also says:
//   px       game pixels per art pixel (the T-Rex is finer than the chunky art)
//   anchors  where each theme accessory (bow, mask, cape, jester hat) goes, per
//            pose, in the character's art pixels; accessories are drawn at 2
//            game pixels per art pixel whatever the character's `px`
//
// Add a character by adding an entry to CHARACTERS: it appears in the picker.

import { grid } from './art.js';

/** Stamps an eye pattern into the rows at (x, y). */
function withEye(rows, { x, y }, pattern) {
  const w = pattern[0].length;
  return rows.map((row, r) => {
    const er = r - y;
    if (er < 0 || er >= pattern.length) return row;
    const padded = row.padEnd(x + w, '.');
    return padded.slice(0, x) + pattern[er] + padded.slice(x + w);
  });
}

/** Doubles every art pixel, for drawing at half resolution. */
const doubled = (rows) => rows.flatMap((r) => {
  const wide = [...r].map((c) => c + c).join('');
  return [wide, wide];
});

function frames(id, c) {
  const make = (name, pose, legs, eye = 'open', anim = 0) => {
    const top = pose === 'duck' ? c.duck : c.stand;
    return { ...grid(withEye([...top, ...legs], c.eye[pose], c.eyes[eye]), `${id}:${name}`), pose, anim };
  };
  // `anim` picks which accessory frame to show (e.g. the cape flutters).
  return {
    stand: make('stand', 'stand', c.legs.stand),
    blink: make('blink', 'stand', c.legs.stand, 'blink'),
    runA: make('runA', 'stand', c.legs.runA, 'open', 0),
    runB: make('runB', 'stand', c.legs.runB, 'open', 1),
    duckA: make('duckA', 'duck', c.duckLegs.A, 'open', 0),
    duckB: make('duckB', 'duck', c.duckLegs.B, 'open', 1),
    dead: make('dead', 'stand', c.legs.stand, 'dead'),
  };
}

// --- T-Rex --------------------------------------------------------------------
// The dinosaur of Chromium's offline game (© The Chromium Authors, BSD license,
// see THIRD_PARTY_NOTICES.md). Standing: 40×43 at 1 game pixel per art pixel.

const TREX = {
  px: 1,
  stand: [
    '......................XXXXXXXXXXXXXXXX..',
    '......................XXXXXXXXXXXXXXXX..',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXXXXXXXXXXXX',
    '....................XXXXXXXXXX..........',
    '....................XXXXXXXXXX..........',
    '....................XXXXXXXXXXXXXXXX....',
    '....................XXXXXXXXXXXXXXXX....',
    'XX................XXXXXXXXXX............',
    'XX................XXXXXXXXXX............',
    'XX.............XXXXXXXXXXXXX............',
    'XX.............XXXXXXXXXXXXX............',
    'XXXX........XXXXXXXXXXXXXXXXXXXX........',
    'XXXX........XXXXXXXXXXXXXXXXXXXX........',
    'XXXXXX....XXXXXXXXXXXXXXXXXX..XX........',
    'XXXXXX....XXXXXXXXXXXXXXXXXX..XX........',
    'XXXXXXXXXXXXXXXXXXbbbbbbbbXX............',
    'XXXXXXXXXXXXXXXXXXbbbbbbbbXX............',
    'XXXXXXXXXXXXXXXXXXbbbbbbbbXX............',
    'XXXXXXXXXXXXXXXXXXbbbbbbbbXX............',
    '..XXXXXXXXXXXXXXbbbbbbbbXXXX............',
    '..XXXXXXXXXXXXXXbbbbbbbbXX..............',
    '....XXXXXXXXXXbbbbbbbbXXXX..............',
    '....XXXXXXXXXXbbbbbbbbXXXX..............',
    '......XXXXXXbbbbbbbbXXXX................',
    '......XXXXXXbbbbbbbbXXXX................',
    '........XXXXXXXXXXXXXX..................',
    '........XXXXXXXXXXXXXX..................',
  ],
  legs: {
    stand: [
      '..........XXXXXX..XXXX',
      '..........XXXXXX..XXXX',
      '..........XXXX......XX',
      '..........XXXX......XX',
      '..........XX........XX',
      '..........XX........XX',
      '..........XXXX......XXXX',
      '..........XXXX......XXXX',
    ],
    runA: [ // back leg lifted
      '..........XXXXXX..XXXX',
      '..........XXXXXX..XXXX',
      '..........XXXX......XX',
      '..........XXXX......XX',
      '............XXXX....XX',
      '............XXXX....XX',
      '....................XXXX',
      '....................XXXX',
    ],
    runB: [ // front leg lifted
      '..........XXXXXX..XXXX',
      '..........XXXXXX..XXXX',
      '..........XXXX......XXXX',
      '..........XXXX......XXXX',
      '..........XX',
      '..........XX',
      '..........XXXX',
      '..........XXXX',
    ],
  },
  // Ducking: 56×24, the head stretched forward at body height.
  duck: doubled([
    '...................XXXXXXXX.',
    'XX.......XXXXXXXXXXXXXXXXXXX',
    'XXX...XXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '.XXXXXXXXXXbbbbbbXXXXXXXXXXX',
    '..XXXXXXXXbbbbbbbXXXXX......',
    '...XXXXXXbbbbbbbXXXXXXXXXX..',
    '....XXXXXXXXXXXXXXXXX.X.....',
    '......XXXXXXXXXXXXX.........',
  ]),
  duckLegs: {
    A: doubled([
      '.......XXX....XX',
      '.......XX......XX',
      '.......XXX',
    ]),
    B: doubled([
      '.......XXX....XX',
      '........XX....XX',
      '..............XXX',
    ]),
  },
  // The eye is a 2×2 hole (eye color) in the top-right of a 3×3 patch.
  eye: { stand: { x: 23, y: 2 }, duck: { x: 39, y: 1 } },
  eyes: {
    open: ['XXX', 'Xww', 'Xww'],
    blink: ['XXX', 'XXX', 'XXX'],
    dead: ['www', 'wpw', 'www'],
  },
  anchors: {
    bow: { stand: { x: 23, y: -4 }, duck: { x: 39, y: -4 } },
    mask: { stand: { x: 20, y: 2 }, duck: { x: 36, y: 2 } },
    cape: { stand: { x: -6, y: 13 }, duck: { x: -10, y: -4 } },
    jesterHat: { stand: { x: 19, y: -8 }, duck: { x: 35, y: -8 } },
  },
};

// --- Chubby -------------------------------------------------------------------
// The original Dino Runner dino: rounded head, back plates, a smile.
// Standing: 22×23 at 2 game pixels per art pixel.

const CHUBBY = {
  px: 2,
  stand: [
    '...........XXXXXX.....',
    '.......S.XXXXXXXXXX...',
    '......SSXXXXXXXXXXXX..',
    '.......XXXXXXXXXXXXXX.',
    '.....SXXXXXXXXXXXXXXXX',
    '....SSXXXXXXXXXXXXXXXX',
    '.....XXXXXXXXXXXXXXXXX',
    '...S.XXXXXXXXXXXmmmmX.',
    '..SSXXXXXXXXXXXXXXXX..',
    '.S.XXXXXXXXXXXXXXX....',
    'SSXXXXXXXbbbbbXXXX....',
    '..XXXXXXbbbbbbbXXX....',
    '..XXXXXXbbbbbbbX.XX...',
    'X.XXXXXXbbbbbbbX..X...',
    'XXXXXXXXbbbbbbX.......',
    '.XXXXXXXXbbbbX........',
    '...XXXXXXXXXX.........',
    '....XXXXXXXX..........',
    '.....XXXXXX...........',
  ],
  legs: {
    stand: [
      '.....XX..XX',
      '.....X....X',
      '.....X....X',
      '.....XX...XX',
    ],
    runA: [
      '.....XX..XX',
      '.....X....XXX',
      '.....X',
      '.....XX',
    ],
    runB: [
      '.....XX..XX',
      '....XXX...X',
      '..........X',
      '..........XX',
    ],
  },
  // Ducking: 30×12
  duck: [
    '....S...S...S.....XXXXXXX.....',
    '...SSS.SSS.SSS..XXXXXXXXXXX...',
    '...XXXXXXXXXXXXXXXXXXXXXXXXXX.',
    'X.XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXbbbbbbbXXXXXXmmmmX.',
    '.XXXXXXXXbbbbbbbbbXXXXXXXXXX..',
    '..XXXXXXXbbbbbbbbXXXXXXXXX....',
    '....XXXXXXXXXXXXXXX.XX........',
  ],
  duckLegs: {
    A: [
      '.....XX..XX',
      '.....X....XXX',
      '.....XX',
    ],
    B: [
      '.....XX..XX',
      '....XXX...X',
      '..........XX',
    ],
  },
  eye: { stand: { x: 14, y: 3 }, duck: { x: 21, y: 1 } },
  eyes: {
    open: ['www', 'wwp', 'wpp'],
    blink: ['XXX', 'XXX', 'ppp'],
    dead: ['pwp', 'wpw', 'pwp'],
  },
  anchors: {
    bow: { stand: { x: 10, y: -2 }, duck: { x: 17, y: -2 } },
    mask: { stand: { x: 8, y: 3 }, duck: { x: 16, y: 1 } },
    cape: { stand: { x: -2, y: 6 }, duck: { x: -6, y: 1 } },
    jesterHat: { stand: { x: 10, y: -5 }, duck: { x: 17, y: -5 } },
  },
};

// `name` is an i18n key (src/i18n.js).
export const CHARACTERS = {
  trex: { name: 'charTrex', ...TREX },
  chubby: { name: 'charChubby', ...CHUBBY },
};
for (const [id, c] of Object.entries(CHARACTERS)) c.frames = frames(id, c);

export const DEFAULT_CHARACTER = 'trex';

export function getCharacter(id) {
  return CHARACTERS[id] ?? CHARACTERS[DEFAULT_CHARACTER];
}
