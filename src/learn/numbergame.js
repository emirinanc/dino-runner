// Side game: counting and addition with pictures from the current theme.
//
// A round is 5 questions; every solved question earns a mango. Tapping a
// picture counts it out loud ("bir, iki, üç…"), so the child can count before
// answering.
//
// A wrong answer doesn't just say "try again" (that rewards trying buttons
// until one works): the buttons lock and the game counts every picture out
// loud with the child, then asks again. The last number counted is the answer.
//
// Addition questions come in chains where each question changes the previous
// one in a single way, so patterns can be noticed before they're taught:
//   1 + 7 → 7 + 1   (swap: the same pictures change places, the sum stays)
//   7 + 1 → 7 + 2   (one more came: one more than 8)
//   7 + 2 → 6 + 2   … (one went away: one less than 9)
// The two groups keep their own picture and color, solved equations stay
// visible in a row, and the answer is followed by the rule ("Sekizden bir eksik!").

import { learnLang } from './numbers.js';

const ROUND = 5;
const GROUP_COLORS = ['#7048e8', '#f08c00']; // first and second group of an addition chain
const RELATION_MARKS = { swap: '⇄', less: '−1', more: '+1' };

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    dialog.addEventListener('close', () => {
      this.turn = null; // stops a count-together in progress
      this.speech.cancel();
    });
  }

  play() {
    this.dialog.close();
    this.onPlay?.();
  }

  get L() {
    return learnLang(this.settings.learning.lang);
  }

  get lang() {
    return this.settings.learning.lang;
  }

  get max() {
    return this.settings.learning.maxNumber ?? 10;
  }

  /** @param {number} [seed] e.g. the last score: its digits become the first questions */
  open(seed) {
    this.seed = seed;
    this.dialog.showModal(); // before rendering, so animations can measure the layout
    // what's said all the time: counting, praise, the count-together phrases
    const L = this.L;
    const numbers = Array.from({ length: this.max + 2 }, (_, i) => L.words(i + 1));
    this.speech.prefetch([...numbers, ...L.praise, L.countTogether, L.soHowMany, ...Object.values(L.relation)], this.lang);
    this.newRound();
  }

  newRound() {
    this.questions = this.makeQuestions(this.seed);
    this.seed = undefined; // only the first round uses the score
    this.index = 0;
    this.mangoes = 0;
    this.solvedAdds = [];
    for (const tab of this.dialog.querySelectorAll('[data-mode]')) {
      tab.setAttribute('aria-pressed', String(tab.dataset.mode === this.mode));
    }
    this.q('.ng-done').hidden = true;
    this.q('.ng-play').hidden = false;
    this.show();
  }

  // --- questions --------------------------------------------------------------

  makeQuestions(seed) {
    const digits = seed ? String(seed).split('').map(Number).filter((d) => d > 0 && d <= this.max) : [];
    const counts = (n) => {
      // Start with numbers from the score: 347 → count 3, count 4 …
      const list = digits.slice(0, n).map((d) => ({ kind: 'count', n: d }));
      while (list.length < n) list.push({ kind: 'count', n: randInt(1, this.max) });
      return list;
    };
    const list = {
      count: () => counts(ROUND),
      add: () => this.chain(ROUND, digits),
      mix: () => [...counts(2), ...this.chain(ROUND - 2, digits)],
    }[this.mode]();
    return list.map((q) => ({ ...q, answer: q.kind === 'count' ? q.n : q.groups[0].n + q.groups[1].n }));
  }

  /** A base addition, then questions that each change the previous one: swap, one less or one more. */
  chain(length, digits = []) {
    const max = this.max;
    let a, b;
    if (digits.length >= 2 && digits[0] !== digits[1] && digits[0] + digits[1] <= max) {
      [a, b] = digits;
    } else {
      // a small number and a bigger one (1 + 7), the pair that's most fun to swap
      a = randInt(1, Math.max(1, Math.floor(max / 3)));
      b = randInt(a + 1, Math.max(a + 1, max - a));
      if (Math.random() < 0.5) [a, b] = [b, a];
    }

    const list = [];
    let groups = [{ id: 0, n: a }, { id: 1, n: b }];
    for (let i = 0; i < length; i++) {
      let relation = null;
      if (i > 0) {
        const [left, right] = groups;
        const canSwap = left.n !== right.n;
        relation = i % 2 && canSwap ? 'swap' : this.neighbor(groups) ?? (canSwap ? 'swap' : null);
        if (!relation) break;
        groups = relation === 'swap'
          ? [right, left]
          : [left, { ...right, n: right.n + (relation === 'more' ? 1 : -1) }];
      }
      list.push({ kind: 'add', groups, relation });
    }
    // too small a limit to build a chain: fill up with counting
    while (list.length < length) list.push({ kind: 'count', n: randInt(1, max) });
    return list;
  }

  /** One more or one less in the right-hand group, whichever fits. */
  neighbor([left, right]) {
    const canLess = right.n > 1;
    const canMore = left.n + right.n < this.max;
    if (canLess && canMore) return Math.random() < 0.5 ? 'less' : 'more';
    return canMore ? 'more' : canLess ? 'less' : null;
  }

  // --- rendering --------------------------------------------------------------

  show() {
    const q = this.questions[this.index];
    const turn = (this.turn = {});
    this.counted = 0;
    this.solved = false;
    this.busy = false;
    const L = this.L;

    this.renderMangoes();
    this.renderHistory(q);
    this.q('.ng-prompt').textContent = q.kind === 'count' ? L.howMany : q.relation ? L.relation[q.relation] : L.howManyAll;

    const scene = this.q('.ng-scene');
    scene.replaceChildren();
    if (q.kind === 'count') {
      scene.append(this.group(q.n, pick(this.sprites())));
    } else {
      if (!q.relation) this.groupSprites = this.pickTwo();
      // A swap starts from the previous order, then the groups change places.
      const order = q.relation === 'swap' ? [q.groups[1], q.groups[0]] : q.groups;
      order.forEach((g, i) => {
        if (i) scene.append(el('span', 'ng-op', '+'));
        const isRight = g === q.groups[1];
        const group = this.group(g.n, this.groupSprites[g.id], GROUP_COLORS[g.id], {
          ghost: isRight && q.relation === 'less',
          fresh: isRight && q.relation === 'more',
        });
        group.dataset.id = g.id;
        scene.append(group);
      });
      if (q.relation === 'swap') this.animateSwap(scene, turn);
    }

    this.renderEquation(q);

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

  /** Two different pictures for the two groups of an addition (if the theme has two). */
  pickTwo() {
    const all = this.sprites();
    const first = pick(all);
    const rest = all.filter((s) => s.src !== first.src);
    return [first, rest.length ? pick(rest) : first];
  }

  /**
   * A group of pictures. `ghost`: one extra picture that fades out ("one went
   * away") and stays as an outline. `fresh`: the last picture just arrived.
   */
  group(count, sprite, color, { ghost = false, fresh = false } = {}) {
    const group = el('div', 'ng-group');
    if (color) group.style.setProperty('--g', color);
    for (let i = 0; i < count; i++) {
      const item = this.item(sprite);
      if (fresh && i === count - 1) item.classList.add('fresh');
      group.append(item);
    }
    if (ghost) {
      const gone = this.item(sprite);
      gone.classList.add('ghost');
      gone.disabled = true;
      gone.setAttribute('aria-hidden', 'true');
      group.append(gone);
    }
    return group;
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
      if (btn.dataset.n || btn.disabled || this.solved || this.busy) return;
      this.mark(btn);
      this.speech.say(this.L.words(this.counted), this.lang, { rate: 0.95 });
    });
    return btn;
  }

  /** Gives a picture the next count badge. */
  mark(item) {
    this.counted++;
    item.dataset.n = this.counted;
    item.append(el('span', 'ng-badge', String(this.counted)));
  }

  /** Slides the groups from the previous order into the new one (FLIP). */
  animateSwap(scene, turn) {
    const swap = () => {
      const [first, op, second] = scene.children;
      scene.replaceChildren(second, op, first);
    };
    if (reducedMotion()) return swap();
    // Let the child see the old order for a moment, then swap.
    setTimeout(() => {
      if (this.turn !== turn) return;
      const groups = [...scene.querySelectorAll('.ng-group')];
      const before = new Map(groups.map((g) => [g, g.getBoundingClientRect()]));
      swap();
      groups.forEach((g, i) => {
        const a = before.get(g);
        const b = g.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        const lift = (i ? 1 : -1) * Math.min(70, b.height * 0.75); // one passes above, the other below
        g.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: `translate(${dx / 2}px, ${dy / 2 + lift}px)`, zIndex: 1 },
            { transform: 'none' },
          ],
          { duration: 1100, easing: 'ease-in-out' },
        );
      });
    }, 700);
  }

  /** "7 + 1 = ?" with each number in its group's color. */
  renderEquation(q) {
    const eq = this.q('.ng-equation');
    eq.replaceChildren();
    eq.hidden = q.kind !== 'add';
    if (q.kind !== 'add') return;
    eq.append(...this.equationParts(q, '?'));
    const terms = eq.querySelectorAll('.term');
    const changed = { swap: [...terms], less: [terms[1]], more: [terms[1]] }[q.relation] ?? [];
    for (const term of changed) term.classList.add('changed');
  }

  equationParts(q, result) {
    const term = (g) => {
      const span = el('span', 'term', String(g.n));
      span.style.color = GROUP_COLORS[g.id];
      return span;
    };
    return [term(q.groups[0]), el('span', 'op', '+'), term(q.groups[1]), el('span', 'op', '='), el('b', 'result', String(result))];
  }

  /** The additions solved so far in this chain, with how each one changed: 1 + 7 = 8 ⇄ 7 + 1 = 8 −1 … */
  renderHistory(q) {
    const box = this.q('.ng-history');
    box.replaceChildren();
    if (q.kind === 'add' && !q.relation) this.solvedAdds = []; // a new chain starts
    box.hidden = !(q.kind === 'add' && q.relation);
    if (box.hidden) return;
    this.solvedAdds.forEach((done, i) => {
      if (i) box.append(el('span', 'ng-rel', RELATION_MARKS[done.relation]));
      const entry = el('span', 'ng-past');
      entry.append(...this.equationParts(done, done.answer));
      box.append(entry);
    });
    box.lastElementChild?.classList.add('prev'); // the one this question changes
    box.append(el('span', 'ng-rel next', RELATION_MARKS[q.relation]));
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
    if (this.busy) return;
    const q = this.questions[this.index];
    const L = this.L;
    let text = L.howMany;
    if (q.kind === 'add') {
      const [a, b] = q.groups.map((g) => L.words(g.n));
      text = `${q.relation ? `${L.relation[q.relation]} ` : ''}${L.addQuestion(a, b)}`;
    }
    this.speech.say(text, this.lang);
    this.speech.prefetch([this.praise(q)], this.lang); // the answer, so it plays right away
  }

  // --- answering --------------------------------------------------------------

  answer(value, btn) {
    if (this.solved || this.busy) return;
    const q = this.questions[this.index];
    if (value !== q.answer) {
      btn.classList.remove('wrong');
      void btn.offsetWidth; // restart the shake animation
      btn.classList.add('wrong');
      this.countTogether(value);
      return;
    }

    this.solved = true;
    btn.classList.add('right');
    this.mangoes++;
    this.renderMangoes({ earned: true });
    if (q.kind === 'add') this.solvedAdds.push(q);
    const done = this.speech.say(this.praise(q), this.lang);
    const minWait = wait(1200);
    const turn = this.turn;
    Promise.all([done, minWait]).then(() => {
      if (!this.dialog.open || this.turn !== turn) return;
      this.index++;
      if (this.index < this.questions.length) this.show();
      else this.finish();
    });
  }

  /** What's said after a right answer: the result, plus the rule when the question changed the last one. */
  praise(q) {
    const L = this.L;
    if (q.kind === 'count') return `${pick(L.praise)} ${L.words(q.n)}!`;
    const [a, b] = q.groups.map((g) => L.words(g.n));
    const sum = L.words(q.answer);
    if (q.relation === 'swap') return L.swapResult(a, b, sum);
    const said = `${pick(L.praise)} ${L.addResult(a, b, sum)}`;
    if (q.relation === 'less') return `${said} ${L.lessResult(L.words(q.answer + 1))}`;
    if (q.relation === 'more') return `${said} ${L.moreResult(L.words(q.answer - 1))}`;
    return said;
  }

  /** After a wrong answer: lock the buttons and count every picture out loud, then ask again. */
  async countTogether(wrongValue) {
    const L = this.L;
    const turn = this.turn;
    const live = () => this.dialog.open && this.turn === turn;
    this.busy = true;
    const options = [...this.q('.ng-options').children];
    for (const b of options) b.disabled = true;

    // start the count from scratch
    for (const item of this.q('.ng-scene').querySelectorAll('.ng-item[data-n]')) {
      delete item.dataset.n;
      item.querySelector('.ng-badge')?.remove();
    }
    this.counted = 0;

    await this.speech.say(`${L.notThis(L.words(wrongValue))} ${L.countTogether}`, this.lang);
    for (const item of this.q('.ng-scene').querySelectorAll('.ng-item:not(.ghost)')) {
      if (!live()) return;
      this.mark(item);
      item.classList.add('counting');
      await Promise.all([this.speech.say(L.words(this.counted), this.lang, { rate: 0.95 }), wait(500)]);
      item.classList.remove('counting');
    }
    if (!live()) return;
    this.busy = false;
    for (const b of options) {
      b.disabled = false;
      b.classList.remove('wrong');
    }
    this.speech.say(L.soHowMany, this.lang);
  }

  finish() {
    this.q('.ng-play').hidden = true;
    const done = this.q('.ng-done');
    done.hidden = false;
    const box = this.q('.ng-done-mangoes');
    box.textContent = '🥭'.repeat(this.mangoes);
    box.setAttribute('aria-label', this.t('mangoCount', { n: this.mangoes, total: ROUND }));
    this.q('[data-action=close-done]').focus();
    this.speech.say(this.L.roundDone(this.L.words(this.mangoes)), this.lang);
  }

  /**
   * One mango per question: earned ones in color, the rest greyed out, so the
   * child sees how many are left. `earned`: the last one was just won (it pops).
   */
  renderMangoes({ earned = false } = {}) {
    const row = this.q('.ng-mangoes');
    row.replaceChildren(...Array.from({ length: ROUND }, (_, i) => el('span', i < this.mangoes ? 'won' : null, '🥭')));
    if (earned) row.children[this.mangoes - 1]?.classList.add('fresh');
    // the emoji alone would be read as "mango, mango, mango…"
    row.setAttribute('aria-label', this.t('mangoCount', { n: this.mangoes, total: ROUND }));
  }
}
