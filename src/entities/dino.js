import { CONFIG } from '../config.js';

const FRAME_MS = 1000 / 60;
const C = CONFIG.dino;

function nextBlink(now) {
  const [min, max] = C.blinkEveryMs;
  return now + min + Math.random() * (max - min);
}

/** The player. Physics only — drawing is done by the game with the sprite bank. */
export class Dino {
  constructor() {
    this.x = C.x;
    this.reset();
  }

  reset() {
    this.jumpY = 0; // offset above the ground (negative = up)
    this.vy = 0;
    this.jumping = false;
    this.reachedMin = false;
    this.releasedEarly = false;
    this.ducking = false;
    this.wantDuck = false;
    this.fastFall = false;
    this.crashed = false;
    this.running = false;
    this.time = 0;
    this.blinkAt = nextBlink(0);
  }

  /** @returns {boolean} whether a jump actually started */
  jump() {
    if (this.jumping || this.ducking || this.crashed) return false;
    this.jumping = true;
    this.vy = C.jumpVelocity;
    this.reachedMin = false;
    this.releasedEarly = false;
    return true;
  }

  releaseJump() {
    if (this.jumping) this.releasedEarly = true;
  }

  setDuck(on) {
    this.wantDuck = on;
    if (this.jumping) {
      this.fastFall = on;
      if (on && this.vy < 1) this.vy = 1;
    } else {
      this.ducking = on && this.running && !this.crashed;
    }
  }

  update(dt) {
    const k = dt / FRAME_MS;
    this.time += dt;

    if (this.jumping) {
      const g = C.gravity * (this.fastFall ? C.fastFallGravity : 1);
      this.jumpY += this.vy * k;
      this.vy += g * k;
      if (-this.jumpY >= C.minJumpHeight) this.reachedMin = true;
      if (this.releasedEarly && this.reachedMin && this.vy < C.dropVelocity) this.vy = C.dropVelocity;
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.vy = 0;
        this.jumping = false;
        this.fastFall = false;
        this.ducking = this.wantDuck;
      }
    }

    if (this.time > this.blinkAt + C.blinkMs) this.blinkAt = nextBlink(this.time);
  }

  /** Name of the frame in DINO_FRAMES to draw right now. */
  get frame() {
    if (this.crashed) return 'dead';
    if (!this.running) return this.time >= this.blinkAt ? 'blink' : 'stand';
    if (this.jumping) return 'stand';
    if (this.ducking) return Math.floor(this.time / C.duckFrameMs) % 2 ? 'duckB' : 'duckA';
    return Math.floor(this.time / C.runFrameMs) % 2 ? 'runB' : 'runA';
  }
}
