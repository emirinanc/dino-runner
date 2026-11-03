// Everything the game can say in a language, built with the same phrase
// functions the game uses. tools/voice/generate.mjs turns this list into
// natural voice clips (audio/<lang>/). A sentence missing from it isn't an
// error: the browser's own voice says that utterance instead.

import { learnLang, breakdownScript, placeSentence, PLACES } from './numbers.js';

export const GAME_MAX = 20; // highest "Number game goes up to" option
export const SCORE_MAX = 999; // scores up to this are read with clips
const ROUND = 5; // stars in a number game round

/** Utterances as the game says them; split them with `sentences()` from speech.js. */
export function allPhrases(langId) {
  const L = learnLang(langId);
  const w = L.words;
  const out = [];
  const add = (...texts) => out.push(...texts);

  // number game: counting, questions, answers, count-together
  add(L.howMany, L.howManyAll, L.countTogether, L.soHowMany, ...Object.values(L.relation), ...L.praise);
  for (let n = 1; n <= GAME_MAX; n++) add(w(n), `${w(n)}!`);
  for (let n = 1; n <= GAME_MAX + 2; n++) add(L.notThis(w(n)));
  for (let a = 1; a < GAME_MAX; a++) {
    for (let b = 1; a + b <= GAME_MAX; b++) {
      const sum = a + b;
      add(L.addQuestion(w(a), w(b)), L.addResult(w(a), w(b), w(sum)), L.swapResult(w(a), w(b), w(sum)));
    }
  }
  for (let n = 1; n <= GAME_MAX + 1; n++) add(L.lessResult(w(n)), L.moreResult(w(n)));
  for (let s = 0; s <= ROUND; s++) add(L.roundDone(w(s)));

  // score card: reading the score, the breakdown, tapping a column
  for (let n = 0; n <= SCORE_MAX; n++) {
    add(L.yourScore(w(n)));
    add(...breakdownScript(n, langId).map((s) => s.text));
  }
  for (const place of PLACES) {
    for (let digit = 0; digit <= 9; digit++) add(placeSentence(langId, { digit, place, value: digit * 10 ** PLACES.indexOf(place) }));
  }

  // every 100 points while playing
  for (let n = 100; n <= SCORE_MAX; n += 100) add(`${w(n)}!`);
  return out;
}
