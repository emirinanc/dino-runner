// Turns the text grids from art.js into small canvases (one per palette) and
// provides pixel-perfect collision between sprites.

import { CONFIG } from './config.js';
import { ART, CHAR_COLORS, ACCESSORIES } from './art.js';
import { getCharacter, DEFAULT_CHARACTER } from './characters.js';

const P = CONFIG.pixelSize;

/**
 * Paints a grid at (ox, oy), each art pixel as a k×k block. `keep(x, y)` is
 * asked for every canvas pixel painted, relative to (ox, oy).
 */
function paint(ctx, g, colors, ox, oy, keep, k = 1) {
  for (let y = 0; y < g.h; y++) {
    const row = g.rows[y];
    for (let x = 0; x < g.w; x++) {
      const key = CHAR_COLORS[row[x]];
      const color = key && colors[key];
      if (!color) continue;
      ctx.fillStyle = color;
      if (!keep) {
        ctx.fillRect(ox + x * k, oy + y * k, k, k);
        continue;
      }
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) if (keep(x * k + dx, y * k + dy)) ctx.fillRect(ox + x * k + dx, oy + y * k + dy, 1, 1);
      }
    }
  }
}

function maskOf(g) {
  const mask = new Uint8Array(g.w * g.h);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) mask[y * g.w + x] = CHAR_COLORS[g.rows[y][x]] ? 1 : 0;
  }
  return mask;
}

function canvasOf(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  return canvas;
}

/**
 * A sprite is a pre-rendered canvas at 1 canvas pixel per art pixel, drawn at
 * `px` game pixels per canvas pixel. `w`/`h`/`mask` describe the collidable
 * grid; `ox`/`oy` offset the drawing (in game pixels) when decorations stick
 * out of it.
 */
function makeSprite(g, colors) {
  const canvas = canvasOf(g.w, g.h);
  paint(canvas.getContext('2d'), g, colors, 0, 0);
  return { canvas, w: g.w, h: g.h, px: P, ox: 0, oy: 0, mask: maskOf(g) };
}

function makeDino(character, frame, colors, accessoryIds) {
  const base = character.frames[frame];
  const k = P / character.px; // accessories are drawn at P game pixels per art pixel
  const layers = [];
  let minX = 0, minY = 0, maxX = base.w, maxY = base.h;
  for (const id of accessoryIds) {
    const acc = ACCESSORIES[id];
    const pos = character.anchors[id]?.[base.pose];
    if (!acc || !pos) continue;
    const g = acc.frames[base.anim % acc.frames.length];
    layers.push({ acc, g, pos });
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + g.w * k);
    maxY = Math.max(maxY, pos.y + g.h * k);
  }

  const canvas = canvasOf(maxX - minX, maxY - minY);
  const ctx = canvas.getContext('2d');
  const isBody = (x, y) => 'XS'.includes(base.rows[y]?.[x] ?? '.');
  const draw = (layer) => {
    for (const { acc, g, pos } of layers) {
      if ((acc.layer ?? 'front') !== layer) continue;
      const keep = acc.onlyOnBody ? (x, y) => isBody(pos.x + x, pos.y + y) : null;
      paint(ctx, g, colors, pos.x - minX, pos.y - minY, keep, k);
    }
  };
  draw('back');
  paint(ctx, base, colors, -minX, -minY);
  draw('front');

  const px = character.px;
  return { canvas, w: base.w, h: base.h, px, ox: minX * px, oy: minY * px, mask: maskOf(base) };
}

/**
 * Caches rendered sprites per palette. Call use(palette) before get()/dino().
 * `character` is the dino drawn by dino() (see characters.js).
 */
export class SpriteBank {
  constructor() {
    this.byPalette = new Map();
    this.cache = null;
    this.palette = null;
    this.character = DEFAULT_CHARACTER;
  }

  use(palette) {
    if (this.palette?.key === palette.key) return;
    let cache = this.byPalette.get(palette.key);
    if (!cache) {
      if (this.byPalette.size > 24) this.byPalette.clear();
      cache = new Map();
      this.byPalette.set(palette.key, cache);
    }
    this.cache = cache;
    this.palette = palette;
  }

  get(name) {
    let s = this.cache.get(name);
    if (!s) {
      const g = ART[name];
      if (!g) throw new Error(`Unknown sprite "${name}"`);
      s = makeSprite(g, this.palette.colors);
      this.cache.set(name, s);
    }
    return s;
  }

  dino(frame, characterId = this.character) {
    const key = `dino:${characterId}:${frame}`;
    let s = this.cache.get(key);
    if (!s) {
      s = makeDino(getCharacter(characterId), frame, this.palette.colors, this.palette.accessories);
      this.cache.set(key, s);
    }
    return s;
  }
}

/** Size of an art grid in game pixels (no palette needed). */
export function artSize(name) {
  const g = ART[name];
  return { w: g.w * P, h: g.h * P };
}

export function drawSprite(ctx, s, x, y) {
  ctx.drawImage(s.canvas, Math.round(x + s.ox), Math.round(y + s.oy), s.canvas.width * s.px, s.canvas.height * s.px);
}

/** Pixel-perfect overlap test between two sprites placed at (ax, ay) and (bx, by). */
export function spritesCollide(a, ax, ay, b, bx, by) {
  const left = Math.max(ax, bx);
  const right = Math.min(ax + a.w * a.px, bx + b.w * b.px);
  const top = Math.max(ay, by);
  const bottom = Math.min(ay + a.h * a.px, by + b.h * b.px);
  if (left >= right || top >= bottom) return false;

  for (let y = Math.floor(top) + 0.5; y < bottom; y += 1) {
    const av = Math.floor((y - ay) / a.px);
    const bv = Math.floor((y - by) / b.px);
    if (av < 0 || bv < 0 || av >= a.h || bv >= b.h) continue;
    for (let x = Math.floor(left) + 0.5; x < right; x += 1) {
      const au = Math.floor((x - ax) / a.px);
      const bu = Math.floor((x - bx) / b.px);
      if (au < 0 || bu < 0 || au >= a.w || bu >= b.w) continue;
      if (a.mask[av * a.w + au] && b.mask[bv * b.w + bu]) return true;
    }
  }
  return false;
}
