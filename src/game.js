import { CONFIG } from './config.js';
import { Dino } from './entities/dino.js';
import { ObstacleField } from './entities/obstacles.js';
import { Scenery } from './entities/scenery.js';
import { SpriteBank, drawSprite, spritesCollide } from './sprites.js';
import { buildPalette, getTheme } from './themes.js';
import { drawPixelText, textWidth } from './font.js';
import { autopilot } from './bot.js';
import { PLACE_COLORS, PLACES } from './learn/numbers.js';

const FRAME_MS = 1000 / 60;
const { width: W, height: H, groundY } = CONFIG;

/**
 * The game loop and state machine.
 *
 * States: 'ready' → 'running' ⇄ 'paused' → 'over' → 'running' …
 *
 * Events (it's an EventTarget):
 *   statechange  detail: { state }
 *   gameover     detail: { score, highScore, recorded }
 *   milestone    detail: { score }   (every CONFIG.score.milestone points)
 *   palette      detail: palette     (theme/night colors changed — style the page)
 */
export class Game extends EventTarget {
  constructor(canvas, { settings, sound, highScore = 0, bot = false }) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;
    this.sound = sound;
    this.highScore = highScore;
    this.bot = bot;

    this.bank = new SpriteBank();
    this.dino = new Dino();
    this.obstacles = new ObstacleField();
    this.scenery = new Scenery();
    this.image = null;
    this.imageSrc = null;
    this.settingsVersion = 0;
    this.scale = 1;

