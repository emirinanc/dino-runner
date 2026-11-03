// Pre-generates natural voice clips for every sentence the game can say
// (src/learn/phrases.js), using Google Cloud Text-to-Speech.
//
//   node tools/voice/generate.mjs [lang] [--dry] [--prune]
//
//   --dry    only count the sentences and characters, don't call the API
//   --prune  delete clips that are no longer used
//
// Writes audio/<lang>/<hash>.mp3 and audio/<lang>/manifest.json. Clips that
// already exist are kept, so the script can be stopped and run again, and
// after adding a phrase only the new sentences are generated.
//
// The API key is read from ~/.config/dino-runner/google-tts-key and must never
// be committed. The game itself doesn't need it: it only plays the files.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPhrases } from '../../src/learn/phrases.js';
import { sentences } from '../../src/learn/speech.js';
import { learnLang } from '../../src/learn/numbers.js';

// Voice per language: https://cloud.google.com/text-to-speech/docs/voices
const VOICES = {
  tr: { name: 'tr-TR-Chirp3-HD-Puck', label: 'Puck', rate: 0.9 },
};
const PARALLEL = 6;

const args = process.argv.slice(2);
const lang = args.find((a) => !a.startsWith('--')) ?? 'tr';
const voice = VOICES[lang];
if (!voice) throw new Error(`No voice configured for "${lang}" in VOICES`);

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'audio', lang);
const tag = learnLang(lang).speechLang;
const fileFor = (text) => `${createHash('sha1').update(`${voice.name}|${voice.rate}|${text}`).digest('hex').slice(0, 12)}.mp3`;

const all = [...new Set(allPhrases(lang).flatMap((t) => sentences(t, tag)))].sort((a, b) => a.localeCompare(b, tag));
const clips = Object.fromEntries(all.map((s) => [s, fileFor(s)]));
mkdirSync(outDir, { recursive: true });
const todo = all.filter((s) => !existsSync(join(outDir, clips[s])));
const chars = (list) => list.reduce((n, s) => n + s.length, 0);
console.log(`${all.length} sentences (${chars(all)} characters); ${todo.length} to generate (${chars(todo)} characters)`);
if (args.includes('--dry')) process.exit(0);

const key = readFileSync(join(homedir(), '.config/dino-runner/google-tts-key'), 'utf8').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthesize(text) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: tag, name: voice.name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: voice.rate },
      }),
    });
    if (res.ok) return Buffer.from((await res.json()).audioContent, 'base64');
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${res.status} for "${text}": ${(await res.text()).slice(0, 300)}`);
  }
}

let done = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  for (let text; (text = queue.shift()); ) {
    writeFileSync(join(outDir, clips[text]), await synthesize(text));
    if (++done % 100 === 0 || done === todo.length) console.log(`  ${done} / ${todo.length}`);
  }
}));

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify({ voice: voice.name, label: voice.label, rate: voice.rate, clips }, null, 1)}\n`);
console.log(`wrote audio/${lang}/manifest.json`);

if (args.includes('--prune')) {
  const used = new Set(Object.values(clips));
  const stale = readdirSync(outDir).filter((f) => f.endsWith('.mp3') && !used.has(f));
  for (const f of stale) unlinkSync(join(outDir, f));
  console.log(`removed ${stale.length} unused clips`);
}
