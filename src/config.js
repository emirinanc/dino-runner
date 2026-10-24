// Core gameplay tuning.
//
// Distances are in "logical pixels": the game world is a 600×150 grid that is
// scaled up to whatever size the canvas is shown at. Velocities and
// accelerations are expressed per frame at 60 FPS; the loop scales them by the
// real frame time, so the game runs the same on 60 Hz and 120 Hz screens.

export const CONFIG = {
  width: 600,
  height: 150,
  groundY: 132, // the line everything stands on
  pixelSize: 2, // one art pixel = 2×2 logical pixels

  dino: {
    x: 40,
    gravity: 0.6,
    jumpVelocity: -10,
    minJumpHeight: 30, // a tapped jump still rises at least this high
    dropVelocity: -5, // upward velocity is capped to this when jump is released
    fastFallGravity: 3, // gravity multiplier while holding ↓ in the air
    runFrameMs: 100,
    duckFrameMs: 120,
    blinkEveryMs: [2000, 6000],
    blinkMs: 160,
  },

  speed: {
    start: 6,
    max: 13,
    accel: 0.001, // added to speed every frame
  },

  score: {
    coefficient: 0.025, // points per logical pixel travelled
    milestone: 100, // beep + flash every N points
    digits: 5,
    flashMs: 250,
    flashes: 3,
  },

  obstacles: {
    clearTimeMs: 3000, // obstacle-free run-up after starting
    gapCoefficient: 0.6, // bigger/faster obstacles get proportionally bigger gaps
    maxGapCoefficient: 1.5,
    maxDuplicates: 2, // never more than N of the same type in a row
  },

  clouds: {
    speedFactor: 0.2,
    minGap: 100,
    maxGap: 400,
    minY: 15,
    maxY: 65,
    max: 6,
  },

  // Themes with a `nightTheme` fade into it every `every` points for `length` points.
  night: {
    every: 700,
    length: 300,
    fadeMs: 1000,
  },

  restartDelayMs: 600, // ignore input right after crashing so you don't restart by accident

  // URL used in share links. null = the page's own address.
  shareUrl: null,
};