    this.reset();
    this.state = 'ready';
    this.last = performance.now();
    this.resize(W);
    requestAnimationFrame(this.frame);
  }

  // --- public API -----------------------------------------------------------

  /** Call after changing anything in `settings` so colors/images refresh. */
  settingsChanged() {
    this.settingsVersion++;
    const src = this.effectiveCustom().image ?? getTheme(this.settings.theme).image ?? null;
    if (src !== this.imageSrc) {
      this.imageSrc = src;
      this.image = null;
      if (src) {
        const img = new Image();
        img.src = src;
        this.image = img;
      }
    }
    if (this.settings.invincible || this.settings.speed !== 1) this.cheated = true;
  }

  /** Sets the on-screen width (CSS pixels); height follows the 4:1 aspect. */
  resize(cssWidth) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${(cssWidth * H) / W}px`;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round((cssWidth * H * dpr) / W);
    this.scale = this.canvas.width / W;
  }

  pressJump() {
    this.sound.unlock();
    switch (this.state) {
      case 'ready':
        this.start();
        if (this.dino.jump()) this.sound.jump();
        break;
      case 'running':
        if (this.dino.jump()) this.sound.jump();
        break;
      case 'paused':
        this.resume();
        break;
      case 'over':
        if (performance.now() - this.crashedAt > CONFIG.restartDelayMs) this.restart();
        break;
    }
  }

  releaseJump() {
    this.dino.releaseJump();
  }

  pressDuck(on) {
    if (this.state === 'running') this.dino.setDuck(on);
    else this.dino.wantDuck = on;
  }

  togglePause() {
    if (this.state === 'running') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  pause() {
    if (this.state === 'running') this.setState('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.last = performance.now();
    this.setState('running');
  }

  restart() {
    this.reset();
    this.start();
  }

  get score() {
    return Math.floor(this.distance * CONFIG.score.coefficient);
  }

  // --- internals --------------------------------------------------------------

  reset() {
    const mult = this.settings.speed ?? 1;
    this.speed = CONFIG.speed.start * mult;
    this.distance = 0;
    this.runTime = 0;
    this.nightT = 0;
    this.flashUntil = 0;
    this.flashScore = 0;
    this.cheated = this.settings.invincible || mult !== 1;
    this.dino.reset();
    this.obstacles.reset();
    this.scenery.reset();
  }

  start() {
    this.dino.running = true;
    this.last = performance.now();
    this.setState('running');
  }

  setState(state) {
    this.state = state;
    this.dispatchEvent(new CustomEvent('statechange', { detail: { state } }));
  }

  frame = (now) => {
    const dt = Math.min(now - this.last, 50);
    this.last = now;
    if (this.state === 'running') this.update(dt, now);
    else if (this.state !== 'paused') this.dino.update(dt);
    this.updateNight(dt);
    this.render(now);
    requestAnimationFrame(this.frame);
  };

  update(dt, now) {
    const k = dt / FRAME_MS;
    const mult = this.settings.speed ?? 1;
    const before = this.score;

    this.runTime += dt;
    this.speed = Math.min(CONFIG.speed.max * mult, this.speed + CONFIG.speed.accel * mult * k);
    this.distance += this.speed * k;

    if (this.bot) autopilot(this);
    this.dino.update(dt);
    this.scenery.update(dt, this.speed);
    if (this.runTime > CONFIG.obstacles.clearTimeMs) {
      this.obstacles.update(dt, this.speed, this.palette.obstacles);
    }

    const after = this.score;
    const { milestone, flashMs, flashes } = CONFIG.score;
    if (Math.floor(after / milestone) > Math.floor(before / milestone)) {
      this.sound.milestone();
      this.flashScore = Math.floor(after / milestone) * milestone;
      this.flashUntil = now + flashMs * flashes * 2;
      this.dispatchEvent(new CustomEvent('milestone', { detail: { score: this.flashScore } }));
    }

    if (!this.settings.invincible && this.hitsObstacle()) this.crash(now);
  }

  hitsObstacle() {
    const d = this.dino;
    const sprite = this.bank.dino(d.frame);
    const dy = groundY - sprite.h * CONFIG.pixelSize + d.jumpY;
    for (const o of this.obstacles.list) {
      if (o.x > d.x + 80) break;
      for (const part of o.parts()) {
        if (spritesCollide(sprite, d.x, dy, this.bank.get(part.name), part.x, part.y)) return true;
      }
    }
    return false;
  }

  crash(now) {
    this.dino.crashed = true;
    this.dino.ducking = false;
    this.crashedAt = now;
    this.sound.crash();
    navigator.vibrate?.(150);
    const score = this.score;
    const recorded = !this.cheated;
    if (recorded && score > this.highScore) this.highScore = score;
    this.setState('over');
    this.dispatchEvent(new CustomEvent('gameover', { detail: { score, highScore: this.highScore, recorded } }));
  }

  updateNight(dt) {
    const theme = getTheme(this.settings.theme);
    const { every, length, fadeMs } = CONFIG.night;
    const s = this.score;
    const wantNight = !!theme.nightTheme && this.settings.dayNightCycle !== false && s >= every && s % every < length;
    const step = dt / fadeMs;
    this.nightT = wantNight ? Math.min(1, this.nightT + step) : Math.max(0, this.nightT - step);
  }

  /** The player's customizations with the background mode resolved. */
  effectiveCustom() {
    const c = this.settings.custom ?? {};
    return {
      ...c,
      sky: c.bgMode === 'color' ? c.sky : undefined,
      image: c.bgMode === 'image' && c.image ? c.image : undefined,
    };
  }

  /** Recomputed only when the theme, settings or (quantized) night fade change. */
  get palette() {
    const t = Math.round(this.nightT * 10) / 10;
    const key = `${this.settings.theme}|${t}|${this.settingsVersion}`;
    if (this._palette?.key !== key) {
      this._palette = buildPalette(this.settings.theme, t, this.effectiveCustom());
      this._palette.key = key;
      this.dispatchEvent(new CustomEvent('palette', { detail: this._palette }));
    }
    return this._palette;
  }

  render(now) {
    const ctx = this.ctx;
    const palette = this.palette;
    this.bank.use(palette);

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    this.scenery.drawSky(ctx, palette, this.image);
    this.scenery.draw(ctx, this.bank, palette);

    for (const o of this.obstacles.list) {
      for (const part of o.parts()) drawSprite(ctx, this.bank.get(part.name), part.x, part.y);
    }

    const d = this.dino;
    const sprite = this.bank.dino(d.frame);
    ctx.globalAlpha = palette.dinoAlpha;
    drawSprite(ctx, sprite, d.x, groundY - sprite.h * CONFIG.pixelSize + d.jumpY);
    ctx.globalAlpha = 1;

    this.drawScore(ctx, palette, now);
  }

  /** Colors each digit by place value (ones, tens, …); leading zeros keep the theme color. */
  digitColors(text, color) {
    if (!this.settings.learning?.coloredDigits) return color;
    const lead = text.length - String(Number(text)).length;
    return [...text].map((_, i) => (i < lead ? color : PLACE_COLORS[PLACES[text.length - 1 - i]] ?? color));
  }

  drawScore(ctx, palette, now) {
    const pad = (n) => String(n).padStart(CONFIG.score.digits, '0');
    const color = palette.colors.text;
    let shown = pad(this.score);
    if (now < this.flashUntil) {
      const blinkOn = Math.floor((this.flashUntil - now) / CONFIG.score.flashMs) % 2 === 0;
      shown = blinkOn ? pad(this.flashScore) : '';
    }
    const x = W - 10 - textWidth(pad(this.score));
    if (shown) drawPixelText(ctx, shown, x, 10, this.digitColors(shown, color));
    if (this.highScore > 0) {
      const hi = `HI ${pad(this.highScore)}`;
      ctx.globalAlpha = 0.75;
      drawPixelText(ctx, hi, x - 16 - textWidth(hi), 10, color);
      ctx.globalAlpha = 1;
    }
  }
}
