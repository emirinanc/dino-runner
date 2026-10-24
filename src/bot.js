// Optional autopilot (open the game with ?bot=1). Handy for attract screens
// and for testing themes without playing. It isn't perfect, on purpose.

import { CONFIG } from './config.js';

export function autopilot(game) {
  const { dino, obstacles, speed } = game;
  const next = obstacles.list.find((o) => o.x + o.width > dino.x);
  if (!next) {
    dino.setDuck(false);
    return;
  }
  const distance = next.x - (dino.x + 44);
  const bottom = next.y + next.height;
  const flyingHigh = bottom < CONFIG.groundY - 50; // passes over a standing dino
  const duckable = !flyingHigh && bottom < CONFIG.groundY - 26;

  if (flyingHigh) {
    dino.setDuck(false);
  } else if (duckable) {
    dino.setDuck(distance < speed * 18);
  } else if (distance < speed * 6 + next.width * 0.3 && distance > 0) {
    dino.setDuck(false);
    if (dino.jump()) game.sound.jump();
  }
}
