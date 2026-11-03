// Keyboard, mouse and touch controls.
//
//   Space / ↑ / W     jump (hold for a higher jump)
//   ↓ / S             duck; in the air: fall faster
//   Enter             restart after game over
//   P / Esc           pause
//   Tap / click       jump; touch and hold the bottom part of the play area to duck

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK = new Set(['ArrowDown', 'KeyS']);

function typingIn(target) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable], dialog[open]');
}

// While a dialog is open the game ignores the keyboard, even when focus has
// fallen back to <body> (e.g. the focused button inside the dialog was hidden).
const dialogOpen = () => !!document.querySelector('dialog[open]');

export function bindInput(game, playArea) {
  window.addEventListener('keydown', (e) => {
    if (typingIn(e.target) || dialogOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (JUMP.has(e.code)) {
      e.preventDefault();
      if (!e.repeat) game.pressJump();
    } else if (DUCK.has(e.code)) {
      e.preventDefault();
      game.pressDuck(true);
    } else if (e.code === 'Enter' && game.state === 'over') {
      game.pressJump();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      game.togglePause();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (JUMP.has(e.code)) game.releaseJump();
    else if (DUCK.has(e.code)) game.pressDuck(false);
  });

  // Pointer: the bottom 35% of the play area ducks, everything else jumps.
  const active = new Map(); // pointerId → 'jump' | 'duck'
  playArea.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary && e.pointerType === 'mouse') return;
    if (e.target.closest('button, a, input, select, label')) return;
    e.preventDefault();
    const rect = playArea.getBoundingClientRect();
    const bottom = e.clientY > rect.top + rect.height * 0.65;
    if (bottom && game.state === 'running') {
      active.set(e.pointerId, 'duck');
      game.pressDuck(true);
    } else {
      active.set(e.pointerId, 'jump');
      game.pressJump();
    }
  });

  const end = (e) => {
    const action = active.get(e.pointerId);
    active.delete(e.pointerId);
    if (action === 'duck') game.pressDuck(false);
    else if (action === 'jump') game.releaseJump();
  };
  playArea.addEventListener('pointerup', end);
  playArea.addEventListener('pointercancel', end);
  playArea.addEventListener('contextmenu', (e) => e.preventDefault());

  // After a mouse/touch click on a button, drop its focus so Space jumps
  // instead of pressing that button again.
  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element && e.target.closest('button');
    if (btn && e.detail > 0 && !btn.closest('dialog')) btn.blur();
  });

  // Pause when the tab is hidden or the window loses focus.
  document.addEventListener('visibilitychange', () => document.hidden && game.pause());
  window.addEventListener('blur', () => game.pause());
}
