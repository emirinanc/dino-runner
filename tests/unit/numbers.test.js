// P0: the number words are what the child hears and reads. A wrong word here
// teaches the wrong thing, so this is the most heavily tested module.
import { describe, it, expect } from 'vitest';
import {
  learnLang, placeValues, placeLabel, placeSentence, numberSentence, breakdownScript, LEARN_LANGS, PLACES,
} from '../../src/learn/numbers.js';

const tr = learnLang('tr');
const en = learnLang('en');

describe('Turkish number words', () => {
  it.each([
    [0, 'sıfır'], [1, 'bir'], [7, 'yedi'], [9, 'dokuz'],
    [10, 'on'], [11, 'on bir'], [19, 'on dokuz'], [20, 'yirmi'], [40, 'kırk'], [99, 'doksan dokuz'],
    [100, 'yüz'], [101, 'yüz bir'], [110, 'yüz on'], [200, 'iki yüz'], [387, 'üç yüz seksen yedi'],
    [999, 'dokuz yüz doksan dokuz'],
    [1000, 'bin'], [1001, 'bin bir'], [1100, 'bin yüz'], [2000, 'iki bin'], [2024, 'iki bin yirmi dört'],
    [10000, 'on bin'], [100000, 'yüz bin'], [123456, 'yüz yirmi üç bin dört yüz elli altı'],
    [1000000, 'bir milyon'], [2000001, 'iki milyon bir'],
  ])('%i → %s', (n, words) => {
    expect(tr.words(n)).toBe(words);
  });

  it('never says "bir yüz", and "bir bin" only inside a bigger number ("on bir bin")', () => {
    for (let n = 1; n < 30000; n += 37) {
      expect(tr.words(n)).not.toMatch(/(^|\s)bir yüz/);
      expect(tr.words(n)).not.toMatch(/^bir bin/);
    }
    expect(tr.words(11000)).toBe('on bir bin');
  });

  it('has no double or trailing spaces', () => {
    for (let n = 0; n <= 2000; n++) expect(tr.words(n)).toMatch(/^\S+( \S+)*$/);
  });
});

describe('English number words', () => {
  it.each([
    [0, 'zero'], [13, 'thirteen'], [21, 'twenty-one'], [100, 'one hundred'], [105, 'one hundred five'],
    [1000, 'one thousand'], [1234, 'one thousand two hundred thirty-four'],
  ])('%i → %s', (n, words) => {
    expect(en.words(n)).toBe(words);
  });
});

describe('Turkish ablative ("from") suffix: lessResult / moreResult', () => {
  // Vowel harmony picks -dan/-den, a voiceless final consonant hardens d → t.
  it.each([
    ['bir', 'birden'], ['iki', 'ikiden'], ['üç', 'üçten'], ['dört', 'dörtten'], ['beş', 'beşten'],
    ['altı', 'altıdan'], ['yedi', 'yediden'], ['sekiz', 'sekizden'], ['dokuz', 'dokuzdan'], ['on', 'ondan'],
    ['on bir', 'on birden'], ['yirmi', 'yirmiden'], ['on üç', 'on üçten'], ['on altı', 'on altıdan'],
  ])('%s → %s', (word, from) => {
    expect(tr.lessResult(word)).toBe(`${from} bir eksik!`);
    expect(tr.moreResult(word)).toBe(`${from} bir fazla!`);
  });
});

describe('placeValues', () => {
  it('splits a number into its columns, biggest first', () => {
    expect(placeValues(347)).toEqual([
      { place: 'hundreds', digit: 3, value: 300 },
      { place: 'tens', digit: 4, value: 40 },
      { place: 'ones', digit: 7, value: 7 },
    ]);
  });

  it('keeps zero columns (they are shown and read as "sıfır onluk")', () => {
    expect(placeValues(105).map((p) => p.digit)).toEqual([1, 0, 5]);
  });

  it('handles 0, negatives and fractions without throwing', () => {
    expect(placeValues(0)).toEqual([{ place: 'ones', digit: 0, value: 0 }]);
    expect(placeValues(-5)).toEqual([{ place: 'ones', digit: 0, value: 0 }]);
    expect(placeValues(12.9).map((p) => p.value)).toEqual([10, 2]);
  });

  it('the values always add up to the number', () => {
    for (const n of [1, 10, 100, 1000, 54321, 999999]) {
      expect(placeValues(n).reduce((s, p) => s + p.value, 0)).toBe(n);
      expect(placeValues(n).at(-1).place).toBe('ones');
    }
  });
});

