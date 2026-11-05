// Shared test doubles. Pure functions first (see docs/test-strategy.md, "fixtures").
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

// Plain paths, not URL objects: jsdom replaces the global URL class.
export const ROOT = join(fileURLToPath(import.meta.url), '../../../..');
export const repoPath = (path) => join(ROOT, path);
export const readRepoFile = (path) => readFileSync(repoPath(path), 'utf8');
export const manifest = (lang = 'tr') => JSON.parse(readRepoFile(`audio/${lang}/manifest.json`));

/** Deterministic Math.random replacement (mulberry32). */
export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedMath = (seed) => vi.spyOn(Math, 'random').mockImplementation(seededRandom(seed));

/**
 * Stubs the browser's audio and speech APIs on globalThis (jsdom) and records
 * what would have been heard: { clips: [url…], spoken: [{ text, voice }…] }.
 * Clips "end" on the next microtask, utterances end right away.
 */
export function stubAudioAndSpeech({ voices = [], manifestBody = manifest(), manifestDelay = 0 } = {}) {
  const heard = { clips: [], spoken: [], fetched: [] };

  class FakeAudio {
    constructor() {
      this.src = '';
      this.onended = null;
      this.onerror = null;
    }
    play() {
      if (!this.src.startsWith('data:')) heard.clips.push(this.src);
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    }
    pause() {}
  }

  class FakeUtterance {
    constructor(text) {
      this.text = text;
    }
  }

  const synth = {
    getVoices: () => voices,
    addEventListener: () => {},
    cancel: vi.fn(),
    speak: vi.fn((u) => {
      heard.spoken.push({ text: u.text, voice: u.voice?.name ?? null, lang: u.lang, rate: u.rate });
      u.onstart?.();
      u.onend?.();
    }),
  };

  let release;
  const gate = manifestDelay ? new Promise((r) => (release = r)) : Promise.resolve();
  const fetchStub = vi.fn(async (url) => {
    heard.fetched.push(String(url));
    if (String(url).endsWith('manifest.json')) {
      await gate;
      return manifestBody ? { ok: true, json: async () => manifestBody } : { ok: false, json: async () => null };
    }
    return { ok: true };
  });

  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('fetch', fetchStub);
  return { heard, synth, fetch: fetchStub, releaseManifest: () => release?.() };
}

/** A browser voice as speechSynthesis.getVoices() returns it. */
export const voice = (name, lang = 'tr-TR', localService = true) => ({ name, lang, localService, voiceURI: `uri:${name}` });

/**
 * A speech stand-in for components (score card, number game) that records
 * every utterance and resolves at once.
 */
export function recordingSpeech() {
  const said = [];
  return {
    said,
    supported: true,
    voices: [],
    say: vi.fn((steps, lang) => {
      said.push(...(Array.isArray(steps) ? steps : [steps]).map((s) => (typeof s === 'string' ? s : s.text)));
      return Promise.resolve();
    }),
    prefetch: vi.fn(),
    cancel: vi.fn(),
    hasVoice: () => true,
  };
}
