// @vitest-environment jsdom
// P0/P1: the number game is where the child learns. Questions must be valid
// (sums within the limit, chains that change one thing at a time), a wrong
// answer must lead to counting together, and every right answer earns a reward.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { makeNumberGame } from './support/numbergame-fixture.js';
import { learnLang } from '../../src/learn/numbers.js';
import { sentences } from '../../src/learn/speech.js';
import { manifest } from './support/fakes.js';

let ui;
afterEach(() => {
  ui?.dialog.close();
  vi.useRealTimers();
});

const tr = learnLang('tr');
const g = (id, n) => ({ id, n });
const FIXED_CHAIN = [
  { kind: 'add', groups: [g(0, 1), g(1, 7)], relation: null },
  { kind: 'add', groups: [g(1, 7), g(0, 1)], relation: 'swap' },
  { kind: 'add', groups: [g(1, 7), g(0, 2)], relation: 'more' },
  { kind: 'add', groups: [g(0, 2), g(1, 7)], relation: 'swap' },
  { kind: 'add', groups: [g(0, 2), g(1, 6)], relation: 'less' },
];

/** Checks the rules every generated round must follow. Returns a list of problems. */
function problems(questions, max) {
  const out = [];
  if (questions.length !== 5) out.push(`length ${questions.length}`);
  let prev = null;
  for (const q of questions) {
    if (q.kind === 'count') {
      if (!(q.n >= 1 && q.n <= max) || q.answer !== q.n) out.push(`count ${JSON.stringify(q)}`);
    } else {
      const [l, r] = q.groups;
      if (l.n < 1 || r.n < 1 || q.answer !== l.n + r.n || q.answer > max) out.push(`add ${JSON.stringify(q)}`);
      if (q.relation && !prev) out.push(`relation without a previous addition: ${q.relation}`);
      if (q.relation === 'swap' && !(prev.groups[0] === r && prev.groups[1] === l)) out.push('bad swap');
      if (q.relation === 'less' && (q.answer !== prev.answer - 1 || l !== prev.groups[0])) out.push('bad less');
      if (q.relation === 'more' && (q.answer !== prev.answer + 1 || l !== prev.groups[0])) out.push('bad more');
      if (!q.relation && prev) out.push('chain restarted mid-round');
    }
    prev = q.kind === 'add' ? q : null;
  }
  return out;
}

