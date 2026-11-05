// P2: every UI language has every string, and the page only uses keys that exist.
import { describe, it, expect } from 'vitest';
import { STRINGS, LANGUAGES } from '../../src/i18n.js';
import { readRepoFile } from './support/fakes.js';

const keys = Object.keys(STRINGS.en).sort();

describe('UI strings', () => {
  it.each(Object.keys(STRINGS).filter((l) => l !== 'en'))('%s has the same keys as English', (lang) => {
    const own = Object.keys(STRINGS[lang]);
    expect(keys.filter((k) => !own.includes(k)), 'missing').toEqual([]);
    expect(own.filter((k) => !keys.includes(k)), 'extra').toEqual([]);
  });

  it('keeps {placeholders} in every translation', () => {
    for (const k of keys) {
      const vars = (STRINGS.en[k].match(/\{\w+\}/g) ?? []).sort();
      for (const lang of Object.keys(STRINGS)) {
        expect((STRINGS[lang][k]?.match(/\{\w+\}/g) ?? []).sort(), `${lang}.${k}`).toEqual(vars);
      }
    }
  });

  it('every data-i18n key in index.html exists', () => {
    const used = [...readRepoFile('index.html').matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(10);
    expect(used.filter((k) => !(k in STRINGS.en))).toEqual([]);
  });

  it('every language in the picker has strings', () => {
    for (const lang of Object.keys(LANGUAGES)) expect(STRINGS[lang], lang).toBeTruthy();
  });
});
