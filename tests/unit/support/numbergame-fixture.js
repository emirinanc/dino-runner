// Builds a NumberGame on the real dialog markup from index.html (so renamed
// classes in the page and the module stay in sync), with recorded speech, a
// fake t() and deterministic randomness. Only for jsdom test files.
import { vi } from 'vitest';
import { NumberGame } from '../../../src/learn/numbergame.js';
import { readRepoFile, recordingSpeech, seedMath } from './fakes.js';

const page = new DOMParser().parseFromString(readRepoFile('index.html'), 'text/html');
const DIALOG_HTML = page.getElementById('dlg-numbers').outerHTML;

function polyfillDialog(dialog) {
  if (typeof dialog.showModal !== 'function') {
    dialog.showModal = () => dialog.setAttribute('open', '');
  }
  if (typeof dialog.close !== 'function' || !('open' in dialog)) {
    Object.defineProperty(dialog, 'open', { get: () => dialog.hasAttribute('open'), configurable: true });
    dialog.close = () => {
      if (!dialog.hasAttribute('open')) return;
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
  }
}

/** t() stand-in: "{n} of {total}" style strings become "n/total", other keys stay as keys. */
export const fakeT = (key, vars = {}) => (vars.total != null ? `${vars.n}/${vars.total}` : key);

export function makeNumberGame({ lang = 'tr', maxNumber = 10, mode, seed = 1 } = {}) {
  // reduced motion: the swap animation (Element.animate) isn't available in jsdom
  vi.stubGlobal('matchMedia', (q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
  seedMath(seed);
  document.body.innerHTML = DIALOG_HTML;
  const dialog = document.getElementById('dlg-numbers');
  polyfillDialog(dialog);
  const speech = recordingSpeech();
  const settings = { learning: { lang, maxNumber } };
  const onPlay = vi.fn();
  const sprites = () => [
    { name: 'a', src: 'data:image/png;base64,AAA', w: 20, h: 20 },
    { name: 'b', src: 'data:image/png;base64,BBB', w: 10, h: 24 },
  ];
  const game = new NumberGame(dialog, { speech, settings, t: fakeT, sprites, onPlay });
  if (mode) game.mode = mode;

  const $ = (sel) => dialog.querySelector(sel);
  const $$ = (sel) => [...dialog.querySelectorAll(sel)];
  const ui = {
    dialog, game, speech, settings, onPlay, $, $$,
    options: () => $$('.ng-option'),
    option: (value) => $$('.ng-option').find((b) => Number(b.textContent) === value),
    current: () => game.questions[game.index],
    wrongOption: () => $$('.ng-option').find((b) => Number(b.textContent) !== game.questions[game.index].answer),
    reward: () => $('[data-testid=ng-reward]').getAttribute('aria-label'),
    doneShown: () => !$('.ng-done').hidden,
    /** Opens the game on fixed questions instead of random ones. */
    openWith(questions) {
      vi.spyOn(game, 'makeQuestions').mockReturnValue(questions.map((q) => ({
        ...q, answer: q.kind === 'count' ? q.n : q.groups[0].n + q.groups[1].n,
      })));
      game.open();
    },
    pressSpace(target = document.body) {
      const e = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true });
      target.dispatchEvent(e);
      return e;
    },
  };
  return ui;
}