describe('place labels and sentences', () => {
  it('labels a column like "3 yüzlük"', () => {
    expect(placeLabel('tr', { digit: 3, place: 'hundreds' })).toBe('3 yüzlük');
    expect(placeLabel('en', { digit: 4, place: 'tens' })).toBe('4 tens');
  });

  it('reads a column as a sentence', () => {
    expect(placeSentence('tr', { digit: 3, place: 'hundreds', value: 300 })).toBe('üç yüzlük, yani üç yüz.');
    expect(placeSentence('tr', { digit: 0, place: 'tens', value: 0 })).toBe('sıfır onluk.');
    expect(placeSentence('en', { digit: 7, place: 'ones', value: 7 })).toBe("seven ones, that's seven.");
  });

  it('every language names every place', () => {
    for (const L of Object.values(LEARN_LANGS)) for (const p of PLACES) expect(L.places[p]).toBeTruthy();
  });

  it('numberSentence ends with a full stop', () => {
    expect(numberSentence('tr', 387)).toBe('üç yüz seksen yedi.');
  });

  it('falls back to Turkish for an unknown language', () => {
    expect(learnLang('xx')).toBe(LEARN_LANGS.tr);
  });
});

describe('breakdownScript', () => {
  it('reads the number, each column, then the sum (347)', () => {
    const steps = breakdownScript(347, 'tr');
    expect(steps.map((s) => s.text)).toEqual([
      'üç yüz kırk yedi.',
      'üç yüzlük, yani üç yüz.',
      'dört onluk, yani kırk.',
      'yedi birlik, yani yedi.',
      'üç yüz, artı kırk, artı yedi, eşittir, üç yüz kırk yedi.',
    ]);
    expect(steps.map((s) => s.place)).toEqual([null, 'hundreds', 'tens', 'ones', 'all']);
  });

  it('gives the sum as short pieces that join into the sum text', () => {
    const sum = breakdownScript(347, 'tr').at(-1);
    expect(sum.pieces).toEqual(['üç yüz,', 'artı kırk,', 'artı yedi,', 'eşittir,', 'üç yüz kırk yedi.']);
    expect(sum.pieces.join(' ')).toBe(sum.text);
  });

  it('leaves zero columns out of the sum (105 = 100 + 5)', () => {
    const sum = breakdownScript(105, 'tr').at(-1);
    expect(sum.pieces).toEqual(['yüz,', 'artı beş,', 'eşittir,', 'yüz beş.']);
    expect(breakdownScript(105, 'tr')[2].text).toBe('sıfır onluk.');
  });

  it('has no sum step when only one column is non-zero', () => {
    for (const n of [0, 7, 10, 100, 300]) {
      const steps = breakdownScript(n, 'tr');
      expect(steps.some((s) => s.place === 'all')).toBe(false);
      expect(steps).toHaveLength(1 + String(n).length);
    }
  });
});

describe('addition and number-game phrases', () => {
  it('builds the Turkish question and answer', () => {
    expect(tr.addQuestion('bir', 'yedi')).toBe('bir artı yedi, kaç eder?');
    expect(tr.addResult('bir', 'yedi', 'sekiz')).toBe('bir artı yedi, sekiz eder!');
    expect(tr.swapResult('bir', 'yedi', 'sekiz')).toBe('Aynı! bir artı yedi, sekiz eder! yedi artı bir, yine sekiz.');
    expect(tr.notThis('dört')).toBe('dört değil.');
  });

  it('every language has every phrase the game uses', () => {
    const keys = ['howMany', 'howManyAll', 'countTogether', 'soHowMany', 'plus', 'equals'];
    const fns = ['placeStep', 'addQuestion', 'addResult', 'notThis', 'swapResult', 'lessResult', 'moreResult', 'roundDone'];
    for (const L of Object.values(LEARN_LANGS)) {
      for (const k of keys) expect(typeof L[k]).toBe('string');
      for (const k of fns) expect(typeof L[k]).toBe('function');
      expect(Object.keys(L.relation).sort()).toEqual(['less', 'more', 'swap']);
      expect(L.praise.length).toBeGreaterThan(0);
    }
  });

  it('the end-of-round phrase says how many rewards were earned', () => {
    // The reward's name may change (stars, mangoes…); the count must be in it.
    expect(tr.roundDone(tr.words(5)).split(/[\s!.,]+/)).toContain('beş');
    expect(en.roundDone(en.words(3)).split(/[\s!.,]+/)).toContain('three');
  });
});
