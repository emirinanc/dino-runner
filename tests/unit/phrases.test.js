// P0 guard: every sentence the game can say in Turkish has a natural voice
// clip, and every clip in the manifest exists on disk. If a phrase changes in
// numbers.js without re-running tools/voice/generate.mjs, the game silently
// switches to the robotic browser voice for it; this test catches that.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { allPhrases, GAME_MAX, SCORE_MAX } from '../../src/learn/phrases.js';
import { sentences } from '../../src/learn/speech.js';
import { learnLang } from '../../src/learn/numbers.js';
import { manifest, repoPath } from './support/fakes.js';

const tag = learnLang('tr').speechLang;
const clips = manifest('tr').clips;
const needed = [...new Set(allPhrases('tr').flatMap((t) => sentences(t, tag)))];

describe('Turkish voice clips', () => {
  it('cover every sentence in allPhrases("tr")', () => {
    const missing = needed.filter((s) => !clips[s]);
    expect(missing, `run: node tools/voice/generate.mjs tr\nmissing:\n${missing.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('every clip in the manifest exists on disk', () => {
    const absent = Object.values(clips).filter((f) => !existsSync(repoPath(`audio/tr/${f}`)));
    expect(absent).toEqual([]);
  });

  it('has no unused clips (run generate.mjs --prune)', () => {
    const used = new Set(needed);
    const unused = Object.keys(clips).filter((s) => !used.has(s));
    expect(unused).toEqual([]);
  });

  it.each([
    ['score card reading 0', 'sıfır.'],
    ['score card reading 387', 'üç yüz seksen yedi.'],
    [`score card reading ${SCORE_MAX}`, `${learnLang('tr').words(SCORE_MAX)}.`],
    ['milestone', 'beş yüz!'],
    [`counting up to ${GAME_MAX}`, `${learnLang('tr').words(GAME_MAX)}!`],
    ['end of a round', learnLang('tr').roundDone(learnLang('tr').words(5))],
  ])('includes %s', (_, text) => {
    for (const s of sentences(text, tag)) expect(clips[s], s).toBeTruthy();
  });
});
