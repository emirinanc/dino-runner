// @vitest-environment jsdom
// P1: collisions are pixel-perfect against the art (there are no hitboxes),
// so the masks must follow the body exactly, and accessories (cape, hat…)
// must never make the dino crash.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteBank, spritesCollide } from '../../src/sprites.js';
import { CHARACTERS } from '../../src/characters.js';
import { THEMES, buildPalette } from '../../src/themes.js';
import { CONFIG } from '../../src/config.js';

// jsdom has no canvas; the bank only needs something to paint on.
beforeEach(() => {
  const ctx = { fillRect() {}, drawImage() {}, set fillStyle(_) {} };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
});

/** A sprite from a little text picture: '#' is solid. */
const sprite = (rows, px = 1) => ({
  w: rows[0].length, h: rows.length, px,
  mask: Uint8Array.from(rows.join('').split(''), (c) => (c === '#' ? 1 : 0)),
});
const dot = sprite(['#']);

describe('spritesCollide', () => {
  const L = sprite(['#.', '##']); // an L shape: the top-right pixel is empty

  it('detects overlapping solid pixels', () => {
    expect(spritesCollide(L, 0, 0, dot, 0, 0)).toBe(true);
    expect(spritesCollide(L, 0, 0, dot, 1, 1)).toBe(true);
  });

  it('ignores transparent pixels inside the bounding box', () => {
    expect(spritesCollide(L, 0, 0, dot, 1, 0)).toBe(false);
  });

  it('is false when the boxes do not overlap, including touching edges', () => {
    expect(spritesCollide(L, 0, 0, dot, 2, 0)).toBe(false);
    expect(spritesCollide(L, 0, 0, dot, 5, 5)).toBe(false);
  });

  it('is symmetric', () => {
    for (const [x, y] of [[0, 0], [1, 0], [1, 1], [2, 1]]) {
      expect(spritesCollide(L, 0, 0, dot, x, y)).toBe(spritesCollide(dot, x, y, L, 0, 0));
    }
  });

  it('scales by the sprite pixel size', () => {
    const big = sprite(['#.', '##'], 2); // 4×4 game pixels
    expect(spritesCollide(big, 0, 0, dot, 3, 0)).toBe(false); // inside the empty top-right 2×2
    expect(spritesCollide(big, 0, 0, dot, 3, 3)).toBe(true);
  });
});

describe('SpriteBank', () => {
  const bankFor = (themeId) => {
    const bank = new SpriteBank();
    const palette = buildPalette(themeId, 0, {});
    palette.key = themeId;
    bank.use(palette);
    return bank;
  };

  it('builds every frame of every character in every theme', () => {
    for (const themeId of Object.keys(THEMES)) {
      const bank = bankFor(themeId);
      for (const [id, c] of Object.entries(CHARACTERS)) {
        for (const frame of Object.keys(c.frames)) {
          const s = bank.dino(frame, id);
          expect(s.mask, `${themeId}/${id}/${frame}`).toHaveLength(s.w * s.h);
          expect(s.px).toBe(c.px);
        }
      }
    }
  });

  it('accessories never change the collision mask', () => {
    const plain = bankFor('classic');
    for (const themeId of Object.keys(THEMES).filter((t) => THEMES[t].accessories?.length)) {
      const dressed = bankFor(themeId);
      for (const id of Object.keys(CHARACTERS)) {
        for (const frame of ['stand', 'runA', 'duckA']) {
          const a = plain.dino(frame, id);
          const b = dressed.dino(frame, id);
          expect([b.w, b.h], `${themeId}/${id}/${frame}`).toEqual([a.w, a.h]);
          expect(Array.from(b.mask)).toEqual(Array.from(a.mask));
        }
      }
    }
  });

  it('the mask follows the art: solid body pixel collides, empty corner does not', () => {
    const bank = bankFor('classic');
    const trex = bank.dino('stand', 'trex');
    const rows = CHARACTERS.trex.frames.stand.rows;
    const y = CONFIG.groundY - trex.h * trex.px;
    expect(rows[0][0]).toBe('.');
    expect(spritesCollide(trex, 40, y, dot, 40, y)).toBe(false);
    const solidX = rows[0].indexOf('X');
    expect(spritesCollide(trex, 40, y, dot, 40 + solidX * trex.px, y)).toBe(true);
  });

  it('a cactus right in front of a standing dino collides, one further away does not', () => {
    const bank = bankFor('classic');
    const trex = bank.dino('stand', 'trex');
    const cactus = bank.get('cactusSmall');
    const ground = (s) => CONFIG.groundY - s.h * s.px;
    expect(spritesCollide(trex, 40, ground(trex), cactus, 50, ground(cactus))).toBe(true);
    expect(spritesCollide(trex, 40, ground(trex), cactus, 40 + trex.w * trex.px + 1, ground(cactus))).toBe(false);
    // jumping high enough clears it
    expect(spritesCollide(trex, 40, ground(trex) - 60, cactus, 50, ground(cactus))).toBe(false);
  });

  it('throws on an unknown sprite name', () => {
    expect(() => bankFor('classic').get('nope')).toThrow(/Unknown sprite/);
  });
});
