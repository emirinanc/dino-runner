// Side game: counting and addition with pictures from the current theme.
//
// A round is 5 questions; every solved question earns a star. Tapping a
// picture counts it out loud ("bir, iki, üç…"), so the child can count before
// answering. Wrong answers just say what the tapped number was and let them
// try again: no penalties.

import { learnLang } from './numbers.js';

const ROUND = 5;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class NumberGame {
  /**
   * @param {HTMLDialogElement} dialog
   * @param {{ speech, settings, t, sprites: () => {name: string, src: string, w: number, h: number}[], onPlay: () => void }} deps
   *   `sprites` returns the pictures to count, as image data URLs.
   *   `onPlay` starts the dino game ("Back to the game" or Space on the final screen).
   */
  constructor(dialog, { speech, settings, t, sprites, onPlay }) {
    this.dialog = dialog;
    this.speech = speech;
    this.settings = settings;
    this.t = t;
    this.sprites = sprites;
    this.onPlay = onPlay;
    this.mode = 'mix';
    this.q = (sel) => dialog.querySelector(sel);

    for (const tab of dialog.querySelectorAll('[data-mode]')) {
      tab.addEventListener('click', () => {
        this.mode = tab.dataset.mode;
        this.newRound();
      });
    }
    this.q('[data-action=close]').addEventListener('click', () => dialog.close());
    this.q('[data-action=close-done]').addEventListener('click', () => this.play());
    // On the final screen, Space goes straight back to the dino game, wherever
    // the focus is. Listening on the document runs before the game's own
    // keyboard handler (on window), which must not see this key press.
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat || !dialog.open || this.q('.ng-done').hidden) return;
      e.preventDefault();
      e.stopPropagation();
      this.play();
    });
    this.q('[data-action=again]').addEventListener('click', () => this.newRound());
    this.q('[data-action=repeat]').addEventListener('click', () => this.askAloud());
    dialog.addEventListener('close', () => this.speech.cancel());
  }

  play() {
    this.dialog.close();
    this.onPlay?.();
  }

  get L() {
    return learnLang(this.settings.learning.lang);
  }

  get max() {
    return this.settings.learning.maxNumber ?? 10;
  }

  /** @param {number} [seed] e.g. the last score: its digits become the first questions */
  open(seed) {
    this.seed = seed;
    this.newRound();
    this.dialog.showModal();
  }

  newRound() {
    this.questions = this.makeQuestions(this.seed);
    this.seed = undefined; // only the first round uses the score
    this.index = 0;
    this.stars = 0;
    for (const tab of this.dialog.querySelectorAll('[data-mode]')) {
      tab.setAttribute('aria-pressed', String(tab.dataset.mode === this.mode));
    }
    this.q('.ng-done').hidden = true;
    this.q('.ng-play').hidden = false;
    this.show();
  }

  makeQuestions(seed) {
    const max = this.max;
    const kinds = { count: ['count'], add: ['add'], mix: ['count', 'add'] }[this.mode];
    const list = [];

    // Start with numbers from the score: 347 → count 3, count 4, 3 + 4 …
    if (seed) {
      const digits = String(seed).split('').map(Number).filter((d) => d > 0 && d <= max);
      if (kinds.includes('count')) for (const d of digits.slice(0, 2)) list.push({ kind: 'count', n: d });
      if (kinds.includes('add') && digits.length >= 2 && digits[0] + digits[1] <= max) {
        list.push({ kind: 'add', a: digits[0], b: digits[1] });
      }
    }

    while (list.length < ROUND) {
      const prev = list[list.length - 1];
      const kind = kinds.length > 1 && prev ? kinds.find((k) => k !== prev.kind) : pick(kinds);
      if (kind === 'count') {
        list.push({ kind, n: randInt(1, max) });
      } else {
        const a = randInt(1, max - 1);
        list.push({ kind, a, b: randInt(1, max - a) });
      }
    }
    return list.slice(0, ROUND).map((q) => ({ ...q, answer: q.kind === 'count' ? q.n : q.a + q.b }));
  }

  show() {
    const q = this.questions[this.index];
    this.counted = 0;
    this.solved = false;
    const sprite = pick(this.sprites());
    const L = this.L;

    this.renderStars();
    this.q('.ng-prompt').textContent = q.kind === 'count' ? L.howMany : L.howManyAll;

    const scene = this.q('.ng-scene');
    scene.replaceChildren();
    const groups = q.kind === 'count' ? [q.n] : [q.a, q.b];
    groups.forEach((count, gi) => {
      if (gi) scene.append(el('span', 'ng-op', '+'));
      const group = el('div', 'ng-group');
      for (let i = 0; i < count; i++) group.append(this.item(sprite));
      scene.append(group);
    });

    const eq = this.q('.ng-equation');
    eq.textContent = q.kind === 'add' ? `${q.a} + ${q.b} = ?` : '';
    eq.hidden = q.kind !== 'add';

    const options = this.q('.ng-options');
    options.replaceChildren();
    for (const value of this.options(q.answer)) {
      const btn = el('button', 'ng-option', String(value));
      btn.type = 'button';
      btn.addEventListener('click', () => this.answer(value, btn));
      options.append(btn);
    }

    this.askAloud();
  }

  item(sprite) {
    const btn = el('button', 'ng-item');
    btn.type = 'button';
    const img = el('img');
    img.src = sprite.src;
    img.alt = '';
    const scale = Math.max(2, Math.min(4, Math.round(64 / Math.max(sprite.w, sprite.h))));
    img.width = sprite.w * scale;
    img.height = sprite.h * scale;
    btn.append(img);
    btn.addEventListener('click', () => {
      if (btn.dataset.n || this.solved) return;
      this.counted++;
      btn.dataset.n = this.counted;
      btn.append(el('span', 'ng-badge', String(this.counted)));
      this.speech.say(this.L.words(this.counted), this.settings.learning.lang, { rate: 0.95 });
    });
    return btn;
  }

  /** The answer plus two nearby numbers, in order. */
  options(answer) {
    const limit = Math.max(this.max, answer + 2);
    const pool = [answer - 2, answer - 1, answer + 1, answer + 2].filter((n) => n >= 1 && n <= limit);
    const set = new Set([answer]);
    while (set.size < 3 && pool.length) set.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return [...set].sort((a, b) => a - b);
  }

  askAloud() {
    const q = this.questions[this.index];
    const L = this.L;
    const text = q.kind === 'count' ? L.howMany : L.addQuestion(L.words(q.a), L.words(q.b));
    this.speech.say(text, this.settings.learning.lang);
  }

  answer(value, btn) {
    if (this.solved) return;
    const q = this.questions[this.index];
    const L = this.L;
    const lang = this.settings.learning.lang;

    if (value !== q.answer) {
      btn.classList.remove('wrong');
      void btn.offsetWidth; // restart the shake animation
      btn.classList.add('wrong');
      this.speech.say(`${L.thisIs(L.words(value))} ${L.tryAgain}`, lang);
      return;
    }

    this.solved = true;
    btn.classList.add('right');
    this.stars++;
    this.renderStars();
    const sentence = q.kind === 'count' ? `${L.words(q.n)}!` : L.addResult(L.words(q.a), L.words(q.b), L.words(q.answer));
    const done = this.speech.say(`${pick(L.praise)} ${sentence}`, lang);
    const minWait = new Promise((r) => setTimeout(r, 1200));
    Promise.all([done, minWait]).then(() => {
      if (!this.dialog.open) return;
      this.index++;
      if (this.index < this.questions.length) this.show();
      else this.finish();
    });
  }

  finish() {
    this.q('.ng-play').hidden = true;
    const done = this.q('.ng-done');
    done.hidden = false;
    this.q('.ng-done-stars').textContent = '⭐'.repeat(this.stars);
    this.q('[data-action=close-done]').focus();
    this.speech.say(this.L.roundDone(this.L.words(this.stars)), this.settings.learning.lang);
  }

  renderStars() {
    this.q('.ng-stars').textContent = '★'.repeat(this.stars) + '☆'.repeat(ROUND - this.stars);
  }
}