describe('question generation', () => {
  it.each([5, 10, 20])('produces valid rounds in every mode (max %i, 300 seeded rounds each)', (max) => {
    ui = makeNumberGame({ maxNumber: max, seed: max });
    const bad = [];
    for (const mode of ['count', 'add', 'mix']) {
      ui.game.mode = mode;
      for (let r = 0; r < 300; r++) bad.push(...problems(ui.game.makeQuestions(r % 3 ? undefined : 100 + r), max));
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('counting mode starts with the digits of the score, skipping 0 and digits above the limit', () => {
    ui = makeNumberGame({ maxNumber: 5, mode: 'count' });
    const qs = ui.game.makeQuestions(3092);
    expect(qs.slice(0, 2).map((q) => q.n)).toEqual([3, 2]); // 0 skipped, 9 > 5 skipped
  });

  it('mixed mode: two counting questions, then an addition chain', () => {
    ui = makeNumberGame({ mode: 'mix' });
    const qs = ui.game.makeQuestions(347);
    expect(qs.map((q) => q.kind)).toEqual(['count', 'count', 'add', 'add', 'add']);
    expect(qs.slice(0, 2).map((q) => q.n)).toEqual([3, 4]);
    expect(qs[2].groups.map((x) => x.n)).toEqual([3, 4]); // the chain starts from the score's digits too
    expect(qs[2].relation).toBeNull();
    expect(qs[3].relation).toBe('swap');
  });

  it('addition chains alternate swaps with one more / one less', () => {
    ui = makeNumberGame({ mode: 'add', seed: 7 });
    const qs = ui.game.makeQuestions(17);
    expect(qs[0].groups.map((x) => x.n)).toEqual([1, 7]);
    expect(qs.map((q) => q.relation)).toEqual([null, 'swap', expect.stringMatching(/less|more/), 'swap', expect.stringMatching(/less|more/)]);
  });

  it('offers the answer and two neighbours, in order, never below 1', () => {
    ui = makeNumberGame();
    for (let answer = 1; answer <= 20; answer++) {
      const opts = ui.game.options(answer);
      expect(opts).toHaveLength(3);
      expect(opts).toContain(answer);
      expect([...opts].sort((a, b) => a - b)).toEqual(opts);
      expect(Math.min(...opts)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...opts) - Math.min(...opts)).toBeLessThanOrEqual(4);
    }
  });
});

describe('playing a round', () => {
  it('shows the pictures to count and asks the question aloud', () => {
    ui = makeNumberGame();
    ui.openWith([{ kind: 'count', n: 4 }, ...FIXED_CHAIN.slice(0, 4)]);
    expect(ui.$$('.ng-scene .ng-item')).toHaveLength(4);
    expect(ui.$('.ng-prompt').textContent).toBe(tr.howMany);
    expect(ui.speech.said.at(-1)).toBe(tr.howMany);
    expect(ui.options().map((b) => b.textContent)).toContain('4');
  });

  it('tapping a picture counts it aloud and gives it a number badge', () => {
    ui = makeNumberGame();
    ui.openWith([{ kind: 'count', n: 3 }, ...FIXED_CHAIN.slice(0, 4)]);
    const items = ui.$$('.ng-item');
    items[2].click();
    items[0].click();
    items[2].click(); // already counted: ignored
    expect(ui.$$('.ng-badge').map((b) => b.textContent)).toEqual(['2', '1']);
    expect(ui.speech.said.slice(-2)).toEqual(['bir', 'iki']);
  });

  it('a wrong answer locks the buttons and counts every picture together, then asks again', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    ui.speech.said.length = 0;

    const wrong = ui.wrongOption();
    wrong.click();
    expect(ui.options().every((b) => b.disabled)).toBe(true);
    ui.option(8).click(); // ignored while counting together
    expect(ui.game.solved).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(ui.speech.said).toEqual([
      `${tr.notThis(tr.words(Number(wrong.textContent)))} ${tr.countTogether}`,
      'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz',
      tr.soHowMany,
    ]);
    expect(ui.$$('.ng-badge')).toHaveLength(8);
    expect(ui.options().every((b) => !b.disabled)).toBe(true);
  });

  it('closing the dialog stops a count-together', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    ui.wrongOption().click();
    await vi.advanceTimersByTimeAsync(600);
    ui.dialog.close();
    const said = ui.speech.said.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(ui.speech.said.length).toBe(said);
    expect(ui.speech.cancel).toHaveBeenCalled();
  });

  it('every right answer earns a reward; after five the final screen appears', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    expect(ui.reward()).toBe('0/5');

    for (let i = 1; i <= 5; i++) {
      expect(ui.doneShown()).toBe(false);
      ui.option(ui.current().answer).click();
      expect(ui.reward()).toBe(`${i}/5`);
      await vi.advanceTimersByTimeAsync(1300);
    }

    expect(ui.doneShown()).toBe(true);
    expect(ui.$('.ng-play').hidden).toBe(true);
    expect(ui.$('[data-testid=ng-done-reward]').getAttribute('aria-label')).toBe('5/5');
    expect(ui.speech.said.at(-1)).toBe(tr.roundDone(tr.words(5)));
    expect(document.activeElement?.dataset.action).toBe('close-done');
  });

  it('a wrong answer first still earns the reward once answered right', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    ui.wrongOption().click();
    await vi.advanceTimersByTimeAsync(10_000);
    ui.option(8).click();
    expect(ui.reward()).toBe('1/5');
  });

  it('says the rule after a changed question', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    const answerRight = async () => {
      ui.option(ui.current().answer).click();
      const said = ui.speech.said.at(-1);
      await vi.advanceTimersByTimeAsync(1300);
      return said;
    };
    await answerRight(); // 1 + 7
    expect(await answerRight()).toBe(tr.swapResult('yedi', 'bir', 'sekiz')); // 7 + 1
    const more = await answerRight(); // 7 + 2: praise, the result, then the rule
    expect(more.endsWith(`${tr.addResult('yedi', 'iki', 'dokuz')} ${tr.moreResult('sekiz')}`), more).toBe(true);
  });

  it('keeps solved additions in a history row', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    ui.option(8).click();
    await vi.advanceTimersByTimeAsync(1300);
    expect(ui.$('.ng-history').hidden).toBe(false);
    expect(ui.$('.ng-history').textContent.replace(/\s/g, '')).toBe('1+7=8⇄');
    // after the swap (reduced motion: immediately) the groups read 7 + 1
    expect(ui.$$('.ng-scene .ng-group').map((x) => x.querySelectorAll('.ng-item').length)).toEqual([7, 1]);
  });

  it('"one went away" shows the missing picture as a faded outline', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith([
      { kind: 'add', groups: [g(0, 2), g(1, 7)], relation: null },
      { kind: 'add', groups: [g(0, 2), g(1, 6)], relation: 'less' },
      ...FIXED_CHAIN.slice(0, 3),
    ]);
    ui.option(9).click();
    await vi.advanceTimersByTimeAsync(1300);
    expect(ui.$$('.ng-item.ghost')).toHaveLength(1);
    expect(ui.$$('.ng-item:not(.ghost)')).toHaveLength(8);
  });

  it('a new round resets the reward counter', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    ui.option(8).click();
    await vi.advanceTimersByTimeAsync(1300);
    ui.$('[data-action=again]').click();
    expect(ui.reward()).toBe('0/5');
  });
});

