// Turns the text grids from art.js into small canvases (one per palette) and
// provides pixel-perfect collision between sprites.

import { CONFIG } from './config.js';
import { ART, CHAR_COLORS, DINO_FRAMES, ACCESSORIES } from './art.js';

const P = CONFIG.pixelSize;

function paint(ctx, g, colors, ox, oy, keep) {
  for (let y = 0; y < g.h; y++) {
    const row = g.rows[y];
    for (let x = 0; x < g.w; x++) {
      const key = CHAR_COLORS[row[x]];
      const color = key && colors[key];
      if (!color || (keep && !keep(x, y))) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
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
 * A sprite is a pre-rendered canvas at 1 canvas pixel per art pixel.
 * `w`/`h`/`mask` describe the collidable grid; `ox`/`oy` offset the drawing
 * (in logical pixels) when decorations stick out of it.
 */
function makeSprite(g, colors) {
  const canvas = canvasOf(g.w, g.h);
  paint(canvas.getContext('2d'), g, colors, 0, 0);
  return { canvas, w: g.w, h: g.h, ox: 0, oy: 0, mask: maskOf(g) };
}

function makeDino(frame, colors, accessoryIds) {
  const base = DINO_FRAMES[frame];
  const layers = [];
  let minX = 0, minY = 0, maxX = base.w, maxY = base.h;
  for (const id of accessoryIds) {
    const acc = ACCESSORIES[id];
    const pos = acc?.poses[base.pose];
    if (!pos) continue;
    const g = acc.frames[base.anim % acc.frames.length];
    layers.push({ acc, g, pos });
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + g.w);
    maxY = Math.max(maxY, pos.y + g.h);
  }

  const canvas = canvasOf(maxX - minX, maxY - minY);
  const ctx = canvas.getContext('2d');
  const isBody = (x, y) => 'XS'.includes(base.rows[y]?.[x] ?? '.');
  const draw = (layer) => {
    for (const { acc, g, pos } of layers) {
      if ((acc.layer ?? 'front') !== layer) continue;
      const keep = acc.onlyOnBody ? (x, y) => isBody(pos.x + x, pos.y + y) : null;
      paint(ctx, g, colors, pos.x - minX, pos.y - minY, keep);
    }
  };
  draw('back');
  paint(ctx, base, colors, -minX, -minY);
  draw('front');

  return { canvas, w: base.w, h: base.h, ox: minX * P, oy: minY * P, mask: maskOf(base) };
}

/** Caches rendered sprites per palette. Call use(palette) before get()/dino(). */
export class SpriteBank {
  constructor() {
    this.byPalette = new Map();
    this.cache = null;
    this.palette = null;
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

  dino(frame) {
    const key = `dino:${frame}`;
    let s = this.cache.get(key);
    if (!s) {
      s = makeDino(frame, this.palette.colors, this.palette.accessories);
      this.cache.set(key, s);
    }
    return s;
  }
}

/** Size of an art grid in logical pixels (no palette needed). */
export function artSize(name) {
  const g = ART[name] ?? DINO_FRAMES[name];
  return { w: g.w * P, h: g.h * P };
}

export function drawSprite(ctx, s, x, y) {
  ctx.drawImage(s.canvas, Math.round(x + s.ox), Math.round(y + s.oy), s.canvas.width * P, s.canvas.height * P);
}

/** Pixel-perfect overlap test between two sprites placed at (ax, ay) and (bx, by). */
export function spritesCollide(a, ax, ay, b, bx, by) {
  const left = Math.max(ax, bx);
  const right = Math.min(ax + a.w * P, bx + b.w * P);
  const top = Math.max(ay, by);
  const bottom = Math.min(ay + a.h * P, by + b.h * P);
  if (left >= right || top >= bottom) return false;

  for (let y = Math.floor(top) + 0.5; y < bottom; y += 1) {
    const av = Math.floor((y - ay) / P);
    const bv = Math.floor((y - by) / P);
    if (av < 0 || bv < 0 || av >= a.h || bv >= b.h) continue;
    for (let x = Math.floor(left) + 0.5; x < right; x += 1) {
      const au = Math.floor((x - ax) / P);
      const bu = Math.floor((x - bx) / P);
      if (au < 0 || bu < 0 || au >= a.w || bu >= b.w) continue;
      if (a.mask[av * a.w + au] && b.mask[bv * b.w + bu]) return true;
    }
  }
  return false;
}
