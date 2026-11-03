// Number words, place values and spoken phrases for the learning features.
// Add a language by adding an entry to LEARN_LANGS.

export const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'tenThousands', 'hundredThousands'];

// One color per place value, used everywhere a number is broken down
// (score digits on the canvas, the score card and the blocks).
export const PLACE_COLORS = {
  ones: '#1c7ed6',
  tens: '#e03131',
  hundreds: '#2f9e44',
  thousands: '#9c36b5',
  tenThousands: '#f08c00',
  hundredThousands: '#0c8599',
};

/** 347 → [{ place: 'hundreds', digit: 3, value: 300 }, … { place: 'ones', digit: 7, value: 7 }] */
export function placeValues(n) {
  const digits = String(Math.max(0, Math.floor(n))).split('').reverse();
  return digits.map((d, i) => ({ place: PLACES[i], digit: Number(d), value: Number(d) * 10 ** i })).reverse();
}

// --- Turkish ------------------------------------------------------------------

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

function trBelow1000(n) {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts = [];
  if (h) parts.push(h === 1 ? 'yüz' : `${TR_ONES[h]} yüz`); // "yüz", not "bir yüz"
  if (t) parts.push(TR_TENS[t]);
  if (o) parts.push(TR_ONES[o]);
  return parts.join(' ');
}

function trWords(n) {
  if (n === 0) return 'sıfır';
  const millions = Math.floor(n / 1e6);
  const thousands = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (millions) parts.push(`${trBelow1000(millions)} milyon`);
  if (thousands) parts.push(thousands === 1 ? 'bin' : `${trBelow1000(thousands)} bin`); // "bin", not "bir bin"
  if (rest) parts.push(trBelow1000(rest));
  return parts.join(' ');
}

// --- English ------------------------------------------------------------------

const EN_SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function enBelow1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const tail = r < 20 ? EN_SMALL[r] : EN_TENS[Math.floor(r / 10)] + (r % 10 ? `-${EN_SMALL[r % 10]}` : '');
  if (!h) return tail;
  return `${EN_SMALL[h]} hundred${r ? ` ${tail}` : ''}`;
}

function enWords(n) {
  if (n === 0) return 'zero';
  const millions = Math.floor(n / 1e6);
  const thousands = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (millions) parts.push(`${enBelow1000(millions)} million`);
  if (thousands) parts.push(`${enBelow1000(thousands)} thousand`);
  if (rest) parts.push(enBelow1000(rest));
  return parts.join(' ');
}

// --- languages ----------------------------------------------------------------

export const LEARN_LANGS = {
  tr: {
    name: 'Türkçe',
    speechLang: 'tr-TR',
    words: trWords,
    // what a column is called: "3 yüzlük", "4 onluk", "7 birlik"
    places: {
      ones: 'birlik', tens: 'onluk', hundreds: 'yüzlük',
      thousands: 'binlik', tenThousands: 'on binlik', hundredThousands: 'yüz binlik',
    },
    plus: 'artı',
    equals: 'eşittir',
    // Spoken sentences. Commas and full stops matter: voices pause and change
    // intonation on them, which makes them sound much less robotic.
    yourScore: (w) => `${w} puan!`,
    placeStep: (head, value) => `${head}, yani ${value}.`,
    howMany: 'Kaç tane?',
    howManyAll: 'Hepsi kaç tane?',
    addQuestion: (a, b) => `${a} artı ${b}, kaç eder?`,
    addResult: (a, b, sum) => `${a} artı ${b}, ${sum} eder!`,
    praise: ['Aferin!', 'Harika!', 'Çok güzel!', 'Süpersin!', 'Bravo!'],
    tryAgain: 'Tekrar dene.',
    thisIs: (w) => `Bu ${w}.`,
    roundDone: (w) => `Harika! ${w} yıldız kazandın!`,
  },
  en: {
    name: 'English',
    speechLang: 'en-US',
    words: enWords,
    places: {
      ones: 'ones', tens: 'tens', hundreds: 'hundreds',
      thousands: 'thousands', tenThousands: 'ten thousands', hundredThousands: 'hundred thousands',
    },
    plus: 'plus',
    equals: 'equals',
    yourScore: (w) => `${w} points!`,
    placeStep: (head, value) => `${head}, that's ${value}.`,
    howMany: 'How many?',
    howManyAll: 'How many altogether?',
    addQuestion: (a, b) => `What is ${a} plus ${b}?`,
    addResult: (a, b, sum) => `${a} plus ${b} is ${sum}!`,
    praise: ['Well done!', 'Great job!', 'Awesome!', 'You got it!'],
    tryAgain: 'Try again.',
    thisIs: (w) => `That is ${w}.`,
    roundDone: (w) => `Great! You earned ${w} stars!`,
  },
};

export function learnLang(id) {
  return LEARN_LANGS[id] ?? LEARN_LANGS.tr;
}

/** "3 yüzlük" style label for one column of a breakdown. */
export function placeLabel(lang, { digit, place }) {
  return `${digit} ${learnLang(lang).places[place]}`;
}

/** What's said for one column: "üç yüzlük, yani üç yüz." / "sıfır onluk." */
export function placeSentence(langId, { digit, place, value }) {
  const L = learnLang(langId);
  const head = `${L.words(digit)} ${L.places[place]}`;
  return digit ? L.placeStep(head, L.words(value)) : `${head}.`;
}

/**
 * The sentences read out for a breakdown, one per step, e.g. for 347 in Turkish:
 *   "Üç yüz kırk yedi." · "Üç yüzlük, yani üç yüz." · "Dört onluk, yani kırk." ·
 *   "Yedi birlik, yani yedi." · "Üç yüz, artı kırk, artı yedi, eşittir üç yüz kırk yedi!"
 */
export function breakdownScript(n, langId) {
  const L = learnLang(langId);
  const parts = placeValues(n);
  const steps = [{ text: `${L.words(n)}.`, place: null }];
  for (const p of parts) steps.push({ text: placeSentence(langId, p), place: p.place });
  const nonZero = parts.filter((p) => p.digit);
  if (nonZero.length > 1) {
    const sum = nonZero.map((p) => L.words(p.value)).join(`, ${L.plus} `);
    steps.push({ text: `${sum}, ${L.equals} ${L.words(n)}!`, place: 'all' });
  }
  return steps;
}