describe('Space key', () => {
  it('on the final screen closes the dialog and starts the dino game', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    for (let i = 0; i < 5; i++) {
      ui.option(ui.current().answer).click();
      await vi.advanceTimersByTimeAsync(1300);
    }
    const e = ui.pressSpace();
    expect(e.defaultPrevented).toBe(true);
    expect(ui.onPlay).toHaveBeenCalledTimes(1);
    expect(ui.dialog.open).toBe(false);
  });

  it('during the questions does nothing', () => {
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    const e = ui.pressSpace();
    expect(e.defaultPrevented).toBe(false);
    expect(ui.onPlay).not.toHaveBeenCalled();
    expect(ui.dialog.open).toBe(true);
  });

  it('"Back to the game" button does the same as Space', async () => {
    vi.useFakeTimers();
    ui = makeNumberGame();
    ui.openWith(FIXED_CHAIN);
    for (let i = 0; i < 5; i++) {
      ui.option(ui.current().answer).click();
      await vi.advanceTimersByTimeAsync(1300);
    }
    ui.$('[data-action=close-done]').click();
    expect(ui.onPlay).toHaveBeenCalledTimes(1);
    expect(ui.dialog.open).toBe(false);
  });
});

describe('everything the number game says in Turkish has a voice clip', () => {
  // Plays many seeded rounds the way a child would (some wrong answers, some
  // taps) and checks each utterance against the clip manifest. This catches a
  // phrase built in numbergame.js that phrases.js doesn't list.
  it.each([5, 10, 20])('max %i', async (max) => {
    vi.useFakeTimers();
    const clips = manifest('tr').clips;
    const missing = new Set();
    for (const mode of ['count', 'add', 'mix']) {
      ui = makeNumberGame({ maxNumber: max, mode, seed: max * 31 });
      ui.game.open(max === 10 ? 347 : undefined);
      for (let round = 0; round < 4; round++) {
        for (let i = 0; i < 5; i++) {
          const q = ui.current();
          ui.$('.ng-item')?.click();
          const wrong = ui.options().find((b) => Number(b.textContent) !== q.answer);
          if ((round + i) % 2 && wrong) {
            wrong.click();
            await vi.advanceTimersByTimeAsync(20_000);
          }
          ui.option(q.answer).click();
          await vi.advanceTimersByTimeAsync(1300);
        }
        ui.$('[data-action=again]').click();
      }
      for (const text of ui.speech.said) for (const s of sentences(text, 'tr-TR')) if (!clips[s]) missing.add(s);
      for (const [texts] of ui.speech.prefetch.mock.calls) {
        for (const text of texts) for (const s of sentences(text, 'tr-TR')) if (!clips[s]) missing.add(s);
      }
      ui.dialog.close();
    }
    expect([...missing]).toEqual([]);
  });
});
