import { CONFIG } from '../config.js';
import { artSize } from '../sprites.js';

const FRAME_MS = 1000 / 60;

/**
 * Obstacle types. Themes pick from these by id (see THEMES[..].obstacles).
 *
 *   frames        sprite names in ART, cycled every `frameMs` when > 1
 *   minGap        minimum free space after this obstacle (before speed scaling)
 *   minSpeed      only spawns once the game is at least this fast
 *   maxGroup      up to N copies side by side…
 *   multipleSpeed …once the game is faster than this
 *   altitudes     flying obstacles: distance from the ground to their bottom
 *                 edge. 4 = jump over it, 28 = duck under it, 56 = run under it
 *   speedOffset   flying obstacles move a little faster/slower than the ground
 */
export const OBSTACLE_TYPES = {
  cactusSmall: { frames: ['cactusSmall'], minGap: 120, minSpeed: 0, maxGroup: 3, multipleSpeed: 4 },
  cactusLarge: { frames: ['cactusLarge'], minGap: 120, minSpeed: 0, maxGroup: 3, multipleSpeed: 7 },
  bird: {
    frames: ['birdUp', 'birdDown'], frameMs: 160, minGap: 150, minSpeed: 8.5,
    altitudes: [4, 28, 56], speedOffset: 0.8,
  },
  pumpkinSmall: { frames: ['pumpkinSmall'], minGap: 120, minSpeed: 0, maxGroup: 3, multipleSpeed: 4 },
  pumpkinLarge: { frames: ['pumpkinLarge'], minGap: 120, minSpeed: 0, maxGroup: 2, multipleSpeed: 7 },
  tombstone: { frames: ['tombstone'], minGap: 120, minSpeed: 0, maxGroup: 2, multipleSpeed: 6 },
  bat: {
    frames: ['batUp', 'batDown'], frameMs: 120, minGap: 150, minSpeed: 8.5,
    altitudes: [4, 30, 58], speedOffset: 1,
  },
};

const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Obstacle {
  constructor(typeId, speed) {
    const type = OBSTACLE_TYPES[typeId];
    if (!type) throw new Error(`Unknown obstacle type "${typeId}"`);
    this.typeId = typeId;
    this.type = type;
    const { w, h } = artSize(type.frames[0]);
    this.partWidth = w;
    this.size = type.maxGroup > 1 && speed > type.multipleSpeed ? randInt(1, type.maxGroup) : 1;
    this.width = w * this.size;
    this.height = h;
    this.x = CONFIG.width;
    const altitude = type.altitudes ? pick(type.altitudes) : 0;
    this.y = CONFIG.groundY - altitude - h;
    this.speedOffset = type.speedOffset ? pick([-1, 1]) * type.speedOffset : 0;
    this.time = 0;

    const minGap = Math.round(this.width * speed * CONFIG.obstacles.gapCoefficient + type.minGap);
    this.gap = randInt(minGap, Math.round(minGap * CONFIG.obstacles.maxGapCoefficient));
  }

  update(dt, speed) {
    this.x -= (speed + this.speedOffset) * (dt / FRAME_MS);
    this.time += dt;
  }

  get frameName() {
    const { frames, frameMs } = this.type;
    return frames.length > 1 ? frames[Math.floor(this.time / frameMs) % frames.length] : frames[0];
  }

  /** Each copy in a group, as { name, x, y }. */
  *parts() {
    const name = this.frameName;
    for (let i = 0; i < this.size; i++) yield { name, x: this.x + i * this.partWidth, y: this.y };
  }

  get offscreen() {
    return this.x + this.width < 0;
  }
}

/** Spawns, moves and removes obstacles. */
export class ObstacleField {
  constructor() {
    this.reset();
  }

  reset() {
    this.list = [];
    this.history = [];
  }

  update(dt, speed, pool) {
    for (const o of this.list) o.update(dt, speed);
    this.list = this.list.filter((o) => !o.offscreen);

    const last = this.list[this.list.length - 1];
    if (!last || last.x + last.width + last.gap < CONFIG.width) this.spawn(speed, pool);
  }

  spawn(speed, pool) {
    const { maxDuplicates } = CONFIG.obstacles;
    const recent = this.history.slice(-maxDuplicates);
    const repeated = recent.length === maxDuplicates && recent.every((id) => id === recent[0]) ? recent[0] : null;
    const candidates = [...pool.ground, ...pool.air].filter(
      (id) => OBSTACLE_TYPES[id] && speed >= OBSTACLE_TYPES[id].minSpeed && id !== repeated,
    );
    if (!candidates.length) return;
    const id = pick(candidates);
    this.list.push(new Obstacle(id, speed));
    this.history.push(id);
    if (this.history.length > 10) this.history.shift();
  }
}
