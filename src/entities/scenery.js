import { CONFIG } from '../config.js';
import { artSize, drawSprite } from '../sprites.js';
import { seeded } from '../art.js';

const FRAME_MS = 1000 / 60;
const { width: W, groundY } = CONFIG;
const C = CONFIG.clouds;

const rand = (min, max) => min + Math.random() * (max - min);

/** Everything behind the obstacles: sky decorations, clouds and the ground. */
export class Scenery {
  constructor() {
    const rnd = seeded(3);
    this.stars = Array.from({ length: 14 }, () => ({
      x: rnd() * W,
      y: 8 + rnd() * 70,
      big: rnd() < 0.35,
    }));
    this.reset();
  }

  reset() {
    this.groundX = 0;
    this.skylineX = 0;
    this.imageX = 0;
    this.moonX = W - 120;
    this.starX = 0;
    this.clouds = [{ x: W * 0.7, y: 30 }, { x: W * 0.3, y: 50 }];
    this.nextCloudGap = rand(C.minGap, C.maxGap);
  }

  update(dt, speed) {
    const k = dt / FRAME_MS;
    const groundW = artSize('ground').w;
    this.groundX = (this.groundX + speed * k) % groundW;
    this.skylineX = (this.skylineX + speed * 0.15 * k) % artSize('skyline').w;
    this.imageX += speed * 0.1 * k;
    this.moonX -= 0.25 * k;
    if (this.moonX < -40) this.moonX = W + 20;
    this.starX = (this.starX + 0.3 * k) % W;

    const cloudW = artSize('cloud').w;
    for (const c of this.clouds) c.x -= speed * C.speedFactor * k;
    this.clouds = this.clouds.filter((c) => c.x > -cloudW);
    const last = this.clouds[this.clouds.length - 1];
    if (this.clouds.length < C.max && (!last || last.x < W - this.nextCloudGap)) {
      this.clouds.push({ x: W, y: rand(C.minY, C.maxY) });
      this.nextCloudGap = rand(C.minGap, C.maxGap);
    }
  }

  drawSky(ctx, palette, image) {
    const { sky } = palette;
    if (typeof sky === 'string') {
      ctx.fillStyle = sky;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
      g.addColorStop(0, sky.gradient[0]);
      g.addColorStop(1, sky.gradient[1]);
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, W, CONFIG.height);

    if (image?.complete && image.naturalWidth) this.drawImage(ctx, palette, image);
  }

  drawImage(ctx, palette, img) {
    ctx.save();
    ctx.globalAlpha = palette.imageOpacity;
    ctx.imageSmoothingEnabled = true;
    const H = CONFIG.height;
    const offset = palette.imageScroll ? this.imageX : 0;
    if (palette.imageMode === 'tile') {
      const h = H;
      const w = (img.naturalWidth / img.naturalHeight) * h;
      for (let x = -(offset % w); x < W; x += w) ctx.drawImage(img, x, 0, w, h);
    } else if (palette.imageMode === 'stretch') {
      ctx.drawImage(img, 0, 0, W, H);
    } else {
      // cover: fill the canvas, crop the rest; scroll by wrapping two copies
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const y = (H - h) / 2;
      if (palette.imageScroll) {
        for (let x = -(offset % w); x < W; x += w) ctx.drawImage(img, x, y, w, h);
      } else {
        ctx.drawImage(img, (W - w) / 2, y, w, h);
      }
    }
    ctx.restore();
  }

  draw(ctx, bank, palette) {
    const { decor, colors } = palette;
    const alpha = (a, fn) => {
      if (a <= 0.01) return;
      ctx.globalAlpha = Math.min(1, a);
      fn();
      ctx.globalAlpha = 1;
    };

    alpha(decor.stars, () => {
      for (const s of this.stars) {
        const x = (s.x - this.starX + W) % W;
        drawSprite(ctx, bank.get(s.big ? 'star' : 'starSmall'), x, s.y);
      }
    });
    alpha(decor.moon, () => drawSprite(ctx, bank.get('moon'), this.moonX, 14));
    alpha(decor.sun, () => drawSprite(ctx, bank.get('sun'), W - 90, 12));
    alpha(decor.skyline, () => {
      const s = bank.get('skyline');
      const sw = artSize('skyline').w;
      for (let x = -this.skylineX; x < W; x += sw) drawSprite(ctx, s, x, groundY - artSize('skyline').h);
    });
    alpha(decor.clouds, () => {
      const cloud = bank.get('cloud');
      for (const c of this.clouds) drawSprite(ctx, cloud, c.x, c.y);
    });

    if (colors.groundFill) {
      ctx.fillStyle = colors.groundFill;
      ctx.fillRect(0, groundY - 1, W, CONFIG.height - groundY + 1);
    }
    const ground = bank.get('ground');
    const gw = artSize('ground').w;
    for (let x = -this.groundX; x < W; x += gw) drawSprite(ctx, ground, x, groundY - 4);
  }
}
