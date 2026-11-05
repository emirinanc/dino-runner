// P1: the pixel art is hand-edited text. These checks catch the typical slips:
// a ragged row, an unknown palette character, a missing accessory anchor, a
// frame of a different size (the dino would jump around while running).
import { describe, it, expect } from 'vitest';
import { CHARACTERS, DEFAULT_CHARACTER, getCharacter } from '../../src/characters.js';
import { ACCESSORIES, CHAR_COLORS, ART } from '../../src/art.js';
import { THEMES } from '../../src/themes.js';
import { STRINGS } from '../../src/i18n.js';

const STAND_FRAMES = ['stand', 'blink', 'runA', 'runB', 'dead'];
const DUCK_FRAMES = ['duckA', 'duckB'];
const characters = Object.entries(CHARACTERS);

describe.each(characters)('character %s', (id, c) => {
  it('has every frame the game draws', () => {
    expect(Object.keys(c.frames).sort()).toEqual([...STAND_FRAMES, ...DUCK_FRAMES].sort());
  });

  it('every frame grid is rectangular and uses known palette characters', () => {
    for (const [name, f] of Object.entries(c.frames)) {
      expect(f.rows, name).toHaveLength(f.h);
      for (const row of f.rows) {
        expect(row.length, `${name}: "${row}"`).toBe(f.w);
        for (const ch of row) expect(ch === '.' || ch in CHAR_COLORS, `${name}: unknown "${ch}"`).toBe(true);
      }
    }
  });

  it('frames of the same pose have the same size', () => {
    for (const frames of [STAND_FRAMES, DUCK_FRAMES]) {
      const sizes = new Set(frames.map((f) => `${c.frames[f].w}×${c.frames[f].h}`));
      expect([...sizes], frames.join(',')).toHaveLength(1);
    }
  });

  it('stands on the ground (bottom row has pixels) in every frame', () => {
    for (const [name, f] of Object.entries(c.frames)) expect(f.rows.at(-1), name).toMatch(/[^.]/);
  });

  it('each frame knows its pose', () => {
    for (const f of STAND_FRAMES) expect(c.frames[f].pose).toBe('stand');
    for (const f of DUCK_FRAMES) expect(c.frames[f].pose).toBe('duck');
  });

  it('the eye patterns fit inside the body', () => {
    for (const [pose, pos] of Object.entries(c.eye)) {
      const frame = c.frames[pose === 'duck' ? 'duckA' : 'stand'];
      for (const [kind, pattern] of Object.entries(c.eyes)) {
        expect(pos.x + pattern[0].length, `${pose}/${kind}`).toBeLessThanOrEqual(frame.w);
        expect(pos.y + pattern.length, `${pose}/${kind}`).toBeLessThanOrEqual(frame.h);
        for (const row of pattern) expect(row).toHaveLength(pattern[0].length);
      }
    }
  });

  it('blinking and crashing change only the eye', () => {
    const diff = (a, b) => a.rows.flatMap((r, y) => [...r].filter((ch, x) => ch !== b.rows[y][x])).length;
    const eyeArea = c.eyes.open.length * c.eyes.open[0].length;
    expect(diff(c.frames.stand, c.frames.blink)).toBeLessThanOrEqual(eyeArea);
    expect(diff(c.frames.stand, c.frames.dead)).toBeLessThanOrEqual(eyeArea);
    expect(diff(c.frames.stand, c.frames.blink)).toBeGreaterThan(0);
  });

  it('has an anchor for every accessory, in both poses', () => {
    for (const acc of Object.keys(ACCESSORIES)) {
      for (const pose of ['stand', 'duck']) {
        const a = c.anchors[acc]?.[pose];
        expect(a, `${acc}.${pose}`).toEqual({ x: expect.any(Number), y: expect.any(Number) });
      }
    }
  });

  it('has a translated name', () => {
    expect(STRINGS.en[c.name]).toBeTruthy();
    for (const [lang, strings] of Object.entries(STRINGS)) expect(strings[c.name], lang).toBeTruthy();
  });

  it('has a positive integer pixel size', () => {
    expect(Number.isInteger(c.px) && c.px > 0).toBe(true);
  });
});

describe('characters registry', () => {
  it('the default exists and unknown ids fall back to it', () => {
    expect(CHARACTERS[DEFAULT_CHARACTER]).toBeTruthy();
    expect(getCharacter('nope')).toBe(CHARACTERS[DEFAULT_CHARACTER]);
  });

  it('every accessory a theme uses exists', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      for (const acc of theme.accessories ?? []) expect(ACCESSORIES[acc], `${id}: ${acc}`).toBeTruthy();
    }
  });

  it('accessory and art grids are rectangular with known palette characters', () => {
    const grids = [
      ...Object.entries(ART),
      ...Object.entries(ACCESSORIES).flatMap(([id, a]) => a.frames.map((g, i) => [`${id}#${i}`, g])),
    ];
    for (const [name, g] of grids) {
      for (const row of g.rows) {
        expect(row.length, name).toBe(g.w);
        for (const ch of row) expect(ch === '.' || ch in CHAR_COLORS, `${name}: "${ch}"`).toBe(true);
      }
    }
  });
});
